// ---------- Přehlednost: skupiny nástrojů na stole, navigace po dlouhých stránkách ----------
const TOOL_GROUPS = [
  ["Hra", ["stul", "kolo", "hraci", "ruce"]],
  ["Karty", ["trh", "souboj", "draft", "styk", "program", "hromadka", "riskuj", "tajne"]],
  ["Náhoda", ["kostky", "sacek"]],
  ["Ekonomika", ["akce", "obchod", "drazba", "rozvoj", "draha", "zakazky", "spolecnosti", "rondel"]],
  ["Mapa a boj", ["boj", "uzemi", "dilky", "aktivace", "vyprava", "lokace", "sit"]],
  ["Logika", ["kameny", "kod", "rozsevani"]],
];
function toolsHTML(p) {
  const label = k => (TOOLS.find(x => x[0] === k) || [])[1]; const show = k => label(k) && (S.allTools || toolRelevant(p, k) || S.tool === k);
  const grouped = TOOL_GROUPS.flatMap(([, ks]) => ks);
  const groups = [...TOOL_GROUPS, ["Další", TOOLS.map(x => x[0]).filter(k => !grouped.includes(k))]].map(([g, ks]) => [g, ks.filter(show)]).filter(([, ks]) => ks.length);
  const hidden = TOOLS.some(([k]) => !toolRelevant(p, k));
  return `<div class="toolgroups" role="toolbar" aria-label="Nástroje stolu">${groups.map(([g, ks]) => `<div class="toolgroup"><span class="tg-label">${g}</span><div class="tools">${ks.map(k => `<button data-tool="${k}" aria-pressed="${S.tool === k}">${label(k)}</button>`).join("")}</div></div>`).join("")}
    ${hidden ? `<button class="btn small tg-more" data-alltools aria-pressed="${!!S.allTools}" title="Nástroje, které tato hra zatím nepoužívá">${S.allTools ? "Jen nástroje této hry" : "Všechny nástroje…"}</button>` : ""}</div>`;
}
// Dlouhé stránky dostanou lištu s odkazy na jednotlivé panely.
function sectionNav(main) {
  if (S.tab === "stul") return; const page = main.querySelector(".page"); if (!page) return;
  const heads = [...page.querySelectorAll(".panel > h2, .panel > .row > h2, .panel > .row.spread > h2")].filter(h => h.textContent.trim());
  if (heads.length < 4) return;
  const nav = document.createElement("nav"); nav.className = "secnav"; nav.setAttribute("aria-label", "Části stránky");
  heads.forEach((h, i) => { const b = document.createElement("button"); b.type = "button"; b.textContent = h.textContent.trim(); b.onclick = () => h.closest(".panel").scrollIntoView({ behavior: "smooth", block: "start" }); nav.appendChild(b); void i; });
  const after = page.querySelector(".banner"); if (after) after.after(nav); else page.prepend(nav);
}
// Panely volitelných mechanik se sbalí, dokud je hra nemá zapnuté – Mechaniky pak nejsou nekonečně dlouhé.
const PANEL_TOGGLES = ["cmOn", "dlOn", "ncOn", "rlOn", "ddOn", "lgOn", "cdOn"];
function collapseOffPanels(main) {
  if (S.tab !== "mechaniky") return;
  PANEL_TOGGLES.forEach(id => { const inp = main.querySelector("#" + id); if (!inp) return; const panel = inp.closest(".panel"); const lab = inp.closest("label"); if (!panel || !lab) return;
    lab.classList.add("ptoggle"); const others = [...panel.querySelectorAll(PANEL_TOGGLES.map(x => "#" + x).join(","))]; const on = others.some(x => x.checked);
    panel.classList.toggle("off", !on); inp.addEventListener("change", () => setTimeout(render, 0)); });
}
function uiAfterRender(main) {
  sectionNav(main); collapseOffPanels(main);
  const tab = document.querySelector(`.tab[aria-selected="true"]`); if (tab && tab.scrollIntoView) { const bar = tab.parentElement; const r = tab.getBoundingClientRect(), rb = bar.getBoundingClientRect(); if (r.left < rb.left || r.right > rb.right) bar.scrollLeft += r.left - rb.left - 16; }
}
// Hlavní nástroj stolu podle toho, jakou hru projekt používá – otevře se po přepnutí hry.
function primaryTool(p) {
  const order = [["spolecnosti", () => p.rail && p.rail.on], ["lokace", () => p.cmap && p.cmap.on], ["vyprava", () => toolRelevant(p, "vyprava")], ["souboj", () => toolRelevant(p, "souboj")],
    ["kameny", () => p.stones && p.stones.on], ["rozsevani", () => p.mancala && p.mancala.on], ["zakazky", () => p.deliver && p.deliver.on], ["styk", () => +p.scoring.trick > 0],
    ["dilky", () => p.tiles.length], ["draha", () => +p.track.length], ["trh", () => p.decks.some(d => +d.market > 0)], ["akce", () => p.actions.length], ["boj", () => p.units.length]];
  const hit = order.find(([, f]) => f()); return hit ? hit[0] : "stul";
}
// Průvodce prvními kroky – zmizí, když je hotovo nebo ho uživatel skryje.
function startSteps(p) {
  return [
    ["Popiš hru", "Název, krátký popis a pravidla vlastními slovy.", "prehled", !!String(p.summary || "").trim()],
    ["Strany a zdroje", "Kdo hraje a s čím (mince, suroviny, body).", "mechaniky", p.factions.length > 0 && p.resources.length > 0],
    ["Komponenty", "Karty, jednotky, žetony nebo mapa.", "komponenty", p.decks.some(d => d.cards.length) || p.units.length > 0 || p.boards.length > 0 || p.nets.length > 0 || p.tokens.length > 0],
    ["Pravidla a cíl hry", "Jak se vyhrává a co má stůl hlídat.", "pravidla", !!(p.ruleset.win.vp || p.ruleset.win.turns || p.ruleset.win.elimination || p.ruleset.win.poolEnd || p.scenarios.length || +p.track.length)],
    ["Zahraj si", "Vyzkoušej hru na herním stole.", "stul", !!(p.table && (p.table.log || []).length > 2)],
    ["Otestuj", "Zapiš testovací hru nebo spusť simulaci.", "testy", p.sessions.length > 0],
  ];
}
function startGuideHTML(p) {
  if (p.isExample || p.hideStart) return ""; const st = startSteps(p); const done = st.filter(x => x[3]).length; if (done === st.length) return "";
  return `<div class="panel startguide"><div class="row spread"><h2>Jak začít</h2><span class="row"><span class="count">${done} z ${st.length}</span><button class="btn small" id="sgHide">Skrýt</button></span></div>
    <ol class="steps">${st.map(([t, d, tab, ok]) => `<li class="${ok ? "ok" : ""}"><button type="button" data-sgo="${tab}"><b>${ok ? "✓ " : ""}${t}</b><span>${d}</span></button></li>`).join("")}</ol>
    <p class="hint">Inspiraci najdeš v ukázkových hrách (výběr hry nahoře) – změnou se uloží jako tvoje.</p></div>`;
}
function wireStartGuide(main, p) {
  $$("[data-sgo]", main).forEach(b => b.onclick = () => { if (b.dataset.sgo === "prehled") { const ta = main.querySelector(".panel:not(.startguide) textarea"); if (ta) { ta.scrollIntoView({ behavior: "smooth", block: "center" }); ta.focus({ preventScroll: true }); } return; } S.tab = b.dataset.sgo; render(); });
  const h = document.getElementById("sgHide"); if (h) h.onclick = () => { p.hideStart = true; touch(p); render(); };
}
