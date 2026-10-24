// ---------- Logické a abstraktní hry: kameny na mapě a lámání kódu ----------
function normalizeLogic(p) {
  p.stones = Object.assign({ on: false, win: "row", rowN: 5, capture: "", gravity: false }, p.stones || {});
  p.code = Object.assign({ on: false, len: 4, symbols: "🔴,🟡,🟢,🔵,🟣,🟠", dup: true, tries: 10 }, p.code || {});
  return p;
}
// Směry: čtverec 8 směrů (s úhlopříčkami), hex 6 sousedů. Krok ve směru i z pole k.
function stoneDirs(b) { return b.type === "square" ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]] : [0, 1, 2, 3, 4, 5]; }
function stepDir(b, k, d) {
  const [c, r] = k.split(",").map(Number); const [x, y] = b.type === "square" ? [c + d[0], r + d[1]] : dirNeighbor(b, c, r, d);
  return x >= 0 && y >= 0 && x < b.cols && y < b.rows ? x + "," + y : null;
}
// Kam kámen dopadne: s gravitací do nejnižšího volného pole sloupce.
function stoneTarget(p, t, b, k) {
  const st = t.stones || {}; if (st[k] && !p.stones.gravity) return null;
  if (!p.stones.gravity) return k; const c = +k.split(",")[0]; for (let r = b.rows - 1; r >= 0; r--) if (!st[c + "," + r]) return c + "," + r; return null;
}
function flipsFor(p, t, b, k, fid) {
  const st = t.stones || {}; const out = [];
  stoneDirs(b).forEach(d => { const line = []; let x = stepDir(b, k, d); while (x && st[x] && st[x] !== fid) { line.push(x); x = stepDir(b, x, d); } if (x && st[x] === fid && line.length) out.push(...line); });
  return out;
}
function placeStone(p, t, k0, fid) {
  const b = tableBoard(p); if (!b) return { err: "Kameny potřebují mapu" }; t.stones = t.stones || {};
  const k = stoneTarget(p, t, b, k0); if (!k) return { err: p.stones.gravity ? "Sloupec je plný" : "Pole je obsazené" };
  const flips = p.stones.capture === "flip" ? flipsFor(p, t, b, k, fid) : [];
  if (p.stones.capture === "flip" && !flips.length && Object.keys(t.stones).length >= 4) return { err: "Tah musí otočit aspoň jeden kámen soupeře" };
  t.stones[k] = fid; flips.forEach(x => { t.stones[x] = fid; }); const msgs = [];
  if (flips.length) msgs.push(`otáčí ${flips.length}`);
  if (p.stones.capture === "sandwich") { const caught = []; (b.type === "square" ? stoneDirs(b).slice(0, 4) : stoneDirs(b)).forEach(d => { const n = stepDir(b, k, d); const n2 = n && stepDir(b, n, d); if (n && n2 && t.stones[n] && t.stones[n] !== fid && t.stones[n2] === fid) caught.push(n); });
    caught.forEach(x => delete t.stones[x]); if (caught.length) msgs.push(`bere ${caught.length}`); }
  logEv(t, `${fname(p, fid)} pokládá kámen na ${cellName(k)}${msgs.length ? " (" + msgs.join(", ") + ")" : ""}`);
  const w = stoneWinner(p, t, b); if (w) declareWinner(p, t, w.fid, w.why);
  return { k, flips: flips.length };
}
function stoneWinner(p, t, b) {
  const st = t.stones || {}; const S2 = p.stones;
  if (S2.win === "row") { const N = Math.max(3, +S2.rowN || 5); const axes = b.type === "square" ? [[1, 0], [0, 1], [1, 1], [1, -1]] : [0, 1, 2];
    for (const [k, fid] of Object.entries(st)) for (const d of axes) { let n = 1, x = stepDir(b, k, d); while (x && st[x] === fid) { n++; x = stepDir(b, x, d); } if (n >= N) return { fid, why: `${N} kamenů v řadě` }; } }
  if (S2.win === "connect") { const pl = p.factions.slice(0, 2);
    for (let i = 0; i < pl.length; i++) { const fid = pl[i].id; const start = Object.keys(st).filter(k => st[k] === fid && (i === 0 ? +k.split(",")[0] === 0 : +k.split(",")[1] === 0)); const seen = new Set(start); const q = [...start];
      while (q.length) { const k = q.shift(); const [c, r] = k.split(",").map(Number); if (i === 0 ? c === b.cols - 1 : r === b.rows - 1) return { fid, why: i === 0 ? "propojil levý a pravý okraj" : "propojil horní a dolní okraj" };
        neighbors(b, c, r).forEach(([x, y]) => { const n = x + "," + y; if (st[n] === fid && !seen.has(n)) { seen.add(n); q.push(n); } }); } } }
  if (S2.win === "count" && Object.keys(st).length >= b.cols * b.rows) { const cnt = p.factions.map(f => ({ f, n: Object.values(st).filter(x => x === f.id).length })).sort((a, c) => c.n - a.n); if (cnt[0] && (!cnt[1] || cnt[0].n > cnt[1].n)) return { fid: cnt[0].f.id, why: `nejvíc kamenů (${cnt[0].n})` }; }
  return null;
}
const STONE_WIN = { row: "N kamenů v řadě (piškvorky, čtyři v řadě)", connect: "Propojit protilehlé okraje (Hex)", count: "Nejvíc kamenů při plné desce (Reversi)", "": "Bez automatického cíle" };
const STONE_CAP = { "": "Bez braní", sandwich: "Sevření – kámen mezi dvěma soupeřovými se bere", flip: "Otáčení řad soupeře (Reversi)" };
function sideStones(p, t) {
  const b = tableBoard(p); const cp = curPlayer(p, t); const cnt = p.factions.map(f => ({ f, n: Object.values(t.stones || {}).filter(x => x === f.id).length }));
  if (!b) return `<p class="hint">Kameny se kladou na mapu. Vyber ji v nástroji Komponenty.</p>`;
  return `<section><div class="eyebrow">Kameny</div>${fchipsHTML(p, t)}
      <button class="btn ${S.stoneMode ? "on" : ""}" id="stMode">${S.stoneMode ? "Klepni na pole mapy" : "Pokládat kameny"}</button>
      <p class="hint">${esc(STONE_WIN[p.stones.win] || "")}${p.stones.win === "row" ? ` – ${p.stones.rowN}` : ""} · ${esc(STONE_CAP[p.stones.capture] || "")}${p.stones.gravity ? " · kámen padá dolů (gravitace)" : ""}. Po položení je na tahu další hráč.</p></section>
    <section><div class="eyebrow">Počet kamenů</div>${cnt.map(x => `<div class="row spread"><span class="row"><span class="dot" style="background:${x.f.color};border-radius:50%"></span>${esc(x.f.name)}</span><b class="mono">${x.n}</b></div>`).join("")}
      <div class="row"><button class="btn small" id="stPass">Pas</button><button class="btn small danger" id="stClear">Vyčistit desku</button></div>${cp ? `<p class="hint">Na tahu: ${esc(cp.name)}</p>` : ""}</section>`;
}
// Lámání kódu (Mastermind): černá = správný symbol na správném místě, bílá = správný symbol jinde.
const codeSymbols = p => String(p.code.symbols || "").split(",").map(s => s.trim()).filter(Boolean);
function newCode(p) { const sy = codeSymbols(p); const n = Math.max(1, Math.min(8, +p.code.len || 4)); const pool = [...sy]; return Array.from({ length: n }, () => p.code.dup || !pool.length ? sy[Math.floor(Math.random() * sy.length)] : pool.splice(Math.floor(Math.random() * pool.length), 1)[0]); }
function scoreGuess(code, guess) {
  let black = 0; const rc = [], rg = []; code.forEach((c, i) => { if (guess[i] === c) black++; else { rc.push(c); rg.push(guess[i]); } });
  let white = 0; rg.forEach(g => { const j = rc.indexOf(g); if (j >= 0) { white++; rc.splice(j, 1); } }); return { black, white };
}
function sideCode(p, t) {
  const C = t.code; const sy = codeSymbols(p); const n = +p.code.len || 4; const g = S.guess || [];
  return `<section><div class="eyebrow">Lámání kódu</div>
      <p class="hint">Tajný kód má ${n} ${plural(n, "symbol", "symboly", "symbolů")}${p.code.dup ? " (mohou se opakovat)" : ""}. ● správný symbol na správném místě, ○ správný symbol jinde. Pokusů: ${p.code.tries}.</p>
      <div class="row"><button class="btn small primary" id="cdNew">Nový náhodný kód</button><button class="btn small" id="cdSet">Zadat kód tajně</button></div></section>
    ${C ? `<section><div class="eyebrow">Pokusy ${C.guesses.length}/${p.code.tries}</div>
      ${C.guesses.map(x => `<div class="row"><span class="code">${x.g.map(s => `<span>${esc(s)}</span>`).join("")}</span><span class="mono">${"●".repeat(x.black)}${"○".repeat(x.white)}</span></div>`).join("")}
      ${C.done ? `<div class="result"><span>${C.solved ? "Prolomeno" : "Konec pokusů"}</span><b class="code">${C.code.map(s => `<span>${esc(s)}</span>`).join("")}</b></div>` : `
      <div class="row"><span class="code">${Array.from({ length: n }, (_, i) => `<span>${esc(g[i] || "·")}</span>`).join("")}</span></div>
      <div class="row">${sy.map(s => `<button class="btn small" data-cds="${esc(s)}">${esc(s)}</button>`).join("")}<button class="btn small" id="cdBack" aria-label="Smazat poslední">⌫</button></div>
      <button class="btn primary" id="cdGo" ${g.length === n ? "" : "disabled"}>Vyhodnotit</button>`}</section>` : ""}`;
}
function wireLogic(main, p, t, save) {
  const q = id => document.getElementById(id); const on = (sel, fn) => $$(sel, main).forEach(el => el.addEventListener("click", () => fn(el))); const cp = curPlayer(p, t); const pl = players(p, t);
  const next = () => { if (pl.length) t.curF = (t.curF + 1) % pl.length; };
  if (q("stMode")) q("stMode").onclick = () => { S.stoneMode = !S.stoneMode; render(); };
  if (q("stPass")) q("stPass").onclick = () => { logEv(t, `${(cp || {}).name || ""} pasuje`); next(); save(); render(); };
  if (q("stClear")) q("stClear").onclick = () => { t.stones = {}; save(); render(); };
  const mat = $("#mat");
  if (mat && S.tool === "kameny" && S.stoneMode) mat.addEventListener("click", e => {
    const b = tableBoard(p); if (!b || !cp) return; e.stopImmediatePropagation(); const r = mat.getBoundingClientRect(); const z = zoomOf(); const pk = geo(b).pick((e.clientX - r.left) / z - BX, (e.clientY - r.top) / z - BY); if (!pk) return;
    const res = placeStone(p, t, pk.join(","), cp.id); if (res.err) { toast(res.err); return; } next(); save(); render();
  }, true);
  if (q("cdNew")) q("cdNew").onclick = () => { t.code = { code: newCode(p), guesses: [], done: false }; S.guess = []; logEv(t, "nový tajný kód"); save(); render(); };
  if (q("cdSet")) q("cdSet").onclick = () => { const d = openDialog(`<h2>Zadej tajný kód</h2><p class="hint">Ostatní ať se nedívají. Symboly odděl čárkou: ${esc(codeSymbols(p).join(", "))}</p><input type="password" id="cdIn" autocomplete="off"><div class="row" style="justify-content:flex-end"><button class="btn" data-close>Zrušit</button><button class="btn primary" id="cdOk">Uložit</button></div>`);
    $("#cdOk", d).onclick = () => { const c = $("#cdIn", d).value.split(",").map(s => s.trim()).filter(Boolean); if (c.length !== (+p.code.len || 4) || c.some(s => !codeSymbols(p).includes(s))) { toast(`Kód musí mít ${p.code.len} symbolů ze seznamu`); return; } t.code = { code: c, guesses: [], done: false }; S.guess = []; closeDialog(); save(); render(); }; };
  on("[data-cds]", el => { S.guess = S.guess || []; if (S.guess.length < (+p.code.len || 4)) S.guess.push(el.dataset.cds); render(); });
  if (q("cdBack")) q("cdBack").onclick = () => { (S.guess || []).pop(); render(); };
  if (q("cdGo")) q("cdGo").onclick = () => { const C = t.code; const r = scoreGuess(C.code, S.guess); C.guesses.push({ g: [...S.guess], ...r }); S.guess = [];
    if (r.black === C.code.length) { C.done = true; C.solved = true; logEv(t, `kód prolomen na ${C.guesses.length}. pokus`); if (cp) fireTriggers(p, t, "kod", cp.id, C.guesses.length); }
    else if (C.guesses.length >= +p.code.tries) { C.done = true; logEv(t, "kód neprolomen"); } save(); render(); };
}
function logicMechHTML(p) {
  return `<div class="panel"><h2>Logické a abstraktní hry</h2>
    <h3>Kameny na mapě</h3>
    <label class="chk"><input type="checkbox" id="lgOn" ${p.stones.on ? "checked" : ""}> Hráči střídavě pokládají kameny na pole mapy</label>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
      <label class="f">Cíl<select id="lgWin">${Object.entries(STONE_WIN).map(([k, v]) => `<option value="${k}" ${k === p.stones.win ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      <label class="f">Kolik v řadě<input type="number" id="lgN" min="3" max="10" value="${+p.stones.rowN || 5}"></label>
      <label class="f">Braní<select id="lgCap">${Object.entries(STONE_CAP).map(([k, v]) => `<option value="${k}" ${k === p.stones.capture ? "selected" : ""}>${v}</option>`).join("")}</select></label></div>
    <label class="chk"><input type="checkbox" id="lgGrav" ${p.stones.gravity ? "checked" : ""}> Gravitace – kámen spadne do nejnižšího volného pole sloupce (čtyři v řadě)</label>
    <p class="hint">Propojení okrajů: první strana spojuje levý a pravý okraj, druhá horní a dolní.</p>
    <h3>Lámání kódu</h3>
    <label class="chk"><input type="checkbox" id="cdOn" ${p.code.on ? "checked" : ""}> Hráči odhalují tajný kód podle nápověd (Mastermind)</label>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
      <label class="f">Délka kódu<input type="number" id="cdLen" min="1" max="8" value="${+p.code.len || 4}"></label>
      <label class="f">Pokusů<input type="number" id="cdTries" min="1" max="30" value="${+p.code.tries || 10}"></label>
      <label class="f" style="grid-column:span 2">Symboly (čárkou)<input type="text" id="cdSym" value="${esc(p.code.symbols)}"></label></div>
    <label class="chk"><input type="checkbox" id="cdDup" ${p.code.dup ? "checked" : ""}> Symboly se v kódu mohou opakovat</label></div>`;
}
function wireLogicMech(main, p) {
  const ch = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener("change", () => { fn(el); touch(p); }); };
  ch("lgOn", e => { p.stones.on = e.checked; }); ch("lgWin", e => { p.stones.win = e.value; }); ch("lgN", e => { p.stones.rowN = Math.max(3, +e.value || 5); }); ch("lgCap", e => { p.stones.capture = e.value; }); ch("lgGrav", e => { p.stones.gravity = e.checked; });
  ch("cdOn", e => { p.code.on = e.checked; }); ch("cdLen", e => { p.code.len = Math.max(1, Math.min(8, +e.value || 4)); }); ch("cdTries", e => { p.code.tries = Math.max(1, +e.value || 10); }); ch("cdSym", e => { p.code.symbols = e.value; }); ch("cdDup", e => { p.code.dup = e.checked; });
}
