// Další události a malé hry: senet, královský lov, navrátilec z ciziny, trpaslík z jižních zemí, kupci z Keftiu,
// kouzelník z papyru Westcar, štír, sen panovníka, vykradený hrob, krokodýl v kanálu, hostina s harfeníkem.
// Každá událost uvádí, z čeho vychází; kde jde jen o obecně doložený jev, netvrdí víc.

// ---------- senet ----------
// Pravidla senetu se nedochovala; hra používá běžnou moderní rekonstrukci (T. Kendall): čtyři vrhací hůlky
// (počet světlých stran 1–4, žádná = 5), 30 polí, pole 15 „dům znovuzrození“, pole 27 „dům vody“ vrací na 15.
function senetThrow(s) { let k = 0; for (let i = 0; i < 4; i++) if (chance(s, 0.5)) k++; return k || 5; }
function senetMove(pos, t, careful) {
  let n = pos + t; if (careful && n === 27) n = 26;
  if (n === 27) return { pos: 15, water: true };
  return { pos: Math.min(30, n), water: false };
}
EVENTS.senet_pozvani = { view: (s, d) => { const C = P(s), st_ = Math.max(200, Math.round(C.deben * 0.05 / 100) * 100);
  return { t: "Partie senetu", tx: `${d.n} tě po večeři vyzývá k partii senetu. Hrací desky s třiceti poli se dávaly i do hrobů – hra „průchodu“ byla zároveň obrazem cesty duše podsvětím. Čtyři vrhací hůlky rozhodnou o tahu; pole 27, „dům vody“, vrací figuru zpět.`,
    ch: [{ t: `Hrát o ${fmtN(st_)} debenů`, d: "vítěz bere vše", f: () => { s.events.unshift({ k: "senet", data: { n: d.n, me: 0, foe: 0, r: 0, stake: st_, kind: "deben", log: [] }, t: s.turn }); return null; } },
      { t: "Hrát o čest", d: "vítězství: sláva +8, prohra: sláva −3", f: () => { s.events.unshift({ k: "senet", data: { n: d.n, me: 0, foe: 0, r: 0, stake: 0, kind: "cest", log: [] }, t: s.turn }); return null; } },
      { t: "Odmítnout", d: "nic se nestane", f: () => null }] }; } };
EVENTS.senet = { view: (s, d) => {
  const C = P(s), end = d.me >= 30 || d.foe >= 30 || d.r >= 12;
  const finish = () => { const win = d.me > d.foe || (d.me === d.foe && chance(s, 0.5));
    if (d.kind === "deben") { if (win) { C.deben += d.stake; } else pay(s, s.player, Math.min(C.deben, d.stake)); } else C.prestige = Math.max(0, C.prestige + (win ? 8 : -3));
    return win ? `Vyhrál jsi partii senetu s hráčem ${d.n}${d.kind === "deben" ? ` a získal ${fmtN(d.stake)} debenů` : ""}.` : `Partii senetu vyhrál ${d.n}${d.kind === "deben" ? `; zaplatil jsi ${fmtN(d.stake)} debenů` : ""}.`; };
  if (end) return { t: "Senet – konec partie", tx: `${d.me >= 30 ? "Tvá figura prošla všemi třiceti poli." : d.foe >= 30 ? `Figura hráče ${d.n} prošla všemi poli dřív.` : "Lampy dohořely; rozhoduje, kdo došel dál."} ${d.log.slice(-2).join(" ")}`, senet: d, ch: [{ t: "Zvednout se od desky", f: finish }] };
  const step = careful => () => {
    const t = senetThrow(s), m = senetMove(d.me, t, careful), t2 = senetThrow(s), m2 = senetMove(d.foe, t2, false);
    const nd = Object.assign({}, d, { me: m.pos, foe: m2.pos, r: d.r + 1, last: [t, t2], log: d.log.concat([`Hodil jsi ${t}${m.water ? " a spadl do domu vody – zpět na pole 15" : ""}; soupeř ${t2}${m2.water ? " a spadl do vody" : ""}.`]) });
    s.events.unshift({ k: "senet", data: nd, t: s.turn }); return null; };
  return { t: `Senet – ${d.r + 1}. hod`, tx: `Ty: pole ${d.me}, ${d.n}: pole ${d.foe}. ${d.log.slice(-1).join(" ")} ${d.me >= 21 && d.me < 27 ? "Pozor, blíží se dům vody (pole 27)!" : ""}`, senet: d,
    ch: [{ t: "Hodit hůlkami a táhnout naplno", d: "rychlejší, ale můžeš spadnout do vody", f: step(false) }, { t: "Hodit a táhnout opatrně", d: "dům vody obejdeš (zastavíš se před ním)", f: step(true) }] };
} };

