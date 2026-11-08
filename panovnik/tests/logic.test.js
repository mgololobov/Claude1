// Testy herní logiky: node --test tests/*.test.js
const test = require("node:test"), assert = require("node:assert");
const { load } = require("./harness");
const E = load();

function finite(o, p = "s") { if (typeof o === "number") { if (!Number.isFinite(o)) throw new Error("nekonečné číslo: " + p); return; } if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) finite(v, p + "." + k); }
function resolveAll(s) { let n = 0; while (s.events.length && n++ < 50) { const v = E.eventView(s, s.events[0]); const c = v.ch.find(x => x.ok); assert.ok(c, "událost bez dostupné volby: " + s.events[0].id); E.resolveEvent(s, 0, c.i); } }
function play(s, months) { for (let i = 0; i < months && !(s.over && !s.over.cont); i++) { resolveAll(s); const e = E.endTurn(s); if (e && !(s.over && !s.over.cont)) throw new Error(e); } }

test("nový svět roku 1256", () => {
  const s = E.newGame({ seed: 1 });
  assert.equal(Object.keys(s.provs).length, 105);
  assert.equal(E.aliveClans(s).length, 29);
  assert.equal(E.leaderOf(s, "premysl").n, "Přemysl Otakar II.");
  assert.equal(E.clanProvs(s, "premysl").length, 18);
  for (const p of Object.values(s.provs)) { assert.ok(p.nb.length >= 1, p.id + " bez sousedů"); for (const n of p.nb) assert.ok(s.provs[n].nb.includes(p.id), "nesouměrní sousedé " + p.id + "–" + n); }
  // mapa je souvislá
  const seen = new Set(["praha"]), q = ["praha"]; while (q.length) for (const n of s.provs[q.shift()].nb) if (!seen.has(n)) { seen.add(n); q.push(n); }
  assert.equal(seen.size, 105, "mapa není souvislá");
  for (const c of E.aliveClans(s)) assert.ok(E.leaderOf(s, c.id), "rod bez hlavy: " + c.id);
  assert.ok(E.clanBudget(s, "premysl").net > 0);
});

test("rozkazy vazalům", () => {
  const s = E.newGame({ seed: 2 }); const C = E.P(s); C.gold = 5000;
  const offs = E.officersIn(s, "praha").filter(c => c.id !== C.leader);
  const a0 = s.provs.praha.agri;
  assert.equal(E.doCmd(s, "premysl", offs[0].id, "zemedelstvi"), null);
  assert.ok(s.provs.praha.agri > a0);
  assert.ok(E.doCmd(s, "premysl", offs[0].id, "obchod"), "druhý rozkaz v měsíci nesmí projít");
  const m0 = E.men(s.provs.praha.troops);
  assert.equal(E.doCmd(s, "premysl", offs[1].id, "nabor", "pesi", 300), null);
  assert.equal(E.men(s.provs.praha.troops), m0 + 300);
  assert.equal(E.doCmd(s, "premysl", C.leader, "stavba", "klaster"), null);
  assert.ok(s.provs.praha.build);
  for (let i = 0; i < 8; i++) { resolveAll(s); E.endTurn(s); }
  assert.ok(s.provs.praha.b.klaster >= 1, "klášter se dostavěl");
});

test("válka: tažení, obléhání a dobytí hradu", () => {
  const s = E.newGame({ seed: 3 }); const C = E.P(s); C.gold = 5000; C.grain = 9000;
  s.provs.pasov.troops = { pesi: 100, strelci: 0, jizda: 0, zoldneri: 0 }; s.clans.pasov.gold = 0;
  assert.equal(E.declareWar(s, "premysl", "pasov", null), null);
  s.provs.krumlov.troops.pesi = 3000;
  const cmd = E.officersIn(s, "krumlov")[0] || E.officers(s, "premysl").find(c => c.loc === "krumlov");
  assert.ok(cmd, "velitel v Krumlovsku");
  const path = E.dispatch(s, "premysl", "krumlov", "pasov", { pesi: 2500 }, [cmd.id], 6);
  assert.equal(path, null);
  s.armies[s.armies.length - 1].siegeMode = "ztec";
  for (let i = 0; i < 8 && s.provs.pasov.owner !== "premysl"; i++) { s.clans.pasov.gold = 0; s.events = s.events.filter(e => e.id !== "_proposal"); resolveAll(s); E.endTurn(s); }
  assert.equal(s.provs.pasov.owner, "premysl", "Pasov dobyt");
  assert.ok(s.battles.length >= 1);
  assert.ok(!s.clans.pasov.alive, "biskupství zaniklo");
});

