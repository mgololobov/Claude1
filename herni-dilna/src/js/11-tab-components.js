// ---------- Komponenty ----------
function renderComponents(main, p) {
  if (!p.decks.find(d => d.id === S.deckId)) S.deckId = p.decks[0] ? p.decks[0].id : null;
  const deck = p.decks.find(d => d.id === S.deckId);
  const total = deck ? deck.cards.reduce((n, c) => n + (+c.qty || 0), 0) : 0;
  const flt = (S.cardFilter || "").toLowerCase();
  const shown = deck ? deck.cards.filter(c => !flt || [c.title, c.type, c.text, c.suit].join(" ").toLowerCase().includes(flt)) : [];
  const byF = p.factions.map(f => ({ f, us: p.units.filter(u => u.factionId === f.id) }));
  const orphan = p.units.filter(u => !p.factions.find(f => f.id === u.factionId));
  main.innerHTML = `<div class="page">
    ${exampleBanner(p)}
    <div class="panel">
      <div class="row spread"><h2>Balíčky karet</h2><div class="row"><button class="btn" id="addDeck">+ Nový balíček</button><button class="btn primary" id="printPlan">Co vytisknout</button><button class="btn" id="printSheet">Tisková archa</button><button class="btn" id="pngExp">Obrázky karet</button><button class="btn" id="ttsExp">Tabletop Simulator</button><button class="btn" id="csvExp">Export CSV</button></div></div>
      <div class="decks">${p.decks.map(d => `<button class="chip" data-deck="${d.id}" aria-pressed="${d.id === S.deckId}"><span class="dot" style="background:${d.color}"></span>${esc(d.name)} <span class="count">${d.cards.reduce((n, c) => n + (+c.qty || 0), 0)}${d.starter ? " · start" : ""}${+d.market ? " · trh " + d.market : ""}</span></button>`).join("")}</div>
      ${deck ? `
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">
        <label class="f">Název balíčku<input type="text" id="d-name" value="${esc(deck.name)}"></label>
        <label class="f">Nápis na rubu<input type="text" id="d-back" value="${esc(deck.back)}"></label>
        <label class="f">Karet na trhu (0 = bez trhu)<input type="number" id="d-market" min="0" max="10" value="${+deck.market || 0}"></label>
        <label class="chk" style="align-self:end"><input type="checkbox" id="d-starter" ${deck.starter ? "checked" : ""}> Startovní balíček – každý hráč dostane vlastní kopii</label>
        <label class="f">Šablona karet<select id="d-tpl">${Object.entries(CARD_TEMPLATES).map(([k, v]) => `<option value="${k}" ${k === (deck.template || "classic") ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <label class="f">Rámeček<select id="d-frame">${Object.entries(FRAMES).map(([k, v]) => `<option value="${k}" ${k === (deck.frame || "") ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <div class="f"><span>Obrázek rubu</span><span class="row"><label class="btn small" for="d-backf">${deck.backImg ? "Vyměnit" : "Nahrát"}</label><input type="file" id="d-backf" accept="image/*" hidden>${deck.backImg ? `<button class="btn small danger" id="d-backdel">Odebrat</button>` : ""}</span></div>
        <label class="f">Písmo karet<select id="d-font">${Object.entries(CARD_FONTS).map(([k, v]) => `<option value="${k}" ${k === (deck.font || "") ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      </div>
      <div class="f"><span>Barva</span>${swatchRow(deck.color, "data-color")}</div>
      ${typeIconsHTML(p)}
      <div class="row spread">
        <span class="muted">${deck.cards.length} ${plural(deck.cards.length, "druh", "druhy", "druhů")} karet, celkem ${total} ${plural(total, "kus", "kusy", "kusů")}</span>
        <div class="row"><input type="text" id="cardFilter" placeholder="Hledat kartu…" value="${esc(S.cardFilter || "")}" style="width:180px"><button class="btn primary" id="addCard">+ Nová karta</button><button class="btn" id="bulk">Hromadně vložit</button><button class="btn" id="aiFill">✨ Efekty z textu</button><button class="btn danger" id="delDeck">Smazat balíček</button></div>
      </div>
      ${deck.cards.length ? `<div class="card-grid">${shown.map(c => `<button class="card-cell" data-card="${c.id}" aria-label="Upravit kartu ${esc(c.title)}">${cardHTML(c, deck)}<span class="qty">${c.qty}×${c.locked ? " · 🔒 zamčená" : ""}${c.effect ? " · ⚡" : ""}</span></button>`).join("")}
        ${flt ? "" : `<div class="card-cell">${cardHTML({}, deck, false)}<span class="qty">rub</span></div>`}</div>
        ${flt && !shown.length ? `<div class="empty">Žádná karta neodpovídá hledání.</div>` : ""}`
        : `<div class="empty">Balíček je prázdný. Přidej první kartu nebo vlož celý seznam najednou.</div>`}
      ` : `<div class="empty">Hra zatím nemá žádný balíček.</div>`}
    </div>
    <div class="panel">
      <div class="row spread"><h2>Jednotky (wargame žetony)</h2><button class="btn primary" id="addUnit">+ Nová jednotka</button></div>
      <p class="hint">Čtvercové žetony s označením, vojenskou značkou a hodnotami útok-obrana-pohyb. Druhá strana je oslabená jednotka. Barvu určuje strana – strany spravuješ v záložce Mechaniky.</p>
      ${p.units.length ? [...byF, { f: { name: "Bez strany", color: "#888" }, us: orphan }].filter(x => x.us.length).map(({ f, us }) => `
        <div class="eyebrow" style="display:flex;gap:6px;align-items:center"><span class="dot" style="background:${f.color}"></span>${esc(f.name)} · ${us.reduce((n, u) => n + (+u.qty || 0), 0)} ks</div>
        <div class="unit-grid">${us.map(u => `<button class="unit-cell" data-unit="${u.id}" aria-label="Upravit ${esc(u.name)}"><span class="pair">${unitHTML(p, u)}${hasReduced(u) ? unitHTML(p, u, true) : ""}</span><span class="lbl">${esc(u.name)} · ${u.qty}×</span></button>`).join("")}</div>`).join("")
        : `<div class="empty">Zatím žádné jednotky. Hodí se pro wargames a hry s kontrolou území.</div>`}
    </div>
    <div class="two">
      <div class="panel">
        <div class="row spread"><h2>Sáčky</h2><button class="btn small" id="addBag">+ Sáček</button></div>
        <p class="hint">Sáček s žetony na náhodné tahání: bag building, aktivace jednotek (chit-pull) i riskování (push your luck). Označ žetony, které hráče „přetáhnou“.</p>
        ${p.bags.length ? p.bags.map(b => `<div class="item-row" style="flex-direction:column;align-items:stretch">
          <div class="row"><input type="text" data-bn="${b.id}" value="${esc(b.name)}" aria-label="Název sáčku" style="flex:1;width:auto;font-weight:700">
            <label class="f" style="flex-direction:row;align-items:center;gap:6px;width:auto">Přetažení při<input type="number" min="0" max="20" data-bb="${b.id}" value="${+b.bustLimit || 0}" style="width:70px"></label>
            <button class="btn small danger" data-bdel="${b.id}" aria-label="Smazat sáček">✕</button></div>
          ${b.contents.map((c, i) => `<div class="row"><input type="color" data-bcc="${b.id}" data-i="${i}" value="${c.color}" aria-label="Barva" style="width:44px;height:36px;border:0;background:none;padding:0">
            <input type="text" data-bcl="${b.id}" data-i="${i}" value="${esc(c.label)}" aria-label="Žeton" style="flex:1;width:auto">
            <input type="number" min="0" max="99" data-bcn="${b.id}" data-i="${i}" value="${c.count}" aria-label="Počet" style="width:70px">
            <label class="chk"><input type="checkbox" data-bcx="${b.id}" data-i="${i}" ${c.bust ? "checked" : ""}> Riziko</label>
            <button class="btn small" data-bcd="${b.id}" data-i="${i}" aria-label="Odebrat žeton">✕</button></div>`).join("")}
          <div><button class="btn small" data-bca="${b.id}">+ Druh žetonu</button> <span class="hint">celkem ${b.contents.reduce((a, c) => a + (+c.count || 0), 0)} žetonů</span></div></div>`).join("") : `<div class="empty">Žádné sáčky.</div>`}
      </div>
      <div class="panel">
        <div class="row spread"><h2>Vlastní kostky</h2><button class="btn small" id="addDie">+ Kostka</button></div>
        <p class="hint">Stěny odděl čárkou. Symbol se může opakovat, prázdná stěna je „nic“. Např. ⚔,⚔,🛡,💰,★, – kostka může mít 2 až 100 stěn.</p>
        <div class="row"><span class="hint">Nová kostka s čísly:</span>${[4, 8, 10, 12, 20].map(s => `<button class="btn small" data-dnew="${s}">k${s}</button>`).join("")}</div>
        ${p.cdice.length ? p.cdice.map(d => `<div class="item-row">
          <input type="color" data-dc="${d.id}" value="${d.color}" aria-label="Barva kostky" style="width:44px;height:36px;border:0;background:none;padding:0">
          <input type="text" data-dn="${d.id}" value="${esc(d.name)}" aria-label="Název kostky" style="width:150px">
          <label class="f" style="flex-direction:row;align-items:center;gap:6px;width:auto">Stěn<input type="number" data-dfn="${d.id}" min="2" max="100" value="${d.faces.length}" style="width:70px"></label>
          <input type="text" data-df="${d.id}" value="${esc(d.faces.join(","))}" aria-label="Stěny kostky" style="flex:1;min-width:160px;width:auto">
          <span class="row">${d.faces.slice(0, 20).map(f => `<span class="die cust" style="--c:${d.color};width:30px;height:30px;font-size:.8rem;color:${inkFor(d.color)}">${esc(f) || "·"}</span>`).join("")}${d.faces.length > 20 ? `<span class="hint">… ${d.faces.length} stěn</span>` : ""}</span>
          <button class="btn small danger" data-ddel="${d.id}" aria-label="Smazat kostku">✕</button></div>`).join("") : `<div class="empty">Žádné vlastní kostky.</div>`}
      </div>
    </div>
    <div class="panel">
      <div class="row spread"><h2>Dílky (pokládání dílků)</h2><button class="btn small" id="addTile">+ Dílek</button></div>
      <p class="hint">Dílky se pokládají na pole mapy jako v Carcassonne. Hrany zapiš čárkou po směru hodinových ručiček od horní: 4 hrany pro čtvercovou mapu, 6 pro hexovou. Stejná označení musí navazovat, např. L = louka, C = cesta, M = město.</p>
      <div class="row"><label class="chk"><input type="checkbox" id="tlMatch" ${p.tileRules.match ? "checked" : ""}> Hrany musí navazovat</label><label class="chk"><input type="checkbox" id="tlAdj" ${p.tileRules.adjacent ? "checked" : ""}> Nový dílek musí sousedit s položeným</label></div>
      ${p.tiles.length ? `<div class="list">${p.tiles.map(x => `<div class="item-row">${tilePreview(p, x, 0, 24)}
        <input type="color" data-tlc="${x.id}" value="${x.color}" aria-label="Barva dílku" style="width:44px;height:36px;border:0;background:none;padding:0">
        <label class="f" style="flex:1;min-width:110px">Název<input type="text" data-tln="${x.id}" value="${esc(x.name)}"></label>
        <label class="f" style="width:150px">Hrany<input type="text" data-tle="${x.id}" value="${esc(x.edges)}" placeholder="L,C,L,M"></label>
        <label class="f" style="width:70px">Ikona<input type="text" data-tli="${x.id}" value="${esc(x.icon)}" maxlength="3"></label>
        <label class="f" style="width:70px">Počet<input type="number" min="0" max="99" data-tlq="${x.id}" value="${x.qty}"></label>
        <button class="btn small danger" data-tldel="${x.id}" aria-label="Smazat dílek">✕</button></div>`).join("")}</div>` : `<div class="empty">Žádné dílky.</div>`}
    </div>
    <div class="panel">
      <div class="row spread"><h2>Žetony, markery a figurky</h2><div class="row"><button class="btn" id="addEquip">+ Vybavení jednotky</button><button class="btn" id="addTok">+ Nový žeton</button></div></div>
      <p class="hint">Žeton může nést krátký popis (např. OPEV., BEZ ZÁS.) a počítadlo, které na stole měníš tlačítky + a −. <b>Vybavení</b> (zbraň, předmět) je malý žeton, který se připne na jednotku a upraví její hodnoty.</p>
      ${p.tokens.length ? `<div class="list">${p.tokens.map(t => `<div class="item-row">
        <div style="position:relative">${tokenHTML(t, 3)}</div>
        <label class="f" style="flex:1;min-width:120px">Název<input type="text" data-tname="${t.id}" value="${esc(t.name)}"></label>
        <label class="f" style="width:120px">Popis na žetonu<input type="text" data-ttext="${t.id}" value="${esc(t.text)}" maxlength="12"></label>
        <label class="f">Tvar<select data-tshape="${t.id}">${Object.entries(SHAPES).map(([k, v]) => `<option value="${k}" ${k === t.shape ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        ${swatchRow(t.color, `data-tc="${t.id}" data-tcolor`)}
        <label class="chk"><input type="checkbox" data-tcount="${t.id}" ${t.counter ? "checked" : ""}> Počítadlo</label>
        <label class="f" style="width:110px" title="Kolik kusů vytisknout (prázdné = odhad podle hry)">Kusů k tisku<input type="number" min="0" max="200" data-tpq="${t.id}" value="${esc(t.printQty ?? "")}" placeholder="${tokenPrintQty(p, { ...t, printQty: "" })}"></label>
        <label class="chk" title="Malý žeton se přetažením připne na jednotku a upraví její hodnoty"><input type="checkbox" data-tsmall="${t.id}" ${t.small ? "checked" : ""}> Malý žeton – vybavení jednotky</label>
        ${fxEditorHTML(t)}
        <label class="chk" title="Po položení zůstává na místě (okop, minové pole); úpravy platí pro jednotky na stejném poli"><input type="checkbox" data-tfixed="${t.id}" ${t.fixed ? "checked" : ""}> Pevný – zůstává na místě</label>
        ${t.fixed ? `<label class="chk"><input type="checkbox" data-tbuild="${t.id}" ${t.buildable ? "checked" : ""}> Jednotky ho mohou postavit</label><label class="chk" title="Bonus platí jen proti útoku z přední výseče žetonu; žeton natočíš na stole"><input type="checkbox" data-tfront="${t.id}" ${t.frontOnly ? "checked" : ""}> Chrání jen zepředu</label>` : ""}
        ${t.small || t.fixed ? `<div class="row" style="width:100%"><span class="hint">${t.fixed ? "Bonus jednotkám na poli:" : "Úpravy jednotky:"}</span>${MODS.filter(([m]) => !t.fixed || m !== "mHp").map(([m, , l]) => `<label class="f" style="width:84px">${l}<input type="number" data-tmod="${m}|${t.id}" value="${esc(t[m] || "")}" placeholder="±0"></label>`).join("")}
          ${t.small ? `<label class="f" style="width:84px" title="Kolik zabere z nosnosti jednotky">Váha<input type="number" data-tw="${t.id}" min="0" value="${esc(t.weight ?? "")}" placeholder="1"></label><label class="f" style="width:110px" title="Obrana navíc jen pro tuto zónu jednotky">Zóna<input type="text" data-tzone="${t.id}" value="${esc(t.zone || "")}" placeholder="např. Hlava"></label><label class="f" style="width:96px">Obrana zóny<input type="number" data-tmod="mZone|${t.id}" value="${esc(t.mZone || "")}" placeholder="±0"></label>` : ""}</div>` : ""}
        ${t.small ? `<div data-tifbox="${t.id}" style="width:100%">${itemFxHTML(t, "data-if", false)}</div>` : ""}
        <button class="btn small danger" data-tdel="${t.id}" aria-label="Smazat žeton">✕</button></div>`).join("")}</div>`
        : `<div class="empty">Zatím žádné žetony.</div>`}
    </div></div>`;
  wireBanner(main);
  $("#addUnit").onclick = () => editUnit(p, null);
  $$("[data-unit]", main).forEach(b => b.onclick = () => editUnit(p, p.units.find(u => u.id === b.dataset.unit)));
  $$("[data-deck]", main).forEach(b => b.onclick = () => { S.deckId = b.dataset.deck; S.cardFilter = ""; render(); });
  $("#addDeck").onclick = () => { const d = { id: uid(), name: "Balíček " + (p.decks.length + 1), color: COLORS[p.decks.length % COLORS.length], back: p.name.toUpperCase(), cards: [], market: 0, starter: false }; p.decks.push(d); S.deckId = d.id; touch(p); render(); };
  $("#printSheet").onclick = () => printDialog(p);
  $("#printPlan").onclick = () => printPlanDialog(p);
  $("#pngExp").onclick = () => exportImages(p, "png");
  $("#ttsExp").onclick = () => exportImages(p, "tts");
  $("#csvExp").onclick = () => exportCSV(p);
  if (deck) {
    $("#d-name").addEventListener("input", e => { deck.name = e.target.value; touch(p); }); $("#d-name").addEventListener("change", render);
    $("#d-back").addEventListener("input", e => { deck.back = e.target.value; touch(p); }); $("#d-back").addEventListener("change", render);
    $("#d-market").addEventListener("change", e => { deck.market = Math.max(0, Math.min(10, parseInt(e.target.value, 10) || 0)); touch(p); render(); });
    $("#d-tpl").onchange = e => { deck.template = e.target.value; touch(p); render(); };
    $("#d-font").onchange = e => { deck.font = e.target.value; touch(p); render(); };
    $("#d-frame").onchange = e => { deck.frame = e.target.value; touch(p); render(); };
    $("#d-backf").onchange = async e => { const f = e.target.files[0]; if (!f) return; toast("Nahrávám rub…"); try { const r = await storeImage(f, { max: 1000, dataMax: 420, limit: 45000 }); deck.backImg = r.url || r.data; touch(p); render(); } catch { toast("Obrázek se nepodařilo načíst"); } };
    if ($("#d-backdel")) $("#d-backdel").onclick = () => { deck.backImg = ""; touch(p); render(); };
    $$("[data-tyi]", main).forEach(i => i.addEventListener("change", () => { p.typeIcons = p.typeIcons || {}; p.typeIcons[i.dataset.tyi] = i.value.trim(); touch(p); render(); }));
    $("#d-starter").onchange = e => { deck.starter = e.target.checked; touch(p); render(); toast("Projeví se po vyčištění stolu"); };
    $("#cardFilter").addEventListener("input", e => { S.cardFilter = e.target.value; const pos = e.target.selectionStart; render(); const f = $("#cardFilter"); f.focus(); f.setSelectionRange(pos, pos); });
    $$("[data-color]", main).forEach(b => b.onclick = () => { deck.color = b.dataset.color; touch(p); render(); });
    $("#addCard").onclick = () => editCard(p, deck, null);
    $("#bulk").onclick = () => bulkDialog(p, deck);
    $("#aiFill").onclick = () => aiFillDeck(p, deck);
    $("#delDeck").onclick = () => confirmDialog(`Smazat balíček „${deck.name}“?`, `Smaže se ${deck.cards.length} ${plural(deck.cards.length, "druh", "druhy", "druhů")} karet.`, "Smazat", () => { p.decks = p.decks.filter(d => d.id !== deck.id); touch(p); render(); });
    $$("[data-card]", main).forEach(b => b.onclick = () => editCard(p, deck, deck.cards.find(c => c.id === b.dataset.card)));
  }
  // sáčky
  const B = id => p.bags.find(b => b.id === id);
  $("#addBag").onclick = () => { p.bags.push({ id: uid(), name: "Sáček " + (p.bags.length + 1), bustLimit: 0, contents: [{ label: "Bílý", color: "#eeeeee", count: 6, bust: false }, { label: "Černý", color: "#333333", count: 3, bust: true }] }); touch(p); render(); };
  $$("[data-bn]", main).forEach(i => i.addEventListener("input", () => { B(i.dataset.bn).name = i.value; touch(p); }));
  $$("[data-bb]", main).forEach(i => i.addEventListener("change", () => { B(i.dataset.bb).bustLimit = Math.max(0, +i.value || 0); touch(p); }));
  $$("[data-bdel]", main).forEach(x => x.onclick = () => { p.bags = p.bags.filter(b => b.id !== x.dataset.bdel); touch(p); render(); });
  const bc = (el, key, conv) => { const b = B(el.getAttribute(key)); return b.contents[+el.dataset.i]; };
  $$("[data-bcl]", main).forEach(i => i.addEventListener("input", () => { bc(i, "data-bcl").label = i.value; touch(p); }));
  $$("[data-bcc]", main).forEach(i => i.addEventListener("change", () => { bc(i, "data-bcc").color = i.value; touch(p); }));
  $$("[data-bcn]", main).forEach(i => i.addEventListener("change", () => { bc(i, "data-bcn").count = Math.max(0, parseInt(i.value, 10) || 0); touch(p); render(); }));
  $$("[data-bcx]", main).forEach(i => i.onchange = () => { bc(i, "data-bcx").bust = i.checked; touch(p); });
  $$("[data-bcd]", main).forEach(x => x.onclick = () => { B(x.dataset.bcd).contents.splice(+x.dataset.i, 1); touch(p); render(); });
  $$("[data-bca]", main).forEach(x => x.onclick = () => { B(x.dataset.bca).contents.push({ label: "Nový", color: COLORS[B(x.dataset.bca).contents.length % COLORS.length], count: 1, bust: false }); touch(p); render(); });
  // kostky
  const D = id => p.cdice.find(d => d.id === id);
  $("#addDie").onclick = () => { p.cdice.push({ id: uid(), name: "Kostka " + (p.cdice.length + 1), color: "#4a4a48", faces: ["⚔", "⚔", "🛡", "★", "", ""] }); touch(p); render(); };
  $$("[data-dn]", main).forEach(i => i.addEventListener("input", () => { D(i.dataset.dn).name = i.value; touch(p); }));
  $$("[data-dc]", main).forEach(i => i.addEventListener("change", () => { D(i.dataset.dc).color = i.value; touch(p); render(); }));
  $$("[data-df]", main).forEach(i => i.addEventListener("change", () => { const f = i.value.split(",").map(s => s.trim()); D(i.dataset.df).faces = f.length >= 2 ? f.slice(0, 100) : ["1", "2"]; touch(p); render(); }));
  $$("[data-dfn]", main).forEach(i => i.addEventListener("change", () => { const d = D(i.dataset.dfn); const n = Math.max(2, Math.min(100, parseInt(i.value, 10) || 6)); const f = d.faces.slice(0, n); while (f.length < n) f.push(String(f.length + 1)); d.faces = f; touch(p); render(); }));
  $$("[data-dnew]", main).forEach(b => b.onclick = () => { const s = +b.dataset.dnew; p.cdice.push({ id: uid(), name: "k" + s, color: "#4a4a48", faces: Array.from({ length: s }, (_, i) => String(i + 1)) }); touch(p); render(); });
  $$("[data-ddel]", main).forEach(x => x.onclick = () => { p.cdice = p.cdice.filter(d => d.id !== x.dataset.ddel); touch(p); render(); });
  // dílky
  const TL = id => p.tiles.find(x => x.id === id);
  $("#addTile").onclick = () => { p.tiles.push({ id: uid(), name: "Dílek " + (p.tiles.length + 1), color: "#c9d6a3", edges: "L,L,L,L", icon: "", qty: 4 }); touch(p); render(); };
  $("#tlMatch").onchange = e => { p.tileRules.match = e.target.checked; touch(p); };
  $("#tlAdj").onchange = e => { p.tileRules.adjacent = e.target.checked; touch(p); };
  const tlin = (attr, key, conv = v => v) => $$(`[${attr}]`, main).forEach(i => i.addEventListener("change", () => { TL(i.getAttribute(attr))[key] = conv(i.value); touch(p); render(); }));
  tlin("data-tlc", "color"); tlin("data-tln", "name"); tlin("data-tle", "edges", v => v.split(",").map(x => x.trim()).join(",")); tlin("data-tli", "icon"); tlin("data-tlq", "qty", v => Math.max(0, parseInt(v, 10) || 0));
  $$("[data-tldel]", main).forEach(x => x.onclick = () => { p.tiles = p.tiles.filter(z => z.id !== x.dataset.tldel); touch(p); render(); });
  // žetony
  $("#addTok").onclick = () => { p.tokens.push({ id: uid(), name: "Žeton", color: COLORS[(p.tokens.length + 4) % COLORS.length], shape: "ctverec", counter: false, text: "" }); touch(p); render(); };
  const tok = id => p.tokens.find(t => t.id === id);
  $("#addEquip").onclick = () => { p.tokens.push({ id: uid(), name: "Zbraň", color: "#3b3631", shape: "ctverec", counter: false, text: "ZBR", small: true, mAtt: 1 }); touch(p); render(); toast("Vybavení přidáno – nastav mu úpravy hodnot"); };
  $$("[data-tname]", main).forEach(i => i.addEventListener("input", () => { tok(i.dataset.tname).name = i.value; touch(p); }));
  $$("[data-ttext]", main).forEach(i => { i.addEventListener("input", () => { tok(i.dataset.ttext).text = i.value; touch(p); }); i.addEventListener("change", render); });
  $$("[data-tshape]", main).forEach(i => i.onchange = () => { tok(i.dataset.tshape).shape = i.value; touch(p); render(); });
  $$("[data-tcolor]", main).forEach(b => b.onclick = () => { tok(b.dataset.tc).color = b.dataset.tcolor; touch(p); render(); });
  $$("[data-tpq]", main).forEach(i => i.addEventListener("change", () => { tok(i.dataset.tpq).printQty = i.value === "" ? "" : +i.value; touch(p); }));
  $$("[data-tcount]", main).forEach(i => i.onchange = () => { tok(i.dataset.tcount).counter = i.checked; touch(p); render(); });
  $$("[data-tdel]", main).forEach(b => b.onclick = () => { p.tokens = p.tokens.filter(t => t.id !== b.dataset.tdel); touch(p); render(); });
  $$("[data-tsmall]", main).forEach(i => i.onchange = () => { tok(i.dataset.tsmall).small = i.checked; if (i.checked) tok(i.dataset.tsmall).fixed = false; touch(p); render(); });
  $$("[data-tfixed]", main).forEach(i => i.onchange = () => { tok(i.dataset.tfixed).fixed = i.checked; if (i.checked) tok(i.dataset.tfixed).small = false; touch(p); render(); });
  $$("[data-tbuild]", main).forEach(i => i.onchange = () => { tok(i.dataset.tbuild).buildable = i.checked; touch(p); });
  wireFxEditor(main, p);
  $$("[data-tifbox]", main).forEach(box => { const tk = tok(box.dataset.tifbox); $$("[data-if]", box).forEach(el => el.addEventListener("change", () => { readItemFx(tk, el, "data-if"); touch(p); if (["use", "target"].includes(el.getAttribute("data-if"))) render(); })); });
  $$("[data-tfront]", main).forEach(i => i.onchange = () => { tok(i.dataset.tfront).frontOnly = i.checked; touch(p); });
  $$("[data-tw]", main).forEach(i => i.addEventListener("change", () => { tok(i.dataset.tw).weight = i.value === "" ? "" : +i.value; touch(p); }));
  $$("[data-tzone]", main).forEach(i => i.addEventListener("change", () => { tok(i.dataset.tzone).zone = i.value.trim(); touch(p); }));
  $$("[data-tmod]", main).forEach(i => i.addEventListener("change", () => { const [m, id] = i.dataset.tmod.split("|"); tok(id)[m] = i.value === "" ? "" : +i.value; touch(p); render(); }));
}
function editUnit(p, unit) {
  const isNew = !unit;
  const u = unit ? clone(unit) : { id: uid(), name: "Nová jednotka", factionId: p.factions[0] ? p.factions[0].id : "", symbol: "pechota", symText: "", size: "II", att: 4, def: 4, mov: 4, rAtt: 2, rDef: 2, rMov: 4, qty: 1, note: "" };
  const opt = (obj, cur) => Object.entries(obj).map(([k, v]) => `<option value="${esc(k)}" ${k === cur ? "selected" : ""}>${esc(v)}</option>`).join("");
  const d = openDialog(`<h2>${isNew ? "Nová jednotka" : "Upravit jednotku"}</h2>
    <div class="editor">
      <div style="display:flex;flex-direction:column;gap:12px">
        <div class="grid" style="grid-template-columns:1fr 1fr">
          <label class="f">Označení<input type="text" id="u-name" value="${esc(u.name)}" maxlength="18"></label>
          <label class="f">Strana<select id="u-f">${p.factions.map(f => `<option value="${f.id}" ${f.id === u.factionId ? "selected" : ""}>${esc(f.name)}</option>`).join("")}</select></label>
          <label class="f">Druh vojska<select id="u-sym">${opt(SYMBOLS, u.symbol)}</select></label>
          <label class="f">Velikost<select id="u-size">${opt(SIZES, u.size)}</select></label>
          <label class="f">Vlastní značka (max 4 znaky)<input type="text" id="u-symtext" value="${esc(u.symText)}" maxlength="4"></label>
          <label class="f">Poznámka v rohu<input type="text" id="u-note" value="${esc(u.note)}" maxlength="3" placeholder="např. ★"></label>
        </div>
        <div class="eyebrow">Plná síla: útok – obrana – pohyb</div>
        <div class="grid" style="grid-template-columns:repeat(3,1fr)"><input type="number" id="u-a" value="${esc(u.att)}" aria-label="Útok"><input type="number" id="u-d" value="${esc(u.def)}" aria-label="Obrana"><input type="number" id="u-m" value="${esc(u.mov)}" aria-label="Pohyb"></div>
        <div class="eyebrow">Oslabená strana (nech prázdné, pokud žeton nemá rub)</div>
        <div class="grid" style="grid-template-columns:repeat(3,1fr)"><input type="number" id="u-ra" value="${esc(u.rAtt)}" aria-label="Útok oslabené"><input type="number" id="u-rd" value="${esc(u.rDef)}" aria-label="Obrana oslabené"><input type="number" id="u-rm" value="${esc(u.rMov)}" aria-label="Pohyb oslabené"></div>
        <label class="f" style="width:120px">Počet žetonů<input type="number" id="u-q" min="0" max="99" value="${u.qty}"></label>
        <label class="chk"><input type="checkbox" id="u-hq" ${u.hq ? "checked" : ""}> Velitelství – zdroj zásobování</label>
        <label class="f" style="width:150px">Druh<select id="u-kind"><option value="">Běžná jednotka</option><option value="hero" ${u.kind === "hero" ? "selected" : ""}>Hrdina</option><option value="monster" ${u.kind === "monster" ? "selected" : ""}>Příšera</option></select></label>
        <label class="f" style="width:110px">Životy<input type="number" id="u-hp" min="0" max="99" value="${esc(u.hp || "")}" placeholder="–"></label>
        <label class="f" style="width:130px">XP za zabití<input type="number" id="u-xp" min="0" max="99" value="${esc(u.xp || "")}" placeholder="–"></label>
        <label class="f" style="width:110px">Náklad<input type="number" id="u-cap" min="0" max="12" value="${esc(u.cap || "")}" placeholder="–"></label>
        <label class="f" style="width:130px" title="Velitel aktivuje spřátelené jednotky do této vzdálenosti">Dosah velení<input type="number" id="u-cmd" min="0" max="20" value="${esc(u.cmd || "")}" placeholder="–"></label>
        <label class="f" style="width:150px" title="Jednotky v dosahu velení dostanou k útoku">Velení: + útok<input type="number" id="u-cmdAtt" min="0" max="9" value="${esc(u.cmdAtt || "")}" placeholder="–"></label>
        <label class="f" style="width:150px" title="Jednotky v dosahu velení dostanou k obraně">Velení: + obrana<input type="number" id="u-cmdDef" min="0" max="9" value="${esc(u.cmdDef || "")}" placeholder="–"></label>
        <label class="f" style="width:150px" title="Kolik jednotek (podle velikosti) vozidlo převeze">Převáží jednotek<input type="number" id="u-transport" min="0" max="30" value="${esc(u.transport || "")}" placeholder="–"></label>
        <label class="f" style="width:150px" title="Kolik místa zabere ve vozidle (výchozí 1)">Velikost při přepravě<input type="number" id="u-tsize" min="0" max="10" value="${esc(u.tsize ?? "")}" placeholder="1"></label>
        <label class="f" style="width:150px" title="Kolik předmětů (podle váhy) unese">Nosnost předmětů<input type="number" id="u-carry" min="0" max="30" value="${esc(u.carry ?? "")}" placeholder="bez limitu"></label>
        <label class="f" style="width:120px" title="Test morálky projde, když součet hodu ≤ morálka (prázdné = výchozí z Mechanik)">Morálka<input type="number" id="u-mor" min="0" max="20" value="${esc(u.mor ?? "")}" placeholder="výchozí"></label>
        <label class="f" style="width:130px" title="Kolikrát může zaútočit, než musí doplnit">Munice<input type="number" id="u-ammo" min="0" max="99" value="${esc(u.ammo ?? "")}" placeholder="bez limitu"></label>
        <label class="f" style="width:140px">Dostřel (polí)<input type="number" id="u-range" min="0" max="30" value="${esc(u.range || "")}" placeholder="–"></label>
        <label class="chk"><input type="checkbox" id="u-big" ${u.big ? "checked" : ""}> Velký žeton (zabírá víc místa)</label>
      </div>
      <div id="u-prev" style="display:flex;flex-direction:column;align-items:center;gap:10px;font-size:20px"></div>
    </div>
    <div id="u-zones"></div>
    <div class="row spread">
      <div class="row">${isNew ? "" : `<button class="btn danger" id="u-del">Smazat</button><button class="btn" id="u-dup">Duplikovat</button>`}</div>
      <div class="row"><button class="btn" data-close>Zrušit</button><button class="btn primary" id="u-save">Uložit jednotku</button></div>
    </div>`, true);
  const num = v => v === "" ? "" : +v;
  const read = () => { u.name = $("#u-name", d).value; u.factionId = $("#u-f", d).value; u.symbol = $("#u-sym", d).value; u.size = $("#u-size", d).value; u.symText = $("#u-symtext", d).value; u.note = $("#u-note", d).value;
    u.att = num($("#u-a", d).value); u.def = num($("#u-d", d).value); u.mov = num($("#u-m", d).value); u.rAtt = num($("#u-ra", d).value); u.rDef = num($("#u-rd", d).value); u.rMov = num($("#u-rm", d).value);
    u.qty = Math.max(0, Math.min(99, parseInt($("#u-q", d).value, 10) || 0)); u.hq = $("#u-hq", d).checked; u.big = $("#u-big", d).checked; u.range = $("#u-range", d).value === "" ? "" : +$("#u-range", d).value;
    u.kind = $("#u-kind", d).value; u.cap = $("#u-cap", d).value === "" ? "" : +$("#u-cap", d).value;
    ["cmd", "cmdAtt", "cmdDef", "transport", "tsize", "carry", "ammo", "mor"].forEach(k => { const v = $("#u-" + k, d).value; u[k] = v === "" ? "" : +v; }); u.hp = $("#u-hp", d).value === "" ? "" : +$("#u-hp", d).value; u.xp = $("#u-xp", d).value === "" ? "" : +$("#u-xp", d).value; };
  const prev = () => { read(); $("#u-prev", d).innerHTML = unitHTML(p, u) + (hasReduced(u) ? unitHTML(p, u, true) : "") + `<span class="hint" style="font-size:.8rem">líc${hasReduced(u) ? " / rub" : ""}</span>`; };
  d.addEventListener("input", prev); d.addEventListener("change", prev); prev(); u.zones = clone(u.zones || []); wireZonesEditor(d, u);
  $("#u-save", d).onclick = () => { read(); if (isNew) p.units.push(u); else Object.assign(unit, u); touch(p); closeDialog(); render(); toast(isNew ? "Jednotka přidána" : "Jednotka uložena"); };
  if (!isNew) {
    $("#u-del", d).onclick = () => { p.units = p.units.filter(x => x.id !== unit.id); touch(p); closeDialog(); render(); };
    $("#u-dup", d).onclick = () => { read(); p.units.splice(p.units.indexOf(unit) + 1, 0, { ...u, id: uid(), name: u.name + " 2" }); touch(p); closeDialog(); render(); };
  }
}
function editCard(p, deck, card) {
  const isNew = !card;
  const c = card ? { ...card } : { id: uid(), title: "", type: "", cost: "", text: "", qty: 1, suit: "", value: "", vp: "", icon: "", effect: "", locked: false };
  const d = openDialog(`<h2>${isNew ? "Nová karta" : "Upravit kartu"}</h2>
    <div class="editor">
      <div style="display:flex;flex-direction:column;gap:12px">
        <div class="grid" style="grid-template-columns:1fr 80px">
          <label class="f">Název<input type="text" id="c-title" value="${esc(c.title)}"></label>
          <label class="f">Ikona<input type="text" id="c-icon" value="${esc(c.icon)}" maxlength="4" placeholder="🗡"></label></div>
        <div class="grid" style="grid-template-columns:1fr 80px 80px">
          <label class="f">Typ<input type="text" id="c-type" value="${esc(c.type)}" placeholder="Např. Akce"></label>
          <label class="f">Cena<input type="text" id="c-cost" value="${esc(c.cost)}"></label>
          <label class="f">Počet<input type="number" id="c-qty" min="0" max="99" value="${c.qty}"></label>
        </div>
        <div class="grid" style="grid-template-columns:1fr 1fr 1fr">
          <label class="f">Barva / symbol<input type="text" id="c-suit" value="${esc(c.suit)}" placeholder="♥, Oheň…"></label>
          <label class="f">Hodnota<input type="text" id="c-value" value="${esc(c.value)}" placeholder="7"></label>
          <label class="f">Vítězné body<input type="text" id="c-vp" value="${esc(c.vp)}" placeholder="2"></label>
          <label class="f" title="Karta jde zahrát za operace, nebo jako událost">Operace<input type="number" id="c-ops" min="0" max="9" value="${esc(c.ops || "")}" placeholder="–"></label>
        </div>
        <details class="cfx" ${c.move || c.cover || c.spawn || c.income || c.act || c.pow || c.fight ? "open" : ""}><summary>Lokace, bytosti a schopnosti karty</summary>
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">
          <label class="f" title="Mapa z karet: kolik akcí stojí vstup">Pohyb (lokace)<input type="number" id="c-move" min="0" max="9" value="${esc(c.move || "")}" placeholder="1"></label>
          <label class="f" title="Mapa z karet: kostky obrany navíc">Krytí<input type="number" id="c-cover" min="0" max="9" value="${esc(c.cover || "")}" placeholder="0"></label>
          <label class="f" title="Mapa z karet: kolik nepřátel se objeví">Nepřátel<input type="number" id="c-spawn" min="0" max="9" value="${esc(c.spawn || "")}" placeholder="0"></label>
          <label class="f" title="Efekt na začátku každého kola, dokud je karta vyložená">Příjem každé kolo<input type="text" id="c-income" value="${esc(c.income || "")}" placeholder="+1 Mince"></label>
          <label class="f" title="Efekt, když hráč kartu vyčerpá (otočí) – jednou za kolo">Aktivace vyčerpáním<input type="text" id="c-act" value="${esc(c.act || "")}" placeholder="+2 Mince"></label>
          <label class="f" title="Bytost: síla útoku">Síla (bytost)<input type="number" id="c-pow" min="0" max="20" value="${esc(c.pow ?? "")}" placeholder="–"></label>
          <label class="f" title="Bytost: kolik zranění vydrží">Odolnost<input type="number" id="c-tough" min="0" max="20" value="${esc(c.tough ?? "")}" placeholder="–"></label>
          <label class="f" title="letec, dosah, bdělost, první úder, pošlapání, spěch">Klíčová slova<input type="text" id="c-kw" value="${esc(c.kw || "")}" placeholder="letec, spěch"></label>
          <label class="f" title="Příšera v centrální řadě: kolik síly ji porazí; efekt karty je odměna">Porazit za<input type="number" id="c-fight" min="0" max="20" value="${esc(c.fight || "")}" placeholder="–"></label>
        </div></details>
        <details class="cfx" ${c.unitItem ? "open" : ""}><summary>Předmět pro jednotku (lektvar, zbraň, brnění…)</summary>
          <label class="chk"><input type="checkbox" id="c-unitItem" ${c.unitItem ? "checked" : ""}> Karta je předmět – z ruky se vybaví na jednotku nebo použije</label>
          <div id="c-ifx">${itemFxHTML(c, "data-if", true)}</div></details>
        <label class="f" style="width:170px">Vzácnost<select id="c-rarity">${Object.entries(RARITIES).map(([k, v]) => `<option value="${k}" ${k === (c.rarity || "") ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <label class="f">Text karty<textarea id="c-text">${esc(c.text)}</textarea></label>
        ${p.resources.length ? `<div class="row"><span class="hint">Vložit ikonu:</span>${p.resources.map(r => `<button type="button" class="btn small" data-ins="${esc(r.name)}"><span class="dot" style="background:${r.color}"></span>${esc(r.icon || "")} ${esc(r.name)}</button>`).join("")}</div>` : ""}
        <div class="row"><label class="btn small" for="c-imgf">${c.img ? "Vyměnit obrázek" : "Nahrát obrázek"}</label><input type="file" id="c-imgf" accept="image/*" hidden>${c.img ? `<button type="button" class="btn small danger" id="c-imgdel">Odebrat obrázek</button>` : ""}<span class="hint" id="c-imgst"></span></div>
        <label class="f">Efekt při vyložení nebo zahrání (provede se sám)<input type="text" id="c-effect" value="${esc(c.effect)}" placeholder="+2 Mince; líznout 1"></label>
        <div class="row"><button type="button" class="btn small" id="c-ai">✨ Převést text na efekt</button><span class="hint" id="c-aist"></span></div>
        <label class="chk"><input type="checkbox" id="c-locked" ${c.locked ? "checked" : ""}> Zamčená – do hry vstoupí až po odemčení v kampani</label>
        <p class="hint">Barva a hodnota slouží pro štychy a bodování sad, vítězné body pro skóre z vyložených karet. Zápis efektů najdeš v záložce Pravidla.</p>
      </div>
      <div id="c-prev" style="display:flex;justify-content:center"></div>
    </div>
    <div class="row spread">
      <div class="row">${isNew ? "" : `<button class="btn danger" id="c-del">Smazat</button><button class="btn" id="c-dup">Duplikovat</button>`}</div>
      <div class="row"><button class="btn" data-close>Zrušit</button><button class="btn primary" id="c-save">Uložit kartu</button></div>
    </div>`, true);
  const read = () => { ["title", "type", "cost", "text", "suit", "value", "vp", "icon", "effect", "rarity", "ops", "move", "cover", "spawn", "income", "act", "pow", "tough", "kw", "fight"].forEach(k => c[k] = $("#c-" + k, d).value); c.locked = $("#c-locked", d).checked; c.qty = Math.max(0, Math.min(99, parseInt($("#c-qty", d).value, 10) || 0)); };
  const readItem = () => { c.unitItem = $("#c-unitItem", d).checked; $$("[data-if]", d).forEach(el => readItemFx(c, el, "data-if")); };
  $("#c-ifx", d).addEventListener("change", e => { readItem(); if (["use", "target"].includes(e.target.getAttribute("data-if"))) $("#c-ifx", d).innerHTML = itemFxHTML(c, "data-if", true); });
  const prev = () => { read(); $("#c-prev", d).innerHTML = cardHTML(c, deck); };
  d.addEventListener("input", prev); d.addEventListener("change", prev); prev();
  setTimeout(() => $("#c-title", d).focus(), 30);
  $("#c-ai", d).onclick = () => { read(); aiEffectForCard(p, c, $("#c-effect", d), $("#c-aist", d)); };
  $$("[data-ins]", d).forEach(b => b.onclick = () => { const ta = $("#c-text", d); const pos = ta.selectionStart ?? ta.value.length; const ins = `{${b.dataset.ins}}`; ta.value = ta.value.slice(0, pos) + ins + ta.value.slice(ta.selectionEnd ?? pos); ta.focus(); ta.setSelectionRange(pos + ins.length, pos + ins.length); prev(); });
  $("#c-imgf", d).onchange = async e => { const f = e.target.files[0]; if (!f) return; $("#c-imgst", d).textContent = "Nahrávám…"; try { const r = await storeImage(f, { max: 1000, dataMax: 420, limit: 40000 }); c.img = r.url || r.data; $("#c-imgst", d).textContent = r.url ? "Uloženo" : "Uloženo zmenšené do projektu"; prev(); } catch { $("#c-imgst", d).textContent = "Obrázek se nepodařilo načíst"; } };
  if ($("#c-imgdel", d)) $("#c-imgdel", d).onclick = () => { c.img = ""; prev(); $("#c-imgst", d).textContent = "Obrázek odebrán"; };
  $("#c-save", d).onclick = () => { read(); readItem(); if (isNew) deck.cards.push(c); else Object.assign(card, c); touch(p); closeDialog(); render(); toast(isNew ? "Karta přidána" : "Karta uložena"); };
  if (!isNew) {
    $("#c-del", d).onclick = () => { deck.cards = deck.cards.filter(x => x.id !== card.id); touch(p); closeDialog(); render(); };
    $("#c-dup", d).onclick = () => { read(); readItem(); deck.cards.splice(deck.cards.indexOf(card) + 1, 0, { ...c, id: uid(), title: c.title + " (kopie)" }); touch(p); closeDialog(); render(); toast("Karta zduplikována"); };
  }
}
const CARD_COLS = ["title", "type", "cost", "text", "qty", "suit", "value", "vp", "icon", "effect"];
function bulkDialog(p, deck) {
  const d = openDialog(`<h2>Hromadně vložit karty</h2>
    <p>Každá karta na jeden řádek, pole odděl středníkem:<br><code style="font-family:var(--f-mono);font-size:.85rem">název ; typ ; cena ; text ; počet ; barva ; hodnota ; body ; ikona ; efekt</code></p>
    <p class="hint">Stačí první pole, zbytek může chybět. Funguje i vložení sloupců z Excelu nebo Google Tabulek (oddělené tabulátorem) a soubor z „Export CSV“. Nový řádek v textu zapiš jako \\n.</p>
    <textarea id="bulkIn" style="min-height:200px;font-family:var(--f-mono);font-size:.85rem" placeholder="Rytíř ; Jednotka ; 3 ; Útok 2, obrana 3 ; 4&#10;Srdcová sedma ; ; ; ; 1 ; ♥ ; 7 ; 0"></textarea>
    <label class="chk"><input type="checkbox" id="bulkHead"> První řádek je záhlaví – přeskočit</label>
    <div class="row spread"><span class="muted" id="bulkCount">0 karet</span><div class="row"><button class="btn" data-close>Zrušit</button><button class="btn primary" id="bulkOk">Přidat karty</button></div></div>`, true);
  const parse = () => { let lines = $("#bulkIn", d).value.split(/\r?\n/).map(l => l.trim()).filter(Boolean); if ($("#bulkHead", d).checked) lines = lines.slice(1);
    return lines.map(l => { const f = (l.includes("\t") ? l.split("\t") : l.split(";")).map(s => s.trim()); const c = { id: uid() }; CARD_COLS.forEach((k, i) => c[k] = (f[i] || "").replace(/\\n/g, "\n")); c.qty = Math.max(1, Math.min(99, parseInt(c.qty, 10) || 1)); return c; }); };
  const upd = () => { const n = parse().length; $("#bulkCount", d).textContent = `${n} ${plural(n, "karta", "karty", "karet")}`; };
  $("#bulkIn", d).addEventListener("input", upd); $("#bulkHead", d).onchange = upd;
  $("#bulkOk", d).onclick = () => { const cs = parse(); if (!cs.length) return; deck.cards.push(...cs); touch(p); closeDialog(); render(); toast(`Přidáno: ${cs.length}`); };
}
async function offerFile(filename, data, okMsg) {
  const dl = await cap("downloads");
  if (!dl) { copyText(data); return; }
  try { await dl.save({ filename, data }); toast(okMsg); } catch (e) { if (e && e.code !== "declined") copyText(data); }
}
const slug = s => (s || "hra").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
function exportCSV(p) {
  const rows = ["balíček;" + CARD_COLS.join(";")];
  p.decks.forEach(d => d.cards.forEach(c => rows.push([d.name, ...CARD_COLS.map(k => String(c[k] ?? ""))].map(v => v.replace(/;/g, ",").replace(/\r?\n/g, "\\n")).join(";"))));
  offerFile(slug(p.name) + "-karty.csv", "\ufeff" + rows.join("\r\n"), "CSV uloženo");
}
async function exportPrint(p, opt = {}) {
  const cards = [], backs = [];
  // Se spadávkou dostane každá karta 3 mm okraj v barvě své plochy a ořezové značky v rozích.
  const marks = `<svg class="cm" viewBox="0 0 75 100" preserveAspectRatio="none"><g stroke="#000" stroke-width=".25">${[[6, 6], [69, 6], [6, 94], [69, 94]].map(([x, y]) => `<line x1="${x}" y1="${y < 50 ? 0 : 100}" x2="${x}" y2="${y < 50 ? 3 : 97}"/><line x1="${x < 37 ? 0 : 75}" y1="${y}" x2="${x < 37 ? 3 : 72}" y2="${y}"/>`).join("")}</g></svg>`;
  const wrap = (html, bg) => opt.bleed ? `<div class="bc" style="--bc:${bg}">${html}${marks}</div>` : html;
  p.decks.forEach(d => d.cards.forEach(c => { for (let i = 0; i < (+c.qty || 0); i++) { cards.push(wrap(cardHTML(c, d), (d.template === "full" && c.img) ? `url('${esc(c.img)}')` : "#fbfaf6")); backs.push(wrap(cardHTML(c, d, false), d.backImg ? `url('${esc(d.backImg)}')` : d.color)); } }));
  const units = [], ubacks = [];
  p.units.forEach(u => { for (let i = 0; i < unitPrintQty(p, u); i++) { units.push(unitHTML(p, u)); ubacks.push(hasReduced(u) ? unitHTML(p, u, true) : `<div class="unit" style="background:${(p.factions.find(f => f.id === u.factionId) || {}).color || "#888"}"></div>`); } });
  const toks = p.tokens.flatMap(t => Array.from({ length: tokenPrintQty(p, t) }, () => tokenHTML(t, 0)));
  const mirror = (arr, per) => { const out = []; for (let i = 0; i < arr.length; i += per) { const row = arr.slice(i, i + per); while (row.length < per) row.push(`<div class="blank"></div>`); out.push(...row.reverse()); } return out; };
  const css = `@page{size:A4;margin:${opt.bleed ? 4 : 8}mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
h1{font-size:13pt;margin:0 0 3mm}p.n{font-size:8pt;color:#555;margin:0 0 3mm}.pg{page-break-after:always}
.cards{display:grid;grid-template-columns:repeat(3,63mm);gap:0}.cards .blank{width:63mm;height:88mm}
.cards.bl{grid-template-columns:repeat(2,69mm);gap:4mm}.cards.bl .blank{width:69mm;height:94mm}
${(document.getElementById("card-css") || {}).textContent || ""}
.cards .pcard{font-size:6.72mm;width:63mm;height:88mm;aspect-ratio:auto;max-width:none;box-shadow:none;border-radius:0;border:.2mm solid #999}
:root{--f-display:'Bricolage Grotesque',system-ui,sans-serif;--f-body:'Atkinson Hyperlegible',system-ui,sans-serif;--f-mono:'Chivo Mono',ui-monospace,monospace;--shadow:none}
.counters{display:grid;grid-template-columns:repeat(12,16mm);gap:0}.counters>*{font-size:3.08mm}
.unit{width:5.2em;height:5.2em;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:.3em .2em .25em;border:.05em solid rgba(0,0,0,.4);overflow:hidden}
.unit .nm{font-size:.78em;line-height:1;font-weight:700;white-space:nowrap;max-width:100%;overflow:hidden}.unit .sym{display:flex;flex-direction:column;align-items:center;line-height:1}
.unit .sz{font-size:.62em;letter-spacing:.1em;font-weight:700;height:1em}.unit svg{width:2.8em;height:1.8em;display:block}.unit .vals{font-weight:700;font-size:1.05em;line-height:1}
.unit.red::after{content:"";position:absolute;top:.45em;right:-1.4em;width:4em;height:.5em;background:rgba(255,255,255,.75);transform:rotate(45deg)}.unit .note{position:absolute;left:.2em;top:1.4em;font-size:.55em;font-weight:700}
.blank{width:16mm;height:16mm}.toks{display:flex;flex-wrap:wrap;gap:3mm}.token{width:16mm;height:16mm;display:grid;place-items:center;font-weight:700;font-size:8pt;text-align:center;border:.3mm solid rgba(0,0,0,.4);overflow:hidden}
.token.kruh{border-radius:50%}.token.ctverec{border-radius:2mm}.token .tt{font-size:6pt}.token.figurka{border:0}.token.figurka svg{width:14mm;height:16mm}${opt.full ? PRINT_EXTRA_CSS : ""}`;
  let html = `<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>${esc(p.name)} – tisková archa</title><link rel="stylesheet" href="${(document.querySelector('link[href*="fonts.googleapis"][rel=stylesheet]') || {}).href || ""}"><style>${css}</style></head><body>`;
  const per = opt.bleed ? 6 : 9, cols = opt.bleed ? 2 : 3, cls = opt.bleed ? "cards bl" : "cards", bw = opt.bleed ? "69mm;height:94mm" : "63mm;height:88mm";
  for (let i = 0; i < cards.length; i += per) {
    html += `<section class="pg">${opt.bleed ? "" : `<h1>${esc(p.name)} – karty ${i + 1}–${Math.min(i + per, cards.length)}</h1><p class="n">Tiskni ve skutečné velikosti (100 %). Karta 63 × 88 mm.</p>`}<div class="${cls}">${cards.slice(i, i + per).join("")}</div></section>`;
    if (opt.backs !== false) html += `<section class="pg">${opt.bleed ? "" : `<h1>Rubové strany</h1><p class="n">Pro oboustranný tisk otáčej podél dlouhé strany.</p>`}<div class="${cls}">${mirror(backs.slice(i, i + per), cols).map(x => x.replace('class="blank"', `class="blank" style="width:${bw}"`)).join("")}</div></section>`;
  }
  if (units.length) {
    html += `<section class="pg"><h1>${esc(p.name)} – žetony jednotek (16 mm)</h1><div class="counters">${units.join("")}</div></section>`;
    html += `<section class="pg"><h1>Rub žetonů (oslabená strana)</h1><p class="n">Zrcadlově otočené řádky pro oboustranný tisk.</p><div class="counters">${mirror(ubacks, 12).join("")}</div></section>`;
  }
  if (toks.length) html += `<section class="pg"><h1>Žetony</h1><p class="n">V počtu podle přehledu „Co vytisknout“ (počet upravíš u žetonu v Komponentách).</p><div class="counters">${toks.join("")}</div></section>`;
  const extra = opt.full ? printExtrasHTML(p) : ""; html += extra + `</body></html>`;
  if (!cards.length && !units.length && !toks.length && !extra) { toast("Hra zatím nemá karty ani žetony k tisku"); return; }
  toast("Připravuji tiskovou archu…"); html = await inlineImages(html);
  offerFile(slug(p.name) + "-tisk.html", html, "Tisková archa uložena – otevři ji a vytiskni");
}
