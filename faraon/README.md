# Pán Obou zemí

Strategická simulace starověkého Egypta v době rozdělení země – egyptská obdoba středověké hry Panovník. Hraje se po měsících egyptského občanského roku (Achet, Peret, Šemu), cílem je sjednotit Horní a Dolní Egypt.

Hra je jeden soubor `dist/index.html`: stačí ho otevřít v prohlížeči, funguje bez internetu a ukládá se v prohlížeči; hru lze uložit i jako text (zkopírovat a později vložit).

## Scénáře

- **≈ 2070 př. n. l. – Válka Obou zemí** (První přechodné období): Thébané Intefa II. proti Hérakleopoli („domu Chetiho“), nomarchové Asjútu, Hermopole a Beni Hasanu, Kuš, Vavat, Médžajové, Aamu a Libyjci. Sušší klima a nízké záplavy.
- **≈ 1560 př. n. l. – Proti Hyksósům** (Druhé přechodné období): 17. dynastie Sekenenrea Taa a Kamoseho proti Hyksósům krále Apopiho z Avaridu a jejich spojenci Kuši; kníže Teti v Nefrusy. Historické události: spor o hrochy (papyrus Sallier I.), zachycený dopis vládci Kuše (Kamoseho stéla), Rhindův papyrus.

- **≈ 2120 př. n. l. – Anchtifi z Moally**: nomarcha Hefatu, který podle nápisů ve své hrobce ovládl Edfu a bojoval s Thébami a Koptem za velkého hladu; Intef I. v Thébách, Hérakleopolis na severu.

- **≈ 2040 př. n. l. – Montuhotep II.**: poslední fáze sjednocení; vezír Dagi, pokladník Cheti, správci Henenu a Meketre, královny Tem a Neferu, vzpoura Thinidy ve 14. roce vlády.
- **≈ 1650 př. n. l. – Rozpad 13. dynastie a příchod Hyksósů**: Itjtaui 13. dynastie (bez historického jména vládce – jména a pořadí posledních králů jsou nejistá), Hyksósové z Avaridu (Sakir-Har), abydoská dynastie (Senebkaj, jehož hrob se stopami ran z boje byl objeven roku 2014), thébská 16. dynastie (Džehuti podle Ryholtovy rekonstrukce), Kuš a západní Delta.
- **≈ 1550 př. n. l. – Ahmose I. a pád Avaridu**: mladý Ahmose s královnou Ahhotep, vojáci z Elkabu Ahmose, syn Ebany, a Ahmose Pen-Nechbet, poslední hyksóský král Chamudi a opevněný Šaruhen v jižním Kenaanu.
- V každém scénáři lze hrát i za **Médžaje** nebo **Tjehenu** (Libyjce): kmeny žijí ze stád, podnikají nájezdy do sousedních krajů a mohou vstoupit do služby egyptského rodu.

## Jak se hraje

- **Úvodní obrazovka**: vybereš dobu (šest scénářů s ilustracemi) a rod; u každého vidíš vládce, cíl a obtížnost.
- **Mapa** je reliéfní: stínovaný terén pouští a hor, zelená niva Nilu a Delty, moře s mělčinami. Území rodů jsou jen barevný tón s hranicí a sledují obdělávanou půdu; sídla mají kartografické značky (sídlo rodu, město, pevnost, vesnice), vojska štítky s počtem mužů. Terén je schematický (hřeben hor podél Rudého moře, jižní Sinaj, Kattarská proláklina, Gilf Kebír), ne měřená výška. Tlačítko „Má říše“ přiblíží tvé nomy.
- **Rada**: zvolíš královský výnos (rovnováha, kanály a pole, řemesla a trh, vojsko, stavby, dům života, bohové a lid) a rádce podle něj na konci měsíce rozdá rozkazy všem úředníkům, kteří žádný nedostali. Jednotlivcům lze dál velet ručně.
- **Pobřeží** je skutečné (Natural Earth 1 : 10 mil.): Suezský a Akabský záliv, Sinaj, laguny Delty. Je to dnešní pobřeží; ve starověku ležel okraj Delty jižněji. Tok Nilu je vyhlazená křivka přes skutečné polohy měst.
- **Hieroglyfy** mají v rozhraní skutečný význam: ikony surovin (nbw zlato, šnwt sýpka, pero maat, šfyt vážnost, mšꜥ vojsko, mw voda), znaky záložek (tꜣ země, ṯꜣty vezír, spꜣwt nomy, hp zákon, ꜥḥꜣ boj, mḏꜣt svitek, mn hrací deska), datum podle egyptské formule (ḥsbt N ꜣbd M a období, s egyptskými číslovkami), jména bohů a šesti měst, názvy zemí na mapě a kartuše králů s doloženým zápisem jména. Slovník je v `tools/gen_hg.py`: znaky se zadávají kódy Gardinerova seznamu a převádějí podle jmen Unicode. Znaky jdou v řádku za sebou, neskládají se do čtverců. Najetím myší se ukáže přepis a překlad.
- **Záložky** jsou v sedmi skupinách (Mapa, Rada, Říše, Stát, Válka a poslové, Kronika, Hra); v horní liště je vidět postup k cíli hry.
- Při změně ročního období se ukáže obrázek (záplava, setí, žně) a pod mapou běží zprávy měsíce.

