// Akce hráče, vykreslení, ukládání a spuštění.
const ACT = {};
const SAVE_KEY = "faraon_auto", SLOT = n => "faraon_slot_" + n, THEME_KEY = "faraon_theme";
const val = id => { const el = document.getElementById(id); return el ? el.value : undefined; };

ACT.tab = k => { SEL.tab = k; SEL.saveTxt = ""; window.scrollTo(0, 0); };
ACT.end = () => { if (S.events.length) return "Nejdřív rozhodni o události."; endTurn(S); };
ACT.selProv = id => { if (MAPDRAG.until > Date.now()) return; SEL.prov = id; if (SEL.tab !== "mapa") SEL.tab = "mapa"; };
ACT.closeProv = () => { SEL.prov = null; };
ACT.mapMode = k => { SEL.mapMode = k; };
ACT.play = () => { AUTO.on = !AUTO.on; clearTimeout(AUTO.timer); if (AUTO.on) AUTO.timer = setTimeout(autoTick, 300); };
ACT.speed = v => { AUTO.ms = +v || 1600; };
ACT.zoom = k => { setZoom(k); };
ACT.cmdSel = (id, v) => { SEL.cmd[id] = v; };
ACT.cmd = id => { S.flags.tut_cmd = 1; const k = SEL.cmd[id] || val("cs_" + id); const a1 = val("p1_" + id), a2 = val("p2_" + id); if (a1 != null) SEL["p1_" + id] = a1; return doCmd(S, me(), id, k, a1, a2); };
ACT.advise = id => { const c = chr(S, id); if (!c || c.acted === S.turn) return "Úředník už jedná."; aiDomestic(S, me(), c, true); if (c.acted !== S.turn) return "Rádce nic rozumného nenašel (málo debenů nebo obilí?)."; };
ACT.adviseAll = () => { S.flags.tut_cmd = 1; let n = 0; for (const c of freeOffs()) { aiDomestic(S, me(), c, true); if (c.acted === S.turn) n++; } toast(`Rádce zadal ${n} rozkazů.`); };
ACT.planDone = () => { SEL.planDone = !SEL.planDone; };
ACT.deleg = (pid, v, el) => { const p = S.provs[pid]; if (p && p.owner === me()) p.deleg = !!(el && el.checked); };
ACT.send = pid => { const t = val("at_" + pid), f = val("ap_" + pid), c = val("ac_" + pid), st_ = val("as_" + pid), tc = val("at2_" + pid); SEL["at_" + pid] = t; SEL["ap_" + pid] = f; SEL["as_" + pid] = st_; SEL["at2_" + pid] = tc; return sendArmy(S, me(), pid, t, f, c ? [c] : [], st_, tc); };
ACT.tutOff = () => { S.flags.tutOff = 1; };
ACT.nadace = () => foundNadace(S, me());
ACT.ship = pid => { const t = val("gt_" + pid), q = val("gq_" + pid); SEL["gt_" + pid] = t; return shipGrain(S, me(), pid, t, q); };
ACT.capBuild = () => captivesBuild(S, me());
ACT.capSettle = () => captivesSettle(S, me());
ACT.disband = id => { const a = S.armies.find(x => x.id === id); if (!a) return; if (S.provs[a.loc].owner !== me()) return "Vojsko není ve vlastním nomu."; disbandArmy(S, a); };
ACT.armyHome = id => { const a = S.armies.find(x => x.id === id); if (!a) return; const home = myProvs().sort((x, y) => (findPath(S, me(), a.loc, x.id) || [1, 1, 1, 1, 1, 1, 1, 1, 1]).length - (findPath(S, me(), a.loc, y.id) || [1, 1, 1, 1, 1, 1, 1, 1, 1]).length)[0]; if (!home) return "Není kam."; if (home.id === a.loc) { disbandArmy(S, a); return; } a.path = findPath(S, me(), a.loc, home.id) || []; a.goal = home.id; const p = S.provs[a.loc]; if (p.siege && p.siege.army === a.id) p.siege = null; };
ACT.promote = id => promote(S, me(), id);
ACT.gift = (id, a) => gift(S, me(), id, a);
ACT.dismiss = id => dismiss(S, me(), id);
ACT.office = (k, v) => setOffice(S, me(), k, v);
ACT.dipl = id => { SEL.dipl = id; SEL.tab = "diplo"; };
ACT.diplo = (id, act, arg) => diplo(S, me(), id, act, arg);
ACT.tax = (v) => setTax(S, me(), v);
ACT.trade = dir => { const q = Math.abs(+val("mktQ") || 0); if (!q) return "Zadej počet charů."; return trade(S, me(), dir * q); };
ACT.law = (k, v) => setLaw(S, me(), k, v);
ACT.tomb = () => startTomb(S, me());
ACT.mon = id => startMon(S, me(), id);
ACT.god = g => setGod(S, me(), g);
ACT.horus = h => setHorus(S, me(), h);
ACT.capital = pid => { const r = moveCapital(S, me(), pid); TERR.key = null; return r; };
ACT.copySave = () => { const t = JSON.stringify(S); SEL.saveTxt = t; try { navigator.clipboard.writeText(t).then(() => toast("Hra zkopírována do schránky."), () => toast("Text je v poli – zkopíruj ho ručně.")); } catch (e) { toast("Text je v poli – zkopíruj ho ručně."); } return null; };
ACT.pasteSave = () => { const el = document.getElementById("saveTxt"); try { const x = JSON.parse(el.value); if (!x.provs || !x.clans || x.v !== 1) throw 0; S = x; TERR.key = null; SEL.saveTxt = ""; toast("Hra načtena."); } catch (e) { return "Text není uložená hra."; } };
ACT.focus = (id, v) => { const c = chr(S, id); if (c) c.focus = v || null; };
ACT.research = t => { if (!techAvail(S, me(), t)) return "Chybí předpoklady."; P(S).res.cur = t; };
ACT.king = () => { const C = P(S); if (C.t === "král" || clanProvs(S, me()).length < 6) return "Zatím nelze."; C.t = "král"; C.type = "dyn"; C.prestige += 60; C.maat = Math.max(0, C.maat - 3); const ov = C.vassalOf; if (ov) { C.vassalOf = null; addRel(S, me(), ov, -40); if (!atWar(S, me(), ov)) declareWar(S, ov, me(), "proti vzbouřenému nomarchovi, který se prohlásil králem"); } log(S, `${ruler().n} přijal královskou titulaturu a prohlásil se králem Horního a Dolního Egypta.`, "rod", [me()]); };
ACT.logF = k => { SEL.logF = k; };
ACT.event = i => { resolveEvent(S, i); };
ACT.ngScen = v => { SEL.ngScen = v; SEL.ngConfirm = false; };
ACT.ngClan = v => { SEL.ngClan = v; SEL.ngConfirm = false; };
ACT.ngDiff = v => { SEL.ngDiff = +v; };
ACT.ngFog = (v, el) => { SEL.ngFog = !!(el && el.checked); };
ACT.newgame = () => { if (!SEL.ngConfirm) { SEL.ngConfirm = true; return; } SEL.ngConfirm = false; S = newGame({ scen: SEL.ngScen, clan: SEL.ngClan, diff: SEL.ngDiff, fog: SEL.ngFog !== false, seed: val("ngSeed") }); TERR.key = null; SEL.tab = "prehled"; SEL.prov = P(S).capital; SEL.cmd = {}; toast("Nová hra začala."); };
ACT.save = n => { try { localStorage.setItem(SLOT(n), JSON.stringify(S)); toast("Uloženo do pozice " + n + "."); } catch (e) { return "Uložení se nezdařilo."; } };
ACT.load = n => { try { const t = localStorage.getItem(SLOT(n)); if (!t) return "Prázdná pozice."; S = JSON.parse(t); TERR.key = null; toast("Načteno."); } catch (e) { return "Načtení se nezdařilo."; } };
ACT.del = n => { try { localStorage.removeItem(SLOT(n)); } catch (e) {} };
ACT.exportSave = () => { const blob = new Blob([JSON.stringify(S)], { type: "application/json" }), a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `pan-obou-zemi-${S.bce}.json`; document.body.appendChild(a); a.click(); a.remove(); };
ACT.importSave = () => { const f = document.getElementById("impFile"); if (f) f.click(); };
ACT.theme = () => { const r = document.documentElement, dark = r.dataset.theme ? r.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; r.dataset.theme = dark ? "light" : "dark"; try { localStorage.setItem(THEME_KEY, r.dataset.theme); } catch (e) {} };
function slotInfo(n) { try { const t = localStorage.getItem(SLOT(n)); if (!t) return null; const x = JSON.parse(t); return `${x.clans[x.player].n} – ${monthShort(x.month)} ${x.bce} př. n. l.`; } catch (e) { return null; } }
function importFile(file) { const r = new FileReader(); r.onload = () => { try { const x = JSON.parse(r.result); if (!x.provs || !x.clans) throw 0; S = x; TERR.key = null; render(); toast("Hra nahrána."); } catch (e) { toast("Soubor není uložená hra."); } }; r.readAsText(file); }

