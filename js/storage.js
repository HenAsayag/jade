import { SYMBOLS, layout } from "./board.js";
const KEY = new URLSearchParams(location.search).has("test")
  ? "jade-match-test-v1"
  : "jade-match-v1";
const integer = (value) => Number.isSafeInteger(value) && value >= 0;
const defaults = () => ({
  version: 1,
  unlocked: 1,
  best: 0,
  completed: [],
  daily: {},
  settings: {
    sound: true,
    music: true,
    haptics: true,
    reducedMotion:
      globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ??
      false,
    highContrast: false,
  },
  session: null,
});
function validSession(s) {
  if (
    !s ||
    s.version !== 1 ||
    !integer(s.level) ||
    s.level >= 12 ||
    !["score", "elapsed", "hints", "shuffles"].every((k) => integer(s[k])) ||
    typeof s.seed !== "string" ||
    typeof s.daily !== "boolean" ||
    typeof s.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(s.date) ||
    !Array.isArray(s.tiles) ||
    !Array.isArray(s.history) ||
    !Array.isArray(s.solution)
  )
    return false;
  const expected = layout(s.level);
  if (
    s.tiles.length !== expected.length ||
    new Set(s.tiles.map((t) => t?.id)).size !== s.tiles.length
  )
    return false;
  if (
    !s.tiles.every(
      (t) =>
        t &&
        expected.some(
          (e) => e.id === t.id && e.x === t.x && e.y === t.y && e.z === t.z,
        ) &&
        typeof t.removed === "boolean" &&
        SYMBOLS.includes(t.symbol),
    )
  )
    return false;
  if (s.tiles.filter((t) => !t.removed).length % 2) return false;
  const ids = new Set(s.tiles.map((t) => t.id));
  const pair = (value) =>
    Array.isArray(value) &&
    value.length === 2 &&
    value[0] !== value[1] &&
    value.every((id) => ids.has(id));
  if (
    !s.solution.every(pair) ||
    !s.history.every(
      (m) => m && pair(m.ids) && integer(m.score) && m.score <= s.score,
    )
  )
    return false;
  const undone = new Set();
  for (const m of s.history)
    for (const id of m.ids) {
      if (undone.has(id) || !s.tiles.find((t) => t.id === id).removed)
        return false;
      undone.add(id);
    }
  return true;
}
export function load() {
  const base = defaults();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (!saved || saved.version !== 1) return base;
    const completed = [
      ...new Set(
        (Array.isArray(saved.completed) ? saved.completed : []).filter(
          (n) => integer(n) && n < 12,
        ),
      ),
    ];
    return {
      ...base,
      unlocked: Math.max(
        1,
        Math.min(12, Math.floor(Number(saved.unlocked) || 1)),
        ...completed.map((n) => Math.min(12, n + 2)),
      ),
      best: integer(saved.best) ? saved.best : 0,
      completed,
      daily: Object.fromEntries(
        Object.entries(
          saved.daily &&
            typeof saved.daily === "object" &&
            !Array.isArray(saved.daily)
            ? saved.daily
            : {},
        ).filter(([k, v]) => /^\d{4}-\d{2}-\d{2}$/.test(k) && integer(v)),
      ),
      settings: Object.fromEntries(
        Object.entries(base.settings).map(([k, v]) => [
          k,
          typeof saved.settings?.[k] === "boolean" ? saved.settings[k] : v,
        ]),
      ),
      session: validSession(saved.session) ? saved.session : null,
    };
  } catch {
    return base;
  }
}
export function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
export function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
