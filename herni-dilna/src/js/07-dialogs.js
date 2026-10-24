// ---------- dialogy ----------
function openDialog(html, wide) {
  const layer = $("#layer");
  layer.innerHTML = `<div class="scrim"><div class="dialog ${wide ? "wide" : ""}" role="dialog" aria-modal="true">${html}</div></div>`;
  const scrim = layer.firstElementChild;
  scrim.addEventListener("click", e => { if (e.target === scrim || e.target.closest("[data-close]")) closeDialog(); });
  return scrim.firstElementChild;
}
function closeDialog() { $("#layer").innerHTML = ""; }
onInit(() => document.addEventListener("keydown", e => { if (e.key === "Escape") closeDialog(); }));
function confirmDialog(title, text, okLabel, onOk) {
  const d = openDialog(`<h2>${esc(title)}</h2><p>${esc(text)}</p><div class="row" style="justify-content:flex-end"><button class="btn" data-close>Zrušit</button><button class="btn primary" id="okBtn">${esc(okLabel)}</button></div>`);
  $("#okBtn", d).onclick = () => { closeDialog(); onOk(); };
}
function askText(title, value, onOk, hint) {
  const d = openDialog(`<h2>${esc(title)}</h2>${hint ? `<p class="hint">${esc(hint)}</p>` : ""}<input type="text" id="askIn" value="${esc(value)}"><div class="row" style="justify-content:flex-end"><button class="btn" data-close>Zrušit</button><button class="btn primary" id="okBtn">Uložit</button></div>`);
  const i = $("#askIn", d); setTimeout(() => { i.focus(); i.select(); }, 30);
  const ok = () => { closeDialog(); onOk(i.value.trim()); };
  $("#okBtn", d).onclick = ok; i.addEventListener("keydown", e => { if (e.key === "Enter") ok(); });
}
function copyText(t) {
  const done = () => toast("Zkopírováno do schránky");
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, () => showText(t)); else showText(t);
}
function showText(t) {
  openDialog(`<h2>Záloha jako text</h2><p class="hint">Označ text a zkopíruj ho.</p><textarea id="txtOut" style="min-height:260px;font-family:var(--f-mono);font-size:.8rem">${esc(t)}</textarea><div class="row" style="justify-content:flex-end"><button class="btn" data-close>Zavřít</button></div>`);
  const ta = $("#txtOut"); ta.focus(); ta.select();
}
