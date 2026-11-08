// Další zákony a vynálezy, náhoda (znamení roku), narození dětí v rodu, výchova dědice, královská objížďka nomů
// a další události. Kde je doklad mladší než doba hry, je to uvedeno.

// ---------- zákony ----------
Object.assign(LAWS, {
  dobytek: { n: "Sčítání dobytka", opts: ["Bez sčítání", "Každý druhý rok", "Každoročně"], d: "Ve Staré říši se dobytek sčítal zhruba každé dva roky a podle sčítání se dokonce počítala léta vlády. Častější soupis dává víc daní, ale lid ho nenávidí.", eff: ["lid +5, výnos nomů −3 %", "", "výnos nomů +6 %, lid −6"] },
  voda: { n: "Správa kanálů", opts: ["Obce a nomarchové", "Smíšená", "Královští správci kanálů"], d: "Kdo rozděluje vodu z kanálů, ovládá zemi. Nomarchové se v nápisech chlubili, že kopali kanály pro svůj nom.", eff: ["nomarchové +6, státu nic nestojí", "", "pole v nomech u Nilu rostou o 1 ročně navíc, stojí 30 debenů za nom měsíčně, nomarchové −8"] },
  vojaci: { n: "Půda pro vojáky", opts: ["Jen příděly obilí", "Pole pro veterány", "Vojenské osady"], d: "Půdu za službu dostávali vojáci hlavně v Nové říši; odměny za statečnost (pole, otroci, zlato) líčí už Ahmose, syn Ebany.", eff: ["", "výcvik posádek +0,5 měsíčně, obilí −", "výcvik posádek +1 měsíčně, obilí −−, lid −4"] },
  obetiny: { n: "Obětní kalendář", opts: ["Skromné obětiny", "Obvyklé", "Okázalé slavnosti"], d: "Chrámy dostávaly denní i sváteční obětiny podle kalendáře, jak ho známe ze seznamů svátků. Okázalé slavnosti těší kněze i lid, ale stojí.", eff: ["+100 debenů měsíčně, maat pomalu klesá, kněží −8", "", "−250 debenů měsíčně, maat pomalu roste, kněží +10"] },
  ceny: { n: "Dohled nad trhem", opts: ["Volné ceny", "Dohled písařů", "Státní výkup obilí"], d: "Stát a chrámy svými sýpkami tlumily výkyvy cen; v krizi na konci Nové říše však obilí přesto mnohonásobně zdražilo.", eff: ["ceny kolísají silněji, kupci +", "", "výkyvy cen o polovinu menší, výnos obchodních cest −5 %"] },
  zeny: { n: "Majetek žen", opts: ["Podle zvyku", "Ženy dědí rovným dílem", "Vdovy spravují statky"], d: "Egyptské ženy mohly vlastnit, dědit i odkazovat majetek; z Lahúnu (12. dynastie) se dochovala listina, jíž muž převádí majetek na manželku.", eff: ["", "lid +4", "úřady se v rodech dědí jistěji, nomarchové +3"] },
});
Object.assign(LAW_EST, {
  dobytek: [{ lid: 5, pisari: -3 }, {}, { lid: -6, pisari: 5 }],
  voda: [{ nomarchove: 6, pisari: -3 }, {}, { nomarchove: -8, pisari: 6 }],
  vojaci: [{}, { lid: -2 }, { lid: -4, nomarchove: -3 }],
  obetiny: [{ knezi: -8 }, {}, { knezi: 10, lid: 3 }],
  ceny: [{ pisari: -2 }, {}, { pisari: 4, lid: 2 }],
  zeny: [{}, { lid: 4 }, { nomarchove: 3 }],
});
Object.assign(LAW_CATS, { dobytek: "Hospodářství", voda: "Země a lidé", vojaci: "Vojsko", obetiny: "Náboženství", ceny: "Hospodářství", zeny: "Země a lidé" });

