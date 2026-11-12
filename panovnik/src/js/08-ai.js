// Umělá inteligence rodů (a správa svěřených krajů hráče).

function borderEnemies(s, cid, p) { return p.nb.filter(n => atWar(s, cid, ctrl(s.provs[n]))); }
function threatened(s, cid, p) { return p.nb.some(n => { const o = s.provs[n].owner; return o !== cid && (atWar(s, cid, o) || rel(s, cid, o) < -30); }); }

function aiDomestic(s, cid, c, delegated) {
  const C = s.clans[cid], p = s.provs[c.loc]; if (!p || p.owner !== cid || p.siege) return;
  const reserve = delegated ? 120 : 60, gold = C.gold - reserve, war = enemiesOf(s, cid).length > 0, thr = threatened(s, cid, p);
  const tryCmd = (k, a, b) => doCmd(s, cid, c.id, k, a, b) === null;
  if (p.loy < 30 && C.grain > p.pop * 3 && tryCmd("lid")) return;
  const kArmy = dprof(s).army, peaceGoal = Math.min(0.7, 0.3 * kArmy);
  if ((war || thr ? men(p.troops) < troopCap(p) * 0.8 : men(p.troops) < troopCap(p) * peaceGoal && gold > 250 && !isPlayer(s, cid)) && gold > 60) {
    const type = C.kone >= 20 && C.zbroj >= 10 && chance(s, 0.3) ? "jizda" : chance(s, 0.3) && C.zbroj > 5 ? "strelci" : "pesi";
    const n = Math.min(maxRecruit(s, p, c), Math.floor(gold / TROOPS[type].cost * 100 * 0.7));
    if (n >= 100 && tryCmd("nabor", type, n)) return;
  }
  if (men(p.troops) > 300 && p.train < (war || thr ? 65 : 45) && gold > 10 && tryCmd("vycvik")) return;
  if (!p.build && gold > 400 && chance(s, delegated ? 0.15 : 0.25)) {
    const opts = [];
    if (thr && p.castle < 3) opts.push("hrad"); if (BUILD.dul.need(p) && (p.b.dul || 0) < 2) opts.push("dul");
    if ((p.city || p.v >= 3) && (p.b.mesto || 0) < 2) opts.push("mesto"); if ((p.b.klaster || 0) < 1) opts.push("klaster");
    if (BUILD.vinice.need(p) && (p.b.vinice || 0) < 2) opts.push("vinice");
    const b = opts.find(x => !canBuild(s, cid, p, x)); if (b && tryCmd("stavba", b)) return;
  }
  if (gold > 30 && p.agri < agriCap(s, p) * 0.97 && (p.agri / agriCap(s, p) <= p.com / Math.max(1, comCap(s, p)) || p.com >= comCap(s, p)) && tryCmd("zemedelstvi")) return;
  if (gold > 30 && p.com < comCap(s, p) && tryCmd("obchod")) return;
  if (gold > 25 && p.dur < durMax(s, p) * 0.9 && tryCmd("hradby")) return;
  if (gold > 30 && men(p.troops) < troopCap(p) * 0.5 && !delegated) { const n = Math.min(maxRecruit(s, p, c), Math.floor(gold / 8 * 100 * 0.5)); if (n >= 100 && tryCmd("nabor", "pesi", n)) return; }
  if (!delegated && gold > 20 && chance(s, 0.4) && tryCmd("studium")) return;
  if (gold > 10 && chance(s, 0.15) && officers(s, cid).length < offCap(s, cid)) tryCmd("hledat");
}


