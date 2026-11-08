// Diplomacie, válka, bitvy, obléhání a rozhodování soupeřů.

function rivalTech(s) { return 1 + s.turn / 300; }
function armyPower(s, units, o = {}) {
  let p = 0; const T = TERRAIN[o.terrain || "nizina"];
  for (const [u, n] of Object.entries(units)) {
    if (!n) continue; const U = UNITS[u];
    let v = (o.defending ? U.atk * 0.4 + U.def * 0.6 : U.atk * 0.6 + U.def * 0.4) * n * U.mor;
    if (U.cav) v *= T.cav; if (o.player && u === "rytiri" && has(s, "zbroj")) v *= 1.15; if (U.siege) v *= 0.3;
    p += v;
  }
  if (o.defending) p *= T.def;
  p *= (o.morale || 1) * (1 + (o.mil || 0) * 0.025);
  if (o.player && has(s, "taktika")) p *= 1.1; if (!o.player) p *= rivalTech(s);
  return p;
}
function playerArmyPower(s, a, defending) { const p = s.provinces[a.loc]; return armyPower(s, a.units, { terrain: p.terrain, defending, morale: a.morale, mil: commanderMil(s, a), player: true }); }
function commanderMil(s, a) { if (a.commander === "ruler") return stat(ch(s, s.ruler), "mil"); if (a.commander === "marsal") return cstat(s, "marsal"); return Math.floor(cstat(s, "marsal") / 3); }
function rivalPower(s, r, defending) { const p = s.provinces[r.loc] || { terrain: "nizina" }; return armyPower(s, r.units, { terrain: p.terrain, defending, morale: r.morale, mil: stat(ch(s, r.ruler), "mil") }); }
function playerTotalPower(s) { return sum(s.armies.map(a => armyPower(s, a.units, { morale: a.morale, mil: commanderMil(s, a), player: true }))); }

// odhad síly soupeře podle zvědů
function rivalEstimate(s, r) {
  const n = unitCount(r.units);
  if (r.intel > s.turn) return { exact: true, n, txt: n + " setnin" };
  const lo = Math.max(0, Math.round(n * 0.7)), hi = Math.round(n * 1.35) + 1;
  return { exact: false, n, txt: `asi ${lo}–${hi} setnin` };
}

