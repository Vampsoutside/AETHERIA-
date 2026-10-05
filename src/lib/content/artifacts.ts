/**
 * The Archive of Artifacts — showcase dataset for /vault.
 * `geometry` selects which procedural/GLB asset the 3D carousel instantiates.
 */

export type ArtifactGeometry = 'helmet' | 'core' | 'crystal' | 'monolith' | 'torus' | 'lattice' | 'spire';

export interface ArtifactSpec {
  label: string;
  value: string;
}

export interface Artifact {
  id: string;
  codename: string;
  name: string;
  category: string;
  year: number;
  studio: string;
  summary: string;
  story: string[];
  specs: ArtifactSpec[];
  stack: string[];
  metrics: { label: string; value: string }[];
  accent: string;
  accent2: string;
  geometry: ArtifactGeometry;
  modelUrl?: string;
  demoUrl?: string;
  /** Unlocked by Q-03 "Artifact Inspector" */
  commentary: { speaker: string; role: string; transcript: string };
  seal: string;
}

export const ARTIFACTS: Artifact[] = [
  {
    id: 'neuro-lattice',
    codename: 'ART-001',
    name: 'Neuro-Lattice',
    category: 'Generative AI',
    year: 2026,
    studio: 'Aetheria Labs',
    summary:
      'A latent diffusion pipeline compressed to 41 MB that runs entirely inside a browser tab — no server round-trip, no upload, no telemetry.',
    story: [
      'The brief was deliberately hostile: take a model that normally wants 6 GB of VRAM and a datacentre connection, and make it run on a four-year-old laptop with the tab in the background.',
      'We quantised the U-Net to int8, folded the text encoder into a WebGPU compute graph, and replaced the scheduler with a distilled 4-step variant. The result renders a 1024² frame in 380 ms on an M2 Air.',
      'The interesting failure was not speed — it was memory. Browsers kill tabs that exceed ~2 GB, so the lattice streams its own weights from IndexedDB in 4 MB tiles and evicts them behind the sampler.',
    ],
    specs: [
      { label: 'Runtime', value: 'WebGPU / WASM-SIMD fallback' },
      { label: 'Payload', value: '41.2 MB (int8 quantised)' },
      { label: 'Latency', value: '380 ms @ 1024² (M2 Air)' },
      { label: 'Steps', value: '4 (distilled LCM scheduler)' },
      { label: 'VRAM peak', value: '1.4 GB' },
    ],
    stack: ['WebGPU', 'TypeScript', 'ONNX Runtime Web', 'WASM-SIMD', 'IndexedDB', 'Rust'],
    metrics: [
      { label: 'Frames rendered', value: '2.4M' },
      { label: 'p95 latency', value: '412 ms' },
      { label: 'Cold start', value: '1.9 s' },
    ],
    accent: '#00F0FF',
    accent2: '#7000FF',
    geometry: 'lattice',
    demoUrl: '/demos/shader-lab.html?preset=lattice&hue=186',
    commentary: {
      speaker: 'R. Okonkwo',
      role: 'Lead Engineer, Neuro-Lattice',
      transcript:
        'Everyone assumed the hard part would be the maths. It was not. The hard part was accepting that a browser tab is a hostile operating environment — you get evicted, throttled, and backgrounded without warning. Once we designed for eviction instead of against it, everything else fell into place.',
    },
    seal: 'SEALED · ROTATE 360° TO BREAK',
  },
  {
    id: 'helix-forge',
    codename: 'ART-002',
    name: 'Helix Forge',
    category: 'Procedural 3D',
    year: 2025,
    studio: 'Foundry Nine',
    summary:
      'A compiler that turns 60 lines of declarative grammar into 40,000 unique, watertight low-poly assets — every one of them generated at build time, none of them hand-modelled.',
    story: [
      'Helix Forge exists because a team of three cannot author an archipelago by hand. The grammar describes intent — "rocky island, heavy base, crystal veins near the crown" — and the compiler resolves it into triangle soup.',
      'Watertightness is the whole game. A single non-manifold edge breaks collision, breaks lightmap baking, and breaks the physics solver. We validate every output against a half-edge graph before it is allowed to leave the pipeline.',
      'The recovered scan below is the one asset in the Archive that was *not* forged: it came out of a photogrammetry rig in 2024 and is kept here as a control sample, to prove the procedural output is indistinguishable at a glance.',
    ],
    specs: [
      { label: 'Grammar', value: 'Declarative DSL, 60 LOC per asset family' },
      { label: 'Output', value: 'glTF 2.0 binary, faceted flat-shaded' },
      { label: 'Throughput', value: '40,000 assets / 9 min (16-core)' },
      { label: 'Validation', value: 'Half-edge manifold check, 100% pass gate' },
      { label: 'Avg. payload', value: '38 KB per asset' },
    ],
    stack: ['Rust', 'glTF 2.0', 'TypeScript', 'Nakama', 'Blender headless'],
    metrics: [
      { label: 'Assets forged', value: '40,208' },
      { label: 'Non-manifold', value: '0' },
      { label: 'Build time', value: '9m 12s' },
    ],
    accent: '#9BFF3D',
    accent2: '#00F0FF',
    geometry: 'helmet',
    modelUrl: '/models/damaged-helmet.glb',
    demoUrl: '/demos/shader-lab.html?preset=forge&hue=96',
    commentary: {
      speaker: 'M. Vasquez',
      role: 'Technical Artist, Foundry Nine',
      transcript:
        'People hear "procedural" and think "random". Random is easy and it looks like noise. Procedural is the opposite — it is constraint all the way down. Every degree of freedom you give the generator is a degree of freedom you have to police afterwards.',
    },
    seal: 'SEALED · ROTATE 360° TO BREAK',
  },
  {
    id: 'spatial-drift',
    codename: 'ART-003',
    name: 'Spatial Drift',
    category: 'WebXR / Spatial UX',
    year: 2026,
    studio: 'Meridian Collective',
    summary:
      'A locomotion system for WebXR that eliminated simulator sickness across a 40-minute session — by refusing to move the camera at all.',
    story: [
      'Every nausea-inducing VR experience shares one sin: the eyes report motion the vestibular system does not feel. Spatial Drift solves this by never translating the camera. Instead, the world translates around a stationary viewer.',
      'Destination selection is gaze-and-dwell with a 620 ms commit window, tuned against a 24-participant study. Below 400 ms users triggered accidental travel; above 900 ms the interface felt broken.',
      'The counter-intuitive win: adding a static "cockpit" frame — a thin ring at the periphery of vision — cut reported discomfort by 71% even when nothing else changed.',
    ],
    specs: [
      { label: 'Locomotion', value: 'World-moves-not-viewer, 0 camera translation' },
      { label: 'Commit window', value: '620 ms gaze-and-dwell' },
      { label: 'Frame budget', value: '11.1 ms (90 Hz target)' },
      { label: 'Study cohort', value: '24 participants, 3 sessions each' },
      { label: 'Discomfort delta', value: '−71% with peripheral anchor ring' },
    ],
    stack: ['WebXR', 'React Three Fiber', 'Three.js', 'GLSL', 'Zustand'],
    metrics: [
      { label: 'Sessions', value: '1,180' },
      { label: 'Avg. length', value: '41 min' },
      { label: 'Early exits', value: '0.8%' },
    ],
    accent: '#FF2B82',
    accent2: '#7000FF',
    geometry: 'torus',
    demoUrl: '/demos/shader-lab.html?preset=drift&hue=320',
    commentary: {
      speaker: 'A. Lindqvist',
      role: 'Interaction Lead, Meridian',
      transcript:
        'We spent six weeks building a beautiful teleport arc. Then we deleted it. The moment we stopped asking "how do we move the player" and started asking "how do we move everything else", the problem dissolved.',
    },
    seal: 'SEALED · ROTATE 360° TO BREAK',
  },
  {
    id: 'chrono-mesh',
    codename: 'ART-004',
    name: 'Chrono-Mesh',
    category: 'Data Sculpture',
    year: 2025,
    studio: 'Aetheria Labs',
    summary:
      'Eleven years of global seismic data rendered as a single navigable 4D surface — time is the fourth axis, and you scrub it with your hand.',
    story: [
      'Chrono-Mesh began as a failure. Our first attempt plotted 1.2 million events as points, and the result was an unreadable grey smudge that told you nothing.',
      'The breakthrough was aggregation: bin events into a 96×96 spatial grid and 400 temporal slices, then render the density field as a displacement map. The data became terrain, and terrain is something human vision is exceptionally good at reading.',
      'Scrubbing time morphs the terrain in place rather than re-rendering, so the viewer keeps spatial memory. Losing that memory — watching a cloud of dots re-randomise every frame — is what killed the first version.',
    ],
    specs: [
      { label: 'Dataset', value: '1.24M seismic events, 2014–2025' },
      { label: 'Field', value: '96×96 spatial × 400 temporal bins' },
      { label: 'Render', value: 'GPU displacement, single draw call' },
      { label: 'Scrub rate', value: '60 fps at 4K' },
      { label: 'Payload', value: '8.7 MB (quantised delta-compressed)' },
    ],
    stack: ['Three.js', 'GLSL', 'WebWorkers', 'Apache Arrow', 'DuckDB-WASM'],
    metrics: [
      { label: 'Points', value: '1.24M' },
      { label: 'Draw calls', value: '1' },
      { label: 'Frame', value: '4.2 ms' },
    ],
    accent: '#FFC46B',
    accent2: '#FF3D6E',
    geometry: 'crystal',
    demoUrl: '/demos/shader-lab.html?preset=chrono&hue=38',
    commentary: {
      speaker: 'Dr. S. Iyer',
      role: 'Data Visualisation Lead',
      transcript:
        'The first version was technically flawless and completely useless. That is the trap of large-scale visualisation — you optimise for rendering a million points and forget that the reader cannot hold a million points in their head. Aggregate until it becomes landscape.',
    },
    seal: 'SEALED · ROTATE 360° TO BREAK',
  },
  {
    id: 'aether-synth',
    codename: 'ART-005',
    name: 'Aether Synth',
    category: 'Spatial Audio',
    year: 2026,
    studio: 'Meridian Collective',
    summary:
      'A browser poly-synth with HRTF spatialisation and an algorithmic plate reverb generated at runtime — zero audio files, zero impulse responses shipped.',
    story: [
      'Shipping convolution reverb normally means shipping an impulse response: a WAV of a real room, hundreds of kilobytes, licensed or recorded. Aether Synth generates its IR procedurally from decaying shaped noise at boot.',
      'The tail is not a recording of anything, yet it is perceptually indistinguishable from a 3.4-second plate — because reverberation is, at root, exponentially decaying noise with a spectral tilt. Give the ear that and it supplies the room.',
      'Spatialisation uses HRTF panners positioned in the same world-space coordinates as the 3D meshes, so a synthesiser node genuinely sounds like it is behind your left shoulder when it is.',
    ],
    specs: [
      { label: 'Voices', value: '18-voice polyphony ceiling' },
      { label: 'Reverb', value: 'Procedural 3.4 s plate, generated at runtime' },
      { label: 'Spatialisation', value: 'HRTF PannerNode, inverse distance model' },
      { label: 'Context', value: 'Single shared AudioContext (iOS-safe)' },
      { label: 'Audio payload', value: '0 bytes of IR' },
    ],
    stack: ['WebAudio', 'Howler.js', 'TypeScript', 'WebGL sync'],
    metrics: [
      { label: 'Voices peak', value: '18' },
      { label: 'CPU', value: '3.1%' },
      { label: 'Latency', value: '11 ms' },
    ],
    accent: '#7000FF',
    accent2: '#00F0FF',
    geometry: 'core',
    demoUrl: '/demos/shader-lab.html?preset=synth&hue=268',
    commentary: {
      speaker: 'K. Adeyemi',
      role: 'Audio Engineer, Meridian',
      transcript:
        'A convolution reverb is just a fingerprint of a room. Once you realise that, you stop asking "which room should I record" and start asking "what does the ear need to believe a room exists". The answer is embarrassingly little.',
    },
    seal: 'SEALED · ROTATE 360° TO BREAK',
  },
  {
    id: 'quantum-type',
    codename: 'ART-006',
    name: 'Quantum Type',
    category: 'Interactive Design',
    year: 2025,
    studio: 'Foundry Nine',
    summary:
      'A variable-font engine where weight, width and optical size are driven by a spring simulation — typography that has mass, momentum and a resting state.',
    story: [
      'Variable fonts expose continuous axes, but almost everyone drives them with a scroll position or a hover state. That is animation, not physics. Quantum Type attaches a spring to each axis instead.',
      'Each glyph run has mass, stiffness and damping. Hovering applies an impulse. The axes overshoot, oscillate, and settle — and because the simulation is frame-rate independent, it behaves identically at 30 fps and 144 fps.',
      'The failure mode we designed around was legibility: an oscillating font can become unreadable mid-settle. We clamp optical size to a floor of 14 px equivalent and damp the width axis 2.4× harder than weight.',
    ],
    specs: [
      { label: 'Axes', value: 'wght, wdth, opsz, ital (4-axis)' },
      { label: 'Solver', value: 'Semi-implicit Euler, fixed 120 Hz substep' },
      { label: 'Impulse model', value: 'Critically damped per-axis springs' },
      { label: 'Legibility floor', value: 'opsz ≥ 14 px equivalent' },
      { label: 'Overhead', value: '0.4 ms / frame @ 200 glyphs' },
    ],
    stack: ['Variable Fonts', 'TypeScript', 'Canvas 2D', 'Spring physics'],
    metrics: [
      { label: 'Glyphs', value: '742' },
      { label: 'Frame cost', value: '0.4 ms' },
      { label: 'Axes driven', value: '4' },
    ],
    accent: '#FF3D6E',
    accent2: '#FFC46B',
    geometry: 'monolith',
    demoUrl: '/demos/shader-lab.html?preset=type&hue=348',
    commentary: {
      speaker: 'J. Moreau',
      role: 'Type Director, Foundry Nine',
      transcript:
        'A font with physics feels alive for exactly the same reason a door with a hydraulic closer feels expensive: the motion carries information about mass. Static easing is a lie about weight. Springs are honest.',
    },
    seal: 'SEALED · ROTATE 360° TO BREAK',
  },
];

export const ARTIFACT_MAP: Record<string, Artifact> = Object.fromEntries(ARTIFACTS.map((a) => [a.id, a]));

/** Carousel ordering — the ring is laid out in this sequence. */
export const ARTIFACT_IDS = ARTIFACTS.map((a) => a.id);
