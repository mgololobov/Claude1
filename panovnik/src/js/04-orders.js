// Rozkazy vazalům a správa rodu (platí pro hráče i pro umělou inteligenci).

function agriCap(s, p) { let m = p.agriMax; if (hasTech(s, p.owner, "pluh") && p.ter === "n") m += 15; if (hasTech(s, p.owner, "kolonizace")) m += 10; return m; }
function comCap(s, p) { let m = p.comMax + (p.b.mesto || 0) * 25 + (p.b.pristav || 0) * 20 + (p.b.vinice || 0) * 5; if (hasTech(s, p.owner, "cechy") && (p.city || p.b.mesto)) m += 10; return m; }
function troopCap(p) { return Math.round(p.pop * 80 + p.castle * 300); }
function costMult(s, cid) { const C = s.clans[cid]; return C.laws ? [1.15, 1, 0.85][C.laws.robota] : 1; }
function buildCost(s, cid, b, p) { const B = BUILD[b]; const lvl = b === "hrad" ? p.castle : (p.b[b] || 0); return Math.round(B.cost * (1 + lvl * 0.5) * costMult(s, cid) * (hasTech(s, cid, "gotika") ? 0.8 : 1)); }
function buildLevel(p, b) { return b === "hrad" ? p.castle : (p.b[b] || 0); }
function canBuild(s, cid, p, b) {
  const B = BUILD[b]; if (p.owner !== cid) return "Kraj ti nepatří.";
  if (p.build) return "V kraji se už staví.";
  if (buildLevel(p, b) >= B.max) return "Nejvyšší úroveň.";
  if (B.need && !B.need(p)) return "V tomto kraji nelze.";
  if (s.clans[cid].gold < buildCost(s, cid, b, p)) return "Nedostatek zlata.";
  return null;
}
function recruitCost(s, cid, type, n) {
  const C = s.clans[cid]; const lawM = C.laws ? [0.7, 1, 1.3][C.laws.vojsko] : 1;
  return { gold: Math.round(TROOPS[type].cost * n / 100 * s.inflation * (type === "zoldneri" ? 1 : lawM)), goods: Object.fromEntries(Object.entries(TROOPS[type].goods).map(([g, q]) => [g, Math.ceil(q * n / 100)])) };
}
function maxRecruit(s, p, c) { return Math.max(0, Math.min(troopCap(p) - men(p.troops), 100 + st(c, "ved") * 8)); }

// Ověření, že vazal může dostat rozkaz
function cmdCheck(s, cid, c) {
  if (!c || c.cl !== cid || c.st !== "off") return "Není to tvůj vazal.";
  if (c.army) return "Vazal je s vojskem v poli.";
  if (c.acted === s.turn) return "Vazal už v tomto měsíci jedná.";
  const p = s.provs[c.loc]; if (!p || p.owner !== cid) return "Vazal není ve vlastním kraji.";
  if (p.siege) return "Kraj je obléhán.";
  return null;
}
function pay(s, cid, g) { const C = s.clans[cid]; if (C.gold < g) return false; C.gold -= g; return true; }

