// Hra místo tabulek: audienční síň s dvořany, obrázek nomu, nilometr se sýpkami a pokladnicí, pochod klepnutím na mapu.

// ================= AUDIENČNÍ SÍŇ =================
const COURT = {
  vezir: { short: "Vezír", x: 770, hgk: "tjaty", o: { pose: "staff", kilt: "long", sash: 1 }, acts: [["Rozdat rozkazy", "plan"], ["Úředníci", "urednici"], ["Zákony", "zakony"]] },
  pokladnik: { short: "Pokladník", x: 640, hgk: "pokladnik", o: { pose: "offer", item: "scroll", kilt: "long" }, acts: [["Pokladna a trh", "hosp"]] },
  sypky: { short: "Sýpky", x: 510, hgk: "sypkar", o: { pose: "hold", item: "basket" }, acts: [["Sýpky a daň", "hosp"], ["Nomy", "zupy"]] },
  vojsko: { short: "Vojsko", x: 380, hgk: "general", o: { pose: "spear" }, acts: [["Vojsko", "vojsko"], ["Poslové", "diplo"]] },
  knez: { short: "Kněží", x: 250, hgk: "veleknez", o: { pose: "offer", item: "censer", head: "bald", kilt: "long", sash: 1 }, acts: [["Chrámy a stavby", "chramy"], ["Dům života", "vedeni"]] },
};
function courtReports() {
  const C = P(S), b = clanBudget(S, me()), R = { vezir: [], pokladnik: [], sypky: [], vojsko: [], knez: [] };
  const idle = freeOffs().length; if (idle && S.opts.autoPlan === false) R.vezir.push(["warn", `${nPlural(idle, "úředník čeká", "úředníci čekají", "úředníků čeká")} na rozkaz.`]);
  if (!C.res.cur && C.type !== "kmen") R.knez.push(["warn", "Písaři v Domě života nemají zadáno, co zkoumat."]);
  for (const c of officers(S, me()).filter(c => !c.dyn && c.loy < 30)) R.vezir.push(["warn", `${c.n} je nevěrný (${Math.round(c.loy)}).`]);
  for (const p of myProvs().filter(p => p.loy < 25)) R.vezir.push(["warn", `Lid v nomu ${p.n} reptá (spokojenost ${Math.round(p.loy)}).`]);
  if (!R.vezir.length) R.vezir.push(["ok", `Úřady pracují. Vládneš ${nPlural(myProvs().length, "nomu", "nomům", "nomům")}.`]);
  R.pokladnik.push(b.net < 0 ? ["warn", `Pokladna ztrácí ${fmt(-b.net)} debenů měsíčně.`] : ["ok", `Do pokladny přibývá ${fmt(b.net)} debenů měsíčně.`]);
  if (C.tributeTo) R.pokladnik.push(["warn", `Odvádíme tribut rodu ${S.clans[C.tributeTo].house}.`]);
  for (const Rt of ROUTES) if (Rt.provs.some(id => S.provs[id] && S.provs[id].owner === me()) && !routeState(S, Rt).open) R.pokladnik.push(["warn", `Cesta „${Rt.n}“ je přerušená válkou.`]);
  const months = C.grain / Math.max(1, -b.gnet);
  R.sypky.push(b.gnet >= 0 ? ["ok", "Sýpky se plní."] : [months < 3 ? "bad" : months < 8 ? "warn" : "ok", `Obilí vystačí asi na ${Math.max(0, Math.floor(months))} měsíců.`]);
  for (const p of myProvs().filter(p => p.hunger > 0.15)) R.sypky.push(["bad", `V nomu ${p.n} je hlad.`]);
  if (S.month === 0 && hasTech(S, me(), "nilometr") && S.flood.next) R.sypky.push(["ok", `Nilometr slibuje záplavu ${dec(S.flood.next - 0.8)}–${dec(S.flood.next + 0.8)} loktů.`]);
  for (const e of enemiesOf(S, me())) R.vojsko.push(["bad", `Válčíme s rodem ${S.clans[e].house}.`]);
  for (const p of Object.values(S.provs).filter(p => p.siege && (p.owner === me() || p.siege.cl === me()))) R.vojsko.push(["bad", p.owner === me() ? `Nom ${p.n} je obléhán.` : `Obléháme ${p.n} (hradby ${Math.round(p.dur)}).`]);
  if (!R.vojsko.length) R.vojsko.push(["ok", `Hranice jsou klidné. Ve zbrani je ${fmt(clanMen(S, me()))} mužů.`]);
  if (C.maat < 40) R.knez.push(["warn", `Maat je nízko (${Math.round(C.maat)}). Bohové čekají obětiny.`]);
  if (C.tomb && !C.tomb.active && C.tomb.stage < TOMB_STAGES.length && regYear(S, me()) > 2) R.knez.push(["warn", `Hrobka panovníka stojí (${C.tomb.stage} z ${TOMB_STAGES.length} fází).`]);
  if (S.omen && typeof OMEN !== "undefined" && OMEN[S.omen]) R.knez.push(["ok", `Znamení roku: ${OMEN[S.omen][0]}.`]);
  if (!R.knez.length) R.knez.push(["ok", `Bohové jsou spokojeni, maat ${Math.round(C.maat)}.`]);
  return R;
}
const courtUrg = L => L.reduce((a, [l]) => a + (l === "bad" ? 3 : l === "warn" ? 2 : 0), 0);
function courtSvg(R, sel) {
  const C = P(S), B = 292, king = C.t === "král" && C.cul !== "nub", L = ruler();
  let g = `<rect width="1200" height="340" fill="${W_.wall}"/><rect width="1200" height="340" filter="url(#vmot)"/>`;
  g += G_(60, B, O_.column(0, 0, 150), 1, 1.5) + G_(1150, B, O_.column(0, 0, 150), 1, 1.5);
  g += `<path d="M0 ${B}H1200" stroke="${W_.ol}" stroke-width="2"/>`;
  // panovník pod baldachýnem
  g += `<g class="crt${sel === "kral" ? " on" : ""}" data-a="court" data-x='["kral"]'><rect x="880" y="40" width="230" height="${B - 40}" fill="transparent"/>${G_(905, B, O_.kiosk(0, 0, 100, 112) + O_.dais(-12, 0, 124) + O_.chair(58, -7, -1, 0.9, king) + fig(58, -7, { sit: 1, dir: -1, head: king ? "double" : C.cul === "nub" ? "nub" : "wig", skin: C.cul === "nub" ? "nub" : C.cul === "hyk" ? "as" : "m", pose: "hold", kilt: "long" }), 1, 1.62)}
    <text x="992" y="34" text-anchor="middle" class="cn">${esc(L ? L.n.split(",")[0] : "trůn je prázdný")}</text></g>`;
  for (const [k, D] of Object.entries(COURT)) {
    const c = officeHolder(S, me(), k), urg = courtUrg(R[k]), x = D.x, top = B - 100 * 1.36 - 26;
    g += `<g class="crt${sel === k ? " on" : ""}${c ? "" : " empty"}" data-a="court" data-x='["${k}"]'><rect x="${x - 60}" y="${top - 46}" width="120" height="${B - top + 50}" fill="transparent"/>`;
    g += `<g opacity="${c ? 1 : 0.28}">${fig(x, B, { ...D.o, s: 1.36 })}</g>`;
    g += `<text x="${x}" y="${top - 26}" text-anchor="middle" class="chg">${HG[D.hgk]}</text><text x="${x}" y="${top - 8}" text-anchor="middle" class="ct">${esc(D.short)}</text><text x="${x}" y="${top + 8}" text-anchor="middle" class="cn2">${c ? esc(c.n.split(",")[0].slice(0, 20)) : "neobsazeno"}</text>`;
    if (urg) g += `<g transform="translate(${x + 34} ${top + 30})"><path d="M0 -13L12 8H-12Z" fill="${urg >= 3 ? W_.rd : W_.ye}" stroke="${W_.ol}" stroke-width="1"/><text y="5" text-anchor="middle" font-size="13" font-weight="bold" fill="#fff">!</text></g>`;
    if (sel === k) g += `<path d="M${x - 44} ${B + 6}H${x + 44}" stroke="${W_.ye}" stroke-width="5"/>`;
    g += `</g>`;
  }
  // prosebníci u dveří: čím víc starostí, tím delší řada
  const tot = Object.values(R).reduce((a, L2) => a + L2.filter(([l]) => l !== "ok").length, 0);
  for (let i = 0; i < Math.min(3, Math.ceil(tot / 2)); i++) g += fig(150 - i * 38, B, { s: 1.0, pose: "adore", kilt: i % 2 ? "dress" : "short", skin: i % 2 ? "f" : "m", head: i % 2 ? "long" : "wig" });
  if (sel === "kral") g += `<path d="M905 ${B + 6}H1085" stroke="${W_.ye}" stroke-width="5"/>`;
  return `<svg class="courtsvg" viewBox="0 0 1200 340" role="img" aria-label="Audienční síň: panovník a pět nejvyšších hodnostářů"><defs><filter id="vmot" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".012 .03" numOctaves="3" seed="11"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .36  0 0 0 0 .18  0 0 0 .5 -.12"/></filter></defs>${g}
    <g transform="scale(2 1)">${frieze_(0)}</g><rect x="0" y="${B + 14}" width="1200" height="5" fill="${W_.ye}"/><rect x="0" y="${B + 21}" width="1200" height="4" fill="${W_.rd}"/><rect x="0" y="${B + 27}" width="1200" height="21" fill="${W_.bk}"/></svg>`;
}
function courtPanel(R, sel) {
  const C = P(S), L = ruler();
  if (sel === "kral") {
    const sp = L && chr(S, L.spouse), heir = heirsOf(S, me())[0];
    return `<div class="cpanel"><div class="cph">${L ? portrait(L, 84) : ""}<div><div class="who">${rulerLine(C, L)}</div><div class="muted">${esc(C.house)} · ${L ? age(S, L) : "?"} let · ${regYear(S, me())}. rok vlády</div>${L && L.note ? `<div class="small muted">${esc(L.note)}</div>` : ""}
      <div class="row" style="margin-top:6px">${sp ? `<span class="chip">${portrait(sp, 22)} ${esc(sp.n)}</span>` : ""}${heir ? `<span class="chip">${portrait(heir, 22)} dědic: ${esc(heir.n)}</span>` : '<span class="pill bad">bez dědice</span>'}</div></div></div>
      <div class="row">${btn("Rod a nástupnictví", "tab", ["rod"])}${btn("Hrobka a stavby", "tab", ["chramy"])}</div></div>`;
  }
  const D = COURT[sel], c = officeHolder(S, me(), sel), O = OFFICES[sel];
  const say = R[sel].map(([l, t]) => `<div class="say ${l}">${esc(t)}</div>`).join("");
  let extra = "";
  if (sel === "knez" && C.type !== "kmen") { const en = enemiesOf(S, me()), wait = (C.last.zakl ?? -99) > S.turn - 12 ? C.last.zakl + 12 - S.turn : 0;
    if (en.length) extra = `<div class="ritual"><b>Zaklínací texty</b> <span class="small muted">Jména nepřátel se napíší na červené nádoby a figurky spoutaných zajatců, ty se rozbijí a pohřbí (doloženo nálezy z Gízy, Sakkáry a Mirgissy). Nepříteli to neublíží, ale lid a kněze to uklidní: maat +2, spokojenost nomů +2. Stojí 300 debenů, jednou za rok.</span><div class="row">${en.map(e => btn(`Zaklít: ${S.clans[e].house}`, "zaklit", [e], wait ? `Znovu za ${wait} měs.` : C.deben < 300 ? "Chybí 300 debenů" : null)).join("")}</div></div>`; }
  return `<div class="cpanel"><div class="cph">${c ? portrait(c, 84) : ""}<div><div class="who"><span class="hg" title="${esc(hgTitle(D.hgk))}">${HG[D.hgk]}</span> ${esc(O.n)}</div><div class="muted">${c ? `${esc(c.n)} · ${age(S, c)} let · ${esc(O.d)}` : "Úřad není obsazen. Jmenuj hodnostáře v záložce Úředníci."}</div>
    <div class="says">${c ? say : ""}</div></div></div>${extra}<div class="row">${D.acts.map(([n, t]) => btn(n, "tab", [t])).join("")}${c ? "" : btn("Jmenovat hodnostáře", "tab", ["urednici"], null, "go")}</div></div>`;
}
function tAudience() {
  const C = P(S); if (C.type === "kmen") return _tPrehledOld();
  const R = courtReports(); let sel = SEL.court;
  if (!sel || (sel !== "kral" && !COURT[sel])) sel = Object.keys(COURT).sort((a, b) => courtUrg(R[b]) - courtUrg(R[a]))[0];
  const world = (S.worldHist || []).slice(-40), series = aliveClans(S).filter(c => c.type !== "kmen").map(c => ({ name: c.n, col: c.col, bold: c.id === me(), vals: world.map(e => e.p[c.id] || 0) }));
  return `<div class="courtwrap">${courtSvg(R, sel)}<p class="small muted courthint">Klepni na hodnostáře nebo na panovníka. Trojúhelník s vykřičníkem znamená, že má co hlásit.</p>${courtPanel(R, sel)}</div>
    ${palaceExtra()}
    <div class="grid">${card(`${ricon("urednici", 20)} Úkoly rádců`, `<details${SEL.misOpen ? " open" : ""}><summary data-a="misOpen">ukázat úkoly a odměny</summary>${missionsHtml()}</details>`)}
    ${card(`${hg("sema")} Úspěchy`, `<div class="row">${Object.entries(ACH).map(([k, A]) => `<span class="pill ${(C.ach || {})[k] != null ? "good" : ""}" title="${esc(A.d)}">${(C.ach || {})[k] != null ? "✔ " : ""}${esc(A.n)}</span>`).join("")}</div>`)}
    ${card(`${ricon("vojsko", 20)} Zajatci`, `<p>Zajatců: <b>${fmt(C.zajatci || 0)}</b>. Získáš je ve vítězných bitvách.</p><div class="row">${btn("Poslat na stavby (300 na stavbu)", "capBuild", [], (C.zajatci || 0) >= 300 ? null : "Málo zajatců")} ${btn("Usadit u sídla jako rolníky", "capSettle", [], (C.zajatci || 0) >= 200 ? null : "Málo zajatců")}</div>`)}
    ${card(`${hg("sema")} Síla rodů (počet nomů)`, lineChart(series, world.map(e => e.d)))}</div>`;
}
var _tPrehledOld = TAB_FN.prehled;
TAB_FN.prehled = tAudience;
ACT.court = k => { SEL.court = k; };
ACT.misOpen = () => { SEL.misOpen = !SEL.misOpen; };
ACT.zaklit = e => execration(S, me(), e);

