/**
 * The Citadel of Knowledge — deep-dive article dataset for /codex.
 *
 * Content is modelled as a typed block list rather than MDX on purpose: it lets
 * the renderer drop live R3F canvases, glitching code, and an inline terminal
 * directly into the flow of the prose without a compilation step.
 */

export type VisualizerId = 'domain-warp' | 'parallax-depth' | 'agent-graph';

export type Block =
  | { kind: 'h2'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'code'; lang: string; title?: string; code: string }
  | { kind: 'glitch'; lang: string; title: string; code: string; note: string }
  | { kind: 'callout'; tone: 'info' | 'warn' | 'insight'; title: string; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'quote'; text: string; cite: string }
  | { kind: 'visualizer'; id: VisualizerId; caption: string }
  | { kind: 'table'; head: string[]; rows: string[][] };

export interface Article {
  id: string;
  slug: string;
  index: string;
  title: string;
  kicker: string;
  dek: string;
  readMins: number;
  author: string;
  role: string;
  date: string;
  tags: string[];
  difficulty: 'Foundational' | 'Intermediate' | 'Advanced';
  accent: string;
  blocks: Block[];
}

export const ARTICLES: Article[] = [
  {
    id: 'glsl-domain-warp',
    slug: 'advanced-glsl-domain-warping',
    index: '01',
    title: 'Domain Warping: The Art of Controlled Chaos',
    kicker: 'Advanced GLSL Shaders',
    dek: 'Noise is boring. Noise evaluated at coordinates that have themselves been displaced by noise is where organic form actually comes from — and it costs almost nothing.',
    readMins: 14,
    author: 'R. Okonkwo',
    role: 'Lead Engineer',
    date: '2026-08-14',
    tags: ['GLSL', 'Shaders', 'Procedural', 'WebGL'],
    difficulty: 'Advanced',
    accent: '#00F0FF',
    blocks: [
      { kind: 'h2', text: 'The problem with raw noise' },
      {
        kind: 'p',
        text: 'Sample a value-noise field directly and you get exactly what you would expect: a soft, lumpy, evenly-distributed greyscale cloud. It is technically organic and aesthetically dead. There is no hierarchy, no structure, no sense that some regions matter more than others.',
      },
      {
        kind: 'p',
        text: 'Domain warping fixes this with a trick so cheap it feels illegal. Instead of evaluating noise at the fragment coordinate, you evaluate it at a coordinate that has been displaced by *another* noise lookup. The displacement field bends the sampling domain, and bent domains produce the swirling, marbled, vein-like structures that read as natural.',
      },
      {
        kind: 'code',
        lang: 'glsl',
        title: 'First-order warp',
        code: `// Displace the sampling domain by a noise vector
vec2 warp(vec2 p, float t) {
  vec2 q = vec2(
    noise(p + vec2(0.0, 0.0) + t * 0.10),
    noise(p + vec2(5.2, 1.3) - t * 0.08)
  );
  return p + 4.0 * q;   // 4.0 == warp amplitude
}`,
      },
      {
        kind: 'callout',
        tone: 'insight',
        title: 'The amplitude is the whole design space',
        text: 'At amplitude 0 you have plain noise. At ~1.5 you get gentle marbling. Past ~6 the domain folds over itself and you get sharp creases that look like fault lines or leaf venation. Almost every "style" people chase in shader art is just this one scalar.',
      },
      { kind: 'h2', text: 'Second-order: warping the warp' },
      {
        kind: 'p',
        text: 'The technique composes. Feed the output of the first warp into a second displacement field and the structures gain long-range coherence — large slow eddies carrying small fast detail, which is precisely how fluid turbulence is organised in the real world.',
      },
      {
        kind: 'code',
        lang: 'glsl',
        title: 'Second-order warp (the one worth shipping)',
        code: `float fbmWarp(vec2 p, float t) {
  vec2 q = vec2(fbm(p + vec2(0.0, 0.0)),
                fbm(p + vec2(5.2, 1.3)));

  vec2 r = vec2(fbm(p + 4.0 * q + vec2(1.7, 9.2) + 0.15 * t),
                fbm(p + 4.0 * q + vec2(8.3, 2.8) + 0.126 * t));

  return fbm(p + 4.0 * r);   // <- the money line
}`,
      },
      {
        kind: 'visualizer',
        id: 'domain-warp',
        caption: 'Live: drag to scrub warp amplitude. Left half is first-order, right half is second-order. Same noise seed, three extra instructions.',
      },
      { kind: 'h2', text: 'Cost accounting' },
      {
        kind: 'p',
        text: 'Each warp order multiplies your noise evaluations. A 4-octave fBm costs 4 noise calls; second-order warping that field costs 4 × (1 + 4 + 4) = 36. On a mobile GPU at 2× device pixel ratio, that is the difference between 60 fps and a slideshow.',
      },
      {
        kind: 'table',
        head: ['Technique', 'Noise evals / fragment', 'Safe tier', 'Visual gain'],
        rows: [
          ['Plain fBm (4 oct)', '4', '1 — mobile', 'Low'],
          ['First-order warp', '9', '2 — mid', 'High'],
          ['Second-order warp', '36', '3 — desktop only', 'Very high'],
          ['Second-order, 2-oct fBm', '12', '2 — mid', 'High (the sweet spot)'],
        ],
      },
      {
        kind: 'callout',
        tone: 'warn',
        title: 'Cut octaves, not warp orders',
        text: 'Dropping fBm from 4 octaves to 2 while keeping second-order warping costs 12 evaluations instead of 36 and preserves almost all of the structural character. The warp is what you are seeing — the octaves are just texture on top of it.',
      },
      { kind: 'h2', text: 'Emissive ridges' },
      {
        kind: 'p',
        text: 'The final trick for the Aetheria look: take the warped field and run it through a sharp power curve before feeding it to emission. Values near the fold boundaries collapse to near-zero, and the creases bloom. That is what makes the monolith look like it has energy running through cracks rather than paint on its surface.',
      },
      {
        kind: 'code',
        lang: 'glsl',
        title: 'Ridge extraction',
        code: `float field = fbmWarp(vUv * uFrequency, uTime);
// Fold to [0,1], sharpen, then bias toward the creases
float ridge = pow(1.0 - abs(field * 2.0 - 1.0), uSharpness);
vec3 emit = uAccent * ridge * uEmission;
gl_FragColor = vec4(base + emit, 1.0);`,
      },
      {
        kind: 'quote',
        text: 'You are not generating detail. You are bending the space the detail lives in, and letting the detail fall where it must.',
        cite: 'Inigo Quilez, paraphrased from the canonical domain-warping writeup',
      },
      { kind: 'h3', text: 'Further reading' },
      {
        kind: 'list',
        items: [
          'Warp amplitude is a design parameter — expose it on a slider before you bake it into a constant.',
          'Animate the *warp offsets*, not the base coordinate. Moving `p` reads as scrolling; moving `q` reads as flowing.',
          'Always gate second-order warping behind your Tier 3 check. It is a 4× fragment cost for a marginal gain on a 6-inch screen.',
          'Cache nothing. GPUs hate branching far more than they hate arithmetic.',
        ],
      },
    ],
  },
  {
    id: 'spatial-ux',
    slug: 'spatial-ux-principles',
    index: '02',
    title: 'Spatial UX: Designing for Depth Without Nausea',
    kicker: 'Spatial UX Principles',
    dek: 'Depth is the most powerful tool in a 3D interface and the fastest way to make someone close the tab. These are the seven rules we shipped Aetheria against.',
    readMins: 11,
    author: 'A. Lindqvist',
    role: 'Interaction Lead',
    date: '2026-07-02',
    tags: ['UX', 'WebXR', 'Motion', 'Accessibility'],
    difficulty: 'Intermediate',
    accent: '#7000FF',
    blocks: [
      { kind: 'h2', text: 'Rule 1 — Never translate the camera without the user asking' },
      {
        kind: 'p',
        text: 'Vestibular mismatch is the entire mechanism behind simulator sickness. Your eyes report acceleration; your inner ear reports nothing. Any camera motion that is not directly caused by a scroll wheel or a drag gesture is a lie the body will detect within about 90 seconds.',
      },
      {
        kind: 'p',
        text: 'Aetheria moves the camera along a spline tied to scroll position. It feels like flight, but it is honest: every millimetre of travel is caused by a physical input from the user. There is no idle drift, no auto-advance, no "cinematic" camera that takes over.',
      },
      {
        kind: 'callout',
        tone: 'info',
        title: 'The exception',
        text: 'Route transitions do move the camera autonomously — for 1.4 seconds, with a full-screen dissolve masking the motion. Short, masked, and immediately preceded by an explicit click. That is the budget; spend it once.',
      },
      {
        kind: 'visualizer',
        id: 'parallax-depth',
        caption: 'Live: three parallax layers at 0.3× / 1× / 2.4× scroll rate. Depth is communicated by differential motion, not by blur or scale.',
      },
      { kind: 'h2', text: 'Rule 2 — Depth comes from differential motion' },
      {
        kind: 'p',
        text: 'The cheapest depth cue in existence is parallax, and it is free: things further away move less. You do not need depth-of-field, you do not need atmospheric haze (although both help), and you certainly do not need stereoscopy.',
      },
      {
        kind: 'h2', text: 'Rule 3 — Anchor the periphery' },
      {
        kind: 'p',
        text: 'A static element at the edge of the visual field gives the brain something to hold onto. In headset work this cut reported discomfort by 71% in our study. On a flat screen the equivalent is a persistent HUD frame — Aetheria\'s corner brackets and nav rail never move, never fade, never animate during travel.',
      },
      { kind: 'h2', text: 'Rule 4 — Every animation needs an escape hatch' },
      {
        kind: 'list',
        items: [
          '`prefers-reduced-motion: reduce` must be honoured, not merely acknowledged.',
          'A visible MOTION toggle in the HUD, one click away, at all times.',
          'Reduced motion means *stopped*, not *slowed*. A 40% speed multiplier is still a trigger for many people.',
          'Persist the choice. Making someone re-disable motion on every visit is not an accessibility feature.',
        ],
      },
      { kind: 'h2', text: 'Rule 5 — Interaction affordances must survive contact with a trackpad' },
      {
        kind: 'p',
        text: 'A custom cursor is a beautiful idea and a support burden. Ours is a two-layer SVG — an inner dot that tracks instantly and an outer ring that lags with a critically damped spring. The lag is the entire effect: it makes the cursor feel like it has mass, and mass implies physics, and physics implies the interface is a place.',
      },
      {
        kind: 'code',
        lang: 'ts',
        title: 'Critically damped cursor follow',
        code: `// lambda ~= 22 gives ~60ms settle with no overshoot
const k = 1 - Math.exp(-22 * delta);
ring.x += (pointer.x - ring.x) * k;
ring.y += (pointer.y - ring.y) * k;`,
      },
      { kind: 'h2', text: 'Rule 6 — Never hide state behind an interaction' },
      {
        kind: 'p',
        text: 'If a quest can be completed by clicking a specific facet of a 3D mesh, that facet must be discoverable. Ours pulses 4% brighter than its neighbours and warms under the pointer. Subtle enough to feel found, obvious enough to actually be findable. An undiscoverable easter egg is just a bug with good intentions.',
      },
      { kind: 'h2', text: 'Rule 7 — Performance is an accessibility feature' },
      {
        kind: 'p',
        text: 'A dropped frame is not merely ugly. Below ~40 fps, motion becomes stuttery enough to induce discomfort in people who are fine at 60. Our tier system therefore treats post-processing as a luxury good: Tier 1 gets no bloom, no depth-of-field, no SSAO, and a quarter of the particle budget — and it still looks like the same site.',
      },
      {
        kind: 'table',
        head: ['Tier', 'Particles', 'Post-FX', 'Physics', 'Target'],
        rows: [
          ['3 — High desktop', '12,000+', 'Bloom + DoF + SSAO', 'Full Rapier', '60 fps @ 2× DPR'],
          ['2 — Mid / tablet', '3,200', 'Bloom only', 'Simplified', '60 fps @ 1.5× DPR'],
          ['1 — Mobile', '1,000', 'None', 'Kinematic only', '45 fps @ 1× DPR'],
        ],
      },
      {
        kind: 'quote',
        text: 'Nobody has ever left a website because it was too subtle. Plenty have left because it made them feel ill.',
        cite: 'Internal design review, Meridian Collective',
      },
    ],
  },
  {
    id: 'agentic-web',
    slug: 'agentic-web-architecture',
    index: '03',
    title: 'Agentic Web Architecture: When the Browser Hires an Employee',
    kicker: 'Agentic Systems',
    dek: 'The next decade of web apps will not be pages that respond to clicks. They will be systems that hold a goal, maintain state across sessions, and act on your behalf. Here is what that does to your architecture.',
    readMins: 16,
    author: 'Dr. S. Iyer',
    role: 'Systems Architect',
    date: '2026-09-21',
    tags: ['Agents', 'Architecture', 'State', 'Edge'],
    difficulty: 'Advanced',
    accent: '#9BFF3D',
    blocks: [
      { kind: 'h2', text: 'From request/response to goal/progress' },
      {
        kind: 'p',
        text: 'A conventional web app is a pure function of a URL. You navigate, the server renders, you act, the server mutates, repeat. Every unit of work is bounded by a single HTTP exchange and every piece of state is either in the URL, in a cookie, or in a row you just wrote.',
      },
      {
        kind: 'p',
        text: 'An agentic system breaks all three assumptions. It has a goal that outlives any request. It has working memory that must survive a tab close. And it takes actions whose side effects are neither idempotent nor instantly reversible. Your architecture has to grow three new organs: a durable task ledger, a permission boundary, and an audit trail.',
      },
      {
        kind: 'visualizer',
        id: 'agent-graph',
        caption: 'Live: an agent loop as a state graph. Plan → Act → Observe → Reflect, with the ledger as the only durable node. Click a node to inspect its failure mode.',
      },
      { kind: 'h2', text: 'The task ledger is the database now' },
      {
        kind: 'p',
        text: 'Stop modelling agent work as rows in a business table. Model it as an append-only ledger of events: `task.created`, `plan.proposed`, `tool.invoked`, `observation.recorded`, `step.reverted`. The current state of any task is a fold over its event history.',
      },
      {
        kind: 'code',
        lang: 'ts',
        title: 'Event-sourced task state',
        code: `type TaskEvent =
  | { type: 'task.created'; goal: string; at: number }
  | { type: 'plan.proposed'; steps: Step[]; at: number }
  | { type: 'tool.invoked'; tool: string; args: unknown; at: number }
  | { type: 'observation.recorded'; result: unknown; at: number }
  | { type: 'step.reverted'; reason: string; at: number };

const fold = (events: TaskEvent[]): TaskState =>
  events.reduce(applyEvent, emptyState);`,
      },
      {
        kind: 'callout',
        tone: 'insight',
        title: 'Why append-only wins',
        text: 'Agents make mistakes and then need to undo them. If you only ever stored current state, undo means guessing. If you stored events, undo means appending a compensating event and re-folding. The second one is auditable; the first one is a support ticket.',
      },
      { kind: 'h2', text: 'Permission boundaries belong in the runtime, not the prompt' },
      {
        kind: 'p',
        text: 'A system prompt that says "do not delete production data" is not a control. It is a suggestion to a stochastic process. The only real boundary is one enforced by the tool layer: the agent is literally not handed a credential that can reach production.',
      },
      {
        kind: 'list',
        items: [
          'Scope credentials per task, not per agent identity. Short-lived, narrowly-targeted, revoked on completion.',
          'Make destructive tools require a human confirmation step encoded in the tool schema itself.',
          'Rate-limit at the tool boundary. An agent in a loop is a DDoS you are paying for.',
          'Log every invocation with its arguments. Not a sample — every one.',
        ],
      },
      {
        kind: 'code',
        lang: 'ts',
        title: 'Capability-gated tool registry',
        code: `const tools = registry
  .filter(t => task.grants.includes(t.capability))
  .filter(t => !t.destructive || task.humanApproval)
  .map(t => withRateLimit(t, { rpm: 30, burst: 5 }));`,
      },
      { kind: 'h2', text: 'Latency budgets invert' },
      {
        kind: 'p',
        text: 'Web performance work has spent twenty years optimising for a sub-second budget. Agent work has the opposite problem: a single reasoning step may legitimately take eight seconds, and the UX challenge is not making it fast but making the wait legible.',
      },
      {
        kind: 'table',
        head: ['Concern', 'Classic web', 'Agentic web'],
        rows: [
          ['Latency target', '< 200 ms TTFB', '2–30 s per step, must be visible'],
          ['Failure model', 'Retry, idempotent', 'Compensate, non-idempotent'],
          ['State lifetime', 'Session', 'Days to weeks'],
          ['Progress signal', 'Spinner', 'Structured step-by-step stream'],
          ['Trust mechanism', 'Auth cookie', 'Capability scope + audit log'],
        ],
      },
      {
        kind: 'p',
        text: 'Stream the reasoning. Not because users want to read it — they mostly do not — but because a visible, structured progress signal converts an eight-second wait from "is it broken?" into "it is working on step three of six". That is the entire difference between an agent that feels like a tool and one that feels like a hang.',
      },
      { kind: 'h2', text: 'Client-side state, and where the line is' },
      {
        kind: 'p',
        text: 'Aetheria itself is a small-scale demonstration of one half of this argument. Its quest engine is entirely client-side: a persisted store, an event log of completions, and rewards that survive a reload without a server ever knowing. That works because the stakes are cosmetic.',
      },
      {
        kind: 'p',
        text: 'The moment a reward has economic value, the ledger has to move server-side. Client-persisted progression is a UX affordance; server-persisted progression is a system of record. Confusing the two is how you end up with a replayable quest reward.',
      },
      {
        kind: 'quote',
        text: 'An agent is not a smarter API client. It is a new kind of tenant in your infrastructure, and it needs the same things every tenant needs: a lease, a budget, and an eviction policy.',
        cite: 'Dr. S. Iyer, Agentic Web Architecture',
      },
    ],
  },
];

