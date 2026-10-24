// ---------- úložiště ----------
const LS_KEY = "herni-dilna-v1";
const store = { mode: "local", db: null, uid: null, timers: {}, chains: {}, parts: {} };
function lsRead() { try { const v = localStorage.getItem(LS_KEY); return v ? JSON.parse(v) : null; } catch { return null; } }
let lsTimer = null;
function lsWrite() { clearTimeout(lsTimer); lsTimer = setTimeout(lsWriteNow, 400); }
function lsWriteNow() { clearTimeout(lsTimer); try { localStorage.setItem(LS_KEY, JSON.stringify({ projects: S.projects.filter(p => !p.isExample && !p.online), currentId: S.currentId })); store.lsFull = false; } catch { store.lsFull = true; if (store.mode !== "db") setSaveState("Prohlížeč je plný – stáhni zálohu"); } }
onInit(() => window.addEventListener("pagehide", () => lsWriteNow()));
onInit(() => document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") lsWriteNow(); }));
function setSaveState(t) { $("#saveState").textContent = t; }
// K účtu se projekt ukládá po částech, aby žádná nepřekročila limit 256 kB jednoho záznamu:
//   <id> návrh · <id>--table herní stůl · <id>--tests záznamy testů · <id>--v-<id> verze · <id>--img-<n> vložené obrázky
// Zapisují se jen části, které se od posledního uložení změnily.
const IMG_CHUNK = 190000;
function splitProject(p) {
  const q = clone(p); delete q.isExample; const parts = {}; const imgs = [];
  q.decks.forEach(d => { if (d.backImg && d.backImg.startsWith("data:")) { imgs.push(["back", d.id, d.backImg]); d.backImg = "@img"; }
    d.cards.forEach(c => { if (c.img && c.img.startsWith("data:")) { imgs.push(["card", d.id + "/" + c.id, c.img]); c.img = "@img"; } }); });
  q.boards.forEach(b => { if (b.bg && b.bg.data) { imgs.push(["board", b.id, b.bg.data]); b.bg.data = "@img"; } });
  parts.table = { table: q.table || null }; delete q.table;
  parts.tests = { sessions: q.sessions || [] }; delete q.sessions;
  (q.versions || []).forEach(v => { parts["v-" + v.id] = v; }); delete q.versions;
  let chunk = [], size = 0, n = 0; const flush = () => { if (chunk.length) { parts["img-" + n++] = { items: chunk }; chunk = []; size = 0; } };
  imgs.forEach(it => { if (size + it[2].length > IMG_CHUNK) flush(); chunk.push(it); size += it[2].length; }); flush();
  parts[""] = q;
  return parts;
}
function joinProject(docs) {
  const p = docs[""]; if (!p) return null;
  if (docs.table) p.table = docs.table.table; if (docs.tests) p.sessions = docs.tests.sessions;
  const vs = Object.keys(docs).filter(k => k.startsWith("v-")).map(k => docs[k]); if (vs.length) p.versions = vs.sort((a, b) => (a.created || 0) - (b.created || 0));
  Object.keys(docs).filter(k => k.startsWith("img-")).forEach(k => (docs[k].items || []).forEach(([kind, key, data]) => {
    if (kind === "card") { const [dId, cId] = key.split("/"); const c = ((p.decks || []).find(d => d.id === dId) || { cards: [] }).cards.find(x => x.id === cId); if (c) c.img = data; }
    else if (kind === "back") { const d = (p.decks || []).find(x => x.id === key); if (d) d.backImg = data; }
    else if (kind === "board") { const b = (p.boards || []).find(x => x.id === key); if (b && b.bg) b.bg.data = data; }
  }));
  return p;
}
function persist(p) {
  lsWrite();
  if (store.mode !== "db" || p.isExample || p.online) { setSaveState(store.mode === "db" ? "" : "Uloženo v tomto prohlížeči"); return; }
  setSaveState("Ukládám…");
  clearTimeout(store.timers[p.id]);
  store.timers[p.id] = setTimeout(() => {
    const parts = splitProject(p); const last = store.parts[p.id] = store.parts[p.id] || {}; const col = store.db.collection("data/users/" + store.uid);
    const jobs = [];
    Object.entries(parts).forEach(([k, body]) => { const js = JSON.stringify(body); if (js.length > 255000) { jobs.push(() => Promise.reject({ code: "too_big", part: k })); return; } if (last[k] !== js) jobs.push(() => col.doc(p.id + (k ? "--" + k : "")).set(body).then(() => { last[k] = js; })); });
    Object.keys(last).forEach(k => { if (!(k in parts)) jobs.push(() => col.doc(p.id + (k ? "--" + k : "")).delete().then(() => { delete last[k]; })); });
    const prev = store.chains[p.id] || Promise.resolve();
    store.chains[p.id] = prev.then(() => jobs.reduce((ch, job) => ch.then(job), Promise.resolve()))
      .then(() => setSaveState("Uloženo"))
      .catch(e => { setSaveState(e && e.code === "quota_exceeded" ? "Úložiště je plné" : e && e.code === "too_big" ? (e.part === "" ? "Návrh je moc velký – zkrať texty nebo smaž karty" : "Část projektu je moc velká – smaž záznam hry") : e && e.code === "invalid_argument" ? "Část projektu je moc velká" : "Neuloženo – zkusím znovu při další změně"); });
  }, 800);
}
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
  if (p.online && typeof onlinePush === "function") onlinePush(p);
}
async function removeProject(p) {
  S.projects = S.projects.filter(x => x.id !== p.id);
  if (!S.projects.length) S.projects.push(blankProject());
  S.currentId = S.projects[0].id; lsWrite();
  if (store.mode === "db") { const col = store.db.collection("data/users/" + store.uid); const keys = Object.keys(store.parts[p.id] || { "": 1 }); for (const k of keys) { try { await col.doc(p.id + (k ? "--" + k : "")).delete(); } catch {} } delete store.parts[p.id]; }
  render();
}
async function connectDb() {
  try {
    if (!window.claude || !window.claude.use) return;
    const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
    if (!db || !user) return;
    const id = await user.id(); if (!id) return;
    const snap = await db.collection("data/users/" + id).get();
    store.db = db; store.uid = id; store.mode = "db"; store.user = user;
    const groups = {};
    snap.docs.filter(d => d.exists).forEach(d => { const [base, ...rest] = d.id.split("--"); const k = rest.join("--"); (groups[base] = groups[base] || {})[k] = clone(d.data()); (store.parts[base] = store.parts[base] || {})[k] = JSON.stringify(d.data()); });
    const remote = Object.values(groups).map(joinProject).filter(Boolean).map(normalize);
    if (remote.length) {
      const ids = new Set(remote.map(p => p.id));
      const localOnly = S.projects.filter(p => !p.isExample && !ids.has(p.id));
      S.projects = [...remote, ...localOnly].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      // Starý formát (vše v jednom záznamu) se přeuloží po částech.
      remote.forEach(p => { if (groups[p.id] && !groups[p.id].table) { store.parts[p.id] = {}; persist(p); } });
      localOnly.forEach(persist);
      if (!S.projects.find(p => p.id === S.currentId)) S.currentId = S.projects[0].id;
      render();
    } else S.projects.filter(p => !p.isExample).forEach(persist);
    setSaveState("Ukládá se k tvému účtu");
  } catch {}
}
async function cap(name) { try { return window.claude && window.claude.use ? await window.claude.use(name) : null; } catch { return null; } }
