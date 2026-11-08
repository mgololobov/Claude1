// Měsíční tah: hospodářství, kraje, věrnost vazalů, rod a nástupnictví, výzkum, stavy, konec hry.

function endTurn(s) {
  if (s.over && !s.over.cont) return "Hra skončila.";
  if (s.events.length) return "Nejdřív rozhodni o čekajících událostech.";
  const pc = P(s);
  // svěřené kraje hráče spravují purkrabí
  for (const p of clanProvs(s, s.player)) if (p.deleg) for (const c of officersIn(s, p.id)) if (c.acted !== s.turn && !c.army && c.id !== pc.leader) aiDomestic(s, s.player, c, true);
  for (const C of aliveClans(s)) if (!isPlayer(s, C.id)) aiClan(s, C.id);
  armiesTurn(s);
  for (const C of aliveClans(s)) economy(s, C);
  provincesTurn(s);
  officersTurn(s);
  dynastyTurn(s);
  researchTurn(s);
  hreTick(s); popeTick(s);
  if (pc.alive) estatesTurn(s);
  for (const g of Object.keys(s.market)) s.market[g] = clamp(s.market[g] + (1 - s.market[g]) * 0.05 + (rnd(s) - 0.5) * 0.06, 0.5, 2);
  if (pc.laws) s.inflation = r1((s.inflation + [0, 0.002, 0.006][pc.laws.mince] - (pc.laws.mince === 0 ? Math.max(0, s.inflation - 1) * 0.01 : 0)) * 1000) / 1000;
  scripted(s);
  rollEvents(s);
  // posun času
  s.turn++; s.month = (s.month + 1) % 12; if (s.month === 0) s.year++;
  s.flags.harvest = 1;
  snapshot(s);
  checkVictory(s);
  return null;
}

function economy(s, C) {
  const b = clanBudget(s, C.id); C.last = { inc: b.inc, ex: b.ex, net: b.net };
  C.gold += b.net;
  if (C.debts && C.gold < 0) { const need = Math.ceil(-C.gold / 50) * 50; C.debts.push({ amount: need, rate: 0.03 }); C.gold += need; log(s, `Prázdná komora – nucená půjčka ${need} zl za úrok 3 % měsíčně.`, "hospodarstvi", [C.id]); }
  if (C.gold < 0) { // AI: propustí žoldnéře a vazalové reptají
    for (const p of clanProvs(s, C.id)) p.troops.zoldneri = 0; for (const a of s.armies.filter(x => x.cl === C.id)) a.t.zoldneri = 0;
    for (const c of officers(s, C.id)) c.loy -= 2; C.gold = 0;
  }
  // obilí
  if (s.month === 8) { const h = sum(clanProvs(s, C.id).filter(p => !p.siege).map(p => provHarvest(s, p))); C.grain += h; C.last.harvest = Math.round(h); if (isPlayer(s, C.id)) log(s, `Žně: sklizeno ${Math.round(h)} obilí.`, "hospodarstvi", [C.id]); }
  const use = sum(clanProvs(s, C.id).map(garrisonGrain)); C.last.grainUse = r1(use);
  C.grain -= use;
  if (C.grain < 0) { C.grain = 0; for (const p of clanProvs(s, C.id)) { loseMen(p.troops, Math.round(men(p.troops) * 0.06)); p.loy -= 2; } if (isPlayer(s, C.id)) log(s, "Posádkám chybí obilí – muži utíkají.", "hospodarstvi", [C.id]); }
  // zboží
  for (const p of clanProvs(s, C.id)) { if (p.b.hrebcin) C.kone += 5 * p.b.hrebcin; const m = provMines(s, p); if (m.zbroj) C.zbroj += m.zbroj; }
  if (!isPlayer(s, C.id)) { C.kone += 2; C.zbroj += 2; }
  C.prestige = Math.max(0, C.prestige - Math.max(0, C.prestige - 300) * 0.002 + (C.titles.length ? 0.3 : 0));
}

