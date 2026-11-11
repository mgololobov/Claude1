// Proklikání hry v prohlížeči: všechny záložky, rozkazy, události, vojsko, několik měsíců. Hlídá chyby v konzoli.
const { chromium } = require("playwright"); const path = require("path"); const fs = require("fs");
const tabSel = t => `[data-a="tab"][data-x='["${t}"]']`;
(async () => {
  const out = process.argv[2] || path.join(__dirname, "out"); fs.mkdirSync(out, { recursive: true }); const errors = [];
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  pg.on("pageerror", e => errors.push("pageerror: " + e.message)); pg.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });
  await pg.goto("file://" + path.join(__dirname, "..", "dist", "index.html"));
  const tabs = ["prehled", "plan", "mapa", "zupy", "urednici", "vojsko", "diplo", "hosp", "chramy", "zakony", "rod", "vedeni", "kronika", "hra"];
  const GROUP = { prehled: "plan", urednici: "plan", rod: "plan", hosp: "zupy", chramy: "zupy", vedeni: "zakony", diplo: "vojsko" };
  const go = async t => { if (GROUP[t]) await pg.click(tabSel(GROUP[t])); await pg.click(tabSel(t)); };
  if (!(await pg.$(".start"))) errors.push("chybí úvodní obrazovka"); else { await pg.click('[data-a="startScen"][data-x=\'["ahm"]\']'); await pg.click('[data-a="startGo"]'); }
  const clearModal = async () => { for (let i = 0; i < 30; i++) { const ch = await pg.$("#modal:not(.hidden) .ch"); if (!ch) break; await ch.click(); } };
  const checkTab = async (label) => { const bad = await pg.$$eval("main .bad", els => els.map(e => e.textContent).filter(t => t.includes("Chyba"))); if (bad.length) errors.push(`${label}: ${bad[0]}`); };
  for (const scen of ["sip", "fip", "anch", "mt2", "hyk", "ahm"]) {
    await go("hra");
    await pg.selectOption("#ngScen", scen); await pg.click('[data-a="newgame"]'); await pg.click('[data-a="newgame"]');
    for (const t of tabs) { await go(t); await checkTab(scen + "/" + t); }
    await go("vedeni"); const r = await pg.$('[data-a="research"]:not([disabled])'); if (r) await r.click();
    for (let m = 0; m < 14; m++) {
      await clearModal();
      await go("plan");
      if (!(await pg.$(".plandet[open]"))) await pg.click(".plandet > summary"); const cb = await pg.$('[data-a="cmd"]'); if (cb) await cb.click(); const pt = await pg.$('[data-a="policy"][data-x=\'["pole"]\']'); if (pt && m === 2) await pt.click();
      await clearModal();
      const all = await pg.$('[data-a="adviseAll"]:not([disabled])'); if (all) await all.click();
      await clearModal();
      await pg.click('[data-a="end"]'); await clearModal();
    }
    await go("prehled"); for (const k of ["vezir", "knez", "kral", "vojsko"]) { const c = await pg.$(`[data-a="court"][data-x='["${k}"]']`); if (c) await c.click(); else if (scen !== "x") errors.push(scen + ": chybí dvořan " + k); } await checkTab(scen + "/audience");
    await go("hosp"); if (!(await pg.$(".hospsvg"))) errors.push(scen + ": chybí nilometr");
    await go("diplo"); const j = await pg.$$('[data-a="dipl"]'); if (j.length) { await j[0].click(); const w = await pg.$('[data-a="diplo"][data-x*="valka"]:not([disabled])'); if (w) await w.click(); }
    await clearModal();
    await go("mapa"); { const mm = await pg.$('[data-a="marchMode"]'); if (mm) { await mm.click(); if (!(await pg.$(".ov-march"))) errors.push(scen + ": režim pochodu se nezapnul"); const pv = await pg.$$("#mapsvg .pv"); if (pv.length > 3) await pv[3].click({ force: true }); await clearModal(); } }
    await go("mapa"); const sendBtn = await pg.$('[data-a="send"]'); if (sendBtn) await sendBtn.click();
    for (let m = 0; m < 4; m++) { await clearModal(); await pg.click('[data-a="end"]'); }
    await clearModal();
    for (const t of tabs) { await go(t); await checkTab(scen + "/po válce/" + t); }
    for (const z of ["horni", "delta", "nubie", "cele"]) { await go("mapa"); await pg.click(`[data-a="zoom"][data-x='["${z}"]']`); }
    await go("chramy"); const mb = await pg.$('[data-a="mon"]:not([disabled])'); if (mb) await mb.click(); await checkTab(scen + "/stavby");
    await go("zakony"); for (const lb of (await pg.$$('[data-a="law"]:not([disabled])')).slice(0, 3)) { await lb.click().catch(() => {}); } await checkTab(scen + "/zakony"); await go("chramy");
    const gb = await pg.$('[data-a="god"]:not([disabled])'); if (gb) await gb.click(); await checkTab(scen + "/buh");
    await go("rod"); const hb = await pg.$('[data-a="horus"]:not([disabled])'); if (hb) await hb.click(); await checkTab(scen + "/horus");
    await go("zupy"); const ln = await pg.$$("main a.lnk"); if (ln.length > 1) { await ln[1].click(); const cb = await pg.$('[data-a="capital"]:not([disabled])'); if (cb) await cb.click(); await clearModal(); await checkTab(scen + "/sidlo"); }
    await go("hra"); await pg.click('[data-a="copySave"]'); const len = await pg.$eval("#saveTxt", el => el.value.length); if (len < 1000) errors.push("uložení jako text je prázdné"); await pg.click('[data-a="pasteSave"]');
    await go("mapa");
    for (const m of ["teren", "uroda", "loy", "rozvoj", "vojsko", "obchod", "polit"]) await pg.click(`[data-a="mapMode"][data-x='["${m}"]']`);
    const box = await pg.$eval("#mapsvg", el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    await pg.mouse.move(box[0], box[1]); await pg.mouse.wheel(0, -400); await pg.waitForTimeout(300);
    await pg.mouse.down(); await pg.mouse.move(box[0] + 80, box[1] + 40, { steps: 5 }); await pg.mouse.up();
    await pg.mouse.move(box[0] - 30, box[1] - 20, { steps: 4 });
    await pg.click('[data-a="play"]'); await pg.waitForTimeout(2500); if (await pg.$('[data-a="play"]')) await pg.click('[data-a="play"]').catch(() => {});
    await clearModal(); await checkTab(scen + "/mapa");
    await pg.screenshot({ path: path.join(out, `mapa-${scen}.png`) });
    await go("prehled"); await pg.screenshot({ path: path.join(out, `prehled-${scen}.png`) });
  }
  // nové panely, klávesnice a hratelný kmen
  await go("diplo"); for (const t of ["Cíle soupeřů", "Výzvědná síť"]) if (!(await pg.textContent("main")).includes(t)) errors.push("chybí panel " + t);
  await go("hosp"); if (!(await pg.textContent("main")).includes("Cena obilí v čase")) errors.push("chybí graf ceny obilí");
  await go("chramy"); if (!(await pg.textContent("main")).includes("Kalendář místních svátků")) errors.push("chybí kalendář svátků");
  await go("urednici"); if (!(await pg.textContent("main")).includes("Rody úředníků")) errors.push("chybí rody úředníků");
  await pg.focus("body"); await pg.keyboard.press("2"); if (!(await pg.$('[data-a="tab"][aria-current="page"][data-x=\'["plan"]\']'))) errors.push("klávesa 2 nepřepnula záložku");
  await go("hra"); await pg.selectOption("#ngScen", "ahm"); await pg.selectOption("#ngClan", "medzaj"); await pg.click('[data-a="newgame"]'); await pg.click('[data-a="newgame"]');
  await go("mapa"); await pg.click('[data-a="selProv"][data-x=\'["sau"]\']', { force: true }).catch(() => {});
  for (const t of tabs) { await go(t); await checkTab("medzaj/" + t); }
  await go("plan"); for (let m = 0; m < 3; m++) { await clearModal(); await pg.click('[data-a="end"]'); } await clearModal();
  await pg.setViewportSize({ width: 390, height: 844 });
  for (const t of tabs) { await go(t); const sw = await pg.evaluate(() => document.documentElement.scrollWidth); if (sw > 392) errors.push(`vodorovné posouvání na mobilu (${t}): ${sw}`); }
  await go("mapa"); await pg.screenshot({ path: path.join(out, "mobil.png") });
  await b.close();
  console.log(errors.length ? errors.join("\n") : "e2e OK"); process.exit(errors.length ? 1 : 0);
})();
