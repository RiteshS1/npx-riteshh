import { test } from "node:test";
import assert from "node:assert/strict";
import { makeWave, Galaga, W, H } from "../src/games/galaga.js";

test("a wave has 40 enemies in unique, on-screen slots", () => {
  const wave = makeWave(1);
  assert.equal(wave.length, 40);
  const slots = new Set(wave.map((e) => `${e.sx},${e.sy}`));
  assert.equal(slots.size, 40);
  for (const e of wave) {
    assert.ok(e.sx - 1 >= 0 && e.sx + 1 < W, `slot x ${e.sx} on screen`);
    assert.ok(e.sy >= 0 && e.sy < H / 2);
  }
});

test("later waves enter faster", () => {
  const last = (n) => Math.max(...makeWave(n).map((e) => e.delay));
  assert.ok(last(5) < last(1));
});

test("everyone reaches the formation, and a bullet scores", () => {
  const g = new Galaga();
  g.state = "play";
  g.diveIn = Infinity; // no dives for this test
  g.shots = [];
  const realShoot = g.shoot;
  g.shoot = () => {};
  for (let i = 0; i < 30 * 12; i++) g.step(1 / 30);
  assert.ok(g.enemies.every((e) => e.state === "form"));
  const target = g.enemies.find((e) => e.type === "bee");
  g.px = g.target = target.x;
  g.cool = 0;
  g.fire();
  for (let i = 0; i < 30; i++) g.step(1 / 30);
  assert.ok(g.score > 0);
  g.shoot = realShoot;
});
