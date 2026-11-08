// Rozhraní ve stylu Europa Universalis: mapa jako hlavní obrazovka, mapové režimy, přiblížení,
// žetony vojsk, boční panel, přehled (outliner), lišta zdrojů, běh času, okno Vláda.

const RAIL = [["mapa", "Mapa"], ["vlada", "Vláda"], ["plan", "Plán měsíce"], ["kraj", "Kraj a rozkazy"], ["vazalove", "Vazalové"], ["vojsko", "Vojsko a války"], ["diplo", "Diplomacie"], ["rise", "Říše a církev"], ["hosp", "Hospodářství"], ["stavy", "Stavy a zákony"], ["rod", "Rod"], ["objevy", "Objevy"], ["kronika", "Kronika"], ["prehled", "Přehled"], ["hra", "Hra"]];
Object.assign(ICON, {
  mapa: "M2 5l6-2 6 2 6-2v14l-6 2-6-2-6 2z M8 3v14 M14 5v14",
  vlada: "M4 18h14 M5 18l-1-9 5 4 2-6 2 6 5-4-1 9 M11 3v2",
  gold: "M11 4a7 3 0 1 0 .1 0z M4 7v4c0 1.7 3 3 7 3s7-1.3 7-3V7 M4 11v4c0 1.7 3 3 7 3s7-1.3 7-3v-4",
  grain: "M11 20V8 M11 8c-3-1-4-4-4-6 3 1 4 3 4 6z M11 8c3-1 4-4 4-6-3 1-4 3-4 6z M11 13c-3-1-4-3-4-5 3 1 4 2 4 5z M11 13c3-1 4-3 4-5-3 1-4 2-4 5z",
  men: "M5 19l12-12 M14 5l3 2 2 3 M8 13l-3 3 M5 16l1 1",
  crown: "M4 17h14 M5 17l-1-9 5 4 2-6 2 6 5-4-1 9",
  scale: "M11 3v16 M5 19h12 M4 8h14 M4 8l-2 6h4z M18 8l-2 6h4z",
  fire: "M11 20c-4 0-6-3-5-6 1-2 3-3 2-6 3 1 4 3 4 5 1-1 1-2 1-3 2 2 3 4 3 6 0 2-2 4-5 4z",
  play: "M7 4l11 7-11 7z", pause: "M6 4h4v14H6z M12 4h4v14h-4z",
});

// ---------- lišta zdrojů ----------
function chipTop(ic, label, val, sub, cls_ = "", title = "") { return `<span class="res ${cls_}" title="${esc(title || label)}">${icon(ic)}<span class="rl">${label}</span><b>${val}</b>${sub ? `<small>${sub}</small>` : ""}</span>`; }
function mpChip(k) { const C = P(S), g = mpGain(S, me())[k]; return `<span class="res mp" title="${MP[k].n}: ${Math.round(C.mp[k])} bodů, +${g} měsíčně"><i class="mpdot" style="background:${MP[k].col}">${MP[k].n[0]}</i><b>${Math.round(C.mp[k])}</b><small>+${g}</small></span>`; }
function renderTop() {
  const C = P(S), L = leaderOf(S, me()), b = clanBudget(S, me());
  $("#top").innerHTML = `<span class="realm">${shield(me(), 30)}<span><b>${esc(C.house)}</b><small>${esc(cap(C.t))} ${esc(L ? L.n : "—")}${L ? ` (${age(S, L)})` : ""}</small></span></span>
  <span class="resbar">${chipTop("gold", "Zlato", fmt(C.gold), `<span class="${b.net < 0 ? "bad" : "good"}">${sg(b.net)}</span>`, "", "Zlato a čistý měsíční příjem")}${chipTop("grain", "Obilí", fmt(C.grain))}${chipTop("men", "Vojsko", fmt(Math.round(clanMen(S, me()) / 100) / 10) + "k", "", "", "Muži ve zbrani")}${chipTop("crown", "Prestiž", fmt(C.prestige))}
  ${chipTop("scale", "Stabilita", sg(C.stab), "", C.stab < 0 ? "bad" : C.stab > 0 ? "good" : "", "Stabilita země (−3 až +3)")}${MP_IDS.map(mpChip).join("")}${C.we >= 1 ? chipTop("fire", "Vyčerpání", r1(C.we), "", C.we > 8 ? "bad" : "warn", "Válečné vyčerpání") : ""}${overext(S, me()) > 0 ? chipTop("scale", "Přetížení", overext(S, me()) + " %", "", overext(S, me()) > 50 ? "bad" : "warn", "Podíl nezačleněných krajů na rozvoji říše") : ""}</span>
  <span class="sp"></span>
  <span class="clock"><b>${S.month + 1}. ${MONTHS2[S.month]} ${S.year}</b><span class="speed">${btn(icon(SEL.play ? "pause" : "play"), "play", [], null, "ico-b")}${[1, 2, 3].map(v => btn("›".repeat(v), "speed", [v], null, (SEL.speed || 1) === v ? "on" : "")).join("")}</span></span>
  <button class="main" data-a="end" data-x="[]" ${S.over && !S.over.cont ? "disabled" : ""} title="Ctrl+Enter">Konec měsíce ▶</button>`;
  $("#tabs").innerHTML = RAIL.map(([id, n]) => `<button class="${TAB === id ? "on" : ""}" data-a="tab" data-x='["${id}"]' title="${n}">${icon(id)}<span>${n}</span>${id === "plan" ? idleBadge() : id === "vojsko" && enemiesOf(S, me()).length ? '<i class="badge bad">!</i>' : ""}</button>`).join("");
}
function idleBadge() { const n = officers(S, me()).filter(c => c.acted !== S.turn && !c.army && S.provs[c.loc] && S.provs[c.loc].owner === me() && !S.provs[c.loc].deleg && !S.provs[c.loc].occ).length; return n ? `<i class="badge">${n}</i>` : ""; }

