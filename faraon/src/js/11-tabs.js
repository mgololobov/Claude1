// Záložky hry.
const TABS = [["prehled", "Přehled"], ["plan", "Plán měsíce"], ["mapa", "Mapa"], ["zupy", "Župy"], ["urednici", "Úředníci"], ["vojsko", "Vojsko"], ["diplo", "Diplomacie"], ["hosp", "Hospodářství"], ["chramy", "Chrámy a stavy"], ["rod", "Rod"], ["vedeni", "Vědění"], ["kronika", "Kronika"], ["hra", "Hra"]];
const myProvs = () => clanProvs(S, me());
const freeOffs = () => officers(S, me()).filter(c => !cmdCheck(S, me(), c));
function provLink(p) { return `<a class="lnk" data-a="selProv" data-x='["${p.id}"]' style="cursor:pointer;text-decoration:underline dotted">${esc(p.n)}</a>`; }
function ruler() { return leaderOf(S, me()); }
function rulerTitle() { const C = P(S), L = ruler(); return `${L ? esc(L.n) : "—"}, ${esc(C.t)}${C.title ? " (" + esc(C.title) + ")" : ""}`; }

// ---------- záhlaví ----------
function renderTop() {
  const C = P(S), b = clanBudget(S, me()), h = S.flood.h;
  return `<span class="realm">${emblem(me(), 26)}${esc(C.n)}</span>
  <span class="st">${rulerTitle()} · <b>${regYear(S, me())}.</b> rok vlády</span>
  <span class="st">${esc(monthName(S.month))} (${SEASON_D[Math.floor(S.month / 4)]}) · ≈ ${S.bce} př. n. l.</span>
  <span class="st" title="debeny (měděná jednotka hodnoty, ≈ 91 g)">Debeny <b>${fmtK(C.deben)}</b> <span class="small ${b.net < 0 ? "bad" : "good"}">${sg(b.net)}</span></span>
  <span class="st" title="obilí ve státních sýpkách (char ≈ 77 litrů)">Obilí <b>${fmtK(C.grain)}</b> charů</span>
  <span class="st" title="maat – řád světa a oprávněnost vlády">Maat <b>${Math.round(C.maat)}</b></span>
  <span class="st">Sláva <b>${fmt(C.prestige)}</b></span>
  <span class="st" title="poslední záplava">Nil <b>${h ? dec(h) + " l." : "?"}</b></span>
  <span class="sp"></span>
  ${S.over && !S.over.cont ? '<b class="bad">Hra skončila</b>' : `<button class="main" data-a="end" data-x="[]">Konec měsíce ▸</button>`}`;
}
function renderTabs() {
  const idle = freeOffs().length;
  return TABS.map(([k, n]) => `<button class="${SEL.tab === k ? "on" : ""}" data-a="tab" data-x='["${k}"]'>${icon(k)}${n}${k === "plan" && idle ? ` <span class="badge">${idle}</span>` : ""}</button>`).join("");
}

// ---------- Přehled ----------
function alerts() {
  const C = P(S), out = [], b = clanBudget(S, me());
  const idle = freeOffs().length; if (idle) out.push(["warn", `${idle} úředníků čeká na rozkaz (Plán měsíce).`]);
  if (!C.res.cur) out.push(["info", "Písaři nemají zadané vědění k zkoumání (Vědění)."]);
  for (const e of enemiesOf(S, me())) out.push(["bad", `Válka s rodem ${S.clans[e].house}.`]);
  for (const p of Object.values(S.provs).filter(p => p.siege && (p.owner === me() || p.siege.cl === me()))) out.push(["bad", p.owner === me() ? `Župa ${p.n} je obléhána! Hradby ${Math.round(p.dur)}.` : `Obléháš pevnost v župě ${p.n} (hradby ${Math.round(p.dur)}).`]);
  for (const p of myProvs().filter(p => p.hunger > 0.15)) out.push(["bad", `Hlad v župě ${p.n}.`]);
  for (const p of myProvs().filter(p => p.loy < 25)) out.push(["warn", `Lid v župě ${p.n} je nespokojený (${Math.round(p.loy)}).`]);
  if (b.net < 0) out.push(["warn", `Pokladna ztrácí ${fmt(-b.net)} debenů měsíčně.`]);
  const months = C.grain / Math.max(1, -b.gnet); if (months < 8) out.push([months < 3 ? "bad" : "warn", `Obilí v sýpkách vystačí jen asi na ${Math.max(0, Math.floor(months))} měsíců.`]);
  if (!C.tomb.active && C.tomb.stage < TOMB_STAGES.length && regYear(S, me()) > 2) out.push(["info", `Hrobka panovníka (${C.tombN}) – hotovo ${C.tomb.stage} z ${TOMB_STAGES.length} fází (Chrámy a stavy).`]);
  for (const c of officers(S, me()).filter(c => !c.dyn && c.loy < 30)) out.push(["warn", `${c.n} je nevěrný (${Math.round(c.loy)}).`]);
  if (C.tributeTo) out.push(["info", `Platíš tribut rodu ${S.clans[C.tributeTo].house} (10 % výnosu žup).`]);
  if (S.month === 0 && hasTech(S, me(), "nilometr") && S.flood.next) out.push(["info", `Nilometr předpovídá záplavu asi ${dec(S.flood.next - 0.8)}–${dec(S.flood.next + 0.8)} loktů.`]);
  return out;
}
function tPrehled() {
  const C = P(S), b = clanBudget(S, me()), H = S.history.slice(-36), L = ruler();
  const al = alerts();
  const tax = yearTaxEstimate(S, me(), S.flood.h || 15.5);
  const world = (S.worldHist || []).slice(-40);
  const series = aliveClans(S).filter(c => c.type !== "kmen").map(c => ({ name: c.n, col: c.col, bold: c.id === me(), vals: world.map(e => e.p[c.id] || 0) }));
  return `<div class="tiles">
    ${tile("Debeny", fmtK(C.deben), `<span class="${b.net < 0 ? "bad" : "good"}">${sg(b.net)} za měsíc</span>`, sparkline(H.map(x => x.deben)))}
    ${tile("Obilí", fmtK(C.grain), `${sg(b.gnet)} měsíčně · daň ze sklizně ≈ ${fmtK(tax)}`, sparkline(H.map(x => x.grain)))}
    ${tile("Maat", Math.round(C.maat), "řád a oprávněnost vlády", sparkline(H.map(x => x.maat)))}
    ${tile("Sláva", fmt(C.prestige), "vítězství, stavby, výpravy", sparkline(H.map(x => x.prestige)))}
    ${tile("Župy", clanProvs(S, me()).length, `jádro Egypta ${realmCore(S, me())} / ${coreProvs(S).length}`, sparkline(H.map(x => x.provs)))}
    ${tile("Vojsko", fmtK(clanMen(S, me())), `${S.armies.filter(a => a.cl === me()).length} vojsk v poli`, sparkline(H.map(x => x.men)))}
    ${tile("Nil", S.flood.h ? dec(S.flood.h) + " loktů" : "?", S.flood.h ? floodWord(S.flood.h) + " záplava" : "záplava přijde ve 2. měsíci období achet")}
  </div>
  <div class="grid">
    ${card("Co je potřeba", al.length ? al.map(([c, t]) => `<div class="alert ${c}">${esc(t)}</div>`).join("") : '<p class="muted">Vše v pořádku.</p>')}
    ${card("Panovník", L ? `<div class="row">${emblem(me(), 40)}<div><b>${esc(L.n)}</b><div class="small muted">${esc(C.t)}, ${age(S, L)} let, ${regYear(S, me())}. rok vlády${L.note ? " · " + esc(L.note) : ""}</div></div></div>
      <table>${tr(STAT_IDS.map(k => STATS[k]))}${tr(STAT_IDS.map(k => statTd(st(L, k))))}</table>
      <p class="small">Dědic: ${heirsOf(S, me())[0] ? esc(heirsOf(S, me())[0].n) : '<b class="bad">žádný</b>'} · hrobka: ${C.tomb.stage}/${TOMB_STAGES.length} fází · ${esc(C.house)}</p>` : "")}
    ${card("Síla rodů (počet žup)", lineChart(series, world.map(e => e.d)), "wide")}
    ${card("Poslední zprávy", `<div class="log" style="max-height:320px">${S.log.filter(x => !x.cl || x.cl.includes(me())).slice(0, 25).map(x => `<div class="lg c-${x.cat}"><span class="tag">${monthShort(x.m)} ${x.y}</span>${esc(x.txt)}</div>`).join("")}</div>`, "wide")}
  </div>`;
}

