// Herní obrazovky: horní lišta, palác, plán měsíce s kartami úředníků, dvůr, rody, rodokmen a svitek událostí.

// ---------- horní lišta ----------
function rulerLine(C, L) {
  if (!L) return "—";
  const king = C.t === "král" && C.cul !== "nub";
  return king ? `${hg("nswbjtj", "nesut-biti – král Horního a Dolního Egypta")} <span class="cartouche">${esc(L.n)}</span>${hg("anch", "anch, udža, seneb – živ, zdráv, silen")}` : `${esc(cap(C.t))} ${esc(L.n)}`;
}
function renderTop() {
  const C = P(S), b = clanBudget(S, me()), h = S.flood.h, L = ruler(), si = Math.floor(S.month / 4);
  return `<div class="realm">${emblem(me(), 40)}<div><div class="rn">${esc(C.n)}</div><div class="rk">${rulerLine(C, L)} · ${regYear(S, me())}. rok vlády</div></div></div>
  <div class="season" title="Egyptský občanský rok: achet – záplava, peret – setí a růst, šemu – sklizeň">${seasonWheel(S.month)}<div><div class="sn">${(S.month % 4) + 1}. měsíc období ${SEASONS[si]}</div><div class="sd">${SEASON_D[si]} · ≈ ${S.bce} př. n. l.</div></div></div>
  <div class="hud">
    ${resPill("deben", fmtK(C.deben), `<span class="${b.net < 0 ? "bad" : "good"}">${sg(b.net)}</span>`, "Debeny – měděná jednotka hodnoty; za měsíc " + sg(b.net))}
    ${resPill("grain", fmtK(C.grain), "", "Obilí ve státních sýpkách (charů, char ≈ 77 litrů)")}
    ${resPill("maat", Math.round(C.maat), "", "Maat – řád světa a oprávněnost vlády")}
    ${resPill("slava", fmt(C.prestige), "", "Sláva rodu")}
    ${resPill("vojsko", fmtK(clanMen(S, me())), "", "Muži ve zbrani")}
    ${resPill("nil", h ? dec(h) : "?", "loktů", "Výška poslední záplavy na nilometru")}
  </div>
  <span class="sp"></span>
  ${S.over && !S.over.cont ? '<b class="bad">Hra skončila</b>' : `<span class="endgrp"><span class="timectl"><button class="b play${AUTO.on ? " on" : ""}" data-a="play" data-x="[]" title="${AUTO.on ? "Zastavit čas" : "Nechat čas plynout – zastaví se u každé události"}">${AUTO.on ? "❚❚" : "▶"}</button>${sel("speedSel", [[2600, "pomalu"], [1600, "středně"], [800, "rychle"]], AUTO.ms, `data-a="speed" data-x='[]' title="rychlost plynutí času"`)}</span><button class="main" data-a="end" data-x="[]">${ricon("nil", 18)} Konec měsíce</button></span>`}`;
}
function renderTabs() {
  const idle = freeOffs().length;
  return TABS.map(([k, n]) => `<button class="${SEL.tab === k ? "on" : ""}"${SEL.tab === k ? ' aria-current="page"' : ""} data-a="tab" data-x='["${k}"]'>${icon(k)}${n}${k === "plan" && idle ? ` <span class="badge">${idle}</span>` : ""}</button>`).join("");
}

