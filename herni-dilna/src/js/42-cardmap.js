// ---------- Mapa z karet lokací (Warfighter a podobné) ----------
// Lokace jsou karty vyložené v řadě (hadovitě) nebo v mřížce. Jednotky stojí na kartách, pohyb na sousední kartu
// stojí akce podle karty, nová lokace se při vstupu odhalí a objeví se na ní nepřátelé. Cílová karta ukončí hru.
function normalizeCmap(p) {
  p.cmap = Object.assign({ on: false, deckId: "", layout: "row", length: 5, perRow: 6, cols: 3, rows: 3, diag: false, apRes: "", winOnReach: true, enemyMove: true, revealAdj: false }, p.cmap || {});
  return p;
}
const CM = { W: 170, H: 238, GX: 22, GY: 46, X0: 40, Y0: 40 };
function cmapOn(p, t) { return !!(p.cmap && p.cmap.on && t && t.cmap && t.cmap.cards.length); }
// Pozice karty i: v řadě hadovitě po perRow kartách, v mřížce po sloupcích cols.
function cmapCell(p, i) {
  if (p.cmap.layout === "grid") { const cols = Math.max(1, +p.cmap.cols || 3); return [i % cols, Math.floor(i / cols)]; }
  const per = Math.max(2, +p.cmap.perRow || 6); const row = Math.floor(i / per); const col = row % 2 ? per - 1 - (i % per) : i % per; return [col, row];
}
function cmapBox(p, i) { const [c, r] = cmapCell(p, i); return { x: CM.X0 + c * (CM.W + CM.GX), y: CM.Y0 + r * (CM.H + CM.GY) }; }
function cmapDist(p, i, j) {
  if (i == null || j == null) return Infinity; if (p.cmap.layout !== "grid") return Math.abs(i - j);
  const [a, b] = cmapCell(p, i), [c, d] = cmapCell(p, j); return p.cmap.diag ? Math.max(Math.abs(a - c), Math.abs(b - d)) : Math.abs(a - c) + Math.abs(b - d);
}
function cmapIndexOf(p, t, it) {
  if (!cmapOn(p, t)) return null; const [w, h] = itemSize(it); const cx = it.x + w / 2, cy = it.y + h / 2;
  const i = t.cmap.cards.findIndex((_, k) => { const b = cmapBox(p, k); return cx >= b.x - 8 && cx <= b.x + CM.W + 8 && cy >= b.y - 8 && cy <= b.y + CM.H + 30; }); return i < 0 ? null : i;
}
function cmapCard(p, t, i) { const e = t.cmap && t.cmap.cards[i]; return e ? cardOf(p, e).c : null; }
function placeInCard(p, t, it, idx) {
  const b = cmapBox(p, idx); const others = t.items.filter(o => o !== it && o.kind !== "card" && cmapIndexOf(p, t, o) === idx).length;
  it.x = b.x + 6 + (others % 3) * 54; it.y = b.y + 112 + Math.floor(others / 3) * 58;
}
function buildCmap(p, t) {
  const d = p.decks.find(x => x.id === p.cmap.deckId); if (!d) return "Vyber balíček lokací";
  const goal = d.cards.find(c => /^cíl/i.test(c.type || "")); const pool = shuffle(d.cards.filter(c => c !== goal).flatMap(c => Array.from({ length: Math.max(0, +c.qty || 0) }, () => c.id)));
  const n = p.cmap.layout === "grid" ? Math.max(2, (+p.cmap.cols || 3) * (+p.cmap.rows || 3)) : Math.max(2, +p.cmap.length || 5);
  const ids = pool.slice(0, goal ? n - 1 : n); if (goal) ids.push(goal.id); if (ids.length < 2) return "Balíček lokací má málo karet";
  t.cmap = { cards: ids.map((cardId, i) => ({ deckId: d.id, cardId, rev: i === 0 })) };
  if (!t.items.some(i => i.kind === "unit" && !isMonster(p, i))) p.units.filter(u => u.kind === "hero").forEach(u => t.items.push({ uid: uid(), kind: "unit", unitId: u.id, x: 0, y: 0, reduced: false, rot: 0 }));
  t.items.filter(i => i.kind === "unit" && !isMonster(p, i)).forEach(i => placeInCard(p, t, i, 0));
  if (p.cmap.revealAdj) cmapRevealAround(p, t, 0, null);
  logEv(t, `vyložena mapa z ${ids.length} karet lokací`); return "";
}
function cmapReveal(p, t, idx, fid) {
  const e = t.cmap.cards[idx]; if (!e || e.rev) return false; e.rev = true; const c = cmapCard(p, t, idx);
  const mons = p.units.filter(u => u.kind === "monster"); const n = Math.max(0, +c.spawn || 0);
  for (let k = 0; k < n && mons.length; k++) { const u = mons[Math.floor(Math.random() * mons.length)]; const it = { uid: uid(), kind: "unit", unitId: u.id, x: 0, y: 0, reduced: false, rot: 0 }; t.items.push(it); placeInCard(p, t, it, idx); }
  logEv(t, `odhalena lokace ${c.title}${n ? ` – ${n} ${plural(n, "nepřítel", "nepřátelé", "nepřátel")}` : ""}`); fireTriggers(p, t, "lokace", fid, c.title); return true;
}
function cmapRevealAround(p, t, idx, fid) { t.cmap.cards.forEach((_, j) => { if (cmapDist(p, idx, j) === 1) cmapReveal(p, t, j, fid); }); }
// Pohyb jednotky na kartu: sousední karta, cena akcí, odhalení, cíl.
function cmapMove(p, t, it, from) {
  const to = cmapIndexOf(p, t, it); const u = unitOf(p, it);
  if (to == null) { toast("Polož jednotku na kartu lokace"); return false; }
  if (from == null || to === from) { placeInCard(p, t, it, to); return true; }
  const c = cmapCard(p, t, to); const cost = Math.max(0, parseInt(c.move, 10) || 1); const msgs = [];
  if (cmapDist(p, from, to) > 1) msgs.push("lze táhnout jen na sousední kartu");
  msgs.push(...actViolation(p, it));
  const ar = p.resources.find(r => r.id === p.cmap.apRes); const have = ar ? ((t.res[u.factionId] || {})[ar.id] || 0) : Infinity;
  if (ar && have < cost) msgs.push(`vstup stojí ${cost} × ${ar.name}, ${fname(p, u.factionId)} má ${have}`);
  if (msgs.length && !gate(p, t, "pohyb", msgs)) return false;
  if (ar) t.res[u.factionId][ar.id] = Math.max(0, have - cost);
  placeInCard(p, t, it, to); logEv(t, `${u.name} jde do lokace ${c.title}${ar ? ` (−${cost} ${ar.name})` : ""}`);
  if (!isMonster(p, it)) { cmapReveal(p, t, to, u.factionId); if (p.cmap.revealAdj) cmapRevealAround(p, t, to, u.factionId); }
  if (to === t.cmap.cards.length - 1 && p.cmap.winOnReach && !isMonster(p, it)) declareWinner(p, t, u.factionId, `${u.name} dosáhl cíle ${c.title}`);
  return true;
}
function coverOf(p, t, it) { const i = cmapIndexOf(p, t, it); const c = i == null ? null : cmapCard(p, t, i); return c ? (+c.cover || 0) : 0; }
// Nepřátelé: zaútočí, když mají koho v dosahu, jinak jdou o kartu blíž k nejbližšímu vojákovi.
function cmapMonsterTurn(p, t) {
  const out = [];
  t.items.filter(i => isMonster(p, i)).forEach(m => {
    if (!t.items.includes(m)) return; if (m.st && m.st.stun) { m.st.stun = false; out.push(`${unitOf(p, m).name} je omráčený`); return; }
    let tg = targetsOf(p, t, m)[0];
    if (!tg && p.cmap.enemyMove) { const i0 = cmapIndexOf(p, t, m); const heroes = t.items.filter(i => i.kind === "unit" && !isMonster(p, i) && cmapIndexOf(p, t, i) != null); if (!heroes.length) return;
      const near = j => Math.min(...heroes.map(h => cmapDist(p, j, cmapIndexOf(p, t, h))));
      const best = t.cmap.cards.map((_, j) => j).filter(j => cmapDist(p, i0, j) === 1).sort((a, b) => near(a) - near(b))[0];
      if (best != null && near(best) < near(i0)) { placeInCard(p, t, m, best); out.push(`${unitOf(p, m).name} postupuje do lokace ${cmapCard(p, t, best).title}`); }
      tg = targetsOf(p, t, m)[0]; }
    if (tg) out.push(crawlAttack(p, t, m, tg));
  });
  if (!out.length) out.push("Žádný nepřítel nejedná"); logEv(t, "tah nepřátel"); return out;
}
function cmapHTML(p, t) {
  if (!cmapOn(p, t)) return ""; const last = t.cmap.cards.length - 1;
  return t.cmap.cards.map((e, i) => { const { d, c } = cardOf(p, e); if (!c) return ""; const b = cmapBox(p, i);
    return `<div class="cmloc ${e.rev ? "" : "hid"}" style="left:${b.x}px;top:${b.y}px;width:${CM.W}px"><div class="cmcard">${cardHTML(c, d, e.rev)}</div>
      <div class="cmmeta"><span class="mono">${i + 1}${i === last ? " · CÍL" : i === 0 ? " · START" : ""}</span>${e.rev ? `<span>pohyb ${parseInt(c.move, 10) || 1}${+c.cover ? ` · krytí ${c.cover}` : ""}</span>` : ""}</div></div>`; }).join("");
}
function cmapMatSize(p, t) { if (!cmapOn(p, t)) return [0, 0]; let w = 0, h = 0; t.cmap.cards.forEach((_, i) => { const b = cmapBox(p, i); w = Math.max(w, b.x + CM.W + 60); h = Math.max(h, b.y + CM.H + 120); }); return [w, h]; }
function sideCmap(p, t) {
  const d = p.decks.find(x => x.id === p.cmap.deckId); const ar = p.resources.find(r => r.id === p.cmap.apRes);
  return `<section><div class="eyebrow">Mapa z karet lokací</div>
      ${!p.cmap.on ? `<p class="hint">Zapni a nastav ji v Mechanikách (balíček lokací, řada nebo mřížka).</p>` : !d ? `<p class="hint">V Mechanikách vyber balíček lokací.</p>` : `
      <p class="hint">${p.cmap.layout === "grid" ? `Mřížka ${p.cmap.cols} × ${p.cmap.rows}${p.cmap.diag ? ", pohyb i úhlopříčně" : ""}` : `Řada ${p.cmap.length} karet`} z balíčku ${esc(d.name)}. Karta typu „Cíl“ je vždy poslední.</p>
      <button class="btn primary" id="cmBuild">${cmapOn(p, t) ? "Vyložit novou mapu" : "Vyložit mapu"}</button>`}</section>
    ${cmapOn(p, t) ? `<section><div class="eyebrow">Hra</div>
      <p class="hint">Jednotku přetáhni na sousední kartu.${ar ? ` Vstup stojí tolik ${esc(ar.name)}, kolik má karta pohyb.` : ""} Nová lokace se odhalí a objeví se na ní nepřátelé. Krytí karty přidá obránci kostky obrany. Na stejnou kartu se útočí s dostřelem 0, na sousední s dostřelem 1.</p>
      <button class="btn" id="cmMon">Tah nepřátel</button>
      ${S.cmLog ? `<div class="log">${S.cmLog.map(l => `<span>${esc(l)}</span>`).join("")}</div>` : ""}</section>` : ""}`;
}
function wireCmap(main, p, t, save) {
  const q = id => document.getElementById(id);
  if (q("cmBuild")) q("cmBuild").onclick = () => { const err = buildCmap(p, t); if (err) { toast(err); return; } S.cmLog = null; save(); render(); };
  if (q("cmMon")) q("cmMon").onclick = () => { S.cmLog = cmapMonsterTurn(p, t); save(); render(); };
}
function cmapMechHTML(p) {
  const C = p.cmap;
  return `<div class="panel"><h2>Mapa z karet lokací</h2>
    <label class="chk"><input type="checkbox" id="cmOn" ${C.on ? "checked" : ""}> Hrací plocha je poskládaná z karet lokací (Warfighter)</label>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
      <label class="f">Balíček lokací<select id="cmDeck"><option value="">–</option>${p.decks.map(d => `<option value="${d.id}" ${d.id === C.deckId ? "selected" : ""}>${esc(d.name)}</option>`).join("")}</select></label>
      <label class="f">Rozložení<select id="cmLay"><option value="row" ${C.layout !== "grid" ? "selected" : ""}>Řada (cesta k cíli)</option><option value="grid" ${C.layout === "grid" ? "selected" : ""}>Mřížka</option></select></label>
      ${C.layout === "grid" ? `<label class="f">Sloupců<input type="number" id="cmCols" min="2" max="8" value="${+C.cols || 3}"></label><label class="f">Řad<input type="number" id="cmRows" min="1" max="6" value="${+C.rows || 3}"></label>`
        : `<label class="f">Karet v řadě<input type="number" id="cmLen" min="2" max="24" value="${+C.length || 5}"></label><label class="f">Zalomit po<input type="number" id="cmPer" min="2" max="8" value="${+C.perRow || 6}"></label>`}
      <label class="f">Pohyb platí zdrojem<select id="cmAp"><option value="">nic – jen hlídat sousedství</option>${p.resources.map(r => `<option value="${r.id}" ${r.id === C.apRes ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</select></label></div>
    ${C.layout === "grid" ? `<label class="chk"><input type="checkbox" id="cmDiag" ${C.diag ? "checked" : ""}> Pohyb a dostřel i úhlopříčně</label>` : ""}
    <label class="chk"><input type="checkbox" id="cmAdj" ${C.revealAdj ? "checked" : ""}> Odhalovat i sousední karty (vidět dopředu)</label>
    <label class="chk"><input type="checkbox" id="cmWin" ${C.winOnReach ? "checked" : ""}> Kdo dojde na cílovou kartu, vyhrává</label>
    <label class="chk"><input type="checkbox" id="cmEm" ${C.enemyMove ? "checked" : ""}> Nepřátelé postupují k vojákům</label>
    <p class="hint">Kartě lokace nastav v editoru Pohyb (cena vstupu), Krytí (kostky obrany navíc) a Nepřátel (kolik se jich objeví při odhalení). Nepřátelé jsou jednotky typu Příšera. Cílová karta má typ „Cíl“.</p></div>`;
}
function wireCmapMech(main, p) {
  const ch = (id, fn, re) => { const el = document.getElementById(id); if (el) el.addEventListener("change", () => { fn(el); touch(p); if (re) render(); }); };
  ch("cmOn", e => { p.cmap.on = e.checked; }); ch("cmDeck", e => { p.cmap.deckId = e.value; }); ch("cmLay", e => { p.cmap.layout = e.value; }, true);
  ch("cmCols", e => { p.cmap.cols = Math.max(2, +e.value || 3); }); ch("cmRows", e => { p.cmap.rows = Math.max(1, +e.value || 3); }); ch("cmLen", e => { p.cmap.length = Math.max(2, +e.value || 5); }); ch("cmPer", e => { p.cmap.perRow = Math.max(2, +e.value || 6); });
  ch("cmAp", e => { p.cmap.apRes = e.value; }); ch("cmDiag", e => { p.cmap.diag = e.checked; }); ch("cmAdj", e => { p.cmap.revealAdj = e.checked; }); ch("cmWin", e => { p.cmap.winOnReach = e.checked; }); ch("cmEm", e => { p.cmap.enemyMove = e.checked; });
}
