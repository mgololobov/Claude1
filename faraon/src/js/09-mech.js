// Další mechaniky: státní bůh, Horovo jméno panovníka, přenesení sídla, vzdálenost od sídla.

// Státní bůh: kult, kterému dvůr dává přednost. Každý má kultovní centrum, které musíš držet.
const STATE_GODS = {
  montu: { n: "Montu", at: "u4", d: "thébský bůh války; jeho jméno nesou Montuhotepové 11. dynastie", eff: "vojsko +8 % útoku" },
  amon: { n: "Amon", at: "u4", d: "„Skrytý“ bůh Théb, jehož kult za 11. a 12. dynastie stoupal (Amenemhat = „Amon je v čele“)", eff: "maat roste rychleji, Théby +5 spokojenosti" },
  ptah: { n: "Ptah", at: "l1", d: "memfidský stvořitel a patron řemeslníků", eff: "+4 stropu řemesel a obchodu ve všech nomech" },
  re: { n: "Re", at: "l13", d: "sluneční bůh z Iunu, opora královské ideologie („syn Reův“)", eff: "maat roste rychleji, úředníci +3 věrnosti" },
  usir: { n: "Usir", at: "u8", d: "pán podsvětí s centrem v Abydu, jehož kult se ve Střední říši rozšířil mezi všechny vrstvy", eff: "spokojenost lidu +3 ve všech nomech" },
  sobek: { n: "Sobek", at: "fa", d: "krokodýlí bůh Fajjúmu, oblíbený u králů 12. dynastie (Sobekneferu, Sobekhotepové)", eff: "Fajjúm a Delta +5 stropu polí" },
  sutech: { n: "Sutech", at: "lav", d: "bůh pouště a cizinců; Hyksósové ho v Avaridu uctívali jako svého hlavního boha", eff: "+8 % obrany, vztahy s Asiaty se zlepšují" },
  herisef: { n: "Herišef", at: "u20", d: "beraní bůh Hérakleopole, patron 9. a 10. dynastie", eff: "+4 % daně ze sklizně" },
};
const DEFAULT_GOD = { thebes: s => (s.scen === "sip" ? "amon" : "montu"), herak: () => "herisef", hyksos: () => "sutech" };
function stateGod(s, cid) { const C = s.clans[cid]; if (C.god === undefined) C.god = DEFAULT_GOD[cid] ? DEFAULT_GOD[cid](s) : null; return C.god; }
const hasGod = (s, cid, g) => s.clans[cid] && stateGod(s, cid) === g;
function setGod(s, cid, g) {
  const C = s.clans[cid], G = STATE_GODS[g]; if (!G) return "Neznámý bůh."; if (stateGod(s, cid) === g) return null;
  if (s.provs[G.at].owner !== cid) return `Musíš držet kultovní centrum (${s.provs[G.at].n}).`;
  if ((C.lawCd.god || 0) > s.turn) return `Kult lze znovu změnit až za ${C.lawCd.god - s.turn} měsíců.`;
  C.god = g; C.lawCd.god = s.turn + 36; C.maat = Math.max(0, C.maat - 6); if (C.estates) C.estates.knezi = Math.max(0, C.estates.knezi - 12);
  log(s, `Dvůr povýšil kult boha ${G.n} na první místo. Kněží starých kultů reptají.`, "chramy", [cid]); return null;
}

// Horovo jméno: první z pěti jmen královské titulatury vyjadřovalo program vlády. Vzory jsou jména Intefů a Montuhotepa II.
const HORUS = {
  sehertaui: { n: "Sehertaui", tr: "Ten, který uklidnil Obě země", who: "Intef I.", eff: "úředníci +4 věrnosti" },
  wahanch: { n: "Wahanch", tr: "Trvalý životem", who: "Intef II.", eff: "maat se pomaleji vrací k průměru (drží se výš)" },
  nacht: { n: "Nachtnebtepnefer", tr: "Mocný, pán dobrého počátku", who: "Intef III.", eff: "posádky se samy cvičí až do výcviku 60" },
  seanch: { n: "Seanchibtaui", tr: "Ten, který oživuje srdce Obou zemí", who: "Montuhotep II. (první jméno)", eff: "spokojenost lidu +4" },
  necer: { n: "Necerihedžet", tr: "Božská je bílá koruna", who: "Montuhotep II. (druhé jméno)", eff: "kněží +, maat +0,1 měsíčně" },
  sema: { n: "Semataui", tr: "Ten, který sjednotil Obě země", who: "Montuhotep II. (třetí jméno)", eff: "sláva +100, úředníci +6 věrnosti; jen kdo drží aspoň 30 nomů jádra", req: s => realmCore(s, s.player) >= 30 },
};
function setHorus(s, cid, h) {
  const C = s.clans[cid], H = HORUS[h]; if (!H) return "Neznámé jméno."; if (C.t !== "král") return "Horovo jméno přijímá jen král.";
  if (H.req && !H.req(s)) return "Toto jméno si musíš zasloužit.";
  if (C.horus && h !== "sema") return "Horovo jméno se mění jen při velké proměně vlády – sjednocením Obou zemí.";
  C.horus = h; if (h === "sema") { C.prestige += 100; }
  log(s, `${leaderOf(s, cid).n} přijal Horovo jméno ${H.n} – „${H.tr}“.`, "rod", [cid]); return null;
}
const hasHorus = (s, cid, h) => s.clans[cid] && s.clans[cid].horus === h;

