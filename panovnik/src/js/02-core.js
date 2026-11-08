// Jádro: náhoda, postavy, nová hra, výpočty hospodářství a stavů.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = v => Math.round(v * 10) / 10;
const sum = a => a.reduce((x, y) => x + y, 0);

// Náhoda se semínkem uloženým ve stavu (hra jde zopakovat a uložit)
function rnd(s) { let t = (s.seed = (s.seed + 0x6D2B79F5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const chance = (s, p) => rnd(s) < p;
const rint = (s, a, b) => a + Math.floor(rnd(s) * (b - a + 1));
const pick = (s, a) => a[Math.floor(rnd(s) * a.length)];

function log(s, txt, cat = "obecne") { s.log.unshift({ y: s.year, se: s.season, txt, cat }); if (s.log.length > 600) s.log.length = 600; }
const dateStr = s => SEASONS[s.season] + " " + s.year;

// ---------- postavy ----------
function newChar(s, o = {}) {
  const sex = o.sex || (chance(s, 0.5) ? "m" : "f");
  const c = {
    id: "c" + (s.nextId++), sex, name: o.name || pick(s, sex === "m" ? NAMES_M : NAMES_F) + (o.noSurname ? "" : " " + pick(s, SURNAMES)),
    age: o.age != null ? o.age : rint(s, 20, 50), health: o.health != null ? o.health : rint(s, 55, 95),
    dip: rint(s, 2, 12), mil: rint(s, 2, 12), spr: rint(s, 2, 12), uce: rint(s, 2, 12), int: rint(s, 2, 12),
    traits: [], estate: o.estate || "slechta", loyalty: rint(s, 40, 80), focus: null,
  };
  const n = o.traits ? 0 : rint(s, 1, 2);
  for (let i = 0; i < n; i++) { const t = pick(s, TRAIT_IDS); if (!c.traits.includes(t)) c.traits.push(t); }
  if (o.traits) c.traits = o.traits.slice();
  if (c.traits.includes("nemocny")) c.health -= 20;
  if (c.traits.includes("silny")) c.health += 10;
  c.health = clamp(c.health, 10, 100);
  s.chars[c.id] = c; return c;
}
function stat(c, k) { if (!c) return 0; let v = c[k] || 0; for (const t of c.traits) v += (TRAITS[t] && TRAITS[t][k]) || 0; return clamp(v, 0, 30); }
const ch = (s, id) => (id ? s.chars[id] : null);
const councillor = (s, seat) => ch(s, s.council[seat]);
const cstat = (s, seat) => stat(councillor(s, seat), COUNCIL[seat].stat);
const salary = c => Math.round(1 + (c ? sum(["dip", "mil", "spr", "uce", "int"].map(k => c[k])) / 15 : 0));

// ---------- nová hra ----------
function newGame(opts = {}) {
  const s = {
    v: 1, seed: (opts.seed != null ? opts.seed : (Date.now() & 0x7fffffff)) | 0, nextId: 1, turn: 0, year: START_YEAR, season: 0,
    realm: { name: opts.realm || "Panství Vranovské", title: 0 }, dynasty: opts.dynasty || "Vranovští",
    money: 250, debts: [], stock: {}, market: {}, inflation: 1,
    prestige: 50, piety: 30, legitimacy: 60, ap: 2,
    provinces: {}, capital: "vranov",
    seat: { hradby: 1, donjon: 1, kaple: 0, knihovna: 0, staje: 0, zbrojnice: 0, sypka: 1, pokladnice: 0, sin: 0, zalar: 0, univerzita: 0 },
    queue: [], estates: {}, mods: [], tax: { slechta: 1, duchovni: 1, mestane: 2, sedlaci: 2 },
    laws: { robota: 1, nastupnictvi: 0, mesta: 1, cirkev: 1, vojsko: 1, mince: 0, lesy: 0, tolerance: 0 }, lawCd: {},
    chars: {}, council: {}, courtiers: [], ruler: null, spouse: null, children: [], dead: [],
    techs: {}, research: { cur: "trojpole", pts: 0 }, expeditions: [], expDone: {},
    routes: [], armies: [], rivals: {}, wars: [], liege: { n: "král Jaromír", opinion: 55 },
    events: [], log: [], history: [], last: {}, over: null, claims: {}, plots: [], flags: {},
  };
  for (const g of GOOD_IDS) { s.stock[g] = 0; s.market[g] = 1; }
  Object.assign(s.stock, { obili: 320, drevo: 40, kamen: 30, zelezo: 10, vlna: 10, sukno: 4, sul: 4, vino: 8, kone: 6, zbrane: 8 });
  for (const m of MAP) s.provinces[m.id] = { id: m.id, n: m.n, terrain: m.terrain, pop: m.pop, res: m.res.slice(), owner: m.owner, nb: m.nb.slice(), prosp: 50, unrest: 15, b: {}, occ: null, siege: null, levy: 0, hunger: 0 };
  const P = s.provinces;
  P.vranov.b = { mlyn: 1, trziste: 1, kostel: 1, hradek: 1, dul: 1 }; P.lipnice.b = { mlyn: 1, vinice: 1 }; P.bystrice.b = { pila: 1 };
  for (const r of RIVALS) {
    const ruler = newChar(s, { name: r.ruler, sex: "m", age: rint(s, 30, 55), traits: r.traits, estate: "cizi" });
    s.rivals[r.id] = { id: r.id, n: r.n, title: r.title, ruler: ruler.id, aggr: r.aggr, greed: r.greed, piety: r.piety, wealth: r.wealth,
      attitude: rint(s, -15, 20), treasury: rint(s, 150, 400), units: { kopinici: 5, lucistnici: 3, rytiri: 2, hotovost: 4 }, loc: null, morale: 1,
      alliance: false, trade: false, marriage: false, truce: 0, lastDip: -1, exhaustion: 0, intel: 0, alive: true };
    s.rivals[r.id].loc = rivalProvs(s, r.id)[0];
  }
  s.rivals.zalesi.attitude = -20; s.rivals.biskup.attitude = 25; s.rivals.brodno.attitude = 15; s.rivals.brodno.units = { zoldneri: 4, kusinici: 0, lucistnici: 4, kopinici: 4 };
  for (const e of ESTATE_IDS) s.estates[e] = { loy: 55, infl: 30 };
  s.ruler = newChar(s, { name: opts.ruler || "Bořivoj", noSurname: true, sex: "m", age: 27, health: 85 }).id;
  const r = ch(s, s.ruler); r.mil += 2; r.dip += 1; r.estate = "rod";
  const sp = newChar(s, { name: "Ludmila z Lipé", sex: "f", age: 22, health: 80 }); sp.estate = "rod"; s.spouse = sp.id;
  const son = newChar(s, { name: "Oldřich", noSurname: true, sex: "m", age: 3, health: 70, traits: [] }); son.estate = "rod"; son.dip = son.mil = son.spr = son.uce = son.int = 3; s.children.push(son.id);
  for (const seat of COUNCIL_IDS) { const c = newChar(s, { estate: seat === "kaplan" ? "duchovni" : seat === "spravce" ? (chance(s, 0.5) ? "mestane" : "slechta") : "slechta" }); c[COUNCIL[seat].stat] = rint(s, 6, 11); s.council[seat] = c.id; }
  refreshCourtiers(s);
  s.armies.push({ id: "a1", name: "Panská družina", loc: "vranov", units: { kopinici: 6, lucistnici: 4, rytiri: 2, hotovost: 0 }, morale: 1, order: null, commander: "ruler" });
  updateEstates(s, true);
  log(s, `${r.name} z rodu ${s.dynasty} se ujímá vlády nad panstvím. Píše se rok ${s.year}.`, "rod");
  snapshot(s);
  return s;
}

function refreshCourtiers(s) {
  for (const id of s.courtiers) if (!Object.values(s.council).includes(id)) delete s.chars[id];
  s.courtiers = [];
  for (let i = 0; i < 6; i++) { const est = pick(s, ["slechta", "slechta", "slechta", "duchovni", "mestane", "mestane"]); s.courtiers.push(newChar(s, { estate: est }).id); }
}

// ---------- pomocné dotazy ----------
const myProvs = s => Object.values(s.provinces).filter(p => p.owner === "hrac");
const rivalProvs = (s, id) => Object.values(s.provinces).filter(p => p.owner === id).map(p => p.id);
const totalPop = s => sum(myProvs(s).map(p => p.pop));
const has = (s, t) => !!s.techs[t];
const aliveRivals = s => Object.values(s.rivals).filter(r => r.alive);
const atWarWith = (s, id) => s.wars.find(w => w.enemy === id);
const TITLES = ["pán", "hrabě", "vévoda", "král"];
const realmTitle = s => TITLES[s.realm.title];
function unitCount(units) { return sum(Object.values(units || {})); }

function mod(s, e, v, dur, why) { s.mods.push({ e, v, until: s.turn + dur, why }); }

// ---------- trh ----------
function price(s, g) {
  const G = GOODS[g]; const scale = 0.5 + myProvs(s).length / 6;
  const f = clamp(1.6 - 0.6 * s.stock[g] / (G.ref * scale), 0.6, 1.8);
  return G.base * s.inflation * s.market[g] * f;
}
const buyPrice = (s, g) => price(s, g) * 1.12;
const sellPrice = (s, g) => price(s, g) * 0.85 * (s.laws.tolerance === 1 ? 1.05 : 1);
function tradeCost(s, g, n, buy) {
  // průměr ceny před a po obchodu (cena se hýbe se zásobou)
  const p0 = buy ? buyPrice(s, g) : sellPrice(s, g); const old = s.stock[g];
  s.stock[g] = Math.max(0, old + (buy ? n : -n)); const p1 = buy ? buyPrice(s, g) : sellPrice(s, g); s.stock[g] = old;
  return Math.round((p0 + p1) / 2 * n);
}
function trade(s, g, n, buy) {
  n = Math.floor(n); if (n <= 0) return "Zadej množství.";
  if (GOODS[g].exotic && buy) return "Exotické zboží se dá získat jen obchodními cestami.";
  const c = tradeCost(s, g, n, buy);
  if (buy) { if (s.money < c) return "Nedostatek zlata."; s.money -= c; s.stock[g] += n; }
  else { if (s.stock[g] < n) return "Tolik zboží nemáš."; s.money += c; s.stock[g] -= n; }
  s.last.trade = (s.last.trade || 0) + (buy ? -c : c);
  log(s, `${buy ? "Nakoupeno" : "Prodáno"} ${n}× ${GOODS[g].n} za ${c} zl.`, "obchod");
  return null;
}

// ---------- výroba ----------
function grainMult(s, p) {
  let m = 1 + (p.b.mlyn || 0) * 0.08 * (has(s, "vodni_kolo") ? 1.5 : 1);
  if (has(s, "trojpole")) m += 0.15; if (has(s, "pluh")) m += p.terrain === "nizina" ? 0.2 : 0.1;
  return m;
}
function provProduction(s, p, season = s.season) {
  const out = {}, use = {};
  if (p.owner !== "hrac" || p.occ) return { out, use };
  const workers = p.pop / 1000 * 0.8 * (1 - p.levy * 0.5);
  out.obili = workers * TERRAIN[p.terrain].fert * 13 * SEASON_GRAIN[season] * grainMult(s, p) * (0.75 + p.prosp / 200) + (p.b.pristav || 0) * 3 * (has(s, "koga") ? 1.5 : 1);
  if (p.terrain === "les") out.drevo = 3;
  if (s.laws.lesy === 1) out.drevo = (out.drevo || 0) + 1;
  const bm = { pila: has(s, "vodni_kolo") ? 1.5 : 1, dul: has(s, "kovarstvi") ? 1.5 : 1, kovarna: has(s, "kovarstvi") ? 1.5 : 1, hrebcin: has(s, "chov") ? 1.5 : 1, tkalci: has(s, "sukno") ? 1.5 : 1 };
  for (const [b, lvl] of Object.entries(p.b)) {
    const B = PBUILD[b]; if (!lvl || !B.prod) continue;
    for (const [g, q] of Object.entries(B.prod)) out[g] = (out[g] || 0) + q * lvl * (bm[b] || 1) * (season === 3 && (b === "vinice" || b === "ovcin") ? 0.3 : 1);
    if (B.use) for (const [g, q] of Object.entries(B.use)) use[g] = (use[g] || 0) + q * lvl * (bm[b] || 1);
  }
  return { out, use };
}
function seatProduction(s) {
  const out = {};
  if (s.seat.staje) out.kone = s.seat.staje * (has(s, "chov") ? 1.5 : 1);
  if (s.seat.zbrojnice) out.zbrane = s.seat.zbrojnice;
  return out;
}

// ---------- vojsko ----------
function armyUpkeep(s, units) {
  let m = 0, g = 0;
  for (const [u, n] of Object.entries(units)) { m += UNITS[u].up * n; g += UNITS[u].grain * n; }
  if (s.laws.vojsko === 2) m *= 1.1;
  return { money: m, grain: g };
}
function totalUnits(s) { const t = {}; for (const a of s.armies) for (const [u, n] of Object.entries(a.units)) t[u] = (t[u] || 0) + n; return t; }

// ---------- příjmy a výdaje ----------
function efficiency(s) {
  return 0.8 + cstat(s, "spravce") * 0.012 + cstat(s, "kancler") * 0.006 + Math.max(0, stat(ch(s, s.ruler), "spr") - 8) * 0.01 + s.seat.pokladnice * 0.05 + (has(s, "ucetnictvi") ? 0.1 : 0) + (s.legitimacy - 50) / 500;
}
function incomeBreakdown(s) {
  const t = s.tax, inc = { sedlaci: 0, mestane: 0, duchovni: 0, slechta: 0, myto: 0, domeny: 0, cesty: 0, mince: 0 };
  const mestaM = [0.8, 1, 1.3][s.laws.mesta];
  for (const p of myProvs(s)) {
    if (p.occ) continue;
    const k = p.pop / 1000, pr = p.prosp / 60;
    inc.sedlaci += k * 2 * TAX_MULT[t.sedlaci] * pr * (1 - p.levy * 0.4);
    inc.mestane += (k * 0.4 + (p.b.trziste || 0) * 4 + (p.b.tkalci || 0) * 2 + (p.b.pristav || 0) * 4) * TAX_MULT[t.mestane] * pr * mestaM;
    inc.duchovni += (k * 0.3 + (p.b.kostel || 0) * 2) * TAX_MULT[t.duchovni] * (s.laws.cirkev === 2 ? 1.6 : 1);
    inc.slechta += 5 * TAX_MULT[t.slechta];
    inc.myto += (p.b.cesty || 0) * 4 * pr;
  }
  if (s.flags.mestaneStrike > s.turn) inc.mestane = 0;
  inc.domeny = 10 + cstat(s, "spravce") * 0.8;
  for (const r of s.routes) inc.cesty += routeIncome(s, r);
  const eff = efficiency(s);
  for (const k of Object.keys(inc)) if (k !== "cesty") inc[k] *= eff;
  const base = sum(Object.values(inc));
  inc.mince = base * [0, 0.08, 0.18][s.laws.mince];
  for (const k of Object.keys(inc)) inc[k] = r1(inc[k]);
  return inc;
}
function routeIncome(s, r) {
  let v = r.exotic ? 25 : 6 + (r.with && s.rivals[r.with] ? rivalProvs(s, r.with).length * 2 : 0);
  if (has(s, "smenky")) v *= 1.2; if (has(s, "mince")) v *= 1.1;
  v *= [0.8, 1, 1.3][s.laws.mesta];
  return v;
}
function expenseBreakdown(s) {
  const ex = { vojsko: armyUpkeep(s, totalUnits(s)).money, rada: sum(COUNCIL_IDS.map(k => (s.council[k] ? salary(councillor(s, k)) : 0))), dvur: 6 + s.children.length * 1.5, sidlo: sum(Object.values(s.seat)) * 1, uroky: sum(s.debts.map(d => d.amount * d.rate)) };
  for (const k of Object.keys(ex)) ex[k] = r1(ex[k]);
  return ex;
}

// ---------- stavy ----------
const LAW_EST = {
  robota: [{ sedlaci: 8 }, {}, { sedlaci: -12 }],
  nastupnictvi: [{ slechta: -3 }, { slechta: 8 }, { slechta: 4 }],
  mesta: [{ mestane: -8, slechta: 5 }, {}, { mestane: 12, slechta: -8 }],
  cirkev: [{ duchovni: 10 }, {}, { duchovni: -18 }],
  vojsko: [{ slechta: 5, sedlaci: -3 }, {}, { slechta: -5 }],
  mince: [{}, { mestane: -6 }, { mestane: -15, sedlaci: -5 }],
  lesy: [{ sedlaci: 3 }, { sedlaci: -6, slechta: 2 }],
  tolerance: [{ duchovni: 6, mestane: -4 }, { duchovni: -6, mestane: 6 }],
};
function estateTarget(s, e) {
  const rows = [["Základ", 50], ["Daně: " + TAX_LEVELS[s.tax[e]], TAX_LOY[s.tax[e]]]];
  for (const [l, opts] of Object.entries(LAW_EST)) { const v = opts[s.laws[l]][e]; if (v) rows.push([LAWS[l].n + ": " + LAWS[l].opts[s.laws[l]], v]); }
  const inCouncil = COUNCIL_IDS.filter(k => councillor(s, k) && councillor(s, k).estate === e).length;
  if (inCouncil) rows.push(["Zástupci v radě", inCouncil * 6]);
  if (e === "slechta") { rows.push(["Prestiž panovníka", clamp(Math.round((s.prestige - 50) / 25), -10, 12)]); if (s.wars.length) rows.push(["Válka (příležitost ke slávě)", 3]); }
  if (e === "duchovni") rows.push(["Zbožnost panovníka", clamp(Math.round((s.piety - 30) / 15), -10, 12)]);
  if (e === "mestane") { if (s.wars.length) rows.push(["Válka ruší obchod", -6]); if (s.debts.length) rows.push(["Úvěry u kupců", 3]); if (s.routes.length) rows.push(["Obchodní cesty", Math.min(9, s.routes.length * 3)]); }
  if (e === "sedlaci") { const h = Math.max(...myProvs(s).map(p => p.hunger), 0); if (h) rows.push(["Hlad", -15]); const lev = myProvs(s).some(p => p.levy > 0); if (lev) rows.push(["Povolaná hotovost", -6]); }
  if (e !== "duchovni" && s.laws.cirkev === 2 && e === "slechta") rows.push(["Podíl na církevních statcích", 4]);
  for (const m of s.mods) if (m.e === e && m.until > s.turn) rows.push([m.why, m.v]);
  return { rows, val: clamp(sum(rows.map(r => r[1])), 0, 100) };
}
function estateInfluence(s, e) {
  const ps = myProvs(s);
  if (e === "slechta") return clamp(35 + ps.length * 2 - s.laws.mesta * 5 + (s.laws.vojsko === 0 ? 8 : 0), 5, 95);
  if (e === "duchovni") return clamp(18 + sum(ps.map(p => (p.b.kostel || 0) * 3)) + (s.laws.cirkev === 0 ? 10 : 0) + s.seat.kaple * 3, 5, 95);
  if (e === "mestane") return clamp(10 + sum(ps.map(p => (p.b.trziste || 0) * 4 + (p.b.tkalci || 0) * 2)) + s.routes.length * 3 + s.laws.mesta * 10 + s.seat.univerzita * 5, 5, 95);
  return clamp(15 + sum(ps.map(p => p.unrest)) / ps.length / 3, 5, 95);
}
function updateEstates(s, instant) {
  for (const e of ESTATE_IDS) {
    const t = estateTarget(s, e).val, E = s.estates[e];
    E.loy = instant ? t : r1(E.loy + (t - E.loy) * 0.2); E.infl = Math.round(estateInfluence(s, e));
  }
  s.mods = s.mods.filter(m => m.until > s.turn);
}

// ---------- provincie ----------
function unrestTarget(s, p) {
  const rows = [["Základ", 10], ["Daň sedláků", s.tax.sedlaci * 6], ["Robota", s.laws.robota * 6]];
  if (p.hunger) rows.push(["Hlad", 25]);
  if (p.occ) rows.push(["Cizí vojsko", 20]);
  if (p.levy) rows.push(["Odvedení mužů", 8]);
  if (s.wars.length) rows.push(["Válka", 5]);
  if (p.b.hradek) rows.push(["Hrádek", -4 * p.b.hradek]);
  if (p.b.kostel) rows.push(["Kostel", -3 * p.b.kostel]);
  if (s.armies.some(a => a.loc === p.id && unitCount(a.units) > 0)) rows.push(["Posádka", -6]);
  if (has(s, "zakonik")) rows.push(["Zemský zákoník", -5]);
  if (s.laws.lesy === 1) rows.push(["Panské obory", 4]);
  if (s.laws.tolerance === 0) rows.push(["Pronásledování kacířů", 3]);
  if (p.id === s.capital && s.seat.zalar) rows.push(["Žalář", -5]);
  rows.push(["Nálada sedláků", Math.round((50 - s.estates.sedlaci.loy) / 4)]);
  if (p.conquered > s.turn) rows.push(["Nedávno dobyto", 20]);
  return { rows, val: clamp(sum(rows.map(r => r[1])), 0, 100) };
}
function prospTarget(s, p) {
  const rows = [["Základ", 40], ["Tržiště", (p.b.trziste || 0) * 8], ["Cesty", (p.b.cesty || 0) * 6], ["Přístav", (p.b.pristav || 0) * 6], ["Daň sedláků", -s.tax.sedlaci * 5], ["Nepokoje", -Math.round(p.unrest / 4)]];
  if (p.hunger) rows.push(["Hlad", -20]);
  if (p.occ) rows.push(["Plenění", -25]);
  if (s.laws.mesta === 2) rows.push(["Městská privilegia", 6]);
  if (s.routes.length) rows.push(["Obchod", Math.min(10, s.routes.length * 2)]);
  return { rows, val: clamp(sum(rows.map(r => r[1])), 5, 100) };
}

// ---------- učenost ----------
function researchRate(s) {
  let v = 1 + stat(ch(s, s.ruler), "uce") / 4 + cstat(s, "kaplan") / 3 + s.seat.knihovna * 2 + s.seat.univerzita * 5 + sum(myProvs(s).map(p => (p.b.kostel || 0) * 0.5));
  if (has(s, "tisk")) v *= 1.5;
  return r1(v);
}
const techAvailable = (s, t) => !s.techs[t] && (TECHS[t].req || []).every(r => s.techs[r]);

function snapshot(s) {
  s.history.push({ t: s.turn, d: dateStr(s), money: Math.round(s.money), pop: totalPop(s), prov: myProvs(s).length, prestige: Math.round(s.prestige), piety: Math.round(s.piety), legit: Math.round(s.legitimacy), army: unitCount(totalUnits(s)), grain: Math.round(s.stock.obili), income: s.last.income || 0, expense: s.last.expense || 0 });
  if (s.history.length > 500) s.history.shift();
}