// ---------- hlavní vykreslení ----------
function render() {
  if (!S) return;
  if (!SEL.prov || !S.provs[SEL.prov]) SEL.prov = P(S).capital || Object.keys(S.provs)[0];
  renderTop();
  const stage = $("#main");
  if (!$("#mapwrap")) stage.innerHTML = `<div id="mapwrap"></div><aside id="side"></aside><div id="outl"></div><section id="win" class="hidden"></section>`;
  $("#mapwrap").innerHTML = mapView(); bindMap();
  $("#side").innerHTML = sidePanel();
  $("#outl").innerHTML = outliner();
  const w = $("#win"); stage.classList.toggle("haswin", TAB !== "mapa");
  if (TAB === "mapa") { w.classList.add("hidden"); w.innerHTML = ""; }
  else {
    const f = { prehled: tPrehled, plan: tPlan, vlada: tVlada, kraj: tKraj, vazalove: tVazalove, vojsko: tVojsko, diplo: tDiplo, rise: tRise, hosp: tHosp, stavy: tStavy, rod: tRod, objevy: tObjevy, kronika: tKronika, hra: tHra }[TAB];
    const title = (RAIL.find(r => r[0] === TAB) || [0, ""])[1];
    w.classList.remove("hidden");
    w.innerHTML = `<div class="winbar">${icon(TAB)}<b>${title}</b><span class="sp"></span><button class="b" data-a="tab" data-x='["mapa"]'>✕ Zpět na mapu</button></div><div class="winbody">${f ? f() : ""}</div>`;
  }
  renderModal();
}

