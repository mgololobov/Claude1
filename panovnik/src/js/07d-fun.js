// Herní nápady pro pestrost: činy panovníka, turnaj, ambice a spory vazalů, zasedání rady,
// šířící se mor, hladomor, velká díla, kupecké zakázky, křížové výpravy a přídomky panovníků.

// ---------- činy panovníka ----------
const DEEDS = {
  hostina: { n: "Velká hostina", art: "dvur", cost: 80, d: "Vazalové +4 věrnosti, prestiž +5. Hosté někdy zapomenou na staré spory." },
  hon: { n: "Knížecí hon", art: "les", cost: 0, d: "Prestiž +3, vazalové v sídle +3 věrnosti. Kanec může panovníka zranit, v lesích lze potkat schopného muže." },
  turnaj: { n: "Rytířský turnaj", art: "turnaj", cost: 150, d: "Sjedou se rytíři z celé země. Panovník se může utkat v klání (minihra)." },
  pout: { n: "Pouť ke svatým ostatkům", art: "cirkev", cost: 60, d: "Přízeň papeže +10, prestiž +3. Cesta je nebezpečná." },
  objezd: { n: "Objezd země", art: "obchod", cost: 0, d: "Ve všech krajích spokojenost +4, prestiž +2." },
  soud: { n: "Soudní den", art: "dvur", cost: 0, d: "Urovná spor mezi vazaly, sedláci +5, stabilita se upevní." },
  audience: { n: "Audience nespokojených", art: "dvur", cost: 40, d: "Vazalové s věrností pod 50 získají +8." },
  studium: { n: "Rozprava s učenci", art: "uceni", cost: 20, d: "Body učenosti podle rozumu panovníka." },
};
function deedsLeft(s) { const C = P(s); return C.deedTurn === s.turn ? 0 : 1; }
function doDeed(s, k) {
  const C = P(s), L = leaderOf(s, s.player), D = DEEDS[k]; if (!D || !L) return "Neznámý čin.";
  if (C.deedTurn === s.turn) return "Panovník už tento měsíc vykonal svůj čin.";
  if (L.st === "cap") return "Panovník je v zajetí.";
  if (C.gold < D.cost) return `Čin stojí ${D.cost} zl.`;
  C.gold -= D.cost; C.deedTurn = s.turn; let msg = "";
  const offs = officers(s, s.player).filter(c => c.id !== C.leader);
  switch (k) {
    case "hostina": for (const c of offs) c.loy = Math.min(100, c.loy + 4); C.prestige += 5; if (chance(s, 0.4)) { const f = offs.find(c => c.feud); if (f) { endFeud(s, f, "usmířili se u poháru"); msg = " Dva znesváření páni se u poháru usmířili."; } } msg = "Hodovalo se do rána." + msg; break;
    case "hon": C.prestige += 3; for (const c of officersIn(s, C.capital)) c.loy = Math.min(100, c.loy + 3); msg = "Úlovek byl bohatý.";
      if (chance(s, 0.07)) { L.hp -= rint(s, 12, 28); msg += ` ${L.n} byl zraněn kancem!`; }
      if (chance(s, 0.15)) { const x = genOfficer(s, null, C.cul, C.capital, { st: "wand", rank: 0, loy: 0 }); x.uda = Math.max(x.uda, 60); msg += ` V lesích jste potkali zdatného lovce ${x.n} – můžeš ho najít rozkazem „Hledat schopné muže“.`; } break;
    case "turnaj": C.prestige += 10; for (const c of offs) if (st(c, "uda") > 50) c.loy = Math.min(100, c.loy + 3);
      if (L.sex === "m" && !L.c && age(s, L) >= 16 && age(s, L) <= 55) { s.events.push({ id: "_joust", r: 0, me: 0, foe: 0, foeName: genName(s, pick(s, ["de", "cz", "hu", "pl"]), "m"), foeUda: rint(s, 40, 85), log: [] }); msg = "Na kolbišti čeká soupeř – utkáš se?"; } else msg = "Turnaj se vydařil."; break;
    case "pout": s.pope.op[s.player] = Math.min(100, (s.pope.op[s.player] || 0) + 10); C.prestige += 3; C.piety += 10; msg = "Pouť se vydařila.";
      if (chance(s, 0.08)) { L.hp -= rint(s, 10, 25); msg += " Na cestě panovník onemocněl."; } break;
    case "objezd": for (const p of clanProvs(s, s.player)) if (!p.occ) p.loy = Math.min(100, p.loy + 4); C.prestige += 2; msg = "Lid viděl svého pána."; break;
    case "soud": { const f = offs.find(c => c.feud); if (f) { endFeud(s, f, "spor rozsoudil panovník"); msg = `Spor ${f.n} rozsouzen. `; } if (C.mods) mod(s, "sedlaci", 5, 6, "Soudní den"); if (C.stab < 1 && chance(s, 0.3)) changeStab(s, s.player, 1, "spravedlivé soudy"); msg += "Spravedlnosti bylo učiněno zadost."; break; }
    case "audience": { let n = 0; for (const c of offs) if (c.loy < 50) { c.loy += 8; n++; } msg = `Panovník vyslechl ${n} nespokojených vazalů.`; break; }
    case "studium": { const g = Math.round(8 + st(L, "roz") / 6); C.res.pts += g; msg = `Učenci přinesli nové myšlenky (+${g} učenosti).`; break; }
  }
  log(s, `${D.n}: ${msg}`, "panovnik", [s.player]); return null;
}

