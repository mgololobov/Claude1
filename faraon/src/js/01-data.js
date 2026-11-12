// Pán Obou zemí – data: kalendář, terén, vojsko, hodnosti, rozkazy, stavby, výpravy, vědění, zákony, stavy.
// Letopočty podle běžné „střední“ chronologie (I. Shaw, The Oxford History of Ancient Egypt, 2000); nejistota je desítky let.

// Egyptský občanský rok: tři období po čtyřech měsících o 30 dnech + 5 dní navíc (epagomenální).
const SEASONS = ["achet", "peret", "šemu"];
const SEASON_D = ["záplava", "setí a růst", "sklizeň"];
const monthName = m => `${(m % 4) + 1}. měsíc období ${SEASONS[Math.floor(m / 4)]}`;
const monthShort = m => `${(m % 4) + 1}. ${SEASONS[Math.floor(m / 4)]}`;
const FLOOD_MONTH = 1;   // vrchol záplavy (2. měsíc období achet) – nilometr ukáže výšku
const HARVEST_MONTH = 8; // sklizeň a výběr daně (1. měsíc období šemu)
const OSIRIS_MONTH = 3;  // Usirovy mystéria v Abydu (herní termín; přesné datum ve Střední říši není jisté)
// Pozn.: občanský kalendář (365 dní) se vůči skutečným ročním obdobím posouval o den za čtyři roky. Hra ho pro přehlednost drží v souladu se záplavou.

const TERRAIN = {
  udoli: { n: "Nilské údolí", agri: 1.0, def: 1.0, vuz: 1.15, nile: 1 },
  delta: { n: "Delta (bažiny a pastviny)", agri: 1.05, def: 1.2, vuz: 0.7, nile: 1 },
  fajjum: { n: "Fajjúmská pánev", agri: 1.1, def: 1.05, vuz: 1.0, nile: 1 },
  nubie: { n: "Núbijské údolí", agri: 0.55, def: 1.15, vuz: 0.9, nile: 1 },
  katarakt: { n: "Katarakt (skaliska)", agri: 0.35, def: 1.5, vuz: 0.5, nile: 1 },
  oaza: { n: "Oáza", agri: 0.5, def: 1.35, vuz: 0.8, nile: 0 },
  poust: { n: "Poušť a vádí", agri: 0.08, def: 1.25, vuz: 0.9, nile: 0 },
  kenaan: { n: "Kenaanská nížina a pahorky", agri: 0.5, def: 1.2, vuz: 1.05, nile: 0 },
};

// Vojsko. Počty v mužích; síla útoku/obrany na 100 mužů. Cena v debenech na 100 mužů.
// Ceny jsou kalibrované podle bojového modelu (tests/balance_calibrate.js): za stejný počet mužů stojí lučištník ≈ 1,13×, Médžaj ≈ 2×
// a válečný vůz ≈ 2,3× to, co by odpovídalo jeho skutečné síle v boji; zbytek je přirážka za výcvik, koně a řemeslníky. Koně navíc omezují počet vozů.
// Příděl: každý voják dostává 1,5 charu obilí měsíčně (char ≈ 77 litrů).
const TROOPS = {
  kopinici: { n: "Kopiníci", atk: 1.0, def: 1.3, cost: 150, col: "#9a7b4f" },
  lucistnici: { n: "Lučištníci", atk: 1.35, def: 0.8, cost: 220, col: "#5f7f3f" },
  medzajove: { n: "Médžajové", atk: 1.6, def: 1.1, cost: 330, upd: 0.3, col: "#7a4b8c", d: "núbijští lučištníci a zvědové z pouště, žoldnéři" },
  vozy: { n: "Válečné vozy", atk: 2.6, def: 1.4, cost: 360, horses: 100, col: "#a3332b", d: "vyžaduje vědění Válečný vůz a koně" },
};
const TROOP_IDS = Object.keys(TROOPS);
const RATION_SOLDIER = 1.5;

// Hodnostní tituly Staré a Střední říše: seš, semer uati, hatia, heri-tep aa (nomarcha), iri-pat. Plat je měsíční příděl v charech obilí (herní odhad).
const RANKS = [
  { n: "Písař (seš)", cmd: 600, pay: 20, merit: 0 },
  { n: "Jediný přítel (krále)", cmd: 1200, pay: 40, merit: 60 },
  { n: "Hatia (představený)", cmd: 2500, pay: 80, merit: 180 },
  { n: "Velký představený nomu", cmd: 4500, pay: 150, merit: 400 },
  { n: "Iripat hatia (přední muž země)", cmd: 8000, pay: 250, merit: 800 },
];

const STATS = { ved: "Velení", uda: "Statečnost", roz: "Moudrost", spr: "Správa" };
const STAT_IDS = Object.keys(STATS);

const TRAITS = {
  stateny: { n: "Statečný", uda: 8 }, zbabely: { n: "Zbabělý", uda: -10 },
  moudry: { n: "Moudrý", roz: 8 }, prchlivy: { n: "Prchlivý", roz: -5, uda: 4 },
  lstivy: { n: "Lstivý", roz: 5, loy: -5 }, verny: { n: "Věrný", loy: 15 },
  ctizadostivy: { n: "Ctižádostivý", ved: 4, loy: -10 }, skromny: { n: "Skromný", loy: 8 },
  zbozny: { n: "Zbožný", roz: 2 }, chamtivy: { n: "Chamtivý", spr: 4, loy: -6 },
  stedry: { n: "Štědrý" }, kruty: { n: "Krutý", ved: 3 },
  hospodar: { n: "Dobrý hospodář", spr: 10 }, vojevudce: { n: "Rozený vojevůdce", ved: 10 },
  vyrecny: { n: "Výmluvný", roz: 6 }, nemocny: { n: "Neduživý" }, silny: { n: "Silák", uda: 6 },
};
const TRAIT_IDS = Object.keys(TRAITS);

