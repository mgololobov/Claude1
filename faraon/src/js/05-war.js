// Válka: vojska v poli, pochody po Nilu, bitvy, obléhání, nájezdy kmenů; diplomacie.

function passable(s, cid, pid) { const o = s.provs[pid].owner; return o === cid || friendly(s, cid, o) || atWar(s, cid, o); }
function findPath(s, cid, from, to) {
  if (from === to) return [];
  const prev = { [from]: null }, q = [from];
  while (q.length) { const x = q.shift(); for (const n of s.provs[x].nb) { if (n in prev) continue; if (n !== to && !passable(s, cid, n)) continue; if (n === to && !passable(s, cid, n)) continue; prev[n] = x; if (n === to) { const path = [n]; let y = x; while (y !== from) { path.unshift(y); y = prev[y]; } return path; } q.push(n); } }
  return null;
}
function nileLink(a, b) { return NILE_IDS.includes(a) && NILE_IDS.includes(b); }

function sendArmy(s, cid, fromPid, toPid, frac, cmdIds, stance) {
  const p = s.provs[fromPid]; if (!p || p.owner !== cid) return "Vojsko lze vyslat jen z vlastního nomu.";
  if (p.siege) return "Nom je obléhán.";
  const t = s.provs[toPid]; if (!t) return "Vyber cíl."; if (toPid === fromPid) return "Cíl je stejný jako výchozí nom.";
  if (t.owner !== cid && !atWar(s, cid, t.owner) && !friendly(s, cid, t.owner)) return `S rodem ${s.clans[t.owner].house} neválčíš.`;
  const path = findPath(s, cid, fromPid, toPid); if (!path) return "Cesta je zavřená (vede přes neutrální území).";
  frac = clamp(+frac || 0.7, 0.1, 1); const tt = {};
  for (const k of TROOP_IDS) { const n = Math.floor((p.troops[k] || 0) * frac); if (n > 0) { tt[k] = n; p.troops[k] -= n; } }
  if (men(tt) < 100) { for (const k in tt) p.troops[k] += tt[k]; return "Na výpravu je potřeba aspoň 100 mužů."; }
  const cmds = (cmdIds || []).map(id => chr(s, id)).filter(c => c && c.cl === cid && c.st === "off" && c.loc === fromPid && !c.army && !c.away && !c.moving).slice(0, 2);
  const a = { id: "a" + s.nextArmy++, cl: cid, t: tt, train: p.train, loc: fromPid, path, goal: toPid, cmds: cmds.map(c => c.id), since: s.turn, stance: STANCES[stance] ? stance : "vyvazeny" };
  for (const c of cmds) { c.army = a.id; c.acted = s.turn; if (p.lord === c.id) p.lord = null; }
  s.armies.push(a); assignLords(s, cid);
  if (isPlayer(s, cid)) log(s, `Vojsko (${fmtN(men(tt))} mužů${cmds.length ? ", velí " + cmds.map(c => c.n).join(" a ") : ""}) vyráží z nomu ${p.n} do nomu ${t.n}.`, "valka", [cid]);
  return null;
}
function armyCmdBonus(s, a) { const cs = a.cmds.map(id => chr(s, id)).filter(Boolean); if (!cs.length) return 0.9; const b = cs.sort((x, y) => st(y, "ved") - st(x, "ved"))[0]; return 1 + (st(b, "ved") - 50) / 150 + (st(b, "uda") - 50) / 400; }
function disbandArmy(s, a, pid) {
  const p = s.provs[pid || a.loc];
  if (p && p.owner === a.cl) { const old = men(p.troops), n = men(a.t); for (const k of TROOP_IDS) if (a.t[k]) p.troops[k] = (p.troops[k] || 0) + a.t[k]; if (old + n) p.train = Math.round((p.train * old + a.train * n) / (old + n)); }
  for (const id of a.cmds) { const c = chr(s, id); if (c && c.army === a.id) { c.army = null; c.loc = p && p.owner === a.cl ? p.id : s.clans[a.cl] && s.clans[a.cl].capital || c.loc; } }
  s.armies = s.armies.filter(x => x !== a); if (s.clans[a.cl] && s.clans[a.cl].alive) assignLords(s, a.cl);
}
function lossApply(t, n) { const tot = men(t); if (!tot) return; const f = clamp(n / tot, 0, 1); for (const k of TROOP_IDS) if (t[k]) t[k] = Math.max(0, Math.round(t[k] * (1 - f))); }

