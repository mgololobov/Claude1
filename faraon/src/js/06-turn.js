// Běh měsíce: život a smrt, nástupnictví, věrnost, události, umělá inteligence, konec měsíce.

// ---------- život, smrt, nástupnictví ----------
function die(s, c, why) {
  if (c.st === "dead") return; const wasLeader = c.cl && s.clans[c.cl] && s.clans[c.cl].leader === c.id;
  c.st = "dead"; c.died = `${why || "zemřel"} (≈ ${s.bce} př. n. l.)`;
  for (const p of Object.values(s.provs)) if (p.lord === c.id) p.lord = null;
  if (c.spouse && s.chars[c.spouse]) s.chars[c.spouse].spouse = null;
  if (c.cl && s.clans[c.cl]) { const C = s.clans[c.cl]; for (const k in C.offices) if (C.offices[k] === c.id) C.offices[k] = null; }
  for (const a of s.armies) a.cmds = a.cmds.filter(id => id !== c.id); c.army = null;
  if (c.cl && (c.dyn || c.hist) && (isPlayer(s, c.cl) || wasLeader)) log(s, `${c.n} ${why || "zemřel"}${age(s, c) ? " ve věku " + age(s, c) + " let" : ""}.`, "rod", [c.cl]);
  if (wasLeader) succession(s, c.cl, c);
  else if (c.cl && s.clans[c.cl]) assignLords(s, c.cl);
}
function heirsOf(s, cid) {
  const C = s.clans[cid], L = leaderOf(s, cid); if (!C) return [];
  const dyn = Object.values(s.chars).filter(c => c.cl === cid && c.dyn && c.st !== "dead" && c.st !== "cap" && (!L || c.id !== L.id));
  const males = dyn.filter(c => c.sex === "m"), byAge = (a, b) => a.by === b.by ? 0 : b.by - a.by;
  let order;
  if (C.laws.nastupnictvi === 2) order = males.filter(c => age(s, c) >= 15).sort((a, b) => sum(STAT_IDS.map(k => st(b, k))) - sum(STAT_IDS.map(k => st(a, k)))).concat(males.filter(c => age(s, c) < 15).sort(byAge));
  else { const sons = L ? males.filter(c => c.father === L.id).sort(byAge) : [], adult = c => age(s, c) >= 15, rest = males.filter(c => !sons.includes(c)).sort(byAge);
    // dospělý syn, pak dospělý bratr či jiný muž rodu (jako Kamose po Sekenenreovi), teprve potom dítě
    order = sons.filter(adult).concat(rest.filter(adult), sons.filter(c => !adult(c)), rest.filter(c => !adult(c))); }
  const women = dyn.filter(c => c.sex === "f" && age(s, c) >= 15 && (!L || c.id !== L.spouse)).sort(byAge);
  return order.concat(women);
}
function succession(s, cid, old) {
  const C = s.clans[cid]; if (!C.alive) return;
  const H = heirsOf(s, cid);
  let h = H[0];
  if (!h) {
    h = officers(s, cid).filter(c => !c.army).sort((a, b) => sum(STAT_IDS.map(k => st(b, k))) - sum(STAT_IDS.map(k => st(a, k))))[0];
    if (!h) { if (isPlayer(s, cid)) s.over = { win: false, txt: `${old ? old.n + " zemřel" : "Panovník zemřel"} bez dědice a nikdo z úředníků nemůže převzít vládu. Říše se rozpadá.` }; clanDies(s, cid); return; }
    h.dyn = 1; C.maat = Math.max(0, C.maat - 10); for (const c of officers(s, cid)) if (c !== h) c.loy = Math.max(0, c.loy - 10);
    log(s, `${C.n}: rod ${C.house} vymřel. Vládu přebírá úředník ${h.n} a zakládá novou dynastii (tak jako kdysi vezír Amenemhat I.). Maat −10.`, "rod", [cid]);
  }
  const coreg = C.laws.nastupnictvi === 1 && age(s, h) >= 15;
  C.leader = h.id; if (h.st !== "kid") h.st = "off"; h.rank = 4; h.loy = 100; h.dyn = 1; h.loc = C.capital || h.loc; h.merit = Math.max(h.merit, 800);
  const queen = h.sex === "f", child = age(s, h) < 15;
  const tombOk = C.tomb.stage >= 3, tombBad = C.tomb.stage <= 1;
  C.maat = clamp(C.maat + (tombOk ? 5 : tombBad ? -6 : 0) - (coreg ? 0 : 4) - (queen ? 8 : 0) - (child ? 3 : 0), 0, 100);
  for (const c of officers(s, cid)) if (!c.dyn) c.loy = Math.max(0, c.loy - (coreg ? 2 : 8) - (C.laws.nastupnictvi === 2 ? -3 : 0));
  C.reign = s.turn; C.tomb = { stage: 0, left: 0, active: false }; C.hebsed = 0;
  log(s, `${C.n}: na trůn nastupuje ${h.n}${queen ? " – žena na trůnu je vzácnost (jako kdysi Sobekneferu)" : ""}${child ? " – zatím dítě, vládne poručnická rada" : ""}${coreg ? " (hladce, po letech spoluvlády)" : ""}. ${old ? (tombOk ? "Zesnulý byl pohřben v dokončené hrobce." : tombBad ? "Zesnulý neměl hotovou hrobku – pohřeb byl nouzový." : "") : ""}`, "rod", [cid]);
  if (isPlayer(s, cid)) queueEvent(s, "pohreb", { old: old ? old.n : "" });
  assignLords(s, cid);
}
function yearLife(s) {
  const med = cid => (hasTech(s, cid, "lekarstvi") ? 0.78 : 1);
  for (const c of Object.values(s.chars)) {
    if (c.st === "dead") continue; const a = age(s, c);
    let p = a < 5 ? 0.06 : a < 15 ? 0.015 : a < 35 ? 0.015 : a < 45 ? 0.025 : a < 55 ? 0.05 : a < 65 ? 0.09 : a < 75 ? 0.16 : 0.28;
    if (c.traits.includes("nemocny")) p *= 1.6; if (c.cl) p *= med(c.cl);
    if (c.st === "cap") p *= 1.5;
    if (chance(s, p)) { die(s, c, a < 15 ? "zemřel v dětském věku" : a > 60 ? "zemřel stářím" : pick(s, ["zemřel na horečku", "zemřel po krátké nemoci", "zemřel na nákazu", "zemřel po pádu z vozu", "zemřel na zánět"])); continue; }
    if (c.st === "kid" && a >= 15) {
      const C = s.clans[c.cl];
      if (c.sex === "m") { c.st = "off"; c.rank = 2; c.loy = 95; for (const k of STAT_IDS) c[k] = clamp((c[k] || rint(s, 25, 60)) + rint(s, 5, 20) + (c.focus === k ? 15 : 0), 1, 95); c.merit = RANKS[2].merit; if (C && C.leader === c.id) c.rank = 4; if (isPlayer(s, c.cl)) log(s, `${c.n} dospěl a vstupuje do služby rodu.`, "rod", [c.cl]); }
      else { c.st = c.cl && s.clans[c.cl] && s.clans[c.cl].leader === c.id ? "off" : "fam"; }
    }
    if (c.wound > 0) c.wound--;
  }
  // narození
  for (const w of Object.values(s.chars)) {
    if (w.st === "dead" || w.sex !== "f" || !w.spouse || !w.dyn) continue; const h = chr(s, w.spouse); if (!h || h.st === "dead" || h.st === "cap") continue;
    const a = age(s, w); if (a < 16 || a > 40) continue;
    if (chance(s, 0.28)) {
      const C = s.clans[h.cl]; if (!C || !C.alive) continue; const sx = chance(s, 0.5) ? "m" : "f";
      const used = new Set(Object.values(s.chars).filter(x => x.cl === h.cl && x.st !== "dead").map(x => x.n));
      let nm = sx === "m" ? pick(s, SON_NAMES[C.cul] || SON_NAMES.eg) : pick(s, (NAMES[C.cul] || NAMES.eg).f); if (used.has(nm)) nm += " mladší";
      const k = makeChar(s, { n: nm, sex: sx, by: s.bce, cl: h.cl, st: "kid", loc: C.capital, dyn: 1, father: h.id }); for (const kk of STAT_IDS) k[kk] = clamp(Math.round((st(h, kk) + rint(s, 20, 70)) / 2), 5, 90);
      if (chance(s, 0.12)) k.traits.push(pick(s, TRAIT_IDS)); h.kids.push(k.id);
      if (isPlayer(s, h.cl)) log(s, `${w.n} porodila ${sx === "m" ? "syna" : "dceru"} jménem ${nm}.`, "rod", [h.cl]);
    }
  }
  // umělá inteligence: svatby panovníků a dědiců s dcerami místních hodnostářů
  for (const C of aliveClans(s)) {
    if (isPlayer(s, C.id) || C.type === "kmen") continue;
    for (const m of Object.values(s.chars).filter(c => c.cl === C.id && c.dyn && c.sex === "m" && !c.spouse && c.st === "off" && age(s, c) >= 17 && age(s, c) < 50)) if (chance(s, 0.4)) { const w = makeChar(s, { n: genName(s, C.cul, "f"), sex: "f", by: m.by + rint(s, -2, 10), cl: C.id, st: "fam", loc: C.capital, dyn: 1 }); w.spouse = m.id; m.spouse = w.id; }
  }
}