// Rozkazy úředníkům (jeden za měsíc). cost = debeny, grain = obilí (příděly pro robotníky).
const CMDS = {
  zavlaha: { n: "Kanály a hráze", d: "robotníci prohloubí kanály a opraví hráze – víc orné půdy", cost: 100, grain: 3000, stat: "spr" },
  remesla: { n: "Dílny a trhy", d: "podpora řemesel (len, keramika, kov) a směny – vyšší výnos v debenech", cost: 300, stat: "spr" },
  hradby: { n: "Opravit hradby", d: "obnoví cihlové hradby pevnosti", cost: 200, grain: 1500, stat: "spr" },
  odvod: { n: "Odvod mužů", d: "povolá muže z vesnic do vojska", cost: 0, stat: "ved" },
  vycvik: { n: "Výcvik vojska", d: "zvýší výcvik posádky", cost: 50, stat: "ved" },
  rozdat: { n: "Rozdat obilí", d: "naplní obecní sýpky z pokladu – chrání před hladem, těší lid", cost: 0, stat: "spr" },
  scitani: { n: "Sčítání lidu a dobytka", d: "nový soupis polí a stád: na dva roky vyšší výnos daně, lid reptá", cost: 150, stat: "spr" },
  obeti: { n: "Obětiny v chrámu", d: "dary místnímu bohu: maat, přízeň kněží, spokojenost", cost: 400, grain: 2000, stat: "roz" },
  hledat: { n: "Hledat schopné muže", d: "hledá písaře a bojovníky, kteří by vstoupili do služby", cost: 100, stat: "roz" },
  uceni: { n: "Dům života", d: "písaři opisují a studují texty – body vědění", cost: 250, stat: "roz" },
  stavba: { n: "Řídit stavbu", d: "zahájí stavbu v nomu", cost: 0, stat: "spr" },
  vyprava: { n: "Vést výpravu", d: "výprava do lomů, dolů nebo cizích zemí (úředník odjede na několik měsíců)", cost: 0, stat: "spr" },
  zvedy: { n: "Vyzvědět nom", d: "zjistí přesný stav cizího nomu", cost: 150, stat: "roz" },
  podnecovat: { n: "Podněcovat nepokoje", d: "sníží spokojenost a posádku v cizím nomu", cost: 600, stat: "roz" },
  naklonit: { n: "Naklonit si cizího úředníka", d: "dary a sliby – sníží jeho věrnost, případně přejde k tobě", cost: 800, stat: "roz" },
  presun: { n: "Odjet do jiného nomu", d: "přesun úředníka (dorazí příští měsíc)", cost: 0, stat: null },
};

// Stavby v nomu: debeny (materiál) + obilí (příděly pro robotníky), doba v měsících.
// Během záplavy (Achet) se staví rychleji – rolníci nemohou na pole a jdou na robotu.
const BUILD = {
  pevnost: { n: "Pevnost (cihlové hradby)", cost: 3000, grain: 12000, time: 5, max: 5, d: "silnější obrana, delší obléhání" },
  chram: { n: "Chrám místního boha", cost: 5000, grain: 30000, time: 8, max: 3, d: "maat, přízeň kněží, spokojenost lidu, body vědění" },
  sypka: { n: "Státní sýpky", cost: 1500, grain: 8000, time: 3, max: 3, d: "menší ztráty obilí, větší obecní zásoby proti hladu" },
  dilny: { n: "Dílny (len, keramika, kov)", cost: 3000, grain: 10000, time: 4, max: 3, d: "+20 stropu řemesel a obchodu" },
  pristav: { n: "Přístaviště a loděnice", cost: 2500, grain: 10000, time: 4, max: 2, need: p => TERRAIN[p.ter].nile || p.coast, d: "+15 stropu obchodu, rychlejší přesun vojska po Nilu" },
  lom: { n: "Lom nebo důl", cost: 3000, grain: 15000, time: 5, max: 3, need: p => p.res.some(r => RES[r] && RES[r].mine), d: "výnos podle suroviny" },
};

// Suroviny nomu. mine = lze těžit stavbou Lom/důl; deben = měsíční výnos za úroveň.
const RES = {
  zlato: { n: "zlato", mine: 1, deben: 250 },
  med: { n: "měď", mine: 1, deben: 120 },
  tyrkys: { n: "tyrkys", mine: 1, deben: 100 },
  kamen: { n: "stavební kámen (žula, pískovec, vápenec)", mine: 1, deben: 50 },
  alabastr: { n: "alabastr (travertin)", mine: 1, deben: 100 },
  natron: { n: "natron (soda k mumifikaci)", mine: 1, deben: 70 },
  papyrus: { n: "papyrus", deben: 60 },
  dobytek: { n: "skot (pastviny)", deben: 50 },
  vino: { n: "datle a víno", deben: 50 },
  eben: { n: "eben a slonovina", deben: 90 },
};

