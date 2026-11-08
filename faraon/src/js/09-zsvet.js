// Svět kolem hráče: cíle soupeřů a jejich vítězství, rody úředníků a dědění úřadů, trh v čase,
// výzvědná síť, místní svátky nomů, zajímavější hlad, nájezdy hratelných kmenů, verze uložené hry.

// ---------- verze uložené hry ----------
const SAVE_V = 2;
function migrate(s) {
  if (!s || !s.provs || !s.clans) return null;
  if (!s.v) s.v = 1;
  if (s.v > SAVE_V) return null;
  if (s.v < 2) {
    // v1 → v2: trh v čase, zvědové, rody úředníků, osobní bitvy
    s.market = Object.assign({ p: 2, cap: 0 }, s.market); s.market.base = s.market.base || s.market.p; s.market.hist = s.market.hist || []; s.market.short = s.market.short || 0; s.market.press = s.market.press || 0;
    s.spynet = s.spynet || {}; s.fspies = s.fspies || []; s.pb = null; s.events = (s.events || []).filter(e => EVENTS[e.k]);
    for (const a of s.armies) a.hold = 0;
    if (!s.provs.sar) addProvSar(s);
    s.v = 2;
  }
  for (const C of Object.values(s.clans)) if (C.laws) for (const k of Object.keys(LAWS)) if (C.laws[k] == null) C.laws[k] = 1;
  ensureRods(s);
  return s;
}
// Šaruhen do starších uložených her (připojí se k pánovi Sinaje)
function addProvSar(s) {
  const row = PROVINCES.find(r => r[0] === "sar"); if (!row) return; const [id, n, eg, lat, lon, ter, v, fl, res] = row, o = s.provs.sin.owner;
  s.provs.sar = { id, n, eg, lat, lon, ter, v, owner: o, lord: null, flags: fl, coast: false, res: res.slice(), god: GODS[id] || "místní bůh", pop: 6, agri: 40, com: 20, comMax: 45, castle: 2, dur: 0, troops: { kopinici: 400, lucistnici: 300 }, train: 40, loy: 60, stock: 5000, hunger: 0,
    b: { pevnost: 0, chram: 0, sypka: 1, dilny: 1, pristav: 0, lom: 0 }, build: null, deleg: true, nb: [], spy: {}, siege: null, conq: -99, unrest: 0 };
  for (const [a, b] of EDGES) if (a === "sar" || b === "sar") { s.provs[a].nb.includes(b) || s.provs[a].nb.push(b); s.provs[b].nb.includes(a) || s.provs[b].nb.push(a); }
  s.provs.sar.dur = durMax(s, s.provs.sar);
}