// ---------- vynálezy ----------
const NEW_TECHS = {
  mery: { n: "Měřičské provazce a loket", cat: "Správa", cost: 80, req: ["katastr"], d: "„napínači provazce“ znovu vyměří pole po záplavě: po ničivé vodě se pole rychleji obnoví (+2 v nomech u Nilu)" },
  plachty: { n: "Plachty a kormidelní vesla", cat: "Řemesla", cost: 70, req: ["flotila"], d: "lodě plují proti proudu s větrem od severu: výnos obchodních cest +8 %" },
  studny: { n: "Pouštní studny a cisterny", cat: "Stavitelství", cost: 80, d: "oázy a pouštní kraje: lidé +3 % ročně, spokojenost +3 ročně" },
  hrncir: { n: "Hrnčířský kruh", cat: "Řemesla", cost: 60, d: "keramika na točícím se kruhu (v Egyptě od Staré říše, ve Střední říši zdokonalený): řemesla a obchod v nomech +1 ročně" },
  zlato: { n: "Rýžování a drcení zlaté rudy", cat: "Řemesla", cost: 100, req: ["bronz"], d: "doly ve Vádí Allákí a Východní poušti: +150 debenů měsíčně za Vavat, Buhen a Vádí Hammámát" },
  ucetnictvi: { n: "Chrámové účetní knihy", cat: "Správa", cost: 90, req: ["pisari"], d: "denní záznamy příjmů a výdajů jako v chrámovém archivu z Lahúnu: výnos nomů +4 %" },
  glacis: { n: "Šikmé valy a příkopy", cat: "Válečnictví", cost: 100, req: ["pevnosti"], d: "hliněný šikmý val (glacis) před hradbami, typický pro města Kenaanu a Avaris: hradby +25 %" },
  rybari: { n: "Rybářské vrše a vlečné sítě", cat: "Zemědělství", cost: 50, d: "ryby z Nilu, bažin Delty a Fajjúmského jezera: víc obilí zůstane v sýpkách" },
};
Object.assign(TECHS, NEW_TECHS); for (const k of Object.keys(NEW_TECHS)) if (!TECH_IDS.includes(k)) TECH_IDS.push(k);
var _durMax0 = durMax;
durMax = function (s, p) { return Math.round(_durMax0(s, p) * (hasTech(s, p.owner, "glacis") ? 1.25 : 1)); };

// ---------- měsíční účinky nových zákonů a vynálezů ----------
function lawTechTick(s) {
  for (const C of aliveClans(s)) {
    if (C.type === "kmen") continue;
    const ps = clanProvs(s, C.id); if (!ps.length) continue;
    const zup = sum(ps.map(p => provDeben(s, p))), L = k => lw(s, C.id, k), T = k => hasTech(s, C.id, k);
    C.deben += zup * [-0.03, 0, 0.06][L("dobytek")] + (T("ucetnictvi") ? zup * 0.04 : 0);
    if (L("voda") === 2) C.deben -= 30 * ps.length;
    const soldiers = sum(ps.map(p => men(p.troops)));
    if (L("vojaci") > 0) { const tr_ = L("vojaci") === 2 ? 1 : 0.5; for (const p of ps) p.train = Math.min(80, p.train + tr_); C.grain = Math.max(0, C.grain - soldiers * (L("vojaci") === 2 ? 0.1 : 0.05)); }
    if (L("obetiny") === 0) { C.deben += 100; C.maat = Math.max(0, C.maat - 0.05); }
    if (L("obetiny") === 2) { C.deben -= 250; C.maat = Math.min(100, C.maat + 0.1); if (C.estates) C.estates.knezi = Math.min(100, C.estates.knezi + 0.1); }
    if (L("zeny") === 1 && C.estates) C.estates.lid = Math.min(100, C.estates.lid + 0.03);
    if (T("rybari")) C.grain += Math.round(sum(ps.filter(p => TERRAIN[p.ter].nile).map(p => p.pop)) * 12);
    if (T("zlato")) C.deben += 150 * ps.filter(p => ["n_wawat", "n_buhen", "ham"].includes(p.id)).length;
    if (T("plachty") && typeof routeIncome === "function") C.deben += routeIncome(s, C.id) * 0.08 * (L("ceny") === 2 ? 0.95 : 1);
    if (s.month === 0) for (const p of ps) {
      if (L("voda") === 2 && TERRAIN[p.ter].nile) p.agri = Math.min(agriCap(s, p), p.agri + 1);
      if (T("hrncir")) p.com = Math.min(comCap(s, p), p.com + 1);
      if (T("studny") && (p.ter === "oaza" || p.ter === "poust")) { p.pop = r1(p.pop * 1.03); p.loy = Math.min(100, p.loy + 3); }
    }
    if (s.month === FLOOD_MONTH + 1 && T("mery") && s.flood.h >= 18) for (const p of ps) if (TERRAIN[p.ter].nile) p.agri = Math.min(agriCap(s, p), p.agri + 2);
  }
}