// ---------- Plán měsíce ----------
function suggestCmd(c, p) {
  if (p.loy < 32 || p.hunger > 0.2) return "rozdat";
  if (isFront(S, p) && men(p.troops) < troopCap(p) * 0.7) return "odvod";
  if (p.agri < agriCap(S, p) - 1) return "zavlaha";
  if (p.com < comCap(S, p) - 1) return "remesla";
  if (men(p.troops) > 300 && p.train < 50) return "vycvik";
  if (p.dur < durMax(S, p) * 0.8) return "hradby";
  return P(S).res.cur ? "uceni" : "obeti";
}
function cmdParams(c, k, p) {
  const id = c.id;
  if (k === "odvod") { const types = TROOP_IDS.map(t => [t, TROOPS[t].n + (canRecruitType(S, me(), p, t) ? " (nelze)" : ` (${TROOPS[t].cost}/100)`)]); return sel("p1_" + id, types, SEL["p1_" + id] || "kopinici") + ` <input id="p2_${id}" type="number" min="50" step="50" placeholder="max ${maxRecruit(S, p, c)}" title="počet mužů">`; }
  if (k === "stavba") { const opts = Object.entries(BUILD).filter(([b, B]) => !B.need || B.need(p)).map(([b, B]) => { const cst = buildCost(S, me(), b, p); return [b, `${B.n} ${buildLevel(p, b)}→${buildLevel(p, b) + 1} (${fmt(cst.deben)} d., ${fmtK(cst.grain)} ch.)`]; }); return sel("p1_" + id, opts, SEL["p1_" + id]); }
  if (k === "vyprava") return sel("p1_" + id, Object.entries(EXPED).map(([e, E]) => [e, E.n + (expAvail(S, me(), e) ? " (nedostupné)" : ` – ${E.months} měs.`)]), SEL["p1_" + id]);
  if (k === "zvedy" || k === "podnecovat") { const near = Object.values(S.provs).filter(q => q.owner !== me() && q.nb.some(n => S.provs[n].owner === me())); return sel("p1_" + id, near.map(q => [q.id, `${q.n} (${S.clans[q.owner].n})`]), SEL["p1_" + id]); }
  if (k === "naklonit") { const near = new Set(Object.values(S.provs).filter(q => q.owner !== me() && q.nb.some(n => S.provs[n].owner === me())).map(q => q.id)); const xs = Object.values(S.chars).filter(x => x.st === "off" && x.cl !== me() && !x.dyn && near.has(x.loc)); return xs.length ? sel("p1_" + id, xs.map(x => [x.id, `${x.n} (${S.clans[x.cl].n}, ${RANKS[x.rank].n})`]), SEL["p1_" + id]) : '<span class="muted small">v sousedství nikdo</span>'; }
  if (k === "presun") return sel("p1_" + id, myProvs().filter(q => q.id !== p.id).map(q => [q.id, q.n]), SEL["p1_" + id]);
  if (k === "rozdat") return `<input id="p1_${id}" type="number" step="1000" placeholder="${fmt(p.pop * 600)}" title="charů obilí">`;
  return "";
}
function tPlan() {
  const cmdOpts = Object.entries(CMDS).map(([k, K]) => [k, K.n + (K.cost || K.grain ? ` (${K.cost ? K.cost + " d." : ""}${K.cost && K.grain ? ", " : ""}${K.grain ? fmtK(K.grain) + " ch." : ""})` : "")]);
  const ps = myProvs().filter(p => !p.siege).sort((a, b) => (b.id === P(S).capital) - (a.id === P(S).capital) || b.v - a.v);
  let idle = 0; const rows = [];
  for (const p of ps) for (const c of officersIn(S, p.id)) {
    const done = c.acted === S.turn; if (done && !SEL.planDone) continue; if (!done) idle++;
    const k = SEL.cmd[c.id] || suggestCmd(c, p); SEL.cmd[c.id] = k;
    rows.push(tr([`<b>${esc(c.n)}</b>${c.id === P(S).leader ? " ♛" : ""}<div class="small muted">${RANKS[c.rank].n}, věrnost ${Math.round(c.loy)}</div>`, `${provLink(p)}${p.deleg ? '<div class="small muted">svěřeno rádci</div>' : ""}`, statsTd(c),
      done ? '<td colspan="2" class="muted">tento měsíc už jedná</td>' : `<td>${sel("cs_" + c.id, cmdOpts, k, `data-a="cmdSel" data-x='["${c.id}"]'`)}<div class="small muted">${esc(CMDS[k].d)}</div></td><td>${cmdParams(c, k, p)} ${btn("Provést", "cmd", [c.id], null, "go")} ${btn("Rádce", "advise", [c.id])}</td>`], done ? "muted" : ""));
  }
  const away = officers(S, me()).filter(c => c.away || c.moving || c.army).map(c => tr([esc(c.n), c.away ? `výprava: ${EXPED[c.away.exp].n}, návrat za ${c.away.until - S.turn} měs.` : c.moving ? `na cestě do župy ${S.provs[c.moving.to].n}` : "velí vojsku"]));
  const C = P(S), b = clanBudget(S, me());
  return `<div class="tiles">${tile("Volní úředníci", idle, "čekají na rozkaz")}${tile("Debeny", fmtK(C.deben), `<span class="${b.net < 0 ? "bad" : "good"}">${sg(b.net)} za měsíc</span>`)}${tile("Obilí", fmtK(C.grain), "sklizeň v 1. měsíci období šemu")}${tile("Období", SEASONS[Math.floor(S.month / 4)], S.month < 4 ? "záplava: pole jsou pod vodou, robota na stavbách je účinnější" : SEASON_D[Math.floor(S.month / 4)])}</div>
  ${card("Plán měsíce – všichni úředníci na jednom místě", `<div class="row">${btn("Rádce rozhodne za všechny volné", "adviseAll", [], idle ? null : "Nikdo nečeká", "go")} ${btn(SEL.planDone ? "Skrýt ty, kdo už jednají" : "Ukázat i ty, kdo už jednají", "planDone")} <span class="small muted">Předvybraný rozkaz je doporučení podle stavu župy. Úředníci ve svěřených župách jednají na konci měsíce sami.</span></div>` +
    tbl(["Úředník", "Župa", "#Vel.", "#Stat.", "#Moudr.", "#Správa", "Rozkaz", ""], rows), "wide")}
  ${away.length ? card("Mimo službu v župách", tbl(["Úředník", "Kde je"], away)) : ""}`;
}

