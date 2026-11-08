// Akce hráče. Každá vrací null (hotovo) nebo text chyby.

// ---------- stavby ----------
function buildCost(s, B, lvl) {
  let m = [1, 0.9, 0.75][s.laws.robota] * (has(s, "gotika") ? 0.8 : 1) * (1 - cstat(s, "spravce") * 0.01);
  return { money: Math.round(B.cost[0] * lvl * m), drevo: Math.round(B.cost[1] * lvl * m), kamen: Math.round(B.cost[2] * lvl * m) };
}
function canBuild(s, where, b) {
  const seat = where === "seat", B = seat ? SBUILD[b] : PBUILD[b];
  const cur = seat ? s.seat[b] : (s.provinces[where].b[b] || 0);
  if (cur >= B.max) return "Nejvyšší úroveň.";
  if (s.queue.some(q => q.where === where && q.b === b)) return "Už se staví.";
  if (B.need && !B.need(seat ? s : s.provinces[where])) return "Nesplněné podmínky.";
  if (!seat) { const p = s.provinces[where]; if (p.owner !== "hrac") return "Není tvé."; if (p.occ) return "Obsazeno nepřítelem."; }
  if (s.queue.length >= 3 + Math.floor(cstat(s, "spravce") / 6)) return "Příliš mnoho staveb najednou (purkrabí víc neuřídí).";
  const c = buildCost(s, B, cur + 1);
  if (s.money < c.money) return "Nedostatek zlata."; if (s.stock.drevo < c.drevo) return "Nedostatek dřeva."; if (s.stock.kamen < c.kamen) return "Nedostatek kamene.";
  return null;
}
function build(s, where, b) {
  const err = canBuild(s, where, b); if (err) return err;
  const seat = where === "seat", B = seat ? SBUILD[b] : PBUILD[b], cur = seat ? s.seat[b] : (s.provinces[where].b[b] || 0), c = buildCost(s, B, cur + 1);
  s.money -= c.money; s.stock.drevo -= c.drevo; s.stock.kamen -= c.kamen;
  const time = Math.max(1, B.time + Math.floor(cur / 2) - (s.laws.robota === 2 ? 1 : 0));
  s.queue.push({ where, b, lvl: cur + 1, left: time, total: time, paid: c.money });
  log(s, `Zahájena stavba: ${B.n} (úroveň ${cur + 1}) – ${seat ? "sídlo" : s.provinces[where].n}.`, "stavby");
  return null;
}
function cancelBuild(s, i) { const q = s.queue[i]; if (!q) return "Není."; s.money += Math.round(q.paid / 2); s.queue.splice(i, 1); log(s, "Stavba zrušena, vrácena polovina nákladů.", "stavby"); return null; }