// Bitva: až šest kol. A útočí, D brání (případně za hradbami).
function battle(s, A, D, pid, o = {}) {
  const p = s.provs[pid], ter = TERRAIN[p.ter];
  const aStart = men(A.t), dStart = men(D.t); let mA = 100, mD = 100; const rounds = [];
  const flot = hasTech(s, A.cl, "flotila") && ter.nile ? 1.1 : 1;
  for (let r = 0; r < 6; r++) {
    const sA = stanceOf(A), sD = stanceOf(D);
    const pa = troopPower(s, A.cl, A.t, { ter: p.ter, train: A.train }) * sA.atk * (A.cmd || 1) * (stateGod(s, A.cl) === "montu" ? 1.08 : 1) * flot * rrange(s, 0.85, 1.15) * (0.6 + mA / 250);
    const pd = troopPower(s, D.cl, D.t, { def: true, ter: p.ter, train: D.train }) * sD.atk * (D.cmd || 1) * (stateGod(s, D.cl) === "sutech" ? 1.08 : 1) * ter.def * (D.fort || 1) * rrange(s, 0.85, 1.15) * (0.6 + mD / 250);
    const nA = men(A.t), nD = men(D.t); if (!nA || !nD) break;
    const lA = Math.round(Math.min(nA * 0.3, nA * 0.06 * Math.pow(pd / Math.max(1, pa), 0.75))), lD = Math.round(Math.min(nD * 0.3, nD * 0.06 * Math.pow(pa / Math.max(1, pd), 0.75)));
    const lA2 = Math.round(lA * sA.loss), lD2 = Math.round(lD * sD.loss);
    lossApply(A.t, lA2); lossApply(D.t, lD2); rounds.push([lA2, lD2]);
    mA -= lA / Math.max(1, aStart) * 140 + (pd > pa ? 4 : 0); mD -= lD / Math.max(1, dStart) * 140 + (pa > pd ? 4 : 0) - (D.fort > 1 ? 2 : 0);
    if (mA < sA.brk || men(A.t) < aStart * 0.3 || mD < sD.brk || men(D.t) < dStart * 0.3) break;
  }
  const win = mA - mD > 0 && men(A.t) > 0 ? (men(D.t) === 0 || mD < 30 || mA > mD + 5 ? "A" : "D") : "D";
  const b = { t: s.turn, d: dateShort(s.month, s.bce), place: pid, a: A.cl, b: D.cl, aStart, bStart: dStart, rounds, win, aCmd: A.cmds || [], bCmd: D.cmds || [], kind: o.kind || "bitva" };
  const loser = win === "A" ? D : A, winner = win === "A" ? A : D;
  s.clans[winner.cl].prestige += clamp(Math.round((men(loser.t) + sum(rounds.map(r => r[win === "A" ? 1 : 0]))) / 300), 2, 25);
  s.clans[loser.cl].prestige = Math.max(0, s.clans[loser.cl].prestige - 5);
  for (const id of winner.cmds || []) { const c = chr(s, id); if (c) c.merit += 20; }
  const fates = [];
  for (const id of loser.cmds || []) { const c = chr(s, id); if (!c || c.st !== "off") continue; const r = rnd(s); if (r < 0.08) { const lead = s.clans[c.cl] && s.clans[c.cl].leader === c.id; fates.push(`${c.n} padl${lead ? " – panovník zemřel v boji jako kdysi Sekenenre Taa" : ""}`); die(s, c, `padl v bitvě u nomu ${p.n}`); } else if (r < 0.2) { fates.push(`${c.n} zajat`); capture(s, c, winner.cl); c.loc = pid; } else if (r < 0.3) { c.wound = 3; fates.push(`${c.n} raněn`); } }
  if (isPlayer(s, winner.cl) && (winner.cmds || []).length && chance(s, 0.3) && !s.events.some(e => e.k === "odmena")) { const c = chr(s, winner.cmds[0]); if (c && c.st === "off" && c.id !== s.clans[winner.cl].leader) queueEvent(s, "odmena", { cid: c.id }); }
  b.fates = fates; s.battles.unshift(b); if (s.battles.length > 60) s.battles.length = 60;
  const lossA = aStart - men(A.t), lossD = dStart - men(D.t);
  if (isPlayer(s, winner.cl) && o.kind !== "nájezd") gainCaptives(s, winner.cl, (win === "A" ? lossD : lossA) * 0.15);
  log(s, `${o.kind === "zteč" ? "Boj u hradeb" : "Bitva"} v nomu ${p.n}: ${s.clans[A.cl].house} (${fmtN(aStart)} mužů) proti ${s.clans[D.cl].house} (${fmtN(dStart)}). ${win === "A" ? "Útočník zvítězil" : "Obránce se ubránil"}. Ztráty ${fmtN(lossA)} : ${fmtN(lossD)}.${fates.length ? " " + fates.join(", ") + "." : ""}`, "valka", [A.cl, D.cl]);
  return b;
}

