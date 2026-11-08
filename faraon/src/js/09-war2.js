// Zádušní nadace, převoz obilí lodí, zajatci jako pracovní síla, postoj vojska, svátek Mina.

// ---------- zádušní nadace ----------
// Nomarcha Hapdžefai z Asjútu (12. dynastie) uzavřel s kněžími deset smluv, aby mu po smrti přinášeli obětiny.
const NADACE_MAX = 3;
function foundNadace(s, cid) {
  const C = s.clans[cid]; C.nadace = C.nadace || 0; if (C.nadace >= NADACE_MAX) return "Více nadací kněží neudrží.";
  if (!pay(s, cid, 3000, 10000)) return "Nadace stojí 3 000 debenů a 10 000 charů obilí.";
  C.nadace++; if (C.estates) C.estates.knezi = Math.min(100, C.estates.knezi + 3);
  log(s, `Panovník uzavřel s kněžími smlouvu o zádušní nadaci: pole a příděly výměnou za obětiny u jeho sochy navěky (jako nomarcha Hapdžefai z Asjútu). Nadací: ${C.nadace}.`, "chramy", [cid]); return null;
}
// ---------- převoz obilí lodí ----------
function shipGrain(s, cid, fromId, toId, q) {
  const a = s.provs[fromId], b = s.provs[toId]; q = Math.round(+q || 0);
  if (!a || !b || a.owner !== cid || b.owner !== cid || a === b) return "Vyber dva vlastní nomy.";
  if (!TERRAIN[a.ter].nile || !TERRAIN[b.ter].nile) return "Obilí se vozí po Nilu – oba nomy musí ležet u řeky.";
  if (q < 1000) return "Zadej aspoň 1 000 charů."; if (a.stock < q) return `V obecních sýpkách nomu ${a.n} je jen ${fmtN(a.stock)} charů.`;
  const cost = Math.round(q / (hasTech(s, cid, "clun") ? 100 : 50)); if (!pay(s, cid, cost)) return `Převoz stojí ${fmtN(cost)} debenů.`;
  a.stock -= q; b.stock += Math.round(q * 0.95); b.loy = Math.min(100, b.loy + (b.hunger > 0.05 ? 6 : 1));
  if (isPlayer(s, cid)) log(s, `Lodě převezly ${fmtN(q)} charů obilí z nomu ${a.n} do nomu ${b.n} (5 % se cestou ztratilo, převoz za ${fmtN(cost)} debenů).`, "hospodarstvi", [cid]);
  return null;
}
// ---------- zajatci ----------
// Vítězové odváděli zajatce jako pracovní sílu; papyrus Brooklyn (13. dynastie) uvádí v jedné domácnosti desítky asijských služebníků.
function gainCaptives(s, cid, n) { const C = s.clans[cid]; if (!C) return; C.zajatci = Math.round((C.zajatci || 0) + n); }
function captivesBuild(s, cid) {
  const C = s.clans[cid]; if ((C.zajatci || 0) < 300) return "Potřebuješ aspoň 300 zajatců.";
  let n = 0; for (const p of clanProvs(s, cid)) if (p.build && C.zajatci >= 300) { p.build.left = Math.max(0.5, p.build.left - 1.5); C.zajatci -= 300; n++; }
  if (C.tomb.active && C.zajatci >= 300) { C.tomb.left -= 1.5; C.zajatci -= 300; n++; }
  if (!n) return "Nic se nestaví.";
  log(s, `Zajatci pracují na ${nWord(n)} stavbách – ty pokročily o měsíc a půl.`, "stavby", [cid]); return null;
}
const nWord = n => (n === 1 ? "jedné" : n === 2 ? "dvou" : n === 3 ? "třech" : n === 4 ? "čtyřech" : String(n));
function captivesSettle(s, cid, pid) {
  const C = s.clans[cid], p = s.provs[pid || C.capital]; if (!p || p.owner !== cid) return "Vyber vlastní nom."; if ((C.zajatci || 0) < 200) return "Potřebuješ aspoň 200 zajatců.";
  const n = C.zajatci; p.pop = r1(p.pop + n / 1000); p.agri = Math.min(agriCap(s, p), p.agri + Math.round(n / 500)); C.zajatci = 0; p.loy = Math.max(0, p.loy - 2);
  log(s, `${fmtN(n)} zajatců bylo usazeno v nomu ${p.n} jako rolníci a služebníci chrámových a palácových statků.`, "hospodarstvi", [cid]); return null;
}
// ---------- postoj vojska v bitvě ----------
const STANCES = { utok: { n: "útočný", atk: 1.12, loss: 1.15, brk: 25 }, vyvazeny: { n: "vyvážený", atk: 1, loss: 1, brk: 30 }, opatrny: { n: "opatrný", atk: 0.9, loss: 0.8, brk: 45 } };
const stanceOf = x => STANCES[(x && x.stance) || "vyvazeny"] || STANCES.vyvazeny;
// ---------- svátek Mina při sklizni ----------
const EV4 = {
  min: { view: (s, d) => { const C = P(s); return { t: "Svátek Mina", tx: "Začíná sklizeň. Slaví se svátek Mina, boha plodnosti, doložený už od Staré říše: socha boha vychází v průvodu z chrámu a panovník podle pozdějších zobrazení žne první snop obilí.",
    ch: [{ t: "Vystrojit svátek (600 debenů, 4 000 charů)", d: "lid +4, maat +2", f: () => { if (!pay(s, s.player, 600, 4000)) return "Nedostatek prostředků."; C.estates.lid = Math.min(100, C.estates.lid + 4); C.maat = Math.min(100, C.maat + 2); return null; } },
      { t: "Nechat slavit kněze Mina", d: "maat +1", f: () => { C.maat = Math.min(100, C.maat + 1); return null; } }] }; } },
};
Object.assign(EVENTS, EV4); EVENT_Q.min = "hapi_zdrav";
// měsíční účinky nadací
function nadaceTick(s) { for (const C of aliveClans(s)) if (C.nadace) { C.grain -= C.nadace * 400; C.maat = Math.min(100, C.maat + C.nadace * 0.05); } }
