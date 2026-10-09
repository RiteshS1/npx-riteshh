// Dungeon Raid: a small turn-based roguelike.
//
// Each floor is rooms joined by L-shaped corridors (consecutive rooms by x,
// plus one extra link for a loop), so every room is reachable. You see what
// lies within a radius and an unobstructed line; what you've seen stays on
// the map, dimmed. Monsters wake when they see you and walk greedily
// toward you; bump into things to fight them. Find the stairs, go deeper.

import { C, rng, pick } from "../theme.js";
import { BOLD } from "../engine/screen.js";
import { dirOf } from "../engine/input.js";
import { Game } from "./base.js";

export const MW = 54;
export const MH = 16;
const FW = 76; // whole field: map + panel
const FH = 20; // map + log
const RADIUS = 7;

const MONSTERS = [
  { ch: "s", name: "slime", fg: C.moss, hp: 4, atk: 2, def: 0, xp: 2, from: 1 },
  { ch: "b", name: "bat", fg: C.dim, hp: 3, atk: 2, def: 0, xp: 2, from: 1, erratic: true },
  { ch: "g", name: "goblin", fg: C.amber, hp: 7, atk: 3, def: 1, xp: 4, from: 2 },
  { ch: "k", name: "skeleton", fg: C.paper, hp: 10, atk: 4, def: 2, xp: 6, from: 3 },
  { ch: "O", name: "ogre", fg: C.thread, hp: 18, atk: 6, def: 2, xp: 12, from: 5 },
  { ch: "W", name: "wraith", fg: C.sky, hp: 14, atk: 7, def: 3, xp: 14, from: 7 },
];

const ITEMS = {
  potion: { ch: "!", fg: C.sakura },
  gold: { ch: "$", fg: C.amber },
  blade: { ch: ")", fg: C.paper },
  armor: { ch: "[", fg: C.sky },
};

const DEEPER = [
  "deeper. the air smells like regret.",
  "deeper. somebody left a torch on. rude.",
  "deeper. you hear a goblin practising guitar.",
  "deeper. the walls are judging you.",
  "deeper. still no wifi.",
];

const STEPS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

/* ── generation ─────────────────────────────────────────────────────────── */

