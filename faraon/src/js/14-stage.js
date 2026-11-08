// Hlavní obrazovka: mapa přes celé okno s plovoucími panely, režimy mapy, posun a přiblížení, bublina s údaji,
// přehled dění (vojska, obléhání, stavby), panovník a hlas papyrů. Plynulý běh času s pauzou při událostech.

const MAP_MODES = {
  polit: { n: "Politická", d: "kdo vládne kterému nomu" },
  teren: { n: "Terén", d: "Kemet – úrodná niva, Dešret – poušť" },
  uroda: { n: "Úroda", d: "obilí pro lid po odvedení daně při poslední záplavě: červená hlad, zelená přebytek" },
  loy: { n: "Spokojenost", d: "spokojenost lidu: červená vzpoura, zelená klid" },
  rozvoj: { n: "Rozvoj", d: "pole a řemesla vůči stropu" },
  vojsko: { n: "Vojsko", d: "síla posádek: čím tmavší, tím víc mužů" },
};
const lerp = (a, b, t) => a + (b - a) * t;
function scale3(t, c0, c1, c2) { t = clamp(t, 0, 1); const [a, b, u] = t < 0.5 ? [c0, c1, t * 2] : [c1, c2, (t - 0.5) * 2]; return [0, 1, 2].map(i => Math.round(lerp(a[i], b[i], u))); }
const C_RED = [190, 50, 30], C_YEL = [225, 190, 70], C_GRN = [50, 140, 70];
function modeColor(p, mode) {
  const C = S.clans[p.owner], kn = knows(S, p);
  if (mode === "polit") return [...hexRgb(C.col), p.owner === me() ? 120 : 75];
  if (mode === "teren") return null;
  if (!kn) return [140, 130, 115, 70];
  if (mode === "uroda") { const h = S.flood.h || 15.5, r = (provFood(S, p, h) - (C.type === "kmen" ? 0 : provTax(S, p, h))) / Math.max(1, provNeed(p)); return [...scale3((r - 0.75) / 0.6 - p.hunger, C_RED, C_YEL, C_GRN), 150]; }
  if (mode === "loy") return [...scale3(p.loy / 100, C_RED, C_YEL, C_GRN), 150];
  if (mode === "rozvoj") return [...scale3((p.agri / agriCap(S, p) + p.com / comCap(S, p)) / 2, [230, 220, 180], C_YEL, C_GRN), 150];
  if (mode === "vojsko") { const t = clamp(men(p.troops) / 3000, 0, 1); return [Math.round(lerp(240, 120, t)), Math.round(lerp(210, 20, t)), Math.round(lerp(190, 20, t)), 160]; }
  return null;
}
let GEO = null;
function geoIdx() {
  if (GEO) return GEO;
  const sc = 2, w = Math.floor(MW / sc), h = Math.floor(MH / sc), ps = Object.values(S.provs), n = ps.length;
  const px = ps.map(p => MX(p.lon) / sc), py = ps.map(p => MY(p.lat) / sc), rad = ps.map(p => (p.ter === "poust" || p.ter === "oaza" ? 44 : p.ter === "delta" ? 26 : 18) / sc), idx = new Int16Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let best = -1, bd = 1; const jx = x + Math.sin(y * 0.4) * 0.8, jy = y + Math.cos(x * 0.37) * 0.8;
    for (let i = 0; i < n; i++) { const dx = px[i] - jx, dy = py[i] - jy, d = Math.sqrt(dx * dx + dy * dy) / rad[i]; if (d < bd) { bd = d; best = i; } }
    idx[y * w + x] = best;
  }
  GEO = { w, h, idx, ids: ps.map(p => p.id) }; return GEO;
}
function territoryImage(mode) {
  if (typeof document === "undefined") return "";
  const G = geoIdx(), ps = G.ids.map(id => S.provs[id]), cols = ps.map(p => modeColor(p, mode)), own = ps.map(p => p.owner);
  const key = mode + "|" + cols.map(c => c ? c.join(".") : "-").join(",") + "|" + own.join(",");
  if (TERR.key === key && TERR.url) return TERR.url;
  const { w, h, idx } = G, cv = document.createElement("canvas"); cv.width = w; cv.height = h; const ctx = cv.getContext("2d"), img = ctx.createImageData(w, h), D = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x, i = idx[k], o = k * 4; if (i < 0) continue;
    const nb = [x > 0 ? idx[k - 1] : -1, x < w - 1 ? idx[k + 1] : -1, y > 0 ? idx[k - w] : -1, y < h - 1 ? idx[k + w] : -1];
    const realm = nb.some(j => j !== i && (j < 0 || own[j] !== own[i])), prov = nb.some(j => j >= 0 && j !== i), c = cols[i];
    if (realm && mode === "polit") { const [r, g, b] = hexRgb(S.clans[own[i]].col); D[o] = r * 0.45; D[o + 1] = g * 0.45; D[o + 2] = b * 0.45; D[o + 3] = 220; }
    else if (realm || prov) { D[o] = 60; D[o + 1] = 40; D[o + 2] = 20; D[o + 3] = realm ? 130 : 70; }
    else if (c) { D[o] = c[0]; D[o + 1] = c[1]; D[o + 2] = c[2]; D[o + 3] = c[3]; }
  }
  ctx.putImageData(img, 0, 0); TERR = { key, url: cv.toDataURL() }; return TERR.url;
}
function mapVB() { if (!SEL.vb) SEL.vb = [0, 0, MW, MH]; return SEL.vb; }
function setZoom(k) { const Z = ZOOMS[k] || ZOOMS.cele, [lo0, lo1, la0, la1] = Z.b; SEL.vb = [MX(lo0), MY(la1), MX(lo1) - MX(lo0), MY(la0) - MY(la1)]; SEL.zoom = k; }
function mapSvg() {
  const [vx, vy, vw, vh] = mapVB(), k = vw / MW, f = Math.max(0.3, k), R = 5.2 * f, mode = SEL.mapMode || "polit";
  let g = `<defs><radialGradient id="dsr" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#e2c48a"/><stop offset="1" stop-color="#c99a5a"/></radialGradient>
    <pattern id="dun" width="22" height="9" patternUnits="userSpaceOnUse"><path d="M0 7 Q5.5 2 11 7 T22 7" fill="none" stroke="#a87a3e" stroke-width=".6" opacity=".45"/></pattern></defs>
    <rect x="-400" y="-400" width="${MW + 800}" height="${MH + 800}" fill="url(#dsr)"/><rect x="-400" y="-400" width="${MW + 800}" height="${MH + 800}" fill="url(#dun)"/>`;
  g += `<polygon class="sea" points="${pts(MED)} ${MX(36)},${MY(32.8)} ${MX(24)},${MY(32.8)} ${MX(24)},${MY(31.9)}"/><polygon class="sea" points="${pts(RED)}"/><polyline class="coast" points="${pts(MED)}"/>`;
  const tu = territoryImage(mode); if (tu) g += `<image href="${tu}" x="0" y="0" width="${MW}" height="${MH}" preserveAspectRatio="none" pointer-events="none"/>`;
  const kemOp = mode === "teren" ? 0.95 : mode === "polit" ? 0.7 : 0.35;
  g += `<polygon fill="var(--kemet)" opacity="${kemOp}" points="${pts(DELTA_FAN)}"/>`;
  for (const L of [NILE, BAHR]) g += `<polyline class="kemet" points="${pts(L)}" stroke-width="${(L === NILE ? 8 : 5) * f}" opacity="${kemOp}"/>`;
  g += `<ellipse cx="${MX(30.8)}" cy="${MY(29.35)}" rx="13" ry="8" fill="var(--kemet)" opacity="${kemOp * 0.9}"/>`;
  for (const [la, lo, rx, ry] of [[28.35, 28.86, 9, 5], [25.55, 29.2, 12, 4], [25.44, 30.55, 5, 11]]) g += `<ellipse cx="${MX(lo)}" cy="${MY(la)}" rx="${rx}" ry="${ry}" fill="var(--kemet)" opacity="${kemOp * 0.8}"/>`;
  g += `<ellipse cx="${MX(30.62)}" cy="${MY(29.47)}" rx="10" ry="3.5" fill="var(--sea)"/>`;
  for (const L of [NILE, NILE_W, NILE_E, NILE_M]) g += `<polyline class="nile" points="${pts(L)}" stroke-width="${L === NILE ? 2.6 * f : 1.6 * f}"/>`;
  g += `<polyline class="nile" points="${pts(BAHR)}" stroke-width="${0.9 * f}" opacity=".7"/>`;
  const reg = [["Středozemní moře", 31.75, 28.0], ["Rudé moře", 25.6, 34.9], ["Libyjská poušť", 27.0, 27.4], ["Východní poušť", 24.6, 33.8], ["SINAJ", 29.6, 33.9], ["NÚBIE", 21.0, 32.6], ["DELTA", 31.25, 31.45], ["HORNÍ EGYPT", 26.6, 33.7], ["DOLNÍ EGYPT", 30.0, 32.4]];
  for (const [t, la, lo] of reg) g += `<text class="region${/moře/.test(t) ? " sea2" : ""}" x="${MX(lo)}" y="${MY(la)}" font-size="${11 * f}" text-anchor="middle">${t}</text>`;
  const done = new Set();
  for (const p of Object.values(S.provs)) for (const n of p.nb) { const key = p.id < n ? p.id + n : n + p.id; if (done.has(key)) continue; done.add(key); const q = S.provs[n]; if (p.ter === "poust" || q.ter === "poust" || p.ter === "oaza" || q.ter === "oaza") g += `<line class="edge" x1="${MX(p.lon)}" y1="${MY(p.lat)}" x2="${MX(q.lon)}" y2="${MY(q.lat)}" stroke-width="${0.8 * f}"/>`; }
  for (const a of S.armies) { if (!a.path || !a.path.length) continue; const own = a.cl === me(); if (!own && !knows(S, S.provs[a.loc])) continue; const L = [a.loc].concat(a.path).map(id => S.provs[id]); g += `<polyline class="march ${own ? "own" : "foe"}" stroke-width="${1.8 * f}" stroke-dasharray="${own ? "" : 4 * f + " " + 2 * f}" points="${L.map(p => MX(p.lon) + "," + MY(p.lat)).join(" ")}"/>`; }
  const LEFT = new Set(["u2", "u4", "u6", "u8", "u10", "u12", "u14", "u16", "u18", "u20", "u22", "l2", "l3", "l5", "l6", "lx", "fa", "o_bah", "n_sai", "n_semna", "n_wawat"]);
  for (const p of Object.values(S.provs)) {
    const x = MX(p.lon), y = MY(p.lat), C = S.clans[p.owner], mine = p.owner === me(), war = atWar(S, me(), p.owner), capf = C && C.capital === p.id;
    g += `<g class="pv${mine ? " mine" : ""}${war ? " war" : ""}" data-a="selProv" data-x='["${p.id}"]' data-pid="${p.id}"><circle cx="${x}" cy="${y}" r="${R * 2.4}" fill="transparent"/>`;
    // standarta nomu: tyč se znakem rodu
    g += `<line x1="${x}" y1="${y + R * 0.9}" x2="${x}" y2="${y - R * (capf ? 2.1 : 1.6)}" stroke="#2b1d12" stroke-width="${0.9 * f}"/>`;
    g += `<rect class="std" x="${x - R * (capf ? 0.95 : 0.75)}" y="${y - R * (capf ? 2.6 : 2.0)}" width="${R * (capf ? 1.9 : 1.5)}" height="${R * (capf ? 1.4 : 1.1)}" rx="${R * 0.25}" fill="${C.col}" stroke="${war ? "#c4361c" : mine ? "#fff6d8" : "#2b1d12"}" stroke-width="${(war || mine ? 1.4 : 0.7) * f}"/>`;
    if (capf) g += `<circle cx="${x}" cy="${y - R * 1.9}" r="${R * 0.35}" fill="#f2d27a"/>`;
    g += `<circle class="dot" cx="${x}" cy="${y + R * 0.9}" r="${R * 0.35}" fill="#2b1d12"/>`;
    if (p.siege) g += `<circle class="siege" cx="${x}" cy="${y}" r="${R * 2}" stroke-width="${1.6 * f}"/>`;
    if (p.hunger > 0.15 && (mine || knows(S, p))) g += `<text x="${x + R * 1.2}" y="${y - R * 1.2}" font-size="${9 * f}" fill="#c4361c" font-weight="bold">!</text>`;
    if (SEL.prov === p.id) g += `<circle class="selring" cx="${x}" cy="${y - R * 0.6}" r="${R * 2.4}" stroke-width="${2.4 * f}"/>`;
    const left = LEFT.has(p.id);
    if (k < 0.75 || capf || p.v >= 3 || p.ter === "poust" || p.ter === "oaza") g += `<text class="lbl${capf ? " cap" : ""}" x="${x + (left ? -1 : 1) * R * 1.5}" y="${y + R * 0.4}" font-size="${9 * f}" stroke-width="${2.6 * f}" text-anchor="${left ? "end" : "start"}">${esc(p.n)}</text>`;
    g += `</g>`;
  }
  for (const a of S.armies) { const p = S.provs[a.loc], own = a.cl === me(); if (!own && !knows(S, p)) continue; const x = MX(p.lon) + R * 1.6, y = MY(p.lat) + R * 0.6, s2 = R * (0.9 + Math.min(1.2, men(a.t) / 4000));
    g += `<g class="army" data-a="selProv" data-x='["${p.id}"]' data-pid="${p.id}"><rect x="${x - s2}" y="${y - s2 * 0.7}" width="${s2 * 2.4}" height="${s2 * 1.4}" rx="${s2 * 0.3}" fill="${S.clans[a.cl].col}" stroke-width="${0.8 * f}"/><text x="${x + s2 * 0.2}" y="${y + s2 * 0.35}" font-size="${7 * f}" fill="#fff" text-anchor="middle" font-weight="bold">${Math.round(men(a.t) / 100) / 10}k</text></g>`; }
  return `<svg class="map" id="mapsvg" viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mapa Egypta">${g}</svg>`;
}