function provincesTurn(s) {
  const pc = P(s);
  for (const p of Object.values(s.provs)) {
    const C = s.clans[p.owner], L = chr(s, p.lord);
    // stavby
    if (p.build && !p.siege) { p.build.left--; if (p.build.left <= 0) { const b = p.build.b; if (b === "hrad") { p.castle++; p.dur = Math.min(durMax(s, p), p.dur + 100); } else p.b[b] = (p.b[b] || 0) + 1; if (b === "mesto") p.pop = r1(p.pop + 2); if (b === "klaster") s.pope.op[p.owner] = (s.pope.op[p.owner] || 0) + 3; if (isPlayer(s, p.owner)) log(s, `Dokončeno: ${BUILD[b].n} v kraji ${p.n}.`, "stavby", [p.owner]); p.build = null; } }
    // spokojenost lidu
    let t = 50 + (L ? st(L, "spr") / 6 : -5) - (C.tax - 2) * 8 + (p.b.klaster || 0) * 4 + (hasTech(s, p.owner, "zakonik") ? 5 : 0) - (s.turn - p.conq < 24 ? 15 : 0) - (C.excom > s.turn ? 10 : 0) - (p.siege ? 20 : 0);
    if (isPlayer(s, p.owner)) t += (pc.estates.sedlaci - 50) / 5 - [0, 4, 10][pc.laws.robota] + 4;
    p.loy = r1(clamp(p.loy + (t - p.loy) * 0.06, 0, 100));
    // obyvatelé
    const g = 0.0009 + (p.loy - 50) * 0.00002 + (hasTech(s, p.owner, "kolonizace") ? 0.0004 : 0) - (p.siege ? 0.004 : 0);
    p.pop = r1(Math.max(2, Math.min(p.v * 18 + (p.b.mesto || 0) * 4, p.pop * (1 + g))));
    // výcvik pomalu klesá, hradby se drolí jen při obléhání
    p.train = Math.max(10, p.train - 0.3);
    if (p.siege) { const a = s.armies.find(x => x.id === p.siege.army); if (!a || a.loc !== p.id) p.siege = null; }
    // vzpoura lidu
    if (p.loy < 15 && !p.siege && chance(s, 0.06)) {
      loseMen(p.troops, Math.round(men(p.troops) * 0.25)); p.loy = 35; p.com = Math.max(0, p.com - 5); p.agri = Math.max(0, p.agri - 5);
      if (isPlayer(s, p.owner) || p.nb.some(n => s.provs[n].owner === s.player)) news(s, `Selské povstání v kraji ${p.n} (${C.house}).`, "povstani", [p.owner]);
    }
  }
}

