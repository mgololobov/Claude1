# Herní dílna

Webová aplikace (běží i na iPadu) pro vývoj, prototypování a testování deskových, karetních her a wargames.
Publikuje se jako jeden soubor `dist/index.html`, ale zdroják je rozdělený do menších modulů.

## Co aplikace umí

- **Návrh:** karty (šablony, písma, obrázky, vzácnost, rámečky), jednotky a žetony, mapy (hexy, čtverce, oblasti, terén), sítě míst a cest, dílky, sáčky, vlastní kostky, scénáře a kampaň, verze návrhu.
- **Pravidla:** jazyk efektů, automatická pravidla „Když… pak…“, hlídání fází a limitů (upozorňovat / vynucovat), cíle hry.
- **Euro:** výběr akcí (pole, rondel s poplatkem, role), trh, deck building, technologie, veřejné cíle, draft kostek, burza a většiny, produkce, rozvoz zboží, vyčerpání karet a příjem z vyložených karet, údržba (krmení), slevy z vyložených karet, rezervace.
- **Karetní:** draft, štychy se sázkami, odhazovací hromádka, riskování, sestavy, dražby, blafování, souboj bytostí (Magic), centrální řada s příšerami a zásoba cti (Ascension), spojenecké schopnosti, reakce mimo tah, událost každé kolo.
- **Wargame:** bojová tabulka a kostky, provedení výsledku, zóny kontroly, mlha války, výhled a dostřel, zásobování (i obnova a odříznutí), iniciativa, skrytý pohyb, posily, aktivace žetony, stavy jednotek, karty za operace, natočení (čelo/bok/záď), výška terénu, hlídka, munice, palivo, nepřímá palba s pozorovatelem, morálka a potlačení, ženisté, mosty, pevné žetony (okop), zóny a nosnost jednotek, velitelé.
- **Prostředí:** denní doba a počasí, terén po počasí (bláto, led, závěje), vítr, kouř a oheň (spáleniště, trosky), miny a ostnatý drát.
- **Předměty:** žetony i karty – trvalé a jednorázové, plošné a cílené, léčení, dočasné účinky, výdrž, brnění, opotřebení, světlo, kořist po padlých.
- **Dungeon crawler a kooperace:** hrdinové a příšery se životy, automat příšer, zakryté místnosti, zkušenosti, poklady, hrozba, mapa z karet lokací (Warfighter), kostičky s ohnisky (Pandemie).
- **Logické a abstraktní:** kameny (řada, sevření, otáčení, gravitace, propojení okrajů), lámání kódu, rozsévání (mancala).
- **18xx:** akciové společnosti, prezident, burza, vlaky s fázemi a rezivěním, dividendy, odhad tržeb.
- **Testování:** herní stůl pro iPad (zvětšení, kreslení perem), hra online, záznamy testů s dotazníkem, simulace stovek her s laděním parametrů, příručka a tisk karet, kontrola návrhu.
- **Výroba:** „Co vytisknout“ (počty kusů a archů), tisková archa s mapou ve skutečné velikosti, markery, ukazatel kol a přehled pro hráče s tabulkami pro hru bez aplikace.
- **Začátek:** nová hra ze šablony podle žánru (wargame, crawler, deckbuilding, euro s rondelem…).

## Struktura

