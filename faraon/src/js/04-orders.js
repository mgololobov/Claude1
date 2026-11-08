// Rozkazy úředníkům, stavby, výpravy, vědění, zákony, hrobka a trh (platí pro hráče i umělou inteligenci).

function cmdCheck(s, cid, c) {
  if (!c || c.cl !== cid || c.st !== "off") return "Není to tvůj úředník.";
  if (c.army) return "Úředník velí vojsku v poli.";
  if (c.away) return "Úředník je na výpravě.";
  if (c.moving) return "Úředník je na cestě.";
  if (c.acted === s.turn) return "Úředník už v tomto měsíci jedná.";
  const p = s.provs[c.loc]; if (!p || p.owner !== cid) return "Úředník není ve vlastním nomu.";
  if (p.siege) return "Nom je obléhán.";
  return null;
}
function pay(s, cid, deben, grain = 0) { const C = s.clans[cid]; if (C.deben < deben || C.grain < grain) return false; C.deben -= deben; C.grain -= grain; return true; }
function expAvail(s, cid, e) { const E = EXPED[e]; if (E.tech && !hasTech(s, cid, E.tech)) return `Chybí vědění ${TECHS[E.tech].n}.`; if (!E.from.some(id => s.provs[id].owner === cid)) return "Nevlastníš výchozí nom (" + E.from.map(id => s.provs[id].n).join(", ") + ")."; return null; }