const TAB_FN = { prehled: tPrehled, plan: tPlan, mapa: tMapa, zupy: tZupy, urednici: tUrednici, vojsko: tVojsko, diplo: tDiplo, hosp: tHosp, chramy: tChramy, zakony: tZakony, rod: tRod, vedeni: tVedeni, kronika: tKronika, hra: tHra };
function render() {
  EMB_N = 0;
  if (!TAB_FN[SEL.tab]) SEL.tab = "prehled";
  document.getElementById("top").innerHTML = renderTop();
  document.getElementById("tabs").innerHTML = renderTabs();
  let html; try { html = TAB_FN[SEL.tab](); } catch (e) { console.error(e); html = `<p class="bad">Chyba při vykreslení záložky: ${esc(e.message)}</p>`; }
  const mainEl = document.getElementById("main"); mainEl.innerHTML = html; mainEl.className = SEL.tab === "mapa" ? "full" : "";
  const hh = (document.getElementById("top").offsetHeight || 0) + (document.getElementById("tabs").offsetHeight || 0); document.documentElement.style.setProperty("--hdr", hh + "px");
  if (SEL.tab === "mapa") initMap(); else hideTip();
  renderModal();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {}
}
function handle(el, ev) {
  const a = el.dataset.a; if (!a || !ACT[a]) return;
  let args = []; try { args = JSON.parse(el.dataset.x || "[]"); } catch (e) {}
  if (ev.type === "change") args.push(el.value, el);
  const r = ACT[a](...args);
  if (typeof r === "string" && r) toast(r);
  render();
}
function boot() {
  try { const t = localStorage.getItem(THEME_KEY); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
  try { const t = localStorage.getItem(SAVE_KEY); if (t) S = JSON.parse(t); } catch (e) { S = null; }
  if (!S || !S.provs || S.v !== 1) S = newGame({ scen: "sip", clan: "thebes" });
  for (const C of Object.values(S.clans)) if (C.laws) for (const k of Object.keys(LAWS)) if (C.laws[k] == null) C.laws[k] = 1; // starší uložené hry
  SEL.prov = P(S).capital; SEL.ngScen = S.scen; SEL.ngClan = S.player;
  const tip = document.createElement("div"); tip.id = "tip"; document.body.appendChild(tip);
  const f = document.createElement("input"); f.type = "file"; f.id = "impFile"; f.accept = ".json,application/json"; f.style.display = "none"; f.onchange = () => f.files[0] && importFile(f.files[0]); document.body.appendChild(f);
  document.addEventListener("click", ev => { const el = ev.target.closest("[data-a]"); if (!el || el.tagName === "SELECT" || (el.tagName === "INPUT")) return; ev.preventDefault(); handle(el, ev); });
  document.addEventListener("change", ev => { const el = ev.target.closest("[data-a]"); if (!el || (el.tagName !== "SELECT" && el.tagName !== "INPUT")) return; handle(el, ev); });
  render();
}
if (typeof document !== "undefined") { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot(); }
