// ---------- Scénáře ----------
function renderScenarios(main, p) {
  const cnt = s => (s.setup && s.setup.items ? s.setup.items.length : 0);
  main.innerHTML = `<div class="page">
    ${exampleBanner(p)}
    <div class="row spread"><h2>Scénáře</h2><button class="btn primary" id="addSc">+ Nový scénář</button></div>
    <p class="hint">Scénář si pamatuje mapu, rozestavění jednotek a žetonů, kontrolu území, počet kol a podmínky vítězství. Rozestav jednotky na stole a ulož je tlačítkem „Uložit rozestavění ze stolu“.</p>
    ${p.scenarios.length ? p.scenarios.map(s => `<div class="panel">
      <div class="row spread"><input type="text" data-sn="${s.id}" value="${esc(s.name)}" style="font-family:var(--f-display);font-weight:700;font-size:1.2rem;max-width:420px" aria-label="Název scénáře">
        <div class="row"><button class="btn primary" data-play="${s.id}">Spustit na stole</button><button class="btn" data-save="${s.id}">Uložit rozestavění ze stolu</button></div></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
        <label class="f">Mapa<select data-sb="${s.id}"><option value="">Bez mapy</option>${p.boards.map(b => `<option value="${b.id}" ${b.id === s.boardId ? "selected" : ""}>${esc(b.name)}</option>`).join("")}</select></label>
        <label class="f">Počet kol<input type="number" min="1" max="99" data-st="${s.id}" value="${esc(s.turns)}"></label>
        <div class="f"><span>Rozestavění</span><span style="color:var(--ink);font-weight:400;padding-top:10px">${cnt(s)} ${plural(cnt(s), "položka", "položky", "položek")}, ${Object.keys((s.setup && s.setup.control) || {}).length} ovládaných polí</span></div>
      </div>
      <label class="f">Úvod a situace<textarea data-sd="${s.id}" style="min-height:70px">${esc(s.desc)}</textarea></label>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
        <label class="f">Podmínky vítězství<textarea data-sv="${s.id}" style="min-height:90px">${esc(s.victory)}</textarea></label>
        <label class="f">Zvláštní pravidla<textarea data-ss="${s.id}" style="min-height:90px">${esc(s.special)}</textarea></label>
      </div>
      <div class="row"><span class="hint">Hlídaný cíl na konci posledního kola:</span><select data-shf="${s.id}" style="width:auto"><option value="">nehlídat</option>${p.factions.map(f => `<option value="${f.id}" ${f.id === s.holdF ? "selected" : ""}>${esc(f.name)}</option>`).join("")}</select>
        <span class="hint">musí ovládat pole</span><input type="text" data-shl="${s.id}" value="${esc(s.holdLabels || "")}" placeholder="Brod, Most" style="width:180px" aria-label="Popisky polí"></div>
      <div class="row"><button class="btn small" data-dup="${s.id}">Duplikovat</button><button class="btn small danger" data-del="${s.id}">Smazat</button></div>
    </div>`).join("") : `<div class="empty">Zatím žádný scénář.</div>`}
    <div class="panel"><h2>Kampaň a legacy</h2>
      <p class="hint">Zapisuj výsledky scénářů za sebou a odemykej zamčené karty, které do hry vstoupí až později (karta má v editoru volbu „Zamčená“).</p>
      <div class="row"><input type="text" id="cmpText" placeholder="Např. Scénář 1: vyhráli Modří, most zničen" style="flex:1;width:auto"><button class="btn primary" id="cmpAdd">Zapsat</button></div>
      ${p.campaign.log.length ? `<ul class="changelog">${[...p.campaign.log].reverse().map(e => `<li><span class="ver">${fmtDate(e.date)}</span><span>${esc(e.text)}</span><button class="btn small danger" data-cmpdel="${e.id}" aria-label="Smazat záznam">✕</button></li>`).join("")}</ul>` : ""}
      ${(() => { const lk = p.decks.flatMap(d => d.cards.filter(c => c.locked).map(c => ({ d, c }))); return lk.length ? `<div class="eyebrow">Zamčené karty</div><div class="row">${lk.map(x => `<button class="btn small" data-unlock="${x.d.id}|${x.c.id}">🔓 ${esc(x.c.title)} <span class="count">${esc(x.d.name)}</span></button>`).join("")}</div>` : `<span class="hint">Žádné zamčené karty.</span>`; })()}
    </div>
  </div>`;
  wireBanner(main);
  const Sc = id => p.scenarios.find(s => s.id === id);
  $("#addSc").onclick = () => { p.scenarios.push({ id: uid(), name: "Scénář " + (p.scenarios.length + 1), turns: 6, boardId: p.boards[0] ? p.boards[0].id : "", desc: "", victory: "", special: "", setup: { items: [], control: {} } }); touch(p); render(); };
  const tin = (attr, key, conv = v => v) => $$(`[${attr}]`, main).forEach(i => i.addEventListener("input", () => { Sc(i.getAttribute(attr))[key] = conv(i.value); touch(p); }));
  tin("data-sn", "name"); tin("data-sd", "desc"); tin("data-sv", "victory"); tin("data-ss", "special"); tin("data-st", "turns", v => Math.max(1, parseInt(v, 10) || 1));
  $$("[data-sb]", main).forEach(i => i.onchange = () => { Sc(i.dataset.sb).boardId = i.value; touch(p); });
  $$("[data-shf]", main).forEach(i => i.onchange = () => { Sc(i.dataset.shf).holdF = i.value; touch(p); });
  $$("[data-shl]", main).forEach(i => i.addEventListener("input", () => { Sc(i.dataset.shl).holdLabels = i.value; touch(p); }));
  $("#cmpAdd").onclick = () => { const v = $("#cmpText").value.trim(); if (!v) return; p.campaign.log.push({ id: uid(), date: today(), text: v }); touch(p); render(); };
  $$("[data-cmpdel]", main).forEach(b => b.onclick = () => { p.campaign.log = p.campaign.log.filter(e => e.id !== b.dataset.cmpdel); touch(p); render(); });
  $$("[data-unlock]", main).forEach(b => b.onclick = () => { const [dId, cId] = b.dataset.unlock.split("|"); const d = p.decks.find(x => x.id === dId); const c = d.cards.find(x => x.id === cId); c.locked = false;
    p.campaign.log.push({ id: uid(), date: today(), text: `Odemčena karta ${c.title} (${d.name})` });
    if (p.table && p.table.piles[dId]) { for (let i = 0; i < (+c.qty || 0); i++) p.table.piles[dId].push(c.id); shuffle(p.table.piles[dId]); }
    touch(p); render(); toast(`Karta ${c.title} odemčena`); });
  $$("[data-play]", main).forEach(b => b.onclick = () => startScenario(p, Sc(b.dataset.play)));
  $$("[data-save]", main).forEach(b => b.onclick = () => {
    const s = Sc(b.dataset.save); const t = ensureTable(p);
    const n = t.items.filter(i => i.kind !== "card").length;
    confirmDialog("Uložit rozestavění?", `Do scénáře se uloží ${n} jednotek a žetonů ze stolu a kontrola území. Karty se neukládají – ty se při spuštění zamíchají.`, "Uložit", () => {
      s.setup = { items: clone(t.items.filter(i => i.kind !== "card")), control: clone(t.control) }; if (t.boardId) s.boardId = t.boardId; touch(p); render(); toast("Rozestavění uloženo do scénáře"); });
  });
  $$("[data-dup]", main).forEach(b => b.onclick = () => { const n = clone(Sc(b.dataset.dup)); n.id = uid(); n.name += " (kopie)"; p.scenarios.push(n); touch(p); render(); });
  $$("[data-del]", main).forEach(b => b.onclick = () => confirmDialog("Smazat scénář?", "Nejde to vrátit.", "Smazat", () => { p.scenarios = p.scenarios.filter(s => s.id !== b.dataset.del); touch(p); render(); }));
}
function startScenario(p, s) {
  p.table = null; const t = ensureTable(p);
  t.boardId = s.boardId || null; t.scenarioId = s.id; t.turn = 1; t.phaseIdx = 0;
  t.items = clone((s.setup && s.setup.items) || []).map(i => ({ ...i, uid: uid() }));
  t.control = clone((s.setup && s.setup.control) || {});
  S.sel = null; S.tool = "kolo"; S.tab = "stul"; touch(p); render(); toast(`Scénář „${s.name}“ připraven`);
}
