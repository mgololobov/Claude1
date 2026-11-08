# Pán Obou zemí

Strategická simulace starověkého Egypta v době rozdělení země – egyptská obdoba středověké hry Panovník. Hraje se po měsících egyptského občanského roku (Achet, Peret, Šemu), cílem je sjednotit Horní a Dolní Egypt.

Hra je jeden soubor `dist/index.html`: stačí ho otevřít v prohlížeči, funguje bez internetu a ukládá se v prohlížeči.

## Scénáře

- **≈ 2070 př. n. l. – Válka Obou zemí** (První přechodné období): Thébané Intefa II. proti Hérakleopoli („domu Chetiho“), nomarchové Asjútu, Hermopole a Beni Hasanu, Kuš, Vavat, Médžajové, Aamu a Libyjci. Sušší klima a nízké záplavy.
- **≈ 1560 př. n. l. – Proti Hyksósům** (Druhé přechodné období): 17. dynastie Sekenenrea Taa a Kamoseho proti Hyksósům krále Apopiho z Avaridu a jejich spojenci Kuši; kníže Teti v Nefrusy. Historické události: spor o hrochy (papyrus Sallier I.), zachycený dopis vládci Kuše (Kamoseho stéla), Rhindův papyrus.

## Co hra obsahuje

- 48 žup od Kermy po Deltu s egyptskými jmény, bohy a surovinami; mapa se skutečným tokem Nilu a ramen v Deltě.
- Nilometr a záplavy (Pliniovo pravidlo 12–16 loktů), sklizeň v Šemu, daň v obilí, obecní sýpky, hlad; debeny jako jednotka hodnoty, trh s obilím.
- Úředníci s hodnostmi Střední říše (písař, jedinečný přítel, hatia, velký vládce župy, iripat), rozkazy, úřady (vezír, pokladník, správce sýpek, velitel vojska, velekněz), věrnost a zrady.
- Výpravy do Vádí Hammámát, Hatnubu, na Sinaj, do zlatých dolů Vavatu, do Byblu a do Puntu.
- Vojsko (kopiníci, lučištníci, Médžajové, válečné vozy), pochody a plavba po Nilu, bitvy, obléhání pevností, nájezdy kmenů.
- Maat, stavy (kněží, nomarchové, písaři, lid), zákony, chrámy, hrobka panovníka, svátek sed, Usirovy mystéria v Abydu.
- Rod, sňatky, nástupnictví (i spoluvláda), vědění od nilometru po válečný vůz a námořní lodě.

Jména vládců a doložených hodnostářů odpovídají pramenům; roky narození, schopnosti a ostatní postavy jsou herní. Letopočty podle střední chronologie (I. Shaw, The Oxford History of Ancient Egypt, 2000).

## Vývoj

- `src/js/0*.js` – pravidla (data, scénáře, hospodářství, rozkazy, válka, běh měsíce), bez prohlížeče
- `src/js/1*.js`, `99-main.js` – rozhraní
- `python3 build.py` – sestaví `dist/index.html`
- `node tests/sim.test.js 240` – odehraje 20 let za každý hratelný rod v obou scénářích a hlídá chyby
- `node tests/e2e.js` – proklikání v prohlížeči (Playwright)
