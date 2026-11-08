// Mechaniky ve stylu Europa Universalis.
const ctrl = p => p.occ || p.owner;
const sgn = n => (n > 0 ? "+" : "") + n;
const dev = p => Math.round(p.agri + p.com);
const clanDev = (s, cid) => sum(clanProvs(s, cid).map(dev));
const hasIdea = (s, cid, id) => !!(s.clans[cid] && s.clans[cid].ideas && s.clans[cid].ideas[id]);
const relig = (s, cid) => (s.clans[cid] && s.clans[cid].relig) || "kat";

function initEU(s) {
  for (const C of Object.values(s.clans)) {
    C.mp = { adm: 60, dip: 60, mil: 60 }; C.stab = C.t === "král" ? 1 : 0; C.we = 0; C.ideas = {}; C.missions = {}; C.claims = {};
    C.startProvs = clanProvs(s, C.id).length; C.relig = CLAN_RELIGION[C.id] || "kat"; C.wins = 0;
  }
  for (const p of Object.values(s.provs)) { p.cul = PROV_CULTURE[p.id] || s.clans[p.owner].cul; p.rel = PROV_RELIGION[p.id] || "kat"; p.cores = [p.owner]; p.occ = null; }
  // jádra v roce 1273 dobytých krajů (Štýrsko a Korutany Přemysl drží teprve krátce)
  if (s.opts && s.opts.scen == 1273) for (const id of ["korutany", "kransko"]) s.provs[id].cores = ["premysl"];
}

// ---------- body vlády ----------
function mpGain(s, cid) {
  const C = s.clans[cid], L = chr(s, C.leader), minor = L && age(s, L) < 16, out = {};
  for (const k of MP_IDS) out[k] = 3 + (L && !minor ? Math.floor(st(L, MP[k].stat) / 25) : 0) + Math.floor(officeVal(s, cid, MP[k].off) / 40);
  if (hasIdea(s, cid, "urad")) out.adm++; if (hasIdea(s, cid, "kancelar")) out.dip++;
  return out;
}
function mpTick(s) { for (const C of aliveClans(s)) { const g = mpGain(s, C.id); for (const k of MP_IDS) C.mp[k] = Math.min(999, C.mp[k] + g[k]); } }

// ---------- stabilita a válečné vyčerpání ----------
const stabCost = (s, cid) => Math.round((100 + 30 * Math.max(0, s.clans[cid].stab)) * (hasIdea(s, cid, "desky") ? 0.75 : 1));
function raiseStab(s, cid) { const C = s.clans[cid]; if (C.stab >= 3) return "Stabilita je nejvyšší."; const c = stabCost(s, cid); if (C.mp.adm < c) return `Potřebuješ ${c} bodů správy.`; C.mp.adm -= c; C.stab++; if (isPlayer(s, cid)) log(s, `Stabilita země vzrostla na ${sgn(C.stab)}.`, "politika", [cid]); return null; }
function changeStab(s, cid, d, why) { const C = s.clans[cid]; if (!C) return; const o = C.stab; C.stab = clamp(C.stab + d, -3, 3); if (C.stab !== o && isPlayer(s, cid)) log(s, `Stabilita ${d > 0 ? "stoupla" : "klesla"} na ${sgn(C.stab)}: ${why}.`, "politika", [cid]); }
function reduceWE(s, cid) { const C = s.clans[cid]; if (C.we < 0.5) return "Vyčerpání je zanedbatelné."; if (C.mp.dip < 75) return "Potřebuješ 75 bodů diplomacie."; C.mp.dip -= 75; C.we = Math.max(0, C.we - 2); return null; }
function weTick(s) { for (const C of aliveClans(s)) { const war = enemiesOf(s, C.id).length > 0; C.we = r1(clamp(C.we + (war ? 0.15 : -0.25), 0, 20)); } }