// ---------- mapa ----------
const MAPNAME = { premysl: "Čechy", arpad: "Uhry", wittL: "Dolní Bavorsko", wittH: "Bavorsko a Falc", habsburg: "Habsburk", wurttemberg: "Württembersko", norimberk: "Norimberk", wurzburg: "Würzburg", salcburk: "Salcburk", pasov: "Pasov", sponheim: "Korutany", gorice: "Gorice", wettin: "Míšeň", brandenburg: "Braniborsko", sasko: "Sasko", welf: "Brunšvik", magdeburg: "Magdeburk", pomorany: "Pomořany", pomori: "Pomoří", rad: "Řád", velkopolsko: "Velkopolsko", kujavsko: "Kujavsko", mazovsko: "Mazovsko", krakov: "Malopolsko", vratislav: "Vratislav", lehnice: "Lehnice", hlohov: "Hlohov", opoli: "Opolí", halic: "Halič" };
const mapName = C => (MAPNAME[C.id] || C.n.replace(/^(Panství|Úděl) /, "")).toUpperCase();
const MW = 720, MH = 570;
const MX = lon => (lon - 6.6) * 38, MY = lat => (55.1 - lat) * 60;
function clampView() { const v = SEL.view; v.w = clamp(v.w, 110, MW); v.h = v.w * MH / MW; v.x = clamp(v.x, -40, MW - v.w + 40); v.y = clamp(v.y, -40, MH - v.h + 40); }
function provColor(p, mode) {
  const C = S.clans[p.owner]; let c = hexRgb(C.col), a = 150;
  switch (mode) {
    case "teren": c = hexRgb(TERRAIN_COL[p.ter]); a = 220; break;
    case "rozvoj": { const f = clamp(dev(p) / 240, 0, 1); c = [Math.round(240 - 180 * f), Math.round(220 - 90 * f), Math.round(120 - 80 * f)]; a = 220; break; }
    case "spokoj": { if (!knows(S, p)) { c = [160, 160, 160]; a = 120; break; } const f = clamp(p.loy / 100, 0, 1); c = [Math.round(220 - 160 * f), Math.round(70 + 140 * f), 60]; a = 210; break; }
    case "vztahy": { const o = p.owner; if (o === me()) c = [230, 190, 60]; else if (atWar(S, me(), o)) c = [200, 50, 40]; else if (allied(S, me(), o)) c = [60, 160, 70]; else if (S.clans[o].vassalOf === me()) c = [110, 170, 220]; else if (truceUntil(S, me(), o) > S.turn) c = [150, 150, 190]; else { const r = rel(S, me(), o); c = r >= 0 ? [Math.round(170 - r * 0.6), Math.round(170 + r * 0.4), 150] : [Math.round(170 - r * 0.5), Math.round(150 + r * 0.6), 140]; } a = 210; break; }
    case "kultura": c = hexRgb(CULT_COL[p.cul] || "#999"); a = 200; break;
    case "vira": c = hexRgb(RELIGIONS[p.rel].col); a = 200; break;
    case "obchod": { const R = provRoutes(p)[0]; c = R ? hexRgb(R.col) : [170, 165, 150]; a = R ? 190 : 110; break; }
    case "jadra": { if (p.owner === me()) c = p.cores.includes(me()) ? [70, 150, 70] : [230, 140, 40]; else if (claimValid(S, me(), p.id)) c = [230, 200, 60]; else if (p.cores.includes(me())) c = [200, 90, 60]; else c = [175, 170, 160]; a = 200; break; }
    default: a = p.owner === me() ? 205 : 165;
  }
  return [c, a];
}
let EUTERR = { key: null, url: null };
function pointInPoly(x, y, pts) { let ins = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins; } return ins; }
function euTerrain(mode) {
  const key = mode + "|" + Object.values(S.provs).map(p => p.owner + (p.occ || "") + (mode === "spokoj" ? Math.round(p.loy / 10) : mode === "rozvoj" ? Math.round(dev(p) / 20) : mode === "jadra" ? p.cores.join() : mode === "vira" ? p.rel : "")).join(",") + (mode === "vztahy" ? S.turn : "");
  if (EUTERR.key === key) return EUTERR.url;
  if (typeof document === "undefined") return "";
  const sc = 1.5, w = Math.round(MW / sc), h = Math.round(MH / sc), ps = Object.values(S.provs), n = ps.length;
  const px = ps.map(p => MX(p.lon) / sc), py = ps.map(p => MY(p.lat) / sc), idx = new Int16Array(w * h), lim = (60 / sc) ** 2;
  const seas = SEAS.map(poly => poly.map(([lo, la]) => [MX(lo) / sc, MY(la) / sc])), lakes = LAKES.map(([lo, la, rx, ry]) => [MX(lo) / sc, MY(la) / sc, rx * 38 / sc, ry * 60 / sc]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (seas.some(poly => pointInPoly(x, y, poly)) || lakes.some(([cx, cy, rx, ry]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1)) { idx[y * w + x] = -2; continue; }
    let best = -1, bd = lim; const jx = x + Math.sin(y * 0.3) * 1.4, jy = y + Math.cos(x * 0.27) * 1.4;
    for (let i = 0; i < n; i++) { const dx = px[i] - jx, dy = py[i] - jy, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
    idx[y * w + x] = best;
  }
  const cols = ps.map(p => provColor(p, mode)), own = ps.map(p => p.owner), occ = ps.map(p => p.occ ? hexRgb(S.clans[p.occ].col) : null);
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const ctx = cv.getContext("2d"), img = ctx.createImageData(w, h), D = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x, i = idx[k], o = k * 4, noise = ((x * 73856093 ^ y * 19349663) & 15) - 8;
    if (i === -2) { const shore = [idx[k - 1], idx[k + 1], idx[k - w], idx[k + w]].some(j => j >= 0 || j === -1); D[o] = shore ? 120 : 132 + noise / 2; D[o + 1] = shore ? 160 : 170 + noise / 2; D[o + 2] = shore ? 180 : 196 + noise / 2; D[o + 3] = 255; continue; }
    if (i === -1) { D[o] = 214 + noise; D[o + 1] = 202 + noise; D[o + 2] = 170 + noise; D[o + 3] = 255; if ((x + y) % 7 === 0) { D[o] -= 25; D[o + 1] -= 25; D[o + 2] -= 25; } continue; }
    const nb = [x > 0 ? idx[k - 1] : -1, x < w - 1 ? idx[k + 1] : -1, y > 0 ? idx[k - w] : -1, y < h - 1 ? idx[k + w] : -1];
    const realm = nb.some(j => j >= 0 && j !== i && own[j] !== own[i]) && mode !== "teren", prov = nb.some(j => j >= 0 && j !== i);
    let [c, a] = cols[i];
    if (occ[i] && mode === "polit" && ((x + y) >> 2) % 2 === 0) c = occ[i];
    const base = [222 + noise, 210 + noise, 178 + noise], f = a / 255;
    let r = base[0] * (1 - f) + c[0] * f, g = base[1] * (1 - f) + c[1] * f, b = base[2] * (1 - f) + c[2] * f;
    if (realm) { r *= 0.35; g *= 0.35; b *= 0.35; } else if (prov) { r *= 0.8; g *= 0.8; b *= 0.8; }
    D[o] = r; D[o + 1] = g; D[o + 2] = b; D[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  EUTERR = { key, url: cv.toDataURL() };
  return EUTERR.url;
}
const ll = ([lo, la]) => `${MX(lo).toFixed(1)},${MY(la).toFixed(1)}`;
function mapDecor(z, mode) {
  let o = RIVERS.map(([n, pts]) => `<polyline points="${pts.map(ll).join(" ")}" class="river" style="stroke-width:${(1.6 * Math.max(z, 0.5)).toFixed(2)}"><title>${n}</title></polyline>`).join("");
  if (mode === "polit" || mode === "teren") {
    for (const [n, pts] of RANGES) { for (let i = 1; i < pts.length; i++) { const [a, b] = [pts[i - 1], pts[i]].map(q => [MX(q[0]), MY(q[1])]); const L = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.round(L / 11)); for (let j = 0; j < k; j++) { const x = a[0] + (b[0] - a[0]) * j / k + ((j * 7) % 5 - 2), y = a[1] + (b[1] - a[1]) * j / k + ((j * 11) % 5 - 2); o += `<path d="M${(x - 5).toFixed(1)} ${(y + 3).toFixed(1)} L${x.toFixed(1)} ${(y - 5).toFixed(1)} L${(x + 5).toFixed(1)} ${(y + 3).toFixed(1)}" class="mtn"/>`; } } }
    for (const p of Object.values(S.provs)) if (p.ter === "l" || p.ter === "b") { const x = MX(p.lon), y = MY(p.lat); for (const [dx, dy] of [[-12, 8], [10, 10], [-4, 14]]) o += p.ter === "l" ? `<path d="M${x + dx} ${y + dy} l3 -7 l3 7z M${x + dx + 3} ${y + dy} v2" class="tree"/>` : `<path d="M${x + dx} ${y + dy} h6 M${x + dx + 1} ${y + dy + 2} h4" class="marsh"/>`; }
  }
  return o;
}
function mapView() {
  if (!SEL.view) SEL.view = { x: 0, y: 0, w: MW, h: MH };
  const v = SEL.view, z = v.w / MW, mode = SEL.mode || "polit", ps = Object.values(S.provs);
  let nodes = "", labels = "", names = "", arm = "", arrows = "", routes = "";
  for (const c of aliveClans(S)) { const cp = clanProvs(S, c.id); if (cp.length < 2) continue; const x = sum(cp.map(p => MX(p.lon))) / cp.length, y = sum(cp.map(p => MY(p.lat))) / cp.length; const fs = clamp(5 + Math.sqrt(cp.length) * 3.2, 7, 20) * Math.max(0.55, z); names += `<text x="${x.toFixed(0)}" y="${y.toFixed(0)}" class="realmname" style="font-size:${fs.toFixed(1)}px" text-anchor="middle">${esc(mapName(c))}</text>`; }
  for (const p of ps) {
    const x = MX(p.lon), y = MY(p.lat), C = S.clans[p.owner], selp = p.id === SEL.prov, r = (2 + p.castle * 0.8) * Math.max(0.6, z);
    nodes += `<g class="pv${selp ? " sel" : ""}" data-a="prov" data-x='["${p.id}"]'><title>${esc(p.n)} – ${esc(C.house)}${p.occ ? `, obsazeno: ${esc(S.clans[p.occ].house)}` : ""}</title><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(12 * Math.max(0.5, z)).toFixed(1)}" class="hit"/>${C.capital === p.id ? `<path transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${Math.max(0.6, z).toFixed(2)})" d="M-5 3 v-6 l2.5 2 l2.5 -4 l2.5 4 l2.5 -2 v6z" class="capm"/>` : `<rect x="${(x - r).toFixed(1)}" y="${(y - r).toFixed(1)}" width="${(2 * r).toFixed(1)}" height="${(2 * r).toFixed(1)}" class="castle"/>`}${p.siege ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(9 * Math.max(0.6, z)).toFixed(1)}" class="siege"/>` : ""}${selp ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(13 * Math.max(0.5, z)).toFixed(1)}" class="selring"/>` : ""}</g>`;
    if (z < 0.7 || p.v >= 4 || selp || C.capital === p.id) labels += `<text x="${(x + 6 * Math.max(0.5, z)).toFixed(1)}" y="${(y + 3 * z).toFixed(1)}" class="lbl" style="font-size:${(8.5 * Math.max(0.45, z)).toFixed(2)}px">${esc(p.n.split(" a ")[0].replace("Vídeňské Nové Město", "Vídeň. N. Město").replace("Vladimir Volyňský", "Vladimir"))}</text>`;
  }
  if (mode === "obchod" || SEL.routes) for (const R of ROUTES) routes += `<polyline points="${R.provs.map(id => `${MX(S.provs[id].lon).toFixed(1)},${MY(S.provs[id].lat).toFixed(1)}`).join(" ")}" class="route${routeState(S, R) < 0.6 ? " cut" : ""}" stroke="${R.col}" style="stroke-width:${(3.5 * Math.max(0.5, z)).toFixed(1)}"><title>${esc(R.n)} – průchodnost ${Math.round(routeState(S, R) * 100)} %</title></polyline>`;
  const byLoc = {};
  for (const a of S.armies) { const own = a.cl === me(); if (!own && !knows(S, S.provs[a.loc])) continue; (byLoc[a.loc] = byLoc[a.loc] || []).push(a);
    if (a.path && a.path.length && (own || atWar(S, me(), a.cl))) arrows += `<polyline points="${[a.loc, ...a.path].map(id => `${MX(S.provs[id].lon).toFixed(1)},${MY(S.provs[id].lat).toFixed(1)}`).join(" ")}" class="march ${own ? "own" : "foe"}" style="stroke-width:${(2.4 * Math.max(0.5, z)).toFixed(1)}" marker-end="url(#${own ? "arO" : "arF"})"/>`; }
  const k = Math.max(0.55, z);
  for (const [loc, list] of Object.entries(byLoc)) list.forEach((a, i) => { const p = S.provs[loc], own = a.cl === me(), x = MX(p.lon) - 13 * k + i * 5 * k, y = MY(p.lat) - 19 * k - i * 4 * k, n = men(a.t), txt = n >= 1000 ? r1(n / 1000) + "k" : String(Math.round(n / 100) * 100);
    arm += `<g class="atok${own ? " own" : ""}${SEL.armySel === a.id ? " sel" : ""}${atWar(S, me(), a.cl) ? " foe" : ""}" data-a="${own ? "selArmy" : "prov"}" data-x='["${own ? a.id : loc}"]' transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k.toFixed(2)})"><title>${esc(S.clans[a.cl].house)}: ${fmt(n)} mužů${a.cmds.length ? ", " + esc(chr(S, a.cmds[0]).n) : ""}</title><rect width="27" height="11" rx="2" fill="${S.clans[a.cl].col}"/><rect width="27" height="2" y="9" class="mor" style="width:${(clamp(a.morale, 0, 100) * 0.27).toFixed(1)}px"/><text x="13.5" y="8" text-anchor="middle">${txt}</text></g>`; });
  return `<svg id="msvg" viewBox="${v.x.toFixed(1)} ${v.y.toFixed(1)} ${v.w.toFixed(1)} ${v.h.toFixed(1)}" class="map eu" role="img" aria-label="Mapa střední Evropy">
    <defs><marker id="arO" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" class="mo"/></marker><marker id="arF" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" class="mf"/></marker></defs>
    <rect x="-200" y="-200" width="${MW + 400}" height="${MH + 400}" class="sea"/><image href="${euTerrain(mode)}" width="${MW}" height="${MH}" preserveAspectRatio="none"/>${mapDecor(z, mode)}${routes}${names}${nodes}${arrows}${arm}${labels}</svg>
    <div class="mmodes">${MAPMODES.map(([k, n]) => btn(n, "mode", [k], null, mode === k ? "on" : "")).join("")}${mode !== "obchod" ? btn(SEL.routes ? "Cesty ✓" : "Cesty", "routes", [], null, SEL.routes ? "on" : "") : ""}</div>
    <div class="zoom">${btn("+", "zoom", [0.7])}${btn("−", "zoom", [1.4])}${btn("⌂", "zoomReset")}</div>${mapLegend(mode)}`;
}
function mapLegend(mode) {
  const L = { teren: Object.entries(TERRAIN).map(([k, T]) => [TERRAIN_COL[k], T.n]), kultura: Object.entries(CULTURES).map(([k, c]) => [CULT_COL[k], c.n]), vira: Object.entries(RELIGIONS).map(([k, r]) => [r.col, r.n]),
    vztahy: [["#e6be3c", "ty"], ["#3ca046", "spojenec"], ["#6eaadc", "vazal"], ["#c83228", "válka"], ["#9696be", "příměří"]], jadra: [["#469646", "začleněný"], ["#e68c28", "nezačleněný"], ["#e6c83c", "tvůj nárok"], ["#c85a3c", "tvé jádro u cizích"]],
    rozvoj: [["#f0dc78", "nízký"], ["#3c8228", "vysoký rozvoj"]], spokoj: [["#dc4632", "nespokojený"], ["#3cd23c", "spokojený"]] }[mode];
  return L ? `<div class="mlegend">${L.map(([c, n]) => `<span><i style="background:${c}"></i>${esc(n)}</span>`).join("")}</div>` : "";
}
function zoomBy(f, cx, cy) { const v = SEL.view; const nw = clamp(v.w * f, 110, MW); const px = cx != null ? cx : v.x + v.w / 2, py = cy != null ? cy : v.y + v.h / 2; v.x = px - (px - v.x) * nw / v.w; v.y = py - (py - v.y) * nw / v.w; v.w = nw; clampView(); }
function centerOn(pid) { const p = S.provs[pid], v = SEL.view; if (!p) return; v.x = MX(p.lon) - v.w / 2; v.y = MY(p.lat) - v.h / 2; clampView(); }
let DRAG = null;
function bindMap() {
  const svg = $("#msvg"); if (!svg) return;
  svg.addEventListener("wheel", e => { e.preventDefault(); const r = svg.getBoundingClientRect(), v = SEL.view; zoomBy(e.deltaY < 0 ? 0.8 : 1.25, v.x + (e.clientX - r.left) / r.width * v.w, v.y + (e.clientY - r.top) / r.height * v.h); $("#mapwrap").innerHTML = mapView(); bindMap(); }, { passive: false });
  svg.addEventListener("pointerdown", e => { DRAG = { x: e.clientX, y: e.clientY, v: Object.assign({}, SEL.view), moved: false, id: e.pointerId }; });
  svg.addEventListener("pointermove", e => { if (!DRAG) return; const dx = e.clientX - DRAG.x, dy = e.clientY - DRAG.y; if (!DRAG.moved && Math.abs(dx) + Math.abs(dy) < 5) return; DRAG.moved = true; const r = svg.getBoundingClientRect(), kk = DRAG.v.w / r.width; SEL.view = Object.assign({}, DRAG.v, { x: DRAG.v.x - dx * kk, y: DRAG.v.y - dy * kk }); clampView(); const v = SEL.view; svg.setAttribute("viewBox", `${v.x} ${v.y} ${v.w} ${v.h}`); });
}
document.addEventListener("pointerup", () => { if (DRAG && DRAG.moved) { window._noClick = true; setTimeout(() => { window._noClick = false; }, 50); } DRAG = null; });

