import {
  createBoard,
  isFree,
  pairs,
  matches,
  assignSolvable,
  LAYOUTS,
} from "./board.js";
import { load, save, localDate } from "./storage.js";
import { AudioManager } from "./audio.js";
import { BoardRenderer } from "./renderer.js";
document.querySelector("#loading p").textContent = "Creating your WebGL garden";
const $ = (id) => document.getElementById(id),
  data = load(),
  audio = new AudioManager(data.settings);
const titles = [
  "The Quiet Garden",
  "Steps of Stillness",
  "Across the Stream",
  "The Twin Sanctuaries",
  "Where the Lotus Blooms",
  "The Wandering River",
  "Walls of Emerald",
  "The Winding Path",
  "A Golden Morning",
  "Wings in the Garden",
  "The Hidden Jewel",
  "The Jade Temple",
];
let game,
  selected = null,
  lastMatch = 0,
  combo = 0,
  paused = false,
  contextLost = false,
  ready = false,
  keyboardIndex = -1;
let completionTimer;
const renderer = new BoardRenderer($("board"), data.settings, selectTile);
function persist() {
  if (game) data.session = structuredClone(game);
  save(data);
}
function applySettings() {
  document.body.classList.toggle("high-contrast", data.settings.highContrast);
  document.body.classList.toggle("reduced-motion", data.settings.reducedMotion);
  audio.sync();
  if (ready) renderer.refresh();
  save(data);
}
function vibrate(ms) {
  if (data.settings.haptics) navigator.vibrate?.(ms);
}
function message(text) {
  $("message").textContent = text;
}
function formatTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
function update() {
  const remaining = game.tiles.filter((t) => !t.removed).length;
  $("remaining").textContent = remaining;
  $("score").textContent = game.score.toLocaleString();
  $("timer").textContent = formatTime(game.elapsed);
  $("undo").disabled = !game.history.length || remaining === 0;
  $("hint").disabled = remaining === 0;
  $("shuffle").disabled = remaining === 0;
  $("level-label").textContent = game.daily
    ? `DAILY RITUAL · ${game.date}`
    : `CHAPTER ${String(game.level + 1).padStart(2, "0")} · THE JADE PATH`;
  $("level-name").textContent = game.daily
    ? "A Moment for Today"
    : titles[game.level];
  $("path-progress").textContent =
    `${String(data.completed.length).padStart(2, "0")} / 12`;
  $("path-fill").style.width = `${(data.completed.length / 12) * 100}%`;
  $("path-description").textContent = data.completed.length
    ? `${data.completed.length} gardens discovered. Your path continues.`
    : "Your journey begins with a single pair.";
  $("daily").classList.toggle("active", game.daily);
  $("journey").classList.toggle("active", !game.daily);
}
function newGame(level = 0, daily = false) {
  clearTimeout(completionTimer);
  const date = localDate(),
    seed = daily ? `jade-daily-${date}` : `jade-${level}-${Date.now()}`;
  if (daily) level = Number(date.replaceAll("-", "")) % 12;
  const board = createBoard(level, seed);
  game = {
    version: 1,
    level,
    daily,
    date,
    seed,
    tiles: board.tiles,
    solution: board.solution,
    score: 0,
    elapsed: 0,
    history: [],
    hints: 0,
    shuffles: 0,
  };
  selected = null;
  combo = 0;
  lastMatch = 0;
  keyboardIndex = -1;
  renderer.setBoard(game.tiles);
  update();
  message("Match two free tiles. Make a little space.");
  persist();
}
function closeModal() {
  if (contextLost || !ready) return;
  $("modal").close();
  paused = false;
  lastMatch = 0;
  combo = 0;
  if (!document.hidden) {
    renderer.start();
    audio.unlock();
  }
}
function showModal(html) {
  if (!ready) return;
  paused = true;
  renderer.stop();
  audio.suspend();
  $("modal-content").innerHTML = html;
  if (!$("modal").open) $("modal").showModal();
}
function button(id, handler) {
  $(id).addEventListener("click", handler);
}
function chooseGame(level, daily = false) {
  closeModal();
  audio.unlock();
  newGame(level, daily);
}
function selectTile(id) {
  if (!ready || paused || contextLost) return;
  audio.unlock();
  const tile = game.tiles.find((t) => t.id === id);
  if (!tile || tile.removed) return;
  if (!isFree(tile, game.tiles)) {
    renderer.invalid([id]);
    audio.play("invalid");
    message("That tile needs a little space. Free its top and one side.");
    return;
  }
  if (selected === id) {
    selected = null;
    renderer.select(null);
    return;
  }
  if (selected !== null) {
    const first = game.tiles.find((t) => t.id === selected);
    if (matches(first, tile)) {
      const now = performance.now();
      combo = now - lastMatch < 5000 ? Math.min(combo + 1, 5) : 1;
      lastMatch = now;
      game.history.push({ ids: [first.id, tile.id], score: game.score });
      first.removed = tile.removed = true;
      game.score += 100 * combo;
      renderer.remove([first.id, tile.id]);
      if (combo > 1) renderer.showCombo(combo);
      audio.play("match", combo);
      vibrate(12);
      selected = null;
      update();
      persist();
      if (game.tiles.every((t) => t.removed)) {
        complete();
        return;
      }
      if (!pairs(game.tiles).length)
        message("No pairs are open. Undo a move or shuffle for a fresh path.");
      else
        message(
          combo > 1
            ? `Beautiful flow · ${combo}× combo · +${100 * combo}`
            : "A perfect pair. A little more space.",
        );
      return;
    }
    renderer.invalid([selected, id]);
    audio.play("invalid");
    selected = null;
    renderer.select(null);
    message(
      "Look for the same symbol. Flowers and seasons pair within their family.",
    );
    return;
  }
  selected = id;
  renderer.select(id);
  audio.play("select");
  message(
    `${tile.symbol.replaceAll("_", " ")} selected. Find its free partner.`,
  );
}
function hint() {
  if (paused || !ready) return;
  audio.unlock();
  const available = pairs(game.tiles);
  if (!available.length) {
    message("No free pairs. Undo or shuffle to continue.");
    audio.play("invalid");
    return;
  }
  let pair = available[0];
  const next = game.solution?.find((ids) =>
    ids.every((id) => !game.tiles.find((t) => t.id === id).removed),
  );
  if (next) {
    const candidate = next.map((id) => game.tiles.find((t) => t.id === id));
    if (candidate.every((t) => isFree(t, game.tiles)) && matches(...candidate))
      pair = candidate;
  }
  selected = null;
  renderer.select(null);
  renderer.hint(pair.map((t) => t.id));
  game.hints++;
  message("A little nudge. The two golden tiles are a match.");
  audio.play("hint");
  persist();
}
function undo() {
  if (paused || !ready || !game.history.length) return;
  const move = game.history.pop();
  for (const id of move.ids)
    game.tiles.find((t) => t.id === id).removed = false;
  game.score = move.score;
  combo = 0;
  lastMatch = 0;
  selected = null;
  renderer.setBoard(game.tiles);
  update();
  audio.unlock();
  audio.play("undo");
  message("A step back can open a new path.");
  persist();
}
function shuffle() {
  if (paused || !ready) return;
  try {
    game.solution = assignSolvable(
      game.tiles,
      `${game.seed}-shuffle-${++game.shuffles}`,
    );
  } catch {
    message("Undo your last move to open another path.");
    return;
  }
  game.history = [];
  selected = null;
  combo = 0;
  renderer.setBoard(game.tiles);
  update();
  audio.unlock();
  audio.play("shuffle");
  message("A fresh arrangement. Every tile has a way home.");
  persist();
}
function complete() {
  data.best = Math.max(data.best, game.score);
  if (game.daily) {
    data.daily[game.date] = Math.max(data.daily[game.date] || 0, game.score);
  } else {
    if (!data.completed.includes(game.level)) data.completed.push(game.level);
    data.unlocked = Math.min(12, Math.max(data.unlocked, game.level + 2));
  }
  persist();
  update();
  renderer.celebrate();
  audio.play("complete");
  vibrate(25);
  const completedGame = game;
  completionTimer = setTimeout(() => {
    if (contextLost || !ready || game !== completedGame) return;
    showModal(
      `<div class="completion-mark">✧</div><div class="modal-eyebrow">A LITTLE MOMENT, WELL SPENT</div><h2>${game.daily ? "Your daily ritual, complete." : "A garden in harmony."}</h2><p>${game.level === 11 && !game.daily ? "You have walked the entire Jade Path. Revisit any garden whenever you need a moment." : "You made room for a little calm. Take it with you."}</p><div class="completion-stats"><div><strong>${game.score.toLocaleString()}</strong>points</div><div><strong>${formatTime(game.elapsed)}</strong>your time</div></div><button class="primary" id="next-level">${game.daily ? "Return to your journey" : game.level === 11 ? "Explore your gardens" : "Continue the journey"}</button><button class="secondary" id="replay">Play this garden again</button>`,
    );
    button("next-level", () =>
      game.daily || game.level === 11 ? journey() : chooseGame(game.level + 1),
    );
    button("replay", () => chooseGame(game.level, game.daily));
  }, 450);
}
function journey() {
  showModal(
    `<div class="modal-eyebrow">THE JADE PATH</div><h2>Your journey</h2><p>Twelve gardens. A little more stillness with every step.</p><div class="journey-grid">${LAYOUTS.map((name, i) => `<button data-level="${i}" ${i >= data.unlocked ? "disabled" : ""} aria-label="${name}, ${i >= data.unlocked ? "locked" : data.completed.includes(i) ? "completed" : "available"}">${data.completed.includes(i) ? "✓" : String(i + 1).padStart(2, "0")}<small>${name}</small></button>`).join("")}</div><button class="secondary" id="daily-modal">Today's daily ritual</button>`,
  );
  for (const b of $("modal-content").querySelectorAll("[data-level]"))
    b.addEventListener("click", () => chooseGame(Number(b.dataset.level)));
  button("daily-modal", daily);
}
function daily() {
  const date = localDate(),
    done = data.daily[date];
  showModal(
    `<div class="modal-eyebrow">${date} · DAILY RITUAL</div><h2>A fresh moment.</h2><p>One shared puzzle for today. Come back tomorrow for a new arrangement.</p>${done ? `<p>Your best today: <strong>${done.toLocaleString()} points</strong></p>` : ""}<button class="primary" id="start-daily">${done ? "Enjoy it again" : "Begin today’s ritual"}</button><button class="secondary" id="return-daily">Return to my garden</button>`,
  );
  button("start-daily", () => chooseGame(0, true));
  button("return-daily", closeModal);
}
function settings() {
  showModal(
    `<div class="modal-eyebrow">MAKE YOURSELF AT HOME</div><h2>Your kind of calm.</h2>${[
      ["sound", "Tile sounds"],
      ["music", "Ambient melody"],
      ["haptics", "Gentle haptics"],
      ["reducedMotion", "Reduced motion"],
      ["highContrast", "High contrast tiles"],
    ]
      .map(
        ([key, label]) =>
          `<label class="setting">${label}<input type="checkbox" data-setting="${key}" ${data.settings[key] ? "checked" : ""}></label>`,
      )
      .join(
        "",
      )}<p>Progress is saved automatically on this device.</p><button class="primary" id="settings-done">Back to the garden</button>`,
  );
  for (const input of $("modal-content").querySelectorAll("input"))
    input.addEventListener("change", () => {
      data.settings[input.dataset.setting] = input.checked;
      applySettings();
      audio.suspend();
    });
  button("settings-done", closeModal);
}
function how() {
  showModal(
    '<div class="modal-eyebrow">SIMPLE RULES. BEAUTIFUL POSSIBILITIES.</div><h2>Find a little space.</h2><p><strong>Find a pair.</strong> Tap two tiles with the same symbol to remove them.</p><p><strong>Look for free tiles.</strong> Nothing can sit on top, and either the left or right side must be open. Brighter tiles are ready to match.</p><p><strong>A few special friends.</strong> Any flower matches another flower. Any season matches another season.</p><p><strong>Take your time.</strong> Hints, undo and shuffle are always available. Match within five seconds for a score combo, or simply play at your own pace.</p><p>Keyboard: focus the board, use arrows and Enter. H for hint, Z for undo, S for shuffle.</p><button class="primary" id="how-done">Find my first pair</button>',
  );
  button("how-done", closeModal);
}
function pause() {
  if (!ready || contextLost) return;
  persist();
  showModal(
    '<div class="modal-eyebrow">THERE IS NO HURRY</div><h2>Take a breath.</h2><p>Your garden will be right here.</p><button class="primary" id="resume">Return to the garden</button><button class="secondary" id="restart">Start this garden again</button><button class="secondary" id="pause-journey">Explore your journey</button>',
  );
  button("resume", closeModal);
  button("restart", () => chooseGame(game.level, game.daily));
  button("pause-journey", journey);
}
button("close-modal", closeModal);
$("modal").addEventListener("cancel", (e) => {
  e.preventDefault();
  closeModal();
});
button("settings", settings);
button("journey", journey);
button("home", journey);
button("daily", daily);
button("pause", pause);
button("how", how);
button("hint", hint);
button("undo", undo);
button("shuffle", shuffle);
$("brand").addEventListener("click", (e) => {
  e.preventDefault();
  journey();
});
window.addEventListener("keydown", (e) => {
  if (!ready || $("modal").open || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key.toLowerCase() === "h") hint();
  if (e.key.toLowerCase() === "z") undo();
  if (e.key.toLowerCase() === "s") shuffle();
  if (e.key === "Escape") pause();
  if (
    document.activeElement === $("board") &&
    ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Enter", " "].includes(
      e.key,
    )
  ) {
    e.preventDefault();
    const free = game.tiles.filter((t) => isFree(t, game.tiles));
    if (!free.length) return;
    if (e.key === "Enter" || e.key === " ") {
      selectTile(free[Math.max(0, keyboardIndex) % free.length].id);
    } else {
      keyboardIndex =
        (keyboardIndex +
          (["ArrowLeft", "ArrowUp"].includes(e.key) ? -1 : 1) +
          free.length) %
        free.length;
      renderer.hint([free[keyboardIndex].id]);
      message(
        `Keyboard: ${free[keyboardIndex].symbol.replaceAll("_", " ")}. Press Enter to select.`,
      );
    }
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (ready) pause();
    audio.suspend();
  }
});
window.addEventListener("blur", () => {
  if (ready && !$("modal").open) pause();
});
window.addEventListener("pagehide", persist);
setInterval(() => {
  if (
    ready &&
    !paused &&
    !document.hidden &&
    game.tiles.some((t) => !t.removed)
  ) {
    game.elapsed++;
    $("timer").textContent = formatTime(game.elapsed);
    if (game.elapsed % 5 === 0) persist();
  }
}, 1000);
applySettings();
try {
  await renderer.init((n) => ($("load-progress").value = n));
  ready = true;
  const s = data.session;
  if (
    s?.version === 1 &&
    Array.isArray(s.tiles) &&
    s.tiles.length &&
    s.tiles.some((t) => !t.removed) &&
    s.level >= 0 &&
    s.level < 12 &&
    s.tiles.every(
      (t) =>
        Number.isFinite(t.x) &&
        Number.isFinite(t.y) &&
        renderer.textures[t.symbol],
    )
  ) {
    game = s;
    renderer.setBoard(game.tiles);
    update();
    message("Welcome back. Your quiet moment is right where you left it.");
  } else newGame(Math.min(data.unlocked - 1, 11));
  $("loading").remove();
  renderer.app.canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    contextLost = true;
    persist();
    showModal(
      '<div class="modal-eyebrow">YOUR PROGRESS IS SAFE</div><h2>Restoring your garden…</h2><p>The graphics connection was interrupted. Please wait a moment.</p><button class="primary" id="reload">Reload saved garden</button>',
    );
    button("reload", () => location.reload());
  });
  renderer.app.canvas.addEventListener("webglcontextrestored", () => {
    contextLost = false;
    renderer.setBoard(game.tiles);
    pause();
  });
  if (new URLSearchParams(location.search).has("test"))
    window.jadeTest = {
      get game() {
        return game;
      },
      get renderer() {
        return renderer;
      },
      selectTile,
      newGame,
      hint,
      undo,
      shuffle,
      pairs: () => pairs(game.tiles),
      closeModal,
    };
} catch (error) {
  console.error(error);
  $("loading").innerHTML =
    '<h2>Your garden needs WebGL.</h2><p>Please enable hardware acceleration or try a supported browser.</p><button id="retry">Try again</button>';
  button("retry", () => location.reload());
}