export function generate(depth, rnd = Math.random) {
  const tiles = Array.from({ length: MH }, () => Array(MW).fill("#"));
  const rooms = [];
  for (let tries = 0; tries < 300 && rooms.length < 9; tries++) {
    const w = 4 + Math.floor(rnd() * 8);
    const h = 3 + Math.floor(rnd() * 3);
    const x = 1 + Math.floor(rnd() * (MW - w - 2));
    const y = 1 + Math.floor(rnd() * (MH - h - 2));
    if (rooms.some((r) => x <= r.x + r.w + 1 && x + w + 1 >= r.x && y <= r.y + r.h + 1 && y + h + 1 >= r.y)) continue;
    rooms.push({ x, y, w, h });
  }
  if (rooms.length < 4) return generate(depth, rnd); // rare: too cramped, roll again
  for (const r of rooms) for (let j = 0; j < r.h; j++) for (let i = 0; i < r.w; i++) tiles[r.y + j][r.x + i] = ".";

  const center = (r) => ({ x: r.x + Math.floor(r.w / 2), y: r.y + Math.floor(r.h / 2) });
  const carve = (a, b) => {
    const horizFirst = rnd() < 0.5;
    let { x, y } = a;
    const stepX = () => {
      while (x !== b.x) {
        x += Math.sign(b.x - x);
        tiles[y][x] = ".";
      }
    };
    const stepY = () => {
      while (y !== b.y) {
        y += Math.sign(b.y - y);
        tiles[y][x] = ".";
      }
    };
    if (horizFirst) {
      stepX();
      stepY();
    } else {
      stepY();
      stepX();
    }
  };
  rooms.sort((a, b) => a.x - b.x);
  for (let i = 1; i < rooms.length; i++) carve(center(rooms[i - 1]), center(rooms[i]));
  if (rooms.length > 3) carve(center(rooms[0]), center(rooms[2 + Math.floor(rnd() * (rooms.length - 2))]));

  // Start on one side, stairs in the room furthest from it.
  const startRoom = rnd() < 0.5 ? rooms[0] : rooms[rooms.length - 1];
  const start = center(startRoom);
  const stairsRoom = rooms.reduce((best, r) => {
    const d = (c) => Math.abs(center(c).x - start.x) + Math.abs(center(c).y - start.y);
    return d(r) > d(best) ? r : best;
  }, rooms[0]);
  const stairs = center(stairsRoom);

  const taken = new Set([`${start.x},${start.y}`, `${stairs.x},${stairs.y}`]);
  const spot = (r) => {
    for (let i = 0; i < 20; i++) {
      const p = { x: r.x + Math.floor(rnd() * r.w), y: r.y + Math.floor(rnd() * r.h) };
      if (!taken.has(`${p.x},${p.y}`)) {
        taken.add(`${p.x},${p.y}`);
        return p;
      }
    }
    return null;
  };

  const pool = MONSTERS.filter((m) => m.from <= depth);
  const scale = 1 + (depth - 1) * 0.12;
  const monsters = [];
  for (const r of rooms) {
    if (r === startRoom) continue;
    const n = Math.floor(rnd() * Math.min(4, 1 + Math.ceil(depth / 2))) + (rnd() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const p = spot(r);
      if (!p) continue;
      // Tougher monsters are rarer: weight towards the end of the pool less.
      const kind = pool[Math.floor(Math.pow(rnd(), 1.4) * pool.length)];
      const hp = Math.round(kind.hp * scale);
      monsters.push({ ...p, kind, hp, max: hp, awake: false });
    }
  }

  const items = [];
  const drop = (type, n) => {
    for (let i = 0; i < n; i++) {
      const p = spot(pick(rooms, rnd));
      if (p) items.push({ ...p, type, amount: type === "gold" ? 3 + Math.floor(rnd() * (6 + depth * 3)) : 1 });
    }
  };
  drop("gold", 3 + Math.floor(rnd() * 3));
  drop("potion", 1 + (rnd() < 0.5 ? 1 : 0));
  if (rnd() < 0.35) drop("blade", 1);
  if (rnd() < 0.3) drop("armor", 1);

  return { tiles, rooms, start, stairs, monsters, items };
}

/** Is there a clear line from a to b? (Bresenham, walls block, endpoints excluded.) */
export function lineOfSight(tiles, x0, y0, x1, y1) {
  let dx = Math.abs(x1 - x0);
  let dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  while (!(x === x1 && y === y1)) {
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
    if (x === x1 && y === y1) return true;
    if (tiles[y][x] === "#") return false;
  }
  return true;
}

/* ── the game ───────────────────────────────────────────────────────────── */

export class Dungeon extends Game {
  get title() {
    return "dungeon raid";
  }

  reset() {
    this.fieldW = FW;
    this.fieldH = FH;
    this.rnd = rng(Date.now());
    this.p = { hp: 20, max: 20, atk: 4, def: 1, lvl: 1, xp: 0, next: 10, potions: 1, gold: 0, kills: 0 };
    this.depth = 0;
    this.log = [];
    this.hurtT = 0;
    this.dying = 0;
    this.killer = null;
    this.descend();
    this.say("you enter the dungeon. (the princess is elsewhere.)", C.sakura);
  }

  get score() {
    return this.p.gold + this.depth * 100 + this.p.kills * 10;
  }

  get hud() {
    return [["depth ", C.dim], [String(this.depth), C.paper, BOLD], ["   score ", C.dim], [String(this.score), C.amber, BOLD]];
  }

  readyLines() {
    return [
      ["one hero. many stairs. questionable lighting.", C.dim],
      "arrows / wasd / hjkl move · bump to attack",
      "e drink potion · space wait",
      ["space start", C.sakura],
    ];
  }

  overLines() {
    return [
      [`slain by a ${this.killer || "mystery"} on depth ${this.depth}`, C.paper],
      [`score ${this.score}  ·  gold ${this.p.gold}  ·  kills ${this.p.kills}  ·  lvl ${this.p.lvl}`, C.dim],
    ];
  }

