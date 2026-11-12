// Další ilustrace: nové scény událostí, kresby pokladů a objevů, mapa známého světa.
const SCENE_NIGHT = ["vlci", "zatmeni", "hvezdy"], SCENE_STORM = ["povoden", "zemetreseni"], SCENE_IN = ["alchymie", "hudba", "relikvie", "poklad"];
const SCENE_X = {}; // starší výjevy nahradily miniatury v 14d-miniscenes.js
function eventArt(ev) {
  if (ev.id === "_hist") return HIST2[ev.k].art;
  if (ev.id === "_exp") return ev.lost ? "pozar" : { lod: "lod", stan: "karavana", kostel: "relikvie", hrad: "mesto", kniha: "uceni" }[DESTS[ev.d].ic] || "mesto";
  if (ev.id === "_objev") return { "Zemědělství": "uroda", "Řemesla": "stavba", "Správa": "mesto", "Učenost": "hvezdy", "Válečnictví": "valka" }[TECHS[ev.t].cat] || "uceni";
  return EVENT_ART[ev.id] || "dvur";
}

// ---------- malé kresby (vzácnosti a objevy) ----------
const GLYPH = {}; // kresby ikon jsou v 14e-icons.js
const TECH_GLYPH = { trojpole: "pluh", pluh: "pluh", vodni_kolo: "kolo", kolonizace: "bylina", hornictvi: "mince", cechy: "svitek", gotika: "klenba", ucetnictvi: "mince", mince: "mince", zakonik: "svitek", univerzita: "kniha", medicina: "bylina", kuse: "kuse", zbroj: "zbroj", trebuchet: "trebuchet", taktika: "prapor",
  rybnikarstvi: "ryba", vetrny_mlyn: "mlyn", chmelnice: "chmel", papir: "papir", sklo: "pohar", soustredne: "hrad", smenka: "mince", urbar: "svitek", kuryri: "kuryr", astronomie: "hvezda", alchymie: "banka", kartografie: "mapa", karantena: "bylina", paveza: "stit", destrier: "kun", prach: "delo" };
const glyph = (k, size = 40, cl = "") => `<svg class="glyph ${cl}" viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true"><g stroke="#2a1c12" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round">${GLYPH[k] || GLYPH.hvezda}</g></svg>`;

// ---------- mapa známého světa ----------
const WX = lon => (lon + 12) * 10, WY = lat => (63 - lat) * 10.9;
const DEST_LBL = { benatky: { ox: 10, oy: -10, lx: 16, ly: -4, a: "start" }, bologna: { ox: -16, oy: 4, lx: -16, ly: 4, a: "end" }, rim: { ox: 8, oy: 10 }, santiago: { ox: 8, lx: -14, a: "start" }, sarai: { lx: 14, a: "end" } };
const DEST_GLYPH = { lod: "mapa", stan: "truhla", kostel: "relikviar", hrad: "hrad", kniha: "kniha" };
// worldMap() je v 14e-icons.js
