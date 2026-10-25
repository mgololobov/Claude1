// ---------- Vybavení jednotek (malé žetony) a velení ----------
// Malý žeton se přetažením připne na jednotku, jezdí s ní a upravuje její hodnoty (útok, obrana, pohyb, dostřel, životy).
// Velitel má dosah velení: jeho aktivace aktivuje i spřátelené jednotky v dosahu a může jim dávat bonus.
const MODS = [["mAtt", "att", "Útok"], ["mDef", "def", "Obrana"], ["mMov", "mov", "Pohyb"], ["mRange", "range", "Dostřel"], ["mHp", "hp", "Max. životy"]];
const tokDef = (p, it) => it && it.kind === "token" ? p.tokens.find(x => x.id === it.tokenId) : null;
function attachedTo(p, t, it) { return (t.items || []).filter(o => o.kind === "token" && o.attachTo === it.uid && tokDef(p, o)); }
function equipMods(p, it, key) {
  const t = p.table || {}; const m = (MODS.find(x => x[1] === key) || [])[0]; if (!m) return 0;
  return itemMods(p, t, it, m); // nesené předměty (žetony i karty) a dočasné účinky
}
// Vzdálenost dvou jednotek: pole mapy, cesty sítě nebo karty lokací.
function unitDist(p, t, a, b) {
  const bd = tableBoard(p); if (bd) { const ka = cellUnder(p, a), kb = cellUnder(p, b); return ka && kb ? hexDist(bd, ka, kb) : Infinity; }
  if (typeof tableNet === "function" && tableNet(p)) { const na = netNodeOf(p, t, a), nb = netNodeOf(p, t, b); if (!na || !nb) return Infinity; const c = netCosts(tableNet(p), na, Infinity, true)[nb]; return c == null ? Infinity : c; }
  if (cmapOn(p, t)) return cmapDist(p, cmapIndexOf(p, t, a), cmapIndexOf(p, t, b));
  return Infinity;
}
function commandersOver(p, t, it) {
  const u = unitOf(p, it); if (!u) return [];
  return (t.items || []).filter(o => o !== it && o.kind === "unit" && (unitOf(p, o) || {}).factionId === u.factionId && +(unitOf(p, o) || {}).cmd > 0 && unitDist(p, t, o, it) <= +unitOf(p, o).cmd);
}
function cmdBonus(p, it, key) {
  if (key !== "att" && key !== "def") return 0; const t = p.table || {}; const f = key === "att" ? "cmdAtt" : "cmdDef";
  return Math.max(0, ...commandersOver(p, t, it).map(o => +unitOf(p, o)[f] || 0));
}
// Efektivní hodnota jednotky = základ (nebo oslabená strana) + vybavení + bonus velitele.
function unitStat(p, it, key) {
  const u = unitOf(p, it); if (!u) return 0; const red = it.reduced && hasReduced(u);
  const base = key === "att" ? (red ? u.rAtt : u.att) : key === "def" ? (red ? u.rDef : u.def) : key === "mov" ? (red ? u.rMov : u.mov) : key === "range" ? u.range : key === "hp" ? u.hp : 0;
  const v = Math.max(0, (+base || 0) + equipMods(p, it, key) + cmdBonus(p, it, key) + fieldMods(p, it, key) + envMods(p, key));
  return key === "mov" && +base > 0 ? Math.max(1, v) : v; // počasí nezastaví jednotku úplně
}
// Kopie jednotky s upravenými hodnotami pro zobrazení na žetonu.
function effUnit(p, it, u) {
  const d = k => equipMods(p, it, k) + cmdBonus(p, it, k) + fieldMods(p, it, k) + envMods(p, k); if (!d("att") && !d("def") && !d("mov")) return u;
  const v = (base, k) => (base === "" || base == null) && !d(k) ? base : Math.max(0, (+base || 0) + d(k));
  return { ...u, att: v(u.att, "att"), def: v(u.def, "def"), mov: v(u.mov, "mov"), rAtt: hasReduced(u) ? v(u.rAtt, "att") : u.rAtt, rDef: hasReduced(u) ? v(u.rDef, "def") : u.rDef, rMov: hasReduced(u) ? v(u.rMov, "mov") : u.rMov };
}
const modText = tk => MODS.filter(([m]) => +tk[m]).map(([m, , l]) => `${l} ${+tk[m] > 0 ? "+" : ""}${tk[m]}`).join(", ");
function equipBadges(p, t, it) { const at = attachedTo(p, t, it); const gear = (it.gear || []).map(g => cardItem(p, g)).filter(Boolean); const bf = (it.buffs || []).length; if (!at.length && !gear.length && !bf) return "";
  return `<span class="equip">${at.map(o => { const tk = tokDef(p, o); return `<span class="eq" style="background:${tk.color};color:${inkFor(tk.color)}" title="${esc(tk.name)}: ${esc(itemText(tk))}">${esc((tk.text || tk.name).slice(0, 3))}</span>`; }).join("")}${gear.map(c => `<span class="eq card" title="${esc(c.title)}: ${esc(itemText(c))}">${esc(c.title.slice(0, 3))}</span>`).join("")}${bf ? `<span class="eq buff" title="Dočasný účinek">✦</span>` : ""}</span>`; }