// ---------- cíle soupeřů ----------
// provs: nomy, které chce rod držet (sám nebo přes vazaly); unify: sjednotit 80 % egyptského jádra.
const GOALS = {
  sip: { thebes: { t: "Vyhnat Hyksósy a dobýt Avaris", provs: ["lav", "l1", "u15"], foe: "hyksos" }, hyksos: { t: "Udržet Deltu a Memfis, s Kuší sevřít Théby", provs: ["lav", "l1", "fa", "u15"], foe: "thebes" }, kush: { t: "Ovládnout Elefantinu a celou Dolní Núbii", provs: ["u1", "n_wawat", "n_buhen"], foe: "thebes" } },
  ahm: { thebes: { t: "Dobýt Avaris a Šaruhen", provs: ["lav", "sar", "l1"], foe: "hyksos" }, hyksos: { t: "Ubránit Avaris a Šaruhen", provs: ["lav", "sar", "l1", "l14"], foe: "thebes" }, kush: { t: "Udržet Dolní Núbii s pevností Buhen a získat Elefantinu", provs: ["n_wawat", "n_buhen", "u1"], foe: "thebes" } },
  hyk: { hyksos: { t: "Dobýt Memfis a Itjtaui a vládnout Egyptu", unify: 1, provs: ["l1", "u22"], foe: "it13" }, it13: { t: "Udržet Memfis a Itjtaui proti Hyksósům", provs: ["l1", "u22", "fa"], foe: "hyksos" }, thebes: { t: "Ovládnout Horní Egypt od Elefantiny po Abydos", provs: ["u1", "u8", "u4"], foe: "abydos" }, abydos: { t: "Udržet Abydos a Thinis", provs: ["u8"], foe: "thebes" }, kush: { t: "Dobýt Dolní Núbii a vyplenit Elkab", provs: ["n_wawat", "n_buhen", "u3"], foe: "thebes" } },
  fip: { herak: { t: "Podrobit si Théby", unify: 1, provs: ["u4"], foe: "thebes" }, thebes: { t: "Sjednotit Horní Egypt a táhnout na sever", unify: 1, provs: ["u13", "u20"], foe: "herak" } },
  anch: { herak: { t: "Udržet svrchovanost nad nomy jihu", provs: ["u2", "u4", "u20"], foe: "thebes" }, thebes: { t: "Ovládnout jih od Elefantiny po Abydos", provs: ["u1", "u2", "u8"], foe: "anch" } },
  mt2: { thebes: { t: "Sjednotit Obě země (sema-taui)", unify: 1, provs: ["u20", "l1"], foe: "herak" }, herak: { t: "Udržet Thinis a Asjút proti Thébám", provs: ["u8", "u13"], foe: "thebes" } },
};
function goalOf(s, cid) {
  const C = s.clans[cid]; if (!C) return null; const G = (GOALS[s.scen] || {})[cid]; if (G) return G;
  if (C.t === "král" && C.cul === "eg") return { t: "Sjednotit Obě země", unify: 1, provs: [] };
  return null;
}
function goalProgress(s, cid) {
  const G = goalOf(s, cid); if (!G) return null; const ids = [cid].concat(vassalsOf(s, cid).map(v => v.id));
  const held = G.provs.filter(id => s.provs[id] && ids.includes(s.provs[id].owner)).length, core = coreProvs(s).length, mine = realmCore(s, cid);
  const pctP = G.provs.length ? held / G.provs.length : 1, pctU = G.unify ? Math.min(1, mine / Math.ceil(core * 0.8)) : 1;
  return { t: G.t, pct: Math.round((G.unify && G.provs.length ? (pctP * 0.3 + pctU * 0.7) : G.unify ? pctU : pctP) * 100), held, need: G.provs.length, unify: !!G.unify, core: mine, coreN: core };
}
// AI táhne přednostně proti rodu, který mu stojí v cestě k cíli
function goalWeight(s, cid, o) {
  const G = goalOf(s, cid); if (!G) return 1;
  if (G.foe === o) return 2; if (G.provs.some(id => s.provs[id] && s.provs[id].owner === o)) return 1.6; return 1;
}
function goalsTick(s) {
  for (const C of aliveClans(s)) {
    if (isPlayer(s, C.id)) continue; const g = goalProgress(s, C.id); if (!g) continue;
    s.flags.goal = s.flags.goal || {};
    if (g.pct >= 100 && !g.unify && !s.flags.goal[C.id]) { s.flags.goal[C.id] = 1; C.prestige += 60; log(s, `${C.n} dosáhl svého cíle: ${g.t}.`, "valka", [C.id]); }
    if (g.unify && g.core >= Math.ceil(g.coreN * 0.6) && g.core > ((s.flags.core0 || {})[C.id] || 0) + 1 && !s.flags.goal["w" + C.id] && P(s) && (P(s).cul === "eg" || P(s).cul === "hyk")) { s.flags.goal["w" + C.id] = 1; queueEvent(s, "hrozba", { cl: C.id }); }
  }
}
// soupeř sjednotil Egypt: egyptský či hyksóský hráč prohrává
function checkEndAI(s) {
  if (s.over) return; const C = P(s); if (!C || !C.alive || !(C.cul === "eg" || C.cul === "hyk")) return;
  const core = coreProvs(s).length;
  // výchozí stav: rod, který už na začátku (třeba jen přes vazaly) drží většinu země, musí svou moc ještě rozšířit
  if (!s.flags.core0) { s.flags.core0 = {}; for (const O of aliveClans(s)) s.flags.core0[O.id] = realmCore(s, O.id); }
  for (const O of aliveClans(s)) {
    if (isPlayer(s, O.id) || O.t !== "král" || !(O.cul === "eg" || O.cul === "hyk")) continue;
    const rc = realmCore(s, O.id), own = coreProvs(s).filter(p => p.owner === O.id).length;
    if (rc >= Math.max(Math.ceil(core * 0.8), (s.flags.core0[O.id] || 0) + 6) && own >= Math.ceil(core * 0.7) && C.vassalOf !== O.id) {
      s.over = { win: false, txt: `${O.n} (${O.house}) ovládl ${realmCore(s, O.id)} z ${core} nomů egyptského jádra a nasadil si dvojitou korunu. Tvůj rod ${C.house} zůstal stranou – dějiny teď píše někdo jiný.` };
      queueEvent(s, "vitezstvi", { win: false, txt: s.over.txt }); return;
    }
  }
}
// kmen (Médžajové, Tjehenu) vítězí slávou nebo zemí
function checkEndKmen(s) {
  const C = P(s); if (!C || !C.alive || C.type !== "kmen" || s.flags.won) return;
  if (C.prestige >= 450 || clanProvs(s, s.player).length >= 4) {
    s.flags.won = 1; s.over = { win: true, cont: true, txt: `${C.n} jsou postrachem i vítanými spojenci. ${C.prestige >= 450 ? "Sláva tvých bojovníků se nese od pouště až ke dvoru králů." : "Tvé kmeny ovládají " + clanProvs(s, s.player).length + " krajů."} Médžajové se později v Nové říši stali egyptskou policií a strážci pohřebišť – tvůj lid si své místo vybojoval.` };
    queueEvent(s, "vitezstvi", { win: true, txt: s.over.txt });
  }
}