function doCmd(s, cid, offId, cmd, arg, arg2) {
  const c = chr(s, offId), err = cmdCheck(s, cid, c); if (err) return err;
  const C = s.clans[cid], p = s.provs[c.loc], K = CMDS[cmd]; if (!K) return "Neznámý rozkaz.";
  const me = isPlayer(s, cid), say = t => { if (me) log(s, `${c.n}: ${t}`, "rozkazy", [cid]); return null; };
  const cm = costMult(s, cid), cost = Math.round((K.cost || 0) * (cmd === "zavlaha" || cmd === "hradby" ? cm : 1)), gcost = Math.round((K.grain || 0) * (cmd === "zavlaha" || cmd === "hradby" ? cm : 1));
  switch (cmd) {
    case "zavlaha": case "remesla": {
      const key = cmd === "zavlaha" ? "agri" : "com", capv = cmd === "zavlaha" ? agriCap(s, p) : comCap(s, p);
      if (p[key] >= capv) return "Nom už je plně rozvinutý.";
      if (!pay(s, cid, cost, gcost)) return `Nedostatek debenů nebo obilí (${cost} debenů, ${gcost} charů).`;
      let g = (st(c, "spr") / 12 + rnd(s) * 3) * (1 - p[key] / capv * 0.45) * (cmd === "zavlaha" ? [1, 1, 1.1][lw(s, cid, "tresty")] : 1);
      if (cmd === "zavlaha") { g *= [0.85, 1, 1.2][C.laws.robota]; if (s.month < 4) g *= 1.3; }
      g = Math.max(1, Math.round(g));
      p[key] = Math.min(capv, p[key] + g); c.merit += 4; if (cmd === "zavlaha" && C.laws.robota === 2) p.loy = Math.max(0, p.loy - 2);
      c.acted = s.turn; return say(`${K.n} v nomu ${p.n}: +${g} (nyní ${p[key]}/${capv})${cmd === "zavlaha" && s.month < 4 ? " – v době záplavy je robotníků dost" : ""}.`);
    }
    case "hradby": {
      if (p.dur >= durMax(s, p)) return "Hradby jsou v pořádku.";
      if (!pay(s, cid, cost, gcost)) return "Nedostatek debenů nebo obilí.";
      const g = Math.round(st(c, "spr") / 2 + 10 + rnd(s) * 10); p.dur = Math.min(durMax(s, p), p.dur + g); c.merit += 3;
      c.acted = s.turn; return say(`Opravy hradeb v nomu ${p.n}: +${g}.`);
    }
    case "odvod": {
      const type = arg || "kopinici"; const e = canRecruitType(s, cid, p, type); if (e) return e;
      let n = Math.floor(+arg2 || maxRecruit(s, p, c)); n = Math.min(n, maxRecruit(s, p, c));
      if (type === "medzajove") n = Math.min(n, 400 + st(c, "roz") * 4);
      if (n < 50) return "V nomu už nejsou volní muži (strop posádky " + troopCap(p) + ").";
      const rc = recruitCost(s, cid, type, n);
      if (C.deben < rc.deben) return `Nedostatek debenů na výzbroj (${rc.deben}).`;
      if (rc.horses && C.kone < rc.horses) return `Chybí koně (${rc.horses}, máš ${C.kone}).`;
      C.deben -= rc.deben; C.kone -= rc.horses;
      const newTr = type === "medzajove" ? 55 : [18, 28, 42][C.laws.vojsko], old = men(p.troops);
      p.train = Math.round((p.train * old + newTr * n) / (old + n)); p.troops[type] = (p.troops[type] || 0) + n;
      if (type !== "medzajove") { p.pop = Math.max(1, r1(p.pop - n / 2500)); p.loy = Math.max(0, p.loy - n / 200); }
      c.merit += 4; c.acted = s.turn; return say(`Povoláno ${n} mužů (${TROOPS[type].n}) v nomu ${p.n} za ${rc.deben} debenů.`);
    }
    case "vycvik": {
      if (p.train >= 100) return "Vojsko je dokonale vycvičené."; if (!men(p.troops)) return "Není koho cvičit.";
      if (!pay(s, cid, cost)) return "Nedostatek debenů.";
      const g = Math.round(st(c, "ved") / 9 + st(c, "uda") / 18 + rnd(s) * 4 + (hasTech(s, cid, "zapas") ? 3 : 0)); p.train = Math.min(100, p.train + g); c.merit += 3;
      c.acted = s.turn; return say(`Výcvik v nomu ${p.n}: +${g} (nyní ${Math.round(p.train)}).`);
    }
    case "rozdat": {
      const g = Math.round(+arg || p.pop * 1000 * 0.6); if (C.grain < g) return `Nedostatek obilí (${fmtN(g)} charů).`;
      C.grain -= g; p.stock += g; const v = Math.round(st(c, "spr") / 12 + 4 + rnd(s) * 4 + (p.hunger > 0 ? 6 : 0)); p.loy = Math.min(100, p.loy + v); c.merit += 3;
      if (me && C.estates) C.estates.lid = Math.min(100, C.estates.lid + 1);
      c.acted = s.turn; return say(`Rozděleno ${fmtN(g)} charů obilí do obecních sýpek v nomu ${p.n}, spokojenost +${v}.`);
    }
    case "scitani": {
      if (C.census > s.turn + 12) return "Soupis je ještě čerstvý.";
      if (!pay(s, cid, cost)) return "Nedostatek debenů.";
      C.census = s.turn + 24; for (const q of clanProvs(s, cid)) q.loy = Math.max(0, q.loy - 3); c.merit += 6;
      c.acted = s.turn; return say(`Proběhlo sčítání lidu a dobytka: na dva roky vyšší výnos daně ze sklizně.`);
    }
    case "obeti": {
      if (!pay(s, cid, cost, gcost)) return "Nedostatek debenů nebo obilí.";
      const v = r1(0.5 + st(c, "roz") / 80 + (p.b.chram || 0) * 0.4); C.maat = Math.min(100, C.maat + v); p.loy = Math.min(100, p.loy + 3); c.merit += 3;
      if (me && C.estates) C.estates.knezi = Math.min(100, C.estates.knezi + 2);
      c.acted = s.turn; return say(`Obětiny pro boha ${p.god} v nomu ${p.n}: maat +${v}.`);
    }
    case "hledat": {
      if (!pay(s, cid, cost)) return "Nedostatek debenů.";
      const w = Object.values(s.chars).filter(x => x.st === "wand" && x.loc === p.id);
      c.merit += 2; c.acted = s.turn;
      if (w.length && chance(s, 0.35 + st(c, "roz") / 180 + (lw(s, cid, "skoly") === 2 ? 0.1 : 0))) {
        const x = w.sort((a, b) => sum(STAT_IDS.map(k => st(b, k))) - sum(STAT_IDS.map(k => st(a, k))))[0];
        if (chance(s, 0.5 + C.prestige / 1500 + st(c, "roz") / 400)) { x.st = "off"; x.cl = cid; x.loy = rint(s, 55, 80); x.rank = 0; x.merit = 0; return say(`našel muže jménem ${x.n} a ten vstoupil do služby! (${STAT_IDS.map(k => STATS[k].slice(0, 3) + " " + st(x, k)).join(", ")})`); }
        return say(`našel ${x.n}, ale ten službu odmítl.`);
      }
      if ((p.b.chram || p.flags.includes("c")) && chance(s, 0.25)) { const x = genOfficer(s, null, C.cul, p.id, { st: "wand", rank: 0, loy: 0, ved: rint(s, 10, 35), uda: rint(s, 10, 35), roz: rint(s, 50, 82), spr: rint(s, 50, 85) }); x.traits = ["hospodar"]; return say(`v chrámové škole se ozval nadaný písař ${x.n} – hledej dál a přijmi ho do služby.`); }
      if (chance(s, 0.15 + st(c, "roz") / 500)) { const x = genOfficer(s, null, C.cul, p.id, { st: "wand", rank: 0, loy: 0 }); return say(`zaslechl o schopném muži (${x.n}), který se toulá nomem.`); }
      return say("nikoho schopného nenašel.");
    }
    case "uceni": {
      if (!pay(s, cid, cost)) return "Nedostatek debenů.";
      const g = r1((st(c, "roz") / 7 + (p.b.chram || 0) * 3 + rnd(s) * 3) * researchMult(s, cid));
      C.res.pts += g; c.merit += 3; c.acted = s.turn; return say(`Dům života: písaři opisují a studují texty, +${g} bodů vědění.`);
    }
    case "stavba": {
      const b = arg; if (!BUILD[b]) return "Vyber stavbu."; const e = canBuild(s, cid, p, b); if (e) return e;
      const g = buildCost(s, cid, b, p); let disc = "";
      if ((b === "chram" || b === "pristav") && C.cedar > 0) { C.cedar--; g.deben = Math.round(g.deben * 0.75); disc = " (s cedrovým dřevem z Byblu levněji)"; }
      C.deben -= g.deben; C.grain -= g.grain;
      const t = Math.max(2, BUILD[b].time - (st(c, "spr") > 70 ? 1 : 0) - (hasTech(s, cid, "matematika") ? 1 : 0));
      p.build = { b, left: t, total: t };
      c.merit += 5; c.acted = s.turn; return say(`Zahájena stavba v nomu ${p.n}: ${BUILD[b].n} za ${fmtN(g.deben)} debenů a ${fmtN(g.grain)} charů obilí${disc} (asi ${t} měsíců).`);
    }
    case "vyprava": {
      const E = EXPED[arg]; if (!E) return "Vyber výpravu."; const e = expAvail(s, cid, arg); if (e) return e;
      const cost2 = 800 + E.months * 300, g2 = 3000 + E.months * 1500;
      if (!pay(s, cid, cost2, g2)) return `Výprava potřebuje ${cost2} debenů a ${fmtN(g2)} charů zásob.`;
      c.away = { exp: arg, until: s.turn + Math.max(2, E.months - (hasTech(s, cid, "osli") ? 1 : 0)) }; c.acted = s.turn;
      if (p.lord === c.id) p.lord = null; assignLords(s, cid);
      return say(`vyrazil na výpravu: ${E.n} (návrat asi za ${E.months} měsíce).`);
    }
    case "zvedy": {
      const t = s.provs[arg]; if (!t || t.owner === cid) return "Vyber cizí nom.";
      if (!pay(s, cid, cost)) return "Nedostatek debenů."; c.acted = s.turn;
      if (chance(s, 0.6 + st(c, "roz") / 250)) { t.spy[cid] = s.turn + 6; return say(`Zvědové zjistili stav nomu ${t.n} (platí 6 měsíců).`); }
      return say(`zvědové se z nomu ${t.n} nevrátili.`);
    }
    case "podnecovat": {
      const t = s.provs[arg]; if (!t || t.owner === cid) return "Vyber cizí nom."; if (!pay(s, cid, cost)) return "Nedostatek debenů."; c.acted = s.turn;
      const tl = chr(s, t.lord);
      if (chance(s, 0.3 + st(c, "roz") / 250 - (tl ? st(tl, "roz") / 400 : 0))) { const d = rint(s, 8, 18); t.loy = Math.max(0, t.loy - d); t.troops.kopinici = Math.round((t.troops.kopinici || 0) * 0.93); return say(`V nomu ${t.n} vypukly nepokoje (spokojenost −${d}).`); }
      addRel(s, cid, t.owner, -10); if (chance(s, 0.2)) { capture(s, c, t.owner); return say(`byl dopaden při podněcování v nomu ${t.n} a zajat!`); } return say(`podněcování v nomu ${t.n} se nezdařilo a bylo odhaleno.`);
    }
    case "naklonit": {
      const x = chr(s, arg); if (!x || x.st !== "off" || x.cl === cid) return "Vyber cizího úředníka."; if (x.id === s.clans[x.cl].leader || x.dyn) return "Vládce ani jeho příbuzné nelze naklonit.";
      const cst = cost + x.rank * 250; if (!pay(s, cid, cst)) return "Nedostatek debenů (" + cst + ")."; c.acted = s.turn;
      const pch = 0.25 + (st(c, "roz") - x.loy) / 150 + (C.prestige - s.clans[x.cl].prestige) / 2000 - (x.traits.includes("verny") ? 0.2 : 0);
      if (chance(s, clamp(pch, 0.05, 0.85))) {
        x.loy = Math.max(0, x.loy - rint(s, 10, 22)); x.tempt = cid;
        if (x.loy < 25 && chance(s, 0.5)) { if (tryDefect(s, x, cid)) return null; }
        return say(`věrnost úředníka ${x.n} k jeho pánovi poklesla (nyní ${Math.round(x.loy)}).`);
      }
      addRel(s, cid, x.cl, -8); return say(`${x.n} dary odmítl a pánovi vše oznámil.`);
    }
    case "presun": {
      const t = s.provs[arg]; if (!t || t.owner !== cid || t.id === p.id) return "Vyber jiný vlastní nom.";
      c.moving = { to: t.id, at: s.turn + 1 }; c.acted = s.turn; if (p.lord === c.id) p.lord = null; assignLords(s, cid);
      return say(`odjíždí do nomu ${t.n}.`);
    }
  }
  return "Neznámý rozkaz.";
}
const fmtN = v => Math.round(v).toLocaleString("cs-CZ");
function researchMult(s, cid) { const C = s.clans[cid]; let m = (hasTech(s, cid, "matematika") ? 1.25 : 1) * (hasTech(s, cid, "papyrdilny") ? 1.1 : 1) * [0.9, 1, 1.15][lw(s, cid, "skoly")]; if (isPlayer(s, cid) && C.estates) m *= 0.8 + C.estates.pisari / 250; return m; }