// ---------- boční panel ----------
function sidePanel() {
  const a = SEL.armySel && S.armies.find(x => x.id === SEL.armySel && x.cl === me());
  if (a) return armyPanel(a);
  SEL.armySel = null;
  return provPanel(S.provs[SEL.prov]);
}
function armyPanel(a) {
  const p = S.provs[a.loc], here = p.siege && p.siege.army === a.id;
  return `<div class="sph">${shield(me(), 34)}<div><b>Vojsko</b><div class="small muted">${esc(a.cmds.map(id => chr(S, id).n).join(", ") || "bez velitele")}</div></div>${btn("✕", "deselect")}</div>
  ${meter("Muži", men(a.t), Math.max(men(a.t), armyLimit(S, a.cmds)), P(S).col)}${troopBar(a.t)}${meter("Morálka", Math.round(a.morale), 100, a.morale < 40 ? "var(--bad)" : "var(--accent2)")}
  <div class="kv"><span>Poloha</span><span>${esc(p.n)}</span><span>Cíl</span><span>${a.path && a.path.length ? `${esc(S.provs[a.to].n)} (${marchTime(S, a.path) - (a.slow ? 1 : 0)} měs.)` : "stojí"}</span><span>Zásoby</span><span>${Math.round(a.grain)} obilí (${Math.floor(a.grain / Math.max(1, men(a.t) / 1000 * 12))} měs.)</span>${here ? `<span>Obléhání</span><span>${p.siege.months}. měs., hradby ${Math.round(p.dur)}</span>` : ""}</div>
  <div class="hint">Klikni na mapě na kraj, kam má vojsko táhnout.</div>
  <div class="row">${sel("tac_" + a.id, Object.entries(TACTICS).map(([k, T]) => [k, T.n]), a.tac || "vyvazena", `data-a="tac" data-x='["${a.id}"]'`)} <label><input type="checkbox" data-a="manual" data-x='["${a.id}"]' ${a.manual ? "checked" : ""}> velet osobně</label></div>
  <div class="row">${btn(a.siegeMode === "ztec" ? "<b>Zteč</b>" : "Zteč", "army", [a.id, "ztec"])}${btn(a.siegeMode === "obleh" ? "<b>Obléhat</b>" : "Obléhat", "army", [a.id, "obleh"])}${btn("Domů", "army", [a.id, "domu"])}</div>`;
}
function provPanel(p) {
  const C = S.clans[p.owner], mine = p.owner === me(), k = knows(S, p), cb = !mine ? cbAgainst(S, me(), p.owner) : null;
  const tags = [TERRAIN[p.ter].n, CULTURES[p.cul].n + " kultura", RELIGIONS[p.rel].n + " víra"].concat(mine && !p.cores.includes(me()) ? ['<b class="warn">nezačleněný</b>'] : []).concat(p.occ ? [`<b class="bad">obsadili ${esc(S.clans[p.occ].house.split(" (")[0])}</b>`] : []).concat(claimValid(S, me(), p.id) ? ['<b class="warn">tvůj nárok</b>'] : []);
  let html = `<div class="sph">${shield(p.owner, 34)}<div><b>${esc(p.n)}</b><div class="small muted">${esc(C.house)}${C.capital === p.id ? " · sídlo" : ""}</div></div></div><div class="tags">${tags.map(t => `<span class="pill">${t}</span>`).join("")}</div>`;
  if (k) html += `${meter("Pole", p.agri, agriCap(S, p), "#7f9a3c")}${meter("Obchod", p.com, comCap(S, p), "#b08a2e")}${meter("Hradby", Math.round(p.dur), durMax(S, p), "#777")}${meter("Spokojenost", Math.round(p.loy), 100, p.loy < 30 ? "var(--bad)" : "var(--accent2)")}<div class="kv"><span>Obyvatel</span><span>${fmt(p.pop * 1000)}</span><span>Posádka</span><span>${estimate(S, p, men(p.troops))}</span><span>Rozvoj</span><span>${dev(p)}</span></div>`;
  else html += `<p class="small muted">Vzdálený kraj – víš jen to, co vyprávějí kupci. Pošli zvědy.</p>`;
  if (mine && !p.occ) {
    const c = devCost(S, me(), p);
    html += `<h4>Rozvoj kraje (${c} bodů)</h4><div class="row">${btn("+ Pole", "develop", [p.id, "adm"], P(S).mp.adm >= c ? null : "Málo bodů správy", "mpb adm")}${btn("+ Obchod", "develop", [p.id, "dip"], P(S).mp.dip >= c ? null : "Málo bodů diplomacie", "mpb dip")}${btn("+ Muži", "develop", [p.id, "mil"], P(S).mp.mil >= c ? null : "Málo bodů vojska", "mpb mil")}</div>`;
    if (!p.cores.includes(me())) html += `<div class="row">${p.coring ? `<span class="small">Začleňování: zbývá ${p.coring.left} měs.</span>` : btn(`Začlenit kraj (${coreCost(S, p)} správy)`, "core", [p.id], P(S).mp.adm >= coreCost(S, p) ? null : "Málo bodů správy")}</div><p class="small muted">Nezačleněný kraj dává polovinu daní a lid je nespokojený.</p>`;
    html += `<div class="row">${btn("Spravovat kraj a vazaly", "openKraj", [p.id], null, "go")}</div>`;
  } else if (!mine) {
    const war = atWar(S, me(), p.owner);
    html += `<div class="kv"><span>Vztah</span><span class="${cls(rel(S, me(), p.owner), -20, 30)}">${Math.round(rel(S, me(), p.owner))}</span><span>Záminka</span><span class="${cb === "zadna" ? "bad" : "good"}">${CB[cb].n}</span>${war ? `<span>Válečné skóre</span><span>${warScore(S, me(), p.owner)}</span>` : ""}</div><div class="row">${btn("Diplomacie s rodem", "openDip", [p.owner], null, "go")}</div>`;
  }
  return html;
}