// ---------- rody úředníků ----------
const rodOf = c => c.rod || (c.n || "?").split(",")[0].trim();
function ensureRods(s) {
  for (const c of Object.values(s.chars)) if (!c.dyn && !c.rod && c.st !== "dead") { const f = chr(s, c.father); c.rod = f && f.rod ? f.rod : (c.n || "?").split(",")[0].trim(); }
}
function rodsOf(s, cid) {
  const R = {};
  for (const c of officers(s, cid)) {
    if (c.dyn) continue; const k = rodOf(c); const r = R[k] || (R[k] = { n: k, m: [], provs: [], offs: [], loy: 0, pow: 0 });
    r.m.push(c); r.loy += c.loy; r.pow += c.rank + 1;
  }
  for (const p of clanProvs(s, cid)) { const L = chr(s, p.lord); if (L && !L.dyn && R[rodOf(L)]) R[rodOf(L)].provs.push(p.id); }
  const C = s.clans[cid]; for (const k in C.offices || {}) { const c = chr(s, C.offices[k]); if (c && !c.dyn && R[rodOf(c)]) R[rodOf(c)].offs.push(k); }
  return Object.values(R).map(r => (r.loy = Math.round(r.loy / r.m.length), r.pow += r.provs.length * 2 + r.offs.length * 2, r)).sort((a, b) => b.pow - a.pow);
}
function inheritPrep(s, c) {
  if (c.dyn || !c.cl || !s.clans[c.cl] || s.clans[c.cl].type === "kmen" || c.st !== "off") return null;
  const C = s.clans[c.cl], provs = Object.values(s.provs).filter(p => p.lord === c.id).map(p => p.id), offs = Object.keys(C.offices || {}).filter(k => C.offices[k] === c.id);
  if (!provs.length && !offs.length && c.rank < 2) return null;
  return { provs, offs, rank: c.rank, cl: c.cl };
}
function inheritApply(s, c, inh) {
  const C = s.clans[inh.cl]; if (!C || !C.alive) return;
  const priv = C.rodPriv && C.rodPriv[rodOf(c)], pr = priv ? 1 : [0.9, 0.45, 0.15][lw(s, inh.cl, "nomarchove")];
  if (!chance(s, pr)) return;
  let son = Object.values(s.chars).find(k => k.father === c.id && k.sex === "m" && k.st !== "dead" && k.st !== "cap" && age(s, k) >= 16 && (k.cl === inh.cl || !k.cl));
  if (!son && age(s, c) >= 38 && chance(s, priv ? 1 : 0.75)) {
    const by = Math.max(s.bce + 16, Math.min(c.by - 20, s.bce + rint(s, 18, 30)));
    son = genOfficer(s, inh.cl, C.cul, c.loc, { n: pick(s, (NAMES[C.cul] || NAMES.eg).m) + ", syn " + c.n.split(",")[0], by, father: c.id, rank: Math.max(0, inh.rank - 1), loy: clamp(c.loy - 5, 20, 95) });
    c.kids.push(son.id);
  }
  if (!son) return;
  son.cl = inh.cl; son.st = "off"; son.rod = rodOf(c); son.rank = Math.max(son.rank || 0, inh.rank - 1); son.merit = Math.max(son.merit || 0, RANKS[son.rank].merit); son.loc = inh.provs.find(id => s.provs[id].owner === inh.cl) || son.loc || c.loc;
  for (const id of inh.provs) if (s.provs[id].owner === inh.cl && !s.provs[id].lord) s.provs[id].lord = son.id;
  for (const k of inh.offs) if (!C.offices[k]) C.offices[k] = son.id;
  if (isPlayer(s, inh.cl)) log(s, `${son.n} zdědil po otci ${c.n}${inh.provs.length ? " správu nomu " + inh.provs.map(id => s.provs[id].n).join(", ") : ""}${inh.offs.length ? (inh.provs.length ? " a" : "") + " úřad " + inh.offs.map(k => (OFFICES[k] || { n: k }).n).join(", ") : ""}${inh.provs.length || inh.offs.length ? "" : " otcovo postavení"}. Rod ${rodOf(c)} drží své místo.`, "rozkazy", [inh.cl]);
}
function rodsTick(s) {
  const C = P(s); if (!C || !C.alive || C.type === "kmen" || s.events.length) return;
  const R = rodsOf(s, s.player); if (R.length < 2) return;
  const top = R[0];
  if (top.provs.length >= 3 && top.pow >= 9 && lw(s, s.player, "nomarchove") !== 2 && !(C.rodPriv && C.rodPriv[top.n]) && chance(s, 0.4)) { queueEvent(s, "mocny_rod", { rod: top.n }); return; }
  const rivals = R.filter(r => r.pow >= 4);
  if (rivals.length >= 2 && chance(s, 0.3)) queueEvent(s, "spor_rodu", { a: rivals[0].n, b: rivals[1].n });
}
const rodMembers = (s, n) => officers(s, s.player).filter(c => !c.dyn && rodOf(c) === n);
function rodLoy(s, n, v) { for (const c of rodMembers(s, n)) c.loy = clamp(c.loy + v, 0, 100); }
EVENTS.spor_rodu = { view: (s, d) => { const C = P(s); return { t: "Spor dvou rodů", tx: `Rod, jehož předkem je ${d.a}, a rod ${d.b} se přou o pole, o vodu z kanálu a o místa u dvora. Obě strany přinesly vezírovi listiny a svědky. Kdo prohraje, bude reptat – kdo vyhraje, zesílí.`,
  ch: [{ t: `Rozhodnout ve prospěch rodu ${d.a}`, d: `rod ${d.a} věrnost +10, rod ${d.b} −12`, f: () => { rodLoy(s, d.a, 10); rodLoy(s, d.b, -12); return `Spor rozhodnut ve prospěch rodu ${d.a}.`; } },
    { t: `Rozhodnout ve prospěch rodu ${d.b}`, d: `rod ${d.b} věrnost +10, rod ${d.a} −12`, f: () => { rodLoy(s, d.b, 10); rodLoy(s, d.a, -12); return `Spor rozhodnut ve prospěch rodu ${d.b}.`; } },
    { t: "Vezírův soud podle maat (600 debenů)", d: "oba rody +2, maat +2", f: () => { if (!pay(s, s.player, 600)) return "Nedostatek debenů."; rodLoy(s, d.a, 2); rodLoy(s, d.b, 2); C.maat = Math.min(100, C.maat + 2); return "Vezír rozsoudil spor podle práva."; } },
    { t: "Smířit je sňatkem (1 000 debenů na věno)", d: "oba rody +6", f: () => { if (!pay(s, s.player, 1000)) return "Nedostatek debenů."; rodLoy(s, d.a, 6); rodLoy(s, d.b, 6); return "Rody se spříznily sňatkem."; } }] }; } };
