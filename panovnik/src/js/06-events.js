// Události s volbami. Každá: t (název), c (podmínka), w (váha), init (data), txt, ch (volby: t, e = efekt vrací zprávu, ok = podmínka).
const provName = (s, id) => s.provinces[id] ? s.provinces[id].n : "?";
const randMyProv = (s, f) => { const ps = myProvs(s).filter(p => !p.occ && (!f || f(p))); return ps.length ? pick(s, ps).id : null; };
function strongestArmy(s) { return s.armies.slice().sort((a, b) => playerArmyPower(s, b) - playerArmyPower(s, a))[0]; }
// boj proti rebelům nebo královu vojsku (bez mapy)
function fightAbstract(s, enemyPower, label) {
  const a = strongestArmy(s); if (!a || !unitCount(a.units)) return { win: false, txt: "Neměl jsi vojsko, které by se postavilo." };
  const pA = playerArmyPower(s, a, true) * (0.8 + rnd(s) * 0.4), pB = enemyPower * (0.8 + rnd(s) * 0.4), win = pA > pB;
  applyLosses(s, a.units, win ? 0.1 : 0.35); a.morale = clamp(a.morale + (win ? 0.05 : -0.2), 0.4, 1.3);
  const txt = `Boj s ${label}: ${win ? "vítězství" : "porážka"} (síla ${Math.round(pA)} : ${Math.round(pB)}).`;
  s.battles = s.battles || []; s.battles.unshift({ d: dateStr(s), place: provName(s, a.loc), enemy: label, win, my: unitCount(a.units), en: "–", myLost: "–", enLost: "–", pA: Math.round(pA), pB: Math.round(pB), score: 0 });
  return { win, txt };
}