// ================= OBRÁZEK NOMU =================
function nomeScene(p) {
  const B = 84, nile = TERRAIN[p.ter].nile, si = Math.floor(S.month / 4), fr = clamp(p.agri / Math.max(1, agriCap(S, p)), 0, 1), nf = Math.max(1, Math.round(fr * 5)), hungry = p.hunger > 0.15;
  let g = `<rect width="360" height="110" fill="${W_.wall}"/>`;
  g += nile ? O_.water(B + 2, 16, 0, 360) : O_.desert(B + 2, 16, 0, 360);
  g += `<path d="M0 ${B}H360" stroke="${W_.ol}" stroke-width="1.2"/>`;
  // pole: v achetu pod vodou, v peretu zelená, v šemu zlatá
  for (let i = 0; i < nf; i++) { const x = 8 + i * 22;
    if (!nile) g += O_.papyrus(x + 8, B, 3, 18).replace(new RegExp(W_.gr, "g"), "#7d8a4a");
    else if (si === 0) g += `<rect x="${x}" y="${B - 7}" width="19" height="7" fill="${W_.wat}" stroke="${W_.bl}" stroke-width=".5"/><path d="M${x + 2} ${B - 3}l3 -2l3 2l3 -2l3 2l3 -2" stroke="${W_.bl}" stroke-width=".7" fill="none"/>`;
    else g += [0, 1, 2, 3].map(j => `<path d="M${x + 3 + j * 4.5} ${B}v-${hungry ? 7 : si === 1 ? 11 : 17}" stroke="${hungry ? "#a08a5a" : si === 1 ? W_.gr : W_.ye}" stroke-width="1.5"/>${si === 2 && !hungry ? `<path d="M${x + 3 + j * 4.5} ${B - 17}q${j % 2 ? 2 : -2} -3 0 -6" stroke="#b9861f" stroke-width="1.9" fill="none"/>` : ""}`).join("");
  }
  let x = 126;
  for (let i = 0; i < Math.min(3, p.b.sypka || 0); i++) { g += O_.silo(x, B, 0.6); x += 19; }
  if (p.b.dilny) { g += `<path d="M${x - 6} ${B}V${B - 22}H${x + 20}V${B}Z" fill="${W_.wh}" stroke="${W_.ol}" stroke-width=".7"/><path d="M${x + 3} ${B}v-12h7v12" fill="#7a4a22"/><path d="M${x - 8} ${B - 22}h30" stroke="${W_.rd}" stroke-width="1.6"/>`; x += 34; }
  if (p.b.chram) { const lv = Math.min(3, p.b.chram), w = 26 + lv * 6, h = 30 + lv * 8; g += O_.mast(x - 2, B, h + 18) + G_(x + 4, B, O_.shrine(0, 0, w, h), 1, 1); x += w + 16; }
  if (p.b.pristav && nile) g += O_.boat(x + 20, B + 12, { s: 0.3, wood: 1, sail: 1 });
  if (p.b.lom) g += `<path d="M${x + 44} ${B}l4 -12h14l5 12z" fill="#b9a98c" stroke="${W_.ol}" stroke-width=".7"/><path d="M${x + 50} ${B - 6}h10" stroke="${W_.ol}" stroke-width=".5"/>`;
  // hradby podle úrovně pevnosti
  if (p.castle > 0) { const h = 20 + p.castle * 9, wx = 300; let d = `M${wx} ${B}V${B - h}`; for (let i = 0; i < 5; i++) d += `h6v5h5v-5`; d += `h5V${B}Z`;
    g += `<path d="${d}" fill="#d8c7a2" stroke="${W_.ol}" stroke-width=".8"/>${[0, 1, 2, 3].map(i => `<path d="M${wx + 8 + i * 13} ${B}v-${h - 12}" stroke="${W_.ol}" stroke-width=".4"/>`).join("")}<path d="M${wx + 22} ${B}v-14h10v14" fill="#7a4a22" stroke="${W_.ol}" stroke-width=".6"/>`; }
  const gar = Math.min(5, Math.ceil(men(p.troops) / 600));
  for (let i = 0; i < gar; i++) g += fig(286 - i * 13, B, { s: 0.34, pose: "spear" });
  if (hungry) g += `<text x="6" y="14" font-size="11" fill="${W_.rd}" font-weight="bold">hlad</text>`;
  return `<svg class="nomescene" viewBox="0 0 360 110" role="img" aria-label="Nom ${esc(p.n)}: pole, sýpky, stavby, hradby a posádka">${g}<g transform="scale(.6 1)">${frieze_(0)}</g></svg>`;
}
var _provPanel2 = provPanel;
provPanel = function (p) {
  let h = _provPanel2(p); if (!p) return h;
  if (knows(S, p)) h = h.replace('<div class="statgrid">', nomeScene(p) + '<div class="statgrid">');
  if (p.owner === me()) h = h.replace("<h4>Vyslat vojsko</h4>", `<div class="row">${btn(SEL.march === p.id ? "Zrušit výběr cíle" : "Táhnout vojskem: klepni na cíl na mapě", "marchMode", [p.id], null, "go")}</div><h4>Vyslat vojsko – podrobný rozkaz</h4>`);
  return h;
};
// ================= POCHOD KLEPNUTÍM NA MAPU =================
ACT.marchMode = pid => { SEL.march = SEL.march === pid ? null : pid; };
var _selProv2 = ACT.selProv;
ACT.selProv = id => {
  if (!SEL.march || MAPDRAG.until > Date.now()) return _selProv2(id);
  const from = SEL.march; SEL.march = null; if (id === from || !S.provs[from]) return _selProv2(id);
  const cmd = officersIn(S, from).filter(c => c.acted !== S.turn && !c.army && !c.away && !c.moving).sort((a, b) => st(b, "ved") - st(a, "ved"))[0];
  const r = sendArmy(S, me(), from, id, +(SEL["ap_" + from] || 0.75), cmd ? [cmd.id] : [], SEL["as_" + from] || "vyvazeny", SEL["at2_" + from] || "sik");
  if (r) return r; MAPC.k = null; SEL.prov = id; return `Vojsko vyrazilo z nomu ${S.provs[from].n} do nomu ${S.provs[id].n}${cmd ? ", velí " + cmd.n.split(",")[0] : ""}.`;
};
var _tMapa2 = TAB_FN.mapa;
TAB_FN.mapa = function () { const h = _tMapa2(); if (!SEL.march || !S.provs[SEL.march] || S.provs[SEL.march].owner !== me()) { SEL.march = null; return h; }
  return h.replace('<div class="stage" id="stage">', `<div class="stage marching" id="stage"><div class="ov ov-march"><b>Kam má vojsko z nomu ${esc(S.provs[SEL.march].n)} táhnout?</b> Klepni na cílový nom (vlastní, spojenecký nebo nepřátelský). ${btn("Zrušit", "marchMode", [SEL.march])}</div>`); };