// ---------- diplomacie ----------
const DIP = {
  dar: { n: "Poslat dary (50 zl)" }, obchod: { n: "Obchodní smlouva" }, spojenectvi: { n: "Nabídnout spojenectví" }, snatek: { n: "Dohodnout sňatek" },
  tribut: { n: "Žádat tribut" }, narok: { n: "Vyfabrikovat nárok (60 zl)" }, zvedove: { n: "Vyslat zvědy (20 zl)" }, sabotaz: { n: "Sabotáž vojska (50 zl)" },
  vzpoura: { n: "Podnítit vzpouru (80 zl)" }, zrusit: { n: "Vypovědět smlouvy" }, valka: { n: "Vyhlásit válku" },
};
function dipChance(s) { return stat(ch(s, s.ruler), "dip") * 0.01 + cstat(s, "kancler") * 0.015; }
function unmarriedChildren(s) { return s.children.map(id => ch(s, id)).filter(c => c && !c.married && c.age >= 10); }
function borders(s, rid) { return myProvs(s).some(p => p.nb.some(n => s.provinces[n].owner === rid)); }
function dipAction(s, rid, act, extra) {
  const r = s.rivals[rid]; if (!r || !r.alive) return "Neexistuje.";
  const war = atWarWith(s, rid);
  if (act !== "valka" && r.lastDip === s.turn && !["zvedove", "sabotaz", "vzpoura"].includes(act)) return "Posly jsi k nim už v tomto období vyslal.";
  if (war && ["obchod", "spojenectvi", "snatek", "tribut", "dar"].includes(act)) return "Jste ve válce – jednej o míru.";
  const att = r.attitude, R = ch(s, r.ruler), spy = cstat(s, "speh");
  const say = t => { log(s, `${r.n}: ${t}`, "diplomacie"); return null; };
  if (!["zvedove", "sabotaz", "vzpoura", "valka"].includes(act)) r.lastDip = s.turn;
  switch (act) {
    case "dar": if (s.money < 50) return "Nedostatek zlata."; s.money -= 50; r.attitude = clamp(att + 8 + stat(ch(s, s.ruler), "dip") / 3 + (r.greed > 0.7 ? 4 : 0), -100, 100); r.treasury += 50; return say("dary přijaty, vztah se zlepšil.");
    case "obchod":
      if (r.trade) return "Smlouvu už máte."; if (s.routes.length >= routeLimit(s)) return "Víc obchodních cest neuneseš (stav tržiště, přístav, koga).";
      if (att < (rid === "brodno" ? -5 : 10) - dipChance(s) * 30) { return say("obchodní smlouvu odmítli."); }
      r.trade = true; s.routes.push({ with: rid, n: "Obchod s " + r.n }); r.attitude += 5; return say("uzavřena obchodní smlouva.");
    case "spojenectvi":
      if (r.alliance) return "Už jste spojenci."; if (att + (r.marriage ? 15 : 0) + dipChance(s) * 30 < 40) return say("spojenectví odmítli – nedůvěřují ti dost.");
      r.alliance = true; s.prestige += 5; return say("uzavřeli s tebou spojenectví!");
    case "snatek": {
      const c = ch(s, extra) || unmarriedChildren(s)[0]; if (!c) return "Nemáš svobodného potomka (aspoň 10 let).";
      if (att + dipChance(s) * 30 < 15) return say("sňatek odmítli.");
      c.married = rid; c.spouseName = pick(s, c.sex === "m" ? NAMES_F : NAMES_M) + " (" + r.n + ")"; r.marriage = true; r.attitude += 25; s.legitimacy += 4; s.prestige += 8;
      return say(`${c.name} bude oddán(a) s ${c.spouseName}. Rody jsou spřízněny.`);
    }
    case "tribut": {
      const ratio = playerTotalPower(s) / Math.max(1, rivalPower(s, r));
      if (ratio > 1.5 + r.aggr * 0.5 || (ratio > 1.2 && R && R.traits.includes("zbabely"))) { const g = Math.round(clamp(r.treasury * 0.4, 30, 200)); r.treasury -= g; s.money += g; r.attitude -= 25; s.prestige += 6; return say(`ze strachu zaplatili tribut ${g} zl.`); }
      r.attitude -= 10; s.prestige -= 3; return say("se ti vysmáli.");
    }
    case "narok": {
      if (s.money < 60) return "Nedostatek zlata."; if (s.claims[rid]) return "Nárok už máš.";
      s.money -= 60; if (chance(s, 0.3 + cstat(s, "kancler") * 0.025 + stat(ch(s, s.ruler), "int") * 0.01)) { s.claims[rid] = true; log(s, `Kancléř našel v listinách nárok na území (${r.n}). Válka bude spravedlivá.`, "diplomacie"); return null; }
      if (chance(s, 0.5)) { r.attitude -= 20; return say("odhalili padělané listiny! Vztah se zhoršil."); }
      log(s, "Hledání nároku zatím nepřineslo výsledek.", "diplomacie"); return null;
    }
    case "zvedove": if (s.money < 20) return "Nedostatek zlata."; s.money -= 20; if (chance(s, 0.6 + spy * 0.03)) { r.intel = s.turn + 6; log(s, `Zvědové zjistili přesný stav vojska: ${r.n}.`, "intriky"); } else log(s, "Zvědové se nevrátili.", "intriky"); return null;
    case "sabotaz": case "vzpoura": {
      const cost = act === "sabotaz" ? 50 : 80; if (s.money < cost) return "Nedostatek zlata."; s.money -= cost;
      if (chance(s, 0.3 + spy * 0.03 - stat(R, "int") * 0.01)) {
        if (act === "sabotaz") { for (const u of Object.keys(r.units)) r.units[u] = Math.floor(r.units[u] * 0.85); r.morale = Math.max(0.5, r.morale - 0.15); log(s, `Sabotáž se zdařila: zásoby ${r.n} shořely, vojsko slábne.`, "intriky"); }
        else { r.treasury = Math.max(0, r.treasury - 100); r.exhaustion += 15; for (const u of Object.keys(r.units)) r.units[u] = Math.floor(r.units[u] * 0.9); log(s, `V zemi ${r.n} vypukla vzpoura!`, "intriky"); }
      } else if (chance(s, 0.5)) { r.attitude -= 30; s.prestige -= 5; log(s, `Tvoji agenti byli dopadeni (${r.n}). Skandál!`, "intriky"); }
      else log(s, "Spiknutí se nezdařilo, ale nikdo nic neví.", "intriky");
      return null;
    }
    case "zrusit":
      if (r.trade) { r.trade = false; s.routes = s.routes.filter(x => x.with !== rid); } if (r.alliance) { r.alliance = false; s.prestige -= 10; }
      r.attitude -= 15; return say("smlouvy vypovězeny.");
    case "valka": return declareWar(s, rid);
  }
  return "Neznámá akce.";
}

