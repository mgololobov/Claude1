// ---------- Simulace (automatické testování) ----------
// Počítačoví hráči odehrají hru podle nastavených mechanik. Umí: nákupy z trhu, vykládání karet s efekty,
// akční pole, rondel, výběr rolí, závodní dráhu, automat, příjem, automatická pravidla a cíle hry.
// Použije rozestavení prvního scénáře a produkci z polí s čísly.
// Na mapě táhnou jednotky k cíli a útočí podle bojové tabulky, dílky se kladou na nejlepší místo (36-sim-extra).
// Štychy se rozdají a odehrají po kolech, karty z trhu se při zapnuté dražbě draží. Neumí trasy.
function effectValue(p, text) {
  let v = 0;
  String(text || "").replace(/^jednou\s+za\s+(kolo|tah|hru)\s*:\s*/i, "").split(/[;\n,|]/).forEach(raw => {
    const c = raw.trim().replace(/^(pokud\s+.+?|zaplať\s+\d+\s+.+?)\s*:\s*/i, ""); let m;
    if ((m = c.match(/^(všichni|ostatní|soupeř|hráč)?\s*([+-]\s*\d+)\s+(.+)$/i))) { const r = resByName(p, m[3]); if (!r) return; const n = parseInt(m[2].replace(/\s/g, ""), 10) * (r.vp ? 1 : .35);
      const who = (m[1] || "hráč").toLowerCase(); v += who === "hráč" ? n : who === "všichni" ? n * .3 : -n * .5; }
    else if ((m = c.match(/^líznout\s+(\d+)/i))) v += .4 * +m[1];
    else if ((m = c.match(/^posun\s+([+-]?\d+)/i))) v += .3 * +m[1];
    else if (/^vítěz/i.test(c)) v += 50;
  });
  const pay = String(text || "").match(/zaplať\s+(\d+)\s+(.+?)\s*:/i); if (pay) { const r = resByName(p, pay[2]); v -= +pay[1] * (r && r.vp ? 1 : .35); }
  return v;
}
function cardValue(p, c) { return (parseFloat(c.vp) || 0) + effectValue(p, c.effect); }
function simMoves(p, t, f, hasOwn, greedy) {
  const moves = []; const R = p.ruleset; const cur = p.resources.find(r => r.id === p.marketCur);
  const res = id => (t.res[f.id] || {})[id] || 0;
  if (f.bot) {
    const d = p.decks.find(x => x.id === f.bot);
    if (d) moves.push({ v: 0, label: "automat", run() { if (!t.piles[d.id].length && t.discard[d.id].length) { t.piles[d.id] = shuffle(t.discard[d.id]); t.discard[d.id] = []; } const cId = t.piles[d.id].pop(); if (!cId) return; const c = d.cards.find(x => x.id === cId); if (c.effect) runEffects(p, t, f.id, c.effect, c.title); t.discard[d.id].push(cId); } });
    return moves;
  }
  p.decks.filter(d => +d.market > 0).forEach(d => (t.market[d.id] || []).forEach((cId, i) => {
    if (!cId) return; const c = d.cards.find(x => x.id === cId); const price = parseFloat(c.cost) || 0;
    if (+c.fight) { const fr = p.resources.find(r => r.id === p.cb.fightRes); if (!fr || res(fr.id) >= +c.fight) moves.push({ v: effectValue(p, c.effect) + .4, card: c.title, run() { fightMarket(p, t, f.id, d.id, i); } }); return; }
    if (p.marketAuction) { if (!cur || res(cur.id) >= price) moves.push({ v: cardValue(p, c) * .6 + .2, card: c.title, run() { simAuction(p, t, d, i, hasOwn); } }); return; }
    if (cur && price && res(cur.id) < price) return;
    moves.push({ v: cardValue(p, c) - (cur ? .2 * price : 0) + .3, card: c.title, run() {
      if (cur && price) t.res[f.id][cur.id] -= price; t.market[d.id][i] = null; const h = { deckId: d.id, cardId: cId, own: true };
      if (hasOwn) (t.pdisc[f.id] = t.pdisc[f.id] || []).push(h); else { (t.tableau[f.id] = t.tableau[f.id] || []).push(h); if (c.effect) runEffects(p, t, f.id, c.effect, c.title); }
      refillMarket(p, t, d); after(p, t, "nakup", f.id, c.type);
    } });
  }));
  const payR = p.resources.find(x => x.id === R.playCost);
  (t.hands[f.id] || []).forEach(h => {
    const c = cardOf(p, h).c; if (!c) return; const price = parseFloat(c.cost) || 0;
    if (payR && price && res(payR.id) < price) return;
    if (hasOwn) return;
    const pay = String(c.effect || "").match(/^zaplať\s+(\d+)\s+([^:+]+?)\s*:/i); if (pay) { const pr = resByName(p, pay[2]); if (pr && res(pr.id) < +pay[1]) return; }
    moves.push({ v: cardValue(p, c) + .2, card: c.title, run() { const hand = t.hands[f.id]; const hh = hand.splice(hand.indexOf(h), 1)[0]; (t.tableau[f.id] = t.tableau[f.id] || []).push(hh); playDone(p, t, f.id, hh, "vylozit"); } });
  });
  if (p.actionMode === "slots") p.actions.forEach(a => {
    const taken = t.actionsTaken[a.id] || []; const free = Array.from({ length: a.slots }, (_, i) => i).find(i => !taken[i]); if (free == null) return;
    moves.push({ v: effectValue(p, a.effect) + .1, run() { (t.actionsTaken[a.id] = taken)[free] = f.id; if (a.effect) runEffects(p, t, f.id, a.effect, a.name); after(p, t, "akce", f.id, a.name); } });
  });
  if (p.actionMode === "rondel" && p.actions.length) p.actions.forEach((a, i) => {
    const n = p.actions.length; const pos = t.rondel[f.id]; const steps = pos == null ? 0 : (i - pos + n) % n; if (pos != null && !steps) return;
    const extra = Math.max(0, steps - (+p.rondel.free || 0)); const payRes = p.resources.find(r => r.id === p.rondel.pay); if (extra && payRes && res(payRes.id) < extra) return;
    moves.push({ v: effectValue(p, a.effect) - extra * .35, run() { if (extra && payRes) t.res[f.id][payRes.id] -= extra; t.rondel[f.id] = i; if (a.effect) runEffects(p, t, f.id, a.effect, a.name); after(p, t, "akce", f.id, a.name); } });
  });
  if (p.actionMode === "roles" && !Object.values(t.rolePick || {}).includes(f.id)) p.actions.forEach(a => {
    if ((t.rolePick || {})[a.id]) return; const bonus = (t.roleBonus || {})[a.id] || 0; const br = p.resources.find(r => r.id === p.roleRes);
    moves.push({ v: effectValue(p, a.effect) + bonus * .35, run() { t.rolePick = t.rolePick || {}; t.roleBonus = t.roleBonus || {}; t.rolePick[a.id] = f.id; if (bonus && br) { t.res[f.id][br.id] = res(br.id) + bonus; } t.roleBonus[a.id] = 0; if (a.effect) runEffects(p, t, f.id, a.effect, a.name); after(p, t, "akce", f.id, a.name); } });
  });
  if (+p.track.length) moves.push({ v: .3 * ((+p.track.die || 6) + 1) / 2 + .5, run() {
    const L = +p.track.length; const from = t.trackPos[f.id] || 0; t.trackPos[f.id] = Math.min(L, from + rnd(+p.track.die || 6));
    const eff = trackSpaces(p)[t.trackPos[f.id]]; if (eff) runEffects(p, t, f.id, eff, `Pole ${t.trackPos[f.id]}`); after(p, t, "draha", f.id); checkWin(p, t);
  } });
  if (!hasOwn && !+p.track.length) { const d = p.decks.find(x => !x.starter && !x.bot && !p.factions.some(ff => ff.bot === x.id) && t.piles[x.id] && t.piles[x.id].length && !+x.market);
    if (d) moves.push({ v: .25, run() { (t.hands[f.id] = t.hands[f.id] || []).push({ deckId: d.id, cardId: t.piles[d.id].pop() }); after(p, t, "lizat", f.id); } }); }
  return moves.concat(simExtraMoves(p, t, f));
}
function simGame(p0, opt) {
  const S0 = S.silent; S.silent = true;
  const p = clone(p0); delete p.isExample; p.table = null; p.decks.forEach(d => d.cards.forEach(c => { c.img = ""; })); p.boards.forEach(b => { b.bg = null; });
  const greedy = opt.policy !== "random"; const look = opt.policy === "lookahead"; const hist = [];
  const leader = (opp) => opp.reduce((a, b) => (scoreOf(p, t, b.id).total > scoreOf(p, t, a.id).total ? b : a));
  const ctx = { auto: true, choose: greedy ? (opts) => opts.map(o => effectValue(p, o.split(",").join(";"))).reduce((bi, v, i, arr) => v > arr[bi] ? i : bi, 0) : null, target: greedy ? leader : null };
  const t = ensureTable(p); t.order = opt.shuffleSeats ? shuffle(p.factions.map(f => f.id)) : null;
  const sc = p.scenarios[0]; if (sc && sc.setup) { t.boardId = sc.boardId || t.boardId; t.items = clone(sc.setup.items || []).map(i => ({ ...i, uid: uid() })); t.control = clone(sc.setup.control || {}); t.scenarioId = sc.id; }
  const prodBoard = tableBoard(p); const produce = prodBoard && Object.keys(prodBoard.numbers || {}).length;
  const pl = players(p, t); const R = p.ruleset; const hasOwn = p.decks.some(d => d.starter);
  const trickGame = +p.scoring.trick > 0 && !!trickDeck(p);
  const apt = Math.max(1, +R.actionsPerTurn || +opt.actions || 2);
  const drain = () => { let guard = 0; while (t.pending && t.pending.length && guard++ < 50) { const it = t.pending.shift(); if (it.kind === "choice") { const i = ctx.choose ? ctx.choose(it.opts) : Math.floor(Math.random() * it.opts.length); runEffects(p, t, it.fid, it.opts[i].split(",").join(";"), it.src, 1, ctx); } else { const opp = pl.filter(x => x.id !== it.fid); const o = ctx.target ? ctx.target(opp) : opp[Math.floor(Math.random() * opp.length)]; if (o) runEffects(p, t, o.id, it.effect, it.src, 1, ctx); } } };
  pl.forEach(f => { if (hasOwn) drawOwn(t, f.id, 5); else if (+R.drawUpTo) runEffects(p, t, f.id, `líznout ${R.drawUpTo}`, "Start", 1, ctx); });
  drain();
  const played = {}; pl.forEach(f => played[f.id] = new Set());
  let rounds = 0, start = 0;
  while (!t.winner && rounds < opt.rounds) {
    rounds++;
    const fn = t.firstNext; if (rounds > 1) start = fn ? Math.max(0, pl.findIndex(f => f.id === fn)) : opt.rotateStart === false ? start : (start + 1) % pl.length;
    if (rounds > 1) { newRound(p, t); t.order = null; t.actionsTaken = {}; if (p.actionMode === "roles") { t.roleBonus = t.roleBonus || {}; p.actions.forEach(a => { if (!(t.rolePick || {})[a.id]) t.roleBonus[a.id] = (t.roleBonus[a.id] || 0) + 1; }); t.rolePick = {}; } drain(); }
    if (produce) { const sum = rnd(6) + rnd(6); productionRoll(p, t, sum); fireTriggers(p, t, "hod", pl[0].id, sum); drain(); }
    if (trickGame) { simTrickRound(p, t, pl, start, greedy, played); checkWin(p, t); hist.push(pl.map(f => simScore(p, t, f.id))); continue; }
    for (let k = 0; k < pl.length && !t.winner; k++) {
      // Začíná hráč určený efektem „první hráč“, jinak se začínající hráč každé kolo posune.
      const s = (start + k) % pl.length;
      t.curF = s; t.acts = 0; const f = pl[s];
      fireTriggers(p, t, "tah", f.id, null); drain();
      if (hasOwn && !f.bot) { [...(t.hands[f.id] || [])].forEach(h => { const c = cardOf(p, h).c; if (!c || !(t.hands[f.id] || []).includes(h)) return; const hand = t.hands[f.id]; hand.splice(hand.indexOf(h), 1); (t.tableau[f.id] = t.tableau[f.id] || []).push(h); played[f.id].add(c.title); playDone(p, t, f.id, h, "vylozit"); drain(); }); t.acts = 0; }
      for (let a = 0; a < apt && !t.winner; a++) {
        let moves = simMoves(p, t, f, hasOwn, greedy); if (!moves.length) break;
        if (look && moves.length > 1) { const bi = lookaheadPick(p, t, f, () => simMoves(p, t, f, hasOwn, greedy)); moves = simMoves(p, t, f, hasOwn, greedy); if (bi >= 0 && moves[bi]) moves = [moves[bi]]; }
        const noisy = moves.map(m => ({ m, s: m.v + Math.random() * .4 })); const mv = greedy ? noisy.reduce((b, x) => (x.s > b.s ? x : b)).m : moves[Math.floor(Math.random() * moves.length)];
        if (mv.card) played[f.id].add(mv.card);
        const sb = opt.trace ? simScore(p, t, f.id) : 0; const cb = opt.trace ? JSON.stringify(t.res[f.id]) : "";
        mv.run(); drain(); checkWin(p, t);
        if (opt.trace) opt.trace.push({ r: rounds, pos: k, seat: s, mv: mv.card || mv.label || mv.name || "?", n: moves.length, d: simScore(p, t, f.id) - sb, res: cb + "→" + JSON.stringify(t.res[f.id]) });
        if (f.bot) break;
      }
      cbEndTurn(p, t, f.id);
      if (hasOwn) { (t.hands[f.id] || []).forEach(h => discardCard(t, h, f.id)); t.hands[f.id] = []; const keep = []; (t.tableau[f.id] || []).forEach(h => h.own ? discardCard(t, h, f.id) : keep.push(h)); t.tableau[f.id] = keep; drawOwn(t, f.id, 5); }
      if (+R.handLimit) { const h = t.hands[f.id] || []; while (h.length > +R.handLimit) discardCard(t, h.splice(Math.floor(Math.random() * h.length), 1)[0], f.id); }
      if (+R.drawUpTo && !hasOwn) { const need = +R.drawUpTo - (t.hands[f.id] || []).length; if (need > 0) runEffects(p, t, f.id, `líznout ${need}`, "Dobrání", 1, ctx); }
      drain();
    }
    hist.push(pl.map(f => simScore(p, t, f.id)));
  }
  finishLastRound(p, t);
  const scores = pl.map(f => simScore(p, t, f.id));
  // Výhra se při shodě bodů dělí mezi všechny nejlepší, aby remízy nezvýhodňovaly první místo.
  let share = pl.map(() => 0); const wi = t.winner ? pl.findIndex(f => f.id === t.winner.fid) : -1;
  if (wi >= 0 && t.winner.tie) t.winner.tie.forEach(id => { const i = pl.findIndex(f => f.id === id); if (i >= 0) share[i] = 1 / t.winner.tie.length; });
  else if (wi >= 0) share[wi] = 1; else { const mx = Math.max(...scores); const top = scores.map((s, i) => s === mx ? i : -1).filter(i => i >= 0); top.forEach(i => share[i] = 1 / top.length); }
  const winIdx = share.indexOf(Math.max(...share));
  const reason = t.winner ? t.winner.why.replace(/\d+\.?\s*kol[ea]?/g, "N. kole").replace(/dosáhl \d+ bodů/, "bodový cíl").replace(/^remíza.*/, "remíza po dohrání kola").replace(/nejvíc bodů po dohrání kola.*/, "bodový cíl, dohrané kolo") : `limit ${opt.rounds} kol simulace`;
  const res = {}; p.resources.filter(r => !r.global).forEach(r => { res[r.name] = pl.reduce((a, f) => a + ((t.res[f.id] || {})[r.id] || 0), 0) / pl.length; });
  S.silent = S0;
  return { seats: pl.map((f, i) => ({ fid: f.id, name: f.name, seat: i, score: scores[i], played: [...played[f.id]] })), winIdx, share, rounds, reason, res, hist };
}
async function runSimulation(p, opt, progress) {
  const games = []; const N = Math.max(1, Math.min(2000, +opt.games || 100));
  for (let i = 0; i < N; i++) {
    try { games.push(simGame(p, opt)); } catch (e) { S.silent = false; return { error: (e && e.message) || String(e), games: games.length }; }
    if (progress && i % 10 === 9) { progress(i + 1, N); await new Promise(r => setTimeout(r, 0)); }
  }
  return summarizeSim(p, games);
}
function summarizeSim(p, games) {
  const n = games.length; const nPl = games[0] ? games[0].seats.length : 0;
  const seat = Array.from({ length: nPl }, () => ({ wins: 0, score: 0 })); const fac = {}; const cards = {}; const reasons = {}; let rounds = 0, margin = 0, mCount = 0; const res = {};
  games.forEach(g => {
    rounds += g.rounds; reasons[g.reason] = (reasons[g.reason] || 0) + 1;
    g.seats.forEach((s, i) => { const w = g.share ? g.share[i] : (i === g.winIdx ? 1 : 0); seat[i].score += s.score; seat[i].wins += w;
      const F = fac[s.fid] = fac[s.fid] || { name: s.name, wins: 0, score: 0, games: 0 }; F.games++; F.score += s.score; F.wins += w;
      s.played.forEach(c => { const C = cards[c] = cards[c] || { plays: 0, wins: 0 }; C.plays++; C.wins += w; }); });
    const sc = g.seats.map(s => s.score).sort((a, b) => b - a); if (sc.length > 1) { margin += sc[0] - sc[1]; mCount++; }
    Object.entries(g.res).forEach(([k, v]) => res[k] = (res[k] || 0) + v / n);
  });
  const fair = nPl ? 1 / nPl : 0; const warnings = [];
  const ties = games.filter(g => g.share && g.share.filter(x => x > 0).length > 1).length;
  seat.forEach((s, i) => { const wr = s.wins / n; if (n >= 30 && wr - fair > .12) warnings.push(`${i + 1}. hráč v pořadí vyhrává ${Math.round(wr * 100)} % her (férově by to bylo ${Math.round(fair * 100)} %).`); });
  Object.values(fac).forEach(F => { const wr = F.wins / F.games; if (n >= 30 && wr - fair > .15) warnings.push(`Strana ${F.name} vyhrává ${Math.round(wr * 100)} % her – zkontroluj její schopnost a start.`); });
  if (ties / n > .25) warnings.push(`${Math.round(ties / n * 100)} % her skončilo remízou – bodování možná moc málo rozlišuje hráče.`);
  const cardList = Object.entries(cards).map(([title, C]) => ({ title, plays: C.plays, wr: C.wins / C.plays })).sort((a, b) => b.wr - a.wr);
  cardList.filter(c => c.plays >= Math.max(5, n * .1) && c.wr > fair + .2).slice(0, 3).forEach(c => warnings.push(`Karta „${c.title}“: kdo ji zahraje, vyhraje v ${Math.round(c.wr * 100)} % her – možná je přesílená.`));
  const allCards = new Set(p.decks.filter(d => !p.factions.some(f => f.bot === d.id)).flatMap(d => d.cards.filter(c => !c.locked && +c.qty).map(c => c.title)));
  const never = [...allCards].filter(t => !cards[t]); if (never.length && cardList.length) warnings.push(`V simulaci nikdo nezahrál: ${never.slice(0, 6).join(", ")}${never.length > 6 ? "…" : ""}.`);
  if (Object.keys(reasons).some(r => r.startsWith("limit")) && (reasons[Object.keys(reasons).find(r => r.startsWith("limit"))] / n) > .5) warnings.push("Většina her skončila na limitu kol simulace – hra možná nemá dosažitelný cíl nebo je moc dlouhá.");
  const len = Math.max(0, ...games.map(g => (g.hist || []).length)); const curve = Array.from({ length: len }, (_, r) => Array.from({ length: nPl }, (_, s) => games.reduce((a, g) => a + ((g.hist || [])[Math.min(r, g.hist.length - 1)] || [])[s] || 0, 0) / n));
  const dr = games.map(decidedRound).filter(x => x != null); const decided = dr.length ? dr.reduce((a, b) => a + b, 0) / dr.length : null;
  if (decided != null && n >= 30 && rounds / n > 3 && decided / (rounds / n) < .5) warnings.push(`Vítěz bývá jasný už kolem ${Math.round(decided)}. kola z ${Math.round(rounds / n)} – konec hry může být nudný, zvaž dohánění.`);
  return { n, nPl, avgRounds: rounds / n, curve, decided, seat: seat.map(s => ({ wr: s.wins / n, avg: s.score / n })), fac: Object.values(fac).map(F => ({ name: F.name, wr: F.wins / F.games, avg: F.score / F.games })), cards: cardList, reasons, margin: mCount ? margin / mCount : null, res, warnings };
}
function simPanelHTML(p) {
  const O = S.simOpt = S.simOpt || { games: 200, rounds: +p.ruleset.win.turns || 15, policy: "greedy", actions: 2, shuffleSeats: false, rotateStart: true };
  const R = S.simRes && S.simRes.pid === p.id ? S.simRes.r : null;
  const bar = (label, val, max, txt) => `<div class="bar"><span class="n" title="${esc(label)}">${esc(label)}</span><span class="tr"><span class="fl" style="width:${max ? Math.round(val / max * 100) : 0}%"></span></span><span class="v">${txt}</span></div>`;
  return `<div class="panel"><div class="row spread"><h2>Automatické testování</h2><span class="count">simulace</span></div>
    <p class="hint">Počítač odehraje stovky her podle tvých karet, efektů, akcí, zdrojů a pravidel a ukáže vyváženost. Umí trh, vykládání karet s efekty, akční pole, rondel, role, dráhu, automat, pohyb a boj na mapě, dílky, štychy, dražbu karet z trhu a cíle hry. Trasy přeskočí.</p>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">
      <label class="f">Počet her<input type="number" min="10" max="2000" data-so="games" value="${O.games}"></label>
      <label class="f">Nejvýš kol<input type="number" min="1" max="200" data-so="rounds" value="${O.rounds}"></label>
      <label class="f">Akcí za tah<input type="number" min="1" max="10" data-so="actions" value="${+p.ruleset.actionsPerTurn || O.actions}" ${+p.ruleset.actionsPerTurn ? "disabled title='Určeno v Pravidlech'" : ""}></label>
      <label class="f">Hráči hrají<select data-so="policy"><option value="greedy" ${O.policy === "greedy" ? "selected" : ""}>Chytře (nejlepší tah)</option><option value="lookahead" ${O.policy === "lookahead" ? "selected" : ""}>Promyšleně (zkouší tahy dopředu, pomalejší)</option><option value="random" ${O.policy === "random" ? "selected" : ""}>Náhodně</option></select></label>
    </div>
    <label class="chk"><input type="checkbox" data-so="rotateStart" ${O.rotateStart !== false ? "checked" : ""}> Začínající hráč se každé kolo posouvá</label>
    <label class="chk"><input type="checkbox" data-so="shuffleSeats" ${O.shuffleSeats ? "checked" : ""}> Strany losovat do náhodného pořadí (odhalí sílu stran, ne výhodu pořadí)</label>
    <div class="row"><button class="btn primary" id="simRun">Spustit simulaci</button><span class="hint" id="simProg"></span></div>
    ${R && R.error ? `<div class="lint err"><b>Chyba</b><span>Simulace spadla po ${R.games} hrách: ${esc(R.error)}</span></div>` : ""}
    ${R && !R.error ? `
      <div class="stat-row">
        <div class="stat"><span class="eyebrow">Her</span><b>${R.n}</b></div>
        <div class="stat"><span class="eyebrow">Průměrně kol</span><b>${R.avgRounds.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })}</b></div>
        <div class="stat"><span class="eyebrow">Rozhodnuto</span><b>${R.decided == null ? "–" : "~" + Math.round(R.decided) + "."}</b><span class="muted">kolo</span></div>
        <div class="stat"><span class="eyebrow">Těsnost</span><b>${R.margin == null ? "–" : R.margin.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })}</b><span class="muted">bodů 1.–2. místo</span></div>
      </div>
      ${R.warnings.length ? `<div class="list">${R.warnings.map(w => `<div class="lint warn"><b>Pozor</b><span>${esc(w)}</span></div>`).join("")}</div>` : `<div class="lint ok"><b>Vyvážené</b><span>Simulace nenašla výraznou výhodu pořadí, strany ani karty.</span></div>`}
      ${scoreChartSVG(R)}
      <div class="two">
        <div style="display:flex;flex-direction:column;gap:10px;min-width:0"><h3>Výhry podle pořadí</h3><div class="bars">${R.seat.map((s, i) => bar(`${i + 1}. hráč`, s.wr, 1, `${Math.round(s.wr * 100)} % · ⌀ ${s.avg.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} b.`)).join("")}</div>
          <h3>Strany</h3><div class="bars">${R.fac.map(f => bar(f.name, f.wr, 1, `${Math.round(f.wr * 100)} % · ⌀ ${f.avg.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} b.`)).join("")}</div>
          <h3>Jak hry končí</h3><div class="bars">${Object.entries(R.reasons).sort((a, b) => b[1] - a[1]).map(([k, v]) => bar(k, v, R.n, `${Math.round(v / R.n * 100)} %`)).join("")}</div></div>
        <div style="display:flex;flex-direction:column;gap:10px;min-width:0"><h3>Karty – úspěšnost toho, kdo je zahrál</h3>
          ${R.cards.length ? `<div class="bars">${R.cards.slice(0, 12).map(c => bar(c.title, c.wr, 1, `${Math.round(c.wr * 100)} % · ${c.plays}×`)).join("")}</div>` : `<span class="hint">Žádné karty se nehrály.</span>`}
          ${Object.keys(R.res).length ? `<h3>Zdroje na konci (průměr na hráče)</h3><div class="bars">${Object.entries(R.res).map(([k, v]) => bar(k, v, Math.max(...Object.values(R.res), 1), v.toLocaleString("cs-CZ", { maximumFractionDigits: 1 }))).join("")}</div>` : ""}</div>
      </div>` : ""}
  </div>`;
}
function wireSimPanel(main, p) {
  $$("[data-so]", main).forEach(i => i.addEventListener("change", () => { S.simOpt[i.dataset.so] = i.type === "checkbox" ? i.checked : i.tagName === "SELECT" ? i.value : +i.value; }));
  if ($("#simRun")) $("#simRun").onclick = async () => {
    const btn = $("#simRun"); btn.disabled = true; $("#simProg").textContent = "Simuluji…";
    const r = await runSimulation(p, { ...S.simOpt, actions: +p.ruleset.actionsPerTurn || S.simOpt.actions }, (i, n) => { const el = $("#simProg"); if (el) el.textContent = `Odehráno ${i} z ${n}…`; });
    S.simRes = { pid: p.id, r }; render();
  };
  wireTunePanel(main, p);
}
