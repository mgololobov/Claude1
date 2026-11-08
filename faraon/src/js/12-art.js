// Ilustrace v egyptském stylu kreslené v SVG: výjevy k událostem, bojiště, deska senetu, kolo svátků,
// pruhy příjmů a výdajů. Barvy podle egyptských pigmentů (modř, červený a žlutý okr, malachit, saze, běloba).
const PG = { b: "#2f6d8f", r: "#b5452c", y: "#c9a227", g: "#4f8a5b", k: "#2a2420", w: "#efe6cf", s: "#d9bf8a", s2: "#c8a86a", n: "#3d7fb0" };

// ---------- drobné tvary ----------
const A_ = {
  papyrus: (x, y, h) => `<path d="M${x} ${y}V${y - h}" stroke="${PG.g}" stroke-width="2.4"/><path d="M${x - 10} ${y - h - 11}Q${x} ${y - h + 5} ${x + 10} ${y - h - 11}Q${x} ${y - h - 5} ${x - 10} ${y - h - 11}Z" fill="${PG.g}"/>`,
  water: (y, w = 600) => { let d = ""; for (let r = 0; r < 3; r++) { d += `M0 ${y + r * 9}`; for (let x = 0; x < w; x += 12) d += `l6 -5l6 5`; } return `<rect x="0" y="${y - 6}" width="${w}" height="40" fill="${PG.n}" opacity=".35"/><path d="${d}" stroke="${PG.b}" stroke-width="2" fill="none"/>`; },
  boat: (x, y, sail = 1) => `<path d="M${x} ${y}Q${x + 55} ${y + 20} ${x + 110} ${y}l-10 9Q${x + 55} ${y + 22} ${x + 10} ${y + 9}Z" fill="${PG.y}" stroke="${PG.k}" stroke-width="1.2"/>${sail ? `<path d="M${x + 55} ${y + 6}V${y - 44}" stroke="${PG.k}" stroke-width="2"/><rect x="${x + 36}" y="${y - 42}" width="38" height="30" fill="${PG.w}" stroke="${PG.k}"/>` : ""}<path d="M${x + 96} ${y + 2}l18 -16" stroke="${PG.k}" stroke-width="2"/>`,
  man: (x, y, col = PG.r, dir = 1, tool = "") => {
    let g = `<circle cx="${x}" cy="${y - 38}" r="5.5" fill="${PG.k}"/><rect x="${x - 4}" y="${y - 32}" width="8" height="15" rx="2" fill="${col}"/><path d="M${x - 6} ${y - 18}h12l-2 9h-8z" fill="${PG.w}"/><path d="M${x - 2} ${y - 9}l-3 9M${x + 2} ${y - 9}l${dir * 4} 9" stroke="${col}" stroke-width="2.4"/>`;
    if (tool === "spear") g += `<path d="M${x + dir * 7} ${y - 4}l${dir * 6} -48" stroke="${PG.k}" stroke-width="1.6"/><path d="M${x + dir * 13} ${y - 52}l${dir * 2} -7l${dir * 2} 7z" fill="${PG.k}"/><path d="M${x + dir * 3} ${y - 33}h${dir * 9}v18a5 5 0 0 1 ${-dir * 9} 0z" fill="${PG.y}" stroke="${PG.k}"/>`;
    if (tool === "bow") g += `<path d="M${x + dir * 9} ${y - 44}Q${x + dir * 20} ${y - 30} ${x + dir * 9} ${y - 16}" stroke="${PG.k}" stroke-width="2" fill="none"/><path d="M${x + dir * 9} ${y - 44}V${y - 16}" stroke="${PG.k}" stroke-width=".6"/>`;
    if (tool === "carry") g += `<path d="M${x - 2} ${y - 31}l-4 -8" stroke="${col}" stroke-width="2.4"/>`;
    return g;
  },
  sun: (x, y, r = 16) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${PG.r}"/><circle cx="${x}" cy="${y}" r="${r + 5}" fill="none" stroke="${PG.y}" stroke-width="2" opacity=".6"/>`,
  pylon: (x, y) => `<path d="M${x} ${y}l8 -70h40l8 70z M${x + 70} ${y}l8 -70h40l8 70z" fill="${PG.w}" stroke="${PG.k}" stroke-width="1.3"/><rect x="${x + 56}" y="${y - 52}" width="14" height="52" fill="${PG.k}" opacity=".7"/><path d="M${x + 12} ${y - 70}V${y - 92}M${x + 114} ${y - 70}V${y - 92}" stroke="${PG.k}" stroke-width="1.6"/><path d="M${x + 12} ${y - 92}l10 4l-10 4M${x + 114} ${y - 92}l10 4l-10 4" fill="${PG.r}"/><path d="M${x + 14} ${y - 40}h28M${x + 84} ${y - 40}h28" stroke="${PG.b}" stroke-width="3"/>`,
  obelisk: (x, y, h) => `<path d="M${x - 7} ${y}l3 -${h}l4 -9l4 9l3 ${h}z" fill="${PG.s2}" stroke="${PG.k}"/><path d="M${x - 4} ${y - h}l4 -9l4 9z" fill="${PG.y}"/>`,
  pyramid: (x, y, w) => `<path d="M${x} ${y}l${w / 2} -${w * 0.62}l${w / 2} ${w * 0.62}z" fill="${PG.s2}" stroke="${PG.k}"/><path d="M${x + w / 2} ${y - w * 0.62}l${w / 2} ${w * 0.62}h-${w * 0.2}z" fill="${PG.k}" opacity=".18"/>`,
  palm: (x, y) => `<path d="M${x} ${y}q4 -30 0 -60" stroke="#6d4a1f" stroke-width="4" fill="none"/>${[-60, -25, 15, 50].map(a => `<path d="M${x} ${y - 60}q${a / 2} -14 ${a} 4" stroke="${PG.g}" stroke-width="4" fill="none"/>`).join("")}`,
  donkey: (x, y) => `<ellipse cx="${x}" cy="${y - 18}" rx="16" ry="8" fill="#8a7a6a"/><path d="M${x + 13} ${y - 22}l9 -9h5v6l-8 4z" fill="#8a7a6a"/><path d="M${x + 22} ${y - 31}l1 -7M${x + 25} ${y - 31}l2 -6" stroke="#8a7a6a" stroke-width="2"/><path d="M${x - 10} ${y - 12}v12M${x - 4} ${y - 12}v12M${x + 6} ${y - 12}v12M${x + 11} ${y - 12}v12" stroke="#6a5a4a" stroke-width="2.4"/><rect x="${x - 10}" y="${y - 34}" width="18" height="10" fill="${PG.y}" stroke="${PG.k}"/>`,
  bird: (x, y, s = 1) => `<path d="M${x - 9 * s} ${y}q${5 * s} -6 ${9 * s} 0q${4 * s} -6 ${9 * s} 0" stroke="${PG.k}" stroke-width="1.6" fill="none"/>`,
  dunes: (y, col = PG.s) => `<path d="M0 ${y}Q80 ${y - 22} 160 ${y}T320 ${y}T480 ${y}T640 ${y}V160H0Z" fill="${col}"/>`,
  sheaf: (x, y) => `${[-6, -3, 0, 3, 6].map(d => `<path d="M${x} ${y}l${d} -34" stroke="${PG.y}" stroke-width="1.6"/><ellipse cx="${x + d * 1.1}" cy="${y - 37}" rx="2" ry="5" fill="${PG.y}"/>`).join("")}<path d="M${x - 5} ${y - 12}h10" stroke="#6d4a1f" stroke-width="2"/>`,
  throne: (x, y) => `<rect x="${x - 4}" y="${y - 40}" width="34" height="40" fill="${PG.y}" stroke="${PG.k}"/><rect x="${x - 4}" y="${y - 60}" width="8" height="22" fill="${PG.y}" stroke="${PG.k}"/><path d="M${x} ${y - 30}h22" stroke="${PG.b}" stroke-width="3"/>`,
  king: (x, y) => `<circle cx="${x + 12}" cy="${y - 66}" r="6" fill="${PG.k}"/><path d="M${x + 6} ${y - 72}l12 0l2 -10l-8 -4l-8 4z" fill="${PG.w}" stroke="${PG.k}"/><rect x="${x + 7}" y="${y - 60}" width="10" height="20" rx="2" fill="${PG.r}"/><path d="M${x + 6} ${y - 42}h20v10h-20z" fill="${PG.w}"/><path d="M${x + 22} ${y - 32}v32" stroke="${PG.r}" stroke-width="3"/><path d="M${x + 18} ${y - 54}l14 -8" stroke="${PG.y}" stroke-width="2.5"/>`,
  column: (x, y, h) => `<rect x="${x - 6}" y="${y - h}" width="12" height="${h}" fill="${PG.w}" stroke="${PG.k}"/><path d="M${x - 12} ${y - h}q12 -18 24 0z" fill="${PG.g}" stroke="${PG.k}"/>`,
  ankh: (x, y, s = 1, col = PG.y) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="-22" rx="6" ry="8" fill="none" stroke="${col}" stroke-width="3"/><path d="M-10 -12h20M0 -14v24" stroke="${col}" stroke-width="3.5"/></g>`,
  star: (x, y) => `<path d="M${x} ${y - 6}l1.6 4.4l4.4 1.6l-4.4 1.6l-1.6 4.4l-1.6 -4.4l-4.4 -1.6l4.4 -1.6z" fill="${PG.y}"/>`,
  bark: (x, y) => `<path d="M${x} ${y}q60 14 120 0l-6 8q-54 12 -108 0z" fill="${PG.y}" stroke="${PG.k}"/><rect x="${x + 44}" y="${y - 26}" width="32" height="24" fill="${PG.w}" stroke="${PG.k}"/><path d="M${x + 44} ${y - 26}h32" stroke="${PG.b}" stroke-width="4"/><path d="M${x - 6} ${y + 8}h132" stroke="#6d4a1f" stroke-width="3"/>`,
  croc: (x, y) => `<path d="M${x} ${y}q30 -12 70 -6l26 2l-26 6q-40 8 -70 -2z" fill="${PG.g}" stroke="${PG.k}"/><circle cx="${x + 62}" cy="${y - 6}" r="1.6" fill="${PG.k}"/>`,
  scorpion: (x, y) => `<ellipse cx="${x}" cy="${y}" rx="14" ry="6" fill="${PG.k}"/><path d="M${x - 12} ${y}q-18 -2 -16 -18q2 -8 8 -6" stroke="${PG.k}" stroke-width="3" fill="none"/>${[-6, 0, 6].map(d => `<path d="M${x + d} ${y + 4}l-4 8M${x + d} ${y - 4}l-4 -8" stroke="${PG.k}" stroke-width="1.5"/>`).join("")}<path d="M${x + 12} ${y}l10 -6m-10 6l10 6" stroke="${PG.k}" stroke-width="2"/>`,
  hippo: (x, y) => `<ellipse cx="${x}" cy="${y}" rx="30" ry="14" fill="#7a6a8a"/><ellipse cx="${x + 30}" cy="${y - 4}" rx="13" ry="10" fill="#7a6a8a"/><circle cx="${x + 30}" cy="${y - 12}" r="2" fill="${PG.k}"/>`,
};
const frieze = (y) => { let g = ""; const cols = [PG.b, PG.r, PG.y, PG.g]; for (let x = 0, i = 0; x < 600; x += 15, i++) g += `<rect x="${x}" y="${y}" width="12" height="6" fill="${cols[i % 4]}"/>`; return g; };

// ---------- výjevy ----------
const SCENES = {
  nil: () => A_.sun(520, 34) + A_.dunes(78, PG.s2) + A_.water(96) + A_.boat(170, 98) + A_.boat(360, 108, 0) + [40, 60, 80, 470, 492, 560].map(x => A_.papyrus(x, 108, 34 + (x % 5) * 3)).join("") + A_.bird(260, 30) + A_.bird(290, 40, 0.8),
  bitva: () => A_.dunes(118) + [80, 112, 144, 176, 208].map(x => A_.man(x, 140, PG.r, 1, x % 64 === 16 ? "bow" : "spear")).join("") + [392, 424, 456, 488, 520].map(x => A_.man(x, 140, PG.b, -1, x % 64 === 8 ? "bow" : "spear")).join("") + [0, 1, 2, 3].map(i => `<path d="M${250 + i * 22} ${60 + i * 6}l26 -4" stroke="${PG.k}" stroke-width="1.4"/><path d="M${276 + i * 22} ${56 + i * 6}l-5 -2l1 4z" fill="${PG.k}"/>`).join("") + A_.sun(300, 26, 12),
  chram: () => A_.sun(300, 30) + A_.dunes(130, PG.s2) + A_.pylon(237, 140) + A_.obelisk(200, 140, 74) + A_.obelisk(400, 140, 74) + A_.palm(90, 140) + A_.palm(520, 140) + [0, 1, 2].map(i => A_.man(140 + i * 18, 150, PG.w, 1, "carry")).join(""),
  dvur: () => `<rect x="0" y="0" width="600" height="160" fill="${PG.w}" opacity=".35"/>` + [70, 140, 460, 530].map(x => A_.column(x, 150, 120)).join("") + `<rect x="230" y="138" width="150" height="12" fill="${PG.s2}" stroke="${PG.k}"/>` + A_.throne(285, 138) + A_.king(282, 138) + A_.man(220, 150, PG.r, 1) + A_.man(395, 150, PG.b, -1) + `<path d="M330 44l20 -20" stroke="${PG.k}" stroke-width="2"/><ellipse cx="354" cy="20" rx="10" ry="6" fill="${PG.g}"/>`,
  hrob: () => A_.sun(470, 40, 14) + A_.dunes(110, PG.s2) + A_.pyramid(80, 130, 140) + A_.pyramid(250, 130, 90) + `<path d="M400 130V80l40 -20l80 0v70z" fill="#b89a6a" stroke="${PG.k}"/><rect x="460" y="98" width="18" height="32" fill="${PG.k}"/>` + A_.ankh(380, 70, 0.8),
  obchod: () => A_.sun(80, 32, 13) + A_.dunes(116) + A_.palm(520, 140) + A_.palm(555, 145) + [150, 220, 290].map(x => A_.donkey(x, 140)).join("") + A_.man(110, 142, PG.r, 1, "carry") + A_.man(345, 142, PG.b, 1),
  lov: () => A_.water(110) + [30, 52, 74, 96, 500, 524, 548, 572].map(x => A_.papyrus(x, 120, 60 + (x % 7) * 4)).join("") + `<path d="M210 112q70 12 140 0l-6 7q-64 10 -128 0z" fill="${PG.y}" stroke="${PG.k}"/>` + A_.man(260, 112, PG.r, 1, "spear") + A_.hippo(420, 120) + [0, 1, 2, 3, 4].map(i => A_.bird(140 + i * 50, 30 + (i % 2) * 14)).join(""),
  hlad: () => A_.sun(470, 34, 20) + `<rect x="0" y="96" width="600" height="64" fill="#b89a6a"/>` + [40, 120, 210, 330, 440, 540].map(x => `<path d="M${x} 110l18 10l-8 14l20 8" stroke="#6d4a1f" stroke-width="1.2" fill="none"/>`).join("") + A_.sheaf(140, 150) + A_.man(260, 150, PG.r, 1) + A_.man(290, 152, PG.w, 1),
  svatek: () => A_.sun(300, 28) + A_.dunes(126, PG.s2) + A_.bark(240, 98) + [232, 262, 298, 334, 366].map(x => A_.man(x, 150, PG.w, 1, "carry")).join("") + A_.pylon(470, 150) + [0, 1, 2].map(i => A_.man(90 + i * 26, 150, PG.r, 1)).join(""),
  nemoc: () => `<rect x="0" y="0" width="600" height="160" fill="${PG.w}" opacity=".35"/>` + A_.column(80, 150, 110) + A_.column(520, 150, 110) + `<rect x="240" y="120" width="120" height="14" fill="${PG.y}" stroke="${PG.k}"/>` + A_.man(380, 150, PG.b, -1) + A_.scorpion(170, 140) + A_.ankh(300, 70, 1.1, PG.b),
  kouzlo: () => `<rect x="0" y="0" width="600" height="160" fill="#1d2b44" opacity=".85"/>` + [40, 110, 190, 260, 340, 420, 480, 560].map((x, i) => A_.star(x, 20 + (i % 3) * 18)).join("") + `<path d="M300 38a22 22 0 1 0 0.1 0" fill="none"/>` + A_.ankh(300, 100, 1.4) + A_.man(220, 150, PG.w, 1) + `<ellipse cx="390" cy="140" rx="16" ry="9" fill="${PG.w}"/><path d="M402 134q8 -14 2 -24" stroke="${PG.w}" stroke-width="5" fill="none"/>`,
  krokodyl: () => A_.water(100) + [30, 60, 520, 556].map(x => A_.papyrus(x, 110, 50)).join("") + A_.croc(240, 104) + A_.man(140, 96, PG.r, 1, "spear"),
  porod: () => `<rect x="0" y="0" width="600" height="160" fill="${PG.w}" opacity=".35"/>` + A_.column(70, 150, 120) + A_.column(530, 150, 120) + `<rect x="250" y="128" width="40" height="22" fill="#b5452c" stroke="${PG.k}"/><rect x="310" y="128" width="40" height="22" fill="#b5452c" stroke="${PG.k}"/>` + A_.man(300, 128, PG.w, 1) + `<ellipse cx="190" cy="118" rx="14" ry="22" fill="#4f8a5b"/><circle cx="190" cy="90" r="9" fill="#4f8a5b"/><path d="M180 84l-4 -8M200 84l4 -8" stroke="#4f8a5b" stroke-width="3"/>` + `<circle cx="410" cy="100" r="12" fill="#c9a227"/><rect x="400" y="110" width="20" height="30" rx="6" fill="#c9a227"/><path d="M398 92l-4 -10l8 4l4 -8l4 8l8 -4l-4 10" fill="#b5452c"/>` + [120, 470, 520].map((x, i) => A_.star(x, 30 + i * 8)).join(""),
  boure: () => `<rect width="600" height="160" fill="#d9a85a"/>` + A_.dunes(110, "#c8904a") + [0, 1, 2, 3, 4, 5].map(i => `<path d="M${-40 + i * 110} ${40 + (i % 3) * 22}q60 -30 120 0t120 0" stroke="#f3e3b8" stroke-width="${3 + i % 3}" fill="none" opacity=".7"/>`).join("") + A_.palm(470, 150) + A_.man(220, 150, PG.r, -1) + A_.donkey(300, 150) + A_.sun(80, 30, 10),
  zlato: () => `<path d="M0 130l80 -70l60 40l80 -60l90 70l70 -40l110 60l110 -20V160H0Z" fill="#b89a6a" stroke="${PG.k}"/>` + `<path d="M260 150l20 -40h40l20 40z" fill="${PG.k}" opacity=".75"/>` + [[150, 120], [190, 132], [420, 126], [460, 138], [300, 140]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="${PG.y}" stroke="#8a6a1a"/>`).join("") + A_.man(220, 150, PG.r, 1, "carry") + A_.man(380, 150, PG.b, -1) + A_.sun(530, 30, 13),
  senet: () => `<rect x="0" y="0" width="600" height="160" fill="${PG.w}" opacity=".35"/>` + A_.column(60, 150, 120) + A_.column(540, 150, 120) + `<rect x="200" y="96" width="200" height="40" fill="#8a5a2a" stroke="${PG.k}"/>` + [...Array(10)].map((_, i) => `<rect x="${204 + i * 19.4}" y="100" width="17" height="10" fill="${PG.w}"/><rect x="${204 + i * 19.4}" y="112" width="17" height="10" fill="${PG.w}"/><rect x="${204 + i * 19.4}" y="124" width="17" height="10" fill="${PG.w}"/>`).join("") + A_.man(170, 150, PG.r, 1) + A_.man(430, 150, PG.b, -1),
};
const VIGN = { nizka: "nil", vysoka: "nil", hlad: "hlad", pohreb: "hrob", pohrebiste: "hrob", dopis_mrtvym: "hrob", vykradeny: "hrob", bitva: "bitva", vbitva: "bitva", korist: "bitva", hrozba: "bitva", medzaj: "bitva", tasetilukostrelci: "bitva", zbehove: "bitva",
  usir: "svatek", hebsed: "svatek", svatek: "svatek", min: "svatek", udoli: "svatek", apis: "chram", sochy: "chram", poutnici: "svatek", obnova: "chram", sen: "chram", exempce: "chram", stela: "chram",
  karavana: "obchod", byblos_posel: "obchod", obchod_nabidka: "obchod", posli_kus: "obchod", keftiu: "obchod", trpaslik: "obchod", navratilec: "obchod", dary_posel: "obchod",
  hroch: "lov", hrosi: "lov", lov: "lov", senet: "senet", senet_pozvani: "senet", nakaza: "nemoc", nemoc: "nemoc", mor_skotu: "nemoc", stir: "nemoc", kouzelnik: "kouzlo", krokodyl: "krokodyl", skudci: "hlad", hostina: "dvur", znameni: "kouzlo", narozeni: "porod", vychova: "dvur", chamsin: "boure", uprchlici: "hlad", lodni: "nil", zlaty_nalez: "zlato", mlady_vojak: "bitva", paviani: "obchod" };
