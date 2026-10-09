// Starfall: a Galaga-style shooter.
//
// Enemies fly in along cubic Bézier paths to slots in a swaying formation,
// then peel off one by one for dive attacks aimed at the player. Every
// moving thing uses float positions and is rounded only when drawn.
// Bullets sweep the cells they cross each tick so nothing tunnels through.

import { C, clamp, pick } from "../theme.js";
import { BOLD } from "../engine/screen.js";
import { dirOf } from "../engine/input.js";
import { Game } from "./base.js";

export const W = 60;
export const H = 20;

const TYPES = {
  boss: { frames: ["<O>", ">O<"], fg: C.thread, hit: C.blossomDeep, hp: 2, pts: 150, dive: 400 },
  moth: { frames: ["/V\\", "\\V/"], fg: C.sakura, hp: 1, pts: 80, dive: 160 },
  bee: { frames: ["}o{", "{o}"], fg: C.amber, hp: 1, pts: 50, dive: 100 },
};

/* Formation rows: [type, count, y]. */
const ROWS = [
  ["boss", 4, 1],
  ["moth", 8, 3],
  ["moth", 8, 4],
  ["bee", 10, 6],
  ["bee", 10, 7],
];

const bez = (a, b, c, d, t) => {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};

/** Build a wave: every enemy with its formation slot and entry schedule. */
export function makeWave(n, rnd = Math.random) {
  const enemies = [];
  for (const [type, count, y] of ROWS) {
    const span = (count - 1) * 5;
    for (let i = 0; i < count; i++) {
      enemies.push({ type, sx: W / 2 - span / 2 + i * 5, sy: y, hp: TYPES[type].hp });
    }
  }
  // Enter in groups of 8, alternating sides, interleaving rows so the
  // formation fills in evenly.
  const order = [...enemies].sort((a, b) => (a.sx % 10) - (b.sx % 10) || a.sy - b.sy);
  order.forEach((e, i) => {
    const group = Math.floor(i / 8);
    e.side = group % 3 === 0 ? -1 : group % 3 === 1 ? 1 : 0;
    e.delay = 0.8 + group * Math.max(1.1, 1.7 - n * 0.1) + (i % 8) * 0.13;
    e.state = "wait";
    e.t = 0;
    e.x = -10;
    e.y = -10;
    e.wobble = rnd() * Math.PI * 2;
  });
  return enemies;
}

export class Galaga extends Game {
  get title() {
    return "starfall";
  }

  reset() {
    this.fieldW = W;
    this.fieldH = H;
    this.score = 0;
    this.lives = 3;
    this.wave = 0;
    this.px = W / 2;
    this.target = W / 2;
    this.bullets = [];
    this.shots = []; // enemy bullets
    this.parts = [];
    this.drops = [];
    this.spread = 0;
    this.shield = false;
    this.invuln = 0;
    this.cool = 0;
    this.dead = 0;
    this.banner = null;
    this.hits = 0;
    this.fired = 0;
    this.stars = Array.from({ length: 46 }, () => ({ x: Math.random() * W, y: Math.random() * H, layer: Math.random() < 0.35 ? 1 : 0 }));
    this.nextWave();
  }

  nextWave() {
    this.wave++;
    this.enemies = makeWave(this.wave);
    this.ft = 0; // formation clock
    this.diveIn = 4;
    this.banner = { text: `wave ${this.wave}`, t: 1.8 };
  }

  get hud() {
    const segs = [["score ", C.dim], [String(this.score), C.amber, BOLD], ["   wave ", C.dim], [String(this.wave), C.paper], ["   ", null], ["▲".repeat(Math.max(0, this.lives)), C.thread]];
    if (this.spread > 0) segs.push(["   spread ", C.dim], [`${Math.ceil(this.spread)}s`, C.amber]);
    if (this.shield) segs.push(["   shield", C.sky]);
    return segs;
  }

  readyLines() {
    return [
      ["they came for the free tier.", C.dim],
      "←→ / a d move    space fire",
      ["S spread shot   O shield", C.sky],
      ["space start", C.sakura],
    ];
  }

