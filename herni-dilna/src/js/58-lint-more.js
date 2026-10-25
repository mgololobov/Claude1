// ---------- Kontrola návrhu pro novější mechaniky ----------
// Hledá nesrovnalosti, které by se jinak projevily až při hře: chybné efekty, názvy, které na nic neodkazují, a nastavení bez účinku.
function lintNewer(p, W, E) {
  const fx = (where, text) => { if (String(text || "").trim()) checkEffect(p, text).forEach(x => E(`${where}: ${x}.`)); };
  // Rondel, údržba, události
  if (p.rondel.on) {
    if (p.rondel.spaces.length < 3) W(`Rondel má jen ${p.rondel.spaces.length} ${plural(p.rondel.spaces.length, "pole", "pole", "polí")} – kruh akcí potřebuje aspoň 3.`);
    p.rondel.spaces.forEach(s => { if (!String(s.effect || "").trim()) W(`Pole rondelu „${s.name}“ nemá efekt.`); fx(`Rondel „${s.name}“`, s.effect); });
    if (+p.rondel.free >= p.rondel.spaces.length) W("Rondel: počet polí zdarma je stejný nebo větší než počet polí – poplatek se nikdy neplatí.");
  }
  if (p.upkeep.on) { if (!p.resources.find(r => r.id === p.upkeep.res)) E("Údržba je zapnutá, ale nemá vybraný zdroj."); fx("Postih za údržbu", p.upkeep.penalty); if (!+p.upkeep.base && !+p.upkeep.perTab) W("Údržba je zapnutá, ale nic nestojí (za hráče i za kartu 0)."); }
  if (p.roundEvent) { const d = p.decks.find(x => x.id === p.roundEvent); if (!d) E("Událost kola odkazuje na smazaný balíček."); else if (!d.cards.some(c => String(c.effect || "").trim())) W(`Balíček událostí „${d.name}“ nemá žádnou kartu s efektem – události se jen zapíšou.`); }
  if (p.reserve.on && !p.decks.some(d => +d.market > 0)) W("Rezervace karet je zapnutá, ale žádný balíček nemá trh.");
  // Karty: slevy, spojenci
  const anyPrice = p.marketCur || p.ruleset.playCost;
  p.decks.forEach(d => d.cards.forEach(c => {
    fx(`Karta „${c.title}“ – spojenec`, c.allyFx);
    if (+c.disc && !anyPrice) W(`Karta „${c.title}“ dává slevu, ale hra nemá měnu trhu ani cenu vyložení – sleva nemá na co působit.`);
    if (c.discType && !p.decks.some(x => x.cards.some(y => y.type === c.discType))) W(`Karta „${c.title}“: sleva na typ „${c.discType}“, ale žádná karta takový typ nemá.`);
    if (c.allyFx && !(c.allyType || c.type)) W(`Karta „${c.title}“ má spojeneckou schopnost, ale ani typ – nikdy se nespustí.`);
    if (c.allyType && !p.decks.some(x => x.cards.some(y => y !== c && y.type === c.allyType))) W(`Karta „${c.title}“: spojenec typu „${c.allyType}“, ale jiná karta takový typ nemá.`);
    if (c.unitItem && !p.units.length) W(`Karta „${c.title}“ je předmět pro jednotku, ale hra nemá jednotky.`);
  }));
  // Předměty
  [...p.tokens.filter(x => x.small).map(x => [x, `Žeton „${x.name}“`]), ...p.decks.flatMap(d => d.cards.filter(c => c.unitItem).map(c => [c, `Karta „${c.title}“`]))].forEach(([x, n]) => {
    if (x.target && !+x.reach && x.target === "unit" && x.foes !== "ally" && x.foes !== "all") W(`${n} míří cíleně na nepřítele, ale má dosah 0 – nikdy nebude mít cíl.`);
    if (x.absorb && !+x.dur) W(`${n} pohlcuje zásahy, ale nemá výdrž – nic nepohltí.`);
    if (x.wear && !+x.dur) W(`${n} se opotřebí útokem, ale nemá výdrž.`);
    if (x.use === "once" && !x.target && !+x.heal && !x.cure && !x.ammo && !modText(x) && x.fx !== "jidlo") W(`${n} je jednorázový, ale nic nedělá.`);
    if (x.spawn === "ohen" && !p.terrains.some(t => t.burns)) W(`${n} zakládá oheň, ale žádný terén není hořlavý – oheň se nebude šířit.`);
  });
  // Jednotky
  p.units.forEach(u => {
    if (u.indirect && !(+u.range > 1)) W(`Jednotka „${u.name}“ má nepřímou palbu, ale dostřel menší než 2.`);
    if (u.fuel !== "" && u.fuel != null && !+u.fuel) W(`Jednotka „${u.name}“ má palivo 0 – nepohne se.`);
    if (u.ammo !== "" && u.ammo != null && !+u.ammo) W(`Jednotka „${u.name}“ má munici 0 – nezaútočí.`);
  });
  // Terén
  p.terrains.forEach(t => { if (t.burnsTo && !p.terrains.some(x => x.id === t.burnsTo)) E(`Terén „${t.name}“ se po spálení mění na smazaný terén.`); if (t.breaksTo && !p.terrains.some(x => x.id === t.breaksTo)) E(`Terén „${t.name}“ se po zničení mění na smazaný terén.`); });
  // Doba a počasí
  if (envOn(p)) {
    const names = p.env.conds.map(c => c.name.toLowerCase()), times = p.env.conds.filter(c => c.kind === "time").map(c => c.name.toLowerCase());
    envCycle(p).forEach(n => { if (!times.includes(n.toLowerCase())) E(`Střídání doby obsahuje „${n}“, ale taková denní doba v tabulce není.`); });
    if (p.env.auto && !p.env.conds.some(c => c.kind === "weather" && +c.w > 0)) W("Počasí se má losovat, ale všechna počasí mají váhu 0.");
    p.env.grounds.forEach(g => { String(g.from || "").split(",").map(x => x.trim()).filter(Boolean).forEach(n => { if (!names.includes(n.toLowerCase())) W(`Stav terénu „${g.name}“ vzniká při „${n}“, ale takové počasí není.`); });
      Object.keys(parseGroundFx(g.fx)).forEach(tn => { if (!p.terrains.some(t => t.name.toLowerCase() === tn)) W(`Stav terénu „${g.name}“ upravuje terén „${tn}“, který neexistuje.`); });
      if (String(g.fx || "").trim() && !Object.keys(parseGroundFx(g.fx)).length) E(`Stav terénu „${g.name}“: úpravy nejdou přečíst (zapiš např. „Rovina +1, Bažina –“).`); });
  } else if (p.tokens.some(x => ["kour", "ohen"].includes(x.fx))) W("Hra má žetony kouře nebo ohně, ale denní doba a počasí jsou vypnuté – kouř se nerozplývá a oheň se nešíří.");
  // Morálka
  if (p.morale.on && +p.morale.base > (+p.morale.dice || 2) * (+p.morale.sides || 6)) W("Výchozí morálka je vyšší než nejvyšší možný hod – test vždy projde.");
}
