// ---------- Dungeon crawler: životy, hrdinové a příšery, automat příšer, místnosti, stavy, zkušenosti, poklady, hrozba ----------
function normalizeCrawl(p) {
  p.crawl = Object.assign({ rooms: false, lootDeck: "", levelXp: 5, doom: "" }, p.crawl || {});
  return p;
}
function unitHp(p, i) { const mx = unitMaxHp(p, i); return mx == null ? null : Math.max(0, mx - (i.dmg || 0)); }
function unitMaxHp(p, i) { const u = unitOf(p, i); return u && +u.hp ? +u.hp + crawlLevel(p, i) - 1 + equipMods(p, i, "hp") : null; }
function crawlLevel(p, i) { return 1 + Math.floor((i.xp || 0) / Math.max(1, +p.crawl.levelXp || 5)); }
function isHero(p, i) { return (unitOf(p, i) || {}).kind === "hero"; }
function isMonster(p, i) { return (unitOf(p, i) || {}).kind === "monster"; }
function hpBadge(p, i) { const hp = unitHp(p, i); if (hp == null) return ""; const mx = unitMaxHp(p, i);
  return `<span class="hpb" title="Životy ${hp} z ${mx}"><span style="width:${Math.round(hp / mx * 100)}%"></span><b>♥${hp}</b>${isHero(p, i) ? `<i>${crawlLevel(p, i)}</i>` : ""}</span>`; }
