// Grafika: erby, politická mapa s územími, grafy, pruhy a ikony.

// Zjednodušené erby (barvy a dělení podle skutečné heraldiky, figury jsou stylizované)
const ARMS = {
  premysl: { f: "#c8102e", c: "#f4f1ea", ch: "lion" }, arpad: { p: "bars", f: "#c8102e", c: "#f4f1ea" },
  wittL: { p: "lozenge", f: "#1f5fa8", c: "#f4f1ea" }, wittH: { p: "lozenge", f: "#1f5fa8", c: "#f4f1ea" },
  habsburg: { f: "#e2b13c", c: "#c8102e", ch: "lion" }, wurttemberg: { p: "bars3", f: "#e2b13c", c: "#222" },
  norimberk: { p: "quarterly", f: "#f4f1ea", c: "#222" }, wurzburg: { p: "perfess", f: "#c8102e", c: "#f4f1ea" },
  salcburk: { p: "perpale", f: "#e2b13c", c: "#c8102e" }, pasov: { f: "#f4f1ea", c: "#c8102e", ch: "lion" },
  sponheim: { p: "chequy", f: "#1f5fa8", c: "#e2b13c" }, gorice: { f: "#f4f1ea", c: "#c8102e", ch: "eagle" },
  wettin: { f: "#e2b13c", c: "#222", ch: "lion" }, brandenburg: { f: "#f4f1ea", c: "#c8102e", ch: "eagle" },
  sasko: { p: "bars", f: "#222", c: "#e2b13c" }, welf: { f: "#c8102e", c: "#e2b13c", ch: "lion" },
  magdeburg: { p: "perfess", f: "#c8102e", c: "#f4f1ea" }, pomorany: { f: "#f4f1ea", c: "#c8102e", ch: "lion" },
  pomori: { f: "#e2b13c", c: "#222", ch: "eagle" }, rad: { p: "cross", f: "#f4f1ea", c: "#222" },
  velkopolsko: { f: "#c8102e", c: "#f4f1ea", ch: "eagle" }, kujavsko: { p: "perpale", f: "#c8102e", c: "#222", ch: "eagle", cc: "#f4f1ea" },
  mazovsko: { f: "#c8102e", c: "#f4f1ea", ch: "eagle" }, krakov: { f: "#c8102e", c: "#f4f1ea", ch: "eagle", crown: 1 },
  vratislav: { f: "#e2b13c", c: "#222", ch: "eagle" }, lehnice: { f: "#e2b13c", c: "#222", ch: "eagle" },
  hlohov: { f: "#e2b13c", c: "#222", ch: "eagle" }, opoli: { f: "#1f5fa8", c: "#e2b13c", ch: "eagle" },
  halic: { f: "#1f5fa8", c: "#e2b13c", ch: "lion" },
};
const LION = "M38 98 L42 80 L34 72 L29 57 L35 45 L31 35 L39 30 L43 21 L54 18 L61 25 L58 33 L66 37 L73 29 L78 34 L71 46 L62 50 L64 62 L72 65 L79 58 L82 69 L71 77 L60 75 L59 87 L65 99 L54 99 L50 87 L46 99 Z M31 62 C17 57 19 40 26 33 L29 36 C24 43 24 53 33 57 Z";
const EAGLE = "M50 22 L56 31 L54 40 L62 38 L80 29 L87 40 L74 48 L85 52 L70 58 L60 56 L58 66 L67 81 L56 78 L50 92 L44 78 L33 81 L42 66 L40 56 L30 58 L15 52 L26 48 L13 40 L20 29 L38 38 L46 40 L44 31 Z";
let SHIELD_N = 0;
function shield(cid, size = 26) {
  const C = (S && S.clans[cid]) || {}; const a = ARMS[cid] || { p: "perbend", f: C.col || "#888", c: "#f4f1ea" };
  const id = "shc" + (SHIELD_N++), f = a.f, c = a.c;
  let body = `<rect width="100" height="120" fill="${f}"/>`;
  switch (a.p) {
    case "bars": for (let i = 0; i < 8; i++) body += `<rect y="${i * 15}" width="100" height="15" fill="${i % 2 ? c : f}"/>`; break;
    case "bars3": for (let i = 0; i < 3; i++) body += `<rect y="${18 + i * 32}" width="100" height="13" fill="${c}"/>`; break;
    case "lozenge": for (let y = -1; y < 9; y++) for (let x = -1; x < 8; x++) if ((x + y) % 2 === 0) body += `<path d="M${x * 16 + 8} ${y * 16} l8 8 l-8 8 l-8 -8z" fill="${c}"/>`; break;
    case "chequy": for (let y = 0; y < 8; y++) for (let x = 0; x < 7; x++) if ((x + y) % 2) body += `<rect x="${x * 15}" y="${y * 15}" width="15" height="15" fill="${c}"/>`; break;
    case "quarterly": body += `<rect x="50" width="50" height="60" fill="${c}"/><rect y="60" width="50" height="60" fill="${c}"/>`; break;
    case "perfess": body += `<rect y="60" width="100" height="60" fill="${c}"/>`; break;
    case "perpale": body += `<rect x="50" width="50" height="120" fill="${c}"/>`; break;
    case "perbend": body += `<path d="M0 0 L100 120 L0 120Z" fill="${c}" opacity=".85"/>`; break;
    case "cross": body = `<rect width="100" height="120" fill="${f}"/><rect x="40" width="20" height="120" fill="${c}"/><rect y="42" width="100" height="20" fill="${c}"/>`; break;
  }
  if (a.ch) body += `<path d="${a.ch === "lion" ? LION : EAGLE}" fill="${a.cc || c}" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/>`;
  if (a.crown) body += `<path d="M40 16 l3 -8 l4 6 l3 -8 l3 8 l4 -6 l3 8z" fill="#e2b13c"/>`;
  const outline = "M3 3 H97 V52 C97 86 72 106 50 117 C28 106 3 86 3 52 Z";
  return `<svg class="shield" width="${size}" height="${Math.round(size * 1.2)}" viewBox="0 0 100 120" aria-hidden="true"><clipPath id="${id}"><path d="${outline}"/></clipPath><g clip-path="url(#${id})">${body}</g><path d="${outline}" fill="none" stroke="rgba(0,0,0,.55)" stroke-width="4"/></svg>`;
}

