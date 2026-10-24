// ---------- Hra více lidí naráz (online) ----------
// Hra žije v databázi artefaktu: games/<kód> (hlavička) a games/<kód>/parts/<část> (návrh, stůl, obrázky).
// Každý hráč má kopii projektu s p.online = { code, host, seat }; změny stolu se posílají ostatním.
const ON = { unsub: null, last: {}, timer: null, code: null, busy: Promise.resolve() };
const onCode = () => Array.from({ length: 5 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
function onlineParts(p) {
  const parts = splitProject(p); delete parts.tests; Object.keys(parts).forEach(k => { if (k.startsWith("v-")) delete parts[k]; });
  delete parts[""].online; delete parts[""].sessions; delete parts[""].versions;
  const out = {}; Object.entries(parts).forEach(([k, v]) => { out[k || "design"] = v; }); return out;
}
async function onlineDb() { const db = await cap("db"); if (!db) toast("Online hra funguje jen v aplikaci Claude po přihlášení"); return db; }
async function onlineWrite(db, code, parts) {
  const col = db.collection(`games/${code}/parts`);
  for (const [k, v] of Object.entries(parts)) { const js = JSON.stringify(v); if (ON.last[k] === js) continue; if (js.length > 255000) { toast("Část hry je pro online moc velká"); continue; } await col.doc(k).set(v); ON.last[k] = js; }
}
async function hostOnline(p) {
  const db = await onlineDb(); if (!db) return; const code = onCode(); ON.last = {};
  const g = clone(p); g.id = "online-" + code; g.online = { code, host: true, seat: "" }; g.hostOf = p.id; ensureTable(g);
  try { await db.doc(`games/${code}`).set({ name: p.name, created: Date.now() }); await onlineWrite(db, code, onlineParts(g)); }
  catch (e) { toast("Hru se nepodařilo založit"); return; }
  (p.onlineCodes = p.onlineCodes || []).push(code); touch(p);
  S.projects.push(g); S.currentId = g.id; S.tab = "stul"; onlineListen(g); render();
  openDialog(`<h2>Online hra založena</h2><p>Kód hry: <b class="mono" style="font-size:1.6rem;letter-spacing:.15em">${code}</b></p><p class="hint">Ostatní otevřou Herní dílnu, dají „Připojit se ke hře“ a zadají kód. Každý si pak vybere, za koho hraje – ruce ostatních neuvidí.</p><div class="row" style="justify-content:flex-end"><button class="btn primary" data-close>Hrát</button></div>`);
}
async function joinOnline(code) {
  code = String(code || "").trim().toUpperCase(); if (!code) return; const db = await onlineDb(); if (!db) return;
  const ex = S.projects.find(x => x.online && x.online.code === code); if (ex) { S.currentId = ex.id; render(); onlineListen(ex); return; }
  try {
    const snap = await db.collection(`games/${code}/parts`).get(); const docs = {}; snap.docs.forEach(d => { docs[d.id === "design" ? "" : d.id] = d.data(); });
    if (!docs[""]) { toast("Hra s tímto kódem neexistuje"); return; }
    const g = normalize(joinProject(docs)); g.id = "online-" + code; g.online = { code, host: false, seat: "" }; ON.last = {};
    Object.entries(onlineParts(g)).forEach(([k, v]) => ON.last[k] = JSON.stringify(v));
    S.projects.push(g); S.currentId = g.id; S.tab = "stul"; onlineListen(g); render(); toast("Připojeno ke hře " + code);
  } catch { toast("Ke hře se nepodařilo připojit"); }
}
async function onlineListen(p) {
  const db = await cap("db"); if (!db) return; if (ON.unsub) ON.unsub(); ON.code = p.online.code;
  ON.unsub = db.collection(`games/${p.online.code}/parts`).onSnapshot(snap => {
    let changed = false, design = false; const docs = {};
    snap.docs.forEach(d => { const v = d.data(); docs[d.id === "design" ? "" : d.id] = v; const js = JSON.stringify(v); if (ON.last[d.id] === js) return; ON.last[d.id] = js; changed = true;
      if (d.id === "table") p.table = v.table; else design = true; });
    if (design && docs[""]) { const keep = { id: p.id, online: p.online, table: p.table, onlineCodes: p.onlineCodes, hostOf: p.hostOf }; const np = normalize(joinProject(clone(docs)));
      Object.keys(p).forEach(k => delete p[k]); Object.assign(p, np, keep); }
    if (changed && S.currentId === p.id && !document.querySelector(".titem.drag")) { S.undoBase = null; render(); }
  }, () => toast("Spojení s online hrou se přerušilo"));
}
function onlinePush(p) {
  clearTimeout(ON.timer);
  ON.timer = setTimeout(async () => { const db = await cap("db"); if (!db) return; ON.busy = ON.busy.then(() => onlineWrite(db, p.online.code, onlineParts(p))).catch(() => setSaveState("Online: neodesláno")); }, 350);
}
function leaveOnline(p) { if (ON.unsub) ON.unsub(); ON.unsub = null; S.projects = S.projects.filter(x => x !== p); if (!S.projects.length) S.projects.push(blankProject()); S.currentId = S.projects[0].id; render(); }
// Zámek tahu: v online hře smí stůl měnit jen hráč, který je právě na tahu (posuzuje se stav před změnou).
function onlineBlocked(p) {
  if (!p.online || !S.undoBase) return false; const base = JSON.parse(S.undoBase); if (!base || !base.turnLock) return false;
  const cur = curPlayer(p, base); const seat = p.online.seat; if (cur && seat === cur.id) return false;
  toast(seat ? `Teď hraje ${cur ? cur.name : "jiný hráč"} – počkej na svůj tah` : "Pozorovatel nemůže měnit stůl – vyber, za koho hraješ"); return true;
}
function onlineHTML(p, t) {
  if (p.online) {
    const seat = p.online.seat;
    return `<section><div class="eyebrow">Online hra · kód <span class="mono">${esc(p.online.code)}</span></div>
      <label class="f">Hraji za<select id="onSeat"><option value="">Pozoruji (vidím vše)</option>${p.factions.map(f => `<option value="${f.id}" ${seat === f.id ? "selected" : ""}>${esc(f.name)}</option>`).join("")}</select></label>
      <p class="hint">Ruce ostatních hráčů a jejich skryté jednotky neuvidíš. Změny na stole se ostatním ukážou do pár sekund.</p>
      ${p.online.host ? `<label class="chk"><input type="checkbox" id="onLock" ${t.turnLock ? "checked" : ""}> Měnit stůl smí jen hráč na tahu</label>` : t.turnLock ? `<p class="hint">🔒 Stůl smí měnit jen hráč na tahu.</p>` : ""}
      <div class="row"><button class="btn small" id="onFb">Napsat zpětnou vazbu</button><button class="btn small danger" id="onLeave">Opustit hru</button></div></section>`;
  }
  return `<section><div class="eyebrow">Hra více lidí naráz</div><p class="hint">Každý hraje na svém zařízení, ruce zůstanou soukromé.</p>
    <div class="row"><button class="btn small primary" id="onHost">Založit online hru</button><button class="btn small" id="onJoin">Připojit se ke hře</button></div></section>`;
}
function joinDialog() {
  const d = openDialog(`<h2>Připojit se ke hře</h2><label class="f">Kód hry<input type="text" id="onCode" maxlength="8" autocapitalize="characters" style="text-transform:uppercase;letter-spacing:.15em"></label><div class="row" style="justify-content:flex-end"><button class="btn" data-close>Zrušit</button><button class="btn primary" id="onGo">Připojit</button></div>`);
  setTimeout(() => $("#onCode", d).focus(), 30); $("#onGo", d).onclick = () => { const c = $("#onCode", d).value; closeDialog(); joinOnline(c); };
}
// Dotazník po hře: zapisuje se k záznamu testu, testeři online ho posílají autorovi.
const SURVEY = [["fun", "Jak moc hra bavila?", ["1 vůbec", "2", "3", "4", "5 hodně"]], ["len", "Délka hry", ["krátká", "akorát", "dlouhá"]], ["cx", "Složitost", ["jednoduchá", "akorát", "složitá"]]];
function surveyHTML(sv = {}) {
  return `<div class="eyebrow">Dotazník po hře</div>${SURVEY.map(([k, q, opts]) => `<div class="f"><span>${q}</span><div class="tools" role="radiogroup">${opts.map((o, i) => `<button type="button" data-sv="${k}" data-svv="${i + 1}" aria-pressed="${+sv[k] === i + 1}">${o}</button>`).join("")}</div></div>`).join("")}
    <label class="f">Co bylo nejasné?<input type="text" id="sv-unclear" value="${esc(sv.unclear || "")}" placeholder="pravidlo, karta, symbol…"></label>`;
}
function wireSurvey(d, sv) {
  $$("[data-sv]", d).forEach(b => b.onclick = () => { sv[b.dataset.sv] = +b.dataset.svv; $$(`[data-sv="${b.dataset.sv}"]`, d).forEach(x => x.setAttribute("aria-pressed", x === b)); });
  return () => { sv.unclear = $("#sv-unclear", d).value.trim(); return sv; };
}
function surveySummaryHTML(ss) {
  const w = ss.filter(s => s.survey && (s.survey.fun || s.survey.len || s.survey.cx || s.survey.unclear)); if (!w.length) return "";
  const avg = k => { const v = w.map(s => +s.survey[k]).filter(Boolean); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const cnt = (k, i) => w.filter(s => +s.survey[k] === i).length;
  const fun = avg("fun"); const unclear = w.map(s => s.survey.unclear).filter(Boolean);
  return `<div class="panel"><h3>Dotazníky (${w.length})</h3>
    <div class="stat-row"><div class="stat"><span class="eyebrow">Zábava</span><b>${fun == null ? "–" : fun.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })}</b><span class="muted">z 5</span></div>
    <div class="stat"><span class="eyebrow">Délka</span><b style="font-size:1rem">${["krátká", "akorát", "dlouhá"].map((x, i) => `${x} ${cnt("len", i + 1)}`).join(" · ")}</b></div>
    <div class="stat"><span class="eyebrow">Složitost</span><b style="font-size:1rem">${["jednoduchá", "akorát", "složitá"].map((x, i) => `${x} ${cnt("cx", i + 1)}`).join(" · ")}</b></div></div>
    ${unclear.length ? `<h3>Nejasnosti</h3><ul>${unclear.map(u => `<li>${esc(u)}</li>`).join("")}</ul>` : ""}</div>`;
}
function feedbackDialog(p) {
  const sv = {}; const d = openDialog(`<h2>Zpětná vazba autorovi</h2>${surveyHTML(sv)}<label class="f">Poznámka<textarea id="fbNote" placeholder="Co se líbilo, co ne…"></textarea></label><div class="row" style="justify-content:flex-end"><button class="btn" data-close>Zrušit</button><button class="btn primary" id="fbGo">Odeslat</button></div>`);
  const read = wireSurvey(d, sv);
  $("#fbGo", d).onclick = async () => { const db = await onlineDb(); if (!db) return; const t = p.table; const seat = p.factions.find(f => f.id === p.online.seat);
    try { await db.collection(`games/${p.online.code}/feedback`).add({ survey: read(), note: $("#fbNote", d).value.slice(0, 2000), seat: seat ? seat.name : "", minutes: Math.round(clockMs(t) / 60000), at: Date.now() }); closeDialog(); toast("Díky, odesláno"); } catch { toast("Nepodařilo se odeslat"); } };
}
async function importFeedback(p) {
  const db = await onlineDb(); if (!db) return; let n = 0; p.fbSeen = p.fbSeen || [];
  for (const code of p.onlineCodes || []) { try { const snap = await db.collection(`games/${code}/feedback`).get();
    snap.docs.forEach(doc => { const key = code + "/" + doc.id; if (p.fbSeen.includes(key)) return; const f = doc.data(); p.fbSeen.push(key); n++;
      p.sessions.push({ id: uid(), date: new Date(f.at || Date.now()).toISOString().slice(0, 10), version: p.version, minutes: +f.minutes || 0, scenario: "", players: [{ name: f.seat || "tester", score: "", win: false }], notes: `Tester online (${code}): ${f.note || ""}`, survey: f.survey || {} }); }); } catch {} }
  touch(p); render(); toast(n ? `Načteno ${n} ${plural(n, "hodnocení", "hodnocení", "hodnocení")}` : "Nic nového");
}
function wireOnline(main, p, t, save) {
  const q = id => document.getElementById(id);
  if (q("onHost")) q("onHost").onclick = () => hostOnline(p);
  if (q("onJoin")) q("onJoin").onclick = joinDialog;
  if (q("onLeave")) q("onLeave").onclick = () => leaveOnline(p);
  if (q("onFb")) q("onFb").onclick = () => feedbackDialog(p);
  if (q("onLock")) q("onLock").onchange = e => { t.turnLock = e.target.checked; S.undoBase = JSON.stringify(t); touch(p); render(); };
  if (q("onSeat")) q("onSeat").onchange = e => { p.online.seat = e.target.value; S.view = e.target.value || ""; if (e.target.value) { S.handF = e.target.value; S.showHand = false; } render(); };
}