// ---------- rytířský turnaj (minihra) ----------
const AIMS = { hlava: { n: "Mířit na přilbu", pts: 3, hit: 0.45, d: "těžko se trefuje, ale soupeře může shodit ze sedla" }, stit: { n: "Mířit na štít", pts: 1, hit: 0.85, d: "jistý zásah, málo bodů" }, hrud: { n: "Mířit na hruď", pts: 2, hit: 0.65, d: "vyvážená volba" } };
function joustPass(s, ev, aim) {
  const L = leaderOf(s, s.player), A = AIMS[aim], foeAim = pick(s, Object.keys(AIMS)), F = AIMS[foeAim];
  const myUda = st(L, "uda"), guard = pick(s, Object.keys(AIMS)); // kde se soupeř kryje
  let txt = `${ev.r + 1}. nájezd: `;
  const myHit = chance(s, clamp(A.hit + (myUda - ev.foeUda) / 200 - (guard === aim ? 0.3 : 0), 0.05, 0.95));
  const foeHit = chance(s, clamp(F.hit + (ev.foeUda - myUda) / 200, 0.05, 0.95));
  if (myHit) { ev.me += A.pts; txt += `zasáhl jsi (${A.n.split(" ").pop()}, +${A.pts}). `; if (aim === "hlava" && chance(s, 0.35)) { ev.unhorsed = "foe"; txt += "Soupeř padá ze sedla! "; } } else txt += guard === aim ? "soupeř tvůj úder vykryl. " : "minul jsi. ";
  if (foeHit) { ev.foe += F.pts; txt += `Soupeř zasáhl (+${F.pts}).`; if (foeAim === "hlava" && chance(s, 0.25)) { ev.unhorsed = ev.unhorsed || "me"; txt += " Padáš z koně!"; } } else txt += "Soupeř minul.";
  ev.log.push(txt); ev.r++;
  if (ev.r >= 3 || ev.unhorsed) {
    const C = P(s), win = ev.unhorsed === "foe" || (!ev.unhorsed && ev.me > ev.foe), tie = !ev.unhorsed && ev.me === ev.foe;
    if (win) { C.prestige += 30; C.gold += 100; for (const c of officers(s, s.player)) c.loy = Math.min(100, c.loy + 2); ev.result = `Vítězství! Dáma podává panovníkovi věnec, prestiž +30 a cena 100 zl.`; }
    else if (tie) { C.prestige += 10; ev.result = "Nerozhodně – oba jste sklidili potlesk (prestiž +10)."; }
    else { C.prestige -= 5; ev.result = "Porážka. Soupeř sklízí slávu."; if (ev.unhorsed === "me" || chance(s, 0.15)) { L.hp -= rint(s, 8, 25); ev.result += ` ${L.n} se při pádu zranil.`; } }
    log(s, `Turnaj: ${ev.result}`, "panovnik", [s.player]); ev.done = true;
  }
}

