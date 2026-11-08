// Rozhraní: záložky s tabulkami, události v okně, ukládání v prohlížeči.
let S = null, TAB = "prehled", SEL = { prov: "vranov", army: null, logCat: "" };
const $ = q => document.querySelector(q);
const esc = t => String(t == null ? "" : t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = n => (Math.round(n) || 0).toLocaleString("cs-CZ");
const sg = n => (n > 0 ? "+" : "") + fmt(n);
const cls = (v, lo, hi) => (v < lo ? "bad" : v > hi ? "good" : "");
const bar = (v, inv) => `<div class="bar ${inv ? (v > 60 ? "red" : v > 35 ? "yel" : "") : (v < 25 ? "red" : v < 45 ? "yel" : "")}"><i style="width:${clamp(v, 0, 100)}%"></i></div>`;
function btn(label, a, args = [], err = null, title = "") { return `<button class="b" data-a="${a}" data-x="${esc(JSON.stringify(args))}"${err ? ` disabled title="${esc(err)}"` : title ? ` title="${esc(title)}"` : ""}>${label}</button>`; }
const tbl = (head, rows) => `<table><thead><tr>${head.map(h => (h.startsWith("#") ? `<th class="n">${h.slice(1)}</th>` : `<th>${h}</th>`)).join("")}</tr></thead><tbody>${rows.join("") || `<tr><td colspan="${head.length}" class="muted">—</td></tr>`}</tbody></table>`;
const tr = cells => "<tr>" + cells.map(c => (typeof c === "number" ? `<td class="n">${fmt(c)}</td>` : String(c).startsWith("<td") ? c : `<td>${c}</td>`)).join("") + "</tr>";
const tdn = (v, c = "") => `<td class="n ${c}">${v}</td>`;
const card = (t, body) => `<div class="card"><h3>${t}</h3>${body}</div>`;
const costTxt = c => [c.money ? c.money + " zl" : "", c.drevo ? c.drevo + " dřeva" : "", c.kamen ? c.kamen + " kamene" : "", c.vino ? c.vino + " vína" : ""].filter(Boolean).join(", ") || "zdarma";
function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), 2600); }
const provOwner = p => (p.owner === "hrac" ? "<b>ty</b>" : S.rivals[p.owner] ? esc(S.rivals[p.owner].n) : "?");

// ---------- akce ----------
const ACT = {
  build: (w, b) => build(S, w, b), cancel: i => cancelBuild(S, i), recruit: (u, n, a) => recruit(S, u, n, a), disband: (a, u, n) => disband(S, a, u, n),
  levy: () => raiseLevy(S), move: (a, to) => orderMove(S, a, to), cmd: (a, w) => setCommander(S, a, w), split: (a, u, n) => newArmy(S, a, u, n), merge: (a, b) => mergeArmies(S, a, b),
  rename: (a, n) => { const x = S.armies.find(y => y.id === a); if (x && n) x.name = n; },
  buy: (g, n) => trade(S, g, n, true), sell: (g, n) => trade(S, g, n, false), tax: (e, v) => setTax(S, e, +v), law: (l, v) => setLaw(S, l, +v),
  borrow: n => borrow(S, n), repay: i => repay(S, i), appoint: (seat, c) => appoint(S, seat, c), dismiss: seat => dismiss(S, seat), focus: (c, f) => setFocus(S, c, f || null),
  research: t => setResearch(S, t), exped: id => startExpedition(S, id), action: a => doAction(S, a), dip: (r, a, x) => dipAction(S, r, a, x),
  peace: (r, t, pid) => makePeace(S, r, { t, pid }), title: () => raiseTitle(S), event: (i, c) => resolveEvent(S, i, c),
  end: () => endTurn(S), prov: id => { SEL.prov = id; }, tab: t => { TAB = t; }, army: id => { SEL.army = id; }, logcat: c => { SEL.logCat = c; },
  save: n => saveSlot(n), load: n => loadSlot(n), del: n => { try { localStorage.removeItem("panovnik_slot_" + n); } catch (e) {} }, exportSave: () => exportSave(), importSave: () => $("#impFile").click(),
  newgame: () => { if (!confirm("Začít novou hru? Neuložený postup se ztratí.")) return; S = newGame({ realm: $("#ngRealm").value, ruler: $("#ngRuler").value, dynasty: $("#ngDyn").value, seed: $("#ngSeed").value ? +$("#ngSeed").value : undefined }); TAB = "prehled"; },
  theme: () => { const r = document.documentElement; const t = r.dataset.theme === "dark" ? "light" : r.dataset.theme === "light" ? "" : "dark"; if (t) r.dataset.theme = t; else delete r.dataset.theme; try { localStorage.setItem("panovnik_theme", t); } catch (e) {} },
};
document.addEventListener("click", ev => {
  const el = ev.target.closest("[data-a]"); if (!el || el.disabled || el.tagName === "SELECT") return;
  run(el.dataset.a, JSON.parse(el.dataset.x || "[]"));
});
document.addEventListener("change", ev => {
  const el = ev.target.closest("select[data-a], input[data-a]"); if (!el) return;
  const args = JSON.parse(el.dataset.x || "[]"); args.push(el.value); run(el.dataset.a, args);
});
document.addEventListener("keydown", ev => { if (ev.key === "Enter" && ev.ctrlKey) run("end", []); });
function run(a, args) {
  args = args.map(x => (typeof x === "string" && x[0] === "#" ? ($(x) ? ($(x).type === "number" ? +$(x).value : $(x).value) : "") : x));
  let err = null; try { err = ACT[a](...args); } catch (e) { console.error(e); err = "Chyba: " + e.message; }
  if (err) toast(err);
  if (a === "end" && !err) { window.scrollTo(0, 0); toast(`${dateStr(S)} – nové období.`); }
  autosave(); render();
}

// ---------- ukládání ----------
function autosave() { try { localStorage.setItem("panovnik_auto", JSON.stringify(S)); } catch (e) {} }
function saveSlot(n) { try { localStorage.setItem("panovnik_slot_" + n, JSON.stringify(S)); toast("Uloženo do pozice " + n + "."); } catch (e) { return "Uložení se nezdařilo: " + e.message; } }
function loadSlot(n) { try { const t = localStorage.getItem("panovnik_slot_" + n); if (!t) return "Pozice je prázdná."; S = JSON.parse(t); toast("Načteno."); } catch (e) { return "Načtení se nezdařilo."; } }
function slotInfo(n) { try { const t = localStorage.getItem("panovnik_slot_" + n); if (!t) return null; const x = JSON.parse(t); return `${x.realm.name}, ${SEASONS[x.season]} ${x.year}`; } catch (e) { return null; } }
function exportSave() {
  const blob = new Blob([JSON.stringify(S)], { type: "application/json" }); const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `panovnik-${S.year}-${SEASONS[S.season]}.json`; document.body.appendChild(a); a.click(); a.remove();
}
function importFile(f) { const r = new FileReader(); r.onload = () => { try { const x = JSON.parse(r.result); if (!x.provinces || !x.rivals) throw 0; S = x; toast("Hra načtena ze souboru."); autosave(); render(); } catch (e) { toast("Soubor není uložená hra."); } }; r.readAsText(f); }

