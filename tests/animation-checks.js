export async function checkAnimationCorrection(api, frame, assert) {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const doc = frame.contentDocument;
  api.closeModal();
  api.newGame(0);
  await wait(500);
  const r = api.renderer,
    effects = r.matchEffects,
    poolSize = effects.layer.children.length;
  const pair = api.game.solution[0],
    second = api.game.solution[1],
    third = api.game.solution[2];
  function pointer(id, type) {
    const view = r.views.get(id),
      p = view.container.toGlobal({ x: 48, y: 55 }),
      rect = r.app.canvas.getBoundingClientRect();
    r.app.canvas.dispatchEvent(
      new frame.contentWindow.PointerEvent(type, {
        bubbles: true,
        clientX: rect.left + p.x,
        clientY: rect.top + p.y,
        pointerId: 1,
        pointerType: "touch",
        isPrimary: true,
        button: 0,
        buttons: type === "pointerdown" ? 1 : 0,
      }),
    );
  }
  function tap(id) {
    pointer(id, "pointerdown");
    pointer(id, "pointerup");
  }
  pointer(pair[0], "pointerdown");
  assert(
    r.pressed === pair[0] && r.views.get(pair[0]).sprite.tint === 0xe6f3ba,
    "Pointer-down immediately highlights the readable tile face before release",
  );
  assert(r.views.get(pair[0]).targetY === 0, "Selection does not lift tiles");
  pointer(pair[0], "pointercancel");
  assert(
    r.pressed === null && api.game.tiles.every((t) => !t.removed),
    "Cancelled touch clears preview without selecting or removing a tile",
  );
  tap(pair[0]);
  tap(pair[1]);
  const views = pair.map((id) => r.views.get(id));
  assert(
    views.every(
      (v) =>
        v.container.eventMode === "none" &&
        v.container.x === v.baseX &&
        v.container.y === v.baseY,
    ),
    "A match disables both hitboxes immediately and stays at both original positions",
  );
  assert(
    effects.pools.flower.filter((p) => p.active).length === 6 &&
      effects.pools.petal.filter((p) => p.active).length === 16,
    "Each normal pair emits six blossoms and sixteen petals, without shards",
  );
  assert(
    effects.pools.flash.filter((p) => p.active).length === 2 &&
      effects.pools.glow.filter((p) => p.active).length === 2,
    "Both removed tile locations receive separate flashes and glows",
  );
  assert(
    effects.layer.eventMode === "none",
    "Cosmetic VFX cannot intercept underlying tile input",
  );
  await wait(120);
  assert(
    views.every((v) => !v.container.visible) && effects.activeCount > 0,
    "Tiles are gone while their floral VFX is still alive",
  );
  const firstEffects = effects.pools.petal.filter((p) => p.active);
  tap(second[0]);
  assert(
    r.selected === second[0],
    "The next pair can be selected while the previous petals are visible",
  );
  tap(second[1]);
  assert(
    firstEffects.some((p) => p.active) &&
      effects.pools.petal.filter((p) => p.active).length > firstEffects.length,
    "Consecutive match effects coexist rather than cancelling one another",
  );
  const scoreBefore = Number(
    doc.querySelector("#score").textContent.replaceAll(",", ""),
  );
  await wait(60);
  tap(third[0]);
  tap(third[1]);
  const scoreAfter = Number(
    doc.querySelector("#score").textContent.replaceAll(",", ""),
  );
  assert(
    api.game.score === 600 && scoreAfter >= scoreBefore && scoreAfter < 600,
    "Rapid matches update logical score immediately while the displayed score continues counting",
  );
  assert(
    doc.querySelector(".combo-value").textContent === "3" &&
      doc.querySelector(".board-mark").classList.contains("has-combo"),
    "Combo increments at the top HUD during rapid play",
  );
  assert(
    effects.pools.reward.some((p) => p.active && p.sprite.text === "+300"),
    "Earned points float locally beside the removed tiles",
  );
  await wait(450);
  assert(
    doc.querySelector("#score").textContent === "600",
    "Score counter settles at the latest target after overlapping updates",
  );
  assert(
    effects.activeCount === 0 && effects.layer.children.length === poolSize,
    "All floral effects return to fixed pools without growing scene objects",
  );
  api.newGame(0);
  await wait(500);
  const previousQuality = r.quality;
  r.quality = 0;
  for (const id of api.game.solution[0]) tap(id);
  assert(
    effects.pools.petal.filter((p) => p.active).length === 8 &&
      effects.pools.glow.every((p) => !p.active),
    "Low quality halves petals and omits secondary glow without changing match timing",
  );
  r.stop();
  r.tick(120);
  assert(
    api.game.solution[0].every((id) => !r.views.get(id).container.visible),
    "A single slow 120ms frame still finishes tile removal on time",
  );
  r.start();
  r.quality = previousQuality;
  api.newGame(0);
  await wait(500);
  doc.querySelector("#settings").click();
  const reduced = doc.querySelector('[data-setting="reducedMotion"]');
  reduced.checked = false;
  reduced.click();
  doc.querySelector("#settings-done").click();
  for (const id of api.game.solution[0]) tap(id);
  assert(
    effects.pools.petal.every((p) => !p.active) &&
      effects.pools.flash.every((p) => !p.active),
    "Reduced motion suppresses decorative movement and flashes",
  );
  doc.querySelector("#settings").click();
  doc.querySelector('[data-setting="reducedMotion"]').click();
  doc.querySelector("#settings-done").click();
  api.newGame(0);
  await wait(500);
}
