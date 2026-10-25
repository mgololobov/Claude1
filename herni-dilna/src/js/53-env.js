// ---------- Denní doba a počasí, světlo ----------
// Denní doba se střídá podle kol (cyklus, např. Den, Den, Soumrak, Noc), počasí se každé kolo losuje podle vah nebo se nastaví ručně.
// Každá podmínka může omezit výhled a upravit pohyb, útok, obranu a dostřel všech jednotek. Předmět se světlem dovolí nositeli
// vidět do své vzdálenosti i v noci a mlze a ve výpravě osvětlí okolní pole.
function defaultEnvConds() {
  return [
    { id: "den", name: "Den", kind: "time", icon: "☀", sight: "", mAtt: 0, mDef: 0, mMov: 0, mRange: 0 },
    { id: "soumrak", name: "Soumrak", kind: "time", icon: "◐", sight: 3, mAtt: 0, mDef: 0, mMov: 0, mRange: 0 },
    { id: "noc", name: "Noc", kind: "time", icon: "☾", sight: 1, mAtt: 0, mDef: 0, mMov: 0, mRange: -1 },
    { id: "jasno", name: "Jasno", kind: "weather", icon: "☼", w: 4, sight: "", mAtt: 0, mDef: 0, mMov: 0, mRange: 0 },
    { id: "mlha", name: "Mlha", kind: "weather", icon: "≋", w: 1, sight: 1, mAtt: 0, mDef: 0, mMov: 0, mRange: -2 },
    { id: "dest", name: "Déšť", kind: "weather", icon: "☂", w: 2, sight: 3, mAtt: 0, mDef: 0, mMov: -1, mRange: -1 },
    { id: "vitr", name: "Vítr", kind: "weather", icon: "≈", w: 1, sight: "", mAtt: 0, mDef: 0, mMov: 0, mRange: -1 },
  ];
}
function normalizeEnv(p) {
  p.env = Object.assign({ on: false, cycle: "Den, Den, Soumrak, Noc", auto: true, conds: null }, p.env || {});
  if (!Array.isArray(p.env.conds) || !p.env.conds.length) p.env.conds = defaultEnvConds();
}
const envOn = p => !!(p.env && p.env.on);
const envCycle = p => String(p.env.cycle || "").split(",").map(s => s.trim()).filter(Boolean);
function envNow(p, t) {
  if (!envOn(p) || !t) return []; const C = p.env.conds; const out = [];
  const tm = C.find(c => c.kind === "time" && c.name === t.envTime) || C.find(c => c.kind === "time" && c.name === envCycle(p)[((t.turn || 1) - 1) % Math.max(1, envCycle(p).length)]); if (tm) out.push(tm);
  const we = C.find(c => c.kind === "weather" && c.name === t.envWeather); if (we) out.push(we);
  return out;
}
function envMods(p, key) { const m = (MODS.find(x => x[1] === key) || [])[0]; if (!m || key === "hp") return 0; return envNow(p, p.table).reduce((a, c) => a + (+c[m] || 0), 0); }
function itemLight(p, t, it) { return Math.max(0, ...carried(p, t, it).map(e => +e.def.light || 0)); }
// Výhled jednotky: pravidlo výhledu omezené dobou a počasím; světlo ho v tmě vrátí do své vzdálenosti.
function sightOf(p, t, it) {
  const base = +p.ruleset.sight || 6; const caps = envNow(p, t).map(c => c.sight).filter(v => v !== "" && v != null).map(Number);
  const cap = caps.length ? Math.min(...caps) : Infinity; return Math.min(base, Math.max(cap, it ? itemLight(p, t, it) : 0));
}
function weatherRoll(p) { const W = p.env.conds.filter(c => c.kind === "weather"); const tot = W.reduce((a, c) => a + Math.max(0, +c.w || 0), 0); if (!tot) return null; let r = Math.random() * tot; for (const c of W) { r -= Math.max(0, +c.w || 0); if (r < 0) return c; } return W[W.length - 1]; }
function envRound(p, t) {
  if (!envOn(p)) return; const cy = envCycle(p); const tm = cy[((t.turn || 1) - 1) % Math.max(1, cy.length)]; const changed = [];
  if (tm && tm !== t.envTime) { t.envTime = tm; changed.push(tm); }
  if (p.env.auto) { const w = weatherRoll(p); if (w && w.name !== t.envWeather) { t.envWeather = w.name; changed.push(w.name); } }
  if (changed.length) logEv(t, "počasí a doba: " + envNow(p, t).map(c => c.name).join(", "));
}
const envBadge = (p, t) => envNow(p, t).map(c => `<span class="envchip" title="${esc(envText(c))}">${esc(c.icon || "")} ${esc(c.name)}</span>`).join("");
function envText(c) { const a = []; if (c.sight !== "" && c.sight != null) a.push(`výhled ${c.sight}`); const mt = modText(c); if (mt) a.push(mt); return a.join(", ") || "bez vlivu"; }
function envSideHTML(p, t) {
  if (!envOn(p)) return ""; const C = p.env.conds; const now = envNow(p, t);
  return `<section><div class="eyebrow">Denní doba a počasí</div><div class="row">${envBadge(p, t)}</div>
    <div class="grid" style="grid-template-columns:1fr 1fr"><label class="f">Doba<select id="envT">${C.filter(c => c.kind === "time").map(c => `<option ${now.some(n => n === c) ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>
    <label class="f">Počasí<select id="envW"><option value="">–</option>${C.filter(c => c.kind === "weather").map(c => `<option ${c.name === t.envWeather ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label></div>
    <button class="btn small" id="envRoll">Hodit na počasí</button><span class="hint"> ${esc(now.map(c => `${c.name}: ${envText(c)}`).join(" · "))}</span></section>`;
}
function wireEnvSide(main, p, t, save) {
  const q = id => document.getElementById(id); if (!q("envT")) return;
  q("envT").onchange = e => { t.envTime = e.target.value; logEv(t, "doba: " + t.envTime); save(); render(); };
  q("envW").onchange = e => { t.envWeather = e.target.value; logEv(t, "počasí: " + (t.envWeather || "–")); save(); render(); };
  q("envRoll").onclick = () => { const w = weatherRoll(p); if (!w) return; t.envWeather = w.name; logEv(t, "počasí: " + w.name); save(); render(); toast(`Počasí: ${w.icon || ""} ${w.name}`); };
}
function envMechHTML(p) {
  const E = p.env; const n = (k, c, w = 70) => `<input type="number" data-env="${k}|${c.id}" value="${esc(c[k] ?? "")}" style="width:${w}px" aria-label="${k}">`;
  return `<div class="panel"><h2>Denní doba a počasí</h2>
    <label class="chk"><input type="checkbox" id="envOn" ${E.on ? "checked" : ""}> Hra má denní dobu a počasí</label>
    ${E.on ? `<label class="f">Střídání doby po kolech (opakuje se)<input type="text" id="envCyc" value="${esc(E.cycle)}" placeholder="Den, Den, Soumrak, Noc"></label>
    <label class="chk"><input type="checkbox" id="envAuto" ${E.auto ? "checked" : ""}> Počasí se na začátku kola losuje podle vah</label>
    <div style="overflow-x:auto"><table class="crt-tab"><thead><tr><th>Podmínka</th><th>Druh</th><th title="Nejdál, kam jednotky vidí (prázdné = beze změny)">Výhled</th><th>Útok</th><th>Obrana</th><th>Pohyb</th><th>Dostřel</th><th title="Jak často padne (jen počasí)">Váha</th><th></th></tr></thead>
    <tbody>${E.conds.map(c => `<tr><td><input type="text" data-env="name|${c.id}" value="${esc(c.name)}" style="width:96px" aria-label="Název"></td><td>${c.kind === "time" ? "doba" : "počasí"}</td><td>${n("sight", c, 58)}</td><td>${n("mAtt", c, 52)}</td><td>${n("mDef", c, 52)}</td><td>${n("mMov", c, 52)}</td><td>${n("mRange", c, 52)}</td><td>${c.kind === "weather" ? n("w", c, 52) : ""}</td><td><button class="btn small danger" data-envdel="${c.id}" aria-label="Smazat">✕</button></td></tr>`).join("")}</tbody></table></div>
    <div class="row"><button class="btn small" data-envadd="time">+ Denní doba</button><button class="btn small" data-envadd="weather">+ Počasí</button></div>
    <p class="hint">Výhled omezí mlhu války, „Výhled“ a cíle střelby i předmětů. Předmět se světlem (v Komponentách) dovolí nositeli vidět do své vzdálenosti i v noci a mlze. Na stole doba a počasí najdeš v nástroji Kolo.</p>` : ""}</div>`;
}
function wireEnvMech(main, p) {
  const E = p.env; const q = id => document.getElementById(id);
  if (q("envOn")) q("envOn").onchange = e => { E.on = e.target.checked; touch(p); render(); };
  if (q("envCyc")) q("envCyc").onchange = e => { E.cycle = e.target.value; touch(p); };
  if (q("envAuto")) q("envAuto").onchange = e => { E.auto = e.target.checked; touch(p); };
  $$("[data-env]", main).forEach(i => i.addEventListener("change", () => { const [k, id] = i.dataset.env.split("|"); const c = E.conds.find(x => x.id === id); c[k] = k === "name" ? i.value : i.value === "" ? "" : +i.value; touch(p); }));
  $$("[data-envdel]", main).forEach(b => b.onclick = () => { E.conds = E.conds.filter(x => x.id !== b.dataset.envdel); touch(p); render(); });
  $$("[data-envadd]", main).forEach(b => b.onclick = () => { E.conds.push({ id: uid(), name: b.dataset.envadd === "time" ? "Nová doba" : "Nové počasí", kind: b.dataset.envadd, icon: "", w: 1, sight: "", mAtt: 0, mDef: 0, mMov: 0, mRange: 0 }); touch(p); render(); });
}
function envRulebook(p) {
  if (!envOn(p)) return []; const C = p.env.conds;
  return [["Denní doba a počasí", `<p>Denní doba se střídá po kolech: ${esc(envCycle(p).join(" → "))}.${p.env.auto ? " Počasí se na začátku kola losuje." : ""}</p><table><tr><th>Podmínka</th><th>Vliv</th></tr>${C.map(c => `<tr><td>${esc(c.icon || "")} ${esc(c.name)}${c.kind === "weather" && p.env.auto ? ` (váha ${c.w || 0})` : ""}</td><td>${esc(envText(c))}</td></tr>`).join("")}</table><p>Jednotka se světlem vidí do jeho vzdálenosti i v noci a mlze.</p>`]];
}
// Zabarvení mapy podle doby a počasí (noc tmavne, mlha bělá, déšť šedne).
const ENV_TINT = { soumrak: "rgba(90,50,100,.16)", noc: "rgba(15,25,70,.42)", mlha: "rgba(245,245,245,.45)", dest: "rgba(80,100,130,.22)", vitr: "rgba(200,190,150,.10)" };
function envTintHTML(p, t, g) { const c = envNow(p, t).map(x => ENV_TINT[x.id]).filter(Boolean); return c.length ? `<div class="envtint" style="width:${g.W}px;height:${g.H}px;background:${c.map(x => `linear-gradient(${x},${x})`).join(",")}"></div>` : ""; }
