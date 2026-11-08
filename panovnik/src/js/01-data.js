// Herní data: zboží, terén, budovy, jednotky, objevy, zákony, mapa a jména.
const SEASONS = ["Jaro", "Léto", "Podzim", "Zima"];
const START_YEAR = 1250, END_YEAR = 1350;

const GOODS = {
  obili: { n: "Obilí", base: 2, ref: 120 },
  drevo: { n: "Dřevo", base: 3, ref: 60 },
  kamen: { n: "Kámen", base: 4, ref: 60 },
  zelezo: { n: "Železo", base: 8, ref: 30 },
  vlna: { n: "Vlna", base: 4, ref: 30 },
  sukno: { n: "Sukno", base: 12, ref: 20 },
  sul: { n: "Sůl", base: 10, ref: 20 },
  vino: { n: "Víno", base: 9, ref: 20 },
  kone: { n: "Koně", base: 25, ref: 12 },
  zbrane: { n: "Zbraně", base: 20, ref: 15 },
  koreni: { n: "Koření", base: 60, ref: 5, exotic: true },
  hedvabi: { n: "Hedvábí", base: 80, ref: 4, exotic: true },
};
const GOOD_IDS = Object.keys(GOODS);

const TERRAIN = {
  nizina: { n: "Nížina", fert: 1.2, def: 1.0, cav: 1.2 },
  kopce: { n: "Pahorkatina", fert: 0.9, def: 1.15, cav: 1.0 },
  hory: { n: "Hory", fert: 0.6, def: 1.4, cav: 0.7 },
  les: { n: "Lesy", fert: 0.8, def: 1.25, cav: 0.8 },
  pobrezi: { n: "Pobřeží", fert: 1.0, def: 1.0, cav: 1.0 },
  bazina: { n: "Mokřady", fert: 0.7, def: 1.3, cav: 0.6 },
};
// podíl roční sklizně v jednotlivých ročních dobách
const SEASON_GRAIN = [0.15, 1.1, 2.1, 0];

// Budovy v provinciích. cost = [zlaté, dřevo, kámen] za úroveň (násobí se úrovní), time = počet ročních období
const PBUILD = {
  mlyn: { n: "Mlýn", max: 3, cost: [60, 15, 5], time: 1, d: "+8 % obilí za úroveň" },
  pila: { n: "Pila", max: 3, cost: [50, 5, 5], time: 1, d: "+4 dřeva za úroveň", prod: { drevo: 4 } },
  lom: { n: "Kamenolom", max: 3, cost: [60, 15, 0], time: 1, need: p => p.terrain === "kopce" || p.terrain === "hory", d: "+4 kamene (jen kopce a hory)", prod: { kamen: 4 } },
  dul: { n: "Železný důl", max: 3, cost: [120, 25, 10], time: 2, need: p => p.res.includes("zelezo"), d: "+3 železa (jen s ložiskem)", prod: { zelezo: 3 } },
  ovcin: { n: "Ovčín", max: 3, cost: [40, 15, 0], time: 1, need: p => p.terrain !== "bazina", d: "+4 vlny", prod: { vlna: 4 } },
  tkalci: { n: "Cech tkalců", max: 3, cost: [100, 10, 15], time: 2, d: "2 vlna → 2 sukno za úroveň; +měšťané", prod: { sukno: 2 }, use: { vlna: 2 } },
  vinice: { n: "Vinice", max: 3, cost: [70, 10, 0], time: 2, need: p => p.res.includes("vino"), d: "+3 víno (jen s vinohradskou polohou)", prod: { vino: 3 } },
  solivar: { n: "Solivar", max: 3, cost: [110, 20, 10], time: 2, need: p => p.res.includes("sul"), d: "+3 soli (jen se solným pramenem)", prod: { sul: 3 } },
  hrebcin: { n: "Hřebčín", max: 2, cost: [130, 20, 5], time: 2, need: p => p.terrain !== "hory", d: "+1 kůň za úroveň", prod: { kone: 1 } },
  kovarna: { n: "Kovárna", max: 3, cost: [90, 10, 15], time: 1, d: "2 železo → 2 zbraně za úroveň", prod: { zbrane: 2 }, use: { zelezo: 2 } },
  trziste: { n: "Tržiště", max: 3, cost: [80, 15, 10], time: 1, d: "+prosperita, +daň měšťanů, +vliv měšťanů" },
  cesty: { n: "Cesty a mosty", max: 3, cost: [70, 10, 20], time: 2, d: "+mýto, +prosperita, rychlejší přesun" },
  kostel: { n: "Kostel / klášter", max: 3, cost: [90, 10, 30], time: 2, d: "+zbožnost, +učenost, −nepokoje, +duchovenstvo" },
  hradek: { n: "Hrádek", max: 4, cost: [120, 20, 40], time: 3, d: "obrana proti obléhání, −nepokoje" },
  pristav: { n: "Přístav", max: 2, cost: [150, 40, 20], time: 3, need: p => p.terrain === "pobrezi", d: "+obchod po moři, ryby (+obilí)" },
};