// ---------- hlavička a záložky ----------
const TABS = [["prehled", "Přehled"], ["sidlo", "Sídlo"], ["uzemi", "Území"], ["hosp", "Hospodářství"], ["trh", "Trh a obchod"], ["vojsko", "Vojsko"], ["valka", "Válka"], ["politika", "Stavy a zákony"], ["dvur", "Rod a rada"], ["diplo", "Diplomacie"], ["objevy", "Objevy"], ["kronika", "Kronika"], ["hra", "Hra"]];
function renderTop() {
  const R = ch(S, S.ruler), inc = sum(Object.values(incomeBreakdown(S))), ex = sum(Object.values(expenseBreakdown(S))), net = inc - ex;
  const need = grainNeed(S), gn = need.lid + need.vojsko + need.dvur;
  $("#top").innerHTML = `<span class="realm">${esc(S.realm.name)}</span>
  <span class="st">${esc(cap(realmTitle(S)))} <b>${esc(R.name)}</b> (${R.age})</span>
  <span class="st">📅 <b>${dateStr(S)}</b></span>
  <span class="st" title="Zlato a odhad čistého příjmu za období">💰 <b>${fmt(S.money)}</b> <span class="${net < 0 ? "bad" : "good"}">(${sg(net)})</span></span>
  <span class="st" title="Obilí na skladě / spotřeba za období">🌾 <b class="${S.stock.obili < gn * 1.5 ? "bad" : ""}">${fmt(S.stock.obili)}</b>/${fmt(gn)}</span>
  <span class="st" title="Prestiž">⚜ <b>${fmt(S.prestige)}</b></span><span class="st" title="Zbožnost">✝ <b>${fmt(S.piety)}</b></span><span class="st" title="Legitimita">⚖ <b>${fmt(S.legitimacy)}</b></span>
  <span class="st" title="Body činů panovníka">✋ <b>${S.ap}</b></span>
  ${S.wars.length ? `<span class="st bad">⚔ válka: ${S.wars.map(w => esc(S.rivals[w.enemy].n)).join(", ")}</span>` : ""}
  <span class="sp"></span><button class="main" data-a="end" data-x="[]" ${S.over ? "disabled" : ""} title="Ctrl+Enter">Konec období ▶</button>`;
  $("#tabs").innerHTML = TABS.map(([id, n]) => `<button class="${TAB === id ? "on" : ""}" data-a="tab" data-x='["${id}"]'>${n}${id === "valka" && S.wars.length ? " ⚔" : ""}</button>`).join("");
}
function render() {
  if (!S) return; renderTop();
  const f = { prehled: tPrehled, sidlo: tSidlo, uzemi: tUzemi, hosp: tHosp, trh: tTrh, vojsko: tVojsko, valka: tValka, politika: tPolitika, dvur: tDvur, diplo: tDiplo, objevy: tObjevy, kronika: tKronika, hra: tHra }[TAB];
  $("#main").innerHTML = f();
  renderModal();
}
function renderModal() {
  const m = $("#modal");
  if (S.events.length) {
    const v = eventView(S, S.events[0]);
    m.innerHTML = `<div class="box"><div class="muted small">${dateStr(S)}${S.events.length > 1 ? ` · čeká ${S.events.length} událostí` : ""}</div><h2>${esc(v.t)}</h2><p>${esc(v.txt)}</p>${v.ch.map(c => `<button class="b ch" data-a="event" data-x="[0,${c.i}]" ${c.ok ? "" : "disabled title='Nelze zvolit'"}>${esc(c.t)}</button>`).join("")}</div>`;
    m.classList.remove("hidden");
  } else if (S.over && !S.overSeen) {
    m.innerHTML = `<div class="box"><h2>${S.over.win ? "Konec hry" : "Prohra"}</h2><p>${esc(S.over.txt)}</p><p>Skóre: <b>${score(S)}</b></p><button class="b ch" data-a="tab" data-x='["hra"]' onclick="S.overSeen=true">Zavřít</button></div>`;
    m.classList.remove("hidden");
  } else m.classList.add("hidden");
}

// ---------- Přehled ----------
function warnings() {
  const w = [], need = grainNeed(S), gn = need.lid + need.vojsko + need.dvur;
  if (S.stock.obili + (provProductionAll(S) || 0) - gn < gn * 0.5) w.push(["bad", `Hrozí hlad: zásoba ${fmt(S.stock.obili)}, spotřeba ${fmt(gn)} za období, tato sklizeň ${fmt(provProductionAll(S))}.`]);
  for (const e of ESTATE_IDS) if (S.estates[e].loy < 30) w.push(["bad", `${ESTATES[e].n}: věrnost jen ${fmt(S.estates[e].loy)} – hrozí krize.`]);
  for (const p of myProvs(S)) { if (p.unrest > 60) w.push(["warn", `Nepokoje v ${p.n}: ${fmt(p.unrest)}.`]); if (p.occ) w.push(["bad", `${p.n} je obsazena nepřítelem!`]); if (p.siege && p.siege.by !== "hrac") w.push(["bad", `${p.n} je obléhána (${fmt(p.siege.prog)} %).`]); }
  const net = sum(Object.values(incomeBreakdown(S))) - sum(Object.values(expenseBreakdown(S))); if (net < 0) w.push(["warn", `Výdaje převyšují příjmy o ${fmt(-net)} zl za období.`]);
  if (!S.research.cur) w.push(["warn", "Učenci nemají zadaný výzkum (záložka Objevy)."]);
  for (const k of COUNCIL_IDS) if (!S.council[k]) w.push(["warn", `Úřad ${COUNCIL[k].n} je neobsazený.`]);
  if (S.ap > 0) w.push(["muted", `Panovníkovi zbývají ${S.ap} body činů.`]);
  if (!S.spouse && ch(S, S.ruler).age >= 16) w.push(["warn", "Panovník nemá choť – rod nemá jistotu dědice."]);
  if (!heirOf(S)) w.push(["bad", "Rod nemá dědice!"]);
  return w;
}
function provProductionAll(s) { return Math.round(sum(myProvs(s).map(p => provProduction(s, p).out.obili || 0))); }
function tPrehled() {
  const R = ch(S, S.ruler), H = heirOf(S), inc = incomeBreakdown(S), ex = expenseBreakdown(S);
  const tq = S.realm.title < 3 ? titleReq(S, S.realm.title + 1) : null, terr = canTitle(S);
  const hist = S.history.slice(-12).reverse().map(h => tr([h.d, h.money, h.income, h.expense, h.pop, h.prov, h.army, h.grain, h.prestige, h.legit]));
  return `<div class="grid">
  ${card("Říše", `<div class="kv"><span>Titul</span><span>${cap(realmTitle(S))} – ${esc(S.realm.name)}</span><span>Panovník</span><span>${esc(R.name)}, ${R.age} let, zdraví ${fmt(R.health)}</span><span>Dědic</span><span>${H ? esc(H.name) + ` (${H.age})` : '<span class="bad">žádný</span>'}</span>
    <span>Provincie</span><span>${myProvs(S).length}</span><span>Obyvatel</span><span>${fmt(totalPop(S))}</span><span>Vojsko</span><span>${unitCount(totalUnits(S))} setnin</span>
    <span>Příjem / výdaje</span><span>${fmt(sum(Object.values(inc)))} / ${fmt(sum(Object.values(ex)))} zl za období</span><span>Dluhy</span><span>${fmt(sum(S.debts.map(d => d.amount)))} zl</span>
    <span>Přízeň krále</span><span>${fmt(S.liege.opinion)}</span><span>Skóre</span><span>${score(S)}</span></div>`)}
  ${card("Hlášení rádců", warnings().filter(x => x[1]).map(([c, t]) => `<div class="${c}">• ${esc(t)}</div>`).join("") || '<span class="good">Vše v pořádku.</span>')}
  ${card(`Činy panovníka (zbývá ${S.ap})`, tbl(["Čin", "Účinek", "Cena", ""], Object.entries(ACTIONS).map(([id, A]) => tr([A.n, `<span class="small">${A.d}</span>`, costTxt(A.cost(S)), btn("Provést", "action", [id], S.ap <= 0 ? "Žádné body činů" : null)]))))}
  ${card("Cesta ke koruně", tq ? `<p>Další titul: <b>${TITLES[S.realm.title + 1]}</b>${S.realm.title + 1 === 3 ? " (vítězství)" : ""}</p>` + tbl(["Podmínka", "#Potřeba", "#Máš"], [tr(["Provincie", tq.prov, myProvs(S).length]), tr(["Prestiž", tq.prestige, S.prestige]), tr(["Zlato", tq.money, S.money]), tq.liege ? tr(["Přízeň krále", tq.liege, S.liege.opinion]) : "", tq.legit ? tr(["Legitimita", tq.legit, S.legitimacy]) : ""]) + `<div class="row">${btn(S.realm.title + 1 === 3 ? "Usilovat o královskou korunu" : "Žádat krále o povýšení", "title", [], terr)}</div>` : "Jsi králem.")}
  <div class="card" style="grid-column:1/-1"><h3>Vývoj říše</h3>${tbl(["Období", "#Zlato", "#Příjem", "#Výdaje", "#Obyvatel", "#Provincie", "#Vojsko", "#Obilí", "#Prestiž", "#Legitimita"], hist)}</div>
  ${card("Poslední zprávy", S.log.slice(0, 12).map(l => `<div class="small"><span class="tag">${SEASONS[l.se]} ${l.y}</span>${esc(l.txt)}</div>`).join(""))}
  </div>`;
}

