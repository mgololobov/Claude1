// Reliéfní mapa: podklad se jednou spočítá do rastru (stínovaný terén pouští a hor, zelená niva Nilu a Delty,
// moře s mělčinami), území rodů jsou jen tónem a hranicí nad ním a sídla mají kartografické značky.
// Terén je schematický (šum + hřeben hor podél Rudého moře, jižní Sinaj, Kattarská proláklina, Gilf Kebír), ne měřená výška.

// ---------- šum a pomocné funkce ----------
function mkNoise_(seed) {
  const g = new Float32Array(65536); let s = seed >>> 0;
  for (let i = 0; i < 65536; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; g[i] = s / 4294967296; }
  return (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), r0 = (yi & 255) << 8, r1 = ((yi + 1) & 255) << 8, c0 = xi & 255, c1 = (xi + 1) & 255, a = g[r0 | c0], b = g[r0 | c1], c = g[r1 | c0], d = g[r1 | c1]; return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
}
const ss_ = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
// hladká křivka procházející všemi body (Catmull–Rom), aby tok řeky nebyl lomená čára
const SMC_ = new Map();
function smooth_(L, n = 5) {
  if (SMC_.has(L)) return SMC_.get(L);
  const out = [], P = i => L[clamp(i, 0, L.length - 1)];
  for (let i = 0; i < L.length - 1; i++) { const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2); for (let j = 0; j < n; j++) { const t = j / n, t2 = t * t, t3 = t2 * t; out.push([0, 1].map(k => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3))); } }
  out.push(L[L.length - 1]); SMC_.set(L, out); return out;
}
const polyPx_ = L => smooth_(L).map(([la, lo]) => [MX(lo), MY(la)]);
function blur_(A, w, h, r, passes) { const T = new Float32Array(A.length); for (let p = 0; p < passes; p++) { for (let y = 0; y < h; y++) { let s = 0; const row = y * w; for (let x = -r; x <= r; x++) s += A[row + clamp(x, 0, w - 1)]; for (let x = 0; x < w; x++) { T[row + x] = s / (2 * r + 1); s += A[row + Math.min(w - 1, x + r + 1)] - A[row + Math.max(0, x - r)]; } } for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += T[clamp(y, 0, h - 1) * w + x]; for (let y = 0; y < h; y++) { A[y * w + x] = s / (2 * r + 1); s += T[Math.min(h - 1, y + r + 1) * w + x] - T[Math.max(0, y - r) * w + x]; } } } return A; }
function distLine_(px, py, P, closed) {
  let m = 1e9; const n = P.length;
  for (let i = 0; i < (closed ? n : n - 1); i++) { const a = P[i], b = P[(i + 1) % n], vx = b[0] - a[0], vy = b[1] - a[1], l2 = vx * vx + vy * vy, t = l2 ? clamp(((px - a[0]) * vx + (py - a[1]) * vy) / l2, 0, 1) : 0, dx = px - a[0] - vx * t, dy = py - a[1] - vy * t, d = dx * dx + dy * dy; if (d < m) m = d; }
  return Math.sqrt(m);
}
function inPoly_(px, py, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > py) !== (b[1] > py) && px < (b[0] - a[0]) * (py - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
// šířka nivy (půlšířka v jednotkách mapy) podle zeměpisné šířky: v Núbii úzký proužek, ve středním Egyptě nejširší
const VW_ = [[19, 1.3], [22, 1.5], [24.1, 2.0], [25.2, 3.2], [26, 4.4], [27.2, 5.4], [29.6, 5.8], [30.2, 6.2]];
function valleyW(lat) { for (let i = 1; i < VW_.length; i++) if (lat <= VW_[i][0]) { const [a, wa] = VW_[i - 1], [b, wb] = VW_[i]; return wa + (wb - wa) * clamp((lat - a) / (b - a), 0, 1); } return 6.2; }

let FIELDS_ = null;
// vzdálenost k nejbližšímu bodu masky (dvouprůchodová chamfer transformace 3-4, výsledek v jednotkách mapy)
function chamfer_(seed, w, h) {
  const d = new Float32Array(w * h); for (let i = 0; i < d.length; i++) d[i] = seed[i] ? 0 : 1e6;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = y * w + x; let v = d[k]; if (x > 0) v = Math.min(v, d[k - 1] + 1); if (y > 0) { v = Math.min(v, d[k - w] + 1); if (x > 0) v = Math.min(v, d[k - w - 1] + 1.414); if (x < w - 1) v = Math.min(v, d[k - w + 1] + 1.414); } d[k] = v; }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const k = y * w + x; let v = d[k]; if (x < w - 1) v = Math.min(v, d[k + 1] + 1); if (y < h - 1) { v = Math.min(v, d[k + w] + 1); if (x < w - 1) v = Math.min(v, d[k + w + 1] + 1.414); if (x > 0) v = Math.min(v, d[k + w - 1] + 1.414); } d[k] = v; }
  return d;
}
function baseFields() {
  if (FIELDS_) return FIELDS_;
  const Q = 2, w = MW, h = MH, n = w * h, dN = new Float32Array(n), dB = new Float32Array(n), sdF = new Float32Array(n), dC = new Float32Array(n), dR = new Float32Array(n);
  // maska pevniny ze skutečného pobřeží, vykreslená ve dvojnásobném rozlišení
  const cw = w * Q, ch = h * Q, cv = document.createElement("canvas"); cv.width = cw; cv.height = ch; const ctx = cv.getContext("2d");
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, cw, ch); ctx.fillStyle = "#fff"; ctx.beginPath();
  for (const P of COAST_) { P.forEach(([la, lo], i) => { const x = MX(lo) * Q, y = MY(la) * Q; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.closePath(); }
  ctx.fill("evenodd");
  const px = ctx.getImageData(0, 0, cw, ch).data, land = new Uint8Array(cw * ch), sea = new Uint8Array(cw * ch), red = new Uint8Array(cw * ch);
  const redLat = MY(30.35) * Q, redLon = MX(32.0) * Q;
  for (let i = 0; i < cw * ch; i++) { const l = px[i * 4] > 127; land[i] = l ? 1 : 0; sea[i] = l ? 0 : 1; if (!l && ((i / cw) | 0) > redLat && i % cw > redLon) red[i] = 1; }
  const toSea = chamfer_(sea, cw, ch), toLand = chamfer_(land, cw, ch), toRed = chamfer_(red, cw, ch);
  const nile = [NILE, NILE_W, NILE_E, NILE_M].map(polyPx_), bahr = polyPx_(BAHR), fan = DELTA_FAN.map(([la, lo]) => [MX(lo), MY(la)]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x, pxx = x + 0.5, pyy = y + 0.5, q = (y * Q + 1) * cw + x * Q + 1;
    let d = 1e9; for (const L of nile) d = Math.min(d, distLine_(pxx, pyy, L)); dN[k] = d;
    dB[k] = distLine_(pxx, pyy, bahr);
    const df = distLine_(pxx, pyy, fan, true); sdF[k] = inPoly_(pxx, pyy, fan) ? -df : df;
    dC[k] = land[q] ? toSea[q] / Q : -toLand[q] / Q; dR[k] = toRed[q] / Q;
  }
  const dC2 = new Float32Array(cw * ch); for (let i = 0; i < cw * ch; i++) dC2[i] = land[i] ? toSea[i] / Q : -toLand[i] / Q;
  const dep = blur_(Float32Array.from(toLand), cw, ch, 4, 3);
  FIELDS_ = { w, h, dN, dB, sdF, dC, dR, dC2, dep, cw, ch, Q }; return FIELDS_;
}
// ---------- podkladový rastr ----------
var BASE_ = { url: "", busy: false, K: 0 };
function buildBase() {
  const F = baseFields(), K = (typeof innerWidth !== "undefined" && innerWidth < 760) ? 2 : 3, w = MW * K, h = MH * K, fw = F.w, fh = F.h;
  const E = new Float32Array(w * h), GR = new Float32Array(w * h), SEA = new Float32Array(w * h), RK = new Float32Array(w * h), LO = new Float32Array(w * h);
  const n1 = mkNoise_(11), n2 = mkNoise_(23), n3 = mkNoise_(47);
  const fbm = (nf, x, y, o) => { let a = 0, f = 1, s = 0, amp = 1; for (let i = 0; i < o; i++) { a += nf(x * f + i * 17.3, y * f + i * 9.1) * amp; s += amp; amp *= 0.5; f *= 2; } return a / s; };
  const samp = (A, X, Y) => { const x = clamp(X - 0.5, 0, fw - 1.001), y = clamp(Y - 0.5, 0, fh - 1.001), xi = x | 0, yi = y | 0, fx = x - xi, fy = y - yi, k = yi * fw + xi; return A[k] * (1 - fx) * (1 - fy) + A[k + 1] * fx * (1 - fy) + A[k + fw] * (1 - fx) * fy + A[k + fw + 1] * fx * fy; };
  const QQ = F.Q, cw2 = F.cw, ch2 = F.ch, C2 = F.dC2, samp2 = (X, Y) => { const x = clamp(X * QQ - 0.5, 0, cw2 - 1.001), y = clamp(Y * QQ - 0.5, 0, ch2 - 1.001), xi = x | 0, yi = y | 0, fx = x - xi, fy = y - yi, k = yi * cw2 + xi; return C2[k] * (1 - fx) * (1 - fy) + C2[k + 1] * fx * (1 - fy) + C2[k + cw2] * (1 - fx) * fy + C2[k + cw2 + 1] * fx * fy; };
  const DP = F.dep, sampD = (X, Y) => { const x = clamp(X * QQ - 0.5, 0, cw2 - 1.001), y = clamp(Y * QQ - 0.5, 0, ch2 - 1.001), xi = x | 0, yi = y | 0, fx = x - xi, fy = y - yi, k = yi * cw2 + xi; return DP[k] * (1 - fx) * (1 - fy) + DP[k + 1] * fx * (1 - fy) + DP[k + cw2] * (1 - fx) * fy + DP[k + cw2 + 1] * fx * fy; };
  const fx0 = MX(30.8), fy0 = MY(29.35), qx = MX(27.6), qy = MY(30.0), gx = MX(25.9), gy = MY(23.4), oas = Object.values(S.provs || {}).filter(p => p.ter === "oaza").map(p => [MX(p.lon), MY(p.lat), 7, 4.5]).concat([[MX(27.97), MY(27.06), 4, 3]]);
  for (let y = 0; y < h; y++) {
    const Y = (y + 0.5) / K, lat = MAPV.lat1 - Y / MAPV.ky, wv0 = valleyW(lat);
    for (let x = 0; x < w; x++) {
      const i = y * w + x, X = (x + 0.5) / K, lon = MAPV.lon0 + X / MAPV.kx, dc = samp2(X, Y);
      const low = fbm(n1, X / 70, Y / 70, 3); LO[i] = low;
      if (dc < 0) { SEA[i] = Math.max(0.3, sampD(X, Y) / QQ); continue; }
      const dn = samp(F.dN, X, Y), dr = samp(F.dR, X, Y), mid = fbm(n2, X / 11, Y / 11, 4), wv = wv0 * (0.72 + 0.56 * n1(X / 9 + 40, Y / 9));
      let g = ss_(wv + 0.8, wv - 0.5, dn);
      g = Math.max(g, ss_(1.2, -0.6, samp(F.sdF, X, Y) + (mid - 0.5) * 5));
      if (lat > 27.75 && lat < 29.4) g = Math.max(g, ss_(2.8, 1.5, samp(F.dB, X, Y)));
      { const ex = (X - fx0) / 13, ey = (Y - fy0) / 8; g = Math.max(g, ss_(1.12, 0.86, Math.sqrt(ex * ex + ey * ey) + (mid - 0.5) * 0.5)); }
      for (const [ox, oy, rx, ry] of oas) { const ex = (X - ox) / rx, ey = (Y - oy) / ry, d2 = ex * ex + ey * ey; if (d2 < 4) g = Math.max(g, 0.8 * ss_(1.25, 0.5, Math.sqrt(d2) + (mid - 0.5) * 1.6)); }
      const rid = 1 - Math.abs(2 * mid - 1), ridge = Math.exp(-(((dr - 36) / 24) ** 2)) * ss_(30.1, 28.9, lat), east = ss_(31.6, 33, lon), south = ss_(24.6, 22, lat);
      let e = 0.30 * low + 0.5 * ridge * (0.5 + 0.95 * rid) + (0.05 + 0.10 * east + 0.09 * south) * rid + 0.10 * ss_(wv, wv + 5, dn);
      { const ax = (X - qx) / 54, ay = (Y - qy) / 30; e -= 0.2 * Math.exp(-(ax * ax + ay * ay)); const bx = (X - gx) / 27, by = (Y - gy) / 36; e += 0.25 * Math.exp(-(bx * bx + by * by)) * (0.6 + 0.8 * rid); }
      const dm = ss_(27.9, 26.6, lon) * ss_(29.4, 28.4, lat) * ss_(23.0, 24.2, lat); if (dm > 0) e += 0.011 * dm * (0.3 + n1(X / 23 + 7, Y / 31)) * Math.sin((X * 0.97 + Y * 0.22) * (1.1 + 0.5 * n1(X / 60, Y / 60 + 3)) + mid * 5);
      E[i] = e * (1 - g) + 0.04 * g; GR[i] = g; RK[i] = clamp(ridge * 0.95 + rid * 0.22 * east + 0.3 * south * rid, 0, 1);
    }
  }
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const ctx = cv.getContext("2d"), img = ctx.createImageData(w, h), D = img.data, sh = 5.2 * K;
  const lx = MX(30.62), ly = MY(29.47);
  for (let y = 0; y < h; y++) {
    const Y = (y + 0.5) / K, lat = MAPV.lat1 - Y / MAPV.ky, south = ss_(24.8, 21.5, lat);
    for (let x = 0; x < w; x++) {
      const i = y * w + x, o = i * 4, X = (x + 0.5) / K, low = LO[i], fine = n3(x / 2.3, y / 2.3);
      let r, g, b;
      if (SEA[i] > 0) { const t = Math.pow(clamp(SEA[i] / 34, 0, 1), 0.55), v = 0.94 + 0.12 * low; r = (104 + (26 - 104) * t) * v; g = (156 + (66 - 156) * t) * v; b = (172 + (106 - 172) * t) * v; }
      else {
        const gr = GR[i], rk = RK[i];
        r = 232 + (207 - 232) * low; g = 211 + (178 - 211) * low; b = 168 + (128 - 168) * low;
        r += (203 - r) * south * 0.6; g += (156 - g) * south * 0.6; b += (108 - b) * south * 0.6;
        r += (150 - r) * rk; g += (124 - g) * rk; b += (100 - b) * rk;
        if (gr > 0) { const m = fbm(n2, X / 5, Y / 5, 2), gr2 = [108 + (60 - 108) * m, 132 + (98 - 132) * m, 66 + (50 - 66) * m]; r += (gr2[0] - r) * gr; g += (gr2[1] - g) * gr; b += (gr2[2] - b) * gr; }
        const xm = x > 0 ? i - 1 : i, xp = x < w - 1 ? i + 1 : i, ym = y > 0 ? i - w : i, yp = y < h - 1 ? i + w : i;
        const lum = 1 + clamp(((E[xp] - E[xm]) + (E[yp] - E[ym])) * sh, -0.34, 0.3) + (fine - 0.5) * (0.05 + 0.05 * gr);
        r *= lum; g *= lum; b *= lum;
        const ex = (X - lx) / 10, ey = (Y - ly) / 3.4; if (ex * ex + ey * ey < 1) { r = 62; g = 112; b = 146; }
      }
      D[o] = r; D[o + 1] = g; D[o + 2] = b; D[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const url = cv.toDataURL("image/jpeg", 0.9); BASE_.url = url; BASE_.K = K;
  try { // adresa blob: je pro překreslování lehčí; když ji prohlížeč nepovolí, zůstane data:
    const bin = atob(url.split(",")[1]), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const bu = URL.createObjectURL(new Blob([u8], { type: "image/jpeg" })), im = new Image(); im.onload = () => { BASE_.url = bu; MAPC.k = null; }; im.src = bu;
  } catch (e) {}
}
function baseUrl() {
  if (BASE_.url || typeof document === "undefined") return BASE_.url;
  if (!BASE_.busy) { BASE_.busy = true; setTimeout(() => { try { buildBase(); } catch (e) { console.error(e); } MAPC.k = null; TERR3.key = null; render(); }, 40); }
  return "";
}
// ---------- území ----------
let GEO3 = null, TERR3 = { key: null, url: null };
function geoReal() {
  if (GEO3) return GEO3;
  const F = baseFields(), T = 2, w = MW * T, h = MH * T, ps = Object.values(S.provs), n = ps.length, idx = new Int16Array(w * h).fill(-1);
  const px = ps.map(p => MX(p.lon)), py = ps.map(p => MY(p.lat)), kind = ps.map(p => (p.ter === "delta" ? 1 : p.ter === "fajjum" ? 2 : TERRAIN[p.ter].nile ? 0 : p.ter === "oaza" ? 3 : 4)), rad = kind.map(k => (k === 3 ? 13 : k === 4 ? 30 : 34));
  const fx0 = MX(30.8), fy0 = MY(29.35);
  for (let y = 0; y < h; y++) {
    const Y = (y + 0.5) / T, lat = MAPV.lat1 - Y / MAPV.ky, wv = valleyW(lat) + 4.5, fy = Math.min(F.h - 1, Y | 0);
    for (let x = 0; x < w; x++) {
      const X = (x + 0.5) / T, fk = fy * F.w + Math.min(F.w - 1, X | 0); if (F.dC[fk] < 0.6) continue;
      const jx = X + Math.sin(Y * 0.23) * 1.5 + Math.sin(Y * 0.071 + X * 0.05) * 2.4, jy = Y + Math.cos(X * 0.2) * 1.5 + Math.cos(X * 0.062 - Y * 0.04) * 2.4;
      let best = -1, bd = 1, raw = 0;
      for (let i = 0; i < n; i++) { const dx = px[i] - jx, dy = py[i] - jy, dd = dx * dx + dy * dy, d2 = dd / (rad[i] * rad[i]); if (d2 < bd) { bd = d2; best = i; raw = dd; } }
      if (best < 0) continue;
      const k = kind[best];
      if (raw > 64) {
        if (k === 0 && F.dN[fk] > wv) continue;
        if (k === 1 && F.sdF[fk] > 3 && F.dN[fk] > 5) continue;
        if (k === 2) { const ex = (X - fx0) / 17, ey = (Y - fy0) / 11; if (ex * ex + ey * ey > 1 && F.dN[fk] > wv && F.dB[fk] > 5) continue; }
      }
      idx[y * w + x] = best;
    }
  }
  GEO3 = { w, h, idx, ids: ps.map(p => p.id) }; return GEO3;
}
const RING_ = [1, 2, 4, 6].flatMap(r => [[r, 0], [-r, 0], [0, r], [0, -r], [r * 0.7 | 0 || 1, r * 0.7 | 0 || 1], [-(r * 0.7 | 0 || 1), r * 0.7 | 0 || 1], [r * 0.7 | 0 || 1, -(r * 0.7 | 0 || 1)], [-(r * 0.7 | 0 || 1), -(r * 0.7 | 0 || 1)]].map(([dx, dy]) => [dx, dy, r]));
function terrReal(mode) {
  if (typeof document === "undefined") return "";
  const G = geoReal(), ps = G.ids.map(id => S.provs[id]), cols = ps.map(p => modeColor(p, mode)), own = ps.map(p => p.owner);
  const key = mode + "|" + cols.map(c => c ? c.join(".") : "-").join(",") + "|" + own.join(",") + "|" + me();
  if (TERR3.key === key && TERR3.url) return TERR3.url;
  const { w, h, idx } = G, cv = document.createElement("canvas"); cv.width = w; cv.height = h; const ctx = cv.getContext("2d"), img = ctx.createImageData(w, h), D = img.data;
  const rgb = {}; for (const C of Object.values(S.clans)) rgb[C.id] = hexRgb(C.col);
  const polit = mode === "polit", my = me();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x, i = idx[k]; if (i < 0) continue; const o = k * 4, oi = own[i];
    let realm = 9, wild = 9, prov = false;
    for (const [dx, dy, r] of RING_) { if (r >= realm && r >= wild && (prov || r > 1)) continue; const xx = x + dx, yy = y + dy, j = xx < 0 || yy < 0 || xx >= w || yy >= h ? -1 : idx[yy * w + xx]; if (j === i) continue; if (j < 0) { if (r < wild) wild = r; } else if (own[j] !== oi) { if (r < realm) realm = r; } else if (r === 1) prov = true; }
    const c = cols[i], cr = rgb[oi] || [120, 120, 120];
    if (polit) {
      if (realm <= 2) { D[o] = cr[0] * 0.38; D[o + 1] = cr[1] * 0.38; D[o + 2] = cr[2] * 0.38; D[o + 3] = 240; }
      else if (wild <= 1) { D[o] = cr[0] * 0.45; D[o + 1] = cr[1] * 0.45; D[o + 2] = cr[2] * 0.45; D[o + 3] = 215; }
      else if (prov) { D[o] = cr[0] * 0.5; D[o + 1] = cr[1] * 0.5; D[o + 2] = cr[2] * 0.5; D[o + 3] = 120; }
      else { const band = realm <= 4 ? 190 : realm <= 6 ? 140 : wild <= 2 ? 150 : 0; D[o] = cr[0]; D[o + 1] = cr[1]; D[o + 2] = cr[2]; D[o + 3] = band || (oi === my ? 100 : 78); }
    } else if (realm <= 1 || wild <= 1 || prov) { D[o] = 40; D[o + 1] = 26; D[o + 2] = 14; D[o + 3] = realm <= 1 ? 220 : wild <= 1 ? 160 : 90; }
    else if (c) { D[o] = c[0]; D[o + 1] = c[1]; D[o + 2] = c[2]; D[o + 3] = Math.min(255, c[3] + 30); }
  }
  ctx.putImageData(img, 0, 0);
  const c2 = document.createElement("canvas"); c2.width = w; c2.height = h; const x2 = c2.getContext("2d"); x2.filter = "blur(0.7px)"; x2.drawImage(cv, 0, 0);
  TERR3 = { key, url: c2.toDataURL() }; return TERR3.url;
}
// ---------- značky sídel ----------
const M_SYM = {
  house: '<circle r=".62"/>',
  city: '<rect x="-.78" y="-.78" width="1.56" height="1.56"/><rect x="-.26" y="-.26" width=".52" height=".52" fill="#f6ecd0" stroke="none"/>',
  fort: '<path d="M-.95 -.95H-.4V-.6H.4V-.95H.95V-.4H.6V.4H.95V.95H.4V.6H-.4V.95H-.95V.4H-.6V-.4H-.95Z"/>',
  cap: '<circle r="1.25" fill="#1a120a" stroke="none"/><circle r="1.02"/><path d="M0 -.62L.18 -.2L.62 -.19L.27 .09L.39 .52L0 .27L-.39 .52L-.27 .09L-.62 -.19L-.18 -.2Z" fill="#f6ecd0" stroke="none"/>',
};
function mapSvgReal() {
  const [vx, vy, vw, vh] = mapVB(), k = vw / MW, st_ = typeof document !== "undefined" && document.getElementById("stage"), ppu = Math.min((st_ && st_.clientWidth || 1100) / vw, (st_ && st_.clientHeight || 700) / vh), f = clamp(0.9 * Math.pow(ppu / 1.2, 0.4), 0.8, 1.5) / ppu, R = 5.6 * f, mode = SEL.mapMode || "polit", base = baseUrl();
  let g = `<rect x="-900" y="-900" width="${MW + 1800}" height="${MH + 1800}" fill="#0f0c08"/>`;
  g += base ? `<image href="${base}" x="0" y="0" width="${MW}" height="${MH}" preserveAspectRatio="none" pointer-events="none"/>` : `<rect width="${MW}" height="${MH}" fill="#d9c08c"/><text x="${MW / 2}" y="${MH / 2}" text-anchor="middle" font-size="14" fill="#5a3d1a" font-style="italic">kreslí se mapa…</text>`;
  if (mode === "teren") g += "";
  const tu = base ? terrReal(mode) : ""; if (tu) g += `<image href="${tu}" x="0" y="0" width="${MW}" height="${MH}" preserveAspectRatio="none" pointer-events="none"/>`;
  if (S.month < 4) { for (const L of [NILE, BAHR]) g += `<polyline class="floodw" points="${pts(smooth_(L))}" fill="none" stroke="#5aa0d2" stroke-width="${(L === NILE ? 6 : 3) * Math.min(1, Math.max(f, 0.5))}" stroke-linecap="round" stroke-linejoin="round"><title>Období achet: Nil zaplavil nivu</title></polyline>`; for (const L of [NILE_W, NILE_E, NILE_M]) g += `<polyline class="floodw" points="${pts(smooth_(L))}" fill="none" stroke="#5aa0d2" stroke-width="${3.5 * Math.min(1, Math.max(f, 0.5))}" stroke-linecap="round" stroke-linejoin="round"/>`; }
  for (const L of [NILE, NILE_W, NILE_E, NILE_M]) g += `<polyline points="${pts(smooth_(L))}" fill="none" stroke="#17344f" stroke-linecap="round" stroke-linejoin="round" stroke-width="${(L === NILE ? 2.9 : 1.9) * f}" opacity=".7"/><polyline points="${pts(smooth_(L))}" fill="none" stroke="#4d8fbd" stroke-linecap="round" stroke-linejoin="round" stroke-width="${(L === NILE ? 1.9 : 1.1) * f}"/>`;
  g += `<polyline points="${pts(smooth_(BAHR))}" fill="none" stroke="#4d8fbd" stroke-linecap="round" stroke-linejoin="round" stroke-width="${0.8 * f}" opacity=".8"/>`;
  // památky Staré říše, které v krajině stály ve všech obdobích hry
  { const x = MX(31.13), y = MY(29.98), u = Math.max(0.5, f) * 1.5; g += `<g transform="translate(${x} ${y}) scale(${u})" pointer-events="all"><title>Pyramidy v Gíze (4. dynastie) a Džoserova pyramida v Sakkáře (3. dynastie)</title><path d="M-4.6 0l2 -3l2 3zM-1.8 0l2.4 -3.8l2.4 3.8zM-7 0l1.4 -2.1l1.4 2.1z" fill="#efe2bd" stroke="#3b2a14" stroke-width=".25"/><path d="M.6 -3.8l2.4 3.8h-1.4zM-2.6 -3l2 3h-1.2z" fill="#3b2a14" opacity=".35"/></g>`; }
  const reg = [["Středozemní moře", 31.74, 28.2, 1, "wadzwer"], ["Rudé moře", 25.2, 35.0, 1], ["LIBYJSKÁ POUŠŤ", 26.4, 27.2, 0, "deshret"], ["VÝCHODNÍ POUŠŤ", 24.2, 33.9, 0, "deshret"], ["SINAJ", 29.75, 33.8, 0], ["NÚBIE", 21.0, 32.9, 0, "tasti"], ["KENAAN", 31.62, 34.72, 0, "recenu"], ["", 19.9, 31.2, 0, "kash"], ["", 26.9, 32.3, 0, "shemau"], ["", 30.55, 32.25, 0, "tamehu"]];
  for (const [t, la, lo, sea, hk] of reg) g += (t ? `<text class="region${sea ? " sea2" : ""}" x="${MX(lo)}" y="${MY(la)}" font-size="${(sea ? 12 : 10.5) * f}" text-anchor="middle">${t}</text>` : "") + (hk ? `<text class="rhg${sea ? " sea2" : ""}" x="${MX(lo)}" y="${MY(la) + (t ? 15 * f : 0)}" font-size="${13 * f}" text-anchor="middle"><title>${esc(hgTitle(hk))}</title>${HG[hk]}</text>` : "");
  const done = new Set();
  for (const p of Object.values(S.provs)) for (const n of p.nb) { const key = p.id < n ? p.id + n : n + p.id; if (done.has(key)) continue; done.add(key); const q = S.provs[n]; if (!TERRAIN[p.ter].nile || !TERRAIN[q.ter].nile) g += `<line class="edge" x1="${MX(p.lon)}" y1="${MY(p.lat)}" x2="${MX(q.lon)}" y2="${MY(q.lat)}" stroke-width="${0.8 * f}"><title>pouštní cesta</title></line>`; }
  if (mode === "obchod") for (const Rt of ROUTES) { const op = routeState(S, Rt).open; g += `<polyline points="${Rt.provs.map(id => MX(S.provs[id].lon) + "," + MY(S.provs[id].lat)).join(" ")}" fill="none" stroke="${Rt.col}" stroke-width="${3.6 * f}" stroke-linecap="round" stroke-linejoin="round" opacity=".9" ${op ? "" : `stroke-dasharray="${5 * f} ${4 * f}"`}><title>${esc(Rt.n)}${op ? "" : " – přerušená"}</title></polyline>`; }
  for (const a of S.armies) { if (!a.path || !a.path.length) continue; const own = a.cl === me(); if (!own && !knows(S, S.provs[a.loc])) continue; const L = [a.loc].concat(a.path).map(id => S.provs[id]); g += `<polyline class="march ${own ? "own" : "foe"}" stroke-width="${1.8 * f}" stroke-dasharray="${3.5 * f} ${2.5 * f}" stroke-linecap="round" points="${L.map(p => MX(p.lon) + "," + MY(p.lat)).join(" ")}"/>`; }
  const LEFT = new Set(["u2", "u4", "u6", "u8", "u10", "u12", "u14", "u16", "u18", "u20", "u22", "l2", "l3", "l5", "l6", "lx", "fa", "o_bah", "n_sai", "n_semna", "n_wawat"]);
  let marks = "", labels = "";
  for (const p of Object.values(S.provs)) {
    const x = MX(p.lon), y = MY(p.lat), C = S.clans[p.owner], mine = p.owner === me(), war = atWar(S, me(), p.owner), capf = C && C.capital === p.id;
    const kind = capf ? "cap" : p.flags.includes("f") || p.castle >= 3 ? "fort" : p.flags.includes("c") || p.v >= 4 ? "city" : "house", sc = R * (capf ? 1.05 : kind === "house" ? 0.9 : 0.82);
    let m = `<g class="pv${mine ? " mine" : ""}${war ? " war" : ""}" data-a="selProv" data-x='["${p.id}"]' data-pid="${p.id}"><circle cx="${x}" cy="${y}" r="${R * 2.3}" fill="transparent"/>`;
    if (SEL.prov === p.id) m += `<circle class="selring" cx="${x}" cy="${y}" r="${R * 2.2}" stroke-width="${1.6 * f}" stroke-dasharray="${4 * f} ${2.5 * f}"/>`;
    m += `<g class="mk" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${sc.toFixed(2)})" fill="${C.col}" stroke="${war ? "#ff5a3c" : mine ? "#f6d98a" : "#f4ead0"}" stroke-width="${kind === "cap" ? 0.2 : 0.24}" stroke-linejoin="round" paint-order="stroke">${M_SYM[kind]}</g>`;
    if ((p.b.chram || 0) >= 2) m += `<path d="M${x - R * 1.9} ${y + R * 0.6}l${R * 0.28} -${R * 1.5}l${R * 0.28} ${R * 1.5}z" fill="#efe2bd" stroke="#1a120a" stroke-width="${0.35 * f}"><title>chrám (úroveň ${p.b.chram})</title></path>`;
    if (p.mons && MON_IDS.some(id => p.mons[id] && p.mons[id].stage >= MONUMENTS[id].stages)) m += `<path d="M${x - R * 2.6} ${y + R * 0.6}l${R * 0.6} -${R * 1.0}l${R * 0.6} ${R * 1.0}z" fill="#e3bb55" stroke="#1a120a" stroke-width="${0.35 * f}"><title>dokončená velká stavba</title></path>`;
    if (p.siege) m += `<circle class="siege" cx="${x}" cy="${y}" r="${R * 1.9}" stroke-width="${1.5 * f}"/>`;
    if (p.hunger > 0.15 && (mine || knows(S, p))) m += `<g transform="translate(${x + R * 0.2} ${y - R * 1.9})"><path d="M0 -${R * 0.9}L${R * 0.85} ${R * 0.6}H-${R * 0.85}Z" fill="#c4361c" stroke="#f6ecd0" stroke-width="${0.4 * f}" stroke-linejoin="round"/><text y="${R * 0.42}" font-size="${R * 0.95}" fill="#fff" font-weight="bold" text-anchor="middle">!</text><title>hlad</title></g>`;
    if (p.build && mine) m += `<rect x="${x - R * 1.75}" y="${y - R * 1.75}" width="${R * 0.75}" height="${R * 0.75}" fill="#e3bb55" stroke="#1a120a" stroke-width="${0.35 * f}" transform="rotate(45 ${x - R * 1.4} ${y - R * 1.4})"><title>staví se</title></rect>`;
    const left = LEFT.has(p.id);
    if (k < 0.8 || capf || p.v >= 3 || !TERRAIN[p.ter].nile) labels += `<text class="lbl${capf ? " cap" : ""}" x="${x + (left ? -1 : 1) * R * 1.7}" y="${y + R * 0.55}" font-size="${(capf ? 14 : 11.5) * f}" stroke-width="${2.4 * f}" text-anchor="${left ? "end" : "start"}">${esc(p.n)}</text>`;
    marks += m + `</g>`;
  }
  g += labels + marks;
  for (const b of S.battles.filter(b => b.t >= S.turn - 1 && S.provs[b.place] && (b.a === me() || b.b === me() || knows(S, S.provs[b.place])))) { const p = S.provs[b.place], x = MX(p.lon) - R * 1.9, y = MY(p.lat) - R * 1.9, r = R * 0.95; g += `<g class="bmark" transform="translate(${x} ${y})"><title>Bitva: ${esc(S.clans[b.a].n)} × ${esc(S.clans[b.b].n)}</title><path d="M0 -${r * 1.3}L${r * 1.3} 0L0 ${r * 1.3}L-${r * 1.3} 0Z" fill="#b3261a" stroke="#f6ecd0" stroke-width="${0.45 * f}"/><path d="M-${r * 0.55} ${r * 0.55}L${r * 0.55} -${r * 0.55}M${r * 0.55} ${r * 0.55}L-${r * 0.55} -${r * 0.55}" stroke="#f6ecd0" stroke-width="${0.7 * f}" stroke-linecap="round"/></g>`; }
  const slot = {};
  for (const a of S.armies) { const p = S.provs[a.loc], own = a.cl === me(); if (!own && !knows(S, p)) continue; const n = slot[a.loc] = (slot[a.loc] || 0) + 1, hh = R * 1.45, ww = R * 3.1, x = MX(p.lon) + R * 1.2 + (n - 1) * (ww + R * 0.3), y = MY(p.lat) - R * 1.2 - hh, col = S.clans[a.cl].col, pow = Math.min(1, men(a.t) / 6000);
    g += `<g class="army${own ? " own" : ""}" data-a="selProv" data-x='["${p.id}"]' data-pid="${p.id}"><title>${esc(S.clans[a.cl].n)}: ${fmtN(men(a.t))} mužů${a.path && a.path.length ? " → " + esc(S.provs[a.path[a.path.length - 1]].n) : ""}</title><path d="M${x} ${y + hh}L${x - R * 0.9} ${y + hh + R * 0.9}L${x + R * 0.9} ${y + hh}Z" fill="#1a120a"/><rect x="${x}" y="${y}" width="${ww}" height="${hh}" rx="${R * 0.14}" fill="#1a120a" stroke="${own ? "#f6d98a" : "#d8ccb0"}" stroke-width="${(own ? 0.55 : 0.4) * f}"/><rect x="${x}" y="${y}" width="${R * 0.75}" height="${hh}" fill="${col}"/><rect x="${x + R * 0.95}" y="${y + hh - R * 0.28}" width="${(ww - R * 1.15) * pow}" height="${R * 0.14}" fill="${own ? "#f6d98a" : "#d8ccb0"}"/><text x="${x + R * 0.75 + (ww - R * 0.75) / 2}" y="${y + hh * 0.66}" font-size="${R * 0.92}" fill="#f6ecd0" text-anchor="middle" font-weight="bold" stroke="none">${fmtN(men(a.t))}</text></g>`; }
  // měřítko a kartuše se jménem země
  { const x = MX(25.35), y = MY(19.75), km = 200, len = km / 111 * MAPV.ky; g += `<g pointer-events="none" opacity=".85"><path d="M${x} ${y}h${len}M${x} ${y - 3}v6M${x + len / 2} ${y - 2}v4M${x + len} ${y - 3}v6" stroke="#2a1c0e" stroke-width="1" fill="none"/><text x="${x + len / 2}" y="${y - 6}" text-anchor="middle" font-size="8.5" fill="#2a1c0e" font-style="italic">${km} km</text></g>`;
    const cx = MX(26.75), cy = MY(21.15); g += `<g pointer-events="none" opacity=".92"><rect x="${cx - 58}" y="${cy - 21}" width="116" height="42" fill="#efe2bd" fill-opacity=".9" stroke="#3b2a14" stroke-width="1.3"/><rect x="${cx - 55}" y="${cy - 18}" width="110" height="36" fill="none" stroke="#3b2a14" stroke-width=".5"/><text x="${cx}" y="${cy - 1}" text-anchor="middle" font-size="17" style="font-family:Hieroglyfy,serif" fill="#2b1d12">${HG.kemet}</text><text x="${cx}" y="${cy + 13}" text-anchor="middle" font-size="8.5" fill="#5a3d1a" font-style="italic">Kemet ≈ ${S.bce} př. n. l.</text></g>`; }
  g += `<rect x="-1.5" y="-1.5" width="${MW + 3}" height="${MH + 3}" fill="none" stroke="#8a6a2a" stroke-width="1.6" pointer-events="none"/><rect x="-6" y="-6" width="${MW + 12}" height="${MH + 12}" fill="none" stroke="#3b2a14" stroke-width="1" pointer-events="none"/>`;
  return `<svg class="map art real" id="mapsvg" viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mapa Egypta">${g}</svg>`;
}
_mapSvg0 = mapSvgReal;
// po nové nebo načtené hře se území přepočítá
{ const f0 = ACT.startGo; ACT.startGo = (...a) => { const r = f0(...a); GEO3 = null; TERR3.key = null; return r; }; }
for (const k of ["load", "pasteSave", "newgame"]) { const f0 = ACT[k]; ACT[k] = (...a) => { const r = f0(...a); GEO3 = null; TERR3.key = null; return r; }; }
var _render1 = render;
render = function () { if (GEO3 && S.provs && Object.keys(S.provs).length !== GEO3.ids.length) { GEO3 = null; TERR3.key = null; } return _render1(); };
// úvodní obrazovka: výřez reliéfní mapy s Deltou a Memfidou místo kresleného obrázku
heroSvg = function () { const u = baseUrl(); return `<div class="hero real"${u ? ` style="background-image:url(${u})"` : ""}></div>`; };
