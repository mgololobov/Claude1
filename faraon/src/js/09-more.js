// Úkoly rádců, obchodní cesty, výchova synů poddaných na dvoře (kap), další události.

// ---------- obchodní cesty ----------
const ROUTES = [
  { id: "nil", n: "Nil mezi Memfidou a Thébami", provs: ["l1", "u20", "u15", "u13", "u8", "u4"], base: 1000, col: "#1d4f9a", d: "hlavní tepna země: obilí, kámen a zboží plují po proudu i proti němu" },
  { id: "jih", n: "Nilská cesta do Núbie", provs: ["u1", "n_wawat", "n_buhen", "n_semna", "n_sai", "n_kerma"], base: 900, col: "#6b4a2b", d: "zlato, eben, slonovina a kůže z Kuše přes Elefantinu" },
  { id: "hammamat", n: "Vádí Hammámát k Rudému moři", provs: ["u5", "ham", "sau"], base: 600, col: "#a8381e", d: "stezka z Koptu k přístavu Sauu, odkud se plulo do Puntu" },
  { id: "oazy", n: "Oázová cesta", provs: ["u8", "o_kha", "o_dak"], base: 400, col: "#7a8f2e", d: "pouštní stezky z Abydu do oáz Charga a Dachla, užívané už za Staré říše" },
  { id: "horus", n: "Cesty Horovy", provs: ["l14", "l20", "sin"], base: 700, col: "#c9952b", d: "cesty přes Tjaru a Sinaj do Kenaanu" },
  { id: "byblos", n: "Mořská cesta do Byblu", provs: ["l6", "lx", "lav"], base: 800, col: "#2e7d5b", d: "lodě z přístavů Delty k cedrům Libanonu" },
];
// Cesta vynáší, když ji nepřeruší válka mezi pány nomů na ní; podíl podle počtu vlastních nomů.
function routeState(s, R) {
  const owners = [...new Set(R.provs.map(id => s.provs[id].owner))];
  for (const a of owners) for (const b of owners) if (a < b && atWar(s, a, b)) return { open: false, owners };
  if (R.provs.some(id => s.provs[id].siege)) return { open: false, owners };
  return { open: true, owners };
}
function routeIncome(s, cid) {
  let g = 0; const lm = [0.85, 1, 1.2][lw(s, cid, "obchod")] * (lw(s, cid, "cizinci") === 0 ? 0.9 : 1); for (const R of ROUTES) { const st_ = routeState(s, R); if (!st_.open) continue; const mine = R.provs.filter(id => s.provs[id].owner === cid).length; if (!mine) continue;
    const allFriendly = st_.owners.every(o => o === cid || friendly(s, cid, o) || (s.trade[pairKey(cid, o)])); g += R.base * (R.id === "jih" && hasTech(s, cid, "sehel") ? 1.3 : 1) * mine / R.provs.length * (allFriendly ? 1.25 : 1) * (mine === R.provs.length ? 1.2 : 1); }
  return g * lm;
}

