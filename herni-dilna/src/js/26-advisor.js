// ---------- Rozbor návrhu (bez připojení) ----------
// Tři rozbory, které aplikace spočítá sama: vyváženost ze simulací a záznamů testů, nejasnosti v pravidlech a kartách,
// plán dalšího testování podle zapnutých mechanik. K tomu generátor variant karet ze stávajících karet.
const ADV_TASKS = { balance: "Vyváženost (simulace)", clarity: "Nejasnosti v pravidlech a kartách", playtest: "Plán testování" };
const li = s => `<li>${s}</li>`;
// Vyváženost: rychlé simulace (v dávkách, aby stránka nezamrzla) + záznamy testů.
async function advBalance(p, out) {
  const tips = [], facts = []; const n = p.factions.length;
  const coop = p.units.some(u => u.kind === "hero" || u.kind === "monster") || (p.crawl && p.crawl.rooms);
  if (n < 2) tips.push("Hra má méně než 2 strany – simulace pořadí hráčů nemá smysl. Přidej strany v záložce Mechaniky.");
  if (coop) tips.push("Výprava / kooperace: pořadí hráčů se nesimuluje. Sleduj v testech, v kolikátém kole hrdinové vyhrávají nebo prohrávají a kolik jich přežije.");
  let games = [];
  if (n >= 2 && !coop) {
    const N = 40; for (let i = 0; i < N; i++) { try { games.push(simGame(p, { rounds: 15, policy: "greedy", actions: 2 })); } catch { break; } if (i % 5 === 4) { out.innerHTML = `<p class="hint">Simuluji… ${i + 1}/${N}</p>`; await new Promise(r => setTimeout(r, 0)); } }
  }
  if (games.length) {
    const share = Array(n).fill(0), score = Array(n).fill(0), plays = {}; let rounds = 0;
    games.forEach(g => { (g.share || []).forEach((s, i) => { share[i] += s; }); g.seats.forEach((s, i) => { score[i] += s.score || 0; (s.played || []).forEach(c => { plays[c] = (plays[c] || 0) + 1; }); }); rounds += g.rounds || 0; });
    const pct = share.map(s => Math.round(s / games.length * 100)); const fair = Math.round(100 / n);
    facts.push(`Simulace ${games.length} her (chamtivá strategie, 2 akce na tah): výhry podle pořadí ${pct.map((x, i) => `${i + 1}. ${x} %`).join(", ")}, průměrně ${Math.round(rounds / games.length * 10) / 10} kol.`);
    const hi = pct.indexOf(Math.max(...pct)), lo = pct.indexOf(Math.min(...pct)); const avgR = rounds / games.length;
    if (avgR < 2) tips.push("Simulované hry končí hned v 1.–2. kole – nejspíš se splní podmínka vítězství příliš brzy, nebo simulace hru neumí hrát. Závěry o pořadí ber s rezervou.");
    if (pct[hi] > fair * 1.3) tips.push(`Hráč na ${hi + 1}. místě vyhrává ${pct[hi]} % her (férově ${fair} %). Zvaž kompenzaci – víc zdrojů na začátku pro pozdější hráče, nebo střídání prvního hráče.`);
    if (pct[lo] < fair * .7) tips.push(`Hráč na ${lo + 1}. místě vyhrává jen ${pct[lo]} % her. Pomoz mu startovním bonusem.`);
    const avgScore = score.reduce((a, b) => a + b, 0) / n / games.length; if (avgScore < 1) tips.push("Simulovaní hráči skoro nezískávají body – hra je možná moc tvrdá, nebo se body získávají způsobem, který simulace nezná (zkontroluj efekty karet).");
    const buyable = p.decks.filter(d => +d.market > 0).flatMap(d => d.cards.filter(c => +c.qty > 0)); const avgPlay = Object.values(plays).reduce((a, b) => a + b, 0) / Math.max(1, Object.keys(plays).length);
    const unused = buyable.filter(c => !plays[c.title]); if (unused.length) tips.push(`Tyto karty z trhu simulace nikdy nevzala: ${unused.slice(0, 8).map(c => `<b>${esc(c.title)}</b>`).join(", ")}. Možná jsou drahé nebo slabé – zlevni je nebo posil efekt.`);
    const top = Object.entries(plays).filter(([, v]) => v > avgPlay * 2.5).sort((a, b) => b[1] - a[1]).slice(0, 5); if (top.length) tips.push(`Nejčastěji použité: ${top.map(([k, v]) => `<b>${esc(k)}</b> (${v}×)`).join(", ")}. Pokud nejde o základní kartu nebo akci, může být přesílená.`);
  }
  const ss = p.sessions || []; if (ss.length) {
    const mins = ss.map(s => +s.minutes).filter(Boolean); const target = parseInt(String(p.time), 10);
    if (mins.length) { const avg = Math.round(mins.reduce((a, b) => a + b, 0) / mins.length); facts.push(`Záznamy testů: ${ss.length} ${plural(ss.length, "hra", "hry", "her")}, průměrně ${avg} min.`); if (target && avg > target * 1.3) tips.push(`Testovací hry trvají průměrně ${avg} min, ale hra slibuje ${p.time}. Zkrať hru (méně kol, vyšší cíl bodů dřív) nebo uprav údaj na krabici.`); }
    const wins = {}; ss.forEach(s => (s.players || []).forEach(x => { if (x.win) wins[x.name] = (wins[x.name] || 0) + 1; })); const wt = Object.entries(wins).sort((a, b) => b[1] - a[1]);
    if (wt.length > 1 && wt[0][1] >= ss.length * .6 && ss.length >= 4) tips.push(`V testech vyhrává nejčastěji ${esc(wt[0][0])} (${wt[0][1]} z ${ss.length}). Je to hráčem, nebo stranou? Zkus prohodit strany.`);
  } else tips.push("Zatím nejsou záznamy testů. Zapiš pár odehraných her v záložce Testování – rozbor pak porovná i skutečné hry.");
  lintProject(p).filter(x => x.lv === "err").slice(0, 5).forEach(x => tips.push("Chyba návrhu: " + esc(x.t)));
  out.innerHTML = `${facts.length ? `<p>${facts.join("<br>")}</p>` : ""}<ul>${(tips.length ? tips : ["Nic nápadného – simulace i záznamy vypadají vyváženě. Hlubší rozbor najdeš v záložce Analýza."]).map(li).join("")}</ul>`;
}
// Nejasnosti: chybějící části pravidel, vágní slova, nesoulad textu karty a efektu, pojmy bez vysvětlení.
function advClarity(p) {
  const tips = []; const R = String(p.rules || ""); const low = R.toLowerCase();
  if (R.trim().length < 300) tips.push("Pravidla jsou velmi krátká. Popiš přípravu hry, průběh tahu a konec hry vlastními slovy (záložka Přehled).");
  [["příprav", "příprava hry (co kde leží na začátku)"], ["tah|kol", "průběh tahu nebo kola"], ["konec|vítěz|vyhráv", "konec hry a určení vítěze"]].forEach(([re, what]) => { if (R.trim() && !new RegExp(re).test(low)) tips.push(`V pravidlech chybí ${what}.`); });
  const vague = ["atd", "apod", "možná", "nějak", "zhruba", "většinou", "obvykle", "případně", "podle uvážení", "dle potřeby"];
  R.split(/(?<=[.!?\n])\s*/).forEach(s => { const v = vague.find(w => new RegExp(`(^|[^\\p{L}])${w}([^\\p{L}]|$)`, "iu").test(s)); if (v) tips.push(`Vágní „${v}“: „${esc(s.trim().slice(0, 140))}“ – napiš přesně, co platí.`); if (s.split(/\s+/).length > 40) tips.push(`Dlouhá věta (${s.split(/\s+/).length} slov): „${esc(s.trim().slice(0, 100))}…“ – rozděl ji.`); });
  p.decks.forEach(d => d.cards.forEach(c => {
    const t = String(c.text || "").trim(), e = String(c.effect || "").trim();
    if (e && !t) tips.push(`Karta <b>${esc(c.title)}</b> má efekt „${esc(e)}“, ale žádný text – hráči u stolu nebudou vědět, co dělá.`);
    if (t && e) { const fromText = textToEffect(p, t); if (fromText && fromText !== e && !e.includes(fromText) && !fromText.split("; ").every(x => e.includes(x))) tips.push(`Karta <b>${esc(c.title)}</b>: text říká „${esc(fromText)}“, efekt dělá „${esc(e)}“ – sjednoť je.`); }
  }));
  const kw = [["spojen", "spojenecké schopnosti"], ["reakc", "reakce"], ["vyhost", "vyhoštění"], ["vyčerp", "vyčerpání karty"], ["přetaž", "přetažení"]];
  const cardText = p.decks.flatMap(d => d.cards.map(c => String(c.text || "").toLowerCase())).join(" "); kw.forEach(([k, n]) => { if (cardText.includes(k) && !low.includes(k)) tips.push(`Karty zmiňují ${n}, ale pravidla to nevysvětlují (vygenerovaná pravidla k tisku to doplní – zkontroluj záložku Pravidla).`); });
  lintProject(p).filter(x => x.lv === "warn").slice(0, 6).forEach(x => tips.push("Upozornění: " + esc(x.t)));
  return `<ul>${(tips.length ? tips.slice(0, 30) : ["Nenašla jsem nic nejasného. Nech pravidla přečíst někomu, kdo hru nezná – to žádná kontrola nenahradí."]).map(li).join("")}</ul>`;
}
// Plán testování podle toho, co hra používá.
function advPlaytest(p) {
  const q = ["Pochopili všichni pravidla do 10 minut? Kde se zasekli?", "Byl některý tah zbytečně dlouhý (čekání na ostatní)?", "Měl hráč pocit, že jeho rozhodnutí něco znamenají?"];
  const goals = [];
  if (p.factions.length > 1) goals.push("Střídej pořadí hráčů a zapisuj, kdo začínal – ověříš výhodu prvního hráče.");
  if (p.decks.some(d => +d.market > 0)) goals.push("Sleduj, které karty z trhu nikdo nekupuje a které se kupují vždy.");
  if (p.units.length) goals.push("Zapisuj, kolik jednotek každá strana ztratila a ve kterém kole – ukáže to tempo boje.");
  if (p.factions.some(f => f.ability)) goals.push("Otestuj každou schopnost strany aspoň dvakrát – je některá výrazně silnější?");
  if (envOn(p)) goals.push("Zahraj jednu hru s počasím a jednu bez – zlepšuje počasí zážitek, nebo jen zdržuje?");
  if (p.morale && p.morale.on) goals.push("Počítej testy morálky za hru – víc než ~10 zdržuje, méně než 2 nemá smysl.");
  if (p.rondel && p.rondel.on) goals.push("Sleduj, která pole rondelu se nikdy nevolí – posil je, nebo je nahraď.");
  if (p.upkeep && p.upkeep.on) goals.push("Zapisuj, kolikrát hráči nezaplatili údržbu – když často, je hra moc tvrdá.");
  if (p.crawl && (p.crawl.doom || p.crawl.rooms)) goals.push("Zapisuj, v kolikátém kole hrozba dosáhla maxima a kolik hrdinů přežilo.");
  const ss = p.sessions || []; const next = ss.length < 5 ? `Odehraj ještě ${5 - ss.length} ${plural(5 - ss.length, "hru", "hry", "her")} se stejnou verzí, než začneš měnit čísla.` : "Máš dost her na jednu verzi – změň jednu věc a porovnej výsledky s předchozí verzí (záložka Testování → podle verze).";
  return `<h3>Co sledovat</h3><ul>${(goals.length ? goals : ["Zapisuj délku hry, skóre a vítěze."]).map(li).join("")}</ul><h3>Otázky pro testery</h3><ul>${q.map(li).join("")}<li>Dotazník po hře najdeš u záznamu testu.</li></ul><h3>Další krok</h3><p>${next} Do záznamu vždy zapiš verzi hry.</p>`;
}
// Varianty karet: silnější / levnější verze stávajících karet (čísla v ceně a efektu se posunou).
function cardVariants(p, deck, n) {
  const src = deck.cards.filter(c => String(c.effect || "").match(/\d/) || +c.cost); if (!src.length) return [];
  const shift = (s, d) => String(s || "").replace(/([+-]?)(\d+)/g, (m, sg, x) => sg + Math.max(1, +x + d));
  return Array.from({ length: n }, (_, i) => { const c = src[i % src.length]; const up = i % 2 === 0;
    const v = { ...clone(c), id: uid(), qty: 1, title: c.title + (up ? " II" : " (levná)") };
    if (up) { v.effect = shift(c.effect, 1); if (+c.cost) v.cost = String(+c.cost + 1); if (+c.vp) v.vp = String(+c.vp + 1); v.text = shift(c.text, 1); }
    else { v.effect = shift(c.effect, -1); if (+c.cost > 1) v.cost = String(+c.cost - 1); v.text = shift(c.text, -1); }
    if (checkEffect(p, v.effect).length) v.effect = c.effect; return v; });
}
function overviewExtras(p) {
  const lint = lintProject(p); const errs = lint.filter(x => x.lv === "err"), warns = lint.filter(x => x.lv === "warn");
  const size = JSON.stringify(p).length;
  return `${versionsHTML(p)}${bookPanelHTML(p)}<div class="panel"><div class="row spread"><h2>Kontrola návrhu</h2><span class="count">${Math.round(size / 1024)} kB</span></div>
      ${lint.length ? `<div class="list">${[...errs, ...warns].map(x => `<div class="lint ${x.lv}"><b>${x.lv === "err" ? "Chyba" : "Upozornění"}</b><span>${esc(x.t)}</span></div>`).join("")}</div>`
        : `<div class="lint ok"><b>V pořádku</b><span>Efekty, odkazy na zdroje, balíčky, mapy i scénáře dávají smysl.</span></div>`}
      <p class="hint">Kontroluje zápis efektů, odkazy na smazané zdroje a mapy, trh větší než balíček, dílky, bojovou tabulku a nastavení mechanik.</p></div>
    <div class="panel"><h2>Rozbor návrhu</h2>
      <p class="hint">Aplikace si sama zahraje desítky her, projde pravidla a karty a navrhne, na co se při ladění zaměřit. Běží přímo v prohlížeči, bez internetu.</p>
      <div class="row">${Object.entries(ADV_TASKS).map(([k, v]) => `<button class="btn small" data-adv="${k}">${v}</button>`).join("")}</div>
      <div id="advOut" class="ai-out">${S.advHTML || ""}</div>
      ${p.decks.some(d => d.cards.length) ? `<hr class="sep"><h3>Varianty karet</h3><p class="hint">Vytvoří silnější a levnější verze stávajících karet – vhodné pro ladění čísel. Vybrané přidáš do balíčku.</p>
      <div class="grid" style="grid-template-columns:1fr 80px"><label class="f">Z balíčku<select id="advDeck">${p.decks.filter(d => d.cards.length).map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join("")}</select></label><label class="f">Kolik<input type="number" id="advN" min="1" max="12" value="4"></label></div>
      <button class="btn primary" id="advVar">Vytvořit varianty</button><div id="advVarBox"></div>` : ""}</div>`;
}
function wireOverviewExtras(main, p) {
  wireVersions(main, p); wireBookPanel(main, p);
  $$("[data-adv]", main).forEach(b => b.onclick = async () => { const out = $("#advOut"); $$("[data-adv]", main).forEach(x => x.disabled = true);
    try { if (b.dataset.adv === "balance") await advBalance(p, out); else out.innerHTML = b.dataset.adv === "clarity" ? advClarity(p) : advPlaytest(p); } catch (e) { out.innerHTML = `<p class="hint">Rozbor se nepodařil: ${esc(e && e.message || "")}</p>`; }
    S.advHTML = out.innerHTML; $$("[data-adv]", main).forEach(x => x.disabled = false); });
  if ($("#advVar")) $("#advVar").onclick = () => { const deck = p.decks.find(d => d.id === $("#advDeck").value); const box = $("#advVarBox"); const cards = cardVariants(p, deck, Math.max(1, Math.min(12, +$("#advN").value || 4)));
    if (!cards.length) { box.innerHTML = `<p class="hint">Balíček nemá karty s čísly v ceně nebo efektu.</p>`; return; } S.varCards = cards;
    box.innerHTML = `<div class="card-grid">${cards.map((c, i) => `<label class="card-cell" style="cursor:pointer">${cardHTML(c, deck)}<span class="qty"><input type="checkbox" data-varc="${i}" checked> přidat</span></label>`).join("")}</div><button class="btn primary" id="advVarAdd">Přidat vybrané do „${esc(deck.name)}“</button>`;
    $("#advVarAdd").onclick = () => { const sel = $$("[data-varc]", box).filter(x => x.checked).map(x => S.varCards[+x.dataset.varc]); deck.cards.push(...sel); touch(p); toast(`Přidáno ${sel.length} ${plural(sel.length, "karta", "karty", "karet")}`); box.innerHTML = `<p class="hint">Karty jsou v balíčku „${esc(deck.name)}“.</p>`; }; };
}
