import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Exercise the real component's JSX and event handlers with controlled hook
// state. Search matching/loading is covered by the separate search tests.
const source = fs.readFileSync(new URL("../src/components/knowing-god/ConcordancePrototype.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source.replaceAll("import.meta.env.BASE_URL", '"/"'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const topic = { id: "abiding", title: "Abiding", letter: "A", recordType: "topic", passageCount: 1,
  passages: [{ reference: "John 3:16", text: "God loved the world" }], definition: "", additionalScripture: [], seeAlso: [] };
function harness(view = "start") {
  const state = [];
  state[0] = { topics: [topic], counts: { passageCount: 1 } };
  state[2] = { A: [topic] };
  state[5] = view;
  state[6] = "God";
  let cursor = 0;
  const events = [];
  const hooks = {
    useState: initial => {
      const i = cursor++;
      if (!(i in state)) state[i] = initial;
      return [state[i], value => { state[i] = typeof value === "function" ? value(state[i]) : value; }];
    },
    useRef: current => ({ current }),
    useMemo: fn => fn(),
    useEffect: () => {},
  };
  const jsx = (type, props) => ({ type, props });
  const exports = {};
  const context = {
    exports,
    require: name => {
      if (name === "react") return hooks;
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "fragment" };
      return new Proxy({}, { get: (_, key) => {
        if (key === "netCache" || key === "netNotes") return new Map();
        if (key === "isDevotionalTopic") return () => true;
        if (key === "scriptureReaderPath") return () => "/bible";
        if (key === "formatSourcePassage") return (_, text) => text;
        if (key === "pushTopicHash") return (_, id) => events.push(id);
        return key;
      } });
    },
    requestAnimationFrame: fn => fn(),
    document: { querySelector: () => null, getElementById: () => ({ focus() {}, scrollIntoView() {} }) },
    window: { location: { hash: "", pathname: "/knowing-god", search: "" } },
  };
  vm.runInNewContext(compiled, context);
  return { state, events, render: () => { cursor = 0; return exports.ConcordancePrototype(); } };
}
function nodes(root) {
  if (!root || typeof root !== "object") return [];
  if (Array.isArray(root)) return root.flatMap(nodes);
  return [root, ...nodes(root.props?.children)];
}

test("one search input stays in sidebar and one result list occupies center in both views", () => {
  for (const view of ["start", "topic"]) {
    const h = harness(view);
    let all = nodes(h.render());
    assert.equal(all.filter(n => n.props?.id === "topic-search").length, 1);
    assert.equal(all.filter(n => n.type === "TopicSearchResults").length, 1);
    const center = all.find(n => n.props?.id === "kg-search-results");
    assert.match(center.props.className, /md:col-start-2 md:row-start-1/);
    assert.equal(nodes(center).filter(n => n.type === "TopicSearchResults").length, 1);
    for (const aside of all.filter(n => n.type === "aside")) {
      assert.equal(nodes(aside).filter(n => n.type === "TopicSearchResults").length, 0);
    }
    // Changing query scope does not create a second input/results instance.
    const scope = all.find(n => n.type === "button" && n.props?.onClick && JSON.stringify(n.props.children).includes("Devotional Topics"));
    scope.props.onClick();
    all = nodes(h.render());
    assert.equal(all.filter(n => n.props?.id === "topic-search").length, 1);
    assert.equal(all.filter(n => n.type === "TopicSearchResults").length, 1);
  }
});

test("selecting even the current topic dismisses results; clearing preserves the selected topic", () => {
  const h = harness("topic");
  let all = nodes(h.render());
  all.find(n => n.type === "TopicSearchResults").props.onOpen(topic);
  assert.equal(h.state[6], "");
  assert.equal(h.state[4], "abiding");
  assert.ok(!nodes(h.render()).some(n => n.props?.id === "kg-search-results"));
  h.state[6] = "no matches";
  all = nodes(h.render());
  all.find(n => n.type === "button" && n.props?.children === "Clear search").props.onClick();
  assert.equal(h.state[6], "");
  assert.equal(h.state[4], "abiding");
});

test("mobile result shortcut scrolls without changing the topic-history hash", () => {
  const all = nodes(harness().render());
  let prevented = false;
  all.find(n => n.type === "a" && n.props?.href === "#kg-search-results").props.onClick({
    preventDefault() { prevented = true; },
  });
  assert.equal(prevented, true);
});

test("passage filter controls pass their selections to the central search results", () => {
  const h = harness();
  h.state[9] = true;
  const all = nodes(h.render());
  all.find(n => n.type === "select" && n.props.value === "All Testaments").props.onChange({ target: { value: "New Testament" } });
  all.find(n => n.type === "select" && n.props.value === "All books").props.onChange({ target: { value: "John" } });
  const results = nodes(h.render()).find(n => n.type === "TopicSearchResults");
  assert.equal(results.props.testament, "New Testament");
  assert.equal(results.props.book, "John");
  assert.equal(results.props.query, "God");
});
