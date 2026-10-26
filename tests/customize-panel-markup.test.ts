import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

// Guards for the Customize panel's markup that a browser check found and that
// are easy to undo by accident: large text at 320px, the selected state
// beyond the tint, and focus in Windows Contrast themes (forced colors).

const SOURCE = readFileSync(join(import.meta.dirname, "..", "src/components/customize/customize-dialog.tsx"), "utf8");

describe("Customize panel markup", () => {
  it("lets the footer wrap instead of overlapping, and never squeezes it", () => {
    const footer = SOURCE.match(/className="([^"]*border-t border-border[^"]*)"/);
    assert.ok(footer, "the footer row is found");
    for (const token of ["flex-wrap", "shrink-0"]) assert.ok(footer[1].split(" ").includes(token), `footer has ${token}`);
    assert.match(SOURCE, /<Button type="button" className="ml-auto">\s*Done\s*<\/Button>/);
  });

  it("divides the header from the scrolling settings", () => {
    assert.match(SOURCE, /<SheetHeader className="[^"]*\bshrink-0\b[^"]*\bborder-b border-border\b/);
  });

  it("stacks the Theme segments when the pill is too narrow for icon and label", () => {
    assert.match(SOURCE, /"@container mt-3"/);
    assert.match(SOURCE, /@max-\[16rem\]:flex-col/);
  });

  it("marks the selected Theme and Text size with a check, not only a tint", () => {
    assert.match(SOURCE, /\{checked \? <Check className="size-\[1\.125rem\]" \/> : <Icon className="size-\[1\.125rem\]" \/>\}/);
    assert.match(SOURCE, /\{checked \? <Check aria-hidden className="absolute top-1\.5 right-1\.5 size-4" \/> : null\}/);
  });

  it("draws focus with a system-colored outline in forced colors", () => {
    // Choices: an inset Highlight outline on the label whose radio has focus.
    assert.match(SOURCE, /forced-colors:has-\[:focus-visible\]:outline-solid/);
    assert.match(SOURCE, /forced-colors:has-\[:focus-visible\]:outline-\[color:Highlight\]/);
    // Buttons anywhere in the sheet.
    assert.match(SOURCE, /forced-colors:\*\*:focus-visible:outline-solid/);
    assert.match(SOURCE, /className=\{cn\("gap-0 p-0", forcedFocus,/);
  });
});
