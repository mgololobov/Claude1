// Záložka Zákony: zákony podle oblastí, u každé možnosti účinek a dopad na stavy.
Object.assign(LAWS.robota, { eff: ["lid +8, stavby a kanály pomalejší", "", "stavby o 25 % rychlejší, kanály +20 %, lid −12"] });
Object.assign(LAWS.nomarchove, { eff: ["úředníci +10 věrnosti, výnos nomů −5 až 8 %", "", "výnos nomů +8 až 10 %, úředníci −12 věrnosti"] });
Object.assign(LAWS.chramy, { eff: ["kněží +15, chrámy stojí 40 debenů za úroveň měsíčně", "", "+120 debenů za úroveň chrámu, kněží −20, maat −5"] });
Object.assign(LAWS.vojsko, { eff: ["odvod o 30 % levnější, noví vojáci výcvik 18", "", "odvod o 30 % dražší, noví vojáci výcvik 42"] });
Object.assign(LAWS.nastupnictvi, { eff: ["dědí nejstarší dospělý syn", "dospělý dědic převezme vládu bez ztráty maat", "vládne nejschopnější muž rodu, úředníci +3"] });
const estDelta = d => Object.entries(d || {}).map(([e, v]) => `<span class="pill ${v > 0 ? "good" : "bad"}">${ESTATES[e]} ${v > 0 ? "+" : "−"}${Math.abs(v)}</span>`).join(" ");
function tZakony() {
  const C = P(S), cats = {};
  for (const k of Object.keys(LAWS)) (cats[LAW_CATS[k] || "Ostatní"] = cats[LAW_CATS[k] || "Ostatní"] || []).push(k);
  const lawCard = k => { const L = LAWS[k], cur = lw(S, me(), k), cd = (C.lawCd[k] || 0) > S.turn ? C.lawCd[k] - S.turn : 0;
    return `<div class="person law"><div class="lawh">${lawDial(cur, L.opts.length)}<div class="pn">${esc(L.n)}</div></div><div class="small muted">${esc(L.d)}</div>
      ${L.opts.map((o, i) => `<div class="lawopt${i === cur ? " on" : ""}"><div class="row">${i === cur ? "<b>✔ " + esc(o) + "</b>" : btn(esc(o), "law", [k, i], cd ? `Zákon lze znovu změnit za ${cd} měs.` : null)}</div><div class="small">${esc((L.eff || [])[i] || "beze změny")}</div><div>${estDelta((LAW_EST[k] || [])[i])}</div></div>`).join("")}
      ${cd ? `<div class="small muted">Změna možná za ${cd} měs.</div>` : ""}</div>`; };
  return `<section class="card"><h3>Zákony a nařízení</h3><p class="small muted">Změna zákona okamžitě posune náladu stavů (kněží, nomarchové, písaři, lid) a lze ji opakovat nejdřív po roce. Daň ze sklizně se mění po půl roce.</p>
    <div class="row">Daň ze sklizně: ${sel("taxSel", TAX_LEVELS.map((t, i) => [i, `${t} (${Math.round(TAX_RATE[i] * 100)} %)`]), C.tax, `data-a="tax" data-x='[]'`)}</div>
    <div class="row">${ESTATE_IDS.map(e => `<span class="chip">${ESTATES[e]} <b>${Math.round(C.estates[e])}</b></span>`).join("")}</div></section>
  ${Object.entries(cats).map(([cat, ks]) => `<h3 class="title" style="margin:18px 0 8px;color:var(--accent)">${esc(cat)}</h3><div class="people">${ks.map(lawCard).join("")}</div>`).join("")}`;
}
