export const MATCH_DURATION = 0.34;
export const clamp = (n) => Math.max(0, Math.min(1, n));
export const easeOut = (n) => 1 - (1 - clamp(n)) ** 3;
export function matchPose(elapsed, reduced = false) {
  const p = clamp(elapsed / (reduced ? 0.08 : MATCH_DURATION));
  if (reduced)
    return {
      pull: 0,
      lift: 0,
      scale: 1,
      alpha: 1 - p,
      flash: 0,
      impact: false,
      done: p === 1,
    };
  const lift = easeOut(p / 0.35);
  const finish = easeOut((p - 0.48) / 0.52);
  return {
    pull: easeOut(p / 0.65),
    lift: -15 * lift,
    scale: 1 + 0.1 * lift - 0.22 * finish,
    alpha: 1 - finish,
    flash: 0.34 * Math.sin(Math.PI * clamp(p / 0.7)),
    impact: p >= 0.48,
    done: p === 1,
  };
}
export function entrancePose(elapsed, delay, mode, reduced = false) {
  if (reduced) return { x: 0, y: 0, scale: 1, alpha: 1, done: true };
  const p = clamp((elapsed - delay) / 0.25),
    e = easeOut(p);
  if (p === 1) return { x: 0, y: 0, scale: 1, alpha: 1, done: true };
  return {
    x:
      mode === "shuffle"
        ? Math.sin(p * Math.PI) * (delay % 0.04 > 0.02 ? 16 : -16)
        : 0,
    y: mode === "shuffle" ? Math.sin(p * Math.PI) * -12 : (1 - e) * 16,
    scale: 0.96 + 0.04 * e,
    alpha: 0.25 + 0.75 * e,
    done: p === 1,
  };
}
