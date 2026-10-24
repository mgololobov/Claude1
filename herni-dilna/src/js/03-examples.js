// ---------- ukázkové projekty ----------
function exampleTrade() {
  const d1 = uid(), d2 = uid();
  const c = (title, type, cost, text, qty) => ({ id: uid(), title, type, cost, text, qty });
  return normalize({
    id: uid(), isExample: true, updatedAt: Date.now(),
    name: "Přístavní kupci", version: "0.4", players: "2–4", time: "40 min", age: "10+",
    summary: "Hráči jsou kupci v hanzovním přístavu. Výběrem akcí nakupují zboží, plní zakázky lodí a stavějí sklady. Vyhrává ten, kdo jako první získá 15 bodů.",
    rules: "PŘÍPRAVA\n1. Draftem si každý vybere 3 karty Zboží do začátku.\n2. Každý hráč dostane 3 mince a 2 kupce.\n3. Otočte 2 karty Zakázek.\n\nKOLO\n1. Výběr akcí – hráči po směru hodin pokládají kupce na volná pole akcí.\n2. Provedení akcí – akce se vyhodnotí shora dolů.\n3. Úklid – kupci se vrátí. Kdo vzal Radnici, začíná příští kolo, jinak se první hráč posune.\n\nKONEC HRY\nHra končí, jakmile někdo dosáhne 15 bodů. Dohraje se kolo.",
    changelog: [
      { id: uid(), ver: "0.4", date: "2026-10-24", note: "Radnice už nedává 2 mince – simulace ukázala, že kdo ji vzal, zůstal prvním hráčem celou hru a vyhrál přes 70 % her." },
      { id: uid(), ver: "0.3", date: "2026-10-12", note: "Loděnice zdražena ze 3 na 4 mince, první hráč měl moc velkou výhodu." },
      { id: uid(), ver: "0.2", date: "2026-10-01", note: "Volné akce nahrazeny výběrem akcí s omezeným počtem míst." },
    ],
    factions: [{ id: uid(), name: "Modrý kupec", color: "#3f6fb0" }, { id: uid(), name: "Červený kupec", color: "#b0402c" }, { id: uid(), name: "Zelený kupec", color: "#2f7a45" }],
    phases: ["Výběr akcí", "Provedení akcí", "Úklid"],
    resources: [{ id: "mince", name: "Mince", color: "#c98a12", start: 3, income: 1, max: "", vp: false, global: false }, { id: "body", name: "Body", color: "#2f7a45", start: 0, income: 0, max: "", vp: true, global: false }],
    marketCur: "mince", scoring: { field: "type", table: "0,2,5,9", trick: 0 },
    ruleset: Object.assign(defaultRules(), { autoIncome: true, win: { vp: 15, turns: "", elimination: false, finishRound: true } }),
    actions: [
      { id: uid(), name: "Trh", text: "Kup 1 kartu Zboží za její cenu.", slots: 2 },
      { id: uid(), name: "Přístav", text: "Splň 1 zakázku a získej body.", slots: 1, effect: "líznout 1 z Zakázky" },
      { id: uid(), name: "Loděnice", text: "Zaplať 4 mince, postav sklad (3 body).", slots: 1, effect: "zaplať 4 Mince: +3 Body" },
      { id: uid(), name: "Radnice", text: "Staň se prvním hráčem v příštím kole.", slots: 1, effect: "první hráč" },
    ],
    decks: [
      { id: d1, name: "Zboží", color: "#3f6fb0", back: "ZBOŽÍ", market: 4, cards: [
        c("Sůl", "Zboží", "1", "Základní zboží. Do zakázky se počítá za 1.", 6),
        c("Sukno", "Zboží", "2", "Při nákupu můžeš ihned vyměnit 1 Sůl za 1 minci.", 4),
        c("Koření", "Vzácné zboží", "4", "Počítá se za 2 kusy libovolného zboží.", 2),
        c("Jantar", "Vzácné zboží", "5", "Na konci hry +2 body.", 2),
      ]},
      { id: d2, name: "Zakázky", color: "#b0402c", back: "ZAKÁZKY", cards: [
        { ...c("Loď z Lübecku", "Zakázka", "", "Odevzdej 2× Sůl a 1× Sukno.\nZisk: 3 body.", 2), effect: "zaplať 2 Mince: +3 Body" },
        { ...c("Holandská koga", "Zakázka", "", "Odevzdej 1× Koření a 2× Sukno.\nZisk: 5 bodů.", 2), effect: "zaplať 4 Mince: +5 Body" },
        { ...c("Královská flotila", "Zakázka", "", "Odevzdej 1× Jantar a 1× Koření.\nZisk: 7 bodů.", 1), effect: "zaplať 6 Mince: +7 Body" },
      ]},
    ],
    tokens: [
      { id: uid(), name: "Mince", color: "#c98a12", shape: "kruh", counter: true, text: "" },
      { id: uid(), name: "Body", color: "#2f7a45", shape: "ctverec", counter: true, text: "" },
      { id: uid(), name: "Sklad", color: "#4a4a48", shape: "ctverec", counter: false, text: "SKLAD" },
    ],
    table: null,
    sessions: [
      { id: uid(), date: "2026-10-05", version: "0.2", minutes: 55, notes: "Moc dlouhé, na konci se točila stejná akce.", players: [{ name: "Jana", score: 15, win: true }, { name: "Petr", score: 11, win: false }, { name: "Eva", score: 9, win: false }] },
      { id: uid(), date: "2026-10-12", version: "0.3", minutes: 42, notes: "Loděnice se už nekupuje v prvním kole. Lepší.", players: [{ name: "Petr", score: 15, win: true }, { name: "Jana", score: 14, win: false }] },
      { id: uid(), date: "2026-10-14", version: "0.3", minutes: 38, notes: "", players: [{ name: "Eva", score: 16, win: true }, { name: "Jana", score: 12, win: false }, { name: "Petr", score: 10, win: false }, { name: "Tomáš", score: 8, win: false }] },
    ],
  });
}
function exampleWar() {
  const blue = { id: uid(), name: "Modří", color: "#3f6fb0" }, red = { id: uid(), name: "Červení", color: "#b0402c" };
  const terrain = {}, labels = {}, regions = {};
  const cols = 14, rows = 10;
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const k = c + "," + r; let t = null;
    if (c === 7) t = r === 4 ? null : "water";
    else if ((c >= 2 && c <= 4 && r >= 6 && r <= 8) || (c >= 10 && c <= 11 && r >= 1 && r <= 2)) t = "forest";
    else if (c >= 9 && c <= 10 && r >= 6 && r <= 7) t = "hill";
    else if (c === 13 && r < 3) t = "mount";
    else if (c === 6 && r >= 7) t = "marsh";
    if (t) terrain[k] = t;
    regions[k] = c < 5 ? "Západ" : c < 10 ? "Údolí" : "Východ";
  }
  terrain["2,3"] = "town"; labels["2,3"] = "Lhota";
  terrain["11,5"] = "town"; labels["11,5"] = "Brod";
  labels["7,4"] = "Most";
  const board = { id: uid(), name: "Údolí u Brodu", type: "hex", cols, rows, size: 34, terrain, labels, regions, bg: null };
  const U = (name, f, symbol, size, a, d, m, ra, rd, rm, qty) => ({ id: uid(), name, factionId: f.id, symbol, symText: "", size, att: a, def: d, mov: m, rAtt: ra, rDef: rd, rMov: rm, qty, note: "" });
  const units = [
    U("1. pěší", blue, "pechota", "III", 4, 4, 3, 2, 2, 3, 3),
    U("7. tankový", blue, "tanky", "II", 6, 3, 6, 3, 2, 6, 1),
    U("12. dělostř.", blue, "delo", "III", 5, 2, 2, 2, 1, 2, 1),
    Object.assign(U("Štáb", blue, "stab", "XX", 0, 1, 4, "", "", "", 1), { hq: true }),
    U("3. pěší", red, "pechota", "III", 3, 5, 3, 2, 3, 3, 3),
    U("Husaři", red, "jezdectvo", "II", 3, 2, 7, 1, 1, 7, 1),
    U("Baterie", red, "delo", "II", 4, 2, 2, 2, 1, 2, 1),
  ];
  const g = geo(board);
  const at = (unitId, c, r) => { const [cx, cy] = g.center(c, r); return { uid: uid(), kind: "unit", unitId, x: Math.round(BX + cx - 26), y: Math.round(BY + cy - 26), reduced: false, rot: 0 }; };
  const setup = [
    at(units[0].id, 1, 2), at(units[0].id, 1, 4), at(units[0].id, 2, 5), at(units[1].id, 0, 3), at(units[2].id, 0, 5), at(units[3].id, 0, 4),
    at(units[4].id, 8, 3), at(units[4].id, 8, 5), at(units[4].id, 11, 5), at(units[5].id, 9, 2), at(units[6].id, 10, 4),
  ];
  return normalize({
    id: uid(), isExample: true, updatedAt: Date.now(),
    name: "Obrana Brodu", version: "0.1", players: "2", time: "60 min", age: "12+",
    summary: "Hexová wargame pro dva hráče. Modří útočí přes řeku, Červení brání most a město Brod. Ukázka mapy, jednotek, scénáře, kontroly území a bojové tabulky.",
    rules: "SEKVENCE KOLA\n1. Iniciativa – hoď k6, vyšší hod hraje první.\n2. Pohyb – jednotky utratí body pohybu podle terénu (viz Mapa).\n3. Boj – sečti útok sousedních jednotek, porovnej s obranou × terén a hoď na bojové tabulce.\n4. Doplnění – oslabené jednotky v sousedství štábu se obnoví na 4+.\n\nZÓNY KONTROLY\nJednotka musí zastavit, když vstoupí na pole sousedící s nepřítelem.\n\nKROKY\nJednotka má dvě strany. Při ztrátě kroku ji otoč na oslabenou stranu, při druhé ztrátě ji odstraň.",
    factions: [blue, red],
    phases: ["Iniciativa", "Pohyb", "Boj", "Doplnění"],
    terrains: defaultTerrains(),
    ruleset: Object.assign(defaultRules(), { strict: true, actCats: [], phaseOf: { pohyb: [1], boj: [2] }, stackLimit: 2, moveRange: true, moveOnce: true, ownTurn: true, fog: true, sight: 5, win: { vp: "", turns: "", elimination: true } }),
    majority: { points: "3,1" },
    boards: [board], units,
    scenarios: [{ id: uid(), name: "Most přes Brodec", turns: 6, boardId: board.id,
      desc: "Ráno 3. dne. Modrá divize musí dobýt přechod přes řeku dřív, než dorazí nepřátelské posily.",
      victory: "Modří vyhrají, pokud na konci 6. kola kontrolují Brod i Most. Jinak vítězí Červení.",
      special: "Řeku lze překročit jen přes Most. Dělostřelectvo může podpořit útok na pole do vzdálenosti 2 (+1 sloupec).",
      holdF: blue.id, holdLabels: "Brod, Most",
      setup: { items: setup, control: { "2,3": blue.id, "11,5": red.id, "7,4": red.id } } }],
    decks: [{ id: uid(), name: "Události", color: "#4a4a48", back: "UDÁLOST", cards: [
      { id: uid(), title: "Mlha", type: "Událost", cost: "", text: "Toto kolo nelze použít dělostřelectvo.", qty: 2 },
      { id: uid(), title: "Posily", type: "Událost", cost: "", text: "Obránce postaví 1 pěší jednotku do Brodu.", qty: 1 },
      { id: uid(), title: "Rozvodněná řeka", type: "Událost", cost: "", text: "Most nelze toto kolo překročit.", qty: 1 },
    ]}],
    tokens: [
      { id: uid(), name: "Opevnění", color: "#6b7a6a", shape: "ctverec", counter: false, text: "OPEV." },
      { id: uid(), name: "Bez zásob", color: "#c98a12", shape: "ctverec", counter: false, text: "BEZ ZÁS." },
      { id: uid(), name: "Kolo", color: "#4a4a48", shape: "kruh", counter: true, text: "" },
    ],
    table: null, sessions: [],
  });
}
function exampleAlchemy() {
  const st = uid(), mk = uid();
  const c = (title, type, cost, text, qty, vp, icon) => ({ id: uid(), title, type, cost, text, qty, suit: "", value: "", vp, icon });
  return normalize({
    id: uid(), isExample: true, updatedAt: Date.now(),
    name: "Alchymistická dílna", version: "0.2", players: "2–4", time: "45 min", age: "10+",
    summary: "Deck building s riskováním. Každý začíná se slabým balíčkem, na trhu kupuje lepší karty a v každém tahu tahá přísady z kotlíku – čím víc, tím silnější lektvar, ale tři výbuchy znamenají přetažení.",
    rules: "PŘÍPRAVA\nKaždý hráč dostane vlastní startovní balíček (7× Měďák, 3× Bylina) a líže 5 karet. Na trhu leží 5 karet.\n\nTAH\n1. Zahraj karty z ruky (vylož je) a sečti mince.\n2. Kup kartu z trhu – jde do tvého odhozu.\n3. Volitelně táhni přísady z kotlíku. Kdykoli můžeš přestat. Když vytáhneš 3 výbuchy, přetáhl jsi a v tomto tahu body nezískáš.\n4. Úklid: ruka i vyložené karty do odhozu, líznout 5.\n\nKONEC\nKdo první dosáhne 20 bodů.",
    factions: [{ id: uid(), name: "Rubínová", color: "#b0402c", ability: "Jednou za hru smí vrátit jeden výbuch do kotlíku." }, { id: uid(), name: "Smaragdová", color: "#2f7a45", ability: "Každá Bylina dává +1 minci navíc." }, { id: uid(), name: "Safírová", color: "#3f6fb0", ability: "Na začátku hry líže 6 karet." }],
    phases: ["Zahrát karty", "Nákup", "Kotlík", "Úklid"],
    resources: [{ id: "mince", name: "Mince", color: "#c98a12", start: 0, income: 0, max: "", vp: false, global: false }, { id: "body", name: "Body", color: "#7a4fa0", start: 0, income: 0, max: 20, vp: true, global: false }],
    marketCur: "mince",
    ruleset: Object.assign(defaultRules(), { win: { vp: 20, turns: "", elimination: false }, triggers: [{ id: uid(), on: "tah", param: "", cond: "", effect: "nastav Mince 0" }] }),
    decks: [
      { id: st, name: "Startovní", color: "#6b7a6a", back: "DÍLNA", starter: true, market: 0, cards: [{ ...c("Měďák", "Peníze", "", "+1 {Mince}", 7, "", "🪙"), effect: "+1 Mince" }, { ...c("Bylina", "Přísada", "", "+1 {Mince}. Táhni 1 přísadu z kotlíku.", 3, "", "🌿"), effect: "+1 Mince; táhnout 1 z Kotlík" }] },
      { id: mk, name: "Trh lektvarů", color: "#7a4fa0", back: "LEKTVAR", starter: false, market: 5, cards: [
        { ...c("Stříbrňák", "Peníze", "3", "+2 {Mince}", 8, "", "🥈"), effect: "+2 Mince" }, { ...c("Zlaťák", "Peníze", "6", "+3 {Mince}", 5, "", "🥇"), effect: "+3 Mince" },
        { ...c("Ochranný amulet", "Akce", "4", "Jednou za kolo: +1 {Mince} a líznout 1.", 4, "", "🧿"), effect: "jednou za kolo: +1 Mince; líznout 1" }, { ...c("Mandragora", "Přísada", "5", "Táhni 2 přísady a vyber si odměnu.", 4, 1, "🌱"), effect: "táhnout 2 z Kotlík; vyber: +2 Mince | +1 Body" },
        c("Elixír života", "Lektvar", "7", "Body na konci hry.", 4, 3, "⚗️"), c("Kámen mudrců", "Lektvar", "9", "Body na konci hry.", 2, 5, "💎")] },
    ],
    bags: [{ id: uid(), name: "Kotlík", bustLimit: 3, contents: [{ label: "Bílá", color: "#f2f0e6", count: 6, bust: false }, { label: "Zlatá", color: "#e0aa2e", count: 3, bust: false }, { label: "Výbuch", color: "#b0402c", count: 4, bust: true }] }],
    cdice: [{ id: uid(), name: "Kostka osudu", color: "#7a4fa0", faces: ["★", "★", "🪙", "🪙", "💥", ""] }],
    tokens: [], table: null, sessions: [],
  });
}
function exampleTricks() {
  const suits = [["🔥", "Oheň"], ["💧", "Voda"], ["🌍", "Země"], ["💨", "Vzduch"]];
  const cards = []; suits.forEach(([s, nm]) => { for (let v = 1; v <= 9; v++) cards.push({ id: uid(), title: `${nm} ${v}`, type: nm, cost: "", text: v === 9 ? "Nejsilnější karta živlu." : "", qty: 1, suit: s, value: String(v), vp: v === 1 || v === 9 ? "1" : "", icon: s }); });
  return normalize({
    id: uid(), isExample: true, updatedAt: Date.now(),
    name: "Čtyři živly", version: "0.1", players: "3–4", time: "20 min", age: "8+",
    summary: "Štychová karetní hra se 36 kartami ve čtyřech živlech. Před každým kolem hráči tajně dražbou určí trumf, pak hrají štychy s povinností přiznat barvu.",
    rules: "PŘÍPRAVA\nRozdej každému 9 karet (3 hráči) nebo 9 karet a zbytek odlož (4 hráči).\n\nDRAŽBA TRUMFU\nKaždý tajně nabídne, kolik štychů udělá. Kdo nabídl nejvíc, zvolí trumf a vynáší první.\n\nŠTYCHY\nMusíš přiznat barvu. Kdo nemůže, smí hrát trumf nebo cokoli. Bere nejvyšší trumf, jinak nejvyšší karta vynesené barvy.\n\nBODY\n1 bod za štych, 1 bod za každou jedničku a devítku ve sebraných kartách, 3 body navíc za splněnou nabídku.",
    factions: [{ id: uid(), name: "Hráč 1", color: "#3f6fb0" }, { id: uid(), name: "Hráč 2", color: "#b0402c" }, { id: uid(), name: "Hráč 3", color: "#2f7a45" }],
    phases: ["Rozdání", "Dražba trumfu", "Štychy", "Počítání"],
    resources: [{ id: "body", name: "Body", color: "#c98a12", start: 0, income: 0, max: "", vp: true, global: false }],
    scoring: { field: "", table: "", trick: 1 }, bluffPenalty: "-1 Body",
    decks: [{ id: uid(), name: "Živly", color: "#2a8c8c", back: "ŽIVLY", market: 0, starter: false, cards }],
    tokens: [], table: null, sessions: [],
  });
}
function exampleTiles() {
  const T = (name, color, edges, icon, qty) => ({ id: uid(), name, color, edges, icon, qty });
  const labels = { "0,0": "Hrad", "8,6": "Přístav", "8,0": "Důl", "0,6": "Klášter" };
  return normalize({
    id: uid(), isExample: true, updatedAt: Date.now(),
    name: "Nové země", version: "0.1", players: "2–3", time: "30 min", age: "8+",
    summary: "Hráči střídavě táhnou a pokládají dílky krajiny. Hrany musí navazovat – louka na louku, cesta na cestu. Kdo propojí svými cestami vzdálená místa, získá body za cíle.",
    rules: "TAH\n1. Táhni dílek, otoč ho a polož tak, aby sousedil s položenými a hrany navazovaly.\n2. Polož jeden úsek trasy (stojí 1 dřevo) mezi sousedními poli.\n3. Za každý položený dílek získáš 1 dřevo.\n\nKONEC\nKdyž dojdou dílky. Body: cíle tras + 1 bod za každý tvůj dílek s městem.",
    factions: [{ id: uid(), name: "Zelení", color: "#2f7a45" }, { id: uid(), name: "Fialoví", color: "#7a4fa0" }],
    phases: ["Dílek", "Trasa"],
    resources: [{ id: "drevo", name: "Dřevo", color: "#a0723c", start: 2, income: 0, max: "", vp: false, global: false }, { id: "body", name: "Body", color: "#c98a12", start: 0, income: 0, max: "", vp: true, global: false }],
    terrains: defaultTerrains(),
    boards: [{ id: uid(), name: "Prázdná krajina", type: "square", cols: 9, rows: 7, size: 30, terrain: {}, labels, regions: {}, bg: null }],
    tiles: [T("Louka", "#a9c97a", "L,L,L,L", "", 8), T("Cesta rovně", "#c9d6a3", "C,L,C,L", "", 8), T("Zatáčka", "#c9d6a3", "C,C,L,L", "", 6), T("Křižovatka", "#c9d6a3", "C,C,C,L", "", 4), T("Město", "#d8c8ad", "M,C,L,L", "🏰", 5), T("Les", "#7fa766", "L,L,L,L", "🌲", 4)],
    tileRules: { match: true, adjacent: true },
    routes: { cost: "drevo", price: 1, exclusive: true, tickets: [{ id: uid(), a: "Hrad", b: "Přístav", pts: 8, fid: "" }, { id: uid(), a: "Důl", b: "Klášter", pts: 6, fid: "" }] },
    ruleset: Object.assign(defaultRules(), { strict: true, actCats: ["dilek", "trasa"], actionsPerTurn: 2, phaseOf: { dilek: [0], trasa: [1] }, roundOnWrap: true,
      triggers: [{ id: uid(), on: "dilek", param: "", cond: "", effect: "+1 Dřevo" }, { id: uid(), on: "dilek", param: "Město", cond: "", effect: "+1 Body; zpráva Město přináší bod" }] }),
    decks: [], tokens: [], table: null, sessions: [],
  });
}
function exampleRace() {
  return normalize({
    id: uid(), isExample: true, updatedAt: Date.now(),
    name: "Dračí závod", version: "0.1", players: "3–4", time: "25 min", age: "8+",
    summary: "Závod draků s házením kostkou, obchodováním s drahokamy na burze a tajnými rolemi. Jeden z hráčů je sabotér, který závodníky zdržuje.",
    rules: "TAH\nHoď kostkou a posuň draka. Zvláštní pole dávají zlato, karty nebo tě vrací zpět.\nPřed hodem můžeš na burze nakoupit nebo prodat drahokamy a obchodovat s ostatními.\nDrahokam můžeš kdykoli odevzdat za +2 pole.\n\nSABOTÉR\nDostane tajnou roli. Vyhrává, pokud nikdo nedojde do cíle do 10. kola.\n\nKONEC\nKdo první dojde do cíle (30 polí).",
    factions: [{ id: uid(), name: "Rudý drak", color: "#b0402c", ability: "Na poli s ohněm táhne o 1 pole navíc." }, { id: uid(), name: "Modrý drak", color: "#3f6fb0", ability: "Smí jednou za hru hodit znovu." }, { id: uid(), name: "Zlatý drak", color: "#c98a12", ability: "Na burze kupuje o 1 levněji." }],
    phases: ["Obchod", "Hod a pohyb"],
    resources: [{ id: "zlato", name: "Zlato", color: "#e0aa2e", start: 4, income: 1, max: "", vp: false, global: false }, { id: "drahokam", name: "Drahokamy", color: "#2a8c8c", start: 0, income: 0, max: "", vp: false, global: false }, { id: "bouře", name: "Bouře", color: "#4a4a48", start: 0, income: 0, max: 5, vp: false, global: true }],
    track: { length: 30, die: 6, autoNext: true, spaces: "3: +2 Zlato\n6: posun +2\n9: zpráva Vítr v zádech!; posun +1\n11: -2 Zlato\n14: posun -4\n17: líznout 1 z Kouzla\n20: všichni +1 Zlato\n23: posun -3\n26: +1 Drahokamy\n28: posun -5" },
    stock: { currency: "zlato", goods: [{ resId: "drahokam", price: 3, min: 1, max: 9 }] },
    roles: "Sabotér\nZávodník\nZávodník\nZávodník",
    ruleset: Object.assign(defaultRules(), { autoIncome: true, roundOnWrap: true, win: { vp: "", turns: 10, elimination: false },
      triggers: [{ id: uid(), on: "kolo", param: "", cond: "", effect: "+1 Bouře" }] }),
    decks: [{ id: uid(), name: "Kouzla", color: "#7a4fa0", back: "KOUZLO", market: 0, starter: false, cards: [
      { id: uid(), title: "Křídla větru", type: "Kouzlo", cost: "", text: "Posuň se o 3 pole.", qty: 3, suit: "", value: "", vp: "", icon: "🌬️", effect: "posun +3", locked: false },
      { id: uid(), title: "Zlatý déšť", type: "Kouzlo", cost: "", text: "Získej 3 zlata.", qty: 2, suit: "", value: "", vp: "", icon: "🪙", effect: "+3 Zlato", locked: false },
      { id: uid(), title: "Kletba", type: "Kouzlo", cost: "", text: "Všichni ostatní ustoupí o 2 pole.", qty: 2, suit: "", value: "", vp: "", icon: "🌀", effect: "ostatní posun -2; zpráva Kletba! Ostatní draci ustupují.", locked: false },
      { id: uid(), title: "Dračí poklad", type: "Kouzlo", cost: "", text: "Odemkne se v kampani. Získej 2 drahokamy.", qty: 1, suit: "", value: "", vp: "", icon: "💎", effect: "+2 Drahokamy", locked: true }] }],
    tokens: [], table: null, sessions: [],
  });
}
function exampleIsland() {
  const red = { id: uid(), name: "Červení", color: "#b0402c", ability: "Stavba osady stojí o 1 obilí méně.", setup: "+1 Dřevo; +1 Cihly", bot: "" };
  const blue = { id: uid(), name: "Modří", color: "#3f6fb0", ability: "Při produkci 6 nebo 8 berou surovinu navíc.", setup: "+2 Obilí", bot: "" };
  const botDeck = { id: uid(), name: "Automat", color: "#4a4a48", back: "AUTOMAT", market: 0, starter: false, cards: [
    { id: uid(), title: "Expanze", type: "Automat", cost: "", text: "Automat staví osadu.", qty: 2, suit: "", value: "", vp: "", icon: "🏠", effect: "+1 Body", locked: false },
    { id: uid(), title: "Sklizeň", type: "Automat", cost: "", text: "Automat sklízí.", qty: 5, suit: "", value: "", vp: "", icon: "🌾", effect: "+2 Obilí", locked: false },
    { id: uid(), title: "Blokáda", type: "Automat", cost: "", text: "Ostatní přicházejí o obilí.", qty: 2, suit: "", value: "", vp: "", icon: "⛔", effect: "ostatní -1 Obilí; zpráva Automat blokuje trh", locked: false }] };
  const bot = { id: uid(), name: "Automat", color: "#4a4a48", ability: "Solo protivník – hraje kartami z balíčku Automat.", setup: "", bot: botDeck.id };
  const terrains = [
    { id: "plain", name: "Pastvina", color: "#b9d38a", glyph: "", move: "1", def: 1, vp: 0, produces: "obili" },
    { id: "forest", name: "Les", color: "#6f9a5a", glyph: "♣", move: "2", def: 1.5, vp: 0, produces: "drevo", blocks: true },
    { id: "hill", name: "Hlína", color: "#c9905c", glyph: "⌒", move: "2", def: 2, vp: 0, produces: "cihly" },
    { id: "desert", name: "Poušť", color: "#e6d6a8", glyph: "·", move: "1", def: 1, vp: 0, produces: "" },
    { id: "water", name: "Moře", color: "#86b7d8", glyph: "≈", move: "–", def: 1, vp: 0, produces: "" },
  ];
  const board = { id: uid(), name: "Ostrov", type: "hex", cols: 7, rows: 5, size: 36, terrain: {}, labels: {}, regions: {}, numbers: {}, bg: null };
  const proj = { terrains, resources: [] };
  randomizeBoard(proj, board, { plain: 12, forest: 10, hill: 8, desert: 2, water: 3 }, "2,3,3,4,4,5,5,6,6,8,8,9,9,10,10,11,11,12");
  const osada = f => ({ id: uid(), name: "Osada", factionId: f.id, symbol: "text", symText: "⌂", size: "", att: "", def: "", mov: 1, rAtt: "", rDef: "", rMov: "", qty: 5, note: "" });
  const units = [osada(red), osada(blue)];
  const g = geo(board); const at = (u, c, r) => { const [cx, cy] = g.center(c, r); return { uid: uid(), kind: "unit", unitId: u.id, x: Math.round(BX + cx - 26), y: Math.round(BY + cy - 26), reduced: false, rot: 0 }; };
  return normalize({
    id: uid(), isExample: true, updatedAt: Date.now(),
    name: "Ostrov osadníků", version: "0.1", players: "1–3", time: "45 min", age: "10+",
    summary: "Budovatelská hra s náhodným ostrovem. Na začátku kola padne 2k6 a pole s tím číslem dají suroviny osadám, které na nich nebo vedle nich stojí. Hráči si pak vybírají role a staví. Lze hrát i sólo proti automatu.",
    rules: "PŘÍPRAVA\nV záložce Mapa klikni na „Náhodné rozložení“ – každá hra má jiný ostrov. Každá strana postaví 2 osady.\n\nKOLO\n1. Produkce – hoď 2k6 (nástroj Území). Pole s padlým číslem dají surovinu osadám na poli i vedle něj. Na sedmičku se nic nevyrábí.\n2. Role – každý si vezme jednu roli. Nevybraná role nasbírá obilí navíc.\n3. Stavba – nová osada stojí 1 dřevo + 1 cihly + 1 obilí a dá 1 bod.\n\nKONEC\nKdo první získá 10 bodů.",
    factions: [red, blue, bot], phases: ["Produkce", "Role", "Stavba"],
    resources: [{ id: "drevo", name: "Dřevo", color: "#6f9a5a", start: 0, income: 0, max: "", vp: false, global: false }, { id: "cihly", name: "Cihly", color: "#c9905c", start: 0, income: 0, max: "", vp: false, global: false }, { id: "obili", name: "Obilí", color: "#e0aa2e", start: 0, income: 0, max: "", vp: false, global: false }, { id: "body", name: "Body", color: "#7a4fa0", start: 0, income: 0, max: "", vp: true, global: false }],
    terrains, boards: [board], units,
    actionMode: "roles", roleRes: "obili",
    actions: [{ id: uid(), name: "Stavitel", text: "Postav osadu za 1 dřevo + 1 cihly + 1 obilí (1 bod).", slots: 1, effect: "zaplať 1 Dřevo + 1 Cihly + 1 Obilí: +1 Body" }, { id: uid(), name: "Obchodník", text: "Vyměň 2 stejné suroviny za 1 jinou.", slots: 1, effect: "vyber: zaplať 2 Dřevo: +1 Obilí | zaplať 2 Cihly: +1 Dřevo | zaplať 2 Obilí: +1 Cihly | zaplať 2 Dřevo: +1 Cihly" }, { id: uid(), name: "Starosta", text: "+1 obilí a začíná příští kolo.", slots: 1, effect: "+1 Obilí" }],
    production: { mode: "units" },
    scenarios: [{ id: uid(), name: "Základní ostrov", turns: 12, boardId: board.id, desc: "Dvě osady pro každou stranu.", victory: "Kdo první získá 10 bodů.", special: "", setup: { items: [at(units[0], 1, 1), at(units[0], 4, 3), at(units[1], 5, 1), at(units[1], 2, 3)], control: {} } }],
    ruleset: Object.assign(defaultRules(), { phaseOf: { akce: [1] }, roundOnWrap: false, win: { vp: 10, turns: "", elimination: false },
      triggers: [{ id: uid(), on: "hod", param: "7", cond: "", effect: "zpráva Padla sedmička – zloděj! Kdo má víc než 7 surovin, polovinu odhodí." }] }),
    decks: [botDeck], tokens: [], table: null, sessions: [],
  });
}
function blankProject() {
  return normalize({ id: uid(), updatedAt: Date.now(), name: "Nová hra", version: "0.1", players: "2–4", time: "30 min", age: "8+", summary: "", rules: "",
    decks: [{ id: uid(), name: "Balíček 1", color: COLORS[0], back: "HRA", cards: [] }], table: null });
}
