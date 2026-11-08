// Karty s portréty místo tabulek, ilustrované události, bitevní scéna a úvodní obrazovka.

const statMini = c => `<div class="smini">${STAT_IDS.map(k => `<span title="${STATS[k]} ${st(c, k)}"><em>${STATS[k][0]}</em><i style="width:${st(c, k)}%;background:${{ ved: "#a3332b", uda: "#b06a2e", roz: "#3f6fa8", spr: "#4f7f4f" }[k]}"></i></span>`).join("")}</div>`;
const loyIcon = v => `<span class="loy ${v < 35 ? "bad" : v < 60 ? "warn" : "good"}" title="Věrnost ${Math.round(v)}">♥ ${Math.round(v)}</span>`;

// ---------- vazalové ----------
function offTile(c, selected) {
  const lordOf = Object.values(S.provs).filter(p => p.lord === c.id).map(p => p.n);
  return `<div class="otile${selected ? " sel" : ""}${c.acted === S.turn ? " acted" : ""}" data-a="selOff" data-x='["${c.id}"]'>${portrait(c, 58)}<div class="oti"><b>${esc(c.n)}</b><div class="small muted">${RANKS[c.rank].n}${c.dyn ? " · rod" : ""}${c.burgher ? " · měšťan" : ""}${lordOf.length ? " · purkrabí" : ""}</div>${statMini(c)}${ambBadges(c)}<div class="small">${loyIcon(c.loy)} <span class="muted">${c.army ? "v poli" : esc(S.provs[c.loc] ? S.provs[c.loc].n : "?")}</span></div></div></div>`;
}
function offCard(c) {
  const nx = RANKS[c.rank + 1], lordOf = Object.values(S.provs).filter(p => p.lord === c.id).map(p => p.n).join(", "), lead = c.id === P(S).leader;
  const lb = c.dyn || lead ? null : offLoyBreakdown(S, c);
  return `<div class="bigport">${portrait(c, 120)}<div><div class="big">${esc(c.n)}</div><div class="muted">${RANKS[c.rank].n}, ${age(S, c)} let${c.hist ? ", historická postava" : ""}${c.dyn ? ", člen rodu" : ""}</div><div class="muted">${traitsTxt(c) || "bez zvláštních vlastností"}${c.burgher ? " · měšťan" : ""}${Object.entries(P(S).offices || {}).filter(([, v]) => v === c.id).map(([k]) => " · " + OFFICES[k].n).join("")}</div>
    <div class="kv small"><span>Kde</span><span>${c.army ? "s vojskem v poli" : esc(S.provs[c.loc] ? S.provs[c.loc].n : "?")}</span><span>Purkrabí</span><span>${esc(lordOf) || "—"}</span><span>Velí až</span><span>${fmt(RANKS[c.rank].cmd)} mužům</span></div></div></div>
  ${ambDetail(c)}
  ${STAT_IDS.map(k => meter(STATS[k], st(c, k), 100, { ved: "#a3332b", uda: "#b06a2e", roz: "#3f6fa8", spr: "#4f7f4f" }[k])).join("")}
  ${meter("Věrnost", Math.round(c.loy), 100, c.loy < 35 ? "var(--bad)" : "var(--accent2)")}
  ${lb ? `<details><summary>Proč je věrný(á) – směřuje k ${lb.val}</summary>${lb.rows.map(r => `<div class="why"><span>${esc(r[0])}</span><b class="${r[1] < 0 ? "bad" : "good"}">${sg(r[1])}</b></div>`).join("")}</details>` : ""}
  ${nx ? meter("Zásluhy do hodnosti " + nx.n, Math.round(c.merit), nx.merit, "#7a5ea8") : ""}
  ${c.dyn || lead ? "" : `<div class="row">${btn("Povýšit", "promote", [c.id], nx && c.merit >= nx.merit ? null : "Málo zásluh")} <input type="number" id="rw_${c.id}" value="50" min="10" step="10"> ${btn("Odměnit", "reward", [c.id])} ${!lordOf && S.provs[c.loc] && S.provs[c.loc].owner === me() && !c.army ? btn("Jmenovat purkrabím", "lord", [c.loc, c.id]) : ""} ${btn("Propustit", "dismiss", [c.id], null, "danger")}</div>`}`;
}
function tVazalove() {
  const all = officers(S, me()); const k = SEL.sortOff;
  if (!all.some(c => c.id === SEL.off)) SEL.off = all[0] && all[0].id;
  const sorted = all.slice().sort((a, b) => k === "rank" ? b.rank - a.rank || b.merit - a.merit : k === "loy" ? a.loy - b.loy : st(b, k) - st(a, k));
  const caps = Object.values(S.chars).filter(c => c.st === "cap" && c.capBy === me());
  const mineCap = Object.values(S.chars).filter(c => c.st === "cap" && c.cl === me());
  const sel_ = chr(S, SEL.off);
  return `<div class="grid split">${card(`Vazalové (${all.length} z ${offCap(S, me())})`, `<div class="row">Řadit: ${[["rank", "hodnost"], ["ved", "vůdcovství"], ["uda", "udatnost"], ["roz", "rozum"], ["spr", "správa"], ["loy", "nejméně věrní"]].map(([x, n]) => btn(k === x ? `<b>${n}</b>` : n, "sortOff", [x])).join("")}</div><div class="otiles">${sorted.map(c => offTile(c, c.id === SEL.off)).join("")}</div>`)}
    ${sel_ ? card("Vazal", offCard(sel_), "sticky") : ""}
    ${officesCard()}
    ${card("Zajatci v tvém žaláři", caps.length ? `<div class="otiles">${caps.map(c => `<div class="otile">${portrait(c, 58)}<div class="oti"><b>${esc(c.n)}</b><div class="small muted">${c.cl && S.clans[c.cl] ? esc(S.clans[c.cl].house) : "bez pána"} · ${RANKS[c.rank].n}</div>${statMini(c)}<div class="row">${btn("Propustit", "captive", [c.id, "propustit"])}${btn("Výkupné", "captive", [c.id, "vykupne"])}${btn("Naverbovat", "captive", [c.id, "naverbovat"])}${btn("Popravit", "captive", [c.id, "popravit"], null, "danger")}</div></div></div>`).join("")}</div>` : '<p class="muted">Žalář je prázdný.</p>')}
    ${mineCap.length ? card("Tvoji lidé v zajetí", `<div class="otiles">${mineCap.map(c => `<div class="otile">${portrait(c, 58)}<div class="oti"><b>${esc(c.n)}</b><div class="small muted">drží je ${esc(S.clans[c.capBy].house)}</div></div></div>`).join("")}</div>`) : ""}</div>`;
}

