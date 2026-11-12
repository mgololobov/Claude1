// Velká přestavba vzhledu a ovládání: úvodní obrazovka se scénáři, nová mapa (jemná území, ikony sídel, pyramidy,
// hory, praporce vojsk, značky bitev), rada s královským výnosem, skupiny záložek, zprávy měsíce, oznámení období.

// ================= MAPA =================
let GEO2 = null, TERR2 = { key: null, url: null };
function geoArt() {
  if (GEO2) return GEO2;
  const w = MW, h = MH, ps = Object.values(S.provs), n = ps.length;
  const px = ps.map(p => MX(p.lon)), py = ps.map(p => MY(p.lat)), rad = ps.map(p => (p.ter === "poust" || p.ter === "oaza" || p.ter === "kenaan" ? 46 : p.ter === "delta" ? 27 : p.ter === "nubie" || p.ter === "katarakt" ? 24 : 21)), idx = new Int16Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let best = -1, bd = 1; const jx = x + Math.sin(y * 0.21) * 1.6 + Math.sin(y * 0.07 + x * 0.05) * 2.2, jy = y + Math.cos(x * 0.19) * 1.6 + Math.cos(x * 0.06 - y * 0.04) * 2.2;
    for (let i = 0; i < n; i++) { const dx = px[i] - jx, dy = py[i] - jy, d2 = (dx * dx + dy * dy) / (rad[i] * rad[i]); if (d2 < bd) { bd = d2; best = i; } }
    idx[y * w + x] = best;
  }
  GEO2 = { w, h, idx, ids: ps.map(p => p.id) }; return GEO2;
}
function terrArt(mode) {
  if (typeof document === "undefined") return "";
  const G = geoArt(), ps = G.ids.map(id => S.provs[id]), cols = ps.map(p => modeColor(p, mode)), own = ps.map(p => p.owner);
  const key = mode + "|" + cols.map(c => c ? c.join(".") : "-").join(",") + "|" + own.join(",");
  if (TERR2.key === key && TERR2.url) return TERR2.url;
  const { w, h, idx } = G, cv = document.createElement("canvas"); cv.width = w; cv.height = h; const ctx = cv.getContext("2d"), img = ctx.createImageData(w, h), D = img.data;
  const rgb = {}; for (const C of Object.values(S.clans)) rgb[C.id] = hexRgb(C.col);
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : idx[y * w + x]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x, i = idx[k], o = k * 4; if (i < 0) continue;
    let realm = 0, prov = false;
    for (const [dx, dy, wt] of [[1, 0, 2], [-1, 0, 2], [0, 1, 2], [0, -1, 2], [2, 0, 1], [-2, 0, 1], [0, 2, 1], [0, -2, 1], [3, 0, 0.5], [-3, 0, 0.5], [0, 3, 0.5], [0, -3, 0.5]]) { const j = at(x + dx, y + dy); if (j !== i) { if (j < 0 || own[j] !== own[i]) realm = Math.max(realm, wt); else if (wt === 2) prov = true; } }
    const c = cols[i];
    if (realm && mode === "polit") { const [r, g, b] = rgb[own[i]], t = realm === 2 ? 0.42 : realm === 1 ? 0.62 : 0.85; D[o] = r * t; D[o + 1] = g * t; D[o + 2] = b * t; D[o + 3] = realm === 2 ? 235 : realm === 1 ? 200 : (c ? c[3] + 40 : 120); }
    else if (realm === 2 || prov) { D[o] = 60; D[o + 1] = 40; D[o + 2] = 20; D[o + 3] = realm ? 150 : 60; }
    else if (c) { D[o] = c[0]; D[o + 1] = c[1]; D[o + 2] = c[2]; D[o + 3] = mode === "polit" ? (own[i] === me() ? 150 : 105) : c[3]; }
  }
  ctx.putImageData(img, 0, 0); TERR2 = { key, url: cv.toDataURL() }; return TERR2.url;
}
const MOUNTS = [[28.6, 32.6], [28.1, 32.9], [27.6, 33.2], [27.1, 33.45], [26.6, 33.6], [26.15, 33.95], [25.5, 34.2], [25.0, 34.4], [24.4, 34.6], [23.8, 34.9], [23.2, 35.0], [22.6, 34.6], [22.0, 34.2], [21.4, 33.5], [20.6, 33.0], [28.75, 33.95], [28.35, 34.05], [29.1, 33.75], [23.0, 33.6], [24.9, 33.75]];
const DUNES = [[29.0, 26.4], [27.6, 26.2], [26.2, 27.0], [24.4, 26.6], [23.0, 27.6], [21.6, 26.8], [20.4, 28.2], [22.4, 29.4], [28.0, 27.9], [30.0, 27.4], [24.2, 28.6], [20.2, 26.4]];
const M_ICON = {
  house: '<path d="M-.7 0V-.8L0 -1.4L.7 -.8V0Z"/><rect x="-.16" y="-.5" width=".32" height=".5" fill="#2b1d12" stroke="none"/>',
  city: '<path d="M-1.55 0V-.7L-1.05 -1.1L-.55 -.7V0Z M.55 0V-.7L1.05 -1.1L1.55 -.7V0Z M-.62 0V-1.2L0 -1.8L.62 -1.2V0Z"/><rect x="-.16" y="-.55" width=".32" height=".55" fill="#2b1d12" stroke="none"/>',
  fort: '<path d="M-.95 0V-1.6H-.6V-1.25H-.2V-1.6H.2V-1.25H.6V-1.6H.95V0Z"/><path d="M-.22 0V-.6A.22 .22 0 0 1 .22 -.6V0Z" fill="#2b1d12" stroke="none"/>',
  cap: '<path d="M-1.65 0L-1.4 -1.75H-.38L-.2 0Z M.2 0L.38 -1.75H1.4L1.65 0Z"/><rect x="-.2" y="-1.15" width=".4" height="1.15" fill="#2b1d12" stroke="none"/><path d="M-.9 -1.75V-2.7M.9 -1.75V-2.7" fill="none"/><path d="M-.9 -2.7L-.2 -2.45L-.9 -2.2Z M.9 -2.7L1.6 -2.45L.9 -2.2Z" fill="#f2d27a"/>',
};
function mapSvgArt() {
  const [vx, vy, vw, vh] = mapVB(), k = vw / MW, f = Math.max(0.32, k), R = 7.2 * f, mode = SEL.mapMode || "polit";
  let g = `<defs>
    <radialGradient id="dsr" cx="48%" cy="42%" r="80%"><stop offset="0" stop-color="#ecd29a"/><stop offset=".6" stop-color="#dcb878"/><stop offset="1" stop-color="#bf9050"/></radialGradient>
    <linearGradient id="seag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d5f96"/><stop offset="1" stop-color="#4a86bd"/></linearGradient>
    <pattern id="wav" width="26" height="10" patternUnits="userSpaceOnUse"><path d="M0 6q3.2 -4 6.5 0t6.5 0t6.5 0t6.5 0" fill="none" stroke="#cfe2f3" stroke-width=".6" opacity=".28"/></pattern>
    <filter id="soft" x="-2%" y="-2%" width="104%" height="104%"><feGaussianBlur stdDeviation=".55"/></filter>
    <filter id="paper" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 .35  0 0 0 0 .22  0 0 0 0 .08  0 0 0 .5 -.12"/></filter>
    <filter id="glow"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <radialGradient id="vig" cx="50%" cy="50%" r="72%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#3a2208" stop-opacity=".42"/></radialGradient>
  </defs>
  <rect x="-500" y="-500" width="${MW + 1000}" height="${MH + 1000}" fill="url(#dsr)"/><rect x="-30" y="-30" width="${MW + 60}" height="${MH + 60}" filter="url(#paper)" opacity=".9"/>`;
  for (const [la, lo] of DUNES) { const x = MX(lo), y = MY(la); g += `<path d="M${x - 16} ${y}q8 -7 16 0t16 0M${x - 8} ${y + 6}q8 -7 16 0t16 0" fill="none" stroke="#a87a3e" stroke-width=".7" opacity=".5"/>`; }
  for (const [la, lo] of MOUNTS) { const x = MX(lo), y = MY(la); g += `<path d="M${x - 7} ${y}l5 -8l3 4l2.5 -3.5l5.5 7.5z" fill="#b48c58" stroke="#74522a" stroke-width=".45"/><path d="M${x - 2} ${y - 8}l3 4l-1 4h-4z" fill="#8a6638" opacity=".55"/>`; }
  const tu = terrArt(mode); if (tu) g += `<image href="${tu}" x="0" y="0" width="${MW}" height="${MH}" preserveAspectRatio="none" pointer-events="none" filter="url(#soft)"/>`;
  g += `<polygon points="${pts(MED)} ${MX(36)},${MY(32.8)} ${MX(24)},${MY(32.8)} ${MX(24)},${MY(31.9)}" fill="url(#seag)"/><polygon points="${pts(RED)}" fill="url(#seag)"/><polygon points="${pts(MED)} ${MX(36)},${MY(32.8)} ${MX(24)},${MY(32.8)} ${MX(24)},${MY(31.9)}" fill="url(#wav)"/><polygon points="${pts(RED)}" fill="url(#wav)"/>
    <polyline points="${pts(MED)}" fill="none" stroke="#f6ecd0" stroke-width="2.2" opacity=".55"/><polyline points="${pts(MED)}" fill="none" stroke="#2b1d12" stroke-width=".6" opacity=".5"/><polygon points="${pts(RED)}" fill="none" stroke="#f6ecd0" stroke-width="1.6" opacity=".45"/>`;
  const kemOp = mode === "teren" ? 0.95 : mode === "polit" ? 0.62 : 0.35;
  g += `<polygon fill="var(--kemet)" opacity="${kemOp}" points="${pts(DELTA_FAN)}"/>`;
  for (const L of [NILE, BAHR]) g += `<polyline class="kemet" points="${pts(L)}" stroke-width="${(L === NILE ? 8.5 : 5) * f}" opacity="${kemOp}"/>`;
  g += `<ellipse cx="${MX(30.8)}" cy="${MY(29.35)}" rx="13" ry="8" fill="var(--kemet)" opacity="${kemOp * 0.9}"/>`;
  for (const [la, lo, rx, ry] of [[28.35, 28.86, 9, 5], [25.55, 29.2, 12, 4], [25.44, 30.55, 5, 11]]) g += `<ellipse cx="${MX(lo)}" cy="${MY(la)}" rx="${rx}" ry="${ry}" fill="var(--kemet)" opacity="${kemOp * 0.8}"/>`;
  g += `<ellipse cx="${MX(30.62)}" cy="${MY(29.47)}" rx="10" ry="3.5" fill="#3d77ad"/>`;
  if (S.month < 4) { for (const L of [NILE, BAHR]) g += `<polyline class="floodw" points="${pts(L)}" fill="none" stroke="#4f93cf" stroke-width="${(L === NILE ? 7.5 : 4) * f}" stroke-linecap="round" stroke-linejoin="round"><title>Období achet: Nil zaplavil nivu</title></polyline>`; g += `<polygon class="floodw" points="${pts(DELTA_FAN)}" fill="#4f93cf"/>`; }
  g += `<path id="nilepath" d="M${NILE.slice().reverse().map(([la, lo]) => MX(lo).toFixed(1) + " " + MY(la).toFixed(1)).join(" L")}" fill="none" stroke="none"/>`;
  for (const L of [NILE, NILE_W, NILE_E, NILE_M]) g += `<polyline points="${pts(L)}" fill="none" stroke="#123a70" stroke-linecap="round" stroke-linejoin="round" stroke-width="${(L === NILE ? 3.6 : 2.3) * f}" opacity=".55"/><polyline class="nile" points="${pts(L)}" stroke-width="${L === NILE ? 2.5 * f : 1.5 * f}" style="stroke:#3d86d6"/>`;
  g += `<polyline class="nile" points="${pts(BAHR)}" stroke-width="${0.9 * f}" opacity=".75" style="stroke:#3d86d6"/>`;
  for (let i = 0; i < 5; i++) g += `<g class="boat"><g transform="scale(${Math.max(0.7, f * 1.2)})"><path d="M-7 -1Q0 3 7 -1L5 2.2Q0 4.2 -5 2.2Z" fill="#7a4f1f" stroke="#2b1d12" stroke-width=".35"/><path d="M0 0V-7" stroke="#2b1d12" stroke-width=".5"/><path d="M-2.2 -6.6H2.2L3 -2.6H-3Z" fill="#f6ecd0" stroke="#6d4a1f" stroke-width=".3"/></g><animateMotion dur="${130 + i * 23}s" begin="-${i * 31}s" repeatCount="indefinite" ${i % 2 ? 'keyPoints="1;0" keyTimes="0;1" calcMode="linear"' : ""}><mpath href="#nilepath"/></animateMotion></g>`;
  // památky Staré říše, které v krajině stály ve všech obdobích hry
  { const x = MX(31.13), y = MY(29.98); g += `<g opacity=".95"><title>Pyramidy v Gíze (4. dynastie)</title><path d="M${x - 9} ${y}l3.5 -5.5l3.5 5.5zM${x - 4.5} ${y}l4.5 -7.5l4.5 7.5zM${x + 1} ${y}l3 -4.6l3 4.6z" fill="#e8d5a0" stroke="#74522a" stroke-width=".4"/><path d="M${x} ${y - 7.5}l4.5 7.5h-2.4z" fill="#74522a" opacity=".3"/></g>`;
    const sx = MX(31.02), sy = MY(29.82); g += `<path d="M${sx - 4} ${sy}v-1.4h1v-1.4h1v-1.4h1v-1.4h2v1.4h1v1.4h1v1.4h1v1.4z" fill="#e8d5a0" stroke="#74522a" stroke-width=".35"><title>Džoserova stupňovitá pyramida v Sakkáře (3. dynastie)</title></path>`; }
  for (const [la, lo] of [[31.28, 30.95], [31.32, 31.3], [31.17, 31.72], [31.05, 30.52], [31.38, 30.62]]) { const x = MX(lo), y = MY(la); g += `<path d="M${x} ${y}v-5M${x - 2.5} ${y}v-4M${x + 2.5} ${y}v-4" stroke="#3f7a3a" stroke-width=".6"/><path d="M${x - 2} ${y - 6.5}q2 2.5 4 0zM${x - 4.5} ${y - 5.3}q2 2.3 4 0zM${x + .5} ${y - 5.3}q2 2.3 4 0z" fill="#3f7a3a"/>`; }
  const reg = [["Středozemní moře", 31.78, 28.2, 1], ["Rudé moře", 24.0, 35.8, 1], ["Libyjská poušť", 26.4, 27.2, 0], ["Východní poušť", 24.3, 33.75, 0], ["SINAJ", 29.75, 33.75, 0], ["NÚBIE", 21.0, 32.7, 0], ["DELTA", 31.45, 31.2, 0], ["HORNÍ EGYPT", 27.45, 32.35, 0], ["DOLNÍ EGYPT", 29.95, 32.45, 0], ["KENAAN", 31.55, 34.75, 0]];
  for (const [t, la, lo, sea] of reg) g += `<text class="region${sea ? " sea2" : ""}" x="${MX(lo)}" y="${MY(la)}" font-size="${12 * f}" text-anchor="middle">${t}</text>`;
  const done = new Set();
  for (const p of Object.values(S.provs)) for (const n of p.nb) { const key = p.id < n ? p.id + n : n + p.id; if (done.has(key)) continue; done.add(key); const q = S.provs[n]; if (!TERRAIN[p.ter].nile || !TERRAIN[q.ter].nile) g += `<line class="edge" x1="${MX(p.lon)}" y1="${MY(p.lat)}" x2="${MX(q.lon)}" y2="${MY(q.lat)}" stroke-width="${0.9 * f}"/>`; }
  if (mode === "obchod") for (const Rt of ROUTES) { const op = routeState(S, Rt).open; g += `<polyline points="${Rt.provs.map(id => MX(S.provs[id].lon) + "," + MY(S.provs[id].lat)).join(" ")}" fill="none" stroke="${Rt.col}" stroke-width="${4.5 * f}" stroke-linecap="round" stroke-linejoin="round" opacity=".85" ${op ? "" : `stroke-dasharray="${5 * f} ${4 * f}"`}><title>${esc(Rt.n)}${op ? "" : " – přerušená"}</title></polyline>`; }
  for (const a of S.armies) { if (!a.path || !a.path.length) continue; const own = a.cl === me(); if (!own && !knows(S, S.provs[a.loc])) continue; const L = [a.loc].concat(a.path).map(id => S.provs[id]); g += `<polyline class="march ${own ? "own" : "foe"}" stroke-width="${2 * f}" stroke-dasharray="${3.5 * f} ${2.5 * f}" stroke-linecap="round" points="${L.map(p => MX(p.lon) + "," + MY(p.lat)).join(" ")}"/>`; }
  const LEFT = new Set(["u2", "u4", "u6", "u8", "u10", "u12", "u14", "u16", "u18", "u20", "u22", "l2", "l3", "l5", "l6", "lx", "fa", "o_bah", "n_sai", "n_semna", "n_wawat"]);
  for (const p of Object.values(S.provs)) {
    const x = MX(p.lon), y = MY(p.lat), C = S.clans[p.owner], mine = p.owner === me(), war = atWar(S, me(), p.owner), capf = C && C.capital === p.id;
    const kind = capf ? "cap" : p.flags.includes("f") || p.castle >= 3 ? "fort" : p.flags.includes("c") || p.v >= 4 ? "city" : "house", sc = R * (capf ? 1.25 : kind === "city" ? 1.05 : 0.95);
    g += `<g class="pv${mine ? " mine" : ""}${war ? " war" : ""}" data-a="selProv" data-x='["${p.id}"]' data-pid="${p.id}"><circle cx="${x}" cy="${y - R * 0.6}" r="${R * 2.6}" fill="transparent"/>`;
    if (SEL.prov === p.id) g += `<circle class="selring" cx="${x}" cy="${y - R * 0.5}" r="${R * 2.7}" stroke-width="${2.2 * f}" stroke-dasharray="${4 * f} ${2.5 * f}"/>`;
    g += `<ellipse cx="${x}" cy="${y + R * 0.1}" rx="${sc * 1.7}" ry="${sc * 0.45}" fill="#2b1d12" opacity=".28"/>`;
    g += `<g class="mk" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${sc.toFixed(2)})" fill="${C.col}" stroke="${war ? "#e0321a" : mine ? "#fff6d8" : "#2b1d12"}" stroke-width="${war || mine ? 0.2 : 0.13}" stroke-linejoin="round">${M_ICON[kind]}</g>`;
    if ((p.b.chram || 0) >= 2) g += `<path d="M${x - R * 2.2} ${y} l${R * 0.2} -${R * 1.3} l${R * 0.2} -${R * 0.3} l${R * 0.2} ${R * 0.3} l${R * 0.2} ${R * 1.3}z" fill="#efe1bd" stroke="#2b1d12" stroke-width="${0.45 * f}"><title>chrám (úroveň ${p.b.chram})</title></path>`;
    if (p.mons && MON_IDS.some(id => p.mons[id] && p.mons[id].stage >= MONUMENTS[id].stages)) g += `<path d="M${x + R * 1.5} ${y} l${R * 0.8} -${R * 1.3} l${R * 0.8} ${R * 1.3}z" fill="#e3bb55" stroke="#2b1d12" stroke-width="${0.45 * f}"><title>dokončená velká stavba</title></path>`;
    if (p.siege) g += `<circle class="siege" cx="${x}" cy="${y - R * 0.5}" r="${R * 2.2}" stroke-width="${1.7 * f}"/>`;
    if (p.hunger > 0.15 && (mine || knows(S, p))) g += `<g transform="translate(${x + R * 1.3} ${y - R * 2.2})"><circle r="${R * 0.75}" fill="#c4361c" stroke="#fff6d8" stroke-width="${0.5 * f}"/><text y="${R * 0.35}" font-size="${R * 1.1}" fill="#fff" font-weight="bold" text-anchor="middle">!</text><title>hlad</title></g>`;
    if (p.build && mine) g += `<g transform="translate(${x - R * 1.4} ${y - R * 2.3})"><title>staví se</title><path d="M0 0l${R * 0.9} ${R * 0.9}M${R * 0.1} -${R * 0.3}l${R * 0.5} ${R * 0.5}" stroke="#2b1d12" stroke-width="${0.7 * f}"/><rect x="-${R * 0.35}" y="-${R * 0.55}" width="${R * 0.8}" height="${R * 0.45}" fill="#8a8f96" stroke="#2b1d12" stroke-width="${0.3 * f}" transform="rotate(45)"/></g>`;
    const left = LEFT.has(p.id);
    if (k < 0.8 || capf || p.v >= 3 || !TERRAIN[p.ter].nile) g += `<text class="lbl${capf ? " cap" : ""}" x="${x + (left ? -1 : 1) * R * 2.0}" y="${y - R * 0.25}" font-size="${(capf ? 12.5 : 10.5) * f}" stroke-width="${3.2 * f}" text-anchor="${left ? "end" : "start"}">${esc(p.n)}</text>`;
    g += `</g>`;
  }
  for (const b of S.battles.filter(b => b.t >= S.turn - 1 && S.provs[b.place] && (b.a === me() || b.b === me() || knows(S, S.provs[b.place])))) { const p = S.provs[b.place], x = MX(p.lon) - R * 2.2, y = MY(p.lat) - R * 2.4; g += `<g class="bmark" transform="translate(${x} ${y})"><title>Bitva: ${esc(S.clans[b.a].n)} × ${esc(S.clans[b.b].n)}</title><circle r="${R * 1.25}" fill="#c4361c" stroke="#fff6d8" stroke-width="${0.6 * f}"/><path d="M-${R * 0.7} ${R * 0.7}L${R * 0.7} -${R * 0.7}M${R * 0.7} ${R * 0.7}L-${R * 0.7} -${R * 0.7}" stroke="#fff6d8" stroke-width="${0.9 * f}" stroke-linecap="round"/></g>`; }
  const slot = {};
  for (const a of S.armies) { const p = S.provs[a.loc], own = a.cl === me(); if (!own && !knows(S, p)) continue; const n = slot[a.loc] = (slot[a.loc] || 0) + 1, x = MX(p.lon) + R * (1.9 + (n - 1) * 2.4), y = MY(p.lat) + R * 0.4, s2 = R * (1.0 + Math.min(0.9, men(a.t) / 6000)), col = S.clans[a.cl].col;
    g += `<g class="army${own ? " own" : ""}" data-a="selProv" data-x='["${p.id}"]' data-pid="${p.id}"><title>${esc(S.clans[a.cl].n)}: ${fmtN(men(a.t))} mužů${a.path && a.path.length ? " → " + esc(S.provs[a.path[a.path.length - 1]].n) : ""}</title><g class="bob"><path d="M${x} ${y + s2 * 0.5}V${y - s2 * 2.3}" stroke="#2b1d12" stroke-width="${0.8 * f}"/><path d="M${x} ${y - s2 * 2.3}h${s2 * 2.3}l-${s2 * 0.5} ${s2 * 0.6}l${s2 * 0.5} ${s2 * 0.6}h-${s2 * 2.3}z" fill="${col}" stroke="${own ? "#fff6d8" : "#2b1d12"}" stroke-width="${(own ? 0.9 : 0.6) * f}"/><text x="${x + s2 * 0.95}" y="${y - s2 * 1.4}" font-size="${s2 * 0.85}" fill="#fff" text-anchor="middle" font-weight="bold">${Math.round(men(a.t) / 100) / 10}k</text><circle cx="${x}" cy="${y + s2 * 0.5}" r="${s2 * 0.3}" fill="#2b1d12"/></g></g>`; }
  // růžice a kartuše
  { const x = MX(26.0), y = MY(20.6), r = 17; g += `<g opacity=".8" pointer-events="none"><circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#74522a" stroke-width=".7"/><path d="M${x} ${y - r - 6}l4 ${r + 6}l-4 ${r + 6}l-4 -${r + 6}zM${x - r - 6} ${y}l${r + 6} -4l${r + 6} 4l-${r + 6} 4z" fill="#f6ecd0" stroke="#74522a" stroke-width=".6"/><path d="M${x} ${y - r - 6}l4 ${r + 6}h-4z" fill="#a8381e"/><text x="${x}" y="${y - r - 9}" text-anchor="middle" font-size="9" fill="#74522a" font-weight="bold">S</text></g>`;
    const cx = MX(26.9), cy = MY(22.9); g += `<g pointer-events="none" opacity=".9"><rect x="${cx - 62}" y="${cy - 22}" width="124" height="44" rx="22" fill="#f6ecd0" stroke="#74522a" stroke-width="1.6"/><path d="M${cx + 62} ${cy - 18}v36" stroke="#74522a" stroke-width="2.4"/><text x="${cx - 4}" y="${cy - 2}" text-anchor="middle" font-size="17" style="font-family:Hieroglyfy,serif" fill="#2b1d12">${HG.kemet}</text><text x="${cx - 4}" y="${cy + 14}" text-anchor="middle" font-size="9" fill="#74522a" font-style="italic">Kemet ≈ ${S.bce} př. n. l.</text></g>`; }
  g += `<path d="M-900 -900H${MW + 900}V${MH + 900}H-900Z M-26 -26V${MH + 26}H${MW + 26}V-26Z" fill="#1a120a" fill-rule="evenodd" pointer-events="none"/><rect x="-26" y="-26" width="${MW + 52}" height="${MH + 52}" fill="none" stroke="#c9952b" stroke-width="3" pointer-events="none"/><rect x="-18" y="-18" width="${MW + 36}" height="${MH + 36}" fill="none" stroke="#74522a" stroke-width="1" stroke-dasharray="10 4" pointer-events="none"/>`;
  return `<svg class="map art" id="mapsvg" viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mapa Egypta">${g}</svg>`;
}
_mapSvg0 = mapSvgArt;
function fitRealm() {
  const ps = clanProvs(S, me()); if (!ps.length) { setZoom("cele"); return; }
  const xs = ps.map(p => MX(p.lon)), ys = ps.map(p => MY(p.lat)), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const st_ = typeof document !== "undefined" && document.getElementById("stage"), asp = st_ && st_.clientHeight ? st_.clientWidth / st_.clientHeight : 1.6;
  const h = Math.max((y1 - y0) + 150, ((x1 - x0) + 260) / asp, 250), w = clamp(h * MW / MH, MW * 0.3, MW * 1.6);
  SEL.vb = [(x0 + x1) / 2 - w / 2, (y0 + y1) / 2 - (w * MH / MW) / 2, w, w * MH / MW]; SEL.zoom = "rise"; MAPC.k = null;
}
const NEWS_COL = { valka: "#b5452c", nil: "#3d7fb0", rod: "#7a4b8c", stavby: "#8a6a2a", hospodarstvi: "#c9a227", diplomacie: "#2f6d8f", intriky: "#5d6b7a", udalosti: "#4f8a5b", rozkazy: "#8a8a6a", vedeni: "#4fa0a0", vypravy: "#a0522d" };
function newsHtml() {
  const L = S.log.filter(l => l.t >= S.turn - 1 && (!l.cl || l.cl.includes(me())) && l.cat !== "rozkazy").slice(0, 4);
  return `<section class="ov ov-news">${L.length ? `<div class="nw-h">Zprávy měsíce</div>${L.map(l => `<div class="nw"><i style="background:${NEWS_COL[l.cat] || "#8a7a5a"}"></i><span>${esc(l.txt.length > 150 ? l.txt.slice(0, 147) + "…" : l.txt)}</span></div>`).join("")}` : ""}<div class="nw-q">${quoteBar()}</div></section>`;
}
function tMapaArt() {
  if (!SEL.vb) fitRealm();
  const p = SEL.prov && S.provs[SEL.prov], mode = SEL.mapMode || "polit", C = P(S), pol = POLICIES[C.policy || "rovnovaha"];
  return `<div class="stage" id="stage">${mapSvg()}
    ${p ? `<section class="ov ov-left">${btn("✕", "closeProv", [], null, "close")}${provPanel(p)}</section>` : ""}
    <section class="ov ov-right"><div class="ol-title">Přehled dění</div>${tutorialHtml()}<div class="ol-h">Královský výnos</div><div class="ol-i" data-a="tab" data-x='["plan"]'>${ricon(pol.ic, 14)} ${esc(pol.n)}</div>${outliner()}</section>
    ${alertIcons()}
    <section class="ov ov-bl">${rulerBox()}</section>
    <section class="ov ov-modes"><div class="mm">${Object.entries(MAP_MODES).map(([k, M]) => `<button class="b${mode === k ? " on" : ""}" data-a="mapMode" data-x='["${k}"]' title="${esc(M.d)}">${M.n}</button>`).join("")}</div>
      <div class="mm">${btn("Má říše", "fit", [], null, "go")}${Object.entries(ZOOMS).map(([k, Z]) => btn(Z.n, "zoom", [k])).join("")}</div><div class="small muted">${esc(MAP_MODES[mode].d)}</div></section>
    ${newsHtml()}
  </div>`;
}
TAB_FN.mapa = tMapaArt;
ACT.fit = () => { fitRealm(); };