EVENTS.mocny_rod = { view: (s, d) => { const C = P(s), r = rodsOf(s, s.player).find(x => x.n === d.rod) || { provs: [], m: [], offs: [] };
  return { t: "Příliš mocný rod", tx: `Rod ${d.rod} drží ${r.provs.length} nomů (${r.provs.map(id => s.provs[id].n).join(", ")})${r.offs.length ? " a úřady u dvora" : ""}; úřady se v něm dědí z otce na syna. Tak kdysi zesílili nomarchové v Beni Hasanu, Asjútu či Dér el-Berše, kteří datovali podle vlastních let a měli vlastní vojsko.`,
  ch: [{ t: "Odebrat jim jeden nom a svěřit ho jinému", d: "rod věrnost −15, nomarchové −5", f: () => { const id = r.provs.slice().sort((a, b) => s.provs[a].v - s.provs[b].v)[0]; if (id) { s.provs[id].lord = null; const o = officers(s, s.player).find(c => !c.dyn && rodOf(c) !== d.rod && !Object.values(s.provs).some(p => p.lord === c.id) && !c.army); if (o) s.provs[id].lord = o.id; } rodLoy(s, d.rod, -15); C.estates.nomarchove = Math.max(0, C.estates.nomarchove - 5); return id ? `Nom ${s.provs[id].n} dostal nového správce.` : null; } },
    { t: "Potvrdit jim dědičná práva", d: "rod věrnost +15, nomarchové +4, maat −1; jejich úřady se budou dědit vždy", f: () => { C.rodPriv = C.rodPriv || {}; C.rodPriv[d.rod] = 1; rodLoy(s, d.rod, 15); C.estates.nomarchove = Math.min(100, C.estates.nomarchove + 4); C.maat = Math.max(0, C.maat - 1); return `Rod ${d.rod} obdržel potvrzení dědičných práv.`; } },
    { t: "Povolat jejich syny ke dvoru jako „děti kapu“ (500 debenů)", d: "synové hodnostářů vyrůstali v královské škole kap – rod věrnost +6", f: () => { if (!pay(s, s.player, 500)) return "Nedostatek debenů."; rodLoy(s, d.rod, 6); return `Synové rodu ${d.rod} vyrůstají u dvora.`; } }] }; } };
