// ---------- Spuštění ----------
function init() {
  boot();
  INIT.forEach(f => f());
  render();
  setSaveState(S.projects.every(p => p.isExample) ? "" : "Uloženo v tomto prohlížeči");
  connectDb();
}
if (window.__TEST__) window.__S = () => S; else init();
