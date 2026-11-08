// Diplomacie mezi rody, sňatky, vazalství, říše a papež.

const DIPLO = {
  dar: { n: "Poslat dary (100 zl)" }, spojenectvi: { n: "Nabídnout spojenectví" }, snatek: { n: "Dohodnout sňatek" },
  snatek_veno: { n: "Sňatek – věnem dát pohraniční kraj" }, snatek_zlato: { n: "Sňatek – žádat věno (zlato)" },
  mir: { n: "Uzavřít mír (příměří na 2 roky)" }, mir_zlato: { n: "Koupit mír (zaplatit 2× jejich měsíční příjem)" },
  vazalstvi: { n: "Žádat lenní hold (ať se stanou vazaly)" }, poddat: { n: "Nabídnout se jim za vazala" },
  pomoc: { n: "Žádat o pomoc ve válce" }, vypovedet: { n: "Vypovědět spojenectví" }, pripojit: { n: "Připojit vazala k říši" },
};
// příbuzní, kteří mohou uzavřít sňatek
function marriageable(s, cid) { return Object.values(s.chars).filter(c => c.cl === cid && c.dyn && !c.spouse && !c.c && c.st !== "dead" && c.st !== "cap" && age(s, c) >= 13 && age(s, c) <= 45); }
function powerRatio(s, a, b) { return (clanPower(s, a) + 1) / (clanPower(s, b) + 1); }
// ochota rodu `to` přijmout návrh od `from` (kladné = přijme)
function willing(s, from, to, typ, envoy) {
  const T = s.clans[to], F = s.clans[from], r = rel(s, from, to), dip = (envoy ? st(envoy, "roz") / 5 : 5) + officeVal(s, from, "kancler") / 10, pr = (F.prestige - T.prestige) / 60;
  const ratio = powerRatio(s, from, to), commonEnemy = enemiesOf(s, from).some(e => enemiesOf(s, to).includes(e)) ? 20 : 0, mar = married(s, from, to) ? 12 : 0;
  switch (typ) {
    case "spojenectvi": return r + dip + pr + commonEnemy + mar + Math.min(15, (ratio - 1) * 10) - 60 - (enemiesOf(s, from).length ? 10 : 0);
    case "snatek": return r + dip + pr / 2 + 15 - (T.type !== "dyn" ? 999 : 0);
    case "snatek_veno": return r + dip + pr / 2 + 45 - (T.type !== "dyn" ? 999 : 0);
    case "snatek_zlato": return r + dip + pr / 2 + 15 - 25 - (T.type !== "dyn" ? 999 : 0);
    case "mir": { const w = s.wars.find(x => (x.a === from && x.b === to) || (x.a === to && x.b === from)); const months = w ? s.turn - w.start : 0; return r / 2 + dip + months * 1.5 + (ratio - 1) * 40 + (T.warLoss || 0) / 200 - 15; }
    case "mir_zlato": return 30 + dip + r / 3;
    case "vazalstvi": return (ratio - 3) * 18 + r / 3 + dip + pr / 2 - (T.type === "dyn" && T.t === "král" ? 60 : 0) - (atWar(s, from, to) ? 0 : 10) + (s.hre.kingClan === from && T.hre ? 25 : 0);
    case "poddat": return (1 / ratio - 1) * 10 + r / 2 + 20;
    case "pomoc": return r + dip + mar + commonEnemy - 45;
  }
  return -999;
}
function diplomacy(s, cid, envoy, to, typ, extra) {
  const C = s.clans[cid], T = s.clans[to]; if (!T || !T.alive || to === cid) return "Vyber jiný rod.";
  const me = isPlayer(s, cid), toPlayer = isPlayer(s, to);
  const say = t => { log(s, `Poselstvo k rodu ${T.house}: ${t}`, "diplomacie", [cid, to]); return null; };
  if (envoy) envoy.merit += 4;
  switch (typ) {
    case "dar": { const g = 100; if (!pay(s, cid, g)) return "Nedostatek zlata."; T.gold += g; const v = Math.round(10 * (1 + (envoy ? st(envoy, "roz") : 40) / 150) + (T.type !== "dyn" ? 3 : 0)); addRel(s, cid, to, v); return say(`dary přijaty, vztah +${v}.`); }
    case "vypovedet": if (!allied(s, cid, to)) return "Nejste spojenci."; delete s.alliances[pairKey(cid, to)]; addRel(s, cid, to, -30); C.prestige -= 15; return say("spojenectví vypovězeno.");
  }
  if (toPlayer) { s.events.push({ id: "_proposal", from: cid, typ, envoy: envoy ? envoy.id : null }); return null; }
  switch (typ) {
    case "spojenectvi": if (allied(s, cid, to)) return "Už jste spojenci."; if (atWar(s, cid, to)) return "Jste ve válce.";
      if (willing(s, cid, to, typ, envoy) > 0) { s.alliances[pairKey(cid, to)] = true; addRel(s, cid, to, 10); return say("spojenectví uzavřeno!"); } addRel(s, cid, to, -2); return say("spojenectví odmítli.");
    case "snatek": case "snatek_veno": case "snatek_zlato": {
      if (atWar(s, cid, to)) return "Jste ve válce.";
      const dowry = typ === "snatek_veno" ? clanProvs(s, cid).filter(p => p.id !== C.capital && !p.siege && p.nb.some(n => s.provs[n].owner === to)).sort((a, b) => a.v - b.v)[0] : null;
      if (typ === "snatek_veno" && !dowry) return "Nemáš pohraniční kraj, který bys mohl dát věnem."; const mine = extra ? chr(s, extra) : marriageable(s, cid)[0]; if (!mine || mine.cl !== cid || mine.spouse) return "Nemáš svobodného člena rodu (13–45 let).";
      if (willing(s, cid, to, typ, envoy) <= 0) { return say("sňatek odmítli."); }
      let extra2 = "";
      if (dowry) { transferProv(s, dowry.id, to, "věno"); addRel(s, cid, to, 20); extra2 = ` Věnem dostávají kraj ${dowry.n}.`; }
      if (typ === "snatek_zlato") { const g = Math.round(Math.max(50, T.gold * 0.3)); T.gold -= g; C.gold += g; extra2 = ` Věno: ${g} zl.`; }
      let theirs = marriageable(s, to).find(c => c.sex !== mine.sex);
      if (!theirs) theirs = makeChar(s, { n: pick(s, mine.sex === "m" ? FEMALE[T.cul] : SONS[T.cul]) + " (" + T.house.split(" (")[0] + ")", sex: mine.sex === "m" ? "f" : "m", by: s.year - clamp(age(s, mine) + rint(s, -6, 3), 14, 40), cl: to, st: "fam", dyn: 1, loc: T.capital });
      wed(s, mine, theirs); return say(`${mine.n} a ${theirs.n} budou oddáni. Rody jsou spřízněny.${extra2}`);
    }
    case "mir": case "mir_zlato": {
      if (!atWar(s, cid, to)) return "Nejste ve válce.";
      if (typ === "mir_zlato") { const g = Math.round(Math.max(100, clanBudget(s, to).net * 2 + 80)); if (C.gold < g) return `Potřebuješ ${g} zl.`; if (willing(s, cid, to, typ, envoy) > 0) { C.gold -= g; T.gold += g; makePeace(s, cid, to); return say(`mír koupen za ${g} zl.`); } return say("mír odmítli i za zlato."); }
      if (willing(s, cid, to, typ, envoy) > 0) { makePeace(s, cid, to); return say("uzavřeno příměří na dva roky."); } return say("o míru nechtějí slyšet.");
    }
    case "vazalstvi": if (T.vassalOf) return "Už jsou něčími vazaly."; if (C.vassalOf) return "Sám jsi vazal.";
      if (willing(s, cid, to, typ, envoy) > 0) { makeVassal(s, to, cid); return say(`${T.house} skládají lenní hold! Jsou tvými vazaly.`); } addRel(s, cid, to, -10); return say("lenní hold odmítli – urazilo je to.");
    case "poddat": if (C.vassalOf) return "Už jsi vazal."; if (willing(s, cid, to, typ, envoy) > 0) { makeVassal(s, cid, to); return say("přijali tě za vazala a budou tě chránit."); } return say("tvou službu odmítli.");
    case "pomoc": { const foes = enemiesOf(s, cid).filter(e => !atWar(s, to, e) && !allied(s, to, e) && s.clans[e].vassalOf !== to); if (!foes.length) return "Nemáš válku, do které by mohli vstoupit.";
      if (willing(s, cid, to, typ, envoy) > 0) { declareWar(s, to, foes[0], "pomoc spojenci"); return say(`vstupují do války proti rodu ${s.clans[foes[0]].house}!`); } return say("pomoc odmítli."); }
    case "pripojit": if (T.vassalOf !== cid) return "Nejsou tvými vazaly."; if (s.turn - T.vassalSince < 24) return `Vazalem musí být aspoň 2 roky (zbývá ${24 - (s.turn - T.vassalSince)} měsíců).`; if (rel(s, cid, to) < 70) return "Vztah musí být aspoň 70."; { const dc = Math.round(clanDev(s, to) * 0.6); if (C.mp && C.mp.dip < dc) return `Připojení stojí ${dc} bodů diplomacie.`; if (C.mp) C.mp.dip -= dc; }
      annex(s, to, cid); return null;
  }
  return "Neznámé jednání.";
}
function wed(s, a, b) {
  a.spouse = b.id; b.spouse = a.id; const wife = a.sex === "f" ? a : b, husband = a.sex === "f" ? b : a;
  wife.origin = wife.origin || wife.cl; if (wife.cl !== husband.cl) { wife.cl = husband.cl; wife.loc = s.clans[husband.cl].capital; if (wife.st === "off") wife.st = "fam"; }
  const k = pairKey(a.origin || a.cl, b.origin || b.cl); if (a.origin !== b.origin || true) s.marriages[pairKey(husband.cl, wife.origin)] = true;
  addRel(s, husband.cl, wife.origin, 25); s.clans[husband.cl].prestige += 10;
}
function makePeace(s, a, b) { s.wars = s.wars.filter(w => !((w.a === a && w.b === b) || (w.a === b && w.b === a)));
  for (const p of Object.values(s.provs)) if ((p.owner === a && p.occ === b) || (p.owner === b && p.occ === a)) { p.occ = null; p.siege = null; } s.truces[pairKey(a, b)] = s.turn + 24; addRel(s, a, b, 10); for (const ar of s.armies.filter(x => (x.cl === a && s.provs[x.loc].owner === b) || (x.cl === b && s.provs[x.loc].owner === a))) armyHome(s, ar); news(s, `Mír mezi rody ${s.clans[a].house} a ${s.clans[b].house}.`, "valka", [a, b]); }
