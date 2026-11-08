// Pravidla a číselníky: měsíce, terén, vojsko, hodnosti, rozkazy, budovy, objevy, zákony, stavy.
const MONTHS = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];
const MONTHS2 = ["ledna", "února", "března", "dubna", "května", "června", "července", "srpna", "září", "října", "listopadu", "prosince"];
const START_YEAR = 1256;

const TERRAIN = {
  n: { n: "Nížina", agri: 1.2, def: 1.0, cav: 1.25, move: 1 },
  k: { n: "Pahorkatina", agri: 1.0, def: 1.15, cav: 1.0, move: 1 },
  h: { n: "Hory", agri: 0.6, def: 1.45, cav: 0.65, move: 1, slow: 1 },
  l: { n: "Lesy", agri: 0.8, def: 1.25, cav: 0.8, move: 1, slow: 1 },
  b: { n: "Mokřady", agri: 0.7, def: 1.3, cav: 0.6, move: 1, slow: 1 },
  p: { n: "Pobřeží", agri: 0.9, def: 1.05, cav: 1.0, move: 1 },
};

// Druhy vojska (počty v mužích). atk/def za 100 mužů.
const TROOPS = {
  pesi: { n: "Pěší (kopiníci)", atk: 1.0, def: 1.3, cost: 8, up: 0.3, goods: {} },
  strelci: { n: "Střelci", atk: 1.3, def: 0.8, cost: 12, up: 0.4, goods: { zbroj: 1 } },
  jizda: { n: "Jízda (rytíři)", atk: 2.4, def: 1.5, cost: 40, up: 1.5, goods: { kone: 10, zbroj: 5 } },
  zoldneri: { n: "Žoldnéři", atk: 1.6, def: 1.6, cost: 30, up: 3, goods: {} },
};
const TROOP_IDS = Object.keys(TROOPS);

// Hodnosti vazalů: limit velení (mužů), měsíční plat, potřebné zásluhy
const RANKS = [
  { n: "Panoš", cmd: 1000, pay: 1, merit: 0 },
  { n: "Rytíř", cmd: 2000, pay: 2, merit: 60 },
  { n: "Pán", cmd: 3500, pay: 4, merit: 180 },
  { n: "Hrabě", cmd: 6000, pay: 7, merit: 400 },
  { n: "Zemský hejtman", cmd: 10000, pay: 12, merit: 800 },
];

const STATS = { ved: "Vůdcovství", uda: "Udatnost", roz: "Rozum", spr: "Správa" };
const STAT_IDS = Object.keys(STATS);

const TRAITS = {
  stateny: { n: "Statečný", uda: 8 }, zbabely: { n: "Zbabělý", uda: -10 },
  moudry: { n: "Moudrý", roz: 8 }, prchlivy: { n: "Prchlivý", roz: -5, uda: 4 },
  lstivy: { n: "Lstivý", roz: 5, loy: -5 }, verny: { n: "Věrný", loy: 15 },
  ctizadostivy: { n: "Ctižádostivý", ved: 4, loy: -10 }, skromny: { n: "Skromný", loy: 8 },
  zbozny: { n: "Zbožný", spr: 2 }, lakomy: { n: "Lakomý", spr: 4, loy: -4 },
  stedry: { n: "Štědrý" }, kruty: { n: "Krutý", ved: 3 },
  hospodar: { n: "Dobrý hospodář", spr: 10 }, vojevudce: { n: "Rozený vojevůdce", ved: 10 },
  diplomat: { n: "Diplomat", roz: 6 }, nemocny: { n: "Neduživý" }, silny: { n: "Silák", uda: 6 },
};
const TRAIT_IDS = Object.keys(TRAITS);

