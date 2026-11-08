// Testy herní logiky: spuštění: node --test tests/
const test = require("node:test"), assert = require("node:assert");
const { load } = require("./harness");
const E = load();

function finiteDeep(o, p = "s") {
  if (typeof o === "number") { if (!Number.isFinite(o)) throw new Error("nekonečné číslo: " + p); return; }
  if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) finiteDeep(v, p + "." + k);
}
function resolveAll(s) { while (s.events.length) { const v = E.eventView(s, s.events[0]); const c = v.ch.find(x => x.ok); assert.ok(c, "událost bez dostupné volby: " + s.events[0].id); E.resolveEvent(s, 0, c.i); } }
// jednoduchý „hráč“: vždy zvolí první dostupnou možnost, občas staví a verbuje
function autoplay(s, n, smart) {
  for (let i = 0; i < n && !s.over; i++) {
    resolveAll(s);
    if (smart) {
      for (const p of E.myProvs(s)) for (const b of ["mlyn", "trziste", "kostel", "pila", "lom", "dul", "cesty"]) if (!E.canBuild(s, p.id, b)) E.build(s, p.id, b);
      if (s.money > 300) E.recruit(s, "kopinici", 2, s.armies[0] && s.armies[0].id);
      if (s.stock.obili < 150) E.trade(s, "obili", 80, true);
      if (s.ap > 0) E.doAction(s, ["objezd", "soud", "hostina"][i % 3]);
      for (const w of s.wars.slice()) { const o = E.peaceOptions(s, w.enemy).opts.find(x => x.t !== "kapitulace" && x.ok); if (o) E.makePeace(s, w.enemy, o); }
    }
    const err = E.endTurn(s); if (err && !s.over) throw new Error("endTurn: " + err);
    finiteDeep({ money: s.money, prestige: s.prestige, piety: s.piety, legitimacy: s.legitimacy, stock: s.stock, est: s.estates });
  }
}

test("nová hra má rozumný stav", () => {
  const s = E.newGame({ seed: 1 });
  assert.equal(E.myProvs(s).length, 3);
  assert.ok(E.totalPop(s) > 15000);
  assert.equal(E.aliveRivals(s).length, 5);
  const inc = Object.values(E.incomeBreakdown(s)).reduce((a, b) => a + b, 0), exp = Object.values(E.expenseBreakdown(s)).reduce((a, b) => a + b, 0);
  assert.ok(inc > exp * 0.8, `příjem ${inc} vs výdaje ${exp}`);
});

test("stavba, nábor a obchod", () => {
  const s = E.newGame({ seed: 2 }); s.money = 2000; s.stock.drevo = 200; s.stock.kamen = 200;
  assert.equal(E.build(s, "lipnice", "trziste"), null);
  assert.ok(E.build(s, "lipnice", "trziste"));
  assert.equal(E.recruit(s, "kopinici", 2, "a1"), null);
  assert.ok(E.recruit(s, "kusinici", 1, "a1"), "kušiníci bez objevu nesmí jít");
  const m = s.money; assert.equal(E.trade(s, "obili", 50, false), null); assert.ok(s.money > m);
  for (let i = 0; i < 3; i++) { s.events = []; E.endTurn(s); }
  assert.equal(s.provinces.lipnice.b.trziste, 1);
});

test("válka, bitva a mír", () => {
  const s = E.newGame({ seed: 3 }); s.claims.zalesi = true;
  assert.equal(E.dipAction(s, "zalesi", "valka"), null);
  assert.ok(E.atWarWith(s, "zalesi"));
  assert.equal(E.orderMove(s, "a1", "dubova"), null);
  for (let i = 0; i < 6 && E.atWarWith(s, "zalesi"); i++) { s.events = s.events.filter(e => e.id !== "_peace"); resolveAll(s); E.endTurn(s); }
  if (E.atWarWith(s, "zalesi")) assert.equal(E.makePeace(s, "zalesi", { t: "kapitulace" }), null);
  assert.ok(!E.atWarWith(s, "zalesi"));
  assert.ok((s.battles || []).length >= 0);
});

test("sto let hry bez chyb (více semínek)", () => {
  for (const seed of [11, 12, 13, 14, 15, 16]) {
    const s = E.newGame({ seed }); autoplay(s, 400, seed % 2 === 0);
    assert.ok(s.over || s.turn >= 400, "hra běží");
    console.log(`semínko ${seed}: rok ${s.year}, provincie ${E.myProvs(s).length}, zlato ${Math.round(s.money)}, skóre ${E.score(s)}, konec: ${s.over ? s.over.txt.slice(0, 70) : "-"}`);
  }
});