// Budovy panského sídla
const SBUILD = {
  hradby: { n: "Hradby", max: 5, cost: [150, 20, 60], time: 3, d: "obrana sídla, +prestiž" },
  donjon: { n: "Donjon (obytná věž)", max: 3, cost: [120, 20, 40], time: 2, d: "+legitimita, +zdraví rodu, +místo pro dvořany" },
  kaple: { n: "Hradní kaple", max: 2, cost: [80, 10, 20], time: 1, d: "+zbožnost, +duchovenstvo" },
  knihovna: { n: "Skriptorium a knihovna", max: 3, cost: [100, 15, 10], time: 2, d: "+2 učenosti za úroveň" },
  staje: { n: "Stáje", max: 3, cost: [70, 20, 5], time: 1, d: "+1 kůň/období, levnější jízda" },
  zbrojnice: { n: "Zbrojnice", max: 3, cost: [90, 15, 20], time: 2, d: "+1 zbraň/období, +výcvik vojska" },
  sypka: { n: "Sýpka", max: 3, cost: [60, 25, 10], time: 1, d: "+150 kapacity obilí, menší zkáza zásob" },
  pokladnice: { n: "Pokladnice a kancelář", max: 3, cost: [100, 10, 20], time: 2, d: "+5 % daní za úroveň" },
  sin: { n: "Hodovní síň", max: 2, cost: [90, 20, 15], time: 2, d: "hostiny levnější a účinnější, +šlechta" },
  zalar: { n: "Žalář", max: 1, cost: [60, 5, 25], time: 1, d: "−nepokoje, +úspěch špeha při odhalování" },
  univerzita: { n: "Univerzita", max: 1, cost: [400, 30, 60], time: 4, need: s => s.techs.univerzita && s.seat.knihovna >= 2, d: "+5 učenosti, +měšťané (vyžaduje objev Univerzita a knihovnu 2)" },
};

// Vojenské jednotky (setniny, zhruba 100 mužů)
const UNITS = {
  hotovost: { n: "Selská hotovost", atk: 2, def: 2, mor: 0.7, cost: 0, up: 1, grain: 1, d: "povolává se z provincií, oslabuje hospodářství" },
  kopinici: { n: "Kopiníci", atk: 3, def: 5, mor: 0.9, cost: 30, up: 2, grain: 1, goods: { zbrane: 1 } },
  lucistnici: { n: "Lučištníci", atk: 4, def: 2, mor: 0.85, cost: 30, up: 2, grain: 1, goods: { drevo: 2 } },
  kusinici: { n: "Kušiníci", atk: 6, def: 3, mor: 0.9, cost: 45, up: 3, grain: 1, goods: { zbrane: 1, drevo: 1 }, tech: "kuse" },
  zbrojnosi: { n: "Zbrojnoši", atk: 6, def: 7, mor: 1.05, cost: 70, up: 4, grain: 1, goods: { zbrane: 2 }, tech: "zbroj" },
  rytiri: { n: "Rytíři", atk: 10, def: 7, mor: 1.2, cost: 120, up: 6, grain: 2, goods: { kone: 2, zbrane: 2 }, cav: true },
  zoldneri: { n: "Žoldnéři", atk: 6, def: 5, mor: 0.95, cost: 90, up: 7, grain: 1, merc: true, d: "naverbují se ihned bez zboží, drahý žold" },
  stroje: { n: "Obléhací stroje", atk: 1, def: 1, mor: 0.8, cost: 100, up: 3, grain: 1, goods: { drevo: 6, zelezo: 1 }, tech: "trebuchet", siege: 25 },
  bombardy: { n: "Bombardy", atk: 5, def: 1, mor: 0.8, cost: 180, up: 4, grain: 1, goods: { zelezo: 4 }, tech: "strelny", siege: 50 },
};
const UNIT_IDS = Object.keys(UNITS);