// ================= NILOMETR, SÝPKY A POKLADNICE =================
function hospScene() {
  const C = P(S), b = clanBudget(S, me()), h = S.flood.h, B = 226, top = 34, cub = v => B - (clamp(v, 10, 20) - 10) * (B - top) / 10, hist = (S.flood.hist || []).slice(-8);
  const zones = [[10, 13.5, W_.rd, "hlad"], [13.5, 15, W_.ye, "nouze"], [15, 17, W_.gr, "hojnost"], [17, 18, W_.ye, "vysoká"], [18, 20, W_.rd, "ničivá"]];
  let g = `<rect width="1200" height="260" fill="${W_.wall}"/><rect width="1200" height="260" filter="url(#vmot)"/>`;
  // nilometr: schodiště s měřítkem v loktech, jak je známo z Elefantiny (dochovaná podoba je mladší, princip stejný)
  if (h) g += `<path d="M96 ${cub(h)}H360V${B}H96Z" fill="${W_.wat}"/>` + [0, 1, 2, 3].map(r => { let d = `M96 ${cub(h) + 5 + r * 9}`; for (let x = 96; x < 356; x += 10) d += "l5 -3l5 3"; return cub(h) + 5 + r * 9 < B ? `<path d="${d}" stroke="${W_.bl}" stroke-width="1" fill="none"/>` : ""; }).join("");
  { let d = `M130 ${B}`; for (let i = 0; i < 10; i++) d += `V${cub(11 + i)}h23`; g += `<path d="${d}V${B}Z" fill="#d8c7a2" stroke="${W_.ol}" stroke-width="1"/>`; }
  for (const [a, z, col, n] of zones) g += `<rect x="60" y="${cub(z)}" width="14" height="${cub(a) - cub(z)}" fill="${col}" stroke="${W_.ol}" stroke-width=".5"/><text x="54" y="${(cub(a) + cub(z)) / 2 + 4}" text-anchor="end" class="hs">${n}</text>`;
  g += `<rect x="76" y="${top}" width="20" height="${B - top}" fill="${W_.wh}" stroke="${W_.ol}" stroke-width="1"/>`;
  for (let v = 10; v <= 20; v++) g += `<path d="M76 ${cub(v)}h${v % 5 === 0 ? 20 : 10}" stroke="${W_.ol}" stroke-width="${v % 5 === 0 ? 1.4 : 0.7}"/>${v % 2 === 0 ? `<text x="100" y="${cub(v) + 4}" class="hs">${v}</text>` : ""}`;
  hist.forEach((x, i) => { g += `<path d="M${372 + i * 9} ${cub(x.h)}l7 -4v8z" fill="${x.h < 13.5 || x.h >= 18 ? W_.rd : W_.bl}" opacity="${0.35 + 0.65 * (i + 1) / hist.length}"><title>${x.y} př. n. l.: ${dec(x.h)} loktů</title></path>`; });
  g += `<text x="96" y="22" class="ht">Nilometr</text><text x="96" y="252" class="hs">${h ? `letos ${dec(h)} loktů${hist.length > 1 ? " · šipky: minulé roky" : ""}` : "záplava přijde ve 2. měsíci období achet"}</text>`;
  // sýpky: každá kupole dva měsíce zásob
  const months = b.gnet >= 0 ? 12 : clamp(C.grain / Math.max(1, -b.gnet), 0, 12);
  for (let i = 0; i < 6; i++) { const x = 500 + i * 50, f = clamp(months / 2 - i, 0, 1);
    g += `<clipPath id="sf${i}"><rect x="${x - 26}" y="${B - 77 * f}" width="52" height="${77 * f}"/></clipPath>` + G_(x, B, `<path d="M-15 0V-27Q-15 -46 0 -48Q15 -46 15 -27V0Z" fill="#efe6d0" stroke="${W_.ol}" stroke-width=".7" opacity=".55"/>`, 1, 1.6) + `<g clip-path="url(#sf${i})">${G_(x, B, `<path d="M-15 0V-27Q-15 -46 0 -48Q15 -46 15 -27V0Z" fill="${W_.ye}" stroke="${W_.ol}" stroke-width=".7"/>`, 1, 1.6)}</g>` + G_(x, B, `<path d="M-4 -38h8v8h-8z" fill="#7a4a22" stroke="${W_.ol}" stroke-width=".5"/>`, 1, 1.6); }
  g += fig(800, B, { s: 0.95, pose: "offer", item: "scroll", kilt: "long", dir: -1 });
  g += `<text x="476" y="22" class="ht">Sýpky</text><text x="476" y="252" class="hs">${fmtK(C.grain)} charů · ${b.gnet >= 0 ? "zásoby rostou" : "vystačí asi na " + Math.floor(C.grain / Math.max(1, -b.gnet)) + " měs."}</text>`;
  // pokladnice: váhy a kruhy kovu (kov se vážil v kruzích, jak ukazují malby)
  const rings = clamp(Math.round(C.deben / 2500), 0, 18);
  g += `<path d="M930 ${B}V${B - 120}M884 ${B - 114}H976" stroke="#7a5326" stroke-width="3.4"/><path d="M888 ${B - 114}l-16 44h32zM972 ${B - 114}l-16 44h32z" fill="none" stroke="${W_.ol}" stroke-width=".9"/><path d="M868 ${B - 70}q20 13 40 0zM952 ${B - 70}q20 13 40 0z" fill="${W_.ye}" stroke="${W_.ol}" stroke-width=".8"/>` + O_.rings(876, B - 70, 3) + `<path d="M962 ${B - 74}h20v-12h-20z" fill="#8a8f96" stroke="${W_.ol}" stroke-width=".7"/>`;
  for (let i = 0; i < rings; i++) g += O_.rings(1010 + (i % 6) * 22, B - Math.floor(i / 6) * 14, 1).replace(/r="4"/, 'r="6"').replace(/r="5.4"/, 'r="7.6"').replace(/stroke-width="2.6"/, 'stroke-width="3.6"');
  g += fig(850, B, { s: 0.95, pose: "work", kilt: "long" });
  g += `<text x="870" y="22" class="ht">Pokladnice</text><text x="870" y="252" class="hs">${fmtK(C.deben)} debenů · <tspan fill="${b.net < 0 ? W_.rd : "#2e6b45"}">${sg(b.net)} měsíčně</tspan></text>`;
  return `<svg class="hospsvg" viewBox="0 0 1200 260" role="img" aria-label="Nilometr, sýpky a pokladnice"><defs><filter id="vmot" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".012 .03" numOctaves="3" seed="11"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .36  0 0 0 0 .18  0 0 0 .5 -.12"/></filter></defs>${g}<path d="M0 ${B}H1200" stroke="${W_.ol}" stroke-width="1.6"/><g transform="scale(2 1)">${frieze_(0)}</g></svg>`;
}
var _tHosp2 = TAB_FN.hosp;
TAB_FN.hosp = () => `<div class="courtwrap">${hospScene()}</div>` + _tHosp2();
