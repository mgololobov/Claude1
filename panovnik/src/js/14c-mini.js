// Kresby ve stylu gotických knižních miniatur: tušová linka, plošné pigmenty, postavy v dobovém oděvu.
// Vše se kreslí do pomyslného plátna vysokého 170 jednotek; šířka W se řídí poměrem stran obrázku.
// Odívání a výzbroj odpovídají 2. polovině 13. století: kroužková zbroj s varkočem, hrncová přilba, trojúhelný štít,
// dlouhé suknice, kukly, závoje s rouškou; hrady s cimbuřím, kostely s lomenými okny.

const PG = { az: "#2f5a94", azd: "#1f3f6e", ver: "#b3321f", verd: "#7d2014", grn: "#3d7a56", grnl: "#86a35c", grnd: "#2c5a3e", och: "#c99a3a", gold: "#e3bd5a", rose: "#cf8d84", stone: "#c9bda4", stoned: "#9b8e78", wht: "#f1e9d6", brn: "#6d4a2a", brnd: "#4a3220", pur: "#6a3d6e", skin: "#e9c9a8", steel: "#aeb4b8", ink: "#2a1c12", roof: "#a8432a", blk: "#2a2420", slate: "#4d5f7a" };
const MH_ = 170;
const f1 = v => (Math.round(v * 10) / 10);
const at = (x, y, k, d, body) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${f1((d || 1) * (k || 1) * 100) / 100} ${k || 1})">${body}</g>`;
const thin = d => `<path d="${d}" fill="none" stroke-width=".6" opacity=".6"/>`;

