// Jádro: náhoda, postavy, založení světa, hospodářské a vojenské výpočty.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = v => Math.round(v * 10) / 10;
const sum = a => a.reduce((x, y) => x + y, 0);
function rnd(s) { let t = (s.seed = (s.seed + 0x6D2B79F5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const chance = (s, p) => rnd(s) < p;
const rint = (s, a, b) => a + Math.floor(rnd(s) * (b - a + 1));
const rrange = (s, a, b) => a + rnd(s) * (b - a);
const pick = (s, a) => a[Math.floor(rnd(s) * a.length)];
const gauss = s => Math.sqrt(-2 * Math.log(Math.max(1e-9, rnd(s)))) * Math.cos(2 * Math.PI * rnd(s));
const cap = t => (t ? t.charAt(0).toUpperCase() + t.slice(1) : "");
const pairKey = (a, b) => (a < b ? a + "|" + b : b + "|" + a);
const dateStr = s => `${monthName(s.month)}, ≈ ${s.bce} př. n. l.`;
const dateShort = (m, bce) => `${monthShort(m)} ${bce}`;

function log(s, txt, cat = "obecne", clans) { s.log.unshift({ t: s.turn, m: s.month, y: s.bce, txt, cat, cl: clans || null }); if (s.log.length > 1500) s.log.length = 1500; }

// ---------- postavy ----------
const age = (s, c) => c.by - s.bce;
function st(c, k) { if (!c) return 0; let v = c[k] || 0; for (const t of c.traits || []) v += (TRAITS[t] && TRAITS[t][k]) || 0; if (c.wound && c.wound > 0) v -= 10; return clamp(v, 1, 100); }
const chr = (s, id) => (id ? s.chars[id] : null);
function genName(s, cul, sex) {
  const N = NAMES[cul] || NAMES.eg;
  if (sex === "f") return pick(s, N.f) + ", dcera " + pick(s, N.m);
  let a = pick(s, N.m), b = pick(s, N.m); if (a === b) b = pick(s, N.m);
  if (cul === "hyk" && chance(s, 0.5)) { a = pick(s, NAMES.eg.m); }
  return a + ", syn " + b;
}
function makeChar(s, o) {
  const c = Object.assign({ id: "c" + s.nextId++, n: "?", sex: "m", by: s.bce + 30, cl: null, st: "off", loc: null, ved: 40, uda: 40, roz: 40, spr: 40, traits: [], loy: 70, rank: 0, merit: 0, dyn: 0, father: null, spouse: null, kids: [], acted: -1, army: null }, o);
  s.chars[c.id] = c; return c;
}
function genOfficer(s, cl, cul, loc, o = {}) {
  const base = () => rint(s, 22, 64);
  const c = makeChar(s, Object.assign({ n: genName(s, cul, "m"), by: s.bce + rint(s, 18, 52), cl, loc, ved: base(), uda: base(), roz: base(), spr: base(), loy: rint(s, 50, 85), rank: pick(s, [0, 0, 1, 1, 1, 2, 2, 3]) }, o));
  const k = pick(s, STAT_IDS); c[k] = clamp(c[k] + rint(s, 12, 30), 1, 96);
  const nt = rint(s, 0, 2); for (let i = 0; i < nt; i++) { const t = pick(s, TRAIT_IDS); if (!c.traits.includes(t)) c.traits.push(t); }
  c.merit = RANKS[c.rank].merit + rint(s, 0, 40);
  return c;
}

// ---------- dotazy ----------
const clanProvs = (s, cid) => Object.values(s.provs).filter(p => p.owner === cid);
const officers = (s, cid) => Object.values(s.chars).filter(c => c.cl === cid && c.st === "off");
const officersIn = (s, pid) => Object.values(s.chars).filter(c => c.st === "off" && c.loc === pid && c.cl === s.provs[pid].owner && !c.army && !c.away && !c.moving);
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
const hasTech = (s, cid, t) => !!(s.clans[cid] && s.clans[cid].techs[t]);
const married = (s, a, b) => !!s.marriages[pairKey(a, b)];
const vassalsOf = (s, cid) => aliveClans(s).filter(c => c.vassalOf === cid);
const isKmen = (s, cid) => s.clans[cid] && s.clans[cid].type === "kmen";
const coreProvs = s => Object.values(s.provs).filter(p => p.flags.includes("e"));
function realmProvs(s, cid) { return clanProvs(s, cid).length + sum(vassalsOf(s, cid).map(v => clanProvs(s, v.id).length)); }
function realmCore(s, cid) { const ids = [cid].concat(vassalsOf(s, cid).map(v => v.id)); return coreProvs(s).filter(p => ids.includes(p.owner)).length; }
const regYear = (s, cid) => Math.floor((s.turn - (s.clans[cid].reign || 0)) / 12) + 1;
function friendly(s, a, b) { if (a === b) return true; const A = s.clans[a], B = s.clans[b]; return allied(s, a, b) || A.vassalOf === b || B.vassalOf === a; }
function borderClans(s, cid) { const set = new Set(); for (const p of clanProvs(s, cid)) for (const n of p.nb) { const o = s.provs[n].owner; if (o !== cid) set.add(o); } return [...set]; }
function isBorder(s, p) { return p.nb.some(n => s.provs[n].owner !== p.owner); }
function isFront(s, p) { return p.nb.some(n => atWar(s, s.provs[n].owner, p.owner)); }

// ---------- nová hra ----------
function newGame(opts = {}) {
  const scen = SCENARIOS[opts.scen] ? opts.scen : "sip", Sc = SCENARIOS[scen];
  const s = { v: 1, seed: (opts.seed != null && opts.seed !== "" ? +opts.seed : (Date.now() & 0x7fffffff)) | 0, nextId: 1, turn: 0, month: 0, bce: Sc.bce, scen, player: opts.clan || Sc.clans[0].id,
    opts: { diff: opts.diff != null ? +opts.diff : 1, fog: opts.fog !== false }, clans: {}, provs: {}, chars: {}, armies: [], wars: [], truces: {}, alliances: {}, marriages: {}, trade: {},
    events: [], log: [], battles: [], history: [], flags: {}, over: null, flood: { h: null, next: null, hist: [] }, market: { p: 2, cap: 0 }, nextArmy: 1 };
  for (const c of Sc.clans) s.clans[c.id] = Object.assign({}, c, { provs: undefined, techs: Object.fromEntries((c.techs || []).map(t => [t, 1])), alive: true, leader: null, capital: c.cap, deben: 0, grain: 0, kone: 0, cedar: 0,
    tombN: c.tomb || "hrobka", tax: 2, rel: {}, res: { cur: null, pts: 0 }, vassalOf: c.vassalOf || null, tributeTo: null, reign: 0, tomb: { stage: 0, left: 0, active: false }, laws: { robota: 1, nomarchove: 1, chramy: 1, vojsko: 1, nastupnictvi: 0 }, lawCd: {},
    offices: {}, last: {}, medjay: !!c.medjay, census: 0, hebsed: 0, mods: [] });
  for (const C of Object.values(s.clans)) if (C.cul === "eg" || C.cul === "hyk") for (const t of OLD_TECHS) C.techs[t] = 1;
  if (scen === "sip") for (const id of ["thebes", "hyksos"]) for (const t of ["pyrmesta", "ochrana", "zlatnictvi", "papyrdilny", "osli", "tlumocnici", "sehel"]) if (id === "thebes" || t !== "sehel") s.clans[id].techs[t] = 1;
  if (scen === "sip") { for (const id of ["thebes", "hyksos"]) for (const t of ["pekarny", "pecete", "obleh", "obelisky"]) s.clans[id].techs[t] = 1; for (const t of ["zpravy", "hlidky", "usirkult"]) s.clans.thebes.techs[t] = 1; }
  const owner = {}; for (const c of Sc.clans) for (const p of c.provs) owner[p] = c.id;
  const POP_T = { udoli: 1, delta: 1, fajjum: 0.9, nubie: 0.6, katarakt: 0.5, oaza: 0.35, poust: 0.12 };
  for (const [id, n, eg, lat, lon, ter, v0, fl, res] of PROVINCES) {
    const v = (Sc.sizes && Sc.sizes[id]) || v0, T = TERRAIN[ter], o = owner[id], C = s.clans[o];
    const capf = C && C.cap === id, city = fl.includes("c") || capf;
    const agriBase = scen === "fip" ? rint(s, 34, 50) : rint(s, 44, 60), comMax = 20 + v * 8 + (city ? 15 : 0);
    const p = s.provs[id] = { id, n, eg, lat, lon, ter, v, owner: o, lord: null, flags: fl, coast: fl.includes("k"), res: res.slice(), god: GODS[id] || "místní bůh",
      pop: r1(v * 12 * POP_T[ter] + rint(s, 0, 3) * POP_T[ter]), agri: T.agri > 0.3 ? agriBase : 30, com: Math.round(comMax * (0.35 + rnd(s) * 0.2)), comMax,
      castle: capf ? 3 : fl.includes("f") ? 2 : v >= 4 ? 2 : 1, dur: 0, troops: {}, train: 30 + rint(s, 0, 20), loy: 55 + rint(s, 0, 20), stock: 0, hunger: 0,
      b: { pevnost: 0, chram: v >= 3 || fl.includes("h") ? 1 : 0, sypka: city ? 1 : 0, dilny: city ? 1 : 0, pristav: 0, lom: res.some(r => RES[r].mine) && chance(s, 0.5) ? 1 : 0 },
      build: null, deleg: true, nb: [], spy: {}, siege: null, conq: -99, unrest: 0 };
    if (C && C.type === "kmen") { p.troops = { kopinici: Math.round(v * 220 + 100), lucistnici: Math.round(v * 260 + 120) }; p.train = 45; }
    else {
      const k = scen === "sip" ? 1.15 : 1;
      p.troops = { kopinici: Math.round((v * 200 + rint(s, 0, 120)) * k), lucistnici: Math.round((v * 90 + rint(s, 0, 60)) * k) };
      if (capf) { p.troops.kopinici += 300; p.troops.lucistnici += 200; }
      if (C && hasTech(s, o, "vuz") && (ter === "delta" || capf)) p.troops.vozy = v * 30 + (capf ? 200 : 0);
      if (C && C.cul === "nub") p.troops.lucistnici += v * 80;
    }
    p.stock = Math.round(p.pop * 1000 * 0.8);
    p.dur = durMax(s, p);
  }
  for (const [a, b] of EDGES) { s.provs[a].nb.push(b); s.provs[b].nb.push(a); }
  // historické postavy
  const byName = {};
  for (const h of Sc.hist) {
    const C = s.clans[h.cl], loc = h.loc || C.capital, st_ = h.r === "leader" || h.r === "off" ? "off" : h.r;
    const c = makeChar(s, { n: h.n, sex: h.sex || "m", by: h.by, cl: h.cl, st: st_, loc, dyn: h.r === "leader" || h.dyn || h.r === "kid" || h.r === "fam" ? 1 : 0, rank: h.rank != null ? h.rank : (h.r === "leader" ? 4 : 0), traits: (h.t || []).slice(), loy: h.r === "leader" ? 100 : 82, hist: 1, note: h.note || "" });
    if (h.cl === "thebes" && h.n === "Ahmose, syn Ebany") c.dyn = 0;
    if (h.s) [c.ved, c.uda, c.roz, c.spr] = h.s; else { c.ved = rint(s, 20, 60); c.uda = rint(s, 20, 60); c.roz = rint(s, 25, 65); c.spr = rint(s, 25, 65); }
    c.merit = RANKS[c.rank].merit + 50; byName[h.n] = c;
    if (h.r === "leader") C.leader = c.id;
    if (h.sp && byName[h.sp]) { c.spouse = byName[h.sp].id; byName[h.sp].spouse = c.id; }
    if (h.father && byName[h.father]) { c.father = byName[h.father].id; byName[h.father].kids.push(c.id); }
  }
  for (const C of Object.values(s.clans)) {
    const ps = clanProvs(s, C.id).sort((a, b) => (b.id === C.capital) - (a.id === C.capital) || b.v - a.v);
    // vládce tam, kde ho historie nezná
    if (!C.leader) {
      const L = makeChar(s, { n: pick(s, (SON_NAMES[C.cul] || SON_NAMES.eg)) + (C.type === "kmen" ? ", náčelník" : ""), by: s.bce + rint(s, 30, 48), cl: C.id, st: "off", loc: C.capital, dyn: 1, rank: 4, loy: 100, ved: rint(s, 40, 70), uda: rint(s, 40, 70), roz: rint(s, 35, 65), spr: rint(s, 35, 65) });
      L.merit = 900; C.leader = L.id;
    }
    const L = leaderOf(s, C.id);
    if (C.type !== "kmen") {
      if (!L.spouse && age(s, L) >= 18 && !Sc.hist.some(h => h.cl === C.id && h.r === "fam")) { const w = makeChar(s, { n: genName(s, C.cul, "f"), sex: "f", by: L.by - rint(s, 3, 12), cl: C.id, st: "fam", loc: C.capital, dyn: 1 }); w.spouse = L.id; L.spouse = w.id; }
      if (!L.kids.length && L.spouse && !Sc.hist.some(h => h.cl === C.id && (h.r === "kid" || h.father))) for (let i = 0; i < rint(s, 1, 3); i++) { const sx = chance(s, 0.5) ? "m" : "f", k = makeChar(s, { n: sx === "m" ? pick(s, SON_NAMES[C.cul] || SON_NAMES.eg) : genName(s, C.cul, "f").split(",")[0], sex: sx, by: s.bce + rint(s, 1, 16), cl: C.id, st: "kid", loc: C.capital, dyn: 1, father: L.id }); for (const kk of STAT_IDS) k[kk] = rint(s, 20, 60); L.kids.push(k.id); }
    }
    const n = C.type === "dyn" ? clamp(Math.round(ps.length * 1.1) + 1, 3, 22) : C.type === "nom" ? ps.length + 2 : ps.length + 1;
    const have = officers(s, C.id).length - 1;
    for (let i = Math.max(0, have); i < n; i++) genOfficer(s, C.id, C.cul, ps[i % ps.length].id);
    C.deben = 3000 + ps.length * 700; C.grain = 40000 + ps.length * 12000;
    if (hasTech(s, C.id, "vuz")) C.kone = 600;
    for (const p of ps) p.deleg = !isPlayer(s, C.id) || p.id !== C.capital;
    assignLords(s, C.id);
  }
  // zásoby obilí do první sklizně (sklizeň je v 1. měsíci období šemu)
  for (const C of Object.values(s.clans)) C.grain = Math.max(C.grain, Math.round(-clanBudget(s, C.id).gnet * 11 + clanProvs(s, C.id).length * 4000));
  // potulní muži
  const all = Object.values(s.provs).filter(p => !isKmen(s, p.owner));
  for (let i = 0; i < 16; i++) { const p = pick(s, all); genOfficer(s, null, s.clans[p.owner].cul, p.id, { st: "wand", rank: 0, loy: 0 }); }
  // vztahy
  const cl = Object.values(s.clans);
  for (const a of cl) for (const b of cl) if (a.id < b.id) { let v = rint(s, -15, 15) + (a.cul === b.cul ? 10 : -5); a.rel[b.id] = v; b.rel[a.id] = v; }
  for (const [a, b, v] of Sc.rel || []) { s.clans[a].rel[b] = v; s.clans[b].rel[a] = v; }
  for (const [a, b] of Sc.alliances || []) s.alliances[pairKey(a, b)] = true;
  for (const [a, b] of Sc.tribute || []) s.clans[a].tributeTo = b;
  for (const [a, b] of Sc.wars || []) s.wars.push({ a, b, start: 0 });
  for (const C of cl) { if (C.vassalOf) addRel(s, C.id, C.vassalOf, 0); }
  if (!s.clans[s.player] || s.clans[s.player].type === "kmen") s.player = Sc.clans[0].id;
  const pc = P(s);
  pc.estates = {}; for (const e of ESTATE_IDS) pc.estates[e] = 55;
  for (const C of cl) if (C.type !== "kmen") aiOffices(s, C.id);
  s.flood.next = rollFlood(s);
  log(s, `Ujímáš se vlády: ${leaderOf(s, s.player).n}, ${pc.t} – ${pc.n} (${pc.house}).`, "rod", [s.player]);
  log(s, Sc.d, "svet");
  snapshot(s);
  return s;
}

// ---------- záplava a úroda ----------
function rollFlood(s) { const Sc = SCENARIOS[s.scen]; return r1(clamp(15.4 + (Sc.climate || 0) + gauss(s) * 1.55, 9, 20.5)); }
// Plinius (Přírodopis 5,58): 12 loktů hlad, 13 nouze, 14 radost, 15 bezpečí, 16 hojnost. Víc znamená škody.
const FLOOD_PTS = [[9, 0.25], [11, 0.4], [12, 0.55], [13, 0.72], [14, 0.88], [15, 0.98], [16, 1.08], [17, 1.02], [18, 0.85], [19, 0.65], [21, 0.45]];
function floodFactor(h) {
  if (h == null) return 1;
  for (let i = 1; i < FLOOD_PTS.length; i++) { const [x0, y0] = FLOOD_PTS[i - 1], [x1, y1] = FLOOD_PTS[i]; if (h <= x1) return y0 + (y1 - y0) * clamp((h - x0) / (x1 - x0), 0, 1); }
  return FLOOD_PTS[FLOOD_PTS.length - 1][1];
}
function floodWord(h) { if (h == null) return "neznámá"; return h < 12 ? "hladová" : h < 13 ? "nouzová" : h < 14 ? "slabá" : h < 15 ? "dobrá" : h < 17 ? "hojná" : h < 18 ? "vysoká" : "ničivá"; }
const PASTORAL = { udoli: 0.2, delta: 0.45, fajjum: 0.35, nubie: 1.6, katarakt: 1.4, oaza: 1.4, poust: 3.0 };
const NEED_PER_PERSON = 3.2; // charů obilí na osobu a rok
function agriCap(s, p) { let m = 60; const o = p.owner; if (hasTech(s, o, "hraze") && (p.ter === "udoli" || p.ter === "delta")) m += 10; if (hasTech(s, o, "fajjum")) m += p.ter === "fajjum" ? 30 : 5; return m + (typeof monAgri === "function" ? monAgri(s, p) : 0) + (o && s.clans[o] && stateGod(s, o) === "sobek" && (p.ter === "fajjum" || p.ter === "delta") ? 5 : 0); }
function comCap(s, p) { let m = p.comMax + (p.b.dilny || 0) * 20 + (p.b.pristav || 0) * 15; if (hasTech(s, p.owner, "fajans") && p.flags.includes("c")) m += 5; if (p.id === "u1" && hasTech(s, p.owner, "sehel")) m += 5; if (p.owner && s.clans[p.owner] && stateGod(s, p.owner) === "ptah") m += 4; return m; }
function provHarvest(s, p, h) {
  const T = TERRAIN[p.ter], f = T.nile ? floodFactor(h != null ? h : s.flood.h) : (p.ter === "oaza" ? 0.95 : 0.7);
  return p.pop * 1000 * 5 * (p.agri / 50) * T.agri * f * (0.75 + p.loy / 400) * (p.siege ? 0.3 : 1);
}
const provFood = (s, p, h) => provHarvest(s, p, h) + p.pop * 1000 * PASTORAL[p.ter];
const provNeed = p => p.pop * 1000 * NEED_PER_PERSON;
function taxMult(s, cid) {
  const C = s.clans[cid]; let m = 1;
  if (hasTech(s, cid, "katastr")) m *= 1.1;
  if (C.census > s.turn) m *= 1.12;
  m *= 1 + officeVal(s, cid, "sypky") / 1200 + officeVal(s, cid, "vezir") / 2500;
  m *= [0.95, 1, 1.08][C.laws.nomarchove];
  if (stateGod(s, cid) === "herisef") m *= 1.04;
  if (isPlayer(s, cid)) m *= diffIncome(s);
  return m;
}
function provTax(s, p, h) { const C = s.clans[p.owner]; return provFood(s, p, h) * TAX_RATE[C.tax != null ? C.tax : 2] * taxMult(s, p.owner) * (0.6 + p.loy / 250); }
function diffIncome(s) { return [1.25, 1, 0.85][s.opts.diff] || 1; }

// ---------- debeny ----------
function provDeben(s, p) {
  const C = s.clans[p.owner]; if (!C || p.siege) return 0;
  const L = chr(s, p.lord), spr = L ? st(L, "spr") : 30;
  let g = (40 + p.com * 4 + p.pop * 1.5) * (0.55 + p.loy / 220) * (0.85 + spr / 400);
  if (hasTech(s, p.owner, "pisari")) g *= 1.1;
  if (hasTech(s, p.owner, "vcelarstvi")) g *= 1.04; if (hasTech(s, p.owner, "tkalci")) g *= 1.05; if (hasTech(s, p.owner, "pecete")) g *= 1.03;
  g *= 1 + officeVal(s, p.owner, "pokladnik") / 800;
  g *= [0.92, 1, 1.1][C.laws.nomarchove];
  if (isPlayer(s, p.owner)) g *= diffIncome(s) * (0.9 + (C.estates ? C.estates.pisari : 50) / 500);
  if (p.unrest > s.turn) g *= 0.5;
  return g;
}
function provRes(s, p) {
  let g = 0;
  for (const r of p.res) { const R = RES[r]; if (!R) continue; g += (R.mine ? R.deben * (p.b.lom || 0) : R.deben) * (r === "vino" && hasTech(s, p.owner, "vinarstvi") ? 2 : 1) * (r === "papyrus" && hasTech(s, p.owner, "papyrdilny") ? 2 : 1); }
  return p.siege ? 0 : g;
}
function clanBudget(s, cid) {
  const C = s.clans[cid], ps = clanProvs(s, cid);
  const inc = { zupy: sum(ps.map(p => provDeben(s, p))), suroviny: sum(ps.map(p => provRes(s, p))), obchod: 0, tribut: 0, chramy: 0 };
  const nTrade = aliveClans(s).filter(x => s.trade[pairKey(cid, x.id)]).length; inc.obchod = (inc.zupy) * 0.04 * nTrade;
  inc.cesty = typeof routeIncome === "function" ? routeIncome(s, cid) : 0;
  if (C.laws.chramy === 2) inc.chramy = sum(ps.map(p => (p.b.chram || 0) * 120));
  for (const v of vassalsOf(s, cid)) inc.tribut += sum(clanProvs(s, v.id).map(p => provDeben(s, p))) * 0.12;
  for (const x of aliveClans(s)) if (x.tributeTo === cid) inc.tribut += sum(clanProvs(s, x.id).map(p => provDeben(s, p))) * 0.1;
  const allT = ps.map(p => p.troops).concat(s.armies.filter(a => a.cl === cid).map(a => a.t));
  const offs = officers(s, cid);
  const ex = { dvur: 30 + (C.t === "král" ? Math.min(170, ps.length * 45) : 0), platy: sum(offs.map(c => (c.id === C.leader ? 0 : c.rank * 10))), vojsko: Math.round(sum(allT.map(t => men(t) * 0.04 + (t.vozy || 0) * 0.4))), zoldneri: sum(allT.map(t => (t.medzajove || 0) * TROOPS.medzajove.upd)),
    stavby: sum(ps.map(p => (p.b.chram || 0) * 30 + Math.max(0, p.castle - 1) * 10)) + (C.laws.chramy === 0 ? sum(ps.map(p => (p.b.chram || 0) * 40)) : 0), tribut: 0 };
  if (C.type === "kmen") { ex.platy = 0; ex.vojsko = 0; ex.stavby = 0; }
  if (C.vassalOf) ex.tribut += inc.zupy * 0.12;
  if (C.tributeTo) ex.tribut += inc.zupy * 0.1;
  for (const k in inc) inc[k] = Math.round(inc[k]); for (const k in ex) ex[k] = Math.round(ex[k]);
  const net = sum(Object.values(inc)) - sum(Object.values(ex));
  // obilí za měsíc
  const soldiers = sum(allT.map(men));
  const gex = { vojsko: Math.round(soldiers * RATION_SOLDIER * (C.cul === "eg" || C.cul === "hyk" ? 1 : 0.5) * (hasTech(s, cid, "pekarny") ? 0.9 : 1)), urednici: sum(offs.map(c => (c.id === C.leader ? 0 : RANKS[c.rank].pay))), dvur: 300 + ps.length * 100 + (C.t === "král" ? Math.min(1000, ps.length * 250) : 0), ztraty: Math.round(C.grain * spoilRate(s, cid)) };
  return { inc, ex, net, gex, gnet: -sum(Object.values(gex)) };
}
function spoilRate(s, cid) { const lv = sum(clanProvs(s, cid).map(p => p.b.sypka || 0)); return Math.max(0.003, 0.012 - lv * 0.0012 - officeVal(s, cid, "sypky") / 10000 - (hasTech(s, cid, "klenba") ? 0.002 : 0)); }
function yearTaxEstimate(s, cid, h) { return sum(clanProvs(s, cid).map(p => provTax(s, p, h))); }

// ---------- úřady ----------
function officeHolder(s, cid, k) { const C = s.clans[cid]; const c = chr(s, C.offices && C.offices[k]); return c && c.st === "off" && c.cl === cid ? c : null; }
function officeVal(s, cid, k) { const c = officeHolder(s, cid, k); if (!c) return 0; let v = st(c, OFFICES[k].stat); if (k === "vezir" && hasTech(s, cid, "vezir")) v *= 1.3; return v; }
function setOffice(s, cid, k, id) { const C = s.clans[cid]; for (const kk in C.offices) if (C.offices[kk] === id) C.offices[kk] = null; C.offices[k] = id || null; }
function aiOffices(s, cid) {
  const offs = officers(s, cid).filter(c => !c.army); const used = new Set();
  for (const [k, O] of Object.entries(OFFICES)) { const best = offs.filter(c => !used.has(c.id)).sort((a, b) => st(b, O.stat) - st(a, O.stat))[0]; if (best) { s.clans[cid].offices[k] = best.id; used.add(best.id); } }
}

// ---------- správa nomů ----------
function durMax(s, p) { return p.castle * 100 + (hasTech(s, p.owner, "pevnosti") ? 50 : 0); }
function assignLords(s, cid) {
  for (const p of clanProvs(s, cid)) {
    const L = chr(s, p.lord);
    if (L && L.st === "off" && L.cl === cid && L.loc === p.id && !L.army && !L.away) continue;
    const here = officersIn(s, p.id).filter(c => c.id !== s.clans[cid].leader || !p.lord);
    p.lord = here.length ? here.sort((a, b) => st(b, "spr") + st(b, "ved") - st(a, "spr") - st(a, "ved"))[0].id : null;
  }
}
function troopCap(p) { return Math.round(p.pop * 1000 * 0.035 + p.castle * 200); }
function costMult(s, cid) { const C = s.clans[cid]; let m = [1.15, 1, 0.85][C.laws.robota]; if (hasTech(s, cid, "kamenictvi")) m *= 0.8; return m; }
function buildLevel(p, b) { return b === "pevnost" ? p.castle : (p.b[b] || 0); }
function buildCost(s, cid, b, p) { const B = BUILD[b], lvl = buildLevel(p, b) - (b === "pevnost" ? 1 : 0), k = (1 + Math.max(0, lvl) * 0.5) * costMult(s, cid) * (p.res.includes("kamen") ? 0.9 : 1); return { deben: Math.round(B.cost * k), grain: Math.round(B.grain * k) }; }
function canBuild(s, cid, p, b) {
  const B = BUILD[b]; if (p.owner !== cid) return "Nom ti nepatří.";
  if (p.build) return "V nomu se už staví.";
  if (buildLevel(p, b) >= B.max) return "Nejvyšší úroveň.";
  if (B.need && !B.need(p)) return "V tomto nomu nelze.";
  const c = buildCost(s, cid, b, p), C = s.clans[cid];
  if (C.deben < c.deben) return `Nedostatek debenů (${c.deben}).`;
  if (C.grain < c.grain) return `Nedostatek obilí pro robotníky (${c.grain}).`;
  return null;
}
function recruitCost(s, cid, type, n) {
  const C = s.clans[cid], lawM = type === "medzajove" ? 1 : [0.7, 1, 1.3][C.laws.vojsko];
  return { deben: Math.round(TROOPS[type].cost * n / 100 * lawM), horses: TROOPS[type].horses ? Math.ceil(TROOPS[type].horses * n / 100) : 0 };
}
function canRecruitType(s, cid, p, type) {
  if (type === "vozy" && !hasTech(s, cid, "vuz")) return "Chybí vědění Válečný vůz a kůň.";
  if (type === "medzajove" && !s.clans[cid].medjay && !p.flags.includes("m")) return "Nemáš spojení s Médžaji (získáš je v nomu s Médžaji nebo nabídkou jejich náčelníků).";
  return null;
}
function maxRecruit(s, p, c) { return Math.max(0, Math.min(troopCap(p) - men(p.troops), 150 + st(c, "ved") * 10)); }

// ---------- síla vojska ----------
function troopPower(s, cid, t, o = {}) {
  let pw = 0; const ter = TERRAIN[o.ter || "udoli"], C = s.clans[cid] || {};
  for (const k of TROOP_IDS) {
    const n = (t[k] || 0) / 100; if (!n) continue; const T = TROOPS[k];
    let v = o.def ? T.def : T.atk;
    if (!o.def) {
      if ((k === "kopinici" || k === "lucistnici") && hasTech(s, cid, "bronz")) v *= 1.15;
      if (k === "kopinici" && hasTech(s, cid, "chopes")) v *= 1.2;
      if ((k === "lucistnici" || k === "medzajove") && hasTech(s, cid, "luk")) v *= 1.3;
      if (k === "lucistnici" && C.cul === "nub") v *= 1.2;
    } else if (hasTech(s, cid, "zbroj")) v *= 1.15;
    if (k === "vozy") v *= ter.vuz;
    pw += n * v;
  }
  return pw * (0.5 + (o.train != null ? o.train : 50) / 100);
}
function fortMult(s, p) { return 1 + p.castle * 0.18 * (hasTech(s, p.owner, "pevnosti") ? 1.25 : 1) + p.dur / 500; }
function provDefense(s, p) { return troopPower(s, p.owner, p.troops, { def: true, ter: p.ter, train: p.train }) * TERRAIN[p.ter].def * fortMult(s, p); }
function clanPower(s, cid) { return sum(clanProvs(s, cid).map(p => troopPower(s, cid, p.troops, { train: p.train }))) + sum(s.armies.filter(a => a.cl === cid).map(a => troopPower(s, cid, a.t, { train: a.train }))); }
function realmPower(s, cid) { return clanPower(s, cid) + sum(vassalsOf(s, cid).map(v => clanPower(s, v.id) * 0.6)); }
function clanMen(s, cid) { return sum(clanProvs(s, cid).map(p => men(p.troops))) + sum(s.armies.filter(a => a.cl === cid).map(a => men(a.t))); }

// co hráč o cizí nomu ví
function knows(s, p) { return s.opts.fog === false || p.owner === s.player || (p.spy[s.player] || 0) > s.turn || p.nb.some(n => s.provs[n].owner === s.player) || s.clans[p.owner].vassalOf === s.player || allied(s, s.player, p.owner) || (hasTech(s, s.player, "zpravy") && p.nb.some(n => s.provs[n].nb.some(m => s.provs[m].owner === s.player))); }
function estimate(s, p, v) { if (s.opts.fog === false || p.owner === s.player || (p.spy[s.player] || 0) > s.turn) return String(Math.round(v)); const lo = Math.round(v * 0.75 / 100) * 100, hi = Math.round(v * 1.3 / 100) * 100; return `${lo}–${hi}`; }

function snapshot(s) {
  const c = P(s); if (!c) return;
  s.history.push({ t: s.turn, d: dateShort(s.month, s.bce), deben: Math.round(c.deben), grain: Math.round(c.grain), provs: clanProvs(s, s.player).length, men: clanMen(s, s.player), maat: Math.round(c.maat), prestige: Math.round(c.prestige), net: c.last.net || 0 });
  if (s.history.length > 600) s.history.shift();
  if (s.turn % 3 === 0) { s.worldHist = s.worldHist || []; const e = { d: dateShort(s.month, s.bce), p: {} }; for (const cl of aliveClans(s)) e.p[cl.id] = clanProvs(s, cl.id).length; s.worldHist.push(e); if (s.worldHist.length > 400) s.worldHist.shift(); }
}
