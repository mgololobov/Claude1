// ---------- stav ----------
const S = { projects: [], currentId: null, tab: "prehled", deckId: null, boardId: null, sel: null, tool: "stul", dice: [], diceLog: [],
  edTool: "plain", combat: { att: 0, def: 0, terrainId: "plain", shift: 0, mode: "crt", aDice: 3, dDice: 2, log: [], res: null }, ctrlMode: false, snap: true, showHand: false, handF: null, undo: [], undoBase: null, pool: [], rerolls: 0 };
function boot() {
  const saved = lsRead();
  if (saved && saved.projects && saved.projects.length) { S.projects = saved.projects.map(normalize); S.currentId = saved.currentId; }
  else S.projects = [exampleWar(), exampleTrade(), exampleAlchemy(), exampleTricks(), exampleTiles(), exampleRace(), exampleIsland(), exampleCrypt()];
  if (!S.projects.find(p => p.id === S.currentId)) S.currentId = S.projects[0].id;
  try { const t = localStorage.getItem(LS_KEY + "-tab"); if (t) S.tab = t; } catch {}
  if (/^#[a-z]+$/.test(location.hash)) S.tab = location.hash.slice(1);
  if (!["prehled", "komponenty", "mapa", "mechaniky", "pravidla", "scenare", "stul", "testy", "analyza"].includes(S.tab)) S.tab = "prehled";
}
const P = () => S.projects.find(p => p.id === S.currentId);

function render() {
  $("#projSel").innerHTML = S.projects.map(p => `<option value="${p.id}" ${p.id === S.currentId ? "selected" : ""}>${esc(p.name)}${p.isExample ? " (ukázka)" : ""}</option>`).join("");
  $$(".tab").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === S.tab));
  const main = $("#main");
  main.style.overflow = S.tab === "stul" ? "hidden" : "auto";
  ({ prehled: renderOverview, komponenty: renderComponents, mapa: renderMap, mechaniky: renderMechanics, pravidla: renderRules, scenare: renderScenarios, stul: renderTable, testy: renderTests, analyza: renderAnalysis })[S.tab](main, P());
  processPending(P()); uiAfterRender(main);
  const cp = P(); if (cp && !DU.last[cp.id]) DU.last[cp.id] = designKey(cp); updateUndoBtn();
}
onInit(() => $("#projSel").addEventListener("change", e => { S.currentId = e.target.value; S.sel = null; S.deckId = null; S.boardId = null; S.undo = []; S.rangeUid = null; S.pool = []; lsWrite(); render(); }));
onInit(() => $("#undoDesign").addEventListener("click", undoDesign));
onInit(() => $("#newProj").addEventListener("click", () => { const p = blankProject(); S.projects.unshift(p); S.currentId = p.id; S.tab = "prehled"; touch(p); render(); toast("Nová hra založena"); }));
onInit(() => $$(".tab").forEach(b => b.addEventListener("click", () => { S.tab = b.dataset.tab; try { localStorage.setItem(LS_KEY + "-tab", S.tab); } catch {} render(); })));
function exampleBanner(p) {
  if (!p.isExample) return "";
  return `<div class="banner"><span><b>Ukázkový projekt.</b> Vyzkoušej si na něm, jak dílna funguje. Jakmile cokoli změníš, uloží se jako tvůj.</span><button class="btn small" data-act="start-own">Začít vlastní hru</button></div>`;
}
function wireBanner(root) { const b = root.querySelector('[data-act="start-own"]'); if (b) b.onclick = () => $("#newProj").click(); }
