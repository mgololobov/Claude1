# Herní dílna

Webová aplikace (běží i na iPadu) pro vývoj, prototypování a testování deskových, karetních her a wargames.
Publikuje se jako jeden soubor `dist/index.html`, ale zdroják je rozdělený do menších modulů.

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
  05-storage         ukládání do prohlížeče a k účtu
  06-state           stav aplikace, hlavní vykreslení
  07-dialogs, 08-look, 09-images     dialogy, vzhled komponent, obrázky
  10–17              záložky (Přehled, Komponenty, Mapa, Mechaniky, Scénáře, Pravidla, Testování, Analýza)
  20-rules-engine    jazyk efektů, hlídání pravidel, automatická pravidla, cíle hry
  21–27              herní stůl a jeho nástroje
  28-simulation      automatické testování (simulace stovek her)
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
| `odhodit 1`, `zpráva Text`, `vítěz` | ostatní |

Do textu karty se ikona zdroje vloží zápisem `{Mince}`.
