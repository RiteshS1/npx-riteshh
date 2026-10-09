// Home: the name, a short menu, and the sakura tree doing its thing.

import { C } from "../theme.js";
import { BOLD, ITALIC } from "../engine/screen.js";
import { dirOf } from "../engine/input.js";
import { LOGO, logoX, logoY } from "./intro.js";
import { Profile } from "./profile.js";
import { Arcade } from "./arcade.js";
import { Outro } from "./outro.js";

const ITEMS = [
  ["about", "who's this guy"],
  ["experience", "where I've shipped"],
  ["projects", "things I've built"],
  ["skills", "the toolbox"],
  ["arcade", "4 games, zero excuses"],
  ["contact", "say hi"],
  ["exit", "sayonara"],
];

export class Home {
  constructor() {
    this.sel = 0;
    this.slide = ITEMS.map(() => 0); // per-item indent, eased toward target
  }

  enter(app) {
    app.backdrop.growth = 1;
    app.backdrop.petalsOn = true;
  }

  key(k, app) {
    const d = dirOf(k);
    if (d === "up") this.sel = (this.sel + ITEMS.length - 1) % ITEMS.length;
    else if (d === "down") this.sel = (this.sel + 1) % ITEMS.length;
    else if (k.name === "enter" || k.name === "space" || d === "right") this.open(ITEMS[this.sel][0], app);
    else if (/^[1-7]$/.test(k.name)) {
      this.sel = Number(k.name) - 1;
      this.open(ITEMS[this.sel][0], app);
    } else if (k.name === "q" || k.name === "escape") this.open("exit", app);
    else if (k.name === "g") {
      app.backdrop.petals.gust = 4.5;
      app.notify("whoosh ✿");
    }
  }

  open(id, app) {
    if (id === "exit") app.replace(new Outro());
    else if (id === "arcade") app.push(new Arcade());
    else app.push(new Profile(id));
  }

  update(dt) {
    this.slide = this.slide.map((v, i) => v + ((i === this.sel ? 2 : 0) - v) * Math.min(1, dt * 14));
  }

  render(scr, app) {
    const p = app.profile;
    app.backdrop.render(scr);

    const x0 = logoX(app);
    let y = logoY(app);
    LOGO.forEach((row, r) => {
      let i = 0;
      for (const c of row) {
        if (c !== " ") scr.set(x0 + i, y + r, c, c === "█" ? (r < 2 ? C.threadHi : C.thread) : C.faint);
        i++;
      }
    });
    y += 7;

    // Identity lines.
    let x = x0;
    x += scr.text(x, y, p.name, C.paper, BOLD);
    x += scr.text(x, y, "  ·  ", C.faint);
    scr.text(x, y, `@${p.handle}`, C.thread);
    x = x0;
    x += scr.text(x, y + 1, p.role.toLowerCase(), C.text);
    x += scr.text(x, y + 1, "  ·  ", C.faint);
    x += scr.text(x, y + 1, p.location.toLowerCase(), C.dim);
    if (p.openToWork) {
      x += scr.text(x, y + 1, "  ·  ", C.faint);
      // The dot breathes.
      const on = Math.sin(app.time * 3) > -0.3;
      scr.text(x, y + 1, "●", on ? C.moss : C.faint);
      scr.text(x + 2, y + 1, "open to work", C.moss);
    }
    scr.text(x0, y + 2, p.tagline.toLowerCase(), C.sakura, ITALIC);

    // Menu.
    y += app.h >= 30 ? 5 : 4;
    ITEMS.forEach(([label, hint], i) => {
      const on = i === this.sel;
      const ix = x0 + Math.round(this.slide[i]);
      if (on) scr.set(x0, y + i, "›", C.thread, undefined, BOLD);
      scr.text(ix, y + i, label, on ? C.paper : C.text, on ? BOLD : 0);
      scr.text(x0 + 15, y + i, hint, on ? C.dim : C.faint);
    });

    y += ITEMS.length + 1;
    if (y < app.h - 1) scr.text(x0, y, "↑↓ move   enter open   g gust   q quit", C.faint);
  }
}
