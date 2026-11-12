// Kalibrace cen vojska: pro každý druh hledá počet mužů, při němž je proti kopiníkům rovnocenný (úspěšnost jeho útoku proti kopiníkům se rovná úspěšnosti útoku kopiníků proti němu).
// Cena „na sto mužů“ pak vychází z ceny kopiníků: cena_k = 150 × (kopiníků / mužů druhu k při rovnováze).
// Použití: node tests/balance_calibrate.js [výcvik=70]
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = path.join(__dirname, "..", "src", "js");
const code = '"use strict";\n' + fs.readdirSync(dir).filter(f => /^0\d-.*\.js$/.test(f)).sort().map(f => fs.readFileSync(path.join(dir, f), "utf8")).join("\n") + "\n;this.A={newGame,battle,TROOPS,TROOP_IDS,PROVINCES,men};";
const ctx = {}; vm.createContext(ctx); vm.runInContext(code, ctx); const A = ctx.A, train = +(process.argv[2] || 70), N = 10000;
const NAT = { kopinici: "sik", lucistnici: "strelba", medzajove: "lest", vozy: "vozy" };
const s = A.newGame({ scen: "sip", clan: "thebes", seed: 1 }); let seed = 1;
const TERRS = ["udoli", "delta", "poust"].map(t => A.PROVINCES.find(p => p[5] === t)[0]);
function win(ka, na, kb, nb, pid, tacA, tacB) {
  let w = 0, n = 160; const own = s.provs[pid].owner; s.provs[pid].owner = "hyksos";
  for (let i = 0; i < n; i++) { s.seed = (seed += 7919); const a = { cl: "thebes", t: { [ka]: na }, train, cmd: 1, stance: "vyvazeny", tac: tacA || NAT[ka] }, d = { cl: "hyksos", t: { [kb]: nb }, train, cmd: 1, stance: "vyvazeny", tac: tacB || NAT[kb] }; if (A.battle(s, a, d, pid).win === "A") w++; s.battles.length = 0; }
  s.provs[pid].owner = own; return w / n * 100;
}
// bisekce: najde počet mužů m, při němž f(m) přejde z neúspěchu do úspěchu (f je rostoucí v m)
function solve(f) { let lo = N * 0.03, hi = N * 6; for (let it = 0; it < 14; it++) { const m = Math.round((lo + hi) / 2); if (f(m) >= 50) hi = m; else lo = m; } return Math.round((lo + hi) / 2); }
// síla útoku: kolik mužů druhu k musí zaútočit, aby vyhrály 50 % bitev proti N kopiníkům v obraně
// síla obrany: kolik mužů druhu k musí bránit, aby odrazily 50 % útoků N kopiníků (výhra obránce = 100 − výhra útočníka)
const att = (k, pid) => solve(m => win(k, m, "kopinici", N, pid)), def = (k, pid) => solve(m => 100 - win("kopinici", N, k, m, pid));
function parity(k, pid) { return Math.round(2 / (1 / att(k, pid) + 1 / def(k, pid))); }  // harmonický průměr počtů mužů
console.log(`výcvik ${train}; kopiníků ${N}, cena ${A.TROOPS.kopinici.cost}/100 mužů`);
for (const k of A.TROOP_IDS.filter(x => x !== "kopinici")) {
  const res = TERRS.map(pid => parity(k, pid)), avg = res.reduce((a, b) => a + b, 0) / res.length;
  console.log(`${A.TROOPS[k].n.padEnd(14)} mužů v rovnováze s 10 000 kopiníky (útok a obrana, harmonický průměr): ${res.join(" / ")} (údolí / delta / poušť) → průměr ${Math.round(avg)}; spravedlivá cena na 100 mužů ≈ ${Math.round(A.TROOPS.kopinici.cost * N / avg)} (dnes ${A.TROOPS[k].cost})`);
}
