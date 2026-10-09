// The profile, as tabs: about · experience · projects · skills · contact.
// Each tab builds a list of rich lines ([[text, fg, attr], ...]) for the
// current width; the view scrolls them. Projects and contact have a cursor.

import { C, wrap, clamp } from "../theme.js";
import { BOLD, ITALIC, UNDERLINE } from "../engine/screen.js";
import { dirOf } from "../engine/input.js";
import { openUrl } from "../open.js";

const TABS = ["about", "experience", "projects", "skills", "contact"];
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const fmtDate = (s) => {
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : s.toLowerCase();
};
const host = (url) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/^mailto:/, "").replace(/\/$/, "");

export class Profile {
  constructor(tab = "about") {
    this.tab = Math.max(0, TABS.indexOf(tab));
    this.scroll = 0;
    this.sel = 0;
  }

  enter(app) {
    app.backdrop.petalsOn = true;
  }

  get id() {
    return TABS[this.tab];
  }

  switchTab(d) {
    this.tab = (this.tab + d + TABS.length) % TABS.length;
    this.scroll = 0;
    this.sel = 0;
  }

  key(k, app) {
    const d = dirOf(k);
    if (k.name === "escape" || k.name === "q" || k.name === "backspace") return app.pop();
    if (d === "left") return this.switchTab(-1);
    if (d === "right" || k.name === "tab") return this.switchTab(1);
    if (/^[1-5]$/.test(k.name)) {
      this.tab = Number(k.name) - 1;
      this.scroll = 0;
      this.sel = 0;
      return;
    }

    const items = this.items(app);
    if (items) {
      if (d === "up") this.sel = Math.max(0, this.sel - 1);
      if (d === "down") this.sel = Math.min(items.length - 1, this.sel + 1);
      if (k.name === "enter" || k.name === "space") this.go(items[this.sel].url, app);
      if (k.name === "g" && this.id === "projects") this.go(app.profile.projects[this.sel].github, app);
      return;
    }
    if (d === "up") this.scroll--;
    if (d === "down") this.scroll++;
    if (k.name === "pagedown" || k.name === "space") this.scroll += 10;
    if (k.name === "pageup") this.scroll -= 10;
  }

  go(url, app) {
    if (!url) return;
    app.notify(openUrl(url) ? `opening ${host(url).slice(0, 40)}` : "couldn't open a browser");
  }

  /** Selectable rows for the current tab, or null for plain scrolling tabs. */
  items(app) {
    const p = app.profile;
    if (this.id === "projects") return p.projects.map((pr) => ({ label: pr.title, url: pr.live || pr.github }));
    if (this.id === "contact") return contactItems(p);
    return null;
  }

  render(scr, app) {
    const p = app.profile;
    app.backdrop.render(scr, { tree: false });

    const W = Math.min(app.w - 8, 100);
    const x0 = Math.max(3, Math.floor((app.w - W) / 2));
    let y = 1;

    // Breadcrumb + tabs.
    let x = x0;
    x += scr.text(x, y, "~/", C.faint);
    x += scr.text(x, y, p.handle, C.thread);
    scr.text(x, y, ` / ${this.id}`, C.dim);
    y += 2;
    x = x0;
    TABS.forEach((t, i) => {
      const on = i === this.tab;
      scr.text(x, y, t, on ? C.paper : C.dim, on ? BOLD : 0);
      if (on) for (let j = 0; j < t.length; j++) scr.set(x + j, y + 1, "━", C.thread);
      x += t.length + 4;
    });
    for (let j = 0; j < W; j++) if (scr.get(x0 + j, y + 1) === " ") scr.set(x0 + j, y + 1, "─", C.faint);
    y += 3;

    const top = y;
    const bottom = app.h - 3;
    const viewH = bottom - top;
    const lines = this.build(p, W, app);

    // Keep the cursor in view on selectable tabs.
    if (this.cursorLine != null) {
      if (this.cursorLine < this.scroll) this.scroll = this.cursorLine;
      if (this.cursorLine >= this.scroll + viewH) this.scroll = this.cursorLine - viewH + 1;
    }
    this.scroll = clamp(this.scroll, 0, Math.max(0, lines.length - viewH));
    for (let i = 0; i < viewH && i + this.scroll < lines.length; i++) {
      const line = lines[i + this.scroll];
      scr.segs(x0, top + i, line, W);
    }

    // Scroll hint + keys.
    if (lines.length > viewH) {
      const pct = Math.round((this.scroll / Math.max(1, lines.length - viewH)) * 100);
      scr.text(x0 + W - 6, bottom + 1, `${String(pct).padStart(3)}%`, C.faint);
    }
    const keys = this.items(app)
      ? `←→ tabs   ↑↓ select   enter open${this.id === "projects" ? "   g github" : ""}   esc back`
      : "←→ tabs   ↑↓ scroll   esc back";
    scr.text(x0, bottom + 1, keys, C.faint);
  }

  /* ── tab content ─────────────────────────────────────────────────────── */

  build(p, W, app) {
    this.cursorLine = null;
    switch (this.id) {
      case "about": return about(p, W);
      case "experience": return experience(p, W);
      case "projects": return this.projects(p, W);
      case "skills": return skills(p, W);
      case "contact": return this.contact(p, W);
    }
    return [];
  }

