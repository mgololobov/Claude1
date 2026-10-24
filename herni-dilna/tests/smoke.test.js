const test = require("node:test"); const assert = require("node:assert");
const { load } = require("./harness");
test("moduly se načtou a ukázky projdou normalizací", () => {
  const A = load();
  const ex = [A.exampleWar(), A.exampleTrade(), A.exampleAlchemy(), A.exampleTricks(), A.exampleTiles(), A.exampleRace(), A.exampleIsland(), A.exampleCrypt(), A.examplePatrol()];
  assert.equal(ex.length, 9);
  ex.forEach(p => assert.equal(typeof p.rules, "string"));
});
