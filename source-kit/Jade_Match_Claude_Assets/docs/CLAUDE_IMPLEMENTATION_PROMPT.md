# CRITICAL TECHNICAL REQUIREMENTS — WEBGL + MOBILE FIRST

These requirements override any earlier rendering assumptions.

## Rendering engine

The actual Mahjong board, tiles, tile shadows, particles, match effects and board animations
MUST be rendered using **WebGL**.

Preferred implementation:
- PixiJS 8+ or an equivalent lightweight WebGL renderer

Acceptable alternative:
- Three.js only if it is used efficiently for a mostly 2D/2.5D game

DO NOT build the gameplay board as hundreds of positioned HTML DOM elements.

DOM/CSS may be used only for:
- accessibility overlays
- settings modal
- lightweight menu text
- non-gameplay shell UI

The gameplay scene itself must be GPU-rendered.

## Rendering architecture

Use:
- one WebGL canvas
- GPU sprites
- sprite batching
- texture atlases where useful
- shared textures
- object pooling for particles
- transform-based animation
- requestAnimationFrame
- devicePixelRatio-aware rendering
- adaptive resolution

The tile board should feel 2.5D:
- layered Z ordering
- directional shadows
- tile elevation
- subtle depth
- optional tiny perspective treatment

Do NOT use a heavy 3D scene when 2D WebGL sprites can produce the same effect.

## Mobile-first

The game is primarily for phones.

Primary orientation:
- portrait

Required support:
- iPhone
- Android
- tablets
- desktop browser

Design first for:
- 360x800
- 390x844
- 412x915
- 430x932

Then scale upward.

## Touch controls

Touch interaction is first-class.

Requirements:
- pointer events
- tap detection
- no 300 ms delay
- prevent accidental page scrolling during gameplay
- prevent pinch zoom on gameplay canvas unless intentionally implemented
- no text selection
- no drag requirement for core matching
- generous hit areas
- minimum effective target ~44 CSS px
- tolerate slight finger inaccuracy

Use:
`touch-action: none`
on the active gameplay canvas where appropriate.

## Safe areas

Respect:
- env(safe-area-inset-top)
- env(safe-area-inset-bottom)
- env(safe-area-inset-left)
- env(safe-area-inset-right)

No HUD button may sit under:
- notch
- Dynamic Island
- Android camera cutout
- home indicator

## Responsive board fitting

The board must dynamically fit available space.

Algorithm should:
1. determine available gameplay viewport
2. calculate complete board bounds
3. determine maximum tile scale
4. preserve aspect ratio
5. center board
6. include safe margins
7. keep tiles comfortably tappable

Never crop important tiles off-screen.

Do not require the browser page itself to scroll.

## Adaptive quality

Target:
- 60 FPS on modern mobile devices

Provide automatic quality profiles:

HIGH:
- full particles
- soft shadows
- DPR up to 2
- richer effects

MEDIUM:
- reduced particles
- simpler shadow filter
- DPR ~1.5

LOW:
- minimal particles
- baked/simple shadows
- DPR ~1
- no expensive blur filters

Detect sustained low FPS and automatically step down quality.

Do not reduce tile readability.

## WebGL effects

Implement GPU-friendly visual effects:

Tile select:
- elevation
- scale
- shadow expansion
- subtle highlight

Match:
- white/gold flash
- micro scale
- shard sprite particles
- sparkles
- fade

Combo:
- burst sprites
- lightweight radial glow
- animated text/sprite treatment

Level completion:
- particles
- soft bloom-like sprite treatment
- petals
- gold dust

Avoid expensive full-screen post-processing on mobile.

## Asset loading

Create an asset loader/preloader.

Before gameplay:
- preload tile atlas
- UI atlas
- core VFX
- first background

Lazy-load:
- later themes
- optional cosmetics
- secondary journey assets

Show a polished loading screen with progress.

## Texture strategy

Prefer:
- WebP/PNG textures
- texture atlases
- power-efficient sprite batching

Generate:
- 1x mobile assets
- optional 2x high-density assets

Do not upload 4K textures for small sprites.

## Memory

Mobile memory is important.

Requirements:
- unload unused theme textures
- destroy orphaned textures
- reuse particle sprites
- avoid creating new graphics every frame
- avoid memory leaks when restarting levels

## Audio on mobile

Because mobile browsers restrict autoplay:

- initialize WebAudio after first user interaction
- resume AudioContext on tap
- pool frequently-used SFX
- support mute
- support app/tab visibility changes

When document becomes hidden:
- pause music
- suspend gameplay loop if appropriate

When restored:
- resume gracefully

## Haptics

Use navigator.vibrate where supported.

Never require it.

Respect user setting.

