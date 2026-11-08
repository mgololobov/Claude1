// Obchodní cesty a Hanza, dvorské úřady, tatarské vpády, obtížnost, rozpisy příčin (spokojenost, věrnost).

// ---------- obchodní cesty ----------
const ROUTES = [
  { id: "dunaj", n: "Podunajská cesta", v: 4, col: "#2e86c1", provs: ["ulm", "ingolstadt", "rezno", "straubing", "pasov", "linec", "kremze", "viden", "prespurk", "rab", "ostrihom", "budin"], d: "víno, sůl, dobytek z Uher" },
  { id: "jantar", n: "Jantarová stezka", v: 3, col: "#d4a017", provs: ["kralovec", "elblag", "chelmno", "inowroclaw", "kalis", "vratislav", "opoli", "opava", "olomouc", "brno", "viden"], d: "jantar, kožešiny, sukno" },
  { id: "regia", n: "Via Regia", v: 3, col: "#8e44ad", provs: ["durynsko", "lipsko", "misen", "budysin", "lehnice", "vratislav", "opoli", "krakov", "sandomer", "lublin"], d: "sukno, sůl, kovy" },
  { id: "ceska", n: "Norimberská cesta", v: 3, col: "#a04000", provs: ["norimberk", "amberg", "plzen", "praha", "caslav", "jihlava", "brno"], d: "kovy, stříbro, sukno" },
  { id: "zlata", n: "Zlatá stezka", v: 2, col: "#cfa63c", provs: ["salcburk", "pasov", "krumlov", "bechyne", "praha"], d: "sůl z Alp do Čech" },
  { id: "hanza", n: "Baltský obchod (Hanza)", v: 4, col: "#1a5276", hanza: true, provs: ["lauenburg", "volegost", "stetin", "kolobreh", "slupsk", "gdansk", "elblag", "kralovec"], d: "sledě, sůl, obilí, kožešiny" },
  { id: "alpy", n: "Cesta do Benátek", v: 3, col: "#16a085", provs: ["augspurk", "tyrolsko", "gorice"], d: "koření, hedvábí, sklo" },
  { id: "sul", n: "Uherská solná cesta", v: 2, col: "#7f8c8d", provs: ["sedmihradsko", "varadin", "segedin", "budin"], d: "sedmihradská sůl" },
];
function segOpen(s, a, b) { const A = s.provs[a], B = s.provs[b]; return !A.siege && !B.siege && !atWar(s, A.owner, B.owner); }
function routeState(s, R) { let open = 0; for (let i = 1; i < R.provs.length; i++) if (segOpen(s, R.provs[i - 1], R.provs[i])) open++; return open / (R.provs.length - 1); }
function routeIncomeProv(s, p) {
  let g = 0;
  for (const R of ROUTES) if (R.provs.includes(p.id)) g += R.v * 0.5 * routeState(s, R) * (1 + (p.b.mesto || 0) * 0.3) * (R.hanza && p.hanza ? 1.6 : 1);
  return g;
}
const provRoutes = p => ROUTES.filter(R => R.provs.includes(p.id));
function joinHanza(s, cid, pid) {
  const p = s.provs[pid]; if (!p || p.owner !== cid) return "Není tvůj kraj."; if (p.hanza) return "Město už je v Hanze.";
  if (!ROUTES.find(R => R.hanza).provs.includes(pid)) return "Kraj neleží na baltské obchodní cestě."; if (!(p.b.mesto || p.city)) return "Do Hanzy může vstoupit jen lokované město.";
  if (!pay(s, cid, 150)) return "Vstup stojí 150 zl."; p.hanza = true; if (isPlayer(s, cid)) { mod(s, "mestane", 6, 24, "Město v Hanze"); log(s, `${p.n} vstoupilo do Hanzy.`, "obchod", [cid]); } return null;
}

// ---------- dvorské úřady ----------
const OFFICES = {
  marsal: { n: "Nejvyšší maršálek", stat: "ved", d: "vyšší morálka vojsk v bitvě, pomalejší úbytek výcviku" },
  komori: { n: "Nejvyšší komoří", stat: "spr", d: "víc zlata z krajů (až +6 %)" },
  kancler: { n: "Kancléř", stat: "roz", d: "úspěšnější poselstva, body učenosti" },
  sudi: { n: "Zemský sudí", stat: "spr", d: "spokojenost lidu a věrnost vazalů" },
};
function officeHolder(s, cid, k) { const C = s.clans[cid]; const c = C.offices && chr(s, C.offices[k]); return c && c.st === "off" && c.cl === cid ? c : null; }
const officeVal = (s, cid, k) => { const c = officeHolder(s, cid, k); return c ? st(c, OFFICES[k].stat) : 0; };
function setOffice(s, cid, k, id) {
  const C = s.clans[cid]; C.offices = C.offices || {};
  if (!id) { delete C.offices[k]; return null; }
  const c = chr(s, id); if (!c || c.cl !== cid || c.st !== "off") return "Vyber svého vazala.";
  for (const o of Object.keys(C.offices)) if (C.offices[o] === id) delete C.offices[o];
  C.offices[k] = id; c.loy = Math.min(100, c.loy + 8);
  if (isPlayer(s, cid)) log(s, `${c.n} jmenován: ${OFFICES[k].n}.`, "vazalove", [cid]); return null;
}
function aiOffices(s, cid) {
  const C = s.clans[cid]; C.offices = C.offices || {}; const used = new Set();
  for (const k of Object.keys(OFFICES)) { const h = officeHolder(s, cid, k); if (h) { used.add(h.id); continue; } const c = officers(s, cid).filter(x => !used.has(x.id) && x.id !== C.leader).sort((a, b) => st(b, OFFICES[k].stat) - st(a, OFFICES[k].stat))[0]; if (c) { C.offices[k] = c.id; used.add(c.id); } }
}