// ---------- Palác (přehled) ----------
function alertsHtml(n) { const al = alerts(); return al.length ? al.slice(0, n || 99).map(([c, t]) => `<div class="alert ${c}">${esc(t)}</div>`).join("") + (n && al.length > n ? `<p class="small muted">a dalších ${al.length - n}…</p>` : "") : '<p class="muted">Rádci nemají, co by hlásili. V zemi panuje maat.</p>'; }
function tPrehled() {
  const C = P(S), b = clanBudget(S, me()), H = S.history.slice(-36), L = ruler(), sp = L && chr(S, L.spouse), heir = heirsOf(S, me())[0], vez = officeHolder(S, me(), "vezir");
  const tax = yearTaxEstimate(S, me(), S.flood.h || 15.5), world = (S.worldHist || []).slice(-40);
  const series = aliveClans(S).filter(c => c.type !== "kmen").map(c => ({ name: c.n, col: c.col, bold: c.id === me(), vals: world.map(e => e.p[c.id] || 0) }));
  const t = (k, label, value, sub, vals) => `<div class="tile"><svg class="ti" viewBox="0 0 24 24">${RICON[k]}</svg><div class="tl">${label}</div><div class="tv">${value}</div><div class="ts">${sub || ""}</div>${vals ? sparkline(vals) : ""}</div>`;
  return `<div class="grid">
    <section class="card wide"><h3>${hg("pan")} Trůnní sál</h3><div class="court">${L ? portrait(L, 96) : ""}<div>
      <div class="who">${rulerLine(C, L)}</div>
      <div class="muted">${esc(C.house)} · ${age(S, L || {by: S.bce})} let · ${regYear(S, me())}. rok vlády</div>
      ${L && L.note ? `<div class="small muted">${esc(L.note)}</div>` : ""}
      <div class="row" style="margin-top:6px">${sp ? `<span class="chip">${portrait(sp, 22)} ${esc(sp.n)}</span>` : ""}${heir ? `<span class="chip">${portrait(heir, 22)} dědic: ${esc(heir.n)}</span>` : '<span class="pill bad">bez dědice</span>'}${vez ? `<span class="chip">${portrait(vez, 22)} vezír ${esc(vez.n)}</span>` : ""}</div>
      <div class="small" style="margin-top:4px">Hrobka (${esc(C.tombN)}): ${C.tomb.stage} z ${TOMB_STAGES.length} fází${C.tomb.active ? " – pracuje se" : ""}</div></div></div></section>
  </div>
  <div class="tiles" style="margin-top:14px">
    ${t("deben", "Debeny", fmtK(C.deben), `<span class="${b.net < 0 ? "bad" : "good"}">${sg(b.net)} za měsíc</span>`, H.map(x => x.deben))}
    ${t("grain", "Obilí", fmtK(C.grain), `${sg(b.gnet)} měsíčně · daň ze sklizně ≈ ${fmtK(tax)}`, H.map(x => x.grain))}
    ${t("maat", "Maat", Math.round(C.maat), "řád a oprávněnost vlády", H.map(x => x.maat))}
    ${t("slava", "Sláva", fmt(C.prestige), "vítězství, stavby, výpravy", H.map(x => x.prestige))}
    ${t("nomy", "Nomy", clanProvs(S, me()).length, `jádro Egypta ${realmCore(S, me())} z ${coreProvs(S).length}`, H.map(x => x.provs))}
    ${t("vojsko", "Vojsko", fmtK(clanMen(S, me())), nPlural(S.armies.filter(a => a.cl === me()).length, "vojsko v poli", "vojska v poli", "vojsk v poli"), H.map(x => x.men))}
  </div>
  <div class="grid">
    ${card(`${ricon("urednici", 20)} Úkoly rádců`, missionsHtml())}
    ${card(`${hg("sema")} Úspěchy`, `<div class="row">${Object.entries(ACH).map(([k, A]) => `<span class="pill ${(C.ach || {})[k] != null ? "good" : ""}" title="${esc(A.d)}">${(C.ach || {})[k] != null ? "✔ " : ""}${esc(A.n)}</span>`).join("")}</div><p class="small muted">Najetím myší uvidíš, co je potřeba.</p>`)}
    ${card(`${ricon("vojsko", 20)} Zajatci`, `<p>Zajatců: <b>${fmt(C.zajatci || 0)}</b>. Získáš je ve vítězných bitvách.</p><div class="row">${btn("Poslat na stavby (300 na stavbu)", "capBuild", [], (C.zajatci || 0) >= 300 ? null : "Málo zajatců")} ${btn("Usadit u sídla jako rolníky", "capSettle", [], (C.zajatci || 0) >= 200 ? null : "Málo zajatců")}</div><p class="small muted">Vítězové odváděli zajatce jako pracovní sílu: Ahmose, syn Ebany, si zapsal každého, koho odvedl, a papyrus Brooklyn (13. dynastie) uvádí v jedné domácnosti desítky asijských služebníků.</p>`)}
    ${card(`${ricon("urednici", 20)} Rádci hlásí`, alertsHtml())}
    ${card(`${hg("sema")} Síla rodů (počet nomů)`, lineChart(series, world.map(e => e.d)))}
    ${card("Z letopisů", `<div class="log" style="max-height:320px">${S.log.filter(x => !x.cl || x.cl.includes(me())).slice(0, 25).map(x => `<div class="lg c-${x.cat}"><span class="tag">${monthShort(x.m)} ${x.y}</span>${esc(x.txt)}</div>`).join("")}</div>`, "wide")}
  </div>`;
}