// ---------- přehled (outliner) ----------
function outliner() {
  if (SEL.olHide) return `<button class="b olt" data-a="olToggle">▸ Přehled</button>`;
  const arms = S.armies.filter(a => a.cl === me()).map(a => `<div class="olr${SEL.armySel === a.id ? " sel" : ""}" data-a="selArmy" data-x='["${a.id}"]'><i class="dot" style="background:${P(S).col}"></i>${esc(a.cmds[0] ? chr(S, a.cmds[0]).n.split(" ")[0] : "Vojsko")}<span class="sp"></span>${r1(men(a.t) / 1000)}k · ${esc(S.provs[a.loc].n.split(" ")[0])}</div>`);
  const wars = enemiesOf(S, me()).map(e => { const ws = warScore(S, me(), e); return `<div class="olr" data-a="openDip" data-x='["${e}"]'>${shield(e, 12)} ${esc(S.clans[e].house.split(" (")[0])}<span class="sp"></span><b class="${ws >= 0 ? "good" : "bad"}">${ws > 0 ? "+" : ""}${ws}</b></div>`; });
  const sieges = Object.values(S.provs).filter(p => p.siege && (p.siege.by === me() || p.owner === me())).map(p => `<div class="olr" data-a="prov" data-x='["${p.id}"]'>${p.siege.by === me() ? "⚔" : "🛡"} ${esc(p.n)}<span class="sp"></span>${p.siege.months}. m.</div>`);
  const occ = Object.values(S.provs).filter(p => p.owner === me() && p.occ).map(p => `<div class="olr bad" data-a="prov" data-x='["${p.id}"]'>obsazeno: ${esc(p.n)}</div>`);
  return `<div class="olbox"><div class="olh">Přehled ${btn("▾", "olToggle")}</div>${wars.length ? `<div class="olt2">Války</div>${wars.join("")}` : ""}${arms.length ? `<div class="olt2">Vojska</div>${arms.join("")}` : '<div class="small muted">Žádné vojsko v poli.</div>'}${sieges.length ? `<div class="olt2">Obléhání</div>${sieges.join("")}` : ""}${occ.join("")}</div>`;
}

