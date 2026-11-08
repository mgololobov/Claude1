# Panovník

Ekonomicko-vojensko-politická simulace feudálního pána ve středověku (1250–1350). Hraje se v prohlížeči přes tabulky, bez grafiky.
Výsledkem je jeden samostatný soubor `dist/index.html` – stačí ho otevřít v prohlížeči. Nepotřebuje internet ani instalaci, hra se průběžně ukládá v prohlížeči (5 pozic + stažení do souboru).

## Co ve hře je

- **Hospodářství:** provincie s obyvateli, prosperitou a nepokoji; obilí se sklízí podle ročních období, hlad, zkáza zásob a kapacita sýpek; 12 druhů zboží (obilí, dřevo, kámen, železo, vlna, sukno, sůl, víno, koně, zbraně, koření, hedvábí); výrobní řetězce (vlna → sukno, železo → zbraně); daně podle stavů, mýto, panské dvory, dluhy u lichvářů, bankrot.
- **Trh a obchod:** ceny podle zásoby, výkyvů trhu a inflace (znehodnocování mince); obchodní smlouvy se sousedy a dálkové obchodní cesty.
- **Sídlo a území:** 11 budov sídla (hradby, donjon, knihovna, sýpka, pokladnice, hodovní síň, univerzita…) a 15 budov v provinciích (mlýn, důl, cech tkalců, tržiště, hrádek, přístav…), stavební fronta a robota.
- **Politika:** čtyři stavy (šlechta, duchovenstvo, měšťané, sedláci) s věrností a vlivem a rozpisem, proč jsou (ne)spokojení; 8 zákonů (robota, nástupnictví, městská práva, vztah k církvi, branná povinnost, mince, lesní právo, snášenlivost); krize stavů; lenní pán – král s berní, službou a trestnou výpravou.
- **Rod a rada:** panovník s vlastnostmi a schopnostmi, choť, potomci a jejich výchova, stárnutí, nemoci, smrt a nástupnictví; pět rádců (kancléř, maršálek, purkrabí, mistr šeptů, kaplan) vybíraných z dvořanů.
- **Vojsko a válka:** 9 druhů jednotek, selská hotovost, více vojsk, velitelé, morálka, přesuny po mapě provincií, bitvy s terénem, obléhání a okupace, stav války a mírová jednání (odškodné, provincie, podrobení celé země, kapitulace), spojenci.
- **Diplomacie a rivalové:** pět soupeřů s vlastní povahou, pokladnou a vojskem, kteří se vyzbrojují, vyhlašují války i bojují mezi sebou; dary, smlouvy, spojenectví, sňatky, tribut, padělání nároků, zvědové, sabotáže a vzpoury.
- **Objevy:** 22 objevů v šesti oborech a 6 výprav do neznáma (ložiska, hedvábná stezka, Levanta, Západní oceán…).
- **Události:** přes 35 událostí s volbami (neúroda, mor, kacíři, loupeživí rytíři, papežský legát, křížová výprava, zpronevěra v radě…).
- **Cíl:** získat tituly hrabě → vévoda → král, nebo přečkat sto let s nejvyšším skóre.

## Struktura

```
src/page.html, src/styles.css   kostra stránky a vzhled (světlý i tmavý)
src/js/01-data.js                herní data: zboží, budovy, jednotky, objevy, zákony, mapa
src/js/02-core.js                stav hry, náhoda se semínkem, výpočty hospodářství, stavů a provincií
src/js/03-actions.js             akce hráče: stavby, nábor, zákony, rada, činy panovníka, tituly
src/js/04-war.js                 diplomacie, bitvy, obléhání, mír, rozhodování soupeřů
src/js/05-turn.js                konec období, rod a nástupnictví, výpravy
src/js/06-events.js              události s volbami
src/js/10-ui.js                  rozhraní (záložky s tabulkami, ukládání)
```

## Sestavení a testy

```
python3 build.py                  # vytvoří dist/index.html
node --test tests/*.test.js       # logika: nová hra, stavby, válka, sto let hry na více semínkách
node tests/e2e.js                 # proklikání v prohlížeči (Playwright)
```
