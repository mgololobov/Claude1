// Data ve stylu Europa Universalis: kultury, náboženství, ideje, úkoly, záminky k válce, zeměpis mapy.

// ---------- kultury a náboženství ----------
const CULTURES = {
  cz: { n: "česká", g: "zs" }, sk: { n: "slovenská", g: "zs" }, pl: { n: "polská", g: "zs" }, de: { n: "německá", g: "ger" },
  hu: { n: "maďarská", g: "uh" }, ru: { n: "ruská (rusínská)", g: "vs" }, sl: { n: "slovinská", g: "js" }, hr: { n: "chorvatská", g: "js" }, pr: { n: "pruská", g: "balt" },
};
const CGROUPS = { zs: "západoslovanská", ger: "německá", uh: "uherská", vs: "východoslovanská", js: "jihoslovanská", balt: "baltská" };
const CULT_COL = { cz: "#c0392b", sk: "#e67e22", pl: "#e74c3c", de: "#7f8c8d", hu: "#27ae60", ru: "#5d6d7e", sl: "#8e44ad", hr: "#2471a3", pr: "#a0522d" };
// výjimky z kultury podle majitele (jinak se bere kultura rodu)
const PROV_CULTURE = { viden: "de", linec: "de", kremze: "de", pitten: "de", stajhradec: "de", leoben: "de", ptuj: "sl", kransko: "sl", korutany: "de", gorice: "sl", zahreb: "hr",
  nitra: "sk", stiavnica: "sk", spis: "sk", tesin: "pl", kladsko: "cz", opava: "cz", kralovec: "pr", elblag: "pr", chelmno: "pl", budysin: "de", dluzice: "de", stetin: "de", volegost: "de", kolobreh: "pl", lebus: "pl", premysl_r: "ru" };
const RELIGIONS = { kat: { n: "katolická", col: "#e0c060" }, prav: { n: "pravoslavná", col: "#7d4fa0" }, poh: { n: "pohanská", col: "#4f7f3f" } };
const PROV_RELIGION = { chelm: "prav", vladimir: "prav", halic: "prav", lvov: "prav", premysl_r: "prav", kralovec: "poh" };
const CLAN_RELIGION = { halic: "prav" };

// ---------- body vlády ----------
const MP = { adm: { n: "Správa", stat: "spr", col: "#4f7f4f", off: "komori" }, dip: { n: "Diplomacie", stat: "roz", col: "#3f6fa8", off: "kancler" }, mil: { n: "Vojsko", stat: "ved", col: "#a3332b", off: "marsal" } };
const MP_IDS = Object.keys(MP);

// ---------- skupiny idejí ----------
const IDEAS = {
  sprava: { n: "Správa země", mp: "adm", list: [["komora", "Královská komora", "+10 % daní z krajů"], ["desky", "Zemské desky", "stabilita o čtvrtinu levnější"], ["lokace", "Lokace měst a vsí", "+0,05 % růstu obyvatel měsíčně, rozvoj levnější"], ["urad", "Zemské úřady", "+1 bod správy měsíčně"]] },
  diplomacie: { n: "Diplomacie", mp: "dip", list: [["vyslanci", "Stálí vyslanci", "+10 k úspěchu poselstev"], ["snatky", "Sňatková politika", "sňatky ochotněji přijímány"], ["smir", "Smírčí soudy", "agresivní expanze o třetinu nižší"], ["kancelar", "Dvorská kancelář", "+1 bod diplomacie měsíčně"]] },
  vojsko: { n: "Válečnictví", mp: "mil", list: [["rytiri", "Rytířské družiny", "jízda +15 % síly"], ["kondotieri", "Žoldnéřské smlouvy", "žoldnéři o čtvrtinu levnější"], ["hrady", "Síť hradů", "hrady +1 úroveň obrany"], ["korist", "Válečná kořist", "dvojnásobná kořist z dobytí"]] },
  obchod: { n: "Obchod", mp: "dip", list: [["vysady", "Kupecké výsady", "obchodní cesty +30 %"], ["jarmarky", "Trhy a jarmarky", "+5 spokojenosti ve městech"], ["mincovna", "Mincovní reforma", "+5 % všech příjmů"], ["hanza", "Hanzovní styky", "vstup do Hanzy zdarma, Hanza +50 %"]] },
  vira: { n: "Víra", mp: "adm", list: [["klastery", "Klášterní reforma", "kláštery +100 % učenosti"], ["pout", "Poutní místa", "+0,5 prestiže měsíčně"], ["misie", "Misie", "obracení na víru dvakrát úspěšnější"], ["biskupove", "Biskupská podpora", "+0,5 přízně papeže měsíčně"]] },
};
const IDEA_COST = 150;

