// Bitevní taktiky, umělá inteligence pro nové mechaniky, diplomacie soupeřů vůči hráči,
// letopis po letech, úspěchy, obsah pro Kuš a scénář Montuhotepa II.

// ---------- bitevní taktiky ----------
// Kámen–nůžky–papír: salvy lučištníků rozstřílí šik, šik kopiníků zastaví vozy, vozy rozprášíte lučištníky.
// Léčka závisí na moudrosti velitele a nerovném terénu.
const TACTICS = {
  sik: { n: "Šik kopiníků", d: "pevná řada štítů z volské kůže; zastaví útok vozů, ale lučištníci ho rozstřílí", beats: "vozy" },
  strelba: { n: "Salvy lučištníků", d: "lučištníci vpředu kosí stojící řady; rychlý útok vozů je však zaskočí", beats: "sik" },
  vozy: { n: "Rychlý útok", d: "vozy (nebo běžci) vtrhnou do řad lučištníků; o šik kopiníků se ale rozbijí", beats: "strelba" },
  lest: { n: "Léčka a obchvat", d: "výsledek závisí na moudrosti velitele; v Deltě, poušti a u kataraktu je silnější", beats: null },
};
const TAC_IDS = Object.keys(TACTICS);
function tacMult(s, X, Y, ter) {
  const a = TACTICS[X.tac] ? X.tac : "sik", b = TACTICS[Y.tac] ? Y.tac : "sik"; let m = 1;
  if (TACTICS[a].beats === b) m *= 1.2; if (TACTICS[b].beats === a) m *= 0.85;
  if (a === "vozy") { const share = (X.t.vozy || 0) / Math.max(1, men(X.t)); m *= share > 0.1 ? 1.08 : 0.95; }
  if (a === "lest") { const cs = (X.cmds || []).map(id => chr(s, id)).filter(Boolean), roz = cs.length ? Math.max(...cs.map(c => st(c, "roz"))) : 40; m *= 1 + (roz - 50) / 250 + (["delta", "poust", "katarakt"].includes(ter) ? 0.08 : 0); }
  return m;
}

// ---------- umělá inteligence: nové mechaniky ----------
function aiMech(s, cid) {
  const C = s.clans[cid]; if (!C.alive || C.type === "kmen" || isPlayer(s, cid)) return;
  if (!stateGod(s, cid)) { const g = Object.keys(STATE_GODS).find(k => s.provs[STATE_GODS[k].at].owner === cid); if (g) C.god = g; }
  if (C.t === "král" && C.cul !== "nub") { if (!C.horus) C.horus = C.aggr > 0.5 ? "nacht" : "seanch"; if (C.horus !== "sema" && realmCore(s, cid) >= 30) C.horus = "sema"; }
  if (!C.aiLaws) { C.aiLaws = 1; if (C.aggr > 0.55) { C.laws.vojsko = 2; C.laws.tresty = 2; } else if (C.aggr < 0.3) { C.laws.robota = 0; C.laws.sypky = 2; } if (C.cul === "hyk") C.laws.cizinci = 2; }
  if (C.deben > 30000 && C.grain > 200000 && (C.nadace || 0) < 2 && chance(s, 0.05)) foundNadace(s, cid);
  if ((C.zajatci || 0) >= 300 && clanProvs(s, cid).some(p => p.build)) captivesBuild(s, cid); else if ((C.zajatci || 0) > 1500) captivesSettle(s, cid);
}