function retreat(s, a, from) {
  const back = s.provs[from] && passable(s, a.cl, from) ? from : (clanProvs(s, a.cl)[0] || {}).id;
  a.path = []; if (!back) { disbandArmy(s, a); return; } a.loc = back;
  if (men(a.t) < 60) { log(s, `Zbytky vojska rodu ${s.clans[a.cl].house} se rozprchly.`, "valka", [a.cl]); for (const id of a.cmds) { const c = chr(s, id); if (c && c.army === a.id) { c.army = null; c.loc = back; } } s.armies = s.armies.filter(x => x !== a); }
}

function arrive(s, a, from) {
  const p = s.provs[a.loc];
  // nepřátelská vojska v nomu
  for (const e of s.armies.filter(x => x !== a && x.loc === a.loc && atWar(s, x.cl, a.cl))) {
    const b = battle(s, { cl: a.cl, t: a.t, train: a.train, cmd: armyCmdBonus(s, a), cmds: a.cmds, stance: a.stance }, { cl: e.cl, t: e.t, train: e.train, cmd: armyCmdBonus(s, e), cmds: e.cmds, stance: e.stance }, p.id);
    if (b.win === "A") retreat(s, e, e.path && e.path.length ? e.loc : (clanProvs(s, e.cl).find(q => p.nb.includes(q.id)) || {}).id);
    else { retreat(s, a, from); return false; }
  }
  if (!s.armies.includes(a)) return false;
  if (p.owner === a.cl || friendly(s, a.cl, p.owner)) return true;
  if (!atWar(s, a.cl, p.owner)) { a.path = []; return false; }
  if (men(p.troops) > 0) {
    const L = chr(s, p.lord);
    const b = battle(s, { cl: a.cl, t: a.t, train: a.train, cmd: armyCmdBonus(s, a), cmds: a.cmds, stance: a.stance }, { cl: p.owner, t: p.troops, train: p.train, cmd: L ? 1 + (st(L, "ved") - 50) / 200 : 0.95, fort: fortMult(s, p), cmds: L ? [L.id] : [] }, p.id, { kind: p.castle > 1 ? "zteč" : "bitva" });
    if (b.win !== "A") { retreat(s, a, from); return false; }
    // zbytek posádky ustoupí do pevnosti nebo uteče
    const rest = men(p.troops); if (rest > 0) { const to = p.nb.map(n => s.provs[n]).find(q => q.owner === p.owner && !q.siege); if (to) for (const k of TROOP_IDS) { to.troops[k] = (to.troops[k] || 0) + Math.round((p.troops[k] || 0) * 0.5); } p.troops = {}; }
  }
  if (p.dur > 0) { if (!p.siege || p.siege.cl !== a.cl) { p.siege = { cl: a.cl, army: a.id, m: 0 }; log(s, `${s.clans[a.cl].house} obléhá pevnost v nomu ${p.n}.`, "valka", [a.cl, p.owner]); } a.path = []; return false; }
  conquer(s, p, a.cl); return true;
}
function conquer(s, p, cid) {
  const old = p.owner; transferProv(s, p.id, cid, "dobytí"); p.siege = null;
  log(s, `${s.clans[cid].house} dobyl nom ${p.n}${s.clans[old] ? " (dříve " + s.clans[old].house + ")" : ""}.`, "valka", [cid, old]);
  if (p.flags.includes("h")) desecration(s, cid, p);
  else if (isPlayer(s, cid) && !s.events.some(e => e.k === "korist")) queueEvent(s, "korist", { pid: p.id });
  if (p.id === "u15" && old === "teti") log(s, `Tak jako Kamose, který se na své stéle chlubí, že zpustošil Nefrusy Tetiho, syna Pepiho, protože z ní Teti „udělal hnízdo Asiatů“.`, "valka", [cid]);
  if (p.id === "lav" && s.scen === "sip" && old === "hyksos" && s.clans[cid].cul === "eg") { const C = s.clans[cid]; C.prestige += 100; C.maat = Math.min(100, C.maat + 5); log(s, `Avaris, sídlo Hyksósů, padl! Podle životopisu Ahmose, syna Ebany, se po pádu Avaridu Hyksósové stáhli do Šaruhenu v jižní Palestině, který Egypťané obléhali tři roky. ${qText(Q("ebana_avaris"))}`, "valka", [cid, old]); }
}
// Instructions for Merikare litují zpustošení hrobů v Thinidě; dobytí pohřebiště poškozuje maat.
function desecration(s, cid, p) { if (isPlayer(s, cid)) queueEvent(s, "pohrebiste", { pid: p.id }); else s.clans[cid].maat = Math.max(0, s.clans[cid].maat - 3); }

