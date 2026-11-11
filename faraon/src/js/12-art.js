// Ilustrace v egyptském stylu kreslené v SVG: výjevy k událostem, bojiště, deska senetu, kolo svátků,
// pruhy příjmů a výdajů. Barvy podle egyptských pigmentů (modř, červený a žlutý okr, malachit, saze, běloba).
const PG = { b: "#2f6d8f", r: "#b5452c", y: "#c9a227", g: "#4f8a5b", k: "#2a2420", w: "#efe6cf", s: "#d9bf8a", s2: "#c8a86a", n: "#3d7fb0" };

const A_ = {
  ankh: (x, y, s = 1, col = PG.y) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="-22" rx="6" ry="8" fill="none" stroke="${col}" stroke-width="3"/><path d="M-10 -12h20M0 -14v24" stroke="${col}" stroke-width="3.5"/></g>`,
};
const SCENES = {};
const VIGN = { nizka: "nil", vysoka: "nil", hlad: "hlad", pohreb: "hrob", pohrebiste: "hrob", dopis_mrtvym: "hrob", vykradeny: "hrob", bitva: "bitva", vbitva: "bitva", korist: "bitva", hrozba: "bitva", medzaj: "bitva", tasetilukostrelci: "bitva", zbehove: "bitva",
  usir: "svatek", hebsed: "svatek", svatek: "svatek", min: "svatek", udoli: "svatek", apis: "chram", sochy: "chram", poutnici: "svatek", obnova: "chram", sen: "chram", exempce: "chram", stela: "chram",
  karavana: "obchod", byblos_posel: "obchod", obchod_nabidka: "obchod", posli_kus: "obchod", keftiu: "obchod", trpaslik: "obchod", navratilec: "obchod", dary_posel: "obchod",
  hroch: "lov", hrosi: "lov", lov: "lov", senet: "senet", senet_pozvani: "senet", nakaza: "nemoc", nemoc: "nemoc", mor_skotu: "nemoc", stir: "nemoc", kouzelnik: "kouzlo", krokodyl: "krokodyl", skudci: "hlad", hostina: "dvur", znameni: "kouzlo", narozeni: "porod", vychova: "dvur", chamsin: "boure", uprchlici: "hlad", lodni: "nil", zlaty_nalez: "zlato", mlady_vojak: "bitva", paviani: "obchod" };
function vignKind(ev, v) {
  if (VIGN[ev.k]) return VIGN[ev.k];
  const t = (v.t || "").toLowerCase();
  if (/bitv|válk|vojsk|nájezd|vzpour|zbě/.test(t)) return "bitva";
  if (/chrám|kněž|bůh|bohů|svátek|obět|svatyn/.test(t)) return "chram";
  if (/hrob|pohřeb|mrtv|panovník$/.test(t)) return "hrob";
  if (/lod|kupc|obchod|karavan|posel|posl/.test(t)) return "obchod";
  if (/hlad|sklizeň|obilí|sýpk|záplav|nil/.test(t)) return /záplav|nil/.test(t) ? "nil" : "hlad";
  return "dvur";
}

// ---------- bojiště ----------
function armyBlocks(t, x0, dir, col, op, hide) {
  const per = 200, kinds = [["kopinici", "sq"], ["lucistnici", "ci"], ["medzajove", "tr"], ["vozy", "wh"]];
  let blocks = []; for (const [k, sh] of kinds) { const n = Math.min(24, Math.round((t[k] || 0) / per)); for (let i = 0; i < n; i++) blocks.push(sh); }
  if (!blocks.length && men(t)) blocks.push("sq");
  if (hide) blocks = blocks.map(() => "q");
  blocks = blocks.slice(0, 48);
  let g = "";
  blocks.forEach((sh, i) => {
    const col_ = Math.floor(i / 6), row = i % 6, x = x0 + dir * (col_ * 17), y = 41 + row * 17, o = { s: 0.165, dir: -dir, mono: sh === "q" ? "#8a7f6c" : col };
    const one = sh === "sq" ? fig(x, y, { ...o, pose: "spear" }) : sh === "ci" ? fig(x, y, { ...o, pose: "bow" }) : sh === "tr" ? fig(x, y, { ...o, pose: "smite" })
      : sh === "wh" ? `<circle cx="${x}" cy="${y - 4}" r="4" fill="none" stroke="${col}" stroke-width="1.3"/><path d="M${x - 4} ${y - 4}h8M${x} ${y - 8}v8M${x} ${y - 4}h${-dir * 9}" stroke="${col}" stroke-width=".9"/>` + fig(x + dir * 1.5, y - 5, { ...o, s: 0.12, pose: "bow" })
      : fig(x, y, { ...o, pose: "down" });
    g += `<g opacity="${sh === "q" ? 0.45 : op}">${one}</g>`;
  });
  return g;
}
function fieldSvg(f) {
  if (!f) return "";
  const cm = S.clans[f.me.cl].col, cf = S.clans[f.foe.cl].col, opM = (0.35 + f.me.m / 160).toFixed(2), opF = (0.35 + f.foe.m / 160).toFixed(2);
  const bar = (x, m, col, al) => `<rect x="${x}" y="146" width="150" height="7" fill="${PG.k}" opacity=".15"/><rect x="${al === "r" ? x + 150 - m * 1.5 : x}" y="146" width="${clamp(m, 0, 100) * 1.5}" height="7" fill="${col}"/>`;
  const ord = (o, x, al) => o && BORDERS[o] ? `<text x="${x}" y="22" text-anchor="${al}" class="fo">${esc(BORDERS[o].n)}</text>` : "";
  let mid = "";
  if (f.me.o === "strelba" || f.foe.o === "strelba") for (let i = 0; i < 5; i++) { const fr = f.me.o === "strelba"; mid += `<path d="M${fr ? 230 : 370} ${50 + i * 16}Q300 ${20 + i * 16} ${fr ? 370 : 230} ${54 + i * 16}" stroke="${PG.k}" stroke-width="1" fill="none" stroke-dasharray="4 3"/>`; }
  if (f.me.o === "utok" || f.me.o === "vozy" || f.foe.o === "utok" || f.foe.o === "vozy") mid += `<path d="M262 82h76" stroke="${PG.r}" stroke-width="3"/><path d="M${f.me.o === "utok" || f.me.o === "vozy" ? "338 82l-10 -6v12z" : "262 82l10 -6v12z"}" fill="${PG.r}"/>`;
  if (f.me.o === "boky" || f.foe.o === "boky") mid += `<path d="M${f.me.o === "boky" ? "220 30Q300 0 360 28" : "380 30Q300 0 240 28"}" stroke="${PG.g}" stroke-width="2.5" fill="none" stroke-dasharray="6 4"/>`;
  const ter = TERRAIN[f.ter] || {}, ground = ter.nile ? `<path d="M0 6h600" stroke="${PG.b}" stroke-width="5" opacity=".5"/>` : "";
  return `<svg class="field" viewBox="0 0 600 160" role="img" aria-label="Bojiště: tvé vojsko vlevo, nepřítel vpravo"><rect width="600" height="160" fill="#e8dbbd"/>${ground}
    ${armyBlocks(f.me.t, 205, -1, cm, opM, false)}${armyBlocks(f.foe.t, 395, 1, cf, opF, f.foe.hide)}${mid}
    ${ord(f.me.o, 20, "start")}${ord(f.foe.o, 580, "end")}
    <text x="20" y="140" class="fo">${esc(S.clans[f.me.cl].n)} · ${fmtN(men(f.me.t))} · morálka ${Math.round(f.me.m)}</text><text x="580" y="140" class="fo" text-anchor="end">${esc(S.clans[f.foe.cl].n)} · ${f.foe.hide ? "?" : fmtN(men(f.foe.t))} · morálka ${Math.round(f.foe.m)}</text>
    ${bar(20, f.me.m, cm, "l")}${bar(430, f.foe.m, cf, "r")}</svg>
    <div class="flegend small muted">Kopiníci se štítem, lučištníci s lukem, Médžajové s kyjem, vozy s kolem. Jedna postava ≈ 200 mužů; sytost barvy = morálka.</div>`;
}

// ---------- senet ----------
function senetSvg(d) {
  const sq = n => { const r = Math.floor((n - 1) / 10), i = (n - 1) % 10, c = r === 1 ? 9 - i : i; return [22 + c * 56, 22 + r * 46]; };
  let g = `<rect x="10" y="10" width="580" height="150" rx="6" fill="#8a5a2a" stroke="${PG.k}" stroke-width="2"/>`;
  for (let n = 1; n <= 30; n++) { const [x, y] = sq(n); g += `<rect x="${x}" y="${y}" width="52" height="42" rx="3" fill="${n === 27 ? "#9cc3dd" : PG.w}" stroke="${PG.k}"/>`;
    if (n === 15) g += A_.ankh(x + 26, y + 36, 0.7, PG.g); if (n === 26) g += `<ellipse cx="${x + 26}" cy="${y + 28}" rx="7" ry="8" fill="${PG.r}"/><path d="M${x + 26} ${y + 20}V${y + 6}M${x + 21} ${y + 11}h10" stroke="${PG.k}" stroke-width="2"/>`; if (n === 27) g += `<path d="M${x + 6} ${y + 18}l6 -5l6 5l6 -5l6 5l6 -5l6 5M${x + 6} ${y + 28}l6 -5l6 5l6 -5l6 5l6 -5l6 5" stroke="${PG.b}" fill="none" stroke-width="2"/>`;
    if (n >= 28) g += `<text x="${x + 26}" y="${y + 28}" text-anchor="middle" class="fo">${["III", "II", "I"][n - 28]}</text>`; }
  const piece = (n, col, dx, cone) => { if (n <= 0) { return cone ? `<path d="M${-6 + dx} 186l8 -20l8 20z" fill="${col}" stroke="${PG.k}"/>` : `<rect x="${dx - 6}" y="168" width="16" height="18" rx="5" fill="${col}" stroke="${PG.k}"/>`; } const [x, y] = sq(Math.min(30, n)); return cone ? `<path d="M${x + 10 + dx} ${y + 38}l10 -26l10 26z" fill="${col}" stroke="${PG.k}"/>` : `<rect x="${x + 22 + dx}" y="${y + 12}" width="18" height="26" rx="6" fill="${col}" stroke="${PG.k}"/>`; };
  g += piece(d.me, PG.b, 0, true) + piece(d.foe, PG.r, 4, false);
  const sticks = (t, x) => t ? [0, 1, 2, 3].map(i => `<rect x="${x + i * 12}" y="172" width="8" height="22" rx="3" fill="${i < (t === 5 ? 0 : t) ? PG.w : "#6d4a1f"}" stroke="${PG.k}"/>`).join("") : "";
  if (d.last) g += `<text x="120" y="190" class="fo">tvůj hod ${d.last[0]}</text>${sticks(d.last[0], 60)}<text x="560" y="190" text-anchor="end" class="fo">soupeř ${d.last[1]}</text>${sticks(d.last[1], 380)}`;
  return `<svg class="senet" viewBox="0 0 600 200" role="img" aria-label="Deska senetu: tvá figura na poli ${d.me}, soupeřova na poli ${d.foe}">${g}</svg>`;
}

