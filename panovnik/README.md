# Panovník

Tahová strategie z feudální střední Evropy po pádu Štaufů (od ledna 1256), inspirovaná hloubkou japonských her typu Nobunaga's Ambition.
Hraje se v prohlížeči přes tabulky a schematickou mapu. Výsledkem je jeden samostatný soubor `dist/index.html` – stačí ho otevřít, nepotřebuje internet ani instalaci. Hra se průběžně ukládá v prohlížeči (5 pozic a stažení do souboru).

Je to samostatný projekt, s Herní dílnou (`herni-dilna/`) nesdílí žádný kód.

## Svět

- **105 krajů** od Alsaska po Halič a od Baltu po Slavonii – Čechy, Morava, Rakousy, Uhry a Štýrsko, Bavorsko, Falc, Švábsko, Sasko, Míšeň, Durynsko, Braniborsko, Pomořansko, Prusko, polská knížectví, Slezsko, Korutany, Tyrolsko.
- **29 rodů** se stejnými pravidly – za kterýkoli panovnický rod se dá hrát: Přemyslovci, Arpádovci, oboje Wittelsbachové, Habsburkové, Wettinové, Askánci, Welfové, Gorici, Sponheimové, Piastovci (krakovští, velkopolští, kujavští, mazovští, vratislavští, lehničtí, hlohovští, opolští), Gryfité, Romanovci, Řád německých rytířů, biskupství a arcibiskupství.
- **Historické postavy roku 1256** (Přemysl Otakar II., Bruno ze Schauenburku, Vok z Rožmberka, Béla IV., Rudolf Habsburský, Ludvík II. Přísný, Daniel Haličský, Svatopluk Pomořanský…) a přes 200 dalších vazalů. Schopnosti a vygenerovaní vazalové jsou herní výmysl.

## Hlavní mechaniky

- **Vazalové:** vůdcovství, udatnost, rozum, správa, vlastnosti, věrnost, hodnost (panoš → zemský hejtman), zásluhy a léna. Každý měsíc každý vykoná jeden rozkaz: rozvoj polí a trhů, hradby, nábor, výcvik, péče o lid, stavby, hledání schopných mužů, zvědy, podněcování nepokojů, naklonění cizích vazalů, poselstva, přesun. Kraje lze svěřit purkrabím.
- **Zrada a věrnost:** nevěrný purkrabí může přeběhnout i s krajem nebo se vzbouřit a založit vlastní panství. Zajatce lze propustit, vykoupit, naverbovat nebo popravit.
- **Hospodářství:** zlato měsíčně z obchodu a obyvatel, obilí jednou ročně při žních, stříbrné doly a solivary, koně a zbroj pro jízdu, trh, lombardští bankéři.
- **Válka:** vojska s až třemi veliteli (počet mužů omezuje hodnost), pochod po mapě, zásoby obilí, polní bitva v kolech (druh vojska, výcvik, terén, morálka, velitelé), obléhání (vyhladovění nebo zteč) a dobývání hradů, padlí a zajatí velitelé.
- **Diplomacie:** dary, spojenectví, sňatky, příměří, koupě míru, lenní hold, vazalové a jejich připojení, žádost o pomoc. Když rod vymře, jeho země zdědí spřízněný rod.
- **Říše a církev:** volba římského krále sedmi kurfiřty (hlas drží ten, kdo ovládá Prahu, Falc, Wittenberg a Braniborsko; rýnské arcibiskupy lze získat dary), říšská klatba, císařská korunovace v Římě, přízeň papeže a klatba, královské koruny (Čechy, Uhry, Polsko, Halič).
- **Rod a stavy:** dědici, výchova dětí, zákony (robota, nástupnictví včetně údělů, městská práva, investitura, branná povinnost, mince) a čtyři stavy s krizemi.
- **Objevy:** 16 objevů v pěti oborech. **Události:** přes 25 událostí s volbami a historické zprávy.
- **Cíl:** ovládnout polovinu krajů, nebo být císařem a vládnout třetině krajů.