```
src/page.html        kostra stránky (hlavička, záložky)
src/styles.css       vzhled aplikace
src/cards.css        vzhled karet a šablony (vše v em – velikost karty řídí jen font-size)
src/js/NN-*.js       moduly; sestavují se v pořadí čísel
  01-util            pomocné funkce, toast, onInit
  02-defaults        výchozí terén, bojová tabulka, normalizace a obnova starých projektů
  03-examples        ukázkové hry
  04-geometry        hexová a čtvercová mřížka (s mezipamětí)
  05-storage         ukládání do prohlížeče a k účtu (po částech pod 256 kB), krok zpět v návrhu
  06-state           stav aplikace, hlavní vykreslení
  07-dialogs, 08-look, 09-images     dialogy, vzhled komponent, obrázky
  10–17              záložky (Přehled, Komponenty, Mapa, Mechaniky, Scénáře, Pravidla, Testování, Analýza)
  20-rules-engine    jazyk efektů, hlídání pravidel, automatická pravidla, cíle hry
  21–27              herní stůl a jeho nástroje
  28-simulation      automatické testování (simulace stovek her)
  29-versions        uložené verze návrhu, porovnání a obnova
  30-online          hra více lidí naráz, soukromé ruce, dotazník a zpětná vazba testerů
  31-ai-effects      převod textu karty na efekt přes Claude
  32-rulebook        automatická příručka a seznam komponent
  33-cards-extra     vzácnost, rámečky, ikony typů, rub, tisk se spadávkou, export PNG a Tabletop Simulator
  34-war             provedení boje, zásobování, iniciativa, skrytý pohyb
  35-ipad            zvětšení stolu dvěma prsty, kreslení perem
  36-sim-extra       simulace války a dílků, hledání dopředu, průběh skóre, ladění variant
  37-dice            kostky s libovolným počtem stěn, k%, smíšený hod, zápis 2k6+k8+3 i s vlastními kostkami
  38-mech-more       posily, aktivace žetony, stav jednotek, dostřel, karty za operace, technologie,
                     veřejné cíle, draft kostek, odhazovací hromádka, riskování, sázky na štychy, sestavy
  39-ui              skupiny nástrojů na stole, navigace po dlouhých stránkách
  40-crawler         dungeon crawler: životy, hrdinové a příšery, automat příšer, místnosti, stavy, XP, poklady, hrozba
  41-logic           kameny na mapě (řada, sevření, otáčení, gravitace, propojení okrajů), lámání kódu
  42-cardmap         mapa z karet lokací (řada nebo mřížka), pohyb za akce, krytí, odhalování, nepřátelé, cíl
  43-extra           vyčerpání karet, příjem z vyložených karet, přesýpací hodiny, rozsévání (mancala)
  44-network         síť míst a cest: editor, pohyb po cestách, vlastnictví míst, kostičky s ohnisky
  45-deliver         rozvoz zboží: zakázky, náklad, naložení a doručení
  46-cardbattle      karetní souboje: zdroje na tah, příšery v centrální řadě, zásoba bodů, vyhoštění,
                     souboj bytostí s blokováním a klíčovými slovy, země za tah, nemoc z vyvolání, životy
  47-rail            vláčkové hry 18xx: společnosti, akcie, prezident, burza, vlaky, rezivění, dividendy, odhad tržeb
  48-command         malé žetony vybavení upravující jednotku, velitelé s dosahem velení a aktivací jednotek
  49-units-plus      pevné žetony (okop, barikáda), zóny jednotek s vlastní obranou, nosnost a přeprava
  50-facing          natočení jednotek (čelo/bok/záď, zorné pole, nepozorovaný útok), výška terénu, hlídka, munice
  51-morale          morálka a test morálky, potlačující palba, miny, ostnatý drát, výbušniny, potraviny a hlad
  52-items           předměty z žetonů i karet: trvalé a jednorázové úpravy, léčení, dočasné účinky, výdrž, brnění, opotřebení
  53-env             denní doba a počasí (výhled, pohyb, útok, obrana, dostřel), světlo předmětů
  54-ground          terén po počasí (bláto, zamrzlo, závěje), vítr se směrem, kouř a oheň
  55-print           co vytisknout (počty a archy), mapa ve skutečné velikosti po A4, markery, ukazatel kol, tabulky pro hru bez aplikace
  56-ops             nepřímá palba s pozorovatelem, ženisté, zničitelné mosty, palivo, obnova a ztráty podle zásobování
  57-euro-cards      rondel, údržba, slevy z karet, rezervace, spojenecké schopnosti, reakce, událost kola, kořist
  58-lint-more       kontrola návrhu pro novější mechaniky (rondel, údržba, karty, předměty, počasí, jednotky)
  99-main            spuštění
tests/harness.js     načte moduly do Node bez prohlížeče
tests/*.test.js      testy herní logiky
tests/e2e.js         proklikání sestavené aplikace v prohlížeči
build.py             sestavení do dist/index.html
```

## Příkazy

```
python3 build.py          # sestaví dist/index.html
node --test tests/*.test.js   # testy logiky (bez závislostí)
node tests/e2e.js         # test v prohlížeči (potřebuje Playwright a sestavený dist)
```

## Jazyk efektů

Efekty karet, akcí, polí dráhy, startu stran a automatických pravidel:

| Zápis | Význam |
|---|---|
| `+2 Mince`, `-1 Body` | změna zdroje hráče |
| `všichni +1 Zlato`, `ostatní -1 Body`, `soupeř -1 Body` | změna u ostatních; soupeře vybere hráč |
| `líznout 2`, `líznout 1 z Události`, `táhnout 2 z Kotlík` | karty a žetony |
| `posun +3`, `ostatní posun -2` | závodní dráha |
| `událost z Události` | otočí kartu a provede její efekt |
| `vyber: +2 Mince \| líznout 1` | volba hráče |
| `pokud Mince >= 3: +1 Body, líznout 1` | podmínka |
| `zaplať 1 Dřevo + 1 Cihly: +1 Body` | platba |
| `nastav Mince 0` | nastaví zdroj |
| `jednou za kolo: …`, `jednou za tah: …`, `jednou za hru: …` | omezení použití |
| `první hráč` | hráč začíná příští kolo |
| `vyhostit 1` | odstraní kartu z ruky ze hry |
| `odhodit 1`, `zpráva Text`, `vítěz` | ostatní |

Do textu karty se ikona zdroje vloží zápisem `{Mince}`.

## Online hra

Hostitel založí hru na stole (Kolo → Založit online hru) a dostane pětimístný kód.
Data hry jsou v databázi artefaktu: `games/<kód>` a `games/<kód>/parts/{design,table,img-N}`,
zpětná vazba testerů v `games/<kód>/feedback`. Autor ji načte v záložce Testování.

## Automatické testy na GitHubu

`.github/workflows/test.yml` při každé změně v `herni-dilna/` sestaví aplikaci, spustí testy logiky
a proklikání v prohlížeči; snímky obrazovky nahraje jako artefakt běhu.