function vignKind(ev, v) {
  if (VIGN[ev.k]) return VIGN[ev.k];
  const t = (v.t || "").toLowerCase();
  if (/bitv|válk|vojsk|nájezd|vzpour|zbě/.test(t)) return "bitva";
  if (/chrám|kněž|bůh|bohů|svátek|obět|svatyn/.test(t)) return "chram";
  if (/hrob|pohřeb|mrtv|panovník$/.test(t)) return "hrob";
  if (/lod|kupc|obchod|karavan|posel|posl/.test(t)) return "obchod";
  if (/hlad|sklizeň|obilí|sýpk|záplav|nil/.test(t)) return /záplav|nil/.test(t) ? "nil" : "hlad";
  return "dvur";
}
function vign(kind) {
  const sc = SCENES[kind] || SCENES.dvur;
  return `<svg class="vign" viewBox="0 0 600 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="vsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3e3b8"/><stop offset="1" stop-color="#e8cf96"/></linearGradient></defs><rect width="600" height="160" fill="url(#vsky)"/>${sc()}${frieze(0)}${frieze(154)}</svg>`;
}

// ---------- bojiště ----------
function armyBlocks(t, x0, dir, col, op, hide) {
  const per = 200, kinds = [["kopinici", "sq"], ["lucistnici", "ci"], ["medzajove", "tr"], ["vozy", "wh"]];
  let blocks = []; for (const [k, sh] of kinds) { const n = Math.min(24, Math.round((t[k] || 0) / per)); for (let i = 0; i < n; i++) blocks.push(sh); }
  if (!blocks.length && men(t)) blocks.push("sq");
  if (hide) blocks = blocks.map(() => "q");
  blocks = blocks.slice(0, 48);
  let g = "";
  blocks.forEach((sh, i) => {
    const col_ = Math.floor(i / 6), row = i % 6, x = x0 + dir * (col_ * 17), y = 34 + row * 17;
    if (sh === "sq") g += `<rect x="${x - 6}" y="${y - 6}" width="12" height="12" fill="${col}" opacity="${op}" stroke="${PG.k}" stroke-width=".6"/><path d="M${x + dir * 6} ${y + 6}l${dir * 4} -14" stroke="${PG.k}" stroke-width="1"/>`;
    else if (sh === "ci") g += `<circle cx="${x}" cy="${y}" r="6" fill="${col}" opacity="${op}" stroke="${PG.k}" stroke-width=".6"/><path d="M${x + dir * 3} ${y - 5}q${dir * 6} 5 0 10" stroke="${PG.k}" fill="none"/>`;
    else if (sh === "tr") g += `<path d="M${x} ${y - 7}l7 13h-14z" fill="${col}" opacity="${op}" stroke="${PG.k}" stroke-width=".6"/>`;
    else if (sh === "wh") g += `<circle cx="${x}" cy="${y}" r="6.5" fill="none" stroke="${col}" stroke-width="2.4" opacity="${op}"/><path d="M${x - 6} ${y}h12M${x} ${y - 6}v12" stroke="${col}" stroke-width="1.2" opacity="${op}"/>`;
    else g += `<rect x="${x - 6}" y="${y - 6}" width="12" height="12" fill="${col}" opacity=".25" stroke="${PG.k}" stroke-dasharray="2 2"/>`;
  });
  return g;
}
function fieldSvg(f) {
  if (!f) return "";
  const cm = S.clans[f.me.cl].col, cf = S.clans[f.foe.cl].col, opM = (0.35 + f.me.m / 160).toFixed(2), opF = (0.35 + f.foe.m / 160).toFixed(2);
  const bar = (x, m, col, al) => `<rect x="${x}" y="146" width="150" height="7" fill="${PG.k}" opacity=".15"/><rect x="${al === "r" ? x + 150 - m * 1.5 : x}" y="146" width="${clamp(m, 0, 100) * 1.5}" height="7" fill="${col}"/>`;
  const ord = (o, x, al) => o && BORDERS[o] ? `<text x="${x}" y="22" text-anchor="${al}" class="fo">${esc(BORDERS[o].n)}</text>` : "";
  let mid = "";
  if (f.me.o === "strelba" || f.foe.o === "strelba") for (let i = 0; i < 5; i++) { const fr = f.me.o === "strelba"; mid += `<path d="M${fr ? 230 : 370} ${50 + i * 16}Q300 ${20 + i * 16} ${fr ? 370 : 230} ${54 + i * 16}" stroke="${PG.k}" stroke-width="1" fill="none" stroke-dasharray="4 3"/>`; }
  if (f.me.o === "utok" || f.me.o === "vozy" || f.foe.o === "utok" || f.foe.o === "vozy") mid += `<path d="M262 82h76" stroke="${PG.r}" stroke-width="3"/><path d="M${f.me.o === "utok" || f.me.o === "vozy" ? "338 82l-10 -6v12z" : "262 82l10 -6v12z"}" fill="${PG.r}"/>`;
  if (f.me.o === "boky" || f.foe.o === "boky") mid += `<path d="M${f.me.o === "boky" ? "220 30Q300 0 360 28" : "380 30Q300 0 240 28"}" stroke="${PG.g}" stroke-width="2.5" fill="none" stroke-dasharray="6 4"/>`;
  const ter = TERRAIN[f.ter] || {}, ground = ter.nile ? `<path d="M0 6h600" stroke="${PG.b}" stroke-width="5" opacity=".5"/>` : "";
  return `<svg class="field" viewBox="0 0 600 160" role="img" aria-label="Bojiště: tvé vojsko vlevo, nepřítel vpravo"><rect width="600" height="160" fill="#ecd9a8"/>${ground}
    ${armyBlocks(f.me.t, 205, -1, cm, opM, false)}${armyBlocks(f.foe.t, 395, 1, cf, opF, f.foe.hide)}${mid}
    ${ord(f.me.o, 20, "start")}${ord(f.foe.o, 580, "end")}
    <text x="20" y="140" class="fo">${esc(S.clans[f.me.cl].n)} · ${fmtN(men(f.me.t))} · morálka ${Math.round(f.me.m)}</text><text x="580" y="140" class="fo" text-anchor="end">${esc(S.clans[f.foe.cl].n)} · ${f.foe.hide ? "?" : fmtN(men(f.foe.t))} · morálka ${Math.round(f.foe.m)}</text>
    ${bar(20, f.me.m, cm, "l")}${bar(430, f.foe.m, cf, "r")}</svg>
    <div class="flegend small muted">▪ kopiníci · ● lučištníci · ▲ Médžajové · ◎ vozy (jedna značka ≈ 200 mužů; sytost barvy = morálka)</div>`;
}

