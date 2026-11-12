// Další vynálezy a tři mechaniky. Každá položka uvádí, čím je doložena; do hry jsou vzaty jen věci známé nejpozději
// z doby, v níž se hraje (Střední říše a Druhé přechodné období). Záměrně chybí šáduf, vodní hodiny a nožní měchy – ty jsou až z Nové říše.
const TECHS3 = {
  sane: { n: "Saně a mokrý písek", cat: "Stavitelství", cost: 90, d: "těžké bloky a sochy se táhnou na saních po písku, který se před nimi polévá vodou (výjev s kolosem v hrobce Džehutihotepa v Dér el-Berše, 12. dynastie): stavby v nomech o pětinu rychlejší" },
  sopdet: { n: "Východ hvězdy Sopdet", cat: "Náboženství a učenost", cost: 100, req: ["hvezdy"], d: "kněží předem ohlašují první ranní východ Sopdet (Síria), který přichází s Novým rokem a záplavou (dopis z chrámového archivu v Lahúnu, 7. rok Senusreta III.): na Nový rok maat +1 a kněží +2" },
  egmodr: { n: "Egyptská modř", cat: "Řemesla", cost: 70, req: ["fajans"], d: "umělé modré barvivo pálené z písku, mědi a vápence, užívané od Staré říše: výnos nomů +3 %" },
  vahy: { n: "Závaží a váhy", cat: "Správa", cost: 70, req: ["pisari"], d: "kamenná závaží s vyznačenou hodnotou a rovnoramenné váhy na kov (závaží jsou známa od Staré říše, jednotka deben): trh smění o čtvrtinu víc obilí" },
  kanal: { n: "Kanál u prvního kataraktu", cat: "Stavitelství", cost: 120, req: ["flotila"], d: "průplav vysekaný ve skále, kterým lodě obeplují peřeje; Senusret III. ho v 8. roce vlády dal obnovit a nazval „Krásné jsou cesty Chakaurea“ (nápis na ostrově Sehel): kdo drží Elefantinu, má +100 debenů měsíčně a její obchod roste" },
  vosk: { n: "Lití na ztracený vosk", cat: "Řemesla", cost: 90, req: ["bronz"], d: "model z vosku se obalí hlínou, vosk se vytaví a forma se zalije kovem; tak vznikaly měděné a bronzové sošky Střední říše: v nomech s dílnami roste řemeslo a obchod (+1 ročně)" },
  slovniky: { n: "Seznamy slov", cat: "Náboženství a učenost", cost: 80, req: ["pisari"], d: "soupisy jmen ptáků, ryb, rostlin, měst a pevností uspořádané podle druhu (Ramesseovské onomastikon z konce Střední říše): +1,5 bodu vědění měsíčně" },
};
Object.assign(TECHS, TECHS3); for (const k of Object.keys(TECHS3)) if (!TECH_IDS.includes(k)) TECH_IDS.push(k);
var _marketCap0 = marketCap;
marketCap = function (s, cid) { return Math.round(_marketCap0(s, cid) * (hasTech(s, cid, "vahy") ? 1.25 : 1)); };
function techTick3(s) {
  for (const C of aliveClans(s)) {
    if (C.type === "kmen") continue; const T = k => hasTech(s, C.id, k), ps = clanProvs(s, C.id); if (!ps.length) continue;
    if (T("sane")) for (const p of ps) if (p.build && p.build.left > 0.4) p.build.left = Math.max(0.3, p.build.left - 0.2);
    if (T("egmodr")) C.deben += sum(ps.map(p => provDeben(s, p))) * 0.03;
    if (T("kanal") && s.provs.u1 && s.provs.u1.owner === C.id) { C.deben += 100; if (s.month === 0) s.provs.u1.com = Math.min(comCap(s, s.provs.u1), s.provs.u1.com + 1); }
    if (T("slovniky") && C.res.cur) C.res.pts += 1.5;
    if (s.month === 0) {
      if (T("sopdet")) { C.maat = Math.min(100, C.maat + 1); if (C.estates) C.estates.knezi = Math.min(100, C.estates.knezi + 2); }
      if (T("vosk")) for (const p of ps) if (p.b.dilny) p.com = Math.min(comCap(s, p), p.com + 1);
    }
    // děti kapu: vztah se po dobu výchovy pomalu zlepšuje
    if (C.kap) for (const [t, until] of Object.entries(C.kap)) { if (until > s.turn && s.clans[t] && s.clans[t].alive && !atWar(s, C.id, t)) addRel(s, C.id, t, 1); }
  }
}
var _worldTick3 = worldTick;
worldTick = function (s) { _worldTick3(s); techTick3(s); };