function capture(s, c, by) { c.st = "cap"; c.capBy = by; c.army = null; for (const p of Object.values(s.provs)) if (p.lord === c.id) p.lord = null; for (const C of Object.values(s.clans)) for (const k in C.offices) if (C.offices[k] === c.id) C.offices[k] = null; }

// Úředník přejde k jinému rodu – je-li správcem pohraničního nomu, vezme ho s sebou.
function tryDefect(s, x, to) {
  const old = x.cl, T = s.clans[to]; if (!T || !T.alive || to === old) return false;
  const lordOf = Object.values(s.provs).find(q => q.lord === x.id && q.owner === old);
  if (lordOf && x.loy < 20 && lordOf.nb.some(n => s.provs[n].owner === to) && !lordOf.siege && lordOf.id !== s.clans[old].capital) {
    transferProv(s, lordOf.id, to, "zrada"); x.cl = to; x.loy = 60; x.tempt = null; addRel(s, to, old, -25);
    log(s, `${x.n} zradil svého pána (${clanName(s, old)}) a přešel s nomem ${lordOf.n} k rodu ${T.house}!${isPlayer(s, old) ? " " + qText(Q("amenemhat")) : ""}`, "intriky", [to, old]);
    return true;
  }
  if (x.army) return false;
  x.cl = to; x.loy = 55; x.tempt = null; x.loc = T.capital; x.rank = Math.max(0, x.rank - 1);
  for (const p of Object.values(s.provs)) if (p.lord === x.id) p.lord = null;
  for (const k in s.clans[old].offices) if (s.clans[old].offices[k] === x.id) s.clans[old].offices[k] = null;
  log(s, `${x.n} opustil službu u rodu ${s.clans[old].house} a přešel k rodu ${T.house}.`, "intriky", [to, old]);
  assignLords(s, old); assignLords(s, to); return true;
}

