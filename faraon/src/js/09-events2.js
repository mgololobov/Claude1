// Další události ze života Egypta. Každá vychází z doloženého jevu; odkazy na prameny jsou v textu.
const EV2 = {
  hroch: { view: (s, d) => { const C = P(s), p = s.provs[d.pid], L = leaderOf(s, s.player); return { t: "Hroši v polích", tx: `Hroši v nomu ${p.n} v noci vylézají z řeky a ničí zralé obilí. Lov na hrocha harpunou byl odedávna královským obřadem – vítězstvím Hora nad Sutechem, jehož zvířetem hroch je.`,
    ch: [{ t: `Uspořádat královský lov (${L ? L.n : "panovník"} povede čluny)`, d: "sláva +15, pole zachráněna; při neúspěchu může být lovec raněn", f: () => { if (L && chance(s, 0.12 + (60 - st(L, "uda")) / 400)) { L.wound = 4; C.prestige += 5; return `${L.n} byl při lovu zraněn, hroch utekl.`; } C.prestige += 15; p.agri = Math.min(agriCap(s, p), p.agri + 2); return "Hroch byl uloven harpunou, lid jásá."; } },
      { t: "Poslat rybáře s sítěmi a ohněm", d: "200 debenů, pole zachráněna", f: () => { if (!pay(s, s.player, 200)) return "Nedostatek debenů."; return null; } },
      { t: "Nechat to být", d: "pole −3", f: () => { p.agri = Math.max(10, p.agri - 3); return null; } }] }; } },
  skudci: { view: (s, d) => { const C = P(s), p = s.provs[d.pid]; return { t: "Myši a kobylky", tx: `Na pole v nomu ${p.n} se snesly kobylky a do sýpek se dostaly myši. Kočky chované u sýpek byly v Egyptě vítanými pomocníky.`,
    ch: [{ t: "Rozdat obilí ze státních sýpek (5 000 charů)", d: "spokojenost +8", f: () => { if (!pay(s, s.player, 0, 5000)) return "Obilí nestačí."; p.stock += 5000; p.loy = Math.min(100, p.loy + 8); return null; } },
      { t: "Nechat rolníky, ať si poradí", d: "obecní zásoby −40 %, spokojenost −5", f: () => { p.stock = Math.round(p.stock * 0.6); p.loy = Math.max(0, p.loy - 5); return null; } }] }; } },
  osadnici: { view: (s, d) => { const C = P(s), p = s.provs[d.pid]; return { t: "Asiaté žádají o pastviny", tx: `Na hranici nomu ${p.n} přišla skupina Aamu s rodinami, osly a zbožím. Žádají, aby se směli usadit a pást stáda – podobně jako karavana „vládce cizích zemí“ Abiši, kterou namaloval nomarcha Chnumhotep II. v Beni Hasanu. Z takových přistěhovalců vyrostlo obyvatelstvo Avaridu.`,
    ch: [{ t: "Povolit jim usadit se", d: "obyvatel +3 tis., řemesla +5, vztah s Aamu +15, spokojenost −4", f: () => { p.pop = r1(p.pop + 3); p.com = Math.min(comCap(s, p), p.com + 5); p.loy = Math.max(0, p.loy - 4); if (s.clans.aamu && s.clans.aamu.alive) addRel(s, s.player, "aamu", 15); return null; } },
      { t: "Vybrat od nich clo a poslat je zpět", d: "+400 debenů, vztah s Aamu −10", f: () => { C.deben += 400; if (s.clans.aamu && s.clans.aamu.alive) addRel(s, s.player, "aamu", -10); return null; } }] }; } },
  pozar: { view: (s, d) => { const C = P(s), loss = Math.round(C.grain * 0.08), h = officeHolder(s, s.player, "sypky"); return { t: "Požár v sýpce", tx: `Od pochodní písařů chytla sláma v jedné ze státních sýpek. Shořelo asi ${fmtN(loss)} charů obilí.${h ? ` Za sýpky odpovídá ${h.n}.` : ""}`,
    ch: [{ t: h ? "Potrestat představeného sýpek" : "Potrestat strážce", d: "ztráta zůstane; úředníci zpozorní", f: () => { C.grain -= loss; if (h) h.loy = Math.max(0, h.loy - 12); return null; } },
      { t: "Nechat sýpky opravit a hlídat (1 000 debenů)", d: "zachráníš polovinu obilí", f: () => { C.grain -= pay(s, s.player, 1000) ? Math.round(loss / 2) : loss; return null; } }] }; } },
  spiknuti: { view: (s, d) => { const C = P(s), L = leaderOf(s, s.player); return { t: "Spiknutí v ženském domě", tx: `Písař paláce odhalil spiknutí v ženském domě: vedlejší choť chce dosadit na trůn svého syna a získala na svou stranu některé strážce. Za Pepiho I. vedl podobné vyšetřování hodnostář Veni; Amenemhat I. byl podle svého Ponaučení přepaden v noci vlastní stráží.`,
    ch: [{ t: "Tajné vyšetřování a tichý soud (800 debenů)", d: "nebezpečí zažehnáno, maat +2", f: () => { if (!pay(s, s.player, 800)) { return "Na vyšetřování nebylo – spiklenci unikli."; } C.maat = Math.min(100, C.maat + 2); return "Spiklenci byli odsouzeni v tichosti."; } },
      { t: "Veřejný soud a výstražné tresty", d: "maat +1, nomarchové −5, jeden z úředníků ztratí důvěru", f: () => { C.maat = Math.min(100, C.maat + 1); C.estates.nomarchove = Math.max(0, C.estates.nomarchove - 5); const o = officers(s, s.player).filter(c => !c.dyn); if (o.length) { const x = pick(s, o); x.loy = Math.max(0, x.loy - 15); } return null; } },
      { t: "Nevěřit pomluvám", d: "riskantní", f: () => { if (L && chance(s, 0.25)) { if (chance(s, 0.4)) { die(s, L, "zavražděn při spiknutí v paláci"); return "Spiklenci udeřili v noci."; } L.wound = 6; return `${L.n} přežil noční útok, ale je raněn.`; } return "Nic se nestalo – tentokrát."; } }] }; } },
  apis: { view: (s, d) => { const C = P(s); return { t: "Narodil se býk Apis", tx: "V Memfidě se narodil černý býk s bílým trojúhelníkem na čele – Apis, živý obraz boha Ptaha. Jeho kult je doložen už od počátků egyptských dějin.",
    ch: [{ t: "Slavnostně ho uvést do chrámu Ptahova (800 debenů)", d: "maat +4, kněží +4", f: () => { if (!pay(s, s.player, 800)) return "Nedostatek debenů."; C.maat = Math.min(100, C.maat + 4); C.estates.knezi = Math.min(100, C.estates.knezi + 4); return null; } },
      { t: "Nechat oslavy kněžím", d: "maat +1", f: () => { C.maat = Math.min(100, C.maat + 1); return null; } }] }; } },
  nemoc: { view: (s, d) => { const C = P(s), L = leaderOf(s, s.player), med = hasTech(s, s.player, "lekarstvi"); return { t: "Panovník onemocněl", tx: `${L ? L.n : "Panovník"} má horečku a bolesti. Egyptští lékaři (sunu) léčili bylinami, medem a obklady, kněží bohyně Sachmet zaříkáními – obojí šlo ruku v ruce.${med ? " Tvoji lékaři znají sbírky diagnóz a léčby." : ""}`,
    ch: [{ t: "Povolat lékaře", d: med ? "malé riziko" : "střední riziko", f: () => { if (L && chance(s, med ? 0.03 : 0.08)) { die(s, L, "zemřel na nemoc"); return null; } return "Panovník se uzdravil."; } },
      { t: "Lékaře i kněze Sachmet (600 debenů)", d: "riziko menší, maat +1", f: () => { if (!pay(s, s.player, 600)) { if (L && chance(s, 0.08)) die(s, L, "zemřel na nemoc"); return null; } C.maat = Math.min(100, C.maat + 1); if (L && chance(s, med ? 0.02 : 0.05)) { die(s, L, "zemřel na nemoc"); return null; } return "Panovník se uzdravil."; } }] }; } },
  pomoc: { view: (s, d) => { const C = P(s), A = s.clans[d.cl], E = s.clans[d.foe]; return { t: `${A.n} žádá o pomoc`, tx: `Posel spojeneckého rodu ${A.house} prosí o pomoc ve válce s rodem ${E.house}.`,
    ch: [{ t: "Poslat zlato na žold (1 500 debenů)", d: "vztah +15", f: () => { if (!pay(s, s.player, 1500)) return "Nedostatek debenů."; A.deben += 1500; addRel(s, s.player, d.cl, 15); return null; } },
      { t: "Vstoupit do války po jeho boku", d: "válka, vztah +25", f: () => { addRel(s, s.player, d.cl, 25); if (!atWar(s, s.player, d.foe)) declareWar(s, s.player, d.foe, "na pomoc spojenci"); return null; } },
      { t: "Odmítnout", d: "spojenectví zanikne, vztah −20", f: () => { delete s.alliances[pairKey(s.player, d.cl)]; addRel(s, s.player, d.cl, -20); return null; } }] }; } },
  zbehove: { view: (s, d) => { const C = P(s), E = s.clans[d.foe], p = s.provs[d.pid]; return { t: "Zběhové od nepřítele", tx: `Do nomu ${p.n} přišlo asi ${d.n} vojáků z vojska rodu ${E.house}. Nedostávají příděly a chtějí sloužit tobě.`,
    ch: [{ t: "Přijmout je do posádky", d: `+${d.n} kopiníků; mezi nimi mohou být zvědové`, f: () => { p.troops.kopinici = (p.troops.kopinici || 0) + d.n; if (chance(s, 0.3)) { p.spy[d.foe] = s.turn + 6; return "Někteří z nich donášeli nepříteli."; } return null; } },
      { t: "Odzbrojit je a poslat na stavby", d: "robota na kanálech: pole +2", f: () => { p.agri = Math.min(agriCap(s, p), p.agri + 2); return null; } }] }; } },
  karavana: { view: (s, d) => { const C = P(s); return { t: "Karavana z jihu", tx: "Do Elefantiny dorazila karavana z Núbie s ebenem, slonovinou, kadidlem, kůžemi panterů a pštrosími pery. Takové výpravy podnikali hodnostáři z Elefantiny odedávna – nejslavnější z nich, Harchuf, přivezl ze země Jam pro malého krále Pepiho II. tanečníka-trpaslíka.",
    ch: [{ t: "Koupit vše pro dvůr a chrámy (2 000 debenů)", d: "sláva +25, maat +2", f: () => { if (!pay(s, s.player, 2000)) return "Nedostatek debenů."; C.prestige += 25; C.maat = Math.min(100, C.maat + 2); return null; } },
      { t: "Vybrat clo", d: "+600 debenů, vztah s Kuší −8", f: () => { C.deben += 600; for (const id of ["kush", "kerma"]) if (s.clans[id] && s.clans[id].alive) addRel(s, s.player, id, -8); return null; } }] }; } },
  stela: { view: (s, d) => { const C = P(s), c = chr(s, d.cid); return { t: "Stéla pro Abydos", tx: `${c.n} (${RANKS[c.rank].n}) žádá o svolení postavit u Terasy velkého boha v Abydu stélu se svým životopisem: jak sloužil, živil hladové a nikomu neukřivdil. Takové životopisné stély jsou hlavním pramenem k dějinám přechodných období.`,
    ch: [{ t: "Povolit a přispět kamenem (300 debenů)", d: "jeho věrnost +15, sláva +5", f: () => { if (!pay(s, s.player, 300)) return "Nedostatek debenů."; c.loy = Math.min(100, c.loy + 15); C.prestige += 5; return null; } },
      { t: "Odmítnout", d: "jeho věrnost −5", f: () => { c.loy = Math.max(0, c.loy - 5); return null; } }] }; } },
  vdova: { view: (s, d) => { const C = P(s), p = s.provs[d.pid]; return { t: "Vdova u soudu", tx: `Vdova z nomu ${p.n} se domáhá polí, která jí odkázal manžel; zabral je jeho bratr. Egyptské ženy mohly samy vlastnit, dědit i odkazovat majetek a vést spory před soudem.`,
    ch: [{ t: "Přiřknout pole vdově", d: "maat +2, lid +3, nomarchové −2", f: () => { C.maat = Math.min(100, C.maat + 2); C.estates.lid = Math.min(100, C.estates.lid + 3); C.estates.nomarchove = Math.max(0, C.estates.nomarchove - 2); return null; } },
      { t: "Přiřknout pole bratrovi", d: "nomarchové +2, maat −2", f: () => { C.estates.nomarchove = Math.min(100, C.estates.nomarchove + 2); C.maat = Math.max(0, C.maat - 2); return null; } }] }; } },
  mor_skotu: { view: (s, d) => { const C = P(s), p = s.provs[d.pid]; return { t: "Mor dobytka", tx: `Ve stádech nomu ${p.n} hyne skot. Pastevci Delty jsou bez obživy a chrámy bez obětních zvířat.`,
    ch: [{ t: "Oddělit a spálit nakažená stáda (500 debenů)", d: "nákaza zastavena, řemesla −3", f: () => { if (!pay(s, s.player, 500)) { p.com = Math.max(0, p.com - 8); return "Nebylo z čeho – nákaza se šíří."; } p.com = Math.max(0, p.com - 3); return null; } },
      { t: "Nechat bohům", d: "řemesla −8, spokojenost −5", f: () => { p.com = Math.max(0, p.com - 8); p.loy = Math.max(0, p.loy - 5); return null; } }] }; } },
  remeslnici: { view: (s, d) => { const C = P(s); return { t: "Řemeslníci z Asie", tx: "Do Delty přišli kováři a výrobci luků z Kenaanu. Umějí slévat cínový bronz, kovat srpovité meče a lepit kompozitní luky ze dřeva, rohoviny a šlach. Takové dovednosti se do Egypta šířily v Druhém přechodném období.",
    ch: [{ t: "Přijmout je do státních dílen (1 500 debenů)", d: "body vědění +60", f: () => { if (!pay(s, s.player, 1500)) return "Nedostatek debenů."; C.res.pts += 60; return null; } },
      { t: "Poslat je dál", d: "", f: () => null }] }; } },
  odmena: { view: (s, d) => { const C = P(s), c = chr(s, d.cid); return { t: "Odměna za statečnost", tx: `${c.n} se v bitvě vyznamenal. Vojáci, kteří se vyznamenali, dostávali od krále zlato a otroky z kořisti – tak to líčí ve svém životopise i Ahmose, syn Ebany.`,
    ch: [{ t: "Dát mu zlato a podíl z kořisti (500 debenů)", d: "jeho věrnost +15, zásluhy +30", f: () => { if (!pay(s, s.player, 500)) return "Nedostatek debenů."; c.loy = Math.min(100, c.loy + 15); c.merit += 30; return null; } },
      { t: "Pochválit ho před vojskem", d: "zásluhy +10", f: () => { c.merit += 10; return null; } }] }; } },
  posli_kus: { view: (s, d) => { const C = P(s), K = s.clans[d.cl]; return { t: "Posel z Kuše", tx: `Vládce Kuše posílá zlato, eben a vzkaz: nabízí přátelství a obchod po řece. Kerma byla v té době nejmocnějším státem jižně od Egypta.`,
    ch: [{ t: "Přijmout dary a uzavřít obchod", d: "vztah +20, obchodní smlouva", f: () => { addRel(s, s.player, d.cl, 20); if (!atWar(s, s.player, d.cl)) s.trade[pairKey(s.player, d.cl)] = true; C.deben += 800; return null; } },
      { t: "Poslat posla zpět s pohrdáním", d: "vztah −20, sláva +10", f: () => { addRel(s, s.player, d.cl, -20); C.prestige += 10; return null; } }] }; } },
};
Object.assign(EVENTS, EV2);
Object.assign(EVENT_Q, { spiknuti: "amenemhat", vdova: "rolnik", odmena: "ebana_zlato", stela: "merikare_maat", remeslnici: "satira_kovar", karavana: "namornik", skudci: "hapi_opozdi" });