// ---------- senet ----------
function senetSvg(d) {
  const sq = n => { const r = Math.floor((n - 1) / 10), i = (n - 1) % 10, c = r === 1 ? 9 - i : i; return [22 + c * 56, 22 + r * 46]; };
  let g = `<rect x="10" y="10" width="580" height="150" rx="6" fill="#8a5a2a" stroke="${PG.k}" stroke-width="2"/>`;
  for (let n = 1; n <= 30; n++) { const [x, y] = sq(n); g += `<rect x="${x}" y="${y}" width="52" height="42" rx="3" fill="${n === 27 ? "#9cc3dd" : PG.w}" stroke="${PG.k}"/>`;
    if (n === 15) g += A_.ankh(x + 26, y + 36, 0.7, PG.g); if (n === 26) g += `<ellipse cx="${x + 26}" cy="${y + 28}" rx="7" ry="8" fill="${PG.r}"/><path d="M${x + 26} ${y + 20}V${y + 6}M${x + 21} ${y + 11}h10" stroke="${PG.k}" stroke-width="2"/>`; if (n === 27) g += `<path d="M${x + 6} ${y + 18}l6 -5l6 5l6 -5l6 5l6 -5l6 5M${x + 6} ${y + 28}l6 -5l6 5l6 -5l6 5l6 -5l6 5" stroke="${PG.b}" fill="none" stroke-width="2"/>`;
    if (n >= 28) g += `<text x="${x + 26}" y="${y + 28}" text-anchor="middle" class="fo">${["III", "II", "I"][n - 28]}</text>`; }
  const piece = (n, col, dx, cone) => { if (n <= 0) { return cone ? `<path d="M${-6 + dx} 186l8 -20l8 20z" fill="${col}" stroke="${PG.k}"/>` : `<rect x="${dx - 6}" y="168" width="16" height="18" rx="5" fill="${col}" stroke="${PG.k}"/>`; } const [x, y] = sq(Math.min(30, n)); return cone ? `<path d="M${x + 10 + dx} ${y + 38}l10 -26l10 26z" fill="${col}" stroke="${PG.k}"/>` : `<rect x="${x + 22 + dx}" y="${y + 12}" width="18" height="26" rx="6" fill="${col}" stroke="${PG.k}"/>`; };
  g += piece(d.me, PG.b, 0, true) + piece(d.foe, PG.r, 4, false);
  const sticks = (t, x) => t ? [0, 1, 2, 3].map(i => `<rect x="${x + i * 12}" y="172" width="8" height="22" rx="3" fill="${i < (t === 5 ? 0 : t) ? PG.w : "#6d4a1f"}" stroke="${PG.k}"/>`).join("") : "";
  if (d.last) g += `<text x="120" y="190" class="fo">tvůj hod ${d.last[0]}</text>${sticks(d.last[0], 60)}<text x="560" y="190" text-anchor="end" class="fo">soupeř ${d.last[1]}</text>${sticks(d.last[1], 380)}`;
  return `<svg class="senet" viewBox="0 0 600 200" role="img" aria-label="Deska senetu: tvá figura na poli ${d.me}, soupeřova na poli ${d.foe}">${g}</svg>`;
}