// ---------- ambice a spory vazalů ----------
const AMBITIONS = { povyseni: "chce být povýšen", leno: "chce se stát purkrabím kraje", dar: "žádá dar (aspoň 100 zl)", urad: "chce dvorský úřad" };
function ambitionTick(s) {
  const C = P(s); if (!C || !C.alive) return;
  for (const c of officers(s, s.player)) {
    if (c.dyn || c.id === C.leader) continue;
    const isLord = Object.values(s.provs).some(p => p.lord === c.id), inOffice = Object.values(C.offices || {}).includes(c.id);
    if (!c.amb && chance(s, 0.012)) {
      const opts = []; if (c.rank < 4 && c.merit > RANKS[c.rank].merit) opts.push("povyseni"); if (!isLord) opts.push("leno"); if (!inOffice && c.rank >= 2) opts.push("urad"); opts.push("dar");
      c.amb = { t: pick(s, opts), since: s.turn, rank: c.rank, gifts: 0 };
      log(s, `${c.n} ${AMBITIONS[c.amb.t]}.`, "vazalove", [s.player]);
    }
    if (c.amb) {
      const a = c.amb, met = (a.t === "povyseni" && c.rank > a.rank) || (a.t === "leno" && isLord) || (a.t === "urad" && inOffice) || (a.t === "dar" && a.gifts >= 100);
      if (met) { c.loy = Math.min(100, c.loy + 15); log(s, `${c.n} je spokojen: přání splněno (věrnost +15).`, "vazalove", [s.player]); c.amb = null; }
      else if (s.turn - a.since >= 12) { c.loy -= 12; log(s, `${c.n} se cítí přehlížen – jeho přání se nesplnilo (věrnost −12).`, "vazalove", [s.player]); c.amb = null; }
    }
  }
  // spory
  if (chance(s, 0.03)) { const o = officers(s, s.player).filter(c => !c.dyn && !c.feud && c.id !== C.leader); if (o.length >= 2) { const a = pick(s, o), b = pick(s, o.filter(x => x !== a)); a.feud = b.id; b.feud = a.id; a.feudSince = s.turn; log(s, `Mezi ${a.n} a ${b.n} vypukl spor o hranice panství.`, "vazalove", [s.player]); } }
  for (const c of officers(s, s.player)) if (c.feud && c.feudSince != null && s.turn - c.feudSince >= 6 && !s.events.some(e => e.id === "_duel")) { const o = chr(s, c.feud); if (o && o.st === "off") s.events.push({ id: "_duel", a: c.id, b: o.id }); else c.feud = null; }
  for (const c of officers(s, s.player)) if (c.feud) c.loy -= 0.3;
}
function endFeud(s, c, why) { const o = chr(s, c.feud); c.feud = null; c.feudSince = null; if (o) { o.feud = null; o.feudSince = null; } if (why) log(s, `Spor ${c.n}${o ? " a " + o.n : ""}: ${why}.`, "vazalove", [s.player]); }