// ---------- záminky k válce ----------
const CB = {
  narok: { n: "Nárok na kraj", d: "máš nárok (zfalšovaný nebo zděděný) na jejich kraj" },
  jadro: { n: "Znovudobytí", d: "drží kraj, který je tvým jádrem" },
  koruna: { n: "Jednota koruny", d: "drží kraj z jádra tvé koruny" },
  klatba: { n: "Říšská klatba", d: "rod je v říšské klatbě" },
  krizova: { n: "Svatá válka", d: "rod je v papežské klatbě nebo jiné víry" },
  koalice: { n: "Koalice", d: "obrana proti tvé agresivní expanzi" },
  zadna: { n: "Bez záminky", d: "stabilita −2, prestiž −30, vyšší agresivní expanze" },
};

// ---------- úkoly rodů ----------
// test: funkce (s, cid) => bool, odmena: text a funkce
const MISSIONS = [
  { id: "stab", n: "Upevnit vládu", d: "Dosáhni stability +2.", t: (s, c) => s.clans[c].stab >= 2, r: "+60 bodů správy", g: (s, c) => { s.clans[c].mp.adm += 60; } },
  { id: "sidlo", n: "Skvělé sídlo", d: "Rozviň sídelní kraj na rozvoj 150 (pole + obchod).", t: (s, c) => { const p = s.provs[s.clans[c].capital]; return p && p.agri + p.com >= 150; }, r: "+40 prestiže", g: (s, c) => { s.clans[c].prestige += 40; } },
  { id: "hrad", n: "Hrad nad hrady", d: "Postav v sídle hrad 4. úrovně.", t: (s, c) => { const p = s.provs[s.clans[c].capital]; return p && p.castle >= 4; }, r: "+60 bodů vojska", g: (s, c) => { s.clans[c].mp.mil += 60; } },
  { id: "spojenci", n: "Síť spojenců", d: "Měj dva spojence.", t: (s, c) => aliveClans(s).filter(o => allied(s, c, o.id)).length >= 2, r: "+60 bodů diplomacie", g: (s, c) => { s.clans[c].mp.dip += 60; } },
  { id: "snatky", n: "Krev králů", d: "Buď spřízněn sňatky se třemi rody.", t: (s, c) => aliveClans(s).filter(o => married(s, c, o.id)).length >= 3, r: "+50 prestiže", g: (s, c) => { s.clans[c].prestige += 50; } },
  { id: "bitvy", n: "Vítěz bitev", d: "Vyhraj pět bitev.", t: (s, c) => s.battles.filter(b => b.win === c).length >= 5 || (s.clans[c].wins || 0) >= 5, r: "+80 bodů vojska", g: (s, c) => { s.clans[c].mp.mil += 80; } },
  { id: "expanze", n: "Rozšířit panství", d: "Získej o tři kraje víc, než jsi měl na začátku.", t: (s, c) => clanProvs(s, c).length >= (s.clans[c].startProvs || 0) + 3, r: "+50 prestiže, +50 bodů správy", g: (s, c) => { s.clans[c].prestige += 50; s.clans[c].mp.adm += 50; } },
  { id: "koruna", n: "Královská koruna", d: "Nech se korunovat králem (Čechy, Uhry, Polsko, Halič).", t: (s, c) => s.clans[c].titles.some(t => CROWNS[t]), r: "+100 prestiže", g: (s, c) => { s.clans[c].prestige += 100; } },
  { id: "rise", n: "Římská koruna", d: "Staň se římským králem.", t: (s, c) => s.hre.kingClan === c, r: "+100 bodů diplomacie", g: (s, c) => { s.clans[c].mp.dip += 100; } },
  { id: "hanza", n: "Brána k moři", d: "Měj město v Hanze.", t: (s, c) => clanProvs(s, c).some(p => p.hanza), r: "+60 bodů diplomacie", g: (s, c) => { s.clans[c].mp.dip += 60; } },
  { id: "ideje", n: "Osvícený vladař", d: "Získej čtyři ideje.", t: (s, c) => Object.keys(s.clans[c].ideas || {}).length >= 4, r: "+50 ke všem bodům", g: (s, c) => { for (const k of MP_IDS) s.clans[c].mp[k] += 50; } },
  // úkoly konkrétních rodů
  { id: "styrsko", only: "premysl", n: "Štýrské dědictví", d: "Ovládni Štýrský Hradec, Horní a Dolní Štýrsko.", t: s => ["stajhradec", "leoben", "ptuj"].every(id => s.provs[id].owner === "premysl"), r: "+120 prestiže", g: s => { s.clans.premysl.prestige += 120; } },
  { id: "jadran", only: "premysl", n: "Od Krkonoš k Jadranu", d: "Ovládni Korutany a Kraňsko.", t: s => ["korutany", "kransko"].every(id => s.provs[id].owner === "premysl"), r: "+100 bodů vojska", g: s => { s.clans.premysl.mp.mil += 100; } },
  { id: "rakousy", only: "habsburg", n: "Rakouské vévodství", d: "Ovládni Vídeň a Horní Rakousy.", t: s => ["viden", "linec"].every(id => s.provs[id].owner === "habsburg"), r: "+150 prestiže", g: s => { s.clans.habsburg.prestige += 150; } },
  { id: "styrsko_u", only: "arpad", n: "Udržet Štýrsko", d: "Drž Štýrsko ještě v roce 1265.", t: s => s.year >= 1265 && ["stajhradec", "leoben", "ptuj"].every(id => s.provs[id].owner === "arpad"), r: "+100 prestiže", g: s => { s.clans.arpad.prestige += 100; } },
  { id: "polsko", only: ["krakov", "velkopolsko", "kujavsko", "mazovsko", "vratislav"], n: "Sjednocení Polska", d: "Nech se korunovat polským králem.", t: (s, c) => s.clans[c].titles.includes("Polsko"), r: "+200 prestiže", g: (s, c) => { s.clans[c].prestige += 200; } },
  { id: "bavorsko", only: ["wittH", "wittL"], n: "Sjednocené Bavorsko", d: "Ovládni Mnichov i Landshut.", t: (s, c) => ["mnichov", "landshut"].every(id => s.provs[id].owner === c), r: "+120 prestiže", g: (s, c) => { s.clans[c].prestige += 120; } },
  { id: "pomorany_b", only: "brandenburg", n: "Cesta k Baltu", d: "Ovládni Štětín.", t: s => s.provs.stetin.owner === "brandenburg", r: "+100 bodů diplomacie", g: s => { s.clans.brandenburg.mp.dip += 100; } },
  { id: "prusko", only: "rad", n: "Pokřtění Prus", d: "Obrať Sambii na křesťanství.", t: s => s.provs.kralovec.rel === "kat" && s.provs.kralovec.owner === "rad", r: "+150 prestiže", g: s => { s.clans.rad.prestige += 150; } },
];

