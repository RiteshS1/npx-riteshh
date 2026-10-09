// Rescue the Princess: a tiny story game in three chapters.
//
// The run is a list of stages: story beats (typewriter dialogue over a
// little ASCII scene), one choice, and three action chapters:
//   1. the woods:  goblins fire arrows from the edges; trees block them
//   2. the bridge: planks crack and fall away, rocks drop from the sky
//   3. the lair:   the dragon cycles fire attacks, then pants; that's when
//                  your spear lands
// Losing every heart ends the run, but r retries the current chapter.

import { C, clamp, pick, wrap } from "../theme.js";
import { BOLD, ITALIC } from "../engine/screen.js";
import { dirOf } from "../engine/input.js";
import { Typewriter } from "../fx/text.js";
import { Game } from "./base.js";

const W = 60;
const H = 20;

const WHO = {
  "": { name: "", fg: C.dim },
  king: { name: "the king", fg: C.amber },
  you: { name: "you", fg: C.paper },
  dragon: { name: "the dragon", fg: C.thread },
  princess: { name: "the princess", fg: C.sakura },
};

/* ── the script ─────────────────────────────────────────────────────────── */

function script(flags) {
  return [
    { type: "story", art: "castle", lines: [
      ["", "once upon a time, in a kingdom with surprisingly good wifi…"],
      ["", "a dragon took the princess. nobody knows why. the dragon isn't talking."],
      ["king", "brave stranger! rescue my daughter and you shall have… a heartfelt thank-you."],
      ["you", "…and equity?"],
      ["king", "a heartfelt thank-you."],
    ] },
    { type: "choice", art: "castle", prompt: "the royal armoury has three things left. take one.", options: [
      { label: "a shield", flag: "shield", reply: "sturdy. sensible. +1 heart." },
      { label: "a lute", flag: "lute", reply: "rumour says the dragon has a soft spot for jazz." },
      { label: "a sandwich", flag: "sandwich", reply: "it's a really good sandwich." },
    ] },
    { type: "story", art: "forest", chapter: 1, lines: [
      ["", "chapter one: the whispering woods."],
      ["", "goblins in the trees, arrows in the air. the trees stop arrows. you don't."],
      ["", "survive the woods. move with arrows / wasd."],
    ] },
    { type: "forest" },
    { type: "story", art: "bridge", chapter: 2, lines: [
      ["", "chapter two: the crumbling bridge."],
      ["you", "who builds a bridge out of biscuits?"],
      ["", "cross it before it's crumbs. planks crack under feet that dawdle. also: rocks."],
    ] },
    { type: "bridge" },
    { type: "story", art: "lair", chapter: 3, lines: [
      ["", "chapter three: the lair."],
      ["dragon", "WHO DARES—"],
      ["you", "hi. i'm here for the princess."],
      ["dragon", "you and every other guy with a sword."],
      ...(flags.lute ? [["you", "*plays a smooth jazz riff on the lute*"], ["dragon", "…okay that's actually nice. i'll take longer breaks."]] : []),
      ["dragon", "dodge my fire, little knight. then we'll talk."],
      ["", "dodge. when the dragon pants, press space to throw your spear."],
    ] },
    { type: "boss" },
    { type: "story", art: "tower", lines: [
      ["", "the dragon slumps, wheezing. you sprint up the tower stairs."],
      ["princess", "took you long enough. i escaped on tuesday."],
      ["you", "then… why are you still here?"],
      ["princess", "the dragon and i are building a startup. we need a frontend engineer."],
      ["dragon", "*wheeze* remote-friendly. great dental."],
      ...(flags.sandwich ? [["princess", "is that a sandwich? you're hired."]] : [["you", "…is the pay in gold?"]]),
      ["", "and so the hero took the job. the end. ✿"],
    ] },
    { type: "end" },
  ];
}

/* ── ascii scenes for story beats ───────────────────────────────────────── */