// ---------- rozkazy (plán měsíce a kraj) ----------
function cmdCard(c, p, showProv) {
  const cmdOpts = Object.entries(CMDS).map(([k, K]) => [k, K.n + (K.cost ? ` (${K.cost} zl)` : "")]);
  const done = c.acted === S.turn, k = SEL.cmd[c.id] || (c.id === P(S).leader ? "poselstvo" : suggestCmd(c, p)); SEL.cmd[c.id] = k;
  return `<div class="ccard${done ? " acted" : ""}">${portrait(c, 64)}<div class="cci"><div><b>${esc(c.n)}</b> <span class="small muted">${RANKS[c.rank].n}${c.id === p.lord ? " · purkrabí" : ""}${c.id === P(S).leader ? " · hlava rodu" : ""}${showProv ? " · " + esc(p.n) : ""}</span> ${loyIcon(c.loy)}</div>${statMini(c)}
    ${done ? '<div class="donebadge">✔ tento měsíc už jedná</div>' : `<div class="row">${sel("cs_" + c.id, cmdOpts, k, `data-a="cmdSel" data-x='["${c.id}"]'`)} ${cmdParams(c, k, p)}</div><div class="row"><span class="small muted">${CMDS[k].d}</span><span class="sp"></span>${btn("Provést", "cmd", [c.id], null, "go")}${showProv ? btn("Nechat na rádci", "advise", [c.id]) : ""}</div>`}</div></div>`;
}
function tPlan() {
  const ps = clanProvs(S, me()).filter(p => !p.siege && !p.occ).sort((a, b) => (b.id === P(S).capital) - (a.id === P(S).capital) || b.v - a.v);
  let idle = 0; const cards = [];
  for (const p of ps) for (const c of officersIn(S, p.id).filter(x => !x.army)) { const done = c.acted === S.turn; if (done && !SEL.planDone) continue; if (!done) idle++; cards.push(cmdCard(c, p, true)); }
  const C = P(S), b = clanBudget(S, me());
  return `<div class="tiles">${tile("Volní vazalové", idle, "čekají na rozkaz")}${tile("Zlato", fmt(C.gold), `<span class="${b.net < 0 ? "bad" : "good"}">${sg(b.net)} za měsíc</span>`)}${tile("Obilí", fmt(C.grain), "do žní " + ((8 - S.month + 12) % 12) + " měs.")}${tile("Kraje", clanProvs(S, me()).length, `${clanProvs(S, me()).filter(p => p.deleg).length} svěřených purkrabím`)}</div>
  <div class="row">${btn("Rádce rozhodne za všechny volné", "adviseAll", [], idle ? null : "Nikdo nečeká", "go")} ${btn(SEL.planDone ? "Skrýt ty, kdo už jednají" : "Ukázat i ty, kdo už jednají", "planDone")} <span class="small muted">Předvybraný rozkaz je doporučení podle stavu kraje.</span></div>
  <div class="ccards">${cards.join("") || '<p class="muted">Všichni vazalové už mají rozkaz. Ukonči měsíc.</p>'}</div>`;
}