// ---------- Sídlo ----------
function buildRows(where, defs, cur) {
  return Object.entries(defs).map(([b, B]) => {
    const lvl = cur(b), next = lvl + 1, q = S.queue.find(x => x.where === where && x.b === b);
    const ok = !B.need || B.need(where === "seat" ? S : S.provinces[where]);
    if (!ok && !lvl) return tr([`<span class="muted">${B.n}</span>`, `<span class="muted small">${B.d}</span>`, "—", "", "", '<span class="muted small">nelze</span>']);
    const c = lvl < B.max ? buildCost(S, B, next) : null;
    return tr([B.n, `<span class="small">${B.d}</span>`, `<td class="n">${lvl}/${B.max}</td>`, c ? costTxt(c) : "—", c ? Math.max(1, B.time + Math.floor(lvl / 2) - (S.laws.robota === 2 ? 1 : 0)) + " obd." : "", q ? `<span class="warn">staví se (${q.left})</span>` : lvl >= B.max ? '<span class="good">hotovo</span>' : btn(lvl ? "Rozšířit" : "Postavit", "build", [where, b], canBuild(S, where, b))]);
  });
}
function queueCard() { return card("Rozestavěno", tbl(["Stavba", "Kde", "#Zbývá", ""], S.queue.map((q, i) => tr([`${(q.where === "seat" ? SBUILD : PBUILD)[q.b].n} ${q.lvl}`, q.where === "seat" ? "sídlo" : S.provinces[q.where].n, q.left, btn("Zrušit", "cancel", [i])]))) + `<p class="small muted">Najednou lze stavět ${3 + Math.floor(cstat(S, "spravce") / 6)} staveb (podle purkrabího). Robota: ${LAWS.robota.opts[S.laws.robota]}.</p>`); }
function tSidlo() {
  const cap_ = grainCap(S);
  return `<div class="grid"><div class="card" style="grid-column:1/-1"><h3>Panské sídlo – ${esc(S.provinces[S.capital].n)}</h3>${tbl(["Budova", "Účinek", "#Úroveň", "Cena další úrovně", "Doba", ""], buildRows("seat", SBUILD, b => S.seat[b] || 0))}</div>
  ${queueCard()}
  ${card("Hospodaření dvora", `<div class="kv"><span>Kapacita sýpek</span><span>${fmt(cap_)} obilí (nad ni 30 % zplesniví)</span><span>Kažení zásob</span><span>${r1((0.03 - S.seat.sypka * 0.008) * 100)} % za období</span><span>Spotřeba dvora</span><span>${4 + S.children.length} obilí, 1 víno, ½ sukna za období</span><span>Údržba sídla</span><span>${fmt(expenseBreakdown(S).sidlo)} zl za období</span><span>Obrana sídla</span><span>úroveň opevnění ${r1(fortLevel(S, S.provinces[S.capital]))}</span><span>Učenost ze sídla</span><span>${S.seat.knihovna * 2 + S.seat.univerzita * 5} bodů</span></div>`)}</div>`;
}