// ---------- pruhy příjmů a výdajů ----------
function flowBars(inc, ex, unit) {
  const COLS = [PG.g, PG.b, PG.y, "#7a4b8c", "#4fa0a0", "#8a8a6a", PG.r, "#a0522d", "#5d6b7a", "#c47a2c"];
  const I = inc.filter(([, v]) => v > 0), E = ex.filter(([, v]) => v > 0), ti = sum(I.map(x => x[1])), te = sum(E.map(x => x[1])), mx = Math.max(1, ti, te);
  const bar = (L, tot, lbl) => `<div class="fb"><div class="fbl">${lbl} <b>${fmt(Math.round(tot))}</b></div><div class="fbb" style="width:${Math.max(4, tot / mx * 100)}%">${L.map(([n, v], i) => `<i style="flex:${v};background:${COLS[i % COLS.length]}" title="${esc(n)}: ${fmt(Math.round(v))}"></i>`).join("")}</div><div class="fbk">${L.map(([n, v], i) => `<span><i style="background:${COLS[i % COLS.length]}"></i>${esc(n)} ${fmt(Math.round(v))}</span>`).join("")}</div></div>`;
  return `<div class="flow">${I.length ? bar(I, ti, "Příjmy") : ""}${bar(E, te, "Výdaje")}</div>`;
}

