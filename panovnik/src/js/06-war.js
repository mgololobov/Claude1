// Vojska v poli, pochody, polní bitvy, obléhání a dobývání hradů.

function pathTo(s, cid, from, to, mode) {
  // mode: "own" = jen vlastní kraje (přesun), jinak vlastní + nepřátelské + spojenecké
  const ok = id => { const o = s.provs[id].owner; return o === cid || (mode !== "own" && (atWar(s, cid, o) || allied(s, cid, o) || s.clans[o].vassalOf === cid || s.clans[cid].vassalOf === o)); };
  if (from === to) return [];
  const prev = { [from]: null }, q = [from];
  while (q.length) { const c = q.shift(); for (const n of s.provs[c].nb) { if (n in prev || (!ok(n) && n !== to)) continue; if (n === to && !ok(n)) continue; prev[n] = c; if (n === to) { const path = [n]; let x = c; while (x !== from) { path.unshift(x); x = prev[x]; } return path; } q.push(n); } }
  return null;
}
function armyLimit(s, ids) { return Math.max(500, sum(ids.map(id => RANKS[chr(s, id).rank].cmd))); }

// Vyslání vojska z kraje. t = {pesi, strelci, jizda, zoldneri}, cmds = id vazalů (první velí), months = zásoby obilí
function dispatch(s, cid, from, to, t, cmds, months, mode) {
  const p = s.provs[from], C = s.clans[cid];
  if (!p || p.owner !== cid || p.occ) return "Vojsko lze vyslat jen z vlastního neobsazeného kraje."; if (p.siege) return "Kraj je obléhán.";
  cmds = (cmds || []).filter(Boolean).slice(0, 3);
  for (const id of cmds) { const c = chr(s, id); if (!c || c.cl !== cid || c.st !== "off" || c.loc !== from || c.army || c.acted === s.turn) return `${c ? c.n : "Vazal"} nemůže velet (musí být v kraji a volný).`; }
  const tt = {}; for (const k of TROOP_IDS) { tt[k] = Math.max(0, Math.min(Math.floor(+t[k] || 0), p.troops[k] || 0)); }
  const n = men(tt); if (n < 100) return "Vojsko musí mít aspoň 100 mužů.";
  const transfer = mode === "presun";
  if (!transfer && !cmds.length) return "Vojsko potřebuje velitele.";
  if (!transfer && n > armyLimit(s, cmds)) return `Velitelé zvládnou nejvýš ${armyLimit(s, cmds)} mužů (podle hodnosti).`;
  const path = pathTo(s, cid, from, to, transfer ? "own" : null); if (!path || !path.length) return transfer ? "Do kraje nevede cesta přes vlastní území." : "Tam nelze táhnout (cíl musí být nepřátelský nebo vlastní kraj a cesta volná).";
  if (!transfer && !atWar(s, cid, ctrl(s.provs[to])) && s.provs[to].owner !== cid) return "S pánem cílového kraje nejsi ve válce.";
  months = clamp(Math.floor(+months || 3), 1, 12); const grain = Math.ceil(n / 1000 * 12 * months);
  if (C.grain < grain) return `Na ${months} měsíců zásob je třeba ${grain} obilí.`;
  C.grain -= grain;
  for (const k of TROOP_IDS) p.troops[k] -= tt[k];
  const a = { id: "a" + s.nextId++, cl: cid, t: tt, cmds, loc: from, to, path, grain, train: p.train, morale: 80, mode: transfer ? "presun" : "utok", siegeMode: "obleh", from, start: s.turn };
  for (const id of cmds) { const c = chr(s, id); c.army = a.id; c.acted = s.turn; if (p.lord === id) p.lord = null; }
  assignLords(s, cid);
  s.armies.push(a);
  if (isPlayer(s, cid)) log(s, `Vojsko (${n} mužů) vytáhlo z kraje ${p.n} ${transfer ? "do" : "na"} ${s.provs[to].n}.`, "valka", [cid]);
  return null;
}
function armyHome(s, a) {
  // vojsko se vrátí do nejbližšího vlastního kraje a rozpustí se do posádky
  let tgt = a.loc; const own = id => s.provs[id].owner === a.cl;
  if (!own(tgt)) { const seen = { [a.loc]: 1 }, q = [a.loc]; tgt = null; while (q.length && !tgt) { const c = q.shift(); for (const n of s.provs[c].nb) { if (seen[n]) continue; seen[n] = 1; if (own(n)) { tgt = n; break; } q.push(n); } } }
  if (!tgt) { disbandArmy(s, a, null); return; }
  mergeArmy(s, a, tgt);
}
function mergeArmy(s, a, pid) {
  const p = s.provs[pid], old = men(p.troops), n = men(a.t);
  for (const k of TROOP_IDS) p.troops[k] = (p.troops[k] || 0) + (a.t[k] || 0);
  if (old + n) p.train = Math.round((p.train * old + a.train * n) / (old + n));
  s.clans[a.cl].grain += Math.max(0, a.grain);
  for (const id of a.cmds) { const c = chr(s, id); if (c && c.army === a.id) { c.army = null; c.loc = pid; } }
  s.armies = s.armies.filter(x => x !== a); assignLords(s, a.cl);
}
function disbandArmy(s, a, why) {
  for (const id of a.cmds) { const c = chr(s, id); if (c && c.army === a.id) { c.army = null; const cp = s.clans[a.cl] && s.clans[a.cl].capital; if (cp && s.provs[cp].owner === a.cl) c.loc = cp; else { c.st = "wand"; c.cl = null; } } }
  s.armies = s.armies.filter(x => x !== a);
  if (why && isPlayer(s, a.cl)) log(s, why, "valka", [a.cl]);
}
function orderArmy(s, cid, aid, what, to) {
  const a = s.armies.find(x => x.id === aid && x.cl === cid); if (!a) return "Vojsko nenalezeno.";
  if (what === "domu") { const path = pathTo(s, cid, a.loc, a.from, null) || []; if (s.provs[a.loc].owner === cid) { mergeArmy(s, a, a.loc); return null; } a.to = a.from; a.path = path; a.mode = "presun"; return null; }
  if (what === "zastavit" && s.provs[a.loc].owner === cid) { mergeArmy(s, a, a.loc); return null; }
  if (what === "ztec" || what === "obleh") { a.siegeMode = what; return null; }
  if (what === "tahnout") { const path = pathTo(s, cid, a.loc, to, null); if (!path || !path.length) return "Tam nevede cesta."; a.to = to; a.path = path; a.mode = "utok"; return null; }
  return "Neznámý rozkaz.";
}

