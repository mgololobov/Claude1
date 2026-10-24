// ---------- Analýza ----------
const LNF = [0]; function lnf(n) { for (let i = LNF.length; i <= n; i++) LNF[i] = LNF[i - 1] + Math.log(i); return LNF[n]; }
function lnC(n, k) { return k < 0 || k > n ? -Infinity : lnf(n) - lnf(k) - lnf(n - k); }
function hyperPMF(N, K, n, i) { return Math.exp(lnC(K, i) + lnC(N - K, n - i) - lnC(N, n)); }
function binPMF(n, p, k) { return Math.exp(lnC(n, k) + k * Math.log(p || 1e-300) + (n - k) * Math.log(1 - p || 1e-300)); }
function diceDist(N, S) { let d = [1]; for (let i = 0; i < N; i++) { const nd = new Array(d.length + S).fill(0); d.forEach((v, s) => { for (let f = 1; f <= S; f++) nd[s + f] += v / S; }); d = nd; } return d; }
const pct = v => (v * 100).toLocaleString("cs-CZ", { maximumFractionDigits: v < .01 ? 2 : 1 }) + " %";
function renderAnalysis(main, p) {
  const A = S.an = S.an || { N: 40, K: 4, n: 7, k: 1, dN: 2, dS: 6, dT: 7, hN: 3, hH: 5, hK: 1 };
  if (!p.decks.find(d => d.id === A.deckId)) A.deckId = p.decks[0] ? p.decks[0].id : null;
  const deck = p.decks.find(d => d.id === A.deckId);
  const cards = deck ? deck.cards.flatMap(c => Array.from({ length: +c.qty || 0 }, () => c)) : [];
  const group = key => { const g = {}; cards.forEach(c => { const k = String(c[key] ?? "").trim() || "–"; g[k] = (g[k] || 0) + 1; }); return Object.entries(g).sort((a, b) => b[1] - a[1]); };
  const costs = cards.map(c => parseFloat(c.cost)).filter(v => !isNaN(v));
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const costHist = {}; costs.forEach(v => costHist[v] = (costHist[v] || 0) + 1);
  const eff = deck ? deck.cards.filter(c => parseFloat(c.cost) > 0 && !isNaN(parseFloat(c.vp))).map(c => ({ c, r: parseFloat(c.vp) / parseFloat(c.cost) })).sort((a, b) => b.r - a.r) : [];
  const bar = (label, val, max, txt) => `<div class="bar"><span class="n" title="${esc(label)}">${esc(label)}</span><span class="tr"><span class="fl" style="width:${max ? Math.round(val / max * 100) : 0}%"></span></span><span class="v">${txt}</span></div>`;
  // hypergeometrie
  const N = Math.max(1, +A.N || 1), K = Math.max(0, Math.min(N, +A.K || 0)), n = Math.max(0, Math.min(N, +A.n || 0)), k = Math.max(0, +A.k || 0);
  const pmf = Array.from({ length: Math.min(n, K) + 1 }, (_, i) => hyperPMF(N, K, n, i));
  const atLeast = i => pmf.slice(i).reduce((a, v) => a + v, 0);
  const presets = [];
  p.decks.forEach(d => { const tot = d.cards.reduce((a, c) => a + (+c.qty || 0), 0); if (!tot) return;
    d.cards.forEach(c => presets.push({ l: `${d.name}: ${c.title} (${c.qty}/${tot})`, N: tot, K: +c.qty || 0 }));
    ["type", "suit"].forEach(key => { const g = {}; d.cards.forEach(c => { if (c[key]) g[c[key]] = (g[c[key]] || 0) + (+c.qty || 0); }); Object.entries(g).forEach(([v, cnt]) => presets.push({ l: `${d.name}: ${key === "type" ? "typ" : "barva"} ${v} (${cnt}/${tot})`, N: tot, K: cnt })); }); });
  p.bags.forEach(b => { const tot = b.contents.reduce((a, c) => a + (+c.count || 0), 0); b.contents.forEach(c => presets.push({ l: `Sáček ${b.name}: ${c.label} (${c.count}/${tot})`, N: tot, K: +c.count || 0 })); });
  // kostky
  const dN = Math.max(1, Math.min(20, +A.dN || 1)), dS = Math.max(2, Math.min(100, +A.dS || 6)), dT = +A.dT || 0;
  const dist = diceDist(dN, dS); const pGe = dist.reduce((a, v, s) => a + (s >= dT ? v : 0), 0);
  const maxD = Math.max(...dist); const exp = dN * (dS + 1) / 2;
  const hN = Math.max(1, Math.min(40, +A.hN || 1)), hH = Math.max(1, Math.min(6, +A.hH || 5)), hp = (7 - hH) / 6, hK = Math.max(0, +A.hK || 0);
  const hits = Array.from({ length: hN + 1 }, (_, i) => binPMF(hN, hp, i));
  // CRT
  const crt = p.crt; const outs = [...new Set(crt.rows.flat().filter(Boolean))];
  main.innerHTML = `<div class="page">
    ${exampleBanner(p)}
    <div><h2>Analýza a vyvážení</h2><p class="hint" style="margin-top:4px">Simulace, pravděpodobnosti a statistiky, které pomůžou nastavit počty karet, kostky a bojovou tabulku ještě před testem.</p></div>
    ${simPanelHTML(p)}
    <div class="two">
      <div class="panel"><div class="row spread"><h3>Složení balíčku</h3>${p.decks.length ? `<select id="anDeck" style="width:auto">${p.decks.map(d => `<option value="${d.id}" ${d.id === A.deckId ? "selected" : ""}>${esc(d.name)}</option>`).join("")}</select>` : ""}</div>
        ${deck && cards.length ? `<div class="stat-row"><div class="stat"><span class="eyebrow">Karet</span><b>${cards.length}</b></div><div class="stat"><span class="eyebrow">Průměrná cena</span><b>${avg(costs).toLocaleString("cs-CZ", { maximumFractionDigits: 1 })}</b></div>
          <div class="stat"><span class="eyebrow">Průměr bodů</span><b>${avg(cards.map(c => parseFloat(c.vp)).filter(v => !isNaN(v))).toLocaleString("cs-CZ", { maximumFractionDigits: 1 })}</b></div></div>
          <div class="eyebrow">Podle typu</div><div class="bars">${group("type").map(([k, v]) => bar(k, v, cards.length, `${v} · ${Math.round(v / cards.length * 100)} %`)).join("")}</div>
          ${group("suit").some(([k]) => k !== "–") ? `<div class="eyebrow">Podle barvy</div><div class="bars">${group("suit").map(([k, v]) => bar(k, v, cards.length, `${v}`)).join("")}</div>` : ""}
          ${costs.length ? `<div class="eyebrow">Křivka cen</div><div class="bars">${Object.entries(costHist).sort((a, b) => a[0] - b[0]).map(([k, v]) => bar("cena " + k, v, Math.max(...Object.values(costHist)), `${v}`)).join("")}</div>` : ""}
          ${eff.length ? `<div class="eyebrow">Body za cenu – nejvýhodnější nahoře</div><div class="bars">${eff.map(x => bar(x.c.title, x.r, eff[0].r, x.r.toLocaleString("cs-CZ", { maximumFractionDigits: 2 }))).join("")}</div><p class="hint">Karta, která výrazně vybočuje, bývá přesílená nebo zbytečná.</p>` : ""}`
          : `<div class="empty">Balíček je prázdný.</div>`}
      </div>
      <div class="panel"><h3>Šance na líznutí (balíček i sáček)</h3>
        <p class="hint">Tah bez vracení. Kolik karet daného druhu je v balíčku a jaká je šance, že je lízneš.</p>
        ${presets.length ? `<label class="f">Vyplnit podle<select id="anPreset"><option value="">Vyber kartu, typ nebo žeton…</option>${presets.map((x, i) => `<option value="${i}">${esc(x.l)}</option>`).join("")}</select></label>` : ""}
        <div class="grid" style="grid-template-columns:repeat(2,1fr)">
          <label class="f">Celkem v balíčku<input type="number" min="1" data-an="N" value="${N}"></label>
          <label class="f">Z toho hledaných<input type="number" min="0" data-an="K" value="${K}"></label>
          <label class="f">Líznu karet<input type="number" min="0" data-an="n" value="${n}"></label>
          <label class="f">Chci aspoň<input type="number" min="0" data-an="k" value="${k}"></label></div>
        <div class="result"><span>Šance líznout aspoň ${k}</span><b>${pct(k > pmf.length - 1 ? 0 : atLeast(k))}</b></div>
        <div class="bars">${pmf.map((v, i) => bar(`přesně ${i}`, v, Math.max(...pmf), pct(v))).join("")}</div>
      </div>
    </div>
    <div class="two">
      <div class="panel"><h3>Součet kostek</h3>
        <div class="grid" style="grid-template-columns:repeat(3,1fr)">
          <label class="f">Kostek<input type="number" min="1" max="20" data-an="dN" value="${dN}"></label>
          <label class="f">Stěn<input type="number" min="2" max="100" data-an="dS" value="${dS}"></label>
          <label class="f">Součet aspoň<input type="number" data-an="dT" value="${dT}"></label></div>
        <div class="result"><span>${dN}k${dS} hodí aspoň ${dT}</span><b>${pct(pGe)}</b><span>průměr ${exp.toLocaleString("cs-CZ")}</span></div>
        ${dist.length <= 121 ? `<div class="histo">${dist.map((v, s) => s < dN ? "" : `<span title="${s}: ${pct(v)}" style="height:${Math.round(v / maxD * 100)}%;${s >= dT ? "background:var(--accent)" : ""}"></span>`).join("")}</div><div class="row spread mono hint"><span>${dN}</span><span>${dN * dS}</span></div>` : ""}
      </div>
      <div class="panel"><h3>Zásahy kostkami</h3>
        <div class="grid" style="grid-template-columns:repeat(3,1fr)">
          <label class="f">Kostek k6<input type="number" min="1" max="40" data-an="hN" value="${hN}"></label>
          <label class="f">Zásah na<input type="number" min="1" max="6" data-an="hH" value="${hH}"></label>
          <label class="f">Chci zásahů<input type="number" min="0" data-an="hK" value="${hK}"></label></div>
        <div class="result"><span>Aspoň ${hK} ${plural(hK, "zásah", "zásahy", "zásahů")} (šance jedné kostky ${pct(hp)})</span><b>${pct(hits.slice(hK).reduce((a, v) => a + v, 0))}</b><span>průměrně ${(hN * hp).toLocaleString("cs-CZ", { maximumFractionDigits: 2 })} zásahu</span></div>
        <div class="bars">${hits.map((v, i) => bar(`${i} ${plural(i, "zásah", "zásahy", "zásahů")}`, v, Math.max(...hits), pct(v))).join("")}</div>
        ${p.cdice.length ? `<div class="eyebrow">Vlastní kostky – šance na stěnu</div>${p.cdice.map(cd => { const g = {}; cd.faces.forEach(f => g[f || "nic"] = (g[f || "nic"] || 0) + 1); return `<div><b>${esc(cd.name)}</b>: ${Object.entries(g).map(([f, c]) => `${esc(f)} ${pct(c / cd.faces.length)}`).join(" · ")}</div>`; }).join("")}` : ""}
      </div>
    </div>
    <div class="panel"><h3>Bojová tabulka – šance výsledků podle poměru</h3>
      <div style="overflow-x:auto"><table class="crt-tab"><thead><tr><th>Výsledek</th>${crt.cols.map(c => `<th>${esc(c)}</th>`).join("")}</tr></thead>
        <tbody>${outs.map(o => `<tr><th>${esc(o)}</th>${crt.cols.map((_, ci) => { const v = crt.rows.filter(r => r[ci] === o).length / crt.rows.length; return `<td style="background:color-mix(in srgb, var(--accent) ${Math.round(v * 100)}%, transparent)">${v ? Math.round(v * 100) + " %" : "–"}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>
      <p class="hint">Ve vyvážené tabulce šance útočníka plynule rostou zleva doprava. Skok nebo propad v jednom sloupci bývá chyba.</p>
    </div>
  </div>`;
  wireBanner(main);
  wireSimPanel(main, p);
  if ($("#anDeck")) $("#anDeck").onchange = e => { A.deckId = e.target.value; render(); };
  if ($("#anPreset")) $("#anPreset").onchange = e => { const x = presets[+e.target.value]; if (!x) return; A.N = x.N; A.K = x.K; render(); };
  $$("[data-an]", main).forEach(i => i.addEventListener("change", () => { A[i.dataset.an] = +i.value; render(); }));
}
