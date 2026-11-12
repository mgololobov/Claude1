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
  let g = `<defs><radialGradient id="${id}b" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="${shade(col, 0.45)}"/><stop offset="1" stop-color="${shade(col, -0.45)}"/></radialGradient><pattern id="${id}d" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M7 0 L14 7 L7 14 L0 7z" fill="none" stroke="#e3bd5a" stroke-width=".7" opacity=".4"/><circle cx="7" cy="7" r=".9" fill="#e3bd5a" opacity=".5" stroke="none"/></pattern></defs><rect width="100" height="120" fill="url(#${id}b)" stroke="none"/><rect width="100" height="120" fill="url(#${id}d)" stroke="none"/>`;
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
  for (const dx of [-7.5, 7.5]) g += `<path d="M${50 + (dx - 3.5) * s} ${ey} Q${50 + dx * s} ${ey - 2.7 * s} ${50 + (dx + 3.5) * s} ${ey} Q${50 + dx * s} ${ey + 1.8 * s} ${50 + (dx - 3.5) * s} ${ey}Z" fill="#f6efe0" stroke-width=".5"/><circle cx="${50 + dx * s}" cy="${ey - 0.2 * s}" r="${1.25 * s}" fill="${eye}" stroke="none"/><circle cx="${50 + dx * s}" cy="${ey - 0.2 * s}" r="${.55 * s}" fill="#111" stroke="none"/><path d="M${50 + (dx - 3.6) * s} ${ey} Q${50 + dx * s} ${ey - 2.9 * s} ${50 + (dx + 3.6) * s} ${ey}" fill="none" stroke-width="1"/><path d="M${50 + (dx - 4) * s} ${ey - (4 + (c.traits.includes("kruty") || c.traits.includes("prchlivy") ? (dx < 0 ? -1 : 1) * -1 : 0)) * s} q${4 * s} ${-2 * s} ${8 * s} 0" stroke="${shade(hairC, -0.3)}" stroke-width="${1.4 * s}" fill="none" stroke-linecap="round"/>`;
  g += `<path d="M50 ${ey + 2 * s} Q${47.5} ${ey + 9 * s} 49 ${ey + 10 * s} Q51 ${ey + 11 * s} 53 ${ey + 9.5 * s}" stroke="#2a1c12" stroke-width=".9" fill="none"/>`;
  const smile = c.traits.includes("laskavy") || c.traits.includes("stedry") ? 2 : c.traits.includes("kruty") || c.traits.includes("lakomy") ? -1.2 : 0.5;
  g += `<path d="M${50 - 5 * s} ${ey + 15 * s} Q50 ${ey + (15 + smile) * s} ${50 + 5 * s} ${ey + 15 * s}" stroke="#8a4a3a" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
  if (fem || kid) g += `<circle cx="${50 - 11 * s}" cy="${ey + 9 * s}" r="${3 * s}" fill="#e88a7a" opacity=".2" stroke="none"/><circle cx="${50 + 11 * s}" cy="${ey + 9 * s}" r="${3 * s}" fill="#e88a7a" opacity=".2" stroke="none"/>`;
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
  return `<svg class="${cls_}" width="${size}" height="${Math.round(size * 1.2)}" viewBox="0 0 100 120" role="img" aria-label="${esc(c.n)}"><title>${esc(c.n)}${a >= 0 ? ", " + a + " let" : ""}</title><clipPath id="${id}c"><rect width="100" height="120" rx="8"/></clipPath><g clip-path="url(#${id}c)" stroke="#2a1c12" stroke-width=".9" stroke-linejoin="round" stroke-linecap="round">${g}</g>${c.st === "cap" ? `<path d="M10 20 L90 100 M90 20 L10 100" stroke="rgba(60,40,30,.55)" stroke-width="5"/>` : ""}</svg>`;
}

// ---------- ilustrace událostí ----------
const EVENT_ART = { neuroda: "neuroda", uroda: "uroda", mor: "mor", kacir: "cirkev", lapkove: "les", kometa: "kometa", rytir: "dvur", kupci: "obchod", spor: "dvur", stavitel: "stavba", ucenec: "uceni", legat: "cirkev", prusko: "valka", pozar: "pozar", zila: "dul", nemoc: "mor", zrada: "dvur",
  babenberk: "dvur", rozvod: "rod", kutnahora: "dul", konradin: "valka", kresenbrunn: "valka", _tatari: "tatari", _war: "valka", _lost: "pozar", _succ: "rod", _victory: "rod", _callToArms: "valka", _proposal: "dvur", _ransom: "dvur", _vote: "volba",
  _joust: "turnaj", _duel: "turnaj", _rada: "dvur", _cernasmrt: "mor", _work: "stavba", _kriz: "valka", krize_slechta: "dvur", krize_duchovni: "cirkev", krize_mestane: "obchod", krize_sedlaci: "pozar", _mission: "rod", _peaceOffer: "mir", _battle: "bitva" };
// Výjevy událostí, kresba kraje a bitevní scéna jsou v 14c-mini.js a 14d-miniscenes.js.