// ---------- bitva ----------
// Bitva probíhá po kolech. V každém kole má každá strana rozkaz (útok, držet, úder jízdy, salva, záloha, ústup).
// Sestava (taktika) určuje rozkazy automaticky; při osobním velení je volí hráč.
const ORDERS = {
  utok: { n: "Útok celou silou", d: "běžný boj" },
  drzet: { n: "Držet pozice", d: "šik zastaví úder jízdy; vlastní ztráty menší, ale střelci ho rozstřílí" },
  jizda: { n: "Úder jízdy", d: "rozpráší střelce; o držící šik se roztříští" },
  salva: { n: "Salva střelců", d: "zdrtí stojící šik; proti úderu jízdy utrpí těžké ztráty" },
  zaloha: { n: "Nasadit zálohu", d: "jednou za bitvu, nejdřív ve 3. kole: síla +50 %" },
  ustup: { n: "Ústup z bojiště", d: "bitva je prohraná, ale zachráníš muže" },
};
const TACTICS = {
  vyvazena: { n: "Vyvážená sestava", d: "útok celou silou ve všech kolech", plan: () => "utok" },
  klin: { n: "Klín těžké jízdy", d: "úder jízdy v prvních dvou kolech; selže proti obrannému šiku", plan: r => (r < 2 ? "jizda" : "utok") },
  strelci: { n: "Střelci vpředu", d: "salvy v prvních dvou kolech; zranitelné proti klínu", plan: r => (r < 2 ? "salva" : "utok") },
  sik: { n: "Obranný šik", d: "tři kola drží pozice a láme útoky jízdy, pak přejde do útoku", plan: r => (r < 3 ? "drzet" : "utok") },
  zaloha: { n: "Skrytá záloha", d: "dvě kola drží, ve třetím nasadí zálohu", plan: (r, b, sd) => (r < 2 ? "drzet" : (sd === "A" ? b.resA : b.resB) ? "utok" : "zaloha") },
  opatrny: { n: "Opatrný postup", d: "útočí, ale při morálce pod 55 ustoupí", plan: (r, b, sd) => ((sd === "A" ? b.A : b.B).morale < 55 ? "ustup" : "utok") },
};
function aiTactic(t, defending) { const n = Math.max(1, men(t)); if ((t.jizda || 0) / n > 0.18) return "klin"; if ((t.strelci || 0) / n > 0.28) return "strelci"; return defending ? "sik" : "vyvazena"; }
function sidePower(s, side, round) {
  const L = chr(s, side.cmds[0]), ved = L ? st(L, "ved") : 30, uda = Math.max(30, ...side.cmds.map(id => st(chr(s, id), "uda")));
  let p = troopPower(s, side.cl, side.t, { def: side.def, ter: side.ter, train: side.train });
  if (round === 0) p += (side.t.strelci || 0) / 100 * 0.8 * (hasTech(s, side.cl, "kuse") ? 1.3 : 1); // první salva
  p *= (1 + ved / 220 + uda / 400) * (side.morale / 100) * (hasTech(s, side.cl, "taktika") ? 1.1 : 1) * techBattleMult(s, side);
  if (side.def) p *= TERRAIN[side.ter].def * (side.castle ? 1 + side.castle * 0.15 + side.dur / 400 : 1);
  return p;
}
function orderMul(side, ord, foe, r) {
  const n = Math.max(1, men(side.t)), cav = (side.t.jizda || 0) / n, arc = (side.t.strelci || 0) / n; let out = 1, inc = 1;
  if (ord === "drzet") { out *= 0.85; inc *= foe === "salva" ? 0.85 : 0.75; }
  if (ord === "jizda") { out *= 1 + (foe === "drzet" ? 0.3 : 1.9) * cav; inc *= foe === "drzet" ? 1.3 : 1 + 0.15 * cav; }
  if (ord === "salva") { out *= 1 + (foe === "drzet" ? 1.5 : 2.0) * arc; if (foe === "jizda") inc *= 1.2; }
  if (ord === "zaloha") out *= 1.5;
  if (ord === "ustup") { out *= 0.3; inc *= 0.5; }
  return { out, inc };
}
function battleStart(s, A, B, place, kind) {
  A.tac = A.tac || aiTactic(A.t, A.def); B.tac = B.tac || aiTactic(B.t, B.def);
  const why = [["Muži", men(A.t), men(B.t)], ["Síla vojska (druh a výcvik)", r1(troopPower(s, A.cl, A.t, { def: A.def, ter: A.ter, train: A.train })), r1(troopPower(s, B.cl, B.t, { def: B.def, ter: B.ter, train: B.train }))],
    ["Výcvik", Math.round(A.train), Math.round(B.train)], ["Morálka na začátku", Math.round(A.morale), Math.round(B.morale)],
    ["Velitelé (bonus)", "+" + Math.round(cmdBonus(s, A) * 100) + " %", "+" + Math.round(cmdBonus(s, B) * 100) + " %"],
    ["Terén a hradby (obránce)", A.def ? "×" + r1(TERRAIN[A.ter].def * (A.castle ? 1 + A.castle * 0.15 + A.dur / 400 : 1)) : "—", B.def ? "×" + r1(TERRAIN[B.ter].def * (B.castle ? 1 + B.castle * 0.15 + B.dur / 400 : 1)) : "—"],
    ["Sestava", TACTICS[A.tac].n, TACTICS[B.tac].n]];
  return { A, B, place, kind, start: { a: men(A.t), b: men(B.t) }, rounds: [], r: 0, done: false, resA: false, resB: false, retreat: null, why };
}
function cmdBonus(s, side) { const L = chr(s, side.cmds[0]), ved = L ? st(L, "ved") : 30, uda = Math.max(30, ...side.cmds.map(id => st(chr(s, id), "uda"))); return ved / 220 + uda / 400; }
function battleRound(s, b, oa, ob) {
  const A = b.A, B = b.B, r = b.r;
  if (oa === "zaloha") { if (b.resA || r < 2) oa = "utok"; else b.resA = true; }
  if (ob === "zaloha") { if (b.resB || r < 2) ob = "utok"; else b.resB = true; }
  const ma = orderMul(A, oa, ob, r), mb = orderMul(B, ob, oa, r);
  const pa = sidePower(s, A, r) * ma.out * (0.78 + rnd(s) * 0.44), pb = sidePower(s, B, r) * mb.out * (0.78 + rnd(s) * 0.44);
  const la = Math.min(men(A.t), Math.round(pb * 9 * ma.inc * (A.def && A.castle ? 0.8 : 1))), lb = Math.min(men(B.t), Math.round(pa * 9 * mb.inc * (B.def && B.castle ? 0.8 : 1)));
  loseMen(A.t, la); loseMen(B.t, lb);
  A.morale -= 100 * la / Math.max(1, b.start.a) * 0.9 + (pb > pa ? 4 : 0); B.morale -= 100 * lb / Math.max(1, b.start.b) * 0.9 + (pa > pb ? 4 : 0);
  b.rounds.push([la, lb, Math.round(pa), Math.round(pb), oa, ob]); b.r++;
  if (oa === "ustup") b.retreat = "A"; else if (ob === "ustup") b.retreat = "B";
  if (b.retreat || b.r >= 6 || men(A.t) < 1 || men(B.t) < 1 || A.morale < 30 || B.morale < 30) b.done = true;
}
function autoOrder(s, b, sd) { const side = sd === "A" ? b.A : b.B; return TACTICS[side.tac || "vyvazena"].plan(b.r, b, sd); }
function battleFinish(s, b) {
  const A = b.A, B = b.B, start = b.start, kind = b.kind;
  const aLeft = men(A.t) / Math.max(1, start.a), bLeft = men(B.t) / Math.max(1, start.b);
  let aWins = (B.morale < 30 || men(B.t) < 1) && A.morale >= B.morale || (A.morale >= 30 && B.morale >= 30 && aLeft * A.morale > bLeft * B.morale * (kind === "zteč" ? 1.6 : 1));
  if (b.retreat) aWins = b.retreat === "B";
  const rep = { d: dateStr(s), place: s.provs[b.place].n, kind, a: A.cl, b: B.cl, aCmd: A.cmds.map(id => chr(s, id).n).join(", ") || "—", bCmd: B.cmds.map(id => chr(s, id).n).join(", ") || "—",
    aStart: start.a, bStart: start.b, aEnd: men(A.t), bEnd: men(B.t), rounds: b.rounds, win: aWins ? A.cl : B.cl, fate: [], why: b.why, retreat: b.retreat };
  const loser = aWins ? B : A;
  for (const id of loser.cmds) { const c = chr(s, id); if (!c || c.st !== "off") continue; const x = rnd(s) * (b.retreat ? 1.6 : 1);
    if (x < 0.05 + (100 - st(c, "uda")) / 1500) { kill(s, c, "padl v bitvě"); rep.fate.push(`${c.n} padl`); }
    else if (x < 0.25 - st(c, "uda") / 600 && loser.capturable !== false) { capture(s, c, aWins ? A.cl : B.cl); rep.fate.push(`${c.n} zajat`); }
    else if (x < 0.35) { c.hp -= rint(s, 10, 30); rep.fate.push(`${c.n} zraněn`); } }
  for (const id of (aWins ? A : B).cmds) { const c = chr(s, id); if (c) c.merit += 15; }
  s.clans[A.cl].warLoss = (s.clans[A.cl].warLoss || 0) + start.a - men(A.t); s.clans[B.cl].warLoss = (s.clans[B.cl].warLoss || 0) + start.b - men(B.t);
  s.clans[aWins ? A.cl : B.cl].prestige += Math.round(Math.min(30, (start.a + start.b) / 400));
  s.battles.unshift(rep); if (s.battles.length > 80) s.battles.length = 80;
  addBattleScore(s, rep.win, aWins ? B.cl : A.cl, start.a + start.b);
  for (const [cl, lost] of [[A.cl, start.a - men(A.t)], [B.cl, start.b - men(B.t)]]) if (s.clans[cl].we != null) s.clans[cl].we = Math.min(20, s.clans[cl].we + lost / 2500);
  news(s, `${kind === "zteč" ? "Zteč hradu" : "Bitva"} – ${rep.place}: ${s.clans[A.cl].house} (${start.a}→${rep.aEnd}) proti ${s.clans[B.cl].house} (${start.b}→${rep.bEnd}). Vítězí ${s.clans[rep.win].house}${b.retreat ? " (protivník ustoupil)" : ""}.${rep.fate.length ? " " + rep.fate.join(", ") + "." : ""}`, "valka", [A.cl, B.cl]);
  return { aWins, rep };
}
function battle(s, A, B, place, kind) { const b = battleStart(s, A, B, place, kind); while (!b.done) battleRound(s, b, autoOrder(s, b, "A"), autoOrder(s, b, "B")); return battleFinish(s, b); }