  projects(p, W) {
    const out = [];
    const side = W >= 72;
    const listW = side ? 22 : W;
    const list = p.projects.map((pr, i) => {
      const on = i === this.sel;
      return [[on ? "› " : "  ", C.thread, BOLD], [pr.title, on ? C.paper : C.text, on ? BOLD : 0]];
    });
    const pr = p.projects[this.sel];
    const dW = side ? W - listW - 3 : W;
    const detail = [];
    detail.push([[pr.title, C.paper, BOLD]]);
    for (const l of wrap(pr.summary, dW)) detail.push([[l, C.text]]);
    detail.push([]);
    detail.push([[pr.stack.join("  ·  ").toLowerCase(), C.sakura]]);
    if (pr.caseStudy) {
      for (const k of ["problem", "approach", "outcome"]) {
        detail.push([]);
        detail.push([[k, C.amber]]);
        for (const l of wrap(pr.caseStudy[k], dW)) detail.push([[l, C.text]]);
      }
    }
    detail.push([]);
    if (pr.live) detail.push([["live    ", C.dim], [host(pr.live), C.paper, UNDERLINE]]);
    if (pr.github) detail.push([["github  ", C.dim], [host(pr.github), C.paper, UNDERLINE]]);

    if (side) {
      const n = Math.max(list.length, detail.length);
      for (let i = 0; i < n; i++) {
        const l = list[i] || [];
        const pad = listW - l.reduce((a, s) => a + [...s[0]].length, 0);
        out.push([...l, [" ".repeat(Math.max(0, pad)), null], ["│  ", C.faint], ...(detail[i] || [])]);
      }
      this.cursorLine = null; // list is always at the top
    } else {
      out.push(...list, [], ...detail);
      this.cursorLine = this.sel;
    }
    return out;
  }

  contact(p, W) {
    const items = contactItems(p);
    const out = [[["say hi", C.paper, BOLD]], [["the inbox is open, and so is the calendar.", C.dim]], []];
    items.forEach((it, i) => {
      const on = i === this.sel;
      out.push([
        [on ? "› " : "  ", C.thread, BOLD],
        [it.label.padEnd(10), on ? C.paper : C.dim, on ? BOLD : 0],
        [it.show || host(it.url), on ? C.sakura : C.text, on ? UNDERLINE : 0],
      ]);
    });
    this.cursorLine = 3 + this.sel;
    return out;
  }
}

function contactItems(p) {
  return [
    { label: "email", url: `mailto:${p.contact.email}` },
    { label: "website", url: p.website },
    ...p.socials.map((s) => ({ label: s.label.toLowerCase(), url: s.url })),
    { label: "book", url: p.contact.booking },
    { label: "resume", url: p.contact.resume, show: "google drive · pdf" },
  ].filter((i) => i.url);
}

function about(p, W) {
  const out = [];
  for (const para of p.summary) {
    for (const l of wrap(para, W)) out.push([[l, C.text]]);
    out.push([]);
  }
  for (const l of wrap(p.pullQuote, W - 4)) out.push([["│  ", C.thread], [l, C.sakura, ITALIC]]);
  out.push([]);
  const row = (k, ...v) => out.push([[k.padEnd(12), C.dim], ...v]);
  row("based in", [p.location.toLowerCase(), C.paper]);
  if (p.openToWork) row("status", ["● ", C.moss], ["open to work", C.moss]);
  for (const e of p.education) {
    row("studied", [e.degree, C.paper], [`  ${e.start}–${e.end}`, C.dim]);
    row("", [e.school, C.text]);
  }
  row("speaks", [p.languages.join(", ").toLowerCase(), C.paper]);
  out.push([]);
  out.push([["highlights", C.amber]]);
  for (const s of p.showcase) {
    out.push([["◆ ", C.thread], [s.title, C.paper, BOLD], [`  ${s.date}`, C.dim]]);
    for (const l of wrap(s.blurb, W - 2)) out.push([["  ", null], [l, C.text]]);
  }
  return out;
}

function experience(p, W) {
  const out = [];
  p.experience.forEach((e, i) => {
    if (i) out.push([]);
    out.push([["● ", i === 0 ? C.thread : C.faint], [e.role, C.paper, BOLD], ["  ·  ", C.faint], [e.company, C.sakura]]);
    out.push([["│ ", C.faint], [`${fmtDate(e.start)} – ${fmtDate(e.end)}  ·  ${e.location.toLowerCase()}`, C.dim]]);
    for (const b of e.bullets) {
      wrap(b, W - 6).forEach((l, j) => out.push([["│ ", C.faint], [j ? "    " : "  – ", C.faint], [l, C.text]]));
    }
  });
  return out;
}

function skills(p, W) {
  const out = [];
  const groups = [...p.skills, { label: "Tools", items: p.tools }];
  for (const g of groups) {
    const segs = [[g.label.toLowerCase().padEnd(14), C.amber]];
    let used = 14;
    let first = true;
    for (const item of g.items) {
      const add = (first ? 0 : 3) + item.length;
      if (used + add > W) {
        out.push(segs.splice(0));
        segs.push([" ".repeat(14), null]);
        used = 14;
        first = true;
      }
      if (!first) segs.push([" · ", C.faint]);
      segs.push([item, C.paper]);
      used += add;
      first = false;
    }
    out.push(segs);
    out.push([]);
  }
  out.push([["always learning. currently: whatever looks hardest.", C.dim, ITALIC]]);
  return out;
}
