// ---------- Další mechaniky na stole ----------
function botHTML(p, t) {
  const cp = curPlayer(p, t); if (!cp || !cp.bot) return ""; const d = p.decks.find(x => x.id === cp.bot);
  return `<section><div class="selbar" style="border-color:${cp.color}"><span class="eyebrow">Hraje automat · ${esc(cp.name)}</span>
    ${S.botCard && S.botCard.fid === cp.id ? (() => { const { d: dk, c } = cardOf(p, S.botCard.h); return c ? `<div class="hand mini"><div class="hc">${cardHTML(c, dk)}</div></div>` : ""; })() : ""}
    <button class="btn primary" id="botTurn" ${d ? "" : "disabled"}>Tah automatu (${d ? esc(d.name) : "bez balíčku"})</button>
    <span class="hint">Otočí kartu z balíčku automatu, provede její efekt a předá tah dalšímu.</span></div></section>`;
}
function productionHTML(p, t) {
  const b = tableBoard(p); if (!b || !Object.keys(b.numbers || {}).length) return "";
  return `<section><div class="eyebrow">Produkce podle čísel polí</div>
    <button class="btn primary" id="prodRoll">Hodit 2k6 a rozdělit suroviny</button>
    ${S.prodMsg ? `<div class="selbar">${esc(S.prodMsg)}</div>` : ""}
    <span class="hint">Surovinu dostane ${p.production.mode === "units" ? "strana s jednotkou na poli nebo vedle něj" : p.production.mode === "control" ? "vlastník pole" : "vlastník pole a strany s jednotkou na poli nebo vedle"}. Co pole produkuje, nastavíš u terénu v záložce Mapa.</span></section>`;
}
function rolesHTML(p, t) {
  const pl = players(p, t); const res = p.resources.find(r => r.id === p.roleRes);
  return `<section><div class="eyebrow">Výběr rolí · vybírá</div>${fchipsHTML(p, t)}</section>
    <section><div class="list">${p.actions.map(a => { const who = (t.rolePick || {})[a.id]; const f = who && p.factions.find(x => x.id === who); const bonus = (t.roleBonus || {})[a.id] || 0;
      return `<div class="action"><div class="row spread"><b>${esc(a.name)}</b>${bonus ? `<span class="pl-chip win">+${bonus} ${res ? esc(res.name) : ""}</span>` : ""}</div>${a.text ? `<span class="hint">${esc(a.text)}</span>` : ""}
        ${f ? `<span class="row"><span class="dot" style="background:${f.color};border-radius:50%"></span> ${esc(f.name)}</span>` : `<button class="btn small primary" data-role="${a.id}">Vzít roli</button>`}</div>`; }).join("")}</div>
      <button class="btn small" id="roleRound">Nové kolo – role zpět, nevybraným +1</button>
      <p class="hint">Každou roli si v kole vezme jen jeden hráč. Role, kterou nikdo nevzal, nasbírá bonus${res ? ` (${esc(res.name)})` : ""} pro toho, kdo si ji vezme příště.</p></section>`;
}
function bluffHTML(p, t) {
  const B = t.bluff; const cp = curPlayer(p, t);
  if (!B) return `<section><div class="eyebrow">Blafování</div><p class="hint">Hráč na tahu zahraje kartu lícem dolů, řekne o ní tvrzení a pošle ji soupeři. Ten tipuje, jestli mluví pravdu.${p.bluffPenalty ? ` Kdo se splete, dostane: ${esc(p.bluffPenalty)}.` : ""}</p>
    <button class="btn primary" id="bluffGo" ${cp && (t.hands[cp.id] || []).length ? "" : "disabled"}>Zahrát kartu skrytě – ${esc(cp ? cp.name : "")}</button></section>`;
  const from = p.factions.find(f => f.id === B.from), to = p.factions.find(f => f.id === B.target); const { d, c } = cardOf(p, B.h);
  return `<section><div class="eyebrow">Blafování</div><div class="result"><span>${esc(from.name)} tvrdí</span><b style="font-family:var(--f-display);font-size:1.3rem">„${esc(B.claim)}“</b><span>karta jde hráči ${esc(to.name)}</span></div>
    ${B.result ? `<div class="hand mini"><div class="hc">${cardHTML(c, d)}</div></div><div class="selbar"><b>${esc(B.result)}</b></div><button class="btn small" id="bluffEnd">Hotovo</button>`
      : `<div class="row"><button class="btn primary" data-bluff="1">${esc(to.name)}: věřím</button><button class="btn primary" data-bluff="0">Nevěřím</button></div>`}</section>`;
}
function wireR4(main, p, t, save) {
  const q = id => document.getElementById(id); const on = (sel, fn) => $$(sel, main).forEach(el => el.addEventListener("click", () => fn(el)));
  const cp = curPlayer(p, t); const pl = players(p, t);
  on("[data-alltools]", () => { S.allTools = !S.allTools; render(); });
  if (q("botTurn")) q("botTurn").onclick = () => {
    const d = p.decks.find(x => x.id === cp.bot); if (!t.piles[d.id].length && t.discard[d.id].length) { t.piles[d.id] = shuffle(t.discard[d.id]); t.discard[d.id] = []; }
    const cId = t.piles[d.id].pop(); if (!cId) { toast("Balíček automatu je prázdný"); return; }
    const h = { deckId: d.id, cardId: cId }; const c = cardOf(p, h).c; S.botCard = { fid: cp.id, h };
    logEv(t, `automat ${cp.name}: ${c.title}`); if (c.effect) runEffects(p, t, cp.id, c.effect, c.title); t.discard[d.id].push(cId);
    endTurn(p, t, () => { save(); render(); });
  };
  if (q("prodRoll")) q("prodRoll").onclick = () => {
    const a = rnd(6), b2 = rnd(6), sum = a + b2; const g = productionRoll(p, t, sum);
    const per = {}; g.forEach(x => { const n = p.factions.find(f => f.id === x.fid).name; per[n] = per[n] || {}; per[n][x.r] = (per[n][x.r] || 0) + 1; });
    S.prodMsg = `Padlo ${a} + ${b2} = ${sum}. ` + (g.length ? Object.entries(per).map(([n, rs]) => `${n}: ${Object.entries(rs).map(([r, v]) => `+${v} ${r}`).join(", ")}`).join(" · ") : "Nikdo nic nedostal.");
    logEv(t, S.prodMsg); fireTriggers(p, t, "hod", (cp || {}).id, sum); checkWin(p, t); save(); render();
  };
  on("[data-role]", el => {
    if (!cp || !gate(p, t, "akce")) return; t.rolePick = t.rolePick || {}; t.roleBonus = t.roleBonus || {};
    if (Object.values(t.rolePick).includes(cp.id) && p.ruleset.strict) { toast("Nelze: hráč už si v tomto kole roli vzal"); return; }
    const a = p.actions.find(x => x.id === el.dataset.role); t.rolePick[a.id] = cp.id;
    const bonus = t.roleBonus[a.id] || 0; const r = p.resources.find(x => x.id === p.roleRes);
    if (bonus && r) { t.res[cp.id] = t.res[cp.id] || {}; t.res[cp.id][r.id] = (t.res[cp.id][r.id] || 0) + bonus; } t.roleBonus[a.id] = 0;
    logEv(t, `${cp.name} bere roli ${a.name}${bonus && r ? ` (+${bonus} ${r.name})` : ""}`); if (a.effect) runEffects(p, t, cp.id, a.effect, a.name); after(p, t, "akce", cp.id, a.name);
    t.curF = (t.curF + 1) % pl.length; t.acts = 0; save(); render();
  });
  if (q("roleRound")) q("roleRound").onclick = () => { t.roleBonus = t.roleBonus || {}; p.actions.forEach(a => { if (!(t.rolePick || {})[a.id]) t.roleBonus[a.id] = (t.roleBonus[a.id] || 0) + 1; }); t.rolePick = {}; logEv(t, "role se vrací, nevybrané získávají bonus"); save(); render(); };
  if (q("bluffGo")) q("bluffGo").onclick = () => pickFromHand(p, t, cp, { title: `${cp.name}: vyber kartu, kterou pošleš`, n: 1, hint: "Karta půjde lícem dolů.", done: picks => {
    const claims = [...new Set(p.decks.flatMap(d => d.cards.flatMap(c => [c.title, c.type, c.suit])).filter(Boolean))];
    const d = openDialog(`<h2>Tvrzení</h2><label class="f">Co o kartě tvrdíš<select id="blClaim">${claims.map(c => `<option>${esc(c)}</option>`).join("")}</select></label>
      <label class="f">Komu ji posíláš<select id="blTo">${pl.filter(f => f.id !== cp.id).map(f => `<option value="${f.id}">${esc(f.name)}</option>`).join("")}</select></label>
      <div class="row" style="justify-content:flex-end"><button class="btn primary" id="blOk">Poslat</button></div>`);
    $("#blOk", d).onclick = () => { t.bluff = { from: cp.id, h: picks[0], claim: $("#blClaim", d).value, target: $("#blTo", d).value }; closeDialog(); logEv(t, `${cp.name} posílá kartu a tvrdí „${t.bluff.claim}“`); save(); render(); };
  } });
  on("[data-bluff]", el => {
    const B = t.bluff; const c = cardOf(p, B.h).c; const truth = [c.title, c.type, c.suit].includes(B.claim); const believe = el.dataset.bluff === "1";
    const loser = (believe && !truth) || (!believe && truth) ? B.target : B.from; const lf = p.factions.find(f => f.id === loser);
    B.result = `${truth ? "Byla to pravda" : "Byl to blaf"} – karta je „${c.title}“. Prohrává ${lf.name}.`;
    if (p.bluffPenalty) runEffects(p, t, loser, p.bluffPenalty, "Blafování");
    logEv(t, B.result); checkWin(p, t); save(); render();
  });
  if (q("bluffEnd")) q("bluffEnd").onclick = () => { discardCard(t, t.bluff.h, t.bluff.from); t.bluff = null; save(); render(); };
  if (q("mulligan")) q("mulligan").onclick = () => {
    const f = S.handF; const hand = t.hands[f] || []; const n = hand.length; if (!n) return;
    hand.forEach(h => { if (h.own) (t.pdeck[f] = t.pdeck[f] || []).push(h); else t.piles[h.deckId].push(h.cardId); }); t.hands[f] = [];
    if (t.pdeck[f]) shuffle(t.pdeck[f]); Object.keys(t.piles).forEach(k => shuffle(t.piles[k]));
    const own = hand.some(h => h.own); if (own) drawOwn(t, f, n); else { const dId = hand[0].deckId; for (let i = 0; i < n; i++) { const c = t.piles[dId].pop(); if (c) t.hands[f].push({ deckId: dId, cardId: c }); } }
    logEv(t, `${p.factions.find(x => x.id === f).name} dává mulligan (${n} ${plural(n, "karta", "karty", "karet")})`); save(); render(); toast("Nová ruka");
  };
  if (q("ordTrack")) q("ordTrack").onclick = () => { t.order = [...p.factions].sort((a, b) => (t.trackPos[a.id] || 0) - (t.trackPos[b.id] || 0)).map(f => f.id); t.curF = 0; save(); render(); toast("Táhne hráč nejvíc vzadu"); };
}

