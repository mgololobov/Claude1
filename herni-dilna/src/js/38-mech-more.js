// ---------- Další mechaniky ----------
// Wargame: posily podle kola, aktivace tažením žetonů, stav jednotek, posun sloupce za terén, dostřel, karty za operace / událost.
// Euro: technologie, veřejné cíle, draft kostek. Karetní hry: odhazovací hromádka, riskování, sázky na štychy, sestavy.
function normalizeMore(p) {
  if (typeof p.chits !== "string") p.chits = "";
  p.techs = p.techs || []; p.goals = p.goals || [];
  p.diceDraft = Object.assign({ on: false, n: "", sides: 6 }, p.diceDraft || {});
  p.shed = Object.assign({ deckId: "", win: true }, p.shed || {});
  p.push = Object.assign({ deckId: "", mode: "dup", limit: 21 }, p.push || {});
  p.trickBid = Object.assign({ on: false, hit: 10, per: 2, miss: 2 }, p.trickBid || {});
  p.melds = Object.assign({ min: 3, pts: 0 }, p.melds || {});
  if (p.opsRes == null) p.opsRes = "";
  (p.scenarios || []).forEach(s => { s.reinf = s.reinf || []; });
  return p;
}
const vpResOf = p => p.resources.find(r => r.vp && !r.global);
const addVp = (p, t, fid, n) => { const r = vpResOf(p); if (!r || !n) return; t.res[fid] = t.res[fid] || {}; t.res[fid][r.id] = Math.max(0, (t.res[fid][r.id] || 0) + n); };
const fname = (p, fid) => (p.factions.find(f => f.id === fid) || {}).name || "";

// ----- Wargame -----
// Čtvrtá položka označuje stavy pro jednotky s životy (dungeon crawler).
const UNIT_ST = { dis: ["Rozvrácená", "✖", "útočí polovinou síly"], dug: ["Zakopaná", "⛨", "obránce má posun o 1 sloupec ve svůj prospěch"], tired: ["Unavená", "z", "pohyb poloviční"],
  poison: ["Otrávená", "☠", "na začátku kola ztrácí 1 život", 1], stun: ["Omráčená", "✷", "příšera v příštím tahu nejedná", 1], tiredC: ["Zpomalená", "z", "pohyb poloviční", 1], sup: ["Potlačená", "⊘", "nesmí se pohnout, útočí polovinou síly", 2], watch: ["Na hlídce", "👁", "vystřelí na nepřítele, který vstoupí do jejího dostřelu a výhledu", 2] };
const stBadges = i => i.st ? Object.keys(UNIT_ST).filter(k => i.st[k]).map(k => `<span class="ust" title="${UNIT_ST[k][0]}">${UNIT_ST[k][1]}</span>`).join("") : "";
function unitAttack(p, t, i) { let v = unitStat(p, i, "att"); if (!inSupply(p, t, i)) v = Math.floor(v / 2); if (i.st && i.st.dis) v = Math.floor(v / 2); if (i.st && i.st.sup) v = Math.floor(v / 2); return v; }
function defShift(p, t, i) { const b = tableBoard(p); const k = cellUnder(p, i); const ter = b && k ? terrainOf(p, b, k) || p.terrains[0] : null; return Math.max(-3, Math.min(3, (ter ? +ter.shift || 0 : 0) - (i.st && i.st.dug ? 1 : 0))); }
// Pole zapsané jako „0304“ (sloupec a řádek), „3,4“ nebo popiskem pole.
function cellFromText(b, txt) {
  const s = String(txt || "").trim(); if (!b || !s) return null; let m;
  if ((m = s.match(/^(\d{2})(\d{2})$/))) { const c = +m[1] - 1, r = +m[2] - 1; return c >= 0 && r >= 0 && c < b.cols && r < b.rows ? c + "," + r : null; }
  if ((m = s.match(/^(\d+)\s*,\s*(\d+)$/))) return +m[1] < b.cols && +m[2] < b.rows ? +m[1] + "," + +m[2] : null;
  const k = Object.keys(b.labels || {}).find(x => b.labels[x].trim().toLowerCase() === s.toLowerCase()); return k || null;
}
function arriveReinf(p, t) {
  const sc = p.scenarios.find(s => s.id === t.scenarioId); if (!sc || !(sc.reinf || []).length) return; const b = tableBoard(p);
  sc.reinf.filter(r => +r.turn === +t.turn).forEach(r => { const u = p.units.find(x => x.id === r.unitId); if (!u) return; const k = cellFromText(b, r.cell);
    for (let n = 0; n < Math.max(1, +r.qty || 1); n++) { const it = { uid: uid(), kind: "unit", unitId: u.id, x: 0, y: 0, reduced: false, rot: 0 }; t.items.push(it); if (k) placeOn(p, t, it, k); else { const pos = freeSpot(t, 56, 56); it.x = pos.x; it.y = pos.y; } }
    logEv(t, `posily: ${Math.max(1, +r.qty || 1)}× ${u.name}${k ? " na " + cellName(k) : ""}`); });
}
const chitList = p => String(p.chits || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => { const [name, side] = l.split(";").map(x => (x || "").trim()); const f = p.factions.find(x => x.name.toLowerCase() === (side || "").toLowerCase()); return { name, fid: f ? f.id : "" }; });
function drawChit(p, t) {
  const L = chitList(p); t.chitsOut = t.chitsOut || []; const left = L.map((_, i) => i).filter(i => !t.chitsOut.includes(i)); if (!left.length) return null;
  const i = left[Math.floor(Math.random() * left.length)]; t.chitsOut.push(i); t.chitNow = i; const c = L[i];
  if (c.fid) { const idx = players(p, t).findIndex(f => f.id === c.fid); if (idx >= 0) t.curF = idx; }
  logEv(t, `aktivace: ${c.name}${c.fid ? " (" + fname(p, c.fid) + ")" : ""}`); return c;
}
function sideActivation(p, t) {
  const L = chitList(p); const out = t.chitsOut || []; const now = t.chitNow != null ? L[t.chitNow] : null;
  if (!L.length) return `<p class="hint">Žetony aktivace (formace, velitelé) zapíšeš v Mechanikách – každý na řádek „Název; Strana“.</p>`;
  return `<section><div class="eyebrow">Aktivace tažením žetonů</div>
      ${now ? `<div class="result"><span>Aktivuje se</span><b style="font-size:1.2rem;font-family:var(--f-display)">${esc(now.name)}</b><span>${esc(fname(p, now.fid))}</span></div>` : ""}
      <div class="row"><button class="btn primary" id="chitDraw" ${out.length >= L.length ? "disabled" : ""}>Táhnout žeton (${L.length - out.length} v kalíšku)</button><button class="btn small" id="chitReset">Vrátit všechny</button></div>
      <p class="hint">Žetony se samy vrátí na začátku dalšího kola.</p></section>
    <section><div class="eyebrow">Žetony</div>${L.map((c, i) => `<div class="row"><span class="dot" style="background:${(p.factions.find(f => f.id === c.fid) || {}).color || "#888"};border-radius:50%"></span><span class="${out.includes(i) ? "muted" : ""}">${esc(c.name)}${out.includes(i) ? " ✓" : ""}</span></div>`).join("")}</section>`;
}
function playOps(p, t, fid, idx) {
  const hand = t.hands[fid] || []; const h = hand[idx]; if (!h) return; const c = cardOf(p, h).c; hand.splice(idx, 1); discardCard(t, h, fid);
  const r = p.resources.find(x => x.id === p.opsRes); if (r) { t.res[fid] = t.res[fid] || {}; t.res[fid][r.id] = Math.min(resMax(r), (t.res[fid][r.id] || 0) + (+c.ops || 0)); }
  logEv(t, `${fname(p, fid)} hraje ${c.title} za ${c.ops} ${plural(+c.ops, "operaci", "operace", "operací")}`);
}

