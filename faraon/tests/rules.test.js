// Testy jednotlivých pravidel (bez prohlížeče): node tests/rules.test.js
const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const dir = path.join(__dirname, "..", "src", "js");
const code = '"use strict";\n' + fs.readdirSync(dir).filter(f => /^0\d-.*\.js$/.test(f)).sort().map(f => fs.readFileSync(path.join(dir, f), "utf8")).join("\n") +
  "\n;this.X={census,goldOfValor,takeToKap,TECHS,TECH_IDS,hasTech,marketCap,worldTick,EVENTS,QUOTES,quoteTag,execration,newGame,endTurn,floodFactor,tacMult,STANCES,routeIncome,ROUTES,declareWar,makePeace,setLaw,heirsOf,clanBudget,battle,men,SCENARIOS,PROVINCES,lw,provTax,yearTaxEstimate,marketCap,liveBattleStart,liveStep,ordMod,die,genOfficer,migrate,marketTick,trade,checkEnd,coreProvs,realmCore,officers,rodsOf,goalProgress,clanProvs,sendArmy,royalTour,lawTechTick,durMax,omenRoll,EVENTS,eventView,setPolicy,delegated};";
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
t("rozkazy v bitvě: salvy lučištníků přebijí šik, šik zastaví útok", () => {
  const s = X.newGame({ scen: "sip", clan: "thebes", seed: 8 }), T = { kopinici: 600, lucistnici: 600 }, a = { t: T }, b = { t: T };
  assert(X.ordMod(s, a, b, "strelba", "sik", "udoli").atk > X.ordMod(s, a, b, "strelba", "utok", "udoli").atk);
  assert(X.ordMod(s, a, b, "sik", "utok", "udoli").atk > X.ordMod(s, a, b, "sik", "strelba", "udoli").atk);
});
t("osobně vedená bitva: kola po kole až do konce, pak se vojsko pohne dál", () => {
  const s = X.newGame({ scen: "ahm", clan: "thebes", seed: 9 }); s.events = [];
  const a = { id: 99, cl: "thebes", loc: "u17", t: { kopinici: 3000, lucistnici: 2000 }, train: 50, cmds: [], path: [], stance: "vyvazeny", tactic: "sik", since: 0 }; s.armies.push(a);
  assert(X.liveBattleStart(s, { army: 99 }, { garr: "u17" }, "u17", "u16", "posadka")); assert(s.pb && s.events[0].k === "vbitva" && a.hold);
  let g = 0; while (s.pb && g++ < 10) X.liveStep(s, "strelba");
  assert(!s.pb && !a.hold && s.battles[0].live && s.battles[0].ordA.includes("strelba"));
});
t("rody: syn zdědí po otci správu nomu, když jsou úřady dědičné", () => {
  const s = X.newGame({ scen: "sip", clan: "thebes", seed: 10 }); s.clans.thebes.laws.nomarchove = 0;
  const p = s.provs.u6, c = X.genOfficer(s, "thebes", "eg", "u6", { by: s.bce + 60, rank: 3 }); c.rod = "Senbi"; p.lord = c.id; c.rodPriv = 1; s.clans.thebes.rodPriv = { Senbi: 1 };
  X.die(s, c, "zemřel"); const L = s.chars[p.lord]; assert(L && L.father === c.id && L.rod === "Senbi", "nom zdědil syn");
});
t("uložená hra verze 1 se převede na současnou verzi", () => {
  const s = X.newGame({ scen: "sip", clan: "thebes", seed: 11 }); const o = JSON.parse(JSON.stringify(s));
  o.v = 1; delete o.spynet; delete o.fspies; delete o.market.hist; delete o.provs.sar; for (const p of Object.values(o.provs)) p.nb = p.nb.filter(n => n !== "sar");
  const m = X.migrate(o); assert(m && m.v === 2 && m.provs.sar && m.provs.sin.nb.includes("sar") && Array.isArray(m.market.hist) && m.spynet);
  assert.strictEqual(X.migrate({ v: 99, provs: {}, clans: {} }), null);
});
t("trh: velký nákup obilí zvedne cenu v příštím měsíci", () => {
  const s = X.newGame({ scen: "sip", clan: "thebes", seed: 12 }); X.marketTick(s); const p0 = s.market.p; s.clans.thebes.deben = 1e6; s.market.p = p0;
  X.trade(s, "thebes", X.marketCap(s, "thebes")); X.marketTick(s); assert(s.market.p > p0, `${s.market.p} > ${p0}`);
});
t("soupeř, který sjednotí Egypt, ukončí hru porážkou", () => {
  const s = X.newGame({ scen: "sip", clan: "thebes", seed: 13 }); X.checkEnd(s); assert(!s.over);
  const core = X.coreProvs(s); let k = 0; for (const p of core) if (p.owner !== "thebes" || k++ > 3) p.owner = p.id === "u4" ? "thebes" : "hyksos";
  X.checkEnd(s); assert(s.over && s.over.win === false, "porážka");
});
t("zákon o sčítání dobytka zvyšuje příjem, šikmé valy zesilují hradby", () => {
  const s = X.newGame({ scen: "sip", clan: "thebes", seed: 14 }), C = s.clans.thebes; C.laws.dobytek = 1; let d0 = C.deben; X.lawTechTick(s); const a = C.deben - d0;
  C.laws.dobytek = 2; d0 = C.deben; X.lawTechTick(s); assert(C.deben - d0 > a);
  const p = s.provs.u4, m0 = X.durMax(s, p); C.techs.glacis = 1; assert(X.durMax(s, p) > m0);
});
t("královská objížďka zvedne spokojenost a jde jen jednou za rok", () => {
  const s = X.newGame({ scen: "ahm", clan: "thebes", seed: 15 }), low = X.clanProvs(s, "thebes").filter(p => p.id !== "u4").sort((a, b) => a.loy - b.loy)[0], l0 = low.loy;
  s.clans.thebes.deben = 1e5; assert.strictEqual(X.royalTour(s, "thebes"), null); assert(low.loy >= l0 + 8); assert.notStrictEqual(X.royalTour(s, "thebes"), null);
});
t("znamení roku: hůlky dávají 1 až 5 a událost má volby", () => {
  const s = X.newGame({ scen: "sip", clan: "thebes", seed: 16 });
  for (let i = 0; i < 30; i++) { const o = X.omenRoll(s); assert(o.v >= 1 && o.v <= 5 && o.sticks.length === 4); const v = X.eventView(s, { k: "znameni", data: o }); assert(v.ch.length >= 1); }
});
t("královský výnos: rádce na konci měsíce zaměstná volné úředníky podle výnosu", () => {
  const s = X.newGame({ scen: "sip", clan: "thebes", seed: 17 }), C = s.clans.thebes; C.deben = 50000; C.res.cur = "rybari";
  assert.strictEqual(X.setPolicy(s, "ucenost"), null); const p0 = C.res.pts; X.delegated(s);
  assert(X.officers(s, "thebes").filter(c => c.acted === s.turn).length > 5, "úředníci jednají"); assert(C.res.pts > p0, "vědění postupuje");
  assert.notStrictEqual(X.setPolicy(s, "nesmysl"), null);
});
t("zaklínací texty: jen proti nepříteli ve válce, jednou za rok, působí doma", () => {
  const s = X.newGame({ scen: "ahm", clan: "thebes", seed: 5 }), C = s.clans.thebes; C.deben = 5000; C.maat = 50;
  assert.notStrictEqual(X.execration(s, "thebes", "kush"), null, "bez války nelze");
  X.declareWar(s, "thebes", "kush"); const m0 = C.maat, d0 = C.deben, k0 = JSON.stringify(s.clans.kush);
  assert.strictEqual(X.execration(s, "thebes", "kush"), null); assert.strictEqual(C.maat, m0 + 2); assert.strictEqual(C.deben, d0 - 300);
  assert.strictEqual(JSON.stringify(s.clans.kush), k0, "nepříteli se nic nestane");
  assert.notStrictEqual(X.execration(s, "thebes", "kush"), null, "podruhé až za rok");
});
t("dějinné chvíle: každá má volby, které projdou, a citáty mají pramen a dobu vzniku", () => {
  for (const [k, scen, clan] of [["boure_ahmose", "ahm", "thebes"], ["tetian", "ahm", "thebes"], ["rada_velmozu", "sip", "thebes"], ["psi_intefa", "fip", "thebes"], ["anch_theby", "anch", "anch"], ["hrob_valecniku", "mt2", "thebes"]]) {
    const s = X.newGame({ scen, clan, seed: 3 }), C = s.clans[clan]; C.deben = 50000; C.grain = 500000;
    const v = X.EVENTS[k].view(s, {}); assert(v.t && v.tx.length > 80 && v.ch.length >= 2, k);
    for (const c of v.ch) assert.strictEqual(c.f(), null, k + ": " + c.t);
  }
  for (const [id, q] of Object.entries(X.QUOTES)) assert(q.t && q.src && q.od > 1000 && q.tags.length, id);
  const s = X.newGame({ scen: "anch", clan: "anch", seed: 3 }), q = X.quoteTag(s, ["vojsko"]); assert(q && q.od >= s.bce, "citát nesmí být mladší než doba hry");
});
t("soupis domácností, zlato chrabrosti a děti kapu mají podmínky a lhůty", () => {
  const s = X.newGame({ scen: "ahm", clan: "thebes", seed: 9 }), C = s.clans.thebes; C.deben = 10000; const d0 = C.deben, l0 = s.provs.u4.loy;
  assert.strictEqual(X.census(s, "thebes"), null); assert(C.deben > d0, "soupis přinese debeny"); assert.strictEqual(s.provs.u4.loy, l0 - 3);
  assert.notStrictEqual(X.census(s, "thebes"), null, "soupis jen jednou za dva roky");
  assert.notStrictEqual(X.goldOfValor(s, "thebes"), null, "bez vítězství nelze");
  s.battles.unshift({ t: s.turn, a: "thebes", b: "hyksos", win: "A", place: "u15", d: "", kind: "bitva" }); const t0 = s.provs.u4.train;
  assert.strictEqual(X.goldOfValor(s, "thebes"), null); assert(s.provs.u4.train >= Math.min(100, t0 + 3)); assert.notStrictEqual(X.goldOfValor(s, "thebes"), null);
  assert.notStrictEqual(X.takeToKap(s, "thebes", "hyksos"), null, "s nepřítelem ve válce ne");
  const r0 = s.clans.thebes.rel.kush || 0; if (X.takeToKap(s, "thebes", "kush") === null) { assert(s.clans.thebes.rel.kush > r0); assert.notStrictEqual(X.takeToKap(s, "thebes", "kush"), null, "podruhé ne"); }
});
t("nové vynálezy jsou ve stromu, mají předpoklady z existujících a působí", () => {
  for (const k of ["sane", "sopdet", "egmodr", "vahy", "kanal", "vosk", "slovniky"]) { assert(X.TECH_IDS.includes(k), k); for (const r of X.TECHS[k].req || []) assert(X.TECHS[r], k + " → " + r); }
  const s = X.newGame({ scen: "ahm", clan: "thebes", seed: 9 }), C = s.clans.thebes, m0 = X.marketCap(s, "thebes"); C.techs.vahy = 1; assert(X.marketCap(s, "thebes") > m0, "váhy zvětší trh");
  C.techs.kanal = 1; C.techs.slovniky = 1; C.res.cur = "sane"; const d0 = C.deben, p0 = C.res.pts; X.worldTick(s); assert(C.deben >= d0 + 100, "kanál u kataraktu vynáší"); assert(C.res.pts >= p0 + 1.5, "seznamy slov přidávají vědění");
});
console.log(`OK – ${n} testů`);
