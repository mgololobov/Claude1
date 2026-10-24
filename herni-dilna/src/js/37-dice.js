// ---------- Kostky: libovolný počet stěn, procentová kostka, smíšený hod, zápis 2k6+k8+3 ----------
const DIE_SIDES = [2, 3, 4, 6, 8, 10, 12, 20, 100];
const dieLabel = s => +s === 100 ? "k%" : "k" + s;
// Zápis hodu: „2k6+k8+3“, „3d10-1“, „k%“, „4kF“ není podporováno. Vrací kostky a opravu, nebo null.
function parseDice(txt) {
  const s = String(txt || "").replace(/\s+/g, "").toLowerCase().replace(/%/g, "100"); if (!s) return null;
  const parts = s.match(/[+-]?[^+-]+/g); if (!parts) return null; const dice = []; let mod = 0;
  for (const part of parts) { const sign = part[0] === "-" ? -1 : 1; const x = part.replace(/^[+-]/, ""); let m;
    if ((m = x.match(/^(\d*)[kd](\d+)$/))) { const n = +(m[1] || 1), sides = +m[2]; if (sign < 0 || n < 1 || n > 50 || sides < 2 || sides > 1000) return null; for (let i = 0; i < n; i++) dice.push(sides); }
    else if (/^\d+$/.test(x)) mod += sign * +x; else return null; }
  return dice.length ? { dice, mod } : null;
}
// Popis smíšeného hodu: „2k6 + k8 + 3 = 14“.
function poolSummary(pool, mod) {
  const std = pool.filter(d => d.type === "std"); if (!std.length) return "";
  const g = {}; std.forEach(d => g[d.s] = (g[d.s] || 0) + 1);
  const expr = Object.entries(g).sort((a, b) => a[0] - b[0]).map(([s, n]) => `${n > 1 ? n : ""}${dieLabel(s)}`).join(" + ") + (mod ? (mod > 0 ? " + " : " − ") + Math.abs(mod) : "");
  return { expr, sum: std.reduce((a, d) => a + d.v, 0) + (mod || 0) };
}
function diceDistribution(dice) { let dist = [1]; dice.forEach(s => { const nd = new Array(dist.length + s).fill(0); dist.forEach((p, i) => { if (p) for (let f = 1; f <= s; f++) nd[i + f] += p / s; }); dist = nd; }); return dist; }
