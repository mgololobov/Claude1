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