// Připnutí: malý žeton puštěný na jednotku se k ní připne.
function attachToken(p, t, it) {
  const tk = tokDef(p, it); if (!tk || !tk.small) { if (it.attachTo) delete it.attachTo; return false; }
  const cx0 = it.x + 23, cy0 = it.y + 23; const u0 = [...t.items].reverse().find(o => o.kind === "unit" && !o.inside && (() => { const [w, h] = itemSize(o); return cx0 >= o.x - 6 && cx0 <= o.x + w + 6 && cy0 >= o.y - 6 && cy0 <= o.y + h + 6; })());
  if (u0 && carryCheck(p, t, u0, tk).length && !gate(p, t, "vybaveni", carryCheck(p, t, u0, tk))) { delete it.attachTo; return false; }
  const cx = it.x + 23, cy = it.y + 23; const u = [...t.items].reverse().find(o => o.kind === "unit" && (() => { const [w, h] = itemSize(o); return cx >= o.x - 6 && cx <= o.x + w + 6 && cy >= o.y - 6 && cy <= o.y + h + 6; })());
  if (!u) { delete it.attachTo; return false; } it.attachTo = u.uid; it.x = u.x; it.y = u.y; logEv(t, `${unitOf(p, u).name} dostává ${tk.name}${modText(tk) ? " (" + modText(tk) + ")" : ""}`); return true;
}
function detachToken(p, t, tokUid) { const o = t.items.find(i => i.uid === tokUid); if (!o) return; const u = t.items.find(i => i.uid === o.attachTo); delete o.attachTo; if (u) { o.x = u.x + 56; o.y = u.y; } logEv(t, `${(tokDef(p, o) || {}).name} sundán`); }
// Aktivace: jednotlivě, nebo velitelem pro všechny spřátelené jednotky v dosahu.
function activateUnit(p, t, it) { if (it.act) return 0; it.act = true; return 1; }
function activateCommand(p, t, it) {
  const u = unitOf(p, it); let n = activateUnit(p, t, it);
  t.items.filter(o => o !== it && o.kind === "unit" && (unitOf(p, o) || {}).factionId === u.factionId && unitDist(p, t, it, o) <= +u.cmd).forEach(o => { n += activateUnit(p, t, o); });
  logEv(t, `${u.name} velí: aktivováno ${n} ${plural(n, "jednotka", "jednotky", "jednotek")}`); fireTriggers(p, t, "aktivace", u.factionId, u.name); return n;
}
function clearActivation(p, t, fid) { (t.items || []).forEach(o => { if (o.kind === "unit" && (!fid || (unitOf(p, o) || {}).factionId === fid)) o.act = false; }); }
function actViolation(p, it) { return p.ruleset.actOnly && it && it.kind === "unit" && !it.act ? ["jednotka není aktivovaná (aktivuj ji nebo jejího velitele)"] : []; }
function commandCells(p, t, it) { const b = tableBoard(p); const u = unitOf(p, it); const k0 = cellUnder(p, it); if (!b || !k0 || !+u.cmd) return null; const out = {};
  for (let c = 0; c < b.cols; c++) for (let r = 0; r < b.rows; r++) { const k = c + "," + r; const d = hexDist(b, k0, k); if (d <= +u.cmd && k !== k0) out[k] = d; } return out; }
