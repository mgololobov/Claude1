// Události s volbami (pro hráče). ch: pole voleb {t, ok, e} nebo funkce vracející pole.
const myRandProv = (s, f) => { const ps = clanProvs(s, s.player).filter(p => !p.siege && (!f || f(p))); return ps.length ? pick(s, ps).id : null; };
const pn = (s, id) => (s.provs[id] ? s.provs[id].n : "?");
const myLeader = s => leaderOf(s, s.player);

const EVENTS = {
  neuroda: { t: "Neúroda", c: s => s.month === 6, w: 5, txt: () => "Krupobití a deště zničily část úrody. Letošní žně budou slabé.", pre: s => { s.flags.harvest = 0.7; },
    ch: [{ t: "Nakoupit obilí do zásoby (−150 zl, +120 obilí)", ok: s => P(s).gold >= 150, e: s => { P(s).gold -= 150; P(s).grain += 120; return "Sýpky se plní."; } }, { t: "Přečkat", e: () => "Bude se šetřit." }] },
  uroda: { t: "Požehnaný rok", c: s => s.month === 7, w: 5, txt: () => "Pole se letos ohýbají pod klasy. Žně budou bohaté.", pre: s => { s.flags.harvest = 1.3; }, ch: [{ t: "Díky Bohu", e: () => "Stodoly budou plné." }] },
  mor: { t: "Morová nákaza", w: 2, c: s => s.turn > 12, init: s => ({ pid: myRandProv(s) }), txt: (s, e) => `V kraji ${pn(s, e.pid)} se šíří mor.`,
    ch: [{ t: "Uzavřít kraj (−80 zl, obchod −5)", ok: s => P(s).gold >= 80, e: (s, e) => { const p = s.provs[e.pid]; P(s).gold -= 80; p.com = Math.max(0, p.com - 5); p.pop = r1(p.pop * 0.95); return "Nákaza zůstala v jednom kraji."; } },
      { t: "Procesí a modlitby", e: (s, e) => { const p = s.provs[e.pid]; for (const id of [p.id, ...p.nb]) { const q = s.provs[id]; if (q.owner === s.player) q.pop = r1(q.pop * (hasTech(s, s.player, "medicina") ? 0.93 : 0.88)); } P(s).piety += 5; return "Mor se rozšířil do sousedních krajů."; } }] },
  kacir: { t: "Kacířský kazatel", w: 3, init: s => ({ pid: myRandProv(s) }), txt: (s, e) => `V kraji ${pn(s, e.pid)} káže potulný kazatel proti bohatství církve a lid se k němu hrne.`,
    ch: [{ t: "Vydat ho inkvizici (papež +8, spokojenost −8)", e: (s, e) => { s.pope.op[s.player] += 8; s.provs[e.pid].loy -= 8; mod(s, "duchovni", 8, 12, "Zákrok proti kacířům"); mod(s, "mestane", -5, 12, "Upálení kazatele"); return "Hranice vzplála."; } },
      { t: "Nechat ho kázat (papež −10, měšťané +5)", e: s => { s.pope.op[s.player] -= 10; mod(s, "duchovni", -10, 12, "Tolerance kacířů"); mod(s, "mestane", 5, 12, "Svoboda kázání"); return "Kněží zuří."; } }] },
  lapkove: { t: "Loupeživí rytíři", w: 4, init: s => ({ pid: myRandProv(s, p => p.ter === "l" || p.ter === "h" || p.ter === "k") }), txt: (s, e) => `Na cestách v kraji ${pn(s, e.pid)} přepadají kupce lapkové z lesního hrádku.`,
    ch: [{ t: "Vyslat posádku (riziko ztrát)", e: (s, e) => { const p = s.provs[e.pid]; if (men(p.troops) > 400 && chance(s, 0.4 + p.train / 200)) { P(s).gold += 60; P(s).prestige += 5; loseMen(p.troops, 40); return "Hrádek vypálen, kořist 60 zl."; } loseMen(p.troops, 120); p.com -= 4; return "Výprava se nezdařila."; } },
      { t: "Zaplatit jim (−60 zl)", ok: s => P(s).gold >= 60, e: s => { P(s).gold -= 60; return "Odtáhli jinam."; } }, { t: "Nevšímat si", e: (s, e) => { s.provs[e.pid].com = Math.max(0, s.provs[e.pid].com - 6); return "Kupci se kraji vyhýbají."; } }] },
  kometa: { t: "Vlasatice na nebi", w: 2, txt: () => "Na nebi se objevila kometa. Lid se bojí hněvu Božího.",
    ch: [{ t: "Nařídit modlitby (papež +4)", e: s => { s.pope.op[s.player] += 4; return "Kostely jsou plné."; } }, { t: "Prohlásit ji za znamení slávy rodu (prestiž +10)", e: s => { P(s).prestige += 10; return "Kronikáři píší o předzvěsti velikosti."; } }] },
  rytir: { t: "Potulný rytíř", w: 4, init: s => { const x = genOfficer(s, null, P(s).cul, P(s).capital, { st: "wand", rank: 1, loy: 0 }); x.uda = Math.max(x.uda, rint(s, 55, 85)); return { cid: x.id }; },
    txt: (s, e) => { const x = chr(s, e.cid); return `Ke dvoru přijel rytíř ${x.n} (vůdcovství ${st(x, "ved")}, udatnost ${st(x, "uda")}) a nabízí služby.`; },
    ch: [{ t: "Přijmout do služby (−40 zl)", ok: s => P(s).gold >= 40, e: (s, e) => { const x = chr(s, e.cid); P(s).gold -= 40; x.st = "off"; x.cl = s.player; x.loy = 70; return "Rytíř složil přísahu."; } }, { t: "Odmítnout", e: () => "Odjel k sousedům." }] },
  kupci: { t: "Benátští kupci", w: 3, txt: () => "Do země přijeli benátští kupci. Nabízejí výsadu na obchod se suknem a kořením.",
    ch: [{ t: "Udělit výsadu (+100 zl, měšťané +6)", e: s => { P(s).gold += 100; mod(s, "mestane", 6, 12, "Výsada kupcům"); return "Kupci se usadili."; } }, { t: "Vybrat vysoké clo (+150 zl, měšťané −5)", e: s => { P(s).gold += 150; mod(s, "mestane", -5, 12, "Vysoké clo"); return "Komora se plní."; } }] },
  spor: { t: "Spor vazalů", w: 4, c: s => officers(s, s.player).filter(c => !c.dyn).length >= 2, init: s => { const o = officers(s, s.player).filter(c => !c.dyn && c.id !== P(s).leader); const a = pick(s, o); const b = pick(s, o.filter(x => x !== a)); return { a: a.id, b: b ? b.id : a.id }; },
    txt: (s, e) => `${chr(s, e.a).n} a ${chr(s, e.b).n} se přou o les a dvě vsi a žádají tvůj soud.`,
    ch: s => [{ t: "Dát za pravdu prvnímu", e: (s, e) => { chr(s, e.a).loy += 10; chr(s, e.b).loy -= 12; return "Spor rozhodnut."; } }, { t: "Dát za pravdu druhému", e: (s, e) => { chr(s, e.b).loy += 10; chr(s, e.a).loy -= 12; return "Spor rozhodnut."; } }, { t: "Rozdělit napůl (podle rozumu panovníka)", e: (s, e) => { const ok = chance(s, st(myLeader(s), "roz") / 110); for (const id of [e.a, e.b]) chr(s, id).loy += ok ? 4 : -5; return ok ? "Oba odešli spokojeni." : "Nespokojen je každý."; } }] },
  stavitel: { t: "Mistr stavitel", w: 3, c: s => clanProvs(s, s.player).some(p => p.build), txt: () => "Mistr stavitel z Remeše nabízí, že urychlí tvé stavby.",
    ch: [{ t: "Najmout (−120 zl, stavby o 2 měsíce kratší)", ok: s => P(s).gold >= 120, e: s => { P(s).gold -= 120; for (const p of clanProvs(s, s.player)) if (p.build) p.build.left = Math.max(1, p.build.left - 2); return "Práce se zrychlila."; } }, { t: "Odmítnout", e: () => "Mistr odjel." }] },
  ucenec: { t: "Učenec z Paříže", w: 3, txt: () => "Mistr svobodných umění z pařížské univerzity hledá mecenáše.",
    ch: [{ t: "Přijmout ho (−60 zl, +30 učenosti)", ok: s => P(s).gold >= 60, e: s => { P(s).gold -= 60; P(s).res.pts += 30; return "Učenec pracuje v kapitulní škole."; } }, { t: "Poslat ho pryč", e: () => "Odešel k jinému dvoru." }] },
  legat: { t: "Papežský legát", w: 2, txt: s => `Legát papeže ${s.pope.n} žádá desátek na obranu Svaté země.`,
    ch: [{ t: s => `Zaplatit ${Math.round(Math.max(50, P(s).gold * 0.1))} zl (papež +15)`, e: s => { P(s).gold -= Math.round(Math.max(50, P(s).gold * 0.1)); s.pope.op[s.player] += 15; return "Legát je spokojen."; } }, { t: "Odmítnout (papež −15)", e: s => { s.pope.op[s.player] -= 15; mod(s, "duchovni", -8, 12, "Odmítnutí legáta"); return "Legát hrozí klatbou."; } }] },
  prusko: { t: "Výprava do Pruska", w: 2, c: s => s.clans.rad.alive && !s.flags.prusko, txt: () => "Řád německých rytířů volá křesťanská knížata k výpravě proti pohanským Prusům.",
    ch: [{ t: "Vyslat 800 mužů z hlavního kraje (prestiž +40, papež +20, vztah s Řádem +30)", ok: s => men(s.provs[P(s).capital].troops) > 1000, e: s => { loseMen(s.provs[P(s).capital].troops, 800); P(s).prestige += 40; s.pope.op[s.player] += 20; addRel(s, s.player, "rad", 30); s.flags.prusko = s.turn + 60; s.clans.rad.troopsBonus = true; for (const p of clanProvs(s, "rad")) p.troops.jizda += 150; return "Výprava pokřtila Sambii a rytíři chválí tvé jméno."; } },
      { t: "Poslat jen zlato (−150 zl, papež +8)", ok: s => P(s).gold >= 150, e: s => { P(s).gold -= 150; s.pope.op[s.player] += 8; addRel(s, s.player, "rad", 10); s.flags.prusko = s.turn + 60; return "Řád děkuje."; } }, { t: "Odmítnout", e: s => { s.flags.prusko = s.turn + 60; return "Rytíři si poradí sami."; } }] },
  pozar: { t: "Požár města", w: 3, init: s => ({ pid: myRandProv(s, p => p.b.mesto || p.city) }), txt: (s, e) => `Ve městě v kraji ${pn(s, e.pid)} vypukl požár.`, pre: (s, e) => { if (e.pid) s.provs[e.pid].com = Math.max(0, s.provs[e.pid].com - 8); },
    ch: [{ t: "Pomoci s obnovou (−80 zl, obchod +5, měšťané +5)", ok: s => P(s).gold >= 80, e: (s, e) => { P(s).gold -= 80; s.provs[e.pid].com += 5; mod(s, "mestane", 5, 12, "Pomoc po požáru"); return "Město se obnovuje."; } }, { t: "Ať si poradí sami", e: () => "Spáleniště doutná." }] },
  zila: { t: "Stříbrná žíla", w: 1, init: s => ({ pid: myRandProv(s, p => (p.ter === "h" || p.ter === "k") && !p.res.includes("stribro")) }), txt: (s, e) => `Havíři v kraji ${pn(s, e.pid)} narazili na stříbrnou rudu!`,
    ch: [{ t: "Povolat havíře a založit důl", e: (s, e) => { s.provs[e.pid].res.push("stribro"); return "Kraj má ložisko stříbra – postav důl."; } }] },
  nemoc: { t: "Panovník onemocněl", w: 2, c: s => age(s, myLeader(s)) > 30, txt: s => `${myLeader(s).n} ulehl s horečkou.`, pre: s => { myLeader(s).hp -= rint(s, 10, 25); },
    ch: [{ t: "Povolat lékaře z Montpellier (−60 zl)", ok: s => P(s).gold >= 60, e: s => { P(s).gold -= 60; myLeader(s).hp += 20; return "Lékař pomohl."; } }, { t: "Modlit se", e: s => { if (chance(s, 0.5)) myLeader(s).hp += 12; return "Bůh rozhodne."; } }] },
  zrada: { t: "Podezřelý purkrabí", w: 3, c: s => officers(s, s.player).some(c => c.loy < 30 && Object.values(s.provs).some(p => p.lord === c.id)), init: s => ({ cid: officers(s, s.player).find(c => c.loy < 30 && Object.values(s.provs).some(p => p.lord === c.id)).id }),
    txt: (s, e) => `Zvědové hlásí, že ${chr(s, e.cid).n} (věrnost ${Math.round(chr(s, e.cid).loy)}) tajně jedná se sousedy.`,
    ch: [{ t: "Zahrnout ho dary (−100 zl, věrnost +25)", ok: s => P(s).gold >= 100, e: (s, e) => { P(s).gold -= 100; chr(s, e.cid).loy += 25; return "Purkrabí přísahá věrnost."; } },
      { t: "Zbavit ho úřadu a uvěznit", e: (s, e) => { const c = chr(s, e.cid); for (const p of Object.values(s.provs)) if (p.lord === c.id) p.lord = null; c.st = "cap"; c.capBy = s.player; c.cl = null; assignLords(s, s.player); for (const o of officers(s, s.player)) o.loy -= 2; return "Zrádce sedí v žaláři."; } }, { t: "Nevěřit pomluvám", e: () => "Snad je to jen pomluva." }] },
};