// ---------- Území ----------
function tUzemi() {
  const ps = myProvs(S); if (!ps.some(p => p.id === SEL.prov)) SEL.prov = ps[0] && ps[0].id;
  const rows = ps.map(p => { const pr = provProduction(S, p, 2); const yr = sum([0, 1, 2, 3].map(se => provProduction(S, p, se).out.obili || 0)); const need = p.pop / 1000 * 8 * 4;
    return `<tr class="${p.id === SEL.prov ? "sel" : ""}"><td>${btn(esc(p.n), "prov", [p.id])}${p.id === S.capital ? " ♛" : ""}</td><td>${TERRAIN[p.terrain].n}</td>${tdn(fmt(p.pop))}${tdn(fmt(p.prosp), cls(p.prosp, 30, 60))}${tdn(fmt(p.unrest), p.unrest > 60 ? "bad" : p.unrest > 35 ? "warn" : "")}${tdn(fmt(yr) + " / " + fmt(need), yr < need ? "bad" : "good")}<td>${p.res.map(r => GOODS[r].n).join(", ") || "—"}</td><td class="small">${Object.entries(p.b).filter(([, l]) => l).map(([b, l]) => PBUILD[b].n + " " + l).join(", ") || "—"}</td><td>${p.occ ? '<span class="bad">obsazeno</span>' : p.siege ? `<span class="warn">obléháno ${fmt(p.siege.prog)} %</span>` : p.hunger ? '<span class="bad">hlad</span>' : p.levy ? '<span class="warn">hotovost</span>' : "klid"}</td></tr>`; });
  const p = S.provinces[SEL.prov]; let det = "";
  if (p) {
    const pr = provProduction(S, p); const ut = unrestTarget(S, p), pt = prospTarget(S, p);
    det = `<div class="card" style="grid-column:1/-1"><h3>${esc(p.n)} – stavby</h3>${tbl(["Budova", "Účinek", "#Úroveň", "Cena", "Doba", ""], buildRows(p.id, PBUILD, b => p.b[b] || 0))}</div>
    ${card("Výroba v tomto období", tbl(["Zboží", "#Vyrobí", "#Spotřebuje"], Object.keys(Object.assign({}, pr.out, pr.use)).map(g => tr([GOODS[g].n, r1(pr.out[g] || 0), r1(pr.use[g] || 0)]))) + `<p class="small muted">Obilí: násobek ${r1(grainMult(S, p))} (mlýny, objevy), úrodnost ${TERRAIN[p.terrain].fert}. Sklizeň je hlavně v létě a na podzim.</p>`)}
    ${card(`Nepokoje: ${fmt(p.unrest)} → ${ut.val}`, tbl(["Vliv", "#Hodnota"], ut.rows.map(r => tr([r[0], `<td class="n ${r[1] > 0 ? "bad" : "good"}">${sg(r[1])}</td>`]))))}
    ${card(`Prosperita: ${fmt(p.prosp)} → ${pt.val}`, tbl(["Vliv", "#Hodnota"], pt.rows.map(r => tr([r[0], `<td class="n ${r[1] < 0 ? "bad" : "good"}">${sg(r[1])}</td>`]))))}`;
  }
  const foreign = Object.values(S.provinces).filter(x => x.owner !== "hrac").map(x => tr([esc(x.n), provOwner(x), TERRAIN[x.terrain].n, fmt(x.pop), x.res.map(r => GOODS[r].n).join(", ") || "—", x.nb.filter(n => S.provinces[n].owner === "hrac").length ? '<span class="warn">sousedí s tebou</span>' : "", x.occ === "hrac" ? '<span class="good">obsadili jsme</span>' : x.siege && x.siege.by === "hrac" ? `obléháme ${fmt(x.siege.prog)} %` : ""]));
  return `<div class="grid"><div class="card" style="grid-column:1/-1"><h3>Tvé provincie</h3>${tbl(["Provincie", "Terén", "#Obyvatel", "#Prosperita", "#Nepokoje", "#Obilí za rok / spotřeba", "Suroviny", "Stavby", "Stav"], rows)}</div>${det}${queueCard()}
  <div class="card" style="grid-column:1/-1"><h3>Cizí provincie</h3>${tbl(["Provincie", "Pán", "Terén", "#Obyvatel", "Suroviny", "Hranice", "Válka"], foreign)}</div></div>`;
}

// ---------- Hospodářství ----------
const INC_N = { sedlaci: "Daně sedláků (berně z lánů)", mestane: "Daně měst a cechů", duchovni: "Desátek a církevní dávky", slechta: "Štítné od šlechty", myto: "Mýto z cest", domeny: "Výnos panských dvorů", cesty: "Obchodní cesty", mince: "Zisk z ražby mince" };
const EXP_N = { vojsko: "Žold a výstroj vojska", rada: "Platy rádců", dvur: "Dvůr a rodina", sidlo: "Údržba sídla", uroky: "Úroky z dluhů" };
function tHosp() {
  const inc = incomeBreakdown(S), ex = expenseBreakdown(S), ti = sum(Object.values(inc)), te = sum(Object.values(ex)), need = grainNeed(S);
  const L = S.last || {};
  const lastInc = L.inc ? `<p class="small muted">Minulé období: příjem ${fmt(L.income)}, výdaje ${fmt(L.expense)}.</p>` : "";
  return `<div class="grid">
  ${card("Příjmy za období (odhad)", tbl(["Zdroj", "#Zlatých"], Object.entries(inc).map(([k, v]) => tr([INC_N[k], r1(v)]))) + `<p><b>Celkem ${fmt(ti)} zl</b> · výběrčí účinnost ${Math.round(efficiency(S) * 100)} %</p>` + lastInc)}
  ${card("Výdaje za období", tbl(["Položka", "#Zlatých"], Object.entries(ex).map(([k, v]) => tr([EXP_N[k], r1(v)]))) + `<p><b>Celkem ${fmt(te)} zl</b> · bilance <b class="${ti - te < 0 ? "bad" : "good"}">${sg(ti - te)}</b></p>`)}
  ${card("Daně podle stavů", tbl(["Stav", "Sazba", "#Věrnost", "Dopad"], ESTATE_IDS.map(e => tr([ESTATES[e].n, `<select data-a="tax" data-x='["${e}"]'>${TAX_LEVELS.map((t, i) => `<option value="${i}" ${S.tax[e] === i ? "selected" : ""}>${t}</option>`).join("")}</select>`, `<td class="n ${cls(S.estates[e].loy, 30, 60)}">${fmt(S.estates[e].loy)}</td>`, `<span class="small">věrnost ${sg(TAX_LOY[S.tax[e]])}${e === "sedlaci" ? `, nepokoje +${S.tax.sedlaci * 6}, prosperita −${S.tax.sedlaci * 5}` : ""}</span>`]))))}
  ${card("Bilance obilí", tbl(["Položka", "#Za období"], [tr(["Spotřeba lidu", r1(need.lid)]), tr(["Spotřeba vojska", r1(need.vojsko)]), tr(["Spotřeba dvora", r1(need.dvur)]), tr(["Letošní sklizeň (toto období)", provProductionAll(S)]), tr(["Zásoba", S.stock.obili]), tr(["Kapacita sýpek", grainCap(S)])]) + `<p class="small muted">Podíl roční sklizně: jaro ${SEASON_GRAIN[0]}, léto ${SEASON_GRAIN[1]}, podzim ${SEASON_GRAIN[2]}, zima 0. Na zimu je třeba mít zásoby.</p>`)}
  ${card("Dluhy a lichváři", tbl(["#Jistina", "#Úrok / obd.", "Od", ""], S.debts.map((d, i) => tr([d.amount, r1(d.amount * d.rate) + ` (${r1(d.rate * 100)} %)`, `období ${d.from}`, btn("Splatit", "repay", [i], S.money < d.amount ? "Nedostatek zlata" : null)]))) + `<div class="row">Půjčit: <input type="number" id="loanN" value="100" min="50" step="50"> ${btn("Vzít půjčku", "borrow", ["#loanN"])} <span class="small muted">úrok ${r1(loanRate(S) * 100)} % za období, strop ${fmt(maxLoan(S))} zl</span></div>`)}
  ${card("Výroba minulého období", tbl(["Zboží", "#Vyrobeno", "#Spotřebováno", "#Sklad"], GOOD_IDS.map(g => tr([GOODS[g].n, r1((L.prod || {})[g] || 0), r1((L.use || {})[g] || 0), Math.floor(S.stock[g])]))))}
  </div>`;
}

