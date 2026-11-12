// Komplexnější říše: další zákony, pozdní vynálezy, cena výzkumu, počasí, spiknutí, kostky a odložené události.

// ---------- zákony ----------
Object.assign(LAWS, {
  lesy: { n: "Lesní právo", opts: ["Volné lesy", "Královské hvozdy", "Přísný zákaz pytláctví"], d: "Hvozdy patří panovníkovi: víc zlata z lesních krajů a lepší hony, ale sedláci strádají.", art: "les" },
  souboje: { n: "Soudní souboj", opts: ["Povolen", "Jen se svolením soudu", "Zakázán"], d: "Souboje těší šlechtu, ale spory pak častěji končí krví. Církev je odsuzuje.", art: "turnaj" },
  cla: { n: "Cla a mýta", opts: ["Volný průchod kupců", "Obvyklá mýta", "Vysoká cla"], d: "Cla plní komoru, ale odrazují kupce na obchodních cestách.", art: "obchod" },
  trest: { n: "Trestní právo", opts: ["Mírné tresty", "Obvyklé", "Útrpné právo"], d: "Tvrdé tresty odhalí víc spiknutí, lid se ale bojí a reptá.", art: "dvur" },
  osadnici: { n: "Osadníci", opts: ["Jen domácí lid", "Němečtí kolonisté", "Volná výzva osadníkům"], d: "Kolonisté zvednou počet obyvatel a města, domácí šlechta je ale nelibě nese.", art: "uroda" },
  skoly: { n: "Školy", opts: ["Jen klášterní", "Kapitulní školy", "Městské partikulární školy"], d: "Školy přinášejí body učenosti, ale stojí zlato a ubírají vliv kněží.", art: "uceni" },
});
const LAW_DEF = { lesy: 0, souboje: 1, cla: 1, trest: 1, osadnici: 0, skoly: 0 };
Object.assign(LAW_EST, {
  lesy: [{ sedlaci: 6 }, { sedlaci: -3, slechta: -2 }, { sedlaci: -10, slechta: -4 }],
  souboje: [{ slechta: 6, duchovni: -5 }, {}, { slechta: -6, duchovni: 6 }],
  cla: [{ mestane: 8 }, {}, { mestane: -10, slechta: 2 }],
  trest: [{ sedlaci: 4, slechta: -2 }, {}, { sedlaci: -6, slechta: -3, duchovni: 2 }],
  osadnici: [{ slechta: 3 }, { mestane: 5, slechta: -2 }, { mestane: 8, sedlaci: 2, slechta: -6 }],
  skoly: [{ duchovni: 4 }, { mestane: 2 }, { mestane: 7, duchovni: -6 }],
});
function ensureLaws(C) { if (!C || !C.laws) return; for (const [k, v] of Object.entries(LAW_DEF)) if (C.laws[k] == null) C.laws[k] = v; }
const lawOf = (s, cid, l) => { const C = s.clans[cid]; return C && C.laws && C.laws[l] != null ? C.laws[l] : LAW_DEF[l]; };

