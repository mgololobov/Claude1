// ---------- Simulace: válka na mapě, dílky, hledání dopředu, průběh skóre, ladění variant ----------
// Válka: jednotky strany táhnou k nejbližšímu nepříteli nebo k bodovanému poli a útočí, když mají aspoň poměr 1:1.
function simWar(p, t, f) {
  const b = tableBoard(p); if (!b) return; const mine = t.items.filter(i => i.kind === "unit" && (unitOf(p, i) || {}).factionId === f.id);
  const goals = () => { const out = []; t.items.forEach(i => { const u = unitOf(p, i); if (i.kind === "unit" && u && u.factionId !== f.id) { const k = cellUnder(p, i); if (k) out.push(k); } });
    for (let c = 0; c < b.cols; c++) for (let r = 0; r < b.rows; r++) { const k = c + "," + r; const ter = terrainOf(p, b, k); if (ter && +ter.vp > 0 && t.control[k] !== f.id) out.push(k); } return out; };
  mine.forEach(it => { if (!t.items.includes(it)) return; const g = goals(); if (!g.length) return; const rng = computeRange(p, t, it) || {}; const k0 = cellUnder(p, it);
    const near = k => Math.min(...g.map(x => hexDist(b, k, x)));
    const stack = k => t.items.filter(o => o !== it && o.kind === "unit" && cellUnder(p, o) === k).length;
    const opts = Object.keys(rng).filter(k => !(+p.ruleset.stackLimit) || stack(k) < +p.ruleset.stackLimit);
    const best = opts.sort((a, c) => near(a) - near(c) || (rng[a] - rng[c]))[0];
    if (best && near(best) < near(k0)) { placeOn(p, t, it, best); const ter = terrainOf(p, b, best); if (ter && +ter.vp > 0) { t.control[best] = f.id; fireTriggers(p, t, "kontrola", f.id, b.labels[best] || ""); } after(p, t, "pohyb", f.id, ter ? ter.name : ""); }
  });
  // boj: každého sousedícího nepřítele napadnou všechny sousední vlastní jednotky
  const C0 = S.combat; S.combat = { att: 0, def: 0, shift: 0, log: [], attUids: [], defUid: null };
  t.items.filter(i => i.kind === "unit" && unitOf(p, i) && unitOf(p, i).factionId !== f.id).forEach(en => {
    if (!t.items.includes(en)) return; const ke = cellUnder(p, en); if (!ke) return;
    const att = t.items.filter(i => i.kind === "unit" && (unitOf(p, i) || {}).factionId === f.id && cellUnder(p, i) && hexDist(b, cellUnder(p, i), ke) === 1);
    if (!att.length) return; const a = att.reduce((s, i) => { const u = unitOf(p, i); const v = +(i.reduced ? u.rAtt : u.att) || 0; return s + (inSupply(p, t, i) ? v : Math.floor(v / 2)); }, 0);
    const ue = unitOf(p, en); const ter = terrainOf(p, b, ke) || p.terrains[0]; const d = (+(en.reduced ? ue.rDef : ue.def) || 1) * (ter ? +ter.def || 1 : 1);
    if (a < d) return; const col = Math.max(0, crtColumn(a, d, p.crt.cols)); const out = p.crt.rows[rnd(p.crt.rows.length) - 1][col];
    S.combat.attUids = att.map(i => i.uid); S.combat.defUid = en.uid; applyCombat(p, t, out); after(p, t, "boj", f.id, out);
  });
  S.combat = C0; S.supCache = {};
}
function simTile(p, t, f) {
  const b = tableBoard(p); if (!b || !t.tileStack.length) return; const id = t.tileStack.pop(); const tl = p.tiles.find(x => x.id === id); const n = b.type === "square" ? 4 : 6;
  let best = null;
  for (let c = 0; c < b.cols; c++) for (let r = 0; r < b.rows; r++) { const k = c + "," + r; if (t.tilesPlaced[k]) continue;
    for (let rot = 0; rot < n; rot++) { if (tileCheck(p, t, b, k, id, rot).length) continue; let nb = 0; for (let i = 0; i < n; i++) { const [x, y] = dirNeighbor(b, c, r, i); if (t.tilesPlaced[x + "," + y]) nb++; }
      const s = nb + Math.random() * .5; if (!best || s > best.s) best = { k, rot, s }; } }
  if (!best) return; t.tilesPlaced[best.k] = { id, rot: best.rot, fid: f.id }; after(p, t, "dilek", f.id, tl.name);
}
function simExtraMoves(p, t, f) {
  const out = []; const b = tableBoard(p); if (!b) return out;
  if (p.units.length && t.items.some(i => i.kind === "unit" && (unitOf(p, i) || {}).factionId === f.id)) out.push({ v: 1.5, war: true, run() { simWar(p, t, f); checkWin(p, t); } });
  if (p.tiles.length && t.tileStack && t.tileStack.length) out.push({ v: 1.2, run() { simTile(p, t, f); } });
  return out;
}
function simScore(p, t, fid) { const s = scoreOf(p, t, fid).total; return p.units.length && tableBoard(p) ? s + ((territoryScore(p, t).find(r => r.f.id === fid) || {}).vp || 0) : s; }
// Hledání dopředu: každý tah se zkusí, stav se ohodnotí a vrátí zpět.
function simPosition(p, t, fid) {
  if (t.winner) return t.winner.fid === fid ? 1000 : -1000;
  const own = simScore(p, t, fid); const opp = Math.max(0, ...p.factions.filter(f => f.id !== fid).map(f => simScore(p, t, f.id)));
  const res = p.resources.filter(r => !r.vp && !r.global).reduce((a, r) => a + ((t.res[fid] || {})[r.id] || 0) * .35, 0);
  const units = t.items.filter(i => i.kind === "unit" && (unitOf(p, i) || {}).factionId === fid).length - t.items.filter(i => i.kind === "unit" && unitOf(p, i) && unitOf(p, i).factionId !== fid).length;
  return own - opp * .5 + res + (t.hands[fid] || []).length * .3 + (t.trackPos[fid] || 0) * .3 + units * 1.5;
}
function lookaheadPick(p, t, f, gen) {
  const snap = JSON.stringify(t); const n = Math.min(12, gen().length); let best = -1, bv = -Infinity;
  const restore = () => { const o = JSON.parse(snap); Object.keys(t).forEach(k => delete t[k]); Object.assign(t, o); };
  for (let i = 0; i < n; i++) { const mv = gen()[i]; if (!mv) break; try { mv.run(); checkWin(p, t); } catch {} t.pending = []; const v = simPosition(p, t, f.id) + Math.random() * .2; restore(); if (v > bv) { bv = v; best = i; } }
  return best;
}
// Kolo, od kterého už vítěz nepustil vedení.
function decidedRound(g) {
  if (!g.hist || !g.hist.length) return null; const w = g.share.indexOf(Math.max(...g.share)); let r = g.hist.length;
  for (let i = g.hist.length - 1; i >= 0; i--) { const row = g.hist[i]; if (row[w] >= Math.max(...row) && row.filter(v => v === row[w]).length === 1) r = i + 1; else break; }
  return r;
}
function scoreChartSVG(R) {
  if (!R.curve || !R.curve.length) return ""; const W = 520, H = 180, L = 34, B = 22; const n = R.curve.length; const mx = Math.max(1, ...R.curve.flat());
  const cols = ["#3f6fb0", "#b0402c", "#2f7a45", "#c98a12", "#7a4fa0", "#333"];
  const x = i => L + (n > 1 ? i / (n - 1) : 0) * (W - L - 10), y = v => H - B - v / mx * (H - B - 10);
  const lines = R.curve[0].map((_, s) => `<polyline fill="none" stroke="${cols[s % cols.length]}" stroke-width="2.5" points="${R.curve.map((row, i) => `${x(i).toFixed(1)},${y(row[s]).toFixed(1)}`).join(" ")}"/>`).join("");
  const dec = R.decided ? `<line x1="${x(R.decided - 1)}" x2="${x(R.decided - 1)}" y1="8" y2="${H - B}" stroke="currentColor" stroke-dasharray="4 4" opacity=".5"/><text x="${x(R.decided - 1) + 4}" y="18" font-size="11" fill="currentColor">rozhodnuto ~${Math.round(R.decided)}. kolo</text>` : "";
  return `<h3>Průběh skóre (průměr po kolech)</h3><svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;height:auto" role="img" aria-label="Graf průběhu skóre">
    <line x1="${L}" y1="${H - B}" x2="${W - 10}" y2="${H - B}" stroke="currentColor" opacity=".3"/><text x="${L - 6}" y="${y(mx) + 4}" font-size="11" text-anchor="end" fill="currentColor">${Math.round(mx)}</text><text x="${L - 6}" y="${H - B + 4}" font-size="11" text-anchor="end" fill="currentColor">0</text>
    <text x="${L}" y="${H - 6}" font-size="11" fill="currentColor">1. kolo</text><text x="${W - 10}" y="${H - 6}" font-size="11" text-anchor="end" fill="currentColor">${n}. kolo</text>${lines}${dec}</svg>
    <div class="row">${R.seat.map((s, i) => `<span class="hint"><span class="dot" style="background:${cols[i % cols.length]}"></span> ${i + 1}. hráč</span>`).join("")}</div>`;
}
// Ladění: stejná simulace pro několik hodnot jednoho parametru.
function tuneParams(p) {
  const out = [["win.vp", "Cíl bodů k výhře"], ["win.turns", "Počet kol hry"], ["actionsPerTurn", "Akcí za tah"], ["drawUpTo", "Dobírat do"], ["handLimit", "Limit ruky"]];
  p.resources.filter(r => !r.global).forEach(r => { out.push([`res.${r.id}.start`, `${r.name} – na začátku`]); out.push([`res.${r.id}.income`, `${r.name} – příjem`]); });
  p.decks.forEach(d => d.cards.forEach(c => { if (c.cost !== "" && c.cost != null) out.push([`card.${d.id}.${c.id}.cost`, `Cena: ${c.title}`]); if (c.vp !== "" && c.vp != null) out.push([`card.${d.id}.${c.id}.vp`, `Body: ${c.title}`]); }));
  return out;
}
function getParam(p, key) { const k = key.split(".");
  if (k[0] === "win") return p.ruleset.win[k[1]]; if (k[0] === "res") return (p.resources.find(r => r.id === k[1]) || {})[k[2]];
  if (k[0] === "card") { const d = p.decks.find(x => x.id === k[1]); return ((d && d.cards.find(c => c.id === k[2])) || {})[k[3]]; } return p.ruleset[k[0]]; }
