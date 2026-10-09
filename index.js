#!/usr/bin/env node
// `npx riteshh`: Ritesh Sharma in your terminal.
// Zero dependencies. Interactive in a colour TTY; the plain card everywhere else.

import { readFileSync } from "node:fs";
import { detectColorLevel } from "./src/engine/color.js";
import { renderCard } from "./src/card.js";

const profile = JSON.parse(readFileSync(new URL("./data/profile.json", import.meta.url), "utf8"));
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

const HELP = `
  npx riteshh            the full thing: intro, profile, arcade
  npx riteshh --card     just the business card
  npx riteshh --fast     skip the intro
  npx riteshh --play <game>   straight to a game: snake, galaga, dungeon, dragon

  keys: arrows / wasd / hjkl move, enter select, esc back, q quit
`;

if (flag("help") || flag("h")) {
  process.stdout.write(HELP);
  process.exit(0);
}

const level = detectColorLevel();
const snap = opt("snapshot");
const interactive = level > 0 && process.stdin.isTTY && !flag("card");

if (!interactive && !snap) {
  process.stdout.write(renderCard(profile, level));
  process.exit(0);
}

const { App, snapshot } = await import("./src/engine/loop.js");
const { Backdrop } = await import("./src/fx/sakura.js");
const { startScene } = await import("./src/scenes/start.js");

const setup = (app) => {
  app.profile = profile;
  app.backdrop = new Backdrop(app.w, app.h);
};

if (snap) {
  // Hidden dev aid: render a scene headlessly and print its last frame.
  //   --snapshot <scene> [--frames n] [--size WxH] [--keys "down,down,enter;space"]
  const [w, h] = (opt("size") || "80x24").split("x").map(Number);
  const { parseKeys } = await import("./src/engine/input.js");
  const named = { up: "\x1b[A", down: "\x1b[B", right: "\x1b[C", left: "\x1b[D", enter: "\r", space: " ", esc: "\x1b", tab: "\t" };
  const keys = (opt("keys") || "")
    .split(";")
    .filter(Boolean)
    .map((frame) => frame.split(",").flatMap((k) => parseKeys(named[k] ?? k)));
  const out = snapshot(
    (app) => {
      setup(app);
      startScene(app, snap);
    },
    { w, h, frames: Number(opt("frames") || 90), keys },
  );
  process.stdout.write(out + "\n");
  process.exit(0);
}

const { createTerm } = await import("./src/engine/term.js");
const app = new App({ term: createTerm(), level, fast: flag("fast") });
setup(app);
startScene(app, opt("play") ? `game:${opt("play")}` : flag("fast") ? "home" : "intro");
await app.run();
process.stdout.write(renderCard(profile, level));
process.exit(0);
