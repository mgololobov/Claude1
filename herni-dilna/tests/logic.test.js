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
  for (const make of [A.exampleWar, A.exampleTrade, A.exampleAlchemy, A.exampleTricks, A.exampleTiles, A.exampleRace, A.exampleIsland]) {
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