function missionsHtml() {
  const C = P(S), done = C.missions || {};
  return missionList(S).map(id => { const M = MISSIONS[id], ok = done[id] != null;
    return `<div class="alert ${ok ? "good" : "info"}"><b>${ok ? "✔ " : ""}${esc(M.n)}</b> – ${esc(M.d)}<div class="small muted">odměna: ${esc(M.r)}${ok ? " · splněno" : ""}</div></div>`; }).join("");
}
// ---------- karty postav ----------
function statMini(c) { return `<div class="stats4">${STAT_IDS.map(k => `<span title="${STATS[k]} ${st(c, k)}">${STATS[k].slice(0, 3)} ${st(c, k)}<i><b style="width:${st(c, k)}%"></b></i></span>`).join("")}</div>`; }
function loyMini(c) { const v = Math.round(c.loy), col = v < 30 ? "var(--bad)" : v < 55 ? "var(--warn)" : "var(--good)"; return `<div class="loyal" title="věrnost">věrnost <i><b style="width:${v}%;background:${col}"></b></i> ${v}</div>`; }

// ---------- Plán měsíce ----------
function tPlan() {
  const cmdOpts = Object.entries(CMDS).map(([k, K]) => [k, K.n + (K.cost || K.grain ? ` (${K.cost ? K.cost + " d." : ""}${K.cost && K.grain ? ", " : ""}${K.grain ? fmtK(K.grain) + " ch." : ""})` : "")]);
  const ps = myProvs().filter(p => !p.siege).sort((a, b) => (b.id === P(S).capital) - (a.id === P(S).capital) || b.v - a.v);
  let idle = 0; const cards = [];
  for (const p of ps) for (const c of officersIn(S, p.id)) {
    const done = c.acted === S.turn; if (done && !SEL.planDone) continue; if (!done) idle++;
    const k = SEL.cmd[c.id] || suggestCmd(c, p); SEL.cmd[c.id] = k;
    cards.push(`<div class="person${done ? " done" : ""}"><div class="ph">${portrait(c, 54)}<div><div class="pn">${esc(c.n)}${c.id === P(S).leader ? " ♛" : ""}</div><div class="pr">${RANKS[c.rank].n} · ${provLink(p)}${p.deleg ? " · svěřeno rádci" : ""}</div></div></div>
      ${statMini(c)}${loyMini(c)}
      ${done ? '<div class="cmdd">Tento měsíc už jedná.</div>' : `${sel("cs_" + c.id, cmdOpts, k, `data-a="cmdSel" data-x='["${c.id}"]'`)}<div class="cmdd">${esc(CMDS[k].d)}</div><div class="acts">${cmdParams(c, k, p)} ${btn("Provést", "cmd", [c.id], null, "go")} ${btn("Ať rozhodne rádce", "advise", [c.id])}</div>`}</div>`);
  }
  const away = officers(S, me()).filter(c => c.away || c.moving || c.army).map(c => `<div class="person done"><div class="ph">${portrait(c, 40)}<div><div class="pn">${esc(c.n)}</div><div class="pr">${c.away ? `výprava: ${EXPED[c.away.exp].n}, návrat za ${c.away.until - S.turn} měs.` : c.moving ? `na cestě do nomu ${S.provs[c.moving.to].n}` : "velí vojsku v poli"}</div></div></div></div>`);
  return `<section class="card"><h3>${ricon("urednici", 20)} Plán měsíce</h3><div class="row">${idle ? `<b>${nPlural(idle, "úředník čeká", "úředníci čekají", "úředníků čeká")} na rozkaz.</b>` : "<b>Všichni úředníci mají rozkaz.</b>"} ${btn("Rádce rozhodne za všechny volné", "adviseAll", [], idle ? null : "Nikdo nečeká", "go")} ${btn(SEL.planDone ? "Skrýt ty, kdo už jednají" : "Ukázat i ty, kdo už jednají", "planDone")}</div>
    <p class="small muted">${S.month < 4 ? "Je období achet: pole jsou pod vodou a rolníci jdou na robotu – kanály a stavby postupují rychleji." : S.month < 8 ? "Je období peret: setí a růst obilí. Sklizeň přijde v 1. měsíci období šemu." : "Je období šemu: sklizeň a výběr daně v obilí."} Předvybraný rozkaz je doporučení podle stavu nomu.</p></section>
  <div class="people" style="margin-top:14px">${cards.join("") || '<p class="muted">Nikdo nečeká na rozkaz.</p>'}</div>
  ${away.length ? `<h3 class="title" style="margin:18px 0 8px;color:var(--accent)">Mimo svůj nom</h3><div class="people">${away.join("")}</div>` : ""}`;
}

