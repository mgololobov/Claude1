// Načte herní logiku (moduly 01–09, bez rozhraní) do izolovaného kontextu pro testy v Node.
const fs = require("fs"), path = require("path"), vm = require("vm");
function load() {
  const dir = path.join(__dirname, "..", "src", "js");
  const files = fs.readdirSync(dir).filter(f => /^0\d[a-z]?-.*\.js$/.test(f)).sort();
  const names = "newGame endTurn resolveEvent eventView doCmd dispatch orderArmy diplomacy declareWar makePeace clanProvs officers officersIn aliveClans atWar enemiesOf clanBudget clanMen clanPower realmProvs captiveAction promote reward makeLord tradeGoods setTax setLaw setResearch borrow crown canCrown runElection candidates estateTarget men chr P leaderOf heirsOf transferProv standForElection bribeElector popeGift maxRecruit recruitCost SCENARIOS scenarioClans manualRound mongolRaid routeIncomeProv routeState ROUTES setOffice officeVal battle loyBreakdown offLoyBreakdown joinHanza TACTICS occupy warScore peaceItems proposePeace applyPeace develop startCore raiseStab buyIdea cbAgainst ctrl overext missionsFor greedyDemand dev doDeed DEEDS joustPass quarantine startWork WORKS acceptContract deliverContract funTick endFeud plagueTick dispName TECHS TECH_IDS techAvail startExpedition expCandidates expeditionTick DESTS TREASURES addTreasure addCourt hasCourt hasTrea discoverTick nextTechChoices HIST2 EVENTS provGold";
  const code = '"use strict";\n' + files.map(f => fs.readFileSync(path.join(dir, f), "utf8")).join("\n") + "\n;({" + names.split(" ").join(",") + "})";
  return vm.runInNewContext(code, { console, Math, Date, JSON, Object, Array, Number, String, Set, Map });
}
module.exports = { load };
