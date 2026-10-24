// ---------- Kontrola návrhu ----------
function checkEffect(p, text) {
  const bad = []; const body = String(text || "").trim().replace(/^jednou\s+za\s+(kolo|tah|hru)\s*:\s*/i, "");
  const check = cmd => {
    let m;
    if ((m = cmd.match(/^pokud\s+(.+?)\s*:\s*(.+)$/i))) { const c = m[1].match(/^(.+?)\s*(>=|<=|=|>|<)\s*-?\d+([.,]\d+)?$/); if (!c) bad.push(`podmínka „${m[1]}“ má špatný tvar (např. Mince >= 3)`); else if (!["kolo", "ruka", "karty v ruce", "skóre"].includes(c[1].trim().toLowerCase()) && !resByName(p, c[1])) bad.push(`podmínka: neznámý zdroj „${c[1]}“`); m[2].split(",").forEach(x => check(x.trim())); return; }
    if ((m = cmd.match(/^zaplať\s+(.+?)\s*:\s*(.+)$/i))) { m[1].split("+").forEach(c => { const x = c.trim().match(/^(\d+)\s+(.+)$/); if (!x) bad.push(`cena „${c.trim()}“ má špatný tvar (např. 2 Mince)`); else if (!resByName(p, x[2])) bad.push(`neznámý zdroj „${x[2]}“`); }); m[2].split(",").forEach(x => check(x.trim())); return; }
    if ((m = cmd.match(/^nastav\s+(.+?)\s+(-?\d+)$/i))) { if (!resByName(p, m[1])) bad.push(`neznámý zdroj „${m[1]}“`); return; }
    if ((m = cmd.match(/^vyber\s*:\s*(.+)$/i))) { const o = m[1].split("|").map(x => x.trim()).filter(Boolean); if (o.length < 2) bad.push("volba potřebuje aspoň dvě možnosti oddělené |"); o.forEach(x => x.split(",").forEach(y => check(y.trim()))); return; }
    if ((m = cmd.match(/^soupeř\s+(.+)$/i))) { check(m[1].trim()); return; }
    if ((m = cmd.match(/^(všichni|ostatní|hráč)?\s*([+-]\s*\d+)\s+(.+)$/i))) { if (!resByName(p, m[3])) bad.push(`neznámý zdroj „${m[3]}“`); return; }
    if ((m = cmd.match(/^líznout\s+(\d+)(?:\s+z\s+(.+))?$/i))) { if (m[2] && !p.decks.find(d => d.name.toLowerCase() === m[2].trim().toLowerCase())) bad.push(`neznámý balíček „${m[2]}“`); return; }
    if ((m = cmd.match(/^událost(?:\s+z\s+(.+))?$/i))) { if (m[1] && !p.decks.find(d => d.name.toLowerCase() === m[1].trim().toLowerCase())) bad.push(`neznámý balíček „${m[1]}“`); return; }
    if ((m = cmd.match(/^táhnout\s+(\d+)\s+z\s+(.+)$/i))) { if (!p.bags.find(b => b.name.toLowerCase() === m[2].trim().toLowerCase())) bad.push(`neznámý sáček „${m[2]}“`); return; }
    if (/^(všichni|ostatní)?\s*posun\s+([+-]?\d+)$/i.test(cmd)) { if (!+p.track.length) bad.push("posun bez závodní dráhy"); return; }
    if (/^odhodit\s+\d+$/i.test(cmd) || /^(zpráva|oznámení)\s+.+$/i.test(cmd) || /^(vítěz|vyhrává|konec hry)$/i.test(cmd) || /^(první hráč|začínáš)$/i.test(cmd)) return;
    bad.push(`nerozumím „${cmd}“`);
  };
  body.split(/[;\n]/).map(s => s.trim()).filter(Boolean).forEach(check);
  return bad;
}
function lintProject(p) {
  const out = []; const W = t => out.push({ lv: "warn", t }), E = t => out.push({ lv: "err", t });
  p.decks.forEach(d => {
    const n = d.cards.reduce((a, c) => a + (+c.qty || 0), 0);
    if (!d.cards.length) W(`Balíček „${d.name}“ je prázdný.`);
    if (+d.market > n) E(`Trh balíčku „${d.name}“ má ${d.market} míst, ale balíček jen ${n} karet.`);
    const seen = {}; d.cards.forEach(c => { if (c.title && seen[c.title]) W(`V balíčku „${d.name}“ jsou dvě karty „${c.title}“ – nemá to být jedna s větším počtem?`); seen[c.title] = 1;
      checkEffect(p, c.effect).forEach(x => E(`Karta „${c.title}“: ${x}.`)); if (!+c.qty) W(`Karta „${c.title}“ má počet 0 – do hry se nedostane.`); });
  });
  p.ruleset.triggers.forEach(r => { if (!String(r.effect).trim()) W(`Automatické pravidlo „${TRIGGERS[r.on]}“ nemá žádný efekt.`); checkEffect(p, r.effect).forEach(x => E(`Pravidlo „${TRIGGERS[r.on]}“: ${x}.`)); });
  Object.entries(trackSpaces(p)).forEach(([i, e]) => checkEffect(p, e).forEach(x => E(`Pole dráhy ${i}: ${x}.`)));
  p.factions.forEach(f => { checkEffect(p, f.setup).forEach(x => E(`Start strany „${f.name}“: ${x}.`)); if (f.bot && !p.decks.find(d => d.id === f.bot)) E(`Automat „${f.name}“ nemá platný balíček.`); });
  checkEffect(p, p.bluffPenalty).forEach(x => E(`Trest za blafování: ${x}.`));
  p.actions.forEach(a => checkEffect(p, a.effect).forEach(x => E(`Akce „${a.name}“: ${x}.`)));
  const orphan = p.units.filter(u => !p.factions.find(f => f.id === u.factionId)); if (orphan.length) W(`${orphan.length} ${plural(orphan.length, "jednotka nemá", "jednotky nemají", "jednotek nemá")} stranu.`);
  const types = new Set(p.boards.map(b => b.type));
  p.tiles.forEach(tl => { const n = tileEdges(tl).length; if (n !== 4 && n !== 6) E(`Dílek „${tl.name}“ má ${n} hran – potřebuje 4 (čtverce) nebo 6 (hexy).`); else if (types.size && !types.has(n === 4 ? "square" : "hex")) W(`Dílek „${tl.name}“ má ${n} hran, ale žádná mapa nemá ${n === 4 ? "čtverce" : "hexy"}.`); });
  p.crt.cols.forEach(c => { if (!/^\d+(\.\d+)?:\d+(\.\d+)?$/.test(String(c).trim())) E(`Sloupec bojové tabulky „${c}“ není poměr typu 2:1.`); });
  const allLabels = new Set(p.boards.flatMap(b => Object.values(b.labels).map(v => v.toLowerCase())));
  p.scenarios.forEach(s => {
    if (s.boardId && !p.boards.find(b => b.id === s.boardId)) E(`Scénář „${s.name}“ odkazuje na smazanou mapu.`);
    if (s.holdF && s.holdLabels) s.holdLabels.split(",").map(x => x.trim()).filter(Boolean).forEach(l => { if (!allLabels.has(l.toLowerCase())) E(`Scénář „${s.name}“: pole „${l}“ na mapě není.`); });
    if (!String(s.victory || "").trim() && !s.holdF) W(`Scénář „${s.name}“ nemá podmínky vítězství.`);
  });
  (p.routes.tickets || []).forEach(x => [x.a, x.b].forEach(l => { if (l && !allLabels.has(l.toLowerCase())) E(`Cíl trasy: místo „${l}“ na žádné mapě není.`); }));
  if (p.stock.currency && !p.resources.find(r => r.id === p.stock.currency)) E("Burza platí smazaným zdrojem.");
  p.stock.goods.forEach(g => { if (!p.resources.find(r => r.id === g.resId)) E("Burza obchoduje se smazaným zdrojem."); });
  if (p.ruleset.playCost && !p.resources.find(r => r.id === p.ruleset.playCost)) E("Cena vyložení karty odkazuje na smazaný zdroj.");
  if (Object.values(p.ruleset.phaseOf).some(a => a && a.length) && !p.phases.length) W("Pravidla omezují činnosti na fáze, ale hra nemá žádné fáze.");
  if (p.ruleset.win.vp && !p.resources.some(r => r.vp)) W("Cíl „vyhrává, kdo dosáhne bodů“ potřebuje zdroj označený jako Vítězné body.");
  if (!String(p.summary || "").trim()) W("Hra nemá krátký popis – hodí se pro testery i poradce.");
  const size = JSON.stringify(p).length; if (size > 200000) E(`Projekt má ${Math.round(size / 1024)} kB. Ukládání k účtu zvládne nejvýš 256 kB – zmenši obrázek mapy nebo vymaž záznam hry.`);
  return out;
}