// ---------- Úředníci ----------
function tUrednici() {
  const C = P(S), offs = officers(S, me()).sort((a, b) => b.rank - a.rank || b.merit - a.merit);
  const cards = offs.map(c => { const p = S.provs[c.loc], next = RANKS[c.rank + 1], off = Object.entries(C.offices || {}).find(([, id]) => id === c.id);
    return `<div class="person"><div class="ph">${portrait(c, 58)}<div><div class="pn">${esc(c.n)}${c.id === C.leader ? " ♛" : ""}</div><div class="pr">${RANKS[c.rank].n}${off ? " · <b>" + OFFICES[off[0]].n + "</b>" : ""}</div><div class="pr">${p ? esc(p.n) : ""} · ${age(S, c)} let${c.dyn && c.id !== C.leader ? " · z rodu" : ""}</div></div></div>
      ${statMini(c)}${loyMini(c)}
      <div class="small muted">${c.traits.map(t => TRAITS[t].n).join(", ") || "&nbsp;"}${c.hist ? ` · <span title="${esc(c.note || "")}">historická postava</span>` : ""} · zásluhy ${Math.round(c.merit)}${next ? "/" + next.merit : ""}</div>
      ${c.note ? `<div class="small" style="font-style:italic">${esc(c.note)}</div>` : ""}
      ${c.id === C.leader ? "" : `<div class="acts">${btn("Povýšit", "promote", [c.id], next && c.merit >= next.merit ? null : "Málo zásluh")}${btn("Odměna 300 d.", "gift", [c.id, 300])}${c.dyn ? "" : btn("Propustit", "dismiss", [c.id], null, "danger")}</div>`}</div>`; });
  const caps = Object.values(S.chars).filter(c => c.st === "cap" && c.cl === me()).map(c => `<span class="chip">${portrait(c, 22)} ${esc(c.n)} – drží ${S.clans[c.capBy] ? esc(S.clans[c.capBy].n) : "?"}</span>`);
  const wand = Object.values(S.chars).filter(c => c.st === "wand" && S.provs[c.loc] && S.provs[c.loc].owner === me()).map(c => `<div class="person"><div class="ph">${portrait(c, 40)}<div><div class="pn">${esc(c.n)}</div><div class="pr">${esc(S.provs[c.loc].n)}</div></div></div>${statMini(c)}</div>`);
  return `<section class="card"><h3>${ricon("urednici", 20)} Dvůr – úředníci a hodnostáři</h3><p class="small muted">Věrnost roste s hodností, úřadem, odměnami, maat a slávou rodu. Nevěrný správce pohraničního nomu může přeběhnout i s nomem k sousedovi.</p></section>
  <div class="people" style="margin-top:14px">${cards.join("")}</div>
  <div class="grid" style="margin-top:14px">${officesCard()}
  ${card("Potulní schopní muži ve tvých nomech", wand.length ? `<div class="people">${wand.join("")}</div>` : '<p class="muted small">Nikdo. Hledej je rozkazem „Hledat schopné muže“.</p>')}
  ${caps.length ? card("Zajatí", caps.join(" ") + '<p class="small muted">Zajatci se vrátí po uzavření míru.</p>') : ""}</div>`;
}