function transferProv(s, pid, to, how) {
  const p = s.provs[pid], old = p.owner, O = s.clans[old];
  for (const c of Object.values(s.chars)) if (c.st === "off" && c.loc === pid && c.cl === old && !c.army) {
    const esc_ = clanProvs(s, old).filter(q => q.id !== pid)[0];
    if (esc_ && chance(s, 0.75)) c.loc = esc_.id; else if (O && c.id !== O.leader) capture(s, c, to); else if (esc_) c.loc = esc_.id;
  }
  p.owner = to; p.lord = null; p.conq = s.turn; p.loy = how === "zrada" ? Math.max(p.loy, 45) : 28; p.build = null; p.deleg = true; p.siege = null;
  if (how !== "zrada") { p.troops = {}; p.dur = Math.round(p.dur * 0.5); p.pop = r1(p.pop * 0.95); p.stock = Math.round(p.stock * 0.4); }
  for (const a of s.armies.filter(x => x.loc === pid && x.cl === old)) retreat(s, a, (clanProvs(s, old)[0] || {}).id);
  if (O && O.capital === pid) { const nc = clanProvs(s, old).sort((a, b) => b.v - a.v)[0]; O.capital = nc ? nc.id : null; if (nc) for (const c of Object.values(s.chars)) if (c.cl === old && (c.st === "fam" || c.st === "kid") && c.loc === pid) c.loc = nc.id; if (O.alive) O.prestige = Math.max(0, O.prestige - 40); }
  assignLords(s, to);
  if (O && !clanProvs(s, old).length) clanDies(s, old, to);
  else if (O) assignLords(s, old);
}
function clanDies(s, cid, by) {
  const C = s.clans[cid]; if (!C.alive) return; C.alive = false;
  s.wars = s.wars.filter(w => w.a !== cid && w.b !== cid);
  for (const a of s.armies.filter(x => x.cl === cid)) { for (const id of a.cmds) { const c = chr(s, id); if (c) c.army = null; } }
  s.armies = s.armies.filter(x => x.cl !== cid);
  for (const c of Object.values(s.chars)) if (c.cl === cid && c.st !== "dead") { if (c.st === "off" && !c.dyn) { c.st = "wand"; c.cl = null; } else if (c.st !== "cap") { c.st = "dead"; c.died = "konec rodu"; } }
  for (const x of aliveClans(s)) { if (x.vassalOf === cid) x.vassalOf = null; if (x.tributeTo === cid) x.tributeTo = null; }
  log(s, `Rod ${C.house} (${C.n}) ztratil poslední nom a zanikl${by && s.clans[by] ? " – zvítězil " + s.clans[by].house : ""}.`, "svet", [cid, by]);
  if (cid === s.player) s.over = { win: false, txt: `Tvůj rod ztratil poslední nom. ${C.house} upadá v zapomnění.` };
}