const ART = {
  castle: [
    "             >              ",
    "             |              ",
    "        _   _|_   _         ",
    "       | |_|   |_| |        ",
    "       |    | |    |        ",
    "       |  _ | | _  |        ",
    "    ___|_|_||_||_|_|___     ",
  ],
  forest: [
    "   ^     ^^    ^      ^    ^^    ^   ",
    "  ^^^   ^^^^  ^^^    ^^^  ^^^^  ^^^  ",
    " ^^^^^ ^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^",
    "   |     ||    |      |    ||    |   ",
    "___|_____||____|______|____||____|___",
  ],
  bridge: [
    " /|                               |\\ ",
    "/ |===============================| \\",
    "  | ||  ||  ||  ||  ||  ||  ||  || |  ",
    "  .  .     .    .   .     .   .   .  ",
  ],
  lair: null, // the dragon sprite itself
  tower: [
    "         /\\          ",
    "        /  \\         ",
    "       /____\\        ",
    "       |[^^]|  <o>   ",
    "       |    |        ",
    "       |    |        ",
    "    ___|____|___     ",
  ],
};

const DRAGON = [
  [" _/\\_                 _/\\_ ", " \\  \\_               _/  / "],
  [" \\   \\____/\\_/\\____/   / ", "  \\   \\___/\\_/\\___/   /  "],
  ["  \\_      ( @ @ )     _/  ", "   \\_     ( @ @ )    _/   "],
  ["    \\___ /  \\v/  \\ ___/   ", "    \\___ /  \\v/  \\ ___/   "],
  ["        \\/ /VVV\\ \\/       ", "        \\/ /VVV\\ \\/       "],
];
const DRAGON_W = DRAGON[0][0].length;

function drawSprite(put, rows, x, y, fg, frame = 0, extra = {}) {
  rows.forEach((r, j) => {
    let line = Array.isArray(r) ? r[frame % r.length] : r;
    if (extra.sleepy && line.includes("@ @")) line = line.replace("@ @", "- -");
    if (extra.hurt && line.includes("@ @")) line = line.replace("@ @", "x x");
    [...line].forEach((c, i) => {
      if (c !== " ") put(x + i, y + j, c, c === "@" ? C.amber : c === "V" ? C.paper : fg);
    });
  });
}

function drawArt(put, name, t) {
  if (name === "lair") {
    const x = Math.floor((W - DRAGON_W) / 2);
    drawSprite(put, DRAGON, x, 2, C.thread, Math.floor(t * 2));
    put(x + 3, 8, "$$$  $ $$$$  $$", C.amber);
    return;
  }
  const rows = ART[name];
  const x = Math.floor((W - rows[0].length) / 2);
  rows.forEach((r, j) => {
    [...r].forEach((c, i) => {
      if (c === " ") return;
      let fg = C.text;
      if (name === "forest") fg = c === "^" ? C.moss : C.bark;
      if (name === "bridge") fg = c === "=" ? C.amber : c === "." ? C.faint : C.bark;
      if (name === "castle") fg = c === ">" ? C.thread : C.dim;
      if (name === "tower") fg = c === "^" ? C.sakura : c === "o" || c === "<" || c === ">" ? C.thread : C.dim;
      put(x + i, 2 + j, c, fg);
    });
  });
  if (name === "castle") {
    // A dragon-shaped speck crosses the sky, with the princess.
    const dx = ((t * 6) % (W + 20)) - 10;
    put(dx, 1, "~v^v~", C.thread);
    put(dx + 2, 2, "*", C.sakura);
    if (Math.floor(t * 3) % 2) put(x + 14, 2, ">>", C.thread);
  }
  if (name === "forest" && Math.floor(t * 1.5) % 3 === 0) put(x + 9, 3, "..", C.amber);
}

/* ── stages ─────────────────────────────────────────────────────────────── */

class Story {
  constructor(def, game) {
    this.def = def;
    this.game = game;
    this.i = 0;
    this.tw = new Typewriter(def.lines[0][1], 45);
    this.t = 0;
  }
  key(k) {
    if (k.name !== "space" && k.name !== "enter") return;
    if (!this.tw.done) return this.tw.skip();
    // Stay on the last line once done: the end screen still draws this stage.
    if (this.i + 1 >= this.def.lines.length) this.done = true;
    else this.tw = new Typewriter(this.def.lines[++this.i][1], 45);
  }
  update(dt) {
    this.t += dt;
    this.tw.update(dt);
  }
  draw(put) {
    drawArt(put, this.def.art, this.t);
    const [who] = this.def.lines[this.i];
    dialog(put, WHO[who], this.tw, this.tw.done && Math.floor(this.t * 2) % 2 === 0);
  }
}

