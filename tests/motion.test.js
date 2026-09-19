import test from "node:test";
import assert from "node:assert/strict";
import { matchPose, entrancePose, MATCH_DURATION } from "../js/motion.js";
test("match keeps confirmation visible, then converges and disappears within 340ms", () => {
  const start = matchPose(0),
    middle = matchPose(0.14),
    end = matchPose(MATCH_DURATION);
  assert.equal(start.alpha, 1);
  assert.ok(middle.lift < 0 && middle.scale > 1 && middle.pull > 0);
  assert.equal(end.alpha, 0);
  assert.equal(end.done, true);
  for (let t = 0; t < 0.5; t += 0.01) {
    const p = matchPose(t);
    assert.ok(p.alpha >= 0 && p.alpha <= 1 && p.scale > 0);
  }
});
test("reduced motion has no movement, pulsing, scaling, or flash", () => {
  for (const t of [0, 0.04, 0.1]) {
    const p = matchPose(t, true);
    assert.equal(p.lift, 0);
    assert.equal(p.pull, 0);
    assert.equal(p.scale, 1);
    assert.equal(p.flash, 0);
  }
  assert.deepEqual(entrancePose(0, 0.1, "shuffle", true), {
    x: 0,
    y: 0,
    scale: 1,
    alpha: 1,
    done: true,
  });
});
test("deal and shuffle settle at their exact hit-test coordinates", () => {
  for (const mode of ["deal", "shuffle"]) {
    const p = entrancePose(0.5, 0.1, mode);
    assert.equal(p.x, 0);
    assert.equal(p.y, 0);
    assert.equal(p.scale, 1);
    assert.equal(p.alpha, 1);
    assert.equal(p.done, true);
  }
});
