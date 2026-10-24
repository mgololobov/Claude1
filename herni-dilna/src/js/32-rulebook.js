// ---------- Příručka pravidel a seznam komponent ----------
function describeEffect(text) {
  let body = String(text || "").trim(); if (!body) return ""; const parts = [];
  const once = body.match(/^jednou\s+za\s+(kolo|tah|hru)\s*:\s*/i); if (once) { parts.push(`jednou za ${once[1]}:`); body = body.slice(once[0].length); }
  const one = c => { let m; c = c.trim();
    if ((m = c.match(/^pokud\s+(.+?)\s*:\s*(.+)$/i))) return `pokud ${m[1]}, pak ${m[2].split(",").map(one).join(" a ")}`;
    if ((m = c.match(/^zaplať\s+(.+?)\s*:\s*(.+)$/i))) return `zaplať ${m[1].replace(/\+/g, "a")} a ${m[2].split(",").map(one).join(" a ")}`;
    if ((m = c.match(/^vyber\s*:\s*(.+)$/i))) return `vyber si: ${m[1].split("|").map(o => o.split(",").map(one).join(" a ")).join(", nebo ")}`;
    if ((m = c.match(/^soupeř\s+(.+)$/i))) return `zvolený soupeř: ${one(m[1])}`;
    if ((m = c.match(/^(všichni|ostatní|hráč)?\s*([+-])\s*(\d+)\s+(.+)$/i))) { const who = (m[1] || "").toLowerCase(); const verb = m[2] === "+" ? (who ? "získají" : "získej") : (who ? "ztratí" : "ztrať"); return `${who ? who + " " : ""}${verb} ${m[3]} × ${m[4]}`; }
    if ((m = c.match(/^líznout\s+(\d+)(?:\s+z\s+(.+))?$/i))) return `lízni ${m[1]} ${plural(+m[1], "kartu", "karty", "karet")}${m[2] ? " z balíčku " + m[2] : ""}`;
    if ((m = c.match(/^táhnout\s+(\d+)\s+z\s+(.+)$/i))) return `táhni ${m[1]} ${plural(+m[1], "žeton", "žetony", "žetonů")} ze sáčku ${m[2]}`;
    if ((m = c.match(/^(všichni|ostatní)?\s*posun\s+([+-]?\d+)$/i))) return `${m[1] ? m[1] + " se posunou" : "posuň se"} o ${Math.abs(+m[2])} ${Math.abs(+m[2]) >= 5 ? "polí" : "pole"} ${+m[2] < 0 ? "zpět" : "vpřed"}`;
    if ((m = c.match(/^událost(?:\s+z\s+(.+))?$/i))) return `otoč událost${m[1] ? " z balíčku " + m[1] : ""}`;
    if ((m = c.match(/^nastav\s+(.+?)\s+(-?\d+)$/i))) return `nastav ${m[1]} na ${m[2]}`;
    if ((m = c.match(/^odhodit\s+(\d+)$/i))) return `odhoď náhodně ${m[1]} ${plural(+m[1], "kartu", "karty", "karet")}`;
    if ((m = c.match(/^(?:zpráva|oznámení)\s+(.+)$/i))) return `„${m[1]}“`;
    if (/^(vítěz|vyhrává|konec hry)$/i.test(c)) return "vyhráváš";
    if (/^(první hráč|začínáš)$/i.test(c)) return "příští kolo začínáš";
    return c; };
  body.split(/[;\n]/).map(s => s.trim()).filter(Boolean).forEach(c => parts.push(one(c)));
  const s = (once ? parts.shift() + " " : "") + parts.join("; "); return s.charAt(0).toUpperCase() + s.slice(1) + ".";
}
function componentList(p) {
  const rows = [];
  p.decks.forEach(d => rows.push([`Karty – ${d.name}${d.starter ? " (startovní, pro každého hráče)" : ""}`, d.cards.reduce((a, c) => a + (+c.qty || 0), 0) * (d.starter ? Math.max(1, p.factions.length) : 1)]));
  if (p.units.length) p.factions.forEach(f => { const n = p.units.filter(u => u.factionId === f.id).reduce((a, u) => a + (+u.qty || 0), 0); if (n) rows.push([`Žetony jednotek – ${f.name}`, n]); });
  p.tokens.forEach(t => rows.push([`Žeton: ${t.name}`, "dle potřeby"]));
  if (p.tiles.length) rows.push(["Dílky", p.tiles.reduce((a, t) => a + (+t.qty || 0), 0)]);
  p.boards.forEach(b => rows.push([`Herní deska „${b.name}“ (${b.cols}×${b.rows} ${b.type === "hex" ? "hexů" : "polí"})`, 1]));
  p.bags.forEach(b => rows.push([`Sáček „${b.name}“ + žetony (${b.contents.map(c => `${c.count}× ${c.label}`).join(", ")})`, 1]));
  p.cdice.forEach(d => rows.push([`Kostka „${d.name}“ (${d.faces.map(f => f || "prázdná").join(", ")})`, 1]));
  if (p.resources.length) rows.push([`Žetony zdrojů: ${p.resources.map(r => r.name).join(", ")}`, "dle potřeby"]);
  if (p.actionMode !== "slots" || p.actions.length) if (p.actions.length) rows.push([`Figurky hráčů (${p.factions.length} barev)`, `${p.factions.length} × 3–5`]);
  if (+p.track.length) rows.push([`Závodní dráha (${p.track.length} polí) a figurky`, 1]);
  return rows;
}
function buildRulebook(p) {
  const sec = []; const H = (t, b) => b && sec.push({ t, b });
  H("O hře", `<p>${esc(p.summary || "")}</p><p><b>${esc(p.players)}</b> hráči · <b>${esc(p.time)}</b> · věk <b>${esc(p.age)}</b></p>`);
  H("Komponenty", `<ul>${componentList(p).map(([n, c]) => `<li>${esc(n)} – ${esc(String(c))}</li>`).join("")}</ul>`);
  const setup = [];
  if (p.resources.length) setup.push(`Každý hráč začíná se zdroji: ${p.resources.filter(r => !r.global).map(r => `${r.start} × ${r.name}`).join(", ")}.`);
  p.factions.filter(f => f.setup || f.ability).forEach(f => setup.push(`<b>${esc(f.name)}</b>: ${f.setup ? esc(describeEffect(f.setup)) + " " : ""}${f.ability ? "Schopnost: " + esc(f.ability) : ""}`));
  p.decks.filter(d => d.starter).forEach(d => setup.push(`Každý hráč dostane vlastní balíček ${esc(d.name)}.`));
  p.decks.filter(d => +d.market).forEach(d => setup.push(`Vyložte ${d.market} karet z balíčku ${esc(d.name)} jako trh.`));
  H("Příprava", setup.length ? `<ul>${setup.map(x => `<li>${x}</li>`).join("")}</ul>` : "");
  H("Průběh kola", p.phases.length ? `<ol>${p.phases.map(x => `<li>${esc(x)}</li>`).join("")}</ol>` : "");
  H("Akce", p.actions.length ? `<ul>${p.actions.map(a => `<li><b>${esc(a.name)}</b>${p.actionMode === "slots" ? ` (${a.slots} ${plural(+a.slots, "místo", "místa", "míst")})` : ""}: ${esc(a.text || "")}${a.effect ? " " + esc(describeEffect(a.effect)) : ""}</li>`).join("")}</ul>${p.actionMode === "rondel" ? `<p>Akce leží na kruhu. ${p.rondel.free} kroky jsou zdarma, každý další stojí 1.</p>` : p.actionMode === "roles" ? "<p>Každou roli si v kole vezme jen jeden hráč.</p>" : ""}` : "");
  const R = p.ruleset; const lim = [];
  if (+R.handLimit) lim.push(`Na konci tahu smíš mít v ruce nejvýš ${R.handLimit} karet.`); if (+R.drawUpTo) lim.push(`Na konci tahu si dober do ${R.drawUpTo} karet.`); if (+R.actionsPerTurn) lim.push(`V tahu smíš provést ${R.actionsPerTurn} akce.`);
  if (R.moveOnce) lim.push("Každá jednotka se smí v tahu pohnout jen jednou."); if (+R.stackLimit) lim.push(`Na jednom poli smí stát nejvýš ${R.stackLimit} jednotky.`);
  Object.entries(R.phaseOf || {}).forEach(([k, ph]) => { if (ph && ph.length) lim.push(`${CATS[k]} jen ve fázi ${ph.map(i => p.phases[i]).join(" / ")}.`); });
  R.triggers.forEach(t => lim.push(`${TRIGGERS[t.on]}${t.param ? ` (${esc(t.param)})` : ""}${t.cond ? `, pokud ${esc(t.cond)}` : ""}: ${esc(describeEffect(t.effect))}`));
  H("Důležitá pravidla", lim.length ? `<ul>${lim.map(x => `<li>${x}</li>`).join("")}</ul>` : "");
  H("Pravidla", p.rules ? `<div style="white-space:pre-wrap">${esc(p.rules)}</div>` : "");
  const sp = trackSpaces(p); H("Zvláštní pole dráhy", Object.keys(sp).length ? `<ul>${Object.entries(sp).map(([i, e]) => `<li>${i}: ${esc(describeEffect(e))}</li>`).join("")}</ul>` : "");
  const win = []; if (+R.win.vp) win.push(`Vyhrává, kdo první dosáhne ${R.win.vp} bodů.`); if (+R.win.turns) win.push(`Hra končí po ${R.win.turns}. kole, vyhrává nejvíc bodů.`); if (R.win.elimination) win.push("Vyhrává strana, které jako jediné zůstanou jednotky."); if (+p.track.length) win.push("Kdo první dojde do cíle dráhy, vyhrává.");
  p.scenarios.forEach(s => win.push(`Scénář „${esc(s.name)}“: ${esc(s.victory || "")}`));
  moreRulebook(p).forEach(([tt, bb]) => H(tt, bb));
  if (p.goals.length || p.techs.some(x => +x.vp)) win.push("K bodům se přičtou veřejné cíle a body z technologií.");
  H("Konec hry", win.length ? `<ul>${win.map(x => `<li>${x}</li>`).join("")}</ul>` : "");
  p.decks.forEach(d => H(`Přehled karet – ${d.name}`, `<table><tr><th>Karta</th><th>Počet</th><th>Cena</th><th>Text a efekt</th></tr>${d.cards.map(c => `<tr><td>${esc(c.title)}</td><td>${c.qty}</td><td>${esc(c.cost || "")}</td><td>${esc(c.text || "")}${c.effect ? `<br><i>${esc(describeEffect(c.effect))}</i>` : ""}</td></tr>`).join("")}</table>`));
  const body = sec.map(x => `<h2>${esc(x.t)}</h2>${x.b}`).join("\n");
  const html = `<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>${esc(p.name)} – pravidla</title><style>body{font-family:Georgia,serif;max-width:46rem;margin:2rem auto;padding:0 1rem;line-height:1.55;color:#1d1d1b}h1{font-size:2.2rem;margin-bottom:.2rem}h2{border-bottom:2px solid #ccc;padding-bottom:.2rem;margin-top:2rem}table{border-collapse:collapse;width:100%;font-size:.9rem}td,th{border:1px solid #ccc;padding:.3rem .5rem;vertical-align:top;text-align:left}</style></head><body><h1>${esc(p.name)}</h1><p>Verze ${esc(p.version)}</p>${body}</body></html>`;
  const md = `# ${p.name}\n\nVerze ${p.version}\n\n` + sec.map(x => `## ${x.t}\n\n${x.b.replace(/<\/p>/g, "\n\n").replace(/<li>/g, "- ").replace(/<\/li>/g, "\n").replace(/<tr><td>/g, "| ").replace(/<\/td><td>/g, " | ").replace(/<\/td><\/tr>/g, " |\n").replace(/<br>/g, " ").replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")}`).join("\n\n");
  return { html, md, body };
}
function bookPanelHTML(p) {
  return `<div class="panel"><h2>Příručka a výroba</h2><p class="hint">Z nastavení hry se sestaví čitelná pravidla: komponenty, příprava, průběh kola, akce, efekty karet slovy a konec hry. Seznam komponent se hodí pro výrobu prototypu.</p>
    <div class="row"><button class="btn small" id="bookShow">Zobrazit příručku</button><button class="btn small" id="bookHtml">Stáhnout (HTML)</button><button class="btn small" id="bookMd">Stáhnout (Markdown)</button><button class="btn small" id="compList">Seznam komponent</button></div></div>`;
}
function wireBookPanel(main, p) {
  if (!$("#bookShow")) return;
  $("#bookShow").onclick = () => openDialog(`<div class="book">${buildRulebook(p).body}</div><div class="row" style="justify-content:flex-end"><button class="btn primary" data-close>Zavřít</button></div>`, true);
  $("#bookHtml").onclick = () => offerFile(slug(p.name) + "-pravidla.html", buildRulebook(p).html, "Příručka uložena");
  $("#bookMd").onclick = () => offerFile(slug(p.name) + "-pravidla.md", buildRulebook(p).md, "Příručka uložena");
  $("#compList").onclick = () => { const rows = componentList(p); const txt = rows.map(([n, c]) => `${n}: ${c}`).join("\n");
    const d = openDialog(`<h2>Seznam komponent</h2><table class="crt-tab" style="font-family:var(--f-body)"><tbody>${rows.map(([n, c]) => `<tr><td style="text-align:left">${esc(n)}</td><td>${esc(String(c))}</td></tr>`).join("")}</tbody></table><div class="row" style="justify-content:flex-end"><button class="btn" id="clCopy">Kopírovat</button><button class="btn primary" data-close>Zavřít</button></div>`);
    $("#clCopy", d).onclick = () => copyText(txt); };
}