// ---------- rozvoj a začleňování ----------
const devCost = (s, cid, p) => Math.round((40 + dev(p) / 4) * (hasIdea(s, cid, "lokace") ? 0.85 : 1));
function develop(s, cid, pid, kind) {
  const p = s.provs[pid], C = s.clans[cid]; if (!p || p.owner !== cid) return "Není tvůj kraj."; if (p.occ) return "Kraj je obsazen nepřítelem.";
  const c = devCost(s, cid, p); if (C.mp[kind] < c) return `Potřebuješ ${c} bodů (${MP[kind].n.toLowerCase()}).`;
  C.mp[kind] -= c;
  if (kind === "adm") { p.agriMax += 4; p.agri += 4; } else if (kind === "dip") { p.comMax += 4; p.com += 4; } else { p.pop = r1(p.pop + 1.5); p.dur = Math.min(durMax(s, p), p.dur + 30); }
  if (isPlayer(s, cid)) log(s, `Rozvoj kraje ${p.n} (${MP[kind].n.toLowerCase()}).`, "stavby", [cid]); return null;
}
const coreCost = (s, p) => Math.round(15 + dev(p) / 5);
function startCore(s, cid, pid) {
  const p = s.provs[pid], C = s.clans[cid]; if (!p || p.owner !== cid) return "Není tvůj kraj."; if (p.cores.includes(cid)) return "Kraj je už začleněn."; if (p.coring) return "Začleňování už probíhá."; if (p.occ) return "Kraj je obsazen.";
  const c = coreCost(s, p); if (C.mp.adm < c) return `Potřebuješ ${c} bodů správy.`; C.mp.adm -= c; p.coring = { cl: cid, left: 6 };
  if (isPlayer(s, cid)) log(s, `Začleňování kraje ${p.n} (6 měsíců).`, "politika", [cid]); return null;
}
function overext(s, cid) { const ps = clanProvs(s, cid), tot = sum(ps.map(dev)) || 1; return Math.round(sum(ps.filter(p => !p.cores.includes(cid)).map(dev)) / tot * 100); }
function coreTick(s) {
  for (const p of Object.values(s.provs)) if (p.coring) { if (p.owner !== p.coring.cl || p.occ) { p.coring = null; continue; } if (--p.coring.left <= 0) { if (!p.cores.includes(p.owner)) p.cores.push(p.owner); if (isPlayer(s, p.owner)) log(s, `Kraj ${p.n} je začleněn do říše.`, "politika", [p.owner]); p.coring = null; } }
  for (const C of aliveClans(s)) if (overext(s, C.id) > 50 && chance(s, 0.03)) changeStab(s, C.id, -1, "přetažená říše (mnoho nezačleněných krajů)");
}

// ---------- nároky a záminky ----------
function claimValid(s, cid, pid) { return (s.clans[cid].claims[pid] || 0) > s.turn; }
function cbAgainst(s, a, b) {
  const A = s.clans[a], B = s.clans[b], bp = clanProvs(s, b);
  if (bp.some(p => claimValid(s, a, p.id))) return "narok";
  if (bp.some(p => p.cores.includes(a))) return "jadro";
  if (A.titles.some(t => CROWNS[t] && CROWNS[t].core.some(id => s.provs[id].owner === b))) return "koruna";
  if ((B.ban || 0) > s.turn && A.hre) return "klatba";
  if (B.excom > s.turn || relig(s, a) !== relig(s, b)) return "krizova";
  return "zadna";
}

// ---------- okupace ----------
function occupy(s, a, p) {
  const C = s.clans[a.cl], owner = p.owner;
  for (const k of TROOP_IDS) p.troops[k] = 0;
  p.siege = null;
  const friendly = owner === a.cl || allied(s, a.cl, owner) || s.clans[owner].vassalOf === a.cl || C.vassalOf === owner;
  if (friendly) { if (p.occ) news(s, `${C.house} osvobodili kraj ${p.n}.`, "valka", [a.cl, owner, p.occ]); p.occ = null; return; }
  const loot = Math.round((p.com * 2 + p.pop * 2) * (hasIdea(s, a.cl, "korist") ? 2 : 1)); C.gold += loot; s.clans[owner].gold = Math.max(0, s.clans[owner].gold - loot / 2);
  for (const c of Object.values(s.chars).filter(x => x.st === "off" && x.loc === p.id && x.cl === owner && !x.army)) {
    if (chance(s, 0.5 - st(c, "uda") / 250)) capture(s, c, a.cl);
    else { const esc = clanProvs(s, owner).filter(q => q.id !== p.id && !q.occ); if (esc.length) c.loc = (esc.find(q => q.id === s.clans[owner].capital) || esc[0]).id; }
  }
  if (p.lord && chr(s, p.lord) && chr(s, p.lord).loc !== p.id) p.lord = null;
  p.occ = a.cl; p.loy = Math.max(0, p.loy - 10); p.build = null;
  for (const id of a.cmds) { const c = chr(s, id); if (c) c.merit += 20; }
  C.prestige += 3 + p.v;
  news(s, `${C.house} obsadili kraj ${p.n} (${s.clans[owner].house}). Kořist ${loot} zl.`, "valka", [a.cl, owner]);
  if (isPlayer(s, owner) && !s.over) s.events.push({ id: "_lost", pid: p.id, by: a.cl });
  assignLords(s, owner);
}

