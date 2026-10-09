// The arcade's catalogue.

import { Snake, preview as snakePreview } from "./snake.js";
import { Galaga, preview as galagaPreview } from "./galaga.js";
import { Dungeon, preview as dungeonPreview } from "./dungeon.js";
import { Dragon, preview as dragonPreview } from "./dragon.js";

export const GAMES = [
  {
    id: "snake",
    title: "snakey",
    blurb: "the classic. eat, grow, regret.",
    controls: "arrows / wasd steer · t toggles walls",
    make: () => new Snake(),
    preview: snakePreview,
  },
  {
    id: "galaga",
    title: "starfall",
    blurb: "galaga-ish. dodge, then shoot.",
    controls: "←→ / a d move · space fire",
    make: () => new Galaga(),
    preview: galagaPreview,
  },
  {
    id: "dungeon",
    title: "dungeon raid",
    blurb: "roguelike. how deep can you go?",
    controls: "arrows / wasd move · bump to attack · e potion",
    make: () => new Dungeon(),
    preview: dungeonPreview,
  },
  {
    id: "dragon",
    title: "rescue the princess",
    blurb: "a story, a bridge, a dragon.",
    controls: "arrows / wasd move · space talk / throw",
    make: () => new Dragon(),
    preview: dragonPreview,
  },
];