// ---------- Trh ----------
function tTrh() {
  const rows = GOOD_IDS.map(g => { const G = GOODS[g], m = S.market[g];
    return tr([G.n + (G.exotic ? ' <span class="tag">exotické</span>' : ""), Math.floor(S.stock[g]), `<td class="n">${r1(buyPrice(S, g))}</td>`, `<td class="n">${r1(sellPrice(S, g))}</td>`, `<td class="n ${m > 1.1 ? "good" : m < 0.9 ? "bad" : ""}">${m > 1.1 ? "▲ drahé" : m < 0.9 ? "▼ levné" : "• běžné"}</td>`,
      `<input type="number" id="q_${g}" value="10" min="1"> ${btn("Koupit", "buy", [g, "#q_" + g], G.exotic ? "Jen z obchodních cest" : null)} ${btn("Prodat", "sell", [g, "#q_" + g], S.stock[g] < 1 ? "Nemáš" : null)} ${btn("Prodat vše", "sell", [g, Math.floor(S.stock[g])], S.stock[g] < 1 ? "Nemáš" : null)}`]); });
  const routes = S.routes.map(r => tr([esc(r.n), r.exotic ? "dálková" : "sousedská", r.good ? GOODS[r.good].n + " +1/obd." : "—", r1(routeIncome(S, r))]));
  return `<div class="grid"><div class="card" style="grid-column:1/-1"><h3>Tržiště (ceny v zlatých za kus)</h3>${tbl(["Zboží", "#Sklad", "#Nákup", "#Prodej", "#Trh", "Obchod"], rows)}<p class="small muted">Ceny se řídí zásobou (čím víc máš, tím levněji prodáš), náhodnými výkyvy trhu a inflací (${r1(S.inflation * 100)} %). Velké obchody hýbou cenou.</p></div>
  ${card(`Obchodní cesty (${S.routes.length}/${routeLimit(S)})`, tbl(["Cesta", "Druh", "Dovoz", "#Zisk / obd."], routes) + '<p class="small muted">Sousedské cesty vznikají obchodní smlouvou (Diplomacie), dálkové výpravami (Objevy). Počet cest zvyšují tržiště, přístav a koga.</p>')}</div>`;
}

// ---------- Vojsko ----------
function provSelect(id, aid) {
  const a = S.armies.find(x => x.id === aid);
  const ok = Object.values(S.provinces).filter(p => canEnter(S, p.id)).sort((x, y) => (x.owner === "hrac" ? 0 : 1) - (y.owner === "hrac" ? 0 : 1));
  return `<select data-a="move" data-x='["${aid}"]'><option value="${a.loc}">— zůstat —</option>${ok.filter(p => p.id !== a.loc).map(p => `<option value="${p.id}" ${a.order && a.order.to === p.id ? "selected" : ""}>${esc(p.n)} (${p.owner === "hrac" ? "tvá" : esc(S.rivals[p.owner].n)})</option>`).join("")}</select>`;
}
function tVojsko() {
  if (!S.armies.some(a => a.id === SEL.army)) SEL.army = S.armies[0] && S.armies[0].id;
  const up = armyUpkeep(S, totalUnits(S));
  const armies = S.armies.map(a => {
    const p = S.provinces[a.loc], pow = playerArmyPower(S, a, true), au = armyUpkeep(S, a.units);
    const others = S.armies.filter(x => x !== a && x.loc === a.loc);
    const urows = UNIT_IDS.filter(u => a.units[u]).map(u => tr([UNITS[u].n, a.units[u], r1(UNITS[u].up * a.units[u]), `<input type="number" id="d_${a.id}_${u}" value="1" min="1" max="${a.units[u]}"> ${btn("Rozpustit", "disband", [a.id, u, "#d_" + a.id + "_" + u])} ${btn("Oddělit", "split", [a.id, u, "#d_" + a.id + "_" + u])}${others.map(o => btn("→ " + esc(o.name), "split_to", [a.id, o.id, u, "#d_" + a.id + "_" + u])).join("")}`]));
    return `<div class="card"><h3>${esc(a.name)} ${a.id === SEL.army ? "✔" : btn("vybrat pro nábor", "army", [a.id])}</h3>
      <div class="kv"><span>Poloha</span><span>${esc(p.n)} (${provOwner(p)})${a.order ? ` → ${esc(S.provinces[a.order.to].n)} (${a.order.path.length} obd.)` : ""}</span><span>Morálka</span><span class="${cls(a.morale * 100, 70, 105)}">${r1(a.morale)}</span><span>Síla (obrana)</span><span>${fmt(pow)}</span><span>Žold / obilí</span><span>${r1(au.money)} zl, ${r1(au.grain)} obilí</span>
      <span>Velitel</span><span><select data-a="cmd" data-x='["${a.id}"]'><option value="">kapitán (slabý)</option><option value="ruler" ${a.commander === "ruler" ? "selected" : ""}>panovník (válečnictví ${stat(ch(S, S.ruler), "mil")})</option><option value="marsal" ${a.commander === "marsal" ? "selected" : ""}>maršálek (${cstat(S, "marsal")})</option></select></span>
      <span>Rozkaz</span><span>${provSelect("mv_" + a.id, a.id)}</span></div>
      ${tbl(["Jednotka", "#Setnin", "#Žold", ""], urows)}
      <div class="row">${others.map(o => btn("Sloučit s " + esc(o.name), "merge", [a.id, o.id])).join("")} <input id="rn_${a.id}" value="${esc(a.name)}" size="14"> ${btn("Přejmenovat", "rename", [a.id, "#rn_" + a.id])}</div></div>`;
  }).join("");
  const sa = S.armies.find(x => x.id === SEL.army);
  const rec = UNIT_IDS.filter(u => u !== "hotovost").map(u => { const U = UNITS[u]; return tr([U.n + (U.d ? `<div class="small muted">${U.d}</div>` : ""), U.atk, U.def, tdn(U.mor), Math.round(U.cost * S.inflation), U.up, Object.entries(U.goods || {}).map(([g, q]) => q + "× " + GOODS[g].n).join(", ") || "—", U.tech ? (has(S, U.tech) ? '<span class="good">' + TECHS[U.tech].n + "</span>" : '<span class="bad">' + TECHS[U.tech].n + "</span>") : "—",
    sa ? `<input type="number" id="r_${u}" value="1" min="1"> ${btn("Naverbovat", "recruit", [u, "#r_" + u, sa.id], canRecruit(S, u, 1, sa.id))}` : ""]); });
  return `<div class="grid">${armies}
  <div class="card" style="grid-column:1/-1"><h3>Nábor${sa ? " do: " + esc(sa.name) : ""}</h3>${tbl(["Jednotka", "#Útok", "#Obrana", "#Kázeň", "#Cena", "#Žold", "Zboží", "Objev", ""], rec)}
  <div class="row">${btn("Povolat selskou hotovost", "levy")} <span class="small muted">Asi ${fmt(sum(myProvs(S).filter(p => !p.levy).map(p => Math.max(1, Math.round(p.pop / 1000 * levyMult(S))))))} setnin (podle zákona o branné povinnosti). Odvedení mužové chybí na polích: nižší sklizeň a daně. Rozpuštěním hotovosti se vrátí domů.</span></div>
  <p class="small">Celkem ${unitCount(totalUnits(S))} setnin, žold ${fmt(up.money)} zl a ${fmt(up.grain)} obilí za období.</p></div></div>`;
}
ACT.split_to = (a, b, u, n) => moveUnits(S, a, b, u, n);