// ---------- předměty do ruky (počátek v dlani, míří vzhůru) ----------
const ITEM = {
  sword: `<path d="M-1 -1 L-.8 -23 L0 -26 L.8 -23 L1 -1Z" fill="${PG.steel}"/><path d="M-3.6 -1 h7.2" stroke-width="1.6"/><path d="M0 -1 v4.4" stroke-width="1.6"/><circle cy="4.2" r="1.1" fill="${PG.gold}"/>`,
  spear: `<path d="M0 16 V-40" stroke-width="1.4" stroke="${PG.brnd}"/><path d="M-1.8 -39 L0 -48 L1.8 -39Z" fill="${PG.steel}"/>`,
  lance: `<path d="M-16 5 L44 -9" stroke-width="2.2" stroke="${PG.brnd}"/><path d="M43 -11 l7 .6 l-6.2 3.4z" fill="${PG.steel}"/>`,
  staff: `<path d="M0 22 V-30" stroke-width="1.5" stroke="${PG.brnd}"/>`,
  crozier: `<path d="M0 22 V-30 C0 -38 8 -38 8 -32 C8 -28 3.6 -28 3.6 -31.4" fill="none" stroke-width="1.7" stroke="${PG.och}"/>`,
  cross: `<path d="M0 22 V-40" stroke-width="1.5" stroke="${PG.brnd}"/><path d="M-1.2 -50 h2.4 v4 h4 v2.4 h-4 v6 h-2.4 v-6 h-4 v-2.4 h4z" fill="${PG.gold}"/>`,
  cup: `<path d="M-2.6 -6 h5.2 l-.8 3.4 h-1 v2 h1.6 v1 h-4.8 v-1 h1.6 v-2 h-1z" fill="${PG.gold}"/>`,
  book: `<path d="M-4 -7 h8 v8 h-8z" fill="${PG.ver}"/><path d="M-4 -5.4 h8 M2.4 -7 v8" stroke-width=".6"/>`,
  scroll: `<path d="M-3 -9 h6 v10 h-6z" fill="${PG.wht}"/><path d="M-1.8 -6 h3.6 M-1.8 -4 h3.6 M-1.8 -2 h2.4" stroke-width=".5"/><circle cx="1.4" cy="2.4" r="1.5" fill="${PG.ver}"/>`,
  lute: `<g transform="rotate(-58)"><path d="M0 -4 C6 -4 7 6 0 9 C-7 6 -6 -4 0 -4Z" fill="${PG.och}"/><circle cy="2.4" r="1.6" fill="${PG.brnd}"/><path d="M-1 -4 L-1 -17 l-2.4 -2.4 h4 L1 -17 L1 -4" fill="${PG.brn}"/></g>`,
  scythe: `<path d="M0 20 V-34" stroke-width="1.5" stroke="${PG.brnd}"/><path d="M0 -34 C10 -38 20 -32 24 -22 C17 -29 9 -31 0 -30Z" fill="${PG.steel}"/>`,
  pick: `<path d="M0 12 V-20" stroke-width="1.6" stroke="${PG.brnd}"/><path d="M-9 -16 C-4 -22 4 -22 9 -16 L7.6 -15 C3 -19 -3 -19 -7.6 -15Z" fill="${PG.steel}"/>`,
  hammer: `<path d="M0 8 V-14" stroke-width="1.6" stroke="${PG.brnd}"/><path d="M-5 -18 h10 v5 h-10z" fill="${PG.steel}"/>`,
  torch: `<path d="M0 12 V-10" stroke-width="2" stroke="${PG.brnd}"/><path d="M-3.4 -10 C-5 -17 -1 -18 -1 -24 C3 -20 5.4 -16 3.4 -10Z" fill="#e8892a"/><path d="M-1.4 -10 C-2 -14 .4 -15 .6 -18 C2 -15.4 2.6 -13 1.6 -10Z" fill="${PG.gold}" stroke="none"/>`,
  bag: `<path d="M-3.4 2 C-5.4 9 5.4 9 3.4 2 L1.6 0 h-3.2z" fill="${PG.brn}"/><path d="M-2 0 h4" stroke-width="1"/>`,
  bow: `<path d="M1 -17 C-9 -8 -9 8 1 17" fill="none" stroke-width="1.5" stroke="${PG.brnd}"/><path d="M1 -17 V17" stroke-width=".5"/>`,
  bucket: `<path d="M-3.6 1 h7.2 l-.9 7 h-5.4z" fill="${PG.brn}"/><path d="M-3.6 1 C-3 -4 3 -4 3.6 1" fill="none" stroke-width=".7"/>`,
  flask: `<path d="M-1.4 -9 h2.8 v4 l3.4 6 C5.6 3.4 4 4.6 2 4.6 h-4 C-4 4.6 -5.6 3.4 -4.8 1 l3.4 -6z" fill="#9fc7b8" fill-opacity=".85"/><path d="M-3.6 1 h7.2" stroke-width=".5"/>`,
  astrolabe: `<circle cy="-6" r="6" fill="${PG.gold}"/><circle cy="-6" r="3.4" fill="none" stroke-width=".6"/><path d="M-6 -6 h12 M0 -12 v12" stroke-width=".5"/>`,
  banner: c => `<path d="M0 18 V-46" stroke-width="1.4" stroke="${PG.brnd}"/><path d="M0 -46 h20 l-5 5.4 l5 5.4 h-20z" fill="${c}"/><circle cy="-47.4" r="1.4" fill="${PG.gold}"/>`,
};
// ---------- postava: chodidla v [x,y], výška asi 66 × k, dir 1 = hledí vpravo ----------
// o: col (suknice), c2 (nohavice), long (dlouhý šat), head (bare|crown|mitre|hood|hat|helm|great|veil|tonsure|coif), hair, cloak, mail, aL, aR (úhly paží: 0 dolů, 90 vpřed, 180 vzhůru),
//    hold / holdL (předmět v přední / zadní ruce), rot (natočení předmětu), shield (barva štítu na zadní paži), mounted, kneel
function mFig(x, y, o = {}) {
  const col = o.col || PG.ver, c2 = o.c2 || PG.brn, skin = o.skin || PG.skin, hair = o.hair || PG.brn, slv = o.mail ? PG.steel : o.slv || col, head = o.head || "bare", long = o.long && !o.mounted, kn = o.kneel;
  const hand = (sx, ang) => { const a = ang * Math.PI / 180; return [sx + Math.sin(a) * 20, -50 + Math.cos(a) * 20]; };
  const arm = (sx, ang) => `<g transform="translate(${sx} -50) rotate(${-ang})"><path d="M-2.7 0 L-2 17.4 h4 L2.7 0Z" fill="${slv}"/><circle cy="19.2" r="2" fill="${skin}"/></g>`;
  const held = (it, sx, ang, rot) => { if (!it) return ""; const [hx, hy] = hand(sx, ang), body = typeof ITEM[it] === "function" ? ITEM[it](o.bcol || col) : ITEM[it] || ""; return `<g transform="translate(${f1(hx)} ${f1(hy)}) rotate(${rot || 0})">${body}</g>`; };
  const aL = o.aL == null ? 8 : o.aL, aR = o.aR == null ? -6 : o.aR;
  let g = "";
  if (o.cloak) g += `<path d="M-8.6 -52 C-14 -36 -13.4 -14 -12.6 ${long ? -3 : -8} L12.6 ${long ? -3 : -8} C13.4 -14 14 -36 8.6 -52Z" fill="${o.cloak}"/>`;
  g += held(o.holdL, -6.4, aL, o.rotL) + arm(-6.4, aL);
  if (o.shield) { const [hx, hy] = hand(-6.4, aL); g += `<g transform="translate(${f1(hx - 1)} ${f1(hy - 8)})"><path d="M-6 -7 h12 v6 C6 7 2 10 0 12 C-2 10 -6 7 -6 -1Z" fill="${o.shield}"/><path d="M0 -7 V11 M-6 -1 h12" stroke-width=".7" opacity=".7" stroke="${PG.gold}"/></g>`; }
  // nohy
  if (o.mounted) g += `<path d="M-3 -27 L6.4 -21 L5 -8.4 l4.6 1.6 v1.6 h-7.6 L1 -16.4 L-6 -22Z" fill="${o.mail ? PG.steel : c2}"/>`;
  else if (kn) g += `<path d="M-6 -24 L-8 -8 L-16 -2 v2 h9 L-2 -9 L0 -24Z" fill="${o.mail ? PG.steel : c2}"/><path d="M0 -24 L9 -13 L8 -1 l4 .6 v.4 h-8 L3.6 -11 L-3 -20Z" fill="${o.mail ? PG.steel : c2}"/>`;
  else if (!long) g += `<path d="M-5.8 -24 L-5.2 -2.6 l-2.8 1.5 v1.1 h6.2 l.8 -24z" fill="${o.mail ? PG.steel : c2}"/><path d="M-.2 -24 l1 21.6 l5.6 1.5 v.9 h-8.2 l-.8 -24z" fill="${o.mail ? PG.steel : c2}"/>`;
  // trup a suknice
  const hem = long ? -1.8 : o.mounted ? -24 : kn ? -20 : -20.6, hw = long ? 10.8 : 9.4;
  g += `<path d="M-7.6 -52 C-9.6 -44 -8 -38 -6.6 -36 L${-hw} ${hem} Q0 ${hem + 3} ${hw} ${hem} L6.6 -36 C8 -38 9.6 -44 7.6 -52 Q0 -54.6 -7.6 -52Z" fill="${col}"/>`;
  if (long) g += `<path d="M-7 -1.2 l-2.4 1.2 h4.4z M4 -1.2 l4.6 1.2 h-5.6z" fill="${PG.blk}"/>`;
  g += `<path d="M-6.8 -36 Q0 -34.2 6.8 -36" fill="none" stroke-width="1.1"${o.mail ? ` stroke="${PG.brnd}"` : ""}/>` + thin(`M-3 -34 L${long ? -5.6 : -4.4} ${hem + 2.4} M1 -34 L${long ? 2 : 1.4} ${hem + 3} M4 -34.4 L${long ? 7.4 : 6} ${hem + 2}`);
  if (o.trim) g += `<path d="M-3.2 -53 Q.2 -50.4 3.6 -53" fill="none" stroke="${o.trim}" stroke-width="1.4"/><path d="M${-hw + .6} ${hem + .6} Q0 ${hem + 3.4} ${hw - .6} ${hem + .6}" fill="none" stroke="${o.trim}" stroke-width="1.2"/>`;
  if (o.charge) g += `<path d="M-2.4 -47 h4.8 M0 -49.4 v7" stroke="${o.charge}" stroke-width="1.5"/>`;
  // krk a hlava
  g += `<path d="M-1.6 -56 h3.6 v4 h-3.6z" fill="${skin}" stroke="none"/>`;
  const face = `<ellipse cx=".7" cy="-60" rx="4.3" ry="5.1" fill="${skin}"/><circle cx=".5" cy="-60.6" r=".5" fill="${PG.ink}" stroke="none"/><circle cx="3" cy="-60.6" r=".5" fill="${PG.ink}" stroke="none"/><path d="M4.4 -60.2 q1.3 1.7 .1 2.5" fill="none" stroke-width=".6"/><path d="M1.6 -56.8 h2" stroke-width=".55"/>`;
  const bob = `<path d="M-3.9 -58 C-5.4 -66.4 4 -68 5.5 -62.2 C3 -64.2 -1 -64 -2.6 -60 L-2.8 -54.6 C-4.6 -54.6 -4.8 -57 -3.9 -58Z" fill="${hair}"/>`;
  if (head === "hood" || head === "coif" || head === "helm") { const hc = head === "hood" ? o.hood || PG.grnd : PG.steel; g += `<path d="M-5 -52 C-7.4 -66 7 -70 6.2 -60 L5.6 -55.6 C7.4 -54 8.2 -52 8.2 -50.4 L-8.2 -50.4 C-8.2 -53 -6 -52 -5 -52Z" fill="${hc}"/><ellipse cx="1.4" cy="-60" rx="3.6" ry="4.4" fill="${skin}"/><circle cx="1" cy="-60.6" r=".5" fill="${PG.ink}" stroke="none"/><circle cx="3.4" cy="-60.6" r=".5" fill="${PG.ink}" stroke="none"/><path d="M4.6 -60.2 q1.1 1.6 0 2.4" fill="none" stroke-width=".6"/><path d="M2 -57 h1.8" stroke-width=".55"/>`;
    if (head === "helm") g += `<path d="M-4.6 -62.4 C-4.2 -69.6 6 -69.6 6.2 -62.4Z" fill="${PG.steel}"/><path d="M3.6 -62.4 v4.4" stroke-width="1.4" stroke="${PG.stoned}"/><path d="M-4.6 -62.4 h10.8" stroke-width="1"/>`;
    if (head === "hood" && o.liripipe !== false) g += `<path d="M-5 -62 C-10 -62 -10 -52 -8 -46" fill="none" stroke="${hc}" stroke-width="2"/>`; }
  else if (head === "great") g += `<path d="M-4.4 -66.4 h10.2 l.8 12 h-11.8z" fill="${PG.steel}"/><path d="M-1 -62 h7.4 M2.6 -66 v10" stroke-width=".9"/><path d="M.4 -58.4 h1 M3.6 -58.4 h1 M.4 -56.6 h1 M3.6 -56.6 h1" stroke-width=".5"/>${o.crest ? `<path d="M.6 -66.4 C-2 -72 4 -74 3 -78 C7 -74 6 -70 3.4 -66.4Z" fill="${o.crest}"/>` : ""}`;
  else if (head === "veil") g += `<path d="M-5.4 -52 C-8 -66.4 6.4 -70 6.2 -61 C3.4 -64.6 -1.4 -64 -2.4 -60 L-2 -52Z" fill="${PG.wht}"/>${face}<path d="M-2.6 -57 C-1 -53.4 3.6 -53.2 5 -56.4 L4.6 -52.4 h-6.6z" fill="${PG.wht}"/>`;
  else { g += face + bob;
    if (head === "tonsure") g += `<ellipse cx=".4" cy="-65" rx="2.5" ry="1.1" fill="${skin}"/>`;
    if (head === "crown") g += `<path d="M-4.2 -64.4 l-.7 -4.2 l2.5 2 l2 -3.6 l2 3.6 l2.7 -2 l-.6 4.6z" fill="${PG.gold}"/><circle cx=".3" cy="-66" r=".7" fill="${PG.ver}" stroke="none"/>`;
    if (head === "mitre") g += `<path d="M-3.8 -64 L-2.8 -73 L1 -77 L4.8 -73 L5.6 -64Z" fill="${PG.wht}"/><path d="M-3.8 -64.6 h9.4 M1 -76 v11" stroke="${PG.gold}" stroke-width="1.2"/>`;
    if (head === "hat") g += `<path d="M-4.8 -63 C-4.4 -70.4 6 -70.4 6.2 -63.4 L8.4 -63 v1.5 L-5.2 -61.8z" fill="${o.hat || PG.brnd}"/>`;
    if (head === "beard" || o.beard) g += `<path d="M-.6 -57.4 C-.4 -52.4 4.6 -52 5 -57.2 C3.4 -55.6 1 -55.6 -.6 -57.4Z" fill="${hair}"/>`; }
  if (head === "crown" && o.fem) g += `<path d="M-4.6 -62 C-7 -52 -6 -44 -5 -40" fill="none" stroke="${hair}" stroke-width="2.4"/>`;
  g += arm(6.4, aR) + held(o.hold, 6.4, aR, o.rot);
  return at(x, y, o.k, o.dir, g);
}
// ---------- kůň (kopyta v [x,y], hledí vpravo) a jezdec ----------
function mHorse(x, y, o = {}) {
  const c = o.col || "#7b5437", ga = o.gallop;
  const leg = p => `<polyline points="${p}" fill="none" stroke="${PG.ink}" stroke-width="5.2"/><polyline points="${p}" fill="none" stroke="${c}" stroke-width="3.3"/>`, hoof = (hx, hy) => `<path d="M${hx - 2.6} ${hy} h5.2 v-2.6 h-5.2z" fill="${PG.blk}"/>`;
  const legs = ga ? [["14,-18 24,-12 34,-14", 34, -12], ["10,-16 19,-8 29,-8", 29, -6], ["-19,-18 -27,-10 -37,-9", -37, -7], ["-15,-16 -22,-6 -31,-4", -31, -2]] : [["13,-17 13,-9 13.4,-2.4", 13.4, 0], ["8,-16 8.6,-8 8,-2.4", 8, 0], ["-19,-18 -21.6,-9 -19,-2.4", -19, 0], ["-14,-16 -16.6,-8.6 -14.6,-2.4", -14.6, 0]];
  const tail = ga ? "M-23 -32 C-31 -35 -36 -30 -41 -32" : "M-23 -32 C-30 -30 -31 -18 -28 -9";
  let g = `<path d="${tail}" fill="none" stroke="${PG.ink}" stroke-width="4.6"/><path d="${tail}" fill="none" stroke="${o.mane || PG.brnd}" stroke-width="2.8"/>` + legs.map(([p, hx, hy]) => leg(p) + hoof(hx, hy)).join("");
  g += `<path d="M-22 -35 C-27 -30 -26 -20 -22 -16 C-14 -12 8 -11 16 -15 C21 -18 22 -26 20 -33 C12 -38 -12 -39 -22 -35Z" fill="${c}"/><path d="M10 -35 C14 -44 18 -52 24 -57 L31 -52 C27 -46 23 -38 21 -27Z" fill="${c}"/>`;
  g += `<path d="M23 -57.4 C27 -60.6 31 -58.4 33 -53.4 L38.4 -44.4 C39.6 -41.4 36.4 -39 34 -41 L28 -47 C25 -49.4 23 -53 23 -57.4Z" fill="${c}"/><path d="M25 -58.4 l.6 -5.4 l3.4 4z" fill="${c}"/><circle cx="30.4" cy="-53.4" r=".8" fill="${PG.ink}" stroke="none"/><path d="M12 -38 C15 -46 19 -53 24 -57.6" fill="none" stroke="${o.mane || PG.brnd}" stroke-width="2.4"/>`;
  if (o.cap) g += `<path d="M-24 -35.6 L-25.4 -9 Q-12 -4.6 -5 -9 L-3 -16 L6 -16 L8 -8.4 Q16 -4.6 21.6 -9 L21 -33.6 C12 -39 -12 -40 -24 -35.6Z" fill="${o.cap}"/><path d="M-24.6 -12 Q-12 -7.6 -5.4 -12 M8 -11.4 Q16 -7.6 21.4 -12" fill="none" stroke="${o.trim || PG.gold}" stroke-width="1.3"/><path d="M11 -34 C15 -43 19 -51 24 -56 L30 -51.6 C26 -45 23 -38 21.4 -30Z" fill="${o.cap}"/>`;
  g += `<path d="M-9 -37 q7 -4.4 13 0 l1 4.4 h-15z" fill="${PG.brnd}"/><path d="M36 -44 L9 -41" fill="none" stroke-width=".7"/>`;
  if (o.pack) g += `<path d="M-14 -44 h20 l3 12 h-26z" fill="${o.pack}"/><path d="M-12 -38 h17 M-4 -44 v12" stroke-width=".6"/>`;
  return at(x, y, o.k, o.dir, g);
}
// jezdec na koni; fig = volby postavy, horse = volby koně
function mRider(x, y, o = {}) { const k = o.k || 1, d = o.dir || 1, ga = o.horse && o.horse.gallop; return mHorse(x, y, Object.assign({ k, dir: d }, o.horse)) + mFig(x - 2 * d * k, y - (ga ? 20 : 19) * k, Object.assign({ k, dir: d, mounted: true }, o.fig)); }
function mWolf(x, y, k, d) { return at(x, y, k, d, `<path d="M-20 -14 C-27 -12 -29 -5 -26 0 M-12 -4 L-13 2 h3 l1 -7 M10 -5 L11 2 h3 l-.6 -8" fill="none" stroke-width="2.6" stroke="#5d5a58"/><path d="M-20 -16 C-12 -20 4 -20 12 -19 L17 -26 l2 5 l6 2 l5 4 l-6 2 l-5 -1 C16 -6 6 -3 -6 -4 C-14 -4 -20 -8 -20 -16Z" fill="#6d6a68"/><circle cx="21.6" cy="-17.6" r=".9" fill="${PG.gold}" stroke="none"/>`); }
// ---------- stavby ----------
function ashlar(x0, y0, w, h) { let d = ""; for (let y = y0 + 6, r = 0; y < y0 + h - 2; y += 7, r++) for (let x = x0 + 3 + (r % 2) * 5; x < x0 + w - 5; x += 11) d += `M${f1(x)} ${f1(y)} h4.6`; return d ? `<path d="${d}" stroke-width=".55" opacity=".45" fill="none"/>` : ""; }
function crenel(x0, y, w, col) { let d = ""; const n = Math.max(2, Math.round(w / 7)), s = w / n; for (let i = 0; i < n; i++) d += `M${f1(x0 + i * s + s * 0.18)} ${y} v-3.6 h${f1(s * 0.64)} v3.6`; return `<path d="${d}" fill="${col}"/>`; }
function mTower(x, y, w, h, o = {}) { const c = o.col || PG.stone; let g = `<path d="M${x - w / 2} ${y} v${-h} h${w} v${h}z" fill="${c}"/>` + ashlar(x - w / 2, y - h, w, h) + `<path d="M${x - 1.4} ${y - h * 0.62} v-6 a1.4 1.4 0 0 1 2.8 0 v6z" fill="${PG.blk}"/>`;
  if (o.roof) g += `<path d="M${x - w / 2 - 2} ${y - h} L${x} ${y - h - w * 1.05} L${x + w / 2 + 2} ${y - h}Z" fill="${o.roof}"/>${o.flag ? `<path d="M${x} ${y - h - w * 1.05} v-9" stroke-width="1"/><path d="M${x} ${y - h - w * 1.05 - 9} h9 l-2.4 2.4 l2.4 2.4 h-9z" fill="${o.flag}"/>` : ""}`; else g += crenel(x - w / 2, y - h, w, c);
  return g; }
