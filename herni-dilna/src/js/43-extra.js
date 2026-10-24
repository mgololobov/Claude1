// ---------- Další mechaniky: vyčerpání karet, příjem z vyložených karet, odpočet času, rozsévání (mancala) ----------
function normalizeExtra(p) {
  p.mancala = Object.assign({ on: false, pits: 6, seeds: 4, capture: true, extra: true }, p.mancala || {});
  if (p.refreshExhaust == null) p.refreshExhaust = true;
  return p;
}
// Na začátku kola: příjem z vyložených karet a obnovení vyčerpaných karet.
function extraRound(p, t) {
  p.factions.forEach(f => (t.tableau[f.id] || []).forEach(h => { const c = cardOf(p, h).c; if (c && c.income) runEffects(p, t, f.id, c.income, c.title + " (příjem)"); if (p.refreshExhaust) h.ex = false; }));
}
function useCard(p, t, fid, idx) {
  const h = (t.tableau[fid] || [])[idx]; if (!h || h.ex) return false; const c = cardOf(p, h).c; h.ex = true;
  logEv(t, `${fname(p, fid)} vyčerpává ${c.title}`); if (c.act) runEffects(p, t, fid, c.act, c.title); return true;
}
// Tlačítka u vyložené karty: použít (vyčerpat) nebo obnovit.
function tabCardBtns(p, t, fid, i) {
  const h = (t.tableau[fid] || [])[i]; const c = h && cardOf(p, h).c; if (!c) return "";
  if (h.ex) return `<button class="btn small" data-tabex="${i}">↻ Obnovit</button>`;
  return c.act ? `<button class="btn small primary" data-tabuse="${i}" title="${esc(describeEffect(c.act))}">Použít</button>` : `<button class="btn small" data-tabex="${i}">Vyčerpat</button>`;
}
// Odpočet (přesýpací hodiny) pro hry na čas.
function countdownHTML() {
  const left = S.cdEnd ? Math.max(0, Math.ceil((S.cdEnd - Date.now()) / 1000)) : null;
  return `<section><div class="eyebrow">Přesýpací hodiny</div><div class="row spread"><span class="turnbig mono" id="cdOut">${left == null ? "–" : fmtClock(left * 1000)}</span>
    <span class="row"><input type="number" id="cdSec" min="5" max="3600" value="${S.cdSec || 60}" style="width:76px" aria-label="Sekund"><button class="btn small primary" id="cdStart">${S.cdEnd ? "Znovu" : "Start"}</button>${S.cdEnd ? `<button class="btn small" id="cdStop">Stop</button>` : ""}</span></div></section>`;
}
function beep() { try { const a = new (window.AudioContext || window.webkitAudioContext)(); const o = a.createOscillator(); o.frequency.value = 880; o.connect(a.destination); o.start(); setTimeout(() => { o.stop(); a.close(); }, 450); } catch {} if (navigator.vibrate) navigator.vibrate(300); }
onInit(() => setInterval(() => { if (!S.cdEnd) return; const left = Math.max(0, Math.ceil((S.cdEnd - Date.now()) / 1000)); const el = document.getElementById("cdOut"); if (el) el.textContent = fmtClock(left * 1000);
  if (!left) { S.cdEnd = null; toast("Čas vypršel!"); beep(); const p = P(); if (p && p.table) logEv(p.table, "čas vypršel"); } }, 250));
