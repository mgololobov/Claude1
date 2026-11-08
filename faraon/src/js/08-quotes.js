// Citáty z dochovaných egyptských textů (volné české převody podle běžných překladů). Každý má uvedený pramen.
const QUOTES = {
  merikare_slovo: { t: "Buď mistrem slova, abys byl silný. Síla krále je jazyk; slovo je mocnější než každý boj.", src: "Ponaučení pro Merikarea", tags: ["obecne"] },
  merikare_lide: { t: "Dobře opatřeni jsou lidé, stádo boží. Pro ně stvořil nebe i zemi.", src: "Ponaučení pro Merikarea", tags: ["obecne", "maat"] },
  merikare_asiat: { t: "Hle, bídný Asiat… nesídlí na jednom místě, jeho nohy bloudí. Bojuje od dob Hora.", src: "Ponaučení pro Merikarea", tags: ["valka", "aamu"] },
  merikare_maat: { t: "Konej maat, dokud jsi na zemi. Utěšuj plačícího, neutiskuj vdovu.", src: "Ponaučení pro Merikarea", tags: ["maat", "obecne"] },
  merikare_thinis: { t: "Hle, za mé doby se stal hanebný čin: thinidský nom byl zpustošen. Nestalo se to mým činem; dozvěděl jsem se to, až když bylo hotovo.", src: "Ponaučení pro Merikarea", tags: ["pohrebiste"] },
  ptahhotep_umeni: { t: "Nebuď pyšný na své vědění, raď se s nevědomým jako s moudrým. Hranic umění nelze dosáhnout.", src: "Ponaučení Ptahhotepovo", tags: ["vedeni", "obecne"] },
  ptahhotep_maat: { t: "Velká je maat, trvalá je její účinnost; nebyla porušena od časů Usirových.", src: "Ponaučení Ptahhotepovo", tags: ["maat"] },
  rolnik: { t: "Konej maat pro pána maat… Nelži – ty jsi váhy.", src: "Příběh výmluvného rolníka", tags: ["maat", "obecne"] },
  ipuver_nil: { t: "Hle, Nil se rozvodnil, a přece nikdo neorá.", src: "Nářky Ipuverovy", tags: ["nepokoje", "obecne"] },
  ipuver_sandaly: { t: "Hle, kdo neměl ani sandály, je pánem bohatství.", src: "Nářky Ipuverovy", tags: ["nepokoje"] },
  neferti_reka: { t: "Řeka Egypta je vyschlá, lze ji přejít pěšky.", src: "Proroctví Neferetiho", tags: ["nizka"] },
  neferti_zdi: { t: "Postaví se Zdi vládcovy, aby Asiatům nebylo dovoleno sestoupit do Egypta.", src: "Proroctví Neferetiho", tags: ["zdi"] },
  anchtifi_hlad: { t: "Celý Horní Egypt umíral hladem… Nedopustil jsem, aby kdokoli v tomto nomu zemřel hladem.", src: "nápisy v hrobce Anchtifiho v Moalle", tags: ["hlad"] },
  anchtifi_hrdina: { t: "Jsem předvoj lidí i jejich zadní voj, hrdina, který nemá sobě rovného.", src: "nápisy v hrobce Anchtifiho v Moalle", tags: ["valka"] },
  hekanacht: { t: "Celá země zemřela, a vy jste nehladověli.", src: "dopis Hekanachta (počátek 12. dynastie)", tags: ["hlad"] },
  kamose_sila: { t: "K čemu je mi má síla, když jeden vládce sedí v Avaridu a druhý v Kuši, a já sedím spojen s Asiatem a Núbijcem, každý drží svůj kus Egypta?", src: "první stéla krále Kamoseho", tags: ["valka", "sip"] },
  kamose_prani: { t: "Mým přáním je zachránit Egypt a bít Asiaty.", src: "první stéla krále Kamoseho", tags: ["valka", "sip"] },
  kamose_vino: { t: "Piji víno z tvých vinic, které mi lisovali Asiaté, jež jsem zajal.", src: "druhá stéla krále Kamoseho", tags: ["vitezstvi", "sip"] },
  ebana_avaris: { t: "Pak byl Avaris vypleněn. Odnesl jsem odtud kořist: jednoho muže a tři ženy.", src: "životopis Ahmose, syna Ebany (hrobka v Elkabu)", tags: ["avaris"] },
  ebana_zlato: { t: "Byl jsem odměněn zlatem sedmkrát před celou zemí.", src: "životopis Ahmose, syna Ebany (hrobka v Elkabu)", tags: ["odmena"] },
  satira_pisar: { t: "Staň se písařem! Ušetří tě to dřiny… Je to lepší než všechna povolání.", src: "Satira na povolání", tags: ["pisari"] },
  satira_kovar: { t: "Viděl jsem kováře při práci u ústí jeho pece; prsty má jako krokodýlí kůži.", src: "Satira na povolání", tags: ["remesla"] },
  namornik: { t: "Jak šťastný je ten, kdo vypráví, co zažil, když strasti pominuly.", src: "Příběh o ztroskotaném námořníkovi", tags: ["vyprava"] },
  hapi_zdrav: { t: "Zdráv buď, Hapi, jenž vycházíš ze země a přicházíš, abys oživil Egypt.", src: "Hymnus na Nil", tags: ["zaplava"] },
  hapi_opozdi: { t: "Když se opozdí, ustane dech a všichni lidé zchudnou.", src: "Hymnus na Nil", tags: ["nizka"] },
  ct1130: { t: "Učinil jsem velkou záplavu, aby chudý měl na ni právo jako mocný. Učinil jsem každého člověka rovného jeho bližnímu.", src: "Texty rakví, zaříkání 1130", tags: ["texty"] },
  amenemhat: { t: "Nedůvěřuj bratru, neznej přítele, nečiň si důvěrníky – nic to nepřináší.", src: "Ponaučení krále Amenemhata I.", tags: ["zrada"] },
  harfenik: { t: "Těla pomíjejí… Slav šťastný den a neochabuj v něm! Hle, nikdo si nevezme své statky s sebou.", src: "Píseň harfeníka z hrobky krále Intefa", tags: ["pohreb"] },
  semna: { t: "Posunul jsem svou hranici dál, než dosáhli moji otcové… Kdo ji udrží, je můj syn.", src: "hraniční stéla Senusreta III. ze Semny", tags: ["katarakt"] },
  kletba: { t: "Každý vzbouřenec, každý, kdo spřádá zlé plány, každé zlé slovo a každý zlý sen… ať zemře.", src: "proklínací texty (Střední říše)", tags: ["proklinani"] },
  lekar: { t: "Jestliže vyšetřuješ muže s ránou na hlavě, která sahá až ke kosti… řekneš o něm: nemoc, kterou budu léčit.", src: "Smithův chirurgický papyrus", tags: ["lekarstvi"] },
  rhind: { t: "Přesný návod k poznání všech věcí, všeho temného a všech tajemství.", src: "Rhindův matematický papyrus", tags: ["matematika"] },
};
const Q = id => QUOTES[id] || null;
function quoteFor(s, tag) { const L = Object.values(QUOTES).filter(q => q.tags.includes(tag) && (!q.tags.includes("sip") || s.scen === "sip")); return L.length ? L[(s.turn * 7 + tag.length) % L.length] : null; }
const qText = q => q ? `„${q.t}“ (${q.src})` : "";
const TECH_QUOTE = { pisari: "satira_pisar", texty: "ct1130", lekarstvi: "lekar", matematika: "rhind", pevnosti: "semna" };
const MON_QUOTE = { katarakt: "semna", zdi: "neferti_zdi" };
