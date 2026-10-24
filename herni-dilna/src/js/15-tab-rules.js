// ---------- Pravidla (záložka) ----------
function renderRules(main, p) {
  const R = p.ruleset; const resOpt = (cur, empty) => `<option value="">${empty}</option>` + p.resources.filter(r => !r.global).map(r => `<option value="${r.id}" ${r.id === cur ? "selected" : ""}>${esc(r.name)}</option>`).join("");
  const chk = (key, label) => `<label class="chk"><input type="checkbox" data-rb="${key}" ${R[key] ? "checked" : ""}> ${label}</label>`;
  const num = (key, label, ph = "–") => `<label class="f">${label}<input type="number" data-rn="${key}" value="${esc(R[key])}" placeholder="${ph}"></label>`;
  main.innerHTML = `<div class="page">
    ${exampleBanner(p)}
    <div><h2>Pravidla a jejich hlídání</h2><p class="hint" style="margin-top:4px">Nastav, co má herní stůl hlídat. V režimu „Upozorňovat“ aplikace porušení jen nahlásí a zapíše do záznamu hry, v režimu „Vynucovat“ tah nepovolí.</p></div>
    <div class="panel"><div class="tools"><button data-strict="0" aria-pressed="${!R.strict}">Upozorňovat</button><button data-strict="1" aria-pressed="${!!R.strict}">Vynucovat</button></div></div>
    <div class="two">
      <div class="panel"><h3>Tah hráče</h3>
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">${num("handLimit", "Limit karet v ruce")}${num("drawUpTo", "Na konci tahu dobrat do")}${num("actionsPerTurn", "Akcí za tah")}</div>
        <div class="eyebrow">Co se počítá jako akce</div>
        <div class="row">${Object.entries(CATS).map(([k, v]) => `<label class="chk"><input type="checkbox" data-ac="${k}" ${R.actCats.includes(k) ? "checked" : ""}> ${v}</label>`).join("")}</div>
        ${chk("ownTurn", "Hrát karty a táhnout jednotkami smí jen hráč na tahu")}
        ${chk("roundOnWrap", "Když dohraje poslední hráč, začne nové kolo")}
        ${chk("autoIncome", "Na začátku kola připsat příjem ze zdrojů")}
        ${chk("timerAuto", "Po vypršení časovače předat tah automaticky")}
        <label class="f">Vyložení karty z ruky stojí (cena karty)<select data-rs="playCost">${resOpt(R.playCost, "Nic – zdarma")}</select></label>
      </div>
      <div class="panel"><h3>Pohyb a mapa</h3>
        ${chk("moveRange", "Jednotka se smí pohnout jen v dosahu (terén, zóny kontroly)")}
        ${chk("moveOnce", "Každá jednotka se smí pohnout jen jednou za tah")}
        <div class="grid" style="grid-template-columns:1fr 1fr">${num("stackLimit", "Max. jednotek na poli")}${num("sight", "Dohled (polí)", "6")}</div>
        ${chk("fog", "Mlha války – soupeřovy jednotky jsou skryté nebo jen jako bloky bez hodnot")}
        <p class="hint">Výhled blokuje terén označený v záložce Mapa. Zóny kontroly zapneš v Mechanikách.</p>
        <h3>Konec hry</h3>
        <div class="grid" style="grid-template-columns:1fr 1fr"><label class="f">Vyhrává, kdo dosáhne bodů<input type="number" data-rw="vp" value="${esc(R.win.vp)}" placeholder="–"></label>
        <label class="f">Hra končí po kole (bez scénáře)<input type="number" data-rw="turns" value="${esc(R.win.turns)}" placeholder="–"></label></div>
        <label class="chk"><input type="checkbox" data-rwb="elimination" ${R.win.elimination ? "checked" : ""}> Vyhrává strana, které jako jediné zůstanou jednotky</label>
        <p class="hint">Cíl dráhy a správné obvinění v dedukci ukončí hru samy. Scénář může mít vlastní cíl (záložka Scénáře).</p>
      </div>
    </div>
    ${p.phases.length ? `<div class="panel"><h3>Co je povolené v jaké fázi</h3><p class="hint">Bez zaškrtnutí je činnost povolená vždy.</p>
      <div style="overflow-x:auto"><table class="crt-tab" style="font-family:var(--f-body)"><thead><tr><th style="text-align:left">Činnost</th>${p.phases.map(ph => `<th>${esc(ph)}</th>`).join("")}</tr></thead>
      <tbody>${Object.entries(CATS).map(([k, v]) => `<tr><th style="text-align:left;font-weight:400">${v}</th>${p.phases.map((_, i) => `<td><input type="checkbox" data-ph="${k}|${i}" ${(R.phaseOf[k] || []).includes(i) ? "checked" : ""} aria-label="${v} – ${esc(p.phases[i])}" style="width:20px;height:20px"></td>`).join("")}</tr>`).join("")}</tbody></table></div></div>` : ""}
    <div class="panel"><div class="row spread"><h3>Automatická pravidla – Když… pak…</h3><button class="btn small" id="addTrig">+ Pravidlo</button></div>
      <p class="hint">Upřesnění zúží spouštěč: typ karty, název žetonu, terén nebo číslo fáze (1 = první). Podmínka se týká hráče, kterého se událost týká.</p>
      ${R.triggers.length ? `<div class="list">${R.triggers.map(r => `<div class="item-row">
        <label class="f" style="width:190px">Když<select data-tg="${r.id}|on">${Object.entries(TRIGGERS).map(([k, v]) => `<option value="${k}" ${k === r.on ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <label class="f" style="width:120px">Upřesnění<input type="text" data-tg="${r.id}|param" value="${esc(r.param)}" placeholder="–"></label>
        <label class="f" style="width:140px">Podmínka<input type="text" data-tg="${r.id}|cond" value="${esc(r.cond)}" placeholder="Mince >= 3"></label>
        <label class="f" style="flex:1;min-width:180px">Pak<input type="text" data-tg="${r.id}|effect" value="${esc(r.effect)}" placeholder="+1 Body; líznout 1"></label>
        <button class="btn small danger" data-tgdel="${r.id}" aria-label="Smazat pravidlo">✕</button></div>`).join("")}</div>` : `<div class="empty">Žádná automatická pravidla.</div>`}
    </div>
    <div class="two">
      <div class="panel"><h3>Jak zapsat efekt</h3>
        <div class="log" style="max-height:none;font-size:.85rem;color:var(--ink)">
          <span><b>+2 Mince</b> · hráč získá 2 mince (název zdroje)</span><span><b>-1 Body</b> · hráč ztratí bod</span>
          <span><b>všichni +1 Zlato</b> · <b>ostatní -1 Body</b></span><span><b>líznout 2</b> · z vlastního balíčku, jinak z prvního</span>
          <span><b>líznout 1 z Události</b> · z konkrétního balíčku</span><span><b>táhnout 2 z Kotlík</b> · ze sáčku</span>
          <span><b>posun +3</b> · na závodní dráze</span><span><b>odhodit 1</b> · náhodnou kartu z ruky</span>
          <span><b>zpráva Text</b> · oznámení všem</span><span><b>vítěz</b> · hráč vyhrává</span>
          <span><b>událost z Události</b> · otočí kartu a provede její efekt</span>
          <span><b>soupeř -1 Body</b> · hráč vybere soupeře (při dvou hráčích automaticky)</span>
          <span><b>vyber: +2 Mince | líznout 1</b> · hráč si vybere jednu možnost</span>
          <span><b>pokud Mince >= 3: +1 Body, líznout 1</b> · jen když platí podmínka</span>
          <span><b>zaplať 2 Mince: +1 Body</b> · provede se, jen když hráč zaplatí; víc zdrojů: <b>zaplať 1 Dřevo + 1 Cihly: …</b></span>
          <span><b>nastav Mince 0</b> · nastaví zdroj na hodnotu (třeba vynulování peněz na začátku tahu)</span>
          <span><b>jednou za kolo: +2 Mince</b> · na začátku efektu; také „jednou za tah“, „jednou za hru“</span></div>
        <p class="hint">Víc příkazů odděl středníkem, uvnitř volby, podmínky a platby čárkou. Stejný zápis funguje v poli „Efekt“ u karet a u zvláštních polí dráhy. Podmínky: <b>Mince >= 3</b>, <b>ruka &lt; 2</b>, <b>kolo = 5</b>, <b>skóre > 10</b>.</p></div>
      <div class="panel"><h3>Vyzkoušet efekt</h3><p class="hint">Provede efekt na stole pro hráče na tahu – ověříš si, že ho aplikace rozumí.</p>
        <input type="text" id="tryEff" placeholder="+2 Mince; líznout 1"><button class="btn primary" id="tryGo">Provést</button><div id="tryOut" class="hint"></div></div>
    </div>
  </div>`;
  wireBanner(main);
  $$("[data-strict]", main).forEach(b => b.onclick = () => { R.strict = b.dataset.strict === "1"; touch(p); render(); });
  $$("[data-rb]", main).forEach(i => i.onchange = () => { R[i.dataset.rb] = i.checked; touch(p); });
  $$("[data-rn]", main).forEach(i => i.addEventListener("change", () => { R[i.dataset.rn] = i.value === "" ? "" : +i.value; touch(p); }));
  $$("[data-rs]", main).forEach(i => i.onchange = () => { R[i.dataset.rs] = i.value; touch(p); });
  $$("[data-rw]", main).forEach(i => i.addEventListener("change", () => { R.win[i.dataset.rw] = i.value === "" ? "" : +i.value; touch(p); }));
  $$("[data-rwb]", main).forEach(i => i.onchange = () => { R.win[i.dataset.rwb] = i.checked; touch(p); });
  $$("[data-ac]", main).forEach(i => i.onchange = () => { R.actCats = R.actCats.filter(x => x !== i.dataset.ac); if (i.checked) R.actCats.push(i.dataset.ac); touch(p); });
  $$("[data-ph]", main).forEach(i => i.onchange = () => { const [k, ph] = i.dataset.ph.split("|"); const arr = (R.phaseOf[k] || []).filter(x => x !== +ph); if (i.checked) arr.push(+ph); R.phaseOf[k] = arr.sort(); touch(p); });
  $("#addTrig").onclick = () => { R.triggers.push({ id: uid(), on: "kolo", param: "", cond: "", effect: "" }); touch(p); render(); };
  $$("[data-tg]", main).forEach(i => { const ev = i.tagName === "SELECT" ? "change" : "input"; i.addEventListener(ev, () => { const [id, key] = i.dataset.tg.split("|"); const r = R.triggers.find(x => x.id === id); r[key] = key === "param" && r.on === "faze" && /^\d+$/.test(i.value) ? i.value : i.value; touch(p); }); });
  $$("[data-tgdel]", main).forEach(b => b.onclick = () => { R.triggers = R.triggers.filter(r => r.id !== b.dataset.tgdel); touch(p); render(); });
  $("#tryGo").onclick = () => { const t = ensureTable(p); const cp = curPlayer(p, t); if (!cp) { $("#tryOut").textContent = "Nejdřív vytvoř strany v Mechanikách."; return; } const out = runEffects(p, t, cp.id, $("#tryEff").value, "Zkouška"); touch(p); $("#tryOut").textContent = `${cp.name}: ${out.join(", ") || "nic"}`; };
}
