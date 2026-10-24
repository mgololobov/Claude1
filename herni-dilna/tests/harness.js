// Načte zdrojové moduly do izolovaného prostředí bez prohlížeče, aby šla testovat herní logika.
const fs = require("fs"), path = require("path"), vm = require("vm");

function stubEl() {
  return { style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {} }, addEventListener() {}, removeEventListener() {}, appendChild() {}, remove() {},
    setAttribute() {}, querySelector: () => null, querySelectorAll: () => [], getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }), innerHTML: "", textContent: "", value: "" };
}
function load() {
  const store = {};
  const document = { querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: () => stubEl(), addEventListener() {}, body: stubEl(), visibilityState: "visible" };
  const ctx = {
    console, document, location: { hash: "" }, navigator: {}, crypto: require("crypto").webcrypto,
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  };
  ctx.window = ctx; ctx.window.__TEST__ = true; ctx.globalThis = ctx;
  vm.createContext(ctx);
  const dir = path.join(__dirname, "..", "src", "js");
  const code = '"use strict";\n' + fs.readdirSync(dir).filter(f => f.endsWith(".js")).sort().map(f => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");
  vm.runInContext(code, ctx, { filename: "herni-dilna.js" });
  const S = ctx.__S(); S.silent = true;
  return { ...ctx, S };
}
module.exports = { load };