// ---------- věrnost ----------
function offLoyTarget(s, c) {
  const C = s.clans[c.cl]; if (!C) return 50;
  if (c.id === C.leader) return 100;
  let t = 50 + c.rank * 4 + (C.maat - 50) / 3 + Math.min(15, C.prestige / 60) + (c.dyn ? 35 : 0);
  for (const k of c.traits) t += (TRAITS[k] && TRAITS[k].loy) || 0;
  if (Object.values(C.offices || {}).includes(c.id)) t += 8;
  t += [10, 0, -12][C.laws.nomarchove] + (hasTech(s, c.cl, "vezir") ? 5 : 0) + officeVal(s, c.cl, "vezir") / 12;
  if (isPlayer(s, c.cl) && C.estates) t += (C.estates.nomarchove - 50) / 5;
  if (C.deben < 0 || C.grain < 0) t -= 15;
  return clamp(t, 0, 100);
}
function provLoyTarget(s, p) {
  const C = s.clans[p.owner]; if (!C) return 50;
  let t = 50 + (C.maat - 50) / 3 + (p.b.chram || 0) * 4 + (hasTech(s, p.owner, "texty") ? 5 : 0) + [6, 0, -8][C.laws.robota] + [12, 8, 0, -8, -18][C.tax != null ? C.tax : 2];
  t -= p.hunger * 60; if (s.turn - p.conq < 24) t -= 20 * (1 - (s.turn - p.conq) / 24);
  if (isPlayer(s, p.owner) && C.estates) t += (C.estates.lid - 50) / 5;
  const L = chr(s, p.lord); t += L ? st(L, "spr") / 10 - 5 : -6;
  if (C.type === "kmen") t = 65;
  return clamp(t, 0, 100);
}
function loyaltyTick(s) {
  for (const c of Object.values(s.chars)) {
    if (c.st !== "off" || !c.cl) continue;
    c.loy = clamp(c.loy + (offLoyTarget(s, c) - c.loy) * 0.1 + rrange(s, -2, 2), 0, 100);
    if (!c.dyn && c.loy < 22 && !c.army && chance(s, (22 - c.loy) / 80)) {
      const lordOf = Object.values(s.provs).find(q => q.lord === c.id && q.owner === c.cl);
      let to = c.tempt && s.clans[c.tempt] && s.clans[c.tempt].alive ? c.tempt : null;
      if (!to && lordOf) { const cands = lordOf.nb.map(n => s.provs[n].owner).filter(o => o !== c.cl && !isKmen(s, o)); if (cands.length) to = cands.sort((a, b) => rel(s, c.cl, a) - rel(s, c.cl, b))[0]; }
      if (to && tryDefect(s, c, to)) continue;
      const old = c.cl; c.st = "wand"; c.cl = null; for (const p of Object.values(s.provs)) if (p.lord === c.id) p.lord = null;
      if (isPlayer(s, old)) log(s, `${c.n} z nespokojenosti opustil tvé služby.`, "intriky", [old]); assignLords(s, old);
    }
  }
  for (const p of Object.values(s.provs)) {
    p.loy = clamp(p.loy + (provLoyTarget(s, p) - p.loy) * 0.15, 0, 100);
    p.hunger = Math.max(0, p.hunger - 0.03);
    if (p.loy < 14 && !isKmen(s, p.owner) && chance(s, 0.12) && p.unrest < s.turn) {
      p.unrest = s.turn + 3; lossApply(p.troops, men(p.troops) * 0.15);
      if (isPlayer(s, p.owner)) queueEvent(s, "nepokoje", { pid: p.id }); else p.loy += 10;
      log(s, `V župě ${p.n} se bouří lid (spokojenost ${Math.round(p.loy)}).`, "zupy", [p.owner]);
    }
  }
}