// ---------- Diplomacie ----------
function tDiplo() {
  const myP = realmPower(S, me());
  const cards = aliveClans(S).filter(c => c.id !== me()).sort((a, b) => clanProvs(S, b.id).length - clanProvs(S, a.id).length).map(O => { const L = leaderOf(S, O.id), pw = realmPower(S, O.id);
    return `<div class="realmcard${SEL.dipl === O.id ? " sel" : ""}" style="--c:${O.col}" data-a="dipl" data-x='["${O.id}"]'><div class="top">${L ? portrait(L, 50) : ""}<div><div class="nm">${emblem(O.id, 16)} ${esc(O.n)}</div><div class="hs">${esc(O.house)}</div><div class="hs">${L ? esc(L.n) : ""}</div></div></div>
      <div class="small" style="margin-top:6px">${nPlural(clanProvs(S, O.id).length, "nom", "nomy", "nomů")} · síla ${dec(pw / Math.max(1, myP))}× tvé · vztah ${relBar(rel(S, me(), O.id))}</div><div>${relStatus(O.id)}</div></div>`; });
  const D = SEL.dipl && S.clans[SEL.dipl] && S.clans[SEL.dipl].alive ? S.clans[SEL.dipl] : null;
  let panel = '<p class="muted">Klepni na rod a vyšli k němu posly.</p>';
  if (D) {
    const id = D.id, war = atWar(S, me(), id), e = dipCheck(S, me(), id), pair = marriagePair(S, me(), id), L = leaderOf(S, id);
    panel = `<div class="court">${L ? portrait(L, 80) : emblem(id, 40)}<div><div class="who">${esc(D.n)}</div><div class="small muted">${esc(D.house)} · ${esc(D.t)}${L ? " " + esc(L.n) : ""}</div><div class="small">vztah ${Math.round(rel(S, me(), id))} · maat ${Math.round(D.maat)} · sláva ${fmt(D.prestige)}</div></div></div>
      <p class="small">${relStatus(id) || "bez zvláštních vztahů"}</p>
      <h4>Dary</h4><div class="row">${btn("Dary za 1 000 debenů", "diplo", [id, "dar", 1000], e)} ${btn("Dary za 3 000", "diplo", [id, "dar", 3000], e)}</div>
      <h4>Jednání</h4><div class="row">${war ? btn("Nabídnout mír", "diplo", [id, "mir"], e, "go") : btn("Vyhlásit válku", "diplo", [id, "valka"], e, "danger")}
      ${btn("Spojenectví", "diplo", [id, "spojenectvi"], e || (war ? "Válčíte" : allied(S, me(), id) ? "Už jste spojenci" : null))}
      ${btn("Obchodní smlouva", "diplo", [id, "obchod"], e || (war ? "Válčíte" : S.trade[pairKey(me(), id)] ? "Už ji máte" : null))}
      ${btn("Žádat poddanství", "diplo", [id, "podruci"], e || (D.vassalOf ? "Už je něčím poddaným" : null))}
      ${btn("Sňatek", "diplo", [id, "snatek"], e || (pair ? null : "Nejsou volní ženiši a nevěsty"))}
      ${D.vassalOf === me() ? btn("Propustit z poddanství", "diplo", [id, "propustit"], e) : ""}
      ${D.vassalOf === me() ? btn("Vychovávat jeho syna na dvoře", "diplo", [id, "kap"], e || ((D.kapUntil || 0) > S.turn ? "Jeho syn už na dvoře žije" : null)) : ""}
      ${P(S).tributeTo === id ? btn("Přestat platit tribut", "diplo", [id, "tribut_stop"], e, "danger") : ""}</div>
      <h4>Obřady</h4><div class="row">${btn("Proklínací obřad (500 d.)", "diplo", [id, "proklinani"], e || ((P(S).last["p_" + id] || -99) > S.turn - 12 ? "Lze opakovat až za rok" : null))}</div>
      ${pair ? `<p class="small">Sňatek: ${esc(pair[0].n)} a ${esc(pair[1].n)}.</p>` : ""}
      ${(D.kapUntil || 0) > S.turn ? '<p class="small">Syn jejich vládce žije na tvém dvoře mezi „dětmi kapu“ – poddaný se nevzbouří.</p>' : ""}
      <p class="small muted">Poměr sil (tvá říše : jejich) ${dec(warScore(S, me(), id))} : 1. Mír přijmou spíš, když prohrávají nebo válka trvá dlouho; poddanství při převaze víc než 3 : 1. Vyhlášení války během příměří nebo proti spojenci poškodí maat. Proklínací obřad (rozbíjení nádob se jmény nepřátel, doložený od Staré po Střední říši) sníží slávu nepřítele a spokojenost jeho pohraničních nomů.</p>`;
  }
  return `<div class="grid map2"><div class="realms">${cards.join("")}</div><section class="card sticky"><h3>Poselstvo</h3>${panel}</section></div>`;
}