## Grafika a portréty

- **Generované portréty všech postav** – podle věku, pohlaví a role: koruna u králů a královen, vévodská čapka, biskupská mitra, kroužková kapuce u rytířů, závoj u vdaných žen, šediny, vrásky, vousy, oděv v barvách rodu.
- **Úvodní obrazovka** s výběrem scénáře a rodu na kartách s erby a portréty vládců.
- **Ilustrované události** (válka, mor, žně, neúroda, církev, obchod, tatarský vpád, požár, kometa, dvůr, volba krále…) s portrétem zúčastněné postavy.
- **Kresba kraje** – hrad podle úrovně, lokované město, klášter, důl, přístav, vinice, hřebčín, obléhání a okupace.
- **Scéna bitvy** s vojsky obou stran a portréty velitelů.
- **Karty místo tabulek** – vazalové, plán měsíce, rozkazy v kraji, diplomacie, rodokmen, objevy, hospodářství (sloupcové grafy příjmů a výdajů).

## Ve stylu Europa Universalis

- **Mapa jako hlavní obrazovka:** přiblížení kolečkem, posun tažením, moře a pobřeží, řeky (Dunaj, Labe, Vltava, Odra, Visla, Rýn, Mohan, Morava, Tisa, Dráva, Sáva, Inn, Varta, Dněstr, Bug), pohoří a lesy, jména zemí, žetony vojsk s počtem mužů a morálkou, šipky pochodů, obléhání a pruhovaně okupované kraje.
- **Mapové režimy:** politický, terén, rozvoj, spokojenost, vztahy, kultura, víra, obchod, začlenění.
- **Ovládání:** levý panel s ikonami, horní lišta zdrojů (zlato, obilí, vojsko, prestiž, stabilita, body správy/diplomacie/vojska, vyčerpání, přetížení), boční panel kraje či vojska, přehled válek a vojsk, běh času (přehrávání ve třech rychlostech), okna nad mapou.
- **Body vlády** (správa, diplomacie, vojsko) za rozvoj krajů, stabilitu, začleňování, ideje a snižování vyčerpání.
- **Stabilita** (−3 až +3) a **válečné vyčerpání**.
- **Záminky k válce** (nárok, znovudobytí, jednota koruny, říšská klatba, svatá válka, koalice); zfalšování nároku rozkazem vazala.
- **Okupace, válečné skóre a mírové smlouvy** – postoupení krajů, odškodné, vazalství, připojení země, bílý mír; AI vyjednává mír i mezi sebou.
- **Začleňování krajů a přetížení říše**, **agresivní expanze a koalice**.
- **Kultury a náboženství** (katolíci, pravoslavní, pohanští Prusové) a misie.
- **Pět skupin idejí** (správa, diplomacie, válečnictví, obchod, víra) a **úkoly rodu** včetně úkolů pro konkrétní rody.

## Rozšíření

- **Tři scénáře:** leden 1256 (interregnum), leden 1260 (boj o Štýrsko, válka Čech s Uhry), leden 1273 (Zlatý král na vrcholu moci, volba římského krále v říjnu). Vládci, rodiny a hranice odpovídají době.
- **Historické události:** babenberské dědictví, rozvod s Markétou a sňatek s Kunhutou, uherské tažení roku 1260, Konradinova výprava, stříbro v Kutné Hoře, tatarské vpády (1259, 1285, 1287 a náhodné).
- **Taktická bitva:** sestavy vojsk (klín jízdy, střelci vpředu, obranný šik, záloha, opatrný postup) a osobní velení – rozkaz pro každé kolo bitvy (útok, držet, úder jízdy, salva, záloha, ústup) na bojové obrazovce.
- **Obchod:** osm obchodních cest (Podunají, Jantarová stezka, Via Regia, Zlatá stezka, Hanza…), jejich průchodnost přerušují války, vstup měst do Hanzy, měšťané jako vazalové, kupecké výpravy.
- **Sňatky s věnem:** dát věnem pohraniční kraj, nebo žádat zlato. Rodům bez dědice nastoupí vedlejší linie, jinak dědí spřízněný rod.
- **Terén a zima:** hory, lesy a mokřady zdrží pochod o měsíc, v zimě v horách vojsko strádá.
- **Dvůr:** nejvyšší maršálek, komoří, kancléř a zemský sudí.
- **Obtížnost a mlha války** při založení hry.
- **Plán měsíce:** všichni vazalové na jedné obrazovce s doporučeným rozkazem; rádce může zadat rozkazy za všechny.
- **Mapa:** šipky pochodů a obchodní cesty. **Vysvětlivky:** proč je lid (ne)spokojený, proč je vazal (ne)věrný, proč bitva dopadla, jak dopadla.