EVENTS.hrozba = { view: (s, d) => { const O = s.clans[d.cl], g = goalProgress(s, d.cl); return { t: "Soupeř sahá po dvojité koruně", tx: `${O.n} (${O.house}) už drží ${g.core} z ${g.coreN} nomů egyptského jádra. Pokud ovládne čtyři pětiny země, sjednotí Egypt bez tebe – a tvá hra skončí porážkou. Jeho cíl: ${g.t}.`,
  ch: [{ t: "Svolat válečnou radu", d: "rádci +5 věrnosti", f: () => { for (const c of officers(s, s.player)) c.loy = Math.min(100, c.loy + 5); return null; } }, { t: "Rozumím", f: () => null }] }; } };
EVENT_Q.spor_rodu = "rolnik"; EVENT_Q.mocny_rod = "amenemhat";

// ---------- trh v čase ----------
// Cena (debeny za char) vychází ze záplavy, roční doby (nejdráž těsně před sklizní), nedostatku po hladových letech
// a z poptávky – velké nákupy cenu zvednou, velké prodeje srazí.
function marketTick(s) {
  const M = s.market; if (M.base == null) M.base = M.p; M.hist = M.hist || []; M.short = M.short || 0; M.press = M.press || 0;
  const m = (s.month - HARVEST_MONTH + 12) % 12, season = 0.9 + m * 0.022;
  M.p = Math.round(clamp(M.base * season * (1 + M.short) * (1 + M.press), 0.8, 12) * 100) / 100;
  M.hist.push(M.p); if (M.hist.length > 120) M.hist.splice(0, M.hist.length - 120);
  M.press *= 0.7; M.short *= 0.985;
}
function marketHarvest(s) {
  const M = s.market, hungry = Object.values(s.provs).filter(p => p.hunger > 0.1).length;
  M.short = clamp((M.short || 0) + hungry * 0.025, 0, 1.2);
}
function marketPress(s, cid, q) { if (!isPlayer(s, cid)) return; s.market.press = clamp((s.market.press || 0) + q / Math.max(4000, marketCap(s, cid) * 6), -0.3, 0.35); }

// ---------- výzvědná síť ----------
const SPY_KIND = { kupci: { n: "kupci a lodníci", start: 400, cost: 70 }, medzaj: { n: "médžajští stopaři", start: 200, cost: 40 }, dvojity: { n: "obrácený zvěd", start: 0, cost: 0 } };
function canMedzajSpy(s, cid) { const C = s.clans[cid]; return C.medjay || (s.clans.medzaj && s.clans.medzaj.alive && friendly(s, cid, "medzaj")) || C.cul === "nub"; }
function plantSpies(s, cid, target, kind) {
  const K = SPY_KIND[kind]; if (!K || kind === "dvojity") return "Neznámý druh zvědů.";
  if (!s.clans[target] || !s.clans[target].alive || target === cid) return "Není koho sledovat.";
  if (kind === "medzaj" && !canMedzajSpy(s, cid)) return "Médžajové ti neslouží.";
  s.spynet = s.spynet || {}; if (s.spynet[target]) return "Tam už tví zvědové jsou.";
  if (Object.keys(s.spynet).length >= 4) return "Víc než čtyři sítě zvědů nedokážeš řídit.";
  if (!pay(s, cid, K.start)) return `Vyslání stojí ${K.start} debenů.`;
  s.spynet[target] = { kind, since: s.turn, cost: K.cost }; log(s, `Do země rodu ${s.clans[target].house} odešli ${K.n} – stálí zvědové.`, "intriky", [cid]); return null;
}
function recallSpies(s, target) { if (s.spynet && s.spynet[target]) { delete s.spynet[target]; return null; } return "Žádní zvědové."; }
function spyBonus(s, a, b) {
  if (a === s.player && s.spynet && s.spynet[b]) return 1.05;
  if (b === s.player && (s.fspies || []).some(f => f.cl === a)) return 1.04;
  return 1;
}
function spyTick(s) {
  s.spynet = s.spynet || {}; s.fspies = s.fspies || [];
  for (const [t, n] of Object.entries(s.spynet)) {
    if (!s.clans[t] || !s.clans[t].alive || (n.until && n.until <= s.turn)) { delete s.spynet[t]; continue; }
    if (n.kind !== "dvojity" && chance(s, hasTech(s, t, "hlidky") ? 0.02 : 0.01)) { delete s.spynet[t]; addRel(s, s.player, t, -10); log(s, `Rod ${s.clans[t].house} odhalil tvé zvědy a popravil je.`, "intriky", [s.player, t]); }
  }
  for (const O of aliveClans(s)) {
    if (isPlayer(s, O.id) || O.type === "kmen" || s.fspies.some(f => f.cl === O.id)) continue;
    if ((atWar(s, O.id, s.player) || rel(s, O.id, s.player) < -25) && chance(s, 0.02)) s.fspies.push({ cl: O.id, since: s.turn });
  }
  const C = P(s); if (!C) return;
  for (const f of s.fspies.slice()) {
    if (!s.clans[f.cl] || !s.clans[f.cl].alive) { s.fspies = s.fspies.filter(x => x !== f); continue; }
    const pr = 0.05 + (hasTech(s, s.player, "hlidky") ? 0.04 : 0) + (C.medjay ? 0.03 : 0) + Object.keys(s.spynet).length * 0.01 + (C.offices && C.offices.vezir ? 0.02 : 0);
    if (!s.events.some(e => e.k === "zved") && chance(s, pr)) { queueEvent(s, "zved", { cl: f.cl, n: genName(s, s.clans[f.cl].cul === "hyk" ? "hyk" : "eg", "m") }); break; }
  }
}
// co zvědové hlásí: vojska sledovaného rodu na cestě k hráčovým nomům
function spyReports(s) {
  const out = [];
  for (const t of Object.keys(s.spynet || {})) for (const a of s.armies.filter(a => a.cl === t && a.path && a.path.length)) {
    const dest = s.provs[a.path[a.path.length - 1]]; if (dest && dest.owner === s.player) out.push(`Zvědové hlásí: ${s.clans[t].house} táhne s ${fmtN(men(a.t))} muži na nom ${dest.n}.`);
  }
  return out;
}
EVENTS.zved = { view: (s, d) => { const O = s.clans[d.cl]; return { t: "Odhalený zvěd", tx: `Stráže zadržely muže jménem ${d.n}, který se vydával za kupce. Při výslechu se přiznal, že slouží rodu ${O.house} a posílá zprávy o tvých vojscích a sýpkách.`,
  ch: [{ t: "Popravit ho", d: `vztahy s ${O.n} −8, sláva +5`, f: () => { s.fspies = s.fspies.filter(f => f.cl !== d.cl); addRel(s, s.player, d.cl, -8); P(s).prestige += 5; return "Zvěd byl popraven."; } },
    { t: "Obrátit ho – ať slouží nám", d: "dva roky budeš znát jejich nomy; riziko, že lže", f: () => { s.fspies = s.fspies.filter(f => f.cl !== d.cl); s.spynet = s.spynet || {}; if (!s.spynet[d.cl]) s.spynet[d.cl] = { kind: "dvojity", since: s.turn, cost: 0, until: s.turn + 24 }; return "Zvěd teď posílá zprávy oběma stranám – ale hlavně nám."; } },
    { t: "Vyhostit ho", d: "vztahy −2", f: () => { s.fspies = s.fspies.filter(f => f.cl !== d.cl); addRel(s, s.player, d.cl, -2); return "Zvěd byl vyhoštěn."; } }] }; } };

