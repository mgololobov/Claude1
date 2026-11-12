// Zaklínací texty: jména nepřátel se psala na hliněné nádoby a figurky spoutaných zajatců, které se rituálně rozbily
// a pohřbily (soubory z konce Staré říše v Gíze, berlínské mísy a sakkárské figurky z 12. dynastie, depozit u pevnosti Mirgissa).
// Na nepřítele to nepůsobí; hra počítá jen s tím, co obřad dělal doma: uklidní lid, potěší kněze a posílí pocit řádu.
function execration(s, cid, target) {
  const C = s.clans[cid], T = s.clans[target]; if (!C || !T) return "Neznámý nepřítel.";
  if (C.type === "kmen") return "Kmeny tento obřad neznají.";
  if (!atWar(s, cid, target)) return "Zaklínají se jen nepřátelé, s nimiž válčíš.";
  if ((C.last.zakl ?? -99) > s.turn - 12) return `Obřad lze opakovat za ${C.last.zakl + 12 - s.turn} měs.`;
  if (C.deben < 300) return "Chybí 300 debenů na obětiny a hrnčíře.";
  C.deben -= 300; C.last.zakl = s.turn; C.maat = clamp(C.maat + 2, 0, 100);
  if (C.estates) C.estates.knezi = Math.min(100, C.estates.knezi + 3);
  for (const p of clanProvs(s, cid)) p.loy = clamp(p.loy + 2, 0, 100);
  log(s, `Kněží napsali jména nepřátel (${T.house}) na červené nádoby a figurky, rozbili je a pohřbili. Lid věří, že nepřítel je spoután: maat +2, spokojenost nomů +2.`, "udalosti", [cid]);
  return null;
}
