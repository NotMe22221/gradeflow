// Class avatars carry two characters, so classes that share a first letter
// ("English 10", "Environmental Science") still look different where the
// avatar stands alone (the navigation rail), and the initials always fit the
// circle, however small the caller makes it.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ClassAvatar, initialsFitCqi } from "@/components/classroom/class-avatar";
import { classInitial } from "@/lib/ui/class-theme";

describe("classInitial", () => {
  it("tells the demo classes apart", () => {
    assert.equal(classInitial("English 10"), "E1");
    assert.equal(classInitial("Environmental Science"), "ES");
    assert.notEqual(classInitial("English 10"), classInitial("Environmental Science"));
  });

  it("uses the first character of the first two words", () => {
    assert.equal(classInitial("AP Biology"), "AB");
    assert.equal(classInitial("Period 3 · Biology"), "P3");
    assert.equal(classInitial("Pre-Calculus"), "PC");
    assert.equal(classInitial("  modern   world history "), "MW");
  });

  it("skips small words unless they end the name", () => {
    assert.equal(classInitial("History of Art"), "HA");
    assert.equal(classInitial("Intro to Physics"), "IP");
    assert.equal(classInitial("Biology A"), "BA");
    assert.equal(classInitial("Biology B"), "BB");
    assert.equal(classInitial("The Novel"), "TN");
  });

  it("reads Roman numerals as digits", () => {
    assert.equal(classInitial("Spanish I"), "S1");
    assert.equal(classInitial("Spanish II"), "S2");
    assert.equal(classInitial("Algebra II"), "A2");
  });

  it("takes two letters from a one-word name", () => {
    assert.equal(classInitial("Biology"), "BI");
    assert.equal(classInitial("botany"), "BO");
    assert.equal(classInitial("X"), "X");
  });

  it("ignores apostrophes, accents and symbols", () => {
    assert.equal(classInitial("Women's Studies"), "WS");
    assert.equal(classInitial("Écologie"), "ÉC");
    assert.equal(classInitial("📚 Reading Lab"), "RL");
    assert.equal(classInitial("Straße"), "ST");
  });

  it("keeps one character for wide scripts, and falls back to C", () => {
    assert.equal(classInitial("数学"), "数");
    assert.equal(classInitial("AP 数学"), "A");
    assert.equal(classInitial(""), "C");
    assert.equal(classInitial("   "), "C");
    assert.equal(classInitial("!!!"), "C");
  });

  it("never returns more than two characters", () => {
    for (const name of ["English 10", "ßtraße", "Ijssel Ijssel", "Žižek Seminar", "123 456", "a b c d"]) {
      const initials = classInitial(name);
      assert.ok([...initials].length >= 1 && [...initials].length <= 2, `${name} -> ${initials}`);
    }
  });
});

describe("ClassAvatar", () => {
  it("renders the initials, hidden from assistive tech", () => {
    const html = renderToStaticMarkup(createElement(ClassAvatar, { name: "Environmental Science" }));
    assert.match(html, /^<span aria-hidden="true"/);
    assert.match(html, />ES<\/span>/);
  });

  it("is a size container whose initials shrink to fit, never grow past the caller's size", () => {
    const html = renderToStaticMarkup(createElement(ClassAvatar, { name: "English 10", className: "size-4 text-[0.5625rem]" }));
    assert.match(html, /@container/);
    assert.match(html, /size-4/);
    assert.match(html, /font-size:min\(1em, [\d.]+cqi\)/);
  });

  it("fits two letters in about 72% of the circle", () => {
    // Real Roboto Medium widths (em): E .56, 1 .57, S .61, M .87, W .88, I .28.
    const real: Record<string, number> = { E1: 1.13, ES: 1.17, MW: 1.75, BI: 0.91 };
    for (const [initials, width] of Object.entries(real)) {
      const fontPerWidth = initialsFitCqi(initials) / 100;
      assert.ok(fontPerWidth * width <= 0.72, `${initials} takes ${(fontPerWidth * width).toFixed(2)} of the circle`);
    }
    // A single letter never shrinks below the caller's size in any avatar used in the app (font is 40-56% of the circle).
    assert.ok(initialsFitCqi("E") / 100 >= 0.57);
  });
});
