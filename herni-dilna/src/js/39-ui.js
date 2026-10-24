// ---------- Přehlednost: skupiny nástrojů na stole, navigace po dlouhých stránkách ----------
const TOOL_GROUPS = [
  ["Hra", ["stul", "kolo", "hraci", "ruce"]],
  ["Karty", ["trh", "souboj", "draft", "styk", "program", "hromadka", "riskuj", "tajne"]],
  ["Náhoda", ["kostky", "sacek"]],
  ["Ekonomika", ["akce", "obchod", "drazba", "rozvoj", "draha", "zakazky", "spolecnosti"]],
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
function uiAfterRender(main) {
  sectionNav(main);
  const tab = document.querySelector(`.tab[aria-selected="true"]`); if (tab && tab.scrollIntoView) { const bar = tab.parentElement; const r = tab.getBoundingClientRect(), rb = bar.getBoundingClientRect(); if (r.left < rb.left || r.right > rb.right) bar.scrollLeft += r.left - rb.left - 16; }
}