// ---------- Mapa a panel župy ----------
function provPanel(p) {
  if (!p) return '<p class="muted">Klepni na župu na mapě.</p>';
  const C = S.clans[p.owner], own = p.owner === me(), kn = knows(S, p), L = chr(S, p.lord);
  let h = `<div class="row">${emblem(p.owner, 34)}<div><b style="font-size:16px">${esc(p.n)}</b><div class="small muted">${esc(p.eg)} · ${esc(C.n)} (${esc(C.house)})</div></div></div>`;
  h += `<div class="kv small"><span>Terén</span><span>${TERRAIN[p.ter].n}</span><span>Bůh</span><span>${esc(p.god)}</span><span>Suroviny</span><span>${p.res.map(r => RES[r].n).join(", ") || "—"}</span>`;
  if (kn) h += `<span>Obyvatel</span><span>≈ ${fmt(p.pop * 1000)}</span><span>Správce</span><span>${L ? esc(L.n) : "—"}</span>`;
  h += "</div>";
  if (kn) {
    h += meter("Pole", p.agri, agriCap(S, p), "var(--good)") + meter("Řemesla a obchod", p.com, comCap(S, p), "var(--gold)") + meter("Spokojenost", p.loy, 100, p.loy < 30 ? "var(--bad)" : "") + meter("Hradby", p.dur, durMax(S, p), "var(--muted)");
    h += `<div class="small">Pevnost úrovně ${p.castle} · obecní zásoby ${fmtK(p.stock)} charů${p.hunger > 0.05 ? ` · <b class="bad">hlad</b>` : ""}${p.unrest > S.turn ? " · <b class='bad'>nepokoje</b>" : ""}</div>`;
    h += `<h4>Posádka: ${own ? fmt(men(p.troops)) : estimate(S, p, men(p.troops))} mužů${own ? `, výcvik ${Math.round(p.train)}` : ""}</h4>${own || (p.spy[me()] || 0) > S.turn ? troopBar(p.troops) : ""}`;
    const blds = Object.entries(p.b).filter(([, v]) => v).map(([b, v]) => `${BUILD[b].n.split(" (")[0]} ${v}`);
    h += `<div class="small">Stavby: ${blds.join(", ") || "—"}${p.build ? ` · <b>staví se: ${BUILD[p.build.b].n} (${Math.ceil(p.build.left)} měs.)</b>` : ""}</div>`;
    if (p._lastH) h += `<div class="small muted">Poslední sklizeň ≈ ${fmtK(p._lastH)} charů, daň ${fmtK(p._lastTax)}. Odhad příští daně ≈ ${fmtK(provTax(S, p, S.flood.h || 15.5))}.</div>`;
  } else h += '<p class="small muted">O této župě víš málo. Pošli zvědy (rozkaz Vyzvědět župu).</p>';
  if (p.siege) { const sc = S.clans[p.siege.cl]; h += `<div class="alert bad">Obléhá ${esc(sc.house)} už ${p.siege.m} měs.</div>`; }
  if (own) {
    h += `<h4>Úředníci v župě</h4>` + (officersIn(S, p.id).map(c => `<div class="small">${esc(c.n)} – ${RANKS[c.rank].n}${c.acted === S.turn ? ' <span class="muted">(jedná)</span>' : ""}</div>`).join("") || '<p class="small muted">Nikdo. Pošli sem úředníka rozkazem „Odjet do jiné župy“.</p>');
    h += `<div class="row"><label class="small"><input type="checkbox" data-a="deleg" data-x='["${p.id}"]' ${p.deleg ? "checked" : ""}> svěřit župu rádci (úředníci jednají sami)</label></div>`;
    // vyslat vojsko
    if (men(p.troops) >= 100 && !p.siege) {
      const targets = Object.values(S.provs).filter(q => q.id !== p.id && (q.owner === me() || atWar(S, me(), q.owner) || friendly(S, me(), q.owner))).map(q => [q, findPath(S, me(), p.id, q.id)]).filter(([, path]) => path).sort((a, b) => a[1].length - b[1].length).slice(0, 30);
      const cmds = officersIn(S, p.id).filter(c => c.acted !== S.turn);
      h += `<h4>Vyslat vojsko</h4>` + (targets.length ? `<div class="row">${sel("at_" + p.id, targets.map(([q, path]) => [q.id, `${q.n} – ${q.owner === me() ? "vlastní" : S.clans[q.owner].n} (${path.length} ${path.length === 1 ? "pochod" : "pochody"})`]), SEL["at_" + p.id])}
        ${sel("ap_" + p.id, [["0.25", "čtvrtina"], ["0.5", "polovina"], ["0.75", "tři čtvrtiny"], ["1", "všichni"]], SEL["ap_" + p.id] || "0.75")}
        ${sel("ac_" + p.id, [["", "bez velitele"]].concat(cmds.map(c => [c.id, `${c.n} (velení ${st(c, "ved")})`])), SEL["ac_" + p.id] || (cmds.sort((a, b) => st(b, "ved") - st(a, "ved"))[0] || {}).id || "")}
        ${btn("Vyslat", "send", [p.id], null, "go")}</div><p class="small muted">Cíle: vlastní a spojenecké župy (přesun) a župy nepřátel, se kterými válčíš. Válku vyhlásíš v Diplomacii.</p>` : '<p class="small muted">Žádný dosažitelný cíl – nejsi ve válce.</p>');
    }
  } else if (atWar(S, me(), p.owner)) h += `<p class="small">Jste ve válce. Vojsko pošli ze sousední vlastní župy.</p>`;
  else h += `<div class="row">${btn("Diplomacie s tímto rodem", "dipl", [p.owner])}</div>`;
  return h;
}
function tMapa() {
  if (!SEL.prov || !S.provs[SEL.prov]) SEL.prov = P(S).capital;
  return `<div class="grid map2"><section class="card"><div class="zoom">${Object.entries(ZOOMS).map(([k, Z]) => btn(SEL.zoom === k ? `<b>${Z.n}</b>` : Z.n, "zoom", [k])).join("")}</div>${mapSvg()}
    <div class="tleg">${aliveClans(S).map(c => `<span>${emblem(c.id, 14)} ${esc(c.n)}</span>`).join("")}</div><p class="small muted">Hvězda = sídlo rodu, tečkovaný kruh = obléhání, trojúhelník = vojsko v poli. Barvy území ukazují vládu nad župami; Nil a jeho ramena v Deltě jsou zakreslena podle skutečného toku.</p></section>
    <section class="card sticky">${provPanel(S.provs[SEL.prov])}</section></div>`;
}
function tZupy() {
  const rows = myProvs().sort((a, b) => b.v - a.v).map(p => { const L = chr(S, p.lord); return tr([`${provLink(p)}${p.id === P(S).capital ? " ★" : ""}<div class="small muted">${TERRAIN[p.ter].n}</div>`, L ? esc(L.n) : '<span class="muted">—</span>', tdn(fmt(p.pop * 1000)), tdn(`${p.agri}/${agriCap(S, p)}`), tdn(`${p.com}/${comCap(S, p)}`), tdn(Math.round(p.loy)), tdn(fmt(men(p.troops))), tdn(`${p.castle} (${Math.round(p.dur)})`), tdn(fmtK(provTax(S, p, S.flood.h || 15.5))), tdn(fmt(provDeben(S, p) + provRes(S, p))), p.build ? `${BUILD[p.build.b].n.split(" (")[0]} (${Math.ceil(p.build.left)})` : "", p.hunger > 0.05 ? '<span class="pill bad">hlad</span>' : ""]); });
  return card("Tvé župy", tbl(["Župa", "Správce", "#Lidé", "#Pole", "#Obchod", "#Spokoj.", "#Vojsko", "#Pevnost", "#Daň/rok", "#Deb./měs.", "Stavba", ""], rows) + '<p class="small muted">Daň/rok = odhad obilí ze sklizně při poslední záplavě. Pole a obchod: současná úroveň / strop.</p>', "wide");
}