// ----- Euro: technologie, cíle, draft kostek -----
function costItems(p, txt) { return String(txt || "").split(/[,+;]/).map(s => s.trim()).filter(Boolean).map(s => { const m = s.match(/^(\d+)\s+(.+)$/); const r = m && resByName(p, m[2]); return r ? { r, n: +m[1] } : null; }).filter(Boolean); }
const techNames = txt => String(txt || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
function techState(p, t, fid, tech) {
  const own = (t.techs || {})[fid] || []; if (own.includes(tech.id)) return "own";
  const ok = techNames(tech.req).every(n => p.techs.some(x => x.name.toLowerCase() === n && own.includes(x.id))); if (!ok) return "locked";
  return costItems(p, tech.cost).every(c => ((t.res[fid] || {})[c.r.id] || 0) >= c.n) ? "buy" : "poor";
}
function buyTech(p, t, fid, tech) {
  if (techState(p, t, fid, tech) !== "buy") return false;
  costItems(p, tech.cost).forEach(c => { t.res[fid][c.r.id] -= c.n; }); t.techs = t.techs || {}; (t.techs[fid] = t.techs[fid] || []).push(tech.id);
  logEv(t, `${fname(p, fid)} získává ${tech.name}`); if (tech.effect) runEffects(p, t, fid, tech.effect, tech.name); fireTriggers(p, t, "technologie", fid, tech.name); checkWin(p, t); return true;
}
function goalQty(p, t, fid, what) {
  const w = String(what || "").trim().toLowerCase(); const r = resByName(p, what); if (r) return (t.res[fid] || {})[r.id] || 0;
  if (["území", "pole"].includes(w)) return Object.values(t.control || {}).filter(x => x === fid).length;
  if (["technologie", "technologií"].includes(w)) return ((t.techs || {})[fid] || []).length;
  if (["štychy", "štychů"].includes(w)) return t.won[fid] || 0;
  if (["karty", "karet"].includes(w)) return (t.tableau[fid] || []).length;
  if (["kameny", "kamenů"].includes(w)) return Object.values(t.stones || {}).filter(x => x === fid).length;
  return (t.tableau[fid] || []).map(h => cardOf(p, h).c).filter(c => c && [c.type, c.suit].some(x => String(x || "").toLowerCase() === w)).length;
}
function goalPoints(p, t, fid, g) {
  const pts = +g.pts || 0;
  if (g.kind === "each") return Math.floor(goalQty(p, t, fid, g.what) / Math.max(1, +g.n || 1)) * pts;
  if (g.kind === "cond") return condOk(p, t, fid, g.what) && String(g.what || "").trim() ? pts : 0;
  const all = p.factions.map(f => goalQty(p, t, f.id, g.what)); const mx = Math.max(...all); const mine = goalQty(p, t, fid, g.what);
  return mine > 0 && mine === mx ? pts : 0;
}
function goalsScore(p, t, fid) { return netVp(p, t, fid) + railWorth(p, t, fid) + (p.goals || []).reduce((a, g) => a + goalPoints(p, t, fid, g), 0) + (p.techs || []).filter(x => ((t.techs || {})[fid] || []).includes(x.id)).reduce((a, x) => a + (+x.vp || 0), 0); }
const GOAL_KINDS = { most: "Nejvíc", each: "Za každých N", cond: "Podmínka" };
function sideDevelop(p, t) {
  const cp = curPlayer(p, t); const pl = players(p, t);
  return `${p.techs.length && cp ? `<section><div class="eyebrow">Technologie · ${esc(cp.name)}</div>${fchipsHTML(p, t)}
      <div class="list">${p.techs.map(x => { const st = techState(p, t, cp.id, x); return `<div class="tech ${st}"><div><b>${esc(x.name)}</b> ${+x.vp ? `<span class="count">${x.vp} b.</span>` : ""}<div class="hint">${x.cost ? "Cena: " + esc(x.cost) : "zdarma"}${x.req ? " · potřebuje " + esc(x.req) : ""}${x.effect ? " · " + esc(describeEffect(x.effect)) : ""}</div></div>
        ${st === "own" ? `<span class="count">✓ má</span>` : st === "buy" ? `<button class="btn small primary" data-tbuy="${x.id}">Získat</button>` : `<span class="hint">${st === "locked" ? "zamčeno" : "nemá na to"}</span>`}</div>`; }).join("")}</div></section>` : ""}
    ${p.goals.length ? `<section><div class="eyebrow">Veřejné cíle (body teď)</div>
      <div style="overflow-x:auto"><table class="crt-tab"><thead><tr><th>Cíl</th>${pl.map(f => `<th><span class="dot" style="background:${f.color}"></span></th>`).join("")}</tr></thead>
      <tbody>${p.goals.map(g => `<tr><th style="text-align:left">${esc(g.name || goalText(g))}</th>${pl.map(f => `<td>${goalPoints(p, t, f.id, g)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
      <p class="hint">Body z cílů a technologií se počítají do skóre.</p></section>` : ""}
    ${!p.techs.length && !p.goals.length ? `<p class="hint">Technologie a veřejné cíle nastavíš v Mechanikách.</p>` : ""}`;
}
const goalText = g => g.kind === "each" ? `${g.pts} b. za každých ${g.n || 1} ${g.what}` : g.kind === "cond" ? `${g.pts} b., pokud ${g.what}` : `${g.pts} b. za nejvíc ${g.what}`;
function diceDraftHTML(p, t) {
  if (!p.diceDraft.on) return ""; const D = t.ddraft; const cp = curPlayer(p, t);
  return `<section><div class="eyebrow">Draft kostek</div>
    <button class="btn small primary" id="ddRoll">Hodit kostky kola (${+p.diceDraft.n || players(p, t).length + 1}× k${+p.diceDraft.sides || 6})</button>
    ${D ? `<div class="dice-out">${D.dice.map((d, i) => { const f = p.factions.find(x => x.id === d.fid); return d.fid ? `<span class="die cust" style="--c:${f ? f.color : "#888"};color:${inkFor(f ? f.color : "#888")}" title="${esc(f ? f.name : "")}">${d.v}</span>` : `<button class="die" data-ddtake="${i}">${d.v}</button>`; }).join("")}</div>
      <p class="hint">${cp ? `Klepnutím vezme kostku ${esc(cp.name)}. ` : ""}Hodnota spustí automatická pravidla „Hráč vezme kostku“.</p>` : ""}</section>`;
}

// ----- Karetní hry -----
const cv = (p, h) => cardOf(p, h).c; const cval = (p, h) => parseFloat((cv(p, h) || {}).value);
function shedOk(p, t, h) { const top = (t.shed || {}).pile ? t.shed.pile[t.shed.pile.length - 1] : null; if (!top) return true; const a = cv(p, h), b = cv(p, top); return !!a && !!b && ((a.suit && a.suit === b.suit) || (a.value !== "" && a.value != null && String(a.value) === String(b.value))); }
function shedDraw(p, t, fid) {
  const d = p.decks.find(x => x.id === p.shed.deckId); if (!d) return;
  if (!t.piles[d.id].length && t.shed && t.shed.pile.length > 1) { const top = t.shed.pile.pop(); t.piles[d.id] = shuffle(t.shed.pile.map(h => h.cardId)); t.shed.pile = [top]; }
  const cId = t.piles[d.id].pop(); if (cId) (t.hands[fid] = t.hands[fid] || []).push({ deckId: d.id, cardId: cId });
}
function sideShed(p, t) {
  const decks = p.decks.filter(d => d.cards.some(c => c.suit || c.value)); const d = p.decks.find(x => x.id === p.shed.deckId) || decks[0]; if (d && !p.shed.deckId) p.shed.deckId = d.id;
  if (!d) return `<p class="hint">Odhazovací hromádka (Prší, Uno) potřebuje balíček s barvami nebo hodnotami karet.</p>`;
  const S2 = t.shed; const cp = curPlayer(p, t); const top = S2 && S2.pile.length ? S2.pile[S2.pile.length - 1] : null; const hand = cp ? (t.hands[cp.id] || []) : [];
  return `<section><div class="eyebrow">Odhazovací hromádka</div>
      <label class="f">Balíček<select id="shDeck">${decks.map(x => `<option value="${x.id}" ${x.id === d.id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>
      <p class="hint">Hraje se karta stejné barvy nebo hodnoty jako vrchní karta. Kdo nemůže, lízne.${p.shed.win ? " Kdo se první zbaví karet, vyhrává." : ""}</p>
      ${top ? `<div class="hand mini"><div class="hc">${cardHTML(cv(p, top), d)}<span class="count">vrchní karta</span></div></div>` : `<div class="row"><label class="f" style="flex-direction:row;align-items:center;gap:8px">Rozdat každému<input type="number" id="shDealN" min="0" max="15" value="${S.shDealN ?? 5}" style="width:64px"></label><button class="btn primary" id="shStart">Rozdat a otočit první kartu</button></div>`}</section>
    ${top && cp ? `<section><div class="eyebrow">Na tahu: ${esc(cp.name)} (${hand.length})</div>${fchipsHTML(p, t)}
      ${S.shedShow ? miniCards(p, hand, i => shedOk(p, t, hand[i]) ? `<button class="btn small primary" data-shplay="${i}">Zahrát</button>` : `<span class="hint">nelze</span>`) + `<button class="btn small" id="shHide">Skrýt ruku</button>` : `<button class="btn small" id="shShow">Ukázat ruku – ${esc(cp.name)}</button>`}
      <div class="row"><button class="btn small" id="shDraw">Líznout</button><button class="btn small primary" id="shNext">Ukončit tah</button></div></section>` : ""}`;
}
function pushBust(p, t) {
  const row = (t.push || {}).row || []; if (!row.length) return false;
  if (p.push.mode === "sum") return row.reduce((a, h) => a + (cval(p, h) || 0), 0) > (+p.push.limit || 21);
  const keys = row.map(h => { const c = cv(p, h); return c ? (c.value !== "" && c.value != null ? "v" + c.value : "t" + c.title) : ""; }); return new Set(keys).size < keys.length;
}
function pushPoints(p, t) { const row = (t.push || {}).row || []; const s = row.reduce((a, h) => a + (cval(p, h) || 0), 0); return s || row.length; }
function pushDraw(p, t, fid) {
  const d = p.decks.find(x => x.id === p.push.deckId); if (!d) return null; if (!t.piles[d.id].length && (t.discard[d.id] || []).length) { t.piles[d.id] = shuffle(t.discard[d.id]); t.discard[d.id] = []; }
  const cId = t.piles[d.id].pop(); if (!cId) return null; t.push = t.push && t.push.fid === fid ? t.push : { fid, row: [] }; t.push.row.push({ deckId: d.id, cardId: cId });
  if (pushBust(p, t)) { logEv(t, `${fname(p, fid)} riskoval a přetáhl (${t.push.row.length} karet)`); t.push.row.forEach(h => t.discard[d.id].push(h.cardId)); t.push = { fid, row: [], bust: true }; return "bust"; }
  return "ok";
}
function pushStop(p, t, fid) { const d = p.decks.find(x => x.id === p.push.deckId); const n = pushPoints(p, t); addVp(p, t, fid, n); logEv(t, `${fname(p, fid)} končí s ${n} ${plural(n, "bodem", "body", "body")}`); (t.push.row || []).forEach(h => t.discard[d.id].push(h.cardId)); t.push = null; checkWin(p, t); return n; }
function sidePush(p, t) {
  const d = p.decks.find(x => x.id === p.push.deckId); const cp = curPlayer(p, t); const P_ = t.push && cp && t.push.fid === cp.id ? t.push : null;
  return `<section><div class="eyebrow">Riskuj (push your luck)</div>
      <div class="grid" style="grid-template-columns:1fr 1fr"><label class="f">Balíček<select id="puDeck"><option value="">–</option>${p.decks.map(x => `<option value="${x.id}" ${x.id === p.push.deckId ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>
      <label class="f">Prohraješ, když<select id="puMode"><option value="dup" ${p.push.mode === "dup" ? "selected" : ""}>se hodnota opakuje</option><option value="sum" ${p.push.mode === "sum" ? "selected" : ""}>součet přesáhne limit</option></select></label></div>
      ${p.push.mode === "sum" ? `<label class="f">Limit součtu<input type="number" id="puLimit" value="${+p.push.limit || 21}"></label>` : ""}
      <p class="hint">Hráč tahá karty, dokud chce. Když přetáhne, ztratí vše z tohoto tahu. Když řekne „Stačí“, získá body podle součtu hodnot (bez hodnot podle počtu karet).</p></section>
    ${d && cp ? `<section><div class="eyebrow">Na tahu: ${esc(cp.name)}</div>${fchipsHTML(p, t)}
      ${P_ && P_.row.length ? `<div class="hand mini">${P_.row.map(h => `<div class="hc">${cardHTML(cv(p, h), d)}</div>`).join("")}</div><div class="hint">Teď by získal ${pushPoints(p, t)}</div>` : P_ && P_.bust ? `<div class="result" style="background:var(--danger);color:#fff"><span>Přetáhl</span><b>0 bodů</b></div>` : ""}
      <div class="row"><button class="btn primary" id="puDraw">Táhnout kartu</button>${P_ && P_.row.length ? `<button class="btn" id="puStop">Stačí</button>` : ""}<button class="btn small" id="puNext">Další hráč</button></div></section>` : ""}`;
}
function trickBidHTML(p, t) {
  if (!p.trickBid.on) return ""; const pl = players(p, t); t.bids = t.bids || {};
  return `<section><div class="eyebrow">Sázky na štychy</div>
    ${pl.map(f => `<div class="row spread"><span class="row"><span class="dot" style="background:${f.color};border-radius:50%"></span><b>${esc(f.name)}</b></span><span class="row"><span class="hint">sázka</span><input type="number" min="0" data-tbid="${f.id}" value="${t.bids[f.id] ?? ""}" style="width:64px"><span class="hint">má ${t.won[f.id] || 0}</span></span></div>`).join("")}
    <button class="btn small primary" id="tbScore">Vyhodnotit kolo</button>
    <p class="hint">Přesná sázka: ${p.trickBid.hit} + ${p.trickBid.per} za štych. Jinak −${p.trickBid.miss} za každý štych rozdílu.</p></section>`;
}
function scoreBids(p, t) {
  const out = []; players(p, t).forEach(f => { const won = t.won[f.id] || 0, bid = +((t.bids || {})[f.id] || 0); const pts = won === bid ? +p.trickBid.hit + won * +p.trickBid.per : -Math.abs(won - bid) * +p.trickBid.miss;
    addVp(p, t, f.id, pts); out.push(`${f.name} ${pts > 0 ? "+" : ""}${pts}`); });
  logEv(t, "sázky: " + out.join(", ")); t.won = {}; t.bids = {}; checkWin(p, t); return out;
}
// Sestava: aspoň N karet stejné hodnoty, nebo postupka stejné barvy.
function meldKind(p, hs) {
  const cs = hs.map(h => cv(p, h)).filter(Boolean); if (cs.length < (+p.melds.min || 3)) return null;
  if (cs.every(c => String(c.value) === String(cs[0].value) && c.value !== "")) return "trojice";
  const vals = cs.map(c => parseFloat(c.value)).sort((a, b) => a - b);
  if (cs[0].suit && cs.every(c => c.suit === cs[0].suit) && vals.every((v, i) => !isNaN(v) && (i === 0 || v === vals[i - 1] + 1))) return "postupka";
  return null;
}
function meldDialog(p, t, fid, save) {
  const hand = t.hands[fid] || []; const sel = new Set();
  const d = openDialog(`<h2>Vyložit sestavu</h2><p class="hint">Vyber aspoň ${+p.melds.min || 3} karty stejné hodnoty, nebo postupku ve stejné barvě.</p><div class="card-grid" id="mdGrid"></div><p id="mdInfo" class="hint"></p>
    <div class="row" style="justify-content:flex-end"><button class="btn" data-close>Zrušit</button><button class="btn primary" id="mdOk" disabled>Vyložit</button></div>`, true);
  const draw = () => { $("#mdGrid", d).innerHTML = hand.map((h, i) => { const { d: dk, c } = cardOf(p, h); return `<button class="card-cell" data-md="${i}" aria-pressed="${sel.has(i)}" style="${sel.has(i) ? "outline:3px solid var(--accent)" : ""}">${cardHTML(c, dk)}</button>`; }).join("");
    const k = meldKind(p, [...sel].map(i => hand[i])); $("#mdInfo", d).textContent = sel.size ? (k ? `Platná ${k}` : "Tohle není platná sestava") : ""; $("#mdOk", d).disabled = !k;
    $$("[data-md]", d).forEach(b => b.onclick = () => { const i = +b.dataset.md; sel.has(i) ? sel.delete(i) : sel.add(i); draw(); }); };
  draw();
  $("#mdOk", d).onclick = () => { const picks = [...sel].map(i => hand[i]); const k = meldKind(p, picks); t.hands[fid] = hand.filter((_, i) => !sel.has(i)); (t.tableau[fid] = t.tableau[fid] || []).push(...picks);
    if (+p.melds.pts) addVp(p, t, fid, picks.length * +p.melds.pts); logEv(t, `${fname(p, fid)} vykládá ${k} (${picks.map(h => cv(p, h).title).join(", ")})`); closeDialog(); save(); render(); };
}

// ----- Napojení na stůl -----
function wireMore(main, p, t, save) {
  const q = id => document.getElementById(id); const on = (sel, fn) => $$(sel, main).forEach(el => el.addEventListener("click", () => fn(el))); const cp = curPlayer(p, t);
  const selItem = t.items.find(i => i.uid === S.sel);
  on("[data-ust]", el => { if (!selItem) return; selItem.st = selItem.st || {}; selItem.st[el.dataset.ust] = !selItem.st[el.dataset.ust]; logEv(t, `${(unitOf(p, selItem) || {}).name}: ${UNIT_ST[el.dataset.ust][0].toLowerCase()} ${selItem.st[el.dataset.ust] ? "ano" : "ne"}`); save(); render(); });
  on("[data-sa=fire]", () => { S.losUid = S.losUid === selItem.uid && S.losR ? null : selItem.uid; S.losR = S.losUid ? unitStat(p, selItem, "range") : null; S.cmdUid = null; render(); });
  if (q("chitDraw")) q("chitDraw").onclick = () => { const c = drawChit(p, t); save(); render(); if (c) toast("Aktivuje se: " + c.name); };
  if (q("chitReset")) q("chitReset").onclick = () => { t.chitsOut = []; t.chitNow = null; save(); render(); };
  on("[data-hops]", el => { playOps(p, t, S.handF, +el.dataset.hops); save(); render(); });
  on("[data-tbuy]", el => { const x = p.techs.find(z => z.id === el.dataset.tbuy); if (cp && x && buyTech(p, t, cp.id, x)) { save(); render(); toast(`${cp.name} získává ${x.name}`); } });
  if (q("ddRoll")) q("ddRoll").onclick = () => { const n = +p.diceDraft.n || players(p, t).length + 1, s = +p.diceDraft.sides || 6; t.ddraft = { dice: Array.from({ length: n }, () => ({ v: rnd(s), fid: null })) }; logEv(t, "kostky kola: " + t.ddraft.dice.map(d => d.v).join(", ")); save(); render(); };
  on("[data-ddtake]", el => { if (!cp) return; const d = t.ddraft.dice[+el.dataset.ddtake]; d.fid = cp.id; logEv(t, `${cp.name} bere kostku ${d.v}`); fireTriggers(p, t, "kostka", cp.id, d.v); save(); render(); });
  if (q("shDeck")) q("shDeck").onchange = e => { p.shed.deckId = e.target.value; t.shed = null; touch(p); render(); };
  if (q("shStart")) q("shStart").onclick = () => { const d = p.decks.find(x => x.id === p.shed.deckId); const n = S.shDealN = Math.max(0, Math.min(15, +q("shDealN").value || 0));
    for (let k = 0; k < n; k++) players(p, t).forEach(f => { const c = t.piles[d.id].pop(); if (c) (t.hands[f.id] = t.hands[f.id] || []).push({ deckId: d.id, cardId: c }); }); if (n) logEv(t, `rozdáno po ${n} kartách`);
    const cId = t.piles[d.id].pop(); if (!cId) { toast("Balíček je prázdný"); return; } t.shed = { pile: [{ deckId: d.id, cardId: cId }] }; save(); render(); };
  if (q("shShow")) q("shShow").onclick = () => { S.shedShow = true; render(); }; if (q("shHide")) q("shHide").onclick = () => { S.shedShow = false; render(); };
  on("[data-shplay]", el => { const hand = t.hands[cp.id]; const h = hand.splice(+el.dataset.shplay, 1)[0]; t.shed.pile.push(h); const c = cv(p, h); logEv(t, `${cp.name} hraje ${c.title}`); if (c.effect) runEffects(p, t, cp.id, c.effect, c.title);
    if (!hand.length && p.shed.win) declareWinner(p, t, cp.id, "zbavil se všech karet"); save(); render(); });
  if (q("shDraw")) q("shDraw").onclick = () => { shedDraw(p, t, cp.id); logEv(t, `${cp.name} lízne`); save(); render(); };
  if (q("shNext")) q("shNext").onclick = () => { S.shedShow = false; const n = players(p, t).length; t.curF = (t.curF + 1) % n; save(); render(); toast(`Předej iPad: ${curPlayer(p, t).name}`); };
  if (q("puDeck")) q("puDeck").onchange = e => { p.push.deckId = e.target.value; touch(p); render(); };
  if (q("puMode")) q("puMode").onchange = e => { p.push.mode = e.target.value; touch(p); render(); };
  if (q("puLimit")) q("puLimit").onchange = e => { p.push.limit = +e.target.value || 21; touch(p); };
  if (q("puDraw")) q("puDraw").onclick = () => { const r = pushDraw(p, t, cp.id); if (!r) toast("Balíček je prázdný"); else if (r === "bust") toast(`${cp.name} přetáhl – nic nezíská`); save(); render(); };
  if (q("puStop")) q("puStop").onclick = () => { const n = pushStop(p, t, cp.id); save(); render(); toast(`${cp.name} získává ${n}`); };
  if (q("puNext")) q("puNext").onclick = () => { if (t.push && t.push.row && t.push.row.length) pushStop(p, t, t.push.fid); t.push = null; t.curF = (t.curF + 1) % players(p, t).length; save(); render(); };
  $$("[data-tbid]", main).forEach(i => i.addEventListener("change", () => { t.bids = t.bids || {}; t.bids[i.dataset.tbid] = i.value === "" ? "" : +i.value; save(); }));
  if (q("tbScore")) q("tbScore").onclick = () => { const r = scoreBids(p, t); save(); render(); toast(r.join(" · ")); };
  if (q("meld")) q("meld").onclick = () => meldDialog(p, t, S.handF, save);
}

// ----- Nastavení v záložce Mechaniky -----
function moreMechHTML(p) {
  const decks = p.decks; const sc = p.scenarios;
  return `<div class="two">
    <div class="panel"><h2>Wargame – další pravidla</h2>
      <h3>Aktivace tažením žetonů</h3>
      <label class="f">Žetony v kalíšku – každý na řádek „Název; Strana“<textarea id="mChits" placeholder="1. pěší divize; Modří&#10;Gardová brigáda; Červení">${esc(p.chits)}</textarea></label>
      <p class="hint">Na stole v nástroji Aktivace se žetony tahají náhodně; strana vytaženého žetonu je na tahu.</p>
      <h3>Karty za operace nebo událost</h3>
      <label class="f">Body operací se přičtou ke zdroji<select id="mOpsRes"><option value="">jen zapsat do záznamu</option>${p.resources.map(r => `<option value="${r.id}" ${r.id === p.opsRes ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</select></label>
      <p class="hint">Kartě nastav v editoru „Operace“. V ruce pak půjde zahrát za operace, nebo vyložit jako událost (provede efekt).</p>
      <h3>Další</h3>
      <p class="hint">Posily podle kola zadáš u scénáře. Posun sloupce za terén nastavíš v záložce Mapa, dostřel u jednotky. Stav jednotek (rozvrácená, zakopaná, unavená) přepínáš na stole u vybrané jednotky.</p></div>
    <div class="panel"><h2>Technologie a vylepšení</h2>
      <p class="hint">Cena „3 Mince, 1 Dřevo“, předpoklady jsou názvy jiných technologií oddělené čárkou. Efekt se provede při získání, body se počítají do skóre.</p>
      <div class="list">${p.techs.map(x => `<div class="item-row">
        <input type="text" data-tx="name|${x.id}" value="${esc(x.name)}" style="width:130px" aria-label="Název">
        <input type="text" data-tx="cost|${x.id}" value="${esc(x.cost)}" placeholder="Cena" style="width:120px" aria-label="Cena">
        <input type="text" data-tx="req|${x.id}" value="${esc(x.req)}" placeholder="Předpoklady" style="width:120px" aria-label="Předpoklady">
        <input type="text" data-tx="effect|${x.id}" value="${esc(x.effect)}" placeholder="Efekt, např. +1 Mince" style="flex:1;min-width:120px;width:auto" aria-label="Efekt">
        <input type="number" data-tx="vp|${x.id}" value="${esc(x.vp)}" placeholder="b." style="width:60px" aria-label="Body">
        <button class="btn small danger" data-txdel="${x.id}" aria-label="Smazat">✕</button></div>`).join("")}</div>
      <button class="btn small" id="techAdd">+ Technologie</button>
      <h2 style="margin-top:14px">Veřejné cíle</h2>
      <p class="hint">Co se počítá: název zdroje, typ nebo barva karty, „území“, „technologie“, „štychy“, „karty“. Podmínka se píše jako v pravidlech, např. „Mince >= 10“.</p>
      <div class="list">${p.goals.map(g => `<div class="item-row">
        <input type="text" data-gx="name|${g.id}" value="${esc(g.name)}" placeholder="Název" style="width:130px" aria-label="Název cíle">
        <select data-gx="kind|${g.id}" style="width:auto">${Object.entries(GOAL_KINDS).map(([k, v]) => `<option value="${k}" ${k === g.kind ? "selected" : ""}>${v}</option>`).join("")}</select>
        <input type="text" data-gx="what|${g.id}" value="${esc(g.what)}" placeholder="${g.kind === "cond" ? "Mince >= 10" : "Zboží"}" style="flex:1;min-width:110px;width:auto" aria-label="Co se počítá">
        ${g.kind === "each" ? `<input type="number" data-gx="n|${g.id}" value="${esc(g.n)}" style="width:60px" aria-label="Po kolika">` : ""}
        <input type="number" data-gx="pts|${g.id}" value="${esc(g.pts)}" style="width:60px" aria-label="Body">
        <button class="btn small danger" data-gxdel="${g.id}" aria-label="Smazat">✕</button></div>`).join("")}</div>
      <button class="btn small" id="goalAdd">+ Cíl</button></div>
  </div>
  <div class="two">
    <div class="panel"><h2>Draft kostek</h2>
      <label class="chk"><input type="checkbox" id="ddOn" ${p.diceDraft.on ? "checked" : ""}> Každé kolo se hodí kostky a hráči si je postupně berou</label>
      <div class="grid" style="grid-template-columns:1fr 1fr"><label class="f">Kostek (prázdné = hráčů + 1)<input type="number" id="ddN" min="1" max="20" value="${esc(p.diceDraft.n)}"></label>
      <label class="f">Stěn<input type="number" id="ddS" min="2" max="100" value="${+p.diceDraft.sides || 6}"></label></div>
      <p class="hint">Co hodnota kostky udělá, nastavíš v Pravidlech: automatické pravidlo „Hráč vezme kostku“ s hodnotou, např. 6 → +2 Mince.</p></div>
    <div class="panel"><h2>Karetní hry</h2>
      <h3>Odhazovací hromádka</h3>
      <label class="chk"><input type="checkbox" id="shWin" ${p.shed.win ? "checked" : ""}> Kdo se první zbaví karet z ruky, vyhrává</label>
      <h3>Sázky na štychy</h3>
      <label class="chk"><input type="checkbox" id="tbOn" ${p.trickBid.on ? "checked" : ""}> Před kolem hráči sází, kolik štychů vezmou</label>
      <div class="grid" style="grid-template-columns:repeat(3,1fr)"><label class="f">Za přesnou sázku<input type="number" id="tbHit" value="${p.trickBid.hit}"></label><label class="f">+ za štych<input type="number" id="tbPer" value="${p.trickBid.per}"></label><label class="f">− za rozdíl<input type="number" id="tbMiss" value="${p.trickBid.miss}"></label></div>
      <h3>Sestavy (žolíkové hry)</h3>
      <div class="grid" style="grid-template-columns:1fr 1fr"><label class="f">Nejméně karet v sestavě<input type="number" id="mdMin" min="2" max="8" value="${+p.melds.min || 3}"></label><label class="f">Bodů za kartu v sestavě<input type="number" id="mdPts" value="${+p.melds.pts || 0}"></label></div>
      <p class="hint">Riskování (push your luck) nastavíš přímo na stole v nástroji Riskuj.</p></div>
  </div>`;
}
function wireMoreMech(main, p) {
  const q = id => document.getElementById(id); const ch = (id, fn) => { if (q(id)) q(id).addEventListener("change", e => { fn(e.target); touch(p); }); };
  ch("mChits", e => { p.chits = e.value; }); ch("mOpsRes", e => { p.opsRes = e.value; });
  ch("ddOn", e => { p.diceDraft.on = e.checked; }); ch("ddN", e => { p.diceDraft.n = e.value; }); ch("ddS", e => { p.diceDraft.sides = +e.value || 6; });
  ch("shWin", e => { p.shed.win = e.checked; }); ch("tbOn", e => { p.trickBid.on = e.checked; });
  ch("tbHit", e => { p.trickBid.hit = +e.value || 0; }); ch("tbPer", e => { p.trickBid.per = +e.value || 0; }); ch("tbMiss", e => { p.trickBid.miss = +e.value || 0; });
  ch("mdMin", e => { p.melds.min = Math.max(2, +e.value || 3); }); ch("mdPts", e => { p.melds.pts = +e.value || 0; });
  q("techAdd").onclick = () => { p.techs.push({ id: uid(), name: "Technologie " + (p.techs.length + 1), cost: "", req: "", effect: "", vp: 0 }); touch(p); render(); };
  q("goalAdd").onclick = () => { p.goals.push({ id: uid(), name: "", kind: "most", what: "", n: 1, pts: 3 }); touch(p); render(); };
  $$("[data-tx]", main).forEach(i => i.addEventListener("change", () => { const [k, id] = i.dataset.tx.split("|"); const x = p.techs.find(z => z.id === id); x[k] = k === "vp" ? +i.value || 0 : i.value; touch(p); }));
  $$("[data-txdel]", main).forEach(b => b.onclick = () => { p.techs = p.techs.filter(z => z.id !== b.dataset.txdel); touch(p); render(); });
  $$("[data-gx]", main).forEach(i => i.addEventListener("change", () => { const [k, id] = i.dataset.gx.split("|"); const g = p.goals.find(z => z.id === id); g[k] = ["n", "pts"].includes(k) ? +i.value || 0 : i.value; touch(p); if (k === "kind") render(); }));
  $$("[data-gxdel]", main).forEach(b => b.onclick = () => { p.goals = p.goals.filter(z => z.id !== b.dataset.gxdel); touch(p); render(); });
}
// Posily ve scénáři
function reinfHTML(p, s) {
  return `<div class="eyebrow">Posily podle kola</div>
    ${(s.reinf || []).map(r => `<div class="row"><span class="hint">kolo</span><input type="number" min="1" data-rf="turn|${s.id}|${r.id}" value="${esc(r.turn)}" style="width:64px" aria-label="Kolo příchodu posily">
      <input type="number" min="1" max="20" data-rf="qty|${s.id}|${r.id}" value="${esc(r.qty || 1)}" style="width:56px" aria-label="Počet"><span class="hint">×</span>
      <select data-rf="unitId|${s.id}|${r.id}" style="width:auto" aria-label="Jednotka posily">${p.units.map(u => `<option value="${u.id}" ${u.id === r.unitId ? "selected" : ""}>${esc(u.name)} (${esc(fname(p, u.factionId))})</option>`).join("")}</select>
      <span class="hint">na pole</span><input type="text" data-rf="cell|${s.id}|${r.id}" value="${esc(r.cell)}" placeholder="0304 nebo popisek" style="width:130px"><button class="btn small danger" data-rfdel="${s.id}|${r.id}" aria-label="Smazat posilu">✕</button></div>`).join("")}
    ${p.units.length ? `<button class="btn small" data-rfadd="${s.id}">+ Posila</button>` : `<span class="hint">Nejdřív vytvoř jednotky.</span>`}`;
}
function wireReinf(main, p) {
  const Sc = id => p.scenarios.find(s => s.id === id);
  $$("[data-rfadd]", main).forEach(b => b.onclick = () => { const s = Sc(b.dataset.rfadd); (s.reinf = s.reinf || []).push({ id: uid(), turn: 2, qty: 1, unitId: p.units[0].id, cell: "" }); touch(p); render(); });
  $$("[data-rf]", main).forEach(i => i.addEventListener("change", () => { const [k, sid, rid] = i.dataset.rf.split("|"); const r = Sc(sid).reinf.find(x => x.id === rid); r[k] = ["turn", "qty"].includes(k) ? Math.max(1, +i.value || 1) : i.value; touch(p); }));
  $$("[data-rfdel]", main).forEach(b => b.onclick = () => { const [sid, rid] = b.dataset.rfdel.split("|"); const s = Sc(sid); s.reinf = s.reinf.filter(x => x.id !== rid); touch(p); render(); });
}
// Příručka
function moreRulebook(p) {
  const out = []; const L = chitList(p);
  if (L.length) out.push(["Aktivace", `<p>Na začátku kola dejte do kalíšku žetony: ${L.map(c => esc(c.name)).join(", ")}. Táhněte je postupně; vytažená formace provede pohyb a boj.</p>`]);
  const rf = p.scenarios.filter(s => (s.reinf || []).length); if (rf.length) out.push(["Posily", rf.map(s => `<p><b>${esc(s.name)}</b>: ${s.reinf.map(r => `kolo ${r.turn} – ${r.qty || 1}× ${esc((p.units.find(u => u.id === r.unitId) || {}).name || "?")}${r.cell ? " na " + esc(r.cell) : ""}`).join("; ")}</p>`).join("")]);
  const sh = p.terrains.filter(x => +x.shift); if (sh.length) out.push(["Terén v boji", `<ul>${sh.map(x => `<li>${esc(x.name)}: posun o ${Math.abs(+x.shift)} ${+x.shift < 0 ? "ve prospěch obránce" : "ve prospěch útočníka"}</li>`).join("")}</ul>`]);
  if (p.units.some(u => +u.range)) out.push(["Střelba", `<ul>${p.units.filter(u => +u.range).map(u => `<li>${esc(u.name)}: dostřel ${u.range} ${plural(+u.range, "pole", "pole", "polí")} (s výhledem${u.indirect ? " nebo pozorovatelem" : ""})</li>`).join("")}</ul>`]);
  if (p.techs.length) out.push(["Technologie", `<table><tr><th>Technologie</th><th>Cena</th><th>Předpoklady</th><th>Účinek</th></tr>${p.techs.map(x => `<tr><td>${esc(x.name)}</td><td>${esc(x.cost || "–")}</td><td>${esc(x.req || "–")}</td><td>${esc(describeEffect(x.effect || ""))}${+x.vp ? ` (${x.vp} b.)` : ""}</td></tr>`).join("")}</table>`]);
  if (p.goals.length) out.push(["Veřejné cíle", `<ul>${p.goals.map(g => `<li>${g.name ? `<b>${esc(g.name)}</b>: ` : ""}${esc(goalText(g))}</li>`).join("")}</ul>`]);
  if (p.diceDraft.on) out.push(["Draft kostek", `<p>Na začátku kola hoďte ${+p.diceDraft.n || "počet hráčů + 1"} kostek k${+p.diceDraft.sides || 6}. Hráči si je po řadě berou.</p>`]);
  const heroes = p.units.filter(u => u.kind === "hero"), mons = p.units.filter(u => u.kind === "monster");
  if (heroes.length || mons.length) out.push(["Výprava", `<p>Útok: hoď tolik kostek k${+p.dice.sides || 6}, kolik má útočník útok; zásah na ${p.dice.aHit}+. Obránce hází podle obrany a blokuje na ${p.dice.dHit}+. Každý nezablokovaný zásah ubere 1 život.</p>
    ${mons.length ? `<p>Příšery jdou k nejbližšímu hrdinovi a útočí, jakmile na něj dosáhnou.</p>` : ""}${heroes.length ? `<p>Hrdina získává zkušenosti za zabité příšery; každých ${+p.crawl.levelXp || 5} XP je nová úroveň a +1 život.</p>` : ""}
    ${p.crawl.rooms ? "<p>Místnosti jsou zakryté, dokud do nich nevstoupí hrdina.</p>" : ""}${+p.crawl.doom ? `<p>Hrozba roste každé kolo; při ${p.crawl.doom} nastane nejhorší.</p>` : ""}
    <table><tr><th>Postava</th><th>Útok</th><th>Obrana</th><th>Pohyb</th><th>Životy</th></tr>${[...heroes, ...mons].map(u => `<tr><td>${esc(u.name)}</td><td>${esc(u.att)}</td><td>${esc(u.def)}</td><td>${esc(u.mov)}</td><td>${esc(u.hp || "–")}</td></tr>`).join("")}</table>`]);
  if (p.stones.on) out.push(["Kameny", `<p>Hráči se střídají v pokládání kamenů. ${esc(STONE_CAP[p.stones.capture])}.${p.stones.gravity ? " Kámen spadne do nejnižšího volného pole sloupce." : ""} Cíl: ${esc(STONE_WIN[p.stones.win])}${p.stones.win === "row" ? ` (${p.stones.rowN})` : ""}.</p>`]);
  if (p.code.on) out.push(["Tajný kód", `<p>Kód má ${p.code.len} symbolů z: ${esc(p.code.symbols)}. Po každém pokusu ● = správný symbol na správném místě, ○ = správný symbol jinde. Pokusů je ${p.code.tries}.</p>`]);
  if (p.cmap.on) { const d = p.decks.find(x => x.id === p.cmap.deckId); const ar = p.resources.find(r => r.id === p.cmap.apRes);
    out.push(["Mapa z lokací", `<p>Z balíčku ${esc(d ? d.name : "lokací")} vyložte ${p.cmap.layout === "grid" ? `mřížku ${p.cmap.cols} × ${p.cmap.rows}` : `řadu ${p.cmap.length} karet`} lícem dolů, první kartu lícem nahoru${d && d.cards.some(c => /^cíl/i.test(c.type || "")) ? " a jako poslední cílovou kartu" : ""}. Jednotky začínají na první kartě.</p>
    <p>Jednotka se pohne na sousední kartu${p.cmap.layout === "grid" && p.cmap.diag ? " (i úhlopříčně)" : ""}${ar ? ` za tolik ${esc(ar.name)}, kolik ukazuje pohyb karty` : ""}. Při vstupu se karta otočí a objeví se na ní uvedený počet nepřátel. Krytí karty přidává obránci kostky obrany. Dostřel 0 = stejná karta, 1 = sousední.</p>${p.cmap.winOnReach ? "<p>Kdo dojde na cílovou kartu, vyhrává.</p>" : ""}`]); }
  if (p.nets.length) out.push(["Mapa míst", p.nets.map(n => `<p><b>${esc(n.name)}</b>: ${n.nodes.length} míst. Cesty: ${n.links.map(l => `${esc((netNode(n, l.a) || {}).name)} – ${esc((netNode(n, l.b) || {}).name)}${+l.cost > 1 ? ` (${l.cost})` : ""}`).join(", ")}.</p>`).join("") + `<p>Jednotka táhne po cestách; součet cen cest nesmí přesáhnout její pohyb.${p.nets.some(n => n.nodes.some(x => +x.vp)) ? " Kdo ovládá místo s body, započítá si je." : ""}</p>`]);
  if (p.netCubes.on) out.push([p.netCubes.name, `<p>Při šíření přidejte ${p.netCubes.rate}× kostičku na náhodné místo. Na místě smí být nejvýš ${p.netCubes.max}; další způsobí ohnisko a kostička se přidá do všech sousedních míst (každé místo jen jednou za řetěz).</p>`]);
  if (p.deliver.on && p.contracts.length) out.push(["Zakázky", `<p>Vždy jsou otevřené ${p.deliver.open} zakázky. Při otočení zakázky položte zboží do výchozího místa. Jednotka uveze ${p.deliver.cap} zboží (není-li uvedeno jinak), naloží ho v místě, kde čeká, a v cílovém místě ho doručí za odměnu.</p><table><tr><th>Zboží</th><th>Odkud</th><th>Kam</th><th>Odměna</th><th>Počet</th></tr>${p.contracts.map(c => `<tr><td>${esc(c.good)}</td><td>${esc(c.from)}</td><td>${esc(c.to)}</td><td>${esc(describeEffect(c.reward || ""))}</td><td>${c.qty || 1}</td></tr>`).join("")}</table>`]);
  if (p.decks.some(d => d.cards.some(c => isCreature(c)))) { const life = p.resources.find(r => r.id === p.cb.lifeRes);
    out.push(["Souboj bytostí", `<p>Útočník vybere nevyčerpané bytosti${p.cb.sick ? ", které nebyly vyloženy v tomto tahu (nemoc z vyvolání)" : ""}. Obránce může každého útočníka zablokovat jednou svou nevyčerpanou bytostí. Bytosti si navzájem udělí zranění rovné síle; kdo dostane aspoň tolik, kolik má odolnost, umírá. Nezablokovaný útočník zraní hráče${life ? ` (−${esc(life.name)})` : ""}. Útočníci se vyčerpají.</p>
      <ul>${Object.entries(KW).map(([k, v]) => `<li><b>${k}</b>: ${v}</li>`).join("")}</ul>${life ? `<p>Komu klesnou ${esc(life.name.toLowerCase())} na 0, prohrál.</p>` : ""}${p.cb.landPerTurn ? `<p>Za tah smíš vyložit jen jednu kartu typu ${esc(p.cb.landType)}.</p>` : ""}`]); }
  const pt = p.resources.filter(r => r.perTurn); if (pt.length) out.push(["Zdroje na jeden tah", `<p>${pt.map(r => esc(r.name)).join(", ")} na konci tahu propadají.</p>`]);
  if (p.decks.some(d => d.cards.some(c => +c.fight))) { const fr = p.resources.find(r => r.id === p.cb.fightRes); out.push(["Příšery", `<p>Příšeru v centrální řadě porazíš zaplacením ${fr ? esc(fr.name) : "síly"} podle čísla ⚔ na kartě. Příšera jde do odhozu a dostaneš odměnu z karty.</p>`]); }
  const pooled = p.resources.filter(r => r.pool); if (pooled.length) out.push(["Společná zásoba", `<p>${pooled.map(r => `${esc(r.name)} se bere ze zásoby ${esc((p.resources.find(x => x.id === r.pool) || {}).name || "")}`).join("; ")}.${p.ruleset.win.poolEnd ? " Když zásoba dojde, dohraje se kolo a hra končí." : ""}</p>`]);
  if (p.rail.on) out.push(["Akciové společnosti", `<p>Společnost založíš koupí prezidentského podílu (2 akcie) za jednu z nominálních cen ${esc(p.rail.pars)}. Akcie z emise stojí nominál, z poolu aktuální kurz. Prodej sníží kurz o jeden stupeň. Společnost jezdí, když je prodáno ${p.rail.float} z ${p.rail.shares} akcií.</p><p>Vlaky (typ:cena:počet): ${esc(p.rail.trains)}. Rezivění: ${esc(p.rail.rust)}. Limit vlaků: ${esc(p.rail.limit)}.</p><p>Tržby vyplacené jako dividenda: každá akcie dostane desetinu, kurz +1. Zadržené tržby jdou do pokladny, kurz −1. Na konci hry vyhrává nejvyšší hodnota peněz a akcií.</p>`]);
  const eq = p.tokens.filter(x => x.small && modText(x) && !isOnce(x) && !x.target), cmdU = p.units.filter(u => +u.cmd);
  if (eq.length || cmdU.length || p.ruleset.actOnly) out.push(["Vybavení a velení", `${eq.length ? `<p>Malé žetony se pokládají na jednotku a upravují její hodnoty:</p><ul>${eq.map(x => `<li><b>${esc(x.name)}</b>: ${esc(modText(x) || "bez úprav")}</li>`).join("")}</ul>` : ""}
    ${cmdU.length ? `<p>Velitelé aktivují spřátelené jednotky ve svém dosahu jednou akcí:</p><ul>${cmdU.map(u => `<li><b>${esc(u.name)}</b>: dosah ${u.cmd}${+u.cmdAtt ? `, jednotky v dosahu +${u.cmdAtt} k útoku` : ""}${+u.cmdDef ? `, +${u.cmdDef} k obraně` : ""}</li>`).join("")}</ul>` : ""}
    ${p.ruleset.actOnly ? "<p>Táhnout a útočit smí jen aktivovaná jednotka. Aktivace platí do konce tahu.</p>" : ""}`]);
  const fx = p.tokens.filter(x => x.fixed && !x.fx), zu = p.units.filter(u => unitZones(u).length), tr = p.units.filter(u => +u.transport), ca = p.units.filter(u => u.carry !== "" && u.carry != null);
  if (fx.length) out.push(["Pevné žetony", `<p>Pevné žetony po položení zůstávají na místě. Bonus platí pro jednotky na stejném poli.</p><ul>${fx.map(x => `<li><b>${esc(x.name)}</b>${x.buildable ? " (jednotka ho může postavit na svém poli)" : ""}: ${esc(modText(x) || "bez bonusu")}</li>`).join("")}</ul>`]);
  if (zu.length) out.push(["Zóny jednotek", `<p>Útok zasáhne zónu podle váhy (vyšší váha = častěji) a brání se její obranou. Zóna s výdrží ji ztrácí; zničená kritická zóna vyřadí jednotku.</p><table><tr><th>Jednotka</th><th>Zóny (obrana, výdrž, váha)</th></tr>${zu.map(u => `<tr><td>${esc(u.name)}</td><td>${unitZones(u).map(z => `${esc(z.name)} ${z.def || 0}${+z.hp ? `/${z.hp}` : ""} ×${z.w || 1}${z.crit ? " ★" : ""}`).join(", ")}</td></tr>`).join("")}</table>`]);
  if (tr.length || ca.length) out.push(["Nosnost", `${tr.length ? `<p>Přeprava: ${tr.map(u => `${esc(u.name)} převeze ${u.transport}`).join(", ")}. Jednotka nastoupí na stejném poli a jede s vozidlem.</p>` : ""}${ca.length ? `<p>Nosnost předmětů: ${ca.map(u => `${esc(u.name)} ${u.carry}`).join(", ")}. Váha předmětů: ${p.tokens.filter(x => x.small).map(x => `${esc(x.name)} ${tokWeight(x)}`).join(", ")}.</p>` : ""}`]);
  out.push(...facingRulebook(p), ...moraleRulebook(p), ...itemsRulebook(p), ...envRulebook(p), ...groundRulebook(p), ...opsRulebook(p), ...euroRulebook(p));
  if (envOn(p) || p.morale.on) out.push(["Tabulky pro hru bez aplikace", analogTablesHTML(p)]);
  if (p.mancala.on) out.push(["Rozsévání", `<p>Každý hráč má ${p.mancala.pits} jamek po ${p.mancala.seeds} semínkách a sklad. Ve svém tahu vezmi všechna semínka z jedné své jamky a rozděl je po jednom do dalších jamek proti směru hodin (soupeřův sklad přeskoč).${p.mancala.extra ? " Skončíš-li ve svém skladu, hraješ znovu." : ""}${p.mancala.capture ? " Skončíš-li ve své prázdné jamce, bereš i semínka z protější jamky." : ""} Hra končí, když jedna strana nemá semínka; vyhrává plnější sklad.</p>`]);
  const inc = p.decks.flatMap(d => d.cards.filter(c => c.income || c.act)); if (inc.length) out.push(["Schopnosti karet", `<ul>${inc.map(c => `<li><b>${esc(c.title)}</b>: ${c.income ? "každé kolo " + esc(describeEffect(c.income)) : ""}${c.income && c.act ? "; " : ""}${c.act ? "vyčerpáním " + esc(describeEffect(c.act)) : ""}</li>`).join("")}</ul>${p.refreshExhaust ? "<p>Vyčerpané karty se na začátku kola obnoví.</p>" : ""}`]);
  if (p.trickBid.on) out.push(["Sázky", `<p>Před kolem každý řekne, kolik štychů vezme. Přesná sázka: ${p.trickBid.hit} bodů + ${p.trickBid.per} za každý štych; jinak −${p.trickBid.miss} za každý štych rozdílu.</p>`]);
  return out;
}
