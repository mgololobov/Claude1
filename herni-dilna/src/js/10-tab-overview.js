// ---------- Přehled ----------
function renderOverview(main, p) {
  const log = [...p.changelog].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const nCards = p.decks.reduce((n, d) => n + d.cards.reduce((m, c) => m + (+c.qty || 0), 0), 0);
  const nUnits = p.units.reduce((n, u) => n + (+u.qty || 0), 0);
  main.innerHTML = `<div class="page">
    ${exampleBanner(p)}${startGuideHTML(p)}
    <div class="two">
      <div class="panel">
        <div class="eyebrow">Hra · verze ${esc(p.version)}</div>
        <div class="hero-name">${esc(p.name)}</div>
        <div class="facts"><span class="fact">${esc(p.players)} hráči</span><span class="fact">${esc(p.time)}</span><span class="fact">${esc(p.age)}</span>
          <span class="fact">${nCards} karet</span>${nUnits ? `<span class="fact">${nUnits} jednotek</span>` : ""}${p.boards.length ? `<span class="fact">${p.boards.length} ${plural(p.boards.length, "mapa", "mapy", "map")}</span>` : ""}
          ${p.scenarios.length ? `<span class="fact">${p.scenarios.length} ${plural(p.scenarios.length, "scénář", "scénáře", "scénářů")}</span>` : ""}
          <span class="fact">${p.sessions.length} ${plural(p.sessions.length, "test", "testy", "testů")}</span></div>
        <div class="grid">
          <label class="f">Název<input type="text" id="o-name" value="${esc(p.name)}"></label>
          <label class="f">Verze<input type="text" id="o-version" value="${esc(p.version)}"></label>
          <label class="f">Počet hráčů<input type="text" id="o-players" value="${esc(p.players)}"></label>
          <label class="f">Délka hry<input type="text" id="o-time" value="${esc(p.time)}"></label>
          <label class="f">Věk<input type="text" id="o-age" value="${esc(p.age)}"></label>
        </div>
        <label class="f">Krátký popis<textarea id="o-summary" style="min-height:80px">${esc(p.summary)}</textarea></label>
        <label class="f">Pravidla<textarea id="o-rules" style="min-height:300px">${esc(p.rules)}</textarea></label>
      </div>
      <div class="panel">
        <h2>Historie změn</h2>
        <p class="hint">Zapiš, co jsi po testu změnila. U každého testu se pak ukáže verze, se kterou se hrálo.</p>
        <div class="row" style="align-items:flex-end">
          <label class="f" style="width:80px">Verze<input type="text" id="cl-ver" value="${esc(p.version)}"></label>
          <label class="f" style="flex:1;min-width:140px">Změna<input type="text" id="cl-note" placeholder="Např. zlevněn sklad na 3 mince"></label>
          <button class="btn primary" id="cl-add">Přidat</button>
        </div>
        ${log.length ? `<ul class="changelog">${log.map(c => `<li><span class="ver">v${esc(c.ver)}</span><span>${esc(c.note)}<br><span class="muted" style="font-size:.8rem">${fmtDate(c.date)}</span></span><button class="btn small danger" data-del="${c.id}" aria-label="Smazat záznam">✕</button></li>`).join("")}</ul>` : `<div class="empty">Zatím žádné změny.</div>`}
        <hr class="sep">
        <h3>Záloha a přenos</h3>
        <div class="row">
          <button class="btn" id="exp">Stáhnout zálohu</button>
          <button class="btn" id="expCopy">Zkopírovat jako text</button>
          <label class="btn" for="impFile">Nahrát zálohu</label>
          <input type="file" id="impFile" accept=".json,application/json" hidden>
        </div>
        <div class="row"><button class="btn" id="addEx">Přidat ukázkové hry</button><button class="btn danger" id="delProj">Smazat tuto hru</button></div>
      </div>
      ${overviewExtras(p)}
    </div></div>`;
  wireBanner(main); wireStartGuide(main, p);
  const bind = (id, key) => $("#" + id).addEventListener("input", e => { p[key] = e.target.value; touch(p); if (key === "name") $("#projSel").selectedOptions[0].textContent = p.name; });
  bind("o-name", "name"); bind("o-version", "version"); bind("o-players", "players"); bind("o-time", "time"); bind("o-age", "age"); bind("o-summary", "summary"); bind("o-rules", "rules");
  ["o-name", "o-version", "o-players", "o-time", "o-age"].forEach(id => $("#" + id).addEventListener("change", () => render()));
  $("#cl-add").onclick = () => { const note = $("#cl-note").value.trim(); if (!note) { $("#cl-note").focus(); return; } p.changelog.push({ id: uid(), ver: $("#cl-ver").value.trim() || p.version, date: today(), note }); touch(p); render(); };
  $$("[data-del]", main).forEach(b => b.onclick = () => { p.changelog = p.changelog.filter(c => c.id !== b.dataset.del); touch(p); render(); });
  const json = () => { const q = clone(p); delete q.isExample; return JSON.stringify(q, null, 2); };
  const fname = () => (p.name || "hra").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase() + "-v" + (p.version || "0") + ".json";
  $("#exp").onclick = async () => { const dl = await cap("downloads"); if (!dl) { if (!localDownload(fname(), json(), "Záloha uložena do Stažených souborů")) copyText(json()); return; } try { await dl.save({ filename: fname(), data: json() }); toast("Záloha uložena"); } catch (e) { if (e && e.code !== "declined") copyText(json()); } };
  $("#expCopy").onclick = () => copyText(json());
  $("#impFile").onchange = e => {
    const f = e.target.files[0]; if (!f) return; const r = new FileReader();
    r.onload = () => { try { const q = JSON.parse(r.result); if (!q || !Array.isArray(q.decks)) throw 0; q.id = uid(); delete q.isExample; q.name = (q.name || "Hra") + " (import)"; normalize(q); S.projects.unshift(q); S.currentId = q.id; touch(q); render(); toast("Záloha nahrána jako nová hra"); } catch { toast("Soubor není záloha z Herní dílny"); } };
    r.readAsText(f);
  };
  $("#addEx").onclick = () => { const xs = allExamples(); S.projects = [...S.projects.filter(p => !p.isExample), ...xs]; S.currentId = xs[0].id; render(); toast("Ukázkové hry obnoveny v aktuální verzi"); };
  wireOverviewExtras(main, p);
  $("#delProj").onclick = () => confirmDialog(`Smazat hru „${p.name}“?`, "Smažou se karty, mapy, scénáře i záznamy testů. Nejde to vrátit.", "Smazat", () => removeProject(p));
}
