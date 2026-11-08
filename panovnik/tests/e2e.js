// Proklikání sestavené hry v prohlížeči (Playwright). Spuštění: node tests/e2e.js
const path = require("path"), fs = require("fs");
const { chromium } = require("playwright");
const FILE = "file://" + path.join(__dirname, "..", "dist", "index.html");
const OUT = path.join(__dirname, "out"); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1280, height: 900 } }); pg.setDefaultTimeout(5000);
  const errors = [], fails = [];
  pg.on("pageerror", e => errors.push(e.message)); pg.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await pg.goto(FILE); await pg.waitForSelector("#top .realm");
  const step = async (name, fn) => { try { await fn(); console.log("✓", name); } catch (e) { fails.push(name + ": " + e.message.split("\n")[0]); console.log("✗", name, e.message.split("\n")[0]); } };
  const clearEvents = async () => { for (let i = 0; i < 10 && await pg.$("#modal:not(.hidden) .ch:not([disabled])"); i++) await pg.click("#modal:not(.hidden) .ch:not([disabled])"); };
  const tabs = ["prehled", "sidlo", "uzemi", "hosp", "trh", "vojsko", "valka", "politika", "dvur", "diplo", "objevy", "kronika", "hra"];
  await step("všechny záložky", async () => { for (const t of tabs) { await pg.click(`[data-x='["${t}"]']`); await pg.waitForTimeout(30); } });
  await step("stavba v sídle", async () => { await pg.click(`[data-x='["sidlo"]']`); await pg.click(`[data-a=build][data-x='["seat","kaple"]']`); const q = await pg.evaluate(() => S.queue.length); if (q !== 1) throw new Error("fronta " + q); });
  await step("prodej na trhu", async () => { await pg.click(`[data-x='["trh"]']`); const m = await pg.evaluate(() => S.money); await pg.click(`[data-a=sell][data-x='["zelezo","#q_zelezo"]']`); const m2 = await pg.evaluate(() => S.money); if (!(m2 > m)) throw new Error(m + " → " + m2); });
  await step("čin panovníka", async () => { await pg.click(`[data-x='["prehled"]']`); await pg.click(`[data-a=action][data-x='["objezd"]']`); if (await pg.evaluate(() => S.ap) !== 1) throw new Error("body činů"); });
  await step("daně a zákony", async () => { await pg.click(`[data-x='["hosp"]']`); await pg.selectOption(`select[data-a=tax][data-x='["sedlaci"]']`, "3"); if (await pg.evaluate(() => S.tax.sedlaci) !== 3) throw new Error("daň");
    await pg.click(`[data-x='["politika"]']`); await pg.selectOption(`select[data-a=law][data-x='["robota"]']`, "2"); if (await pg.evaluate(() => S.laws.robota) !== 2) throw new Error("zákon"); });
  await step("diplomacie: dary", async () => { await pg.click(`[data-x='["diplo"]']`); await pg.selectOption("#dp_biskup", "dar"); await pg.click(`[data-a=dip][data-x='["biskup","#dp_biskup"]']`); if (await pg.evaluate(() => S.rivals.biskup.lastDip) !== await pg.evaluate(() => S.turn)) throw new Error("poselstvo"); });
  await step("válka a přesun vojska", async () => { await pg.evaluate(() => { S.claims.zalesi = true; }); await pg.selectOption("#dp_zalesi", "valka"); await pg.click(`[data-a=dip][data-x='["zalesi","#dp_zalesi"]']`);
    await clearEvents(); await pg.click(`[data-x='["vojsko"]']`); await pg.selectOption(`select[data-a=move][data-x='["a1"]']`, "dubova"); if (!(await pg.evaluate(() => S.armies[0].order))) throw new Error("rozkaz"); });
  await step("dvanáct období", async () => { for (let i = 0; i < 12; i++) { await clearEvents(); await pg.click("button.main"); } await clearEvents(); const t = await pg.evaluate(() => S.turn); if (t < 10) throw new Error("tah " + t); });
  await step("všechny záložky po hře", async () => { for (const t of tabs) { await clearEvents(); await pg.click(`[data-x='["${t}"]']`); await pg.screenshot({ path: path.join(OUT, t + ".png"), fullPage: true }); } });
  await step("uložení a načtení", async () => { await pg.click(`[data-a=save][data-x='[1]']`); const t = await pg.evaluate(() => S.turn); await clearEvents(); await pg.click("button.main"); await clearEvents(); await pg.click(`[data-a=load][data-x='[1]']`); if (await pg.evaluate(() => S.turn) !== t) throw new Error("načtení"); });
  await step("telefon bez vodorovného posunu", async () => { await pg.setViewportSize({ width: 390, height: 800 }); await pg.click(`[data-x='["prehled"]']`); const w = await pg.evaluate(() => document.documentElement.scrollWidth); await pg.screenshot({ path: path.join(OUT, "telefon.png") }); if (w > 400) throw new Error("šířka " + w); });
  await b.close();
  if (errors.length) console.log("Chyby v konzoli:\n" + [...new Set(errors)].join("\n"));
  if (fails.length || errors.length) { console.log("SELHALO: " + fails.length + " kroků, " + errors.length + " chyb"); process.exit(1); }
  console.log("Vše prošlo.");
})();
