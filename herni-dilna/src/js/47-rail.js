// ---------- Vláčkové hry 18xx: akciové společnosti, burza, vlaky, tržby ----------
// Hráči kupují akcie společností, prezident (největší akcionář) za společnost kupuje vlaky a rozhoduje,
// zda tržby vyplatí jako dividendu (kurz roste), nebo je zadrží v pokladně (kurz klesá).
function normalizeRail(p) {
  p.rail = Object.assign({ on: false, cashRes: "", shares: 10, float: 6, market: "40,45,50,55,60,65,70,80,90,100,110,120,135,150,165,180,200,225,250,275,300", pars: "60,70,80,90,100",
    trains: "2:80:6,3:180:5,4:300:4,5:450:3,6:630:2,D:1100:6", rust: "4>2,6>3,D>4", limit: "2:4,4:3,5:2", soldUp: true, poolDown: true }, p.rail || {});
  p.rail.companies = p.rail.companies || []; return p;
}
const nums = s => String(s || "").split(/[,;\s]+/).map(Number).filter(n => !isNaN(n) && n > 0);
const railMarket = p => nums(p.rail.market);
const railTrains = p => String(p.rail.trains || "").split(",").map(s => s.trim().split(":")).filter(x => x[0]).map(([type, cost, count]) => ({ type, cost: +cost || 0, count: +count || 1 }));
const railCash = p => p.resources.find(r => r.id === p.rail.cashRes);
function railInit(p, t) {
  t.rail = { co: {}, bank: {}, rusted: [], phase: railTrains(p)[0] ? railTrains(p)[0].type : "" };
  railTrains(p).forEach(x => { t.rail.bank[x.type] = x.count; });
  p.rail.companies.forEach(c => { t.rail.co[c.id] = { own: {}, ipo: +p.rail.shares || 10, pool: 0, pi: null, par: null, cash: 0, trains: [], pres: null, last: 0 }; });
  logEv(t, "18xx: banka a společnosti připraveny");
}
const coState = (t, id) => (t.rail || { co: {} }).co[id];
const coName = (p, id) => (p.rail.companies.find(c => c.id === id) || {}).name || "";
function coPrice(p, t, id) { const s = coState(t, id); return s && s.pi != null ? railMarket(p)[s.pi] : 0; }
function floated(p, s) { return !!s && s.pi != null && (+p.rail.shares - s.ipo) >= +p.rail.float; }
function cashOf(p, t, fid) { const r = railCash(p); return r ? ((t.res[fid] || {})[r.id] || 0) : 0; }
function payCash(p, t, fid, dv) { const r = railCash(p); if (!r) return; t.res[fid] = t.res[fid] || {}; t.res[fid][r.id] = Math.max(0, (t.res[fid][r.id] || 0) + dv); }
function updatePres(p, t, id) {
  const s = coState(t, id); const best = Object.entries(s.own).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])[0];
  if (!best) { s.pres = null; return; } if (!s.pres || (s.own[s.pres] || 0) < best[1]) { if (s.pres && s.pres !== best[0]) logEv(t, `${coName(p, id)}: novým prezidentem je ${fname(p, best[0])}`); s.pres = best[0]; }
}
function startCompany(p, t, fid, id, par) {
  const s = coState(t, id); if (!s || s.pi != null) return "Společnost už existuje"; const cost = 2 * par; if (cashOf(p, t, fid) < cost) return `Na založení je potřeba ${cost}`;
  const m = railMarket(p); let pi = m.findIndex(v => v >= par); if (pi < 0) pi = m.length - 1;
  payCash(p, t, fid, -cost); s.own[fid] = 2; s.ipo -= 2; s.pi = pi; s.par = par; s.cash += cost; s.pres = fid; logEv(t, `${fname(p, fid)} zakládá ${coName(p, id)} za ${par} (prezidentský podíl 2 akcie)`); return "";
}
function buyShare(p, t, fid, id, from) {
  const s = coState(t, id); if (!s || s.pi == null) return "Společnost ještě nebyla založena"; const price = from === "pool" ? coPrice(p, t, id) : s.par;
  if (from === "pool" ? s.pool <= 0 : s.ipo <= 0) return "Žádná akcie k prodeji"; if (cashOf(p, t, fid) < price) return `Akcie stojí ${price}`;
  payCash(p, t, fid, -price); if (from === "pool") s.pool--; else { s.ipo--; s.cash += price; } s.own[fid] = (s.own[fid] || 0) + 1;
  logEv(t, `${fname(p, fid)} kupuje akcii ${coName(p, id)} za ${price}${from === "pool" ? " (z poolu)" : ""}`); updatePres(p, t, id); return "";
}
function sellShare(p, t, fid, id) {
  const s = coState(t, id); if (!s || !(s.own[fid] > 0)) return "Nemáš akcii"; if (s.pool >= (+p.rail.shares) / 2) return "V poolu smí být nejvýš polovina akcií";
  if (s.pres === fid && s.own[fid] <= 2 && !Object.entries(s.own).some(([f, n]) => f !== fid && n >= 2)) return "Prezident nemůže prodat, nikdo jiný nemá 2 akcie na převzetí";
  const price = coPrice(p, t, id); payCash(p, t, fid, price); s.own[fid]--; s.pool++; s.pi = Math.max(0, s.pi - 1);
  logEv(t, `${fname(p, fid)} prodává akcii ${coName(p, id)} za ${price}`); updatePres(p, t, id); return "";
}
function trainLimit(p, t) { const order = railTrains(p).map(x => x.type); const ph = order.indexOf(t.rail.phase); let lim = 99;
  String(p.rail.limit || "").split(",").map(s => s.trim().split(":")).forEach(([ty, n]) => { if (order.indexOf(ty) <= ph && order.indexOf(ty) >= 0) lim = +n || lim; }); return lim; }
