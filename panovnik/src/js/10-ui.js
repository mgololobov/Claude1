// Rozhraní: záložky s tabulkami, mapa, rozkazy, události, ukládání.
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
  ngClan: v => { SEL.ng = v; },
  newgame: () => { if (!SEL.ngConfirm) { SEL.ngConfirm = true; return "Opravdu? Rozehraná hra se přepíše – klikni znovu."; } SEL.ngConfirm = false; S = newGame({ clan: SEL.ng, seed: $("#ngSeed").value ? +$("#ngSeed").value : undefined }); TAB = "prehled"; SEL.prov = P(S).capital; },
  theme: () => { const r = document.documentElement; const t = r.dataset.theme === "dark" ? "light" : r.dataset.theme === "light" ? "" : "dark"; if (t) r.dataset.theme = t; else delete r.dataset.theme; try { localStorage.setItem("panovnik_theme", t); } catch (e) {} },
};
document.addEventListener("click", ev => { const el = ev.target.closest("[data-a]"); if (!el || el.disabled || el.tagName === "SELECT" || el.tagName === "INPUT") return; run(el.dataset.a, JSON.parse(el.dataset.x || "[]")); });
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
const TABS = [["prehled", "Přehled"], ["mapa", "Mapa"], ["kraj", "Kraj a rozkazy"], ["vazalove", "Vazalové"], ["vojsko", "Vojsko a války"], ["diplo", "Diplomacie"], ["rise", "Říše a církev"], ["hosp", "Hospodářství"], ["stavy", "Stavy a zákony"], ["rod", "Rod"], ["objevy", "Objevy"], ["kronika", "Kronika"], ["hra", "Hra"]];
function renderTop() {
  const C = P(S), L = leaderOf(S, me()), b = clanBudget(S, me()), idle = officers(S, me()).filter(c => c.acted !== S.turn && !c.army && S.provs[c.loc] && S.provs[c.loc].owner === me() && !S.provs[c.loc].deleg).length;
  $("#top").innerHTML = `<span class="realm">${shield(me(), 24)}<span>${esc(C.house)}</span></span>
  <span class="st">${esc(cap(C.t))} <b>${esc(L ? L.n : "—")}</b>${L ? ` (${age(S, L)})` : ""}</span>
  <span class="st"><b>${MONTHS[S.month]} ${S.year}</b></span>
  <span class="st" title="Zlato (čistý měsíční příjem)">Zlato <b>${fmt(C.gold)}</b> <span class="${b.net < 0 ? "bad" : "good"}">${sg(b.net)}</span></span>
  <span class="st" title="Obilí na skladě">Obilí <b>${fmt(C.grain)}</b></span>
  <span class="st" title="Kraje vlastní / včetně vazalů">Kraje <b>${clanProvs(S, me()).length}</b>${vassalsOf(S, me()).length ? "/" + realmProvs(S, me()) : ""}</span>
  <span class="st" title="Vojsko">Vojsko <b>${fmt(clanMen(S, me()))}</b></span>
  <span class="st" title="Prestiž">Prestiž <b>${fmt(C.prestige)}</b></span>
  ${enemiesOf(S, me()).length ? `<span class="st bad">Válka: ${enemiesOf(S, me()).map(e => esc(S.clans[e].house)).join(", ")}</span>` : ""}
  <span class="sp"></span><span class="st muted small">${idle ? idle + " vazalů čeká na rozkaz" : ""}</span>
  <button class="main" data-a="end" data-x="[]" ${S.over && !S.over.cont ? "disabled" : ""} title="Ctrl+Enter">Konec měsíce ▶</button>`;
  $("#tabs").innerHTML = TABS.map(([id, n]) => `<button class="${TAB === id ? "on" : ""}" data-a="tab" data-x='["${id}"]'>${icon(id)}<span>${n}</span></button>`).join("");
}
function render() {
  if (!S) return;
  if (!SEL.prov || !S.provs[SEL.prov]) SEL.prov = P(S).capital || Object.keys(S.provs)[0];
  renderTop();
  const f = { prehled: tPrehled, mapa: tMapa, kraj: tKraj, vazalove: tVazalove, vojsko: tVojsko, diplo: tDiplo, rise: tRise, hosp: tHosp, stavy: tStavy, rod: tRod, objevy: tObjevy, kronika: tKronika, hra: tHra }[TAB];
  $("#main").innerHTML = f();
  renderModal();
}
function renderModal() {
  const m = $("#modal");
  if (S.events.length) {
    const v = eventView(S, S.events[0]);
    m.innerHTML = `<div class="box"><div class="muted small">${dateStr(S)}${S.events.length > 1 ? ` · čeká ${S.events.length} zpráv` : ""}</div><h2>${esc(v.t)}</h2><p>${esc(v.txt)}</p>${v.ch.map(c => `<button class="b ch" data-a="event" data-x="[0,${c.i}]" ${c.ok ? "" : "disabled"}>${esc(c.t)}</button>`).join("")}</div>`;
    m.classList.remove("hidden");
  } else if (S.over && !S.overSeen) {
    m.innerHTML = `<div class="box"><h2>${S.over.win ? "Vítězství" : "Konec"}</h2><p>${esc(S.over.txt)}</p><button class="b ch" onclick="S.overSeen=true;render()">${S.over.cont ? "Hrát dál" : "Zavřít"}</button></div>`;
    m.classList.remove("hidden");
  } else m.classList.add("hidden");
}

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
  ${card("Rod", `<div class="crest">${shield(me(), 64)}<div><div class="big">${esc(C.house)}</div><div>${esc(C.n)}</div><div class="muted">${esc(cap(C.t))} ${esc(L ? L.n : "—")}${L ? `, ${age(S, L)} let, zdraví ${Math.round(L.hp)}` : ""}</div><div class="muted">Dědic: ${heir ? esc(heir.n) + " (" + age(S, heir) + ")" : '<b class="bad">žádný</b>'}</div><div class="muted">Římský král: ${hreKingTxt()}</div></div></div>`)}
  ${card("Hlášení rádců", al.map(([c, t]) => `<div class="alert ${c}">${t}</div>`).join("") || '<div class="alert good">Klid. Nic naléhavého.</div>')}
  ${card("Mocnosti", tbl(["Rod", "#Kraje", "#Vojsko", "#Vztah"], top.map(([c, n, m]) => tr([chip(c.id), n, `~${fmt(Math.round(m / 500) * 500)}`, c.id === me() ? "<td></td>" : `<td class="n ${cls(rel(S, me(), c.id), -20, 30)}">${Math.round(rel(S, me(), c.id))}</td>`]))))}
  ${card("Moc rodů (počet krajů)", powerChart(), "wide")}
  ${card(`Poslední zprávy (${MONTHS[S.month]} ${S.year})`, (lastMonth.length ? lastMonth : S.log.filter(l => l.cl && l.cl.includes(me())).slice(0, 8)).slice(0, 20).map(l => `<div class="lg c-${l.cat}"><span class="tag">${MONTHS[l.m].slice(0, 3)} ${l.y}</span>${esc(l.txt)}</div>`).join("") || "—")}
  ${card("Ze světa", world.map(l => `<div class="lg c-${l.cat}"><span class="tag">${MONTHS[l.m].slice(0, 3)} ${l.y}</span>${esc(l.txt)}</div>`).join("") || "—")}
  </div>`;
}
const hreKingTxt = () => S.hre.kingClan ? esc(chr(S, S.hre.king).n) + " (" + esc(S.clans[S.hre.kingClan].house) + ")" + (S.hre.emperor ? ", císař" : "") : S.hre.king ? esc(S.hre.king.slice(4)) : "trůn je prázdný (interregnum)";

// ---------- Mapa ----------
const MX = lon => (lon - 6.6) * 38, MY = lat => (55.1 - lat) * 60;
function svgMap(opts = {}) {
  const ps = Object.values(S.provs), W = 720, H = 570;
  let edges = "", nodes = "", labels = "", arm = "", names = "";
  for (const p of ps) for (const n of p.nb) if (p.id < n) { const q = S.provs[n]; edges += `<line x1="${MX(p.lon).toFixed(1)}" y1="${MY(p.lat).toFixed(1)}" x2="${MX(q.lon).toFixed(1)}" y2="${MY(q.lat).toFixed(1)}" class="road"/>`; }
  for (const p of ps) {
    const x = MX(p.lon), y = MY(p.lat), r = 2.5 + p.castle * 0.9, C = S.clans[p.owner], mine = p.owner === me(), war = atWar(S, me(), p.owner), selp = p.id === SEL.prov;
    nodes += `<g class="pv${selp ? " sel" : ""}" data-a="prov" data-x='["${p.id}"]'><title>${esc(p.n)} – ${esc(C.house)}${knows(S, p) ? `, posádka ${estimate(S, p, men(p.troops))}` : ""}</title><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11" class="hit"/>${C.capital === p.id ? `<path d="M${x - 5} ${y + 3} v-6 l2.5 2 l2.5 -4 l2.5 4 l2.5 -2 v6z" class="capm" fill="${C.col}"/>` : `<rect x="${(x - r).toFixed(1)}" y="${(y - r).toFixed(1)}" width="${(2 * r).toFixed(1)}" height="${(2 * r).toFixed(1)}" class="castle${mine ? " mine" : war ? " war" : ""}" fill="${C.col}"/>`}${p.siege ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" class="siege"/>` : ""}${selp ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="12" class="selring"/>` : ""}</g>`;
    if (p.v >= 3 || mine || selp || C.capital === p.id) labels += `<text x="${(x + 6).toFixed(1)}" y="${(y + 3).toFixed(1)}" class="lbl${mine ? " lm" : ""}">${esc(p.n.split(" a ")[0].replace("Vídeňské Nové Město", "Vídeň. N. Město").replace("Vladimir Volyňský", "Vladimir"))}</text>`;
  }
  for (const c of aliveClans(S)) { const cp = clanProvs(S, c.id); if (cp.length < 4) continue; const x = sum(cp.map(p => MX(p.lon))) / cp.length, y = sum(cp.map(p => MY(p.lat))) / cp.length; names += `<text x="${x.toFixed(0)}" y="${y.toFixed(0)}" class="realmname" text-anchor="middle">${esc(c.house.split(" (")[0].toUpperCase())}</text>`; }
  for (const a of S.armies) { const p = S.provs[a.loc]; const x = MX(p.lon) - 10, y = MY(p.lat) - 8; arm += `<g class="army"><title>Vojsko ${esc(S.clans[a.cl].house)}${a.cl === me() || knows(S, p) ? ": " + Math.round(men(a.t) / 100) * 100 + " mužů" : ""}</title><path d="M${x} ${y} v-10 l9 3.5 l-9 3.5" fill="${S.clans[a.cl].col}"/><line x1="${x}" y1="${y + 2}" x2="${x}" y2="${y - 11}"/></g>`; }
  return `<svg viewBox="0 0 ${W} ${H}" class="map" role="img" aria-label="Politická mapa střední Evropy"><rect width="${W}" height="${H}" class="sea"/><image href="${territoryImage(W, H, MX, MY)}" width="${W}" height="${H}" preserveAspectRatio="none"/>${edges}${names}${nodes}${arm}${labels}</svg>`;
}
function provRow(p) {
  const k = knows(S, p);
  return tr([btn(esc(p.n), "provOnly", [p.id]), chip(p.owner), TERRAIN[p.ter].n, k ? fmt(p.pop * 1000) : "?", k ? `${p.agri}/${agriCap(S, p)}` : "?", k ? `${p.com}/${comCap(S, p)}` : "?", `<td class="n">${k ? estimate(S, p, men(p.troops)) : "?"}</td>`, `${p.castle} (${k ? Math.round(p.dur) : "?"})`, k ? Math.round(p.loy) : "?", p.res.map(r => RES[r]).join(", ") || "—", p.siege ? `<span class="bad">obléhán (${S.clans[p.siege.by].house})</span>` : ""], p.id === SEL.prov ? "sel" : "");
}
function tMapa() {
  const p = S.provs[SEL.prov], f = SEL.provF;
  let ps = Object.values(S.provs); if (f === "moje") ps = ps.filter(x => x.owner === me()); else if (f === "sousede") ps = ps.filter(x => x.owner !== me() && x.nb.some(n => S.provs[n].owner === me())); else if (f === "nepratele") ps = ps.filter(x => atWar(S, me(), x.owner));
  const legend = aliveClans(S).sort((a, b) => clanProvs(S, b.id).length - clanProvs(S, a.id).length).map(c => chip(c.id, c.house.split(" (")[0] + " " + clanProvs(S, c.id).length)).join(" ");
  return `<div class="grid map2">${card("Politická mapa", svgMap() + `<p class="small muted">Barvy = území rodů, tmavé čáry = hranice říší. Čtvereček = hrad (velikost podle úrovně), korunka = sídlo rodu, praporec = vojsko v poli, přerušovaný kruh = obléhání. Klikni na kraj.</p>`)}
  ${card(`${shield(p.owner, 22)} ${esc(p.n)}`, provDetail(p))}
  ${card("Rody", `<div class="legend">${legend}</div>`, "wide")}
  ${card("Kraje", `<div class="row">${[["moje", "moje"], ["sousede", "sousední"], ["nepratele", "nepřátelské"], ["vse", "všechny"]].map(([k, n]) => btn(f === k ? `<b>${n}</b>` : n, "provF", [k])).join("")}</div>` + tbl(["Kraj", "Pán", "Terén", "#Obyvatel", "#Pole", "#Obchod", "#Posádka", "Hrad", "#Spokoj.", "Suroviny", ""], ps.sort((a, b) => a.owner.localeCompare(b.owner) || b.v - a.v).map(provRow)), "wide")}</div>`;
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
  const rows = offs.map(c => { const k = SEL.cmd[c.id] || (c.id === P(S).leader ? "poselstvo" : "zemedelstvi"); SEL.cmd[c.id] = k; const done = c.acted === S.turn;
    return tr([`<b>${esc(c.n)}</b>${c.id === p.lord ? " <span class='tag'>purkrabí</span>" : ""}${c.id === P(S).leader ? " <span class='tag'>hlava rodu</span>" : ""}<div class="small muted">${RANKS[c.rank].n}, věrnost ${Math.round(c.loy)}${traitsTxt(c) ? ", " + traitsTxt(c) : ""}</div>`, statsTd(c),
      done ? '<td colspan="2" class="muted">tento měsíc už jedná</td>' : `<td>${sel("cs_" + c.id, cmdOpts, k, `data-a="cmdSel" data-x='["${c.id}"]'`)}<div class="small muted">${CMDS[k].d}</div></td><td>${cmdParams(c, k, p)} ${btn("Provést", "cmd", [c.id], null, "go")}</td>`]); });
  const myProv = clanProvs(S, me()).sort((a, b) => b.v - a.v);
  const reach = Object.values(S.provs).filter(q => q.id !== p.id && (q.owner === me() || atWar(S, me(), q.owner))).sort((a, b) => dist(p, a) - dist(p, b)).slice(0, 25);
  const cmOpts = [["", "—"]].concat(offs.filter(c => c.acted !== S.turn).map(c => [c.id, `${c.n} (vůd. ${st(c, "ved")}, ${RANKS[c.rank].cmd} mužů)`]));
  return `<div class="row provpick">Kraj: ${sel("pk", myProv.map(q => [q.id, `${q.n}${q.siege ? " (obléhán)" : ""}${officersIn(S, q.id).some(c => c.acted !== S.turn && !c.army) ? " •" : ""}`]), p.id, `data-a="provOnly" data-x='[]'`)}
    <label><input type="checkbox" data-a="deleg" data-x='["${p.id}"]' ${p.deleg ? "checked" : ""}> svěřit správu purkrabímu (rozkazy zadá sám)</label></div>
  <div class="grid">
  ${card(`${shield(me(), 22)} ${esc(p.n)}`, provDetail(p) + `<div class="kv"><span>Měsíční výnos</span><span>${r1(provGold(S, p) + provMines(S, p).gold)} zl</span><span>Sklizeň (září)</span><span>asi ${Math.round(provHarvest(S, p))} obilí</span><span>Výcvik</span><span>${Math.round(p.train)}</span><span>Strop posádky</span><span>${fmt(troopCap(p))}</span><span>Stavba</span><span>${p.build ? BUILD[p.build.b].n + `, zbývá ${p.build.left} měs.` : "—"}</span></div>`)}
  ${card("Posádka", troopBar(p.troops) + troopLegend() + tbl(["Druh", "#Mužů"], TROOP_IDS.map(k => tr([TROOPS[k].n, p.troops[k] || 0]))) + meter("Výcvik", Math.round(p.train), 100, "#a3332b") + `<p class="small">Celkem ${fmt(men(p.troops))} mužů, obranná síla ${r1(provDefense(S, p))}.</p>`)}
  ${card(`Vazalové v kraji – rozkazy (${offs.filter(c => c.acted !== S.turn).length} volných)`, tbl(["Vazal", "#Vůd", "#Uda", "#Roz", "#Spr", "Rozkaz", ""], rows) + `<p class="small muted">Každý vazal vykoná jeden rozkaz za měsíc. Výsledek závisí na jeho schopnostech (správa: rozvoj, vůdcovství: nábor a výcvik, rozum: zvědové, intriky a diplomacie).</p>`, "wide")}
  ${card("Vyslat vojsko", `<div class="kv"><span>Cíl</span>${sel("dto", reach.map(q => [q.id, `${q.n} (${q.owner === me() ? "vlastní" : S.clans[q.owner].house}, ${Math.round(dist(p, q))} km)`]), "")}<span>Druh</span>${sel("dmode", [["utok", "tažení (dobýt kraj)"], ["presun", "přesun posádky do vlastního kraje"]], "utok")}
    ${TROOP_IDS.map(k => `<span>${TROOPS[k].n}</span><span><input type="number" id="dt_${k}" value="${Math.floor((p.troops[k] || 0) * 0.7)}" min="0" max="${p.troops[k] || 0}"> / ${fmt(p.troops[k] || 0)}</span>`).join("")}
    <span>Velitel</span>${sel("dc1", cmOpts, cmOpts[1] ? cmOpts[1][0] : "")}<span>Druhý velitel</span>${sel("dc2", cmOpts, "")}<span>Třetí velitel</span>${sel("dc3", cmOpts, "")}
    <span>Zásoby (měsíce)</span><span><input type="number" id="dmon" value="4" min="1" max="12"> <span class="small muted">12 obilí na 1000 mužů a měsíc</span></span></div><div class="row">${btn("Vytáhnout", "dispatch", [p.id], null, "go")}</div>
    <p class="small muted">Velitelé určují, kolik mužů lze vést (součet podle hodností). Vojsko táhne jeden kraj za měsíc. V nepřátelském kraji oblehne hrad; zteč nařídíš v záložce Vojsko a války.</p>`)}
  </div>`;
}

// ---------- Vazalové ----------
function offCard(c) {
  const nx = RANKS[c.rank + 1], lordOf = Object.values(S.provs).filter(p => p.lord === c.id).map(p => p.n).join(", "), lead = c.id === P(S).leader;
  return `<div class="crest">${shield(me(), 44)}<div><div class="big">${esc(c.n)}</div><div class="muted">${RANKS[c.rank].n}, ${age(S, c)} let${c.hist ? ", historická postava" : ""}${c.dyn ? ", člen rodu" : ""}</div><div class="muted">${traitsTxt(c) || "bez zvláštních vlastností"}</div></div></div>
  ${STAT_IDS.map(k => meter(STATS[k], st(c, k), 100, { ved: "#a3332b", uda: "#b06a2e", roz: "#3f6fa8", spr: "#4f7f4f" }[k])).join("")}
  ${meter("Věrnost", Math.round(c.loy), 100, c.loy < 35 ? "var(--bad)" : "var(--accent2)")}
  ${nx ? meter("Zásluhy do hodnosti " + nx.n, Math.round(c.merit), nx.merit, "#7a5ea8") : ""}
  <div class="kv"><span>Kde</span><span>${c.army ? "s vojskem v poli" : esc(S.provs[c.loc] ? S.provs[c.loc].n : "?")}</span><span>Purkrabí v</span><span>${esc(lordOf) || "—"}</span><span>Velí až</span><span>${fmt(RANKS[c.rank].cmd)} mužům</span><span>Plat</span><span>${c.dyn || lead ? "—" : RANKS[c.rank].pay + " zl/měs."}</span></div>
  ${c.dyn || lead ? "" : `<div class="row">${btn("Povýšit", "promote", [c.id], nx && c.merit >= nx.merit ? null : "Málo zásluh")} <input type="number" id="rw_${c.id}" value="50" min="10" step="10"> ${btn("Odměnit", "reward", [c.id])} ${!lordOf && S.provs[c.loc] && S.provs[c.loc].owner === me() && !c.army ? btn("Jmenovat purkrabím", "lord", [c.loc, c.id]) : ""} ${btn("Propustit", "dismiss", [c.id], null, "danger")}</div>`}`;
}
function tVazalove() {
  const all = officers(S, me()); const k = SEL.sortOff;
  if (!all.some(c => c.id === SEL.off)) SEL.off = all[0] && all[0].id;
  const sorted = all.slice().sort((a, b) => k === "rank" ? b.rank - a.rank || b.merit - a.merit : k === "loy" ? a.loy - b.loy : st(b, k) - st(a, k));
  const rows = sorted.map(c => `<tr class="click${c.id === SEL.off ? " sel" : ""}" data-a="selOff" data-x='["${c.id}"]'><td><b>${esc(c.n)}</b>${c.dyn ? ' <span class="tag">rod</span>' : ""}${Object.values(S.provs).some(p => p.lord === c.id) ? ' <span class="tag">purkrabí</span>' : ""}</td>${tdn(age(S, c))}${STAT_IDS.map(x => statBar(st(c, x))).join("")}<td>${RANKS[c.rank].n}</td>${statBar(c.loy, c.loy < 35 ? "low" : "")}<td>${c.army ? '<span class="warn">v poli</span>' : esc(S.provs[c.loc] ? S.provs[c.loc].n : "?")}</td></tr>`);
  const caps = Object.values(S.chars).filter(c => c.st === "cap" && c.capBy === me()).map(c => tr([esc(c.n), c.cl && S.clans[c.cl] ? chip(c.cl) : "—", ...STAT_IDS.map(x => statBar(st(c, x))), RANKS[c.rank].n, `${btn("Propustit", "captive", [c.id, "propustit"])} ${btn("Výkupné", "captive", [c.id, "vykupne"])} ${btn("Naverbovat", "captive", [c.id, "naverbovat"])} ${btn("Popravit", "captive", [c.id, "popravit"], null, "danger")}`]));
  const mineCap = Object.values(S.chars).filter(c => c.st === "cap" && c.cl === me()).map(c => tr([esc(c.n), chip(c.capBy), RANKS[c.rank].n]));
  const wand = Object.values(S.chars).filter(c => c.st === "wand" && S.provs[c.loc] && S.provs[c.loc].owner === me()).length;
  const sel_ = chr(S, SEL.off);
  return `<div class="grid split">${card(`Vazalové (${all.length})`, `<div class="row">Řadit: ${[["rank", "hodnost"], ["ved", "vůdcovství"], ["uda", "udatnost"], ["roz", "rozum"], ["spr", "správa"], ["loy", "nejméně věrní"]].map(([x, n]) => btn(k === x ? `<b>${n}</b>` : n, "sortOff", [x])).join("")}</div>` +
    tbl(["Jméno", "#Věk", "#Vůdc.", "#Udat.", "#Rozum", "#Správa", "Hodnost", "#Věrnost", "Kde"], rows) + `<p class="small muted">Klikni na vazala pro podrobnosti a odměny. V tvých krajích se potuluje ${wand} schopných mužů – najdeš je rozkazem „Hledat schopné muže“.</p>`)}
    ${sel_ ? card("Vazal", offCard(sel_), "sticky") : ""}
    ${card("Zajatci v tvém žaláři", tbl(["Jméno", "Rod", "#Vůdc.", "#Udat.", "#Rozum", "#Správa", "Hodnost", ""], caps), "wide")}
    ${mineCap.length ? card("Tvoji lidé v zajetí", tbl(["Jméno", "Drží je", "Hodnost"], mineCap)) : ""}</div>`;
}

// ---------- Vojsko ----------
function tVojsko() {
  const mine = S.armies.filter(a => a.cl === me()).map(a => { const p = S.provs[a.loc];
    const tgt = Object.values(S.provs).filter(q => atWar(S, me(), q.owner)).sort((x, y) => dist(p, x) - dist(p, y)).slice(0, 15);
    return tr([`${esc(a.cmds.map(id => chr(S, id).n).join(", ") || "bez velitele")}`, esc(p.n) + (a.path && a.path.length ? ` → ${esc(S.provs[a.to].n)} (${a.path.length} měs.)` : ""), fmt(men(a.t)), troopBar(a.t), `<td class="n ${cls(a.morale, 40, 70)}">${Math.round(a.morale)}</td>`, `<td class="n">${Math.round(a.grain)}</td>`,
      p.siege && p.siege.army === a.id ? `obléhá (${p.siege.months}. měs., hradby ${Math.round(p.dur)}, posádka ${estimate(S, p, men(p.troops))})` : a.mode === "presun" ? "přesun" : "pochod",
      `${btn(a.siegeMode === "ztec" ? "<b>Zteč</b>" : "Zteč", "army", [a.id, "ztec"])} ${btn(a.siegeMode === "obleh" ? "<b>Obléhat</b>" : "Obléhat", "army", [a.id, "obleh"])} ${sel("ato_" + a.id, tgt.map(q => [q.id, q.n]), "")} ${btn("Táhnout", "army", [a.id, "tahnout"])} ${btn("Domů", "army", [a.id, "domu"])}`]); });
  const foes = S.armies.filter(a => a.cl !== me() && (knows(S, S.provs[a.loc]) || atWar(S, me(), a.cl))).map(a => tr([chip(a.cl), esc(S.provs[a.loc].n), knows(S, S.provs[a.loc]) ? estimate(S, S.provs[a.loc], men(a.t)) : "?", a.to ? esc(S.provs[a.to].n) : "", atWar(S, me(), a.cl) ? '<span class="bad">nepřítel</span>' : ""]));
  const wars = S.wars.filter(w => w.a === me() || w.b === me()).map(w => { const o = w.a === me() ? w.b : w.a; return tr([chip(o), `${Math.floor((S.turn - w.start) / 12)} r. ${(S.turn - w.start) % 12} m.`, fmt(clanMen(S, o)) + " (odhad)", clanProvs(S, o).length, allied(S, me(), o) ? "" : ""]); });
  const garr = clanProvs(S, me()).sort((a, b) => men(b.troops) - men(a.troops)).map(p => tr([btn(esc(p.n), "prov", [p.id]), `<td class="wbar">${troopBar(p.troops)}</td>`, ...TROOP_IDS.map(k => p.troops[k] || 0), men(p.troops), Math.round(p.train), p.nb.some(n => atWar(S, me(), S.provs[n].owner)) ? '<span class="bad">fronta</span>' : ""]));
  const bat = S.battles.filter(b => b.a === me() || b.b === me()).slice(0, 25).map(b => tr([b.d, esc(b.place), b.kind, chip(b.a), `${fmt(b.aStart)} → ${fmt(b.aEnd)}`, chip(b.b), `${fmt(b.bStart)} → ${fmt(b.bEnd)}`, b.win === me() ? '<span class="good">vítězství</span>' : '<span class="bad">porážka</span>', `<details><summary>${b.rounds.length} kol</summary>${battleChart(b)}${b.rounds.map((r, i) => `${i + 1}. kolo: ztráty ${r[0]} / ${r[1]} (síla ${r[2]} : ${r[3]})`).join("<br>")}<br>Velitelé: ${esc(b.aCmd)} × ${esc(b.bCmd)}${b.fate.length ? "<br>" + esc(b.fate.join(", ")) : ""}</details>`]));
  return `<div class="grid">${card("Války", tbl(["Nepřítel", "Trvá", "#Jeho vojsko", "#Jeho kraje", ""], wars) + '<p class="small muted">Mír sjednáš poselstvem (záložka Diplomacie nebo rozkaz vazala).</p>')}
  ${card("Nepřátelská a cizí vojska v dohledu", tbl(["Rod", "Kde", "#Mužů", "Cíl", ""], foes))}
  ${card("Tvá vojska v poli", tbl(["Velitelé", "Kde", "#Mužů", "Složení", "#Morálka", "#Obilí", "Stav", "Rozkazy"], mine), "wide")}
  ${card("Posádky", troopLegend() + tbl(["Kraj", "Složení", ...TROOP_IDS.map(k => "#" + TROOPS[k].n.split(" ")[0]), "#Celkem", "#Výcvik", ""], garr), "wide")}
  ${card("Bitvy", tbl(["Kdy", "Kde", "Druh", "Útočník", "#Muži", "Obránce", "#Muži", "Výsledek", "Průběh"], bat), "wide")}</div>`;
}

// ---------- Diplomacie ----------
function relStatus(c) {
  return [atWar(S, me(), c.id) ? '<span class="pill bad">válka</span>' : "", allied(S, me(), c.id) ? '<span class="pill good">spojenec</span>' : "", truceUntil(S, me(), c.id) > S.turn ? `<span class="pill">příměří ${truceUntil(S, me(), c.id) - S.turn} m.</span>` : "", married(S, me(), c.id) ? '<span class="pill">sňatek</span>' : "",
    c.vassalOf === me() ? '<span class="pill good">tvůj vazal</span>' : c.vassalOf ? `<span class="pill">vazal: ${esc(S.clans[c.vassalOf].house.split(" (")[0])}</span>` : "", P(S).vassalOf === c.id ? '<span class="pill">tvůj lenní pán</span>' : "", c.excom > S.turn ? '<span class="pill bad">klatba</span>' : "", (c.ban || 0) > S.turn ? '<span class="pill bad">říšská klatba</span>' : ""].join("");
}
function relBar(r) { const f = (r + 100) / 2; return `<span class="relbar" title="vztah ${Math.round(r)}"><i style="left:${Math.min(50, f)}%;width:${Math.abs(f - 50)}%;background:${r < 0 ? "var(--bad)" : "var(--good)"}"></i><b style="left:50%"></b></span>`; }
function tDiplo() {
  const others = aliveClans(S).filter(c => c.id !== me()).sort((a, b) => clanProvs(S, b.id).length - clanProvs(S, a.id).length);
  if (!others.some(c => c.id === SEL.dip)) SEL.dip = others[0] && others[0].id;
  const rows = others.map(c => `<tr class="click${c.id === SEL.dip ? " sel" : ""}" data-a="selDip" data-x='["${c.id}"]'><td class="shc">${shield(c.id, 20)}</td><td><b>${esc(c.house)}</b><div class="small muted">${esc(c.n)}</div></td>${tdn(clanProvs(S, c.id).length)}${tdn("~" + fmt(Math.round(clanMen(S, c.id) / 500) * 500))}<td class="n">${Math.round(rel(S, me(), c.id))} ${relBar(rel(S, me(), c.id))}</td><td>${relStatus(c)}</td></tr>`);
  const T = S.clans[SEL.dip]; let dossier = "";
  if (T) {
    const L = leaderOf(S, T.id), envoys = officers(S, me()).filter(c => c.acted !== S.turn && !c.army && S.provs[c.loc] && S.provs[c.loc].owner === me()).sort((a, b) => st(b, "roz") - st(a, "roz"));
    const foes = enemiesOf(S, T.id), friends = aliveClans(S).filter(o => o.id !== T.id && allied(S, T.id, o.id)), kin = aliveClans(S).filter(o => o.id !== T.id && married(S, T.id, o.id));
    const best = aliveClans(S).filter(o => o.id !== T.id).sort((a, b) => rel(S, T.id, b.id) - rel(S, T.id, a.id));
    dossier = card("Rod", `<div class="crest">${shield(T.id, 64)}<div><div class="big">${esc(T.house)}</div><div>${esc(T.n)}</div><div class="muted">${esc(cap(T.t))} ${esc(L ? L.n : "—")}${L ? ` (${age(S, L)} let)${L.st === "cap" ? ", v zajetí" : ""}` : ""}</div><div class="muted">${T.hre ? "říšské knížectví" : "mimo říši"}${T.titles.length ? " · " + T.titles.join(", ") : ""}</div></div></div>
      <div>${relStatus(T) || '<span class="muted small">žádné smlouvy</span>'}</div>
      ${meter("Vztah k tobě", Math.round(rel(S, me(), T.id)) + 100, 200, rel(S, me(), T.id) < 0 ? "var(--bad)" : "var(--good)")}
      <div class="kv"><span>Kraje</span><span>${clanProvs(S, T.id).map(p => esc(p.n)).join(", ")}</span><span>Vojsko</span><span>asi ${fmt(Math.round(clanMen(S, T.id) / 500) * 500)} mužů</span><span>Prestiž</span><span>${fmt(T.prestige)}</span><span>Válčí s</span><span>${foes.map(f => chip(f)).join(" ") || "—"}</span><span>Spojenci</span><span>${friends.map(f => chip(f.id)).join(" ") || "—"}</span><span>Spřízněni s</span><span>${kin.map(f => chip(f.id)).join(" ") || "—"}</span><span>Přátelé</span><span>${best.slice(0, 2).map(f => chip(f.id)).join(" ")}</span><span>Nepřátelé</span><span>${best.slice(-2).map(f => chip(f.id)).join(" ")}</span></div>
      <h4>Poselstvo</h4><div class="kv"><span>Vyslanec</span>${sel("env_" + T.id, [["", "— vyber —"]].concat(envoys.map(c => [c.id, `${c.n} (rozum ${st(c, "roz")})`])), envoys[0] ? envoys[0].id : "")}<span>Jednání</span>${sel("dt_" + T.id, Object.entries(DIPLO).map(([k, d]) => [k, d.n]), atWar(S, me(), T.id) ? "mir" : "dar")}</div>
      <div class="row">${btn("Vyslat poselstvo", "dip", [T.id], envoys.length ? null : "Žádný volný vazal", "go")} ${atWar(S, me(), T.id) ? "" : btn(SEL.warConfirm === T.id ? "<b>Opravdu vyhlásit válku?</b>" : "Vyhlásit válku", "war", [T.id], null, "danger")}</div>
      <p class="small muted">Poselstvo spotřebuje měsíční rozkaz vyslance; jeho rozum zvyšuje šanci. Porušení příměří či spojenectví stojí prestiž a přízeň papeže, útok na církevní zemi papeže rozzlobí. Vymře-li spřízněný rod, zdědíš jeho země.</p>`, "sticky");
  }
  return `<div class="grid split">${card("Rody střední Evropy", tbl(["", "Rod", "#Kraje", "#Vojsko", "#Vztah", "Smlouvy"], rows))}${dossier}</div>`;
}

// ---------- Říše a církev ----------
function tRise() {
  const H = S.hre, C = P(S), cands = candidates(S), holders = electorHolders(S);
  const el = Object.entries(holders).map(([t, cid]) => tr([`Kurfiřt – ${t}`, chip(cid), cid === me() ? "ty" : `vztah ${Math.round(rel(S, me(), cid))}`, ""]))
    .concat(EXT_ELECTORS.map(e => tr([esc(cap(e.n)), "mimo mapu", `přízeň k tobě ${Math.round(H.ext[e.id][me()] || 0)}`, H.election ? `<input type="number" id="br_${e.id}" value="100" min="50" step="50"> ${btn("Poslat dary", "bribe", [e.id])}` : ""])));
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
const INC_N = { domeny: "Panské dvory a regálie", kraje: "Daně a dávky z krajů", doly: "Doly a solivary", dan_vazalu: "Poplatky vazalů / lennímu pánovi", rise: "Říšské příjmy", cirkev: "Církevní statky (investitura)" };
const EXP_N = { platy: "Platy vazalů", vojsko: "Vydržování vojska", dvur: "Dvůr", uroky: "Úroky" };
function tHosp() {
  const C = P(S), b = clanBudget(S, me());
  const rows = clanProvs(S, me()).sort((a, c) => provGold(S, c) - provGold(S, a)).map(p => tr([btn(esc(p.n), "prov", [p.id]), r1(provGold(S, p)), r1(provMines(S, p).gold), Math.round(provHarvest(S, p)), r1(garrisonGrain(p)), p.agri, p.com, Math.round(p.loy), p.deleg ? "purkrabí" : "<b>ty</b>"]));
  return `<div class="grid">${card("Měsíční příjmy", tbl(["Zdroj", "#Zlatých"], Object.entries(b.inc).map(([k, v]) => tr([INC_N[k], v]))) + `<p><b>Celkem ${fmt(sum(Object.values(b.inc)))} zl</b></p>`)}
  ${card("Měsíční výdaje", tbl(["Položka", "#Zlatých"], Object.entries(b.ex).map(([k, v]) => tr([EXP_N[k], v]))) + `<p><b>Celkem ${fmt(sum(Object.values(b.ex)))} zl</b> · bilance <b class="${b.net < 0 ? "bad" : "good"}">${sg(b.net)}</b></p>`)}
  ${card("Daně a obilí", `<div class="kv"><span>Daňová zátěž</span>${sel("taxs", TAX_LEVELS.map((t, i) => [i, t]), C.tax, `data-a="tax" data-x='[]'`)}<span>Obilí</span><span>${fmt(C.grain)} (spotřeba posádek a vojsk ${r1(clanGrainUse(S, me()))} měsíčně)</span><span>Poslední žně</span><span>${fmt(C.last.harvest || 0)} (v září)</span><span>Koně / zbroj</span><span>${fmt(C.kone)} / ${fmt(C.zbroj)}</span><span>Inflace</span><span>${Math.round(S.inflation * 100)} %</span></div><p class="small muted">Vyšší daně = víc zlata, ale nižší spokojenost lidu (a tím i výnos a sklizeň).</p>`)}
  ${card("Trh", tbl(["Zboží", "#Máš", "#Nákup", "#Prodej", ""], Object.entries(GOODS).map(([g, G]) => tr([G.n, Math.floor(C[g === "obili" ? "grain" : g] || 0), r1(price(S, g) * 1.15), r1(price(S, g) * 0.85), `<input type="number" id="q_${g}" value="100" min="1" step="50"> ${btn("Koupit", "buy", [g])} ${btn("Prodat", "sell", [g])}`]))) + '<p class="small muted">Koně a zbroj potřebuješ k verbování jízdy a střelců. Hřebčíny a železné doly je vyrábějí.</p>')}
  ${card("Lombardští bankéři", tbl(["#Jistina", "#Úrok/měs.", ""], (C.debts || []).map((d, i) => tr([d.amount, r1(d.amount * d.rate), btn("Splatit", "repay", [i])]))) + `<div class="row"><input type="number" id="loan" value="200" step="100"> ${btn("Půjčit si", "borrow")} <span class="small muted">strop ${maxLoan(S, me())} zl</span></div>`)}
  ${card("Kraje", tbl(["Kraj", "#Zlato/měs.", "#Doly", "#Sklizeň", "#Obilí/měs.", "#Pole", "#Obchod", "#Spokoj.", "Správa"], rows), "wide")}</div>`;
}

// ---------- Stavy a zákony ----------
function tStavy() {
  const C = P(S);
  const est = ESTATE_IDS.map(e => { const t = estateTarget(S, e); return tr([`<b>${ESTATES[e]}</b>`, `<td class="n ${cls(C.estates[e], 30, 60)}">${Math.round(C.estates[e])}</td>`, bar(C.estates[e]), t.val, `<details><summary>proč</summary>${tbl(["Vliv", "#"], t.rows.map(r => tr([esc(r[0]), `<td class="n ${r[1] < 0 ? "bad" : "good"}">${sg(r[1])}</td>`])))}</details>`]); });
  const laws = Object.entries(LAWS).map(([l, L]) => tr([`<b>${L.n}</b><div class="small muted">${L.d}</div>`, sel("law_" + l, L.opts.map((o, i) => [i, o]), C.laws[l], `data-a="law" data-x='["${l}"]' ${(C.lawCd[l] || 0) > S.turn ? "disabled" : ""}`), (C.lawCd[l] || 0) > S.turn ? `za ${C.lawCd[l] - S.turn} měs.` : "lze měnit"]));
  return `<div class="grid">${card("Stavy", tbl(["Stav", "#Věrnost", "", "#Směřuje k", "Rozpis"], est) + '<p class="small muted">Šlechta ovlivňuje věrnost vazalů, duchovenstvo vztah s církví, měšťané výnos obchodu, sedláci spokojenost lidu. Stav pod 25 hrozí krizí.</p>', "wide")}
  ${card("Zákony země", tbl(["Zákon", "Platí", "Změna"], laws) + '<p class="small muted">Změna zákona stojí 20 prestiže a další změna je možná po dvou letech.</p>', "wide")}</div>`;
}

// ---------- Rod ----------
function famCard(c, role) {
  if (!c) return "";
  const H = heirsOf(S, me())[0];
  return `<div class="fam ${c.sex === "f" ? "f" : "m"}${c.st === "dead" ? " dead" : ""}"><div class="fn">${esc(c.n)}${c.id === P(S).leader ? " ♛" : ""}</div><div class="small muted">${role || (c.sex === "m" ? "syn" : "dcera")}, ${age(S, c)} let${H && H.id === c.id ? ", <b>dědic</b>" : ""}${c.st === "cap" ? ", v zajetí" : ""}${c.c ? ", duchovní" : ""}</div>
    <div class="minis">${STAT_IDS.map(k => `<span title="${STATS[k]}"><i style="height:${st(c, k) * 0.28}px"></i></span>`).join("")}</div>
    ${c.spouse && chr(S, c.spouse) && role !== "choť" ? `<div class="small">∞ ${esc(chr(S, c.spouse).n)}</div>` : ""}
    ${c.st === "kid" ? sel("fo_" + c.id, [["", "výchova: volná"], ["ved", "vojevůdce"], ["uda", "rytířská"], ["roz", "učená"], ["spr", "správní"]], c.focus || "", `data-a="focus" data-x='["${c.id}"]'`) : ""}</div>`;
}
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
function tObjevy() {
  const C = P(S), cats = [...new Set(TECH_IDS.map(t => TECHS[t].cat))];
  return `<div class="grid">${card("Učenost", `<p>Zkoumá se: <b>${C.res.cur ? TECHS[C.res.cur].n + ` (${Math.round(C.res.pts)}/${TECHS[C.res.cur].cost})` : "nic"}</b>. Body přinášejí rozkazy „Podporovat učence“ a kláštery.</p>`)}
  ${cats.map(cat => card(cat, tbl(["Objev", "Účinek", "#Cena", ""], TECH_IDS.filter(t => TECHS[t].cat === cat).map(t => { const T = TECHS[t]; return tr([C.techs[t] ? `<span class="good">✔ ${T.n}</span>` : C.res.cur === t ? `<b>▶ ${T.n}</b>` : T.n, `<span class="small">${T.d}${T.req ? " · vyžaduje: " + T.req.map(r => TECHS[r].n).join(", ") : ""}</span>`, T.cost, C.techs[t] || C.res.cur === t ? "" : btn("Zkoumat", "research", [t], techAvail(S, me(), t) ? null : "Chybí předpoklady")]); })))).join("")}</div>`;
}

// ---------- Kronika ----------
function tKronika() {
  const f = SEL.logF; const l = S.log.filter(x => f === "vse" || (f === "moje" ? x.cl && x.cl.includes(me()) : f === "svet" ? !x.cl || !x.cl.includes(me()) : x.cat === f)).slice(0, 400);
  return card("Kronika", `<div class="row">${[["moje", "můj rod"], ["svet", "svět"], ["vse", "vše"], ["valka", "války"], ["rise", "říše"], ["rod", "rody"], ["diplomacie", "diplomacie"], ["rozkazy", "rozkazy"]].map(([k, n]) => btn(f === k ? `<b>${n}</b>` : n, "logF", [k])).join("")}</div><div class="log">${l.map(x => `<div class="lg"><span class="tag">${MONTHS[x.m].slice(0, 3)} ${x.y}</span>${esc(x.txt)}</div>`).join("")}</div>`, "wide");
}

// ---------- Hra ----------
function tHra() {
  const slots = [1, 2, 3, 4, 5].map(n => { const i = slotInfo(n); return tr([n, i ? esc(i) : '<span class="muted">prázdná</span>', btn("Uložit", "save", [n]) + btn("Načíst", "load", [n], i ? null : "Prázdná") + btn("Smazat", "del", [n], i ? null : "Prázdná")]); });
  const clansSel = CLANS.filter(c => c.type === "dyn").map(c => { const n = PROVINCES.filter(p => p[6] === c.id).length, h = HIST.find(x => x.cl === c.id && x.r === "leader"); return [c.id, `${c.house} – ${c.n} (${n} krajů${h ? ", " + h.n : ""})`]; });
  return `<div class="grid">${card("Uložené hry", tbl(["#", "Obsah", ""], slots) + `<p class="small muted">Hra se sama ukládá po každém kroku.</p><div class="row">${btn("Stáhnout do souboru", "exportSave")} ${btn("Nahrát ze souboru", "importSave")}</div>`)}
  ${card("Nová hra – leden 1256", `<div class="kv"><span>Rod</span>${sel("ngClan", clansSel, SEL.ng, `data-a="ngClan" data-x='[]'`)}<span>Semínko náhody</span><input id="ngSeed" type="number" placeholder="náhodné"></div><div class="row">${btn(SEL.ngConfirm ? "<b>Ano, začít</b>" : "Začít novou hru", "newgame")}</div><p class="small muted">Velké rody (Přemyslovci, Arpádovci) jsou nejsnazší. Habsburkové, Wittelsbachové nebo slezští Piastovci začínají malí – to je výzva.</p>`)}
  ${card("Vzhled", btn("Přepnout světlý / tmavý vzhled", "theme"))}
  <section class="card wide help"><h3>Jak hrát</h3>
  <p>Jsi hlavou panovnického rodu ve střední Evropě po pádu Štaufů (od ledna 1256). Kolo je jeden měsíc. <b>Cíl:</b> ovládnout polovinu krajů (sám nebo skrze vazaly), nebo se stát císařem a vládnout třetině krajů. Prohraješ, když přijdeš o všechny kraje.</p>
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
  if (!S || !S.provs || S.v !== 2) S = newGame();
  const f = document.createElement("input"); f.type = "file"; f.id = "impFile"; f.accept = ".json,application/json"; f.style.display = "none"; f.onchange = () => f.files[0] && importFile(f.files[0]); document.body.appendChild(f);
  render();
}
if (typeof document !== "undefined") { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot(); }