// ---------- výpravy (návrat) ----------
function expeditionReturn(s, c) {
  const E = EXPED[c.away.exp], C = s.clans[c.cl], me = isPlayer(s, c.cl); c.away = null;
  if (!C || !C.alive) { c.st = "wand"; return; }
  const home = s.provs[c.loc] && s.provs[c.loc].owner === c.cl ? c.loc : C.capital; c.loc = home;
  const risk = E.risk * (1.3 - st(c, "spr") / 200 - st(c, "ved") / 300) * (hasTech(s, c.cl, "osli") ? 0.67 : 1) * (E === EXPED.sinaj && hasTech(s, c.cl, "protosin") ? 0.6 : 1);
  if (chance(s, risk)) {
    if (chance(s, 0.4)) { die(s, c, `zahynul na výpravě (${E.foe})`); if (me) log(s, `Výprava „${E.n}“ se nevrátila: ${c.n} zahynul (${E.foe}).`, "vypravy", [c.cl]); return; }
    if (me) log(s, E.tech === "namorni" ? `${c.n} se po bouři vrátil z výpravy „${E.n}“ jen s hrstkou mužů a bez nákladu – jako hrdina příběhu o ztroskotaném námořníkovi ze Střední říše.` : `${c.n} se vrátil z výpravy „${E.n}“ s prázdnou – přepadli je ${E.foe}.`, "vypravy", [c.cl]); return;
  }
  const g = Math.round(rrange(s, E.deben[0], E.deben[1]) * (0.8 + st(c, "spr") / 250) * (E === EXPED.sinaj && hasTech(s, c.cl, "protosin") ? 1.2 : 1));
  const gq = Math.round(g * [1.2, 1, 0.85][lw(s, c.cl, "obchod")]);
  if (E === EXPED.punt && me) s.flags.punt_ok = 1;
  s.flags["exp_" + c.cl] = 1; C.deben += gq - g; C.deben += g; C.prestige += E.prestige; if (E.maat) C.maat = Math.min(100, C.maat + E.maat); if (E.cedar) C.cedar += 2; c.merit += 15;
  if (me) log(s, `${c.n} se vrátil z výpravy „${E.n}“: ${fmtN(gq)} debenů${E.cedar ? ", cedrové dřevo pro dvě stavby" : ""}, sláva +${E.prestige}${E.maat ? ", maat +" + E.maat : ""}.`, "vypravy", [c.cl]);
  else if (E.prestige >= 30) log(s, `${clanName(s, c.cl)}: výprava do země Punt se vrátila s kadidlem a myrhou.`, "svet", [c.cl]);
}

