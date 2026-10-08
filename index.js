#!/usr/bin/env node
// `npx riteshh` — Ritesh Sharma's business card in your terminal.
// Zero dependencies: raw ANSI escapes, plain text when piped or NO_COLOR is set.
"use strict";

const card = require("./card.json");

const out = process.stdout;
const color = out.isTTY && !("NO_COLOR" in process.env) && process.env.TERM !== "dumb";
const truecolor = /truecolor|24bit/i.test(process.env.COLORTERM || "");

const esc = (code) => (s) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);
const thread = color ? (truecolor ? esc("38;2;200;16;46") : esc("38;5;160")) : (s) => s;
const bold = esc("1");
const dim = esc("2");
const ital = esc("3");

/* Rows as [plain text, styled text]; widths come from the plain text so the
 * box stays aligned whatever the escapes add. Same layout as the site's
 * footer preview (components/personal/footer/Terminal.tsx → cardLines). */
const rows = [
  [`${card.name}  ·  @${card.handle}`, `${bold(card.name)}  ${dim("·")}  ${thread(`@${card.handle}`)}`],
  [card.role, card.role],
  [card.tagline, ital(dim(card.tagline))],
  ["", ""],
  ...card.rows.map(([k, v]) => {
    const key = k.padEnd(9);
    return [`${key}${v}`, `${dim(key)}${v}`];
  }),
  ["", ""],
  ["shh… let's build something.", `${thread("shh…")} ${dim("let's build something.")}`],
];

const w = Math.max(...rows.map(([plain]) => [...plain].length)) + 4;
const line = (plain, styled) => `${thread("│")}  ${styled}${" ".repeat(w - 2 - [...plain].length)}${thread("│")}`;

out.write(
  [
    "",
    thread(`╭${"─".repeat(w)}╮`),
    ...rows.map(([p, s]) => line(p, s)),
    thread(`╰${"─".repeat(w)}╯`),
    "",
  ].join("\n") + "\n",
);