// ---------- panely nad mapou ----------
function outliner() {
  const C = P(S), out = [];
  const wars = enemiesOf(S, me()); if (wars.length) out.push(`<div class="ol-h">Války</div>${wars.map(e => `<div class="ol-i" data-a="dipl" data-x='["${e}"]'>${emblem(e, 14)} ${esc(S.clans[e].n)}</div>`).join("")}`);
  const ar = S.armies.filter(a => a.cl === me()); if (ar.length) out.push(`<div class="ol-h">Vojska v poli</div>${ar.map(a => `<div class="ol-i" data-a="selProv" data-x='["${a.loc}"]'>${ricon("vojsko", 14)} ${fmtK(men(a.t))} · ${esc(S.provs[a.loc].n)}${a.path.length ? " → " + esc(S.provs[a.goal].n) : ""}</div>`).join("")}`);
  const sg_ = Object.values(S.provs).filter(p => p.siege && (p.owner === me() || p.siege.cl === me())); if (sg_.length) out.push(`<div class="ol-h">Obléhání</div>${sg_.map(p => `<div class="ol-i ${p.owner === me() ? "bad" : ""}" data-a="selProv" data-x='["${p.id}"]'>${esc(p.n)} · hradby ${Math.round(p.dur)} · ${p.siege.m}. měs.</div>`).join("")}`);
  const bl = myProvs().filter(p => p.build).map(p => `<div class="ol-i" data-a="selProv" data-x='["${p.id}"]'>${esc(BUILD[p.build.b].n.split(" (")[0])} · ${esc(p.n)} (${Math.ceil(p.build.left)} m.)</div>`);
  if (C.tomb.active) bl.push(`<div class="ol-i" data-a="tab" data-x='["chramy"]'>Hrobka: ${esc(TOMB_STAGES[C.tomb.stage])}</div>`);
  for (const id of MON_IDS) { const st_ = monState(S, id); if (st_.active && st_.by === me()) bl.push(`<div class="ol-i" data-a="tab" data-x='["chramy"]'>${esc(MONUMENTS[id].n)} (${st_.stage + 1}/${MONUMENTS[id].stages})</div>`); }
  if (bl.length) out.push(`<div class="ol-h">Stavby</div>${bl.join("")}`);
  const ex = officers(S, me()).filter(c => c.away); if (ex.length) out.push(`<div class="ol-h">Výpravy</div>${ex.map(c => `<div class="ol-i">${esc(EXPED[c.away.exp].n.split(" –")[0])} · ${c.away.until - S.turn} m.</div>`).join("")}`);
  out.push(`<div class="ol-h">Vědění</div><div class="ol-i" data-a="tab" data-x='["vedeni"]'>${C.res.cur ? `${esc(TECHS[C.res.cur].n)}<div class="olbar"><b style="width:${clamp(C.res.pts / techCost(S, me(), C.res.cur) * 100, 0, 100)}%"></b></div>` : '<span class="bad">nic se nezkoumá</span>'}</div>`);
  const idle = freeOffs().length; out.push(`<div class="ol-i ${idle ? "warn" : ""}" data-a="tab" data-x='["plan"]'>${ricon("urednici", 14)} ${idle ? nPlural(idle, "úředník čeká", "úředníci čekají", "úředníků čeká") + " na rozkaz" : "všichni úředníci jednají"}</div>`);
  return out.join("");
}
function rulerBox() {
  const C = P(S), L = ruler(), heir = heirsOf(S, me())[0];
  return `<div class="rb" data-a="tab" data-x='["prehled"]'>${L ? portrait(L, 64) : ""}<div><div class="rbn">${L ? esc(L.n) : "—"}</div><div class="small muted">${esc(C.t)} · ${regYear(S, me())}. rok vlády · ${L ? age(S, L) : "?"} let</div>
    <div class="rbm" title="maat">${hg("maat")}<i><b style="width:${Math.round(C.maat)}%"></b></i>${Math.round(C.maat)}</div><div class="small">${heir ? "dědic: " + esc(heir.n) : '<span class="bad">bez dědice</span>'}</div></div></div>`;
}
function quoteBar() { const all = Object.values(QUOTES).filter(q => q.od >= S.bce && (!q.tags.includes("sip") || S.scen === "sip")), q = all[(S.turn * 5 + 3) % all.length]; return `<span class="qt">„${esc(q.t)}“</span> <span class="qs">— ${esc(q.src)}</span>`; }
function alertIcons() { const al = alerts(); if (!al.length) return ""; return `<details class="ov ov-alerts"><summary>${ricon("urednici", 18)} Rádci hlásí <b>${al.length}</b></summary>${alertsHtml(10)}</details>`; }
function tMapa() {
  if (!SEL.vb) setZoom(SEL.zoom || "cele");
  const p = SEL.prov && S.provs[SEL.prov];
  const mode = SEL.mapMode || "polit";
  return `<div class="stage" id="stage">${mapSvg()}
    ${p ? `<section class="ov ov-left">${btn("✕", "closeProv", [], null, "close")}${provPanel(p)}</section>` : ""}
    <section class="ov ov-right"><div class="ol-title">Přehled dění</div>${outliner()}</section>
    ${alertIcons()}
    <section class="ov ov-bl">${rulerBox()}</section>
    <section class="ov ov-modes"><div class="mm">${Object.entries(MAP_MODES).map(([k, M]) => `<button class="b${mode === k ? " on" : ""}" data-a="mapMode" data-x='["${k}"]' title="${esc(M.d)}">${M.n}</button>`).join("")}</div>
      <div class="mm">${Object.entries(ZOOMS).map(([k, Z]) => btn(Z.n, "zoom", [k])).join("")}</div><div class="small muted">${esc(MAP_MODES[mode].d)} · kolečkem přibližuješ, tažením posouváš</div></section>
    <section class="ov ov-quote">${quoteBar()}</section>
  </div>`;
}

