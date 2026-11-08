// Rozšíření rozhraní: plánovač měsíce, osobně vedená bitva, úřady, obchodní cesty, vysvětlivky.

// ---------- Plán měsíce ----------
function suggestCmd(c, p) {
  if (p.loy < 35) return "lid";
  if (p.agri < agriCap(S, p) * 0.9) return "zemedelstvi";
  if (p.com < comCap(S, p)) return c.burgher ? "obchodovat" : "obchod";
  if (men(p.troops) > 300 && p.train < 50) return "vycvik";
  if (p.dur < durMax(S, p) * 0.8) return "hradby";
  return provRoutes(p).length ? "obchodovat" : "studium";
}
function tPlan() {
  const cmdOpts = Object.entries(CMDS).map(([k, K]) => [k, K.n + (K.cost ? ` (${K.cost} zl)` : "")]);
  const ps = clanProvs(S, me()).filter(p => !p.siege).sort((a, b) => (b.id === P(S).capital) - (a.id === P(S).capital) || b.v - a.v);
  let idle = 0; const rows = [];
  for (const p of ps) for (const c of officersIn(S, p.id).filter(x => !x.army)) {
    const done = c.acted === S.turn; if (done && !SEL.planDone) continue; if (!done) idle++;
    const k = SEL.cmd[c.id] || suggestCmd(c, p); SEL.cmd[c.id] = k;
    rows.push(tr([`<b>${esc(c.n)}</b>${c.burgher ? ' <span class="tag">měšťan</span>' : ""}<div class="small muted">${RANKS[c.rank].n}, věrnost ${Math.round(c.loy)}</div>`, `${btn(esc(p.n), "provOnly", [p.id])}${p.deleg ? '<div class="small muted">svěřený kraj</div>' : ""}`, statsTd(c),
      done ? '<td colspan="2" class="muted">tento měsíc už jedná</td>' : `<td>${sel("cs_" + c.id, cmdOpts, k, `data-a="cmdSel" data-x='["${c.id}"]'`)}<div class="small muted">${CMDS[k].d}</div></td><td>${cmdParams(c, k, p)} ${btn("Provést", "cmd", [c.id], null, "go")} ${btn("Nechat na rádci", "advise", [c.id])}</td>`], done ? "muted" : ""));
  }
  const C = P(S), b = clanBudget(S, me());
  return `<div class="tiles">${tile("Volní vazalové", idle, "čekají na rozkaz")}${tile("Zlato", fmt(C.gold), `<span class="${b.net < 0 ? "bad" : "good"}">${sg(b.net)} za měsíc</span>`)}${tile("Obilí", fmt(C.grain), "do žní " + ((8 - S.month + 12) % 12) + " měs.")}${tile("Kraje", clanProvs(S, me()).length, `${clanProvs(S, me()).filter(p => p.deleg).length} svěřených purkrabím`)}</div>
  ${card("Plán měsíce – všichni vazalové na jednom místě", `<div class="row">${btn("Rádce rozhodne za všechny volné", "adviseAll", [], idle ? null : "Nikdo nečeká", "go")} ${btn(SEL.planDone ? "Skrýt ty, kdo už jednají" : "Ukázat i ty, kdo už jednají", "planDone")} <span class="small muted">Předvybraný rozkaz je doporučení podle stavu kraje. „Nechat na rádci“ provede, co by udělal purkrabí.</span></div>` +
    tbl(["Vazal", "Kraj", "#Vůdc.", "#Udat.", "#Rozum", "#Správa", "Rozkaz", ""], rows), "wide")}`;
}
ACT.advise = id => { const c = chr(S, id); if (!c || c.acted === S.turn) return "Vazal už jedná."; aiDomestic(S, me(), c, true); if (c.acted !== S.turn) return "Rádce nic rozumného nenašel (málo zlata?)."; };
ACT.adviseAll = () => { let n = 0; for (const c of officers(S, me())) if (c.acted !== S.turn && !c.army && c.id !== P(S).leader && S.provs[c.loc] && S.provs[c.loc].owner === me()) { aiDomestic(S, me(), c, true); if (c.acted === S.turn) n++; } toast(`Rádce zadal ${n} rozkazů.`); };
ACT.planDone = () => { SEL.planDone = !SEL.planDone; };