// ---------- zasedání rady ----------
const DEBATES = [
  { a: "marsal", b: "komori", t: "Zbrojit, nebo šetřit?", A: ["Naverbujme v sídle 600 pěších, nepřátelé se zbrojí.", s => { const C = P(s); if (C.gold < 60) return "Na zbrojení není zlato."; C.gold -= 60; s.provs[C.capital].troops.pesi += 600; return "Do sídla přibylo 600 pěších."; }], B: ["Vyberme zvláštní berni a naplňme komoru.", s => { P(s).gold += 180; for (const p of clanProvs(s, s.player)) p.loy -= 3; return "Komora je bohatší o 180 zl, lid reptá."; }] },
  { a: "sudi", b: "kancler", t: "Země, nebo diplomacie?", A: ["Ulevme lidu, ať je země klidná.", s => { for (const p of clanProvs(s, s.player)) p.loy = Math.min(100, p.loy + 5); P(s).gold -= 50; return "Spokojenost ve všech krajích +5."; }], B: ["Pošleme bohaté dary sousedům.", s => { const n = aliveClans(s).filter(o => o.id !== s.player && clanProvs(s, o.id).some(p => p.nb.some(x => s.provs[x].owner === s.player))); for (const o of n) addRel(s, s.player, o.id, 8); P(s).gold -= 80; return "Vztahy se sousedy se zlepšily."; }] },
  { a: "marsal", b: "kancler", t: "Válka, nebo mír?", A: ["Najděme v listinách nárok na sousední kraj.", s => { const t = Object.values(s.provs).find(p => p.owner !== s.player && p.nb.some(n => s.provs[n].owner === s.player) && !claimValid(s, s.player, p.id)); if (!t) return "Nárok se najít nepodařilo."; P(s).claims[t.id] = s.turn + 120; return `Získán nárok na kraj ${t.n}.`; }], B: ["Raději upevněme mír a stabilitu.", s => { P(s).mp.dip += 40; return "+40 bodů diplomacie."; }] },
  { a: "komori", b: "sudi", t: "Města, nebo šlechta?", A: ["Udělme městům výsady – obchod poroste.", s => { for (const p of clanProvs(s, s.player)) if (p.b.mesto || p.city) p.com += 3; if (P(s).estates) mod(s, "mestane", 8, 12, "Výsady městům"); return "Obchod ve městech vzrostl."; }], B: ["Odměňme věrnou šlechtu lény.", s => { for (const c of officers(s, s.player)) c.loy = Math.min(100, c.loy + 3); if (P(s).estates) mod(s, "slechta", 8, 12, "Léna pro šlechtu"); return "Vazalové +3 věrnosti."; }] },
];
function debateTick(s) {
  if (!chance(s, 0.06) || s.events.some(e => e.id === "_rada")) return;
  const C = P(s), i = rint(s, 0, DEBATES.length - 1), D = DEBATES[i];
  const pickOff = (k, ex) => officeHolder(s, s.player, k) || officers(s, s.player).filter(c => c.id !== C.leader && c.id !== ex).sort((a, b) => st(b, OFFICES[k].stat) - st(a, OFFICES[k].stat))[0];
  const a = pickOff(D.a), b = pickOff(D.b, a && a.id); if (!a || !b || a === b) return;
  s.events.push({ id: "_rada", di: i, a: a.id, b: b.id });
}

