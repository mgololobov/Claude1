// Testy herní logiky – běží bez prohlížeče: node --test tests/*.test.js
const test = require("node:test"); const assert = require("node:assert");
const { load } = require("./harness");
const A = load();

// Malá hra pro testy: dva nebo tři hráči, mince a body, jeden balíček.
function game(nPlayers = 2, extra = {}) {
  const f = (name, color) => ({ id: name.toLowerCase(), name, color });
  const p = A.normalize({ id: "g", name: "Test", version: "1", players: "2", time: "", age: "", summary: "x", rules: "",
    factions: [f("Anna", "#3f6fb0"), f("Bert", "#b0402c"), f("Cyril", "#2f7a45")].slice(0, nPlayers),
    resources: [{ id: "m", name: "Mince", color: "#c98a12", start: 3, income: 1, max: 10, vp: false, global: false }, { id: "b", name: "Body", color: "#2f7a45", start: 0, income: 0, max: "", vp: true, global: false }],
    decks: [{ id: "d", name: "Karty", color: "#333", back: "K", market: 0, starter: false, cards: [{ id: "c1", title: "Zlato", type: "Poklad", cost: "2", text: "", qty: 6, suit: "", value: "", vp: "1", icon: "", effect: "+1 Body" }] }],
    ...extra });
  const S = A.__S(); S.projects = [p]; S.currentId = p.id;
  const t = A.ensureTable(p);
  return { p, t, res: (fid, rid = "m") => (t.res[fid] || {})[rid] || 0 };
}

test("geometrie: střed pole se vrátí na stejné pole a hexy mají 6 sousedů", () => {
  const b = { type: "hex", size: 30, cols: 8, rows: 6 }; const g = A.geo(b);
  for (const [c, r] of [[0, 0], [3, 2], [7, 5]]) { const [x, y] = g.center(c, r); assert.deepEqual(g.pick(x, y), [c, r]); }
  assert.equal(A.neighbors(b, 3, 2).length, 6);
  assert.equal(A.hexDist(b, "0,0", "3,0"), 3);
  assert.equal(A.hexDist({ ...b, type: "square" }, "0,0", "2,3"), 5);
});

test("efekty: zdroje, hranice 0 a maximum, všichni/ostatní", () => {
  const { p, t, res } = game(3);
  A.runEffects(p, t, "anna", "+20 Mince; -1 Body", "x", 0, { auto: true });
  assert.equal(res("anna"), 10, "maximum 10"); assert.equal(res("anna", "b"), 0, "nikdy pod nulu");
  A.runEffects(p, t, "anna", "všichni +1 Body; ostatní -1 Mince", "x", 0, { auto: true });
  assert.equal(res("bert", "b"), 1); assert.equal(res("bert"), 2); assert.equal(res("anna"), 10);
});

test("efekty: podmínka a platba", () => {
  const { p, t, res } = game();
  A.runEffects(p, t, "anna", "pokud Mince >= 3: +2 Body", "x", 0, { auto: true });
  assert.equal(res("anna", "b"), 2);
  A.runEffects(p, t, "anna", "pokud Mince > 5: +2 Body", "x", 0, { auto: true });
  assert.equal(res("anna", "b"), 2, "podmínka nesplněna");
  A.runEffects(p, t, "anna", "zaplať 2 Mince: +1 Body, líznout 1", "x", 0, { auto: true });
  assert.equal(res("anna"), 1); assert.equal(res("anna", "b"), 3); assert.equal(t.hands.anna.length, 1);
  A.runEffects(p, t, "anna", "zaplať 2 Mince: +5 Body", "x", 0, { auto: true });
  assert.equal(res("anna", "b"), 3, "bez peněz se nic nestane");
});

test("efekty: volba a soupeř – automaticky i čekání na hráče", () => {
  const { p, t, res } = game(3);
  A.runEffects(p, t, "anna", "vyber: +1 Body | +2 Mince", "x", 0, { auto: true, choose: () => 1 });
  assert.equal(res("anna"), 5);
  A.runEffects(p, t, "anna", "vyber: +1 Body | +2 Mince", "Karta");
  assert.equal(t.pending.length, 1); assert.equal(t.pending[0].kind, "choice");
  A.runEffects(p, t, "anna", "soupeř -2 Mince", "Karta");
  assert.equal(t.pending.length, 2, "tři hráči – soupeř se vybírá");
  const two = game(2); A.runEffects(two.p, two.t, "anna", "soupeř -2 Mince", "x");
  assert.equal(two.res("bert"), 1, "při dvou hráčích je soupeř jasný");
});

test("efekty: jednou za kolo a jednou za hru", () => {
  const { p, t, res } = game();
  A.runEffects(p, t, "anna", "jednou za kolo: +1 Body", "Studna", 0, { auto: true });
  A.runEffects(p, t, "anna", "jednou za kolo: +1 Body", "Studna", 0, { auto: true });
  assert.equal(res("anna", "b"), 1, "podruhé ve stejném kole nic");
  t.turn = 2; A.runEffects(p, t, "anna", "jednou za kolo: +1 Body", "Studna", 0, { auto: true });
  assert.equal(res("anna", "b"), 2, "v dalším kole znovu");
  A.runEffects(p, t, "anna", "jednou za hru: +5 Body", "Poklad", 0, { auto: true }); t.turn = 9;
  A.runEffects(p, t, "anna", "jednou za hru: +5 Body", "Poklad", 0, { auto: true });
  assert.equal(res("anna", "b"), 7);
});

test("kontrola zápisu efektů", () => {
  const { p } = game();
  assert.deepEqual(A.checkEffect(p, "jednou za kolo: vyber: +1 Body | zaplať 1 Mince: líznout 2; soupeř -1 Body; pokud kolo >= 3: zpráva Ahoj"), []);
  const bad = A.checkEffect(p, "+2 Kamení; skok 3; pokud Zlato > 1: +1 Body; vyber: +1 Body");
  assert.equal(bad.length, 4, bad.join(" | "));
});

test("hlídání pravidel: vynucovat blokuje, upozorňovat pustí", () => {
  const { p, t } = game();
  p.phases = ["Nákup", "Boj"]; p.ruleset.phaseOf = { boj: [1] }; t.phaseIdx = 0;
  p.ruleset.strict = true; assert.equal(A.gate(p, t, "boj"), false);
  p.ruleset.strict = false; assert.equal(A.gate(p, t, "boj"), true);
  t.phaseIdx = 1; p.ruleset.strict = true; assert.equal(A.gate(p, t, "boj"), true);
  p.ruleset.actionsPerTurn = 1; p.ruleset.actCats = ["nakup"]; t.acts = 1; assert.equal(A.gate(p, t, "nakup"), false);
});

test("dílky: navazující hrany a sousedství", () => {
  const { p, t } = game(2, { tiles: [{ id: "a", name: "A", color: "#ccc", edges: "C,L,C,L", icon: "", qty: 2 }] });
  const b = { type: "square", size: 30, cols: 5, rows: 5 };
  t.tilesPlaced = { "2,2": { id: "a", rot: 0 } };
  assert.deepEqual(A.tileCheck(p, t, b, "2,1", "a", 0), [], "cesta na cestu");
  assert.equal(A.tileCheck(p, t, b, "2,1", "a", 1).length, 1, "otočený nesedí");
  assert.equal(A.tileCheck(p, t, b, "0,0", "a", 0).length, 1, "nesousedí");
});

test("trasy a cíle se započítají do skóre", () => {
  const board = { id: "bd", name: "M", type: "square", cols: 4, rows: 1, size: 30, terrain: {}, labels: { "0,0": "A", "3,0": "B" }, regions: {}, numbers: {} };
  const { p, t } = game(2, { boards: [board], routes: { cost: "", price: 1, exclusive: true, tickets: [{ id: "x", a: "A", b: "B", pts: 7, fid: "" }] } });
  t.boardId = "bd";
  t.links = [{ a: "0,0", b: "1,0", fid: "anna" }, { a: "1,0", b: "2,0", fid: "anna" }];
  assert.equal(A.routeConnected(p, t, "anna", "A", "B"), false);
  t.links.push({ a: "2,0", b: "3,0", fid: "anna" });
  assert.equal(A.routeConnected(p, t, "anna", "A", "B"), true);
  assert.equal(A.scoreOf(p, t, "anna").tickets, 7);
});