// ---------- okno Vláda ----------
function tVlada() {
  const C = P(S), L = leaderOf(S, me()), g = mpGain(S, me());
  const mpRows = MP_IDS.map(k => { const off = officeHolder(S, me(), MP[k].off); return `<div class="mprow"><i class="mpdot big" style="background:${MP[k].col}">${MP[k].n[0]}</i><div><b>${MP[k].n}: ${Math.round(C.mp[k])}</b> <span class="small muted">+${g[k]} měsíčně (panovník: ${STATS[MP[k].stat].toLowerCase()} ${L ? st(L, MP[k].stat) : 0}${off ? `, ${OFFICES[MP[k].off].n.toLowerCase()} ${esc(off.n)}` : ""})</span>${meter("", Math.round(C.mp[k]), 999, MP[k].col)}</div></div>`; }).join("");
  const stabScale = [-3, -2, -1, 0, 1, 2, 3].map(v => `<i class="${v === C.stab ? "on" : ""} ${v < 0 ? "neg" : v > 0 ? "pos" : ""}">${v > 0 ? "+" : ""}${v}</i>`).join("");
  const unc = clanProvs(S, me()).filter(p => !p.cores.includes(me()));
  const ideas = Object.entries(IDEAS).map(([gid, G]) => { const nx = nextIdea(S, me(), gid); return `<div class="idea"><div class="ih"><i class="mpdot" style="background:${MP[G.mp].col}">${MP[G.mp].n[0]}</i><b>${G.n}</b></div>${G.list.map(([id, n, d]) => `<div class="il ${hasIdea(S, me(), id) ? "done" : nx && nx[0] === id ? "next" : ""}"><b>${hasIdea(S, me(), id) ? "✔ " : ""}${n}</b><div class="small muted">${d}</div></div>`).join("")}${nx ? btn(`Přijmout ideu (${IDEA_COST})`, "idea", [gid], C.mp[G.mp] >= IDEA_COST ? null : "Málo bodů", "mpb " + G.mp) : '<span class="good small">Skupina hotová</span>'}</div>`; }).join("");
  const miss = missionsFor(S, me()).map(m => `<div class="mis ${C.missions[m.id] ? "done" : ""}"><b>${C.missions[m.id] ? "✔ " : ""}${m.n}</b><div class="small">${m.d}</div><div class="small muted">Odměna: ${m.r}</div></div>`).join("");
  return `<div class="grid">
  ${card("Panovník", `<div class="crest">${shield(me(), 56)}<div><div class="big">${esc(L ? L.n : "—")}</div><div class="muted">${esc(cap(C.t))}, ${L ? age(S, L) + " let" : ""} · ${esc(C.house)}</div><div class="muted">${traitsTxt(L || { traits: [] })}</div></div></div>${L ? STAT_IDS.map(k2 => meter(STATS[k2], st(L, k2), 100)).join("") : ""}`)}
  ${card("Body vlády", mpRows + `<p class="small muted">Body se utrácejí za rozvoj krajů (boční panel kraje), stabilitu, začleňování krajů, ideje a snižování válečného vyčerpání. Přibývají podle schopností panovníka a rádců v úřadech (Vazalové → Dvůr a úřady). Strop je 999.</p>`)}
  ${card("Stabilita a vyčerpání", `<div class="stab">${stabScale}</div><p class="small">Stabilita zvyšuje příjmy (+5 % za bod), spokojenost lidu i věrnost vazalů. Klesá při válce bez záminky, nástupu nového vládce, klatbě a přetížení říše.</p><div class="row">${btn(`Zvýšit stabilitu (${stabCost(S, me())} správy)`, "stab", [], C.stab < 3 && C.mp.adm >= stabCost(S, me()) ? null : "Nelze", "mpb adm")}</div>
    ${meter("Válečné vyčerpání", r1(C.we), 20, C.we > 8 ? "var(--bad)" : "var(--warn)")}<p class="small">Vyčerpání roste ve válce a s ztrátami, snižuje spokojenost lidu a ochotu bojovat dál.</p><div class="row">${btn("Snížit vyčerpání o 2 (75 diplomacie)", "reduceWE", [], C.we >= 0.5 && C.mp.dip >= 75 ? null : "Nelze", "mpb dip")}</div>`)}
  ${card(`Začlenění říše – přetížení ${overext(S, me())} %`, unc.length ? tbl(["Kraj", "#Rozvoj", ""], unc.map(p => tr([btn(esc(p.n), "prov", [p.id]), dev(p), p.coring ? `začleňuje se, ${p.coring.left} měs.` : btn(`Začlenit (${coreCost(S, p)})`, "core", [p.id], C.mp.adm >= coreCost(S, p) && !p.occ ? null : "Nelze", "mpb adm")]))) + '<p class="small muted">Přetížení nad 50 % ohrožuje stabilitu.</p>' : '<p class="good">Všechny kraje jsou začleněné.</p>')}
  ${card("Ideje", `<div class="ideas">${ideas}</div>`, "wide")}
  ${card("Úkoly rodu", `<div class="missions">${miss}</div>`, "wide")}</div>`;
}