// ---------- pozdní vynálezy ----------
Object.assign(TECHS, {
  kolovrat: { n: "Kolovrat a vodorovný stav", cat: "Řemesla", cost: 140, req: ["cechy"], d: "kraje s městem +5 % zlata (soukenictví)" },
  vysoka_pec: { n: "Vysoká pec", cat: "Řemesla", cost: 170, req: ["hornictvi", "vodni_kolo"], year: 1300, d: "železné doly dávají o 40 % víc zbroje" },
  plavebni_komora: { n: "Plavební komora", cat: "Řemesla", cost: 200, req: ["most_stavba"], year: 1370, d: "obchodní cesty +10 %" },
  most_stavba: { n: "Stavba kamenných mostů", cat: "Řemesla", cost: 150, req: ["gotika"], d: "obchodní cesty +5 %, velká díla o čtvrtinu levnější splátky" },
  dvojite_ucetnictvi: { n: "Podvojné účetnictví", cat: "Správa", cost: 160, req: ["smenka"], year: 1300, d: "zlato z krajů +5 %, úroky z dluhů o třetinu nižší" },
  notariat: { n: "Veřejní notáři", cat: "Správa", cost: 130, req: ["urbar"], d: "body diplomacie +1, padělané listiny se snáz odhalí" },
  pojisteni: { n: "Námořní pojištění", cat: "Správa", cost: 160, req: ["smenka"], year: 1340, d: "obchodní cesty +10 %, výpravy přivážejí víc zlata" },
  spital: { n: "Špitály", cat: "Učenost", cost: 120, req: ["medicina"], d: "mor zabíjí o čtvrtinu méně, spokojenost lidu +2" },
  kompas: { n: "Lodní kompas", cat: "Učenost", cost: 130, req: ["astronomie"], year: 1300, d: "výpravy bezpečnější a o měsíc kratší" },
  brigantina: { n: "Brigantina", cat: "Válečnictví", cost: 150, req: ["zbroj"], year: 1330, d: "síla v poli +4 %" },
  rucnice: { n: "Ruční palné zbraně", cat: "Válečnictví", cost: 200, req: ["prach"], year: 1360, d: "síla v poli +5 %, obrana hradů +10 %" },
  bombarda: { n: "Bombardy", cat: "Válečnictví", cost: 240, req: ["prach"], year: 1370, d: "obléhání ničí hradby ještě o 50 % rychleji" },
});
TECH_IDS.splice(0, TECH_IDS.length, ...Object.keys(TECHS));
// Výzkum zdražuje: každý známý objev zvedá cenu dalšího o 6 %.
function techCost(s, cid, t) { const C = s.clans[cid]; return Math.round(TECHS[t].cost * (1 + Object.keys((C && C.techs) || {}).length * 0.06)); }

// ---------- efekty zákonů a vynálezů (volané z jádra) ----------
function realmGoldMult(s, p) { const o = p.owner; let m = 1; if (T_(s, o, "kolovrat") && (p.city || p.b.mesto)) m += 0.05; if (T_(s, o, "dvojite_ucetnictvi")) m += 0.05; return m; }
function realmGoldFlat(s, p) { const o = p.owner, C = s.clans[o]; if (!C || !C.laws) return 0; let g = 0; if (p.ter === "l") g += [0, 2, 4][lawOf(s, o, "lesy")]; if (p.city || p.b.mesto) g += [0, 1.5, 3.5][lawOf(s, o, "cla")]; return g; }
function realmTradeMult(s, cid) { let m = 1; if (T_(s, cid, "plavebni_komora")) m += 0.1; if (T_(s, cid, "most_stavba")) m += 0.05; if (T_(s, cid, "pojisteni")) m += 0.1; const C = s.clans[cid]; if (C && C.laws) m *= [1.1, 1, 0.85][lawOf(s, cid, "cla")]; return m; }
function realmBattleMult(s, side) { let m = 1; if (T_(s, side.cl, "brigantina")) m += 0.04; if (T_(s, side.cl, "rucnice")) m += side.def ? 0.1 : 0.05; return m; }
function realmHarvestMult(s, p) { const W = WEATHER[(s.weather || {}).t || "mirny"]; return W.harvest; }

// ---------- počasí ----------
const WEATHER = {
  mirny: { n: "Mírný rok", harvest: 1, plague: 1, d: "Počasí bez výkyvů.", ic: "uroda" },
  pozehnany: { n: "Požehnaný rok", harvest: 1.15, plague: 0.8, d: "Teplé jaro a vláhy akorát – sklizeň bude bohatá.", ic: "uroda" },
  desty: { n: "Deštivý rok", harvest: 0.85, plague: 1.3, d: "Prší a prší. Obilí hnije, cesty jsou rozbahněné, nemoci se šíří.", ic: "povoden" },
  sucho: { n: "Suchý rok", harvest: 0.8, plague: 0.9, d: "Řeky opadly, pole praskají žízní.", ic: "sucho" },
  zima: { n: "Krutá zima", harvest: 0.95, plague: 1.1, d: "Mrzne tak, že praskají stromy. Vojska v poli trpí a vlci chodí až ke vsím.", ic: "zima" },
};
function rollWeather(s) {
  const w = rnd(s); const t = w < 0.42 ? "mirny" : w < 0.58 ? "pozehnany" : w < 0.74 ? "desty" : w < 0.88 ? "sucho" : "zima";
  s.weather = { t, y: s.year };
  if (P(s).alive && t !== "mirny") news(s, `${WEATHER[t].n}: ${WEATHER[t].d}`, "svet");
}
function weatherTick(s) {
  if (!s.weather || (s.month === 0 && s.weather.y !== s.year)) rollWeather(s);
  const t = s.weather.t;
  if (t === "zima" && [11, 0, 1].includes(s.month)) for (const a of s.armies) if (men(a.t) > 0) { loseMen(a.t, Math.round(men(a.t) * 0.03)); a.morale = Math.max(10, (a.morale || 80) - 3); }
  if (t === "desty" && chance(s, 0.015 * WEATHER.desty.plague)) { const p = pick(s, Object.values(s.provs)); if (!p.plague) p.plague = rint(s, 3, 6); }
}

