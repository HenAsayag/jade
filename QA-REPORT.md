# Moonleaf QA — 2026-09-22

Scope: local Chromium/WebGL desktop browser, phone viewport simulation, automated game rules and state tests, and manual portrait/landscape inspection. Existing player storage was not reset; browser automation uses the separate test save key.

## Findings fixed

- Malformed saved progress/settings or incomplete sessions could break startup. Load now validates session geometry, tile IDs, history, solution references and numeric fields; valid progression is preserved while invalid sessions are discarded.
- The rules button was inside the hidden sidebar. How to play is now available through Settings on mobile and desktop.
- Undo, shuffle and resume could retain the old combo badge despite resetting scoring. The badge now resets with the chain.
- Keyboard Undo could resurrect the last pair after completion while leaving victory/progression awarded. Completed boards reject undo/shuffle regardless of input method.
- The delayed completion callback could replace an open pause/settings dialog. Completion waits until gameplay is resumed and is cancelled when a new board starts.
- WebGL restoration on the welcome screen could leave a recovery dialog trapped over the poster. It now returns to the paused welcome screen until the player enters.
- Failed localStorage writes were silent. A persistent in-game notice now explains that saving is unavailable, and clears after a successful save.
- System reduced-motion preference is used as the default unless the player has saved an explicit setting.

## Verification

- `npm test`: 15 passing tests, including 1,200 generated solvable boards, matching/blocking, shuffle, animation timing, score tweening, audio timer and storage corruption/recovery.
- `npm run check` and `npm run build` pass.
- `/tests/browser.html`: all twelve chapters, completion, hints/undo/shuffle, save/reload, daily repeatability, touch input, WebGL recovery, bounded render pools, converging tiles and synchronized impact, overlapping collisions and reduced motion.
- `/tests/qa.html`: regression scenarios above, help navigation, completion/pause timing, saving failure/recovery, modal bounds and HUD/control occlusion across compact viewports.
- `/tests/welcome.html`: poster loading, inert game controls, frozen clock, entry button fit, welcome WebGL loss/recovery, doors and all five settings.
- Phone sizes covered: 320x568, 360x640, 360x800, 390x844, 412x915, 430x932, 667x375, 844x390. Desktop: 1366x768 and 1920x1080.
- Manual visual check: portrait board and landscape board; Settings > How to play.

## Limits

This is not a physical-device certification. Safari/iOS, Android GPU performance, actual audible quality and vibration sensation need real devices. Short landscape screens fit the complete board but have smaller tile touch targets than portrait. No new online hosting deployment was performed.
