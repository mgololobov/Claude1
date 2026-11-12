// Královská rada: panovník určí směr vlády (výnos) a rádce podle něj rozdá rozkazy úředníkům, kteří žádný nedostali.
// Jednotlivým úředníkům lze dál velet ručně; naléhavé věci (hlad, vzpoura, obrana) mají vždy přednost.
const POLICIES = {
  rovnovaha: { n: "Rovnováha", d: "rádce rozhoduje podle potřeb každého nomu", ic: "maat" },
  pole: { n: "Kanály a pole", d: "prohlubovat kanály a opravovat hráze – víc obilí", ic: "grain" },
  remesla: { n: "Řemesla a trh", d: "dílny, trhy a přístavy – víc debenů", ic: "deben" },
  vojsko: { n: "Vojsko", d: "odvody, výcvik a hradby – připravit se na válku", ic: "vojsko" },
  stavby: { n: "Stavby", d: "chrámy, sýpky, dílny a pevnosti v nomech", ic: "nomy" },
  ucenost: { n: "Dům života", d: "písaři a kněží zkoumají nové vědění", ic: "urednici" },
  maat: { n: "Bohové a lid", d: "obětiny a rozdávání obilí – maat a spokojenost", ic: "slava" },
};
function policyTry(s, cid, c) {
  const C = s.clans[cid], p = s.provs[c.loc], pol = C.policy || "rovnovaha"; if (!p || pol === "rovnovaha") return false;
  const need = monthlyGrainNeed(s, cid), tryC = (k, a, b) => doCmd(s, cid, c.id, k, a, b) === null;
  if (pol === "pole") return p.agri < agriCap(s, p) - 1 && C.grain > need * 4 + 4000 && tryC("zavlaha");
  if (pol === "remesla") return p.com < comCap(s, p) - 1 && C.deben > 500 && tryC("remesla");
  if (pol === "vojsko") {
    if (men(p.troops) < troopCap(p) * 0.9 && C.grain > need * 8 && C.deben > 600) { const types = ["kopinici", "lucistnici"]; if (hasTech(s, cid, "vuz") && C.kone > 200 && C.deben > 4000) types.push("vozy"); if (tryC("odvod", pick(s, types))) return true; }
    if (men(p.troops) > 200 && p.train < 70 && tryC("vycvik")) return true;
    return p.dur < durMax(s, p) * 0.9 && tryC("hradby");
  }
  if (pol === "stavby") {
    if (p.build || C.deben < 2500) return false;
    for (const b of ["sypka", "chram", "dilny", "pristav", "lom", "pevnost"]) if ((b === "pevnost" ? p.castle < 3 && isBorder(s, p) : (p.b[b] || 0) < 2) && !canBuild(s, cid, p, b) && tryC("stavba", b)) return true;
    return false;
  }
  if (pol === "ucenost") return !!C.res.cur && C.deben > 600 && tryC("uceni");
  if (pol === "maat") { if (C.maat < 92 && C.deben > 1200 && tryC("obeti")) return true; return p.loy < 70 && C.grain > need * 8 && tryC("rozdat"); }
  return false;
}
var _aiDomestic0 = aiDomestic;
aiDomestic = function (s, cid, c, adviser) {
  if (isPlayer(s, cid) && !cmdCheck(s, cid, c)) { const p = s.provs[c.loc]; if (p && p.loy >= 32 && p.hunger <= 0.2 && !(isFront(s, p) && men(p.troops) < troopCap(p) * 0.4) && policyTry(s, cid, c)) return; }
  return _aiDomestic0(s, cid, c, adviser);
};
// na konci měsíce rádce zaměstná všechny, kdo nedostali rozkaz (lze vypnout)
var _delegated0 = delegated;
delegated = function (s) {
  _delegated0(s);
  if (s.opts.autoPlan === false) return;
  for (const p of clanProvs(s, s.player)) if (!p.siege) for (const c of officersIn(s, p.id)) if (c.acted !== s.turn) aiDomestic(s, s.player, c, true);
};
function setPolicy(s, k) { if (!POLICIES[k]) return "Neznámý výnos."; P(s).policy = k; log(s, `Královský výnos: ${POLICIES[k].n} – ${POLICIES[k].d}.`, "rozkazy", [s.player]); return null; }
