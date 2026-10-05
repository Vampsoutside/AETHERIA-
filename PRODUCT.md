# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A technical audience evaluating one person's frontend and real-time-graphics capability: recruiters, engineering managers, and peers who will open the link, scroll for a minute, and judge whether the craft is real. Secondary: a viewer returning to hunt the five side quests and collect the Aether Cores.

The primary user is comfortable with shader code, WebGL and design vocabulary. Explaining what a bloom pass or a Catmull-Rom spline is costs them attention rather than earning it.

## Product Purpose

Aetheria is a portfolio piece demonstrating spatial interface craft — the ability to make a 3D environment feel navigable, calm under motion, and worth exploring rather than merely impressive for one screenshot.

Four regions hang in one continuous sky. The visitor travels between them by scrolling; the camera flies a spline through the archipelago rather than cutting between scenes. Side quests are woven into the environment itself, so discovery is the interface.

Success means a viewer finishes the first minute still scrolling, and finishes the fifth still looking for the thing they nearly missed. There is no conversion metric, no account, no checkout.

## Positioning

A spatial interface where every 3D affordance is discoverable and every camera movement is user-caused. The distinguishing commitment is honesty about motion: the camera only travels when the visitor scrolls, an undiscoverable easter egg is treated as a bug rather than a reward, and the performance tier system is framed as an accessibility feature rather than a graphics setting.

Most WebGL portfolio pieces optimise for the screenshot. This one optimises for the sixty seconds after it.

## Operating Context

Deployed publicly on Vercel at `aetheria-vampsoutside.vercel.app`, built from `github.com/Vampsoutside/AETHERIA-`. Production serves a single prerendered route today.

No server, no accounts, no analytics, no telemetry. All progression lives in the visitor's own `localStorage` under `aetheria.quest.v1` and `aetheria.graphics.v1`, so clearing site data resets the archipelago. There is no recovery path and no cross-device continuity — that is accepted, not pending.

## Capabilities and Constraints

**Capability as designed.** Four regions (Gate of Origin, the Crucible, Archive of Artifacts, Citadel of Knowledge) each with its own camera spline and world origin. Five side quests awarding Aether Cores and unlocking a second palette. A synchronous WebGL probe selects a graphics tier before the Canvas mounts, so particle budgets are never rebuilt mid-session. GPU-driven particle system, custom GLSL for the monolith, particles, sandbox lattice and codex glyphs. Procedurally generated audio and 3D assets committed to `public/`.

**Undecided:** the visitor mode for each region is a design decision still open — the Gate is a Persuade surface, while `/codex` is fundamentally a Read surface (long-form articles) and `/vault` an Experience surface (inspect objects). These are not yet reconciled in a written surface brief.

**Constraints future work must respect:**
- Three of four regions are not yet implemented — `/playground`, `/vault` and `/codex` return 404. Completing them is in scope.
- `demoUrl` on every artifact points at `/demos/shader-lab.html`, which **does not exist**. Treat those links as unimplemented; do not render them as though they work.
- The quest engine and progression are entirely client-side. Any reward that acquires economic meaning must move server-side before it is treated as real.
- zustand v5 has no default shallow-equality. Any selector returning a fresh object or array must be wrapped in `useShallow` or it loops the render.
- R3F's `shadows={true}` requests a shadow-map type three r186 deprecated; pass `"percentage"` instead.
- Howler's global volume setter is `volume()`, not `masterVolume()`.

## Brand Commitments

**Name:** AETHERIA, set in a wide-tracked display face. The wordmark is used bare, without a tagline, at the top of the persistent nav.

**Voice:** Terse, technical, unhurried. Section labels are roman numerals and uppercase mono; copy speaks plainly and never explains a joke. The existing chapter copy — "Something still burns at the centre of the gate. It is not a light. It is a frequency" — is the register to match.

**The palette is load-bearing.** The default `aether` palette is electric cyan `#00F0FF` on near-black `#050508` with deep neon purple `#7000FF` as its second. It is mirrored between CSS custom properties and GLSL uniforms from a single source of truth, because unlocking the `cyberpunk` palette as a quest reward must reskin DOM and 3D in the same frame. That reskin is the brand moment. Any visual work must keep the two layers synchronised.

**Typography:** three families with assigned jobs — Syne for display, Inter for body, JetBrains Mono for HUD labels and readouts. Numeric readouts use tabular figures so digits never jitter.

## Evidence on Hand

The showcase content is authored and internally consistent — treat it as real for the purposes of this product:

- Six artifacts with codenames, studios, years, specifications, stack lists and benchmark metrics (`src/lib/content/artifacts.ts`)
- Three long-form articles with named authors, roles, dates, difficulty ratings and body blocks (`src/lib/content/articles.ts`)
- Five quests with objectives, hints and reward definitions (`src/lib/quests.ts`)
- Seven GLB models and nine WAV samples, all generated by `scripts/generate-assets.mjs` and `scripts/generate-audio.mjs`; `public/models/LICENSE-DamagedHelmet.md` covers the one third-party asset
- Real, verifiable engineering: the shaders compile and render, the tier system runs, quest completion persists across reload

**Must not be fabricated:** no testimonials, no user counts, no press, no awards, no client names. `TERMINAL_PASSWORD` is a designed game mechanic, not a security claim — no Easter egg here should be described as a real vulnerability.

## Product Principles

1. **Motion must be caused by the visitor.** No idle camera drift, no auto-advance. Autonomous camera movement is a budget of about 1.4 seconds per route change, masked by a dissolve, spent once.
2. **An undiscoverable easter egg is a bug.** Quest targets pulse visibly and warm under the pointer. If it cannot be found, the fault is the design.
3. **Performance is accessibility.** Tier 1 drops post-processing to a quarter of the particles and still has to look like the same site. Below roughly 40 fps, motion itself becomes the accessibility barrier.
4. **Reduced motion means stopped, not slowed**, and the choice persists across visits.
5. **The world is one place.** Regions share a continuous sky and the camera actually travels between them. Never a scene swap.

## Accessibility & Inclusion

Motion is a named requirement, not an afterthought: `prefers-reduced-motion` is honoured, a motion toggle sits within one click in the HUD at all times, and reduced motion stops animation rather than damping it.

Depth perception is supported by differential motion (parallax) and a static peripheral HUD anchor, which the authored research in `articles.ts` credits with a large reduction in reported discomfort. The HUD frame never animates during camera travel, deliberately, to give the viewer something stable to hold.

A quest-progress live region announces completion to screen readers (`NavRail.tsx`). Keyboard operation and focus visibility across the three unimplemented regions remain unverified and need attention when those surfaces are built.