// ---------- vědění ----------
function techCost(s, cid, t) {
  let c = TECHS[t].cost; const others = borderClans(s, cid).concat(enemiesOf(s, cid));
  if (others.some(o => hasTech(s, o, t))) c *= 0.65; // znalost se šíří od sousedů a nepřátel
  return Math.round(c);
}
function techAvail(s, cid, t) { const T = TECHS[t]; return !hasTech(s, cid, t) && (!T.req || T.req.every(r => hasTech(s, cid, r))); }
function researchTick(s, cid) {
  const C = s.clans[cid]; if (!C.res.cur) return;
  const cost = techCost(s, cid, C.res.cur);
  if (C.res.pts >= cost) {
    C.res.pts -= cost; C.techs[C.res.cur] = 1;
    if (isPlayer(s, cid)) log(s, `Písaři a kněží si osvojili nové vědění: ${TECHS[C.res.cur].n}.${TECH_QUOTE[C.res.cur] ? " " + qText(Q(TECH_QUOTE[C.res.cur])) : ""}`, "vedeni", [cid]);
    if (C.res.cur === "pevnosti") for (const p of clanProvs(s, cid)) p.dur = Math.min(durMax(s, p), p.dur + 25);
    C.res.cur = null;
  }
  if (!C.res.cur && !isPlayer(s, cid)) { const av = TECH_IDS.filter(t => techAvail(s, cid, t)).sort((a, b) => techCost(s, cid, a) - techCost(s, cid, b)); if (av.length) C.res.cur = pick(s, av.slice(0, 3)); }
}