// ---------- úkoly rádců ----------
const owns = (s, id) => s.provs[id].owner === s.player || (s.clans[s.provs[id].owner].vassalOf === s.player);
const MISSIONS = {
  // obecné
  sypky: { n: "Plné sýpky", d: "Naplnit státní sýpky na 300 tisíc charů", ok: s => P(s).grain >= 300000, r: "maat +3, sláva +20", rf: s => { P(s).maat = Math.min(100, P(s).maat + 3); P(s).prestige += 20; } },
  chramy: { n: "Domy bohů", d: "Mít v nomech chrámy celkem na 6 úrovních", ok: s => sum(clanProvs(s, s.player).map(p => p.b.chram || 0)) >= 6, r: "kněží +10, maat +3", rf: s => { const C = P(s); C.estates.knezi = Math.min(100, C.estates.knezi + 10); C.maat = Math.min(100, C.maat + 3); } },
  hrobka: { n: "Dům věčnosti", d: "Dokončit tři fáze hrobky panovníka", ok: s => P(s).tomb.stage >= 3, r: "maat +5", rf: s => { P(s).maat = Math.min(100, P(s).maat + 5); } },
  vyprava: { n: "Daleké cesty", d: "Úspěšně dokončit výpravu", ok: s => !!s.flags["exp_" + s.player], r: "sláva +30", rf: s => { P(s).prestige += 30; } },
  deset: { n: "Deset nomů", d: "Vládnout deseti nomům", ok: s => clanProvs(s, s.player).length >= 10, r: "sláva +40, 2 000 debenů", rf: s => { P(s).prestige += 40; P(s).deben += 2000; } },
  cesta: { n: "Pán cesty", d: "Ovládnout celou jednu obchodní cestu", ok: s => ROUTES.some(R => R.provs.every(id => s.provs[id].owner === s.player)), r: "písaři +8, 3 000 debenů", rf: s => { const C = P(s); C.estates.pisari = Math.min(100, C.estates.pisari + 8); C.deben += 3000; } },
  // 1560 Théby – tažení Kamoseho a Ahmose
  tribut: { n: "Konec poplatků", d: "Přestat odvádět poplatky Hyksósům", ok: s => !P(s).tributeTo, r: "sláva +40, úředníci +5 věrnosti", rf: s => { P(s).prestige += 40; for (const c of officers(s, s.player)) c.loy = Math.min(100, c.loy + 5); } },
  nefrusy: { n: "Nefrusy", d: "Dobýt Hermopoli a Nefrusy Tetiho, syna Pepiho (Kamoseho první tažení)", ok: s => owns(s, "u15"), r: "sláva +40", rf: s => { P(s).prestige += 40; } },
  memfis: { n: "Bílé zdi", d: "Ovládnout Memfis", ok: s => owns(s, "l1"), r: "maat +5, sláva +60", rf: s => { P(s).maat = Math.min(100, P(s).maat + 5); P(s).prestige += 60; } },
  saruhen: { n: "Obležení Šaruhenu", d: "Dobýt Šaruhen v jižním Kenaanu (podle Ahmose, syna Ebany, obléhán tři roky)", ok: s => owns(s, "sar"), r: "sláva +80, maat +3", rf: s => { P(s).prestige += 80; P(s).maat = Math.min(100, P(s).maat + 3); } },
  avaris: { n: "Pád Avaridu", d: "Dobýt Avaris, sídlo Hyksósů (jako Ahmose I.)", ok: s => owns(s, "lav"), r: "maat +8, sláva +100", rf: s => { P(s).maat = Math.min(100, P(s).maat + 8); P(s).prestige += 100; } },
  buhen: { n: "Brána jihu", d: "Získat zpět pevnost Buhen od Kuše", ok: s => owns(s, "n_buhen"), r: "sláva +40, 3 000 debenů", rf: s => { P(s).prestige += 40; P(s).deben += 3000; } },
  // 1560 Hyksósové
  theby: { n: "Jih pod kontrolou", d: "Ovládnout Théby nebo je učinit poddanými", ok: s => owns(s, "u4") || (s.clans.thebes && s.clans.thebes.vassalOf === s.player), r: "sláva +80", rf: s => { P(s).prestige += 80; } },
  kus: { n: "Spojenectví s Kuší", d: "Mít spojenectví s Kuší po pět let hry", ok: s => s.turn >= 60 && s.clans.kush && allied(s, s.player, "kush"), r: "vztah s Kuší +20, sláva +30", rf: s => { addRel(s, s.player, "kush", 20); P(s).prestige += 30; } },
  // 2070 Théby a Hérakleopolis
  asjut: { n: "Asjút", d: "Zlomit odpor nomarchů Asjútu", ok: s => owns(s, "u13"), r: "sláva +50", rf: s => { P(s).prestige += 50; } },
  herakl: { n: "Dům Chetiho", d: "Dobýt Hérakleopoli", ok: s => owns(s, "u20"), r: "maat +5, sláva +80", rf: s => { P(s).maat = Math.min(100, P(s).maat + 5); P(s).prestige += 80; } },
  thinis: { n: "Thinis a Abydos", d: "Ovládnout posvátnou Thinidu", ok: s => owns(s, "u8"), r: "maat +4, sláva +40", rf: s => { P(s).maat = Math.min(100, P(s).maat + 4); P(s).prestige += 40; } },
  delta: { n: "Hradby na východě", d: "Pevnosti úrovně 3 v Heliopoli a Bubastidě (rada Merikareovi)", ok: s => ["l13", "l18"].every(id => s.provs[id].owner === s.player && s.provs[id].castle >= 3), r: "maat +3, sláva +30", rf: s => { P(s).maat = Math.min(100, P(s).maat + 3); P(s).prestige += 30; } },
  theby2: { n: "Hnízdo Intefovců", d: "Dobýt Théby", ok: s => owns(s, "u4"), r: "sláva +80", rf: s => { P(s).prestige += 80; } },
  // 2120 Anchtifi a ostatní
  elef: { n: "Spojenec z Elefantiny", d: "Ovládnout Elefantinu nebo ji mít za poddanou", ok: s => owns(s, "u1"), r: "sláva +30", rf: s => { P(s).prestige += 30; } },
  buhenk: { n: "Pevnosti kataraktu", d: "Držet Buhen i Semnu", ok: s => owns(s, "n_buhen") && owns(s, "n_semna"), r: "sláva +40", rf: s => { P(s).prestige += 40; } },
  deffufak: { n: "Chrám Kermy", d: "Dokončit Západní deffufu", ok: s => monDone(s, "deffufa") && monState(s, "deffufa").by === s.player, r: "maat +5, sláva +50", rf: s => { P(s).maat = Math.min(100, P(s).maat + 5); P(s).prestige += 50; } },
  elefk: { n: "Brána Egypta", d: "Ovládnout Elefantinu", ok: s => owns(s, "u1"), r: "sláva +60, 3 000 debenů", rf: s => { P(s).prestige += 60; P(s).deben += 3000; } },
};
function missionList(s) {
  const p = s.player, sc = s.scen, L = ["sypky", "chramy", "hrobka", "vyprava", "deset", "cesta"];
  if (sc === "sip" && p === "thebes") L.unshift("tribut", "nefrusy", "memfis", "avaris", "buhen");
  if (sc === "ahm" && p === "thebes") L.unshift("memfis", "avaris", "saruhen", "buhen");
  if (sc === "ahm" && p === "hyksos") L.unshift("theby", "kus");
  if (sc === "hyk" && (P(s).cul === "eg" || P(s).cul === "hyk")) L.unshift("memfis");
  if (sc === "sip" && p === "hyksos") L.unshift("theby", "kus");
  if (["fip", "mt2", "anch"].includes(sc) && p === "thebes") L.unshift("asjut", "herakl", "memfis");
  if (["fip", "mt2", "anch"].includes(sc) && p === "herak") L.unshift("thinis", "delta", "theby2");
  if (sc === "anch" && p === "anch") L.unshift("elef", "theby2");
  if (p === "kush" || p === "kerma") L.unshift("elefk", "buhenk", "deffufak");
  if (sc === "mt2" && p === "thebes") L.unshift("thinis");
  return L;
}
function missionTick(s) {
  const C = P(s); if (!C || !C.alive) return; C.missions = C.missions || {};
  for (const id of missionList(s)) { if (C.missions[id]) continue; const M = MISSIONS[id]; if (M.ok(s)) { C.missions[id] = s.turn; M.rf(s); log(s, `Splněn úkol „${M.n}“: ${M.d}. Odměna: ${M.r}.`, "rod", [s.player]); } }
}

