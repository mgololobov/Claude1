// ---------- Natočení žetonů, hlídka, výška terénu, munice ----------
// Natočení: jednotka stojí čelem do jednoho směru (hrana hexu / strana čtverce). Útok z boku nebo zezadu dostane bonus,
// jednotka vidí jen do zorného pole a útok mimo něj je nepozorovaný. Pevný žeton může chránit jen zepředu, zóny se mohou vázat na směr.
// Hlídka: jednotka na hlídce se ozve, když nepřítel vstoupí do jejího dostřelu a výhledu.
// Výška terénu: výhled jde přes nižší terén, vyšší kopec nebo překážka ho zastaví; útok do kopce může mít posun.
// Munice: jednotka smí zaútočit jen tolikrát, kolik má munice, pak musí doplnit.
function normalizeFacing(p) {
  p.facing = Object.assign({ on: false, front: 60, rear: 30, flank: 1, rearB: 2, auto: true, vision: false, view: 90, adjSee: true, stealth: true, stealthB: 1, elevShift: 1 }, p.facing || {});
}
const ARC_NAMES = { front: "zepředu", flank: "z boku", rear: "zezadu" };
const facingOn = p => !!(p.facing && p.facing.on);
// Natočený žeton zůstává rovně (čitelný) a směr ukazuje šipka na okraji.
function faced(p, it) { return it.kind === "unit" && facingOn(p) || it.kind === "token" && !!(tokDef(p, it) || {}).frontOnly; }
function rotStep(p, it) { const b = tableBoard(p); if (it.kind === "card") return 90; return b && b.type === "square" ? 90 : 60; }
function itemCenter(p, it) {
  const b = tableBoard(p); const k = b && cellUnder(p, it);
  if (k) { const [c, r] = k.split(",").map(Number); return geo(b).center(c, r); }
  const [w, h] = itemSize(it); return [it.x + w / 2 - BX, it.y + h / 2 - BY];
}
// Směr (0 = nahoru, po směru hodin) z bodu do bodu.
function bearingXY(x1, y1, x2, y2) { return Math.atan2(x2 - x1, -(y2 - y1)) * 180 / Math.PI; }
function normAngle(a) { return ((a % 360) + 540) % 360 - 180; }
// Výseč, ze které přichází „other“ vzhledem k natočení „it“.
function arcOf(p, it, other) {
  const F = p.facing; const [x1, y1] = itemCenter(p, it), [x2, y2] = itemCenter(p, other);
  if (Math.hypot(x2 - x1, y2 - y1) < 1) return "front";
  const a = Math.abs(normAngle(bearingXY(x1, y1, x2, y2) - (it.rot || 0)));
  if (a <= +F.front + 0.5) return "front"; if (a >= 180 - +F.rear - 0.5) return "rear"; return "flank";
}
// Vidí jednotka „viewer“ cíl? Bez pravidla výhledu podle natočení vždy ano.
function sees(p, viewer, target) {
  const F = p.facing; if (!facingOn(p) || !F.vision) return true;
  const b = tableBoard(p); const k1 = b && cellUnder(p, viewer), k2 = b && cellUnder(p, target);
  if (F.adjSee && k1 && k2 && hexDist(b, k1, k2) <= 1) return true;
  const [x1, y1] = itemCenter(p, viewer), [x2, y2] = itemCenter(p, target); if (Math.hypot(x2 - x1, y2 - y1) < 1) return true;
  return Math.abs(normAngle(bearingXY(x1, y1, x2, y2) - (viewer.rot || 0))) <= +F.view + 0.5;
}
function snapRot(p, it, ang) { const s = rotStep(p, it); return ((Math.round(ang / s) * s) % 360 + 360) % 360; }
function faceToward(p, it, other) { const [x1, y1] = itemCenter(p, it), [x2, y2] = itemCenter(p, other); if (Math.hypot(x2 - x1, y2 - y1) >= 1) it.rot = snapRot(p, it, bearingXY(x1, y1, x2, y2)); }
function faceAlong(p, it, fromKey, toKey) {
  const b = tableBoard(p); if (!b || !fromKey || !toKey || fromKey === toKey) return;
  const g = geo(b); const [x1, y1] = g.center(...fromKey.split(",").map(Number)), [x2, y2] = g.center(...toKey.split(",").map(Number)); it.rot = snapRot(p, it, bearingXY(x1, y1, x2, y2));
}
// Útočník právě vyhodnocovaného boje – pevné žetony „jen zepředu“ podle něj poznají směr útoku.
let FACE_FROM = null;
function withAttacker(a, fn) { const o = FACE_FROM; FACE_FROM = a || null; try { return fn(); } finally { FACE_FROM = o; } }
function tokenCovers(p, tokIt, tk) { return !tk.frontOnly || !FACE_FROM || arcOf(p, tokIt, FACE_FROM) === "front"; }
// Výška pole (terén může mít výšku; výchozí 0).
function cellHeight(p, b, k) { const ter = terrainOf(p, b, k) || p.terrains[0]; return +(ter && ter.h) || 0; }
// Úpravy boje podle polohy: směr útoku, nepozorovaný útok, výška. Vrací { shift, arc, stealth, parts }.
function positionCombat(p, t, atts, def) {
  const out = { shift: 0, arc: null, stealth: false, parts: [] }; if (!def || !atts.length) return out; const F = p.facing;
  if (facingOn(p)) {
    const rank = { front: 0, flank: 1, rear: 2 }; const arcs = atts.map(a => arcOf(p, def, a));
    out.arc = arcs.reduce((m, a) => rank[a] > rank[m] ? a : m, "front");
    const v = out.arc === "rear" ? +F.rearB || 0 : out.arc === "flank" ? +F.flank || 0 : 0;
    if (out.arc !== "front") { out.shift += v; out.parts.push(`útok ${ARC_NAMES[out.arc]}${v ? ` ${v > 0 ? "+" : ""}${v}` : ""}`); }
    if (F.vision && F.stealth && atts.every(a => !sees(p, def, a))) { out.stealth = true; const s = +F.stealthB || 0; out.shift += s; out.parts.push(`nepozorovaně${s ? ` +${s}` : ""}`); }
  }
  const b = tableBoard(p); const kd = b && cellUnder(p, def);
  if (b && kd && +F.elevShift) { const hd = cellHeight(p, b, kd); const ks = atts.map(a => cellUnder(p, a)).filter(Boolean);
    if (ks.length && ks.every(k => cellHeight(p, b, k) < hd)) { out.shift -= +F.elevShift; out.parts.push(`obránce výš −${F.elevShift}`); }
    else if (ks.length && ks.every(k => cellHeight(p, b, k) > hd)) { out.shift += +F.elevShift; out.parts.push(`útočník výš +${F.elevShift}`); } }
  return out;
}
// Přepočet bojové tabulky po zadání útočníků / obránce.
function updatePosCombat(p, t) {
  const C = S.combat; const d = t.items.find(i => i.uid === C.defUid); const atts = (C.attUids || []).map(u => t.items.find(i => i.uid === u)).filter(Boolean);
  if (!d || !atts.length) { C.fshift = 0; C.ftext = ""; return; }
  const r = positionCombat(p, t, atts, d); C.fshift = r.shift; C.ftext = r.parts.join(", ");
  const z = C.zone && unitZones(unitOf(p, d)).find(x => x.name === C.zone);
  C.def = withAttacker(atts[0], () => z ? zoneDef(p, d, z) : unitStat(p, d, "def"));
}
// Munice
const ammoMax = (p, it) => { const u = unitOf(p, it); return u && u.ammo !== "" && u.ammo != null ? +u.ammo : null; };
function ammoLeft(p, it) { const m = ammoMax(p, it); return m == null ? null : Math.max(0, m - (it.ammoUsed || 0)); }
function useAmmo(p, t, it) {
  const left = ammoLeft(p, it); if (left == null) return true;
  if (left <= 0) { toast(`${unitOf(p, it).name}: došla munice`); return false; }
  it.ammoUsed = (it.ammoUsed || 0) + 1; return true;
}
const ammoBadge = (p, it) => { const l = ammoLeft(p, it); return l == null ? "" : `<span class="ammo ${l ? "" : "out"}" title="Munice">▮${l}</span>`; };
// Hlídka: po pohybu nepřítele zkontroluje jednotky na hlídce. Vrátí hlídkující jednotku, která může vystřelit.
function overwatchCheck(p, t, mover) {
  const b = tableBoard(p); const km = b && cellUnder(p, mover); const um = unitOf(p, mover); if (!km || !um) return null;
  return t.items.find(w => { if (w.kind !== "unit" || !w.st || !w.st.watch || w.inside) return false; const uw = unitOf(p, w); const kw = cellUnder(p, w);
    if (!uw || !kw || uw.factionId === um.factionId) return false;
    const reach = Math.max(1, unitStat(p, w, "range") || 1); return hexDist(b, kw, km) <= reach && (reach === 1 || hasLOS(p, b, kw, km)) && sees(p, w, mover) && ammoLeft(p, w) !== 0; }) || null;
}
function triggerOverwatch(p, t, mover) {
  const w = overwatchCheck(p, t, mover); if (!w) return false; const C = S.combat;
  w.st.watch = false; if (!useAmmo(p, t, w)) return false;
  if (facingOn(p) && p.facing.auto) faceToward(p, w, mover);
  S.tool = "boj"; C.mode = "crt"; C.res = null; C.zone = ""; C.att = unitAttack(p, t, w); C.attUids = [w.uid]; C.defUid = mover.uid; C.shift = defShift(p, t, mover);
  const k = cellUnder(p, mover); const ter = k ? terrainOf(p, tableBoard(p), k) : null; C.terrainId = ter ? ter.id : (p.terrains[0] || {}).id; updatePosCombat(p, t);
  const msg = `Hlídka: ${unitOf(p, w).name} střílí na ${unitOf(p, mover).name}`; logEv(t, msg); toast(msg + " – vyhodnoť v Boji"); return true;
}
// Výseče kolem vybrané jednotky (pro zobrazení na mapě).
function arcCells(p, it, radius = 3) {
  const b = tableBoard(p); const k0 = b && cellUnder(p, it); if (!k0) return null; const out = {}; const g = geo(b);
  for (let c = 0; c < b.cols; c++) for (let r = 0; r < b.rows; r++) { const k = c + "," + r; if (k === k0 || hexDist(b, k0, k) > radius) continue;
    const [cx, cy] = g.center(c, r); out[k] = arcOf(p, it, { kind: "token", x: BX + cx - 23, y: BY + cy - 23 }); }
  return out;
}
function arcsSVG(b, arcs) {
  if (!arcs) return ""; const g = geo(b); const col = { front: "#3f9a5a", flank: "#e0aa2e", rear: "#c8463c" };
  return Object.entries(arcs).map(([k, a]) => { const [c, r] = k.split(",").map(Number); const [cx, cy] = g.center(c, r); return `<polygon class="rng" points="${g.poly(cx, cy)}" fill="${col[a]}" fill-opacity=".3" stroke="${col[a]}" stroke-width="1.5"/>`; }).join("");
}
function facingSelHTML(p, t, i) {
  const out = []; const tk = i.kind === "token" ? tokDef(p, i) : null;
  if (i.kind === "unit" && facingOn(p) || tk && tk.frontOnly) out.push(`<div class="row"><span class="hint">${i.kind === "unit" ? "Čelem" : "Chrání směrem"}:</span><button class="btn small" data-face="-1" aria-label="Otočit doleva">↺</button><span class="facedir" style="transform:rotate(${i.rot || 0}deg)" aria-hidden="true">▲</span><button class="btn small" data-face="1" aria-label="Otočit doprava">↻</button>${i.kind === "unit" && tableBoard(p) && cellUnder(p, i) ? `<button class="btn small ${S.arcUid === i.uid ? "on" : ""}" data-arcs="1">Výseče</button>` : ""}</div>`);
  if (i.kind === "unit") {
    const l = ammoLeft(p, i); if (l != null) out.push(`<div class="row"><span class="hint">Munice ${l}/${ammoMax(p, i)}</span><button class="btn small" data-reload="1">Doplnit</button></div>`);
    const C = S.combat; if (facingOn(p) && C.defUid === i.uid && C.ftext) out.push(`<span class="hint">V boji: ${esc(C.ftext)}</span>`);
  }
  return out.join("");
}
function wireFacing(main, p, t, save) {
  const sel = t.items.find(i => i.uid === S.sel); if (!sel) return; const on = (s, fn) => $$(s, main).forEach(el => el.addEventListener("click", () => fn(el)));
  on("[data-face]", el => { sel.rot = (((sel.rot || 0) + +el.dataset.face * rotStep(p, sel)) % 360 + 360) % 360; if (S.combat.defUid) updatePosCombat(p, t); save(); render(); });
  on("[data-arcs]", () => { S.arcUid = S.arcUid === sel.uid ? null : sel.uid; render(); });
  on("[data-reload]", () => { if (!inSupply(p, t, sel)) { toast("Mimo zásobování – munici nelze doplnit"); return; } sel.ammoUsed = 0; logEv(t, `${unitOf(p, sel).name} doplňuje munici`); save(); render(); });
}
function facingMechHTML(p) {
  const F = p.facing; const n = (id, l, v, t2 = "") => `<label class="f" ${t2 ? `title="${t2}"` : ""}>${l}<input type="number" id="${id}" value="${esc(v)}"></label>`;
  return `<div class="panel"><h2>Natočení jednotek</h2>
    <label class="chk"><input type="checkbox" id="fOn" ${F.on ? "checked" : ""}> Jednotky stojí čelem do jednoho směru (čelo, bok, záď)</label>
    ${F.on ? `<div class="grid" style="grid-template-columns:1fr 1fr">${n("fFront", "Přední výseč ± stupňů", F.front, "60 = tři přední hrany hexu")}${n("fRear", "Zadní výseč ± stupňů", F.rear, "30 = jen zadní hrana")}
      ${n("fFlank", "Útok z boku: posun", F.flank, "Posun sloupce, v kostkách kostky navíc")}${n("fRearB", "Útok zezadu: posun", F.rearB)}</div>
    <label class="chk"><input type="checkbox" id="fAuto" ${F.auto ? "checked" : ""}> Po pohybu se jednotka natočí ve směru pohybu, útočník k cíli</label>
    <label class="chk"><input type="checkbox" id="fVis" ${F.vision ? "checked" : ""}> Jednotka vidí jen do zorného pole (výhled, mlha války, hlídka)</label>
    ${F.vision ? `<div class="grid" style="grid-template-columns:1fr 1fr">${n("fView", "Zorné pole ± stupňů", F.view, "90 = vidí do stran, ne dozadu")}${n("fStB", "Nepozorovaný útok: posun", F.stealthB)}</div>
      <label class="chk"><input type="checkbox" id="fAdj" ${F.adjSee ? "checked" : ""}> Sousední pole vidí vždy</label>
      <label class="chk"><input type="checkbox" id="fSt" ${F.stealth ? "checked" : ""}> Útok mimo zorné pole obránce je nepozorovaný (bonus)</label>` : ""}` : ""}
    <p class="hint">Na stole jednotku otočíš šipkami ↺ ↻, „Výseče“ ukážou čelo (zeleně), bok (žlutě) a záď (červeně). Pevný žeton může chránit „jen zepředu“ (nastavíš v Komponentách) a zóna jednotky se může vázat na směr – např. čelní pancíř.</p></div>`;
}
function elevMechHTML(p) {
  return `<div class="panel"><h2>Výška, hlídka, munice</h2>
    <label class="f">Útok do kopce / z kopce: posun<input type="number" id="fElev" value="${esc(p.facing.elevShift)}" min="0" max="3"></label>
    <p class="hint">Výšku terénu nastavíš v záložce Mapa. Výhled vede přes nižší terén; vyšší pole nebo překážka (les, město) ve výšce čáry výhledu ho zastaví. Ze zvýšeného místa je vidět přes les dál.</p>
    <p class="hint"><b>Hlídka:</b> u vybrané jednotky zapni stav „Na hlídce“. Když nepřítel vstoupí do jejího dostřelu a výhledu, boj se připraví sám.</p>
    <p class="hint"><b>Munice:</b> u jednotky v Komponentách vyplň „Munice“. Každý útok ji sníží o 1, s prázdnou jednotka neútočí; doplní ji tlačítkem „Doplnit“ v zásobování.</p></div>`;
}
function wireFacingMech(main, p) {
  const F = p.facing; const q = id => document.getElementById(id);
  const ch = (id, fn, re) => { if (q(id)) q(id).addEventListener("change", e => { fn(e.target); touch(p); if (re) render(); }); };
  ch("fOn", e => { F.on = e.checked; }, 1); ch("fVis", e => { F.vision = e.checked; }, 1); ch("fAuto", e => { F.auto = e.checked; }); ch("fAdj", e => { F.adjSee = e.checked; }); ch("fSt", e => { F.stealth = e.checked; });
  [["fFront", "front"], ["fRear", "rear"], ["fFlank", "flank"], ["fRearB", "rearB"], ["fView", "view"], ["fStB", "stealthB"], ["fElev", "elevShift"]].forEach(([id, k]) => ch(id, e => { F[k] = +e.value || 0; }));
}
function facingRulebook(p) {
  const out = []; const F = p.facing;
  if (facingOn(p)) out.push(["Natočení jednotek", `<p>Každá jednotka stojí čelem do jednoho směru. Přední výseč je ±${F.front}°, zadní ±${F.rear}° od zádi, zbytek je bok. Útok z boku má posun ${F.flank}, zezadu ${F.rearB}${F.auto ? "; po pohybu se jednotka natočí ve směru pohybu" : ""}.</p>${F.vision ? `<p>Jednotka vidí jen do zorného pole ±${F.view}°${F.adjSee ? " a na sousední pole" : ""}.${F.stealth ? ` Útok mimo zorné pole obránce je nepozorovaný, posun ${F.stealthB}.` : ""}</p>` : ""}`]);
  const dirT = p.tokens.filter(x => x.frontOnly); if (dirT.length) out.push(["Kryt jen zepředu", `<p>${dirT.map(x => esc(x.name)).join(", ")} chrání jen proti útoku z přední výseče žetonu.</p>`]);
  const hs = p.terrains.filter(x => +x.h); if (hs.length) out.push(["Výška terénu", `<p>Výšky: ${hs.map(x => `${esc(x.name)} ${x.h}`).join(", ")}. Výhled zastaví pole, které je (s překážkou o 1 výš) vyšší než čára výhledu.${+F.elevShift ? ` Útok na výše stojící jednotku má posun −${F.elevShift}, z výšky +${F.elevShift}.` : ""}</p>`]);
  const am = p.units.filter(u => u.ammo !== "" && u.ammo != null); if (am.length) out.push(["Munice", `<p>${am.map(u => `${esc(u.name)} ${u.ammo}`).join(", ")}. Každý útok spotřebuje 1; doplnit lze v zásobování.</p>`]);
  return out;
}
