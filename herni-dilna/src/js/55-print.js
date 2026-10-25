// ---------- Co vytisknout: počty komponent, mapa v reálné velikosti, tabulky pro hru bez aplikace ----------
// Spočítá, co je ke hře potřeba (karty, žetony jednotek, žetony a markery, mapy, kostky, přehledy) a kolik archů A4 to zabere.
// Automatiku aplikace (losování počasí, šíření ohně, procenta) převádí na hody kostkou, aby šla hra hrát i u stolu bez tabletu.
const CTR_PER_PAGE = 12 * 17; // žetony 16 mm na A4
const HEX_MM = 19;            // hex / pole na tištěné mapě (pro žetony 16 mm)
function unitPrintQty(p, u) {
  let need = +u.qty || 0;
  (p.scenarios || []).forEach(s => { const n = ((s.setup && s.setup.items) || []).filter(i => i.kind === "unit" && i.unitId === u.id).length + (s.reinf || []).filter(r => r.unitId === u.id).reduce((a, r) => a + (+r.qty || 1), 0); need = Math.max(need, n); });
  return need;
}
function tokenPrintQty(p, tk) {
  if (tk.printQty !== "" && tk.printQty != null) return +tk.printQty || 0;
  const setup = Math.max(0, ...(p.scenarios || []).map(s => ((s.setup && s.setup.items) || []).filter(i => i.kind === "token" && i.tokenId === tk.id).length));
  const units = p.units.reduce((a, u) => a + unitPrintQty(p, u), 0);
  const h = tk.counter ? Math.max(1, p.factions.length) : ({ kour: 12, ohen: 8, mina: 6, drat: 6, vybusnina: 3, jidlo: 6 })[tk.fx] || (tk.fixed && tk.buildable ? Math.max(4, Math.ceil(units / 3)) : tk.small ? (isOnce(tk) ? 4 : 2) : 4);
  return Math.max(setup, h);
}
// Markery stavů a počítadel, které na tabletu nejsou vidět jako žetony.
function markerNeeds(p) {
  const out = []; const ctr = p.units.reduce((a, u) => a + unitPrintQty(p, u), 0); if (!ctr) return out;
  const war = p.units.some(u => !+u.hp && (u.att !== "" || u.def !== "")), crawl = p.units.some(u => +u.hp); const n = Math.max(3, Math.ceil(ctr / 4));
  const add = (name, qty, txt, color = "#fbfaf6") => qty > 0 && out.push({ name, qty, txt, color });
  if (war) { add("Rozvrácená", n, "✖ ROZV", "#f3d3cc"); add("Zakopaná", n, "⛨ ZAK", "#d9e4c7"); add("Unavená", n, "z UNAV", "#e8e2d0"); }
  if (p.morale.on || war) add("Potlačená", n, "⊘ POTL", "#e6dcef");
  add("Na hlídce", Math.ceil(n / 2), "👁 HLÍD", "#d6e6f2");
  if (crawl) { add("Otrávená", Math.ceil(n / 2), "☠ OTR", "#d9ecd0"); add("Omráčená", Math.ceil(n / 2), "✷ OMR", "#f2ecc6");
    const hp = p.units.filter(u => +u.hp).reduce((a, u) => a + +u.hp * unitPrintQty(p, u), 0); add("Zranění 1", Math.ceil(hp / 3), "−1 ♥", "#f3d3cc"); if (hp >= 10) add("Zranění 5", Math.ceil(hp / 10), "−5 ♥", "#e9b5aa"); }
  if (p.ruleset.actOnly) add("Aktivovaná", Math.ceil(ctr / 2), "✓ AKT", "#d9e4c7");
  const am = p.units.filter(u => u.ammo !== "" && u.ammo != null).reduce((a, u) => a + +u.ammo * unitPrintQty(p, u), 0); add("Munice −1", Math.ceil(am / 2), "▮ −1", "#ece6d6");
  const fu = p.units.filter(u => u.fuel !== "" && u.fuel != null).reduce((a, u) => a + +u.fuel * unitPrintQty(p, u), 0); add("Palivo −1", Math.ceil(fu / 2), "⛽ −1", "#ece6d6");
  const dur = [...p.tokens.filter(x => x.small), ...p.decks.flatMap(d => d.cards.filter(c => c.unitItem))].reduce((a, x) => a + (+x.dur || 0), 0); add("Výdrž −1", Math.ceil(dur / 2), "−1 VÝD", "#ece6d6");
  if ([...p.tokens, ...p.decks.flatMap(d => d.cards)].some(x => isOnce(x) && modText(x))) add("Dočasný účinek", 4, "✦ ÚČIN", "#e6dcef");
  if (envOn(p)) { add("Denní doba", 1, "☀ DOBA", "#fbe7a8"); add("Počasí", 1, "☂ POČ", "#d6e6f2"); if (p.env.conds.some(c => c.wind)) add("Směr větru", 1, "▲ VÍTR", "#fbfaf6"); p.env.grounds.forEach(g => add(g.name, 1, g.name.slice(0, 5).toUpperCase(), g.color)); }
  if (p.scenarios.some(s => +s.turns)) add("Kolo", 1, "KOLO", "#1b2421");
  return out;
}
// Mapa v měřítku pro žetony 16 mm, rozdělená na listy A4 (s překryvem 6 mm na lepení).
function boardPrintInfo(b) {
  const g = geo(b); const s = +b.size || 34; const sc = b.type === "square" ? HEX_MM / (1.8 * s) : HEX_MM / (Math.sqrt(3) * s); const W = g.W * sc, H = g.H * sc; const ov = 6;
  const pages = (pw, ph) => ({ cols: Math.max(1, Math.ceil((W - ov) / (pw - ov))), rows: Math.max(1, Math.ceil((H - ov) / (ph - ov))), pw, ph });
  const a = pages(190, 277), l = pages(277, 190); const best = a.cols * a.rows <= l.cols * l.rows ? { ...a, land: false } : { ...l, land: true };
  return { W, H, sc, ov, ...best, n: best.cols * best.rows };
}
function boardsToPrint(p) { const used = new Set(p.scenarios.map(s => s.boardId).filter(Boolean)); const list = p.boards.filter(b => used.has(b.id)); return list.length ? list : p.boards.slice(0, 1); }
// Kostky potřebné ke hře.
function diceNeeds(p) {
  const out = []; const add = (n, sides, why) => { if (!(n > 0) || !(sides > 1)) return; const e = out.find(x => x.sides === sides); if (e) { e.n = Math.max(e.n, n); e.why.push(why); } else out.push({ n, sides, why: [why] }); };
  if (p.units.length && p.crt.rows.length) add(1, p.crt.rows.length, "bojová tabulka");
  const maxA = Math.max(0, ...p.units.map(u => +u.att || 0)), maxD = Math.max(0, ...p.units.map(u => +u.def || 0));
  if (p.units.some(u => +u.hp) || maxA && p.dice) add(Math.min(10, Math.max(maxA, maxD) + 2), +p.dice.sides || 6, "útok a obrana kostkami");
  if (p.morale.on) add(+p.morale.dice || 2, +p.morale.sides || 6, "test morálky");
  if (envOn(p)) { const wt = weatherDie(p); if (wt) add(1, wt.sides, "počasí"); add(1, tableBoard(p) && tableBoard(p).type === "square" ? 4 : 6, "směr větru"); }
  (p.cdice || []).forEach(d => out.push({ n: 1, sides: d.faces.length, why: [`vlastní kostka „${d.name}“`], custom: d }));
  if (+p.dice.sides && !out.length && (p.decks.length || p.resources.length)) add(1, +p.dice.sides, "hody ve hře");
  return out;
}
function printNeeds(p) {
  const rows = []; const R = (group, name, qty, sheets, note = "") => rows.push({ group, name, qty, sheets, note });
  p.decks.forEach(d => { const n = d.cards.reduce((a, c) => a + (+c.qty || 0), 0) * (d.starter ? Math.max(1, p.factions.length) : 1); if (n) R("Karty", `Karty – ${d.name}`, n, Math.ceil(n / 9) * 2, `63 × 88 mm, 9 na arch, líc + rub${d.starter ? "; startovní – sada pro každého hráče" : ""}`); });
  let ctr = 0; p.factions.forEach(f => { const n = p.units.filter(u => u.factionId === f.id).reduce((a, u) => a + unitPrintQty(p, u), 0); if (n) { ctr += n; R("Žetony jednotek", `Jednotky – ${f.name}`, n, null, "16 mm, oboustranně (oslabená strana na rubu)"); } });
  const tks = p.tokens.map(tk => [tk, tokenPrintQty(p, tk)]).filter(([, n]) => n); let tn = 0;
  tks.forEach(([tk, n]) => { tn += n; R("Žetony", tk.name, n, null, tk.printQty !== "" && tk.printQty != null ? "počet zadaný v Komponentách" : "odhad – upravíš v Komponentách („Kusů k tisku“)"); });
  const mk = markerNeeds(p); mk.forEach(m => { tn += m.qty; R("Markery", m.name, m.qty, null, "16 mm"); });
  const cs = Math.ceil(ctr / CTR_PER_PAGE) * 2 + Math.ceil(tn / CTR_PER_PAGE); if (ctr + tn) R("Žetony", "Archy žetonů celkem", ctr + tn, cs, "jednotky oboustranně, ostatní jednostranně");
  if (p.units.length) boardsToPrint(p).forEach(b => { const i = boardPrintInfo(b); R("Mapa", `Mapa „${b.name}“`, 1, i.n, `${Math.round(i.W / 10)} × ${Math.round(i.H / 10)} cm, ${i.cols} × ${i.rows} listů A4 ${i.land ? "na šířku" : "na výšku"}, hex ${HEX_MM} mm, překryv 6 mm`); });
  else p.boards.forEach(b => { const i = boardPrintInfo(b); R("Mapa", `Deska „${b.name}“`, 1, i.n, `${Math.round(i.W / 10)} × ${Math.round(i.H / 10)} cm`); });
  if (p.nets && p.nets.length) R("Mapa", "Mapa míst a cest", p.nets.length, p.nets.length, "vytiskni ze záložky Mapa jako obrázek");
  if (p.tiles.length) { const n = p.tiles.reduce((a, t) => a + (+t.qty || 0), 0); R("Dílky", "Dílky", n, Math.ceil(n / 20), "asi 45 mm, 20 na arch"); }
  p.bags.forEach(b => R("Obstarat", `Sáček „${b.name}“ a žetony v něm`, b.contents.reduce((a, c) => a + (+c.count || 0), 0), null, b.contents.map(c => `${c.count}× ${c.label}`).join(", ")));
  p.resources.filter(r => !r.global).forEach(r => R("Obstarat", `Žetony zdroje „${r.name}“`, Math.max(1, p.factions.length) * Math.max(10, +r.max || 0, (+r.start || 0) * 3), null, "kostičky, mince nebo vytištěné žetony"));
  diceNeeds(p).forEach(d => R("Kostky", d.custom ? `Vlastní kostka „${d.custom.name}“` : `k${d.sides}`, d.n, null, d.why.join(", ")));
  if (p.rondel.on) { R("Mapa", "Deska rondelu", 1, 1, `${p.rondel.spaces.length} polí v kruhu`); R("Obstarat", "Figurky na rondel", p.factions.length, null, "1 na hráče"); }
  if (p.actions.length) R("Obstarat", `Figurky dělníků (${p.factions.length} barev)`, p.factions.length * 4, null, "3–5 na hráče");
  const np = Math.max(1, p.factions.length);
  R("Tisk pro hráče", "Pravidla", 1, Math.max(2, Math.ceil(((p.rules || "").length + 6000) / 5000)), "záložka Pravidla → tisk");
  R("Tisk pro hráče", "Přehled pro hráče (tabulky)", np, aidPages(p) * np, "bojová tabulka, terén, počasí, oheň, morálka – vše převedené na hody kostkou");
  if (p.scenarios.some(s => +s.turns)) R("Tisk pro hráče", "Ukazatel kol a rozestavení scénáře", 1, Math.max(1, p.scenarios.length), "kola s posilami a denní dobou, pozice jednotek");
  return rows;
}
function aidPages(p) { return 1 + (p.units.length ? 1 : 0) + (envOn(p) ? 1 : 0); }
// Převod vah a procent na hody kostkou.
function weightsToDie(items) {
  const it = items.filter(x => +x.w > 0); const tot = it.reduce((a, x) => a + +x.w, 0); if (!tot) return null; let best = null;
  for (const sides of [6, 8, 10, 12, 20, 100]) { if (sides < it.length) continue;
    const raw = it.map(x => x.w / tot * sides); const fl = raw.map(v => Math.max(1, Math.floor(v))); let left = sides - fl.reduce((a, b) => a + b, 0);
    const ord = raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]); for (let j = 0; left > 0; j = (j + 1) % ord.length, left--) fl[ord[j][1]]++;
    while (left < 0) { const i = fl.indexOf(Math.max(...fl)); fl[i]--; left++; }
    const err = it.reduce((a, x, i) => a + Math.abs(fl[i] / sides - x.w / tot), 0); if (!best || err < best.err - 1e-9) best = { sides, faces: fl, err }; if (err < 1e-9) break; }
  let n = 1; return { sides: best.sides, rows: it.map((x, i) => { const from = n; n += best.faces[i]; return { name: x.name, from, to: n - 1 }; }) };
}
function weatherDie(p) { return envOn(p) ? weightsToDie(p.env.conds.filter(c => c.kind === "weather").map(c => ({ name: c.name, w: +c.w || 0 }))) : null; }
function pctToRoll(pct) {
  pct = Math.max(0, Math.min(100, +pct || 0)); if (!pct) return "nikdy"; if (pct >= 100) return "vždy";
  const n6 = Math.round(pct * 6 / 100); if (n6 >= 1 && Math.abs(n6 * 100 / 6 - pct) < 1.5) return `k6: ${7 - n6}+`;
  if (pct % 10 === 0) return `k10: ${pct / 10 === 1 ? "1" : "1–" + pct / 10}`; return `k100: 1–${pct}`;
}
const rangeTxt = r => r.from === r.to ? `${r.from}` : `${r.from}–${r.to}`;
// Tabulky pro stolní hru (přehled pro hráče).
function analogTablesHTML(p) {
  const out = []; const S6 = tableBoard(p) && tableBoard(p).type === "square";
  if (p.units.length && p.crt.cols.length) out.push(`<h3>Bojová tabulka (k${p.crt.rows.length})</h3><table><tr><th></th>${p.crt.cols.map(c => `<th>${esc(c)}</th>`).join("")}</tr>${p.crt.rows.map((r, i) => `<tr><th>${i + 1}</th>${r.map(v => `<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</table>${p.crt.legend ? `<p class="n">${esc(p.crt.legend).replace(/\n/g, "<br>")}</p>` : ""}`);
  if (p.units.length) out.push(`<h3>Terén</h3><table><tr><th>Terén</th><th>Pohyb</th><th>Obrana ×</th><th>Posun</th><th>Výška</th><th>Výhled</th>${envOn(p) ? "<th>Oheň</th>" : ""}</tr>${p.terrains.map(x => `<tr><td>${esc(x.glyph || "")} ${esc(x.name)}</td><td>${esc(x.move)}</td><td>${esc(x.def)}</td><td>${+x.shift || 0}</td><td>${+x.h || 0}</td><td>${x.blocks ? "blokuje" : "–"}</td>${envOn(p) ? `<td>${x.burns ? "hoří" + (x.burnsTo ? " → " + esc((p.terrains.find(y => y.id === x.burnsTo) || {}).name || "") : "") : "–"}</td>` : ""}</tr>`).join("")}</table>`);
  if (facingOn(p)) out.push(`<h3>Natočení</h3><p>Žeton otoč hranou ke směru, kam hledí. Útok z boku: posun ${p.facing.flank}, zezadu: ${p.facing.rearB}${p.facing.vision && p.facing.stealth ? `, nepozorovaně navíc ${p.facing.stealthB}` : ""}.</p>`);
  if (p.morale.on) out.push(`<h3>Morálka</h3><p>Hoď ${p.morale.dice}k${p.morale.sides}: součet ≤ morálka = drží. Velitel v dosahu +${p.morale.cmdBonus}; oslabená, potlačená, mimo zásobování −1. Neúspěch: marker Rozvrácená; druhý neúspěch: ústup o pole.</p><p>Potlačující palba: kostky podle útoku, ${p.morale.supHit}+ = zásah. 1 zásah: marker Potlačená, 2 zásahy: test morálky.</p>`);
  if (envOn(p)) {
    const wd = weatherDie(p); const cy = envCycle(p);
    out.push(`<h3>Denní doba a počasí</h3><p>Doba podle kola: ${cy.map((n, i) => `${i + 1}. ${esc(n)}`).join(", ")} (pak znovu od začátku).</p>${wd && p.env.auto ? `<p>Na začátku kola hoď <b>k${wd.sides}</b> na počasí:</p><table><tr><th>Hod</th><th>Počasí</th><th>Vliv</th></tr>${wd.rows.map(r => `<tr><td>${rangeTxt(r)}</td><td>${esc(r.name)}</td><td>${esc(envText(p.env.conds.find(c => c.name === r.name)))}</td></tr>`).join("")}</table>` : ""}
      <table><tr><th>Doba</th><th>Vliv</th></tr>${p.env.conds.filter(c => c.kind === "time").map(c => `<tr><td>${esc(c.name)}</td><td>${esc(envText(c))}</td></tr>`).join("")}</table>`);
    if (p.env.grounds.length) out.push(`<h3>Terén po počasí</h3><table><tr><th>Stav</th><th>Vznikne při</th><th>Vydrží po něm</th><th>Úpravy</th></tr>${p.env.grounds.map(g => `<tr><td>${esc(g.name)}</td><td>${esc(g.from)}</td><td>${g.lasts} ${plural(+g.lasts, "kolo", "kola", "kol")}</td><td>${esc(g.fx)}</td></tr>`).join("")}</table>`);
    const F = p.env.fire; const dirs = S6 ? DIR_NAMES_SQ : DIR_NAMES_HEX;
    out.push(`<h3>Vítr, kouř a oheň</h3><p>Směr větru (při větrném počasí, když se mění – hod k6 ${pctToRoll(34)}): hoď k${dirs.length}: ${dirs.map((d, i) => `${i + 1} ${d}`).join(", ")}.</p>
      <p>Kouř: marker vydrží ${F.smoke} ${plural(+F.smoke, "kolo", "kola", "kol")} (otoč/ubírej). Ve větru se každé kolo posune o pole po větru a ubere 1 navíc; za mokra také 1 navíc. Zakrývá výhled.</p>
      <p>Oheň: na začátku kola hodí ${F.hits} ${plural(+F.hits, "kostku", "kostky", "kostek")} na každou jednotku na svém poli (zásah ${p.dice.aHit}+), na pole položí kouř a šíří se na sousední hořlavé pole: po větru <b>${pctToRoll(F.spread)}</b>, bez větru na každé sousední <b>${pctToRoll(F.still)}</b>. Hoří ${F.life} ${plural(+F.life, "kolo", "kola", "kol")}, pak pole dohoří (les → spáleniště, město → trosky; polož marker terénu). Mokré počasí oheň uhasí.</p>`);
  }
  const mines = p.tokens.filter(x => x.fx === "mina"); if (mines.length) out.push(`<h3>Miny a dráty</h3><p>${mines.map(x => `${esc(x.name)}: ${x.fxN || 1} ${plural(+x.fxN || 1, "kostka", "kostky", "kostek")} na jednotku, která vstoupí (zásah ${p.dice.aHit}+)`).join("; ")}. Skrytou minu si zapíše rozhodčí nebo hráč na papír (pole).</p>`);
  return out.join("");
}
// Ukazatel kol a rozestavení scénářů.
function turnTrackHTML(p) {
  return p.scenarios.filter(s => +s.turns).map(s => { const b = p.boards.find(x => x.id === s.boardId); const g = b && geo(b); const cy = envOn(p) ? envCycle(p) : [];
    const pos = {}; ((s.setup && s.setup.items) || []).forEach(i => { if (!b) return; const [w, h] = itemSize(i); const cr = g.pick(i.x + w / 2 - BX, i.y + h / 2 - BY); if (!cr) return; const tk = i.kind === "token" && p.tokens.find(x => x.id === i.tokenId); const nm = i.kind === "unit" ? (p.units.find(u => u.id === i.unitId) || {}).name : tk && (tk.hidden ? tk.name + " (skrytá – jen pro rozhodčího, hráčům nečti)" : tk.name); if (nm) (pos[nm] = pos[nm] || []).push(cr.map(n => pad2(n + 1)).join("")); });
    return `<h2>${esc(s.name)}</h2><div class="track">${Array.from({ length: +s.turns }, (_, i) => { const r = (s.reinf || []).filter(x => +x.turn === i + 1).map(x => `${x.qty || 1}× ${(p.units.find(u => u.id === x.unitId) || {}).name || ""}`); return `<div class="tb"><b>${i + 1}</b>${cy.length ? `<span>${esc(cy[i % cy.length])}</span>` : ""}${r.length ? `<span>+ ${esc(r.join(", "))}</span>` : ""}</div>`; }).join("")}</div>
      ${Object.keys(pos).length ? `<h3>Rozestavení</h3><table>${Object.entries(pos).map(([n, ks]) => `<tr><td>${esc(n)}</td><td>${ks.join(", ")}</td></tr>`).join("")}</table>` : ""}${s.victory ? `<p><b>Vítězství:</b> ${esc(s.victory)}</p>` : ""}`; }).join("");
}
// Listy mapy v reálné velikosti.
function boardPagesHTML(p) {
  const T = p.table; p.table = null; // tiskne se návrh mapy, ne stav rozehrané hry (spáleniště)
  try { return boardsToPrint(p).map(b => { const i = boardPrintInfo(b); const svg = boardSVG(p, b, null, { regions: true }).replace("<svg ", `<svg style="width:${i.W}mm;height:${i.H}mm" `); const out = [];
    for (let r = 0; r < i.rows; r++) for (let c = 0; c < i.cols; c++) { const x = c * (i.pw - i.ov), y = r * (i.ph - i.ov);
      out.push(`<section class="pg ${i.land ? "land" : ""}"><p class="n">${esc(b.name)} – list ${r * i.cols + c + 1}/${i.n} (řada ${r + 1}, sloupec ${c + 1}); okraj 6 mm se překrývá se sousedním listem</p><div class="tile" style="width:${i.pw}mm;height:${i.ph - 8}mm"><div style="position:absolute;left:${-x}mm;top:${-y}mm">${svg}</div></div></section>`); }
    return out.join(""); }).join(""); } finally { p.table = T; }
}
function printPlanDialog(p) {
  const rows = printNeeds(p); const sheets = rows.reduce((a, r) => a + (r.sheets || 0), 0); const groups = [...new Set(rows.map(r => r.group))];
  openDialog(`<h2>Co vytisknout a připravit</h2>
    <p class="hint">Spočítáno z karet, jednotek, žetonů, scénářů a zapnutých mechanik. Celkem asi <b>${sheets} ${plural(sheets, "arch", "archy", "archů")} A4</b>.</p>
    <div style="overflow-x:auto"><table class="crt-tab plan"><thead><tr><th>Co</th><th>Kusů</th><th>Archů A4</th><th>Poznámka</th></tr></thead><tbody>
    ${groups.map(g => `<tr><th colspan="4" style="text-align:left">${esc(g)}</th></tr>${rows.filter(r => r.group === g).map(r => `<tr><td>${esc(r.name)}</td><td class="mono">${r.qty}</td><td class="mono">${r.sheets ?? ""}</td><td class="hint">${esc(r.note)}</td></tr>`).join("")}`).join("")}</tbody></table></div>
    <p class="hint">Tisková archa obsahuje karty, žetony jednotek, žetony a markery v potřebném počtu, mapu po listech A4 ve skutečné velikosti, ukazatel kol s rozestavením a přehled pro hráče s tabulkami pro hru bez aplikace. Tiskni ve skutečné velikosti (100 %).</p>
    <div class="row" style="justify-content:flex-end"><button class="btn" data-close>Zavřít</button><button class="btn primary" id="planGo">Vytvořit tiskovou archu</button></div>`, true);
  $("#planGo").onclick = () => { closeDialog(); exportPrint(p, { backs: true, full: true }); };
}
// Doplňky tiskové archy (volá exportPrint s full: true).
function printExtrasHTML(p) {
  const mk = markerNeeds(p).flatMap(m => Array.from({ length: m.qty }, () => `<div class="token ctverec" style="background:${m.color};color:${inkFor(m.color)}"><span class="tt">${esc(m.txt)}</span></div>`));
  let html = mk.length ? `<section class="pg"><h1>${esc(p.name)} – markery stavů a počítadel</h1><div class="counters">${mk.join("")}</div></section>` : "";
  if (p.units.length || p.boards.length) html += boardPagesHTML(p);
  const tt = turnTrackHTML(p); if (tt) html += `<section class="pg aid"><h1>${esc(p.name)} – ukazatel kol a rozestavení</h1>${tt}</section>`;
  const at = analogTablesHTML(p); if (at) html += `<section class="pg aid"><h1>${esc(p.name)} – přehled pro hráče</h1>${at}</section>`;
  return html;
}
const PRINT_EXTRA_CSS = `@page land{size:A4 landscape;margin:8mm}.pg.land{page:land}.tile{position:relative;overflow:hidden;border:.2mm dashed #aaa}
.aid{font-size:9pt}.aid h2{font-size:12pt;margin:4mm 0 2mm}.aid h3{font-size:10pt;margin:3mm 0 1mm}.aid table{border-collapse:collapse;margin:1mm 0 2mm}.aid td,.aid th{border:.2mm solid #999;padding:.6mm 1.5mm;text-align:left}.aid p{margin:1mm 0}
.board-svg .coord{font-family:monospace;font-size:7px;fill:rgba(0,0,0,.5)}.board-svg .glyph{font-size:13px;fill:rgba(0,0,0,.35)}.board-svg .lab{font-size:10px;font-weight:700;fill:#fff;stroke:rgba(0,0,0,.65);stroke-width:2.5px;paint-order:stroke}
.board-svg .reg{fill:none;stroke-width:4;stroke-linecap:round}.board-svg .regl{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;paint-order:stroke;stroke:rgba(255,255,255,.85);stroke-width:3px}.board-svg .num{font-family:monospace;font-size:11px;font-weight:700}
.track{display:flex;flex-wrap:wrap;gap:0}.tb{width:22mm;min-height:18mm;border:.3mm solid #333;padding:1mm;display:flex;flex-direction:column;font-size:7pt}.tb b{font-size:11pt}`;