// osobní velení hráče: bitva čeká na rozkazy v okně události
function startManual(s, A, B, place, kind, ctx) {
  s.pend = s.pend || {}; const id = "b" + s.nextId++;
  const b = battleStart(s, A, B, place, kind); b.ps = isPlayer(s, A.cl) ? "A" : "B";
  s.pend[id] = { b, ctx }; s.events.push({ id: "_battle", bid: id });
  for (const aid of [ctx.aid, ctx.bid]) { const x = s.armies.find(y => y.id === aid); if (x) x.engaged = true; }
  return id;
}
function enemyOrder(s, b) { const sd = b.ps === "A" ? "B" : "A"; const plan = autoOrder(s, b, sd); return chance(s, 0.3) ? pick(s, ["utok", "drzet", "jizda", "salva"]) : plan; }
function manualRound(s, bid, ord) {
  const P_ = s.pend && s.pend[bid]; if (!P_) return "Bitva už skončila.";
  const b = P_.b, eo = enemyOrder(s, b);
  if (b.ps === "A") battleRound(s, b, ord, eo); else battleRound(s, b, eo, ord);
  if (!b.done) return null;
  const res = battleFinish(s, b); delete s.pend[bid];
  const c = P_.ctx, a = s.armies.find(x => x.id === c.aid);
  if (a) { a.engaged = false; a.t = c.aSide === "A" ? b.A.t : b.B.t; a.morale = c.aSide === "A" ? b.A.morale : b.B.morale; a.cmds = a.cmds.filter(id => { const x = chr(s, id); return x && x.st === "off"; }); }
  if (c.type === "field") { const o = s.armies.find(x => x.id === c.bid); if (o) { o.engaged = false; o.t = b.B.t; o.morale = b.B.morale; o.cmds = o.cmds.filter(id => { const x = chr(s, id); return x && x.st === "off"; }); } if (a && o) fieldAfter(s, a, o, res.aWins); else if (a && !res.aWins) armyHome(s, a); else if (o && res.aWins) armyHome(s, o); }
  if (c.type === "assault") { const p = s.provs[c.pid]; p.troops = b.B.t; if (a) assaultAfter(s, a, p, res.aWins); }
  return null;
}