// Výpravy: from = nomy, ze kterých lze vyrazit (vlastní), months = délka, risk = šance neúspěchu.
const EXPED = {
  hammamat: { n: "Vádí Hammámát – kámen bechen a zlato", from: ["ham", "u5"], months: 3, deben: [3000, 6000], prestige: 8, risk: 0.1, foe: "Médžajové v poušti" },
  hatnub: { n: "Hatnub – alabastrové lomy", from: ["u15"], months: 2, deben: [2000, 3500], prestige: 6, risk: 0.05, foe: "pouštní nomádi" },
  sinaj: { n: "Sinaj – tyrkys (Serábit el-Chádim, Vádí Maghára) a měď", from: ["sin", "l20", "l14"], months: 4, deben: [4000, 7000], prestige: 10, maat: 2, risk: 0.15, foe: "kmeny Aamu" },
  zlato: { n: "Zlaté doly Vavatu (vádí Allákí)", from: ["n_wawat"], months: 3, deben: [5000, 9000], prestige: 6, risk: 0.15, foe: "núbijské kmeny" },
  byblos: { n: "Byblos – cedrové dřevo (aš) a olej", from: ["l6", "l14", "lav"], months: 5, deben: [3000, 5000], cedar: 1, prestige: 12, risk: 0.15, tech: "namorni", foe: "bouře a piráti" },
  punt: { n: "Punt – kadidlo, myrha, eben a zlato", from: ["sau"], months: 8, deben: [12000, 20000], prestige: 40, maat: 6, risk: 0.25, tech: "namorni", foe: "bouře na Rudém moři" },
};

