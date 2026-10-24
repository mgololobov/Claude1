// ---------- geometrie mapy ----------
const GEO = new Map();
function geo(b) { const key = `${b.type}|${b.size}|${b.cols}|${b.rows}`; let g = GEO.get(key); if (!g) { g = geoRaw({ type: b.type, size: b.size, cols: b.cols, rows: b.rows }); GEO.set(key, g); } return g; }
function geoRaw(b) {
  const s = +b.size || 34;
  if (b.type === "square") {
    const cell = s * 1.8;
    return { W: cell * b.cols + PAD * 2, H: cell * b.rows + PAD * 2,
      center: (c, r) => [PAD + cell * c + cell / 2, PAD + cell * r + cell / 2],
      poly: (cx, cy) => { const h = cell / 2; return `${cx - h},${cy - h} ${cx + h},${cy - h} ${cx + h},${cy + h} ${cx - h},${cy + h}`; },
      pick: (x, y) => { const c = Math.floor((x - PAD) / cell), r = Math.floor((y - PAD) / cell); return (c >= 0 && r >= 0 && c < b.cols && r < b.rows) ? [c, r] : null; } };
  }
  const h = Math.sqrt(3) * s;
  const center = (c, r) => [PAD + s + c * 1.5 * s, PAD + h / 2 + r * h + (c % 2 ? h / 2 : 0)];
  return { W: PAD * 2 + s * 2 + (b.cols - 1) * 1.5 * s, H: PAD * 2 + h * b.rows + h / 2, center,
    poly: (cx, cy) => { const pts = []; for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i; pts.push((cx + (s - .5) * Math.cos(a)).toFixed(1) + "," + (cy + (s - .5) * Math.sin(a)).toFixed(1)); } return pts.join(" "); },
    pick: (x, y) => {
      const c0 = Math.round((x - PAD - s) / (1.5 * s)); let best = null, bd = 1e9;
      for (let c = c0 - 1; c <= c0 + 1; c++) { if (c < 0 || c >= b.cols) continue;
        const r0 = Math.round((y - PAD - h / 2 - (c % 2 ? h / 2 : 0)) / h);
        for (let r = r0 - 1; r <= r0 + 1; r++) { if (r < 0 || r >= b.rows) continue; const [cx, cy] = center(c, r); const d = Math.hypot(cx - x, cy - y); if (d < bd) { bd = d; best = [c, r]; } } }
      return bd <= s ? best : null; } };
}
function terrainOf(p, b, k) { const id = b.terrain[k]; return p.terrains.find(t => t.id === id) || null; }
function boardSVG(p, b, control, opts = {}) {
  const g = geo(b); const parts = [];
  parts.push(`<svg class="board-svg" ${opts.id ? `id="${opts.id}"` : ""} width="${g.W.toFixed(0)}" height="${g.H.toFixed(0)}" viewBox="0 0 ${g.W.toFixed(1)} ${g.H.toFixed(1)}" xmlns="http://www.w3.org/2000/svg">`);
  parts.push(`<rect x="0" y="0" width="${g.W}" height="${g.H}" rx="6" fill="#efe9da"/>`);
  if (b.bg && (b.bg.url || b.bg.data)) parts.push(`<image href="${esc(b.bg.url || b.bg.data)}" x="${PAD}" y="${PAD}" width="${g.W - PAD * 2}" height="${g.H - PAD * 2}" preserveAspectRatio="none" opacity="${b.bg.opacity ?? 1}"/>`);
  const base = p.terrains[0];
  const fid = id => p.factions.find(f => f.id === id);
  for (let c = 0; c < b.cols; c++) for (let r = 0; r < b.rows; r++) {
    const k = c + "," + r; const [cx, cy] = g.center(c, r); const pts = g.poly(cx, cy); const t = terrainOf(p, b, k);
    const fill = t ? t.color : (b.bg ? "transparent" : (base ? base.color : "#c9d6a3"));
    parts.push(`<polygon class="cell" data-k="${k}" points="${pts}" fill="${fill}" ${t && b.bg ? `fill-opacity="${b.bg.terrainOpacity ?? .55}"` : ""}/>`);
    if (control && control[k] && fid(control[k])) parts.push(`<polygon class="ctrl" points="${pts}" fill="${fid(control[k]).color}" fill-opacity=".42" stroke="${fid(control[k]).color}" stroke-width="2.5"/>`);
    if (t && t.glyph) parts.push(`<text class="glyph" x="${cx}" y="${cy + 5}" text-anchor="middle">${esc(t.glyph)}</text>`);
    if (b.coords !== false) parts.push(`<text class="coord" x="${cx}" y="${cy - (b.type === "square" ? b.size * .6 : b.size * .58)}" text-anchor="middle">${pad2(c + 1)}${pad2(r + 1)}</text>`);
    if (b.numbers && b.numbers[k]) parts.push(`<circle cx="${cx}" cy="${cy}" r="${(b.size || 34) * .32}" fill="#f6eedb" stroke="rgba(0,0,0,.35)"/><text class="num ${b.numbers[k] === 6 || b.numbers[k] === 8 ? "hot" : ""}" x="${cx}" y="${cy + (b.size || 34) * .12}" text-anchor="middle">${b.numbers[k]}</text>`);
    if (b.labels[k]) parts.push(`<text class="lab" x="${cx}" y="${cy + (b.type === "square" ? b.size * .75 : b.size * .72)}" text-anchor="middle">${esc(b.labels[k])}</text>`);
  }
  if (opts.tiles) Object.entries(opts.tiles).forEach(([k, o]) => { const tl = p.tiles.find(x => x.id === o.id); if (!tl) return; const [c, r] = k.split(",").map(Number); if (c >= b.cols || r >= b.rows) return; const [cx, cy] = g.center(c, r); parts.push(tileSVG(p, b, tl, o.rot, cx, cy, g)); });
  if (b.regions && Object.keys(b.regions).length && opts.regions !== false) {
    const cen = {};
    const n6 = b.type === "square" ? 4 : 6; const s0 = +b.size || 34;
    Object.entries(b.regions).forEach(([k, n]) => { const [c, r] = k.split(",").map(Number); if (c >= b.cols || r >= b.rows) return; const [cx, cy] = g.center(c, r); const col = regionColor(b, n);
      for (let i = 0; i < n6; i++) { const [x, y] = dirNeighbor(b, c, r, i); if (b.regions[x + "," + y] === n) continue;
        const mid = n6 === 4 ? [-90, 0, 90, 180][i] : [-90, -30, 30, 90, 150, 210][i]; const half = n6 === 4 ? 45 : 30; const rad = n6 === 4 ? s0 * .9 * Math.SQRT2 : s0;
        const p1 = [(mid - half) * Math.PI / 180, (mid + half) * Math.PI / 180].map(a2 => [(cx + Math.cos(a2) * rad * .93).toFixed(1), (cy + Math.sin(a2) * rad * .93).toFixed(1)]);
        parts.push(`<line class="reg" x1="${p1[0][0]}" y1="${p1[0][1]}" x2="${p1[1][0]}" y2="${p1[1][1]}" stroke="${col}"/>`); }
      (cen[n] = cen[n] || []).push([cx, cy]); });
    Object.entries(cen).forEach(([n, a]) => { const x = a.reduce((s2, v) => s2 + v[0], 0) / a.length, y = a.reduce((s2, v) => s2 + v[1], 0) / a.length; parts.push(`<text class="regl" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" fill="${regionColor(b, n)}">${esc(n)}</text>`); });
  }
  if (opts.links) opts.links.forEach(l => { const f = p.factions.find(x => x.id === l.fid); const [a1, a2] = l.a.split(",").map(Number), [b1, b2] = l.b.split(",").map(Number); if (a1 >= b.cols || b1 >= b.cols || a2 >= b.rows || b2 >= b.rows) return;
    const [x1, y1] = g.center(a1, a2), [x2, y2] = g.center(b1, b2); parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#fff" stroke-width="9" stroke-linecap="round"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${f ? f.color : "#333"}" stroke-width="5" stroke-linecap="round"/>`); });
  if (opts.routeSel) { const [c, r] = opts.routeSel.split(",").map(Number); const [cx, cy] = g.center(c, r); parts.push(`<circle cx="${cx}" cy="${cy}" r="${(+b.size || 34) * .45}" fill="none" stroke="#e0aa2e" stroke-width="4"/>`); }
  if (opts.los) Object.keys(opts.los).forEach(k => { const [c, r] = k.split(",").map(Number); const [cx, cy] = g.center(c, r); parts.push(`<polygon class="rng" points="${g.poly(cx, cy)}" fill="#3f8fd0" fill-opacity=".32" stroke="#2a6aa0" stroke-width="1.5"/>`); });
  if (opts.range) Object.entries(opts.range).forEach(([k, v]) => { const [c, r] = k.split(",").map(Number); const [cx, cy] = g.center(c, r);
    parts.push(`<polygon class="rng" points="${g.poly(cx, cy)}" fill="#e0aa2e" fill-opacity=".45" stroke="#b07d10" stroke-width="2"/><text class="rngt" x="${cx}" y="${cy + 4}" text-anchor="middle">${Math.round(v * 10) / 10}</text>`); });
  parts.push(`</svg>`);
  return parts.join("");
}