function officersTurn(s) {
  for (const c of Object.values(s.chars)) {
    if (c.st === "off" && c.cl) {
      const C = s.clans[c.cl]; if (!C) continue;
      c.hp = Math.min(100, c.hp + 1);
      if (c.id === C.leader || c.dyn) { c.loy = 100; continue; }
      const lordOf = Object.values(s.provs).some(p => p.lord === c.id);
      let t = 52 + c.rank * 5 + (lordOf ? 6 : 0) + Math.min(15, C.prestige / 40) - (C.excom > s.turn ? 10 : 0) + sum(c.traits.map(k => (TRAITS[k] && TRAITS[k].loy) || 0)) - Math.max(0, (sum(STAT_IDS.map(k => st(c, k))) / 4 - 50 - c.rank * 8) / 2) + (hasTech(s, c.cl, "zakonik") ? 5 : 0);
      if (isPlayer(s, c.cl)) t += (C.estates.slechta - 50) / 4;
      if (C.gold <= 0) t -= 10;
      c.loy = r1(clamp(c.loy + (t - c.loy) * 0.04, 0, 100));
      if (lordOf) c.merit += 1;
      // nevěrný purkrabí se může vzbouřit
      if (c.loy < 18 && lordOf && chance(s, 0.04)) vassalRevolt(s, c);
      else if (c.loy < 12 && !lordOf && chance(s, 0.05)) { c.st = "wand"; c.cl = null; if (isPlayer(s, C.id)) news(s, `${c.n} opustil tvé služby.`, "vazalove", [C.id]); }
    } else if (c.st === "wand") { if (chance(s, 0.02)) c.loc = pick(s, s.provs[c.loc].nb); }
    else if (c.st === "cap" && chance(s, 0.01 + st(c, "uda") / 3000)) { const home = c.cl && s.clans[c.cl] && s.clans[c.cl].alive ? c.cl : null; if (home) { c.st = "off"; c.loc = s.clans[home].capital; c.capBy = null; news(s, `${c.n} uprchl ze zajetí.`, "vazalove", [home]); } }
  }
}
function vassalRevolt(s, c) {
  const p = Object.values(s.provs).find(q => q.lord === c.id && q.owner === c.cl); if (!p) return;
  const old = c.cl, nb = [...new Set(p.nb.map(n => s.provs[n].owner))].filter(o => o !== old && s.clans[o].alive);
  const to = nb.sort((a, b) => clanPower(s, b) - clanPower(s, a))[0];
  if (to && chance(s, 0.6)) { transferProv(s, p.id, to, "zrada"); c.cl = to; c.loy = 60; c.loc = p.id; p.lord = c.id; news(s, `${c.n}, purkrabí kraje ${p.n}, zradil rod ${s.clans[old].house} a přešel i s krajem k rodu ${s.clans[to].house}!`, "vazalove", [old, to]); if (!atWar(s, old, to)) addRel(s, old, to, -25); }
  else { // vlastní rod
    const id = "r" + s.nextId++;
    s.clans[id] = { id, n: "Panství " + p.n, house: houseName(c.n), t: "pán", type: "dyn", cul: s.clans[old].cul, col: "#888", hre: s.clans[old].hre, aggr: 0.5, alive: true, leader: c.id, capital: p.id, gold: 100, grain: 200, kone: 10, zbroj: 10, prestige: 40, piety: 40, tax: 2, rel: {}, techs: Object.assign({}, s.clans[old].techs), res: { cur: null, pts: 0 }, vassalOf: null, vassalSince: 0, titles: [], excom: 0, last: {}, rebel: true };
    for (const o of aliveClans(s)) { s.clans[id].rel[o.id] = 0; o.rel[id] = 0; } s.pope.op[id] = 0; for (const e of EXT_ELECTORS) s.hre.ext[e.id][id] = 0;
    c.cl = id; c.loy = 100; c.dyn = 1; c.rank = 4;
    transferProv(s, p.id, id, "vzpoura"); p.lord = c.id;
    s.wars.push({ a: id, b: old, start: s.turn }); addRel(s, id, old, -80);
    news(s, `${c.n} se vzbouřil a prohlásil kraj ${p.n} za své panství!`, "vazalove", [old, id]);
  }
}

