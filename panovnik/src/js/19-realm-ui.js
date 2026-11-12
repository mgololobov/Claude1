// Rozhraní komplexní říše: zákony jako karty, počasí, spiknutí, kostky a nové scény.
EXP_N.skoly = "Školy";
const LAW_ART = { robota: "uroda", nastupnictvi: "rod", mesta: "mesto", cirkev: "cirkev", vojsko: "valka", mince: "dul" };
function lawCards() {
  const C = P(S); ensureLaws(C);
  return card("Zákony země", `<div class="laws">${Object.entries(LAWS).map(([l, L]) => {
    const cd = (C.lawCd[l] || 0) > S.turn, cur = C.laws[l], est = LAW_EST[l] || [];
    const opts = L.opts.map((o, i) => { const fx = Object.entries(est[i] || {}).map(([e, v]) => `${ESTATES[e]} ${v > 0 ? "+" : ""}${v}`).join(", ");
      return `<button class="lopt${i === cur ? " on" : ""}" data-a="law" data-x='["${l}",${i}]' ${cd || i === cur ? "disabled" : ""} title="${esc(fx || "bez vlivu na stavy")}"><b>${esc(o)}</b><small>${esc(fx || "—")}</small></button>`; }).join("");
    return `<div class="law">${scene(L.art || LAW_ART[l] || "dvur", 320, 70)}<div class="dd"><b>${esc(L.n)}</b><div class="small muted">${L.d}</div><div class="lopts">${opts}</div>${cd ? `<div class="small warn">Znovu změnit lze za ${C.lawCd[l] - S.turn} měs.</div>` : ""}</div></div>`; }).join("")}</div>
    <p class="small muted">Změna zákona stojí 20 prestiže a další změna téhož zákona je možná po dvou letech. Pod volbou je vliv na stavy.</p>`, "wide");
}
const WX_IC = { mirny: "☁", pozehnany: "☀", desty: "🌧", sucho: "🔥", zima: "❄" };
function weatherChip() { const w = S.weather || { t: "mirny" }, W = WEATHER[w.t]; return `<span class="res wx wx-${w.t}" title="${esc(W.n + ": " + W.d + ` Sklizeň ×${W.harvest}.`)}"><span class="wxi">${WX_IC[w.t]}</span><small>${esc(W.n)}</small></span>`; }
function weatherOverlay() {
  const t = (S.weather || {}).t || "mirny", m = S.month, winter = [11, 0, 1].includes(m);
  let g = `<g class="wx-clouds" pointer-events="none">${[0, 1, 2, 3].map(i => `<ellipse cx="${(i * 0.27 + 0.05) * MW}" cy="${(0.15 + (i % 2) * 0.35) * MH}" rx="${MW * 0.09}" ry="${MH * 0.04}" fill="#fff" opacity="${t === "desty" ? 0.28 : 0.13}"/>`).join("")}</g>`;
  if (t === "desty" && !winter) g += `<rect class="wx-fall" x="0" y="-60" width="${MW}" height="${MH + 60}" fill="url(#rainp)" opacity=".55" pointer-events="none"/>`;
  if (t === "sucho" && [5, 6, 7].includes(m)) g += `<rect width="${MW}" height="${MH}" fill="#e8a040" opacity=".1" pointer-events="none" class="wx-heat"/>`;
  return `<defs><pattern id="rainp" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M5 0 l-3 9 M20 12 l-3 9 M12 22 l-2 6" stroke="#cfe2f0" stroke-width="1"/></pattern><pattern id="snowfall" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="5" cy="6" r="1.2" fill="#fff"/><circle cx="20" cy="16" r="1.5" fill="#fff"/><circle cx="12" cy="26" r="1" fill="#fff"/></pattern></defs>${g}`;
}
function plotsCard() {
  const pl = S.plots || [], known = pl.filter(p => p.known), hidden = pl.filter(p => !p.known), dis = officers(S, me()).filter(c => c.loy < 55 && c.id !== P(S).leader);
  const rumor = hidden.some(p => p.str > 40) ? '<div class="alert warn">🗡 Na dvoře se šušká o něčem nekalém… Zvědové zatím nic nevědí.</div>' : "";
  const kn = known.map(p => `<div class="plot">${p.m.map(id => portrait(chr(S, id), 40)).join("")}<div class="dd"><b>Spiknutí: ${PLOT_GOALS[p.goal]}</b>${meter("Síla", Math.round(p.str), 100, "#7a1d1d")}<div class="row">${btn("Zatknout", "plot", [p.id, "zatknout"])}${btn("Popravit", "plot", [p.id, "popravit"], null, "danger")}${btn(`Uplatit (${p.m.length * 80} zl)`, "plot", [p.id, "uplatit"], P(S).gold >= p.m.length * 80 ? null : "Málo zlata")}${p.watched ? "" : btn("Sledovat", "plot", [p.id, "sledovat"])}</div></div></div>`).join("");
  return card("Tajná služba a spiknutí", `${kn}${rumor}<div class="small muted">Nespokojených vazalů (věrnost pod 55): <b class="${dis.length ? "bad" : "good"}">${dis.length}</b>${dis.length ? " – " + dis.map(c => esc(c.n)).join(", ") : ""}. Spiknutí odhaluje zemský sudí a kancléř, tvrdé trestní právo pomáhá.</div>${!kn && !rumor ? '<p class="small muted">Žádné známé spiknutí.</p>' : ""}`);
}
function evExtra(ev) {
  if (ev.id === "_kostky" && ev.me) return `<div class="dicebox"><div><small>Ty</small>${ev.me.map(n => dieSvg(n)).join("")}<b>${diceScore(ev.me)}</b></div><div><small>${esc(chr(S, ev.cid) ? chr(S, ev.cid).n.split(" ")[0] : "Soupeř")}</small>${ev.foe.map(n => dieSvg(n, "#f0dcc0")).join("")}<b>${diceScore(ev.foe)}</b></div></div>`;
  if (ev.id === "_spiknuti") { const pl = (S.plots || []).find(p => p.id === ev.pl); if (pl) return `<div class="row">${pl.m.map(id => portrait(chr(S, id), 44)).join("")}</div>${meter("Síla spiknutí", Math.round(pl.str), 100, "#7a1d1d")}`; }
  return "";
}
Object.assign(ACT, { plot: (id, how) => crushPlot(S, id, how) });

SCENE_IN.push("kostky", "spiknuti");
Object.assign(EVENT_ART, { _kostky: "kostky", _spiknuti: "spiknuti", _atentat: "spiknuti", _zila2: "dul", _dedic2: "rod", prospektor: "dul", dedic_nemoc: "rod", carodejnice: "les", valdensti: "procesi", padelek: "uceni", samozvanec: "procesi", bludny_rytir: "turnaj", kamen_z_nebe: "kometa", mestska_vzpoura: "mesto", sokolnik: "les", sasek: "hudba", kolo_stesteny: "lod", slib_vazala: "dvur" });
Object.assign(TECH_GLYPH, { kolovrat: "kolo", vysoka_pec: "delo", plavebni_komora: "ryba", most_stavba: "klenba", dvojite_ucetnictvi: "svitek", notariat: "papir", pojisteni: "mince", spital: "bylina", kompas: "hvezda", brigantina: "zbroj", rucnice: "delo", bombarda: "trebuchet" });