// Rozkazy vazalům (jeden za měsíc)
const CMDS = {
  zemedelstvi: { n: "Rozvoj polí", d: "zvýší zemědělství kraje", cost: 30, stat: "spr" },
  obchod: { n: "Rozvoj trhů a řemesel", d: "zvýší obchod kraje", cost: 30, stat: "spr" },
  hradby: { n: "Opravit opevnění", d: "zvýší stav hradeb", cost: 25, stat: "spr" },
  nabor: { n: "Verbovat vojsko", d: "naverbuje muže z obyvatel kraje", cost: 0, stat: "ved" },
  vycvik: { n: "Výcvik posádky", d: "zvýší výcvik", cost: 5, stat: "ved" },
  lid: { n: "Péče o lid", d: "rozdá obilí, zvýší spokojenost", cost: 0, stat: "spr" },
  hledat: { n: "Hledat schopné muže", d: "hledá potulné rytíře a učence v kraji", cost: 10, stat: "roz" },
  studium: { n: "Podporovat učence", d: "body učenosti pro objevy", cost: 20, stat: "roz" },
  stavba: { n: "Řídit stavbu", d: "zahájí stavbu v kraji", cost: 0, stat: "spr" },
  zvedy: { n: "Vyzvědět kraj", d: "zjistí přesný stav cizího kraje", cost: 10, stat: "roz" },
  podnecovat: { n: "Podněcovat nepokoje", d: "sníží spokojenost a posádku v cizím kraji", cost: 40, stat: "roz" },
  naklonit: { n: "Naklonit si cizího vazala", d: "úplatky a sliby – sníží jeho věrnost, případně přejde k tobě", cost: 50, stat: "roz" },
  poselstvo: { n: "Vést poselstvo", d: "diplomatické jednání s jiným rodem", cost: 0, stat: "roz" },
  narok: { n: "Zfalšovat nárok", d: "listiny a svědci – nárok na sousední cizí kraj (záminka k válce na 10 let)", cost: 30, stat: "roz" },
  misie: { n: "Vést misii", d: "obrací kraj na víru tvého rodu", cost: 20, stat: "roz" },
  obchodovat: { n: "Vést obchodní výpravu", d: "výnos podle obchodních cest kraje (správa a rozum)", cost: 20, stat: "spr" },
  presun: { n: "Odjet do jiného kraje", d: "přesun vazala (dorazí příští měsíc)", cost: 0, stat: null },
};

// Stavby v kraji: cena (zlato), doba v měsících, max. úroveň
const BUILD = {
  hrad: { n: "Hrad (zvýšit úroveň)", cost: 300, time: 6, max: 5, d: "silnější obrana, delší obléhání, vyšší strop hradeb" },
  mesto: { n: "Lokace města", cost: 200, time: 4, max: 3, d: "+25 stropu obchodu, +obyvatelé, měšťané (německé právo)" },
  klaster: { n: "Klášter", cost: 180, time: 5, max: 2, d: "+učenost, +spokojenost lidu, +přízeň papeže" },
  dul: { n: "Důl / solivar", cost: 220, time: 5, max: 3, need: p => p.res.some(r => ["stribro", "zelezo", "sul"].includes(r)), d: "výnos podle suroviny (stříbro, železo – zbroj, sůl)" },
  hrebcin: { n: "Hřebčín", cost: 160, time: 4, max: 2, need: p => p.ter !== "h", d: "+5 koní měsíčně za úroveň" },
  pristav: { n: "Přístav", cost: 250, time: 6, max: 2, need: p => p.ter === "p", d: "+20 stropu obchodu, obchod po moři" },
  vinice: { n: "Vinice", cost: 120, time: 4, max: 2, need: p => p.res.includes("vino"), d: "+obchod, víno pro dvůr (+prestiž)" },
};
const RES = { stribro: "stříbro", zelezo: "železo", sul: "sůl", vino: "víno" };

const GOODS = { obili: { n: "Obilí", base: 1.2 }, kone: { n: "Koně", base: 6 }, zbroj: { n: "Zbroj a zbraně", base: 5 } };