// Objevy (výzkum). cat = obor, cost = body učenosti
const TECHS = {
  trojpole: { n: "Trojpolní hospodaření", cat: "Zemědělství", cost: 30, d: "+15 % obilí" },
  pluh: { n: "Těžký kolečkový pluh", cat: "Zemědělství", cost: 50, req: ["trojpole"], d: "+10 % obilí, nížiny ještě o 10 % víc" },
  vodni_kolo: { n: "Vodní kolo", cat: "Zemědělství", cost: 40, d: "mlýny a pily vydají o polovinu víc" },
  chov: { n: "Šlechtění koní", cat: "Zemědělství", cost: 45, d: "hřebčíny a stáje +50 %" },
  kovarstvi: { n: "Kovářské cechy", cat: "Řemesla", cost: 40, d: "kovárny a doly +50 %" },
  gotika: { n: "Gotická klenba", cat: "Řemesla", cost: 65, req: ["kovarstvi"], d: "stavby o 20 % levnější, +prestiž za každou stavbu" },
  sukno: { n: "Šlapací stav", cat: "Řemesla", cost: 50, d: "cechy tkalců +50 %" },
  ucetnictvi: { n: "Podvojné účetnictví", cat: "Správa", cost: 55, d: "+10 % daní, nižší úroky" },
  zakonik: { n: "Zemský zákoník", cat: "Správa", cost: 50, d: "−5 nepokojů všude, +10 legitimity" },
  mince: { n: "Ražba grošů", cat: "Správa", cost: 60, req: ["ucetnictvi"], d: "+10 % příjmů z obchodu, pomalejší inflace" },
  smenky: { n: "Směnky a banky", cat: "Správa", cost: 75, req: ["mince"], d: "+20 % z obchodních cest, větší půjčky" },
  univerzita: { n: "Univerzita", cat: "Učenost", cost: 90, req: ["zakonik"], d: "umožní postavit univerzitu v sídle" },
  medicina: { n: "Lékařská škola", cat: "Učenost", cost: 70, req: ["univerzita"], d: "mírnější mor, lepší zdraví rodu" },
  tisk: { n: "Knihtisk", cat: "Učenost", cost: 160, req: ["univerzita", "kovarstvi"], d: "+50 % učenosti" },
  kuse: { n: "Kuše", cat: "Válečnictví", cost: 40, d: "jednotka Kušiníci" },
  zbroj: { n: "Plátová zbroj", cat: "Válečnictví", cost: 80, req: ["kovarstvi"], d: "jednotka Zbrojnoši, rytíři +2 obrany" },
  trebuchet: { n: "Protizávažový trebuchet", cat: "Válečnictví", cost: 60, d: "jednotka Obléhací stroje" },
  taktika: { n: "Vojenské řády", cat: "Válečnictví", cost: 70, req: ["kuse"], d: "+10 % síly v bitvě" },
  strelny: { n: "Střelný prach", cat: "Válečnictví", cost: 150, req: ["trebuchet", "univerzita"], d: "jednotka Bombardy" },
  kompas: { n: "Kompas", cat: "Mořeplavba", cost: 50, d: "námořní výpravy" },
  koga: { n: "Koga", cat: "Mořeplavba", cost: 60, req: ["kompas"], d: "přístavy +50 %, +obchodní cesta navíc" },
  portolan: { n: "Portolánové mapy", cat: "Mořeplavba", cost: 80, req: ["kompas"], d: "+20 % úspěch výprav" },
};
const TECH_IDS = Object.keys(TECHS);