  overLines() {
    const acc = this.fired ? Math.round((this.hits / this.fired) * 100) : 0;
    return [`score ${this.score}  ·  wave ${this.wave}`, [`accuracy ${acc}%`, C.dim], [acc > 60 ? "sharpshooter." : "spray and pray, respectfully.", C.sakura]];
  }

  onKey(k) {
    if (this.dead > 0) return;
    const d = dirOf(k);
    if (d === "left") this.target = clamp(this.target - 2.5, 1, W - 2);
    else if (d === "right") this.target = clamp(this.target + 2.5, 1, W - 2);
    else if (k.name === "space" || d === "up") this.fire();
  }

  fire() {
    if (this.cool > 0 || this.bullets.length >= (this.spread > 0 ? 6 : 3)) return;
    this.cool = 0.14;
    const x = Math.round(this.px);
    const mk = (vx) => ({ x, y: H - 2, vx });
    this.bullets.push(mk(0));
    if (this.spread > 0) this.bullets.push(mk(-9), mk(9));
    this.fired++;
  }

  slot(e) {
    // Sway side to side and breathe in and out from the centre.
    const sway = Math.sin(this.ft * 0.7) * 3;
    const breathe = 1 + Math.sin(this.ft * 1.3) * 0.05;
    return [W / 2 + (e.sx - W / 2) * breathe + sway, e.sy];
  }