// ---------- zákony ----------
const LAW_EST = {
  robota: [{ lid: 8, nomarchove: -4 }, {}, { lid: -12, nomarchove: 6 }],
  nomarchove: [{ nomarchove: 15, pisari: -6 }, {}, { nomarchove: -20, pisari: 10 }],
  chramy: [{ knezi: 15, pisari: -4 }, {}, { knezi: -20, pisari: 6 }],
  vojsko: [{ nomarchove: 6, lid: -3 }, {}, { nomarchove: -6, lid: 3 }],
  nastupnictvi: [{}, { knezi: 3 }, { nomarchove: 6, knezi: -6 }],
  cizinci: [{ lid: 3, pisari: -2 }, {}, { lid: -5, pisari: 4 }],
  soudy: [{ lid: 5, nomarchove: -10, pisari: 6 }, {}, { nomarchove: 12, lid: -6 }],
  tresty: [{ lid: 8, nomarchove: -4 }, {}, { lid: -10, nomarchove: 4 }],
  sypky: [{ pisari: 4, lid: -6 }, {}, { lid: 8, pisari: -3 }],
  obchod: [{ nomarchove: -4, pisari: 3 }, {}, { knezi: 5, nomarchove: 3 }],
  skoly: [{ nomarchove: 8, pisari: -6 }, {}, { pisari: 12, nomarchove: -8 }],
};
function setLaw(s, cid, law, v) {
  const C = s.clans[cid]; v = +v; if (C.laws[law] === v) return null;
  if ((C.lawCd[law] || 0) > s.turn) return `Zákon lze znovu změnit až za ${C.lawCd[law] - s.turn} měsíců.`;
  const old = LAW_EST[law][C.laws[law]] || {}, nw = LAW_EST[law][v] || {};
  if (C.estates) for (const e of ESTATE_IDS) C.estates[e] = clamp(C.estates[e] - (old[e] || 0) + (nw[e] || 0), 0, 100);
  C.laws[law] = v; C.lawCd[law] = s.turn + 12;
  if (law === "chramy" && v === 2) C.maat = Math.max(0, C.maat - 5);
  log(s, `Vyhlášen nový zákon – ${LAWS[law].n}: ${LAWS[law].opts[v]}.`, "zakony", [cid]); return null;
}
function setTax(s, cid, v) { const C = s.clans[cid]; v = clamp(+v, 0, 4); if (C.tax === v) return null; if ((C.lawCd.tax || 0) > s.turn) return `Daň lze znovu změnit až za ${C.lawCd.tax - s.turn} měsíců.`; C.tax = v; C.lawCd.tax = s.turn + 6; log(s, `Daň ze sklizně stanovena na ${TAX_LEVELS[v].toLowerCase()} úrody.`, "zakony", [cid]); return null; }

// ---------- hrobka panovníka ----------
function tombCost(s, cid) { const C = s.clans[cid], k = (C.tomb.stage + 1) * costMult(s, cid) * (C.type === "kmen" ? 0.5 : C.t === "král" ? 1 : 0.6) * (hasTech(s, cid, "obelisky") ? 0.8 : 1); return { deben: Math.round(4000 * k), grain: Math.round(25000 * k), months: 6 }; }
function startTomb(s, cid) {
  const C = s.clans[cid]; if (C.tomb.active) return "Na hrobce se už pracuje."; if (C.tomb.stage >= TOMB_STAGES.length) return "Hrobka je dokončena.";
  const t = tombCost(s, cid); let d = t.deben; if (C.cedar > 0) { C.cedar--; d = Math.round(d * 0.8); }
  if (!pay(s, cid, d, t.grain)) return `Potřebuješ ${fmtN(d)} debenů a ${fmtN(t.grain)} charů obilí pro robotníky.`;
  C.tomb.active = true; C.tomb.left = t.months;
  if (isPlayer(s, cid)) log(s, `Zahájena další fáze stavby (${C.tombN}): ${TOMB_STAGES[C.tomb.stage]}.`, "stavby", [cid]);
  return null;
}
function tombTick(s, cid) {
  const C = s.clans[cid]; if (!C.tomb.active) return;
  C.tomb.left -= (s.month < 4 ? 2 : 1) * (hasTech(s, cid, "pyrmesta") ? 1.5 : 1); // za záplavy je robotníků nejvíc
  if (C.tomb.left <= 0) { C.tomb.active = false; C.tomb.stage++; C.maat = Math.min(100, C.maat + 3); C.prestige += 15;
    if (C.tomb.stage >= TOMB_STAGES.length) { C.maat = Math.min(100, C.maat + 10); C.prestige += 80; log(s, `${clanName(s, cid)}: hrobka panovníka ${leaderOf(s, cid).n} je dokončena a zádušní kult zajištěn.`, "stavby", [cid]); }
    else if (isPlayer(s, cid)) log(s, `Hrobka: dokončena fáze „${TOMB_STAGES[C.tomb.stage - 1]}“.`, "stavby", [cid]); }
}