// Výpravy do neznámých krajů
const EXPEDITIONS = {
  hory: { n: "Neprobádané hřebeny", cost: 120, time: 2, chance: 0.6, d: "hledání ložisek – může najít železo nebo stříbro v provincii" },
  sever: { n: "Severní moře", cost: 180, time: 3, chance: 0.5, req: ["kompas"], d: "obchod se severskými kupci: kožešiny, jantar" },
  stepi: { n: "Východní stepi", cost: 220, time: 4, chance: 0.45, d: "karavany po hedvábné stezce – obchodní cesta s hedvábím" },
  levanta: { n: "Levanta", cost: 300, time: 4, chance: 0.45, req: ["koga"], d: "obchodní cesta s kořením, svaté ostatky" },
  ocean: { n: "Západní oceán", cost: 600, time: 6, chance: 0.3, req: ["koga", "portolan"], d: "za obzor – nesmírná prestiž, když se vrátí" },
  knihy: { n: "Cesta k učencům do Bologni", cost: 100, time: 2, chance: 0.8, d: "opisy knih a učitelé – body učenosti" },
};

// Zákony: každý má volby, efekty se počítají v enginu
const LAWS = {
  robota: { n: "Robota", opts: ["Žádná", "Mírná", "Těžká"], d: "Těžší robota zlevní stavby, ale rozhněvá sedláky." },
  nastupnictvi: { n: "Nástupnictví", opts: ["Prvorozenectví", "Volba šlechty", "Dělení dědictví"], d: "Prvorozenectví posiluje legitimitu, volba těší šlechtu, dělení oslabuje říši." },
  mesta: { n: "Městská práva", opts: ["Omezená", "Královská města", "Široká privilegia"], d: "Privilegia zvedají obchod a vliv měšťanů na úkor šlechty." },
  cirkev: { n: "Vztah k církvi", opts: ["Poslušnost Římu", "Rovnováha", "Panovnická investitura"], d: "Investitura dá peníze z církevních statků, ale duchovní ji nesnesou." },
  vojsko: { n: "Branná povinnost", opts: ["Lenní hotovost", "Smíšená", "Placené vojsko"], d: "Lenní hotovost dá hodně mužů z provincií, placené vojsko lepší kázeň." },
  mince: { n: "Mincovní politika", opts: ["Poctivá mince", "Mírné znehodnocení", "Silné znehodnocení"], d: "Znehodnocení přinese zlato hned, ale zvedá ceny a hněvá měšťany." },
  lesy: { n: "Lesní právo", opts: ["Volný přístup", "Panské obory"], d: "Obory přidají prestiž a dřevo panstvu, sedláci ale pytlačí a reptají." },
  tolerance: { n: "Náboženská snášenlivost", opts: ["Pronásledování kacířů", "Snášenlivost"], d: "Pronásledování těší kněze, snášenlivost přitahuje kupce." },
};

const ESTATES = {
  slechta: { n: "Šlechta" },
  duchovni: { n: "Duchovenstvo" },
  mestane: { n: "Měšťané" },
  sedlaci: { n: "Sedláci" },
};
const ESTATE_IDS = Object.keys(ESTATES);
const TAX_LEVELS = ["Žádná", "Nízká", "Střední", "Vysoká", "Krutá"];
const TAX_MULT = [0, 0.5, 1, 1.5, 2.2];
const TAX_LOY = [12, 5, 0, -10, -25];

