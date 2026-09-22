import test from "node:test";
import assert from "node:assert/strict";
globalThis.location = { search: "?test=1" };
const { load, save } = await import("../js/storage.js");
let raw;
globalThis.localStorage = {
  getItem: () => raw,
  setItem: (_k, v) => {
    raw = v;
  },
};
test("malformed progress fields cannot break startup", () => {
  raw = JSON.stringify({
    version: 1,
    completed: null,
    daily: null,
    settings: { sound: "false" },
    unlocked: 2.5,
    best: -50,
  });
  const data = load();
  assert.deepEqual(data.completed, []);
  assert.deepEqual(data.daily, {});
  assert.equal(typeof data.settings.sound, "boolean");
  assert.equal(Number.isInteger(data.unlocked), true);
  assert.equal(data.best, 0);
});
test("invalid saved session is rejected while valid progress is preserved", () => {
  raw = JSON.stringify({
    version: 1,
    completed: [0],
    unlocked: 2,
    session: {
      version: 1,
      level: 0,
      tiles: [{ id: 0, x: 0, y: 0, symbol: "element_leaf" }],
    },
  });
  const data = load();
  assert.equal(data.session, null);
  assert.deepEqual(data.completed, [0]);
});
test("unavailable browser storage returns defaults and a failed save result", () => {
  const old = globalThis.localStorage;
  globalThis.localStorage = {
    getItem() {
      throw Error("blocked");
    },
    setItem() {
      throw Error("full");
    },
  };
  assert.equal(load().unlocked, 1);
  assert.equal(save({}), false);
  globalThis.localStorage = old;
});
import { createBoard } from "../js/board.js";
test("valid in-progress game survives normalization including shuffle history", () => {
  const board = createBoard(0, "save-test");
  for (const id of board.solution[0])
    board.tiles.find((t) => t.id === id).removed = true;
  const session = {
    version: 1,
    level: 0,
    score: 100,
    elapsed: 42,
    hints: 0,
    shuffles: 0,
    seed: "save-test",
    daily: false,
    date: "2026-09-22",
    ...board,
    history: [{ ids: board.solution[0], score: 0 }],
  };
  raw = JSON.stringify({ version: 1, session });
  assert.deepEqual(load().session, session);
});