// přímý nábor AI (bez velitele): jen do stropu posádky, platí zlato a zboží
function aiRaise(s, cid, p, type, n) {
  const C = s.clans[cid];
  if (TROOPS[type].goods && Object.keys(TROOPS[type].goods).length) n = Math.min(n, ...Object.entries(TROOPS[type].goods).map(([k, q]) => Math.floor((C[k] || 0) / q * 100)));
  n = Math.floor(Math.min(n, troopCap(p) * (type === "zoldneri" ? 1.3 : 1) - men(p.troops)) / 100) * 100; if (n < 100) return 0;
  let rc = recruitCost(s, cid, type, n);
  if (C.gold < rc.gold) { n = Math.floor(n * C.gold / rc.gold / 100) * 100; if (n < 100) return 0; rc = recruitCost(s, cid, type, n); }
  C.gold -= rc.gold; for (const [g, q] of Object.entries(rc.goods)) C[g] -= q;
  const old = men(p.troops); p.train = Math.round((p.train * old + 30 * n) / (old + n)); p.troops[type] = (p.troops[type] || 0) + n;
  if (type !== "zoldneri") { p.pop = Math.max(2, r1(p.pop - n / 1000)); p.loy = Math.max(0, p.loy - n / 200); }
  return n;
}
const isBorder = (s, cid, p) => p.nb.some(n => s.provs[n].owner !== cid);
// zlato se nehromadí: pohraniční kraje dostávají posádky, za války i žoldnéře
function aiMobilize(s, cid) {
  const C = s.clans[cid], k = dprof(s).army, ps = clanProvs(s, cid).filter(p => !p.occ), war = enemiesOf(s, cid).length > 0;
  let budget = C.gold - (war ? 300 : 500) - ps.length * 35; if (budget < 150) return;
  const need = p => (troopCap(p) * (war ? 0.9 : Math.min(0.75, 0.35 * k)) - men(p.troops)) * (isBorder(s, cid, p) ? 1 : 0.4) * (borderEnemies(s, cid, p).length ? 1.5 : 1);
  const order = ps.filter(p => !p.siege && need(p) >= 150).sort((a, b) => need(b) - need(a)).slice(0, 3);
  for (const p of order) {
    if (budget < 100) break;
    const before = C.gold;
    const arch = C.zbroj >= 8 ? 0.3 : 0, cav = C.kone >= 30 && C.zbroj >= 20 ? 0.2 : 0, tot = Math.min(1500, Math.max(0, need(p)), budget / 8 * 100);
    if (tot < 100) continue;
    if (cav && aiRaise(s, cid, p, "jizda", tot * cav) === 0) { /* bez koní */ }
    if (arch) aiRaise(s, cid, p, "strelci", tot * arch);
    aiRaise(s, cid, p, "pesi", tot * (1 - arch - cav));
    if (war && borderEnemies(s, cid, p).length && C.gold > 600 + budget * 0.2) aiRaise(s, cid, p, "zoldneri", Math.min(1200, (C.gold - 500) / 30 * 100));
    budget -= before - C.gold;
  }
  // za války vždy vycvičit aspoň nejohroženější kraj
  if (war && C.gold > 400) { const p = ps.filter(q => borderEnemies(s, cid, q).length && q.train < 70 && men(q.troops) > 400)[0]; if (p) { p.train = Math.min(100, p.train + 6); C.gold -= 25; } }
}
// síla útoku z vlastního kraje proti sousednímu kraji cíle (kolikrát převyšuje obranu)
function localEdge(s, cid, T) {
  let best = 0;
  for (const p of clanProvs(s, cid)) {
    if (p.siege || p.occ) continue;
    for (const n of p.nb) { const q = s.provs[n]; if (q.owner !== T) continue;
      const avail = {}; for (const kk of TROOP_IDS) avail[kk] = Math.floor((p.troops[kk] || 0) * 0.85);
      if (men(avail) < 400) continue;
      const r = troopPower(s, cid, avail, { train: p.train }) / Math.max(1, provDefense(s, q) * (s.armies.some(x => x.loc === n && x.cl === T) ? 2 : 1));
      if (r > best) best = r; }
  }
  return best;
}
// obléhaný kraj: nejbližší silná posádka vytáhne a pokusí se obléhatele rozprášit
function aiRelief(s, cid) {
  for (const p of clanProvs(s, cid)) {
    if (!p.siege || p.siege.by === cid) continue;
    const sa = s.armies.find(x => x.id === p.siege.army); if (!sa || s.armies.some(x => x.cl === cid && x.to === p.id && x.mode === "utok")) continue;
    const foePow = troopPower(s, sa.cl, sa.t, { train: sa.train });
    for (const n of p.nb.map(id => s.provs[id]).filter(q => q.owner === cid && !q.siege && !q.occ).sort((a, b) => men(b.troops) - men(a.troops))) {
      const avail = {}; for (const kk of TROOP_IDS) avail[kk] = Math.floor((n.troops[kk] || 0) * (threatened(s, cid, n) ? 0.7 : 0.9));
      if (men(avail) < 400 || troopPower(s, cid, avail, { train: n.train }) < foePow * 0.85) continue;
      const cmdrs = officersIn(s, n.id).filter(c => !c.army && c.acted !== s.turn).sort((a, b) => st(b, "ved") - st(a, "ved")).slice(0, 3); if (!cmdrs.length) continue;
      const lim = armyLimit(s, cmdrs.map(c => c.id)), tot = men(avail); if (tot > lim) for (const kk of TROOP_IDS) avail[kk] = Math.floor(avail[kk] * lim / tot);
      const months = 3, need = Math.ceil(men(avail) / 1000 * 12 * months); if (C_grain(s, cid) < need) { if (s.clans[cid].gold > need * price(s, "obili") * 1.2) tradeGoods(s, cid, "obili", need, true); else continue; }
      if (dispatch(s, cid, n.id, p.id, avail, cmdrs.map(c => c.id), months) === null) break;
    }
  }
}
const C_grain = (s, cid) => s.clans[cid].grain;