class Choice {
  constructor(def, game) {
    this.def = def;
    this.game = game;
    this.sel = 0;
    this.t = 0;
    this.reply = null;
  }
  key(k) {
    const d = dirOf(k);
    if (this.reply) {
      if (k.name === "space" || k.name === "enter") {
        if (!this.reply.done) this.reply.skip();
        else this.done = true;
      }
      return;
    }
    if (d === "up") this.sel = (this.sel + 2) % 3;
    if (d === "down") this.sel = (this.sel + 1) % 3;
    if (k.name === "space" || k.name === "enter") {
      const o = this.def.options[this.sel];
      this.game.flags[o.flag] = true;
      if (o.flag === "shield") this.game.hearts++;
      this.game.rebuild();
      this.reply = new Typewriter(o.reply, 45);
    }
  }
  update(dt) {
    this.t += dt;
    this.reply?.update(dt);
  }
  draw(put) {
    drawArt(put, this.def.art, this.t);
    if (this.reply) return dialog(put, WHO[""], this.reply, this.reply.done && Math.floor(this.t * 2) % 2 === 0);
    box(put);
    put(3, 13, this.def.prompt, C.text);
    this.def.options.forEach((o, i) => {
      const on = i === this.sel;
      put(3, 15 + i, on ? "›" : " ", C.thread, BOLD);
      put(5, 15 + i, o.label, on ? C.paper : C.dim, on ? BOLD : 0);
    });
  }
}

function box(put) {
  for (let x = 1; x < W - 1; x++) {
    put(x, 12, "─", C.faint);
    put(x, 19, "─", C.faint);
  }
  for (let y = 13; y < 19; y++) {
    put(1, y, "│", C.faint);
    put(W - 2, y, "│", C.faint);
  }
  put(1, 12, "╭", C.faint);
  put(W - 2, 12, "╮", C.faint);
  put(1, 19, "╰", C.faint);
  put(W - 2, 19, "╯", C.faint);
}

/* Wrap the whole line first, then reveal it, so words never hop lines mid-type. */
function dialog(put, who, tw, prompt) {
  box(put);
  if (who.name) put(3, 12, ` ${who.name} `, who.fg, BOLD);
  let left = tw.count;
  wrap(tw.text, W - 8).slice(0, 4).forEach((l, i) => {
    const shown = l.slice(0, Math.max(0, left));
    left -= l.length + 1;
    put(3, 14 + i, shown, who.name ? C.paper : C.text, who.name ? 0 : ITALIC);
  });
  if (prompt) put(W - 10, 19, " space › ", C.sakura);
}

/* Shared bits for the action chapters. */
class Action {
  constructor(def, game) {
    this.game = game;
    this.t = 0;
    this.inv = 1; // a beat of grace at the start
    this.parts = [];
  }
  hurt(msg) {
    if (this.inv > 0) return false;
    this.game.hearts--;
    this.inv = 1.5;
    this.game.flash(msg);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      this.parts.push({ x: this.px, y: this.py, vx: Math.cos(a) * 12, vy: Math.sin(a) * 5, t: 0.35 });
    }
    return true;
  }
  tickParts(dt) {
    this.inv = Math.max(0, this.inv - dt);
    for (const p of this.parts) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.t -= dt;
    }
    this.parts = this.parts.filter((p) => p.t > 0);
  }
  drawHero(put) {
    for (const p of this.parts) put(p.x, p.y, "*", C.threadHi);
    if (this.inv > 0 && Math.floor(this.t * 12) % 2) return;
    put(this.px, this.py, "@", C.paper, BOLD);
  }
  progress(put, label, f) {
    // A thin progress strip across the top of the field.
    const n = Math.round(f * (W - label.length - 3));
    put(0, 0, label, C.dim);
    for (let i = 0; i < W - label.length - 3; i++) put(label.length + 1 + i, 0, i < n ? "━" : "─", i < n ? C.sakura : C.faint);
  }
}

