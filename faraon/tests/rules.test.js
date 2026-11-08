// Testy jednotlivých pravidel (bez prohlížeče): node tests/rules.test.js
const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const dir = path.join(__dirname, "..", "src", "js");
const code = '"use strict";\n' + fs.readdirSync(dir).filter(f => /^0\d-.*\.js$/.test(f)).sort().map(f => fs.readFileSync(path.join(dir, f), "utf8")).join("\n") +
  "\n;this.X={newGame,endTurn,floodFactor,tacMult,STANCES,routeIncome,ROUTES,declareWar,makePeace,setLaw,heirsOf,clanBudget,battle,men,SCENARIOS,PROVINCES,lw,provTax,yearTaxEstimate};";
const ctx = {}; vm.createContext(ctx); vm.runInContext(code, ctx); const X = ctx.X;
let n = 0; const t = (name, f) => { f(); n++; console.log("✔ " + name); };

t("záplava: nejlepší kolem 16 loktů, hlad pod 12, škody nad 18", () => {
  assert(X.floodFactor(16) > X.floodFactor(13)); assert(X.floodFactor(16) > X.floodFactor(19)); assert(X.floodFactor(11) < 0.5);
});
t("každý scénář přiřadí každý nom právě jednomu rodu", () => {
  for (const [id, Sc] of Object.entries(X.SCENARIOS)) { const own = {}; for (const c of Sc.clans) for (const p of c.provs) { assert(!own[p], `${id}: ${p} dvakrát`); own[p] = c.id; } for (const p of X.PROVINCES) assert(own[p[0]], `${id}: ${p[0]} bez pána`); }
});
t("taktiky: salvy porazí šik, šik zastaví vozy, rychlý útok porazí salvy", () => {
  const s = X.newGame({ scen: "sip", clan: "thebes", seed: 1 }), T = { kopinici: 1000 };
  const m = (a, b) => X.tacMult(s, { tac: a, t: T, cmds: [] }, { tac: b, t: T, cmds: [] }, "udoli");
  assert(m("strelba", "sik") > 1 && m("sik", "strelba") < 1); assert(m("sik", "vozy") > 1); assert(m("vozy", "strelba") > 1 * 0.95);
});
t("opatrný postoj ztrácí méně mužů než útočný", () => { assert(X.STANCES.opatrny.loss < X.STANCES.utok.loss); assert(X.STANCES.opatrny.brk > X.STANCES.utok.brk); });
t("válka mezi pány nomů na cestě přeruší výnos z cesty", () => {
  const s = X.newGame({ scen: "sip", clan: "thebes", seed: 2 }), before = X.routeIncome(s, "thebes");
  s.wars = s.wars.filter(w => !(w.a === "thebes" || w.b === "thebes")); X.declareWar(s, "thebes", "hyksos");
  const during = X.routeIncome(s, "thebes"); assert(during < before, `${during} < ${before}`);
});
t("zákon nelze změnit dvakrát za rok", () => {
  const s = X.newGame({ scen: "fip", clan: "herak", seed: 3 });
  assert.strictEqual(X.setLaw(s, "herak", "soudy", 0), null); assert.notStrictEqual(X.setLaw(s, "herak", "soudy", 2), null);
});
t("nástupnictví: dospělý Kamose má přednost před malým Ahmosem", () => {
  const s = X.newGame({ scen: "sip", clan: "thebes", seed: 4 }); assert.strictEqual(X.heirsOf(s, "thebes")[0].n, "Kamose");
});
t("dvůr stojí tím víc, čím víc debenů rod hromadí", () => {
  const s = X.newGame({ scen: "sip", clan: "thebes", seed: 5 }), a = X.clanBudget(s, "thebes").ex.dvur; s.clans.thebes.deben = 300000;
  assert(X.clanBudget(s, "thebes").ex.dvur > a + 5000);
});
t("povinné zásoby v nomech snižují daň ze sklizně", () => {
  const s = X.newGame({ scen: "sip", clan: "thebes", seed: 6 }), a = X.yearTaxEstimate(s, "thebes", 15.5); s.clans.thebes.laws.sypky = 2;
  assert(X.yearTaxEstimate(s, "thebes", 15.5) < a);
});
t("rok hry: kalendář, letopis a úroda proběhnou bez chyb", () => {
  const s = X.newGame({ scen: "mt2", clan: "thebes", seed: 7 }); for (let i = 0; i < 14; i++) { s.events = []; X.endTurn(s); }
  assert(s.annals && s.annals.length === 1 && s.annals[0].y === 2040); assert(s.flood.h > 8);
});
console.log(`OK – ${n} testů`);
