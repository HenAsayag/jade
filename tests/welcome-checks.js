const frame = document.querySelector("iframe"),
  out = document.querySelector("#results"),
  lines = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function check(ok, label) {
  if (!ok) throw Error(label);
  lines.push("PASS " + label);
  out.textContent = lines.join("\n");
}
try {
  for (let i = 0; i < 150 && !frame.contentWindow.jadeTest; i++)
    await wait(100);
  const api = frame.contentWindow.jadeTest,
    doc = frame.contentDocument;
  check(
    !!doc.querySelector("#welcome") && doc.querySelector("#app").inert,
    "Welcome poster gates gameplay and keyboard focus",
  );
  const elapsed = api.game.elapsed,
    score = api.game.score;
  frame.contentWindow.dispatchEvent(
    new frame.contentWindow.KeyboardEvent("keydown", { key: "s" }),
  );
  await wait(1100);
  check(
    api.game.elapsed === elapsed && api.game.score === score,
    "Welcome freezes game clock and ignores shortcuts",
  );
  check(
    doc.querySelector("#welcome img").naturalWidth > 0,
    "Poster loads successfully",
  );
  for (const [w, h] of [
    [320, 568],
    [390, 844],
    [430, 932],
    [844, 390],
  ]) {
    frame.style.width = w + "px";
    frame.style.height = h + "px";
    await wait(80);
    const b = doc.querySelector("#begin-play").getBoundingClientRect();
    check(
      b.top >= 0 && b.bottom <= h && b.left >= 0 && b.right <= w,
      `Welcome action fits ${w}x${h}`,
    );
  }
  const gl = api.renderer.app.renderer.gl.getExtension("WEBGL_lose_context");
  if (gl) {
    gl.loseContext();
    await wait(180);
    check(
      !!doc.querySelector("#reload"),
      "Context loss on welcome offers recovery",
    );
    gl.restoreContext();
    await wait(500);
    check(
      !!doc.querySelector("#welcome") && !doc.querySelector("#modal").open,
      "Context restoration returns to welcome without trapping dialog",
    );
  }
  doc.querySelector("#begin-play").click();
  await wait(1200);
  check(
    !doc.querySelector("#welcome") && !doc.querySelector("#app").inert,
    "Enter garden enables gameplay",
  );
  check(doc.querySelector(".opening-doors").hidden, "Door opening finishes");
  frame.style.width = "390px";
  frame.style.height = "844px";
  doc.querySelector("#settings").click();
  for (const key of [
    "reducedMotion",
    "highContrast",
    "haptics",
    "sound",
    "music",
  ]) {
    const input = doc.querySelector(`[data-setting="${key}"]`);
    const before = input.checked;
    input.click();
    check(
      JSON.parse(frame.contentWindow.localStorage.getItem("jade-match-test-v1"))
        .settings[key] === !before,
      `${key} setting persists`,
    );
    input.click();
  }
  doc.querySelector("#settings-done").click();
  const before = api.game.elapsed;
  await wait(1100);
  check(api.game.elapsed > before, "Clock resumes after welcome and settings");
  out.textContent += "\nWELCOME CHECKS PASSED";
} catch (e) {
  out.textContent += "\nFAIL " + e.stack;
}
