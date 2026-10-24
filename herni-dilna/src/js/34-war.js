// ---------- Wargames: provedení boje, zásobování, iniciativa, skrytý pohyb ----------
const unitOf = (p, i) => p.units.find(u => u.id === i.unitId);
const cellName = k => k.split(",").map(n => pad2(+n + 1)).join("");
// Ztráta kroku: zdravá jednotka s rubem se oslabí, jinak je zničena.
function stepLoss(p, t, it) {
  const u = unitOf(p, it); if (!u) return "";
  if (!it.reduced && hasReduced(u)) { it.reduced = true; return `${u.name} ztrácí krok`; }
  t.items = t.items.filter(x => x !== it); if (S.sel === it.uid) S.sel = null; return `${u.name} zničena`;
}
function placeOn(p, t, it, k) {
  const b = tableBoard(p); const [w, h] = itemSize(it); const [c, r] = k.split(",").map(Number); const [cx, cy] = geo(b).center(c, r);
  const stack = t.items.filter(o => o !== it && o.kind !== "card" && cellUnder(p, o) === k).length;
  it.x = Math.round(BX + cx - w / 2 + stack * 5); it.y = Math.round(BY + cy - h / 2 - stack * 5);
}
// Ústup o n polí: každý krok dál od nepřátel, na průchozí pole bez nepřítele.
function retreat(p, t, it, n = 1) {
  const b = tableBoard(p); const u = unitOf(p, it); let k = cellUnder(p, it); if (!b || !k) return stepLoss(p, t, it);
  for (let s = 0; s < n; s++) {
    const enemy = enemyCells(p, t, it); const [c, r] = k.split(",").map(Number);
    const dist = x => enemy.length ? Math.min(...enemy.map(e => hexDist(b, x, e))) : 0;
    const opts = neighbors(b, c, r).map(([x, y]) => x + "," + y).filter(x => { const ter = terrainOf(p, b, x) || p.terrains[0]; return !enemy.includes(x) && !(ter && !isFinite(parseFloat(ter.move))) && dist(x) > dist(k); });
    if (!opts.length) return `${u.name} nemá kam ustoupit – ` + stepLoss(p, t, it);
    k = opts.sort((a, b2) => dist(b2) - dist(a))[0];
  }
  placeOn(p, t, it, k); return `${u.name} ustupuje na ${cellName(k)}`;
}
// Provede výsledek z bojové tabulky na jednotky zapojené do boje.
function applyCombat(p, t, out) {
  const C = S.combat; const att = (C.attUids || []).map(id => t.items.find(i => i.uid === id)).filter(Boolean); const def = t.items.find(i => i.uid === C.defUid);
  const code = String(out || "").toUpperCase().trim(); const msgs = [];
  const m = code.match(/^([AD])(R|S)?(\d)?$/);
  if (code === "AE") att.forEach(i => msgs.push(stepLoss(p, t, Object.assign(i, { reduced: true }))));
  else if (code === "DE") { if (def) msgs.push(stepLoss(p, t, Object.assign(def, { reduced: true }))); }
  else if (code === "EX") { if (def) msgs.push(stepLoss(p, t, def)); if (att[0]) msgs.push(stepLoss(p, t, att[0])); }
  else if (code === "AR") att.forEach(i => msgs.push(retreat(p, t, i, 1)));
  else if (code === "DR") { if (def) msgs.push(retreat(p, t, def, 1)); }
  else if (m) { const tgt = m[1] === "A" ? att : (def ? [def] : []); const n = +(m[3] || 1);
    tgt.forEach(i => { for (let s = 0; s < n && t.items.includes(i); s++) msgs.push(m[2] === "R" ? retreat(p, t, i, 1) : stepLoss(p, t, i)); }); }
  else return "Výsledek nemá automatické provedení – posuň jednotky ručně";
  checkWin(p, t);
  return msgs.filter(Boolean).join(", ") || "Žádná změna";
}
// Zásobování: zdroje jsou velitelství (jednotka s volbou „zdroj zásobování“) a ovládaná pole s body.
function supplySet(p, t, fid) {
  const b = tableBoard(p); if (!b) return null; const R = +p.ruleset.supplyRange || 4;
  const src = t.items.filter(i => i.kind === "unit" && (unitOf(p, i) || {}).factionId === fid && (unitOf(p, i) || {}).hq).map(i => cellUnder(p, i)).filter(Boolean);
  Object.entries(t.control || {}).forEach(([k, f]) => { const ter = terrainOf(p, b, k); if (f === fid && ter && +ter.vp > 0) src.push(k); });
  const enemy = new Set(t.items.filter(i => i.kind === "unit" && unitOf(p, i) && unitOf(p, i).factionId !== fid).map(i => cellUnder(p, i)).filter(Boolean));
  const dist = {}; const q = []; src.forEach(k => { if (!enemy.has(k)) { dist[k] = 0; q.push(k); } });
  while (q.length) { const k = q.shift(); if (dist[k] >= R) continue; const [c, r] = k.split(",").map(Number);
    neighbors(b, c, r).forEach(([x, y]) => { const nk = x + "," + y; const ter = terrainOf(p, b, nk) || p.terrains[0]; if (dist[nk] != null || enemy.has(nk) || (ter && !isFinite(parseFloat(ter.move)))) return; dist[nk] = dist[k] + 1; q.push(nk); }); }
  return dist;
}
function inSupply(p, t, it) {
  if (!p.ruleset.supply) return true; const u = unitOf(p, it); const k = cellUnder(p, it); if (!u || !k) return true;
  const key = u.factionId; S.supCache = S.supCache || {}; if (!S.supCache[key]) S.supCache[key] = supplySet(p, t, key) || {};
  return S.supCache[key][k] != null;
}
function initiativeRoll(p, t) {
  const rolls = p.factions.map(f => ({ f, v: rnd(6) + (+f.initBonus || 0), tie: Math.random() }));
  rolls.sort((a, b) => b.v - a.v || b.tie - a.tie); t.order = rolls.map(r => r.f.id); t.curF = 0;
  const txt = rolls.map(r => `${r.f.name} ${r.v}`).join(", "); logEv(t, `iniciativa: ${txt}`); return txt;
}
// Skrytý pohyb: tahy skryté strany se zapisují do tajného záznamu, ukáže se jen v kolech odhalení.
const revealRound = (p, t) => String(p.hiddenReveal || "").split(/[,;\s]+/).map(Number).includes(+t.turn);
function hiddenFaction(p, fid) { const f = p.factions.find(x => x.id === fid); return !!(f && f.hidden); }
function hiddenMove(p, t, it, k) {
  const u = unitOf(p, it); (t.secret = t.secret || {})[u.factionId] = t.secret[u.factionId] || [];
  t.secret[u.factionId].push(`kolo ${t.turn}: ${u.name} → ${cellName(k)}`);
  if (revealRound(p, t)) { (t.lastSeen = t.lastSeen || {})[it.uid] = k; logEv(t, `${u.name} se ukazuje na ${cellName(k)}`); }
  else logEv(t, `${(p.factions.find(f => f.id === u.factionId) || {}).name || ""} táhne skrytě`);
}
function warPanelHTML(p, t) {
  const hasHidden = p.factions.some(f => f.hidden);
  const C = S.combat; const nA = (C.attUids || []).length;
  return `<section><div class="eyebrow">Zapojené jednotky</div>
      <p class="hint">${nA ? `Útočí ${nA} ${plural(nA, "jednotka", "jednotky", "jednotek")}` : "Útočník nevybrán"} · ${C.defUid ? "obránce vybrán" : "obránce nevybrán"}${p.ruleset.supply ? " · bez zásobování útočí polovinou síly" : ""}</p>
      ${C.res && (nA || C.defUid) ? `<button class="btn primary" id="wApply">Provést výsledek ${esc(C.res.out || "")}</button>` : ""}</section>
    <section><div class="eyebrow">Iniciativa</div><button class="btn small" id="wInit">Hodit na iniciativu</button><span class="hint"> určí pořadí tahu</span></section>
    <section><div class="eyebrow">Zásobování</div>
      <label class="chk"><input type="checkbox" id="wSup" ${p.ruleset.supply ? "checked" : ""}> Hlídat zásobovací linie</label>
      ${p.ruleset.supply ? `<label class="f" style="flex-direction:row;align-items:center;gap:8px">Dosah od zdroje<input type="number" id="wSupR" min="1" max="30" value="${+p.ruleset.supplyRange || 4}" style="width:70px"></label>
      <p class="hint">Zdroje: velitelství (volba u jednotky) a ovládaná pole s body. Jednotky mimo zásobování mají značku ⚠.</p>` : ""}</section>
    <section><div class="eyebrow">Skrytý pohyb</div>
      ${p.factions.map(f => `<label class="chk"><input type="checkbox" data-whid="${f.id}" ${f.hidden ? "checked" : ""}> ${esc(f.name)} se pohybuje skrytě</label>`).join("")}
      ${hasHidden ? `<label class="f">Kola odhalení<input type="text" id="wRev" value="${esc(p.hiddenReveal || "")}" placeholder="3, 8, 13, 18"></label>
      <p class="hint">Skryté jednotky vidí jen jejich strana (Pohled nahoře). Ostatní vidí poslední odhalenou pozici ❓.</p>
      ${p.factions.filter(f => f.hidden).map(f => `<button class="btn small" data-wsec="${f.id}">Tajný záznam: ${esc(f.name)}</button>`).join("")}` : ""}</section>`;
}
function wireWar(main, p, t, save) {
  const q = id => document.getElementById(id); const C = S.combat;
  if (q("wApply")) q("wApply").onclick = () => { const r = applyCombat(p, t, C.res.out); logEv(t, "boj: " + r); C.log.unshift(r); C.res = null; C.attUids = []; C.defUid = null; save(); render(); toast(r); };
  if (q("wInit")) q("wInit").onclick = () => { const r = initiativeRoll(p, t); save(); render(); toast("Iniciativa: " + r); };
  if (q("wSup")) q("wSup").onchange = e => { p.ruleset.supply = e.target.checked; touch(p); render(); };
  if (q("wSupR")) q("wSupR").onchange = e => { p.ruleset.supplyRange = +e.target.value || 4; touch(p); render(); };
  if (q("wRev")) q("wRev").onchange = e => { p.hiddenReveal = e.target.value; touch(p); };
  $$("[data-whid]", main).forEach(el => el.onchange = () => { const f = p.factions.find(x => x.id === el.dataset.whid); f.hidden = el.checked; touch(p); render(); });
  $$("[data-wsec]", main).forEach(el => el.onclick = () => { const f = p.factions.find(x => x.id === el.dataset.wsec);
    openDialog(`<h2>Tajný záznam – ${esc(f.name)}</h2><p class="hint">Ukaž jen hráči této strany.</p><div class="log">${((t.secret || {})[f.id] || []).map(l => `<span>${esc(l)}</span>`).join("") || "<span>Zatím žádný tah.</span>"}</div><div class="row" style="justify-content:flex-end"><button class="btn" data-close>Zavřít</button></div>`); });
}