// ---------- pruhy ----------
function statBar(v, cls2 = "") { return `<td class="n sb ${cls2}"><span class="sbv" style="--v:${clamp(v, 0, 100)}%">${Math.round(v)}</span></td>`; }
function meter(label, v, max, col) { const f = clamp(v / Math.max(1, max) * 100, 0, 100); return `<div class="meter"><span class="ml">${label}</span><span class="mt"><i style="width:${f}%;${col ? "background:" + col : ""}"></i></span><span class="mv">${fmt(v)}${max ? " / " + fmt(max) : ""}</span></div>`; }
const TROOP_COL = { pesi: "#8a7a5c", strelci: "#4f7f4f", jizda: "#a3332b", zoldneri: "#5d5d8c" };
function troopBar(t) { const n = men(t); if (!n) return '<div class="tbar empty"></div>'; return `<div class="tbar" title="${TROOP_IDS.map(k => TROOPS[k].n + ": " + fmt(t[k] || 0)).join(", ")}">${TROOP_IDS.filter(k => t[k]).map(k => `<i style="flex:${t[k]};background:${TROOP_COL[k]}"></i>`).join("")}</div>`; }
const troopLegend = () => `<div class="tleg">${TROOP_IDS.map(k => `<span><i style="background:${TROOP_COL[k]}"></i>${TROOPS[k].n}</span>`).join("")}</div>`;