function mCastle(x, y, o = {}) { const c = o.col || PG.stone; return at(x, y, o.k, 1,
  mTower(0, 0, 22, 66, { roof: PG.roof, flag: o.flag || PG.ver, col: c }) + `<path d="M-40 0 v-30 h80 v30z" fill="${c}"/>` + ashlar(-40, -30, 80, 30) + crenel(-40, -30, 80, c) + mTower(-40, 0, 16, 48, { roof: PG.slate, col: c }) + mTower(40, 0, 16, 48, { roof: PG.slate, col: c }) +
  `<path d="M-7 0 v-13 a7 7 0 0 1 14 0 v13z" fill="${PG.blk}"/><path d="M-4.6 0 v-15 M-2 0 v-18 M2 0 v-18 M4.6 0 v-15 M-7 -6 h14 M-7 -11 h14" stroke="${PG.stoned}" stroke-width=".7" fill="none"/>`); }
function mChurch(x, y, o = {}) { const c = o.col || PG.wht; return at(x, y, o.k, o.dir,
  `<path d="M-34 0 v-30 h56 v30z" fill="${c}"/><path d="M-37 -30 L-6 -50 L25 -30Z" fill="${PG.roof}"/>` + thin("M-30 -34 h48 M-24 -38 h36 M-17 -42.4 h22") + [-25, -11, 3].map(wx => `<path d="M${wx} -6 v-12 a3.4 3.4 0 0 1 6.8 0 v12z" fill="${PG.azd}"/>`).join("") +
  `<path d="M22 0 v-62 h18 v62z" fill="${c}"/>` + ashlar(22, -62, 18, 62) + `<path d="M20 -62 L31 -92 L42 -62Z" fill="${PG.slate}"/><path d="M31 -92 v-9 M27.6 -97.4 h6.8" stroke-width="1.4" stroke="${PG.och}"/><path d="M28 -40 v-9 a3 3 0 0 1 6 0 v9z" fill="${PG.blk}"/><path d="M27 0 v-12 a4 4 0 0 1 8 0 v12z" fill="${PG.brnd}"/><circle cx="-6" cy="-39.6" r="3.6" fill="${PG.azd}"/>`); }