class Forest extends Action {
  constructor(def, game) {
    super(def, game);
    this.dur = 26;
    this.px = Math.floor(W / 2);
    this.py = H - 2;
    this.arrows = [];
    this.goblins = []; // telegraphed shooters
    this.spawn = 1;
    // Trees: a canopy "^" over a trunk "|"; both block arrows and you.
    this.trees = [];
    for (let i = 0; i < 16; i++) {
      const x = 4 + Math.floor(Math.random() * (W - 8));
      const y = 3 + Math.floor(Math.random() * (H - 7));
      if (!this.trees.some((t) => Math.abs(t.x - x) < 4 && Math.abs(t.y - y) < 3)) this.trees.push({ x, y });
    }
  }
  blocked(x, y) {
    return this.trees.some((t) => t.x === x && (t.y === y || t.y + 1 === y));
  }
  key(k) {
    const d = dirOf(k);
    if (!d) return;
    // Sideways moves cover two cells, so horizontal and vertical feel even.
    const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[d];
    for (let s = 0; s < (dx ? 2 : 1); s++) {
      const nx = clamp(this.px + dx, 1, W - 2);
      const ny = clamp(this.py + dy, 2, H - 1);
      if (this.blocked(nx, ny)) break;
      [this.px, this.py] = [nx, ny];
    }
  }
  update(dt) {
    this.t += dt;
    this.tickParts(dt);
    const f = this.t / this.dur;
    if (f >= 1) {
      this.done = true;
      return;
    }
    if ((this.spawn -= dt) <= 0) {
      this.spawn = Math.max(0.28, 0.95 - f * 0.7) * (0.7 + Math.random() * 0.6);
      const left = Math.random() < 0.5;
      // Aim near the hero's row most of the time, so standing still isn't safe.
      const y = clamp(Math.random() < 0.6 ? this.py + Math.floor(Math.random() * 3) - 1 : 2 + Math.floor(Math.random() * (H - 3)), 2, H - 1);
      this.goblins.push({ left, y, t: 0.6 });
    }
    for (const g of this.goblins) {
      g.t -= dt;
      if (g.t <= 0) {
        g.done = true;
        this.arrows.push({ x: g.left ? 0 : W - 2, y: g.y, vx: (g.left ? 1 : -1) * (16 + f * 14) });
      }
    }
    this.goblins = this.goblins.filter((g) => !g.done);
    for (const a of this.arrows) {
      const x0 = a.x;
      a.x += a.vx * dt;
      // Sweep the cells crossed this tick.
      const lo = Math.floor(Math.min(x0, a.x));
      const hi = Math.ceil(Math.max(x0, a.x)) + 1;
      for (let x = lo; x <= hi; x++) {
        if (this.blocked(x, a.y)) a.done = true;
        else if (x === this.px && a.y === this.py && this.hurt("an arrow! ow.")) a.done = true;
        if (a.done) break;
      }
      if (a.x < -2 || a.x > W + 1) a.done = true;
    }
    this.arrows = this.arrows.filter((a) => !a.done);
  }
  draw(put) {
    this.progress(put, "the woods", this.t / this.dur);
    for (const t of this.trees) {
      put(t.x, t.y, "^", C.moss, BOLD);
      put(t.x, t.y + 1, "|", C.bark);
    }
    for (const g of this.goblins) {
      const blink = Math.floor(g.t * 10) % 2;
      put(g.left ? 0 : W - 1, g.y, blink ? "!" : "g", C.amber, BOLD);
    }
    for (const a of this.arrows) put(a.x, a.y, a.vx > 0 ? "->" : "<-", C.paper);
    this.drawHero(put);
  }
}

