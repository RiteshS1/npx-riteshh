// Turns raw stdin bytes into key events: { name, ch, ctrl }.
// Names: up down left right enter space tab backspace escape, or the
// lowercase character itself ("a", "1", "?"). ctrl-c arrives as { name: "c", ctrl: true }.

const CSI = {
  A: "up", B: "down", C: "right", D: "left", H: "home", F: "end",
  "5~": "pageup", "6~": "pagedown", "3~": "delete", "1~": "home", "4~": "end",
};

export function parseKeys(data) {
  const s = typeof data === "string" ? data : data.toString("utf8");
  const keys = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "\x1b") {
      const next = s[i + 1];
      if (next === "[" || next === "O") {
        // CSI / SS3: ESC [ params final
        let j = i + 2;
        while (j < s.length && /[0-9;]/.test(s[j])) j++;
        const body = s.slice(i + 2, j + 1);
        const final = body.replace(/^[0-9;]*(?=[A-Z])/, ""); // modified arrows: 1;2A → A
        const name = CSI[body] || CSI[final];
        keys.push({ name: name || "unknown", ch: "", ctrl: false });
        i = j + 1;
        continue;
      }
      if (next === undefined) {
        keys.push({ name: "escape", ch: "", ctrl: false });
        i++;
        continue;
      }
      // Alt+key: treat as escape followed by the key.
      keys.push({ name: "escape", ch: "", ctrl: false });
      i++;
      continue;
    }
    if (c === "\r" || c === "\n") keys.push({ name: "enter", ch: "", ctrl: false });
    else if (c === " ") keys.push({ name: "space", ch: " ", ctrl: false });
    else if (c === "\t") keys.push({ name: "tab", ch: "", ctrl: false });
    else if (c === "\x7f" || c === "\b") keys.push({ name: "backspace", ch: "", ctrl: false });
    else if (c.charCodeAt(0) < 27) {
      keys.push({ name: String.fromCharCode(c.charCodeAt(0) + 96), ch: "", ctrl: true });
    } else keys.push({ name: c.toLowerCase(), ch: c, ctrl: false });
    i++;
  }
  return keys;
}

/** Map arrows, WASD and vim keys to a direction name, or null. */
export function dirOf(key) {
  switch (key.name) {
    case "up": case "w": case "k": return "up";
    case "down": case "s": case "j": return "down";
    case "left": case "a": case "h": return "left";
    case "right": case "d": case "l": return "right";
    default: return null;
  }
}
