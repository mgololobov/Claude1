// Strom vědění, zákony s ukazatelem, znamení roku a královská objížďka v paláci.

const CAT_ICON = { "Zemědělství": "grain", "Správa": "urednici", "Stavitelství": "nomy", "Náboženství a učenost": "maat", "Válečnictví": "vojsko", "Řemesla": "deben" };
function ringSvg(f, size = 54, col = "#c9a227") {
  const r = size / 2 - 5, c = 2 * Math.PI * r;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(0,0,0,.1)" stroke-width="6"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="6" stroke-dasharray="${(c * clamp(f, 0, 1)).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})" stroke-linecap="round"/><text x="50%" y="55%" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">${Math.round(clamp(f, 0, 1) * 100)}%</text></svg>`;
}
function techNode(t) {
  const C = P(S), T = TECHS[t], known = !!C.techs[t], cur = C.res.cur === t, av = techAvail(S, me(), t), cost = techCost(S, me(), t);
  const st_ = known ? "known" : cur ? "cur" : av ? "avail" : "locked";
  return `<div class="tnode ${st_}"><div class="tnh"><span class="tni">${ricon(CAT_ICON[T.cat] || "maat", 18)}</span><b>${esc(T.n)}</b></div>
    <div class="small">${esc(T.d)}</div>
    ${TECH_ERA[t] && !known && S.bce > TECH_ERA[t][0] ? `<div class="small bad">od ≈ ${TECH_ERA[t][0]} př. n. l.</div>` : ""}${T.req ? `<div class="treq">${T.req.map(r => `<span class="${C.techs[r] ? "ok" : ""}">${esc(TECHS[r].n)}</span>`).join("")}</div>` : ""}
    <div class="tnf">${known ? '<span class="good">✔ známé</span>' : cur ? `<span>▶ zkoumá se · ${Math.round(C.res.pts)}/${cost}</span>` : `<span class="muted">${cost} bodů</span>${btn("Zkoumat", "research", [t], av ? null : techLock(S, me(), t) || "Nedostupné", "sm")}`}</div></div>`;
}
function tVedeniArt() {
  const C = P(S), cats = [...new Set(TECH_IDS.map(t => TECHS[t].cat))], cur = C.res.cur, cost = cur ? techCost(S, me(), cur) : 1;
  const known = TECH_IDS.filter(t => C.techs[t]).length;
  const head = `<div class="labhead">${ringSvg(cur ? C.res.pts / cost : 0, 84)}<div><div class="small muted">Dům života zkoumá</div><div class="big">${cur ? esc(TECHS[cur].n) : "nic – vyber vědění níže"}</div><div class="small">Známo ${known} z ${TECH_IDS.length} objevů. Body přinášejí rozkaz „Dům života“ a chrámy; co znají sousedé, se učí o třetinu levněji.</div>${meter("Objevy", known, TECH_IDS.length, "#4f8a5b")}</div></div>`;
  return `<div class="grid">${card("Dům života", head, "wide")}${cats.map(cat => { const ids = TECH_IDS.filter(t => TECHS[t].cat === cat), k = ids.filter(t => C.techs[t]).length;
    return card(`${ricon(CAT_ICON[cat] || "maat", 20)} ${esc(cat)} <span class="small muted">${k}/${ids.length}</span>`, `<div class="tlane">${ids.sort((a, b) => (TECHS[a].req ? 1 : 0) - (TECHS[b].req ? 1 : 0) || TECHS[a].cost - TECHS[b].cost).map(techNode).join("")}</div>`, "wide"); }).join("")}</div>`;
}
// ukazatel zákona: tři kameny, svítí zvolená možnost
function lawDial(cur, n = 3) { return `<svg class="ldial" viewBox="0 0 90 26" aria-hidden="true"><path d="M8 13h74" stroke="#8a7a5a" stroke-width="3"/>${[...Array(n)].map((_, i) => `<circle cx="${8 + i * 37}" cy="13" r="${i === cur ? 9 : 6}" fill="${i === cur ? "#c9a227" : "#efe6cf"}" stroke="#2a2420" stroke-width="1.5"/>`).join("")}</svg>`; }
// vrhací hůlky znamení
function omenSvg(d) {
  const st_ = d.sticks || [], col = d.v >= 4 ? "#4f8a5b" : d.v === 3 ? "#c9a227" : "#b5452c";
  return `<svg class="omen" viewBox="0 0 320 90" role="img" aria-label="Vrhací hůlky: výsledek ${d.v}"><rect width="320" height="90" rx="6" fill="#ecd9a8"/>${st_.map((x, i) => `<g transform="translate(${60 + i * 44} 14) rotate(${(i - 1.5) * 8})"><rect width="18" height="62" rx="8" fill="${x ? "#efe6cf" : "#6d4a1f"}" stroke="#2a2420" stroke-width="1.5"/>${x ? "" : '<path d="M5 12h8M5 31h8M5 50h8" stroke="#efe6cf" stroke-width="1.5"/>'}</g>`).join("")}<circle cx="270" cy="45" r="22" fill="${col}"/><text x="270" y="52" text-anchor="middle" font-size="20" font-weight="bold" fill="#fff">${d.v}</text></svg>`;
}
function palaceExtra() {
  const C = P(S); if (C.type === "kmen") return "";
  const L = leaderOf(S, me()), wait = (C.last.tour ?? -99) > S.turn - 12 ? C.last.tour + 12 - S.turn : 0, n = Math.min(5, myProvs().length - 1);
  const om = S.omen ? OMEN[S.omen] : null;
  return `<div class="grid">${card("Znamení roku", om ? `<div class="omenbox ${om[1]}"><span class="omv">${S.omen}</span><div><b>${esc(om[0])}</b><div class="small muted">${om[1] === "good" ? "Bohové jsou letos nakloněni; víc příznivých událostí." : om[1] === "bad" ? "Nepříznivý rok: víc nehod a požárů." : "Ani hojnost, ani pohroma."}</div></div></div>` : '<p class="small muted">Kněží vyloží znamení na Nový rok (1. měsíc období achet).</p>')}
  ${card("Královská objížďka", `<p class="small">Panovník objede ${n} nejméně spokojených nomů: spokojenost +8, úředníci v nich +4. Na cestě se může stát cokoli – spravedlivý soud, odhalený zloděj, nemoc. Stojí ${fmt(250 * n)} debenů a ${fmt(1500 * n)} charů.</p>${btn(wait ? `Další objížďka za ${wait} měs.` : `Vyrazit na objížďku${L ? " s " + esc(L.n.split(",")[0]) : ""}`, "tour", [], wait ? "Jednou za rok" : null, "go")}`)}</div>`;
}
ACT.tour = () => royalTour(S, me());
TAB_FN.vedeni = tVedeniArt;
var _tPrehled0 = TAB_FN.prehled;
TAB_FN.prehled = () => palaceExtra() + _tPrehled0();