// ---------- náhoda: znamení roku ----------
// Kněží „hodí hůlkami“ – ve hře čtyři vrhací hůlky jako v senetu (1–5). Kalendáře šťastných a nešťastných dnů
// se dochovaly až z Nové říše; víra ve znamení je ale doložena po celé dějiny.
function omenRoll(s) { const sticks = []; for (let i = 0; i < 4; i++) sticks.push(chance(s, 0.5) ? 1 : 0); const v = sum(sticks) || 5; return { v, sticks }; }
const OMEN = { 1: ["Zlé znamení", "bad"], 2: ["Nejisté znamení", "bad"], 3: ["Vyrovnaný rok", "mid"], 4: ["Příznivé znamení", "good"], 5: ["Velmi příznivé znamení", "good"] };
EVENTS.znameni = { view: (s, d) => { const C = P(s), O = OMEN[d.v], cost = 800;
  const apply = sign => { for (const p of clanProvs(s, s.player)) p.loy = clamp(p.loy + sign * 3, 0, 100); C.maat = clamp(C.maat + sign * 2, 0, 100); };
  if (O[1] === "good") return { t: `Nový rok: ${O[0]}`, tx: `Na Nový rok vykládají kněží znamení – vrhací hůlky padly ${d.v === 5 ? "všechny tmavou stranou, což se počítá jako pět" : d.v + "× světlou stranou"}. Lid věří, že bohové budou letos štědří.`, omen: d,
    ch: [{ t: "Oznámit to lidu při slavnosti", d: "spokojenost nomů +3, maat +2", f: () => { apply(1); s.omen = d.v; return null; } }] };
  if (O[1] === "mid") return { t: `Nový rok: ${O[0]}`, tx: `Hůlky padly třikrát světlou stranou. Kněží neočekávají ani hojnost, ani pohromu.`, omen: d, ch: [{ t: "Dobře", f: () => { s.omen = 3; return null; } }] };
  return { t: `Nový rok: ${O[0]}`, tx: `Hůlky padly ${d.v}× světlou stranou. Kněží se mračí: rok prý nebude příznivý. Lid je neklidný.`, omen: d,
    ch: [{ t: `Odvrátit zlo obětinami (${fmtN(cost)} debenů)`, d: "kněží +3, znamení se nenaplní", f: () => { if (!pay(s, s.player, cost)) return "Nedostatek debenů."; C.estates.knezi = Math.min(100, C.estates.knezi + 3); s.omen = 3; return "Obětiny byly přineseny."; } },
      { t: "Nedbat na to", d: "spokojenost nomů −3, maat −2, víc nehod během roku", f: () => { apply(-1); s.omen = d.v; return null; } }] };
} };

// ---------- narození v rodu ----------
EVENTS.narozeni = { view: (s, d) => { const C = P(s), L = leaderOf(s, s.player), W = chr(s, L && L.spouse);
  const born = (risk, extra) => () => { if (!L || !W) return null; const sx = chance(s, 0.5) ? "m" : "f", n = sx === "m" ? pick(s, SON_NAMES[C.cul] || SON_NAMES.eg) : genName(s, C.cul, "f").split(",")[0];
    if (chance(s, risk)) return `Dítě se narodilo mrtvé. Dvůr truchlí.`;
    const k = makeChar(s, { n, sex: sx, by: s.bce, cl: s.player, st: "kid", loc: C.capital, dyn: 1, father: L.id, ved: rint(s, 25, 60), uda: rint(s, 25, 60), roz: rint(s, 25, 60), spr: rint(s, 25, 60) });
    L.kids.push(k.id); if (W) W.kids = W.kids || [], W.kids.push(k.id); if (extra) extra(k);
    return `${W.n.split(",")[0]} porodila ${sx === "m" ? "syna" : "dceru"} jménem ${n}.`; };
  return { t: "Narození v paláci", tx: `${W ? W.n.split(",")[0] : "Královna"} čeká dítě. Rodička usedala na porodní cihly; jedna taková malovaná cihla z doby kolem roku 1750 př. n. l. se našla v Abydu. Domácnosti chránily amulety trpasličího boha Bese a hroší bohyně Taveret.`,
    ch: [{ t: "Porodní cihly, amulety Bese a Taveret, zkušené porodní báby (300 debenů)", d: "menší riziko, kněží +2", f: () => { if (!pay(s, s.player, 300)) return "Nedostatek debenů."; C.estates.knezi = Math.min(100, C.estates.knezi + 2); return born(0.08)(); } },
      { t: "Svěřit porod kněžkám Hathor a Meschenet", d: "dítě dostane požehnání (+5 ke schopnostem), stojí 600 debenů", f: () => { if (!pay(s, s.player, 600)) return "Nedostatek debenů."; return born(0.1, k => { for (const st_ of STAT_IDS) k[st_] = Math.min(96, k[st_] + 5); })(); } },
      { t: "Nechat vše na ženách z domácnosti", d: "zdarma, riziko vyšší", f: () => born(0.2)() }] }; } };