test("volba římského krále proběhne", () => {
  const s = E.newGame({ seed: 4 });
  play(s, 14);
  assert.ok(s.hre.lastElection, "volba proběhla");
  assert.equal(s.hre.lastElection.votes.length, 7);
});

test("dvacet let světa bez chyb (víc semínek a rodů)", () => {
  for (const [seed, clan] of [[11, "premysl"], [12, "habsburg"], [13, "krakov"]]) {
    const s = E.newGame({ seed, clan }); play(s, 240);
    finite({ clans: Object.values(s.clans).map(c => [c.gold, c.grain, c.prestige]), provs: Object.values(s.provs).map(p => [p.pop, p.loy, p.agri, p.com, E.men(p.troops)]) });
    const top = E.aliveClans(s).map(c => [c.house, E.clanProvs(s, c.id).length]).sort((a, b) => b[1] - a[1]).slice(0, 3);
    console.log(`${clan}/${seed}: rok ${s.year}, rodů ${E.aliveClans(s).length}, bitev ${s.battles.length}, nejsilnější ${top.map(t => t.join(" ")).join(", ")}`);
    assert.ok(E.aliveClans(s).length >= 5);
  }
});

test("scénáře 1260 a 1273", () => {
  const a = E.newGame({ seed: 5, scen: 1260 });
  assert.equal(a.year, 1260); assert.ok(E.atWar(a, "premysl", "arpad"), "válka o Štýrsko");
  assert.equal(E.leaderOf(a, "velkopolsko").n, "Boleslav Pobožný");
  const b = E.newGame({ seed: 5, scen: 1273 });
  assert.equal(E.clanProvs(b, "premysl").length, 23, "Otakar drží Štýrsko a Korutany");
  assert.ok(!b.clans.sponheim.alive);
  assert.equal(E.leaderOf(b, "arpad").n, "Ladislav IV. Kumánský");
  assert.ok(Object.values(b.chars).some(c => c.n === "Václav" && c.cl === "premysl"), "syn Václav");
  assert.equal(b.hre.election, 9);
  for (const sc of [1256, 1260, 1273]) assert.ok(E.scenarioClans(sc).length >= 15);
});

test("osobně vedená bitva kolo po kole", () => {
  const s = E.newGame({ seed: 6 }); s.events = [];
  E.declareWar(s, "premysl", "wittL", null); s.events = [];
  const cmd = E.officersIn(s, "plzen")[0]; s.provs.plzen.troops.pesi = 3000;
  assert.equal(E.dispatch(s, "premysl", "plzen", "rezno", { pesi: 2500 }, [cmd.id], 6), null);
  const a = s.armies.find(x => x.cl === "premysl"); a.manual = true; a.tac = "klin";
  // nepřátelské vojsko do stejného kraje
  s.armies.push({ id: "aX", cl: "wittL", t: { pesi: 1500, strelci: 300, jizda: 100, zoldneri: 0 }, cmds: [], loc: "plzen", to: "plzen", path: [], grain: 100, train: 40, morale: 80, mode: "utok", siegeMode: "obleh", from: "rezno" });
  a.path = []; a.loc = "plzen";
  E.endTurn(s);
  const ev = s.events.find(e => e.id === "_battle"); assert.ok(ev, "čeká bitva");
  let n = 0; while (s.pend[ev.bid] && n++ < 10) { const v = E.eventView(s, ev); const i = s.events.indexOf(ev); E.resolveEvent(s, i, v.ch.findIndex(c => c.t === "Útok celou silou")); }
  assert.ok(!s.pend[ev.bid], "bitva skončila"); assert.ok(!s.events.includes(ev));
  assert.ok(s.battles[0].rounds.length >= 1 && s.battles[0].rounds[0][4] === "utok");
});