## Grafika

- Politická mapa s územími rodů a hranicemi říší, hrady, sídly, vojsky a obléháním.
- Zjednodušené erby rodů podle skutečné heraldiky (arpádovské pruhy, bavorské routy, piastovské a slezské orlice, český a habsburský lev, řádový kříž…).
- Přehled jako nástěnka: dlaždice s vývojem zlata, obilí, krajů, vojska a prestiže a graf moci rodů v čase.
- Schopnosti vazalů a stav krajů jako pruhy, složení vojska jako barevný pruh, průběh bitvy jako graf, rodokmen.

## Herní nápady proti stereotypu
- **Činy panovníka** (okno Vláda): jednou za měsíc hostina, hon, turnaj, pouť, objezd země, soudní den, audience nebo rozprava s učenci – každý s vlastním obrázkem a riziky.
- **Rytířský turnaj** jako minihra: při klání volíš, kam míříš kopím (přilba, štít, hruď), proti soupeři s vlastní udatností.
- **Přání a spory vazalů**: vazal si občas něco přeje (dar, léno, úřad, povýšení) – splnění zvyšuje věrnost, nesplnění ji sráží. Znesváření páni se usmíří u hostiny nebo soudu, jinak dojde k souboji (Soud Boží).
- **Zasedání rady**: dva rádci se přou o politiku a ty rozhoduješ, komu dáš za pravdu.
- **Mor a karanténa**: nákazy se šíří mezi sousedními kraji (ikona na mapě), kraj lze uzavřít; v roce 1348 přichází Černá smrt, v roce 1315 Velký hladomor.
- **Velká díla**: katedrála, kamenný most, královský palác, univerzita – staví se roky a splácí měsíčně.
- **Kupecké zakázky** (Hospodářství): kupci poptávají obilí, koně nebo zbroj za odměnu; nedodání stojí prestiž.
- **Křížová výprava do Pruska**, **přídomky panovníků** (Veliký, Vítězný, Stavitel, Zlatý, Pobožný, Ukrutný, Moudrý) a **roční období** na mapě (zimní sníh, podzimní barvy).

## Objevy, výpravy a poklady
- **32 objevů** v pěti oborech, každý s vlastní kresbou. Nové jsou například rybníkářství, větrný mlýn (od 1270), papírna (od 1290), směnka a banka, urbáře, kurýrní služba, astronomie, alchymie, kartografie, karanténní řád, pavézy, chov destriérů a střelný prach (od 1330). Po každém objevu se otevře okno s volbou dalšího zkoumání.
- **Výpravy do dalekých krajů** (okno Výpravy a poklady): mapa známého světa s deseti cíli od Benátek, Paříže a Říma po Novgorod, Konstantinopol, Akkon a Saraj u Zlaté hordy. Výpravu vede vazal; podle rozumu a udatnosti přiveze poznatky, objevy, vzácnosti nebo učence – anebo se nevrátí.
- **Pokladnice vzácností** (12 předmětů, např. arabský astroláb, byzantská ikona, mongolský luk, portolánová mapa, mechanické hodiny) a **dvorní učenci a umělci** (lékař, astrolog, alchymista, kronikář, stavitel, kartograf, pěvec) s trvalými účinky.
- **Asi 25 nových událostí** (vlčí zima, povodeň, sucho, výroční trh, penezokaz, alchymista, dračí kosti, vyoraný poklad, cisterciáci, zatmění, loupeživý rytíř, kupec z Orientu, brýle, mechanické hodiny…) a **historické mezníky**: kometa 1264, cesta Polů 1271, pád Akkonu 1291, svatý rok 1300, zatčení templářů 1307, papež v Avignonu 1309, Kresčak 1346, zemětřesení v Korutanech 1348 a flagelanti 1349.
- **17 nových kreseb scén** (např. noční les s vlky, povodeň, trh, alchymistická dílna, loď, karavana, hvězdárna, zemětřesení, relikviář).

