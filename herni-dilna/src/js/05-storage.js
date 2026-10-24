// ---------- úložiště ----------
const LS_KEY = "herni-dilna-v1";
const store = { mode: "local", db: null, uid: null, timers: {}, chains: {} };
function lsRead() { try { const v = localStorage.getItem(LS_KEY); return v ? JSON.parse(v) : null; } catch { return null; } }
let lsTimer = null;
function lsWrite() { clearTimeout(lsTimer); lsTimer = setTimeout(lsWriteNow, 400); }
function lsWriteNow() { clearTimeout(lsTimer); try { localStorage.setItem(LS_KEY, JSON.stringify({ projects: S.projects.filter(p => !p.isExample), currentId: S.currentId })); store.lsFull = false; } catch { store.lsFull = true; if (store.mode !== "db") setSaveState("Prohlížeč je plný – stáhni zálohu"); } }
onInit(() => window.addEventListener("pagehide", () => lsWriteNow()));
onInit(() => document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") lsWriteNow(); }));
function setSaveState(t) { $("#saveState").textContent = t; }
function persist(p) {
  lsWrite();
  if (store.mode !== "db" || p.isExample) { setSaveState(store.mode === "db" ? "" : "Uloženo v tomto prohlížeči"); return; }
  setSaveState("Ukládám…");
  clearTimeout(store.timers[p.id]);
  store.timers[p.id] = setTimeout(() => {
    const body = clone(p);
    const prev = store.chains[p.id] || Promise.resolve();
    store.chains[p.id] = prev.then(() => store.db.collection("data/users/" + store.uid).doc(p.id).set(body))
      .then(() => setSaveState("Uloženo"))
      .catch(e => { setSaveState(e && e.code === "quota_exceeded" ? "Úložiště je plné" : (e && e.code === "invalid_argument" ? "Projekt je moc velký – zmenši obrázek mapy" : "Neuloženo – zkusím znovu při další změně")); });
  }, 800);
}
function touch(p) { if (p.isExample) delete p.isExample; p.updatedAt = Date.now(); persist(p); }
async function removeProject(p) {
  S.projects = S.projects.filter(x => x.id !== p.id);
  if (!S.projects.length) S.projects.push(blankProject());
  S.currentId = S.projects[0].id; lsWrite();
  if (store.mode === "db") { try { await store.db.collection("data/users/" + store.uid).doc(p.id).delete(); } catch {} }
  render();
}
async function connectDb() {
  try {
    if (!window.claude || !window.claude.use) return;
    const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
    if (!db || !user) return;
    const id = await user.id(); if (!id) return;
    const snap = await db.collection("data/users/" + id).get();
    store.db = db; store.uid = id; store.mode = "db";
    const remote = snap.docs.filter(d => d.exists).map(d => normalize(clone(d.data())));
    if (remote.length) {
      const ids = new Set(remote.map(p => p.id));
      const localOnly = S.projects.filter(p => !p.isExample && !ids.has(p.id));
      S.projects = [...remote, ...localOnly].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      localOnly.forEach(persist);
      if (!S.projects.find(p => p.id === S.currentId)) S.currentId = S.projects[0].id;
      render();
    } else S.projects.filter(p => !p.isExample).forEach(persist);
    setSaveState("Ukládá se k tvému účtu");
  } catch {}
}
async function cap(name) { try { return window.claude && window.claude.use ? await window.claude.use(name) : null; } catch { return null; } }
