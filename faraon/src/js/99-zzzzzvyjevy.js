// Další výjevy místo seznamů: přehlídka vojska, poslové před trůnem, letopis jako deska s ročními poli, citáty u hodnostářů.
const quoteHtml = (tags, salt) => { const q = quoteTag(S, tags, salt); return q ? `<div class="wis">„${esc(q.t)}“ <span>— ${esc(q.src)}</span></div>` : ""; };
const VMOT_ = `<defs><filter id="vmot" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".012 .03" numOctaves="3" seed="11"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .36  0 0 0 0 .18  0 0 0 .5 -.12"/></filter></defs>`;
const sceneFrame = (cls, w, h, B, inner, label) => `<svg class="${cls}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">${VMOT_}<rect width="${w}" height="${h}" fill="${W_.wall}"/><rect width="${w}" height="${h}" filter="url(#vmot)"/>${inner}<path d="M0 ${B}H${w}" stroke="${W_.ol}" stroke-width="1.8"/><g transform="scale(${w / 600} 1)">${frieze_(0)}</g><rect x="0" y="${B + 12}" width="${w}" height="5" fill="${W_.ye}"/><rect x="0" y="${B + 19}" width="${w}" height="4" fill="${W_.rd}"/><rect x="0" y="${B + 25}" width="${w}" height="${h - B - 25}" fill="${W_.bk}"/></svg>`;
const TROOP_POSE = { kopinici: { pose: "spear" }, lucistnici: { pose: "bow" }, medzajove: { pose: "bow", skin: "nub", head: "nub", belt: W_.rd, collar: false }, vozy: { pose: "drive" } };
// řada postav podle složení vojska: jedna postava za „per“ mužů
function troopRow(t, x0, B, s, per, max, mono, dir = 1) {
  let figs = []; for (const k of TROOP_IDS) { const n = Math.round((t[k] || 0) / per); for (let i = 0; i < n; i++) figs.push(k); }
  if (!figs.length && men(t) > 0) figs.push(TROOP_IDS.find(k => t[k] > 0) || "kopinici");
  figs = figs.slice(0, max);
  return figs.map((k, i) => { const x = x0 + dir * i * 30 * s, o = { ...(TROOP_POSE[k] || {}), s, dir, mono: mono || null };
    return k === "vozy" ? `<circle cx="${x}" cy="${B - 11 * s}" r="${11 * s}" fill="none" stroke="${mono || "#7a5326"}" stroke-width="${2.4 * s}"/><path d="M${x - 11 * s} ${B - 11 * s}h${22 * s}M${x} ${B - 22 * s}v${22 * s}" stroke="${mono || "#7a5326"}" stroke-width="${1.4 * s}"/>` + fig(x + dir * 3 * s, B - 16 * s, { ...o, s: s * 0.78, pose: "bow" }) : fig(x, B, o); }).join("");
}
// ================= VOJSKO =================
function musterSvg() {
  const B = 232, tot = {}; for (const k of TROOP_IDS) tot[k] = 0;
  for (const p of myProvs()) for (const k of TROOP_IDS) tot[k] += p.troops[k] || 0;
  for (const a of S.armies.filter(a => a.cl === me())) for (const k of TROOP_IDS) tot[k] += a.t[k] || 0;
  const all = men(tot), kinds = TROOP_IDS.filter(k => tot[k] > 0), per = Math.max(100, Math.ceil(all / 26 / 50) * 50);
  let g = "", x = 150;
  g += O_.mast(60, B, 190) + fig(100, B, { s: 1.5, pose: "staff", kilt: "long", sash: 1 });
  for (const k of kinds) { const n = Math.max(1, Math.min(10, Math.round(tot[k] / per))), w = n * 39;
    g += troopRow({ [k]: n * per }, x + 22, B, 1.3, per, 10) + `<text x="${x + w / 2}" y="40" text-anchor="middle" class="ht">${esc(TROOPS[k].n)}</text><text x="${x + w / 2}" y="60" text-anchor="middle" class="hs">${fmt(tot[k])} mužů</text>`; x += w + 46; }
  if (!kinds.length) g += `<text x="600" y="130" text-anchor="middle" class="ht">Ve zbrani není nikdo</text>`;
  g += `<text x="16" y="26" class="hs">jedna postava ≈ ${fmt(per)} mužů</text>`;
  return sceneFrame("hospsvg", 1200, 270, B, g, "Přehlídka vojska podle druhů");
}
function tVojskoArt() {
  const mineA = S.armies.filter(a => a.cl === me()), foeA = S.armies.filter(a => a.cl !== me() && atWar(S, a.cl, me()) && knows(S, S.provs[a.loc]));
  const strip = (t, col, per = 250, max = 10) => `<svg class="trow" viewBox="0 0 320 44" aria-hidden="true">${troopRow(t, 16, 42, 0.38, per, max, col)}</svg>`;
  const armies = mineA.map(a => { const p = S.provs[a.loc]; return `<div class="armyc"><div class="ah"><b>${fmt(men(a.t))} mužů</b> · ${provLink(p)} ${a.path.length ? "→ " + esc(S.provs[a.goal].n) + ` (${nPlural(a.path.length, "pochod", "pochody", "pochodů")})` : p.siege && p.siege.army === a.id ? "· obléhá" : "· stojí"}</div>${strip(a.t, null, Math.max(100, Math.ceil(men(a.t) / 10 / 50) * 50))}<div class="small muted">${a.cmds.map(id => esc((chr(S, id) || {}).n || "")).join(", ") || "bez velitele"}</div><div class="row">${p.owner === me() ? btn("Do posádky", "disband", [a.id]) : ""}${btn("Zpět domů", "armyHome", [a.id])}</div></div>`; }).join("");
  const foes = foeA.map(a => `<div class="armyc foe" style="--c:${S.clans[a.cl].col}"><div class="ah">${chip(a.cl)} <b>${estimate(S, S.provs[a.loc], men(a.t))}</b> · ${esc(S.provs[a.loc].n)} ${a.path.length ? "→ " + esc(S.provs[a.goal].n) : "· stojí"}</div>${strip(a.t, S.clans[a.cl].col, Math.max(100, Math.ceil(men(a.t) / 10 / 50) * 50))}</div>`).join("");
  const gar = myProvs().sort((a, b) => (isFront(S, b) - isFront(S, a)) || men(b.troops) - men(a.troops)).map(p => `<div class="garc${isFront(S, p) ? " front" : ""}" data-a="selProv" data-x='["${p.id}"]' title="strop ${fmt(troopCap(p))} · obrana ${Math.round(provDefense(S, p))} · výcvik ${Math.round(p.train)}"><div class="gn">${esc(p.n)}${isFront(S, p) ? ' <span class="pill bad">fronta</span>' : ""}</div>${strip(p.troops, null)}<div class="small muted">${fmt(men(p.troops))} mužů · výcvik ${Math.round(p.train)}</div></div>`).join("");
  const bt = S.battles.filter(b => b.a === me() || b.b === me()).slice(0, 8).map(b => `<details><summary>${esc(b.d)} – ${esc(S.provs[b.place].n)}: ${chipH(b.a)} proti ${chipH(b.b)} – ${(b.win === "A" ? b.a : b.b) === me() ? '<b class="good">vítězství</b>' : '<b class="bad">porážka</b>'} (${b.kind})</summary>${battleChart(b)}${b.fates && b.fates.length ? `<p class="small">${esc(b.fates.join(", "))}</p>` : ""}</details>`).join("");
  const kinds = TROOP_IDS.map(k => `<div class="kindc"><svg viewBox="0 0 70 70" aria-hidden="true">${troopRow({ [k]: 100 }, 28, 66, 0.6, 100, 1)}</svg><div><b>${esc(TROOPS[k].n)}</b><div class="small">útok ${TROOPS[k].atk} · obrana ${TROOPS[k].def} · ${fmt(TROOPS[k].cost)} debenů za sto mužů</div><div class="small muted">${TROOPS[k].d || ""}</div></div></div>`).join("");
  return `<div class="courtwrap">${musterSvg()}${quoteHtml(["vojsko", "valka"])}</div><div class="grid">
    ${card("Vojska v poli", (armies ? `<div class="armyg">${armies}</div>` : '<p class="muted">Žádné vojsko není na pochodu.</p>') + '<p class="small muted">Vojsko vyšleš z panelu nomu na mapě: „Táhnout vojskem“ a klepnout na cíl. Vojáci jedí 1,5 charu obilí měsíčně.</p>', "wide")}
    ${foes ? card("Nepřátelská vojska, o kterých víme", `<div class="armyg">${foes}</div>`, "wide") : ""}
    ${card("Posádky nomů", `<div class="garg">${gar}</div><p class="small muted">Klepnutím otevřeš nom na mapě. Najetím myší uvidíš strop posádky a obranu.</p>`, "wide")}
    ${card("Bitvy", bt || '<p class="muted small">Zatím žádné.</p>', "wide")}
    ${card("Druhy vojska", `<div class="kindg">${kinds}</div><p class="small muted">Kopiníci s velkými štíty z volské kůže a lučištníci tvořili jádro egyptských vojsk (dřevěné modely z hrobky Mesehtiho v Asjútu, 11. dynastie). Koně a válečný vůz se do Egypta dostali v době Hyksósů; egyptské vozatajstvo je doloženo od počátku 18. dynastie.</p>`, "wide")}
    ${card("Osobní velení", `<label><input type="checkbox" data-a="liveToggle" ${S.opts.live !== false ? "checked" : ""}> vést větší bitvy osobně, kolo po kole</label><p class="small muted">Při střetu nad 800 mužů se otevře bojiště a v každém kole dáš rozkaz.</p>`)}</div>`;
}
// ================= POSLOVÉ PŘED TRŮNEM =================
function envoyFig(O, x, B, s) {
  const war = atWar(S, me(), O.id), friend = allied(S, me(), O.id) || O.vassalOf === me() || O.tributeTo === me() || S.trade[pairKey(me(), O.id)];
  const base = O.cul === "nub" || O.id === "medzaj" ? { skin: "nub", head: "nub", belt: W_.rd, collar: false } : O.cul === "hyk" || O.cul === "aam" ? { skin: "as", head: "asiatic", kilt: "tunic", cloth: "#e6d3ac", band: O.col } : O.cul === "lib" ? { skin: "as", head: "long", sash: 1, collar: false } : { kilt: "long" };
  return fig(x, B, { ...base, s, ...(war ? { pose: "spear", shield: O.col } : friend ? { pose: "offer", item: "tray" } : { pose: "staff" }) });
}
function envoySvg() {
  const B = 250, C = P(S), L = aliveClans(S).filter(c => c.id !== me()).sort((a, b) => clanProvs(S, b.id).length - clanProvs(S, a.id).length).slice(0, 10), n = L.length, s = n <= 6 ? 1.3 : n <= 8 ? 1.12 : 0.98, step = Math.min(150, 860 / Math.max(1, n));
  const king = C.t === "král" && C.cul !== "nub";
  let g = G_(985, B, O_.kiosk(0, 0, 100, 112) + O_.dais(-12, 0, 124) + O_.chair(58, -7, -1, 0.9, king) + fig(58, -7, { sit: 1, dir: -1, head: king ? "double" : C.cul === "nub" ? "nub" : "wig", skin: C.cul === "nub" ? "nub" : C.cul === "hyk" ? "as" : "m", pose: "hold", kilt: "long" }), 1, 1.4);
  L.forEach((O, i) => { const x = 930 - (i + 0.5) * step - 20, top = B - 100 * s - 18, r = rel(S, me(), O.id), war = atWar(S, me(), O.id), sel = SEL.dipl === O.id;
    g += `<g class="crt${sel ? " on" : ""}" data-a="dipl" data-x='["${O.id}"]'><rect x="${x - step / 2}" y="20" width="${step}" height="${B - 10}" fill="transparent"/>${envoyFig(O, x, B, s)}
      <text x="${x}" y="${top - 22}" text-anchor="middle" class="ct" style="font-size:${n > 7 ? 12 : 14}px">${esc(O.n.length > 17 ? O.n.slice(0, 16) + "…" : O.n)}</text>
      <rect x="${x - 26}" y="${top - 14}" width="52" height="5" fill="#cbb98f" stroke="${W_.ol}" stroke-width=".5"/><rect x="${r >= 0 ? x : x + r / 100 * 26}" y="${top - 14}" width="${Math.abs(r) / 100 * 26}" height="5" fill="${r >= 0 ? W_.gr : W_.rd}"/><path d="M${x} ${top - 16}v9" stroke="${W_.ol}" stroke-width="1"/>
      <text x="${x}" y="${top + 4}" text-anchor="middle" class="cn2" style="font-size:11.5px">${war ? "válka" : allied(S, me(), O.id) ? "spojenec" : O.vassalOf === me() ? "poddaný" : nPlural(clanProvs(S, O.id).length, "nom", "nomy", "nomů")}</text>
      ${sel ? `<path d="M${x - 34} ${B + 6}H${x + 34}" stroke="${W_.ye}" stroke-width="5"/>` : ""}</g>`; });
  return sceneFrame("courtsvg", 1200, 300, B, g, "Poslové cizích rodů před trůnem");
}
var _tDiplo2 = TAB_FN.diplo;
TAB_FN.diplo = () => `<div class="courtwrap">${envoySvg()}<p class="small muted courthint">${hg("wpwty")} Klepni na posla. Kopí a štít znamenají válku, dary přátelství, hůl klid zbraní; proužek nad hlavou ukazuje vztah.</p>${quoteHtml(["poslove"])}</div><div class="diploart">${_tDiplo2()}</div>`;
TAB_FN.vojsko = tVojskoArt;
ACT.liveToggle = () => { S.opts.live = S.opts.live === false; };
// ================= LETOPIS JAKO DESKA S ROČNÍMI POLI =================
annalsCard = function () {
  const A = (S.annals || []).slice(-40);
  const boxes = A.map((a, i) => { const newKing = i === 0 || A[i - 1].r !== a.r, whole = a.h ? Math.floor(a.h) : 0;
    return `${newKing ? `<div class="akingc"><span>${esc(a.r)}</span></div>` : ""}<div class="abox" title="≈ ${a.y} př. n. l., ${a.ry}. rok vlády"><div class="arn hg" title="${esc(hgTitle("renpet"))}">${HG.renpet}</div><div class="aev"><b>${a.ry}. rok</b> <span class="muted">≈ ${a.y}</span><br>${a.ev.slice(0, 3).map(esc).join("<br>") || "klidný rok"}</div><div class="anile">${a.h ? `<span class="hg" title="${esc(hgTitle("meh"))} ${whole}">${HG.meh}${hgNum(whole)}</span> ${dec(a.h)} loktů` : "výška Nilu nezapsána"} · ${nPlural(a.n, "nom", "nomy", "nomů")}</div></div>`; }).join("");
  return card(`${hg("pan")} Letopis po letech`, (A.length ? `<div class="annals">${boxes}</div>` : '<p class="muted small">První pole přibude na konci roku.</p>') + '<p class="small muted">Tak vedli Egypťané letopisy: Palermská deska (5. dynastie) dělí vlády na roční pole oddělená znakem roku; nahoře jsou hlavní události, dole výška záplavy v loktech, dlaních a prstech. Zde je výška zapsaná celými lokty egyptskými číslovkami a vedle desetinně.</p>', "wide");
};
// citát u hodnostáře a u nilometru
var _courtPanel2 = courtPanel;
const COURT_Q = { vezir: ["vezir", "audience", "soud"], pokladnik: ["remesla", "obecne"], sypky: ["sypky", "hlad", "zaplava"], vojsko: ["vojsko", "valka"], knez: ["knez", "maat", "stavby"], kral: ["audience", "obecne"] };
courtPanel = function (R, sel) { return _courtPanel2(R, sel).replace(/<\/div>$/, quoteHtml(COURT_Q[sel] || ["obecne"], sel.length) + "</div>"); };
var _tHosp3 = TAB_FN.hosp;
TAB_FN.hosp = () => _tHosp3().replace('</svg></div>', '</svg>' + quoteHtml(["zaplava", "sypky"]) + '</div>');