// ---------- ovládání mapy myší a dotykem ----------
let MAPDRAG = { on: false, moved: 0, x: 0, y: 0, until: 0 }, ZOOM_T = null;
function svgPt(svg, cx, cy) { const r = svg.getBoundingClientRect(), [vx, vy, vw, vh] = mapVB(), s = Math.max(vw / r.width, vh / r.height), ox = (r.width * s - vw) / 2, oy = (r.height * s - vh) / 2; return [vx - ox + (cx - r.left) * s, vy - oy + (cy - r.top) * s, s]; }
function applyVB() { const svg = document.getElementById("mapsvg"); if (svg) svg.setAttribute("viewBox", mapVB().map(v => v.toFixed(1)).join(" ")); }
function clampVB() { const v = mapVB(); v[2] = clamp(v[2], MW * 0.12, MW * 1.6); v[3] = v[2] * MH / MW; v[0] = clamp(v[0], -MW * 0.4, MW * 1.4 - v[2]); v[1] = clamp(v[1], -MH * 0.3, MH * 1.3 - v[3]); }
function initMap() {
  const svg = document.getElementById("mapsvg"); if (!svg || svg._init) return; svg._init = true;
  SEL.vb = SEL.vb || [0, 0, MW, MH]; if (SEL.vb.length === 4 && Math.abs(SEL.vb[3] - SEL.vb[2] * MH / MW) > 1) { const c = SEL.vb[1] + SEL.vb[3] / 2; SEL.vb[3] = SEL.vb[2] * MH / MW; SEL.vb[1] = c - SEL.vb[3] / 2; }
  svg.addEventListener("wheel", ev => { ev.preventDefault(); const [px, py] = svgPt(svg, ev.clientX, ev.clientY), v = mapVB(), f = ev.deltaY > 0 ? 1.18 : 1 / 1.18, nw = clamp(v[2] * f, MW * 0.12, MW * 1.6), k = nw / v[2];
    v[0] = px - (px - v[0]) * k; v[1] = py - (py - v[1]) * k; v[2] = nw; v[3] = nw * MH / MW; clampVB(); applyVB(); clearTimeout(ZOOM_T); ZOOM_T = setTimeout(() => render(), 160); }, { passive: false });
  svg.addEventListener("pointerdown", ev => { MAPDRAG = { on: true, moved: 0, x: ev.clientX, y: ev.clientY, until: 0 }; });
  window.onpointermove = ev => {
    if (MAPDRAG.on) { const dx = ev.clientX - MAPDRAG.x, dy = ev.clientY - MAPDRAG.y; MAPDRAG.moved += Math.abs(dx) + Math.abs(dy); if (MAPDRAG.moved > 5) { const [, , s] = svgPt(svg, ev.clientX, ev.clientY), v = mapVB(); v[0] -= dx * s; v[1] -= dy * s; clampVB(); applyVB(); hideTip(); } MAPDRAG.x = ev.clientX; MAPDRAG.y = ev.clientY; return; }
    const g = ev.target.closest && ev.target.closest("[data-pid]"); if (g && document.getElementById("mapsvg") && document.getElementById("mapsvg").contains(g)) showTip(g.dataset.pid, ev.clientX, ev.clientY); else hideTip();
  };
  window.onpointerup = () => { if (MAPDRAG.on && MAPDRAG.moved > 5) MAPDRAG.until = Date.now() + 250; MAPDRAG.on = false; };
}
function tipHtml(pid) {
  const p = S.provs[pid], C = S.clans[p.owner], kn = knows(S, p), mode = SEL.mapMode || "polit";
  let h = `<div class="tt-h">${emblem(p.owner, 16)} <b>${esc(p.n)}</b></div><div class="small muted">${esc(p.eg)}</div><div class="small">${esc(C.n)} · ${esc(TERRAIN[p.ter].n)}</div>`;
  if (kn) {
    h += `<div class="small">obyvatel ≈ ${fmtK(p.pop * 1000)} · vojáků ${p.owner === me() ? fmt(men(p.troops)) : estimate(S, p, men(p.troops))} · spokojenost ${Math.round(p.loy)}</div>`;
    if (mode === "uroda") { const hh = S.flood.h || 15.5; h += `<div class="small">obilí pro lid ≈ ${fmtK(provFood(S, p, hh) - provTax(S, p, hh))} / potřeba ${fmtK(provNeed(p))}</div>`; }
    if (mode === "rozvoj") h += `<div class="small">pole ${p.agri}/${agriCap(S, p)} · řemesla ${p.com}/${comCap(S, p)}</div>`;
    if (p.hunger > 0.05) h += `<div class="small bad">hlad</div>`;
  } else h += `<div class="small muted">o nomu víš jen odhady</div>`;
  if (p.siege) h += `<div class="small bad">obléhá ${esc(S.clans[p.siege.cl].n)}</div>`;
  const ar = S.armies.filter(a => a.loc === pid && (a.cl === me() || kn)); for (const a of ar) h += `<div class="small">vojsko: ${esc(S.clans[a.cl].n)}, ${fmtK(men(a.t))} mužů</div>`;
  return h;
}
function showTip(pid, x, y) { const t = document.getElementById("tip"); if (!t) return; t.innerHTML = tipHtml(pid); t.style.display = "block"; const w = t.offsetWidth, h = t.offsetHeight; t.style.left = Math.min(window.innerWidth - w - 8, x + 14) + "px"; t.style.top = Math.min(window.innerHeight - h - 8, y + 14) + "px"; }
function hideTip() { const t = document.getElementById("tip"); if (t) t.style.display = "none"; }

// ---------- plynulý běh času ----------
const AUTO = { on: false, ms: 1600, timer: null };
function autoTick() {
  if (!AUTO.on) return;
  if (S.events.length || (S.over && !S.over.cont)) { AUTO.on = false; render(); return; }
  endTurn(S); render();
  if (S.events.length) { AUTO.on = false; render(); return; }
  AUTO.timer = setTimeout(autoTick, AUTO.ms);
}
