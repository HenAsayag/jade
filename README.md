# Jade Match

A mobile-first Mahjong Solitaire game built from the **first Jade Match ZIP**. The game uses a single PixiJS 8 WebGL canvas for its layered board, tile atlas, animation, and pooled effects. There is no backend or build dependency at runtime.

## Play locally

Run `npm start`, then open http://localhost:4173. Node.js 20 or newer is recommended. The checked-in renderer means `npm install` is only needed for development checks and formatting.

- Tap two free matching tiles. A free tile has no overlapping tile above it, and an open left or right side.
- Any flower matches another flower; any season matches another season.
- Undo, hint, and solvable shuffle are unlimited. Matching within five seconds increases the score multiplier to 5×.
- Complete chapters to unlock the twelve-layout journey. The daily ritual uses the device's local calendar date and the same seed for all players on that date.
- Settings include sound, original synthesized ambient music, haptics, reduced motion, and tile contrast.
- Progress and preferences save locally. Closing a dialog resumes play; losing focus pauses until you explicitly resume.
- Keyboard: focus the board, arrows to inspect free tiles, Enter to select. H hints, Z undoes, S shuffles, Escape pauses.

## Deployment

`npm run build` copies the static website into `dist/`. Publish that directory on any static host, including GitHub Pages, Netlify, or Vercel. No Node server is needed in production. Keep `.mjs` served as JavaScript. All runtime resources are local; no CDN, external font, tracking, or account is required.

The included development server listens only on `127.0.0.1:4173`.

## Development and verification

- `npm install`
- `npm run check` — JavaScript syntax checks.
- `npm test` — verifies geometric blocking, special families, deterministic daily deals, solvable shuffle, and legal complete solutions across 1,200 generated boards.
- Open `/tests/browser.html` while the local server runs to execute WebGL browser integration checks. The harness uses a separate localStorage key and never changes player progress.

Browser integration covers matches, undo, hints, shuffle, save/reload, settings, pause, daily repeatability, completion of all twelve chapters, bounded render objects over repeated games, context loss/restoration, and board fitting at 360×800, 390×844, 412×915, 430×932, 844×390, 1366×768, and 1920×1080. Portrait tiles meet the 44 CSS px face-width target in these phone checks. Very short landscape views fit the entire board with smaller tiles.

Desktop browser emulation does not establish actual iPhone/Android GPU performance or haptic support. Those still need testing on physical devices. The renderer targets 60 FPS and automatically reduces resolution/effects after sustained slow frames.

## Architecture

- `js/board.js` — pure geometry, matching, seeded deal generation and complete solution validation.
- `js/layouts.js` — twelve distinct compact coordinate patterns and supported upper layers.
- `js/renderer.js` — WebGL sprites/atlas, hit testing, animation, pooled particles and adaptive quality.
- `js/main.js` — game session, progression, controls, dialogs and lifecycle.
- `js/audio.js` — original Web Audio synthesis and ambient sequence.
- `js/storage.js` — versioned local save and date handling.
- `source-kit/` — unmodified first ZIP for provenance and design reference; not copied to deployment.

Tile references are packed into a shared texture atlas at startup with rounded alpha bounds. Original illustrated symbols, porcelain faces, jade edges and gold accents are retained. The renderer is vendored under its MIT license in `vendor/PIXI-LICENSE.txt`. No assets or instructions from the Cosmic Coop ZIP are used.

## Animation pass

Tiles use a short staggered entrance, eased selection lift with a grounded shadow, pulsing hints, and a 340 ms match sequence (lift, inward draw, porcelain highlight, sparkles, dissolve). Shuffle uses a brief settling motion. Removed tiles immediately stop receiving input, so visual feedback does not block the next match. Reduced-motion mode removes translation, scaling, pulses, flashes, and particles; matches use a quick opacity transition.
