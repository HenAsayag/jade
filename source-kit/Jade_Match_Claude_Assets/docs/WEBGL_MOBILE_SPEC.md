# WEBGL MOBILE TECHNICAL SPEC

Renderer:
- PixiJS 8+ preferred
- WebGL-based rendering mandatory for gameplay
- Canvas renderer fallback is optional only if WebGL is unavailable

Core principles:
- single gameplay canvas
- portrait-first
- pointer/touch input
- sprite batching
- atlases
- object pooling
- adaptive DPR
- quality scaling
- 60 FPS target

Mobile targets:
- 360x800
- 390x844
- 412x915
- 430x932

Critical:
- no page scrolling while playing
- safe-area support
- resize/orientation correctness
- visibility lifecycle handling
- WebGL context lost/restored handling
- mobile WebAudio unlock on first gesture

Recommended engine:
PixiJS gives this game the right balance between:
- GPU acceleration
- simple sprite-based 2.5D visuals
- fast batching
- touch hit testing
- particles
- mobile performance

Do not over-engineer this as a full 3D game unless a feature truly requires it.