// ---------- Válka ----------
function tValka() {
  const wars = S.wars.map(w => { const r = S.rivals[w.enemy], po = peaceOptions(S, w.enemy);
    return card(`Válka s ${esc(r.n)}`, `<div class="kv"><span>Stav války</span><span class="${po.score >= 0 ? "good" : "bad"}"><b>${po.score}</b> (−100 až +100)</span><span>Od</span><span>období ${w.start}</span><span>Nepřátelské vojsko</span><span>${rivalEstimate(S, r).txt}, u ${esc(S.provinces[r.loc] ? S.provinces[r.loc].n : "?")}, morálka ${r1(r.morale)}</span><span>Vyčerpání nepřítele</span><span>${fmt(r.exhaustion)}</span><span>Spojenci</span><span>${w.allies.map(a => esc(S.rivals[a].n)).join(", ") || "—"}</span><span>Nárok</span><span>${w.just ? "spravedlivá válka" : "bez nároku"}</span></div>
      <h4>Mírová jednání</h4>${po.opts.map(o => `<div>${btn(esc(o.n), "peace", [w.enemy, o.t, o.pid || null], o.ok ? null : "Soupeř by nepřijal")}</div>`).join("")}`); }).join("");
  const sieges = Object.values(S.provinces).filter(p => p.siege || p.occ).map(p => tr([esc(p.n), provOwner(p), p.occ ? (p.occ === "hrac" ? '<span class="good">obsadili jsme</span>' : `<span class="bad">obsazeno: ${esc(S.rivals[p.occ].n)}</span>`) : "", p.siege ? `${p.siege.by === "hrac" ? "obléháme" : "obléhá " + esc(S.rivals[p.siege.by].n)} – ${fmt(p.siege.prog)} %` : "", r1(fortLevel(S, p))]));
  const bat = (S.battles || []).map(b => tr([b.d, esc(b.place), esc(b.enemy), b.win ? '<span class="good">vítězství</span>' : '<span class="bad">porážka</span>', `<td class="n">${b.pA} : ${b.pB}</td>`, `<span class="small">${esc(b.myLost)}</span>`, `<span class="small">${esc(b.enLost)}</span>`, `<td class="n">${sg(b.score)}</td>`]));
  return `<div class="grid">${wars || card("Mír", "<p>Nevedeš žádnou válku. Válku vyhlásíš v záložce Diplomacie. Bez nároku je válka nespravedlivá – ztratíš prestiž, zbožnost a přízeň krále.</p>")}
  ${card("Obléhání a okupace", tbl(["Provincie", "Pán", "Okupace", "Obléhání", "#Opevnění"], sieges) + '<p class="small muted">Vojsko v nepřátelské provincii bez obránců ji obléhá. Rychlost zvyšují obléhací stroje a počet mužů, snižuje hrádek a hradby. Každá obsazená provincie dává 12 bodů stavu války.</p>')}
  <div class="card" style="grid-column:1/-1"><h3>Bitvy</h3>${tbl(["Kdy", "Kde", "Nepřítel", "Výsledek", "#Síla", "Naše ztráty", "Jejich ztráty", "#Stav války"], bat)}</div></div>`;
}

// ---------- Stavy a zákony ----------
function tPolitika() {
  const est = ESTATE_IDS.map(e => { const E = S.estates[e], t = estateTarget(S, e);
    return `<tr><td><b>${ESTATES[e].n}</b></td><td class="n ${cls(E.loy, 30, 60)}">${fmt(E.loy)}</td><td>${bar(E.loy)}</td><td class="n">${t.val}</td><td class="n">${E.infl}</td><td>${bar(E.infl, true)}</td><td><details><summary>rozpis</summary>${tbl(["Vliv", "#"], t.rows.map(r => tr([esc(r[0]), `<td class="n ${r[1] < 0 ? "bad" : "good"}">${sg(r[1])}</td>`])))}</details></td></tr>`; });
  const laws = Object.entries(LAWS).map(([l, L]) => tr([`<b>${L.n}</b><div class="small muted">${L.d}</div>`, `<select data-a="law" data-x='["${l}"]' ${(S.lawCd[l] || 0) > S.turn ? "disabled" : ""}>${L.opts.map((o, i) => `<option value="${i}" ${S.laws[l] === i ? "selected" : ""}>${o}</option>`).join("")}</select>`, `<span class="small">${ESTATE_IDS.map(e => { const v = LAW_EST[l][S.laws[l]][e]; return v ? ESTATES[e].n + " " + sg(v) : ""; }).filter(Boolean).join(", ") || "—"}</span>`, (S.lawCd[l] || 0) > S.turn ? `${S.lawCd[l] - S.turn} obd.` : "lze měnit"]));
  return `<div class="grid"><div class="card" style="grid-column:1/-1"><h3>Stavy země</h3><table><thead><tr><th>Stav</th><th class="n">Věrnost</th><th></th><th class="n">Směřuje k</th><th class="n">Vliv</th><th></th><th>Proč</th></tr></thead><tbody>${est.join("")}</tbody></table>
  <p class="small muted">Věrnost se každé období posune o pětinu k cílové hodnotě. Stav s věrností pod 25 a velkým vlivem může vyvolat krizi: šlechtickou vzpouru, interdikt, stávku měst nebo útěky sedláků. Daně nastavíš v Hospodářství.</p></div>
  <div class="card" style="grid-column:1/-1"><h3>Zákony</h3>${tbl(["Zákon", "Platí", "Vliv na stavy (nyní)", "Změna"], laws)}<p class="small muted">Změna zákona stojí ${lawChangeCost(S) / 2} legitimity a ${Math.round(lawChangeCost(S) / 3)} prestiže a další změna je možná až za 8 období.</p></div>
  ${card("Lenní pán", `<div class="kv"><span>Král</span><span>${esc(cap(S.liege.n))}</span><span>Přízeň</span><span class="${cls(S.liege.opinion, 25, 60)}">${fmt(S.liege.opinion)}</span></div><p class="small">Každý podzim král žádá berni. Nízká přízeň vede k trestné výpravě, vysoká k darům a povýšení. Válka bez nároku a odmítání služby přízeň snižují.</p>`)}</div>`;
}

