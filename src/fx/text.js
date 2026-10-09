// Text effects: scramble-decode and typewriter.

const NOISE = "!<>-_\\/[]{}=+*^?#░▒▓";

/**
 * Scramble-decode: characters settle left to right as progress goes 0 → 1;
 * unsettled ones flicker through noise. Spaces stay spaces.
 */
export function scramble(target, progress, rnd = Math.random) {
  const chars = [...target];
  const n = chars.length;
  return chars
    .map((c, i) => {
      if (c === " ") return c;
      const settleAt = (i / n) * 0.8 + 0.2 * ((i * 7919) % 13) / 13;
      if (progress >= settleAt) return c;
      if (progress < settleAt - 0.35) return " ";
      return NOISE[Math.floor(rnd() * NOISE.length)];
    })
    .join("");
}

export class Typewriter {
  /** @param {string} text  @param {number} cps characters per second */
  constructor(text, cps = 40) {
    this.text = text;
    this.cps = cps;
    this.t = 0;
  }
  update(dt) {
    this.t += dt;
  }
  get count() {
    return Math.min(this.text.length, Math.floor(this.t * this.cps));
  }
  get visible() {
    return this.text.slice(0, this.count);
  }
  get done() {
    return this.count >= this.text.length;
  }
  skip() {
    this.t = this.text.length / this.cps + 1;
  }
}

/**
 * ANSI Shadow block letters for the intro. Solid ("█") and shadow strokes are
 * coloured separately by the caller.
 */
const FONT = {
  R: ["██████╗ ", "██╔══██╗", "██████╔╝", "██╔══██╗", "██║  ██║", "╚═╝  ╚═╝"],
  I: ["██╗", "██║", "██║", "██║", "██║", "╚═╝"],
  T: ["████████╗", "╚══██╔══╝", "   ██║   ", "   ██║   ", "   ██║   ", "   ╚═╝   "],
  E: ["███████╗", "██╔════╝", "█████╗  ", "██╔══╝  ", "███████╗", "╚══════╝"],
  S: ["███████╗", "██╔════╝", "███████╗", "╚════██║", "███████║", "╚══════╝"],
  H: ["██╗  ██╗", "██║  ██║", "███████║", "██╔══██║", "██║  ██║", "╚═╝  ╚═╝"],
};

export function bigText(word) {
  const rows = ["", "", "", "", "", ""];
  for (const ch of word) for (let r = 0; r < 6; r++) rows[r] += FONT[ch][r];
  return rows;
}