// ---------- válečné skóre ----------
function warOf(s, a, b) { return s.wars.find(w => (w.a === a && w.b === b) || (w.a === b && w.b === a)); }
function warScore(s, a, b) {
  const w = warOf(s, a, b); if (!w) return 0;
  const bat = (w.bs || 0) * (w.a === a ? 1 : -1);
  const occ = (x, y) => { const yp = clanProvs(s, y), tot = sum(yp.map(dev)) || 1; let v = sum(yp.filter(p => p.occ === x).map(dev)) / tot * 80; if (yp.some(p => p.occ === x && p.id === s.clans[y].capital)) v += 15; return v; };
  return Math.round(clamp(clamp(bat, -40, 40) + occ(a, b) - occ(b, a), -100, 100));
}
function addBattleScore(s, winner, loser, size) { const w = warOf(s, winner, loser); if (!w) return; const d = Math.min(12, 2 + size / 700); w.bs = (w.bs || 0) + (w.a === winner ? d : -d); s.clans[winner].wins = (s.clans[winner].wins || 0) + 1; }

// ---------- mírová jednání ----------
// položky: {t:"kraj", pid} | {t:"zlato", g} | {t:"vazal"} | {t:"pripojit"} | {t:"bila"}
function provPeaceCost(s, winner, loser, p) { const tot = clanDev(s, loser) || 1; return Math.max(5, Math.round(100 * dev(p) / tot * (claimValid(s, winner, p.id) || p.cores.includes(winner) ? 0.7 : 1))); }
function peaceItems(s, winner, loser) {
  const items = [], lp = clanProvs(s, loser);
  for (const p of lp) { const occd = p.occ === winner, cl = claimValid(s, winner, p.id) || p.cores.includes(winner); if (occd || cl) items.push({ t: "kraj", pid: p.id, cost: provPeaceCost(s, winner, loser, p) * (occd ? 1 : 1.5), n: `Postoupit ${p.n}${occd ? "" : " (nárok, neobsazeno)"}` }); }
  const g = Math.round(Math.max(0, s.clans[loser].gold) * 0.5); if (g >= 50) items.push({ t: "zlato", g, cost: Math.min(30, Math.round(g / 20)), n: `Válečné odškodné ${g} zl` });
  if (!s.clans[loser].vassalOf && s.clans[loser].type === "dyn" && s.clans[loser].t !== "král") items.push({ t: "vazal", cost: Math.min(95, 40 + clanDev(s, loser) / 15), n: "Stát se vazalem" });
  if (lp.length && lp.every(p => p.occ === winner)) items.push({ t: "pripojit", cost: 100, n: "Připojit celou zemi" });
  return items;
}
function peaceCostSum(items) { return sum(items.map(i => i.cost || 0)); }
function aiAcceptsPeace(s, from, to, items, fromIsWinner) {
  const ws = warScore(s, from, to), T = s.clans[to], months = (warOf(s, from, to) ? s.turn - warOf(s, from, to).start : 0);
  if (!fromIsWinner) { // někdo nabízí ústupky nebo bílý mír
    const give = peaceCostSum(items); return -ws + give + T.we * 2 + months / 2 >= 10;
  }
  return ws + T.we * 2 + (months > 24 ? 10 : 0) >= peaceCostSum(items) && ws > 0 || peaceCostSum(items) === 0 && ws + T.we * 2 + months / 2 >= 10;
}
function applyPeace(s, winner, loser, items) {
  const W = s.clans[winner], L = s.clans[loser], got = []; let ae = 0;
  for (const it of items) {
    if (it.t === "kraj" && s.provs[it.pid].owner === loser) { transferProv(s, it.pid, winner, "mír"); got.push(s.provs[it.pid].n); ae += dev(s.provs[it.pid]); }
    if (it.t === "zlato") { const g = Math.min(it.g, Math.max(0, L.gold)); L.gold -= g; W.gold += g; got.push(g + " zl"); }
    if (it.t === "vazal" && L.alive) { makeVassal(s, loser, winner); got.push("vazalství"); ae += clanDev(s, loser) / 2; }
    if (it.t === "pripojit" && L.alive) { ae += clanDev(s, loser); for (const p of clanProvs(s, loser)) transferProv(s, p.id, winner, "mír"); got.push("celá země"); }
  }
  if (atWar(s, winner, loser)) makePeace(s, winner, loser);
  if (ae) aggressiveExpansion(s, winner, ae, items.filter(i => i.t === "kraj").map(i => i.pid));
  W.prestige += Math.round(Math.min(50, ae / 6)) + 5; L.prestige = Math.max(0, L.prestige - 10);
  news(s, `Mír: ${W.house} a ${L.house}${got.length ? ` – ${W.house} získávají: ${got.join(", ")}` : " – bílý mír"}.`, "valka", [winner, loser]);
}
function proposePeace(s, from, to, items, fromIsWinner) {
  if (!atWar(s, from, to)) return "Nejste ve válce.";
  if (isPlayer(s, to)) { s.events.push({ id: "_peaceOffer", from, items, win: fromIsWinner }); return null; }
  if (aiAcceptsPeace(s, from, to, items, fromIsWinner)) { if (fromIsWinner) applyPeace(s, from, to, items); else applyPeace(s, to, from, items); return null; }
  addRel(s, from, to, -3); return `${s.clans[to].house} podmínky odmítli (válečné skóre ${warScore(s, from, to)}, požadováno ${peaceCostSum(items)}).`;
}
function greedyDemand(s, winner, loser, ws) {
  const all = peaceItems(s, winner, loser); if (all.some(i => i.t === "pripojit") && ws >= 95) return [all.find(i => i.t === "pripojit")];
  const out = []; let left = ws;
  for (const it of all.filter(i => i.t === "kraj").sort((a, b) => dev(s.provs[b.pid]) - dev(s.provs[a.pid]))) if (it.cost <= left) { out.push(it); left -= it.cost; }
  const g = all.find(i => i.t === "zlato"); if (g && g.cost <= left) out.push(g);
  return out;
}
function aiPeaceTick(s) {
  for (const w of s.wars.slice()) {
    if (!s.wars.includes(w)) continue;
    const ws = warScore(s, w.a, w.b), months = s.turn - w.start, win = ws >= 0 ? w.a : w.b, lose = win === w.a ? w.b : w.a, aws = Math.abs(ws);
    const allOcc = clanProvs(s, lose).length && clanProvs(s, lose).every(p => p.occ === win);
    if (!(allOcc || (aws >= 25 && chance(s, 0.12 + s.clans[lose].we / 60)) || (months > 36 && chance(s, 0.08)))) continue;
    if (isPlayer(s, win)) { if (aws >= 25 && !s.events.some(e => e.id === "_peaceOffer" && e.from === lose)) s.events.push({ id: "_peaceOffer", from: lose, items: greedyDemand(s, win, lose, aws), win: false }); continue; }
    if (isPlayer(s, lose)) { if (!s.events.some(e => e.id === "_peaceOffer" && e.from === win)) s.events.push({ id: "_peaceOffer", from: win, items: aws >= 10 ? greedyDemand(s, win, lose, aws) : [], win: true }); continue; }
    applyPeace(s, win, lose, aws >= 10 ? greedyDemand(s, win, lose, aws) : []);
  }
}

