// A short goodbye; the business card is printed after the alt screen closes.

import { C, cx } from "../theme.js";
import { BOLD } from "../engine/screen.js";
import { Typewriter } from "../fx/text.js";

export class Outro {
  constructor() {
    this.t = 0;
    this.line = new Typewriter("arigatou. see you around", 26);
  }
  enter(app) {
    app.backdrop.petals.gust = 4.5;
  }
  key(k, app) {
    app.quit();
  }
  update(dt, app) {
    this.t += dt;
    this.line.update(dt);
    if (this.t > (app.fast ? 0.6 : 2.2)) app.quit();
  }
  render(scr, app) {
    app.backdrop.render(scr);
    const y = Math.floor(app.h / 2) - 2;
    const full = "arigatou. see you around ✿";
    const x = cx(app.w, full.length);
    const n = scr.text(x, y, this.line.visible, C.paper, BOLD);
    if (this.line.done) scr.text(x + n + 1, y, "✿", C.sakura);
    const note = "the card's in your scrollback";
    if (this.t > 1) scr.text(cx(app.w, note.length), y + 2, note, C.faint);
  }
}