test("bodování sad z vyložených karet", () => {
  const { p, t } = game(2, { scoring: { field: "type", table: "1,3,6", trick: 0 } });
  t.tableau.anna = [{ deckId: "d", cardId: "c1" }, { deckId: "d", cardId: "c1" }];
  const s = A.scoreOf(p, t, "anna"); assert.equal(s.cardVp, 2); assert.equal(s.sets, 3); assert.equal(s.total, 5);
});

test("bojová tabulka: poměr se zaokrouhlí ve prospěch obránce", () => {
  const cols = ["1:2", "1:1", "2:1", "3:1"];
  assert.equal(A.crtColumn(5, 2, cols), 2); assert.equal(A.crtColumn(3, 4, cols), 0); assert.equal(A.ratioText(7, 3), "2:1");
});

test("obnova poškozených pravidel z verze 4", () => {
  const v4 = { id: "x", name: "T", decks: [], rules: Object.assign(A.defaultRules(), "Tah: hoď kostkou.") }; v4.rules.handLimit = 5;
  const p = A.normalize(v4); assert.equal(p.rules, "Tah: hoď kostkou."); assert.equal(p.ruleset.handLimit, 5);
});

test("všechny ukázkové hry projdou kontrolou návrhu bez chyb", () => {
  for (const make of [A.exampleWar, A.exampleTrade, A.exampleAlchemy, A.exampleTricks, A.exampleTiles, A.exampleRace, A.exampleIsland, A.exampleCrypt, A.examplePatrol, A.exampleHansa, A.exampleTower, A.exampleMages, A.exampleRail]) {
    const p = make(); const errs = A.lintProject(p).filter(x => x.lv === "err");
    assert.deepEqual(errs.map(e => e.t), [], p.name);
  }
});

test("ikony zdrojů a šablony karet", () => {
  const { p } = game();
  p.resources[0].icon = "🪙";
  assert.match(A.richText("Získej 2 {Mince} a {Neznámé}"), /class="ri".*🪙.*\{Neznámé\}/);
  for (const tpl of ["classic", "art", "full", "play", "min"]) assert.match(A.cardHTML({ title: "X", text: "y", icon: "★", value: "7", suit: "♥" }, { color: "#333", template: tpl }), new RegExp(`t-${tpl}`));
});

test("simulace odehraje ukázkové hry a vrátí statistiky", () => {
  for (const make of [A.exampleTrade, A.exampleAlchemy, A.exampleRace, A.exampleIsland]) {
    const p = make(); const S = A.__S(); S.projects = [p]; S.currentId = p.id;
    const games = Array.from({ length: 25 }, () => A.simGame(p, { rounds: 15, policy: "greedy", actions: 2 }));
    const r = A.summarizeSim(p, games);
    assert.equal(r.n, 25, p.name); assert.ok(r.avgRounds >= 1, p.name);
    assert.ok(Math.abs(r.seat.reduce((a, s) => a + s.wr, 0) - 1) < 1e-9, `${p.name}: součet výher = 1`);
  }
  const race = A.exampleRace(); const S = A.__S(); S.projects = [race]; S.currentId = race.id;
  const g = A.simGame(race, { rounds: 40, policy: "random", actions: 1 });
  assert.match(g.reason, /cíl|kol/);
});

// Malá válka: dvě strany na čtvercové mapě 6 × 1.
function war() {
  const board = { id: "bd", name: "M", type: "square", cols: 6, rows: 1, size: 30, terrain: {}, labels: {}, regions: {}, numbers: {} };
  const units = [{ id: "a", name: "Útok", factionId: "anna", att: 6, def: 4, mov: 2, rAtt: 3, rDef: 2, rMov: 2 }, { id: "d", name: "Obrana", factionId: "bert", att: 2, def: 2, mov: 2, rAtt: 1, rDef: 1, rMov: 1 }];
  const g = game(2, { boards: [board], units }); g.t.boardId = "bd";
  const put = (unitId, c) => { const it = { uid: unitId + c, kind: "unit", unitId, x: 0, y: 0, reduced: false, rot: 0 }; g.t.items.push(it); A.placeOn(g.p, g.t, it, c + ",0"); return it; };
  return { ...g, put };
}
test("boj na mapě: ústup, ztráta kroku a zničení", () => {
  const { p, t, put } = war(); p.ruleset.win.elimination = true; const a = put("a", 1), d = put("d", 2); const S = A.__S();
  S.combat = { attUids: [a.uid], defUid: d.uid, log: [] };
  A.applyCombat(p, t, "DR"); assert.equal(A.cellUnder(p, d), "3,0", "obránce ustoupil od útočníka");
  S.combat = { attUids: [a.uid], defUid: d.uid, log: [] }; A.applyCombat(p, t, "EX");
  assert.equal(a.reduced, true, "útočník ztratil krok"); assert.ok(d.reduced, "obránce ztratil krok");
  S.combat = { attUids: [a.uid], defUid: d.uid, log: [] }; A.applyCombat(p, t, "DE");
  assert.ok(!t.items.includes(d), "obránce zničen"); assert.equal(t.winner && t.winner.fid, "anna", "vyhrává poslední strana s jednotkami");
});
test("zásobování: daleko od velitelství je jednotka bez zásob", () => {
  const { p, t, put } = war(); p.ruleset.supply = true; p.ruleset.supplyRange = 2; p.units[0].hq = false;
  p.units.push({ id: "hq", name: "Štáb", factionId: "anna", att: 0, def: 1, mov: 1, hq: true }); put("hq", 0);
  const near = put("a", 2), far = put("a", 5); const S = A.__S(); S.supCache = {};
  assert.equal(A.inSupply(p, t, near), true); assert.equal(A.inSupply(p, t, far), false);
});
test("skrytý pohyb: soupeř skryté jednotky nevidí", () => {
  const { p, t, put } = war(); p.factions[1].hidden = true; const d = put("d", 4); const S = A.__S();
  S.view = "anna"; assert.ok(A.fogHidden(p, t).has(d.uid + ":gone"));
  S.view = "bert"; assert.equal(A.fogHidden(p, t), null); S.view = "";
  p.hiddenReveal = "1"; t.turn = 1; A.hiddenMove(p, t, d, "4,0"); assert.equal(t.lastSeen[d.uid], "4,0"); assert.equal(t.secret.bert.length, 1);
});
test("dělené ukládání: návrh, stůl, testy, verze a obrázky se složí zpět", () => {
  const { p } = game(); p.decks[0].cards[0].img = "data:image/png;base64," + "A".repeat(300000); p.versions = [{ id: "v1", ver: "1", snap: {} }]; p.sessions = [{ id: "s" }];
  const parts = A.splitProject(p); assert.ok(Object.keys(parts).some(k => k.startsWith("img-"))); assert.ok(Object.values(parts).every(v => JSON.stringify(v).length < 256000 || v.items));
  const docs = JSON.parse(JSON.stringify(parts)); const q = A.joinProject(docs);
  assert.equal(q.decks[0].cards[0].img.length, p.decks[0].cards[0].img.length); assert.equal(q.versions.length, 1); assert.equal(q.sessions.length, 1);
  const on = A.onlineParts({ ...p, online: { seat: "anna" } }); assert.equal(on.design.online, undefined, "online hra neprozradí, za koho kdo hraje"); assert.equal(on.tests, undefined);
});
test("verze a příručka", () => {
  const { p } = game(); const a = A.designSnapshot(p); p.decks[0].cards[0].cost = "5"; p.resources.push({ id: "z", name: "Zlato", start: 0 });
  const d = A.diffDesign(a, A.designSnapshot(p)); assert.ok(d.some(x => x.kind === "+" && /Zlato/.test(x.text))); assert.ok(d.some(x => x.kind === "~"));
  assert.match(A.describeEffect("+2 Mince; líznout 1"), /2/); const book = A.buildRulebook(p); assert.match(book.md, /Test/); assert.match(book.html, /<h1/);
});
test("ladění parametrů a kolo rozhodnutí", () => {
  const p = A.exampleTrade(); const S = A.__S(); S.projects = [p]; S.currentId = p.id;
  A.setParam(p, "win.vp", 12); assert.equal(A.getParam(p, "win.vp"), 12);
  const r = p.resources[0]; A.setParam(p, `res.${r.id}.start`, 7); assert.equal(r.start, 7);
  assert.equal(A.decidedRound({ hist: [[1, 0], [1, 2], [3, 2], [4, 2]], share: [1, 0] }), 3);
  const g = A.simGame(p, { rounds: 10, policy: "lookahead", actions: 2 }); assert.ok(g.hist.length >= 1);
  const w = A.exampleWar(); S.projects = [w]; S.currentId = w.id; const wg = A.simGame(w, { rounds: 8, policy: "greedy", actions: 1 }); assert.ok(wg.rounds >= 1);
});
test("první hráč a dohrání kola", () => {
  const { p, t } = game(3); A.runEffects(p, t, "cyril", "první hráč", "Radnice", 0, { auto: true });
  A.newRound(p, t); assert.equal(A.curPlayer(p, t).id, "cyril", "Cyril začíná další kolo");
  p.ruleset.win.vp = 3; p.ruleset.win.finishRound = true; t.res.anna.b = 3; A.checkWin(p, t);
  assert.ok(!t.winner && t.lastRound, "s dohráním kola se ještě nevyhrává");
  t.res.bert.b = 3; A.newRound(p, t); assert.ok(t.winner.tie && t.winner.tie.length === 2, "shoda bodů je remíza");
});
test("simulace štychů a dražby z trhu", () => {
  const p = A.exampleTricks(); const S = A.__S(); S.projects = [p]; S.currentId = p.id;
  const g = A.simGame(p, { rounds: 2, policy: "greedy", actions: 1 }); assert.ok(g.seats.some(s => s.score > 0), "někdo vzal štych");
  const q = A.exampleTrade(); q.marketAuction = true; S.projects = [q]; S.currentId = q.id;
  const gs = Array.from({ length: 10 }, () => A.simGame(q, { rounds: 10, policy: "greedy", actions: 2 })); assert.ok(gs.some(x => x.seats.some(s => s.played.length)));
});
test("online: mimo svůj tah nejde měnit stůl", () => {
  const { p, t } = game(); const S = A.__S(); p.online = { code: "X", host: false, seat: "bert" }; t.turnLock = true; t.curF = 0;
  S.undoBase = JSON.stringify(t); assert.equal(A.onlineBlocked(p), true);
  p.online.seat = "anna"; assert.equal(A.onlineBlocked(p), false);
  t.turnLock = false; p.online.seat = "bert"; S.undoBase = JSON.stringify(t); assert.equal(A.onlineBlocked(p), false);
});
test("kostky: zápis hodu, procentová kostka a rozdělení součtu", () => {
  assert.deepEqual(A.parseDice("2k6 + k8 + 3"), { dice: [6, 6, 8], custom: [], mod: 3 });
  assert.deepEqual(A.parseDice("k%"), { dice: [100], custom: [], mod: 0 });
  assert.deepEqual(A.parseDice("3d12-1"), { dice: [12, 12, 12], custom: [], mod: -1 });
  const cd = [{ id: "o", name: "Kostka osudu", faces: ["★", "2"] }, { id: "n", name: "Číselná", faces: ["1", "-1", "3"] }];
  assert.deepEqual(A.parseDice("2k6 + 2× Kostka osudu", cd), { dice: [6, 6], custom: ["o", "o"], mod: 0 });
  assert.deepEqual(A.parseDice("číselná+1", cd), { dice: [], custom: ["n"], mod: 1 }); assert.equal(A.parseDice("2× Neznámá", cd), null);
  const mix = A.poolSummary([{ type: "std", s: 6, v: 4 }, { type: "c", id: "n", v: 2 }, { type: "c", id: "n", v: 1 }, { type: "c", id: "o", v: 0 }], 0, cd);
  assert.equal(mix.expr, "k6 + 2× Číselná + Kostka osudu"); assert.equal(mix.sum, 6, "4 + 3 − 1, hvězdička se nepočítá"); assert.equal(mix.nums, 3);
  assert.equal(A.parseDice("2x6"), null); assert.equal(A.parseDice("k1"), null);
  const d = A.diceDistribution([6, 6]); assert.ok(Math.abs(d[7] - 6 / 36) < 1e-12); assert.ok(Math.abs(d.reduce((a, b) => a + b, 0) - 1) < 1e-12);
  const s = A.poolSummary([{ type: "std", s: 6, v: 3 }, { type: "std", s: 6, v: 4 }, { type: "std", s: 100, v: 55 }], 2);
  assert.equal(s.expr, "2k6 + k% + 2"); assert.equal(s.sum, 64);
});

