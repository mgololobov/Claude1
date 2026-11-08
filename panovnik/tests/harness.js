// Načte herní logiku (moduly 01–09, bez rozhraní) do izolovaného kontextu pro testy v Node.
const fs = require("fs"), path = require("path"), vm = require("vm");
function load() {
  const dir = path.join(__dirname, "..", "src", "js");
  const files = fs.readdirSync(dir).filter(f => /^0\d-.*\.js$/.test(f)).sort();
  const code = '"use strict";\n' + files.map(f => fs.readFileSync(path.join(dir, f), "utf8")).join("\n") +
    "\n;({ newGame, endTurn, resolveEvent, eventView, build, recruit, trade, setTax, setLaw, dipAction, makePeace, peaceOptions, doAction, orderMove, raiseLevy, borrow, appoint, startExpedition, setResearch, myProvs, totalPop, warScore, incomeBreakdown, expenseBreakdown, aliveRivals, atWarWith, canBuild, PBUILD, SBUILD, ACTIONS, TECH_IDS, techAvailable, score, unitCount, totalUnits, GOOD_IDS, raiseTitle, canTitle })";
  return vm.runInNewContext(code, { console, Math, Date, JSON, Object, Array, Number, String, Set, Map });
}
module.exports = { load };