function doCmd(s, cid, offId, cmd, arg, arg2) {
  const c = chr(s, offId), err = cmdCheck(s, cid, c); if (err) return err;
  const C = s.clans[cid], p = s.provs[c.loc], K = CMDS[cmd]; if (!K) return "Neznámý rozkaz.";
  const me = isPlayer(s, cid), say = t => { if (me || cid === s.player) log(s, `${c.n}: ${t}`, "rozkazy", [cid]); return null; };
  let cost = Math.round((K.cost || 0) * costMult(s, cid));
  switch (cmd) {
    case "zemedelstvi": case "obchod": {
      const key = cmd === "zemedelstvi" ? "agri" : "com", capv = cmd === "zemedelstvi" ? agriCap(s, p) : comCap(s, p);
      if (p[key] >= capv) return "Kraj už je plně rozvinutý.";
      if (!pay(s, cid, cost)) return "Nedostatek zlata.";
      const g = Math.max(1, Math.round((st(c, "spr") / 11 + rnd(s) * 3) * (hasTech(s, cid, "vodni_kolo") && key === "agri" ? 1.2 : 1) * (1 - p[key] / capv * 0.45)));
      p[key] = Math.min(capv, p[key] + g); c.merit += 4;
      say(`${K.n} v kraji ${p.n}: +${g} (nyní ${p[key]}/${capv}).`); break;
    }
    case "hradby": {
      if (p.dur >= durMax(s, p)) return "Opevnění je v pořádku.";
      if (!pay(s, cid, cost)) return "Nedostatek zlata.";
      const g = Math.round(st(c, "spr") / 2 + 10 + rnd(s) * 10); p.dur = Math.min(durMax(s, p), p.dur + g); c.merit += 3;
      say(`Opravy hradeb v kraji ${p.n}: +${g}.`); break;
    }
    case "nabor": {
      const type = arg || "pesi"; let n = Math.floor(+arg2 || maxRecruit(s, p, c)); n = Math.min(n, maxRecruit(s, p, c));
      if (n < 50) return "V kraji už nejsou volní muži (strop posádky " + troopCap(p) + ").";
      const rc = recruitCost(s, cid, type, n);
      if (C.gold < rc.gold) return `Nedostatek zlata (${rc.gold}).`;
      for (const [g, q] of Object.entries(rc.goods)) if ((C[g] || 0) < q) return `Chybí ${GOODS[g].n.toLowerCase()} (${q}).`;
      C.gold -= rc.gold; for (const [g, q] of Object.entries(rc.goods)) C[g] -= q;
      const newTr = C.laws ? [15, 25, 40][C.laws.vojsko] : 25, old = men(p.troops);
      p.train = Math.round((p.train * old + newTr * n) / (old + n)); p.troops[type] = (p.troops[type] || 0) + n;
      if (type !== "zoldneri") { p.pop = Math.max(2, r1(p.pop - n / 1000)); p.loy = Math.max(0, p.loy - n / 150); }
      c.merit += 4; say(`Naverbováno ${n} mužů (${TROOPS[type].n}) v kraji ${p.n} za ${rc.gold} zl.`); break;
    }
    case "vycvik": {
      if (p.train >= 100) return "Posádka je dokonale vycvičená."; if (!men(p.troops)) return "Není koho cvičit.";
      if (!pay(s, cid, cost)) return "Nedostatek zlata.";
      const g = Math.round(st(c, "ved") / 9 + st(c, "uda") / 18 + rnd(s) * 4); p.train = Math.min(100, p.train + g); c.merit += 3;
      say(`Výcvik v kraji ${p.n}: +${g} (nyní ${Math.round(p.train)}).`); break;
    }
    case "lid": {
      const g = Math.round(p.pop * 2); if (C.grain < g) return `Nedostatek obilí (${g}).`; if (p.loy >= 100) return "Lid je spokojen.";
      C.grain -= g; const v = Math.round(st(c, "spr") / 10 + 5 + rnd(s) * 4); p.loy = Math.min(100, p.loy + v); c.merit += 3;
      say(`Rozdáno ${g} obilí v kraji ${p.n}, spokojenost +${v}.`); break;
    }
    case "hledat": {
      if (!pay(s, cid, cost)) return "Nedostatek zlata.";
      const w = Object.values(s.chars).filter(x => x.st === "wand" && x.loc === p.id);
      c.merit += 2;
      if (w.length && chance(s, 0.35 + st(c, "roz") / 180)) {
        const x = w.sort((a, b) => sum(STAT_IDS.map(k => st(b, k))) - sum(STAT_IDS.map(k => st(a, k))))[0];
        if (chance(s, 0.5 + C.prestige / 1500 + st(c, "roz") / 400)) { x.st = "off"; x.cl = cid; x.loy = rint(s, 55, 80); x.rank = 0; x.merit = 0; return say(`našel muže jménem ${x.n} a ten vstoupil do služby! (${STAT_IDS.map(k => STATS[k].slice(0, 3) + " " + st(x, k)).join(", ")})`); }
        return say(`našel ${x.n}, ale ten službu odmítl.`);
      }
      if (chance(s, 0.12 + st(c, "roz") / 500)) { const x = genOfficer(s, null, C.cul, p.id, { st: "wand", rank: 0, loy: 0 }); return say(`zaslechl o schopném muži (${x.n}), který se potuluje krajem.`); }
      say("nikoho schopného nenašel."); break;
    }
    case "studium": {
      if (!pay(s, cid, cost)) return "Nedostatek zlata.";
      const g = r1((st(c, "roz") / 7 + (p.b.klaster || 0) * 3 + rnd(s) * 3) * (hasTech(s, cid, "univerzita") ? 2 : 1));
      C.res.pts += g; c.merit += 3; say(`Podpora učenců: +${g} bodů učenosti.`); break;
    }
    case "stavba": {
      const b = arg; const e = canBuild(s, cid, p, b); if (e) return e;
      const g = buildCost(s, cid, b, p); C.gold -= g;
      p.build = { b, left: Math.max(2, BUILD[b].time - (st(c, "spr") > 70 ? 1 : 0)), total: BUILD[b].time };
      c.merit += 5; say(`Zahájena stavba v kraji ${p.n}: ${BUILD[b].n} za ${g} zl (${p.build.left} měsíců).`); break;
    }
    case "zvedy": {
      const t = s.provs[arg]; if (!t || t.owner === cid) return "Vyber cizí kraj.";
      if (!pay(s, cid, cost)) return "Nedostatek zlata.";
      if (chance(s, 0.6 + st(c, "roz") / 250)) { t.spy[cid] = s.turn + 6; say(`Zvědové zjistili stav kraje ${t.n} (platí 6 měsíců).`); }
      else say(`zvědové se z kraje ${t.n} nevrátili.`); break;
    }
    case "podnecovat": {
      const t = s.provs[arg]; if (!t || t.owner === cid) return "Vyber cizí kraj."; if (!pay(s, cid, cost)) return "Nedostatek zlata.";
      const tl = chr(s, t.lord);
      if (chance(s, 0.3 + st(c, "roz") / 250 - (tl ? st(tl, "roz") / 400 : 0))) { const d = rint(s, 8, 18); t.loy = Math.max(0, t.loy - d); t.troops.pesi = Math.round(t.troops.pesi * 0.93); say(`V kraji ${t.n} vypukly nepokoje (spokojenost −${d}).`); }
      else { addRel(s, cid, t.owner, -10); if (chance(s, 0.2)) { capture(s, c, t.owner); say(`byl dopaden při podněcování v kraji ${t.n} a zajat!`); } else say(`podněcování v kraji ${t.n} se nezdařilo a bylo odhaleno.`); } break;
    }
    case "naklonit": {
      const x = chr(s, arg); if (!x || x.st !== "off" || x.cl === cid) return "Vyber cizího vazala."; if (x.id === s.clans[x.cl].leader || x.dyn) return "Hlavu rodu ani jeho příbuzné nelze naklonit.";
      cost += x.rank * 25; if (!pay(s, cid, cost)) return "Nedostatek zlata (" + cost + ").";
      const pch = 0.25 + (st(c, "roz") - x.loy) / 150 + (s.clans[cid].prestige - s.clans[x.cl].prestige) / 2000 - (x.traits.includes("verny") ? 0.2 : 0);
      if (chance(s, clamp(pch, 0.05, 0.85))) {
        x.loy = Math.max(0, x.loy - rint(s, 10, 22));
        if (x.loy < 25 && chance(s, 0.5)) {
          const lordOf = Object.values(s.provs).find(q => q.lord === x.id && q.owner === x.cl);
          if (lordOf && x.loy < 18 && lordOf.nb.some(n => s.provs[n].owner === cid) && !lordOf.siege) { const old = lordOf.owner; transferProv(s, lordOf.id, cid, "zrada"); x.cl = cid; x.loy = 60; addRel(s, cid, old, -30); news(s, `${x.n} zradil svého pána (${clanName(s, old)}) a přešel s krajem ${lordOf.n} k rodu ${s.clans[cid].house}!`, "intriky", [cid, old]); return null; }
          defect(s, x, cid); return say(`${x.n} opustil službu u ${clanName(s, x.cl === cid ? x.cl : x.cl)} a přešel k nám.`);
        }
        say(`věrnost vazala ${x.n} k jeho pánovi poklesla (nyní ${Math.round(x.loy)}).`);
      } else { addRel(s, cid, x.cl, -8); say(`${x.n} odmítl úplatky a vše oznámil svému pánovi.`); }
      break;
    }
    case "poselstvo": { const e = diplomacy(s, cid, c, arg, arg2); if (e) return e; break; }
    case "presun": {
      const t = s.provs[arg]; if (!t || t.owner !== cid || t.id === p.id) return "Vyber jiný vlastní kraj.";
      c.loc = t.id; if (p.lord === c.id) p.lord = null; assignLords(s, cid); say(`odjíždí do kraje ${t.n}.`); break;
    }
  }
  c.acted = s.turn; return null;
}
function defect(s, x, to) { const from = x.cl; for (const p of Object.values(s.provs)) if (p.lord === x.id) p.lord = null; x.cl = to; x.loy = 55; x.rank = Math.min(x.rank, 2); x.loc = s.clans[to].capital || x.loc; x.acted = s.turn; if (from) assignLords(s, from); assignLords(s, to); }
function capture(s, c, by) { for (const p of Object.values(s.provs)) if (p.lord === c.id) p.lord = null; const from = c.cl; c.st = "cap"; c.capBy = by; c.loc = s.clans[by].capital; c.army = null; if (from) assignLords(s, from); }

