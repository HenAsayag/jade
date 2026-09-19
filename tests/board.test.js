import test from "node:test";
import assert from "node:assert/strict";
import {
  createBoard,
  validateSolution,
  LAYOUTS,
  isFree,
  matches,
  assignSolvable,
} from "../js/board.js";
test("every layout has a legal complete solution across 100 seeds", () => {
  for (let i = 0; i < LAYOUTS.length; i++)
    for (let seed = 0; seed < 100; seed++) {
      const b = createBoard(i, seed);
      assert.ok(validateSolution(b.tiles, b.solution), `${LAYOUTS[i]} ${seed}`);
    }
});
test("blocking uses geometry, upper overlap, and either open side", () => {
  const tiles = [
    { id: 0, x: 0, y: 0, z: 0 },
    { id: 1, x: 1, y: 0, z: 0 },
    { id: 2, x: 2, y: 0, z: 0 },
    { id: 3, x: 0.5, y: 0, z: 1 },
  ];
  assert.equal(isFree(tiles[0], tiles), false);
  assert.equal(isFree(tiles[1], tiles), false);
  assert.equal(isFree(tiles[2], tiles), true);
  tiles[3].removed = true;
  assert.equal(isFree(tiles[0], tiles), true);
  assert.equal(isFree(tiles[1], tiles), false);
  tiles[0].removed = true;
  assert.equal(isFree(tiles[1], tiles), true);
});
test("flowers and seasons match within their family only", () => {
  assert.ok(
    matches(
      { id: 1, symbol: "flower_lotus" },
      { id: 2, symbol: "flower_iris" },
    ),
  );
  assert.ok(
    matches(
      { id: 1, symbol: "season_spring" },
      { id: 2, symbol: "season_winter" },
    ),
  );
  assert.ok(!matches({ id: 1, symbol: "orb_01" }, { id: 2, symbol: "orb_02" }));
});
test("daily generation is deterministic and shuffle recovers partial boards", () => {
  const a = createBoard(3, "2026-09-19"),
    b = createBoard(3, "2026-09-19");
  assert.deepEqual(a, b);
  for (const ids of a.solution.slice(0, 5))
    ids.forEach((id) => (a.tiles[id].removed = true));
  const solution = assignSolvable(a.tiles, "shuffle");
  assert.ok(validateSolution(a.tiles, solution));
});

test("all twelve layouts have distinct coordinates and upper tiles are supported", () => {
  const shapes = new Set();
  for (let i = 0; i < 12; i++) {
    const { tiles } = createBoard(i, 42);
    shapes.add(JSON.stringify(tiles.map(({ x, y, z }) => [x, y, z])));
    for (const tile of tiles.filter((t) => t.z > 0))
      assert.ok(
        tiles.some(
          (t) => t.x === tile.x && t.y === tile.y && t.z === tile.z - 1,
        ),
      );
  }
  assert.equal(shapes.size, 12);
});