// ---------- místní svátky nomů ----------
// m = měsíc občanského kalendáře (0 = 1. měsíc achet). Kde je datum nejisté, říká to poznámka.
const FESTIVALS = [
  { id: "wag", pid: "u8", m: 0, n: "Svátek Wag v Abydu", g: "Usir", d: "svátek mrtvých 18. dne 1. měsíce achet; doložen už ve Staré říši v obětních formulích" },
  { id: "thovt", pid: "u15", m: 0, n: "Svátek Thovta v Hermopoli", g: "Thovt", d: "Thovtův svátek 19. dne 1. měsíce achet, uváděný v seznamech svátků od Staré říše" },
  { id: "upuaut", pid: "u13", m: 0, n: "Svátek Upuauta v Asjútu", g: "Upuaut", d: "smlouvy nomarchy Hepdžefy (12. dynastie) zajišťují zapalování pochodní a obětiny o Novém roce a svátku Wag" },
  { id: "hathor", pid: "u6", m: 2, n: "Svátek Hathor v Dendeře", g: "Hathor", d: "měsíc později pojmenovaný po Hathor (Hathyr); podrobný průběh slavností známe až z ptolemaiovského chrámu" },
  { id: "sokar", pid: "l1", m: 3, n: "Sokarův svátek v Memfidu", g: "Sokar", d: "26. den 4. měsíce achet: Sokarova bárka obchází hradby; doložen od Staré říše" },
  { id: "sobek", pid: "fa", m: 10, n: "Svátek Sobka v Šedetu", g: "Sobek", d: "Sobkův kult ve Fajjúmu vzkvétal za 12. dynastie; přesné datum svátku je nejisté" },
  { id: "elef", pid: "u1", m: 11, n: "Oběti záplavě na Elefantině", g: "Chnum, Satet a Hapi", d: "obětiny před příchodem záplavy; podrobně doloženy až z Nové říše (stély v Gebel es-Silsila)" },
];
function festivalTick(s) {
  const C = P(s); if (!C || !C.alive) return;
  const due = FESTIVALS.filter(f => f.m === s.month && s.provs[f.pid] && s.provs[f.pid].owner === s.player);
  for (const f of FESTIVALS.filter(f => f.m === s.month && s.provs[f.pid] && !isPlayer(s, s.provs[f.pid].owner))) s.provs[f.pid].loy = Math.min(100, s.provs[f.pid].loy + 2);
  if (!due.length || s.events.some(e => e.k === "svatek")) return;
  const f = due.sort((a, b) => s.provs[b.pid].v - s.provs[a.pid].v)[0]; queueEvent(s, "svatek", { id: f.id });
}
EVENTS.svatek = { view: (s, d) => { const C = P(s), f = FESTIVALS.find(x => x.id === d.id), p = s.provs[f.pid], cd = 500 + p.v * 250, cg = 2000 + p.v * 1500;
  return { t: f.n, tx: `V nomu ${p.n} se chystá svátek boha ${f.g}. Procesí nese sochu boha v přenosné bárce, lid dostává chléb a pivo z chrámových obětin. (${f.d}.)`,
  ch: [{ t: `Vystrojit svátek bohatě (${fmtN(cd)} debenů, ${fmtN(cg)} charů)`, d: "věrnost nomu +10, kněží +3, maat +1, sláva +5", f: () => { if (!pay(s, s.player, cd, cg)) return "Nedostatek prostředků."; p.loy = Math.min(100, p.loy + 10); C.estates.knezi = Math.min(100, C.estates.knezi + 3); C.maat = Math.min(100, C.maat + 1); C.prestige += 5; return `${f.n} proběhl se vší slávou.`; } },
    { t: `Skromné obětiny (${fmtN(Math.round(cd / 4))} debenů)`, d: "věrnost nomu +3", f: () => { if (!pay(s, s.player, Math.round(cd / 4))) return "Nedostatek debenů."; p.loy = Math.min(100, p.loy + 3); return null; } },
    { t: "Nechat svátek na místním chrámu", d: "věrnost nomu −4", f: () => { p.loy = Math.max(0, p.loy - 4); return null; } }] }; } };