test("sestavy mění výsledek bitvy", () => {
  const s = E.newGame({ seed: 8 }); let klin = 0, sik = 0;
  for (let i = 0; i < 40; i++) {
    const side = tac => ({ cl: "premysl", t: { pesi: 1000, strelci: 200, jizda: 400, zoldneri: 0 }, train: 50, morale: 80, cmds: [], def: false, ter: "n", tac });
    const foe = tac => ({ cl: "arpad", t: { pesi: 1600, strelci: 350, jizda: 100, zoldneri: 0 }, train: 50, morale: 80, cmds: [], def: false, ter: "n", tac });
    if (E.battle(s, side("klin"), foe("strelci"), "brno", "bitva").aWins) klin++;
    if (E.battle(s, side("klin"), foe("sik"), "brno", "bitva").aWins) sik++;
  }
  assert.ok(klin > sik + 10, `klín proti střelcům ${klin}× vs. proti šiku ${sik}×`);
});

test("obchodní cesty, Hanza, úřady, tatarský vpád", () => {
  const s = E.newGame({ seed: 9 });
  assert.ok(E.routeIncomeProv(s, s.provs.viden) > 0, "Vídeň leží na Podunajské cestě");
  const before = E.routeState(s, E.ROUTES.find(r => r.id === "dunaj"));
  E.declareWar(s, "premysl", "arpad", null);
  assert.ok(E.routeState(s, E.ROUTES.find(r => r.id === "dunaj")) < before, "válka přeruší cestu");
  s.clans.pomorany.gold = 1000; s.provs.stetin.b.mesto = 1; assert.equal(E.joinHanza(s, "pomorany", "stetin"), null); assert.ok(s.provs.stetin.hanza);
  const c = E.officers(s, "premysl").find(x => x.id !== s.clans.premysl.leader); assert.equal(E.setOffice(s, "premysl", "komori", c.id), null); assert.ok(E.officeVal(s, "premysl", "komori") > 0);
  assert.ok(E.loyBreakdown(s, s.provs.praha).rows.length >= 3); assert.ok(E.offLoyBreakdown(s, c).rows.length >= 3);
  const pop = s.provs.halic.pop; s.events = []; E.mongolRaid(s, ["halic", "lvov"]); assert.ok(s.provs.halic.pop < pop);
  const t = E.newGame({ seed: 9, clan: "krakov" }); t.events = []; E.mongolRaid(t, ["krakov"]); assert.ok(t.events.some(e => e.id === "_tatari"), "hráč dostane volbu");
});

test("sňatek s věnem", () => {
  const s = E.newGame({ seed: 10, clan: "habsburg" }); s.clans.habsburg.rel.wurttemberg = 80; s.clans.wurttemberg.rel.habsburg = 80;
  const kid = Object.values(s.chars).find(c => c.n === "Matylda Habsburská"); kid.by = 1236; kid.st = "fam";
  const envoy = E.officers(s, "habsburg")[0];
  const n0 = E.clanProvs(s, "habsburg").length;
  E.diplomacy(s, "habsburg", envoy, "wurttemberg", "snatek_veno");
  assert.equal(E.clanProvs(s, "habsburg").length, n0 - 1, "kraj odešel jako věno");
  assert.ok(kid.spouse);
});

test("EU: body vlády, stabilita, rozvoj, začlenění, ideje, úkoly", () => {
  const s = E.newGame({ seed: 21 }); const C = s.clans.premysl; s.events = [];
  const mp0 = C.mp.adm; E.endTurn(s); s.events = []; assert.ok(C.mp.adm > mp0, "body přibývají");
  C.mp = { adm: 900, dip: 900, mil: 900 };
  const a0 = s.provs.plzen.agri; assert.equal(E.develop(s, "premysl", "plzen", "adm"), null); assert.equal(s.provs.plzen.agri, a0 + 4);
  const st0 = C.stab; assert.equal(E.raiseStab(s, "premysl"), null); assert.equal(C.stab, st0 + 1);
  assert.equal(E.buyIdea(s, "premysl", "sprava"), null); assert.ok(C.ideas.komora);
  s.provs.plzen.cores = []; assert.ok(E.overext(s, "premysl") > 0); assert.equal(E.startCore(s, "premysl", "plzen"), null);
  for (let i = 0; i < 7; i++) { s.events = []; E.endTurn(s); } assert.ok(s.provs.plzen.cores.includes("premysl"), "kraj začleněn");
  assert.ok(E.missionsFor(s, "premysl").some(m => m.id === "styrsko"));
});