// ---------- hospodářství měsíce ----------
function economyTick(s) {
  for (const C of aliveClans(s)) {
    const b = clanBudget(s, C.id);
    C.deben += b.net; C.grain += b.gnet; C.last.net = b.net; C.last.gnet = b.gnet;
    if (hasTech(s, C.id, "vuz")) C.kone += sum(clanProvs(s, C.id).filter(p => p.ter === "delta").map(p => p.v * (hasTech(s, C.id, "dobytek") ? 4 : 2)));
    if (C.grain < 0) { // hlad ve vojsku: dezerce
      for (const p of clanProvs(s, C.id)) lossApply(p.troops, men(p.troops) * 0.08);
      for (const a of s.armies.filter(x => x.cl === C.id)) lossApply(a.t, men(a.t) * 0.1);
      if (isPlayer(s, C.id)) log(s, `Sýpky jsou prázdné! Vojáci bez přídělů dezertují.`, "hospodarstvi", [C.id]);
      C.grain = 0;
    }
    if (C.deben < 0) { C.maat = Math.max(0, C.maat - 0.5); for (const p of clanProvs(s, C.id)) if (p.troops.medzajove) p.troops.medzajove = Math.round(p.troops.medzajove * 0.85); }
    // výcvik velitelem vojska
    const vt = officeVal(s, C.id, "vojsko"); if (vt) for (const p of clanProvs(s, C.id)) if (p.train < 70) p.train = Math.min(70, p.train + vt / 40);
    const kv = officeVal(s, C.id, "knez"); if (kv) { C.maat = Math.min(100, C.maat + kv / 400); if (C.estates) C.estates.knezi = Math.min(100, C.estates.knezi + kv / 300); }
    if (hasTech(s, C.id, "texty")) C.maat = Math.min(100, C.maat + 0.05);
    // výzkum z chrámů
    C.res.pts += sum(clanProvs(s, C.id).map(p => (p.b.chram || 0) * 0.6)) * researchMult(s, C.id);
    researchTick(s, C.id); tombTick(s, C.id);
    C.prestige = Math.max(0, C.prestige * 0.996);
    C.maat = clamp(C.maat + (50 - C.maat) * 0.02, 0, 100);
    // kmeny doplňují bojovníky
    if (C.type === "kmen") for (const p of clanProvs(s, C.id)) { const cap_ = troopCap(p) * 0.9 + 300; if (men(p.troops) < cap_) { p.troops.lucistnici = (p.troops.lucistnici || 0) + 30; p.troops.kopinici = (p.troops.kopinici || 0) + 20; } }
  }
  // stavby
  for (const p of Object.values(s.provs)) {
    if (!p.build || p.siege) continue; const C = s.clans[p.owner];
    p.build.left -= (s.month < 4 ? 1.5 : 1) * (C.laws.robota === 2 ? 1.25 : C.laws.robota === 0 ? 0.85 : 1);
    if (p.build.left <= 0) { const b = p.build.b; if (b === "pevnost") { p.castle++; p.dur = durMax(s, p); } else p.b[b] = (p.b[b] || 0) + 1; if (b === "chram") C.maat = Math.min(100, C.maat + 3); C.prestige += 5; if (isPlayer(s, p.owner)) log(s, `Dokončena stavba v župě ${p.n}: ${BUILD[b].n} (úroveň ${buildLevel(p, b)}).`, "stavby", [p.owner]); p.build = null; }
  }
  // obecní zásoby se pomalu kazí
  for (const p of Object.values(s.provs)) p.stock = Math.round(p.stock * (1 - Math.max(0.004, 0.012 - (p.b.sypka || 0) * 0.003)));
  // přesuny úředníků, návraty z výprav
  for (const c of Object.values(s.chars)) {
    if (c.moving && c.moving.at <= s.turn) { const t = s.provs[c.moving.to]; c.moving = null; if (t && t.owner === c.cl) c.loc = t.id; if (c.cl) assignLords(s, c.cl); }
    if (c.away && c.away.until <= s.turn && c.st === "off") expeditionReturn(s, c);
  }
}
function floodTick(s) {
  const h = s.flood.next; s.flood.h = h; s.flood.hist.push({ y: s.bce, h }); if (s.flood.hist.length > 80) s.flood.hist.shift();
  log(s, `Nilometr: záplava dosáhla ${String(h).replace(".", ",")} loktů – ${floodWord(h)}.`, "nil");
  s.market.p = r1(clamp(2 / Math.pow(floodFactor(h), 1.4) * rrange(s, 0.9, 1.1), 1, 9));
  if (h >= 18) for (const p of Object.values(s.provs)) if (TERRAIN[p.ter].nile) { p.agri = Math.max(10, p.agri - rint(s, 2, 5)); p.dur = Math.max(0, p.dur - 20); p.pop = r1(p.pop * 0.99); }
  if (P(s) && P(s).alive) { if (h < 13.5) queueEvent(s, "nizka", { h }); else if (h >= 18) queueEvent(s, "vysoka", { h }); }
}
function harvestTick(s) {
  const hungry = {};
  for (const p of Object.values(s.provs)) {
    const C = s.clans[p.owner]; if (!C) continue;
    const H = provHarvest(s, p), food = provFood(s, p), tax = C.type === "kmen" ? 0 : provTax(s, p);
    C.grain += tax;
    const left = food - tax - provNeed(p);
    if (left >= 0) { p.stock = Math.min(Math.round(p.pop * 1000 * (1.5 + (p.b.sypka || 0) * 0.7)), p.stock + Math.round(left * 0.6)); p.hunger = Math.max(0, p.hunger - 0.2); p.pop = r1(p.pop * (p.loy > 35 ? 1.015 : 1.005)); }
    else {
      const def = -left, fromStock = Math.min(p.stock, def); p.stock -= fromStock; const rest = def - fromStock;
      if (rest >= 1) { let d = rest / provNeed(p); if (hasTech(s, p.owner, "nilometr")) d *= 0.67; p.hunger = clamp(p.hunger + d * 1.5, 0, 1); p.pop = r1(Math.max(0.5, p.pop * (1 - d * 0.22))); p.loy = Math.max(0, p.loy - d * 50); (hungry[p.owner] = hungry[p.owner] || []).push([p.id, Math.round(rest)]); }
    }
    p._lastH = Math.round(H); p._lastTax = Math.round(tax);
  }
  for (const [cid, list] of Object.entries(hungry)) {
    if (isPlayer(s, cid)) queueEvent(s, "hlad", { list });
    else { const C = s.clans[cid]; for (const [pid, d] of list) { if (C.grain > d * 2) { C.grain -= d; s.provs[pid].stock += d; s.provs[pid].loy += 8; } } }
    log(s, `${clanName(s, cid)}: hlad v župách ${list.map(([id]) => s.provs[id].n).join(", ")}.`, "nil", [cid]);
  }
  // sklady se kazí, úroda se přičte
  for (const C of aliveClans(s)) { C.last.harvest = s.turn; }
}