// ---------- agresivní expanze a koalice ----------
function aggressiveExpansion(s, cid, amount, pids) {
  const k = hasIdea(s, cid, "smir") ? 0.67 : 1;
  for (const o of aliveClans(s)) {
    if (o.id === cid || o.vassalOf === cid) continue;
    const near = pids && pids.length ? Math.min(...clanProvs(s, o.id).map(p => Math.min(...pids.map(id => dist(p, s.provs[id]))))) : 300;
    const f = near < 150 ? 1 : near < 350 ? 0.6 : 0.3;
    addRel(s, cid, o.id, -Math.round(amount / 6 * f * k));
  }
}
function coalitionTick(s) {
  if (s.turn % 3) return;
  const top = aliveClans(s).sort((a, b) => realmProvs(s, b.id) - realmProvs(s, a.id)).slice(0, 4).map(c => c.id);
  if (!top.includes(s.player)) top.push(s.player);
  for (const X of top) {
    if (!s.clans[X] || !s.clans[X].alive || (s.flags["coal_" + X] || 0) > s.turn) continue;
    const angry = aliveClans(s).filter(o => o.id !== X && rel(s, X, o.id) < -50 && !allied(s, X, o.id) && o.vassalOf !== X && !atWar(s, X, o.id) && truceUntil(s, X, o.id) <= s.turn && clanProvs(s, o.id).some(p => p.nb.some(n => s.provs[n].owner === X) || dist(p, s.provs[s.clans[X].capital] || p) < 400));
    if (angry.length < 3 || sum(angry.map(o => clanPower(s, o.id))) < clanPower(s, X) * 0.9 || !chance(s, 0.25)) continue;
    s.flags["coal_" + X] = s.turn + 60;
    for (const a of angry) for (const b of angry) if (a.id < b.id) s.alliances[pairKey(a.id, b.id)] = true;
    news(s, `Proti rodu ${s.clans[X].house} se zformovala koalice: ${angry.map(o => o.house).join(", ")}!`, "valka", [X]);
    for (const a of angry) declareWar(s, a.id, X, "koalice");
  }
}