// ---------- vojsko ----------
function canRecruit(s, u, n, armyId) {
  const U = UNITS[u], a = s.armies.find(x => x.id === armyId);
  if (!a) return "Vyber vojsko."; if (u === "hotovost") return "Hotovost se povolává z provincií.";
  if (U.tech && !has(s, U.tech)) return "Chybí objev: " + TECHS[U.tech].n + ".";
  const p = s.provinces[a.loc]; if (!p || p.owner !== "hrac" || p.occ) return "Verbovat lze jen na vlastním území.";
  if (u === "rytiri" && s.estates.slechta.loy < 30) return "Šlechta odmítá posílat rytíře (věrnost pod 30).";
  const cost = Math.round(U.cost * n * (u === "rytiri" && s.seat.staje ? 1 - s.seat.staje * 0.05 : 1) * s.inflation);
  if (s.money < cost) return "Nedostatek zlata (" + cost + " zl).";
  for (const [g, q] of Object.entries(U.goods || {})) if (s.stock[g] < q * n) return "Nedostatek: " + GOODS[g].n + ".";
  return null;
}
function recruit(s, u, n, armyId) {
  n = Math.floor(n); if (n <= 0) return "Zadej počet.";
  const err = canRecruit(s, u, n, armyId); if (err) return err;
  const U = UNITS[u], a = s.armies.find(x => x.id === armyId);
  s.money -= Math.round(U.cost * n * (u === "rytiri" && s.seat.staje ? 1 - s.seat.staje * 0.05 : 1) * s.inflation);
  for (const [g, q] of Object.entries(U.goods || {})) s.stock[g] -= q * n;
  a.morale = (a.morale * unitCount(a.units) + 0.85 * n) / (unitCount(a.units) + n);
  a.units[u] = (a.units[u] || 0) + n;
  log(s, `Naverbováno ${n}× ${U.n} (${a.name}).`, "vojsko");
  return null;
}
function disband(s, armyId, u, n) {
  const a = s.armies.find(x => x.id === armyId); if (!a || !a.units[u]) return "Není co rozpustit.";
  n = Math.min(a.units[u], Math.floor(n)); a.units[u] -= n;
  if (u === "hotovost") { const left = sum(s.armies.map(x => x.units.hotovost || 0)); if (!left) for (const p of myProvs(s)) p.levy = 0; }
  else if (UNITS[u].goods) for (const [g, q] of Object.entries(UNITS[u].goods)) if (g !== "drevo") s.stock[g] += Math.floor(q * n / 2);
  log(s, `Rozpuštěno ${n}× ${UNITS[u].n}.`, "vojsko");
  return null;
}
const levyMult = s => [1.6, 1, 0.5][s.laws.vojsko];
function raiseLevy(s) {
  const ps = myProvs(s).filter(p => !p.levy && !p.occ); if (!ps.length) return "Hotovost už je povolána.";
  let total = 0;
  for (const p of ps) {
    const n = Math.max(1, Math.round(p.pop / 1000 * levyMult(s))); p.levy = 1; total += n;
    const a = s.armies.find(x => x.loc === p.id) || s.armies.find(x => s.provinces[x.loc].owner === "hrac") || s.armies[0];
    if (a) a.units.hotovost = (a.units.hotovost || 0) + n;
  }
  mod(s, "sedlaci", -4, 4, "Povolání hotovosti");
  log(s, `Povolána selská hotovost: ${total} setnin. Pole budou méně obdělaná.`, "vojsko");
  return null;
}
function newArmy(s, fromId, u, n) {
  const a = s.armies.find(x => x.id === fromId); n = Math.floor(n);
  if (!a || !a.units[u] || n <= 0) return "Není co oddělit."; n = Math.min(n, a.units[u]);
  if (s.armies.length >= 4) return "Nejvýš 4 vojska.";
  a.units[u] -= n; const id = "a" + (s.nextId++);
  s.armies.push({ id, name: "Vojsko " + (s.armies.length + 1), loc: a.loc, units: { [u]: n }, morale: a.morale, order: null, commander: null });
  return null;
}
function moveUnits(s, fromId, toId, u, n) {
  const a = s.armies.find(x => x.id === fromId), b = s.armies.find(x => x.id === toId);
  if (!a || !b || a.loc !== b.loc) return "Vojska musí stát ve stejné provincii."; n = Math.min(Math.floor(n), a.units[u] || 0); if (n <= 0) return "Není co přesunout.";
  a.units[u] -= n; b.units[u] = (b.units[u] || 0) + n; return null;
}
function mergeArmies(s, fromId, toId) {
  const a = s.armies.find(x => x.id === fromId), b = s.armies.find(x => x.id === toId);
  if (!a || !b || a === b || a.loc !== b.loc) return "Vojska musí stát ve stejné provincii.";
  for (const [u, n] of Object.entries(a.units)) b.units[u] = (b.units[u] || 0) + n;
  if (a.commander === "ruler") b.commander = "ruler";
  s.armies = s.armies.filter(x => x !== a); return null;
}
function canEnter(s, pid) {
  const p = s.provinces[pid]; if (p.owner === "hrac") return true;
  const r = s.rivals[p.owner]; return !!(atWarWith(s, p.owner) || (r && r.alliance));
}
function findPath(s, from, to) {
  if (from === to) return [];
  const prev = { [from]: null }, q = [from];
  while (q.length) { const c = q.shift(); for (const n of s.provinces[c].nb) { if (n in prev || !canEnter(s, n)) continue; prev[n] = c; if (n === to) { const path = [n]; let x = c; while (x !== from) { path.unshift(x); x = prev[x]; } return path; } q.push(n); } }
  return null;
}
function orderMove(s, armyId, to) {
  const a = s.armies.find(x => x.id === armyId); if (!a) return "Není vojsko.";
  if (to === a.loc) { a.order = null; return null; }
  const path = findPath(s, a.loc, to); if (!path) return "Tam nevede cesta (cizí území lze vstoupit jen ve válce nebo u spojence).";
  a.order = { to, path }; return null;
}
function setCommander(s, armyId, who) {
  for (const a of s.armies) if (a.commander === who) a.commander = null;
  const a = s.armies.find(x => x.id === armyId); if (a) a.commander = who || null; return null;
}