const SPECIAL = {
  _war: { t: "Válka!", txt: (s, e) => `${s.clans[e.by].house} (${s.clans[e.by].n}) ti vyhlásili válku. Jejich vojsko čítá asi ${Math.round(clanMen(s, e.by) / 1000)} tisíc mužů.`, ch: [{ t: "Do zbraně!", e: () => "Země se chystá k boji." }] },
  _lost: { t: "Ztráta kraje", txt: (s, e) => `Hrad v kraji ${pn(s, e.pid)} padl do rukou rodu ${s.clans[e.by].house}.`, ch: [{ t: "Pomstíme se", e: () => "" }] },
  _succ: { t: "Nový vládce", txt: (s, e) => e.txt, ch: [{ t: "Ať vládne dlouho!", e: () => "" }] },
  _victory: { t: "Vítězství", txt: s => s.over.txt, ch: [{ t: "Hrát dál", e: () => "" }] },
  _callToArms: { t: "Spojenec žádá pomoc", txt: (s, e) => `${s.clans[e.ally].house} byli napadeni rodem ${s.clans[e.enemy].house} a žádají tě o pomoc.`,
    ch: [{ t: "Vstoupit do války", e: (s, e) => { if (!atWar(s, s.player, e.enemy)) { s.wars.push({ a: s.player, b: e.enemy, start: s.turn }); addRel(s, s.player, e.enemy, -40); addRel(s, s.player, e.ally, 15); } return "Jsme ve válce."; } },
      { t: "Odmítnout (spojenectví zanikne)", e: (s, e) => { delete s.alliances[pairKey(s.player, e.ally)]; addRel(s, s.player, e.ally, -40); P(s).prestige -= 25; return "Spojenec je zrazen."; } }] },
  _proposal: { t: (s, e) => "Poselstvo: " + s.clans[e.from].house, txt: (s, e) => { const F = s.clans[e.from], m = { spojenectvi: "nabízejí spojenectví", snatek: "navrhují sňatek mezi rody", mir: "žádají o mír", mir_zlato: "nabízejí zlato za mír", vazalstvi: "žádají, abys jim složil lenní hold", poddat: "nabízejí, že se stanou tvými vazaly", pomoc: "žádají o pomoc ve válce", pripojit: "" }[e.typ];
      return `Přijelo poselstvo rodu ${F.house} (${F.n}, vztah ${Math.round(rel(s, s.player, e.from))}). ${cap(m)}.`; },
    ch: (s, e) => [{ t: "Přijmout", e: (s, e) => acceptProposal(s, e) }, { t: "Odmítnout", e: (s, e) => { addRel(s, s.player, e.from, e.typ === "vazalstvi" ? -5 : -8); return "Poselstvo odjelo s nepořízenou."; } }] },
  _ransom: { t: "Výkupné", txt: (s, e) => `${s.clans[e.from].house} drží v zajetí ${chr(s, e.cid).n} a žádají výkupné ${e.amt} zl.`,
    ch: [{ t: (s, e) => `Zaplatit ${e.amt} zl`, ok: (s, e) => P(s).gold >= e.amt, e: (s, e) => { const c = chr(s, e.cid); if (c.st !== "cap") return "Už je volný."; P(s).gold -= e.amt; s.clans[e.from].gold += e.amt; c.st = "off"; c.capBy = null; c.loc = P(s).capital; c.loy = Math.min(100, c.loy + 15); return `${c.n} je zpět.`; } },
      { t: "Odmítnout", e: (s, e) => { const c = chr(s, e.cid); c.loy -= 15; return "Zajatec zůstává v žaláři."; } }] },
  _vote: { t: "Volba římského krále", txt: s => `Kurfiřti se scházejí ve Frankfurtu. Jako kurfiřt rozhodneš, komu dáš svůj hlas.`,
    ch: s => candidates(s).map(c => ({ t: c.n + (c.id === s.player ? " (ty)" : ""), e: s => { s.hre.playerVote = c.id; return "Hlas byl odevzdán."; } })) },
  krize_slechta: { t: "Šlechta se bouří", txt: s => `Páni (věrnost stavu ${Math.round(P(s).estates.slechta)}) se srocují a hrozí odbojem.`,
    ch: [{ t: "Rozdat léna a dary (−200 zl, šlechta +20)", ok: s => P(s).gold >= 200, e: s => { P(s).gold -= 200; mod(s, "slechta", 20, 24, "Dary šlechtě"); for (const o of officers(s, s.player)) o.loy += 5; return "Páni se uklidnili."; } },
      { t: "Nevšímat si", e: s => { for (const o of officers(s, s.player)) o.loy -= 12; return "Mnozí vazalové přemýšlejí o zradě."; } }] },
  krize_duchovni: { t: "Hrozba interdiktu", txt: () => "Biskupové hrozí uvalením interdiktu na tvé země.",
    ch: [{ t: "Ustoupit církvi (zákon: poslušnost Římu)", e: s => { P(s).laws.cirkev = 0; P(s).lawCd.cirkev = s.turn + 24; mod(s, "duchovni", 20, 24, "Ústupky církvi"); s.pope.op[s.player] += 15; return "Biskupové jsou usmířeni."; } },
      { t: "Vzdorovat (papež −30)", e: s => { s.pope.op[s.player] -= 30; for (const p of clanProvs(s, s.player)) p.loy -= 6; return "Kostely se zavírají."; } }] },
  krize_mestane: { t: "Města odmítají platit", txt: () => "Městské rady zavřely brány a žádají nová privilegia.",
    ch: [{ t: "Udělit privilegia (městská práva o stupeň výš)", e: s => { P(s).laws.mesta = Math.min(2, P(s).laws.mesta + 1); mod(s, "mestane", 15, 24, "Nová privilegia"); return "Brány se otevřely."; } },
      { t: "Snížit daně o stupeň", ok: s => P(s).tax > 0, e: s => { P(s).tax--; mod(s, "mestane", 8, 12, "Úleva městům"); return "Měšťané platí, ale méně."; } }] },
  krize_sedlaci: { t: "Selské bouře", txt: () => "Sedláci utíkají z půdy a v několika krajích vypálili panské dvory.", pre: s => { for (const p of clanProvs(s, s.player)) p.loy -= 8; },
    ch: [{ t: "Ulevit (daně o stupeň níž, sedláci +12)", ok: s => P(s).tax > 0, e: s => { P(s).tax--; mod(s, "sedlaci", 12, 24, "Úleva poddaným"); return "Útěky ustaly."; } }, { t: "Tvrdě zakročit", e: s => { for (const p of clanProvs(s, s.player)) { p.loy -= 5; loseMen(p.troops, 30); } mod(s, "sedlaci", -5, 12, "Krvavý zákrok"); return "Biřici pročesávají lesy."; } }] },
};
function acceptProposal(s, e) {
  const from = e.from, me = s.player, F = s.clans[from]; if (!F.alive) return "Rod už neexistuje.";
  switch (e.typ) {
    case "spojenectvi": s.alliances[pairKey(from, me)] = true; addRel(s, from, me, 10); return "Spojenectví uzavřeno.";
    case "snatek": { const theirs = marriageable(s, from)[0], mine = marriageable(s, me).find(c => !theirs || c.sex !== theirs.sex); if (!theirs || !mine) { addRel(s, from, me, 5); return "Vhodní snoubenci se nenašli, ale vztah se zlepšil."; } wed(s, mine, theirs); return `${mine.n} a ${theirs.n} jsou oddáni.`; }
    case "mir": case "mir_zlato": if (atWar(s, from, me)) makePeace(s, from, me); return "Uzavřen mír.";
    case "vazalstvi": makeVassal(s, me, from); return `Jsi vazalem rodu ${F.house}.`;
    case "poddat": makeVassal(s, from, me); return `${F.house} jsou tvými vazaly.`;
    case "pomoc": { const foe = enemiesOf(s, from).find(x => !atWar(s, me, x) && x !== me); if (foe) declareWar(s, me, foe, "pomoc spojenci"); return "Vstupuješ do války."; }
  }
  return "";
}