// ================= RADA =================
function tPlanArt() {
  const C = P(S), cur = C.policy || "rovnovaha", idle = freeOffs().length, auto = S.opts.autoPlan !== false;
  if (C.type === "kmen") return tPlan();
  const tiles = Object.entries(POLICIES).map(([k, x]) => `<button class="poltile${k === cur ? " on" : ""}" data-a="policy" data-x='["${k}"]'><span class="pti">${ricon(x.ic, 34)}</span><b>${esc(x.n)}</b><span class="small">${esc(x.d)}</span></button>`).join("");
  return `<div class="grid">${card(`${ricon("urednici", 20)} Královská rada`, `<p>Zvol <b>královský výnos</b> – směr, kterým se má země ubírat. Rádce podle něj na konci měsíce rozdá rozkazy všem úředníkům, kteří žádný nedostali. Hlad, vzpoura a obrana hranic mají vždy přednost.</p>
    <div class="poltiles">${tiles}</div>
    <div class="row" style="margin-top:10px"><label><input type="checkbox" data-a="autoPlan" ${auto ? "checked" : ""}> rádce na konci měsíce zaměstná všechny volné úředníky</label> <span class="muted small">${idle ? nPlural(idle, "úředník", "úředníci", "úředníků") + " zatím bez rozkazu" + (auto ? " – postará se o ně rádce" : "") : "všichni mají rozkaz"}</span></div>`, "wide")}</div>
  <details class="plandet" ${SEL.planOpen ? "open" : ""}><summary data-a="planOpen">Rozkazy jednotlivým úředníkům${idle ? ` (${idle})` : ""} – chceš-li rozhodnout sám</summary>${SEL.planOpen ? tPlan() : ""}</details>`;
}
TAB_FN.plan = tPlanArt;
ACT.policy = k => setPolicy(S, k);
ACT.autoPlan = () => { S.opts.autoPlan = S.opts.autoPlan === false; };
ACT.planOpen = () => { SEL.planOpen = !SEL.planOpen; };