class Bridge extends Action {
  constructor(def, game) {
    super(def, game);
    this.top = 9; // bridge rows top..top+3
    this.rows = 4;
    this.px = 1;
    this.py = this.top + 1;
    this.safe = [this.px, this.py];
    // plank state: 0 solid, >0 cracking (seconds left), -1 gone
    this.planks = Array.from({ length: this.rows }, () => Array(W).fill(0));
    this.rocks = [];
    this.crumble = 1;
    this.rockIn = 1.5;
    this.still = 0;
  }
  solid(x, y) {
    const r = y - this.top;
    return r >= 0 && r < this.rows && x >= 0 && x < W && this.planks[r][x] >= 0;
  }
  standingCount(x) {
    return this.planks.filter((row) => row[x] === 0).length;
  }
  crack(x, r) {
    // Never close a column completely: there must be a way across.
    if (x < 3 || x > W - 3 || this.planks[r][x] !== 0 || this.standingCount(x) <= 2) return false;
    this.planks[r][x] = 0.9;
    return true;
  }
  key(k) {
    const d = dirOf(k);
    if (!d) return;
    const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[d];
    const nx = clamp(this.px + dx, 0, W - 1);
    const ny = clamp(this.py + dy, this.top, this.top + this.rows - 1);
    [this.px, this.py] = [nx, ny];
    this.still = 0;
    if (this.solid(nx, ny)) this.safe = [nx, ny];
  }
  fall() {
    if (this.inv > 0) return;
    this.hurt("you fell. (it's a long way down.)");
    [this.px, this.py] = this.safe;
    if (!this.solid(this.px, this.py)) {
      // Find the nearest plank behind.
      for (let x = this.px; x >= 0; x--) {
        for (let r = 0; r < this.rows; r++) if (this.solid(x, this.top + r)) return ([this.px, this.py] = [x, this.top + r]);
      }
    }
  }
  update(dt) {
    this.t += dt;
    this.tickParts(dt);
    if (this.px >= W - 2) {
      this.done = true;
      return;
    }
    const f = this.px / W;

    // Planks ahead crack at random; faster as you get further.
    if ((this.crumble -= dt) <= 0) {
      this.crumble = Math.max(0.12, 0.45 - f * 0.3);
      const x = this.px + 2 + Math.floor(Math.random() * 14);
      this.crack(x, Math.floor(Math.random() * this.rows));
    }
    // Dawdle and the plank under you goes too.
    this.still += dt;
    if (this.still > 1.2) {
      this.crack(this.px, this.py - this.top);
      this.still = 0.4;
    }
    for (const row of this.planks) {
      for (let x = 0; x < W; x++) {
        if (row[x] > 0) {
          row[x] -= dt;
          if (row[x] <= 0) row[x] = -1;
        }
      }
    }

    // Rocks: a shadow first, then the rock.
    if ((this.rockIn -= dt) <= 0) {
      this.rockIn = Math.max(0.4, 1.1 - f * 0.6);
      const x = clamp(this.px + Math.floor(Math.random() * 16) - 4, 1, W - 2);
      const r = Math.floor(Math.random() * this.rows);
      this.rocks.push({ x, r, y: 0, vy: 10 });
    }
    for (const rock of this.rocks) {
      rock.y += rock.vy * dt;
      if (rock.y >= this.top + rock.r) {
        rock.done = true;
        if (rock.x === this.px && this.top + rock.r === this.py) this.hurt("bonk. a rock.");
        this.crack(rock.x, rock.r);
      }
    }
    this.rocks = this.rocks.filter((r) => !r.done);

    if (!this.solid(this.px, this.py)) this.fall();
  }
  draw(put) {
    this.progress(put, "the bridge", this.px / (W - 2));
    // The chasm.
    for (let y = 2; y < H; y++) for (let x = (y * 7) % 11; x < W; x += 12) put(x, y, ".", "#2A2826");
    for (let r = 0; r < this.rows; r++) {
      for (let x = 0; x < W; x++) {
        const v = this.planks[r][x];
        if (v === 0) put(x, this.top + r, "=", r % 2 ? C.amber : C.bark);
        else if (v > 0) put(x, this.top + r, Math.floor(v * 10) % 2 ? "~" : "=", C.threadHi);
      }
    }
    put(0, this.top - 1, "|", C.bark);
    put(W - 1, this.top - 1, "|", C.bark);
    put(W - 1, this.top + this.rows, "|", C.bark);
    for (const rock of this.rocks) {
      put(rock.x, this.top + rock.r, "x", C.faint);
      if (rock.y < this.top + rock.r) put(rock.x, rock.y, "o", C.paper, BOLD);
    }
    put(W - 2, this.top + 1, "»", C.sakura);
    this.drawHero(put);
  }
}

