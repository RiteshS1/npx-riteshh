// Snakey. Cells are two columns wide so the grid looks square.

import { C } from "../theme.js";
import { mix } from "../engine/color.js";
import { BOLD } from "../engine/screen.js";
import { dirOf } from "../engine/input.js";
import { Game } from "./base.js";

export const COLS = 28;
export const ROWS = 18;
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPP = { up: "down", down: "up", left: "right", right: "left" };

/**
 * Advance the snake one cell. Pure apart from mutating `s`.
 * Returns "dead" | "food" | "gold" | "move".
 */
export function advance(s) {
  if (s.queue.length) s.dir = s.queue.shift();
  const [dx, dy] = DIRS[s.dir];
  let x = s.body[0].x + dx;
  let y = s.body[0].y + dy;
  if (s.wrap) {
    x = (x + s.cols) % s.cols;
    y = (y + s.rows) % s.rows;
  } else if (x < 0 || y < 0 || x >= s.cols || y >= s.rows) return "dead";

  // The tail moves out of the way this tick unless we're growing.
  const body = s.grow > 0 ? s.body : s.body.slice(0, -1);
  if (body.some((c) => c.x === x && c.y === y)) return "dead";

  s.body.unshift({ x, y });
  let ate = "move";
  if (s.food && s.food.x === x && s.food.y === y) {
    s.grow += 2;
    s.food = null;
    ate = "food";
  } else if (s.gold && s.gold.x === x && s.gold.y === y) {
    s.grow += 4;
    s.gold = null;
    ate = "gold";
  }
  if (s.grow > 0 && ate === "move") s.grow--;
  else if (ate === "move") s.body.pop();
  else s.grow--;
  return ate;
}

/** Queue a turn; ignores reversals and repeats, buffers up to 3. */
export function turn(s, dir) {
  const last = s.queue.length ? s.queue[s.queue.length - 1] : s.dir;
  if (dir === last || dir === OPP[last] || s.queue.length >= 3) return;
  s.queue.push(dir);
}

export function freeCell(s, rnd = Math.random) {
  const taken = new Set(s.body.map((c) => `${c.x},${c.y}`));
  if (s.food) taken.add(`${s.food.x},${s.food.y}`);
  if (s.gold) taken.add(`${s.gold.x},${s.gold.y}`);
  for (let i = 0; i < 500; i++) {
    const c = { x: Math.floor(rnd() * s.cols), y: Math.floor(rnd() * s.rows) };
    if (!taken.has(`${c.x},${c.y}`)) return c;
  }
  return null;
}

const QUIPS = [
  [0, "the wall was right there."],
  [50, "a humble snack."],
  [150, "respectable noodle."],
  [300, "that's a long boi."],
  [600, "absolute unit. touch grass?"],
];

export class Snake extends Game {
  constructor() {
    super();
    this.wrap = false;
  }

  get title() {
    return "snakey";
  }

  reset() {
    this.s = {
      cols: COLS,
      rows: ROWS,
      wrap: this.wrap ?? false,
      body: [{ x: 8, y: 9 }, { x: 7, y: 9 }, { x: 6, y: 9 }],
      dir: "right",
      queue: [],
      grow: 0,
      food: null,
      gold: null,
    };
    this.s.food = freeCell(this.s);
    this.fieldW = COLS * 2;
    this.fieldH = ROWS;
    this.score = 0;
    this.speed = 7; // cells per second
    this.acc = 0;
    this.goldIn = 12 + Math.random() * 8;
    this.dying = 0;
    this.pops = []; // little "+10" floaters
  }

  get hud() {
    const segs = [["score ", C.dim], [String(this.score), C.amber, BOLD], ["   length ", C.dim], [String(this.s.body.length), C.paper]];
    if (this.s.gold) segs.push(["   golden ", C.dim], [`${Math.ceil(this.s.gold.life)}s`, C.amber]);
    if (this.wrap) segs.push(["   wrap", C.sky]);
    return segs;
  }

  readyLines() {
    return [
      ["eat. grow. don't bite yourself.", C.dim],
      "arrows / wasd / hjkl steer",
      ["t  walls: " + (this.wrap ? "off, edges wrap" : "on"), C.sky],
      ["space start", C.sakura],
    ];
  }

