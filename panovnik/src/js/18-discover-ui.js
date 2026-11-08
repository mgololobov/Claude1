// Okno „Výpravy a poklady“: mapa světa, výpravy, pokladnice vzácností a dvorní učenci.
RAIL.splice(RAIL.findIndex(r => r[0] === "objevy") + 1, 0, ["vypravy", "Výpravy a poklady"]);
ICON.vypravy = "M11 2a9 9 0 1 0 .1 0z M11 5l2.5 6-2.5 6-2.5-6z M11 11h.1";

function tVypravy() {
  const C = P(S), dk = SEL.exp && DESTS[SEL.exp] ? SEL.exp : "benatky", D = DESTS[dk], exps = C.exps || [], cands = expCandidates(S, me());
  const gone = D.until && S.year >= D.until, on = exps.find(e => e.d === dk);
  const risk = Math.round(expRisk(S, me(), dk, cands[0]) * 100);
  const detail = `<div class="expdet">${scene(eventArt({ id: "_exp", d: dk }), 640, 120)}<div class="dd"><h3>${glyph(DEST_GLYPH[D.ic], 30)} ${esc(D.n)}</h3><p>${D.d}</p>
    <div class="kv"><span>Cesta tam a zpět</span><b>${expMonths(S, me(), dk)} měs.</b><span>Náklady</span><b>${C.freeExp ? "zdarma (podpora kupců)" : D.cost + " zl"}</b><span>Nebezpečí</span><b class="${risk > 15 ? "bad" : risk > 8 ? "warn" : "good"}">asi ${risk} %</b><span>Možné zisky</span><span>${D.loot.map(k => TREASURES[k] ? TREASURES[k].n : COURT[k] ? COURT[k].n : TECHS[k] ? "objev " + TECHS[k].n : LOOT_N[k] || k).join(", ")}</span></div>
    ${gone ? `<div class="alert bad">Cesta už není možná (od roku ${D.until}).</div>` : on ? `<div class="alert warn">Výprava je na cestě, návrat asi za ${on.back - S.turn} měs.</div>` : cands.length ? `<div class="row">${sel_("expc", cands.map(c => [c.id, `${c.n} (rozum ${st(c, "roz")}, udatnost ${st(c, "uda")})`]), cands.sort((a, b) => st(b, "roz") - st(a, "roz"))[0].id)}${btn("Vypravit", "expgo", [dk], exps.length >= 2 ? "Na cestě jsou už dvě výpravy" : C.gold < D.cost && !C.freeExp ? "Málo zlata" : null, "go")}</div><p class="small muted">Vůdce výpravy bude po dobu cesty chybět u dvora. Rozum zvyšuje zisk z poznání, rozum a udatnost snižují nebezpečí.</p>` : '<p class="muted small">Nemáš volného muže, který by výpravu vedl (bez vojska a úřadu).</p>'}</div></div>`;
  const onWay = exps.length ? exps.map(e => { const c = chr(S, e.c); return `<div class="row">${glyph("kun", 22)} <b>${esc(c ? c.n : "?")}</b> → ${esc(DESTS[e.d].n)} ${meter("", S.turn - e.start, e.m, "#b3261e")}<span class="small muted">ještě ${Math.max(0, e.back - S.turn)} měs.</span></div>`; }).join("") : '<p class="muted small">Žádná výprava není na cestě. Klikni na cíl na mapě.</p>';
  const trea = Object.entries(TREASURES).map(([k, T]) => { const have = (C.trea || []).includes(k); return `<div class="trea${have ? " have" : ""}" title="${esc(T.d)}">${glyph(T.g, 44)}<b>${T.n}</b><span class="small">${have ? T.d : "zatím chybí"}</span></div>`; }).join("");
  const court = Object.entries(COURT).map(([k, K]) => { const have = hasCourt(S, me(), k); return `<div class="trea${have ? " have" : ""}">${portraitCourt(k)}<b>${K.n}</b><span class="small">${have ? K.d : "zatím u dvora chybí"}</span></div>`; }).join("");
  return `<div class="grid">${card("Mapa známého světa", worldMap() + `<p class="small muted">Klikni na cíl. Výprava může přinést vzácnosti do pokladnice, učence ke dvoru, objevy i slávu – nebo se nevrátit.</p>`, "wide")}
  ${card("Cíl výpravy", detail, "wide")}${card("Na cestě", onWay)}
  ${card(`Pokladnice vzácností (${(C.trea || []).length}/${Object.keys(TREASURES).length})`, `<div class="treas">${trea}</div>`, "wide")}
  ${card(`Dvorní učenci a umělci (${Object.keys(C.court || {}).length}/${Object.keys(COURT).length})`, `<div class="treas">${court}</div><p class="small muted">Učenci přicházejí s událostmi nebo z výprav.</p>`, "wide")}</div>`;
}
const sel_ = (id, opts, v) => sel(id, opts, v);
function portraitCourt(k) {
  const col = { lekar: "#2f5d50", astrolog: "#1f2f5a", alchymista: "#5a2f6a", kronikar: "#6a4a2a", stavitel: "#7a5a3a", kartograf: "#2f5a7a", pevec: "#8c2f1f" }[k], acc = { lekar: "bylina", astrolog: "hvezda", alchymista: "banka", kronikar: "kniha", stavitel: "klenba", kartograf: "mapa", pevec: "latka" }[k];
  return `<svg class="glyph" viewBox="0 0 44 44" width="44" height="44"><circle cx="22" cy="22" r="21" fill="#efe3c5" stroke="#8a6a3a"/><path d="M8 42 q2 -14 14 -14 q12 0 14 14z" fill="${col}"/><circle cx="22" cy="18" r="8" fill="#e3c4a0"/><path d="M13 16 q9 -14 18 0 q-2 -6 -9 -6 q-7 0 -9 6z" fill="${col}"/><svg x="27" y="25" width="16" height="16" viewBox="0 0 40 40">${GLYPH[acc]}</svg></svg>`;
}
Object.assign(ACT, {
  expsel: d => { SEL.exp = d; },
  expgo: d => startExpedition(S, me(), d, $("#expc").value),
});