// ---------- pruhy příjmů a výdajů ----------
function flowBars(inc, ex, unit) {
  const COLS = [PG.g, PG.b, PG.y, "#7a4b8c", "#4fa0a0", "#8a8a6a", PG.r, "#a0522d", "#5d6b7a", "#c47a2c"];
  const I = inc.filter(([, v]) => v > 0), E = ex.filter(([, v]) => v > 0), ti = sum(I.map(x => x[1])), te = sum(E.map(x => x[1])), mx = Math.max(1, ti, te);
  const bar = (L, tot, lbl) => `<div class="fb"><div class="fbl">${lbl} <b>${fmt(Math.round(tot))}</b></div><div class="fbb" style="width:${Math.max(4, tot / mx * 100)}%">${L.map(([n, v], i) => `<i style="flex:${v};background:${COLS[i % COLS.length]}" title="${esc(n)}: ${fmt(Math.round(v))}"></i>`).join("")}</div><div class="fbk">${L.map(([n, v], i) => `<span><i style="background:${COLS[i % COLS.length]}"></i>${esc(n)} ${fmt(Math.round(v))}</span>`).join("")}</div></div>`;
  return `<div class="flow">${I.length ? bar(I, ti, "Příjmy") : ""}${bar(E, te, "Výdaje")}</div>`;
}

