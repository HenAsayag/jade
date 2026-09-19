import { validateSolution, isFree } from "../js/board.js";
const out = document.querySelector("#results"),
  frame = document.querySelector("iframe");
let lines = [];
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
function assert(condition, message) {
  if (!condition) throw Error(message);
  lines.push("PASS " + message);
  out.textContent = lines.join("\n");
}
async function ready() {
  for (let i = 0; i < 200; i++) {
    if (frame.contentWindow.jadeTest) return frame.contentWindow.jadeTest;
    await delay(100);
  }
  throw Error("Startup timeout: " + frame.contentDocument.body.textContent);
}
try {
  let api = await ready();
  api.closeModal();
  api.newGame(0);
  await delay(300);
  assert(api.renderer.app.renderer.type === 1, "WebGL renderer active");
  assert(
    api.renderer.scale * 90 >= 44,
    "Portrait tile face is at least 44 CSS pixels at 390 × 844",
  );
  assert(
    frame.contentDocument.documentElement.scrollHeight <= 844,
    "Portrait page does not scroll",
  );
  const total = api.game.tiles.length,
    blocked = api.game.tiles.find((t) => !isFree(t, api.game.tiles));
  api.selectTile(blocked.id);
  assert(api.renderer.selected === null, "Blocked tiles cannot be selected");
  const ids = api.game.solution[0];
  api.selectTile(ids[0]);
  api.selectTile(ids[1]);
  assert(
    api.game.tiles.filter((t) => !t.removed).length === total - 2 &&
      api.game.score === 100,
    "Legal pair removes exactly two tiles and scores",
  );
  api.undo();
  assert(
    api.game.tiles.every((t) => !t.removed) && api.game.score === 0,
    "Undo restores tiles and score",
  );
  api.hint();
  assert(api.renderer.hinted.length === 2, "Hint highlights a legal pair");
  api.shuffle();
  assert(
    validateSolution(api.game.tiles, api.game.solution),
    "Shuffle creates a verified solvable remaining board",
  );
  api.selectTile(api.game.solution[0][0]);
  api.selectTile(api.game.solution[0][1]);
  const saved = api.game.score;
  await new Promise(resolve => { frame.addEventListener("load", resolve, {once:true}); frame.contentWindow.location.reload(); });
  api = await ready();
  api.closeModal();
  assert(
    api.game.score === saved &&
      api.game.tiles.filter((t) => t.removed).length === 2,
    "Progress survives reload",
  );
  const doc = frame.contentDocument;
  doc.querySelector("#settings").click();
  doc.querySelector('[data-setting="sound"]').click();
  doc.querySelector("#settings-done").click();
  assert(
    JSON.parse(frame.contentWindow.localStorage.getItem("jade-match-test-v1"))
      .settings.sound === false,
    "Audio preference persists",
  );
  doc.querySelector("#pause").click();
  const elapsed = api.game.elapsed;
  await delay(1100);
  assert(api.game.elapsed === elapsed, "Pause freezes the game clock");
  doc.querySelector("#resume").click();
  doc.querySelector("#home").click();
  doc.querySelector("#daily-modal").click();
  doc.querySelector("#start-daily").click();
  const daily = JSON.stringify(api.game.tiles);
  doc.querySelector("#pause").click();
  doc.querySelector("#restart").click();
  assert(
    JSON.stringify(api.game.tiles) === daily,
    "Daily puzzle remains deterministic on restart",
  );
  for (let level = 0; level < 12; level++) {
    api.closeModal();
    api.newGame(level);
    for (const pair of api.game.solution) {
      api.selectTile(pair[0]);
      api.selectTile(pair[1]);
    }
    await delay(500);
    assert(
      api.game.tiles.every((t) => t.removed) &&
        frame.contentDocument.querySelector("#next-level"),
      "Layout " + (level + 1) + " can be completed and shows completion",
    );
  }
  api.closeModal();
  api.newGame(0);
  const views = api.renderer.views.size;
  for (let i = 0; i < 25; i++) api.newGame(i % 12);
  assert(
    api.renderer.board.children.length === api.renderer.views.size &&
      api.renderer.fx.children.length === 180,
    "Repeated levels reuse bounded particles and remove old tile views",
  );
  api.newGame(0);
  const canvas = api.renderer.app.canvas,
    ext = api.renderer.app.renderer.gl.getExtension("WEBGL_lose_context");
  if (ext) {
    ext.loseContext();
    await delay(150);
    assert(
      frame.contentDocument.querySelector("#reload"),
      "Context loss offers saved-game recovery",
    );
    ext.restoreContext();
    await delay(500);
    assert(
      frame.contentDocument.querySelector("#resume"),
      "Context restoration allows explicit resume",
    );
    api.closeModal();
  }
  for (const [width, height] of [
    [360, 800],
    [390, 844],
    [412, 915],
    [430, 932],
    [844, 390],
    [1366, 768],
    [1920, 1080],
  ]) {
    frame.style.width = width + "px";
    frame.style.height = height + "px";
    await delay(150);
    const board = api.renderer.board.getBounds();
    const host = api.renderer.host;
    assert(
      board.minX >= -1 &&
        board.maxX <= host.clientWidth + 1 &&
        board.minY >= -1 &&
        board.maxY <= host.clientHeight + 1,
      `Board fits ${width} × ${height}`,
    );
    if (width <= 430)
      assert(
        api.renderer.scale * 90 >= 44,
        `Tiles remain tappable at ${width} × ${height}`,
      );
  }
  frame.style.width = "390px";
  frame.style.height = "844px";
  api.newGame(0);
  out.textContent = lines.join("\n") + "\nALL CHECKS PASSED";
} catch (e) {
  out.textContent = lines.join("\n") + "\nFAIL " + e.stack;
  console.error(e);
}

