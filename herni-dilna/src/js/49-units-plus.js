// ---------- Pevné žetony, zóny jednotek a nosnost ----------
// Pevný žeton (okop, minové pole) po položení zůstává na místě; může dávat bonus jednotkám na stejném poli a jednotky ho mohou postavit.
// Zóny: jednotka má části s vlastní obranou (podvozek / vrch, hlava / trup / ruce / nohy), volitelně s výdrží a pravděpodobností zásahu.
// Nosnost: vozidlo převeze jednotky do své kapacity, jednotlivec unese předměty do své nosnosti (předmět má váhu).
function locKey(p, t, it) {
  if (tableBoard(p)) return cellUnder(p, it); if (tableNet(p)) return netNodeOf(p, t, it);
  if (cmapOn(p, t)) { const i = cmapIndexOf(p, t, it); return i == null ? null : "c" + i; } return null;
}
function fieldMods(p, it, key) {
  const t = p.table || {}; const m = (MODS.find(x => x[1] === key) || [])[0]; if (!m || key === "hp") return 0; const k = locKey(p, t, it); if (!k) return 0;
  return (t.items || []).filter(o => o.kind === "token" && (tokDef(p, o) || {}).fixed && locKey(p, t, o) === k).reduce((a, o) => a + (+tokDef(p, o)[m] || 0), 0);
}
const isFixed = (p, it) => !!(tokDef(p, it) || {}).fixed && !it.free;
// Postavení pevného žetonu na místě jednotky.
function buildToken(p, t, unitIt, tokenId) {
  const tk = p.tokens.find(x => x.id === tokenId); const k = locKey(p, t, unitIt); if (!tk || !k) return "Jednotka nestojí na mapě";
  if (t.items.some(o => o.kind === "token" && o.tokenId === tk.id && locKey(p, t, o) === k)) return `${tk.name} tu už je`;
  const it = { uid: uid(), kind: "token", tokenId: tk.id, x: unitIt.x, y: unitIt.y, value: 0, rot: 0 };
  const b = tableBoard(p); if (b) { const [c, r] = k.split(",").map(Number); const [cx, cy] = geo(b).center(c, r); it.x = Math.round(BX + cx - 23 - 14); it.y = Math.round(BY + cy - 23 + 12); }
  else if (tableNet(p)) { const n = netNode(tableNet(p), k); it.x = Math.round(BX + n.x - 40); it.y = Math.round(BY + n.y + 4); }
  else if (cmapOn(p, t)) { const bx = cmapBox(p, +k.slice(1)); it.x = bx.x + CM.W - 52; it.y = bx.y + 60; }
  t.items.unshift(it); logEv(t, `${unitOf(p, unitIt).name} staví ${tk.name}`); after(p, t, "stavba", (unitOf(p, unitIt) || {}).factionId, tk.name); return "";
}
// ----- Zóny -----
const unitZones = u => (u && u.zones || []).filter(z => String(z.name || "").trim());
const zoneLeft = (it, z) => +z.hp ? Math.max(0, +z.hp - ((it.zdmg || {})[z.name] || 0)) : null;
function zoneDef(p, it, z) {
  const u = unitOf(p, it); const red = it.reduced && hasReduced(u); const baseDef = +(red ? u.rDef : u.def) || 0;
  const general = unitStat(p, it, "def") - baseDef; const own = attachedTo(p, p.table || {}, it).filter(o => same(tokDef(p, o).zone, z.name)).reduce((a, o) => a + (+tokDef(p, o).mZone || 0), 0);
  return Math.max(0, (+z.def || 0) + general + own);
}
function pickZone(p, it) {
  const zs = unitZones(unitOf(p, it)).filter(z => zoneLeft(it, z) !== 0); if (!zs.length) return null;
  const w = z => z.w === "" || z.w == null ? 1 : Math.max(0, +z.w || 0); const tot = zs.reduce((a, z) => a + w(z), 0);
  if (!tot) return zs[Math.floor(Math.random() * zs.length)]; let r = Math.random() * tot;
  for (const z of zs) { r -= w(z); if (r < 0) return z; } return zs.filter(z => w(z) > 0).pop();
}
// Zásah zóny: zóna s výdrží ztrácí výdrž; zničená kritická zóna vyřadí celou jednotku.
function zoneHit(p, t, it, z, n, by) {
  const u = unitOf(p, it);
  if (!+z.hp) return damage(p, t, it, n, by) || `${u.name} zasažen do zóny ${z.name}`;
  it.zdmg = it.zdmg || {}; it.zdmg[z.name] = (it.zdmg[z.name] || 0) + n; const left = zoneLeft(it, z);
  if (left > 0) return `${u.name}: ${z.name} −${n} (zbývá ${left})`;
  if (z.crit) { t.items = t.items.filter(x => x !== it); if (S.sel === it.uid) S.sel = null; if (by && isHero(p, by) && +u.xp) by.xp = (by.xp || 0) + +u.xp; checkWin(p, t); return `${u.name}: ${z.name} zničen – jednotka vyřazena`; }
  return `${u.name}: ${z.name} vyřazen`;
}
function zoneBadge(p, it) { const zs = unitZones(unitOf(p, it)); if (!zs.length) return ""; const broken = zs.filter(z => zoneLeft(it, z) === 0).length;
  return `<span class="zb" title="${esc(zs.map(z => `${z.name} ${zoneDef(p, it, z)}${+z.hp ? ` (${zoneLeft(it, z)}/${z.hp})` : ""}`).join(", "))}">◈${broken ? "!" : ""}</span>`; }