const TECHS = {
  nilometr: { n: "Měření záplav", cat: "Zemědělství", cost: 50, d: "značky výšky vody a letopisy záplav (zapisuje je už Palermská deska ze Staré říše): předpověď v 1. měsíci období achet, hlad mírnější o třetinu" },
  hraze: { n: "Nádrže a hráze", cat: "Zemědělství", cost: 80, d: "lepší síť hrází a přepouštění vody do nádrží (kotlinové zavlažování): +10 stropu polí v údolí a v Deltě" },
  fajjum: { n: "Kolonizace Fajjúmu", cat: "Zemědělství", cost: 120, req: ["hraze"], d: "odvodnění a osídlení pánve u Bahr Júsufu, jak to provedli králové 12. dynastie: +30 stropu polí ve Fajjúmu, +5 jinde" },
  dobytek: { n: "Chov koní", cat: "Zemědělství", cost: 70, req: ["vuz"], d: "hřebčíny na pastvinách Delty: dvojnásobek koní (kůň přišel do Egypta až s Hyksósy)" },
  pisari: { n: "Písařské školy", cat: "Správa", cost: 60, d: "výuka hieratického písma a účetnictví (školní text Kemit je ze Střední říše): +10 % debenů ze nomů" },
  katastr: { n: "Soupisy polí", cat: "Správa", cost: 90, req: ["pisari"], d: "vyměřování polí po opadnutí vody a jejich zápis: +10 % daně ze sklizně" },
  vezir: { n: "Ústřední úřady (varet)", cat: "Správa", cost: 110, req: ["pisari"], d: "rozdělení správy na úřady Severu, Jihu a „Hlavy Jihu“ jako za Senusreta III.: úředníci +5 věrnosti, vezír působí silněji" },
  kamenictvi: { n: "Bronzové nástroje kameníků", cat: "Stavitelství", cost: 90, req: ["bronz"], d: "dláta a pily z cínového bronzu místo měděných: stavby o 20 % levnější" },
  pevnosti: { n: "Pevnostní stavitelství", cat: "Stavitelství", cost: 110, d: "cihlové hradby s baštami, příkopem a šikmým náspem, jak je známe z núbijských pevností 12. dynastie (Buhen): +25 % obrany, +50 výdrže hradeb" },
  texty: { n: "Texty rakví", cat: "Náboženství a učenost", cost: 70, d: "zaříkání pro posmrtný život psaná na rakve hodnostářů (z Asjútu, Beni Hasanu, Beršy): lid +5 spokojenosti, maat roste rychleji" },
  matematika: { n: "Matematika písařů", cat: "Náboženství a učenost", cost: 100, req: ["pisari"], d: "výpočty ploch, objemů sýpek a přídělů (Moskevský a Rhindův papyrus): +25 % bodů vědění, stavby o měsíc kratší" },
  lekarstvi: { n: "Lékařské papyry", cat: "Náboženství a učenost", cost: 120, req: ["pisari"], d: "sbírky diagnóz a léčby (Kahúnský papyrus ze Střední říše, chirurgický Smithův papyrus opsaný v Druhém přechodném období): nižší úmrtnost a mírnější nákazy" },
  hvezdy: { n: "Hvězdné hodiny", cat: "Náboženství a učenost", cost: 90, req: ["matematika"], d: "měření nočních hodin podle dekanů (diagonální hvězdné hodiny na víkách rakví z Asjútu): chrámové obřady v pravou hodinu, +2 maat ročně" },
  bronz: { n: "Cínový bronz", cat: "Válečnictví", cost: 80, d: "slitina mědi s dováženým cínem nahrazuje arzenovou měď (běžná od Střední říše): kopiníci a lučištníci +15 % útoku" },
  luk: { n: "Kompozitní luk", cat: "Válečnictví", cost: 100, d: "luk ze dřeva, rohoviny a šlach s delším dostřelem, do Egypta se rozšířil v Druhém přechodném období: lučištníci a Médžajové +30 % útoku" },
  vuz: { n: "Válečný vůz a kůň", cat: "Válečnictví", cost: 160, req: ["bronz"], d: "lehký vůz s loukoťovými koly tažený dvěma koňmi. Hyksósové koně chovali (koňské hroby v Avaridu); jak hojně vozy nasazovali v boji, je sporné. Umožní válečné vozy" },
  chopes: { n: "Chopeš a sekery levantského typu", cat: "Válečnictví", cost: 90, req: ["bronz"], d: "srpovitý meč a úzké průbojné sekery z Předního východu: kopiníci +20 % útoku" },
  zbroj: { n: "Kožená zbroj", cat: "Válečnictví", cost: 110, req: ["bronz"], d: "kabátce z kůže a velké štíty z volské kůže (kovová šupinová zbroj je až z Nové říše): +15 % obrany vojska" },
  flotila: { n: "Válečné lodě na Nilu", cat: "Válečnictví", cost: 80, d: "přeprava vojska po řece, jak ji líčí Anchtifi i Kamose: dva nomy za měsíc, +10 % útoku v údolí" },
  namorni: { n: "Námořní lodě (kebenit)", cat: "Válečnictví", cost: 120, req: ["flotila"], d: "„byblské lodě“ pro plavbu po moři: výpravy do Byblu a do Puntu" },
  vcelarstvi: { n: "Včelařství", cat: "Zemědělství", cost: 50, d: "úly z hliněných válců, jak je zobrazuje reliéf ze slunečního chrámu krále Neuserrea (5. dynastie); med pro obětiny a léky: +4 % debenů" },
  vinarstvi: { n: "Vinné lisy a sklepy", cat: "Zemědělství", cost: 60, d: "lisování v pytlovém lisu a zrání v pečetěných džbánech s údajem o vinici: dvojnásobný výnos vína a datlí" },
  pekarny: { n: "Velkopekárny a pivovary", cat: "Zemědělství", cost: 80, req: ["pisari"], d: "společné pekárny a pivovary pro vojsko a robotníky, jak je ukazují dřevěné modely z hrobky Meketrea (11. dynastie): příděly vojákům o 10 % menší" },
  fajans: { n: "Modrá fajáns", cat: "Řemesla", cost: 60, d: "glazovaná keramika z drceného křemene (známí modří hroši Střední říše): +5 stropu obchodu ve městech" },
  tkalci: { n: "Tkalcovny lnu", cat: "Řemesla", cost: 70, d: "jemné lněné plátno z vodorovných stavů v chrámových a palácových dílnách: +5 % debenů" },
  pecete: { n: "Skarabové pečetě", cat: "Správa", cost: 80, req: ["pisari"], d: "pečetě v podobě skarabea se jménem úředníka, ve Střední říši a za Hyksósů velmi rozšířené: zpronevěry se neodhalí pozdě, +3 % debenů" },
  zpravy: { n: "Vojenské zprávy", cat: "Správa", cost: 90, req: ["pisari"], d: "pravidelná hlášení posádek o pohybu cizinců, jaká se dochovala z pevnosti Semna (12. dynastie): vidíš nomy do vzdálenosti dvou přechodů" },
  hlidky: { n: "Pouštní hlídky", cat: "Válečnictví", cost: 80, d: "hlídky Médžajů a stopařů na pouštních cestách: polovina nájezdů kmenů se nepodaří" },
  obleh: { n: "Obléhací žebříky a štíty", cat: "Válečnictví", cost: 100, d: "žebříky na kolech a kryté beranidlo, jaké ukazují malby obléhání v Beni Hasanu: obléhání o 30 % rychlejší" },
  klenba: { n: "Klenuté sýpky", cat: "Stavitelství", cost: 70, d: "cihlové klenby a kopule sýpek chrání obilí před vlhkostí a myšmi: menší ztráty, obecní zásoby o 30 % větší" },
  obelisky: { n: "Lodě na kámen", cat: "Stavitelství", cost: 120, req: ["flotila"], d: "nákladní lodě a vlečné čluny pro obelisky a sochy z asuánské žuly (obelisky Senusreta I.): velké stavby a hrobky o 20 % levnější" },
  usirkult: { n: "Mystéria pro všechny", cat: "Náboženství a učenost", cost: 90, req: ["texty"], d: "každý může postavit stélu u „Terasy velkého boha“ a mít podíl na Usirově vzkříšení: Usirovy mystéria dávají maat +3 navíc, lid +3" },
};
Object.assign(TECHS, {
  pyrmesta: { n: "Města stavitelů", cat: "Stavitelství", cost: 110, req: ["pisari"], d: "plánovaná města pro robotníky u královských staveb, jako Lahún (Kahún) u pyramidy Senusreta II.: hrobka a velké stavby rostou o polovinu rychleji" },
  ochrana: { n: "Ochrana hrobů", cat: "Stavitelství", cost: 90, d: "padací kamenné bloky, slepé chodby a skryté vstupy, jaké měly pyramidy 12. dynastie: vykradači hrobů ti nehrozí" },
  zlatnictvi: { n: "Zlatnictví a granulace", cat: "Řemesla", cost: 100, d: "pektorály, náramky a koruny z poklady princezen z Dahšúru a Lahúnu: dary cizím rodům působí o polovinu víc" },
  papyrdilny: { n: "Papyrové dílny", cat: "Řemesla", cost: 70, d: "výroba papyrových svitků ve velkém z bažin Delty: +10 % bodů vědění, dvojnásobný výnos papyru" },
  osli: { n: "Karavany oslů", cat: "Správa", cost: 80, d: "velké karavany oslů pro výpravy do pouště, jaké vedl Harchuf do země Jam: výpravy o měsíc kratší a o třetinu bezpečnější" },
  tlumocnici: { n: "Představení tlumočníků", cat: "Správa", cost: 90, d: "úřad tlumočníků a znalců cizích zemí (titul doložený u hodnostářů z Elefantiny): vztahy s cizími rody se zlepšují snáz" },
  sehel: { n: "Kanál u 1. kataraktu", cat: "Stavitelství", cost: 120, req: ["flotila"], d: "průplav skalami u ostrova Sehel, který dal vyčistit Senusret III. pro lodě do Núbie: nilská cesta do Núbie vynáší o 30 % víc, Elefantina +5 stropu obchodu" },
});
Object.assign(TECHS, {
  ptaci: { n: "Ptačí sítě a chov hus", cat: "Zemědělství", cost: 50, d: "lov vodního ptactva velkými sítěmi v bažinách a výkrm hus, známé z maleb hrobek od Staré říše: víc potravy pro lid v údolí a v Deltě" },
  sothis: { n: "Pozorování Sothidy", cat: "Náboženství a učenost", cost: 100, req: ["hvezdy"], d: "zápis o heliakickém východu Síria (Sothidy) v chrámovém archivu v Lahúnu (12. dynastie): přesná předpověď záplavy i bez nilometru, +1 maat ročně" },
  balzam: { n: "Balzamovací dílny", cat: "Náboženství a učenost", cost: 80, d: "„krásné domy“ balzamovačů s vyjímáním vnitřností a natronem: důstojný pohřeb, nástupce získá maat +2" },
  sklady: { n: "Zásobovací sklady vojska", cat: "Válečnictví", cost: 90, req: ["pisari"], d: "sklady obilí v pevnostech a na pochodových cestách, jaké měly núbijské pevnosti: při prázdných sýpkách dezertuje jen polovina vojáků" },
  zapas: { n: "Zápasnický výcvik", cat: "Válečnictví", cost: 70, d: "stovky zápasnických chvatů namalovaných v hrobkách nomarchů v Beni Hasanu: výcvik vojska je účinnější" },
  protosin: { n: "Protosinajské písmo", cat: "Správa", cost: 90, d: "písmo semitských dělníků v dolech na tyrkys v Serábit el-Chádim, odvozené z hieroglyfů – předek abeced: výpravy na Sinaj bezpečnější a výnosnější, lepší vztahy s Asiaty" },
  clun: { n: "Nákladní čluny na obilí", cat: "Správa", cost: 80, req: ["flotila"], d: "flotila nákladních člunů svážejících daň do státních sýpek (lodě v modelech z hrobky Meketrea): převoz obilí za poloviční cenu, +2 % daně" },
});
const TECH_IDS = Object.keys(TECHS);
// Dovednosti známé od Staré říše mají egyptské rody od počátku; nově je musí objevit jen ostatní.
const OLD_TECHS = ["vcelarstvi", "vinarstvi", "fajans", "tkalci", "klenba", "ptaci", "balzam"];