// Vzdálenost nomů od sídla (počet přechodů); spravuje se snáz to, co je blízko.
const DIST_CACHE = {};
function capDist(s, cid) {
  const C = s.clans[cid], key = cid + "|" + C.capital; if (DIST_CACHE[key]) return DIST_CACHE[key];
  const d = {}; if (C.capital) { d[C.capital] = 0; const q = [C.capital]; while (q.length) { const x = q.shift(); for (const n of s.provs[x].nb) if (d[n] == null) { d[n] = d[x] + 1; q.push(n); } } }
  DIST_CACHE[key] = d; return d;
}
function distLoy(s, p) { const C = s.clans[p.owner]; if (!C || C.type === "kmen" || !C.capital) return 0; const d = capDist(s, p.owner)[p.id]; if (d == null) return -6; return d <= 2 ? 4 : d <= 4 ? 0 : -Math.min(8, d - 4); }
function moveCapital(s, cid, pid) {
  const C = s.clans[cid], p = s.provs[pid]; if (!p || p.owner !== cid) return "Nom ti nepatří."; if (C.capital === pid) return "Už je sídlem.";
  if (p.siege) return "Nom je obléhán."; if ((C.lawCd.cap || 0) > s.turn) return `Sídlo lze znovu přenést až za ${C.lawCd.cap - s.turn} měsíců.`;
  if (!pay(s, cid, 5000, 20000)) return "Přenesení sídla stojí 5 000 debenů a 20 000 charů obilí.";
  const old = C.capital; C.capital = pid; C.lawCd.cap = s.turn + 60; C.maat = Math.max(0, C.maat - 2); p.castle = Math.max(p.castle, 2); p.dur = durMax(s, p);
  for (const c of Object.values(s.chars)) if (c.cl === cid && (c.st === "fam" || c.st === "kid" || c.id === C.leader) && c.loc === old) c.loc = pid;
  for (const c of officers(s, cid)) c.loy = Math.max(0, c.loy - 3);
  log(s, `Dvůr se stěhuje do nomu ${p.n}.${pid === "u21" ? " Na stejném místě založil Amenemhat I. sídlo Itj-taui – „Ten, kdo se zmocnil Obou zemí“ – mezi Horním a Dolním Egyptem." : ""}`, "rod", [cid]);
  assignLords(s, cid); return null;
}
// kořist z dobytého nomu (rozhoduje hráč)
const KORIST = { korist: { view: (s, d) => { const C = P(s), p = s.provs[d.pid], g = Math.round(1500 + p.pop * 60); return { t: `Kořist z nomu ${p.n}`, tx: `Vojsko vstoupilo do nomu ${p.n}. Vítězové brávali zlato, dobytek a zajatce; Ahmose, syn Ebany, si ve své hrobce zapsal každého zajatce, kterého odvedl.`,
  ch: [{ t: `Vydrancovat (≈ ${fmtN(g)} debenů a obecní zásoby)`, d: "spokojenost nomu −15, maat −2, sláva +10", f: () => { C.deben += g; C.grain += p.stock; p.stock = 0; p.loy = Math.max(0, p.loy - 15); C.maat = Math.max(0, C.maat - 2); C.prestige += 10; return null; } },
    { t: "Odvést zajatce na práci do sídla", d: "obyvatelé nomu −1,5 tis., sídlo +1,5 tis., spokojenost nomu −8", f: () => { const cp = s.provs[C.capital]; const n = Math.min(1.5, p.pop * 0.1); p.pop = r1(p.pop - n); if (cp) cp.pop = r1(cp.pop + n); p.loy = Math.max(0, p.loy - 8); return null; } },
    { t: "Ušetřit nom a jeho chrámy", d: "spokojenost nomu +10, maat +2", f: () => { p.loy = Math.min(100, p.loy + 10); C.maat = Math.min(100, C.maat + 2); return null; } }] }; } } };
Object.assign(EVENTS, KORIST); EVENT_Q.korist = "ebana_avaris";

// měsíční účinky boha a jména
function mechTick(s) {
  for (const C of aliveClans(s)) {
    const g = stateGod(s, C.id);
    if (g === "amon" || g === "re") C.maat = Math.min(100, C.maat + 0.06);
    if (C.horus === "wahanch" && C.maat > 50) C.maat = Math.min(100, C.maat + (C.maat - 50) * 0.01);
    if (C.horus === "necer") { C.maat = Math.min(100, C.maat + 0.1); if (C.estates) C.estates.knezi = Math.min(100, C.estates.knezi + 0.1); }
    if (C.horus === "nacht") for (const p of clanProvs(s, C.id)) if (p.train < 60) p.train = Math.min(60, p.train + 0.8);
    if (g === "sutech") for (const x of aliveClans(s)) if (x.cul === "aam" || x.cul === "hyk") if (x.id !== C.id && chance(s, 0.1)) addRel(s, C.id, x.id, 1);
  }
}
