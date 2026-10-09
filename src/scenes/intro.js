// The welcome: the name scramble-decodes, a progress bar loads with some
// self-aware status lines, and the sakura tree grows in the corner.
// Any key skips straight to home.

import { C, ease } from "../theme.js";
import { BOLD } from "../engine/screen.js";
import { scramble, bigText, Typewriter } from "../fx/text.js";
import { Home } from "./home.js";

const LOGO = bigText("RITESH");
const LOGO_W = [...LOGO[0]].length;

const STATUS = [
  "untangling the red thread…",
  "brewing chai…",
  "convincing the petals to fall…",
  "hiding the bugs under the rug…",
  "asking the dragon nicely…",
  "polishing pixels…",
  "compiling charm…",
  "warming up the arcade…",
];

const DONE = 4.1; // seconds until "ready"
const AUTO = 5.4; // seconds until home on its own

/* The bar stalls and lurches like a real one. */
function barProgress(t) {
  const x = Math.max(0, Math.min(1, (t - 1.1) / (DONE - 1.3)));
  const stall = x < 0.55 ? x * 1.1 : x < 0.7 ? 0.605 + (x - 0.55) * 0.2 : 0.635 + (x - 0.7) * 1.217;
  return Math.min(1, ease(stall));
}

export class Intro {
  constructor() {
    this.t = 0;
    this.sub = new Typewriter("loading Ritesh-sama's profile", 30);
    this.status = [...STATUS].sort(() => Math.random() - 0.5);
  }

  enter(app) {
    app.backdrop.growth = 0;
    app.backdrop.petalsOn = false;
  }

  key(k, app) {
    this.finish(app);
  }

  finish(app) {
    app.backdrop.growth = 1;
    app.backdrop.petalsOn = true;
    app.replace(new Home());
  }

  update(dt, app) {
    this.t += dt;
    if (this.t > 0.9) this.sub.update(dt);
    app.backdrop.growth = ease((this.t - 0.5) / 3.4);
    if (this.t > 2.6) app.backdrop.petalsOn = true;
    if (this.t > AUTO) this.finish(app);
  }

  render(scr, app) {
    const { t } = this;
    app.backdrop.render(scr);
    const x0 = logoX(app);
    const y0 = logoY(app);

    // Logo: solid strokes in red, the shadow in a quiet grey.
    const p = Math.min(1, t / 1.4);
    LOGO.forEach((row, r) => {
      const s = scramble(row, p);
      let i = 0;
      for (const c of s) {
        if (c !== " ") {
          const settled = c === [...row][i];
          const fg = !settled ? C.blossomDeep : c === "█" ? (r < 2 ? C.threadHi : C.thread) : C.faint;
          scr.set(x0 + i, y0 + r, c, fg);
        }
        i++;
      }
    });

    let y = y0 + 8;
    if (t > 0.9) {
      const dots = this.sub.done ? ".".repeat(1 + (Math.floor(t * 3) % 3)) : "";
      const n = scr.text(x0, y, this.sub.visible, C.paper, BOLD);
      scr.text(x0 + n, y, dots, C.sakura);
      if (!this.sub.done && Math.floor(t * 6) % 2) scr.set(x0 + n, y, "▌", C.thread);
    }

    if (t > 1.1) {
      const barW = Math.min(28, LOGO_W - 8);
      const prog = barProgress(t);
      const fill = Math.round(prog * barW);
      for (let i = 0; i < barW; i++) scr.set(x0 + i, y + 2, i < fill ? "━" : "─", i < fill ? C.thread : C.faint);
      scr.text(x0 + barW + 2, y + 2, `${String(Math.round(prog * 100)).padStart(3)}%`, C.amber);

      const line = t >= DONE ? "ready. press any key ✿" : this.status[Math.floor((t - 1.1) / 0.55) % this.status.length];
      const blink = t >= DONE && Math.floor(t * 2) % 2 === 0;
      scr.text(x0, y + 3, line, t >= DONE ? (blink ? C.sakura : C.paper) : C.dim);
    }
  }
}

/* Shared with Home so the logo doesn't jump when the intro hands over. */
export function logoX(app) {
  return Math.max(3, Math.round(app.w * 0.06));
}
export function logoY(app) {
  return app.h >= 30 ? Math.round(app.h * 0.12) : 1;
}
export { LOGO, LOGO_W };