function declareWar(s, rid) {
  const r = s.rivals[rid];
  if (atWarWith(s, rid)) return "Už jste ve válce."; if (r.truce > s.turn) return "Platí příměří ještě " + (r.truce - s.turn) + " období.";
  if (!borders(s, rid)) return "Nesousedíte.";
  const just = !!s.claims[rid];
  if (r.alliance) { r.alliance = false; s.prestige -= 30; s.legitimacy -= 10; }
  if (r.trade) { r.trade = false; s.routes = s.routes.filter(x => x.with !== rid); }
  if (!just) { s.prestige -= 25; s.piety -= 10; s.legitimacy -= 5; s.liege.opinion -= 10; for (const o of aliveRivals(s)) if (o.id !== rid) o.attitude -= 8; }
  else s.liege.opinion -= 3;
  if (r.marriage) { s.piety -= 10; s.prestige -= 10; }
  r.attitude = Math.min(r.attitude, -50) - 10;
  startWar(s, rid, true, just);
  return null;
}
function startWar(s, rid, byPlayer, just) {
  const r = s.rivals[rid]; const w = { enemy: rid, bs: 0, start: s.turn, byPlayer, just, allies: [] };
  for (const a of aliveRivals(s)) if (a.id !== rid && a.alliance && a.attitude > 20 && !atWarWith(s, a.id)) w.allies.push(a.id);
  s.wars.push(w); r.exhaustion = 0;
  log(s, byPlayer ? `Vyhlásil jsi válku: ${r.n}${just ? " (spravedlivý nárok)" : " (bez nároku – pohoršení)"}.` : `${r.n} ti vyhlásil(o) válku!`, "valka");
  if (w.allies.length) log(s, "Spojenci se přidávají: " + w.allies.map(a => s.rivals[a].n).join(", ") + ".", "valka");
  if (!byPlayer) s.events.push({ id: "_war", rid });
}

function warScore(s, w) {
  let occE = 0, occO = 0, cap = 0;
  for (const p of Object.values(s.provinces)) {
    if (p.owner === w.enemy && p.occ === "hrac") occE++;
    if (p.owner === "hrac" && p.occ === w.enemy) { occO++; if (p.id === s.capital) cap = 20; }
  }
  return clamp(Math.round(w.bs + occE * 12 - occO * 12 - cap), -100, 100);
}

