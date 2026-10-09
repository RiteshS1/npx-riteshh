import { test } from "node:test";
import assert from "node:assert/strict";
import { Dragon } from "../src/games/dragon.js";
import { Screen } from "../src/engine/screen.js";

const key = (name) => ({ name, ch: "", ctrl: false });

/** Play the whole tale with a dumb bot and bottomless hearts. */
const screen = new Screen(80, 24);
const app = { w: 80, h: 24 };

function playthrough(choice) {
  const g = new Dragon();
  g.state = "play";
  const dt = 1 / 30;
  const seen = new Set();
  for (let f = 0; f < 30 * 600 && g.state === "play"; f++) {
    g.hearts = 99;
    const type = g.stages[g.index].type;
    seen.add(type);
    if (type === "story" && f % 3 === 0) g.key(key("space"));
    if (type === "choice" && f % 3 === 0) {
      if (!g.cur.reply) {
        for (let i = 0; i < choice; i++) g.key(key("down"));
      }
      g.key(key("enter"));
    }
    if (type === "bridge" && f % 3 === 0) g.key(key("right"));
    if (type === "boss") {
      const b = g.cur;
      const mid = b.dx + 13;
      if (b.px < mid - 1) g.key(key("right"));
      else if (b.px > mid + 1) g.key(key("left"));
      else if (b.tired) g.key(key("space"));
    }
    g.update(dt);
    g.render(screen, app); // drawing every frame catches stale-stage crashes
  }
  g.render(screen, app);
  return { g, seen };
}

test("the story can be finished, whichever item you take", () => {
  for (const choice of [0, 1, 2]) {
    const { g, seen } = playthrough(choice);
    assert.equal(g.state, "over");
    assert.equal(g.won, true, `choice ${choice} should reach the end`);
    for (const t of ["story", "choice", "forest", "bridge", "boss"]) assert.ok(seen.has(t), `visited ${t}`);
  }
});

test("the shield is worth a heart; retry restores the checkpoint", () => {
  const g = new Dragon();
  g.state = "play";
  while (g.stages[g.index].type === "story") {
    g.cur.tw.skip();
    g.key(key("space"));
    g.update(1 / 30);
  }
  g.key(key("enter")); // shield is the first option
  assert.equal(g.hearts, 4);
  // Fast-forward into chapter one, then lose.
  while (g.stages[g.index].type !== "forest") {
    if (g.cur.tw) g.cur.tw.skip();
    if (g.cur.reply) g.cur.reply.skip();
    g.key(key("space"));
    g.update(1 / 30);
  }
  g.hearts = 0;
  g.update(1 / 30);
  assert.equal(g.state, "over");
  g.key(key("r"));
  assert.equal(g.state, "play");
  assert.equal(g.stages[g.index].type, "forest");
  assert.equal(g.hearts, 4);
});