// ---------- diplomacie ----------
function tDiplo() {
  const others = aliveClans(S).filter(c => c.id !== me()).sort((a, b) => clanProvs(S, b.id).length - clanProvs(S, a.id).length);
  if (!others.some(c => c.id === SEL.dip)) SEL.dip = others[0] && others[0].id;
  const tiles = others.map(c => { const L = leaderOf(S, c.id), r = rel(S, me(), c.id); return `<div class="dtile${c.id === SEL.dip ? " sel" : ""}${atWar(S, me(), c.id) ? " war" : ""}" data-a="selDip" data-x='["${c.id}"]'>${shield(c.id, 30)}${portrait(L, 40)}<div class="dti"><b>${esc(c.house.split(" (")[0])}</b><div class="small muted">${esc(c.n)}</div><div class="small">${clanProvs(S, c.id).length} krajů · ~${fmt(Math.round(clanMen(S, c.id) / 500) * 500)} mužů</div><div class="small">vztah <b class="${cls(r, -20, 30)}">${Math.round(r)}</b> ${relBar(r)}</div><div>${relStatus(c)}</div></div></div>`; });
  const T = S.clans[SEL.dip]; let dossier = "";
  if (T) {
    const L = leaderOf(S, T.id), envoys = officers(S, me()).filter(c => c.acted !== S.turn && !c.army && S.provs[c.loc] && S.provs[c.loc].owner === me() && !S.provs[c.loc].occ).sort((a, b) => st(b, "roz") - st(a, "roz"));
    const foes = enemiesOf(S, T.id), friends = aliveClans(S).filter(o => o.id !== T.id && allied(S, T.id, o.id)), kin = aliveClans(S).filter(o => o.id !== T.id && married(S, T.id, o.id));
    dossier = card("Rod", `<div class="bigport">${shield(T.id, 56)}${portrait(L, 96)}<div><div class="big">${esc(T.house)}</div><div>${esc(T.n)}</div><div class="muted">${esc(cap(T.t))} ${esc(L ? L.n : "—")}${L ? ` (${age(S, L)} let)${L.st === "cap" ? ", v zajetí" : ""}` : ""}</div><div class="muted">${T.hre ? "říšské knížectví" : "mimo říši"}${T.titles.length ? " · " + T.titles.join(", ") : ""} · ${RELIGIONS[relig(S, T.id)].n} víra</div></div></div>
      <div>${relStatus(T) || '<span class="muted small">žádné smlouvy</span>'}</div>
      ${meter("Vztah k tobě", Math.round(rel(S, me(), T.id)) + 100, 200, rel(S, me(), T.id) < 0 ? "var(--bad)" : "var(--good)")}
      <div class="kv small"><span>Kraje</span><span>${clanProvs(S, T.id).map(p => esc(p.n)).join(", ")}</span><span>Válčí s</span><span>${foes.map(f => chip(f)).join(" ") || "—"}</span><span>Spojenci</span><span>${friends.map(f => chip(f.id)).join(" ") || "—"}</span><span>Spřízněni</span><span>${kin.map(f => chip(f.id)).join(" ") || "—"}</span></div>
      ${warPeaceBlock(T)}
      <h4>Poselstvo</h4><div class="envoys">${envoys.slice(0, 6).map((c, i) => `<label class="envoy"><input type="radio" name="env" value="${c.id}" ${i === 0 ? "checked" : ""} onchange="document.getElementById('env_${T.id}').value=this.value">${portrait(c, 34)}<span class="small">${esc(c.n.split(" ")[0])}<br>rozum ${st(c, "roz")}</span></label>`).join("") || '<span class="muted small">Žádný volný vazal – poselstvo můžeš vyslat příští měsíc.</span>'}</div>
      <input type="hidden" id="env_${T.id}" value="${envoys[0] ? envoys[0].id : ""}">
      <div class="row">${sel("dt_" + T.id, Object.entries(DIPLO).map(([k, d]) => [k, d.n]), atWar(S, me(), T.id) ? "mir" : "dar")} ${btn("Vyslat poselstvo", "dip", [T.id], envoys.length ? null : "Žádný volný vazal", "go")} ${atWar(S, me(), T.id) ? "" : btn(SEL.warConfirm === T.id ? "<b>Opravdu vyhlásit válku?</b>" : "Vyhlásit válku", "war", [T.id], null, "danger")}</div>`, "sticky");
  }
  return `<div class="grid split">${card("Rody střední Evropy", `<div class="dtiles">${tiles.join("")}</div>`)}${dossier}</div>`;
}

