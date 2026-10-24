// ---------- Mechaniky ----------
function renderMechanics(main, p) {
  const crt = p.crt;
  const resOpt = (cur, empty) => `<option value="">${empty}</option>` + p.resources.filter(r => !r.global).map(r => `<option value="${r.id}" ${r.id === cur ? "selected" : ""}>${esc(r.name)}</option>`).join("");
  main.innerHTML = `<div class="page">
    ${exampleBanner(p)}
    <div class="two">
      <div class="panel">
        <div class="row spread"><h2>Hráči a strany</h2><button class="btn small" id="addF">+ Strana</button></div>
        <p class="hint">Strany používají jednotky, kontrola území, zdroje, výběr akcí, draft i ruce hráčů. V eurohře je to prostě barva hráče. Schopnost je asymetrická síla strany – ukáže se na stole hráči, který je na tahu.</p>
        <div class="list">${p.factions.map((f, i) => `<div class="item-row" style="flex-direction:column;align-items:stretch">
          <div class="row"><span class="dot" style="background:${f.color};width:22px;height:22px;border-radius:50%"></span>
          <input type="text" data-fn="${f.id}" value="${esc(f.name)}" aria-label="Název strany ${i + 1}" style="flex:1;min-width:120px;width:auto">
          ${p.factions.length > 1 ? `<button class="btn small danger" data-fdel="${f.id}" aria-label="Smazat stranu">✕</button>` : ""}</div>
          ${swatchRow(f.color, `data-fc-id="${f.id}" data-fc`)}
          <input type="text" data-fa="${f.id}" value="${esc(f.ability)}" placeholder="Schopnost strany (např. Při nákupu platí o 1 méně)" aria-label="Schopnost strany ${i + 1}">
          <div class="grid" style="grid-template-columns:1fr 1fr"><input type="text" data-fs="${f.id}" value="${esc(f.setup)}" placeholder="Začátek hry, např. +2 Mince" aria-label="Start strany ${i + 1}">
          <select data-fb="${f.id}" aria-label="Automat"><option value="">Hraje člověk</option>${p.decks.map(d => `<option value="${d.id}" ${d.id === f.bot ? "selected" : ""}>Automat – balíček ${esc(d.name)}</option>`).join("")}</select></div></div>`).join("")}</div>
      </div>
      <div class="panel">
        <h2>Fáze kola</h2>
        <p class="hint">Jedna fáze na řádek. Na stole je pak přepínáš tlačítkem Další fáze.</p>
        <textarea id="phases" style="min-height:150px">${esc(p.phases.join("\n"))}</textarea>
      </div>
    </div>
    <div class="panel">
      <div class="row spread"><h2>Zdroje, body a stopy</h2><button class="btn small" id="addR">+ Zdroj</button></div>
      <p class="hint">Ikonu zdroje vložíš do textu karty zápisem {Název}, třeba „Získej 2 {Mince}“. Mince, suroviny, životy, vítězné body. Každý hráč má vlastní hodnotu, společné zdroje (např. úroveň hrozby v kooperativní hře, počasí) má hra jen jednou. Příjem se připíše tlačítkem „Příjem“ na stole.</p>
      ${p.resources.length ? `<div class="list">${p.resources.map(r => `<div class="item-row">
        <input type="color" data-rc="${r.id}" value="${r.color}" aria-label="Barva" style="width:44px;height:36px;border:0;background:none;padding:0">
        <label class="f" style="flex:1;min-width:120px">Název<input type="text" data-rn="${r.id}" value="${esc(r.name)}"></label>
        <label class="f" style="width:70px">Ikona<input type="text" data-ricon="${r.id}" value="${esc(r.icon || "")}" maxlength="3" placeholder="🪙"></label>
        <label class="f" style="width:80px">Začátek<input type="number" data-rs="${r.id}" value="${esc(r.start)}"></label>
        <label class="f" style="width:80px">Příjem<input type="number" data-ri="${r.id}" value="${esc(r.income)}"></label>
        <label class="f" style="width:80px">Maximum<input type="number" data-rm="${r.id}" value="${esc(r.max)}" placeholder="–"></label>
        <label class="chk"><input type="checkbox" data-rv="${r.id}" ${r.vp ? "checked" : ""}> Vítězné body</label>
        <label class="chk"><input type="checkbox" data-rg="${r.id}" ${r.global ? "checked" : ""}> Společný</label>
        <button class="btn small danger" data-rdel="${r.id}" aria-label="Smazat zdroj">✕</button></div>`).join("")}</div>` : `<div class="empty">Žádné zdroje. Přidej mince, suroviny nebo vítězné body.</div>`}
    </div>
    <div class="two">
      <div class="panel">
        <h2>Trh a bodování</h2>
        <label class="f">Měna pro nákup z trhu<select id="marketCur">${resOpt(p.marketCur, "Neplatit automaticky")}</select></label>
        <p class="hint">Při nákupu se cena karty odečte hráči na tahu. Počet karet na trhu nastavíš u balíčku v Komponentách.</p>
        <hr class="sep">
        <label class="f">Bodování sad podle<select id="setField"><option value="">Bez sad</option><option value="type" ${p.scoring.field === "type" ? "selected" : ""}>Typu karty</option><option value="suit" ${p.scoring.field === "suit" ? "selected" : ""}>Barvy / symbolu</option></select></label>
        <label class="f">Body za sadu velikosti 1, 2, 3…<input type="text" id="setTable" value="${esc(p.scoring.table)}" placeholder="1,3,6,10,15"></label>
        <label class="f">Body za každý získaný štych<input type="number" id="trickPts" value="${esc(p.scoring.trick)}"></label>
        <p class="hint">Skóre hráče = zdroj „Vítězné body“ + body z vyložených karet + bonusy za sady + štychy.</p>
      </div>
      <div class="panel">
        <div class="row spread"><h2>Výběr akcí</h2><button class="btn small" id="addA">+ Akce</button></div>
        <label class="f">Způsob<select id="actMode"><option value="slots">Akční pole s místy (worker placement)</option><option value="rondel" ${p.actionMode === "rondel" ? "selected" : ""}>Rondel – kruh akcí</option><option value="roles" ${p.actionMode === "roles" ? "selected" : ""}>Výběr rolí – každou roli jeden hráč za kolo</option></select></label>
        ${p.actionMode === "roles" ? `<label class="f">Bonus pro nevybrané role<select id="roleRes">${resOpt(p.roleRes, "Bez bonusu")}</select></label>` : ""}
        ${p.actionMode === "rondel" ? `<div class="grid" style="grid-template-columns:1fr 1fr">
          <label class="f">Kroků zdarma<input type="number" min="1" max="8" id="rFree" value="${p.rondel.free}"></label>
          <label class="f">Platba za další krok<select id="rPay">${resOpt(p.rondel.pay, "Jen upozornit")}</select></label></div>
          <p class="hint">Hráč posouvá figurku po kruhu dopředu. Prvních ${p.rondel.free} kroků je zdarma, každý další stojí 1.</p>` : `<p class="hint">Akční pole s omezeným počtem míst. Na stole na ně hráči pokládají své figurky.</p>`}
        ${p.actions.length ? `<div class="list">${p.actions.map(a => `<div class="item-row">
          <label class="f" style="width:140px">Název<input type="text" data-an="${a.id}" value="${esc(a.name)}"></label>
          <label class="f" style="flex:1;min-width:160px">Co akce dělá<input type="text" data-at="${a.id}" value="${esc(a.text)}"></label>
          <label class="f" style="flex:1;min-width:160px">Efekt (provede se sám)<input type="text" data-ae="${a.id}" value="${esc(a.effect || "")}" placeholder="+2 Mince"></label>
          ${p.actionMode === "rondel" ? "" : `<label class="f" style="width:80px">Míst<input type="number" min="1" max="8" data-as="${a.id}" value="${a.slots}"></label>`}
          <button class="btn small danger" data-adel="${a.id}" aria-label="Smazat akci">✕</button></div>`).join("")}</div>` : `<div class="empty">Žádné akce.</div>`}
      </div>
    </div>
    <div class="two">
      <div class="panel"><h2>Závodní dráha</h2>
        <p class="hint">Hod a pohyb (roll and move) i závod. Na zvláštních polích se provede efekt – zápis jako u karet, např. „7: +2 Mince“ nebo „12: posun -3“.</p>
        <div class="grid" style="grid-template-columns:1fr 1fr"><label class="f">Počet polí (0 = vypnuto)<input type="number" min="0" max="120" id="trLen" value="${+p.track.length || 0}"></label>
        <label class="f">Kostka<select id="trDie">${[4, 6, 8, 10, 12, 20].map(n => `<option value="${n}" ${+p.track.die === n ? "selected" : ""}>k${n}</option>`).join("")}</select></label></div>
        <label class="f">Zvláštní pole (jedno na řádek)<textarea id="trSp" style="min-height:110px" placeholder="5: +2 Mince&#10;9: posun -3&#10;14: líznout 1">${esc(p.track.spaces)}</textarea></label>
        <label class="chk"><input type="checkbox" id="trAuto" ${p.track.autoNext ? "checked" : ""}> Po hodu předat tah dalšímu</label>
        <p class="hint">Kdo první dojde do cíle, vyhrává.</p></div>
      <div class="panel"><h2>Trasy a cíle</h2>
        <p class="hint">Hráči staví síť úseků mezi sousedními poli mapy (jako Ticket to Ride). Cíl je dvojice popisků na mapě – spojený cíl přidá body.</p>
        <div class="grid" style="grid-template-columns:1fr 80px"><label class="f">Úsek stojí<select id="rtCost">${resOpt(p.routes.cost, "Nic")}</select></label><label class="f">Kolik<input type="number" min="1" id="rtPrice" value="${+p.routes.price || 1}"></label></div>
        <label class="chk"><input type="checkbox" id="rtExcl" ${p.routes.exclusive ? "checked" : ""}> Úsek může patřit jen jednomu hráči</label>
        ${(p.routes.tickets || []).map(x => `<div class="row"><input type="text" data-tka="${x.id}" value="${esc(x.a)}" placeholder="Odkud" style="width:110px"><input type="text" data-tkb="${x.id}" value="${esc(x.b)}" placeholder="Kam" style="width:110px"><input type="number" data-tkp="${x.id}" value="${x.pts}" style="width:70px" aria-label="Body"><select data-tkf="${x.id}" style="width:auto"><option value="">všichni</option>${p.factions.map(f => `<option value="${f.id}" ${f.id === x.fid ? "selected" : ""}>${esc(f.name)}</option>`).join("")}</select><button class="btn small danger" data-tkdel="${x.id}" aria-label="Smazat cíl">✕</button></div>`).join("")}
        <button class="btn small" id="addTk">+ Cíl</button></div>
    </div>
    <div class="two">
      <div class="panel"><h2>Burza a většiny</h2>
        <label class="f">Platidlo burzy<select id="stCur">${resOpt(p.stock.currency, "Burza vypnutá")}</select></label>
        ${p.stock.goods.map((g, i) => `<div class="row"><select data-sgr="${i}" style="width:auto">${p.resources.filter(r => !r.global).map(r => `<option value="${r.id}" ${r.id === g.resId ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</select>
          <label class="f" style="flex-direction:row;align-items:center;gap:4px">cena<input type="number" data-sgp="${i}" value="${g.price}" style="width:64px"></label><label class="f" style="flex-direction:row;align-items:center;gap:4px">od<input type="number" data-sgmin="${i}" value="${g.min}" style="width:60px"></label><label class="f" style="flex-direction:row;align-items:center;gap:4px">do<input type="number" data-sgmax="${i}" value="${g.max}" style="width:60px"></label><button class="btn small danger" data-sgdel="${i}" aria-label="Odebrat komoditu">✕</button></div>`).join("")}
        <button class="btn small" id="addGood" ${p.resources.length ? "" : "disabled"}>+ Komodita</button>
        <p class="hint">Cena komodity roste s každým nákupem a klesá s prodejem.</p><hr class="sep">
        <label class="f">Body za 1., 2., 3. místo ve většině oblasti<input type="text" id="majPts" value="${esc(p.majority.points)}" placeholder="5,3,1"></label>
        <p class="hint">Oblasti nakreslíš v záložce Mapa nástrojem Oblast. Počítají se jednotky stran v polích oblasti.</p><hr class="sep">
        <label class="f">Produkci z polí s čísly dostane<select id="prodMode"><option value="both">vlastník pole i jednotky na poli a vedle</option><option value="control" ${p.production.mode === "control" ? "selected" : ""}>jen vlastník pole</option><option value="units" ${p.production.mode === "units" ? "selected" : ""}>jen jednotky na poli a vedle</option></select></label>
        <p class="hint">Čísla polí a co terén produkuje nastavíš v záložce Mapa (jako v Osadnících z Katanu).</p></div>
      <div class="panel"><h2>Tajné role</h2>
        <p class="hint">Jedna role na řádek. Při rozdání dostane každý hráč náhodně jednu – hodí se pro zrádce, skryté cíle nebo frakce.</p>
        <textarea id="roles" style="min-height:140px" placeholder="Zrádce&#10;Věrný&#10;Věrný">${esc(p.roles)}</textarea>
        <label class="f">Trest za prohru v blafování<input type="text" id="bluffPen" value="${esc(p.bluffPenalty)}" placeholder="-1 Body"></label></div>
    </div>
    <div class="panel">
      <h2>Boj a pohyb</h2>
      <div class="two">
        <div style="display:flex;flex-direction:column;gap:10px;min-width:0">
          <h3>Bojová tabulka (CRT)</h3>
          <p class="hint">Sloupce jsou poměry útok : obrana, řádky hody kostkou. Poměr se zaokrouhluje ve prospěch obránce.</p>
          <div style="overflow-x:auto"><table class="crt-tab crt-ed"><thead><tr><th>Hod</th>${crt.cols.map((c, i) => `<th><input type="text" data-cc="${i}" value="${esc(c)}" aria-label="Sloupec ${i + 1}"></th>`).join("")}</tr></thead>
            <tbody>${crt.rows.map((r, ri) => `<tr><th>${ri + 1}</th>${r.map((v, ci) => `<td><input type="text" data-cr="${ri}" data-ci="${ci}" value="${esc(v)}" aria-label="Hod ${ri + 1}, sloupec ${ci + 1}"></td>`).join("")}</tr>`).join("")}</tbody></table></div>
          <div class="row"><button class="btn small" id="colAdd">+ Sloupec</button><button class="btn small" id="colDel">− Sloupec</button><button class="btn small" id="rowAdd">+ Řádek</button><button class="btn small" id="rowDel">− Řádek</button><button class="btn small" id="crtReset">Výchozí tabulka</button></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;min-width:0">
          <label class="f">Vysvětlivky výsledků<textarea id="legend" style="min-height:120px">${esc(crt.legend)}</textarea></label>
          <h3>Kostkový boj</h3>
          <div class="grid" style="grid-template-columns:1fr 1fr 1fr">
            <label class="f">Stěn kostky<select id="dSides">${[4, 6, 8, 10, 12, 20].map(s => `<option ${s === (+p.dice.sides || 6) ? "selected" : ""}>${s}</option>`).join("")}</select></label>
            <label class="f">Útočník zasahuje na<input type="number" min="1" max="${+p.dice.sides || 6}" id="aHit" value="${p.dice.aHit}"></label>
            <label class="f">Obránce zasahuje na<input type="number" min="1" max="${+p.dice.sides || 6}" id="dHit" value="${p.dice.dHit}"></label>
          </div>
          <h3>Pohyb</h3>
          <label class="chk"><input type="checkbox" id="zoc" ${p.zoc ? "checked" : ""}> Zóny kontroly: vstup na pole sousedící s nepřítelem ukončí pohyb</label>
          <p class="hint">Dosah pohybu na stole počítá s cenou terénu (Mapa) a pohybem jednotky. Terén s pohybem „–“ je neprůchodný.</p>
        </div>
      </div>
    </div>${moreMechHTML(p)}<div class="two">${crawlMechHTML(p)}${logicMechHTML(p)}</div><div class="two">${cmapMechHTML(p)}${extraMechHTML(p)}</div><div class="two">${deliverMechHTML(p)}${netCubesMechHTML(p)}</div></div>`;
  wireBanner(main);
  const F = id => p.factions.find(f => f.id === id);
  $("#addF").onclick = () => { p.factions.push({ id: uid(), name: "Strana " + (p.factions.length + 1), color: COLORS[p.factions.length % COLORS.length], ability: "" }); touch(p); render(); };
  $$("[data-fn]", main).forEach(i => i.addEventListener("input", () => { F(i.dataset.fn).name = i.value; touch(p); }));
  $$("[data-fa]", main).forEach(i => i.addEventListener("input", () => { F(i.dataset.fa).ability = i.value; touch(p); }));
  $$("[data-fs]", main).forEach(i => i.addEventListener("input", () => { F(i.dataset.fs).setup = i.value; touch(p); }));
  $$("[data-fb]", main).forEach(i => i.onchange = () => { F(i.dataset.fb).bot = i.value; touch(p); });
  $$("[data-fc]", main).forEach(x => x.onclick = () => { F(x.dataset.fcId).color = x.dataset.fc; touch(p); render(); });
  $$("[data-fdel]", main).forEach(x => x.onclick = () => confirmDialog("Smazat stranu?", "Její jednotky zůstanou bez strany.", "Smazat", () => { p.factions = p.factions.filter(f => f.id !== x.dataset.fdel); touch(p); render(); }));
  $("#phases").addEventListener("input", e => { p.phases = e.target.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean); touch(p); });
  // zdroje
  const R = id => p.resources.find(r => r.id === id);
  $("#addR").onclick = () => { p.resources.push({ id: uid(), name: "Zdroj " + (p.resources.length + 1), color: COLORS[(p.resources.length + 4) % COLORS.length], start: 0, income: 0, max: "", vp: false, global: false }); touch(p); render(); };
  const rin = (attr, key, conv) => $$(`[${attr}]`, main).forEach(i => i.addEventListener("change", () => { R(i.getAttribute(attr))[key] = conv(i); touch(p); }));
  rin("data-rn", "name", i => i.value); rin("data-ricon", "icon", i => i.value.trim()); rin("data-rc", "color", i => i.value); rin("data-rs", "start", i => +i.value || 0); rin("data-ri", "income", i => +i.value || 0);
  rin("data-rm", "max", i => i.value === "" ? "" : +i.value); rin("data-rv", "vp", i => i.checked); rin("data-rg", "global", i => i.checked);
  $$("[data-rdel]", main).forEach(x => x.onclick = () => { p.resources = p.resources.filter(r => r.id !== x.dataset.rdel); touch(p); render(); });
  $("#marketCur").onchange = e => { p.marketCur = e.target.value; touch(p); };
  $("#setField").onchange = e => { p.scoring.field = e.target.value; touch(p); };
  $("#setTable").addEventListener("change", e => { p.scoring.table = e.target.value; touch(p); });
  $("#trickPts").addEventListener("change", e => { p.scoring.trick = +e.target.value || 0; touch(p); });
  // akce
  $("#actMode").onchange = e => { p.actionMode = e.target.value; touch(p); render(); };
  if ($("#roleRes")) $("#roleRes").onchange = e => { p.roleRes = e.target.value; touch(p); };
  if ($("#rFree")) { $("#rFree").addEventListener("change", e => { p.rondel.free = Math.max(1, +e.target.value || 3); touch(p); render(); }); $("#rPay").onchange = e => { p.rondel.pay = e.target.value; touch(p); }; }
  $("#addA").onclick = () => { p.actions.push({ id: uid(), name: "Akce " + (p.actions.length + 1), text: "", slots: 1 }); touch(p); render(); };
  const A = id => p.actions.find(a => a.id === id);
  $$("[data-an]", main).forEach(i => i.addEventListener("input", () => { A(i.dataset.an).name = i.value; touch(p); }));
  $$("[data-at]", main).forEach(i => i.addEventListener("input", () => { A(i.dataset.at).text = i.value; touch(p); }));
  $$("[data-ae]", main).forEach(i => i.addEventListener("input", () => { A(i.dataset.ae).effect = i.value; touch(p); }));
  $$("[data-as]", main).forEach(i => i.addEventListener("input", () => { A(i.dataset.as).slots = Math.max(1, Math.min(8, parseInt(i.value, 10) || 1)); touch(p); }));
  $$("[data-adel]", main).forEach(x => x.onclick = () => { p.actions = p.actions.filter(a => a.id !== x.dataset.adel); touch(p); render(); });
  // boj
  $$("[data-cc]", main).forEach(i => i.addEventListener("input", () => { crt.cols[+i.dataset.cc] = i.value.trim(); touch(p); }));
  $$("[data-cr]", main).forEach(i => i.addEventListener("input", () => { crt.rows[+i.dataset.cr][+i.dataset.ci] = i.value.trim(); touch(p); }));
  $("#colAdd").onclick = () => { const last = crt.cols[crt.cols.length - 1] || "1:1"; const n = parseInt(last, 10) || 1; crt.cols.push((n + 1) + ":1"); crt.rows.forEach(r => r.push(r[r.length - 1] || "")); touch(p); render(); };
  $("#colDel").onclick = () => { if (crt.cols.length < 2) return; crt.cols.pop(); crt.rows.forEach(r => r.pop()); touch(p); render(); };
  $("#rowAdd").onclick = () => { crt.rows.push([...(crt.rows[crt.rows.length - 1] || crt.cols.map(() => ""))]); touch(p); render(); };
  $("#rowDel").onclick = () => { if (crt.rows.length < 2) return; crt.rows.pop(); touch(p); render(); };
  $("#crtReset").onclick = () => confirmDialog("Obnovit výchozí tabulku?", "Tvoje úpravy tabulky se přepíšou.", "Obnovit", () => { p.crt = defaultCRT(); touch(p); render(); });
  $("#legend").addEventListener("input", e => { crt.legend = e.target.value; touch(p); });
  const dS = () => +p.dice.sides || 6;
  $("#dSides").onchange = e => { p.dice.sides = +e.target.value; p.dice.aHit = Math.min(p.dice.aHit, dS()); p.dice.dHit = Math.min(p.dice.dHit, dS()); touch(p); render(); };
  $("#aHit").addEventListener("input", e => { p.dice.aHit = Math.max(1, Math.min(dS(), +e.target.value || 5)); touch(p); });
  $("#dHit").addEventListener("input", e => { p.dice.dHit = Math.max(1, Math.min(dS(), +e.target.value || 5)); touch(p); });
  $("#zoc").onchange = e => { p.zoc = e.target.checked; touch(p); };
  // dráha, trasy, burza, role
  $("#trLen").addEventListener("change", e => { p.track.length = Math.max(0, Math.min(120, +e.target.value || 0)); touch(p); });
  $("#trDie").onchange = e => { p.track.die = +e.target.value; touch(p); };
  $("#trSp").addEventListener("input", e => { p.track.spaces = e.target.value; touch(p); });
  $("#trAuto").onchange = e => { p.track.autoNext = e.target.checked; touch(p); };
  $("#rtCost").onchange = e => { p.routes.cost = e.target.value; touch(p); };
  $("#rtPrice").addEventListener("change", e => { p.routes.price = Math.max(1, +e.target.value || 1); touch(p); });
  $("#rtExcl").onchange = e => { p.routes.exclusive = e.target.checked; touch(p); };
  const TK = id => p.routes.tickets.find(x => x.id === id);
  $("#addTk").onclick = () => { p.routes.tickets.push({ id: uid(), a: "", b: "", pts: 5, fid: "" }); touch(p); render(); };
  [["data-tka", "a"], ["data-tkb", "b"]].forEach(([at, k]) => $$(`[${at}]`, main).forEach(i => i.addEventListener("input", () => { TK(i.getAttribute(at))[k] = i.value; touch(p); })));
  $$("[data-tkp]", main).forEach(i => i.addEventListener("change", () => { TK(i.dataset.tkp).pts = +i.value || 0; touch(p); }));
  $$("[data-tkf]", main).forEach(i => i.onchange = () => { TK(i.dataset.tkf).fid = i.value; touch(p); });
  $$("[data-tkdel]", main).forEach(x => x.onclick = () => { p.routes.tickets = p.routes.tickets.filter(z => z.id !== x.dataset.tkdel); touch(p); render(); });
  $("#stCur").onchange = e => { p.stock.currency = e.target.value; touch(p); render(); };
  $("#addGood").onclick = () => { const r0 = p.resources.find(r => !r.global && r.id !== p.stock.currency) || p.resources[0]; p.stock.goods.push({ resId: r0.id, price: 3, min: 1, max: 8 }); touch(p); render(); };
  [["data-sgp", "price"], ["data-sgmin", "min"], ["data-sgmax", "max"]].forEach(([at, k]) => $$(`[${at}]`, main).forEach(i => i.addEventListener("change", () => { p.stock.goods[+i.getAttribute(at)][k] = +i.value || 0; touch(p); })));
  $$("[data-sgr]", main).forEach(i => i.onchange = () => { p.stock.goods[+i.dataset.sgr].resId = i.value; touch(p); });
  $$("[data-sgdel]", main).forEach(x => x.onclick = () => { p.stock.goods.splice(+x.dataset.sgdel, 1); touch(p); render(); });
  $("#majPts").addEventListener("change", e => { p.majority.points = e.target.value; touch(p); });
  $("#roles").addEventListener("input", e => { p.roles = e.target.value; touch(p); });
  $("#bluffPen").addEventListener("input", e => { p.bluffPenalty = e.target.value; touch(p); });
  $("#prodMode").onchange = e => { p.production.mode = e.target.value; touch(p); };
  wireMoreMech(main, p); wireCrawlMech(main, p); wireLogicMech(main, p); wireCmapMech(main, p); wireExtraMech(main, p); wireDeliverMech(main, p); wireNetCubesMech(main, p);
}