  overLines() {
    const quip = QUIPS.filter(([min]) => this.score >= min).pop()[1];
    return [`score ${this.score}  ·  length ${this.s.body.length}`, [quip, C.sakura]];
  }

  onReadyKey(k) {
    if (k.name === "t") {
      this.wrap = !this.wrap;
      this.s.wrap = this.wrap;
    }
  }

  onKey(k) {
    const d = dirOf(k);
    if (d) turn(this.s, d);
  }

  step(dt) {
    const s = this.s;
    this.pops = this.pops.filter((p) => (p.t -= dt) > 0);
    if (this.dying > 0) {
      this.dying -= dt;
      if (this.dying <= 0) this.end();
      return;
    }

    // Golden fruit comes and goes.
    if (s.gold) {
      s.gold.life -= dt;
      if (s.gold.life <= 0) s.gold = null;
    } else if ((this.goldIn -= dt) <= 0) {
      const c = freeCell(s);
      if (c) s.gold = { ...c, life: 6 };
      this.goldIn = 15 + Math.random() * 10;
    }

    this.acc += dt;
    const interval = 1 / this.speed;
    while (this.acc >= interval) {
      this.acc -= interval;
      const r = advance(s);
      if (r === "dead") {
        this.dying = 0.9;
        return;
      }
      if (r === "food" || r === "gold") {
        const pts = r === "food" ? 10 : 50;
        this.score += pts;
        this.pops.push({ x: s.body[0].x, y: s.body[0].y, text: `+${pts}`, t: 0.7 });
        this.speed = Math.min(18, this.speed + (r === "food" ? 0.3 : 0.6));
        if (!s.food) s.food = freeCell(s);
      }
    }
  }

  draw(scr, ox, oy) {
    const s = this.s;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if ((x + y) % 2 === 0) scr.set(ox + x * 2, oy + y, "·", "#2E2B29");

    const cell = (c, a, fg) => {
      scr.set(ox + c.x * 2, oy + c.y, a[0], fg);
      scr.set(ox + c.x * 2 + 1, oy + c.y, a[1], fg);
    };
    if (s.food) cell(s.food, "▐▌", C.amber);
    if (s.gold) {
      const blink = s.gold.life < 2 ? Math.floor(this.t * 8) % 2 : Math.floor(this.t * 3) % 2;
      cell(s.gold, "<>", blink ? C.amber : C.paper);
    }

    const n = s.body.length;
    const dead = this.dying > 0 && Math.floor(this.dying * 10) % 2 === 0;
    s.body.forEach((c, i) => {
      const fg = dead ? C.faint : i === 0 ? C.thread : mix(C.sakura, C.blossomDeep, i / Math.max(1, n - 1));
      cell(c, "██", fg);
    });
    // Eyes, looking where we're going.
    if (!dead) {
      const h = s.body[0];
      const eyes = { up: "▘▝", down: "▖▗", left: "▘ ", right: " ▝" }[s.dir];
      for (let i = 0; i < 2; i++) if (eyes[i] !== " ") scr.set(ox + h.x * 2 + i, oy + h.y, eyes[i], C.paper, C.thread);
    }

    for (const p of this.pops) scr.text(ox + p.x * 2, oy + p.y - 1 - Math.round((0.7 - p.t) * 2), p.text, C.amber, BOLD);
  }
}

/** Arcade preview: a snake doing laps. */
export function preview(scr, x, y, w, h, t) {
  const path = [];
  const cw = Math.floor((w - 2) / 2);
  for (let i = 0; i < cw; i++) path.push([i, 0]);
  for (let j = 1; j < h; j++) path.push([cw - 1, j]);
  for (let i = cw - 2; i >= 0; i--) path.push([i, h - 1]);
  for (let j = h - 2; j > 0; j--) path.push([0, j]);
  const head = Math.floor(t * 9) % path.length;
  for (let k = 0; k < 9; k++) {
    const [px, py] = path[(head - k + path.length) % path.length];
    const fg = k === 0 ? C.thread : mix(C.sakura, C.blossomDeep, k / 8);
    scr.text(x + 1 + px * 2, y + py, "██", fg);
  }
  scr.text(x + 1 + Math.floor(cw / 2) * 2, y + Math.floor(h / 2), "▐▌", C.amber);
}