function aiClan(s, cid) {
  const C = s.clans[cid]; if (!C.alive) return;
  const offs = officers(s, cid).filter(c => !c.army);
  // rozdělení vazalů do krajů bez purkrabího
  const empty = clanProvs(s, cid).filter(p => !officersIn(s, p.id).length && !p.siege);
  for (const p of empty) { const spare = offs.find(c => c.acted !== s.turn && c.id !== C.leader && officersIn(s, c.loc).length > 1 && s.provs[c.loc] && s.provs[c.loc].owner === cid); if (spare) doCmd(s, cid, spare.id, "presun", p.id); }
  aiMobilize(s, cid); aiRelief(s, cid);
  aiMilitary(s, cid);
  for (const c of officers(s, cid)) if (c.acted !== s.turn && !c.army) aiDomestic(s, cid, c, false);
  aiDiplomacy(s, cid);
  if (C.gold > 450 && chance(s, 0.05)) { const p = clanProvs(s, cid).find(q => !q.hanza && (q.b.mesto || q.city) && ROUTES.find(R => R.hanza).provs.includes(q.id)); if (p) joinHanza(s, cid, p.id); }
  aiCaptives(s, cid);
}

function aiMilitary(s, cid) {
  const C = s.clans[cid], foes = enemiesOf(s, cid);
  // vojska v poli: rozhodnutí o zteči
  for (const a of s.armies.filter(x => x.cl === cid)) { const p = s.provs[a.loc]; if (p.siege && p.siege.army === a.id) a.siegeMode = troopPower(s, cid, a.t, { train: a.train }) > provDefense(s, p) * 1.6 ? "ztec" : "obleh"; }
  if (foes.length < maxWars(s, cid)) aiWarDecision(s, cid);
  if (!foes.length) return;
  const busy = new Set(s.armies.filter(x => x.cl === cid).map(x => x.to));
  if (s.armies.filter(x => x.cl === cid && x.mode === "utok").length >= 1 + Math.floor(clanProvs(s, cid).length / (dprof(s).aggr >= 2 ? 4 : 6))) return;
  const options = [];
  for (const p of clanProvs(s, cid)) {
    if (p.siege || p.occ) continue;
    for (const n of borderEnemies(s, cid, p)) {
      const q = s.provs[n]; if (busy.has(n)) continue;
      const avail = {}; for (const k of TROOP_IDS) avail[k] = Math.floor((p.troops[k] || 0) * (threatened(s, cid, p) ? 0.7 : 0.9));
      const atk = troopPower(s, cid, avail, { train: p.train }), def = provDefense(s, q) * (s.armies.some(x => x.loc === n && x.cl === q.owner) ? 2 : 1);
      if (men(avail) >= 400 && atk > def * (C.aggr > 0.5 ? 0.95 : 1.15) / (isPlayer(s, q.owner) ? 0.6 + 0.4 * dprof(s).hunt : 1)) options.push({ p, q, avail, score: atk / def + (q.v / 5) + (q.id === s.clans[q.owner].capital ? 0.5 : 0) });
    }
  }
  options.sort((a, b) => b.score - a.score);
  const o = options[0]; if (!o) { aiReinforce(s, cid); return; }
  const cmdrs = officersIn(s, o.p.id).filter(c => !c.army && c.acted !== s.turn).sort((a, b) => st(b, "ved") + st(b, "uda") - st(a, "ved") - st(a, "uda")).slice(0, 3);
  if (!cmdrs.length) { const c = officers(s, cid).find(x => !x.army && x.acted !== s.turn && s.provs[x.loc] && s.provs[x.loc].owner === cid && x.loc !== o.p.id && o.p.nb.includes(x.loc)); if (c) doCmd(s, cid, c.id, "presun", o.p.id); return; }
  const lim = armyLimit(s, cmdrs.map(c => c.id)), tot = men(o.avail);
  if (tot > lim) for (const k of TROOP_IDS) o.avail[k] = Math.floor(o.avail[k] * lim / tot);
  const months = 4, need = Math.ceil(men(o.avail) / 1000 * 12 * months);
  if (C.grain < need) { if (C.gold > need * price(s, "obili") * 1.2) tradeGoods(s, cid, "obili", need, true); else return; }
  dispatch(s, cid, o.p.id, o.q.id, o.avail, cmdrs.map(c => c.id), months);
}
function aiReinforce(s, cid) {
  if (!chance(s, 0.5)) return;
  const ps = clanProvs(s, cid), front = ps.filter(p => borderEnemies(s, cid, p).length && !p.siege), back = ps.filter(p => !borderEnemies(s, cid, p).length && men(p.troops) > 600 && !p.siege);
  if (!front.length || !back.length) return;
  const from = back.sort((a, b) => men(b.troops) - men(a.troops))[0], to = front.sort((a, b) => men(a.troops) - men(b.troops))[0];
  const t = {}; for (const k of TROOP_IDS) t[k] = Math.floor((from.troops[k] || 0) * (threatened(s, cid, from) ? 0.4 : 0.65));
  dispatch(s, cid, from.id, to.id, t, [], 2, "presun");
}
const maxWars = (s, cid) => { const n = clanProvs(s, cid).length, a = dprof(s).aggr; return 1 + (a >= 1.5 && n >= 8 ? 1 : 0) + (a >= 2.8 && n >= 14 ? 1 : 0); };
function aiWarDecision(s, cid) {
  const C = s.clans[cid]; if (s.turn < 4) return;
  if (C.vassalOf) { const L = C.vassalOf; if (rel(s, cid, L) < -30 && powerRatio(s, cid, L) > 0.9 && chance(s, 0.02)) declareWar(s, cid, L, "vzpoura vazala"); return; }
  const D = dprof(s);
  if (!chance(s, C.aggr * 0.05 * D.aggr)) return;
  const nbs = new Set(); for (const p of clanProvs(s, cid)) for (const n of p.nb) { const o = s.provs[n].owner; if (o !== cid) nbs.add(o); }
  const thr = 1.6 / Math.sqrt(D.aggr);
  const cands = [...nbs].map(o => s.clans[o]).filter(T => T.alive && !allied(s, cid, T.id) && truceUntil(s, cid, T.id) <= s.turn && T.vassalOf !== cid && !atWar(s, cid, T.id) && !(C.type !== "dyn" && T.type !== "dyn"))
    .map(T => {
      const hunt = isPlayer(s, T.id) ? D.hunt : 1, soft = (1 - rel(s, cid, T.id) / 150) * (married(s, cid, T.id) ? 0.6 : 1) * (T.type !== "dyn" ? 0.6 : 1) * ((T.ban || 0) > s.turn ? 1.5 : 1);
      // příležitost: kde je soused na hranici slabý, útočí i slabší rod
      const sc = Math.max(powerRatio(s, cid, T.id) * soft, localEdge(s, cid, T.id) * soft * 0.9) * Math.sqrt(hunt);
      return { T, sc };
    })
    .filter(x => x.sc > thr && rel(s, cid, x.T.id) < 15 + (isPlayer(s, x.T.id) ? 10 * (D.hunt - 1) : 0)).sort((a, b) => b.sc - a.sc);
  if (cands.length && (cbAgainst(s, cid, cands[0].T.id) !== "zadna" || chance(s, clamp(0.3 + 0.15 * (D.aggr - 1), 0.2, 0.8)))) declareWar(s, cid, cands[0].T.id, null);
  // AI si občas zfalšuje nárok na slabšího souseda
  if (chance(s, 0.05 * Math.max(1, D.aggr / 1.5))) { const c = officers(s, cid).find(x => x.acted !== s.turn && !x.army && s.provs[x.loc] && s.provs[x.loc].owner === cid && !s.provs[x.loc].occ); const t = [...nbs].map(o => s.clans[o]).filter(T => T.alive && powerRatio(s, cid, T.id) > 1.3 / Math.sqrt(isPlayer(s, T.id) ? D.hunt : 1) && !allied(s, cid, T.id)).map(T => clanProvs(s, T.id).find(q => q.nb.some(n => s.provs[n].owner === cid))).filter(Boolean)[0]; if (c && t) doCmd(s, cid, c.id, "narok", t.id); }
}
function aiDiplomacy(s, cid) {
  const C = s.clans[cid], envoy = officers(s, cid).filter(c => !c.army && c.acted !== s.turn).sort((a, b) => st(b, "roz") - st(a, "roz"))[0];
  if (!envoy || !chance(s, 0.12)) return;
  const foes = enemiesOf(s, cid);
  // mír, když se válka nedaří
  for (const f of foes) { const w = s.wars.find(x => (x.a === cid && x.b === f) || (x.b === cid && x.a === f)); if (w && s.turn - w.start > 6 && (powerRatio(s, cid, f) < 0.8 || s.turn - w.start > 24) && chance(s, 0.5)) { doCmd(s, cid, envoy.id, "poselstvo", f, "mir"); return; } }
  const others = aliveClans(s).filter(o => o.id !== cid && !atWar(s, cid, o.id));
  const o = pick(s, others); if (!o) return;
  const r = rel(s, cid, o.id), ratio = powerRatio(s, cid, o.id);
  if (r > 45 && !allied(s, cid, o.id) && chance(s, 0.4)) { doCmd(s, cid, envoy.id, "poselstvo", o.id, "spojenectvi"); return; }
  if (C.type === "dyn" && o.type === "dyn" && r > 0 && marriageable(s, cid).length && chance(s, 0.3)) { doCmd(s, cid, envoy.id, "poselstvo", o.id, "snatek"); return; }
  if (ratio > 3.5 && !o.vassalOf && !C.vassalOf && clanProvs(s, o.id).some(p => p.nb.some(n => s.provs[n].owner === cid)) && chance(s, 0.3)) { doCmd(s, cid, envoy.id, "poselstvo", o.id, "vazalstvi"); return; }
  if (r < 10 && ratio < 0.7 && C.gold > 300 && chance(s, 0.4)) { doCmd(s, cid, envoy.id, "poselstvo", o.id, "dar"); return; }
  if (o.vassalOf === cid && s.turn - o.vassalSince >= 24 && r >= 70 && chance(s, 0.3)) doCmd(s, cid, envoy.id, "poselstvo", o.id, "pripojit");
}
function aiCaptives(s, cid) {
  for (const c of Object.values(s.chars).filter(x => x.st === "cap" && x.capBy === cid)) {
    if (!chance(s, 0.25)) continue;
    const home = c.cl && s.clans[c.cl] && s.clans[c.cl].alive ? c.cl : null, lead = home && s.clans[home].leader === c.id;
    if (lead || (home && chance(s, 0.5))) { captiveAction(s, cid, c.id, "vykupne"); continue; }
    const x = rnd(s); if (x < 0.4) captiveAction(s, cid, c.id, "naverbovat"); else if (x < 0.85) captiveAction(s, cid, c.id, "propustit"); else if (leaderOf(s, cid) && leaderOf(s, cid).traits.includes("kruty")) captiveAction(s, cid, c.id, "popravit"); else captiveAction(s, cid, c.id, "propustit");
  }
}
