// Dějinné chvíle: události doložené prameny, vázané na scénář a rod. U každé je uvedeno, odkud ji známe, a kde je výklad nejistý.
// A další citáty z egyptských textů (volné české převody podle běžných překladů; „od“ je přibližná doba vzniku textu).
Object.assign(QUOTES, {
  ptah_rec: { t: "Dobrá řeč je skrytější než zelený kámen, a přece ji lze nalézt u služek nad mlýnskými kameny.", src: "Ponaučení Ptahhotepovo", od: 2400, tags: ["obecne", "vedeni"] },
  ptah_vudce: { t: "Jsi-li vůdcem, který řídí záležitosti mnohých, usiluj o každý dobrý čin, aby tvé jednání bylo bez vady.", src: "Ponaučení Ptahhotepovo", od: 2400, tags: ["obecne", "vezir"] },
  ptah_srdce: { t: "Následuj své srdce, dokud žiješ.", src: "Ponaučení Ptahhotepovo", od: 2400, tags: ["obecne", "svatek"] },
  ptah_posel: { t: "Jsi-li mužem důvěry, kterého jeden velmož posílá k druhému, drž se přesně toho, s čím tě poslal.", src: "Ponaučení Ptahhotepovo", od: 2400, tags: ["poslove"] },
  ptah_prosebnik: { t: "Naslouchej klidně řeči prosebníka. Ne vše, oč prosí, se může stát, ale dobré vyslechnutí konejší srdce.", src: "Ponaučení Ptahhotepovo", od: 2400, tags: ["audience", "obecne"] },
  hardzedef: { t: "Zařiď si dům v nekropoli, učiň znamenitým své místo na Západě.", src: "Ponaučení Hardžedefovo", od: 2300, tags: ["pohreb", "hrobka"] },
  harchuf: { t: "Přijeď ihned po proudu do sídla a přivez toho trpaslíka živého a zdravého. Mé Veličenstvo ho touží vidět víc než dary dolů a Puntu.", src: "dopis krále Pepiho II. v hrobce Harchufa v Asuánu", od: 2270, tags: ["vyprava", "trpaslik"] },
  veni: { t: "Toto vojsko se vrátilo v pokoji, když rozbilo zemi obyvatel písku.", src: "životopis Veniho z Abydu (6. dynastie)", od: 2290, tags: ["valka", "vitezstvi", "vojsko"] },
  pt_ziv: { t: "Ó králi, neodešel jsi mrtev, odešel jsi živ.", src: "Texty pyramid, výrok 213", od: 2350, tags: ["pohreb"] },
  pt_nebe: { t: "Nebe se zatahuje, hvězdy hasnou, klenby nebes se chvějí.", src: "Texty pyramid, výroky 273–274", od: 2350, tags: ["znameni", "boure"] },
  merikare_trest: { t: "Nezabíjej, není ti to k užitku. Trestej bitím a vězením; tak bude země v pořádku.", src: "Ponaučení pro Merikarea", od: 2075, tags: ["soud", "vezir"] },
  merikare_pamatnik: { t: "Stav památníky pro boha: díky nim žije jméno toho, kdo je postavil.", src: "Ponaučení pro Merikarea", od: 2075, tags: ["stavby", "knez"] },
  merikare_budoucnost: { t: "Je dobré jednat pro ty, kdo přijdou potom.", src: "Ponaučení pro Merikarea", od: 2075, tags: ["obecne", "stavby"] },
  intef_thinis: { t: "Přistál jsem v posvátném údolí, zmocnil se celého thinitského nomu a otevřel všechny jeho pevnosti.", src: "stéla krále Intefa II. z jeho hrobky v Thébách", od: 2065, tags: ["valka", "vitezstvi", "vojsko"] },
  ba_smrt: { t: "Smrt je dnes přede mnou, jako když se nemocný uzdraví, jako když člověk vyjde ven po uvěznění.", src: "Rozhovor člověka s jeho ba", od: 1900, tags: ["pohreb", "nemoc"] },
  ba_srdce: { t: "S kým mám dnes mluvit? Srdce jsou chamtivá, každý bere majetek svého bližního.", src: "Rozhovor člověka s jeho ba", od: 1900, tags: ["nepokoje"] },
  sinuhet_domov: { t: "Co je většího, než aby mé tělo bylo pohřbeno v zemi, v níž jsem se narodil?", src: "Příběh Sinuhetův", od: 1900, tags: ["navratilec", "pohreb"] },
  sinuhet_buh: { t: "Ať jsi kterýkoli bůh, jenž určil tento útěk, smiluj se a vrať mě domů.", src: "Příběh Sinuhetův", od: 1900, tags: ["navratilec", "poslove"] },
  loajalista: { t: "Král je obživa, jeho ústa jsou hojnost.", src: "Loajalistické naučení", od: 1900, tags: ["obecne", "sypky"] },
  chacheperre: { t: "Kéž bych měl neznámé výroky, podivné průpovědi, novou řeč, která ještě nebyla užita.", src: "Stesky Chacheperreseneba", od: 1850, tags: ["vedeni"] },
  semna_odvaha: { t: "Útočit je statečnost, ustoupit je bídnost. Zbabělec je ten, kdo se dá zahnat od své hranice.", src: "hraniční stéla Senusreta III. ze Semny", od: 1860, tags: ["valka", "vojsko"] },
  senusret_hraz: { t: "Jak velký je pán pro své město: je hrází, která zadržuje řeku před vodami záplavy.", src: "Hymny na Senusreta III. (papyrus z Káhúnu)", od: 1850, tags: ["zaplava", "stavby"] },
  amenemhat_chleb: { t: "Ten, kdo jedl můj chléb, sbíral proti mně vojsko.", src: "Ponaučení krále Amenemhata I.", od: 1950, tags: ["zrada"] },
  hekanacht_pul: { t: "Lepší je polovina života než zemřít docela.", src: "dopis Hekanachta (počátek 12. dynastie)", od: 1950, tags: ["hlad", "sypky"] },
  satira_predstaveny: { t: "Hle, není povolání bez představeného, jen písař – ten je představený sám.", src: "Satira na povolání", od: 1950, tags: ["pisari", "vezir"] },
  ipuver_smich: { t: "Smích zanikl, už se ho nikdo nedopouští; zemí jde nářek smíšený s bědováním.", src: "Nářky Ipuverovy", od: 1800, tags: ["nepokoje", "hlad"] },
  neferti_kral: { t: "Přijde král z jihu, jménem Ameni… Vezme bílou korunu, ponese červenou korunu a spojí Obě mocné.", src: "Proroctví Neferetiho", od: 1950, tags: ["sjednoceni"] },
  neferti_zeme: { t: "Ukážu ti zemi ve zmatku: co se nemělo stát, stalo se.", src: "Proroctví Neferetiho", od: 1950, tags: ["nepokoje"] },
  carnarvon: { t: "Hle, až po Kúsaj je vše věrné Asiatům. My jsme v klidu ve svém Egyptě: Elefantina je silná a střed země je s námi.", src: "řeč velmožů na Carnarvonově tabulce (text první Kamoseho stély)", od: 1552, tags: ["sip", "poslove"] },
  kamose_srdce: { t: "Tvé srdce je zlomeno, bídný Asiate.", src: "druhá stéla krále Kamoseho", od: 1550, tags: ["sip", "vitezstvi"] },
  ebana_jmeno: { t: "Jméno statečného je v tom, co vykonal; v této zemi nezanikne navěky.", src: "životopis Ahmose, syna Ebany (hrobka v Elkabu)", od: 1520, tags: ["vitezstvi", "vojsko", "valka"] },
  ebana_saruhen: { t: "Šaruhen byl obléhán tři roky; pak ho Jeho Veličenstvo dobylo.", src: "životopis Ahmose, syna Ebany (hrobka v Elkabu)", od: 1520, tags: ["saruhen"] },
  boure_stela: { t: "Bohové způsobili, že nebe přišlo v bouři deště; na západě byla tma a nebe se rozpoutalo bez ustání.", src: "Stéla bouře krále Ahmose z Karnaku", od: 1540, tags: ["boure"] },
  rhind_pozn: { t: "Rok 11, druhý měsíc období šemu: vešlo se do Héliopole.", src: "poznámka na rubu Rhindova matematického papyru", od: 1545, tags: ["avaris"] },
});
// citát podle tématu, jen z textů, které v době hry už existovaly; kdyžžádný není, vezme se obecný
function quoteTag(s, tags, salt = 0) {
  const ok = q => q.od >= s.bce && (!q.tags.includes("sip") || s.scen === "sip" || s.scen === "ahm");
  for (const tag of [].concat(tags, "obecne")) { const L = Object.values(QUOTES).filter(q => ok(q) && q.tags.includes(tag)); if (L.length) return L[(s.turn + salt) % L.length]; }
  return null;
}

