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
ACT.advise = id => { const c = chr(S, id); if (!c || c.acted === S.turn) return "Vazal už jedná."; aiDomestic(S, me(), c, true); if (c.acted !== S.turn) return "Rádce nic rozumného nenašel (málo zlata?)."; };
ACT.adviseAll = () => { let n = 0; for (const c of officers(S, me())) if (c.acted !== S.turn && !c.army && c.id !== P(S).leader && S.provs[c.loc] && S.provs[c.loc].owner === me()) { aiDomestic(S, me(), c, true); if (c.acted === S.turn) n++; } toast(`Rádce zadal ${n} rozkazů.`); };
ACT.planDone = () => { SEL.planDone = !SEL.planDone; };

// ---------- osobně vedená bitva ----------

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