// ---------- Úředníci ----------
function tUrednici() {
  const C = P(S), offs = officers(S, me()).sort((a, b) => b.rank - a.rank || b.merit - a.merit);
  const rows = offs.map(c => { const p = S.provs[c.loc]; const next = RANKS[c.rank + 1];
    return tr([`<b>${esc(c.n)}</b>${c.id === C.leader ? " ♛" : ""}${c.dyn && c.id !== C.leader ? ' <span class="tag">rod</span>' : ""}${c.hist ? ' <span class="tag" title="' + esc(c.note || "") + '">historický</span>' : ""}<div class="small muted">${c.traits.map(t => TRAITS[t].n).join(", ")}</div>`, `${RANKS[c.rank].n}<div class="small muted">zásluhy ${Math.round(c.merit)}${next ? "/" + next.merit : ""}</div>`, p ? esc(p.n) : "", tdn(age(S, c)), statsTd(c), statTd(c.loy),
      c.id === C.leader ? "" : btn("Povýšit", "promote", [c.id], next && c.merit >= next.merit ? null : "Málo zásluh") + btn("Dar 300", "gift", [c.id, 300]) + (c.dyn ? "" : btn("Propustit", "dismiss", [c.id], null, "danger"))]); });
  const caps = Object.values(S.chars).filter(c => c.st === "cap" && c.cl === me()).map(c => tr([esc(c.n), S.clans[c.capBy] ? esc(S.clans[c.capBy].house) : "?"]));
  const wand = Object.values(S.chars).filter(c => c.st === "wand" && S.provs[c.loc] && S.provs[c.loc].owner === me()).map(c => tr([esc(c.n), esc(S.provs[c.loc].n), statsTd(c)]));
  return `<div class="grid">${card("Úředníci a hodnostáři", tbl(["Jméno", "Hodnost", "Župa", "#Věk", "#Vel.", "#Stat.", "#Moudr.", "#Správa", "#Věrnost", ""], rows) + '<p class="small muted">Věrnost roste s hodností, úřadem, dary, maat a slávou rodu. Nevěrný správce pohraniční župy může přeběhnout i se župou k sousedovi.</p>', "wide")}
  ${officesCard()}
  ${card("Potulní schopní muži ve tvých župách", tbl(["Jméno", "Župa", "#Vel.", "#Stat.", "#Moudr.", "#Správa"], wand) + '<p class="small muted">Získáš je rozkazem „Hledat schopné muže“ v jejich župě.</p>')}
  ${caps.length ? card("Zajatí", tbl(["Jméno", "Drží je"], caps) + '<p class="small muted">Zajatci se vrátí po uzavření míru.</p>') : ""}</div>`;
}
function officesCard() {
  const offs = officers(S, me()).filter(c => !c.army);
  return card("Dvůr a úřady", tbl(["Úřad", "Účinek", "Držitel"], Object.entries(OFFICES).map(([k, O]) => { const h = officeHolder(S, me(), k);
    return tr([`<b>${O.n}</b>`, `<span class="small">${O.d}</span>`, sel("of_" + k, [["", "— neobsazeno —"]].concat(offs.slice().sort((a, b) => st(b, O.stat) - st(a, O.stat)).map(c => [c.id, `${c.n} (${STATS[O.stat].toLowerCase()} ${st(c, O.stat)})`])), h ? h.id : "", `data-a="office" data-x='["${k}"]'`)]); })) + '<p class="small muted">Úřad zvyšuje věrnost držitele. Síla účinku závisí na jeho schopnosti.</p>');
}

// ---------- Vojsko ----------
function tVojsko() {
  const ar = S.armies.filter(a => a.cl === me()).map(a => { const p = S.provs[a.loc]; return tr([esc(p.n), fmt(men(a.t)) + troopBar(a.t), a.cmds.map(id => esc((chr(S, id) || {}).n || "")).join(", ") || "—", a.path.length ? "→ " + esc(S.provs[a.goal].n) + ` (${a.path.length})` : p.siege && p.siege.army === a.id ? "obléhá" : "stojí",
    (p.owner === me() ? btn("Do posádky", "disband", [a.id]) : "") + btn("Zpět domů", "armyHome", [a.id])]); });
  const foe = S.armies.filter(a => a.cl !== me() && atWar(S, a.cl, me()) && knows(S, S.provs[a.loc])).map(a => tr([chip(a.cl), esc(S.provs[a.loc].n), estimate(S, S.provs[a.loc], men(a.t)), a.path.length ? "→ " + esc(S.provs[a.goal].n) : "stojí"]));
  const gar = myProvs().sort((a, b) => men(b.troops) - men(a.troops)).map(p => tr([provLink(p) + (isFront(S, p) ? ' <span class="pill bad">fronta</span>' : ""), tdn(fmt(men(p.troops))), `<td>${troopBar(p.troops)}</td>`, tdn(Math.round(p.train)), tdn(fmt(troopCap(p))), tdn(Math.round(provDefense(S, p)))]));
  const bt = S.battles.filter(b => b.a === me() || b.b === me()).slice(0, 8).map(b => `<details><summary>${esc(b.d)} – ${esc(S.provs[b.place].n)}: ${chipH(b.a)} proti ${chipH(b.b)} – ${(b.win === "A" ? b.a : b.b) === me() ? '<b class="good">vítězství</b>' : '<b class="bad">porážka</b>'} (${b.kind})</summary>${battleChart(b)}${b.fates && b.fates.length ? `<p class="small">${esc(b.fates.join(", "))}</p>` : ""}</details>`).join("");
  return `<div class="grid">${card("Vojska v poli", tbl(["Kde", "Muži", "Velitelé", "Pochod", ""], ar) + '<p class="small muted">Nové vojsko vyšleš z panelu župy na Mapě. S vědomím Říční flotila (nebo z župy s přístavištěm) pluje vojsko po Nilu dvě župy za měsíc. Vojáci jedí 1,5 charu obilí měsíčně.</p>')}
  ${card("Nepřátelská vojska", tbl(["Rod", "Kde", "Muži", "Pochod"], foe))}
  ${card("Posádky žup", troopLegend() + tbl(["Župa", "#Muži", "Složení", "#Výcvik", "#Strop", "#Obrana"], gar), "wide")}
  ${card("Bitvy", bt || '<p class="muted small">Zatím žádné.</p>', "wide")}
  ${card("Druhy vojska", tbl(["Druh", "#Útok", "#Obrana", "#Cena/100", "Poznámka"], TROOP_IDS.map(k => tr([TROOPS[k].n, tdn(TROOPS[k].atk), tdn(TROOPS[k].def), tdn(TROOPS[k].cost), `<span class="small">${TROOPS[k].d || ""}</span>`]))) + '<p class="small muted">Kopiníci s velkými štíty z volské kůže a lučištníci tvořili jádro egyptských vojsk (dřevěné modely egyptských kopiníků a núbijských lučištníků z hrobky Mesehtiho v Asjútu, 11. dynastie). Koně a válečný vůz se do Egypta dostali v době Hyksósů; egyptské vozatajstvo je doloženo až od počátku 18. dynastie.</p>')}</div>`;
}

