// ---------- Herní stůl ----------
function buildPile(d) { const a = []; d.cards.forEach(c => { if (c.locked) return; for (let i = 0; i < (+c.qty || 0); i++) a.push(c.id); }); return shuffle(a); }
function players(p, t) { const ord = ((t && t.order) || []).map(id => p.factions.find(f => f.id === id)).filter(Boolean); p.factions.forEach(f => { if (!ord.includes(f)) ord.push(f); }); return ord; }
function curPlayer(p, t) { const pl = players(p, t); return pl.length ? pl[t.curF % pl.length] : null; }
function cardOf(p, h) { const d = p.decks.find(x => x.id === h.deckId); return d ? { d, c: d.cards.find(x => x.id === h.cardId) } : { d: null, c: null }; }
function bagFresh(b) { const inn = []; b.contents.forEach((c, i) => { for (let k = 0; k < (+c.count || 0); k++) inn.push(i); }); return { in: shuffle(inn), out: [] }; }
function refillMarket(p, t, d) {
  const n = +d.market || 0; const row = (t.market[d.id] || []).slice(0, n);
  while (row.length < n) row.push(null);
  for (let i = 0; i < n; i++) if (!row[i]) row[i] = t.piles[d.id].pop() || null;
  t.market[d.id] = row;
}
function ensureTable(p) {
  const fresh = !p.table;
  if (!p.table) p.table = { items: [], piles: {}, discard: {} };
  const t = p.table;
  // Hra bez mapy, ale se sítí míst, ukáže síť na stole hned.
  if (fresh && !p.boards.length && (p.nets || []).length) t.netId = p.nets[0].id;
  t.control = t.control || {}; t.hands = t.hands || {}; t.actionsTaken = t.actionsTaken || {};
  t.res = t.res || {}; t.tableau = t.tableau || {}; t.pdeck = t.pdeck || {}; t.pdisc = t.pdisc || {}; t.market = t.market || {};
  t.bags = t.bags || {}; t.won = t.won || {}; t.trick = t.trick || []; t.rondel = t.rondel || {}; t.clock = t.clock || { run: false, start: 0, acc: 0 };
  t.log = t.log || []; t.moved = t.moved || {}; t.tilesPlaced = t.tilesPlaced || {}; t.links = t.links || []; t.trackPos = t.trackPos || {}; t.prices = t.prices || {};
  if (!t.tileStack) { t.tileStack = []; p.tiles.forEach(x => { for (let i = 0; i < (+x.qty || 0); i++) t.tileStack.push(x.id); }); shuffle(t.tileStack); }
  t.tileStack = t.tileStack.filter(id => p.tiles.find(x => x.id === id)); Object.keys(t.tilesPlaced).forEach(k => { if (!p.tiles.find(x => x.id === t.tilesPlaced[k].id)) delete t.tilesPlaced[k]; });
  if (t.tileHand && !p.tiles.find(x => x.id === t.tileHand.id)) t.tileHand = null;
  p.stock.goods.forEach(g => { if (t.prices[g.resId] == null) t.prices[g.resId] = +g.price || 1; });
  if (t.turn == null) t.turn = 1; if (t.phaseIdx == null) t.phaseIdx = 0; if (t.curF == null) t.curF = 0;
  if (t.boardId === undefined) t.boardId = p.boards[0] ? p.boards[0].id : null;
  if (t.boardId && !p.boards.find(b => b.id === t.boardId)) t.boardId = null;
  const exists = (dId, cId) => { const d = p.decks.find(x => x.id === dId); return !!(d && d.cards.some(c => c.id === cId)); };
  const okH = h => h && exists(h.deckId, h.cardId);
  p.decks.forEach(d => {
    if (!t.piles[d.id]) {
      if (d.starter) { t.piles[d.id] = []; p.factions.forEach(f => { t.pdeck[f.id] = shuffle([...(t.pdeck[f.id] || []), ...buildPile(d).map(c => ({ deckId: d.id, cardId: c, own: true }))]); }); }
      else t.piles[d.id] = buildPile(d);
    }
    if (!t.discard[d.id]) t.discard[d.id] = [];
  });
  t.items = t.items.filter(i => (i.kind === "card" && exists(i.deckId, i.cardId)) || (i.kind === "token" && p.tokens.find(x => x.id === i.tokenId)) || (i.kind === "unit" && p.units.find(x => x.id === i.unitId)));
  Object.keys(t.piles).forEach(dId => { t.piles[dId] = t.piles[dId].filter(cId => exists(dId, cId)); t.discard[dId] = (t.discard[dId] || []).filter(cId => exists(dId, cId)); });
  [t.hands, t.tableau, t.pdeck, t.pdisc].forEach(o => Object.keys(o).forEach(f => { o[f] = (o[f] || []).filter(okH); }));
  t.trick = t.trick.filter(okH);
  Object.keys(t.market).forEach(dId => { if (!p.decks.find(d => d.id === dId)) delete t.market[dId]; else t.market[dId] = t.market[dId].map(c => c && exists(dId, c) ? c : null); });
  p.decks.forEach(d => { if (+d.market > 0) refillMarket(p, t, d); else delete t.market[d.id]; });
  p.resources.forEach(r => { (r.global ? ["_g"] : p.factions.map(f => f.id)).forEach(o => { t.res[o] = t.res[o] || {}; if (t.res[o][r.id] == null) t.res[o][r.id] = +r.start || 0; }); });
  p.bags.forEach(b => { const s = t.bags[b.id]; if (!s) t.bags[b.id] = bagFresh(b); else { s.in = s.in.filter(i => i < b.contents.length); s.out = s.out.filter(i => i < b.contents.length); } });
  if (t.draft && !p.decks.find(d => d.id === t.draft.deckId)) t.draft = null;
  if (p.factions.length) t.curF = t.curF % p.factions.length; else t.curF = 0;
  if (fresh) p.factions.forEach(f => { if (f.setup) runEffects(p, t, f.id, f.setup, "Start strany"); });
  return t;
}
function itemSize(i) { if (i.kind === "unit") { const S0 = typeof P === "function" && P() ? P().units.find(u => u.id === i.unitId) : null; return S0 && S0.big ? [104, 104] : [52, 52]; } return i.kind === "card" ? [100, 140] : [46, 46]; }
function freeSpot(t, w = 110, h = 150) {
  const z = S.zoom || 1; const sc = $(".mat-scroll"); const ox = sc ? sc.scrollLeft / z : 0, oy = sc ? sc.scrollTop / z : 0; const vw = sc ? sc.clientWidth / z : 800;
  for (let row = 0; row < 8; row++) for (let col = 0; col < 14; col++) {
    const x = ox + 30 + col * (w + 12), y = oy + 34 + row * (h + 12);
    if (x + w > ox + vw - 10 && col > 0) break;
    if (!t.items.some(i => Math.abs(i.x - x) < w * .6 && Math.abs(i.y - y) < h * .6)) return { x, y };
  }
  return { x: ox + 40 + Math.random() * 200, y: oy + 40 + Math.random() * 150 };
}
function tableBoard(p) { const t = p.table; return t && t.boardId ? p.boards.find(b => b.id === t.boardId) : null; }
function cellUnder(p, i) { const b = tableBoard(p); if (!b) return null; const [w, h] = itemSize(i); const cr = geo(b).pick(i.x + w / 2 - BX, i.y + h / 2 - BY); return cr ? cr.join(",") : null; }
function neighbors(b, c, r) {
  const out = []; const add = (x, y) => { if (x >= 0 && y >= 0 && x < b.cols && y < b.rows) out.push([x, y]); };
  if (b.type === "square") { add(c + 1, r); add(c - 1, r); add(c, r + 1); add(c, r - 1); }
  else if (c % 2 === 0) { add(c + 1, r - 1); add(c + 1, r); add(c - 1, r - 1); add(c - 1, r); add(c, r - 1); add(c, r + 1); }
  else { add(c + 1, r); add(c + 1, r + 1); add(c - 1, r); add(c - 1, r + 1); add(c, r - 1); add(c, r + 1); }
  return out;
}
function hexDist(b, k1, k2) {
  const [c1, r1] = k1.split(",").map(Number), [c2, r2] = k2.split(",").map(Number);
  if (b.type === "square") return Math.abs(c1 - c2) + Math.abs(r1 - r2);
  const cube = (c, r) => { const z = r - (c - (c & 1)) / 2; return [c, -c - z, z]; };
  const a = cube(c1, r1), d = cube(c2, r2); return Math.max(Math.abs(a[0] - d[0]), Math.abs(a[1] - d[1]), Math.abs(a[2] - d[2]));
}
function enemyCells(p, t, it) {
  const u = p.units.find(x => x.id === it.unitId); const out = [];
  t.items.forEach(i => { if (i.kind !== "unit" || i === it) return; const uu = p.units.find(x => x.id === i.unitId); if (!uu || !u || uu.factionId === u.factionId) return; const k = cellUnder(p, i); if (k) out.push(k); });
  return out;
}
function computeRange(p, t, it) {
  const b = tableBoard(p); if (!b) return null; const k0 = cellUnder(p, it); if (!k0) return null;
  const u = p.units.find(x => x.id === it.unitId); if (!u) return null; let mp = +(it.reduced && hasReduced(u) ? u.rMov : u.mov) || 0; if (it.st && (it.st.tired || it.st.tiredC)) mp = Math.floor(mp / 2);
  const enemy = new Set(enemyCells(p, t, it)), zoc = new Set();
  if (p.zoc) enemy.forEach(k => { const [c, r] = k.split(",").map(Number); neighbors(b, c, r).forEach(([x, y]) => zoc.add(x + "," + y)); });
  const cost = k => { const ter = terrainOf(p, b, k) || p.terrains[0]; const v = parseFloat(ter ? ter.move : 1); return isFinite(v) && v > 0 ? v : Infinity; };
  const best = { [k0]: 0 }; const queue = [k0];
  while (queue.length) {
    queue.sort((a, c) => best[a] - best[c]); const k = queue.shift();
    if (k !== k0 && zoc.has(k)) continue;
    const [c, r] = k.split(",").map(Number);
    for (const [x, y] of neighbors(b, c, r)) { const nk = x + "," + y; if (enemy.has(nk)) continue; const nc = best[k] + cost(nk); if (nc <= mp && (best[nk] == null || nc < best[nk])) { best[nk] = nc; queue.push(nk); } }
  }
  delete best[k0]; return best;
}
function discardCard(t, h, fid) { if (h.own && fid) (t.pdisc[fid] = t.pdisc[fid] || []).push(h); else (t.discard[h.deckId] = t.discard[h.deckId] || []).push(h.cardId); }
function drawOwn(t, fid, n) {
  let k = 0, re = false;
  for (let i = 0; i < n; i++) {
    if (!(t.pdeck[fid] || []).length) { if ((t.pdisc[fid] || []).length) { t.pdeck[fid] = shuffle(t.pdisc[fid]); t.pdisc[fid] = []; re = true; } else break; }
    (t.hands[fid] = t.hands[fid] || []).push(t.pdeck[fid].pop()); k++;
  }
  return { k, re };
}
function resMax(r) { return r.max === "" || r.max == null ? Infinity : +r.max; }
function scoreOf(p, t, fid) {
  const vpRes = p.resources.find(r => r.vp && !r.global);
  const base = vpRes ? ((t.res[fid] || {})[vpRes.id] || 0) : 0;
  // V deck buildingu se body počítají ze všech vlastních karet, jinak jen z vyložených.
  const ownAll = p.decks.some(d => d.starter) ? [...(t.pdeck[fid] || []), ...(t.pdisc[fid] || []), ...(t.hands[fid] || []).filter(h => h.own), ...(t.tableau[fid] || [])] : (t.tableau[fid] || []);
  const tab = ownAll.map(h => cardOf(p, h).c).filter(Boolean);
  const cardVp = tab.reduce((a, c) => a + (parseFloat(c.vp) || 0), 0);
  let sets = 0;
  if (p.scoring.field) {
    const tbl = String(p.scoring.table || "").split(/[,;\s]+/).map(Number).filter(n => !isNaN(n));
    const g = {}; tab.forEach(c => { const k = c[p.scoring.field]; if (k) g[k] = (g[k] || 0) + 1; });
    Object.values(g).forEach(n => { if (tbl.length) sets += tbl[Math.min(n, tbl.length) - 1]; });
  }
  const tricks = (t.won[fid] || 0) * (+p.scoring.trick || 0);
  let tickets = 0; ((p.routes || {}).tickets || []).forEach(tk => { if (tk.fid && tk.fid !== fid) return; if (t.links && routeConnected(p, t, fid, tk.a, tk.b)) tickets += +tk.pts || 0; });
  const goals = goalsScore(p, t, fid);
  return { base, cardVp, sets, tricks, tickets, goals, total: base + cardVp + sets + tricks + tickets + goals };
}
function clockMs(t) { const c = t.clock || {}; return (c.acc || 0) + (c.run ? Date.now() - c.start : 0); }
function fmtClock(ms) { const s = Math.floor(ms / 1000); const h = Math.floor(s / 3600); return (h ? h + ":" : "") + pad2(Math.floor(s / 60) % 60) + ":" + pad2(s % 60); }
onInit(() => setInterval(() => { const el = document.getElementById("clock"); const p = P(); if (el && p && p.table) el.textContent = fmtClock(clockMs(p.table)); }, 1000));