  burst(x, y, colors, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random();
      const s = 6 + Math.random() * 10;
      this.parts.push({ x, y, vx: Math.cos(a) * s * 1.6, vy: Math.sin(a) * s * 0.7, t: 0.35 + Math.random() * 0.25, fg: pick(colors) });
    }
  }

  step(dt) {
    this.ft += dt;
    this.cool = Math.max(0, this.cool - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.spread = Math.max(0, this.spread - dt);
    if (this.banner && (this.banner.t -= dt) <= 0) this.banner = null;
    this.px += (this.target - this.px) * Math.min(1, dt * 18);

    for (const s of this.stars) {
      s.y += (s.layer ? 7 : 2.5) * dt;
      if (s.y >= H) [s.y, s.x] = [0, Math.random() * W];
    }
    for (const p of this.parts) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.t -= dt;
    }
    this.parts = this.parts.filter((p) => p.t > 0);

    if (this.dead > 0) {
      this.dead -= dt;
      if (this.dead <= 0) {
        if (this.lives <= 0) return this.end();
        this.invuln = 2;
        this.px = this.target = W / 2;
      }
    }

    this.moveEnemies(dt);
    this.moveBullets(dt);

    if (this.enemies.length === 0 && !this.banner) this.nextWave();
  }

  moveEnemies(dt) {
    const wave = this.wave;
    const inFormation = this.enemies.filter((e) => e.state === "form");

    // Pick a diver now and then; faster in later waves.
    if (inFormation.length && (this.diveIn -= dt) <= 0) {
      const e = pick(inFormation);
      e.state = "dive";
      e.t = 0;
      e.side = e.x < W / 2 ? -1 : 1;
      e.aim = clamp(this.px + (Math.random() - 0.5) * 8, 2, W - 3);
      e.from = [e.x, e.y];
      e.dur = Math.max(1.7, 2.8 - wave * 0.12);
      e.shotsLeft = wave >= 2 ? 2 : 1;
      this.diveIn = Math.max(0.7, 2.6 - wave * 0.25) * (0.6 + Math.random() * 0.8);
    }

    // Occasional potshots from the formation itself.
    if (inFormation.length && Math.random() < dt * (0.15 + wave * 0.08)) {
      const e = pick(inFormation);
      this.shoot(e.x, e.y + 1, 0.15);
    }

    for (const e of this.enemies) {
      e.t += dt;
      if (e.state === "wait") {
        if (e.t >= e.delay) {
          e.state = "enter";
          e.t = 0;
        }
        continue;
      }
      if (e.state === "enter") {
        const [tx, ty] = this.slot(e);
        const k = Math.min(1, e.t / 1.9);
        const sx = e.side === 0 ? W / 2 + (e.sx < W / 2 ? -4 : 4) : e.side < 0 ? -3 : W + 2;
        const c1x = e.side === 0 ? (e.sx < W / 2 ? W * 0.15 : W * 0.85) : e.side < 0 ? W * 0.75 : W * 0.25;
        const c2x = e.side === 0 ? W / 2 : e.side < 0 ? W * 0.15 : W * 0.85;
        e.x = bez(sx, c1x, c2x, tx, k);
        e.y = bez(-1, H * 0.7, H * 0.25, ty, k);
        if (k >= 1) e.state = "form";
        continue;
      }
      if (e.state === "form") {
        [e.x, e.y] = this.slot(e);
        continue;
      }
      if (e.state === "dive") {
        const k = Math.min(1, e.t / e.dur);
        const [fx, fy] = e.from;
        e.x = bez(fx, fx + e.side * 14, e.aim - e.side * 10, e.aim + e.side * 6, k);
        e.y = bez(fy, fy - 5, H * 0.75, H + 2, k);
        if (e.shotsLeft > 0 && k > 0.35 && Math.random() < dt * 3) {
          this.shoot(e.x, e.y + 1, 0.5);
          e.shotsLeft--;
        }
        if (k >= 1) {
          // Wrap round to the top and glide back into place.
          e.state = "return";
          e.t = 0;
          e.from = [e.x, -2];
        }
        continue;
      }
      if (e.state === "return") {
        const [tx, ty] = this.slot(e);
        const k = Math.min(1, e.t / 1.2);
        e.x = e.from[0] + (tx - e.from[0]) * k;
        e.y = -2 + (ty + 2) * k;
        if (k >= 1) e.state = "form";
      }
    }

    // Diving bodies hurt.
    if (this.dead <= 0) {
      for (const e of this.enemies) {
        if ((e.state === "dive" || e.state === "enter") && Math.round(e.y) === H - 1 && Math.abs(e.x - this.px) < 2.5) {
          this.kill(e, false);
          this.hurt();
        }
      }
    }
  }

  shoot(x, y, aim) {
    const vy = 11 + this.wave * 0.8;
    const vx = clamp(((this.px - x) / Math.max(4, H - y)) * vy * aim, -7, 7);
    this.shots.push({ x, y, vx, vy });
  }

  moveBullets(dt) {
    // Player bullets: sweep each cell crossed this tick.
    for (const b of this.bullets) {
      const y0 = b.y;
      b.y -= 32 * dt;
      b.x += b.vx * dt;
      for (let y = Math.round(y0); y >= Math.round(b.y) && !b.done; y--) {
        for (const e of this.enemies) {
          if (e.state === "wait" || e.dead) continue;
          if (Math.round(e.y) === y && Math.abs(Math.round(b.x) - Math.round(e.x)) <= 1) {
            b.done = true;
            this.hits++;
            e.hp--;
            if (e.hp <= 0) this.kill(e, true);
            else this.burst(e.x, e.y, [C.paper], 3);
            break;
          }
        }
      }
      if (b.y < 0 || b.x < 0 || b.x >= W) b.done = true;
    }
    this.bullets = this.bullets.filter((b) => !b.done);
    this.enemies = this.enemies.filter((e) => !e.dead);

    for (const s of this.shots) {
      s.y += s.vy * dt;
      s.x += s.vx * dt;
      if (this.dead <= 0 && Math.round(s.y) === H - 1 && Math.abs(Math.round(s.x) - Math.round(this.px)) <= 1) {
        s.done = true;
        this.hurt();
      }
      if (s.y >= H) s.done = true;
    }
    this.shots = this.shots.filter((s) => !s.done);

    for (const d of this.drops) {
      d.y += 6 * dt;
      if (Math.round(d.y) === H - 1 && Math.abs(d.x - this.px) <= 2 && this.dead <= 0) {
        d.done = true;
        if (d.kind === "S") this.spread = 12;
        else this.shield = true;
        this.banner = { text: d.kind === "S" ? "spread shot!" : "shield up!", t: 1 };
      }
      if (d.y >= H) d.done = true;
    }
    this.drops = this.drops.filter((d) => !d.done);
  }

  kill(e, byPlayer) {
    e.dead = true;
    const T = TYPES[e.type];
    if (byPlayer) {
      const pts = e.state === "form" ? T.pts : T.dive;
      this.score += pts;
      if (e.type === "boss" && Math.random() < 0.45) this.drops.push({ x: e.x, y: e.y, kind: Math.random() < 0.6 ? "S" : "O" });
    }
    this.burst(e.x, e.y, [C.amber, T.fg, C.paper]);
    this.enemies = this.enemies.filter((x) => x !== e);
  }

  hurt() {
    if (this.invuln > 0 || this.dead > 0) return;
    if (this.shield) {
      this.shield = false;
      this.invuln = 1;
      this.burst(this.px, H - 1, [C.sky, C.paper], 6);
      return;
    }
    this.lives--;
    this.spread = 0;
    this.dead = 1.4;
    this.burst(this.px, H - 1, [C.thread, C.amber, C.paper], 14);
  }

  draw(scr, ox, oy) {
    const put = (x, y, str, fg, a) => this.put(scr, ox, oy, x, y, str, fg, a);
    for (const s of this.stars) put(Math.floor(s.x), s.y, ".", s.layer ? C.dim : C.faint);

    for (const e of this.enemies) {
      if (e.state === "wait" || e.y < 0) continue;
      const T = TYPES[e.type];
      const f = T.frames[Math.floor(this.t * 3 + e.wobble) % 2];
      const fg = e.hp < T.hp ? T.hit : T.fg;
      put(Math.round(e.x) - 1, e.y, f, fg, e.type === "boss" ? BOLD : 0);
    }
    for (const b of this.bullets) put(b.x, b.y, "|", C.paper, BOLD);
    for (const s of this.shots) put(s.x, s.y, ":", C.threadHi);
    for (const d of this.drops) {
      const on = Math.floor(this.t * 6) % 2;
      put(Math.round(d.x) - 1, d.y, `[${d.kind}]`, on ? (d.kind === "S" ? C.amber : C.sky) : C.paper, BOLD);
    }
    for (const p of this.parts) put(p.x, p.y, p.t > 0.3 ? "*" : p.t > 0.15 ? "+" : ".", p.fg);

    if (this.dead <= 0 && !(this.invuln > 0 && Math.floor(this.t * 10) % 2)) {
      const x = ox + Math.round(this.px) - 1;
      scr.text(x, oy + H - 1, "/", C.paper);
      scr.set(x + 1, oy + H - 1, "▲", C.thread, undefined, BOLD);
      scr.set(x + 2, oy + H - 1, "\\", C.paper);
      if (this.shield) {
        scr.set(x - 1, oy + H - 1, "(", C.sky);
        scr.set(x + 3, oy + H - 1, ")", C.sky);
      }
    }

    if (this.banner) {
      const t = this.banner.text;
      scr.text(ox + Math.floor((W - t.length) / 2), oy + Math.floor(H / 2) + 1, t, C.paper, BOLD);
    }
  }
}