// ---------- Diplomacie ----------
function relStatus(cid) {
  const C = P(S), O = S.clans[cid], t = [];
  if (atWar(S, me(), cid)) t.push('<span class="pill bad">válka</span>');
  else if (truceUntil(S, me(), cid) > S.turn) t.push(`<span class="pill">příměří ${truceUntil(S, me(), cid) - S.turn} měs.</span>`);
  if (allied(S, me(), cid)) t.push('<span class="pill good">spojenec</span>');
  if (O.vassalOf === me()) t.push('<span class="pill good">tvůj poddaný</span>');
  if (C.vassalOf === cid) t.push('<span class="pill warn">tvůj pán</span>');
  if (C.tributeTo === cid) t.push('<span class="pill warn">platíš mu tribut</span>');
  if (O.tributeTo === me()) t.push('<span class="pill good">platí ti tribut</span>');
  if (S.trade[pairKey(me(), cid)]) t.push('<span class="pill">obchod</span>');
  if (married(S, me(), cid)) t.push('<span class="pill">sňatek</span>');
  if (O.vassalOf && O.vassalOf !== me()) t.push(`<span class="pill">poddaný: ${esc(S.clans[O.vassalOf].n)}</span>`);
  return t.join(" ");
}
function tDiplo() {
  const myP = realmPower(S, me());
  const rows = aliveClans(S).filter(c => c.id !== me()).sort((a, b) => clanProvs(S, b.id).length - clanProvs(S, a.id).length).map(O => { const L = leaderOf(S, O.id), pw = realmPower(S, O.id);
    return tr([`<td class="shc">${emblem(O.id, 26)}</td>`, `<b>${esc(O.n)}</b><div class="small muted">${esc(O.house)}${L ? " · " + esc(L.n) : ""}</div>`, tdn(clanProvs(S, O.id).length), tdn(r1(pw / Math.max(1, myP)).toString().replace(".", ",") + "×"), `<td>${relBar(rel(S, me(), O.id))}</td>`, relStatus(O.id), btn("Jednat", "dipl", [O.id])], SEL.dipl === O.id ? "sel" : "");
  });
  const D = SEL.dipl && S.clans[SEL.dipl] && S.clans[SEL.dipl].alive ? S.clans[SEL.dipl] : null;
  let panel = '<p class="muted">Vyber rod v tabulce.</p>';
  if (D) {
    const id = D.id, war = atWar(S, me(), id), e = dipCheck(S, me(), id), pair = marriagePair(S, me(), id);
    panel = `<div class="row">${emblem(id, 40)}<div><b>${esc(D.n)}</b><div class="small muted">${esc(D.house)} · ${esc(D.t)} · vztah ${Math.round(rel(S, me(), id))} · maat ${Math.round(D.maat)} · sláva ${fmt(D.prestige)}</div></div></div>
      <p class="small">${relStatus(id) || "bez zvláštních vztahů"}</p>
      <div class="row">${btn("Dar 1 000 debenů", "diplo", [id, "dar", 1000], e)} ${btn("Dar 3 000", "diplo", [id, "dar", 3000], e)}</div>
      <div class="row">${war ? btn("Nabídnout mír", "diplo", [id, "mir"], e, "go") : btn("Vyhlásit válku", "diplo", [id, "valka"], e || (S.clans[me()].vassalOf === id ? null : null), "danger")}
      ${btn("Spojenectví", "diplo", [id, "spojenectvi"], e || (war ? "Válčíte" : allied(S, me(), id) ? "Už jste spojenci" : null))}
      ${btn("Obchodní smlouva", "diplo", [id, "obchod"], e || (war ? "Válčíte" : S.trade[pairKey(me(), id)] ? "Už ji máte" : null))}
      ${btn("Žádat poddanství", "diplo", [id, "podruci"], e || (D.vassalOf ? "Už je něčím poddaným" : D.type === "kmen" ? null : null))}
      ${btn("Sňatek", "diplo", [id, "snatek"], e || (pair ? null : "Nejsou volní ženiši a nevěsty"))}
      ${D.vassalOf === me() ? btn("Propustit z poddanství", "diplo", [id, "propustit"], e) : ""}
      ${btn("Proklínací obřad (500 d.)", "diplo", [id, "proklinani"], e || ((P(S).last["p_" + id] || -99) > S.turn - 12 ? "Lze opakovat až za rok" : null))}
      ${P(S).tributeTo === id ? btn("Přestat platit tribut", "diplo", [id, "tribut_stop"], e, "danger") : ""}</div>
      ${pair ? `<p class="small muted">Sňatek: ${esc(pair[0].n)} a ${esc(pair[1].n)}.</p>` : ""}
      <p class="small muted">Poměr sil (tvá říše : jejich) ${dec(warScore(S, me(), id))} : 1. Mír přijmou spíš, když prohrávají nebo válka trvá dlouho. Poddanství přijmou při převaze víc než 3 : 1. Vyhlášení války během příměří nebo proti spojenci poškodí maat. Proklínací obřad (rozbíjení nádob se jmény nepřátel, doložený od Staré po Střední říši) sníží slávu nepřítele a spokojenost jeho pohraničních žup.</p>`;
  }
  return `<div class="grid map2"><section class="card"><h3>Rody a kmeny</h3>${tbl(["", "Rod", "#Župy", "#Síla", "Vztah", "Stav", ""], rows)}</section><section class="card sticky"><h3>Jednání</h3>${panel}</section></div>`;
}

// ---------- Hospodářství ----------
function tHosp() {
  const C = P(S), b = clanBudget(S, me()), INC = { zupy: "Župy (řemesla, trh, lidé)", suroviny: "Doly, lomy a suroviny", obchod: "Obchodní smlouvy", tribut: "Tribut poddaných", chramy: "Zdanění chrámů" }, EX = { dvur: "Dvůr", platy: "Platy úředníků", vojsko: "Výzbroj a údržba vojska", zoldneri: "Žold Médžajů", stavby: "Údržba chrámů a pevností", tribut: "Tribut" }, GX = { vojsko: "Příděly vojákům", urednici: "Příděly úředníkům", dvur: "Dvůr a palác", ztraty: "Ztráty v sýpkách (myši, vlhkost)" };
  const fh = S.flood.hist.slice(-30);
  const fc = S.month === 0 && hasTech(S, me(), "nilometr") ? S.flood.next : null;
  const tax = yearTaxEstimate(S, me(), fc || S.flood.h || 15.5);
  const capQ = marketCap(S, me()), used = C.last.traded === S.turn ? C.last.tradedQ || 0 : 0;
  const ex = Object.entries(EXPED).map(([k, E]) => { const e = expAvail(S, me(), k); return tr([`<b>${E.n}</b>`, E.from.map(id => S.provs[id].n).join(", "), tdn(E.months), `${fmt(E.deben[0])}–${fmt(E.deben[1])}`, tdn(Math.round(E.risk * 100) + " %"), e ? `<span class="small muted">${esc(e)}</span>` : '<span class="good small">dostupná</span>']); });
  return `<div class="grid">
  ${card("Pokladna – debeny měsíčně", tbl(["Příjem", "#Debeny"], Object.entries(b.inc).filter(([, v]) => v).map(([k, v]) => tr([INC[k], tdn(fmt(v))]))) + tbl(["Výdaj", "#Debeny"], Object.entries(b.ex).filter(([, v]) => v).map(([k, v]) => tr([EX[k], tdn(fmt(v))]))) + `<p><b>Celkem ${sg(b.net)} debenů měsíčně.</b></p><p class="small muted">Deben byl jednotkou váhy, ne mincí: v Nové říši asi 91 g, ve starších dobách se jeho hodnota lišila (ve Střední říši se počítalo i v šat). Ceny se vyjadřovaly v debenech mědi, platilo se zbožím. Hra ho používá jako společnou jednotku hodnoty.</p>`)}
  ${card("Sýpky – obilí měsíčně", tbl(["Výdaj", "#Charů"], Object.entries(b.gex).map(([k, v]) => tr([GX[k], tdn(fmt(v))]))) + `<p><b>Měsíčně ${sg(b.gnet)} charů</b>, ročně asi ${fmtK(-b.gnet * 12)}. Daň ze sklizně ${fc ? "podle předpovědi nilometru" : "při poslední záplavě"}: <b>≈ ${fmtK(tax)} charů</b>.</p>
    <div class="row">Daň ze sklizně: ${sel("taxSel", TAX_LEVELS.map((t, i) => [i, `${t} (${Math.round(TAX_RATE[i] * 100)} %)`]), C.tax, `data-a="tax" data-x='[]'`)}</div><p class="small muted">Vyšší daň plní sýpky, ale lid strádá a v hubených letech hladoví. Obilím se rozumí hlavně dvouzrnka (emmer) a ječmen. Daň se vybírá jednou ročně při sklizni v 1. měsíci období šemu.</p>`)}
  ${card("Trh – směna obilí za debeny", `<p>Cena: <b>${dec(S.market.p)} debenu za char</b> (prodej ${dec(S.market.p * 0.8)}, nákup ${dec(S.market.p * 1.25)}). Kupci tento měsíc smění ještě ${fmt(capQ - used)} charů.</p>
    <div class="row"><input id="mktQ" type="number" step="1000" min="0" placeholder="charů"> ${btn("Prodat obilí", "trade", [-1])} ${btn("Koupit obilí", "trade", [1])}</div><p class="small muted">Po slabé záplavě obilí zdraží. Objem směny závisí na řemeslech a obchodu ve tvých župách. V Dér el-Medíně za Nové říše stál char dvouzrnky obvykle 1–2 debeny mědi, v krizi na konci 20. dynastie mnohem víc.</p>`)}
  ${card("Výšky záplav", fh.length ? `<div class="floodbars">${fh.map(x => `<span class="${x.h < 13.5 ? "low" : x.h >= 18 ? "high" : ""}" style="height:${clamp((x.h - 8) / 13 * 100, 4, 100)}%" title="${x.y} př. n. l.: ${dec(x.h)} loktů"></span>`).join("")}</div><div class="small muted">Posledních ${fh.length} let. Červeně hladová, oranžově ničivá záplava.</div>` : '<p class="muted small">První záplava přijde ve 2. měsíci období achet.</p>') + ('<p class="small">Plinius Starší (1. stol. n. l.) zapsal pravidlo: dvanáct loktů znamená hlad, třináct nouzi, čtrnáct radost, patnáct bezpečí a šestnáct hojnost. Velmi vysoká voda strhává hráze. Egyptské letopisy zapisovaly výšky záplav už za Staré říše (Palermská deska).</p>')}
  ${card("Výpravy", tbl(["Cíl", "Výchozí župy", "#Měs.", "Výnos (deb.)", "#Riziko", ""], ex) + '<p class="small muted">Výpravu vede úředník rozkazem „Vést výpravu“. Nápisy výprav se dochovaly ve Vádí Hammámát, v Hatnubu i na Sinaji; výpravy do Puntu vyplouvaly ze Sauu (Marsá Gavásis).</p>', "wide")}</div>`;
}