function moveArmies(s) {
  for (const a of s.armies.slice()) {
    if (!s.armies.includes(a)) continue;
    if (!a.path || !a.path.length) continue;
    let steps = 1; const nxt = a.path[0];
    if ((hasTech(s, a.cl, "flotila") || (s.provs[a.loc].b.pristav || 0) > 0) && nileLink(a.loc, nxt) && a.path.length > 1 && nileLink(nxt, a.path[1])) steps = 2;
    if (s.month < 4 && steps === 1 && !hasTech(s, a.cl, "flotila") && chance(s, 0.3)) { if (isPlayer(s, a.cl)) log(s, `Vojsko u nomu ${s.provs[a.loc].n} brodí zaplavená pole a tento měsíc nepostoupilo. Bez lodí je v období achet pochod pomalý.`, "valka", [a.cl]); continue; }
    for (let i = 0; i < steps && a.path.length; i++) {
      const from = a.loc, to = a.path[0];
      if (!passable(s, a.cl, to)) { a.path = []; break; }
      a.path.shift(); a.loc = to; for (const id of a.cmds) { const c = chr(s, id); if (c) c.loc = to; }
      if (!arrive(s, a, from)) break;
    }
  }
  // samostatně stojící vojska ve vlastním nomu se po měsíci vrátí do posádky (u umělé inteligence)
  for (const a of s.armies.slice()) if ((!a.path || !a.path.length) && s.provs[a.loc].owner === a.cl && !isPlayer(s, a.cl) && s.turn - a.since > 0) disbandArmy(s, a);
}
function siegeTick(s) {
  for (const p of Object.values(s.provs)) {
    if (!p.siege) continue; const a = s.armies.find(x => x.id === p.siege.army);
    if (!a || a.loc !== p.id || !atWar(s, a.cl, p.owner)) { p.siege = null; continue; }
    p.siege.m++;
    const pw = troopPower(s, a.cl, a.t, { train: a.train });
    p.dur = Math.max(0, Math.round(p.dur - (12 + pw / 25 * (hasTech(s, a.cl, "pevnosti") ? 1.2 : 1)) * (hasTech(s, a.cl, "obleh") ? 1.3 : 1)));
    const starve = p.siege.m >= p.castle * 2 + 2;
    if (p.dur <= 0 || starve) { log(s, `Pevnost v nomu ${p.n} padla${starve && p.dur > 0 ? " – posádka vyhladověla" : ""}.`, "valka", [a.cl, p.owner]); conquer(s, p, a.cl); }
  }
}

// Nájezdy kmenů (Libyjci, Aamu, Médžajové, Núbijci) – loupí, ale nomy nedobývají.
function raids(s) {
  for (const T of aliveClans(s).filter(c => c.type === "kmen")) {
    if (!chance(s, T.aggr * 0.07)) continue;
    const targets = []; for (const p of clanProvs(s, T.id)) for (const n of p.nb) { const q = s.provs[n]; if (!isKmen(s, q.owner) && !friendly(s, T.id, q.owner) && rel(s, T.id, q.owner) < 40) targets.push([p, q]); }
    if (!targets.length) continue;
    const [from, q] = pick(s, targets); const n = Math.round(men(from.troops) * 0.45); if (n < 150) continue;
    if (hasTech(s, q.owner, "hlidky") && chance(s, 0.5)) { if (isPlayer(s, q.owner)) log(s, `Pouštní hlídky včas zahlédly nájezdníky (${T.n}) a ti se stáhli.`, "valka", [q.owner]); continue; }
    const t = {}; for (const k of TROOP_IDS) if (from.troops[k]) { t[k] = Math.round(from.troops[k] * 0.45); from.troops[k] -= t[k]; }
    const b = battle(s, { cl: T.id, t, train: from.train, cmd: 1 }, { cl: q.owner, t: q.troops, train: q.train, cmd: 1, fort: (1 + q.castle * 0.08) * monRaidWall(s, q) }, q.id, { kind: "nájezd" });
    for (const k of TROOP_IDS) if (t[k]) from.troops[k] = (from.troops[k] || 0) + t[k];
    const O = s.clans[q.owner];
    if (b.win === "A") { const loot = Math.round(Math.min(O.deben * 0.06, 2500)), gl = Math.round(Math.min(q.stock * 0.3, 15000)); O.deben -= loot; q.stock -= gl; q.loy = Math.max(0, q.loy - 6); q.pop = r1(q.pop * 0.985); T.deben += loot; T.grain += gl;
      log(s, `Nájezd: ${T.n} (${T.house}) vyplenili nom ${q.n} – odnesli ${fmtN(loot)} debenů a ${fmtN(gl)} charů obilí.`, "valka", [T.id, q.owner]); }
    addRel(s, T.id, q.owner, -6);
  }
}