// ---------- zeměpis mapy (zem. délka, šířka) ----------
const SEAS = [
  [[9.6, 55.3], [9.9, 54.8], [10.2, 54.4], [10.75, 53.95], [11.5, 54.02], [12.2, 54.2], [13.3, 54.62], [13.8, 54.15], [14.3, 53.92], [15.6, 54.2], [17.0, 54.7], [18.3, 54.82], [18.7, 54.4], [19.6, 54.45], [20.0, 54.78], [21.2, 55.0], [25.9, 55.3]],
  [[11.5, 45.2], [12.3, 45.45], [13.0, 45.68], [13.55, 45.8], [13.78, 45.66], [13.6, 45.2]],
];
const LAKES = [[17.75, 46.85, 0.42, 0.09, -0.6], [9.35, 47.62, 0.28, 0.07, -0.5]];
const RIVERS = [
  ["Dunaj", [[9.99, 48.4], [11.42, 48.76], [12.1, 49.02], [12.57, 48.88], [13.46, 48.57], [14.29, 48.31], [15.6, 48.41], [16.37, 48.21], [17.11, 48.14], [18.12, 47.76], [18.74, 47.8], [19.13, 47.78], [19.04, 47.5], [18.9, 46.9], [18.68, 46.0], [18.9, 45.4]]],
  ["Labe", [[15.55, 50.75], [15.83, 50.21], [15.2, 50.03], [14.47, 50.35], [14.13, 50.53], [14.04, 50.66], [13.74, 51.05], [13.47, 51.16], [13.0, 51.56], [12.65, 51.87], [11.63, 52.13], [11.9, 52.9], [10.9, 53.3], [9.99, 53.55]]],
  ["Vltava", [[13.8, 48.75], [14.32, 48.81], [14.47, 48.97], [14.4, 49.4], [14.42, 50.08], [14.47, 50.35]]],
  ["Odra", [[17.6, 49.7], [18.22, 50.09], [17.93, 50.67], [17.04, 51.11], [16.08, 51.66], [15.6, 52.0], [14.55, 52.35], [14.55, 53.43], [14.3, 53.9]]],
  ["Visla", [[18.9, 49.6], [19.94, 50.06], [21.75, 50.68], [21.6, 51.5], [21.0, 52.23], [19.7, 52.55], [18.6, 53.0], [18.46, 53.35], [18.8, 54.0], [18.65, 54.35]]],
  ["Rýn", [[9.6, 47.6], [7.59, 47.56], [7.6, 48.5], [7.75, 48.58], [8.43, 49.32], [8.47, 49.49], [8.27, 50.0], [7.6, 50.4], [7.0, 50.9]]],
  ["Mohan", [[10.9, 49.9], [9.93, 49.79], [8.68, 50.11], [8.27, 50.0]]],
  ["Morava", [[16.9, 50.1], [17.25, 49.59], [17.4, 49.1], [16.95, 48.6], [16.98, 48.17]]],
  ["Tisa", [[23.0, 48.2], [21.9, 48.0], [20.2, 47.18], [20.15, 46.25], [20.3, 45.4]]],
  ["Dráva", [[12.5, 46.7], [13.85, 46.61], [14.3, 46.6], [15.65, 46.56], [15.87, 46.42], [17.0, 46.0], [18.6, 45.6]]],
  ["Sáva", [[14.3, 46.3], [14.51, 46.05], [15.98, 45.8], [17.0, 45.4]]],
  ["Mura", [[14.8, 47.2], [15.44, 47.07], [16.0, 46.6], [16.6, 46.4]]],
  ["Inn", [[10.2, 46.7], [11.4, 47.26], [12.1, 47.85], [13.46, 48.57]]],
  ["Varta", [[19.0, 50.8], [18.7, 51.6], [17.3, 52.1], [16.93, 52.41], [15.2, 52.7], [14.65, 52.59]]],
  ["Dněstr", [[23.0, 49.4], [24.71, 49.12], [25.9, 48.8]]],
  ["Bug", [[24.5, 49.8], [24.33, 50.85], [23.6, 51.6], [22.5, 52.4], [21.0, 52.4]]],
];
const RANGES = [
  ["Alpy", [[7.0, 46.6], [8.5, 46.7], [10.0, 46.8], [11.5, 47.0], [12.8, 47.1], [14.0, 47.25], [15.2, 47.4], [15.9, 47.6]]],
  ["Karpaty", [[17.8, 49.2], [18.8, 49.45], [19.8, 49.3], [21.0, 49.35], [22.3, 49.2], [23.2, 48.9], [24.3, 48.3], [25.2, 47.6], [25.5, 46.9], [24.6, 46.3], [23.3, 45.7]]],
  ["Sudety", [[14.9, 50.85], [15.6, 50.75], [16.3, 50.55], [16.9, 50.3], [17.4, 50.15]]],
  ["Šumava", [[12.6, 49.45], [13.2, 49.1], [13.8, 48.8], [14.3, 48.65]]],
  ["Krušné hory", [[12.3, 50.35], [12.9, 50.48], [13.5, 50.6], [14.0, 50.75]]],
  ["Dinárské hory", [[14.6, 45.7], [15.4, 45.5]]],
];
const MAPMODES = [["polit", "Politická"], ["teren", "Terén"], ["rozvoj", "Rozvoj"], ["spokoj", "Spokojenost"], ["vztahy", "Vztahy"], ["kultura", "Kultura"], ["vira", "Víra"], ["obchod", "Obchod"], ["jadra", "Začlenění"]];
const TERRAIN_COL = { n: "#c9c58a", k: "#b5a46d", h: "#8d7f6a", l: "#5f8a4e", b: "#6f8f7f", p: "#c9b98a" };
