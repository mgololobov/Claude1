// ---------- Rozvoz zboží (pick-up and deliver) ----------
// Zakázka říká: dovez zboží z místa A do místa B za odměnu. Při otočení zakázky se zboží objeví v místě A,
// jednotka ho naloží (do své kapacity) a v místě B doručí. Místo = místo sítě, popisek pole mapy nebo karta lokace.
function normalizeDeliver(p) {
  p.deliver = Object.assign({ on: false, cap: 2, open: 3 }, p.deliver || {}); p.contracts = p.contracts || [];
  return p;
}
function locName(p, t, it) {
  const net = tableNet(p); if (net) { const id = netNodeOf(p, t, it); return id ? netNode(net, id).name : ""; }
  if (cmapOn(p, t)) { const i = cmapIndexOf(p, t, it); return i == null ? "" : (t.cmap.cards[i].rev ? cmapCard(p, t, i).title : ""); }
  const b = tableBoard(p); const k = b && cellUnder(p, it); return k ? (b.labels[k] || "") : "";
}
const same = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
function dlStart(p, t) { t.dl = { deck: shuffle(p.contracts.flatMap(c => Array.from({ length: Math.max(1, +c.qty || 1) }, () => c.id))), open: [], done: 0 }; t.goods = {}; dlRefill(p, t); }
function dlRefill(p, t) {
  if (!t.dl) return; while (t.dl.open.length < Math.max(1, +p.deliver.open || 3) && t.dl.deck.length) { const id = t.dl.deck.pop(); const c = p.contracts.find(x => x.id === id); if (!c) continue;
    t.dl.open.push(id); (t.goods[c.from] = t.goods[c.from] || []).push(c.good); logEv(t, `nová zakázka: ${c.good} z ${c.from} do ${c.to}`); }
}
const capOf = (p, it) => +(unitOf(p, it) || {}).cap || +p.deliver.cap || 2;
function loadGood(p, t, it, good) {
  const loc = locName(p, t, it); const g = t.goods[loc] || []; const i = g.findIndex(x => same(x, good)); it.cargo = it.cargo || [];
  if (i < 0 || it.cargo.length >= capOf(p, it)) return false; g.splice(i, 1); it.cargo.push(good); logEv(t, `${unitOf(p, it).name} nakládá ${good} v ${loc}`); return true;
}
function deliverables(p, t, it) { const loc = locName(p, t, it); return ((t.dl || {}).open || []).map(id => p.contracts.find(c => c.id === id)).filter(c => c && same(c.to, loc) && (it.cargo || []).some(g => same(g, c.good))); }
function deliverGood(p, t, it, cid) {
  const c = deliverables(p, t, it).find(x => x.id === cid); if (!c) return false; const u = unitOf(p, it);
  it.cargo.splice(it.cargo.findIndex(g => same(g, c.good)), 1); t.dl.open.splice(t.dl.open.indexOf(c.id), 1); t.dl.done++;
  logEv(t, `${u.name} doručuje ${c.good} do ${c.to}`); if (c.reward) runEffects(p, t, u.factionId, c.reward, `Zakázka ${c.good} → ${c.to}`); fireTriggers(p, t, "doruceni", u.factionId, c.to);
  dlRefill(p, t); checkWin(p, t); return true;
}
function deliverSelHTML(p, i) {
  if (!p.deliver.on || !p.table || !p.table.dl) return ""; const t = p.table; const loc = locName(p, t, i); const cargo = i.cargo || []; const here = t.goods[loc] || []; const dv = deliverables(p, t, i);
  return `<div class="row"><span class="hint">Náklad ${cargo.length}/${capOf(p, i)}${cargo.length ? ": " + esc(cargo.join(", ")) : ""}${loc ? ` · ${esc(loc)}` : ""}</span></div>
    ${here.length || dv.length ? `<div class="row">${[...new Set(here)].map(g => `<button class="btn small" data-load="${esc(g)}" ${cargo.length >= capOf(p, i) ? "disabled" : ""}>Naložit ${esc(g)}</button>`).join("")}${dv.map(c => `<button class="btn small primary" data-deliver="${c.id}">Doručit ${esc(c.good)}${c.reward ? ` (${esc(c.reward)})` : ""}</button>`).join("")}</div>` : ""}`;
}
function sideDeliver(p, t) {
  if (!p.contracts.length) return `<p class="hint">Zakázky nadefinuješ v Mechanikách (zboží, odkud, kam, odměna).</p>`;
  if (!t.dl) return `<section><div class="eyebrow">Rozvoz zboží</div><p class="hint">${p.contracts.length} ${plural(p.contracts.length, "zakázka", "zakázky", "zakázek")} v balíčku, otevřené budou vždy ${p.deliver.open}.</p><button class="btn primary" id="dlStart">Začít – otočit zakázky</button></section>`;
  const open = t.dl.open.map(id => p.contracts.find(c => c.id === id)).filter(Boolean); const goods = Object.entries(t.goods || {}).filter(([, g]) => g.length);
  return `<section><div class="eyebrow">Otevřené zakázky</div>${open.map(c => `<div class="selbar"><b>${esc(c.good)}: ${esc(c.from)} → ${esc(c.to)}</b>${c.reward ? `<span class="hint">Odměna: ${esc(describeEffect(c.reward))}</span>` : ""}</div>`).join("") || `<span class="hint">Žádná otevřená zakázka.</span>`}
      <p class="hint">V balíčku ${t.dl.deck.length} · splněno ${t.dl.done}. Vyber jednotku na stole – u ní naložíš a doručíš.</p></section>
    ${goods.length ? `<section><div class="eyebrow">Zboží čeká</div>${goods.map(([l, g]) => `<div class="row spread"><span>${esc(l)}</span><span class="mono">${esc(g.join(", "))}</span></div>`).join("")}</section>` : ""}
    <section><button class="btn small" id="dlStart">Začít znovu</button></section>`;
}
function wireDeliver(main, p, t, save) {
  const q = id => document.getElementById(id); const sel = t.items.find(i => i.uid === S.sel);
  if (q("dlStart")) q("dlStart").onclick = () => { dlStart(p, t); save(); render(); };
  $$("[data-load]", main).forEach(b => b.onclick = () => { if (loadGood(p, t, sel, b.dataset.load)) { save(); render(); } });
  $$("[data-deliver]", main).forEach(b => b.onclick = () => { if (deliverGood(p, t, sel, b.dataset.deliver)) { save(); render(); toast("Zakázka splněna"); } });
}
function deliverMechHTML(p) {
  return `<div class="panel"><h2>Rozvoz zboží</h2>
    <label class="chk"><input type="checkbox" id="dlOn" ${p.deliver.on ? "checked" : ""}> Jednotky vozí zboží podle zakázek (pick-up and deliver)</label>
    <div class="grid" style="grid-template-columns:1fr 1fr"><label class="f">Kapacita jednotky (výchozí)<input type="number" id="dlCap" min="1" max="12" value="${+p.deliver.cap || 2}"></label><label class="f">Otevřených zakázek<input type="number" id="dlOpen" min="1" max="8" value="${+p.deliver.open || 3}"></label></div>
    <p class="hint">Místa piš jako názvy míst sítě, popisky polí mapy nebo názvy karet lokací. Kapacitu jednotky změníš v jejím editoru (Náklad).</p>
    <div class="list">${p.contracts.map(c => `<div class="item-row"><input type="text" data-ck="good|${c.id}" value="${esc(c.good)}" placeholder="Zboží" style="width:100px" aria-label="Zboží"><input type="text" data-ck="from|${c.id}" value="${esc(c.from)}" placeholder="Odkud" style="width:110px" aria-label="Odkud"><span>→</span><input type="text" data-ck="to|${c.id}" value="${esc(c.to)}" placeholder="Kam" style="width:110px" aria-label="Kam"><input type="text" data-ck="reward|${c.id}" value="${esc(c.reward)}" placeholder="+3 Zlato" style="flex:1;min-width:90px;width:auto" aria-label="Odměna"><input type="number" data-ck="qty|${c.id}" value="${+c.qty || 1}" min="1" max="9" style="width:56px" aria-label="Počet"><button class="btn small danger" data-ckdel="${c.id}" aria-label="Smazat">✕</button></div>`).join("")}</div>
    <button class="btn small" id="ctAdd">+ Zakázka</button></div>`;
}
function wireDeliverMech(main, p) {
  const ch = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener("change", () => { fn(el); touch(p); }); };
  ch("dlOn", e => { p.deliver.on = e.checked; }); ch("dlCap", e => { p.deliver.cap = Math.max(1, +e.value || 2); }); ch("dlOpen", e => { p.deliver.open = Math.max(1, +e.value || 3); });
  document.getElementById("ctAdd").onclick = () => { p.contracts.push({ id: uid(), good: "", from: "", to: "", reward: "+2 Body", qty: 1 }); touch(p); render(); };
  $$("[data-ck]", main).forEach(i => i.addEventListener("change", () => { const [k, id] = i.dataset.ck.split("|"); const c = p.contracts.find(x => x.id === id); c[k] = k === "qty" ? Math.max(1, +i.value || 1) : i.value; touch(p); }));
  $$("[data-ckdel]", main).forEach(b => b.onclick = () => { p.contracts = p.contracts.filter(c => c.id !== b.dataset.ckdel); touch(p); render(); });
}