// ---------- kap: synové poddaných vychovávaní na dvoře ----------
function takeKap(s, a, b) {
  const B = s.clans[b]; if (B.vassalOf !== a) return "Jen poddaný rod posílá syny ke dvoru."; if ((B.kapUntil || 0) > s.turn) return "Jeho syn už na dvoře žije.";
  B.kapUntil = s.turn + 120; addRel(s, a, b, 15); log(s, `Syn vládce rodu ${B.house} bude vychováván na dvoře mezi „dětmi kapu“ – zárukou věrnosti jeho otce.`, "diplomacie", [a, b]); return null;
}

// ---------- další události ----------
const EV3 = {
  obnova: { view: (s, d) => { const C = P(s), p = s.provs[d.pid]; return { t: "Zpustlá svatyně předků", tx: `V nomu ${p.n} stojí zpustlá svatyně dávného krále: zdi se rozpadají, obětiny ustaly. Egyptští panovníci se chlubili, že obnovili, „co našli zchátralé“, a dávali na památky předků vytesat zprávu o své obnově.`,
    ch: [{ t: "Obnovit svatyni a obnovit obětiny (1 500 debenů, 6 000 charů)", d: "maat +4, kněží +4, spokojenost nomu +5", f: () => { if (!pay(s, s.player, 1500, 6000)) return "Nedostatek prostředků."; C.maat = Math.min(100, C.maat + 4); C.estates.knezi = Math.min(100, C.estates.knezi + 4); p.loy = Math.min(100, p.loy + 5); return null; } },
      { t: "Použít kameny na vlastní stavby", d: "+800 debenů, maat −3", f: () => { C.deben += 800; C.maat = Math.max(0, C.maat - 3); return null; } }] }; } },
  dopis_mrtvym: { view: (s, d) => { const C = P(s), c = chr(s, d.cid); return { t: "Dopis mrtvému", tx: `Vdova po hodnostáři ze služeb ${c ? c.n : "dvora"} napsala na misku s obětinami dopis svému zesnulému muži: prosí ho, aby se u soudu bohů zastal rodiny proti nespravedlnosti. Takové „dopisy mrtvým“ se dochovaly z Prvního přechodného období a Střední říše.`,
    ch: [{ t: "Ujmout se rodiny a dát jí příděly", d: "maat +2, lid +2, úředníci +2 věrnosti", f: () => { if (!pay(s, s.player, 0, 1500)) return "Obilí nestačí."; C.maat = Math.min(100, C.maat + 2); C.estates.lid = Math.min(100, C.estates.lid + 2); for (const x of officers(s, s.player)) x.loy = Math.min(100, x.loy + 2); return null; } },
      { t: "Nechat věc kněžím", d: "", f: () => null }] }; } },
  hranice: { view: (s, d) => { const C = P(s), a = s.provs[d.a], b = s.provs[d.b]; return { t: "Spor o hranici nomů", tx: `Nomy ${a.n} a ${b.n} se přou o pole a hraniční kameny. Nomarcha Chnumhotep II. v Beni Hasanu zapsal, jak král Amenemhat I. „ustanovil hraniční stély“ mezi nomy podle toho, co stálo v písemných záznamech.`,
    ch: [{ t: "Poslat písaře, ať hranici vyměří podle záznamů (600 debenů)", d: "oba nomy +6 spokojenosti, maat +1", f: () => { if (!pay(s, s.player, 600)) return "Nedostatek debenů."; a.loy = Math.min(100, a.loy + 6); b.loy = Math.min(100, b.loy + 6); C.maat = Math.min(100, C.maat + 1); return null; } },
      { t: `Rozhodnout ve prospěch nomu ${a.n}`, d: `${a.n} +10, ${b.n} −10`, f: () => { a.loy = Math.min(100, a.loy + 10); b.loy = Math.max(0, b.loy - 10); return null; } },
      { t: `Rozhodnout ve prospěch nomu ${b.n}`, d: `${b.n} +10, ${a.n} −10`, f: () => { b.loy = Math.min(100, b.loy + 10); a.loy = Math.max(0, a.loy - 10); return null; } }] }; } },
  poutnici: { view: (s, d) => { const C = P(s); return { t: "Poutníci v Abydu", tx: "Do Abydu přišly zástupy poutníků, aby u „Terasy velkého boha“ postavily stély a kaple a měly podíl na Usirových mystériích. Kameníci, písaři a kněží mají plné ruce práce.",
    ch: [{ t: "Vybírat poplatky od stavitelů kaplí", d: "+1 200 debenů, kněží −3", f: () => { C.deben += 1200; C.estates.knezi = Math.max(0, C.estates.knezi - 3); return null; } },
      { t: "Ponechat výnos chrámu", d: "maat +2, kněží +4", f: () => { C.maat = Math.min(100, C.maat + 2); C.estates.knezi = Math.min(100, C.estates.knezi + 4); return null; } }] }; } },
  byblos_posel: { view: (s, d) => { const C = P(s); return { t: "Posel z Byblu", tx: "Do přístavu v Deltě připlula loď z Byblu. Tamní vládci užívali egyptský titul hatia, psali se hieroglyfy a posílali do Egypta cedrové dřevo a olej výměnou za zlato a papyrus.",
    ch: [{ t: "Vyměnit zlato za cedr (1 500 debenů)", d: "cedr pro dvě stavby, sláva +10", f: () => { if (!pay(s, s.player, 1500)) return "Nedostatek debenů."; C.cedar += 2; C.prestige += 10; return null; } },
      { t: "Poslat dary a papyrus", d: "+600 debenů za papyrus", f: () => { C.deben += 600; return null; } }] }; } },
  princ: { view: (s, d) => { const C = P(s), k = chr(s, d.cid); return { t: "Výchova prince", tx: `${k.n} vyrůstá. Princové se učili psát v „domě knih“ s dětmi hodnostářů, cvičili se v lukostřelbě, plavání a řízení lodi; texty jako Ponaučení pro Merikarea je připravovaly na vládu.`,
    ch: [{ t: "Dát ho učiteli z domu života", d: "moudrost a správa +8", f: () => { k.edu = 1; k.roz = Math.min(95, (k.roz || 40) + 8); k.spr = Math.min(95, (k.spr || 40) + 8); return null; } },
      { t: "Svěřit ho veliteli vojska", d: "velení a statečnost +8", f: () => { k.edu = 1; k.ved = Math.min(95, (k.ved || 40) + 8); k.uda = Math.min(95, (k.uda || 40) + 8); return null; } }] }; } },
};
Object.assign(EVENTS, EV3);
Object.assign(EVENT_Q, { obnova: "merikare_maat", dopis_mrtvym: "harfenik", poutnici: "ct1130", princ: "merikare_slovo", byblos_posel: "namornik" });
function moreEventOpts2(s) {
  const C = P(s), opts = [];
  const any = someOwnProv(s, p => p.flags.includes("e")); if (any) opts.push(["obnova", { pid: any.id }]);
  const o = officers(s, s.player).filter(c => !c.dyn); if (o.length) opts.push(["dopis_mrtvym", { cid: pick(s, o).id }]);
  const pairs = []; for (const p of clanProvs(s, s.player)) for (const n of p.nb) if (s.provs[n].owner === s.player && p.id < n && TERRAIN[p.ter].nile && TERRAIN[s.provs[n].ter].nile) pairs.push([p.id, n]);
  if (pairs.length) { const [a, b] = pick(s, pairs); opts.push(["hranice", { a, b }]); }
  if (s.provs.u8.owner === s.player) opts.push(["poutnici", {}]);
  if (["l6", "lx", "lav", "l14"].some(id => s.provs[id].owner === s.player)) opts.push(["byblos_posel", {}]);
  const kid = Object.values(s.chars).find(c => c.cl === s.player && c.dyn && c.st === "kid" && c.sex === "m" && age(s, c) >= 8 && !c.edu); if (kid) { opts.push(["princ", { cid: kid.id }]); }
  return opts;
}
