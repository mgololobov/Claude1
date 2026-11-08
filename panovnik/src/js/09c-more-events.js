// Další události: náhodné příhody, vynálezy, podivnosti a historické mezníky.
const myCap = s => s.provs[P(s).capital];
const pay1 = (s, g) => { if (P(s).gold < g) return false; P(s).gold -= g; return true; };

Object.assign(EVENTS, {
  vlci: { t: "Vlčí zima", w: 3, c: s => [0, 1, 11].includes(s.month), init: s => ({ pid: myRandProv(s, p => p.ter === "l" || p.ter === "h") }), txt: (s, e) => `Krutý mráz vyhnal z hvozdů vlčí smečky. V kraji ${pn(s, e.pid)} napadají stáda i pocestné.`,
    ch: [{ t: "Vypsat odměnu za vlčí kůže (−50 zl)", ok: s => P(s).gold >= 50, e: (s, e) => { P(s).gold -= 50; s.provs[e.pid].loy += 4; return "Lovci přinášejí kůže a sedláci si oddychli."; } },
      { t: "Uspořádat velký hon (prestiž +4)", e: (s, e) => { P(s).prestige += 4; if (chance(s, 0.15)) { myLeader(s).hp -= 10; return "Hon se vydařil, ale panovníka pokousal vlk."; } return "Smečka byla rozprášena."; } },
      { t: "Nechat to být", e: (s, e) => { const p = s.provs[e.pid]; p.loy -= 5; P(s).grain = Math.max(0, P(s).grain - 40); return "Vlci rvou dobytek."; } }] },
  povoden: { t: "Povodeň", w: 3, c: s => [2, 3, 6, 7].includes(s.month), init: s => ({ pid: myRandProv(s, p => p.ter === "n" || p.ter === "b") }), txt: (s, e) => `Řeka se vylila z břehů a zaplavila vsi a pole v kraji ${pn(s, e.pid)}.`,
    ch: [{ t: "Poslat pomoc a obilí (−100 zl, −60 obilí)", ok: s => P(s).gold >= 100 && P(s).grain >= 60, e: (s, e) => { P(s).gold -= 100; P(s).grain -= 60; s.provs[e.pid].loy += 8; return "Lid na tvou pomoc nezapomene."; } },
      { t: "Postavit hráze (−200 zl, příště menší škody)", ok: s => P(s).gold >= 200, e: (s, e) => { P(s).gold -= 200; s.provs[e.pid].agriMax += 3; return "Hráze ochrání pole na léta."; } },
      { t: "Nechat vodu opadnout", e: (s, e) => { const p = s.provs[e.pid]; p.agri = Math.max(0, p.agri - 6); p.pop = r1(p.pop * 0.97); return "Pole jsou zanesená bahnem."; } }] },
  sucho: { t: "Velké sucho", w: 2, c: s => [5, 6].includes(s.month), pre: s => { s.flags.harvest = Math.min(s.flags.harvest || 1, 0.8); }, txt: () => "Celé léto nezapršelo. Studny vysychají a obilí usychá na stéble.",
    ch: [{ t: "Nakoupit obilí (−180 zl, +150 obilí)", ok: s => P(s).gold >= 180, e: s => { P(s).gold -= 180; P(s).grain += 150; return "Sýpky jsou zajištěné."; } }, { t: "Procesí za déšť", e: s => { s.pope.op[s.player] += 2; if (chance(s, 0.3)) { s.flags.harvest = 1; return "Třetího dne se spustil liják! Lid mluví o zázraku."; } return "Nebe zůstalo bez mráčku."; } }] },
  jarmark: { t: "Výroční trh", w: 3, init: s => ({ pid: myRandProv(s, p => p.city || p.b.mesto) }), txt: (s, e) => `Měšťané z ${pn(s, e.pid)} žádají o právo konat velký výroční trh.`,
    ch: [{ t: "Udělit trhové právo (obchod +6)", e: (s, e) => { const p = s.provs[e.pid]; p.com += 6; p.comMax += 4; return "Na trh se sjíždějí kupci z dalekého okolí."; } },
      { t: "Prodat právo za 150 zl", e: s => { P(s).gold += 150; return "Měšťané zaplatili, ale reptají na cenu."; } }] },
  kejklire: { t: "Kejklíři a žongléři", w: 3, txt: () => "Na hrad dorazila skupina potulných kejklířů, polykačů ohně a cvičených medvědů.",
    ch: [{ t: "Uspořádat představení (−30 zl, vazalové +3)", ok: s => P(s).gold >= 30, e: s => { P(s).gold -= 30; for (const c of officers(s, s.player)) c.loy = Math.min(100, c.loy + 3); return "Smáli se i nejzachmuřenější páni."; } },
      { t: "Vyhnat je – kejklíři jsou ďáblovo dílo", e: s => { s.pope.op[s.player] += 2; return "Kněží tě chválí."; } }] },
  penezokaz: { t: "Penězokaz", w: 2, txt: () => "Ve městě kolují falešné groše s příměsí mědi. Stopy vedou k mincmistrovi.",
    ch: [{ t: "Dát ho veřejně potrestat", e: s => { P(s).stab = Math.min(3, (P(s).stab || 0) + 1); mod(s, "mestane", 5, 12, "Potrestaný penězokaz"); return "Mince má zase dobrou pověst."; } },
      { t: "Nechat si podíl a mlčet (+200 zl)", e: s => { P(s).gold += 200; S_inflate(s, 0.02); return "Komora je plnější, trh však zdražuje."; } }] },
  poustevnik: { t: "Poustevník", w: 2, txt: () => "Z lesů přišel vousatý poustevník a před hradní bránou káže o brzkém konci světa.",
    ch: [{ t: "Pozvat ho ke stolu a vyslechnout", e: s => { P(s).piety = (P(s).piety || 0) + 5; if (chance(s, 0.4)) { P(s).res.pts += 25; return "Mezi blouznivými řečmi zazněla i moudrá rada (+25 učenosti)."; } return "Odešel s požehnáním."; } },
      { t: "Vyhnat ho", e: s => { if (chance(s, 0.3)) { myCap(s).loy -= 4; return "Lid má poustevníka za světce a reptá."; } return "Nikdo si ho nevšímal."; } }] },
  alchymista: { t: "Alchymista", w: 2, c: s => !hasCourt(s, s.player, "alchymista"), txt: () => "Ke dvoru se dostavil muž v plášti posetém hvězdami. Tvrdí, že umí proměnit olovo ve zlato.",
    ch: [{ t: "Zřídit mu dílnu (−120 zl)", ok: s => P(s).gold >= 120, e: s => { P(s).gold -= 120; return addCourt(s, s.player, "alchymista"); } },
      { t: "Vyzkoušet ho hned", e: s => { if (chance(s, 0.2)) { P(s).gold += 60; return "V tyglíku se zalesklo cosi žlutého… Zlato? Snad."; } P(s).prestige -= 2; return "Laboratoř zahalil smradlavý dým. Šarlatán uprchl."; } },
      { t: "Vykázat šarlatána", e: () => "Odešel hledat důvěřivějšího pána." }] },
  kosti: { t: "Dračí kosti", w: 1, c: s => !hasTrea(s, s.player, "kosti"), init: s => ({ pid: myRandProv(s, p => p.ter === "h") }), txt: (s, e) => `Havíři v kraji ${pn(s, e.pid)} vykopali v jeskyni obrovské kosti. Lid věří, že patřily drakovi.`,
    ch: [{ t: "Vystavit je na hradě", e: s => addTreasure(s, s.player, "kosti") }, { t: "Dát je pohřbít v kostele", e: s => { s.pope.op[s.player] += 3; return "Kněz je pokropil svěcenou vodou."; } }] },
  poklad: { t: "Vyoraný poklad", w: 2, init: s => ({ pid: myRandProv(s, p => p.ter === "n" || p.ter === "k") }), txt: (s, e) => `Sedlák v kraji ${pn(s, e.pid)} vyoral hrnec plný starých stříbrných mincí.`,
    ch: [{ t: "Poklad patří vrchnosti (+250 zl)", e: (s, e) => { P(s).gold += 250; s.provs[e.pid].loy -= 3; return "Sedlák odešel s prázdnou."; } },
      { t: "Rozdělit se se sedlákem (+120 zl)", e: (s, e) => { P(s).gold += 120; s.provs[e.pid].loy += 4; return "Vesnice chválí spravedlivého pána."; } }] },
  uprchlici: { t: "Uprchlíci z východu", w: 2, c: s => s.year >= 1260, init: s => ({ pid: myRandProv(s) }), txt: (s, e) => `Do kraje ${pn(s, e.pid)} přišly stovky rodin prchajících před Tatary. Prosí o půdu.`,
    ch: [{ t: "Usadit je na pustých místech (obyvatelé +2000, −60 obilí)", ok: s => P(s).grain >= 60, e: (s, e) => { const p = s.provs[e.pid]; P(s).grain -= 60; p.pop = r1(p.pop + 2); p.agriMax += 2; return "Nové vsi vyrostou na mýtinách."; } },
      { t: "Poslat je dál", e: () => "Táhnou k sousedům." }] },
  cisterciaci: { t: "Cisterciáci", w: 2, init: s => ({ pid: myRandProv(s, p => (p.b.klaster || 0) < 3) }), txt: (s, e) => `Opat cisterciáků žádá o pozemky v kraji ${pn(s, e.pid)}. Bílí mniši slibují vysušit bažiny a klučit lesy.`,
    ch: [{ t: "Darovat půdu (klášter +1, zemědělství +5)", e: (s, e) => { const p = s.provs[e.pid]; p.b.klaster = Math.min(3, (p.b.klaster || 0) + 1); p.agriMax += 5; s.pope.op[s.player] += 4; mod(s, "slechta", -3, 12, "Půda pro mnichy"); return "Mniši začali stavět."; } },
      { t: "Odmítnout", e: s => { mod(s, "duchovni", -4, 12, "Odmítnutí cisterciáci"); return "Opat odešel uražen."; } }] },
  zatmeni: { t: "Zatmění slunce", w: 1, txt: () => "Za bílého dne se slunce zatemnilo a na nebi vysvitly hvězdy. Lid padá na kolena.",
    ch: [{ t: "Dát učencům vysvětlit, že jde o přirozený úkaz", e: s => { if (P(s).techs.astronomie || hasCourt(s, s.player, "astrolog")) { P(s).prestige += 6; P(s).res.pts += 20; return "Učenci úkaz předpověděli a panovník vypadá jako mudrc."; } myCap(s).loy -= 3; return "Lid učencům nevěří."; } },
      { t: "Nařídit kajícnou pouť", e: s => { s.pope.op[s.player] += 3; return "Kostely jsou plné."; } }] },
  pevec: { t: "Minnesänger", w: 2, c: s => !hasCourt(s, s.player, "pevec"), txt: () => "Ke dvoru přijel slavný pěvec dvorské lásky. Jeho písně o tvém rodu by zněly po celé říši.",
    ch: [{ t: "Přijmout ho u dvora (−80 zl)", ok: s => P(s).gold >= 80, e: s => { P(s).gold -= 80; P(s).prestige += 5; return addCourt(s, s.player, "pevec"); } }, { t: "Poslat ho dál s darem (−20 zl, prestiž +2)", ok: s => P(s).gold >= 20, e: s => { P(s).gold -= 20; P(s).prestige += 2; return "Odjel a zpívá o tvé štědrosti."; } }] },
  loupeznik: { t: "Loupeživý rytíř", w: 3, init: s => { const x = genOfficer(s, null, P(s).cul, P(s).capital, { st: "wand", rank: 1, loy: 0 }); x.uda = Math.max(x.uda, 60); return { cid: x.id, pid: myRandProv(s, p => p.ter === "h" || p.ter === "l") }; },
    txt: (s, e) => `Rytíř ${chr(s, e.cid).n} se usadil na skalním hradě v kraji ${pn(s, e.pid)} a přepadá kupce na cestách.`,
    ch: [{ t: "Vyslat vojsko a hrad vypálit", e: (s, e) => { const p = s.provs[e.pid]; loseMen(p.troops, 80); p.com += 3; P(s).prestige += 4; kill(s, chr(s, e.cid), "padl při dobytí loupeživého hradu"); return "Hnízdo lupičů lehlo popelem."; } },
      { t: "Nabídnout mu službu", e: (s, e) => { const x = chr(s, e.cid); x.st = "off"; x.cl = s.player; x.loy = 45; x.traits = [...(x.traits || []), "lakomy"].slice(-3); return `${x.n} přísahal věrnost. Dá se mu věřit?`; } },
      { t: "Ignorovat (obchod v kraji −5)", e: (s, e) => { s.provs[e.pid].com = Math.max(0, s.provs[e.pid].com - 5); return "Kupci se kraji vyhýbají."; } }] },
  orient: { t: "Kupec z Orientu", w: 2, init: s => ({ k: pick(s, ["hedvabi", "astrolab", "sklo", "koreni", "ikona"].filter(k => !hasTrea(s, s.player, k)).concat(["koreni"])) }),
    txt: (s, e) => `Kupec, který prý viděl Konstantinopol i Bagdád, nabízí vzácnost: ${TREASURES[e.k].n}.`,
    ch: [{ t: "Koupit (−250 zl)", ok: s => P(s).gold >= 250, e: (s, e) => { P(s).gold -= 250; return addTreasure(s, s.player, e.k); } }, { t: "Smlouvat (−150 zl, nemusí se podařit)", ok: s => P(s).gold >= 150, e: (s, e) => { if (chance(s, 0.5)) { P(s).gold -= 150; return addTreasure(s, s.player, e.k); } return "Kupec se urazil a odjel."; } }, { t: "Nekupovat", e: () => "" }] },
  bryle: { t: "Brýle", w: 3, c: s => s.year >= 1286 && !s.flags.bryle, init: s => { s.flags.bryle = 1; return {}; }, txt: () => "Z Itálie přišla novinka: skláři brousí čočky, které starým písařům vracejí zrak.",
    ch: [{ t: "Objednat je pro kancelář (−60 zl, +40 učenosti)", ok: s => P(s).gold >= 60, e: s => { P(s).gold -= 60; P(s).res.pts += 40; return "Staří mniši zase čtou."; } }, { t: "Hloupost", e: () => "" }] },
  hodinar: { t: "Mechanické hodiny", w: 3, c: s => s.year >= 1300 && !hasTrea(s, s.player, "hodiny"), txt: () => "Mistr hodinář nabízí sestrojit věžní hodiny se závažím, které odbíjejí hodiny bez slunce i vody.",
    ch: [{ t: "Postavit hodiny na věži (−300 zl)", ok: s => P(s).gold >= 300, e: s => { P(s).gold -= 300; P(s).prestige += 8; return addTreasure(s, s.player, "hodiny"); } }, { t: "Odmítnout", e: () => "" }] },
  astrolog: { t: "Astrolog", w: 2, c: s => !hasCourt(s, s.player, "astrolog"), txt: () => "Učený astrolog s astrolábem nabízí, že bude číst z hvězd osudy tvého rodu i úrody.",
    ch: [{ t: "Vzít ho ke dvoru (−90 zl)", ok: s => P(s).gold >= 90, e: s => { P(s).gold -= 90; return addCourt(s, s.player, "astrolog"); } }, { t: "Odmítnout – církev to nevidí ráda", e: s => { s.pope.op[s.player] += 1; return ""; } }] },
  lekar: { t: "Lékař ze Salerna", w: 2, c: s => !hasCourt(s, s.player, "lekar"), txt: () => "Lékař vyškolený v Salernu nabízí službu. Zná Hippokrata i arabské lékařské knihy.",
    ch: [{ t: "Přijmout (−100 zl)", ok: s => P(s).gold >= 100, e: s => { P(s).gold -= 100; myLeader(s).hp = Math.min(100, myLeader(s).hp + 15); return addCourt(s, s.player, "lekar"); } }, { t: "Spoléhat na kněze a bylinkářky", e: () => "" }] },
  kronikar: { t: "Kronikář", w: 2, c: s => !hasCourt(s, s.player, "kronikar"), txt: () => "Vzdělaný kanovník se nabízí sepsat kroniku tvého rodu – od bájných předků až po tvé slavné činy.",
    ch: [{ t: "Platit mu (−70 zl)", ok: s => P(s).gold >= 70, e: s => { P(s).gold -= 70; return addCourt(s, s.player, "kronikar"); } }, { t: "Odmítnout", e: () => "" }] },
  cizinec: { t: "Tajemný cizinec", w: 2, c: s => !hasTrea(s, s.player, "mapa"), txt: () => "Seveřan s jizvou přes tvář nabízí kůži pokreslenou pobřežími, přístavy a větrnou růžicí.",
    ch: [{ t: "Koupit mapu (−120 zl)", ok: s => P(s).gold >= 120, e: s => { P(s).gold -= 120; return addTreasure(s, s.player, "mapa"); } }, { t: "Vyhodit ho", e: () => "" }] },
  vynalez: { t: "Šikovný řemeslník", w: 3, init: s => ({ t: pick(s, TECH_IDS.filter(t => techAvail(s, s.player, t)).concat([P(s).res.cur || "trojpole"])) }), c: s => !!P(s).res.cur,
    txt: (s, e) => `Řemeslník ukazuje zlepšení, které by urychlilo zkoumání: ${TECHS[e.t] ? TECHS[e.t].n : "?"}.`,
    ch: [{ t: "Odměnit ho a dát mu dílnu (−80 zl, +60 učenosti)", ok: s => P(s).gold >= 80, e: s => { P(s).gold -= 80; P(s).res.pts += 60; return "Práce jde rychleji."; } }, { t: "Pochválit a poslat domů (+15 učenosti)", e: s => { P(s).res.pts += 15; return ""; } }] },
  svatek: { t: "Pouť ke svatému patronu", w: 2, txt: () => "Na svátek patrona země se ke katedrále sjíždějí tisíce poutníků.",
    ch: [{ t: "Vystrojit slavnost (−100 zl, spokojenost +4 všude)", ok: s => P(s).gold >= 100, e: s => { P(s).gold -= 100; for (const p of clanProvs(s, s.player)) p.loy = Math.min(100, p.loy + 4); return "Slavilo se tři dny."; } }, { t: "Vybrat mýto od poutníků (+90 zl)", e: s => { P(s).gold += 90; mod(s, "duchovni", -3, 6, "Mýto od poutníků"); return ""; } }] },
});
function S_inflate(s, v) { s.inflation = (s.inflation || 0) + v; }

