// ---------- Text karty → efekt (bez připojení, pravidly) ----------
// Rozpozná běžné české formulace („Získáš 2 zlata“, „Lízni 1 kartu“, „Všichni +1 {Mince}“, „Zaplať 2 dřeva a získej 3 body“, „Vyber si: … nebo …“)
// a přepíše je do jazyka efektů. Co nepozná, vynechá; výsledek se vždy ověří kontrolou efektů.
const DSL_HELP = `Zápis efektu (příkazy odděl středníkem, uvnitř volby/podmínky/platby čárkou):
+2 Zdroj | -1 Zdroj | všichni +1 Zdroj | ostatní -1 Zdroj | soupeř -1 Zdroj
líznout 2 | líznout 1 z Balíček | táhnout 2 z Sáček | posun +3 | ostatní posun -2 | událost z Balíček
vyber: +2 Mince | líznout 1   (volba hráče)
pokud Mince >= 3: +1 Body, líznout 1   (podmínka; také ruka, kolo, skóre)
zaplať 1 Dřevo + 1 Cihly: +1 Body   (platba)
nastav Mince 0 | odhodit 1 | vyhostit 1 (karta z ruky ze hry) | zpráva Text | vítěz | první hráč (začíná příští kolo)
Na začátek lze dát: jednou za kolo: … / jednou za tah: … / jednou za hru: …`;
const NUMW = { jeden: 1, jedna: 1, jedno: 1, jednu: 1, dva: 2, dvě: 2, tři: 3, čtyři: 4, pět: 5, šest: 6, sedm: 7, osm: 8, devět: 9, deset: 10 };
const stem = w => String(w || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "").slice(0, 4);
// Najde jméno (zdroje, balíčku, sáčku) podle kmene slova – „zlata“, „zlaťáky“ → Zlato; „body“, „bodů“ → Body.
function findByStem(list, word) {
  const w = String(word || "").replace(/[{}]/g, "").trim(); if (!w) return null; const lw = w.toLowerCase();
  return list.find(x => x.name.toLowerCase() === lw) || list.find(x => stem(x.name) && stem(x.name) === stem(w)) || list.find(x => stem(x.name).length >= 3 && stem(w).startsWith(stem(x.name).slice(0, 3))) || null;
}
function resWord(p, word) { if (/^ct[ií]$/i.test(String(word).replace(/[{}]/g, ""))) word = "čest"; const r = findByStem(p.resources, word) || (/^bod/i.test(word) ? p.resources.find(x => x.vp) : null); return r ? r.name : null; }
const num = s => { const t = String(s || "").toLowerCase(); return /^\d+$/.test(t) ? +t : NUMW[t] || null; };
// Jedna věta / klauzule → příkaz efektu (nebo null).
function clauseToEffect(p, c) {
  c = c.trim().replace(/^[–•]\s*/, "").replace(/\.$/, "").replace(/^(?:odměna|zisk|bonus|efekt)\s*:\s*/i, "").replace(/^a\s+/i, ""); if (!c) return null; let m; const N = "(\\d+|jeden|jedna|jedno|jednu|dva|dvě|tři|čtyři|pět|šest|sedm|osm|devět|deset)";
  const who = c.match(/^(všichni(?: hráči)?|ostatní(?: hráči)?|každý soupeř|soupeři|soupeř|protihráč)\s*(?:získají|získá|ztratí|ztrácí|dostanou|dostane)?\s*/i);
  let pre = ""; if (who) { pre = /^všichni/i.test(who[1]) ? "všichni " : /^(ostatní|soupeři|každý)/i.test(who[1]) ? "ostatní " : "soupeř "; c = c.slice(who[0].length); if (/ztrat|ztrác/i.test(who[0])) c = "-" + c.replace(/^\+/, ""); }
  // platba: „zaplať 2 dřeva a získej 3 body“, „za 2 dřeva získej …“
  if ((m = c.match(new RegExp(`^(?:zaplať|odevzdej|za)\\s+${N}\\s+(\\{?[\\p{L}]+\\}?)\\s*(?:a|:|,)?\\s*(.+)$`, "iu")))) { const r = resWord(p, m[2]); const rest = clauseToEffect(p, m[3]); if (r && rest) return `zaplať ${num(m[1])} ${r}: ${rest}`; }
  // volba: „vyber si: A, nebo B“ / „A nebo B“
  if ((m = c.match(/^(?:vyber(?: si)?|zvol(?: si)?)\s*(?:jedno)?\s*:?\s*(.+)$/i)) || / nebo /i.test(c) && !/^pokud/i.test(c)) { const body = m ? m[1] : c; const opts = body.split(/\s*(?:,\s*)?nebo\s*|\s*\|\s*/i).map(x => clauseToEffect(p, x)).filter(Boolean); if (opts.length >= 2) return pre + "vyber: " + opts.join(" | "); }
  if ((m = c.match(new RegExp(`^(?:získej|získáš|získáte|získá|dostaneš|dostaň|vezmi si|vezmi|přidej si|\\+)\\s*${N}\\s*[×x]?\\s*(\\{?[\\p{L}]+\\}?)`, "iu")))) { const r = resWord(p, m[2]); if (r) return `${pre}+${num(m[1])} ${r}`; }
  if ((m = c.match(new RegExp(`^(?:ztrať|ztratíš|ztrácíš|odevzdej|zaplať|-|−)\\s*${N}\\s*[×x]?\\s*(\\{?[\\p{L}]+\\}?)`, "iu")))) { const r = resWord(p, m[2]); if (r) return `${pre}-${num(m[1])} ${r}`; }
  if ((m = c.match(new RegExp(`^(?:lízni|líznout|lízneš|dober|doberte|vezmi)\\s*(?:si)?\\s*${N}?\\s*(?:kart[auyě]?|karet)?(?:\\s+z\\s+(?:balíčku\\s+)?(\\{?[\\p{L}]+\\}?))?`, "iu")))) { const n = num(m[1]) || 1; const d = m[2] && findByStem(p.decks, m[2]); if (/^vezmi/i.test(c) && !/kart/i.test(c)) { /* „vezmi 2 mince“ už řeší získej */ } else return `${pre}líznout ${n}${d ? " z " + d.name : ""}`; }
  if ((m = c.match(new RegExp(`^(?:táhni|táhnout|vytáhni)\\s*${N}?\\s*[\\p{L}]*\\s+z\\s+(?:\\p{L}+\\s+)?(\\{?[\\p{L}]+\\}?)`, "iu")))) { const b = findByStem(p.bags, m[2]); if (b) return `${pre}táhnout ${num(m[1]) || 1} z ${b.name}`; }
  if ((m = c.match(new RegExp(`^(?:posuň(?: se)?|postup|jdi)\\s*(?:o)?\\s*${N}\\s*(?:pol[eíí]|krok)?`, "iu")))) return `${pre}posun +${num(m[1])}`;
  if ((m = c.match(new RegExp(`^(?:vrať se|ustup)\\s*(?:o)?\\s*${N}`, "iu")))) return `${pre}posun -${num(m[1])}`;
  if ((m = c.match(new RegExp(`^(?:odhoď|odhoďte)\\s*${N}?`, "iu")))) return `odhodit ${num(m[1]) || 1}`;
  if ((m = c.match(new RegExp(`^(?:vyhosti|vyřaď ze hry|zahoď ze hry)\\s*${N}?`, "iu")))) return `vyhostit ${num(m[1]) || 1}`;
  if (/^(?:kart[au]|jednu kartu)$/i.test(c)) return `${pre}líznout 1`;
  // holý počet: „2 runy“, „3 síly“ → zisk
  if ((m = c.match(new RegExp(`^${N}\\s*[×x]?\\s*(\\{?[\\p{L}]+\\}?)$`, "iu")))) { const r = resWord(p, m[2]); if (r) return `${pre}+${num(m[1])} ${r}`; }
  if (/^(?:staneš se|budeš)\s+prvním hráčem|^začínáš/i.test(c)) return "první hráč";
  if ((m = c.match(/^(?:otoč|vylož)\s+událost(?:\s+z\s+(\p{L}+))?/iu))) { const d = m[1] && findByStem(p.decks, m[1]); return "událost" + (d ? " z " + d.name : ""); }
  // zápis „+2 {Mince}“ / „-1 Body“ přímo v textu
  if ((m = c.match(/^([+−-])\s*(\d+)\s*[×x]?\s*(\{?[\p{L}]+\}?)/u))) { const r = resWord(p, m[3]); if (r) return `${pre}${m[1] === "+" ? "+" : "-"}${m[2]} ${r}`; }
  return null;
}
function textToEffect(p, text) {
  let body = String(text || "").replace(/\{([^}]+)\}/g, "$1").replace(/\s+/g, " ").trim(); if (!body) return ""; let lead = "";
  const once = body.match(/^jednou za (kolo|tah|hru)\s*[:,]?\s*/i); if (once) { lead = `jednou za ${once[1].toLowerCase()}: `; body = body.slice(once[0].length); }
  const parts = []; body.split(/(?<=[.;!])\s+|;\s*/).forEach(sent => {
    // „Získej 2 mince a lízni 1 kartu“ → dvě části; volby a platby nechá vcelku
    const pieces = /nebo|vyber|zvol|zaplať|^za /i.test(sent) ? [sent] : sent.split(/\s*,\s*|\s+a\s+(?=[\p{L}\d+−-])/u);
    pieces.forEach(x => { const e = clauseToEffect(p, x); if (e && !checkEffect(p, e).length) parts.push(e); }); });
  return parts.length ? lead + parts.join("; ") : "";
}
function textEffectForCard(p, c, input, status) {
  const e = textToEffect(p, `${c.text || ""}`); input.value = e; input.dispatchEvent(new Event("input", { bubbles: true }));
  status.textContent = e ? "Hotovo – zkontroluj zápis (převod podle pravidel, bez AI)." : "Text se nepodařilo přepsat – zapiš efekt ručně (nápověda v záložce Pravidla).";
}
function fillDeckEffects(p, deck) {
  const todo = deck.cards.filter(c => !String(c.effect || "").trim() && String(c.text || "").trim());
  if (!todo.length) { toast("Všechny karty s textem už efekt mají"); return; }
  const rows = todo.map(c => [c, textToEffect(p, c.text)]).filter(([, e]) => e);
  const d = openDialog(`<h2>Doplnit efekty z textu</h2><p class="hint">Převod podle pravidel (bez AI) – ${rows.length} z ${todo.length} ${plural(todo.length, "karty", "karet", "karet")} se podařilo přepsat. Zkontroluj a potvrď.</p>
    ${rows.length ? `<div class="list">${rows.map(([c, e]) => `<label class="item-row"><input type="checkbox" data-aif="${c.id}" checked style="width:22px;height:22px"><span style="flex:1;min-width:0"><b>${esc(c.title)}</b><br><span class="hint">${esc(c.text)}</span><br><code>${esc(e)}</code></span></label>`).join("")}</div>
    <button class="btn primary" id="aiFillOk">Použít vybrané</button>` : `<p>Žádný text se nedal přepsat – efekty zapiš ručně.</p>`}
    <div class="row" style="justify-content:flex-end"><button class="btn" data-close>Zavřít</button></div>`, true);
  const map = Object.fromEntries(rows.map(([c, e]) => [c.id, e]));
  if ($("#aiFillOk", d)) $("#aiFillOk", d).onclick = () => { let n = 0; $$("[data-aif]", d).forEach(i => { if (!i.checked) return; const c = deck.cards.find(x => x.id === i.dataset.aif); c.effect = map[c.id]; n++; }); touch(p); closeDialog(); render(); toast(`Efekty doplněny: ${n}`); };
}
