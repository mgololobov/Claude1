// Mapa ze skutečných podkladů: pobřeží, jezera a řeky podle Natural Earth, stínovaný reliéf z výškového modelu.
// Podklad se jednou spočítá do rastru; území rodů jsou nad ním jen barevným tónem s hranicí (jako u map EU).
// Hranice krajů jsou herní (dělení podle nejbližšího sídla), ne historické hranice panství.

const RQ = 2; // bodů rastru na jednotku mapy
function mkNoise_(seed) {
  const g = new Float32Array(65536); let s = seed >>> 0;
  for (let i = 0; i < 65536; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; g[i] = s / 4294967296; }
  return (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), r0 = (yi & 255) << 8, r1 = ((yi + 1) & 255) << 8, c0 = xi & 255, c1 = (xi + 1) & 255, a = g[r0 | c0], b = g[r0 | c1], c = g[r1 | c0], d = g[r1 | c1]; return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
}
function blur_(A, w, h, r, passes) { const T = new Float32Array(A.length); for (let p = 0; p < passes; p++) { for (let y = 0; y < h; y++) { let s = 0; const row = y * w; for (let x = -r; x <= r; x++) s += A[row + clamp(x, 0, w - 1)]; for (let x = 0; x < w; x++) { T[row + x] = s / (2 * r + 1); s += A[row + Math.min(w - 1, x + r + 1)] - A[row + Math.max(0, x - r)]; } } for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += T[clamp(y, 0, h - 1) * w + x]; for (let y = 0; y < h; y++) { A[y * w + x] = s / (2 * r + 1); s += T[Math.min(h - 1, y + r + 1) * w + x] - T[Math.max(0, y - r) * w + x]; } } } return A; }
// vzdálenost k nejbližšímu bodu masky (dvouprůchodová chamfer transformace)
function chamfer_(seed, w, h) {
  const d = new Float32Array(w * h); for (let i = 0; i < d.length; i++) d[i] = seed[i] ? 0 : 1e6;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = y * w + x; let v = d[k]; if (x > 0) v = Math.min(v, d[k - 1] + 1); if (y > 0) { v = Math.min(v, d[k - w] + 1); if (x > 0) v = Math.min(v, d[k - w - 1] + 1.414); if (x < w - 1) v = Math.min(v, d[k - w + 1] + 1.414); } d[k] = v; }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const k = y * w + x; let v = d[k]; if (x < w - 1) v = Math.min(v, d[k + 1] + 1); if (y < h - 1) { v = Math.min(v, d[k + w] + 1); if (x < w - 1) v = Math.min(v, d[k + w + 1] + 1.414); if (x > 0) v = Math.min(v, d[k + w - 1] + 1.414); } d[k] = v; }
  return d;
}
let ELEV_ = null;
function elevGrid() { if (!ELEV_) { const b = atob(GEO.elev); ELEV_ = new Float32Array(b.length); for (let i = 0; i < b.length; i++) { const v = b.charCodeAt(i) / 255; ELEV_[i] = v * v * GEO.emax; } } return ELEV_; }
// nadmořská výška v metrech v bodě mapy (jednotky mapy)
function elevAt(x, y) {
  const E = elevGrid(), gx = clamp((x + GEO.pad) / GEO.cell - 0.5, 0, GEO.gw - 1.001), gy = clamp((y + GEO.pad) / GEO.cell - 0.5, 0, GEO.gh - 1.001), x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0, k = y0 * GEO.gw + x0;
  return (E[k] * (1 - fx) + E[k + 1] * fx) * (1 - fy) + (E[k + GEO.gw] * (1 - fx) + E[k + GEO.gw + 1] * fx) * fy;
}
// barvy výškových stupňů: nížiny do zelena, pahorkatiny okrové, hory šedohnědé, nad 2 600 m sníh
const HYPSO = [[0, 178, 190, 136], [120, 196, 200, 146], [300, 214, 206, 156], [550, 214, 194, 146], [900, 196, 172, 130], [1400, 172, 150, 120], [2000, 166, 154, 140], [2600, 214, 210, 204], [3200, 246, 244, 240]];
function hypso(h, out) { let i = 1; while (i < HYPSO.length - 1 && h > HYPSO[i][0]) i++; const a = HYPSO[i - 1], b = HYPSO[i], t = clamp((h - a[0]) / (b[0] - a[0]), 0, 1); out[0] = a[1] + (b[1] - a[1]) * t; out[1] = a[2] + (b[2] - a[2]) * t; out[2] = a[3] + (b[3] - a[3]) * t; }
function swapBlob(obj, mime) { // krátká adresa blob místo dlouhého data URL (když ji prohlížeč dovolí)
  try { const b = atob(obj.url.split(",")[1]), u8 = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u8[i] = b.charCodeAt(i); const u = URL.createObjectURL(new Blob([u8], { type: mime })), im = new Image(); im.onload = () => { if (obj.blob) URL.revokeObjectURL(obj.blob); obj.blob = obj.url = u; }; im.onerror = () => URL.revokeObjectURL(u); im.src = u; } catch (e) { /* zůstane data URL */ }
}
let BASE_ = null;
function baseMap() {
  if (BASE_) return BASE_;
  if (typeof document === "undefined") return null;
  const pad = GEO.pad, W = (MW + 2 * pad) * RQ, H = (MH + 2 * pad) * RQ, n = W * H, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d", { willReadFrequently: true }), X = lon => (MX(lon) + pad) * RQ, Y = lat => (MY(lat) + pad) * RQ;
  const trace = L => { ctx.beginPath(); for (let i = 0; i < L.length; i += 2) { if (i) ctx.lineTo(X(L[i]), Y(L[i + 1])); else ctx.moveTo(X(L[i]), Y(L[i + 1])); } };
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#fff"; for (const L of GEO.land) { trace(L); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = "#000"; for (const [, L] of GEO.lakes) { trace(L); ctx.closePath(); ctx.fill(); }
  const px = ctx.getImageData(0, 0, W, H).data, land = new Uint8Array(n), sea = new Uint8Array(n);
  for (let i = 0; i < n; i++) { land[i] = px[i * 4] > 127 ? 1 : 0; sea[i] = 1 - land[i]; }
  const toLand = chamfer_(land, W, H), toSea = chamfer_(sea, W, H), E = new Float32Array(n);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) E[y * W + x] = elevAt((x + 0.5) / RQ - pad, (y + 0.5) / RQ - pad);
  blur_(E, W, H, 2, 2);
  const img = ctx.createImageData(W, H), D = img.data, c = [0, 0, 0], grain = mkNoise_(7), wave = mkNoise_(23);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x, o = k * 4, g = (grain(x * 0.9, y * 0.9) - 0.5) * 9 + (grain(x * 0.11, y * 0.11) - 0.5) * 10;
    if (land[k]) {
      const xl = x > 0 ? k - 1 : k, xr = x < W - 1 ? k + 1 : k, yu = y > 0 ? k - W : k, yd = y < H - 1 ? k + W : k;
      const sl = (E[xr] - E[xl]) + (E[yd] - E[yu]), steep = Math.abs(E[xr] - E[xl]) + Math.abs(E[yd] - E[yu]);
      const sh = Math.tanh(sl / 70) * 0.34 + Math.tanh(sl / 9) * 0.07 - Math.min(0.12, steep / 900);
      hypso(E[k], c); const f = 1 + sh, ds = toSea[k];
      let r = c[0] * f + g, gg = c[1] * f + g, b = c[2] * f + g;
      if (ds < 2.2) { const t = 1 - ds / 2.2; r += (72 - r) * t * 0.8; gg += (54 - gg) * t * 0.8; b += (38 - b) * t * 0.8; }      // tušová linka pobřeží
      else if (ds < 9) { const t = (1 - ds / 9) * 0.22; r += (240 - r) * t; gg += (228 - gg) * t; b += (190 - b) * t; }               // světlý lem břehu
      D[o] = r; D[o + 1] = gg; D[o + 2] = b;
    } else {
      const d = toLand[k] + (wave(x * 0.05, y * 0.05) - 0.5) * 6, t = 1 - Math.exp(-Math.max(0, d) / 60);
      let r = 146 + (62 - 146) * t + g * 0.6, gg = 182 + (104 - 182) * t + g * 0.6, b = 190 + (134 - 190) * t + g * 0.6;
      if (d > 5 && d < 42 && d % 12 < 1.3) { const a = 0.34 * (1 - d / 42); r += (236 - r) * a; gg += (240 - gg) * a; b += (236 - b) * a; }  // vodní linky podél břehu jako na starých mapách
      D[o] = r; D[o + 1] = gg; D[o + 2] = b;
    }
    D[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  BASE_ = { url: cv.toDataURL("image/jpeg", 0.9), land, W, H, pad };
  swapBlob(BASE_, "image/jpeg");
  return BASE_;
}

