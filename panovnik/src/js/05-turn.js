// Konec ročního období: výroba, spotřeba, peníze, stavby, výzkum, rod, události.

function grainCap(s) { return 400 + s.seat.sypka * 150; }
function grainNeed(s) { return { lid: sum(myProvs(s).filter(p => !p.occ).map(p => p.pop)) / 1000 * 8, vojsko: armyUpkeep(s, totalUnits(s)).grain, dvur: 4 + s.children.length }; }
function deathChance(c) {
  if (!c) return 0; if (c.health <= 0) return 1;
  const a = c.age; let p = a < 5 ? 0.012 : a < 40 ? 0.002 : a < 55 ? 0.007 : a < 65 ? 0.02 : a < 75 ? 0.045 : 0.09;
  if (c.health < 30) p *= 3; else if (c.health < 50) p *= 1.6;
  return p;
}

function endTurn(s) {
  if (s.over) return "Hra skončila.";
  if (s.events.length) return "Nejdřív rozhodni o čekajících událostech.";
  const last = { prod: {}, use: {}, income: 0, expense: 0, trade: 0 };
  // výroba
  for (const p of myProvs(s)) {
    const { out, use } = provProduction(s, p);
    let ok = 1; for (const [g, q] of Object.entries(use)) if (s.stock[g] + (out[g] || 0) < q) ok = Math.min(ok, (s.stock[g] + (out[g] || 0)) / q);
    for (const [g, q] of Object.entries(use)) { s.stock[g] -= q * ok; last.use[g] = (last.use[g] || 0) + q * ok; }
    for (const [g, q] of Object.entries(out)) { const k = PBUILD_USES_INPUT(g) ? ok : 1; s.stock[g] += q * k; last.prod[g] = (last.prod[g] || 0) + q * k; }
  }
  for (const [g, q] of Object.entries(seatProduction(s))) { s.stock[g] += q; last.prod[g] = (last.prod[g] || 0) + q; }
  // obchodní cesty s exotickým zbožím
  for (const rt of s.routes) if (rt.good) { s.stock[rt.good] += 1; last.prod[rt.good] = (last.prod[rt.good] || 0) + 1; }
  // spotřeba obilí
  const need = grainNeed(s), totalNeed = need.lid + need.vojsko + need.dvur;
  last.use.obili = (last.use.obili || 0) + Math.min(totalNeed, s.stock.obili);
  const short = totalNeed > s.stock.obili ? (totalNeed - s.stock.obili) / totalNeed : 0;
  s.stock.obili = Math.max(0, s.stock.obili - totalNeed);
  for (const p of myProvs(s)) { p.hunger = short > 0.05 ? 1 : 0; if (short > 0.05) p.pop = Math.round(p.pop * (1 - short * 0.06)); }
  if (short > 0.05) { log(s, `Hlad! Chybí ${Math.round(short * 100)} % potřebného obilí.`, "hospodarstvi"); for (const a of s.armies) a.morale = Math.max(0.4, a.morale - short * 0.3); }
  // dvůr spotřebuje víno a sukno
  for (const [g, q] of [["vino", 1], ["sukno", 0.5]]) { if (s.stock[g] >= q) { s.stock[g] -= q; last.use[g] = (last.use[g] || 0) + q; } else s.prestige -= 1; }
  // zkáza zásob
  const cap = grainCap(s); if (s.stock.obili > cap) { const rot = (s.stock.obili - cap) * 0.3; s.stock.obili -= rot; }
  s.stock.obili *= 1 - (0.03 - s.seat.sypka * 0.008);
  // peníze
  const inc = incomeBreakdown(s), exp = expenseBreakdown(s);
  last.inc = inc; last.exp = exp; last.income = r1(sum(Object.values(inc))); last.expense = r1(sum(Object.values(exp)));
  s.money += last.income - last.expense;
  last.trade = s.last.trade || 0;
  if (s.money < 0) {
    const debt = sum(s.debts.map(d => d.amount)), need2 = Math.ceil(-s.money / 50) * 50;
    if (debt + need2 <= maxLoan(s) * 1.5) { s.debts.push({ amount: need2, rate: 0.08, from: s.turn }); s.money += need2; log(s, `Pokladna je prázdná – nucená půjčka ${need2} zl za lichvářský úrok 8 %.`, "hospodarstvi"); }
    else bankruptcy(s);
  }
  // stavby
  for (const q of s.queue) q.left--;
  for (const q of s.queue.filter(x => x.left <= 0)) {
    if (q.where === "seat") s.seat[q.b] = q.lvl; else if (s.provinces[q.where].owner === "hrac") s.provinces[q.where].b[q.b] = q.lvl;
    const B = q.where === "seat" ? SBUILD[q.b] : PBUILD[q.b];
    if (has(s, "gotika")) s.prestige += 2; if (q.where === "seat") s.prestige += 3;
    log(s, `Dokončeno: ${B.n} (úroveň ${q.lvl})${q.where === "seat" ? " v sídle" : " – " + s.provinces[q.where].n}.`, "stavby");
  }
  s.queue = s.queue.filter(x => x.left > 0);
  // výzkum
  const rr = researchRate(s); s.research.pts += rr; last.research = rr;
  if (s.research.cur && s.research.pts >= TECHS[s.research.cur].cost) {
    const t = s.research.cur; s.research.pts -= TECHS[t].cost; s.techs[t] = true; s.prestige += 5;
    if (t === "zakonik") s.legitimacy += 10;
    log(s, `Objev: ${TECHS[t].n}! (${TECHS[t].d})`, "objevy");
    s.research.cur = TECH_IDS.find(x => techAvailable(s, x)) || null;
  }
  if (!s.research.cur) s.research.pts = Math.min(s.research.pts, 50);
  expeditionsTurn(s);
  // válka a soupeři
  warTurn(s); rivalsTurn(s);
  // provincie
  for (const p of myProvs(s)) {
    p.unrest = r1(p.unrest + (unrestTarget(s, p).val - p.unrest) * 0.2);
    p.prosp = r1(p.prosp + (prospTarget(s, p).val - p.prosp) * 0.1);
    const g = p.hunger ? -0.01 : 0.0035 + (p.prosp - 50) * 0.00006 - (p.occ ? 0.01 : 0);
    p.pop = Math.max(500, Math.round(p.pop * (1 + g)));
    if (p.unrest > 75 && !p.occ && chance(s, (p.unrest - 70) / 100) && !s.events.some(e => e.id === "povstani")) s.events.push({ id: "povstani", pid: p.id });
  }
  for (const p of Object.values(s.provinces)) if (p.owner !== "hrac") p.pop = Math.round(p.pop * 1.003);
  updateEstates(s);
  for (const e of ESTATE_IDS) { const E = s.estates[e]; if (E.loy < 25 && chance(s, (25 - E.loy) / 60 * E.infl / 40) && !s.events.some(x => x.id === "krize_" + e)) s.events.push({ id: "krize_" + e }); }
  familyTurn(s);
  // král
  s.liege.opinion = clamp(s.liege.opinion + (55 - s.liege.opinion) * 0.03, 0, 100);
  if (s.realm.title < 3) {
    if (s.season === 2) s.events.push({ id: "kral_berne", amount: Math.round(sum(s.history.slice(-3).map(h => h.income || 0)) * 0.12 + last.income * 0.12) });
    if (s.liege.opinion < 12 && chance(s, 0.2) && !s.flags.punished) s.events.push({ id: "kral_trest" });
  }
  // trh
  for (const g of GOOD_IDS) s.market[g] = clamp(s.market[g] + (1 - s.market[g]) * 0.15 + (rnd(s) - 0.5) * 0.1, 0.6, 1.8);
  s.inflation = r1((s.inflation + [0, 0.008, 0.025][s.laws.mince] * (has(s, "mince") ? 0.6 : 1) - (s.laws.mince === 0 ? Math.max(0, s.inflation - 1) * 0.02 : 0)) * 1000) / 1000;
  // prestiž, zbožnost, legitimita
  s.prestige += s.realm.title * 0.5 + (s.laws.lesy === 1 ? 1 : 0) - Math.max(0, s.prestige - 100) * 0.004;
  s.piety += (s.seat.kaple + sum(myProvs(s).map(p => (p.b.kostel || 0))) * 0.2) * 0.5 - Math.max(0, s.piety - 50) * 0.01;
  const R = ch(s, s.ruler);
  s.legitimacy += (R.age >= 16 ? (s.laws.nastupnictvi === 0 ? 0.8 : 0.4) : -1) + s.seat.donjon * 0.2;
  s.prestige = Math.round(s.prestige * 10) / 10; s.piety = r1(clamp(s.piety, -100, 500)); s.legitimacy = r1(clamp(s.legitimacy, 0, 100)); s.liege.opinion = r1(s.liege.opinion);
  // náhodné události
  rollEvents(s);
  // posun času
  s.turn++; s.season = (s.season + 1) % 4; if (s.season === 0) s.year++;
  s.ap = 2 + (stat(R, "spr") >= 14 ? 1 : 0);
  s.last = last; s.last.trade = 0;
  snapshot(s);
  if (s.year >= END_YEAR && !s.over) s.over = { win: true, txt: `Uplynulo sto let. Rod ${s.dynasty} přečkal věk. Skóre: ${score(s)}.` };
  if (!myProvs(s).length) s.over = { win: false, txt: "Přišel jsi o všechna území. Rod upadl v zapomnění." };
  if (s.over) log(s, s.over.txt, "rod");
  return null;
}
function PBUILD_USES_INPUT(g) { return g === "sukno" || g === "zbrane"; }
function score(s) { return Math.round(s.prestige + myProvs(s).length * 50 + totalPop(s) / 200 + Object.keys(s.techs).length * 20 + s.money / 10 - sum(s.debts.map(d => d.amount)) / 10 + s.legitimacy + s.realm.title * 150); }

