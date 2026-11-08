// Rozhraní: záložky s tabulkami, mapa, rozkazy, události, ukládání.
const SCEN_CACHE = {};
let S = null, TAB = "prehled", SEL = { prov: null, logF: "moje", cmd: {}, sortOff: "rank", provF: "moje", ng: "premysl" };
const $ = q => document.querySelector(q);
const esc = t => String(t == null ? "" : t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = n => (Math.round(n) || 0).toLocaleString("cs-CZ");
const sg = n => (n > 0 ? "+" : "") + fmt(n);
const cls = (v, lo, hi) => (v < lo ? "bad" : v > hi ? "good" : "");
const bar = (v, max = 100, inv) => { const f = clamp(v / max * 100, 0, 100); return `<span class="bar ${inv ? (f > 60 ? "red" : "") : (f < 25 ? "red" : f < 45 ? "yel" : "")}"><i style="width:${f}%"></i></span>`; };
function btn(label, a, args = [], err = null, cl = "") { return `<button class="b ${cl}" data-a="${a}" data-x="${esc(JSON.stringify(args))}"${err ? ` disabled title="${esc(err)}"` : ""}>${label}</button>`; }
const tbl = (head, rows, cl = "") => `<div class="tw"><table class="${cl}"><thead><tr>${head.map(h => (h.startsWith("#") ? `<th class="n">${h.slice(1)}</th>` : `<th>${h}</th>`)).join("")}</tr></thead><tbody>${rows.join("") || `<tr><td colspan="${head.length}" class="muted">—</td></tr>`}</tbody></table></div>`;
const tr = (cells, cl = "") => `<tr class="${cl}">` + cells.map(c => (typeof c === "number" ? `<td class="n">${fmt(c)}</td>` : String(c).startsWith("<td") ? c : `<td>${c}</td>`)).join("") + "</tr>";
const tdn = (v, c = "") => `<td class="n ${c}">${v}</td>`;
const card = (t, body, cl = "") => `<section class="card ${cl}"><h3>${t}</h3>${body}</section>`;
const sel = (id, opts, cur, attrs = "") => `<select id="${id}" ${attrs}>${opts.map(([v, n]) => `<option value="${esc(v)}" ${String(v) === String(cur) ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>`;
const chip = (cid, txt) => `<span class="chip">${S.clans[cid] ? shield(cid, 12) : ""}${esc(txt || (S.clans[cid] ? S.clans[cid].house.split(" (")[0] + (S.clans[cid].house.includes("(") ? " " + S.clans[cid].house.slice(S.clans[cid].house.indexOf("(")) : "") : cid))}</span>`;
function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), 3200); }
const statsTd = c => STAT_IDS.map(k => statBar(st(c, k))).join("");
const traitsTxt = c => (c.traits || []).map(t => TRAITS[t] ? TRAITS[t].n : t).join(", ");
const me = () => S.player;

// ---------- akce ----------
const ACT = {
  tab: t => { TAB = t; }, selOff: id => { SEL.off = id; }, selDip: id => { SEL.dip = id; }, prov: id => { SEL.prov = id; if (S.provs[id].owner === me() && TAB === "mapa") TAB = "kraj"; }, provOnly: id => { SEL.prov = id; },
  cmdSel: (oid, v) => { SEL.cmd[oid] = v; },
  cmd: oid => { const k = SEL.cmd[oid] || "zemedelstvi"; const a1 = $("#a1_" + oid), a2 = $("#a2_" + oid); return doCmd(S, me(), oid, k, a1 ? a1.value : undefined, a2 ? a2.value : undefined); },
  dispatch: pid => { const t = {}; for (const k of TROOP_IDS) t[k] = +($("#dt_" + k) || {}).value || 0; const cm = [1, 2, 3].map(i => ($("#dc" + i) || {}).value).filter(Boolean); return dispatch(S, me(), pid, $("#dto").value, t, cm, +$("#dmon").value, $("#dmode").value); },
  army: (aid, w) => orderArmy(S, me(), aid, w, w === "tahnout" ? $("#ato_" + aid).value : null),
  deleg: (pid, v) => setDeleg(S, me(), pid, v),
  promote: id => promote(S, me(), id), reward: id => reward(S, me(), id, +$("#rw_" + id).value), lord: (pid, id) => makeLord(S, me(), pid, id), dismiss: id => dismissOff(S, me(), id),
  captive: (id, a) => captiveAction(S, me(), id, a), focus: (id, f) => { const c = chr(S, id); if (c) c.focus = f || null; },
  tax: v => setTax(S, me(), v), law: (l, v) => setLaw(S, l, v), buy: g => tradeGoods(S, me(), g, +$("#q_" + g).value, true), sell: g => tradeGoods(S, me(), g, +$("#q_" + g).value, false),
  borrow: () => borrow(S, me(), +$("#loan").value), repay: i => repay(S, me(), i), research: t => setResearch(S, me(), t),
  dip: cid => { const o = $("#env_" + cid).value; if (!o) return "Vyber vyslance (vazal, který tento měsíc ještě nejednal)."; SEL.cmd[o] = "poselstvo"; return doCmd(S, me(), o, "poselstvo", cid, $("#dt_" + cid).value); },
  war: cid => { if (!SEL.warConfirm || SEL.warConfirm !== cid) { SEL.warConfirm = cid; return "Opravdu vyhlásit válku? Klikni znovu."; } SEL.warConfirm = null; return declareWar(S, me(), cid, null); },
  stand: () => standForElection(S, me()), bribe: e => bribeElector(S, me(), e, +$("#br_" + e).value), ban: () => imperialBan(S, me(), $("#banT").value), coronation: () => imperialCoronation(S, me()),
  crown: k => crown(S, me(), k), popeGift: () => popeGift(S, me()), penance: () => penance(S, me()),
  event: (i, c) => resolveEvent(S, i, c), end: () => endTurn(S), logF: f => { SEL.logF = f; }, sortOff: k => { SEL.sortOff = k; }, provF: f => { SEL.provF = f; },
  save: n => saveSlot(n), load: n => loadSlot(n), del: n => { try { localStorage.removeItem("panovnik2_slot_" + n); } catch (e) {} }, exportSave: () => exportSave(), importSave: () => $("#impFile").click(),
  ngClan: v => { SEL.ng = v; }, ngScen: v => { SEL.ngScen = +v; }, ngDiff: v => { SEL.ngDiff = +v; }, ngFog: v => { SEL.ngFog = !!v; },
  tac: (aid, v) => { const a = S.armies.find(x => x.id === aid && x.cl === me()); if (a) a.tac = v; }, manual: (aid, v) => { const a = S.armies.find(x => x.id === aid && x.cl === me()); if (a) a.manual = !!v; }, defTac: v => { P(S).defTac = v; },
  routes: () => { SEL.routes = !SEL.routes; },
  newgame: () => { if (!SEL.ngConfirm) { SEL.ngConfirm = true; return "Opravdu? Rozehraná hra se přepíše – klikni znovu."; } SEL.ngConfirm = false; S = newGame({ clan: SEL.ng, scen: SEL.ngScen || 1256, diff: SEL.ngDiff != null ? SEL.ngDiff : 1, fog: SEL.ngFog !== false, seed: $("#ngSeed").value ? +$("#ngSeed").value : undefined }); TERR.key = null; TAB = "prehled"; SEL.prov = P(S).capital; },
  theme: () => { const r = document.documentElement; const t = r.dataset.theme === "dark" ? "light" : r.dataset.theme === "light" ? "" : "dark"; if (t) r.dataset.theme = t; else delete r.dataset.theme; try { localStorage.setItem("panovnik_theme", t); } catch (e) {} },
};
document.addEventListener("click", ev => { if (window._noClick) return; const el = ev.target.closest("[data-a]"); if (!el || el.disabled || el.tagName === "SELECT" || el.tagName === "INPUT") return; run(el.dataset.a, JSON.parse(el.dataset.x || "[]")); });
document.addEventListener("change", ev => { const el = ev.target.closest("select[data-a], input[data-a]"); if (!el) return; const args = JSON.parse(el.dataset.x || "[]"); args.push(el.type === "checkbox" ? el.checked : el.value); run(el.dataset.a, args); });
document.addEventListener("keydown", ev => { if (ev.key === "Enter" && ev.ctrlKey) run("end", []); });
function run(a, args) {
  let err = null; try { err = ACT[a](...args); } catch (e) { console.error(e); err = "Chyba: " + e.message; }
  if (err) toast(err);
  if (a === "end" && !err) { toast(`${dateStr(S)}`); }
  autosave(); render();
}

// ---------- ukládání ----------
function autosave() { try { localStorage.setItem("panovnik2_auto", JSON.stringify(S)); } catch (e) {} }
function saveSlot(n) { try { localStorage.setItem("panovnik2_slot_" + n, JSON.stringify(S)); toast("Uloženo do pozice " + n + "."); } catch (e) { return "Uložení se nezdařilo."; } }
function loadSlot(n) { try { const t = localStorage.getItem("panovnik2_slot_" + n); if (!t) return "Pozice je prázdná."; S = JSON.parse(t); toast("Načteno."); } catch (e) { return "Načtení se nezdařilo."; } }
function slotInfo(n) { try { const t = localStorage.getItem("panovnik2_slot_" + n); if (!t) return null; const x = JSON.parse(t); return `${x.clans[x.player].house}, ${MONTHS[x.month]} ${x.year}`; } catch (e) { return null; } }
function exportSave() { const blob = new Blob([JSON.stringify(S)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `panovnik-${S.year}-${S.month + 1}.json`; document.body.appendChild(a); a.click(); a.remove(); }
function importFile(f) { const r = new FileReader(); r.onload = () => { try { const x = JSON.parse(r.result); if (!x.provs || !x.clans) throw 0; S = x; toast("Hra načtena."); autosave(); render(); } catch (e) { toast("Soubor není uložená hra."); } }; r.readAsText(f); }

// ---------- hlavička ----------

// ---------- Přehled ----------
function alerts() {
  const out = [], C = P(S);
  for (const p of clanProvs(S, me())) { if (p.siege) out.push(["bad", `${p.n} je obléhán (${p.siege.months}. měsíc).`]); if (p.loy < 25) out.push(["warn", `${p.n}: lid je nespokojen (${Math.round(p.loy)}).`]); if (!p.lord) out.push(["warn", `${p.n} nemá purkrabího.`]); }
  for (const a of S.armies.filter(x => x.cl !== me() && atWar(S, x.cl, me()))) if (S.provs[a.loc].owner === me() || S.provs[a.loc].nb.some(n => S.provs[n].owner === me())) out.push(["bad", `Nepřátelské vojsko (${S.clans[a.cl].house}, asi ${Math.round(men(a.t) / 100) * 100} mužů) u ${S.provs[a.loc].n}.`]);
  const disl = officers(S, me()).filter(c => c.loy < 35 && !c.dyn); if (disl.length) out.push(["warn", `Nespolehliví vazalové: ${disl.map(c => esc(c.n) + " (" + Math.round(c.loy) + ")").join(", ")}.`]);
  if (C.grain < clanGrainUse(S, me()) * 3) out.push(["bad", `Obilí vystačí jen na ${Math.floor(C.grain / Math.max(1, clanGrainUse(S, me())))} měsíců.`]);
  if (C.excom > S.turn) out.push(["bad", "Jsi v papežské klatbě."]);
  if (!heirsOf(S, me()).length) out.push(["bad", "Rod nemá mužského dědice!"]);
  { const L = leaderOf(S, me()); if (L && !L.spouse && !L.c && age(S, L) < 60) out.push(["warn", `${esc(L.n)} nemá choť – dohodni sňatek poselstvem (Diplomacie → Dohodnout sňatek).`]); }
  if (S.hre.election && P(S).hre) out.push(["info", `Volba římského krále za ${S.hre.election - S.turn} měsíců.`]);
  if (!C.res.cur) out.push(["warn", "Učenci nemají zadaný objev."]);
  const idle = officers(S, me()).filter(c => c.acted !== S.turn && !c.army && S.provs[c.loc] && S.provs[c.loc].owner === me() && !S.provs[c.loc].deleg).length;
  if (idle) out.push(["info", `${idle} vazalů v nesvěřených krajích čeká na rozkaz.`]);
  return out;
}
function tile(label, value, sub, spark, cl = "") { return `<div class="tile ${cl}"><div><div class="tl">${label}</div><div class="tv">${value}</div>${sub ? `<div class="ts">${sub}</div>` : ""}</div>${spark ? `<div class="tsp">${spark}</div>` : ""}</div>`; }
function powerChart(n = 6) {
  const H = S.worldHist || []; if (H.length < 2) return '<p class="muted small">Graf moci rodů se zaplní během prvních měsíců hry.</p>';
  const ids = aliveClans(S).map(c => c.id).sort((a, b) => clanProvs(S, b).length - clanProvs(S, a).length).slice(0, n);
  if (!ids.includes(me()) && P(S).alive) ids.push(me());
  const rows = H.slice(-60);
  return lineChart(ids.map(id => ({ name: S.clans[id].house.split(" (")[0], col: S.clans[id].col, bold: id === me(), vals: rows.map(r => r.p[id] || 0) })), rows.map(r => r.d), 1000, 250, 1100);
}
function tPrehled() {
  const C = P(S), L = leaderOf(S, me()), b = clanBudget(S, me()), H = S.history.slice(-24), heir = heirsOf(S, me())[0];
  const lastMonth = S.log.filter(l => l.cl && l.cl.includes(me()) && ((l.y === S.year && l.m === S.month - 1) || (S.month === 0 && l.y === S.year - 1 && l.m === 11) || (l.y === S.year && l.m === S.month)));
  const world = S.log.filter(l => !l.cl || !l.cl.includes(me())).filter(l => ["valka", "rise", "rod", "svet", "cirkev"].includes(l.cat)).slice(0, 10);
  const top = aliveClans(S).map(c => [c, clanProvs(S, c.id).length, clanMen(S, c.id)]).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const al = alerts();
  return `<div class="tiles">
    ${tile("Zlato", fmt(C.gold), `<span class="${b.net < 0 ? "bad" : "good"}">${sg(b.net)} za měsíc</span>`, sparkline(H.map(h => h.gold)))}
    ${tile("Obilí", fmt(C.grain), `spotřeba ${fmt(clanGrainUse(S, me()))}/měs.`, sparkline(H.map(h => h.grain), 120, 30, "#b08a2e"))}
    ${tile("Kraje", clanProvs(S, me()).length + (vassalsOf(S, me()).length ? ` <small>/ ${realmProvs(S, me())}</small>` : ""), `cíl ${Math.ceil(Object.keys(S.provs).length / 2)}`, sparkline(H.map(h => h.realm || h.provs), 120, 30, C.col))}
    ${tile("Vojsko", fmt(clanMen(S, me())), `${S.armies.filter(a => a.cl === me()).length} vojsk v poli`, sparkline(H.map(h => h.men), 120, 30, "#a3332b"))}
    ${tile("Prestiž", fmt(C.prestige), C.titles.join(", ") || "bez koruny", sparkline(H.map(h => h.prestige), 120, 30, "#7a5ea8"))}
    ${tile("Vazalové", officers(S, me()).length, `${officers(S, me()).filter(c => c.loy < 35 && !c.dyn).length} nespolehlivých`)}
    ${tile("Papež", Math.round(S.pope.op[me()] || 0), C.excom > S.turn ? '<span class="bad">klatba</span>' : "přízeň")}
  </div>
  <div class="grid">
  ${card("Rod", `<div class="crest">${portrait(L, 80)}${shield(me(), 48)}<div><div class="big">${esc(C.house)}</div><div>${esc(C.n)}</div><div class="muted">${esc(cap(C.t))} ${esc(L ? L.n : "—")}${L ? `, ${age(S, L)} let, zdraví ${Math.round(L.hp)}` : ""}</div><div class="muted">Dědic: ${heir ? esc(heir.n) + " (" + age(S, heir) + ")" : '<b class="bad">žádný</b>'}</div><div class="muted">Římský král: ${hreKingTxt()}</div></div></div>`)}
  ${card("Hlášení rádců", al.map(([c, t]) => `<div class="alert ${c}">${t}</div>`).join("") || '<div class="alert good">Klid. Nic naléhavého.</div>')}
  ${card("Mocnosti", tbl(["Rod", "#Kraje", "#Vojsko", "#Vztah"], top.map(([c, n, m]) => tr([chip(c.id), n, `~${fmt(Math.round(m / 500) * 500)}`, c.id === me() ? "<td></td>" : `<td class="n ${cls(rel(S, me(), c.id), -20, 30)}">${Math.round(rel(S, me(), c.id))}</td>`]))))}
  ${card("Moc rodů (počet krajů)", powerChart(), "wide")}
  ${card(`Poslední zprávy (${MONTHS[S.month]} ${S.year})`, (lastMonth.length ? lastMonth : S.log.filter(l => l.cl && l.cl.includes(me())).slice(0, 8)).slice(0, 20).map(l => `<div class="lg c-${l.cat}"><span class="tag">${MONTHS[l.m].slice(0, 3)} ${l.y}</span>${esc(l.txt)}</div>`).join("") || "—")}
  ${card("Ze světa", world.map(l => `<div class="lg c-${l.cat}"><span class="tag">${MONTHS[l.m].slice(0, 3)} ${l.y}</span>${esc(l.txt)}</div>`).join("") || "—")}
  </div>`;
}
const hreKingTxt = () => S.hre.kingClan ? esc(chr(S, S.hre.king).n) + " (" + esc(S.clans[S.hre.kingClan].house) + ")" + (S.hre.emperor ? ", císař" : "") : S.hre.king ? esc(S.hre.king.slice(4)) : "trůn je prázdný (interregnum)";

// ---------- Mapa ----------
function provRow(p) {
  const k = knows(S, p);
  return tr([btn(esc(p.n), "provOnly", [p.id]), chip(p.owner), TERRAIN[p.ter].n, k ? fmt(p.pop * 1000) : "?", k ? `${p.agri}/${agriCap(S, p)}` : "?", k ? `${p.com}/${comCap(S, p)}` : "?", `<td class="n">${k ? estimate(S, p, men(p.troops)) : "?"}</td>`, `${p.castle} (${k ? Math.round(p.dur) : "?"})`, k ? Math.round(p.loy) : "?", p.res.map(r => RES[r]).join(", ") || "—", p.siege ? `<span class="bad">obléhán (${S.clans[p.siege.by].house})</span>` : ""], p.id === SEL.prov ? "sel" : "");
}
function provDetail(p) {
  const k = knows(S, p), L = chr(S, p.lord), C = S.clans[p.owner];
  if (!k) return `<div class="kv"><span>Pán</span><span>${chip(p.owner)}</span><span>Terén</span><span>${TERRAIN[p.ter].n}</span><span>Hrad</span><span>úroveň ${p.castle}</span><span>Suroviny</span><span>${p.res.map(r => RES[r]).join(", ") || "—"}</span></div><p class="small muted">O vzdáleném kraji toho moc nevíš – pošli zvědy (rozkaz „Vyzvědět kraj“).</p>`;
  return `<div class="kv"><span>Pán</span><span>${chip(p.owner)} ${esc(C.n)}</span><span>Purkrabí</span><span>${L ? esc(L.n) : "—"}</span><span>Terén</span><span>${TERRAIN[p.ter].n}</span><span>Obyvatel</span><span>${fmt(p.pop * 1000)}</span><span>Suroviny</span><span>${p.res.map(r => RES[r]).join(", ") || "—"}</span><span>Stavby</span><span>${Object.entries(p.b).filter(([, v]) => v).map(([b, v]) => BUILD[b].n.split(" (")[0] + " " + v).join(", ") || "—"}</span></div>
  ${meter("Pole", p.agri, agriCap(S, p), "#7f9a3c")}${meter("Obchod", p.com, comCap(S, p), "#b08a2e")}${meter("Hradby", Math.round(p.dur), durMax(S, p), "#777")}${meter("Spokojenost", Math.round(p.loy), 100, p.loy < 30 ? "var(--bad)" : "var(--accent2)")}
  <div class="kv"><span>Posádka</span><span>${estimate(S, p, men(p.troops))} mužů${(p.spy[me()] || 0) > S.turn ? " (přesně – zvědové)" : ""}</span></div>${p.owner === me() || (p.spy[me()] || 0) > S.turn ? troopBar(p.troops) : ""}
  <div class="small">Sousedé: ${p.nb.map(n => `<a class="lnk" data-a="provOnly" data-x='["${n}"]'>${esc(S.provs[n].n)}</a>`).join(", ")}</div>${p.owner === me() ? `<div class="row">${btn("Spravovat kraj", "tab", ["kraj"])}</div>` : ""}`;
}

// ---------- Kraj a rozkazy ----------
function cmdParams(c, k, p) {
  const id = c.id, myProvs = clanProvs(S, me()), near = Object.values(S.provs).filter(q => q.owner !== me() && (q.nb.some(n => S.provs[n].owner === me())));
  switch (k) {
    case "nabor": { const mx = maxRecruit(S, p, c); return sel("a1_" + id, TROOP_IDS.map(t => [t, `${TROOPS[t].n} (${TROOPS[t].cost} zl/100${Object.keys(TROOPS[t].goods).length ? ", " + Object.entries(TROOPS[t].goods).map(([g, q]) => q + " " + GOODS[g].n.toLowerCase()).join(", ") : ""})`]), "pesi") + ` <input type="number" id="a2_${id}" value="${Math.floor(mx / 100) * 100}" min="0" step="100" title="max ${mx}"> <span class="small muted">max ${mx}</span>`; }
    case "stavba": return sel("a1_" + id, Object.entries(BUILD).filter(([b, B]) => !B.need || B.need(p)).map(([b, B]) => [b, `${B.n} – ${buildCost(S, me(), b, p)} zl, ${B.time} měs. (nyní ${buildLevel(p, b)}/${B.max})`]), "hrad");
    case "narok": return sel("a1_" + id, near.filter(q => q.nb.some(n => S.provs[n].owner === me())).map(q => [q.id, `${q.n} (${S.clans[q.owner].house})${claimValid(S, me(), q.id) ? " – nárok už máš" : ""}`]), "");
    case "zvedy": case "podnecovat": return sel("a1_" + id, near.map(q => [q.id, `${q.n} (${S.clans[q.owner].house})`]), "");
    case "naklonit": { const targets = Object.values(S.chars).filter(x => x.st === "off" && x.cl && x.cl !== me() && !x.dyn && S.clans[x.cl].leader !== x.id && S.provs[x.loc] && (S.provs[x.loc].nb.some(n => S.provs[n].owner === me()))); return sel("a1_" + id, targets.map(x => [x.id, `${x.n} – ${S.clans[x.cl].house}, ${S.provs[x.loc].n}${Object.values(S.provs).some(q => q.lord === x.id) ? ", purkrabí" : ""}`]), ""); }
    case "poselstvo": return sel("a1_" + id, aliveClans(S).filter(x => x.id !== me()).map(x => [x.id, x.house]), "") + sel("a2_" + id, Object.entries(DIPLO).map(([k2, d]) => [k2, d.n]), "dar");
    case "presun": return sel("a1_" + id, myProvs.filter(q => q.id !== p.id).map(q => [q.id, q.n]), "");
  }
  return "";
}
function tKraj() {
  let p = S.provs[SEL.prov]; if (p.owner !== me()) { p = S.provs[P(S).capital] || clanProvs(S, me())[0]; if (!p) return card("Kraj", "Nemáš žádný kraj."); SEL.prov = p.id; }
  const offs = officersIn(S, p.id).filter(c => !c.army);
  const cmdOpts = Object.entries(CMDS).map(([k, K]) => [k, K.n + (K.cost ? ` (${K.cost} zl)` : "")]);
  const rows = offs.map(c => cmdCard(c, p, false));
  const myProv = clanProvs(S, me()).sort((a, b) => b.v - a.v);
  const reach = Object.values(S.provs).filter(q => q.id !== p.id && (q.owner === me() || atWar(S, me(), q.owner))).sort((a, b) => dist(p, a) - dist(p, b)).slice(0, 25);
  const cmOpts = [["", "—"]].concat(offs.filter(c => c.acted !== S.turn).map(c => [c.id, `${c.n} (vůd. ${st(c, "ved")}, ${RANKS[c.rank].cmd} mužů)`]));
  return `<div class="row provpick">Kraj: ${sel("pk", myProv.map(q => [q.id, `${q.n}${q.siege ? " (obléhán)" : ""}${officersIn(S, q.id).some(c => c.acted !== S.turn && !c.army) ? " •" : ""}`]), p.id, `data-a="provOnly" data-x='[]'`)}
    <label><input type="checkbox" data-a="deleg" data-x='["${p.id}"]' ${p.deleg ? "checked" : ""}> svěřit správu purkrabímu (rozkazy zadá sám)</label></div>
  <div class="grid">
  ${card(`${shield(me(), 22)} ${esc(p.n)}`, provArt(p) + provDetail(p) + `<div class="kv"><span>Měsíční výnos</span><span>${r1(provGold(S, p) + provMines(S, p).gold)} zl</span><span>Sklizeň (září)</span><span>asi ${Math.round(provHarvest(S, p))} obilí</span><span>Výcvik</span><span>${Math.round(p.train)}</span><span>Strop posádky</span><span>${fmt(troopCap(p))}</span><span>Stavba</span><span>${p.build ? BUILD[p.build.b].n + `, zbývá ${p.build.left} měs.` : "—"}</span></div>`)}
  ${card("Spokojenost lidu a obchod", (() => { const lb = loyBreakdown(S, p); return meter("Spokojenost", Math.round(p.loy), 100, p.loy < 30 ? "var(--bad)" : "var(--accent2)") + `<p class="small">Směřuje k <b>${lb.val}</b> (mění se pozvolna).</p>` + tbl(["Proč", "#"], lb.rows.map(r => tr([esc(r[0]), `<td class="n ${r[1] < 0 ? "bad" : "good"}">${sg(r[1])}</td>`]))); })() + `<h4>Obchodní cesty</h4>${provRoutes(p).map(R => `<div><span class="rdot" style="background:${R.col}"></span>${R.n} – průchodnost ${Math.round(routeState(S, R) * 100)} %</div>`).join("") || '<span class="muted small">Kraj neleží na žádné obchodní cestě.</span>'}<div class="small">Zisk z cest: ${r1(routeIncomeProv(S, p))} zl/měs.${p.hanza ? " · člen Hanzy" : ""}</div>`)}
  ${card("Posádka", troopBar(p.troops) + troopLegend() + tbl(["Druh", "#Mužů"], TROOP_IDS.map(k => tr([TROOPS[k].n, p.troops[k] || 0]))) + meter("Výcvik", Math.round(p.train), 100, "#a3332b") + `<p class="small">Celkem ${fmt(men(p.troops))} mužů, obranná síla ${r1(provDefense(S, p))}.</p>`)}
  ${card(`Vazalové v kraji – rozkazy (${offs.filter(c => c.acted !== S.turn).length} volných)`, `<div class="ccards">${rows.join("") || '<p class="muted">V kraji není žádný volný vazal.</p>'}</div>` + `<p class="small muted">Každý vazal vykoná jeden rozkaz za měsíc. Výsledek závisí na jeho schopnostech (správa: rozvoj, vůdcovství: nábor a výcvik, rozum: zvědové, intriky a diplomacie).</p>`, "wide")}
  ${card("Vyslat vojsko", `<div class="kv"><span>Cíl</span>${sel("dto", reach.map(q => [q.id, `${q.n} (${q.owner === me() ? "vlastní" : S.clans[q.owner].house}, ${Math.round(dist(p, q))} km)`]), "")}<span>Druh</span>${sel("dmode", [["utok", "tažení (dobýt kraj)"], ["presun", "přesun posádky do vlastního kraje"]], "utok")}
    ${TROOP_IDS.map(k => `<span>${TROOPS[k].n}</span><span><input type="number" id="dt_${k}" value="${Math.floor((p.troops[k] || 0) * 0.7)}" min="0" max="${p.troops[k] || 0}"> / ${fmt(p.troops[k] || 0)}</span>`).join("")}
    <span>Velitel</span>${sel("dc1", cmOpts, cmOpts[1] ? cmOpts[1][0] : "")}<span>Druhý velitel</span>${sel("dc2", cmOpts, "")}<span>Třetí velitel</span>${sel("dc3", cmOpts, "")}
    <span>Zásoby (měsíce)</span><span><input type="number" id="dmon" value="4" min="1" max="12"> <span class="small muted">12 obilí na 1000 mužů a měsíc</span></span></div><div class="row">${btn("Vytáhnout", "dispatch", [p.id], null, "go")}</div>
    <p class="small muted">Velitelé určují, kolik mužů lze vést (součet podle hodností). Vojsko táhne jeden kraj za měsíc. V nepřátelském kraji oblehne hrad; zteč nařídíš v záložce Vojsko a války.</p>`)}
  </div>`;
}

// ---------- Vazalové ----------

// ---------- Vojsko ----------
function tVojsko() {
  const mine = S.armies.filter(a => a.cl === me()).map(a => { const p = S.provs[a.loc];
    const tgt = Object.values(S.provs).filter(q => atWar(S, me(), q.owner)).sort((x, y) => dist(p, x) - dist(p, y)).slice(0, 15);
    return tr([`${esc(a.cmds.map(id => chr(S, id).n).join(", ") || "bez velitele")}`, esc(p.n) + (a.path && a.path.length ? ` → ${esc(S.provs[a.to].n)} (${marchTime(S, a.path) - (a.slow ? 1 : 0)} měs.)` : "") + (a.slow ? '<div class="small muted">brodí se těžkým terénem</div>' : ""), fmt(men(a.t)), troopBar(a.t), `<td class="n ${cls(a.morale, 40, 70)}">${Math.round(a.morale)}</td>`, `<td class="n">${Math.round(a.grain)}</td>`,
      p.siege && p.siege.army === a.id ? `obléhá (${p.siege.months}. měs., hradby ${Math.round(p.dur)}, posádka ${estimate(S, p, men(p.troops))})` : a.mode === "presun" ? "přesun" : "pochod",
      `${btn(a.siegeMode === "ztec" ? "<b>Zteč</b>" : "Zteč", "army", [a.id, "ztec"])} ${btn(a.siegeMode === "obleh" ? "<b>Obléhat</b>" : "Obléhat", "army", [a.id, "obleh"])} ${sel("ato_" + a.id, tgt.map(q => [q.id, q.n]), "")} ${btn("Táhnout", "army", [a.id, "tahnout"])} ${btn("Domů", "army", [a.id, "domu"])}<div class="row small">${sel("tac_" + a.id, Object.entries(TACTICS).map(([k, T]) => [k, T.n]), a.tac || "vyvazena", `data-a="tac" data-x='["${a.id}"]' title="Sestava pro bitvy"`)} <label title="Bitvy povedeš kolo po kole sám"><input type="checkbox" data-a="manual" data-x='["${a.id}"]' ${a.manual ? "checked" : ""}> velet osobně</label></div>`]); });
  const foes = S.armies.filter(a => a.cl !== me() && (knows(S, S.provs[a.loc]) || atWar(S, me(), a.cl))).map(a => tr([chip(a.cl), esc(S.provs[a.loc].n), knows(S, S.provs[a.loc]) ? estimate(S, S.provs[a.loc], men(a.t)) : "?", a.to ? esc(S.provs[a.to].n) : "", atWar(S, me(), a.cl) ? '<span class="bad">nepřítel</span>' : ""]));
  const wars = S.wars.filter(w => w.a === me() || w.b === me()).map(w => { const o = w.a === me() ? w.b : w.a; return tr([chip(o), `${Math.floor((S.turn - w.start) / 12)} r. ${(S.turn - w.start) % 12} m.`, fmt(clanMen(S, o)) + " (odhad)", clanProvs(S, o).length, allied(S, me(), o) ? "" : ""]); });
  const garr = clanProvs(S, me()).sort((a, b) => men(b.troops) - men(a.troops)).map(p => tr([btn(esc(p.n), "prov", [p.id]), `<td class="wbar">${troopBar(p.troops)}</td>`, ...TROOP_IDS.map(k => p.troops[k] || 0), men(p.troops), Math.round(p.train), p.nb.some(n => atWar(S, me(), S.provs[n].owner)) ? '<span class="bad">fronta</span>' : ""]));
  const bat = S.battles.filter(b => b.a === me() || b.b === me()).slice(0, 25).map(b => tr([b.d, esc(b.place), b.kind, chip(b.a), `${fmt(b.aStart)} → ${fmt(b.aEnd)}`, chip(b.b), `${fmt(b.bStart)} → ${fmt(b.bEnd)}`, b.win === me() ? '<span class="good">vítězství</span>' : '<span class="bad">porážka</span>', `<details><summary>${b.rounds.length} kol${b.retreat ? ", ústup" : ""}</summary>${battleChart(b)}${b.why ? tbl(["Proč to dopadlo takhle", "#Útočník", "#Obránce"], b.why.map(w => tr([w[0], `<td class="n">${esc(w[1])}</td>`, `<td class="n">${esc(w[2])}</td>`]))) : ""}${b.rounds.map((r, i) => `${i + 1}. kolo: ${r[4] ? ORDERS[r[4]].n + " × " + ORDERS[r[5]].n + " – " : ""}ztráty ${r[0]} / ${r[1]} (síla ${r[2]} : ${r[3]})`).join("<br>")}<br>Velitelé: ${esc(b.aCmd)} × ${esc(b.bCmd)}${b.fate.length ? "<br>" + esc(b.fate.join(", ")) : ""}</details>`]));
  return `<div class="grid">${card("Války", tbl(["Nepřítel", "Trvá", "#Jeho vojsko", "#Jeho kraje", ""], wars) + '<p class="small muted">Mír sjednáš poselstvem (záložka Diplomacie nebo rozkaz vazala).</p>')}
  ${card("Nepřátelská a cizí vojska v dohledu", tbl(["Rod", "Kde", "#Mužů", "Cíl", ""], foes))}
  ${card("Tvá vojska v poli", tbl(["Velitelé", "Kde", "#Mužů", "Složení", "#Morálka", "#Obilí", "Stav", "Rozkazy"], mine), "wide")}
  ${card("Sestavy a taktika", `<div class="kv"><span>Obrana hradů</span>${sel("deftac", Object.entries(TACTICS).map(([k, T]) => [k, T.n]), P(S).defTac || "sik", `data-a="defTac" data-x='[]'`)}</div>` + tbl(["Sestava", "Popis"], Object.values(TACTICS).map(T => tr([`<b>${T.n}</b>`, `<span class="small">${T.d}</span>`]))) + '<p class="small muted">Sestavu vojska zvolíš u každého vojska v poli. „Velet osobně“ znamená, že o rozkazech v každém kole bitvy rozhodneš sám.</p>')}
  ${card("Posádky", troopLegend() + tbl(["Kraj", "Složení", ...TROOP_IDS.map(k => "#" + TROOPS[k].n.split(" ")[0]), "#Celkem", "#Výcvik", ""], garr), "wide")}
  ${card("Bitvy", tbl(["Kdy", "Kde", "Druh", "Útočník", "#Muži", "Obránce", "#Muži", "Výsledek", "Průběh"], bat), "wide")}</div>`;
}

// ---------- Diplomacie ----------
function relStatus(c) {
  return [atWar(S, me(), c.id) ? '<span class="pill bad">válka</span>' : "", allied(S, me(), c.id) ? '<span class="pill good">spojenec</span>' : "", truceUntil(S, me(), c.id) > S.turn ? `<span class="pill">příměří ${truceUntil(S, me(), c.id) - S.turn} m.</span>` : "", married(S, me(), c.id) ? '<span class="pill">sňatek</span>' : "",
    c.vassalOf === me() ? '<span class="pill good">tvůj vazal</span>' : c.vassalOf ? `<span class="pill">vazal: ${esc(S.clans[c.vassalOf].house.split(" (")[0])}</span>` : "", P(S).vassalOf === c.id ? '<span class="pill">tvůj lenní pán</span>' : "", c.excom > S.turn ? '<span class="pill bad">klatba</span>' : "", (c.ban || 0) > S.turn ? '<span class="pill bad">říšská klatba</span>' : ""].join("");
}
function relBar(r) { const f = (r + 100) / 2; return `<span class="relbar" title="vztah ${Math.round(r)}"><i style="left:${Math.min(50, f)}%;width:${Math.abs(f - 50)}%;background:${r < 0 ? "var(--bad)" : "var(--good)"}"></i><b style="left:50%"></b></span>`; }

// ---------- Říše a církev ----------
function tRise() {
  const H = S.hre, C = P(S), cands = candidates(S), holders = electorHolders(S);
  const el = Object.entries(holders).map(([t, cid]) => tr([`Kurfiřt – ${t}`, chip(cid), cid === me() ? "ty" : `vztah ${Math.round(rel(S, me(), cid))}`, ""]))
    .concat(EXT_ELECTORS.map(e => tr([esc(cap(extElectorName(S, e))), "mimo mapu", `přízeň k tobě ${Math.round(H.ext[e.id][me()] || 0)}`, H.election ? `<input type="number" id="br_${e.id}" value="100" min="50" step="50"> ${btn("Poslat dary", "bribe", [e.id])}` : ""])));
  const last = H.lastElection ? `<h4>Poslední volba (${H.lastElection.d})</h4>${tbl(["Kurfiřt", "Hlas"], H.lastElection.votes.map(v => tr([esc(v[0]), esc(v[1])])))}<p>${esc(H.lastElection.txt || "")}</p>` : "";
  const crowns = Object.entries(CROWNS).map(([k, K]) => { const h = crownHolder(S, k), own = K.core.filter(id => S.provs[id].owner === me()).length;
    return tr([`<b>${k}</b>`, h ? chip(h.id) : "<i>neobsazena</i>", `${own}/${K.core.length}`, esc(S.provs[K.cap].n), btn("Korunovat se", "crown", [k], canCrown(S, me(), k))]); });
  const pope = aliveClans(S).sort((a, b) => (S.pope.op[b.id] || 0) - (S.pope.op[a.id] || 0)).slice(0, 12).map(c => tr([chip(c.id), `<td class="n ${cls(S.pope.op[c.id] || 0, -20, 40)}">${Math.round(S.pope.op[c.id] || 0)}</td>`, c.excom > S.turn ? '<span class="bad">klatba</span>' : ""]));
  const hreClans = aliveClans(S).filter(c => c.hre && c.id !== me());
  return `<div class="grid">${card("Svatá říše římská", `<div class="kv"><span>Římský král</span><span>${hreKingTxt()}</span><span>Volba</span><span>${H.election ? `${MONTHS[(S.month + H.election - S.turn) % 12]} ${S.year + Math.floor((S.month + H.election - S.turn) / 12)}` : "nevypsána"}</span><span>Tvůj rod</span><span>${C.hre ? "říšské knížectví" : "mimo říši"}</span></div>
    <h4>Kandidáti</h4>${tbl(["Kandidát", ""], cands.map(c => tr([esc(c.n), c.ext ? "cizí kandidát (zlato pro arcibiskupy)" : ""])))}
    <div class="row">${btn("Ucházet se o římskou korunu", "stand", [], C.candidate ? "Už kandiduješ" : null)}</div>
    <h4>Kurfiřti</h4>${tbl(["Hlas", "Drží", "Postoj", ""], el)}${last}
    ${H.kingClan === me() ? `<h4>Pravomoci římského krále</h4><div class="row">${sel("banT", hreClans.map(c => [c.id, c.house]), "")} ${btn("Uvalit říšskou klatbu (50 prestiže)", "ban")} ${btn("Jet do Říma ke korunovaci (800 zl)", "coronation", [], H.emperor ? "Už jsi císař" : null)}</div><p class="small muted">Říšská klatba dovolí válku bez ztráty cti a ostatní knížata se proti postiženému obrátí. Římský král dostává 35 zl měsíčně z říšských příjmů a snáze žádá lenní hold od říšských knížat.</p>` : ""}
    <p class="small muted">Sedm kurfiřtů: tři rýnští arcibiskupové (mimo mapu – získáš je dary a přízní papeže) a držitelé Čech, Falce, Saska a Braniborska (hlasují podle vztahů). Hlas drží rod, který ovládá sídelní kraj (Praha, Rýnská Falc, Wittenbersko, Braniborsko).</p>`, "wide")}
  ${card("Královské koruny", tbl(["Koruna", "Drží", "#Tvé jádro", "Korunovační kraj", ""], crowns) + '<p class="small muted">Ke korunovaci musíš držet korunovační kraj a polovinu jádra koruny, mít přízeň papeže aspoň 30 a 500 zl.</p>')}
  ${card(`Papež ${esc(S.pope.n)}`, `<div class="kv"><span>Přízeň k tobě</span><span>${Math.round(S.pope.op[me()] || 0)}</span><span>Klatba</span><span>${C.excom > S.turn ? `ano, ještě ${C.excom - S.turn} měs.` : "ne"}</span></div><div class="row">${btn("Dar Svatému stolci (100 zl)", "popeGift")} ${btn("Veřejné pokání (250 zl)", "penance", [], C.excom > S.turn ? null : "Nejsi v klatbě")}</div>` + tbl(["Rod", "#Přízeň", ""], pope) + '<p class="small muted">Klatba (pod −60) snižuje věrnost vazalů i lidu. Přízeň zvedají dary, kláštery, výprava do Pruska a poslušnost Římu; snižují ji útoky na církevní země, popravy a zrada příměří.</p>')}</div>`;
}

// ---------- Hospodářství ----------
const INC_N = { obchod: "Obchodní cesty a clo", domeny: "Panské dvory a regálie", kraje: "Daně a dávky z krajů", doly: "Doly a solivary", dan_vazalu: "Poplatky vazalů / lennímu pánovi", rise: "Říšské příjmy", cirkev: "Církevní statky (investitura)" };
const EXP_N = { platy: "Platy vazalů", vojsko: "Vydržování vojska", dvur: "Dvůr", uroky: "Úroky" };

// ---------- Stavy a zákony ----------
function tStavy() {
  const C = P(S);
  const est = ESTATE_IDS.map(e => { const t = estateTarget(S, e); return tr([`<b>${ESTATES[e]}</b>`, `<td class="n ${cls(C.estates[e], 30, 60)}">${Math.round(C.estates[e])}</td>`, bar(C.estates[e]), t.val, `<details><summary>proč</summary>${tbl(["Vliv", "#"], t.rows.map(r => tr([esc(r[0]), `<td class="n ${r[1] < 0 ? "bad" : "good"}">${sg(r[1])}</td>`])))}</details>`]); });
  const laws = Object.entries(LAWS).map(([l, L]) => tr([`<b>${L.n}</b><div class="small muted">${L.d}</div>`, sel("law_" + l, L.opts.map((o, i) => [i, o]), C.laws[l], `data-a="law" data-x='["${l}"]' ${(C.lawCd[l] || 0) > S.turn ? "disabled" : ""}`), (C.lawCd[l] || 0) > S.turn ? `za ${C.lawCd[l] - S.turn} měs.` : "lze měnit"]));
  return `<div class="grid">${card("Stavy", tbl(["Stav", "#Věrnost", "", "#Směřuje k", "Rozpis"], est) + '<p class="small muted">Šlechta ovlivňuje věrnost vazalů, duchovenstvo vztah s církví, měšťané výnos obchodu, sedláci spokojenost lidu. Stav pod 25 hrozí krizí.</p>', "wide")}
  ${card("Zákony země", tbl(["Zákon", "Platí", "Změna"], laws) + '<p class="small muted">Změna zákona stojí 20 prestiže a další změna je možná po dvou letech.</p>', "wide")}</div>`;
}

// ---------- Rod ----------
function tRod() {
  const C = P(S), L = leaderOf(S, me()), sp = L && chr(S, L.spouse), H = heirsOf(S, me());
  const kids = L ? L.kids.map(id => chr(S, id)).filter(c => c && c.st !== "dead") : [];
  const others = Object.values(S.chars).filter(c => c.cl === me() && c.dyn && c.st !== "dead" && c !== L && c !== sp && !kids.includes(c));
  const dead = Object.values(S.chars).filter(c => c.dyn && c.st === "dead" && c.cl === me()).slice(-15).map(c => tr([esc(c.n), c.died || ""]));
  return `<div class="grid">${card("Rodokmen " + esc(C.house), `<div class="tree"><div class="gen">${famCard(L, cap(C.t))}${sp ? famCard(sp, "choť") : '<div class="fam empty">bez choti</div>'}</div>
    ${kids.length ? `<div class="stem"></div><div class="gen kids">${kids.map(c => famCard(c)).join("")}</div>` : '<p class="muted small">Zatím bez potomků.</p>'}
    ${others.length ? `<h4>Další členové rodu</h4><div class="gen kids">${others.map(c => famCard(c, c.sex === "m" ? "příbuzný" : "příbuzná")).join("")}</div>` : ""}</div>
    <p class="small muted">Dědic: ${H[0] ? esc(H[0].n) : '<b class="bad">žádný</b>'} (${LAWS.nastupnictvi.opts[C.laws ? C.laws.nastupnictvi : 0]}). Sloupce u jména: vůdcovství, udatnost, rozum, správa. Synové v 15 letech vstupují do služby. Sňatky dohodneš poselstvem v Diplomacii.</p>`, "wide")}
  ${card("Spřízněné rody", aliveClans(S).filter(c => married(S, me(), c.id)).map(c => chip(c.id)).join(" ") || "—")}
  ${card("Zesnulí", tbl(["Jméno", "Zemřel(a)"], dead))}</div>`;
}

// ---------- Objevy ----------

// ---------- Kronika ----------
function tKronika() {
  const f = SEL.logF; const l = S.log.filter(x => f === "vse" || (f === "moje" ? x.cl && x.cl.includes(me()) : f === "svet" ? !x.cl || !x.cl.includes(me()) : x.cat === f)).slice(0, 400);
  return card("Kronika", `<div class="row">${[["moje", "můj rod"], ["svet", "svět"], ["vse", "vše"], ["valka", "války"], ["rise", "říše"], ["rod", "rody"], ["diplomacie", "diplomacie"], ["rozkazy", "rozkazy"]].map(([k, n]) => btn(f === k ? `<b>${n}</b>` : n, "logF", [k])).join("")}</div><div class="log">${l.map(x => `<div class="lg"><span class="tag">${MONTHS[x.m].slice(0, 3)} ${x.y}</span>${esc(x.txt)}</div>`).join("")}</div>`, "wide");
}

// ---------- Hra ----------
function tHra() {
  const slots = [1, 2, 3, 4, 5].map(n => { const i = slotInfo(n); return tr([n, i ? esc(i) : '<span class="muted">prázdná</span>', btn("Uložit", "save", [n]) + btn("Načíst", "load", [n], i ? null : "Prázdná") + btn("Smazat", "del", [n], i ? null : "Prázdná")]); });
  const sc = SEL.ngScen || 1256; SCEN_CACHE[sc] = SCEN_CACHE[sc] || scenarioClans(sc);
  const clansSel = SCEN_CACHE[sc].sort((a, b) => b.provs - a.provs).map(c => [c.id, `${c.house} – ${c.n} (${c.provs} krajů, ${c.leader})`]);
  if (!SCEN_CACHE[sc].some(c => c.id === SEL.ng)) SEL.ng = "premysl";
  return `<div class="grid">${card("Uložené hry", tbl(["#", "Obsah", ""], slots) + `<p class="small muted">Hra se sama ukládá po každém kroku.</p><div class="row">${btn("Stáhnout do souboru", "exportSave")} ${btn("Nahrát ze souboru", "importSave")}</div>`)}
  ${card("Nová hra", `<div class="kv"><span>Scénář</span>${sel("ngScen", Object.entries(SCENARIOS).map(([k, x]) => [k, x.n]), sc, `data-a="ngScen" data-x='[]'`)}<span></span><span class="small muted">${esc(SCENARIOS[sc].d)}</span><span>Rod</span>${sel("ngClan", clansSel, SEL.ng, `data-a="ngClan" data-x='[]'`)}<span>Obtížnost</span>${sel("ngDiff", DIFFS.map((d, i) => [i, d]), SEL.ngDiff != null ? SEL.ngDiff : 1, `data-a="ngDiff" data-x='[]'`)}<span>Mlha války</span><label><input type="checkbox" id="ngFog" ${SEL.ngFog === false ? "" : "checked"} data-a="ngFog" data-x='[]'> o vzdálených krajích víš jen odhady</label><span>Semínko náhody</span><input id="ngSeed" type="number" placeholder="náhodné"></div><div class="row">${btn(SEL.ngConfirm ? "<b>Ano, začít</b>" : "Začít novou hru", "newgame")}</div><p class="small muted">Velké rody (Přemyslovci, Arpádovci) jsou nejsnazší. Habsburkové, Wittelsbachové nebo slezští Piastovci začínají malí – to je výzva.</p>`)}
  ${card("Vzhled", btn("Přepnout světlý / tmavý vzhled", "theme") + " " + btn("Úvodní obrazovka", "openTitle"))}
  <section class="card wide help"><h3>Jak hrát</h3>
  <p>Jsi hlavou panovnického rodu ve střední Evropě po pádu Štaufů (od ledna 1256). Kolo je jeden měsíc. <b>Cíl:</b> ovládnout polovinu krajů (sám nebo skrze vazaly), nebo se stát císařem a vládnout třetině krajů. Prohraješ, když přijdeš o všechny kraje.</p>
  <h4>Mapa</h4><p>Hlavní obrazovkou je mapa. Kolečkem myši přibližuješ, tažením posouváš. Dole přepínáš mapové režimy (terén, rozvoj, spokojenost, vztahy, kultura, víra, obchod, začlenění). Klikni na kraj – vpravo se ukáže jeho panel. Klikni na žeton svého vojska a pak na kraj: vojsko tam potáhne. Mezerník spustí a zastaví běh času, Esc zavře okno.</p>
  <h4>Body vlády a stabilita</h4><p>Každý měsíc získáváš body správy, diplomacie a vojska podle schopností panovníka a rádců v úřadech. Utrácíš je za rozvoj krajů, stabilitu, začleňování nově získaných krajů, ideje a snižování válečného vyčerpání (okno Vláda).</p>
  <h4>Válka a mír</h4><p>Bez záminky (nárok, jádro, koruna, klatba) válka stojí stabilitu a prestiž. Dobytý hrad se jen obsadí. Válečné skóre roste vítězstvími a obsazenými kraji; v Diplomacii pak požaduješ kraje, odškodné, vazalství nebo připojení celé země. Kdo se rozpíná příliš rychle, rozzlobí sousedy – mohou proti němu uzavřít koalici.</p>
  <h4>Měsíc</h4><p>V záložce <b>Kraj a rozkazy</b> dáš každému vazalovi jeden rozkaz: rozvoj polí a trhů, opravy hradeb, nábor, výcvik, péči o lid, stavby, hledání schopných mužů, zvědy, podněcování, naklonění cizích vazalů, poselstva nebo přesun. Kraje, které „svěříš purkrabímu“, spravuje umělá inteligence sama. Pak stiskni <b>Konec měsíce</b>.</p>
  <h4>Hospodářství</h4><p>Zlato plyne každý měsíc z obchodu a obyvatel, obilí jednou za rok při žních v září. Obilím se živí posádky a vojska v poli. Stříbrné doly (Jihlava, Kutná Hora a Čáslavsko, Štiavnica, Freiberg…) jsou pokladem.</p>
  <h4>Válka</h4><p>Vyhlas válku (Diplomacie), vyšli vojsko s veliteli (Kraj a rozkazy → Vyslat vojsko). Vojsko táhne kraj za měsíc. U cíle obléhá hrad – vyhladovění trvá podle úrovně hradu, zteč je rychlá, ale krvavá. Bitva má až šest kol; rozhoduje počet, druh vojska, výcvik, terén, morálka a schopnosti velitelů. Poražení velitelé mohou padnout nebo být zajati.</p>
  <h4>Vazalové</h4><p>Věrnost závisí na hodnosti, darech, prestiži rodu a náladě šlechty. Nevěrný purkrabí může přeběhnout k sousedovi i s krajem nebo se vzbouřit. Cizí vazaly lze úplatky naklonit na svou stranu.</p>
  <h4>Evropská politika</h4><p>Sňatky spojují rody a dávají nárok na dědictví. Slabší rody mohou složit lenní hold. Kurfiřti volí římského krále; papež může dát rod do klatby. Kdo ovládne jádro koruny (Čechy, Uhry, Polsko, Halič), může se nechat korunovat.</p>
  <p class="small muted">Historické postavy a vládci odpovídají roku 1256 (roky narození jsou přibližné). Jejich schopnosti a všichni ostatní vazalové jsou herní výmysl.</p></section></div>`;
}

// ---------- start ----------
function boot() {
  try { const t = localStorage.getItem("panovnik_theme"); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
  try { const t = localStorage.getItem("panovnik2_auto"); if (t) S = JSON.parse(t); } catch (e) { S = null; }
  if (!S || !S.provs || S.v !== 2 || !S.clans[S.player].mp) { S = newGame(); SEL.title = { step: 1 }; }
  const f = document.createElement("input"); f.type = "file"; f.id = "impFile"; f.accept = ".json,application/json"; f.style.display = "none"; f.onchange = () => f.files[0] && importFile(f.files[0]); document.body.appendChild(f);
  render();
}
if (typeof document !== "undefined") { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot(); }