// ---------- vazalové ----------
function promote(s, cid, id) { const c = chr(s, id); if (!c || c.cl !== cid || c.st !== "off") return "Není."; if (c.rank >= 4) return "Nejvyšší hodnost."; if (c.merit < RANKS[c.rank + 1].merit) return `Málo zásluh (${Math.round(c.merit)}/${RANKS[c.rank + 1].merit}).`; c.rank++; c.loy = Math.min(100, c.loy + 12); log(s, `${c.n} povýšen na hodnost ${RANKS[c.rank].n}.`, "vazalove", [cid]); return null; }
function reward(s, cid, id, g) { const c = chr(s, id); g = Math.floor(g); if (!c || c.cl !== cid) return "Není."; if (g <= 0) return "Zadej částku."; if (!pay(s, cid, g)) return "Nedostatek zlata."; const v = Math.round(g / (4 + c.rank * 2) * (c.traits.includes("lakomy") ? 1.4 : 1)); c.loy = Math.min(100, c.loy + v); log(s, `${c.n} obdržel dar ${g} zl (věrnost +${v}).`, "vazalove", [cid]); return null; }
function makeLord(s, cid, pid, id) { const p = s.provs[pid], c = chr(s, id); if (!p || p.owner !== cid || !c || c.cl !== cid || c.st !== "off") return "Nelze."; if (c.loc !== pid) return "Vazal musí být v kraji."; p.lord = id; c.loy = Math.min(100, c.loy + 6); log(s, `${c.n} se stal purkrabím kraje ${p.n}.`, "vazalove", [cid]); return null; }
function dismissOff(s, cid, id) { const c = chr(s, id); if (!c || c.cl !== cid || c.dyn || c.id === s.clans[cid].leader) return "Nelze propustit."; for (const p of Object.values(s.provs)) if (p.lord === id) p.lord = null; c.st = "wand"; c.cl = null; c.rank = 0; assignLords(s, cid); log(s, `${c.n} byl propuštěn ze služby.`, "vazalove", [cid]); return null; }
function captiveAction(s, cid, id, act) {
  const c = chr(s, id); if (!c || c.st !== "cap" || c.capBy !== cid) return "Není to tvůj zajatec.";
  const home = c.cl && s.clans[c.cl] && s.clans[c.cl].alive ? c.cl : null, isLeader = home && s.clans[home].leader === c.id;
  const free = () => { if (home) { c.st = "off"; c.loc = s.clans[home].capital; c.capBy = null; } else { c.st = "wand"; c.cl = null; c.capBy = null; } };
  switch (act) {
    case "propustit": free(); if (home) addRel(s, cid, home, 15); s.clans[cid].prestige += 5; log(s, `${c.n} propuštěn na svobodu.`, "vazalove", [cid, home]); return null;
    case "vykupne": {
      if (!home) return "Nemá komu zaplatit.";
      const amt = isLeader ? Math.round(300 + s.clans[home].prestige) : (c.rank + 1) * 60, H = s.clans[home];
      if (isPlayer(s, home)) { if (!s.events.some(e => e.id === "_ransom" && e.cid === c.id)) s.events.push({ id: "_ransom", from: cid, cid: c.id, amt }); return null; }
      if (H.gold >= amt && (isLeader || chance(s, 0.75))) { H.gold -= amt; s.clans[cid].gold += amt; free(); addRel(s, cid, home, 5); log(s, `${H.house} zaplatili výkupné ${amt} zl za ${c.n}.`, "vazalove", [cid, home]); return null; }
      return `${H.house} výkupné odmítli nebo nemají ${amt} zl.`;
    }
    case "naverbovat": {
      if (isLeader || c.dyn) return "Člen panovnického rodu nepřejde na tvou stranu.";
      if (chance(s, 0.15 + s.clans[cid].prestige / 2500 + (100 - c.loy) / 220)) { c.st = "off"; c.cl = cid; c.capBy = null; c.loy = rint(s, 45, 65); c.rank = Math.min(c.rank, 2); log(s, `${c.n} přísahal věrnost a vstoupil do služby.`, "vazalove", [cid]); return null; }
      c.loy = Math.min(100, c.loy + 5); log(s, `${c.n} odmítl změnit stranu.`, "vazalove", [cid]); return null;
    }
    case "popravit":
      c.st = "dead"; c.died = dateStr(s); s.clans[cid].prestige -= 10; s.pope.op[cid] = (s.pope.op[cid] || 0) - (isLeader ? 30 : 8);
      if (home) addRel(s, cid, home, isLeader ? -80 : -35); for (const o of officers(s, cid)) o.loy -= 3;
      log(s, `${c.n} byl popraven.`, "vazalove", [cid, home]); if (isLeader) heirSucceeds(s, home, "poprava"); return null;
  }
  return "Neznámá volba.";
}

