// Proklikání sestavené aplikace v prohlížeči (Playwright). Spuštění: node tests/e2e.js
// Hlídá chyby v konzoli a ověřuje hlavní tahy na stole. Snímky ukládá do tests/out/.
const path = require("path"), fs = require("fs");
const { chromium } = require("playwright");
const FILE = "file://" + path.join(__dirname, "..", "dist", "index.html");
const OUT = path.join(__dirname, "out"); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const opts = { headless: true };
  const pw = "/opt/pw-browsers"; if (fs.existsSync(pw)) { const d = fs.readdirSync(pw).find(x => x.startsWith("chromium-")); if (d) Object.assign(opts, { executablePath: `${pw}/${d}/chrome-linux/chrome`, headless: false, args: ["--headless=new"] }); }
  const b = await chromium.launch(opts); const pg = await b.newPage({ viewport: { width: 1180, height: 820 } }); pg.setDefaultTimeout(5000);
  const errors = [], fails = [];
  pg.on("pageerror", e => errors.push(e.message)); pg.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await pg.goto(FILE); await pg.waitForTimeout(400);
  const ev = f => pg.evaluate(f);
  const step = async (name, fn) => { try { await fn(); console.log("✓", name); } catch (e) { fails.push(name + ": " + e.message.split("\n")[0]); console.log("✗", name); await pg.keyboard.press("Escape"); } };
  const sel = async i => { await pg.keyboard.press("Escape"); const o = await pg.$$eval("#projSel option", o => o.map(x => x.value)); await pg.selectOption("#projSel", o[i]); };
  const tabs = ["prehled", "komponenty", "mapa", "mechaniky", "pravidla", "scenare", "stul", "testy", "analyza"];
  const n = (await pg.$$eval("#projSel option", o => o.length));
  for (let i = 0; i < n; i++) await step(`všechny záložky – hra ${i + 1}`, async () => { await sel(i); for (const t of tabs) await pg.click(`[data-tab=${t}]`); });
  await step("šablony karet a ikona zdroje v textu", async () => {
    await sel(1); await pg.click("[data-tab=komponenty]");
    for (const tpl of ["art", "full", "play", "min", "classic"]) { await pg.selectOption("#d-tpl", tpl); if (!(await pg.$(`.pcard.t-${tpl}`))) throw new Error("chybí šablona " + tpl); }
    await pg.click("[data-card]"); await pg.fill("#c-text", "Získej 2 {Mince}"); await pg.waitForTimeout(100);
    if (!(await pg.$("#c-prev .ri"))) throw new Error("ikona zdroje se nevykreslila"); await pg.click("#c-save");
    await pg.screenshot({ path: path.join(OUT, "karty.png") });
  });
  await step("volba z efektu čeká na hráče", async () => {
    await pg.click("[data-tab=pravidla]"); await pg.fill("#tryEff", "vyber: +1 Body | +2 Mince"); await pg.click("#tryGo");
    await pg.click("[data-tab=stul]"); await pg.waitForSelector("[data-pend]"); await pg.click("[data-pend='1']");
    const log = await ev(() => P().table.log[0]); if (!/Mince/.test(log)) throw new Error(log);
  });
  await step("akce s efektem na stole", async () => {
    await ev(() => { P().actions[0].effect = "+1 Body"; }); await pg.click("[data-tool=akce]"); await pg.click("[data-slot]");
    const log = await ev(() => P().table.log.slice(0, 3).join(" | ")); if (!/Body/.test(log)) throw new Error(log);
  });
  await step("simulace v Analýze", async () => {
    await pg.click("[data-tab=analyza]"); await pg.fill("[data-so=games]", "40"); await pg.dispatchEvent("[data-so=games]", "change");
    await pg.click("#simRun"); await pg.waitForSelector(".stat-row", { timeout: 20000 }); await pg.screenshot({ path: path.join(OUT, "simulace.png") });
    const r = await ev(() => S.simRes && S.simRes.r); if (!r || r.error || r.n !== 40) throw new Error(JSON.stringify(r && (r.error || r.n)));
  });
  await step("wargame: hlídání fáze pohybu", async () => {
    await sel(0); await pg.click("[data-tab=scenare]"); await pg.click("[data-play]");
    const it = (await pg.$$(".titem"))[0]; const bb = await it.boundingBox(); await pg.mouse.move(bb.x + 20, bb.y + 20); await pg.mouse.down(); await pg.mouse.move(bb.x + 90, bb.y + 20, { steps: 5 }); await pg.mouse.up();
    const log = await ev(() => P().table.log[0]); if (!/fázi Pohyb/.test(log)) throw new Error(log);
  });
  await step("wargame: provedení výsledku boje", async () => {
    await ev(() => { P().ruleset.strict = false; });
    const ids = await ev(() => { const t = P().table; const u = id => P().units.find(x => x.id === id); const a = t.items.find(i => i.kind === "unit" && u(i.unitId).factionId === P().factions[0].id); const d = t.items.find(i => i.kind === "unit" && u(i.unitId).factionId !== P().factions[0].id); return [a.uid, d.uid]; });
    await pg.click(`.titem[data-uid="${ids[0]}"]`); await pg.click("[data-sa=asAtt]");
    await pg.click(`.titem[data-uid="${ids[1]}"]`); await pg.click("[data-sa=asDef]");
    await pg.click("#cRoll"); await pg.click("#wApply");
    const log = await ev(() => P().table.log.slice(0, 2).join(" | ")); if (!/boj/.test(log)) throw new Error(log);
  });
  await step("wargame: iniciativa a zásobování", async () => {
    await pg.click("#wInit"); const ord = await ev(() => P().table.order); if (!ord || ord.length !== 2) throw new Error(String(ord));
    await pg.check("#wSup"); await pg.waitForSelector("#wSupR");
  });
  await step("iPad: zvětšení a kreslení", async () => {
    await pg.click("#zIn"); const z = await ev(() => S.zoom); if (!(z > 1)) throw new Error("zoom " + z);
    await pg.click("#zFit"); await pg.click("#inkOn");
    const r = await (await pg.$(".mat-scroll")).boundingBox(); await pg.mouse.move(r.x + 200, r.y + 200); await pg.mouse.down(); await pg.mouse.move(r.x + 300, r.y + 260, { steps: 6 }); await pg.mouse.up();
    const n = await ev(() => (P().table.ink || []).length); if (n !== 1) throw new Error("tahů " + n);
    await pg.click("#inkOn"); await pg.screenshot({ path: path.join(OUT, "wargame.png") });
  });
  await step("dílky: líznutí a položení", async () => {
    await sel(4); await pg.click("[data-tab=stul]"); await pg.click("[data-tool=dilky]"); await pg.click("#tileDraw");
    const k = await ev(() => { const p = P(), t = p.table, b = tableBoard(p); return tileFits(p, t, b, t.tileHand)[0]; }); if (!k) throw new Error("dílek nemá kam");
    const before = await ev(() => Object.keys(P().table.tilesPlaced).length);
    await pg.click(`.cell[data-k="${k}"]`, { force: true }); const after = await ev(() => Object.keys(P().table.tilesPlaced).length);
    if (after !== before + 1) throw new Error(`${before} → ${after}`);
  });
  await step("verze a příručka", async () => {
    await pg.click("[data-tab=prehled]"); await pg.fill("#vVer", "9"); await pg.click("#vSave"); if (!(await ev(() => P().versions.length))) throw new Error("verze neuložena");
    await pg.click("#bookShow"); await pg.waitForSelector(".book h2"); await pg.keyboard.press("Escape");
  });
  await step("tisk se spadávkou – dialog", async () => {
    await pg.click("[data-tab=komponenty]"); await pg.click("#printSheet"); await pg.waitForSelector("#prBleed"); await pg.keyboard.press("Escape");
  });
  await step("ladění varianty v Analýze", async () => {
    await sel(1); await pg.click("[data-tab=analyza]"); await pg.fill("#tuVals", "10, 20"); await pg.dispatchEvent("#tuVals", "change"); await pg.fill("#tuGames", "20"); await pg.dispatchEvent("#tuGames", "change");
    await pg.click("#tuRun"); await pg.waitForSelector("[data-tuuse]", { timeout: 30000 });
  });
  await step("dražba karty z trhu", async () => {
    await sel(1); await pg.click("[data-tab=stul]"); await pg.click("[data-tool=trh]"); await pg.check("#mAuc"); await pg.click("[data-mauc]");
    const ids = await ev(() => P().factions.map(f => f.id)); await ev(() => { const t = P().table; Object.values(t.res).forEach(r => { r.mince = 10; }); });
    await pg.click(`[data-abid="${ids[0]}|1"]`); await pg.click(`[data-apass="${ids[1]}"]`); await pg.click(`[data-apass="${ids[2]}"]`); await pg.click("#aPay");
    const log = await ev(() => P().table.log[0]); if (!/vydražil/.test(log)) throw new Error(log);
  });
  await step("kostky: smíšený hod a zápis", async () => {
    await pg.click("[data-tab=stul]"); await pg.click("[data-tool=kostky]"); await pg.fill("#diceExpr", "2k6+k%+1"); await pg.click("#rollExpr");
    const n = await ev(() => S.pool.length); if (n !== 3) throw new Error("kostek " + n);
    await pg.check("#diceAdd"); await pg.fill("#diceN", "1"); await pg.click("[data-roll='8']"); if ((await ev(() => S.pool.length)) !== 4) throw new Error("nepřidalo k8");
    await pg.fill("#diceS", "7"); await pg.click("#rollS"); const s = await ev(() => S.pool[S.pool.length - 1].s); if (s !== 7) throw new Error("stěn " + s);
  });
  await step("telefon – Přehled", async () => { await pg.setViewportSize({ width: 400, height: 820 }); await pg.click("[data-tab=prehled]"); await pg.screenshot({ path: path.join(OUT, "telefon.png") }); });
  await b.close();
  console.log(`\n${fails.length ? fails.length + " kroků selhalo:\n" + fails.join("\n") : "Všechny kroky prošly."}\n${errors.length ? "Chyby v konzoli:\n" + errors.join("\n") : "Bez chyb v konzoli."}`);
  process.exit(fails.length || errors.length ? 1 : 0);
})();
