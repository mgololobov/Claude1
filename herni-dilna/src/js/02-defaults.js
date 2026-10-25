// ---------- výchozí hodnoty ----------
function defaultTerrains() {
  return [
    { id: "plain", name: "Rovina", color: "#c9d6a3", glyph: "", move: "1", def: 1, vp: 0 },
    { id: "forest", name: "Les", color: "#7fa766", glyph: "♣", move: "2", def: 1.5, vp: 0, blocks: true },
    { id: "hill", name: "Kopce", color: "#cdb27a", glyph: "⌒", move: "2", def: 2, vp: 0, h: 1 },
    { id: "mount", name: "Hory", color: "#9a8c7d", glyph: "▲", move: "3", def: 3, vp: 0, blocks: true, h: 2 },
    { id: "water", name: "Voda", color: "#86b7d8", glyph: "≈", move: "–", def: 1, vp: 0 },
    { id: "town", name: "Město", color: "#d8c8ad", glyph: "■", move: "1", def: 2, vp: 3, blocks: true },
    { id: "marsh", name: "Bažina", color: "#98ae8c", glyph: "~", move: "3", def: 1, vp: 0 },
  ];
}
function defaultCRT() {
  return {
    cols: ["1:2", "1:1", "2:1", "3:1", "4:1", "5:1", "6:1"],
    rows: [
      ["AR", "AR", "DR", "DR", "DE", "DE", "DE"],
      ["AR", "AR", "EX", "DR", "DR", "DE", "DE"],
      ["AE", "AR", "AR", "EX", "DR", "DR", "DE"],
      ["AE", "AE", "AR", "AR", "EX", "DR", "DR"],
      ["AE", "AE", "AE", "AR", "AR", "EX", "DR"],
      ["AE", "AE", "AE", "AE", "AR", "AR", "EX"],
    ],
    legend: "AE – útočník zničen\nAR – útočník ustupuje o 1 pole\nEX – výměna: obě strany ztrácí krok\nDR – obránce ustupuje o 1 pole\nDE – obránce zničen",
  };
}
function normalize(p) {
  p.changelog = p.changelog || []; p.decks = p.decks || []; p.tokens = p.tokens || []; p.sessions = p.sessions || [];
  p.factions = p.factions || [{ id: uid(), name: "Modří", color: "#3f6fb0" }, { id: uid(), name: "Červení", color: "#b0402c" }];
  p.units = p.units || []; p.boards = p.boards || []; p.terrains = p.terrains || defaultTerrains();
  p.actions = p.actions || []; p.phases = p.phases || ["Pohyb", "Boj", "Konec kola"]; p.crt = p.crt || defaultCRT();
  p.scenarios = p.scenarios || []; p.dice = p.dice || { aHit: 5, dHit: 5 };
  p.tokens.forEach(t => { if (t.text == null) t.text = ""; });
  p.boards.forEach(b => { b.terrain = b.terrain || {}; b.labels = b.labels || {}; });
  p.resources = p.resources || []; p.bags = p.bags || []; p.cdice = p.cdice || [];
  p.actionMode = p.actionMode || "slots"; p.rondel = p.rondel || { free: 3, pay: "" };
  p.scoring = p.scoring || { field: "", table: "1,3,6,10,15", trick: 0 }; if (p.marketCur == null) p.marketCur = ""; if (p.zoc == null) p.zoc = true;
  p.factions.forEach(f => { if (f.ability == null) f.ability = ""; });
  p.decks.forEach(d => { if (d.market == null) d.market = 0; if (d.starter == null) d.starter = false; d.cards.forEach(c => { ["suit", "value", "vp", "icon", "effect"].forEach(k => { if (c[k] == null) c[k] = ""; }); if (c.locked == null) c.locked = false; }); });
  // Verze 4 omylem ukládala nastavení hlídání do pole s textem pravidel – text se dá poskládat zpět ze znaků.
  if (p.rules && typeof p.rules === "object") {
    const keys = Object.keys(p.rules).filter(k => /^\d+$/.test(k)).sort((a, b) => a - b);
    const cfg = { ...p.rules }; keys.forEach(k => delete cfg[k]);
    if (!p.ruleset) p.ruleset = cfg;
    p.rules = keys.map(k => p.rules[k]).join("");
  }
  if (typeof p.rules !== "string") p.rules = "";
  p.ruleset = Object.assign(defaultRules(), p.ruleset || {}); p.ruleset.win = Object.assign({ vp: "", turns: "", elimination: false, finishRound: false }, p.ruleset.win || {});
  ["triggers", "actCats"].forEach(k => { if (!Array.isArray(p.ruleset[k])) p.ruleset[k] = defaultRules()[k]; }); if (!p.ruleset.phaseOf || typeof p.ruleset.phaseOf !== "object") p.ruleset.phaseOf = {};
  p.tiles = p.tiles || []; p.tileRules = p.tileRules || { match: true, adjacent: true };
  p.track = p.track || { length: 0, die: 6, spaces: "", autoNext: true }; p.routes = p.routes || { cost: "", price: 1, exclusive: true, tickets: [] };
  p.majority = p.majority || { points: "5,3,1" }; p.stock = p.stock || { currency: "", goods: [] }; if (p.roles == null) p.roles = "";
  p.versions = p.versions || []; p.campaign = p.campaign || { log: [] }; p.boards.forEach(b => { b.regions = b.regions || {}; b.numbers = b.numbers || {}; });
  p.production = p.production || { mode: "both" }; if (p.roleRes == null) p.roleRes = ""; if (p.bluffPenalty == null) p.bluffPenalty = "";
  p.factions.forEach(f => { if (f.setup == null) f.setup = ""; if (f.bot == null) f.bot = ""; });
  normalizeMore(p); normalizeFacing(p); normalizeMorale(p); normalizeEnv(p); normalizeGround(p); normalizeCrawl(p); normalizeLogic(p); normalizeCmap(p); normalizeExtra(p); normalizeNet(p); normalizeDeliver(p); normalizeCB(p); normalizeRail(p);
  return p;
}