// Výběr dalších událostí (doplňuje randomEvents)
function moreEventOpts(s) {
  const C = P(s), opts = [], L = leaderOf(s, s.player);
  const nile = someOwnProv(s, p => TERRAIN[p.ter].nile && p.ter !== "katarakt"); if (nile) opts.push(["hroch", { pid: nile.id }], ["skudci", { pid: nile.id }]);
  const east = someOwnProv(s, p => p.ter === "delta" || p.nb.some(n => s.provs[n].owner === "aamu")); if (east) opts.push(["osadnici", { pid: east.id }]);
  if (C.grain > 60000) opts.push(["pozar", {}]);
  if (L && C.t === "král" && age(s, L) >= 20 && (!s.flags.spiknuti_t || s.turn - s.flags.spiknuti_t > 120)) opts.push(["spiknuti", {}]);
  if (s.provs.l1.owner === s.player && !s.flags.apis) opts.push(["apis", {}]);
  if (L && age(s, L) >= 45) opts.push(["nemoc", {}]);
  for (const x of aliveClans(s)) if (x.id !== s.player && allied(s, s.player, x.id)) { const e = enemiesOf(s, x.id).filter(y => y !== s.player); if (e.length) { opts.push(["pomoc", { cl: x.id, foe: e[0] }]); break; } }
  for (const e of enemiesOf(s, s.player)) { const fr = clanProvs(s, s.player).find(p => p.nb.some(n => s.provs[n].owner === e)); if (fr) { opts.push(["zbehove", { foe: e, pid: fr.id, n: rint(s, 15, 40) * 10 }]); break; } }
  if (s.provs.u1.owner === s.player) opts.push(["karavana", {}]);
  const hi = officers(s, s.player).filter(c => !c.dyn && c.rank >= 2); if (hi.length && C.cul === "eg") opts.push(["stela", { cid: pick(s, hi).id }]);
  const any = someOwnProv(s); if (any) opts.push(["vdova", { pid: any.id }]);
  const cattle = someOwnProv(s, p => p.res.includes("dobytek") || p.ter === "delta"); if (cattle) opts.push(["mor_skotu", { pid: cattle.id }]);
  if ((s.scen === "sip" || s.bce < 1700) && someOwnProv(s, p => p.ter === "delta") && !s.flags.remeslnici) opts.push(["remeslnici", {}]);
  const kus = ["kush", "kerma"].find(id => s.clans[id] && s.clans[id].alive && id !== s.player && !atWar(s, s.player, id)); if (kus && clanProvs(s, s.player).some(p => p.nb.some(n => s.provs[n].owner === kus)) && !s.flags.posli_kus) opts.push(["posli_kus", { cl: kus }]);
  return opts.concat(moreEventOpts2(s));
}
function onEventPicked(s, k) { if (k === "spiknuti") s.flags.spiknuti_t = s.turn; if (k === "apis" || k === "remeslnici" || k === "posli_kus") s.flags[k] = 1; }
