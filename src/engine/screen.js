// A cell buffer that renders to the terminal by diffing against the last
// frame, so each tick writes only the cells that changed, in one write().
//
// Every glyph is assumed to be one column wide; the scenes stick to ASCII,
// block and box-drawing characters to keep that true.

import { sgrColor } from "./color.js";

export const BOLD = 1;
export const DIM = 2;
export const ITALIC = 4;
export const UNDERLINE = 8;

export class Screen {
  constructor(w, h) {
    this.resize(w, h);
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    const n = w * h;
    this.ch = new Array(n).fill(" ");
    this.fg = new Array(n).fill(null);
    this.bg = new Array(n).fill(null);
    this.at = new Uint8Array(n);
    // Previous frame; null forces a full repaint.
    this.prev = null;
  }

  clear() {
    this.ch.fill(" ");
    this.fg.fill(null);
    this.bg.fill(null);
    this.at.fill(0);
  }

  /** Set one cell. A bg of undefined keeps the cell's current background. */
  set(x, y, ch, fg = null, bg = undefined, attr = 0) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    this.ch[i] = ch;
    this.fg[i] = fg;
    if (bg !== undefined) this.bg[i] = bg;
    this.at[i] = attr;
  }

  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return " ";
    return this.ch[y * this.w + x];
  }

  /** Write a string; returns the number of columns used. */
  text(x, y, str, fg = null, attr = 0, bg = undefined) {
    let n = 0;
    for (const c of str) {
      if (c !== "\0") this.set(x + n, y, c, fg, bg, attr);
      n++;
    }
    return n;
  }

  /** Write rich segments [[text, fg, attr], ...], clipped to maxW. */
  segs(x, y, segments, maxW = Infinity) {
    let n = 0;
    for (const [t, fg, attr] of segments) {
      for (const c of t) {
        if (n >= maxW) return n;
        this.set(x + n, y, c, fg ?? null, undefined, attr ?? 0);
        n++;
      }
    }
    return n;
  }

  fill(x, y, w, h, ch = " ", fg = null, bg = null) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, ch, fg, bg);
  }

  box(x, y, w, h, fg = null, style = "round") {
    const s = style === "round" ? "╭╮╰╯─│" : style === "double" ? "╔╗╚╝═║" : "┌┐└┘─│";
    this.set(x, y, s[0], fg);
    this.set(x + w - 1, y, s[1], fg);
    this.set(x, y + h - 1, s[2], fg);
    this.set(x + w - 1, y + h - 1, s[3], fg);
    for (let i = 1; i < w - 1; i++) {
      this.set(x + i, y, s[4], fg);
      this.set(x + i, y + h - 1, s[4], fg);
    }
    for (let j = 1; j < h - 1; j++) {
      this.set(x, y + j, s[5], fg);
      this.set(x + w - 1, y + j, s[5], fg);
    }
  }

  /** Build the escape sequence string that turns the previous frame into this one. */
  flush(level) {
    const { w, h, ch, fg, bg, at } = this;
    const n = w * h;
    const prev = this.prev;
    let out = "";
    let cursor = -1; // index the terminal cursor sits at
    let style = null; // last emitted style key

    for (let i = 0; i < n; i++) {
      if (prev && prev.ch[i] === ch[i] && prev.fg[i] === fg[i] && prev.bg[i] === bg[i] && prev.at[i] === at[i]) continue;
      // The bottom-right cell would scroll some terminals; leave it alone.
      if (i === n - 1) continue;
      if (cursor !== i) out += `\x1b[${Math.floor(i / w) + 1};${(i % w) + 1}H`;
      const key = `${fg[i]}|${bg[i]}|${at[i]}`;
      if (key !== style) {
        out += sgr(fg[i], bg[i], at[i], level);
        style = key;
      }
      out += ch[i];
      cursor = i + 1;
    }

    if (out) out += "\x1b[0m";
    this.prev = {
      ch: ch.slice(),
      fg: fg.slice(),
      bg: bg.slice(),
      at: at.slice(),
    };
    return out;
  }

  /** Plain-text dump of the buffer, for snapshots and tests. */
  toText() {
    const lines = [];
    for (let y = 0; y < this.h; y++) lines.push(this.ch.slice(y * this.w, (y + 1) * this.w).join("").replace(/\s+$/, ""));
    return lines.join("\n");
  }
}

function sgr(fg, bg, attr, level) {
  const p = ["0"];
  if (attr & BOLD) p.push("1");
  if (attr & DIM) p.push("2");
  if (attr & ITALIC) p.push("3");
  if (attr & UNDERLINE) p.push("4");
  if (level > 0) {
    if (fg) p.push(sgrColor(fg, level));
    if (bg) p.push(sgrColor(bg, level, true));
  }
  return `\x1b[${p.join(";")}m`;
}