// ---------- kraje: ke každému bodu nejbližší sídlo, hranice zvlněné šumem ----------
let PIDX_ = null;
function provIdx() {
  const ps = Object.values(S.provs);
  if (PIDX_ && PIDX_.ids.length === ps.length) return PIDX_;
  const B = baseMap(), w = MW * RQ, h = MH * RQ, idx = new Int16Array(w * h), n1 = mkNoise_(101), n2 = mkNoise_(202), CELL = 64, gw = Math.ceil(MW / CELL), gh = Math.ceil(MH / CELL), bk = Array.from({ length: gw * gh }, () => []);
  const sx = ps.map(p => MX(p.lon)), sy = ps.map(p => MY(p.lat));
  ps.forEach((p, i) => { const cx = clamp(Math.floor(sx[i] / CELL), 0, gw - 1), cy = clamp(Math.floor(sy[i] / CELL), 0, gh - 1); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = cx + dx, y = cy + dy; if (x >= 0 && y >= 0 && x < gw && y < gh) bk[y * gw + x].push(i); } });
  const off = B.pad * RQ, lim = 62 * 62;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x; if (!B.land[(y + off) * B.W + x + off]) { idx[k] = -2; continue; }
    const ux = (x + 0.5) / RQ, uy = (y + 0.5) / RQ, wx = ux + (n1(ux / 24, uy / 24) - 0.5) * 20 + (n2(ux / 7, uy / 7) - 0.5) * 5, wy = uy + (n1(ux / 24 + 40, uy / 24 + 17) - 0.5) * 20 + (n2(ux / 7 + 9, uy / 7 + 31) - 0.5) * 5;
    let best = -1, bd = lim; for (const i of bk[clamp(Math.floor(wy / CELL), 0, gh - 1) * gw + clamp(Math.floor(wx / CELL), 0, gw - 1)]) { const dx = sx[i] - wx, dy = sy[i] - wy, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
    idx[k] = best;
  }
  PIDX_ = { w, h, idx, ids: ps.map(p => p.id) }; return PIDX_;
}
let OVER_ = { key: null, url: "" };
function overlayMap(mode) {
  const key = mode + "|" + Object.values(S.provs).map(p => p.owner + (p.occ || "") + (mode === "spokoj" ? Math.round(p.loy / 10) : mode === "rozvoj" ? Math.round(dev(p) / 20) : mode === "jadra" ? p.cores.join() : mode === "vira" ? p.rel : "")).join(",") + (mode === "vztahy" ? S.turn : "") + "|" + me();
  if (OVER_.key === key) return OVER_.url;
  if (typeof document === "undefined") return "";
  const { w, h, idx, ids } = provIdx(), ps = ids.map(id => S.provs[id]), cols = ps.map(p => provColor(p, mode)), own = ps.map(p => p.owner), occ = ps.map(p => p.occ ? hexRgb(S.clans[p.occ].col) : null), n = w * h;
  const edge = new Uint8Array(n), pedge = new Uint8Array(n), realmMode = mode !== "teren";
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x, i = idx[k]; if (i < 0) continue;
    for (const j of [x > 0 ? idx[k - 1] : i, x < w - 1 ? idx[k + 1] : i, y > 0 ? idx[k - w] : i, y < h - 1 ? idx[k + w] : i]) { if (j === i) continue; if (j < 0) { edge[k] = Math.max(edge[k], 1); continue; } if (realmMode && own[j] !== own[i]) edge[k] = 2; else pedge[k] = 1; }
  }
  const dist = chamfer_(edge, w, h), cv = document.createElement("canvas"); cv.width = w; cv.height = h; const ctx = cv.getContext("2d"), img = ctx.createImageData(w, h), D = img.data;
  const inner = mode === "polit" ? 0.44 : 0.72;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x, i = idx[k], o = k * 4; if (i < 0) continue;
    let [c, a] = cols[i]; if (occ[i] && mode === "polit" && ((x + y) >> 3) % 2 === 0) c = occ[i];
    const d = dist[k], t = clamp(1 - d / 9, 0, 1), band = t * t;
    let r = c[0], g = c[1], b = c[2], al = a / 255 * inner * (1 - band) + 0.86 * band, dk = 1 - 0.22 * band;
    if (edge[k] === 2) { dk = 0.34; al = 0.96; }
    else if (pedge[k]) { dk = 0.5; al = Math.max(al, 0.6); }
    D[o] = r * dk; D[o + 1] = g * dk; D[o + 2] = b * dk; D[o + 3] = al * 255;
  }
  ctx.putImageData(img, 0, 0);
  if (OVER_.blob) URL.revokeObjectURL(OVER_.blob);
  OVER_ = { key, url: cv.toDataURL() }; swapBlob(OVER_, "image/png");
  return OVER_.url;
}