const LAWS = {
  robota: { n: "Robota", opts: ["Mírná", "Obvyklá", "Těžká"], d: "Těžší robota zlevní a urychlí stavby a kanály, ale lid reptá." },
  nomarchove: { n: "Postavení nomarchů", opts: ["Dědičné úřady", "Jmenování panovníkem", "Omezení moci nomarchů"], d: "Dědičné úřady těší úředníky a nomarchy, omezení dá víc daní, ale nomarchové se bouří. (Dědičnými se úřady nomarchů staly koncem Staré říše; jejich moc omezil až Senusret III.)" },
  chramy: { n: "Chrámové statky", opts: ["Osvobození od daní a roboty", "Rovnováha", "Zdanění chrámů"], d: "Osvobození (známé z královských dekretů z Koptu ze Staré říše) těší kněze a maat; zdanění dá debeny, kněží se hněvají." },
  vojsko: { n: "Vojsko", opts: ["Místní hotovost nomarchů", "Smíšené", "Stálé vojsko"], d: "Hotovost je levná, ale málo vycvičená; stálé vojsko je dražší a lepší." },
  nastupnictvi: { n: "Nástupnictví", opts: ["Nejstarší syn", "Spoluvláda dědice", "Nejschopnější z rodu"], d: "Spoluvláda (doložená od 12. dynastie, Amenemhat I. a Senusret I.) zajistí hladké předání vlády; nejschopnější těší úředníky, ale budí spory." },
};
Object.assign(LAWS, {
  cizinci: { n: "Hranice a cizinci", cat: "Země a lidé", opts: ["Uzavřené hranice", "Pohraniční trhy", "Volné usídlování"], d: "Hraniční stéla Senusreta III. ze Semny zakazovala Núbijcům plout na sever, kromě obchodu v Ikenu. Jinde se Aamu v Deltě usazovali – z nich vyrostl Avaris.", eff: ["nájezdy kmenů o 30 % slabší, obchodní cesty −10 %", "", "Delta +5 % debenů a rychlejší růst, nájezdy o 15 % silnější, lepší vztahy s Asiaty"] },
  soudy: { n: "Soudnictví", cat: "Země a lidé", opts: ["Soud vezíra", "Místní soudní rady (kenbet)", "Soud nomarchů"], d: "Vezír předsedal „velké síni“ a rozhodoval i spory z nomů; v nomech zasedaly místní soudní rady kenbet. Za přechodných období soudili mocní nomarchové sami.", eff: ["maat roste, 150 debenů měsíčně, úředníci −2 věrnosti", "", "úředníci +4 věrnosti, maat pomalu klesá"] },
  tresty: { n: "Tresty a útěky z roboty", cat: "Země a lidé", opts: ["Mírné tresty", "Obvyklé", "Tvrdé tresty a Velké vězení"], d: "Papyrus Brooklyn (13. dynastie) je seznam lidí, kteří utekli z roboty; jejich rodiny zadržovalo „Velké vězení“ (chenret ur), dokud se nevrátili.", eff: ["lid +, stavby o 5 % pomalejší, vzpoury častější", "", "stavby a kanály o 10 % rychlejší, vzpoury vzácnější, lid −"] },
  sypky: { n: "Státní sýpky", cat: "Hospodářství", opts: ["Prodej přebytků", "Rovnováha", "Povinné zásoby v nomech"], d: "Představení sýpek spravovali obilí státu; v hubených letech rozhodovalo, kolik zbylo v obecních zásobách.", eff: ["obilí se prodává o čtvrtinu dráž, obecní zásoby menší", "", "obecní zásoby o 40 % větší, daň ze sklizně −5 %, lid +"] },
  obchod: { n: "Výpravy a obchod", cat: "Hospodářství", opts: ["Královský monopol výprav", "Smíšené", "Volný obchod chrámů a měst"], d: "Výpravy do lomů, dolů a Puntu vypravoval král; obchod na řece a v přístavech vedli i chrámy a hodnostáři.", eff: ["výpravy vynesou +20 %, obchodní cesty −15 %", "", "obchodní cesty +20 %, výpravy −15 %"] },
  skoly: { n: "Výchova písařů", cat: "Správa", opts: ["Jen synové úředníků", "Chrámové školy", "Otevřené školy"], d: "Úřady se dědily z otce na syna; Satira na povolání ale láká i syny řemeslníků: „Staň se písařem!“", eff: ["vědění −10 %, nomarchové +", "", "vědění +15 %, víc schopných mužů, 100 debenů měsíčně, nomarchové −"] },
});
const LAW_CATS = { robota: "Země a lidé", cizinci: "Země a lidé", soudy: "Země a lidé", tresty: "Země a lidé", nomarchove: "Správa", skoly: "Správa", nastupnictvi: "Správa", chramy: "Náboženství", sypky: "Hospodářství", obchod: "Hospodářství", vojsko: "Vojsko" };
const ESTATES = { knezi: "Kněží", nomarchove: "Nomarchové a hodnostáři", pisari: "Písaři", lid: "Rolníci a řemeslníci" };
const ESTATE_IDS = Object.keys(ESTATES);
// Podíl sklizně odváděný státu (daň v obilí)
const TAX_LEVELS = ["Desetina", "Osmina", "Pětina", "Čtvrtina", "Třetina"];
const TAX_RATE = [0.1, 0.125, 0.2, 0.25, 0.33];

