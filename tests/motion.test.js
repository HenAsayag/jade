import test from "node:test";
import assert from "node:assert/strict";
import {
  matchPose,
  entrancePose,
  MATCH_DURATION,
  ScoreTween,
} from "../js/motion.js";
test("matches disappear in place by 90ms with no lift, convergence, or scaling", () => {
  assert.equal(MATCH_DURATION, 0.09);
  for (let t = 0; t <= 0.1; t += 0.005) {
    const p = matchPose(t);
    assert.equal(p.pull, 0);
    assert.equal(p.lift, 0);
    assert.equal(p.scale, 1);
    assert.ok(p.alpha >= 0 && p.alpha <= 1);
  }
  assert.equal(matchPose(0.02).alpha, 1);
  assert.ok(matchPose(0.05).flash > 0);
  assert.equal(matchPose(0.09).alpha, 0);
  assert.equal(matchPose(0.09).done, true);
});
test("reduced motion removes flashes and travel without slowing removal", () => {
  assert.equal(matchPose(0.04, true).flash, 0);
  assert.equal(matchPose(0.09, true).done, true);
  assert.deepEqual(entrancePose(0, 0.04, "deal", true, { x: 900, y: 1000 }), {
    x: 0,
    y: 0,
    scale: 1,
    alpha: 1,
    done: true,
  });
});
test("board assembles from multiple origins at near-final size within 440ms", () => {
  for (const origin of [
    { x: -800, y: 0 },
    { x: 800, y: 0 },
    { x: 0, y: 900 },
    { x: -800, y: -900 },
    { x: 800, y: -900 },
  ]) {
    const start = entrancePose(0, 0.02, "deal", false, origin);
    assert.equal(start.x, origin.x);
    assert.equal(start.y, origin.y);
    assert.equal(start.alpha, 0);
    assert.equal(start.scale, 0.97);
    const end = entrancePose(0.44, 0.07, "deal", false, origin);
    assert.equal(end.x, 0);
    assert.equal(end.y, 0);
    assert.equal(end.done, true);
  }
});
test("score retargets continuously from the displayed value and finishes in 300ms", () => {
  const tween = new ScoreTween();
  tween.set(13200, true);
  tween.set(13800);
  tween.tick(0.1);
  const displayed = tween.value;
  assert.ok(displayed > 13200 && displayed < 13800);
  tween.set(14400);
  assert.equal(tween.value, displayed);
  tween.tick(0.01);
  assert.ok(tween.value > displayed);
  assert.equal(tween.tick(0.3), 14400);
});
test("shuffle easing retains its previous duration and settled coordinates", () => {
  const p = entrancePose(0.4, 0.1, "shuffle");
  assert.deepEqual(p, { x: 0, y: 0, scale: 1, alpha: 1, done: true });
});
