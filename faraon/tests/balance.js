// Měření vyváženosti: strojový hráč hraje celou hru stejnými pravidly jako počítačoví soupeři (správa, stavby, trh, tažení, mír)
// a vybírá nejlevnější dostupné vědění; události řeší náhodně, ale se stejným semínkem. Skript sbírá výsledky po scénářích a rodech.
// Použití: node tests/balance.js [měsíců=300] [obtížnost=1] [semínek=3]     (běží ve 4 procesech)
const fs = require("fs"), path = require("path"), vm = require("vm"), cp = require("child_process");
const dir = path.join(__dirname, "..", "src", "js");
function load() {
  let code = '"use strict";\n' + fs.readdirSync(dir).filter(f => /^0\d-.*\.js$/.test(f)).sort().map(f => fs.readFileSync(path.join(dir, f), "utf8")).join("\n") +
    "\n;this.A={newGame,endTurn,SCENARIOS,P,clanProvs,aliveClans,coreProvs,realmCore,clanMen,men,clanBudget,eventView,resolveEvent,aiClan,disbandArmy,techAvail,techCost,TECH_IDS,hasTech,enemiesOf,officers,aiDomestic,provDeben,monthlyGrainNeed,marketCap};";
  // ABLATE=costs,flood,hunger,tech vrátí jednotlivé úpravy vyvážení do původního stavu (měření, co za výsledek může)
  const ab = (process.env.ABLATE || "").split(",");
  if (ab.includes("costs")) code = code.replace("cost: 220,", "cost: 250,").replace("cost: 330, upd: 0.3", "cost: 700, upd: 0.6").replace("cost: 360, horses", "cost: 2000, horses").replace("(t.vozy || 0) * 0.25", "(t.vozy || 0) * 0.4");
  if (ab.includes("flood")) code = code.replace("const FLOOD_PHI = 0.3;", "const FLOOD_PHI = 0;");
  if (ab.includes("hunger")) code = code.replace("C.grain > rest * 2) {", "false) {");
  if (ab.includes("tech") || ab.includes("techcost")) code = code.replace("(1 + 0.1 * Object.keys(s.clans[cid].techs).length)", "1");
  if (ab.includes("tech") || ab.includes("techera")) code = code.replace("if (E && s.bce > E[0])", "if (false)");
  if (ab.includes("techcost05")) code = code.replace("(1 + 0.1 * Object.keys(s.clans[cid].techs).length)", "(1 + 0.05 * Object.keys(s.clans[cid].techs).length)");
  if (ab.includes("diminish")) code = code.replace("/ (1 + 0.12 * C.resN));", ");");
  const ctx = {}; vm.createContext(ctx); vm.runInContext(code, ctx); return ctx.A;
}
function playOne(scen, clan, seed, diff, months) {
  const A = load(), s = A.newGame({ scen, clan, seed, diff }); let r = seed * 7919 + 13; const rnd = () => (r = (Math.imul(r, 1664525) + 1013904223) >>> 0) / 4294967296;
  const snap = {}, hungry = { n: 0 }, minDeben = { v: 1e9 }; let endMonth = null, outcome = "běží", firstWin = null;
  for (let i = 0; i < months; i++) {
    const C = A.P(s); if (!C.alive) break;
    // vědění
    if (!C.res.cur) { const av = A.TECH_IDS.filter(t => !C.techs[t] && A.techAvail(s, s.player, t)).sort((a, b) => A.techCost(s, s.player, a) - A.techCost(s, s.player, b)); if (av.length) C.res.cur = av[0]; }
    for (const a of s.armies.filter(x => x.cl === s.player && (!x.path || !x.path.length) && s.provs[x.loc].owner === s.player && s.turn - x.since > 0)) A.disbandArmy(s, a);
    A.aiClan(s, s.player);
    for (const c of A.officers(s, s.player)) if (c.acted !== s.turn) A.aiDomestic(s, s.player, c, true);
    let guard = 0; while (s.events.length && guard++ < 12) { const v = A.eventView(s, s.events[0]); A.resolveEvent(s, Math.floor(rnd() * v.ch.length)); }
    A.endTurn(s);
    const ps = A.clanProvs(s, s.player); if (ps.some(p => p.hunger > 0.15)) hungry.n++;
    minDeben.v = Math.min(minDeben.v, A.P(s).deben);
    if (s.over && s.over.win && firstWin == null) firstWin = s.turn;
    if (s.over && !s.over.cont) { outcome = s.over.win ? "výhra" : "prohra"; endMonth = s.turn; break; }
    if ([60, 120, 180, 240, 300].includes(s.turn)) snap[s.turn] = { nomy: ps.length, jadro: A.realmCore(s, s.player), deben: Math.round(A.P(s).deben), obili: Math.round(A.P(s).grain), muzi: A.clanMen(s, s.player), maat: Math.round(A.P(s).maat) };
  }
  if (firstWin != null) outcome = "výhra";
  const C = A.P(s), core = A.coreProvs(s).length, rivals = A.aliveClans(s).filter(c => c.id !== s.player && c.type !== "kmen").map(c => ({ id: c.id, core: A.realmCore(s, c.id), n: A.clanProvs(s, c.id).length })).sort((a, b) => b.core - a.core)[0];
  return { scen, clan, seed, diff, outcome, endMonth: endMonth || s.turn, firstWin, snap, hungry: hungry.n, minDeben: Math.round(minDeben.v), core, jadro: A.realmCore(s, s.player), nomy: A.clanProvs(s, s.player).length, rival: rivals, deben: Math.round(C.deben), obili: Math.round(C.grain), alive: C.alive };
}
if (process.argv[2] === "--worker") { const [, , , scen, clan, seed, diff, months] = process.argv; try { console.log("@@" + JSON.stringify(playOne(scen, clan, +seed, +diff, +months))); } catch (e) { console.log("@@" + JSON.stringify({ scen, clan, seed: +seed, diff: +diff, error: e.stack.split("\n").slice(0, 3).join(" | ") })); } process.exit(0); }
else {
  const months = +(process.argv[2] || 300), diff = process.argv[3] != null ? +process.argv[3] : 1, seeds = +(process.argv[4] || 3), A = load(), jobs = [];
  for (const scen of Object.keys(A.SCENARIOS)) for (const cl of A.SCENARIOS[scen].clans.filter(c => (c.type !== "kmen" || ["medzaj", "lib"].includes(c.id)) && (!process.env.ONLY || process.env.ONLY.split(",").includes(c.id)))) for (let k = 1; k <= seeds; k++) jobs.push([scen, cl.id, k * 11 + 3, diff, months]);
  const out = []; let running = 0, next = 0;
  const pump = () => { while (running < 4 && next < jobs.length) { const j = jobs[next++]; running++; cp.execFile("node", [__filename, "--worker", ...j.map(String)], { maxBuffer: 1 << 24 }, (err, so) => { running--; const m = /@@(.*)/.exec(so || ""); if (m) out.push(JSON.parse(m[1])); else out.push({ scen: j[0], clan: j[1], error: String(err) }); if (next >= jobs.length && !running) report(); else pump(); }); } };
  const report = () => {
    fs.writeFileSync(path.join(__dirname, "out", `balance-d${diff}-${months}.json`), JSON.stringify(out, null, 1));
    const by = {}; for (const r of out) (by[r.scen + "/" + r.clan] = by[r.scen + "/" + r.clan] || []).push(r);
    console.log(`obtížnost ${diff}, ${months} měsíců, ${seeds} semínek na rod`); console.log("scénář/rod · výhry · prohry · ať běží · prům. nomů · jádro · prům. měsíc výhry · hlad (měs.) · deben@120 · obilí@120 · nejsilnější soupeř (jádro)");
    for (const [k, L] of Object.entries(by).sort()) { const ok = L.filter(r => !r.error), w = ok.filter(r => r.outcome === "výhra").length, l = ok.filter(r => r.outcome === "prohra").length, avg = f => ok.length ? Math.round(ok.reduce((a, r) => a + f(r), 0) / ok.length) : 0, wm = ok.filter(r => r.firstWin != null);
      console.log(`${k.padEnd(18)} ${w}/${L.length} ${l}/${L.length} ${ok.length - w - l}/${L.length}  nomy ${String(avg(r => r.nomy)).padStart(2)}  jádro ${String(avg(r => r.jadro)).padStart(2)}/${ok[0] ? ok[0].core : "?"}  výhra@${wm.length ? Math.round(wm.reduce((a, r) => a + r.firstWin, 0) / wm.length) : "–"}  hlad ${String(avg(r => r.hungry)).padStart(3)}  d120 ${String(avg(r => (r.snap[120] || {}).deben || 0)).padStart(7)}  o120 ${String(avg(r => (r.snap[120] || {}).obili || 0)).padStart(8)}  soupeř ${ok[0] && ok[0].rival ? ok.map(r => r.rival ? r.rival.id + ":" + r.rival.core : "?").join(",") : ""}${L.some(r => r.error) ? "  CHYBY: " + L.filter(r => r.error).map(r => r.error).join(" ").slice(0, 160) : ""}`); }
    const ok = out.filter(r => !r.error); console.log(`celkem: výhry ${ok.filter(r => r.outcome === "výhra").length}, prohry ${ok.filter(r => r.outcome === "prohra").length}, ostatní ${ok.filter(r => r.outcome === "běží").length} z ${out.length}`);
  };
  pump();
}