// ---------- výchova dědice ----------
EVENTS.vychova = { view: (s, d) => { const h = chr(s, d.cid); if (!h) return { t: "Výchova", tx: "", ch: [{ t: "Dále", f: () => null }] };
  const set = (k, v, txt) => () => { h.edu = k; for (const [st_, x] of Object.entries(v)) h[st_] = Math.min(96, (h[st_] || 40) + x); return `${h.n}: ${txt}`; };
  return { t: `Výchova dědice ${h.n.split(",")[0]}`, tx: `${h.n} je ${age(s, h)} let a je čas rozhodnout o jeho výchově. Synové panovníků i hodnostářů vyrůstali v královské „školce“ kap, učili se v domě života nebo sloužili u vojska.`,
    ch: [{ t: "Do kapu s dětmi hodnostářů", d: "správa +8, úskočnost +4; přátelé z dětství u dvora", f: () => { set("kap", { spr: 8, uda: 4 }, "vyrůstá v kapu")(); for (const c of officers(s, s.player).filter(c => !c.dyn)) c.loy = Math.min(100, c.loy + 2); return `${h.n} vyrůstá v kapu s dětmi hodnostářů.`; } },
      { t: "K vojsku pod velitele posádky", d: "velení +10, odvaha", f: set("vojsko", { ved: 10, uda: 3 }, "se učí válečnému řemeslu") },
      { t: "Do domu života k písařům a kněžím", d: "rozum +10", f: set("pisar", { roz: 10, spr: 3 }, "se učí písmu, počtům a obřadům") }] }; } };