// ---------- grafy ----------
function sparkline(vals, w = 120, h = 30, col = "var(--accent2)") {
  if (vals.length < 2) return "";
  const mn = Math.min(...vals), mx = Math.max(...vals), sy = v => h - 3 - (mx === mn ? 0.5 : (v - mn) / (mx - mn)) * (h - 6), sx = i => i / (vals.length - 1) * (w - 4) + 2;
  const pts = vals.map((v, i) => `${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(" ");
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polygon points="2,${h} ${pts} ${w - 2},${h}" fill="${col}" opacity=".15"/><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.6"/><circle cx="${sx(vals.length - 1)}" cy="${sy(vals[vals.length - 1])}" r="2.5" fill="${col}"/></svg>`;
}
function lineChart(series, labels, w = 640, h = 220, maxw) {
  const all = series.flatMap(s => s.vals); if (!all.length || labels.length < 2) return '<p class="muted small">Graf se zaplní, jak poběží čas.</p>';
  const mx = Math.max(1, ...all), pl = 34, pr = 110, pt = 8, pb = 22, W = w - pl - pr, H = h - pt - pb;
  const sx = i => pl + i / (labels.length - 1) * W, sy = v => pt + H - v / mx * H;
  let g = ""; const step = Math.max(1, Math.ceil(mx / 4));
  for (let v = 0; v <= mx; v += step) g += `<line x1="${pl}" x2="${pl + W}" y1="${sy(v)}" y2="${sy(v)}" class="grid"/><text x="${pl - 5}" y="${sy(v) + 3}" class="ax" text-anchor="end">${v}</text>`;
  const every = Math.max(1, Math.ceil(labels.length / 6));
  labels.forEach((l, i) => { if (i % every === 0 || i === labels.length - 1) g += `<text x="${sx(i)}" y="${h - 6}" class="ax" text-anchor="middle">${esc(l)}</text>`; });
  const ends = [];
  for (const s of series) { const pts = s.vals.map((v, i) => `${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(" "); g += `<polyline points="${pts}" fill="none" stroke="${s.col}" stroke-width="${s.bold ? 3 : 1.8}"/>`; ends.push([sy(s.vals[s.vals.length - 1]), s]); }
  ends.sort((a, b) => a[0] - b[0]); let last = -99;
  for (const [y0, s] of ends) { const y = Math.max(y0, last + 11); last = y; g += `<circle cx="${pl + W}" cy="${y0}" r="3" fill="${s.col}"/><text x="${pl + W + 6}" y="${y + 3}" class="ax lbl2" ${s.bold ? 'font-weight="bold"' : ""}>${esc(s.name)} ${s.vals[s.vals.length - 1]}</text>`; }
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" style="max-width:${maxw || w * 1.25}px" role="img" aria-label="Graf">${g}</svg>`;
}
// průběh bitvy: kolik mužů zbývá po každém kole
function battleChart(b) {
  let a = b.aStart, d = b.bStart; const A = [a], D = [d];
  for (const r of b.rounds) { a -= r[0]; d -= r[1]; A.push(Math.max(0, a)); D.push(Math.max(0, d)); }
  return lineChart([{ name: S.clans[b.a].house.split(" (")[0], col: S.clans[b.a].col, vals: A }, { name: S.clans[b.b].house.split(" (")[0], col: S.clans[b.b].col, vals: D }], A.map((_, i) => i ? i + ". kolo" : "začátek"), 460, 160, 520);
}

// ---------- politická mapa ----------
let TERR = { key: null, url: null };
function hexRgb(h) { const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h || ""); return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [136, 136, 136]; }
function territoryImage(W, H, MXf, MYf) {
  const key = Object.values(S.provs).map(p => p.owner).join(",") + "|" + S.player;
  if (TERR.key === key && TERR.url) return TERR.url;
  if (typeof document === "undefined") return "";
  const sc = 2, w = Math.floor(W / sc), h = Math.floor(H / sc), ps = Object.values(S.provs), n = ps.length;
  const px = ps.map(p => MXf(p.lon) / sc), py = ps.map(p => MYf(p.lat) / sc), idx = new Int16Array(w * h), lim = (64 / sc) ** 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let best = -1, bd = lim;
    // lehké zvlnění hranic
    const jx = x + Math.sin(y * 0.35) * 1.2, jy = y + Math.cos(x * 0.31) * 1.2;
    for (let i = 0; i < n; i++) { const dx = px[i] - jx, dy = py[i] - jy, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
    idx[y * w + x] = best;
  }
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const ctx = cv.getContext("2d"), img = ctx.createImageData(w, h), D = img.data;
  const cols = ps.map(p => hexRgb(S.clans[p.owner].col)), own = ps.map(p => p.owner), mine = ps.map(p => p.owner === S.player);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x, i = idx[k], o = k * 4; if (i < 0) { D[o + 3] = 0; continue; }
    const nb = [x > 0 ? idx[k - 1] : -1, x < w - 1 ? idx[k + 1] : -1, y > 0 ? idx[k - w] : -1, y < h - 1 ? idx[k + w] : -1];
    const realm = nb.some(j => j !== i && (j < 0 || own[j] !== own[i])), prov = nb.some(j => j >= 0 && j !== i);
    const [r, g, b] = cols[i];
    if (realm) { D[o] = r * 0.35; D[o + 1] = g * 0.35; D[o + 2] = b * 0.35; D[o + 3] = 235; }
    else if (prov) { D[o] = r * 0.75; D[o + 1] = g * 0.75; D[o + 2] = b * 0.75; D[o + 3] = 150; }
    else { D[o] = r; D[o + 1] = g; D[o + 2] = b; D[o + 3] = mine[i] ? 200 : 140; }
  }
  ctx.putImageData(img, 0, 0);
  TERR = { key, url: cv.toDataURL() };
  return TERR.url;
}

// ---------- ikony (jednoduché obrysové) ----------
const ICON = {
  prehled: "M3 3h7v7H3zM12 3h7v4h-7zM12 9h7v10h-7zM3 12h7v7H3z", plan: "M4 5h2v2H4z M9 6h10 M4 11h2v2H4z M9 12h10 M4 17h2v2H4z M9 18h10", mapa: "M2 5l6-2 6 2 6-2v14l-6 2-6-2-6 2z M8 3v14 M14 5v14",
  kraj: "M3 19V9l3-3 3 3V6h2v3h2V6h2v3l3-3 3 3v10z M10 19v-5h2v5", vazalove: "M8 8a3 3 0 1 0 0-.1z M2 19c0-4 3-6 6-6s6 2 6 6 M16 9a2.5 2.5 0 1 0 0-.1z M14 13c3 0 6 2 6 5",
  vojsko: "M4 20L18 6 M15 3h6v6 M20 20L6 6 M3 9V3h6", diplo: "M3 12l5-5 4 4 4-4 5 5-5 5-4-4-4 4z", rise: "M4 18h16 M5 18l-1-9 5 4 3-7 3 7 5-4-1 9z",
  hosp: "M12 3a8 8 0 1 0 .1 0z M9 9h5a2 2 0 0 1 0 4h-4a2 2 0 0 0 0 4h5 M12 6v2 M12 17v2", stavy: "M12 3v18 M5 7h14 M3 14l2-7 2 7a2 2 0 0 1-4 0z M17 14l2-7 2 7a2 2 0 0 1-4 0z",
  rod: "M12 3v5 M6 12v-2h12v2 M6 12v3 M18 12v3 M12 8v7 M4 15h4v4H4z M10 15h4v4h-4z M16 15h4v4h-4z", objevy: "M9 21h6 M10 17h4 M12 3a6 6 0 0 0-4 10.5V17h8v-3.5A6 6 0 0 0 12 3z",
  kronika: "M5 3h11l3 3v15H5z M8 8h8 M8 12h8 M8 16h5", hra: "M12 9a3 3 0 1 0 0 .1z M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2",
};
const icon = k => ICON[k] ? `<svg class="ico" viewBox="0 0 22 22" aria-hidden="true"><path d="${ICON[k]}"/></svg>` : "";
