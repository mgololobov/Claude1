// ---------- Obrázky ----------
// Přednostně úložiště artefaktu (plná kvalita). Bez něj se obrázek zmenší a uloží přímo do projektu.
async function storeImage(file, opt = {}) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  const draw = max => { const sc = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(img.width * sc)); c.height = Math.max(1, Math.round(img.height * sc)); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); return c; };
  let max = opt.dataMax || 1400, q = .72, data; const limit = opt.limit || 170000;
  do { data = draw(max).toDataURL("image/jpeg", q); max = Math.round(max * .8); q = Math.max(.45, q - .07); } while (data.length > limit && max > 100);
  return { data };
}
// Pro tiskovou archu: obrázky z úložiště převede na data, aby šly vytisknout i offline.
async function inlineImages(html) {
  const urls = [...new Set([...html.matchAll(/url\('([^']+)'\)/g)].map(m => m[1]).filter(u => !u.startsWith("data:")))];
  for (const u of urls) {
    try { const real = u.replace(/&amp;/g, "&"); const b = await (await fetch(real)).blob(); const d = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); }); html = html.split(u).join(d); } catch {}
  }
  return html;
}