// ---------- Chrámy a stavy ----------
function tChramy() {
  const C = P(S), tc = tombCost(S, me());
  const laws = Object.entries(LAWS).map(([k, Lw]) => tr([`<b>${Lw.n}</b><div class="small muted">${Lw.d}</div>`, sel("law_" + k, Lw.opts.map((o, i) => [i, o]), C.laws[k], `data-a="law" data-x='["${k}"]'`) + ((C.lawCd[k] || 0) > S.turn ? `<div class="small muted">změna možná za ${C.lawCd[k] - S.turn} měs.</div>` : "")]));
  const temples = myProvs().filter(p => p.b.chram).map(p => tr([provLink(p), esc(p.god), tdn(p.b.chram)]));
  const EST_D = { knezi: "maat a chrámová kázeň", nomarchove: "věrnost úředníků", pisari: "výnos debenů a vědění", lid: "spokojenost žup" };
  return `<div class="grid">
  ${card("Maat a stavy", meter("Maat", C.maat, 100, "var(--gold)") + ESTATE_IDS.map(e => meter(ESTATES[e], C.estates[e], 100, C.estates[e] < 30 ? "var(--bad)" : "")).join("") + `<p class="small muted">${ESTATE_IDS.map(e => `${ESTATES[e]}: ${EST_D[e]}`).join(" · ")}. Maat je řád světa; panovník ji udržuje obětinami, chrámy, spravedlností a vítězstvími. Hlad, zpustošení hrobů a porušené smlouvy ji narušují.</p>`)}
  ${card(`Hrobka panovníka – ${esc(C.tombN)}`, `<div class="small">${TOMB_STAGES.map((t, i) => `<div>${i < C.tomb.stage ? '<span class="good">✔</span>' : i === C.tomb.stage && C.tomb.active ? "▶" : "○"} ${t}</div>`).join("")}</div>
    ${C.tomb.active ? `<p>Pracuje se, zbývá asi ${Math.max(1, Math.ceil(C.tomb.left / (S.month < 4 ? 2 : 1)))} měs.</p>` : C.tomb.stage < TOMB_STAGES.length ? `<div class="row">${btn(`Zahájit fázi „${TOMB_STAGES[C.tomb.stage]}“ (${fmt(tc.deben)} d., ${fmtK(tc.grain)} ch.)`, "tomb", [], null, "go")}</div>` : '<p class="good">Hrobka je dokončena.</p>'}
    <p class="small muted">Když panovník zemře s hrobkou hotovou aspoň do třetí fáze, nástupce získá maat; bez hrobky ji ztratí. Za záplavy (Achet) se staví dvakrát rychleji – rolníci jsou volní pro robotu.</p>`)}
  ${card("Velké stavby", tbl(["Stavba", "Kde", "Postup", "Účinek po dokončení", ""], MON_IDS.map(id => { const M = MONUMENTS[id], st_ = monState(S, id), e = monCheck(S, me(), id), c = monCost(S, me(), id);
      return tr([`<b>${M.n}</b><div class="small muted">${esc(M.d)}</div>`, esc([...new Set([M.at].concat(M.need || []))].map(x => S.provs[x].n).join(", ")), `${st_.stage}/${M.stages}${st_.active ? ` <span class="small">(pracuje se, ${Math.max(1, Math.ceil(st_.left / (S.month < 4 ? 2 : 1)))} měs.)</span>` : ""}${st_.by && st_.by !== me() ? `<div class="small muted">stavěl ${esc(S.clans[st_.by].n)}</div>` : ""}`, `<span class="small">${esc(M.eff)}</span>`,
        st_.stage >= M.stages ? '<span class="good">✔</span>' : btn(`Další fáze (${fmtK(c.deben)} d., ${fmtK(c.grain)} ch.)`, "mon", [id], e, "go")]); })) + '<p class="small muted">Každá fáze trvá šest měsíců, za záplavy polovinu. Stavba patří župě: kdo ji dobude, převezme i rozestavěné dílo. Hotové stavby se počítají do odkazu rodu.</p>', "wide")}
  ${card("Zákony", tbl(["Zákon", "Nastavení"], laws), "wide")}
  ${card("Chrámy", tbl(["Župa", "Bůh", "#Úroveň"], temples) + '<p class="small muted">Chrám staví úředník rozkazem „Řídit stavbu“. Každá úroveň dává maat, spokojenost a body vědění.</p>')}</div>`;
}

// ---------- Rod ----------
function famCard(c, role) {
  if (!c) return ""; const H = heirsOf(S, me())[0];
  return `<div class="fam ${c.sex === "f" ? "f" : ""}"><div class="fn">${esc(c.n)}${c.id === P(S).leader ? " ♛" : ""}</div><div class="small muted">${role || (c.sex === "m" ? "syn" : "dcera")}, ${age(S, c)} let${H && H.id === c.id ? ", <b>dědic</b>" : ""}${c.st === "cap" ? ", v zajetí" : ""}</div>
    <div class="minis">${STAT_IDS.map(k => `<span title="${STATS[k]} ${st(c, k)}"><i style="height:${st(c, k) * 0.28}px"></i></span>`).join("")}</div>
    ${c.note ? `<div class="small muted">${esc(c.note)}</div>` : ""}
    ${c.spouse && chr(S, c.spouse) && role !== "choť" ? `<div class="small">∞ ${esc(chr(S, c.spouse).n)}</div>` : ""}
    ${c.st === "kid" ? sel("fo_" + c.id, [["", "výchova: volná"], ["ved", "vojenská"], ["uda", "lovy a zápas"], ["roz", "dům života (písař)"], ["spr", "správa statků"]], c.focus || "", `data-a="focus" data-x='["${c.id}"]'`) : ""}</div>`;
}
function tRod() {
  const C = P(S), L = ruler(), sp = L && chr(S, L.spouse), H = heirsOf(S, me());
  const kids = L ? L.kids.map(id => chr(S, id)).filter(c => c && c.st !== "dead") : [];
  const others = Object.values(S.chars).filter(c => c.cl === me() && c.dyn && c.st !== "dead" && c !== L && c !== sp && !kids.includes(c));
  const dead = Object.values(S.chars).filter(c => c.dyn && c.st === "dead" && c.cl === me()).slice(-15).map(c => tr([esc(c.n), esc(c.died || "")]));
  const canKing = C.t !== "král" && C.cul === "eg" && clanProvs(S, me()).length >= 6;
  return `<div class="grid">${card("Rodokmen – " + esc(C.house), `<div class="tree"><div class="gen">${famCard(L, cap(C.t))}${sp ? famCard(sp, "choť") : '<div class="fam empty">bez choti</div>'}</div>
    ${kids.length ? `<div class="stem"></div><div class="gen">${kids.map(c => famCard(c)).join("")}</div>` : '<p class="muted small">Zatím bez potomků.</p>'}
    ${others.length ? `<h4>Další členové rodu</h4><div class="gen">${others.map(c => famCard(c, c.sex === "m" ? "příbuzný" : "příbuzná")).join("")}</div>` : ""}</div>
    <p class="small muted">Dědic: ${H[0] ? esc(H[0].n) : '<b class="bad">žádný</b>'} (${LAWS.nastupnictvi.opts[C.laws.nastupnictvi]}). Sloupce: velení, statečnost, moudrost, správa. Synové v 15 letech vstupují do služby. Sňatky s jinými rody dohodneš v Diplomacii. Bez dědice převezme vládu nejschopnější úředník a založí novou dynastii.</p>`, "wide")}
  ${card("Královský titul", C.t === "král" ? `<p>${esc(L ? L.n : "")} nosí titul krále Horního a Dolního Egypta.</p>` : `<p>Jsi ${esc(C.t)}. Kdo ovládne aspoň šest žup, může přijmout královskou titulaturu a pět jmen panovníka – jako Intefové v Thébách.</p>${btn("Prohlásit se králem", "king", [], canKing ? null : "Potřebuješ aspoň 6 žup (a egyptský rod)", "go")}<p class="small muted">Vazalské pouto k pánovi se tím zpřetrhá a hrozí válka.</p>`)}
  ${card("Odkaz rodu", legacyCard())}
  ${card("Spřízněné rody", aliveClans(S).filter(c => married(S, me(), c.id)).map(c => chip(c.id)).join(" ") || "—")}
  ${card("Zesnulí", tbl(["Jméno", "Zemřel(a)"], dead))}</div>`;
}