/** Arcade preview: a little formation sways while the ship pot-shots. */
export function preview(scr, x, y, w, h, t) {
  for (let i = 0; i < 18; i++) scr.set(x + ((i * 37) % w), y + ((i * 13 + Math.floor(t * (i % 2 ? 6 : 2))) % h), ".", i % 2 ? C.dim : C.faint);
  const sway = Math.round(Math.sin(t * 1.2) * 3);
  const rows = [["boss", 3], ["moth", 5], ["bee", 6]];
  rows.forEach(([type, n], r) => {
    const T = TYPES[type];
    const span = (n - 1) * 5;
    for (let i = 0; i < n; i++) scr.text(x + Math.floor(w / 2 - span / 2) + i * 5 + sway - 1, y + 1 + r * 2, T.frames[Math.floor(t * 3) % 2], T.fg);
  });
  const sx = x + Math.floor(w / 2 + Math.sin(t * 0.9) * (w / 3));
  scr.text(sx - 1, y + h - 1, "/", C.paper);
  scr.set(sx, y + h - 1, "▲", C.thread);
  scr.set(sx + 1, y + h - 1, "\\", C.paper);
  const by = y + h - 2 - Math.floor((t * 14) % (h - 2));
  scr.set(sx, by, "|", C.paper);
}
