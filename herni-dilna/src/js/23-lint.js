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
    if (/^(odhodit|vyhostit)\s+\d+$/i.test(cmd) || /^(zpráva|oznámení)\s+.+$/i.test(cmd) || /^(vítěz|vyhrává|konec hry)$/i.test(cmd) || /^(první hráč|začínáš)$/i.test(cmd)) return;
    bad.push(`nerozumím „${cmd}“`);
  };
  body.split(/[;\n]/).map(s => s.trim()).filter(Boolean).forEach(check);
  return bad;
}
function lintProject(p) {
  const out = []; const W = t => out.push({ lv: "warn", t }), E = t => out.push({ lv: "err", t });
  lintNewer(p, W, E);
  if (!facingOn(p)) { p.units.filter(u => unitZones(u).some(z => z.arc)).forEach(u => W(`Jednotka „${u.name}“ má zóny vázané na směr, ale natočení jednotek je vypnuté (Mechaniky) – zóny se trefují bez ohledu na směr.`)); }
  p.tokens.filter(x => x.frontOnly && !x.fixed).forEach(x => W(`Žeton „${x.name}“ chrání jen zepředu, ale není pevný – směr se počítá jen u pevných žetonů.`));
  p.units.filter(u => unitZones(u).some(z => !String(z.name || "").trim())).forEach(u => W(`Jednotka „${u.name}“ má zónu bez názvu.`));
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
  // Obrázky, stůl, testy a verze se ukládají zvlášť; limit 256 kB hlídá jen samotný návrh.
  lintMore(p, E, W);
  return out;
}

// Kontroly novějších mechanik: chybějící odkazy, efekty a nastavení, které nedává smysl.
function lintMore(p, E, W) {
  const R = id => p.resources.find(r => r.id === id); const eff = (label, e) => checkEffect(p, e).forEach(x => E(`${label}: ${x}.`));
  p.decks.forEach(d => d.cards.forEach(c => { eff(`Karta „${c.title}“ – příjem`, c.income); eff(`Karta „${c.title}“ – aktivace`, c.act);
    if ((c.pow !== "" && c.pow != null) !== (c.tough !== "" && c.tough != null)) W(`Karta „${c.title}“ má jen sílu, nebo jen odolnost – bytost potřebuje obojí.`); }));
  (p.techs || []).forEach(x => { eff(`Technologie „${x.name}“`, x.effect); techNames(x.req).forEach(n => { if (!p.techs.some(y => y.name.toLowerCase() === n)) E(`Technologie „${x.name}“ vyžaduje neexistující „${n}“.`); });
    String(x.cost || "").split(/[,+;]/).map(s => s.trim()).filter(Boolean).forEach(s => { const m = s.match(/^(\d+)\s+(.+)$/); if (!m || !resByName(p, m[2])) E(`Technologie „${x.name}“: cenu „${s}“ nerozumím (piš např. 3 Mince).`); }); });
  (p.goals || []).forEach(g => { if (!String(g.what || "").trim()) W(`Veřejný cíl „${g.name || "bez názvu"}“ nemá, co se počítá.`); });
  if (p.cmap && p.cmap.on && !p.decks.find(d => d.id === p.cmap.deckId)) E("Mapa z karet lokací je zapnutá, ale nemá vybraný balíček lokací.");
  if (p.cmap && p.cmap.on && p.cmap.apRes && !R(p.cmap.apRes)) E("Mapa z karet platí pohyb smazaným zdrojem.");
  if (p.netCubes && p.netCubes.on && !p.nets.length) W("Kostičky na místech jsou zapnuté, ale hra nemá žádnou síť míst.");
  p.nets.forEach(n => { const names = n.nodes.map(x => x.name.trim().toLowerCase()); if (new Set(names).size < names.length) W(`Síť „${n.name}“ má dvě místa se stejným jménem.`);
    n.nodes.forEach(x => { if (!n.links.some(l => l.a === x.id || l.b === x.id)) W(`Místo „${x.name}“ v síti „${n.name}“ nemá žádnou cestu.`); }); });
  const places = new Set([...p.nets.flatMap(n => n.nodes.map(x => x.name)), ...p.boards.flatMap(b => Object.values(b.labels)), ...p.decks.flatMap(d => d.cards.map(c => c.title))].map(s => String(s).trim().toLowerCase()));
  if (p.deliver && p.deliver.on) p.contracts.forEach(c => { [c.from, c.to].forEach(l => { if (l && !places.has(l.trim().toLowerCase())) E(`Zakázka ${c.good}: místo „${l}“ není v síti, na mapě ani mezi kartami lokací.`); }); eff(`Zakázka ${c.good}`, c.reward); });
  if (p.rail && p.rail.on) { if (!R(p.rail.cashRes)) E("18xx: vyber zdroj, kterým hráči platí (Peníze hráčů)."); if (!p.rail.companies.length) W("18xx je zapnuté, ale nemá žádné společnosti.");
    if (nums(p.rail.market).length < 3) E("18xx: burza potřebuje aspoň 3 kurzy."); p.rail.companies.forEach(c => { if (c.home && !p.nets.some(n => n.nodes.some(x => same(x.name, c.home)))) W(`Společnost „${c.name}“: domovské místo „${c.home}“ není v žádné síti.`); }); }
  if (p.cb) { if (p.cb.lifeRes && !R(p.cb.lifeRes)) E("Životy hráče odkazují na smazaný zdroj."); if (p.cb.fightRes && !R(p.cb.fightRes)) E("Síla na příšery odkazuje na smazaný zdroj.");
    if (p.decks.some(d => d.cards.some(c => +c.fight)) && !p.cb.fightRes) W("Některé karty jdou porazit, ale v Mechanikách není nastavená síla na porážení příšer."); }
  p.resources.forEach(r => { if (r.pool && !R(r.pool)) E(`Zdroj „${r.name}“ se bere ze smazané zásoby.`); });
  if (p.ruleset.win.poolEnd && !p.resources.some(r => r.pool)) W("Konec při prázdné zásobě je zapnutý, ale žádný zdroj se ze zásoby nebere.");
  p.scenarios.forEach(s => (s.reinf || []).forEach(r => { if (!p.units.find(u => u.id === r.unitId)) E(`Scénář „${s.name}“: posila odkazuje na smazanou jednotku.`); }));
  p.tokens.filter(x => x.small && !MODS.some(([m]) => +x[m]) && !itemText(x) && !x.fx && !(x.zone && +x.mZone)).forEach(x => W(`Malý žeton „${x.name}“ nic neupravuje – nastav mu úpravy hodnot.`));
  if (p.ruleset.actOnly && p.units.length && !p.units.some(u => +u.cmd)) W("Táhnout smí jen aktivované jednotky, ale žádná jednotka nemá dosah velení – aktivovat půjdou jen jednotlivě.");
  chitList(p).forEach(c => { if (!c.fid) W(`Žeton aktivace „${c.name}“ nemá stranu (piš „Název; Strana“).`); });
}
