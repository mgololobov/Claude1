// Objevy II, výpravy do dalekých krajů, pokladnice vzácností a dvorní učenci.

Object.assign(TECHS, {
  rybnikarstvi: { n: "Rybníkářství", cat: "Zemědělství", cost: 110, req: ["vodni_kolo"], d: "+1 zl z každého kraje v nížině nebo v bažinách, sklizeň +5 %" },
  vetrny_mlyn: { n: "Větrný mlýn", cat: "Zemědělství", cost: 120, req: ["vodni_kolo"], year: 1270, d: "sklizeň +5 %" },
  chmelnice: { n: "Pivovarnictví a chmelnice", cat: "Zemědělství", cost: 100, req: ["trojpole"], d: "kraje s městem dávají o 5 % víc zlata, lid +2 spokojenosti" },
  papir: { n: "Papírna", cat: "Řemesla", cost: 130, req: ["cechy"], year: 1290, d: "+1 bod učenosti měsíčně, levnější kancelář (body diplomacie +1)" },
  sklo: { n: "Sklářství", cat: "Řemesla", cost: 120, req: ["gotika"], d: "kraje v horách a lesích +5 % zlata, prestiž +0,1 měsíčně" },
  soustredne: { n: "Soustředné opevnění", cat: "Řemesla", cost: 150, req: ["gotika", "trebuchet"], d: "hradby mají o 50 bodů víc" },
  smenka: { n: "Směnka a banka", cat: "Správa", cost: 120, req: ["ucetnictvi"], d: "obchodní cesty vynášejí o 15 % víc" },
  urbar: { n: "Urbáře a soupis půdy", cat: "Správa", cost: 130, req: ["zakonik", "ucetnictvi"], d: "zlato z krajů +5 %, body správy +1" },
  kuryri: { n: "Kurýrní služba", cat: "Správa", cost: 100, req: ["zakonik"], d: "body diplomacie +1, vazalové +2 věrnosti" },
  astronomie: { n: "Astronomie a kalendář", cat: "Učenost", cost: 140, req: ["univerzita"], d: "+1 bod učenosti měsíčně, výpravy se méně ztrácejí" },
  alchymie: { n: "Alchymie", cat: "Učenost", cost: 130, req: ["univerzita"], d: "doly +15 %, otevírá cestu ke střelnému prachu" },
  kartografie: { n: "Kartografie", cat: "Učenost", cost: 120, req: ["astronomie"], d: "výpravy o čtvrtinu kratší a bezpečnější" },
  karantena: { n: "Karanténní řád", cat: "Učenost", cost: 120, req: ["medicina"], d: "mor se šíří o polovinu méně" },
  paveza: { n: "Pavézy a pavézníci", cat: "Válečnictví", cost: 100, req: ["kuse"], d: "síla v poli +5 %, hlavně v obraně" },
  destrier: { n: "Chov destriérů", cat: "Válečnictví", cost: 140, req: ["zbroj"], d: "síla v poli +5 %" },
  prach: { n: "Střelný prach", cat: "Válečnictví", cost: 200, req: ["alchymie", "trebuchet"], year: 1330, d: "obléhání ničí hradby o 60 % rychleji" },
});
TECH_IDS.splice(0, TECH_IDS.length, ...Object.keys(TECHS));
const techYearOk = (s, t) => !TECHS[t].year || s.year >= TECHS[t].year;