// part: "equip" (vybavení), "cmd" (aktivace a velení); bez part vše.
function commandSelHTML(p, t, i, part) {
  const u = unitOf(p, i); const at = attachedTo(p, t, i); const cmd = +u.cmd; const under = commandersOver(p, t, i);
  const inRange = cmd ? t.items.filter(o => o !== i && o.kind === "unit" && (unitOf(p, o) || {}).factionId === u.factionId && unitDist(p, t, i, o) <= cmd).length : 0;
  const eqs = p.tokens.filter(x => x.small);
  const equip = `${eqs.length ? `<div class="row"><span class="hint">Vybavit:</span>${eqs.map(x => `<button class="btn small" data-equip="${x.id}" title="${esc(modText(x))}"><span class="eq" style="background:${x.color};color:${inkFor(x.color)}">${esc((x.text || x.name).slice(0, 3))}</span>${esc(x.name)}</button>`).join("")}</div>` : ""}
    ${itemsSelHTML(p, t, i)}`;
  if (part === "equip") return equip;
  const cmdHtml = `${under.length && (under.some(o => +unitOf(p, o).cmdAtt || +unitOf(p, o).cmdDef)) ? `<span class="hint">Pod velením: ${under.map(o => esc(unitOf(p, o).name)).join(", ")}</span>` : ""}
    <div class="row">${i.act ? `<span class="pl-chip">✓ aktivovaná</span>` : `<button class="btn small" data-activate="1">Aktivovat</button>`}${cmd ? `<button class="btn small primary" data-command="1">Velet (dosah ${cmd}, ${inRange} ${plural(inRange, "jednotka", "jednotky", "jednotek")})</button><button class="btn small ${S.cmdUid === i.uid ? "on" : ""}" data-cmdshow="1">Dosah velení</button>` : ""}</div>`;
  return part === "cmd" ? cmdHtml : equip + cmdHtml;
}
function wireCommand(main, p, t, save) {
  const sel = t.items.find(i => i.uid === S.sel); const on = (s, fn) => $$(s, main).forEach(el => el.addEventListener("click", () => fn(el)));
  on("[data-equip]", el => { const tk = p.tokens.find(x => x.id === el.dataset.equip); if (carryCheck(p, t, sel, tk).length && !gate(p, t, "vybaveni", carryCheck(p, t, sel, tk))) return; t.items.push({ uid: uid(), kind: "token", tokenId: tk.id, x: sel.x, y: sel.y, value: 0, rot: 0, attachTo: sel.uid }); logEv(t, `${unitOf(p, sel).name} dostává ${tk.name}${modText(tk) ? " (" + modText(tk) + ")" : ""}`); save(); render(); });
  on("[data-detach]", el => { detachToken(p, t, el.dataset.detach); save(); render(); });
  on("[data-activate]", () => { if (!gate(p, t, "aktivace")) return; activateUnit(p, t, sel); logEv(t, `${unitOf(p, sel).name} aktivována`); after(p, t, "aktivace", (unitOf(p, sel) || {}).factionId); save(); render(); });
  on("[data-command]", () => { if (!gate(p, t, "aktivace")) return; const n = activateCommand(p, t, sel); after(p, t, "aktivace", (unitOf(p, sel) || {}).factionId); save(); render(); toast(`Aktivováno ${n} ${plural(n, "jednotka", "jednotky", "jednotek")}`); });
  on("[data-cmdshow]", () => { S.cmdUid = S.cmdUid === sel.uid ? null : sel.uid; S.losUid = null; render(); });
}
