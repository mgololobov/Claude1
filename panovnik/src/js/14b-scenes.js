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
const GLYPH = {
  ikona: `<rect x="8" y="5" width="24" height="30" rx="2" fill="#e2b13c" stroke="#8a6a2a"/><rect x="12" y="9" width="16" height="22" fill="#7a2e1d"/><circle cx="20" cy="16" r="5" fill="#e3c4a0"/><circle cx="20" cy="16" r="7" fill="none" stroke="#ffe08a" stroke-width="1.5"/>`,
  astrolab: `<circle cx="20" cy="22" r="13" fill="#d9a441" stroke="#7a5a1a" stroke-width="2"/><circle cx="20" cy="22" r="8" fill="none" stroke="#7a5a1a"/><path d="M8 22 h24 M20 10 v24 M11 14 l18 16" stroke="#7a5a1a"/><circle cx="20" cy="7" r="3" fill="none" stroke="#7a5a1a" stroke-width="2"/>`,
  kniha: `<path d="M5 10 q8 -4 15 0 q7 -4 15 0 v22 q-8 -4 -15 0 q-7 -4 -15 0z" fill="#f2ead2" stroke="#6a4a2a" stroke-width="1.5"/><path d="M20 10 v22" stroke="#6a4a2a"/><path d="M8 15 h9 M8 19 h9 M23 15 h9 M23 19 h9 M23 23 h7" stroke="#8a7a6a"/>`,
  pohar: `<path d="M11 6 h18 q0 16 -9 18 q-9 -2 -9 -18z" fill="#9fd0e0" stroke="#3f6f8f" stroke-width="1.5" opacity=".9"/><path d="M20 24 v8 M13 34 h14" stroke="#3f6f8f" stroke-width="2"/><path d="M14 10 q2 6 5 8" stroke="#fff" fill="none"/>`,
  latka: `<path d="M8 8 q12 6 24 0 v24 q-12 6 -24 0z" fill="#8e44ad"/><path d="M8 14 q12 6 24 0 M8 22 q12 6 24 0" stroke="#e2b13c" fill="none" stroke-width="1.5"/>`,
  luk: `<path d="M10 4 q14 8 4 16 q10 8 -4 16" stroke="#6a3a1a" stroke-width="3" fill="none"/><path d="M10 4 v32" stroke="#ddd" stroke-width="1"/><path d="M6 20 h28 l-4 -3 M34 20 l-4 3" stroke="#3a2a1a" stroke-width="1.5" fill="none"/>`,
  relikviar: `<rect x="9" y="16" width="22" height="16" fill="#e2b13c" stroke="#8a6a2a"/><path d="M7 16 l13 -9 l13 9z" fill="#e2b13c" stroke="#8a6a2a"/><circle cx="20" cy="24" r="3" fill="#b3261e"/><path d="M20 7 v-4 M18 5 h4" stroke="#8a6a2a" stroke-width="1.5"/>`,
  mapa: `<path d="M5 9 l9 -3 l12 3 l9 -3 v25 l-9 3 l-12 -3 l-9 3z" fill="#efe1bd" stroke="#8a6a3a"/><path d="M14 6 v25 M26 9 v25" stroke="#8a6a3a" stroke-dasharray="2 2"/><path d="M8 20 q6 -6 10 0 t10 -2" stroke="#3f6f8f" fill="none"/><circle cx="29" cy="15" r="2" fill="#b3261e"/>`,
  kost: `<path d="M8 28 l22 -18" stroke="#efe6cf" stroke-width="5"/><circle cx="7" cy="27" r="3.5" fill="#efe6cf"/><circle cx="10" cy="31" r="3.5" fill="#efe6cf"/><circle cx="30" cy="8" r="3.5" fill="#efe6cf"/><circle cx="33" cy="12" r="3.5" fill="#efe6cf"/><path d="M8 28 l22 -18" stroke="#8a7a5a" stroke-width=".6" fill="none"/>`,
  kozesina: `<path d="M10 8 q10 -4 20 0 l4 10 l-6 2 l2 14 q-10 4 -20 0 l2 -14 l-6 -2z" fill="#6a4a2a"/><path d="M14 14 q6 2 12 0 M14 22 q6 2 12 0" stroke="#3a2a1a" fill="none"/>`,
  truhla: `<rect x="7" y="16" width="26" height="16" fill="#7a4a22" stroke="#e2b13c" stroke-width="1.5"/><path d="M7 16 q13 -12 26 0" fill="#8a5a2a" stroke="#e2b13c" stroke-width="1.5"/><rect x="18" y="20" width="4" height="5" fill="#e2b13c"/><circle cx="13" cy="12" r="2" fill="#c0392b"/><circle cx="26" cy="11" r="2" fill="#e2b13c"/>`,
  hodiny: `<rect x="12" y="4" width="16" height="32" fill="#8a7a6a"/><path d="M10 4 l10 -3 l10 3z" fill="#3a5a4a"/><circle cx="20" cy="15" r="6" fill="#f4efe0" stroke="#3a2e22"/><path d="M20 15 v-4 M20 15 h3" stroke="#3a2e22"/><path d="M16 36 v-8 a4 4 0 0 1 8 0 v8" fill="#2a2018"/>`,
  pluh: `<path d="M6 30 h22 l6 -6 M12 30 l6 -16 l12 -6" stroke="#5a3a1a" stroke-width="3" fill="none"/><path d="M26 30 l6 -2 l-2 6z" fill="#9a9da1"/><circle cx="8" cy="30" r="4" fill="none" stroke="#5a3a1a" stroke-width="2"/>`,
  kolo: `<circle cx="20" cy="20" r="13" fill="none" stroke="#5a3a1a" stroke-width="3"/>${[0, 1, 2, 3, 4, 5].map(i => `<path d="M20 20 l${Math.cos(i * 1.05) * 13} ${Math.sin(i * 1.05) * 13}" stroke="#5a3a1a" stroke-width="2"/><rect x="${18 + Math.cos(i * 1.05) * 14}" y="${18 + Math.sin(i * 1.05) * 14}" width="4" height="4" fill="#3f6f8f"/>`).join("")}`,
  mlyn: `<path d="M14 36 l3 -20 h6 l3 20z" fill="#c9b48a" stroke="#6a4a2a"/><g stroke="#6a4a2a" stroke-width="2">${[0, 1, 2, 3].map(i => `<path d="M20 16 l${Math.cos(i * 1.57 + 0.4) * 15} ${Math.sin(i * 1.57 + 0.4) * 15}"/>`).join("")}</g><circle cx="20" cy="16" r="2" fill="#3a2a1a"/>`,
  ryba: `<path d="M6 20 q12 -12 24 0 q-12 12 -24 0z" fill="#6f9ab8" stroke="#2f5a7a"/><path d="M30 20 l6 -6 v12z" fill="#6f9ab8" stroke="#2f5a7a"/><circle cx="12" cy="18" r="1.5" fill="#123"/><path d="M4 34 q8 -4 16 0 t16 0" stroke="#3f6f8f" fill="none"/>`,
  chmel: `<path d="M20 4 v8" stroke="#3f6a2a" stroke-width="2"/>${[[20, 16], [14, 22], [26, 22], [20, 28], [16, 33], [24, 33]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="4" ry="5" fill="#8ab04a" stroke="#4a6a2a"/>`).join("")}`,
  papir: `<path d="M9 5 h16 l6 6 v24 h-22z" fill="#f4efe0" stroke="#8a7a6a"/><path d="M25 5 v6 h6" fill="none" stroke="#8a7a6a"/><path d="M13 16 h14 M13 21 h14 M13 26 h10" stroke="#8a7a6a"/><path d="M28 30 l8 -18" stroke="#3a2a1a" stroke-width="2"/>`,
  klenba: `<path d="M5 35 V18 Q20 0 35 18 V35" fill="none" stroke="#6a5a4a" stroke-width="3"/><path d="M12 35 V20 Q20 8 28 20 V35" fill="none" stroke="#8a7a6a" stroke-width="2"/><path d="M20 4 v31" stroke="#8a7a6a"/>`,
  hrad: `<g fill="#6a5a4a"><rect x="8" y="16" width="24" height="18"/><rect x="5" y="9" width="8" height="25"/><rect x="27" y="9" width="8" height="25"/><rect x="16" y="4" width="8" height="14"/></g><path d="M17 34 v-7 a3 3 0 0 1 6 0 v7" fill="#2a2018"/>`,
  mince: `<circle cx="16" cy="22" r="10" fill="#cfd3d6" stroke="#6a6a6a"/><circle cx="24" cy="18" r="10" fill="#e2b13c" stroke="#8a6a2a"/><path d="M20 18 h8 M24 14 v8" stroke="#8a6a2a" stroke-width="1.5"/>`,
  svitek: `<path d="M10 8 h20 v24 h-20z" fill="#efe1bd" stroke="#8a6a3a"/><rect x="7" y="5" width="26" height="5" rx="2.5" fill="#c9a66a"/><rect x="7" y="30" width="26" height="5" rx="2.5" fill="#c9a66a"/><path d="M14 16 h12 M14 20 h12 M14 24 h8" stroke="#8a6a3a"/><circle cx="26" cy="27" r="3" fill="#b3261e"/>`,
  hvezda: `<path d="M20 4 l4 11 h11 l-9 7 l3 11 l-9 -7 l-9 7 l3 -11 l-9 -7 h11z" fill="#e2b13c" stroke="#8a6a2a"/>`,
  kun: `<path d="M10 34 l4 -12 q-4 -10 6 -16 l2 -4 l3 5 q8 4 6 12 l-6 -2 l-2 6 l4 11z" fill="#6a4a2a"/><circle cx="23" cy="10" r="1.2" fill="#fff"/>`,
  bylina: `<path d="M20 36 V12" stroke="#3f6a2a" stroke-width="2"/>${[0, 1, 2].map(i => `<path d="M20 ${30 - i * 8} q-10 -2 -12 -8 q8 0 12 8z M20 ${28 - i * 8} q10 -2 12 -8 q-8 0 -12 8z" fill="#6aa04a"/>`).join("")}<circle cx="20" cy="9" r="3" fill="#e7c3e0"/>`,
  banka: `<path d="M16 5 h8 v10 l9 17 q1 4 -3 4 h-20 q-4 0 -3 -4 l9 -17z" fill="#9fd8a0" stroke="#3f6a2a" opacity=".9"/><path d="M11 26 h18" stroke="#3f6a2a"/><circle cx="18" cy="30" r="1.5" fill="#fff"/><circle cx="23" cy="28" r="1" fill="#fff"/>`,
  kuse: `<path d="M8 12 q12 -8 24 0" stroke="#5a3a1a" stroke-width="3" fill="none"/><path d="M20 8 v26" stroke="#7a5a3a" stroke-width="4"/><path d="M8 12 L20 22 L32 12" stroke="#ccc" fill="none"/><path d="M20 4 l-3 6 h6z" fill="#9a9da1"/>`,
  zbroj: `<path d="M10 8 h20 l2 10 l-4 16 h-16 l-4 -16z" fill="#9a9da1" stroke="#4a4a4a"/><path d="M14 8 q6 6 12 0" fill="none" stroke="#4a4a4a"/><path d="M12 20 h16 M13 26 h14" stroke="#6a6a6a"/>`,
  trebuchet: `<path d="M8 34 h24 M12 34 l8 -18 l8 18" stroke="#5a3a1a" stroke-width="2.5" fill="none"/><path d="M6 8 L32 22" stroke="#7a5a3a" stroke-width="3"/><rect x="28" y="20" width="8" height="8" fill="#5a5a5a"/><circle cx="6" cy="8" r="3" fill="#8a8a8a"/>`,
  prapor: `<path d="M10 36 V4" stroke="#3a2a1a" stroke-width="2"/><path d="M10 5 h22 l-5 7 l5 7 h-22z" fill="#b3261e"/><path d="M17 9 l3 3 l-3 3 l-3 -3z" fill="#e2b13c"/>`,
  stit: `<path d="M8 6 h24 v12 q0 12 -12 18 q-12 -6 -12 -18z" fill="#2f5d50" stroke="#1a2a24"/><path d="M20 6 v30 M8 16 h24" stroke="#e2b13c" stroke-width="2"/>`,
  delo: `<rect x="6" y="14" width="24" height="10" rx="4" fill="#5a5a5a" transform="rotate(-12 18 19)"/><circle cx="14" cy="28" r="6" fill="none" stroke="#5a3a1a" stroke-width="3"/><path d="M30 12 q4 -6 8 -2 q2 -6 -4 -8" fill="#c8c8c8" opacity=".7"/>`,
  kuryr: `<path d="M8 34 l4 -12 q-4 -10 6 -16 l2 -4 l3 5 q8 4 6 12 l-6 -2 l-2 6 l4 11z" fill="#6a4a2a"/><rect x="25" y="16" width="11" height="8" fill="#efe1bd" stroke="#8a6a3a"/><circle cx="30" cy="20" r="2" fill="#b3261e"/>`,
};
const TECH_GLYPH = { trojpole: "pluh", pluh: "pluh", vodni_kolo: "kolo", kolonizace: "bylina", hornictvi: "mince", cechy: "svitek", gotika: "klenba", ucetnictvi: "mince", mince: "mince", zakonik: "svitek", univerzita: "kniha", medicina: "bylina", kuse: "kuse", zbroj: "zbroj", trebuchet: "trebuchet", taktika: "prapor",
  rybnikarstvi: "ryba", vetrny_mlyn: "mlyn", chmelnice: "chmel", papir: "papir", sklo: "pohar", soustredne: "hrad", smenka: "mince", urbar: "svitek", kuryri: "kuryr", astronomie: "hvezda", alchymie: "banka", kartografie: "mapa", karantena: "bylina", paveza: "stit", destrier: "kun", prach: "delo" };
const glyph = (k, size = 40, cl = "") => `<svg class="glyph ${cl}" viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true">${GLYPH[k] || GLYPH.hvezda}</svg>`;