const TECHS = {
  trojpole: { n: "Trojpolní hospodaření", cat: "Zemědělství", cost: 60, d: "+10 % sklizně" },
  pluh: { n: "Těžký kolečkový pluh", cat: "Zemědělství", cost: 90, req: ["trojpole"], d: "+15 stropu zemědělství v nížinách" },
  vodni_kolo: { n: "Vodní kolo", cat: "Zemědělství", cost: 70, d: "rozvoj polí a dolů účinnější o 20 %" },
  kolonizace: { n: "Vnitřní kolonizace", cat: "Zemědělství", cost: 100, req: ["trojpole"], d: "+10 stropu zemědělství všude, rychlejší růst obyvatel" },
  hornictvi: { n: "Horní právo", cat: "Řemesla", cost: 80, d: "doly vynášejí o 50 % víc" },
  cechy: { n: "Cechovní řády", cat: "Řemesla", cost: 70, d: "+10 stropu obchodu ve městech" },
  gotika: { n: "Gotická klenba", cat: "Řemesla", cost: 110, req: ["cechy"], d: "stavby o 20 % levnější, hrady +1 obrana" },
  ucetnictvi: { n: "Komorní správa", cat: "Správa", cost: 80, d: "+10 % zlata z krajů" },
  mince: { n: "Ražba grošů", cat: "Správa", cost: 120, req: ["ucetnictvi", "hornictvi"], d: "stříbro z dolů +50 %, levnější nákupy" },
  zakonik: { n: "Zemský zákoník", cat: "Správa", cost: 90, d: "+5 spokojenosti lidu, vazalové +5 věrnosti" },
  univerzita: { n: "Univerzita", cat: "Učenost", cost: 150, req: ["zakonik"], d: "dvojnásobek bodů ze studia" },
  medicina: { n: "Lékařské umění", cat: "Učenost", cost: 100, req: ["univerzita"], d: "nižší úmrtnost rodu, mírnější mor" },
  kuse: { n: "Kuše", cat: "Válečnictví", cost: 70, d: "střelci +30 % síly" },
  zbroj: { n: "Plátová zbroj", cat: "Válečnictví", cost: 130, req: ["kuse"], d: "jízda +20 % obrany" },
  trebuchet: { n: "Protizávažový trebuchet", cat: "Válečnictví", cost: 90, d: "zteč a obléhání ničí hradby rychleji" },
  taktika: { n: "Rytířské řády a taktika", cat: "Válečnictví", cost: 110, d: "+10 % síly v polní bitvě" },
};
const TECH_IDS = Object.keys(TECHS);

const LAWS = {
  robota: { n: "Robota", opts: ["Mírná", "Obvyklá", "Těžká"], d: "Těžší robota zlevní stavby a rozvoj, ale snižuje spokojenost lidu." },
  nastupnictvi: { n: "Nástupnictví", opts: ["Prvorozenectví", "Volba šlechty", "Dělení údělů"], d: "Prvorozenectví posiluje rod, volba těší šlechtu, úděly rozdělí kraje mezi syny jako vazalské země." },
  mesta: { n: "Městská práva", opts: ["Omezená", "Německé právo", "Široká privilegia"], d: "Privilegia zvedají obchod, šlechta je nelibě nese." },
  cirkev: { n: "Vztah k církvi", opts: ["Poslušnost Římu", "Rovnováha", "Panovnická investitura"], d: "Investitura dá zlato z církevních statků, ale papež a kněží se zlobí." },
  vojsko: { n: "Branná povinnost", opts: ["Lenní hotovost", "Smíšená", "Placené vojsko"], d: "Lenní hotovost: levný nábor, nižší výcvik. Placené vojsko: dražší, lépe vycvičené." },
  mince: { n: "Mincovní politika", opts: ["Poctivá mince", "Mírné znehodnocení", "Silné znehodnocení"], d: "Znehodnocení přinese zlato, ale rozzlobí měšťany a zdraží trh." },
};
const ESTATES = { slechta: "Šlechta", duchovni: "Duchovenstvo", mestane: "Měšťané", sedlaci: "Sedláci" };
const ESTATE_IDS = Object.keys(ESTATES);
const TAX_LEVELS = ["Velmi nízké", "Nízké", "Střední", "Vysoké", "Kruté"];
const TAX_MULT = [0.5, 0.75, 1, 1.25, 1.55];

