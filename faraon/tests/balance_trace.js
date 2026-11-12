// Časový průběh jedné hry strojového hráče: node tests/balance_trace.js scénář rod [semínko] [obtížnost] [měsíců] [aggr] [výnos]
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = path.join(__dirname, "..", "src", "js");
const code = '"use strict";\n' + fs.readdirSync(dir).filter(f => /^0\d-.*\.js$/.test(f)).sort().map(f => fs.readFileSync(path.join(dir, f), "utf8")).join("\n") +
  "\n;this.A={newGame,endTurn,P,clanProvs,aliveClans,coreProvs,realmCore,clanMen,men,clanBudget,eventView,resolveEvent,aiClan,disbandArmy,techAvail,techCost,TECH_IDS,officers,aiDomestic,enemiesOf,POLICIES,setPolicy};";
const ctx = {}; vm.createContext(ctx); vm.runInContext(code, ctx); const A = ctx.A;
const [scen, clan, seed = 3, diff = 1, months = 240, aggr = "", pol = ""] = process.argv.slice(2);
const s = A.newGame({ scen, clan, seed: +seed, diff: +diff }); let r = +seed * 7919 + 13; const rnd = () => (r = (Math.imul(r, 1664525) + 1013904223) >>> 0) / 4294967296;
if (aggr) A.P(s).aggr = +aggr; if (pol) A.setPolicy(s, pol);
console.log("měs  nomy jádro  deben(čistě)   obilí(čistě)   muži  hladových  války  vojska  maat  výzkum");
for (let i = 0; i < +months; i++) {
  const C = A.P(s); if (!C.alive) { console.log("rod zanikl v měsíci", s.turn); break; }
  if (!C.res.cur) { const av = A.TECH_IDS.filter(t => !C.techs[t] && A.techAvail(s, s.player, t)).sort((a, b) => A.techCost(s, s.player, a) - A.techCost(s, s.player, b)); if (av.length) C.res.cur = av[0]; }
  for (const a of s.armies.filter(x => x.cl === s.player && (!x.path || !x.path.length) && s.provs[x.loc].owner === s.player && s.turn - x.since > 0)) A.disbandArmy(s, a);
  A.aiClan(s, s.player); for (const c of A.officers(s, s.player)) if (c.acted !== s.turn) A.aiDomestic(s, s.player, c, true);
  let g = 0; while (s.events.length && g++ < 12) { const v = A.eventView(s, s.events[0]); A.resolveEvent(s, Math.floor(rnd() * v.ch.length)); }
  A.endTurn(s);
  if ([1, 6, 12, 24, 36, 48, 60, 90, 120, 180, 240, 300, 360].includes(s.turn)) { const b = A.clanBudget(s, s.player), ps = A.clanProvs(s, s.player), D = A.P(s);
    console.log(String(s.turn).padStart(3), String(ps.length).padStart(5), String(A.realmCore(s, s.player)).padStart(4), String(Math.round(D.deben)).padStart(9), `(${b.net >= 0 ? "+" : ""}${Math.round(b.net)})`.padStart(9), String(Math.round(D.grain)).padStart(10), `(${b.gnet >= 0 ? "+" : ""}${Math.round(b.gnet)})`.padStart(10), String(A.clanMen(s, s.player)).padStart(6), String(ps.filter(p => p.hunger > 0.15).length).padStart(6), String(A.enemiesOf(s, s.player).length).padStart(6), String(s.armies.filter(a => a.cl === s.player).length).padStart(6), String(Math.round(D.maat)).padStart(6), D.res.cur || "-"); }
  if (s.over && !s.over.cont) { console.log("KONEC:", s.over.win ? "výhra" : "prohra", s.turn, s.over.txt.slice(0, 120)); break; }
}
