import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const source = fs.readFileSync(new URL("../src/components/knowing-god/FullBibleResults.tsx", import.meta.url), "utf8")
  .replace('new URL("./full-bible.worker.ts", import.meta.url)', '"/worker.js"')
  .replaceAll("import.meta.env.BASE_URL", '"/nested/"');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
function harness() {
  const state = [], refs = [], effects = [], timers = new Map(), sent = [];
  let cursor = 0, refCursor = 0, effectCursor = 0, timer = 0, instance;
  const jsx = (type, props) => ({ type, props }), exports = {};
  vm.runInNewContext(code, {
    exports, Worker: class { constructor() { instance = this; } postMessage(m) { sent.push(m); } terminate() {} },
    window: { setTimeout(fn) { timers.set(++timer, fn); return timer; }, clearTimeout(id) { timers.delete(id); } },
    require: name => name === "react/jsx-runtime" ? { jsx, jsxs: jsx } : {
      useState(initial) { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], v => { state[i] = typeof v === "function" ? v(state[i]) : v; }]; },
      useRef(initial) { const i = refCursor++; return refs[i] ??= { current: initial }; },
      useEffect(fn, deps) { const i = effectCursor++; if (effects[i] && deps.every((d,j) => d === effects[i].deps[j])) return; effects[i]?.cleanup?.(); effects[i] = { deps, cleanup: fn() }; },
    },
  });
  const props = { query: "God", translation: "NET", testament: "All Testaments", book: "All books", scriptureHref: r => `/nested/bible?reference=${r}` };
  return { props, sent,
    render() { cursor = refCursor = effectCursor = 0; return exports.FullBibleResults(props); },
    flush() { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); },
    reply(data = {}, id = sent.at(-1).id) { instance.onmessage({ data: { id, total: 42, page: sent.at(-1).page, pages: 3, verses: [], ...data } }); },
  };
}
function nodes(root) { if (!root || typeof root !== "object") return []; if (Array.isArray(root)) return root.flatMap(nodes); return [root, ...nodes(root.props?.children)]; }
const button = (tree, label) => nodes(tree).find(n => n.type === "button" && n.props.children === label);
test("full-Bible pagination resets for query, translation and filters; stale replies stay hidden", () => {
  const h = harness();
  for (const [key, value] of [["query","love"],["translation","KJV"],["testament","New Testament"],["book","John"]]) {
    h.render(); h.flush(); h.reply();
    button(h.render(), "Next").props.onClick();
    h.render(); h.flush();
    assert.equal(h.sent.at(-1).page, 2);
    const obsolete = h.sent.at(-1).id;
    h.props[key] = value;
    let tree = h.render();
    h.reply({ total: 999 }, obsolete);
    assert.ok(nodes(h.render()).some(n => n.props?.role === "status"));
    h.flush();
    assert.equal(h.sent.at(-1).page, 1);
    assert.equal(h.sent.at(-1).base, "/nested/knowing-god/bible-search/");
    h.reply(); tree = h.render();
    assert.equal(button(tree, "Previous").props.disabled, true);
  }
});
test("full-Bible loading errors expose a working retry", () => {
  const h = harness();
  h.render(); h.flush(); h.reply({ error: "Failed data load" });
  button(h.render(), "Try again").props.onClick();
  h.render(); h.flush(); h.reply();
  assert.equal(button(h.render(), "Try again"), undefined);
  assert.ok(button(h.render(), "Next"));
});