function mHouse(x, y, o = {}) { const c = o.col || PG.wht, w = o.w || 20, hh = o.h || 15; return at(x, y, o.k, 1,
  `<path d="M${-w / 2} 0 v${-hh} h${w} v${hh}z" fill="${c}"/><path d="M${-w / 2 - 2} ${-hh} L0 ${-hh - w * 0.62} L${w / 2 + 2} ${-hh}Z" fill="${o.roof || PG.roof}"/>` + (o.timber === false ? "" : `<path d="M${-w / 2} ${-hh / 2} h${w} M${-w / 2} ${-hh} L${-w / 6} 0 M${w / 2} ${-hh} L${w / 6} 0" stroke="${PG.brnd}" stroke-width=".8" fill="none"/>`) + `<path d="M-2.2 0 v-6.4 a2.2 2.2 0 0 1 4.4 0 v6.4z" fill="${PG.brnd}"/><path d="M${w / 4} ${-hh * 0.72} h3 v3 h-3z" fill="${PG.blk}"/>`); }
function mWall(x0, x1, y, hh) { return `<path d="M${x0} ${y} v${-hh} h${x1 - x0} v${hh}z" fill="${PG.stone}"/>` + ashlar(x0, y - hh, x1 - x0, hh) + crenel(x0, y - hh, x1 - x0, PG.stone); }
function mTown(x, y, o = {}) { const R = o.R || Math.random, n = o.n || 7; let g = ""; for (let i = 0; i < n; i++) g += mHouse(-50 + i * 100 / (n - 1) + (R() - 0.5) * 6, -14 - (i % 2) * 7, { col: [PG.wht, "#e3d2ae", PG.rose, "#d8c9a6"][i % 4], roof: i % 3 ? PG.roof : PG.slate, h: 13 + R() * 6, w: 16 + R() * 5 });
  return at(x, y, o.k, 1, mChurch(8, -18, { k: 0.62 }) + g + mWall(-66, 66, 0, 18) + mTower(-66, 0, 13, 32, { roof: PG.roof }) + mTower(66, 0, 13, 32, { roof: PG.roof }) + mTower(0, 0, 16, 30) + `<path d="M-5 0 v-10 a5 5 0 0 1 10 0 v10z" fill="${PG.blk}"/>`); }