class Boss extends Action {
  constructor(def, game) {
    super(def, game);
    this.hp = 6;
    this.px = Math.floor(W / 2);
    this.py = H - 2;
    this.dx = Math.floor((W - DRAGON_W) / 2);
    this.dy = 1;
    this.fire = []; // {x, y, vx, vy} fireballs
    this.walls = []; // {x, gapY, vx}
    this.marks = []; // ember warnings {x, t, burn}
    this.spear = null;
    this.next = ["walls", "balls", "embers"].sort(() => Math.random() - 0.5);
    this.phase = { kind: "rest", t: 2 };
    this.hurtT = 0;
  }
  get tired() {
    return this.phase.kind === "tired";
  }
  key(k) {
    const d = dirOf(k);
    if (d) {
      const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-2, 0], right: [2, 0] }[d];
      this.px = clamp(this.px + dx, 1, W - 2);
      this.py = clamp(this.py + dy, 9, H - 1);
    }
    if ((k.name === "space" || k.name === "enter") && !this.spear) this.spear = { x: this.px, y: this.py - 1 };
  }
  startPhase() {
    if (!this.next.length) this.next = ["walls", "balls", "embers"].sort(() => Math.random() - 0.5);
    const kind = this.next.shift();
    const rage = 6 - this.hp; // the angrier it gets, the busier it gets
    this.phase = { kind, t: 0, n: 0, rage };
  }
  update(dt) {
    this.t += dt;
    this.tickParts(dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    const ph = this.phase;
    ph.t += dt;

    // The dragon drifts side to side; lower and slower when tired.
    const target = this.tired ? 4 : 1;
    this.dy += (target - this.dy) * Math.min(1, dt * 4);
    this.dx = Math.floor((W - DRAGON_W) / 2 + Math.sin(this.t * (this.tired ? 0.3 : 0.6)) * 14);
    const mouthX = this.dx + Math.floor(DRAGON_W / 2) - 1;
    const mouthY = Math.round(this.dy) + 5;

    if (ph.kind === "rest" && ph.t > 1.2) this.startPhase();
    else if (ph.kind === "walls") {
      // Walls of fire sweep across with a gap you need to be in.
      if (ph.n < 3 + Math.min(2, ph.rage) && ph.t > ph.n * 1.5) {
        const left = ph.n % 2 === 0;
        this.walls.push({ x: left ? -1 : W, gapY: 9 + Math.floor(Math.random() * (H - 12)), vx: (left ? 1 : -1) * (20 + ph.rage * 2) });
        ph.n++;
      }
      if (ph.n >= 3 + Math.min(2, ph.rage) && !this.walls.length) this.tire();
    } else if (ph.kind === "balls") {
      // Volleys of fireballs fanning out from the mouth.
      if (ph.n < 4 + Math.min(2, ph.rage) && ph.t > ph.n * 0.9) {
        const n = 7;
        const off = (ph.n % 2) * 0.12;
        for (let i = 0; i < n; i++) {
          const a = Math.PI / 2 + ((i / (n - 1)) - 0.5) * 2.1 + off;
          this.fire.push({ x: mouthX, y: mouthY, vx: Math.cos(a) * 20, vy: Math.sin(a) * 8 });
        }
        ph.n++;
      }
      if (ph.n >= 4 + Math.min(2, ph.rage) && !this.fire.length) this.tire();
    } else if (ph.kind === "embers") {
      // Marked columns, then fire falls down them.
      if (ph.n < 4 && ph.t > ph.n * 1.4) {
        const cols = new Set();
        cols.add(clamp(this.px + Math.floor(Math.random() * 5) - 2, 1, W - 2));
        while (cols.size < 6 + ph.rage) cols.add(1 + Math.floor(Math.random() * (W - 3)));
        for (const x of cols) this.marks.push({ x, t: 0.9, burn: 0.45 });
        ph.n++;
      }
      if (ph.n >= 4 && !this.marks.length) this.tire();
    } else if (ph.kind === "tired" && ph.t > (this.game.flags.lute ? 4.5 : 3)) {
      this.phase = { kind: "rest", t: 0 };
    }

    // Move hazards and check hits.
    for (const w of this.walls) {
      w.x += w.vx * dt;
      if (Math.abs(w.x - this.px) < 1.5 && Math.abs(this.py - w.gapY) > 1) this.hurt("toasty.");
      if (w.x < -3 || w.x > W + 2) w.done = true;
    }
    this.walls = this.walls.filter((w) => !w.done);
    for (const b of this.fire) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (Math.round(b.x) === this.px && Math.round(b.y) === this.py) this.hurt("fireball. hot.");
      if (b.y > H || b.x < -1 || b.x > W) b.done = true;
    }
    this.fire = this.fire.filter((b) => !b.done);
    for (const m of this.marks) {
      if (m.t > 0) m.t -= dt;
      else {
        m.burn -= dt;
        if (m.x === this.px && this.py >= 8) this.hurt("ember storm. ouch.");
        if (m.burn <= 0) m.done = true;
      }
    }
    this.marks = this.marks.filter((m) => !m.done);

    // The spear.
    if (this.spear) {
      this.spear.y -= 30 * dt;
      const sx = this.spear.x;
      const top = Math.round(this.dy);
      const inBody = sx >= this.dx + 4 && sx <= this.dx + DRAGON_W - 5 && this.spear.y <= top + 4;
      if (inBody) {
        if (this.tired) {
          this.hp--;
          this.hurtT = 0.5;
          this.game.flash(this.hp > 0 ? pick(["ROAR!", "a solid hit!", "the dragon winces."]) : "the dragon yields!");
          if (this.hp <= 0) this.won = 1.4;
        } else this.game.flash(pick(["tink. it's not tired yet.", "the dragon swats it away.", "wait for the pant."]));
        this.spear = null;
      } else if (this.spear.y < 0) this.spear = null;
    }

    if (this.won && (this.won -= dt) <= 0) this.done = true;
  }
  tire() {
    this.phase = { kind: "tired", t: 0 };
  }
  draw(put) {
    // HP as scales across the top.
    put(0, 0, "dragon", C.dim);
    for (let i = 0; i < 6; i++) put(8 + i * 2, 0, i < this.hp ? "█" : "░", i < this.hp ? C.thread : C.faint);
    if (this.tired) put(W - 20, 0, "*pant* *pant*  now!", Math.floor(this.t * 4) % 2 ? C.amber : C.paper, BOLD);

    const fg = this.hurtT > 0 ? (Math.floor(this.t * 20) % 2 ? C.paper : C.thread) : this.tired ? C.blossomDeep : C.thread;
    drawSprite(put, DRAGON, this.dx, Math.round(this.dy), fg, Math.floor(this.t * (this.tired ? 1 : 3)), { sleepy: this.tired, hurt: this.won });
    if (this.tired) put(this.dx + DRAGON_W - 6, Math.round(this.dy) + 1, Math.floor(this.t * 2) % 2 ? "z" : "Z", C.dim);

    for (const w of this.walls) {
      for (let y = 8; y < H; y++) {
        if (Math.abs(y - w.gapY) <= 1) continue;
        put(w.x, y, Math.random() < 0.5 ? "▓" : "▒", (y + Math.floor(this.t * 20)) % 3 ? C.thread : C.amber);
      }
    }
    for (const b of this.fire) put(b.x, b.y, "o", Math.floor(this.t * 10) % 2 ? C.amber : C.threadHi, BOLD);
    for (const m of this.marks) {
      if (m.t > 0) put(m.x, 8, Math.floor(m.t * 10) % 2 ? "v" : " ", C.amber);
      else for (let y = 8; y < H; y++) put(m.x, y, "|", y % 2 ? C.thread : C.amber, BOLD);
    }
    if (this.spear) put(this.spear.x, this.spear.y, "|", C.paper, BOLD);
    this.drawHero(put);
  }
}

