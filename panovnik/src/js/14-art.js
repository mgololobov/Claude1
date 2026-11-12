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
// Poprsí v tříčtvrtečním pohledu pod zlatým obloukem, kreslené tušovou linkou jako postavy v rukopisech.
// Podoba (pleť, vlasy, vousy, tvar tváře a nosu) je dána jménem postavy, takže zůstává stejná po celou hru; věk přidává šediny a vrásky.
function portrait(c, size = 64, o = {}) {
  if (!c) return `<span class="portrait empty" style="width:${size}px;height:${Math.round(size * 1.2)}px"></span>`;
  const R = prng(hashStr(c.id + c.n)), rp = a => a[Math.floor(R() * a.length)];
  const year = o.year || (S ? S.year : 1256), a = year - c.by, fem = c.sex === "f", role = o.role || roleOf(c), kid = a < 15;
  const col = o.col || (c.cl && S && S.clans[c.cl] ? S.clans[c.cl].col : "#7a6a58"), id = "pt" + (ART_N++);
  const skin = rp(SKIN), baseHair = rp(HAIR), eye = rp(EYES), fw = 0.95 + R() * 0.1, jaw = R() < 0.45, noseT = Math.floor(R() * 3), beardT = R(), hairT = R(), capT = R(), thick = 1.2 + R() * 0.7;
  const hair = a >= 62 ? "#e3ddd2" : a >= 50 && R() < 0.6 ? "#9a948c" : baseHair, hd = shade(hair, -0.35), sk2 = shade(skin, -0.14), ink = "#2a1c12", G = "#e3bd5a", W = "#f1e9d6", steel = "#aeb4b8";
  const T = k => c.traits.includes(k), stern = T("kruty") || T("prchlivy"), kind = T("laskavy") || T("stedry");
  const fine = d => `<path d="${d}" fill="none" stroke-width=".55" opacity=".55"/>`;
  // pozadí: barva rodu s tapetovým vzorem a zlatý trojlistý oblouk
  let g = `<defs><radialGradient id="${id}b" cx="50%" cy="42%" r="75%"><stop offset="0" stop-color="${shade(col, 0.2)}"/><stop offset="1" stop-color="${shade(col, -0.5)}"/></radialGradient><pattern id="${id}d" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M7 0 L14 7 L7 14 L0 7z" fill="none" stroke="${G}" stroke-width=".7" opacity=".38"/><circle cx="7" cy="7" r=".9" fill="${G}" opacity=".5" stroke="none"/></pattern><pattern id="${id}m" width="5" height="4" patternUnits="userSpaceOnUse"><path d="M0 2 q1.25 2 2.5 0 M2.5 4 q1.25 2 2.5 0 M2.5 0 q1.25 2 2.5 0" fill="none" stroke="#6f7478" stroke-width=".55"/></pattern></defs><rect width="100" height="120" fill="url(#${id}b)" stroke="none"/><rect width="100" height="120" fill="url(#${id}d)" stroke="none"/>`;
  g += `<path d="M0 0 H100 V27 C100 9 78 3 66 11 C60 1 40 1 34 11 C22 3 0 9 0 27Z" fill="${shade(col, -0.62)}" stroke="none"/><path d="M0 27 C0 9 22 3 34 11 C40 1 60 1 66 11 C78 3 100 9 100 27" fill="none" stroke="${G}" stroke-width="2"/>`;
  let f = ""; // postava
  const cleric = role === "klerik" || role === "biskup", crowned = role === "kral" || role === "kralovna", veil = role === "zena" || role === "kralovna", maiden = role === "pana" || role === "divka";
  // ---- oděv ----
  const bust = "M3 121 C5 104 20 97 36 94 L40 91.4 Q51 98 62 91.4 L66 94 C82 97 96 104 98 121Z";
  const tunic = cleric ? (role === "biskup" ? W : rp(["#2c2622", "#4a3a30", "#3a342c"])) : role === "mestan" ? rp(["#7d5a3a", "#3f5a3a", "#6b3a2a", "#4a4a62"]) : crowned ? (fem ? col : "#2f5a94") : role === "rytir" ? steel : col;
  if (maiden) f += `<path d="M28 121 C23 74 26 42 37 31 C45 23 60 23 68 31.6 C76 41 76 76 72 121Z" fill="${hair}"/>` + fine("M31 60 C29 80 30 100 31 118 M70 60 C72 80 71 100 70 118 M34 96 C33 104 33.6 112 34 119");
  f += `<path d="${bust}" fill="${tunic}"/>`;
  if (role === "rytir") f += `<path d="${bust}" fill="url(#${id}m)" stroke="none"/><path d="M24 121 L33 96.4 Q51 108 69 96.4 L78 121Z" fill="${col}"/><path d="M47 108 h8 M51 104 v12" stroke="${G}" stroke-width="2.2"/>`;
  if (crowned || role === "vevoda") { const mc = crowned ? "#b3321f" : shade(col, -0.25);
    f += `<path d="M3 121 C5 104 20 97 36 94 L45 121Z M98 121 C96 104 82 97 66 94 L57 121Z" fill="${mc}"/><path d="M36 94 L45 121 M66 94 L57 121" stroke="${G}" stroke-width="1.6" fill="none"/>`;
    f += `<path d="M20 100.6 C28 95 37 93 40 91.4 Q51 99.6 62 91.4 C65 93 74 95 82 100.6 L77.6 110 Q51 101 24.4 110Z" fill="${W}"/>` + [[28, 103], [36, 100.4], [44, 101.6], [58, 101.6], [66, 100.4], [74, 103], [32, 106.4], [70, 106.4]].map(([x, y]) => `<path d="M${x} ${y} l.9 2.4 l-.9 .9 l-.9 -.9z" fill="${ink}" stroke="none"/>`).join("") + `<circle cx="51" cy="103" r="3.2" fill="${G}"/><circle cx="51" cy="103" r="1.2" fill="#b3321f" stroke="none"/>`; }
  else if (role === "biskup") f += `<path d="M3 121 C5 104 20 97 36 94 L46 121Z M98 121 C96 104 82 97 66 94 L56 121Z" fill="#6a3d6e"/><path d="M35 94.4 L44 121 h4 L39 93Z M67 94.4 L58 121 h-4 L63 93Z" fill="${G}"/><path d="M45 106 h12 v6 h-12z" fill="${G}"/><circle cx="51" cy="109" r="1.6" fill="#b3321f" stroke="none"/>`;
  else if (role === "klerik") f += `<path d="M33 95.6 Q51 108 69 95.6 Q51 101 33 95.6Z" fill="${shade(tunic, 0.14)}"/>` + fine("M20 104 C24 110 26 116 27 121 M80 104 C76 110 74 116 73 121");
  else if (role === "mestan") f += `<path d="M22 100 C30 94.6 37 93 40 91.4 Q51 99.6 62 91.4 C65 93 72 94.6 78 100 L74 106 l-5 -2.4 l-5 3 l-6.4 -2.6 L51 107 l-6.6 -3 l-6.4 2.6 l-5 -3 l-5 2.4Z" fill="${shade(tunic, -0.22)}"/>`;
  else if (role === "pan") f += `<path d="M98 121 C96 104 82 97 66 94 L60 96 C64 104 62 114 56 121Z" fill="${shade(col, -0.4)}"/><circle cx="62" cy="98" r="2.8" fill="${G}"/><path d="M39.6 92.4 Q51 100.4 62.4 92.4" fill="none" stroke="${G}" stroke-width="2"/>`;
  else if (fem || kid) f += `<path d="M39.6 92.4 Q51 ${fem ? 103 : 100.4} 62.4 92.4" fill="none" stroke="${G}" stroke-width="${fem ? 2.2 : 1.6}"/>` + (role === "zena" ? `<path d="M3 121 C5 104 20 97 36 94 L33 121Z M98 121 C96 104 82 97 66 94 L69 121Z" fill="${shade(col, -0.4)}"/><path d="M36 97 Q51 104 66 97" fill="none" stroke="${G}" stroke-width="1"/>` : "");
  if (!cleric && role !== "rytir") f += fine("M30 104 C32 110 33 116 33 121 M72 104 C70 110 69 116 69 121");
  // ---- hlava ----
  let h = "";
  if (role === "rytir" && !kid) h += `<path d="M28 106 C26 70 26 44 37 32 C45 23.6 60 23.6 67.6 32 C75 42 74.4 72 73 104 L51 110Z" fill="${steel}"/><path d="M28 106 C26 70 26 44 37 32 C45 23.6 60 23.6 67.6 32 C75 42 74.4 72 73 104 L51 110Z" fill="url(#${id}m)" stroke="none"/>`;
  if (veil) h += `<path d="M26 104 C22 72 25 41 37.6 30 C46 23 60 23 68 30.6 C75.6 39 76 62 74 80 L73.4 104Z" fill="${W}"/>`;
  h += `<path d="M40 76 L39 96 Q51 103 63 95 L62.4 78Z" fill="${sk2}"/><path d="M40 80 Q51 91 62.4 82 L62.4 78 L40 76Z" fill="${shade(skin, -0.28)}" stroke="none" opacity=".6"/>`;
  if (!veil && !(role === "rytir" && !kid)) h += `<path d="M33.8 54.6 C29.4 52.6 28.6 62 32.2 65.6 C33.6 66.8 34.8 65.4 34.6 63.4Z" fill="${skin}"/>`;
  h += `<path d="M33.5 48 C32.5 58 33.5 68 ${jaw ? "36.6 77" : "38 76"} C42 83.4 47 87.6 53 87.6 C58 87.6 62.6 83.6 65 78 C67.6 72.4 68.7 66 68 60.4 C67.6 57 67 53 66.4 49 C66 38 60 29.6 50 29.6 C40 29.6 34 38 33.5 48Z" fill="${skin}"/>`;
  h += `<path d="M34.4 60 C34 68 37 76 42 82 C40 75 39 68 39.4 61Z" fill="${shade(skin, -0.16)}" stroke="none" opacity=".55"/>`;
  if (fem || kid) h += `<ellipse cx="41.4" cy="69.4" rx="4" ry="2.8" fill="#d9776a" opacity=".22" stroke="none"/><ellipse cx="62.6" cy="69" rx="2.8" ry="2.4" fill="#d9776a" opacity=".2" stroke="none"/>`;
  // oči, obočí
  const lid = stern ? 0.9 : 0, es = kid ? 1.12 : 1;
  h += `<g transform="translate(45 58) scale(${es})"><path d="M-4.5 .4 Q0 ${-3.3 + lid} 4.6 .2 Q0 2.6 -4.5 .4Z" fill="#f6efe0" stroke-width=".5"/><circle cx=".5" cy="-.3" r="1.75" fill="${eye}" stroke="none"/><circle cx=".5" cy="-.3" r=".8" fill="#111" stroke="none"/><circle cx="1.1" cy="-.9" r=".35" fill="#fff" stroke="none"/><path d="M-4.7 .4 Q0 ${-3.6 + lid} 4.8 .2" fill="none" stroke-width="1.15"/></g>`;
  h += `<g transform="translate(60 58) scale(${es})"><path d="M-3.6 .2 Q0 ${-3 + lid} 3.8 .2 Q0 2.4 -3.6 .2Z" fill="#f6efe0" stroke-width=".5"/><circle cx=".4" cy="-.3" r="1.6" fill="${eye}" stroke="none"/><circle cx=".4" cy="-.3" r=".75" fill="#111" stroke="none"/><circle cx=".9" cy="-.9" r=".3" fill="#fff" stroke="none"/><path d="M-3.8 .2 Q0 ${-3.3 + lid} 4 .2" fill="none" stroke-width="1.15"/></g>`;
  const bi = stern ? 1.6 : kind ? -0.6 : 0;
  h += `<path d="M39.6 ${53.4 - bi * 0.6} Q45 ${50.2 + (fem ? 0.6 : 0)} 50.6 ${52.8 + bi} M55.8 ${52.8 + bi} Q60.4 ${50.4 + (fem ? 0.6 : 0)} 64.8 ${53 - bi * 0.6}" fill="none" stroke="${hd}" stroke-width="${fem || kid ? 1 : thick}"/>`;
  // nos, ústa
  h += noseT === 0 ? `<path d="M53.4 54.4 C54.6 60 58.8 65 58.6 69.4 C58.4 71.8 55.6 72.6 53.4 71.4" fill="none"/>` : noseT === 1 ? `<path d="M53.4 54.4 C56.4 58 60.6 63.6 59.6 69 C59 71.8 56 72.6 53.4 71.2" fill="none"/>` : `<path d="M53.4 54.4 C54 60 57 64.6 57.4 68.4 C57.4 70.8 55.2 71.8 53.2 70.8" fill="none"/>`;
  h += `<path d="M50.6 70.4 q1.2 1.3 2.6 .9" fill="none" stroke-width=".7"/>`;
  const sm = kind ? 1.5 : stern ? -0.9 : 0.3, lip = fem ? "#b9584e" : shade(skin, -0.3);
  h += `<path d="M48.2 77.4 Q51 75.6 53.6 76.7 Q56 75.6 58.8 77 Q53.6 ${78.6 + sm} 48.2 77.4Z" fill="${lip}" stroke-width=".5"/><path d="M47.6 77.3 Q53.6 ${78.3 + sm} 59.4 76.9" fill="none" stroke-width=".9"/><path d="M50 79.6 Q53.8 81.6 57.4 79.4" fill="none" stroke-width=".6" opacity=".6"/>`;
  if (a >= 45) h += fine("M40 43.6 Q50 41.6 61 43.6 M42 46.8 Q50 45.4 60 46.8 M48.6 70 Q46.2 74 47.2 78.4 M37.4 57 l-2.2 -1 M37.4 59 l-2.2 .7");
  if (a >= 60) h += fine("M41.6 61.6 Q45 63 48.6 61.4 M57 61.4 Q60 62.8 63.4 61.4 M60.6 70 Q62.4 74 61 78");
  if (T("stateny") && !fem) h += `<path d="M61.4 61.6 l3.6 7.4" stroke="#9a4f42" stroke-width="1.1" fill="none"/>`;
  // vousy
  const canBeard = !fem && !kid && a >= 19 && !cleric && beardT < 0.78;
  if (canBeard) {
    if (beardT < 0.3) h += `<path d="M34.6 62 C35 72 39 82 46 88 C50.6 91.6 57 91.6 61 87.6 C65.4 83 67.6 74 68 66 C65.6 71 63 74.4 60.6 75 C57 72.6 50.4 72.6 46.6 75.4 C42 74.6 37.6 70 34.6 62Z" fill="${hair}"/>` + fine("M40 76 l2 7 M46 79 l1.4 8 M53 80 v9 M59 79 l-1.6 8 M64 74 l-2.4 8");
    else if (beardT < 0.5) h += `<path d="M34.6 62 C35 72 37 84 44 95 C47 99 50.6 102 53.6 104 C57 101 60.6 97 63 92 C66.6 84 67.6 74 68 66 C65.6 71 63 74.4 60.6 75 C57 72.6 50.4 72.6 46.6 75.4 C42 74.6 37.6 70 34.6 62Z" fill="${hair}"/>` + fine("M40 77 l3 12 M46 80 l3 16 M53.6 81 v20 M60 80 l-3 15 M64.6 75 l-3 12");
    else h += `<path d="M47.4 75.7 C50 73.2 52.6 74.2 53.6 75.3 C54.8 74.2 57.8 73.4 60 75.6 C57.6 76.6 55.4 76.6 53.6 76.7 C51.6 76.6 50 76.6 47.4 75.7Z" fill="${hair}"/>` + (beardT < 0.64 ? `<path d="M49 82.6 C50 88.6 57 88.6 58.6 82.4 C55.6 84 52 84 49 82.6Z" fill="${hair}"/>` : "");
    if (beardT < 0.5) h += `<path d="M48.2 77.4 Q51 75.6 53.6 76.7 Q56 75.6 58.8 77 Q53.6 ${78.6 + sm} 48.2 77.4Z" fill="${lip}" stroke-width=".5"/><path d="M47 75.8 C50 73.4 52.6 74.2 53.6 75.3 C54.8 74.2 57.8 73.4 60.4 75.6" fill="none" stroke="${hd}" stroke-width="1.6"/>`;
  }
  // vlasy
  const bob = `<path d="M31 71 C26.6 60 27 40 36 31 C44 23 60 23 67.4 32 C71.4 38 72 46 70.8 54 L67 50 C67.4 44 66 40 63 38 C56 40.8 46 40.2 39.6 37.6 C36.6 42 35.6 47 35.4 52 L35.8 64 C35.8 69.4 34 72.4 31 71Z" fill="${hair}"/><path d="M67.4 50 C70.8 56 70.8 64 68.8 69.6 C67.6 66 67.8 60 67.2 56Z" fill="${hair}"/>` + fine("M34 40 C32 48 31.6 58 32.6 66 M44 27.6 C42 31 40.6 34 39.8 37.4 M54 26 C55 30 58 35 62.6 37.8 M62 28 C65.6 32 68 38 68.6 46");
  const short = `<path d="M33.4 51 C31 38 40 26 52 26.6 C62 27 69.4 35 67.6 49 C65.8 42.6 62 38.8 58 38.2 C50 39.8 42 39.2 38.6 38.6 C35.6 41.8 34.4 46 33.4 51Z" fill="${hair}"/>` + fine("M40 30.6 C38.6 33.6 38 36 38.2 38.4 M50 27.2 C49 31 49.6 35 51 38.8 M60 29.6 C61.6 33 62 36 61.6 38.4");
  if (veil) h += `<path d="M34.4 52 C34 43 41 35.6 51 35.2 C60 35.4 66.4 41 67 50 C63 44 57.6 41 51 40.8 C44 41.2 38.4 45 34.4 52Z" fill="${W}"/><path d="M35.6 68 C38 81 45 90.8 53 90.8 C60.4 90.8 65.4 84 67.4 73 L67 100 L37 100Z" fill="${W}"/>` + fine("M28 60 C27 76 28 90 29 102 M72 58 C73 74 72.6 90 72 102 M42 92 C46 96 56 96 62 91");
  else if (maiden) h += `<path d="M34.6 52 C33.6 40 41 31.6 51 31 C60 31.4 67.4 38 67.2 50 C64 43 58 38.8 51 38.6 C44 39 38.6 43.6 34.6 52Z" fill="${hair}"/>` + fine("M51 31.4 V38.6 M42 34 C40 37 38.6 41 38 45 M60 34 C62 37 63.6 41 64.4 45") + (role === "pana" ? `<path d="M33.8 45 Q51 37 67.4 44" fill="none" stroke="${G}" stroke-width="1.8"/><circle cx="51" cy="40.4" r="1.6" fill="#b3321f" stroke-width=".5"/>` : `<path d="M34 46 Q51 39 67.2 45" fill="none" stroke="#b3321f" stroke-width="1.4"/>`);
  else if (role === "rytir" && !kid) h += `<path d="M34.6 52 C33.6 42 41 34.6 51 34.2 C60 34.4 66.6 40.6 67 50" fill="none" stroke-width="1"/>`;
  else if (cleric && !kid) h += short + `<ellipse cx="50.6" cy="29.2" rx="10" ry="3.6" fill="${skin}"/>`;
  else if (!fem && !kid && a > 44 && hairT < 0.3) h += `<path d="M33.6 52 C31.6 46 32.6 41 35.2 38.4 C35 44 35.4 48 36 53 C35.6 58 35.2 61 34 63.6 C32.6 60 32.8 55.6 33.6 52Z" fill="${hair}"/><path d="M66.6 49 C68.6 52 69 57 68 61 C67.6 57 67.2 53 66.6 49Z" fill="${hair}"/>`;
  else h += kid || hairT > 0.72 ? short : bob;
  // pokrývka hlavy
  if (crowned) { const dy = veil ? -3 : 0; h += `<g transform="translate(0 ${dy})"><path d="M34.4 37.4 L33.2 25.6 L39.4 30.6 L43.6 21 L48 29.6 L52 19 L56 29.6 L60.6 21 L64.2 30.6 L70 25.6 L68.4 37.6 Q51 42 34.4 37.4Z" fill="${G}"/><path d="M35 33.6 Q51 38 68.6 33.6" fill="none" stroke-width=".6"/>${[[43.6, 21], [52, 19], [60.6, 21]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.5" fill="${G}"/>`).join("")}<circle cx="52" cy="34" r="1.9" fill="#b3321f" stroke-width=".5"/><circle cx="42.6" cy="33.4" r="1.5" fill="#2f5a94" stroke-width=".5"/><circle cx="61.6" cy="33.4" r="1.5" fill="#3d7a56" stroke-width=".5"/></g>`; }
  else if (role === "vevoda") h += `<path d="M34 38 C33 24 44 19 52 19 C61 19 70 25 68.8 38Z" fill="${shade(col, -0.3)}"/><path d="M32.4 35.6 Q51 42.4 70.2 35.6 L70.6 41.6 Q51 48.4 32.2 41.4Z" fill="${W}"/>` + [[38, 40.4], [46, 42.6], [56, 42.6], [64, 40.6]].map(([x, y]) => `<path d="M${x} ${y} l.8 2 l-.8 .8 l-.8 -.8z" fill="${ink}" stroke="none"/>`).join("") + `<circle cx="52" cy="19" r="2" fill="${G}"/>`;
  else if (role === "biskup") h += `<path d="M35 37 L37.6 17 L51.6 5.6 L65 17.6 L67.8 37 Q51 41.8 35 37Z" fill="${W}"/><path d="M35.4 33 Q51 37.6 67.4 33 M51.6 6.6 V36" fill="none" stroke="${G}" stroke-width="2.6"/><path d="M44 22 l1.6 3 M59 22 l-1.6 3" stroke="#b3321f" stroke-width="1.2"/>`;
  else if (role === "mestan") h += capT < 0.5 ? `<path d="M33 52 C30.6 38 40 27 52 27.4 C62.6 27.6 70.4 36 67.8 50 C66 42.6 61.6 38.6 56 38 C48 38 40 38.6 37 43 C35 47 35 52 35.4 58 L36.6 70 C34 66 33.4 58 33 52Z" fill="${W}"/><path d="M36.4 68 C40 80 46 88 52 89" fill="none" stroke="${W}" stroke-width="1.6"/>` : `<path d="M30.6 40 C30.6 27 44 22 54 23 C64 24 72.4 30 71 39 C60 43.4 42 44 30.6 40Z" fill="${rp(["#4a3220", "#7d2014", "#2c5a3e"])}"/><path d="M31 39.6 C26 44 25 54 27 62" fill="none" stroke-width="2.6" stroke="${ink}"/>`;
  else if (role === "pan" && !kid && capT < 0.4) h += `<path d="M33 39.4 C32.6 29 42 23.6 52 23.6 C62 23.6 69.6 29 69 39.4 Q51 44 33 39.4Z" fill="${shade(col, -0.38)}"/><path d="M33.4 37 Q51 41.6 68.8 37" fill="none" stroke="${G}" stroke-width="1.3"/>`;
  f += `<g transform="translate(51 0) scale(${fw.toFixed(3)} 1) translate(-51 0)">${h}</g>`;
  if (kid) f = `<g transform="translate(50 121) scale(.84) translate(-50 -121)">${f}</g>`;
  g += f;
  const cls_ = `portrait${c.st === "dead" ? " dead" : ""}${c.st === "cap" ? " cap" : ""}`;
  return `<svg class="${cls_}" width="${size}" height="${Math.round(size * 1.2)}" viewBox="0 0 100 120" role="img" aria-label="${esc(c.n)}"><title>${esc(c.n)}${a >= 0 ? ", " + a + " let" : ""}</title><clipPath id="${id}c"><rect width="100" height="120" rx="3"/></clipPath><g clip-path="url(#${id}c)" stroke="${ink}" stroke-width=".9" stroke-linejoin="round" stroke-linecap="round">${g}</g>${c.st === "cap" ? `<path d="M30 0 V120 M50 0 V120 M70 0 V120" stroke="rgba(30,22,16,.7)" stroke-width="4"/>` : ""}</svg>`;
}

// ---------- ilustrace událostí ----------
const EVENT_ART = { neuroda: "neuroda", uroda: "uroda", mor: "mor", kacir: "cirkev", lapkove: "les", kometa: "kometa", rytir: "dvur", kupci: "obchod", spor: "dvur", stavitel: "stavba", ucenec: "uceni", legat: "cirkev", prusko: "valka", pozar: "pozar", zila: "dul", nemoc: "mor", zrada: "dvur",
  babenberk: "dvur", rozvod: "rod", kutnahora: "dul", konradin: "valka", kresenbrunn: "valka", _tatari: "tatari", _war: "valka", _lost: "pozar", _succ: "rod", _victory: "rod", _callToArms: "valka", _proposal: "dvur", _ransom: "dvur", _vote: "volba",
  _joust: "turnaj", _duel: "turnaj", _rada: "dvur", _cernasmrt: "mor", _work: "stavba", _kriz: "valka", krize_slechta: "dvur", krize_duchovni: "cirkev", krize_mestane: "obchod", krize_sedlaci: "pozar", _mission: "rod", _peaceOffer: "mir", _battle: "bitva" };
// Výjevy událostí, kresba kraje a bitevní scéna jsou v 14c-mini.js a 14d-miniscenes.js.