function makeVassal(s, v, lord) {
  const V = s.clans[v]; V.vassalOf = lord; V.vassalSince = s.turn; addRel(s, v, lord, 20); s.clans[lord].prestige += 20 + clanProvs(s, v).length * 5;
  for (const w of s.wars.slice()) if (w.a === v && w.b === lord || w.b === v && w.a === lord) makePeace(s, v, lord);
  news(s, `${V.house} (${V.n}) se stávají vazaly rodu ${s.clans[lord].house}.`, "diplomacie", [v, lord]);
}
function annex(s, v, lord) {
  const V = s.clans[v];
  for (const p of clanProvs(s, v)) transferProv(s, p.id, lord, "připojení");
  for (const c of Object.values(s.chars)) if (c.cl === v && c.st !== "dead") { if (c.st === "off") { c.cl = lord; c.loy = Math.max(c.loy, 60); } else if (c.st === "fam" || c.st === "kid") c.cl = lord; }
  V.alive = false; for (const a of s.armies.filter(x => x.cl === v)) a.cl = lord;
  news(s, `${V.n} bylo připojeno k zemím rodu ${s.clans[lord].house}.`, "diplomacie", [v, lord]);
}
function declareWar(s, a, b, why) {
  const A = s.clans[a], B = s.clans[b];
  if (atWar(s, a, b)) return "Už spolu válčíte."; if (a === b) return "Nelze.";
  if (B.vassalOf === a) return "Jsou tvými vazaly.";
  if (A.vassalOf && A.vassalOf !== b && s.clans[A.vassalOf] && allied(s, A.vassalOf, b)) return "Tvůj lenní pán je jejich spojencem.";
  const banned = (B.ban || 0) > s.turn;
  if (allied(s, a, b)) { delete s.alliances[pairKey(a, b)]; A.prestige -= 50; s.pope.op[a] -= 20; for (const c of aliveClans(s)) if (c.id !== a) addRel(s, a, c.id, -6); news(s, `${A.house} zradili spojence!`, "valka", [a, b]); }
  if (truceUntil(s, a, b) > s.turn && !banned) { A.prestige -= 40; s.pope.op[a] -= 30; for (const c of aliveClans(s)) if (c.id !== a) addRel(s, a, c.id, -4); }
  if (B.type !== "dyn" && !(B.excom > s.turn)) s.pope.op[a] -= 35;
  if (A.vassalOf === b) { A.vassalOf = null; news(s, `${A.house} se vzbouřili proti svému lennímu pánovi!`, "valka", [a, b]); }
  addRel(s, a, b, -50);
  const cb = why ? (why === "koalice" ? "koalice" : "pomoc") : cbAgainst(s, a, b);
  if (cb === "zadna") { changeStab(s, a, isPlayer(s, a) ? -2 : -1, "válka bez záminky"); A.prestige -= 30; for (const c of aliveClans(s)) if (c.id !== a && c.id !== b) addRel(s, a, c.id, -5); }
  s.wars.push({ a, b, start: s.turn, cb, bs: 0 });
  news(s, `${A.house} (${A.n}) vyhlásili válku rodu ${B.house} (${B.n})${why ? " – " + why : ""}.`, "valka", [a, b]);
  // spojenci a vazalové obránce
  for (const c of aliveClans(s)) {
    if (c.id === a || c.id === b || atWar(s, c.id, a)) continue;
    if (c.vassalOf === b || (allied(s, c.id, b) && !allied(s, c.id, a))) {
      if (isPlayer(s, c.id)) s.events.push({ id: "_callToArms", ally: b, enemy: a });
      else if (c.vassalOf === b || rel(s, c.id, b) > 25 + rnd(s) * 30) { s.wars.push({ a: c.id, b: a, start: s.turn }); addRel(s, c.id, a, -40); news(s, `${c.house} vstupují do války na straně rodu ${B.house}.`, "valka", [c.id, a]); }
    }
    if (c.vassalOf === a && !atWar(s, c.id, b)) { s.wars.push({ a: c.id, b, start: s.turn }); }
  }
  if (isPlayer(s, b)) s.events.push({ id: "_war", by: a });
  return null;
}