// ---------- Soupis domácností a dobytka ----------
// Soupisy (wpwt) domácností vojáků a kněží se dochovaly v papyrech z Lahúnu (12.–13. dynastie); počítání dobytka před písaři
// ukazuje dřevěný model z hrobky Meketrea v Thébách. Ve Staré říši se podle „počítání“ dokonce datovaly roky vlády.
function census(s, cid) {
  const C = s.clans[cid]; if (!C || C.type === "kmen") return "Kmeny soupisy nevedou.";
  if ((C.last.soupis ?? -99) > s.turn - 24) return `Další soupis lze nařídit za ${C.last.soupis + 24 - s.turn} měs.`;
  const ps = clanProvs(s, cid), gain = Math.round(sum(ps.map(p => provDeben(s, p))) * 2 * (hasTech(s, cid, "katastr") ? 1.25 : 1));
  C.last.soupis = s.turn; C.deben += gain; for (const p of ps) p.loy = clamp(p.loy - 3, 0, 100);
  if (C.estates) { C.estates.pisari = Math.min(100, C.estates.pisari + 4); C.estates.lid = Math.max(0, C.estates.lid - 2); }
  log(s, `Písaři sepsali domácnosti a spočítali dobytek ve všech nomech: do pokladny přibylo ${fmtN(gain)} debenů na nedoplatcích, lid reptá (spokojenost −3).`, "hospodarstvi", [cid]);
  if (isPlayer(s, cid)) queueEvent(s, "soupis", { gain });
  return null;
}
// ---------- Zlato chrabrosti ----------
// „Zlato chrabrosti“ (nbw n qnt) dostal podle svého životopisu sedmkrát Ahmose, syn Ebany; zlaté mouchy se našly v pohřbu královny Ahhotep.
// Už stéla Sobekchua (Senusret III.) líčí odměnu za statečnost: hůl z elektra, luk a dýku.
function goldOfValor(s, cid) {
  const C = s.clans[cid]; if (!C) return "Neznámý rod.";
  if ((C.last.zlato ?? -99) > s.turn - 12) return `Další vyznamenání lze udělit za ${C.last.zlato + 12 - s.turn} měs.`;
  const won = s.battles.find(b => b.t >= s.turn - 6 && (b.win === "A" ? b.a : b.b) === cid);
  if (!won) return "Zlato chrabrosti se uděluje po vítězné bitvě (v posledním půlroce žádná nebyla).";
  if (C.deben < 500) return "Chybí 500 debenů ve zlatě.";
  C.deben -= 500; C.last.zlato = s.turn; C.prestige += 8;
  for (const p of clanProvs(s, cid)) p.train = Math.min(100, p.train + 3);
  for (const c of officers(s, cid)) if (!c.dyn) c.loy = Math.min(100, c.loy + 4);
  log(s, `Panovník před celým vojskem udělil zlato chrabrosti za bitvu u nomu ${s.provs[won.place] ? s.provs[won.place].n : "?"}: výcvik posádek +3, věrnost úředníků +4, sláva +8.`, "valka", [cid]);
  if (isPlayer(s, cid)) queueEvent(s, "zlato_chvaly", { place: won.place });
  return null;
}
// ---------- Děti kapu ----------
// Titul „dítě kapu“ (ẖrd n kꜣp) nesli od Střední říše lidé vychovaní v královském paláci, mezi nimi Núbijci; výchova synů cizích
// vládců u dvora je jako záměrná politika výslovně doložena až za Thutmose III., pro starší dobu jde o pravděpodobný výklad titulu.
function takeToKap(s, cid, target) {
  const C = s.clans[cid], T = s.clans[target]; if (!C || !T || !T.alive) return "Neznámý rod.";
  if (C.type === "kmen") return "Kmeny dvorskou školu nemají.";
  if (C.t !== "král") return "Kap je součást královského paláce; nomarcha ho nemá.";
  if (atWar(s, cid, target)) return "S nepřítelem ve válce to nejde.";
  if (!(T.type === "kmen" || T.cul === "nub" || T.cul === "aam" || T.cul === "lib")) return "Do kapu se brali synové cizích vládců a náčelníků, ne egyptských rodů.";
  C.kap = C.kap || {}; if ((C.kap[target] || 0) > s.turn - 24) return "Syn tohoto vládce už v kapu je.";
  if (C.deben < 600) return "Chybí 600 debenů na dary a výchovu.";
  C.deben -= 600; C.kap[target] = s.turn + 36; addRel(s, cid, target, 12);
  log(s, `Syn vládce rodu ${T.house} byl přijat do kapu a vyrůstá s královskými dětmi: vztah +12 a další tři roky pomalu roste.`, "diplomacie", [cid]);
  return null;
}
Object.assign(EVENTS, {
  soupis: { view: (s, d) => ({ t: "Soupis domácností a dobytka", tx: `Písaři usedli pod přístřešek, pastevci před nimi prohánějí stáda a hlava každé domácnosti hlásí jména svých lidí. Co kdo zatajil, vyšlo najevo: do pokladny přibylo ${fmtN(d.gain || 0)} debenů. Takové soupisy známe z papyrů z Lahúnu a počítání dobytka z dřevěného modelu v hrobce Meketrea.`, q: quoteTag(s, ["pisari"]), ch: [{ t: "Ať je vše zapsáno", d: "spokojenost nomů −3, písaři +4", f: () => null }] }) },
  zlato_chvaly: { view: (s, d) => ({ t: "Zlato chrabrosti", tx: `Před nastoupeným vojskem dostávají nejstatečnější z bitvy u nomu ${s.provs[d.place] ? s.provs[d.place].n : "?"} zlaté náhrdelníky a zlaté mouchy. Ahmose, syn Ebany, se ve své hrobce chlubí, že zlato chrabrosti dostal sedmkrát.`, q: qOk(s, Q("ebana_zlato")) || quoteTag(s, ["vojsko"]), ch: [{ t: "Sláva statečným", d: "výcvik posádek +3, věrnost úředníků +4, sláva +8", f: () => null }] }) },
});