function bankruptcy(s) {
  log(s, "BANKROT! Lichváři odmítají půjčovat, vojsko dezertuje, stavy se bouří.", "hospodarstvi");
  for (const a of s.armies) applyLosses(s, a.units, 0.35);
  for (const e of ESTATE_IDS) mod(s, e, -15, 8, "Bankrot");
  s.prestige -= 30; s.legitimacy -= 10;
  const total = sum(s.debts.map(d => d.amount)); s.debts = total ? [{ amount: Math.round(total / 2), rate: 0.06, from: s.turn }] : []; s.money = 0;
}

function expeditionsTurn(s) {
  for (const x of s.expeditions) x.left--;
  for (const x of s.expeditions.filter(e => e.left <= 0)) {
    const E = EXPEDITIONS[x.id], ok = chance(s, E.chance + (has(s, "portolan") ? 0.2 : 0) + cstat(s, "kancler") * 0.005);
    if (!ok) { log(s, `Výprava „${E.n}“ se nevrátila. Zůstaly jen pověsti.`, "objevy"); s.prestige -= 3; continue; }
    s.expDone[x.id] = (s.expDone[x.id] || 0) + 1; s.prestige += 10;
    if (x.id === "hory") { const ps = myProvs(s).filter(p => p.terrain === "hory" || p.terrain === "kopce"); const p = ps.length ? pick(s, ps) : null;
      if (p && !p.res.includes("zelezo")) { p.res.push("zelezo"); log(s, `Výprava našla železnou rudu v provincii ${p.n}!`, "objevy"); }
      else { const g = rint(s, 150, 350); s.money += g; log(s, `Výprava našla stříbrnou žílu – vytěženo ${g} zl.`, "objevy"); } }
    if (x.id === "sever") { s.routes.push({ n: "Severní moře (kožešiny, jantar)", exotic: true }); log(s, "Výprava navázala obchod se severskými kupci – nová obchodní cesta.", "objevy"); }
    if (x.id === "stepi") { s.routes.push({ n: "Hedvábná stezka", exotic: true, good: "hedvabi" }); log(s, "Karavana se vrátila s hedvábím! Otevřena hedvábná stezka.", "objevy"); }
    if (x.id === "levanta") { s.routes.push({ n: "Levantský obchod s kořením", exotic: true, good: "koreni" }); s.piety += 20; log(s, "Lodě přivezly koření a svaté ostatky z Levanty!", "objevy"); }
    if (x.id === "ocean") { s.prestige += 150; s.money += 400; log(s, "Výprava se vrátila ze země za oceánem! Celý svět mluví o tvém rodu.", "objevy"); }
    if (x.id === "knihy") { s.research.pts += 25; log(s, "Učenci z Bologni přinesli opisy knih (+25 učenosti).", "objevy"); }
  }
  s.expeditions = s.expeditions.filter(e => e.left > 0);
}