  say(text, fg = C.text) {
    this.log.push({ text, fg });
    if (this.log.length > 30) this.log.shift();
  }

  descend() {
    this.depth++;
    Object.assign(this, generate(this.depth, this.rnd));
    this.px = this.start.x;
    this.py = this.start.y;
    this.seen = Array.from({ length: MH }, () => Array(MW).fill(false));
    this.computeFov();
    if (this.depth > 1) this.say(pick(DEEPER, this.rnd), C.dim);
  }

  computeFov() {
    this.vis = new Set();
    for (let y = Math.max(0, this.py - RADIUS); y <= Math.min(MH - 1, this.py + RADIUS); y++) {
      for (let x = Math.max(0, this.px - RADIUS * 2); x <= Math.min(MW - 1, this.px + RADIUS * 2); x++) {
        // Cells are tall, so the visible area is an ellipse twice as wide.
        if (((x - this.px) / 2) ** 2 + (y - this.py) ** 2 > RADIUS * RADIUS) continue;
        if (lineOfSight(this.tiles, this.px, this.py, x, y)) {
          this.vis.add(`${x},${y}`);
          this.seen[y][x] = true;
        }
      }
    }
  }

  visible(x, y) {
    return this.vis.has(`${x},${y}`);
  }

  monsterAt(x, y) {
    return this.monsters.find((m) => m.x === x && m.y === y);
  }

  onKey(k) {
    if (this.dying > 0) return;
    const d = dirOf(k);
    if (d) this.act("move", STEPS[d]);
    else if (k.name === "e") this.act("drink");
    else if (k.name === "space" || k.name === ".") this.act("wait");
  }

  act(kind, step) {
    const p = this.p;
    if (kind === "drink") {
      if (!p.potions) return this.say("no potions. just vibes.", C.dim);
      if (p.hp === p.max) return this.say("you're already fine. save it.", C.dim);
      p.potions--;
      const heal = Math.min(p.max - p.hp, 8 + this.depth);
      p.hp += heal;
      this.say(`you drink a potion. tastes like strawberries. +${heal} hp`, C.sakura);
    } else if (kind === "move") {
      const [dx, dy] = step;
      const nx = this.px + dx;
      const ny = this.py + dy;
      const m = this.monsterAt(nx, ny);
      if (m) this.attack(m);
      else if (this.tiles[ny]?.[nx] === ".") {
        this.px = nx;
        this.py = ny;
        this.pickup();
        if (nx === this.stairs.x && ny === this.stairs.y) {
          this.descend();
          return;
        }
      } else return; // walked into a wall: no turn spent
    }
    this.computeFov();
    this.monstersAct();
  }

  pickup() {
    const i = this.items.findIndex((it) => it.x === this.px && it.y === this.py);
    if (i < 0) return;
    const it = this.items.splice(i, 1)[0];
    const p = this.p;
    if (it.type === "gold") {
      p.gold += it.amount;
      this.say(`+${it.amount} gold.`, C.amber);
    } else if (it.type === "potion") {
      p.potions++;
      this.say("a potion! pink, fizzy, probably fine.", C.sakura);
    } else if (it.type === "blade") {
      p.atk += 1;
      this.say("a sharper blade. atk +1", C.paper);
    } else if (it.type === "armor") {
      p.def += 1;
      this.say("some armour. def +1", C.sky);
    }
  }

  roll(atk, def) {
    const crit = this.rnd() < 0.1;
    const base = Math.max(1, atk - def + Math.floor(this.rnd() * 3) - 1);
    return { dmg: crit ? base * 2 : base, crit };
  }

  attack(m) {
    const { dmg, crit } = this.roll(this.p.atk, m.kind.def);
    m.hp -= dmg;
    m.awake = true;
    m.hitT = 0.25;
    if (m.hp <= 0) {
      this.monsters = this.monsters.filter((x) => x !== m);
      this.p.kills++;
      this.say(`${crit ? "crit! " : ""}the ${m.kind.name} is no more.`, C.paper);
      this.gainXp(m.kind.xp);
      if (this.rnd() < 0.25) this.items.push({ x: m.x, y: m.y, type: "gold", amount: 2 + Math.floor(this.rnd() * 5 * this.depth) });
    } else this.say(`${crit ? "crit! " : ""}you hit the ${m.kind.name} for ${dmg}.`, C.text);
  }

