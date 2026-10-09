import { test } from "node:test";
import assert from "node:assert/strict";
import { advance, turn } from "../src/games/snake.js";

const make = (over = {}) => ({
  cols: 10, rows: 10, wrap: false, dir: "right", queue: [], grow: 0, food: null, gold: null,
  body: [{ x: 2, y: 2 }, { x: 1, y: 2 }, { x: 0, y: 2 }],
  ...over,
});

test("moves and keeps its length", () => {
  const s = make();
  assert.equal(advance(s), "move");
  assert.deepEqual(s.body[0], { x: 3, y: 2 });
  assert.equal(s.body.length, 3);
});

test("eating grows by two over the next ticks", () => {
  const s = make({ food: { x: 3, y: 2 } });
  assert.equal(advance(s), "food");
  advance(s);
  advance(s);
  assert.equal(s.body.length, 5);
});

test("walls kill, wrap mode wraps", () => {
  const s = make({ body: [{ x: 9, y: 2 }, { x: 8, y: 2 }] });
  assert.equal(advance(s), "dead");
  const w = make({ wrap: true, body: [{ x: 9, y: 2 }, { x: 8, y: 2 }] });
  assert.equal(advance(w), "move");
  assert.deepEqual(w.body[0], { x: 0, y: 2 });
});

test("biting yourself is fatal, but chasing your tail is fine", () => {
  const loop = make({ dir: "up", body: [{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 1, y: 3 }, { x: 1, y: 2 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }] });
  assert.equal(advance(loop), "dead");
  const chase = make({ dir: "left", body: [{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 1, y: 3 }, { x: 1, y: 2 }] });
  assert.equal(advance(chase), "move");
});

test("no instant reversals; turns buffer", () => {
  const s = make();
  turn(s, "left");
  assert.deepEqual(s.queue, []);
  turn(s, "up");
  turn(s, "left");
  assert.deepEqual(s.queue, ["up", "left"]);
});
