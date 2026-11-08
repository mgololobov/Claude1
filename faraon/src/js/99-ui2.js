// Rozhraní nových mechanik: rody úředníků, cíle soupeřů, zvědové, trh v čase, svátky, osobní bitvy, nájezdy kmenů.
// Navíc přístupnost (klávesnice, čtečky obrazovky), dotykové ovládání mapy a šetrnější vykreslování.

function rodsHtml() {
  if (P(S).type === "kmen") return "";
  const R = rodsOf(S, me()), C = P(S), law = lw(S, me(), "nomarchove");
  const rows = R.map(r => tr([`${esc(r.n)}${C.rodPriv && C.rodPriv[r.n] ? ' <span title="potvrzená dědičná práva">✦</span>' : ""}`, r.m.length, r.provs.map(id => esc(S.provs[id].n)).join(", ") || "–", r.offs.map(k => esc((OFFICES[k] || { n: k }).n)).join(", ") || "–", r.loy, r.pow]));
  return `<div class="grid">${card("Rody úředníků", `<p class="small muted">Úředníci patří k rodům; po smrti otce může úřad i správu nomu zdědit syn. Šance na dědění podle zákona o nomarších: ${["dědičné úřady – téměř vždy", "jmenování panovníkem – asi v polovině případů", "omezení moci – jen výjimečně"][law]}. Silné rody se přou mezi sebou a příliš mocný rod se chová jako malý král – tak tomu bylo u nomarchů v Beni Hasanu, Asjútu či Dér el-Berše.</p>${tbl(["Rod (předek)", "#Členů", "Nomy", "Úřady", "#Věrnost", "#Síla"], rows)}`)}</div>`;
}
function goalsHtml() {
  const rows = aliveClans(S).filter(c => c.id !== me() && c.type !== "kmen").map(O => [O, goalProgress(S, O.id)]).filter(([, g]) => g).sort((a, b) => b[1].pct - a[1].pct);
  const mine = goalProgress(S, me());
  const list = rows.map(([O, g]) => `<div class="goal">${emblem(O.id, 14)} <b>${esc(O.n)}</b>: ${esc(g.t)}${g.unify ? ` <span class="small ${g.core >= Math.ceil(g.coreN * 0.6) ? "bad" : "muted"}">(drží ${g.core}/${g.coreN} nomů jádra; při 4/5 sjednotí Egypt a ty prohraješ)</span>` : ""}${meter("", g.pct, 100, O.col)}</div>`).join("");
  return card("Cíle soupeřů", `${mine ? `<p class="small">Tvůj cíl: <b>${esc(mine.t)}</b> – splněno asi z ${mine.pct} %.</p>` : ""}${list || '<p class="muted small">Žádný soupeř nemá vlastní cíl.</p>'}<p class="small muted">Soupeři táhnou přednostně proti tomu, kdo jim stojí v cestě. Cíle vycházejí z toho, oč historicky usilovali; zda by toho dosáhli, je samozřejmě otevřené.</p>`);
}
function spyHtml() {
  const C = P(S), net = S.spynet || {}, others = aliveClans(S).filter(c => c.id !== me() && !net[c.id]);
  const rows = Object.entries(net).map(([t, n]) => tr([`${emblem(t, 14)} ${esc(S.clans[t].n)}`, esc(SPY_KIND[n.kind].n), n.cost ? fmt(n.cost) + "/měs." : "zdarma", (S.turn - n.since) + " měs." + (n.until ? `, ještě ${n.until - S.turn}` : ""), btn("Stáhnout", "unspy", [t])]));
  const fd = 0.05 + (hasTech(S, me(), "hlidky") ? 0.04 : 0) + (C.medjay ? 0.03 : 0) + Object.keys(net).length * 0.01 + (C.offices && C.offices.vezir ? 0.02 : 0);
  const kinds = Object.entries(SPY_KIND).filter(([k]) => k !== "dvojity" && (k !== "medzaj" || canMedzajSpy(S, me())));
  const reps = spyReports(S);
  return card("Výzvědná síť", `<p class="small muted">Stálí zvědové – kupci a lodníci, u Théb i médžajští stopaři z pouště – hlásí stav nomů sledovaného rodu, pohyby jeho vojsk a dávají tvým velitelům v bitvě s ním malou výhodu. Kamose podle své stély zajal na pouštní cestě oázami posla hyksóského krále Apopiho s dopisem pro vládce Kuše.</p>
    ${tbl(["Sledovaný rod", "Zvědové", "Náklady", "Doba", ""], rows)}
    ${others.length ? `<div class="row">${sel("spyT", others.map(c => [c.id, c.n]), SEL.spyT || others[0].id, 'data-a="spySel"')} ${sel("spyK", kinds.map(([k, x]) => [k, `${x.n} (${x.start} + ${x.cost}/měs.)`]), SEL.spyK || kinds[0][0], 'data-a="spyKind"')} ${btn("Vyslat zvědy", "spy", [], null, "go")}</div>` : ""}
    <p class="small">Odhalování cizích zvědů: asi ${Math.round(fd * 100)} % měsíčně na každého (pomáhají pouštní hlídky, Médžajové, vezír a vlastní síť).</p>${reps.length ? `<ul class="small">${reps.map(r => `<li>${esc(r)}</li>`).join("")}</ul>` : ""}`);
}
function serveHtml() {
  const C = P(S); if (C.type !== "kmen") return "";
  const opts = aliveClans(S).filter(c => c.type !== "kmen" && c.id !== me());
  return card("Služba u Egypťanů", `<p class="small muted">Médžajové sloužili egyptským králům jako zvědové a lučištníci (Kamose je vedl proti Hyksósům, v Nové říši se z nich stala stráž pohřebišť). Služba vynáší debeny a obilí, dokud s pánem nebojuješ.</p>
    <p>${C.serve && S.clans[C.serve] ? `Tvoji bojovníci slouží rodu <b>${esc(S.clans[C.serve].n)}</b>. ${btn("Ukončit službu", "serve", [""])}` : "Tvoji bojovníci nikomu neslouží."}</p>
    ${opts.length ? `<div class="row">${sel("servT", opts.map(c => [c.id, `${c.n} (vztah ${Math.round(rel(S, me(), c.id))})`]), SEL.servT || opts[0].id, 'data-a="servSel"')} ${btn("Nabídnout službu", "serve", [null], null, "go")}</div>` : ""}`);
}
function marketHtml() {
  const M = S.market, H = (M.hist || []).slice(-60), n = H.length;
  const chart = n >= 2 ? lineChart([{ name: "obilí", col: "#c9a227", bold: true, vals: H }], H.map((_, i) => i === n - 1 ? "nyní" : `−${n - 1 - i} m.`), 560, 170) : '<p class="muted small">Graf se zaplní, jak poběží měsíce.</p>';
  const lo = n ? Math.min(...H) : M.p, hi = n ? Math.max(...H) : M.p;
  return `<div class="grid">${card("Cena obilí v čase", `${chart}<p class="small">Teď <b>${dec(M.p)} debenu za char</b>; za posledních ${n} měsíců od ${dec(lo)} do ${dec(hi)}. Nejlevnější je obilí po sklizni, nejdražší těsně před ní; po hladových letech zdraží, po nízké záplavě vyletí. Velké nákupy cenu zvednou, velké prodeje srazí – kdo nakoupí levně a prodá v nouzi, zbohatne (ale lid si všimne, kdo prodával, když se hladovělo).</p>
    <p class="small muted">Ceny v debenech mědi známe hlavně z Nové říše (osada Dér el-Medína): char obilí stál obvykle 1–2 debeny a ke konci 20. dynastie několikanásobně podražil. Pro starší dobu jde o odhad.</p>`)}</div>`;
}
function festHtml() {
  const rows = FESTIVALS.map(f => { const p = S.provs[f.pid]; return tr([esc(f.n), provLink(p), esc(monthName(f.m)), `${emblem(p.owner, 12)} ${esc(S.clans[p.owner].n)}`, `<span class="small">${esc(f.d)}</span>`]); });
  return `<div class="grid">${card("Kalendář místních svátků", `<p class="small muted">Když svátek připadne na tvůj nom, rozhodneš, jak ho vystrojíš. Svátky v cizích nomech posilují věrnost jejich pánům.</p>${tbl(["Svátek", "Nom", "Měsíc", "Pán nomu", "Doklady"], rows)}`)}</div>`;
}
function liveHtml() {
  const on = S.opts.live !== false, last = S.battles.find(b => b.live && (b.a === me() || b.b === me()));
  const ords = Object.entries(BORDERS).filter(([k]) => k !== "ustup").map(([k, o]) => `<li><b>${esc(o.n)}</b> – ${esc(o.d)}</li>`).join("");
  return `<div class="grid">${card("Osobní velení v bitvách", `<label><input type="checkbox" data-a="liveToggle" ${on ? "checked" : ""}> vést větší bitvy osobně, kolo po kole</label>
    <p class="small muted">Při střetu nad 800 mužů se otevře bojiště a v každém kole dáš rozkaz. Rozkazy se přebíjejí: </p><ul class="small">${ords}</ul>
    ${last ? `<p class="small">Poslední osobně vedená bitva: ${esc(S.provs[last.place].n)}, ${last.win === (last.a === me() ? "A" : "D") ? "vítězství" : "porážka"} po ${last.rounds.length} kolech.</p>` : ""}`)}</div>`;
}
function raidHtml(p) {
  const C = P(S); if (C.type !== "kmen" || p.owner !== me()) return "";
  const ts = p.nb.map(n => S.provs[n]).filter(q => q.owner !== me() && !friendly(S, me(), q.owner));
  if (!ts.length) return "";
  const wait = (C.last.raid || -9) > S.turn - 3 ? `Bojovníci odpočívají ještě ${C.last.raid + 3 - S.turn} měs.` : null;
  return `<h4>Nájezd</h4><div class="row">${sel("rt_" + p.id, ts.map(q => [q.id, `${q.n} – ${S.clans[q.owner].n}${knows(S, q) ? `, posádka ${fmtK(men(q.troops))}` : ""}`]), SEL["rt_" + p.id] || ts[0].id, `data-a="raidSel" data-x='["${p.id}"]'`)} ${btn("Vyrazit na nájezd", "raid", [p.id], wait, "danger")}</div><p class="small muted">Do nájezdu vyrazí asi polovina bojovníků. Kořist: debeny a obilí; vztahy s napadeným klesnou.</p>`;
}

