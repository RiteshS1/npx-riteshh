// The arcade: pick a game, see it move in the preview window, press enter.

import { C } from "../theme.js";
import { BOLD } from "../engine/screen.js";
import { dirOf } from "../engine/input.js";
import { GAMES } from "../games/index.js";

export class Arcade {
  constructor() {
    this.sel = 0;
    this.t = 0;
  }

  enter(app) {
    app.backdrop.petalsOn = true;
  }

  key(k, app) {
    const d = dirOf(k);
    if (d === "up") this.sel = (this.sel + GAMES.length - 1) % GAMES.length;
    else if (d === "down") this.sel = (this.sel + 1) % GAMES.length;
    else if (k.name === "enter" || k.name === "space" || d === "right") app.push(GAMES[this.sel].make());
    else if (/^[1-9]$/.test(k.name) && GAMES[Number(k.name) - 1]) app.push(GAMES[Number(k.name) - 1].make());
    else if (k.name === "escape" || k.name === "q" || d === "left" || k.name === "backspace") app.pop();
  }

  update(dt) {
    this.t += dt;
  }

  render(scr, app) {
    app.backdrop.render(scr, { tree: false });
    const W = Math.min(app.w - 6, 96);
    const x0 = Math.max(3, Math.floor((app.w - W) / 2));
    let y = Math.max(1, Math.floor((app.h - 20) / 2));

    let x = x0;
    x += scr.text(x, y, "~/", C.faint);
    x += scr.text(x, y, app.profile.handle, C.thread);
    scr.text(x, y, " / arcade", C.dim);
    scr.text(x0, y + 2, "insert coin", C.paper, BOLD);
    scr.text(x0 + 12, y + 2, "(it's free, scores reset every run)", C.faint);
    y += 4;

    // List on the left.
    const listW = 34;
    GAMES.forEach((g, i) => {
      const on = i === this.sel;
      const row = y + i * 3;
      if (on) scr.set(x0, row, "›", C.thread, undefined, BOLD);
      scr.text(x0 + 2, row, g.title, on ? C.paper : C.text, on ? BOLD : 0);
      scr.text(x0 + 2, row + 1, g.blurb.slice(0, listW - 2), on ? C.dim : C.faint);
    });

    // Preview window on the right.
    const g = GAMES[this.sel];
    const px = x0 + listW + 2;
    const pw = Math.min(W - listW - 2, 50);
    const ph = 12;
    scr.fill(px, y, pw, ph, " ");
    scr.box(px, y, pw, ph, C.faint);
    scr.text(px + 2, y, ` ${g.title} `, C.sakura);
    g.preview(scr, px + 2, y + 1, pw - 4, ph - 2, this.t);
    scr.text(px, y + ph + 1, g.controls, C.dim);

    const foot = Math.max(y + GAMES.length * 3, y + ph + 3);
    scr.text(x0, Math.min(app.h - 2, foot), "↑↓ choose   enter play   esc back", C.faint);
  }
}
