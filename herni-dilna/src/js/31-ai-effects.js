// ---------- Claude: text karty → efekt ----------
const DSL_HELP = `Zápis efektu (příkazy odděl středníkem, uvnitř volby/podmínky/platby čárkou):
+2 Zdroj | -1 Zdroj | všichni +1 Zdroj | ostatní -1 Zdroj | soupeř -1 Zdroj
líznout 2 | líznout 1 z Balíček | táhnout 2 z Sáček | posun +3 | ostatní posun -2 | událost z Balíček
vyber: +2 Mince | líznout 1   (volba hráče)
pokud Mince >= 3: +1 Body, líznout 1   (podmínka; také ruka, kolo, skóre)
zaplať 1 Dřevo + 1 Cihly: +1 Body   (platba)
nastav Mince 0 | odhodit 1 | zpráva Text | vítěz
Na začátek lze dát: jednou za kolo: … / jednou za tah: … / jednou za hru: …`;
function aiContext(p) {
  return `Zdroje: ${p.resources.map(r => r.name).join(", ") || "žádné"}. Balíčky: ${p.decks.map(d => d.name).join(", ") || "žádné"}. Sáčky: ${p.bags.map(b => b.name).join(", ") || "žádné"}.${+p.track.length ? " Hra má závodní dráhu." : ""}`;
}
// items: [{id, text}] → { id: efekt }
async function aiEffects(p, items) {
  const sample = await cap("sample"); if (!sample) throw { code: "unavailable" };
  const res = await sample.json(`Převeď texty herních karet do jednoduchého zápisu efektů, kterému rozumí aplikace. Použij jen níže povolené příkazy a jen zdroje, balíčky a sáčky, které hra má. Když se část textu zapsat nedá (např. pravidlo pro pohyb), vynech ji. Když nejde zapsat nic, vrať prázdný řetězec.
${DSL_HELP}
${aiContext(p)}
Vrať POUZE JSON {"effects":[{"id":"...","effect":"..."}]}.
Karty:
${items.map(x => `- id ${x.id}: ${x.text.replace(/\n/g, " ")}`).join("\n")}`, { modelTier: "default" });
  const out = {}; ((res && res.effects) || []).forEach(e => { if (e && e.id) out[e.id] = String(e.effect || "").trim(); });
  return out;
}
async function aiEffectForCard(p, c, input, status) {
  status.textContent = "Claude převádí text…";
  try { const r = await aiEffects(p, [{ id: "x", text: `${c.title}: ${c.text}` }]); const e = r.x || ""; input.value = e; input.dispatchEvent(new Event("input", { bubbles: true }));
    const bad = checkEffect(p, e); status.textContent = !e ? "Text se nedá zapsat jako efekt." : bad.length ? "Pozor: " + bad.join(", ") : "Hotovo – zkontroluj zápis."; }
  catch (e) { status.textContent = e && e.code === "unavailable" ? "Funguje jen v aplikaci Claude (claude.ai)." : aiErr(e); }
}
async function aiFillDeck(p, deck) {
  const todo = deck.cards.filter(c => !String(c.effect || "").trim() && String(c.text || "").trim());
  if (!todo.length) { toast("Všechny karty s textem už efekt mají"); return; }
  const d = openDialog(`<h2>Doplnit efekty z textu</h2><p class="hint">Claude převádí ${todo.length} ${plural(todo.length, "kartu", "karty", "karet")}…</p><div id="aiFillBox"></div><div class="row" style="justify-content:flex-end"><button class="btn" data-close>Zavřít</button></div>`, true);
  try {
    const r = await aiEffects(p, todo.slice(0, 40).map(c => ({ id: c.id, text: `${c.title}: ${c.text}` })));
    const rows = todo.filter(c => r[c.id]);
    $("#aiFillBox", d).innerHTML = rows.length ? `<div class="list">${rows.map(c => { const bad = checkEffect(p, r[c.id]); return `<label class="item-row"><input type="checkbox" data-aif="${c.id}" ${bad.length ? "" : "checked"} style="width:22px;height:22px"><span style="flex:1;min-width:0"><b>${esc(c.title)}</b><br><span class="hint">${esc(c.text)}</span><br><code>${esc(r[c.id])}</code>${bad.length ? `<br><span style="color:var(--danger)">${esc(bad.join(", "))}</span>` : ""}</span></label>`; }).join("")}</div>
      <button class="btn primary" id="aiFillOk">Použít vybrané</button>` : `<p>Žádný text se nedal zapsat jako efekt.</p>`;
    if ($("#aiFillOk", d)) $("#aiFillOk", d).onclick = () => { let n = 0; $$("[data-aif]", d).forEach(i => { if (!i.checked) return; const c = deck.cards.find(x => x.id === i.dataset.aif); c.effect = r[c.id]; n++; }); touch(p); closeDialog(); render(); toast(`Efekty doplněny: ${n}`); };
  } catch (e) { $("#aiFillBox", d).innerHTML = `<p class="hint">${esc(e && e.code === "unavailable" ? "Funguje jen v aplikaci Claude (claude.ai)." : aiErr(e))}</p>`; }
}
