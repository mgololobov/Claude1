// Další scénáře Druhého přechodného období a doplnění Šaruhenu do starších scénářů.
// Chronologie tohoto období je nejistá; letopočty jsou přibližné (podle běžné „střední“ chronologie).
Object.assign(SCENARIOS, {
  hyk: {
    n: "≈ 1650 př. n. l. – Rozpad 13. dynastie a příchod Hyksósů",
    bce: 1650,
    d: "Králové 13. dynastie v Itjtaui u Lištu ztrácejí moc. Ve východní Deltě kolem Avaridu (Tell el-Dab'a) žije početné obyvatelstvo asijského původu a jeho vládci, Hyksósové („vládci cizích zemí“), se chystají ovládnout Memfis. V Thébách vzniká samostatné království (16. dynastie), v Abydu možná vlastní „abydoská dynastie“ a Kuš z Kermy se zmocňuje egyptských pevností v Núbii. Jména posledních králů 13. dynastie a jejich pořadí jsou nejistá – vládce Itjtaui proto v této hře nemá historické jméno.",
    climate: 0,
    clans: [
      { id: "it13", n: "Království Itjtaui", house: "13. dynastie", t: "král", type: "dyn", cul: "eg", col: "#9a6a2a", emb: "ankh", aggr: 0.35, cap: "u21", tomb: "pyramida u Itjtaui (Mazghúna či Saqqára)",
        provs: ["l1", "l2", "l13", "u21", "u22", "fa", "u20", "u19", "u18", "u17", "u16", "u15", "u14", "u13", "u12", "o_bah"], techs: ["pisari", "nilometr", "hraze", "fajjum", "katastr", "texty", "matematika", "bronz", "flotila", "pevnosti", "kamenictvi", "vezir", "lekarstvi", "pyrmesta", "papyrdilny", "zpravy", "pecete"], maat: 40, prestige: 160 },
      { id: "hyksos", n: "Hyksósové z Avaridu", house: "Hyksósové (15. dynastie)", t: "král", title: "heka chasut", type: "dyn", cul: "hyk", col: "#2f6d8f", emb: "star", aggr: 0.6, cap: "lav", tomb: "hrob v Avaridu",
        provs: ["lav", "l14", "l20", "l18", "l16", "l12", "lx", "sar"], techs: ["pisari", "nilometr", "hraze", "bronz", "luk", "vuz", "chopes", "zbroj", "dobytek", "flotila", "namorni", "kamenictvi", "osli", "tlumocnici", "protosin"], maat: 45, prestige: 180 },
      { id: "zdelta", n: "Západní Delta", house: "Místní vládci Sajska a Buta", t: "kníže", type: "nom", cul: "eg", col: "#4f8a5b", emb: "feather", aggr: 0.2, cap: "l5", tomb: "hrob v Sajsu",
        provs: ["l5", "l6", "l3"], techs: ["pisari", "nilometr", "hraze", "dobytek"], maat: 45, prestige: 50 },
      { id: "abydos", n: "Abydos", house: "Abydoská dynastie", t: "král", type: "dyn", cul: "eg", col: "#7a4b8c", emb: "ankh", aggr: 0.3, cap: "u8", tomb: "hrobka v Abydu (Anubisova hora)",
        provs: ["u7", "u8", "u9", "u10", "u11"], techs: ["pisari", "nilometr", "hraze", "texty", "bronz", "usirkult"], maat: 50, prestige: 80 },
      { id: "thebes", n: "Thébské království", house: "16. dynastie", t: "král", type: "dyn", cul: "eg", col: "#b5452c", emb: "was", aggr: 0.45, cap: "u4", tomb: "hrobka v Dra Abu el-Naga",
        provs: ["u1", "u2", "u3", "u4", "u5", "u6", "ham", "o_kha", "o_dak"], techs: ["pisari", "nilometr", "hraze", "katastr", "texty", "matematika", "bronz", "flotila", "pevnosti", "kamenictvi"], maat: 50, prestige: 110, medjay: 1 },
      { id: "kush", n: "Kuš", house: "Vládci Kermy", t: "vládce", type: "dyn", cul: "nub", col: "#6b4a2b", emb: "bow", aggr: 0.55, cap: "n_kerma", tomb: "mohyla (tumulus) v Kermě",
        provs: ["n_wawat", "n_buhen", "n_semna", "n_sai", "n_kerma"], techs: ["luk", "bronz", "pevnosti"], maat: 50, prestige: 190 },
      { id: "medzaj", n: "Médžajové", house: "Kmeny Východní pouště", t: "náčelník", type: "kmen", cul: "nub", col: "#a0522d", emb: "bow", aggr: 0.2, cap: "sau", provs: ["sau"], techs: ["luk"], maat: 50, prestige: 30 },
      { id: "aamu", n: "Aamu", house: "Beduíni Sinaje", t: "náčelník", type: "kmen", cul: "aam", col: "#5d6b7a", emb: "star", aggr: 0.35, cap: "sin", provs: ["sin"], techs: [], maat: 50, prestige: 20 },
      { id: "lib", n: "Tjehenu", house: "Libyjské kmeny", t: "náčelník", type: "kmen", cul: "lib", col: "#8a8a6a", emb: "feather", aggr: 0.45, cap: "lib", provs: ["lib"], techs: [], maat: 50, prestige: 20 },
    ],
    sizes: { lav: 4, u21: 3, n_kerma: 5 },
    rel: [["it13", "hyksos", -40], ["it13", "thebes", 10], ["thebes", "abydos", -20], ["thebes", "kush", -30], ["hyksos", "zdelta", 10], ["it13", "zdelta", 20], ["thebes", "medzaj", 50], ["hyksos", "aamu", 25], ["hyksos", "kush", 10]],
    tribute: [], alliances: [], wars: [["hyksos", "it13"]],
    hist: [
      { n: "Sakir-Har", cl: "hyksos", by: 1690, r: "leader", s: [70, 66, 60, 62], t: ["ctizadostivy"], note: "jeden z prvních hyksóských králů; jeho jméno a titul „vládce cizích zemí“ nese kamenná zárubeň z Avaridu. Přesná léta vlády neznáme." },
      { n: "Senebkaj (Veseribre)", cl: "abydos", by: 1688, r: "leader", s: [66, 62, 52, 56], t: ["stateny"], note: "král abydoské dynastie; jeho hrobku objevila roku 2014 výprava Pensylvánské univerzity (J. Wegner). Kostra nese stopy smrtelných ran z boje." },
      { n: "Džehuti (Sechemre Sementaui)", cl: "thebes", by: 1690, r: "leader", s: [58, 56, 60, 58], t: [], note: "podle rekonstrukce K. Ryholta první král thébské 16. dynastie; pořadí i data těchto králů jsou nejistá" },
    ],
  },
  ahm: {
    n: "≈ 1550 př. n. l. – Ahmose I. a pád Avaridu",
    bce: 1550,
    d: "Kamose zemřel brzy po tažení k Avaridu (okolnosti neznáme) a na trůn usedá mladičký Ahmose; za jeho nezletilosti snad vládne královna Ahhotep. Théby drží Horní Egypt až po Hermopolis, Hyksósové pod posledním králem Chamudim se drží Delty, Memfidy a opevněného Šaruhenu v jižním Kenaanu. Podle životopisu Ahmose, syna Ebany, z Elkabu bojoval král u Avaridu několikrát, pak obléhal Šaruhen tři roky a nakonec táhl proti Kuši.",
    climate: 0,
    clans: [
      { id: "thebes", n: "Thébské království", house: "17./18. dynastie (Ahmose)", t: "král", type: "dyn", cul: "eg", col: "#b5452c", emb: "was", aggr: 0.6, cap: "u4", tomb: "hrobka v Dra Abu el-Naga a kenotaf v Abydu",
        provs: ["u1", "u2", "u3", "u4", "u5", "u6", "u7", "u8", "u9", "u10", "u11", "u12", "u13", "u14", "u15", "u16", "ham", "o_kha", "o_dak", "o_bah"], techs: ["pisari", "nilometr", "hraze", "katastr", "texty", "matematika", "bronz", "flotila", "pevnosti", "kamenictvi", "vezir", "luk", "vuz", "chopes", "zbroj", "zapas", "sklady", "clun", "pyrmesta", "ochrana", "zlatnictvi", "papyrdilny", "osli", "tlumocnici", "sehel", "pekarny", "pecete", "obleh", "zpravy", "hlidky", "usirkult"], maat: 60, prestige: 260, medjay: 1 },
      { id: "hyksos", n: "Říše Hyksósů", house: "Hyksósové (15. dynastie)", t: "král", title: "heka chasut", type: "dyn", cul: "hyk", col: "#2f6d8f", emb: "star", aggr: 0.4, cap: "lav", tomb: "hrob v Avaridu",
        provs: ["u17", "u18", "u19", "u20", "u21", "u22", "fa", "l1", "l2", "l13", "l3", "l5", "l6", "lx", "l12", "l16", "l18", "lav", "l20", "l14", "sar"], techs: ["pisari", "nilometr", "hraze", "fajjum", "katastr", "matematika", "bronz", "luk", "vuz", "chopes", "zbroj", "dobytek", "kamenictvi", "lekarstvi", "flotila", "namorni", "zapas", "sklady", "clun", "protosin", "pekarny", "pecete", "obleh", "obelisky", "pyrmesta", "ochrana", "zlatnictvi", "papyrdilny", "osli", "tlumocnici"], maat: 40, prestige: 220 },
      { id: "kush", n: "Kuš", house: "Vládci Kermy", t: "vládce", type: "dyn", cul: "nub", col: "#6b4a2b", emb: "bow", aggr: 0.45, cap: "n_kerma", tomb: "mohyla (tumulus) v Kermě",
        provs: ["n_wawat", "n_buhen", "n_semna", "n_sai", "n_kerma"], techs: ["luk", "bronz", "pevnosti"], maat: 50, prestige: 200 },
      { id: "medzaj", n: "Médžajové", house: "Kmeny Východní pouště", t: "náčelník", type: "kmen", cul: "nub", col: "#a0522d", emb: "bow", aggr: 0.15, cap: "sau", provs: ["sau"], techs: ["luk"], maat: 50, prestige: 40 },
      { id: "aamu", n: "Aamu", house: "Beduíni Sinaje", t: "náčelník", type: "kmen", cul: "aam", col: "#5d6b7a", emb: "star", aggr: 0.35, cap: "sin", provs: ["sin"], techs: [], maat: 50, prestige: 20 },
      { id: "lib", n: "Tjehenu", house: "Libyjské kmeny", t: "náčelník", type: "kmen", cul: "lib", col: "#8a8a6a", emb: "feather", aggr: 0.45, cap: "lib", provs: ["lib"], techs: [], maat: 50, prestige: 20 },
    ],
    sizes: { lav: 4, u4: 4, n_kerma: 5, sar: 3 },
    rel: [["thebes", "hyksos", -60], ["thebes", "kush", -40], ["hyksos", "kush", 30], ["thebes", "medzaj", 60], ["hyksos", "aamu", 25]],
    tribute: [], alliances: [], wars: [["thebes", "hyksos"]],
    hist: [
      { n: "Ahmose (Nebpehtire)", cl: "thebes", by: 1561, r: "leader", s: [62, 70, 58, 60], t: ["ctizadostivy"], note: "zakladatel 18. dynastie; nastoupil jako dítě, Avaris dobyl asi mezi 11. a 18. rokem vlády" },
      { n: "Ahhotep", cl: "thebes", by: 1585, r: "fam", sex: "f", note: "královna matka; stéla z Karnaku chválí, že „pečovala o vojsko“ a „uklidnila Horní Egypt“ (kterou Ahhotep míní, je sporné)" },
      { n: "Tetišeri", cl: "thebes", by: 1620, r: "fam", sex: "f", note: "babička Ahmose; postavil jí kenotaf v Abydu" },
      { n: "Ahmose-Nefertari", cl: "thebes", by: 1562, r: "fam", sex: "f", sp: "Ahmose (Nebpehtire)", note: "sestra a Velká královská manželka Ahmose I., později uctívaná jako ochránkyně Théb" },
      { n: "Ahmose, syn Ebany", cl: "thebes", by: 1570, r: "off", rank: 1, s: [62, 66, 40, 50], t: ["stateny", "verny"], loc: "u3", note: "voják z Elkabu; sloužil na lodích u Avaridu, u Šaruhenu i v Núbii a vylíčil to ve své hrobce" },
      { n: "Ahmose Pen-Nechbet", cl: "thebes", by: 1568, r: "off", rank: 0, s: [56, 58, 42, 52], t: ["verny"], loc: "u3", note: "další voják z Elkabu, sloužil od Ahmose I. po Thutmose II." },
      { n: "Chamudi", cl: "hyksos", by: 1595, r: "leader", s: [52, 50, 56, 58], t: [], note: "poslední hyksóský král; poznámka na Rhindově papyru o pádu Heliopole a Sile v „11. roce“ se často vztahuje k jeho vládě (není jisté)" },
    ],
  },
});
// Šaruhen do starších scénářů: v Druhém přechodném období ho drží Hyksósové, jinak pán Sinaje
for (const [id, Sc] of Object.entries(SCENARIOS)) {
  if (Sc.clans.some(c => c.provs.includes("sar"))) continue;
  const o = id === "sip" ? Sc.clans.find(c => c.id === "hyksos") : Sc.clans.find(c => c.provs.includes("sin"));
  if (o) o.provs.push("sar");
}
