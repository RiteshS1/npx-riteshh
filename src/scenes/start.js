// Resolve a scene name to the starting scene stack.
//   intro · home · profile:<tab> · arcade · game:<id> · outro

import { Intro } from "./intro.js";
import { Home } from "./home.js";
import { Profile } from "./profile.js";
import { Arcade } from "./arcade.js";
import { Outro } from "./outro.js";
import { GAMES } from "../games/index.js";

export function startScene(app, name) {
  const [kind, arg] = name.split(":");
  switch (kind) {
    case "home":
      return app.push(new Home());
    case "profile":
      app.push(new Home());
      return app.push(new Profile(arg));
    case "arcade":
      app.push(new Home());
      return app.push(new Arcade());
    case "game": {
      const g = GAMES.find((g) => g.id === arg);
      if (!g) {
        app.push(new Home());
        app.push(new Arcade());
        return app.notify(`no game called "${arg}", here's the arcade`, 3);
      }
      // Leaving the game lands in the arcade.
      app.push(new Home());
      app.push(new Arcade());
      return app.push(g.make());
    }
    case "outro":
      return app.push(new Outro());
    default:
      return app.push(new Intro());
  }
}