  gainXp(n) {
    const p = this.p;
    p.xp += n;
    while (p.xp >= p.next) {
      p.xp -= p.next;
      p.next = Math.floor(p.next * 1.6);
      p.lvl++;
      p.max += 5;
      p.hp = Math.min(p.max, p.hp + 8);
      p.atk++;
      if (p.lvl % 2) p.def++;
      this.say(`level ${p.lvl}! you feel slightly more heroic.`, C.amber);
    }
  }

  monstersAct() {
    const p = this.p;
    for (const m of this.monsters) {
      if (this.visible(m.x, m.y)) m.awake = true;
      if (!m.awake) continue;
      const dist = Math.abs(m.x - this.px) + Math.abs(m.y - this.py);
      if (dist === 1 && !(m.kind.erratic && this.rnd() < 0.3)) {
        const { dmg, crit } = this.roll(m.kind.atk, p.def);
        p.hp -= dmg;
        this.hurtT = 0.3;
        this.say(`${crit ? "ouch, crit. " : ""}the ${m.kind.name} hits you for ${dmg}.`, C.threadHi);
        if (p.hp <= 0) {
          p.hp = 0;
          this.killer = m.kind.name;
          this.dying = 1.2;
          this.say("you collapse. the dungeon wins this round.", C.thread);
          return;
        }
        continue;
      }
      // Step toward the player (or wander, for bats).
      const options = Object.values(STEPS)
        .map(([dx, dy]) => ({ x: m.x + dx, y: m.y + dy }))
        .filter((c) => this.tiles[c.y]?.[c.x] === "." && !this.monsterAt(c.x, c.y) && !(c.x === this.px && c.y === this.py));
      if (!options.length) continue;
      let next;
      if (m.kind.erratic && this.rnd() < 0.5) next = pick(options, this.rnd);
      else {
        options.sort((a, b) => Math.abs(a.x - this.px) + Math.abs(a.y - this.py) - (Math.abs(b.x - this.px) + Math.abs(b.y - this.py)));
        const best = options[0];
        if (Math.abs(best.x - this.px) + Math.abs(best.y - this.py) < dist) next = best;
      }
      if (next) [m.x, m.y] = [next.x, next.y];
    }
  }

  step(dt) {
    this.hurtT = Math.max(0, this.hurtT - dt);
    for (const m of this.monsters) if (m.hitT) m.hitT = Math.max(0, m.hitT - dt);
    if (this.dying > 0 && (this.dying -= dt) <= 0) this.end();
  }

  /* ── drawing ──────────────────────────────────────────────────────────── */

  draw(scr, ox, oy) {
    const put = (x, y, s, fg, a) => this.put(scr, ox, oy, x, y, s, fg, a);

    for (let y = 0; y < MH; y++) {
      for (let x = 0; x < MW; x++) {
        const t = this.tiles[y][x];
        if (this.visible(x, y)) {
          // Floor fades with distance from the player, like torchlight.
          const d = Math.sqrt(((x - this.px) / 2) ** 2 + (y - this.py) ** 2) / RADIUS;
          if (t === "#") put(x, y, "#", d < 0.6 ? "#7A746F" : "#5E5955");
          else put(x, y, ".", d < 0.5 ? "#6A6460" : "#4A4643");
        } else if (this.seen[y][x]) put(x, y, t === "#" ? "#" : " ", "#332F2D");
      }
    }

    for (const it of this.items) {
      if (this.visible(it.x, it.y)) put(it.x, it.y, ITEMS[it.type].ch, ITEMS[it.type].fg, BOLD);
    }
    const st = this.stairs;
    if (this.visible(st.x, st.y) || this.seen[st.y][st.x]) put(st.x, st.y, ">", this.visible(st.x, st.y) ? C.thread : C.blossomDeep, BOLD);
    for (const m of this.monsters) {
      if (!this.visible(m.x, m.y)) continue;
      put(m.x, m.y, m.kind.ch, m.hitT > 0 ? C.paper : m.kind.fg, BOLD);
    }
    const dead = this.dying > 0;
    put(this.px, this.py, "@", dead ? C.faint : this.hurtT > 0 ? C.threadHi : C.paper, BOLD);

    this.drawPanel(scr, ox + MW + 2, oy);
    this.drawLog(scr, ox, oy + MH + 1);
    for (let y = 0; y < FH; y++) scr.set(ox + MW, oy + y, "│", C.faint);
    for (let x = 0; x < MW; x++) scr.set(ox + x, oy + MH, "─", C.faint);
    scr.set(ox + MW, oy + MH, "┤", C.faint);
  }