// ---------- mapa známého světa ----------
const WX = lon => (lon + 12) * 10, WY = lat => (63 - lat) * 10.9;
const WPOLY = { sea: [
  [[-5.5, 36], [-2, 36.7], [3, 36.8], [10, 37], [11, 33], [20, 31], [30, 31], [36, 34], [36, 36.5], [28, 36.8], [26, 40], [23, 40.5], [20, 40], [19.5, 42], [13.5, 45.6], [12.3, 45.4], [16, 41.5], [18.5, 40], [16, 38], [12.5, 41.8], [10, 44], [8.8, 44.4], [6, 43], [3, 43.3], [0, 39], [-0.5, 38], [-2, 36.8]],
  [[28, 41.2], [29, 44], [30.5, 46.5], [33, 46], [34, 44.5], [37, 45], [38, 47], [39.5, 47], [38, 44.5], [41.5, 41.5], [36, 41.7], [32, 41.8], [29, 41.2]],
  [[10, 54], [12, 54.4], [14, 54], [18, 54.6], [21, 55], [21, 57], [24, 57.3], [23.5, 59.4], [30, 60], [22, 60.3], [21, 61], [17.5, 61], [19, 63.5], [25, 65.5], [21, 65], [17, 62], [16, 58], [14.5, 56.2], [12.5, 56], [10.5, 56]],
  [[-14, 64], [5, 64], [5, 58], [8, 57], [8.5, 55], [8, 53.5], [5, 53], [3, 51.3], [1.5, 50.9], [-1, 49.5], [-1.5, 48.7], [-4.5, 48.5], [-2, 47], [-1, 46], [-1.5, 43.5], [-9, 43], [-9, 38.7], [-8.8, 37], [-6, 36.5], [-14, 36]],
  [[47, 46.5], [50, 46.5], [53, 45], [52.5, 41], [53.5, 37], [50, 37], [49, 39.5], [47.5, 42], [47, 44]]],
  land: [[[-5.7, 50], [1.4, 51.2], [1.7, 52.7], [0, 53.5], [-0.5, 54.5], [-1.6, 55.6], [-2, 57.6], [-3.5, 58.6], [-5, 58.6], [-6, 57], [-5.5, 55.5], [-3, 54.8], [-4.5, 53.3], [-4.7, 51.7]], [[-10, 51.5], [-6, 52], [-6, 54.5], [-8, 55.2], [-10, 54]]] };