const COUNCIL = {
  kancler: { n: "Kancléř", stat: "dip", d: "diplomacie, výběr daní" },
  marsal: { n: "Maršálek", stat: "mil", d: "výcvik a morálka vojska, velení" },
  spravce: { n: "Purkrabí (správce)", stat: "spr", d: "výnosy statků, levnější stavby" },
  speh: { n: "Mistr šeptů", stat: "int", d: "zvědové, spiknutí, odhalování zrady" },
  kaplan: { n: "Kaplan", stat: "uce", d: "učenost, zbožnost, vztah s duchovenstvem" },
};
const COUNCIL_IDS = Object.keys(COUNCIL);

const TRAITS = {
  stateny: { n: "Statečný", mil: 3 }, zbabely: { n: "Zbabělý", mil: -3 },
  moudry: { n: "Moudrý", uce: 3, spr: 1 }, prostomyslny: { n: "Prostomyslný", uce: -3 },
  lstivy: { n: "Lstivý", int: 3 }, poctivy: { n: "Poctivý", int: -2, dip: 2 },
  stedry: { n: "Štědrý", dip: 2 }, lakomy: { n: "Lakomý", spr: 2, dip: -1 },
  zbozny: { n: "Zbožný", uce: 1 }, cynik: { n: "Cynik", int: 1 },
  ctizadostivy: { n: "Ctižádostivý", mil: 1, spr: 1 }, lenivy: { n: "Lenivý", spr: -2 },
  kruty: { n: "Krutý", int: 1, dip: -2 }, laskavy: { n: "Laskavý", dip: 2, int: -1 },
  nemocny: { n: "Neduživý" }, silny: { n: "Silný", mil: 1 },
};
const TRAIT_IDS = Object.keys(TRAITS);

const NAMES_M = ["Bořivoj", "Oldřich", "Vítek", "Jindřich", "Smil", "Zbyněk", "Hroznata", "Ctibor", "Bohuslav", "Hynek", "Vok", "Zdeslav", "Kuneš", "Mstidruh", "Ojíř", "Beneš", "Diviš", "Lutobor", "Ratibor", "Sezema", "Jarek", "Slavibor", "Domaslav", "Načerat", "Vilém", "Ota", "Albrecht", "Konrád", "Wolfram", "Anselm"];
const NAMES_F = ["Ludmila", "Dobroslava", "Kunhuta", "Eliška", "Anežka", "Jitka", "Bohuslava", "Markéta", "Zdislava", "Božena", "Mlada", "Svatava", "Vratislava", "Adléta", "Hedvika", "Juta", "Rixa", "Ofka"];
const SURNAMES = ["z Brodu", "z Lipé", "z Dubé", "z Kamene", "z Ronova", "z Hradce", "ze Šternberka", "z Mydlovar", "z Olešnice", "z Jívy", "z Ostroha", "z Pernštejna", "z Vlčího", "z Tasova", "z Bítova"];