// ---------- hlad: méně drobných hladů, víc rozhodování ----------
function hungerPlayer(s, list) {
  const C = P(s), tot = sum(list.map(x => x[1]));
  if (tot < 2500 && C.grain > tot * 3) {
    C.grain -= tot; for (const [id, x] of list) { const p = s.provs[id]; p.stock += x; p.hunger = Math.max(0, p.hunger - 0.3); }
    log(s, `Správci sýpek rozdělili ${fmtN(tot)} charů obilí do nomů ${list.map(([id]) => s.provs[id].n).join(", ")}, kde nestačila úroda.`, "nil", [s.player]); return;
  }
  queueEvent(s, "hlad", { list });
}
function surplusProvs(s, list) { const ids = list.map(x => x[0]); return clanProvs(s, s.player).filter(p => !ids.includes(p.id) && p.stock > provNeed(p) * 0.6); }
if (EVENTS.hlad) {
  const baseView = EVENTS.hlad.view;
  EVENTS.hlad.view = (s, d) => {
    const v = baseView(s, d), C = P(s), tot = sum(d.list.map(x => x[1])), src = surplusProvs(s, d.list);
    const avail = Math.round(sum(src.map(p => p.stock - provNeed(p) * 0.5))), mv = Math.min(avail, tot), fee = Math.round(mv * 0.12);
    const soldiers = sum(clanProvs(s, s.player).map(p => men(p.troops))) + sum(s.armies.filter(a => a.cl === s.player).map(a => men(a.t))), fr = Math.min(Math.round(tot * 0.5), Math.round(soldiers * 1.2));
    const extra = [];
    if (mv > 0) extra.push({ t: `Převézt obilí lodí z nomů s přebytkem (${fmtN(mv)} charů, ${fmtN(fee)} debenů za lodě)`, d: `vezme ze zásob ${src.length} nomů – jejich věrnost −3`, f: () => { if (!pay(s, s.player, fee)) return "Nedostatek debenů na lodě."; let left = mv; for (const p of src) { const x = Math.min(left, Math.round(p.stock - provNeed(p) * 0.5)); if (x <= 0) continue; p.stock -= x; p.loy = Math.max(0, p.loy - 3); left -= x; } for (const [id, x] of d.list) { const p = s.provs[id]; p.stock += Math.round(x * mv / Math.max(1, tot)); p.loy = Math.min(100, p.loy + 6); p.hunger = Math.max(0, p.hunger - 0.25); } return `Lodě převezly ${fmtN(mv)} charů obilí.`; } });
    if (fr > 500) extra.push({ t: `Snížit příděly vojákům (ušetří ${fmtN(fr)} charů)`, d: "výcvik posádek −8, velitelé věrnost −3", f: () => { for (const p of clanProvs(s, s.player)) p.train = Math.max(10, p.train - 8); for (const a of s.armies.filter(a => a.cl === s.player)) { a.train = Math.max(10, (a.train || 40) - 8); for (const id of a.cmds) { const c = chr(s, id); if (c) c.loy = Math.max(0, c.loy - 3); } } for (const [id, x] of d.list) s.provs[id].stock += Math.round(x * fr / Math.max(1, tot)); return "Vojáci dostávají menší dávky chleba."; } });
    v.ch.splice(1, 0, ...extra); return v;
  };
}

