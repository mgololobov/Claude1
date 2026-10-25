// ---------- Nepřímá palba, ženisté, mosty, palivo, zásobování v čase ----------
// Nepřímá palba: dělostřelectvo střílí i na cíl, který samo nevidí, když ho vidí spřátelená jednotka (pozorovatel).
// Ženista odstraní minu nebo drát na svém či sousedním poli a při pohybu odhalí skryté miny vedle sebe.
// Most (terén s volbou „po zničení“) jde odpálit výbušninou – změní se na vodu a zasáhne jednotky na něm.
// Palivo: vozidlo spotřebuje 1 za každý pohyb, bez paliva nejede; natankuje v zásobování.
// Zásobování v čase: oslabená jednotka v zásobování se na začátku kola může obnovit, odříznutá po čase ztrácí kroky.
function normalizeOps(p) {
  p.supplyRules = Object.assign({ recover: 0, attrition: 0 }, p.supplyRules || {});
  if (!p.terrains.some(x => x.breaksTo) && p.terrains.some(x => x.id === "bridge")) p.terrains.find(x => x.id === "bridge").breaksTo = "water";
}
// Pozorovatel: jiná spřátelená jednotka, která cíl vidí.
function spotter(p, t, it, target) {
  const b = tableBoard(p); const kt = b && cellUnder(p, target); const u = unitOf(p, it); if (!kt || !u) return null;
  return t.items.find(o => o !== it && o.kind === "unit" && !o.inside && (unitOf(p, o) || {}).factionId === u.factionId && cellUnder(p, o) && (() => { const ko = cellUnder(p, o); return hexDist(b, ko, kt) <= Math.max(1, sightOf(p, t, o)) && hasLOS(p, b, ko, kt) && sees(p, o, target); })()) || null;
}
// Příprava boje palbou na cíl (bojová tabulka), jako u hlídky.
function prepareFire(p, t, a, d) {
  const C = S.combat; if (!useAmmo(p, t, a)) return false; if (facingOn(p) && p.facing.auto) faceToward(p, a, d);
  S.tool = "boj"; C.mode = "crt"; C.res = null; C.zone = ""; C.att = unitAttack(p, t, a); C.attUids = [a.uid]; C.defUid = d.uid; C.shift = defShift(p, t, d);
  const k = cellUnder(p, d); const ter = k ? terrainOf(p, tableBoard(p), k) : null; C.terrainId = ter ? ter.id : (p.terrains[0] || {}).id; updatePosCombat(p, t); return true;
}
// Palivo
const fuelMax = (p, it) => { const u = unitOf(p, it); return u && u.fuel !== "" && u.fuel != null ? +u.fuel : null; };
function fuelLeft(p, it) { const m = fuelMax(p, it); return m == null ? null : Math.max(0, m - (it.fuelUsed || 0)); }
function useFuel(p, t, it) { if (fuelMax(p, it) == null) return; it.fuelUsed = (it.fuelUsed || 0) + 1; if (!fuelLeft(p, it)) logEv(t, `${unitOf(p, it).name}: došlo palivo`); }
const fuelBadge = (p, it) => { const l = fuelLeft(p, it); return l == null ? "" : `<span class="fuel ${l ? "" : "out"}" title="Palivo">⛽${l}</span>`; };
// Ženista
const isEngineer = (p, it) => !!(unitOf(p, it) || {}).engineer;
function engineerTargets(p, t, it) {
  const b = tableBoard(p); const k0 = b && cellUnder(p, it); if (!k0) return [];
  return t.items.filter(o => o.kind === "token" && !o.attachTo && ["mina", "drat"].includes(fxOf(p, o)) && cellUnder(p, o) && hexDist(b, k0, cellUnder(p, o)) <= 1 && (!hiddenMine(p, o) || o.revealed));
}
function engineerReveal(p, t, it) {
  const b = tableBoard(p); const k0 = b && cellUnder(p, it); if (!k0 || !isEngineer(p, it)) return 0; let n = 0;
  fxItems(p, t, "mina").forEach(m => { const k = cellUnder(p, m); if (k && !m.revealed && (tokDef(p, m) || {}).hidden && hexDist(b, k0, k) <= 1) { m.revealed = true; n++; } });
  if (n) logEv(t, `${unitOf(p, it).name}: ${plural(n, "objevena", "objeveny", "objeveno")} ${n} ${plural(n, "mina", "miny", "min")}`); return n;
}
function clearObstacle(p, t, it, o) { t.items = t.items.filter(x => x !== o); const msg = `${unitOf(p, it).name}: odstraněno – ${tokDef(p, o).name} na ${cellLabel(cellUnder(p, o))}`; logEv(t, msg); return msg; }
// Mosty: sousední pole s terénem, který jde zničit.
function bridgeCells(p, t, it) {
  const b = tableBoard(p); const k0 = b && cellUnder(p, it); if (!k0) return []; const out = []; const [c0, r0] = k0.split(",").map(Number);
  [[c0, r0], ...neighbors(b, c0, r0)].forEach(([c, r]) => { const k = c + "," + r; const ter = terrainOf(p, b, k); if (ter && ter.breaksTo && p.terrains.some(x => x.id === ter.breaksTo)) out.push(k); });
  return out;
}
function blowBridge(p, t, it, charge, k) {
  const b = tableBoard(p); const ter = terrainOf(p, b, k); const to = p.terrains.find(x => x.id === ter.breaksTo); const tk = tokDef(p, charge);
  (t.terrainOverride = t.terrainOverride || {})[k] = to.id; t.items = t.items.filter(o => o !== charge);
  const hit = t.items.filter(o => o.kind === "unit" && !o.inside && cellUnder(p, o) === k).map(o => { const roll = rollN(+tk.fxN || 2, +p.dice.sides || 6); const h = roll.filter(v => v >= +p.dice.aHit).length; return `${unitOf(p, o).name}: ${h ? harm(p, t, o, h, it) : "bez zásahu"}`; });
  const msg = `${unitOf(p, it).name}: ${ter.name.toLowerCase()} na ${cellLabel(k)} vyhozen do povětří, teď je tu ${to.name.toLowerCase()}${hit.length ? "; " + hit.join(", ") : ""}`; logEv(t, msg); checkWin(p, t); return msg;
}
// Začátek kola: obnova v zásobování, ztráty odříznutých jednotek.
function opsRound(p, t) {
  const R = p.supplyRules; if (!tableBoard(p) || !(+R.recover || +R.attrition)) return;
  t.items.filter(i => i.kind === "unit" && !i.inside && unitHp(p, i) == null && cellUnder(p, i)).forEach(i => { const u = unitOf(p, i); if (!u) return;
    if (inSupply(p, t, i)) { i.oos = 0; if (+R.recover && i.reduced && hasReduced(u)) { const r = rnd(6); if (r >= +R.recover) { i.reduced = false; logEv(t, `${u.name} se v zásobování obnovuje (hod ${r})`); } } }
    else if (+R.attrition) { i.oos = (i.oos || 0) + 1; if (i.oos >= +R.attrition) { i.oos = 0; logEv(t, `${u.name} je odříznutá: ${stepLoss(p, t, i)}`); } } });
  checkWin(p, t);
}
function opsSelHTML(p, t, i) {
  const out = []; const u = unitOf(p, i); if (!u) return "";
  const tg = cellUnder(p, i) && unitStat(p, i, "range") > 1 ? targetsOf(p, t, i).slice(0, 4) : [];
  if (tg.length) out.push(`<div class="row"><span class="hint">${u.indirect ? "Ostřelovat" : "Střílet na"}:</span>${tg.map(o => { const sp = u.indirect && !spotterSelf(p, t, i, o) ? spotter(p, t, i, o) : null; return `<button class="btn small" data-fire="${o.uid}" ${sp ? `title="Pozorovatel: ${esc(unitOf(p, sp).name)}"` : ""}>${esc(unitOf(p, o).name)}${sp ? " 🔭" : ""}</button>`; }).join("")}</div>`);
  const fl = fuelLeft(p, i); if (fl != null) out.push(`<div class="row"><span class="hint">Palivo ${fl}/${fuelMax(p, i)}</span><button class="btn small" data-refuel="1">Natankovat</button></div>`);
  if (isEngineer(p, i)) { const et = engineerTargets(p, t, i); out.push(`<div class="row"><span class="hint">Ženista:</span>${et.length ? et.map(o => `<button class="btn small" data-clear="${o.uid}">Odstranit ${esc(tokDef(p, o).name)} ${cellLabel(cellUnder(p, o))}</button>`).join("") : `<span class="hint">vedle není mina ani drát</span>`}</div>`); }
  const ch = attachedTo(p, t, i).find(o => fxOf(p, o) === "vybusnina"); const br = ch ? bridgeCells(p, t, i) : [];
  if (br.length) out.push(`<div class="row"><span class="hint">Zničit:</span>${br.map(k => `<button class="btn small danger" data-bridge="${k}">${esc(terrainOf(p, tableBoard(p), k).name)} ${cellLabel(k)}</button>`).join("")}</div>`);
  return out.join("");
}
function spotterSelf(p, t, it, o) { const b = tableBoard(p); const k = cellUnder(p, it), ko = cellUnder(p, o); return k && ko && hasLOS(p, b, k, ko) && hexDist(b, k, ko) <= Math.max(1, sightOf(p, t, it)); }
function wireOps(main, p, t, save) {
  const sel = t.items.find(i => i.uid === S.sel); if (!sel || sel.kind !== "unit") return; const on = (s, fn) => $$(s, main).forEach(el => el.addEventListener("click", () => fn(el)));
  on("[data-fire]", el => { if (actViolation(p, sel).length && !gate(p, t, "boj", actViolation(p, sel))) return; const d = t.items.find(o => o.uid === el.dataset.fire); if (d && prepareFire(p, t, sel, d)) { save(); render(); toast(`${unitOf(p, sel).name} střílí na ${unitOf(p, d).name}${S.combat.ftext ? " · " + S.combat.ftext : ""} – vyhodnoť v Boji`); } });
  on("[data-refuel]", () => { if (tableBoard(p) && !inSupply(p, t, sel)) { toast("Mimo zásobování – natankovat nelze"); return; } sel.fuelUsed = 0; logEv(t, `${unitOf(p, sel).name} tankuje`); save(); render(); });
  on("[data-clear]", el => { const o = t.items.find(x => x.uid === el.dataset.clear); if (o) { const m = clearObstacle(p, t, sel, o); save(); render(); toast(m); } });
  on("[data-bridge]", el => { const ch = attachedTo(p, t, sel).find(o => fxOf(p, o) === "vybusnina"); if (!ch) return; const m = blowBridge(p, t, sel, ch, el.dataset.bridge); save(); render(); toast(m); });
}
function opsMechHTML(p) {
  const R = p.supplyRules;
  return `<div class="panel"><h2>Palba, ženisté, palivo a zásobování</h2>
    <div class="grid" style="grid-template-columns:1fr 1fr"><label class="f" title="Na začátku kola hodí oslabená jednotka v zásobování k6; při tomto hodu a víc se obnoví (0 = vypnuto)">Obnova v zásobování na k6<input type="number" id="srRec" min="0" max="6" value="${esc(R.recover)}"></label>
      <label class="f" title="Po kolika kolech mimo zásobování jednotka ztratí krok (0 = vypnuto)">Odříznutá ztratí krok po kolech<input type="number" id="srAtt" min="0" max="10" value="${esc(R.attrition)}"></label></div>
    <p class="hint"><b>Nepřímá palba:</b> u jednotky v Komponentách zaškrtni „Nepřímá palba“ – střílí i na cíl za překážkou, když ho vidí jiná její jednotka (🔭 pozorovatel). Na stole u jednotky s dostřelem je řádek „Střílet na / Ostřelovat“.</p>
    <p class="hint"><b>Ženista</b> (zaškrtneš u jednotky) odstraní minu nebo drát na svém či sousedním poli a při pohybu odhalí skryté miny vedle sebe.</p>
    <p class="hint"><b>Mosty:</b> terén s volbou „Po zničení“ (v Mapě) jde odpálit výbušninou – jednotka s výbušninou na mostě nebo vedle něj uvidí „Zničit“.</p>
    <p class="hint"><b>Palivo:</b> u vozidla vyplň „Palivo“; každý pohyb ubere 1, bez paliva nejede, natankuje v zásobování.</p></div>`;
}
function wireOpsMech(main, p) { const q = id => document.getElementById(id); [["srRec", "recover"], ["srAtt", "attrition"]].forEach(([id, k]) => { if (q(id)) q(id).onchange = e => { p.supplyRules[k] = Math.max(0, +e.target.value || 0); touch(p); }; }); }
function opsRulebook(p) {
  const out = []; const R = p.supplyRules; const ind = p.units.filter(u => u.indirect), eng = p.units.filter(u => u.engineer), fu = p.units.filter(u => u.fuel !== "" && u.fuel != null), br = p.terrains.filter(x => x.breaksTo);
  if (ind.length) out.push(["Nepřímá palba", `<p>${ind.map(u => esc(u.name)).join(", ")} smí střílet na cíl v dostřelu, který samy nevidí, když ho vidí jiná jednotka stejné strany (pozorovatel).</p>`]);
  if (eng.length) out.push(["Ženisté", `<p>${eng.map(u => esc(u.name)).join(", ")}: odstraní minu nebo ostnatý drát na svém či sousedním poli (akce) a skryté miny na sousedních polích odhalí.</p>`]);
  if (br.length && p.boards.length && p.units.length) out.push(["Mosty", `<p>${br.map(x => `${esc(x.name)} → ${esc((p.terrains.find(y => y.id === x.breaksTo) || {}).name || "")}`).join(", ")}: jednotka s výbušninou na mostě nebo vedle něj ho může zničit; jednotky na mostě dostanou zásah výbušninou.</p>`]);
  if (fu.length) out.push(["Palivo", `<p>${fu.map(u => `${esc(u.name)} ${u.fuel}`).join(", ")}. Každý pohyb spotřebuje 1; bez paliva se jednotka nepohne. Natankuje v zásobování.</p>`]);
  if (+R.recover || +R.attrition) out.push(["Zásobování v čase", `<p>${+R.recover ? `Na začátku kola hodí každá oslabená jednotka v zásobování k6; při ${R.recover}+ se obnoví. ` : ""}${+R.attrition ? `Jednotka, která je ${R.attrition} ${plural(+R.attrition, "kolo", "kola", "kol")} v řadě mimo zásobování, ztratí krok.` : ""}</p>`]);
  return out;
}