const EVENTS = {
  neuroda: { t: "Neúroda", c: s => s.season === 1, w: 6, txt: s => "Deště a krupobití zničily část úrody. Sedláci se bojí zimy. Zásoby obilí se ztenčily o čtvrtinu.",
    pre: s => { s.stock.obili *= 0.75; },
    ch: [{ t: "Otevřít panské sýpky lidu (−40 obilí, sedláci +8)", e: s => { s.stock.obili = Math.max(0, s.stock.obili - 40); mod(s, "sedlaci", 8, 6, "Pomoc v neúrodě"); return "Lid ti žehná."; } },
      { t: "Snížit dávky na rok (daň sedláků −1 úroveň)", ok: s => s.tax.sedlaci > 0, e: s => { s.tax.sedlaci--; mod(s, "sedlaci", 6, 4, "Úleva v neúrodě"); return "Sedláci si oddechli."; } },
      { t: "Nic nedělat", e: s => { for (const p of myProvs(s)) p.unrest += 8; return "Mezi sedláky to vře."; } }] },
  dobra_uroda: { t: "Požehnaný rok", c: s => s.season === 2, w: 5, txt: s => "Úroda se letos mimořádně vydařila. Stodoly praskají ve švech.",
    ch: [{ t: "Uskladnit (+25 % obilí ze zásob)", e: s => { s.stock.obili *= 1.25; return "Sýpky jsou plné."; } },
      { t: "Dožínková slavnost (sedláci +8, prestiž +3)", e: s => { mod(s, "sedlaci", 8, 6, "Dožínky"); s.prestige += 3; return "Lid slavil."; } }] },
  mor: { t: "Morová rána", c: s => s.turn > 8, w: 2, init: s => ({ pid: randMyProv(s) }), txt: (s, e) => `V provincii ${provName(s, e.pid)} se objevil mor. Lidé umírají po stovkách a hrozí, že se nákaza rozšíří.`,
    ch: [{ t: "Uzavřít cesty a dát do karantény (−60 zl, prosperita −10)", e: (s, e) => { s.money -= 60; const p = s.provinces[e.pid]; p.pop = Math.round(p.pop * (has(s, "medicina") ? 0.95 : 0.92)); p.prosp -= 10; return "Nákaza zůstala v jedné provincii."; } },
      { t: "Procesí a modlitby (zbožnost +8)", e: (s, e) => { s.piety += 8; const k = has(s, "medicina") ? 0.94 : 0.88; for (const p of myProvs(s)) if (p.id === e.pid || s.provinces[e.pid].nb.includes(p.id)) p.pop = Math.round(p.pop * k); return "Mor se šířil i do sousedních krajů."; } },
      { t: "Dvůr uprchne na venkovský statek (legitimita −5)", e: (s, e) => { s.legitimacy -= 5; for (const p of myProvs(s)) p.pop = Math.round(p.pop * (p.id === e.pid ? 0.88 : 0.97)); return "Rod je v bezpečí, lid reptá."; } }] },
  kacir: { t: "Kacířský kazatel", w: 3, init: s => ({ pid: randMyProv(s) }), txt: (s, e) => `V ${provName(s, e.pid)} káže potulný kazatel proti bohatství církve. Lid se k němu hrne, kněží žádají zákrok.`,
    ch: [{ t: "Upálit kacíře (duchovenstvo +10, měšťané −6)", e: (s, e) => { mod(s, "duchovni", 10, 8, "Zákrok proti kacířům"); mod(s, "mestane", -6, 6, "Upálení kazatele"); s.piety += 5; s.provinces[e.pid].unrest += 6; return "Hranice vzplála."; } },
      { t: "Nechat ho kázat (duchovenstvo −10, měšťané +5)", e: (s, e) => { mod(s, "duchovni", -10, 8, "Tolerance kacířů"); mod(s, "mestane", 5, 6, "Svoboda kázání"); s.piety -= 5; return "Kněží zuří."; } },
      { t: "Uspořádat učenou disputaci (kaplan)", ok: s => !!s.council.kaplan, e: s => { if (chance(s, 0.3 + cstat(s, "kaplan") * 0.04)) { s.piety += 6; s.prestige += 5; mod(s, "duchovni", 5, 6, "Vítězná disputace"); return "Kaplan kazatele přesvědčil a ten se kál."; } mod(s, "duchovni", -5, 6, "Prohraná disputace"); s.prestige -= 5; return "Kazatel kaplana zesměšnil!"; } }] },
  lupici: { t: "Loupeživí rytíři", w: 4, init: s => ({ pid: randMyProv(s, p => p.terrain === "les" || p.terrain === "hory" || p.terrain === "kopce") }), c: s => !!randMyProv(s, p => p.terrain === "les" || p.terrain === "hory" || p.terrain === "kopce"),
    txt: (s, e) => `Na cestách v ${provName(s, e.pid)} přepadají kupce lapkové z hrádku v lesích.`,
    ch: [{ t: "Vyslat vojsko (boj)", e: (s, e) => { const r = fightAbstract(s, 25 + s.turn / 3, "lapky"); if (r.win) { s.prestige += 6; s.money += 40; s.provinces[e.pid].prosp += 5; return r.txt + " Hrádek vypálen, kořist zabavena."; } s.provinces[e.pid].prosp -= 10; return r.txt; } },
      { t: "Zaplatit jim, ať táhnou jinam (−50 zl)", e: s => { s.money -= 50; s.prestige -= 3; return "Odtáhli."; } },
      { t: "Ignorovat", e: (s, e) => { s.provinces[e.pid].prosp -= 12; mod(s, "mestane", -5, 6, "Nebezpečné cesty"); return "Kupci se kraji vyhýbají."; } }] },
  kometa: { t: "Kometa na nebi", w: 2, txt: () => "Na nebi se objevila vlasatice. Lid šeptá o konci světa a o hněvu Božím.",
    ch: [{ t: "Nařídit postní dny a modlitby (zbožnost +10)", e: s => { s.piety += 10; mod(s, "duchovni", 4, 4, "Postní dny"); return "Kostely jsou plné."; } },
      { t: "Prohlásit ji za znamení slávy rodu (prestiž +8, zbožnost −5)", e: s => { s.prestige += 8; s.piety -= 5; return "Dvorní básníci skládají ódy."; } }] },
  rytir: { t: "Rytíř hledá službu", w: 4, txt: () => "Ke dvoru přijel zkušený rytíř se svou družinou a nabízí služby za žold.",
    ch: [{ t: "Přijmout (−70 zl, +1 setnina rytířů)", ok: s => s.money >= 70, e: s => { s.money -= 70; const a = s.armies[0]; if (a) a.units.rytiri = (a.units.rytiri || 0) + 1; return "Rytíř složil přísahu."; } },
      { t: "Odmítnout", e: () => "Rytíř odjel k sousedům." }] },
  kupci: { t: "Kupci z dálných krajů", w: 3, txt: () => "Do města přijela karavana s kořením a hedvábím. Kupci nabízejí zboží i spolupráci.",
    ch: [{ t: "Koupit 4 koření a 2 hedvábí (−300 zl)", ok: s => s.money >= 300, e: s => { s.money -= 300; s.stock.koreni += 4; s.stock.hedvabi += 2; return "Zboží je ve skladu."; } },
      { t: "Udělit jim výsadu (měšťané +8, duchovenstvo −3)", e: s => { mod(s, "mestane", 8, 8, "Výsada kupcům"); mod(s, "duchovni", -3, 6, "Cizí kupci"); return "Kupci se usadili."; } },
      { t: "Vybrat od nich clo (+60 zl)", e: s => { s.money += 60; mod(s, "mestane", -3, 4, "Vysoké clo"); return "Pokladna se plní."; } }] },
  spor: { t: "Spor dvou pánů", w: 5, init: s => ({ a: pick(s, NAMES_M) + " " + pick(s, SURNAMES), b: pick(s, NAMES_M) + " " + pick(s, SURNAMES) }), txt: (s, e) => `${e.a} a ${e.b} se přou o les a dvě vsi. Oba žádají tvůj soud a oba mají mocné přátele.`,
    ch: [{ t: (s, e) => `Rozhodnout pro ${e.a}`, e: s => { s.legitimacy += 2; mod(s, "slechta", -2, 4, "Nespokojená strana sporu"); return "Spor rozhodnut."; } },
      { t: "Rozdělit sporný majetek napůl", e: s => { if (chance(s, 0.5 + stat(ch(s, s.ruler), "dip") * 0.02)) { s.legitimacy += 4; mod(s, "slechta", 3, 4, "Moudrý soud"); return "Oba odešli spokojeni."; } mod(s, "slechta", -5, 4, "Nerozhodnost"); return "Ani jeden není spokojen."; } },
      { t: "Zabavit majetek koruně (+80 zl, šlechta −10)", e: s => { s.money += 80; mod(s, "slechta", -10, 8, "Zabavení majetku"); s.legitimacy -= 3; return "Majetek připadl tobě."; } }] },
  biskup: { t: "Uprázdněný biskupský stolec", w: 2, txt: () => "Zemřel biskup ve tvé zemi. Kapitula čeká, koho navrhneš – nebo zda necháš volbu na papeži.",
    ch: [{ t: "Dosadit svého věrného (+50 zl, duchovenstvo −8)", e: s => { s.money += 50; mod(s, "duchovni", -8, 8, "Dosazení biskupa"); s.piety -= 5; return "Nový biskup je tvůj muž."; } },
      { t: "Ponechat volbu církvi (duchovenstvo +6, zbožnost +6)", e: s => { mod(s, "duchovni", 6, 8, "Svobodná volba biskupa"); s.piety += 6; return "Řím je spokojen."; } }] },
  zradce: { t: "Zpronevěra v radě", w: 4, c: s => COUNCIL_IDS.some(k => councillor(s, k) && councillor(s, k).loyalty < 30), init: s => ({ seat: COUNCIL_IDS.find(k => councillor(s, k) && councillor(s, k).loyalty < 30), amt: Math.round(Math.max(0, s.money) * 0.15 + 30) }),
    txt: (s, e) => `Mistr šeptů přináší důkazy: ${councillor(s, e.seat) ? councillor(s, e.seat).name : "rádce"} (${COUNCIL[e.seat].n}) rozkrádá tvé peníze. Chybí ${e.amt} zl.`,
    pre: (s, e) => { s.money -= e.amt; },
    ch: [{ t: "Uvěznit a zabavit majetek (+60 zl)", ok: s => s.seat.zalar > 0, e: (s, e) => { const c = councillor(s, e.seat); s.council[e.seat] = null; delete s.chars[c.id]; s.money += 60; s.legitimacy += 2; mod(s, c.estate, -6, 6, "Uvěznění " + c.name); return "Zrádce je v žaláři."; } },
      { t: "Vyhnat ode dvora", e: (s, e) => { const c = councillor(s, e.seat); s.council[e.seat] = null; delete s.chars[c.id]; mod(s, c.estate, -3, 4, "Vyhnání " + c.name); return "Úřad je volný."; } },
      { t: "Odpustit (věrnost +30)", e: (s, e) => { councillor(s, e.seat).loyalty += 30; s.prestige -= 4; return "Rádce přísahá, že se polepší."; } }] },
  legat: { t: "Papežský legát", w: 2, txt: () => "Papežský legát žádá zvláštní daň na obranu Svaté země – desetinu tvé pokladny.",
    ch: [{ t: (s) => `Zaplatit (${Math.round(s.money * 0.1)} zl, zbožnost +15)`, e: s => { s.money -= Math.round(s.money * 0.1); s.piety += 15; mod(s, "duchovni", 6, 8, "Daň pro Svatou zemi"); return "Legát odjel spokojen."; } },
      { t: "Odmítnout (zbožnost −15, duchovenstvo −10)", e: s => { s.piety -= 15; mod(s, "duchovni", -10, 8, "Odmítnutí legáta"); return "Legát hrozí klatbou."; } }] },
  krizova: { t: "Výzva ke křížové výpravě", w: 1, c: s => s.turn > 12 && !s.wars.length, txt: () => "Papež vyhlásil křížovou výpravu. Celá křesťanská šlechta se zbrojí a očekává tvé rozhodnutí.",
    ch: [{ t: "Táhnout osobně (+50 prestiže, +40 zbožnosti; riziko smrti)", e: s => { const R = ch(s, s.ruler); s.prestige += 50; s.piety += 40; s.ap = 0; if (chance(s, 0.2)) { R.health = -1; return "Panovník padl ve Svaté zemi."; } if (chance(s, 0.3)) R.health -= 25; s.money += rint(s, 0, 200); return "Panovník se vrátil ověnčen slávou."; } },
      { t: "Poslat rytíře (−2 setniny rytířů, zbožnost +15)", ok: s => (totalUnits(s).rytiri || 0) >= 2, e: s => { const a = s.armies.find(x => (x.units.rytiri || 0) >= 2) || s.armies[0]; a.units.rytiri = Math.max(0, (a.units.rytiri || 0) - 2); s.piety += 15; s.prestige += 10; return "Rytíři odpluli."; } },
      { t: "Zaplatit výpravu (−150 zl, zbožnost +10)", ok: s => s.money >= 150, e: s => { s.money -= 150; s.piety += 10; return "Zlato poslouží Kristovým bojovníkům."; } },
      { t: "Ignorovat (zbožnost −20)", e: s => { s.piety -= 20; mod(s, "duchovni", -8, 8, "Zbabělost v kříži"); return "Kněží káží o tvé zbabělosti."; } }] },
  pozar: { t: "Požár", w: 3, init: s => ({ pid: randMyProv(s, p => p.b.trziste) || randMyProv(s) }), txt: (s, e) => `V ${provName(s, e.pid)} vypukl požár. Shořela tržnice a polovina dřevěných domů.`,
    pre: (s, e) => { const p = s.provinces[e.pid]; p.prosp -= 15; if (p.b.trziste > 1 && chance(s, 0.4)) p.b.trziste--; },
    ch: [{ t: "Pomoci s obnovou (−60 zl, −20 dřeva, měšťané +6)", ok: s => s.stock.drevo >= 20, e: (s, e) => { s.money -= 60; s.stock.drevo -= 20; s.provinces[e.pid].prosp += 10; mod(s, "mestane", 6, 6, "Pomoc po požáru"); return "Město se obnovuje."; } },
      { t: "Ať si poradí sami", e: () => "Trosky ještě dlouho doutnaly." }] },
  uprchlici: { t: "Uprchlíci", w: 3, c: s => aliveRivals(s).length > 0, txt: () => "Z válkou zpustošeného sousedství přicházejí stovky uprchlíků a prosí o půdu.",
    ch: [{ t: "Usadit je na pustých lánech (+700 obyvatel, nepokoje +5)", e: s => { const id = randMyProv(s) || s.capital; s.provinces[id].pop += 700; s.provinces[id].unrest += 5; return `Usadili se v ${provName(s, id)}.`; } },
      { t: "Odmítnout", e: () => "Uprchlíci táhnou dál." }] },
  stavitel: { t: "Mistr stavitel", w: 3, c: s => s.queue.length > 0, txt: () => "Slavný mistr stavitel z Paříže nabízí, že zrychlí tvé stavby.",
    ch: [{ t: "Najmout (−80 zl, všechny stavby o 1 období rychleji)", ok: s => s.money >= 80, e: s => { s.money -= 80; for (const q of s.queue) q.left = Math.max(1, q.left - 1); return "Práce se zrychlila."; } }, { t: "Odmítnout", e: () => "Mistr odjel." }] },
  ucenec: { t: "Učenec hledá mecenáše", w: 4, txt: () => "Ke dvoru přišel učenec s rukopisy o hvězdách, medicíně a mechanice. Hledá ochranu a stravu.",
    ch: [{ t: "Přijmout ho (−40 zl, +15 učenosti)", ok: s => s.money >= 40, e: s => { s.money -= 40; s.research.pts += 15; return "Učenec pracuje v knihovně."; } }, { t: "Poslat ho pryč", e: () => "Odešel k biskupovi." }] },
  pytlaci: { t: "Pytláci v oborách", w: 4, c: s => s.laws.lesy === 1, txt: () => "Hajní chytili pytláky v panské oboře. Podle práva jim hrozí useknutí ruky.",
    ch: [{ t: "Tvrdě potrestat (prestiž +3, sedláci −6)", e: s => { s.prestige += 3; mod(s, "sedlaci", -6, 6, "Krutý trest pytláků"); return "Výstraha pro ostatní."; } }, { t: "Omilostnit (sedláci +4, prestiž −2)", e: s => { mod(s, "sedlaci", 4, 4, "Milost pro pytláky"); s.prestige -= 2; return "Lid chválí tvou milost."; } }] },
  lichvari: { t: "Lombardští bankéři", w: 2, txt: () => "Lombardští bankéři chtějí ve tvém městě otevřít banku. Kněží proti lichvě brojí.",
    ch: [{ t: "Povolit (+100 zl hned, měšťané +5, duchovenstvo −6)", e: s => { s.money += 100; mod(s, "mestane", 5, 8, "Lombardská banka"); mod(s, "duchovni", -6, 8, "Povolení lichvy"); for (const d of s.debts) d.rate = Math.max(0.02, d.rate - 0.01); return "Banka otevřela a úroky klesly."; } },
      { t: "Zakázat (duchovenstvo +5)", e: s => { mod(s, "duchovni", 5, 6, "Zákaz lichvy"); return "Bankéři odjeli."; } }] },
  nemoc: { t: "Panovník onemocněl", w: 3, c: s => ch(s, s.ruler).age > 30, txt: s => `${ch(s, s.ruler).name} dostal horečku a ulehl. Lékaři se radí.`,
    pre: s => { ch(s, s.ruler).health -= rint(s, 8, 20); },
    ch: [{ t: "Povolat slavného lékaře (−50 zl, zdraví +15)", ok: s => s.money >= 50, e: s => { s.money -= 50; ch(s, s.ruler).health += has(s, "medicina") ? 22 : 15; return "Lékař pomohl."; } },
      { t: "Modlit se (zbožnost +4)", e: s => { s.piety += 4; if (chance(s, 0.5)) ch(s, s.ruler).health += 10; return "Bůh rozhodne."; } },
      { t: "Pustit žilou (domácí felčar)", e: s => { ch(s, s.ruler).health += chance(s, 0.5) ? 8 : -10; return "Felčar udělal, co uměl."; } }] },
  spion: { t: "Dopadený vyzvědač", w: 3, c: s => !!s.council.speh && aliveRivals(s).length > 0, init: s => ({ rid: pick(s, aliveRivals(s)).id }), txt: (s, e) => `Mistr šeptů dopadl vyzvědače, kterého poslal(o) ${s.rivals[e.rid].n}.`,
    ch: [{ t: "Popravit a veřejně odsoudit (prestiž +5, vztah −15)", e: (s, e) => { s.prestige += 5; s.rivals[e.rid].attitude -= 15; return "Výstraha všem."; } },
      { t: "Přetáhnout ho na naši stranu (přesné zprávy na 8 období)", e: (s, e) => { s.rivals[e.rid].intel = s.turn + 8; return "Dvojitý agent podává zprávy."; } },
      { t: "Potichu vyhostit (vztah +5)", e: (s, e) => { s.rivals[e.rid].attitude += 5; return "Diplomaticky vyřešeno."; } }] },
  svatba: { t: "Pozvání na svatbu", w: 4, init: s => ({ n: pick(s, NAMES_M) + " " + pick(s, SURNAMES) }), txt: (s, e) => `Mocný velmož ${e.n} žení syna a zve tě na hostinu.`,
    ch: [{ t: "Přijet s bohatým darem (−40 zl, šlechta +6, prestiž +3)", ok: s => s.money >= 40, e: s => { s.money -= 40; mod(s, "slechta", 6, 6, "Svatební dar"); s.prestige += 3; return "Byl jsi čestným hostem."; } },
      { t: "Poslat jen posla", e: s => { mod(s, "slechta", -2, 4, "Neúčast na svatbě"); return "Velmož je trochu uražen."; } }] },
  zima: { t: "Krutá zima", c: s => s.season === 3, w: 4, txt: () => "Mráz trvá už šest neděl. Dobytek hyne, zásoby mizí a vlci chodí až ke vsím.",
    pre: s => { s.stock.obili *= 0.88; for (const p of myProvs(s)) p.pop = Math.round(p.pop * 0.99); },
    ch: [{ t: "Rozdat dříví z panských lesů (−20 dřeva, sedláci +5)", ok: s => s.stock.drevo >= 20, e: s => { s.stock.drevo -= 20; mod(s, "sedlaci", 5, 4, "Dříví v zimě"); return "Lidé přečkají."; } }, { t: "Přečkat", e: () => "Jaro jednou přijde." }] },
  ruda: { t: "Nález ložiska", w: 2, c: s => !!randMyProv(s, p => (p.terrain === "hory" || p.terrain === "kopce") && !p.res.includes("zelezo")), init: s => ({ pid: randMyProv(s, p => (p.terrain === "hory" || p.terrain === "kopce") && !p.res.includes("zelezo")) }),
    txt: (s, e) => `Horníci v ${provName(s, e.pid)} narazili na bohatou železnou rudu.`,
    ch: [{ t: "Výborně! (ložisko železa v provincii)", e: (s, e) => { s.provinces[e.pid].res.push("zelezo"); return "Můžeš tam postavit důl."; } }] },
  dedic_turnaj: { t: "Pozvání na turnaj", w: 3, c: s => aliveRivals(s).some(r => r.attitude > 0), init: s => ({ rid: pick(s, aliveRivals(s).filter(r => r.attitude > 0)).id }), txt: (s, e) => `${s.rivals[e.rid].n} pořádá velký turnaj a zve tě do klání.`,
    ch: [{ t: "Bojovat osobně (podle udatnosti)", e: (s, e) => { const R = ch(s, s.ruler); if (chance(s, 0.3 + stat(R, "mil") * 0.03)) { s.prestige += 15; s.rivals[e.rid].attitude += 5; return "Zvítězil jsi v klání!"; } if (chance(s, 0.25)) R.health -= 15; s.prestige -= 3; return "Byl jsi vyhozen ze sedla."; } },
      { t: "Jen přihlížet (vztah +8)", e: (s, e) => { s.rivals[e.rid].attitude += 8; return "Pobyl jsi u sousedů jako host."; } }, { t: "Odmítnout", e: (s, e) => { s.rivals[e.rid].attitude -= 4; return "Soused je uražen."; } }] },
  kral_vojsko: { t: "Král svolává vojsko", w: 2, c: s => s.realm.title < 3 && !s.wars.length && unitCount(totalUnits(s)) > 6, txt: s => `${cap(s.liege.n)} táhne proti pohanům a žádá lenní službu – 4 setniny vojska.`,
    ch: [{ t: "Poslat 4 setniny (král +15, prestiž +5)", e: s => { let left = 4; for (const a of s.armies) for (const u of ["kopinici", "lucistnici", "hotovost", "kusinici", "zbrojnosi", "rytiri"]) { const n = Math.min(left, a.units[u] || 0); a.units[u] = (a.units[u] || 0) - n; left -= n; } s.liege.opinion += 15; s.prestige += 5; s.flags.kingArmyBack = s.turn + 3; return "Vojsko odtáhlo s králem."; } },
      { t: "Zaplatit štítné (−100 zl, král +5)", ok: s => s.money >= 100, e: s => { s.money -= 100; s.liege.opinion += 5; return "Král přijal peníze."; } },
      { t: "Odmítnout (král −20)", e: s => { s.liege.opinion -= 20; return "Král si to zapamatuje."; } }] },
  kral_prizen: { t: "Královská přízeň", w: 3, c: s => s.liege.opinion > 75 && s.realm.title < 3, txt: s => `${cap(s.liege.n)} si tě váží a nabízí odměnu za věrnost.`,
    ch: [{ t: "Dar ze královské komory (+150 zl)", e: s => { s.money += 150; s.liege.opinion -= 10; return "Pokladna se plní."; } },
      { t: "Čestný úřad u dvora (prestiž +20, legitimita +5)", e: s => { s.prestige += 20; s.legitimacy += 5; s.liege.opinion -= 10; return "Jsi královým číšníkem."; } },
      { t: "Listina s nárokem na sousední území", ok: s => aliveRivals(s).some(r => borders(s, r.id) && !s.claims[r.id]), e: s => { const r = pick(s, aliveRivals(s).filter(x => borders(s, x.id) && !s.claims[x.id])); s.claims[r.id] = true; s.liege.opinion -= 10; return `Získal jsi nárok vůči: ${r.n}.`; } }] },
};
const cap = t => t.charAt(0).toUpperCase() + t.slice(1);

