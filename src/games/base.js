// Shared shell for arcade games: ready → play ⇄ paused → over, a framed
// playfield centred on screen, a HUD line, and the overlays. Subclasses
// implement reset(), step(dt), draw(scr, ox, oy) and onKey(k), and set
// this.fieldW / this.fieldH (in terminal cells, inside the frame).
//
// Keys every game shares: p / esc pause, q back to the arcade, r restart
// (when the run is over). Scores are per run and never saved.

import { C, cx } from "../theme.js";
import { BOLD } from "../engine/screen.js";

export class Game {
  constructor() {
    this.t = 0;
    this.state = "ready";
    this.reset();
  }

  // Overridable bits.
  get title() {
    return "game";
  }
  get hud() {
    return []; // rich segments for the left of the HUD line
  }
  readyLines() {
    return ["press space to start"];
  }
  overLines() {
    return [`score ${this.score ?? 0}`];
  }
  overTitle() {
    return null;
  }
  overKeys() {
    return "r again   esc back";
  }
  onReadyKey() {}

  key(k, app) {
    if (k.name === "q") return app.pop();
    const go = k.name === "space" || k.name === "enter";
    switch (this.state) {
      case "ready":
        if (go) this.state = "play";
        else if (k.name === "escape") app.pop();
        else this.onReadyKey(k, app);
        return;
      case "paused":
        if (go || k.name === "p" || k.name === "escape") this.state = "play";
        return;
      case "over":
        if (go || k.name === "r") {
          this.reset();
          this.state = "play";
        } else if (k.name === "escape") app.pop();
        return;
      default:
        if (k.name === "p" || k.name === "escape") this.state = "paused";
        else this.onKey(k, app);
    }
  }

  update(dt, app) {
    this.t += dt;
    if (this.state === "play") this.step(dt, app);
  }

  end() {
    this.state = "over";
  }

  render(scr, app) {
    const W = this.fieldW;
    const H = this.fieldH;
    const ox = cx(app.w, W + 2) + 1;
    const oy = Math.max(2, Math.floor((app.h - H - 3) / 2) + 1);

    // HUD: title on the left, game stats, keys on the right.
    let x = ox - 1;
    x += scr.text(x, oy - 2, this.title, C.thread, BOLD);
    x += 3;
    scr.segs(x, oy - 2, this.hud);
    const keys = this.state === "play" ? "p pause  q quit" : "";
    scr.text(ox + W + 1 - keys.length, oy - 2, keys, C.faint);

    scr.box(ox - 1, oy - 1, W + 2, H + 2, C.faint);
    this.draw(scr, ox, oy, app);

    if (this.state === "ready") this.overlay(scr, ox, oy, [[this.title, C.paper, BOLD], ...this.readyLines(), ["q back", C.faint]]);
    if (this.state === "paused") this.overlay(scr, ox, oy, [["paused", C.paper, BOLD], "space resume   q quit"]);
    if (this.state === "over") this.overlay(scr, ox, oy, [this.overTitle() || ["game over", C.thread, BOLD], ...this.overLines(), [this.overKeys(), C.faint]]);
  }

  /** Draw text clipped to the playfield; x, y are field coordinates. */
  put(scr, ox, oy, x, y, str, fg, attr = 0) {
    y = Math.round(y);
    if (y < 0 || y >= this.fieldH) return;
    let i = 0;
    for (const c of str) {
      const cx = Math.round(x) + i++;
      if (cx >= 0 && cx < this.fieldW && c !== " ") scr.set(ox + cx, oy + y, c, fg, undefined, attr);
    }
  }

  /** Centred box over the field. Lines are strings or [text, fg, attr]. */
  overlay(scr, ox, oy, lines) {
    const rows = lines.map((l) => (typeof l === "string" ? [l, C.text, 0] : l));
    const w = Math.max(...rows.map((r) => [...r[0]].length)) + 6;
    const h = rows.length + 2;
    const x = ox + Math.floor((this.fieldW - w) / 2);
    const y = oy + Math.floor((this.fieldH - h) / 2);
    scr.fill(x, y, w, h, " ");
    scr.box(x, y, w, h, C.dim);
    rows.forEach(([t, fg, a], i) => scr.text(x + Math.floor((w - [...t].length) / 2), y + 1 + i, t, fg, a ?? 0));
  }
}
