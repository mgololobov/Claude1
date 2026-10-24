// ---------- vzhled komponent ----------
const CARD_FONTS = { "": "Výchozí", read: "Čitelné bezpatkové", cinzel: "Historické (Cinzel)", hand: "Ručně psané", mono: "Technické / sci-fi" };
const CARD_FONT_CSS = { read: "'Atkinson Hyperlegible', system-ui, sans-serif", cinzel: "'Cinzel', Georgia, serif", hand: "'Patrick Hand', 'Comic Sans MS', cursive", mono: "'Chivo Mono', ui-monospace, monospace" };
const CARD_TEMPLATES = { classic: "Klasická", art: "Velký obrázek nahoře", full: "Obrázek přes celou kartu", play: "Hrací karta s rohy", min: "Minimalistická" };
// {Zdroj} v textu karty se vykreslí jako ikona zdroje.
function richText(text) {
  const p = typeof P === "function" ? P() : null;
  return esc(text).replace(/\{([^{}]{1,30})\}/g, (m0, name) => { const r = p && resByName(p, name); if (!r) return m0; return `<span class="ri" style="background:${r.color};color:${inkFor(r.color)}" title="${esc(r.name)}">${esc(r.icon || r.name.slice(0, 1))}</span>`; });
}
function cardHTML(card, deck, faceUp = true) {
  const font = CARD_FONT_CSS[deck.font || ""]; const st = `--c:${deck.color}${font ? `;--cf:${font}` : ""}`;
  if (!faceUp) return deck.backImg ? `<div class="pcard back img" style="${st};background-image:url('${esc(deck.backImg)}')"></div>` : `<div class="pcard back" style="${st}"><div class="bk">${esc(deck.back || deck.name)}</div></div>`;
  const pj = typeof P === "function" ? P() : null; const tIcon = pj && pj.typeIcons && card.type ? pj.typeIcons[card.type] : "";
  const tpl = CARD_TEMPLATES[deck.template] ? deck.template : "classic";
  const cost = card.cost !== "" && card.cost != null ? `<span class="cost">${richText(card.cost)}</span>` : "";
  const hd = `<div class="hd"><span class="tt">${esc(card.title) || "&nbsp;"}</span>${cost}</div>`;
  const ty = card.type ? `<div class="ty">${tIcon ? `<span class="tyi">${esc(tIcon)}</span> ` : ""}${esc(card.type)}</div>` : "";
  const art = card.img ? `<div class="art" style="background-image:url('${esc(card.img)}')"></div>` : "";
  const ph = art || `<div class="art">${esc(card.icon || "")}</div>`;
  const ic = card.icon ? `<div class="ic">${esc(card.icon)}</div>` : "";
  const tx = `<div class="tx">${richText(card.text || "")}</div>`;
  const hasVp = card.vp !== "" && card.vp != null;
  const ft = card.suit || card.value || hasVp ? `<div class="ft"><span>${esc(card.value || "")}${esc(card.suit || "")}</span><span>${hasVp ? "★" + esc(card.vp) : ""}</span></div>` : "";
  let inner;
  if (tpl === "art") inner = hd + ph + ty + tx + ft;
  else if (tpl === "full") inner = ph + hd + ty + tx + ft;
  else if (tpl === "play") { const idx = `${esc(card.value || "")}<br>${esc(card.suit || "")}`; inner = `<div class="cn tl">${idx}</div><div class="cn br">${idx}</div><div class="pc-center">${art || `<span>${esc(card.icon || card.suit || "")}</span>`}</div><div class="pc-title">${esc(card.title)}</div>${card.text ? tx : ""}`; }
  else if (tpl === "min") inner = hd + (art || ic) + tx + ft;
  else inner = hd + ty + art + ic + tx + ft;
  const rar = card.rarity && RARITIES[card.rarity] ? `<span class="rar r-${card.rarity}" title="${RARITIES[card.rarity]}"></span>` : "";
  return `<div class="pcard t-${tpl}${deck.frame ? " fr-" + deck.frame : ""}" style="${st}">${inner}${rar}${card.locked ? `<span class="lk">🔒</span>` : ""}</div>`;
}
const MEEPLE = c => `<svg viewBox="0 0 46 54" aria-hidden="true"><path fill="${c}" stroke="rgba(255,255,255,.6)" stroke-width="1.5" d="M23 2c5 0 8 3.6 8 8 0 2.6-1 4.6-2.6 6 5.8 1.2 15.6 4.4 15.6 9.6 0 3-3.4 3.6-7.6 3.4L42 50c.4 1.6-.6 2.4-2 2.4H29.4L23 41l-6.4 11.4H6c-1.4 0-2.4-.8-2-2.4l5.6-21C5.4 29.2 2 28.6 2 25.6 2 20.4 11.8 17.2 17.6 16 16 14.6 15 12.6 15 10c0-4.4 3-8 8-8z"/></svg>`;
function tokenHTML(t, value) {
  if (t.shape === "figurka") return `<div class="token figurka">${MEEPLE(t.color)}</div>`;
  const ink = inkFor(t.color);
  return `<div class="token ${t.shape}" style="background:${t.color};color:${ink}">${t.text ? `<span class="tt">${esc(t.text)}</span>` : ""}${t.counter ? `<span>${value ?? 0}</span>` : ""}</div>`;
}
function natoSymbol(u, ink) {
  const st = `stroke="${ink}" stroke-width="1.6" fill="none"`;
  const box = `<rect x="1" y="1" width="28" height="18" fill="rgba(255,255,255,.18)" ${st}/>`;
  const X = `<path d="M1 1 L29 19 M29 1 L1 19" ${st}/>`;
  const sym = {
    pechota: X,
    tanky: `<ellipse cx="15" cy="10" rx="9" ry="5" ${st}/>`,
    mech: X + `<ellipse cx="15" cy="10" rx="9" ry="5" ${st}/>`,
    delo: `<circle cx="15" cy="10" r="3.2" fill="${ink}"/>`,
    jezdectvo: `<path d="M1 19 L29 1" ${st}/>`,
    vysadek: X + `<path d="M9 17 Q12 13 15 17 Q18 13 21 17" ${st}/>`,
    zasobovani: `<path d="M1 14 H29" ${st}/>`,
    stab: `<text x="15" y="14" font-size="10" font-weight="700" text-anchor="middle" fill="${ink}" font-family="sans-serif">HQ</text>`,
    text: `<text x="15" y="14.5" font-size="11" font-weight="700" text-anchor="middle" fill="${ink}" font-family="sans-serif">${esc((u.symText || "").slice(0, 4))}</text>`,
    zadny: "",
  }[u.symbol] ?? X;
  return `<svg viewBox="0 0 30 20" aria-hidden="true">${box}${sym}</svg>`;
}
function unitVals(u, reduced) {
  const a = reduced ? u.rAtt : u.att, d = reduced ? u.rDef : u.def, m = reduced ? u.rMov : u.mov;
  return [a, d, m].map(v => (v === "" || v == null) ? "–" : v).join("-");
}
const hasReduced = u => !!u && [u.rAtt, u.rDef, u.rMov].some(v => v !== "" && v != null);
function unitHTML(p, u, reduced = false) {
  const f = p.factions.find(x => x.id === u.factionId); const col = f ? f.color : "#888"; const ink = inkFor(col);
  return `<div class="unit ${reduced ? "red" : ""}${u.big ? " big" : ""}${u.hq ? " hq" : ""}" style="background:${col};color:${ink}" title="${esc(u.name)}">
    <span class="nm">${esc(u.name)}</span>${u.note ? `<span class="note">${esc(u.note.slice(0, 3))}</span>` : ""}
    <span class="sym"><span class="sz">${esc(u.size || "")}</span>${natoSymbol(u, ink)}</span>
    <span class="vals">${esc(unitVals(u, reduced))}</span></div>`;
}
