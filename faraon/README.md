# Pán Obou zemí

Strategická simulace starověkého Egypta v době rozdělení země – egyptská obdoba středověké hry Panovník. Hraje se po měsících egyptského občanského roku (Achet, Peret, Šemu), cílem je sjednotit Horní a Dolní Egypt.

Hra je jeden soubor `dist/index.html`: stačí ho otevřít v prohlížeči, funguje bez internetu a ukládá se v prohlížeči; hru lze uložit i jako text (zkopírovat a později vložit).

## Scénáře

- **≈ 2070 př. n. l. – Válka Obou zemí** (První přechodné období): Thébané Intefa II. proti Hérakleopoli („domu Chetiho“), nomarchové Asjútu, Hermopole a Beni Hasanu, Kuš, Vavat, Médžajové, Aamu a Libyjci. Sušší klima a nízké záplavy.
- **≈ 1560 př. n. l. – Proti Hyksósům** (Druhé přechodné období): 17. dynastie Sekenenrea Taa a Kamoseho proti Hyksósům krále Apopiho z Avaridu a jejich spojenci Kuši; kníže Teti v Nefrusy. Historické události: spor o hrochy (papyrus Sallier I.), zachycený dopis vládci Kuše (Kamoseho stéla), Rhindův papyrus.

- **≈ 2120 př. n. l. – Anchtifi z Moally**: nomarcha Hefatu, který podle nápisů ve své hrobce ovládl Edfu a bojoval s Thébami a Koptem za velkého hladu; Intef I. v Thébách, Hérakleopolis na severu.

## Co hra obsahuje

- 48 nomů od Kermy po Deltu s egyptskými jmény, bohy a surovinami; mapa se skutečným tokem Nilu a ramen v Deltě.
- Nilometr a záplavy (Pliniovo pravidlo 12–16 loktů), sklizeň v Šemu, daň v obilí, obecní sýpky, hlad; debeny jako jednotka hodnoty, trh s obilím.
- Úředníci s hodnostmi Střední říše (písař, jedinečný přítel, hatia, velký představený nomu, iripat), rozkazy, úřady (vezír, pokladník, správce sýpek, velitel vojska, velekněz), věrnost a zrady.
- Výpravy do Vádí Hammámát, Hatnubu, na Sinaj, do zlatých dolů Vavatu, do Byblu a do Puntu.
- Vojsko (kopiníci, lučištníci, Médžajové, válečné vozy), pochody a plavba po Nilu, bitvy, obléhání pevností, nájezdy kmenů.
- Maat, stavy (kněží, nomarchové, písaři, lid), zákony, chrámy, hrobka panovníka, svátek sed, Usirovy mystéria v Abydu.
- Události podle pramenů: Výmluvný rolník, Ponaučení pro Merikarea, Nářky Ipuverovy, Krásný svátek údolí, proklínací obřady (Mirgissa), pád Nefrusy a Avaridu, příběh o ztroskotaném námořníkovi.
- Velké stavby panovníků: zádušní chrám v Dér el-Bahrí, chrám Amona v Karnaku, Usirův chrám v Abydu, hráze Fajjúmu, pevnosti 2. kataraktu, Zdi vládcovy, obelisk v Heliopoli.
- Události ze života Egypta: lov na hrocha, myši a kobylky, Asiaté žádající o pastviny (jako karavana Abiši z Beni Hasanu), požár sýpky, spiknutí v ženském domě (Veni, Amenemhat I.), narození býka Apis, nemoc panovníka, žádost spojence o pomoc, zběhové, karavana z jihu (Harchuf), životopisné stély v Abydu, vdova u soudu, mor dobytka, asijští řemeslníci, posel z Kuše, odměna za statečnost.
- Odkaz rodu: bodové hodnocení vlády pro porovnání her.
- Rod, sňatky, nástupnictví (i spoluvláda), vědění od nilometru po válečný vůz a námořní lodě.

Jména vládců a doložených hodnostářů odpovídají pramenům; roky narození, schopnosti a ostatní postavy jsou herní. Letopočty podle střední chronologie (I. Shaw, The Oxford History of Ancient Egypt, 2000).

## Vzhled

Vzhled vychází z egyptského umění: barvy egyptských pigmentů, blokový vlys z hrobek, postavy z profilu s konvencemi egyptské malby (muži červenohnědí, ženy žlutookrové, Asiaté podle malby z Beni Hasanu, král v šátku nemes), mapa s černou zemí Kemet a červenou zemí Dešret. Hieroglyfy (písmo Noto Sans Egyptian Hieroglyphs, licence OFL, zmenšené na použité znaky) mají skutečný význam: nb tꜣwj „Pán Obou zemí“, nswt-bjtj „král Horního a Dolního Egypta“, ꜥnḫ wḏꜣ snb „živ, zdráv, silen“, sepat „nom“, sema „sjednocení“.

## Ovládání

Hlavní obrazovkou je mapa přes celé okno: kolečkem přibližuješ, tažením posouváš, najetím na nom vidíš jeho údaje. Režimy mapy: politická, terén, úroda, spokojenost, rozvoj, vojsko. Vpravo je přehled dění (války, vojska, obléhání, stavby, výpravy, vědění), vlevo dole panovník. Tlačítkem ▶ necháš čas plynout; zastaví se u každé události.

Citáty z dochovaných textů (Ponaučení pro Merikarea, Ptahhotep, Výmluvný rolník, Nářky Ipuverovy, Proroctví Neferetiho, hrobka Anchtifiho, dopis Hekanachta, stély Kamoseho, životopis Ahmose, syna Ebany, Satira na povolání, Hymnus na Nil, Texty rakví, Píseň harfeníka, stéla ze Semny, proklínací texty, Smithův a Rhindův papyrus) jsou volné české převody podle běžných překladů, vždy s uvedeným pramenem. Hra ukazuje jen texty, které v dané době už existovaly.

## Vývoj

- `src/js/0*.js` – pravidla (data, scénáře, hospodářství, rozkazy, válka, běh měsíce), bez prohlížeče
- `src/js/1*.js`, `99-main.js` – rozhraní
- `python3 build.py` – sestaví `dist/index.html`
- `node tests/sim.test.js 240` – odehraje 20 let za každý hratelný rod v obou scénářích a hlídá chyby
- `node tests/e2e.js` – proklikání v prohlížeči (Playwright)