const wpath = pts => "M" + pts.map(([lo, la]) => `${WX(lo).toFixed(0)} ${WY(la).toFixed(0)}`).join(" L") + "Z";
const DEST_LBL = { benatky: { ox: 10, oy: -10, lx: 16, ly: -4, a: "start" }, bologna: { ox: -16, oy: 4, lx: -16, ly: 4, a: "end" }, rim: { ox: 8, oy: 10 }, santiago: { ox: 8, lx: -14, a: "start" }, sarai: { lx: 14, a: "end" } };
const DEST_GLYPH = { lod: "mapa", stan: "truhla", kostel: "relikviar", hrad: "hrad", kniha: "kniha" };
function worldMap() {
  const C = P(S), cap = S.provs[C.capital], cx = WX(cap.lon), cy = WY(cap.lat), exps = C.exps || [];
  let g = `<defs><radialGradient id="wmg" cx=".5" cy=".5" r=".7"><stop offset="0" stop-color="#f4e8c8"/><stop offset="1" stop-color="#d9c08e"/></radialGradient></defs><rect width="640" height="360" fill="url(#wmg)"/>`;
  g += WPOLY.sea.map(p => `<path d="${wpath(p)}" fill="#a9c3c9" stroke="#6f8f96" stroke-width="1.2"/>`).join("") + WPOLY.land.map(p => `<path d="${wpath(p)}" fill="#ecdcb4" stroke="#6f8f96"/>`).join("");
  for (let x = 0; x < 640; x += 64) g += `<path d="M${x} 0 V360" stroke="#8a6a3a" opacity=".12"/>`; for (let y = 0; y < 360; y += 60) g += `<path d="M0 ${y} H640" stroke="#8a6a3a" opacity=".12"/>`;
  g += `<g transform="translate(590 310)" opacity=".7"><circle r="22" fill="none" stroke="#7a5a2a"/><path d="M0 -26 l5 22 l-5 4 l-5 -4z" fill="#7a2e1d"/><path d="M0 26 l5 -22 l-5 -4 l-5 4z M-26 0 l22 5 l4 -5 l-4 -5z M26 0 l-22 5 l-4 -5 l4 -5z" fill="#7a5a2a"/><text y="-30" text-anchor="middle" font-size="10" fill="#7a2e1d">S</text></g>`;
  g += `<text x="60" y="210" font-size="13" fill="#5a7a80" font-style="italic">Oceán</text><text x="210" y="330" font-size="12" fill="#5a7a80" font-style="italic">Středozemní moře</text>`;
  for (const [d, D] of Object.entries(DESTS)) {
    const L = DEST_LBL[d] || {}, x = WX(D.lon) + (L.ox || 0), y = WY(D.lat) + (L.oy || 0), mx = (cx + x) / 2, my = (cy + y) / 2 - 30, e = exps.find(q => q.d === d), gone = D.until && S.year >= D.until;
    g += `<path d="M${cx} ${cy} Q${mx} ${my} ${x} ${y}" fill="none" stroke="${e ? "#b3261e" : "#7a5a2a"}" stroke-width="${e ? 2.2 : 1.2}" stroke-dasharray="5 4" opacity="${gone ? 0.25 : 0.8}"/>`;
    if (e) { const t = clamp((S.turn - e.start) / e.m, 0, 1), k = t < 0.5 ? t * 2 : (1 - t) * 2, bx = (1 - k) * (1 - k) * cx + 2 * (1 - k) * k * mx + k * k * x, by = (1 - k) * (1 - k) * cy + 2 * (1 - k) * k * my + k * k * y;
      g += `<g transform="translate(${bx.toFixed(0)} ${by.toFixed(0)})"><circle r="9" fill="#fbf7ee" stroke="#b3261e" stroke-width="2"/><svg x="-8" y="-8" width="16" height="16" viewBox="0 0 40 40">${GLYPH.kun}</svg></g>`; }
    g += `<g class="wdest${gone ? " gone" : ""}" data-a="expsel" data-x='["${d}"]' style="cursor:pointer"><circle cx="${x}" cy="${y}" r="13" fill="#fbf7ee" stroke="#7a2e1d" stroke-width="1.5"/><svg x="${x - 10}" y="${y - 10}" width="20" height="20" viewBox="0 0 40 40">${GLYPH[DEST_GLYPH[D.ic]]}</svg><text x="${x + (L.lx || 0)}" y="${y + (L.ly == null ? 25 : L.ly)}" text-anchor="${L.a || "middle"}" font-size="11" fill="#3a2a1a" stroke="#f4e8c8" stroke-width="3" paint-order="stroke">${esc(D.n)}</text></g>`;
  }
  g += `<g transform="translate(${cx} ${cy})"><circle r="8" fill="#7a2e1d"/><path d="M0 -5 l1.5 3.5 h3.5 l-3 2 l1 3.5 l-3 -2 l-3 2 l1 -3.5 l-3 -2 h3.5z" fill="#e2b13c"/></g>`;
  return `<svg class="worldmap" viewBox="0 0 640 360">${g}</svg>`;
}
