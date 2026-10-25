// ---------- Předměty: žetony i karty, které mění hodnoty jednotky ----------
// Předmět je malý žeton (připnutý k jednotce) nebo karta označená „předmět pro jednotku“ (z ruky se vybaví nebo použije).
// Trvalý předmět upravuje hodnoty, dokud ho jednotka nese. Jednorázový se použije: vyléčí, zažene stavy, doplní munici
// a jeho úpravy platí zadaný počet kol (lektvar, svitek). Předmět s výdrží se dá poškodit a zničit; brnění pohlcuje zásahy,
// zbraň se opotřebí útokem.
const isOnce = d => d && (d.use === "once" || d.fx === "jidlo");
function cardItem(p, g) { const d = p.decks.find(x => x.id === g.deckId); return d && d.cards.find(x => x.id === g.cardId); }
// Vše, co jednotka nese: { src: žeton na stole nebo záznam karty, def: definice, kind }.
function carried(p, t, it) {
  const out = attachedTo(p, t, it).map(o => ({ kind: "tok", src: o, def: tokDef(p, o) }));
  (it.gear || []).forEach(g => { const c = cardItem(p, g); if (c) out.push({ kind: "card", src: g, def: c }); });
  return out;
}
function itemName(e) { return e.def.name || e.def.title || "předmět"; }
// Úpravy hodnot z nesených trvalých předmětů a z dočasných účinků.
function itemMods(p, t, it, m) {
  const fromItems = carried(p, t, it).filter(e => !isOnce(e.def) && !e.def.target).reduce((a, e) => a + (+e.def[m] || 0), 0);
  const fromBuffs = (it.buffs || []).filter(b => b.until >= (t.turn || 1)).reduce((a, b) => a + (+b.m[m] || 0), 0);
  return fromItems + fromBuffs;
}
function itemLeft(e) { return +e.def.dur ? Math.max(0, +e.def.dur - (e.src.dmg || 0)) : null; }
function destroyItem(p, t, it, e) {
  if (e.kind === "tok") t.items = t.items.filter(o => o !== e.src);
  else { it.gear = (it.gear || []).filter(g => g !== e.src); (t.discard[e.src.deckId] = t.discard[e.src.deckId] || []).push(e.src.cardId); }
}
function damageItem(p, t, it, e, n = 1) {
  if (!+e.def.dur) return ""; e.src.dmg = Math.max(0, (e.src.dmg || 0) + n);
  if (e.src.dmg >= +e.def.dur) { destroyItem(p, t, it, e); return `${itemName(e)} je zničen`; }
  return n > 0 ? `${itemName(e)} poškozen (${itemLeft(e)}/${e.def.dur})` : `${itemName(e)} opraven (${itemLeft(e)}/${e.def.dur})`;
}
// Brnění pohltí zásahy do své výdrže; vrátí zbylé zásahy a zprávy.
function absorbHits(p, t, it, n) {
  const msgs = []; for (const e of carried(p, t, it)) { if (n <= 0) break; if (!e.def.absorb || isOnce(e.def)) continue; const left = itemLeft(e); if (!left) continue;
    const take = Math.min(n, left); n -= take; msgs.push(`${itemName(e)} pohltí ${take} ${plural(take, "zásah", "zásahy", "zásahů")}` + (left - take ? "" : ` a je zničen`)); damageItem(p, t, it, e, take); }
  return { n, msg: msgs.join(", ") };
}
function wearItems(p, t, it) { return carried(p, t, it).filter(e => e.def.wear && +e.def.dur && !isOnce(e.def)).map(e => damageItem(p, t, it, e, 1)).filter(Boolean); }
// Použití jednorázového předmětu.
// Účinek předmětu na jednu jednotku (léčení, stavy, munice, dočasné úpravy, zásah kostkami). Vrací popis.
function itemEffectOn(p, t, x, d, name, by) {
  const parts = []; const heal = +(d.heal || (d.fx === "jidlo" ? d.fxN : 0)) || 0;
  if (+d.hits) { const roll = rollN(+d.hits, +p.dice.sides || 6); const h = roll.filter(v => v >= +p.dice.aHit).length; parts.push(`${roll.join(",")} → ${h ? harm(p, t, x, h, by) : "bez zásahu"}`); if (!t.items.includes(x)) return parts; }
  if (heal) { if (unitHp(p, x) != null) { x.dmg = Math.max(0, (x.dmg || 0) - heal); parts.push(`+${heal} ${plural(heal, "život", "životy", "životů")}`); } else if (x.reduced) { x.reduced = false; parts.push("obnoven krok"); } }
  if ((d.cure || d.fx === "jidlo") && x.st) { const had = ["tired", "tiredC", "poison", "dis", "stun", "sup"].filter(k => x.st[k]); had.forEach(k => { x.st[k] = false; }); if (had.length) parts.push("zažene " + had.map(k => UNIT_ST[k][0].toLowerCase()).join(", ")); }
  if (d.ammo && x.ammoUsed) { x.ammoUsed = 0; parts.push("doplní munici"); }
  const m = {}; MODS.forEach(([k]) => { if (+d[k]) m[k] = +d[k]; });
  if (Object.keys(m).length) { const n = Math.max(1, +d.turns || 1); (x.buffs = x.buffs || []).push({ name, m, until: (t.turn || 1) + n - 1 }); parts.push(`${modText(d)} na ${n} ${plural(n, "kolo", "kola", "kol")}`); }
  return parts;
}
// Koho předmět zasáhne: nositele, cílovou jednotku, nebo všechny v okruhu kolem cíle (podle „na koho“).
function itemAffected(p, t, it, d, target) {
  if (!d.target) return [it]; const tg = target || it; const u = unitOf(p, it);
  const ok = o => { const f = (unitOf(p, o) || {}).factionId; return d.foes === "all" || (d.foes === "ally" ? f === u.factionId : f !== u.factionId); };
  if (d.target === "unit") return [tg];
  return t.items.filter(o => o.kind === "unit" && !o.inside && unitDist(p, t, tg, o) <= (+d.radius || 0) && ok(o));
}
// Možné cíle: jednotky v dosahu a výhledu (u plošného účinku i vlastní pole).
function itemTargets(p, t, it, d) {
  const reach = +d.reach || 0; const b = tableBoard(p); const k0 = b && cellUnder(p, it); const u = unitOf(p, it);
  const ok = o => d.target === "area" || d.foes === "all" || (d.foes === "ally" ? (unitOf(p, o) || {}).factionId === u.factionId : (unitOf(p, o) || {}).factionId !== u.factionId);
  return t.items.filter(o => o.kind === "unit" && !o.inside && (o !== it || d.target === "area" || d.foes === "ally" || d.foes === "all") && unitDist(p, t, it, o) <= reach && ok(o)
    && (!k0 || o === it || hasLOS(p, b, k0, cellUnder(p, o)) && unitDist(p, t, it, o) <= Math.max(1, sightOf(p, t, it))));
}
function useItem(p, t, it, e, target) {
  const d = e.def; const u = unitOf(p, it); const name = itemName(e);
  if (+d.hits && !isOnce(d) && !useAmmo(p, t, it)) return `${u.name}: došla munice`;
  const aff = itemAffected(p, t, it, d, target); const parts = aff.map(x => { const r = itemEffectOn(p, t, x, d, name, it); return d.target ? (r.length ? `${unitOf(p, x).name}: ${r.join(", ")}` : "") : r.join(", "); }).filter(Boolean);
  const b = tableBoard(p); const kc = b && cellUnder(p, target || it);
  if (d.spawn && kc) { let n = 0; for (let c = 0; c < b.cols; c++) for (let r = 0; r < b.rows; r++) { const k = c + "," + r; if (hexDist(b, kc, k) <= (d.target === "area" ? +d.radius || 0 : 0) && placeFx(p, t, d.spawn, k)) n++; } if (n) parts.push(`${d.spawn === "kour" ? "kouř" : "oheň"} na ${n} ${plural(n, "poli", "polích", "polích")}`); }
  if (e.kind === "hand") { const h = e.src; const fid = u.factionId; t.hands[fid] = (t.hands[fid] || []).filter(x => x !== h); discardCard(t, h, fid); }
  else if (isOnce(d)) destroyItem(p, t, it, e);
  else if (+d.dur && !d.wear) parts.push(damageItem(p, t, it, e, 1)); // náboj / opotřebení při použití
  checkWin(p, t);
  const where = d.target === "area" ? ` (okruh ${+d.radius || 0}${target && target !== it ? " kolem " + unitOf(p, target).name : ""})` : d.target === "unit" && target ? ` na ${unitOf(p, target).name}` : "";
  const msg = `${u.name} použije ${name}${where}${parts.length ? ": " + parts.join("; ") : aff.length || d.spawn ? "" : ": nikoho nezasáhl"}`; logEv(t, msg); return msg;
}
function equipCard(p, t, it, h) {
  const u = unitOf(p, it); t.hands[u.factionId] = (t.hands[u.factionId] || []).filter(x => x !== h); (it.gear = it.gear || []).push({ deckId: h.deckId, cardId: h.cardId, dmg: 0 });
  const c = cardItem(p, h); const msg = `${u.name} si bere ${c.title}${modText(c) ? " (" + modText(c) + ")" : ""}`; logEv(t, msg); return msg;
}
function unequipCard(p, t, it, g) { const u = unitOf(p, it); it.gear = (it.gear || []).filter(x => x !== g); (t.hands[u.factionId] = t.hands[u.factionId] || []).push({ deckId: g.deckId, cardId: g.cardId }); logEv(t, `${u.name} odkládá ${(cardItem(p, g) || {}).title} do ruky`); }
function itemsRound(p, t) { t.items.forEach(i => { if (i.buffs) { i.buffs = i.buffs.filter(b => b.until >= t.turn); if (!i.buffs.length) delete i.buffs; } }); }
// Popis vlastností předmětu (editor, pravidla, nápověda).
function itemText(d) {
  const a = []; const mt = modText(d); if (mt) a.push(mt + (isOnce(d) && d.fx !== "jidlo" ? ` na ${Math.max(1, +d.turns || 1)} ${plural(Math.max(1, +d.turns || 1), "kolo", "kola", "kol")}` : ""));
  if (isOnce(d)) a.unshift("jednorázový"); const heal = +(d.heal || (d.fx === "jidlo" ? d.fxN : 0)) || 0; if (heal) a.push(`+${heal} ${plural(heal, "život", "životy", "životů")}`);
  if (d.cure || d.fx === "jidlo") a.push("zažene únavu, otravu, rozvrácení"); if (d.ammo) a.push("doplní munici");
  if (d.target) a.push(`${d.target === "area" ? `plošně (okruh ${+d.radius || 0})` : "cíleně"} na ${d.foes === "ally" ? "spojence" : d.foes === "all" ? "všechny" : "nepřátele"}, dosah ${+d.reach || 0}`); if (+d.hits) a.push(`zásah ${d.hits} ${plural(+d.hits, "kostkou", "kostkami", "kostkami")}`); if (d.spawn) a.push(d.spawn === "kour" ? "vytvoří kouř" : "založí oheň");
  if (+d.light) a.push(`světlo ${d.light}`);
  if (+d.dur) a.push(`výdrž ${d.dur}`); if (d.absorb) a.push("pohlcuje zásahy"); if (d.wear) a.push("opotřebí se útokem");
  return a.join(" · ");
}
function handItems(p, t, it) { const u = unitOf(p, it); return u ? (t.hands[u.factionId] || []).filter(h => (cardOf(p, h).c || {}).unitItem) : []; }
function itemsSelHTML(p, t, i) {
  const out = []; const list = carried(p, t, i);
  if (list.length) out.push(`<div class="row items"><span class="hint">Nese:</span>${list.map((e, n) => { const l = itemLeft(e); return `<span class="pl-chip" title="${esc(itemText(e.def))}">${esc(itemName(e))}${l != null ? ` <span class="hint">${l}/${e.def.dur}</span>` : ""}${isOnce(e.def) || e.def.target ? ` <button class="btn small primary ${S.itemPick && S.itemPick.uid === i.uid && S.itemPick.n === n ? "on" : ""}" data-iuse="${n}">Použít</button>` : ""}${l != null ? `<button class="btn small" data-idmg="${n}|1" aria-label="Poškodit">−</button><button class="btn small" data-idmg="${n}|-1" aria-label="Opravit">+</button>` : ""}<button class="btn small" data-idrop="${n}" aria-label="Sundat ${esc(itemName(e))}">✕</button></span>`; }).join("")}</div>`);
  const bf = (i.buffs || []).filter(b => b.until >= (t.turn || 1)); if (bf.length) out.push(`<span class="hint">Účinky: ${bf.map(b => `${esc(b.name)} (${esc(modText(b.m))}, ${b.until - (t.turn || 1) + 1} ${plural(b.until - (t.turn || 1) + 1, "kolo", "kola", "kol")})`).join(", ")}</span>`);
  const hand = handItems(p, t, i); if (hand.length) out.push(`<div class="row"><span class="hint">Z ruky:</span>${hand.map((h, n) => { const c = cardOf(p, h).c; return `<button class="btn small" data-ihand="${n}" title="${esc(itemText(c))}">${isOnce(c) ? "Použít" : "Vybavit"} ${esc(c.title)}</button>`; }).join("")}</div>`);
  const pk = S.itemPick && S.itemPick.uid === i.uid ? S.itemPick : null; const pe = pk && (pk.hand != null ? (() => { const h = hand[pk.hand]; return h && { kind: "hand", src: h, def: cardOf(p, h).c }; })() : list[pk.n]);
  if (pe) { const tg = itemTargets(p, t, i, pe.def); out.push(`<div class="row pick"><span class="hint">${esc(itemName(pe))} – ${pe.def.target === "area" ? `střed okruhu ${+pe.def.radius || 0}` : "cíl"}:</span>${tg.length ? tg.map(o => `<button class="btn small" data-itgt="${o.uid}">${o === i ? "sem (vlastní pole)" : esc(unitOf(p, o).name)}</button>`).join("") : `<span class="hint">nic v dosahu ${+pe.def.reach || 0}</span>`}<button class="btn small" data-itgt="">Zrušit</button></div>`); }
  return out.join("");
}
function wireItems(main, p, t, save) {
  const sel = t.items.find(i => i.uid === S.sel); if (!sel || sel.kind !== "unit") return; const on = (s, fn) => $$(s, main).forEach(el => el.addEventListener("click", () => fn(el)));
  const list = carried(p, t, sel); const done = msg => { save(); render(); if (msg) toast(msg); };
  const pick = (e, key) => { if (!e) return; if (e.def.target) { S.itemPick = S.itemPick && S.itemPick.uid === sel.uid && S.itemPick[key[0]] === key[1] ? null : { uid: sel.uid, [key[0]]: key[1] }; render(); return; } done(e.kind === "hand" ? useItem(p, t, sel, e) : useItem(p, t, sel, e)); };
  on("[data-iuse]", el => pick(list[+el.dataset.iuse], ["n", +el.dataset.iuse]));
  on("[data-itgt]", el => { const pk = S.itemPick; S.itemPick = null; if (!el.dataset.itgt || !pk) { render(); return; } const tg = t.items.find(o => o.uid === el.dataset.itgt);
    const e = pk.hand != null ? (() => { const h = handItems(p, t, sel)[pk.hand]; return h && { kind: "hand", src: h, def: cardOf(p, h).c }; })() : list[pk.n]; if (e && tg) done(useItem(p, t, sel, e, tg)); });
  on("[data-idmg]", el => { const [n, d] = el.dataset.idmg.split("|"); const e = list[+n]; if (e) done(damageItem(p, t, sel, e, +d)); });
  on("[data-idrop]", el => { const e = list[+el.dataset.idrop]; if (!e) return; if (e.kind === "tok") detachToken(p, t, e.src.uid); else unequipCard(p, t, sel, e.src); done(); });
  on("[data-ihand]", el => { const n = +el.dataset.ihand; const h = handItems(p, t, sel)[n]; if (!h) return; const c = cardOf(p, h).c; if (isOnce(c) && c.target) { pick({ kind: "hand", src: h, def: c }, ["hand", n]); return; } done(isOnce(c) ? useItem(p, t, sel, { kind: "hand", src: h, def: c }) : equipCard(p, t, sel, h)); });
}
// Společný editor vlastností předmětu (žeton i karta). attr: data atribut pro vstupy, withMods: ukázat i úpravy hodnot.
function itemFxHTML(o, attr, withMods) {
  const v = k => esc(o[k] ?? ""); const ck = (k, l, t2) => `<label class="chk" ${t2 ? `title="${t2}"` : ""}><input type="checkbox" ${attr}="${k}" ${o[k] ? "checked" : ""}> ${l}</label>`;
  return `<div class="row ifx" style="width:100%">
    ${withMods ? MODS.map(([m, , l]) => `<label class="f" style="width:84px">${l}<input type="number" ${attr}="${m}" value="${v(m)}" placeholder="±0"></label>`).join("") : ""}
    <label class="f" style="width:200px" title="Na koho předmět působí při použití">Působení<select ${attr}="target"><option value="">na nositele</option><option value="unit" ${o.target === "unit" ? "selected" : ""}>cíleně – jedna jednotka</option><option value="area" ${o.target === "area" ? "selected" : ""}>plošně – všichni v okruhu</option></select></label>
    ${o.target ? `<label class="f" style="width:84px" title="Jak daleko lze cíl nebo střed okruhu zvolit (polí)">Dosah<input type="number" min="0" max="30" ${attr}="reach" value="${v("reach")}" placeholder="0"></label>
      ${o.target === "area" ? `<label class="f" style="width:84px" title="0 = jen cílové pole">Poloměr<input type="number" min="0" max="10" ${attr}="radius" value="${v("radius")}" placeholder="0"></label>` : ""}
      <label class="f" style="width:130px">Na koho<select ${attr}="foes"><option value="">nepřátele</option><option value="ally" ${o.foes === "ally" ? "selected" : ""}>spojence</option><option value="all" ${o.foes === "all" ? "selected" : ""}>všechny</option></select></label>
      <label class="f" style="width:110px" title="Kolik kostek zásahu hodí na každou zasaženou jednotku (zásah na hodnotu z Mechanik)">Zásah kostek<input type="number" min="0" max="20" ${attr}="hits" value="${v("hits")}" placeholder="0"></label>
      <label class="f" style="width:120px" title="Na cílovém poli (u plošného v celém okruhu) vznikne kouř nebo oheň">Vytvoří<select ${attr}="spawn"><option value="">nic</option><option value="kour" ${o.spawn === "kour" ? "selected" : ""}>kouř</option><option value="ohen" ${o.spawn === "ohen" ? "selected" : ""}>oheň</option></select></label>` : ""}
    <label class="f" style="width:190px">Použití<select ${attr}="use"><option value="">trvalý – platí, dokud ho nese</option><option value="once" ${o.use === "once" ? "selected" : ""}>jednorázový – použije se a zmizí</option></select></label>
    ${o.use === "once" ? `<label class="f" style="width:96px" title="Kolik kol platí úpravy hodnot po použití">Platí kol<input type="number" min="1" max="20" ${attr}="turns" value="${v("turns")}" placeholder="1"></label>
      <label class="f" style="width:96px" title="Okamžitě vyléčí (jednotka bez životů obnoví krok)">Vyléčí životy<input type="number" min="0" max="20" ${attr}="heal" value="${v("heal")}" placeholder="0"></label>
      ${ck("cure", "zažene únavu, otravu, rozvrácení")}${ck("ammo", "doplní munici")}` : `<label class="f" style="width:96px" title="Kolik poškození vydrží (prázdné = nezničitelný)">Výdrž<input type="number" min="0" max="50" ${attr}="dur" value="${v("dur")}" placeholder="–"></label>
      ${ck("absorb", "pohlcuje zásahy (brnění)", "Zásahy jednotky jdou nejdřív do výdrže předmětu")}${ck("wear", "opotřebí se útokem (zbraň)", "Každý útok ubere 1 výdrž")}
      <label class="f" style="width:96px" title="Nositel vidí a osvětluje do této vzdálenosti i v noci, mlze nebo tmě">Světlo<input type="number" min="0" max="10" ${attr}="light" value="${v("light")}" placeholder="–"></label>`}</div>`;
}
function readItemFx(o, el, attr) {
  const k = el.getAttribute(attr); if (el.type === "checkbox") o[k] = el.checked; else if (["use", "target", "foes", "spawn"].includes(k)) o[k] = el.value; else o[k] = el.value === "" ? "" : +el.value;
}
function itemsRulebook(p) {
  const toks = p.tokens.filter(x => x.small && itemText(x)), cards = p.decks.flatMap(d => d.cards.filter(c => c.unitItem));
  if (!toks.length && !cards.length) return [];
  return [["Předměty", `<p>Trvalé předměty upravují hodnoty, dokud je jednotka nese. Jednorázové se použijí a odloží; jejich úpravy platí uvedený počet kol. Předmět s výdrží se poškozuje; při nulové výdrži je zničen. Brnění pohlcuje zásahy do své výdrže, zbraň ztrácí výdrž každým útokem.</p><ul>${[...toks.map(x => [x.name, itemText(x)]), ...cards.map(c => [c.title + " (karta)", itemText(c)])].map(([n, d]) => `<li><b>${esc(n)}</b>: ${esc(d || "bez úprav")}</li>`).join("")}</ul>`]];
}
function itemsMechHTML(p) {
  const n = p.tokens.filter(x => x.small).length + p.decks.reduce((a, d) => a + d.cards.filter(c => c.unitItem).length, 0);
  return `<div class="panel"><h2>Předměty</h2>
    <p class="hint">Předmět je malý žeton nebo karta označená „předmět pro jednotku“ (nastavíš v Komponentách). ${n ? `Ve hře je ${n} ${plural(n, "předmět", "předměty", "předmětů")}.` : "Zatím žádný."}</p>
    <p class="hint"><b>Trvalý</b> upravuje hodnoty, dokud ho jednotka nese; může mít výdrž, pohlcovat zásahy (brnění), opotřebit se útokem (zbraň) nebo svítit (světlo). <b>Jednorázový</b> se použije a zmizí: léčí, zažene stavy, doplní munici, úpravy platí zadaný počet kol.</p>
    <p class="hint"><b>Působení:</b> na nositele, <b>cíleně</b> na jednu jednotku v dosahu (svitek, zbraň), nebo <b>plošně</b> na všechny v okruhu kolem zvoleného místa (granát, léčivé světlo). Cíl musí být v dosahu a ve výhledu. Zásah kostkami zraní každou zasaženou jednotku.</p></div>`;
}