// ---------- kolo svátků ----------
function festWheel() {
  const cx = 160, cy = 160, R = 140, r0 = 92, cols = ["#3d7fb0", "#4f8a5b", "#c9a227"], names = ["achet", "peret", "šemu"];
  let g = "";
  for (let m = 0; m < 12; m++) {
    const a0 = m / 12 * 2 * Math.PI - Math.PI / 2, a1 = (m + 1) / 12 * 2 * Math.PI - Math.PI / 2, P_ = (r, a) => `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
    g += `<path d="M${P_(r0, a0)}L${P_(R, a0)}A${R} ${R} 0 0 1 ${P_(R, a1)}L${P_(r0, a1)}A${r0} ${r0} 0 0 0 ${P_(r0, a0)}Z" fill="${cols[Math.floor(m / 4)]}" opacity="${m === S.month ? 1 : 0.55}" stroke="#fff" stroke-width="1.5"/>`;
    const am = (m + 0.5) / 12 * 2 * Math.PI - Math.PI / 2; g += `<text x="${(cx + (R - 16) * Math.cos(am)).toFixed(1)}" y="${(cy + (R - 16) * Math.sin(am) + 4).toFixed(1)}" text-anchor="middle" class="fw">${m % 4 + 1}</text>`;
  }
  FESTIVALS.forEach((f, i) => { const same = FESTIVALS.filter(x => x.m === f.m), k = same.indexOf(f), am = (f.m + 0.25 + k * 0.25) / 12 * 2 * Math.PI - Math.PI / 2, own = S.provs[f.pid].owner, x = cx + (r0 + 22) * Math.cos(am), y = cy + (r0 + 22) * Math.sin(am);
    g += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="${S.clans[own].col}" stroke="#fff" stroke-width="2"/><text x="${x.toFixed(1)}" y="${(y + 3.5).toFixed(1)}" text-anchor="middle" class="fw">${i + 1}</text>`; });
  const an = (S.month + 0.5) / 12 * 2 * Math.PI - Math.PI / 2;
  g += `<circle cx="${cx}" cy="${cy}" r="${r0 - 6}" fill="var(--panel)"/>${SCENES.svatek ? "" : ""}<path d="M${cx} ${cy}L${(cx + (r0 - 14) * Math.cos(an)).toFixed(1)} ${(cy + (r0 - 14) * Math.sin(an)).toFixed(1)}" stroke="${PG.r}" stroke-width="4" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="7" fill="${PG.r}"/>`;
  g += names.map((n, i) => { const am = (i * 4 + 2) / 12 * 2 * Math.PI - Math.PI / 2; return `<text x="${(cx + (r0 - 34) * Math.cos(am)).toFixed(1)}" y="${(cy + (r0 - 34) * Math.sin(am) + 4).toFixed(1)}" text-anchor="middle" class="fn">${n}</text>`; }).join("");
  return `<svg class="fwheel" viewBox="0 0 320 320" role="img" aria-label="Kalendář svátků, ručička ukazuje současný měsíc">${g}</svg>`;
}