// ---------- tatarské vpády ----------
const EAST = ["halic", "lvov", "vladimir", "chelm", "premysl_r", "lublin", "sandomer", "krakov", "czersk", "kosice", "spis", "eger", "varadin", "sedmihradsko", "segedin"];
function mongolRaid(s, targets) {
  if (!targets) { const start = pick(s, EAST); targets = [start, ...s.provs[start].nb.filter(n => EAST.includes(n))].slice(0, rint(s, 2, 4)); }
  const mine = targets.filter(id => s.provs[id].owner === s.player);
  for (const id of targets.filter(x => s.provs[x].owner !== s.player)) raidDamage(s, s.provs[id], 1);
  news(s, `Tatarský vpád z Pole: ${targets.map(id => s.provs[id].n).join(", ")}. Vsi hoří, lid prchá do lesů.`, "svet");
  if (mine.length && P(s).alive) s.events.push({ id: "_tatari", pids: mine });
}
function raidDamage(s, p, k) { p.pop = r1(p.pop * (1 - 0.15 * k)); loseMen(p.troops, Math.round(men(p.troops) * 0.3 * k)); p.loy = Math.max(0, p.loy - 10 * k); p.agri = Math.max(0, Math.round(p.agri - 8 * k)); const C = s.clans[p.owner]; C.gold = Math.max(0, C.gold - Math.round(40 * k)); }

// ---------- obtížnost ----------
const DIFFS = ["Snadná", "Normální", "Těžká"];
const diffIncome = s => [1.2, 1, 0.9][s.opts ? s.opts.diff : 1];
const diffAggr = s => [0.65, 1, 1.35][s.opts ? s.opts.diff : 1];

// ---------- proč? rozpisy ----------
function loyBreakdown(s, p) {
  const C = s.clans[p.owner], L = chr(s, p.lord), rows = [["Základ", 50]];
  rows.push([L ? `Purkrabí ${L.n} (správa ${st(L, "spr")})` : "Bez purkrabího", L ? Math.round(st(L, "spr") / 6) : -5]);
  if (C.tax !== 2) rows.push(["Daně: " + TAX_LEVELS[C.tax], -(C.tax - 2) * 8]);
  if (p.b.klaster) rows.push(["Klášter", p.b.klaster * 4]);
  if (hasTech(s, p.owner, "zakonik")) rows.push(["Zemský zákoník", 5]);
  if (s.turn - p.conq < 24) rows.push(["Nedávno dobyto", -15]);
  if (C.excom > s.turn) rows.push(["Papežská klatba", -10]);
  if (p.siege) rows.push(["Obléhání", -20]);
  const sudi = officeVal(s, p.owner, "sudi"); if (sudi) rows.push(["Zemský sudí", Math.round(sudi / 20)]);
  if (isPlayer(s, p.owner) && C.estates) { rows.push(["Nálada sedláků", Math.round((C.estates.sedlaci - 50) / 5)]); const rb = [4, 0, -6][C.laws.robota]; if (rb) rows.push(["Robota: " + LAWS.robota.opts[C.laws.robota], rb]); }
  return { rows, val: clamp(sum(rows.map(r => r[1])), 0, 100) };
}
function offLoyBreakdown(s, c) {
  const C = s.clans[c.cl], lordOf = Object.values(s.provs).some(p => p.lord === c.id), rows = [["Základ", 52], ["Hodnost " + RANKS[c.rank].n, c.rank * 5]];
  if (lordOf) rows.push(["Je purkrabím", 6]);
  if (C.offices && Object.values(C.offices).includes(c.id)) rows.push(["Dvorský úřad", 10]);
  rows.push(["Prestiž rodu", Math.round(Math.min(15, C.prestige / 40))]);
  const tl = sum(c.traits.map(k => (TRAITS[k] && TRAITS[k].loy) || 0)); if (tl) rows.push(["Povaha", tl]);
  const amb = Math.max(0, (sum(STAT_IDS.map(k => st(c, k))) / 4 - 50 - c.rank * 8) / 2); if (amb > 0.5) rows.push(["Cítí se nedoceněn (schopnosti nad hodnost)", -Math.round(amb)]);
  if (C.excom > s.turn) rows.push(["Papežská klatba", -10]);
  if (hasTech(s, c.cl, "zakonik")) rows.push(["Zemský zákoník", 5]);
  const sudi = officeVal(s, c.cl, "sudi"); if (sudi) rows.push(["Zemský sudí", 3]);
  if (isPlayer(s, c.cl) && C.estates) rows.push(["Nálada šlechty", Math.round((C.estates.slechta - 50) / 4)]);
  if (C.gold <= 0) rows.push(["Prázdná komora", -10]);
  return { rows, val: clamp(sum(rows.map(r => r[1])), 0, 100) };
}
// čas pochodu (hory, lesy a mokřady zdrží o měsíc)
function marchTime(s, path) { return sum((path || []).map(id => (TERRAIN[s.provs[id].ter].slow ? 2 : 1))); }