// ---------- efekty (napojené do výpočtů v jádru) ----------
const T_ = (s, cid, t) => hasTechSafe(s, cid, t);
function techGoldMult(s, p) {
  let m = 1; const o = p.owner;
  if (T_(s, o, "urbar")) m += 0.05;
  if (T_(s, o, "chmelnice") && (p.city || p.b.mesto)) m += 0.05;
  if (T_(s, o, "sklo") && (p.ter === "h" || p.ter === "l")) m += 0.05;
  return m * realmGoldMult(s, p);
}
function techGoldFlat(s, p) { return realmGoldFlat(s, p) + ( T_(s, p.owner, "rybnikarstvi") && (p.ter === "n" || p.ter === "b") ? 1 : 0); }
function techHarvestMult(s, p) { return realmHarvestMult(s, p) * (1 + (T_(s, p.owner, "rybnikarstvi") ? 0.05 : 0) + (T_(s, p.owner, "vetrny_mlyn") ? 0.05 : 0)); }
function techBattleMult(s, side) { const c = side.cl; let m = 1; if (T_(s, c, "paveza")) m += side.def ? 0.08 : 0.03; if (T_(s, c, "destrier")) m += 0.05; const tr = (s.clans[c] && s.clans[c].trea) || []; if (tr.includes("luk")) m += 0.03; return m * realmBattleMult(s, side); }
function resBonus(s, C) {
  let b = 0; const tr = C.trea || [], ct = C.court || {};
  if (C.techs.papir) b += 1; if (C.techs.astronomie) b += 1;
  if (tr.includes("astrolab")) b += 1; if (tr.includes("rukopis")) b += 1.5; if (ct.astrolog) b += 1.2;
  return b;
}

// ---------- pokladnice vzácností ----------
const TREASURES = {
  ikona: { n: "Byzantská ikona", g: "ikona", d: "přízeň papeže +0,2 měsíčně" },
  astrolab: { n: "Arabský astroláb", g: "astrolab", d: "+1 bod učenosti měsíčně" },
  rukopis: { n: "Rukopis Aristotelových spisů", g: "kniha", d: "+1,5 bodu učenosti měsíčně" },
  sklo: { n: "Benátské sklo", g: "pohar", d: "prestiž +0,2 měsíčně" },
  hedvabi: { n: "Hedvábné roucho z Orientu", g: "latka", d: "prestiž +0,3 měsíčně" },
  luk: { n: "Mongolský reflexní luk", g: "luk", d: "síla v poli +3 %" },
  ostatky: { n: "Ostatky světce", g: "relikviar", d: "spokojenost v sídle +5, přízeň papeže +0,1 měsíčně" },
  mapa: { n: "Portolánová mapa", g: "mapa", d: "výpravy bezpečnější" },
  kosti: { n: "„Dračí“ kosti", g: "kost", d: "prestiž +0,2 měsíčně – lid žasne" },
  kozesiny: { n: "Sobolí kožešiny z Novgorodu", g: "kozesina", d: "vazalové +2 věrnosti" },
  koreni: { n: "Truhla koření", g: "truhla", d: "jednorázově +300 zl při získání" },
  hodiny: { n: "Mechanické hodiny", g: "hodiny", d: "body správy +1" },
};
function addTreasure(s, cid, k) {
  const C = s.clans[cid]; C.trea = C.trea || []; if (C.trea.includes(k)) { C.gold += 150; return `${TREASURES[k].n} už v pokladnici máš – prodáno za 150 zl.`; }
  C.trea.push(k); if (k === "koreni") C.gold += 300; return `Do pokladnice přibyla vzácnost: ${TREASURES[k].n} (${TREASURES[k].d}).`;
}
const hasTrea = (s, cid, k) => ((s.clans[cid] && s.clans[cid].trea) || []).includes(k);

// ---------- dvorní učenci ----------
const COURT = {
  lekar: { n: "Dvorní lékař", d: "nižší úmrtnost v rodu" },
  astrolog: { n: "Astrolog", d: "+1,2 bodu učenosti měsíčně, předpovídá úrodu" },
  alchymista: { n: "Alchymista", d: "občas vyrobí zlato… nebo vyhodí laboratoř do povětří" },
  kronikar: { n: "Kronikář", d: "prestiž +0,4 měsíčně" },
  stavitel: { n: "Stavitel z Paříže", d: "stavby o 10 % levnější" },
  kartograf: { n: "Kartograf", d: "výpravy kratší a bezpečnější" },
  pevec: { n: "Dvorní pěvec (minnesänger)", d: "vazalové +2 věrnosti" },
};
function addCourt(s, cid, k) { const C = s.clans[cid]; C.court = C.court || {}; if (C.court[k]) return `${COURT[k].n} už u dvora působí.`; C.court[k] = s.turn + 1; return `U dvora nově působí ${COURT[k].n.toLowerCase()}: ${COURT[k].d}.`; }
const hasCourt = (s, cid, k) => !!((s.clans[cid] && s.clans[cid].court) || {})[k];