// ---------- Rod a rada ----------
const statCells = c => ["dip", "mil", "spr", "uce", "int"].map(k => `<td class="n">${stat(c, k)}</td>`).join("");
const traitTxt = c => c.traits.map(t => TRAITS[t] ? TRAITS[t].n : t).join(", ") || "—";
function tDvur() {
  const R = ch(S, S.ruler), sp = ch(S, S.spouse), H = heirOf(S);
  const fam = [[R, "panovník"], [sp, "choť"]].filter(x => x[0]).map(([c, role]) => tr([`<b>${esc(c.name)}</b>`, role, c.age, `<td class="n ${cls(c.health, 35, 70)}">${fmt(c.health)}</td>`, statCells(c), traitTxt(c), ""]));
  const kids = S.children.map(id => ch(S, id)).filter(Boolean).map(c => tr([esc(c.name) + (H && H.id === c.id ? " ♛" : ""), c.sex === "m" ? "syn" : "dcera", c.age, `<td class="n">${fmt(c.health)}</td>`, statCells(c), traitTxt(c),
    (c.married ? `oddán(a): ${esc(c.spouseName)}` : "") + (c.age < 16 ? ` <select data-a="focus" data-x='["${c.id}"]'><option value="">výchova: volná</option>${[["dip", "diplomacie"], ["mil", "válečnictví"], ["spr", "správa"], ["uce", "učenost"], ["int", "intriky"]].map(([k, n]) => `<option value="${k}" ${c.focus === k ? "selected" : ""}>${n}</option>`).join("")}</select>` : "")]));
  const council = COUNCIL_IDS.map(k => { const c = councillor(S, k); return tr([`<b>${COUNCIL[k].n}</b><div class="small muted">${COUNCIL[k].d}</div>`, c ? esc(c.name) : '<span class="bad">neobsazeno</span>', c ? `<td class="n">${stat(c, COUNCIL[k].stat)}</td>` : "", c ? `<td class="n ${cls(c.loyalty, 30, 70)}">${fmt(c.loyalty)}</td>` : "", c ? ESTATES[c.estate] ? ESTATES[c.estate].n : c.estate : "", c ? salary(c) : "", c ? btn("Odvolat", "dismiss", [k]) : ""]); });
  const court = S.courtiers.map(id => ch(S, id)).filter(Boolean).map(c => tr([esc(c.name), c.age, ESTATES[c.estate] ? ESTATES[c.estate].n : c.estate, statCells(c), traitTxt(c), `<select data-a="appoint_sel" data-x='["${c.id}"]'><option value="">jmenovat…</option>${COUNCIL_IDS.map(k => `<option value="${k}">${COUNCIL[k].n}</option>`).join("")}</select>`]));
  return `<div class="grid"><div class="card" style="grid-column:1/-1"><h3>Rod ${esc(S.dynasty)}</h3>${tbl(["Jméno", "Role", "#Věk", "#Zdraví", "#Dipl.", "#Válka", "#Správa", "#Učen.", "#Intr.", "Vlastnosti", ""], fam.concat(kids))}
  <p class="small muted">Nástupnictví: ${LAWS.nastupnictvi.opts[S.laws.nastupnictvi]}. Dědic: ${H ? esc(H.name) : '<span class="bad">žádný</span>'}. Do 16 let lze potomkům určit výchovu. Sňatky potomků s rody sousedů dohodneš v Diplomacii.</p>
  ${S.dead.length ? `<details><summary>Zesnulí (${S.dead.length})</summary>${tbl(["Jméno", "Zemřel(a)", "#Věk"], S.dead.slice().reverse().map(d => tr([esc(d.n) + (d.ruler ? " ♛" : ""), d.d, d.age])))}</details>` : ""}</div>
  <div class="card" style="grid-column:1/-1"><h3>Královská rada</h3>${tbl(["Úřad", "Držitel", "#Schopnost", "#Věrnost", "Stav", "#Plat", ""], council)}<p class="small muted">Rádce ze stavu zvyšuje věrnost toho stavu (+6). Odvolání rádce jeho stav rozladí.</p></div>
  <div class="card" style="grid-column:1/-1"><h3>Dvořané</h3>${tbl(["Jméno", "#Věk", "Stav", "#Dipl.", "#Válka", "#Správa", "#Učen.", "#Intr.", "Vlastnosti", ""], court)}<p class="small muted">Nové dvořany pozveš činem panovníka „Pozvat nové dvořany“.</p></div></div>`;
}
ACT.appoint_sel = (cid, seat) => (seat ? appoint(S, seat, cid) : null);

// ---------- Diplomacie ----------
function tDiplo() {
  const rows = aliveRivals(S).map(r => { const R = ch(S, r.ruler), est = rivalEstimate(S, r), w = atWarWith(S, r.id);
    const flags = [r.alliance ? '<span class="good">spojenec</span>' : "", r.trade ? "obchod" : "", r.marriage ? "spřízněni sňatkem" : "", r.truce > S.turn ? `příměří ${r.truce - S.turn} obd.` : "", w ? '<span class="bad">VÁLKA</span>' : "", S.claims[r.id] ? '<span class="warn">máš nárok</span>' : "", borders(S, r.id) ? "soused" : ""].filter(Boolean).join(", ");
    return tr([`<b>${esc(r.n)}</b>`, `${esc(r.title)} ${esc(R.name)} (${R.age})<div class="small muted">${traitTxt(R)}</div>`, `<td class="n ${cls(r.attitude, -20, 30)}">${fmt(r.attitude)}</td>`, est.txt + (est.exact ? "" : " ?"), `<td class="n">${est.exact ? fmt(r.treasury) : "?"}</td>`, rivalProvs(S, r.id).length, flags,
      `<select id="dp_${r.id}">${Object.entries(DIP).map(([k, d]) => `<option value="${k}">${d.n}</option>`).join("")}</select> ${btn("Provést", "dip", [r.id, "#dp_" + r.id], r.lastDip === S.turn ? null : null)}`]); });
  const kids = unmarriedChildren(S);
  return `<div class="grid"><div class="card" style="grid-column:1/-1"><h3>Sousední mocnosti</h3>${tbl(["Země", "Vládce", "#Vztah", "Vojsko", "#Pokladna", "#Provincie", "Vztahy", "Jednání"], rows)}
  <p class="small muted">Každé zemi lze poslat jedno poselstvo za období (zvědové a intriky mimo tento limit). Úspěch závisí na diplomacii panovníka a kancléře, intriky na mistru šeptů. ${kids.length ? "Sňatek: nejstarší svobodný potomek je " + esc(kids[0].name) + "." : "Pro sňatek potřebuješ svobodného potomka starého aspoň 10 let."}</p></div>
  ${card("Zprávy ze světa", S.log.filter(l => l.cat === "svet" || l.cat === "diplomacie" || l.cat === "intriky").slice(0, 15).map(l => `<div class="small"><span class="tag">${SEASONS[l.se]} ${l.y}</span>${esc(l.txt)}</div>`).join("") || '<span class="muted">Zatím nic.</span>')}</div>`;
}