// ---------- události ----------
function queueEvent(s, k, data) { if (!EVENTS[k]) return; s.events.push({ k, data: data || {}, t: s.turn }); }
function eventView(s, ev) { return EVENTS[ev.k].view(s, ev.data); }
function resolveEvent(s, i) { const ev = s.events[0]; if (!ev) return; const v = eventView(s, ev); const ch = v.ch[i]; if (!ch) return; s.events.shift(); const r = ch.f ? ch.f() : null; if (r) log(s, r, "udalosti", [s.player]); }
const someOwnProv = (s, f) => { const L = clanProvs(s, s.player).filter(f || (() => true)); return L.length ? pick(s, L) : null; };
const EVENTS = {
  nizka: { view: (s, d) => { const C = P(s), g = Math.round(sum(clanProvs(s, s.player).map(p => p.pop * 1000 * 0.5))); return { t: "Nízká záplava", tx: `Nilometr ukazuje jen ${String(d.h).replace(".", ",")} loktů. Podle pravidla, které zapsal ještě v římské době Plinius Starší, znamená dvanáct loktů hlad a třináct nouzi. Pole na okrajích údolí zůstanou suchá a sklizeň v období šemu bude slabá.`,
    ch: [{ t: `Otevřít královské sýpky (${fmtN(g)} charů do obecních zásob)`, d: "chrání před hladem, lid ocení péči", f: () => { if (C.grain < g) return "V sýpkách tolik obilí není."; C.grain -= g; for (const p of clanProvs(s, s.player)) { p.stock += Math.round(p.pop * 500); p.loy = Math.min(100, p.loy + 5); } C.estates.lid = Math.min(100, C.estates.lid + 5); C.maat = Math.min(100, C.maat + 2); return "Královské sýpky byly otevřeny."; } },
      { t: "Obětiny Hapimu, bohu záplavy (1 500 debenů)", d: "maat +3, kněží spokojeni", f: () => { if (!pay(s, s.player, 1500)) return "Nedostatek debenů."; C.maat = Math.min(100, C.maat + 3); C.estates.knezi = Math.min(100, C.estates.knezi + 4); return "Kněží obětovali Hapimu."; } },
      { t: "Spoléhat na obecní zásoby", d: "nic neplatíš", f: () => null }] }; } },
  vysoka: { view: (s, d) => { const C = P(s); return { t: "Ničivá záplava", tx: `Voda vystoupila na ${String(d.h).replace(".", ",")} loktů. Strhla hráze, zaplavila vesnice na pahorcích a rozmáčela cihlové hradby.`,
    ch: [{ t: "Opravit hráze robotou (2 000 debenů, 8 000 charů)", d: "vrátí ztracenou ornou půdu", f: () => { if (!pay(s, s.player, 2000, 8000)) return "Nedostatek prostředků."; for (const p of clanProvs(s, s.player)) if (TERRAIN[p.ter].nile) p.agri = Math.min(agriCap(s, p), p.agri + 3); return "Hráze byly opraveny."; } },
      { t: "Nechat to na župách", d: "ztráty zůstanou", f: () => null }] }; } },
  hlad: { view: (s, d) => { const C = P(s), tot = sum(d.list.map(x => x[1])), names = d.list.map(([id]) => s.provs[id].n).join(", ");
    return { t: "Hlad v župách", tx: `Sklizeň nestačí: v župách ${names} chybí asi ${fmtN(tot)} charů obilí. Lidé jedí semena a opouštějí vesnice.${s.scen === "fip" ? " Nomarcha Anchtifi z Moally se ve své hrobce chlubil, že za velkého hladu živil nejen svou župu, ale i sousední – zatímco „celý Horní Egypt umíral hladem“." : ""}`,
    ch: [{ t: `Nasytit je ze státních sýpek (${fmtN(tot)} charů)`, d: "spokojenost +, maat +, sláva +", f: () => { const g = Math.max(0, Math.min(C.grain, tot)); C.grain -= g; for (const [id, x] of d.list) { const p = s.provs[id]; p.stock += tot > 0 ? Math.round(x * g / tot) : 0; p.loy = Math.min(100, p.loy + 12); p.hunger = Math.max(0, p.hunger - 0.4); } C.maat = Math.min(100, C.maat + 3); C.prestige += 15; C.estates.lid = Math.min(100, C.estates.lid + 6); return g < tot ? "Obilí nestačilo pro všechny." : "Hladovějící dostali obilí."; } },
      { t: `Koupit obilí od kupců (${fmtN(Math.round(tot * s.market.p * 1.25))} debenů)`, d: "drahé, ale zachrání lidi", f: () => { const d2 = Math.round(tot * s.market.p * 1.25); if (!pay(s, s.player, d2)) return "Nedostatek debenů."; for (const [id, x] of d.list) { s.provs[id].stock += x; s.provs[id].loy = Math.min(100, s.provs[id].loy + 8); } return "Obilí bylo nakoupeno."; } },
      { t: "Nedělat nic", d: "lid strádá, maat klesá", f: () => { C.maat = Math.max(0, C.maat - 4); C.estates.lid = Math.max(0, C.estates.lid - 8); return null; } }] }; } },
  pohreb: { view: (s, d) => { const C = P(s); return { t: "Nový panovník", tx: `${d.old ? d.old + " odešel na západ, do říše Usirovy. " : ""}Na trůn usedá ${leaderOf(s, s.player).n}. Balzamování trvá podle pozdějších pramenů sedmdesát dní, pak vyrazí pohřební průvod na západní břeh.`,
    ch: [{ t: "Okázalý pohřeb a korunovace (3 000 debenů, 10 000 charů)", d: "maat +6, úředníci +5 věrnosti", f: () => { if (!pay(s, s.player, 3000, 10000)) return "Nedostatek prostředků – pohřeb byl skromný."; C.maat = Math.min(100, C.maat + 6); for (const c of officers(s, s.player)) c.loy = Math.min(100, c.loy + 5); return "Pohřeb i korunovace proběhly se vší slávou."; } },
      { t: "Skromný obřad", d: "nic nestojí", f: () => null }] }; } },
  pohrebiste: { view: (s, d) => { const C = P(s), p = s.provs[d.pid]; return { t: "Zpustošené hroby", tx: `Při dobývání župy ${p.n} vojáci vyplenili staré hroby a kaple na posvátném pohřebišti. Ponaučení pro Merikarea lituje, že za vlády jeho otce vojsko zpustošilo hroby v Thinidě, a říká, že za takový čin přichází odplata.`,
    ch: [{ t: "Obnovit hroby a obětiny (2 000 debenů)", d: "maat +2", f: () => { if (!pay(s, s.player, 2000)) { C.maat = Math.max(0, C.maat - 6); return "Na obnovu nebylo – maat utrpěla."; } C.maat = Math.min(100, C.maat + 2); C.estates.knezi = Math.min(100, C.estates.knezi + 4); return "Hroby byly obnoveny."; } },
      { t: "Válka je válka", d: "maat −6, kněží se hněvají", f: () => { C.maat = Math.max(0, C.maat - 6); C.estates.knezi = Math.max(0, C.estates.knezi - 6); return null; } }] }; } },
  nepokoje: { view: (s, d) => { const C = P(s), p = s.provs[d.pid]; return { t: `Vzpoura v župě ${p.n}`, tx: `Lid v župě ${p.n} odmítá robotu i daně a napadá písaře u sýpek. Spokojenost je ${Math.round(p.loy)}.`,
    ch: [{ t: "Potlačit vojskem", d: "ztráty ve vojsku, spokojenost se vrátí pomalu", f: () => { lossApply(p.troops, men(p.troops) * 0.1); p.loy += 12; C.estates.lid = Math.max(0, C.estates.lid - 4); return "Vzpoura byla potlačena."; } },
      { t: "Ustoupit: odpustit robotu a rozdat obilí (8 000 charů)", d: "spokojenost +25", f: () => { if (!pay(s, s.player, 0, 8000)) return "Obilí nestačí."; p.loy = Math.min(100, p.loy + 25); return "Lid se uklidnil."; } }] }; } },
  lupici: { view: (s, d) => { const C = P(s), p = s.provs[d.pid]; return { t: "Vykradači hrobů", tx: `V nekropoli župy ${p.n} byli dopadeni muži, kteří vykradli hrobku dávného hodnostáře. Kněží žádají přísný trest.`,
    ch: [{ t: "Soud a trest (300 debenů)", d: "maat +2, lid se bojí", f: () => { if (!pay(s, s.player, 300)) return "Nedostatek debenů."; C.maat = Math.min(100, C.maat + 2); C.estates.lid = Math.max(0, C.estates.lid - 2); return "Vykradači byli potrestáni."; } },
      { t: "Věc zamést pod koberec", d: "maat −3", f: () => { C.maat = Math.max(0, C.maat - 3); return null; } }] }; } },
  exempce: { view: (s, d) => { const C = P(s), p = s.provs[d.pid]; return { t: "Kněží žádají osvobození", tx: `Kněží boha ${p.god} v župě ${p.n} žádají dekret, který by jejich statky a lidi osvobodil od roboty a daní – tak jako staré dekrety z Koptu.`,
    ch: [{ t: "Vydat dekret", d: "kněží +12, maat +2, výnos župy −", f: () => { C.estates.knezi = Math.min(100, C.estates.knezi + 12); C.maat = Math.min(100, C.maat + 2); p.com = Math.max(0, p.com - 6); return "Dekret byl vydán."; } },
      { t: "Odmítnout", d: "kněží −10", f: () => { C.estates.knezi = Math.max(0, C.estates.knezi - 10); return null; } }] }; } },
  dedicnost: { view: (s, d) => { const C = P(s), c = chr(s, d.cid); return { t: "Dědičný úřad", tx: `${c.n} (${RANKS[c.rank].n}) žádá, aby jeho úřad přešel na syna. Nomarchové Prvního přechodného období se tak stali téměř samostatnými knížaty.`,
    ch: [{ t: "Vyhovět", d: "jeho věrnost +20, nomarchové +5, maat −1", f: () => { c.loy = Math.min(100, c.loy + 20); C.estates.nomarchove = Math.min(100, C.estates.nomarchove + 5); C.maat = Math.max(0, C.maat - 1); return null; } },
      { t: "Odmítnout", d: "jeho věrnost −15", f: () => { c.loy = Math.max(0, c.loy - 15); return null; } }] }; } },
  pisar: { view: (s, d) => { const C = P(s); return { t: "Nadaný písař", tx: `Do služby se hlásí mladý písař ${d.n}, který vystudoval v domě života. Umí počítat obilí i plochy polí.`,
    ch: [{ t: "Přijmout do služby", d: "nový úředník", f: () => { const x = genOfficer(s, s.player, C.cul, C.capital, { n: d.n, ved: rint(s, 15, 35), uda: rint(s, 10, 30), roz: rint(s, 55, 85), spr: rint(s, 55, 85), rank: 0, loy: 75 }); x.traits = ["hospodar"]; return `${x.n} vstoupil do služby.`; } },
      { t: "Odmítnout", d: "", f: () => null }] }; } },
  nakaza: { view: (s, d) => { const C = P(s), p = s.provs[d.pid]; return { t: `Nákaza v župě ${p.n}`, tx: `V župě ${p.n} se šíří horečka. Kněží bohyně Sachmet odříkávají zaříkání, lékaři doporučují oddělit nemocné.`,
    ch: [{ t: "Oddělit nemocné a zastavit trh", d: "menší ztráty lidí, obchod −", f: () => { p.pop = r1(p.pop * 0.97); p.com = Math.max(0, p.com - 5); return null; } },
      { t: "Obětiny Sachmet (800 debenů)", d: "maat +1", f: () => { if (!pay(s, s.player, 800)) { p.pop = r1(p.pop * 0.92); return "Na obětiny nebylo."; } p.pop = r1(p.pop * (hasTech(s, s.player, "lekarstvi") ? 0.97 : 0.94)); C.maat = Math.min(100, C.maat + 1); return null; } },
      { t: "Nechat bohům", d: "ztráty lidí", f: () => { p.pop = r1(p.pop * (hasTech(s, s.player, "lekarstvi") ? 0.94 : 0.9)); p.loy = Math.max(0, p.loy - 5); return null; } }] }; } },
  medzaj: { view: (s, d) => { const C = P(s); return { t: "Médžajové nabízejí službu", tx: s.scen === "fip" ? "Náčelníci Médžajů z Východní pouště nabízejí své lučištníky a stopaře. Médžajové bojovali v egyptských vojscích už za Staré říše (nápis hodnostáře Veniho)." : "Náčelníci Médžajů z Východní pouště nabízejí své lučištníky a stopaře. V Druhém přechodném období je archeologicky zastupuje kultura pánvových hrobů; Kamose je ve svém vojsku jmenuje.",
    ch: [{ t: "Přijmout (dary 1 000 debenů)", d: "lze verbovat Médžaje ve všech župách", f: () => { if (!pay(s, s.player, 1000)) return "Nedostatek debenů."; C.medjay = true; return "Médžajové budou sloužit tvému rodu."; } },
      { t: "Odmítnout", d: "", f: () => null }] }; } },
  zpronevera: { view: (s, d) => { const C = P(s), c = chr(s, d.cid); return { t: "Zpronevěra v sýpkách", tx: `Písaři zjistili, že ${c.n} si přisvojil ${fmtN(d.g)} charů ze státních sýpek.`,
    ch: [{ t: "Potrestat a vymoci obilí zpět", d: "obilí zpět, jeho věrnost −20", f: () => { C.grain += d.g; c.loy = Math.max(0, c.loy - 20); return null; } },
      { t: "Odpustit", d: "jeho věrnost +5, obilí ztraceno", f: () => { c.loy = Math.min(100, c.loy + 5); return null; } }] }; } },
  ipuver: { view: (s, d) => { const C = P(s); return { t: "Nářky mudrce", tx: "Mudrc u brány paláce naříká: „Hle, chudí země zbohatli… sýpky jsou prázdné… zákony soudní síně jsou pohozeny“ (volně podle Nářků Ipuverových, jejichž datace je sporná). Lid ho poslouchá.",
    ch: [{ t: "Rozdat obilí chudým (10 000 charů)", d: "lid +10, maat +3", f: () => { if (!pay(s, s.player, 0, 10000)) return "Obilí nestačí."; C.estates.lid = Math.min(100, C.estates.lid + 10); C.maat = Math.min(100, C.maat + 3); return null; } },
      { t: "Dát mudrce vyhnat", d: "maat −2", f: () => { C.maat = Math.max(0, C.maat - 2); return null; } }] }; } },
  usir: { view: (s, d) => { const C = P(s); return { t: "Usirovy mystéria v Abydu", tx: "V Abydu se slaví Usirovy mystéria: průvod s bohem Upuautem v čele, boj s jeho nepřáteli a návrat Usira do chrámu. Za Střední říše je popisuje stéla Ichernofreta; poutníci stavějí u „Terasy velkého boha“ stély a kaple.",
    ch: [{ t: "Financovat slavnost (800 debenů)", d: "maat +4, kněží +4, lid +2", f: () => { if (!pay(s, s.player, 800)) return "Nedostatek debenů."; C.maat = Math.min(100, C.maat + 4); C.estates.knezi = Math.min(100, C.estates.knezi + 4); C.estates.lid = Math.min(100, C.estates.lid + 2); return null; } },
      { t: "Nechat kněžím", d: "maat +1", f: () => { C.maat = Math.min(100, C.maat + 1); return null; } }] }; } },
  hebsed: { view: (s, d) => { const C = P(s), L = leaderOf(s, s.player); return { t: "Svátek sed", tx: `${L.n} vládne už ${regYear(s, s.player) - 1} let. Podle prastaré tradice má panovník po třiceti letech slavit svátek sed: běží kolem posvátných mezníků a znovu přijímá korunu Horního i Dolního Egypta.`,
    ch: [{ t: "Slavit svátek sed (5 000 debenů, 20 000 charů)", d: "maat +15, sláva +60, úředníci +10", f: () => { if (!pay(s, s.player, 5000, 20000)) return "Na slavnost nebylo."; C.maat = Math.min(100, C.maat + 15); C.prestige += 60; for (const c of officers(s, s.player)) c.loy = Math.min(100, c.loy + 10); C.hebsed = s.turn; return "Svátek sed se slavil v celé zemi."; } },
      { t: "Odložit", d: "", f: () => null }] }; } },
  mir_nabidka: { view: (s, d) => { const C = P(s), O = s.clans[d.cl]; return { t: "Nabídka míru", tx: `Posel rodu ${O.house} přináší nabídku míru${d.tribute ? " a slibuje tribut " + fmtN(d.tribute) + " debenů" : ""}.`,
    ch: [{ t: "Přijmout mír", d: "příměří na dva roky", f: () => { if (atWar(s, s.player, d.cl)) { makePeace(s, s.player, d.cl); if (d.tribute) { C.deben += d.tribute; O.deben -= d.tribute; } } return null; } },
      { t: "Odmítnout", d: "válka pokračuje", f: () => { addRel(s, s.player, d.cl, -5); return null; } }] }; } },
  nevesta: { view: (s, d) => { const C = P(s), m = chr(s, d.cid); return { t: "Vhodná nevěsta", tx: `Pro ${m.n} se nabízí sňatek. Může si vzít dceru mocného nomarchy, nebo příbuznou z vlastního rodu – tak se v 17. dynastii zřejmě oženil Ahmose s Ahmose-Nefertari.`,
    ch: [{ t: "Dcera nomarchy", d: "nomarchové +5", f: () => { const w = makeChar(s, { n: genName(s, C.cul, "f"), sex: "f", by: m.by + rint(s, 0, 8), cl: s.player, st: "fam", loc: C.capital, dyn: 1 }); wed(s, m, w); C.estates.nomarchove = Math.min(100, C.estates.nomarchove + 5); return null; } },
      { t: "Příbuzná z vlastního rodu", d: "maat +2, nomarchové −3", f: () => { C.estates.nomarchove = Math.max(0, C.estates.nomarchove - 3); const w = makeChar(s, { n: pick(s, (NAMES[C.cul] || NAMES.eg).f), sex: "f", by: m.by + rint(s, 0, 6), cl: s.player, st: "fam", loc: C.capital, dyn: 1 }); wed(s, m, w); C.maat = Math.min(100, C.maat + 2); return null; } },
      { t: "Zatím ne", d: "", f: () => null }] }; } },
  // ---- historické události ----
  hrosi: { view: (s, d) => { const C = P(s); return s.player === "thebes" ? { t: "Thébští hroši", tx: "Do Théb dorazil posel krále Apopiho z Avaridu: „Ať se vyžene hrochy z jezera na východě města, protože mi nedají spát ve dne ani v noci.“ Avaris leží stovky kilometrů daleko – je to výsměch a zkouška poslušnosti (podle papyru Sallier I.).",
    ch: [{ t: "Pokorně odpovědět a poslat dary (2 000 debenů)", d: "vztah s Hyksósy +, maat −4, sláva −20", f: () => { if (!pay(s, s.player, 2000)) return "Nebylo z čeho."; addRel(s, "thebes", "hyksos", 20); C.maat = Math.max(0, C.maat - 4); C.prestige = Math.max(0, C.prestige - 20); return null; } },
      { t: "Odmítnout a svolat radu k válce", d: "konec tributu, válka s Hyksósy, sláva +40", f: () => { C.tributeTo = null; declareWar(s, "thebes", "hyksos", "urážka o hroších"); C.prestige += 40; for (const c of officers(s, "thebes")) c.loy = Math.min(100, c.loy + 5); return null; } },
      { t: "Mlčet a vyčkávat", d: "vztah s Hyksósy −10", f: () => { addRel(s, "thebes", "hyksos", -10); return null; } }] }
    : { t: "Vzkaz do Théb", tx: "Rádci navrhují poslat thébskému vazalovi Sekenenreovi vzkaz, aby vyhnal hrochy z jezera – prý ti nedají spát. Má to Thébany ponížit a připomenout jim, kdo je pánem (podle papyru Sallier I.).",
    ch: [{ t: "Poslat vzkaz", d: "sláva +15, Thébané se rozzlobí", f: () => { C.prestige += 15; addRel(s, "thebes", "hyksos", -25); return null; } }, { t: "Nechat Thébany být", d: "", f: () => null }] }; } },
  dopis: { view: (s, d) => { const C = P(s); return s.player === "thebes" ? { t: "Zachycený dopis", tx: "Na pouštní cestě u oáz zajali tvoji zvědové posla s dopisem: „Auserre, syn Reův Apopi, zdraví syna svého, vládce Kuše… Přijď na sever, neboj se. Hle, on je tu u mne… Rozdělíme si města Egypta.“ (podle druhé stély krále Kamoseho).",
    ch: [{ t: "Poslat posla zpět do Avaridu, ať Apopi ví, že je odhalen", d: "sláva Hyksósů −30, Kuš a Hyksósové se odcizí", f: () => { s.clans.hyksos.prestige = Math.max(0, s.clans.hyksos.prestige - 30); s.clans.hyksos.maat = Math.max(0, s.clans.hyksos.maat - 5); addRel(s, "hyksos", "kush", -25); C.prestige += 25; return null; } },
      { t: "Dát dopis přečíst lidu v Thébách", d: "lid +8, úředníci +5", f: () => { C.estates.lid = Math.min(100, C.estates.lid + 8); for (const c of officers(s, "thebes")) c.loy = Math.min(100, c.loy + 5); addRel(s, "hyksos", "kush", -10); return null; } }] }
    : { t: "Ztracený posel", tx: "Tvůj posel k vládci Kuše se nevrátil – Thébané ho zajali na pouštní cestě u oáz. Spojenectví s Kuší je ohroženo.", ch: [{ t: "Poslat Kuši bohaté dary (2 000 debenů)", d: "vztah s Kuší +15", f: () => { if (!pay(s, s.player, 2000)) return "Nebylo z čeho."; addRel(s, s.player, "kush", 15); return null; } }, { t: "Nic nedělat", d: "vztah s Kuší −10", f: () => { addRel(s, s.player, "kush", -10); return null; } }] }; } },
  rhind: { view: (s, d) => { const C = P(s); return { t: "Rhindův papyrus", tx: "Písař Ahmose dokončil v 33. roce vlády krále Apopiho opis starého matematického spisu „Návod, jak poznat všechny temné věci“ – výpočty ploch polí, objemů sýpek a dělení chlebů.",
    ch: [{ t: "Odměnit písaře a rozeslat opisy (500 debenů)", d: "+40 bodů vědění, písaři +10", f: () => { if (!pay(s, s.player, 500)) return "Nedostatek debenů."; C.res.pts += 40; C.estates.pisari = Math.min(100, C.estates.pisari + 10); return null; } }, { t: "Uložit do archivu", d: "+15 bodů vědění", f: () => { C.res.pts += 15; return null; } }] }; } },
  merikare: { view: (s, d) => { const C = P(s); return { t: "Ponaučení pro Merikarea", tx: "Starý král sepisuje pro svého syna ponaučení: „Mluv pravdu ve svém domě… Asiat je bídník, bojuje od dob Horových… Buď dobrý k jihu.“ Jakou radu si dědic vezme k srdci?",
    ch: [{ t: "Opevnit východní hranici Delty proti Asiatům", d: "pevnost +1 v Heliopoli a Bubastidě, maat +2", f: () => { for (const id of ["l13", "l18"]) { const p = s.provs[id]; if (p.owner === s.player && p.castle < 5) { p.castle++; p.dur = durMax(s, p); } } C.maat = Math.min(100, C.maat + 2); return null; } },
      { t: "Hledat smír s Jihem", d: "vztah s Thébami +25, možná příměří", f: () => { addRel(s, s.player, "thebes", 25); if (atWar(s, s.player, "thebes") && chance(s, 0.5)) makePeace(s, s.player, "thebes"); return null; } },
      { t: "Posílit vojsko a trestat rebely", d: "výcvik +10 ve všech župách, nomarchové +5, lid −4", f: () => { for (const p of clanProvs(s, s.player)) p.train = Math.min(100, p.train + 10); C.estates.nomarchove = Math.min(100, C.estates.nomarchove + 5); C.estates.lid = Math.max(0, C.estates.lid - 4); return null; } }] }; } },
  vitezstvi: { view: (s, d) => ({ t: d.win ? "Pán Obou zemí" : "Konec", tx: d.txt, ch: [{ t: d.win ? "Vládnout dál" : "Rozumím", d: d.win ? "hra pokračuje" : "můžeš začít novou hru v záložce Hra", f: () => null }] }) },
};