// ---------- výpravy ----------
const DESTS = {
  benatky: { n: "Benátky", lon: 12.3, lat: 45.4, m: 4, cost: 150, risk: 0.06, ic: "lod", d: "Obchodní republika na lagunách. Sklo, koření, směnky.", loot: ["sklo", "koreni", "smenka", "stavitel", "gold"] },
  rim: { n: "Řím", lon: 12.5, lat: 41.9, m: 5, cost: 120, risk: 0.07, ic: "kostel", d: "Sídlo papeže a hroby apoštolů.", loot: ["ostatky", "papez", "rukopis", "kronikar"] },
  pariz: { n: "Paříž", lon: 2.35, lat: 48.86, m: 5, cost: 180, risk: 0.05, ic: "hrad", d: "Sorbonna, gotické katedrály a nejbohatší dvůr Evropy.", loot: ["rukopis", "stavitel", "pevec", "uceni", "astrolog"] },
  bologna: { n: "Bologna a Padova", lon: 11.34, lat: 44.49, m: 4, cost: 140, risk: 0.05, ic: "kniha", d: "Slavná učení práva a lékařství.", loot: ["lekar", "uceni", "rukopis", "zakonik"] },
  konstantinopol: { n: "Konstantinopol", lon: 28.97, lat: 41.0, m: 8, cost: 300, risk: 0.14, ic: "kostel", d: "Město císařů, ikon a starých knih.", loot: ["ikona", "hedvabi", "rukopis", "astrolab", "uceni"] },
  akkon: { n: "Akkon ve Svaté zemi", lon: 35.07, lat: 32.93, m: 10, cost: 350, risk: 0.2, until: 1291, ic: "stan", d: "Poslední baštu křižáků obléhají mamlúci.", loot: ["ostatky", "astrolab", "hedvabi", "koreni", "pres"] },
  novgorod: { n: "Novgorod", lon: 31.27, lat: 58.52, m: 7, cost: 220, risk: 0.12, ic: "lod", d: "Hanzovní dvůr sv. Petra, kožešiny a vosk.", loot: ["kozesiny", "gold", "hanza", "kartograf"] },
  sarai: { n: "Saraj u Zlaté hordy", lon: 47.9, lat: 47.9, m: 12, cost: 400, risk: 0.25, ic: "stan", d: "Dvůr chána. Nebezpečná cesta stepí – a mír s Tatary.", loot: ["luk", "hedvabi", "koreni", "tatari", "pres"] },
  santiago: { n: "Santiago de Compostela", lon: -8.54, lat: 42.88, m: 9, cost: 200, risk: 0.1, ic: "kostel", d: "Hrob sv. Jakuba na konci světa.", loot: ["ostatky", "papez", "pres", "kartograf"] },
  island: { n: "Bergen a severní moře", lon: 5.32, lat: 60.39, m: 9, cost: 250, risk: 0.16, ic: "lod", d: "Norské přístavy, treska a ságy o zemích za mořem.", loot: ["kosti", "kozesiny", "mapa", "kartograf", "gold"] },
};
const LOOT_N = { gold: "zlato", uceni: "poznatky", pres: "sláva", papez: "papežovo požehnání", hanza: "obchodní styky", tatari: "mír s Tatary", smenka: "znalost směnek", zakonik: "právní spisy" };
function expMonths(s, cid, d) { let m = DESTS[d].m; if (T_(s, cid, "kartografie")) m *= 0.75; if (hasCourt(s, cid, "kartograf")) m *= 0.85; if (T_(s, cid, "kompas")) m -= 1; return Math.max(2, Math.round(m)); }
function expRisk(s, cid, d, c) { let r = DESTS[d].risk; if (T_(s, cid, "astronomie")) r *= 0.85; if (T_(s, cid, "kartografie")) r *= 0.75; if (hasTrea(s, cid, "mapa")) r *= 0.7; if (hasCourt(s, cid, "kartograf")) r *= 0.8; if (T_(s, cid, "kompas")) r *= 0.85; if (c) r *= 1.3 - st(c, "roz") / 200 - st(c, "uda") / 400; return Math.max(0.02, r); }
function expCandidates(s, cid) { const C = s.clans[cid], offs = new Set(Object.values(C.offices || {})); return officers(s, cid).filter(c => c.id !== C.leader && !c.army && !offs.has(c.id) && age(s, c) >= 16); }
function startExpedition(s, cid, d, chid) {
  const C = s.clans[cid], D = DESTS[d], c = chr(s, chid); C.exps = C.exps || [];
  if (!D) return "Neznámý cíl."; if (D.until && s.year >= D.until) return "Tam už se nedá cestovat.";
  if (C.exps.some(e => e.d === d)) return "Na tuto cestu už výprava míří."; if (C.exps.length >= 2) return "Najednou mohou být na cestě nejvýš dvě výpravy.";
  if (!c || c.cl !== cid || c.st !== "off") return "Vyber vůdce výpravy."; const cost = C.freeExp ? 0 : D.cost; if (!pay(s, cid, cost)) return `Výprava stojí ${D.cost} zl.`; C.freeExp = 0;
  for (const p of Object.values(s.provs)) if (p.lord === c.id) p.lord = null;
  c.st = "exp"; const m = expMonths(s, cid, d); C.exps.push({ d, c: c.id, start: s.turn, back: s.turn + m, m });
  log(s, `${c.n} vyrazil s výpravou do: ${D.n} (návrat asi za ${m} měs.).`, "objevy", [cid]); return null;
}
function lootRoll(s, cid, d, c) {
  const D = DESTS[d], C = s.clans[cid], k = pick(s, D.loot), out = [];
  if (TREASURES[k]) out.push(addTreasure(s, cid, k));
  else if (COURT[k]) out.push(addCourt(s, cid, k));
  else if (TECHS[k] && !C.techs[k]) { C.techs[k] = true; out.push(`Výprava přinesla znalost: ${TECHS[k].n}!`); }
  else if (k === "uceni" || TECHS[k]) { const v = 40 + Math.round(st(c, "roz") / 2); C.res.pts += v; out.push(`Z cizích knih a rozhovorů s učenci: +${v} bodů učenosti.`); }
  else if (k === "papez") { s.pope.op[cid] = Math.min(100, (s.pope.op[cid] || 0) + 15); out.push("Papež výpravu přijal a požehnal tvému rodu (přízeň +15)."); }
  else if (k === "pres") { C.prestige += 40; out.push("Zprávy o odvážné cestě se šíří Evropou (prestiž +40)."); }
  else if (k === "hanza") { C.tradeBonus = (C.tradeBonus || 0) + 0.05; out.push("Kupci uzavřeli trvalé obchodní styky (obchodní cesty +5 %)."); }
  else if (k === "tatari") { C.tatarPeace = s.turn + 120; out.push("Chán přijal dary – tatarské nájezdy tvé kraje deset let minou."); }
  else { const g = Math.round(rint(s, 200, 500) * (T_(s, cid, "pojisteni") ? 1.3 : 1)); C.gold += g; out.push(`Výprava přivezla zboží v hodnotě ${g} zl.`); }
  if (chance(s, 0.35)) { const v = 20 + rint(s, 0, 30); C.res.pts += v; out.push(`Poznatky z cesty: +${v} bodů učenosti.`); }
  return out.join(" ");
}
function expeditionTick(s) {
  for (const C of aliveClans(s)) {
    if (!C.exps || !C.exps.length) continue;
    for (const e of C.exps.slice()) {
      const c = chr(s, e.c); if (s.turn < e.back) continue;
      C.exps = C.exps.filter(x => x !== e); const D = DESTS[e.d];
      if (!c || c.st === "dead") continue;
      if (chance(s, expRisk(s, C.id, e.d, c))) {
        if (chance(s, 0.5)) { kill(s, c, `zahynul na cestě do: ${D.n}`); if (isPlayer(s, C.id)) s.events.push({ id: "_exp", d: e.d, c: e.c, lost: 1, txt: `${c.n} se z cesty nevrátil. Poutníci vyprávějí, že zahynul na cestě do místa ${D.n}.` }); }
        else { c.st = "off"; c.hp = Math.max(20, c.hp - 20); if (isPlayer(s, C.id)) s.events.push({ id: "_exp", d: e.d, c: e.c, lost: 1, txt: `${c.n} se vrátil z cesty do místa ${D.n} oloupený, nemocný a s prázdnýma rukama.` }); }
        continue;
      }
      c.st = c.cl === C.id && C.alive ? "off" : "wand"; c.merit += 40; c.loy = Math.min(100, c.loy + 5); c.roz = Math.min(100, c.roz + 3);
      const txt = lootRoll(s, C.id, e.d, c);
      if (isPlayer(s, C.id)) s.events.push({ id: "_exp", d: e.d, c: e.c, txt: `${c.n} se vrátil z cesty do místa ${D.n}. ${txt}` });
      else if (C.t === "král") news(s, `Výprava rodu ${C.house} se vrátila z cesty do místa ${D.n}.`, "objevy");
    }
  }
}
function aiExpeditions(s) {
  if (s.month !== 3) return;
  for (const C of aliveClans(s)) { if (isPlayer(s, C.id) || C.gold < 900 || !chance(s, 0.12)) continue; const ds = Object.keys(DESTS).filter(d => !DESTS[d].until || s.year < DESTS[d].until), c = expCandidates(s, C.id)[0]; if (c) startExpedition(s, C.id, pick(s, ds), c.id); }
}

