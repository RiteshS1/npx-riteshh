// The sakura tree and its petals.
//
// The tree is grown once per size as a list of cells relative to its base,
// each with a birth time t in [0, 1], so the intro can "grow" it by drawing
// only cells with t <= growth. Branches are recursive line segments; tips
// end in elliptical blossom clusters. Terminal cells are about twice as tall
// as they are wide, so x is stretched by 2 to keep the shape round.

import { C, rng, pick, clamp } from "../theme.js";

const BLOOM_CHARS = ["@", "&", "%", "*", "&", "o", "'"];
const BLOOM_COLORS = [C.sakura, C.blossom, C.blossom, C.blossomDeep, C.paper];

export function growTree({ height = 16, seed = 7 } = {}) {
  const rnd = rng(seed);
  const wood = new Map();
  const bloom = new Map();
  const maxDepth = height >= 18 ? 5 : 4;
  const tips = [];

  const put = (map, x, y, cell) => {
    const k = `${x},${y}`;
    const old = map.get(k);
    if (!old || cell.t < old.t) map.set(k, cell);
  };

  const woodChar = (a) => {
    if (Math.abs(a) < 0.3) return "|";
    if (Math.abs(a) > 1.25) return "~";
    return a > 0 ? "/" : "\\";
  };

  // Branch lengths are in rows; t is cumulative "growth distance".
  function branch(x, y, angle, len, depth, t0) {
    const thick = depth === maxDepth ? 2 : 1;
    const steps = Math.max(2, Math.ceil(len * 2.5));
    let ex = x;
    let ey = y;
    for (let s = 0; s <= steps; s++) {
      const f = s / steps;
      ex = x + Math.sin(angle) * len * f * 2;
      ey = y - Math.cos(angle) * len * f;
      const t = t0 + f * len;
      const ch = woodChar(angle);
      for (let k = 0; k < thick; k++) {
        const ox = Math.round(ex) + k - Math.floor(thick / 2);
        put(wood, ox, Math.round(ey), { ch, fg: depth >= maxDepth - 1 ? C.barkDark : C.bark, t });
      }
    }
    const tEnd = t0 + len;
    if (depth === 0 || len < 1.6) {
      tips.push({ x: ex, y: ey, t: tEnd, depth });
      return;
    }
    const kids = depth === maxDepth ? 2 : rnd() < 0.55 ? 3 : 2;
    const spread = depth === maxDepth ? 0.75 : 0.62;
    for (let i = 0; i < kids; i++) {
      const off = kids === 1 ? 0 : (i / (kids - 1) - 0.5) * 2 * spread;
      const a = clamp(angle * 0.6 + off + (rnd() - 0.5) * 0.35, -1.45, 1.45);
      const l = len * (0.66 + rnd() * 0.16);
      branch(ex, ey, a, l, depth - 1, tEnd);
    }
    // A few blossoms along mid-branches too, so the canopy looks full.
    if (depth === 1 && rnd() < 0.5) tips.push({ x: ex, y: ey, t: tEnd, depth: 1 });
  }

  const trunk = height * 0.36;
  branch(0, 0, -0.05 + (rnd() - 0.5) * 0.1, trunk, maxDepth, 0);

  // Blossom clusters at the tips.
  const r = Math.max(1.6, height / 7.5);
  for (const tip of tips) {
    const rr = r * (tip.depth === 0 ? 1 : 0.75) * (0.8 + rnd() * 0.4);
    for (let dy = -Math.ceil(rr); dy <= Math.ceil(rr); dy++) {
      for (let dx = -Math.ceil(rr * 2); dx <= Math.ceil(rr * 2); dx++) {
        const d = Math.sqrt((dx / 2) ** 2 + dy ** 2) / rr;
        if (d > 1 || rnd() > 0.8 - d * 0.5) continue;
        const x = Math.round(tip.x + dx);
        const y = Math.round(tip.y + dy);
        if (y > -2) continue; // keep blossoms off the ground
        // Upper cells catch the light.
        const fg = dy < -rr * 0.4 && rnd() < 0.5 ? pick([C.sakura, C.paper], rnd) : pick(BLOOM_COLORS, rnd);
        put(bloom, x, y, { ch: pick(BLOOM_CHARS, rnd), fg, t: tip.t + d * 2.5 });
      }
    }
  }

  // Roots.
  put(wood, -2, 0, { ch: "_", fg: C.barkDark, t: 0 });
  put(wood, -3, 0, { ch: ".", fg: C.barkDark, t: 0 });
  put(wood, 2, 0, { ch: "_", fg: C.barkDark, t: 0 });
  put(wood, 3, 0, { ch: ".", fg: C.barkDark, t: 0 });

  // Normalise times: wood grows over [0, 0.75], blossoms bloom over [0.45, 1].
  const all = (m) => [...m.entries()].map(([k, v]) => {
    const [x, y] = k.split(",").map(Number);
    return { x, y, ...v };
  });
  const w = all(wood);
  const b = all(bloom);
  const maxW = Math.max(...w.map((c) => c.t)) || 1;
  const maxB = Math.max(...b.map((c) => c.t)) || 1;
  for (const c of w) c.t = (c.t / maxW) * 0.75;
  for (const c of b) c.t = 0.45 + (c.t / maxB) * 0.55;
  b.sort((a, c) => a.t - c.t);

  const xs = [...w, ...b].map((c) => c.x);
  const ys = [...w, ...b].map((c) => c.y);
  return {
    wood: w,
    bloom: b,
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
  };
}

