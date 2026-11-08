// Rozhraní: pomocné funkce, znaky rodů, pruhy, grafy a mapa Egypta.
let S = null;
const SEL = { tab: "prehled", prov: null, cmd: {}, logF: "moje", ngScen: "sip", ngClan: "thebes", ngDiff: 1, zoom: "cele", dipl: null, planDone: false };
const me = () => S.player;
const esc = t => String(t == null ? "" : t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = v => Math.round(v).toLocaleString("cs-CZ");
const fmtK = v => Math.abs(v) >= 1e6 ? (r1(v / 1e6) + "").replace(".", ",") + " mil." : Math.abs(v) >= 10000 ? fmt(v / 1000) + " tis." : fmt(v);
const sg = v => (v > 0 ? "+" : v < 0 ? "−" : "") + fmt(Math.abs(v));
const dec = v => String(r1(v)).replace(".", ",");
const ax = a => esc(JSON.stringify(a));
function btn(label, act, args = [], dis = null, cls = "") { return `<button class="b ${cls}" data-a="${act}" data-x="${ax(args)}"${dis ? ` disabled title="${esc(dis)}"` : ""}>${label}</button>`; }
function sel(id, opts, val, attrs = "") { return `<select id="${id}" ${attrs}>${opts.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(val) ? " selected" : ""}>${esc(t)}</option>`).join("")}</select>`; }
const card = (t, body, cls = "") => `<section class="card ${cls}"><h3>${t}</h3>${body}</section>`;
const tbl = (head, rows) => rows.length ? `<table><thead><tr>${head.map(h => h.startsWith("#") ? `<th class="n">${h.slice(1)}</th>` : `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>` : '<p class="muted small">Nic.</p>';
const tr = (cells, cls = "", attrs = "") => `<tr class="${cls}" ${attrs}>${cells.map(c => (String(c).startsWith("<td") ? c : `<td>${c}</td>`)).join("")}</tr>`;
const tdn = v => `<td class="n">${v}</td>`;
function tile(label, value, sub, spark) { return `<div class="tile"><div class="tl">${label}</div><div class="tv">${value}</div><div class="ts">${sub || ""}</div>${spark || ""}</div>`; }
function meter(label, v, max, col) { const f = clamp(v / Math.max(1, max) * 100, 0, 100); return `<div class="meter"><span class="ml">${label}</span><span class="mt"><i style="width:${f}%;${col ? "background:" + col : ""}"></i></span><span class="mv">${fmt(v)}${max !== 100 ? " / " + fmt(max) : ""}</span></div>`; }
const statTd = v => `<td class="n"><span class="sbv" style="--v:${clamp(v, 0, 100)}%">${Math.round(v)}</span></td>`;
const statsTd = c => STAT_IDS.map(k => statTd(st(c, k))).join("");
function relBar(v) { const w = Math.abs(v) / 2; return `<span class="relbar" title="vztah ${Math.round(v)}"><i style="${v >= 0 ? "left:50%" : "right:50%"};width:${w}%;background:${v >= 0 ? "var(--good)" : "var(--bad)"}"></i><b></b></span> <span class="small">${Math.round(v)}</span>`; }
function troopBar(t) { const n = men(t); if (!n) return '<div class="tbar"></div>'; return `<div class="tbar" title="${TROOP_IDS.filter(k => t[k]).map(k => TROOPS[k].n + ": " + fmt(t[k])).join(", ")}">${TROOP_IDS.filter(k => t[k]).map(k => `<i style="flex:${t[k]};background:${TROOPS[k].col}"></i>`).join("")}</div>`; }
const troopLegend = () => `<div class="tleg">${TROOP_IDS.map(k => `<span><i style="background:${TROOPS[k].col}"></i>${TROOPS[k].n}</span>`).join("")}</div>`;
function toast(t) { const el = document.getElementById("toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toast.h); toast.h = setTimeout(() => el.classList.remove("on"), 3200); }

// ---------- znaky rodů (kartuše se symbolem) ----------
const EMB = {
  was: "M47 18h6v8l6-3v6l-6 3v46l4 6h-14l4-6V32l-5-2z",
  djed: "M44 20h12v58h-12z M36 30h28v5H36z M36 40h28v5H36z M36 50h28v5H36z M38 78h24v6H38z",
  ankh: "M50 18c-9 0-13 8-13 15 0 6 4 11 9 15H33v7h14v28h6V55h14v-7H54c5-4 9-9 9-15 0-7-4-15-13-15zm0 7c4 0 6 4 6 8s-3 9-6 11c-3-2-6-7-6-11s2-8 6-8z",
  star: "M50 18l5 22 21-6-15 16 15 16-21-6-5 22-5-22-21 6 15-16-15-16 21 6z",
  crescent: "M60 20a32 32 0 1 0 0 64a26 26 0 1 1 0-64z",
  feather: "M50 16c10 10 12 28 6 44l-4 10v14h-4V70l-4-10c-6-16-4-34 6-44z",
  bow: "M30 22c30 10 30 60 0 70l3 3c34-12 34-64 0-76zM31 23v69",
  papyrus: "M48 40h4v46h-4z M50 18l14 22H36z",
};
let EMB_N = 0;
function emblem(cid, size = 24) {
  const C = S && S.clans[cid]; if (!C) return "";
  const path = EMB[C.emb] || EMB.ankh, id = "eb" + (EMB_N++);
  return `<svg class="emb" width="${Math.round(size * 0.72)}" height="${size}" viewBox="0 0 72 100" aria-hidden="true"><rect x="3" y="3" width="66" height="88" rx="30" fill="${C.col}" stroke="rgba(0,0,0,.5)" stroke-width="3"/><rect x="8" y="92" width="56" height="5" rx="2" fill="${C.col}" stroke="rgba(0,0,0,.5)" stroke-width="2"/><g transform="translate(-14,0)"><path d="${path}" fill="#f6efdc" stroke="${C.emb === "bow" ? "#f6efdc" : "none"}" stroke-width="${C.emb === "bow" ? 3 : 0}"/></g></svg>`;
}
const chip = cid => S.clans[cid] ? `<span class="chip">${emblem(cid, 16)}${esc(S.clans[cid].n)}</span>` : "";
const chipH = cid => S.clans[cid] ? `<span class="chip">${emblem(cid, 16)}${esc(S.clans[cid].house)}</span>` : "";

// ---------- ikony záložek ----------
const ICON = {
  prehled: "M3 3h7v7H3zM12 3h7v4h-7zM12 9h7v10h-7zM3 12h7v7H3z", plan: "M4 5h2v2H4z M9 6h10 M4 11h2v2H4z M9 12h10 M4 17h2v2H4z M9 18h10", mapa: "M2 5l6-2 6 2 6-2v14l-6 2-6-2-6 2z M8 3v14 M14 5v14",
  zupy: "M3 19V10l8-6 8 6v9z M9 19v-5h4v5", urednici: "M8 8a3 3 0 1 0 0-.1z M2 19c0-4 3-6 6-6s6 2 6 6 M16 9a2.5 2.5 0 1 0 0-.1z M14 13c3 0 6 2 6 5",
  vojsko: "M4 20L18 6 M15 3h6v6 M20 20L6 6 M3 9V3h6", diplo: "M3 12l5-5 4 4 4-4 5 5-5 5-4-4-4 4z", hosp: "M4 19h14 M6 19V9 M10 19V6 M14 19V11 M18 19V8", chramy: "M3 19h16 M5 19V9 M9 19V9 M13 19V9 M17 19V9 M3 9h16 M4 9l7-5 7 5",
  rod: "M11 3v5 M5 12v-2h12v2 M5 12v3 M17 12v3 M11 8v7 M3 15h4v4H3z M9 15h4v4H9z M15 15h4v4h-4z", vedeni: "M5 4h10l3 3v13H5z M8 9h7 M8 13h7 M8 17h4", kronika: "M5 3h11l3 3v15H5z M8 8h8 M8 12h8 M8 16h5", hra: "M11 8a3 3 0 1 0 0 .1z M11 2v3 M11 17v3 M2 11h3 M17 11h3",
};
const icon = k => ICON[k] ? `<svg class="ico" viewBox="0 0 22 22" aria-hidden="true"><path d="${ICON[k]}"/></svg>` : "";

// ---------- grafy ----------
function sparkline(vals, w = 120, h = 26, col = "var(--accent2)") {
  if (vals.length < 2) return "";
  const mn = Math.min(...vals), mx = Math.max(...vals), sy = v => h - 3 - (mx === mn ? 0.5 : (v - mn) / (mx - mn)) * (h - 6), sx = i => i / (vals.length - 1) * (w - 4) + 2;
  const pts = vals.map((v, i) => `${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(" ");
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polygon points="2,${h} ${pts} ${w - 2},${h}" fill="${col}" opacity=".15"/><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.6"/></svg>`;
}
function lineChart(series, labels, w = 640, h = 220) {
  const all = series.flatMap(s => s.vals); if (!all.length || labels.length < 2) return '<p class="muted small">Graf se zaplní, jak poběží čas.</p>';
  const mx = Math.max(1, ...all), pl = 34, pr = 130, pt = 8, pb = 22, W = w - pl - pr, H = h - pt - pb;
  const sx = i => pl + i / (labels.length - 1) * W, sy = v => pt + H - v / mx * H;
  let g = ""; const step = Math.max(1, Math.ceil(mx / 4));
  for (let v = 0; v <= mx; v += step) g += `<line x1="${pl}" x2="${pl + W}" y1="${sy(v)}" y2="${sy(v)}" class="grid"/><text x="${pl - 5}" y="${sy(v) + 3}" class="ax" text-anchor="end">${v}</text>`;
  const every = Math.max(1, Math.ceil(labels.length / 6));
  labels.forEach((l, i) => { if (i % every === 0 || i === labels.length - 1) g += `<text x="${sx(i)}" y="${h - 6}" class="ax" text-anchor="middle">${esc(l)}</text>`; });
  const ends = [];
  for (const s of series) { const pts = s.vals.map((v, i) => `${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(" "); g += `<polyline points="${pts}" fill="none" stroke="${s.col}" stroke-width="${s.bold ? 3 : 1.8}"/>`; ends.push([sy(s.vals[s.vals.length - 1]), s]); }
  ends.sort((a, b) => a[0] - b[0]); let last = -99;
  for (const [y0, s] of ends) { const y = Math.max(y0, last + 11); last = y; g += `<circle cx="${pl + W}" cy="${y0}" r="3" fill="${s.col}"/><text x="${pl + W + 6}" y="${y + 3}" class="ax" ${s.bold ? 'font-weight="bold"' : ""}>${esc(s.name)} ${s.vals[s.vals.length - 1]}</text>`; }
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" style="max-width:${Math.round(w * 1.2)}px" role="img" aria-label="Graf">${g}</svg>`;
}
function battleChart(b) {
  let a = b.aStart, d = b.bStart; const A = [a], D = [d];
  for (const r of b.rounds) { a -= r[0]; d -= r[1]; A.push(Math.max(0, a)); D.push(Math.max(0, d)); }
  return lineChart([{ name: S.clans[b.a].n, col: S.clans[b.a].col, vals: A }, { name: S.clans[b.b].n, col: S.clans[b.b].col, vals: D }], A.map((_, i) => i ? i + ". kolo" : "začátek"), 460, 150);
}

// ---------- mapa ----------
const MAPV = { lon0: 25.0, lon1: 35.2, lat0: 19.2, lat1: 31.9, kx: 54, ky: 60 };
const MW = Math.round((MAPV.lon1 - MAPV.lon0) * MAPV.kx), MH = Math.round((MAPV.lat1 - MAPV.lat0) * MAPV.ky);
const MX = lon => (lon - MAPV.lon0) * MAPV.kx, MY = lat => (MAPV.lat1 - lat) * MAPV.ky;
const ZOOMS = { cele: { n: "Celá mapa", b: [25, 35.2, 19.2, 31.9] }, horni: { n: "Horní Egypt", b: [29.2, 34.4, 24.0, 29.6] }, delta: { n: "Memfis a Delta", b: [28.6, 33.9, 29.3, 31.8] }, nubie: { n: "Núbie", b: [28.6, 34.2, 19.2, 24.6] } };
// tok Nilu (z. šířka, z. délka) od Kermy po ústí ramen
const NILE = [[19.6, 30.41], [20.2, 30.55], [20.7, 30.33], [21.1, 30.6], [21.5, 30.95], [21.92, 31.3], [22.3, 31.62], [22.67, 32.03], [23.0, 32.6], [23.55, 32.86], [24.09, 32.89], [24.45, 32.93], [24.98, 32.87], [25.29, 32.55], [25.7, 32.64], [26.0, 32.82], [26.16, 32.72], [26.08, 32.35], [26.05, 32.24], [26.18, 31.92], [26.56, 31.7], [26.9, 31.5], [27.18, 31.18], [27.44, 30.88], [27.78, 30.85], [27.93, 30.88], [28.33, 30.78], [28.6, 30.78], [29.08, 31.02], [29.42, 31.22], [29.85, 31.25], [30.15, 31.22]];
const NILE_W = [[30.15, 31.22], [30.5, 30.97], [30.97, 30.77], [31.2, 30.6], [31.42, 30.38]];
const NILE_E = [[30.15, 31.22], [30.57, 31.51], [30.79, 31.82], [31.04, 32.45]];
const NILE_M = [[30.15, 31.22], [30.6, 31.15], [30.96, 31.24], [31.2, 31.5], [31.45, 31.82]];
const BAHR = [[27.78, 30.85], [28.5, 30.7], [29.08, 30.88], [29.31, 30.84]];
const MED = [[31.9, 25.0], [31.55, 25.15], [31.35, 27.23], [30.83, 28.95], [31.2, 29.9], [31.32, 30.06], [31.45, 30.4], [31.6, 31.0], [31.48, 31.81], [31.26, 32.3], [31.04, 32.54], [31.13, 33.8], [31.29, 34.24], [31.5, 34.45], [31.9, 34.75]];
const RED = [[29.97, 32.55], [29.3, 32.65], [28.35, 33.08], [27.25, 33.8], [26.75, 33.94], [26.1, 34.28], [25.07, 34.9], [23.9, 35.47], [22.2, 36.6], [19.2, 37.5], [19.2, 38.5], [27.9, 35.2], [28.6, 34.6], [29.5, 34.95], [28.5, 34.45], [27.73, 34.25], [28.2, 33.6], [29.0, 33.1], [29.9, 32.7]];
const pts = L => L.map(([la, lo]) => `${MX(lo).toFixed(1)},${MY(la).toFixed(1)}`).join(" ");
let TERR = { key: null, url: null };
function hexRgb(h) { const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h || ""); return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [136, 136, 136]; }
function territoryImage() {
  const key = Object.values(S.provs).map(p => p.owner).join(",") + "|" + S.player;
  if (TERR.key === key && TERR.url) return TERR.url;
  if (typeof document === "undefined") return "";
  const sc = 2, w = Math.floor(MW / sc), h = Math.floor(MH / sc), ps = Object.values(S.provs), n = ps.length;
  const px = ps.map(p => MX(p.lon) / sc), py = ps.map(p => MY(p.lat) / sc), rad = ps.map(p => (p.ter === "poust" || p.ter === "oaza" ? 44 : p.ter === "delta" ? 26 : 18) / sc), idx = new Int16Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let best = -1, bd = 1; const jx = x + Math.sin(y * 0.4) * 0.8, jy = y + Math.cos(x * 0.37) * 0.8;
    for (let i = 0; i < n; i++) { const dx = px[i] - jx, dy = py[i] - jy, d = Math.sqrt(dx * dx + dy * dy) / rad[i]; if (d < bd) { bd = d; best = i; } }
    idx[y * w + x] = best;
  }
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const ctx = cv.getContext("2d"), img = ctx.createImageData(w, h), D = img.data;
  const cols = ps.map(p => hexRgb(S.clans[p.owner].col)), own = ps.map(p => p.owner), mine = ps.map(p => p.owner === S.player);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x, i = idx[k], o = k * 4; if (i < 0) { D[o + 3] = 0; continue; }
    const nb = [x > 0 ? idx[k - 1] : -1, x < w - 1 ? idx[k + 1] : -1, y > 0 ? idx[k - w] : -1, y < h - 1 ? idx[k + w] : -1];
    const realm = nb.some(j => j !== i && (j < 0 || own[j] !== own[i])), prov = nb.some(j => j >= 0 && j !== i);
    const [r, g, b] = cols[i];
    if (realm) { D[o] = r * 0.4; D[o + 1] = g * 0.4; D[o + 2] = b * 0.4; D[o + 3] = 220; }
    else if (prov) { D[o] = r * 0.8; D[o + 1] = g * 0.8; D[o + 2] = b * 0.8; D[o + 3] = 150; }
    else { D[o] = r; D[o + 1] = g; D[o + 2] = b; D[o + 3] = mine[i] ? 185 : 125; }
  }
  ctx.putImageData(img, 0, 0); TERR = { key, url: cv.toDataURL() }; return TERR.url;
}
function mapSvg() {
  const Z = ZOOMS[SEL.zoom] || ZOOMS.cele, [lo0, lo1, la0, la1] = Z.b, vx = MX(lo0), vy = MY(la1), vw = MX(lo1) - vx, vh = MY(la0) - vy, k = vw / MW;
  const f = Math.max(0.42, k), R = 5.2 * f;
  let g = `<rect x="0" y="0" width="${MW}" height="${MH}" fill="var(--desert)"/>`;
  g += `<polygon class="sea" points="${pts(MED)} ${MX(34.75)},${MY(32.3)} ${MX(25)},${MY(32.3)}"/><polygon class="sea" points="${pts(RED)}"/>`;
  g += `<polyline class="coast" points="${pts(MED)}"/>`;
  g += `<ellipse cx="${MX(30.62)}" cy="${MY(29.47)}" rx="${12}" ry="${4}" fill="var(--sea)"/>`;
  const tu = territoryImage(); if (tu) g += `<image href="${tu}" x="0" y="0" width="${MW}" height="${MH}" preserveAspectRatio="none"/>`;
  for (const L of [NILE, NILE_W, NILE_E, NILE_M]) g += `<polyline class="nile" points="${pts(L)}" stroke-width="${L === NILE ? 2.6 * f : 1.6 * f}"/>`;
  g += `<polyline class="nile" points="${pts(BAHR)}" stroke-width="${0.9 * f}" opacity=".7"/>`;
  const reg = [["Středozemní moře", 31.75, 28.0], ["Rudé moře", 25.6, 34.9], ["Libyjská poušť", 27.0, 27.4], ["Východní poušť", 24.6, 33.8], ["SINAJ", 29.6, 33.9], ["NÚBIE", 21.0, 32.6], ["DELTA", 31.25, 31.45], ["HORNÍ EGYPT", 26.6, 33.7]];
  for (const [t, la, lo] of reg) g += `<text class="region" x="${MX(lo)}" y="${MY(la)}" font-size="${10 * f}" text-anchor="middle">${t}</text>`;
  const done = new Set();
  for (const p of Object.values(S.provs)) for (const n of p.nb) { const key = p.id < n ? p.id + n : n + p.id; if (done.has(key)) continue; done.add(key); const q = S.provs[n]; if (p.ter === "poust" || q.ter === "poust" || p.ter === "oaza" || q.ter === "oaza") g += `<line class="edge" x1="${MX(p.lon)}" y1="${MY(p.lat)}" x2="${MX(q.lon)}" y2="${MY(q.lat)}" stroke-width="${0.8 * f}"/>`; }
  // pochody
  for (const a of S.armies) { if (!a.path || !a.path.length) continue; const own = a.cl === me(), vis = own || knows(S, S.provs[a.loc]); if (!vis) continue; const L = [a.loc].concat(a.path).map(id => S.provs[id]); g += `<polyline class="march ${own ? "own" : "foe"}" stroke-width="${1.6 * f}" stroke-dasharray="${own ? "" : 4 * f + " " + 2 * f}" points="${L.map(p => MX(p.lon) + "," + MY(p.lat)).join(" ")}"/>`; }
  for (const p of Object.values(S.provs)) {
    const x = MX(p.lon), y = MY(p.lat), C = S.clans[p.owner], mine = p.owner === me(), war = atWar(S, me(), p.owner), capf = C && C.capital === p.id;
    g += `<g class="pv${mine ? " mine" : ""}${war ? " war" : ""}" data-a="selProv" data-x='["${p.id}"]'><title>${esc(p.n)} – ${esc(C.n)}</title><circle cx="${x}" cy="${y}" r="${R * 2.2}" fill="transparent"/>`;
    if (capf) g += `<path d="M${x} ${y - R * 1.9} l${R * 0.55} ${R * 1.1} l${R * 1.2} ${R * 0.15} l-${R * 0.9} ${R * 0.8} l${R * 0.25} ${R * 1.2} l-${R * 1.1} -${R * 0.6} l-${R * 1.1} ${R * 0.6} l${R * 0.25} -${R * 1.2} l-${R * 0.9} -${R * 0.8} l${R * 1.2} -${R * 0.15}z" fill="${C.col}" stroke="rgba(0,0,0,.7)" stroke-width="${0.8 * f}"/>`;
    else g += `<circle class="dot" cx="${x}" cy="${y}" r="${R * (0.7 + p.v * 0.12)}" fill="${C.col}" stroke-width="${(mine || war ? 1.8 : 0.9) * f}"/>`;
    if (p.siege) g += `<circle class="siege" cx="${x}" cy="${y}" r="${R * 1.9}" stroke-width="${1.4 * f}"/>`;
    if (SEL.prov === p.id) g += `<circle class="selring" cx="${x}" cy="${y}" r="${R * 2.3}" stroke-width="${2.2 * f}"/>`;
    const left = ["u2", "u4", "u6", "u8", "u10", "u12", "u14", "u16", "u18", "u20", "u22", "l2", "l3", "l5", "l6", "lx", "fa", "o_bah", "n_sai", "n_semna", "n_wawat"].includes(p.id);
    g += `<text class="lbl${capf ? " cap" : ""}" x="${x + (left ? -1 : 1) * R * 1.7}" y="${y + R * 0.6}" font-size="${8.5 * f}" stroke-width="${2.4 * f}" text-anchor="${left ? "end" : "start"}">${esc(p.n)}</text></g>`;
  }
  for (const a of S.armies) { const p = S.provs[a.loc], own = a.cl === me(); if (!own && !knows(S, p)) continue; const x = MX(p.lon) + R * 1.2, y = MY(p.lat) - R * 1.6, s2 = R * (0.9 + Math.min(1.2, men(a.t) / 4000)); g += `<g class="army"><path d="M${x} ${y - s2} L${x + s2} ${y + s2 * 0.8} L${x - s2} ${y + s2 * 0.8}Z" fill="${S.clans[a.cl].col}" stroke-width="${0.8 * f}"><title>${esc(S.clans[a.cl].house)}: ${fmt(men(a.t))} mužů</title></path></g>`; }
  return `<svg class="map" viewBox="${vx.toFixed(0)} ${vy.toFixed(0)} ${vw.toFixed(0)} ${vh.toFixed(0)}" role="img" aria-label="Mapa Egypta">${g}</svg>`;
}