// ---------- rod ----------
function familyTurn(s) {
  const R = ch(s, s.ruler), sp = ch(s, s.spouse);
  const fam = [R, sp, ...s.children.map(id => ch(s, id))].filter(Boolean);
  if (s.season === 0) for (const c of fam) {
    c.age++;
    if (c.age > 45) c.health -= rint(s, 0, 3); else c.health += rint(s, -1, 2);
    if (c !== R && c !== sp && c.age <= 16 && c.focus) { c[c.focus] += 1; if (chance(s, 0.4)) c[c.focus] += 1; }
    if (c !== R && c !== sp && c.age < 16 && !c.focus) { for (const k of ["dip", "mil", "spr", "uce", "int"]) if (chance(s, 0.3)) c[k]++; }
    if (c.age === 6 && c !== R && c !== sp) s.events.push({ id: "vychova", cid: c.id });
  }
  for (const c of fam) c.health = clamp(c.health + (s.seat.donjon * 0.3) + (has(s, "medicina") ? 0.3 : 0) - 0.2, -10, 100);
  for (const c of s.children.map(id => ch(s, id))) if (c && chance(s, deathChance(c))) { s.children = s.children.filter(x => x !== c.id); s.dead.push({ n: c.name, d: dateStr(s), age: c.age }); log(s, `Zemřel(a) ${c.name} (${c.age} let). Rod truchlí.`, "rod"); }
  if (sp && chance(s, deathChance(sp))) { s.dead.push({ n: sp.name, d: dateStr(s), age: sp.age }); s.spouse = null; log(s, `Zemřela choť ${sp.name}.`, "rod"); s.events.push({ id: "vdovec" }); }
  if (R && R.age >= 16 && sp && sp.age < 42 && s.children.length < 8 && chance(s, 0.07)) {
    const c = newChar(s, { noSurname: true, age: 0, health: rint(s, 40, 90), estate: "rod", traits: [] }); c.name = pick(s, c.sex === "m" ? NAMES_M : NAMES_F); for (const k of ["dip", "mil", "spr", "uce", "int"]) c[k] = rint(s, 1, 4);
    s.children.push(c.id); s.legitimacy += 3; log(s, `Narodil(a) se ${c.sex === "m" ? "syn" : "dcera"} ${c.name}!`, "rod");
  }
  if (R && R.age >= 16 && !s.spouse && s.season === 0 && !s.events.some(e => e.id === "vdovec")) s.events.push({ id: "vdovec" });
  // rádci stárnou a jejich věrnost se mění
  for (const k of COUNCIL_IDS) { const c = councillor(s, k); if (!c) continue; if (s.season === 0) c.age++; c.loyalty = clamp(c.loyalty + (55 + (s.prestige > 150 ? 10 : 0) - (s.money < 0 ? 15 : 0) - c.loyalty) * 0.05 + rint(s, -2, 2), 0, 100);
    if (chance(s, deathChance(c) * 0.7)) { log(s, `Zemřel(a) ${c.name}, ${COUNCIL[k].n}. Úřad je volný.`, "politika"); s.council[k] = null; delete s.chars[c.id]; } }
  if (chance(s, deathChance(R))) succession(s);
}
function heirOf(s) {
  const kids = s.children.map(id => ch(s, id)).filter(c => c && !(c.married && c.sex === "f"));
  if (!kids.length) return null;
  const byAge = kids.slice().sort((a, b) => b.age - a.age);
  if (s.laws.nastupnictvi === 1) { const adults = kids.filter(c => c.age >= 16); const pool = adults.length ? adults : byAge; return pool.slice().sort((a, b) => sum(["dip", "mil", "spr", "uce", "int"].map(k => stat(b, k))) - sum(["dip", "mil", "spr", "uce", "int"].map(k => stat(a, k))))[0]; }
  return byAge.find(c => c.sex === "m") || byAge[0];
}
function succession(s) {
  const R = ch(s, s.ruler); const H = heirOf(s);
  s.dead.push({ n: R.name, d: dateStr(s), age: R.age, ruler: true });
  if (!H) { s.over = { win: false, txt: `${R.name} zemřel(a) bez dědice. Rod ${s.dynasty} vymřel po meči i po přeslici. Skóre: ${score(s)}.` }; return; }
  s.children = s.children.filter(x => x !== H.id);
  for (const a of s.armies) if (a.commander === "ruler") a.commander = null;
  s.ruler = H.id; s.ap = 2;
  if (H.married && H.sex === "m") { const sp = newChar(s, { name: H.spouseName, sex: "f", age: H.age, estate: "rod" }); s.spouse = sp.id; }
  else s.spouse = null;
  // sourozenci zůstávají jako děti rodu
  let txt = `Zemřel ${R.name} (${R.age} let). Vlády se ujímá ${H.name} (${H.age} let).`;
  s.legitimacy = H.sex === "f" ? s.legitimacy * 0.6 : s.legitimacy * 0.8;
  if (H.age < 16) { s.legitimacy -= 10; txt += " Do jeho zletilosti vládne regentská rada."; }
  if (s.laws.nastupnictvi === 1) mod(s, "slechta", 10, 8, "Šlechta zvolila panovníka");
  if (s.laws.nastupnictvi === 2) { s.money = Math.round(s.money * 0.7); s.prestige *= 0.7; txt += " Dědictví bylo rozděleno mezi sourozence."; }
  s.prestige = Math.round(s.prestige * 0.85);
  for (const r of aliveRivals(s)) r.attitude = Math.round(r.attitude * 0.7);
  log(s, txt, "rod"); s.events.push({ id: "_succ", txt });
  if (!s.spouse && H.age >= 16) s.events.push({ id: "vdovec" });
}