// Mapa: provincie (owner: "hrac" nebo id soupeře). res = zvláštní suroviny.
const MAP = [
  { id: "vranov", n: "Vranov", terrain: "kopce", pop: 9000, res: ["zelezo"], owner: "hrac", nb: ["lipnice", "bystrice", "dubova", "kamenec"] },
  { id: "lipnice", n: "Lipnice", terrain: "nizina", pop: 7000, res: ["vino"], owner: "hrac", nb: ["vranov", "bystrice", "rybniky", "brodno"] },
  { id: "bystrice", n: "Bystřice", terrain: "les", pop: 5000, res: [], owner: "hrac", nb: ["vranov", "lipnice", "hlubina", "dubova"] },
  { id: "dubova", n: "Dubová", terrain: "les", pop: 4500, res: [], owner: "zalesi", nb: ["vranov", "bystrice", "hlubina", "zalesi", "kamenec"] },
  { id: "zalesi", n: "Zálesí", terrain: "les", pop: 7500, res: ["zelezo"], owner: "zalesi", nb: ["dubova", "hlubina", "medvezi"] },
  { id: "medvezi", n: "Medvězí", terrain: "hory", pop: 3500, res: ["zelezo", "sul"], owner: "zalesi", nb: ["zalesi", "hlubina", "ostroh"] },
  { id: "hlubina", n: "Hlubina", terrain: "bazina", pop: 3000, res: [], owner: "zalesi", nb: ["bystrice", "dubova", "zalesi", "medvezi", "ostroh"] },
  { id: "kamenec", n: "Kamenec", terrain: "hory", pop: 4000, res: ["zelezo", "sul"], owner: "ostroh", nb: ["vranov", "dubova", "ostroh", "skala"] },
  { id: "ostroh", n: "Ostroh", terrain: "kopce", pop: 8500, res: ["vino"], owner: "ostroh", nb: ["kamenec", "medvezi", "hlubina", "skala", "velehrad"] },
  { id: "skala", n: "Skalná", terrain: "hory", pop: 3500, res: ["sul"], owner: "ostroh", nb: ["kamenec", "ostroh", "velehrad"] },
  { id: "velehrad", n: "Velehrad", terrain: "nizina", pop: 9500, res: ["vino"], owner: "biskup", nb: ["ostroh", "skala", "klasterec", "rybniky"] },
  { id: "klasterec", n: "Klášterec", terrain: "kopce", pop: 5000, res: [], owner: "biskup", nb: ["velehrad", "rybniky", "polany"] },
  { id: "rybniky", n: "Rybníky", terrain: "nizina", pop: 6000, res: [], owner: "biskup", nb: ["lipnice", "velehrad", "klasterec", "brodno", "polany"] },
  { id: "brodno", n: "Brodno", terrain: "pobrezi", pop: 11000, res: ["sul"], owner: "brodno", nb: ["lipnice", "rybniky", "pristavni", "polany"] },
  { id: "pristavni", n: "Přístavní Ves", terrain: "pobrezi", pop: 4500, res: [], owner: "brodno", nb: ["brodno", "severka"] },
  { id: "polany", n: "Polany", terrain: "nizina", pop: 6500, res: [], owner: "sever", nb: ["klasterec", "rybniky", "brodno", "severka", "mezirici"] },
  { id: "severka", n: "Severka", terrain: "pobrezi", pop: 5500, res: [], owner: "sever", nb: ["pristavni", "polany", "mezirici"] },
  { id: "mezirici", n: "Meziříčí", terrain: "kopce", pop: 7000, res: ["zelezo"], owner: "sever", nb: ["polany", "severka", "hradek_s"] },
  { id: "hradek_s", n: "Wolfsburk", terrain: "hory", pop: 4000, res: ["zelezo", "sul"], owner: "sever", nb: ["mezirici"] },
];

const RIVALS = [
  { id: "zalesi", n: "Vévodství Zálesí", title: "vévoda", ruler: "Boleslav Divoký", traits: ["ctizadostivy", "kruty"], aggr: 0.7, greed: 0.5, piety: 0.3, wealth: 1.0 },
  { id: "ostroh", n: "Hrabství Ostrožské", title: "hrabě", ruler: "Ota z Ostroha", traits: ["lstivy", "lakomy"], aggr: 0.5, greed: 0.8, piety: 0.4, wealth: 1.1 },
  { id: "biskup", n: "Biskupství Velehradské", title: "biskup", ruler: "Anselm z Velehradu", traits: ["zbozny", "moudry"], aggr: 0.2, greed: 0.5, piety: 1.0, wealth: 1.2 },
  { id: "brodno", n: "Svobodné město Brodno", title: "purkmistr", ruler: "Konrád Kupec", traits: ["lakomy", "poctivy"], aggr: 0.15, greed: 1.0, piety: 0.4, wealth: 1.6 },
  { id: "sever", n: "Markrabství Severní", title: "markrabě", ruler: "Wolfram Železný", traits: ["stateny", "ctizadostivy"], aggr: 0.8, greed: 0.4, piety: 0.5, wealth: 0.9 },
];