function evDef(id) { return EVENTS[id] || SPECIAL[id]; }
function rollEvents(s) {
  if (!P(s).alive || !chance(s, 0.3)) return;
  // volba krále: hlas hráče jako kurfiřta
  const pool = Object.entries(EVENTS).filter(([id, E]) => (!E.c || E.c(s)) && !(s.flags["ev_" + id] > s.turn));
  const tot = sum(pool.map(([, E]) => E.w || 1)); let x = rnd(s) * tot;
  for (const [id, E] of pool) { x -= E.w || 1; if (x <= 0) { const ev = Object.assign({ id }, E.init ? E.init(s) : {}); if ("pid" in ev && !ev.pid) return; if (E.pre) E.pre(s, ev); s.events.push(ev); s.flags["ev_" + id] = s.turn + 18; return; } }
}
function eventView(s, ev) {
  const E = evDef(ev.id), T = x => (typeof x === "function" ? x(s, ev) : x), chs = typeof E.ch === "function" ? E.ch(s, ev) : E.ch;
  return { t: T(E.t), txt: T(E.txt), ch: chs.map((c, i) => ({ i, t: T(c.t), ok: !c.ok || c.ok(s, ev) })) };
}
function resolveEvent(s, idx, ci) {
  const ev = s.events[idx]; if (!ev) return "Není událost.";
  const E = evDef(ev.id), chs = typeof E.ch === "function" ? E.ch(s, ev) : E.ch, c = chs[ci]; if (!c) return "Neplatná volba.";
  if (c.ok && !c.ok(s, ev)) return "Tuto možnost nelze zvolit.";
  if (E.pre && SPECIAL[ev.id] && !ev._pre) { E.pre(s, ev); ev._pre = 1; }
  const title = typeof E.t === "function" ? E.t(s, ev) : E.t, ct = typeof c.t === "function" ? c.t(s, ev) : c.t;
  const msg = c.e(s, ev); s.events.splice(idx, 1);
  if (!ev.id.startsWith("_") || ev.id === "_proposal" || ev.id === "_callToArms" || ev.id === "_ransom") log(s, `${title}: ${ct}. ${msg || ""}`, "udalosti", [s.player]);
  return null;
}