// ---------- kolo svátků ----------
function festWheel() {
  const cx = 160, cy = 160, R = 140, r0 = 92, cols = ["#3d7fb0", "#4f8a5b", "#c9a227"], names = ["achet", "peret", "šemu"];
  let g = "";
  for (let m = 0; m < 12; m++) {
    const a0 = m / 12 * 2 * Math.PI - Math.PI / 2, a1 = (m + 1) / 12 * 2 * Math.PI - Math.PI / 2, P_ = (r, a) => `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
    g += `<path d="M${P_(r0, a0)}L${P_(R, a0)}A${R} ${R} 0 0 1 ${P_(R, a1)}L${P_(r0, a1)}A${r0} ${r0} 0 0 0 ${P_(r0, a0)}Z" fill="${cols[Math.floor(m / 4)]}" opacity="${m === S.month ? 1 : 0.55}" stroke="#fff" stroke-width="1.5"/>`;
    const am = (m + 0.5) / 12 * 2 * Math.PI - Math.PI / 2; g += `<text x="${(cx + (R - 16) * Math.cos(am)).toFixed(1)}" y="${(cy + (R - 16) * Math.sin(am) + 4).toFixed(1)}" text-anchor="middle" class="fw">${m % 4 + 1}</text>`;
  }
  FESTIVALS.forEach((f, i) => { const same = FESTIVALS.filter(x => x.m === f.m), k = same.indexOf(f), am = (f.m + 0.25 + k * 0.25) / 12 * 2 * Math.PI - Math.PI / 2, own = S.provs[f.pid].owner, x = cx + (r0 + 22) * Math.cos(am), y = cy + (r0 + 22) * Math.sin(am);
    g += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="${S.clans[own].col}" stroke="#fff" stroke-width="2"/><text x="${x.toFixed(1)}" y="${(y + 3.5).toFixed(1)}" text-anchor="middle" class="fw">${i + 1}</text>`; });
  const an = (S.month + 0.5) / 12 * 2 * Math.PI - Math.PI / 2;
  g += `<circle cx="${cx}" cy="${cy}" r="${r0 - 6}" fill="var(--panel)"/>${SCENES.svatek ? "" : ""}<path d="M${cx} ${cy}L${(cx + (r0 - 14) * Math.cos(an)).toFixed(1)} ${(cy + (r0 - 14) * Math.sin(an)).toFixed(1)}" stroke="${PG.r}" stroke-width="4" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="7" fill="${PG.r}"/>`;
  g += names.map((n, i) => { const am = (i * 4 + 2) / 12 * 2 * Math.PI - Math.PI / 2; return `<text x="${(cx + (r0 - 34) * Math.cos(am)).toFixed(1)}" y="${(cy + (r0 - 34) * Math.sin(am) + 4).toFixed(1)}" text-anchor="middle" class="fn">${n}</text>`; }).join("");
  return `<svg class="fwheel" viewBox="0 0 320 320" role="img" aria-label="Kalendář svátků, ručička ukazuje současný měsíc">${g}</svg>`;
}