// ---------- mír ----------
function peaceOptions(s, rid) {
  const w = atWarWith(s, rid), r = s.rivals[rid], sc = warScore(s, w), rp = rivalProvs(s, rid);
  const opts = [];
  opts.push({ t: "bila", n: "Bílý mír (návrat k předválečnému stavu)", ok: sc >= -5 + r.aggr * 15 - r.exhaustion / 2 });
  const g = Math.round(clamp(r.treasury * Math.min(1, Math.max(0, sc) / 60), 0, 2000));
  if (sc >= 15 && g >= 20) opts.push({ t: "zlato", n: `Válečné odškodné ${g} zl`, amount: g, ok: true });
  for (const pid of rp) { if (rp.length < 2) break; const need = s.provinces[pid].occ === "hrac" ? 25 : 45; if (sc >= need && s.provinces[pid].nb.some(n => s.provinces[n].owner === "hrac" || rp.includes(n))) opts.push({ t: "provincie", pid, n: `Postoupení provincie ${s.provinces[pid].n} (potřeba ${need})`, ok: true }); }
  if (sc >= 80 || (sc >= 60 && rp.length <= 1) || (rp.length === 1 && s.provinces[rp[0]].occ === "hrac")) opts.push({ t: "podrobit", n: "Podrobit celou zemi a připojit ji", ok: true });
  opts.push({ t: "kapitulace", n: "Kapitulovat (zaplatit nebo postoupit území)", ok: true });
  return { score: sc, opts };
}
function makePeace(s, rid, opt) {
  const w = atWarWith(s, rid), r = s.rivals[rid];
  if (!w) return "Nejste ve válce.";
  const { opts } = peaceOptions(s, rid); const o = opts.find(x => x.t === opt.t && (x.pid || null) === (opt.pid || null));
  if (!o) return "Tyto podmínky nepřicházejí v úvahu.";
  if (!o.ok) { log(s, `${r.n} odmítá bílý mír.`, "valka"); return "Soupeř odmítl."; }
  let txt = "";
  if (o.t === "bila") txt = "Uzavřen bílý mír.";
  if (o.t === "zlato") { r.treasury -= o.amount; s.money += o.amount; s.prestige += 15; txt = `Mír: odškodné ${o.amount} zl.`; }
  if (o.t === "provincie") { cede(s, o.pid, "hrac"); s.prestige += 25; txt = `Mír: získáváš provincii ${s.provinces[o.pid].n}.`; }
  if (o.t === "podrobit") { for (const pid of rivalProvs(s, rid)) cede(s, pid, "hrac"); s.prestige += 60; s.money += Math.max(0, Math.round(r.treasury)); txt = `${r.n} je podroben(o) a připojen(o) k tvé zemi!`; }
  if (o.t === "kapitulace") {
    const occ = myProvs(s).filter(p => p.occ === rid && p.id !== s.capital);
    if (occ.length) { cede(s, occ[0].id, rid); txt = `Kapitulace: ztrácíš provincii ${occ[0].n}.`; }
    else { const g = Math.round(Math.max(50, s.money * 0.4)); s.money -= g; r.treasury += g; txt = `Kapitulace: platíš ${g} zl.`; }
    s.prestige -= 30; s.legitimacy -= 10;
  }
  endWar(s, rid); log(s, txt, "valka"); return null;
}
function endWar(s, rid) {
  const r = s.rivals[rid]; s.wars = s.wars.filter(w => w.enemy !== rid); delete s.claims[rid];
  for (const p of Object.values(s.provinces)) {
    if ((p.owner === rid && p.occ === "hrac") || (p.owner === "hrac" && p.occ === rid)) p.occ = null;
    if (p.siege && (p.siege.by === rid || (p.owner === rid))) p.siege = null;
  }
  r.truce = s.turn + 12; r.exhaustion = 0;
  const rp = rivalProvs(s, rid);
  if (!rp.length) { r.alive = false; log(s, `${r.n} přestal(o) existovat.`, "valka"); }
  else r.loc = rp[0];
  // vojska hráče na cizím území se vrátí domů
  for (const a of s.armies) if (s.provinces[a.loc].owner !== "hrac" && !canEnter(s, a.loc)) { a.loc = nearestOwn(s, a.loc) || s.capital; a.order = null; }
}
function cede(s, pid, to) {
  const p = s.provinces[pid], from = p.owner; p.owner = to; p.occ = null; p.siege = null; p.levy = 0;
  if (to === "hrac") { p.unrest = Math.max(p.unrest, 40); p.conquered = s.turn + 8; p.prosp = Math.min(p.prosp, 40); }
  if (from !== "hrac" && s.rivals[from] && !rivalProvs(s, from).length) { s.rivals[from].alive = false; s.wars = s.wars.filter(w => w.enemy !== from); }
  if (from === "hrac" && pid === s.capital) { const o = myProvs(s)[0]; if (o) { s.capital = o.id; s.seat.hradby = 0; s.legitimacy -= 30; log(s, "Ztratil jsi své sídlo! Dvůr se stěhuje do " + o.n + ".", "rod"); } }
  for (const a of s.armies) if (a.loc === pid && to !== "hrac") { a.loc = nearestOwn(s, pid) || s.capital; a.order = null; }
}
function nearestOwn(s, from) {
  const seen = { [from]: 1 }, q = [from];
  while (q.length) { const c = q.shift(); for (const n of s.provinces[c].nb) { if (seen[n]) continue; seen[n] = 1; if (s.provinces[n].owner === "hrac" && !s.provinces[n].occ) return n; q.push(n); } }
  return null;
}