// ---------- daně, zákony, dluhy ----------
function setTax(s, e, v) { s.tax[e] = clamp(v, 0, 4); return null; }
function lawChangeCost(s) { return 15 + s.realm.title * 5; }
function setLaw(s, l, v) {
  if (s.laws[l] === v) return null;
  if ((s.lawCd[l] || 0) > s.turn) return "Tento zákon lze znovu měnit až za " + (s.lawCd[l] - s.turn) + " období.";
  const c = lawChangeCost(s); if (s.legitimacy < c / 2) return "Nedostatek legitimity.";
  s.legitimacy -= c / 2; s.prestige -= c / 3;
  const old = s.laws[l]; s.laws[l] = v; s.lawCd[l] = s.turn + 8;
  if (l === "mince" && v < old) mod(s, "mestane", 8, 8, "Návrat k poctivé minci");
  log(s, `Zákon „${LAWS[l].n}“ změněn: ${LAWS[l].opts[old]} → ${LAWS[l].opts[v]}.`, "politika");
  return null;
}
function maxLoan(s) { return Math.round((300 + totalPop(s) / 100) * (has(s, "smenky") ? 2 : 1)); }
function loanRate(s) { return r1((0.05 - (has(s, "ucetnictvi") ? 0.01 : 0) - (s.estates.mestane.loy > 60 ? 0.005 : 0) + (s.debts.length * 0.005))* 1000) / 1000; }
function borrow(s, amount) {
  amount = Math.floor(amount); const debt = sum(s.debts.map(d => d.amount));
  if (amount <= 0) return "Zadej částku."; if (debt + amount > maxLoan(s)) return "Lichváři víc nepůjčí (strop " + maxLoan(s) + " zl).";
  const rate = loanRate(s); s.debts.push({ amount, rate, from: s.turn }); s.money += amount;
  log(s, `Půjčka ${amount} zl u lichvářů, úrok ${Math.round(rate * 1000) / 10} % za období.`, "hospodarstvi");
  return null;
}
function repay(s, i) { const d = s.debts[i]; if (!d) return "Není."; if (s.money < d.amount) return "Nedostatek zlata."; s.money -= d.amount; s.debts.splice(i, 1); log(s, `Splacen dluh ${d.amount} zl.`, "hospodarstvi"); return null; }

// ---------- rada a dvůr ----------
function appoint(s, seat, cid) {
  const c = ch(s, cid); if (!c) return "Není.";
  const old = s.council[seat];
  for (const k of COUNCIL_IDS) if (s.council[k] === cid) s.council[k] = null;
  s.council[seat] = cid; s.courtiers = s.courtiers.filter(x => x !== cid);
  if (old && old !== cid) { const o = ch(s, old); s.courtiers.push(old); o.loyalty -= 20; mod(s, o.estate, -4, 4, "Odvolání " + o.name); }
  log(s, `${c.name} jmenován(a) do úřadu: ${COUNCIL[seat].n}.`, "politika");
  return null;
}
function dismiss(s, seat) { const id = s.council[seat]; if (!id) return null; const o = ch(s, id); s.council[seat] = null; s.courtiers.push(id); o.loyalty -= 25; mod(s, o.estate, -4, 4, "Odvolání " + o.name); log(s, `${o.name} odvolán(a) z úřadu ${COUNCIL[seat].n}.`, "politika"); return null; }
function setFocus(s, cid, f) { const c = ch(s, cid); if (c) c.focus = f; return null; }