// Události, které přináší objev a návrat výpravy.
Object.assign(SPECIAL, {
  _objev: { t: (s, e) => "Objev: " + TECHS[e.t].n, txt: (s, e) => `Učenci tvého dvora dokončili práci: ${TECHS[e.t].n}. Účinek: ${TECHS[e.t].d}. Co se bude zkoumat dál?`,
    ch: (s, e) => { const o = nextTechChoices(s, s.player); return (o.length ? o : [null]).map(t => t ? { t: `Zkoumat: ${TECHS[t].n} (${techCost(s, s.player, t)} b.)`, e: s2 => { setResearch(s2, s2.player, t); return ""; } } : { t: "Pokračovat", e: () => "" }); } },
  _exp: { t: (s, e) => (e.lost ? "Výprava se nezdařila: " : "Návrat výpravy: ") + DESTS[e.d].n, txt: (s, e) => e.txt, ch: [{ t: "Pokračovat", e: () => "" }] },
  _hist: { t: (s, e) => HIST2[e.k].t, txt: (s, e) => HIST2[e.k].txt, ch: (s, e) => HIST2[e.k].ch },
});

// Historické mezníky (rok, měsíc 0–11)
const HIST2 = {
  kometa1264: { y: 1264, m: 6, art: "kometa", t: "Velká kometa roku 1264", txt: "Na letní obloze září obrovská vlasatice s ohonem přes půl nebe. Kronikáři ji zapisují jako předzvěst smrti mocných.",
    ch: [{ t: "Dát sloužit mše za zdraví rodu", e: s => { s.pope.op[s.player] += 3; return ""; } }, { t: "Prohlásit ji za znamení slávy (prestiž +8)", e: s => { P(s).prestige += 8; return ""; } }] },
  marcopolo: { y: 1271, m: 10, art: "karavana", t: "Benátčané na cestě k chánovi", txt: "Benátští kupci Niccolò a Maffeo Polo se znovu vydali na cestu k velkému chánovi. Tentokrát s sebou vzali mladého Marka. Zprávy o bohatství Východu dráždí i tvé kupce.",
    ch: [{ t: "Podpořit vlastní výpravu (příští výprava zdarma)", e: s => { P(s).freeExp = 1; return "Kupci se chystají na cestu."; } }, { t: "Pohádky", e: () => "" }] },
  akkon: { y: 1291, m: 4, art: "valka", t: "Pád Akkonu", txt: "Mamlúci dobyli Akkon, poslední velkou baštu křižáků ve Svaté zemi. Evropa je otřesena.",
    ch: [{ t: "Přijmout kříž a slíbit výpravu (papež +12, prestiž +10)", e: s => { s.pope.op[s.player] += 12; P(s).prestige += 10; return "Slib byl slavnostně vyhlášen."; } }, { t: "Poslat zlato johanitům (−150 zl, papež +6)", ok: s => P(s).gold >= 150, e: s => { P(s).gold -= 150; s.pope.op[s.player] += 6; return ""; } }, { t: "Svatá země je daleko", e: () => "" }] },
  jubileum: { y: 1300, m: 1, art: "cirkev", t: "Svatý rok v Římě", txt: "Papež Bonifác VIII. vyhlásil svatý rok. Kdo navštíví hroby apoštolů v Římě, získá plnomocné odpustky. Na cestu se vydávají statisíce poutníků.",
    ch: [{ t: "Vypravit se osobně do Říma (−250 zl, papež +20, prestiž +10)", ok: s => P(s).gold >= 250, e: s => { P(s).gold -= 250; s.pope.op[s.player] += 20; P(s).prestige += 10; return "Panovník se vrátil s požehnáním."; } }, { t: "Poslat poselstvo (−80 zl, papež +8)", ok: s => P(s).gold >= 80, e: s => { P(s).gold -= 80; s.pope.op[s.player] += 8; return ""; } }, { t: "Zůstat doma", e: () => "" }] },
  templari: { y: 1307, m: 9, art: "dvur", t: "Zatčení templářů", txt: "Francouzský král Filip IV. dal v jediný den zatknout templáře ve svém království a obvinil je z kacířství. Řád má statky i v tvé zemi.",
    ch: [{ t: "Zabavit templářské statky (+400 zl, papež −10)", e: s => { P(s).gold += 400; s.pope.op[s.player] -= 10; return "Komora se naplnila, kněží reptají."; } }, { t: "Předat statky johanitům (papež +10)", e: s => { s.pope.op[s.player] += 10; return ""; } }, { t: "Ochránit rytíře v zemi (prestiž +5, nový rytíř u dvora)", e: s => { P(s).prestige += 5; const x = genOfficer(s, s.player, P(s).cul, P(s).capital, { st: "off", rank: 2, loy: 80 }); x.uda = Math.max(x.uda, 70); return `${x.n}, bývalý templář, vstoupil do tvých služeb.`; } }] },
  avignon: { y: 1309, m: 2, art: "cirkev", t: "Papež v Avignonu", txt: "Papežská kurie přesídlila do Avignonu, pod vliv francouzského krále. Mnozí v říši to nesou nelibě.",
    ch: [{ t: "Zůstat poslušný (papež +5)", e: s => { s.pope.op[s.player] += 5; return ""; } }, { t: "Hlasitě protestovat (prestiž +5, papež −5)", e: s => { P(s).prestige += 5; s.pope.op[s.player] -= 5; return ""; } }] },
  kresak: { y: 1346, m: 7, art: "bitva", t: "Bitva u Kresčaku", txt: "Ve Francii anglický král Eduard III. porazil francouzské rytířstvo. Anglické dlouhé luky kosily jízdu. Padl i slepý český král Jan Lucemburský, který se nechal přivázat ke koním svých rytířů.",
    ch: [{ t: "Poučit se: posílit střelce (+30 učenosti)", e: s => { P(s).res.pts += 30; return "Hejtmané studují zprávy z bitvy."; } }, { t: "Truchlit za rytířský čin (prestiž +3)", e: s => { P(s).prestige += 3; return ""; } }] },
  zemetreseni: { y: 1348, m: 0, art: "zemetreseni", t: "Zemětřesení v Korutanech", txt: "Země se otřásla od Alp až po Dunaj. Ve Villachu se zřítily domy a kostely, sesuv hory Dobratsch zasypal vsi.",
    ch: [{ t: "Poslat pomoc postiženým (−150 zl)", ok: s => P(s).gold >= 150, e: s => { P(s).gold -= 150; for (const id of ["korutany", "kransko", "gorice"]) if (s.provs[id] && s.provs[id].owner === s.player) s.provs[id].loy += 8; P(s).prestige += 4; return ""; } }, { t: "Modlit se", e: () => "" }] },
  flagelanti: { y: 1349, m: 4, art: "procesi", t: "Flagelanti", txt: "Krajem táhnou zástupy bičujících se kajícníků. Zpívají, mrskají se do krve a hlásají, že mor je trestem Božím.",
    ch: [{ t: "Zakázat jim vstup do měst (papež +5)", e: s => { s.pope.op[s.player] += 5; return "Brány se zavřely."; } }, { t: "Nechat je projít", e: s => { for (const p of clanProvs(s, s.player)) if (chance(s, 0.25)) p.loy -= 4; return "Kde prošli, zůstal strach a nepokoj."; } }] },
};
function histTick(s) {
  if (!P(s).alive) return;
  for (const [k, H] of Object.entries(HIST2)) {
    if (s.year === H.y && s.month === H.m && !s.flags["h_" + k]) {
      s.flags["h_" + k] = 1; if (k === "zemetreseni") for (const id of ["korutany", "kransko"]) if (s.provs[id]) { const p = s.provs[id]; p.pop = r1(p.pop * 0.95); p.dur = Math.max(0, p.dur - 40); }
      s.events.push({ id: "_hist", k });
    }
  }
}