Object.assign(EVENTS, {
  // Stéla bouře (Karnak): bouře a povodeň poškodily hrobky a chrámy; král nařídil obnovu. Spojení s výbuchem Théry je sporné.
  boure_ahmose: { view: (s, d) => { const C = P(s); return { t: "Bouře nad Thébami", tx: "Nebe se zatáhlo a na Théby se snesl lijavec, jaký nikdo nepamatuje. Voda vnikla do hrobek na západním břehu, strhla domy a po řece plují trosky. Tak to popisuje stéla, kterou dal král Ahmose postavit v Karnaku; nařídil na ní obnovit chrámy a hrobky. (Někteří badatelé bouři spojují s výbuchem sopky na Théře, jiní to odmítají.)", q: qOk(s, Q("boure_stela")),
    ch: [{ t: "Obnovit chrámy a hrobky (2 500 debenů)", d: "maat +5, kněží +6, sláva +15", f: () => { if (!pay(s, s.player, 2500, 0)) return "Debeny nestačí."; C.maat = Math.min(100, C.maat + 5); C.estates.knezi = Math.min(100, C.estates.knezi + 6); C.prestige += 15; return null; } },
      { t: "Rozdat obilí lidem bez přístřeší (12 000 charů)", d: "spokojenost v Thébách a okolí +10, lid +5", f: () => { if (!pay(s, s.player, 0, 12000)) return "Obilí nestačí."; for (const id of ["u4", "u5", "u3"]) { const p = s.provs[id]; if (p && p.owner === s.player) p.loy = Math.min(100, p.loy + 10); } C.estates.lid = Math.min(100, C.estates.lid + 5); return null; } },
      { t: "Je válka; škody počkají", d: "maat −3, kněží −4", f: () => { C.maat = Math.max(0, C.maat - 3); C.estates.knezi = Math.max(0, C.estates.knezi - 4); return null; } }] }; } },
  // Ahmose, syn Ebany: po taženích přišel z jihu Aata a pak Tetian sebral nespokojence; král oba porazil.
  tetian: { view: (s, d) => { const C = P(s); return { t: "Tetian sbírá nespokojence", tx: "Zatímco vojsko bojuje daleko, v Horním Egyptě se pozdvihl jistý Tetian a shromáždil kolem sebe nespokojence. Ahmose, syn Ebany, ve svém životopise píše, že ho Jeho Veličenstvo zabilo a jeho tlupu zničilo. Kdo to byl, nevíme – snad místní velmož, kterému se nelíbila rostoucí moc Théb.",
    ch: [{ t: "Vytáhnout proti němu osobně (6 000 charů)", d: "sláva +30, nomarchové +4; vzpoura končí", f: () => { if (!pay(s, s.player, 0, 6000)) return "Obilí na tažení nestačí."; C.prestige += 30; C.estates.nomarchove = Math.min(100, C.estates.nomarchove + 4); return null; } },
      { t: "Poslat velitele s oddílem (800 debenů)", d: "sláva +8; s jistou pravděpodobností se vzpoura potáhne", f: () => { if (!pay(s, s.player, 800, 0)) return "Debeny nestačí."; C.prestige += 8; if (chance(s, 0.35)) { const L = clanProvs(s, s.player).filter(p => p.id !== C.capital).sort((a, b) => a.loy - b.loy).slice(0, 2); for (const p of L) p.loy = Math.max(0, p.loy - 12); log(s, "Tetianovi lidé se rozprchli do vesnic a dál bouří lid.", "nepokoje", [s.player]); } return null; } },
      { t: "Nabídnout mu úřad a smír", d: "maat −2, sláva −10, spokojenost nejneklidnějších nomů +8", f: () => { C.maat = Math.max(0, C.maat - 2); C.prestige = Math.max(0, C.prestige - 10); for (const p of clanProvs(s, s.player).sort((a, b) => a.loy - b.loy).slice(0, 3)) p.loy = Math.min(100, p.loy + 8); return null; } }] }; } },
  // Carnarvonova tabulka (opis první Kamoseho stély): velmoži radí králi, aby s Hyksósy neválčil.
  rada_velmozu: { view: (s, d) => { const C = P(s); return { t: "Rada velmožů", tx: "Král svolal velmože a řekl, že chce táhnout na sever. Odpověděli mu: pole nám obdělávají, dobytek se pase v Deltě, nikdo nám nebere obilí. Ať drží svou zemi on a my svou; budeme bojovat, až někdo přijde proti nám. Tak zní rozhovor na první stéle krále Kamoseho, kterou známe i z opisu na dřevěné tabulce.", q: qOk(s, Q("carnarvon")),
    ch: [{ t: "„Mým přáním je zachránit Egypt.“", d: "sláva +20, maat +2, nomarchové −6; výcvik všech posádek +5", f: () => { C.prestige += 20; C.maat = Math.min(100, C.maat + 2); C.estates.nomarchove = Math.max(0, C.estates.nomarchove - 6); for (const p of clanProvs(s, s.player)) p.train = Math.min(100, p.train + 5); return null; } },
      { t: "Poslechnout velmože a užívat míru", d: "nomarchové +8, 2 000 debenů z obchodu se severem, sláva −15", f: () => { C.estates.nomarchove = Math.min(100, C.estates.nomarchove + 8); C.deben += 2000; C.prestige = Math.max(0, C.prestige - 15); return null; } }] }; } },
  // Stéla Intefa II. (Káhira CG 20512) z jeho hrobky v et-Tárifu: král se svými psy, kteří mají libyjská jména s egyptským překladem.
  psi_intefa: { view: (s, d) => { const C = P(s); return { t: "Psi krále Intefa", tx: "Král si oblíbil lovecké psy přivedené z Libyjské pouště. Mají cizí jména a písaři k nim připisují egyptský překlad: jeden se jmenuje Behkaj, „gazela“, jiný Abaker. Na stéle ve své hrobce se král nechal zobrazit s pěti psy u nohou; o tisíc let později ji ještě viděli úředníci, kteří prohlíželi vykradené hrobky.",
    ch: [{ t: "Dát psy vytesat na stélu (300 debenů)", d: "sláva +10", f: () => { if (!pay(s, s.player, 300, 0)) return "Debeny nestačí."; C.prestige += 10; return null; } },
      { t: "Uspořádat velký lov v poušti (2 000 charů)", d: "nomarchové +5, výcvik v sídle +8", f: () => { if (!pay(s, s.player, 0, 2000)) return "Obilí nestačí."; C.estates.nomarchove = Math.min(100, C.estates.nomarchove + 5); const p = s.provs[C.capital]; if (p) p.train = Math.min(100, p.train + 8); return null; } },
      { t: "Psi jsou psi", d: "nic se nestane", f: () => null }] }; } },
  // Anchtifi v Moalle: vyplul po proudu k thébským pevnostem, ale nikdo prý nevyšel k boji.
  anch_theby: { view: (s, d) => { const C = P(s); return { t: "Plavba k thébským pevnostem", tx: "Anchtifi ve své hrobce vypráví, jak s vojskem vyplul po proudu proti Thébám a Koptu. Našel zavřené brány a nikdo prý nevyšel ze strachu před jeho oddíly. Tak to líčí on sám; jak to viděli Thébané, nevíme.", q: qOk(s, Q("anchtifi_hrdina")),
    ch: [{ t: "Vyplout a ukázat sílu (8 000 charů)", d: "sláva +25, výcvik posádek +6, vztah s Thébami −15", f: () => { if (!pay(s, s.player, 0, 8000)) return "Obilí na plavbu nestačí."; C.prestige += 25; for (const p of clanProvs(s, s.player)) p.train = Math.min(100, p.train + 6); if (s.clans.thebes && s.clans.thebes.alive) addRel(s, s.player, "thebes", -15); return null; } },
      { t: "Zůstat doma a hlídat sýpky", d: "spokojenost vlastních nomů +4", f: () => { for (const p of clanProvs(s, s.player)) p.loy = Math.min(100, p.loy + 4); return null; } }] }; } },
  // Hromadný hrob asi 60 vojáků u chrámu Montuhotepa II. v Dér el-Bahrí (MMA 507): padli šípy při dobývání pevnosti. Datování není jisté.
  hrob_valecniku: { view: (s, d) => { const C = P(s); return { t: "Padlí u královského chrámu", tx: "Po boji leží na břehu desítky mrtvých; mnozí mají v těle hroty šípů a rány od kamenů vržených z hradeb. U chrámu Montuhotepa II. v Dér el-Bahrí se našel společný hrob asi šedesáti takových vojáků, zabalených do plátna se jmény. Obvykle se spojuje s jeho válkami, někteří badatelé ho ale kladou až na začátek 12. dynastie.", q: quoteTag(s, ["vojsko"]),
    ch: [{ t: "Pohřbít je se ctí u králova chrámu (1 200 debenů)", d: "sláva +15, maat +2, výcvik všech posádek +4", f: () => { if (!pay(s, s.player, 1200, 0)) return "Debeny nestačí."; C.prestige += 15; C.maat = Math.min(100, C.maat + 2); for (const p of clanProvs(s, s.player)) p.train = Math.min(100, p.train + 4); return null; } },
      { t: "Pohřbít je v písku, kde padli", d: "nic se nestane", f: () => null }] }; } },
});
var _scripted0 = scriptedEvents;
scriptedEvents = function (s) {
  _scripted0(s);
  const pl = s.player, F = s.flags, mine = pid => s.provs[pid] && s.provs[pid].owner === pl, fought = s.battles.some(b => (b.a === pl || b.b === pl) && b.t >= s.turn - 3);
  if (s.scen === "ahm" && pl === "thebes") {
    if (!F.boure && s.turn >= 8 && mine("u4") && chance(s, 0.15)) { F.boure = 1; queueEvent(s, "boure_ahmose", {}); return; }
    if (!F.tetian && s.turn >= 20 && (mine("lav") || s.turn >= 40) && chance(s, 0.12)) { F.tetian = 1; queueEvent(s, "tetian", {}); return; }
  }
  if (s.scen === "sip" && pl === "thebes" && !F.rada && s.turn >= 8 && s.clans.hyksos.alive && !atWar(s, "thebes", "hyksos") && chance(s, 0.2)) { F.rada = 1; queueEvent(s, "rada_velmozu", {}); return; }
  if (s.scen === "fip" && pl === "thebes" && !F.psi && s.turn >= 4 && chance(s, 0.2)) { F.psi = 1; queueEvent(s, "psi_intefa", {}); return; }
  if (s.scen === "anch" && pl === "anch" && !F.anchTh && s.turn >= 10 && s.clans.thebes && s.clans.thebes.alive && chance(s, 0.2)) { F.anchTh = 1; queueEvent(s, "anch_theby", {}); return; }
  if (s.scen === "mt2" && pl === "thebes" && !F.hrobV && fought) { F.hrobV = 1; queueEvent(s, "hrob_valecniku", {}); }
};