// ---------- objevy a výpravy ----------
function setResearch(s, t) { if (!techAvailable(s, t)) return "Nelze."; s.research.cur = t; return null; }
function startExpedition(s, id) {
  const E = EXPEDITIONS[id];
  if ((E.req || []).some(r => !has(s, r))) return "Chybí objevy.";
  if (s.expeditions.some(x => x.id === id)) return "Výprava už je na cestě.";
  if (s.expDone[id] && id !== "knihy" && id !== "hory") return "Tento kraj už je probádán.";
  if (s.money < E.cost) return "Nedostatek zlata.";
  if ((id === "levanta" || id === "ocean" || id === "sever") && !myProvs(s).some(p => p.b.pristav)) return "Potřebuješ přístav.";
  s.money -= E.cost; s.expeditions.push({ id, left: E.time });
  log(s, `Vyslána výprava: ${E.n}.`, "objevy"); return null;
}
function routeLimit(s) { return 1 + Math.floor(sum(myProvs(s).map(p => p.b.trziste || 0)) / 2) + (has(s, "koga") ? 1 : 0) + (myProvs(s).some(p => p.b.pristav) ? 1 : 0); }

// ---------- osobní činy panovníka (body činů) ----------
const ACTIONS = {
  hostina: { n: "Uspořádat hostinu", d: "šlechta +10 na 6 období, prestiž +4", cost: s => ({ money: 40 - s.seat.sin * 10, vino: 4 }) },
  turnaj: { n: "Vypsat turnaj", d: "prestiž +12, šlechta +6, možná nový rytíř; panovník se může zranit", cost: () => ({ money: 90 }) },
  objezd: { n: "Objet panství", d: "nepokoje −8 všude, sedláci +5, legitimita +2", cost: () => ({}) },
  soud: { n: "Zasednout k soudu", d: "legitimita +4, sedláci a měšťané +4", cost: () => ({}) },
  dar: { n: "Štědrý dar církvi", d: "zbožnost +12, duchovenstvo +8 na 8 období", cost: () => ({ money: 60 }) },
  pout: { n: "Vydat se na pouť", d: "zbožnost +20, legitimita +2; cesta je nebezpečná", cost: () => ({ money: 30 }) },
  hon: { n: "Velký hon", d: "prestiž +3, šlechta +4; riziko zranění", cost: () => ({}) },
  ucenci: { n: "Rozprava s učenci", d: "učenost +6 a podle vzdělání panovníka", cost: () => ({ money: 15 }) },
  vycvik: { n: "Přehlídka a výcvik vojska", d: "morálka všech vojsk +0,1 (max. 1,3)", cost: () => ({ money: 30 }) },
  cechy: { n: "Jednat s cechy", d: "měšťané +10 na 6 období, prestiž −3", cost: () => ({}) },
  berne: { n: "Vypsat mimořádnou berni", d: "zlato ve výši 1,5× příjmu, všechny stavy −10, nepokoje +12", cost: () => ({}) },
  dvorane: { n: "Pozvat nové dvořany", d: "noví kandidáti do rady", cost: () => ({ money: 20 }) },
};
function doAction(s, a) {
  if (s.ap <= 0) return "Panovník už v tomto období nemá čas (žádné body činů).";
  const A = ACTIONS[a], c = A.cost(s), R = ch(s, s.ruler);
  if (c.money && s.money < c.money) return "Nedostatek zlata."; if (c.vino && s.stock.vino < c.vino) return "Chybí víno.";
  s.money -= c.money || 0; s.stock.vino -= c.vino || 0; s.ap--;
  let msg = "";
  const injure = (p, txt) => { if (chance(s, p)) { R.health -= rint(s, 10, 25); msg += " " + txt; } };
  switch (a) {
    case "hostina": mod(s, "slechta", 10 + s.seat.sin * 3, 6, "Hostina"); s.prestige += 4; msg = "Páni se veselili do rána."; break;
    case "turnaj": s.prestige += 12; mod(s, "slechta", 6, 6, "Turnaj"); msg = "Turnaj se vydařil.";
      if (chance(s, 0.3)) { s.armies[0].units.rytiri = (s.armies[0].units.rytiri || 0) + 1; msg += " Potulný rytíř vstoupil do služby."; }
      injure(0.12, `${R.name} byl zraněn v klání!`); break;
    case "objezd": for (const p of myProvs(s)) p.unrest = Math.max(0, p.unrest - 8); mod(s, "sedlaci", 5, 4, "Objezd panství"); s.legitimacy += 2; msg = "Lid viděl svého pána."; break;
    case "soud": s.legitimacy += 4; mod(s, "sedlaci", 4, 3, "Spravedlivý soud"); mod(s, "mestane", 4, 3, "Spravedlivý soud"); msg = "Spory rozsouzeny."; break;
    case "dar": s.piety += 12; mod(s, "duchovni", 8, 8, "Dar církvi"); msg = "Kněží chválí tvou štědrost."; break;
    case "pout": s.piety += 20; s.legitimacy += 2; msg = "Pouť ke svatým ostatkům."; injure(0.08, "Na cestě panovník onemocněl."); break;
    case "hon": s.prestige += 3; mod(s, "slechta", 4, 4, "Hon"); msg = "Úlovek byl bohatý."; injure(0.06, "Kanec panovníka zranil!"); break;
    case "ucenci": s.research.pts += 6 + stat(R, "uce") / 2; msg = "Učenci přinesli nové myšlenky."; break;
    case "vycvik": for (const x of s.armies) x.morale = Math.min(1.3, x.morale + 0.1); msg = "Vojsko cvičí."; break;
    case "cechy": mod(s, "mestane", 10, 6, "Jednání s cechy"); s.prestige -= 3; msg = "Cechy dostaly ústupky."; break;
    case "berne": { const inc = sum(Object.values(incomeBreakdown(s))); const g = Math.round(inc * 1.5); s.money += g; for (const e of ESTATE_IDS) mod(s, e, -10, 8, "Mimořádná berně"); for (const p of myProvs(s)) p.unrest += 12; msg = `Vybráno ${g} zl.`; break; }
    case "dvorane": refreshCourtiers(s); msg = "Ke dvoru přijeli noví lidé."; break;
  }
  log(s, A.n + ": " + msg, "panovnik"); return null;
}