// ---------- rod ----------
function houseName(n) { const sur = n.split(" ").slice(1).join(" "); if (!sur) return "Rod " + n; if (sur.startsWith("z rodu ")) return "Rod " + sur.slice(7); return "Páni " + sur; }
function dynastyTurn(s) {
  const all = Object.values(s.chars);
  for (const c of all) {
    if (c.st === "dead") continue;
    const a = age(s, c);
    // smrt
    let pd = a < 5 ? 0.012 : a < 16 ? 0.002 : a < 40 ? 0.0015 : a < 55 ? 0.004 : a < 65 ? 0.01 : a < 75 ? 0.022 : 0.045;
    if (c.hp < 30) pd *= 3; if (c.traits.includes("nemocny")) pd *= 1.6; if (c.cl && hasTechSafe(s, c.cl, "medicina")) pd *= 0.8;
    if (chance(s, pd)) { const wasLeader = c.cl && s.clans[c.cl] && s.clans[c.cl].leader === c.id; kill(s, c, "zemřel"); if (c.spouse && chr(s, c.spouse)) chr(s, c.spouse).spouse = null;
      if (c.cl && (isPlayer(s, c.cl) && (c.dyn || c.rank >= 2)) || wasLeader && c.cl && rel(s, s.player, c.cl) > -200 && (c.hist || s.clans[c.cl].t === "král")) news(s, `Zemřel(a) ${c.n} (${a} let)${wasLeader ? ", hlava rodu " + (s.clans[c.cl] ? s.clans[c.cl].house : "") : ""}.`, "rod", [c.cl]);
      continue; }
    // dospělost
    if (c.st === "kid" && a >= 15) {
      if (c.sex === "m" && !c.c) { c.st = "off"; c.rank = 2; c.loy = 100; c.merit = RANKS[2].merit; if (!c.ved || c.ved < 5) { for (const k of STAT_IDS) c[k] = rint(s, 25, 75); } if (isPlayer(s, c.cl)) news(s, `${c.n} dospěl a vstupuje do služby rodu.`, "rod", [c.cl]); }
      else c.st = "fam";
    }
    // výchova dětí (rozvoj schopností)
    if (c.st === "kid" && s.month === 0 && c.focus) c[c.focus] = Math.min(95, (c[c.focus] || 20) + rint(s, 2, 5));
    // narození
    if (c.sex === "f" && c.spouse && a >= 15 && a <= 42 && (c.st === "fam" || c.st === "off")) {
      const h = chr(s, c.spouse); if (h && h.st !== "dead" && h.st !== "cap" && chance(s, 0.011)) {
        const sex = chance(s, 0.5) ? "m" : "f", C = s.clans[h.cl]; if (!C) continue;
        const kid = makeChar(s, { n: pick(s, sex === "m" ? SONS[C.cul] : FEMALE[C.cul]) + " (" + C.house.split(" (")[0] + ")", sex, by: s.year, cl: h.cl, st: "kid", dyn: 1, father: h.id, mother: c.id, loc: C.capital, ved: rint(s, 10, 30), uda: rint(s, 10, 30), roz: rint(s, 10, 30), spr: rint(s, 10, 30) });
        h.kids.push(kid.id); if (isPlayer(s, h.cl)) news(s, `Narodil(a) se ${sex === "m" ? "syn" : "dcera"} ${kid.n}.`, "rod", [h.cl]);
      }
    }
  }
}
function heirsOf(s, cid) {
  const C = s.clans[cid], L = chr(s, C.leader);
  const fam = Object.values(s.chars).filter(c => c.cl === cid && c.dyn && !c.c && c.st !== "dead" && c.st !== "fam" && c.sex === "m" && c.id !== C.leader);
  const sons = fam.filter(c => L && c.father === L.id).sort((a, b) => a.by - b.by);
  const others = fam.filter(c => !sons.includes(c)).sort((a, b) => a.by - b.by);
  let list = sons.concat(others);
  if (C.laws && C.laws.nastupnictvi === 1) list = list.slice().sort((a, b) => sum(STAT_IDS.map(k => st(b, k))) - sum(STAT_IDS.map(k => st(a, k))));
  return list;
}
function heirSucceeds(s, cid, why) {
  const C = s.clans[cid]; if (!C || !C.alive) return;
  const old = chr(s, C.leader);
  if (C.type !== "dyn") { // církev a řád volí nového představeného
    const cands = officers(s, cid).filter(c => c.id !== C.leader && c.st === "off");
    let nw = cands.sort((a, b) => st(b, "roz") + st(b, "spr") - st(a, "roz") - st(a, "spr"))[0];
    if (!nw) nw = genOfficer(s, cid, C.cul, C.capital, { rank: 4 });
    nw.c = 1; nw.rank = 4; nw.loy = 100; C.leader = nw.id;
    if (isPlayer(s, cid) || rel(s, s.player, cid) !== undefined) news(s, `${C.n}: novým představeným (${C.t}) zvolen ${nw.n}.`, "rod", [cid]);
    return;
  }
  const hs = heirsOf(s, cid);
  if (hs.length) {
    const H = hs[0]; C.leader = H.id; H.loy = 100; H.rank = 4; if (H.st === "cap") { /* vládce v zajetí */ }
    C.prestige = Math.round(C.prestige * 0.85);
    if (s.hre.kingClan === cid) {/* řeší hreTick */}
    for (const o of officers(s, cid)) o.loy -= H.st === "kid" ? 10 : 4;
    // dělení údělů (jen hráč se zákonem)
    if (C.laws && C.laws.nastupnictvi === 2 && hs.length > 1) appanage(s, cid, hs[1]);
    const txt = `${old ? old.n : "Vládce"} ${why === "padl v bitvě" ? "padl v bitvě" : why === "poprava" ? "byl popraven" : "zemřel"}. Vlády se ujímá ${H.n} (${age(s, H)} let)${H.st === "kid" ? " – za něj zatím vládne poručnická rada" : ""}.`;
    news(s, `${C.house}: ${txt}`, "rod", [cid]);
    if (isPlayer(s, cid)) s.events.push({ id: "_succ", txt });
    if (H.st === "kid") { H.st = "off"; H.minor = true; }
    return;
  }
  // rod vymřel – dědictví přes sňatky
  const kin = aliveClans(s).filter(o => o.id !== cid && married(s, o.id, cid) && o.type === "dyn").sort((a, b) => rel(s, cid, b.id) - rel(s, cid, a.id));
  if (kin.length && !(isPlayer(s, cid) && officers(s, cid).length)) {
    const H = kin[0]; news(s, `Rod ${C.house} vymřel po meči. Dědictví připadá spřízněnému rodu ${H.house}!`, "rod", [cid, H.id]);
    if (isPlayer(s, cid)) { s.over = { win: false, txt: `Tvůj rod vymřel. Země zdědil rod ${H.house}.` }; }
    annex(s, cid, H.id); return;
  }
  const strongest = officers(s, cid).sort((a, b) => b.rank - a.rank || b.merit - a.merit)[0];
  if (strongest) {
    C.house = houseName(strongest.n); C.leader = strongest.id; strongest.dyn = 1; strongest.loy = 100; strongest.rank = 4;
    news(s, `Starý rod vymřel; vlády nad zemí ${C.n} se chopil ${strongest.n}.`, "rod", [cid]);
    if (isPlayer(s, cid)) s.events.push({ id: "_succ", txt: `Tvůj rod vymřel. Moc nad zemí převzal ${strongest.n} – hraješ dál za nový rod.` });
    return;
  }
  clanDestroyed(s, cid, null);
}
function appanage(s, cid, son) {
  const ps = clanProvs(s, cid).filter(p => p.id !== s.clans[cid].capital).sort((a, b) => a.v - b.v);
  if (ps.length < 3) return;
  const take = ps.slice(0, Math.max(1, Math.floor(ps.length / 4)));
  const id = "u" + s.nextId++, C = s.clans[cid];
  s.clans[id] = { id, n: "Úděl " + take[0].n, house: C.house + " (údělní)", t: "kníže", type: "dyn", cul: C.cul, col: "#999", hre: C.hre, aggr: 0.3, alive: true, leader: son.id, capital: take[0].id, gold: 100, grain: 150, kone: 10, zbroj: 10, prestige: 60, piety: 50, tax: 2, rel: {}, techs: Object.assign({}, C.techs), res: { cur: null, pts: 0 }, vassalOf: cid, vassalSince: s.turn, titles: [], excom: 0, last: {} };
  for (const o of aliveClans(s)) { s.clans[id].rel[o.id] = o.id === cid ? 60 : 0; o.rel[id] = o.id === cid ? 60 : 0; } s.pope.op[id] = 20; for (const e of EXT_ELECTORS) s.hre.ext[e.id][id] = 0;
  son.cl = id; son.loc = take[0].id; son.rank = 4;
  for (const p of take) transferProv(s, p.id, id, "úděl");
  news(s, `${son.n} obdržel úděl (${take.map(p => p.n).join(", ")}) jako vazal hlavní linie.`, "rod", [cid, id]);
}