function randomEvents(s) {
  const C = P(s); if (!C || !C.alive || s.events.length) return;
  if (s.month === OSIRIS_MONTH && s.provs.u8.owner === s.player) { queueEvent(s, "usir", {}); return; }
  if (s.month === 0 && regYear(s, s.player) >= 31 && (!C.hebsed || s.turn - C.hebsed >= 36)) { queueEvent(s, "hebsed", {}); return; }
  if (!chance(s, 0.22)) return;
  const opts = [];
  const hp = someOwnProv(s, p => p.flags.includes("h") || p.id === C.capital); if (hp) opts.push(["lupici", { pid: hp.id }]);
  const tp = someOwnProv(s, p => p.b.chram > 0); if (tp && C.laws.chramy !== 0) opts.push(["exempce", { pid: tp.id }]);
  const hi = officers(s, s.player).filter(c => !c.dyn && c.rank >= 3); if (hi.length && C.laws.nomarchove !== 0) opts.push(["dedicnost", { cid: pick(s, hi).id }]);
  opts.push(["pisar", { n: genName(s, C.cul, "m") }]);
  const np = someOwnProv(s, p => p.pop > 15); if (np) opts.push(["nakaza", { pid: np.id }]);
  if (!C.medjay && clanProvs(s, s.player).some(p => p.nb.some(n => s.provs[n].flags.includes("m")) || p.flags.includes("m"))) opts.push(["medzaj", {}]);
  const zc = officers(s, s.player).filter(c => !c.dyn && c.traits.includes("chamtivy")); if (zc.length && C.grain > 30000) { const g = Math.round(C.grain * 0.05); C.grain -= g; opts.push(["zpronevera", { cid: pick(s, zc).id, g }]); }
  if (s.scen === "fip") opts.push(["ipuver", {}]);
  const groom = Object.values(s.chars).filter(c => c.cl === s.player && c.dyn && c.sex === "m" && !c.spouse && c.st === "off" && age(s, c) >= 16 && age(s, c) < 45);
  if (groom.length) { opts.push(["nevesta", { cid: groom[0].id }]); if (!heirsOf(s, s.player).some(c => c.sex === "m")) { queueEvent(s, "nevesta", { cid: groom[0].id }); return; } }
  const [k, d] = pick(s, opts); queueEvent(s, k, d);
}
function scriptedEvents(s) {
  if (s.scen === "sip") {
    if (!s.flags.hrosi && s.turn >= 2 && s.clans.thebes.alive && s.clans.hyksos.alive && !atWar(s, "thebes", "hyksos")) {
      s.flags.hrosi = 1;
      if (s.player === "thebes" || s.player === "hyksos") queueEvent(s, "hrosi", {});
      else if (chance(s, 0.5)) { s.clans.thebes.tributeTo = null; declareWar(s, "thebes", "hyksos", "urážka o hroších"); }
    }
    if (!s.flags.dopis && atWar(s, "thebes", "hyksos") && s.clans.kush.alive && ["o_dak", "o_kha", "o_bah"].some(id => s.provs[id].owner === "thebes") && chance(s, 0.12)) {
      s.flags.dopis = 1; if (s.player === "thebes" || s.player === "hyksos") queueEvent(s, "dopis", {}); else addRel(s, "hyksos", "kush", -15);
    }
    if (!s.flags.rhind && s.turn >= 30 && s.clans.hyksos.alive && chance(s, 0.1)) { s.flags.rhind = 1; if (s.player === "hyksos") queueEvent(s, "rhind", {}); else s.clans.hyksos.res.pts += 30; }
  }
  if (s.scen === "fip") {
    if (!s.flags.merikare && s.turn >= 6 && s.player === "herak" && s.clans.herak.alive) { s.flags.merikare = 1; queueEvent(s, "merikare", {}); }
  }
}

