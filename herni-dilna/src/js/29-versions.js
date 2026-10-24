// ---------- Verze návrhu ----------
// Verze je snímek návrhu (bez stolu, testů a vložených obrázků). Lze ji porovnat s aktuálním stavem nebo obnovit.
function designSnapshot(p) {
  const q = clone(p); delete q.table; delete q.sessions; delete q.versions; delete q.isExample; delete q.online;
  q.decks.forEach(d => { if (d.backImg && d.backImg.startsWith("data:")) d.backImg = ""; d.cards.forEach(c => { if (c.img && c.img.startsWith("data:")) c.img = ""; }); });
  q.boards.forEach(b => { if (b.bg && b.bg.data) b.bg = null; });
  return q;
}
function saveVersion(p, ver, note) {
  p.versions = p.versions || [];
  const v = { id: uid(), ver: ver || p.version, note: note || "", date: today(), created: Date.now(), snap: designSnapshot(p) };
  p.versions.push(v); p.changelog.push({ id: uid(), ver: v.ver, date: v.date, note: note ? `Uložena verze: ${note}` : "Uložena verze návrhu" });
  return v;
}
function diffDesign(a, b) {
  const out = []; const add = (kind, text) => out.push({ kind, text });
  const fields = { title: "název", type: "typ", cost: "cena", text: "text", qty: "počet", suit: "barva", value: "hodnota", vp: "body", icon: "ikona", effect: "efekt", locked: "zamčení" };
  const da = Object.fromEntries((a.decks || []).map(d => [d.id, d])), db = Object.fromEntries((b.decks || []).map(d => [d.id, d]));
  Object.values(db).forEach(d => { if (!da[d.id]) add("+", `Nový balíček „${d.name}“ (${d.cards.length} druhů karet)`); });
  Object.values(da).forEach(d => { if (!db[d.id]) add("−", `Smazán balíček „${d.name}“`); });
  Object.values(db).forEach(d => { const o = da[d.id]; if (!o) return;
    const ca = Object.fromEntries(o.cards.map(c => [c.id, c]));
    d.cards.forEach(c => { const x = ca[c.id]; if (!x) { add("+", `${d.name}: nová karta „${c.title}“`); return; }
      const ch = Object.keys(fields).filter(k => String(x[k] ?? "") !== String(c[k] ?? "")).map(k => k === "text" ? "text" : `${fields[k]} ${x[k] === "" || x[k] == null ? "–" : x[k]} → ${c[k] === "" || c[k] == null ? "–" : c[k]}`);
      if (ch.length) add("~", `${d.name}: „${c.title}“ – ${ch.join(", ")}`); });
    const ids = new Set(d.cards.map(c => c.id)); o.cards.forEach(c => { if (!ids.has(c.id)) add("−", `${d.name}: smazána karta „${c.title}“`); });
  });
  const cmpList = (key, label, name, fieldsFn) => { const A = Object.fromEntries((a[key] || []).map(x => [x.id, x])), B = Object.fromEntries((b[key] || []).map(x => [x.id, x]));
    Object.values(B).forEach(x => { if (!A[x.id]) add("+", `${label}: nový „${name(x)}“`); else { const ch = fieldsFn(A[x.id], x); if (ch) add("~", `${label} „${name(x)}“: ${ch}`); } });
    Object.values(A).forEach(x => { if (!B[x.id]) add("−", `${label}: smazán „${name(x)}“`); }); };
  const diffKeys = (x, y, keys) => keys.filter(k => String(x[k] ?? "") !== String(y[k] ?? "")).map(k => `${k} ${x[k] ?? "–"} → ${y[k] ?? "–"}`).join(", ");
  cmpList("actions", "Akce", x => x.name, (x, y) => diffKeys(x, y, ["name", "text", "slots", "effect"]));
  cmpList("resources", "Zdroj", x => x.name, (x, y) => diffKeys(x, y, ["name", "start", "income", "max", "vp"]));
  cmpList("factions", "Strana", x => x.name, (x, y) => diffKeys(x, y, ["name", "ability", "setup"]));
  cmpList("units", "Jednotka", x => x.name, (x, y) => diffKeys(x, y, ["name", "att", "def", "mov", "rAtt", "rDef", "rMov", "qty"]));
  if ((a.phases || []).join("|") !== (b.phases || []).join("|")) add("~", `Fáze: ${(a.phases || []).join(" → ")} ⟶ ${(b.phases || []).join(" → ")}`);
  const la = String(a.rules || "").split("\n"), lb = String(b.rules || "").split("\n"); const sa = new Set(la), sb = new Set(lb);
  lb.filter(l => l.trim() && !sa.has(l)).slice(0, 8).forEach(l => add("+", `Pravidla: ${l}`)); la.filter(l => l.trim() && !sb.has(l)).slice(0, 8).forEach(l => add("−", `Pravidla: ${l}`));
  const ra = JSON.stringify(a.ruleset || {}), rb = JSON.stringify(b.ruleset || {}); if (ra !== rb) add("~", "Změněno nastavení hlídání pravidel nebo automatických pravidel");
  ["name", "players", "time", "summary"].forEach(k => { if (String(a[k] ?? "") !== String(b[k] ?? "")) add("~", `${{ name: "Název", players: "Hráči", time: "Délka", summary: "Popis" }[k]}: ${a[k] || "–"} → ${b[k] || "–"}`); });
  return out;
}
function versionsHTML(p) {
  const vs = [...(p.versions || [])].reverse();
  return `<div class="panel"><h2>Verze návrhu</h2>
    <p class="hint">Ulož stav hry před větší úpravou. Verzi pak porovnáš s aktuálním stavem nebo ji obnovíš. Testy se k verzím přiřazují podle čísla verze.</p>
    <div class="row" style="align-items:flex-end"><label class="f" style="width:90px">Verze<input type="text" id="vVer" value="${esc(p.version)}"></label>
      <label class="f" style="flex:1;min-width:140px">Poznámka<input type="text" id="vNote" placeholder="Např. před zlevněním skladu"></label><button class="btn primary" id="vSave">Uložit verzi</button></div>
    ${vs.length ? `<div class="list">${vs.map(v => `<div class="item-row"><span class="ver">v${esc(v.ver)}</span><span style="flex:1;min-width:120px">${esc(v.note || "bez poznámky")}<br><span class="count">${fmtDate(v.date)} · ${p.sessions.filter(s => s.version === v.ver).length} testů</span></span>
      <button class="btn small" data-vdiff="${v.id}">Porovnat</button><button class="btn small" data-vrest="${v.id}">Obnovit</button><button class="btn small danger" data-vdel="${v.id}" aria-label="Smazat verzi">✕</button></div>`).join("")}</div>` : `<div class="empty">Zatím žádná uložená verze.</div>`}</div>`;
}
function wireVersions(main, p) {
  if (!$("#vSave")) return;
  $("#vSave").onclick = () => { const v = saveVersion(p, $("#vVer").value.trim(), $("#vNote").value.trim()); touch(p); render(); toast(`Verze ${v.ver} uložena`); };
  $$("[data-vdiff]", main).forEach(b => b.onclick = () => { const v = p.versions.find(x => x.id === b.dataset.vdiff); const d = diffDesign(v.snap, designSnapshot(p));
    openDialog(`<h2>v${esc(v.ver)} → aktuální stav</h2>${d.length ? `<div class="list">${d.map(x => `<div class="diff ${x.kind === "+" ? "add" : x.kind === "−" ? "del" : "chg"}"><b>${x.kind}</b><span>${esc(x.text)}</span></div>`).join("")}</div>` : `<p>Žádné rozdíly.</p>`}<div class="row" style="justify-content:flex-end"><button class="btn primary" data-close>Zavřít</button></div>`, true); });
  $$("[data-vrest]", main).forEach(b => b.onclick = () => { const v = p.versions.find(x => x.id === b.dataset.vrest);
    confirmDialog(`Obnovit verzi ${v.ver}?`, "Návrh se vrátí do stavu této verze. Stůl, testy a verze zůstanou. Aktuální stav si předtím ulož jako verzi, pokud ho chceš zachovat. Obnovu jde vrátit tlačítkem ↶.", "Obnovit", () => {
      const keep = { id: p.id, table: p.table, sessions: p.sessions, versions: p.versions, changelog: p.changelog }; const snap = clone(v.snap);
      Object.keys(p).forEach(k => delete p[k]); Object.assign(p, normalize({ ...snap, ...keep })); p.changelog.push({ id: uid(), ver: v.ver, date: today(), note: `Obnovena verze ${v.ver}` }); touch(p); render(); toast(`Verze ${v.ver} obnovena`); }); });
  $$("[data-vdel]", main).forEach(b => b.onclick = () => confirmDialog("Smazat verzi?", "Snímek návrhu se smaže. Testy zůstanou.", "Smazat", () => { p.versions = p.versions.filter(x => x.id !== b.dataset.vdel); touch(p); render(); }));
}