// ---------- diplomacie ----------
function declareWar(s, a, b, why) {
  if (a === b || atWar(s, a, b)) return "Už spolu válčíte.";
  const A = s.clans[a], B = s.clans[b];
  if (A.vassalOf === b) { A.vassalOf = null; log(s, `${A.house} vypověděl poslušnost rodu ${B.house}!`, "diplomacie", [a, b]); }
  if (B.vassalOf === a) B.vassalOf = null;
  if (A.tributeTo === b) A.tributeTo = null;
  if (truceUntil(s, a, b) > s.turn) { A.maat = Math.max(0, A.maat - 10); A.prestige = Math.max(0, A.prestige - 20); }
  if (allied(s, a, b)) { delete s.alliances[pairKey(a, b)]; A.maat = Math.max(0, A.maat - 10); }
  delete s.truces[pairKey(a, b)]; delete s.trade[pairKey(a, b)];
  s.wars.push({ a, b, start: s.turn }); addRel(s, a, b, -30);
  log(s, `${A.house} vyhlásil válku rodu ${B.house}${why ? " – " + why : ""}.`, "valka", [a, b]);
  // vazalové a spojenci
  for (const v of vassalsOf(s, b)) if (!atWar(s, a, v.id) && v.id !== a) { s.wars.push({ a, b: v.id, start: s.turn }); }
  for (const v of vassalsOf(s, a)) if (!atWar(s, v.id, b) && v.id !== b) { s.wars.push({ a: v.id, b, start: s.turn }); }
  if (B.vassalOf && B.vassalOf !== a && !atWar(s, a, B.vassalOf)) s.wars.push({ a, b: B.vassalOf, start: s.turn });
  for (const x of aliveClans(s)) if (x.id !== a && x.id !== b && allied(s, x.id, b) && !atWar(s, a, x.id) && !isPlayer(s, x.id) && chance(s, 0.6)) { s.wars.push({ a: x.id, b: a, start: s.turn }); log(s, `${x.house} se jako spojenec přidává k válce proti rodu ${A.house}.`, "valka", [x.id, a]); }
  return null;
}
function makePeace(s, a, b) {
  s.wars = s.wars.filter(w => !((w.a === a && w.b === b) || (w.a === b && w.b === a)));
  s.truces[pairKey(a, b)] = s.turn + 24; addRel(s, a, b, 10);
  for (const c of Object.values(s.chars)) if (c.st === "cap" && ((c.cl === a && c.capBy === b) || (c.cl === b && c.capBy === a))) { c.st = "off"; c.capBy = null; c.loc = s.clans[c.cl].capital; }
  for (const p of Object.values(s.provs)) if (p.siege && ((p.siege.cl === a && p.owner === b) || (p.siege.cl === b && p.owner === a))) p.siege = null;
  for (const x of s.armies.slice()) if ((x.cl === a && s.provs[x.loc].owner === b) || (x.cl === b && s.provs[x.loc].owner === a)) { x.path = findPath(s, x.cl, x.loc, s.clans[x.cl].capital) || []; if (!x.path.length) disbandArmy(s, x, s.clans[x.cl].capital); }
  log(s, `Mír mezi rody ${s.clans[a].house} a ${s.clans[b].house} (příměří na dva roky).`, "diplomacie", [a, b]);
}
function warScore(s, a, b) { const pa = realmPower(s, a) + 1, pb = realmPower(s, b) + 1; return pa / pb; }
function dipCheck(s, a, b) { const A = s.clans[a]; if ((A.last["d_" + b] || -1) === s.turn) return "S tímto rodem jsi už tento měsíc jednal."; if (!s.clans[b] || !s.clans[b].alive) return "Rod zanikl."; return null; }
function diplo(s, a, b, act, arg) {
  const e = dipCheck(s, a, b); if (e) return e; const A = s.clans[a], B = s.clans[b], r = rel(s, a, b) + (hasTech(s, a, "tlumocnici") ? 10 : 0), me = isPlayer(s, a);
  const done = () => { A.last["d_" + b] = s.turn; };
  switch (act) {
    case "dar": { const amt = +arg || 1000; if (!pay(s, a, amt)) return "Nedostatek debenů."; const v = Math.round(Math.sqrt(amt) / 2.2 * (hasTech(s, a, "zlatnictvi") ? 1.5 : 1) * (hasTech(s, a, "tlumocnici") ? 1.3 : 1)); addRel(s, a, b, v); done(); log(s, `${A.house} poslal dary rodu ${B.house} (${fmtN(amt)} debenů): vztah +${v}.`, "diplomacie", [a, b]); return null; }
    case "valka": done(); return declareWar(s, a, b);
    case "mir": {
      if (!atWar(s, a, b)) return "Neválčíte."; done();
      const ws = warScore(s, b, a), war = s.wars.find(w => (w.a === a && w.b === b) || (w.a === b && w.b === a)), long = s.turn - war.start;
      const ok = isPlayer(s, b) ? false : (ws < 0.85 || long > 18 && ws < 1.4 || r > 20 && ws < 1.6 || chance(s, 0.12));
      if (ok) { makePeace(s, a, b); return null; } addRel(s, a, b, -3); if (me) log(s, `${B.house} mír odmítl.`, "diplomacie", [a, b]); return null;
    }
    case "spojenectvi": {
      if (atWar(s, a, b)) return "Nejdřív uzavřete mír."; if (allied(s, a, b)) return "Už jste spojenci."; done();
      const common = enemiesOf(s, a).some(x => enemiesOf(s, b).includes(x));
      if (r >= 60 || (r >= 35 && common) || (r >= 45 && chance(s, 0.5))) { s.alliances[pairKey(a, b)] = true; addRel(s, a, b, 10); log(s, `${A.house} a ${B.house} uzavřeli spojenectví.`, "diplomacie", [a, b]); return null; }
      if (me) log(s, `${B.house} spojenectví odmítl (vztah ${Math.round(r)}, potřeba aspoň 45–60).`, "diplomacie", [a, b]); return null;
    }
    case "obchod": {
      if (atWar(s, a, b)) return "Válčíte."; if (s.trade[pairKey(a, b)]) return "Smlouvu už máte."; done();
      if (r >= 10) { s.trade[pairKey(a, b)] = true; addRel(s, a, b, 5); log(s, `${A.house} a ${B.house} uzavřeli obchodní smlouvu (+4 % výnosu nomů oběma).`, "diplomacie", [a, b]); return null; }
      if (me) log(s, `${B.house} obchodní smlouvu odmítl (vztah ${Math.round(r)}, potřeba aspoň 10).`, "diplomacie", [a, b]); return null;
    }
    case "podruci": {
      if (B.vassalOf === a) return "Už je tvým poddaným."; if (B.vassalOf) return `Je poddaným rodu ${s.clans[B.vassalOf].house}.`; done();
      const ws = warScore(s, a, b), war = atWar(s, a, b);
      if ((ws > 3 && r > -30) || (war && ws > 4) || (ws > 2.2 && r > 30)) { if (war) makePeace(s, a, b); B.vassalOf = a; B.tributeTo = null; addRel(s, a, b, 10); log(s, `${B.house} uznal svrchovanost rodu ${A.house} a bude odvádět tribut.`, "diplomacie", [a, b]); return null; }
      addRel(s, a, b, -8); if (me) log(s, `${B.house} odmítl podřídit se (poměr sil ${r1(ws)}:1, potřeba víc než 3:1).`, "diplomacie", [a, b]); return null;
    }
    case "proklinani": {
      if ((A.last["p_" + b] || -99) > s.turn - 12) return "Obřad proti tomuto rodu lze opakovat až za rok.";
      if (!pay(s, a, 500)) return "Obřad stojí 500 debenů."; A.last["p_" + b] = s.turn;
      B.prestige = Math.max(0, B.prestige - 15); A.maat = Math.min(100, A.maat + 1); if (A.estates) A.estates.knezi = Math.min(100, A.estates.knezi + 2); addRel(s, a, b, -10);
      for (const p of clanProvs(s, b)) if (p.nb.some(n => s.provs[n].owner === a)) p.loy = Math.max(0, p.loy - 3);
      log(s, `Kněží rodu ${A.house} napsali jména vládců rodu ${B.house} na hliněné nádoby a sošky spoutaných zajatců, rituálně je rozbili a pohřbili (proklínací obřad, jaký dokládá nález z Mirgissy). ${qText(Q("kletba"))}`, "diplomacie", [a, b]); return null;
    }
    case "kap": { const r2 = takeKap(s, a, b); if (!r2) done(); return r2; }
    case "propustit": { if (B.vassalOf !== a) return "Není tvým poddaným."; B.vassalOf = null; addRel(s, a, b, 20); done(); log(s, `${A.house} propustil rod ${B.house} z poddanství.`, "diplomacie", [a, b]); return null; }
    case "tribut_stop": { if (A.tributeTo !== b) return "Neplatíš mu tribut."; A.tributeTo = null; addRel(s, a, b, -35); A.prestige += 20; done(); log(s, `${A.house} přestal odvádět tribut rodu ${B.house}!`, "diplomacie", [a, b]); return null; }
    case "snatek": {
      const pair = marriagePair(s, a, b); if (!pair) return "Žádní volní ženiši ani nevěsty."; if (atWar(s, a, b)) return "Válčíte."; done();
      if (r < 15 && !isPlayer(s, b)) { addRel(s, a, b, -2); if (me) log(s, `${B.house} sňatek odmítl (vztah ${Math.round(r)}, potřeba aspoň 15).`, "diplomacie", [a, b]); return null; }
      wed(s, pair[0], pair[1]); s.marriages[pairKey(a, b)] = true; addRel(s, a, b, 25);
      if (s.clans[pair[1].origin] && s.clans[pair[1].origin].cul === "eg" && s.clans[pair[0].cl].cul !== "eg" && s.clans[pair[1].origin].t === "král") { const O = s.clans[pair[1].origin]; O.maat = Math.max(0, O.maat - 6); log(s, `Egyptská královská dcera odchází k cizincům. Nemá se to: ještě Amenhotep III. psal babylonskému králi, že „od pradávna nebyla dcera egyptského krále dána nikomu“ (maat −6).`, "rod", [O.id]); }
      return null;
    }
  }
  return "Neznámá akce.";
}
// Najde ženicha a nevěstu mezi dvěma rody (ženich zůstává doma, nevěsta přichází)
function marriagePair(s, a, b) {
  const free = (cid, sex) => Object.values(s.chars).filter(c => c.cl === cid && c.dyn && c.sex === sex && !c.spouse && c.st !== "dead" && c.st !== "cap" && age(s, c) >= 15 && age(s, c) <= 45);
  const gA = free(a, "m"), bB = free(b, "f"), gB = free(b, "m"), bA = free(a, "f");
  if (gA.length && bB.length) return [gA[0], bB[0]];
  if (gB.length && bA.length) return [gB[0], bA[0]];
  return null;
}
function wed(s, groom, bride) {
  bride.origin = bride.cl; bride.cl = groom.cl; bride.st = "fam"; bride.loc = s.clans[groom.cl].capital; bride.spouse = groom.id; groom.spouse = bride.id; bride.dyn = 1;
  log(s, `Sňatek: ${groom.n} (${s.clans[groom.cl].house}) a ${bride.n}${bride.origin !== groom.cl ? " (" + s.clans[bride.origin].house + ")" : ""}.`, "rod", [groom.cl, bride.origin]);
}
