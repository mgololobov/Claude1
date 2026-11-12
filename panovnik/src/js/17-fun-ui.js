// Rozhraní herních nápadů: činy panovníka, velká díla, zakázky, ambice vazalů, mor a roční období na mapě.

function deedsCard() {
  const left = deedsLeft(S);
  return card(`Činy panovníka ${left ? '<span class="pill good">1 čin tento měsíc</span>' : '<span class="pill">už jednal – příští měsíc</span>'}`, `<div class="deeds">${Object.entries(DEEDS).map(([k, D]) => `<div class="deed${left ? "" : " used"}">${scene(D.art, 320, 90)}<div class="dd"><b>${D.n}</b><div class="small">${D.d}</div><div class="row"><span class="small muted">${D.cost ? D.cost + " zl" : "zdarma"}</span><span class="sp"></span>${btn("Vykonat", "deed", [k], left && P(S).gold >= D.cost ? null : left ? "Málo zlata" : "Už jednal", "go")}</div></div></div>`).join("")}</div>`, "wide");
}
function worksCard() {
  const C = P(S), ws = C.works || {}, myP = clanProvs(S, me()).filter(p => !p.occ);
  return card("Velká díla", `<div class="works">${Object.entries(WORKS).map(([wid, W]) => { const w = ws[wid], ok = myP.filter(p => W.ok(S, me(), p));
    const state = w ? (w.done ? `<b class="good">✔ stojí v kraji ${esc(S.provs[w.pid].n)}</b>` : `${meter("Stavba", W.months - w.left, W.months, "#b08a2e")}<span class="small muted">${esc(S.provs[w.pid].n)} · splátka ${w.pay} zl/měs.${C.gold < w.pay ? " – <b class='bad'>stojí, chybí zlato</b>" : ""}</span>`) :
      ok.length ? `<div class="row">${sel("wk_" + wid, ok.map(p => [p.id, p.n]), ok[0].id)}${btn(`Zahájit (${Math.round(W.cost / 3)} zl)`, "work", [wid], C.gold >= W.cost / 3 ? null : "Málo zlata", "go")}</div>` : `<span class="small muted">Podmínka: ${W.req}.</span>`;
    return `<div class="work${w && w.done ? " done" : ""}">${scene(W.art, 320, 90)}<div class="dd"><b>${W.n}</b> <span class="small muted">${fmt(W.cost)} zl · ${W.months} měs.</span><div class="small">${W.d}</div>${state}</div></div>`; }).join("")}</div><p class="small muted">Dílo se platí třetinou předem a zbytek v měsíčních splátkách. Když chybí zlato, stavba stojí.</p>`, "wide");
}
function contractsCard() {
  const ks = S.contracts || [], C = P(S);
  return card("Kupecké zakázky", ks.length ? `<div class="contracts">${ks.map(k => { const key = k.g === "obili" ? "grain" : k.g, have = Math.floor(C[key] || 0);
    return `<div class="contract${k.accepted ? " acc" : ""}"><b>${esc(k.from)}</b><div>${fmt(k.qty)} × ${GOODS[k.g].n.toLowerCase()} → <b>${fmt(k.reward)} zl</b></div><div class="small muted">lhůta ${k.until - S.turn} měs. · máš ${fmt(have)}</div>${meter("", Math.min(have, k.qty), k.qty, have >= k.qty ? "var(--good)" : "#b08a2e")}<div class="row">${k.accepted ? btn("Dodat", "deliver", [k.id], have >= k.qty ? null : "Málo zboží", "go") : btn("Přijmout", "accept", [k.id])}</div></div>`; }).join("")}</div><p class="small muted">Přijatou zakázku musíš dodat včas, jinak ztratíš prestiž. Zboží dokoupíš na trhu nebo vyrobíš (hřebčíny, doly, žně).</p>` : '<p class="muted small">Momentálně žádní kupci nenabízejí obchod. Zkus to za pár měsíců.</p>');
}
function ambBadges(c) {
  const b = [];
  if (c.amb) b.push(`<span class="pill warn" title="${esc(AMBITIONS[c.amb.t])}">přání</span>`);
  if (c.feud && chr(S, c.feud)) b.push(`<span class="pill bad" title="spor s ${esc(chr(S, c.feud).n)}">spor</span>`);
  return b.length ? `<div>${b.join("")}</div>` : "";
}
function ambDetail(c) {
  let h = "";
  if (c.amb) { const left = 12 - (S.turn - c.amb.since); h += `<div class="alert warn"><b>Přání:</b> ${esc(c.n.split(" ")[0])} ${AMBITIONS[c.amb.t]} (zbývá ${left} měs.). ${c.amb.t === "dar" ? `Zatím dostal ${c.amb.gifts} zl.` : c.amb.t === "leno" ? "Jmenuj ho purkrabím." : c.amb.t === "urad" ? "Dej mu úřad (Dvůr a úřady)." : "Povyš ho, až bude mít zásluhy."} Splněné přání: věrnost +15, zklamání: −12.</div>`; }
  if (c.feud && chr(S, c.feud)) h += `<div class="alert bad"><b>Spor</b> s ${esc(chr(S, c.feud).n)}. Urovná ho Soudní den nebo hostina, jinak skončí soubojem.</div>`;
  return h;
}
function seasonOverlay() {
  const m = S.month;
  // zima: mapa zbělá a zmodrá (bez padajícího sněhu); krutá zima je bělejší
  const hard = (S.weather || {}).t === "zima";
  if ([11, 0, 1].includes(m) || hard) return `<rect width="${MW}" height="${MH}" fill="#eef3f8" opacity="${hard ? 0.46 : 0.32}" pointer-events="none"/><rect width="${MW}" height="${MH}" fill="#5f84ad" opacity="${hard ? 0.12 : 0.08}" pointer-events="none" style="mix-blend-mode:multiply"/>`;
  if ([9, 10].includes(m)) return `<rect width="${MW}" height="${MH}" fill="#c8741a" opacity=".08" pointer-events="none"/>`;
  if ([5, 6, 7].includes(m)) return `<rect width="${MW}" height="${MH}" fill="#f6e08a" opacity=".06" pointer-events="none"/>`;
  return "";
}
function plagueIcons(z) {
  const k = Math.max(0.6, z);
  return Object.values(S.provs).filter(p => p.plague).map(p => `<g transform="translate(${(MX(p.lon) + 7 * k).toFixed(1)} ${(MY(p.lat) - 9 * k).toFixed(1)}) scale(${k.toFixed(2)})" class="plague"><title>Mor v kraji ${esc(p.n)}</title><circle r="6" fill="#2b3a1a" opacity=".85"/><path d="M-3 -1 a3 3 0 1 1 6 0 v2 h-6z M-2 3 h4" fill="#d8e0b0"/></g>`).join("");
}
Object.assign(ACT, {
  deed: k => doDeed(S, k), work: wid => startWork(S, me(), wid, $("#wk_" + wid).value), accept: id => acceptContract(S, id), deliver: id => deliverContract(S, id), quar: pid => quarantine(S, me(), pid),
});
