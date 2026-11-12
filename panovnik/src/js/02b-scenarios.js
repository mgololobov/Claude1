// Scénáře: 1256 (interregnum), 1260 (před bitvou u Kressenbrunnu), 1273 (před volbou Rudolfa Habsburského).
// Data o osobách jsou historická v rozsahu běžných přehledů; roky narození přibližné, schopnosti herní.
const SCENARIOS = {
  1256: { n: "Leden 1256 – Interregnum", year: 1256, month: 0, d: "Po smrti Fridricha II. se říše rozpadá. Vládne vzdorokrál Vilém Holandský, Přemysl Otakar II. drží Čechy a Rakousy, Uhři Štýrsko." },
  1260: { n: "Leden 1260 – Boj o Štýrsko", year: 1260, month: 0, d: "Štýrská šlechta se bouří proti Uhrům a volá Přemysla Otakara II. Válka mezi Čechami a Uhrami je na spadnutí. Římským králem je Richard Cornwallský.",
    dead: ["Přemysl I. Velkopolský", "Menhard Gorický", "Poppo z Osternohe"],
    add: [{ n: "Anno ze Sangerhausenu", cl: "rad", by: 1205, r: "leader", s: [62, 60, 66, 64], t: ["zbozny"], c: 1 }, { n: "Přemysl II. Velkopolský", cl: "velkopolsko", by: 1257, r: "kid", sex: "m" }],
    leaders: { velkopolsko: "Boleslav Pobožný", gorice: "Menhard Mladší" }, move: [["Jolanta Uherská", "velkopolsko", "Boleslav Pobožný"]],
    wars: [["premysl", "arpad"]], noTruce: [["premysl", "arpad"]], hre: { king: "ext:Richard Cornwallský", dies: 147 } },
  1273: { n: "Leden 1273 – Zlatý král", year: 1273, month: 0, d: "Přemysl Otakar II. je na vrcholu moci: vládne od Krkonoš po Jaderské moře. Říše je bez krále – v říjnu se sejdou kurfiřti. Uherským králem je desetiletý Ladislav IV.",
    dead: ["Markéta Babenberská", "Vok z Rožmberka", "Smil z Lichtenburka", "Béla IV.", "Marie Laskarisová", "Štěpán", "Roland z rodu Rátót", "Konradin Štaufský", "Konrád Norimberský", "Iring z Reinstein-Homburgu", "Filip Sponheimský", "Ota z Lonsdorfu", "Oldřich III. Korutanský", "Anežka z Andechsu", "Menhard Gorický", "Jan I. Braniborský", "Ota III. Braniborský", "Albrecht I. Saský", "Rudolf z Dingelstedtu", "Svatopluk II. Pomořanský", "Poppo z Osternohe", "Přemysl I. Velkopolský", "Kazimír I. Kujavský", "Siemowit I. Mazovský", "Jindřich III. Bílý", "Daniel Romanovič", "Roman Danilovič", "Gertruda Babenberská", "Oldřich I. Württemberský"],
    add: [
      { n: "Kunhuta Haličská", cl: "premysl", by: 1245, r: "fam", sex: "f", sp: "Přemysl Otakar II." },
      { n: "Kunhuta Přemyslovna", cl: "premysl", by: 1265, r: "kid", sex: "f", father: "Přemysl Otakar II." },
      { n: "Anežka Přemyslovna", cl: "premysl", by: 1269, r: "kid", sex: "f", father: "Přemysl Otakar II." },
      { n: "Václav", cl: "premysl", by: 1271, r: "kid", sex: "m", father: "Přemysl Otakar II." },
      { n: "Ladislav IV. Kumánský", cl: "arpad", by: 1262, r: "leader", s: [55, 62, 48, 35], t: ["prchlivy"] },
      { n: "Alžběta Kumánská", cl: "arpad", by: 1240, r: "fam", sex: "f" },
      { n: "Ondřej Uherský", cl: "arpad", by: 1268, r: "kid", sex: "m" },
      { n: "Hartmann Habsburský", cl: "habsburg", by: 1263, r: "kid", sex: "m", father: "Rudolf Habsburský" },
      { n: "Rudolf Habsburský mladší", cl: "habsburg", by: 1270, r: "kid", sex: "m", father: "Rudolf Habsburský" },
      { n: "Fridrich III. Norimberský", cl: "norimberk", by: 1220, r: "leader", s: [62, 55, 70, 66], t: ["lstivy"] },
      { n: "Oldřich II. Württemberský", cl: "wurttemberg", by: 1254, r: "leader", s: [50, 55, 48, 50], t: [] },
      { n: "Fridrich z Walchenu", cl: "salcburk", by: 1220, r: "leader", s: [52, 40, 68, 64], t: ["moudry"], c: 1 },
      { n: "Konrád ze Sternbergu", cl: "magdeburg", by: 1220, r: "leader", s: [48, 42, 62, 60], t: [], c: 1 },
      { n: "Ota IV. se šípem", cl: "brandenburg", by: 1238, r: "leader", s: [72, 76, 60, 58], t: ["stateny"] },
      { n: "Konrád Braniborský", cl: "brandenburg", by: 1240, r: "off", dyn: 1, s: [58, 62, 52, 54], t: [], rank: 3 },
      { n: "Albrecht II. Saský", cl: "sasko", by: 1250, r: "off", dyn: 1, s: [56, 58, 55, 52], t: [], rank: 3 },
      { n: "Anno ze Sangerhausenu", cl: "rad", by: 1205, r: "leader", s: [62, 60, 66, 64], t: ["zbozny"], c: 1 },
      { n: "Přemysl II. Velkopolský", cl: "velkopolsko", by: 1257, r: "off", dyn: 1, s: [52, 55, 62, 58], t: ["ctizadostivy"], rank: 3 },
      { n: "Ziemomysł Kujavský", cl: "kujavsko", by: 1245, r: "off", dyn: 1, s: [50, 52, 50, 55], t: [], rank: 3 },
      { n: "Vladislav Lokýtek", cl: "kujavsko", by: 1260, r: "kid", sex: "m" },
      { n: "Boleslav II. Mazovský", cl: "mazovsko", by: 1253, r: "off", dyn: 1, s: [58, 60, 50, 52], t: [], rank: 3 },
      { n: "Jindřich IV. Probus", cl: "vratislav", by: 1258, r: "leader", s: [60, 62, 70, 66], t: ["ctizadostivy"] },
      { n: "Jiří Lvovič", cl: "halic", by: 1252, r: "off", dyn: 1, s: [55, 58, 52, 50], t: [], rank: 3 },
    ],
    leaders: { arpad: "Ladislav IV. Kumánský", gorice: "Menhard Mladší", brandenburg: "Ota IV. se šípem", sasko: "Jan Saský", pomori: "Mestvin Pomořanský", velkopolsko: "Boleslav Pobožný", kujavsko: "Lešek Černý", mazovsko: "Konrád Mazovský", vratislav: "Jindřich IV. Probus", halic: "Lev Danilovič", norimberk: "Fridrich III. Norimberský", wurttemberg: "Oldřich II. Württemberský", salcburk: "Fridrich z Walchenu", magdeburg: "Konrád ze Sternbergu", rad: "Anno ze Sangerhausenu" },
    move: [["Jolanta Uherská", "velkopolsko", "Boleslav Pobožný"]],
    owners: { stajhradec: "premysl", leoben: "premysl", ptuj: "premysl", korutany: "premysl", kransko: "premysl" }, gone: ["sponheim"],
    electChurch: ["wurzburg", "pasov"], hre: { king: null, election: 9 }, pope: "Řehoř X.", marry: [["premysl", "arpad"]],
    rel: [["premysl", "habsburg", -20], ["premysl", "arpad", -30], ["premysl", "wittL", -10]] },
};

