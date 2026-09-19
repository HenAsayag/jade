export async function checkAnimationCorrection(api, frame, assert) {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  api.closeModal();
  api.newGame(0);
  const doors = frame.contentDocument.querySelector(".opening-doors");
  assert(
    !doors.hidden && doors.getAnimations({ subtree: true }).length === 2,
    "New garden opens through two animated doors",
  );
  await wait(1150);
  assert(
    doors.hidden,
    "Opening doors leave no overlay after revealing the board",
  );
  const r = api.renderer,
    effects = r.matchEffects,
    poolSize = effects.layer.children.length;
  const first = api.game.solution[0],
    second = api.game.solution[1],
    third = api.game.solution[2];
  let impacts = 0;
  const originalImpact = r.onImpact;
  r.onImpact = (reward) => {
    impacts++;
    originalImpact?.(reward);
  };
  r.stop();
  r.quality = 2;
  r.slowTime = 0;
  for (const id of first) api.selectTile(id);
  const views = first.map((id) => r.views.get(id));
  assert(
    views.every((v) => v.container.eventMode === "none"),
    "Flying tiles release their hitboxes immediately",
  );
  assert(
    views[0].baseX + views[0].matchX === views[1].baseX + views[1].matchX &&
      views[0].baseY + views[0].matchY === views[1].baseY + views[1].matchY,
    "Both tiles fly to the same collision point",
  );
  r.tick(120);
  assert(impacts === 0, "Impact feedback waits for the tiles to meet");
  assert(
    views.every((v) => v.container.visible) &&
      effects.pools.shard.every((p) => !p.active),
    "Tiles remain visible in flight before shattering",
  );
  for (const id of second) api.selectTile(id);
  assert(
    api.game.score === 300,
    "A second pair matches while the first pair is still flying",
  );
  r.tick(120);
  assert(
    effects.pools.shard.filter((p) => p.active).length === 24 &&
      effects.pools.flash.filter((p) => p.active).length === 1,
    "First collision emits one flash and a pooled ceramic shard burst",
  );
  assert(impacts === 1, "Sound and haptic feedback fire once at collision");
  const firstShards = effects.pools.shard.filter((p) => p.active);
  r.tick(120);
  assert(
    views.every((v) => !v.container.visible),
    "First pair disappears after collision",
  );
  assert(
    firstShards.some((p) => p.active) &&
      effects.pools.shard.filter((p) => p.active).length === 48,
    "Two collisions coexist without cancelling their shards",
  );
  assert(
    effects.layer.eventMode === "none",
    "Shards cannot intercept gameplay input",
  );
  for (const id of third) api.selectTile(id);
  r.tick(240);
  assert(
    effects.pools.shard.filter((p) => p.active && p.age === 0).length === 24,
    "A third rapid collision still gets a complete shard burst",
  );
  assert(impacts === 3, "Rapid pairs each receive exactly one impact callback");
  r.onImpact = originalImpact;
  r.tick(1000);
  assert(
    effects.activeCount === 0 && effects.layer.children.length === poolSize,
    "Collision effects return to their fixed pools",
  );
  r.start();
  api.newGame(0);
  await wait(500);
  const doc = frame.contentDocument;
  doc.querySelector("#settings").click();
  const reduced = doc.querySelector('[data-setting="reducedMotion"]');
  reduced.checked = false;
  reduced.click();
  doc.querySelector("#settings-done").click();
  r.stop();
  r.quality = 2;
  r.slowTime = 0;
  for (const id of api.game.solution[0]) api.selectTile(id);
  r.tick(100);
  assert(
    api.game.solution[0].every((id) => !r.views.get(id).container.visible) &&
      effects.pools.shard.every((p) => !p.active),
    "Reduced motion uses fast in-place disappearance without shards",
  );
  r.start();
  doc.querySelector("#settings").click();
  doc.querySelector('[data-setting="reducedMotion"]').click();
  doc.querySelector("#settings-done").click();
  api.newGame(0);
}