/* ── the game ───────────────────────────────────────────────────────────── */

const STAGES = { story: Story, choice: Choice, forest: Forest, bridge: Bridge, boss: Boss };

export class Dragon extends Game {
  get title() {
    return "rescue the princess";
  }

  reset() {
    this.fieldW = W;
    this.fieldH = H;
    this.flags = {};
    this.hearts = 3;
    this.won = false;
    this.time = 0;
    this.msg = null;
    this.rebuild();
    this.go(0);
  }

  rebuild() {
    this.stages = script(this.flags);
  }

  go(i) {
    this.index = i;
    const def = this.stages[i];
    if (def.type === "end") {
      this.won = true;
      this.end();
      return;
    }
    if (def.chapter) this.checkpoint = { index: i + 1, hearts: Math.max(this.hearts, 3) };
    this.cur = new STAGES[def.type](def, this);
  }

  flash(text) {
    this.msg = { text, t: 1.6 };
  }

  get hud() {
    const def = this.stages[this.index];
    const segs = [];
    if (["forest", "bridge", "boss"].includes(def.type)) segs.push(["chapter " + ({ forest: 1, bridge: 2, boss: 3 }[def.type]), C.dim], ["   ", null]);
    segs.push(["♥".repeat(Math.max(0, this.hearts)), C.thread]);
    return segs;
  }