// Zranění: v nule jednotka padne, hrdina za zabitou příšeru dostane zkušenosti.
function damage(p, t, it, n, by) {
  if (unitHp(p, it) == null) return "";
  if (n > 0) { const r = absorbHits(p, t, it, n); if (r.msg) return r.n ? r.msg + "; " + damage(p, t, it, r.n, by) : r.msg; } // brnění pohltí zásahy
  it.dmg = Math.max(0, (it.dmg || 0) + n); const u = unitOf(p, it);
  if (unitHp(p, it) > 0) return n > 0 ? `${u.name} ztrácí ${n} ${plural(n, "život", "životy", "životů")}` : `${u.name} se léčí`;
  t.items = t.items.filter(x => x !== it); if (S.sel === it.uid) S.sel = null;
  if (by && isHero(p, by) && +u.xp) { by.xp = (by.xp || 0) + +u.xp; }
  checkWin(p, t); return `${u.name} padl${by && +u.xp && isHero(p, by) ? ` (+${u.xp} XP pro ${unitOf(p, by).name})` : ""}`;
}
// Útok: útočník hází tolik kostek, kolik má útok, obránce tolik, kolik má obranu; zranění = zásahy − bloky.
function crawlAttack(p, t, a, d) {
  const ua = unitOf(p, a), ud = unitOf(p, d); const s = +p.dice.sides || 6;
  if (!useAmmo(p, t, a)) return `${ua.name}: došla munice`;
  if (facingOn(p) && p.facing.auto) faceToward(p, a, d);
  const pos = positionCombat(p, t, [a], d); // směr útoku, nepozorovaný útok, výška → kostky navíc / méně
  const z = unitZones(ud).length ? pickZone(p, d, pos.arc) : null; // zásah do náhodné zóny podle vah (a směru)
  const ad = Array.from({ length: Math.max(0, unitAttack(p, t, a) + pos.shift) }, () => rnd(s)), dd = Array.from({ length: Math.max(0, withAttacker(a, () => z ? zoneDef(p, d, z) : unitStat(p, d, "def")) + coverOf(p, t, d)) }, () => rnd(s));
  const hits = ad.filter(v => v >= p.dice.aHit).length, blocks = dd.filter(v => v >= p.dice.dHit).length; const dmg = Math.max(0, hits - blocks);
  const res = `${ua.name} útočí na ${ud.name}${z ? ` (${z.name})` : ""}${pos.parts.length ? ` [${pos.parts.join(", ")}]` : ""}: ${ad.join(",") || "–"} proti ${dd.join(",") || "–"} → ${dmg} ${plural(dmg, "zranění", "zranění", "zranění")}`;
  let after2 = dmg ? (z ? zoneHit(p, t, d, z, dmg, a) : damage(p, t, d, dmg, a)) : "";
  if (dmg && t.items.includes(d)) after2 = [after2, ...moraleAfterLoss(p, t, [d])].filter(Boolean).join("; "); logEv(t, res + (after2 ? "; " + after2 : "")); return res + (after2 ? ". " + after2 : "");
}
function targetsOf(p, t, it) {
  if (cmapOn(p, t)) { const i0 = cmapIndexOf(p, t, it); const u0 = unitOf(p, it); if (i0 == null || !u0) return []; const reach = unitStat(p, it, "range");
    return t.items.filter(o => o.kind === "unit" && o !== it && !o.inside && (unitOf(p, o) || {}).factionId !== u0.factionId && cmapDist(p, i0, cmapIndexOf(p, t, o)) <= reach).sort((x, y) => (unitHp(p, x) ?? 99) - (unitHp(p, y) ?? 99)); }
  const b = tableBoard(p); const k = cellUnder(p, it); const u = unitOf(p, it); if (!b || !k || !u) return [];
  const reach = Math.max(1, unitStat(p, it, "range") || 1);
  return t.items.filter(o => o.kind === "unit" && o !== it && !o.inside && (unitOf(p, o) || {}).factionId !== u.factionId && cellUnder(p, o) && hexDist(b, k, cellUnder(p, o)) <= reach && (reach === 1 || hasLOS(p, b, k, cellUnder(p, o)) && hexDist(b, k, cellUnder(p, o)) <= Math.max(1, sightOf(p, t, it)) || u.indirect && spotter(p, t, it, o)))
    .sort((x, y) => (unitHp(p, x) ?? 99) - (unitHp(p, y) ?? 99));
}
// Automat příšer: každá příšera jde k nejbližšímu hrdinovi a zaútočí, když dosáhne.
function monsterTurn(p, t) {
  if (cmapOn(p, t)) return cmapMonsterTurn(p, t);
  const b = tableBoard(p); if (!b) return ["Tah příšer potřebuje mapu"]; const out = []; const dark = crawlDarkSet(p, t);
  t.items.filter(i => isMonster(p, i)).forEach(m => {
    if (!t.items.includes(m)) return; const km = cellUnder(p, m); if (!km || dark.has(km)) return; if (m.st && m.st.stun) { m.st.stun = false; out.push(`${unitOf(p, m).name} je omráčená`); return; }
    const heroes = t.items.filter(i => isHero(p, i) && cellUnder(p, i)); if (!heroes.length) return;
    const near = k => Math.min(...heroes.map(h => hexDist(b, k, cellUnder(p, h))));
    if (!targetsOf(p, t, m).length) { const rng = computeRange(p, t, m) || {}; const best = Object.keys(rng).filter(k => !t.items.some(o => o.kind === "unit" && cellUnder(p, o) === k)).sort((a, c) => near(a) - near(c) || rng[a] - rng[c])[0];
      if (best && near(best) < near(km)) { placeOn(p, t, m, best); if (facingOn(p) && p.facing.auto) faceAlong(p, m, km, best); out.push(`${unitOf(p, m).name} jde na ${cellName(best)}`); } }
    const tg = targetsOf(p, t, m)[0]; if (tg) out.push(crawlAttack(p, t, m, tg));
  });
  if (!out.length) out.push("Žádná příšera nejedná"); logEv(t, "tah příšer"); return out;
}
// Místnosti = oblasti mapy. Neodhalené jsou tmavé a příšery v nich nejsou vidět.
function crawlDarkSet(p, t) {
  const b = tableBoard(p); const out = new Set(); if (!p.crawl.rooms || !b) return out;
  // Místnost, ve které stojí hrdina, je vždy vidět (třeba startovní místnost).
  const rev = [...(t.revealed || []), ...t.items.filter(i => isHero(p, i)).map(i => (b.regions || {})[cellUnder(p, i)]).filter(Boolean)];
  Object.entries(b.regions || {}).forEach(([k, n]) => { if (!rev.includes(n)) out.add(k); });
  if (out.size) t.items.filter(i => isHero(p, i) && itemLight(p, t, i)).forEach(h => { const kh = cellUnder(p, h); const L = itemLight(p, t, h); if (kh) [...out].forEach(k => { if (hexDist(b, kh, k) <= L) out.delete(k); }); }); // světlo osvětlí okolí
  return out;
}
function revealRoom(p, t, name, fid) { t.revealed = t.revealed || []; if (t.revealed.includes(name)) return false; t.revealed.push(name); logEv(t, `odhalena místnost ${name}`); fireTriggers(p, t, "mistnost", fid, name); return true; }
function crawlOnMove(p, t, it, k) {
  const b = tableBoard(p); if (!p.crawl.rooms || !b || !isHero(p, it)) return; const n = (b.regions || {})[k]; if (n && revealRoom(p, t, n, (unitOf(p, it) || {}).factionId)) toast(`Odhalena místnost ${n}`);
}
function crawlRound(p, t) {
  t.items.filter(i => i.st && i.st.poison && unitHp(p, i) != null).forEach(i => logEv(t, "otrava: " + damage(p, t, i, 1)));
  if (+p.crawl.doom) { t.doom = (t.doom || 0) + 1; if (t.doom >= +p.crawl.doom) { logEv(t, `hrozba dosáhla ${t.doom}`); fireTriggers(p, t, "hrozba", null, t.doom); toast("Hrozba dosáhla maxima!"); } }
}
function crawlSelHTML(p, i) {
  const hp = unitHp(p, i); const tg = cellUnder(p, i) ? targetsOf(p, p.table, i) : [];
  return `${hp != null ? `<div class="row"><span class="hint">Životy</span><button class="btn small" data-hp="-1" aria-label="Ubrat život">−♥</button><b class="mono">${hp}/${unitMaxHp(p, i)}</b><button class="btn small" data-hp="1" aria-label="Přidat život">+♥</button>${isHero(p, i) ? `<span class="hint">úroveň ${crawlLevel(p, i)} · ${i.xp || 0} XP</span><button class="btn small" data-xp="1">+XP</button>` : ""}</div>` : ""}
    ${tg.length ? `<div class="row"><button class="btn small primary" data-crawlatt="${tg[0].uid}">Zaútočit na ${esc(unitOf(p, tg[0]).name)}</button>${tg.length > 1 ? `<span class="hint">+${tg.length - 1} dalších v dosahu</span>` : ""}</div>` : ""}`;
}
function sideCrawl(p, t) {
  const b = tableBoard(p); const rooms = b ? [...new Set(Object.values(b.regions || {}))] : []; const rev = t.revealed || []; const heroes = t.items.filter(i => isHero(p, i)); const loot = p.decks.find(d => d.id === p.crawl.lootDeck);
  return `<section><div class="eyebrow">Výprava</div>
      <button class="btn primary" id="crMon">Tah příšer</button>
      <p class="hint">Každá příšera jde k nejbližšímu hrdinovi a zaútočí, když na něj dosáhne. Útok: kostky podle útoku, zásah na ${p.dice.aHit}+, obránce blokuje kostkami podle obrany na ${p.dice.dHit}+.</p>
      ${S.crawlLog ? `<div class="log">${S.crawlLog.map(l => `<span>${esc(l)}</span>`).join("")}</div>` : ""}</section>
    ${heroes.length ? `<section><div class="eyebrow">Hrdinové</div>${heroes.map(h => { const hp = unitHp(p, h); return `<div class="row spread"><b>${esc(unitOf(p, h).name)}</b><span class="mono">${hp != null ? `♥ ${hp}/${unitMaxHp(p, h)}` : ""} · úr. ${crawlLevel(p, h)} · ${h.xp || 0} XP${stBadges(h) ? " · " + stBadges(h) : ""}</span></div>`; }).join("")}</section>` : ""}
    ${loot ? `<section><div class="eyebrow">Poklady</div><button class="btn small" id="crLoot" ${t.piles[loot.id].length ? "" : "disabled"}>Hledat poklad (${t.piles[loot.id].length})</button><span class="hint"> karta jde do ruky hráče na tahu</span></section>` : ""}
    ${+p.crawl.doom ? `<section><div class="eyebrow">Hrozba</div><div class="track-bar"><span style="width:${Math.min(100, Math.round((t.doom || 0) / +p.crawl.doom * 100))}%"></span></div><div class="row spread"><span class="mono">${t.doom || 0} / ${p.crawl.doom}</span><span class="row"><button class="btn small" data-doom="-1" aria-label="Snížit hrozbu">−</button><button class="btn small" data-doom="1" aria-label="Zvýšit hrozbu">+</button></span></div><p class="hint">Roste každé kolo samo.</p></section>` : ""}
    ${p.crawl.rooms && rooms.length ? `<section><div class="eyebrow">Místnosti</div><p class="hint">Hrdina místnost odhalí vstupem. Místnosti jsou oblasti nakreslené v záložce Mapa.</p><div class="row">${rooms.map(n => `<button class="btn small ${rev.includes(n) ? "on" : ""}" data-room="${esc(n)}">${rev.includes(n) ? "✓ " : ""}${esc(n)}</button>`).join("")}</div></section>` : ""}`;
}
function wireCrawl(main, p, t, save) {
  const q = id => document.getElementById(id); const on = (sel, fn) => $$(sel, main).forEach(el => el.addEventListener("click", () => fn(el))); const sel = t.items.find(i => i.uid === S.sel); const cp = curPlayer(p, t);
  on("[data-hp]", el => { const r = damage(p, t, sel, -+el.dataset.hp); if (r) logEv(t, r); save(); render(); });
  on("[data-xp]", () => { sel.xp = (sel.xp || 0) + 1; save(); render(); });
  on("[data-crawlatt]", el => { const tg = t.items.find(i => i.uid === el.dataset.crawlatt); if (!gate(p, t, "boj")) return; const r = crawlAttack(p, t, sel, tg); save(); render(); toast(r); });
  if (q("crMon")) q("crMon").onclick = () => { S.crawlLog = monsterTurn(p, t); save(); render(); };
  if (q("crLoot")) q("crLoot").onclick = () => { const d = p.decks.find(x => x.id === p.crawl.lootDeck); const cId = t.piles[d.id].pop(); if (!cId || !cp) return; (t.hands[cp.id] = t.hands[cp.id] || []).push({ deckId: d.id, cardId: cId }); logEv(t, `${cp.name} nachází poklad`); save(); render(); toast("Poklad je v ruce: " + cp.name); };
  on("[data-doom]", el => { t.doom = Math.max(0, (t.doom || 0) + +el.dataset.doom); save(); render(); });
  on("[data-room]", el => { const n = el.dataset.room; t.revealed = t.revealed || []; if (t.revealed.includes(n)) t.revealed = t.revealed.filter(x => x !== n); else revealRoom(p, t, n, (cp || {}).id); save(); render(); });
}
function crawlMechHTML(p) {
  return `<div class="panel"><h2>Dungeon crawler</h2>
    <p class="hint">Jednotce v editoru nastav „Hrdina“ nebo „Příšera“, životy a zkušenosti za zabití. Kostky útoku a obrany používají nastavení kostkového boje výše.</p>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">
      <label class="f">XP na další úroveň<input type="number" id="crLvl" min="1" value="${+p.crawl.levelXp || 5}"></label>
      <label class="f">Hrozba – maximum (prázdné = bez)<input type="number" id="crDoom" min="0" value="${esc(p.crawl.doom)}"></label>
      <label class="f">Balíček pokladů<select id="crLootD"><option value="">–</option>${p.decks.map(d => `<option value="${d.id}" ${d.id === p.crawl.lootDeck ? "selected" : ""}>${esc(d.name)}</option>`).join("")}</select></label></div>
    <label class="chk"><input type="checkbox" id="crRooms" ${p.crawl.rooms ? "checked" : ""}> Místnosti jsou zakryté, dokud do nich nevstoupí hrdina (oblasti z mapy)</label>
    <p class="hint">Na odhalení místnosti a plnou hrozbu můžeš navázat automatická pravidla v Pravidlech („Odhalena místnost“, „Hrozba dosáhla maxima“). Hrdina za každou úroveň získá +1 život.</p></div>`;
}
function wireCrawlMech(main, p) {
  const ch = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener("change", () => { fn(el); touch(p); }); };
  ch("crLvl", e => { p.crawl.levelXp = Math.max(1, +e.value || 5); }); ch("crDoom", e => { p.crawl.doom = e.value; }); ch("crLootD", e => { p.crawl.lootDeck = e.value; }); ch("crRooms", e => { p.crawl.rooms = e.checked; });
}