// ---------- akce ----------
Object.assign(ACT, {
  prov: id => { const a = SEL.armySel && S.armies.find(x => x.id === SEL.armySel && x.cl === me()); if (a && id !== a.loc) { const e = orderArmy(S, me(), a.id, "tahnout", id); if (!e) toast(`Vojsko táhne na ${S.provs[id].n} (${marchTime(S, a.path)} měs.).`); return e; } SEL.prov = id; SEL.armySel = null; },
  selArmy: id => { SEL.armySel = SEL.armySel === id ? null : id; const a = S.armies.find(x => x.id === id); if (a && SEL.armySel) { SEL.prov = a.loc; } },
  deselect: () => { SEL.armySel = null; }, mode: m => { SEL.mode = m; }, zoom: f => { zoomBy(+f); }, zoomReset: () => { SEL.view = { x: 0, y: 0, w: MW, h: MH }; },
  olToggle: () => { SEL.olHide = !SEL.olHide; }, openKraj: id => { SEL.prov = id; TAB = "kraj"; }, openDip: id => { SEL.dip = id; TAB = "diplo"; },
  develop: (id, k) => develop(S, me(), id, k), core: id => startCore(S, me(), id), stab: () => raiseStab(S, me()), reduceWE: () => reduceWE(S, me()), idea: g => buyIdea(S, me(), g),
  play: () => { SEL.play = !SEL.play; if (SEL.play) setTimeout(playTick, 50); }, speed: v => { SEL.speed = +v; },
  peaceDemand: foe => { const items = peaceItems(S, me(), foe).filter((it, i) => { const el = $("#pi_" + i); return el && el.checked; }); if (!items.length) return "Zaškrtni aspoň jeden požadavek."; return proposePeace(S, me(), foe, items, true); },
  peaceWhite: foe => proposePeace(S, me(), foe, [], false),
  peaceAccept: foe => { const ws = warScore(S, me(), foe); applyPeace(S, foe, me(), greedyDemand(S, foe, me(), Math.max(10, -ws))); },
});
function playTick() {
  if (!SEL.play) return;
  if (S.events.length || (S.over && !S.over.cont) || TAB !== "mapa") { SEL.play = false; render(); return; }
  run("end", []);
  setTimeout(playTick, [0, 1700, 800, 300][SEL.speed || 1]);
}
document.addEventListener("keydown", ev => { if (ev.key === "Escape") { if (S && (SEL.armySel || TAB !== "mapa")) { SEL.armySel = null; TAB = "mapa"; render(); } } if (ev.key === " " && ev.target === document.body) { ev.preventDefault(); run("play", []); } });