function loseMen(t, n) { const tot = men(t); if (!tot) return; for (const k of TROOP_IDS) { const l = Math.round((t[k] || 0) / tot * n); t[k] = Math.max(0, (t[k] || 0) - l); } }
function kill(s, c, why) {
  c.st = "dead"; c.died = dateStr(s); c.army = null;
  for (const p of Object.values(s.provs)) if (p.lord === c.id) p.lord = null;
  if (c.cl && s.clans[c.cl] && s.clans[c.cl].leader === c.id) heirSucceeds(s, c.cl, why);
  if (c.cl) assignLords(s, c.cl);
}

// ---------- převzetí kraje ----------
function transferProv(s, pid, to, how) {
  const p = s.provs[pid], from = p.owner;
  // vazalové ve kraji: zajetí nebo útěk
  for (const c of Object.values(s.chars).filter(x => x.st === "off" && x.loc === pid && x.cl === from && !x.army)) {
    if (how === "dobytí" && chance(s, 0.55 - st(c, "uda") / 250)) capture(s, c, to);
    else { const esc = clanProvs(s, from).filter(q => q.id !== pid); if (esc.length) c.loc = (esc.find(q => q.id === s.clans[from].capital) || esc[0]).id; else if (how !== "připojení") { c.st = "wand"; c.cl = null; } }
  }
  for (const c of Object.values(s.chars).filter(x => (x.st === "fam" || x.st === "kid") && x.loc === pid && x.cl === from)) { const esc = clanProvs(s, from).filter(q => q.id !== pid); if (esc.length) c.loc = esc[0].id; else if (how === "dobytí") capture(s, c, to); }
  p.owner = to; p.lord = null; p.siege = null; p.deleg = true; p.build = null; p.conq = s.turn; p.occ = null; p.coring = null;
  if (p.cores && (how === "připojení" || how === "úděl" || how === "dědictví") && !p.cores.includes(to)) p.cores.push(to);
  if (how === "dobytí") { p.loy = Math.max(10, p.loy - 25); p.dur = Math.round(p.dur * 0.5); p.com = Math.round(p.com * 0.85); }
  if (from && s.clans[from]) {
    if (s.clans[from].capital === pid) { const rest = clanProvs(s, from); s.clans[from].capital = rest.length ? rest.sort((a, b) => b.v - a.v)[0].id : null; if (rest.length) for (const c of Object.values(s.chars)) if (c.cl === from && (c.st === "fam" || c.st === "kid") && c.loc === pid) c.loc = s.clans[from].capital; }
    if (!clanProvs(s, from).length) clanDestroyed(s, from, to);
    else assignLords(s, from);
  }
  assignLords(s, to);
}
function clanDestroyed(s, cid, by) {
  const C = s.clans[cid]; if (!C.alive) return;
  C.alive = false; s.wars = s.wars.filter(w => w.a !== cid && w.b !== cid);
  for (const a of s.armies.filter(x => x.cl === cid)) disbandArmy(s, a, null);
  for (const c of Object.values(s.chars)) if (c.cl === cid && c.st === "off") { c.st = "wand"; c.cl = null; }
  for (const v of vassalsOf(s, cid)) v.vassalOf = null;
  if (s.hre.kingClan === cid) { s.hre.kingClan = null; s.hre.king = null; s.hre.election = s.turn + 8; }
  news(s, `Rod ${C.house} přišel o poslední kraj. ${C.n} zaniká.`, "valka", [cid, by]);
  if (isPlayer(s, cid)) s.over = { win: false, txt: `Tvůj rod přišel o všechny kraje (${dateStr(s)}).` };
}

