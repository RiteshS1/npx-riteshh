# riteshh

Ritesh Sharma's business card, in your terminal.

```sh
npx riteshh
```

No dependencies. Colours follow your terminal (`NO_COLOR` and pipes get plain text).
More at [riteshh.in](https://riteshh.in).

## Maintaining

The card is generated from the site's `content/profile.json`:

```sh
pnpm card                      # from the portfolio root: regenerate card.json
node packages/npx-riteshh      # preview
cd packages/npx-riteshh && npm publish   # bump "version" first
```