test("technologie: předpoklady, cena, efekt a body", () => {
  const { p, t, res } = game(2, { techs: [{ id: "k", name: "Kolo", cost: "2 Mince", req: "", effect: "+1 Body", vp: 2 }, { id: "v", name: "Vůz", cost: "1 Mince", req: "Kolo", effect: "", vp: 3 }] });
  assert.equal(A.techState(p, t, "anna", p.techs[1]), "locked");
  assert.ok(A.buyTech(p, t, "anna", p.techs[0])); assert.equal(res("anna"), 1); assert.equal(res("anna", "b"), 1);
  assert.equal(A.techState(p, t, "anna", p.techs[1]), "buy"); assert.equal(A.scoreOf(p, t, "anna").goals, 2);
});
test("veřejné cíle: nejvíc, za každých N a podmínka", () => {
  const { p, t } = game(2, { goals: [{ id: "a", kind: "most", what: "Mince", pts: 5 }, { id: "b", kind: "each", what: "Mince", n: 2, pts: 1 }, { id: "c", kind: "cond", what: "Mince >= 4", pts: 3 }] });
  t.res.anna.m = 5; t.res.bert.m = 2;
  assert.equal(A.goalsScore(p, t, "anna"), 5 + 2 + 3); assert.equal(A.goalsScore(p, t, "bert"), 1);
  t.res.bert.m = 5; assert.equal(A.goalPoints(p, t, "bert", p.goals[0]), 5, "při shodě získají body oba");
});
test("posily přijdou v daném kole na zadané pole", () => {
  const { p, t, put } = war(); void put; p.scenarios = [A.normalize({ ...p, scenarios: [{ id: "s", name: "S", turns: 5, reinf: [{ id: "r", turn: 2, qty: 2, unitId: "a", cell: "0501" }] }] }).scenarios[0]];
  t.scenarioId = "s"; const before = t.items.length; A.newRound(p, t);
  assert.equal(t.turn, 2); assert.equal(t.items.length, before + 2); assert.equal(A.cellUnder(p, t.items[t.items.length - 1]), "4,0");
});
test("stav jednotek a posun sloupce za terén", () => {
  const { p, t, put } = war(); const a = put("a", 1), d = put("d", 2); p.terrains[0].shift = -1;
  assert.equal(A.unitAttack(p, t, a), 6); a.st = { dis: true }; assert.equal(A.unitAttack(p, t, a), 3);
  assert.equal(A.defShift(p, t, d), -1, "terén s posunem −1 pomáhá obránci"); d.st = { dug: true }; assert.equal(A.defShift(p, t, d), -2, "zakopaný obránce o další sloupec");
});
test("aktivace tažením žetonů", () => {
  const { p, t } = game(2, { chits: "1. divize; Bert\nJízda; Anna" });
  const c = A.drawChit(p, t); assert.ok(c); assert.equal(A.curPlayer(p, t).id, c.fid);
  A.drawChit(p, t); assert.equal(A.drawChit(p, t), null, "kalíšek je prázdný"); A.newRound(p, t); assert.equal(t.chitsOut.length, 0);
});
test("karetní hry: hromádka, riskování, sázky a sestavy", () => {
  const cards = [["r5", "♥", 5], ["r6", "♥", 6], ["r7", "♥", 7], ["s5", "♠", 5], ["k5", "♣", 5]].map(([id, suit, value]) => ({ id, title: id, suit, value, qty: 1, type: "", cost: "", text: "", vp: "", icon: "", effect: "" }));
  const { p, t } = game(2, { decks: [{ id: "d", name: "K", color: "#333", back: "K", market: 0, cards }] });
  const h = id => ({ deckId: "d", cardId: id });
  t.shed = { pile: [h("r5")] }; assert.ok(A.shedOk(p, t, h("r6")), "stejná barva"); assert.ok(A.shedOk(p, t, h("s5")), "stejná hodnota"); t.shed.pile.push(h("s5")); assert.ok(!A.shedOk(p, t, h("r6")));
  assert.equal(A.meldKind(p, [h("r5"), h("r6"), h("r7")]), "postupka"); assert.equal(A.meldKind(p, [h("r5"), h("s5"), h("k5")]), "trojice"); assert.equal(A.meldKind(p, [h("r5"), h("r7"), h("s5")]), null);
  p.push = { deckId: "d", mode: "dup", limit: 21 }; t.push = { fid: "anna", row: [h("r5"), h("r6")] }; assert.equal(A.pushBust(p, t), false); t.push.row.push(h("s5")); assert.equal(A.pushBust(p, t), true, "pětka podruhé");
  p.push.mode = "sum"; p.push.limit = 15; t.push.row = [h("r5"), h("r6")]; assert.equal(A.pushPoints(p, t), 11); A.pushStop(p, t, "anna"); assert.equal(t.res.anna.b, 11);
  p.trickBid = { on: true, hit: 10, per: 2, miss: 2 }; t.won = { anna: 2, bert: 1 }; t.bids = { anna: 2, bert: 3 }; A.scoreBids(p, t); assert.equal(t.res.anna.b, 11 + 14); assert.equal(t.res.bert.b, 0, "−4 nejde pod nulu");
});
test("simulace kupuje technologie", () => {
  const p = A.exampleTrade(); p.techs = [{ id: "x", name: "Sklady", cost: "3 Mince", req: "", effect: "", vp: 4 }]; const S = A.__S(); S.projects = [p]; S.currentId = p.id;
  const gs = Array.from({ length: 10 }, () => A.simGame(p, { rounds: 10, policy: "greedy", actions: 2 })); assert.ok(gs.some(g => g.seats.some(s => s.played.includes("Sklady"))));
});

