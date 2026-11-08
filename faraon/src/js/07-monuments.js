// Velké stavby panovníků: dlouhodobé projekty s trvalým účinkem na župu a jednorázovou slávou pro stavebníka.
// Každá je inspirována skutečnou stavbou; ve hře ji může postavit kdokoli, kdo župu drží (i dřív než historicky).
const MONUMENTS = {
  delbahri: { n: "Zádušní chrám v Dér el-Bahrí", at: "u4", stages: 4, deben: 6000, grain: 40000, maat: 10, prestige: 120,
    d: "Terasovitý zádušní chrám Montuhotepa II. (11. dynastie) v zálivu skal na západním břehu Théb.", eff: "maat +10, sláva +120, Théby +10 spokojenosti" },
  karnak: { n: "Chrám Amona v Ipet-sut (Karnak)", at: "u4", stages: 3, deben: 5000, grain: 30000, maat: 8, prestige: 80, knezi: 10,
    d: "Nejstarší doložené stavby Karnaku pocházejí ze Střední říše (Bílá kaple Senusreta I.).", eff: "maat +8, kněží +10, Théby +2 body vědění měsíčně" },
  abydos: { n: "Usirův chrám a Terasa velkého boha", at: "u8", stages: 3, deben: 4500, grain: 25000, maat: 8, prestige: 60, knezi: 6,
    d: "Chrám Usira-Chontamenti v Abydu, kolem něhož poutníci stavěli stély a kaple.", eff: "maat +8, Usirovy mystéria dávají dvojnásobek maat" },
  fajjum: { n: "Hráze a kanál Fajjúmu", at: "fa", stages: 4, deben: 5000, grain: 50000, maat: 3, prestige: 60,
    d: "Úprava ramene Bahr Júsuf a hráze u Lahúnu, které za 12. dynastie změnily Fajjúm v obilnici.", eff: "Fajjúm +25 stropu polí, +10 obyvatel (tis.)" },
  katarakt: { n: "Pevnosti 2. kataraktu", at: "n_buhen", need: ["n_buhen", "n_semna"], stages: 4, deben: 6000, grain: 35000, maat: 2, prestige: 90,
    d: "Řetěz cihlových pevností Buhen, Mirgissa, Semna a Kumma, jímž 12. dynastie uzavřela jižní hranici.", eff: "Buhen a Semna +2 úrovně pevnosti, nájezdy z jihu se tu tříští" },
  zdi: { n: "Zdi vládcovy", at: "l14", need: ["l14", "l20"], stages: 3, deben: 4000, grain: 30000, maat: 2, prestige: 60,
    d: "Pohraniční opevnění proti Asiatům na východě Delty, které podle Proroctví Neferetiho postavil Amenemhat I.", eff: "Tjaru a Vádí Tumilát +2 úrovně pevnosti, nájezdy z východu se tu tříští" },
  obelisk: { n: "Obelisk v Iunu (Heliopoli)", at: "l13", stages: 2, deben: 5000, grain: 20000, maat: 5, prestige: 80, need2: "kamen",
    d: "Obelisk z asuánské žuly, jaký dal Senusret I. vztyčit v Heliopoli (stojí dodnes).", eff: "maat +5, sláva +80; potřebuješ i Elefantinu (žulové lomy)" },
};
const MON_IDS = Object.keys(MONUMENTS);
function monState(s, id) { const p = s.provs[MONUMENTS[id].at]; return (p.mons && p.mons[id]) || { stage: 0, left: 0, active: false, by: null }; }
function monDone(s, id) { return monState(s, id).stage >= MONUMENTS[id].stages; }
function monCost(s, cid, id) { const M = MONUMENTS[id], k = costMult(s, cid) * (1 + monState(s, id).stage * 0.15); return { deben: Math.round(M.deben * k), grain: Math.round(M.grain * k) }; }
function monCheck(s, cid, id) {
  const M = MONUMENTS[id], st_ = monState(s, id);
  if (st_.stage >= M.stages) return "Stavba je dokončena.";
  if (st_.active) return "Na stavbě se pracuje.";
  for (const pid of [M.at].concat(M.need || [])) if (s.provs[pid].owner !== cid) return `Musíš držet župu ${s.provs[pid].n}.`;
  if (M.need2 === "kamen" && s.provs.u1.owner !== cid) return "Žula se láme u Elefantiny – musíš ji držet.";
  if (s.provs[M.at].siege) return "Župa je obléhána.";
  const c = monCost(s, cid, id); if (s.clans[cid].deben < c.deben || s.clans[cid].grain < c.grain) return `Potřebuješ ${fmtN(c.deben)} debenů a ${fmtN(c.grain)} charů obilí.`;
  return null;
}
function startMon(s, cid, id) {
  const e = monCheck(s, cid, id); if (e) return e;
  const c = monCost(s, cid, id), p = s.provs[MONUMENTS[id].at]; pay(s, cid, c.deben, c.grain);
  p.mons = p.mons || {}; const st_ = monState(s, id); p.mons[id] = { stage: st_.stage, left: 6, active: true, by: cid };
  if (isPlayer(s, cid)) log(s, `Zahájena další fáze velké stavby: ${MONUMENTS[id].n} (${st_.stage + 1}. z ${MONUMENTS[id].stages}).`, "stavby", [cid]);
  return null;
}
function monTick(s) {
  for (const id of MON_IDS) {
    const M = MONUMENTS[id], p = s.provs[M.at], st_ = p.mons && p.mons[id]; if (!st_ || !st_.active) continue;
    if (p.owner !== st_.by || p.siege) { st_.active = false; continue; } // stavba se zastaví, když župa padne
    st_.left -= s.month < 4 ? 2 : 1;
    if (st_.left > 0) continue;
    st_.active = false; st_.stage++; const C = s.clans[st_.by];
    if (st_.stage < M.stages) { C.prestige += 10; if (isPlayer(s, st_.by)) log(s, `${M.n}: dokončena ${st_.stage}. fáze z ${M.stages}.`, "stavby", [st_.by]); continue; }
    C.maat = Math.min(100, C.maat + M.maat); C.prestige += M.prestige; if (M.knezi && C.estates) C.estates.knezi = Math.min(100, C.estates.knezi + M.knezi);
    if (id === "delbahri") p.loy = Math.min(100, p.loy + 10);
    if (id === "fajjum") p.pop = r1(p.pop + 10);
    if (id === "katarakt") for (const q of ["n_buhen", "n_semna"]) { const x = s.provs[q]; x.castle = Math.min(6, x.castle + 2); x.dur = durMax(s, x); }
    if (id === "zdi") for (const q of ["l14", "l20"]) { const x = s.provs[q]; x.castle = Math.min(6, x.castle + 2); x.dur = durMax(s, x); }
    log(s, `${C.house} dokončil velkou stavbu: ${M.n}.`, "stavby", [st_.by]);
  }
}
// trvalé účinky na župy
function monAgri(s, p) { return p.id === "fa" && monDone(s, "fajjum") ? 25 : 0; }
function monRaidWall(s, p) { return (monDone(s, "zdi") && (p.id === "l14" || p.id === "l20")) || (monDone(s, "katarakt") && (p.id === "n_buhen" || p.id === "n_semna")) ? 2 : 1; }
function monResearch(s, cid) { return monDone(s, "karnak") && s.provs.u4.owner === cid ? 2 : 0; }
function monCount(s, cid) { return sum(MON_IDS.map(id => { const st_ = monState(s, id); return st_.by === cid ? st_.stage : 0; })); }
function aiMonuments(s, cid) {
  const C = s.clans[cid]; if (C.t !== "král" || C.deben < 15000) return;
  for (const id of MON_IDS) if (!monCheck(s, cid, id)) { const c = monCost(s, cid, id); if (C.deben > c.deben * 3 && C.grain > c.grain * 4) { startMon(s, cid, id); return; } }
}