## Co hra obsahuje

- 48 nomů od Kermy po Deltu a Šaruhen v jižním Kenaanu s egyptskými jmény, bohy a surovinami; mapa se skutečným tokem Nilu a ramen v Deltě.
- Nilometr a záplavy (Pliniovo pravidlo 12–16 loktů), sklizeň v Šemu, daň v obilí, obecní sýpky, hlad; debeny jako jednotka hodnoty, trh s obilím.
- Úředníci s hodnostmi Střední říše (písař, jedinečný přítel, hatia, velký představený nomu, iripat), rozkazy, úřady (vezír, pokladník, správce sýpek, velitel vojska, velekněz), věrnost a zrady.
- Výpravy do Vádí Hammámát, Hatnubu, na Sinaj, do zlatých dolů Vavatu, do Byblu a do Puntu.
- Vojsko (kopiníci, lučištníci, Médžajové, válečné vozy), pochody a plavba po Nilu, bitvy, obléhání pevností, nájezdy kmenů.
- Maat, stavy (kněží, nomarchové, písaři, lid), zákony, chrámy, hrobka panovníka, svátek sed, Usirovy mystéria v Abydu.
- Události podle pramenů: Výmluvný rolník, Ponaučení pro Merikarea, Nářky Ipuverovy, Krásný svátek údolí, proklínací obřady (Mirgissa), pád Nefrusy a Avaridu, příběh o ztroskotaném námořníkovi.
- Velké stavby panovníků: zádušní chrám v Dér el-Bahrí, chrám Amona v Karnaku, Usirův chrám v Abydu, hráze Fajjúmu, pevnosti 2. kataraktu, Zdi vládcovy, obelisk v Heliopoli.
- Události ze života Egypta: lov na hrocha, myši a kobylky, Asiaté žádající o pastviny (jako karavana Abiši z Beni Hasanu), požár sýpky, spiknutí v ženském domě (Veni, Amenemhat I.), narození býka Apis, nemoc panovníka, žádost spojence o pomoc, zběhové, karavana z jihu (Harchuf), životopisné stély v Abydu, vdova u soudu, mor dobytka, asijští řemeslníci, posel z Kuše, odměna za statečnost.
- Státní bůh (Montu, Amon, Ptah, Re, Usir, Sobek, Sutech, Herišef): každý má kultovní centrum, které musíš držet, a vlastní účinek.
- Horovo jméno krále jako program vlády podle skutečných jmen Intefů a Montuhotepa II. (Sehertaui, Wahanch, Nachtnebtepnefer, Seanchibtaui, Necerihedžet, Semataui).
- Přenesení sídla (jako Amenemhat I. do Itj-taui); spokojenost nomů klesá se vzdáleností od sídla.
- Kořist po dobytí nomu: vydrancovat, odvést zajatce na práci, nebo ušetřit.
- 47 objevů včetně ptačích sítí a chovu hus, pozorování Sothidy (Lahún), balzamovacích dílen, zásobovacích skladů, zápasnického výcviku (Beni Hasan), protosinajského písma, nákladních člunů na obilí, měst stavitelů (Lahún), ochrany hrobů, zlatnictví (poklady z Dahšúru), papyrových dílen, karavan oslů (Harchuf), představených tlumočníků, kanálu u 1. kataraktu (Senusret III.), včelařství, vinných lisů, velkopekáren (modely Meketrea), modré fajánse, skarabových pečetí, vojenských zpráv ze Semny, pouštních hlídek, obléhacích žebříků (Beni Hasan), klenutých sýpek a lodí na kámen.
- Úkoly rádců s odměnami, u velkých rodů podle skutečných tažení (Nefrusy, Memfis, Avaris, Buhen; Asjút a Hérakleopolis; Thinis a opevnění Delty).
- Obchodní cesty (Nil mezi Memfidou a Thébami, cesta do Núbie, Vádí Hammámát, oázová cesta, Cesty Horovy, mořská cesta do Byblu); válka je přeruší. Režim mapy Obchod.
- Synové poddaných vychovávaní na dvoře („děti kapu“): poddaný se nevzbouří.
- V období záplavy pěší vojsko bez lodí často nepostoupí.
- Další události: zpustlá svatyně předků, dopis mrtvému, spor o hranici nomů (Chnumhotep II.), poutníci v Abydu, posel z Byblu, výchova prince.
- Zádušní nadace podle smluv nomarchy Hapdžefaje z Asjútu; převoz obilí lodí mezi obecními sýpkami nomů; zajatci z bitev jako pracovní síla nebo osadníci (papyrus Brooklyn); postoj vojska (útočný, vyvážený, opatrný); svátek Mina při sklizni.
- Jedenáct zákonů ve vlastní záložce, podle oblastí: robota, hranice a cizinci (stéla ze Semny), soudnictví (vezír, kenbet, nomarchové), tresty a útěky z roboty (papyrus Brooklyn), postavení nomarchů, výchova písařů, nástupnictví, chrámové statky, státní sýpky, výpravy a obchod, vojsko; u každé možnosti účinek a dopad na stavy.
- Bitevní taktiky (šik kopiníků, salvy lučištníků, rychlý útok, léčka) a zpráva o bitvě s průběhem po kolech.
- Soupeři používají bohy, Horova jména, zákony, nadace, zajatce i taktiky; sami nabízejí sňatky, spojenectví a obchod, posílají dary a žádají tribut.
- Kuš: Západní deffufa jako velká stavba, egyptské sochy v Kermě, lučištníci Ta-Seti, pohřeb v mohyle, vlastní úkoly.
- Letopis po letech (výška Nilu a hlavní události jako na Palermské desce), úspěchy, průvodce prvními měsíci.
- Na mapě plují lodě po Nilu, v období achet je vidět zaplavená niva, chrámy a dokončené stavby.
- Odkaz rodu: bodové hodnocení vlády pro porovnání her.
- Rod, sňatky, nástupnictví (i spoluvláda), vědění od nilometru po válečný vůz a námořní lodě.
- Osobně vedené bitvy: při větším střetu dáváš v každém kole rozkaz (útok, šik kopiníků, salvy lučištníků, vozy na křídla, obchvat Médžajů, ústup k lodím); rozkazy se navzájem přebíjejí. Lze vypnout v záložce Vojsko.
- Soupeři mají vlastní cíle podle toho, oč historicky usilovali (Théby Avaris, Hyksósové Deltu a Memfis, Kuš Elefantinu a Dolní Núbii) a táhnou přednostně proti tomu, kdo jim stojí v cestě. Když soupeř sjednotí čtyři pětiny Egypta, hra končí porážkou.
- Rody úředníků: úřady a správa nomů se dědí z otce na syna podle zákona o nomarších, rody se přou a příliš mocný rod se chová jako malý král (spor rodů, potvrzení dědičných práv, „děti kapu“).
- Trh v čase: cena obilí se mění každý měsíc podle záplavy, roční doby, hladových let i tvých nákupů a prodejů; graf v Hospodářství.
- Výzvědná síť: stálí zvědové (kupci a lodníci, médžajští stopaři) v zemi soupeře, hlášení o pohybu jeho vojsk, odhalování cizích zvědů (popravit, obrátit, vyhostit).
- Místní svátky nomů: Wag v Abydu, Thovtův svátek v Hermopoli, Upuautův v Asjútu (Hepdžefovy smlouvy), Hathořin v Dendeře, Sokarův v Memfidu, Sobkův v Šedetu, oběti záplavě na Elefantině – u každého je uvedeno, jak dobře je doložen.
- Hlad je méně častý a víc o rozhodování: drobné nedostatky rozdělí správci sýpek sami, při větším hladu lze převézt obilí lodí z nomů s přebytkem nebo snížit příděly vojákům.
- Výjevy u každé události ve stylu nástěnných maleb z hrobek Střední říše (Nil, bitva, svatyně, dvůr, pohřeb, karavana, lov v bažinách, sýpky, svátek, orba, žně, zlaté doly), bojiště se šiky postav při osobně vedené bitvě, kolo kalendáře svátků, karty nomů a rodů a barevné pruhy příjmů a výdajů místo tabulek.
- Senet jako malá hra o debeny nebo o čest: vrhací hůlky, třicet polí a „dům vody“ (pravidla podle moderní rekonstrukce, původní se nedochovala).
- Další události: královský lov (gazely, hroch, ptáci), navrátilec z Retjenu (jako v Příběhu Sinuhetově), trpaslík z jihu (dopis Pepiho II. Harchufovi), kupci z Keftiu, kouzelník z papyru Westcar, bodnutí štírem a zaklínači Selkety, sen panovníka, vykradený hrob, krokodýl v kanálu, hostina s harfeníkem.
- Sedmnáct zákonů, nově sčítání dobytka, správa kanálů, půda pro vojáky, obětní kalendář, dohled nad trhem a majetek žen (podle listiny z Lahúnu).
- 54 vynálezů, nově měřičské provazce, plachty a kormidla, pouštní studny, hrnčířský kruh, rýžování zlata, chrámové účetní knihy, šikmé valy (glacis) a rybářské sítě; záložka Vědění je obrázkový strom s průběhem zkoumání.
- Náhoda a život rodu: znamení roku z vrhacích hůlek (příznivý či zlý rok), narození dětí v paláci (porodní cihly z Abydu, amulety Bese a Taveret), výchova dědice (kap, vojsko, dům života), královská objížďka nomů s nečekanými příhodami.
- Další události: písečná bouře, útěk z roboty (papyrus z Brooklynu), ztroskotaný náklad obilí, nová zlatá žíla, statečný voják, paviáni z jihu.
- Uložené hry mají číslo verze a starší se při načtení převedou; mapa se překresluje jen při změně.