test("dungeon crawler: útok, životy, zkušenosti a automat příšer", () => {
  const { p, t, put } = war(); p.dice = { sides: 6, aHit: 1, dHit: 7 }; // vždy zásah, nikdy blok
  Object.assign(p.units[0], { kind: "hero", hp: 5 }); Object.assign(p.units[1], { kind: "monster", hp: 3, xp: 3, att: 2, def: 1 }); p.crawl.levelXp = 3;
  const h = put("a", 0), m = put("d", 3);
  A.monsterTurn(p, t); assert.equal(A.cellUnder(p, m), "1,0", "příšera přišla k hrdinovi"); assert.equal(A.unitHp(p, h), 3, "a zaútočila za 2");
  A.crawlAttack(p, t, h, m); assert.ok(!t.items.includes(m), "6 zásahů zabije příšeru"); assert.equal(h.xp, 3); assert.equal(A.crawlLevel(p, h), 2); assert.equal(A.unitMaxHp(p, h), 6);
  h.st = { poison: true }; A.newRound(p, t); assert.equal(A.unitHp(p, h), 3, "otrava ubrala 1 (max vzrostl na 6, zranění 3)");
});
test("dungeon crawler: místnosti se odhalí vstupem hrdiny", () => {
  const { p, t, put } = war(); p.crawl.rooms = true; p.boards[0].regions = { "3,0": "Krypta", "4,0": "Krypta" }; Object.assign(p.units[0], { kind: "hero", hp: 3 });
  assert.equal(A.crawlDarkSet(p, t).size, 2); const h = put("a", 3); A.crawlOnMove(p, t, h, "3,0"); assert.equal(A.crawlDarkSet(p, t).size, 0); assert.deepEqual(t.revealed, ["Krypta"]);
});
test("kameny: řada, gravitace, sevření, otáčení a propojení", () => {
  const board = { id: "bd", name: "M", type: "square", cols: 7, rows: 6, size: 30, terrain: {}, labels: {}, regions: {}, numbers: {} };
  const { p, t } = game(2, { boards: [board] }); t.boardId = "bd";
  p.stones = { on: true, win: "row", rowN: 4, capture: "", gravity: true };
  for (let i = 0; i < 3; i++) { A.placeStone(p, t, "0,0", "anna"); A.placeStone(p, t, "1,0", "bert"); }
  assert.equal(t.stones["0,3"], "anna", "gravitace skládá kameny odspodu"); A.placeStone(p, t, "0,0", "anna"); assert.equal(t.winner.fid, "anna", "čtyři v řadě");
  t.winner = null; t.stones = { "1,1": "bert" }; p.stones = { on: true, win: "", capture: "sandwich", gravity: false };
  A.placeStone(p, t, "0,1", "anna"); A.placeStone(p, t, "2,1", "anna"); assert.equal(t.stones["1,1"], undefined, "sevřený kámen se bere");
  t.stones = { "2,2": "anna", "3,3": "anna", "2,3": "bert", "3,2": "bert" }; p.stones.capture = "flip";
  const r = A.placeStone(p, t, "1,3", "anna"); assert.equal(r.flips, 1); assert.equal(t.stones["2,3"], "anna");
  assert.ok(A.placeStone(p, t, "6,5", "bert").err, "tah bez otočení není povolen");
  t.stones = {}; p.stones = { on: true, win: "connect", capture: "", gravity: false }; for (let c = 0; c < 7; c++) A.placeStone(p, t, c + ",2", "anna"); assert.match(t.winner.why, /levý a pravý/);
});
test("lámání kódu: černé a bílé kolíky", () => {
  assert.deepEqual(A.scoreGuess(["a", "b", "c", "d"], ["a", "c", "b", "x"]), { black: 1, white: 2 });
  assert.deepEqual(A.scoreGuess(["a", "a", "b", "b"], ["a", "b", "a", "a"]), { black: 1, white: 2 });
  const p = A.normalize({ id: "x", name: "K", decks: [], code: { len: 5, symbols: "1,2,3", dup: true } }); assert.equal(A.newCode(p).length, 5);
});

test("mapa z karet: řada, pohyb za akce, odhalení, nepřátelé a cíl", () => {
  const p = A.examplePatrol(); const S = A.__S(); S.projects = [p]; S.currentId = p.id; const t = A.ensureTable(p);
  const sg = p.units[0]; const h = { uid: "h", kind: "unit", unitId: sg.id, x: 0, y: 0, reduced: false, rot: 0 }; t.items.push(h);
  assert.equal(A.buildCmap(p, t), ""); assert.equal(t.cmap.cards.length, 6); assert.equal(A.cmapCard(p, t, 5).title, "Radiostanice", "cíl je poslední");
  assert.equal(A.cmapIndexOf(p, t, h), 0, "voják stojí na startu");
  const box = A.cmapBox(p, 1); h.x = box.x + 20; h.y = box.y + 80; const cost = parseInt(A.cmapCard(p, t, 1).move, 10) || 1;
  assert.ok(A.cmapMove(p, t, h, 0)); assert.equal(t.res[sg.factionId].akce, 3 - cost); assert.ok(t.cmap.cards[1].rev);
  const spawned = t.items.filter(i => A.isMonster(p, i)).length; assert.equal(spawned, +A.cmapCard(p, t, 1).spawn || 0);
  const far = A.cmapBox(p, 4); h.x = far.x + 20; h.y = far.y + 80; p.ruleset.strict = true; assert.equal(A.cmapMove(p, t, h, 1), false, "nesousední karta");
  t.res[sg.factionId].akce = 9; const end = A.cmapBox(p, 5); h.x = end.x + 20; h.y = end.y + 80; p.ruleset.strict = false; A.cmapMove(p, t, h, 4); assert.match(t.winner.why, /Radiostanice/);
});
test("mapa z karet: mřížka a vzdálenosti", () => {
  const p = A.examplePatrol(); p.cmap.layout = "grid"; p.cmap.cols = 3; p.cmap.rows = 2;
  assert.deepEqual(A.cmapCell(p, 4), [1, 1]); assert.equal(A.cmapDist(p, 0, 4), 2); p.cmap.diag = true; assert.equal(A.cmapDist(p, 0, 4), 1);
  p.cmap.layout = "row"; p.cmap.perRow = 3; assert.deepEqual(A.cmapCell(p, 3), [2, 1], "řada se láme hadovitě"); assert.equal(A.cmapDist(p, 2, 3), 1);
  const S = A.__S(); S.projects = [p]; S.currentId = p.id; const t = A.ensureTable(p); p.cmap.layout = "grid"; assert.equal(A.buildCmap(p, t), ""); assert.equal(t.cmap.cards.length, 6);
});
test("vyčerpání karet, příjem z vyložených karet a rozsévání", () => {
  const { p, t, res } = game(); p.decks[0].cards[0].income = "+1 Mince"; p.decks[0].cards[0].act = "+2 Mince";
  t.tableau.anna = [{ deckId: "d", cardId: "c1" }]; A.newRound(p, t); assert.equal(res("anna"), 3 + 1, "příjem z vyložené karty");
  assert.ok(A.useCard(p, t, "anna", 0)); assert.equal(res("anna"), 6); assert.equal(A.useCard(p, t, "anna", 0), false, "vyčerpanou nejde použít"); A.newRound(p, t); assert.ok(!t.tableau.anna[0].ex);
  p.mancala = { on: true, pits: 6, seeds: 4, capture: true, extra: true }; A.mancalaInit(p, t);
  const r = A.mancalaSow(p, t, 0, 2); assert.equal(r.again, true, "4 semínka z 3. jamky končí ve skladu"); assert.equal(t.mancala.store[0], 1);
  assert.equal(t.mancala.pits.reduce((a, b) => a + b, 0) + t.mancala.store[0] + t.mancala.store[1], 48, "semínka se neztrácí");
});