// ---------- umělá inteligence ----------
function monthlyGrainNeed(s, cid) { return -clanBudget(s, cid).gnet + 1; }
function aiDomestic(s, cid, c, adviser) {
  const C = s.clans[cid], p = s.provs[c.loc]; if (!p || cmdCheck(s, cid, c)) return;
  const need = monthlyGrainNeed(s, cid), war = enemiesOf(s, cid).length > 0, front = isFront(s, p), border = isBorder(s, p);
  const tryC = (k, a, b) => doCmd(s, cid, c.id, k, a, b) === null;
  if (p.loy < 32 && C.grain > need * 6 && tryC("rozdat")) return;
  if (p.hunger > 0.2 && C.grain > need * 8 && tryC("rozdat")) return;
  if ((war && front || (border && men(p.troops) < troopCap(p) * 0.3)) && men(p.troops) < troopCap(p) * 0.85 && C.grain > need * 10 && C.deben > 400) {
    const types = ["kopinici", "lucistnici"]; if (hasTech(s, cid, "vuz") && C.kone > 200 && C.deben > 4000) types.push("vozy"); if ((C.medjay || p.flags.includes("m")) && C.deben > 5000) types.push("medzajove");
    if (tryC("odvod", pick(s, types))) return;
  }
  if (!war && men(p.troops) < troopCap(p) * (C.deben > 20000 ? 0.85 : 0.5) && C.grain > need * 18 && C.deben > 2500 && chance(s, 0.3) && tryC("odvod", pick(s, ["kopinici", "lucistnici"]))) return;
  if (p.dur < durMax(s, p) * 0.6 && (front || border) && tryC("hradby")) return;
  if (men(p.troops) > 300 && p.train < (war ? 60 : 45) && tryC("vycvik")) return;
  if (!p.build && C.deben > 5000 && C.grain > need * 12 + 30000) {
    const rich = C.deben > 15000, opts = []; if ((front || border) && p.castle < (rich ? 4 : 3)) opts.push("pevnost"); if ((p.b.chram || 0) < (rich ? 3 : 1)) opts.push("chram"); if ((p.b.sypka || 0) < (rich ? 2 : 1)) opts.push("sypka"); if ((p.b.dilny || 0) < (rich ? 3 : 2)) opts.push("dilny"); if (p.res.some(r => RES[r].mine) && (p.b.lom || 0) < 3) opts.push("lom"); if (TERRAIN[p.ter].nile && !p.b.pristav && C.deben > 12000) opts.push("pristav");
    for (const b of opts) if (!canBuild(s, cid, p, b) && tryC("stavba", b)) return;
  }
  if (p.agri < agriCap(s, p) - 1 && C.grain > need * 6 + 8000 && (s.month < 4 || chance(s, 0.6)) && tryC("zavlaha")) return;
  if (p.com < comCap(s, p) - 1 && C.deben > 800 && tryC("remesla")) return;
  if (st(c, "spr") >= 45 && C.deben > 3000 && chance(s, 0.35)) { const ex = Object.keys(EXPED).filter(e => !expAvail(s, cid, e)); if (ex.length && tryC("vyprava", pick(s, ex))) return; }
  if (C.res.cur && C.deben > 1500 && tryC("uceni")) return;
  if (C.maat < 55 && C.deben > 2500 && tryC("obeti")) return;
  if (!C.census || C.census < s.turn) { if (C.deben > 1000 && chance(s, 0.2) && tryC("scitani")) return; }
  if (adviser && C.deben > 1500 && tryC("uceni")) return;
}
function aiClan(s, cid) {
  const C = s.clans[cid]; if (!C.alive) return;
  if (C.type !== "kmen") for (const c of officers(s, cid)) if (c.acted !== s.turn) aiDomestic(s, cid, c);
  if (s.turn % 12 === 0) aiOffices(s, cid);
  if (C.type === "kmen") return;
  // hrobka
  const tc = tombCost(s, cid); if (!C.tomb.active && C.tomb.stage < TOMB_STAGES.length && C.deben > tc.deben * 2.5 && C.grain > tc.grain * 3) startTomb(s, cid);
  // trh
  const need = monthlyGrainNeed(s, cid);
  if (C.grain > need * 24 + 120000) trade(s, cid, -Math.round(Math.min(marketCap(s, cid), (C.grain - need * 18) * 0.3)));
  else if (C.grain < need * 4 && C.deben > 3000) trade(s, cid, Math.round(Math.min(marketCap(s, cid), C.deben / (s.market.p * 1.25) * 0.4)));
  // válka: tažení
  const enemies = enemiesOf(s, cid);
  for (const e of enemies) {
    if (s.armies.filter(a => a.cl === cid).length >= 2) break;
    const opts = [];
    for (const p of clanProvs(s, cid)) for (const n of p.nb) { const q = s.provs[n]; if (q.owner !== e && !(atWar(s, cid, q.owner))) continue; if (q.siege) continue; const myP = troopPower(s, cid, p.troops, { train: p.train }) * 0.7, def = provDefense(s, q) + sum(s.armies.filter(a => a.loc === q.id && atWar(s, a.cl, cid)).map(a => troopPower(s, a.cl, a.t, { def: true, train: a.train }))); if (men(p.troops) > 900 && myP > def * 1.1) opts.push([p, q, myP / Math.max(1, def)]); }
    if (opts.length) { opts.sort((x, y) => y[2] - x[2]); const [p, q] = opts[0]; const cm = officersIn(s, p.id).filter(c => c.id !== C.leader || chance(s, 0.3)).sort((a, b) => st(b, "ved") - st(a, "ved")).slice(0, 2).map(c => c.id); sendArmy(s, cid, p.id, q.id, 0.7, cm); }
  }
  // posily ze zázemí do frontových žup (sousední župy, pochod do měsíce)
  if (enemies.length) for (const f of clanProvs(s, cid).filter(p => isFront(s, p) && !p.siege)) for (const n of f.nb) { const q = s.provs[n]; if (q.owner !== cid || isFront(s, q) || q.siege || men(q.troops) < 700) continue; const old = men(f.troops); let moved = 0; for (const k of TROOP_IDS) { const x = Math.floor((q.troops[k] || 0) * 0.3); if (x > 0) { q.troops[k] -= x; f.troops[k] = (f.troops[k] || 0) + x; moved += x; } } if (old + moved) f.train = Math.round((f.train * old + q.train * moved) / (old + moved)); }
  // přesun posil na frontu
  if (enemies.length && chance(s, 0.3)) {
    const ps = clanProvs(s, cid), front = ps.filter(p => isFront(s, p)), back = ps.filter(p => !isFront(s, p) && !isBorder(s, p) && men(p.troops) > 1500);
    if (front.length && back.length) { const b = pick(s, back), f = front.sort((x, y) => men(x.troops) - men(y.troops))[0]; sendArmy(s, cid, b.id, f.id, 0.5, []); }
  }
  // vyhlášení války
  if (!enemies.length || (C.aggr > 0.55 && enemies.length < 2)) for (const o of borderClans(s, cid)) {
    const O = s.clans[o]; if (!O.alive || atWar(s, cid, o) || friendly(s, cid, o) || truceUntil(s, cid, o) > s.turn) continue;
    if (C.tributeTo === o && realmPower(s, cid) < realmPower(s, o) * 1.1) continue;
    const ratio = realmPower(s, cid) / Math.max(1, realmPower(s, o)), r = rel(s, cid, o);
    const ppl = isPlayer(s, o) ? [1.2, 1, 0.85][s.opts.diff] : 1;
    if (ratio > 1.4 && r < 5 && chance(s, C.aggr * 0.05 * ppl * (O.type === "kmen" ? 0.6 : 1))) { declareWar(s, cid, o, ratio > 2.5 ? "ze síly" : "o hranice"); break; }
  }
  // mír
  for (const e of enemies) {
    const w = s.wars.find(x => (x.a === cid && x.b === e) || (x.a === e && x.b === cid)); if (!w || s.turn - w.start < 8) continue;
    const ratio = realmPower(s, cid) / Math.max(1, realmPower(s, e));
    if (isPlayer(s, e)) { if (ratio < 0.55 && chance(s, 0.08) && !s.events.some(x => x.k === "mir_nabidka")) queueEvent(s, "mir_nabidka", { cl: cid, tribute: ratio < 0.35 ? Math.round(C.deben * 0.3) : 0 }); }
    else if ((ratio < 0.7 || s.turn - w.start > 24) && chance(s, 0.06) && !s.armies.some(a => (a.cl === cid || a.cl === e) && s.provs[a.loc].siege)) makePeace(s, cid, e);
  }
  // poddanství slabých sousedů
  if (chance(s, 0.03)) for (const o of borderClans(s, cid)) { const O = s.clans[o]; if (isPlayer(s, o) || O.vassalOf || O.type === "kmen" || C.vassalOf) continue; if (realmPower(s, cid) > realmPower(s, o) * 3.5 && rel(s, cid, o) > -10) { C.last["d_" + o] = -1; diplo(s, cid, o, "podruci"); break; } }
  // vazal se vzbouří
  if (C.vassalOf && s.clans[C.vassalOf] && chance(s, 0.02) && realmPower(s, cid) > realmPower(s, C.vassalOf) * 0.8 && rel(s, cid, C.vassalOf) < 20) declareWar(s, cid, C.vassalOf, "za nezávislost");
  // tribut
  if (C.tributeTo && (atWar(s, cid, C.tributeTo) || realmPower(s, cid) > realmPower(s, C.tributeTo) * 1.2) && chance(s, 0.05)) { C.last["d_" + C.tributeTo] = -1; diplo(s, cid, C.tributeTo, "tribut_stop"); }
  // rozpuštění vojsk bez cíle
  for (const a of s.armies.filter(x => x.cl === cid && (!x.path || !x.path.length) && s.provs[x.loc].owner !== cid && !s.provs[x.loc].siege)) { const home = clanProvs(s, cid).find(q => s.provs[a.loc].nb.includes(q.id)) || s.provs[C.capital]; if (home) a.path = findPath(s, cid, a.loc, home.id) || []; }
}

