import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as search from "../src/components/knowing-god/search-results.ts";

const code = ts.transpileModule(fs.readFileSync(new URL("../src/components/knowing-god/TopicSearchResults.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const topic = { id: "love", title: "Love", letter: "L", passageCount: 1,
  passages: [{ reference: "John 3:16", text: "KJV only begotten Son" }] };
function harness(load) {
  const cache = new Map(), notes = new Map(), states = [], effects = [], timers = new Map();
  let cursor = 0, effectCursor = 0, timerId = 0;
  const jsx = (type, props) => ({ type, props });
  const exports = {};
  vm.runInNewContext(code, {
    exports, AbortController,
    require: name => name === "./search-results" ? search : name === "./bible-api" ? {
      netCache: cache, netNotes: notes, fetchNetPassages: (...args) => load(cache, notes, ...args),
    } : name === "react/jsx-runtime" ? { jsx, jsxs: jsx } : {
      useState(initial) {
        const i = cursor++;
        if (!(i in states)) states[i] = initial;
        return [states[i], value => { states[i] = typeof value === "function" ? value(states[i]) : value; }];
      },
      useMemo: fn => fn(),
      useEffect(fn, deps) {
        const i = effectCursor++;
        if (effects[i] && deps.every((d, j) => d === effects[i].deps[j])) return;
        effects[i]?.cleanup?.();
        effects[i] = { deps, cleanup: fn() };
      },
    },
    window: {
      setTimeout(fn) { timers.set(++timerId, fn); return timerId; },
      clearTimeout(id) { timers.delete(id); },
    },
  });
  const props = { topics: [topic], payloads: { L: [topic] }, loadLetter: async () => [topic],
    query: "Son", translation: "NET", testament: "All Testaments", book: "All books",
    onOpen() {}, scriptureHref: () => "/bible?translation=net" };
  return {
    props, states, cache,
    render() { cursor = effectCursor = 0; return exports.TopicSearchResults(props); },
    async runTimers() { const pending = [...timers.values()]; timers.clear(); await Promise.all(pending.map(fn => fn())); },
    dispose() { for (const e of effects) e.cleanup?.(); },
  };
}
function nodes(root) {
  if (!root || typeof root !== "object") return [];
  if (Array.isArray(root)) return root.flatMap(nodes);
  return [root, ...nodes(root.props?.children)];
}
function text(root) {
  if (root == null || typeof root === "boolean") return "";
  if (typeof root !== "object") return String(root);
  if (Array.isArray(root)) return root.map(text).join("");
  return text(root.props?.children);
}

test("NET errors are explicit, do not show KJV as NET, and retry shows NET plus notes", async () => {
  let attempts = 0;
  const h = harness(async (cache, notes) => {
    if (++attempts === 1) return false;
    cache.set("John 3:16", "NET one and only Son");
    notes.set("John 3:16", "Retained reference note");
    return true;
  });
  h.render(); await h.runTimers();
  let tree = h.render();
  assert.match(text(tree), /Results are incomplete/);
  assert.doesNotMatch(text(tree), /KJV only begotten|No Scripture text matches/);
  nodes(tree).find(n => n.type === "button" && text(n) === "Try again").props.onClick();
  h.render(); await h.runTimers(); tree = h.render();
  assert.match(text(tree), /NET one and only Son/);
  assert.match(text(tree), /Retained reference note/);
  assert.doesNotMatch(text(tree), /Results are incomplete/);
  h.dispose();
});

test("a cancelled NET request cannot replace KJV results or report an obsolete error", async () => {
  let release, started;
  const wait = new Promise(resolve => { release = resolve; });
  const ready = new Promise(resolve => { started = resolve; });
  const h = harness(async (_cache, _notes, _refs, _width, signal) => {
    started(); await wait; assert.equal(signal.aborted, true); return false;
  });
  h.render();
  const pending = h.runTimers();
  await ready;
  h.props.translation = "KJV";
  h.props.query = "begotten";
  h.render(); await h.runTimers();
  release(); await pending;
  const output = text(h.render());
  assert.match(output, /KJV only begotten Son/);
  assert.doesNotMatch(output, /Results are incomplete|Loading and searching NET/);
  h.dispose();
});