// zvláštní události (krize, válka, mír, rod)
const SPECIAL = {
  _war: { t: "Válka!", txt: (s, e) => `${s.rivals[e.rid].n} ti vyhlásil(o) válku. Jejich vojsko (${rivalEstimate(s, s.rivals[e.rid]).txt}) se shromažďuje u hranic.`, ch: [{ t: "Do zbraně!", e: () => "Země se chystá k boji." }, { t: "Povolat hotovost", e: s => raiseLevy(s) || "Hotovost svolána." }] },
  _succ: { t: "Král je mrtev, ať žije král", txt: (s, e) => e.txt, ch: [{ t: "Ať vládne dlouho!", e: () => "Nová doba začíná." }] },
  _peace: {
    t: (s, e) => e.kind === "offer" ? "Nabídka míru" : e.kind === "demand" ? "Nepřítel žádá kapitulaci" : "Návrh příměří",
    txt: (s, e) => { const r = s.rivals[e.rid]; const w = atWarWith(s, e.rid); const sc = w ? warScore(s, w) : 0;
      if (e.kind === "offer") return `${r.n} žádá o mír a nabízí odškodné ${Math.round(clamp(r.treasury * 0.5, 30, 600))} zl. Stav války: ${sc}.`;
      if (e.kind === "demand") return `${r.n} vítězí (stav války ${sc}) a žádá tvou kapitulaci.`; return `${r.n} je válkou vyčerpán(o) a navrhuje bílý mír. Stav války: ${sc}.`; },
    ch: [{ t: "Přijmout", e: (s, e) => { const r = s.rivals[e.rid]; if (!atWarWith(s, e.rid)) return "Válka už skončila."; if (e.kind === "offer") { const g = Math.round(clamp(r.treasury * 0.5, 30, 600)); r.treasury -= g; s.money += g; s.prestige += 10; endWar(s, e.rid); return `Mír. Získáno ${g} zl.`; }
        if (e.kind === "demand") { makePeace(s, e.rid, { t: "kapitulace" }); return "Kapituloval jsi."; } endWar(s, e.rid); return "Bílý mír uzavřen."; } },
      { t: "Odmítnout a bojovat dál", e: (s, e) => { if (e.kind === "demand") s.legitimacy += 2; return "Válka pokračuje."; } }] },
  povstani: { t: "Selské povstání", txt: (s, e) => `V provincii ${provName(s, e.pid)} se sedláci chopili cepů a kos. Vypalují panské dvory.`,
    ch: [{ t: "Potlačit vojskem", e: (s, e) => { const p = s.provinces[e.pid]; const r = fightAbstract(s, p.pop / 1000 * 6, "povstalci"); if (r.win) { p.unrest = 25; p.pop = Math.round(p.pop * 0.95); mod(s, "sedlaci", -8, 8, "Krvavé potlačení"); s.prestige += 3; return r.txt + " Vůdci byli popraveni."; } p.occ = null; p.prosp -= 25; p.unrest = 60; s.prestige -= 15; return r.txt + " Povstalci plení kraj."; } },
      { t: "Vyjednat (daň sedláků −1, robota −1)", e: (s, e) => { s.tax.sedlaci = Math.max(0, s.tax.sedlaci - 1); s.laws.robota = Math.max(0, s.laws.robota - 1); s.provinces[e.pid].unrest = 30; s.prestige -= 8; mod(s, "sedlaci", 8, 8, "Ústupky povstalcům"); return "Sedláci se vrátili na pole."; } }] },
  krize_slechta: { t: "Šlechtická vzpoura", txt: s => `Nespokojení páni (věrnost ${Math.round(s.estates.slechta.loy)}, vliv ${s.estates.slechta.infl}) se spolčili a táhnou na tvé sídlo.`,
    ch: [{ t: "Utkat se se vzbouřenci", e: s => { const r = fightAbstract(s, s.estates.slechta.infl * 1.6 + s.turn / 3, "vzbouřenou šlechtou"); if (r.win) { s.prestige += 15; s.money += 100; mod(s, "slechta", 15, 10, "Pokořená vzpoura"); s.legitimacy += 5; return r.txt + " Statky vzbouřenců zabaveny."; } s.legitimacy -= 15; s.money = Math.round(s.money * 0.6); s.tax.slechta = 0; mod(s, "slechta", 20, 10, "Vynucené ústupky"); return r.txt + " Musel jsi přijmout jejich podmínky."; } },
      { t: "Ustoupit (daň šlechty 0, −100 zl, šlechta +20)", e: s => { s.tax.slechta = 0; s.money -= 100; s.prestige -= 15; mod(s, "slechta", 20, 10, "Ústupky šlechtě"); return "Páni se rozjeli domů."; } }] },
  krize_duchovni: { t: "Hrozba interdiktu", txt: () => "Biskupové hrozí, že na tvou zemi uvalí interdikt – žádné mše, křty ani pohřby.",
    ch: [{ t: "Podřídit se (vztah k církvi: poslušnost Římu, duchovní +20)", e: s => { s.laws.cirkev = 0; s.lawCd.cirkev = s.turn + 8; mod(s, "duchovni", 20, 10, "Podřízení církvi"); s.prestige -= 10; return "Biskupové jsou usmířeni."; } },
      { t: "Vzdorovat (zbožnost −25, legitimita −10, sedláci −8)", e: s => { s.piety -= 25; s.legitimacy -= 10; mod(s, "sedlaci", -8, 8, "Interdikt"); mod(s, "duchovni", 10, 6, "Interdikt vyhlášen"); return "Kostely se zavřely."; } }] },
  krize_mestane: { t: "Měšťané odmítají platit", txt: () => "Městské rady zavřely brány a odmítají odvádět daně, dokud jim nevrátíš jejich práva.",
    ch: [{ t: "Udělit privilegia (městská práva o stupeň výš)", e: s => { s.laws.mesta = Math.min(2, s.laws.mesta + 1); s.lawCd.mesta = s.turn + 8; mod(s, "mestane", 15, 10, "Nová privilegia"); return "Brány se otevřely."; } },
      { t: "Snížit jim daň o stupeň", ok: s => s.tax.mestane > 0, e: s => { s.tax.mestane--; mod(s, "mestane", 8, 6, "Úleva městům"); return "Měšťané platí, ale méně."; } },
      { t: "Vydržet (žádné daně z měst 3 období)", e: s => { s.flags.mestaneStrike = s.turn + 3; mod(s, "mestane", 10, 4, "Stávka skončí"); return "Města stávkují."; } }] },
  krize_sedlaci: { t: "Sedláci utíkají z půdy", txt: () => "Celé vsi se vylidňují – sedláci utíkají do lesů nebo k sousedům.",
    pre: s => { for (const p of myProvs(s)) p.pop = Math.round(p.pop * 0.97); },
    ch: [{ t: "Ulevit (daň sedláků −1, sedláci +10)", e: s => { s.tax.sedlaci = Math.max(0, s.tax.sedlaci - 1); mod(s, "sedlaci", 10, 8, "Úleva poddaným"); return "Útěky ustaly."; } },
      { t: "Pronásledovat uprchlíky (sedláci −5, nepokoje +10)", e: s => { for (const p of myProvs(s)) p.unrest += 10; mod(s, "sedlaci", -5, 6, "Hon na uprchlíky"); return "Biřici pročesávají lesy."; } }] },
  kral_berne: { t: "Královská berně", txt: (s, e) => `Královský výběrčí žádá roční berni: ${e.amount} zl. Přízeň krále: ${Math.round(s.liege.opinion)}.`,
    ch: [{ t: (s, e) => `Zaplatit celou (${e.amount} zl, král +5)`, ok: (s, e) => s.money >= e.amount, e: (s, e) => { s.money -= e.amount; s.liege.opinion += 5; return "Král je spokojen."; } },
      { t: (s, e) => `Zaplatit polovinu (${Math.round(e.amount / 2)} zl, král −6)`, ok: (s, e) => s.money >= e.amount / 2, e: (s, e) => { s.money -= Math.round(e.amount / 2); s.liege.opinion -= 6; return "Výběrčí odjel nespokojen."; } },
      { t: "Odmítnout (král −20, prestiž +3)", e: s => { s.liege.opinion -= 20; s.prestige += 3; return "Výběrčí odjel s prázdnou."; } }] },
  kral_trest: { t: "Královská trestná výprava", txt: s => `${cap(s.liege.n)} prohlásil tvé neposlušnosti za zradu a táhne s vojskem na tvé panství.`,
    ch: [{ t: "Podrobit se (−40 % pokladny, prestiž −20, král +35)", e: s => { s.money = Math.round(s.money * 0.6); s.prestige -= 20; s.liege.opinion += 35; s.flags.punished = s.turn; return "Klečel jsi před králem."; } },
      { t: "Postavit se králi v poli", e: s => { s.flags.punished = s.turn; const r = fightAbstract(s, 70 + s.turn * 0.8, "královským vojskem"); if (r.win) { s.prestige += 50; s.legitimacy += 10; s.liege.opinion = 40; return r.txt + " Král uznal tvou moc a uzavřel smír."; } s.money = Math.round(s.money * 0.4); s.prestige -= 40; s.legitimacy -= 15; s.liege.opinion = 45; return r.txt + " Král vyplenil tvé sídlo."; } }] },
  vychova: { t: "Výchova potomka", txt: (s, e) => { const c = ch(s, e.cid); return c ? `${c.name} dosáhl(a) šesti let. Komu svěříš výchovu?` : "Dítě již nežije."; },
    ch: [["dip", "Kancléři – diplomacie"], ["mil", "Maršálkovi – válečnictví"], ["spr", "Purkrabímu – správa"], ["uce", "Kaplanovi – učenost"], ["int", "Mistru šeptů – intriky"]].map(([k, t]) => ({ t, e: (s, e) => { const c = ch(s, e.cid); if (c) c.focus = k; return "Výchova začala."; } })) },
  vdovec: { t: "Sňatek panovníka", txt: s => `${ch(s, s.ruler).name} nemá choť. Rádci naléhají, aby uzavřel(a) sňatek a zajistil(a) pokračování rodu.`,
    ch: [{ t: "Sňatek s potomkem domácího velmože (šlechta +6)", ok: s => !s.spouse, e: s => { const sp = newChar(s, { sex: ch(s, s.ruler).sex === "m" ? "f" : "m", age: rint(s, 17, 26), estate: "rod" }); s.spouse = sp.id; mod(s, "slechta", 6, 8, "Sňatek s domácí šlechtou"); return `Novou chotí je ${sp.name}.`; } },
      { t: "Hledat nevěstu u sousedů (vztah +15 s nejpřátelštějším)", ok: s => !s.spouse && aliveRivals(s).length > 0, e: s => { const r = aliveRivals(s).sort((a, b) => b.attitude - a.attitude)[0]; const sp = newChar(s, { sex: ch(s, s.ruler).sex === "m" ? "f" : "m", age: rint(s, 17, 26), estate: "rod" }); sp.name += " (" + r.n + ")"; s.spouse = sp.id; r.marriage = true; r.attitude += 15; return `Sňatek s ${sp.name}.`; } },
      { t: "Zatím ne", e: () => "Sňatek počká." }] },
};

