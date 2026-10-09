// The arcade's catalogue.

import { Snake, preview as snakePreview } from "./snake.js";

export const GAMES = [
  {
    id: "snake",
    title: "snakey",
    blurb: "the classic. eat, grow, regret.",
    controls: "arrows / wasd steer · t toggles walls",
    make: () => new Snake(),
    preview: snakePreview,
  },
];
