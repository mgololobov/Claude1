// ---------- Hlídání pravidel ----------
const CATS = { lizat: "Líznutí karty", nakup: "Nákup z trhu", vylozit: "Vyložení karty", zahrat: "Zahrání karty na stůl", akce: "Položení na akci / rondel", pohyb: "Pohyb jednotky", boj: "Boj", sacek: "Tahání ze sáčku", kostky: "Hod kostkami", dilek: "Položení dílku", trasa: "Stavba trasy", obchod: "Obchod a burza", draha: "Tah po dráze", aktivace: "Aktivace jednotky / velení", stavba: "Stavba (okop, opevnění)", vybaveni: "Vybavení a nakládání" };
const TRIGGERS = { kolo: "Začátek kola", faze: "Začátek fáze", tah: "Začátek tahu hráče", nakup: "Hráč koupí kartu", vylozit: "Hráč vyloží kartu", sacek: "Hráč vytáhne žeton", pohyb: "Jednotka vstoupí na terén", dilek: "Hráč položí dílek", kontrola: "Pole získá vlastníka", boj: "Výsledek boje", hod: "Hod na produkci (součet)", kostka: "Hráč vezme kostku (hodnota)", technologie: "Hráč získá technologii", mistnost: "Odhalena místnost (název)", hrozba: "Hrozba dosáhla maxima", kod: "Kód prolomen (počet pokusů)", lokace: "Odhalena lokace (název karty)", ohnisko: "Ohnisko v místě (název)", doruceni: "Doručena zakázka (místo)", porazeni: "Hráč porazí příšeru (název)", aktivace: "Velitel aktivuje jednotky (jméno velitele)" };
function defaultRules() {
  return { strict: false, handLimit: "", actionsPerTurn: "", actCats: ["nakup", "vylozit", "akce"], phaseOf: {}, stackLimit: "", moveRange: true, moveOnce: true, ownUnits: false, playCost: "",
    autoIncome: false, drawUpTo: "", fog: false, ownTurn: false, roundOnWrap: false, sight: 6, timerAuto: false, win: { vp: "", turns: "", elimination: false }, triggers: [] };
}
function logEv(t, text) { t.log = t.log || []; t.log.unshift(`K${t.turn}: ${text}`); if (t.log.length > 80) t.log.length = 80; }
// Vrátí true, pokud akci provést. V režimu „vynucovat“ porušení akci zablokuje, jinak jen upozorní.
function gate(p, t, cat, extra = []) {
  const R = p.ruleset; const msgs = [...extra];
  const ph = R.phaseOf[cat];
  if (ph && ph.length && p.phases.length && !ph.includes(t.phaseIdx)) msgs.push(`${CATS[cat]} jde jen ve fázi ${ph.map(i => p.phases[i]).filter(Boolean).join(" / ")}`);
  if (R.actCats.includes(cat) && +R.actionsPerTurn && (t.acts || 0) >= +R.actionsPerTurn) msgs.push(`na tahu už bylo ${R.actionsPerTurn} ${plural(+R.actionsPerTurn, "akce", "akce", "akcí")}`);
  if (!msgs.length) return true;
  logEv(t, (R.strict ? "⛔ " : "⚠ ") + msgs.join("; "));
  toast((R.strict ? "Nelze: " : "Pozor: ") + msgs[0]);
  return !R.strict;
}
function after(p, t, cat, fid, param) {
  if (p.ruleset.actCats.includes(cat)) t.acts = (t.acts || 0) + 1;
  fireTriggers(p, t, cat, fid, param);
  checkWin(p, t);
}
function resByName(p, name) { const n = String(name).trim().toLowerCase(); return p.resources.find(r => r.name.toLowerCase() === n) || (["body", "bod", "vítězné body"].includes(n) ? p.resources.find(r => r.vp) : null); }
function condOk(p, t, fid, cond) {
  cond = String(cond || "").trim(); if (!cond) return true;
  const m = cond.match(/^(.+?)\s*(>=|<=|=|>|<)\s*(-?\d+(?:[.,]\d+)?)$/); if (!m) return true;
  const key = m[1].trim().toLowerCase(); let v;
  if (key === "kolo") v = t.turn; else if (key === "ruka" || key === "karty v ruce") v = (t.hands[fid] || []).length; else if (key === "skóre") v = scoreOf(p, t, fid).total;
  else { const r = resByName(p, key); if (!r) return true; v = (t.res[r.global ? "_g" : fid] || {})[r.id] || 0; }
  const n = parseFloat(m[3].replace(",", "."));
  return { ">=": v >= n, "<=": v <= n, "=": v === n, ">": v > n, "<": v < n }[m[2]];
}
// Jazyk efektů. Příkazy se oddělují středníkem nebo novým řádkem, uvnitř volby a podmínky čárkou.
//   +2 Mince · všichni +1 Zlato · ostatní -1 Body · soupeř -1 Body · líznout 1 [z Balíček] · táhnout 1 z Sáček
//   posun +2 · odhodit 1 · událost z Balíček · zpráva Text · vítěz · první hráč
//   vyber: +2 Mince | líznout 1 · pokud Mince >= 3: +1 Body · zaplať 2 Mince: +1 Body, líznout 1
//   na začátku: jednou za kolo: … / jednou za tah: … / jednou za hru: …
// ctx.auto = volby a cíle rozhodne počítač (simulace, testy); jinak čekají v t.pending na hráče.
function runEffects(p, t, fid, text, src, depth = 0, ctx = null) {
  const out = []; let body = String(text || "").trim();
  const once = body.match(/^jednou\s+za\s+(kolo|tah|hru)\s*:\s*/i);
  if (once) {
    const scope = once[1].toLowerCase(); const key = `${src || "efekt"}|${fid}`; t.once = t.once || {};
    const stamp = scope === "kolo" ? "k" + t.turn : scope === "tah" ? `t${t.turn}:${t.curF}` : "hra";
    if (t.once[key] === stamp) { const msg = `„${src || "efekt"}“ už byl použit ${scope === "hru" ? "v této hře" : scope === "kolo" ? "v tomto kole" : "v tomto tahu"}`; logEv(t, "⛔ " + msg); if (!ctx) toast("Nelze: " + msg); return [msg]; }
    t.once[key] = stamp; body = body.slice(once[0].length);
  }
  body.split(/[;\n]/).map(s => s.trim()).filter(Boolean).forEach(cmd => execCmd(p, t, fid, cmd, src, depth, ctx, out));
  const f = p.factions.find(x => x.id === fid);
  if (out.length) logEv(t, `${src ? src + " – " : ""}${f ? f.name + ": " : ""}${out.join(", ")}`);
  return out;
}
function execCmd(p, t, fid, cmd, src, depth, ctx, out) {
  const pl = players(p, t); let m;
  const sub = (who, list) => list.split(",").map(s => s.trim()).filter(Boolean).forEach(c => execCmd(p, t, who, c, src, depth, ctx, out));
  if ((m = cmd.match(/^pokud\s+(.+?)\s*:\s*(.+)$/i))) { if (condOk(p, t, fid, m[1])) sub(fid, m[2]); else out.push(`podmínka „${m[1]}“ nesplněna`); return; }
  if ((m = cmd.match(/^zaplať\s+(.+?)\s*:\s*(.+)$/i))) {
    const costs = m[1].split("+").map(x => x.trim().match(/^(\d+)\s+(.+)$/)).map(c => c && { n: +c[1], r: resByName(p, c[2]), name: c[2] });
    if (costs.some(c => !c || !c.r)) { out.push(`neznámá cena „${m[1]}“`); return; }
    const own = c => (c.r.global ? "_g" : fid);
    if (costs.some(c => ((t.res[own(c)] || {})[c.r.id] || 0) < c.n)) { out.push(`nemá na zaplacení ${m[1]}`); return; }
    costs.forEach(c => { t.res[own(c)][c.r.id] -= c.n; }); out.push(`zaplaceno ${m[1]}`); sub(fid, m[2]); return;
  }
  if ((m = cmd.match(/^nastav\s+(.+?)\s+(-?\d+)$/i))) {
    const r = resByName(p, m[1]); if (!r) { out.push(`neznámý zdroj „${m[1]}“`); return; }
    const o = r.global ? "_g" : fid; t.res[o] = t.res[o] || {}; t.res[o][r.id] = Math.max(0, Math.min(resMax(r), +m[2])); out.push(`${r.name} = ${t.res[o][r.id]}`); return;
  }
  if ((m = cmd.match(/^vyber\s*:\s*(.+)$/i))) {
    const opts = m[1].split("|").map(s => s.trim()).filter(Boolean); if (!opts.length) return;
    if (ctx && ctx.auto) { const i = ctx.choose ? ctx.choose(opts, fid) : Math.floor(Math.random() * opts.length); sub(fid, opts[i]); return; }
    (t.pending = t.pending || []).push({ kind: "choice", fid, opts, src: src || "" }); out.push("čeká na volbu"); return;
  }
  if ((m = cmd.match(/^soupeř\s+(.+)$/i))) {
    const opp = pl.filter(f => f.id !== fid); if (!opp.length) return;
    if (opp.length === 1 || (ctx && ctx.auto)) { const o = opp.length === 1 ? opp[0] : (ctx.target ? ctx.target(opp, fid) : opp[Math.floor(Math.random() * opp.length)]); out.push(`soupeř ${o.name}:`); sub(o.id, m[1]); return; }
    (t.pending = t.pending || []).push({ kind: "target", fid, effect: m[1], src: src || "" }); out.push("čeká na výběr soupeře"); return;
  }
  if ((m = cmd.match(/^(všichni|ostatní|hráč)?\s*([+-]\s*\d+)\s+(.+)$/i))) {
    const who = (m[1] || "hráč").toLowerCase(); const dv = parseInt(m[2].replace(/\s/g, ""), 10); const r = resByName(p, m[3]);
    if (!r) { out.push(`neznámý zdroj „${m[3]}“`); return; }
    const owners = r.global ? ["_g"] : who === "všichni" ? pl.map(f => f.id) : who === "ostatní" ? pl.filter(f => f.id !== fid).map(f => f.id) : [fid];
    owners.forEach(o => { t.res[o] = t.res[o] || {}; const before = t.res[o][r.id] || 0; t.res[o][r.id] = Math.max(0, Math.min(resMax(r), before + dv)); if (o !== "_g") cbPool(p, t, r, t.res[o][r.id] - before); });
    out.push(`${who !== "hráč" ? who + " " : ""}${dv > 0 ? "+" : ""}${dv} ${r.name}`); return;
  }
  if ((m = cmd.match(/^líznout\s+(\d+)(?:\s+z\s+(.+))?$/i))) {
    const n = +m[1]; const d = m[2] ? p.decks.find(x => x.name.toLowerCase() === m[2].trim().toLowerCase()) : null;
    if (!d && ((t.pdeck[fid] || []).length || (t.pdisc[fid] || []).length)) { const r = drawOwn(t, fid, n); out.push(`líznuto ${r.k}`); return; }
    const dk = d || p.decks.find(x => !x.starter); if (!dk) return; let k = 0;
    for (let i = 0; i < n; i++) { const c = t.piles[dk.id].pop(); if (c) { (t.hands[fid] = t.hands[fid] || []).push({ deckId: dk.id, cardId: c }); k++; } }
    out.push(`líznuto ${k} z ${dk.name}`); return;
  }
  if ((m = cmd.match(/^táhnout\s+(\d+)\s+z\s+(.+)$/i))) {
    const b = p.bags.find(x => x.name.toLowerCase() === m[2].trim().toLowerCase()); if (!b) { out.push(`neznámý sáček „${m[2]}“`); return; }
    const s = t.bags[b.id]; shuffle(s.in); const got = []; for (let i = 0; i < +m[1] && s.in.length; i++) { const x = s.in.pop(); s.out.push(x); got.push(b.contents[x].label); }
    out.push(`ze sáčku: ${got.join(", ") || "nic"}`); return;
  }
  if ((m = cmd.match(/^(všichni|ostatní)?\s*posun\s+([+-]?\d+)$/i))) {
    const who = (m[1] || "").toLowerCase(); const ids = who === "všichni" ? pl.map(f => f.id) : who === "ostatní" ? pl.filter(f => f.id !== fid).map(f => f.id) : [fid];
    ids.forEach(id => { t.trackPos[id] = Math.max(0, Math.min(+p.track.length, (t.trackPos[id] || 0) + +m[2])); }); out.push(`${who ? who + " " : ""}posun ${m[2]}`); return;
  }
  if ((m = cmd.match(/^událost(?:\s+z\s+(.+))?$/i))) {
    const d = m[1] ? p.decks.find(x => x.name.toLowerCase() === m[1].trim().toLowerCase()) : p.decks.find(x => !x.starter); if (!d) { out.push("není balíček událostí"); return; }
    if (!t.piles[d.id].length && t.discard[d.id].length) { t.piles[d.id] = shuffle(t.discard[d.id]); t.discard[d.id] = []; }
    const cId = t.piles[d.id].pop(); if (!cId) { out.push(`balíček ${d.name} je prázdný`); return; }
    const c = d.cards.find(x => x.id === cId); const pos = freeSpot(t); t.items.push({ uid: uid(), kind: "card", deckId: d.id, cardId: cId, x: pos.x, y: pos.y, faceUp: true, rot: 0 });
    out.push(`událost: ${c.title}`); if (c.effect && depth < 3) runEffects(p, t, fid, c.effect, c.title, depth + 1, ctx); return;
  }
  if ((m = cmd.match(/^vyhostit\s+(\d+)$/i))) {
    const n = +m[1]; const h = t.hands[fid] || []; if (!h.length) { out.push("není co vyhostit"); return; }
    if (ctx && ctx.auto) { for (let i = 0; i < n && h.length; i++) { let w = 0; h.forEach((x, j) => { if (cardValue(p, cardOf(p, x).c) < cardValue(p, cardOf(p, h[w]).c)) w = j; }); (t.banished = t.banished || []).push(h.splice(w, 1)[0]); } out.push(`vyhoštěno ${n}`); return; }
    const f = p.factions.find(x => x.id === fid); setTimeout(() => pickFromHand(p, t, f, { n: Math.min(n, h.length), title: "Vyhostit ze hry", hint: "Vybrané karty se odstraní ze hry.", done: picks => { (t.banished = t.banished || []).push(...picks); logEv(t, `${f.name} vyhošťuje ${picks.length}`); touch(p); render(); } }), 50);
    out.push("vybírá karty k vyhoštění"); return;
  }
  if ((m = cmd.match(/^odhodit\s+(\d+)$/i))) {
    const h = t.hands[fid] || []; let k = 0; for (let i = 0; i < +m[1] && h.length; i++) { discardCard(t, h.splice(Math.floor(Math.random() * h.length), 1)[0], fid); k++; } out.push(`odhozeno náhodně ${k}`); return;
  }
  if ((m = cmd.match(/^(?:zpráva|oznámení)\s+(.+)$/i))) { out.push(m[1]); if (!ctx) toast(m[1]); return; }
  if (/^(první hráč|začínáš)$/i.test(cmd)) { t.firstNext = fid; const f = p.factions.find(x => x.id === fid); out.push(`${f ? f.name : ""} začíná příští kolo`); return; }
  if (/^(vítěz|vyhrává|konec hry)$/i.test(cmd)) { declareWinner(p, t, fid, src || "efekt"); out.push("konec hry"); return; }
  out.push(`nerozumím „${cmd}“`);
}
function fireTriggers(p, t, on, fid, param) {
  p.ruleset.triggers.filter(r => r.on === on).forEach(r => {
    const pv = on === "faze" && param != null ? param + 1 : param;
    if (r.param && pv != null && String(r.param).trim().toLowerCase() !== String(pv).toLowerCase()) return;
    if (r.param && pv == null) return;
    const targets = on === "kolo" ? [null] : [fid];
    targets.forEach(x => { const who = x || (curPlayer(p, t) || {}).id; if (!condOk(p, t, who, r.cond)) return; runEffects(p, t, who, r.effect, "Pravidlo „" + TRIGGERS[on] + "“"); });
  });
}
function declareWinner(p, t, fid, why) { if (t.winner) return; const f = p.factions.find(x => x.id === fid); t.winner = { fid, why }; logEv(t, `🏆 Vítěz: ${f ? f.name : "?"} (${why})`); toast(`Vítěz: ${f ? f.name : "?"}`); }
function checkWin(p, t) {
  if (t.winner) return; const W = p.ruleset.win; const pl = players(p, t);
  if (+W.vp) { const top = pl.map(f => ({ f, s: scoreOf(p, t, f.id).total })).filter(x => x.s >= +W.vp).sort((a, b) => b.s - a.s)[0]; if (top) { if (!W.finishRound) return declareWinner(p, t, top.f.id, `dosáhl ${W.vp} bodů`); if (!t.lastRound) { t.lastRound = true; logEv(t, `${top.f.name} má ${W.vp} bodů – dohrává se kolo`); toast("Poslední kolo – dohraje se do konce"); } } }
  if (W.elimination && p.units.length) { const alive = new Set(t.items.filter(i => i.kind === "unit").map(i => (p.units.find(u => u.id === i.unitId) || {}).factionId).filter(Boolean)); if (t.items.some(i => i.kind === "unit") && alive.size === 1) return declareWinner(p, t, [...alive][0], "soupeř nemá žádné jednotky"); }
  if (+p.track.length && pl.length) { const f = pl.find(x => (t.trackPos[x.id] || 0) >= +p.track.length); if (f) return declareWinner(p, t, f.id, "první v cíli dráhy"); }
  cbCheckLife(p, t);
}
function endGameByTurns(p, t) {
  const sc = p.scenarios.find(s => s.id === t.scenarioId); const limit = sc ? +sc.turns : +p.ruleset.win.turns;
  if (!limit || t.turn <= limit || t.winner) return;
  if (sc && sc.holdF && sc.holdLabels) {
    const b = tableBoard(p); const labels = sc.holdLabels.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
    const keys = b ? Object.entries(b.labels).filter(([k, v]) => labels.includes(v.toLowerCase())).map(([k]) => k) : [];
    const ok = keys.length && keys.every(k => t.control[k] === sc.holdF);
    const other = p.factions.find(f => f.id !== sc.holdF);
    return declareWinner(p, t, ok ? sc.holdF : (other || {}).id, ok ? `drží ${sc.holdLabels}` : `${(p.factions.find(f => f.id === sc.holdF) || {}).name || "útočník"} nesplnil cíl`);
  }
  const top = players(p, t).map(f => ({ f, s: scoreOf(p, t, f.id).total })).sort((a, b) => b.s - a.s)[0];
  if (top) declareWinner(p, t, top.f.id, `nejvíc bodů po ${limit}. kole`);
}
// Dohrání kola: po bodovém cíli se kolo dokončí a vyhrává nejvíc bodů (při shodě remíza).
function finishLastRound(p, t) {
  if (!t.lastRound || t.winner) return false; const sc = players(p, t).map(f => ({ f, s: scoreOf(p, t, f.id).total })); const mx = Math.max(...sc.map(x => x.s)); const top = sc.filter(x => x.s === mx);
  declareWinner(p, t, top[0].f.id, top.length > 1 ? `remíza ${top.map(x => x.f.name).join(" a ")} (${mx} bodů)` : `nejvíc bodů po dohrání kola (${mx})`); if (top.length > 1) t.winner.tie = top.map(x => x.f.id); return true;
}
function newRound(p, t) {
  if (finishLastRound(p, t)) return;
  if (t.firstNext) { const ids = players(p, t).map(f => f.id); const i = ids.indexOf(t.firstNext); if (i > 0) t.order = [...ids.slice(i), ...ids.slice(0, i)]; t.curF = 0; t.firstNext = null; }
  t.turn++; t.phaseIdx = 0; t.acts = 0; t.moved = {};
  if (p.ruleset.autoIncome) p.resources.forEach(r => { if (!+r.income) return; (r.global ? ["_g"] : p.factions.map(f => f.id)).forEach(o => { t.res[o] = t.res[o] || {}; t.res[o][r.id] = Math.max(0, Math.min(resMax(r), (t.res[o][r.id] || 0) + +r.income)); }); });
  logEv(t, `začíná ${t.turn}. kolo`); clearActivation(p, t); t.chitsOut = []; t.chitNow = null; t.ddraft = null; arriveReinf(p, t); upkeepRound(p, t); eventRound(p, t); crawlRound(p, t); extraRound(p, t); moraleRound(p, t); itemsRound(p, t); envRound(p, t); opsRound(p, t);
  endGameByTurns(p, t);
  fireTriggers(p, t, "kolo", null, null); fireTriggers(p, t, "faze", null, 0);
  checkWin(p, t);
}
// Konec tahu: hlídá limit ruky, dobírá do limitu, předá tah dalšímu.
function endTurn(p, t, done) {
  const R = p.ruleset; const cp = curPlayer(p, t); const pl = players(p, t);
  const finish = () => {
    if (cp && +R.drawUpTo) { const need = +R.drawUpTo - (t.hands[cp.id] || []).length; if (need > 0) runEffects(p, t, cp.id, `líznout ${need}`, "Dobrání do limitu"); }
    t.acts = 0; t.moved = {}; cbEndTurn(p, t, cp && cp.id);
    if (pl.length) { t.curF = (t.curF + 1) % pl.length; if (t.curF === 0 && R.roundOnWrap) newRound(p, t); }
    const nx = curPlayer(p, t); if (nx) { cbStartTurn(p, t, nx.id); clearActivation(p, t, nx.id); logEv(t, `na tahu ${nx.name}`); fireTriggers(p, t, "tah", nx.id, null); }
    t.timer = t.timer && t.timer.len ? { len: t.timer.len, end: Date.now() + t.timer.len * 1000 } : null; S.timerFired = false;
    checkWin(p, t); done();
  };
  const over = cp && +R.handLimit ? (t.hands[cp.id] || []).length - +R.handLimit : 0;
  if (over > 0) {
    logEv(t, `${cp.name} má v ruce o ${over} víc, než dovoluje limit ${R.handLimit}`);
    if (R.strict) { pickFromHand(p, t, cp, { title: `${cp.name}: odhoď ${over} ${plural(over, "kartu", "karty", "karet")} (limit ruky ${R.handLimit})`, n: over, hint: "Vyber karty, které odhodíš.", done: picks => { picks.forEach(h => discardCard(t, h, cp.id)); finish(); } }); return; }
    toast(`Pozor: ${cp.name} překračuje limit ruky o ${over}`);
  }
  finish();
}
// Výhled: vzorkuje úsečku mezi středy polí a hledá pole s terénem, který blokuje výhled.
// Vrací [pole, poloha na úsečce 0–1] pro pole mezi koncovými body.
function losPath(p, b, k1, k2) {
  const g = geo(b); const [c1, r1] = k1.split(",").map(Number), [c2, r2] = k2.split(",").map(Number);
  const [x1, y1] = g.center(c1, r1), [x2, y2] = g.center(c2, r2); const n = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 6)); const seen = new Map();
  for (let i = 1; i < n; i++) { const cr = g.pick(x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n); if (cr) { const k = cr.join(","); if (k !== k1 && k !== k2 && !seen.has(k)) seen.set(k, i / n); } }
  return [...seen];
}
function losCells(p, b, k1, k2) { return losPath(p, b, k1, k2).map(([k]) => k); }
// Pole zastaví výhled, když je jeho výška (překážka o 1 výš) nad čarou výhledu mezi výškami koncových polí.
function hasLOS(p, b, k1, k2) {
  const h1 = cellHeight(p, b, k1), h2 = cellHeight(p, b, k2); const smoke = smokeSet(p, p.table);
  if (smoke.size && (losCells(p, b, k1, k2).some(k => smoke.has(k)) || (smoke.has(k1) || smoke.has(k2)) && hexDist(b, k1, k2) > 1)) return false; // kouř zakrývá
  return !losPath(p, b, k1, k2).some(([k, f]) => { const ter = terrainOf(p, b, k) || p.terrains[0]; const top = (+(ter && ter.h) || 0) + (ter && ter.blocks ? 1 : 0); return top > h1 + (h2 - h1) * f + 1e-9; });
}
function visibleFrom(p, b, k0, range) {
  const out = {}; for (let c = 0; c < b.cols; c++) for (let r = 0; r < b.rows; r++) { const k = c + "," + r; if (k === k0) continue; const d = hexDist(b, k0, k); if (d <= range && hasLOS(p, b, k0, k)) out[k] = d; }
  return out;
}
// Mlha války: které nepřátelské jednotky vidí zvolená strana.
function fogHidden(p, t) {
  const fid = S.view; if (!fid) return null; const b = tableBoard(p); const hidden = new Set();
  t.items.forEach(i => { if (i.kind !== "unit") return; const u = p.units.find(x => x.id === i.unitId); if (u && u.factionId !== fid && hiddenFaction(p, u.factionId)) hidden.add(i.uid + ":gone"); });
  if (!p.ruleset.fog) return hidden.size ? hidden : null;
  const own = t.items.filter(i => i.kind === "unit" && !i.inside && (p.units.find(u => u.id === i.unitId) || {}).factionId === fid && cellUnder(p, i));
  t.items.forEach(i => { if (i.kind !== "unit") return; const u = p.units.find(x => x.id === i.unitId); if (!u || u.factionId === fid) return;
    const k = cellUnder(p, i); const seen = b && k && own.some(o => { const ko = cellUnder(p, o); return hexDist(b, ko, k) <= (litByFire(p, t, k) ? +p.ruleset.sight || 6 : sightOf(p, t, o)) && hasLOS(p, b, ko, k) && sees(p, o, i); }); hidden.add(i.uid + (seen ? ":block" : ":gone")); });
  return hidden;
}
// Poslední známé pozice skrytých jednotek (pro ostatní hráče).
function ghostsHTML(p, t) {
  if (!S.view || !t.lastSeen || !tableBoard(p)) return ""; const b = tableBoard(p); const g = geo(b);
  return Object.entries(t.lastSeen).map(([id, k]) => { const it = t.items.find(i => i.uid === id); const u = it && p.units.find(x => x.id === it.unitId); if (!u || u.factionId === S.view || !hiddenFaction(p, u.factionId)) return "";
    const [c, r] = k.split(",").map(Number); const [cx, cy] = g.center(c, r); return `<div class="ghost" style="left:${BX + cx - 22}px;top:${BY + cy - 22}px" title="Naposledy viděno: ${esc(u.name)}">❓</div>`; }).join("");
}
// Dílky: soused ve směru i a hrana dílku po otočení.
function dirNeighbor(b, c, r, i) {
  if (b.type === "square") return [[c, r - 1], [c + 1, r], [c, r + 1], [c - 1, r]][i];
  const odd = c % 2; return (odd ? [[c, r - 1], [c + 1, r], [c + 1, r + 1], [c, r + 1], [c - 1, r + 1], [c - 1, r]] : [[c, r - 1], [c + 1, r - 1], [c + 1, r], [c, r + 1], [c - 1, r], [c - 1, r - 1]])[i];
}
const tileEdges = tl => String(tl.edges || "").split(",").map(s => s.trim());
function edgeAt(tl, rot, i, n) { const e = tileEdges(tl); return e[((i - rot) % n + n) % n] || ""; }
function tileCheck(p, t, b, k, tileId, rot) {
  const n = b.type === "square" ? 4 : 6; const tl = p.tiles.find(x => x.id === tileId); const msgs = [];
  if (t.tilesPlaced[k]) return ["pole už je obsazené"];
  const [c, r] = k.split(",").map(Number); let nb = 0;
  for (let i = 0; i < n; i++) {
    const [x, y] = dirNeighbor(b, c, r, i); const o = t.tilesPlaced[x + "," + y]; if (!o) continue; nb++;
    const ot = p.tiles.find(z => z.id === o.id); if (!ot || !p.tileRules.match) continue;
    const mine = edgeAt(tl, rot, i, n), theirs = edgeAt(ot, o.rot, (i + n / 2) % n, n);
    if (mine && theirs && mine !== theirs) msgs.push(`hrana „${mine}“ nesedí na „${theirs}“`);
  }
  if (p.tileRules.adjacent && Object.keys(t.tilesPlaced).length && !nb) msgs.push("dílek musí sousedit s položeným dílkem");
  return msgs;
}
const EDGE_COLORS = ["#7fa766", "#d9cfc0", "#b0402c", "#3f6fb0", "#c98a12", "#7a4fa0", "#4a4a48", "#2a8c8c"];
function edgeColor(p, label) { const all = [...new Set(p.tiles.flatMap(tileEdges).filter(Boolean))]; const i = all.indexOf(label); return i < 0 ? "#999" : EDGE_COLORS[i % EDGE_COLORS.length]; }
// Trasy: je hráčova síť spojená mezi dvěma popisky?
function routeConnected(p, t, fid, la, lb) {
  const b = tableBoard(p); if (!b) return false;
  const keysOf = l => Object.entries(b.labels).filter(([k, v]) => v.toLowerCase() === String(l).trim().toLowerCase()).map(([k]) => k);
  const A = keysOf(la), B = new Set(keysOf(lb)); if (!A.length || !B.size) return false;
  const adj = {}; t.links.filter(l => l.fid === fid).forEach(l => { (adj[l.a] = adj[l.a] || []).push(l.b); (adj[l.b] = adj[l.b] || []).push(l.a); });
  const seen = new Set(A), q = [...A];
  while (q.length) { const k = q.shift(); if (B.has(k)) return true; (adj[k] || []).forEach(n => { if (!seen.has(n)) { seen.add(n); q.push(n); } }); }
  return false;
}
// Většina v oblastech: počty jednotek stran v každé oblasti.
function majority(p, t) {
  const b = tableBoard(p); if (!b || !b.regions) return [];
  const regs = {}; Object.entries(b.regions).forEach(([k, n]) => { (regs[n] = regs[n] || { cells: new Set(), cnt: {} }).cells.add(k); });
  t.items.forEach(i => { if (i.kind !== "unit") return; const u = p.units.find(x => x.id === i.unitId); const k = cellUnder(p, i); if (!u || !k) return; Object.values(regs).forEach(r => { if (r.cells.has(k)) r.cnt[u.factionId] = (r.cnt[u.factionId] || 0) + 1; }); });
  const pts = String(p.majority.points || "").split(/[,;\s]+/).map(Number).filter(n => !isNaN(n));
  return Object.entries(regs).map(([name, r]) => {
    const rank = Object.entries(r.cnt).sort((a, b2) => b2[1] - a[1]); const award = {};
    let place = 0; for (let i = 0; i < rank.length && place < pts.length; ) { const tie = rank.filter(x => x[1] === rank[i][1]); const sum = pts.slice(place, place + tie.length).reduce((a, v) => a + v, 0); tie.forEach(x => award[x[0]] = Math.floor(sum / tie.length)); place += tie.length; i += tie.length; }
    return { name, rank, award };
  });
}
