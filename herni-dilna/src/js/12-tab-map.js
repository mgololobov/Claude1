// ---------- Mapa ----------
function renderMap(main, p) {
  if (!p.boards.find(b => b.id === S.boardId)) S.boardId = p.boards[0] ? p.boards[0].id : null;
  const b = p.boards.find(x => x.id === S.boardId);
  if (!p.terrains.find(t => t.id === S.edTool) && !["erase", "label", "pan", "region", "number"].includes(S.edTool)) S.edTool = p.terrains[0] ? p.terrains[0].id : "pan";
  const tools = [...p.terrains.map(t => ({ k: t.id, label: t.name, sw: `<span class="terr-swatch" style="background:${t.color}">${esc(t.glyph)}</span>` })),
    { k: "erase", label: "Guma" }, { k: "label", label: "Popisek" }, { k: "region", label: "Oblast" }, { k: "number", label: "Číslo" }, { k: "pan", label: "Posun" }];
  main.innerHTML = `<div class="page" style="max-width:1400px">
    ${exampleBanner(p)}
    <div class="panel">
      <div class="row spread"><h2>Herní desky a mapy</h2><button class="btn" id="addBoard">+ Nová mapa</button></div>
      ${p.boards.length ? `<div class="decks">${p.boards.map(x => `<button class="chip" data-board="${x.id}" aria-pressed="${x.id === S.boardId}">${esc(x.name)} <span class="count">${x.type === "hex" ? "hexy" : "čtverce"} ${x.cols}×${x.rows}</span></button>`).join("")}</div>` : ""}
      ${b ? `
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">
        <label class="f">Název<input type="text" id="b-name" value="${esc(b.name)}"></label>
        <label class="f">Mřížka<select id="b-type"><option value="hex" ${b.type === "hex" ? "selected" : ""}>Hexy</option><option value="square" ${b.type === "square" ? "selected" : ""}>Čtverce</option></select></label>
        <label class="f">Sloupců<input type="number" id="b-cols" min="1" max="60" value="${b.cols}"></label>
        <label class="f">Řádků<input type="number" id="b-rows" min="1" max="60" value="${b.rows}"></label>
        <label class="f">Velikost pole<input type="number" id="b-size" min="16" max="80" value="${b.size}"></label>
        <label class="chk" style="align-self:end"><input type="checkbox" id="b-coords" ${b.coords !== false ? "checked" : ""}> Souřadnice</label>
      </div>
      <div class="row">
        <label class="btn small" for="bgFile">${b.bg ? "Vyměnit obrázek mapy" : "Nahrát obrázek mapy"}</label><input type="file" id="bgFile" accept="image/*" hidden>
        ${b.bg ? `<label class="f" style="flex-direction:row;align-items:center;gap:8px;min-width:200px">Průhlednost obrázku<input type="range" id="bgOp" min="0.1" max="1" step="0.05" value="${b.bg.opacity ?? 1}"></label>
          <label class="f" style="flex-direction:row;align-items:center;gap:8px;min-width:200px">Krytí terénu<input type="range" id="bgTop" min="0" max="1" step="0.05" value="${b.bg.terrainOpacity ?? .55}"></label>
          <button class="btn small danger" id="bgDel">Odebrat obrázek</button>` : `<span class="hint">Naskenovaná nebo nakreslená mapa se roztáhne pod mřížku. Počet polí pak dolaď, aby seděla.</span>`}
      </div>
      <div class="eyebrow">Nástroj – klepni nebo táhni po polích</div>
      <div class="row">${tools.map(t => `<button class="btn small tool ${S.edTool === t.k ? "on" : ""}" data-tool="${t.k}">${t.sw || ""}${esc(t.label)}</button>`).join("")}</div>
      ${S.edTool === "region" ? `<div class="row"><label class="f" style="flex-direction:row;align-items:center;gap:8px">Název oblasti<input type="text" id="regName" value="${esc(S.regionName || "")}" placeholder="např. Sever" style="width:180px"></label>${Object.keys(b.regions).length ? `<span class="row">${[...new Set(Object.values(b.regions))].map(n => `<button class="btn small" data-regpick="${esc(n)}"><span class="dot" style="background:${regionColor(b, n)}"></span>${esc(n)}</button>`).join("")}</span>` : ""}</div><p class="hint">Táhni po polích, která patří do oblasti. Oblasti slouží pro bodování většiny (area majority). Guma oblast z pole odebere.</p>` : ""}
      <div class="ed-wrap ${S.edTool !== "pan" ? "paint" : ""}" id="edWrap">${boardSVG(p, b, null, { id: "boardEd" })}</div>
      <div class="row spread"><span class="hint" id="hexInfo">Pole: –</span><div class="row"><button class="btn small" id="b-rand">Náhodné rozložení</button><button class="btn small" id="b-dup">Duplikovat mapu</button><button class="btn small danger" id="b-del">Smazat mapu</button></div></div>
      ` : `<div class="empty">Zatím žádná mapa. Vytvoř hexovou nebo čtvercovou desku, namaluj terén, nebo nahraj obrázek vlastní mapy.</div>`}
    </div>
    <div class="panel">
      <div class="row spread"><h2>Terén</h2><button class="btn small" id="addTerr">+ Typ terénu</button></div>
      <p class="hint">Cena pohybu a násobek obrany se ukážou v bojové kalkulačce na stole. Vítězné body se sčítají při kontrole území.</p>
      <div class="list">${p.terrains.map(t => `<div class="item-row">
        <span class="terr-swatch" style="background:${t.color};width:34px;height:34px;font-size:16px">${esc(t.glyph)}</span>
        <label class="f" style="flex:1;min-width:110px">Název<input type="text" data-trn="${t.id}" value="${esc(t.name)}"></label>
        <label class="f" style="width:70px">Značka<input type="text" data-trg="${t.id}" value="${esc(t.glyph)}" maxlength="2"></label>
        <label class="f" style="width:80px">Pohyb<input type="text" data-trm="${t.id}" value="${esc(t.move)}"></label>
        <label class="f" style="width:90px">Obrana ×<input type="number" step="0.5" data-trd="${t.id}" value="${esc(t.def)}"></label>
        <label class="f" style="width:80px">Body<input type="number" data-trv="${t.id}" value="${esc(t.vp)}"></label>
        <label class="f" style="width:96px" title="Posun sloupce bojové tabulky; záporný pomáhá obránci">Posun CRT<input type="number" data-trs="${t.id}" value="${esc(t.shift || 0)}"></label>
        <label class="f" style="width:64px">Barva<input type="color" data-trx="${t.id}" value="${t.color}" style="width:52px;height:40px;border:0;background:none;padding:0"></label>
        <label class="f" style="width:80px" title="Výška pro výhled a boj (0 = rovina)">Výška<input type="number" min="0" max="9" data-trh="${t.id}" value="${esc(t.h || 0)}"></label>
        <label class="chk"><input type="checkbox" data-trb="${t.id}" ${t.blocks ? "checked" : ""}> Blokuje výhled</label>
        <label class="chk" title="Oheň se do něj může šířit"><input type="checkbox" data-trf="${t.id}" ${t.burns ? "checked" : ""}> Hořlavý</label>
        <label class="f" style="width:130px">Produkuje<select data-trp="${t.id}"><option value="">nic</option>${p.resources.filter(r => !r.global).map(r => `<option value="${r.id}" ${r.id === t.produces ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</select></label>
        ${p.terrains.length > 1 ? `<button class="btn small danger" data-trdel="${t.id}" aria-label="Smazat terén">✕</button>` : ""}</div>`).join("")}</div>
    </div>${netEditorHTML(p)}</div>`;
  wireBanner(main); wireNetEditor(main, p);
  $("#addBoard").onclick = () => { const nb = { id: uid(), name: "Mapa " + (p.boards.length + 1), type: "hex", cols: 12, rows: 9, size: 34, terrain: {}, labels: {}, regions: {}, numbers: {}, bg: null }; p.boards.push(nb); S.boardId = nb.id; touch(p); render(); };
  $$("[data-board]", main).forEach(x => x.onclick = () => { S.boardId = x.dataset.board; render(); });
  $$("[data-tool]", main).forEach(x => x.onclick = () => { S.edTool = x.dataset.tool; render(); });
  if (b) {
    $("#b-name").addEventListener("input", e => { b.name = e.target.value; touch(p); });
    $("#b-name").addEventListener("change", render);
    const numCh = (id, key, min, max) => $("#" + id).addEventListener("change", e => { b[key] = Math.max(min, Math.min(max, parseInt(e.target.value, 10) || min)); touch(p); render(); });
    numCh("b-cols", "cols", 1, 60); numCh("b-rows", "rows", 1, 60); numCh("b-size", "size", 16, 80);
    $("#b-type").onchange = e => { b.type = e.target.value; touch(p); render(); };
    $("#b-coords").onchange = e => { b.coords = e.target.checked; touch(p); render(); };
    $("#bgFile").onchange = e => { const f = e.target.files[0]; if (f) uploadBg(p, b, f); };
    if (b.bg) {
      $("#bgOp").addEventListener("input", e => { b.bg.opacity = +e.target.value; const im = $("#boardEd image"); if (im) im.setAttribute("opacity", b.bg.opacity); });
      $("#bgOp").addEventListener("change", () => touch(p));
      $("#bgTop").addEventListener("change", e => { b.bg.terrainOpacity = +e.target.value; touch(p); render(); });
      $("#bgDel").onclick = () => { b.bg = null; touch(p); render(); };
    }
    $("#b-rand").onclick = () => {
      const total = b.cols * b.rows; const share = Math.floor(total / p.terrains.length);
      const d = openDialog(`<h2>Náhodné rozložení</h2><p class="hint">Proměnlivá příprava jako v Osadnících: terén se rozmístí náhodně podle počtů a pole, která něco produkují, dostanou náhodná čísla. Polí na mapě: ${total}.</p>
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">${p.terrains.map(t => `<label class="f"><span><span class="terr-swatch" style="background:${t.color}">${esc(t.glyph)}</span> ${esc(t.name)}</span><input type="number" min="0" data-rc="${t.id}" value="${share}"></label>`).join("")}</div>
        <label class="f">Čísla pro produkci<input type="text" id="randNum" value="2,3,3,4,4,5,5,6,6,8,8,9,9,10,10,11,11,12"></label>
        <p class="hint">Přepíše terén i čísla této mapy (jde vrátit duplikováním mapy předem).</p>
        <div class="row" style="justify-content:flex-end"><button class="btn" data-close>Zrušit</button><button class="btn primary" id="randOk">Rozmístit</button></div>`);
      $("#randOk", d).onclick = () => { const counts = {}; $$("[data-rc]", d).forEach(i => counts[i.dataset.rc] = Math.max(0, +i.value || 0)); randomizeBoard(p, b, counts, $("#randNum", d).value); closeDialog(); touch(p); render(); toast("Mapa rozložena náhodně"); };
    };
    $("#b-dup").onclick = () => { const nb = clone(b); nb.id = uid(); nb.name += " (kopie)"; p.boards.push(nb); S.boardId = nb.id; touch(p); render(); };
    $("#b-del").onclick = () => confirmDialog(`Smazat mapu „${b.name}“?`, "Scénáře, které ji používají, zůstanou bez mapy.", "Smazat", () => { p.boards = p.boards.filter(x => x.id !== b.id); touch(p); render(); });
    wireBoardEditor(p, b);
    if ($("#regName")) $("#regName").addEventListener("input", e => { S.regionName = e.target.value.trim(); });
    $$("[data-regpick]", main).forEach(x => x.onclick = () => { S.regionName = x.dataset.regpick; render(); });
  }
  $("#addTerr").onclick = () => { p.terrains.push({ id: uid(), name: "Nový terén", color: COLORS[p.terrains.length % COLORS.length], glyph: "", move: "1", def: 1, vp: 0 }); touch(p); render(); };
  const tr = id => p.terrains.find(t => t.id === id);
  const tin = (attr, key, conv = v => v, rer) => $$(`[${attr}]`, main).forEach(i => { i.addEventListener("input", () => { tr(i.getAttribute(attr))[key] = conv(i.value); touch(p); }); if (rer) i.addEventListener("change", render); });
  tin("data-trn", "name", v => v, true); tin("data-trg", "glyph", v => v, true); tin("data-trm", "move"); tin("data-trd", "def", v => +v || 1); tin("data-trv", "vp", v => +v || 0); tin("data-trs", "shift", v => parseInt(v, 10) || 0);
  $$("[data-trx]", main).forEach(x => x.addEventListener("change", () => { tr(x.dataset.trx).color = x.value; touch(p); render(); }));
  $$("[data-trb]", main).forEach(x => x.onchange = () => { tr(x.dataset.trb).blocks = x.checked; touch(p); });
  $$("[data-trf]", main).forEach(x => x.onchange = () => { tr(x.dataset.trf).burns = x.checked; touch(p); });
  $$("[data-trh]", main).forEach(x => x.onchange = () => { tr(x.dataset.trh).h = +x.value || 0; touch(p); });
  $$("[data-trp]", main).forEach(x => x.onchange = () => { tr(x.dataset.trp).produces = x.value; touch(p); });
  $$("[data-trdel]", main).forEach(x => x.onclick = () => { const id = x.dataset.trdel; p.terrains = p.terrains.filter(t => t.id !== id); p.boards.forEach(bb => Object.keys(bb.terrain).forEach(k => { if (bb.terrain[k] === id) delete bb.terrain[k]; })); touch(p); render(); });
}
function wireBoardEditor(p, b) {
  const svg = $("#boardEd"); if (!svg) return;
  const g = geo(b);
  const cellAt = e => { const r = svg.getBoundingClientRect(); const sx = g.W / r.width; return g.pick((e.clientX - r.left) * sx, (e.clientY - r.top) * sx); };
  let painting = false, last = null, changed = false;
  const info = $("#hexInfo");
  const apply = cr => {
    if (!cr) return; const k = cr.join(","); if (k === last) return; last = k;
    if (S.edTool === "erase") { if (b.terrain[k] || b.labels[k] || b.regions[k] || b.numbers[k]) { delete b.terrain[k]; delete b.labels[k]; delete b.regions[k]; delete b.numbers[k]; changed = true; } }
    else if (S.edTool === "region") { if (!S.regionName) { toast("Nejdřív napiš název oblasti"); painting = false; return; } if (b.regions[k] !== S.regionName) { b.regions[k] = S.regionName; changed = true; } }
    else if (p.terrains.find(t => t.id === S.edTool)) { if (b.terrain[k] !== S.edTool) { b.terrain[k] = S.edTool; changed = true; } }
    const poly = svg.querySelector(`polygon.cell[data-k="${k}"]`);
    if (poly) { const t = terrainOf(p, b, k); poly.setAttribute("fill", t ? t.color : (b.bg ? "transparent" : p.terrains[0].color)); }
  };
  svg.addEventListener("pointermove", e => { const cr = cellAt(e); if (cr) { const t = terrainOf(p, b, cr.join(",")) || p.terrains[0]; info.textContent = `Pole ${pad2(cr[0] + 1)}${pad2(cr[1] + 1)} · ${t ? t.name : ""}${b.labels[cr.join(",")] ? " · " + b.labels[cr.join(",")] : ""}`; } if (painting) apply(cr); });
  svg.addEventListener("pointerdown", e => {
    if (S.edTool === "pan") return;
    const cr = cellAt(e); if (!cr) return;
    if (S.edTool === "number") { const k = cr.join(","); askText(`Číslo pole ${pad2(cr[0] + 1)}${pad2(cr[1] + 1)}`, b.numbers[k] || "", v => { if (+v >= 2 && +v <= 12) b.numbers[k] = +v; else delete b.numbers[k]; touch(p); render(); }, "Součet 2k6 (2–12), při kterém pole produkuje. Prázdné číslo smaže."); return; }
    if (S.edTool === "label") { const k = cr.join(","); askText(`Popisek pole ${pad2(cr[0] + 1)}${pad2(cr[1] + 1)}`, b.labels[k] || "", v => { if (v) b.labels[k] = v; else delete b.labels[k]; touch(p); render(); }, "Název města, řeky nebo oblasti. Prázdné pole popisek smaže."); return; }
    e.preventDefault(); svg.setPointerCapture(e.pointerId); painting = true; last = null; changed = false; apply(cr);
  });
  const end = () => { if (!painting) return; painting = false; if (changed) { touch(p); const w = $("#edWrap"); const keep = [w.scrollLeft, w.scrollTop]; render(); const w2 = $("#edWrap"); if (w2) { w2.scrollLeft = keep[0]; w2.scrollTop = keep[1]; } } };
  svg.addEventListener("pointerup", end); svg.addEventListener("pointercancel", end);
}
async function uploadBg(p, b, file) {
  toast("Zpracovávám obrázek…");
  try { const r = await storeImage(file, { max: 2400, dataMax: 1400, limit: 170000 }); b.bg = { url: r.url, id: r.id, data: r.data, opacity: 1, terrainOpacity: .35 }; touch(p); render(); toast("Obrázek mapy nahrán"); }
  catch { toast("Obrázek se nepodařilo nahrát. Zkus JPG nebo PNG."); }
}
