// ---------- Síť míst a cest (Pandemie, Risk, Ticket to Ride) ----------
// Místa jsou body se jménem, cesty je spojují (s cenou pohybu). Na stole se jednotky přichytí k místu a táhnou po cestách.
function normalizeNet(p) {
  p.nets = p.nets || [];
  p.nets.forEach(n => { n.nodes = n.nodes || []; n.links = n.links || []; n.w = +n.w || 900; n.h = +n.h || 600; });
  p.netCubes = Object.assign({ on: false, max: 3, rate: 2, name: "Nákaza", color: "#c0392b" }, p.netCubes || {});
  return p;
}
function tableNet(p) { const t = p.table; return t && t.netId && !t.boardId ? p.nets.find(n => n.id === t.netId) || null : null; }
const netNode = (net, id) => net.nodes.find(n => n.id === id);
function netNeighbors(net, id) { return net.links.filter(l => l.a === id || l.b === id).map(l => ({ id: l.a === id ? l.b : l.a, cost: Math.max(1, +l.cost || 1) })); }
// Nejlevnější cesty z místa (Dijkstra) do hranice max.
function netCosts(net, from, max = Infinity, byHops = false) {
  const best = { [from]: 0 }; const q = [from];
  while (q.length) { q.sort((a, b) => best[a] - best[b]); const k = q.shift(); netNeighbors(net, k).forEach(n => { const c = best[k] + (byHops ? 1 : n.cost); if (c <= max && (best[n.id] == null || c < best[n.id])) { best[n.id] = c; q.push(n.id); } }); }
  return best;
}
function netNodeOf(p, t, it) {
  const net = tableNet(p); if (!net) return null; const [w, h] = itemSize(it); const x = it.x + w / 2 - BX, y = it.y + h / 2 - BY;
  let best = null, bd = 44; net.nodes.forEach(n => { const d = Math.hypot(n.x - x, n.y - y); if (d < bd) { bd = d; best = n.id; } }); return best;
}
function netPlace(p, t, it, id) {
  const net = tableNet(p); const n = netNode(net, id); const [w, h] = itemSize(it); const stack = t.items.filter(o => o !== it && o.kind !== "card" && netNodeOf(p, t, o) === id).length;
  it.x = Math.round(BX + n.x - w / 2 + stack * 7); it.y = Math.round(BY + n.y - h / 2 - stack * 7);
}
function netMove(p, t, it, from) {
  const net = tableNet(p); const to = netNodeOf(p, t, it); const u = unitOf(p, it);
  if (!to) { toast("Polož jednotku na místo"); return false; }
  netPlace(p, t, it, to); if (!from || to === from || !u) return true;
  const msgs = []; const mp = +(it.reduced && hasReduced(u) ? u.rMov : u.mov) || 0; const cost = netCosts(net, from)[to];
  if (cost == null) msgs.push("mezi místy nevede cesta");
  else if (p.ruleset.moveRange && cost > mp) msgs.push(`cesta stojí ${cost}, jednotka má pohyb ${mp}`);
  if (p.ruleset.moveOnce && t.moved[it.uid]) msgs.push("jednotka už v tomto tahu táhla");
  if (msgs.length && !gate(p, t, "pohyb", msgs)) return false;
  t.moved[it.uid] = true; const n = netNode(net, to); logEv(t, `${u.name} jede do místa ${n.name}`); after(p, t, "pohyb", u.factionId, n.name); return true;
}
// Kostičky na místech: při přetečení vznikne ohnisko a kostička se rozšíří do sousedních míst (každé místo jednou za řetěz).
function addCubes(p, t, id, n = 1, chain = new Set()) {
  const net = tableNet(p); if (!net) return; t.cubes = t.cubes || {}; const max = Math.max(1, +p.netCubes.max || 3);
  for (let i = 0; i < n; i++) {
    if ((t.cubes[id] || 0) < max) { t.cubes[id] = (t.cubes[id] || 0) + 1; continue; }
    if (chain.has(id)) return; chain.add(id); t.outbreaks = (t.outbreaks || 0) + 1; const nd = netNode(net, id);
    logEv(t, `ohnisko v místě ${nd.name}`); fireTriggers(p, t, "ohnisko", null, nd.name);
    netNeighbors(net, id).forEach(nb => addCubes(p, t, nb.id, 1, chain));
  }
}
function infect(p, t) { const net = tableNet(p); if (!net || !net.nodes.length) return []; const out = [];
  for (let i = 0; i < Math.max(1, +p.netCubes.rate || 1); i++) { const n = net.nodes[Math.floor(Math.random() * net.nodes.length)]; addCubes(p, t, n.id, 1); out.push(n.name); }
  logEv(t, `${p.netCubes.name}: ${out.join(", ")}`); return out; }