// ---------- mor ----------
function plagueTick(s) {
  const black = s.flags.blackDeath && s.flags.blackDeath > s.turn;
  for (const p of Object.values(s.provs)) {
    if (!p.plague) continue;
    p.pop = r1(Math.max(2, p.pop * (black ? 0.965 : 0.985))); loseMen(p.troops, Math.round(men(p.troops) * 0.02)); p.loy = Math.max(0, p.loy - 1);
    if (!((p.quar || 0) > s.turn)) for (const n of p.nb) { const q = s.provs[n]; if (!q.plague && !((q.immune || 0) > s.turn) && !((q.quar || 0) > s.turn) && chance(s, black ? 0.2 : 0.05)) { q.plague = black ? rint(s, 8, 14) : rint(s, 4, 9); if (q.owner === s.player) log(s, `Mor se rozšířil do kraje ${q.n}!`, "svet", [s.player]); } }
    if (--p.plague <= 0) { p.plague = 0; p.immune = s.turn + (black ? 120 : 60); if (p.owner === s.player) log(s, `Mor v kraji ${p.n} ustal.`, "svet", [s.player]); }
  }
  if (chance(s, 0.008)) { const p = pick(s, Object.values(s.provs)); p.plague = rint(s, 4, 8); news(s, `V kraji ${p.n} propukl mor.`, "svet", [p.owner]); }
  if (s.year === 1348 && s.month === 2 && !s.flags.bd) { s.flags.bd = 1; s.flags.blackDeath = s.turn + 30; for (const id of ["gorice", "viden", "kransko"]) s.provs[id].plague = 14; news(s, "Černá smrt! Z Itálie se do střední Evropy valí morová rána, jaká nemá pamětníka.", "svet"); if (P(s).alive) s.events.push({ id: "_cernasmrt" }); }
}
function quarantine(s, cid, pid) { const p = s.provs[pid]; if (!p || p.owner !== cid) return "Není tvůj kraj."; if ((p.quar || 0) > s.turn) return "Kraj už je v karanténě."; if (!pay(s, cid, 60)) return "Karanténa stojí 60 zl."; p.quar = s.turn + 12; p.com = Math.max(0, p.com - 4); log(s, `Kraj ${p.n} uzavřen do karantény na rok.`, "svet", [cid]); return null; }
function famineTick(s) {
  if (s.year === 1315 && s.month === 4 && !s.flags.famineStart) { s.flags.famineStart = 1; s.flags.famineUntil = s.turn + 30; news(s, "Začal Velký hladomor: bez ustání prší, obilí hnije na polích po celé Evropě.", "svet"); s.market.obili = 2; }
  if ((s.flags.famineUntil || 0) > s.turn && s.month === 8) s.flags.harvest = (s.flags.harvest || 1) * 0.55;
}