// ---------- diplomacie soupeřů vůči hráči ----------
const EV5 = {
  sn_nabidka: { view: (s, d) => { const O = s.clans[d.cl], pair = marriagePair(s, d.cl, s.player); return { t: `Nabídka sňatku – ${O.n}`, tx: `Posel rodu ${O.house} navrhuje sňatek${pair ? `: ${pair[0].n} a ${pair[1].n}` : ""}. Sňatky spojovaly vládnoucí rody i rody nomarchů.`,
    ch: [{ t: "Přijmout", d: "vztah +25, spřízněné rody", f: () => { const p2 = marriagePair(s, d.cl, s.player); if (!p2) return "Mezitím už nejsou volní ženiši a nevěsty."; wed(s, p2[0], p2[1]); s.marriages[pairKey(s.player, d.cl)] = true; addRel(s, s.player, d.cl, 25); return null; } },
      { t: "Odmítnout", d: "vztah −5", f: () => { addRel(s, s.player, d.cl, -5); return null; } }] }; } },
  spoj_nabidka: { view: (s, d) => { const O = s.clans[d.cl]; return { t: `${O.n} nabízí spojenectví`, tx: `${O.house} navrhuje spojenectví${d.foe ? ` proti rodu ${s.clans[d.foe].house}` : ""}. Spojenec ti přijde na pomoc ve válce – a čeká totéž od tebe.`,
    ch: [{ t: "Uzavřít spojenectví", d: "vztah +10", f: () => { if (atWar(s, s.player, d.cl)) return "Válčíte."; s.alliances[pairKey(s.player, d.cl)] = true; addRel(s, s.player, d.cl, 10); return null; } },
      { t: "Odmítnout", d: "vztah −5", f: () => { addRel(s, s.player, d.cl, -5); return null; } }] }; } },
  obchod_nabidka: { view: (s, d) => { const O = s.clans[d.cl]; return { t: `${O.n} nabízí obchod`, tx: `Kupci rodu ${O.house} chtějí volně plout po řece a obchodovat na tvých trzích.`,
    ch: [{ t: "Uzavřít obchodní smlouvu", d: "+4 % výnosu nomů oběma, lepší obchodní cesty", f: () => { s.trade[pairKey(s.player, d.cl)] = true; addRel(s, s.player, d.cl, 5); return null; } },
      { t: "Odmítnout", d: "", f: () => null }] }; } },
  tribut_zadost: { view: (s, d) => { const C = P(s), O = s.clans[d.cl]; return { t: `${O.n} žádá tribut`, tx: `Posel mocného rodu ${O.house} žádá ${fmtN(d.g)} debenů jako výraz úcty. Odmítnutí může znamenat válku.`,
    ch: [{ t: `Zaplatit ${fmtN(d.g)} debenů`, d: "vztah +10, sláva −10", f: () => { if (!pay(s, s.player, d.g)) return "Nemáš z čeho platit – posel odchází uražen."; O.deben += d.g; addRel(s, s.player, d.cl, 10); C.prestige = Math.max(0, C.prestige - 10); return null; } },
      { t: "Odmítnout", d: "sláva +10, hrozí válka", f: () => { C.prestige += 10; addRel(s, s.player, d.cl, -20); if (chance(s, 0.5) && !atWar(s, s.player, d.cl) && truceUntil(s, s.player, d.cl) <= s.turn) declareWar(s, d.cl, s.player, "za odepřený tribut"); return null; } }] }; } },
  dary_posel: { view: (s, d) => { const O = s.clans[d.cl]; return { t: `Dary od rodu ${O.n}`, tx: `Posel rodu ${O.house} přináší dary – zlato, oleje a látky – a pozdravy pro tvůj dům.`,
    ch: [{ t: "Přijmout a poslat dary zpět", d: "+800 debenů, vztah +8", f: () => { P(s).deben += 800; addRel(s, s.player, d.cl, 8); return null; } }] }; } },
  bitva: { view: (s, d) => { const b = s.battles.find(x => x.t === d.t && x.place === d.place) || s.battles[0]; if (!b) return { t: "Bitva", tx: "", ch: [{ t: "Pokračovat", f: () => null }] };
    const me_ = s.player, mine = b.a === me_ ? "A" : "D", won = b.win === mine, p = s.provs[b.place];
    const tn = x => (TACTICS[x] ? TACTICS[x].n.toLowerCase() : "obrana"), side = k => `${s.clans[k === "A" ? b.a : b.b].n} (${tn(k === "A" ? b.tacA : b.tacD)})`;
    const foe = s.clans[mine === "A" ? b.b : b.a], la = sum(b.rounds.map(r => r[0])), ld = sum(b.rounds.map(r => r[1]));
    const qid = !won ? "harfenik" : (foe.cul === "aam" || foe.cul === "hyk") ? (s.scen === "sip" ? "kamose_prani" : "merikare_asiat") : "anchtifi_hrdina";
    return { t: `${won ? "Vítězství" : "Porážka"} u nomu ${p.n}`, tx: `Útočil ${side("A")} s ${fmtN(b.aStart)} muži proti ${side("D")} s ${fmtN(b.bStart)}. Bitva trvala ${b.rounds.length} ${b.rounds.length < 5 ? "kola" : "kol"}; útočník ztratil ${fmtN(la)}, obránce ${fmtN(ld)} mužů.${b.fates && b.fates.length ? " " + b.fates.join(", ") + "." : ""}`, battle: b, q: qOk(s, Q(qid)),
      ch: [{ t: "Pokračovat", d: "", f: () => null }] }; } },
  vzpoura_thinis: { view: (s, d) => { const C = P(s), p = s.provs.u8; return { t: "Thinis se bouří", tx: "Ve 14. roce vlády Montuhotepa II. se podle nápisů vzbouřila Thinis – staré jádro sporů mezi Thébami a Hérakleopolí. Vzpouru podporují hérakleopolští posli.",
    ch: [{ t: "Potlačit vzpouru vojskem", d: "posádka −15 %, spokojenost se vrátí, sláva +15", f: () => { lossApply(p.troops, men(p.troops) * 0.15); p.loy = Math.max(p.loy, 45); C.prestige += 15; return null; } },
      { t: "Vyjednat: odpustit daně na rok", d: "spokojenost +25, maat +2", f: () => { p.loy = Math.min(100, p.loy + 25); C.maat = Math.min(100, C.maat + 2); return null; } }] }; } },
  // Kuš
  sochy: { view: (s, d) => { const C = P(s); return { t: "Sochy z Egypta", tx: "Kušitští bojovníci přivezli z výpadu do Egypta kamenné sochy egyptských hodnostářů. Archeologové našli v Kermě mimo jiné sochy nomarchy Hapdžefaje z Asjútu a jeho manželky Sennui, uložené v královských mohylách.",
    ch: [{ t: "Uložit je do královské mohyly", d: "sláva +20", f: () => { C.prestige += 20; return null; } }, { t: "Prodat kámen a zlato", d: "+1 000 debenů", f: () => { C.deben += 1000; return null; } }] }; } },
  tasetilukostrelci: { view: (s, d) => { const C = P(s), p = s.provs[C.capital]; return { t: "Lučištníci Ta-Seti", tx: "Egypťané nazývali Núbii Ta-Seti, „země luku“. Náčelníci okolních kmenů nabízejí své nejlepší lučištníky do vojska Kermy.",
    ch: [{ t: "Přijmout 500 lučištníků (1 500 debenů)", d: "lučištníci do sídla", f: () => { if (!pay(s, s.player, 1500)) return "Nedostatek debenů."; p.troops.lucistnici = (p.troops.lucistnici || 0) + 500; return null; } }, { t: "Odmítnout", d: "", f: () => null }] }; } },
};
Object.assign(EVENTS, EV5);
// pohřeb vládce Kuše se liší od egyptského
{ const orig = EVENTS.pohreb.view; EVENTS.pohreb.view = (s, d) => P(s).cul !== "nub" ? orig(s, d) : { t: "Pohřeb vládce Kuše", tx: `${d.old ? d.old + " zemřel. " : ""}Vládce bude uložen do mohyly v Kermě. Podle vykopávek George Reisnera dostávali kermští vládci do hrobu stovky volských lebek a s nimi byli pohřbíváni i desítky až stovky lidí.`,
  ch: [{ t: "Velkolepá mohyla (3 000 debenů, 10 000 charů)", d: "sláva +40, úředníci +5", f: () => { if (!pay(s, s.player, 3000, 10000)) return "Nedostatek prostředků."; P(s).prestige += 40; for (const c of officers(s, s.player)) c.loy = Math.min(100, c.loy + 5); return null; } }, { t: "Skromný pohřeb", d: "", f: () => null }] }; }
