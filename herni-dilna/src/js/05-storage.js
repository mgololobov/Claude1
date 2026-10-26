// ---------- úložiště ----------
// Vše se ukládá jen v tomto prohlížeči: hlavně do IndexedDB (pojme i hry s mnoha obrázky), kopie do localStorage pro jistotu.
// Mezi počítači a prohlížeči se hry přenáší zálohou (Přehled → Záloha / Nahrát zálohu).
const LS_KEY = "herni-dilna-v1";
const store = { lsFull: false, idbOk: true, timer: null };
function lsRead() { try { const v = localStorage.getItem(LS_KEY); return v ? JSON.parse(v) : null; } catch { return null; } }
function snapshot() { return { projects: S.projects.filter(p => !p.isExample), currentId: S.currentId, saved: Date.now() }; }
function idbOpen() {
  return new Promise((res, rej) => { if (!window.indexedDB) { rej(new Error("bez IndexedDB")); return; }
    const r = indexedDB.open("herni-dilna", 1); r.onupgradeneeded = () => r.result.createObjectStore("data"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}
async function idbGet() { const db = await idbOpen(); return new Promise((res, rej) => { const q = db.transaction("data").objectStore("data").get("state"); q.onsuccess = () => res(q.result || null); q.onerror = () => rej(q.error); }); }
async function idbPut(v) { const db = await idbOpen(); return new Promise((res, rej) => { const tx = db.transaction("data", "readwrite"); tx.objectStore("data").put(v, "state"); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); }); }
function lsWrite() { clearTimeout(store.timer); store.timer = setTimeout(lsWriteNow, 400); }
function lsWriteNow() {
  clearTimeout(store.timer); const snap = snapshot();
  try { localStorage.setItem(LS_KEY, JSON.stringify(snap)); store.lsFull = false; } catch { store.lsFull = true; }
  idbPut(snap).then(() => { store.idbOk = true; setSaveState("Uloženo v tomto prohlížeči"); })
    .catch(() => { store.idbOk = false; setSaveState(store.lsFull ? "Úložiště prohlížeče je plné – stáhni zálohu" : "Uloženo v tomto prohlížeči"); });
}
// Po startu: novější stav z IndexedDB má přednost před localStorage (ten se při velkých hrách nemusel vejít).
async function loadIdb() {
  try { const v = await idbGet(); if (!v || !v.projects) return; const ls = lsRead();
    if (ls && ls.saved && v.saved && ls.saved >= v.saved) return;
    S.projects = [...v.projects.map(normalize), ...allExamples()]; if (v.currentId && S.projects.find(p => p.id === v.currentId)) S.currentId = v.currentId; else S.currentId = S.projects[0].id; render(); }
  catch { }
}
onInit(() => window.addEventListener("pagehide", () => lsWriteNow()));
onInit(() => document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") lsWriteNow(); }));
function setSaveState(t) { const el = $("#saveState"); if (el) el.textContent = t; }
function persist(p) { lsWrite(); if (!p.isExample) setSaveState("Ukládám…"); }
// Krok zpět při úpravách návrhu (stůl má vlastní krok zpět).
const DU = { stacks: {}, last: {}, timer: null, skip: false };
function designKey(p) { const q = { ...p }; delete q.table; delete q.sessions; delete q.versions; delete q.updatedAt; delete q.isExample; return JSON.stringify(q); }
function captureDesign(p) { const now = designKey(p); const last = DU.last[p.id]; if (last && last !== now) { const st = DU.stacks[p.id] = DU.stacks[p.id] || []; st.push(last); if (st.length > 40) st.shift(); } DU.last[p.id] = now; updateUndoBtn(); }
function updateUndoBtn() { const b = document.getElementById("undoDesign"); const p = P(); if (b && p) b.disabled = !(DU.stacks[p.id] || []).length; }
function undoDesign() {
  const p = P(); if (!p) return; clearTimeout(DU.timer); captureDesign(p); const st = DU.stacks[p.id] || []; if (!st.length) return;
  const prev = JSON.parse(st.pop()); const keep = { id: p.id, table: p.table, sessions: p.sessions, versions: p.versions };
  Object.keys(p).forEach(k => delete p[k]); Object.assign(p, normalize({ ...prev, ...keep })); DU.last[p.id] = designKey(p);
  DU.skip = true; touch(p); DU.skip = false; render(); toast("Úprava návrhu vrácena");
}
function touch(p) {
  if (p.isExample) delete p.isExample; p.updatedAt = Date.now(); persist(p);
  if (!DU.skip) { clearTimeout(DU.timer); DU.timer = setTimeout(() => captureDesign(p), 600); }
}
function removeProject(p) {
  S.projects = S.projects.filter(x => x.id !== p.id);
  if (!S.projects.length) S.projects.push(blankProject());
  S.currentId = S.projects[0].id; lsWrite(); render();
}
