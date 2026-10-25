// ---------- Terén ovlivněný počasím, vítr, kouř a oheň ----------
// Stav terénu (bláto, zamrzlo, závěje) vznikne za určitého počasí a vydrží ještě několik kol po něm; mění pohyb na vybraných terénech.
// Vítr má směr: kouř se každé kolo posune po větru a rychleji se rozplyne; oheň se po větru šíří do hořlavého terénu,
// dýmí a déšť ho uhasí. Kouř zakrývá výhled. Předmět (dýmovnice, zápalná láhev) může kouř nebo oheň vytvořit.
function defaultGrounds() {
  return [
    { id: "blato", name: "Bláto", from: "Déšť", lasts: 2, fx: "Rovina +1, Kopce +1, Bažina –", color: "#6b4a2a" },
    { id: "zamrzlo", name: "Zamrzlo", from: "Mráz", lasts: 1, fx: "Voda 2, Bažina 1", color: "#cfe6f5" },
    { id: "zaveje", name: "Závěje", from: "Sníh", lasts: 3, fx: "Rovina +1, Les +1, Kopce +2", color: "#ffffff" },
  ];
}
function normalizeGround(p) {
  const E = p.env; if (!Array.isArray(E.grounds)) E.grounds = defaultGrounds();
  E.fire = Object.assign({ hits: 2, spread: 50, still: 15, life: 4, smoke: 3 }, E.fire || {});
  // doplnění starších her o vítr, mokro a nová počasí
  E.conds.forEach(c => { if (c.wind == null) c.wind = c.id === "vitr"; if (c.wet == null) c.wet = c.id === "dest"; });
  if (!E.conds.some(c => c.id === "snih")) E.conds.push({ id: "snih", name: "Sníh", kind: "weather", icon: "❄", w: 0, sight: 3, mAtt: 0, mDef: 0, mMov: 0, mRange: 0, wet: true, wind: false });
  if (!E.conds.some(c => c.id === "mraz")) E.conds.push({ id: "mraz", name: "Mráz", kind: "weather", icon: "✱", w: 0, sight: "", mAtt: 0, mDef: 0, mMov: 0, mRange: 0, wet: false, wind: false });
  if (!E.conds.some(c => c.id === "boure")) E.conds.push({ id: "boure", name: "Bouře", kind: "weather", icon: "⚡", w: 0, sight: 2, mAtt: 0, mDef: 0, mMov: -1, mRange: -2, wet: true, wind: true });
  p.terrains.forEach(x => { if (x.burns == null) x.burns = ["forest", "town"].includes(x.id); });
  // starší hry se zapnutým počasím dostanou spáleniště a trosky
  if (E.on && p.terrains.some(x => x.burns) && !p.terrains.some(x => x.id === "burnt")) { p.terrains.push(...burntTerrains()); p.terrains.forEach(x => { if (x.burnsTo == null) x.burnsTo = x.id === "forest" ? "burnt" : x.id === "town" ? "ruins" : ""; }); }
}
const windy = (p, t) => envNow(p, t).some(c => c.wind), wet = (p, t) => envNow(p, t).some(c => c.wet);
// Úpravy terénu: „Rovina +1, Bažina –, Voda 2“ → { název: "+1" | "–" | "2" }.
function parseGroundFx(s) { const out = {}; String(s || "").split(/[,;]/).map(x => x.trim()).filter(Boolean).forEach(x => { const m = x.match(/^(.+?)\s+([+-]?\d+(?:[.,]\d+)?|[–-])$/); if (m) out[m[1].trim().toLowerCase()] = m[2].replace(",", "."); }); return out; }
function groundActive(p, t) {
  if (!envOn(p) || !t) return []; const now = envNow(p, t).map(c => c.name.toLowerCase());
  return p.env.grounds.filter(g => String(g.from || "").split(",").map(x => x.trim().toLowerCase()).some(n => n && now.includes(n)) || (t.ground || {})[g.id] > 0);
}
// Účinný pohyb na poli: terén, případně změněný stavem terénu (Infinity = neprůchodné).
function terrainMove(p, b, k) {
  const ter = terrainOf(p, b, k) || p.terrains[0]; let v = parseFloat(ter ? ter.move : 1); v = isFinite(v) && v > 0 ? v : Infinity;
  for (const g of groundActive(p, p.table)) { const e = parseGroundFx(g.fx)[(ter ? ter.name : "").toLowerCase()]; if (e == null) continue;
    if (e === "–" || e === "-") v = Infinity; else if (/^[+-]/.test(e)) v = v === Infinity ? v : Math.max(0.5, v + parseFloat(e)); else v = +e || Infinity; }
  return v;
}
function groundRound(p, t) {
  t.ground = t.ground || {}; const now = envNow(p, t).map(c => c.name.toLowerCase());
  p.env.grounds.forEach(g => { const trig = String(g.from || "").split(",").map(x => x.trim().toLowerCase()).some(n => n && now.includes(n));
    if (trig) { if (!(t.ground[g.id] > 0)) logEv(t, `terén: ${g.name}`); t.ground[g.id] = (+g.lasts || 0) + 1; }
    else if (t.ground[g.id] > 0) { t.ground[g.id]--; if (!t.ground[g.id]) { delete t.ground[g.id]; logEv(t, `terén: ${g.name} zmizelo`); } } });
}
function groundCells(p, t, b) {
  const out = []; groundActive(p, t).forEach(g => { const fx = parseGroundFx(g.fx); for (let c = 0; c < b.cols; c++) for (let r = 0; r < b.rows; r++) { const k = c + "," + r; const ter = terrainOf(p, b, k) || p.terrains[0]; if (ter && fx[ter.name.toLowerCase()] != null) out.push([k, g.color || "#6b4a2a"]); } });
  return out;
}
// Šedý opar na zakouřených polích.
function smokeSVG(p, t, b) { const s = smokeSet(p, t); if (!s.size) return ""; const g = geo(b); return [...s].map(k => { const [c, r] = k.split(",").map(Number); const [cx, cy] = g.center(c, r); return `<polygon points="${g.poly(cx, cy)}" fill="#8e8e8a" fill-opacity=".55"/>`; }).join(""); }
// Ruční změna počasí: stav terénu vznikne hned (bez odpočtu kol).
function groundTouch(p, t) { t.ground = t.ground || {}; const now = envNow(p, t).map(c => c.name.toLowerCase()); p.env.grounds.forEach(g => { if (String(g.from || "").split(",").map(x => x.trim().toLowerCase()).some(n => n && now.includes(n))) t.ground[g.id] = Math.max(t.ground[g.id] || 0, (+g.lasts || 0) + 1); }); }
function groundSVG(b, cells) {
  if (!cells || !cells.length) return ""; const g = geo(b);
  return cells.map(([k, col]) => { const [c, r] = k.split(",").map(Number); const [cx, cy] = g.center(c, r); return `<polygon points="${g.poly(cx, cy)}" fill="${col}" fill-opacity=".2" stroke="${col}" stroke-opacity=".6" stroke-dasharray="2 4" stroke-width="1"/>`; }).join("");
}
// Vítr
const DIR_NAMES_HEX = ["sever", "severovýchod", "jihovýchod", "jih", "jihozápad", "severozápad"], DIR_NAMES_SQ = ["sever", "východ", "jih", "západ"];
function windName(p, t) { const b = tableBoard(p); const n = b && b.type === "square" ? DIR_NAMES_SQ : DIR_NAMES_HEX; return n[(t.windDir || 0) % n.length]; }
function windArrow(p, t) { const b = tableBoard(p); const step = b && b.type === "square" ? 90 : 60; return `<span class="facedir" style="transform:rotate(${(t.windDir || 0) * step}deg)" aria-hidden="true">▲</span>`; }
// Kouř a oheň na mapě
function fxItems(p, t, fx) { return t.items.filter(o => o.kind === "token" && !o.attachTo && fxOf(p, o) === fx); }
function smokeSet(p, t) { const s = new Set(); if (!t) return s; fxItems(p, t, "kour").forEach(o => { const k = cellUnder(p, o); if (k) s.add(k); }); return s; }
function fxTokenDef(p, fx) {
  let tk = p.tokens.find(x => x.fx === fx); if (tk) return tk;
  tk = fx === "kour" ? { id: uid(), name: "Kouř", color: "#9a9a96", shape: "kruh", counter: false, text: "KOUŘ", fixed: true, fx: "kour", fxN: p.env.fire.smoke }
    : { id: uid(), name: "Oheň", color: "#e0602e", shape: "kruh", counter: false, text: "OHEŇ", fixed: true, fx: "ohen", fxN: p.env.fire.hits };
  p.tokens.push(tk); return tk;
}
function placeFx(p, t, fx, k) {
  const b = tableBoard(p); if (!b || !k) return null; if (fxItems(p, t, fx).some(o => cellUnder(p, o) === k)) return null;
  if (fx === "ohen") { const ter = terrainOf(p, b, k) || p.terrains[0]; if (ter && !isFinite(parseFloat(ter.move)) && !ter.burns) return null; }
  const tk = fxTokenDef(p, fx); const [c, r] = k.split(",").map(Number); const [cx, cy] = geo(b).center(c, r);
  const it = { uid: uid(), kind: "token", tokenId: tk.id, x: Math.round(BX + cx - 23 + (fx === "kour" ? 12 : -12)), y: Math.round(BY + cy - 23 + (fx === "kour" ? -12 : 12)), value: 0, rot: 0, life: fx === "kour" ? +tk.fxN || p.env.fire.smoke : p.env.fire.life };
  t.items.push(it); return it;
}
function moveFx(p, t, it, k) { const b = tableBoard(p); const [c, r] = k.split(",").map(Number); const [cx, cy] = geo(b).center(c, r); it.x = Math.round(BX + cx - 23 + 12); it.y = Math.round(BY + cy - 23 - 12); }
function burnUnits(p, t, k, why) {
  const out = []; const F = p.env.fire; t.items.filter(o => o.kind === "unit" && !o.inside && cellUnder(p, o) === k).forEach(u => { const roll = rollN(+F.hits || 0, +p.dice.sides || 6); const h = roll.filter(v => v >= +p.dice.aHit).length; out.push(`${why}: ${unitOf(p, u).name} ${roll.join(",") || "–"} → ${h ? harm(p, t, u, h) : "bez zásahu"}`); });
  return out;
}
// Kolo: kouř se rozplývá a pluje po větru, oheň pálí, dýmí, šíří se a déšť ho hasí.
function fireRound(p, t) {
  const b = tableBoard(p); if (!b) return; const F = p.env.fire; const W = windy(p, t), Wet = wet(p, t); const n = b.type === "square" ? 4 : 6; const msgs = [];
  fxItems(p, t, "kour").forEach(s => { s.life = (s.life ?? 3) - 1 - (W ? 1 : 0) - (Wet ? 1 : 0); const k = cellUnder(p, s);
    if (s.life > 0 && W && k) { const [c, r] = k.split(",").map(Number); const nk = (dirNeighbor(b, c, r, (t.windDir || 0) % n) || []).join(","); const [x, y] = nk.split(",").map(Number);
      if (nk && x >= 0 && y >= 0 && x < b.cols && y < b.rows && !smokeSet(p, t).has(nk)) moveFx(p, t, s, nk); else if (!(x >= 0 && y >= 0 && x < b.cols && y < b.rows)) s.life = 0; }
    if (s.life <= 0) t.items = t.items.filter(o => o !== s); });
  const fires = fxItems(p, t, "ohen");
  if (Wet && fires.length) { t.items = t.items.filter(o => !fires.includes(o)); msgs.push(`déšť uhasil ${fires.length} ${plural(fires.length, "oheň", "ohně", "ohňů")}`); }
  else fires.forEach(f => { const k = cellUnder(p, f); if (!k) return; msgs.push(...burnUnits(p, t, k, "oheň")); placeFx(p, t, "kour", k);
    const [c, r] = k.split(",").map(Number);
    for (let i = 0; i < n; i++) { const nb = dirNeighbor(b, c, r, i); if (!nb) continue; const [x, y] = nb; if (x < 0 || y < 0 || x >= b.cols || y >= b.rows) continue; const nk = x + "," + y; const ter = terrainOf(p, b, nk) || p.terrains[0];
      if (!ter || !ter.burns) continue; const ch = W ? (i === (t.windDir || 0) % n ? +F.spread : 0) : +F.still; if (ch && Math.random() * 100 < ch && placeFx(p, t, "ohen", nk)) msgs.push(`oheň se šíří na ${cellLabel(nk)}`); }
    f.life = (f.life ?? F.life) - 1; if (f.life <= 0) { t.items = t.items.filter(o => o !== f); msgs.push(`oheň na ${cellLabel(k)} dohořel` + burnOut(p, t, b, k)); } });
  msgs.forEach(m => logEv(t, m));
}
function weatherRoundFx(p, t) {
  if (!envOn(p)) return; groundRound(p, t);
  if (windy(p, t)) { const b = tableBoard(p); const n = b && b.type === "square" ? 4 : 6; if (t.windDir == null || Math.random() < 0.34) { t.windDir = Math.floor(Math.random() * n); logEv(t, `vítr fouká na ${windName(p, t)}`); } }
  fireRound(p, t);
}
// Dohořelé pole změní terén (les → spáleniště, město → trosky); hra ho drží v tabulce stolu, návrh mapy zůstává.
function burnOut(p, t, b, k) {
  const ter = terrainOf(p, b, k); const to = ter && ter.burnsTo && p.terrains.find(x => x.id === ter.burnsTo); if (!to) return "";
  (t.terrainOverride = t.terrainOverride || {})[k] = to.id; return `, ${ter.name.toLowerCase()} je teď ${to.name.toLowerCase()}`;
}
// Oheň v noci osvětlí okolí: jednotka na hořícím nebo sousedním poli je vidět až do běžného výhledu.
function litByFire(p, t, k) { const b = tableBoard(p); return !!(b && k && fxItems(p, t, "ohen").some(o => { const kf = cellUnder(p, o); return kf && hexDist(b, kf, k) <= 1; })); }
// Vstup do ohně pálí jako mina.
function fireOnEnter(p, t, it, k) { if (!fxItems(p, t, "ohen").some(o => cellUnder(p, o) === k)) return ""; const m = burnUnits(p, t, k, "oheň").join("; "); if (m) logEv(t, m); return m; }
function groundSideHTML(p, t) {
  if (!envOn(p)) return ""; const ga = groundActive(p, t); const sm = fxItems(p, t, "kour").length, fi = fxItems(p, t, "ohen").length;
  return `<div class="row">${windy(p, t) ? `<span class="hint">Vítr fouká na ${windName(p, t)}</span>${windArrow(p, t)}<button class="btn small" id="windRot" aria-label="Otočit vítr">↻</button>` : ""}
    ${ga.map(g => `<span class="envchip" style="background:${g.color};color:${inkFor(g.color)}" title="${esc(g.fx)}">${esc(g.name)}${(t.ground || {})[g.id] > 0 ? ` ${t.ground[g.id]}` : ""}</span>`).join("")}
    ${sm ? `<span class="hint">kouř ${sm}×</span>` : ""}${fi ? `<span class="hint">oheň ${fi}×</span>` : ""}</div>`;
}
function wireGroundSide(main, p, t, save) { const b = document.getElementById("windRot"); if (b) b.onclick = () => { const bd = tableBoard(p); const n = bd && bd.type === "square" ? 4 : 6; t.windDir = ((t.windDir || 0) + 1) % n; save(); render(); }; }
function groundMechHTML(p) {
  const E = p.env; const F = E.fire;
  return `<div class="panel"><h2>Terén po počasí, kouř a oheň</h2>
    ${E.on ? `<p class="hint">Stav terénu vznikne za uvedeného počasí a vydrží ještě zadaný počet kol. Úpravy: „Rovina +1“ přidá k pohybu, „Voda 2“ nastaví pohyb, „Bažina –“ znamená neprůchodné.</p>
    <div class="list">${E.grounds.map(g => `<div class="item-row"><input type="text" data-gr="name|${g.id}" value="${esc(g.name)}" style="width:100px" aria-label="Název">
      <input type="text" data-gr="from|${g.id}" value="${esc(g.from)}" placeholder="Při počasí" style="width:110px" aria-label="Při počasí">
      <label class="f" style="width:84px">Kol po<input type="number" min="0" max="20" data-gr="lasts|${g.id}" value="${esc(g.lasts)}"></label>
      <input type="text" data-gr="fx|${g.id}" value="${esc(g.fx)}" placeholder="Rovina +1, Bažina –" style="flex:1;min-width:140px;width:auto" aria-label="Úpravy terénu">
      <input type="color" data-gr="color|${g.id}" value="${g.color || "#6b4a2a"}" style="width:44px;height:40px;border:0;background:none;padding:0" aria-label="Barva">
      <button class="btn small danger" data-grdel="${g.id}" aria-label="Smazat">✕</button></div>`).join("")}</div>
    <button class="btn small" id="grAdd">+ Stav terénu</button>
    <h3>Kouř a oheň</h3>
    <div class="grid" style="grid-template-columns:repeat(3,1fr)"><label class="f">Oheň: kostek zásahu<input type="number" id="fiH" min="0" max="10" value="${esc(F.hits)}"></label><label class="f">Oheň hoří kol<input type="number" id="fiL" min="1" max="20" value="${esc(F.life)}"></label><label class="f">Kouř vydrží kol<input type="number" id="fiS" min="1" max="20" value="${esc(F.smoke)}"></label>
      <label class="f" title="Šance za kolo, že oheň přeskočí na hořlavé pole po větru">Šíření po větru %<input type="number" id="fiW" min="0" max="100" value="${esc(F.spread)}"></label><label class="f" title="Šance za kolo na každé sousední hořlavé pole bez větru">Šíření bez větru %<input type="number" id="fiN" min="0" max="100" value="${esc(F.still)}"></label></div>
    <p class="hint">Kouř zakrývá výhled, po větru se posouvá a ve větru nebo dešti se rozplyne rychleji. Oheň pálí jednotky na svém poli, dýmí a šíří se do hořlavého terénu (zaškrtneš v Mapě); počasí s mokrem ho uhasí. U počasí v tabulce výše označ „vítr“ a „mokro“. Kouř nebo oheň vytvoří předmět s volbou „Vytvoří“.</p>` : `<p class="hint">Zapni nejdřív denní dobu a počasí.</p>`}</div>`;
}
function wireGroundMech(main, p) {
  const E = p.env; const q = id => document.getElementById(id); if (!E.on) return;
  $$("[data-gr]", main).forEach(i => i.addEventListener("change", () => { const [k, id] = i.dataset.gr.split("|"); const g = E.grounds.find(x => x.id === id); g[k] = k === "lasts" ? +i.value || 0 : i.value; touch(p); }));
  $$("[data-grdel]", main).forEach(b => b.onclick = () => { E.grounds = E.grounds.filter(x => x.id !== b.dataset.grdel); touch(p); render(); });
  if (q("grAdd")) q("grAdd").onclick = () => { E.grounds.push({ id: uid(), name: "Nový stav", from: "", lasts: 1, fx: "", color: "#6b4a2a" }); touch(p); render(); };
  [["fiH", "hits"], ["fiL", "life"], ["fiS", "smoke"], ["fiW", "spread"], ["fiN", "still"]].forEach(([id, k]) => { if (q(id)) q(id).onchange = e => { E.fire[k] = +e.target.value || 0; touch(p); }; });
}
function groundRulebook(p) {
  if (!envOn(p)) return []; const E = p.env; const out = [];
  if (E.grounds.length) out.push(["Terén po počasí", `<ul>${E.grounds.map(g => `<li><b>${esc(g.name)}</b> (při počasí ${esc(g.from || "–")}, vydrží ${g.lasts} ${plural(+g.lasts, "kolo", "kola", "kol")} po něm): ${esc(g.fx || "bez úprav")}</li>`).join("")}</ul>`]);
  const wc = E.conds.filter(c => c.wind).map(c => c.name), wt = E.conds.filter(c => c.wet).map(c => c.name);
  out.push(["Vítr, kouř a oheň", `<p>${wc.length ? `Vítr fouká za počasí ${esc(wc.join(", "))}; jeho směr se občas změní. ` : ""}Kouř zakrývá výhled a vydrží ${E.fire.smoke} ${plural(+E.fire.smoke, "kolo", "kola", "kol")}; ve větru se každé kolo posune po větru a rozplyne rychleji${wt.length ? `, stejně jako za počasí ${esc(wt.join(", "))}` : ""}.</p><p>Oheň hoří ${E.fire.life} ${plural(+E.fire.life, "kolo", "kola", "kol")}, každé kolo hodí ${E.fire.hits} ${plural(+E.fire.hits, "kostku", "kostky", "kostek")} na jednotky na svém poli (i na ty, které do něj vstoupí), dýmí a šíří se do hořlavého terénu (${esc(p.terrains.filter(x => x.burns).map(x => x.name).join(", ") || "žádný")}): po větru s šancí ${E.fire.spread} %, bez větru ${E.fire.still} % na každé sousední pole.${wt.length ? ` ${esc(wt.join(", "))} oheň uhasí.` : ""}</p>`]);
  return out;
}