// ---------- svatá říše ----------
const ELECTOR_CLANS = { "Čechy": "premysl", "Falc": "wittH", "Sasko": "sasko", "Braniborsko": "brandenburg" };
function electorHolders(s) {
  // kurfiřtský hlas drží rod, který vlastní sídelní kraj (nebo původní rod)
  const seats = { "Čechy": "praha", "Falc": "heidelberg", "Sasko": "wittenberg", "Braniborsko": "branibor" }, out = {};
  for (const [k, pid] of Object.entries(seats)) out[k] = s.provs[pid].owner;
  return out;
}
function candidates(s) {
  const out = EXT_CANDIDATES.filter(c => s.year <= c.until).map(c => ({ id: c.id, n: c.n, ext: true, gold: c.gold - Math.max(0, s.year - 1257) * 2 }));
  const inner = aliveClans(s).filter(c => c.hre && c.type === "dyn" && !c.vassalOf && leaderOf(s, c.id) && age(s, leaderOf(s, c.id)) >= 18)
    .sort((a, b) => (b.candidate ? 999 : 0) + b.prestige / 10 + st(leaderOf(s, b.id), "ved") + st(leaderOf(s, b.id), "roz") - (a.candidate ? 999 : 0) - a.prestige / 10 - st(leaderOf(s, a.id), "ved") - st(leaderOf(s, a.id), "roz")).slice(0, 5);
  for (const c of inner) out.push({ id: c.id, n: leaderOf(s, c.id).n + " (" + c.house + ")" });
  return out;
}
function voteScore(s, voter, cand, extVoter) {
  if (cand.ext) return (extVoter ? cand.gold + 10 : cand.gold - 10) + (s.hre.ext.extCand && s.hre.ext.extCand[cand.id] || 0) + rnd(s) * 25;
  const C = s.clans[cand.id];
  const L = leaderOf(s, cand.id);
  let v = Math.min(30, C.prestige / 25) + (st(L, "ved") + st(L, "roz")) / 8 + (s.pope.op[cand.id] || 0) / (extVoter ? 3 : 8) + rnd(s) * 25 - Math.max(0, realmProvs(s, cand.id) - 5) * 4 - (age(s, L) < 25 ? 15 : 0);
  if (extVoter) v += s.hre.ext[voter][cand.id] || 0; else v += voter === cand.id ? 60 : rel(s, voter, cand.id) / 2;
  return v;
}
function runElection(s) {
  const cands = candidates(s), votes = [];
  for (const e of EXT_ELECTORS) { const best = cands.slice().sort((a, b) => voteScore(s, e.id, b, true) - voteScore(s, e.id, a, true))[0]; votes.push([extElectorName(s, e), best]); }
  const holders = electorHolders(s);
  for (const [title, cid] of Object.entries(holders)) {
    if (!s.clans[cid] || !s.clans[cid].alive) continue;
    let best; if (isPlayer(s, cid) && s.hre.playerVote) best = cands.find(c => c.id === s.hre.playerVote) || cands[0];
    else best = cands.slice().sort((a, b) => voteScore(s, cid, b, false) - voteScore(s, cid, a, false))[0];
    votes.push([`${title} (${s.clans[cid].house})`, best]);
  }
  const tally = {}; for (const [, c] of votes) tally[c.id] = (tally[c.id] || 0) + 1;
  const ranked = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const res = { d: dateStr(s), votes: votes.map(([v, c]) => [v, c.n]), tally: ranked.map(([id, n]) => [cands.find(c => c.id === id).n, n]) };
  s.hre.lastElection = res; s.hre.playerVote = null;
  const [winId, n] = ranked[0], second = ranked[1];
  if (second && second[1] === n) {
    res.txt = "Volba skončila nerozhodně – dvojí volba. Říše zůstává bez uznaného krále, nová volba za rok.";
    s.hre.election = s.turn + 12; news(s, res.txt, "rise"); return;
  }
  const w = cands.find(c => c.id === winId);
  if (w.ext) { s.hre.king = "ext:" + w.n; s.hre.kingClan = null; s.hre.kingDies = s.turn + rint(s, 60, 180); res.txt = `Římským králem zvolen ${w.n}. V říši se ale téměř neukáže.`; }
  else { const C = s.clans[w.id]; s.hre.king = C.leader; s.hre.kingClan = w.id; C.prestige += 150; C.titles.push("Římský král"); res.txt = `Římským králem zvolen ${w.n}!`; for (const c of aliveClans(s)) if (c.hre && c.id !== w.id) addRel(s, c.id, w.id, 10); }
  s.hre.election = null; news(s, res.txt + ` (${n} hlasů ze 7)`, "rise");
}
function hreTick(s) {
  const H = s.hre;
  if (H.kingClan) { const k = chr(s, H.king); if (!k || k.st === "dead" || s.clans[H.kingClan].leader !== H.king) { const C = s.clans[H.kingClan]; C.titles = C.titles.filter(t => t !== "Římský král" && t !== "Císař"); news(s, `Římský král ${k ? k.n : ""} zemřel. Kurfiřti se sejdou k volbě za ${8} měsíců.`, "rise"); H.king = null; H.kingClan = null; H.emperor = null; H.election = s.turn + 8; } }
  else if (H.king && H.king.startsWith("ext:") && s.turn >= H.kingDies) { news(s, `Zemřel římský král ${H.king.slice(4)}. ${H.king.includes("Vilém") ? "Na volbu nového krále se chystají cizí kandidáti i říšská knížata." : ""} Volba proběhne za ${H.king.includes("Vilém") ? 12 : 8} měsíců.`, "rise"); H.election = s.turn + (H.king.includes("Vilém") ? 12 : 8); H.king = null; }
  if (H.election && s.turn === H.election - 1 && Object.values(electorHolders(s)).includes(s.player) && P(s).alive) s.events.push({ id: "_vote" });
  if (H.election && s.turn >= H.election) runElection(s);
  // cizí kandidáti uplácejí arcibiskupy
  if (H.election) { H.ext.extCand = H.ext.extCand || {}; for (const c of EXT_CANDIDATES.filter(x => s.year <= x.until)) H.ext.extCand[c.id] = (H.ext.extCand[c.id] || 0) + rnd(s) * 1.5; }
}
function bribeElector(s, cid, eid, g) { if (!s.hre.election) return "Volba není vypsána."; if (!pay(s, cid, g)) return "Nedostatek zlata."; s.hre.ext[eid][cid] = (s.hre.ext[eid][cid] || 0) + g / 10; log(s, `Dary pro ${extElectorName(s, EXT_ELECTORS.find(e => e.id === eid))}: ${g} zl.`, "rise", [cid]); return null; }
function standForElection(s, cid) { const C = s.clans[cid]; if (!C.hre) return "Tvůj rod nepatří do říše."; if (C.prestige < 120) return "Potřebuješ aspoň 120 prestiže."; C.candidate = true; log(s, `${leaderOf(s, cid).n} se uchází o římskou korunu.`, "rise", [cid]); return null; }
function imperialBan(s, cid, target) { if (s.hre.kingClan !== cid) return "Nejsi římský král."; const T = s.clans[target]; if (!T.hre) return "Rod nepatří do říše."; if (C_prestige(s, cid) < 50) return "Nedostatek prestiže."; s.clans[cid].prestige -= 50; T.ban = s.turn + 36; for (const c of aliveClans(s)) if (c.hre) addRel(s, c.id, target, -15); news(s, `Římský král uvalil na rod ${T.house} říšskou klatbu!`, "rise", [cid, target]); return null; }
const C_prestige = (s, cid) => s.clans[cid].prestige;
function imperialCoronation(s, cid) { if (s.hre.kingClan !== cid) return "Nejsi římský král."; if (s.hre.emperor) return "Už jsi císař."; if ((s.pope.op[cid] || 0) < 50) return "Papež tě nekoruje (přízeň aspoň 50)."; if (!pay(s, cid, 800)) return "Jízda do Říma stojí 800 zl."; s.hre.emperor = s.clans[cid].leader; s.clans[cid].titles.push("Císař"); s.clans[cid].prestige += 300; news(s, `${leaderOf(s, cid).n} byl v Římě korunován na císaře Svaté říše římské!`, "rise", [cid]); return null; }

