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
  const fromItems = carried(p, t, it).filter(e => !isOnce(e.def)).reduce((a, e) => a + (+e.def[m] || 0), 0);
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
function useItem(p, t, it, e) {
  const d = e.def; const u = unitOf(p, it); const parts = [];
  const heal = +(d.heal || (d.fx === "jidlo" ? d.fxN : 0)) || 0;
  if (heal) { if (unitHp(p, it) != null) { it.dmg = Math.max(0, (it.dmg || 0) - heal); parts.push(`+${heal} ${plural(heal, "život", "životy", "životů")}`); } else if (it.reduced) { it.reduced = false; parts.push("obnoven krok"); } }
  if ((d.cure || d.fx === "jidlo") && it.st) { const had = ["tired", "tiredC", "poison", "dis", "stun"].filter(k => it.st[k]); had.forEach(k => { it.st[k] = false; }); if (had.length) parts.push("zažene " + had.map(k => UNIT_ST[k][0].toLowerCase()).join(", ")); }
  if (d.ammo && it.ammoUsed) { it.ammoUsed = 0; parts.push("doplní munici"); }
  const m = {}; MODS.forEach(([k]) => { if (+d[k]) m[k] = +d[k]; });
  if (Object.keys(m).length) { const n = Math.max(1, +d.turns || 1); (it.buffs = it.buffs || []).push({ name: itemName(e), m, until: (t.turn || 1) + n - 1 }); parts.push(`${modText(d)} na ${n} ${plural(n, "kolo", "kola", "kol")}`); }
  if (e.kind === "hand") { const h = e.src; const fid = u.factionId; t.hands[fid] = (t.hands[fid] || []).filter(x => x !== h); discardCard(t, h, fid); } else destroyItem(p, t, it, e);
  const msg = `${u.name} použije ${itemName(e)}${parts.length ? ": " + parts.join(", ") : ""}`; logEv(t, msg); return msg;
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
  if (+d.dur) a.push(`výdrž ${d.dur}`); if (d.absorb) a.push("pohlcuje zásahy"); if (d.wear) a.push("opotřebí se útokem");
  return a.join(" · ");
}
function handItems(p, t, it) { const u = unitOf(p, it); return u ? (t.hands[u.factionId] || []).filter(h => (cardOf(p, h).c || {}).unitItem) : []; }
function itemsSelHTML(p, t, i) {
  const out = []; const list = carried(p, t, i);
  if (list.length) out.push(`<div class="row items"><span class="hint">Nese:</span>${list.map((e, n) => { const l = itemLeft(e); return `<span class="pl-chip" title="${esc(itemText(e.def))}">${esc(itemName(e))}${l != null ? ` <span class="hint">${l}/${e.def.dur}</span>` : ""}${isOnce(e.def) ? ` <button class="btn small primary" data-iuse="${n}">Použít</button>` : ""}${l != null ? `<button class="btn small" data-idmg="${n}|1" aria-label="Poškodit">−</button><button class="btn small" data-idmg="${n}|-1" aria-label="Opravit">+</button>` : ""}<button class="btn small" data-idrop="${n}" aria-label="Sundat ${esc(itemName(e))}">✕</button></span>`; }).join("")}</div>`);
  const bf = (i.buffs || []).filter(b => b.until >= (t.turn || 1)); if (bf.length) out.push(`<span class="hint">Účinky: ${bf.map(b => `${esc(b.name)} (${esc(modText(b.m))}, ${b.until - (t.turn || 1) + 1} ${plural(b.until - (t.turn || 1) + 1, "kolo", "kola", "kol")})`).join(", ")}</span>`);
  const hand = handItems(p, t, i); if (hand.length) out.push(`<div class="row"><span class="hint">Z ruky:</span>${hand.map((h, n) => { const c = cardOf(p, h).c; return `<button class="btn small" data-ihand="${n}" title="${esc(itemText(c))}">${isOnce(c) ? "Použít" : "Vybavit"} ${esc(c.title)}</button>`; }).join("")}</div>`);
  return out.join("");
}
function wireItems(main, p, t, save) {
  const sel = t.items.find(i => i.uid === S.sel); if (!sel || sel.kind !== "unit") return; const on = (s, fn) => $$(s, main).forEach(el => el.addEventListener("click", () => fn(el)));
  const list = carried(p, t, sel); const done = msg => { save(); render(); if (msg) toast(msg); };
  on("[data-iuse]", el => { const e = list[+el.dataset.iuse]; if (e) done(useItem(p, t, sel, e)); });
  on("[data-idmg]", el => { const [n, d] = el.dataset.idmg.split("|"); const e = list[+n]; if (e) done(damageItem(p, t, sel, e, +d)); });
  on("[data-idrop]", el => { const e = list[+el.dataset.idrop]; if (!e) return; if (e.kind === "tok") detachToken(p, t, e.src.uid); else unequipCard(p, t, sel, e.src); done(); });
  on("[data-ihand]", el => { const h = handItems(p, t, sel)[+el.dataset.ihand]; if (!h) return; const c = cardOf(p, h).c; done(isOnce(c) ? useItem(p, t, sel, { kind: "hand", src: h, def: c }) : equipCard(p, t, sel, h)); });
}
// Společný editor vlastností předmětu (žeton i karta). attr: data atribut pro vstupy, withMods: ukázat i úpravy hodnot.
function itemFxHTML(o, attr, withMods) {
  const v = k => esc(o[k] ?? ""); const ck = (k, l, t2) => `<label class="chk" ${t2 ? `title="${t2}"` : ""}><input type="checkbox" ${attr}="${k}" ${o[k] ? "checked" : ""}> ${l}</label>`;
  return `<div class="row ifx" style="width:100%">
    ${withMods ? MODS.map(([m, , l]) => `<label class="f" style="width:84px">${l}<input type="number" ${attr}="${m}" value="${v(m)}" placeholder="±0"></label>`).join("") : ""}
    <label class="f" style="width:190px">Použití<select ${attr}="use"><option value="">trvalý – platí, dokud ho nese</option><option value="once" ${o.use === "once" ? "selected" : ""}>jednorázový – použije se a zmizí</option></select></label>
    ${o.use === "once" ? `<label class="f" style="width:96px" title="Kolik kol platí úpravy hodnot po použití">Platí kol<input type="number" min="1" max="20" ${attr}="turns" value="${v("turns")}" placeholder="1"></label>
      <label class="f" style="width:96px" title="Okamžitě vyléčí (jednotka bez životů obnoví krok)">Vyléčí životy<input type="number" min="0" max="20" ${attr}="heal" value="${v("heal")}" placeholder="0"></label>
      ${ck("cure", "zažene únavu, otravu, rozvrácení")}${ck("ammo", "doplní munici")}` : `<label class="f" style="width:96px" title="Kolik poškození vydrží (prázdné = nezničitelný)">Výdrž<input type="number" min="0" max="50" ${attr}="dur" value="${v("dur")}" placeholder="–"></label>
      ${ck("absorb", "pohlcuje zásahy (brnění)", "Zásahy jednotky jdou nejdřív do výdrže předmětu")}${ck("wear", "opotřebí se útokem (zbraň)", "Každý útok ubere 1 výdrž")}`}</div>`;
}
function readItemFx(o, el, attr) {
  const k = el.getAttribute(attr); if (el.type === "checkbox") o[k] = el.checked; else if (k === "use") o[k] = el.value; else o[k] = el.value === "" ? "" : +el.value;
}
function itemsRulebook(p) {
  const toks = p.tokens.filter(x => x.small && itemText(x)), cards = p.decks.flatMap(d => d.cards.filter(c => c.unitItem));
  if (!toks.length && !cards.length) return [];
  return [["Předměty", `<p>Trvalé předměty upravují hodnoty, dokud je jednotka nese. Jednorázové se použijí a odloží; jejich úpravy platí uvedený počet kol. Předmět s výdrží se poškozuje; při nulové výdrži je zničen. Brnění pohlcuje zásahy do své výdrže, zbraň ztrácí výdrž každým útokem.</p><ul>${[...toks.map(x => [x.name, itemText(x)]), ...cards.map(c => [c.title + " (karta)", itemText(c)])].map(([n, d]) => `<li><b>${esc(n)}</b>: ${esc(d || "bez úprav")}</li>`).join("")}</ul>`]];
}