// ---------- bitvy ----------
function applyLosses(s, units, frac) {
  const lost = {};
  for (const u of Object.keys(units)) { const n = units[u]; if (!n) continue; let l = n * frac; l = Math.floor(l) + (chance(s, l % 1) ? 1 : 0); l = Math.min(n, l); units[u] = n - l; if (l) lost[u] = l; }
  return lost;
}
function battle(s, pid, w) {
  const r = s.rivals[w.enemy], p = s.provinces[pid];
  const mine = s.armies.filter(a => a.loc === pid && unitCount(a.units) > 0); if (!mine.length || unitCount(r.units) === 0) return;
  const playerDef = p.owner === "hrac";
  const pA = sum(mine.map(a => playerArmyPower(s, a, playerDef))) * (0.8 + rnd(s) * 0.4);
  const pB = rivalPower(s, r, !playerDef) * (0.8 + rnd(s) * 0.4);
  const ratio = pA / (pA + pB), win = ratio > 0.5, margin = Math.abs(ratio - 0.5) * 2;
  const myN = sum(mine.map(a => unitCount(a.units))), enN = unitCount(r.units);
  const lossW = 0.06 + rnd(s) * 0.06, lossL = 0.18 + margin * 0.35;
  const myLost = {}, enLost = applyLosses(s, r.units, win ? lossL : lossW);
  for (const a of mine) { const l = applyLosses(s, a.units, win ? lossW : lossL); for (const [u, n] of Object.entries(l)) myLost[u] = (myLost[u] || 0) + n; a.morale = clamp(a.morale + (win ? 0.05 : -0.2), 0.4, 1.3); }
  r.morale = clamp(r.morale + (win ? -0.2 : 0.05), 0.4, 1.3);
  const sz = clamp((myN + enN) / 30, 0.3, 1.5), d = Math.round((6 + 14 * margin) * sz);
  w.bs += win ? d : -d; r.exhaustion += win ? 8 : 3;
  const R = ch(s, s.ruler); let extra = "";
  if (mine.some(a => a.commander === "ruler")) {
    if (!win && chance(s, 0.06)) { R.health = -1; extra = ` ${R.name} padl v bitvě!`; }
    else if (chance(s, win ? 0.04 : 0.1)) { R.health -= rint(s, 15, 35); extra = ` ${R.name} byl v boji zraněn.`; }
    else if (win) { s.prestige += 5; extra = " Panovník se vyznamenal."; }
  }
  if (win) { s.prestige += Math.round(d / 2); mod(s, "slechta", 3, 4, "Vítězná bitva"); }
  const lostTxt = l => Object.entries(l).map(([u, n]) => `${n}× ${UNITS[u].n}`).join(", ") || "žádné";
  const rep = { d: dateStr(s), place: p.n, enemy: r.n, win, my: myN, en: enN, myLost: lostTxt(myLost), enLost: lostTxt(enLost), pA: Math.round(pA), pB: Math.round(pB), score: win ? d : -d };
  s.battles = s.battles || []; s.battles.unshift(rep); if (s.battles.length > 30) s.battles.length = 30;
  log(s, `Bitva u ${p.n}: ${win ? "VÍTĚZSTVÍ" : "porážka"} proti ${r.n} (síla ${rep.pA} : ${rep.pB}). Ztráty: naše ${rep.myLost}; jejich ${rep.enLost}.${extra}`, "valka");
  // ústup poraženého
  if (win) { const home = rivalProvs(s, r.id).filter(x => !s.provinces[x].occ && x !== pid); r.loc = home.length ? pick(s, home) : r.loc; if (s.provinces[pid].siege && s.provinces[pid].siege.by === r.id) s.provinces[pid].siege = null; }
  else { const back = nearestOwn(s, pid) || s.capital; for (const a of mine) { if (back !== pid) a.loc = back; a.order = null; } if (p.siege && p.siege.by === "hrac") p.siege = null; }
}