function legacy() {
  const C = P(S), ps = clanProvs(S, me());
  return [["Župy egyptského jádra (i poddaných)", realmCore(S, me()) * 10], ["Ostatní župy", ps.filter(p => !p.flags.includes("e")).length * 4], ["Chrámy (úrovně)", sum(ps.map(p => (p.b.chram || 0) * 6))], ["Pevnosti nad první úroveň", sum(ps.map(p => Math.max(0, p.castle - 1) * 2))],
    ["Hrobka panovníka", C.tomb.stage * 15], ["Maat", Math.round(C.maat)], ["Sláva", Math.round(C.prestige / 10)], ["Vědění", Object.keys(C.techs).length * 3], ["Velké stavby (fáze)", monCount(S, me()) * 10], ["Sjednocení Obou zemí", S.flags.won ? 200 : 0]];
}
function legacyCard() { const it = legacy(); return tbl(["Co zůstane", "#Body"], it.filter(x => x[1]).map(([n, v]) => tr([n, tdn(fmt(v))]))) + `<p><b>Celkem ${fmt(sum(it.map(x => x[1])))} bodů.</b></p><p class="small muted">Tak by tvou vládu hodnotili písaři budoucích letopisů. Slouží k porovnání her.</p>`; }

// ---------- Vědění ----------
function tVedeni() {
  const C = P(S), cats = [...new Set(TECH_IDS.map(t => TECHS[t].cat))];
  return `<div class="grid">${card("Dům života", `<p>Zkoumá se: <b>${C.res.cur ? TECHS[C.res.cur].n + ` (${Math.round(C.res.pts)}/${techCost(S, me(), C.res.cur)})` : "nic"}</b>. Body přinášejí rozkaz „Dům života“ a chrámy.</p><p class="small muted">Vědění, které znají sousedé nebo nepřátelé, se učí o třetinu levněji – tak se do Egypta dostal válečný vůz a kompozitní luk.</p>`)}
  ${cats.map(cat => card(cat, tbl(["Vědění", "Účinek", "#Cena", ""], TECH_IDS.filter(t => TECHS[t].cat === cat).map(t => { const T = TECHS[t]; return tr([C.techs[t] ? `<span class="good">✔ ${T.n}</span>` : C.res.cur === t ? `<b>▶ ${T.n}</b>` : T.n, `<span class="small">${T.d}${T.req ? " · vyžaduje: " + T.req.map(r => TECHS[r].n).join(", ") : ""}</span>`, tdn(techCost(S, me(), t)), C.techs[t] || C.res.cur === t ? "" : btn("Zkoumat", "research", [t], techAvail(S, me(), t) ? null : "Chybí předpoklady")]); })))).join("")}</div>`;
}

// ---------- Kronika ----------
function tKronika() {
  const f = SEL.logF; const l = S.log.filter(x => f === "vse" || (f === "moje" ? x.cl && x.cl.includes(me()) : f === "svet" ? !x.cl || !x.cl.includes(me()) : x.cat === f)).slice(0, 400);
  return card("Kronika", `<div class="row">${[["moje", "můj rod"], ["svet", "svět"], ["vse", "vše"], ["valka", "války"], ["nil", "Nil"], ["rod", "rody"], ["diplomacie", "diplomacie"], ["rozkazy", "rozkazy"], ["intriky", "intriky"]].map(([k, n]) => btn(f === k ? `<b>${n}</b>` : n, "logF", [k])).join("")}</div><div class="log">${l.map(x => `<div class="lg c-${x.cat}"><span class="tag">${monthShort(x.m)} ${x.y}</span>${esc(x.txt)}</div>`).join("")}</div>`, "wide");
}

