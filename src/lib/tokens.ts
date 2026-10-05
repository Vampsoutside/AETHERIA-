/**
 * AETHERIA — Design tokens (single source of truth for TS + GLSL).
 *
 * The CSS custom properties in globals.css drive the DOM; these constants
 * drive the WebGL layer so the two never drift out of sync.
 */

export type PaletteId = 'aether' | 'cyberpunk';

export interface Palette {
  id: PaletteId;
  label: string;
  /** Linear-space hex strings ready for THREE.Color */
  accent: string;
  accent2: string;
  background: string;
  fog: string;
  emissive: string;
  /** Raw RGB triplets for shader uniforms */
  accentVec: [number, number, number];
  accent2Vec: [number, number, number];
}

export const PALETTES: Record<PaletteId, Palette> = {
  aether: {
    id: 'aether',
    label: 'Aether Standard',
    accent: '#00F0FF',
    accent2: '#7000FF',
    background: '#050508',
    fog: '#0a0616',
    emissive: '#00F0FF',
    accentVec: [0.0, 0.941, 1.0],
    accent2Vec: [0.439, 0.0, 1.0],
  },
  /* Quest 1 reward — unlocked by finding the hidden frequency on the monolith */
  cyberpunk: {
    id: 'cyberpunk',
    label: 'Cyberpunk Neon',
    accent: '#FF2B82',
    accent2: '#FFC828',
    background: '#09030c',
    fog: '#1a0518',
    emissive: '#FF2B82',
    accentVec: [1.0, 0.169, 0.51],
    accent2Vec: [1.0, 0.784, 0.157],
  },
};

export const DEFAULT_PALETTE: PaletteId = 'aether';

export const palette = (id: PaletteId): Palette => PALETTES[id] ?? PALETTES.aether;

/** Typography scale used by HUD components that need inline sizing. */
export const TYPE = {
  displayTight: 'font-display font-extrabold tracking-tighter',
  hudLabel: 'font-mono text-hud uppercase',
} as const;

/** World-space layout of the archipelago. Each region is a persistent 3D scene. */
export const REGIONS = {
  '/': { id: 'gate', label: 'Gate of Origin', origin: [0, 0, 0] as const },
  '/playground': { id: 'crucible', label: 'The Crucible', origin: [86, 6, -22] as const },
  '/vault': { id: 'vault', label: 'Archive of Artifacts', origin: [-84, -4, -30] as const },
  '/codex': { id: 'citadel', label: 'Citadel of Knowledge', origin: [4, 34, -132] as const },
} as const;

export type RouteId = keyof typeof REGIONS;

export const ROUTES: { path: RouteId; index: string; name: string; subtitle: string }[] = [
  { path: '/', index: '01', name: 'Gate of Origin', subtitle: 'Arrival · Awaken the core' },
  { path: '/playground', index: '02', name: 'The Crucible', subtitle: 'Test · Manipulate · Break' },
  { path: '/vault', index: '03', name: 'Archive of Artifacts', subtitle: 'Inspect · Recover · Preserve' },
  { path: '/codex', index: '04', name: 'Citadel of Knowledge', subtitle: 'Decode · Learn · Transmit' },
];

/** Particle budgets per graphics tier (spec §6). */
export const TIER_BUDGETS = {
  3: { stars: 12000, dust: 2600, motes: 900, bloom: true, dof: true, ssao: true, ca: 0.0055, shadows: true, dpr: [1, 2] as [number, number] },
  2: { stars: 3200, dust: 900, motes: 320, bloom: true, dof: false, ssao: false, ca: 0.0032, shadows: true, dpr: [1, 1.5] as [number, number] },
  1: { stars: 1000, dust: 260, motes: 90, bloom: false, dof: false, ssao: false, ca: 0, shadows: false, dpr: [1, 1] as [number, number] },
} as const;

export type Tier = keyof typeof TIER_BUDGETS;
