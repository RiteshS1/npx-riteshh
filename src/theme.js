// Palette, borrowed from riteshh.in's tokens. The terminal's own background
// stays put; everything here is a foreground unless a scene says otherwise.

export const C = {
  thread: "#C8102E", // the red thread: brand, selection, danger
  threadHi: "#E8334F",
  sakura: "#FFB7C5",
  blossom: "#F48FB1",
  blossomDeep: "#D86A8E",
  amber: "#F5A524",
  paper: "#F2EEE6",
  text: "#D9D4CC",
  dim: "#8A8580",
  faint: "#4E4A47",
  ink: "#0A0A0A",
  bark: "#8B6450",
  barkDark: "#5E4235",
  moss: "#8FBF7F",
  sky: "#8FB8DE",
};

/** Random pick helper used everywhere. */
export const pick = (arr, rnd = Math.random) => arr[Math.floor(rnd() * arr.length)];

/** Small seeded PRNG (mulberry32) so trees and maps can be reproducible. */
export function rng(seed = Date.now()) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const ease = (t) => 1 - (1 - clamp(t, 0, 1)) ** 3; // easeOutCubic

/** Word-wrap plain text to a width. */
export function wrap(text, width) {
  const out = [];
  for (const para of String(text).split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/)) {
      if (!word) continue;
      if (!line) line = word;
      else if (line.length + 1 + word.length <= width) line += " " + word;
      else {
        out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

/** Centre x for a string of length n on a screen of width w. */
export const cx = (w, n) => Math.max(0, Math.floor((w - n) / 2));
