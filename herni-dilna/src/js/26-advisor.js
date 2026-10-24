// ---------- Poradce Claude ----------
function projectBrief(p) {
  const L = [];
  L.push(`Hra: ${p.name} (verze ${p.version}), ${p.players} hráči, ${p.time}, ${p.age}.`, `Popis: ${p.summary || "–"}`, `Pravidla:\n${(p.rules || "–").slice(0, 6000)}`);
  if (p.phases.length) L.push(`Fáze kola: ${p.phases.join(" → ")}`);
  if (p.factions.length) L.push(`Strany: ${p.factions.map(f => f.name + (f.ability ? ` (schopnost: ${f.ability})` : "") + (f.setup ? ` [start: ${f.setup}]` : "")).join("; ")}`);
  if (p.resources.length) L.push(`Zdroje: ${p.resources.map(r => `${r.name} (start ${r.start}, příjem ${r.income}${r.vp ? ", vítězné body" : ""}${r.global ? ", společný" : ""})`).join("; ")}`);
  if (p.actions.length) L.push(`Akce (${p.actionMode}): ${p.actions.map(a => `${a.name}: ${a.text}`).join("; ")}`);
  p.decks.slice(0, 8).forEach(d => L.push(`Balíček ${d.name}${d.starter ? " (startovní)" : ""}${+d.market ? ` (trh ${d.market})` : ""}:\n` + d.cards.slice(0, 60).map(c => `- ${c.qty}× ${c.title}${c.type ? " [" + c.type + "]" : ""}${c.cost ? " cena " + c.cost : ""}${c.vp ? " body " + c.vp : ""}${c.suit ? " " + c.value + c.suit : ""}: ${String(c.text).replace(/\n/g, " ")}${c.effect ? " {efekt: " + c.effect + "}" : ""}`).join("\n")));
  if (p.units.length) L.push(`Jednotky: ${p.units.map(u => `${u.qty}× ${u.name} ${unitVals(u, false)}`).join("; ")}`);
  if (p.ruleset.triggers.length) L.push(`Automatická pravidla: ${p.ruleset.triggers.map(r => `${TRIGGERS[r.on]}${r.param ? " (" + r.param + ")" : ""} → ${r.effect}`).join("; ")}`);
  const ss = p.sessions.slice(-10); if (ss.length) L.push(`Testy (${p.sessions.length}): ` + ss.map(s => `${s.date} v${s.version} ${s.minutes} min, ${s.players.map(x => x.name + (x.score !== "" ? " " + x.score : "") + (x.win ? "★" : "")).join(", ")}${s.notes ? " – " + s.notes : ""}`).join(" | "));
  return L.join("\n\n").slice(0, 30000);
}
const AI_TASKS = {
  balance: { label: "Zhodnotit vyváženost", prompt: "Jsi zkušený vývojář deskových her. Zhodnoť vyváženost a herní zážitek této hry. Upozorni na přesílené nebo zbytečné karty a strategie, výhodu prvního hráče, délku hry a na to, co ukazují záznamy testů. Navrhni 3–6 konkrétních úprav (čísla, ceny, počty). Piš česky, stručně, v odrážkách." },
  clarity: { label: "Najít nejasnosti v pravidlech", prompt: "Jsi editor pravidel deskových her. Projdi pravidla a najdi nejasnosti, chybějící případy, rozpory a místa, kde se hráči budou hádat. U každého problému navrhni přesné znění opravy. Piš česky, v odrážkách." },
  playtest: { label: "Připravit plán testování", prompt: "Připrav plán dalšího testování této hry: co konkrétně sledovat, jaké otázky položit testerům po hře, jaké varianty vyzkoušet a jak poznat, že je úprava úspěšná. Piš česky, stručně, v odrážkách." },
};
async function askAdvisor(p, key, out) {
  const sample = await cap("sample");
  if (!sample) { out.textContent = "Poradce funguje jen v aplikaci Claude (claude.ai). Tady není dostupný."; return; }
  out.textContent = "Přemýšlím…";
  try { await sample(AI_TASKS[key].prompt + "\n\nPODKLADY HRY:\n" + projectBrief(p), { onText: ({ text }) => { out.textContent = text; } }); }
  catch (e) { out.textContent = aiErr(e); }
}
function aiErr(e) { return ({ not_granted: "Použití Claude nebylo povoleno.", rate_limited: "Moc dotazů najednou – zkus to za chvíli." })[e && e.code] || ((e && e.text) ? e.text + "\n\n(Odpověď se nedokončila.)" : "Poradce teď neodpověděl. Zkus to znovu."); }
async function askCards(p, deck, n, theme, box) {
  const sample = await cap("sample");
  if (!sample) { box.innerHTML = `<p class="hint">Poradce funguje jen v aplikaci Claude (claude.ai).</p>`; return; }
  box.innerHTML = `<p class="hint">Navrhuji karty…</p>`;
  try {
    const res = await sample.json(`Jsi vývojář deskových her. Navrhni ${n} nových karet do balíčku „${deck.name}“ hry níže, aby zapadly do stylu a čísel ostatních karet${theme ? " a odpovídaly zadání: " + theme : ""}. Vrať POUZE JSON objekt {"cards":[{"title":"","type":"","cost":"","text":"","qty":1,"suit":"","value":"","vp":"","icon":"","effect":""}]}. Pole effect vyplň jen jednoduchým zápisem, kterému aplikace rozumí: "+2 Název zdroje", "-1 Název zdroje", "všichni +1 Název", "líznout 1", "táhnout 1 z Název sáčku", "posun +2", "zpráva Text"; jinak nech prázdné. Texty česky.\n\nPODKLADY HRY:\n` + projectBrief(p), { modelTier: "default" });
    const cards = (res && Array.isArray(res.cards) ? res.cards : []).slice(0, 12).map(c => ({ id: uid(), title: String(c.title || "Karta"), type: String(c.type || ""), cost: String(c.cost ?? ""), text: String(c.text || ""), qty: Math.max(1, Math.min(9, parseInt(c.qty, 10) || 1)), suit: String(c.suit || ""), value: String(c.value ?? ""), vp: String(c.vp ?? ""), icon: String(c.icon || "").slice(0, 4), effect: String(c.effect || ""), locked: false }));
    if (!cards.length) { box.innerHTML = `<p class="hint">Návrh nepřišel ve správném tvaru. Zkus to znovu.</p>`; return; }
    S.aiCards = cards;
    box.innerHTML = `<div class="card-grid">${cards.map((c, i) => `<label class="card-cell" style="cursor:pointer">${cardHTML(c, deck)}<span class="qty"><input type="checkbox" data-aic="${i}" checked> ${c.qty}× přidat${checkEffect(p, c.effect).length ? " · ⚠ efekt" : ""}</span></label>`).join("")}</div>
      <button class="btn primary" id="aiAdd">Přidat vybrané do „${esc(deck.name)}“</button>`;
    $("#aiAdd").onclick = () => { const sel = $$("[data-aic]", box).filter(x => x.checked).map(x => S.aiCards[+x.dataset.aic]); deck.cards.push(...sel); touch(p); toast(`Přidáno ${sel.length} ${plural(sel.length, "karta", "karty", "karet")}`); box.innerHTML = `<p class="hint">Karty jsou v balíčku „${esc(deck.name)}“.</p>`; };
  } catch (e) { box.innerHTML = `<p class="hint">${esc(aiErr(e))}</p>`; }
}
function overviewExtras(p) {
  const lint = lintProject(p); const errs = lint.filter(x => x.lv === "err"), warns = lint.filter(x => x.lv === "warn");
  const size = JSON.stringify(p).length;
  return `${versionsHTML(p)}${bookPanelHTML(p)}<div class="panel"><div class="row spread"><h2>Kontrola návrhu</h2><span class="count">${Math.round(size / 1024)} kB</span></div>
      ${lint.length ? `<div class="list">${[...errs, ...warns].map(x => `<div class="lint ${x.lv}"><b>${x.lv === "err" ? "Chyba" : "Upozornění"}</b><span>${esc(x.t)}</span></div>`).join("")}</div>`
        : `<div class="lint ok"><b>V pořádku</b><span>Efekty, odkazy na zdroje, balíčky, mapy i scénáře dávají smysl.</span></div>`}
      <p class="hint">Kontroluje zápis efektů, odkazy na smazané zdroje a mapy, trh větší než balíček, dílky, bojovou tabulku a velikost projektu.</p></div>
    <div class="panel"><h2>Poradce Claude</h2>
      <p class="hint">Claude si přečte pravidla, karty i záznamy testů a poradí. Každý dotaz spotřebuje tvoje využití Claude a poprvé se zeptá na povolení.</p>
      <div class="row">${Object.entries(AI_TASKS).map(([k, v]) => `<button class="btn small" data-ai="${k}">${v.label}</button>`).join("")}</div>
      <div id="aiOut" class="ai-out">${S.aiText ? esc(S.aiText) : ""}</div>
      ${p.decks.length ? `<hr class="sep"><h3>Navrhnout nové karty</h3>
      <div class="grid" style="grid-template-columns:1fr 80px"><label class="f">Do balíčku<select id="aiDeck">${p.decks.map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join("")}</select></label><label class="f">Kolik<input type="number" id="aiN" min="1" max="12" value="5"></label></div>
      <label class="f">Zadání (nepovinné)<input type="text" id="aiTheme" placeholder="Např. levné karty pro začátek hry, téma pirátů"></label>
      <button class="btn primary" id="aiCards">Navrhnout karty</button><div id="aiCardBox"></div>` : ""}</div>`;
}
function wireOverviewExtras(main, p) {
  wireVersions(main, p); wireBookPanel(main, p);
  $$("[data-ai]", main).forEach(b => b.onclick = async () => { const out = $("#aiOut"); $$("[data-ai]", main).forEach(x => x.disabled = true); await askAdvisor(p, b.dataset.ai, out); S.aiText = out.textContent; $$("[data-ai]", main).forEach(x => x.disabled = false); });
  if ($("#aiCards")) $("#aiCards").onclick = async () => { const btn = $("#aiCards"); btn.disabled = true; await askCards(p, p.decks.find(d => d.id === $("#aiDeck").value), Math.max(1, Math.min(12, +$("#aiN").value || 5)), $("#aiTheme").value.trim(), $("#aiCardBox")); btn.disabled = false; };
}