// ---------- velká díla ----------
const WORKS = {
  katedrala: { n: "Katedrála", cost: 2400, months: 36, art: "cirkev", d: "+1 prestiž a +0,2 přízně papeže měsíčně, spokojenost v sídle +10", ok: (s, cid, p) => p.id === s.clans[cid].capital && (p.b.klaster || 0) >= 1, req: "v sídle s klášterem" },
  most: { n: "Kamenný most", cost: 1400, months: 24, art: "stavba", d: "obchod kraje +15 a vyšší strop obchodu", ok: (s, cid, p) => ["praha", "rezno", "viden", "budin", "vratislav", "krakov", "magdeburg", "misen", "ulm", "pasov", "linec", "ostrihom", "plock"].includes(p.id), req: "v kraji na velké řece (Praha, Řezno, Vídeň, Budín…)" },
  palac: { n: "Královský palác", cost: 2000, months: 24, art: "rod", d: "+0,8 prestiže měsíčně, vazalové +3 věrnosti", ok: (s, cid, p) => p.id === s.clans[cid].capital && p.castle >= 3, req: "v sídle s hradem 3. úrovně" },
  univerzita: { n: "Generální studium (univerzita)", cost: 3000, months: 36, art: "uceni", d: "+4 body učenosti a +0,5 prestiže měsíčně", ok: (s, cid, p) => hasTech(s, cid, "univerzita") && (p.city || p.b.mesto), req: "ve městě, s objevem Univerzita" },
  poutni: { n: "Poutní chrám", cost: 1200, months: 18, art: "cirkev", d: "+0,3 přízně papeže měsíčně, spokojenost ve všech krajích +3", ok: () => true, req: "kdekoli" },
  hradby: { n: "Městské hradby", cost: 1000, months: 18, art: "stavba", d: "hradby kraje +200, hrad +1 úroveň obrany", ok: (s, cid, p) => p.city || p.b.mesto, req: "v lokovaném městě" },
};
function startWork(s, cid, wid, pid) {
  const C = s.clans[cid], W = WORKS[wid], p = s.provs[pid]; C.works = C.works || {};
  if (C.works[wid]) return "Toto dílo už stavíš nebo stojí."; if (!p || p.owner !== cid || p.occ) return "Vyber vlastní kraj."; if (!W.ok(s, cid, p)) return "Podmínka: " + W.req + ".";
  const first = Math.round(W.cost / 3); if (!pay(s, cid, first)) return `Zahájení stojí ${first} zl.`;
  C.works[wid] = { pid, left: W.months, pay: Math.round((W.cost - first) / W.months), done: false };
  news(s, `${C.house} zahájili stavbu: ${W.n} (${p.n}).`, "stavby", [cid]); return null;
}
function worksTick(s) {
  for (const C of aliveClans(s)) {
    const ws = C.works || {};
    for (const [wid, w] of Object.entries(ws)) {
      const W = WORKS[wid], p = s.provs[w.pid];
      if (!w.done) {
        if (p.owner !== C.id) { delete ws[wid]; continue; }
        if (C.gold >= w.pay && !p.occ) { C.gold -= w.pay; w.left--; }
        if (w.left <= 0) { w.done = true; if (wid === "most") { p.com += 15; p.comMax += 15; } if (wid === "hradby") { p.dur += 200; p.castle = Math.min(6, p.castle + 1); } news(s, `Dokončeno velké dílo: ${W.n} v kraji ${p.n} (${C.house})!`, "stavby", [C.id]); if (isPlayer(s, C.id)) s.events.push({ id: "_work", wid }); }
        continue;
      }
      if (p.owner !== C.id) continue;
      if (wid === "katedrala") { C.prestige += 1; s.pope.op[C.id] = Math.min(100, (s.pope.op[C.id] || 0) + 0.2); p.loy = Math.min(100, p.loy + 0.5); }
      if (wid === "palac") C.prestige += 0.8;
      if (wid === "univerzita") { C.res.pts += 4; C.prestige += 0.5; }
      if (wid === "poutni") s.pope.op[C.id] = Math.min(100, (s.pope.op[C.id] || 0) + 0.3);
    }
    // AI staví také
    if (!isPlayer(s, C.id) && C.gold > 1500 && chance(s, 0.03)) { for (const wid of Object.keys(WORKS)) { const p = clanProvs(s, C.id).find(q => WORKS[wid].ok(s, C.id, q)); if (p && !(C.works || {})[wid]) { startWork(s, C.id, wid, p.id); break; } } }
  }
}
const workBonus = (s, cid, wid) => !!(s.clans[cid].works && s.clans[cid].works[wid] && s.clans[cid].works[wid].done);

// ---------- kupecké zakázky ----------
const MERCHANTS = ["Benátští kupci", "Lübecká Hanza", "Florentští bankéři", "Kupci z Norimberka", "Vratislavští soukeníci", "Janovští loďaři"];
function contractTick(s) {
  s.contracts = s.contracts || [];
  for (const k of s.contracts.slice()) if (k.until <= s.turn) { if (k.accepted && !k.done) { P(s).prestige -= 10; log(s, `Zakázka pro ${k.from} propadla – zklamaní kupci šíří zprávy o tvé nespolehlivosti (prestiž −10).`, "obchod", [s.player]); } s.contracts = s.contracts.filter(x => x !== k); }
  if (s.contracts.filter(k => !k.accepted).length < 2 && chance(s, 0.12)) {
    const g = pick(s, ["obili", "kone", "zbroj"]), qty = { obili: rint(s, 4, 12) * 100, kone: rint(s, 4, 15) * 20, zbroj: rint(s, 4, 15) * 20 }[g];
    s.contracts.push({ id: "k" + s.nextId++, from: pick(s, MERCHANTS), g, qty, reward: Math.round(qty * GOODS[g].base * rint(s, 18, 26) / 10), until: s.turn + rint(s, 4, 9), accepted: false });
  }
}
function acceptContract(s, id) { const k = (s.contracts || []).find(x => x.id === id); if (!k) return "Zakázka už neplatí."; k.accepted = true; log(s, `Přijata zakázka: ${k.qty} × ${GOODS[k.g].n.toLowerCase()} pro ${k.from}.`, "obchod", [s.player]); return null; }
function deliverContract(s, id) {
  const k = (s.contracts || []).find(x => x.id === id), C = P(s); if (!k || !k.accepted) return "Nejdřív zakázku přijmi.";
  const key = k.g === "obili" ? "grain" : k.g; if ((C[key] || 0) < k.qty) return `Chybí ti ${k.qty - Math.floor(C[key] || 0)} × ${GOODS[k.g].n.toLowerCase()}.`;
  C[key] -= k.qty; C.gold += k.reward; C.prestige += 5; k.done = true; s.contracts = s.contracts.filter(x => x !== k);
  log(s, `Zakázka splněna: ${k.from} platí ${k.reward} zl.`, "obchod", [s.player]); return null;
}