// ----- Nosnost -----
const tokWeight = tk => tk && tk.weight !== "" && tk.weight != null ? +tk.weight || 0 : 1;
function carryUsed(p, t, it) { return attachedTo(p, t, it).reduce((a, o) => a + tokWeight(tokDef(p, o)), 0); }
function carryCheck(p, t, it, tk) { const u = unitOf(p, it); if (!u || u.carry === "" || u.carry == null) return []; const used = carryUsed(p, t, it), w = tokWeight(tk);
  return used + w > +u.carry ? [`${u.name} unese nejvýš ${u.carry} (nese ${used}, ${tk.name} váží ${w})`] : []; }
function passengers(t, it) { return (t.items || []).filter(o => o.kind === "unit" && o.inside === it.uid); }
const tsizeOf = (p, it) => { const u = unitOf(p, it); return u && u.tsize !== "" && u.tsize != null ? +u.tsize || 0 : 1; };
function loadUsed(p, t, it) { return passengers(t, it).reduce((a, o) => a + tsizeOf(p, o), 0); }
function syncPassengers(t) { (t.items || []).forEach(i => { if (!i.inside) return; const tr = t.items.find(o => o.uid === i.inside); if (tr) { i.x = tr.x; i.y = tr.y; } else delete i.inside; }); }
function embark(p, t, it, tr) {
  const u = unitOf(p, it), ut = unitOf(p, tr); const msgs = [];
  if (loadUsed(p, t, tr) + tsizeOf(p, it) > +ut.transport) msgs.push(`${ut.name} pojme ${ut.transport}, obsazeno ${loadUsed(p, t, tr)}`);
  if (unitDist(p, t, it, tr) > 0) msgs.push("jednotka musí stát na stejném místě jako vozidlo");
  if (msgs.length && !gate(p, t, "pohyb", msgs)) return false;
  it.inside = tr.uid; it.x = tr.x; it.y = tr.y; logEv(t, `${u.name} nastupuje do ${ut.name}`); return true;
}
function disembark(p, t, it) { const tr = t.items.find(o => o.uid === it.inside); delete it.inside; if (tr) { const n = passengers(t, tr).length; it.x = tr.x + 30 + n * 6; it.y = tr.y + 30; } logEv(t, `${unitOf(p, it).name} vystupuje`); }
function loadBadge(p, t, it) { const u = unitOf(p, it); if (!+u.transport) return ""; const n = loadUsed(p, t, it); return `<span class="lb" title="Přepravuje ${n} z ${u.transport}">⛟${n}/${u.transport}</span>`; }
// ----- Detail vybrané jednotky -----
function unitsPlusSelHTML(p, t, i) {
  const u = unitOf(p, i); const out = []; const zs = unitZones(u);
  if (zs.length) out.push(`<div class="zones"><span class="hint">Zóny:</span>${zs.map(z => { const left = zoneLeft(i, z); return `<button class="btn small ${left === 0 ? "muted" : ""}" data-zdef="${esc(z.name)}" title="Brání touto zónou">${esc(z.name)} <b>${zoneDef(p, i, z)}</b>${+z.hp ? ` <span class="hint">${left}/${z.hp}</span>` : ""}${z.crit ? " ★" : ""}</button>`; }).join("")}<button class="btn small" data-zdef="?">Náhodná zóna</button></div>`);
  if (u.carry !== "" && u.carry != null) out.push(`<span class="hint">Nese ${carryUsed(p, t, i)} z ${u.carry}</span>`);
  const builds = p.tokens.filter(x => x.fixed && x.buildable); if (builds.length && locKey(p, t, i)) out.push(`<div class="row"><span class="hint">Postavit:</span>${builds.map(x => `<button class="btn small" data-build="${x.id}" title="${esc(modText(x))}"><span class="eq" style="background:${x.color};color:${inkFor(x.color)}">${esc((x.text || x.name).slice(0, 3))}</span>${esc(x.name)}</button>`).join("")}</div>`);
  const pas = passengers(t, i); if (+u.transport) out.push(`<div class="row"><span class="hint">Přepravuje ${loadUsed(p, t, i)}/${u.transport}${pas.length ? ":" : ""}</span>${pas.map(o => `<span class="pl-chip">${esc(unitOf(p, o).name)} <button class="btn small" data-disembark="${o.uid}" aria-label="Vystoupit ${esc(unitOf(p, o).name)}">Vystoupit</button></span>`).join("")}</div>`);
  if (i.inside) out.push(`<div class="row"><span class="hint">Je ve vozidle ${esc((unitOf(p, t.items.find(o => o.uid === i.inside) || {}) || {}).name || "")}</span><button class="btn small" data-disembark="${i.uid}">Vystoupit</button></div>`);
  else { const trs = t.items.filter(o => o !== i && o.kind === "unit" && !o.inside && +(unitOf(p, o) || {}).transport && (unitOf(p, o) || {}).factionId === u.factionId && unitDist(p, t, i, o) === 0);
    if (trs.length) out.push(`<div class="row">${trs.map(o => `<button class="btn small" data-embark="${o.uid}">Nastoupit do ${esc(unitOf(p, o).name)} (${loadUsed(p, t, o)}/${unitOf(p, o).transport})</button>`).join("")}</div>`); }
  return out.join("");
}
function wireUnitsPlus(main, p, t, save) {
  const sel = t.items.find(i => i.uid === S.sel); const on = (s, fn) => $$(s, main).forEach(el => el.addEventListener("click", () => fn(el))); const C = S.combat;
  on("[data-zdef]", el => { const z = el.dataset.zdef === "?" ? pickZone(p, sel) : unitZones(unitOf(p, sel)).find(x => x.name === el.dataset.zdef); if (!z) { toast("Žádná zóna"); return; }
    S.tool = "boj"; C.mode = "crt"; C.res = null; C.def = zoneDef(p, sel, z); C.defUid = sel.uid; C.zone = z.name; C.shift = defShift(p, t, sel); const ter = tableBoard(p) && cellUnder(p, sel) ? terrainOf(p, tableBoard(p), cellUnder(p, sel)) : null; C.terrainId = ter ? ter.id : (p.terrains[0] || {}).id;
    render(); toast(`Brání ${z.name}: obrana ${C.def}`); });
  on("[data-build]", el => { if (!gate(p, t, "stavba")) return; const r = buildToken(p, t, sel, el.dataset.build); if (r) { toast(r); return; } save(); render(); });
  on("[data-embark]", el => { const tr = t.items.find(o => o.uid === el.dataset.embark); if (embark(p, t, sel, tr)) { S.sel = tr.uid; save(); render(); } });
  on("[data-disembark]", el => { const o = t.items.find(x => x.uid === el.dataset.disembark); disembark(p, t, o); save(); render(); });
  on("[data-unfix]", () => { sel.free = !sel.free; save(); render(); });
}
// Editor zón v dialogu jednotky.
const ZONE_PRESETS = { vozidlo: [{ name: "Podvozek", def: 4, w: 1 }, { name: "Vrch", def: 2, w: 1 }], postava: [{ name: "Hlava", def: 1, w: 1, crit: true }, { name: "Trup", def: 3, w: 3, crit: true }, { name: "Ruce", def: 2, w: 2 }, { name: "Nohy", def: 2, w: 2 }] };
function zonesEditorHTML(u) {
  const zs = u.zones || [];
  return `<div class="eyebrow">Zóny jednotky (části s vlastní obranou)</div>
    ${zs.map((z, i) => `<div class="row zrow"><input type="text" data-zn="${i}" value="${esc(z.name)}" placeholder="Název" style="width:110px" aria-label="Název zóny"><label class="f" style="width:74px">Obrana<input type="number" data-zd="${i}" value="${esc(z.def ?? "")}"></label><label class="f" style="width:74px" title="Kolik zásahů zóna vydrží (prázdné = zásah jde do životů)">Výdrž<input type="number" data-zh="${i}" value="${esc(z.hp ?? "")}" placeholder="–"></label><label class="f" style="width:66px" title="Jak často se zóna trefí (poměr)">Váha<input type="number" data-zw="${i}" value="${esc(z.w ?? 1)}" min="0"></label><label class="chk" title="Zničení zóny vyřadí jednotku"><input type="checkbox" data-zc="${i}" ${z.crit ? "checked" : ""}> kritická</label><button type="button" class="btn small danger" data-zdel="${i}" aria-label="Smazat zónu">✕</button></div>`).join("")}
    <div class="row"><button type="button" class="btn small" id="zAdd">+ Zóna</button><button type="button" class="btn small" data-zpre="vozidlo">Předvolba: vozidlo</button><button type="button" class="btn small" data-zpre="postava">Předvolba: postava</button></div>`;
}
function wireZonesEditor(d, u) {
  const box = $("#u-zones", d); const draw = () => { box.innerHTML = zonesEditorHTML(u); wire(); };
  const wire = () => {
    const set = (attr, k, conv) => $$(`[${attr}]`, box).forEach(i => i.addEventListener("input", () => { u.zones[+i.getAttribute(attr)][k] = conv(i); }));
    set("data-zn", "name", i => i.value); set("data-zd", "def", i => i.value === "" ? "" : +i.value); set("data-zh", "hp", i => i.value === "" ? "" : +i.value); set("data-zw", "w", i => i.value === "" ? 1 : +i.value);
    $$("[data-zc]", box).forEach(i => i.addEventListener("change", () => { u.zones[+i.dataset.zc].crit = i.checked; }));
    $$("[data-zdel]", box).forEach(b => b.onclick = () => { u.zones.splice(+b.dataset.zdel, 1); draw(); });
    $("#zAdd", box).onclick = () => { (u.zones = u.zones || []).push({ name: "", def: "", w: 1 }); draw(); };
    $$("[data-zpre]", box).forEach(b => b.onclick = () => { u.zones = clone(ZONE_PRESETS[b.dataset.zpre]); draw(); });
  };
  draw();
}