// ---------- značky a popisky ----------
const ll = ([lo, la]) => `${MX(lo).toFixed(1)},${MY(la).toFixed(1)}`;
// kartografické značky sídel: sídlo rodu (hrad s praporcem), město (hradby s branou), hrad (věž), ves (kroužek)
const MARK = {
  cap: '<path d="M-6.5 4 V-2 h2.2 v1.6 h1.8 V-5.5 h1.1 v1.2 h1.1 v-1.2 h1.1 v1.2 h1.1 v-1.2 h1.1 V-.4 h1.8 V-2 H6.5 V4z" class="mcap"/><path d="M-1.2 4 v-2.4 a1.2 1.2 0 0 1 2.4 0 V4z" class="mgate"/><path d="M0 -5.5 v-4.2" class="mpole"/><path d="M0 -9.7 l4.2 1.3 l-4.2 1.3z" class="mflag"/>',
  town: '<path d="M-5.5 4 V-2.6 h1 v1 h1 v-1 h1 V-.6 h5 V-2.6 h1 v1 h1 v-1 h1 V4z" class="mtown"/><path d="M-1.1 4 v-2 a1.1 1.1 0 0 1 2.2 0 V4z" class="mgate"/>',
  keep: '<path d="M-2.8 4 V-3.4 h1.2 v1.1 h1 v-1.1 h1.2 v1.1 h1 v-1.1 h1.2 V4z" class="mtown"/>',
  ves: '<circle r="2" class="mves"/>',
};
// řeky jako křivky nad barvou území (ostré i při přiblížení); šířka podle významu toku v datech Natural Earth
let RIVSVG_ = null;
function riversSvg() {
  if (RIVSVG_) return RIVSVG_;
  const cls = [[4, 1.5], [6, 1.2], [7, 0.9], [9, 0.62], [10, 0.42], [99, 0.3]], d = cls.map(() => "");
  for (const [, rank, L] of GEO.rivers) { const i = cls.findIndex(c => rank <= c[0]); let q = ""; for (let j = 0; j < L.length; j += 2) q += (j ? "L" : "M") + MX(L[j]).toFixed(1) + " " + MY(L[j + 1]).toFixed(1); d[i] += q; }
  RIVSVG_ = `<g class="rivers" pointer-events="none">${cls.map((c, i) => `<path d="${d[i]}" class="rivo" style="stroke-width:${(c[1] + 0.5).toFixed(2)}px;opacity:${i > 3 ? 0.5 : 1}"/>`).join("")}${cls.map((c, i) => `<path d="${d[i]}" class="riv" style="stroke-width:${c[1]}px;opacity:${i > 3 ? 0.75 : 1}"/>`).join("")}</g>`;
  return RIVSVG_;
}
let RLBL_ = null;
function riverLabels() {
  if (RLBL_) return RLBL_; RLBL_ = [];
  const best = {}; for (const [n, rank, L] of GEO.rivers) { if (!n || rank > 7) continue; if (!best[n] || L.length > best[n][1].length) best[n] = [rank, L]; }
  for (const [n, [rank, L]] of Object.entries(best)) { const i = Math.floor(L.length / 4) * 2, j = Math.min(L.length - 2, i + 2), x = MX(L[i]), y = MY(L[i + 1]); if (x < 20 || y < 20 || x > MW - 20 || y > MH - 20) continue; let ang = Math.atan2(MY(L[j + 1]) - y, MX(L[j]) - x) * 180 / Math.PI; if (ang > 90) ang -= 180; if (ang < -90) ang += 180; RLBL_.push([n, rank, x, y, ang]); }
  return RLBL_;
}
function compassRose(x, y, r) {
  let o = `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" class="rose" pointer-events="none"><circle r="${r}" class="rr"/><circle r="${r * 0.72}" class="rr2"/>`;
  for (let i = 0; i < 8; i++) { const a = i * 45, L = i % 2 ? r * 0.62 : r * 1.18; o += `<g transform="rotate(${a})"><path d="M0 ${-L} L${r * 0.16} 0 L0 0z" class="rd"/><path d="M0 ${-L} L${-r * 0.16} 0 L0 0z" class="rl"/></g>`; }
  return o + `<path d="M0 ${-r * 1.62} l${r * 0.14} ${r * 0.22} h${-r * 0.28}z" class="rn"/><text y="${-r * 1.72}" text-anchor="middle" class="rt" style="font-size:${(r * 0.5).toFixed(1)}px">S</text><circle r="${r * 0.1}" class="rc"/></g>`;
}
function compassRoseSvg() { return `<svg viewBox="-24 -26 48 50" width="84" height="88" class="map eu rosebig" aria-hidden="true">${compassRose(0, 2, 12)}</svg>`; }
// koga – obchodní loď hanzy 13. století (jeden stěžeň, čtvercová plachta, nástavby na přídi a zádi)
function cogShip(x, y, k) { return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k})" class="cog" pointer-events="none"><path d="M-9 0 q1 5 5 5 h8 q4 0 5 -5 l-2 0 v-2 h-3 v2 h-8 v-1.5 h-3 v1.5z" class="ch"/><path d="M0 0 V-11" class="cm"/><path d="M-5 -9.5 q5 2 10 0 v6.5 q-5 2 -10 0z" class="cs"/><path d="M0 -11 l3 -.8 l-3 -.8" class="cf"/><path d="M-12 6.5 q3 -1.6 6 0 t6 0 t6 0 t6 0" class="cw"/></g>`; }
function mapDecor(z, mode) {
  const k = Math.max(0.55, z); let o = "";
  if (mode === "polit" || mode === "teren") for (const p of Object.values(S.provs)) if (p.ter === "l" || p.ter === "b") { const x = MX(p.lon), y = MY(p.lat); for (const [dx, dy] of [[-12, 8], [10, 10], [-4, 14]]) o += p.ter === "l" ? `<path d="M${x + dx} ${y + dy} l2 -5 l2 5z M${x + dx + 2} ${y + dy} v1.6" class="tree"/>` : `<path d="M${x + dx} ${y + dy} h6 M${x + dx + 1} ${y + dy + 2} h4 M${x + dx + 3} ${y + dy} v-3 M${x + dx + 1.4} ${y + dy} l-.8 -2.4 M${x + dx + 4.6} ${y + dy} l.8 -2.4" class="marsh"/>`; }
  for (const [n, pts] of RANGES) { const a = pts[Math.floor((pts.length - 1) / 2)], b = pts[Math.min(pts.length - 1, Math.floor((pts.length - 1) / 2) + 1)], x = (MX(a[0]) + MX(b[0])) / 2, y = (MY(a[1]) + MY(b[1])) / 2; let ang = Math.atan2(MY(b[1]) - MY(a[1]), MX(b[0]) - MX(a[0])) * 180 / Math.PI; if (ang > 90) ang -= 180; if (ang < -90) ang += 180; o += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" transform="rotate(${ang.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" class="rangelbl" text-anchor="middle" style="font-size:${(9 * k).toFixed(1)}px">${esc(n)}</text>`; }
  for (const [n, rank, x, y, ang] of riverLabels()) if (rank <= 5 || z < 0.62) o += `<text x="${x.toFixed(1)}" y="${(y - 2 * k).toFixed(1)}" transform="rotate(${ang.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" class="riverlbl" text-anchor="middle" style="font-size:${((rank <= 5 ? 6.6 : 5.6) * k).toFixed(1)}px">${esc(n)}</text>`;
  o += `<text x="${MX(16.9)}" y="${MY(54.93)}" class="sealbl" text-anchor="middle" style="font-size:${(11 * k).toFixed(1)}px">Baltské moře</text><text x="${MX(7.2)}" y="${MY(54.55)}" class="sealbl" text-anchor="middle" style="font-size:${(8 * k).toFixed(1)}px">Severní moře</text>`;
  o += compassRose(MX(14.75), MY(54.62), 11) + cogShip(MX(19.28), MY(54.6), 0.9) + cogShip(MX(11.75), MY(54.36), 0.7);
  return o;
}
function mapDyn() {
  const v = SEL.view, z = v.w / MW, mode = SEL.mode || "polit", ps = Object.values(S.provs), k = Math.max(0.55, z);
  let nodes = "", labels = "", names = "", arm = "", arrows = "", routes = "";
  for (const c of aliveClans(S)) { const cp = clanProvs(S, c.id); if (cp.length < 2) continue; const x = sum(cp.map(p => MX(p.lon))) / cp.length, y = sum(cp.map(p => MY(p.lat))) / cp.length; const fs = clamp(5 + Math.sqrt(cp.length) * 3.2, 7, 20) * Math.max(0.55, z); names += `<text x="${x.toFixed(0)}" y="${y.toFixed(0)}" class="realmname" style="font-size:${fs.toFixed(1)}px;stroke-width:${(fs * 0.16).toFixed(1)}px" text-anchor="middle">${esc(mapName(c))}</text>`; }
  for (const p of ps) {
    const x = MX(p.lon), y = MY(p.lat), C = S.clans[p.owner], selp = p.id === SEL.prov, capf = C.capital === p.id, kind = capf ? "cap" : p.city || (p.b && p.b.mesto) ? "town" : p.castle >= 2 ? "keep" : "ves", mine = p.owner === me(), war = atWar(S, me(), p.owner);
    nodes += `<g class="pv${selp ? " sel" : ""}${mine ? " mine" : ""}${war ? " war" : ""}" data-a="prov" data-x='["${p.id}"]'><title>${esc(p.n)} – ${esc(C.house)}${p.occ ? `, obsazeno: ${esc(S.clans[p.occ].house)}` : ""}</title><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(12 * Math.max(0.5, z)).toFixed(1)}" class="hit"/>${selp ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(13 * Math.max(0.5, z)).toFixed(1)}" class="selring"/>` : ""}${p.siege ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(9 * k).toFixed(1)}" class="siege"/>` : ""}<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(k * (capf ? 1 : 0.86)).toFixed(2)})" class="mk"${capf ? ` style="--fc:${C.col}"` : ""}>${MARK[kind]}</g></g>`;
    if (z < 0.7 || p.v >= 4 || selp || capf) labels += `<text x="${(x + (capf ? 8 : 6) * k).toFixed(1)}" y="${(y + 3 * k).toFixed(1)}" class="lbl${capf ? " cap" : ""}" style="font-size:${((capf ? 9.4 : 8.2) * Math.max(0.45, z)).toFixed(2)}px;stroke-width:${(2.4 * Math.max(0.45, z)).toFixed(2)}px">${esc(p.n.split(" a ")[0].replace("Vídeňské Nové Město", "Vídeň. N. Město").replace("Vladimir Volyňský", "Vladimir"))}</text>`;
  }
  if (mode === "obchod" || SEL.routes) for (const R of ROUTES) routes += `<polyline points="${R.provs.map(id => `${MX(S.provs[id].lon).toFixed(1)},${MY(S.provs[id].lat).toFixed(1)}`).join(" ")}" class="route${routeState(S, R) < 0.6 ? " cut" : ""}" stroke="${R.col}" style="stroke-width:${(3.5 * Math.max(0.5, z)).toFixed(1)}"><title>${esc(R.n)} – průchodnost ${Math.round(routeState(S, R) * 100)} %</title></polyline>`;
  const byLoc = {};
  for (const a of S.armies) { const own = a.cl === me(); if (!own && !knows(S, S.provs[a.loc])) continue; (byLoc[a.loc] = byLoc[a.loc] || []).push(a);
    if (a.path && a.path.length && (own || atWar(S, me(), a.cl))) arrows += `<polyline points="${[a.loc, ...a.path].map(id => `${MX(S.provs[id].lon).toFixed(1)},${MY(S.provs[id].lat).toFixed(1)}`).join(" ")}" class="march ${own ? "own" : "foe"}" style="stroke-width:${(2.4 * Math.max(0.5, z)).toFixed(1)}" marker-end="url(#${own ? "arO" : "arF"})"/>`; }
  for (const [loc, list] of Object.entries(byLoc)) list.forEach((a, i) => { const p = S.provs[loc], own = a.cl === me(), x = MX(p.lon) - 13 * k + i * 5 * k, y = MY(p.lat) - 21 * k - i * 4 * k, n = men(a.t), txt = n >= 1000 ? r1(n / 1000) + "k" : String(Math.round(n / 100) * 100);
    arm += `<g class="atok${own ? " own" : ""}${SEL.armySel === a.id ? " sel" : ""}${atWar(S, me(), a.cl) ? " foe" : ""}" data-a="${own ? "selArmy" : "prov"}" data-x='["${own ? a.id : loc}"]' transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k.toFixed(2)})"><title>${esc(S.clans[a.cl].house)}: ${fmt(n)} mužů${a.cmds.length ? ", " + esc(chr(S, a.cmds[0]).n) : ""}</title><path d="M0 -1 V17" class="apole"/><path d="M0 0 h27 l-4 5.5 l4 5.5 h-27z" fill="${S.clans[a.cl].col}" class="aflag"/><rect width="23" height="1.6" y="9.4" class="mor" style="width:${(clamp(a.morale, 0, 100) * 0.23).toFixed(1)}px"/><text x="11.5" y="7.6" text-anchor="middle">${txt}</text></g>`; });
  return `${mapDecor(z, mode)}${routes}${names}${nodes}${plagueIcons(z)}${arrows}${arm}${labels}`;
}
function mapView() {
  if (!SEL.view) SEL.view = { x: 0, y: 0, w: MW, h: MH };
  const v = SEL.view, mode = SEL.mode || "polit", B = baseMap(), pad = GEO.pad;
  return `<svg id="msvg" viewBox="${v.x.toFixed(1)} ${v.y.toFixed(1)} ${v.w.toFixed(1)} ${v.h.toFixed(1)}" class="map eu" role="img" aria-label="Mapa střední Evropy">
    <defs><marker id="arO" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" class="mo"/></marker><marker id="arF" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" class="mf"/></marker>
    <pattern id="snowp" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r="1" fill="#fff"/><circle cx="10" cy="10" r="1.3" fill="#fff"/></pattern></defs>
    <rect x="-200" y="-200" width="${MW + 400}" height="${MH + 400}" class="sea"/>${B ? `<image href="${B.url}" x="${-pad}" y="${-pad}" width="${MW + 2 * pad}" height="${MH + 2 * pad}" preserveAspectRatio="none"/>` : ""}<image href="${overlayMap(mode)}" width="${MW}" height="${MH}" preserveAspectRatio="none" class="terr"/>${riversSvg()}${seasonOverlay()}${weatherOverlay()}<g id="mdyn">${mapDyn()}</g></svg>
    <div class="mmodes">${MAPMODES.map(([k, n]) => btn(n, "mode", [k], null, mode === k ? "on" : "")).join("")}${mode !== "obchod" ? btn(SEL.routes ? "Cesty ✓" : "Cesty", "routes", [], null, SEL.routes ? "on" : "") : ""}</div>
    <div class="zoom">${btn("+", "zoom", [0.7])}${btn("−", "zoom", [1.4])}${btn("⌂", "zoomReset")}</div>${mapLegend(mode)}
    <div class="mapsrc" title="Pobřeží, řeky a jezera: Natural Earth 1 : 10 mil. Výšky: model Terrarium (SRTM, GMTED2010). Je to dnešní pobřeží a dnešní toky. Hranice krajů jsou herní.">podklad: Natural Earth, SRTM</div>`;
}