function aiOffers(s) {
  const Cp = P(s); if (!Cp || !Cp.alive || s.events.length) return;
  for (const O of aliveClans(s)) {
    if (O.id === s.player || O.type === "kmen" || !chance(s, 0.035)) continue;
    const r = rel(s, O.id, s.player), near = borderClans(s, s.player).includes(O.id), war = atWar(s, O.id, s.player);
    if (war) continue;
    if (r > 20 && marriagePair(s, O.id, s.player) && !married(s, O.id, s.player)) { queueEvent(s, "sn_nabidka", { cl: O.id }); return; }
    const foes = enemiesOf(s, O.id).filter(e => e !== s.player);
    if (r > 40 && !allied(s, O.id, s.player) && foes.length) { queueEvent(s, "spoj_nabidka", { cl: O.id, foe: foes[0] }); return; }
    if (r > 10 && !s.trade[pairKey(O.id, s.player)] && near) { queueEvent(s, "obchod_nabidka", { cl: O.id }); return; }
    if (near && r < 0 && realmPower(s, O.id) > realmPower(s, s.player) * 2 && Cp.vassalOf !== O.id && truceUntil(s, O.id, s.player) <= s.turn) { queueEvent(s, "tribut_zadost", { cl: O.id, g: Math.round(Math.max(1000, Cp.deben * 0.15)) }); return; }
    if (r > 30) { queueEvent(s, "dary_posel", { cl: O.id }); return; }
  }
}

