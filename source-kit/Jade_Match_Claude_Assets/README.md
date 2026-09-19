# Jade Match — Claude Asset Pack

This folder is prepared to be dropped into a Claude Code project.

## What is included

- `assets/tiles/` — 42 original tile visual references:
  - 9 Orb
  - 9 Reed
  - 9 Glyph
  - 4 Flower
  - 4 Season
  - 4 Compass
  - 3 Element
- `assets/ui/` — Undo, Hint, Shuffle, Settings, Home, Calendar, Journey, Sound, Haptics, Reduced Motion.
- `assets/vfx/` — visual references for match shards, sparkles, gold dust, leaves, petals, combo effects and completion.
- `assets/backgrounds/` — game-board background.
- `assets/reference/` — full art direction sheet + 3D tile material references.
- `assets/manifest.json` — asset names and relative paths.
- `docs/CLAUDE_IMPLEMENTATION_PROMPT.md` — implementation instructions.

## Important usage note

The extracted PNG files are production *visual references cropped from the art-direction sheet*.
Some include the dark-jade sheet background around the asset.

Claude should use them in either of these ways:

1. Use them directly as temporary game sprites while building the full game.
2. Preferably recreate clean transparent runtime sprites in CSS/SVG/Canvas while matching these references.

Do NOT copy Vita Mahjong logos, branding, exact artwork, or proprietary screens.
The game should reproduce the gameplay category and tactile feel while using this original Jade Match identity.

## Recommended web-game structure

```text
/index.html
/css/game.css
/js/game.js
/js/board.js
/js/solver.js
/js/animations.js
/js/audio.js
/js/storage.js
/assets/...
```

## Visual targets

- Warm ivory porcelain tile face
- Jade-green tile core/back
- Antique gold UI accents
- Deep emerald board/background
- Large, senior-friendly readable symbols
- Fast tactile match animation
- 60 FPS


## Mandatory technical target

**This project must be built as a WebGL mobile-first game.**

Recommended renderer: **PixiJS 8+**.

The board, tile sprites, shadows, particles and gameplay animation belong inside a single WebGL canvas.
Do not implement the main board as positioned HTML elements.

Primary target:
- portrait mobile
- touch-first
- responsive
- safe-area aware
- 60 FPS
- adaptive quality
- GPU-friendly particles
- WebGL context-loss recovery

See `docs/CLAUDE_IMPLEMENTATION_PROMPT.md` for the full technical specification.
