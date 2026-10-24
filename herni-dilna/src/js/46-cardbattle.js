// ---------- Karetní souboje (Magic: The Gathering, Ascension) ----------
// Zdroje na jeden tah (mana, runy, síla), příšery v centrální řadě, společná zásoba bodů, vyhoštění karet,
// souboj bytostí (útok, blokování, síla a odolnost, klíčová slova), jedna země za tah, nemoc z vyvolání, životy.
function normalizeCB(p) {
  p.cb = Object.assign({ fightRes: "", lifeRes: "", landType: "Země", landPerTurn: false, sick: true }, p.cb || {});
  return p;
}
const KW = { letec: "létá – blokovat ji smí jen bytost s letem nebo dosahem", dosah: "smí blokovat letce", "bdělost": "po útoku se nevyčerpá", "první úder": "zraňuje dřív než soupeř", "pošlapání": "přebytečná síla jde do hráče", "spěch": "smí útočit hned" };
const hasKw = (c, k) => String((c && c.kw) || "").toLowerCase().split(/[,;]/).map(s => s.trim()).includes(k);
const isCreature = c => !!c && c.pow !== "" && c.pow != null && c.tough !== "" && c.tough != null;
const isLand = (p, c) => !!c && !!p.cb.landType && String(c.type || "").trim().toLowerCase() === p.cb.landType.trim().toLowerCase();
// Konec tahu: zdroje „na tah“ propadnou, zahraná země se vynuluje; nový hráč na tahu se zbaví nemoci z vyvolání.
function cbEndTurn(p, t, fid) {
  if (!fid) return; p.resources.filter(r => r.perTurn && !r.global).forEach(r => { t.res[fid] = t.res[fid] || {}; t.res[fid][r.id] = 0; });
  t.landPlayed = {};
}
function cbStartTurn(p, t, fid) { (t.tableau[fid] || []).forEach(h => { h.sick = false; }); }
function cbPlayCheck(p, t, fid, c, cat) { return cat === "vylozit" && p.cb.landPerTurn && isLand(p, c) && (t.landPlayed || {})[fid] ? [`v tahu smíš zahrát jen jednu kartu typu ${p.cb.landType}`] : []; }
function cbPlayDone(p, t, fid, h, c, cat) {
  if (cat !== "vylozit") return; if (isLand(p, c)) (t.landPlayed = t.landPlayed || {})[fid] = true;
  if (isCreature(c) && p.cb.sick && !hasKw(c, "spěch")) h.sick = true;
}
// Společná zásoba: kdo získá zdroj s nastavenou zásobou, ubere ho ze společného zdroje. Prázdná zásoba ukončí hru po dohrání kola.
function cbPool(p, t, r, gained) {
  if (!r.pool || gained <= 0) return; const pr = p.resources.find(x => x.id === r.pool); if (!pr) return; t.res._g = t.res._g || {};
  t.res._g[pr.id] = Math.max(0, (t.res._g[pr.id] || 0) - gained);
  if (t.res._g[pr.id] <= 0 && p.ruleset.win.poolEnd && !t.lastRound && !t.winner) { t.lastRound = true; logEv(t, `${pr.name} je prázdná – dohrává se kolo`); toast(`${pr.name} je prázdná – poslední kolo`); }
}
function cbCheckLife(p, t) {
  const r = p.resources.find(x => x.id === p.cb.lifeRes); if (!r || t.winner) return; const pl = players(p, t); if (pl.length < 2) return;
  const alive = pl.filter(f => ((t.res[f.id] || {})[r.id] || 0) > 0); if (alive.length === 1) declareWinner(p, t, alive[0].id, `soupeři došly ${r.name.toLowerCase()}`);
}
// Poražení příšery z trhu (centrální řada): zaplatí se síla, příšera jde do odhozu a provede se její efekt jako odměna.
function fightMarket(p, t, fid, dId, i) {
  const d = p.decks.find(x => x.id === dId); const cId = t.market[dId][i]; const c = d && d.cards.find(x => x.id === cId); if (!c) return "";
  const r = p.resources.find(x => x.id === p.cb.fightRes); const need = +c.fight || 0; const have = r ? ((t.res[fid] || {})[r.id] || 0) : Infinity;
  if (r && have < need) return `${fname(p, fid)} má jen ${have} × ${r.name}, příšera potřebuje ${need}`;
  if (r) t.res[fid][r.id] = have - need; t.market[dId][i] = null; (t.discard[dId] = t.discard[dId] || []).push(cId); refillMarket(p, t, d);
  logEv(t, `${fname(p, fid)} poráží ${c.title}`); if (c.effect) runEffects(p, t, fid, c.effect, c.title); fireTriggers(p, t, "porazeni", fid, c.title); checkWin(p, t); return "ok";
}
function banishFromHand(p, t, fid, idx) { const hand = t.hands[fid] || []; const h = hand.splice(idx, 1)[0]; if (!h) return; (t.banished = t.banished || []).push(h); logEv(t, `${fname(p, fid)} vyhošťuje ${cardOf(p, h).c.title}`); }
// ----- Souboj bytostí -----
function creaturesOf(p, t, fid) { return (t.tableau[fid] || []).map((h, i) => ({ h, i, c: cardOf(p, h).c })).filter(x => isCreature(x.c)); }
function canBlock(att, blk) { return !hasKw(att, "letec") || hasKw(blk, "letec") || hasKw(blk, "dosah"); }
// attackers: indexy ve vyložených kartách útočníka; blocks: { indexÚtočníka: indexBlokaře }
function resolveFight(p, t, aF, dF, attackers, blocks) {
  const lifeR = p.resources.find(x => x.id === p.cb.lifeRes); const out = []; const dead = { [aF]: new Set(), [dF]: new Set() };
  const A = attackers.map(i => ({ i, h: t.tableau[aF][i], c: cardOf(p, t.tableau[aF][i]).c, dmg: 0 })).filter(x => x.c);
  const B = {}; Object.entries(blocks || {}).forEach(([ai, bi]) => { if (bi === "" || bi == null) return; const h = t.tableau[dF][+bi]; if (h) B[ai] = { i: +bi, h, c: cardOf(p, h).c, dmg: 0 }; });
  let toPlayer = 0;
  const strike = first => A.forEach(a => { const b = B[a.i];
    const aHits = hasKw(a.c, "první úder") === first && !dead[aF].has(a.i), bHits = b && hasKw(b.c, "první úder") === first && !dead[dF].has(b.i);
    if (aHits) { if (!b) toPlayer += +a.c.pow; else { const room = Math.max(0, +b.c.tough - b.dmg); b.dmg += +a.c.pow; if (hasKw(a.c, "pošlapání")) toPlayer += Math.max(0, +a.c.pow - room); } }
    if (bHits) a.dmg += +b.c.pow;
    if (b && b.dmg >= +b.c.tough) dead[dF].add(b.i); if (a.dmg >= +a.c.tough) dead[aF].add(a.i); });
  strike(true); strike(false);
  A.forEach(a => { if (!hasKw(a.c, "bdělost")) a.h.ex = true; out.push(B[a.i] ? `${a.c.title} × ${B[a.i].c.title}` : `${a.c.title} neblokován (${a.c.pow})`); });
  if (toPlayer && lifeR) { t.res[dF] = t.res[dF] || {}; t.res[dF][lifeR.id] = Math.max(0, (t.res[dF][lifeR.id] || 0) - toPlayer); out.push(`${fname(p, dF)} −${toPlayer} ${lifeR.name}`); }
  [[aF, dead[aF]], [dF, dead[dF]]].forEach(([fid, set]) => { const idx = [...set].sort((a, b) => b - a); idx.forEach(i => { const h = t.tableau[fid].splice(i, 1)[0]; out.push(`${cardOf(p, h).c.title} umírá`); discardCard(t, h, fid); }); });
  logEv(t, "souboj: " + out.join(", ")); cbCheckLife(p, t); return { toPlayer, out };
}
function sideFight(p, t) {
  const cp = curPlayer(p, t); if (!cp) return `<p class="hint">Nejdřív vytvoř strany.</p>`;
  const opps = players(p, t).filter(f => f.id !== cp.id); if (!S.fDef || !opps.find(f => f.id === S.fDef)) S.fDef = (opps[0] || {}).id; const dF = S.fDef; S.fAtt = S.fAtt || {}; S.fBlk = S.fBlk || {};
  const lifeR = p.resources.find(x => x.id === p.cb.lifeRes);
  const mine = creaturesOf(p, t, cp.id), theirs = creaturesOf(p, t, dF).filter(x => !x.h.ex);
  const chosen = mine.filter(x => S.fAtt[x.i]);
  const kwt = c => c.kw ? ` <span class="hint">${esc(c.kw)}</span>` : "";
  return `<section><div class="eyebrow">Souboj bytostí · útočí ${esc(cp.name)}</div>
      ${opps.length > 1 ? `<label class="f">Na koho<select id="fDef">${opps.map(f => `<option value="${f.id}" ${f.id === dF ? "selected" : ""}>${esc(f.name)}</option>`).join("")}</select></label>` : ""}
      ${lifeR ? `<div class="row">${players(p, t).map(f => `<span class="pl-chip"><span class="dot" style="background:${f.color}"></span> ${esc(f.name)}: ${(t.res[f.id] || {})[lifeR.id] ?? 0} ${esc(lifeR.name)}</span>`).join("")}</div>` : ""}</section>
    <section><div class="eyebrow">1. Útočníci</div>${mine.length ? mine.map(x => { const ok = !x.h.ex && !x.h.sick; return `<label class="chk"><input type="checkbox" data-fatt="${x.i}" ${S.fAtt[x.i] && ok ? "checked" : ""} ${ok ? "" : "disabled"}> <b>${esc(x.c.title)}</b> ${x.c.pow}/${x.c.tough}${kwt(x.c)}${x.h.ex ? " · vyčerpaná" : x.h.sick ? " · nemoc z vyvolání" : ""}</label>`; }).join("") : `<span class="hint">Nemáš vyložené bytosti (karty se silou a odolností).</span>`}</section>
    ${chosen.length ? `<section><div class="eyebrow">2. Blokování – rozhoduje ${esc(fname(p, dF))}</div>${chosen.map(a => `<label class="f">${esc(a.c.title)} ${a.c.pow}/${a.c.tough}${hasKw(a.c, "letec") ? " (letec)" : ""}<select data-fblk="${a.i}"><option value="">neblokovat</option>${theirs.filter(b => canBlock(a.c, b.c) && !Object.entries(S.fBlk).some(([ai, bi]) => +ai !== a.i && String(bi) === String(b.i))).map(b => `<option value="${b.i}" ${String(S.fBlk[a.i]) === String(b.i) ? "selected" : ""}>${esc(b.c.title)} ${b.c.pow}/${b.c.tough}</option>`).join("")}</select></label>`).join("")}
      <button class="btn primary" id="fGo">3. Vyhodnotit souboj</button></section>` : ""}
    <p class="hint">Bytost = karta se silou a odolností. Klíčová slova: ${Object.entries(KW).map(([k, v]) => `<b>${k}</b> (${v})`).join(", ")}.</p>`;
}
function wireCB(main, p, t, save) {
  const q = id => document.getElementById(id); const on = (sel, fn) => $$(sel, main).forEach(el => el.addEventListener("click", () => fn(el))); const cp = curPlayer(p, t);
  on("[data-mfight]", el => { const [dId, i] = el.dataset.mfight.split("|"); if (!cp) return; const r = fightMarket(p, t, cp.id, dId, +i); if (r !== "ok") { toast(r); return; } save(); render(); });
  on("[data-hban]", el => { banishFromHand(p, t, S.handF, +el.dataset.hban); save(); render(); });
  if (q("fDef")) q("fDef").onchange = e => { S.fDef = e.target.value; S.fBlk = {}; render(); };
  $$("[data-fatt]", main).forEach(i => i.onchange = () => { S.fAtt[i.dataset.fatt] = i.checked; if (!i.checked) delete S.fBlk[i.dataset.fatt]; render(); });
  $$("[data-fblk]", main).forEach(i => i.onchange = () => { S.fBlk[i.dataset.fblk] = i.value; render(); });
  if (q("fGo")) q("fGo").onclick = () => { if (!gate(p, t, "boj")) return; const att = Object.keys(S.fAtt).filter(k => S.fAtt[k]).map(Number); const r = resolveFight(p, t, cp.id, S.fDef, att, S.fBlk); S.fAtt = {}; S.fBlk = {}; save(); render(); toast(r.out.join(" · ")); };
}
function cbMechHTML(p) {
  const opt = (sel, none) => `<option value="">${none}</option>` + p.resources.filter(r => !r.global).map(r => `<option value="${r.id}" ${r.id === sel ? "selected" : ""}>${esc(r.name)}</option>`).join("");
  return `<div class="panel"><h2>Karetní souboje (Magic, Ascension)</h2>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">
      <label class="f">Životy hráče<select id="cbLife">${opt(p.cb.lifeRes, "nepoužívat")}</select></label>
      <label class="f">Síla na porážení příšer<select id="cbFight">${opt(p.cb.fightRes, "nepoužívat")}</select></label>
      <label class="f">Typ karty „země“<input type="text" id="cbLand" value="${esc(p.cb.landType)}"></label></div>
    <label class="chk"><input type="checkbox" id="cbLandOne" ${p.cb.landPerTurn ? "checked" : ""}> Za tah smí hráč vyložit jen jednu zemi</label>
    <label class="chk"><input type="checkbox" id="cbSick" ${p.cb.sick ? "checked" : ""}> Nově vyložená bytost smí útočit až v dalším tahu (nemoc z vyvolání)</label>
    <label class="chk"><input type="checkbox" id="cbPoolEnd" ${p.ruleset.win.poolEnd ? "checked" : ""}> Hra skončí po dohrání kola, když se vyprázdní společná zásoba bodů (Ascension)</label>
    <p class="hint">U zdroje v sekci Zdroje nastavíš „Na konci tahu propadá“ (mana, runy, síla) a „Bere se ze zásoby“. Kartě nastavíš sílu, odolnost a klíčová slova, nebo „Porazit za“ pro příšery v centrální řadě. Životy na nule = hráč prohrál.</p></div>`;
}
function wireCBMech(main, p) {
  const ch = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener("change", () => { fn(el); touch(p); }); };
  ch("cbLife", e => { p.cb.lifeRes = e.value; }); ch("cbFight", e => { p.cb.fightRes = e.value; }); ch("cbLand", e => { p.cb.landType = e.value; });
  ch("cbLandOne", e => { p.cb.landPerTurn = e.checked; }); ch("cbSick", e => { p.cb.sick = e.checked; }); ch("cbPoolEnd", e => { p.ruleset.win.poolEnd = e.checked; });
}