// ---------- rod ----------
function famCard(c, role) {
  if (!c) return "";
  const H = heirsOf(S, me())[0];
  return `<div class="fam ${c.sex === "f" ? "f" : "m"}${c.st === "dead" ? " dead" : ""}">${portrait(c, 76)}<div class="fn">${esc(c.n)}${c.id === P(S).leader ? " ♛" : ""}</div><div class="small muted">${role || (c.sex === "m" ? "syn" : "dcera")}, ${age(S, c)} let${H && H.id === c.id ? ", <b>dědic</b>" : ""}${c.st === "cap" ? ", v zajetí" : ""}${c.c ? ", duchovní" : ""}</div>
    ${statMini(c)}${c.spouse && chr(S, c.spouse) && role !== "choť" ? `<div class="small">∞ ${esc(chr(S, c.spouse).n)}</div>` : ""}
    ${c.st === "kid" ? sel("fo_" + c.id, [["", "výchova: volná"], ["ved", "vojevůdce"], ["uda", "rytířská"], ["roz", "učená"], ["spr", "správní"]], c.focus || "", `data-a="focus" data-x='["${c.id}"]'`) : ""}</div>`;
}

// ---------- objevy ----------
const TECH_ICON = { "Zemědělství": "grain", "Řemesla": "kraj", "Správa": "scale", "Učenost": "objevy", "Válečnictví": "vojsko" };
function tObjevy() {
  const C = P(S), cats = [...new Set(TECH_IDS.map(t => TECHS[t].cat))], cur = C.res.cur;
  return `${cur ? `<div class="curtech">${scene("uceni", 640, 120)}<div class="ct"><b>Zkoumá se: ${TECHS[cur].n}</b>${meter("Učenost", Math.round(C.res.pts), techCost(S, me(), cur), "#3f6fa8")}<span class="small">Body přinášejí rozkazy „Podporovat učence“, kláštery a kancléř.</span></div></div>` : '<p class="alert warn">Učenci nemají zadaný objev – vyber některý níže.</p>'}
  ${cats.map(cat => `<h3 class="cath">${icon(TECH_ICON[cat] || "objevy")} ${cat}</h3><div class="ttiles">${TECH_IDS.filter(t => TECHS[t].cat === cat).map(t => { const T = TECHS[t], done = C.techs[t], av = techAvail(S, me(), t); return `<div class="ttile ${done ? "done" : cur === t ? "cur" : av ? "av" : "lock"}">${glyph(TECH_GLYPH[t], 34, "tg")}<b>${done ? "✔ " : cur === t ? "▶ " : av ? "" : "🔒 "}${T.n}</b>${T.year && S.year < T.year ? `<div class="small bad">známo až od roku ${T.year}</div>` : ""}<div class="small">${T.d}</div>${T.req ? `<div class="small muted">vyžaduje: ${T.req.map(r => TECHS[r].n).join(", ")}</div>` : ""}<div class="row"><span class="small muted">${techCost(S, me(), t)} bodů</span><span class="sp"></span>${done || cur === t ? "" : btn("Zkoumat", "research", [t], av ? null : "Chybí předpoklady")}</div></div>`; }).join("")}</div>`).join("")}`;
}