// ---------- další události ----------
const EV7 = {
  chamsin: { view: (s, d) => { const C = P(s), p = s.provs[d.pid];
    return { t: "Písečná bouře", tx: `Z pouště se přihnal horký vítr plný písku. Zasypal kanály a pole v nomu ${p.n}, lidé se schovali v domech a dobytek se splašil.`,
      ch: [{ t: "Poslat robotníky čistit kanály (400 debenů)", d: "pole se nezmenší", f: () => { if (!pay(s, s.player, 400)) { p.agri = Math.max(10, p.agri - 3); return "Nedostatek debenů – pole utrpěla."; } return "Kanály byly vyčištěny."; } },
        { t: "Nechat to na obcích", d: "pole −3, spokojenost −3", f: () => { p.agri = Math.max(10, p.agri - 3); p.loy = Math.max(0, p.loy - 3); return null; } }] }; } },
  uprchlici: { view: (s, d) => { const C = P(s), n = rint(s, 20, 60);
    return { t: "Útěk z roboty", tx: `Z robotních prací uteklo asi ${n} lidí. Papyrus z Brooklynu (13. dynastie) obsahuje právě takový seznam uprchlíků z roboty – a tresty pro jejich rodiny, které úřad zadržoval místo nich.`,
      ch: [{ t: "Zadržet jejich rodiny ve Velkém vězení", d: "robota pokračuje, lid −5, maat −1", f: () => { C.estates.lid = Math.max(0, C.estates.lid - 5); C.maat = Math.max(0, C.maat - 1); return null; } },
        { t: "Vyslat písaře a policii, ať je najdou (300 debenů)", d: "pisaři +2", f: () => { if (!pay(s, s.player, 300)) return "Nedostatek debenů."; C.estates.pisari = Math.min(100, C.estates.pisari + 2); return chance(s, 0.6) ? "Většina uprchlíků byla nalezena." : "Uprchlíci zmizeli v poušti."; } },
        { t: "Prominout jim a zmírnit robotu", d: "lid +6, stavby se letos zpomalí", f: () => { C.estates.lid = Math.min(100, C.estates.lid + 6); for (const p of clanProvs(s, s.player)) if (p.build) p.build.left++; return null; } }] }; } },
  lodni: { view: (s, d) => { const C = P(s), g = Math.min(C.grain, rint(s, 4000, 12000));
    return { t: "Ztroskotaný náklad", tx: `Nákladní loď s ${fmtN(g)} chary obilí z daní najela na mělčinu a převrhla se. Lodníci se zachránili, obilí nasáklo vodou.`,
      ch: [{ t: "Zachránit, co se dá (200 debenů)", d: "zachráníš asi polovinu", f: () => { if (!pay(s, s.player, 200)) { C.grain -= g; return "Nedostatek debenů – obilí je ztraceno."; } C.grain -= Math.round(g / 2); return "Polovinu obilí se podařilo vysušit."; } },
        { t: "Potrestat kormidelníka", d: "obilí ztraceno, písaři +2", f: () => { C.grain -= g; C.estates.pisari = Math.min(100, C.estates.pisari + 2); return null; } }] }; } },
  zlaty_nalez: { view: (s, d) => { const C = P(s), p = s.provs[d.pid], v = rint(s, 3, 8) * 1000;
    return { t: "Nová zlatá žíla", tx: `Horníci v nomu ${p.n} narazili na novou křemennou žílu se zlatem. Odhad písařů: asi ${fmtN(v)} debenů, pokud se do ní hned pustí.`,
      ch: [{ t: "Poslat robotníky a stráže (1 000 debenů)", d: `zisk asi ${fmtN(v)} debenů`, f: () => { if (!pay(s, s.player, 1000)) return "Nedostatek debenů."; const got = Math.round(v * rrange(s, 0.5, 1.3)); C.deben += got; return `Žíla vynesla ${fmtN(got)} debenů.`; } },
        { t: "Přenechat ji chrámu", d: "kněží +6, maat +1", f: () => { C.estates.knezi = Math.min(100, C.estates.knezi + 6); C.maat = Math.min(100, C.maat + 1); return null; } }] }; } },
  mlady_vojak: { view: (s, d) => { const C = P(s);
    return { t: "Statečný voják", tx: `Velitelé chválí mladého vojáka ${d.n}, který při cvičení i v potyčkách vyniká. Ahmose, syn Ebany, se podobně vypracoval od prostého vojáka na lodi až po „velitele posádky lodí“.`,
      ch: [{ t: "Povýšit ho a svěřit mu oddíl", d: "nový úředník se schopností velet", f: () => { const c = genOfficer(s, s.player, C.cul, C.capital, { n: d.n, by: s.bce + rint(s, 20, 26), rank: 1, loy: 85 }); c.ved = Math.max(c.ved, rint(s, 66, 82)); c.traits = ["stateny"]; return `${c.n} se stal velitelem.`; } },
        { t: "Odměnit ho „zlatem chrabrosti“ (200 debenů)", d: "sláva +3, vojáci věrnější", f: () => { if (!pay(s, s.player, 200)) return "Nedostatek debenů."; C.prestige += 3; for (const p of clanProvs(s, s.player)) p.train = Math.min(80, p.train + 2); return null; } }] }; } },
  paviani: { view: (s, d) => { const C = P(s);
    return { t: "Paviáni z jihu", tx: `Výprava přivezla posvátné paviány, zvířata boha Thovta, která podle egyptských představ zdraví vycházející slunce. Paviány přiváželi z jihu a z Puntu.`,
      ch: [{ t: "Darovat je Thovtovu chrámu", d: "kněží +4, písaři +2", f: () => { C.estates.knezi = Math.min(100, C.estates.knezi + 4); C.estates.pisari = Math.min(100, C.estates.pisari + 2); return null; } },
        { t: "Ponechat je v palácové zahradě (300 debenů)", d: "sláva +6", f: () => { if (!pay(s, s.player, 300)) return "Nedostatek debenů."; C.prestige += 6; return null; } }] }; } },
};
Object.assign(EVENTS, EV7);
function moreEventOpts4(s) {
  const C = P(s), o = []; if (!C || C.type === "kmen") return o;
  const dp = someOwnProv(s, p => TERRAIN[p.ter].nile && p.agri > 20); if (dp && s.month >= 6 && s.month <= 10) o.push(["chamsin", { pid: dp.id }]);
  o.push(["uprchlici", {}]); if (C.grain > 15000) { o.push(["lodni", {}]); if ((s.omen || 3) <= 2) o.push(["lodni", {}]); }
  const gp = someOwnProv(s, p => p.res.includes("zlato")); if (gp) o.push(["zlaty_nalez", { pid: gp.id }]);
  o.push(["mlady_vojak", { n: genName(s, C.cul === "hyk" ? "hyk" : "eg", "m") }]);
  if (clanProvs(s, s.player).some(p => p.id === "u15" || p.id === "u1" || p.id === "sau")) o.push(["paviani", {}]);
  if ((s.omen || 3) >= 4 && gp) o.push(["zlaty_nalez", { pid: gp.id }]);
  return o;
}
var _moreEventOpts1 = moreEventOpts;
moreEventOpts = function (s) { return _moreEventOpts1(s).concat(moreEventOpts4(s)); };

