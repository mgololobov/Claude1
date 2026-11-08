// Proklikání sestavené hry v prohlížeči (Playwright). Spuštění: node tests/e2e.js
const path = require("path"), fs = require("fs");
const { chromium } = require("playwright");
const FILE = "file://" + path.join(__dirname, "..", "dist", "index.html");
const OUT = path.join(__dirname, "out"); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1360, height: 900 } }); pg.setDefaultTimeout(8000);
  const errors = [], fails = [];
  pg.on("pageerror", e => errors.push(e.message)); pg.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await pg.goto(FILE); await pg.waitForSelector("#top .realm");
  if (await pg.$("#title:not(.hidden)")) { await pg.screenshot({ path: path.join(OUT, "uvod.png") }); await pg.click("#title [data-a=titleStep]"); await pg.waitForSelector("#title .ctile"); await pg.screenshot({ path: path.join(OUT, "uvod-rody.png") }); await pg.click("#title [data-a=titleStart]"); }
  const step = async (name, fn) => { try { await fn(); console.log("✓", name); } catch (e) { fails.push(name + ": " + e.message.split("\n")[0]); console.log("✗", name, e.message.split("\n")[0]); } };
  const clearEvents = async () => { for (let i = 0; i < 15 && await pg.$("#modal:not(.hidden) .ch:not([disabled])"); i++) await pg.click("#modal:not(.hidden) .ch:not([disabled])"); };
  const ev = f => pg.evaluate(f);
  const tab = t => pg.click(`#tabs [data-x='["${t}"]']`);
  const tabs = ["prehled", "mapa", "kraj", "vazalove", "vojsko", "diplo", "rise", "hosp", "stavy", "rod", "objevy", "vypravy", "kronika", "hra"];
  await step("všechny záložky", async () => { for (const t of tabs) await tab(t); });
  await step("vazal: detail", async () => { await tab("vazalove"); const rows = await pg.$$(".otile[data-a=selOff]"); await rows[2].click(); await pg.waitForSelector(".card.sticky .meter"); });
  await step("rozkaz vazalovi", async () => {
    await tab("kraj"); const btns = await pg.$$("button.go[data-a=cmd]"); await btns[0].click(); await clearEvents();
    const acted = await ev(() => officers(S, S.player).filter(c => c.acted === S.turn).length); if (!(acted >= 1)) throw new Error("rozkaz neproběhl");
  });
  await step("nábor přes rozkaz", async () => {
    const id = await ev(() => officersIn(S, P(S).capital).find(c => c.acted !== S.turn).id);
    await pg.selectOption(`#cs_${id}`, "nabor"); await pg.fill(`#a2_${id}`, "200"); const m0 = await ev(() => men(S.provs[P(S).capital].troops));
    await pg.click(`button[data-a=cmd][data-x='["${id}"]']`); const m1 = await ev(() => men(S.provs[P(S).capital].troops)); if (m1 !== m0 + 200) throw new Error(m0 + "→" + m1);
  });
  await step("mapa a výběr kraje", async () => { await tab("mapa"); await pg.click(`.pv[data-x='["budin"]']`); if (await ev(() => SEL.prov) !== "budin") throw new Error("výběr"); await pg.screenshot({ path: path.join(OUT, "mapa.png") }); });
  await step("diplomacie: dary", async () => { await tab("diplo"); await pg.click(`.dtile[data-a=selDip][data-x='["wittL"]']`); const r0 = await ev(() => rel(S, S.player, "wittL")); await pg.selectOption("#dt_wittL", "dar"); await pg.click(`[data-a=dip][data-x='["wittL"]']`); await clearEvents(); const r1 = await ev(() => rel(S, S.player, "wittL")); await pg.screenshot({ path: path.join(OUT, "diplo-detail.png") }); if (!(r1 > r0)) throw new Error(r0 + "→" + r1); });
  await step("válka a vyslání vojska", async () => {
    await pg.click(`[data-a=war][data-x='["wittL"]']`); await pg.click(`[data-a=war][data-x='["wittL"]']`); await clearEvents();
    if (!(await ev(() => atWar(S, S.player, "wittL")))) throw new Error("válka");
    await ev(() => { SEL.prov = "plzen"; }); await tab("kraj");
    const opts = await pg.$$eval("#dto option", x => x.map(y => y.value)); await pg.selectOption("#dto", opts.includes("rezno") ? "rezno" : opts[0]);
    await pg.click("button[data-a=dispatch]"); const n = await ev(() => S.armies.filter(a => a.cl === S.player).length); if (n < 1) throw new Error("vojsko nevytáhlo: " + (await pg.textContent("#toast")));
  });
  await step("plán měsíce: rádce za všechny", async () => { await tab("plan"); await pg.click("[data-a=adviseAll]"); await pg.screenshot({ path: path.join(OUT, "plan.png"), fullPage: true }); const idle = await ev(() => officers(S, S.player).filter(c => c.acted !== S.turn && !c.army && c.id !== P(S).leader).length); if (idle > 3) throw new Error("nevyužito " + idle); });
  await step("mapa: obchodní cesty a šipky", async () => { await tab("mapa"); await pg.click("[data-a=routes]"); if (!(await pg.$("svg.map .route"))) throw new Error("cesty"); if (!(await pg.$("svg.map .march"))) throw new Error("šipka pochodu"); await pg.screenshot({ path: path.join(OUT, "mapa-cesty.png") }); });
  await step("osobně vedená bitva", async () => {
    await ev(() => { const a = S.armies.find(x => x.cl === S.player); a.manual = true; a.path = []; S.armies.push({ id: "aE", cl: "wittL", t: { pesi: 900, strelci: 200, jizda: 80, zoldneri: 0 }, cmds: [], loc: a.loc, to: a.loc, path: [], grain: 100, train: 40, morale: 80, mode: "utok", siegeMode: "obleh", from: "rezno" }); S.events = []; render(); });
    await clearEvents(); await pg.screenshot({ path: path.join(OUT, "pred-bitvou.png") }); try { await pg.click("button.main", { timeout: 8000 }); } catch (e) { await pg.screenshot({ path: path.join(OUT, "bitva-chyba.png") }); throw new Error("konec měsíce: " + e.message.split("\n")[0]); }
    for (let i = 0; i < 15 && !(await pg.$("#modal:not(.hidden) .bgrid")) && await pg.$("#modal:not(.hidden) .ch:not([disabled])"); i++) await pg.click("#modal:not(.hidden) .ch:not([disabled])");
    if (!(await ev(() => S.events.some(e => e.id === "_battle")))) throw new Error("bitva nezačala: " + (await ev(() => JSON.stringify(S.armies.map(a => [a.cl, a.loc, a.engaged])))));
    await pg.waitForSelector("#modal .bgrid"); await pg.screenshot({ path: path.join(OUT, "bitva.png") });
    for (let i = 0; i < 8 && await pg.$("#modal:not(.hidden) .bgrid"); i++) { try { await pg.click("#modal .orders .ch", { timeout: 8000 }); } catch (e) { await pg.screenshot({ path: path.join(OUT, "bitva-chyba.png") }); throw new Error("rozkaz v " + (i + 1) + ". kole: " + e.message.split("\n")[0]); } }
    if (await ev(() => Object.keys(S.pend || {}).length)) throw new Error("bitva neskončila");
    await clearEvents();
  });
  await step("mapové režimy", async () => { await tab("mapa"); for (const m of ["teren", "rozvoj", "spokoj", "vztahy", "kultura", "vira", "obchod", "jadra", "polit"]) { await pg.click(`.mmodes [data-a=mode][data-x='["${m}"]']`); if (m === "kultura" || m === "vztahy") await pg.screenshot({ path: path.join(OUT, "rezim-" + m + ".png") }); } });
  await step("přiblížení mapy", async () => { await pg.click(".zoom [data-a=zoom]"); const w = await ev(() => SEL.view.w); if (!(w < 720)) throw new Error("zoom " + w); await pg.screenshot({ path: path.join(OUT, "mapa-zoom.png") }); await pg.click(".zoom [data-a=zoomReset]"); });
  await step("vojsko: výběr žetonu a pochod kliknutím", async () => {
    await clearEvents(); const id = await ev(() => { const a = S.armies.find(x => x.cl === S.player); return a && a.id; }); if (!id) return;
    await pg.click(`.atok.own[data-x='["${id}"]']`); await pg.waitForSelector("#side .hint");
    const tgt = await ev(() => { const a = S.armies.find(x => x.cl === S.player); return S.provs[a.loc].nb.find(n => S.provs[n].owner === S.player) || P(S).capital; });
    await pg.click(`.pv[data-x='["${tgt}"]']`, { force: true }); const ok = await ev(id2 => { const a = S.armies.find(x => x.id === id2); return !a || (a.path && a.path.length) || a.to; }, id); if (!ok) throw new Error("rozkaz k pochodu");
    await pg.screenshot({ path: path.join(OUT, "vojsko-pochod.png") }); await pg.keyboard.press("Escape");
  });
  await step("okno Vláda: stabilita a idea", async () => { await ev(() => { P(S).mp = { adm: 500, dip: 500, mil: 500 }; render(); }); await tab("vlada"); const st0 = await ev(() => P(S).stab); await pg.click("[data-a=stab]"); await pg.click(`[data-a=idea][data-x='["vojsko"]']`); if ((await ev(() => P(S).stab)) !== st0 + 1 || !(await ev(() => P(S).ideas.rytiri))) throw new Error("vláda"); await pg.screenshot({ path: path.join(OUT, "vlada.png"), fullPage: true }); });
  await step("čin panovníka: turnaj a klání", async () => { await clearEvents(); await ev(() => { P(S).gold = 5000; S.events = []; render(); }); await tab("vlada"); await pg.click(`[data-a=deed][data-x='["turnaj"]']`); await pg.waitForSelector("#modal:not(.hidden) .ch"); await pg.screenshot({ path: path.join(OUT, "turnaj.png") }); await clearEvents(); if (await ev(() => P(S).deedTurn) !== await ev(() => S.turn)) throw new Error("čin"); await tab("vlada"); if (!(await pg.$("text=Velká díla"))) throw new Error("díla"); await tab("hosp"); if (!(await pg.$("text=Kupecké zakázky"))) throw new Error("zakázky"); });
  await step("mor na mapě a karanténa", async () => { await ev(() => { S.provs[P(S).capital].plague = 6; render(); }); await tab("mapa"); if (!(await pg.$(".plague"))) throw new Error("ikona moru"); await ev(() => { S.month = 0; render(); }); });
  await step("výpravy a poklady", async () => { await clearEvents(); await ev(() => { P(S).gold = 5000; render(); }); await tab("vypravy"); await pg.click(`.wdest[data-x='["pariz"]']`); await pg.click(`[data-a=expgo][data-x='["pariz"]']`); if (!(await ev(() => (P(S).exps || []).some(e => e.d === "pariz")))) throw new Error("výprava"); await pg.screenshot({ path: path.join(OUT, "vypravy.png"), fullPage: true }); await tab("objevy"); await pg.screenshot({ path: path.join(OUT, "objevy2.png"), fullPage: true }); });
  await step("nové scény událostí", async () => { await ev(() => { S.events = [{ id: "alchymista" }, { id: "_hist", k: "templari" }, { id: "_objev", t: "kuse" }]; render(); }); for (const n of ["ev-alchymie", "ev-templari", "ev-objev"]) { await pg.waitForSelector("#modal:not(.hidden) .ch"); await pg.screenshot({ path: path.join(OUT, n + ".png") }); await pg.click("#modal:not(.hidden) .ch:not([disabled])"); } });
  await step("zákony jako karty", async () => { await clearEvents(); await ev(() => { P(S).prestige = 500; render(); }); await tab("stavy"); await pg.click(`[data-a=law][data-x='["skoly",2]']`); if (await ev(() => P(S).laws.skoly) !== 2) throw new Error("zákon"); await pg.screenshot({ path: path.join(OUT, "zakony.png"), fullPage: true }); });
  await step("kostky, spiknutí a počasí", async () => { await clearEvents(); await ev(() => { S.weather = { t: "zima", y: S.year }; const v = officers(S, me()).find(c => c.id !== P(S).leader && !c.dyn); v.loy = 30; S.plots = [{ id: "plE", lead: v.id, m: [v.id], str: 45, goal: "atentat", known: true }]; P(S).gold = 3000; P(S).deedTurn = -1; render(); });
    await tab("vlada"); if (!(await pg.$("text=Tajná služba a spiknutí"))) throw new Error("spiknutí"); await pg.click(`[data-a=deed][data-x='["kostky"]']`); await pg.waitForSelector("#modal:not(.hidden) .ch"); await pg.click("#modal:not(.hidden) .ch:not([disabled])"); await pg.waitForSelector(".dicebox"); await pg.screenshot({ path: path.join(OUT, "kostky.png") }); await clearEvents();
    await tab("mapa"); if (!(await pg.$(".wx-snow"))) throw new Error("sníh"); await pg.screenshot({ path: path.join(OUT, "pocasi.png") }); await pg.click(`[data-a=plot][data-x='["plE","zatknout"]']`).catch(() => {}); });
  await step("24 měsíců", async () => { for (let i = 0; i < 24; i++) { await clearEvents(); await pg.click("button.main"); } await clearEvents(); if (await ev(() => S.turn) < 20) throw new Error("tah"); });
  await step("všechny záložky po hře + snímky", async () => { for (const t of tabs) { await clearEvents(); await tab(t); await pg.screenshot({ path: path.join(OUT, t + ".png"), fullPage: true }); } });
  await step("uložení a načtení", async () => { await pg.click(`[data-a=save][data-x='[1]']`); const t = await ev(() => S.turn); await clearEvents(); await pg.click("button.main"); await clearEvents(); await tab("hra"); await pg.click(`[data-a=load][data-x='[1]']`); if (await ev(() => S.turn) !== t) throw new Error("načtení"); });
  await step("scénář 1273", async () => { await tab("hra"); await pg.selectOption("#ngScen", "1273"); await pg.selectOption("#ngClan", "premysl"); await pg.click("[data-a=newgame]"); await pg.click("[data-a=newgame]"); if (await ev(() => S.year) !== 1273) throw new Error("rok"); await tab("prehled"); await pg.screenshot({ path: path.join(OUT, "scenar1273.png") }); await tab("rod"); await pg.screenshot({ path: path.join(OUT, "rod1273.png") }); });
  await step("nová hra za Habsburky", async () => { await tab("hra"); await pg.selectOption("#ngScen", "1256"); await pg.selectOption("#ngClan", "habsburg"); await pg.click("[data-a=newgame]"); await pg.click("[data-a=newgame]"); if (await ev(() => S.player) !== "habsburg") throw new Error("rod"); });
  await step("telefon bez vodorovného posunu", async () => { await pg.setViewportSize({ width: 390, height: 800 }); for (const t of ["prehled", "kraj", "mapa"]) { await tab(t); const w = await ev(() => document.documentElement.scrollWidth); if (w > 400) throw new Error(t + " šířka " + w); } await pg.screenshot({ path: path.join(OUT, "telefon.png") }); });
  await b.close();
  if (errors.length) console.log("Chyby v konzoli:\n" + [...new Set(errors)].join("\n"));
  if (fails.length || errors.length) { console.log("SELHALO: " + fails.length + " kroků, " + errors.length + " chyb"); process.exit(1); }
  console.log("Vše prošlo.");
})();