// ---------- hospodářství ----------
function moneyBars(obj, names, col) { const tot = Math.max(1, sum(Object.values(obj).filter(v => v > 0))); return Object.entries(obj).filter(([, v]) => Math.abs(v) >= 0.1).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="mbar"><span>${names[k] || k}</span><i style="width:${clamp(Math.abs(v) / tot * 100, 1, 100)}%;background:${v < 0 ? "var(--bad)" : col}"></i><b>${r1(v)}</b></div>`).join(""); }
function tHosp() {
  const C = P(S), b = clanBudget(S, me()), ti = sum(Object.values(b.inc)), te = sum(Object.values(b.ex));
  const goods = Object.entries(GOODS).map(([g, G]) => `<div class="gcard">${icon(g === "obili" ? "grain" : g === "kone" ? "men" : "vojsko")}<b>${G.n}</b><div class="big">${fmt(Math.floor(C[g === "obili" ? "grain" : g] || 0))}</div><div class="small muted">nákup ${r1(price(S, g) * 1.15)} · prodej ${r1(price(S, g) * 0.85)} zl</div><div class="row"><input type="number" id="q_${g}" value="100" min="1" step="50">${btn("Koupit", "buy", [g])}${btn("Prodat", "sell", [g])}</div></div>`).join("");
  const provRows = clanProvs(S, me()).sort((a, c) => provGold(S, c) + routeIncomeProv(S, c) - provGold(S, a) - routeIncomeProv(S, a));
  const mx = Math.max(1, ...provRows.map(p => provGold(S, p) + provMines(S, p).gold + routeIncomeProv(S, p)));
  return `<div class="tiles">${tile("Příjem", fmt(ti), "zlatých měsíčně")}${tile("Výdaje", fmt(te), "zlatých měsíčně")}${tile("Bilance", `<span class="${b.net < 0 ? "bad" : "good"}">${sg(b.net)}</span>`, "za měsíc")}${tile("Obilí", fmt(C.grain), `spotřeba ${r1(clanGrainUse(S, me()))}/měs., žně v září`)}</div>
  <div class="grid">${card("Odkud plyne zlato", moneyBars(b.inc, INC_N, "#b08a2e"))}${card("Kam odtéká", moneyBars(b.ex, EXP_N, "#a3332b"))}
  ${card("Daně a trh", `<div class="kv"><span>Daňová zátěž</span>${sel("taxs", TAX_LEVELS.map((t, i) => [i, t]), C.tax, `data-a="tax" data-x='[]'`)}<span>Inflace</span><span>${Math.round(S.inflation * 100)} %</span></div><p class="small muted">Vyšší daně = víc zlata, ale nižší spokojenost lidu.</p><div class="gcards">${goods}</div>`)}
  ${contractsCard()}
  ${routesCard()}
  ${card("Lombardští bankéři", `${(C.debts || []).map((d, i) => `<div class="row">Dluh ${fmt(d.amount)} zl, úrok ${r1(d.amount * d.rate)} zl/měs. ${btn("Splatit", "repay", [i])}</div>`).join("") || '<p class="muted small">Nemáš dluhy.</p>'}<div class="row"><input type="number" id="loan" value="200" step="100"> ${btn("Půjčit si", "borrow")} <span class="small muted">strop ${maxLoan(S, me())} zl</span></div>`)}
  ${card("Výnos krajů", provRows.map(p => { const v = provGold(S, p) + provMines(S, p).gold + routeIncomeProv(S, p); return `<div class="mbar"><span>${btn(esc(p.n), "prov", [p.id])}</span><i style="width:${v / mx * 100}%;background:${p.cores.includes(me()) ? "#b08a2e" : "#e68c28"}"></i><b>${r1(v)}</b></div>`; }).join(""), "wide")}</div>`;
}

// ---------- ilustrované události a bitva ----------
function eventPerson(ev) {
  if (ev.cid && chr(S, ev.cid)) return chr(S, ev.cid);
  if (ev.id === "_exp" && chr(S, ev.c)) return chr(S, ev.c);
  if (ev.a && chr(S, ev.a)) return chr(S, ev.a);
  const cl = ev.from || ev.by || ev.ally; if (cl && S.clans[cl]) return leaderOf(S, cl);
  if (["_succ", "nemoc", "rozvod", "_mission", "vdovec"].includes(ev.id)) return leaderOf(S, me());
  return null;
}
function renderModal() {
  const m = $("#modal");
  if (S.events.length && S.events[0].id === "_battle" && battleModal(S.events[0])) { m.innerHTML = battleModal(S.events[0]); m.classList.remove("hidden"); return; }
  if (S.events.length) {
    const ev = S.events[0], v = eventView(S, ev), who = eventPerson(ev);
    m.innerHTML = `<div class="box evbox"><div class="evart">${scene(eventArt(ev))}${who ? `<div class="evport">${portrait(who, 78)}</div>` : ev.id === "_objev" ? `<div class="evport glyphport">${glyph(TECH_GLYPH[ev.t], 70)}</div>` : ""}${ev.id === "_rada" || ev.id === "_duel" ? `<div class="evport r">${portrait(chr(S, ev.b), 78)}</div>` : ""}</div><div class="evbody"><div class="muted small">${dateStr(S)}${S.events.length > 1 ? ` · čeká ${S.events.length} zpráv` : ""}</div><h2>${esc(v.t)}</h2><p>${esc(v.txt)}</p>${evExtra(ev)}${v.ch.map(c => `<button class="b ch" data-a="event" data-x="[0,${c.i}]" ${c.ok ? "" : "disabled"}>${esc(c.t)}</button>`).join("")}</div></div>`;
    m.classList.remove("hidden");
  } else if (S.over && !S.overSeen) {
    m.innerHTML = `<div class="box evbox"><div class="evart">${scene(S.over.win ? "rod" : "pozar")}</div><div class="evbody"><h2>${S.over.win ? "Vítězství" : "Konec"}</h2><p>${esc(S.over.txt)}</p><button class="b ch" onclick="S.overSeen=true;render()">${S.over.cont ? "Hrát dál" : "Zavřít"}</button></div></div>`;
    m.classList.remove("hidden");
  } else m.classList.add("hidden");
}
function battleModal(ev) {
  const x = S.pend && S.pend[ev.bid]; if (!x) return null;
  const b = x.b, my = b.ps === "A" ? b.A : b.B, foe = b.ps === "A" ? b.B : b.A, myStart = b.ps === "A" ? b.start.a : b.start.b, foeStart = b.ps === "A" ? b.start.b : b.start.a;
  const side = (sd, start, title) => `<div class="bside"><div class="bcmd">${shield(sd.cl, 34)}${sd.cmds.slice(0, 3).map(id => portrait(chr(S, id), 40)).join("")}<div><b>${esc(S.clans[sd.cl].house.split(" (")[0])}</b><div class="small muted">${title}</div></div></div>
    ${meter("Muži", men(sd.t), start, S.clans[sd.cl].col)}${meter("Morálka", Math.max(0, Math.round(sd.morale)), 100, sd.morale < 40 ? "var(--bad)" : "var(--accent2)")}<div class="small muted">Sestava: ${TACTICS[sd.tac || "vyvazena"].n}${sd.castle ? `, hrad ${sd.castle}` : ""}</div></div>`;
  const last = b.rounds[b.rounds.length - 1];
  const lastTxt = last ? (() => { const mi = b.ps === "A" ? 0 : 1, fo = 1 - mi; return `${b.rounds.length}. kolo: ty – ${ORDERS[last[4 + mi]].n}, nepřítel – ${ORDERS[last[4 + fo]].n}. Tvé ztráty ${fmt(last[mi])}, nepřítele ${fmt(last[fo])}.`; })() : "Vojska stojí proti sobě. Vydej první rozkaz.";
  const v = eventView(S, ev), OI = { utok: "⚔", drzet: "🛡", jizda: "🐎", salva: "🏹", zaloha: "⚑", ustup: "↩" };
  return `<div class="box wide battlebox">${battleScene(b)}<div class="evbody"><div class="muted small">${dateStr(S)} · ${TERRAIN[S.provs[b.place].ter].n} · ${b.r + 1}. kolo z nejvýš 6</div><h2>${esc(v.t)}</h2>
    <div class="bgrid">${side(my, myStart, "tvé vojsko")}${side(foe, foeStart, "nepřítel")}</div>
    <p class="alert info">${lastTxt}</p>
    <div class="orders">${v.ch.map(c => { const k = Object.keys(ORDERS).find(o => ORDERS[o].n === c.t); return `<button class="b ch" data-a="event" data-x="[0,${c.i}]"><span class="oi">${OI[k] || ""}</span><b>${esc(c.t)}</b><br><span class="small muted">${esc(c.d || "")}</span></button>`; }).join("")}</div></div></div>`;
}

// ---------- úvodní obrazovka ----------
const SCEN_INFO = {};
function scenInfo(sc) {
  if (SCEN_INFO[sc]) return SCEN_INFO[sc];
  const s = newGame({ seed: 1, scen: sc, clan: "premysl" });
  return (SCEN_INFO[sc] = CLANS.filter(c => s.clans[c.id].alive && s.clans[c.id].type === "dyn").map(c => { const C = s.clans[c.id], L = s.chars[C.leader]; return { id: c.id, n: C.n, house: C.house, col: C.col, provs: clanProvs(s, c.id).length, L: L ? Object.assign({}, L) : null, role: C.t === "král" ? "kral" : "vevoda", year: s.year }; }).sort((a, b) => b.provs - a.provs));
}
function titleScreen() {
  const T = SEL.title; if (!T) return "";
  const sc = T.scen || 1256, list = T.step >= 2 ? scenInfo(sc) : [];
  const hard = n => n >= 10 ? ["snadné", "good"] : n >= 4 ? ["střední", "warn"] : ["těžké", "bad"];
  if (T.step === 1) return `<div class="tbg">${scene("valka", 1200, 340)}</div><div class="tcontent"><h1>Panovník</h1><p class="tsub">Koruny a meče střední Evropy · 1256–1400</p>
    <div class="tbtns">${btn("Pokračovat ve hře", "titleClose", [], null, "big go")}${btn("Nová hra", "titleStep", [2], null, "big")}</div>
    <p class="small tnote">Vládni rodu Přemyslovců, Habsburků, Arpádovců či Piastovců. Rozšiřuj panství, uzavírej sňatky, veď vojska a usiluj o královskou nebo císařskou korunu.</p></div>`;
  return `<div class="tcontent wide"><div class="row"><h2>Nová hra</h2><span class="sp"></span>${btn("Zpět", "titleStep", [1])}</div>
    <div class="scards">${Object.entries(SCENARIOS).map(([k, x]) => `<div class="scard${+k === sc ? " sel" : ""}" data-a="titleScen" data-x='[${k}]'>${scene(k == 1256 ? "volba" : k == 1260 ? "valka" : "rod", 320, 110)}<b>${x.n}</b><div class="small">${esc(x.d)}</div></div>`).join("")}</div>
    <h3>Zvol rod</h3><div class="ctiles">${list.map(c => `<div class="ctile${c.id === (T.clan || "premysl") ? " sel" : ""}" data-a="titleClan" data-x='["${c.id}"]'>${shield(c.id, 34)}${c.L ? portrait(c.L, 52, { role: c.role, col: c.col, year: c.year }) : ""}<div><b>${esc(c.house.split(" (")[0])}</b><div class="small">${esc(c.n)}</div><div class="small muted">${c.L ? esc(c.L.n) : ""}</div><div class="small">${c.provs} krajů · <span class="${hard(c.provs)[1]}">${hard(c.provs)[0]}</span></div></div></div>`).join("")}</div>
    <div class="row tstart">Obtížnost ${sel("tDiff", DIFFS.map((d, i) => [i, d]), T.diff != null ? T.diff : 1, `data-a="titleDiff" data-x='[]'`)} <label><input type="checkbox" ${T.fog === false ? "" : "checked"} data-a="titleFog" data-x='[]'> mlha války</label><span class="sp"></span>${btn("Začít hru ▶", "titleStart", [], null, "big go")}</div></div>`;
}
Object.assign(ACT, {
  titleClose: () => { SEL.title = null; }, titleStep: n => { SEL.title.step = n; }, titleScen: k => { SEL.title.scen = +k; SEL.title.clan = "premysl"; }, titleClan: id => { SEL.title.clan = id; },
  titleDiff: v => { SEL.title.diff = +v; }, titleFog: v => { SEL.title.fog = !!v; }, openTitle: () => { SEL.title = { step: 1 }; },
  titleStart: () => { const T = SEL.title; S = newGame({ clan: T.clan || "premysl", scen: T.scen || 1256, diff: T.diff != null ? T.diff : 1, fog: T.fog !== false }); TAB = "mapa"; SEL.prov = P(S).capital; SEL.view = null; centerOnStart(); SEL.title = null; EUTERR.key = null; },
});
function centerOnStart() { SEL.view = { x: 0, y: 0, w: 430, h: 430 * MH / MW }; centerOn(P(S).capital); }
function renderTitle() {
  let el = $("#title"); if (!el) { el = document.createElement("div"); el.id = "title"; document.body.appendChild(el); }
  if (!SEL.title) { el.className = "hidden"; el.innerHTML = ""; return; }
  el.className = ""; el.innerHTML = titleScreen();
}