// ---------- měsíční tah vojsk ----------
function armiesTurn(s) {
  const winter = [11, 0, 1].includes(s.month);
  for (const a of s.armies.slice()) {
    if (!s.armies.includes(a) || a.engaged) continue;
    const C = s.clans[a.cl]; if (!C || !C.alive) { s.armies = s.armies.filter(x => x !== a); continue; }
    // zásoby
    a.grain -= men(a.t) / 1000 * 12;
    if (a.grain < 0) { a.grain = 0; a.morale -= 12; loseMen(a.t, Math.round(men(a.t) * 0.08)); if (isPlayer(s, a.cl)) log(s, `Vojsko u ${s.provs[a.loc].n} hladoví a dezertuje.`, "valka", [a.cl]); }
    if (winter && s.provs[a.loc].ter === "h") { loseMen(a.t, Math.round(men(a.t) * 0.03)); a.morale -= 3; }
    // zásobování z vlastního kraje
    if (s.provs[a.loc].owner === a.cl) { const need = Math.max(0, men(a.t) / 1000 * 36 - a.grain), take = Math.min(need, C.grain); a.grain += take; C.grain -= take; }
    if (men(a.t) < 50 || a.morale < 15) { armyHome(s, a); continue; }
    // pochod (hory, lesy a mokřady zdrží o měsíc)
    if (a.path && a.path.length) {
      const nx = a.path[0], o = s.provs[nx].owner;
      if (o !== a.cl && !atWar(s, a.cl, o) && !allied(s, a.cl, o) && C.vassalOf !== o && s.clans[o].vassalOf !== a.cl) { a.path = []; armyHome(s, a); continue; }
      if (TERRAIN[s.provs[nx].ter].slow && !a.slow) a.slow = 1;
      else { a.slow = 0; a.loc = nx; a.path.shift(); }
    }
    const p = s.provs[a.loc];
    // střet s nepřátelským vojskem v kraji
    const foe = s.armies.find(x => x !== a && x.loc === a.loc && atWar(s, x.cl, a.cl) && !x.engaged);
    if (foe) { fieldBattle(s, a, foe); if (!s.armies.includes(a) || a.engaged) continue; }
    if (ctrl(p) === a.cl) { if (p.owner === a.cl && a.mode === "presun" && (!a.path || !a.path.length)) mergeArmy(s, a, p.id); continue; }
    if (!atWar(s, a.cl, ctrl(p))) { if (!a.path || !a.path.length) armyHome(s, a); continue; }
    if (a.path && a.path.length) continue; // jen průchod (cíl je dál)
    siegeTurn(s, a, p);
  }
}
function sideOf(s, a) { return { cl: a.cl, t: Object.assign({}, a.t), train: a.train, morale: a.morale, tac: a.tac || (isPlayer(s, a.cl) ? "vyvazena" : null), cmds: a.cmds.filter(id => { const c = chr(s, id); return c && c.st === "off"; }), def: false, ter: s.provs[a.loc].ter }; }
const manualOf = (s, a) => isPlayer(s, a.cl) && a.manual;
function fieldBattle(s, a, b) {
  const A = sideOf(s, a), B = sideOf(s, b); B.def = s.provs[a.loc].owner === b.cl;
  if (manualOf(s, a) || manualOf(s, b)) { startManual(s, A, B, a.loc, "bitva", { type: "field", aid: a.id, bid: b.id, aSide: "A" }); return; }
  const { aWins } = battle(s, A, B, a.loc, "bitva");
  a.t = A.t; b.t = B.t; a.morale = A.morale; b.morale = B.morale;
  fieldAfter(s, a, b, aWins);
}
function fieldAfter(s, a, b, aWins) {
  const L = aWins ? b : a; L.morale = Math.min(L.morale, 25);
  for (const x of [a, b]) x.cmds = x.cmds.filter(id => { const c = chr(s, id); return c && c.st === "off" && c.army === x.id; });
  armyHome(s, L);
}
function garrisonSide(s, p, castle) {
  const C = s.clans[p.owner];
  return { cl: ctrl(p), t: Object.assign({}, p.troops), train: p.train, morale: 85 + Math.round(officeVal(s, p.owner, "marsal") / 20), cmds: p.lord && !p.occ ? [p.lord] : [], def: true, ter: p.ter, tac: isPlayer(s, p.owner) ? C.defTac || "sik" : null, castle: castle ? p.castle + (hasTech(s, p.owner, "gotika") ? 1 : 0) : 0, dur: castle ? p.dur : 0 };
}
function siegeTurn(s, a, p) {
  const C = s.clans[a.cl];
  const garr = men(p.troops);
  if (!p.siege) { p.siege = { by: a.cl, army: a.id, months: 0, supply: p.castle * 2 + 2 }; if (isPlayer(s, p.owner) || isPlayer(s, a.cl)) news(s, `${C.house} oblehli hrad v kraji ${p.n}.`, "valka", [a.cl, p.owner]); }
  p.siege.army = a.id; p.siege.by = a.cl;
  // silná posádka vyrazí do pole
  if (garr > men(a.t) * 0.9 && garr > 300) {
    const Aside = sideOf(s, a), Dside = garrisonSide(s, p, false);
    const { aWins } = battle(s, Aside, Dside, p.id, "bitva");
    a.t = Aside.t; p.troops = Dside.t; a.morale = Aside.morale; a.cmds = a.cmds.filter(id => { const c = chr(s, id); return c && c.st === "off"; });
    if (!aWins) { p.siege = null; armyHome(s, a); return; }
  }
  p.siege.months++;
  p.dur = Math.max(0, p.dur - (hasTech(s, a.cl, "trebuchet") ? 25 : 8) * (hasTechSafe(s, a.cl, "prach") ? 1.6 : 1) * (hasTechSafe(s, a.cl, "bombarda") ? 1.5 : 1) - men(a.t) / 1000 * 2);
  if (a.siegeMode === "ztec" || (p.dur <= 0 && men(a.t) > men(p.troops) * 1.5)) {
    const Aside = sideOf(s, a), Dside = garrisonSide(s, p, true);
    if (manualOf(s, a)) { startManual(s, Aside, Dside, p.id, "zteč", { type: "assault", aid: a.id, pid: p.id, aSide: "A" }); return; }
    const { aWins } = battle(s, Aside, Dside, p.id, "zteč");
    a.t = Aside.t; p.troops = Dside.t; a.morale = Aside.morale;
    assaultAfter(s, a, p, aWins); return;
  }
  // vyhladovění
  if (p.siege.months > p.siege.supply) { loseMen(p.troops, Math.round(men(p.troops) * 0.18) + 20); p.loy -= 3; }
  if (men(p.troops) < 40) conquer(s, a, p);
}
function assaultAfter(s, a, p, aWins) {
  a.cmds = a.cmds.filter(id => { const c = chr(s, id); return c && c.st === "off"; });
  if (aWins || men(p.troops) < 30) { conquer(s, a, p); return; }
  if (a.morale < 30 || men(a.t) < 100) { p.siege = null; armyHome(s, a); }
}

function conquer(s, a, p) {
  occupy(s, a, p);
  if (!s.armies.includes(a)) return;
  if (p.owner === a.cl && !p.occ) mergeArmy(s, a, p.id); // osvobozený vlastní kraj – vojsko se stane posádkou
}
