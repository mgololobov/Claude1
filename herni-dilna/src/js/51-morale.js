// ---------- Morálka, potlačení palbou a zvláštní žetony ----------
// Morálka: test hodem kostek (součet ≤ morálka jednotky ± úpravy). Neúspěch = rozvrácená, opakovaný neúspěch = ústup.
// Potlačení: palba bez ztrát – zásah jednotku potlačí (nehýbe se, útočí polovinou), dva zásahy navíc vyvolají test morálky.
// Zvláštní žetony: mina (zásah při vstupu, může být skrytá), ostnatý drát (pohyb navíc a zastaví), výbušnina (odpálí překážku
// nebo zasáhne sousední jednotky), potraviny (léčí a zahání únavu; volitelně je jednotky potřebují každé kolo).
function normalizeMorale(p) {
  p.morale = Object.assign({ on: false, base: 7, dice: 2, sides: 6, auto: true, cmdBonus: 1, supHit: 5, supClear: true, hunger: false }, p.morale || {});
}
const FX_NAMES = { "": "žádný", mina: "Mina – zasáhne při vstupu", drat: "Ostnatý drát – zdrží pohyb", vybusnina: "Výbušnina – odpálit", jidlo: "Potraviny – spotřebovat", kour: "Kouř – zakrývá výhled", ohen: "Oheň – pálí a šíří se" };
const fxOf = (p, it) => (tokDef(p, it) || {}).fx || "";
// Zásah jednotky: s životy ubere životy, jinak kroky.
function harm(p, t, it, n, by) {
  if (n <= 0) return ""; if (unitHp(p, it) != null) return damage(p, t, it, n, by);
  const out = []; for (let i = 0; i < n && t.items.includes(it); i++) out.push(stepLoss(p, t, it)); return out.join(", ");
}
function rollN(n, s) { return Array.from({ length: Math.max(0, n) }, () => rnd(s)); }
// Morálka
function moraleBase(p, it) { const u = unitOf(p, it); return u && u.mor !== "" && u.mor != null ? +u.mor : +p.morale.base || 7; }
function moraleMods(p, t, it) {
  const out = []; const M = p.morale;
  if (+M.cmdBonus && commandersOver(p, t, it).length) out.push(["velitel", +M.cmdBonus]);
  if (it.reduced) out.push(["oslabená", -1]); if (it.st && it.st.sup) out.push(["potlačená", -1]);
  if (tableBoard(p) && !inSupply(p, t, it)) out.push(["mimo zásobování", -1]);
  return out;
}
function moraleTarget(p, t, it) { return moraleBase(p, it) + moraleMods(p, t, it).reduce((a, [, v]) => a + v, 0); }
function moraleTest(p, t, it, why = "") {
  const M = p.morale; const u = unitOf(p, it); const roll = rollN(+M.dice || 2, +M.sides || 6); const sum = roll.reduce((a, b) => a + b, 0); const need = moraleTarget(p, t, it);
  const ok = sum <= need; let res;
  if (ok) res = "drží"; else { it.st = it.st || {}; if (it.st.dis && tableBoard(p) && cellUnder(p, it)) res = "ustupuje – " + retreat(p, t, it, 1); else { it.st.dis = true; res = "je rozvrácená"; } }
  const msg = `Morálka ${u.name}${why ? " (" + why + ")" : ""}: ${roll.join("+")} = ${sum} proti ${need} → ${res}`; logEv(t, msg); return { ok, sum, need, msg };
}
function rally(p, t, it) {
  const r = moraleTest(p, t, it, "vzpamatování"); if (r.ok) { it.st.dis = false; it.st.sup = false; r.msg += ", vzpamatovala se"; } return r;
}
// Potlačující palba: kostky podle útoku (± poloha), zásah na supHit+.
function suppressFire(p, t, a, d) {
  const ua = unitOf(p, a), ud = unitOf(p, d); if (!useAmmo(p, t, a)) return `${ua.name}: došla munice`;
  if (facingOn(p) && p.facing.auto) faceToward(p, a, d);
  const pos = positionCombat(p, t, [a], d); const roll = rollN(unitAttack(p, t, a) + pos.shift, +p.dice.sides || 6); const hits = roll.filter(v => v >= +p.morale.supHit).length;
  let msg = `${ua.name} potlačuje ${ud.name}: ${roll.join(",") || "–"} → ${hits} ${plural(hits, "zásah", "zásahy", "zásahů")}`;
  if (hits) { d.st = d.st || {}; d.st.sup = true; msg += ", potlačena"; }
  logEv(t, msg); if (hits >= 2 && p.morale.on) msg += ". " + moraleTest(p, t, d, "palba").msg;
  return msg;
}
// Po ztrátě v boji: test morálky (když je zapnutý automaticky).
function moraleAfterLoss(p, t, units) {
  if (!p.morale.on || !p.morale.auto) return []; return units.filter(i => t.items.includes(i)).map(i => moraleTest(p, t, i, "ztráty").msg);
}
// Začátek kola: potlačení skončí, hlad.
function moraleRound(p, t) {
  if (p.morale.supClear) t.items.forEach(i => { if (i.st && i.st.sup) i.st.sup = false; });
  if (!p.morale.hunger || !p.tokens.some(x => x.fx === "jidlo")) return;
  t.items.filter(i => i.kind === "unit" && !isMonster(p, i)).forEach(i => {
    const food = attachedTo(p, t, i).find(o => fxOf(p, o) === "jidlo"); const u = unitOf(p, i);
    if (food) { t.items = t.items.filter(o => o !== food); logEv(t, `${u.name} spotřebuje ${tokDef(p, food).name}`); }
    else { i.st = i.st || {}; i.st[unitHp(p, i) != null ? "tiredC" : "tired"] = true; logEv(t, `${u.name} hladoví – je unavená`); }
  });
}
// Bodlák a miny na mapě
function fxTokensAt(p, t, k, fx) { return t.items.filter(o => o.kind === "token" && !o.attachTo && fxOf(p, o) === fx && cellUnder(p, o) === k); }
function wireCost(p, t) {
  const out = {}; t.items.forEach(o => { if (o.kind !== "token" || o.attachTo || fxOf(p, o) !== "drat") return; const k = cellUnder(p, o); if (k) out[k] = Math.max(out[k] || 0, +(tokDef(p, o).fxN ?? 2) || 0); }); return out;
}
function minesOnEnter(p, t, it, k) {
  const out = []; fxTokensAt(p, t, k, "mina").forEach(m => { if (!t.items.includes(it)) return; const tk = tokDef(p, m); const roll = rollN(+tk.fxN || 1, +p.dice.sides || 6); const hits = roll.filter(v => v >= +p.dice.aHit).length;
    m.revealed = true; const r = hits ? harm(p, t, it, hits) : "bez zásahu"; out.push(`${tk.name}: ${roll.join(",")} → ${r}`); if (tk.once !== false) t.items = t.items.filter(o => o !== m); });
  out.forEach(m => logEv(t, m)); return out.join("; ");
}
// Výbušnina: cíle na vlastním a sousedních polích.
function blastTargets(p, t, it) {
  const b = tableBoard(p); const k0 = b && cellUnder(p, it); const u = unitOf(p, it); if (!k0 || !u) return [];
  const near = o => { const k = cellUnder(p, o); return k && hexDist(b, k0, k) <= 1; };
  return [...t.items.filter(o => o.kind === "token" && !o.attachTo && (tokDef(p, o) || {}).fixed && near(o)), ...t.items.filter(o => o.kind === "unit" && !o.inside && near(o) && (unitOf(p, o) || {}).factionId !== u.factionId)];
}
function blast(p, t, it, charge, target) {
  const tk = tokDef(p, charge); let msg;
  if (target.kind === "token") { t.items = t.items.filter(o => o !== target); msg = `${unitOf(p, it).name} odpálí ${tk.name}: ${tokDef(p, target).name} zničen`; }
  else { const roll = rollN(+tk.fxN || 2, +p.dice.sides || 6); const hits = roll.filter(v => v >= +p.dice.aHit).length; msg = `${unitOf(p, it).name} odpálí ${tk.name} u ${unitOf(p, target).name}: ${roll.join(",")} → ${hits ? harm(p, t, target, hits, it) : "bez zásahu"}`;
    if (hits && t.items.includes(target)) { const mm = moraleAfterLoss(p, t, [target]); if (mm.length) msg += ". " + mm.join(". "); } }
  t.items = t.items.filter(o => o !== charge); logEv(t, msg); return msg;
}
function eat(p, t, it, food) { return useItem(p, t, it, { kind: "tok", src: food, def: tokDef(p, food) }); }
const hiddenMine = (p, it) => fxOf(p, it) === "mina" && (tokDef(p, it) || {}).hidden && !it.revealed && !!S.view;
const cellLabel = k => k ? k.split(",").map(n => pad2(+n + 1)).join("") : "";
function moraleSelHTML(p, t, i) {
  const u = unitOf(p, i); const out = []; const st = i.st || {};
  if (p.morale.on) { const mods = moraleMods(p, t, i); out.push(`<div class="row"><span class="hint" title="${esc(mods.map(([n, v]) => `${n} ${v > 0 ? "+" : ""}${v}`).join(", "))}">Morálka ${moraleTarget(p, t, i)}${mods.length ? ` (základ ${moraleBase(p, i)})` : ""}</span><button class="btn small" data-mor="test">Test morálky</button>${st.dis || st.sup ? `<button class="btn small" data-mor="rally">Vzpamatovat</button>` : ""}</div>`); }
  const tg = cellUnder(p, i) && unitAttack(p, t, i) > 0 ? targetsOf(p, t, i).slice(0, 3) : [];
  if (tg.length) out.push(`<div class="row"><span class="hint">Potlačit:</span>${tg.map(o => `<button class="btn small" data-supp="${o.uid}">${esc(unitOf(p, o).name)}</button>`).join("")}</div>`);
  const items = attachedTo(p, t, i);
  const charges = items.filter(o => fxOf(p, o) === "vybusnina"); const bt = charges.length ? blastTargets(p, t, i).slice(0, 4) : [];
  if (charges.length) out.push(`<div class="row"><span class="hint">Odpálit ${esc(tokDef(p, charges[0]).name)}:</span>${bt.length ? bt.map(o => `<button class="btn small" data-blast="${charges[0].uid}|${o.uid}">${esc(o.kind === "unit" ? unitOf(p, o).name : tokDef(p, o).name)} ${cellLabel(cellUnder(p, o))}</button>`).join("") : `<span class="hint">nic v dosahu</span>`}</div>`);
  return out.join("");
}
function wireMorale(main, p, t, save) {
  const sel = t.items.find(i => i.uid === S.sel); if (!sel || sel.kind !== "unit") return; const on = (s, fn) => $$(s, main).forEach(el => el.addEventListener("click", () => fn(el)));
  const done = msg => { checkWin(p, t); save(); render(); toast(msg); };
  on("[data-mor]", el => done(el.dataset.mor === "rally" ? rally(p, t, sel).msg : moraleTest(p, t, sel).msg));
  on("[data-supp]", el => { if (!gate(p, t, "boj", actViolation(p, sel))) return; const d = t.items.find(o => o.uid === el.dataset.supp); if (d) done(suppressFire(p, t, sel, d)); });
  on("[data-blast]", el => { const [c, g] = el.dataset.blast.split("|"); const ch = t.items.find(o => o.uid === c), tg = t.items.find(o => o.uid === g); if (ch && tg) done(blast(p, t, sel, ch, tg)); });
  on("[data-eat]", el => { const f = t.items.find(o => o.uid === el.dataset.eat); if (f) done(eat(p, t, sel, f)); });
}
// Editor žetonu: zvláštní účinek
function fxEditorHTML(t) {
  const n = t.fx === "drat" ? ["Pohyb navíc", 2] : t.fx === "mina" ? ["Kostek zásahu", 1] : t.fx === "vybusnina" ? ["Kostek zásahu", 2] : null;
  return `<label class="f" style="width:230px">Zvláštní účinek<select data-tfx="${t.id}">${Object.entries(FX_NAMES).map(([k, v]) => `<option value="${k}" ${(t.fx || "") === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
    ${n ? `<label class="f" style="width:110px">${n[0]}<input type="number" min="0" max="20" data-tfxn="${t.id}" value="${esc(t.fxN ?? n[1])}"></label>` : ""}
    ${t.fx === "mina" ? `<label class="chk" title="Hráči ji nevidí, dokud do ní někdo nevstoupí (rozhodčí ji vidí)"><input type="checkbox" data-tfxh="${t.id}" ${t.hidden ? "checked" : ""}> Skrytá</label><label class="chk"><input type="checkbox" data-tfxo="${t.id}" ${t.once !== false ? "checked" : ""}> Po výbuchu zmizí</label>` : ""}`;
}
function wireFxEditor(main, p) {
  const tok = id => p.tokens.find(x => x.id === id);
  $$("[data-tfx]", main).forEach(i => i.onchange = () => { const t = tok(i.dataset.tfx); t.fx = i.value; if (["mina", "drat", "kour", "ohen"].includes(t.fx)) { t.fixed = true; t.small = false; } if (["vybusnina", "jidlo"].includes(t.fx)) { t.small = true; t.fixed = false; } if (t.fx === "jidlo") { t.use = "once"; t.heal = t.heal || 2; t.cure = true; } touch(p); render(); });
  $$("[data-tfxn]", main).forEach(i => i.addEventListener("change", () => { tok(i.dataset.tfxn).fxN = +i.value || 0; touch(p); }));
  $$("[data-tfxh]", main).forEach(i => i.onchange = () => { tok(i.dataset.tfxh).hidden = i.checked; touch(p); });
  $$("[data-tfxo]", main).forEach(i => i.onchange = () => { tok(i.dataset.tfxo).once = i.checked; touch(p); });
}
function FX_PRESET() {
  return [
  { id: uid(), name: "Mina", color: "#7a2e24", shape: "kruh", counter: false, text: "MINA", fixed: true, fx: "mina", fxN: 2, hidden: true, once: true },
  { id: uid(), name: "Ostnatý drát", color: "#55524c", shape: "ctverec", counter: false, text: "DRÁT", fixed: true, fx: "drat", fxN: 2 },
  { id: uid(), name: "Výbušnina", color: "#c8463c", shape: "ctverec", counter: false, text: "TNT", small: true, fx: "vybusnina", fxN: 3, weight: 1 },
  { id: uid(), name: "Potraviny", color: "#8a9a3a", shape: "ctverec", counter: false, text: "JÍD", small: true, fx: "jidlo", use: "once", heal: 2, cure: true, weight: 1 }];
}
function moraleMechHTML(p) {
  const M = p.morale; const n = (id, l, v, t2 = "") => `<label class="f" ${t2 ? `title="${t2}"` : ""}>${l}<input type="number" id="${id}" value="${esc(v)}"></label>`;
  return `<div class="panel"><h2>Morálka a potlačení</h2>
    <label class="chk"><input type="checkbox" id="moOn" ${M.on ? "checked" : ""}> Jednotky mají morálku (test hodem kostek)</label>
    ${M.on ? `<div class="grid" style="grid-template-columns:1fr 1fr 1fr">${n("moBase", "Výchozí morálka", M.base, "Pro jednotky bez vlastní hodnoty")}${n("moDice", "Kostek", M.dice)}${n("moSides", "Stěn", M.sides)}</div>
      ${n("moCmd", "Velitel v dosahu: + k morálce", M.cmdBonus)}
      <label class="chk"><input type="checkbox" id="moAuto" ${M.auto ? "checked" : ""}> Po ztrátě v boji test proběhne sám</label>
      <p class="hint">Test projde, když součet ≤ morálka (oslabená, potlačená a mimo zásobování −1). Neúspěch: rozvrácená (útočí polovinou); další neúspěch: ústup o pole.</p>` : ""}
    <h3>Potlačující palba</h3>
    ${n("moSup", "Zásah potlačení na (hod ≥)", M.supHit)}
    <label class="chk"><input type="checkbox" id="moSupC" ${M.supClear ? "checked" : ""}> Potlačení skončí na začátku dalšího kola</label>
    <p class="hint">Na stole u jednotky „Potlačit:“ – hází kostky podle útoku. Zásah jednotku potlačí (nehýbe se, útočí polovinou), dva zásahy vyvolají test morálky. Morálku jednotky nastavíš v Komponentách.</p></div>`;
}
function fxMechHTML(p) {
  const has = fx => p.tokens.some(x => x.fx === fx);
  return `<div class="panel"><h2>Miny, dráty, výbušniny, potraviny</h2>
    <p class="hint"><b>Mina</b> zasáhne jednotku, která vstoupí na její pole (kostky, zásah na ${p.dice.aHit}+); může být skrytá. <b>Ostnatý drát</b> stojí body pohybu navíc a zastaví pohyb. <b>Výbušninu</b> jednotka nese a odpálí – zničí překážku nebo zasáhne sousední nepřátele. <b>Potraviny</b> se spotřebují: léčí a zaženou únavu.</p>
    <label class="chk"><input type="checkbox" id="moHunger" ${p.morale.hunger ? "checked" : ""}> Hlad: na začátku kola každá jednotka sní 1 potravinu, jinak je unavená</label>
    <button class="btn small" id="fxAdd" ${["mina", "drat", "vybusnina", "jidlo"].every(has) ? "disabled" : ""}>Přidat žetony: mina, drát, výbušnina, potraviny</button>
    <p class="hint">Účinek nastavíš u každého žetonu v Komponentách („Zvláštní účinek“).</p></div>`;
}
function wireMoraleMech(main, p) {
  const M = p.morale; const q = id => document.getElementById(id);
  const ch = (id, fn, re) => { if (q(id)) q(id).addEventListener("change", e => { fn(e.target); touch(p); if (re) render(); }); };
  ch("moOn", e => { M.on = e.checked; }, 1); ch("moAuto", e => { M.auto = e.checked; }); ch("moSupC", e => { M.supClear = e.checked; }); ch("moHunger", e => { M.hunger = e.checked; });
  [["moBase", "base"], ["moDice", "dice"], ["moSides", "sides"], ["moCmd", "cmdBonus"], ["moSup", "supHit"]].forEach(([id, k]) => ch(id, e => { M[k] = +e.value || 0; }));
  if (q("fxAdd")) q("fxAdd").onclick = () => { const add = FX_PRESET().filter(x => !p.tokens.some(y => y.fx === x.fx)); p.tokens.push(...add); touch(p); render(); toast(`Přidáno ${add.length} ${plural(add.length, "žeton", "žetony", "žetonů")} do Komponent`); };
}
function moraleRulebook(p) {
  const out = []; const M = p.morale;
  if (M.on) { const mu = p.units.filter(u => u.mor !== "" && u.mor != null); out.push(["Morálka", `<p>Test morálky: hoď ${M.dice}k${M.sides}; součet nejvýš rovný morálce znamená úspěch. Výchozí morálka ${M.base}${mu.length ? ` (${mu.map(u => `${esc(u.name)} ${u.mor}`).join(", ")})` : ""}. Velitel v dosahu +${M.cmdBonus}; oslabená, potlačená a mimo zásobování −1.</p><p>Neúspěch: jednotka je rozvrácená (útočí polovinou). Rozvrácená jednotka při dalším neúspěchu ustoupí o pole. ${M.auto ? "Test se dělá po každé ztrátě v boji. " : ""}Vzpamatování: úspěšný test zruší rozvrácení i potlačení.</p>`]); }
  if (p.units.some(u => +u.att && !+u.hp)) out.push(["Potlačující palba", `<p>Místo útoku může jednotka potlačovat: hází tolik kostek, kolik má útok; každý hod ${M.supHit}+ je zásah. Zásah cíl potlačí – nesmí se pohnout a útočí polovinou${M.supClear ? " do začátku dalšího kola" : ""}. ${M.on ? " Dva zásahy navíc vyvolají test morálky." : ""}</p>`]);
  const fx = p.tokens.filter(x => x.fx); if (fx.length) out.push(["Zvláštní žetony", `<ul>${fx.map(x => `<li><b>${esc(x.name)}</b>: ${x.fx === "mina" ? `kdo vstoupí na pole, dostane ${x.fxN || 1} ${plural(+x.fxN || 1, "kostku", "kostky", "kostek")} zásahu (${p.dice.aHit}+)${x.hidden ? "; leží skrytě" : ""}${x.once !== false ? "; po výbuchu zmizí" : ""}` : x.fx === "drat" ? `vstup stojí ${x.fxN ?? 2} body pohybu navíc a jednotka musí zastavit` : x.fx === "vybusnina" ? `jednotka ji odpálí na svém nebo sousedním poli: zničí překážku nebo most, nebo hodí ${x.fxN || 2} kostky na nepřítele` : x.fx === "kour" ? "zakrývá výhled, rozplývá se a pluje po větru (viz Vítr, kouř a oheň)" : x.fx === "ohen" ? "pálí jednotky na svém poli a šíří se (viz Vítr, kouř a oheň)" : `spotřebuje se: ${esc(itemText(x))}`}</li>`).join("")}</ul>${M.hunger ? "<p>Hlad: na začátku kola každá jednotka sní 1 potravinu, jinak je unavená.</p>" : ""}`]);
  return out;
}