const OFFICES = {
  vezir: { n: "Vezír (tjati)", stat: "spr", d: "nejvyšší úředník: věrnost úředníků, výnos daní" },
  pokladnik: { n: "Pokladník (imi-ra chetemet)", stat: "spr", d: "„představený zapečetěných věcí“ – sklady drahých kovů, látek a olejů: víc debenů" },
  sypky: { n: "Představený sýpek (imi-ra šenuti)", stat: "spr", d: "menší ztráty obilí a lepší sklizeň" },
  vojsko: { n: "Velitel vojska (imi-ra meša)", stat: "ved", d: "výcvik všech posádek každý měsíc" },
  knez: { n: "Představený kněží (imi-ra hemu-necer)", stat: "roz", d: "maat a přízeň kněží každý měsíc" },
};

// Jména podle kultury (pro úředníky tvořené hrou). Egyptská jména jsou doložená pro Střední říši a přechodná období.
const NAMES = {
  eg: { m: ["Intef", "Iku", "Cheti", "Senbi", "Meru", "Iti", "Henenu", "Sobekhotep", "Džehuti", "Nacht", "Hetepi", "Ipi", "Meketre", "Ankhu", "Renseneb", "Neferhotep", "Sabni", "Hekaib", "Iha", "Rensi", "Bebi", "Pepi", "Teti", "Ini", "Chuu", "Seneb", "Kemsu", "Amenemhat", "Montuhotep", "Džefai", "Ib", "Kai", "Henu", "Merer", "Chnumhotep", "Ameni", "Sobeknacht", "Iuf", "Tjeti", "Nedžemib", "Hapidžefai"],
    f: ["Neferu", "Iah", "Sathathor", "Mereret", "Nebet", "Henut", "Tjat", "Anchesi", "Senet", "Nefret", "Satmontu", "Meryt", "Kemsit", "Ašajet", "Henhenet", "Satsobek", "Renesnebet", "Itet", "Hepet", "Neferut"] },
  hyk: { m: ["Jakobhar", "Anathar", "Semken", "Janasi", "Šešej", "Abiša", "Chajan", "Abdu", "Sikerhar", "Bnon", "Aperanat", "Nuja", "Ahmose", "Ipi", "Neferhotep", "Senbi", "Sobekhotep"],
    f: ["Tani", "Herit", "Anati", "Šarek", "Iti", "Nebet", "Senet", "Meryt"] },
  nub: { m: ["Awawa", "Kaa", "Teriahi", "Ijerkej", "Wenkat", "Tekeru", "Senemuer", "Arkhi", "Bakuaket", "Šaat", "Merkus", "Iteru", "Hekaneh", "Anuket"],
    f: ["Abar", "Kandaka", "Nehet", "Sešat", "Iriket", "Tabiri"] },
  lib: { m: ["Wenet", "Kapur", "Mešer", "Hesi", "Teha", "Iner", "Marai", "Weneš", "Kepi", "Betut"], f: ["Tenet", "Hesit", "Marit"] },
  aam: { m: ["Abiša", "Jamu", "Hadar", "Ibšemu", "Sapir", "Jakar", "Nahir", "Šubaj", "Kenaz"], f: ["Adah", "Tamar", "Šiprah"] },
};
// Jména Hyksósů podle skarabů a nápisů (Jakobhar, Anathar, Šešej, Chajan, Sikerhar); núbijská a libyjská jména jsou herní, inspirovaná egyptskými záznamy (proklínací texty).
// Jména pro dětí a vládce tvořené hrou: běžná jména doby, ne jména konkrétních historických panovníků.
const SON_NAMES = { eg: ["Intef", "Montuhotep", "Cheti", "Ahmose", "Amenemhat", "Sobekhotep", "Senbi", "Džehutinacht", "Iku", "Nacht", "Ameni", "Hetepi"], hyk: ["Jakobhar", "Anathar", "Janasi", "Abiša", "Semken"], nub: ["Awawa", "Kaa", "Teriahi", "Wenkat", "Tekeru"], lib: ["Kapur", "Mešer", "Weneš"], aam: ["Abiša", "Jamu", "Hadar"] };