## Komplexní říše
- **12 zákonů** zobrazených jako karty s obrázky; nově lesní právo, soudní souboj, cla a mýta, trestní právo, osadníci a školy. U každé volby je vidět vliv na stavy.
- **44 vynálezů** včetně pozdních (podvojné účetnictví, vysoká pec, kompas, námořní pojištění, brigantina, ruční palné zbraně, bombardy, plavební komora). Výzkum se s každým objevem prodražuje o 6 %, aby vydržel na celou hru.
- **Počasí roku** (mírný, požehnaný, deštivý, suchý rok, krutá zima) ovlivňuje sklizeň, nemoci a vojska; na mapě je vidět padající sníh, déšť, mraky a letní výheň.
- **Spiknutí**: nespokojení vazalové se tajně spolčují (atentát, vyloupení komory, vzpoura). Zvědové, zemský sudí a tvrdé trestní právo je mohou odhalit; pak je lze zatknout, popravit, uplatit nebo sledovat.
- **Hra v kostky** s vazaly, mimořádná berně a amnestie jako nové činy panovníka.
- **Řetězové události** (průzkum stříbra s výsledkem za čtyři měsíce, nemoc dědice) a další náhodné příhody: padělaná listina dávající nárok na sousední kraj, samozvanec, cizí šampion, kámen z nebe, valdenští, obvinění z čarodějnictví, kolo Štěstěny, bouře ve městě…
- **Další historické mezníky**: sjezd ve Visegrádu 1335, začátek války Anglie s Francií 1337, povodeň 1342, zemětřesení v Basileji 1356 a velké schizma 1378.

## Mapa ze skutečných podkladů a středověký vzhled

- **Pobřeží, ostrovy, jezera a řeky** jsou z dat Natural Earth v měřítku 1 : 10 000 000 (volné dílo). Na mapě je tak skutečný tvar Baltu s Rujánou, Bornholmem, Helskou kosou a Viselským zálivem i skutečné toky Dunaje, Labe, Vltavy, Odry, Visly, Rýna a jejich přítoků.
- **Reliéf** je stínovaný výškový model Terrarium (z měření SRTM a GMTED2010) v síti asi po 4,7 km: Alpy, Karpaty, Šumava, Krušné hory, Sudety i Česká kotlina jsou tam, kde opravdu leží.
- Území rodů jsou nad reliéfem jen barevným tónem se zvýrazněnou hranicí. Sídla mají kartografické značky: sídlo rodu, město, hrad a ves. Na Baltu je větrná růžice a kogy.
- **Co skutečné není:** je to dnešní pobřeží a dnešní toky řek (ve 13. století se místy lišily, například ústí Visly). Z dat byly vyřazeny novodobé přehrady a kanály. Hranice krajů jsou herní – kraj tvoří okolí svého sídla – a neodpovídají historickým hranicím panství.
- **Vzhled** vychází z iluminovaných rukopisů: pergamenové listy, rumělkové rubriky nadpisů, zlacené linky, iniciála na začátku textu události. Barvy odpovídají středověkým pigmentům (železoduběnkový inkoust, rumělka, azurit, měděnka, plátkové zlato). Obrázky mají místo oblohy modré pozadí se zlatým kosočtvercovým vzorem jako gotické miniatury.
- **Obrázky** jsou kreslené jako knižní miniatury: tušová linka, plošné pigmenty, postavy v oděvu a zbroji 2. poloviny 13. století (kroužková zbroj s varkočem, hrncová přilba, trojúhelný štít, kukly, závoje). Čtyřicet výjevů událostí, kresba kraje i bitevní scéna se skládají ze společné knihovny kreseb (`14c-mini.js`, `14d-miniscenes.js`).
- **Portréty** jsou poprsí v tříčtvrtečním pohledu pod zlatým obloukem. Podoba se řídí rolí (král, královna, vévoda, biskup, klerik, rytíř, pán, měšťan, paní, panna, dítě) a věkem; rysy jsou dané jménem, takže postava vypadá po celou hru stejně.
- **Ikony** vynálezů a vzácností (37 kreseb) jsou ve stejném stylu.
- **Mapa známého světa** u výprav má skutečné pobřeží a řeky (Natural Earth 1 : 50 000 000) a stínovaný reliéf, stejně jako hlavní mapa.
- Písma Almendra (nadpisy, popisky mapy) a Uncial Antiqua (iniciály, název) jsou vložena přímo do souboru hry; obě mají licenci SIL OFL.
- Podklady se znovu vytvoří příkazem `python3 tools/geo.py <složka s geojson Natural Earth> <složka s dlaždicemi výšek>`.

