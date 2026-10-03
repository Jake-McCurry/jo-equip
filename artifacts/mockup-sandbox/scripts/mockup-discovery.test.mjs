import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { mockupPreviewPlugin } from "../mockupPreviewPlugin.ts";

test("preview discovery includes nested TSX but excludes helpers and other files", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "mockup-discovery-"));
  try {
    const files = [
      "Card.tsx", "nested/Panel.tsx", "_Helper.tsx",
      "_private/Hidden.tsx", "nested/_private/Hidden.tsx",
      "nested/_Helper.tsx", "notes.ts", ".hidden/Hidden.tsx",
    ];
    for (const file of files) {
      const target = path.join(root, "src/components/mockups", file);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, "export default function Component() { return null; }");
    }
    const plugin = mockupPreviewPlugin();
    plugin.configResolved({ root });
    await plugin.buildStart();
    const generated = await readFile(path.join(root, "src/.generated/mockup-components.ts"), "utf8");
    assert.ok(generated.includes('"./components/mockups/Card.tsx"'));
    assert.ok(generated.includes('"./components/mockups/nested/Panel.tsx"'));
    assert.ok(generated.includes('"../components/mockups/Card.tsx"'));
    for (const excluded of ["_Helper", "_private", "notes.ts", ".hidden"]) {
      assert.ok(!generated.includes(excluded), `must exclude ${excluded}`);
    }
    assert.equal((generated.match(/import\(/g) ?? []).length, 2);
    await plugin.buildStart();
    assert.equal(await readFile(path.join(root, "src/.generated/mockup-components.ts"), "utf8"), generated);
    await rm(path.join(root, "src/components/mockups/nested/Panel.tsx"));
    await plugin.buildStart();
    assert.ok(!(await readFile(path.join(root, "src/.generated/mockup-components.ts"), "utf8")).includes("Panel.tsx"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});