  readyLines() {
    return [
      ["a classic tale, mostly.", C.dim],
      "three chapters · one dragon · zero refunds",
      ["space start", C.sakura],
    ];
  }

  overTitle() {
    return this.won ? ["the end ✿", C.sakura, BOLD] : null;
  }

  overLines() {
    const m = Math.floor(this.time / 60);
    const s = String(Math.floor(this.time % 60)).padStart(2, "0");
    if (this.won) return [`hearts left ${this.hearts}  ·  time ${m}:${s}`, ["thanks for playing.", C.dim]];
    return [["the dragon remains unbothered.", C.dim]];
  }

  overKeys() {
    return this.won ? "r play again   esc back" : "r retry chapter   n new game   esc back";
  }

  key(k, app) {
    if (this.state === "over" && !this.won) {
      if (k.name === "r") return this.retry();
      if (k.name === "n") {
        this.reset();
        this.state = "play";
        return;
      }
      if (k.name === "space" || k.name === "enter") return; // don't skip past the choice by accident
    }
    if (this.state === "over" && this.won && (k.name === "r" || k.name === "space" || k.name === "enter")) {
      this.reset();
      this.state = "play";
      return;
    }
    super.key(k, app);
  }

  retry() {
    this.hearts = this.checkpoint?.hearts ?? 3;
    this.state = "play";
    this.go(this.checkpoint?.index ?? 0);
  }

  onKey(k) {
    this.cur.key(k);
  }

  step(dt) {
    this.time += dt;
    if (this.msg && (this.msg.t -= dt) <= 0) this.msg = null;
    this.cur.update(dt);
    if (this.hearts <= 0) {
      this.end();
      return;
    }
    if (this.cur.done) this.go(this.index + 1);
  }

  draw(scr, ox, oy) {
    const put = (x, y, s, fg, a) => this.put(scr, ox, oy, x, y, s, fg, a);
    this.cur.draw(put);
    if (this.msg) {
      const t = ` ${this.msg.text} `;
      const x = Math.floor((W - [...t].length) / 2);
      scr.fill(ox + x, oy + 7, [...t].length, 1, " ");
      put(x, 7, t, C.paper, BOLD);
    }
  }
}

/** Arcade preview: the dragon, idling over its hoard. */
export function preview(scr, x, y, w, h, t) {
  const put = (px, py, s, fg) => scr.text(x + px, y + py, s, fg);
  const dx = Math.floor((w - DRAGON_W) / 2);
  drawSprite((px, py, c, fg) => put(px, py, c, fg), DRAGON, dx, 1, C.thread, Math.floor(t * 2));
  put(dx + 3, 7, "$$$  $ $$$$  $$", C.amber);
  const hx = Math.floor(w / 2 + Math.sin(t * 1.3) * 10);
  put(hx, h - 1, "@", C.paper);
  if (Math.floor(t * 1.5) % 3 === 0) put(dx + 11, 6, "o  o", C.threadHi);
}