function mTent(x, y, k, c1, c2) { return at(x, y, k, 1, `<path d="M-17 0 v-13 L0 -40 L17 -13 V0Z" fill="${c1}"/><path d="M-9 0 v-13 L0 -40 M9 0 v-13 L0 -40" fill="none" stroke="${c2 || PG.wht}" stroke-width="3"/><path d="M-17 -13 Q0 -9 17 -13" fill="none"/><path d="M0 -40 v-8" stroke-width="1"/><path d="M0 -48 h8 l-2 2 l2 2 h-8z" fill="${c2 || PG.gold}"/><path d="M-3 0 v-9 l3 -3 l3 3 v9z" fill="${PG.blk}"/>`); }
// ---------- příroda ----------
function mTree(x, y, k, kind, R) { const r = R || Math.random;
  if (kind === "jehl") return at(x, y, k, 1, `<path d="M-1.6 0 v-12 h3.2 v12z" fill="${PG.brn}"/><path d="M-11 -9 Q-5 -12 0 -24 Q5 -12 11 -9 Q0 -5 -11 -9Z M-9 -20 Q-4 -23 0 -34 Q4 -23 9 -20 Q0 -16.6 -9 -20Z M-6.6 -31 Q-3 -34 0 -45 Q3 -34 6.6 -31 Q0 -28 -6.6 -31Z" fill="${PG.grnd}"/>`);
  if (kind === "holy") return at(x, y, k, 1, `<path d="M-2 0 C-1 -10 -2 -18 -1 -26 L-9 -38 M-1 -24 L8 -37 M0 -18 L-10 -24 M0 -20 L11 -25 M-9 -38 l-5 -3 M-9 -38 l1 -7 M8 -37 l6 -2 M8 -37 l-1 -8" fill="none" stroke="${PG.brnd}" stroke-width="2.2"/>`);
  const lobes = [[-9, -31, 9], [9, -32, 9.4], [0, -41, 10.4], [-3, -28, 8], [5, -27, 8]]; let leaf = ""; for (const [lx, ly, lr] of lobes.slice(0, 3)) for (let i = 0; i < 5; i++) { const a = r() * 6.28, q = r() * lr * 0.62; leaf += `M${f1(lx + Math.cos(a) * q - 1.3)} ${f1(ly + Math.sin(a) * q)} q1.3 -1.6 2.6 0`; }
  return at(x, y, k, 1, `<path d="M-2.6 0 C-1.6 -8 -1.6 -14 -2.4 -22 L2.4 -22 C1.6 -14 1.6 -8 2.6 0Z" fill="${PG.brn}"/><path d="M-2 -18 L-8 -25 M2 -18 L8 -26" stroke-width="1.6" stroke="${PG.brnd}"/>` + lobes.map(([lx, ly, lr]) => `<circle cx="${lx}" cy="${ly}" r="${lr}" fill="${kind === "podzim" ? PG.och : PG.grn}"/>`).join("") + `<path d="${leaf}" fill="none" stroke-width=".7" stroke="${kind === "podzim" ? PG.brn : PG.grnd}"/>`); }