  drawPanel(scr, x, y) {
    const p = this.p;
    const bar = (v, max, w, fg) => {
      const f = Math.round((v / max) * w);
      for (let i = 0; i < w; i++) scr.set(x + 4 + i, y, i < f ? "█" : "░", i < f ? fg : C.faint);
    };
    scr.text(x, y, "hp", C.dim);
    bar(p.hp, p.max, 12, p.hp / p.max < 0.3 ? C.threadHi : C.thread);
    y++;
    scr.text(x + 4, y, `${p.hp}/${p.max}`, C.paper);
    y += 2;
    const stat = (k, v, fg = C.paper) => {
      scr.text(x, y, k, C.dim);
      scr.text(x + 8, y++, String(v), fg);
    };
    stat("level", p.lvl);
    stat("xp", `${p.xp}/${p.next}`);
    stat("atk", p.atk);
    stat("def", p.def);
    stat("gold", p.gold, C.amber);
    stat("potions", p.potions, C.sakura);
    y++;

    // Who's around.
    const near = this.monsters.filter((m) => this.visible(m.x, m.y)).slice(0, 4);
    if (near.length) {
      scr.text(x, y++, "nearby", C.dim);
      for (const m of near) {
        scr.set(x, y, m.kind.ch, m.kind.fg, undefined, BOLD);
        scr.text(x + 2, y, m.kind.name, C.text);
        const f = Math.max(1, Math.round((m.hp / m.max) * 5));
        for (let i = 0; i < 5; i++) scr.set(x + 12 + i, y, i < f ? "▪" : "·", i < f ? m.kind.fg : C.faint);
        y++;
      }
    } else scr.text(x, y, "all quiet.", C.faint);
  }

  drawLog(scr, x, y) {
    const lines = this.log.slice(-3);
    lines.forEach((l, i) => {
      const age = lines.length - 1 - i;
      scr.text(x, y + i, l.text.slice(0, MW), age === 0 ? l.fg : age === 1 ? C.dim : C.faint);
    });
    scr.text(x + MW + 2, y + 2, "e potion  q quit", C.faint);
  }
}

/** Arcade preview: a lit room, an @, and something lurking. */
export function preview(scr, x, y, w, h, t) {
  const room = [
    "##########      ######",
    "#........#      #....#",
    "#..$.....########..g.#",
    "#....@...........!...#",
    "#........########....#",
    "#.....s..#      #..>.#",
    "##########      ######",
  ];
  const ox = x + Math.floor((w - room[0].length) / 2);
  const oy = y + Math.floor((h - room.length) / 2);
  const step = Math.floor(t * 2) % 12;
  const pxy = [5 + (step < 6 ? step : 12 - step), 3];
  room.forEach((row, j) => {
    [...row].forEach((c, i) => {
      const fg = { "#": "#6A6460", ".": "#4A4643", $: C.amber, g: C.amber, "!": C.sakura, s: C.moss, ">": C.thread, "@": C.paper }[c];
      if (c === "@") c = ".";
      if (c !== " ") scr.set(ox + i, oy + j, c, c === "." ? "#4A4643" : fg);
    });
  });
  scr.set(ox + pxy[0], oy + pxy[1], "@", C.paper, undefined, BOLD);
}