// Hráčovy svěřené župy spravuje rádce sám
function delegated(s) { for (const p of clanProvs(s, s.player)) if (p.deleg) for (const c of officersIn(s, p.id)) if (c.acted !== s.turn && c.id !== P(s).leader) aiDomestic(s, s.player, c); }

// ---------- vítězství ----------
function checkEnd(s) {
  if (s.over && !s.over.cont) return;
  const C = P(s); if (!C || !C.alive) return;
  const core = coreProvs(s).length, mine = realmCore(s, s.player);
  if (!s.flags.won && C.cul === "eg" && mine >= Math.ceil(core * 0.9) && clanProvs(s, s.player).some(p => p.id === "l1" || p.id === "u4" || p.id === "u20" || p.id === "lav")) {
    s.flags.won = 1; C.maat = Math.min(100, C.maat + 20); C.prestige += 300;
    const L = leaderOf(s, s.player);
    s.over = { win: true, cont: true, txt: `${L.n} sjednotil Horní a Dolní Egypt (sema-taui) a nasadil si dvojitou korunu. Ovládáš ${mine} z ${core} žup egyptského jádra. Tak jako Montuhotep II. (vládl ≈ 2055–2004 př. n. l.) nebo Ahmose I. po dobytí Avaridu jsi zakladatelem nové éry. Můžeš vládnout dál.` };
    queueEvent(s, "vitezstvi", { win: true, txt: s.over.txt });
  }
  if (!s.flags.won && C.cul !== "eg" && mine >= Math.ceil(core * 0.5) && ["n_kerma", "n_buhen", "u1"].every(id => s.provs[id].owner === s.player || (s.clans[s.provs[id].owner].vassalOf === s.player))) {
    s.flags.won = 1; s.over = { win: true, cont: true, txt: `Kuš ovládá Núbii i polovinu Egypta. Tak mocná Kerma nebyla nikdy – až asi o osm set let později vládli Egyptu kušitští králové 25. dynastie.` };
    queueEvent(s, "vitezstvi", { win: true, txt: s.over.txt });
  }
}

