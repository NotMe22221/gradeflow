import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = join(import.meta.dirname, "..");

describe("layout editor sticky bar", () => {
  it("adds the Arranging bar's measured height to html scroll-padding-top", () => {
    const css = readFileSync(join(ROOT, "src/app/globals.css"), "utf8");
    const rule = css.match(/^\s*scroll-padding-top:\s*([^;]+);/m);
    assert.ok(rule, "html has a scroll-padding-top");
    assert.match(rule[1] as string, /var\(--app-bar-h\)/);
    assert.match(rule[1] as string, /var\(--edit-bar-h, 0px\)/);
    // The provider publishes the same variable it is read by.
    const provider = readFileSync(join(ROOT, "src/components/layout-editor/editor-context.tsx"), "utf8");
    assert.match(provider, /setProperty\("--edit-bar-h"/);
    assert.match(provider, /removeProperty\("--edit-bar-h"\)/);
  });
});