// ---------- karty nomů ----------
const TER_ICON = { udoli: "nil", delta: "nil", fajjum: "nil", nubie: "nil", katarakt: "nil", oaza: "obchod", poust: "obchod", kenaan: "obchod" };
function nomeCard(p) {
  const L = chr(S, p.lord), C = P(S), cap = p.id === C.capital;
  const bar = (lbl, v, max, col) => `<div class="nb"><span>${lbl}</span><span class="nbt"><i style="width:${clamp(v / Math.max(1, max) * 100, 0, 100)}%;background:${col}"></i></span><b>${Math.round(v)}</b></div>`;
  return `<div class="nomec${p.hunger > 0.1 ? " hungry" : ""}${p.siege ? " besieged" : ""}" data-a="selProv" data-x='["${p.id}"]' style="--c:${C.col}">
    <div class="nch">${emblem(p.owner, 18)}<div><div class="nn">${esc(p.n)}${cap ? " ★" : ""}</div><div class="small muted">${esc(p.eg)}</div></div>${L ? portrait(L, 36) : ""}</div>
    <div class="nterr t-${p.ter}">${esc(TERRAIN[p.ter].n)} · ${esc(p.god)}</div>
    ${bar("Pole", p.agri, agriCap(S, p), PG.g)}${bar("Obchod", p.com, comCap(S, p), PG.y)}${bar("Spokojenost", p.loy, 100, p.loy < 35 ? PG.r : PG.b)}
    <div class="nchips"><span title="obyvatel">${ricon("urednici", 15)} ${fmtK(p.pop * 1000)}</span><span title="posádka">${ricon("vojsko", 15)} ${fmtK(men(p.troops))}</span><span title="obecní zásoby obilí">${ricon("grain", 15)} ${fmtK(p.stock)}</span><span title="hradby">hradby ${Math.round(p.dur)}</span></div>
    ${p.hunger > 0.1 ? '<div class="nwarn">hlad</div>' : ""}${p.siege ? '<div class="nwarn">obléhán</div>' : ""}${p.build ? `<div class="small muted">staví se: ${esc((BUILD[p.build.b] || { n: p.build.b }).n || p.build.b)} (ještě ${p.build.left} měs.)</div>` : ""}</div>`;
}
function tZupyArt() {
  const ps = myProvs().sort((a, b) => (b.id === P(S).capital) - (a.id === P(S).capital) || b.v - a.v);
  return `<div class="grid">${card(`Tvé nomy (${ps.length})`, `<div class="nomes">${ps.map(nomeCard).join("")}</div><p class="small muted">Klepni na nom a otevře se na mapě. Pruhy: pole a obchod vůči stropu, spokojenost lidu.</p>`, "wide")}</div>`;
}