function mRock(x, y, k, c) { return at(x, y, k, 1, `<path d="M-34 0 L-27 -19 l7 -2 l3 -15 l8 -3 l4 -17 l9 2 l3 15 l8 4 l3 15 l9 3 L34 0Z" fill="${c || PG.stone}"/>` + thin("M-20 -21 l4 9 M-9 -39 l5 12 l-3 9 M3 -54 l1 14 M15 -35 l-4 12 l4 10 M26 -17 l-5 9")); }
function mCloud(x, y, k, c) { return at(x, y, k, 1, `<path d="M-30 6 C-40 6 -40 -6 -30 -6 C-30 -16 -14 -18 -10 -10 C-6 -22 14 -22 16 -8 C26 -14 38 -6 32 4 C36 10 26 12 22 8 C12 14 -4 12 -8 8 C-16 14 -28 12 -30 6Z" fill="${c || PG.wht}"/>` + thin("M-22 -1 q5 -5 10 0 M-2 -6 q6 -6 12 0 M12 2 q5 -4 10 0")); }
function mStar(x, y, r) { let d = ""; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 - Math.PI / 2, q = i % 2 ? r * 0.42 : r; d += (i ? "L" : "M") + f1(x + Math.cos(a) * q) + " " + f1(y + Math.sin(a) * q); } return `<path d="${d}Z" fill="${PG.gold}" stroke-width=".5"/>`; }
function mSun(x, y, r, face) { let g = ""; for (let i = 0; i < 16; i++) g += `<path d="M-2.6 ${-r - 1} L0 ${-r - (i % 2 ? 7 : 11)} L2.6 ${-r - 1}Z" transform="rotate(${i * 22.5})" fill="${PG.gold}"/>`; return `<g transform="translate(${x} ${y})">${g}<circle r="${r}" fill="#f0cf6a"/>${face !== true ? "" : `<circle cx="${-r * 0.32}" cy="${-r * 0.16}" r="1" fill="${PG.ink}" stroke="none"/><circle cx="${r * 0.32}" cy="${-r * 0.16}" r="1" fill="${PG.ink}" stroke="none"/><path d="M0 ${-r * 0.1} v${r * 0.3} M${-r * 0.3} ${r * 0.44} q${r * 0.3} ${r * 0.2} ${r * 0.6} 0" fill="none" stroke-width=".8"/>`}</g>`; }
function mFlame(x, y, k) { return at(x, y, k, 1, `<path d="M-9 0 C-14 -12 -5 -16 -7 -28 C0 -22 2 -18 1 -12 C5 -18 5 -26 3 -34 C13 -24 15 -10 9 0Z" fill="#e0702a"/><path d="M-4 0 C-7 -8 -1 -11 -1 -17 C4 -12 6 -6 4 0Z" fill="${PG.gold}" stroke="none"/>`); }
function mWaves(x0, x1, y, n, c) { let g = ""; for (let r = 0; r < n; r++) { let d = `M${x0} ${y + r * 7}`; for (let x = x0 + (r % 2) * 9; x < x1; x += 18) d += ` q4.5 -5 9 0 t9 0`; g += `<path d="${d}" fill="none" stroke="${c || PG.wht}" stroke-width="1" opacity=".75"/>`; } return g; }
function mShip(x, y, k, d, o = {}) { return at(x, y, k, d, `<path d="M-34 -12 C-30 2 -22 8 -12 8 h26 C26 8 34 0 36 -12 l-8 0 v-7 h-9 v7 h-30 v-5 h-10 v5z" fill="${PG.brn}"/>` + thin("M-30 -6 C-22 2 22 2 32 -6 M-27 -1 C-18 6 18 6 28 -1") + `<path d="M2 -12 V-62" stroke-width="2.2" stroke="${PG.brnd}"/><path d="M-18 -56 Q2 -50 22 -56 L20 -22 Q2 -15 -16 -22Z" fill="${o.sail || PG.wht}"/><path d="M2 -53 V-19 M-17 -39 Q2 -33 21 -39" stroke="${o.cross || PG.ver}" stroke-width="2.6" fill="none"/><path d="M2 -62 h11 l-3 2.6 l3 2.6 h-11z" fill="${o.flag || PG.ver}"/><path d="M-18 -56 L-34 -12 M22 -56 L36 -12" stroke-width=".6" fill="none"/>`); }
// ---------- nábytek a drobnosti ----------
function mTable(x, y, w, cloth) { return `<path d="M${x - w / 2} ${y - 22} h${w} v6 h${-w}z" fill="${PG.brn}"/><path d="M${x - w / 2 + 5} ${y - 16} V${y} M${x + w / 2 - 5} ${y - 16} V${y}" stroke-width="3.4" stroke="${PG.brnd}"/>${cloth ? `<path d="M${x - w / 2 - 2} ${y - 23} h${w + 4} v9 q${-(w + 4) / 2} 4 ${-(w + 4)} 0z" fill="${cloth}"/>` : ""}`; }
function mThrone(x, y, k) { return at(x, y, k, 1, `<path d="M-13 0 v-52 l13 -12 l13 12 v52z" fill="${PG.och}"/><path d="M-9 -8 v-40 l9 -8 l9 8 v40z" fill="${PG.ver}"/><path d="M-16 0 v-24 h32 v24z" fill="${PG.brn}"/><path d="M-13 -52 v-7 M13 -52 v-7 M0 -64 v-7" stroke-width="1.6" stroke="${PG.och}"/><circle cx="-13" cy="-60" r="2" fill="${PG.gold}"/><circle cx="13" cy="-60" r="2" fill="${PG.gold}"/><circle cy="-72" r="2.4" fill="${PG.gold}"/>`); }
function mCandle(x, y, k) { return at(x, y, k, 1, `<path d="M-1.6 0 v-15 h3.2 v15z" fill="${PG.wht}"/><path d="M-4 0 h8 l-1.4 3 h-5.2z" fill="${PG.gold}"/><path d="M0 -16 C-3 -20 0 -22 0 -26 C3 -22 3 -19 0 -16Z" fill="#e8892a"/><circle cy="-20" r="9" fill="${PG.gold}" opacity=".16" stroke="none"/>`); }
function mChest(x, y, k, open) { return at(x, y, k, 1, `<path d="M-17 0 v-15 h34 v15z" fill="${PG.brn}"/><path d="M-17 -8 h34 M-9 0 v-15 M9 0 v-15" stroke="${PG.och}" stroke-width="1.4" fill="none"/>` + (open ? `<path d="M-17 -15 L-15 -30 h30 l2 15z" fill="${PG.brnd}"/><path d="M-14 -15 q4 -8 8 -2 q3 -8 7 -1 q4 -7 8 0 q3 -4 5 3z" fill="${PG.gold}"/>` : `<path d="M-17 -15 q17 -12 34 0z" fill="${PG.brn}"/>`) + `<path d="M-2 -10 h4 v5 h-4z" fill="${PG.gold}"/>`); }
function mBarrel(x, y, k) { return at(x, y, k, 1, `<path d="M-6 0 C-9 -6 -9 -12 -6 -18 h12 C9 -12 9 -6 6 0Z" fill="${PG.brn}"/><path d="M-7.6 -5 h15.2 M-7.6 -13 h15.2" stroke-width="1" stroke="${PG.brnd}"/>`); }
function mCart(x, y, k, load) { return at(x, y, k, 1, `<path d="M-22 -10 h44 l3 -13 h-50z" fill="${PG.brn}"/><path d="M22 -14 h20" stroke-width="2" stroke="${PG.brnd}"/>${load || ""}<circle cx="-12" cy="-7" r="7.4" fill="${PG.och}"/><circle cx="12" cy="-7" r="7.4" fill="${PG.och}"/><path d="M-12 -14.4 v14.8 M-19.4 -7 h14.8 M12 -14.4 v14.8 M4.6 -7 h14.8" stroke-width=".8"/><circle cx="-12" cy="-7" r="1.6" fill="${PG.brnd}"/><circle cx="12" cy="-7" r="1.6" fill="${PG.brnd}"/>`); }
function mSheaf(x, y, k) { return at(x, y, k, 1, `<path d="M-6 0 L-3 -13 L-9 -26 L0 -21 L9 -26 L3 -13 L6 0Z" fill="${PG.och}"/><path d="M-3.4 -13 h6.8" stroke-width="1.4" stroke="${PG.brn}"/>` + thin("M-2 -2 L-1 -12 M2 -2 L1 -12 M-5 -23 l3 6 M5 -23 l-3 6")); }
function mGrave(x, y, k) { return at(x, y, k, 1, `<path d="M-1.6 0 v-20 h3.2 v20z M-7 -15 h14 v3 h-14z" fill="${PG.stone}"/><path d="M-9 0 q9 -6 18 0z" fill="${PG.brn}"/>`); }
// ---------- pozadí ----------
function mGround(W, R, o = {}) {
  const y0 = o.y || 142, c = o.col || PG.grnl, far = o.far === undefined ? PG.grn : o.far; let g = "";
  if (far) { let d = `M0 ${MH_} V${y0 - 8}`; for (let x = 0; x < W; x += 70) d += ` Q${x + 35} ${y0 - 26 - R() * 20} ${x + 70} ${y0 - 8 - R() * 6}`; g += `<path d="${d} V${MH_}Z" fill="${far}"/>`; }
  let d = `M0 ${MH_} V${y0}`; for (let x = 0; x < W; x += 46) d += ` q23 ${-7 - R() * 5} 46 0`; g += `<path d="${d} V${MH_}Z" fill="${c}"/>`;
  if (o.tufts !== false) { let t = ""; for (let i = 0; i < W / 22; i++) { const x = R() * W, y = y0 + 6 + R() * 18; t += `M${f1(x)} ${f1(y)} l-2 -4.4 M${f1(x)} ${f1(y)} v-5.4 M${f1(x)} ${f1(y)} l2 -4.4`; } g += `<path d="${t}" fill="none" stroke-width=".7" stroke="${o.tuft || PG.grnd}" opacity=".8"/>`; }
  return g;
}
// síň: tapetová stěna, arkáda s lomenými oblouky, dlážděná podlaha
function mHall(W, o = {}) {
  const wall = o.wall || PG.verd, fy = 146; let g = `<rect width="${W}" height="${MH_}" fill="${wall}" stroke="none"/><rect width="${W}" height="${MH_}" fill="url(#mdiap)" stroke="none" opacity=".8"/>`;
  const n = Math.max(3, Math.round(W / 150)), s = W / n;
  for (let i = 0; i < n; i++) { const x = i * s; g += `<path d="M${f1(x + 8)} 60 C${f1(x + 8)} 30 ${f1(x + s / 2 - 6)} 14 ${f1(x + s / 2)} 8 C${f1(x + s / 2 + 6)} 14 ${f1(x + s - 8)} 30 ${f1(x + s - 8)} 60" fill="none" stroke="${PG.stone}" stroke-width="5"/><path d="M${f1(x + 8)} 60 C${f1(x + 8)} 30 ${f1(x + s / 2 - 6)} 14 ${f1(x + s / 2)} 8 C${f1(x + s / 2 + 6)} 14 ${f1(x + s - 8)} 30 ${f1(x + s - 8)} 60" fill="none" stroke-width=".8" transform="translate(0 -3.4)"/>`; }
  for (let i = 0; i <= n; i++) { const x = clamp(i * s, 4, W - 4); g += `<path d="M${f1(x - 4)} ${fy} V62 h8 V${fy}z" fill="${PG.stone}"/><path d="M${f1(x - 7)} 62 h14 v-5 h-14z M${f1(x - 6.4)} ${fy} h12.8 v-4.6 h-12.8z" fill="${PG.stoned}"/>`; }
  let t = ""; for (let x = 0, i = 0; x < W; x += 16, i++) t += `<path d="M${x} ${fy + (i % 2) * 12} h16 v12 h-16z" fill="${PG.brnd}" stroke="none"/>`;
  return g + `<rect y="${fy}" width="${W}" height="${MH_ - fy}" fill="${o.floor || PG.och}"/>` + t + `<path d="M0 ${fy} H${W}" stroke-width="1.2"/>`;
}
// obecná kostra obrázku: pozadí podle druhu, pak vlastní výjev
function miniSvg(cls, w, h, body, o = {}) {
  const W = Math.round(w * MH_ / h), id = "mi" + (ART_N++), sky = o.sky || "day";
  const bg = { day: [PG.azd, "#3f6ca6", PG.gold, 0.4], night: ["#0e1530", "#23305a", PG.gold, 0.14], storm: ["#3f3a4c", "#6a6072", "#d8cfc0", 0.2], gold: ["#c9952f", "#ecd27e", "#8a5a14", 0.4], red: [PG.verd, PG.ver, PG.gold, 0.36], dusk: ["#3a2f55", "#b06a52", PG.gold, 0.22] }[sky] || null;
  let g = `<defs><pattern id="mdiap" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M9 0 L18 9 L9 18 L0 9z" fill="none" stroke="${PG.gold}" stroke-width=".8" opacity=".4"/><circle cx="9" cy="9" r="1.1" fill="${PG.gold}" opacity=".5"/></pattern>`;
  if (bg) g += `<linearGradient id="${id}s" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></linearGradient><pattern id="${id}d" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M9 0 L18 9 L9 18 L0 9z" fill="none" stroke="${bg[2]}" stroke-width=".8" opacity="${bg[3]}"/><circle cx="9" cy="9" r="1.1" fill="${bg[2]}" opacity="${bg[3] + 0.1}"/></pattern>`;
  g += `</defs>` + (bg ? `<rect width="${W}" height="${MH_}" fill="url(#${id}s)"/><rect width="${W}" height="${MH_}" fill="url(#${id}d)"/>` : "");
  return `<svg class="${cls}" viewBox="0 0 ${W} ${MH_}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${g}<g stroke="${PG.ink}" stroke-width="1" stroke-linejoin="round" stroke-linecap="round">${body(W)}</g></svg>`;
}
