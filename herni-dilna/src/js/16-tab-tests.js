// ---------- Testování ----------
function renderTests(main, p) {
  const ss = [...p.sessions].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const n = ss.length;
  const avgMin = n ? Math.round(ss.reduce((a, s) => a + (+s.minutes || 0), 0) / n) : 0;
  const avgPl = n ? (ss.reduce((a, s) => a + s.players.length, 0) / n) : 0;
  const byName = {}; ss.forEach(s => s.players.forEach(pl => { const k = pl.name.trim() || "?"; byName[k] = byName[k] || { games: 0, wins: 0 }; byName[k].games++; if (pl.win) byName[k].wins++; }));
  const names = Object.entries(byName).sort((a, b) => b[1].wins / b[1].games - a[1].wins / a[1].games || b[1].games - a[1].games);
  const seat = {}; ss.forEach(s => s.players.forEach((pl, idx) => { seat[idx] = seat[idx] || { games: 0, wins: 0 }; seat[idx].games++; if (pl.win) seat[idx].wins++; }));
  const byVer = {}; ss.forEach(s => { const v = s.version || "?"; byVer[v] = byVer[v] || { n: 0, min: 0 }; byVer[v].n++; byVer[v].min += +s.minutes || 0; });
  const bySc = {}; ss.filter(s => s.scenario).forEach(s => { bySc[s.scenario] = bySc[s.scenario] || {}; s.players.filter(pl => pl.win).forEach(pl => { bySc[s.scenario][pl.name] = (bySc[s.scenario][pl.name] || 0) + 1; }); });
  // rozdíl mezi vítězem a druhým – ukazuje, jak těsné hry jsou
  const margins = ss.map(s => s.players.map(pl => +pl.score).filter(v => !isNaN(v)).sort((a, b) => b - a)).filter(a => a.length > 1).map(a => a[0] - a[1]);
  const avgMargin = margins.length ? (margins.reduce((a, v) => a + v, 0) / margins.length) : null;
  const bar = (label, val, max, txt) => `<div class="bar"><span class="n" title="${esc(label)}">${esc(label)}</span><span class="tr"><span class="fl" style="width:${max ? Math.round(val / max * 100) : 0}%"></span></span><span class="v">${txt}</span></div>`;
  const maxVer = Math.max(1, ...Object.values(byVer).map(x => x.min / x.n));
  main.innerHTML = `<div class="page">
    ${exampleBanner(p)}
    <div class="row spread"><h2>Testovací hry</h2><div class="row"><button class="btn primary" id="addSess">+ Zapsat odehranou hru</button></div></div>
    <div class="stat-row">
      <div class="stat"><span class="eyebrow">Odehráno</span><b>${n}</b><span class="muted">${plural(n, "hra", "hry", "her")}</span></div>
      <div class="stat"><span class="eyebrow">Průměrná délka</span><b>${avgMin}</b><span class="muted">minut (cíl ${esc(p.time)})</span></div>
      <div class="stat"><span class="eyebrow">Průměrně hráčů</span><b>${avgPl.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })}</b><span class="muted">u stolu</span></div>
      <div class="stat"><span class="eyebrow">Těsnost výsledku</span><b>${avgMargin == null ? "–" : avgMargin.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })}</b><span class="muted">bodů mezi 1. a 2. místem</span></div>
    </div>
    ${n ? `<div class="two">
      <div class="panel"><h3>Úspěšnost hráčů a stran</h3><div class="bars">${names.map(([k, v]) => bar(k, v.wins, v.games, `${v.wins}/${v.games}`)).join("")}</div>
        <h3>Výhry podle pořadí v tahu</h3><p class="hint">Prozradí výhodu prvního hráče. Hráče zapisuj v pořadí, v jakém hráli.</p>
        <div class="bars">${Object.entries(seat).map(([k, v]) => bar(`${+k + 1}. hráč`, v.wins, v.games, `${Math.round(v.wins / v.games * 100)} %`)).join("")}</div></div>
      <div class="panel"><h3>Délka podle verze</h3><div class="bars">${Object.entries(byVer).map(([k, v]) => bar("v" + k, v.min / v.n, maxVer, `${Math.round(v.min / v.n)} min`)).join("")}</div>
        <p class="hint">${Object.entries(byVer).map(([k, v]) => `v${esc(k)}: ${v.n} ${plural(v.n, "hra", "hry", "her")}`).join(" · ")}</p>
        ${Object.keys(bySc).length ? `<h3>Vítězové podle scénáře</h3>${Object.entries(bySc).map(([sc, w]) => `<div><b>${esc(sc)}</b>: ${Object.entries(w).map(([nm, c]) => `${esc(nm)} ${c}×`).join(", ") || "–"}</div>`).join("")}<p class="hint">Ve wargame zapisuj jako hráče strany (Modří, Červení), ať je vidět vyváženost scénáře.</p>` : ""}</div>
    </div>` : ""}
    ${surveySummaryHTML(ss)}
    <div class="list">${n ? ss.map(s => `<div class="sess">
      <div class="sess-hd"><b>${fmtDate(s.date)}${s.scenario ? ` · ${esc(s.scenario)}` : ""}</b><span class="muted mono" style="font-size:.85rem">v${esc(s.version)} · ${+s.minutes || 0} min · ${s.players.length} ${plural(s.players.length, "hráč", "hráči", "hráčů")}</span>
        <button class="btn small" data-edit="${s.id}">Upravit</button></div>
      <div class="row">${s.players.map(pl => `<span class="pl-chip ${pl.win ? "win" : ""}">${pl.win ? "★ " : ""}${esc(pl.name)}${pl.score !== "" && pl.score != null ? " · " + esc(pl.score) : ""}</span>`).join("")}</div>
      ${s.notes ? `<div style="white-space:pre-wrap">${esc(s.notes)}</div>` : ""}</div>`).join("")
      : `<div class="empty">Zatím žádné testy. Po každé hře zapiš hráče, body a poznámky, ať vidíš, jestli je hra vyvážená.</div>`}</div>
  </div>`;
  wireBanner(main);
  $("#addSess").onclick = () => editSession(p, null);
  $$("[data-edit]", main).forEach(b => b.onclick = () => editSession(p, p.sessions.find(s => s.id === b.dataset.edit)));
}
function fromTable(p) {
  const t = p.table; if (!t) return null;
  const pl = players(p, t);
  const scored = p.resources.some(r => r.vp && !r.global) || Object.keys(t.tableau || {}).length || Object.keys(t.won || {}).length;
  return { minutes: Math.round(clockMs(t) / 60000) || "", players: pl.map(f => ({ name: f.name, score: scored ? scoreOf(p, t, f.id).total : "", win: false })),
    scenario: (p.scenarios.find(s => s.id === t.scenarioId) || {}).name || "" };
}
function editSession(p, sess, prefill) {
  const isNew = !sess;
  const last = [...p.sessions].sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
  const ft = fromTable(p);
  const s = sess ? clone(sess) : { id: uid(), date: today(), version: p.version, minutes: "", notes: "", scenario: "",
    players: last ? last.players.map(pl => ({ name: pl.name, score: "", win: false })) : (p.units.length ? p.factions.map(f => ({ name: f.name, score: "", win: false })) : [{ name: "", score: "", win: false }, { name: "", score: "", win: false }]) };
  if (isNew && prefill && ft) Object.assign(s, ft);
  const d = openDialog(`<div class="row spread"><h2>${isNew ? "Zapsat odehranou hru" : "Upravit záznam"}</h2>${ft ? `<button class="btn small" id="s-ft">Načíst ze stolu</button>` : ""}</div>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">
      <label class="f">Datum<input type="date" id="s-date" value="${esc(s.date)}"></label>
      <label class="f">Verze pravidel<input type="text" id="s-ver" value="${esc(s.version)}"></label>
      <label class="f">Délka (min)<input type="number" id="s-min" min="0" value="${esc(s.minutes)}"></label>
      <label class="f">Scénář<select id="s-sc"><option value="">–</option>${p.scenarios.map(x => `<option ${x.name === s.scenario ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>
    </div>
    <div class="eyebrow">Hráči (nebo strany) v pořadí tahu</div>
    <div id="s-pl" style="display:flex;flex-direction:column;gap:8px"></div>
    <div><button class="btn small" id="s-addpl">+ Hráč</button></div>
    ${surveyHTML(s.survey)}
    <label class="f">Poznámky z testu<textarea id="s-notes" placeholder="Co fungovalo, co nudilo, kde se hráči zasekli, co změnit…">${esc(s.notes)}</textarea></label>
    <div class="row spread"><div>${isNew ? "" : `<button class="btn danger" id="s-del">Smazat</button>`}</div>
      <div class="row"><button class="btn" data-close>Zrušit</button><button class="btn primary" id="s-save">Uložit</button></div></div>`, true);
  const drawPl = () => {
    $("#s-pl", d).innerHTML = s.players.map((pl, i) => `<div class="pl-edit">
      <input type="text" data-pn="${i}" value="${esc(pl.name)}" placeholder="Jméno" aria-label="Jméno hráče ${i + 1}">
      <input type="number" data-ps="${i}" value="${esc(pl.score)}" placeholder="Body" aria-label="Body hráče ${i + 1}">
      <label class="chk"><input type="checkbox" data-pw="${i}" ${pl.win ? "checked" : ""}> Vítěz</label>
      <button class="btn small danger" data-pd="${i}" aria-label="Odebrat hráče">✕</button></div>`).join("");
    $$("[data-pn]", d).forEach(x => x.oninput = () => s.players[x.dataset.pn].name = x.value);
    $$("[data-ps]", d).forEach(x => x.oninput = () => s.players[x.dataset.ps].score = x.value === "" ? "" : +x.value);
    $$("[data-pw]", d).forEach(x => x.onchange = () => s.players[x.dataset.pw].win = x.checked);
    $$("[data-pd]", d).forEach(x => x.onclick = () => { s.players.splice(+x.dataset.pd, 1); drawPl(); });
  };
  drawPl(); const readSv = wireSurvey(d, s.survey = s.survey || {});
  if ($("#s-ft", d)) $("#s-ft", d).onclick = () => { const f = fromTable(p); s.players = f.players; if (f.minutes) $("#s-min", d).value = f.minutes; if (f.scenario) $("#s-sc", d).value = f.scenario; drawPl(); toast("Načteno ze stolu – jména můžeš přepsat"); };
  $("#s-addpl", d).onclick = () => { s.players.push({ name: "", score: "", win: false }); drawPl(); };
  $("#s-save", d).onclick = () => {
    s.date = $("#s-date", d).value || today(); s.version = $("#s-ver", d).value.trim(); s.minutes = +$("#s-min", d).value || 0; s.notes = $("#s-notes", d).value; s.scenario = $("#s-sc", d).value; s.survey = readSv();
    s.players = s.players.filter(pl => pl.name.trim());
    if (!s.players.length) { toast("Zapiš aspoň jednoho hráče"); return; }
    if (!s.players.some(pl => pl.win) && s.players.some(pl => pl.score !== "")) { const mx = Math.max(...s.players.map(pl => +pl.score || 0)); s.players.forEach(pl => pl.win = (+pl.score || 0) === mx); }
    if (isNew) p.sessions.push(s); else Object.assign(sess, s);
    touch(p); closeDialog(); render(); toast("Záznam uložen");
  };
  if (!isNew) $("#s-del", d).onclick = () => { p.sessions = p.sessions.filter(x => x.id !== sess.id); touch(p); closeDialog(); render(); };
}
