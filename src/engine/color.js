// Colour capability detection and hex → SGR conversion.
// Level 0 = none, 1 = 16 colours, 2 = 256 colours, 3 = truecolor.

export function detectColorLevel(stream = process.stdout, env = process.env) {
  if (!stream.isTTY || "NO_COLOR" in env || env.TERM === "dumb") return 0;
  if (/truecolor|24bit/i.test(env.COLORTERM || "")) return 3;
  // Terminals that support truecolor but don't advertise it via COLORTERM.
  if (["iTerm.app", "WezTerm", "vscode", "ghostty"].includes(env.TERM_PROGRAM)) return 3;
  if (env.WT_SESSION) return 3; // Windows Terminal
  if (/-256(color)?$/i.test(env.TERM || "")) return 2;
  if (env.TERM_PROGRAM === "Apple_Terminal") return 2;
  return 1;
}

const cache = new Map();

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]) {
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

/** Linear blend between two hex colours, t in [0, 1]. */
export function mix(a, b, t) {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex(x.map((v, i) => Math.round(v + (y[i] - v) * t)));
}

/* xterm 256: 6×6×6 cube (16–231) and a 24-step grey ramp (232–255). */
const CUBE = [0, 95, 135, 175, 215, 255];
function to256([r, g, b]) {
  const idx = (v) => (v < 48 ? 0 : v < 115 ? 1 : Math.floor((v - 35) / 40));
  const [ri, gi, bi] = [idx(r), idx(g), idx(b)];
  const cubeDist = (CUBE[ri] - r) ** 2 + (CUBE[gi] - g) ** 2 + (CUBE[bi] - b) ** 2;
  const avg = Math.round((r + g + b) / 3);
  const gi2 = avg > 238 ? 23 : Math.max(0, Math.round((avg - 8) / 10));
  const grey = 8 + gi2 * 10;
  const greyDist = (grey - r) ** 2 + (grey - g) ** 2 + (grey - b) ** 2;
  return greyDist < cubeDist ? 232 + gi2 : 16 + 36 * ri + 6 * gi + bi;
}

/* The 16 ANSI colours, approximated with xterm defaults. */
const ANSI16 = [
  [0, 0, 0], [205, 0, 0], [0, 205, 0], [205, 205, 0], [0, 0, 238], [205, 0, 205], [0, 205, 205], [229, 229, 229],
  [127, 127, 127], [255, 0, 0], [0, 255, 0], [255, 255, 0], [92, 92, 255], [255, 0, 255], [0, 255, 255], [255, 255, 255],
];
function to16(rgb) {
  let best = 0;
  let bestD = Infinity;
  ANSI16.forEach((c, i) => {
    const d = (c[0] - rgb[0]) ** 2 + (c[1] - rgb[1]) ** 2 + (c[2] - rgb[2]) ** 2;
    if (d < bestD) [best, bestD] = [i, d];
  });
  return best;
}

/** SGR parameter string for a foreground (bg=false) or background colour. */
export function sgrColor(hex, level, bg = false) {
  const key = `${hex}${level}${bg}`;
  let v = cache.get(key);
  if (v !== undefined) return v;
  const rgb = hexToRgb(hex);
  if (level >= 3) v = `${bg ? 48 : 38};2;${rgb[0]};${rgb[1]};${rgb[2]}`;
  else if (level === 2) v = `${bg ? 48 : 38};5;${to256(rgb)}`;
  else if (level === 1) {
    const i = to16(rgb);
    v = String((bg ? 40 : 30) + (i % 8) + (i >= 8 ? 60 : 0));
  } else v = "";
  cache.set(key, v);
  return v;
}
