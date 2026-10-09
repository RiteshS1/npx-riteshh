// The compact business card: printed for pipes, NO_COLOR, --card, and on
// the way out of the interactive session so the links stay in scrollback.
// Same layout as v1 and the site's footer preview.

import { sgrColor } from "./engine/color.js";
import { C } from "./theme.js";

export function renderCard(profile, level) {
  const esc = (code) => (s) => (level > 0 && code ? `\x1b[${code}m${s}\x1b[0m` : s);
  const thread = esc(sgrColor(C.thread, level));
  const sakura = esc(sgrColor(C.sakura, level));
  const bold = esc("1");
  const dim = esc("2");
  const ital = esc("3");

  const site = profile.website.replace(/^https?:\/\//, "");

  /* Rows as [plain, styled]; widths come from the plain text so the box
   * stays aligned whatever the escapes add. */
  const rows = [
    [`${profile.name}  ·  ${site}`, `${bold(profile.name)}  ${dim("·")}  ${thread(site)}`],
    [profile.role, profile.role],
    [profile.tagline, ital(dim(profile.tagline))],
    ["", ""],
    ...profile.card.map(([k, v]) => {
      const key = k.padEnd(9);
      return [`${key}${v}`, `${dim(key)}${v}`];
    }),
    ["", ""],
    ["shh… let's build something.", `${thread("shh…")} ${dim("let's build something.")}`],
  ];

  const w = Math.max(...rows.map(([plain]) => [...plain].length)) + 4;
  const line = (plain, styled) => `${thread("│")}  ${styled}${" ".repeat(w - 2 - [...plain].length)}${thread("│")}`;
  const hint = level > 0 ? `\n  ${dim("run")} ${sakura("npx riteshh")} ${dim("in a terminal for the full thing ✿")}\n` : "";

  return ["", thread(`╭${"─".repeat(w)}╮`), ...rows.map(([p, s]) => line(p, s)), thread(`╰${"─".repeat(w)}╯`), ""].join("\n") + "\n" + hint;
}
