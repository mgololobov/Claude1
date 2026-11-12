// Jádro: náhoda, postavy, založení světa, pomocné výpočty.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = v => Math.round(v * 10) / 10;
const sum = a => a.reduce((x, y) => x + y, 0);
function rnd(s) { let t = (s.seed = (s.seed + 0x6D2B79F5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const chance = (s, p) => rnd(s) < p;
const rint = (s, a, b) => a + Math.floor(rnd(s) * (b - a + 1));
const pick = (s, a) => a[Math.floor(rnd(s) * a.length)];
const cap = t => (t ? t.charAt(0).toUpperCase() + t.slice(1) : "");
const dateStr = s => MONTHS[s.month] + " " + s.year;
const pairKey = (a, b) => (a < b ? a + "|" + b : b + "|" + a);

function log(s, txt, cat = "obecne", clans) { s.log.unshift({ y: s.year, m: s.month, txt, cat, cl: clans || null }); if (s.log.length > 1500) s.log.length = 1500; }
// zpráva, která se týká hráče (nebo je důležitá pro svět)
function news(s, txt, cat, clans) { log(s, txt, cat, clans); }

// ---------- postavy ----------
const age = (s, c) => s.year - c.by;
function st(c, k) { if (!c) return 0; let v = c[k] || 0; for (const t of c.traits || []) v += (TRAITS[t] && TRAITS[t][k]) || 0; return clamp(v, 1, 100); }
const chr = (s, id) => (id ? s.chars[id] : null);
function genName(s, cul, sex) {
  const N = NAMES[cul] || NAMES.de;
  if (sex === "f") return pick(s, FEMALE[cul] || FEMALE.de) + " " + pick(s, N.s);
  return pick(s, N.m) + " " + pick(s, N.s);
}
function makeChar(s, o) {
  const c = Object.assign({ id: "c" + s.nextId++, n: "?", sex: "m", by: START_YEAR - 30, cl: null, st: "off", loc: null, ved: 40, uda: 40, roz: 40, spr: 40, traits: [], loy: 70, rank: 0, merit: 0, c: 0, dyn: 0, father: null, spouse: null, kids: [], hp: rint(s, 60, 95), acted: -1 }, o);
  s.chars[c.id] = c; return c;
}
function genOfficer(s, cl, cul, loc, o = {}) {
  const base = () => rint(s, 22, 66);
  const c = makeChar(s, Object.assign({ n: genName(s, cul, "m"), by: s.year - rint(s, 18, 55), cl, loc, ved: base(), uda: base(), roz: base(), spr: base(), loy: rint(s, 50, 85), rank: pick(s, [0, 0, 1, 1, 1, 2, 2, 3]) }, o));
  const k = pick(s, STAT_IDS); c[k] = clamp(c[k] + rint(s, 12, 32), 1, 98);
  const nt = rint(s, 0, 2); for (let i = 0; i < nt; i++) { const t = pick(s, TRAIT_IDS); if (!c.traits.includes(t)) c.traits.push(t); }
  c.merit = RANKS[c.rank].merit + rint(s, 0, 40);
  return c;
}

// ---------- dotazy ----------
const clanProvs = (s, cid) => Object.values(s.provs).filter(p => p.owner === cid);
const officers = (s, cid) => Object.values(s.chars).filter(c => c.cl === cid && c.st === "off");
const officersIn = (s, pid) => Object.values(s.chars).filter(c => c.st === "off" && c.loc === pid && c.cl === s.provs[pid].owner);
const aliveClans = s => Object.values(s.clans).filter(c => c.alive);
const men = t => (t ? sum(TROOP_IDS.map(k => t[k] || 0)) : 0);
const P = s => s.clans[s.player];
const isPlayer = (s, cid) => cid === s.player;
const leaderOf = (s, cid) => chr(s, s.clans[cid].leader);
const clanName = (s, cid) => (s.clans[cid] ? s.clans[cid].n : cid);
const rel = (s, a, b) => (a === b ? 100 : (s.clans[a].rel[b] || 0));
function addRel(s, a, b, v) { if (a === b || !s.clans[a] || !s.clans[b]) return; s.clans[a].rel[b] = clamp((s.clans[a].rel[b] || 0) + v, -100, 100); s.clans[b].rel[a] = clamp((s.clans[b].rel[a] || 0) + v, -100, 100); }
const atWar = (s, a, b) => s.wars.some(w => (w.a === a && w.b === b) || (w.a === b && w.b === a));
const enemiesOf = (s, a) => s.wars.filter(w => w.a === a || w.b === a).map(w => (w.a === a ? w.b : w.a));
const allied = (s, a, b) => !!s.alliances[pairKey(a, b)];
const truceUntil = (s, a, b) => s.truces[pairKey(a, b)] || 0;
const hasTech = (s, cid, t) => !!s.clans[cid].techs[t];
const married = (s, a, b) => !!s.marriages[pairKey(a, b)];
function vassalsOf(s, cid) { return aliveClans(s).filter(c => c.vassalOf === cid); }
function realmProvs(s, cid) { return clanProvs(s, cid).length + sum(vassalsOf(s, cid).map(v => clanProvs(s, v.id).length)); }

// vzdálenost v km (přibližně)
function dist(a, b) { const kx = 111 * Math.cos((a.lat + b.lat) / 2 * Math.PI / 180); return Math.hypot((a.lon - b.lon) * kx, (a.lat - b.lat) * 111); }
function computeNeighbors(provs) {
  const L = Object.values(provs);
  for (const p of L) p.nb = [];
  for (const p of L) {
    const ds = L.filter(q => q !== p).map(q => [q, dist(p, q)]).sort((x, y) => x[1] - y[1]);
    ds.forEach(([q, d], i) => { if (d < 120 || (i < 3 && d < 260) || (i < 5 && d < 150)) { if (!p.nb.includes(q.id)) p.nb.push(q.id); if (!q.nb.includes(p.id)) q.nb.push(p.id); } });
  }
}

// ---------- nová hra ----------
function newGame(opts = {}) {
  const s = { v: 2, seed: (opts.seed != null ? opts.seed : (Date.now() & 0x7fffffff)) | 0, nextId: 1, turn: 0, year: (SCENARIOS[opts.scen] || SCENARIOS[1256]).year, month: 0, player: opts.clan || "premysl", opts: { scen: +(opts.scen || 1256), diff: opts.diff != null ? +opts.diff : 1, fog: opts.fog !== false },
    clans: {}, provs: {}, chars: {}, armies: [], wars: [], truces: {}, alliances: {}, marriages: {}, events: [], log: [], battles: [], history: [], flags: {}, over: null, report: [],
    hre: { king: "ext:Vilém Holandský", kingClan: null, kingDies: 0, election: null, ext: {}, emperor: null }, pope: { n: "Alexandr IV.", op: {} },
    market: { obili: 1, kone: 1, zbroj: 1 }, inflation: 1 };
  for (const c of CLANS) s.clans[c.id] = Object.assign({}, c, { alive: true, leader: null, capital: null, gold: 0, grain: 0, kone: 30, zbroj: 30, prestige: 0, piety: c.type === "dyn" ? 50 : 120, tax: 2,
    rel: {}, techs: {}, res: { cur: null, pts: 0 }, vassalOf: null, vassalSince: 0, titles: c.crown ? [c.crown] : [], excom: 0, last: {}, delegAll: false });
  for (const [id, n, lon, lat, ter, v, owner, fl, res] of PROVINCES) {
    const city = fl.includes("c"), capf = fl.includes("*"), T = TERRAIN[ter];
    const agriMax = Math.round(v * 22 * T.agri + 10), comMax = v * 12 + (city ? 25 : 0) + (res.includes("stribro") ? 10 : 0);
    s.provs[id] = { id, n, lon, lat, ter, v, owner, lord: null, pop: v * 9 + rint(s, 0, 4), agri: Math.round(agriMax * (0.45 + rnd(s) * 0.2)), agriMax, com: Math.round(comMax * (0.4 + rnd(s) * 0.2)), comMax,
      castle: capf ? 3 : v >= 4 ? 2 : 1, dur: 0, troops: { pesi: v * 220 + rint(s, 0, 150), strelci: v * 70, jizda: v * 30 + (capf ? 120 : 0), zoldneri: 0 }, train: 35 + rint(s, 0, 20), loy: 55 + rint(s, 0, 20),
      res: res.slice(), b: { mesto: city ? (v >= 5 ? 2 : 1) : 0, klaster: v >= 3 && chance(s, 0.5) ? 1 : 0, dul: res.some(r => ["stribro", "zelezo", "sul"].includes(r)) && chance(s, 0.6) ? 1 : 0, hrebcin: 0, pristav: 0, vinice: res.includes("vino") ? 1 : 0 },
      build: null, deleg: true, nb: [], spy: {}, siege: null, conq: -99, city };
    const p = s.provs[id]; p.dur = durMax(s, p); if (capf) s.clans[owner].capital = id;
  }
  computeNeighbors(s.provs);
  // historické postavy
  const byName = {};
  for (const h of HIST) {
    const C = s.clans[h.cl], loc = h.loc || C.capital;
    const st_ = h.r === "leader" || h.r === "off" ? "off" : h.r;
    const c = makeChar(s, { n: h.n, sex: h.sex || "m", by: h.by, cl: h.cl, st: st_, loc, c: h.c || 0, dyn: h.r === "leader" || h.dyn || h.r === "kid" || h.r === "fam" ? 1 : 0, rank: h.rank != null ? h.rank : (h.r === "leader" ? 4 : 0), traits: (h.t || []).slice(), loy: h.r === "leader" ? 100 : 80, hist: 1, claim: h.claim || null });
    if (h.s) [c.ved, c.uda, c.roz, c.spr] = h.s; else { c.ved = rint(s, 20, 60); c.uda = rint(s, 20, 60); c.roz = rint(s, 25, 65); c.spr = rint(s, 25, 65); }
    c.merit = RANKS[c.rank].merit + 50;
    byName[h.n] = c;
    if (h.r === "leader") C.leader = c.id;
    if (h.sp && byName[h.sp]) { c.spouse = byName[h.sp].id; byName[h.sp].spouse = c.id; }
    if (h.father && byName[h.father]) { c.father = byName[h.father].id; byName[h.father].kids.push(c.id); }
  }
  // generovaní vazalové
  for (const C of Object.values(s.clans)) {
    const ps = clanProvs(s, C.id).sort((a, b) => (b.id === C.capital) - (a.id === C.capital) || b.v - a.v);
    const n = C.type === "dyn" ? clamp(Math.round(ps.length * 1.25) + 1, 2, 22) : C.type === "order" ? 5 : ps.length + 2;
    for (let i = 0; i < n; i++) genOfficer(s, C.id, C.cul, ps[i % ps.length].id, C.type === "order" ? { c: 1, uda: rint(s, 45, 75) } : {});
    // počáteční zdroje a prestiž
    C.gold = 150 + ps.length * 90; C.grain = 200 + ps.length * 110;
    C.prestige = (C.t === "král" ? 250 : C.t === "vévoda" || C.t === "markrabě" || C.t === "arcibiskup" ? 120 : 70) + ps.length * 6;
    for (const p of ps) p.deleg = !isPlayer(s, C.id) || p.id !== C.capital;
    assignLords(s, C.id);
  }
  // potulní rytíři a učenci
  const all = Object.values(s.provs);
  for (let i = 0; i < 30; i++) { const p = pick(s, all); genOfficer(s, null, s.clans[p.owner].cul, p.id, { st: "wand", rank: 0, loy: 0 }); }
  // vztahy
  const cl = Object.values(s.clans);
  for (const a of cl) for (const b of cl) if (a.id < b.id) { let v = rint(s, -15, 15) + (a.cul === b.cul ? 10 : 0) + (a.type !== "dyn" && b.type !== "dyn" ? 15 : 0); a.rel[b.id] = v; b.rel[a.id] = v; }
  const R = (a, b, v) => { s.clans[a].rel[b] = v; s.clans[b].rel[a] = v; };
  R("premysl", "arpad", -35); R("premysl", "brandenburg", 45); R("premysl", "halic", -25); R("premysl", "wittL", -20); R("premysl", "wittH", -10); R("premysl", "rad", 40);
  R("wittH", "wittL", -30); R("arpad", "krakov", 45); R("arpad", "wittL", 45); R("arpad", "halic", 45); R("salcburk", "sponheim", 60); R("rad", "pomori", -45);
  R("brandenburg", "pomorany", -20); R("wettin", "brandenburg", -15); R("velkopolsko", "pomori", -10); R("halic", "krakov", 15); R("lehnice", "vratislav", -30); R("lehnice", "hlohov", -20);
  for (const [a, b] of [["premysl", "brandenburg"], ["arpad", "krakov"], ["arpad", "wittL"], ["arpad", "halic"]]) s.marriages[pairKey(a, b)] = true;
  s.alliances[pairKey("arpad", "halic")] = true; s.alliances[pairKey("premysl", "brandenburg")] = true;
  s.truces[pairKey("premysl", "arpad")] = 24; // mír budínský (1254)
  for (const c of cl) s.pope.op[c.id] = c.type !== "dyn" ? 60 : rint(s, 0, 30);
  s.pope.op.premysl = 45; s.pope.op.krakov = 50; s.pope.op.halic = -10;
  for (const e of EXT_ELECTORS) { s.hre.ext[e.id] = {}; for (const c of cl) s.hre.ext[e.id][c.id] = rint(s, -10, 10); }
  applyScenario(s, s.opts.scen); s.events = [];
  initEU(s);
  for (const C of Object.values(s.clans)) if (C.alive) aiOffices(s, C.id);
  if (!s.clans[s.player] || !s.clans[s.player].alive) s.player = "premysl";
  // hráč
  const pc = s.clans[s.player];
  pc.estates = {}; for (const e of ESTATE_IDS) pc.estates[e] = 55;
  pc.laws = { robota: 1, nastupnictvi: 0, mesta: 1, cirkev: 1, vojsko: 1, mince: 0 }; pc.lawCd = {}; pc.mods = []; pc.debts = [];
  pc.res.cur = "trojpole";
  log(s, `Rok ${s.year}. Ujímáš se vlády: ${leaderOf(s, s.player).n}, ${pc.t} – ${pc.n}.`, "rod", [s.player]);
  log(s, (SCENARIOS[s.opts.scen] || SCENARIOS[1256]).d + " Papežem je " + s.pope.n + ".", "svet");
  snapshot(s);
  return s;
}

// ---------- správa krajů ----------
function durMax(s, p) { return p.castle * 100 + (s && hasTechSafe(s, p.owner, "gotika") ? 50 : 0) + (s && hasTechSafe(s, p.owner, "soustredne") ? 50 : 0); }
function hasTechSafe(s, cid, t) { return !!(s.clans[cid] && s.clans[cid].techs && s.clans[cid].techs[t]); }
function assignLords(s, cid) {
  for (const p of clanProvs(s, cid)) {
    const L = chr(s, p.lord);
    if (L && L.st === "off" && L.cl === cid && L.loc === p.id) continue;
    const here = officersIn(s, p.id).filter(c => !c.c || s.clans[cid].type !== "dyn" || true);
    p.lord = here.length ? here.sort((a, b) => st(b, "spr") + st(b, "ved") - st(a, "spr") - st(a, "ved"))[0].id : null;
  }
}
function provGold(s, p) {
  const C = s.clans[p.owner]; if (!C) return 0;
  const L = chr(s, p.lord), spr = L ? st(L, "spr") : 30;
  let g = (p.com * 0.55 + p.pop * 0.18) * TAX_MULT[C.tax] * (0.5 + p.loy / 200) * (0.85 + spr / 400);
  if (hasTech(s, p.owner, "ucetnictvi")) g *= 1.1;
  g *= techGoldMult(s, p);
  g *= 1 + officeVal(s, p.owner, "komori") / 1500;
  g *= isPlayer(s, p.owner) ? diffIncome(s) : dprof(s).ai;
  if (p.cores && !p.cores.includes(p.owner)) g *= 0.5;
  g *= 1 + (C.stab || 0) * 0.05 + (hasIdea(s, p.owner, "komora") ? 0.1 : 0) + (hasIdea(s, p.owner, "mincovna") ? 0.05 : 0);
  if (isPlayer(s, p.owner)) g *= [0.85, 1, 1.25][C.laws.mesta] * (0.85 + C.estates.mestane / 333) * [1, 1.08, 1.18][C.laws.mince];
  if (p.b.vinice) g += p.b.vinice * 3;
  return g + techGoldFlat(s, p);
}
function provMines(s, p) {
  if (!p.b.dul) return { gold: 0, zbroj: 0 };
  let gold = 0, zbroj = 0; const m = (hasTech(s, p.owner, "hornictvi") ? 1.5 : 1) * (hasTechSafe(s, p.owner, "alchymie") ? 1.15 : 1);
  if (p.res.includes("stribro")) gold += 14 * p.b.dul * m * (hasTech(s, p.owner, "mince") ? 1.5 : 1);
  if (p.res.includes("sul")) gold += 7 * p.b.dul * m;
  if (p.res.includes("zelezo")) zbroj += 3 * p.b.dul * m * (hasTechSafe(s, p.owner, "vysoka_pec") ? 1.4 : 1);
  return { gold, zbroj };
}
function provHarvest(s, p) {
  let h = p.agri * 5.5 * (0.6 + p.loy / 250);
  if (hasTech(s, p.owner, "trojpole")) h *= 1.1;
  h *= techHarvestMult(s, p);
  return h * (s.flags.harvest || 1);
}
const garrisonGrain = p => men(p.troops) / 1000 * 8;
function clanGrainUse(s, cid) { return sum(clanProvs(s, cid).map(garrisonGrain)) + sum(s.armies.filter(a => a.cl === cid).map(a => men(a.t) / 1000 * 12)); }
function clanBudget(s, cid) {
  const C = s.clans[cid], ps = clanProvs(s, cid).filter(p => !p.siege && !p.occ);
  const inc = { domeny: ps.length ? 12 : 0, kraje: sum(ps.map(p => provGold(s, p))), obchod: sum(ps.map(p => routeIncomeProv(s, p))), doly: sum(ps.map(p => provMines(s, p).gold)), dan_vazalu: 0, rise: 0, cirkev: 0 };
  for (const v of vassalsOf(s, cid)) inc.dan_vazalu += sum(clanProvs(s, v.id).map(p => provGold(s, p))) * 0.15;
  if (C.vassalOf) inc.dan_vazalu -= sum(ps.map(p => provGold(s, p))) * 0.15;
  if (s.hre.kingClan === cid) inc.rise = 35;
  if (C.laws && C.laws.cirkev === 2) inc.cirkev = sum(ps.map(p => (p.b.klaster || 0) * 4 + 2));
  const offs = officers(s, cid);
  const allT = clanProvs(s, cid).map(p => p.troops).concat(s.armies.filter(a => a.cl === cid).map(a => a.t));
  const ex = { platy: sum(offs.map(c => (c.id === C.leader || c.dyn ? 0 : RANKS[c.rank].pay))), vojsko: sum(allT.map(t => sum(TROOP_IDS.map(k => (t[k] || 0) / 100 * TROOPS[k].up)))) * 1.3 * (isPlayer(s, cid) ? dprof(s).upkeep : 1), sprava: Math.max(0, clanProvs(s, cid).length - 6) ** 1.3 * 3 * (isPlayer(s, cid) ? dprof(s).upkeep : 1), dvur: 5 + (C.t === "král" ? 10 : 0), uroky: C.debts ? sum(C.debts.map(d => d.amount * d.rate)) : 0 };
  if (C.laws) ex.skoly = [0, 10, 25][lawOf(s, cid, "skoly")]; if (ex.uroky && hasTechSafe(s, cid, "dvojite_ucetnictvi")) ex.uroky *= 0.67;
  for (const k in inc) inc[k] = r1(inc[k]); for (const k in ex) ex[k] = r1(ex[k]);
  return { inc, ex, net: r1(sum(Object.values(inc)) - sum(Object.values(ex))) };
}

// síla vojska (pro odhady a umělou inteligenci)
function troopPower(s, cid, t, o = {}) {
  let p = 0; const ter = TERRAIN[o.ter || "n"];
  for (const k of TROOP_IDS) {
    const n = (t[k] || 0) / 100; if (!n) continue; const T = TROOPS[k];
    let v = o.def ? T.def : T.atk;
    if (k === "jizda") { v *= ter.cav; if (o.def && hasTechSafe(s, cid, "zbroj")) v *= 1.2; }
    if (k === "strelci" && hasTechSafe(s, cid, "kuse")) v *= 1.3;
    p += n * v;
  }
  return p * (0.5 + (o.train != null ? o.train : 50) / 100);
}
function provDefense(s, p) { return troopPower(s, p.owner, p.troops, { def: true, ter: p.ter, train: p.train }) * TERRAIN[p.ter].def * (1 + p.castle * 0.15 + p.dur / 400); }
function clanPower(s, cid) { return sum(clanProvs(s, cid).map(p => troopPower(s, cid, p.troops, { train: p.train }))) + sum(s.armies.filter(a => a.cl === cid).map(a => troopPower(s, cid, a.t, { train: a.train }))); }
function clanMen(s, cid) { return sum(clanProvs(s, cid).map(p => men(p.troops))) + sum(s.armies.filter(a => a.cl === cid).map(a => men(a.t))); }

// co hráč o cizím kraji ví
function knows(s, p) { return (s.opts && s.opts.fog === false) || p.owner === s.player || (p.spy[s.player] || 0) > s.turn || p.nb.some(n => s.provs[n].owner === s.player) || s.clans[p.owner].vassalOf === s.player || allied(s, s.player, p.owner); }
function estimate(s, p, v) { if ((s.opts && s.opts.fog === false) || p.owner === s.player || (p.spy[s.player] || 0) > s.turn) return String(Math.round(v)); const lo = Math.round(v * 0.75 / 100) * 100, hi = Math.round(v * 1.3 / 100) * 100; return `${lo}–${hi}`; }

function snapshot(s) {
  const c = P(s);
  s.history.push({ t: s.turn, d: dateStr(s), gold: Math.round(c.gold), grain: Math.round(c.grain), provs: clanProvs(s, s.player).length, realm: realmProvs(s, s.player), men: clanMen(s, s.player), offs: officers(s, s.player).length, prestige: Math.round(c.prestige), net: c.last.net || 0 });
  if (s.history.length > 600) s.history.shift();
  if (s.turn % 3 === 0) { s.worldHist = s.worldHist || []; const e = { d: MONTHS[s.month].slice(0, 3) + " " + s.year, p: {} }; for (const cl of aliveClans(s)) e.p[cl.id] = clanProvs(s, cl.id).length; s.worldHist.push(e); if (s.worldHist.length > 400) s.worldHist.shift(); }
}