// ---------- tituly a koruna ----------
function titleReq(s, t) {
  return [null, { prov: 5, prestige: 180, money: 300, liege: 45 }, { prov: 8, prestige: 400, money: 600, liege: 55 }, { prov: 12, prestige: 750, money: 1200, legit: 70 }][t];
}
function canTitle(s) {
  const t = s.realm.title + 1; if (t > 3) return "Nejvyšší titul.";
  const q = titleReq(s, t), miss = [];
  if (myProvs(s).length < q.prov) miss.push(`${q.prov} provincií`); if (s.prestige < q.prestige) miss.push(`prestiž ${q.prestige}`); if (s.money < q.money) miss.push(`${q.money} zl`);
  if (q.liege && s.liege.opinion < q.liege) miss.push(`přízeň krále ${q.liege}`); if (q.legit && s.legitimacy < q.legit) miss.push(`legitimita ${q.legit}`);
  if (s.wars.length && t === 3) miss.push("mír");
  return miss.length ? "Chybí: " + miss.join(", ") : null;
}
function raiseTitle(s) {
  const err = canTitle(s); if (err) return err;
  const t = s.realm.title + 1, q = titleReq(s, t); s.money -= q.money; s.realm.title = t;
  if (t < 3) { s.prestige += 40; s.legitimacy += 10; log(s, `Král tě povýšil: od nynějška jsi ${TITLES[t]}!`, "politika"); }
  else { s.over = { win: true, txt: `Arcibiskup tě korunoval na krále. Rod ${s.dynasty} založil vlastní království (${dateStr(s)}).` }; log(s, s.over.txt, "rod"); }
  return null;
}