test("síť míst: pohyb po cestách, ceny, vlastnictví a body", () => {
  const p = A.exampleHansa(); const S = A.__S(); S.projects = [p]; S.currentId = p.id; const sc = p.scenarios[0];
  p.table = null; const t = A.ensureTable(p); t.netId = sc.netId; t.items = JSON.parse(JSON.stringify(sc.setup.items)); const net = A.tableNet(p);
  const ship = t.items[0]; const [lub, ham, bre, ber, sto] = net.nodes; assert.equal(A.netNodeOf(p, t, ship), lub.id);
  assert.deepEqual(A.netNeighbors(net, lub.id).map(x => x.id).sort(), [ham.id, sto.id, net.nodes[5].id].sort());
  assert.equal(A.netCosts(net, lub.id)[ber.id], 3, "Lübeck → Hamburk → Bergen = 1 + 2");
  A.netPlace(p, t, ship, bre.id); assert.ok(A.netMove(p, t, ship, lub.id), "Brémy za 2");
  t.moved = {}; p.ruleset.strict = true; A.netPlace(p, t, ship, net.nodes[6].id); assert.equal(A.netMove(p, t, ship, bre.id), false, "Brémy → Riga stojí 4, loď má pohyb 3");
  void sto;
  t.control = { [lub.id]: p.factions[0].id }; assert.equal(A.netVp(p, t, p.factions[0].id), 1); assert.equal(A.scoreOf(p, t, p.factions[0].id).goals, 1);
});
test("síť míst: kostičky a ohniska se šíří řetězem", () => {
  const p = A.exampleHansa(); p.netCubes = { on: true, max: 2, rate: 1, name: "Mor", color: "#c00" }; const S = A.__S(); S.projects = [p]; S.currentId = p.id;
  p.table = null; const t = A.ensureTable(p); t.netId = p.nets[0].id; const net = A.tableNet(p); const [lub, ham] = net.nodes;
  t.cubes = { [lub.id]: 2, [ham.id]: 2 }; A.addCubes(p, t, lub.id, 1);
  assert.equal(t.outbreaks, 2, "Lübeck vybuchne a strhne Hamburk"); assert.equal(t.cubes[lub.id], 2, "ohnisko se do stejného místa nevrací"); assert.equal(t.cubes[net.nodes[2].id], 1, "Brémy od Hamburku");
});
test("rozvoz zboží: zakázka, naložení, kapacita a doručení", () => {
  const p = A.exampleHansa(); p.contracts = [{ id: "c1", good: "Sůl", from: "Lübeck", to: "Hamburk", reward: "+3 Zlato", qty: 1 }, { id: "c2", good: "Ryby", from: "Lübeck", to: "Brémy", reward: "+2 Zlato", qty: 1 }]; p.deliver.open = 2;
  const S = A.__S(); S.projects = [p]; S.currentId = p.id; p.table = null; const t = A.ensureTable(p); t.netId = p.nets[0].id; t.items = JSON.parse(JSON.stringify(p.scenarios[0].setup.items));
  const ship = t.items[0]; const net = A.tableNet(p); A.dlStart(p, t);
  assert.equal(t.dl.open.length, 2); assert.equal(t.goods["Lübeck"].length, 2); assert.equal(A.locName(p, t, ship), "Lübeck");
  assert.ok(A.loadGood(p, t, ship, "Sůl")); assert.equal(A.deliverables(p, t, ship).length, 0, "v Lübecku se sůl nedoručuje");
  A.netPlace(p, t, ship, net.nodes[1].id); assert.equal(A.deliverables(p, t, ship).length, 1);
  assert.ok(A.deliverGood(p, t, ship, "c1")); assert.equal(t.res[p.factions[0].id].zlato, 3); assert.equal(ship.cargo.length, 0); assert.equal(t.dl.done, 1);
});

test("Ascension: runy propadají, příšera z řady, zásoba cti a konec hry", () => {
  const p = A.exampleTower(); const S = A.__S(); S.projects = [p]; S.currentId = p.id; const t = A.ensureTable(p); const f = p.factions[0].id;
  A.runEffects(p, t, f, "+3 Runy; +2 Síla", "x", 0, { auto: true }); A.cbEndTurn(p, t, f); assert.equal(t.res[f].runy, 0); assert.equal(t.res[f].sila, 0);
  const d = p.decks[1]; const sk = d.cards.find(c => c.title === "Skřet"); t.market[d.id][0] = sk.id; t.res[f].sila = 1;
  assert.match(A.fightMarket(p, t, f, d.id, 0), /potřebuje 2/); t.res[f].sila = 2; assert.equal(A.fightMarket(p, t, f, d.id, 0), "ok");
  assert.equal(t.res[f].cest, 1); assert.equal(t.res._g.zasoba, 29, "čest se bere ze zásoby"); assert.ok(t.discard[d.id].includes(sk.id));
  A.runEffects(p, t, f, "+40 Čest", "x", 0, { auto: true }); assert.equal(t.res._g.zasoba, 0); assert.ok(t.lastRound, "prázdná zásoba spustí poslední kolo");
  A.newRound(p, t); assert.equal(t.winner.fid, f);
});
test("vyhoštění karty z ruky (automaticky nejslabší)", () => {
  const { p, t } = game(); t.hands.anna = [{ deckId: "d", cardId: "c1" }, { deckId: "d", cardId: "c1" }];
  A.runEffects(p, t, "anna", "vyhostit 1", "x", 0, { auto: true }); assert.equal(t.hands.anna.length, 1); assert.equal(t.banished.length, 1);
  assert.deepEqual(A.checkEffect(p, "vyhostit 1"), []);
});
test("Magic: blokování, první úder, letec, pošlapání a životy", () => {
  const p = A.exampleMages(); const S = A.__S(); S.projects = [p]; S.currentId = p.id; const t = A.ensureTable(p); const [a, b] = p.factions.map(f => f.id); const d = p.decks[0];
  const card = n => ({ deckId: d.id, cardId: d.cards.find(c => c.title === n).id, own: true });
  t.tableau[a] = [card("Vlk"), card("Sokol"), card("Obr"), card("Rytíř")]; t.tableau[b] = [card("Medvěd"), card("Vlk"), card("Lučištnice")];
  assert.equal(A.canBlock(d.cards.find(c => c.title === "Sokol"), d.cards.find(c => c.title === "Medvěd")), false, "medvěd nechytí letce");
  assert.equal(A.canBlock(d.cards.find(c => c.title === "Sokol"), d.cards.find(c => c.title === "Lučištnice")), true);
  // Vlk ← Medvěd (vlk umře), Obr 5 ← Vlk 2 (pošlapání 3 do hráče), Rytíř 2/1 první úder ← Lučištnice 1/3 (přežije a rytíře zabije), Sokol neblokován (1)
  const r = A.resolveFight(p, t, a, b, [0, 1, 2, 3], { 0: 0, 2: 1, 3: 2 });
  assert.equal(r.toPlayer, 4, "sokol 1 + pošlapání 3"); assert.equal(t.res[b].zivoty, 16);
  assert.deepEqual(t.tableau[a].map(h => A.cardOf(p, h).c.title), ["Sokol", "Obr"], "útočný vlk i rytíř umřeli");
  assert.deepEqual(t.tableau[b].map(h => A.cardOf(p, h).c.title), ["Medvěd", "Lučištnice"], "bránící vlk umřel");
  assert.ok(t.tableau[a].every(h => h.ex), "útočníci se vyčerpali");
  t.res[b].zivoty = 0; A.checkWin(p, t); assert.equal(t.winner.fid, a);
});
test("Magic: jedna země za tah a nemoc z vyvolání", () => {
  const p = A.exampleMages(); const S = A.__S(); S.projects = [p]; S.currentId = p.id; const t = A.ensureTable(p); const a = p.factions[0].id; const d = p.decks[0];
  const les = d.cards.find(c => c.title === "Les"), vlk = d.cards.find(c => c.title === "Vlk"); p.ruleset.strict = true;
  assert.deepEqual(A.cbPlayCheck(p, t, a, les, "vylozit"), []); const h = { deckId: d.id, cardId: vlk.id }; A.cbPlayDone(p, t, a, { deckId: d.id, cardId: les.id }, les, "vylozit"); A.cbPlayDone(p, t, a, h, vlk, "vylozit");
  assert.equal(A.cbPlayCheck(p, t, a, les, "vylozit").length, 1); assert.ok(h.sick); A.cbEndTurn(p, t, a); A.cbStartTurn(p, t, a); t.tableau[a] = [h]; A.cbStartTurn(p, t, a); assert.ok(!h.sick); assert.equal(A.cbPlayCheck(p, t, a, les, "vylozit").length, 0);
});
test("18xx: založení, akcie, prezident, vlaky, rezivění, dividendy a hodnota", () => {
  const p = A.exampleRail(); const S = A.__S(); S.projects = [p]; S.currentId = p.id; p.table = null; const t = A.ensureTable(p); t.netId = p.nets[0].id; A.railInit(p, t);
  const [x, y] = p.factions.map(f => f.id); const co = p.rail.companies[0].id; const s = t.rail.co[co];
  assert.equal(A.startCompany(p, t, x, co, 100), ""); assert.equal(t.res[x].kc, 400); assert.equal(s.pres, x); assert.equal(A.coPrice(p, t, co), 100);
  for (let i = 0; i < 3; i++) assert.equal(A.buyShare(p, t, y, co, "ipo"), ""); assert.equal(s.pres, y, "Hráč 2 má 3 akcie a stává se prezidentem");
  assert.equal(A.floated(p, s), false); A.buyShare(p, t, x, co, "ipo"); assert.equal(A.floated(p, s), true); assert.equal(s.cash, 600);
  assert.equal(A.buyTrain(p, t, co), ""); assert.equal(A.buyTrain(p, t, co), ""); assert.deepEqual(s.trains, ["2", "2"]);
  t.rail.bank["2"] = 0; t.rail.bank["3"] = 0; assert.equal(A.buyTrain(p, t, co), ""); assert.deepEqual(s.trains, ["4"], "první čtyřka nechá zrezivět dvojky"); assert.equal(t.rail.phase, "4");
  const before = t.res[y].kc; A.runCompany(p, t, co, 100, true); assert.equal(t.res[y].kc, before + 30, "3 akcie × 10"); assert.equal(A.coPrice(p, t, co), 110);
  A.runCompany(p, t, co, 100, false); assert.equal(A.coPrice(p, t, co), 100);
  assert.equal(A.sellShare(p, t, y, co), ""); assert.equal(A.coPrice(p, t, co), 90, "prodej sníží kurz");
  assert.equal(A.railWorth(p, t, x), t.res[x].kc + 3 * 90); assert.ok(A.revenueEstimate(p, t, co) >= 40 + 30, "vlak 4 z Prahy projede 4 nejlepší města");
});