function setParam(p, key, v) { const k = key.split(".");
  if (k[0] === "win") p.ruleset.win[k[1]] = v; else if (k[0] === "res") { const r = p.resources.find(x => x.id === k[1]); if (r) r[k[2]] = v; }
  else if (k[0] === "card") { const d = p.decks.find(x => x.id === k[1]); const c = d && d.cards.find(x => x.id === k[2]); if (c) c[k[3]] = String(v); } else p.ruleset[k[0]] = v; }
const imbalance = r => { const fair = 1 / (r.nPl || 1); return Math.max(0, ...r.seat.map(s => Math.abs(s.wr - fair)), ...r.fac.map(f => Math.abs(f.wr - fair))); };
async function runTuning(p, opt, variants, progress) {
  const rows = [];
  for (let vi = 0; vi < variants.length; vi++) { const V = variants[vi]; const q = V.project(); const games = [];
    for (let i = 0; i < opt.games; i++) { games.push(simGame(q, opt)); if (i % 20 === 19) { progress(vi, i + 1); await new Promise(r => setTimeout(r, 0)); } }
    const r = summarizeSim(q, games); rows.push({ label: V.label, value: V.value, r, imb: imbalance(r) }); }
  const ok = rows.filter(x => x.r.reasons && !Object.keys(x.r.reasons).every(k => k.startsWith("limit")));
  const best = (ok.length ? ok : rows).reduce((a, b) => (b.imb < a.imb ? b : a), rows[0]);
  return { rows, best };
}
function tunePanelHTML(p) {
  const T = S.tune = S.tune || { key: "win.vp", values: "", games: 100 }; const R = S.tuneRes && S.tuneRes.pid === p.id ? S.tuneRes : null;
  const params = tuneParams(p); const cur = getParam(p, T.key);
  return `<div class="panel"><div class="row spread"><h2>Ladění a porovnání variant</h2><span class="count">simulace</span></div>
    <p class="hint">Zkusí několik hodnot jednoho čísla (nebo uložené verze návrhu) a ukáže, která je nejvyrovnanější.</p>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">
      <label class="f">Parametr<select id="tuKey">${params.map(([k, l]) => `<option value="${k}" ${k === T.key ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
      <label class="f">Hodnoty (teď ${esc(cur === "" || cur == null ? "–" : cur)})<input type="text" id="tuVals" value="${esc(T.values)}" placeholder="např. 10, 15, 20"></label>
      <label class="f">Her na variantu<input type="number" id="tuGames" min="20" max="500" value="${T.games}"></label></div>
    <div class="row"><button class="btn primary" id="tuRun">Vyladit</button>${(p.versions || []).length ? `<button class="btn" id="tuVers">Porovnat uložené verze</button>` : ""}<span class="hint" id="tuProg"></span></div>
    ${R ? `<div style="overflow-x:auto"><table class="crt-tab" style="min-width:100%"><thead><tr><th>Varianta</th><th>Kol</th><th>1. hráč</th><th>Nejsilnější strana</th><th>Remízy</th><th>Těsnost</th><th>Odchylka</th><th></th></tr></thead><tbody>
      ${R.rows.map((x, i) => { const r = x.r; const fs = r.fac.reduce((a, b) => (b.wr > a.wr ? b : a), r.fac[0] || { wr: 0, name: "" });
        return `<tr class="${x === R.best ? "hl" : ""}"><th>${esc(x.label)}</th><td>${r.avgRounds.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })}</td><td>${Math.round(r.seat[0].wr * 100)} %</td><td>${esc(fs.name)} ${Math.round(fs.wr * 100)} %</td><td>${r.warnings.some(w => w.includes("remízou")) ? "hodně" : "–"}</td><td>${r.margin == null ? "–" : r.margin.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })}</td><td>${Math.round(x.imb * 100)} %</td><td>${x.value != null && x === R.best && !R.versions ? `<button class="btn small primary" data-tuuse="${i}">Použít</button>` : ""}</td></tr>`; }).join("")}</tbody></table></div>
      <p class="hint">Doporučeno: <b>${esc(R.best.label)}</b> – nejmenší odchylka od férového podílu výher${ties0(R)}.</p>` : ""}
  </div>`;
}
const ties0 = R => R.rows.every(x => Object.keys(x.r.reasons).every(k => k.startsWith("limit"))) ? " (pozor: žádná varianta nedojde do cíle)" : "";
function wireTunePanel(main, p) {
  const q = id => document.getElementById(id); if (!q("tuRun")) return; const T = S.tune;
  q("tuKey").onchange = e => { T.key = e.target.value; T.values = ""; render(); };
  q("tuVals").onchange = e => { T.values = e.target.value; }; q("tuGames").onchange = e => { T.games = Math.max(20, Math.min(500, +e.target.value || 100)); };
  const opt = () => ({ ...S.simOpt, games: T.games, actions: +p.ruleset.actionsPerTurn || (S.simOpt || {}).actions || 2, rounds: (S.simOpt || {}).rounds || 15, policy: (S.simOpt || {}).policy || "greedy" });
  const go = async (variants, versions) => { q("tuRun").disabled = true; const r = await runTuning(p, opt(), variants, (vi, i) => { const el = q("tuProg"); if (el) el.textContent = `Varianta ${vi + 1} z ${variants.length}: ${i} her…`; }); S.tuneRes = { pid: p.id, ...r, versions }; render(); };
  q("tuRun").onclick = () => { const vals = T.values.split(/[,;\s]+/).filter(Boolean).map(v => isNaN(+v) ? v : +v); if (!vals.length) { toast("Zadej hodnoty oddělené čárkou"); return; } S.simOpt = S.simOpt || {};
    go(vals.map(v => ({ label: String(v), value: v, project: () => { const q2 = clone(p); setParam(q2, T.key, v); return q2; } })), false); };
  if (q("tuVers")) q("tuVers").onclick = () => go([{ label: "současný návrh", value: null, project: () => clone(p) }, ...p.versions.map(v => ({ label: "verze " + v.ver, value: null, project: () => normalize({ ...clone(v.snap), id: p.id }) }))], true);
  $$("[data-tuuse]", main).forEach(b => b.onclick = () => { const x = S.tuneRes.rows[+b.dataset.tuuse]; setParam(p, T.key, x.value); touch(p); render(); toast("Hodnota nastavena: " + x.label); });
}