// Bohové nomů (pro chrámy)
const GODS = { sar: "Baal a Anat (kenaanští bohové)", u1: "Chnum a Satet", u2: "Hor Behdetský", u3: "Nechbet a Hor Nechenský", u4: "Amon a Montu", u5: "Min a Eset", u6: "Hathor", u7: "Bat a Hathor", u8: "Usir a Chontamenti", u9: "Min", u10: "Nemtej", u11: "Chnum", u12: "Nemtej", u13: "Upuaut", u14: "Hathor", u15: "Thovt", u16: "Pachet a Hor", u17: "Anup", u18: "Nemtej", u19: "Sutech", u20: "Herišef", u21: "Chnum", u22: "Hathor", fa: "Sobek", l1: "Ptah", l2: "Hor Chentejirti", l13: "Re a Atum", l3: "Hathor a Sachmet", l5: "Neit", l6: "Vadžet", lx: "místní bůh Xoidy", l12: "Onuris", l16: "Banebdžedet (beran)", l18: "Bastet", lav: "Sutech", l20: "Atum", l14: "Hor Mesenský", o_bah: "místní bohové oázy", o_dak: "místní bohové oázy", o_kha: "místní bohové oázy", lib: "Aš", sin: "Hathor, paní tyrkysu", ham: "Min", sau: "Min", n_wawat: "Hor Miamský", n_buhen: "Hor Buhenský", n_semna: "Dedun", n_sai: "Dedun", n_kerma: "bohové Kermy" };

// Nomy (egyptsky sepat, řecky nomos): [id, název, staroegyptský název, z. šířka, z. délka, terén, velikost 1–5, příznaky, suroviny]
// příznaky: e = egyptské jádro (pro sjednocení), c = město, k = pobřeží, h = posvátné pohřebiště, f = pohraniční pevnost, m = Médžajové (nábor)
const PROVINCES = [
  ["u1", "Elefantina", "Abu, 1. hornoegyptský nom (s pláněmi u Kom Ombo)", 24.09, 32.89, "udoli", 2, "ecf", ["kamen"]],
  ["u2", "Edfu", "Behdet, 2. nom", 24.98, 32.87, "udoli", 3, "e", ["kamen"]],
  ["u3", "Nechen a Necheb", "Hierakonpolis a Elkab, 3. nom", 25.12, 32.78, "udoli", 3, "e", ["natron"]],
  ["u4", "Théby", "Veset, 4. nom", 25.70, 32.64, "udoli", 4, "ec", []],
  ["u5", "Koptos", "Gebtu, 5. nom", 26.00, 32.82, "udoli", 3, "ecm", []],
  ["u6", "Dendera", "Iunet, 6. nom", 26.14, 32.67, "udoli", 3, "e", []],
  ["u7", "Hu", "Hut-sechem, 7. nom", 26.03, 32.29, "udoli", 2, "e", []],
  ["u8", "Thinis a Abydos", "Tjeni a Abdžu, 8. nom", 26.18, 31.92, "udoli", 4, "eh", []],
  ["u9", "Achmím", "Ipu, 9. nom", 26.56, 31.75, "udoli", 3, "e", []],
  ["u10", "Kau", "Tjebu, 10. nom", 26.90, 31.52, "udoli", 2, "e", []],
  ["u11", "Šas-hotep", "11. nom", 27.06, 31.33, "udoli", 2, "e", []],
  ["u12", "Per-Nemtej", "12. nom (Dér el-Gabráví)", 27.36, 31.10, "udoli", 2, "e", []],
  ["u13", "Asjút", "Zautí, 13. nom", 27.18, 31.18, "udoli", 3, "ec", []],
  ["u14", "Kúsaj", "Kis, 14. nom", 27.44, 30.82, "udoli", 2, "e", []],
  ["u15", "Hermopolis", "Chemenu, 15. nom (Zaječí)", 27.78, 30.80, "udoli", 4, "ec", ["alabastr"]],
  ["u16", "Beni Hasan", "Menat Chufu, 16. nom (Oryxová)", 27.93, 30.88, "udoli", 2, "e", []],
  ["u17", "Kynopolis", "Hardaj, 17. nom", 28.33, 30.80, "udoli", 2, "e", []],
  ["u18", "El-Hiba", "Teudžoi, 18. nom", 28.79, 30.92, "udoli", 2, "e", []],
  ["u19", "Oxyrhynchos", "Per-medžed, 19. nom", 28.53, 30.66, "udoli", 2, "e", []],
  ["u20", "Hérakleopolis", "Nen-nesut, 20. nom", 29.08, 30.93, "udoli", 4, "ec", []],
  ["u21", "Meidúm a Lišt", "Šenachen, 21. nom", 29.39, 31.16, "udoli", 2, "e", []],
  ["u22", "Atfíh", "Tepihu, 22. nom", 29.42, 31.27, "udoli", 2, "e", []],
  ["fa", "Fajjúm", "Šedet, Ta-še", 29.31, 30.84, "fajjum", 3, "e", []],
  ["l1", "Memfis", "Ineb-hedž (Bílé zdi), 1. dolnoegyptský nom", 29.85, 31.25, "udoli", 5, "ech", ["kamen"]],
  ["l2", "Letopolis", "Chem, 2. nom", 30.13, 31.08, "delta", 2, "e", []],
  ["l13", "Heliopolis", "Iunu, 13. nom", 30.13, 31.31, "delta", 3, "ec", []],
  ["l3", "Západní nom", "Imentet (Kom el-Hisn), 3. nom", 30.80, 30.60, "delta", 2, "e", ["dobytek"]],
  ["l5", "Sais", "Zau, 5. nom", 30.97, 30.77, "delta", 3, "e", []],
  ["l6", "Buto", "Pe a Dep (Per-Vadžet)", 31.20, 30.74, "delta", 2, "ek", ["papyrus"]],
  ["lx", "Xois", "Chasu", 31.10, 30.98, "delta", 2, "e", ["papyrus"]],
  ["l12", "Sebennytos", "Tjebnetjer, 12. nom", 30.96, 31.24, "delta", 2, "e", ["dobytek"]],
  ["l16", "Mendes", "Džedet, 16. nom", 30.96, 31.52, "delta", 3, "e", ["dobytek"]],
  ["l18", "Bubastis", "Per-Bastet, 18. nom", 30.57, 31.51, "delta", 3, "ec", []],
  ["lav", "Avaris", "Hut-uaret (Tell el-Dab'a)", 30.79, 31.82, "delta", 2, "ek", []],
  ["l20", "Vádí Tumilát", "Tjeku, 8. nom", 30.55, 32.05, "poust", 1, "ef", []],
  ["l14", "Tjaru", "Sile, pohraniční pevnost, 14. nom", 30.86, 32.32, "delta", 2, "ekf", []],
  ["o_bah", "Oáza Bahríja", "Džesdžes", 28.35, 28.86, "oaza", 1, "", ["vino"]],
  ["o_dak", "Oáza Dachla", "Balat (Ajn Asíl)", 25.55, 29.20, "oaza", 2, "", ["vino"]],
  ["o_kha", "Oáza Charga", "Kenem", 25.44, 30.55, "oaza", 1, "", ["vino"]],
  ["lib", "Tjehenu", "Libyjská poušť", 30.55, 29.25, "poust", 1, "", ["dobytek"]],
  ["sin", "Sinaj", "Biau a Mafkat", 29.03, 33.46, "poust", 1, "", ["med", "tyrkys"]],
  ["sar", "Šaruhen", "opevněné město v jižním Kenaanu (snad Tell el-Fára Jih)", 31.23, 34.48, "kenaan", 2, "fc", []],
  ["ham", "Vádí Hammámát", "Východní poušť", 25.95, 33.45, "poust", 1, "m", ["zlato", "kamen"]],
  ["sau", "Sauu", "přístav u Rudého moře (Marsá Gavásis)", 26.55, 34.05, "poust", 1, "km", []],
  ["n_wawat", "Vavat", "Dolní Núbie (Aniba, Miam)", 22.67, 32.03, "nubie", 2, "m", ["zlato"]],
  ["n_buhen", "Buhen", "pevnost u 2. kataraktu", 21.92, 31.30, "katarakt", 2, "fm", ["med"]],
  ["n_semna", "Semna a Kumma", "pevnosti v Batn el-Hagar", 21.50, 30.95, "katarakt", 1, "f", []],
  ["n_sai", "Sai", "Šaat", 20.70, 30.33, "nubie", 2, "m", ["zlato"]],
  ["n_kerma", "Kerma", "Kuš, srdce núbijské říše", 19.60, 30.41, "nubie", 4, "cm", ["zlato", "eben"]],
];