// ---------- Hra ----------
const SCEN_CACHE = {};
function tHra() {
  const slots = [1, 2, 3, 4, 5].map(n => { const i = slotInfo(n); return tr([n, i ? esc(i) : '<span class="muted">prázdná</span>', btn("Uložit", "save", [n]) + btn("Načíst", "load", [n], i ? null : "Prázdná") + btn("Smazat", "del", [n], i ? null : "Prázdná")]); });
  const sc = SEL.ngScen, Sc = SCENARIOS[sc];
  const clans = Sc.clans.filter(c => c.type !== "kmen");
  if (!clans.some(c => c.id === SEL.ngClan)) SEL.ngClan = clans[0].id;
  const histNote = id => (Sc.hist.find(h => h.cl === id && h.r === "leader") || {}).n || "";
  return `<div class="grid">${card("Nová hra", `<div class="kv"><span>Scénář</span>${sel("ngScen", Object.entries(SCENARIOS).map(([k, x]) => [k, x.n]), sc, `data-a="ngScen" data-x='[]'`)}<span></span><span class="small muted">${esc(Sc.d)}</span>
    <span>Rod</span>${sel("ngClan", clans.map(c => [c.id, `${c.n} – ${c.house} (${c.provs.length} žup${histNote(c.id) ? ", " + histNote(c.id) : ""})`]), SEL.ngClan, `data-a="ngClan" data-x='[]'`)}
    <span>Obtížnost</span>${sel("ngDiff", [[0, "Snadná"], [1, "Obvyklá"], [2, "Těžká"]], SEL.ngDiff, `data-a="ngDiff" data-x='[]'`)}
    <span>Mlha</span><label><input type="checkbox" id="ngFog" ${SEL.ngFog === false ? "" : "checked"} data-a="ngFog" data-x='[]'> o vzdálených župách víš jen odhady</label>
    <span>Semínko</span><input id="ngSeed" type="number" placeholder="náhodné"></div>
    <div class="row">${btn(SEL.ngConfirm ? "<b>Ano, začít</b>" : "Začít novou hru", "newgame", [], null, "go")}</div>
    <p class="small muted">Thébané a Hérakleopolští (2070), Hérakleopolští (2120) nebo Thébané a Hyksósové (1560) jsou velké říše. Anchtifi (2120) má dvě župy a válku se dvěma sousedy. Nomarchové Asjútu, Hermopole, Beni Hasanu nebo kníže Teti začínají s jedinou župou – to je výzva.</p>`)}
  ${card("Uložené hry", tbl(["#", "Obsah", ""], slots) + `<p class="small muted">Hra se sama ukládá po každém kroku (v tomto prohlížeči).</p><div class="row">${btn("Stáhnout do souboru", "exportSave")} ${btn("Nahrát ze souboru", "importSave")} ${btn("Světlý / tmavý vzhled", "theme")}</div>
    <h4>Uložení jako text</h4><p class="small muted">Kde stahování nefunguje (např. ve sdílené stránce), zkopíruj hru jako text a ulož si ji kamkoli; vložením textu ji později obnovíš.</p>
    <textarea id="saveTxt" rows="3" style="width:100%;font:12px monospace;background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:4px" placeholder="sem se vloží nebo zkopíruje uložená hra">${esc(SEL.saveTxt || "")}</textarea>
    <div class="row">${btn("Zkopírovat hru jako text", "copySave")} ${btn("Načíst hru z textu", "pasteSave")}</div>`)}
  <section class="card wide help"><h3>Jak hrát</h3>
  <p>Jsi hlavou vládnoucího rodu nebo rodu nomarchů v době, kdy je Egypt rozdělený. Jedno kolo je jeden měsíc egyptského občanského roku: tři období po čtyřech měsících o třiceti dnech – achet (záplava), peret (vzcházení, setí) a šemu (sklizeň, léto) – a na konci pět dní navíc. Skutečný občanský kalendář se vůči ročním obdobím posouval; hra ho drží v souladu se záplavou. <b>Cíl:</b> sjednotit Horní a Dolní Egypt – ovládnout (sám nebo skrze poddané) devět desetin žup egyptského jádra. Prohraješ, když přijdeš o všechny župy.</p>
  <h4>Měsíc</h4><p>V záložce <b>Plán měsíce</b> dáš každému úředníkovi jeden rozkaz: kanály a hráze, dílny a trhy, hradby, odvod, výcvik, rozdělení obilí, sčítání, obětiny, hledání schopných mužů, dům života, stavby, výpravy, zvědy, intriky nebo přesun. Župy svěřené rádci spravuje umělá inteligence sama. Pak stiskni <b>Konec měsíce</b>.</p>
  <h4>Nil a obilí</h4><p>Ve 2. měsíci období achet ukážou značky na březích výšku záplavy v loktech (královský loket ≈ 52 cm). Ta rozhodne o sklizni v 1. měsíci období šemu, kdy písaři vyberou daň v obilí. Obilím platíš příděly vojákům a úředníkům i robotníky na stavbách. Obecní sýpky v župách chrání lid před hladem; při nízké záplavě je doplň rozkazem „Rozdat obilí“. Debeny (měděná jednotka hodnoty) plynou z řemesel, obchodu, dolů a výprav.</p>
  <h4>Válka</h4><p>Válku vyhlásíš v Diplomacii, vojsko vyšleš z panelu župy na Mapě. Vojsko táhne jednu župu za měsíc, s říční flotilou dvě. Bitva má až šest kol; rozhoduje počet, druh vojska, výcvik, vědění, terén, hradby a velitel. Pevnosti se obléhají – hradby z nepálených cihel padnou, nebo posádka vyhladoví. Kmeny Libyjců, Aamu, Médžajů a Núbijců podnikají nájezdy.</p>
  <h4>Úředníci a maat</h4><p>Věrnost úředníků závisí na hodnosti, úřadech, darech, maat a slávě. Nevěrný nomarcha pohraniční župy může přeběhnout i se župou. Maat udržuješ obětinami, chrámy, péčí o hladové a hrobkou panovníka; po třiceti letech vlády můžeš slavit svátek sed.</p></section>
  <section class="card wide help"><h3>Slovníček</h3><div class="kv small">
  <span>achet, peret, šemu</span><span>tři období egyptského roku: záplava, vzcházení a setí, sklizeň</span>
  <span>loket (meh)</span><span>královský loket ≈ 52,4 cm; v loktech se měřila výška záplavy</span>
  <span>char</span><span>dutá míra na obilí, v Nové říši ≈ 77 litrů</span>
  <span>deben</span><span>jednotka váhy (v Nové říši ≈ 91 g); ceny se vyjadřovaly v debenech mědi, mince Egypt neznal</span>
  <span>dvouzrnka a ječmen</span><span>hlavní obilniny; z dvouzrnky (emmeru) se pekl chléb, z ječmene vařilo pivo</span>
  <span>župa (sepat, řecky nomos)</span><span>správní oblast; Horní Egypt měl 22 žup, Dolní Egypt postupně 20</span>
  <span>nomarcha</span><span>řecký název pro správce župy, egyptsky „velký představený župy“ (heri-tep aa)</span>
  <span>seš, semer uati, hatia, iri-pat</span><span>písař, „jediný přítel“ krále, představený (starosta, kníže), přední muž země – hodnostní tituly</span>
  <span>tjati</span><span>vezír, nejvyšší úředník po králi</span>
  <span>maat</span><span>řád světa, pravda a spravedlnost; udržovat ji bylo hlavní povinností krále</span>
  <span>heka chasut</span><span>„vládci cizích zemí“, z toho řecké Hyksósové</span>
  <span>Aamu, Tjehenu, Médžajové</span><span>egyptská označení pro Asiaty, Libyjce a pouštní kmeny Východní pouště</span>
  <span>Kuš, Vavat</span><span>Horní Núbie s centrem v Kermě a Dolní Núbie mezi 1. a 2. kataraktem</span>
  <span>svátek sed</span><span>jubileum obnovy královské moci, zpravidla po třiceti letech vlády</span>
  <span>dům života</span><span>chrámová dílna písařů, kde se opisovaly a uchovávaly texty</span>
  <span>robota</span><span>pracovní povinnost pro stát, hlavně v době záplavy</span></div></section>
  <section class="card wide help"><h3>Historické pozadí a zdroje</h3>
  <p><b>První přechodné období (≈ 2160–2055 př. n. l.):</b> po pádu Staré říše vládli v Hérakleopoli králové 9. a 10. dynastie („dům Chetiho“), v Thébách se Intefové 11. dynastie prohlásili králi. O Thinidu a Abydos se bojovalo; Ponaučení pro Merikarea lituje zpustošení hrobů v Thinidě. Nomarchové Asjútu (Tefibi, Cheti II.) stáli při Hérakleopoli, nomarcha Anchtifi z Moally líčí velký hlad. O generaci dříve (≈ 2120 př. n. l.) se nomarcha Anchtifi z Moally zmocnil župy Edfu a bojoval s Thébami a Koptem. Egypt nakonec sjednotil Montuhotep II. (vládl ≈ 2055–2004 př. n. l.), zřejmě až po dvaceti a více letech vlády.</p>
  <p><b>Druhé přechodné období (≈ 1650–1550 př. n. l.):</b> Hyksósové 15. dynastie („vládci cizích zemí“, heka chasut) vládli z Avaridu (Tell el-Dab'a), Kuš z Kermy ovládla Núbii a egyptské pevnosti u 2. kataraktu. Thébská 17. dynastie byla na Hyksósech zřejmě závislá. Papyrus Sallier I. (sepsaný až za 19. dynastie) vypráví o sporu Apopiho a Sekenenrea kvůli hrochům; Sekenenreova mumie nese smrtelné rány. Stély krále Kamoseho popisují tažení k Avaridu, hranici u Kúsaje i zachycený dopis vládci Kuše. Ahmose I. (vládl od ≈ 1550 př. n. l.) dobyl Avaris a vyhnal Hyksósy – popisuje to životopis Ahmose, syna Ebany, v jeho hrobce v Elkabu.</p>
  <p><b>Co je historické a co herní:</b> župy, jejich egyptská jména, bohové, suroviny, výpravy, kalendář, nilometr, příděly obilí, debeny, hodnosti a titulatura vycházejí z egyptologie. Jména vládců a doložených hodnostářů odpovídají pramenům; roky narození, schopnosti, povahy a všichni ostatní úředníci jsou herní. Letopočty se drží střední chronologie (I. Shaw, The Oxford History of Ancient Egypt), nejistota je desítky let. Výšky záplav jsou náhodné, ale klima Prvního přechodného období je sušší (pokles záplav kolem roku 2200 př. n. l.).</p></section></div>`;
}
