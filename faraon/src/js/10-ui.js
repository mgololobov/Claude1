// Rozhraní: pomocné funkce, znaky rodů, pruhy, grafy a mapa Egypta.
let S = null;
const SEL = { tab: "mapa", prov: null, cmd: {}, logF: "moje", ngScen: "sip", ngClan: "thebes", ngDiff: 1, zoom: "cele", dipl: null, planDone: false };
const me = () => S.player;
const esc = t => String(t == null ? "" : t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = v => Math.round(v).toLocaleString("cs-CZ");
const fmtK = v => Math.abs(v) >= 1e6 ? (r1(v / 1e6) + "").replace(".", ",") + " mil." : Math.abs(v) >= 10000 ? fmt(v / 1000) + " tis." : fmt(v);
const sg = v => (v > 0 ? "+" : v < 0 ? "−" : "") + fmt(Math.abs(v));
const dec = v => String(r1(v)).replace(".", ",");
const ax = a => esc(JSON.stringify(a));
function btn(label, act, args = [], dis = null, cls = "") { return `<button class="b ${cls}" data-a="${act}" data-x="${ax(args)}"${dis ? ` disabled title="${esc(dis)}"` : ""}>${label}</button>`; }
function sel(id, opts, val, attrs = "") { return `<select id="${id}" ${attrs}>${opts.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(val) ? " selected" : ""}>${esc(t)}</option>`).join("")}</select>`; }
const card = (t, body, cls = "") => `<section class="card ${cls}"><h3>${typeof cardHg === "function" ? cardHg(t) : t}</h3>${body}</section>`;
// Tabulky se vykreslují jako karty: první buňka je nadpis, ostatní štítky s popiskem ze záhlaví.
function tbl(head, rows) {
  if (!rows.length) return '<p class="muted small">Nic.</p>';
  return `<div class="rows">${rows.map(r => { const m = r.match(/^<tr class="([^"]*)" ([^>]*)>/) || [], cells = [...r.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)].map(x => x[2]);
    return `<div class="rowcard ${m[1] || ""}" ${m[2] || ""}><div class="rc-t">${cells[0]}</div><div class="rc-f">${cells.slice(1).map((v, i) => { const h = (head[i + 1] || "").replace(/^#/, ""); return h ? `<span class="rc-i"><small>${h}</small><span>${v}</span></span>` : `<span class="rc-a">${v}</span>`; }).join("")}</div></div>`; }).join("")}</div>`;
}
const tblRaw = (head, rows) => rows.length ? `<table><thead><tr>${head.map(h => h.startsWith("#") ? `<th class="n">${h.slice(1)}</th>` : `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>` : '<p class="muted small">Nic.</p>';
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
  rod: "M11 3v5 M5 12v-2h12v2 M5 12v3 M17 12v3 M11 8v7 M3 15h4v4H3z M9 15h4v4H9z M15 15h4v4h-4z", vedeni: "M5 4h10l3 3v13H5z M8 9h7 M8 13h7 M8 17h4", zakony: "M11 3v16 M4 19h14 M5 6h12 M5 6l-3 6a3 3 0 0 0 6 0z M17 6l-3 6a3 3 0 0 0 6 0z", kronika: "M5 3h11l3 3v15H5z M8 8h8 M8 12h8 M8 16h5", hra: "M11 8a3 3 0 1 0 0 .1z M11 2v3 M11 17v3 M2 11h3 M17 11h3",
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
const DELTA_FAN = [[30.15, 31.22], [30.5, 30.85], [30.9, 30.5], [31.35, 30.3], [31.45, 30.42], [31.6, 31.0], [31.48, 31.81], [31.26, 32.3], [31.04, 32.45], [30.79, 31.9], [30.5, 31.6]];
const BAHR = [[27.78, 30.85], [28.5, 30.7], [29.08, 30.88], [29.31, 30.84]];
const MED = [[31.9, 25.0], [31.55, 25.15], [31.35, 27.23], [30.83, 28.95], [31.2, 29.9], [31.32, 30.06], [31.45, 30.4], [31.6, 31.0], [31.48, 31.81], [31.26, 32.3], [31.04, 32.54], [31.13, 33.8], [31.29, 34.24], [31.5, 34.45], [31.9, 34.75]];
const RED = [[29.97, 32.55], [29.3, 32.65], [28.35, 33.08], [27.25, 33.8], [26.75, 33.94], [26.1, 34.28], [25.07, 34.9], [23.9, 35.47], [22.2, 36.6], [19.2, 37.5], [19.2, 38.5], [27.9, 35.2], [28.6, 34.6], [29.5, 34.95], [28.5, 34.45], [27.73, 34.25], [28.2, 33.6], [29.0, 33.1], [29.9, 32.7]];
const pts = L => L.map(([la, lo]) => `${MX(lo).toFixed(1)},${MY(la).toFixed(1)}`).join(" ");
let TERR = { key: null, url: null };
function hexRgb(h) { const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h || ""); return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [136, 136, 136]; }
