// ---------- Nástroje podle hry ----------
function toolRelevant(p, k) {
  switch (k) {
    case "trh": return p.decks.some(d => +d.market > 0);
    case "akce": return p.actions.length > 0;
    case "draft": case "ruce": return p.decks.some(d => !d.starter) || p.decks.length > 0;
    case "styk": return p.decks.some(d => d.cards.some(c => c.suit && c.value));
    case "program": return p.decks.length > 0 && p.factions.length > 1;
    case "drazba": return p.factions.length > 1;
    case "obchod": return p.resources.some(r => !r.global);
    case "sacek": return p.bags.length > 0;
    case "dilky": return p.tiles.length > 0;
    case "draha": return +p.track.length > 0;
    case "tajne": return !!String(p.roles || "").trim() || p.decks.length > 0;
    case "boj": return p.units.length > 0;
    case "uzemi": return p.boards.length > 0;
    case "hraci": return p.factions.length > 0;
    case "aktivace": return !!String(p.chits || "").trim();
    case "rozvoj": return (p.techs || []).length > 0 || (p.goals || []).length > 0;
    case "hromadka": return !!(p.shed && p.shed.deckId);
    case "riskuj": return !!(p.push && p.push.deckId);
    default: return true;
  }
}