function netVp(p, t, fid) { const net = tableNet(p); if (!net) return 0; return net.nodes.filter(n => (t.control || {})[n.id] === fid).reduce((a, n) => a + (+n.vp || 0), 0); }
function netSVG(p, net, opts = {}) {
  const t = opts.t || {}; const fac = id => p.factions.find(f => f.id === id); const parts = [];
  parts.push(`<svg class="net-svg" ${opts.id ? `id="${opts.id}"` : ""} width="${net.w}" height="${net.h}" viewBox="0 0 ${net.w} ${net.h}" xmlns="http://www.w3.org/2000/svg"><rect width="${net.w}" height="${net.h}" rx="8" fill="#efe9da"/>`);
  net.links.forEach(l => { const a = netNode(net, l.a), b = netNode(net, l.b); if (!a || !b) return; parts.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#6b6253" stroke-width="5" stroke-linecap="round" ${+l.cost > 1 ? 'stroke-dasharray="10 6"' : ""}/>`);
    if (+l.cost > 1) parts.push(`<circle cx="${(a.x + b.x) / 2}" cy="${(a.y + b.y) / 2}" r="10" fill="#fff" stroke="#6b6253"/><text x="${(a.x + b.x) / 2}" y="${(a.y + b.y) / 2 + 4}" text-anchor="middle" class="ncost">${l.cost}</text>`); });
  net.nodes.forEach(n => { const own = t.control && fac(t.control[n.id]); const reach = opts.reach && opts.reach[n.id] != null; const cubes = (t.cubes || {})[n.id] || 0;
    parts.push(`<g class="nnode" data-nid="${n.id}">${reach ? `<circle cx="${n.x}" cy="${n.y}" r="27" fill="#e0aa2e" fill-opacity=".5"/>` : ""}${own ? `<circle cx="${n.x}" cy="${n.y}" r="24" fill="none" stroke="${own.color}" stroke-width="6"/>` : ""}
      <circle cx="${n.x}" cy="${n.y}" r="18" fill="${n.color || "#f6eedb"}" stroke="${opts.sel === n.id || opts.a === n.id ? "#e0aa2e" : "#3b3631"}" stroke-width="${opts.sel === n.id || opts.a === n.id ? 5 : 2.5}"/>
      ${+n.vp ? `<text x="${n.x}" y="${n.y + 5}" text-anchor="middle" class="nvp">${n.vp}</text>` : ""}<text x="${n.x}" y="${n.y + 36}" text-anchor="middle" class="nname">${esc(n.name)}</text>
      ${cubes ? `<g>${Array.from({ length: cubes }, (_, i) => `<rect x="${n.x + 14 + i * 9}" y="${n.y - 26}" width="8" height="8" fill="${p.netCubes.color}" stroke="#000" stroke-width=".8"/>`).join("")}</g>` : ""}
      ${opts.goods && (opts.goods[n.name] || []).length ? `<text x="${n.x}" y="${n.y - 24}" text-anchor="middle" class="ngoods">${esc(opts.goods[n.name].join(" "))}</text>` : ""}</g>`); });
  parts.push(`</svg>`); return parts.join("");
}
// ----- Stůl -----
function sideNet(p, t) {
  const net = tableNet(p); if (!net) return `<p class="hint">Síť míst vyber v nástroji Komponenty (místo herní desky). Vytvoříš ji v záložce Mapa.</p>`;
  const n = S.netSel && netNode(net, S.netSel); const own = n && p.factions.find(f => f.id === (t.control || {})[n.id]);
  const sc = p.factions.map(f => ({ f, n: net.nodes.filter(x => (t.control || {})[x.id] === f.id).length, vp: netVp(p, t, f.id) }));
  return `<section><div class="eyebrow">Síť míst · ${esc(net.name)}</div><p class="hint">Klepni na místo pro detail. Jednotky přetahuj na místa – pohyb vede po cestách.</p>
      ${n ? `<div class="selbar"><b>${esc(n.name)}</b><span class="hint">Sousedí: ${netNeighbors(net, n.id).map(x => esc(netNode(net, x.id).name) + (x.cost > 1 ? ` (${x.cost})` : "")).join(", ") || "nic"}${+n.vp ? ` · ${n.vp} b.` : ""}</span>
        <div class="row"><button class="btn small" id="nOwn">Vlastník: ${own ? esc(own.name) : "nikdo"}</button>${p.netCubes.on ? `<button class="btn small" data-ncube="-1">− ${esc(p.netCubes.name)}</button><b class="mono">${(t.cubes || {})[n.id] || 0}</b><button class="btn small" data-ncube="1">+</button>` : ""}</div></div>` : ""}</section>
    <section><div class="eyebrow">Ovládaná místa</div>${sc.map(x => `<div class="row spread"><span class="row"><span class="dot" style="background:${x.f.color};border-radius:50%"></span>${esc(x.f.name)}</span><span class="mono">${x.n} míst · ${x.vp} b.</span></div>`).join("")}</section>
    ${p.netCubes.on ? `<section><div class="eyebrow">${esc(p.netCubes.name)}</div><div class="row"><button class="btn primary" id="nInfect">Šíření (${p.netCubes.rate}× náhodné místo)</button></div>
      <p class="hint">Nejvýš ${p.netCubes.max} na místě, při dalším vznikne ohnisko a šíří se do sousedních míst. Ohnisek: <b>${t.outbreaks || 0}</b>.</p></section>` : ""}`;
}
function wireNet(main, p, t, save) {
  const q = id => document.getElementById(id); const net = tableNet(p);
  const layer = main.querySelector(".netlayer");
  if (layer) layer.addEventListener("click", e => { const g = e.target.closest("[data-nid]"); if (!g) return; e.stopPropagation(); S.netSel = g.dataset.nid; S.tool = "sit"; render(); });
  if (q("nOwn")) q("nOwn").onclick = () => { t.control = t.control || {}; const ids = p.factions.map(f => f.id); const nx = ids.indexOf(t.control[S.netSel]) + 1; if (nx >= ids.length) delete t.control[S.netSel]; else { t.control[S.netSel] = ids[nx]; fireTriggers(p, t, "kontrola", ids[nx], netNode(net, S.netSel).name); } checkWin(p, t); save(); render(); };
  $$("[data-ncube]", main).forEach(b => b.onclick = () => { const d = +b.dataset.ncube; if (d > 0) addCubes(p, t, S.netSel, 1); else { t.cubes = t.cubes || {}; t.cubes[S.netSel] = Math.max(0, (t.cubes[S.netSel] || 0) - 1); } save(); render(); });
  if (q("nInfect")) q("nInfect").onclick = () => { const r = infect(p, t); save(); render(); toast(`${p.netCubes.name}: ${r.join(", ")}`); };
}
// ----- Editor v záložce Mapa -----
function netEditorHTML(p) {
  if (!p.nets.find(n => n.id === S.netId)) S.netId = p.nets[0] ? p.nets[0].id : null; const net = p.nets.find(n => n.id === S.netId); const M = S.netMode || "add";
  return `<div class="panel"><div class="row spread"><h2>Sítě míst a cest</h2><button class="btn" id="addNet">+ Nová síť</button></div>
    <p class="hint">Mapa z míst spojených cestami (Pandemie, Risk, Ticket to Ride). Na stole ji vybereš místo herní desky.</p>
    ${p.nets.length ? `<div class="decks">${p.nets.map(n => `<button class="chip" data-net="${n.id}" aria-pressed="${n.id === S.netId}">${esc(n.name)} <span class="count">${n.nodes.length} míst</span></button>`).join("")}</div>` : ""}
    ${net ? `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))"><label class="f">Název<input type="text" id="n-name" value="${esc(net.name)}"></label>
        <label class="f">Šířka<input type="number" id="n-w" min="300" max="2000" value="${net.w}"></label><label class="f">Výška<input type="number" id="n-h" min="200" max="1400" value="${net.h}"></label></div>
      <div class="row">${[["add", "Přidat místo"], ["link", "Propojit / rozpojit"], ["move", "Posunout"], ["del", "Smazat místo"]].map(([k, l]) => `<button class="btn small tool ${M === k ? "on" : ""}" data-ntool="${k}">${l}</button>`).join("")}</div>
      <p class="hint">${M === "add" ? "Klepni na prázdné místo plochy." : M === "link" ? (S.netA ? "Teď klepni na druhé místo." : "Klepni na první místo, pak na druhé.") : M === "move" ? "Přetáhni místo." : "Klepni na místo, které chceš smazat."}</p>
      <div class="ed-wrap" id="netWrap">${netSVG(p, net, { id: "netEd", a: S.netA })}</div>
      ${net.nodes.length ? `<div class="eyebrow">Místa</div><div class="list">${net.nodes.map(n => `<div class="item-row"><input type="text" data-nn="${n.id}" value="${esc(n.name)}" style="flex:1;min-width:120px;width:auto" aria-label="Název místa"><label class="f" style="width:80px">Body<input type="number" data-nv="${n.id}" value="${esc(n.vp || "")}"></label><input type="color" data-nc="${n.id}" value="${n.color || "#f6eedb"}" aria-label="Barva místa" style="width:44px;height:36px;border:0;background:none;padding:0"></div>`).join("")}</div>` : ""}
      ${net.links.length ? `<div class="eyebrow">Cesty</div><div class="row">${net.links.map((l, i) => `<span class="pl-chip">${esc((netNode(net, l.a) || {}).name)} – ${esc((netNode(net, l.b) || {}).name)} <input type="number" data-lc="${i}" min="1" max="9" value="${+l.cost || 1}" style="width:52px" aria-label="Cena cesty"></span>`).join("")}</div>` : ""}
      <div class="row"><button class="btn small danger" id="n-del">Smazat síť</button></div>` : `<div class="empty">Zatím žádná síť.</div>`}</div>`;
}
function wireNetEditor(main, p) {
  const q = id => document.getElementById(id); const net = p.nets.find(n => n.id === S.netId);
  q("addNet").onclick = () => { const n = { id: uid(), name: "Síť " + (p.nets.length + 1), w: 900, h: 600, nodes: [], links: [] }; p.nets.push(n); S.netId = n.id; touch(p); render(); };
  $$("[data-net]", main).forEach(b => b.onclick = () => { S.netId = b.dataset.net; S.netA = null; render(); });
  if (!net) return;
  q("n-name").addEventListener("change", e => { net.name = e.target.value; touch(p); render(); });
  q("n-w").addEventListener("change", e => { net.w = Math.max(300, +e.target.value || 900); touch(p); render(); }); q("n-h").addEventListener("change", e => { net.h = Math.max(200, +e.target.value || 600); touch(p); render(); });
  $$("[data-ntool]", main).forEach(b => b.onclick = () => { S.netMode = b.dataset.ntool; S.netA = null; render(); });
  $$("[data-nn]", main).forEach(i => i.addEventListener("change", () => { netNode(net, i.dataset.nn).name = i.value; touch(p); render(); }));
  $$("[data-nv]", main).forEach(i => i.addEventListener("change", () => { netNode(net, i.dataset.nv).vp = +i.value || 0; touch(p); render(); }));
  $$("[data-nc]", main).forEach(i => i.addEventListener("change", () => { netNode(net, i.dataset.nc).color = i.value; touch(p); render(); }));
  $$("[data-lc]", main).forEach(i => i.addEventListener("change", () => { net.links[+i.dataset.lc].cost = Math.max(1, +i.value || 1); touch(p); render(); }));
  q("n-del").onclick = () => confirmDialog("Smazat síť?", "Místa a cesty se smažou.", "Smazat", () => { p.nets = p.nets.filter(n => n !== net); touch(p); render(); });
  const svg = q("netEd"); const M = S.netMode || "add";
  const pt = e => { const r = (q("netEd") || svg).getBoundingClientRect(); return [Math.round((e.clientX - r.left) * net.w / r.width), Math.round((e.clientY - r.top) * net.h / r.height)]; };
  svg.addEventListener("pointerdown", e => {
    const g = e.target.closest("[data-nid]"); const id = g && g.dataset.nid;
    if (M === "add" && !id) { const [x, y] = pt(e); net.nodes.push({ id: uid(), name: "Místo " + (net.nodes.length + 1), x, y, vp: 0 }); touch(p); render(); }
    else if (M === "del" && id) { net.nodes = net.nodes.filter(n => n.id !== id); net.links = net.links.filter(l => l.a !== id && l.b !== id); touch(p); render(); }
    else if (M === "link" && id) { if (!S.netA) { S.netA = id; render(); return; } if (S.netA !== id) { const i = net.links.findIndex(l => (l.a === S.netA && l.b === id) || (l.b === S.netA && l.a === id)); if (i >= 0) net.links.splice(i, 1); else net.links.push({ a: S.netA, b: id, cost: 1 }); } S.netA = null; touch(p); render(); }
    else if (M === "move" && id) { e.preventDefault(); const n = netNode(net, id);
      const mv = ev => { const [x, y] = pt(ev); n.x = Math.max(20, Math.min(net.w - 20, x)); n.y = Math.max(20, Math.min(net.h - 40, y)); const w = q("netWrap"); w.innerHTML = netSVG(p, net, { id: "netEd" }); };
      const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); touch(p); render(); }; window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up); }
  });
}
function netCubesMechHTML(p) {
  const C = p.netCubes;
  return `<div class="panel"><h2>Kostičky na místech (šíření)</h2>
    <label class="chk"><input type="checkbox" id="ncOn" ${C.on ? "checked" : ""}> Na místa sítě se přidávají kostičky, při přetečení vznikne ohnisko (Pandemie)</label>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))"><label class="f">Název<input type="text" id="ncName" value="${esc(C.name)}"></label>
      <label class="f">Nejvýš na místě<input type="number" id="ncMax" min="1" max="9" value="${+C.max || 3}"></label><label class="f">Míst za šíření<input type="number" id="ncRate" min="1" max="9" value="${+C.rate || 2}"></label>
      <label class="f">Barva<input type="color" id="ncCol" value="${C.color}" style="width:52px;height:40px;border:0;background:none;padding:0"></label></div>
    <p class="hint">Na ohnisko můžeš navázat automatické pravidlo „Ohnisko v místě“. Místa sítě mohou mít body – kdo místo ovládá, započítají se mu.</p></div>`;
}
function wireNetCubesMech(main, p) {
  const ch = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener("change", () => { fn(el); touch(p); }); };
  ch("ncOn", e => { p.netCubes.on = e.checked; }); ch("ncName", e => { p.netCubes.name = e.value || "Nákaza"; }); ch("ncMax", e => { p.netCubes.max = Math.max(1, +e.value || 3); }); ch("ncRate", e => { p.netCubes.rate = Math.max(1, +e.value || 2); }); ch("ncCol", e => { p.netCubes.color = e.value; });
}