// ---------- obléhání ----------
function fortLevel(s, p) { let f = p.b.hradek || 0; if (p.owner === "hrac" && p.id === s.capital) f += s.seat.hradby * 1.5; if (p.owner !== "hrac") { const rp = rivalProvs(s, p.owner); if (rp[0] === p.id) f += 2; } return f; }
function siegeStep(s, p, by, units) {
  const siegeP = sum(Object.entries(units).map(([u, n]) => (UNITS[u].siege || 0) * n));
  const prog = Math.max(3, 8 + siegeP + unitCount(units) * 0.6 - fortLevel(s, p) * 6);
  if (!p.siege || p.siege.by !== by) p.siege = { by, prog: 0 };
  p.siege.prog = Math.min(100, p.siege.prog + prog);
  if (p.siege.prog >= 100) {
    p.siege = null; p.occ = by;
    if (by === "hrac") { s.money += Math.round(p.pop / 1000 * 8); log(s, `Dobyli jsme ${p.n}! Vojsko plení a odvádí kořist.`, "valka"); }
    else { log(s, `Nepřítel (${s.rivals[by].n}) obsadil ${p.n}!`, "valka"); if (p.id === s.capital) { s.legitimacy -= 15; s.money = Math.round(s.money * 0.7); log(s, "Sídlo padlo! Pokladnice byla vypleněna.", "valka"); } }
  }
}

