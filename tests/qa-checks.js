const frame = document.querySelector("iframe"),
  out = document.querySelector("#results"),
  lines = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function check(ok, label) {
  lines.push(`${ok ? "PASS" : "FAIL"} ${label}`);
  out.textContent = lines.join("\n");
}
for (let i = 0; i < 100 && !frame.contentWindow.jadeTest; i++) await wait(100);
const api = frame.contentWindow.jadeTest,
  doc = frame.contentDocument;
try {
  api.closeModal();
  api.newGame(0);
  await wait(1200);
  check(doc.querySelector("#app").inert === false, "Test game is interactive");
  doc.querySelector("#settings").click();
  check(
    !!doc.querySelector("#settings-help"),
    "Rules are reachable from settings",
  );
  doc.querySelector("#settings-help")?.click();
  check(
    !!doc.querySelector("#how-done"),
    "Rules explain matching and can return to game",
  );
  api.closeModal();
  for (const id of api.game.solution[0]) api.selectTile(id);
  await wait(380);
  api.undo();
  check(
    !doc.querySelector(".board-mark").classList.contains("has-combo"),
    "Undo clears the old combo display",
  );
  api.newGame(0);
  for (const pair of api.game.solution)
    for (const id of pair) api.selectTile(id);
  frame.contentWindow.dispatchEvent(
    new frame.contentWindow.KeyboardEvent("keydown", { key: "z" }),
  );
  await wait(550);
  check(
    api.game.tiles.every((t) => t.removed),
    "Keyboard undo cannot reverse a completed board",
  );
  check(
    !!doc.querySelector("#next-level"),
    "Completed board still shows completion",
  );
  api.closeModal();
  api.newGame(0);
  for (const pair of api.game.solution)
    for (const id of pair) api.selectTile(id);
  doc.querySelector("#pause").click();
  await wait(550);
  check(
    !!doc.querySelector("#resume"),
    "Completion does not replace the pause dialog",
  );
  doc.querySelector("#resume")?.click();
  await wait(500);
  check(
    !!doc.querySelector("#next-level"),
    "Resuming a completed board restores completion actions",
  );
  api.closeModal();
  api.newGame(0);
  await wait(1200);
  for (const [w, h] of [
    [320, 568],
    [360, 640],
    [390, 844],
    [430, 932],
    [844, 390],
    [667, 375],
  ]) {
    frame.style.width = w + "px";
    frame.style.height = h + "px";
    await wait(120);
    const rect = doc.querySelector("#board").getBoundingClientRect();
    check(
      rect.width > 0 &&
        rect.height > 0 &&
        doc.documentElement.scrollHeight <= h,
      `No overflow at ${w}x${h}`,
    );
    for (const selector of [
      "#remaining",
      "#score",
      "#hint",
      "#shuffle",
      "#pause",
      "#settings",
    ]) {
      const node = doc.querySelector(selector),
        box = node.getBoundingClientRect();
      const top = doc.elementFromPoint(
        box.x + box.width / 2,
        box.y + box.height / 2,
      );
      check(
        !!top && (top === node || node.contains(top)),
        `${selector} is visible and unobstructed at ${w}x${h}`,
      );
    }
    doc.querySelector("#settings").click();
    const modal = doc.querySelector("#modal"),
      r = modal.getBoundingClientRect();
    check(r.top >= 0 && r.bottom <= h + 1, `Settings stays inside ${w}x${h}`);
    doc.querySelector("#settings-done").click();
  }
  api.newGame(0);
  const storagePrototype = frame.contentWindow.Storage.prototype;
  const originalSave = storagePrototype.setItem;
  try {
    storagePrototype.setItem = () => {
      throw Error("QA storage full");
    };
    for (const id of api.game.solution[0]) api.selectTile(id);
    check(
      !!doc.querySelector("#save-notice") &&
        !doc.querySelector("#save-notice").hidden,
      "Failed save stays visible despite match feedback",
    );
  } finally {
    storagePrototype.setItem = originalSave;
  }
  api.hint();
  check(
    doc.querySelector("#save-notice").hidden,
    "Successful save clears storage warning",
  );
  out.textContent += "\nQA COMPLETE";
} catch (e) {
  out.textContent += "\nERROR " + e.stack;
}