// ---------- Objevy ----------
function tObjevy() {
  const cur = S.research.cur, rate = researchRate(S);
  const cats = [...new Set(TECH_IDS.map(t => TECHS[t].cat))];
  const tabs = cats.map(c => card(c, tbl(["Objev", "Účinek", "#Cena", "Předpoklady", ""], TECH_IDS.filter(t => TECHS[t].cat === c).map(t => { const T = TECHS[t];
    return tr([S.techs[t] ? `<span class="good">✔ ${T.n}</span>` : cur === t ? `<b>▶ ${T.n}</b>` : T.n, `<span class="small">${T.d}</span>`, T.cost, (T.req || []).map(r => (S.techs[r] ? '<span class="good">' : '<span class="bad">') + TECHS[r].n + "</span>").join(", ") || "—", S.techs[t] ? "" : cur === t ? `${fmt(S.research.pts)}/${T.cost}` : btn("Zkoumat", "research", [t], techAvailable(S, t) ? null : "Chybí předpoklady")]); })))).join("");
  const ex = Object.entries(EXPEDITIONS).map(([id, E]) => { const on = S.expeditions.find(x => x.id === id);
    return tr([E.n, `<span class="small">${E.d}</span>`, E.cost, E.time + " obd.", Math.round((E.chance + (has(S, "portolan") ? 0.2 : 0)) * 100) + " %", (E.req || []).map(r => (S.techs[r] ? '<span class="good">' : '<span class="bad">') + TECHS[r].n + "</span>").join(", ") || "—", on ? `<span class="warn">na cestě (${on.left})</span>` : S.expDone[id] && id !== "knihy" && id !== "hory" ? '<span class="good">probádáno</span>' : btn("Vyslat", "exped", [id])]); });
  return `<div class="grid">${card("Učenost", `<div class="kv"><span>Zkoumá se</span><span>${cur ? TECHS[cur].n + ` – ${fmt(S.research.pts)}/${TECHS[cur].cost}` : '<span class="bad">nic</span>'}</span><span>Přírůstek</span><span>${rate} bodů za období</span><span>Zdroje</span><span class="small">panovník (učenost), kaplan, knihovna, kostely, univerzita, knihtisk</span><span>Objeveno</span><span>${Object.keys(S.techs).length} z ${TECH_IDS.length}</span></div>`)}
  ${tabs}<div class="card" style="grid-column:1/-1"><h3>Výpravy do neznáma</h3>${tbl(["Kraj", "Co přinese", "#Cena", "Doba", "Šance", "Potřeba", ""], ex)}<p class="small muted">Námořní výpravy potřebují přístav.</p></div></div>`;
}

// ---------- Kronika ----------
const LOGCATS = { "": "vše", rod: "rod", politika: "politika", hospodarstvi: "hospodářství", obchod: "obchod", stavby: "stavby", vojsko: "vojsko", valka: "válka", diplomacie: "diplomacie", intriky: "intriky", objevy: "objevy", udalosti: "události", panovnik: "činy", svet: "svět" };
function tKronika() {
  const l = S.log.filter(x => !SEL.logCat || x.cat === SEL.logCat).slice(0, 300);
  return `<div class="card"><h3>Kronika rodu ${esc(S.dynasty)}</h3><div class="row">${Object.entries(LOGCATS).map(([k, n]) => btn(SEL.logCat === k ? `<b>${n}</b>` : n, "logcat", [k])).join("")}</div>
  <div class="log">${l.map(x => `<div><span class="tag">${SEASONS[x.se]} ${x.y}</span><span class="tag">${LOGCATS[x.cat] || x.cat}</span>${esc(x.txt)}</div>`).join("")}</div></div>`;
}

// ---------- Hra ----------
function tHra() {
  const slots = [1, 2, 3, 4, 5].map(n => { const i = slotInfo(n); return tr([n, i ? esc(i) : '<span class="muted">prázdná</span>', btn("Uložit", "save", [n]) + btn("Načíst", "load", [n], i ? null : "Prázdná") + btn("Smazat", "del", [n], i ? null : "Prázdná")]); });
  return `<div class="grid">${card("Uložené hry", tbl(["#", "Obsah", ""], slots) + `<p class="small muted">Hra se po každém kroku sama ukládá v prohlížeči.</p><div class="row">${btn("Stáhnout uloženou hru (soubor)", "exportSave")} ${btn("Nahrát ze souboru", "importSave")}</div>`)}
  ${card("Nová hra", `<div class="kv"><span>Panství</span><input id="ngRealm" value="Panství Vranovské"><span>Panovník</span><input id="ngRuler" value="Bořivoj"><span>Rod</span><input id="ngDyn" value="Vranovští"><span>Semínko náhody</span><input id="ngSeed" type="number" placeholder="náhodné"></div><div class="row">${btn("Začít novou hru", "newgame")}</div>`)}
  ${card("Vzhled", btn("Přepnout světlý / tmavý vzhled", "theme"))}
  <div class="card help" style="grid-column:1/-1"><h3>Jak hrát</h3>
  <p>Vládneš feudálnímu panství v letech ${START_YEAR}–${END_YEAR}. Každé kolo je jedno roční období. Rozhodni, co chceš, a stiskni <b>Konec období</b>. Cílem je stát se králem (hraběte, vévody a nakonec koruny dosáhneš v Přehledu) nebo přečkat sto let s co nejvyšším skóre.</p>
  <h4>Hospodářství</h4><p>Obilí se sklízí hlavně v létě a na podzim, jí se po celý rok. Hlad snižuje počet obyvatel, morálku a zvedá nepokoje. Peníze plynou z daní stavů, mýta, obchodu a panských dvorů. Stavby stojí zlato, dřevo a kámen – co chybí, nakup na trhu. Přebytky (železo, víno, sůl, sukno) prodávej.</p>
  <h4>Stavy a zákony</h4><p>Šlechta, duchovenstvo, měšťané a sedláci mají věrnost a vliv. Vysoké daně a tvrdé zákony dávají peníze, ale věrnost klesá. Nevěrný a vlivný stav vyvolá krizi. Rádci ze stavu jej uklidňují.</p>
  <h4>Válka</h4><p>Vyhlas válku sousedovi (nejlépe s nárokem od kancléře), přesuň vojsko do jeho provincie a obléhej. Bitvy se odehrají, když se vojska potkají. Stav války roste vítězstvími a obsazenými provinciemi; podle něj si diktuješ mír – odškodné, provincie, nebo podrobení celé země.</p>
  <h4>Rod</h4><p>Panovník stárne a umírá. Zajisti si choť a dědice, vychovávej potomky a žeň je s rody sousedů – sňatky zlepšují vztahy. Když rod vymře, hra končí.</p>
  <h4>Objevy</h4><p>Učenost z kaplana, knihovny a kostelů odemyká zemědělské, řemeslné, správní a válečné objevy. Výpravy do neznáma přinášejí ložiska, dálkový obchod a slávu.</p></div></div>`;
}

// ---------- start ----------
function boot() {
  try { const t = localStorage.getItem("panovnik_theme"); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
  try { const t = localStorage.getItem("panovnik_auto"); if (t) S = JSON.parse(t); } catch (e) { S = null; }
  if (!S || !S.provinces) S = newGame();
  const f = document.createElement("input"); f.type = "file"; f.id = "impFile"; f.accept = ".json,application/json"; f.style.display = "none"; f.onchange = () => f.files[0] && importFile(f.files[0]); document.body.appendChild(f);
  render();
}
if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", boot);
