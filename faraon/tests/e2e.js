// Proklikání hry v prohlížeči: všechny záložky, rozkazy, události, vojsko, několik měsíců. Hlídá chyby v konzoli.
const { chromium } = require("playwright"); const path = require("path"); const fs = require("fs");
const tabSel = t => `[data-a="tab"][data-x='["${t}"]']`;
(async () => {
  const out = process.argv[2] || path.join(__dirname, "out"); fs.mkdirSync(out, { recursive: true }); const errors = [];
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  pg.on("pageerror", e => errors.push("pageerror: " + e.message)); pg.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });
  await pg.goto("file://" + path.join(__dirname, "..", "dist", "index.html"));
  const tabs = ["prehled", "plan", "mapa", "zupy", "urednici", "vojsko", "diplo", "hosp", "chramy", "rod", "vedeni", "kronika", "hra"];
  const clearModal = async () => { for (let i = 0; i < 8; i++) { const ch = await pg.$("#modal:not(.hidden) .ch"); if (!ch) break; await ch.click(); } };
  const checkTab = async (label) => { const bad = await pg.$$eval("main .bad", els => els.map(e => e.textContent).filter(t => t.includes("Chyba"))); if (bad.length) errors.push(`${label}: ${bad[0]}`); };
  for (const scen of ["sip", "fip", "anch"]) {
    await pg.click(tabSel("hra"));
    await pg.selectOption("#ngScen", scen); await pg.click('[data-a="newgame"]'); await pg.click('[data-a="newgame"]');
    for (const t of tabs) { await pg.click(tabSel(t)); await checkTab(scen + "/" + t); }
    await pg.click(tabSel("vedeni")); const r = await pg.$('[data-a="research"]:not([disabled])'); if (r) await r.click();
    for (let m = 0; m < 14; m++) {
      await clearModal();
      await pg.click(tabSel("plan"));
      const go = await pg.$('[data-a="cmd"]'); if (go) await go.click();
      await clearModal();
      const all = await pg.$('[data-a="adviseAll"]:not([disabled])'); if (all) await all.click();
      await clearModal();
      await pg.click('[data-a="end"]'); await clearModal();
    }
    await pg.click(tabSel("diplo")); const j = await pg.$$('[data-a="dipl"]'); if (j.length) { await j[0].click(); const w = await pg.$('[data-a="diplo"][data-x*="valka"]:not([disabled])'); if (w) await w.click(); }
    await clearModal();
    await pg.click(tabSel("mapa")); const sendBtn = await pg.$('[data-a="send"]'); if (sendBtn) await sendBtn.click();
    for (let m = 0; m < 4; m++) { await clearModal(); await pg.click('[data-a="end"]'); }
    await clearModal();
    for (const t of tabs) { await pg.click(tabSel(t)); await checkTab(scen + "/po válce/" + t); }
    for (const z of ["horni", "delta", "nubie", "cele"]) { await pg.click(tabSel("mapa")); await pg.click(`[data-a="zoom"][data-x='["${z}"]']`); }
    await pg.click(tabSel("chramy")); const mb = await pg.$('[data-a="mon"]:not([disabled])'); if (mb) await mb.click(); await checkTab(scen + "/stavby");
    await pg.click(tabSel("hra")); await pg.click('[data-a="copySave"]'); const len = await pg.$eval("#saveTxt", el => el.value.length); if (len < 1000) errors.push("uložení jako text je prázdné"); await pg.click('[data-a="pasteSave"]');
    await pg.click(tabSel("mapa"));
    for (const m of ["teren", "uroda", "loy", "rozvoj", "vojsko", "polit"]) await pg.click(`[data-a="mapMode"][data-x='["${m}"]']`);
    const box = await pg.$eval("#mapsvg", el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    await pg.mouse.move(box[0], box[1]); await pg.mouse.wheel(0, -400); await pg.waitForTimeout(300);
    await pg.mouse.down(); await pg.mouse.move(box[0] + 80, box[1] + 40, { steps: 5 }); await pg.mouse.up();
    await pg.mouse.move(box[0] - 30, box[1] - 20, { steps: 4 });
    await pg.click('[data-a="play"]'); await pg.waitForTimeout(2500); if (await pg.$('[data-a="play"]')) await pg.click('[data-a="play"]').catch(() => {});
    await clearModal(); await checkTab(scen + "/mapa");
    await pg.screenshot({ path: path.join(out, `mapa-${scen}.png`) });
    await pg.click(tabSel("prehled")); await pg.screenshot({ path: path.join(out, `prehled-${scen}.png`) });
  }
  await pg.setViewportSize({ width: 390, height: 844 });
  for (const t of tabs) { await pg.click(tabSel(t)); const sw = await pg.evaluate(() => document.documentElement.scrollWidth); if (sw > 392) errors.push(`vodorovné posouvání na mobilu (${t}): ${sw}`); }
  await pg.click(tabSel("mapa")); await pg.screenshot({ path: path.join(out, "mobil.png") });
  await b.close();
  console.log(errors.length ? errors.join("\n") : "e2e OK"); process.exit(errors.length ? 1 : 0);
})();