// ---------- královská objížďka nomů ----------
function royalTour(s, cid) {
  const C = s.clans[cid], L = leaderOf(s, cid); if (!L || L.st !== "off") return "Panovník nemůže cestovat.";
  if ((C.last.tour ?? -99) > s.turn - 12) return `Objížďka je možná jednou za rok (ještě ${C.last.tour + 12 - s.turn} měs.).`;
  if (L.army) return "Panovník velí vojsku.";
  const ps = clanProvs(s, cid).filter(p => p.id !== C.capital).sort((a, b) => a.loy - b.loy).slice(0, 5); if (!ps.length) return "Není kam jet.";
  const cd = 250 * ps.length, cg = 1500 * ps.length; if (!pay(s, cid, cd, cg)) return `Objížďka stojí ${fmtN(cd)} debenů a ${fmtN(cg)} charů.`;
  C.last.tour = s.turn; const notes = [];
  for (const p of ps) { p.loy = Math.min(100, p.loy + 8); for (const c of officersIn(s, p.id)) c.loy = Math.min(100, c.loy + 4); }
  const r = rnd(s);
  if (r < 0.15) { C.maat = Math.min(100, C.maat + 3); notes.push("Na cestě panovník rozsoudil spor podle maat – lid o tom zpívá."); }
  else if (r < 0.28) { const c = pick(s, officers(s, cid).filter(c => !c.dyn) || []); if (c) { c.loy = Math.max(0, c.loy - 10); C.deben += 800; notes.push(`Při kontrole sýpek se zjistilo, že ${c.n} kradl; zabavilo se 800 debenů.`); } }
  else if (r < 0.36) { L.wound = 2; notes.push("Panovník na cestě onemocněl horečkou."); }
  else if (r < 0.5) { C.prestige += 10; notes.push("Nomarchové panovníka přivítali s velkou slávou."); }
  log(s, `Královská objížďka: ${ps.map(p => p.n).join(", ")}. Spokojenost nomů +8.${notes.length ? " " + notes.join(" ") : ""}`, "rozkazy", [cid]);
  return null;
}

// ---------- měsíční náhoda ----------
function randomTick(s) {
  const C = P(s); if (!C || !C.alive || C.type === "kmen") return;
  if (s.month === 0 && s.turn > 0 && !s.events.some(e => e.k === "znameni")) queueEvent(s, "znameni", omenRoll(s));
  if (s.month === 6) { const L = leaderOf(s, s.player), W = L && chr(s, L.spouse); if (W && W.st !== "dead" && age(s, W) >= 16 && age(s, W) <= 40 && chance(s, 0.35)) queueEvent(s, "narozeni", {}); }
  if (s.month % 3 === 1) { const h = heirsOf(s, s.player).find(c => c.sex === "m" && !c.edu && age(s, c) >= 8 && age(s, c) <= 14); if (h && !s.events.some(e => e.k === "vychova")) queueEvent(s, "vychova", { cid: h.id }); }
  // nepříznivý rok: o něco víc nehod
  if ((s.omen || 3) <= 2 && chance(s, 0.04)) { const p = someOwnProv(s, q => q.pop > 5); if (p) { p.loy = Math.max(0, p.loy - 4); log(s, `Zlé znamení se naplňuje: v nomu ${p.n} vyhořela sýpka.`, "udalosti", [s.player]); p.stock = Math.round(p.stock * 0.8); } }
}
var _worldTick0 = worldTick;
worldTick = function (s) { _worldTick0(s); lawTechTick(s); randomTick(s); };