function evDef(id) { return EVENTS[id] || SPECIAL[id]; }
function rollEvents(s) {
  if (s.flags.kingArmyBack && s.flags.kingArmyBack <= s.turn) { const a = s.armies[0]; if (a) a.units.kopinici = (a.units.kopinici || 0) + 3; s.flags.kingArmyBack = 0; log(s, "Vojsko se vrátilo z králova tažení (3 setniny přežily).", "vojsko"); }
  if (!chance(s, 0.5)) return;
  const pool = Object.entries(EVENTS).filter(([id, E]) => !E.c || E.c(s)).filter(([id]) => !(s.flags["ev_" + id] > s.turn));
  const tot = sum(pool.map(([, E]) => E.w || 1)); let x = rnd(s) * tot;
  for (const [id, E] of pool) { x -= E.w || 1; if (x <= 0) { const ev = Object.assign({ id }, E.init ? E.init(s) : {}); if ("pid" in ev && !ev.pid) return; if (E.pre) E.pre(s, ev); s.events.push(ev); s.flags["ev_" + id] = s.turn + 8; return; } }
}
function eventView(s, ev) {
  const E = evDef(ev.id); const T = x => (typeof x === "function" ? x(s, ev) : x);
  return { t: T(E.t), txt: T(E.txt), ch: E.ch.map((c, i) => ({ i, t: T(c.t), ok: !c.ok || c.ok(s, ev) })) };
}
function resolveEvent(s, idx, ci) {
  const ev = s.events[idx]; if (!ev) return "Není událost.";
  const E = evDef(ev.id), c = E.ch[ci]; if (!c) return "Neplatná volba.";
  if (c.ok && !c.ok(s, ev)) return "Tuto možnost nelze zvolit.";
  if (E.pre && SPECIAL[ev.id] && !ev._pre) { E.pre(s, ev); }
  const msg = c.e(s, ev); s.events.splice(idx, 1);
  log(s, `${typeof E.t === "function" ? E.t(s, ev) : E.t}: ${typeof c.t === "function" ? c.t(s, ev) : c.t}. ${msg || ""}`, "udalosti");
  const R = ch(s, s.ruler); if (R && R.health <= 0 && !s.over) succession(s);
  return null;
}
