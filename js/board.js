export const LAYOUTS = [
  "Turtle",
  "Pyramid",
  "Bridge",
  "Twin Towers",
  "Lotus",
  "Wave",
  "Fortress",
  "Spiral",
  "Crown",
  "Butterfly",
  "Diamond",
  "Temple",
];
export const SYMBOLS = [
  ...Array.from(
    { length: 9 },
    (_, i) => `orb_${String(i + 1).padStart(2, "0")}`,
  ),
  ...Array.from(
    { length: 9 },
    (_, i) => `reed_${String(i + 1).padStart(2, "0")}`,
  ),
  ...Array.from(
    { length: 9 },
    (_, i) => `glyph_${String(i + 1).padStart(2, "0")}`,
  ),
  "flower_lotus",
  "flower_camellia",
  "flower_plum_blossom",
  "flower_iris",
  "season_spring",
  "season_summer",
  "season_autumn",
  "season_winter",
  "compass_north",
  "compass_east",
  "compass_south",
  "compass_west",
  "element_flame",
  "element_water",
  "element_leaf",
];
export function random(seed) {
  let n = 2166136261;
  for (const c of String(seed)) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return () => {
    n += 0x6d2b79f5;
    let t = Math.imul(n ^ (n >>> 15), 1 | n);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function family(symbol) {
  return /^(flower|season)_/.test(symbol) ? symbol.split("_")[0] : symbol;
}
export function matches(a, b) {
  return a.id !== b.id && family(a.symbol) === family(b.symbol);
}
export function isFree(tile, tiles) {
  if (tile.removed) return false;
  let left = false,
    right = false;
  for (const t of tiles) {
    if (t.removed || t.id === tile.id) continue;
    const dx = t.x - tile.x,
      dy = Math.abs(t.y - tile.y);
    if (t.z > tile.z && Math.abs(dx) < 0.99 && dy < 0.99) return false;
    if (t.z === tile.z && dy < 0.99) {
      if (Math.abs(dx + 1) < 0.05) left = true;
      if (Math.abs(dx - 1) < 0.05) right = true;
    }
  }
  return !left || !right;
}
export function pairs(tiles) {
  const free = tiles.filter((t) => isFree(t, tiles));
  const result = [];
  for (let i = 0; i < free.length; i++)
    for (let j = i + 1; j < free.length; j++)
      if (matches(free[i], free[j])) result.push([free[i], free[j]]);
  return result;
}
export function layout(index) {
  const rows = [
    [2, 4, 6, 6, 4, 2],
    [2, 4, 6, 6, 4, 2],
    [4, 4, 6, 6, 4, 4],
    [4, 4, 6, 6, 4, 4],
    [2, 4, 6, 6, 4, 2],
    [4, 6, 4, 6, 4, 6],
    [6, 4, 6, 6, 4, 6],
    [4, 6, 6, 4, 6, 4],
    [6, 4, 6, 4, 4, 4],
    [4, 6, 2, 2, 6, 4],
    [2, 4, 6, 6, 4, 2],
    [2, 4, 6, 6, 6, 6],
  ][index % 12];
  const tiles = [];
  const add = (x, y, z) =>
    tiles.push({ id: tiles.length, x, y, z, removed: false, symbol: "" });
  rows.forEach((width, y) => {
    for (let x = 0; x < width; x++) add((6 - width) / 2 + x, y, 0);
  });
  const mid = Math.floor(rows.length / 2);
  for (let y = mid - 1; y <= mid; y++)
    for (let x = 2; x <= 3; x++) add(x, y, 1);
  if (index % 3 === 1) {
    add(2, mid, 2);
    add(3, mid, 2);
  }
  if (index % 3 === 2) {
    add(1, mid - 1, 1);
    add(4, mid - 1, 1);
  }
  return tiles;
}
// A geometric removal witness is also a complete proof of solvability.
export function assignSolvable(tiles, seed) {
  const rng = random(seed);
  for (let attempt = 0; attempt < 100; attempt++) {
    const work = tiles.filter((t) => !t.removed).map((t) => ({ ...t }));
    const order = [];
    while (work.some((t) => !t.removed)) {
      const free = work.filter((t) => isFree(t, work));
      if (free.length < 2) break;
      const a = free.splice(Math.floor(rng() * free.length), 1)[0],
        b = free[Math.floor(rng() * free.length)];
      a.removed = b.removed = true;
      order.push([a.id, b.id]);
    }
    if (order.length * 2 !== work.length) continue;
    for (const [a, b] of order) {
      const symbol = SYMBOLS[Math.floor(rng() * SYMBOLS.length)];
      tiles.find((t) => t.id === a).symbol = symbol;
      let other = symbol;
      if (symbol.startsWith("flower_"))
        other = SYMBOLS[27 + Math.floor(rng() * 4)];
      if (symbol.startsWith("season_"))
        other = SYMBOLS[31 + Math.floor(rng() * 4)];
      tiles.find((t) => t.id === b).symbol = other;
    }
    if (!validateSolution(tiles, order)) throw Error("Board validation failed");
    return order;
  }
  throw Error("Unable to create a solvable board");
}
export function validateSolution(tiles, order) {
  const work = tiles.map((t) => ({ ...t }));
  for (const [aId, bId] of order) {
    const a = work.find((t) => t.id === aId),
      b = work.find((t) => t.id === bId);
    if (!a || !b || !isFree(a, work) || !isFree(b, work) || !matches(a, b))
      return false;
    a.removed = b.removed = true;
  }
  return work.every((t) => t.removed);
}
export function createBoard(index, seed) {
  const tiles = layout(index);
  const solution = assignSolvable(tiles, seed);
  return { tiles, solution };
}