test("vybavení: malý žeton se připne a upraví hodnoty jednotky", () => {
  const { p, t, put } = war(); p.tokens = [{ id: "kul", name: "Kulomet", small: true, mAtt: 2, mMov: -1 }, { id: "big", name: "Opevnění" }];
  const a = put("a", 1); const k = { uid: "k1", kind: "token", tokenId: "kul", x: a.x + 10, y: a.y + 10 }; t.items.push(k);
  assert.equal(A.attachToken(p, t, k), true); assert.equal(k.attachTo, a.uid);
  assert.equal(A.unitStat(p, a, "att"), 8); assert.equal(A.unitStat(p, a, "mov"), 1); assert.equal(A.unitAttack(p, t, a), 8);
  assert.equal(A.effUnit(p, a, p.units[0]).att, 8);
  const o = { uid: "o1", kind: "token", tokenId: "big", x: a.x, y: a.y }; t.items.push(o); assert.equal(A.attachToken(p, t, o), false, "velký žeton se nepřipíná");
  A.detachToken(p, t, "k1"); assert.equal(A.unitStat(p, a, "att"), 6);
});
test("velení: aktivace jednotek v dosahu, bonus a pravidlo jen aktivovaných", () => {
  const { p, t, put } = war(); p.units.push({ id: "hq", name: "Štáb", factionId: "anna", att: 0, def: 1, mov: 2, cmd: 2, cmdAtt: 1 });
  const hq = put("hq", 0), a1 = put("a", 1), a2 = put("a", 2), a3 = put("a", 4), en = put("d", 3);
  assert.equal(A.unitStat(p, a1, "att"), 7, "bonus velitele v dosahu"); assert.equal(A.unitStat(p, a3, "att"), 6, "mimo dosah bez bonusu");
  assert.equal(A.activateCommand(p, t, hq), 3, "štáb + 2 jednotky v dosahu"); assert.ok(a1.act && a2.act && !a3.act && !en.act);
  p.ruleset.actOnly = true; assert.equal(A.actViolation(p, a3).length, 1); assert.equal(A.actViolation(p, a1).length, 0);
  A.newRound(p, t); assert.ok(!a1.act, "aktivace se na začátku kola zruší");
});
test("vybavení přidá životy a dostřel v dungeon crawleru", () => {
  const p = A.exampleCrypt(); const S = A.__S(); S.projects = [p]; S.currentId = p.id; A.startScenario ? 0 : 0; p.table = null; const t = A.ensureTable(p);
  const sc = p.scenarios[0]; t.boardId = sc.boardId; t.items = JSON.parse(JSON.stringify(sc.setup.items)); const hero = t.items.find(i => A.isHero(p, i));
  const am = p.tokens.find(x => x.name === "Amulet"), luk = p.tokens.find(x => x.name === "Luk");
  const before = A.unitMaxHp(p, hero); t.items.push({ uid: "e1", kind: "token", tokenId: am.id, attachTo: hero.uid, x: 0, y: 0 }, { uid: "e2", kind: "token", tokenId: luk.id, attachTo: hero.uid, x: 0, y: 0 });
  assert.equal(A.unitMaxHp(p, hero), before + 2); assert.equal(A.unitStat(p, hero, "range"), (+A.unitOf(p, hero).range || 0) + 2);
});