// ---------- křížové výpravy ----------
function crusadeTick(s) {
  if (!s.clans.rad || !s.clans.rad.alive || (s.flags.nextCrusade || 30) > s.turn) return;
  s.flags.nextCrusade = s.turn + rint(s, 110, 170);
  news(s, `Papež ${s.pope.n} vyhlásil křížovou výpravu na pomoc Řádu německých rytířů proti pohanským Prusům a Litevcům.`, "cirkev");
  for (const C of aliveClans(s)) if (!isPlayer(s, C.id) && C.type !== "church" && chance(s, 0.25)) { loseMen(s.provs[C.capital].troops, 500); C.prestige += 20; s.pope.op[C.id] = Math.min(100, (s.pope.op[C.id] || 0) + 12); addRel(s, C.id, "rad", 15); }
  if (s.provs.kralovec.rel === "poh" && chance(s, 0.5)) { s.provs.kralovec.rel = "kat"; news(s, "Křižáci pokřtili Sambii.", "cirkev"); }
  if (P(s).alive && P(s).type === "dyn") s.events.push({ id: "_kriz" });
}

// ---------- přídomky panovníků ----------
const EPITHETS = [
  ["Veliký", (s, c) => realmProvs(s, c) >= 35], ["Vítězný", (s, c) => (s.clans[c].wins || 0) >= 10], ["Stavitel", (s, c) => Object.values(s.clans[c].works || {}).filter(w => w.done).length >= 2],
  ["Zlatý", (s, c) => s.clans[c].gold >= 5000], ["Pobožný", (s, c) => (s.pope.op[c] || 0) >= 90], ["Ukrutný", (s, c) => (s.clans[c].execs || 0) >= 3], ["Moudrý", (s, c) => Object.keys(s.clans[c].techs).length >= 12 && st(leaderOf(s, c), "roz") >= 75],
];
function epithetTick(s) {
  for (const C of aliveClans(s)) { const L = leaderOf(s, C.id); if (!L || L.epi || hasEpi(L.n)) continue; const e = EPITHETS.find(([, f]) => f(s, C.id)); if (e) { L.epi = e[0]; if (isPlayer(s, C.id) || C.t === "král") news(s, `Lid začal panovníkovi ${L.n} říkat „${e[0]}“.`, "rod", [C.id]); } }
}
const hasEpi = n => { const w = n.replace(/\(.*\)/, "").trim().split(" "); const l = w[w.length - 1]; return w.length > 1 && /[ýí]$/.test(l) && !/(ský|cký)$/.test(l); };
const dispName = c => (c ? c.n + (c.epi ? " " + c.epi : "") : "—");

function funTick(s) { plagueTick(s); famineTick(s); worksTick(s); contractTick(s); crusadeTick(s); epithetTick(s); ambitionTick(s); debateTick(s); }