// ---------- válka a mír v diplomacii ----------
function warPeaceBlock(T) {
  if (!atWar(S, me(), T.id)) { const cb = cbAgainst(S, me(), T.id); return `<div class="kv"><span>Záminka k válce</span><span class="${cb === "zadna" ? "bad" : "good"}">${CB[cb].n} – <span class="small">${CB[cb].d}</span></span></div>`; }
  const ws = warScore(S, me(), T.id), items = peaceItems(S, me(), T.id), w = warOf(S, me(), T.id);
  const enemyWants = ws < 0 ? greedyDemand(S, T.id, me(), Math.max(10, -ws)) : [];
  return `<h4>Válka (${CB[w.cb] ? CB[w.cb].n : "—"})</h4><div class="wsbar"><i style="left:50%;width:${Math.abs(ws) / 2}%;${ws < 0 ? `transform:translateX(-100%);background:var(--bad)` : "background:var(--good)"}"></i><b style="left:50%"></b><span>${ws > 0 ? "+" : ""}${ws}</span></div>
    <p class="small muted">Válečné skóre: vítězné bitvy a obsazené kraje (sídlo se počítá dvojnásob). Jejich vyčerpání ${r1(T.we)}, tvoje ${r1(P(S).we)}.</p>
    ${items.length ? `<h4>Mírové požadavky</h4>${items.map((it, i) => `<label class="pitem"><input type="checkbox" id="pi_${i}"> ${esc(it.n)} <span class="muted">(${Math.round(it.cost)})</span></label>`).join("")}` : '<p class="small muted">Zatím nemáš co požadovat – obsaď jejich kraje.</p>'}
    <div class="row">${items.length ? btn("Požadovat mír", "peaceDemand", [T.id], null, "go") : ""}${btn("Nabídnout bílý mír", "peaceWhite", [T.id])}${ws < 0 ? btn(`Přijmout jejich podmínky: ${enemyWants.map(i => i.n).join(", ") || "bílý mír"}`, "peaceAccept", [T.id], null, "danger") : ""}</div>`;
}