// ---------- Rod ----------
function famCard(c, role) {
  if (!c) return ""; const H = heirsOf(S, me())[0];
  return `<div class="fam">${portrait(c, 70)}<div class="fn">${esc(c.n)}${c.id === P(S).leader ? " ♛" : ""}</div><div class="small muted">${role || (c.sex === "m" ? "syn" : "dcera")}, ${age(S, c)} let${H && H.id === c.id ? ", <b>dědic</b>" : ""}${c.st === "cap" ? ", v zajetí" : ""}</div>
    <div class="minis">${STAT_IDS.map(k => `<span title="${STATS[k]} ${st(c, k)}"><i style="height:${st(c, k) * 0.28}px"></i></span>`).join("")}</div>
    ${c.note ? `<div class="small muted">${esc(c.note)}</div>` : ""}
    ${c.spouse && chr(S, c.spouse) && role !== "choť" ? `<div class="small">∞ ${esc(chr(S, c.spouse).n)}</div>` : ""}
    ${c.st === "kid" ? sel("fo_" + c.id, [["", "výchova: volná"], ["ved", "vojenská"], ["uda", "lovy a zápas"], ["roz", "dům života (písař)"], ["spr", "správa statků"]], c.focus || "", `data-a="focus" data-x='["${c.id}"]'`) : ""}</div>`;
}

// ---------- svitek události ----------
function eventPerson(ev) {
  const d = ev.data || {};
  if (d.cid && chr(S, d.cid)) return chr(S, d.cid);
  return ruler();
}
function renderModal() {
  const m = document.getElementById("modal"); const ev = S.events[0];
  if (!ev) { m.classList.add("hidden"); m.innerHTML = ""; return; }
  const v = eventView(S, ev), who = eventPerson(ev);
  m.innerHTML = `<div class="box" role="dialog" aria-modal="true"><div class="ehead">${who ? portrait(who, 72) : ""}<div><div class="muted small">${esc(dateStr(S))}</div><h2>${esc(v.t)}</h2></div></div><p class="etx">${esc(v.tx)}</p>${v.battle ? battleChart(v.battle) : ""}${v.q ? `<blockquote class="papyr">„${esc(v.q.t)}“<cite>${esc(v.q.src)}</cite></blockquote>` : ""}${v.ch.map((c, i) => `<button class="b ch" data-a="event" data-x="[${i}]"><b>${esc(c.t)}</b>${c.d ? `<br><span class="small muted">${esc(c.d)}</span>` : ""}</button>`).join("")}${S.events.length > 1 ? `<p class="small muted">Další zprávy čekají: ${S.events.length - 1}</p>` : ""}</div>`;
  m.classList.remove("hidden");
}