// ---------- karty nomů ----------
const TER_ICON = { udoli: "nil", delta: "nil", fajjum: "nil", nubie: "nil", katarakt: "nil", oaza: "obchod", poust: "obchod", kenaan: "obchod" };
function nomeCard(p) {
  const L = chr(S, p.lord), C = P(S), cap = p.id === C.capital;
  const bar = (lbl, v, max, col) => `<div class="nb"><span>${lbl}</span><span class="nbt"><i style="width:${clamp(v / Math.max(1, max) * 100, 0, 100)}%;background:${col}"></i></span><b>${Math.round(v)}</b></div>`;
  return `<div class="nomec${p.hunger > 0.1 ? " hungry" : ""}${p.siege ? " besieged" : ""}" data-a="selProv" data-x='["${p.id}"]' style="--c:${C.col}">
    <div class="nch">${emblem(p.owner, 18)}<div><div class="nn">${esc(p.n)}${cap ? " ★" : ""}</div><div class="small muted">${esc(p.eg)}</div></div>${L ? portrait(L, 36) : ""}</div>
    <div class="nterr t-${p.ter}">${esc(TERRAIN[p.ter].n)} · ${esc(p.god)}</div>
    ${bar("Pole", p.agri, agriCap(S, p), PG.g)}${bar("Obchod", p.com, comCap(S, p), PG.y)}${bar("Spokojenost", p.loy, 100, p.loy < 35 ? PG.r : PG.b)}
    <div class="nchips"><span title="obyvatel">${ricon("urednici", 15)} ${fmtK(p.pop * 1000)}</span><span title="posádka">${ricon("vojsko", 15)} ${fmtK(men(p.troops))}</span><span title="obecní zásoby obilí">${ricon("grain", 15)} ${fmtK(p.stock)}</span><span title="hradby">hradby ${Math.round(p.dur)}</span></div>
    ${p.hunger > 0.1 ? '<div class="nwarn">hlad</div>' : ""}${p.siege ? '<div class="nwarn">obléhán</div>' : ""}${p.build ? `<div class="small muted">staví se: ${esc((BUILD[p.build.b] || { n: p.build.b }).n || p.build.b)} (ještě ${p.build.left} měs.)</div>` : ""}</div>`;
}
function tZupyArt() {
  const ps = myProvs().sort((a, b) => (b.id === P(S).capital) - (a.id === P(S).capital) || b.v - a.v);
  return `<div class="grid">${card(`Tvé nomy (${ps.length})`, `<div class="nomes">${ps.map(nomeCard).join("")}</div><p class="small muted">Klepni na nom a otevře se na mapě. Pruhy: pole a obchod vůči stropu, spokojenost lidu.</p>`, "wide")}</div>`;
}