// Sousedství (spojnice údolím, pouštními cestami a Deltou)
const EDGES = [
  ["n_kerma", "n_sai"], ["n_sai", "n_semna"], ["n_semna", "n_buhen"], ["n_buhen", "n_wawat"], ["n_wawat", "u1"],
  ["u1", "u2"], ["u2", "u3"], ["u3", "u4"], ["u4", "u5"], ["u5", "u6"], ["u6", "u7"], ["u7", "u8"], ["u8", "u9"], ["u9", "u10"], ["u10", "u11"],
  ["u11", "u12"], ["u11", "u13"], ["u12", "u13"], ["u12", "u14"], ["u13", "u14"], ["u14", "u15"], ["u15", "u16"], ["u16", "u17"], ["u17", "u19"],
  ["u19", "u18"], ["u18", "u20"], ["u19", "u20"], ["u20", "fa"], ["u20", "u21"], ["u20", "u22"], ["u21", "fa"], ["u21", "u22"], ["u21", "l1"], ["u22", "l1"],
  ["l1", "l2"], ["l1", "l13"], ["l2", "l13"], ["l2", "l3"], ["l2", "l5"], ["l13", "l18"], ["l18", "l20"], ["l18", "l16"], ["l18", "l12"],
  ["l16", "lav"], ["l16", "l12"], ["lav", "l14"], ["lav", "l20"], ["l14", "l20"], ["l14", "sin"], ["sar", "sin"], ["sar", "l14"], ["l20", "sin"], ["l12", "lx"], ["lx", "l5"], ["lx", "l6"],
  ["l5", "l6"], ["l5", "l3"], ["l3", "lib"], ["l3", "l6"], ["lib", "o_bah"], ["o_bah", "fa"], ["o_bah", "u19"], ["o_bah", "o_dak"], ["o_dak", "o_kha"],
  ["o_kha", "u4"], ["o_kha", "u8"], ["u5", "ham"], ["ham", "sau"], ["ham", "u4"],
];
// Spojnice po Nilu (pro rychlou plavbu flotily)
const NILE_IDS = ["n_kerma", "n_sai", "n_semna", "n_buhen", "n_wawat", "u1", "u2", "u3", "u4", "u5", "u6", "u7", "u8", "u9", "u10", "u11", "u12", "u13", "u14", "u15", "u16", "u17", "u19", "u18", "u20", "u21", "u22", "l1", "l2", "l13", "l18", "l16", "l12", "lx", "l5", "l6", "lav", "l14", "fa", "l3"];

// Hrobky panovníků podle doby a rodu
const TOMB_STAGES = ["Výběr místa a vyměření", "Hloubení a základy", "Pohřební komora", "Výzdoba a nápisy", "Zádušní chrám a kult"];
