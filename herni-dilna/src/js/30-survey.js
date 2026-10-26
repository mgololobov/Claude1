// ---------- Dotazník po hře (zapisuje se k záznamu testu) ----------
const SURVEY = [["fun", "Jak moc hra bavila?", ["1 vůbec", "2", "3", "4", "5 hodně"]], ["len", "Délka hry", ["krátká", "akorát", "dlouhá"]], ["cx", "Složitost", ["jednoduchá", "akorát", "složitá"]]];
function surveyHTML(sv = {}) {
  return `<div class="eyebrow">Dotazník po hře</div>${SURVEY.map(([k, q, opts]) => `<div class="f"><span>${q}</span><div class="tools" role="radiogroup">${opts.map((o, i) => `<button type="button" data-sv="${k}" data-svv="${i + 1}" aria-pressed="${+sv[k] === i + 1}">${o}</button>`).join("")}</div></div>`).join("")}
    <label class="f">Co bylo nejasné?<input type="text" id="sv-unclear" value="${esc(sv.unclear || "")}" placeholder="pravidlo, karta, symbol…"></label>`;
}
function wireSurvey(d, sv) {
  $$("[data-sv]", d).forEach(b => b.onclick = () => { sv[b.dataset.sv] = +b.dataset.svv; $$(`[data-sv="${b.dataset.sv}"]`, d).forEach(x => x.setAttribute("aria-pressed", x === b)); });
  return () => { sv.unclear = $("#sv-unclear", d).value.trim(); return sv; };
}
function surveySummaryHTML(ss) {
  const w = ss.filter(s => s.survey && (s.survey.fun || s.survey.len || s.survey.cx || s.survey.unclear)); if (!w.length) return "";
  const avg = k => { const v = w.map(s => +s.survey[k]).filter(Boolean); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const cnt = (k, i) => w.filter(s => +s.survey[k] === i).length;
  const fun = avg("fun"); const unclear = w.map(s => s.survey.unclear).filter(Boolean);
  return `<div class="panel"><h3>Dotazníky (${w.length})</h3>
    <div class="stat-row"><div class="stat"><span class="eyebrow">Zábava</span><b>${fun == null ? "–" : fun.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })}</b><span class="muted">z 5</span></div>
    <div class="stat"><span class="eyebrow">Délka</span><b style="font-size:1rem">${["krátká", "akorát", "dlouhá"].map((x, i) => `${x} ${cnt("len", i + 1)}`).join(" · ")}</b></div>
    <div class="stat"><span class="eyebrow">Složitost</span><b style="font-size:1rem">${["jednoduchá", "akorát", "složitá"].map((x, i) => `${x} ${cnt("cx", i + 1)}`).join(" · ")}</b></div></div>
    ${unclear.length ? `<h3>Nejasnosti</h3><ul>${unclear.map(u => `<li>${esc(u)}</li>`).join("")}</ul>` : ""}</div>`;
}