// ================= ZÁLOŽKY VE SKUPINÁCH =================
const TAB_GROUPS = [["Mapa", "mapa", ["mapa"]], ["Rada", "plan", ["plan", "prehled", "urednici", "rod"]], ["Říše", "zupy", ["zupy", "hosp", "chramy"]], ["Stát", "zakony", ["zakony", "vedeni"]], ["Válka a poslové", "vojsko", ["vojsko", "diplo"]], ["Kronika", "kronika", ["kronika"]], ["Hra", "hra", ["hra"]]];
const TAB_NAME = Object.fromEntries(TABS);
renderTabs = function () {
  const idle = S.opts.autoPlan === false ? freeOffs().length : 0, cur = TAB_GROUPS.find(g => g[2].includes(SEL.tab)) || TAB_GROUPS[0];
  const main = TAB_GROUPS.map(([n, first, leaves]) => `<button class="${cur[1] === first ? "on" : ""}"${SEL.tab === first ? ' aria-current="page"' : ""} data-a="tab" data-x='["${first}"]'>${icon(first)}${n}${first === "plan" && idle ? ` <span class="badge">${idle}</span>` : ""}</button>`).join("");
  const sub = cur[2].length > 1 ? `<div class="subtabs">${cur[2].map(k => k === cur[1] ? `<span class="st${SEL.tab === k ? " on" : ""}" data-a="tab" data-x='["${k}"]' data-sub="1">${TAB_NAME[k]}</span>` : `<button class="st${SEL.tab === k ? " on" : ""}"${SEL.tab === k ? ' aria-current="page"' : ""} data-a="tab" data-x='["${k}"]'>${TAB_NAME[k]}</button>`).join("")}</div>` : "";
  return `<div class="maintabs">${main}</div>${sub}`;
};