// ---------- tah války ----------
function bfs(s, from, to, ok) {
  if (from === to) return [];
  const prev = { [from]: null }, q = [from];
  while (q.length) { const c = q.shift(); for (const n of s.provinces[c].nb) { if (n in prev || !ok(n)) continue; prev[n] = c; if (n === to) { const path = [n]; let x = c; while (x !== from) { path.unshift(x); x = prev[x]; } return path; } q.push(n); } }
  return null;
}
function warTurn(s) {
  // pohyb vojsk hráče
  for (const a of s.armies) {
    if (!a.order || !a.order.path.length) { a.order = null; continue; }
    const nx = a.order.path[0]; if (!canEnter(s, nx)) { a.order = null; continue; }
    a.loc = nx; a.order.path.shift(); if (!a.order.path.length) a.order = null;
  }
  for (const w of s.wars.slice()) {
    const r = s.rivals[w.enemy]; if (!r.alive) { s.wars = s.wars.filter(x => x !== w); continue; }
    // rozhodnutí nepřítele
    const own = rivalProvs(s, r.id); const lost = own.filter(pid => s.provinces[pid].occ === "hrac" || (s.provinces[pid].siege && s.provinces[pid].siege.by === "hrac"));
    const myPow = playerTotalPower(s), enPow = rivalPower(s, r);
    let target = null;
    if (lost.length) target = lost[0];
    else if (enPow > myPow * 0.8 * (1.2 - r.aggr * 0.3)) { const tgts = myProvs(s).filter(p => p.occ !== r.id).sort((x, y) => (y.id === s.capital ? 1 : 0) - (x.id === s.capital ? 1 : 0)); let best = null, bl = 99; for (const t of tgts) { const pth = bfs(s, r.loc, t.id, n => [r.id, "hrac"].includes(s.provinces[n].owner)); if (pth && pth.length < bl) { bl = pth.length; best = t.id; } } target = best; }
    else target = own[0];
    if (target && unitCount(r.units) > 0) { const pth = bfs(s, r.loc, target, n => [r.id, "hrac"].includes(s.provinces[n].owner)); if (pth && pth.length) r.loc = pth[0]; }
    // hotovost nepřítele
    if (!w.levy && unitCount(r.units) < 8) { w.levy = true; r.units.hotovost = (r.units.hotovost || 0) + Math.round(sum(own.map(p => s.provinces[p].pop)) / 1000 * 0.8); log(s, `${r.n} povolává selskou hotovost.`, "valka"); }
    // bitvy
    if (s.armies.some(a => a.loc === r.loc && unitCount(a.units) > 0) && unitCount(r.units) > 0) battle(s, r.loc, w);
    // obléhání
    const rp = s.provinces[r.loc];
    if (rp && rp.owner === "hrac" && rp.occ !== r.id && unitCount(r.units) > 0 && !s.armies.some(a => a.loc === rp.id && unitCount(a.units) > 0)) siegeStep(s, rp, r.id, r.units);
    for (const pid of new Set(s.armies.filter(a => unitCount(a.units) > 0).map(a => a.loc))) {
      const p = s.provinces[pid];
      if (p.owner === r.id && p.occ !== "hrac" && !(r.loc === pid && unitCount(r.units) > 0)) { const units = {}; for (const a of s.armies.filter(x => x.loc === pid)) for (const [u, n] of Object.entries(a.units)) units[u] = (units[u] || 0) + n; siegeStep(s, p, "hrac", units); }
      if (p.owner === "hrac" && p.occ === r.id && !(r.loc === pid && unitCount(r.units) > 0)) { p.occ = null; log(s, `${p.n} osvobozeno.`, "valka"); }
    }
    // obležení se rozpadá, když obléhatel odejde
    for (const p of Object.values(s.provinces)) if (p.siege) { const by = p.siege.by; const present = by === "hrac" ? s.armies.some(a => a.loc === p.id && unitCount(a.units)) : (s.rivals[by] && s.rivals[by].loc === p.id && unitCount(s.rivals[by].units)); if (!present) p.siege = null; }
    // spojenci
    for (const al of w.allies) { const A = s.rivals[al]; if (!A || !A.alive) continue; const ap = rivalPower(s, A) * 0.3; if (ap > 1) { const d = clamp(Math.round(ap / Math.max(10, enPow) * 6), 1, 5); w.bs += d; applyLosses(s, r.units, 0.03); r.exhaustion += 1; } }
    r.exhaustion += 2;
    // nabídka míru od soupeře
    const sc = warScore(s, w);
    if (s.turn - w.start >= 2 && !s.events.some(e => e.id === "_peace" && e.rid === r.id)) {
      if (sc >= 40 && chance(s, 0.25 + r.exhaustion / 200)) s.events.push({ id: "_peace", rid: r.id, kind: "offer" });
      else if (sc <= -40 && chance(s, 0.25)) s.events.push({ id: "_peace", rid: r.id, kind: "demand" });
      else if (r.exhaustion > 40 && sc > -15 && chance(s, 0.15)) s.events.push({ id: "_peace", rid: r.id, kind: "white" });
    }
  }
}