// ---------- osobně vedená bitva ----------
function battleModal(ev) {
  const x = S.pend && S.pend[ev.bid]; if (!x) return null;
  const b = x.b, my = b.ps === "A" ? b.A : b.B, foe = b.ps === "A" ? b.B : b.A, myStart = b.ps === "A" ? b.start.a : b.start.b, foeStart = b.ps === "A" ? b.start.b : b.start.a;
  const side = (sd, start, title) => `<div class="bside"><div class="crest">${shield(sd.cl, 40)}<div><b>${esc(S.clans[sd.cl].house)}</b><div class="small muted">${title}${sd.cmds.length ? " · " + esc(sd.cmds.map(id => chr(S, id).n).join(", ")) : ""}</div></div></div>
    ${meter("Muži", men(sd.t), start, S.clans[sd.cl].col)}${meter("Morálka", Math.max(0, Math.round(sd.morale)), 100, sd.morale < 40 ? "var(--bad)" : "var(--accent2)")}${troopBar(sd.t)}<div class="small muted">Sestava: ${TACTICS[sd.tac || "vyvazena"].n}${sd.castle ? `, hrad ${sd.castle}, hradby ${Math.round(sd.dur)}` : ""}</div></div>`;
  const last = b.rounds[b.rounds.length - 1];
  const lastTxt = last ? (() => { const mi = b.ps === "A" ? 0 : 1, fo = 1 - mi; return `${b.rounds.length}. kolo: ty – ${ORDERS[last[4 + mi]].n}, nepřítel – ${ORDERS[last[4 + fo]].n}. Tvé ztráty ${fmt(last[mi])}, nepřítele ${fmt(last[fo])}.`; })() : "Vojska stojí proti sobě. Vydej první rozkaz.";
  const v = eventView(S, ev);
  return `<div class="box wide"><div class="muted small">${dateStr(S)} · ${TERRAIN[S.provs[b.place].ter].n} · ${b.r + 1}. kolo z nejvýš 6</div><h2>${esc(v.t)}</h2>
    <div class="bgrid">${side(my, myStart, "tvé vojsko")}${side(foe, foeStart, "nepřítel")}</div>
    <p class="alert info">${lastTxt}</p>
    <div class="orders">${v.ch.map(c => `<button class="b ch" data-a="event" data-x="[0,${c.i}]"><b>${esc(c.t)}</b><br><span class="small muted">${esc(c.d || "")}</span></button>`).join("")}</div>
    <p class="small muted">Úder jízdy rozbije střelce, ale narazí na držící šik. Salva střelců zdrtí stojící nepřítele, jízda ji ale převálcuje. Záloha jednou za bitvu od 3. kola. Ústupem bitvu prohraješ, ale zachráníš muže.</p></div>`;
}

// ---------- úřady ----------
function officesCard() {
  const C = P(S), offs = officers(S, me());
  return card("Dvůr a úřady", tbl(["Úřad", "Účinek", "Držitel"], Object.entries(OFFICES).map(([k, O]) => { const h = officeHolder(S, me(), k);
    return tr([`<b>${O.n}</b>`, `<span class="small">${O.d}</span>`, sel("of_" + k, [["", "— neobsazeno —"]].concat(offs.slice().sort((a, b) => st(b, O.stat) - st(a, O.stat)).map(c => [c.id, `${c.n} (${STATS[O.stat].toLowerCase()} ${st(c, O.stat)})`])), h ? h.id : "", `data-a="office" data-x='["${k}"]'`)]); })) + '<p class="small muted">Úřad zvyšuje věrnost držitele. Síla účinku závisí na jeho schopnosti.</p>');
}
ACT.office = (k, id) => setOffice(S, me(), k, id);

// ---------- obchodní cesty ----------
function routesCard() {
  const rows = ROUTES.map(R => { const st_ = routeState(S, R), mine = R.provs.filter(id => S.provs[id].owner === me());
    return tr([`<span class="rdot" style="background:${R.col}"></span><b>${R.n}</b><div class="small muted">${R.d}</div>`, `<td>${meter("", Math.round(st_ * 100), 100, st_ < 0.6 ? "var(--bad)" : R.col)}</td>`, mine.map(id => esc(S.provs[id].n) + (S.provs[id].hanza ? " (Hanza)" : "")).join(", ") || "—", r1(sum(mine.map(id => routeIncomeProv(S, S.provs[id]))))]); });
  const hz = ROUTES.find(R => R.hanza).provs.map(id => S.provs[id]).filter(p => p.owner === me() && !p.hanza);
  return card("Obchodní cesty", tbl(["Cesta", "Průchodnost", "Tvé kraje na cestě", "#Zisk/měs."], rows) + `<p class="small muted">Cesta vynáší, když je průchodná – válka mezi sousedními pány nebo obléhání ji přeruší. Lokovaná města zvyšují zisk, vazal s rozkazem „Vést obchodní výpravu“ vydělá víc.</p>` +
    (hz.length ? `<div class="row">Hanza: ${hz.map(p => btn(`${esc(p.n)} do Hanzy (150 zl)`, "hanza", [p.id], p.b.mesto || p.city ? null : "Nejdřív lokuj město")).join(" ")}</div>` : ""), "wide");
}
ACT.hanza = pid => joinHanza(S, me(), pid);
