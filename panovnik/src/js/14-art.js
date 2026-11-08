// Kresby: generované portréty postav, ilustrace událostí, kresba kraje a bitevní scéna.

function hashStr(t) { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function prng(seed) { let t = seed | 0; return () => { t = (t + 0x6D2B79F5) | 0; let r = Math.imul(t ^ (t >>> 15), t | 1); r ^= r + Math.imul(r ^ (r >>> 7), r | 61); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
function shade(hex, k) { const [r, g, b] = hexRgb(hex); const f = v => Math.round(clamp(k < 0 ? v * (1 + k) : v + (255 - v) * k, 0, 255)); return `rgb(${f(r)},${f(g)},${f(b)})`; }
let ART_N = 0;

// ---------- portréty ----------
const SKIN = ["#f1d3b8", "#e9c4a2", "#ddb08b", "#f5ddc6", "#d6a780", "#e4bb98"];
const HAIR = ["#2b1d14", "#3f2a1c", "#5a3a22", "#7a4e28", "#a77431", "#c9a35a", "#8a3a1c", "#161412"];
const EYES = ["#4a6b8a", "#5a4632", "#3d5a3a", "#6d7f8f", "#2f2a26"];
function roleOf(c) {
  if (!S || !c) return "pan";
  const C = c.cl && S.clans[c.cl], a = age(S, c);
  if (C && C.leader === c.id) return C.type !== "dyn" ? "biskup" : C.t === "král" || C.titles.some(t => CROWNS[t]) ? "kral" : "vevoda";
  if (c.sex === "f") { const sp = chr(S, c.spouse); if (sp && C && C.leader === sp.id && (C.t === "král")) return "kralovna"; return a < 15 ? "divka" : c.spouse ? "zena" : "pana"; }
  if (a < 15) return "chlapec";
  if (c.c) return "klerik"; if (c.burgher) return "mestan";
  if (st(c, "uda") >= 58 && st(c, "uda") >= st(c, "spr")) return "rytir";
  return "pan";
}
function portrait(c, size = 64, o = {}) {
  if (!c) return `<span class="portrait empty" style="width:${size}px;height:${Math.round(size * 1.2)}px"></span>`;
  const R = prng(hashStr(c.id + c.n)), rp = a => a[Math.floor(R() * a.length)];
  const year = o.year || (S ? S.year : 1256), a = year - c.by, fem = c.sex === "f", role = o.role || roleOf(c), kid = a < 15;
  const col = o.col || (c.cl && S && S.clans[c.cl] ? S.clans[c.cl].col : "#7a6a58"), id = "pt" + (ART_N++);
  const skin = rp(SKIN), baseHair = rp(HAIR), eye = rp(EYES), grey = a >= 62 ? "#e6e1d8" : a >= 48 ? "#8f8a84" : null, hair = grey && !fem ? (R() < 0.5 ? grey : baseHair) : baseHair;
  const hairC = a >= 62 ? "#e6e1d8" : a >= 50 && R() < 0.6 ? "#9a948c" : hair;
  const s = kid ? 0.82 : 1, fy = kid ? 66 : 60; // posun obličeje
  let g = `<defs><radialGradient id="${id}b" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="${shade(col, 0.45)}"/><stop offset="1" stop-color="${shade(col, -0.45)}"/></radialGradient></defs><rect width="100" height="120" fill="url(#${id}b)"/>`;
  g += `<path d="M0 120 L0 104 Q8 96 0 88 M100 120 L100 104 Q92 96 100 88" stroke="rgba(255,255,255,.12)" stroke-width="2" fill="none"/>`;
  // oděv
  const cloth = role === "klerik" || role === "biskup" ? (role === "biskup" ? "#5b2a6e" : "#2b2622") : role === "mestan" ? rp(["#5b4a32", "#3f5a3a", "#6b3a2a"]) : col;
  g += `<path d="M6 120 C8 98 28 ${88 + (kid ? 6 : 0)} 50 ${88 + (kid ? 6 : 0)} C72 ${88 + (kid ? 6 : 0)} 92 98 94 120 Z" fill="${cloth}"/>`;
  if (role === "rytir") { g += `<path d="M14 120 C16 100 32 92 50 92 C68 92 84 100 86 120 Z" fill="#8a8d91"/>`; for (let y = 96; y < 120; y += 4) for (let x = 18 + (y % 8 ? 2 : 0); x < 84; x += 4) g += `<path d="M${x} ${y} q2 2 4 0" stroke="#5f6266" stroke-width=".7" fill="none"/>`; g += `<path d="M38 120 L40 98 L60 98 L62 120 Z" fill="${col}"/><path d="M47 102 h6 M50 99 v8" stroke="#fff" stroke-width="2"/>`; }
  if (role === "kral" || role === "kralovna" || role === "vevoda") { g += `<path d="M8 120 C10 102 24 94 34 92 L40 104 L50 96 L60 104 L66 92 C76 94 90 102 92 120 L80 120 L76 108 L24 108 L20 120 Z" fill="#f4f1ea"/>`; for (const [x, y] of [[22, 112], [32, 104], [68, 104], [78, 112], [50, 102], [42, 112], [58, 112]]) g += `<path d="M${x} ${y} l1.2 2.5 l-1.2 1 l-1.2 -1z" fill="#111"/>`; g += `<circle cx="50" cy="104" r="3" fill="#e2b13c" stroke="#7a5a1a" stroke-width=".6"/>`; }
  if (role === "klerik" || role === "biskup") g += `<path d="M40 92 L50 104 L60 92" fill="none" stroke="#f4f1ea" stroke-width="3"/>${role === "biskup" ? `<path d="M50 104 v14 M45 109 h10" stroke="#e2b13c" stroke-width="2.4"/>` : ""}`;
  // vlasy vzadu (ženy dlouhé)
  if (fem && role !== "zena" && role !== "kralovna") g += `<path d="M${50 - 25 * s} ${fy - 2} C${50 - 30 * s} ${fy + 30} ${50 - 22 * s} ${fy + 36} ${50 - 16 * s} ${fy + 34} L${50 + 16 * s} ${fy + 34} C${50 + 22 * s} ${fy + 36} ${50 + 30 * s} ${fy + 30} ${50 + 25 * s} ${fy - 2} Z" fill="${hair}"/>`;
  // krk a obličej
  g += `<rect x="${50 - 7 * s}" y="${fy + 14 * s}" width="${14 * s}" height="${16 * s}" fill="${shade(skin, -0.08)}"/>`;
  if (role === "rytir" && !kid) g += `<ellipse cx="50" cy="${fy}" rx="27" ry="30" fill="#8a8d91"/>${Array.from({ length: 6 }, (_, i) => `<path d="M${30 + i * 8} ${fy - 24} v48" stroke="#6f7276" stroke-width=".6" stroke-dasharray="2 2"/>`).join("")}`;
  if (role === "zena" || role === "kralovna") g += `<path d="M${50 - 25 * s} ${fy + 26} C${50 - 30 * s} ${fy - 10} ${50 - 20 * s} ${fy - 28} 50 ${fy - 28} C${50 + 20 * s} ${fy - 28} ${50 + 30 * s} ${fy - 10} ${50 + 25 * s} ${fy + 26} Z" fill="#f2efe6"/><path d="M${50 - 17 * s} ${fy + 18} Q50 ${fy + 34} ${50 + 17 * s} ${fy + 18}" fill="#f2efe6" stroke="#d9d4c8"/>`;
  g += `<ellipse cx="${50 - 19 * s}" cy="${fy + 2}" rx="${3 * s}" ry="${5 * s}" fill="${shade(skin, -0.1)}"/><ellipse cx="${50 + 19 * s}" cy="${fy + 2}" rx="${3 * s}" ry="${5 * s}" fill="${shade(skin, -0.1)}"/>`;
  const jaw = R() < 0.5 ? 0 : 3;
  g += `<path d="M${50 - 18 * s} ${fy - 6 * s} C${50 - 19 * s} ${fy - 26 * s} ${50 + 19 * s} ${fy - 26 * s} ${50 + 18 * s} ${fy - 6 * s} C${50 + 18 * s} ${fy + (12 + jaw) * s} ${50 + 9 * s} ${fy + 22 * s} 50 ${fy + 22 * s} C${50 - 9 * s} ${fy + 22 * s} ${50 - 18 * s} ${fy + (12 + jaw) * s} ${50 - 18 * s} ${fy - 6 * s} Z" fill="${skin}"/>`;
  // vlasy nahoře
  if (!(role === "zena" || role === "kralovna" || role === "rytir" && !kid)) {
    const bald = !fem && a > 45 && R() < 0.35;
    if (role === "klerik" && !kid) g += `<path d="M${50 - 19 * s} ${fy - 4 * s} C${50 - 21 * s} ${fy - 24 * s} ${50 + 21 * s} ${fy - 24 * s} ${50 + 19 * s} ${fy - 4 * s} L${50 + 16 * s} ${fy - 12 * s} C${50 + 10 * s} ${fy - 18 * s} ${50 - 10 * s} ${fy - 18 * s} ${50 - 16 * s} ${fy - 12 * s} Z" fill="${hairC}"/>`;
    else if (bald) g += `<path d="M${50 - 19 * s} ${fy + 2 * s} C${50 - 21 * s} ${fy - 10 * s} ${50 - 16 * s} ${fy - 14 * s} ${50 - 14 * s} ${fy - 10 * s} L${50 - 15 * s} ${fy + 4 * s} Z M${50 + 19 * s} ${fy + 2 * s} C${50 + 21 * s} ${fy - 10 * s} ${50 + 16 * s} ${fy - 14 * s} ${50 + 14 * s} ${fy - 10 * s} L${50 + 15 * s} ${fy + 4 * s} Z" fill="${hairC}"/>`;
    else g += `<path d="M${50 - 21 * s} ${fy + (fem ? 10 : 4) * s} C${50 - 24 * s} ${fy - 30 * s} ${50 + 24 * s} ${fy - 30 * s} ${50 + 21 * s} ${fy + (fem ? 10 : 4) * s} L${50 + 18 * s} ${fy - 6 * s} C${50 + 12 * s} ${fy - 13 * s} ${50 - 2 * s} ${fy - 12 * s} ${50 - 8 * s} ${fy - 16 * s} C${50 - 12 * s} ${fy - 10 * s} ${50 - 16 * s} ${fy - 9 * s} ${50 - 18 * s} ${fy - 6 * s} Z" fill="${hairC}"/>`;
  }
  // oči, obočí, nos, ústa
  const ey = fy - 1 * s;
  for (const dx of [-7.5, 7.5]) g += `<ellipse cx="${50 + dx * s}" cy="${ey}" rx="${3.2 * s}" ry="${2 * s}" fill="#fbf7ee"/><circle cx="${50 + dx * s}" cy="${ey}" r="${1.5 * s}" fill="${eye}"/><circle cx="${50 + dx * s}" cy="${ey}" r="${.6 * s}" fill="#111"/><path d="M${50 + (dx - 4) * s} ${ey - (4 + (c.traits.includes("kruty") || c.traits.includes("prchlivy") ? (dx < 0 ? -1 : 1) * -1 : 0)) * s} q${4 * s} ${-2 * s} ${8 * s} 0" stroke="${shade(hairC, -0.3)}" stroke-width="${1.4 * s}" fill="none" stroke-linecap="round"/>`;
  g += `<path d="M50 ${ey + 2 * s} Q${47.5} ${ey + 9 * s} 49 ${ey + 10 * s} Q51 ${ey + 11 * s} 53 ${ey + 9.5 * s}" stroke="${shade(skin, -0.3)}" stroke-width="1" fill="none"/>`;
  const smile = c.traits.includes("laskavy") || c.traits.includes("stedry") ? 2 : c.traits.includes("kruty") || c.traits.includes("lakomy") ? -1.2 : 0.5;
  g += `<path d="M${50 - 5 * s} ${ey + 15 * s} Q50 ${ey + (15 + smile) * s} ${50 + 5 * s} ${ey + 15 * s}" stroke="#8a4a3a" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
  if (fem || kid) g += `<circle cx="${50 - 11 * s}" cy="${ey + 9 * s}" r="${3 * s}" fill="#e88a7a" opacity=".25"/><circle cx="${50 + 11 * s}" cy="${ey + 9 * s}" r="${3 * s}" fill="#e88a7a" opacity=".25"/>`;
  if (a >= 45) g += `<path d="M${50 - 9 * s} ${fy - 15 * s} q9 -2 18 0 M${50 - 7 * s} ${fy - 12 * s} q7 -1.5 14 0" stroke="${shade(skin, -0.25)}" stroke-width=".7" fill="none"/>`;
  if (c.traits.includes("stateny") && !fem) g += `<path d="M${50 + 10 * s} ${ey + 3 * s} l4 6" stroke="#a5604f" stroke-width="1.2"/>`;
  // vousy
  if (!fem && !kid && a >= 19 && (role !== "klerik" && role !== "biskup") && R() < 0.75) {
    const full = R() < 0.6;
    if (full) g += `<path d="M${50 - 18 * s} ${fy + 2 * s} C${50 - 18 * s} ${fy + 26 * s} ${50 - 6 * s} ${fy + 32 * s} 50 ${fy + 32 * s} C${50 + 6 * s} ${fy + 32 * s} ${50 + 18 * s} ${fy + 26 * s} ${50 + 18 * s} ${fy + 2 * s} C${50 + 14 * s} ${fy + 14 * s} ${50 + 6 * s} ${fy + 12 * s} 50 ${fy + 14 * s} C${50 - 6 * s} ${fy + 12 * s} ${50 - 14 * s} ${fy + 14 * s} ${50 - 18 * s} ${fy + 2 * s} Z" fill="${hairC}"/><path d="M${50 - 4 * s} ${ey + 15 * s} q4 1.5 8 0" stroke="#7a3a2a" stroke-width="1.2" fill="none"/>`;
    else g += `<path d="M${50 - 8 * s} ${ey + 13 * s} q8 -4 16 0 q-8 1 -16 0z" fill="${hairC}"/>`;
  }
  // pokrývka hlavy
  const top = fy - 22 * s;
  if (role === "kral" || role === "kralovna") g += `<path d="M${50 - 20 * s} ${top + 2} L${50 - 22 * s} ${top - 12} L${50 - 12 * s} ${top - 4} L50 ${top - 16} L${50 + 12 * s} ${top - 4} L${50 + 22 * s} ${top - 12} L${50 + 20 * s} ${top + 2} Z" fill="#e2b13c" stroke="#7a5a1a" stroke-width="1"/><circle cx="50" cy="${top - 2}" r="2.2" fill="#c0392b"/><circle cx="${50 - 12 * s}" cy="${top - 1}" r="1.6" fill="#2471a3"/><circle cx="${50 + 12 * s}" cy="${top - 1}" r="1.6" fill="#2471a3"/>`;
  else if (role === "vevoda") g += `<path d="M${50 - 20 * s} ${top + 3} C${50 - 22 * s} ${top - 16} ${50 + 22 * s} ${top - 16} ${50 + 20 * s} ${top + 3} Z" fill="${shade(col, -0.2)}"/><rect x="${50 - 21 * s}" y="${top - 1}" width="${42 * s}" height="6" rx="3" fill="#f4f1ea"/><circle cx="50" cy="${top - 10}" r="2" fill="#e2b13c"/>`;
  else if (role === "biskup") g += `<path d="M${50 - 16 * s} ${top + 4} L${50 - 14 * s} ${top - 20} L50 ${top - 30} L${50 + 14 * s} ${top - 20} L${50 + 16 * s} ${top + 4} Z" fill="#f4f1ea" stroke="#c9a35a" stroke-width="1.5"/><path d="M50 ${top - 22} v18 M45 ${top - 15} h10" stroke="#e2b13c" stroke-width="2"/>`;
  else if (role === "pan" && !kid && R() < 0.4) g += `<path d="M${50 - 21 * s} ${top + 4} C${50 - 22 * s} ${top - 10} ${50 + 22 * s} ${top - 10} ${50 + 21 * s} ${top + 4} C${50 + 26 * s} ${top + 2} ${50 + 26 * s} ${top - 4} ${50 + 18 * s} ${top - 6} Z" fill="${shade(col, -0.35)}"/>`;
  else if (role === "mestan") g += `<path d="M${50 - 20 * s} ${top + 4} Q50 ${top - 14} ${50 + 20 * s} ${top + 4} Z" fill="#3a2f26"/>`;
  else if (role === "pana" || role === "divka") g += `<path d="M${50 - 18 * s} ${top + 5} Q50 ${top - 4} ${50 + 18 * s} ${top + 5}" stroke="#e2b13c" stroke-width="1.6" fill="none"/>`;
  const cls_ = `portrait${c.st === "dead" ? " dead" : ""}${c.st === "cap" ? " cap" : ""}`;
  return `<svg class="${cls_}" width="${size}" height="${Math.round(size * 1.2)}" viewBox="0 0 100 120" role="img" aria-label="${esc(c.n)}"><title>${esc(c.n)}${a >= 0 ? ", " + a + " let" : ""}</title><clipPath id="${id}c"><rect width="100" height="120" rx="8"/></clipPath><g clip-path="url(#${id}c)">${g}</g>${c.st === "cap" ? `<path d="M10 20 L90 100 M90 20 L10 100" stroke="rgba(60,40,30,.55)" stroke-width="5"/>` : ""}</svg>`;
}

// ---------- ilustrace událostí ----------
const EVENT_ART = { neuroda: "neuroda", uroda: "uroda", mor: "mor", kacir: "cirkev", lapkove: "les", kometa: "kometa", rytir: "dvur", kupci: "obchod", spor: "dvur", stavitel: "stavba", ucenec: "uceni", legat: "cirkev", prusko: "valka", pozar: "pozar", zila: "dul", nemoc: "mor", zrada: "dvur",
  babenberk: "dvur", rozvod: "rod", kutnahora: "dul", konradin: "valka", kresenbrunn: "valka", _tatari: "tatari", _war: "valka", _lost: "pozar", _succ: "rod", _victory: "rod", _callToArms: "valka", _proposal: "dvur", _ransom: "dvur", _vote: "volba",
  _joust: "turnaj", _duel: "turnaj", _rada: "dvur", _cernasmrt: "mor", _work: "stavba", _kriz: "valka", krize_slechta: "dvur", krize_duchovni: "cirkev", krize_mestane: "obchod", krize_sedlaci: "pozar", _mission: "rod", _peaceOffer: "mir", _battle: "bitva" };
function scene(kind, w = 640, h = 170) {
  const id = "sc" + (ART_N++), night = kind === "kometa" || kind === "mor" || SCENE_NIGHT.includes(kind), storm = kind === "neuroda" || kind === "pozar" || kind === "tatari" || SCENE_STORM.includes(kind);
  const sky = night ? ["#0e1530", "#2b3557"] : storm ? ["#4a4a52", "#8a7a6a"] : kind === "rod" || kind === "dvur" || kind === "volba" || kind === "uceni" || SCENE_IN.includes(kind) ? ["#3a2416", "#6a4428"] : kind === "sucho" || kind === "karavana" ? ["#e9b86a", "#f6e3b0"] : ["#7fa8c9", "#e9d9b0"];
  let g = `<defs><linearGradient id="${id}s" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#${id}s)"/>`;
  const R = prng(hashStr(kind)), hills = (y, col) => { let d = `M0 ${h} L0 ${y}`; for (let x = 0; x <= w; x += 40) d += ` Q${x + 20} ${y - 10 - R() * 25} ${x + 40} ${y + (R() - 0.5) * 10}`; return `<path d="${d} L${w} ${h} Z" fill="${col}"/>`; };
  const indoor = ["rod", "dvur", "volba", "uceni"].includes(kind) || SCENE_IN.includes(kind);
  if (indoor) {
    g += `<rect y="${h - 30}" width="${w}" height="30" fill="#2a1a10"/>`; for (let x = 20; x < w; x += 120) g += `<path d="M${x} ${h - 30} V40 Q${x + 40} 0 ${x + 80} 40 V${h - 30}" fill="none" stroke="#7a5a3a" stroke-width="6"/><rect x="${x + 25}" y="50" width="30" height="60" fill="#c9a35a" opacity=".25"/>`;
    for (let x = 60; x < w; x += 160) g += `<path d="M${x} 30 h26 v60 l-13 -10 l-13 10 z" fill="#8c2f1f"/><path d="M${x + 13} 45 l4 8 h-8z" fill="#e2b13c"/>`;
  } else {
    if (night) for (let i = 0; i < 40; i++) g += `<circle cx="${R() * w}" cy="${R() * h * 0.6}" r="${R() * 1.2 + 0.3}" fill="#fff" opacity="${0.4 + R() * 0.6}"/>`;
    else if (!storm) g += `<circle cx="${w * 0.82}" cy="40" r="20" fill="#f6e3a1" opacity=".9"/>`;
    if (storm) for (let i = 0; i < 5; i++) g += `<ellipse cx="${R() * w}" cy="${20 + R() * 30}" rx="${60 + R() * 60}" ry="18" fill="#3a3a40" opacity=".7"/>`;
    g += hills(h * 0.55, kind === "tatari" ? "#9a9a6a" : "#7f8f6a") + hills(h * 0.72, kind === "uroda" ? "#c9a64a" : kind === "zima" ? "#e8edf0" : "#5f7a4a");
  }
  const soldier = (x, y, col, sp = 1) => `<g transform="translate(${x} ${y}) scale(${sp})"><circle cx="0" cy="-14" r="3" fill="#3a2e22"/><rect x="-3" y="-11" width="6" height="11" fill="${col}"/><path d="M4 -24 V2" stroke="#3a2e22" stroke-width="1"/></g>`;
  const banner = (x, y, col) => `<path d="M${x} ${y} V${y - 40}" stroke="#3a2e22" stroke-width="2"/><path d="M${x} ${y - 40} h22 v14 l-6 -3 l-6 3 l-10 -3z" fill="${col}"/>`;
  const castle = (x, y, k = 1) => `<g transform="translate(${x} ${y}) scale(${k})" fill="#6a5a4a"><rect x="-30" y="-30" width="60" height="30"/><rect x="-36" y="-50" width="14" height="50"/><rect x="22" y="-50" width="14" height="50"/><rect x="-8" y="-62" width="16" height="32"/>${[-36, -29, 22, 29, -8, 1].map(xx => `<rect x="${xx}" y="${xx === -8 || xx === 1 ? -66 : -54}" width="5" height="4"/>`).join("")}<path d="M-6 0 v-12 a6 6 0 0 1 12 0 v12z" fill="#2a2018"/></g>`;
  switch (kind) {
    case "valka": case "bitva": g += banner(w * 0.2, h - 30, "#b3261e") + banner(w * 0.78, h - 30, "#1f4e8c"); for (let i = 0; i < 14; i++) g += soldier(w * 0.22 + i * 14 + (i % 2) * 4, h - 22 + (i % 3) * 4, "#b3261e"); for (let i = 0; i < 14; i++) g += soldier(w * 0.55 + i * 14 + (i % 2) * 4, h - 22 + (i % 3) * 4, "#1f4e8c"); if (kind === "valka") g += `<g transform="translate(${w / 2} 60)"><path d="M-30 30 L30 -30 M30 30 L-30 -30" stroke="#ddd" stroke-width="6" stroke-linecap="round"/><path d="M-30 30 L30 -30 M30 30 L-30 -30" stroke="#666" stroke-width="2"/></g>`; break;
    case "mor": for (let i = 0; i < 7; i++) { const x = 60 + i * 80; g += `<path d="M${x} ${h - 20} v-26 M${x - 9} ${h - 38} h18" stroke="#c9c2b0" stroke-width="4"/>`; } g += `<rect x="${w * 0.8}" y="${h - 60}" width="10" height="30" fill="#f4efe0"/><path d="M${w * 0.8 + 5} ${h - 64} q-4 -8 0 -12 q4 4 0 12" fill="#f3b33d"/>`; break;
    case "uroda": for (let x = 0; x < w; x += 8) g += `<path d="M${x} ${h} V${h - 40 + (x % 16)}" stroke="#a8862e" stroke-width="2"/>`; for (let i = 0; i < 4; i++) g += `<path d="M${120 + i * 130} ${h - 20} l-12 -32 h24 z" fill="#d9b34a" stroke="#8a6a1e"/>`; break;
    case "neuroda": for (let i = 0; i < 60; i++) { const x = R() * w; g += `<path d="M${x} ${40 + R() * 40} l-6 18" stroke="#9fb3c9" stroke-width="1.2"/>`; } for (let x = 0; x < w; x += 10) g += `<path d="M${x} ${h} l14 -10" stroke="#7a6a3a" stroke-width="2"/>`; g += `<path d="M${w * 0.6} 30 l-14 30 h12 l-10 26" stroke="#ffe680" stroke-width="3" fill="none"/>`; break;
    case "cirkev": g += `<g fill="#8a7a6a" transform="translate(${w / 2} ${h - 18})"><rect x="-60" y="-50" width="120" height="50"/><path d="M-60 -50 L0 -80 L60 -50z"/><rect x="-80" y="-110" width="26" height="110"/><rect x="54" y="-110" width="26" height="110"/><path d="M-80 -110 l13 -26 l13 26z M54 -110 l13 -26 l13 26z"/><circle cx="0" cy="-34" r="12" fill="#c9a35a"/><path d="M-10 0 v-22 a10 10 0 0 1 20 0 v22z" fill="#3a2e22"/></g>`; for (let i = 0; i < 6; i++) g += `<path d="M${w / 2} 10 L${w / 2 - 200 + i * 80} ${h}" stroke="#fff3c0" stroke-width="10" opacity=".08"/>`; break;
    case "obchod": g += `<path d="M0 ${h - 18} L${w} ${h - 30}" stroke="#b39b70" stroke-width="16"/><g transform="translate(${w * 0.35} ${h - 34})"><rect x="0" y="-22" width="70" height="22" fill="#8a5a2b"/>${[8, 30, 52].map(x => `<ellipse cx="${x + 6}" cy="-28" rx="8" ry="10" fill="#6a4423"/>`).join("")}<circle cx="12" cy="2" r="9" fill="none" stroke="#3a2e22" stroke-width="3"/><circle cx="58" cy="2" r="9" fill="none" stroke="#3a2e22" stroke-width="3"/><path d="M-30 -10 h30" stroke="#3a2e22" stroke-width="2"/><ellipse cx="-42" cy="-12" rx="14" ry="9" fill="#5a4a3a"/></g>` + castle(w * 0.82, h - 26, 0.9); break;
    case "tatari": for (let i = 0; i < 9; i++) { const x = 40 + i * 64, y = h - 24 - (i % 2) * 8; g += `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="0" rx="16" ry="7" fill="#3a2a1a"/><path d="M-12 4 v10 M10 4 v10 M14 -2 l8 -8" stroke="#3a2a1a" stroke-width="3"/><circle cx="0" cy="-14" r="4" fill="#3a2a1a"/><path d="M-4 -12 q-8 -6 -2 -14" stroke="#5a3a1a" stroke-width="1.5" fill="none"/></g>`; } for (let i = 0; i < 3; i++) g += `<path d="M${w * 0.15 + i * 200} ${h * 0.55} q-10 -30 6 -60 q10 -20 -4 -40" stroke="#555" stroke-width="14" opacity=".35" fill="none"/>`; break;
    case "pozar": for (let i = 0; i < 9; i++) { const x = 40 + i * 66; g += `<path d="M${x} ${h - 16} v-30 l16 -14 l16 14 v30z" fill="#4a3a2a"/><path d="M${x + 6} ${h - 46} q6 -24 14 -6 q8 -20 10 4 q-12 10 -24 2z" fill="#e8742a" opacity=".85"/>`; } break;
    case "kometa": g += `<path d="M${w * 0.2} 30 L${w * 0.7} 70" stroke="#fff" stroke-width="10" opacity=".12"/><path d="M${w * 0.3} 38 L${w * 0.7} 70" stroke="#fff6d0" stroke-width="3" opacity=".5"/><circle cx="${w * 0.7}" cy="70" r="7" fill="#fffbe8"/>`; break;
    case "les": for (let i = 0; i < 18; i++) { const x = R() * w, y = h - 10 - R() * 30; g += `<path d="M${x} ${y} l12 -36 l12 36z" fill="#2f5a2a"/><path d="M${x + 12} ${y} v8" stroke="#3a2a1a" stroke-width="3"/>`; } g += castle(w * 0.7, h * 0.58, 0.6); break;
    case "stavba": g += `<g transform="translate(${w / 2} ${h - 18})" fill="#9a8a7a"><rect x="-70" y="-60" width="140" height="60"/><rect x="-90" y="-100" width="30" height="100"/><path d="M60 -100 h30 v100 h-30z" fill="none" stroke="#6a4a2a" stroke-width="3"/>${[-90, -70, -50].map(y => `<path d="M58 ${y} h36" stroke="#6a4a2a" stroke-width="2"/>`).join("")}<circle cx="150" cy="-40" r="26" fill="none" stroke="#6a4a2a" stroke-width="4"/><path d="M150 -66 V0 M124 -40 H176" stroke="#6a4a2a" stroke-width="2"/></g>`; break;
    case "dul": g += `<path d="M0 ${h} L${w * 0.3} 40 L${w * 0.6} 90 L${w} 50 L${w} ${h}z" fill="#7a6a5a"/><path d="M${w * 0.4} ${h - 10} v-40 h50 v40" fill="#2a2018" stroke="#5a3a1a" stroke-width="6"/><path d="M${w * 0.4 - 30} ${h - 6} h110" stroke="#5a4a3a" stroke-width="4"/>${[0, 1, 2].map(i => `<circle cx="${w * 0.6 + i * 30}" cy="${h - 20}" r="7" fill="#d9d9e0"/>`).join("")}`; break;
    case "mir": g += `<g transform="translate(${w / 2} ${h / 2 + 10})"><rect x="-90" y="-46" width="180" height="92" rx="6" fill="#efe3c5" stroke="#a88a4a" stroke-width="2"/>${[-26, -12, 2, 16].map(y => `<path d="M-70 ${y} h140" stroke="#8a7a5a" stroke-width="2"/>`).join("")}<circle cx="60" cy="34" r="16" fill="#9a2a1a"/><path d="M52 34 h16 M60 26 v16" stroke="#e8c070" stroke-width="2"/></g>`; break;
    case "rod": g += `<g transform="translate(${w / 2} ${h - 34})"><ellipse cx="0" cy="10" rx="60" ry="12" fill="#8c2f1f"/><path d="M-34 0 L-38 -36 L-18 -18 L0 -44 L18 -18 L38 -36 L34 0z" fill="#e2b13c" stroke="#7a5a1a" stroke-width="2"/><circle cx="0" cy="-22" r="5" fill="#c0392b"/></g>`; break;
    case "dvur": g += `<g transform="translate(${w / 2} ${h - 30})"><rect x="-30" y="-70" width="60" height="70" fill="#5a3a22"/><rect x="-24" y="-90" width="48" height="24" fill="#8c2f1f"/><path d="M-24 -90 l24 -12 l24 12" fill="#e2b13c"/></g>`; for (let i = 0; i < 6; i++) g += soldier(80 + i * 90, h - 30, ["#5a3a6a", "#2f5d50", "#8a5a2b"][i % 3], 1.3); break;
    case "volba": for (let i = 0; i < 7; i++) g += `<g transform="translate(${60 + i * 84} ${h - 30})"><rect x="-14" y="-40" width="28" height="40" fill="#5a3a22"/><rect x="-16" y="-50" width="32" height="12" fill="${["#c0392b", "#1f4e8c", "#e2b13c", "#2c3e50", "#8e44ad", "#c0392b", "#16a085"][i]}"/></g>`; break;
    case "uceni": g += `<rect x="${w * 0.25}" y="${h - 60}" width="${w * 0.5}" height="12" fill="#5a3a22"/><path d="M${w * 0.45} ${h - 62} q20 -14 40 0 q20 -14 40 0 v-4 q-20 -14 -40 0 q-20 -14 -40 0z" fill="#efe3c5" stroke="#8a7a5a"/><rect x="${w * 0.3}" y="${h - 86}" width="8" height="24" fill="#f4efe0"/><path d="M${w * 0.3 + 4} ${h - 90} q-4 -8 0 -12 q4 4 0 12" fill="#f3b33d"/>`; break;
    case "turnaj": { g += `<path d="M0 ${h - 34} H${w}" stroke="#7a5a3a" stroke-width="4"/>`; for (let x = 10; x < w; x += 24) g += `<path d="M${x} ${h - 34} v-14" stroke="#7a5a3a" stroke-width="3"/>`; for (let i = 0; i < 5; i++) g += `<path d="M${60 + i * 120} ${h - 60} l20 -30 l20 30z" fill="${["#c0392b", "#1f4e8c", "#e2b13c", "#2f5d50", "#8e44ad"][i]}"/><path d="M${80 + i * 120} ${h - 90} v-10 h10 v4 h-10" fill="${["#c0392b", "#1f4e8c", "#e2b13c", "#2f5d50", "#8e44ad"][i]}" stroke="#3a2e22"/>`;
      const knight = (x, dir, col) => `<g transform="translate(${x} ${h - 30}) scale(${dir} 1)"><ellipse cx="0" cy="0" rx="22" ry="9" fill="#5a3a22"/><path d="M-14 6 v14 M14 6 v14 M20 -4 l10 -8" stroke="#3a2a1a" stroke-width="4"/><path d="M-20 -6 h40 v10 h-40z" fill="${col}"/><rect x="-5" y="-30" width="12" height="24" fill="${col}"/><circle cx="1" cy="-35" r="6" fill="#9a9da1"/><path d="M8 -22 L70 -30" stroke="#d9c38a" stroke-width="3"/><path d="M-8 -26 h-8 v14 h8z" fill="#e2b13c"/></g>`;
      g += knight(w * 0.36, 1, "#b3261e") + knight(w * 0.64, -1, "#1f4e8c"); break; }
    case "zima": for (let i = 0; i < 60; i++) g += `<circle cx="${R() * w}" cy="${R() * h}" r="1.5" fill="#fff"/>`; break;
    default: if (SCENE_X[kind]) g += SCENE_X[kind](w, h, R, { castle, banner, soldier });
  }
  return `<svg class="scene" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${g}</svg>`;
}

// ---------- kresba kraje ----------
function provArt(p) {
  const w = 300, h = 110, id = "pa" + (ART_N++), C = S.clans[p.occ || p.owner], R = prng(hashStr(p.id));
  let g = `<defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#9fc0d9"/><stop offset="1" stop-color="#efe3c5"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#${id})"/>`;
  if (p.ter === "h") g += `<path d="M0 80 L40 30 L70 60 L110 18 L150 62 L190 26 L230 58 L270 22 L300 50 V${h} H0Z" fill="#8d8478"/><path d="M110 18 l10 12 l-8 -2 l-6 6 z M190 26 l9 10 l-9 -2z M270 22 l8 9 l-8 -2z" fill="#f4f4f4"/>`;
  else if (p.ter === "k") g += `<path d="M0 78 Q50 50 100 70 T200 62 T300 70 V${h} H0Z" fill="#a7a27a"/>`;
  else if (p.ter === "p") g += `<rect x="200" y="70" width="100" height="40" fill="#6f9ab8"/><path d="M200 70 Q220 64 240 72 T300 70" fill="none" stroke="#fff" opacity=".6"/>`;
  g += `<path d="M0 86 Q80 76 160 84 T${w} 82 V${h} H0Z" fill="${{ n: "#a9b56a", k: "#8f9a5a", h: "#7a8a5a", l: "#5f7a45", b: "#6f8a6a", p: "#a9a56a" }[p.ter]}"/>`;
  if (p.ter === "l") for (let i = 0; i < 14; i++) { const x = R() * w, y = 92 + R() * 12; g += `<path d="M${x} ${y} l7 -20 l7 20z" fill="#2f5a2a"/>`; }
  if (p.ter === "b") for (let i = 0; i < 24; i++) { const x = R() * w; g += `<path d="M${x} ${h} v-12" stroke="#4d6a4a" stroke-width="1.5"/>`; }
  if (p.ter === "n" || p.ter === "k") for (let x = 10; x < 120; x += 7) g += `<path d="M${x} ${h} l5 -16" stroke="#c9a64a" stroke-width="2" opacity=".7"/>`;
  if (p.b.vinice) for (let x = 210; x < 290; x += 8) g += `<path d="M${x} ${h - 4} v-12" stroke="#5a7a2a" stroke-width="3" stroke-dasharray="2 2"/>`;
  // hrad
  const cx = 150, cy = 80, k = 0.7 + p.castle * 0.12, stone = "#7a6c5c";
  g += `<path d="M${cx - 50} ${cy + 6} Q${cx} ${cy - 18} ${cx + 50} ${cy + 6}" fill="#8a7a5a"/>`;
  g += `<g transform="translate(${cx} ${cy - 6}) scale(${k})" fill="${stone}">`;
  if (p.castle >= 2) g += `<rect x="-38" y="-22" width="76" height="22"/>${Array.from({ length: 8 }, (_, i) => `<rect x="${-38 + i * 10}" y="-26" width="5" height="4"/>`).join("")}`;
  if (p.castle >= 3) g += `<rect x="-46" y="-40" width="14" height="40"/><rect x="32" y="-40" width="14" height="40"/><path d="M-48 -40 l9 -10 l9 10z M30 -40 l9 -10 l9 10z" fill="#8c2f1f"/>`;
  if (p.castle >= 4) g += `<rect x="-62" y="-28" width="12" height="28"/><rect x="50" y="-28" width="12" height="28"/>`;
  g += `<rect x="-10" y="-56" width="20" height="56"/><path d="M-12 -56 l12 -12 l12 12z" fill="#8c2f1f"/><rect x="-3" y="-44" width="6" height="8" fill="#2a2018"/><path d="M0 -68 V-84" stroke="#3a2e22" stroke-width="1.5"/><path d="M0 -84 h16 v10 h-16z" fill="${C.col}"/></g>`;
  // město
  const houses = (p.b.mesto || 0) * 4 + (p.city ? 3 : 0);
  for (let i = 0; i < houses; i++) { const x = 30 + (i % 7) * 15 + (i > 6 ? 230 - 30 : 0) - (i > 6 ? 0 : 0), y = h - 14 - (i > 13 ? 8 : 0), xx = i < 7 ? x : 205 + (i - 7) * 12; g += `<rect x="${xx}" y="${y}" width="11" height="10" fill="#e8dcc2" stroke="#7a6a58" stroke-width=".5"/><path d="M${xx - 1} ${y} l6.5 -7 l6.5 7z" fill="#a8432a"/>`; }
  if (p.b.klaster) g += `<g transform="translate(60 ${h - 14})" fill="#c9bba0"><rect x="-10" y="-16" width="20" height="16"/><rect x="-4" y="-30" width="8" height="14"/><path d="M-5 -30 l5 -8 l5 8z" fill="#5a3a22"/><path d="M0 -40 v-5 M-2 -43 h4" stroke="#3a2e22"/></g>`;
  if (p.b.dul) g += `<g transform="translate(250 ${h - 10})"><path d="M-14 0 v-16 h28 v16" fill="#2a2018" stroke="#6a4a2a" stroke-width="3"/><circle cx="20" cy="-4" r="4" fill="#ccc"/></g>`;
  if (p.b.pristav) g += `<g transform="translate(260 82)"><path d="M-18 0 h36 l-6 8 h-24z" fill="#6a4423"/><path d="M0 0 v-26" stroke="#3a2e22" stroke-width="1.5"/><path d="M1 -24 q12 10 0 20z" fill="#f4efe0"/></g>`;
  if (p.b.hrebcin) g += `<g transform="translate(95 ${h - 8})" fill="#5a3a22"><ellipse cx="0" cy="-6" rx="8" ry="4"/><path d="M-6 -3 v6 M5 -3 v6 M7 -8 l4 -5" stroke="#5a3a22" stroke-width="2"/></g>`;
  if (p.siege) { for (let i = 0; i < 4; i++) g += `<path d="M${20 + i * 22} ${h - 4} l8 -14 l8 14z" fill="#d9cfb5" stroke="#7a6a58"/>`; g += `<path d="M180 30 q6 -18 12 0 q4 -10 8 2" fill="#e8742a" opacity=".8"/>`; }
  if (p.occ) g += `<g transform="translate(220 40)"><path d="M0 0 V30" stroke="#3a2e22" stroke-width="1.5"/><path d="M0 0 h20 v12 h-20z" fill="${S.clans[p.occ].col}"/></g>`;
  return `<svg class="provart" viewBox="0 0 ${w} ${h}" aria-hidden="true">${g}</svg>`;
}

// ---------- bitevní scéna ----------
function battleScene(b) {
  const w = 640, h = 150, my = b.ps === "A" ? b.A : b.B, foe = b.ps === "A" ? b.B : b.A, ter = S.provs[b.place].ter;
  let g = `<rect width="${w}" height="${h}" fill="${{ n: "#b8c27a", k: "#a2a46a", h: "#9a9278", l: "#6f8a55", b: "#7f9a7a", p: "#b0aa7a" }[ter]}"/><rect width="${w}" height="40" fill="#a9c4d9"/><path d="M0 40 Q160 26 320 38 T640 34 V44 H0Z" fill="${ter === "h" ? "#8d8478" : "#7f8f6a"}"/>`;
  const R2 = prng(hashStr(b.place));
  if (ter === "l") for (let i = 0; i < 16; i++) { const x = R2() * w, y = 44 + R2() * 10; g += `<path d="M${x} ${y} l7 -18 l7 18z" fill="#2f5a2a"/>`; }
  if (ter === "h") g += `<path d="M0 44 L60 12 L120 40 L200 6 L280 40 L360 14 L440 40 L520 10 L640 42 V46 H0Z" fill="#8d8478"/>`;
  for (let i = 0; i < 30; i++) g += `<path d="M${R2() * w} ${60 + R2() * 85} q2 -4 4 0" stroke="rgba(60,80,30,.35)" fill="none"/>`;
  if (foe.castle) g += `<g transform="translate(${w - 70} 70) scale(1.2)" fill="#7a6c5c"><rect x="-30" y="-30" width="60" height="30"/><rect x="-36" y="-46" width="14" height="46"/><rect x="22" y="-46" width="14" height="46"/></g>`;
  const draw = (side, left, col) => {
    let o = "", colIdx = 0; const t = side.t, dir = left ? 1 : -1, x0 = left ? 30 : w - 30 - (foe.castle && !left ? 90 : 0);
    // jízda vzadu, pěchota uprostřed, střelci vpředu (směrem ke středu bojiště)
    for (const k of ["jizda", "pesi", "zoldneri", "strelci"]) {
      const n = Math.min(k === "pesi" ? 30 : 18, Math.ceil((t[k] || 0) / 100)); if (!n) continue;
      for (let j = 0; j < n; j++) { const cIdx = colIdx + Math.floor(j / 5), row = j % 5, x = x0 + dir * cIdx * 27, y = 66 + row * 18 + (cIdx % 2) * 5;
        if (k === "jizda") o += `<g transform="translate(${x} ${y}) scale(${dir * 1.5} 1.5)"><ellipse cx="0" cy="4" rx="9" ry="4" fill="#5a3a22"/><path d="M-6 7 v6 M6 7 v6 M8 1 l5 -5" stroke="#3a2a1a" stroke-width="1.6"/><rect x="-3" y="-8" width="6" height="9" fill="${col}"/><circle cx="0" cy="-11" r="2.6" fill="#8a8d91"/><path d="M4 -6 L18 -10" stroke="#3a2e22" stroke-width="1.2"/></g>`;
        else if (k === "strelci") o += `<g transform="translate(${x} ${y}) scale(${dir * 1.5} 1.5)"><rect x="-2.5" y="-6" width="5" height="10" fill="${col}"/><circle cx="0" cy="-9" r="2.4" fill="#e1bf9a"/><path d="M3 -8 q5 5 0 10" stroke="#5a3a22" stroke-width="1.2" fill="none"/></g>`;
        else o += `<g transform="translate(${x} ${y}) scale(${dir * 1.5} 1.5)"><rect x="-3" y="-6" width="6" height="11" fill="${k === "zoldneri" ? "#5d5d8c" : col}"/><circle cx="0" cy="-9" r="2.6" fill="#8a8d91"/><path d="M4 -16 V6" stroke="#3a2e22" stroke-width="1.2"/><path d="M-6 -2 h4 v6 h-4z" fill="${shade(col, -0.3)}"/></g>`; }
      colIdx += Math.ceil(n / 5);
    }
    o += `<g transform="translate(${x0 - dir * 16} 50)"><path d="M0 70 V0" stroke="#3a2e22" stroke-width="2"/><path d="M0 0 h${dir * 22} v14 l${-dir * 6} -3 l${-dir * 6} 3 l${-dir * 10} -3z" fill="${col}"/></g>`;
    return o; };
  g += draw(my, true, S.clans[my.cl].col) + draw(foe, false, S.clans[foe.cl].col);
  g += `<path d="M${w / 2} 50 V${h - 6}" stroke="rgba(0,0,0,.15)" stroke-width="2" stroke-dasharray="4 4"/>`;
  return `<svg class="scene battle" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${g}</svg>`;
}