// ---------- spiknutí ----------
const PLOT_GOALS = { atentat: "zavraždit panovníka", kradez: "vyloupit komoru", vzpoura: "odtrhnout kraj od říše" };
function plotTick(s) {
  const C = P(s); if (!C.alive) return; s.plots = s.plots || [];
  const L = leaderOf(s, s.player), inPlot = new Set(s.plots.flatMap(p => p.m));
  for (const c of officers(s, s.player)) {
    if (c.id === C.leader || c.dyn || inPlot.has(c.id) || c.loy >= 55) continue; const amb = c.traits.includes("ctizadostivy") ? 2 : 1;
    const pl = s.plots.find(p => !p.found || chance(s, 0.5));
    if (pl && chance(s, 0.05 * amb)) { pl.m.push(c.id); inPlot.add(c.id); if (pl.known) log(s, `${c.n} se přidal ke spiknutí.`, "vazalove", [s.player]); }
    else if (!pl && s.plots.length < 2 && chance(s, (0.004 + (55 - c.loy) / 1500) * amb)) { s.plots.push({ id: "pl" + s.nextId++, lead: c.id, m: [c.id], str: 5, goal: pick(s, Object.keys(PLOT_GOALS)), known: false, start: s.turn }); inPlot.add(c.id); }
  }
  for (const pl of s.plots.slice()) {
    pl.m = pl.m.filter(id => { const c = chr(s, id); return c && c.st === "off" && c.cl === s.player && c.loy < 68; });
    if (!pl.m.length || !pl.m.includes(pl.lead)) { if (pl.m.length) pl.lead = pl.m[0]; else { s.plots = s.plots.filter(x => x !== pl); if (pl.known) log(s, "Spiknutí se rozpadlo.", "vazalove", [s.player]); continue; } }
    pl.str += sum(pl.m.map(id => { const c = chr(s, id); return (st(c, "roz") + st(c, "uda")) / 60; })) + rnd(s) * 2;
    const disc = (0.06 + officeVal(s, s.player, "sudi") / 1500 + officeVal(s, s.player, "kancler") / 2500) * [0.7, 1, 1.5][lawOf(s, s.player, "trest")] * (pl.known ? 0 : 1);
    if (chance(s, disc)) { pl.known = true; s.events.push({ id: "_spiknuti", pl: pl.id, cid: pl.lead }); }
    if (pl.str >= 100) { s.plots = s.plots.filter(x => x !== pl); plotStrike(s, pl); }
  }
}
function plotStrike(s, pl) {
  const C = P(s), Ld = leaderOf(s, s.player), lead = chr(s, pl.lead);
  if (pl.goal === "atentat" && Ld) { const dmg = rint(s, 15, 55) - (hasCourt(s, s.player, "lekar") ? 10 : 0) - ((C.guard || 0) > s.turn ? 15 : 0); Ld.hp -= dmg; s.events.push({ id: "_atentat", cid: pl.lead, dmg, dead: Ld.hp <= 0 }); if (Ld.hp <= 0) kill(s, Ld, "zavražděn"); }
  else if (pl.goal === "kradez") { const g = Math.round(C.gold * 0.3); C.gold -= g; lead.st = "wand"; lead.cl = null; s.events.push({ id: "_atentat", cid: pl.lead, kradez: g }); }
  else { s.events.push({ id: "_atentat", cid: pl.lead, vzpoura: 1 }); vassalRevolt(s, lead); }
}
function crushPlot(s, plid, how) {
  const pl = (s.plots || []).find(p => p.id === plid); if (!pl) return "Spiknutí už neexistuje.";
  const ms = pl.m.map(id => chr(s, id)).filter(Boolean);
  if (how === "zatknout") { for (const c of ms) { c.st = "wand"; c.cl = null; } for (const c of officers(s, s.player)) c.loy -= 3; P(s).prestige += 5; s.plots = s.plots.filter(x => x !== pl); return `Spiklenci (${ms.map(c => c.n).join(", ")}) byli zbaveni lén a vyhnáni ze země.`; }
  if (how === "popravit") { for (const c of ms) kill(s, c, "poprava"); P(s).execs = (P(s).execs || 0) + ms.length; for (const c of officers(s, s.player)) c.loy -= 6; P(s).stab = Math.min(3, P(s).stab + 1); s.plots = s.plots.filter(x => x !== pl); return "Hlavy spiklenců padly na náměstí. Ostatní páni se bojí."; }
  if (how === "uplatit") { const g = ms.length * 80; if (!pay(s, s.player, g)) return `Úplatky by stály ${g} zl.`; for (const c of ms) c.loy = Math.min(100, c.loy + 25); s.plots = s.plots.filter(x => x !== pl); return "Zlato rozpustilo i to nejpevnější spiknutí."; }
  if (how === "sledovat") { pl.str = Math.max(0, pl.str - 15); pl.watched = true; return "Zvědové sledují každý krok spiklenců (síla −15)."; }
  return null;
}