// ---------- tah soupeřů ----------
function rivalsTurn(s) {
  const pp = playerTotalPower(s);
  for (const r of aliveRivals(s)) {
    const own = rivalProvs(s, r.id); if (!own.length) { r.alive = false; continue; }
    const inc = sum(own.map(pid => s.provinces[pid].pop)) / 1000 * 2.4 * r.wealth * (atWarWith(s, r.id) ? 0.8 : 1);
    const up = sum(Object.entries(r.units).map(([u, n]) => UNITS[u].up * n));
    r.treasury += inc - up;
    const target = inc * (0.5 + r.aggr * 0.4) * (atWarWith(s, r.id) ? 1.3 : 1);
    if (r.treasury > 80 && up < target) {
      const pool = ["kopinici", "kopinici", "lucistnici", "rytiri"]; if (s.turn > 30) pool.push("kusinici"); if (s.turn > 70) pool.push("zbrojnosi"); if (r.wealth > 1.3) pool.push("zoldneri", "zoldneri"); if (atWarWith(s, r.id) && s.turn > 40) pool.push("stroje");
      const u = pick(s, pool), U = UNITS[u], n = Math.max(1, Math.floor(Math.min(3, (r.treasury - 50) / U.cost)));
      if (n > 0 && r.treasury >= U.cost * n) { r.units[u] = (r.units[u] || 0) + n; r.treasury -= U.cost * n; }
    }
    if (r.treasury < 0) { const ks = Object.keys(r.units).filter(u => r.units[u] > 0); if (ks.length) r.units[pick(s, ks)]--; }
    if (!atWarWith(s, r.id) && r.units.hotovost) r.units.hotovost = Math.max(0, r.units.hotovost - 3);
    r.morale = clamp(r.morale + (1 - r.morale) * 0.2, 0.4, 1.3);
    if (!atWarWith(s, r.id) && !own.includes(r.loc)) r.loc = own[0];
    // vztah
    let base = (r.alliance ? 30 : 0) + (r.marriage ? 20 : 0) + (r.trade ? 10 : 0) + stat(ch(s, s.ruler), "dip") - 10 + (s.claims[r.id] ? -15 : 0);
    if (pp > rivalPower(s, r) * 2) base -= 10 * r.aggr;
    if (r.piety > 0.7) base += (s.piety - 40) / 5;
    if (atWarWith(s, r.id)) base = -60;
    r.attitude = clamp(r.attitude + (base - r.attitude) * 0.06, -100, 100);
    // vyhlášení války
    if (!atWarWith(s, r.id) && r.truce <= s.turn && !r.alliance && borders(s, r.id) && s.turn > 3) {
      const ratio = rivalPower(s, r) / Math.max(1, pp);
      let p = r.aggr * 0.035 * (r.attitude < -40 ? 2 : r.attitude < -10 ? 1 : 0.15) * (ratio > 1.3 ? 1.8 : ratio < 0.8 ? 0.25 : 1) * (r.marriage ? 0.3 : 1);
      if (s.realm.title >= 2) p *= 0.8;
      if (chance(s, p)) startWar(s, r.id, false);
    }
    // stárnutí a smrt panovníka soupeře
    const R = ch(s, r.ruler);
    if (s.season === 0) R.age++;
    if (chance(s, deathChance(R))) {
      const nw = newChar(s, { sex: "m", age: rint(s, 18, 40), estate: "cizi" }); nw.name = pick(s, NAMES_M) + " " + r.n.split(" ").pop(); r.ruler = nw.id; delete s.chars[R.id];
      r.attitude = Math.round(r.attitude / 2); if (r.alliance && chance(s, 0.4)) { r.alliance = false; log(s, `${r.n}: nový vládce vypověděl spojenectví.`, "diplomacie"); }
      log(s, `${r.n}: zemřel ${r.title} ${R.name}. Vlády se ujímá ${nw.name}.`, "svet");
    }
  }
  // války soupeřů mezi sebou (zprávy ze světa)
  if (s.season === 1 && chance(s, 0.25)) {
    const rs = aliveRivals(s).filter(r => !atWarWith(s, r.id)); const pairs = [];
    for (const a of rs) for (const b of rs) if (a.id < b.id && rivalProvs(s, a.id).some(pid => s.provinces[pid].nb.some(n => s.provinces[n].owner === b.id))) pairs.push([a, b]);
    if (pairs.length) {
      const [a, b] = pick(s, pairs); const pa = rivalPower(s, a) * (0.7 + rnd(s) * 0.6), pb = rivalPower(s, b) * (0.7 + rnd(s) * 0.6);
      const [W, L] = pa > pb ? [a, b] : [b, a]; applyLosses(s, L.units, 0.25); applyLosses(s, W.units, 0.1);
      let txt = `Válka mezi ${a.n} a ${b.n}: vítězí ${W.n}.`;
      const lp = rivalProvs(s, L.id).filter(pid => s.provinces[pid].nb.some(n => s.provinces[n].owner === W.id));
      if (lp.length && rivalProvs(s, L.id).length > 1 && chance(s, 0.35)) { const pid = pick(s, lp); s.provinces[pid].owner = W.id; txt += ` Provincie ${s.provinces[pid].n} připadla vítězi.`; }
      log(s, txt, "svet");
    }
  }
}