/* ── petals ─────────────────────────────────────────────────────────────── */

const PETAL_FRAMES = ["'", "`", ",", ".", "*", ","];
const PETAL_COLORS = [C.sakura, C.blossom, C.sakura, C.blossomDeep];

export class Petals {
  constructor(count = 30, seed = Date.now()) {
    this.rnd = rng(seed);
    this.count = count;
    this.list = [];
    this.wind = -2.5;
    this.gust = 0;
    this.t = 0;
  }

  /** spawnAt() returns {x, y} for a new petal, or null to drop from the sky. */
  update(dt, w, h, ground, spawnAt = null) {
    const rnd = this.rnd;
    this.t += dt;
    // Wind: a slow swell plus the occasional gust.
    if (this.gust <= 0 && rnd() < dt * 0.08) this.gust = 2 + rnd() * 2.5;
    this.gust = Math.max(0, this.gust - dt);
    const wind = this.wind + Math.sin(this.t * 0.35) * 1.4 - (this.gust > 0 ? Math.sin((this.gust / 4.5) * Math.PI) * 6 : 0);

    while (this.list.length < this.count) {
      const at = spawnAt?.(rnd) ?? { x: rnd() * (w + 20), y: -rnd() * h * 0.5 };
      this.list.push({
        x: at.x,
        y: at.y,
        vy: 1.4 + rnd() * 2.2,
        amp: 1 + rnd() * 2.5,
        freq: 1.5 + rnd() * 2.5,
        phase: rnd() * Math.PI * 2,
        fg: pick(PETAL_COLORS, rnd),
        rest: 0,
        delay: this.list.length < this.count / 2 && this.t < 0.1 ? 0 : rnd() * 3,
      });
    }

    for (const p of this.list) {
      if (p.delay > 0) {
        p.delay -= dt;
        continue;
      }
      if (p.rest > 0) {
        p.rest -= dt;
        if (p.rest <= 0) p.dead = true;
        continue;
      }
      p.phase += p.freq * dt;
      p.y += p.vy * dt;
      p.x += (wind + Math.sin(p.phase) * p.amp) * dt;
      if (p.y >= ground) {
        p.y = ground;
        p.rest = 1.5 + rnd() * 3;
      }
      if (p.x < -2 || p.x > w + 25) p.dead = true;
    }
    this.list = this.list.filter((p) => !p.dead);
  }

  render(scr) {
    for (const p of this.list) {
      if (p.delay > 0 || p.y < 0) continue;
      if (p.rest > 0) {
        scr.set(p.x, p.y, ".", p.rest < 1 ? C.faint : C.blossomDeep);
        continue;
      }
      const f = PETAL_FRAMES[Math.floor(((p.phase % (Math.PI * 2)) / (Math.PI * 2)) * PETAL_FRAMES.length)];
      scr.set(p.x, p.y, f, p.fg);
    }
  }
}

/* ── backdrop: tree + ground + petals, shared across scenes ─────────────── */

export class Backdrop {
  constructor(w, h, { seed = 2002 } = {}) {
    this.seed = seed;
    this.growth = 1;
    this.petalsOn = true;
    this.resize(w, h);
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this.ground = h - 1;
    this.tree = growTree({ height: clamp(Math.round(Math.min(h * 0.62, w * 0.14)), 10, 30), seed: this.seed });
    // Sit the tree in the bottom-right, fully on screen.
    this.baseX = w - this.tree.right - Math.max(3, Math.round(w * 0.06));
    const count = Math.round(clamp((w * h) / 70, 18, 110));
    if (!this.petals) this.petals = new Petals(count, this.seed);
    else this.petals.count = count;
  }

  update(dt) {
    if (!this.petalsOn) return;
    const { bloom } = this.tree;
    const open = bloom.filter((c) => c.t <= this.growth);
    this.petals.update(dt, this.w, this.h, this.ground, (rnd) => {
      if (!open.length || rnd() < 0.3) return { x: rnd() * (this.w + 20), y: -1 - rnd() * 4 };
      const c = open[Math.floor(rnd() * open.length)];
      return { x: this.baseX + c.x, y: this.ground + c.y };
    });
  }

  render(scr, { tree = true, petals = true, ground = true } = {}) {
    const g = this.ground;
    if (ground) {
      for (let x = 0; x < this.w; x++) {
        const near = Math.abs(x - this.baseX) < (this.tree.right - this.tree.left) * 0.6;
        scr.set(x, g, near ? "_" : x % 7 === 3 ? "." : "_", near ? C.dim : C.faint);
      }
    }
    if (tree) {
      for (const c of this.tree.wood) if (c.t <= this.growth) scr.set(this.baseX + c.x, g + c.y, c.ch, c.fg);
      for (const c of this.tree.bloom) {
        if (c.t > this.growth) continue;
        // Freshly opened blossoms start as a dot.
        const young = this.growth < 1 && this.growth - c.t < 0.04;
        scr.set(this.baseX + c.x, g + c.y, young ? "." : c.ch, c.fg);
      }
    }
    if (petals && this.petalsOn) this.petals.render(scr);
  }
}
