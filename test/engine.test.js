import { test } from "node:test";
import assert from "node:assert/strict";
import { Screen } from "../src/engine/screen.js";
import { parseKeys, dirOf } from "../src/engine/input.js";
import { sgrColor, mix } from "../src/engine/color.js";
import { wrap } from "../src/theme.js";

test("screen: first flush paints, unchanged frame writes nothing", () => {
  const s = new Screen(10, 3);
  s.text(0, 0, "hi", "#ffffff");
  const first = s.flush(3);
  assert.match(first, /hi/);
  assert.equal(s.flush(3), "");
});

test("screen: diff only rewrites changed cells", () => {
  const s = new Screen(10, 3);
  s.text(0, 1, "hello");
  s.flush(1);
  s.clear();
  s.text(0, 1, "hellO");
  const out = s.flush(1);
  assert.match(out, /\x1b\[2;5H/); // jumps straight to row 2, col 5
  assert.ok(out.includes("O") && !out.includes("hell"));
});

test("screen: writes are clipped to the buffer", () => {
  const s = new Screen(4, 2);
  s.text(2, 0, "abcdef");
  s.set(-1, 5, "x");
  assert.equal(s.toText(), "  ab\n");
});

test("input: arrows, enter, ctrl-c, letters, bare escape", () => {
  const names = (d) => parseKeys(d).map((k) => (k.ctrl ? `^${k.name}` : k.name));
  assert.deepEqual(names("\x1b[A\x1b[B\x1bOC\x1b[D"), ["up", "down", "right", "left"]);
  assert.deepEqual(names("\r \x03Q"), ["enter", "space", "^c", "q"]);
  assert.deepEqual(names("\x1b"), ["escape"]);
  assert.deepEqual(names("\x1b[1;2A"), ["up"]);
  assert.equal(dirOf({ name: "a" }), "left");
  assert.equal(dirOf({ name: "x" }), null);
});

test("color: degrades by level", () => {
  assert.equal(sgrColor("#C8102E", 3), "38;2;200;16;46");
  assert.match(sgrColor("#C8102E", 2), /^38;5;\d+$/);
  assert.match(sgrColor("#C8102E", 1, true), /^(4|10)\d$/);
  assert.equal(mix("#000000", "#ffffff", 0.5), "#808080");
});

test("wrap: respects width", () => {
  for (const l of wrap("the quick brown fox jumps over the lazy dog", 10)) assert.ok(l.length <= 10);
});