// ---------- hospodářství rodu ----------
function price(s, g) { return GOODS[g].base * s.market[g] * s.inflation; }
function tradeGoods(s, cid, g, n, buy) {
  n = Math.floor(n); if (n <= 0) return "Zadej množství."; const C = s.clans[cid];
  const pr = price(s, g) * (buy ? 1.15 : 0.85) * (hasTech(s, cid, "mince") && buy ? 0.95 : 1), cost = Math.round(pr * n);
  if (buy) { if (C.gold < cost) return "Nedostatek zlata."; C.gold -= cost; C[g] = (C[g] || 0) + n; s.market[g] = Math.min(2, s.market[g] + n / 4000); }
  else { if ((C[g] || 0) < n) return "Tolik nemáš."; C[g] -= n; C.gold += cost; s.market[g] = Math.max(0.5, s.market[g] - n / 4000); }
  if (isPlayer(s, cid)) log(s, `${buy ? "Nakoupeno" : "Prodáno"}: ${n} × ${GOODS[g].n.toLowerCase()} za ${cost} zl.`, "obchod", [cid]);
  return null;
}
function setTax(s, cid, v) { s.clans[cid].tax = clamp(+v, 0, 4); return null; }
function setDeleg(s, cid, pid, v) { const p = s.provs[pid]; if (!p || p.owner !== cid) return "Není tvůj kraj."; p.deleg = !!v; return null; }
function maxLoan(s, cid) { return Math.round(300 + clanProvs(s, cid).length * 80); }
function borrow(s, cid, amt) { const C = s.clans[cid]; amt = Math.floor(amt); const d = sum(C.debts.map(x => x.amount)); if (amt <= 0) return "Zadej částku."; if (d + amt > maxLoan(s, cid)) return `Lombardští bankéři víc nepůjčí (strop ${maxLoan(s, cid)} zl).`; const rate = 0.015 + C.debts.length * 0.003; C.debts.push({ amount: amt, rate }); C.gold += amt; log(s, `Půjčka ${amt} zl, úrok ${r1(rate * 100)} % měsíčně.`, "hospodarstvi", [cid]); return null; }
function repay(s, cid, i) { const C = s.clans[cid], d = C.debts[i]; if (!d) return "Není."; if (C.gold < d.amount) return "Nedostatek zlata."; C.gold -= d.amount; C.debts.splice(i, 1); return null; }
function setResearch(s, cid, t) { const C = s.clans[cid]; if (C.techs[t] || !(TECHS[t].req || []).every(r => C.techs[r])) return "Nelze."; C.res.cur = t; return null; }
const techAvail = (s, cid, t) => !s.clans[cid].techs[t] && (TECHS[t].req || []).every(r => s.clans[cid].techs[r]);

