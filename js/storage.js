const KEY = new URLSearchParams(location.search).has("test") ? "jade-match-test-v1" : "jade-match-v1";
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
    reducedMotion: false,
    highContrast: false,
  },
  session: null,
});
export function load() {
  const base = defaults();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (!saved || saved.version !== 1) return base;
    return {
      ...base,
      ...saved,
      unlocked: Math.max(1, Math.min(12, Number(saved.unlocked) || 1)),
      settings: { ...base.settings, ...saved.settings },
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