export const ARTICLE_MAP: Record<string, Article> = Object.fromEntries(ARTICLES.map((a) => [a.slug, a]));

/* ------------------------------------------------------------------ *
 * Quest 4 — Terminal Override
 * The corrupted block lives in article 01; the console beneath it
 * accepts the unlock incantation below.
 * ------------------------------------------------------------------ */
export const TERMINAL_PASSWORD = 'aetheria --unlock';

export const TERMINAL_BOOT_LINES = [
  'AETHERIA CITADEL SHELL v4.2.1',
  'mounting /dev/aether0 ............ ok',
  'glyph cache ...................... 2,048 entries',
  'WARNING: block 0x1F checksum mismatch',
  'WARNING: unsanctioned emit() in codex stream',
  'shell ready. awaiting operator input.',
];

export const TERMINAL_RESPONSES: Record<string, string> = {
  help: 'available: help, status, ls, cores, unlock <token>, clear',
  ls: 'articles/  artifacts/  telemetry.dat  ▓▓▓▓▓▓█ CORRUPTED',
  status: 'citadel: PARTIAL POWER · grid integrity 20% per recovered core',
  cores: 'querying grid… see HUD core counter for live tally',
  clear: '',
};

export const GLITCH_BLOCK = {
  title: 'codex/emit-stream.glsl — ⚠ CHECKSUM MISMATCH',
  lang: 'glsl',
  code: `// block 0x1F — recovered from the fractured grid
uniform float uTime;
varying vec2 vUv;

void main() {
  vec3 col = texture2D(uBuffer, vUv).rgb;
  col += uAccent * 0.02;
  emit();                       // ← undeclared. compiler silent.
  emit(); emit(); emit();       // ← who wrote this
  gl_FragColor = vec4(col, 1.); // ← do not ship this
}`,
  note: 'This block failed integrity validation on load. The Citadel shell below it is still live — it is waiting for an operator token.',
};
