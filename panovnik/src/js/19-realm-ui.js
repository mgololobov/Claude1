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
  if (winter || t === "zima") g += `<rect class="wx-snow" x="0" y="-60" width="${MW}" height="${MH + 60}" fill="url(#snowfall)" opacity="${t === "zima" ? 0.6 : 0.4}" pointer-events="none"/>`;
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

// ---------- nové scény ----------
Object.assign(SCENE_X, {
  kostky: (w, h) => `<rect x="${w * 0.2}" y="${h - 50}" width="${w * 0.6}" height="14" fill="#6a4a2a"/><rect x="${w * 0.22}" y="${h - 36}" width="10" height="36" fill="#4a3220"/><rect x="${w * 0.76}" y="${h - 36}" width="10" height="36" fill="#4a3220"/>
    <g transform="translate(${w * 0.42} ${h - 70}) rotate(-12)"><rect width="22" height="22" rx="4" fill="#fbf7ee" stroke="#3a2a1a"/><circle cx="6" cy="6" r="2.2"/><circle cx="16" cy="16" r="2.2"/><circle cx="11" cy="11" r="2.2"/></g><g transform="translate(${w * 0.52} ${h - 72}) rotate(18)"><rect width="22" height="22" rx="4" fill="#fbf7ee" stroke="#3a2a1a"/><circle cx="6" cy="6" r="2.2"/><circle cx="16" cy="6" r="2.2"/><circle cx="6" cy="16" r="2.2"/><circle cx="16" cy="16" r="2.2"/></g>
    <path d="M${w * 0.32} ${h - 50} l8 -26 h16 l8 26z" fill="#8a5a2a"/>${[0, 1, 2, 3, 4].map(i => `<ellipse cx="${w * 0.6 + i * 8}" cy="${h - 52}" rx="5" ry="2.5" fill="#e2b13c" stroke="#8a6a2a"/>`).join("")}
    <g transform="translate(${w * 0.12} ${h - 20})"><circle cy="-46" r="10" fill="#e3c4a0"/><path d="M-16 0 l4 -38 h24 l4 38z" fill="#8c2f1f"/></g><g transform="translate(${w * 0.88} ${h - 20})"><circle cy="-46" r="10" fill="#e3c4a0"/><path d="M-16 0 l4 -38 h24 l4 38z" fill="#1f4e8c"/></g>`,
  spiknuti: (w, h) => `<rect x="${w * 0.46}" y="${h - 60}" width="10" height="20" fill="#f4efe0"/><path d="M${w * 0.46 + 5} ${h - 64} q-5 -10 0 -16 q5 6 0 16" fill="#f3b33d"/><circle cx="${w * 0.46 + 5}" cy="${h - 70}" r="40" fill="#f3b33d" opacity=".12"/>
    ${[-2, -1, 1, 2].map(i => `<g transform="translate(${w * 0.46 + 5 + i * 70} ${h - 18})"><path d="M-22 0 q0 -50 22 -64 q22 14 22 64z" fill="#1a1418"/><path d="M-10 -40 q10 -10 20 0" stroke="#000" fill="#2a2228"/></g>`).join("")}
    <path d="M${w * 0.6} ${h - 46} l40 -12 l3 4 l-40 12z" fill="#cfd3d6"/><rect x="${w * 0.6 - 10}" y="${h - 46}" width="12" height="5" fill="#6a4a2a" transform="rotate(-16 ${w * 0.6} ${h - 44})"/>`,
});
SCENE_IN.push("kostky", "spiknuti");
Object.assign(EVENT_ART, { _kostky: "kostky", _spiknuti: "spiknuti", _atentat: "spiknuti", _zila2: "dul", _dedic2: "rod", prospektor: "dul", dedic_nemoc: "rod", carodejnice: "les", valdensti: "procesi", padelek: "uceni", samozvanec: "procesi", bludny_rytir: "turnaj", kamen_z_nebe: "kometa", mestska_vzpoura: "mesto", sokolnik: "les", sasek: "hudba", kolo_stesteny: "lod", slib_vazala: "dvur" });
GLYPH.kamen = `<path d="M8 26 q-2 -12 8 -16 q8 -6 16 2 q6 8 0 16 q-8 6 -18 4 q-4 -2 -6 -6z" fill="#2e2a2a" stroke="#000"/><path d="M14 18 l3 2 M22 14 l2 3 M24 24 l3 1" stroke="#6a6a7a"/><path d="M30 6 l-6 6 M34 10 l-6 4" stroke="#f3b33d" stroke-width="2"/>`;
Object.assign(TECH_GLYPH, { kolovrat: "kolo", vysoka_pec: "delo", plavebni_komora: "ryba", most_stavba: "klenba", dvojite_ucetnictvi: "svitek", notariat: "papir", pojisteni: "mince", spital: "bylina", kompas: "hvezda", brigantina: "zbroj", rucnice: "delo", bombarda: "trebuchet" });
