// Osobně vedená bitva: hráč dává rozkaz v každém kole. Rozkazy se navzájem přebíjejí podobně jako taktiky
// (salvy lučištníků rozbijí nehybný šik, šik zastaví útok i vozy, rychlý útok a vozy smetou lučištníky,
// obchvat lehkých oddílů rozvrátí šik, ale lučištníci ho odrazí). Vozy přicházejí do Egypta až v Druhém přechodném období.
const BORDERS = {
  utok: { n: "Útok na celé čáře", d: "silný úder, ale vlastní ztráty rostou; přebije lučištníky", beats: ["strelba"] },
  sik: { n: "Kopiníci drží šik", d: "štíty a kopí: menší ztráty, pevná morálka; zastaví útok i vozy", beats: ["utok", "vozy"], need: "kopinici" },
  strelba: { n: "Lučištníci střílejí", d: "salvy z dálky – síla podle podílu lučištníků; rozbijí šik a obchvat", beats: ["sik", "boky"], need: "lucistnici" },
  vozy: { n: "Vozy útočí na křídla", d: "koňské spřežení rozvrací řady, nejlépe na rovině; přebije lučištníky", beats: ["strelba"], need: "vozy" },
  boky: { n: "Médžajové obcházejí z boku", d: "pouštní lučištníci napadnou křídlo a podlomí morálku; přebijí šik", beats: ["sik"], need: "medzajove" },
  ustup: { n: "Ústup", d: "bitva skončí porážkou, ale vojsko se zachrání", beats: [] },
};
function bShare(X, k) { return (X.t[k] || 0) / Math.max(1, men(X.t)); }
function hasBoats(s, X, pid) { return TERRAIN[s.provs[pid].ter].nile && (hasTech(s, X.cl, "flotila") || (s.provs[pid].b.pristav || 0) > 0 || hasTech(s, X.cl, "clun")); }
function ordersFor(s, X, pid) {
  const L = ["utok"]; for (const k of ["sik", "strelba", "vozy", "boky"]) if (bShare(X, BORDERS[k].need) >= (k === "vozy" ? 0.02 : k === "boky" ? 0.04 : 0.15)) L.push(k);
  L.push("ustup"); return L;
}
function ordMod(s, X, Y, ox, oy, ter) {
  const m = { atk: 1, loss: 1, mor: 0, self: 0 }; if (!ox) return m;
  const T = TERRAIN[ter];
  if (ox === "utok") { m.atk = 1.22; m.loss = 1.2; m.mor = 3; }
  if (ox === "sik") { m.atk = 0.85; m.loss = 0.72; m.self = 3; }
  if (ox === "strelba") { m.atk = 0.75 + bShare(X, "lucistnici") * 1.1; m.loss = 0.85; }
  if (ox === "vozy") { m.atk = 1 + bShare(X, "vozy") * 3 * T.vuz; m.mor = 6 * T.vuz; }
  if (ox === "boky") { m.atk = 1.05; m.mor = 8; }
  if (ox === "ustup") { m.atk = 0.6; m.loss = X.boats ? 0.3 : 0.6; }
  if (oy && BORDERS[ox] && BORDERS[ox].beats.includes(oy)) { m.atk *= 1.15; m.mor += 3; }
  return m;
}
// strana bitvy z uloženého popisu (vojsko podle id, nebo posádka nomu)
function sideOf(s, spec, pid) {
  if (spec.army != null) { const a = s.armies.find(x => x.id === spec.army); if (!a || a.loc !== pid) return null; return { cl: a.cl, t: a.t, train: a.train, cmd: armyCmdBonus(s, a), cmds: a.cmds, stance: a.stance, tac: a.tactic, boats: hasBoats(s, a, pid) }; }
  const p = s.provs[spec.garr]; if (!p || !men(p.troops)) return null; const L = chr(s, p.lord);
  return { cl: p.owner, t: p.troops, train: p.train, cmd: L ? 1 + (st(L, "ved") - 50) / 200 : 0.95, fort: fortMult(s, p), cmds: L ? [L.id] : [], garr: 1 };
}
function liveBattleStart(s, As, Ds, pid, from, kind) {
  if (s.opts.live === false || s.pb || s.over && !s.over.cont) return false;
  const A = sideOf(s, As, pid), D = sideOf(s, Ds, pid); if (!A || !D) return false;
  if (A.cl !== s.player && D.cl !== s.player) return false;
  if (men(A.t) + men(D.t) < 800) return false;
  const p = s.provs[pid], B = battleInit(s, A, D, pid, { kind: kind === "posadka" && p.castle > 1 ? "zteč" : "bitva" }); B.live = 1;
  s.pb = { A: As, D: Ds, pid, from, kind, B, me: A.cl === s.player ? "A" : "D" };
  for (const sp of [As, Ds]) if (sp.army != null) { const a = s.armies.find(x => x.id === sp.army); if (a) a.hold = 1; }
  s.events.unshift({ k: "vbitva", data: {}, t: s.turn });
  return true;
}
function aiOrder(s, X, pid, mine, B, myLast) {
  const L = ordersFor(s, X, pid).filter(k => k !== "ustup");
  const m = mine === "A" ? B.mA : B.mD;
  if (m < 38 && !X.garr && chance(s, 0.35)) return "ustup";
  if (myLast && chance(s, 0.45)) { const c = L.find(k => BORDERS[k].beats.includes(myLast)); if (c) return c; }
  return pick(s, L);
}
function liveStep(s, order) {
  const pb = s.pb; if (!pb) return null;
  const A = sideOf(s, pb.A, pb.pid), D = sideOf(s, pb.D, pb.pid), B = pb.B;
  if (!A || !D) { liveClear(s); return "Jedna ze stran opustila bojiště."; }
  const prev = pb.me === "A" ? B.ordA[B.ordA.length - 1] : B.ordD[B.ordD.length - 1];
  const oa = pb.me === "A" ? order : aiOrder(s, A, pb.pid, "A", B, prev), od = pb.me === "D" ? order : aiOrder(s, D, pb.pid, "D", B, prev);
  battleRound(s, A, D, B, oa, od);
  if (B.done) return liveFinish(s, A, D);
  s.events.unshift({ k: "vbitva", data: {}, t: s.turn }); return null;
}
function liveClear(s) {
  const pb = s.pb; s.pb = null; s.events = s.events.filter(e => e.k !== "vbitva");
  for (const sp of [pb.A, pb.D]) if (sp.army != null) { const a = s.armies.find(x => x.id === sp.army); if (a) a.hold = 0; }
}
function liveFinish(s, A, D) {
  const pb = s.pb, p = s.provs[pb.pid], b = battleEnd(s, A, D, pb.B); liveClear(s);
  const a = s.armies.find(x => x.id === pb.A.army);
  if (pb.kind === "pole") {
    const e = s.armies.find(x => x.id === pb.D.army);
    if (b.win === "A") { if (e) retreat(s, e, e.path && e.path.length ? e.loc : (clanProvs(s, e.cl).find(q => p.nb.includes(q.id)) || {}).id); if (a) arrive(s, a, pb.from); }
    else if (a) retreat(s, a, pb.from);
  } else {
    if (b.win === "A") { const rest = men(p.troops); if (rest > 0) { const to = p.nb.map(n => s.provs[n]).find(q => q.owner === p.owner && !q.siege); if (to) for (const k of TROOP_IDS) to.troops[k] = (to.troops[k] || 0) + Math.round((p.troops[k] || 0) * 0.5); p.troops = {}; } if (a) arrive(s, a, pb.from); }
    else if (a) retreat(s, a, pb.from);
  }
  const won = (b.win === pb.me);
  return `Bitva u nomu ${p.n} skončila: ${won ? "vítězství" : b.retreat === pb.me ? "ústup" : "porážka"}.`;
}
// bez hráčova rozhodnutí (konec měsíce, simulace) dobojuje bitvu velitel
function liveAuto(s) {
  let guard = 40;
  while (s.pb && guard-- > 0) { const pb = s.pb, A = sideOf(s, pb.A, pb.pid), D = sideOf(s, pb.D, pb.pid); if (!A || !D) { liveClear(s); break; } liveStep(s, aiOrder(s, pb.me === "A" ? A : D, pb.pid, pb.me, pb.B, null)); }
  if (s.pb) liveClear(s);
  s.events = s.events.filter(e => e.k !== "vbitva");
}
EVENTS.vbitva = { view: (s, d) => {
  const pb = s.pb; if (!pb) return { t: "Bitva skončila", tx: "Vojska se rozešla.", ch: [{ t: "Dále", f: () => null }] };
  const A = sideOf(s, pb.A, pb.pid), D = sideOf(s, pb.D, pb.pid), B = pb.B, p = s.provs[pb.pid];
  if (!A || !D) return { t: "Bitva skončila", tx: "Jedna ze stran opustila bojiště.", ch: [{ t: "Dále", f: () => { liveClear(s); return null; } }] };
  const me = pb.me === "A" ? A : D, foe = pb.me === "A" ? D : A, mM = Math.round(pb.me === "A" ? B.mA : B.mD), mF = Math.round(pb.me === "A" ? B.mD : B.mA);
  const lastO = (pb.me === "A" ? B.ordD : B.ordA)[B.r - 1], lastR = B.rounds[B.r - 1];
  const myLoss = lastR ? lastR[pb.me === "A" ? 0 : 1] : 0, foeLoss = lastR ? lastR[pb.me === "A" ? 1 : 0] : 0;
  const tx = `${B.r ? `Po ${B.r}. kole: ` : ""}${B.r ? `tvoji ztratili ${fmtN(myLoss)} mužů, nepřítel ${fmtN(foeLoss)}.${lastO ? ` Nepřítel naposledy: „${BORDERS[lastO].n}“.` : ""} ` : `${pb.me === "A" ? "Tvé vojsko narazilo" : "Nepřítel napadl tvé vojsko"} v nomu ${p.n} (${TERRAIN[p.ter].n.toLowerCase()}). `}Máš ${fmtN(men(me.t))} mužů s morálkou ${mM}, ${clanName(s, foe.cl)} ${knows(s, p) || B.r ? fmtN(men(foe.t)) : "?"} mužů s morálkou ${mF}. ${me.t.vozy ? "" : ""}Jaký rozkaz dáš v ${B.r + 1}. kole? (Bitva trvá nejvýš 6 kol; kdo ztratí morálku nebo dvě třetiny mužů, prohrává.)`;
  const ch = ordersFor(s, me, pb.pid).map(k => ({ t: k === "ustup" ? (me.garr ? "Opustit nom a zachránit posádku" : me.boats ? "Ústup k lodím" : "Spořádaný ústup") : BORDERS[k].n, d: k === "ustup" && me.boats ? "lodě odvezou muže – ztráty skoro žádné" : BORDERS[k].d, f: () => liveStep(s, k) }));
  ch.push({ t: "Nechat bitvu na veliteli", d: "dobojuje bez tvých rozkazů", f: () => { liveAuto(s); return "Velitel dobojoval bitvu sám."; } });
  return { t: `Bitva u nomu ${p.n} – ${B.r + 1}. kolo`, tx, battle: B.r ? { a: A.cl, b: D.cl, aStart: B.aStart, bStart: B.dStart, rounds: B.rounds } : null, ch, cid: (me.cmds || [])[0] };
} };