// Volby a cíle z efektů („vyber:“, „soupeř“) čekají, až je hráč rozhodne.
function processPending(p) {
  const t = p && p.table; if (!t || !t.pending || !t.pending.length || $("#layer").innerHTML) return;
  const it = t.pending[0]; const f = p.factions.find(x => x.id === it.fid); const opp = players(p, t).filter(x => x.id !== it.fid);
  const d = openDialog(`<h2>${esc(f ? f.name : "Hráč")}: ${it.kind === "choice" ? "vyber možnost" : "vyber soupeře"}</h2>
    ${it.src ? `<p class="hint">${esc(it.src)}${it.kind === "target" ? ` – efekt pro soupeře: ${esc(it.effect)}` : ""}</p>` : ""}
    <div class="list">${it.kind === "choice" ? it.opts.map((o, i) => `<button class="btn" data-pend="${i}" style="justify-content:flex-start">${esc(o)}</button>`).join("")
      : opp.map(o => `<button class="btn" data-pend="${o.id}" style="justify-content:flex-start"><span class="dot" style="background:${o.color};border-radius:50%"></span>${esc(o.name)}</button>`).join("")}</div>
    <div class="row" style="justify-content:flex-end"><button class="btn small" id="pendSkip">Přeskočit</button></div>`);
  const done = () => { checkWin(p, t); touch(p); closeDialog(); render(); };
  $$("[data-pend]", d).forEach(b => b.onclick = () => { t.pending.shift();
    if (it.kind === "choice") runEffects(p, t, it.fid, it.opts[+b.dataset.pend].split(",").join(";"), it.src);
    else runEffects(p, t, b.dataset.pend, it.effect, it.src);
    done(); });
  $("#pendSkip", d).onclick = () => { t.pending.shift(); logEv(t, `volba „${it.src}“ přeskočena`); done(); };
}