Jména vládců a doložených hodnostářů odpovídají pramenům; roky narození, schopnosti a ostatní postavy jsou herní. Letopočty podle střední chronologie (I. Shaw, The Oxford History of Ancient Egypt, 2000).

## Vzhled

Vzhled vychází z egyptského umění: barvy egyptských pigmentů, blokový vlys z hrobek, postavy z profilu s konvencemi egyptské malby (muži červenohnědí, ženy žlutookrové, Asiaté podle malby z Beni Hasanu, král v šátku nemes), postavy podle kánonu (hlava a nohy z profilu, ramena zepředu) na základní lince, poušť jako růžový tečkovaný pás, voda jako modrý pás s klikatkami, pruhovaný sokl. Hieroglyfy (písmo Noto Sans Egyptian Hieroglyphs, licence OFL, zmenšené na použité znaky) mají skutečný význam: nb tꜣwj „Pán Obou zemí“, nswt-bjtj „král Horního a Dolního Egypta“, ꜥnḫ wḏꜣ snb „živ, zdráv, silen“, sepat „nom“, sema „sjednocení“.

## Ovládání

Hlavní obrazovkou je mapa přes celé okno: kolečkem přibližuješ, tažením posouváš, najetím na nom vidíš jeho údaje. Režimy mapy: politická, terén, úroda, spokojenost, rozvoj, vojsko. Vpravo je přehled dění (války, vojska, obléhání, stavby, výpravy, vědění), vlevo dole panovník. Tlačítkem ▶ necháš čas plynout; zastaví se u každé události. Na telefonu přibližuješ mapu dvěma prsty.

