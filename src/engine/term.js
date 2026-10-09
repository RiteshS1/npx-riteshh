// Owns the real terminal: alternate screen, hidden cursor, raw input.
// restore() is idempotent and wired to every way the process can end, so a
// crash or ctrl-c never leaves the user's shell in raw mode.

export function createTerm({ stdout = process.stdout, stdin = process.stdin } = {}) {
  let active = false;

  const term = {
    get w() {
      return stdout.columns || 80;
    },
    get h() {
      return stdout.rows || 24;
    },

    enter() {
      if (active) return;
      active = true;
      stdout.write("\x1b[?1049h\x1b[?25l\x1b[2J\x1b[H");
      if (stdin.isTTY) stdin.setRawMode(true);
      stdin.resume();
    },

    write(s) {
      if (s) stdout.write(s);
    },

    restore() {
      if (!active) return;
      active = false;
      stdout.write("\x1b[0m\x1b[?25h\x1b[?1049l");
      if (stdin.isTTY) stdin.setRawMode(false);
      stdin.pause();
    },
  };

  process.on("exit", () => term.restore());
  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(sig, () => {
      term.restore();
      process.exit(130);
    });
  }
  process.on("uncaughtException", (err) => {
    term.restore();
    console.error(err);
    process.exit(1);
  });

  return term;
}