// ---------- trh: směna obilí za debeny ----------
function marketCap(s, cid) { return Math.round(sum(clanProvs(s, cid).map(p => p.com)) * 4 + 800); }
function trade(s, cid, q) {
  const C = s.clans[cid]; q = Math.round(+q); if (!q) return "Zadej množství.";
  const used = C.last.traded === s.turn ? C.last.tradedQ || 0 : 0, capQ = marketCap(s, cid);
  if (Math.abs(q) + used > capQ) return `Kupci letos tolik nesmění – zbývá ${fmtN(capQ - used)} charů tento měsíc.`;
  const q0 = q;
  if (q > 0) { const d = Math.round(q * s.market.p * 1.25); if (C.deben < d) return `Nákup stojí ${fmtN(d)} debenů.`; C.deben -= d; C.grain += q; if (isPlayer(s, cid)) log(s, `Nakoupeno ${fmtN(q)} charů obilí za ${fmtN(d)} debenů.`, "hospodarstvi", [cid]); }
  else { q = -q; if (C.grain < q) return "Tolik obilí v sýpkách nemáš."; const d = Math.round(q * s.market.p * (lw(s, cid, "sypky") === 0 ? 1.0 : 0.8)); C.grain -= q; C.deben += d; if (isPlayer(s, cid)) log(s, `Prodáno ${fmtN(q)} charů obilí za ${fmtN(d)} debenů.`, "hospodarstvi", [cid]); }
  marketPress(s, cid, q0); C.last.traded = s.turn; C.last.tradedQ = used + Math.abs(q); return null;
}

// ---------- úředníci: povýšení, dary ----------
function promote(s, cid, id) { const c = chr(s, id); if (!c || c.cl !== cid) return "Není tvůj."; if (c.rank >= RANKS.length - 1) return "Nejvyšší hodnost."; if (c.merit < RANKS[c.rank + 1].merit) return `Málo zásluh (${Math.round(c.merit)}/${RANKS[c.rank + 1].merit}).`; c.rank++; c.loy = Math.min(100, c.loy + 10); log(s, `${c.n} povýšen na hodnost ${RANKS[c.rank].n}.`, "rozkazy", [cid]); return null; }
function gift(s, cid, id, amt) { const c = chr(s, id); if (!c || c.cl !== cid) return "Není tvůj."; amt = +amt || 300; if (!pay(s, cid, amt)) return "Nedostatek debenů."; const v = Math.round(amt / 60 * (c.traits.includes("chamtivy") ? 1.4 : 1)); c.loy = Math.min(100, c.loy + v); log(s, `${c.n} obdržel odměnu v hodnotě ${amt} debenů: věrnost +${v}.`, "rozkazy", [cid]); return null; }
function dismiss(s, cid, id) { const c = chr(s, id); if (!c || c.cl !== cid || c.dyn) return "Nelze."; if (c.army) return "Velí vojsku."; c.st = "wand"; c.cl = null; for (const p of Object.values(s.provs)) if (p.lord === c.id) p.lord = null; for (const k in s.clans[cid].offices) if (s.clans[cid].offices[k] === id) s.clans[cid].offices[k] = null; assignLords(s, cid); log(s, `${c.n} byl propuštěn ze služby.`, "rozkazy", [cid]); return null; }