// ---------- učenost ----------
function researchTurn(s) {
  for (const C of aliveClans(s)) {
    if (!isPlayer(s, C.id)) { C.res.pts += clanProvs(s, C.id).length * 0.35 + rnd(s); if (!C.res.cur || C.techs[C.res.cur]) C.res.cur = TECH_IDS.find(t => techAvail(s, C.id, t)) || null; }
    C.res.pts += sum(clanProvs(s, C.id).map(p => (p.b.klaster || 0) * 0.4));
    const t = C.res.cur; if (t && C.res.pts >= TECHS[t].cost) { C.res.pts -= TECHS[t].cost; C.techs[t] = true; if (t === "gotika") for (const p of clanProvs(s, C.id)) p.dur = Math.min(durMax(s, p), p.dur); if (isPlayer(s, C.id)) { log(s, `Objev: ${TECHS[t].n}! (${TECHS[t].d})`, "objevy", [C.id]); C.res.cur = TECH_IDS.find(x => techAvail(s, C.id, x)) || null; } else C.res.cur = null; }
  }
}

// ---------- stavy (hráč) ----------
function estatesTurn(s) {
  const C = P(s);
  for (const e of ESTATE_IDS) { const t = estateTarget(s, e).val; C.estates[e] = r1(C.estates[e] + (t - C.estates[e]) * 0.08); }
  C.mods = C.mods.filter(m => m.until > s.turn);
  for (const e of ESTATE_IDS) if (C.estates[e] < 25 && chance(s, (25 - C.estates[e]) / 150) && !s.events.some(x => x.id === "krize_" + e)) s.events.push({ id: "krize_" + e });
}

