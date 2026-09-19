export const MATCH_DURATION = 0.36;
export const IMPACT_TIME = 0.24;
export const clamp = (n) => Math.max(0, Math.min(1, n));
export const easeOut = (n) => 1 - (1 - clamp(n)) ** 3;
export function matchPose(elapsed, reduced = false) {
  if (reduced)
    return {
      pull: 0,
      lift: 0,
      scale: 1,
      alpha: 1 - easeOut(elapsed / 0.09),
      flash: 0,
      impact: false,
      done: elapsed >= 0.09,
    };
  const travel = clamp(elapsed / IMPACT_TIME),
    after = clamp((elapsed - IMPACT_TIME) / (MATCH_DURATION - IMPACT_TIME));
  return {
    pull: travel * travel,
    lift: -Math.sin(travel * Math.PI) * 16,
    scale: 1 + 0.045 * Math.sin(travel * Math.PI) - 0.25 * easeOut(after),
    alpha: 1 - easeOut(after),
    flash: 0.75 * Math.sin(Math.PI * clamp((elapsed - 0.21) / 0.1)),
    impact: elapsed >= IMPACT_TIME,
    done: elapsed >= MATCH_DURATION,
  };
}
export function entrancePose(
  elapsed,
  delay,
  mode,
  reduced = false,
  origin = { x: 0, y: 0 },
) {
  if (reduced) return { x: 0, y: 0, scale: 1, alpha: 1, done: true };
  const duration = mode === "deal" ? 0.36 : 0.25;
  const p = clamp((elapsed - delay) / duration),
    e = easeOut(p);
  if (p === 1) return { x: 0, y: 0, scale: 1, alpha: 1, done: true };
  if (mode === "deal")
    return {
      x: origin.x * (1 - e),
      y: origin.y * (1 - e),
      scale: 0.97 + 0.03 * e,
      alpha: elapsed < delay ? 0 : 1,
      done: false,
    };
  // Shuffle is deliberately unchanged by the match correction pass.
  return {
    x: Math.sin(p * Math.PI) * (delay % 0.04 > 0.02 ? 16 : -16),
    y: Math.sin(p * Math.PI) * -12,
    scale: 0.96 + 0.04 * e,
    alpha: 0.25 + 0.75 * e,
    done: false,
  };
}
export class ScoreTween {
  constructor() {
    this.value = 0;
    this.from = 0;
    this.target = 0;
    this.elapsed = 0.3;
  }
  set(target, snap = false) {
    if (target === this.target && !snap) return;
    this.from = this.value;
    this.target = target;
    this.elapsed = snap ? 0.3 : 0;
    if (snap) this.value = target;
  }
  tick(dt) {
    this.elapsed = Math.min(0.3, this.elapsed + dt);
    this.value =
      this.from + (this.target - this.from) * easeOut(this.elapsed / 0.3);
    return Math.round(this.value);
  }
}