// ---------- měsíční efekty ----------
function discoverTick(s) {
  expeditionTick(s); aiExpeditions(s); histTick(s);
  for (const C of aliveClans(s)) {
    C.res.pts += resBonus(s, C);
    const tr = C.trea || [], ct = C.court || {};
    let pr = 0; if (tr.includes("sklo")) pr += 0.2; if (tr.includes("hedvabi")) pr += 0.3; if (tr.includes("kosti")) pr += 0.2; if (tr.includes("meteorit")) pr += 0.2; if (ct.kronikar) pr += 0.4; if (C.techs.sklo) pr += 0.1; C.prestige += pr;
    if (tr.includes("ikona")) s.pope.op[C.id] = Math.min(100, (s.pope.op[C.id] || 0) + 0.2);
    if (tr.includes("ostatky")) { s.pope.op[C.id] = Math.min(100, (s.pope.op[C.id] || 0) + 0.1); const p = s.provs[C.capital]; if (p && p.owner === C.id && s.month === 0) p.loy = Math.min(100, p.loy + 5); }
    if (ct.alchymista && isPlayer(s, C.id) && chance(s, 0.1)) {
      if (chance(s, 0.25)) { delete ct.alchymista; C.gold = Math.max(0, C.gold - 80); log(s, "Alchymistova dílna vybuchla! Alchymista zmizel i s tvými 80 zlatými.", "objevy", [C.id]); }
      else { const g = rint(s, 20, 90); C.gold += g; log(s, `Alchymista předvedl „proměnu“ a do pokladny přibylo ${g} zl. Nikdo neví jak.`, "objevy", [C.id]); }
    }
    if (ct.astrolog && isPlayer(s, C.id) && s.month === 5 && s.flags.harvest && s.flags.harvest < 1) log(s, "Astrolog varuje: hvězdy věští slabou úrodu. Zásob se obilím.", "objevy", [C.id]);
  }
}
function discoverMpBonus(s, cid, out) { if (T_(s, cid, "urbar")) out.adm++; if (T_(s, cid, "kuryri")) out.dip++; if (T_(s, cid, "papir")) out.dip++; if (hasTrea(s, cid, "hodiny")) out.adm++; if (T_(s, cid, "notariat")) out.dip++; return out; }

// ---------- zpráva o objevu s volbou dalšího zkoumání ----------
function nextTechChoices(s, cid) { return TECH_IDS.filter(t => techAvail(s, cid, t) && techYearOk(s, t)).sort((a, b) => TECHS[a].cost - TECHS[b].cost).slice(0, 4); }
