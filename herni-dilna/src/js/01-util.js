// ---------- pomocné ----------
// Akce, které se smí spustit až po načtení stránky (v testech se nespouští).
const INIT = []; const onInit = f => INIT.push(f);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const uid = () => Math.random().toString(36).slice(2, 10);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const today = () => new Date().toISOString().slice(0, 10);
const COLORS = ["#3f6fb0", "#b0402c", "#2f7a45", "#7a4fa0", "#c98a12", "#2a8c8c", "#4a4a48", "#c2577f", "#a89a5c", "#6b7a6a", "#d9d2bd"];
const SHAPES = { kruh: "Kruh", ctverec: "Čtverec", figurka: "Figurka" };
const SYMBOLS = { pechota: "Pěchota", tanky: "Tanky (obrněná)", mech: "Mechanizovaná pěchota", delo: "Dělostřelectvo", jezdectvo: "Jezdectvo / průzkum", vysadek: "Výsadek", zasobovani: "Zásobování", stab: "Štáb (HQ)", text: "Vlastní značka", zadny: "Bez značky" };
const SIZES = { "": "–", "•••": "••• četa", "I": "I rota", "II": "II prapor", "III": "III pluk", "X": "X brigáda", "XX": "XX divize", "XXX": "XXX sbor" };
const BX = 24, BY = 30, PAD = 14;
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function rnd(n) { const a = new Uint32Array(1); crypto.getRandomValues(a); return (a[0] % n) + 1; }
function fmtDate(d) { if (!d) return ""; const [y, m, dd] = d.split("-"); return `${+dd}. ${+m}. ${y}`; }
function plural(n, a, b, c) { return n === 1 ? a : (n >= 2 && n <= 4 ? b : c); }
function inkFor(hex) { const n = parseInt(String(hex).slice(1), 16); if (isNaN(n)) return "#fff"; const r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) > 160 ? "#15130c" : "#ffffff"; }
const pad2 = n => String(n).padStart(2, "0");
function toast(msg) { if (typeof S !== "undefined" && S.silent) return; $$(".toast").forEach(x => x.remove()); const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2400); }
const swatchRow = (cur, attr) => `<div class="swatches">${COLORS.map(c => `<button class="swatch" ${attr}="${c}" style="background:${c}" aria-pressed="${c === cur}" aria-label="Barva ${c}"></button>`).join("")}</div>`;