// ---------- letopis po letech (jako na Palermské desce) ----------
function yearAnnal(s) {
  const C = P(s); if (!C) return; s.annals = s.annals || []; const L = leaderOf(s, s.player), y = s.bce + 1;
  const ev = s.log.filter(x => x.y === y && x.cl && x.cl.includes(s.player) && ["valka", "rod", "stavby", "diplomacie", "chramy"].includes(x.cat)).slice(0, 3).map(x => x.txt.length > 110 ? x.txt.slice(0, 107) + "…" : x.txt).reverse();
  s.annals.push({ y, r: L ? L.n : "—", ry: regYear(s, s.player), h: s.flood.h, n: clanProvs(s, s.player).length, ev });
  if (s.annals.length > 200) s.annals.shift();
}

// ---------- úspěchy ----------
const ACH = {
  sjednotitel: { n: "Sjednotitel", d: "Sjednotit Obě země", ok: s => !!s.flags.won },
  sed: { n: "Svátek sed", d: "Oslavit svátek sed", ok: s => !!P(s).hebsed },
  punt: { n: "Do země bohů", d: "Úspěšná výprava do Puntu", ok: s => !!s.flags.punt_ok },
  sytost: { n: "Plné sýpky", d: "Deset sklizní po sobě bez hladu ve tvých nomech", ok: s => (s.flags.nohunger || 0) >= 10 },
  stavitel: { n: "Stavitel", d: "Dokončit tři velké stavby", ok: s => MON_IDS.filter(id => monDone(s, id) && monState(s, id).by === s.player).length >= 3 },
  vecnost: { n: "Dům věčnosti", d: "Dokončit hrobku panovníka a založit tři zádušní nadace", ok: s => P(s).tomb.stage >= TOMB_STAGES.length && (P(s).nadace || 0) >= 3 },
  dlouha: { n: "Trvalý životem", d: "Panovník vládne 30 let", ok: s => regYear(s, s.player) > 30 },
  avaris: { n: "Vyhnání Hyksósů", d: "Dobýt Avaris jako egyptský rod", ok: s => s.provs.lav.owner === s.player && P(s).cul === "eg" && s.scen === "sip" },
  kerma: { n: "Pán Kuše", d: "Za Kuš držet Elefantinu i Buhen", ok: s => P(s).cul === "nub" && ["u1", "n_buhen"].every(id => s.provs[id].owner === s.player) },
};
function achTick(s) { const C = P(s); if (!C || !C.alive) return; C.ach = C.ach || {}; for (const [k, A] of Object.entries(ACH)) if (!C.ach[k] && A.ok(s)) { C.ach[k] = s.turn; log(s, `Úspěch: ${A.n} – ${A.d}.`, "rod", [s.player]); } }

// události Kuše a scénáře Montuhotepa II.
function xaiEvents(s) {
  const C = P(s); if (!C || !C.alive || s.events.length) return;
  if (s.scen === "mt2" && !s.flags.thinis && s.turn >= 6 && s.provs.u8.owner === s.player) { s.flags.thinis = 1; queueEvent(s, "vzpoura_thinis", {}); return; }
  if (C.cul === "nub" && chance(s, 0.04)) { queueEvent(s, pick(s, s.flags.sochy ? ["tasetilukostrelci"] : ["sochy", "tasetilukostrelci"]), {}); s.flags.sochy = 1; return; }
  aiOffers(s);
}
