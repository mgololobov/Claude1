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
  pg.on("pageerror", e => errors.push(e.message + (process.env.E2E_STACK ? "\n" + e.stack : ""))); pg.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await pg.goto(FILE); await pg.waitForTimeout(400);
  const ev = f => pg.evaluate(f);
  const step = async (name, fn) => { try { await fn(); console.log("✓", name); } catch (e) { const w = (e.message.match(/waiting for (locator\([^)]*\))/) || [])[1] || ""; fails.push(name + ": " + e.message.split("\n")[0] + (w ? " – " + w : "")); console.log("✗", name); await pg.keyboard.press("Escape"); } };
  const sel = async i => { await pg.keyboard.press("Escape"); const o = await pg.$$eval("#projSel option", o => o.map(x => x.value)); await pg.selectOption("#projSel", o[i]); };
  const tabs = ["prehled", "komponenty", "mapa", "mechaniky", "pravidla", "scenare", "stul", "testy", "analyza"];
  const n = (await pg.$$eval("#projSel option", o => o.length));
  for (let i = 0; i < n; i++) await step(`všechny záložky – hra ${i + 1}`, async () => { await sel(i); for (const t of tabs) await pg.click(`[data-tab=${t}]`); });
  await step("šablony karet a ikona zdroje v textu", async () => {
    await sel(1); await pg.click("[data-tab=komponenty]");
    for (const tpl of ["art", "full", "play", "min", "classic"]) { await pg.selectOption("#d-tpl", tpl); if (!(await pg.$(`.pcard.t-${tpl}`))) throw new Error("chybí šablona " + tpl); }
    await pg.click("[data-card]"); await pg.fill("#c-text", "Získej 2 {Mince}"); await pg.dispatchEvent("#c-text", "input");
    await pg.waitForSelector("#c-prev .ri", { timeout: 3000 }).catch(() => { throw new Error("ikona zdroje se nevykreslila"); }); await pg.click("#c-save");
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
  await step("nové mechaniky: aktivace, rozvoj, hromádka, riskuj", async () => {
    await sel(1);
    await ev(() => { const p = P(); p.chits = "Flotila; " + p.factions[1].name; p.techs = [{ id: "t1", name: "Jeřáb", cost: "1 Mince", req: "", effect: "+1 Body", vp: 1 }]; p.goals = [{ id: "g1", name: "Boháč", kind: "most", what: "Mince", n: 1, pts: 3 }]; touch(p); });
    await pg.click("[data-tab=stul]"); await pg.click("[data-tool=aktivace]"); await pg.click("#chitDraw");
    if ((await ev(() => P().table.chitsOut.length)) !== 1) throw new Error("žeton nevytažen");
    await pg.click("[data-tool=rozvoj]"); await ev(() => { const t = P().table; Object.values(t.res).forEach(r => r.mince = 5); }); await pg.click("[data-tool=rozvoj]"); await pg.click("[data-tbuy]");
    if (!/Jeřáb/.test(await ev(() => P().table.log[0] + P().table.log[1]))) throw new Error("technologie nezískána");
    await ev(() => { P().push.deckId = P().decks[0].id; touch(P()); render(); }); await pg.click("[data-tool=riskuj]"); await pg.click("#puDraw");
    await sel(3); await ev(() => { P().shed.deckId = P().decks[0].id; touch(P()); }); await pg.click("[data-tab=stul]"); await pg.click("[data-tool=hromadka]"); await pg.click("#shStart"); await pg.click("#shShow");
    await pg.screenshot({ path: path.join(OUT, "mechaniky.png") }); await pg.click("#shDraw");
    await ev(() => { const p = P(), t = p.table, d = p.decks[0]; p.factions.forEach(f => { t.hands[f.id] = d.cards.slice(0, 4).map(c => ({ deckId: d.id, cardId: c.id })); }); });
    await pg.click("[data-tool=ruce]"); await pg.click("#showHand"); if (!(await pg.$("#meld"))) throw new Error("chybí vykládání sestav"); await sel(1);
  });
  await step("mechaniky: nastavení se vykreslí", async () => {
    await pg.click("[data-tab=mechaniky]"); await pg.click("#techAdd"); await pg.click("#goalAdd"); await pg.check("#ddOn");
    await pg.click("[data-tab=stul]"); await pg.click("[data-tool=kostky]"); await pg.click("#ddRoll"); await pg.click("[data-ddtake]");
    if (!/bere kostku/.test(await ev(() => P().table.log[0]))) throw new Error("kostka nevzata");
  });
  await step("dungeon crawler: místnosti, útok a tah příšer", async () => {
    await sel(7); await pg.click("[data-tab=scenare]"); await pg.click("[data-play]");
    const dark = await ev(() => crawlDarkSet(P(), P().table).size); if (!dark) throw new Error("místnosti nejsou zakryté");
    await pg.click("[data-tool=vyprava]"); await pg.click("#crMon");
    const ids = await ev(() => { const t = P().table; const h = t.items.find(i => isHero(P(), i)); return h.uid; });
    await pg.click(`.titem[data-uid="${ids}"]`); if (!(await pg.$("[data-hp]"))) throw new Error("chybí životy u hrdiny");
    await ev(() => { const p = P(), t = p.table; const h = t.items.find(i => i.uid === S.sel); revealRoom(p, t, "Chodba", h.uid); placeOn(p, t, h, "4,3"); render(); });
    await pg.click(`.titem[data-uid="${ids}"]`); await pg.click("[data-crawlatt]");
    if (!/útočí na/.test(await ev(() => P().table.log.slice(0, 3).join(" ")))) throw new Error("útok neproběhl");
    await pg.screenshot({ path: path.join(OUT, "krypta.png") });
  });
  await step("kameny a lámání kódu", async () => {
    await ev(() => { const p = P(); p.stones.on = true; p.stones.win = "row"; p.stones.rowN = 4; p.code.on = true; touch(p); render(); });
    await pg.click("[data-tool=kameny]"); await pg.click("#stMode"); await pg.click('.cell[data-k="1,3"]', { force: true });
    if ((await ev(() => Object.keys(P().table.stones || {}).length)) !== 1) throw new Error("kámen nepoložen");
    await pg.click("[data-tool=kod]"); await pg.click("#cdNew"); for (let i = 0; i < 4; i++) await pg.click("[data-cds]");
    await pg.click("#cdGo"); if ((await ev(() => P().table.code.guesses.length)) !== 1) throw new Error("pokus nevyhodnocen");
  });
  await step("mapa z karet lokací: vyložení, pohyb a tah nepřátel", async () => {
    await sel(8); await pg.click("[data-tab=stul]"); await pg.click("[data-tool=lokace]"); await pg.click("#cmBuild");
    if ((await ev(() => P().table.cmap.cards.length)) !== 6) throw new Error("mapa nevyložena");
    const uidH = await ev(() => P().table.items.find(i => isHero(P(), i)).uid);
    const it = await pg.$(`.titem[data-uid="${uidH}"]`); const bb = await it.boundingBox(); const tgt = await ev(() => cmapBox(P(), 1));
    const mat = await (await pg.$("#mat")).boundingBox(); await pg.mouse.move(bb.x + 20, bb.y + 20); await pg.mouse.down(); await pg.mouse.move(mat.x + tgt.x + 60, mat.y + tgt.y + 100, { steps: 8 }); await pg.mouse.up();
    if ((await ev(() => cmapIndexOf(P(), P().table, P().table.items.find(i => i.uid === S.sel)))) !== 1) throw new Error("voják nepřešel na 2. kartu");
    if (!(await ev(() => P().table.cmap.cards[1].rev))) throw new Error("lokace se neodhalila");
    await pg.click("[data-tool=lokace]"); await pg.click("#cmMon"); await pg.screenshot({ path: path.join(OUT, "lokace.png") });
  });
  await step("rozsévání a přesýpací hodiny", async () => {
    await ev(() => { const p = P(); p.mancala.on = true; touch(p); render(); }); await pg.click("[data-tool=rozsevani]"); await pg.click("#mcStart"); await pg.click(".pit:not([disabled])");
    if (!/rozsévá/.test(await ev(() => P().table.log[0] + P().table.log[1]))) throw new Error("nerozsévá");
    await pg.click("[data-tool=kolo]"); await pg.fill("#cdSec", "5"); await pg.click("#cdStart"); if (!(await ev(() => S.cdEnd))) throw new Error("odpočet neběží");
  });
  await step("síť míst: plavba po cestách a rozvoz zboží", async () => {
    await sel(9); await pg.click("[data-tab=scenare]"); await pg.click("[data-play]");
    if (!(await pg.$(".netlayer .nnode"))) throw new Error("síť se nevykreslila");
    await pg.click("[data-tool=zakazky]"); await pg.click("#dlStart");
    const info = await ev(() => { const p = P(), t = p.table, net = tableNet(p); const ship = t.items[0]; const ham = net.nodes.find(n => n.name === "Hamburk"); return { uid: ship.uid, x: BX + ham.x, y: BY + ham.y }; });
    const it = await pg.$(`.titem[data-uid="${info.uid}"]`); const bb = await it.boundingBox(); const mat = await (await pg.$("#mat")).boundingBox();
    await pg.mouse.move(bb.x + 20, bb.y + 20); await pg.mouse.down(); await pg.mouse.move(mat.x + info.x, mat.y + info.y, { steps: 8 }); await pg.mouse.up();
    if ((await ev(() => locName(P(), P().table, P().table.items.find(i => i.uid === S.sel)))) !== "Hamburk") throw new Error("loď nedoplula do Hamburku");
    const riga = await ev(() => tableNet(P()).nodes.find(n => n.name === "Riga").id); await pg.click(`.netlayer [data-nid="${riga}"]`); if (!(await pg.$("#nOwn"))) throw new Error("detail místa se neukázal");
    await pg.screenshot({ path: path.join(OUT, "sit.png") });
  });
  await step("editor sítě míst", async () => {
    await pg.click("[data-tab=mapa]"); await pg.click("#addNet"); await pg.$eval("#netEd", e => e.scrollIntoView({ block: "center" })); const svg = await (await pg.$("#netEd")).boundingBox();
    await pg.mouse.click(svg.x + 100, svg.y + 100); await pg.mouse.click(svg.x + 300, svg.y + 150);
    await pg.click('[data-ntool="link"]'); const ids = await ev(() => P().nets[P().nets.length - 1].nodes.map(n => n.id));
    await pg.click(`#netEd [data-nid="${ids[0]}"]`); await pg.click(`#netEd [data-nid="${ids[1]}"]`);
    if ((await ev(() => P().nets[P().nets.length - 1].links.length)) !== 1) throw new Error("cesta nevznikla");
  });
  await step("Ascension: poražení příšery v centrální řadě", async () => {
    await sel(10); await pg.click("[data-tab=stul]");
    await ev(() => { const p = P(), t = p.table, d = p.decks[1]; t.market[d.id][0] = d.cards.find(c => c.title === "Skřet").id; t.res[p.factions[0].id].sila = 3; render(); });
    await pg.click("[data-tool=trh]"); await pg.click("[data-mfight]");
    if (!/poráží Skřet/.test(await ev(() => P().table.log[0] + P().table.log[1]))) throw new Error("příšera neporažena");
    if ((await ev(() => P().table.res._g.zasoba)) !== 29) throw new Error("zásoba cti neklesla");
  });
  await step("Magic: souboj bytostí s blokováním", async () => {
    await sel(11); await pg.click("[data-tab=stul]");
    await ev(() => { const p = P(), t = p.table, d = p.decks[0], [a, b] = p.factions.map(f => f.id); const c = n => ({ deckId: d.id, cardId: d.cards.find(x => x.title === n).id, own: true }); t.tableau[a] = [c("Medvěd"), c("Sokol")]; t.tableau[b] = [c("Vlk")]; render(); });
    await pg.click("[data-tool=souboj]"); await pg.check('[data-fatt="0"]'); await pg.check('[data-fatt="1"]'); await pg.selectOption('[data-fblk="0"]', "0"); await pg.click("#fGo");
    const r = await ev(() => { const p = P(), t = p.table; return [t.res[p.factions[1].id].zivoty, t.tableau[p.factions[1].id].length]; });
    if (r[0] !== 19 || r[1] !== 0) throw new Error(JSON.stringify(r)); await pg.screenshot({ path: path.join(OUT, "souboj.png") });
  });
  await step("18xx: založení společnosti, akcie, vlak a dividenda", async () => {
    await sel(12); await pg.click("[data-tab=scenare]"); await pg.click("[data-play]"); await pg.click("[data-tool=spolecnosti]"); await pg.click("#rlInit");
    const co = await ev(() => P().rail.companies[0].id); await pg.click(`[data-rstart="${co}"]`);
    for (let i = 0; i < 4; i++) await pg.click(`[data-rbuy="${co}|ipo"]`);
    await pg.click(`[data-rtrain="${co}"]`); await pg.click(`[data-rpay="${co}"]`);
    if (!/vyplácí/.test(await ev(() => P().table.log[0]))) throw new Error("dividenda nevyplacena"); await pg.screenshot({ path: path.join(OUT, "18xx.png") });
  });
  await step("vybavení a velení: zbraň na vojáka, štáb velí", async () => {
    await sel(0); await pg.click("[data-tab=scenare]"); await pg.click("[data-play]"); await pg.click("[data-tool=stul]");
    const kul = await ev(() => P().tokens.find(x => x.name === "Kulomet").id); await pg.click(`[data-addtok="${kul}"]`);
    const info = await pg.evaluate(kid => { const p = P(), t = p.table; const u = t.items.find(i => i.kind === "unit" && unitOf(p, i).name === "1. pěší"); const k = t.items.find(i => i.kind === "token" && i.tokenId === kid); return { u: u.uid, k: k.uid, ux: u.x + 26, uy: u.y + 26, att: unitStat(p, u, "att") }; }, kul);
    const kb = await (await pg.$(`.titem[data-uid="${info.k}"]`)).boundingBox(); const mat = await (await pg.$("#mat")).boundingBox();
    await pg.mouse.move(kb.x + 10, kb.y + 10); await pg.mouse.down(); await pg.mouse.move(mat.x + info.ux, mat.y + info.uy, { steps: 8 }); await pg.mouse.up();
    const att2 = await pg.evaluate(u => { const it = P().table.items.find(i => i.uid === u); if (!it) throw new Error("jednotka zmizela: " + P().name + " " + P().table.log.slice(0, 3).join(" | ")); return unitStat(P(), it, "att"); }, info.u); if (att2 !== info.att + 2) throw new Error(`útok ${info.att} → ${att2}`);
    if (!(await pg.$(`.titem[data-uid="${info.u}"] .eq`))) throw new Error("vybavení není vidět na žetonu");
    await pg.click('[data-equip]'); if ((await ev(() => P().table.items.filter(i => i.attachTo).length)) !== 2) throw new Error("tlačítko Vybavit nepřipnulo žeton");
    const hq = await ev(() => P().table.items.find(i => i.kind === "unit" && unitOf(P(), i).name === "Štáb").uid); await pg.click(`.titem[data-uid="${hq}"]`); await pg.click("[data-command]");
    if (!(await ev(() => P().table.items.filter(i => i.act).length >= 2))) throw new Error("velení neaktivovalo jednotky");
    await pg.click("[data-cmdshow]"); await pg.screenshot({ path: path.join(OUT, "veleni.png") });
  });
  await step("okop, transportér se zónami a nástup", async () => {
    await sel(0); await pg.click("[data-tab=scenare]"); await pg.click("[data-play]"); await pg.click("[data-tool=stul]");
    const u = await pg.evaluate(() => P().table.items.find(i => i.kind === "unit" && unitOf(P(), i).name === "1. pěší").uid);
    await pg.click(`.titem[data-uid="${u}"]`); await pg.click("[data-build]");
    const ok = await pg.evaluate(id => { const p = P(), t = p.table, it = t.items.find(i => i.uid === id); const tok = t.items.find(i => i.kind === "token" && tokDef(p, i).fixed); return { tok: tok && tok.uid, def: unitStat(p, it, "def"), x: tok && tok.x }; }, u);
    if (!ok.tok || ok.def !== 5) throw new Error("okop nepostaven nebo bez bonusu: " + JSON.stringify(ok));
    const tb = await (await pg.$(`.titem[data-uid="${ok.tok}"]`)).boundingBox(); await pg.mouse.move(tb.x + 8, tb.y + 8); await pg.mouse.down(); await pg.mouse.move(tb.x + 150, tb.y + 90, { steps: 6 }); await pg.mouse.up();
    if ((await pg.evaluate(id => P().table.items.find(i => i.uid === id).x, ok.tok)) !== ok.x) throw new Error("pevný žeton se posunul");
    const trId = await pg.evaluate(() => P().units.find(x => x.name === "Transportér").id); await pg.click(`[data-addunit="${trId}"]`);
    const tr = await pg.evaluate(id => { const p = P(), t = p.table; const tr = t.items[t.items.length - 1], it = t.items.find(i => i.uid === id); tr.x = it.x + 4; tr.y = it.y - 4; touch(p); render(); return tr.uid; }, u);
    await pg.evaluate(id => { S.sel = id; render(); }, u); await pg.click("[data-embark]");
    if (!(await pg.evaluate(id => !!P().table.items.find(i => i.uid === id).inside, u))) throw new Error("pěchota nenastoupila");
    if (!(await pg.$(`.titem[data-uid="${tr}"] .lb`))) throw new Error("vozidlo neukazuje náklad");
    await pg.click('[data-zdef="Podvozek"]'); if ((await pg.evaluate(() => S.combat.def)) < 4) throw new Error("obrana zónou se nenastavila");
    await pg.screenshot({ path: path.join(OUT, "zony.png") });
  });
  await step("natočení: útok zezadu, výseče a otáčení", async () => {
    await sel(0); await pg.click("[data-tab=scenare]"); await pg.click("[data-play]"); await pg.click("[data-tool=stul]");
    const ids = await pg.evaluate(() => { const p = P(), t = p.table; const h = t.items.find(i => unitOf(p, i) && unitOf(p, i).name === "Husaři"), tk = t.items.find(i => unitOf(p, i) && unitOf(p, i).name === "7. tankový");
      placeOn(p, t, tk, "10,2"); touch(p); render(); return { h: h.uid, tk: tk.uid }; });
    await pg.evaluate(id => { S.sel = id; render(); }, ids.h); await pg.click('[data-sa="asDef"]');
    await pg.evaluate(id => { S.sel = id; render(); }, ids.tk); await pg.click('[data-sa="asAtt"]');
    const c = await pg.evaluate(() => ({ t: S.combat.ftext, s: S.combat.fshift }));
    if (!/zezadu|z boku/.test(c.t || "") || !(c.s > 0)) throw new Error("bez bonusu za směr útoku: " + JSON.stringify(c));
    await pg.evaluate(id => { S.sel = id; render(); }, ids.h); const r0 = await pg.evaluate(id => P().table.items.find(i => i.uid === id).rot, ids.h);
    await pg.click('[data-face="1"]'); if ((await pg.evaluate(id => P().table.items.find(i => i.uid === id).rot, ids.h)) !== (r0 + 60) % 360) throw new Error("otočení nefunguje");
    await pg.click("[data-arcs]"); if (!(await pg.$$(".boardlayer polygon.rng")).length) throw new Error("výseče se nezobrazily");
    await pg.screenshot({ path: path.join(OUT, "natoceni.png") });
    await pg.click("[data-tab=mechaniky]"); await (await pg.$("#fOn")).scrollIntoViewIfNeeded(); await pg.screenshot({ path: path.join(OUT, "natoceni-mech.png") });
  });
  await step("morálka, potlačení, drát a skrytá mina", async () => {
    await sel(0); await pg.click("[data-tab=scenare]"); await pg.click("[data-play]"); await pg.click("[data-tool=stul]");
    const ids = await pg.evaluate(() => { const p = P(), t = p.table; const tk = t.items.find(i => unitOf(p, i) && unitOf(p, i).name === "7. tankový"); const r = t.items.find(i => unitOf(p, i) && unitOf(p, i).name === "3. pěší");
      placeOn(p, t, tk, "7,3"); touch(p); render(); return { tk: tk.uid, r: r.uid, mine: t.items.find(i => i.kind === "token" && tokDef(p, i).fx === "mina").uid }; });
    await pg.evaluate(id => { S.sel = id; render(); }, ids.tk); await pg.click("[data-supp]");
    if (!(await pg.evaluate(() => P().table.log.some(l => /potlačuje/.test(l))))) throw new Error("potlačující palba se nezapsala");
    await pg.evaluate(id => { S.sel = id; render(); }, ids.r); await pg.click('[data-mor="test"]');
    if (!(await pg.evaluate(() => P().table.log.some(l => /^.*Morálka 3\. pěší/.test(l))))) throw new Error("test morálky se nezapsal");
    await pg.screenshot({ path: path.join(OUT, "moralka.png") });
    if (!(await pg.$(`.titem[data-uid="${ids.mine}"]`))) throw new Error("rozhodčí minu nevidí");
    await pg.evaluate(() => { S.view = P().factions[0].id; render(); }); const vis = await pg.$(`.titem[data-uid="${ids.mine}"]`); await pg.evaluate(() => { S.view = null; render(); });
    if (vis) throw new Error("skrytá mina je vidět hráči");
  });
  await step("předměty: lektvar z ruky, štít pohltí zásah, editor karty", async () => {
    const idx = await pg.$$eval("#projSel option", o => o.findIndex(x => /Krypta/.test(x.textContent))); await sel(idx);
    await pg.click("[data-tab=scenare]"); await pg.click("[data-play]"); await pg.click("[data-tool=stul]");
    const h = await pg.evaluate(() => { const p = P(), t = p.table; const hero = t.items.find(i => unitOf(p, i) && unitOf(p, i).name === "Bojovnice"); const f = unitOf(p, hero).factionId;
      (t.hands[f] = t.hands[f] || []).push({ deckId: "poklady", cardId: p.decks[0].cards.find(c => c.title === "Lektvar").id }); hero.dmg = 3; touch(p); S.sel = hero.uid; render(); return hero.uid; });
    await pg.click("[data-ihand]"); if ((await pg.evaluate(id => P().table.items.find(i => i.uid === id).dmg, h)) !== 1) throw new Error("lektvar nevyléčil");
    const st = await pg.evaluate(() => P().tokens.find(x => x.name === "Štít").id); await pg.click(`[data-equip="${st}"]`);
    if (!(await pg.$("[data-idmg]"))) throw new Error("štít neukazuje výdrž");
    const r = await pg.evaluate(id => { const p = P(), t = p.table, it = t.items.find(i => i.uid === id); const m = damage(p, t, it, 1); render(); return { m, dmg: it.dmg }; }, h);
    if (!/pohltí/.test(r.m) || r.dmg !== 1) throw new Error("štít nepohltil zásah: " + JSON.stringify(r));
    await pg.screenshot({ path: path.join(OUT, "predmety.png") });
    await pg.evaluate(() => { const p = P(); editCard(p, p.decks[0], p.decks[0].cards.find(c => c.title === "Kroužková zbroj")); });
    if (!(await pg.$("#c-unitItem:checked"))) throw new Error("editor karty nezná předmět");
    await pg.selectOption('#c-ifx [data-if="use"]', "once"); if (!(await pg.$('#c-ifx [data-if="heal"]'))) throw new Error("jednorázový předmět nemá léčení");
    await pg.screenshot({ path: path.join(OUT, "predmet-karta.png") }); await pg.click("[data-close]");
  });
  await step("plošný svitek a počasí", async () => {
    let idx = await pg.$$eval("#projSel option", o => o.findIndex(x => /Krypta/.test(x.textContent))); await sel(idx);
    await pg.click("[data-tab=scenare]"); await pg.click("[data-play]"); await pg.click("[data-tool=stul]");
    await pg.evaluate(() => { const p = P(), t = p.table; const hero = t.items.find(i => unitOf(p, i) && unitOf(p, i).name === "Bojovnice"); const mon = t.items.filter(i => isMonster(p, i)); const k = cellUnder(p, hero).split(",").map(Number);
      placeOn(p, t, mon[0], (k[0] + 2) + "," + k[1]); placeOn(p, t, mon[1], (k[0] + 2) + "," + (k[1] + 1)); const f = unitOf(p, hero).factionId;
      (t.hands[f] = t.hands[f] || []).push({ deckId: "poklady", cardId: p.decks[0].cards.find(c => c.title === "Ohnivý svitek").id }); touch(p); S.sel = hero.uid; render(); });
    await pg.click("[data-ihand]"); if (!(await pg.$('[data-itgt]:not([data-itgt=""])'))) throw new Error("plošný svitek nenabízí cíl");
    await pg.screenshot({ path: path.join(OUT, "svitek.png") });
    await pg.click('[data-itgt]:not([data-itgt=""])'); if (!(await pg.evaluate(() => P().table.log.some(l => /Ohnivý svitek \(okruh 1/.test(l))))) throw new Error("svitek se nepoužil");
    idx = await pg.$$eval("#projSel option", o => o.findIndex(x => /Obrana Brodu/.test(x.textContent))); await sel(idx);
    await pg.click("[data-tab=scenare]"); await pg.click("[data-play]"); await pg.click("[data-tool=kolo]");
    await pg.selectOption("#envW", "Mlha"); if ((await pg.evaluate(() => sightOf(P(), P().table, null))) !== 1) throw new Error("mlha neomezila výhled");
    await pg.screenshot({ path: path.join(OUT, "pocasi.png") });
  });
  await step("bláto po dešti, dýmovnice a oheň ve větru", async () => {
    const idx = await pg.$$eval("#projSel option", o => o.findIndex(x => /Obrana Brodu/.test(x.textContent))); await sel(idx);
    await pg.click("[data-tab=scenare]"); await pg.click("[data-play]"); await pg.click("[data-tool=kolo]");
    await pg.selectOption("#envW", "Déšť"); if (!(await pg.evaluate(() => groundActive(P(), P().table).some(g => g.name === "Bláto")))) throw new Error("za deště nevzniklo bláto");
    if (!(await pg.$$(".boardlayer polygon[stroke-dasharray]")).length) throw new Error("bláto není na mapě vidět");
    const r = await pg.evaluate(() => { const p = P(), t = p.table; const a = t.items.find(i => unitOf(p, i) && unitOf(p, i).name === "1. pěší"); const dym = p.tokens.find(x => x.name === "Dýmovnice");
      t.items.push({ uid: "dym1", kind: "token", tokenId: dym.id, attachTo: a.uid, x: a.x, y: a.y }); S.sel = a.uid; render(); return a.uid; });
    await pg.click("[data-tool=stul]"); await pg.evaluate(id => { S.sel = id; render(); }, r);
    await pg.click('[data-iuse]'); await pg.click('[data-itgt]:not([data-itgt=""])');
    if (!(await pg.evaluate(() => smokeSet(P(), P().table).size >= 1))) throw new Error("dýmovnice nevytvořila kouř");
    await pg.evaluate(() => { const p = P(), t = p.table; t.envWeather = "Vítr"; t.windDir = 2; placeFx(p, t, "ohen", "3,7"); touch(p); render(); });
    await pg.screenshot({ path: path.join(OUT, "kour-ohen.png") });
  });
  await step("co vytisknout a tisková archa s mapou", async () => {
    const idx = await pg.$$eval("#projSel option", o => o.findIndex(x => /Obrana Brodu/.test(x.textContent))); await sel(idx);
    await pg.click("[data-tab=komponenty]"); await pg.click("#printPlan"); await pg.waitForSelector("table.plan");
    await pg.screenshot({ path: path.join(OUT, "co-vytisknout.png") });
    await pg.evaluate(() => { window.__printed = null; window.offerFile = (n, h) => { window.__printed = h; }; }); await pg.click("#planGo");
    await pg.waitForFunction(() => window.__printed, null, { timeout: 15000 }); const html = await pg.evaluate(() => window.__printed);
    if (!/list 1\/\d/.test(html) || !/přehled pro hráče/.test(html)) throw new Error("tisková archa nemá mapu nebo přehled");
    fs.writeFileSync(path.join(OUT, "tisk.html"), html); const p2 = await b.newPage({ viewport: { width: 900, height: 1200 } }); await p2.goto("file://" + path.join(OUT, "tisk.html"));
    const aid = await p2.$("section.aid"); await aid.scrollIntoViewIfNeeded(); await p2.screenshot({ path: path.join(OUT, "tisk-prehled.png") });
    const tile = await p2.$("section.land, .tile"); await tile.scrollIntoViewIfNeeded(); await p2.screenshot({ path: path.join(OUT, "tisk-mapa.png") }); await p2.close();
  });
  await step("ženisté, nepřímá palba a most", async () => {
    const idx = await pg.$$eval("#projSel option", o => o.findIndex(x => /Obrana Brodu/.test(x.textContent))); await sel(idx);
    await pg.click("[data-tab=scenare]"); await pg.click("[data-play]"); await pg.click("[data-tool=stul]");
    const zid = await pg.evaluate(() => P().units.find(u => u.name === "Ženisté").id); await pg.click(`[data-addunit="${zid}"]`);
    const ids = await pg.evaluate(() => { const p = P(), t = p.table; const z = t.items[t.items.length - 1]; placeOn(p, t, z, "5,6"); engineerReveal(p, t, z);
      const h = t.items.find(i => unitOf(p, i) && unitOf(p, i).name === "Husaři"); placeOn(p, t, h, "4,5"); const art = t.items.find(i => unitOf(p, i) && unitOf(p, i).name === "12. dělostř.");
      touch(p); S.sel = z.uid; render(); return { z: z.uid, art: art.uid }; });
    await pg.click("[data-clear]"); if (await pg.evaluate(() => P().table.items.some(i => i.kind === "token" && tokDef(P(), i).fx === "mina"))) throw new Error("ženista minu neodstranil");
    await pg.evaluate(id => { S.sel = id; render(); }, ids.art); if (!(await pg.$("[data-fire]"))) throw new Error("dělostřelectvo nemá cíl");
    await pg.screenshot({ path: path.join(OUT, "zeniste-palba.png") });
    await pg.click("[data-fire]"); if ((await pg.evaluate(() => S.combat.attUids[0])) !== ids.art) throw new Error("palba nepřipravila boj");
    if ((await pg.evaluate(() => terrainOf(P(), tableBoard(P()), "7,4").name)) !== "Most") throw new Error("most chybí");
  });
  await step("rondel, rezervace a slevy na trhu", async () => {
    let idx = await pg.$$eval("#projSel option", o => o.findIndex(x => /Kruh řemesel/.test(x.textContent))); await sel(idx);
    await pg.click("[data-tab=stul]"); await pg.click("[data-tool=rondel]"); await pg.waitForSelector(".rondel .rsp");
    const f0 = await pg.evaluate(() => { const p = P(), t = p.table; return (t.res[curPlayer(p, t).id] || {}).obili || 0; });
    await pg.click('[data-rondel="0"]'); const f1 = await pg.evaluate(() => { const p = P(), t = p.table; return { o: (t.res[curPlayer(p, t).id] || {}).obili || 0, pos: (t.rondel || {})[curPlayer(p, t).id] }; });
    if (f1.pos !== 0 || f1.o !== f0 + 3) throw new Error("rondel nefunguje: " + JSON.stringify([f0, f1]));
    await pg.screenshot({ path: path.join(OUT, "rondel.png") });
    idx = await pg.$$eval("#projSel option", o => o.findIndex(x => /Alchymistická/.test(x.textContent))); await sel(idx);
    await pg.click("[data-tab=stul]"); await pg.click("[data-tool=trh]"); await pg.click("[data-mres]");
    if ((await pg.evaluate(() => { const p = P(), t = p.table; return ((t.reserved || {})[curPlayer(p, t).id] || []).length; })) !== 1) throw new Error("rezervace nefunguje");
    if (!(await pg.$("[data-rbuy]"))) throw new Error("rezervovanou kartu nejde koupit");
    await pg.screenshot({ path: path.join(OUT, "rezervace.png") });
  });
  await step("telefon – Přehled", async () => { await pg.setViewportSize({ width: 400, height: 820 }); await pg.click("[data-tab=prehled]"); await pg.screenshot({ path: path.join(OUT, "telefon.png") }); });
  await b.close();
  console.log(`\n${fails.length ? fails.length + " kroků selhalo:\n" + fails.join("\n") : "Všechny kroky prošly."}\n${errors.length ? "Chyby v konzoli:\n" + errors.join("\n") : "Bez chyb v konzoli."}`);
  process.exit(fails.length || errors.length ? 1 : 0);
})();