// ---------- konec měsíce ----------
function endTurn(s) {
  if (s.over && !s.over.cont) return;
  delegated(s);
  for (const C of aliveClans(s)) if (!isPlayer(s, C.id)) aiClan(s, C.id);
  moveArmies(s); siegeTick(s); raids(s);
  economyTick(s);
  if (s.month === 0) { s.flood.next = rollFlood(s); }
  if (s.month === FLOOD_MONTH) floodTick(s);
  if (s.month === HARVEST_MONTH) harvestTick(s);
  loyaltyTick(s);
  // stavy (jen hráč): pomalý návrat k rovnováze
  const C = P(s);
  if (C && C.estates) {
    for (const e of ESTATE_IDS) C.estates[e] = clamp(C.estates[e] + (50 - C.estates[e]) * 0.02, 0, 100);
    C.maat = clamp(C.maat + (C.estates.knezi - 50) / 100, 0, 100);
    if (C.estates.nomarchove < 20 && chance(s, 0.1)) { const c = pick(s, officers(s, s.player).filter(x => !x.dyn) || []); if (c) { c.loy = Math.max(0, c.loy - 15); log(s, `Nomarchové reptají; ${c.n} se veřejně staví proti dvoru.`, "intriky", [s.player]); } }
  }
  // AI pokoušení hráčových úředníků
  for (const e of aliveClans(s).filter(x => !isPlayer(s, x.id) && x.type !== "kmen" && (atWar(s, x.id, s.player) || rel(s, x.id, s.player) < -30))) {
    if (!chance(s, 0.06)) continue; const cs = officers(s, s.player).filter(c => !c.dyn && c.loy < 45 && Object.values(s.provs).some(q => q.lord === c.id && q.nb.some(n => s.provs[n].owner === e.id)));
    if (cs.length) { const c = pick(s, cs); c.loy = Math.max(0, c.loy - rint(s, 6, 14)); c.tempt = e.id; log(s, `Šeptá se, že ${c.n} přijímá dary od rodu ${e.house}.`, "intriky", [s.player]); }
  }
  scriptedEvents(s);
  // posun kalendáře
  s.turn++; s.month++;
  if (s.month >= 12) { s.month = 0; s.bce--; log(s, `Pět dní navíc (epagomenální): slaví se narození Usira, Hora, Sutecha, Eset a Nebthet. Začíná nový rok.`, "nil"); yearLife(s); if (C) { if (hasTech(s, s.player, "hvezdy")) C.maat = Math.min(100, C.maat + 2); } }
  randomEvents(s);
  checkEnd(s);
  snapshot(s);
}