// ---------- hratelné kmeny: nájezdy a služba ----------
function doRaid(s, T, from, q) {
  const n = Math.round(men(from.troops) * 0.45); if (n < 150) return { err: "Na nájezd je třeba aspoň 150 bojovníků v kraji." };
  const t = {}; for (const k of TROOP_IDS) if (from.troops[k]) { t[k] = Math.round(from.troops[k] * 0.45); from.troops[k] -= t[k]; }
  const b = battle(s, { cl: T.id, t, train: from.train, cmd: 1 }, { cl: q.owner, t: q.troops, train: q.train, cmd: 1, fort: (1 + q.castle * 0.08) * monRaidWall(s, q) * [1.3, 1, 0.85][lw(s, q.owner, "cizinci")] }, q.id, { kind: "nájezd" });
  for (const k of TROOP_IDS) if (t[k]) from.troops[k] = (from.troops[k] || 0) + t[k];
  const O = s.clans[q.owner]; let loot = 0, gl = 0;
  if (b.win === "A") { loot = Math.round(Math.min(O.deben * 0.06, 2500)); gl = Math.round(Math.min(q.stock * 0.3, 15000)); O.deben -= loot; q.stock -= gl; q.loy = Math.max(0, q.loy - 6); q.pop = r1(q.pop * 0.985); T.deben += loot; T.grain += gl; T.prestige += 6;
    log(s, `Nájezd: ${T.n} (${T.house}) vyplenili nom ${q.n} – odnesli ${fmtN(loot)} debenů a ${fmtN(gl)} charů obilí.`, "valka", [T.id, q.owner]); }
  else if (isPlayer(s, T.id)) log(s, `Nájezd na nom ${q.n} byl odražen.`, "valka", [T.id]);
  addRel(s, T.id, q.owner, -6); return { b, loot, gl };
}
function playerRaid(s, fromId, toId) {
  const T = P(s), from = s.provs[fromId], q = s.provs[toId];
  if (T.type !== "kmen") return "Nájezdy podnikají jen kmeny.";
  if (!from || from.owner !== s.player || !q || !from.nb.includes(toId) || q.owner === s.player) return "Nájezd jde jen do sousedního cizího kraje.";
  if (friendly(s, s.player, q.owner)) return "Na spojence se neútočí.";
  if ((T.last.raid || -9) > s.turn - 3) return "Bojovníci odpočívají – další nájezd nejdřív za " + (T.last.raid + 3 - s.turn) + " měs.";
  const r = doRaid(s, T, from, q); if (r.err) return r.err; T.last.raid = s.turn;
  return r.b.win === "A" ? `Kořist: ${fmtN(r.loot)} debenů a ${fmtN(r.gl)} charů obilí.` : "Nájezd se nezdařil.";
}
function serveClan(s, o) {
  const T = P(s), O = s.clans[o]; if (T.type !== "kmen" || !O || O.type === "kmen") return "Nelze.";
  if (atWar(s, s.player, o)) return "S nepřítelem se o službě nejedná.";
  if (rel(s, s.player, o) < 10) return "Nedůvěřují ti (vztahy aspoň +10).";
  T.serve = o; O.medjay = O.medjay || T.cul === "nub"; addRel(s, s.player, o, 10); log(s, `Bojovníci kmene ${T.n} vstoupili do služby rodu ${O.house} jako zvědové a lučištníci.`, "diplomacie", [s.player, o]); return null;
}
function serveTick(s) {
  for (const T of aliveClans(s).filter(c => c.serve)) {
    const O = s.clans[T.serve]; if (!O || !O.alive || atWar(s, T.id, O.id)) { T.serve = null; continue; }
    const pay_ = Math.min(O.deben, 250 + clanProvs(s, O.id).length * 15); O.deben -= pay_; T.deben += pay_; T.grain += 1500; T.prestige += 0.5;
  }
}

// ---------- měsíční chod nových mechanik ----------
function worldTick(s) {
  // kmeny žijí ze stád: mléko, maso a výměna dobytka za obilí
  for (const T of aliveClans(s).filter(c => c.type === "kmen")) T.grain += Math.round(sum(clanProvs(s, T.id).map(p => p.pop)) * 260 + 400);
  marketTick(s); spyTick(s); serveTick(s); festivalTick(s); goalsTick(s);
  if (s.month === 0) { ensureRods(s); rodsTick(s); }
}