// ---------- zákony a stavy (jen hráč) ----------
const LAW_EST = {
  robota: [{ sedlaci: 8 }, {}, { sedlaci: -12, slechta: 3 }],
  nastupnictvi: [{ slechta: -3 }, { slechta: 8 }, { slechta: 4 }],
  mesta: [{ mestane: -8, slechta: 5 }, {}, { mestane: 12, slechta: -8 }],
  cirkev: [{ duchovni: 10 }, {}, { duchovni: -18, slechta: 4 }],
  vojsko: [{ slechta: 5, sedlaci: -4 }, {}, { slechta: -5 }],
  mince: [{}, { mestane: -6 }, { mestane: -15, sedlaci: -5 }],
};
const TAX_EST = [10, 5, 0, -8, -18];
function estateTarget(s, e) {
  const C = P(s), rows = [["Základ", 50]];
  if (e === "sedlaci" || e === "mestane") rows.push(["Daně: " + TAX_LEVELS[C.tax], TAX_EST[C.tax]]);
  for (const [l, opts] of Object.entries(LAW_EST)) { const v = opts[C.laws[l]][e]; if (v) rows.push([LAWS[l].n + ": " + LAWS[l].opts[C.laws[l]], v]); }
  if (e === "slechta") { rows.push(["Prestiž rodu", clamp(Math.round((C.prestige - 200) / 40), -10, 12)]); const avg = officers(s, s.player).length ? sum(officers(s, s.player).map(c => c.rank)) / officers(s, s.player).length : 0; rows.push(["Hodnosti a léna", Math.round(avg * 3 - 4)]); }
  if (e === "duchovni") { rows.push(["Přízeň papeže", clamp(Math.round((s.pope.op[s.player] || 0) / 8), -12, 10)]); if (C.excom > s.turn) rows.push(["Klatba", -25]); rows.push(["Kláštery", Math.min(12, sum(clanProvs(s, s.player).map(p => (p.b.klaster || 0) * 2)))]); }
  if (e === "mestane") { rows.push(["Lokovaná města", Math.min(12, sum(clanProvs(s, s.player).map(p => (p.b.mesto || 0) * 2)))]); if (enemiesOf(s, s.player).length) rows.push(["Válka ruší obchod", -6]); }
  if (e === "sedlaci") { const ps = clanProvs(s, s.player); rows.push(["Spokojenost v krajích", Math.round((sum(ps.map(p => p.loy)) / Math.max(1, ps.length) - 50) / 3)]); }
  for (const m of C.mods) if (m.e === e && m.until > s.turn) rows.push([m.why, m.v]);
  return { rows, val: clamp(sum(rows.map(r => r[1])), 0, 100) };
}
function mod(s, e, v, dur, why) { P(s).mods.push({ e, v, until: s.turn + dur, why }); }
function setLaw(s, l, v) {
  const C = P(s); v = +v; if (C.laws[l] === v) return null;
  if ((C.lawCd[l] || 0) > s.turn) return `Zákon lze znovu změnit až za ${C.lawCd[l] - s.turn} měsíců.`;
  if (C.prestige < 20) return "Nedostatek prestiže.";
  C.prestige -= 20; const old = C.laws[l]; C.laws[l] = v; C.lawCd[l] = s.turn + 24;
  if (l === "cirkev") s.pope.op[s.player] += (old - v) * 15;
  log(s, `Zákon „${LAWS[l].n}“: ${LAWS[l].opts[old]} → ${LAWS[l].opts[v]}.`, "politika", [s.player]); return null;
}
