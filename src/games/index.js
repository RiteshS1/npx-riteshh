// The arcade's catalogue.

import { Snake, preview as snakePreview } from "./snake.js";
import { Galaga, preview as galagaPreview } from "./galaga.js";

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
    blurb: "galaga-style. they dive, you don't.",
    controls: "←→ / a d move · space fire",
    make: () => new Galaga(),
    preview: galagaPreview,
  },
];
