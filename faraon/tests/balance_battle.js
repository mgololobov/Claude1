// Souboje armád za stejný rozpočet: kolik z 300 bitev vyhraje útočník, když oba mají stejnou hodnotu v debenech.
// Použití: node tests/balance_battle.js [rozpočet v debenech=30000] [terén=udoli] [výcvik=70]
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = path.join(__dirname, "..", "src", "js");
const code = '"use strict";\n' + fs.readdirSync(dir).filter(f => /^0\d-.*\.js$/.test(f)).sort().map(f => fs.readFileSync(path.join(dir, f), "utf8")).join("\n") + "\n;this.A={newGame,battle,TROOPS,TROOP_IDS,TACTICS,PROVINCES,men};";
const ctx = {}; vm.createContext(ctx); vm.runInContext(code, ctx); const A = ctx.A;
const budget = +(process.argv[2] || 30000), terr = process.argv[3] || "udoli", train = +(process.argv[4] || 70);
const pid = A.PROVINCES.find(p => p[5] === terr)[0];
const NAT = { kopinici: "sik", lucistnici: "strelba", medzajove: "lest", vozy: "vozy" };
function army(k, cl) { const t = {}; t[k] = Math.round(budget / A.TROOPS[k].cost * 100); return { cl, t, train, cmd: 1, stance: "vyvazeny", tac: NAT[k] }; }
function duel(ka, kb, tacA, tacB, n = 300) {
  let w = 0, lossA = 0, lossB = 0;
  for (let i = 0; i < n; i++) {
    const s = A.newGame({ scen: "sip", clan: "thebes", seed: 100 + i }); s.provs[pid].owner = "hyksos";
    const a = army(ka, "thebes"), d = army(kb, "hyksos"); if (tacA) a.tac = tacA; if (tacB) d.tac = tacB;
    const na = A.men(a.t), nd = A.men(d.t), b = A.battle(s, a, d, pid); if (b.win === "A") w++; lossA += (na - A.men(a.t)) / na; lossB += (nd - A.men(d.t)) / nd;
  }
  return [Math.round(w / n * 100), Math.round(lossA / n * 100), Math.round(lossB / n * 100)];
}
const K = A.TROOP_IDS, nm = k => A.TROOPS[k].n;
console.log(`Rozpočet ${budget} debenů na stranu, terén ${terr} (${pid}), výcvik ${train}. Muži: ${K.map(k => nm(k) + " " + Math.round(budget / A.TROOPS[k].cost * 100)).join(", ")}`);
console.log("\nÚtočník (řádek) proti obránci (sloupec), obě strany s vlastní typickou taktikou. Podíl výher útočníka % [ztráty útočníka % / obránce %]");
console.log("".padEnd(16) + K.map(k => nm(k).padEnd(20)).join(""));
for (const a of K) console.log(nm(a).padEnd(16) + K.map(b => { const [w, la, lb] = duel(a, b); return `${w}% [${la}/${lb}]`.padEnd(20); }).join(""));
console.log("\nVliv taktiky: kopiníci útočí na stejné kopiníky; taktika útočníka (řádek) proti taktice obránce (sloupec)");
const T = Object.keys(A.TACTICS); console.log("".padEnd(12) + T.map(t => t.padEnd(10)).join(""));
for (const a of T) console.log(a.padEnd(12) + T.map(b => String(duel("kopinici", "kopinici", a, b, 200)[0] + "%").padEnd(10)).join(""));
console.log("\nStejný počet mužů (1000 na stranu) – kolik % bitev vyhraje útočník s druhem v řádku proti kopiníkům");
for (const a of K) { let w = 0; for (let i = 0; i < 300; i++) { const s = A.newGame({ scen: "sip", clan: "thebes", seed: 500 + i }); s.provs[pid].owner = "hyksos"; const x = { cl: "thebes", t: { [a]: 1000 }, train, cmd: 1, stance: "vyvazeny", tac: NAT[a] }, y = { cl: "hyksos", t: { kopinici: 1000 }, train, cmd: 1, stance: "vyvazeny", tac: "sik" }; if (A.battle(s, x, y, pid).win === "A") w++; } console.log(nm(a).padEnd(16) + Math.round(w / 3) + "%"); }