// ---------- koruny a papež ----------
const CROWNS = {
  "Čechy": { core: ["praha", "plzen", "zatec", "litomerice", "hradec", "caslav", "bechyne", "brno", "olomouc"], cap: "praha" },
  "Uhry": { core: ["budin", "ostrihom", "belehrad", "prespurk", "nitra", "rab", "pecs", "varadin", "segedin", "kosice"], cap: "ostrihom" },
  "Polsko": { core: ["krakov", "sandomer", "poznan", "hnezdno", "kalis", "lencice", "sieradz", "plock", "vratislav", "inowroclaw"], cap: "hnezdno" },
  "Halič": { core: ["chelm", "vladimir", "halic", "lvov", "premysl_r"], cap: "halic" },
};
function crownHolder(s, k) { return aliveClans(s).find(c => c.titles.includes(k)); }
function canCrown(s, cid, k) {
  const K = CROWNS[k], C = s.clans[cid]; if (C.titles.includes(k)) return "Korunu už držíš.";
  if (C.type !== "dyn") return "Církevní knížectví nemůže nosit korunu.";
  const own = K.core.filter(id => s.provs[id].owner === cid).length;
  if (s.provs[K.cap].owner !== cid) return `Musíš držet korunovační kraj ${s.provs[K.cap].n}.`;
  if (own < Math.ceil(K.core.length * 0.5)) return `Musíš držet aspoň polovinu jádra koruny (${own}/${K.core.length}).`;
  if ((s.pope.op[cid] || 0) < 30) return "Papež musí korunovaci schválit (přízeň aspoň 30).";
  if (C.gold < 500) return "Korunovace stojí 500 zl.";
  return null;
}
function crown(s, cid, k) {
  const e = canCrown(s, cid, k); if (e) return e; const C = s.clans[cid], old = crownHolder(s, k);
  if (old) old.titles = old.titles.filter(t => t !== k);
  C.gold -= 500; C.titles.push(k); C.prestige += 200; C.t = "král";
  news(s, `${leaderOf(s, cid).n} byl korunován: ${k}!${old ? " Rod " + old.house + " o korunu přišel." : ""}`, "rise", [cid]); return null;
}
function popeGift(s, cid) { if (!pay(s, cid, 100)) return "Nedostatek zlata."; s.pope.op[cid] = Math.min(100, (s.pope.op[cid] || 0) + 10); s.clans[cid].piety += 5; log(s, "Dar Svatému stolci (+10 přízně papeže).", "cirkev", [cid]); return null; }
function penance(s, cid) { const C = s.clans[cid]; if (!(C.excom > s.turn)) return "Nejsi v klatbě."; if (!pay(s, cid, 250)) return "Pokání stojí 250 zl."; C.excom = 0; s.pope.op[cid] = Math.max(s.pope.op[cid], 0); C.prestige -= 30; log(s, "Panovník vykonal veřejné pokání a klatba byla sejmuta.", "cirkev", [cid]); return null; }
function popeTick(s) {
  for (const c of aliveClans(s)) {
    const o = s.pope.op[c.id] || 0;
    s.pope.op[c.id] = clamp(o + (c.type !== "dyn" ? 0.5 : 0) + (c.laws && c.laws.cirkev === 0 ? 0.5 : 0) - (c.laws && c.laws.cirkev === 2 ? 0.5 : 0) + (o < 0 ? 0.3 : -0.1), -100, 100);
    if (s.pope.op[c.id] < -60 && !(c.excom > s.turn)) { c.excom = s.turn + 36; c.prestige -= 40; changeStab(s, c.id, -1, "papežská klatba"); news(s, `Papež dal do klatby rod ${c.house}!`, "cirkev", [c.id]); }
  }
}
