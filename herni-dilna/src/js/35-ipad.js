// ---------- iPad: zvětšení stolu, kreslení perem ----------
const zoomOf = () => S.zoom || 1;
function applyZoom(z, cx, cy) {
  const sc = $(".mat-scroll"), mat = $("#mat"), sz = $(".mat-sizer"); if (!sc || !mat || !sz) { S.zoom = z; return; }
  const old = zoomOf(); z = Math.max(.3, Math.min(2.5, z)); S.zoom = z;
  const r = sc.getBoundingClientRect(); const px = cx == null ? sc.clientWidth / 2 : cx - r.left, py = cy == null ? sc.clientHeight / 2 : cy - r.top;
  const mx = (sc.scrollLeft + px) / old, my = (sc.scrollTop + py) / old;
  mat.style.transform = `scale(${z})`; sz.style.width = S.matW * z + "px"; sz.style.height = S.matH * z + "px";
  sc.scrollLeft = mx * z - px; sc.scrollTop = my * z - py;
  const lab = $("#zLab"); if (lab) lab.textContent = Math.round(z * 100) + " %";
}
function fitZoom(p) {
  const sc = $(".mat-scroll"); if (!sc) return; const b = tableBoard(p); const g = b ? geo(b) : null;
  const w = g ? BX + g.W + 20 : S.matW, h = g ? BY + g.H + 20 : S.matH;
  applyZoom(Math.min(sc.clientWidth / w, sc.clientHeight / h)); sc.scrollLeft = 0; sc.scrollTop = 0;
}
function zoomBarHTML(t) {
  const cols = ["#b0402c", "#3f6fb0", "#2f7a45", "#161616"];
  return `<div class="zoombar" role="toolbar" aria-label="Zvětšení a kreslení">
    <button id="zOut" aria-label="Zmenšit">−</button><span id="zLab" class="mono">${Math.round(zoomOf() * 100)} %</span><button id="zIn" aria-label="Zvětšit">+</button><button id="zFit" title="Celá mapa">⤢</button>
    <span class="zsep"></span><button id="inkOn" aria-pressed="${!!S.inkMode}" title="Kreslit perem">✎</button>
    ${S.inkMode ? cols.map(c => `<button data-inkc="${c}" aria-pressed="${(S.inkColor || cols[0]) === c}" aria-label="Barva"><span class="dot" style="background:${c}"></span></button>`).join("") + `<button id="inkUndo" title="Smazat poslední tah" ${(t.ink || []).length ? "" : "disabled"}>↶</button><button id="inkClear" title="Smazat kresbu" ${(t.ink || []).length ? "" : "disabled"}>⌫</button>` : ""}
  </div>`;
}
const inkSVG = (t, W, H) => `<svg class="inklayer ${S.inkMode ? "on" : ""}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${(t.ink || []).map(s => `<path d="${s.d}" stroke="${s.c}" stroke-width="${s.w || 3}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join("")}</svg>`;
function wireIpad(main, p, t, save) {
  const q = id => document.getElementById(id); const sc = $(".mat-scroll"), mat = $("#mat"); if (!sc || !mat) return;
  q("zIn").onclick = () => applyZoom(zoomOf() * 1.25); q("zOut").onclick = () => applyZoom(zoomOf() / 1.25); q("zFit").onclick = () => fitZoom(p);
  q("inkOn").onclick = () => { S.inkMode = !S.inkMode; render(); };
  $$("[data-inkc]", main).forEach(b => b.onclick = () => { S.inkColor = b.dataset.inkc; render(); });
  if (q("inkUndo")) q("inkUndo").onclick = () => { t.ink.pop(); save(); render(); };
  if (q("inkClear")) q("inkClear").onclick = () => { t.ink = []; save(); render(); };
  // Dva prsty: zvětšení. Vlastní řešení, aby se nezvětšovala celá stránka.
  let pinch = null;
  sc.addEventListener("touchstart", e => { if (e.touches.length === 2) { const [a, b] = e.touches; pinch = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), z: zoomOf() }; S.pinching = true; } }, { passive: true });
  sc.addEventListener("touchmove", e => { if (!pinch || e.touches.length !== 2) return; e.preventDefault(); const [a, b] = e.touches; const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); applyZoom(pinch.z * d / pinch.d, (a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2); }, { passive: false });
  sc.addEventListener("touchend", e => { if (e.touches.length < 2) { pinch = null; setTimeout(() => S.pinching = false, 50); } });
  sc.addEventListener("wheel", e => { if (!e.ctrlKey) return; e.preventDefault(); applyZoom(zoomOf() * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX, e.clientY); }, { passive: false });
  // Kreslení: v režimu pera kreslí prst i Apple Pencil, mimo něj samotné pero.
  mat.addEventListener("pointerdown", e => {
    if (!S.inkMode && !(e.pointerType === "pen" && S.penDraws)) return; if (S.pinching) return;
    e.preventDefault(); e.stopPropagation();
    const r = mat.getBoundingClientRect(); const z = zoomOf(); const pt = ev => [((ev.clientX - r.left) / z).toFixed(1), ((ev.clientY - r.top) / z).toFixed(1)];
    const svg = $(".inklayer"); const path = document.createElementNS("http://www.w3.org/2000/svg", "path"); const col = S.inkColor || "#b0402c";
    let d = "M" + pt(e).join(" "); path.setAttribute("d", d); path.setAttribute("stroke", col); path.setAttribute("stroke-width", e.pointerType === "pen" ? 2.5 : 3.5); path.setAttribute("fill", "none"); path.setAttribute("stroke-linecap", "round"); svg.appendChild(path);
    mat.setPointerCapture(e.pointerId);
    const mv = ev => { d += " L" + pt(ev).join(" "); path.setAttribute("d", d); };
    const up = () => { mat.removeEventListener("pointermove", mv); mat.removeEventListener("pointerup", up); mat.removeEventListener("pointercancel", up);
      if (d.includes("L")) { (t.ink = t.ink || []).push({ d, c: col, w: e.pointerType === "pen" ? 2.5 : 3.5 }); if (t.ink.length > 300) t.ink.shift(); save(); render(); } else path.remove(); };
    mat.addEventListener("pointermove", mv); mat.addEventListener("pointerup", up); mat.addEventListener("pointercancel", up);
  }, true);
  mat.addEventListener("click", e => { if (S.inkMode) e.stopImmediatePropagation(); }, true);
}