## Struktura

```
src/js/01b-eu.js       kultury, víra, ideje, úkoly, záminky, popisky pohoří
src/js/01-data.js      pravidla a číselníky (terén, vojsko, hodnosti, rozkazy, stavby, objevy, zákony, jména)
src/js/02-world.js     kraje, rody a historické postavy roku 1256
src/js/02b-scenarios.js scénáře 1260 a 1273
src/js/03-core.js      založení světa, výpočty hospodářství a síly
src/js/04-orders.js    rozkazy vazalům, správa vazalů, zajatci, trh, zákony a stavy
src/js/05-diplo.js     diplomacie, sňatky, vazalství, volba krále, papež, koruny
src/js/06-war.js       vojska, pochody, bitvy, obléhání, dobývání
src/js/07-turn.js      měsíční tah, rod a nástupnictví, výzkum, konec hry
src/js/07c-eu.js       body vlády, stabilita, okupace, válečné skóre, mír, koalice, ideje, úkoly
src/js/07b-world.js    obchodní cesty a Hanza, úřady, tatarské vpády, obtížnost, rozpisy příčin
src/js/08-ai.js        umělá inteligence rodů
src/js/09-events.js    události
src/js/10-ui.js        rozhraní (záložky, ukládání)
src/js/11-gfx.js       grafika: erby, politická mapa, grafy, pruhy, ikony
src/js/12-ui-ext.js    plán měsíce, bojová obrazovka, úřady, obchodní cesty
src/js/14-art.js       portréty
src/js/14c-mini.js     knihovna kreseb ve stylu miniatur (postavy, koně, stavby, stromy, pozadí)
src/js/14d-miniscenes.js výjevy událostí, kresba kraje, bitevní scéna
src/js/14e-icons.js    ikony vynálezů a vzácností, mapa známého světa
src/js/15-ui-cards.js  karty s portréty, ilustrované události, úvodní obrazovka
src/js/13-eu-ui.js     hlavní obrazovka, mapové režimy, boční panel, lišta, okno Vláda
src/js/11a-geo.js      zeměpisné podklady mapy (vytváří tools/geo.py)
src/js/13b-map.js      vykreslení mapy: reliéf, pobřeží, řeky, území rodů, značky sídel
src/fonts.css          vložená písma (vytváří tools/fonts.py)
tools/geo.py           příprava podkladů z Natural Earth a výškového modelu
tools/fonts.py         vložení písem Almendra a Uncial Antiqua
```

## Sestavení a testy

```
python3 build.py                  # vytvoří dist/index.html
node --test tests/*.test.js       # logika: svět, scénáře, rozkazy, dobytí hradu, bitvy a sestavy, volba krále, obchod, věno, 20 let světa
node tests/e2e.js                 # proklikání v prohlížeči (Playwright)
```