// Jména podle kultury (pro vazaly generované hrou)
const NAMES = {
  cz: { m: ["Bohuslav", "Hroznata", "Smil", "Zbyněk", "Ojíř", "Kojata", "Načerat", "Sezema", "Mstidruh", "Domaslav", "Hynek", "Beneš", "Diviš", "Ratibor", "Čéč", "Budivoj", "Častolov", "Držislav", "Jaroš", "Kuneš", "Oldřich", "Pomněn", "Slavibor", "Vítek", "Zdeslav", "Bavor", "Heřman", "Ulrich"],
    s: ["z Lomnice", "z Dubé", "z Kunštátu", "z Riesenburka", "z Hradce", "ze Šternberka", "z Bítova", "z Pernštejna", "z Lichtenburka", "z Kolovrat", "z Úlehle", "z Dobrohoště", "ze Žerotína", "z Michalovic", "z Ronova", "z Klinštejna", "z Křižanova", "z Vartenberka", "z Rožmitála", "ze Střekova"] },
  de: { m: ["Konrád", "Ota", "Albrecht", "Jindřich", "Fridrich", "Ludvík", "Herman", "Gebhard", "Rudolf", "Burchard", "Dětřich", "Eberhard", "Hartmann", "Wolfger", "Leutold", "Siegfried", "Walther", "Ulrich", "Berthold", "Engelbert"],
    s: ["z Kuenringu", "z Liechtensteinu", "z Wildonu", "z Pottendorfu", "z Hohenlohe", "z Truhendingenu", "z Ortenburku", "z Schaunbergu", "z Falkensteinu", "z Wolfsteinu", "z Hardeggu", "z Kirchbergu", "z Waldburgu", "ze Stubenbergu", "z Lobdeburku", "z Querfurtu", "z Arnsteinu", "z Wettenu", "z Ilburgu", "z Dohny"] },
  hu: { m: ["Mikuláš", "Petr", "Ladislav", "Dionýz", "Matouš", "Pavel", "Jakub", "Mojmír", "Tomáš", "Kosmas", "Egyed", "Lőrinc", "Benedikt", "Demetr", "Ompud", "Achilles", "Csák", "Héder", "Kemény", "Ugrin"],
    s: ["z rodu Csák", "z rodu Aba", "z rodu Kán", "z rodu Héder", "z rodu Rátót", "z rodu Ákos", "z rodu Gutkeled", "z rodu Hontpázmány", "z rodu Miskolc", "z rodu Bór-Kalán", "z rodu Győr", "z rodu Péc"] },
  pl: { m: ["Klement", "Mikuláš", "Žegota", "Varš", "Sulisław", "Przedpełk", "Otto", "Janusz", "Sambor", "Bogusław", "Dobiesław", "Sięgniew", "Mścisław", "Wojsław", "Pakosław", "Marek", "Jan", "Tomisław"],
    s: ["z rodu Gryfitů", "z rodu Toporczyků", "z rodu Awdańců", "z rodu Nałęczů", "z rodu Odrowążů", "z rodu Starżů", "z rodu Półkozů", "z rodu Łabędziů", "z rodu Zarembů", "z rodu Doliwů"] },
  ru: { m: ["Andrej", "Dmitrij", "Vasilko", "Jurij", "Mstislav", "Ivan", "Fedor", "Semen", "Gleb", "Michail", "Boris", "Konstantin"], s: ["bojarin", "z Chelmu", "z Peremyšle", "z Belzu", "z Luce", "z Terebovle", "ze Zvenigorodu", "z Kremence"] },
};
const FEMALE = { cz: ["Kunhuta", "Eliška", "Anežka", "Ludmila", "Jitka", "Zdislava", "Markéta", "Hedvika", "Bohuslava", "Dobroslava"], de: ["Gertruda", "Adléta", "Matylda", "Žofie", "Alžběta", "Juta", "Hedvika", "Kateřina", "Anna", "Klára"], hu: ["Alžběta", "Anna", "Kateřina", "Markéta", "Marie", "Konstancie", "Jolanta"], pl: ["Salomea", "Jolanta", "Anna", "Viola", "Grzymisława", "Konstancie", "Hedvika", "Eufrozína"], ru: ["Anastázie", "Olga", "Jelena", "Sofie", "Marie", "Konstancie"] };
const SONS = { cz: ["Václav", "Vladislav", "Přemysl", "Spytihněv", "Soběslav", "Bořivoj", "Jaromír", "Oldřich", "Jindřich"], de: ["Albrecht", "Rudolf", "Fridrich", "Ota", "Ludvík", "Jindřich", "Konrád", "Hartmann", "Jan"], hu: ["Ladislav", "Béla", "Ondřej", "Štěpán", "Koloman", "Emerich"], pl: ["Boleslav", "Vladislav", "Kazimír", "Lešek", "Měšek", "Konrád", "Přemysl", "Jindřich"], ru: ["Lev", "Roman", "Švarno", "Mstislav", "Jurij", "Vladimír", "Andrej"] };