function applyScenario(s, id) {
  const Sc = SCENARIOS[id]; if (!Sc || id == 1256) return;
  const byName = n => Object.values(s.chars).find(c => c.n === n);
  for (const n of Sc.dead || []) { const c = byName(n); if (c) { c.st = "dead"; c.died = "před r. " + Sc.year; for (const p of Object.values(s.provs)) if (p.lord === c.id) p.lord = null; if (c.spouse && s.chars[c.spouse]) s.chars[c.spouse].spouse = null; } }
  for (const [cid, to] of Object.entries(Sc.owners || {})) s.provs[cid].owner = to;
  for (const g of Sc.gone || []) { const C = s.clans[g]; C.alive = false; for (const c of Object.values(s.chars)) if (c.cl === g && c.st === "off") { const to = Sc.owners && Object.values(Sc.owners)[0]; if (to) { c.cl = to; c.loc = s.clans[to].capital; } else c.st = "wand"; } }
  for (const h of Sc.add || []) {
    const C = s.clans[h.cl], st_ = h.r === "leader" || h.r === "off" ? "off" : h.r;
    const c = makeChar(s, { n: h.n, sex: h.sex || "m", by: h.by, cl: h.cl, st: st_, loc: C.capital, c: h.c || 0, dyn: h.r !== "off" || h.dyn ? 1 : 0, rank: h.rank != null ? h.rank : h.r === "leader" ? 4 : 0, traits: (h.t || []).slice(), loy: 90, hist: 1 });
    if (h.s) [c.ved, c.uda, c.roz, c.spr] = h.s; else for (const k of STAT_IDS) c[k] = rint(s, 20, 55);
    c.merit = RANKS[c.rank].merit + 30;
    if (h.sp) { const x = byName(h.sp); if (x) { c.spouse = x.id; x.spouse = c.id; } }
    if (h.father) { const x = byName(h.father); if (x) { c.father = x.id; x.kids.push(c.id); } }
  }
  for (const [who, cl, husband] of Sc.move || []) { const c = byName(who), h = byName(husband); if (c && h && c.st !== "dead") { c.origin = c.cl; c.cl = cl; c.loc = s.clans[cl].capital; c.spouse = h.id; h.spouse = c.id; s.marriages[pairKey(cl, c.origin)] = true; } }
  for (const [cl, n] of Object.entries(Sc.leaders || {})) { const c = byName(n); if (c) { s.clans[cl].leader = c.id; c.st = "off"; c.rank = 4; c.loy = 100; c.dyn = 1; c.loc = s.clans[cl].capital; } }
  for (const cl of Sc.electChurch || []) { const old = leaderOf(s, cl); if (old) { old.st = "dead"; } heirSucceeds(s, cl, "zemřel"); }
  // dospělí synové vstupují do služby, dědictví postav po zemřelých vládcích
  for (const c of Object.values(s.chars)) if (c.st === "kid" && age(s, c) >= 15) { if (c.sex === "m" && !c.c) { c.st = "off"; c.rank = 2; if (!c.ved || c.ved < 5) for (const k of STAT_IDS) c[k] = rint(s, 30, 70); } else c.st = "fam"; }
  for (const C of Object.values(s.clans)) { if (!C.alive) continue; const L = chr(s, C.leader); if (!L || L.st === "dead") heirSucceeds(s, C.id, "zemřel"); C.capital = C.capital && s.provs[C.capital].owner === C.id ? C.capital : (clanProvs(s, C.id)[0] || {}).id; assignLords(s, C.id); }
  for (const [a, b] of Sc.noTruce || []) delete s.truces[pairKey(a, b)];
  for (const [a, b] of Sc.wars || []) { s.wars.push({ a, b, start: 0 }); addRel(s, a, b, -30); }
  for (const [a, b] of Sc.marry || []) s.marriages[pairKey(a, b)] = true;
  for (const [a, b, v] of Sc.rel || []) { s.clans[a].rel[b] = v; s.clans[b].rel[a] = v; }
  if (Sc.hre) { s.hre.king = Sc.hre.king; s.hre.kingDies = Sc.hre.dies || 0; s.hre.election = Sc.hre.election || null; }
  if (Sc.pope) s.pope.n = Sc.pope;
  // tituly, kraje a síla odpovídající době
  if (id == 1273) { s.clans.premysl.prestige += 250; s.clans.premysl.gold += 1500; for (const pid of ["stajhradec", "leoben", "ptuj", "korutany", "kransko"]) { const p = s.provs[pid]; p.deleg = true; p.loy = 55; } s.clans.premysl.titles = ["Čechy"]; }
  s.log = []; s.flags.scen = id;
}
function scenarioClans(id) {
  const s = newGame({ seed: 1, scen: id, clan: "premysl", quiet: true });
  return CLANS.filter(c => s.clans[c.id].alive && s.clans[c.id].type === "dyn").map(c => ({ id: c.id, n: c.n, house: c.house, provs: clanProvs(s, c.id).length, leader: leaderOf(s, c.id) ? leaderOf(s, c.id).n : "" }));
}