const TOOLS = [["stul", "Komponenty"], ["kolo", "Kolo"], ["hraci", "Hráči"], ["trh", "Trh"], ["akce", "Akce"], ["ruce", "Ruce"], ["draft", "Draft"], ["styk", "Štych"], ["program", "Program"], ["drazba", "Dražba"], ["obchod", "Obchod"], ["sacek", "Sáček"], ["kostky", "Kostky"], ["dilky", "Dílky"], ["draha", "Dráha"], ["tajne", "Tajné"], ["boj", "Boj"], ["uzemi", "Území"], ["aktivace", "Aktivace"], ["rozvoj", "Rozvoj"], ["hromadka", "Hromádka"], ["riskuj", "Riskuj"], ["vyprava", "Výprava"], ["kameny", "Kameny"], ["kod", "Kód"], ["lokace", "Lokace"], ["rozsevani", "Rozsévání"], ["sit", "Síť"], ["zakazky", "Zakázky"], ["souboj", "Souboj"], ["spolecnosti", "Společnosti"]];
function renderTable(main, p) {
  const t = ensureTable(p);
  const b = tableBoard(p); const g = b ? geo(b) : null;
  const cms = cmapMatSize(p, t); const nt = tableNet(p); S.matW = Math.max(1600, b ? Math.ceil(BX + g.W + 360) : 0, cms[0], nt ? BX + nt.w + 360 : 0); S.matH = Math.max(1100, b ? Math.ceil(BY + g.H + 220) : 0, cms[1], nt ? BY + nt.h + 220 : 0);
  const keep = $(".mat-scroll") ? [$(".mat-scroll").scrollLeft, $(".mat-scroll").scrollTop] : null;
  const keepSide = $(".side") ? $(".side").scrollTop : 0;
  const selItem = t.items.find(i => i.uid === S.sel);
  const rangeItem = S.rangeUid && t.items.find(i => i.uid === S.rangeUid);
  const range = rangeItem ? computeRange(p, t, rangeItem) : null;
  const losItem = S.losUid && t.items.find(i => i.uid === S.losUid); const losK = losItem && cellUnder(p, losItem); const los = losK && b ? visibleFrom(p, b, losK, S.losR || +p.ruleset.sight || 6) : null;
  S.fog = fogHidden(p, t); S.supCache = {};
  const cp = curPlayer(p, t);
  if (!TOOLS.find(x => x[0] === S.tool)) S.tool = "stul";
  main.innerHTML = `<div class="table-wrap">
    <div class="mat-area">${zoomBarHTML(t)}<div class="mat-scroll"><div class="mat-sizer" style="width:${S.matW * zoomOf()}px;height:${S.matH * zoomOf()}px"><div class="mat ${S.ctrlMode && b ? "ctrlmode" : ""} ${S.inkMode ? "inkmode" : ""}" id="mat" style="width:${S.matW}px;height:${S.matH}px;transform:scale(${zoomOf()})">
      <div class="mat-ruler">${Array.from({ length: Math.ceil(S.matW / 100) }, (_, i) => `<span style="left:${i * 100}px">${i * 10}</span>`).join("")}</div>
      ${b ? `<div class="boardlayer" style="left:${BX}px;top:${BY}px">${boardSVG(p, b, t.control, { range, los, tiles: t.tilesPlaced, links: t.links, routeSel: S.routeSel, dark: crawlDarkSet(p, t), stones: t.stones })}</div>` : ""}
      ${nt ? `<div class="boardlayer netlayer" style="left:${BX}px;top:${BY}px">${netSVG(p, nt, { t, sel: S.netSel, reach: S.netReach, goods: p.deliver.on ? t.goods : null })}</div>` : ""}${cmapHTML(p, t)}${t.items.map(i => itemHTML(p, i)).join("")}${ghostsHTML(p, t)}${inkSVG(t, S.matW, S.matH)}
    </div></div></div></div>
    <aside class="side">
      <div class="row spread"><button class="btn small" id="undo" ${S.undo.length ? "" : "disabled"}>↶ Zpět</button>${cp ? `<span class="fchip" style="cursor:default"><span class="dot" style="background:${cp.color};border-radius:50%"></span>${esc(cp.name)}</span>` : ""}</div>
      ${t.winner ? `<div class="result" style="background:var(--good);color:#fff"><span>Konec hry</span><b style="font-size:1.2rem;font-family:var(--f-display)">🏆 ${esc((p.factions.find(f => f.id === t.winner.fid) || {}).name || "")}</b><span>${esc(t.winner.why)}</span><button class="btn small" id="clearWin">Hrát dál</button></div>` : ""}
      ${(p.ruleset.fog || p.factions.some(f => f.hidden)) && p.units.length ? `<label class="f" style="flex-direction:row;align-items:center;gap:8px">Pohled<select id="view"><option value="">Vidím vše (rozhodčí)</option>${p.factions.map(f => `<option value="${f.id}" ${S.view === f.id ? "selected" : ""}>${esc(f.name)}</option>`).join("")}</select></label>` : ""}
      ${selItem ? selBarHTML(p, selItem) : ""}
      ${toolsHTML(p)}
      ${({ stul: sideComponents, kolo: sideTurn, hraci: sidePlayers, trh: sideMarket, akce: sideActions, ruce: sideHands, draft: sideDraft, styk: sideTrick, program: sideProgram, drazba: sideAuction, sacek: sideBag, kostky: sideDice, boj: sideCombat, uzemi: sideTerritory, dilky: sideTiles, draha: sideTrack, obchod: sideTrade, tajne: sideSecret, aktivace: sideActivation, rozvoj: sideDevelop, hromadka: sideShed, riskuj: sidePush, vyprava: sideCrawl, kameny: sideStones, kod: sideCode, lokace: sideCmap, rozsevani: sideMancala, sit: sideNet, zakazky: sideDeliver, souboj: sideFight, spolecnosti: sideRail })[S.tool](p, t)}
    </aside></div>`;
  S.justRolled = false;
  S.undoBase = JSON.stringify(p.table);
  if (keep) { $(".mat-scroll").scrollLeft = keep[0]; $(".mat-scroll").scrollTop = keep[1]; }
  $(".side").scrollTop = keepSide;
  wireTable(main, p, t);
}
function itemHTML(p, i) {
  let inner = "";
  if (i.kind === "card") { const d = p.decks.find(x => x.id === i.deckId); const c = d && d.cards.find(x => x.id === i.cardId); if (!c) return ""; inner = cardHTML(c, d, i.faceUp); }
  else if (i.kind === "unit") { const u = p.units.find(x => x.id === i.unitId); if (!u) return ""; const fg = S.fog;
    if (fg && fg.has(i.uid + ":gone")) return "";
    if (isMonster(p, i) && p.crawl.rooms && crawlDarkSet(p, p.table).has(cellUnder(p, i))) return "";
    if (fg && fg.has(i.uid + ":block")) { const f = p.factions.find(x => x.id === u.factionId); inner = `<div class="unit" style="background:${f ? f.color : "#888"}" title="Nepřátelská jednotka"></div>`; }
    else inner = unitHTML(p, u, i.reduced) + (inSupply(p, p.table, i) ? "" : `<span class="oos" title="Mimo zásobování">⚠</span>`) + (i.st ? `<span class="usts">${stBadges(i)}</span>` : "") + hpBadge(p, i); }
  else { const tk = p.tokens.find(x => x.id === i.tokenId); if (!tk) return ""; inner = tokenHTML(tk, i.value) + (tk.text ? "" : `<span class="token-label">${esc(tk.name)}</span>`); }
  return `<div class="titem ${i.uid === S.sel ? "sel" : ""}" data-uid="${i.uid}" style="left:${i.x}px;top:${i.y}px;transform:rotate(${i.rot || 0}deg)">${inner}</div>`;
}
const fchipsHTML = (p, t, attr = "data-curf") => `<div class="fchips">${players(p, t).map((x, i) => `<button class="fchip" ${attr}="${i}" aria-pressed="${i === t.curF}"><span class="dot" style="background:${x.color};border-radius:50%"></span>${esc(x.name)}</button>`).join("")}</div>`;
function selBarHTML(p, i) {
  if (i.kind === "card") {
    const c = p.decks.find(d => d.id === i.deckId).cards.find(x => x.id === i.cardId);
    return `<div class="selbar"><b>${i.faceUp ? esc(c.title) : "Karta rubem nahoru"}</b>
      <div class="row"><button class="btn small" data-sa="flip">Otočit</button><button class="btn small" data-sa="rot">Natočit o 90°</button></div>
      <div class="row"><button class="btn small" data-sa="discard">Odhodit</button><button class="btn small" data-sa="bottom">Pod balíček</button><button class="btn small" data-sa="top">Na balíček</button></div>
      ${p.factions.length ? `<div class="row"><span class="hint">Do ruky:</span>${p.factions.map(f => `<button class="btn small" data-tohand="${f.id}"><span class="dot" style="background:${f.color}"></span>${esc(f.name)}</button>`).join("")}</div>
      <div class="row"><span class="hint">Vyložit:</span>${p.factions.map(f => `<button class="btn small" data-totab="${f.id}"><span class="dot" style="background:${f.color}"></span>${esc(f.name)}</button>`).join("")}</div>` : ""}</div>`;
  }
  if (i.kind === "unit") {
    const u = p.units.find(x => x.id === i.unitId); const k = cellUnder(p, i); const b = tableBoard(p); const ter = k && b ? (terrainOf(p, b, k) || p.terrains[0]) : null;
    const en = k && b ? enemyCells(p, p.table, i) : []; const near = en.length ? Math.min(...en.map(e => hexDist(b, k, e))) : null;
    return `<div class="selbar"><b>${esc(u.name)} <span class="mono" style="font-weight:400">${esc(unitVals(u, i.reduced))}</span>${p.table.moved && p.table.moved[i.uid] ? ` <span class="count">· táhla</span>` : ""}</b>
      ${k ? `<span class="hint">Pole ${k.split(",").map(n => pad2(+n + 1)).join("")}${ter ? " · " + esc(ter.name) + ` (pohyb ${esc(ter.move)}, obrana ×${ter.def})` : ""}${b.labels[k] ? " · " + esc(b.labels[k]) : ""}${near != null ? ` · nejbližší nepřítel ${near} ${plural(near, "pole", "pole", "polí")}` : ""}</span>` : ""}
      <div class="row">${k ? `<button class="btn small ${S.rangeUid === i.uid ? "on" : ""}" data-sa="range">Dosah pohybu</button><button class="btn small ${S.losUid === i.uid && !S.losR ? "on" : ""}" data-sa="los">Výhled</button>${+u.range ? `<button class="btn small ${S.losUid === i.uid && S.losR ? "on" : ""}" data-sa="fire">Dostřel ${u.range}</button>` : ""}` : ""}${hasReduced(u) ? `<button class="btn small" data-sa="flip">${i.reduced ? "Obnovit" : "Oslabit"}</button>` : ""}<button class="btn small" data-sa="rot">Natočit</button></div>
      ${u.att !== "" && u.att != null || u.def !== "" && u.def != null ? `<div class="row">${Object.entries(UNIT_ST).filter(([, v]) => !!v[3] === !!+u.hp).map(([k, v]) => `<button class="btn small ${i.st && i.st[k] ? "on" : ""}" data-ust="${k}" title="${v[2]}">${v[1]} ${v[0]}</button>`).join("")}</div>
      <div class="row"><button class="btn small" data-sa="asAtt">Útočí</button><button class="btn small" data-sa="addAtt">+ k útoku</button><button class="btn small" data-sa="asDef">Brání</button></div>` : ""}
      ${crawlSelHTML(p, i)}${deliverSelHTML(p, i)}${tableNet(p) && netNodeOf(p, p.table, i) ? `<div class="row"><button class="btn small ${S.netReach && S.netReachUid === i.uid ? "on" : ""}" data-sa="netreach">Kam dojede</button></div>` : ""}
      <div class="row"><button class="btn small" data-sa="dup">Duplikovat</button><button class="btn small danger" data-sa="remove">Zničit</button></div></div>`;
  }
  const tk = p.tokens.find(x => x.id === i.tokenId);
  return `<div class="selbar"><b>${esc(tk.name)}</b>
    ${tk.counter ? `<div class="row"><button class="btn small" data-sa="minus" aria-label="Ubrat">−</button><span class="mono" style="font-size:1.2rem;min-width:40px;text-align:center">${i.value || 0}</span><button class="btn small" data-sa="plus" aria-label="Přidat">+</button><button class="btn small" data-sa="plus5">+5</button></div>` : ""}
    <div class="row"><button class="btn small" data-sa="dup">Duplikovat</button><button class="btn small danger" data-sa="remove">Odebrat ze stolu</button></div></div>`;
}
function sideComponents(p, t) {
  return `${!S.sel ? `<p class="hint">Komponenty přetahuj prstem. Klepnutím vybereš, dvojitým klepnutím otočíš kartu nebo oslabíš jednotku.</p>` : ""}
    <section><div class="eyebrow">Herní deska</div>
      <select id="tBoard" aria-label="Herní deska"><option value="">Bez mapy</option>${p.boards.map(b => `<option value="${b.id}" ${b.id === t.boardId ? "selected" : ""}>${esc(b.name)}</option>`).join("")}${p.nets.length ? `<optgroup label="Sítě míst">${p.nets.map(n => `<option value="net:${n.id}" ${!t.boardId && n.id === t.netId ? "selected" : ""}>${esc(n.name)}</option>`).join("")}</optgroup>` : ""}</select>
      ${t.boardId ? `<label class="chk"><input type="checkbox" id="snap" ${S.snap ? "checked" : ""}> Přichytávat jednotky a žetony na pole</label>` : ""}</section>
    ${p.units.length ? `<section><div class="eyebrow">Jednotky – klepnutím postavíš na stůl</div>
      ${p.factions.map(f => { const us = p.units.filter(u => u.factionId === f.id); return us.length ? `<div class="lib">${us.map(u => `<button class="lib-btn" data-addunit="${u.id}" title="${esc(u.name)}">${unitHTML(p, u)}<span>${esc(u.name)}</span></button>`).join("")}</div>` : ""; }).join("")}</section>` : ""}
    <section><div class="eyebrow">Balíčky</div>
      ${p.decks.length ? p.decks.map(d => `<div class="pile"><span class="dot" style="background:${d.color}"></span><span class="nm">${esc(d.name)}</span>
        <span class="nums">${d.starter ? "startovní – rozdán hráčům" : `dobírací ${t.piles[d.id].length} · odhazovací ${t.discard[d.id].length}`}</span>
        ${d.starter ? "" : `<div class="row"><button class="btn small primary" data-draw="${d.id}" ${t.piles[d.id].length ? "" : "disabled"}>Líznout</button>
        <button class="btn small" data-drawdown="${d.id}" ${t.piles[d.id].length ? "" : "disabled"}>Rubem</button>
        <button class="btn small" data-deal="${d.id}" ${t.piles[d.id].length && p.factions.length ? "" : "disabled"}>Rozdat</button>
        <button class="btn small" data-reshuffle="${d.id}" ${t.discard[d.id].length ? "" : "disabled"}>Zamíchat odhoz</button></div>`}</div>`).join("") : `<div class="hint">Žádné balíčky.</div>`}
    </section>
    <section><div class="eyebrow">Žetony</div>
      ${p.tokens.length ? `<div class="row">${p.tokens.map(tk => `<button class="btn small" data-addtok="${tk.id}"><span class="dot" style="background:${tk.color};border-radius:${tk.shape === "kruh" ? "50%" : "3px"}"></span>${esc(tk.name)}</button>`).join("")}</div>` : `<span class="hint">Žetony vytvoříš v Komponentách.</span>`}
    </section>
    <section><div class="eyebrow">Stůl</div><div class="row"><button class="btn small" id="resetTable">Vyčistit a připravit novou hru</button></div></section>`;
}
function sideTurn(p, t) {
  const sc = p.scenarios.find(s => s.id === t.scenarioId); const cp = curPlayer(p, t);
  return `${botHTML(p, t)}<section><div class="eyebrow">${sc ? "Scénář · " + esc(sc.name) : "Volná hra"}</div>
      <div class="row spread"><span class="turnbig">Kolo ${t.turn}${sc ? `<span class="muted" style="font-size:1rem"> / ${sc.turns}</span>` : ""}</span>
        <span class="row"><button class="btn small" id="turnPrev" aria-label="Předchozí kolo">−</button><button class="btn small" id="turnNext" aria-label="Další kolo">+</button></span></div>
      ${sc && t.turn > sc.turns ? `<div class="result"><span>Scénář skončil</span><span style="font-size:.9rem">Vyhodnoť podmínky vítězství.</span></div>` : ""}
    </section>
    <section><div class="eyebrow">Fáze</div><div class="phases">${p.phases.map((ph, i) => `<div class="phase ${i === t.phaseIdx ? "on" : ""}"><span class="mono">${i + 1}</span>${esc(ph)}</div>`).join("")}</div>
      ${p.phases.length ? `<button class="btn primary" id="phaseNext">Další fáze</button>` : `<span class="hint">Fáze nastavíš v Mechanikách.</span>`}</section>
    ${onlineHTML(p, t)}
    ${p.factions.length ? `<section><div class="eyebrow">Pořadí a tah</div>${fchipsHTML(p, t)}
      ${cp && cp.ability ? `<div class="selbar" style="border-color:${cp.color}"><span class="eyebrow">Schopnost · ${esc(cp.name)}</span><span>${esc(cp.ability)}</span></div>` : ""}
      <div class="row"><button class="btn small primary" id="nextPlayer">Ukončit tah</button><button class="btn small" id="ordRand">Náhodné pořadí</button>${p.resources.some(r => r.vp && !r.global) ? `<button class="btn small" id="ordScore">Nejméně bodů první</button>` : ""}${+p.track.length ? `<button class="btn small" id="ordTrack">Nejvíc vzadu na dráze</button>` : ""}<button class="btn small" id="ordReset">Výchozí</button></div></section>` : ""}
    ${countdownHTML()}
    <section><div class="eyebrow">Stopky hry</div><div class="row spread"><span class="turnbig mono" id="clock">${fmtClock(clockMs(t))}</span>
      <span class="row"><button class="btn small ${t.clock.run ? "" : "primary"}" id="clockRun">${t.clock.run ? "Pauza" : "Start"}</button><button class="btn small" id="clockReset">Vynulovat</button></span></div>
      <button class="btn small" id="logGame">Zapsat odehranou hru…</button></section>
    <section><div class="eyebrow">Časovač tahu</div><div class="row spread"><span class="turnbig mono" id="ttimer">${t.timer ? fmtClock(Math.max(0, t.timer.end - Date.now())) : "–"}</span>
      <span class="row"><input type="number" id="tLen" min="5" max="600" value="${t.timer ? t.timer.len : (S.tLen || 60)}" style="width:80px" aria-label="Sekund na tah"><button class="btn small" id="tStart">${t.timer ? "Znovu" : "Start"}</button>${t.timer ? `<button class="btn small" id="tStop">Vypnout</button>` : ""}</span></div>
      <span class="hint">${p.ruleset.timerAuto ? "Po vypršení se tah předá automaticky." : "Po vypršení se ukáže upozornění."}${+p.ruleset.actionsPerTurn ? ` Akce v tahu: ${t.acts || 0}/${p.ruleset.actionsPerTurn}.` : ""}${+p.ruleset.handLimit ? ` Limit ruky: ${p.ruleset.handLimit}.` : ""} Režim pravidel: ${p.ruleset.strict ? "vynucovat" : "upozorňovat"}.</span></section>
    <section><div class="eyebrow">Záznam hry</div>${t.log.length ? `<div class="log" style="max-height:220px">${t.log.map(l => `<span>${esc(l)}</span>`).join("")}</div>` : `<span class="hint">Zatím prázdný. Zapisují se sem tahy, efekty karet i porušení pravidel.</span>`}</section>
    ${sc ? `<section><div class="eyebrow">Podmínky vítězství</div><p style="white-space:pre-wrap;font-size:.92rem">${sc.victory ? esc(sc.victory) : "<span class='hint'>Nevyplněno</span>"}</p>
      ${sc.special ? `<div class="eyebrow">Zvláštní pravidla</div><p style="white-space:pre-wrap;font-size:.92rem">${esc(sc.special)}</p>` : ""}</section>` : `<p class="hint">Scénář spustíš v záložce Scénáře.</p>`}`;
}
function miniCards(p, list, btns) {
  return `<div class="hand mini">${list.map((h, i) => { const { d, c } = cardOf(p, h); return c ? `<div class="hc">${cardHTML(c, d)}<div class="row">${btns(i)}</div></div>` : ""; }).join("")}</div>`;
}
function sidePlayers(p, t) {
  const pl = players(p, t);
  if (!pl.length) return `<p class="hint">Nejdřív vytvoř strany v Mechanikách.</p>`;
  if (!S.plF || !p.factions.find(f => f.id === S.plF)) S.plF = pl[0].id;
  const f = p.factions.find(x => x.id === S.plF);
  const glob = p.resources.filter(r => r.global), own = p.resources.filter(r => !r.global);
  const resRow = (o, r) => `<div class="resrow"><span class="dot" style="background:${r.color};border-radius:50%"></span><span>${esc(r.name)}${r.vp ? " ★" : ""}</span>
      <button class="btn small" data-res="${o}|${r.id}|-1" aria-label="Ubrat ${esc(r.name)}">−</button><b class="mono">${(t.res[o] || {})[r.id] ?? 0}</b><button class="btn small" data-res="${o}|${r.id}|1" aria-label="Přidat ${esc(r.name)}">+</button></div>`;
  const sc = scoreOf(p, t, f.id);
  const hasOwnDeck = p.decks.some(d => d.starter) || (t.pdeck[f.id] || []).length || (t.pdisc[f.id] || []).length;
  const tab = t.tableau[f.id] || [];
  return `<section><div class="eyebrow">Skóre</div><div class="score"><span></span><span class="hint">Hráč</span><span class="hint">Body</span><span></span>
      ${pl.map(x => `<span class="dot" style="background:${x.color};border-radius:50%"></span><b>${esc(x.name)}</b><span class="mono">${scoreOf(p, t, x.id).total}</span><span></span>`).join("")}</div></section>
    ${glob.length ? `<section><div class="eyebrow">Společné stopy</div>${glob.map(r => resRow("_g", r)).join("")}</section>` : ""}
    <section><div class="fchips">${pl.map(x => `<button class="fchip" data-plf="${x.id}" aria-pressed="${x.id === S.plF}"><span class="dot" style="background:${x.color};border-radius:50%"></span>${esc(x.name)}</button>`).join("")}</div>
      ${f.ability ? `<span class="hint">Schopnost: ${esc(f.ability)}</span>` : ""}
      ${own.length ? own.map(r => resRow(f.id, r)).join("") : `<span class="hint">Zdroje (mince, suroviny, body) přidáš v Mechanikách.</span>`}
      ${p.resources.some(r => +r.income) ? `<button class="btn small" id="income">Příjem všem hráčům</button>` : ""}
      <span class="hint">Skóre ${sc.total} = zdroj ${sc.base} + karty ${sc.cardVp} + sady ${sc.sets}${sc.tricks ? " + štychy " + sc.tricks : ""}${sc.tickets ? " + cíle tras " + sc.tickets : ""}</span></section>
    ${hasOwnDeck ? `<section><div class="eyebrow">Vlastní balíček (deck building)</div>
      <span class="mono hint">balíček ${(t.pdeck[f.id] || []).length} · odhoz ${(t.pdisc[f.id] || []).length} · ruka ${(t.hands[f.id] || []).length} · vyloženo ${tab.length}</span>
      <div class="row"><button class="btn small primary" data-own="1">Líznout 1</button><button class="btn small" data-own="5">Líznout 5</button><button class="btn small" id="cleanup">Úklid: ruka a vyložené do odhozu</button></div></section>` : ""}
    <section><div class="eyebrow">Vyložené karty (${tab.length})</div>
      ${tab.length ? miniCards(p, tab, i => `${tabCardBtns(p, t, f.id, i)}<button class="btn small" data-tabhand="${i}">Do ruky</button><button class="btn small" data-tabdisc="${i}" aria-label="Odhodit">✕</button>`) : `<span class="hint">Karty vyložíš z ruky, z trhu nebo ze stolu.</span>`}</section>`;
}
function sideMarket(p, t) {
  const ds = p.decks.filter(d => +d.market > 0);
  if (!ds.length) return `<p class="hint">Trh je řada odkrytých karet, které si hráči kupují. Zapneš ho u balíčku v Komponentách (pole „Karet na trhu“).</p>`;
  const cur = p.resources.find(r => r.id === p.marketCur); const cp = curPlayer(p, t);
  return `<section><div class="eyebrow">Kupuje</div>${fchipsHTML(p, t)}${cur && cp ? `<span class="hint">${esc(cp.name)} má ${(t.res[cp.id] || {})[cur.id] ?? 0} × ${esc(cur.name)}</span>` : ""}</section>
    ${ds.map(d => `<section><div class="row spread"><div class="eyebrow">${esc(d.name)} · v balíčku ${t.piles[d.id].length}</div><button class="btn small" data-mrefresh="${d.id}">Vyměnit trh</button></div>
      <div class="hand mini">${t.market[d.id].map((cId, i) => { const c = cId && d.cards.find(x => x.id === cId); return c ? `<div class="hc">${cardHTML(c, d)}<div class="row">${+c.fight ? `<button class="btn small primary" data-mfight="${d.id}|${i}">⚔ Porazit (${c.fight})</button>` : p.marketAuction ? `<button class="btn small primary" data-mauc="${d.id}|${i}">Dražit</button>` : `<button class="btn small primary" data-mbuy="${d.id}|${i}">Koupit</button>`}<button class="btn small" data-mhand="${d.id}|${i}" aria-label="Do ruky">Ruka</button><button class="btn small" data-mtab="${d.id}|${i}" aria-label="Vyložit">Vyložit</button></div></div>` : `<div class="hc empty" style="padding:8px;font-size:.8rem">prázdné</div>`; }).join("")}</div>
      <p class="hint">Koupit = do odhozu vlastního balíčku hráče (deck building).</p></section>`).join("")}
    <section><label class="chk"><input type="checkbox" id="mAuc" ${p.marketAuction ? "checked" : ""}> Karty z trhu se draží (otevřená dražba od ceny karty)</label></section>`;
}
function sideActions(p, t) {
  if (!p.actions.length) return `<p class="hint">Akce nadefinuješ v záložce Mechaniky.</p>`;
  const pl = players(p, t);
  if (p.actionMode === "roles") return rolesHTML(p, t);
  if (p.actionMode === "rondel") {
    const n = p.actions.length, R = 112;
    return `<section><div class="eyebrow">Rondel · na tahu</div>${fchipsHTML(p, t)}
      <label class="chk"><input type="checkbox" id="autoNext" ${S.autoNext !== false ? "checked" : ""}> Po tahu předat dalšímu</label></section>
      <div class="rondel">${p.actions.map((a, i) => { const ang = -Math.PI / 2 + i / n * Math.PI * 2; const here = pl.filter(f => t.rondel[f.id] === i);
        return `<button class="ra" data-rond="${i}" style="left:calc(50% + ${Math.round(Math.cos(ang) * R)}px - 46px);top:${Math.round(140 + Math.sin(ang) * R) - 26}px" title="${esc(a.text)}"><b>${esc(a.name)}</b><span class="row" style="gap:2px;justify-content:center">${here.map(f => `<span class="dot" style="background:${f.color};border-radius:50%;width:12px;height:12px"></span>`).join("")}</span></button>`; }).join("")}
        <div class="rc">${p.rondel.free} ${plural(+p.rondel.free, "krok", "kroky", "kroků")} zdarma</div></div>
      <p class="hint">Klepni na akci, kam hráč na tahu posune figurku. Poprvé může začít kdekoli.</p>`;
  }
  return `<section><div class="eyebrow">Pokládá</div>${fchipsHTML(p, t)}
      <label class="chk"><input type="checkbox" id="autoNext" ${S.autoNext !== false ? "checked" : ""}> Po položení předat tah dalšímu</label></section>
    <section><div class="eyebrow">Akční pole</div>
      ${p.actions.map(a => { const taken = t.actionsTaken[a.id] || []; const n = taken.filter(Boolean).length; return `<div class="action"><div class="row spread"><b>${esc(a.name)}</b><span class="count">${n}/${a.slots}</span></div>${a.text ? `<span class="hint">${esc(a.text)}</span>` : ""}
        <div class="slots">${Array.from({ length: a.slots }, (_, si) => { const fid = taken[si]; const fx = fid && p.factions.find(x => x.id === fid);
          return `<button class="slot ${fx ? "taken" : ""}" data-slot="${a.id}" data-si="${si}" aria-label="${fx ? "Obsazeno: " + esc(fx.name) : "Volné místo"}">${fx ? MEEPLE(fx.color) : ""}</button>`; }).join("")}</div></div>`; }).join("")}
      <button class="btn small" id="actClear">Nové kolo – uvolnit akce</button></section>`;
}
function sideHands(p, t) {
  if (!S.handF || !p.factions.find(f => f.id === S.handF)) S.handF = p.factions[0] ? p.factions[0].id : null;
  const seat = p.online && p.online.seat; if (seat) S.handF = seat;
  const f = p.factions.find(x => x.id === S.handF); const hand = f ? (t.hands[f.id] || []) : [];
  const ownDeck = f && ((t.pdeck[f.id] || []).length || (t.pdisc[f.id] || []).length);
  return `<section><div class="eyebrow">Ruce hráčů</div><div class="fchips">${p.factions.map(x => `<button class="fchip" data-handf="${x.id}" aria-pressed="${x.id === S.handF}" ${seat && x.id !== seat ? "disabled" : ""}><span class="dot" style="background:${x.color};border-radius:50%"></span>${esc(x.name)} <span class="count">${(t.hands[x.id] || []).length}</span></button>`).join("")}</div></section>
    ${f ? `<section>${S.showHand ? `<div class="row spread"><b>Ruka: ${esc(f.name)}</b><button class="btn small" id="hideHand">Skrýt</button></div>
      ${hand.length ? miniCards(p, hand, i => `${+(cardOf(p, hand[i]).c || {}).ops ? `<button class="btn small primary" data-hops="${i}">Operace ${cardOf(p, hand[i]).c.ops}</button><button class="btn small" data-htab="${i}">Událost</button>` : `<button class="btn small" data-hplay="${i}">Na stůl</button><button class="btn small" data-htab="${i}">Vyložit</button>`}<button class="btn small" data-hban="${i}" title="Odstranit kartu ze hry">Vyhostit</button><button class="btn small" data-hdisc="${i}" aria-label="Odhodit">✕</button>`) : `<div class="hint">Ruka je prázdná.</div>`}
      ${hand.length >= (+p.melds.min || 3) && p.decks.some(d => d.cards.some(c => c.suit && c.value)) ? `<button class="btn small" id="meld">Vyložit sestavu</button>` : ""}`
      : `<button class="btn primary" id="showHand">Ukázat ruku – ${esc(f.name)} (${hand.length})</button><p class="hint">Karty v ruce vidí jen ten, kdo právě drží iPad.</p>`}</section>
      ${hand.length ? `<section><button class="btn small" id="mulligan">Mulligan – vrátit ruku a líznout znovu</button></section>` : ""}
      <section><div class="eyebrow">Líznout do ruky</div><div class="row">${ownDeck ? `<button class="btn small primary" data-own="1" data-ownf="${f.id}">Z vlastního balíčku</button>` : ""}${p.decks.filter(d => !d.starter).map(d => `<button class="btn small" data-hdraw="${d.id}" ${t.piles[d.id].length ? "" : "disabled"}><span class="dot" style="background:${d.color}"></span>${esc(d.name)}</button>`).join("")}</div></section>` : `<p class="hint">Nejdřív vytvoř strany v Mechanikách.</p>`}`;
}
function sideDraftClassic(p, t) {
  const D = t.draft; const decks = p.decks.filter(d => !d.starter);
  if (!D) return `<section><div class="eyebrow">Draft karet</div>
      <p class="hint">Každý hráč dostane balíček karet, vybere si jednu a zbytek pošle sousedovi. Hraje se předáváním iPadu – karty ostatních zůstávají skryté.</p>
      ${decks.length ? `<label class="f">Balíček<select id="dDeck">${decks.map(d => `<option value="${d.id}">${esc(d.name)} (${t.piles[d.id].length})</option>`).join("")}</select></label>
      <div class="grid" style="grid-template-columns:1fr 1fr"><label class="f">Karet na hráče<input type="number" id="dN" min="1" max="15" value="4"></label>
      <label class="f">Posílat<select id="dDir"><option value="1">doleva</option><option value="-1">doprava</option></select></label></div>
      <p class="hint">Hráči: ${p.factions.map(f => esc(f.name)).join(", ")}</p>` : `<p class="hint">Nejdřív vytvoř balíček karet.</p>`}
      <button class="btn primary" id="dStart" ${decks.length && p.factions.length > 1 ? "" : "disabled"}>Začít draft</button></section>`;
  const f = p.factions[D.seat]; const left = D.packs.reduce((a, pk) => a + pk.length, 0);
  return `<section><div class="eyebrow">Draft · ${esc((p.decks.find(d => d.id === D.deckId) || {}).name || "")} · kolo výběru ${D.round}</div>
      ${left ? `<div class="result"><span>Vybírá</span><b style="font-size:1.2rem;font-family:var(--f-display)">${esc(f ? f.name : "")}</b></div>
        <button class="btn primary" id="dShow">Ukázat karty hráči</button>` : `<div class="result"><b style="font-size:1.1rem;font-family:var(--f-display)">Draft dokončen</b></div>`}
      ${p.factions.map(x => `<div class="row"><span class="dot" style="background:${x.color};border-radius:50%"></span><b>${esc(x.name)}</b><span class="count">${(D.picks[x.id] || []).length} ${plural((D.picks[x.id] || []).length, "karta", "karty", "karet")}</span></div>`).join("")}
      <div class="row">${left ? "" : `<button class="btn primary" id="dToHands">Přesunout výběry do rukou</button>`}<button class="btn small danger" id="dCancel">Zrušit draft</button></div></section>`;
}
function trickWinner(p, t) {
  if (!t.trick.length) return null;
  const cs = t.trick.map(h => ({ h, c: cardOf(p, h).c })).filter(x => x.c);
  const lead = cs[0].c.suit; const trump = t.trump || "";
  let pool = trump ? cs.filter(x => x.c.suit === trump) : [];
  if (!pool.length) pool = cs.filter(x => x.c.suit === lead);
  return pool.reduce((best, x) => (parseFloat(x.c.value) || 0) > (parseFloat(best.c.value) || 0) ? x : best, pool[0]).h;
}
function sideTrick(p, t) {
  const suits = [...new Set(p.decks.flatMap(d => d.cards.map(c => c.suit)).filter(Boolean))];
  const pl = players(p, t); const cp = curPlayer(p, t);
  const done = pl.length && t.trick.length >= pl.length; const w = done ? trickWinner(p, t) : null; const wf = w && p.factions.find(f => f.id === w.fid);
  return `<section><div class="eyebrow">Štychy</div>
      <p class="hint">Hráči postupně vynesou kartu z ruky. Bere nejvyšší trumf, jinak nejvyšší karta vynesené barvy. Karty potřebují vyplněnou barvu a hodnotu.</p>
      <div class="grid" style="grid-template-columns:1fr auto"><label class="f">Trumf<select id="trump"><option value="">Bez trumfů</option>${suits.map(s => `<option ${s === t.trump ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></label>
      <label class="chk" style="align-self:end"><input type="checkbox" id="follow" ${t.follow !== false ? "checked" : ""}> Přiznávat barvu</label></div></section>
    <section><div class="eyebrow">Na stole (${t.trick.length}/${pl.length})</div>
      ${t.trick.length ? `<div class="hand mini">${t.trick.map(h => { const { d, c } = cardOf(p, h); const f = p.factions.find(x => x.id === h.fid); return `<div class="hc">${cardHTML(c, d)}<span class="count">${esc(f ? f.name : "")}</span></div>`; }).join("")}</div>` : `<span class="hint">Štych je prázdný.</span>`}
      ${done ? `<div class="result"><span>Štych bere</span><b style="font-size:1.2rem;font-family:var(--f-display)">${esc(wf ? wf.name : "")}</b></div><button class="btn primary" id="takeTrick">Sebrat štych</button>`
        : (cp ? `<button class="btn primary" id="playTrick">Vynést kartu – ${esc(cp.name)} (${(t.hands[cp.id] || []).length})</button>` : "")}</section>
    <section><div class="eyebrow">Získané štychy</div><div class="score"><span></span><span></span><span class="hint">Štychů</span><span></span>
      ${pl.map(x => `<span class="dot" style="background:${x.color};border-radius:50%"></span><b>${esc(x.name)}</b><span class="mono">${t.won[x.id] || 0}</span><span></span>`).join("")}</div>
      <button class="btn small" id="trickReset">Vynulovat štychy</button></section>${trickBidHTML(p, t)}`;
}
function sideProgram(p, t) {
  const P_ = t.prog; const pl = players(p, t);
  if (!P_) return `<section><div class="eyebrow">Programování a tajný výběr</div>
      <p class="hint">Všichni hráči tajně vyberou karty z ruky v pořadí, pak se odkrývají krok po kroku. Hodí se pro programování pohybu, současný výběr akcí i výběr rolí.</p>
      <label class="f">Kolik karet každý vybírá<input type="number" id="progN" min="1" max="6" value="${S.progN || 1}"></label>
      <button class="btn primary" id="progStart" ${pl.length ? "" : "disabled"}>Začít výběr</button></section>`;
  const ready = pl.every(f => (P_.picks[f.id] || []).length);
  return `<section><div class="eyebrow">Tajný výběr · ${P_.n} ${plural(P_.n, "karta", "karty", "karet")}</div>
      ${pl.map(f => `<div class="row spread"><span class="row"><span class="dot" style="background:${f.color};border-radius:50%"></span><b>${esc(f.name)}</b></span>${(P_.picks[f.id] || []).length ? `<span class="count">vybráno ✓</span>` : `<button class="btn small" data-prog="${f.id}">Vybrat</button>`}</div>`).join("")}</section>
    ${ready ? `<section><div class="eyebrow">Odkrývání</div>
      ${Array.from({ length: P_.step + 1 }, (_, s) => `<div class="eyebrow">Krok ${s + 1}</div><div class="hand mini">${pl.map(f => { const h = (P_.picks[f.id] || [])[s]; if (!h) return ""; const { d, c } = cardOf(p, h); return `<div class="hc">${cardHTML(c, d)}<span class="count">${esc(f.name)}</span></div>`; }).join("")}</div>`).join("")}
      <div class="row">${P_.step < P_.n - 1 ? `<button class="btn primary" id="progNext">${P_.step < 0 ? "Odkrýt 1. krok" : "Odkrýt další krok"}</button>` : ""}
      <button class="btn small" id="progEnd">Ukončit – karty odhodit</button><button class="btn small" id="progBack">Vrátit do rukou</button></div></section>` : `<button class="btn small danger" id="progBack">Zrušit a vrátit karty</button>`}`;
}
function sideAuction(p, t) {
  const cur = p.resources.find(r => r.id === p.marketCur);
  const A = t.auction, Z = t.sealed; const pl = players(p, t);
  const mode = S.aucMode || "open";
  const head = `<section><div class="eyebrow">Dražby a hlasování</div><div class="tools"><button data-aucm="open" aria-pressed="${mode === "open"}">Otevřená dražba</button><button data-aucm="bid" aria-pressed="${mode === "bid"}">Obálková</button><button data-aucm="vote" aria-pressed="${mode === "vote"}">Hlasování</button></div></section>`;
  if (mode === "open") {
    if (!A) return head + `<section><p class="hint">Hráči přihazují, dokud všichni kromě jednoho nepasují.${cur ? ` Vítěz zaplatí v měně „${esc(cur.name)}“.` : ""}</p>
      <label class="f">Co se draží<input type="text" id="aItem" placeholder="Např. karta z trhu, území, pořadí"></label>
      <label class="f">Vyvolávací cena<input type="number" id="aStart" value="0"></label><button class="btn primary" id="aGo">Zahájit dražbu</button></section>`;
    const active = pl.filter(f => !A.passed.includes(f.id)); const lf = p.factions.find(f => f.id === A.leader);
    const over = active.length <= 1 && (A.leader || active.length === 0);
    return head + `<section><div class="result"><span>${esc(A.item || "Dražba")}</span><b>${A.bid}</b><span>${lf ? "vede " + esc(lf.name) : "zatím bez nabídky"}</span></div>
      ${over ? `<div class="selbar"><b>${lf ? `Vítěz: ${esc(lf.name)} za ${A.bid}` : "Nikdo nepřihodil"}</b>${lf && cur ? `<button class="btn small primary" id="aPay">Zaplatit ${A.bid} × ${esc(cur.name)}</button>` : ""}</div>`
        : pl.map(f => A.passed.includes(f.id) ? `<div class="row"><span class="dot" style="background:${f.color};border-radius:50%"></span><span class="muted">${esc(f.name)} pasuje</span></div>`
          : `<div class="row"><span class="dot" style="background:${f.color};border-radius:50%"></span><b style="min-width:90px">${esc(f.name)}</b><button class="btn small" data-abid="${f.id}|1">+1</button><button class="btn small" data-abid="${f.id}|5">+5</button><button class="btn small" data-apass="${f.id}">Pas</button></div>`).join("")}
      <button class="btn small" id="aEnd">Ukončit dražbu</button></section>`;
  }
  if (!Z || Z.mode !== mode) return head + `<section><p class="hint">${mode === "bid" ? "Každý hráč tajně zadá nabídku, pak se všechny odkryjí najednou." : "Každý hráč tajně vybere jednu možnost, pak se hlasy sečtou."}</p>
      <label class="f">${mode === "bid" ? "Co se draží" : "Otázka"}<input type="text" id="zItem"></label>
      ${mode === "vote" ? `<label class="f">Možnosti (oddělené čárkou)<input type="text" id="zOpts" value="Ano, Ne"></label>` : ""}
      <button class="btn primary" id="zGo">Začít</button></section>`;
  const all = pl.every(f => Z.entries[f.id] != null);
  let res = "";
  if (Z.revealed) {
    if (mode === "bid") { const arr = pl.map(f => ({ f, v: +Z.entries[f.id] || 0 })).sort((a, b) => b.v - a.v); const top = arr[0];
      res = `<div class="score"><span></span><span class="hint">Hráč</span><span class="hint">Nabídka</span><span></span>${arr.map(x => `<span class="dot" style="background:${x.f.color};border-radius:50%"></span><b>${esc(x.f.name)}</b><span class="mono">${x.v}</span><span></span>`).join("")}</div>
        ${arr.length > 1 && arr[1].v === top.v ? `<p class="hint">Remíza – rozhodni podle pravidel.</p>` : `<div class="selbar"><b>Vítěz: ${esc(top.f.name)} za ${top.v}</b>${cur ? `<button class="btn small primary" id="zPay">Zaplatit ${top.v} × ${esc(cur.name)}</button>` : ""}</div>`}`; }
    else { const cnt = {}; Z.options.forEach(o => cnt[o] = 0); pl.forEach(f => { cnt[Z.entries[f.id]] = (cnt[Z.entries[f.id]] || 0) + 1; }); const mx = Math.max(...Object.values(cnt));
      res = `<div class="bars">${Object.entries(cnt).map(([o, n]) => `<div class="bar"><span class="n">${esc(o)}</span><span class="tr"><span class="fl" style="width:${pl.length ? Math.round(n / pl.length * 100) : 0}%"></span></span><span class="v">${n}${n === mx && n ? " ★" : ""}</span></div>`).join("")}</div>`; }
  }
  return head + `<section><div class="result"><span>${mode === "bid" ? "Obálková dražba" : "Hlasování"}</span><b style="font-size:1.1rem;font-family:var(--f-display)">${esc(Z.item || "–")}</b></div>
    ${pl.map(f => `<div class="row spread"><span class="row"><span class="dot" style="background:${f.color};border-radius:50%"></span><b>${esc(f.name)}</b></span>${Z.entries[f.id] != null ? `<span class="count">${Z.revealed ? esc(Z.entries[f.id]) : "zadáno ✓"}</span>` : `<button class="btn small" data-zent="${f.id}">Zadat tajně</button>`}</div>`).join("")}
    ${all && !Z.revealed ? `<button class="btn primary" id="zReveal">Odkrýt</button>` : ""}${res}
    <button class="btn small" id="zEnd">Ukončit</button></section>`;
}
function bagStats(b, s) { const cnt = b.contents.map(() => 0); s.in.forEach(i => cnt[i]++); return cnt; }
function sideBag(p, t) {
  if (!p.bags.length) return `<p class="hint">Sáčky vytvoříš v záložce Komponenty.</p>`;
  if (!S.bagId || !p.bags.find(b => b.id === S.bagId)) S.bagId = p.bags[0].id;
  const b = p.bags.find(x => x.id === S.bagId); const s = t.bags[b.id]; const cnt = bagStats(b, s); const n = s.in.length;
  const busts = s.out.filter(i => b.contents[i] && b.contents[i].bust).length; const bust = +b.bustLimit > 0 && busts >= +b.bustLimit;
  const chip = (i, attr) => { const c = b.contents[i]; return `<button class="chiptok" ${attr} style="background:${c.color};color:${inkFor(c.color)}" title="${esc(c.label)}">${esc(c.label.slice(0, 6))}</button>`; };
  return `<section><div class="eyebrow">Sáček</div><div class="fchips">${p.bags.map(x => `<button class="fchip" data-bag="${x.id}" aria-pressed="${x.id === b.id}">${esc(x.name)}</button>`).join("")}</div></section>
    <section><div class="eyebrow">V sáčku ${n} ${plural(n, "žeton", "žetony", "žetonů")}</div>
      <div class="bars">${b.contents.map((c, i) => `<div class="bar"><span class="n"><span class="dot" style="background:${c.color};border-radius:50%"></span> ${esc(c.label)}${c.bust ? " ⚠" : ""}</span><span class="tr"><span class="fl" style="width:${n ? Math.round(cnt[i] / n * 100) : 0}%;background:${c.color}"></span></span><span class="v">${cnt[i]} · ${n ? Math.round(cnt[i] / n * 100) : 0} %</span></div>`).join("")}</div>
      <div class="row"><label class="f" style="flex-direction:row;align-items:center;gap:6px">Táhnout <input type="number" id="bagN" min="1" max="20" value="${S.bagN || 1}" style="width:70px"></label><button class="btn primary" id="bagDraw" ${n ? "" : "disabled"}>Táhnout</button></div></section>
    <section><div class="eyebrow">Vytaženo (${s.out.length})${+b.bustLimit ? ` · riziko ${busts}/${b.bustLimit}` : ""}</div>
      ${bust ? `<div class="result" style="background:var(--danger)"><b style="font-size:1.2rem;font-family:var(--f-display)">Přetaženo!</b></div>` : ""}
      <div class="row">${s.out.map((i, k) => chip(i, `data-bagret="${k}"`)).join("") || `<span class="hint">Nic.</span>`}</div>
      ${s.out.length ? `<p class="hint">Klepnutím na žeton ho vrátíš do sáčku.</p>` : ""}
      <div class="row"><button class="btn small" id="bagRetAll" ${s.out.length ? "" : "disabled"}>Vrátit vše</button><button class="btn small" id="bagTrash" ${s.out.length ? "" : "disabled"}>Vyřadit vytažené ze hry</button><button class="btn small" id="bagReset">Výchozí obsah</button></div></section>
    <section><div class="eyebrow">Přidat do sáčku (bag building)</div><div class="row">${b.contents.map((c, i) => chip(i, `data-bagadd="${i}"`)).join("")}</div></section>`;
}
function sideDice(p, t) {
  const pool = S.pool; const std = pool.filter(d => d.type === "std"); const tally = {};
  pool.filter(d => d.type === "c").forEach(d => { const cd = p.cdice.find(x => x.id === d.id); const f = cd ? cd.faces[d.v] : ""; if (f && faceNum(f) == null) tally[f] = (tally[f] || 0) + 1; });
  const ps = poolSummary(pool, S.diceMod || 0, p.cdice);
  return `<section><div class="eyebrow">Kostky</div>
    <div class="row"><label class="f" style="flex-direction:row;align-items:center;gap:8px">Počet <input type="number" id="diceN" min="1" max="20" value="${S.diceN || 2}" style="width:70px"></label>
      <label class="chk"><input type="checkbox" id="diceAdd" ${S.diceAdd ? "checked" : ""}> Přidávat k hodu (různé kostky najednou)</label></div>
    <div class="dice-btns">${DIE_SIDES.map(s => `<button class="btn small" data-roll="${s}" ${s === 100 ? 'title="Procentová kostka 1–100"' : ""}>${dieLabel(s)}</button>`).join("")}</div>
    <div class="row"><label class="f" style="flex-direction:row;align-items:center;gap:8px">Stěn <input type="number" id="diceS" min="2" max="1000" value="${S.diceS || 7}" style="width:80px"></label><button class="btn small" id="rollS">Hodit</button></div>
    <div class="row"><input type="text" id="diceExpr" value="${esc(S.diceExpr || "")}" placeholder="${p.cdice[0] ? `např. 2k6 + 2× ${esc(p.cdice[0].name)}` : "např. 2k6+k8+3"}" aria-label="Zápis hodu" style="flex:1;min-width:120px"><button class="btn small primary" id="rollExpr">Hodit</button></div></section>
    ${diceDraftHTML(p, t)}
    ${p.cdice.length ? `<section><div class="eyebrow">Vlastní kostky – přidat do hodu</div><div class="row">${p.cdice.map(d => `<button class="btn small" data-cdie="${d.id}"><span class="dot" style="background:${d.color}"></span>${esc(d.name)} <span class="count">${d.faces.length} st.</span></button>`).join("")}</div></section>` : ""}
    <section><div class="eyebrow">Hod${S.rerolls ? ` · přehozeno ${S.rerolls}×` : ""}</div>
      <div class="dice-out" aria-live="polite">${pool.map((d, i) => { if (d.type === "std") return `<button class="die ${d.lock ? "lock" : ""} ${S.justRolled && !d.lock ? "roll" : ""} ${String(d.v).length > 2 ? "wide" : ""}" data-lock="${i}">${d.v}<small>${dieLabel(d.s)}</small></button>`;
        const cd = p.cdice.find(x => x.id === d.id); if (!cd) return ""; return `<button class="die cust ${d.lock ? "lock" : ""} ${S.justRolled && !d.lock ? "roll" : ""}" data-lock="${i}" style="--c:${cd.color};color:${inkFor(cd.color)}">${esc(cd.faces[d.v]) || "·"}</button>`; }).join("") || `<span class="hint">Zatím se neházelo.</span>`}</div>
      ${ps && ps.nums && (ps.nums > 1 || S.diceMod) ? `<span class="mono">${esc(ps.expr)} = <b>${ps.sum}</b></span>` : ""}
      ${Object.keys(tally).length ? `<span class="mono">${Object.entries(tally).map(([f, n]) => `${esc(f)} ×${n}`).join(" · ")}</span>` : ""}
      ${pool.length ? `<p class="hint">Klepnutím kostku zamkneš (odložíš stranou), zbytek můžeš přehodit.</p><div class="row"><button class="btn small primary" id="reroll">Přehodit nezamčené</button><button class="btn small" id="poolClear">Vyprázdnit</button></div>` : ""}
      ${S.diceLog.length ? `<div class="log">${S.diceLog.map(l => `<span>${esc(l)}</span>`).join("")}</div>` : ""}</section>`;
}
function crtColumn(att, def, cols) {
  const ratio = def > 0 ? att / def : Infinity; let idx = -1;
  cols.forEach((c, i) => { const [a, b] = String(c).split(":").map(Number); if (a > 0 && b > 0 && ratio >= a / b - 1e-9) idx = i; });
  return idx;
}
function ratioText(att, def) { if (!def) return "∞"; if (!att) return "0"; return att >= def ? `${Math.floor(att / def)}:1` : `1:${Math.ceil(def / att)}`; }
function combatCalc(p) {
  const C = S.combat; const ter = p.terrains.find(x => x.id === C.terrainId) || p.terrains[0];
  const defEff = Math.round((+C.def || 0) * (ter ? +ter.def || 1 : 1) * 10) / 10;
  const base = crtColumn(+C.att || 0, defEff, p.crt.cols);
  const col = Math.max(0, Math.min(p.crt.cols.length - 1, (base < 0 ? 0 : base) + (+C.shift || 0)));
  return { defEff, base, col };
}
function sideCombat(p, t) {
  const C = S.combat; const { defEff, base, col } = combatCalc(p);
  return `<section><div class="eyebrow">Způsob boje</div><div class="tools"><button data-cmode="crt" aria-pressed="${C.mode === "crt"}">Bojová tabulka</button><button data-cmode="dice" aria-pressed="${C.mode === "dice"}">Kostky</button></div></section>
    ${C.mode === "crt" ? `<section>
      <div class="grid" style="grid-template-columns:1fr 1fr">
        <label class="f">Síla útoku<input type="number" id="cAtt" value="${C.att}"></label>
        <label class="f">Síla obrany<input type="number" id="cDef" value="${C.def}"></label></div>
      <label class="f">Terén obránce<select id="cTer">${p.terrains.map(x => `<option value="${x.id}" ${x.id === C.terrainId ? "selected" : ""}>${esc(x.name)} (×${x.def})</option>`).join("")}</select></label>
      <label class="f">Posun sloupce (podpora, překvapení…)<select id="cShift">${[-3, -2, -1, 0, 1, 2, 3].map(n => `<option value="${n}" ${n === +C.shift ? "selected" : ""}>${n > 0 ? "+" + n : n}</option>`).join("")}</select></label>
      <div class="hint">Obrana po terénu: <b class="mono">${defEff}</b> · poměr <b class="mono">${ratioText(+C.att || 0, defEff)}</b> → sloupec <b class="mono">${esc(p.crt.cols[col])}</b>${base < 0 ? " (pod nejnižším poměrem)" : ""}</div>
      <button class="btn primary" id="cRoll">Hodit k${p.crt.rows.length} a vyhodnotit</button>
      ${C.res ? `<div class="result"><span>Hod ${C.res.roll} · sloupec ${esc(C.res.col)}</span><b>${esc(C.res.out || "–")}</b><span style="font-size:.85rem">${esc(legendFor(p, C.res.out))}</span></div>` : ""}
      <div style="overflow-x:auto"><table class="crt-tab"><thead><tr><th></th>${p.crt.cols.map((c, i) => `<th class="${i === col ? "hl" : ""}">${esc(c)}</th>`).join("")}</tr></thead>
        <tbody>${p.crt.rows.map((r, ri) => `<tr><th class="${C.res && C.res.roll === ri + 1 ? "hl" : ""}">${ri + 1}</th>${r.map((v, ci) => `<td class="${C.res && C.res.roll === ri + 1 && ci === C.res.ci ? "hl" : ""}">${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
      <button class="btn small" id="cClear">Vynulovat</button></section>`
    : `<section>
      <div class="grid" style="grid-template-columns:1fr 1fr">
        <label class="f">Kostek útočník<input type="number" id="cAD" min="0" max="20" value="${C.aDice}"></label>
        <label class="f">Kostek obránce<input type="number" id="cDD" min="0" max="20" value="${C.dDice}"></label></div>
      <div class="hint">Kostky k${+p.dice.sides || 6}: zásah útočníka na ${p.dice.aHit}+, obránce na ${p.dice.dHit}+ (změníš v Mechanikách).</div>
      <button class="btn primary" id="cRollD">Hodit</button>
      ${C.dres ? `<div class="eyebrow">Útočník – ${C.dres.aHits} ${plural(C.dres.aHits, "zásah", "zásahy", "zásahů")}</div><div class="dice-out">${C.dres.a.map(v => `<span class="die roll ${v >= p.dice.aHit ? "hit" : "miss"}">${v}</span>`).join("")}</div>
        <div class="eyebrow">Obránce – ${C.dres.dHits} ${plural(C.dres.dHits, "zásah", "zásahy", "zásahů")}</div><div class="dice-out">${C.dres.d.map(v => `<span class="die roll ${v >= p.dice.dHit ? "hit" : "miss"}">${v}</span>`).join("")}</div>` : ""}
      </section>`}
    ${p.units.length ? warPanelHTML(p, t) : ""}
    ${C.log.length ? `<section><div class="eyebrow">Záznam bojů</div><div class="log">${C.log.map(l => `<span>${esc(l)}</span>`).join("")}</div></section>` : ""}
    <p class="hint">Vyber jednotku na stole a stiskni „Útočí“, „+ k útoku“ nebo „Brání“ – hodnoty a terén se doplní samy.</p>`;
}
function legendFor(p, out) { if (!out) return ""; const line = (p.crt.legend || "").split(/\r?\n/).find(l => l.trim().toUpperCase().startsWith(String(out).toUpperCase())); return line ? line.trim().replace(/^\S+\s*[–-]?\s*/, "") : ""; }
function territoryScore(p, t) {
  const b = tableBoard(p); const res = p.factions.map(f => ({ f, n: 0, vp: 0 }));
  Object.entries(t.control).forEach(([k, fid]) => { const r = res.find(x => x.f.id === fid); if (!r) return; r.n++; const ter = b ? terrainOf(p, b, k) : null; r.vp += ter ? (+ter.vp || 0) : 0; });
  return res;
}
function sideTerritory(p, t) {
  const b = tableBoard(p);
  if (!b) return `<p class="hint">Kontrola území potřebuje mapu. Vyber ji v nástroji Komponenty.</p>`;
  const sc = territoryScore(p, t); const town = p.terrains.find(x => +x.vp > 0);
  return `<section><div class="eyebrow">Kontrola území</div>
      <button class="btn ${S.ctrlMode ? "on" : ""}" id="ctrlMode">${S.ctrlMode ? "Režim kontroly zapnutý" : "Zapnout režim kontroly"}</button>
      <p class="hint">${S.ctrlMode ? "Klepnutím na pole mapy přidělíš vlastníka" : "V režimu kontroly klepnutím na pole střídáš vlastníka"}: nikdo → ${p.factions.map(f => esc(f.name)).join(" → ")} → nikdo.</p>
      <label class="f">Nebo vždy přidělit<select id="ctrlPaint"><option value="">Střídat postupně</option>${p.factions.map(f => `<option value="${f.id}" ${S.ctrlPaint === f.id ? "selected" : ""}>${esc(f.name)}</option>`).join("")}<option value="none" ${S.ctrlPaint === "none" ? "selected" : ""}>Nikomu (mazat)</option></select></label></section>
    <section><div class="eyebrow">Stav</div>
      <div class="score"><span></span><span class="hint">Strana</span><span class="hint">Polí</span><span class="hint">Body</span>
      ${sc.map(r => `<span class="dot" style="background:${r.f.color}"></span><b>${esc(r.f.name)}</b><span class="mono">${r.n}</span><span class="mono">${r.vp}</span>`).join("")}</div>
      <p class="hint">Body se počítají z terénu${town ? ` (např. ${esc(town.name).toLowerCase()} = ${town.vp})` : ""}. Upravíš v záložce Mapa.</p>
      <div class="row"><button class="btn small" id="ctrlAuto">Přidělit pole podle jednotek</button><button class="btn small danger" id="ctrlClear">Vymazat kontrolu</button></div></section>
    ${productionHTML(p, t)}${majHTML(p, t)}${routeHTML(p, t)}`;
}

function wireTable(main, p, t) {
  const save = () => { if (onlineBlocked(p)) { p.table = JSON.parse(S.undoBase); render(); return; } const now = JSON.stringify(p.table); if (S.undoBase && now !== S.undoBase) { S.undo.push(S.undoBase); if (S.undo.length > 40) S.undo.shift(); } S.undoBase = now; touch(p); };
  const on = (sel, fn) => $$(sel, main).forEach(el => el.addEventListener("click", () => fn(el)));
  const q = id => document.getElementById(id);
  const pl = players(p, t); const cp = curPlayer(p, t);
  const nextP = () => { if (pl.length) t.curF = (t.curF + 1) % pl.length; t.acts = 0; t.moved = {}; };
  const C = S.combat;
  if (q("undo")) q("undo").onclick = () => { if (!S.undo.length) return; p.table = JSON.parse(S.undo.pop()); S.undoBase = null; S.sel = null; touch(p); render(); toast("Vráceno o krok zpět"); };
  on("[data-tool]", el => { S.tool = el.dataset.tool; if (S.tool !== "uzemi") S.ctrlMode = false; render(); });
  on("[data-curf]", el => { t.curF = +el.dataset.curf; save(); render(); });
  // komponenty
  if (q("tBoard")) q("tBoard").onchange = () => { const v = q("tBoard").value; if (v.startsWith("net:")) { t.netId = v.slice(4); t.boardId = null; } else { t.boardId = v || null; t.netId = null; } S.rangeUid = null; save(); render(); };
  if (q("snap")) q("snap").onchange = () => { S.snap = q("snap").checked; };
  on("[data-addunit]", el => { const pos = freeSpot(t, 56, 56); const it = { uid: uid(), kind: "unit", unitId: el.dataset.addunit, x: pos.x, y: pos.y, reduced: false, rot: 0 }; t.items.push(it); S.sel = it.uid; save(); render(); });
  on("[data-draw],[data-drawdown]", el => { const dId = el.dataset.draw || el.dataset.drawdown; if (!gate(p, t, "lizat")) return; const cId = t.piles[dId].pop(); if (!cId) return; after(p, t, "lizat", (cp || {}).id); const pos = freeSpot(t); const it = { uid: uid(), kind: "card", deckId: dId, cardId: cId, x: pos.x, y: pos.y, faceUp: !!el.dataset.draw, rot: 0 }; t.items.push(it); S.sel = it.uid; save(); render(); });
  on("[data-deal]", el => {
    const dId = el.dataset.deal;
    const d = openDialog(`<h2>Rozdat karty do rukou</h2><label class="f">Kolik karet každému hráči<input type="number" id="dealN" min="1" max="20" value="3"></label><p class="hint">Hráči: ${p.factions.map(f => esc(f.name)).join(", ")}</p><div class="row" style="justify-content:flex-end"><button class="btn" data-close>Zrušit</button><button class="btn primary" id="dealOk">Rozdat</button></div>`);
    $("#dealOk", d).onclick = () => { const n = Math.max(1, parseInt($("#dealN", d).value, 10) || 1); let dealt = 0; for (let k = 0; k < n; k++) p.factions.forEach(f => { const c = t.piles[dId].pop(); if (c) { (t.hands[f.id] = t.hands[f.id] || []).push({ deckId: dId, cardId: c }); dealt++; } }); closeDialog(); save(); S.tool = "ruce"; S.showHand = false; render(); toast(`Rozdáno ${dealt} ${plural(dealt, "karta", "karty", "karet")}`); };
  });
  on("[data-reshuffle]", el => { const id = el.dataset.reshuffle; t.piles[id] = shuffle([...t.piles[id], ...t.discard[id]]); t.discard[id] = []; save(); render(); toast("Odhazovací balíček zamíchán zpět"); });
  on("[data-addtok]", el => { const pos = freeSpot(t, 56, 66); const it = { uid: uid(), kind: "token", tokenId: el.dataset.addtok, x: pos.x, y: pos.y, value: 0, rot: 0 }; t.items.push(it); S.sel = it.uid; save(); render(); });
  if (q("resetTable")) q("resetTable").onclick = () => confirmDialog("Připravit novou hru?", "Karty se vrátí do balíčků a zamíchají, startovní balíčky se rozdají znovu, jednotky a žetony zmizí, zdroje se nastaví na začátek. Krok jde vrátit tlačítkem Zpět.", "Připravit", () => { const bId = t.boardId; p.table = null; S.sel = null; S.rangeUid = null; ensureTable(p).boardId = bId; save(); render(); toast("Stůl je připravený"); });
  // kolo
  if (q("turnNext")) q("turnNext").onclick = () => { newRound(p, t); save(); render(); };
  if (q("turnPrev")) q("turnPrev").onclick = () => { t.turn = Math.max(1, t.turn - 1); save(); render(); };
  if (q("phaseNext")) q("phaseNext").onclick = () => { t.phaseIdx++; if (t.phaseIdx >= p.phases.length) { newRound(p, t); toast(`Kolo ${t.turn}`); } else { logEv(t, `fáze ${p.phases[t.phaseIdx]}`); fireTriggers(p, t, "faze", (cp || {}).id, t.phaseIdx); } save(); render(); };
  if (q("nextPlayer")) q("nextPlayer").onclick = () => endTurn(p, t, () => { save(); render(); });
  if (q("tStart")) q("tStart").onclick = () => { const len = Math.max(5, +q("tLen").value || 60); S.tLen = len; t.timer = { len, end: Date.now() + len * 1000 }; S.timerFired = false; save(); render(); };
  if (q("tStop")) q("tStop").onclick = () => { t.timer = null; save(); render(); };
  if (q("ordRand")) q("ordRand").onclick = () => { t.order = shuffle(p.factions.map(f => f.id)); t.curF = 0; save(); render(); toast("Pořadí zamícháno"); };
  if (q("ordScore")) q("ordScore").onclick = () => { t.order = [...p.factions].sort((a, b) => scoreOf(p, t, a.id).total - scoreOf(p, t, b.id).total).map(f => f.id); t.curF = 0; save(); render(); };
  if (q("ordReset")) q("ordReset").onclick = () => { t.order = null; t.curF = 0; save(); render(); };
  if (q("clockRun")) q("clockRun").onclick = () => { const c = t.clock; if (c.run) { c.acc += Date.now() - c.start; c.run = false; } else { c.start = Date.now(); c.run = true; } save(); render(); };
  if (q("clockReset")) q("clockReset").onclick = () => { t.clock = { run: false, start: 0, acc: 0 }; save(); render(); };
  if (q("logGame")) q("logGame").onclick = () => editSession(p, null, true);
  // hráči a zdroje
  on("[data-plf]", el => { S.plF = el.dataset.plf; render(); });
  on("[data-res]", el => { const [o, rid, dv] = el.dataset.res.split("|"); const r = p.resources.find(x => x.id === rid); t.res[o] = t.res[o] || {}; t.res[o][rid] = Math.max(0, Math.min(resMax(r), (t.res[o][rid] || 0) + +dv)); save(); render(); });
  if (q("income")) q("income").onclick = () => { p.resources.forEach(r => { if (!+r.income) return; (r.global ? ["_g"] : p.factions.map(f => f.id)).forEach(o => { t.res[o] = t.res[o] || {}; t.res[o][r.id] = Math.min(resMax(r), (t.res[o][r.id] || 0) + +r.income); }); }); save(); render(); toast("Příjem připsán"); };
  on("[data-own]", el => { if (!gate(p, t, "lizat")) return; const fid = el.dataset.ownf || S.plF; const r = drawOwn(t, fid, +el.dataset.own); save(); render(); toast(r.k ? `Líznuto ${r.k}${r.re ? " – odhoz zamíchán do balíčku" : ""}` : "Vlastní balíček i odhoz jsou prázdné"); });
  if (q("cleanup")) q("cleanup").onclick = () => { const f = S.plF; [...(t.hands[f] || []), ...(t.tableau[f] || [])].forEach(h => discardCard(t, h, f)); t.hands[f] = []; t.tableau[f] = []; save(); render(); toast("Ruka a vyložené karty jsou v odhozu"); };
  on("[data-tabhand]", el => { const h = t.tableau[S.plF].splice(+el.dataset.tabhand, 1)[0]; (t.hands[S.plF] = t.hands[S.plF] || []).push(h); save(); render(); });
  on("[data-tabdisc]", el => { const h = t.tableau[S.plF].splice(+el.dataset.tabdisc, 1)[0]; discardCard(t, h, S.plF); save(); render(); });
  // trh
  const takeMarket = (key, dest) => {
    const [dId, i] = key.split("|"); const d = p.decks.find(x => x.id === dId); const cId = t.market[dId][+i]; if (!cId || !cp) return;
    const cat = dest === "buy" ? "nakup" : dest === "hand" ? "lizat" : "vylozit"; if (!gate(p, t, cat)) return;
    const c = d.cards.find(x => x.id === cId);
    if (dest === "buy") { const cur = p.resources.find(r => r.id === p.marketCur); const price = parseFloat(c.cost) || 0;
      if (cur && price) { const have = (t.res[cp.id] || {})[cur.id] || 0; if (have < price) { toast(`${cp.name} nemá dost (${have} z ${price})`); return; } t.res[cp.id][cur.id] = have - price; } }
    t.market[dId][+i] = null; const h = { deckId: dId, cardId: cId, own: true };
    if (dest === "buy") (t.pdisc[cp.id] = t.pdisc[cp.id] || []).push(h); else if (dest === "hand") (t.hands[cp.id] = t.hands[cp.id] || []).push(h); else (t.tableau[cp.id] = t.tableau[cp.id] || []).push(h);
    logEv(t, `${cp.name} ${dest === "buy" ? "kupuje" : "bere"} ${c.title}`);
    if (dest === "tab" && c.effect) runEffects(p, t, cp.id, c.effect, c.title);
    refillMarket(p, t, d); after(p, t, cat, cp.id, c.type); save(); render(); toast(`${c.title} → ${cp.name}`);
  };
  if (q("mAuc")) q("mAuc").onchange = e => { p.marketAuction = e.target.checked; touch(p); render(); };
  on("[data-mauc]", el => { const [dId, i] = el.dataset.mauc.split("|"); const d = p.decks.find(x => x.id === dId); const c = d.cards.find(x => x.id === t.market[dId][+i]); if (!c || !gate(p, t, "nakup")) return;
    t.auction = { item: c.title, bid: parseFloat(c.cost) || 0, leader: null, passed: [], card: { dId, i: +i } }; S.tool = "drazba"; S.aucMode = "open"; save(); render(); });
  on("[data-mbuy]", el => takeMarket(el.dataset.mbuy, "buy")); on("[data-mhand]", el => takeMarket(el.dataset.mhand, "hand")); on("[data-mtab]", el => takeMarket(el.dataset.mtab, "tab"));
  on("[data-mrefresh]", el => { const d = p.decks.find(x => x.id === el.dataset.mrefresh); t.market[d.id].forEach(c => { if (c) t.discard[d.id].push(c); }); t.market[d.id] = []; refillMarket(p, t, d); save(); render(); });
  // akce a rondel
  if (q("autoNext")) q("autoNext").onchange = e => { S.autoNext = e.target.checked; };
  on("[data-slot]", el => {
    const a = el.dataset.slot, si = +el.dataset.si; const arr = t.actionsTaken[a] = t.actionsTaken[a] || [];
    if (arr[si]) arr[si] = null; else { if (!cp || !gate(p, t, "akce")) return; arr[si] = cp.id; const ac = p.actions.find(x => x.id === a) || {}; const an = ac.name; logEv(t, `${cp.name} → ${an}`); if (ac.effect) runEffects(p, t, cp.id, ac.effect, an); after(p, t, "akce", cp.id, an); if (S.autoNext !== false) nextP(); }
    save(); render();
  });
  if (q("actClear")) q("actClear").onclick = () => { t.actionsTaken = {}; save(); render(); };
  on("[data-rond]", el => {
    if (!cp || !gate(p, t, "akce")) return; const i = +el.dataset.rond; const n = p.actions.length; const pos = t.rondel[cp.id];
    const steps = pos == null ? 0 : (i - pos + n) % n;
    if (pos != null && steps === 0) { toast("Figurka se musí posunout aspoň o 1 pole"); return; }
    const extra = Math.max(0, steps - (+p.rondel.free || 0));
    const payR = p.resources.find(r => r.id === p.rondel.pay);
    if (extra && payR) { const have = (t.res[cp.id] || {})[payR.id] || 0; if (have < extra) { toast(`${cp.name} nemá na ${extra} ${plural(extra, "krok", "kroky", "kroků")} navíc`); return; } t.res[cp.id][payR.id] = have - extra; }
    t.rondel[cp.id] = i; const name = cp.name; logEv(t, `${name} → ${p.actions[i].name} (rondel)`); if (p.actions[i].effect) runEffects(p, t, cp.id, p.actions[i].effect, p.actions[i].name); after(p, t, "akce", cp.id, p.actions[i].name); if (S.autoNext !== false) nextP(); save(); render();
    toast(`${name} → ${p.actions[i].name}${extra ? ` (${extra} ${plural(extra, "krok", "kroky", "kroků")} navíc${payR ? ", zaplaceno" : ""})` : ""}`);
  });
  // ruce
  on("[data-handf]", el => { S.handF = el.dataset.handf; S.showHand = false; render(); });
  if (q("showHand")) q("showHand").onclick = () => { S.showHand = true; render(); };
  if (q("hideHand")) q("hideHand").onclick = () => { S.showHand = false; render(); };
  on("[data-hdraw]", el => { if (!gate(p, t, "lizat")) return; const c = t.piles[el.dataset.hdraw].pop(); if (!c) return; after(p, t, "lizat", S.handF); (t.hands[S.handF] = t.hands[S.handF] || []).push({ deckId: el.dataset.hdraw, cardId: c }); save(); render(); toast("Karta je v ruce"); });
  on("[data-hplay]", el => { if (!playCheck(p, t, S.handF, t.hands[S.handF][+el.dataset.hplay], "zahrat")) return; const h = t.hands[S.handF].splice(+el.dataset.hplay, 1)[0]; playDone(p, t, S.handF, h, "zahrat"); const pos = freeSpot(t); t.items.push({ uid: uid(), kind: "card", deckId: h.deckId, cardId: h.cardId, x: pos.x, y: pos.y, faceUp: true, rot: 0 }); save(); render(); });
  on("[data-htab]", el => { if (!playCheck(p, t, S.handF, t.hands[S.handF][+el.dataset.htab], "vylozit")) return; const h = t.hands[S.handF].splice(+el.dataset.htab, 1)[0]; playDone(p, t, S.handF, h, "vylozit"); (t.tableau[S.handF] = t.tableau[S.handF] || []).push(h); save(); render(); });
  on("[data-hdisc]", el => { const h = t.hands[S.handF].splice(+el.dataset.hdisc, 1)[0]; discardCard(t, h, S.handF); save(); render(); });
  // draft
  if (q("dStart")) q("dStart").onclick = () => {
    const dId = q("dDeck").value, n = Math.max(1, parseInt(q("dN").value, 10) || 1), dir = +q("dDir").value;
    const packs = p.factions.map(() => { const pk = []; for (let k = 0; k < n; k++) { const c = t.piles[dId].pop(); if (c) pk.push(c); } return pk; });
    t.draft = { deckId: dId, packs, picks: {}, seat: 0, round: 1, dir, picked: 0 }; save(); render();
  };
  if (q("dShow")) q("dShow").onclick = () => draftPickDialog(p, t, save);
  if (q("dCancel")) q("dCancel").onclick = () => confirmDialog("Zrušit draft?", "Všechny karty z draftu se vrátí do balíčku a zamíchají.", "Zrušit draft", () => { const D = t.draft; D.packs.forEach(pk => t.piles[D.deckId].push(...pk)); Object.values(D.picks).forEach(pk => t.piles[D.deckId].push(...pk)); shuffle(t.piles[D.deckId]); t.draft = null; save(); render(); });
  if (q("dToHands")) q("dToHands").onclick = () => { const D = t.draft; Object.entries(D.picks).forEach(([fid, cs]) => { (t.hands[fid] = t.hands[fid] || []).push(...cs.map(c => ({ deckId: D.deckId, cardId: c }))); }); t.draft = null; S.tool = "ruce"; S.showHand = false; save(); render(); toast("Výběry jsou v rukou hráčů"); };
  // štychy
  if (q("trump")) q("trump").onchange = e => { t.trump = e.target.value; save(); render(); };
  if (q("follow")) q("follow").onchange = e => { t.follow = e.target.checked; save(); };
  if (q("playTrick")) q("playTrick").onclick = () => pickFromHand(p, t, cp, {
    title: `${cp.name} vynáší`, n: 1,
    allowed: h => { if (t.follow === false || !t.trick.length) return true; const lead = cardOf(p, t.trick[0]).c.suit; const hasLead = (t.hands[cp.id] || []).some(x => cardOf(p, x).c.suit === lead); return !hasLead || cardOf(p, h).c.suit === lead; },
    done: picks => { t.trick.push({ ...picks[0], fid: cp.id }); nextP(); save(); render(); },
  });
  if (q("takeTrick")) q("takeTrick").onclick = () => { const w = trickWinner(p, t); t.won[w.fid] = (t.won[w.fid] || 0) + 1; t.trick.forEach(h => discardCard(t, h, h.fid)); t.trick = []; const wi = pl.findIndex(f => f.id === w.fid); if (wi >= 0) t.curF = wi; save(); render(); toast("Štych sebrán – vítěz vynáší"); };
  if (q("trickReset")) q("trickReset").onclick = () => { t.won = {}; save(); render(); };
  // programování
  if (q("progStart")) q("progStart").onclick = () => { const n = Math.max(1, Math.min(6, +q("progN").value || 1)); S.progN = n; t.prog = { n, picks: {}, step: -1 }; save(); render(); };
  on("[data-prog]", el => { const f = p.factions.find(x => x.id === el.dataset.prog); pickFromHand(p, t, f, { title: `${f.name} vybírá tajně`, n: t.prog.n, done: picks => { t.prog.picks[f.id] = picks; save(); render(); toast("Uloženo. Předej iPad dalšímu."); } }); });
  if (q("progNext")) q("progNext").onclick = () => { t.prog.step++; save(); render(); };
  if (q("progEnd")) q("progEnd").onclick = () => { Object.entries(t.prog.picks).forEach(([fid, hs]) => hs.forEach(h => discardCard(t, h, fid))); t.prog = null; save(); render(); };
  if (q("progBack")) q("progBack").onclick = () => { Object.entries(t.prog.picks).forEach(([fid, hs]) => (t.hands[fid] = t.hands[fid] || []).push(...hs)); t.prog = null; save(); render(); };
  // dražby
  on("[data-aucm]", el => { S.aucMode = el.dataset.aucm; render(); });
  if (q("aGo")) q("aGo").onclick = () => { t.auction = { item: q("aItem").value.trim(), bid: +q("aStart").value || 0, leader: null, passed: [] }; save(); render(); };
  on("[data-abid]", el => { const [fid, dv] = el.dataset.abid.split("|"); const A = t.auction; A.bid += +dv; A.leader = fid; save(); render(); });
  on("[data-apass]", el => { t.auction.passed.push(el.dataset.apass); save(); render(); });
  const pay = (fid, v) => { const cur = p.resources.find(r => r.id === p.marketCur); if (!cur) return; t.res[fid] = t.res[fid] || {}; t.res[fid][cur.id] = (t.res[fid][cur.id] || 0) - v; toast(`Zaplaceno ${v} × ${cur.name}`); };
  if (q("aPay")) q("aPay").onclick = () => { const A = t.auction; pay(A.leader, A.bid);
    if (A.card) { const d = p.decks.find(x => x.id === A.card.dId); const cId = d && t.market[d.id][A.card.i]; const c = cId && d.cards.find(x => x.id === cId);
      if (c) { t.market[d.id][A.card.i] = null; const h = { deckId: d.id, cardId: cId, own: true }; const f = p.factions.find(x => x.id === A.leader);
        if (p.decks.some(x => x.starter)) (t.pdisc[A.leader] = t.pdisc[A.leader] || []).push(h); else { (t.tableau[A.leader] = t.tableau[A.leader] || []).push(h); if (c.effect) runEffects(p, t, A.leader, c.effect, c.title); }
        logEv(t, `${f ? f.name : ""} vydražil ${c.title} za ${A.bid}`); refillMarket(p, t, d); after(p, t, "nakup", A.leader, c.type); } }
    t.auction = null; save(); render(); };
  if (q("aEnd")) q("aEnd").onclick = () => { t.auction = null; save(); render(); };
  if (q("zGo")) q("zGo").onclick = () => { t.sealed = { mode: S.aucMode, item: q("zItem").value.trim(), options: q("zOpts") ? q("zOpts").value.split(",").map(s => s.trim()).filter(Boolean) : [], entries: {}, revealed: false }; save(); render(); };
  on("[data-zent]", el => {
    const f = p.factions.find(x => x.id === el.dataset.zent); const Z = t.sealed;
    const d = openDialog(`<h2>${esc(f.name)} – tajně</h2><p class="hint">Ostatní ať se nedívají.</p>${Z.mode === "bid" ? `<input type="number" id="zVal" value="0" aria-label="Nabídka"><div class="row" style="justify-content:flex-end"><button class="btn" data-close>Zrušit</button><button class="btn primary" id="zOk">Potvrdit</button></div>`
      : `<div class="row">${Z.options.map((o, i) => `<button class="btn" data-zopt="${i}">${esc(o)}</button>`).join("")}</div>`}`);
    const fin = v => { Z.entries[f.id] = v; closeDialog(); save(); render(); toast("Uloženo. Předej iPad dalšímu."); };
    if ($("#zOk", d)) { $("#zVal", d).focus(); $("#zOk", d).onclick = () => fin(+$("#zVal", d).value || 0); }
    $$("[data-zopt]", d).forEach(b => b.onclick = () => fin(Z.options[+b.dataset.zopt]));
  });
  if (q("zReveal")) q("zReveal").onclick = () => { t.sealed.revealed = true; save(); render(); };
  if (q("zPay")) q("zPay").onclick = () => { const Z = t.sealed; const top = pl.map(f => ({ f, v: +Z.entries[f.id] || 0 })).sort((a, b) => b.v - a.v)[0]; pay(top.f.id, top.v); t.sealed = null; save(); render(); };
  if (q("zEnd")) q("zEnd").onclick = () => { t.sealed = null; save(); render(); };
  // sáček
  on("[data-bag]", el => { S.bagId = el.dataset.bag; render(); });
  const bs = () => t.bags[S.bagId];
  if (q("bagN")) q("bagN").onchange = e => { S.bagN = Math.max(1, +e.target.value || 1); };
  if (q("bagDraw")) q("bagDraw").onclick = () => { if (!gate(p, t, "sacek")) return; const n = Math.max(1, +q("bagN").value || 1); S.bagN = n; const s = bs(); shuffle(s.in); const got = []; for (let i = 0; i < n && s.in.length; i++) { const x = s.in.pop(); s.out.push(x); got.push(x); }
    const bg = p.bags.find(b => b.id === S.bagId); logEv(t, `${(cp || {}).name || ""} táhne ze sáčku: ${got.map(x => bg.contents[x].label).join(", ")}`); got.forEach(x => fireTriggers(p, t, "sacek", (cp || {}).id, bg.contents[x].label)); after(p, t, "sacek", (cp || {}).id); save(); render(); };
  on("[data-bagret]", el => { const s = bs(); s.in.push(s.out.splice(+el.dataset.bagret, 1)[0]); save(); render(); });
  if (q("bagRetAll")) q("bagRetAll").onclick = () => { const s = bs(); s.in.push(...s.out); s.out = []; save(); render(); };
  if (q("bagTrash")) q("bagTrash").onclick = () => { bs().out = []; save(); render(); toast("Vytažené žetony vyřazeny"); };
  if (q("bagReset")) q("bagReset").onclick = () => { t.bags[S.bagId] = bagFresh(p.bags.find(b => b.id === S.bagId)); save(); render(); };
  on("[data-bagadd]", el => { bs().in.push(+el.dataset.bagadd); save(); render(); toast("Žeton přidán do sáčku"); });
  // kostky
  if (q("diceN")) q("diceN").onchange = e => { S.diceN = Math.max(1, Math.min(12, parseInt(e.target.value, 10) || 1)); };
  const logPool = () => { const std = S.pool.filter(d => d.type === "std"); const cust = S.pool.filter(d => d.type === "c").map(d => { const cd = p.cdice.find(x => x.id === d.id); return cd ? (cd.faces[d.v] || "·") : ""; }); const ps = poolSummary(S.pool, S.diceMod || 0, p.cdice); if (!ps) return;
    const vals = [...std.map(d => d.v), ...cust].join(", ");
    S.diceLog.unshift(`${ps.expr}: ${vals}${ps.nums > 1 || S.diceMod ? " = " + ps.sum : ""}`); S.diceLog = S.diceLog.slice(0, 10);
    logEv(t, `hod ${ps.expr}: ${vals}${ps.nums ? " = " + ps.sum : ""}`); };
  const diceN = () => { const n = Math.max(1, Math.min(20, parseInt(q("diceN").value, 10) || 1)); S.diceN = n; return n; };
  const rollStd = (list, mod, custom = []) => { if (!gate(p, t, "kostky")) return; const add = S.diceAdd && mod == null; if (!add) { S.pool = []; S.diceMod = mod || 0; S.rerolls = 0; }
    list.forEach(s => S.pool.push({ type: "std", s, v: rnd(s), lock: false }));
    custom.forEach(id => { const cd = p.cdice.find(x => x.id === id); if (cd) S.pool.push({ type: "c", id, v: rnd(cd.faces.length) - 1, lock: false }); }); logPool(); S.justRolled = true; render(); };
  on("[data-roll]", el => { const s = +el.dataset.roll; rollStd(Array.from({ length: diceN() }, () => s)); });
  if (q("diceAdd")) q("diceAdd").onchange = e => { S.diceAdd = e.target.checked; };
  if (q("rollS")) q("rollS").onclick = () => { const s = Math.max(2, Math.min(1000, parseInt(q("diceS").value, 10) || 6)); S.diceS = s; rollStd(Array.from({ length: diceN() }, () => s)); };
  if (q("rollExpr")) q("rollExpr").onclick = () => { S.diceExpr = q("diceExpr").value; const r = parseDice(S.diceExpr, p.cdice); if (!r) { toast(`Nerozumím zápisu – piš třeba 2k6+k8+3, k%${p.cdice[0] ? " nebo 2× " + p.cdice[0].name : ""}`); return; } rollStd(r.dice, r.mod, r.custom); };
  if (q("diceExpr")) q("diceExpr").addEventListener("keydown", e => { if (e.key === "Enter") q("rollExpr").click(); });
  on("[data-cdie]", el => { const cd = p.cdice.find(x => x.id === el.dataset.cdie); if (!S.diceAdd && S.pool.some(d => d.type === "std")) S.pool = []; const n = S.diceAdd ? diceN() : 1; for (let i = 0; i < n; i++) S.pool.push({ type: "c", id: cd.id, v: rnd(cd.faces.length) - 1, lock: false }); logPool(); S.justRolled = true; render(); });
  on("[data-lock]", el => { const d = S.pool[+el.dataset.lock]; d.lock = !d.lock; render(); });
  if (q("reroll")) q("reroll").onclick = () => { S.pool.forEach(d => { if (d.lock) return; if (d.type === "std") d.v = rnd(d.s); else { const cd = p.cdice.find(x => x.id === d.id); if (cd) d.v = rnd(cd.faces.length) - 1; } }); S.rerolls = (S.rerolls || 0) + 1; logPool(); S.justRolled = true; render(); };
  if (q("poolClear")) q("poolClear").onclick = () => { S.pool = []; S.rerolls = 0; S.diceMod = 0; render(); };
  // boj
  on("[data-cmode]", el => { C.mode = el.dataset.cmode; render(); });
  const cin = (id, key, conv = v => +v || 0) => { const el = q(id); if (el) el.addEventListener("change", () => { C[key] = conv(el.value); C.res = null; render(); }); };
  cin("cAtt", "att"); cin("cDef", "def"); cin("cTer", "terrainId", v => v); cin("cShift", "shift"); cin("cAD", "aDice"); cin("cDD", "dDice");
  if (q("cRoll")) q("cRoll").onclick = () => { if (!gate(p, t, "boj")) return; const { defEff, col } = combatCalc(p); const roll = rnd(p.crt.rows.length); const out = p.crt.rows[roll - 1][col]; C.res = { roll, ci: col, col: p.crt.cols[col], out }; C.log.unshift(`${C.att} : ${defEff} (${ratioText(+C.att || 0, defEff)}) → ${p.crt.cols[col]}, hod ${roll} = ${out}`); C.log = C.log.slice(0, 12); logEv(t, `boj ${C.att}:${defEff} (${p.crt.cols[col]}), hod ${roll} → ${out}`); after(p, t, "boj", (cp || {}).id, out); save(); render(); };
  if (q("cRollD")) q("cRollD").onclick = () => { if (!gate(p, t, "boj")) return; const ds = +p.dice.sides || 6; const a = Array.from({ length: Math.min(20, +C.aDice || 0) }, () => rnd(ds)), d = Array.from({ length: Math.min(20, +C.dDice || 0) }, () => rnd(ds)); C.dres = { a, d, aHits: a.filter(v => v >= p.dice.aHit).length, dHits: d.filter(v => v >= p.dice.dHit).length }; C.log.unshift(`Kostky ${a.length} vs ${d.length}: útočník ${C.dres.aHits} zás., obránce ${C.dres.dHits} zás.`); C.log = C.log.slice(0, 12); render(); };
  if (q("cClear")) q("cClear").onclick = () => { C.att = 0; C.def = 0; C.res = null; C.shift = 0; C.attUids = []; C.defUid = null; render(); };
  // území
  if (q("ctrlMode")) q("ctrlMode").onclick = () => { S.ctrlMode = !S.ctrlMode; S.sel = null; render(); };
  if (q("ctrlPaint")) q("ctrlPaint").onchange = e => { S.ctrlPaint = e.target.value; };
  if (q("ctrlClear")) q("ctrlClear").onclick = () => confirmDialog("Vymazat kontrolu území?", "Všechna pole budou bez vlastníka.", "Vymazat", () => { t.control = {}; save(); render(); });
  if (q("ctrlAuto")) q("ctrlAuto").onclick = () => { let n = 0; t.items.filter(i => i.kind === "unit").forEach(i => { const k = cellUnder(p, i); const u = p.units.find(x => x.id === i.unitId); if (k && u && u.factionId) { t.control[k] = u.factionId; n++; } }); save(); render(); toast(`Přiděleno ${n} ${plural(n, "pole", "pole", "polí")}`); };
  // vybraná položka
  const selItem = t.items.find(i => i.uid === S.sel);
  wireExtra(main, p, t, save); wireR4(main, p, t, save); wireWar(main, p, t, save); wireIpad(main, p, t, save); wireOnline(main, p, t, save); wireMore(main, p, t, save); wireCrawl(main, p, t, save); wireLogic(main, p, t, save); wireCmap(main, p, t, save); wireExtra2(main, p, t, save); wireNet(main, p, t, save); wireDeliver(main, p, t, save); wireCB(main, p, t, save); wireRail(main, p, t, save);
  const cardTo = (el, where) => { if (where === "tab" && !gate(p, t, "vylozit")) return; const i = selItem; t.items = t.items.filter(x => x !== i); const fid = el.dataset[where === "hand" ? "tohand" : "totab"]; const h = { deckId: i.deckId, cardId: i.cardId }; (where === "hand" ? (t.hands[fid] = t.hands[fid] || []) : (t.tableau[fid] = t.tableau[fid] || [])).push(h); if (where === "tab") { const c = cardOf(p, h).c; logEv(t, `${p.factions.find(f => f.id === fid).name} vykládá ${c.title}`); if (c.effect) runEffects(p, t, fid, c.effect, c.title); after(p, t, "vylozit", fid, c.type); } S.sel = null; save(); render(); };
  on("[data-tohand]", el => cardTo(el, "hand")); on("[data-totab]", el => cardTo(el, "tab"));
  on("[data-sa]", el => {
    const i = selItem; const a = el.dataset.sa;
    if (a === "flip") { if (i.kind === "unit") i.reduced = !i.reduced; else i.faceUp = !i.faceUp; }
    else if (a === "rot") i.rot = ((i.rot || 0) + (i.kind === "unit" ? 60 : 90)) % 360;
    else if (a === "range") { S.rangeUid = S.rangeUid === i.uid ? null : i.uid; render(); return; }
    else if (a === "los") { S.losUid = S.losUid === i.uid && !S.losR ? null : i.uid; S.losR = null; render(); return; }
    else if (a === "fire") return;
    else if (a === "netreach") { if (S.netReachUid === i.uid) { S.netReach = null; S.netReachUid = null; } else { const u = p.units.find(x => x.id === i.unitId); S.netReach = netCosts(tableNet(p), netNodeOf(p, t, i), +(i.reduced && hasReduced(u) ? u.rMov : u.mov) || 0); S.netReachUid = i.uid; } render(); return; }
    else if (a === "discard" || a === "bottom" || a === "top") { t.items = t.items.filter(x => x !== i); S.sel = null; if (a === "discard") t.discard[i.deckId].push(i.cardId); else if (a === "bottom") t.piles[i.deckId].unshift(i.cardId); else t.piles[i.deckId].push(i.cardId); }
    else if (a === "plus") i.value = (i.value || 0) + 1;
    else if (a === "plus5") i.value = (i.value || 0) + 5;
    else if (a === "minus") i.value = (i.value || 0) - 1;
    else if (a === "remove") { t.items = t.items.filter(x => x !== i); S.sel = null; if (S.rangeUid === i.uid) S.rangeUid = null; if (i.kind === "unit") { logEv(t, `jednotka ${(p.units.find(u => u.id === i.unitId) || {}).name || ""} zničena`); checkWin(p, t); } }
    else if (a === "dup") { const n = { ...i, uid: uid(), x: i.x + 20, y: i.y + 20 }; t.items.push(n); S.sel = n.uid; }
    else if (a === "asAtt" || a === "addAtt" || a === "asDef") {
      const u = p.units.find(x => x.id === i.unitId); const v = +(i.reduced ? u.rAtt : u.att) || 0, dv = +(i.reduced ? u.rDef : u.def) || 0;
      S.tool = "boj"; C.mode = "crt"; C.res = null;
      const half = a !== "asDef" && !inSupply(p, t, i); const va = a !== "asDef" ? unitAttack(p, t, i) : v;
      if (a === "asAtt") { C.att = va; C.attUids = [i.uid]; } else if (a === "addAtt") { C.att = (+C.att || 0) + va; C.attUids = [...(C.attUids || []), i.uid]; }
      else { C.defUid = i.uid; C.shift = defShift(p, t, i); C.def = dv; const k = cellUnder(p, i); const b = tableBoard(p); const ter = k && b ? terrainOf(p, b, k) : null; C.terrainId = ter ? ter.id : (p.terrains[0] || {}).id; }
      render(); toast(a === "asDef" ? `Obrana ${dv}` : `Útok ${C.att}${half ? " (mimo zásobování – polovina)" : ""}`); return;
    }
    save(); render();
  });
  // přetahování a klepání na mapu
  const mat = $("#mat");
  mat.addEventListener("click", e => {
    if (e.target.closest(".titem")) return;
    const bb = tableBoard(p); const rr = mat.getBoundingClientRect(); const Z = zoomOf(); const pk = bb ? geo(bb).pick((e.clientX - rr.left) / Z - BX, (e.clientY - rr.top) / Z - BY) : null;
    if (S.tileMode && t.tileHand && bb) {
      if (!pk) return; const k = pk.join(","); if (t.tilesPlaced[k]) { toast("Pole je už obsazené"); return; }
      if (!gate(p, t, "dilek", tileCheck(p, t, bb, k, t.tileHand.id, t.tileHand.rot).filter(m => m !== "pole už je obsazené"))) return;
      const tl = p.tiles.find(x => x.id === t.tileHand.id); t.tilesPlaced[k] = { ...t.tileHand, fid: (cp || {}).id }; t.tileHand = null; S.tileMode = false;
      logEv(t, `${(cp || {}).name || ""} pokládá dílek ${tl.name}`); after(p, t, "dilek", (cp || {}).id, tl.name); save(); render(); return;
    }
    if (S.routeMode && bb) { if (pk) routeTap(p, t, pk.join(","), save); return; }
    if (S.ctrlMode) {
      const b = tableBoard(p); if (!b) return; const r = mat.getBoundingClientRect();
      const cr = geo(b).pick((e.clientX - r.left) / Z - BX, (e.clientY - r.top) / Z - BY); if (!cr) return; const k = cr.join(",");
      if (S.ctrlPaint === "none") delete t.control[k];
      else if (S.ctrlPaint) t.control[k] = S.ctrlPaint;
      else { const ids = p.factions.map(f => f.id); const nx = ids.indexOf(t.control[k]) + 1; if (nx >= ids.length) delete t.control[k]; else t.control[k] = ids[nx]; }
      if (t.control[k]) fireTriggers(p, t, "kontrola", t.control[k], b.labels[k] || ""); checkWin(p, t);
      save(); render(); return;
    }
    if (S.sel || S.rangeUid) { S.sel = null; S.rangeUid = null; render(); }
  });
  mat.addEventListener("pointerdown", e => {
    const el = e.target.closest(".titem"); if (!el) return;
    e.preventDefault();
    const it = t.items.find(i => i.uid === el.dataset.uid); if (!it) return;
    el.setPointerCapture(e.pointerId);
    const sx = e.clientX, sy = e.clientY, ox = it.x, oy = it.y; let moved = false;
    const cmFrom = it.kind === "unit" ? cmapIndexOf(p, t, it) : null; const netFrom = it.kind !== "card" ? netNodeOf(p, t, it) : null;
    const origin = it.kind === "unit" ? cellUnder(p, it) : null; const originRange = origin && p.ruleset.moveRange ? computeRange(p, t, it) : null;
    el.style.zIndex = 999;
    const move = ev => {
      if (S.pinching) return; const dx = (ev.clientX - sx) / zoomOf(), dy = (ev.clientY - sy) / zoomOf();
      if (!moved && Math.hypot(dx, dy) < 6) return;
      moved = true; el.classList.add("drag");
      it.x = Math.max(0, Math.min(S.matW - 50, ox + dx)); it.y = Math.max(0, Math.min(S.matH - 50, oy + dy));
      el.style.left = it.x + "px"; el.style.top = it.y + "px";
    };
    const up = () => {
      el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up);
      el.classList.remove("drag");
      if (moved) {
        t.items = t.items.filter(i => i !== it); t.items.push(it);
        const b = tableBoard(p);
        if (b && S.snap && it.kind !== "card") {
          const [w, h] = itemSize(it); const g = geo(b); const cr = g.pick(it.x + w / 2 - BX, it.y + h / 2 - BY);
          if (cr) { const [cx, cy] = g.center(cr[0], cr[1]); const k = cr.join(","); const stack = t.items.filter(o => o !== it && o.kind !== "card" && cellUnder(p, o) === k).length;
            it.x = Math.round(BX + cx - w / 2 + stack * 5); it.y = Math.round(BY + cy - h / 2 - stack * 5); }
        }
        if (it.kind === "unit" && b) {
          const k = cellUnder(p, it);
          if (k && k !== origin) {
            if (!gate(p, t, "pohyb", moveViolations(p, t, it, origin, originRange, k))) { it.x = ox; it.y = oy; render(); return; }
            const u = p.units.find(x => x.id === it.unitId); const ter = terrainOf(p, b, k) || p.terrains[0];
            t.moved[it.uid] = true; if (hiddenFaction(p, u.factionId)) hiddenMove(p, t, it, k); else logEv(t, `${u.name} táhne na ${k.split(",").map(n => pad2(+n + 1)).join("")}${b.labels[k] ? " (" + b.labels[k] + ")" : ""}`);
            after(p, t, "pohyb", u.factionId, ter ? ter.name : ""); crawlOnMove(p, t, it, k);
          }
        }
        if (it.kind === "unit" && cmapOn(p, t) && !b && !cmapMove(p, t, it, cmFrom)) { it.x = ox; it.y = oy; render(); return; }
        if (!b && tableNet(p) && it.kind !== "card") { if (it.kind === "unit") { if (!netMove(p, t, it, netFrom)) { it.x = ox; it.y = oy; render(); return; } } else { const nid = netNodeOf(p, t, it); if (nid) netPlace(p, t, it, nid); } }
        S.sel = it.uid; save(); render(); return;
      }
      const now = Date.now(); const lt = S.lastTap || {};
      if (lt.uid === it.uid && now - lt.t < 350 && (it.kind === "card" || (it.kind === "unit" && hasReduced(p.units.find(x => x.id === it.unitId))))) {
        if (it.kind === "unit") it.reduced = !it.reduced; else it.faceUp = !it.faceUp; S.lastTap = null; save();
      } else S.lastTap = { uid: it.uid, t: now };
      S.sel = it.uid; render();
    };
    el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
  });
}
function pickFromHand(p, t, f, o) {
  if (!f) return;
  const hand = t.hands[f.id] || [];
  if (hand.length < o.n) { toast(`${f.name} nemá v ruce dost karet (${hand.length} z ${o.n})`); return; }
  const chosen = [];
  const d = openDialog(`<div class="row spread"><h2>${esc(o.title)}</h2><span class="count" id="pkCnt">0/${o.n}</span></div>
    <p class="hint">${o.hint || (o.n > 1 ? "Klepni na karty v pořadí, v jakém se mají odkrýt." : "Klepni na kartu.")} Ostatní ať se nedívají.</p>
    <div class="card-grid" id="pkGrid"></div>
    <div class="row" style="justify-content:flex-end"><button class="btn" data-close>Zrušit</button>${o.n > 1 ? `<button class="btn" id="pkClear">Vybrat znovu</button><button class="btn primary" id="pkOk" disabled>Potvrdit</button>` : ""}</div>`, true);
  const draw = () => {
    $("#pkGrid", d).innerHTML = hand.map((h, i) => { const { d: dk, c } = cardOf(p, h); const k = chosen.indexOf(i); const ok = !o.allowed || o.allowed(h);
      return `<button class="card-cell" data-pk="${i}" ${ok ? "" : "disabled style='opacity:.35'"}>${cardHTML(c, dk)}<span class="qty">${k >= 0 ? "pořadí " + (k + 1) : ok ? "" : "nelze"}</span></button>`; }).join("");
    $("#pkCnt", d).textContent = `${chosen.length}/${o.n}`; if ($("#pkOk", d)) $("#pkOk", d).disabled = chosen.length !== o.n;
    $$("[data-pk]", d).forEach(b => b.onclick = () => { const i = +b.dataset.pk; if (chosen.includes(i)) chosen.splice(chosen.indexOf(i), 1); else if (chosen.length < o.n) chosen.push(i); if (o.n === 1 && chosen.length === 1) return finish(); draw(); });
  };
  const finish = () => { const picks = chosen.map(i => hand[i]); t.hands[f.id] = hand.filter((_, i) => !chosen.includes(i)); closeDialog(); o.done(picks); };
  draw();
  if ($("#pkOk", d)) { $("#pkOk", d).onclick = finish; $("#pkClear", d).onclick = () => { chosen.length = 0; draw(); }; }
}
function draftPickDialog(p, t, save) {
  const D = t.draft; const f = p.factions[D.seat]; const deck = p.decks.find(d => d.id === D.deckId); const pack = D.packs[D.seat];
  if (!f || !deck) return;
  if (!pack.length) { D.seat = (D.seat + 1) % p.factions.length; save(); render(); return; }
  const mine = (D.picks[f.id] || []);
  const d = openDialog(`<div class="row spread"><h2>${esc(f.name)} vybírá</h2><span class="count">kolo výběru ${D.round}</span></div>
    <p class="hint">Klepni na kartu, kterou si bereš. Ostatní se pošlou dalšímu hráči.</p>
    <div class="card-grid">${pack.map((cId, i) => { const c = deck.cards.find(x => x.id === cId); return `<button class="card-cell" data-pick="${i}">${cardHTML(c, deck)}</button>`; }).join("")}</div>
    ${mine.length ? `<div class="eyebrow">Už máš</div><div class="hand mini">${mine.map(cId => `<div class="hc">${cardHTML(deck.cards.find(x => x.id === cId), deck)}</div>`).join("")}</div>` : ""}
    <div class="row" style="justify-content:flex-end"><button class="btn" data-close>Zavřít bez výběru</button></div>`, true);
  $$("[data-pick]", d).forEach(b => b.onclick = () => {
    const c = pack.splice(+b.dataset.pick, 1)[0]; (D.picks[f.id] = D.picks[f.id] || []).push(c);
    const n = p.factions.length; D.picked++;
    if (D.picked % n === 0) { if (D.dir === 1) D.packs.unshift(D.packs.pop()); else D.packs.push(D.packs.shift()); D.round++; D.seat = 0; }
    else D.seat = (D.seat + 1) % n;
    closeDialog(); save(); render();
    const left = D.packs.reduce((a, pk) => a + pk.length, 0);
    toast(left ? `Předej iPad: ${p.factions[D.seat].name}` : "Draft dokončen");
  });
}