// ---------- ideje a úkoly ----------
function nextIdea(s, cid, g) { return IDEAS[g].list.find(([id]) => !hasIdea(s, cid, id)); }
function buyIdea(s, cid, g) {
  const C = s.clans[cid], nx = nextIdea(s, cid, g); if (!nx) return "Skupina je hotová."; const k = IDEAS[g].mp;
  if (C.mp[k] < IDEA_COST) return `Potřebuješ ${IDEA_COST} bodů (${MP[k].n.toLowerCase()}).`;
  C.mp[k] -= IDEA_COST; C.ideas[nx[0]] = true; if (isPlayer(s, cid)) log(s, `Nová idea: ${nx[1]} (${nx[2]}).`, "politika", [cid]); return null;
}
function missionsFor(s, cid) { return MISSIONS.filter(m => !m.only || m.only === cid || (Array.isArray(m.only) && m.only.includes(cid))); }
function missionTick(s) {
  for (const C of aliveClans(s)) for (const m of missionsFor(s, C.id)) if (!C.missions[m.id] && m.t(s, C.id)) { C.missions[m.id] = s.turn; m.g(s, C.id); if (isPlayer(s, C.id)) { log(s, `Úkol splněn: ${m.n}! Odměna: ${m.r}.`, "rod", [C.id]); s.events.push({ id: "_mission", mid: m.id }); } }
}

// ---------- víra ----------
function convertProv(s, cid, c, p) {
  if (p.rel === relig(s, cid)) return "Kraj už vyznává tvou víru.";
  const ch = (0.12 + st(c, "roz") / 300) * (hasIdea(s, cid, "misie") ? 2 : 1) * (cid === "rad" ? 1.5 : 1);
  if (chance(s, ch)) { p.rel = relig(s, cid); p.loy = Math.max(0, p.loy - 5); return `kraj ${p.n} přijal víru ${RELIGIONS[p.rel].n}.`; }
  return `misie v kraji ${p.n} zatím nepřinesla obrácení.`;
}

// ---------- měsíční tah a umělá inteligence ----------
function euTick(s) {
  mpTick(s); weTick(s); coreTick(s);
  for (const C of aliveClans(s)) {
    for (const k of Object.keys(C.claims)) if (C.claims[k] <= s.turn) delete C.claims[k];
    if (hasIdea(s, C.id, "pout")) C.prestige += 0.5; if (hasIdea(s, C.id, "biskupove")) s.pope.op[C.id] = Math.min(100, (s.pope.op[C.id] || 0) + 0.5);
    if (!isPlayer(s, C.id)) aiEU(s, C.id);
  }
  aiPeaceTick(s); coalitionTick(s); missionTick(s);
}
function aiEU(s, cid) {
  const C = s.clans[cid];
  if (C.stab < 1 && C.mp.adm >= stabCost(s, cid)) raiseStab(s, cid);
  for (const p of clanProvs(s, cid)) if (!p.cores.includes(cid) && !p.coring && !p.occ && C.mp.adm >= coreCost(s, p) + 20) startCore(s, cid, p.id);
  if (C.we > 6 && C.mp.dip > 120) reduceWE(s, cid);
  for (const k of MP_IDS) if (C.mp[k] > 400) { const groups = Object.keys(IDEAS).filter(g => IDEAS[g].mp === k && nextIdea(s, cid, g)); if (groups.length && chance(s, 0.3)) buyIdea(s, cid, pick(s, groups)); else { const p = clanProvs(s, cid).filter(q => !q.occ).sort((a, b) => b.v - a.v)[0]; if (p) develop(s, cid, p.id, k); } }
  // nečinná vojska táhnou dál nebo domů
  for (const a of s.armies.filter(x => x.cl === cid && (!x.path || !x.path.length) && !x.engaged)) {
    const p = s.provs[a.loc]; if (p.siege && p.siege.army === a.id) continue;
    if (ctrl(p) === cid && p.owner !== cid) {
      const t = p.nb.map(n => s.provs[n]).filter(q => atWar(s, cid, ctrl(q)) && provDefense(s, q) * (q.occ ? 0.2 : 1) < troopPower(s, cid, a.t, { train: a.train }) * 1.1).sort((x, y) => dev(y) - dev(x))[0];
      if (t) orderArmy(s, cid, a.id, "tahnout", t.id); else armyHome(s, a);
    }
  }
}
