// Hieroglyfy v rozhraní: číslovky a datum, kartuše králů, jména měst, znaky u záložek.
// Zápisy pocházejí ze slovníku v 12-lookb.js (tools/gen_hg.py); sem se nepíší žádné znaky ručně.

// egyptské číslovky jsou sčítací: tisíce (lotos), stovky (stočený provaz), desítky (pouto), jednotky (čárky)
function hgNum(n) {
  n = Math.round(n); if (!(n > 0) || n > 9999) return "";
  let s = ""; for (const b of [1000, 100, 10, 1]) { const d = Math.floor(n / b) % 10; if (d) s += String.fromCodePoint(HG_NUM[b] + d - 1); }
  return s;
}
// datum podle egyptské formule: ḥsbt (rok vlády) N, ꜣbd (měsíc) M období; den hra nesleduje
const HG_SEASON = ["achet", "peret", "shemu"];
function hgDate() {
  const y = regYear(S, me()), m = (S.month % 4) + 1, si = Math.floor(S.month / 4), tr = ["ꜣḫt", "prt", "šmw"][si];
  return `<span class="hg hgdate" title="ḥsbt ${y} ꜣbd ${m} ${tr} – rok vlády ${y}, ${m}. měsíc období ${SEASONS[si]} (egyptská formule data; den hra nesleduje)">${HG.hesbet}${hgNum(y)} ${HG.abed}${hgNum(m)} ${HG[HG_SEASON[si]]}</span>`;
}
// jména měst, jejichž zápis je dobře doložen
const HG_PROV = { u4: "waset", l1: "mennefer", u8: "abdzu", l13: "iunu", u1: "abu", u6: "iunet" };
// kartuše patří jen královským jménům; hieroglyfy dostanou jen jména s doloženým zápisem
const HG_KING = [["Montuhotep II", "k_nebhepetre"], ["Montuhotep", "k_montuhotep"], ["Intef", "k_intef"], ["Cheti", "k_cheti"], ["Neferkare", "k_neferkare"], ["Merikare", "k_merikare"], ["Sekenenre", "k_sekenenre"], ["Kamose", "k_kamose"], ["Ahmose", "k_ahmose"], ["Apopi", "k_apopi"], ["Džehuti", "k_dzehuti"], ["Senebkaj", "k_senebkaj"]];
function kingHg(L) { if (!L) return ""; const e = HG_KING.find(([n]) => L.n === n || L.n.startsWith(n + " ") || L.n.startsWith(n + ",")); return e ? e[1] : ""; }
function cartouche(L) { const k = kingHg(L); return k ? `<span class="cart hg" title="${esc(hgTitle(k))} (jméno v kartuši)">${HG[k]}</span>` : ""; }
rulerLine = function (C, L) {
  if (!L) return "—";
  const king = C.t === "král" && C.cul !== "nub";
  if (!king) return `${C.cul === "hyk" ? hg("heka") + " " : ""}${esc(cap(C.t))} ${esc(L.n)}`;
  return `${hg("nswbjtj")} ${cartouche(L)} <b class="kname">${esc(L.n)}</b> ${hg("djanch")}`;
};
var _renderTop2 = renderTop;
renderTop = function () { return _renderTop2().replace('<div class="sd">', `<div class="sd">${hgDate()} · `); };
// záložky: znak s významem místo obecné ikony
const TAB_HG = { mapa: "ta", plan: "tjaty", zupy: "sepaut", zakony: "hep", vojsko: "aha", kronika: "medzat", hra: "men" };
var _renderTabs2 = renderTabs;
renderTabs = function () { return _renderTabs2().replace(/(<button class="[^"]*"[^>]*data-x='\["(\w+)"\]'>)<svg class="ico"[^>]*>.*?<\/svg>/g, (m, pre, k) => TAB_HG[k] ? `${pre}<span class="hg tabhg" title="${esc(hgTitle(TAB_HG[k]))}">${HG[TAB_HG[k]]}</span>` : m); };
// úvodní obrazovka: nb tꜣwj – „Pán Obou zemí“
var _startHtml2 = startHtml;
startHtml = function () { return _startHtml2().replace(`<div class="hg">${HG.kemet}</div>`, `<div class="hg" title="${esc(hgTitle("pan"))}">${HG.pan}</div>`); };
var _rulerBox2 = rulerBox;
rulerBox = function () { const C = P(S), L = ruler(), ct = C.t === "král" && C.cul !== "nub" ? cartouche(L) : ""; return _rulerBox2().replace('<div class="rbn">', `<div class="rbn">${ct}`).replace('<div class="rbm"', `<div class="rbd">${hgDate()}</div><div class="rbm"`); };
Object.assign(SCEN_ART, { fip: "bitva_eg", ahm: "bitva_as" });
// nadpisy karet dostanou egyptské slovo, které k nim patří
const CARD_HG = [[/^Maat/, "maat"], [/Hrobka/, "is"], [/Velké stavby/, "menu"], [/Dům života/, "perankh"], [/Královská rada/, "tjaty"], [/^Dvůr/, "peraa"], [/Sýpky|Obilí/, "shenut"], [/Poklad|Příjmy|Rozpočet/, "perhedz"], [/^Vojsk|Posádky/, "mesha"], [/Zákon/, "hep"], [/Nil|Záplav/, "hapi"], [/Kněž|Chrám/, "hutnecer"], [/Písař/, "sesh"]];
function cardHg(title) { if (typeof title === "string" && !title.includes('class="hg"')) { const plain = title.replace(/<[^>]*>/g, "").trim(), e = CARD_HG.find(([re]) => re.test(plain)); if (e && HG[e[1]]) return `${hg(e[1])} ${title.replace(/^<span class="hgi"[^>]*>[^<]*<\/span>\s*/, "")}`; } return title; }