function scripted(s) {
  if (s.turn === 0) news(s, "Ludvík II. Bavorský dal v Donauwörthu popravit svou manželku Marii Brabantskou pro domnělou nevěru. Pověst „Přísného“ ho bude provázet.", "svet");
  if (s.year === 1259 && s.month === 11) { for (const id of ["sandomer", "krakov", "lublin"]) { const p = s.provs[id]; p.pop = r1(p.pop * 0.8); loseMen(p.troops, Math.round(men(p.troops) * 0.35)); p.loy -= 10; } news(s, "Tataři Zlaté hordy pod Burundajem vpadli do Malopolska a vypálili Sandoměř a okolí Krakova.", "svet"); }
}
function checkVictory(s) {
  const total = Object.keys(s.provs).length, mine = realmProvs(s, s.player);
  if (!s.flags.won && mine >= Math.ceil(total * 0.5)) { s.flags.won = true; s.over = { win: true, cont: true, txt: `Ovládáš ${mine} z ${total} krajů střední Evropy (sám nebo skrze vazaly). Tvůj rod se stal nejmocnějším v Evropě!` }; news(s, s.over.txt, "rod", [s.player]); }
  if (!s.flags.wonEmp && s.hre.emperor && s.hre.kingClan === s.player && mine >= Math.ceil(total * 0.3)) { s.flags.wonEmp = true; s.over = { win: true, cont: true, txt: "Jsi císařem Svaté říše římské a vládneš třetině střední Evropy. Vítězství!" }; }
  if (s.year >= 1400 && !s.flags.end) { s.flags.end = true; s.over = { win: true, cont: true, txt: `Rok 1400 – konec hry. Tvůj rod drží ${mine} krajů.` }; }
}
