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

## Grafika

- Politická mapa s územími rodů a hranicemi říší, hrady, sídly, vojsky a obléháním.
- Zjednodušené erby rodů podle skutečné heraldiky (arpádovské pruhy, bavorské routy, piastovské a slezské orlice, český a habsburský lev, řádový kříž…).
- Přehled jako nástěnka: dlaždice s vývojem zlata, obilí, krajů, vojska a prestiže a graf moci rodů v čase.
- Schopnosti vazalů a stav krajů jako pruhy, složení vojska jako barevný pruh, průběh bitvy jako graf, rodokmen.

## Struktura

```
src/js/01-data.js      pravidla a číselníky (terén, vojsko, hodnosti, rozkazy, stavby, objevy, zákony, jména)
src/js/02-world.js     kraje, rody a historické postavy roku 1256
src/js/03-core.js      založení světa, výpočty hospodářství a síly
src/js/04-orders.js    rozkazy vazalům, správa vazalů, zajatci, trh, zákony a stavy
src/js/05-diplo.js     diplomacie, sňatky, vazalství, volba krále, papež, koruny
src/js/06-war.js       vojska, pochody, bitvy, obléhání, dobývání
src/js/07-turn.js      měsíční tah, rod a nástupnictví, výzkum, konec hry
src/js/08-ai.js        umělá inteligence rodů
src/js/09-events.js    události
src/js/10-ui.js        rozhraní (záložky, ukládání)
src/js/11-gfx.js       grafika: erby, politická mapa, grafy, pruhy, ikony
```

## Sestavení a testy

```
python3 build.py                  # vytvoří dist/index.html
node --test tests/*.test.js       # logika: svět, rozkazy, dobytí hradu, volba krále, 20 let světa
node tests/e2e.js                 # proklikání v prohlížeči (Playwright)
```