// ---------- hra v kostky ----------
function diceRoll(s) { return [rint(s, 1, 6), rint(s, 1, 6), rint(s, 1, 6)]; }
function diceScore(d) { const sorted = d.slice().sort(); const same = sorted[0] === sorted[2] ? 100 : sorted[0] === sorted[1] || sorted[1] === sorted[2] ? 30 : 0; return same + sum(d); }
function dicePlay(s, ev, bet) {
  const C = P(s); if (C.gold < bet) { ev.msg = "Na takovou sázku nemáš."; return; }
  const me_ = diceRoll(s), foe = diceRoll(s), a = diceScore(me_), b = diceScore(foe), foeC = chr(s, ev.cid);
  ev.me = me_; ev.foe = foe; ev.round = (ev.round || 0) + 1;
  if (a > b) { C.gold += bet; ev.won = (ev.won || 0) + bet; ev.msg = `Vyhráváš ${bet} zl!`; if (foeC) foeC.loy -= bet > 100 ? 3 : 1; }
  else if (a < b) { C.gold -= bet; ev.won = (ev.won || 0) - bet; ev.msg = `Prohráváš ${bet} zl.`; if (foeC) foeC.loy = Math.min(100, foeC.loy + (bet > 100 ? 4 : 2)); }
  else ev.msg = "Remíza – sázka zůstává na stole.";
}

// ---------- odložené události (řetězy) ----------
function later(s, months, ev) { s.delayed = s.delayed || []; s.delayed.push({ at: s.turn + months, ev }); }
function delayedTick(s) { if (!s.delayed || !P(s).alive) return; for (const d of s.delayed.slice()) if (d.at <= s.turn) { s.delayed = s.delayed.filter(x => x !== d); s.events.push(d.ev); } }

function realmTick(s) { ensureLaws(P(s)); weatherTick(s); plotTick(s); delayedTick(s); if (P(s).alive) { const C = P(s); C.res.pts += [0, 1, 2][lawOf(s, s.player, "skoly")]; } }
// Zprávy, jejichž postavy mezitím zemřely nebo zmizely, se zahodí.
function pruneEvents(s) {
  const gone = id => id != null && (!s.chars[id] || s.chars[id].st === "dead");
  s.events = s.events.filter(e => { if (["_duel", "_rada"].includes(e.id)) return !gone(e.a) && !gone(e.b); if (["slib_vazala", "dedic_nemoc", "rytir", "loupeznik"].includes(e.id)) return !!s.chars[e.cid] && s.chars[e.cid].st !== "dead"; return true; });
}