// Rozsévání (Kalah): dva hráči, každý má řadu jamek a sklad. Semínka z jamky se rozdělí po jednom dál po kruhu.
function mancalaInit(p, t) { const n = Math.max(2, Math.min(10, +p.mancala.pits || 6)); t.mancala = { pits: Array(2 * n).fill(Math.max(1, +p.mancala.seeds || 4)), store: [0, 0], over: false }; }
function mancalaSow(p, t, side, idx) {
  const M = t.mancala; const n = M.pits.length / 2; const own = side * n + idx; let seeds = M.pits[own]; if (!seeds || M.over) return null; M.pits[own] = 0;
  // kruh: jamky 0..n-1, sklad 0, jamky n..2n-1, sklad 1; soupeřův sklad se přeskakuje
  const ring = []; for (let i = 0; i < n; i++) ring.push(["p", i]); ring.push(["s", 0]); for (let i = n; i < 2 * n; i++) ring.push(["p", i]); ring.push(["s", 1]);
  let pos = ring.findIndex(x => x[0] === "p" && x[1] === own); let last = null;
  while (seeds) { pos = (pos + 1) % ring.length; const r = ring[pos]; if (r[0] === "s" && r[1] !== side) continue; if (r[0] === "s") M.store[side]++; else M.pits[r[1]]++; seeds--; last = r; }
  let again = false, took = 0;
  if (last[0] === "s" && p.mancala.extra) again = true;
  else if (last[0] === "p" && p.mancala.capture && Math.floor(last[1] / n) === side && M.pits[last[1]] === 1) { const opp = 2 * n - 1 - last[1]; if (M.pits[opp]) { took = M.pits[opp] + 1; M.store[side] += took; M.pits[opp] = 0; M.pits[last[1]] = 0; } }
  const empty = s => M.pits.slice(s * n, s * n + n).every(v => !v);
  if (empty(0) || empty(1)) { [0, 1].forEach(s => { M.store[s] += M.pits.slice(s * n, s * n + n).reduce((a, v) => a + v, 0); for (let i = s * n; i < s * n + n; i++) M.pits[i] = 0; }); M.over = true; }
  return { again, took };
}
function sideMancala(p, t) {
  const pl = p.factions.slice(0, 2); if (pl.length < 2) return `<p class="hint">Rozsévání je pro dva hráče – vytvoř v Mechanikách dvě strany.</p>`;
  const M = t.mancala; const cp = curPlayer(p, t); const side = cp ? Math.max(0, pl.findIndex(f => f.id === cp.id)) : 0;
  if (!M) return `<section><div class="eyebrow">Rozsévání (mancala)</div><p class="hint">Každý hráč má ${p.mancala.pits} jamek po ${p.mancala.seeds} semínkách a svůj sklad.</p><button class="btn primary" id="mcStart">Rozdat semínka</button></section>`;
  const n = M.pits.length / 2; const pit = i => { const s = Math.floor(i / n); return `<button class="pit" data-pit="${i}" ${M.over || s !== side || !M.pits[i] ? "disabled" : ""} style="--c:${pl[s].color}">${M.pits[i]}</button>`; };
  return `<section><div class="eyebrow">Rozsévání${M.over ? " · konec" : cp ? " · hraje " + esc(cp.name) : ""}</div>
      <div class="mancala"><div class="store" style="--c:${pl[1].color}">${M.store[1]}</div>
        <div class="rows"><div class="prow">${Array.from({ length: n }, (_, k) => pit(2 * n - 1 - k)).join("")}</div><div class="prow">${Array.from({ length: n }, (_, k) => pit(k)).join("")}</div></div>
        <div class="store" style="--c:${pl[0].color}">${M.store[0]}</div></div>
      <p class="hint">Klepni na svou jamku: semínka se rozdělí po jednom proti směru hodinových ručiček.${p.mancala.extra ? " Poslední do vlastního skladu = hraješ znovu." : ""}${p.mancala.capture ? " Poslední do vlastní prázdné jamky bere i semínka naproti." : ""}</p>
      ${M.over ? `<div class="result"><span>Konec hry</span><b>${esc(pl[0].name)} ${M.store[0]} : ${M.store[1]} ${esc(pl[1].name)}</b></div>` : ""}
      <button class="btn small" id="mcStart">Nová hra</button></section>`;
}
function wireExtra2(main, p, t, save) {
  const q = id => document.getElementById(id); const on = (sel, fn) => $$(sel, main).forEach(el => el.addEventListener("click", () => fn(el)));
  on("[data-tabuse]", el => { if (useCard(p, t, S.plF, +el.dataset.tabuse)) { save(); render(); } });
  on("[data-tabex]", el => { const h = t.tableau[S.plF][+el.dataset.tabex]; h.ex = !h.ex; save(); render(); });
  if (q("cdStart")) q("cdStart").onclick = () => { S.cdSec = Math.max(5, +q("cdSec").value || 60); S.cdEnd = Date.now() + S.cdSec * 1000; render(); };
  if (q("cdStop")) q("cdStop").onclick = () => { S.cdEnd = null; render(); };
  if (q("mcStart")) q("mcStart").onclick = () => { mancalaInit(p, t); save(); render(); };
  on("[data-pit]", el => { const pl = p.factions.slice(0, 2); const cp = curPlayer(p, t); const side = pl.findIndex(f => f.id === cp.id); const n = t.mancala.pits.length / 2; const i = +el.dataset.pit;
    const r = mancalaSow(p, t, side, i - side * n); if (!r) return; logEv(t, `${cp.name} rozsévá z jamky ${i - side * n + 1}${r.took ? `, bere ${r.took}` : ""}`);
    if (t.mancala.over) { const s = t.mancala.store; if (s[0] !== s[1]) declareWinner(p, t, pl[s[0] > s[1] ? 0 : 1].id, `${Math.max(...s)} semínek ve skladu`); else logEv(t, "rozsévání: remíza"); }
    else if (!r.again) { const pls = players(p, t); t.curF = (t.curF + 1) % pls.length; } else toast(`${cp.name} hraje znovu`);
    save(); render(); });
}
function extraMechHTML(p) {
  return `<div class="panel"><h2>Vyložené karty a čas</h2>
    <label class="chk"><input type="checkbox" id="exRef" ${p.refreshExhaust ? "checked" : ""}> Vyčerpané karty se na začátku kola samy obnoví</label>
    <p class="hint">Kartě nastav v editoru „Příjem každé kolo“ (motor jako v Terraformaci Marsu) nebo „Aktivace vyčerpáním“ (schopnost jednou za kolo). Přesýpací hodiny najdeš na stole v nástroji Kolo.</p>
    <h2 style="margin-top:14px">Rozsévání (mancala)</h2>
    <label class="chk"><input type="checkbox" id="mcOn" ${p.mancala.on ? "checked" : ""}> Hra pro dva s jamkami a semínky (Kalah)</label>
    <div class="grid" style="grid-template-columns:1fr 1fr"><label class="f">Jamek na hráče<input type="number" id="mcPits" min="2" max="10" value="${+p.mancala.pits || 6}"></label><label class="f">Semínek v jamce<input type="number" id="mcSeeds" min="1" max="12" value="${+p.mancala.seeds || 4}"></label></div>
    <label class="chk"><input type="checkbox" id="mcExtra" ${p.mancala.extra ? "checked" : ""}> Poslední semínko ve vlastním skladu = tah navíc</label>
    <label class="chk"><input type="checkbox" id="mcCap" ${p.mancala.capture ? "checked" : ""}> Braní z protější jamky</label></div>`;
}
function wireExtraMech(main, p) {
  const ch = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener("change", () => { fn(el); touch(p); }); };
  ch("exRef", e => { p.refreshExhaust = e.checked; }); ch("mcOn", e => { p.mancala.on = e.checked; }); ch("mcPits", e => { p.mancala.pits = Math.max(2, Math.min(10, +e.value || 6)); });
  ch("mcSeeds", e => { p.mancala.seeds = Math.max(1, +e.value || 4); }); ch("mcExtra", e => { p.mancala.extra = e.checked; }); ch("mcCap", e => { p.mancala.capture = e.checked; });
}