Hru lze ovládat i klávesnicí: **N** ukončí měsíc, **1–9** a **0** přepínají záložky, **+** a **−** přibližují mapu, **Esc** zavře panel nomu, **?** ukáže nápovědu; Tab a Enter fungují na všech tlačítkách, kartách i nomech na mapě. Čtečky obrazovky dostávají popisky nomů a hlášení o novém měsíci.

Citáty z dochovaných textů (Ponaučení pro Merikarea, Ptahhotep, Výmluvný rolník, Nářky Ipuverovy, Proroctví Neferetiho, hrobka Anchtifiho, dopis Hekanachta, stély Kamoseho, životopis Ahmose, syna Ebany, Satira na povolání, Hymnus na Nil, Texty rakví, Píseň harfeníka, stéla ze Semny, proklínací texty, Smithův a Rhindův papyrus) jsou volné české převody podle běžných překladů, vždy s uvedeným pramenem. Hra ukazuje jen texty, které v dané době už existovaly.

## Vývoj

- `src/js/0*.js` – pravidla (data, scénáře, hospodářství, rozkazy, válka, běh měsíce), bez prohlížeče
- `src/js/1*.js`, `99-main.js`, `99-ui2.js` – rozhraní
- `python3 build.py` – sestaví `dist/index.html`
- `node tests/rules.test.js` – testy jednotlivých pravidel
- `node tests/sim.test.js 240` – odehraje 20 let za každý hratelný rod ve všech scénářích a hlídá chyby
- `node tests/e2e.js` – proklikání v prohlížeči (Playwright)