// ================= HORNÍ LIŠTA: CÍL HRY =================
function goalPill() {
  const C = P(S), core = coreProvs(S).length;
  if (C.type === "kmen") return `<span class="res goalp" title="Kmen vítězí slávou 450 nebo čtyřmi kraji"><b>Sláva ${fmt(C.prestige)}/450</b><i><u style="width:${clamp(C.prestige / 450 * 100, 0, 100)}%"></u></i></span>`;
  const need = C.cul === "nub" ? Math.ceil(core * 0.5) : Math.ceil(core * 0.9), mine = realmCore(S, me());
  return `<span class="res goalp" title="Cíl: ${C.cul === "nub" ? "ovládnout Núbii a polovinu Egypta" : "sjednotit Obě země – 9/10 nomů egyptského jádra"}"><span class="hg">${HG.sema}</span><b>${mine}/${need}</b><i><u style="width:${clamp(mine / need * 100, 0, 100)}%"></u></i></span>`;
}
var _renderTop0 = renderTop;
renderTop = function () { return _renderTop0().replace('<span class="sp"></span>', goalPill() + '<span class="sp"></span>'); };

// ================= ÚVODNÍ OBRAZOVKA =================
const SCEN_ART = { anch: "hlad", fip: "bitva", mt2: "triumf", hyk: "obchod", sip: "lov", ahm: "bitva" };
const playable = Sc => Sc.clans.filter(c => c.type !== "kmen" || c.id === "medzaj" || c.id === "lib");
const diffOf = c => (c.type === "kmen" ? ["těžká", 3] : c.provs.length >= 12 ? ["snadná", 1] : c.provs.length >= 4 ? ["střední", 2] : ["těžká", 3]);
function heroSvg() {
  return `<svg class="hero" viewBox="0 0 1200 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="hsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16305c"/><stop offset=".55" stop-color="#b5652a"/><stop offset="1" stop-color="#f0c56a"/></linearGradient></defs>
    <rect width="1200" height="300" fill="url(#hsky)"/><circle cx="600" cy="196" r="62" fill="#f6d27a"/><circle cx="600" cy="196" r="90" fill="#f6d27a" opacity=".18"/>
    ${[[110, 40], [210, 70], [330, 30], [870, 50], [990, 28], [1090, 66], [470, 22], [740, 34]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#fff6d8" opacity=".8"/>`).join("")}
    <path d="M0 236l150 -150l150 150z" fill="#8a5a2a"/><path d="M150 86l150 150h-70z" fill="#5c3a16"/><path d="M230 236l110 -110l110 110z" fill="#9a6a34"/><path d="M340 126l110 110h-50z" fill="#6a441c"/>
    <path d="M820 236l90 -92l90 92z" fill="#9a6a34"/><path d="M910 144l90 92h-42z" fill="#6a441c"/><path d="M940 236l130 -132l130 132z" fill="#8a5a2a"/><path d="M1070 104l130 132h-60z" fill="#5c3a16"/>
    <rect y="232" width="1200" height="68" fill="#2a2018"/><path d="M0 252q150 -14 300 0t300 0t300 0t300 0v48H0z" fill="#234f80"/><path d="M0 262q75 -8 150 0t150 0t150 0t150 0t150 0t150 0t150 0t150 0" stroke="#7fb0de" stroke-width="2" fill="none" opacity=".6"/>
    <path d="M860 262q50 18 108 0l-10 9q-44 13 -88 0z" fill="#c9a227" stroke="#2a2018"/><path d="M914 264v-44" stroke="#2a2018" stroke-width="2.5"/><path d="M896 224h36l4 26h-44z" fill="#f6ecd0" stroke="#2a2018"/>
    ${[40, 70, 100, 1100, 1130, 1165].map(x => `<path d="M${x} 262v-34" stroke="#2f6a34" stroke-width="3"/><path d="M${x - 11} ${216}q11 14 22 0q-11 6 -22 0z" fill="#3f8a44"/>`).join("")}</svg>`;
}
function startHtml() {
  const ids = Object.keys(SCENARIOS).sort((a, b) => SCENARIOS[b].bce - SCENARIOS[a].bce);
  if (!SCENARIOS[SEL.ngScen]) SEL.ngScen = "sip";
  const Sc = SCENARIOS[SEL.ngScen], cl = playable(Sc); if (!cl.some(c => c.id === SEL.ngClan)) SEL.ngClan = cl[0].id;
  const c = cl.find(x => x.id === SEL.ngClan), lead = Sc.hist.find(h => h.cl === c.id && h.r === "leader"), G = (GOALS[SEL.ngScen] || {})[c.id], [dn, dv] = diffOf(c);
  let hasSave = false; try { hasSave = !!localStorage.getItem(SAVE_KEY); } catch (e) {}
  const cards = ids.map(id => { const X = SCENARIOS[id], [yr, nm] = X.n.split(" – "); return `<button class="scard${id === SEL.ngScen ? " on" : ""}" data-a="startScen" data-x='["${id}"]'>${vign(SCEN_ART[id] || "dvur")}<span class="syr">${esc(yr)}</span><b>${esc(nm || X.n)}</b><span class="small">${nPlural(playable(X).length, "hratelný rod", "hratelné rody", "hratelných rodů")}</span></button>`; }).join("");
  const clans = cl.map(x => { const [n2, v2] = diffOf(x); return `<button class="cchip${x.id === c.id ? " on" : ""}" data-a="startClan" data-x='["${x.id}"]' style="--c:${x.col}"><i></i><span><b>${esc(x.n)}</b><small>${esc(x.house)} · ${nPlural(x.provs.length, "nom", "nomy", "nomů")} · ${"●".repeat(v2)}${"○".repeat(3 - v2)} ${n2}</small></span></button>`; }).join("");
  return `<div class="start">${heroSvg()}<div class="stitle"><div class="hg">${HG.kemet}</div><h1>Pán Obou zemí</h1><p>Strategie ze starověkého Egypta podle pramenů a archeologie</p></div>
    <div class="sbody"><div><h2>Vyber dobu</h2><div class="scards">${cards}</div></div>
    <div class="spanel"><h2>${esc(Sc.n)}</h2><p class="small">${esc(Sc.d)}</p><h3>Za koho budeš hrát</h3><div class="cchips">${clans}</div>
      <div class="sinfo" style="--c:${c.col}"><b>${esc(c.n)}</b> · ${esc(c.t)} ${lead ? esc(lead.n) : "(jméno vládce prameny neuvádějí)"}<div class="small">${lead && lead.note ? esc(lead.note) + ". " : ""}Cíl: ${esc(G ? G.t : c.type === "kmen" ? "proslavit kmen nájezdy a službou" : c.cul === "nub" ? "ovládnout Núbii a jih Egypta" : "sjednotit Obě země")}. Obtížnost: ${dn}.</div></div>
      <div class="row">${sel("ngDiff", [[0, "Mírní soupeři"], [1, "Obvyklá obtížnost"], [2, "Tvrdí soupeři"]], SEL.ngDiff != null ? SEL.ngDiff : 1, 'data-a="ngDiff"')} <label class="small"><input type="checkbox" data-a="ngFog" ${SEL.ngFog !== false ? "checked" : ""}> mlha (o vzdálených nomech jen odhady)</label></div>
      <div class="row sgo"><button class="main" data-a="startGo" data-x="[]">Začít vládnout</button>${hasSave ? btn("Pokračovat v rozehrané hře", "startClose") : ""}</div></div></div></div>`;
}
ACT.startOpen = () => { SEL.start = true; SEL.ngScen = S.scen; SEL.ngClan = S.player; };
ACT.startScen = id => { SEL.ngScen = id; SEL.ngClan = null; };
ACT.startClan = id => { SEL.ngClan = id; };
ACT.startClose = () => { SEL.start = false; };
ACT.startGo = () => { S = newGame({ scen: SEL.ngScen, clan: SEL.ngClan, diff: SEL.ngDiff, fog: SEL.ngFog !== false }); TERR.key = null; TERR2.key = null; GEO2 = null; SEL.start = false; SEL.tab = "mapa"; SEL.prov = null; SEL.cmd = {}; SEL.vb = null; BAN.turn = S.turn; toast(`${P(S).n}: vláda začíná.`); };
try { if (!localStorage.getItem(SAVE_KEY)) SEL.start = true; } catch (e) { SEL.start = true; }

// ================= OZNÁMENÍ OBDOBÍ A VYKRESLENÍ =================
var BAN = { turn: -1, t: null };
const SEASON_ART = ["nil", "seti", "zne"], SEASON_TX = ["Nil stoupá a zaplavuje pole. Čas roboty na kanálech a stavbách.", "Voda opadla. Oře se a seje do černého bahna.", "Sklizeň. Písaři měří pole a vybírají daň v obilí."];
function seasonBanner() {
  if (typeof document === "undefined") return;
  if (BAN.turn === -1 || S.turn <= BAN.turn || S.month % 4 !== 0 || SEL.start) { BAN.turn = S.turn; return; }
  BAN.turn = S.turn; const si = S.month / 4; let el = document.getElementById("banner"); if (!el) { el = document.createElement("div"); el.id = "banner"; document.body.appendChild(el); }
  el.innerHTML = `${vign(SEASON_ART[si])}<div class="bt"><b>${si === 0 ? `Nový rok ≈ ${S.bce} př. n. l. · ` : ""}Období ${SEASONS[si]}</b><span>${SEASON_TX[si]}</span>${(q => q ? `<i class="bq">„${esc(q.t)}“ — ${esc(q.src)}</i>` : "")(typeof quoteTag === "function" ? quoteTag(S, [["zaplava"], ["stavby"], ["sypky"]][si]) : null)}</div>`;
  el.className = ""; void el.offsetWidth; el.className = "show"; clearTimeout(BAN.t); BAN.t = setTimeout(() => { el.className = ""; }, 3200);
}
var _render0 = render;
render = function () {
  document.body.classList.toggle("starting", !!SEL.start);
  if (SEL.start) { document.getElementById("top").innerHTML = ""; document.getElementById("tabs").innerHTML = ""; const m = document.getElementById("main"); m.className = "full"; m.innerHTML = startHtml(); const md = document.getElementById("modal"); md.classList.add("hidden"); md.innerHTML = ""; hideTip(); a11yPass(); return; }
  if (S.provs && Object.keys(S.provs).length !== (GEO2 ? GEO2.ids.length : -1)) GEO2 = null;
  _render0(); seasonBanner();
};
// po načtení jiné hry se území přepočítá
for (const k of ["load", "pasteSave", "newgame"]) { const f0 = ACT[k]; ACT[k] = (...a) => { const r = f0(...a); GEO2 = null; TERR2.key = null; SEL.vb = null; BAN.turn = -1; return r; }; }

// ================= VÍTĚZSTVÍ A PORÁŽKA =================
var _vignKind0 = vignKind;
vignKind = function (ev, v) { if (ev.k === "vitezstvi") return ev.data && ev.data.win ? "triumf" : "hrob"; return _vignKind0(ev, v); };

