// ---------- Produkce (jako Osadníci) ----------
function productionRoll(p, t, sum) {
  const b = tableBoard(p); if (!b) return [];
  const gains = [];
  Object.entries(b.numbers || {}).forEach(([k, n]) => {
    if (+n !== sum) return; const ter = terrainOf(p, b, k); const r = ter && p.resources.find(x => x.id === ter.produces); if (!r) return;
    const owners = [];
    if (p.production.mode !== "units" && t.control[k]) owners.push(t.control[k]);
    if (p.production.mode !== "control") t.items.forEach(i => { if (i.kind !== "unit") return; const u = p.units.find(x => x.id === i.unitId); const uk = cellUnder(p, i); if (!u || !uk) return; const [c, r2] = k.split(",").map(Number); if (uk === k || neighbors(b, c, r2).some(([x, y]) => x + "," + y === uk)) owners.push(u.factionId); });
    owners.forEach(fid => { t.res[fid] = t.res[fid] || {}; t.res[fid][r.id] = Math.min(resMax(r), (t.res[fid][r.id] || 0) + 1); gains.push({ fid, r: r.name, k }); });
  });
  return gains;
}
function randomizeBoard(p, b, counts, numbers) {
  const cells = []; for (let c = 0; c < b.cols; c++) for (let r = 0; r < b.rows; r++) cells.push(c + "," + r);
  const bag = []; Object.entries(counts).forEach(([id, n]) => { for (let i = 0; i < n; i++) bag.push(id); }); shuffle(bag);
  b.terrain = {}; shuffle(cells).forEach((k, i) => { if (bag[i] && bag[i] !== (p.terrains[0] || {}).id) b.terrain[k] = bag[i]; });
  b.numbers = {}; const pool = shuffle(String(numbers || "").split(/[,;\s]+/).map(Number).filter(n => n >= 2)); let j = 0;
  if (pool.length) cells.forEach(k => { const ter = terrainOf(p, b, k) || p.terrains[0]; if (ter && ter.produces) { b.numbers[k] = pool[j % pool.length]; j++; } });
}
