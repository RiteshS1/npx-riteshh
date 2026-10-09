#!/usr/bin/env node
// Regenerate data/profile.json from the portfolio's content/profile.json, so
// the CLI and riteshh.in never drift apart. Runs on prepublishOnly.
//
//   node scripts/sync-profile.mjs [path/to/profile.json]
//
// If the source can't be found (e.g. publishing from a lone checkout) the
// existing data/profile.json is kept and a warning is printed.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(process.argv[2] || process.env.PROFILE_JSON || resolve(here, "../../../portfolio2026/content/profile.json"));
const out = resolve(here, "../data/profile.json");

if (!existsSync(src)) {
  console.warn(`sync-profile: ${src} not found; keeping existing data/profile.json`);
  process.exit(0);
}

const p = JSON.parse(readFileSync(src, "utf8"));
const host = (url) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

// Only what the CLI shows. The phone number stays off a public npm package.
const data = {
  name: p.name,
  handle: p.handle,
  role: p.role,
  tagline: p.tagline,
  website: "https://riteshh.in",
  location: p.location,
  openToWork: p.openToWork,
  summary: p.summary,
  pullQuote: p.pullQuote,
  contact: {
    email: p.contact.email,
    booking: p.contact.bookingUrl,
    resume: p.resumeUrl,
  },
  socials: p.socials.map(({ label, url }) => ({ label, url })),
  experience: p.experience.map(({ role, company, location, start, end, bullets }) => ({ role, company, location, start, end, bullets })),
  projects: p.projects.map(({ title, summary, stack, live, github, caseStudy }) => ({ title, summary, stack, live, github, caseStudy })),
  showcase: p.showcase.map(({ title, date, place, blurb }) => ({ title, date, place, blurb })),
  skills: p.skills,
  tools: p.tools,
  languages: p.spokenLanguages,
  education: p.education,
};

// The compact card printed by `--card`, pipes and on exit.
data.card = [
  ["web", host(data.website)],
  ["mail", data.contact.email],
  ...data.socials.filter((s) => s.label !== "X").map((s) => [s.label.toLowerCase(), host(s.url).replace(/^www\./, "")]),
  ["book", host(data.contact.booking)],
];

writeFileSync(out, JSON.stringify(data, null, 2) + "\n");
console.log(`sync-profile: wrote ${out}`);
