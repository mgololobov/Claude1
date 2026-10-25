// ---------- Karty: vzácnost, rámečky, ruby, export obrázků ----------
const RARITIES = { "": "–", bezna: "Běžná", neobvykla: "Neobvyklá", vzacna: "Vzácná", legendarni: "Legendární" };
const FRAMES = { "": "Bez rámečku", tenky: "Tenký", dvojity: "Dvojitý", zdobny: "Zdobný", cerny: "Černý okraj" };
function loadScript(src) {
  return new Promise((res, rej) => { if ([...document.scripts].some(s => s.src === src)) return res(); const s = document.createElement("script"); s.src = src; s.onload = () => res(); s.onerror = () => rej(new Error("Nástroj pro export se nepodařilo načíst")); document.head.appendChild(s); });
}
const LIB_H2C = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
const LIB_ZIP = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
async function cardCanvas(html, width) {
  const box = document.createElement("div"); box.style.cssText = "position:fixed;left:-20000px;top:0"; box.innerHTML = html; document.body.appendChild(box);
  const el = box.firstElementChild; Object.assign(el.style, { fontSize: (width / 9.375) + "px", boxShadow: "none", borderRadius: "0", maxWidth: "none" });
  try { await document.fonts.ready; return await window.html2canvas(el, { backgroundColor: "#ffffff", scale: 1, useCORS: true, logging: false }); } finally { box.remove(); }
}
const toBlob = c => new Promise(r => c.toBlob(r, "image/png"));
async function offerBlob(filename, blob, okMsg) {
  const dl = await cap("downloads"); if (!dl) { toast("Stažení souboru funguje jen v aplikaci Claude"); return; }
  try { await dl.save({ filename, data: blob }); toast(okMsg); } catch (e) { if (e && e.code !== "declined") toast("Soubor se nepodařilo uložit"); }
}
async function exportImages(p, mode) {
  const decks = p.decks.filter(d => d.cards.length); if (!decks.length) { toast("Hra nemá žádné karty"); return; }
  try { toast("Načítám nástroje pro export…"); await loadScript(LIB_H2C); await loadScript(LIB_ZIP); }
  catch (e) { toast(e.message); return; }
  const zip = new window.JSZip(); let done = 0; const total = decks.reduce((a, d) => a + d.cards.length + 1, 0);
  const tick = () => { done++; if (done % 5 === 0) toast(`Vykresleno ${done} z ${total}…`); };
  for (const d of decks) {
    if (mode === "png") {
      for (const c of d.cards) { zip.file(`${slug(d.name)}/${slug(c.title) || c.id}.png`, await toBlob(await cardCanvas(cardHTML(c, d), 375))); tick(); }
      zip.file(`${slug(d.name)}/rub.png`, await toBlob(await cardCanvas(cardHTML({}, d, false), 375))); tick();
    } else {
      // Tabletop Simulator: archy 10 × 7, poslední pole archu zůstává prázdné (TTS ho používá jako skrytou kartu).
      const faces = []; d.cards.forEach(c => { for (let i = 0; i < Math.max(1, +c.qty || 0); i++) faces.push(c); });
      const W = 250, H = 350; const cache = new Map();
      for (let s = 0; s * 69 < faces.length; s++) {
        const part = faces.slice(s * 69, s * 69 + 69); const rows = Math.ceil((part.length + 1) / 10);
        const sheet = document.createElement("canvas"); sheet.width = W * 10; sheet.height = H * rows; const g = sheet.getContext("2d");
        for (let i = 0; i < part.length; i++) { const c = part[i]; if (!cache.has(c.id)) { cache.set(c.id, await cardCanvas(cardHTML(c, d), W)); tick(); } g.drawImage(cache.get(c.id), (i % 10) * W, Math.floor(i / 10) * H, W, H); }
        zip.file(`${slug(d.name)}-arch-${s + 1}-${part.length}karet.png`, await toBlob(sheet));
      }
      zip.file(`${slug(d.name)}-rub.png`, await toBlob(await cardCanvas(cardHTML({}, d, false), W))); tick();
    }
  }
  if (mode === "tts") zip.file("JAK-IMPORTOVAT.txt", "Tabletop Simulator: Objects → Components → Cards → Custom Deck.\nFace: arch karet, Back: soubor -rub.png.\nWidth 10, Height podle počtu řádků archu, Number = počet karet v názvu souboru.\n");
  toast("Balím soubory…");
  await offerBlob(`${slug(p.name)}-${mode === "png" ? "karty-obrazky" : "tabletop-simulator"}.zip`, await zip.generateAsync({ type: "blob" }), "Export uložen");
}
function printDialog(p) {
  const d = openDialog(`<h2>Tisková archa</h2>
    <label class="chk"><input type="checkbox" id="prBleed"> Spadávka 3 mm a ořezové značky (pro tiskárnu, 6 karet na stranu)</label>
    <label class="chk"><input type="checkbox" id="prBacks" checked> Přidat rubové strany</label>
    <label class="chk"><input type="checkbox" id="prFull" checked> Přidat mapu ve skutečné velikosti, markery, ukazatel kol a přehled pro hráče</label>
    <p class="hint">Bez spadávky se vejde 9 karet 63 × 88 mm na stranu A4. Soubor otevři v prohlížeči a vytiskni ve skutečné velikosti (100 %).</p>
    <div class="row" style="justify-content:flex-end"><button class="btn" data-close>Zrušit</button><button class="btn primary" id="prGo">Vytvořit</button></div>`);
  $("#prGo", d).onclick = () => { const opt = { bleed: $("#prBleed", d).checked, backs: $("#prBacks", d).checked, full: $("#prFull", d).checked }; closeDialog(); exportPrint(p, opt); };
}
function typeIconsHTML(p) {
  const types = [...new Set(p.decks.flatMap(d => d.cards.map(c => c.type)).filter(Boolean))];
  if (!types.length) return "";
  return `<div class="eyebrow">Ikony typů karet</div><div class="row">${types.map(t => `<label class="f" style="flex-direction:row;align-items:center;gap:6px;width:auto">${esc(t)}<input type="text" data-tyi="${esc(t)}" value="${esc((p.typeIcons || {})[t] || "")}" maxlength="3" style="width:60px" aria-label="Ikona typu ${esc(t)}"></label>`).join("")}</div>`;
}