## Mobile lifecycle

Handle:
- orientation change
- resize
- browser toolbar expanding/collapsing
- app switching
- tab backgrounding
- WebGL context loss

Listen for:
`webglcontextlost`
`webglcontextrestored`

Recover without destroying saved progress.

## PWA-ready

Structure the project so it can optionally become a PWA.

Recommended:
- manifest.webmanifest
- service worker
- installable icon set
- offline caching of core assets

The game must still work as a normal website.

## Required technical stack

Preferred:

- HTML5 shell
- JavaScript ES Modules
- PixiJS/WebGL
- Web Audio API
- localStorage / IndexedDB if required
- CSS only for external UI shell

Recommended file structure:

/index.html
/css/app.css

/js/main.js
/js/renderer.js
/js/game.js
/js/board.js
/js/tile.js
/js/solver.js
/js/input.js
/js/animations.js
/js/particles.js
/js/audio.js
/js/storage.js
/js/mobile.js
/js/quality.js

/assets/atlases/
/assets/tiles/
/assets/ui/
/assets/vfx/
/assets/backgrounds/
/assets/audio/

## Hard acceptance criteria

The implementation is NOT complete unless:

- gameplay board is WebGL-rendered
- tiles are WebGL sprites
- match VFX are rendered inside WebGL
- touch controls work reliably on mobile
- gameplay fills mobile viewport correctly
- no browser scrolling occurs during gameplay
- safe areas are respected
- portrait mode is excellent
- landscape does not break
- 60 FPS is the normal target
- quality can automatically scale down
- WebGL context loss is handled
- device rotation does not break tile hit-testing
- tap coordinates remain correct after resize
- game is fully playable one-handed
- first playable load is optimized for mobile

---

# CLAUDE IMPLEMENTATION INSTRUCTIONS

You are working with the attached `Jade_Match_Claude_Assets/assets` folder.

Your task is to build a complete polished Mahjong Solitaire game named **Jade Match**.

## Asset rule

Before coding, recursively inspect all files under `/assets` and read `assets/manifest.json`.

Use the provided visual references as the single art-direction source of truth.

Do not replace the visual language with generic emoji, flat rectangles, random icons, or default browser buttons.

If a cropped reference PNG contains the jade sheet background, recreate that individual asset as a clean CSS/SVG/Canvas sprite while preserving:
- symbol
- proportions
- ivory porcelain face
- jade depth
- gold edge language
- shadow direction
- premium tactile appearance

## Core gameplay

Implement true Mahjong Solitaire logic.

A tile is selectable only when:
1. no tile geometrically overlaps it from a higher Z layer; and
2. its left OR right side is open.

A match removes two equal selectable tiles.

Special matching:
- any Flower may pair with any Flower
- any Season may pair with any Season

Never fake blocked/free state with hardcoded IDs.
Calculate it from geometry.

## Required feel

Selection:
- immediate response
- translateY(-6px)
- scale(1.04)
- brighter face
- deeper shadow

Successful match:
- confirmation within ~70 ms
- lift
- very small inward motion
- scale ~1.07
- flash
- lightweight shard/sparkle burst
- disappear
- total effect roughly 220–350 ms

Invalid tile:
- 3 px shake
- muted feedback

Wrong pair:
- short wiggle
- reset selection
- under ~220 ms

Never block input behind long animations.

## Systems required

- solver-validated boards
- hint
- undo
- shuffle
- combo timer
- level progression
- daily challenge seeded by date
- journey map
- localStorage
- audio toggles
- haptic toggles
- reduced motion
- high contrast
- responsive mobile layout
- safe-area handling
- mouse + touch

## Board generator

Build reusable coordinate layouts:
Turtle, Pyramid, Bridge, Twin Towers, Lotus, Wave, Fortress, Spiral, Crown, Butterfly, Diamond, Temple.

Use x/y/z geometry.

Generate pair assignment from a legal reverse removal order, then validate with an internal solver.

Never intentionally produce unsolvable boards.

## UI

Portrait-first.

Top:
- back/home
- level
- remaining tile count
- settings

Bottom:
- Undo
- Hint
- Shuffle

Use the supplied UI references.

## Polish

This is not complete when it merely works.

Perform a final pass for:
- tile depth
- shadow consistency
- touch latency
- readable symbols
- board fitting
- combo feel
- sound synchronization
- particle restraint
- level-complete celebration
- mobile responsiveness

Target the feel of a commercial casual mobile puzzle game, not a coding demo.

## Do not

- use emoji as final assets
- use Bootstrap-looking buttons
- make the board flat
- allow blocked tiles to select
- shrink tiles until they are hard to tap
- use long modal animations
- copy Vita Mahjong branding or exact graphic assets
