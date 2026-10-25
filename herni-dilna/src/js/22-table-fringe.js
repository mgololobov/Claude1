// ---------- Okrajové mechaniky na stole ----------
const REGION_COLORS = ["#7a4fa0", "#c98a12", "#2a8c8c", "#c2577f", "#3f6fb0", "#b0402c", "#2f7a45", "#4a4a48"];
function regionColor(b, name) { const all = [...new Set(Object.values(b.regions || {}))]; return REGION_COLORS[Math.max(0, all.indexOf(name)) % REGION_COLORS.length]; }
function tileSVG(p, b, tl, rot, cx, cy, g) {
  const n = b.type === "square" ? 4 : 6; const s = +b.size || 34;
  const ap = b.type === "square" ? s * .9 : s * Math.sqrt(3) / 2; const angs = n === 4 ? [-90, 0, 90, 180] : [-90, -30, 30, 90, 150, 210];
  let out = `<polygon points="${g.poly(cx, cy)}" fill="${tl.color}" stroke="rgba(0,0,0,.45)" stroke-width="1.5"/>`;
  angs.forEach((a, i) => { const e = edgeAt(tl, rot, i, n); if (!e) return; const rad = a * Math.PI / 180;
    out += `<circle cx="${(cx + Math.cos(rad) * ap * .68).toFixed(1)}" cy="${(cy + Math.sin(rad) * ap * .68).toFixed(1)}" r="${(s * .2).toFixed(1)}" fill="${edgeColor(p, e)}" stroke="#fff" stroke-width="1.2"/>`; });
  if (tl.icon) out += `<text x="${cx}" y="${cy + s * .2}" text-anchor="middle" font-size="${(s * .55).toFixed(0)}">${esc(tl.icon)}</text>`;
  return out;
}
function tilePreview(p, tl, rot = 0, size = 26) {
  const n = tileEdges(tl).length === 6 ? 6 : 4; const b = { type: n === 6 ? "hex" : "square", size, cols: 1, rows: 1 }; const g = geo(b); const [cx, cy] = g.center(0, 0);
  return `<svg width="${g.W.toFixed(0)}" height="${g.H.toFixed(0)}" viewBox="0 0 ${g.W.toFixed(1)} ${g.H.toFixed(1)}" aria-hidden="true">${tileSVG(p, b, tl, rot, cx, cy, g)}</svg>`;
}
function playCheck(p, t, fid, h, cat) {
  const R = p.ruleset; const msgs = []; const cp = curPlayer(p, t); const c = h && cardOf(p, h).c; if (!c) return false;
  if (R.ownTurn && cp && fid !== cp.id && !c.reaction) msgs.push("hraje hráč, který není na tahu"); // reakce jde zahrát kdykoli
  const r = p.resources.find(x => x.id === R.playCost); const price = cardPrice(p, t, fid, c);
  if (r && price && cat === "vylozit" && ((t.res[fid] || {})[r.id] || 0) < price) msgs.push(`na kartu „${c.title}“ chybí ${r.name} (cena ${price})`);
  msgs.push(...cbPlayCheck(p, t, fid, c, cat));
  return gate(p, t, cat, msgs);
}
function playDone(p, t, fid, h, cat) {
  const R = p.ruleset; const c = cardOf(p, h).c; const r = p.resources.find(x => x.id === R.playCost); const price = cardPrice(p, t, fid, c);
  if (r && price && cat === "vylozit") { t.res[fid] = t.res[fid] || {}; t.res[fid][r.id] = Math.max(0, (t.res[fid][r.id] || 0) - price); }
  const f = p.factions.find(x => x.id === fid); logEv(t, `${f ? f.name : ""} ${cat === "vylozit" ? "vykládá" : "hraje"} ${c.title}`);
  cbPlayDone(p, t, fid, h, c, cat);
  if (c.effect) runEffects(p, t, fid, c.effect, c.title);
  allyCheck(p, t, fid, h, c);
  after(p, t, cat, fid, c.type || c.suit || c.title);
}
function moveViolations(p, t, it, origin, range, k) {
  const R = p.ruleset; const msgs = []; const u = p.units.find(x => x.id === it.unitId); const cp = curPlayer(p, t);
  if (R.moveRange && range && origin && !(k in range)) msgs.push("cíl je mimo dosah pohybu");
  if (R.moveOnce && t.moved[it.uid]) msgs.push("jednotka se v tomto tahu už pohnula");
  if (it.st && it.st.sup) msgs.push("jednotka je potlačená palbou");
  if (fuelLeft(p, it) === 0) msgs.push("došlo palivo");
  msgs.push(...actViolation(p, it));
  if (R.ownTurn && cp && u && u.factionId !== cp.id) msgs.push(`táhne strana, která není na tahu (${cp.name})`);
  if (+R.stackLimit) { const n = t.items.filter(o => o !== it && o.kind === "unit" && !o.inside && cellUnder(p, o) === k).length; if (n >= +R.stackLimit) msgs.push(`na poli může stát nejvýš ${R.stackLimit} ${plural(+R.stackLimit, "jednotka", "jednotky", "jednotek")}`); }
  return msgs;
}
function majHTML(p, t) {
  const m = majority(p, t); if (!m.length) return "";
  const vp = p.resources.find(r => r.vp && !r.global);
  return `<section><div class="eyebrow">Většina v oblastech · body ${esc(p.majority.points || "–")}</div>
    ${m.map(r => `<div class="action"><b>${esc(r.name)}</b><span class="row">${r.rank.length ? r.rank.map(([fid, n]) => { const f = p.factions.find(x => x.id === fid); return `<span class="pl-chip ${r.award[fid] ? "win" : ""}"><span class="dot" style="background:${f ? f.color : "#888"};border-radius:50%"></span> ${n}× ${r.award[fid] ? "→ " + r.award[fid] + " b." : ""}</span>`; }).join("") : `<span class="hint">nikdo</span>`}</span></div>`).join("")}
    ${vp ? `<button class="btn small" id="majAward">Připsat body za většiny (${esc(vp.name)})</button>` : `<span class="hint">Pro připsání bodů vytvoř zdroj s označením Vítězné body.</span>`}</section>`;
}
function routeHTML(p, t) {
  const b = tableBoard(p); if (!b) return ""; const pl = players(p, t); const tk = p.routes.tickets || [];
  const cost = p.resources.find(r => r.id === p.routes.cost);
  return `<section><div class="eyebrow">Trasy a cíle</div>
    <button class="btn ${S.routeMode ? "on" : ""}" id="routeMode">${S.routeMode ? "Stavba tras zapnutá" : "Stavět trasy"}</button>
    <p class="hint">Klepni na pole a pak na sousední – postaví se úsek pro hráče na tahu${cost ? ` za ${p.routes.price || 1} × ${esc(cost.name)}` : ""}. Klepnutím na stejný úsek znovu ho zbouráš.</p>
    ${tk.length ? `<div class="list">${tk.map(x => `<div class="row spread"><span><b>${esc(x.a)} – ${esc(x.b)}</b> <span class="count">${x.pts} b.</span></span><span class="row">${pl.filter(f => !x.fid || x.fid === f.id).map(f => `<span class="pl-chip ${routeConnected(p, t, f.id, x.a, x.b) ? "win" : ""}"><span class="dot" style="background:${f.color};border-radius:50%"></span> ${routeConnected(p, t, f.id, x.a, x.b) ? "✓" : "–"}</span>`).join("")}</span></div>`).join("")}</div>` : `<span class="hint">Cíle (spojit dvě místa) nastavíš v Mechanikách.</span>`}
    ${t.links.length ? `<button class="btn small" id="routeClear">Zbourat všechny trasy</button>` : ""}</section>`;
}
function sideTiles(p, t) {
  if (!p.tiles.length) return `<p class="hint">Dílky vytvoříš v Komponentách. Pokládají se na pole mapy – vyber mapu v nástroji Komponenty.</p>`;
  const b = tableBoard(p); const h = t.tileHand; const tl = h && p.tiles.find(x => x.id === h.id);
  return `<section><div class="eyebrow">Dílky · v hromádce ${t.tileStack.length} · položeno ${Object.keys(t.tilesPlaced).length}</div>
      ${!b ? `<p class="hint">Nejdřív vyber mapu (nástroj Komponenty). Hodí se prázdná čtvercová nebo hexová mapa.</p>` : ""}
      ${tl ? `<div class="row" style="align-items:center;gap:14px">${tilePreview(p, tl, h.rot, 40)}<div><b>${esc(tl.name)}</b><br><span class="hint">hrany: ${esc(tileEdges(tl).join(" · "))}</span></div></div>
        <div class="row"><button class="btn small" id="tileRot">Otočit</button><button class="btn small ${S.tileMode ? "on" : ""}" id="tileMode" ${b ? "" : "disabled"}>${S.tileMode ? "Klepni na pole mapy" : "Položit na mapu"}</button><button class="btn small" id="tileBack">Vrátit pod hromádku</button></div>
        ${b && S.tileMode ? `<p class="hint">Pole, kam dílek pasuje: ${tileFits(p, t, b, h).length || "žádné"}${tileFits(p, t, b, h).length ? "" : " – zkus dílek otočit"}.</p>` : ""}`
      : `<button class="btn primary" id="tileDraw" ${t.tileStack.length ? "" : "disabled"}>Táhnout dílek</button>`}</section>
    <section><div class="eyebrow">Legenda hran</div><div class="row">${[...new Set(p.tiles.flatMap(tileEdges).filter(Boolean))].map(e => `<span class="pl-chip"><span class="dot" style="background:${edgeColor(p, e)};border-radius:50%"></span> ${esc(e)}</span>`).join("")}</div>
      <span class="hint">${p.tileRules.match ? "Hrany musí navazovat." : "Hrany se nehlídají."} ${p.tileRules.adjacent ? "Dílek musí sousedit s položeným." : ""}</span></section>`;
}
function tileFits(p, t, b, h) { const out = []; for (let c = 0; c < b.cols; c++) for (let r = 0; r < b.rows; r++) { const k = c + "," + r; if (!tileCheck(p, t, b, k, h.id, h.rot).length) out.push(k); } return out; }
function sideTrack(p, t) {
  const L = +p.track.length; if (!L) return `<p class="hint">Závodní dráhu (hod a pohyb) nastavíš v Mechanikách.</p>`;
  const pl = players(p, t); const sp = trackSpaces(p);
  return `<section><div class="eyebrow">Dráha · ${L} polí · kostka k${p.track.die || 6}</div>${fchipsHTML(p, t)}
      <div class="track">${Array.from({ length: L + 1 }, (_, i) => { const here = pl.filter(f => (t.trackPos[f.id] || 0) === i);
        return `<div class="tc ${sp[i] ? "sp" : ""} ${i === L ? "fin" : ""}" title="${esc(sp[i] || "")}"><span class="n">${i === 0 ? "S" : i === L ? "C" : i}</span><span class="row" style="gap:1px">${here.map(f => `<span class="dot" style="background:${f.color};border-radius:50%;width:10px;height:10px"></span>`).join("")}</span></div>`; }).join("")}</div>
      <div class="row"><button class="btn primary" id="trackRoll">Hodit a táhnout</button><button class="btn small" id="trackBack" aria-label="Zpět o pole">−1</button><button class="btn small" id="trackFwd" aria-label="Vpřed o pole">+1</button></div>
      ${S.trackMsg ? `<div class="selbar">${esc(S.trackMsg)}</div>` : ""}
      ${Object.keys(sp).length ? `<div class="eyebrow">Zvláštní pole</div><div class="log" style="max-height:140px">${Object.entries(sp).map(([i, e]) => `<span>${i}: ${esc(e)}</span>`).join("")}</div>` : ""}
      <button class="btn small" id="trackReset">Všichni na start</button></section>`;
}
function trackSpaces(p) { const o = {}; String(p.track.spaces || "").split(/\r?\n/).forEach(l => { const m = l.match(/^\s*(\d+)\s*[:=]\s*(.+)$/); if (m) o[+m[1]] = m[2].trim(); }); return o; }
function sideTrade(p, t) {
  const pl = players(p, t); const own = p.resources.filter(r => !r.global);
  if (!own.length) return `<p class="hint">Obchod potřebuje zdroje (mince, suroviny). Přidáš je v Mechanikách.</p>`;
  const A = S.trA && pl.find(f => f.id === S.trA) ? S.trA : (pl[0] || {}).id, B = S.trB && pl.find(f => f.id === S.trB) && S.trB !== A ? S.trB : (pl.find(f => f.id !== A) || {}).id;
  S.trA = A; S.trB = B; const cur = p.resources.find(r => r.id === p.stock.currency); const cp = curPlayer(p, t);
  return `<section><div class="eyebrow">Výměna mezi hráči</div>
      <div class="grid" style="grid-template-columns:1fr 1fr"><label class="f">Hráč A<select id="trA">${pl.map(f => `<option value="${f.id}" ${f.id === A ? "selected" : ""}>${esc(f.name)}</option>`).join("")}</select></label>
      <label class="f">Hráč B<select id="trB">${pl.map(f => `<option value="${f.id}" ${f.id === B ? "selected" : ""}>${esc(f.name)}</option>`).join("")}</select></label></div>
      <div class="score" style="grid-template-columns:1fr 70px 70px"><span class="hint">Zdroj</span><span class="hint">A dá</span><span class="hint">B dá</span>
        ${own.map(r => `<span>${esc(r.name)} <span class="count">${(t.res[A] || {})[r.id] ?? 0} / ${(t.res[B] || {})[r.id] ?? 0}</span></span><input type="number" min="0" data-tra="${r.id}" value="0" aria-label="${esc(r.name)} od A"><input type="number" min="0" data-trb="${r.id}" value="0" aria-label="${esc(r.name)} od B">`).join("")}</div>
      <button class="btn primary" id="tradeGo" ${A && B ? "" : "disabled"}>Provést výměnu</button></section>
    ${p.stock.goods.length && cur ? `<section><div class="eyebrow">Burza · platí se v „${esc(cur.name)}“ · obchoduje ${esc(cp ? cp.name : "")}</div>
      ${p.stock.goods.map(g => { const r = p.resources.find(x => x.id === g.resId); if (!r) return ""; const pr = t.prices[g.resId];
        return `<div class="action"><div class="row spread"><b>${esc(r.name)}</b><span class="mono">cena ${pr}</span></div>
          <div class="ladder">${Array.from({ length: (+g.max || 10) - (+g.min || 1) + 1 }, (_, i) => { const v = (+g.min || 1) + i; return `<span class="${v === pr ? "on" : ""}">${v}</span>`; }).join("")}</div>
          <div class="row"><button class="btn small primary" data-sbuy="${g.resId}">Koupit za ${pr}</button><button class="btn small" data-ssell="${g.resId}">Prodat za ${Math.max(+g.min || 1, pr - 1)}</button></div></div>`; }).join("")}
      <p class="hint">Nákup zvedne cenu o 1, prodej ji o 1 sníží – nabídka a poptávka.</p></section>` : `<p class="hint">Burzu s proměnlivými cenami nastavíš v Mechanikách.</p>`}`;
}
function sideSecret(p, t) {
  const pl = players(p, t); const roles = String(p.roles || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const E = t.envelope;
  return `<section><div class="eyebrow">Tajné role</div>
      ${roles.length ? (t.roles ? `${pl.map(f => `<div class="row spread"><span class="row"><span class="dot" style="background:${f.color};border-radius:50%"></span><b>${esc(f.name)}</b></span>${t.rolesShown || (t.revealed || {})[f.id] ? `<span class="pl-chip win">${esc(t.roles[f.id] || "–")}</span>` : `<span class="row"><button class="btn small" data-rolesee="${f.id}">Podívat se</button><button class="btn small" data-rolerev="${f.id}">Odhalit</button></span>`}</div>`).join("")}
        <div class="row"><button class="btn small" id="rolesAll">${t.rolesShown ? "Skrýt" : "Odhalit všechny"}</button><button class="btn small" id="rolesDeal">Rozdat znovu</button></div>`
        : `<p class="hint">Role: ${roles.map(esc).join(", ")}</p><button class="btn primary" id="rolesDeal">Rozdat role náhodně</button>`) : `<p class="hint">Seznam rolí (např. zrádce, věrní) zapíšeš v Mechanikách.</p>`}</section>
    <section><div class="eyebrow">Dedukce – tajná obálka</div>
      ${E ? `<p class="hint">V obálce je ${E.length} ${plural(E.length, "karta", "karty", "karet")} z balíčků ${E.map(h => esc((p.decks.find(d => d.id === h.deckId) || {}).name || "")).join(", ")}.</p>
        ${t.envShown ? `<div class="hand mini">${E.map(h => { const { d, c } = cardOf(p, h); return c ? `<div class="hc">${cardHTML(c, d)}</div>` : ""; }).join("")}</div>` : ""}
        <div class="row"><button class="btn primary" id="envAccuse">Obvinit</button><button class="btn small" id="envShow">${t.envShown ? "Skrýt" : "Odhalit obálku"}</button><button class="btn small" id="envBack">Vrátit karty</button></div>`
      : `<p class="hint">Z každého vybraného balíčku se tajně odloží jedna karta (jako v Cluedo). Hráči pak hádají, které to jsou.</p>
        <div class="row">${p.decks.filter(d => !d.starter).map(d => `<label class="chk"><input type="checkbox" data-envd="${d.id}"> ${esc(d.name)}</label>`).join("") || `<span class="hint">Žádné balíčky.</span>`}</div>
        <button class="btn primary" id="envMake">Připravit obálku</button>`}</section>${bluffHTML(p, t)}`;
}
function sideDraft(p, t) {
  const mode = S.draftMode || "draft";
  return `<section><div class="tools"><button data-dmode="draft" aria-pressed="${mode === "draft"}">Draft</button><button data-dmode="cut" aria-pressed="${mode === "cut"}">Rozděl a vyber</button></div></section>` + (mode === "cut" ? sideCut(p, t) : sideDraftClassic(p, t));
}
function sideCut(p, t) {
  const X = t.cut; const decks = p.decks.filter(d => !d.starter); const pl = players(p, t);
  if (!X) return `<section><p class="hint">Jeden hráč rozdělí karty na dvě hromádky, druhý si jednu vybere. Kdo dělí, snaží se o férové rozdělení.</p>
    ${decks.length ? `<label class="f">Balíček<select id="cutDeck">${decks.map(d => `<option value="${d.id}">${esc(d.name)} (${t.piles[d.id].length})</option>`).join("")}</select></label>
    <label class="f">Kolik karet otočit<input type="number" id="cutN" min="2" max="12" value="5"></label>
    <button class="btn primary" id="cutGo" ${pl.length > 1 ? "" : "disabled"}>Začít – dělí ${esc((curPlayer(p, t) || {}).name || "")}</button>` : `<p class="hint">Nejdřív vytvoř balíček karet.</p>`}</section>`;
  const div = p.factions.find(f => f.id === X.divider), ch = p.factions.find(f => f.id === X.chooser); const deck = p.decks.find(d => d.id === X.deckId);
  const pile = k => X.cards.filter((_, i) => (X.side[i] || "A") === k);
  return `<section><div class="eyebrow">${X.stage === "divide" ? `Dělí ${esc(div ? div.name : "")} – klepnutím přesouváš kartu mezi A a B` : `Vybírá ${esc(ch ? ch.name : "")}`}</div>
    ${["A", "B"].map(k => `<div class="eyebrow">Hromádka ${k} (${pile(k).length})</div><div class="hand mini">${X.cards.map((cId, i) => (X.side[i] || "A") !== k ? "" : `<button class="card-cell" data-cut="${i}" ${X.stage === "divide" ? "" : "disabled"}>${cardHTML(deck.cards.find(c => c.id === cId), deck)}</button>`).join("")}</div>`).join("")}
    ${X.stage === "divide" ? `<button class="btn primary" id="cutDone">Hotovo – předat ${esc(ch ? ch.name : "")}</button>` : `<div class="row"><button class="btn primary" data-cutpick="A">Beru A</button><button class="btn primary" data-cutpick="B">Beru B</button></div>`}
    <button class="btn small danger" id="cutCancel">Zrušit</button></section>`;
}
function wireExtra(main, p, t, save) {
  const q = id => document.getElementById(id); const on = (sel, fn) => $$(sel, main).forEach(el => el.addEventListener("click", () => fn(el)));
  const cp = curPlayer(p, t); const pl = players(p, t); const b = tableBoard(p);
  if (q("clearWin")) q("clearWin").onclick = () => { t.winner = null; save(); render(); };
  if (q("view")) q("view").onchange = e => { S.view = e.target.value; S.sel = null; render(); };
  // dílky
  if (q("tileDraw")) q("tileDraw").onclick = () => { t.tileHand = { id: t.tileStack.pop(), rot: 0 }; S.tileMode = true; save(); render(); };
  if (q("tileRot")) q("tileRot").onclick = () => { const n = b && b.type !== "square" ? 6 : 4; t.tileHand.rot = (t.tileHand.rot + 1) % n; save(); render(); };
  if (q("tileMode")) q("tileMode").onclick = () => { S.tileMode = !S.tileMode; render(); };
  if (q("tileBack")) q("tileBack").onclick = () => { t.tileStack.unshift(t.tileHand.id); t.tileHand = null; S.tileMode = false; save(); render(); };
  // dráha
  const moveTrack = (fid, steps, label) => {
    const L = +p.track.length; const from = t.trackPos[fid] || 0; t.trackPos[fid] = Math.max(0, Math.min(L, from + steps));
    const f = p.factions.find(x => x.id === fid); let msg = `${f ? f.name : ""}${label ? " hodil " + label + " a" : ""} jde z ${from} na ${t.trackPos[fid]}`;
    const eff = trackSpaces(p)[t.trackPos[fid]]; if (eff) { const r = runEffects(p, t, fid, eff, `Pole ${t.trackPos[fid]}`); msg += ` · pole ${t.trackPos[fid]}: ${r.join(", ")}`; }
    S.trackMsg = msg; logEv(t, msg); checkWin(p, t);
  };
  if (q("trackRoll")) q("trackRoll").onclick = () => { if (!cp || !gate(p, t, "draha")) return; const v = rnd(+p.track.die || 6); moveTrack(cp.id, v, String(v)); after(p, t, "draha", cp.id); if (p.track.autoNext) { t.curF = (t.curF + 1) % pl.length; t.acts = 0; } save(); render(); };
  if (q("trackBack")) q("trackBack").onclick = () => { if (cp) { t.trackPos[cp.id] = Math.max(0, (t.trackPos[cp.id] || 0) - 1); save(); render(); } };
  if (q("trackFwd")) q("trackFwd").onclick = () => { if (cp) { moveTrack(cp.id, 1); save(); render(); } };
  if (q("trackReset")) q("trackReset").onclick = () => { t.trackPos = {}; S.trackMsg = ""; save(); render(); };
  // obchod
  if (q("trA")) q("trA").onchange = e => { S.trA = e.target.value; render(); };
  if (q("trB")) q("trB").onchange = e => { S.trB = e.target.value; render(); };
  if (q("tradeGo")) q("tradeGo").onclick = () => {
    const A = S.trA, B = S.trB; if (A === B) { toast("Vyber dva různé hráče"); return; }
    const give = {}, take = {}; $$("[data-tra]", main).forEach(i => give[i.dataset.tra] = Math.max(0, +i.value || 0)); $$("[data-trb]", main).forEach(i => take[i.dataset.trb] = Math.max(0, +i.value || 0));
    const msgs = []; Object.entries(give).forEach(([r, v]) => { if (v > ((t.res[A] || {})[r] || 0)) msgs.push(`${p.factions.find(f => f.id === A).name} nemá dost ${p.resources.find(x => x.id === r).name}`); });
    Object.entries(take).forEach(([r, v]) => { if (v > ((t.res[B] || {})[r] || 0)) msgs.push(`${p.factions.find(f => f.id === B).name} nemá dost ${p.resources.find(x => x.id === r).name}`); });
    if (!Object.values(give).some(Boolean) && !Object.values(take).some(Boolean)) { toast("Zadej, co si hráči vymění"); return; }
    if (msgs.length) { toast("Nelze: " + msgs[0]); return; }
    if (!gate(p, t, "obchod")) return;
    Object.entries(give).forEach(([r, v]) => { t.res[A][r] -= v; t.res[B][r] = (t.res[B][r] || 0) + v; }); Object.entries(take).forEach(([r, v]) => { t.res[B][r] -= v; t.res[A][r] = (t.res[A][r] || 0) + v; });
    logEv(t, `obchod ${p.factions.find(f => f.id === A).name} ↔ ${p.factions.find(f => f.id === B).name}`); after(p, t, "obchod", A); save(); render(); toast("Výměna provedena");
  };
  const stockOp = (rid, buy) => {
    if (!cp || !gate(p, t, "obchod")) return; const g = p.stock.goods.find(x => x.resId === rid); const cur = p.stock.currency; const pr = t.prices[rid];
    t.res[cp.id] = t.res[cp.id] || {};
    if (buy) { if ((t.res[cp.id][cur] || 0) < pr) { toast(`${cp.name} nemá na nákup (${pr})`); return; } t.res[cp.id][cur] -= pr; t.res[cp.id][rid] = (t.res[cp.id][rid] || 0) + 1; t.prices[rid] = Math.min(+g.max || 10, pr + 1); }
    else { if (!(t.res[cp.id][rid] || 0)) { toast(`${cp.name} nemá co prodat`); return; } const sp = Math.max(+g.min || 1, pr - 1); t.res[cp.id][rid] -= 1; t.res[cp.id][cur] = (t.res[cp.id][cur] || 0) + sp; t.prices[rid] = sp; }
    logEv(t, `${cp.name} ${buy ? "kupuje" : "prodává"} ${p.resources.find(r => r.id === rid).name}`); after(p, t, "obchod", cp.id); save(); render();
  };
  on("[data-sbuy]", el => stockOp(el.dataset.sbuy, true)); on("[data-ssell]", el => stockOp(el.dataset.ssell, false));
  // tajné role a obálka
  if (q("rolesDeal")) q("rolesDeal").onclick = () => { const roles = shuffle(String(p.roles || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean)); t.roles = {}; pl.forEach((f, i) => t.roles[f.id] = roles[i % roles.length]); t.rolesShown = false; t.revealed = {}; save(); render(); toast("Role rozdány – každý se podívá sám"); };
  on("[data-rolesee]", el => { const f = p.factions.find(x => x.id === el.dataset.rolesee); openDialog(`<h2>${esc(f.name)}</h2><p class="hint">Ostatní ať se nedívají.</p><div class="result"><span>Tvoje role</span><b style="font-family:var(--f-display);font-size:1.6rem">${esc(t.roles[f.id])}</b></div><div class="row" style="justify-content:flex-end"><button class="btn primary" data-close>Zavřít</button></div>`); });
  on("[data-rolerev]", el => { t.revealed = t.revealed || {}; t.revealed[el.dataset.rolerev] = true; logEv(t, `${p.factions.find(f => f.id === el.dataset.rolerev).name} odhaluje roli: ${t.roles[el.dataset.rolerev]}`); save(); render(); });
  if (q("rolesAll")) q("rolesAll").onclick = () => { t.rolesShown = !t.rolesShown; save(); render(); };
  if (q("envMake")) q("envMake").onclick = () => { const ds = $$("[data-envd]", main).filter(i => i.checked).map(i => i.dataset.envd); if (!ds.length) { toast("Vyber aspoň jeden balíček"); return; } t.envelope = []; ds.forEach(id => { shuffle(t.piles[id]); const c = t.piles[id].pop(); if (c) t.envelope.push({ deckId: id, cardId: c }); }); t.envShown = false; save(); render(); toast("Obálka je připravená"); };
  if (q("envShow")) q("envShow").onclick = () => { t.envShown = !t.envShown; save(); render(); };
  if (q("envBack")) q("envBack").onclick = () => { t.envelope.forEach(h => { t.piles[h.deckId].push(h.cardId); shuffle(t.piles[h.deckId]); }); t.envelope = null; save(); render(); };
  if (q("envAccuse")) q("envAccuse").onclick = () => {
    const E = t.envelope; const d = openDialog(`<h2>Obvinění${cp ? " – " + esc(cp.name) : ""}</h2>${E.map((h, i) => { const dk = p.decks.find(x => x.id === h.deckId); return `<label class="f">${esc(dk.name)}<select data-acc="${i}">${dk.cards.map(c => `<option value="${c.id}">${esc(c.title)}</option>`).join("")}</select></label>`; }).join("")}
      <div class="row" style="justify-content:flex-end"><button class="btn" data-close>Zrušit</button><button class="btn primary" id="accOk">Obvinit</button></div>`);
    $("#accOk", d).onclick = () => { const ok = $$("[data-acc]", d).filter(s => s.value === E[+s.dataset.acc].cardId).length; closeDialog(); const all = ok === E.length;
      logEv(t, `${cp ? cp.name : ""} obviňuje: ${ok}/${E.length} správně`); if (all && cp) declareWinner(p, t, cp.id, "správné obvinění");
      save(); render(); openDialog(`<h2>${all ? "Správně!" : "Špatně"}</h2><p>${all ? "Obvinění sedí ve všech bodech." : `Správně je ${ok} z ${E.length}. Které to jsou, se neprozrazuje.`}</p><div class="row" style="justify-content:flex-end"><button class="btn primary" data-close>Zavřít</button></div>`); };
  };
  // rozděl a vyber
  on("[data-dmode]", el => { S.draftMode = el.dataset.dmode; render(); });
  if (q("cutGo")) q("cutGo").onclick = () => { const dId = q("cutDeck").value, n = Math.max(2, +q("cutN").value || 5); const cards = []; for (let i = 0; i < n; i++) { const c = t.piles[dId].pop(); if (c) cards.push(c); } const div = cp; const ch = pl[(t.curF + 1) % pl.length]; t.cut = { deckId: dId, cards, side: {}, divider: div.id, chooser: ch.id, stage: "divide" }; save(); render(); };
  on("[data-cut]", el => { const i = +el.dataset.cut; t.cut.side[i] = (t.cut.side[i] || "A") === "A" ? "B" : "A"; save(); render(); });
  if (q("cutDone")) q("cutDone").onclick = () => { t.cut.stage = "choose"; save(); render(); toast(`Předej iPad: ${p.factions.find(f => f.id === t.cut.chooser).name}`); };
  on("[data-cutpick]", el => { const X = t.cut; const k = el.dataset.cutpick; X.cards.forEach((c, i) => { const to = (X.side[i] || "A") === k ? X.chooser : X.divider; (t.hands[to] = t.hands[to] || []).push({ deckId: X.deckId, cardId: c }); }); logEv(t, `${p.factions.find(f => f.id === X.chooser).name} bere hromádku ${k}`); t.cut = null; save(); render(); toast("Karty jsou v rukou hráčů"); });
  if (q("cutCancel")) q("cutCancel").onclick = () => { t.cut.cards.forEach(c => t.piles[t.cut.deckId].push(c)); shuffle(t.piles[t.cut.deckId]); t.cut = null; save(); render(); };
  // většina a trasy
  if (q("majAward")) q("majAward").onclick = () => { const vp = p.resources.find(r => r.vp && !r.global); majority(p, t).forEach(r => Object.entries(r.award).forEach(([fid, v]) => { t.res[fid] = t.res[fid] || {}; t.res[fid][vp.id] = (t.res[fid][vp.id] || 0) + v; })); logEv(t, "body za většiny v oblastech připsány"); checkWin(p, t); save(); render(); toast("Body připsány"); };
  if (q("routeMode")) q("routeMode").onclick = () => { S.routeMode = !S.routeMode; S.routeSel = null; S.ctrlMode = false; render(); };
  if (q("routeClear")) q("routeClear").onclick = () => confirmDialog("Zbourat všechny trasy?", "Smaže se síť všech hráčů.", "Zbourat", () => { t.links = []; save(); render(); });
}
function routeTap(p, t, k, save) {
  const b = tableBoard(p); const cp = curPlayer(p, t); if (!b || !cp) return;
  if (!S.routeSel || S.routeSel === k) { S.routeSel = S.routeSel === k ? null : k; render(); return; }
  const a = S.routeSel; const [c, r] = a.split(",").map(Number);
  if (!neighbors(b, c, r).some(([x, y]) => x + "," + y === k)) { S.routeSel = k; render(); toast("Úsek trasy vede jen mezi sousedními poli"); return; }
  const same = l => (l.a === a && l.b === k) || (l.a === k && l.b === a);
  const mine = t.links.findIndex(l => same(l) && l.fid === cp.id);
  if (mine >= 0) { t.links.splice(mine, 1); logEv(t, `${cp.name} bourá úsek trasy`); S.routeSel = k; save(); render(); return; }
  const msgs = []; if (p.routes.exclusive && t.links.some(same)) msgs.push("úsek už patří jinému hráči");
  const cost = p.resources.find(x => x.id === p.routes.cost); const price = +p.routes.price || 1;
  if (cost && ((t.res[cp.id] || {})[cost.id] || 0) < price) msgs.push(`na úsek chybí ${cost.name}`);
  if (!gate(p, t, "trasa", msgs)) return;
  if (cost) { t.res[cp.id] = t.res[cp.id] || {}; t.res[cp.id][cost.id] = Math.max(0, (t.res[cp.id][cost.id] || 0) - price); }
  t.links.push({ a, b: k, fid: cp.id }); logEv(t, `${cp.name} staví úsek trasy`); S.routeSel = k; after(p, t, "trasa", cp.id); save(); render();
}
onInit(() => setInterval(() => {
  const p = P(); const t = p && p.table; if (!t || !t.timer) return;
  const left = t.timer.end - Date.now(); const el = document.getElementById("ttimer"); if (el) el.textContent = fmtClock(Math.max(0, left));
  if (left <= 0 && !S.timerFired) { S.timerFired = true; const cp = curPlayer(p, t); toast(`Čas vypršel${cp ? " – " + cp.name : ""}`); logEv(t, `čas tahu vypršel${cp ? " (" + cp.name + ")" : ""}`);
    if (p.ruleset.timerAuto && S.tab === "stul" && !$("#layer").innerHTML) endTurn(p, t, () => { touch(p); render(); }); }
}, 500));
