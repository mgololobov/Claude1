// Vzhled hry: portréty postav, ikony surovin, hieroglyfy.
// Portréty se drží konvencí egyptské malby: postava z profilu, oko zepředu s linkou líčidla, muži červenohnědí,
// ženy žlutookrové; Asiaté (Aamu) se „hřibovitými“ vlasy a vousy jako na malbě z Beni Hasanu, Libyjci s copánkem
// a pery, Núbijci tmaví s krátkými vlasy; děti s kadeří mládí; král v šátku nemes s kobrou a umělým vousem.

const HG = { pan: "𓎟𓇾𓇾", nswbjtj: "𓇓𓏏𓆤𓏏", anch: "𓋹𓍑𓋴", maat: "𓆄", sepat: "𓈈", necer: "𓊹", sema: "𓄥", kemet: "𓆎𓏏𓊖", achet: "𓆷", sara: "𓅭𓇳" };
const hg = (k, title) => `<span class="hg" ${title ? `title="${esc(title)}"` : ""}>${HG[k]}</span>`;

const SKIN = { m: "#9c4a24", f: "#d9a35a", nub: "#4a2c1a", aam: "#c99a63", lib: "#c58d5d" };
function hashStr(t) { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
let PORT_N = 0;
function portraitKind(c) {
  const C = c.cl && S.clans[c.cl], h = hashStr(c.id + c.n);
  const leader = C && C.leader === c.id, king = leader && C.t === "král";
  let cul = (C && C.cul) || "eg"; if (c.origin && S.clans[c.origin]) cul = S.clans[c.origin].cul;
  if (cul === "hyk") cul = king ? "hyk-king" : NAMES.eg.m.some(n => c.n.startsWith(n + ",")) ? "eg" : "aam";
  const kid = c.st === "kid";
  const queen = c.sex === "f" && C && ((C.leader && chr(S, C.leader) && chr(S, C.leader).spouse === c.id && C.t === "král") || (leader && C.t === "král"));
  return { cul, kid, king: king && cul !== "nub", chief: leader && !king, queen, sex: c.sex || "m", h, priest: !kid && c.sex !== "f" && cul === "eg" && !leader && (c.traits || []).includes("zbozny") || (h % 5 === 0 && cul === "eg" && !leader && c.sex !== "f"), dead: c.st === "dead" };
}
function portrait(c, size = 56) {
  if (!c) return "";
  const k = portraitKind(c), id = "pt" + (PORT_N++);
  const nub = k.cul === "nub", aam = k.cul === "aam", lib = k.cul === "lib";
  const skin = nub ? SKIN.nub : aam ? SKIN.aam : lib ? SKIN.lib : k.sex === "f" ? SKIN.f : SKIN.m;
  const hair = "#1b130c", gold = "#c9952b", blue = "#1d4f9a", red = "#a8381e", green = "#2e7d5b";
  let g = "";
  // ramena a široký náhrdelník (wesech)
  g += `<path d="M6 64 C8 50 19 45 30 45 L38 45 C49 45 57 51 59 64Z" fill="${skin}"/>`;
  const bands = k.king || k.queen ? [gold, blue, gold, red] : k.chief ? [gold, red, blue] : [blue, red, green];
  bands.forEach((col, i) => { g += `<path d="M${13 + i} ${55 + i * 2.2} C${21} ${48 + i * 2.2} ${45} ${48 + i * 2.2} ${53 - i} ${56 + i * 2.2}" fill="none" stroke="${col}" stroke-width="2.2"/>`; });
  // krk a hlava z profilu (obličej doprava)
  g += `<path d="M28 36 L37 36 L38 47 L27 47Z" fill="${skin}"/>`;
  g += `<path d="M30 9 C38 9 43 14 43 20 L44 24 L47.5 28.5 L44.5 29.5 L44.5 31 L45.5 33 L43.5 34.2 L43.5 36 C42.5 39.5 38.5 41.5 34.5 41.5 L30 41.5 C24 38 20 32 20 24 C20 15 24 9 30 9Z" fill="${skin}"/>`;
  // vlasy, paruky, pokrývky hlavy
  if (k.king || k.cul === "hyk-king") {
    g += `<defs><pattern id="${id}" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="${gold}"/><rect y="1.6" width="3" height="1.4" fill="${blue}"/></pattern></defs>`;
    g += `<path d="M42 18 C42 9 35 5 28 5 C19 5 14 12 14 21 C14 30 16 40 17 48 L26 48 L30 30 C31 25 33 19 42 18Z" fill="url(#${id})" stroke="#2b1d12" stroke-width=".6"/>`;
    g += `<path d="M33 27 L38 27 L39 50 L33 50Z" fill="url(#${id})" stroke="#2b1d12" stroke-width=".6"/>`;
    g += `<path d="M41 13.5 C43 11 45 11.5 44.5 14.5 L42.5 15.5Z" fill="${gold}" stroke="#2b1d12" stroke-width=".5"/>`; // kobra (ureus)
    g += `<path d="M41 39 L44 39 L44.5 47 L41.5 46.5Z" fill="#3a2a1a"/>`; // umělý vous
  } else if (k.kid) {
    g += `<path d="M22 14 C20 18 19 26 21 33 C22 37 24 39 26 40 L24 41 C20 37 18 31 18 24 C18 18 19 15 22 14Z" fill="${hair}"/>`; // kadeř mládí
  } else if (aam) {
    g += `<path d="M44.5 18 C45 7 35 3 26 4 C16 5 12 14 14 24 C15 30 19 34 24 35 L30 31 C30 26 33 20 44.5 18Z" fill="${hair}"/>`;
    g += `<path d="M44 33 C44.5 40 41 45 35 45 L32 40 L38 39 C40 38 42 36 44 33Z" fill="${hair}"/>`;
    g += `<path d="M15 21 C22 22 32 20 44 17" stroke="${red}" stroke-width="1.6" fill="none"/>`;
  } else if (lib) {
    g += `<path d="M43 16 C41 9 34 7 28 8 C21 9 18 14 18 22 L24 22 C26 17 34 14 43 16Z" fill="${hair}"/>`;
    g += `<path d="M24 20 C20 26 21 36 26 42" stroke="${hair}" stroke-width="3" fill="none"/>`; // copánek
    g += `<path d="M28 8 C26 0 29 -4 31 -6 C31 0 31 4 30 8Z" fill="${blue}" transform="translate(0 6)"/><path d="M32 8 C32 1 35 -2 37 -4 C36 2 35 5 34 8Z" fill="${red}" transform="translate(0 6)"/>`;
    g += `<path d="M44 34 C44 39 41 42 37 42 L38 37Z" fill="${hair}"/>`;
  } else if (nub) {
    g += `<path d="M43.5 18 C43 10 37 6 30 6 C22 6 17 12 17 20 C17 25 19 28 21 30 L26 28 C26 22 31 18 43.5 18Z" fill="${hair}"/>`;
    if (k.chief || k.king) g += `<path d="M24 8 C22 0 25 -5 27 -8 C27 -1 27 3 26 8Z" fill="${gold}" transform="translate(0 4)"/>`;
    g += `<circle cx="29" cy="30" r="1.8" fill="none" stroke="${gold}" stroke-width="1"/>`;
  } else if (k.priest) {
    g += `<path d="M21 18 C23 12 27 9 31 9 C36 9 40 11 42 15" stroke="rgba(0,0,0,.18)" stroke-width="1.2" fill="none"/>`; // oholená hlava kněze či písaře
  } else if (k.sex === "f") {
    g += `<path d="M42.5 17.5 C42 9 35 6 29 6 C20 6 15 12 15 21 C15 33 16 44 18 52 L28 52 L30 30 C31 24 34 19 42.5 17.5Z" fill="${hair}"/>`;
    g += `<path d="M34.5 26 L39.5 26 L40.5 52 L34 52Z" fill="${hair}"/>`; // přední pramen trojdílné paruky
    if (k.queen) { g += `<path d="M16 17 C24 12 34 11 43 15" stroke="${gold}" stroke-width="2.2" fill="none"/><path d="M41.5 13 C43.5 10.5 45.5 11 45 14 L43 15Z" fill="${gold}"/>`; }
    else g += `<path d="M16 18 C24 14 34 13 42.5 16" stroke="${(k.h % 2) ? blue : red}" stroke-width="1.4" fill="none"/>`;
  } else {
    const len = k.h % 3 === 0 ? 46 : 41;
    g += `<path d="M43 17.5 C42 9 35 6 29 6 C20 6 15 13 15 22 C15 30 17 ${len - 4} 21 ${len} L32 ${len} L31 30 C31 25 34 20 43 17.5Z" fill="${hair}"/>`;
    g += `<path d="M18 ${len - 6} L31 ${len - 6}" stroke="rgba(255,255,255,.12)" stroke-width=".8"/>`;
  }
  // oko zepředu s linkou líčidla, obočí, ucho není vidět pod parukou
  g += `<path d="M35.2 22.6 C36.6 21 39.6 21 41.2 22.4 C39.6 23.6 36.6 23.8 35.2 22.6Z" fill="#f6efdc"/><circle cx="38.6" cy="22.4" r="1.05" fill="#1b130c"/>`;
  g += `<path d="M34 22.8 L41.8 22.2 M41.2 22.4 L43 23.2" stroke="#1b130c" stroke-width=".7" fill="none"/>`;
  g += `<path d="M35 19.4 Q38.6 17.6 42.2 19.4" stroke="#1b130c" stroke-width="1" fill="none"/>`;
  g += `<path d="M43.2 32.2 L44.6 32.6" stroke="${k.sex === "f" ? "#a8381e" : "rgba(0,0,0,.35)"}" stroke-width="1"/>`;
  const filt = k.dead ? ' style="filter:grayscale(1);opacity:.7"' : "";
  return `<svg class="portrait" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"${filt}><clipPath id="c${id}"><circle cx="32" cy="32" r="31"/></clipPath><g clip-path="url(#c${id})">${g}</g></svg>`;
}

// ---------- ikony surovin a stavu ----------
const RICON = {
  deben: `<circle cx="12" cy="12" r="8" fill="none" stroke="#b5652a" stroke-width="4"/><circle cx="12" cy="12" r="8" fill="none" stroke="#e39a5c" stroke-width="1.2"/>`,
  grain: `<path d="M3 21V12a4 4 0 0 1 8 0v9zM13 21V10a4.5 4.5 0 0 1 9 0v11z" fill="#d9b77a" stroke="#6d4a1f" stroke-width="1.2"/><path d="M5.5 21v-3h3v3M16 21v-3.5h3V21" fill="#6d4a1f"/><path d="M2 21h21" stroke="#6d4a1f" stroke-width="1.4"/>`,
  maat: `<path d="M13 2c4 5 4 12 1 17l-1 3h-1.6l.6-3c-3-5-3-12 1-17z" fill="#c9952b" stroke="#6d4a1f" stroke-width=".9"/><path d="M13 4v16" stroke="#6d4a1f" stroke-width=".7"/>`,
  slava: `<circle cx="12" cy="12" r="6.5" fill="#c4361c" stroke="#c9952b" stroke-width="2"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" stroke="#c9952b" stroke-width="1.4"/>`,
  vojsko: `<path d="M5 22L19 3" stroke="#6d4a1f" stroke-width="1.6"/><path d="M19 3l-1 4 3-2z" fill="#9aa3ad" stroke="#4a4a4a" stroke-width=".6"/><path d="M8 7h8v9c0 3-2 5-4 6-2-1-4-3-4-6z" fill="#efe6d1" stroke="#6d4a1f" stroke-width="1.1"/><path d="M10 10c1 1 3 1 4 0M10 14c1.2 1.4 2.8 1.4 4 0" stroke="#4a2c1a" stroke-width="1.2" fill="none"/>`,
  nil: `<path d="M2 7l2.5-2 2.5 2 2.5-2 2.5 2 2.5-2 2.5 2 2.5-2 2.5 2M2 13l2.5-2 2.5 2 2.5-2 2.5 2 2.5-2 2.5 2 2.5-2 2.5 2M2 19l2.5-2 2.5 2 2.5-2 2.5 2 2.5-2 2.5 2 2.5-2 2.5 2" fill="none" stroke="#1d4f9a" stroke-width="1.6" stroke-linejoin="round"/>`,
  nomy: `<rect x="3" y="3" width="18" height="18" rx="2" fill="#6f8f3e" stroke="#2b1d12" stroke-width="1.2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18" stroke="#1d4f9a" stroke-width="1.4"/>`,
  urednici: `<rect x="4" y="3" width="6" height="18" rx="1" fill="#efe6d1" stroke="#6d4a1f"/><circle cx="7" cy="7" r="1.4" fill="#2b1d12"/><circle cx="7" cy="11" r="1.4" fill="#a8381e"/><path d="M14 4l6 16" stroke="#6d4a1f" stroke-width="1.6"/>`,
};
const ricon = (k, size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${RICON[k] || ""}</svg>`;
function seasonWheel(m) {
  const cols = ["#1d4f9a", "#2e7d5b", "#c9952b"], c = 15, r = 13; let g = "";
  for (let i = 0; i < 3; i++) { const a0 = (i / 3) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / 3) * 2 * Math.PI - Math.PI / 2;
    g += `<path d="M${c} ${c} L${(c + r * Math.cos(a0)).toFixed(2)} ${(c + r * Math.sin(a0)).toFixed(2)} A${r} ${r} 0 0 1 ${(c + r * Math.cos(a1)).toFixed(2)} ${(c + r * Math.sin(a1)).toFixed(2)}Z" fill="${cols[i]}" opacity="${Math.floor(m / 4) === i ? 1 : 0.35}"/>`; }
  const a = ((m + 0.5) / 12) * 2 * Math.PI - Math.PI / 2;
  g += `<circle cx="${c}" cy="${c}" r="4" fill="var(--panel)"/><path d="M${c} ${c} L${(c + (r - 1) * Math.cos(a)).toFixed(2)} ${(c + (r - 1) * Math.sin(a)).toFixed(2)}" stroke="#2b1d12" stroke-width="2.2" stroke-linecap="round"/>`;
  return `<svg class="wheel" viewBox="0 0 30 30" aria-hidden="true"><title>Rok: achet (záplava), peret (setí), šemu (sklizeň)</title>${g}</svg>`;
}
function resPill(k, val, sub, title) { return `<span class="res" title="${esc(title || "")}">${ricon(k)}<b>${val}</b>${sub ? ` <small>${sub}</small>` : ""}</span>`; }
const nPlural = (n, a, b, c) => `${n} ${n === 1 ? a : n > 1 && n < 5 ? b : c}`;