function nextTrain(p, t) { return railTrains(p).find(x => (t.rail.bank[x.type] || 0) > 0) || null; }
function buyTrain(p, t, id) {
  const s = coState(t, id); if (!floated(p, s)) return "Společnost ještě nejezdí (není dost prodaných akcií)"; const tr = nextTrain(p, t); if (!tr) return "Banka nemá vlaky";
  if (s.trains.length >= trainLimit(p, t)) return `Limit vlaků je ${trainLimit(p, t)}`; if (s.cash < tr.cost) return `Vlak ${tr.type} stojí ${tr.cost}, pokladna má ${s.cash}`;
  s.cash -= tr.cost; t.rail.bank[tr.type]--; s.trains.push(tr.type); const first = !t.rail.seen || !t.rail.seen.includes(tr.type); (t.rail.seen = t.rail.seen || []).push(tr.type);
  logEv(t, `${coName(p, id)} kupuje vlak ${tr.type} za ${tr.cost}`);
  if (first) { const order = railTrains(p).map(x => x.type); if (order.indexOf(tr.type) > order.indexOf(t.rail.phase)) { t.rail.phase = tr.type; logEv(t, `začíná fáze ${tr.type}`); }
    String(p.rail.rust || "").split(",").map(x => x.trim().split(">")).forEach(([a, b]) => { if (a === tr.type && b) { let n = 0; Object.values(t.rail.co).forEach(c => { const before = c.trains.length; c.trains = c.trains.filter(x => x !== b); n += before - c.trains.length; }); t.rail.rusted.push(b); logEv(t, `vlaky ${b} rezaví (${n})`); } });
    const lim = trainLimit(p, t); Object.entries(t.rail.co).forEach(([cid, c]) => { while (c.trains.length > lim) { const x = c.trains.shift(); logEv(t, `${coName(p, cid)} odevzdává vlak ${x} (limit ${lim})`); } }); }
  return "";
}
// Tržby: dividenda (každá akcie dostane desetinu, akcie v emisi a poolu platí společnosti) a kurz +1, nebo zadržení a kurz −1.
function runCompany(p, t, id, revenue, pay) {
  const s = coState(t, id); revenue = Math.max(0, Math.round(+revenue || 0)); s.last = revenue; const N = +p.rail.shares || 10;
  if (pay && revenue) { const per = Math.floor(revenue / N); Object.entries(s.own).forEach(([f, n]) => { if (n > 0) payCash(p, t, f, n * per); }); s.cash += (s.ipo + s.pool) * per; s.pi = Math.min(railMarket(p).length - 1, s.pi + 1); logEv(t, `${coName(p, id)} vyplácí ${revenue} (${per} na akcii)`); }
  else { s.cash += revenue; s.pi = Math.max(0, s.pi - 1); logEv(t, `${coName(p, id)} zadržuje ${revenue}`); }
  checkWin(p, t);
}
function endStockRound(p, t) {
  Object.entries(t.rail.co).forEach(([id, s]) => { if (s.pi == null) return; if (p.rail.soldUp && s.ipo === 0 && s.pool === 0) s.pi = Math.min(railMarket(p).length - 1, s.pi + 1); else if (p.rail.poolDown && s.pool > 0) s.pi = Math.max(0, s.pi - 1); });
  logEv(t, "konec akciového kola – kurzy upraveny");
}
// Odhad tržeb ze sítě míst: z domovského místa společnosti; vlak N navštíví N nejcennějších dosažitelných míst (D = všechna), města se mezi vlaky neopakují.
function revenueEstimate(p, t, id) {
  const net = p.nets.find(n => n.id === (t.netId || (p.nets[0] || {}).id)); const co = p.rail.companies.find(c => c.id === id); const s = coState(t, id); if (!net || !co || !s) return null;
  const home = net.nodes.find(n => same(n.name, co.home)); if (!home) return null;
  const reach = Object.keys(netCosts(net, home.id, Infinity, true)).map(k => netNode(net, k)).filter(n => +n.vp > 0).sort((a, b) => b.vp - a.vp); const used = new Set(); let sum = 0;
  [...s.trains].sort((a, b) => (parseInt(b, 10) || 99) - (parseInt(a, 10) || 99)).forEach(tr => { const n = parseInt(tr, 10) || 99; const pick = reach.filter(x => !used.has(x.id)).slice(0, n); if (pick.length < 2) return; pick.forEach(x => { used.add(x.id); sum += +x.vp; }); });
  return sum;
}
function railWorth(p, t, fid) { if (!p.rail.on || !t.rail) return 0; const r = railCash(p); return (r && !r.vp ? cashOf(p, t, fid) : 0) + Object.entries(t.rail.co).reduce((a, [id, s]) => a + (s.own[fid] || 0) * coPrice(p, t, id), 0); }
function sideRail(p, t) {
  if (!p.rail.on || !p.rail.companies.length) return `<p class="hint">Společnosti a vlaky nastavíš v Mechanikách (18xx).</p>`;
  if (!t.rail) return `<section><div class="eyebrow">Vláčková hra 18xx</div><button class="btn primary" id="rlInit">Připravit banku a společnosti</button></section>`;
  const cp = curPlayer(p, t); const cash = railCash(p); const m = railMarket(p); const pars = nums(p.rail.pars); const nt = nextTrain(p, t);
  return `<section><div class="eyebrow">Banka · fáze ${esc(t.rail.phase)} · limit vlaků ${trainLimit(p, t)}</div>
      <div class="row">${railTrains(p).map(x => `<span class="pl-chip ${t.rail.rusted.includes(x.type) ? "muted" : ""}">${esc(x.type)}: ${t.rail.bank[x.type] || 0}× · ${x.cost}${t.rail.rusted.includes(x.type) ? " · zrezivělé" : ""}</span>`).join("")}</div>
      ${cp ? `<p class="hint">Na tahu ${esc(cp.name)}${cash ? ` · ${cashOf(p, t, cp.id)} ${esc(cash.name)}` : ""} · hodnota ${railWorth(p, t, cp.id)}</p>` : ""}${fchipsHTML(p, t)}</section>
    ${p.rail.companies.map(c => { const s = coState(t, c.id); if (!s) return ""; const price = coPrice(p, t, c.id); const fl = floated(p, s); const est = s.pi != null ? revenueEstimate(p, t, c.id) : null;
      return `<section class="company" style="--c:${c.color}"><div class="row spread"><b><span class="dot" style="background:${c.color}"></span> ${esc(c.name)}</b><span class="mono">${s.pi != null ? `kurz ${price}` : "nezaložená"}</span></div>
        ${s.pi == null ? (cp ? `<div class="row"><select data-rpar="${c.id}" style="width:auto">${pars.map(v => `<option>${v}</option>`).join("")}</select><button class="btn small primary" data-rstart="${c.id}">Založit (2 akcie)</button></div>` : "") : `
        <span class="hint">Prezident: ${esc(fname(p, s.pres) || "–")} · emise ${s.ipo} · pool ${s.pool} · pokladna ${s.cash} · vlaky ${s.trains.join(", ") || "žádné"}${fl ? "" : ` · jezdí od ${p.rail.float} prodaných akcií`}</span>
        <span class="hint">Akcionáři: ${Object.entries(s.own).filter(([, n]) => n > 0).map(([f, n]) => `${esc(fname(p, f))} ${n}`).join(", ")}</span>
        ${cp ? `<div class="row">${s.ipo ? `<button class="btn small" data-rbuy="${c.id}|ipo">Koupit z emise (${s.par})</button>` : ""}${s.pool ? `<button class="btn small" data-rbuy="${c.id}|pool">Koupit z poolu (${price})</button>` : ""}${(s.own[cp.id] || 0) > 0 ? `<button class="btn small" data-rsell="${c.id}">Prodat (${price})</button>` : ""}</div>` : ""}
        ${fl ? `<div class="row">${nt ? `<button class="btn small" data-rtrain="${c.id}">Koupit vlak ${esc(nt.type)} (${nt.cost})</button>` : ""}<input type="number" min="0" data-rrev="${c.id}" value="${est ?? (s.last || "")}" placeholder="tržby" style="width:84px" aria-label="Tržby"><button class="btn small primary" data-rpay="${c.id}">Vyplatit</button><button class="btn small" data-rhold="${c.id}">Zadržet</button></div>${est != null ? `<span class="hint">Odhad ze sítě míst: ${est}</span>` : ""}` : ""}`}</section>`; }).join("")}
    <section><div class="eyebrow">Burza</div><div class="market">${m.map((v, i) => `<span class="mk">${v}${p.rail.companies.filter(c => (coState(t, c.id) || {}).pi === i).map(c => `<i style="background:${c.color}" title="${esc(c.name)}"></i>`).join("")}</span>`).join("")}</div>
      <button class="btn small" id="rlSR">Konec akciového kola</button></section>`;
}
function wireRail(main, p, t, save) {
  const q = id => document.getElementById(id); const on = (sel, fn) => $$(sel, main).forEach(el => el.addEventListener("click", () => fn(el))); const cp = curPlayer(p, t);
  const done = r => { if (r) { toast(r); return; } save(); render(); };
  if (q("rlInit")) q("rlInit").onclick = () => { railInit(p, t); save(); render(); };
  on("[data-rstart]", el => done(startCompany(p, t, cp.id, el.dataset.rstart, +$(`[data-rpar="${el.dataset.rstart}"]`, main).value)));
  on("[data-rbuy]", el => { const [id, from] = el.dataset.rbuy.split("|"); done(buyShare(p, t, cp.id, id, from)); });
  on("[data-rsell]", el => done(sellShare(p, t, cp.id, el.dataset.rsell)));
  on("[data-rtrain]", el => done(buyTrain(p, t, el.dataset.rtrain)));
  on("[data-rpay]", el => { runCompany(p, t, el.dataset.rpay, $(`[data-rrev="${el.dataset.rpay}"]`, main).value, true); save(); render(); });
  on("[data-rhold]", el => { runCompany(p, t, el.dataset.rhold, $(`[data-rrev="${el.dataset.rhold}"]`, main).value, false); save(); render(); });
  if (q("rlSR")) q("rlSR").onclick = () => { endStockRound(p, t); save(); render(); };
}
function railMechHTML(p) {
  const R = p.rail;
  return `<div class="panel"><h2>Vláčkové hry 18xx</h2>
    <label class="chk"><input type="checkbox" id="rlOn" ${R.on ? "checked" : ""}> Akciové společnosti, burza, vlaky a dividendy</label>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
      <label class="f">Peníze hráčů<select id="rlCash"><option value="">–</option>${p.resources.filter(r => !r.global).map(r => `<option value="${r.id}" ${r.id === R.cashRes ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</select></label>
      <label class="f">Akcií ve společnosti<input type="number" id="rlSh" min="2" max="20" value="${+R.shares || 10}"></label>
      <label class="f">Jezdí od prodaných akcií<input type="number" id="rlFl" min="1" max="20" value="${+R.float || 6}"></label>
      <label class="f">Možné nominální ceny<input type="text" id="rlPars" value="${esc(R.pars)}"></label></div>
    <label class="f">Kurzy na burze (zleva nejnižší)<input type="text" id="rlMk" value="${esc(R.market)}"></label>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">
      <label class="f" title="typ:cena:počet">Vlaky (typ:cena:počet)<input type="text" id="rlTr" value="${esc(R.trains)}"></label>
      <label class="f" title="první vlak X způsobí zrezivění Y">Rezivění (X>Y)<input type="text" id="rlRu" value="${esc(R.rust)}"></label>
      <label class="f" title="od fáze typ:limit">Limit vlaků (fáze:počet)<input type="text" id="rlLi" value="${esc(R.limit)}"></label></div>
    <label class="chk"><input type="checkbox" id="rlUp" ${R.soldUp ? "checked" : ""}> Vyprodaná společnost na konci akciového kola zdraží</label>
    <label class="chk"><input type="checkbox" id="rlDn" ${R.poolDown ? "checked" : ""}> Akcie v poolu na konci akciového kola sníží kurz</label>
    <div class="eyebrow">Společnosti</div>
    <div class="list">${R.companies.map(c => `<div class="item-row"><input type="color" data-rcc="${c.id}" value="${c.color}" aria-label="Barva" style="width:44px;height:36px;border:0;background:none;padding:0"><input type="text" data-rcn="${c.id}" value="${esc(c.name)}" style="flex:1;min-width:120px;width:auto" aria-label="Název"><input type="text" data-rch="${c.id}" value="${esc(c.home || "")}" placeholder="Domovské místo" style="width:150px" aria-label="Domovské místo"><button class="btn small danger" data-rcdel="${c.id}" aria-label="Smazat">✕</button></div>`).join("")}</div>
    <button class="btn small" id="rlAdd">+ Společnost</button>
    <p class="hint">Domovské místo = název místa v síti míst. Místa s body pak slouží jako hodnota měst pro odhad tržeb.</p></div>`;
}
function wireRailMech(main, p) {
  const ch = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener("change", () => { fn(el); touch(p); }); }; const R = p.rail;
  ch("rlOn", e => { R.on = e.checked; }); ch("rlCash", e => { R.cashRes = e.value; }); ch("rlSh", e => { R.shares = Math.max(2, +e.value || 10); }); ch("rlFl", e => { R.float = Math.max(1, +e.value || 6); }); ch("rlPars", e => { R.pars = e.value; });
  ch("rlMk", e => { R.market = e.value; }); ch("rlTr", e => { R.trains = e.value; }); ch("rlRu", e => { R.rust = e.value; }); ch("rlLi", e => { R.limit = e.value; }); ch("rlUp", e => { R.soldUp = e.checked; }); ch("rlDn", e => { R.poolDown = e.checked; });
  document.getElementById("rlAdd").onclick = () => { R.companies.push({ id: uid(), name: "Společnost " + (R.companies.length + 1), color: COLORS[R.companies.length % COLORS.length], home: "" }); touch(p); render(); };
  $$("[data-rcn]", main).forEach(i => i.addEventListener("change", () => { R.companies.find(c => c.id === i.dataset.rcn).name = i.value; touch(p); }));
  $$("[data-rch]", main).forEach(i => i.addEventListener("change", () => { R.companies.find(c => c.id === i.dataset.rch).home = i.value; touch(p); }));
  $$("[data-rcc]", main).forEach(i => i.addEventListener("change", () => { R.companies.find(c => c.id === i.dataset.rcc).color = i.value; touch(p); }));
  $$("[data-rcdel]", main).forEach(b => b.onclick = () => { R.companies = R.companies.filter(c => c.id !== b.dataset.rcdel); touch(p); render(); });
}
