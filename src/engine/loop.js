// The app: a scene stack driven by a fixed ~30fps tick.
//
// A scene is any object with optional hooks:
//   enter(app)              pushed / revealed
//   update(dt, app)         dt in seconds, clamped so a stalled tick can't teleport things
//   render(screen, app)     draw the whole frame (the screen is cleared beforehand)
//   key(key, app)           one parsed key event
//   resize(w, h, app)
//
// Only the top scene updates and renders. Shared ambience (the sakura
// backdrop) lives on app.backdrop and is ticked by the app itself, so
// petals keep drifting while you move between scenes.

import { Screen } from "./screen.js";
import { parseKeys } from "./input.js";

export const FPS = 30;
export const MIN_W = 80;
export const MIN_H = 24;

export class App {
  constructor({ term = null, level = 3, w = 80, h = 24, fast = false } = {}) {
    this.term = term;
    this.level = level;
    this.fast = fast;
    this.screen = new Screen(term ? term.w : w, term ? term.h : h);
    this.stack = [];
    this.backdrop = null;
    this.toast = null; // { text, t }
    this.time = 0;
    this.running = false;
    this.onQuit = null;
  }

  get w() {
    return this.screen.w;
  }
  get h() {
    return this.screen.h;
  }
  get top() {
    return this.stack[this.stack.length - 1];
  }
  get tooSmall() {
    return this.w < MIN_W || this.h < MIN_H;
  }

  push(scene) {
    this.stack.push(scene);
    scene.enter?.(this);
  }

  pop() {
    const s = this.stack.pop();
    s?.exit?.(this);
    if (this.top) this.top.enter?.(this, { returning: true });
    else this.quit();
  }

  replace(scene) {
    const s = this.stack.pop();
    s?.exit?.(this);
    this.push(scene);
  }

  notify(text, seconds = 2.2) {
    this.toast = { text, t: seconds };
  }

  key(k) {
    if (k.ctrl && k.name === "c") return this.quit();
    if (this.tooSmall) return;
    this.top?.key?.(k, this);
  }

  tick(dt) {
    dt = Math.min(dt, 0.1);
    this.time += dt;
    const scr = this.screen;
    scr.clear();
    if (this.tooSmall) {
      drawTooSmall(scr);
      return;
    }
    this.backdrop?.update(dt, this);
    this.top?.update?.(dt, this);
    this.top?.render?.(scr, this);
    if (this.toast) {
      this.toast.t -= dt;
      if (this.toast.t <= 0) this.toast = null;
      else drawToast(scr, this.toast.text);
    }
  }

  resize(w, h) {
    this.screen.resize(w, h);
    this.term?.write("\x1b[2J");
    this.backdrop?.resize?.(w, h, this);
    for (const s of this.stack) s.resize?.(w, h, this);
  }

  run() {
    const { term } = this;
    this.running = true;
    term.enter();
    const onData = (d) => {
      for (const k of parseKeys(d)) this.key(k);
    };
    const onResize = () => this.resize(term.w, term.h);
    process.stdin.on("data", onData);
    process.stdout.on("resize", onResize);

    let last = performance.now();
    const frame = () => {
      if (!this.running) return;
      const now = performance.now();
      this.tick((now - last) / 1000);
      last = now;
      term.write(this.screen.flush(this.level));
      const spent = performance.now() - now;
      this.timer = setTimeout(frame, Math.max(1, 1000 / FPS - spent));
    };
    frame();

    return new Promise((resolve) => {
      this.onQuit = () => {
        process.stdin.off("data", onData);
        process.stdout.off("resize", onResize);
        resolve();
      };
    });
  }

  quit() {
    if (!this.running) {
      this.stopped = true;
      return;
    }
    this.running = false;
    clearTimeout(this.timer);
    this.term.restore();
    this.onQuit?.();
  }
}

/** Headless: run a scene for N frames, feeding keys, and return the last frame as text. */
export function snapshot(build, { w = 80, h = 24, frames = 60, keys = [] } = {}) {
  const app = new App({ w, h, level: 0 });
  build(app);
  const dt = 1 / FPS;
  for (let f = 0; f < frames && !app.stopped && app.top; f++) {
    if (f > 0 && keys[f - 1]) for (const k of keys[f - 1]) app.key(k);
    app.tick(dt);
  }
  return app.screen.toText();
}

function drawTooSmall(scr) {
  const lines = ["make me a little bigger?", `need ${MIN_W}×${MIN_H}, have ${scr.w}×${scr.h}`];
  lines.forEach((l, i) => {
    const x = Math.max(0, Math.floor((scr.w - l.length) / 2));
    scr.text(x, Math.floor(scr.h / 2) - 1 + i, l, i ? "#8A8580" : "#F2EEE6");
  });
}

function drawToast(scr, text) {
  const t = ` ${text} `;
  const x = scr.w - t.length - 2;
  scr.text(x, 0, t, "#0A0A0A", 1, "#F2EEE6");
}