// ---------- akce ----------
ACT.liveToggle = () => { S.opts.live = S.opts.live === false; };
ACT.spySel = v => { SEL.spyT = v; };
ACT.spyKind = v => { SEL.spyK = v; };
ACT.spy = () => { const t = SEL.spyT || (document.getElementById("spyT") || {}).value, k = SEL.spyK || (document.getElementById("spyK") || {}).value; return plantSpies(S, me(), t, k); };
ACT.unspy = t => recallSpies(S, t);
ACT.servSel = v => { SEL.servT = v; };
ACT.serve = o => { if (o === "") { P(S).serve = null; return "Služba skončila."; } return serveClan(S, SEL.servT || (document.getElementById("servT") || {}).value); };
ACT.raidSel = (pid, v) => { SEL["rt_" + pid] = v; };
ACT.raid = pid => playerRaid(S, pid, SEL["rt_" + pid] || (document.getElementById("rt_" + pid) || {}).value);

// panel nomu doplní nájezd pro kmeny
var _provPanel0 = provPanel;
provPanel = function (p) { return _provPanel0(p) + raidHtml(p); };

// ---------- přístupnost ----------
var A11Y_TURN = -1;
function a11yPass() {
  for (const el of document.querySelectorAll("[data-a]:not(button):not(select):not(input):not(a):not(label)")) {
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
    if (!el.hasAttribute("role")) el.setAttribute("role", "button");
    if (el.dataset.pid && !el.hasAttribute("aria-label")) { const p = S.provs[el.dataset.pid]; if (p) el.setAttribute("aria-label", `${p.n}, ${S.clans[p.owner].n}${p.siege ? ", obléhán" : ""}`); }
  }
  for (const el of document.querySelectorAll("a[data-a]:not([href])")) el.setAttribute("tabindex", "0");
  const live = document.getElementById("live");
  if (live && A11Y_TURN !== S.turn) { A11Y_TURN = S.turn; const L = S.log[0]; live.textContent = `${dateStr(S)}.${L ? " " + (L.txt || "") : ""}`; }
  const m = document.getElementById("modal");
  if (m && !m.classList.contains("hidden") && !m.contains(document.activeElement)) { const b = m.querySelector("button"); if (b) b.focus({ preventScroll: true }); }
}
function keyNav(ev) {
  const t = ev.target, typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT");
  if ((ev.key === "Enter" || ev.key === " ") && t && t.dataset && t.dataset.a && !["BUTTON", "SELECT", "INPUT", "TEXTAREA", "LABEL"].includes(t.tagName)) { ev.preventDefault(); handle(t, ev); return; }
  if (typing || ev.ctrlKey || ev.metaKey || ev.altKey) return;
  if (ev.key === "Escape") { if (SEL.prov && ACT.closeProv) { ACT.closeProv(); render(); } return; }
  if (S.events.length) return;
  const k = ev.key;
  if (k === "n" || k === "N") { ev.preventDefault(); const r = ACT.end(); if (typeof r === "string") toast(r); render(); return; }
  if (/^[0-9]$/.test(k)) { const i = k === "0" ? 9 : +k - 1; if (TABS[i]) { SEL.tab = TABS[i][0]; render(); const f = document.querySelector("#tabs .on, #tabs [aria-current]"); if (f) f.focus(); } return; }
  if (SEL.tab === "mapa" && (k === "+" || k === "-")) { const v = mapVB(), f = k === "+" ? 1 / 1.25 : 1.25, cx = v[0] + v[2] / 2, cy = v[1] + v[3] / 2, nw = clamp(v[2] * f, MW * 0.12, MW * 1.6); v[2] = nw; v[3] = nw * MH / MW; v[0] = cx - nw / 2; v[1] = cy - v[3] / 2; clampVB(); render(); }
  if (k === "?") toast("Klávesy: N – konec měsíce, 1–9 a 0 – záložky, + a − – přiblížení mapy, Esc – zavřít panel, Tab a Enter – ovládání bez myši.");
}
// dotyk: přiblížení dvěma prsty
function initPinch() {
  const svg = document.getElementById("mapsvg"); if (!svg || svg._pinch) return; svg._pinch = true;
  const pts = new Map(); let d0 = 0, w0 = 0;
  svg.addEventListener("pointerdown", e => { if (e.pointerType !== "touch") return; pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 2) { const [a, b] = [...pts.values()]; d0 = Math.hypot(a[0] - b[0], a[1] - b[1]); w0 = mapVB()[2]; } });
  svg.addEventListener("pointermove", e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 2 && d0 > 0) { const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), v = mapVB(), cx = v[0] + v[2] / 2, cy = v[1] + v[3] / 2, nw = clamp(w0 * d0 / Math.max(20, d), MW * 0.12, MW * 1.6); v[2] = nw; v[3] = nw * MH / MW; v[0] = cx - nw / 2; v[1] = cy - v[3] / 2; clampVB(); applyVB(); if (typeof MAPDRAG === "object") { MAPDRAG.on = false; MAPDRAG.until = Date.now() + 300; } } });
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) d0 = 0; };
  svg.addEventListener("pointerup", up); svg.addEventListener("pointercancel", up);
  svg.style.touchAction = "none";
}

// ---------- šetrnější vykreslování ----------
// mapa se překreslí jen tehdy, když se změnil stav, který ukazuje
var _mapSvg0 = mapSvg, MAPC = { k: null, h: "" };
mapSvg = function () {
  const k = [S.turn, S.log.length, S.log[0] ? S.log[0].txt : "", S.events.length, SEL.mapMode, SEL.prov, SEL.zoom, (SEL.vb || []).map(Math.round).join(","), S.armies.map(a => a.id + ":" + a.loc + ":" + (a.path || []).length).join("|"), Object.values(S.provs).map(p => p.owner[0] + (p.siege ? "s" : "")).join(""), document.documentElement.dataset.theme || ""].join("#");
  if (k !== MAPC.k) MAPC = { k, h: _mapSvg0() };
  return MAPC.h;
};
// ukládání do prohlížeče až po chvíli klidu, ne při každém kliknutí
var SAVE_T = null;
function saveSoon() { clearTimeout(SAVE_T); SAVE_T = setTimeout(() => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }, 400); }
if (typeof window !== "undefined") window.addEventListener("pagehide", () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} });
