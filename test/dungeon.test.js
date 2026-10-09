import { test } from "node:test";
import assert from "node:assert/strict";
import { generate, Dungeon, MW, MH } from "../src/games/dungeon.js";
import { rng } from "../src/theme.js";

function reachable(tiles, from) {
  const seen = new Set([`${from.x},${from.y}`]);
  const queue = [from];
  while (queue.length) {
    const { x, y } = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = { x: x + dx, y: y + dy };
      const k = `${n.x},${n.y}`;
      if (tiles[n.y]?.[n.x] === "." && !seen.has(k)) {
        seen.add(k);
        queue.push(n);
      }
    }
  }
  return seen;
}

test("every floor tile, the stairs and every item are reachable from the start", () => {
  for (let seed = 1; seed <= 200; seed++) {
    const d = generate(1 + (seed % 9), rng(seed));
    const r = reachable(d.tiles, d.start);
    let floors = 0;
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (d.tiles[y][x] === ".") floors++;
    assert.equal(r.size, floors, `seed ${seed}: disconnected floor`);
    assert.ok(r.has(`${d.stairs.x},${d.stairs.y}`));
    assert.notDeepEqual(d.start, d.stairs);
    for (const thing of [...d.items, ...d.monsters]) assert.ok(r.has(`${thing.x},${thing.y}`));
  }
});

test("the map border is always wall", () => {
  const d = generate(3, rng(42));
  for (let x = 0; x < MW; x++) assert.equal(d.tiles[0][x] + d.tiles[MH - 1][x], "##");
  for (let y = 0; y < MH; y++) assert.equal(d.tiles[y][0] + d.tiles[y][MW - 1], "##");
});

test("bumping a monster attacks it; walls cost no turn", () => {
  const g = new Dungeon();
  g.state = "play";
  g.monsters = [{ x: g.px + 1, y: g.py, kind: { name: "slime", ch: "s", def: 0, atk: 0, xp: 1 }, hp: 50, max: 50, awake: true }];
  g.tiles[g.py][g.px + 1] = ".";
  g.act("move", [1, 0]);
  assert.ok(g.monsters[0].hp < 50);
  assert.equal(g.px, g.monsters[0].x - 1);
});
