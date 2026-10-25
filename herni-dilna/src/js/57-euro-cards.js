// ---------- Euro, karetní a ameritrash mechaniky ----------
// Rondel: figurka hráče obchází kruh akcí; o 1–N polí zdarma, dál za poplatek.
// Údržba (krmení): na začátku kola každý hráč zaplatí zdroj za sebe a za vyložené karty, za každý chybějící kus dostane postih.
// Slevy: vyložená karta zlevní další nákupy (všechny, nebo jen karty určitého typu) – stavba motoru.
// Rezervace: kartu z trhu si hráč odloží stranou (s bonusem) a koupí ji později.
// Spojenci: karta má schopnost, která se spustí, když už hráč má vyloženou kartu stejného typu (kombo).
// Reakce: karta jde zahrát i mimo vlastní tah.
// Událost kola: na začátku každého kola se otočí karta z balíčku událostí.
// Kořist: padlá jednotka upustí své předměty na pole a ostatní je mohou sebrat.
function normalizeEuro(p) {
  p.rondel = Object.assign({ on: false, free: 3, res: "", cost: 1, spaces: [] }, p.rondel || {});
  if (!p.rondel.spaces.length) p.rondel.spaces = ["Produkce", "Obchod", "Stavba", "Výzkum", "Nábor", "Daně"].map(n => ({ id: uid(), name: n, effect: "" }));
  p.upkeep = Object.assign({ on: false, res: "", base: 0, perTab: 0, type: "", penalty: "-1 Body" }, p.upkeep || {});
  p.reserve = Object.assign({ on: false, max: 3, res: "", bonus: 1 }, p.reserve || {});
  if (p.roundEvent == null) p.roundEvent = "";
}
// Cena karty po slevách z vyložených karet hráče.
function cardDiscount(p, t, fid, c) {
  return (t.tableau[fid] || []).map(h => cardOf(p, h).c).filter(Boolean).reduce((a, x) => a + (+x.disc && (!x.discType || x.discType === c.type) ? +x.disc : 0), 0);
}
function cardPrice(p, t, fid, c) { const base = parseFloat(c.cost) || 0; return fid ? Math.max(0, base - cardDiscount(p, t, fid, c)) : base; }
// Spojenecká schopnost po vyložení / zahrání.
function allyCheck(p, t, fid, h, c) {
  if (!c.allyFx) return ""; const ty = c.allyType || c.type; if (!ty) return "";
  const has = (t.tableau[fid] || []).some(x => x !== h && (cardOf(p, x).c || {}).type === ty);
  if (!has) return ""; runEffects(p, t, fid, c.allyFx, c.title + " (spojenec)"); logEv(t, `${c.title}: spojenecká schopnost (${ty})`); return c.allyFx;
}
// Rondel
function rondelMove(p, t, fid, to) {
  const R = p.rondel; const n = R.spaces.length; t.rondel = t.rondel || {}; const from = t.rondel[fid]; const steps = from == null ? 0 : ((to - from) % n + n) % n;
  if (from != null && steps === 0) return "Na stejném poli zůstat nelze";
  const extra = Math.max(0, steps - (+R.free || 0)) * (+R.cost || 0); const r = p.resources.find(x => x.id === R.res);
  if (extra) { if (!r) return `Dál než ${R.free} pole jít nelze`; const have = (t.res[fid] || {})[r.id] || 0; if (have < extra) return `Na ${steps} polí chybí ${r.name} (${have} z ${extra})`; t.res[fid][r.id] = have - extra; }
  t.rondel[fid] = to; const sp = R.spaces[to]; const f = p.factions.find(x => x.id === fid);
  logEv(t, `${f ? f.name : ""} na rondelu: ${sp.name}${extra ? ` (zaplatí ${extra} ${r.name})` : ""}`); if (sp.effect) runEffects(p, t, fid, sp.effect, sp.name); return "";
}
function sideRondel(p, t) {
  const R = p.rondel; const cp = curPlayer(p, t); const n = R.spaces.length; const pos = t.rondel || {}; const r = p.resources.find(x => x.id === R.res);
  const cur = cp ? pos[cp.id] : null; const ang = i => (i / n) * 2 * Math.PI - Math.PI / 2;
  return `<section><div class="eyebrow">Rondel</div>${fchipsHTML(p, t)}
    <div class="rondel">${R.spaces.map((s, i) => { const steps = cur == null ? 0 : ((i - cur) % n + n) % n; const extra = Math.max(0, steps - (+R.free || 0)) * (+R.cost || 0); const pawns = p.factions.filter(f => pos[f.id] === i);
      return `<button class="rsp ${cur === i ? "on" : ""}" data-rondel="${i}" style="left:${50 + 40 * Math.cos(ang(i))}%;top:${50 + 40 * Math.sin(ang(i))}%" ${cur != null && steps === 0 ? "disabled" : ""} title="${esc(s.effect ? describeEffect(s.effect) : "")}">
        <b>${esc(s.name)}</b>${cur != null && steps ? `<span>${steps} ${extra ? `· ${extra} ${esc(r ? r.name : "")}` : "· zdarma"}</span>` : ""}<span class="pawns">${pawns.map(f => `<i style="background:${f.color}"></i>`).join("")}</span></button>`; }).join("")}</div>
    <p class="hint">${cp ? esc(cp.name) + ": " : ""}posun o 1–${R.free} pole zdarma${r ? `, každé další za ${R.cost} ${esc(r.name)}` : ", dál nelze"}. Na prvním tahu vyber libovolné pole.</p></section>`;
}
function wireRondel(main, p, t, save) {
  $$("[data-rondel]", main).forEach(el => el.onclick = () => { const cp = curPlayer(p, t); if (!cp || !gate(p, t, "akce")) return; const m = rondelMove(p, t, cp.id, +el.dataset.rondel); if (m) { toast(m); return; } after(p, t, "akce", cp.id, p.rondel.spaces[+el.dataset.rondel].name); save(); render(); });
}
// Údržba na začátku kola
function upkeepRound(p, t) {
  const U = p.upkeep; if (!U.on) return; const r = p.resources.find(x => x.id === U.res); if (!r) return;
  p.factions.forEach(f => { const tab = (t.tableau[f.id] || []).filter(h => !U.type || (cardOf(p, h).c || {}).type === U.type).length; const need = (+U.base || 0) + (+U.perTab || 0) * tab; if (!need) return;
    t.res[f.id] = t.res[f.id] || {}; const have = t.res[f.id][r.id] || 0; const paid = Math.min(have, need); t.res[f.id][r.id] = have - paid; const miss = need - paid;
    logEv(t, `${f.name} platí údržbu ${paid}/${need} ${r.name}${miss ? `, chybí ${miss}` : ""}`); for (let i = 0; i < miss && U.penalty; i++) runEffects(p, t, f.id, U.penalty, "údržba"); });
}
// Událost kola
function eventRound(p, t) { const d = p.decks.find(x => x.id === p.roundEvent); const cp = curPlayer(p, t); if (!d || !cp) return; runEffects(p, t, cp.id, `událost z ${d.name}`, "událost kola"); }
// Rezervace z trhu
function reserveCard(p, t, fid, dId, i) {
  const R = p.reserve; t.reserved = t.reserved || {}; const mine = t.reserved[fid] = t.reserved[fid] || []; if (mine.length >= (+R.max || 3)) return `Rezervovat lze nejvýš ${R.max} karty`;
  const cId = t.market[dId][+i]; if (!cId) return "Prázdné místo"; t.market[dId][+i] = null; mine.push({ deckId: dId, cardId: cId, own: true });
  const r = p.resources.find(x => x.id === R.res); if (r && +R.bonus) { t.res[fid] = t.res[fid] || {}; t.res[fid][r.id] = Math.min(resMax(r), (t.res[fid][r.id] || 0) + +R.bonus); }
  const d = p.decks.find(x => x.id === dId); refillMarket(p, t, d); logEv(t, `${p.factions.find(f => f.id === fid).name} rezervuje ${cardOf(p, mine[mine.length - 1]).c.title}${r && +R.bonus ? ` (+${R.bonus} ${r.name})` : ""}`); return "";
}
function buyReserved(p, t, fid, idx) {
  t.reserved = t.reserved || {}; const h = (t.reserved[fid] || [])[idx]; if (!h) return "Karta není v rezervaci"; const c = cardOf(p, h).c; const cur = p.resources.find(r => r.id === p.marketCur); const price = cardPrice(p, t, fid, c);
  if (cur && price) { const have = (t.res[fid] || {})[cur.id] || 0; if (have < price) return `Chybí ${cur.name} (${have} z ${price})`; t.res[fid][cur.id] = have - price; }
  t.reserved[fid].splice(idx, 1); (t.pdisc[fid] = t.pdisc[fid] || []).push(h); logEv(t, `${p.factions.find(f => f.id === fid).name} kupuje z rezervace ${c.title}`); return "";
}
function reserveHTML(p, t) {
  if (!p.reserve.on) return ""; const cp = curPlayer(p, t); if (!cp) return ""; const mine = (t.reserved || {})[cp.id] || [];
  return `<section><div class="eyebrow">Rezervace · ${esc(cp.name)} ${mine.length}/${p.reserve.max}</div>${mine.length ? `<div class="hand mini">${mine.map((h, i) => { const { c, d } = cardOf(p, h); return `<div class="hc">${cardHTML(c, d)}<button class="btn small primary" data-rbuy="${i}">Koupit za ${cardPrice(p, t, cp.id, c)}</button></div>`; }).join("")}</div>` : `<span class="hint">Nic – u karty na trhu stiskni „Rezervovat“.</span>`}</section>`;
}
// Kořist
function dropLoot(p, t, it) {
  const loot = attachedTo(p, t, it); loot.forEach((o, n) => { delete o.attachTo; o.x = it.x + 8 + n * 10; o.y = it.y + 8 + n * 6; });
  (it.gear || []).forEach(g => (t.discard[g.deckId] = t.discard[g.deckId] || []).push(g.cardId)); it.gear = [];
  if (loot.length) logEv(t, `${(unitOf(p, it) || {}).name} upouští: ${loot.map(o => tokDef(p, o).name).join(", ")}`); return loot.length;
}
function lootNear(p, t, it) {
  const k0 = locKey(p, t, it); if (!k0) return []; const b = tableBoard(p);
  return t.items.filter(o => o.kind === "token" && !o.attachTo && (tokDef(p, o) || {}).small && (() => { const k = locKey(p, t, o); return k && (k === k0 || b && hexDist(b, k0, k) <= 1); })());
}
function lootSelHTML(p, t, i) { const l = lootNear(p, t, i); return l.length ? `<div class="row"><span class="hint">Sebrat:</span>${l.slice(0, 5).map(o => `<button class="btn small" data-loot="${o.uid}">${esc(tokDef(p, o).name)}</button>`).join("")}</div>` : ""; }
function wireLoot(main, p, t, save) {
  const sel = t.items.find(i => i.uid === S.sel); if (!sel || sel.kind !== "unit") return;
  $$("[data-loot]", main).forEach(el => el.onclick = () => { const o = t.items.find(x => x.uid === el.dataset.loot); if (!o) return; const tk = tokDef(p, o); if (carryCheck(p, t, sel, tk).length && !gate(p, t, "vybaveni", carryCheck(p, t, sel, tk))) return;
    o.attachTo = sel.uid; o.x = sel.x; o.y = sel.y; logEv(t, `${unitOf(p, sel).name} sbírá ${tk.name}`); save(); render(); });
}
// Nastavení v Mechanikách
function euroMechHTML(p) {
  const R = p.rondel, U = p.upkeep; const resOpt = (sel, none = "–") => `<option value="">${none}</option>${p.resources.map(r => `<option value="${r.id}" ${r.id === sel ? "selected" : ""}>${esc(r.name)}</option>`).join("")}`;
  return `<div class="panel"><h2>Rondel a údržba</h2>
    <label class="chk"><input type="checkbox" id="roOn" ${R.on ? "checked" : ""}> Akce se vybírají na rondelu (kruh akcí)</label>
    ${R.on ? `<div class="grid" style="grid-template-columns:repeat(3,1fr)"><label class="f">Polí zdarma<input type="number" id="roFree" min="1" max="8" value="${esc(R.free)}"></label><label class="f">Poplatek za další<select id="roRes">${resOpt(R.res, "nelze dál")}</select></label><label class="f">Za pole<input type="number" id="roCost" min="0" max="9" value="${esc(R.cost)}"></label></div>
      <div class="list">${R.spaces.map(s => `<div class="item-row"><input type="text" data-ro="name|${s.id}" value="${esc(s.name)}" style="width:120px" aria-label="Název pole"><input type="text" data-ro="effect|${s.id}" value="${esc(s.effect)}" placeholder="Efekt, např. +2 Mince" style="flex:1;min-width:120px;width:auto" aria-label="Efekt"><button class="btn small danger" data-rodel="${s.id}" aria-label="Smazat">✕</button></div>`).join("")}</div>
      <button class="btn small" id="roAdd">+ Pole rondelu</button>` : ""}
    <h3>Údržba (krmení)</h3>
    <label class="chk"><input type="checkbox" id="upOn" ${U.on ? "checked" : ""}> Na začátku kola každý hráč platí údržbu</label>
    ${U.on ? `<div class="grid" style="grid-template-columns:1fr 1fr"><label class="f">Zdroj<select id="upRes">${resOpt(U.res)}</select></label><label class="f">Za hráče<input type="number" id="upBase" min="0" max="20" value="${esc(U.base)}"></label>
      <label class="f">Za každou vyloženou kartu<input type="number" id="upTab" min="0" max="9" value="${esc(U.perTab)}"></label><label class="f">Jen karty typu<input type="text" id="upType" value="${esc(U.type)}" placeholder="všechny"></label></div>
      <label class="f">Postih za každý chybějící kus<input type="text" id="upPen" value="${esc(U.penalty)}" placeholder="-1 Body"></label>` : ""}</div>`;
}
function cardsMechHTML(p) {
  const RS = p.reserve;
  return `<div class="panel"><h2>Motor, kombinace a události</h2>
    <p class="hint"><b>Slevy</b> a <b>spojenecké schopnosti</b> nastavíš u karty („Motor a kombinace“). Sleva zlevní nákup z trhu i vyložení karty; spojenecká schopnost se spustí, když už má hráč vyloženou kartu stejného typu. <b>Reakci</b> jde zahrát i mimo svůj tah.</p>
    <label class="chk"><input type="checkbox" id="rsOn" ${RS.on ? "checked" : ""}> Karty z trhu jde rezervovat</label>
    ${RS.on ? `<div class="grid" style="grid-template-columns:repeat(3,1fr)"><label class="f">Nejvýš karet<input type="number" id="rsMax" min="1" max="9" value="${esc(RS.max)}"></label><label class="f">Bonus<select id="rsRes"><option value="">žádný</option>${p.resources.map(r => `<option value="${r.id}" ${r.id === RS.res ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</select></label><label class="f">Kolik<input type="number" id="rsBon" min="0" max="9" value="${esc(RS.bonus)}"></label></div>` : ""}
    <label class="f">Událost na začátku každého kola z balíčku<select id="evDeck"><option value="">žádná</option>${p.decks.map(d => `<option value="${d.id}" ${d.id === p.roundEvent ? "selected" : ""}>${esc(d.name)}</option>`).join("")}</select></label>
    <p class="hint"><b>Kořist:</b> padlá jednotka upustí předměty na své pole; jednotka na stejném nebo sousedním poli je sebere tlačítkem „Sebrat“.</p></div>`;
}
function wireEuroMech(main, p) {
  const q = id => document.getElementById(id); const ch = (id, fn, re) => { if (q(id)) q(id).addEventListener("change", e => { fn(e.target); touch(p); if (re) render(); }); };
  const R = p.rondel, U = p.upkeep, RS = p.reserve;
  ch("roOn", e => { R.on = e.checked; }, 1); ch("roFree", e => { R.free = Math.max(1, +e.value || 1); }); ch("roRes", e => { R.res = e.value; }); ch("roCost", e => { R.cost = +e.value || 0; });
  $$("[data-ro]", main).forEach(i => i.addEventListener("change", () => { const [k, id] = i.dataset.ro.split("|"); R.spaces.find(s => s.id === id)[k] = i.value; touch(p); }));
  $$("[data-rodel]", main).forEach(b => b.onclick = () => { R.spaces = R.spaces.filter(s => s.id !== b.dataset.rodel); touch(p); render(); });
  if (q("roAdd")) q("roAdd").onclick = () => { R.spaces.push({ id: uid(), name: "Pole " + (R.spaces.length + 1), effect: "" }); touch(p); render(); };
  ch("upOn", e => { U.on = e.checked; }, 1); ch("upRes", e => { U.res = e.value; }); ch("upBase", e => { U.base = +e.value || 0; }); ch("upTab", e => { U.perTab = +e.value || 0; }); ch("upType", e => { U.type = e.value.trim(); }); ch("upPen", e => { U.penalty = e.value; });
  ch("rsOn", e => { RS.on = e.checked; }, 1); ch("rsMax", e => { RS.max = Math.max(1, +e.value || 3); }); ch("rsRes", e => { RS.res = e.value; }); ch("rsBon", e => { RS.bonus = +e.value || 0; });
  ch("evDeck", e => { p.roundEvent = e.value; });
}
// Pole karty v editoru
function cardEngineHTML(c) {
  return `<details class="cfx" ${c.disc || c.allyFx || c.reaction ? "open" : ""}><summary>Motor a kombinace (slevy, spojenci, reakce)</summary>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">
      <label class="f" title="Dokud je karta vyložená, zlevní další nákupy o tolik">Sleva<input type="number" id="c-disc" min="0" max="9" value="${esc(c.disc || "")}" placeholder="0"></label>
      <label class="f" title="Sleva platí jen na karty tohoto typu (prázdné = na všechny)">Sleva jen na typ<input type="text" id="c-discType" value="${esc(c.discType || "")}" placeholder="všechny"></label>
      <label class="f" title="Spustí se, když hráč už má vyloženou kartu tohoto typu (prázdné = stejný typ jako tahle karta)">Spojenec – typ<input type="text" id="c-allyType" value="${esc(c.allyType || "")}" placeholder="stejný typ"></label>
      <label class="f" title="Efekt spojenecké schopnosti">Spojenec – efekt<input type="text" id="c-allyFx" value="${esc(c.allyFx || "")}" placeholder="+2 Mince"></label></div>
    <label class="chk"><input type="checkbox" id="c-reaction" ${c.reaction ? "checked" : ""}> Reakce – jde zahrát i mimo svůj tah</label></details>`;
}
function readCardEngine(c, d) { ["disc", "discType", "allyType", "allyFx"].forEach(k => { c[k] = $("#c-" + k, d).value.trim(); }); c.disc = c.disc === "" ? "" : +c.disc || 0; c.reaction = $("#c-reaction", d).checked; }
const lcFirst = s => String(s || "").charAt(0).toLowerCase() + String(s || "").slice(1);
function euroRulebook(p) {
  const out = []; const R = p.rondel, U = p.upkeep;
  if (R.on) out.push(["Rondel", `<p>Hráč ve svém tahu posune figurku po kruhu o 1–${R.free} pole zdarma${R.res ? `, každé další pole stojí ${R.cost} ${esc((p.resources.find(r => r.id === R.res) || {}).name || "")}` : ""}, a provede akci pole. Na místě zůstat nesmí.</p><ol>${R.spaces.map(s => `<li><b>${esc(s.name)}</b>${s.effect ? ": " + esc(describeEffect(s.effect)) : ""}</li>`).join("")}</ol>`]);
  if (U.on) { const r = p.resources.find(x => x.id === U.res); if (r) out.push(["Údržba", `<p>Na začátku kola každý hráč zaplatí ${U.base} ${esc(r.name)}${+U.perTab ? ` a ${U.perTab} za každou vyloženou kartu${U.type ? ` typu ${esc(U.type)}` : ""}` : ""}. Za každý chybějící kus: ${esc(lcFirst(describeEffect(U.penalty || "")).replace(/\.$/, ""))}.</p>`]); }
  const disc = p.decks.flatMap(d => d.cards.filter(c => +c.disc)), ally = p.decks.flatMap(d => d.cards.filter(c => c.allyFx)), react = p.decks.flatMap(d => d.cards.filter(c => c.reaction));
  if (disc.length) out.push(["Slevy", `<ul>${disc.map(c => `<li><b>${esc(c.title)}</b>: −${c.disc} z ceny ${c.discType ? `karet typu ${esc(c.discType)}` : "každé karty"}, dokud je vyložená</li>`).join("")}</ul>`]);
  if (ally.length) out.push(["Spojenecké schopnosti", `<ul>${ally.map(c => `<li><b>${esc(c.title)}</b>: máš-li vyloženou kartu typu ${esc(c.allyType || c.type)}, navíc ${esc(lcFirst(describeEffect(c.allyFx)).replace(/\.$/, ""))}</li>`).join("")}</ul>`]);
  if (react.length) out.push(["Reakce", `<p>Tyto karty smíš zahrát i mimo svůj tah: ${react.map(c => esc(c.title)).join(", ")}.</p>`]);
  if (p.reserve.on) out.push(["Rezervace", `<p>Místo nákupu si můžeš kartu z trhu odložit stranou (nejvýš ${p.reserve.max})${p.reserve.res && +p.reserve.bonus ? ` a vzít si ${p.reserve.bonus} ${esc((p.resources.find(r => r.id === p.reserve.res) || {}).name || "")}` : ""}. Později ji koupíš za její cenu.</p>`]);
  const ev = p.decks.find(d => d.id === p.roundEvent); if (ev) out.push(["Událost kola", `<p>Na začátku každého kola otoč vrchní kartu balíčku ${esc(ev.name)} a proveď ji.</p>`]);
  return out;
}
// Simulace: tahy na rondelu (hodnota efektu pole, poplatek za vzdálená pole se odečte).
function simRondelMoves(p, t, f) {
  const R = p.rondel; if (!R.on || !R.spaces.length) return []; const n = R.spaces.length; const from = (t.rondel || {})[f.id]; const r = p.resources.find(x => x.id === R.res);
  return R.spaces.map((s, i) => { const steps = from == null ? 0 : ((i - from) % n + n) % n; if (from != null && !steps) return null; const extra = Math.max(0, steps - (+R.free || 0)) * (+R.cost || 0);
    if (extra && (!r || ((t.res[f.id] || {})[r.id] || 0) < extra)) return null;
    const val = affordableValue(p, t, f.id, s.effect || "", extra); if (val == null) return null;
    return { v: val - extra * .4 + .3, card: "Rondel: " + s.name, run() { rondelMove(p, t, f.id, i); after(p, t, "akce", f.id, s.name); } }; }).filter(Boolean);
}
// Hodnota efektu, který si hráč může dovolit (u „vyber:“ nejlepší dostupná možnost); null = nic z toho nezaplatí.
function affordableValue(p, t, fid, text, spent = 0) {
  const body = String(text || "").trim(); const alts = /^vyber\s*:/i.test(body) ? body.replace(/^vyber\s*:/i, "").split("|").map(s => s.trim()) : [body];
  const ok = a => { const m = a.match(/zaplať\s+(.+?)\s*:/i); if (!m) return true; return costItems(p, m[1]).every(c => c.r && (((t.res[fid] || {})[c.r.id] || 0) - (c.r.id === p.rondel.res ? spent : 0)) >= c.n); };
  const vals = alts.filter(ok).map(a => effectValue(p, a)); return vals.length ? Math.max(...vals) : null;
}