// ---------- další události ----------
const EV6 = {
  lov: { view: (s, d) => { const C = P(s), L = leaderOf(s, s.player);
    return { t: "Královský lov", tx: `Myslivci hlásí stáda gazel v poušti a hrochy v bažinách. Lov v poušti malovali nomarchové v Beni Hasanu na stěny svých hrobek; král, který harpunuje hrocha, podle staré symboliky přemáhá chaos.`,
      ch: [{ t: "Lov na gazely a antilopy v poušti (200 debenů)", d: "sláva +5, úředníci věrnost +2", f: () => { if (!pay(s, s.player, 200)) return "Nedostatek debenů."; C.prestige += 5; for (const c of officers(s, s.player)) c.loy = Math.min(100, c.loy + 2); return "Lov v poušti se vydařil."; } },
        { t: "Harpunovat hrocha z člunu", d: "sláva +25, maat +1 – ale panovník může být zraněn", f: () => { if (L && chance(s, 0.18)) { L.wound = 3; C.prestige += 5; return `${L.n} byl při lovu zraněn; hroch unikl.`; } C.prestige += 25; C.maat = Math.min(100, C.maat + 1); return "Hroch padl pod královou harpunou."; } },
        { t: "Lov ptáků vrhacím dřevem v papyrových houštinách", d: "klidný den s dvořany: věrnost úředníků +4 (100 debenů)", f: () => { if (!pay(s, s.player, 100)) return "Nedostatek debenů."; for (const c of officers(s, s.player)) c.loy = Math.min(100, c.loy + 4); return "Dvůr strávil den lovem v bažinách."; } }] }; } },
  navratilec: { view: (s, d) => { const C = P(s);
    return { t: "Navrátilec z Retjenu", tx: `Ke dvoru přišel stařec v asijském šatu. Před mnoha lety uprchl ze země a žil mezi Asiaty v Retjenu, kde se oženil a zbohatl; nyní prosí, aby směl zemřít v Egyptě a být pohřben podle egyptského obyčeje. Právě takový návrat líčí Příběh Sinuhetův, sepsaný za 12. dynastie.`,
      ch: [{ t: "Přijmout ho milostivě a dát mu hodnost", d: "nový úředník znalý ciziny; vztahy s Aamu +10", f: () => { const c = genOfficer(s, s.player, C.cul === "hyk" ? "hyk" : "eg", C.capital, { n: d.n, by: s.bce + 62, rank: 2, loy: 90 }); c.roz = Math.max(c.roz, 70); c.traits = ["moudry"]; for (const A of aliveClans(s).filter(x => x.cul === "aam")) addRel(s, s.player, A.id, 10); return `${c.n} vstoupil do tvých služeb.`; } },
        { t: "Přijmout ho jako tlumočníka pro posly", d: "+1 500 debenů z jeho majetku, maat +1", f: () => { C.deben += 1500; C.maat = Math.min(100, C.maat + 1); return null; } },
        { t: "Odmítnout zrádce", d: "kdo utekl, ať zůstane venku – sláva +3", f: () => { C.prestige += 3; return null; } }] }; } },
  trpaslik: { view: (s, d) => { const C = P(s);
    return { t: "Trpaslík z jižních zemí", tx: `Výprava z jihu přivádí trpaslíka, „tanečníka boha“. Král Pepi II. (6. dynastie) kdysi napsal výpravčímu Harchufovi, ať mu takového tanečníka přivede živého a zdravého, že po něm touží víc než po darech ze Sinaje a z Puntu – dopis si Harchuf dal vytesat na průčelí hrobky v Asuánu.`,
      ch: [{ t: "Přijmout ho ke dvoru (500 debenů)", d: "sláva +10, maat +1, kněží +2", f: () => { if (!pay(s, s.player, 500)) return "Nedostatek debenů."; C.prestige += 10; C.maat = Math.min(100, C.maat + 1); C.estates.knezi = Math.min(100, C.estates.knezi + 2); return "Trpaslík tančí při obřadech."; } },
        { t: "Darovat ho chrámu", d: "kněží +5", f: () => { C.estates.knezi = Math.min(100, C.estates.knezi + 5); return null; } },
        { t: "Poslat výpravu zpět", d: "nic", f: () => null }] }; } },
  keftiu: { view: (s, d) => { const C = P(s), g = 8000, dd = Math.round(g * s.market.p * 1.15);
    return { t: "Kupci z Keftiu", tx: `Do přístavu připluli kupci z Keftiu (Kréty) s jemnými malovanými nádobami, olejem a vínem. Krétské nádoby stylu Kamares se našly v Lahúnu i v Abydu${s.bce <= 1560 ? "; v Avaridu se z doby Ahmose I. dochovaly i zbytky fresek v krétském stylu" : ""}.`,
      ch: [{ t: "Koupit jemné zboží pro dvůr (800 debenů)", d: "sláva +12, nomarchové +3", f: () => { if (!pay(s, s.player, 800)) return "Nedostatek debenů."; C.prestige += 12; C.estates.nomarchove = Math.min(100, C.estates.nomarchove + 3); return "Dvůr se chlubí krétskými nádobami."; } },
        { t: `Prodat jim obilí (${fmtN(g)} charů za ${fmtN(dd)} debenů)`, d: "o něco lepší cena než na trhu", f: () => { if (C.grain < g) return "Tolik obilí nemáš."; C.grain -= g; C.deben += dd; return null; } },
        { t: "Poslat je dál", d: "nic", f: () => null }] }; } },
  kouzelnik: { view: (s, d) => { const C = P(s), H = heirsOf(s, s.player)[0];
    return { t: "Kouzelník u dvora", tx: `Starý kouzelník tvrdí, že umí nasadit uťatou hlavu huse tak, že znovu zakejhá. Takového kouzelníka Džediho líčí příběhy o dvoře krále Chufua na papyru Westcar, jehož dochovaný opis pochází z Druhého přechodného období.`,
      ch: [{ t: "Ať to předvede na huse", d: "dvůr se baví: sláva +4, věrnost úředníků +2", f: () => { C.prestige += 4; for (const c of officers(s, s.player)) c.loy = Math.min(100, c.loy + 2); return chance(s, 0.6) ? "Husa vstala a zakejhala – nebo to tak aspoň všichni viděli." : "Kouzlo se nepovedlo, ale smáli se všichni."; } },
        { t: "Požádat ho o věštbu o budoucnosti rodu", d: "nejisté", f: () => { if (chance(s, 0.5)) { C.maat = Math.min(100, C.maat + 2); return `Kouzelník předpověděl ${H ? H.n + "ovi" : "rodu"} slavnou vládu. Lid si to šeptá.`; } C.maat = Math.max(0, C.maat - 1); return "Věštba byla temná a dvůr znejistěl."; } },
        { t: "Vykázat ho", d: "kněží +2", f: () => { C.estates.knezi = Math.min(100, C.estates.knezi + 2); return null; } }] }; } },
  stir: { view: (s, d) => { const C = P(s), c = chr(s, d.cid), med = hasTech(s, s.player, "lekarstvi");
    return { t: "Bodnutí štírem", tx: `Syna hodnostáře ${c ? c.n : ""} bodl štír. Proti štírům zasahovali „zaklínači Selkety“, doložení už ve Staré říši, a léčebné papyry radí obklady i zaříkávání.`,
      ch: [{ t: `Poslat dvorního lékaře (200 debenů)${med ? " – máš lékařské papyry" : ""}`, d: med ? "naděje asi 85 %" : "naděje asi 55 %", f: () => { if (!pay(s, s.player, 200)) return "Nedostatek debenů."; const ok = chance(s, med ? 0.85 : 0.55); if (c) c.loy = clamp(c.loy + (ok ? 14 : -4), 0, 100); return ok ? "Chlapec se uzdravil; otec ti je zavázán." : "Lékař nepomohl; chlapec zemřel."; } },
        { t: "Povolat zaklínače Selkety (100 debenů)", d: "naděje asi 50 %, kněží +2", f: () => { if (!pay(s, s.player, 100)) return "Nedostatek debenů."; C.estates.knezi = Math.min(100, C.estates.knezi + 2); const ok = chance(s, 0.5); if (c) c.loy = clamp(c.loy + (ok ? 10 : -3), 0, 100); return ok ? "Zaříkání pomohlo." : "Chlapec zemřel."; } },
        { t: "Je to jeho věc", d: "jeho věrnost −8", f: () => { if (c) c.loy = Math.max(0, c.loy - 8); return null; } }] }; } },
  sen: { view: (s, d) => { const C = P(s), p = s.provs[d.pid];
    return { t: "Sen panovníka", tx: `Panovníkovi se zdálo, že k němu promluvil ${p.god} a stěžoval si, že jeho svatyně v nomu ${p.n} je zpustlá a písek zasypal brány. Sny se považovaly za poselství bohů.`,
      ch: [{ t: "Obnovit svatyni (1 500 debenů)", d: "maat +3, kněží +6, chrám v nomu +1", f: () => { if (!pay(s, s.player, 1500)) return "Nedostatek debenů."; C.maat = Math.min(100, C.maat + 3); C.estates.knezi = Math.min(100, C.estates.knezi + 6); p.b.chram = Math.min(4, (p.b.chram || 0) + 1); p.loy = Math.min(100, p.loy + 6); return `Svatyně v nomu ${p.n} byla obnovena.`; } },
        { t: "Přinést jen obětiny (300 debenů)", d: "kněží +2", f: () => { if (!pay(s, s.player, 300)) return "Nedostatek debenů."; C.estates.knezi = Math.min(100, C.estates.knezi + 2); return null; } },
        { t: "Je to jen sen", d: "kněží −4", f: () => { C.estates.knezi = Math.max(0, C.estates.knezi - 4); return null; } }] }; } },
  vykradeny: { view: (s, d) => { const C = P(s), p = s.provs[d.pid];
    return { t: "Vykradený hrob", tx: `Hlídači pohřebiště v nomu ${p.n} chytili muže, kteří se prokopali do starého hrobu, rozbili rakev a odnesli zlato a oleje. Vykrádání hrobů provázelo celé egyptské dějiny; Nářky Ipuverovy si stěžují, že „co skrývala pyramida, je prázdné“.`,
      ch: [{ t: "Soudit je před vezírem (200 debenů)", d: "maat +3", f: () => { if (!pay(s, s.player, 200)) return "Nedostatek debenů."; C.maat = Math.min(100, C.maat + 3); return "Zloději byli odsouzeni."; } },
        { t: "Nechat potrestat nomarchu", d: "nomarchové +3, věrnost nomu +3", f: () => { C.estates.nomarchove = Math.min(100, C.estates.nomarchove + 3); p.loy = Math.min(100, p.loy + 3); return null; } },
        { t: "Propustit je za podíl z kořisti (+600 debenů)", d: "maat −4, kněží −4", f: () => { C.deben += 600; C.maat = Math.max(0, C.maat - 4); C.estates.knezi = Math.max(0, C.estates.knezi - 4); return null; } }] }; } },
  krokodyl: { view: (s, d) => { const C = P(s), p = s.provs[d.pid];
    return { t: "Krokodýl v kanálu", tx: `V zavlažovacím kanále v nomu ${p.n} se usadil velký krokodýl. Rolníci se bojí k vodě, napájet dobytek i nabírat vodu na pole. Krokodýl byl zvířetem boha Sobka – zabít ho, nebo usmířit?`,
      ch: [{ t: "Poslat lovce s harpunami (150 debenů)", d: "věrnost nomu +4", f: () => { if (!pay(s, s.player, 150)) return "Nedostatek debenů."; p.loy = Math.min(100, p.loy + 4); return "Krokodýl byl uloven."; } },
        { t: "Přinést obětiny Sobkovi (300 debenů)", d: "kněží +3; krokodýl prý odplul", f: () => { if (!pay(s, s.player, 300)) return "Nedostatek debenů."; C.estates.knezi = Math.min(100, C.estates.knezi + 3); p.loy = Math.min(100, p.loy + 2); return null; } },
        { t: "Ať si poradí sami", d: "věrnost nomu −3, pole utrpí", f: () => { p.loy = Math.max(0, p.loy - 3); p.agri = Math.max(10, p.agri - 1); return null; } }] }; } },
  hostina: { view: (s, d) => { const C = P(s);
    return { t: "Hostina s harfeníkem", tx: `Dvořané žádají hostinu: pečené husy, chléb, pivo a víno z oáz, kužely vonné masti na hlavách, tanečnice a slepý harfeník, jak je malovali v hrobkách. Harfeník zpívá, že život je krátký a je třeba slavit šťastný den.`,
      ch: [{ t: "Velká hostina (600 debenů, 3 000 charů)", d: "věrnost úředníků +5, nomarchové +2", f: () => { if (!pay(s, s.player, 600, 3000)) return "Nedostatek prostředků."; for (const c of officers(s, s.player)) c.loy = Math.min(100, c.loy + 5); C.estates.nomarchove = Math.min(100, C.estates.nomarchove + 2); return "Hostina trvala do rána."; } },
        { t: "Skromná večeře", d: "nic", f: () => null }] }; } },
};
Object.assign(EVENTS, EV6);
EVENT_Q.hostina = "harfenik";
function moreEventOpts3(s) {
  const C = P(s), o = [];
  if (!C || C.type === "kmen") return o;
  o.push(["senet_pozvani", { n: genName(s, C.cul === "hyk" ? "hyk" : C.cul === "nub" ? "nub" : "eg", "m").split(",")[0] }]);
  o.push(["lov", {}]); o.push(["hostina", {}]);
  if (s.bce <= 1900 && !s.flags.navratilec && C.cul !== "nub") o.push(["navratilec", { n: genName(s, "eg", "m") }]);
  if (!s.flags.trpaslik && clanProvs(s, s.player).some(p => p.id === "u1" || p.ter === "nubie")) o.push(["trpaslik", {}]);
  if (s.bce <= 1900 && clanProvs(s, s.player).some(p => p.coast || p.ter === "delta")) o.push(["keftiu", {}]);
  if (s.bce <= 1650 && !s.flags.kouzelnik) o.push(["kouzelnik", {}]);
  const off = officers(s, s.player).filter(c => !c.dyn); if (off.length) o.push(["stir", { cid: pick(s, off).id }]);
  const tp = someOwnProv(s, p => p.b.chram > 0 && p.b.chram < 4); if (tp) o.push(["sen", { pid: tp.id }]);
  const hp = someOwnProv(s, p => p.v >= 3); if (hp) o.push(["vykradeny", { pid: hp.id }]);
  const kp = someOwnProv(s, p => TERRAIN[p.ter].nile && p.ter !== "katarakt"); if (kp) o.push(["krokodyl", { pid: kp.id }]);
  return o;
}
var _moreEventOpts0 = moreEventOpts;
moreEventOpts = function (s) { return _moreEventOpts0(s).concat(moreEventOpts3(s)); };
var _onEventPicked0 = onEventPicked;
onEventPicked = function (s, k) { if (k === "navratilec" || k === "trpaslik" || k === "kouzelnik") s.flags[k] = 1; return _onEventPicked0(s, k); };
