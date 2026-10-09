# riteshh

Ritesh Sharma, in your terminal.

```sh
npx riteshh
```

An animated welcome, a sakura tree shedding petals in the corner, the whole
profile (about, experience, projects, skills, contact), and a tiny arcade:

| game | what it is |
| --- | --- |
| **snakey** | the classic. square cells, golden fruit, optional wrap mode |
| **starfall** | galaga-style: formations swoop in, peel off and dive at you |
| **dungeon raid** | a turn-based roguelike: procedural floors, torchlight, loot |
| **rescue the princess** | a three-chapter story game ending in a dragon fight |

```sh
npx riteshh --fast          # skip the intro
npx riteshh --play galaga   # straight to a game: snake, galaga, dungeon, dragon
npx riteshh --card          # just the business card
```

Keys: arrows / wasd / hjkl move · enter select · esc back · q quit.
Needs an 80×24 terminal. Nothing is saved: every run, and every game, starts fresh.

No dependencies: a small diffing ANSI renderer does all the drawing. Colours
adapt to truecolor, 256 or 16-colour terminals; pipes, `NO_COLOR` and dumb
terminals get the plain card.

More at [riteshh.in](https://riteshh.in).

## Maintaining

Profile content comes from the portfolio's `content/profile.json`:

```sh
npm run sync     # regenerate data/profile.json (also runs on prepublishOnly)
npm start        # try it
npm test         # engine + game logic tests
node index.js --snapshot home --size 120x40   # print one headless frame
npm publish      # bump "version" first
```

`--snapshot <scene>` accepts `intro`, `home`, `profile:<tab>`, `arcade`,
`game:<id>` and `outro`, plus `--frames n` and `--keys "down;enter"`.