test("EU: záminka, okupace, válečné skóre a mírová smlouva", () => {
  const s = E.newGame({ seed: 22 }); s.events = [];
  assert.equal(E.cbAgainst(s, "premysl", "wittL"), "zadna");
  s.clans.premysl.claims.landshut = s.turn + 100; assert.equal(E.cbAgainst(s, "premysl", "wittL"), "narok");
  const stab = s.clans.premysl.stab; E.declareWar(s, "premysl", "wittL", null); assert.equal(s.clans.premysl.stab, stab, "s nárokem stabilita neklesá");
  const army = { id: "aT", cl: "premysl", t: { pesi: 3000 }, cmds: [], loc: "straubing", path: [], grain: 100, train: 50, morale: 90 };
  s.armies.push(army); E.occupy(s, army, s.provs.straubing);
  assert.equal(s.provs.straubing.occ, "premysl"); assert.equal(s.provs.straubing.owner, "wittL");
  assert.ok(E.warScore(s, "premysl", "wittL") > 0);
  const items = E.peaceItems(s, "premysl", "wittL"); const kraj = items.find(i => i.t === "kraj" && i.pid === "straubing"); assert.ok(kraj);
  E.applyPeace(s, "premysl", "wittL", [kraj]);
  assert.equal(s.provs.straubing.owner, "premysl"); assert.ok(!E.atWar(s, "premysl", "wittL"));
  assert.ok(!s.provs.straubing.cores.includes("premysl"), "nový kraj není začleněn");
});

test("Herní nápady: činy, turnaj, mor a karanténa, velká díla, zakázky", () => {
  const s = E.newGame({ seed: 31 }); const C = s.clans.premysl; s.events = []; C.gold = 20000;
  const pr0 = C.prestige; assert.equal(E.doDeed(s, "objezd"), null); assert.ok(C.prestige > pr0);
  assert.ok(E.doDeed(s, "hostina"), "jen jeden čin za měsíc");
  s.events = []; E.endTurn(s); s.events = [];
  assert.equal(E.doDeed(s, "turnaj"), null); const ev = s.events.find(e => e.id === "_joust");
  if (ev) { for (let i = 0; i < 6 && !ev.done; i++) E.joustPass(s, ev, "stit"); assert.ok(ev.done, "klání skončí"); }
  const p = s.provs.plzen; p.plague = 5; assert.equal(E.quarantine(s, "premysl", "plzen"), null); assert.ok(p.quar > s.turn);
  for (let i = 0; i < 6; i++) E.plagueTick(s); assert.equal(p.plague, 0, "mor ustane"); assert.ok(p.immune > s.turn);
  s.provs.praha.b.klaster = 1; assert.equal(E.startWork(s, "premysl", "katedrala", "praha"), null);
  C.works.katedrala.left = 1; s.events = []; E.endTurn(s); assert.ok(C.works.katedrala.done, "katedrála dostavěna");
  s.contracts = [{ id: "kX", from: "Test", g: "kone", qty: 10, reward: 500, until: s.turn + 5, accepted: false }];
  assert.ok(E.deliverContract(s, "kX")); assert.equal(E.acceptContract(s, "kX"), null);
  C.kone = 50; const g0 = C.gold; assert.equal(E.deliverContract(s, "kX"), null); assert.equal(C.gold, g0 + 500); assert.equal(s.contracts.length, 0);
  assert.equal(E.dispName({ n: "Václav", epi: "Dobrý" }), "Václav Dobrý");
});