test("pevný žeton: jednotka postaví okop, ten dá bonus jednotkám na poli", () => {
  const { p, t, put } = war(); p.tokens = [{ id: "okop", name: "Okop", fixed: true, buildable: true, mDef: 2 }]; const a = put("a", 1), a2 = put("a", 3);
  assert.equal(A.buildToken(p, t, a, "okop"), ""); assert.equal(A.unitStat(p, a, "def"), 6, "obrana 4 + okop 2"); assert.equal(A.unitStat(p, a2, "def"), 4, "jinde bez bonusu");
  assert.match(A.buildToken(p, t, a, "okop"), /už je/); const tok = t.items.find(i => i.kind === "token"); assert.equal(A.locKey(p, t, tok), "1,0");
});
test("zóny: obrana zóny s vybavením, váhy zásahu a kritická zóna", () => {
  const { p, t, put } = war(); p.units[1].zones = [{ name: "Podvozek", def: 4, w: 1, hp: 2 }, { name: "Vrch", def: 1, w: 0, crit: true }];
  p.tokens = [{ id: "pan", name: "Pancíř", small: true, zone: "Vrch", mZone: 3 }, { id: "st", name: "Štít", small: true, mDef: 1 }];
  const d = put("d", 2); t.items.push({ uid: "e1", kind: "token", tokenId: "pan", attachTo: d.uid, x: 0, y: 0 }, { uid: "e2", kind: "token", tokenId: "st", attachTo: d.uid, x: 0, y: 0 });
  const [pod, vrch] = p.units[1].zones; assert.equal(A.zoneDef(p, d, pod), 5, "4 + štít"); assert.equal(A.zoneDef(p, d, vrch), 5, "1 + štít + pancíř jen pro vrch");
  for (let i = 0; i < 20; i++) assert.equal(A.pickZone(p, d).name, "Podvozek", "zóna s vahou 0 se netrefí");
  assert.match(A.zoneHit(p, t, d, pod, 1), /zbývá 1/); assert.match(A.zoneHit(p, t, d, pod, 1), /vyřazen/); assert.ok(t.items.includes(d));
  assert.match(A.zoneHit(p, t, d, { name: "Vrch", crit: true, hp: 1 }, 1), /vyřazena/); assert.ok(!t.items.includes(d), "kritická zóna vyřadí jednotku");
});
test("nosnost: předměty podle váhy, přeprava jednotek ve vozidle", () => {
  const { p, t, put } = war(); p.units.push({ id: "tr", name: "Transportér", factionId: "anna", att: 1, def: 3, mov: 5, transport: 2 }); p.units[0].carry = 2; p.units[0].tsize = 1;
  p.tokens = [{ id: "m", name: "Meč", small: true, mAtt: 1, weight: 1 }, { id: "s", name: "Štít", small: true, mDef: 1, weight: 2 }];
  const a = put("a", 1), b2 = put("a", 1), c = put("a", 1), tr = put("tr", 1);
  assert.deepEqual(A.carryCheck(p, t, a, p.tokens[1]), []); t.items.push({ uid: "w1", kind: "token", tokenId: "s", attachTo: a.uid, x: 0, y: 0 });
  assert.equal(A.carryCheck(p, t, a, p.tokens[0]).length, 1, "štít váží 2 – meč se už nevejde");
  p.ruleset.strict = true; assert.ok(A.embark(p, t, a, tr)); assert.ok(A.embark(p, t, b2, tr)); assert.equal(A.embark(p, t, c, tr), false, "kapacita 2");
  assert.equal(A.loadUsed(p, t, tr), 2); tr.x += 200; A.syncPassengers(t); assert.equal(a.x, tr.x, "cestující jedou s vozidlem");
  A.disembark(p, t, a); assert.ok(!a.inside); assert.equal(A.loadUsed(p, t, tr), 1);
});
test("ukázka Obrana Brodu: rozestavení scénáře odpovídá jednotkám stran", () => {
  const p = A.exampleWar(); const names = p.scenarios[0].setup.items.filter(i => i.kind === "unit").map(i => p.units.find(u => u.id === i.unitId).name);
  assert.ok(!names.includes("Transportér")); assert.equal(names.filter(n => n === "3. pěší").length, 3);
});
test("natočení: čelo, bok, záď a posun v boji", () => {
  const { p, t, put } = war(); p.facing.on = true; const a = put("a", 1), d = put("d", 2);
  d.rot = 270; assert.equal(A.arcOf(p, d, a), "front"); d.rot = 0; assert.equal(A.arcOf(p, d, a), "flank"); d.rot = 90; assert.equal(A.arcOf(p, d, a), "rear");
  assert.equal(A.positionCombat(p, t, [a], d).shift, 2, "zezadu +2"); d.rot = 0; assert.equal(A.positionCombat(p, t, [a], d).shift, 1, "z boku +1");
  p.facing.on = false; assert.equal(A.positionCombat(p, t, [a], d).shift, 0, "vypnuté natočení nic nemění");
});
test("natočení: okop chrání jen zepředu, zorné pole a nepozorovaný útok", () => {
  const { p, t, put } = war(); p.facing.on = true; p.tokens = [{ id: "okop", name: "Okop", fixed: true, buildable: true, frontOnly: true, mDef: 2 }];
  const d = put("d", 2), w = put("a", 1), e = put("a", 3); d.rot = 270; assert.equal(A.buildToken(p, t, d, "okop"), "");
  assert.equal(A.withAttacker(w, () => A.unitStat(p, d, "def")), 4, "útok zepředu: 2 + okop 2"); assert.equal(A.withAttacker(e, () => A.unitStat(p, d, "def")), 2, "útok zezadu: okop nepomůže");
  p.facing.vision = true; p.facing.adjSee = false; p.facing.view = 60;
  assert.ok(A.sees(p, d, w)); assert.ok(!A.sees(p, d, e), "za zády nevidí"); const r = A.positionCombat(p, t, [e], d); assert.ok(r.stealth); assert.equal(r.shift, 3, "zezadu 2 + nepozorovaně 1");
  p.facing.adjSee = true; assert.ok(A.sees(p, d, e), "sousední pole vidí vždy");
});
test("natočení: zóna podle směru útoku, otočení po pohybu", () => {
  const { p, t, put } = war(); p.facing.on = true; p.units[1].zones = [{ name: "Čelo", def: 5, arc: "front" }, { name: "Záď", def: 1, arc: "rear" }];
  const a = put("a", 1), d = put("d", 2); d.rot = 90; for (let i = 0; i < 10; i++) assert.equal(A.pickZone(p, d, A.arcOf(p, d, a)).name, "Záď");
  A.faceAlong(p, a, "1,0", "2,0"); assert.equal(a.rot, 90, "po pohybu na východ hledí na východ"); A.faceToward(p, d, a); assert.equal(d.rot, 270);
});
test("výška terénu: kopec zastaví výhled, z hory je vidět přes les; útok do kopce", () => {
  const { p, t, put } = war(); const b = p.boards[0];
  b.terrain = { "2,0": "hill" }; assert.ok(!A.hasLOS(p, b, "0,0", "4,0"), "kopec mezi rovinami"); assert.ok(A.hasLOS(p, b, "2,0", "4,0"), "z kopce");
  b.terrain = { "0,0": "mount", "1,0": "forest" }; assert.ok(A.hasLOS(p, b, "0,0", "5,0"), "z hory přes les u sebe");
  b.terrain = { "0,0": "mount", "4,0": "forest" }; assert.ok(!A.hasLOS(p, b, "0,0", "5,0"), "les u cíle zakryje");
  b.terrain = { "2,0": "hill" }; const a = put("a", 1), d = put("d", 2); assert.equal(A.positionCombat(p, t, [a], d).shift, -1, "obránce výš");
});
test("munice a hlídka", () => {
  const { p, t, put } = war(); p.units[0].ammo = 2; const a = put("a", 1), d = put("d", 3);
  assert.ok(A.useAmmo(p, t, a)); assert.ok(A.useAmmo(p, t, a)); assert.equal(A.ammoLeft(p, a), 0); assert.ok(!A.useAmmo(p, t, a), "bez munice neútočí");
  d.st = { watch: true }; assert.equal(A.overwatchCheck(p, t, a), null, "mimo dostřel"); A.placeOn(p, t, a, "2,0"); assert.equal(A.overwatchCheck(p, t, a), d, "nepřítel vstoupil do dostřelu");
  p.facing.on = true; p.facing.vision = true; p.facing.adjSee = false; p.facing.view = 60; d.rot = 90; assert.equal(A.overwatchCheck(p, t, a), null, "hlídka hledí jinam");
});
test("morálka: test, rozvrácení, ústup a vzpamatování", () => {
  const { p, t, put } = war(); p.morale.on = true; const a = put("a", 1); put("d", 2); p.units[0].mor = 20; let r = A.moraleTest(p, t, a); assert.ok(r.ok, "morálka 20 vždy drží");
  p.units[0].mor = 1; r = A.moraleTest(p, t, a); assert.ok(!r.ok); assert.ok(a.st.dis, "neúspěch = rozvrácená");
  A.moraleTest(p, t, a); assert.equal(A.cellUnder(p, a), "0,0", "rozvrácená při dalším neúspěchu ustoupí");
  p.units[0].mor = 20; a.st.sup = true; assert.equal(A.moraleTarget(p, t, a), 19, "potlačená −1"); assert.ok(A.rally(p, t, a).ok); assert.ok(!a.st.dis && !a.st.sup);
});
test("morálka po ztrátě v boji a potlačující palba", () => {
  const { p, t, put } = war(); p.morale.on = true; p.units[1].mor = 1; const a = put("a", 1), d = put("d", 2); const S = A.__S();
  S.combat = { attUids: [a.uid], defUid: d.uid, log: [] }; const msg = A.applyCombat(p, t, "D1"); assert.match(msg, /Morálka Obrana/); assert.ok(d.st.dis);
  p.morale.supHit = 1; const m2 = A.suppressFire(p, t, a, d); assert.match(m2, /potlačena/); assert.ok(d.st.sup);
  assert.equal(A.unitAttack(p, t, d), 0, "rozvrácená i potlačená: 1 → 0"); assert.ok(A.moveViolations(p, t, d, "2,0", null, "3,0").some(x => /potlačená/.test(x)));
  A.moraleRound(p, t); assert.ok(!d.st.sup, "potlačení skončí s kolem");
});
test("miny, ostnatý drát, výbušnina a potraviny", () => {
  const { p, t, put } = war(); p.tokens = A.FX_PRESET(); const [mina, drat, tnt, jidlo] = p.tokens; mina.fxN = 6; p.dice.aHit = 1;
  const tok = (tk, c) => { const it = { uid: tk.name + c, kind: "token", tokenId: tk.id, x: 0, y: 0 }; t.items.push(it); A.placeOn(p, t, it, c + ",0"); return it; };
  const a = put("a", 1); tok(mina, 2); A.placeOn(p, t, a, "2,0"); assert.match(A.minesOnEnter(p, t, a, "2,0"), /Mina/); assert.ok(!t.items.includes(a), "6 zásahů zničí jednotku"); assert.ok(!t.items.some(i => i.tokenId === mina.id), "mina zmizí");
  const b = put("a", 0); tok(drat, 2); p.units[0].mov = 5; const rng = A.computeRange(p, t, b); assert.equal(rng["2,0"], 4, "drát: 1 + 1 + 2"); assert.ok(!("3,0" in rng), "drát zastaví");
  const ch = { uid: "tnt", kind: "token", tokenId: tnt.id, attachTo: b.uid, x: 0, y: 0 }; t.items.push(ch); A.placeOn(p, t, b, "1,0");
  const tg = A.blastTargets(p, t, b); assert.ok(tg.some(o => o.tokenId === drat.id)); A.blast(p, t, b, ch, tg.find(o => o.tokenId === drat.id)); assert.ok(!t.items.some(i => i.tokenId === drat.id || i.uid === "tnt"), "drát i nálož zmizely");
  b.st = { tired: true }; const f = { uid: "f", kind: "token", tokenId: jidlo.id, attachTo: b.uid, x: 0, y: 0 }; t.items.push(f); A.eat(p, t, b, f); assert.ok(!b.st.tired && !t.items.includes(f));
  p.morale.hunger = true; A.moraleRound(p, t); assert.ok(b.st.tired, "bez jídla hladoví");
});
test("předměty: jednorázový lektvar, dočasný svitek, brnění pohltí zásahy, zbraň se opotřebí", () => {
  const { p, t, put } = war(); p.units[0].hp = 6; p.units[1].hp = 6; const a = put("a", 1); t.turn = 1;
  p.tokens = [{ id: "lek", name: "Lektvar", small: true, use: "once", heal: 2, mAtt: 3, turns: 2 }, { id: "zb", name: "Zbroj", small: true, mDef: 1, dur: 2, absorb: true }, { id: "mec", name: "Meč", small: true, mAtt: 1, dur: 2, wear: true }];
  const att = (id) => { const o = { uid: id + "1", kind: "token", tokenId: id, attachTo: a.uid, x: 0, y: 0 }; t.items.push(o); return o; };
  att("lek"); assert.equal(A.unitStat(p, a, "att"), 6, "nepoužitý lektvar nic nedá"); a.dmg = 3;
  A.useItem(p, t, a, A.carried(p, t, a)[0]); assert.equal(a.dmg, 1); assert.equal(A.unitStat(p, a, "att"), 9, "útok +3"); assert.equal(A.carried(p, t, a).length, 0, "lektvar zmizel");
  t.turn = 2; A.itemsRound(p, t); assert.equal(A.unitStat(p, a, "att"), 9, "platí 2 kola"); t.turn = 3; A.itemsRound(p, t); assert.equal(A.unitStat(p, a, "att"), 6, "účinek skončil");
  att("zb"); assert.equal(A.unitStat(p, a, "def"), 5); assert.match(A.damage(p, t, a, 3), /pohltí 2.*zničen.*ztrácí 1/); assert.equal(a.dmg, 2); assert.equal(A.carried(p, t, a).length, 0, "zbroj zničena");
  att("mec"); A.useAmmo(p, t, a); assert.equal(A.itemLeft(A.carried(p, t, a)[0]), 1); A.useAmmo(p, t, a); assert.equal(A.carried(p, t, a).length, 0, "meč se opotřebil");
});
test("předměty z karet: vybavit z ruky, použít z ruky, zničená karta jde do odhozených", () => {
  const { p, t, put } = war(); p.units[0].hp = 5; const a = put("a", 1);
  p.decks[0].cards.push({ id: "br", title: "Brnění", qty: 1, unitItem: true, mDef: 2, dur: 1, absorb: true }, { id: "lk", title: "Lektvar", qty: 1, unitItem: true, use: "once", heal: 3 });
  t.hands.anna = [{ deckId: "d", cardId: "br" }, { deckId: "d", cardId: "lk" }]; t.discard.d = [];
  assert.equal(A.handItems(p, t, a).length, 2); A.equipCard(p, t, a, t.hands.anna[0]); assert.equal(A.unitStat(p, a, "def"), 6, "brnění z karty +2"); assert.equal(t.hands.anna.length, 1);
  a.dmg = 4; const h = t.hands.anna[0]; A.useItem(p, t, a, { kind: "hand", src: h, def: A.cardOf(p, h).c }); assert.equal(a.dmg, 1); assert.deepEqual(t.discard.d, ["lk"]);
  A.damage(p, t, a, 1); assert.equal(a.dmg, 1, "brnění pohltilo"); assert.ok(!(a.gear || []).length); assert.deepEqual(t.discard.d, ["lk", "br"]);
});
test("předměty plošně a cíleně: granát v okruhu, svitek do jednoho, léčení spojenců", () => {
  const { p, t, put } = war(); p.units.forEach(u => { u.hp = 6; }); p.dice.aHit = 1; const a = put("a", 0), a2 = put("a", 1), d1 = put("d", 2), d2 = put("d", 3), d3 = put("d", 5);
  const gr = { name: "Granát", use: "once", target: "area", reach: 3, radius: 1, hits: 2 };
  assert.ok(A.itemTargets(p, t, a, gr).includes(d1)); assert.ok(!A.itemTargets(p, t, a, gr).includes(d3), "mimo dosah");
  assert.deepEqual(A.itemAffected(p, t, a, gr, d1).map(x => x.uid), [d1.uid, d2.uid], "okruh 1 kolem d1, jen nepřátelé");
  A.useItem(p, t, a, { kind: "tok", src: { uid: "z" }, def: gr }, d1); assert.equal(d1.dmg, 2); assert.equal(d2.dmg, 2); assert.ok(!a2.dmg, "spojenec nezasažen");
  const bl = { name: "Blesk", use: "once", target: "unit", reach: 5, hits: 3 }; A.useItem(p, t, a, { kind: "tok", src: { uid: "z" }, def: bl }, d3); assert.equal(d3.dmg, 3); assert.equal(d2.dmg, 2);
  a.dmg = 4; a2.dmg = 4; const li = { name: "Světlo", use: "once", target: "area", foes: "ally", reach: 0, radius: 1, heal: 2 }; A.useItem(p, t, a, { kind: "tok", src: { uid: "z" }, def: li }, a);
  assert.equal(a.dmg, 2); assert.equal(a2.dmg, 2); assert.equal(d1.dmg, 2, "nepřítel se neléčí");
});
test("denní doba a počasí: výhled, úpravy hodnot, světlo, střídání po kolech", () => {
  const { p, t, put } = war(); p.env.on = true; p.ruleset.sight = 6; p.units[0].range = 4; const a = put("a", 0);
  t.turn = 1; t.envWeather = "Jasno"; assert.equal(A.sightOf(p, t, a), 6); assert.equal(A.envNow(p, t)[0].name, "Den");
  t.envTime = "Noc"; assert.equal(A.sightOf(p, t, a), 1, "v noci 1"); assert.equal(A.unitStat(p, a, "range"), 3, "noc: dostřel −1");
  p.tokens = [{ id: "luc", name: "Lucerna", small: true, light: 3 }]; t.items.push({ uid: "l1", kind: "token", tokenId: "luc", attachTo: a.uid, x: 0, y: 0 }); assert.equal(A.sightOf(p, t, a), 3, "se světlem 3");
  t.envTime = "Den"; t.envWeather = "Déšť"; assert.equal(A.unitStat(p, a, "mov"), 1, "déšť −1, ale nejméně 1"); assert.equal(A.sightOf(p, t, a), 3);
  p.env.auto = false; t.envTime = ""; t.turn = 4; A.envRound(p, t); assert.equal(t.envTime, "Noc", "4. kolo cyklu Den, Den, Soumrak, Noc");
  p.env.on = false; assert.equal(A.sightOf(p, t, a), 6); assert.equal(A.unitStat(p, a, "mov"), 2);
});
