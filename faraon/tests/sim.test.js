// Simulace bez prohlížeče: odehraje mnoho měsíců za každý hratelný rod a hlídá výjimky a nesmyslné hodnoty.
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = path.join(__dirname, "..", "src", "js");
const files = fs.readdirSync(dir).filter(f => /^0\d-.*\.js$/.test(f)).sort();
const code = '"use strict";\n' + files.map(f => fs.readFileSync(path.join(dir, f), "utf8")).join("\n") + "\n;this.API={newGame,endTurn,SCENARIOS,P,clanProvs,officers,aiDomestic,resolveEvent,eventView,clanBudget,men,clanMen,aliveClans,coreProvs,realmCore,MON_IDS,monState};";
const ctx = {}; vm.createContext(ctx); vm.runInContext(code, ctx);
const A = ctx.API;
const months = +(process.argv[2] || 240);
let fails = 0;
for (const scen of Object.keys(A.SCENARIOS)) for (const cl of A.SCENARIOS[scen].clans.filter(c => c.type !== "kmen")) for (const seed of [1, 7]) {
  const s = A.newGame({ scen, clan: cl.id, seed });
  try {
    for (let i = 0; i < months; i++) {
      for (const c of A.officers(s, s.player)) if (c.acted !== s.turn) A.aiDomestic(s, s.player, c, true);
      let guard = 0; while (s.events.length && guard++ < 10) { const v = A.eventView(s, s.events[0]); A.resolveEvent(s, Math.floor(Math.random() * v.ch.length)); }
      A.endTurn(s);
      if (s.over && !s.over.cont) break;
      for (const p of Object.values(s.provs)) for (const k of ["pop", "agri", "com", "loy", "stock", "dur"]) if (!Number.isFinite(p[k])) throw new Error(`NaN ${k} v ${p.id}`);
      for (const C of A.aliveClans(s)) for (const k of ["deben", "grain", "maat", "prestige"]) if (!Number.isFinite(C[k])) throw new Error(`NaN ${k} u ${C.id}`);
    }
    const C = A.P(s), b = A.clanBudget(s, s.player);
    console.log(`${scen}/${cl.id}/${seed}: ${s.turn} měs., ≈${s.bce} př. n. l., župy ${A.clanProvs(s, s.player).length}, jádro ${A.realmCore(s, s.player)}/${A.coreProvs(s).length}, deben ${Math.round(C.deben)}, obilí ${Math.round(C.grain)}, muži ${A.clanMen(s, s.player)}, maat ${Math.round(C.maat)}, rody ${A.aliveClans(s).length}, bitvy ${s.battles.length}, války ${s.wars.length}${s.over ? " | " + (s.over.win ? "VÍTĚZSTVÍ" : "KONEC") + ": " + s.over.txt.slice(0, 70) : ""}`);
  } catch (e) { fails++; console.log(`CHYBA ${scen}/${cl.id}/${seed} v měsíci ${s.turn}: ${e.stack.split("\n").slice(0, 4).join(" | ")}`); }
}
if (fails) { console.log(fails + " chyb"); process.exit(1); } else console.log("OK");
