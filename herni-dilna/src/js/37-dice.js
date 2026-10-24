// ---------- Kostky: libovolný počet stěn, procentová kostka, smíšený hod, zápis 2k6+k8+3 ----------
const DIE_SIDES = [2, 3, 4, 6, 8, 10, 12, 20, 100];
const dieLabel = s => +s === 100 ? "k%" : "k" + s;
// Zápis hodu: „2k6+k8+3“, „3d10-1“, „k%“ i vlastní kostky názvem: „2k6 + 2× Kostka osudu“.
// Vrací { dice: [stěny], custom: [id vlastních kostek], mod } nebo null, když zápisu nerozumí.
function parseDice(txt, cdice = []) {
  const s = String(txt || "").replace(/%/g, "100").trim(); if (!s) return null;
  const parts = s.match(/[+-]?[^+-]+/g); if (!parts) return null; const dice = [], custom = []; let mod = 0;
  for (const part of parts) { const sign = part.trim()[0] === "-" ? -1 : 1; const x = part.replace(/^\s*[+-]/, "").trim(); let m;
    if ((m = x.replace(/\s+/g, "").toLowerCase().match(/^(\d*)[kd](\d+)$/))) { const n = +(m[1] || 1), sides = +m[2]; if (sign < 0 || n < 1 || n > 50 || sides < 2 || sides > 1000) return null; for (let i = 0; i < n; i++) dice.push(sides); }
    else if (/^\d+$/.test(x)) mod += sign * +x;
    else if ((m = x.match(/^(?:(\d+)\s*[x×*]?\s*)?(.+)$/))) { const name = m[2].trim().toLowerCase(); const cd = cdice.find(d => d.name.trim().toLowerCase() === name); const n = +(m[1] || 1);
      if (!cd || sign < 0 || n < 1 || n > 50) return null; for (let i = 0; i < n; i++) custom.push(cd.id); }
    else return null; }
  return dice.length || custom.length ? { dice, custom, mod } : null;
}
// Číselná stěna vlastní kostky („3“, „-1“, „+2“) se počítá do součtu, symboly se jen sčítají po kusech.
const faceNum = f => /^[+-]?\d+$/.test(String(f || "").trim()) ? parseInt(f, 10) : null;
// Popis smíšeného hodu: „2k6 + k8 + 2× Kostka osudu + 3 = 14“.
function poolSummary(pool, mod, cdice = []) {
  const std = pool.filter(d => d.type === "std"); const cust = pool.filter(d => d.type === "c").map(d => ({ d, cd: cdice.find(x => x.id === d.id) })).filter(x => x.cd);
  const g = {}; std.forEach(d => g[d.s] = (g[d.s] || 0) + 1); const gc = {}; cust.forEach(x => gc[x.cd.name] = (gc[x.cd.name] || 0) + 1);
  const numC = cust.map(x => faceNum(x.cd.faces[x.d.v])).filter(v => v != null);
  const terms = [...Object.entries(g).sort((a, b) => a[0] - b[0]).map(([s, n]) => `${n > 1 ? n : ""}${dieLabel(s)}`), ...Object.entries(gc).map(([nm, n]) => `${n > 1 ? n + "× " : ""}${nm}`)];
  if (!terms.length) return "";
  const expr = terms.join(" + ") + (mod ? (mod > 0 ? " + " : " − ") + Math.abs(mod) : "");
  return { expr, nums: std.length + numC.length, sum: std.reduce((a, d) => a + d.v, 0) + numC.reduce((a, v) => a + v, 0) + (mod || 0) };
}
function diceDistribution(dice) { let dist = [1]; dice.forEach(s => { const nd = new Array(dist.length + s).fill(0); dist.forEach((p, i) => { if (p) for (let f = 1; f <= s; f++) nd[i + f] += p / s; }); dist = nd; }); return dist; }
