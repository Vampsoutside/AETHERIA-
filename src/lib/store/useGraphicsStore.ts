import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { TIER_BUDGETS, type Tier } from '@/lib/tokens';

/**
 * Graphics / performance store (spec §6).
 *
 * `tier` is auto-detected on first mount by `detectTier()`; the Explorer may
 * override it from the HUD settings panel and that override is persisted.
 */

export type TierSource = 'auto' | 'manual';

export interface GraphicsState {
  tier: Tier;
  tierSource: TierSource;
  /** Detector output, surfaced in the HUD for transparency */
  gpuRenderer: string;
  detectedAt: number | null;
  // Manual overrides (null = follow tier defaults)
  bloomOverride: boolean | null;
  dofOverride: boolean | null;
  ssaoOverride: boolean | null;
  particleScale: number;
  motion: boolean;
  showFps: boolean;
  hydrated: boolean;

  setTier: (tier: Tier, source?: TierSource) => void;
  setGpuInfo: (renderer: string) => void;
  setBloom: (v: boolean | null) => void;
  setDof: (v: boolean | null) => void;
  setSsao: (v: boolean | null) => void;
  setParticleScale: (v: number) => void;
  setMotion: (v: boolean) => void;
  setShowFps: (v: boolean) => void;
  setHydrated: (v: boolean) => void;
}

export const useGraphicsStore = create<GraphicsState>()(
  persist(
    (set) => ({
      tier: 2,
      tierSource: 'auto',
      gpuRenderer: 'unknown',
      detectedAt: null,
      bloomOverride: null,
      dofOverride: null,
      ssaoOverride: null,
      particleScale: 1,
      motion: true,
      showFps: false,
      hydrated: false,

      setTier: (tier, source = 'manual') => set({ tier, tierSource: source }),
      setGpuInfo: (renderer) => set({ gpuRenderer: renderer, detectedAt: Date.now() }),
      setBloom: (v) => set({ bloomOverride: v }),
      setDof: (v) => set({ dofOverride: v }),
      setSsao: (v) => set({ ssaoOverride: v }),
      setParticleScale: (v) => set({ particleScale: Math.max(0.15, Math.min(1.6, v)) }),
      setMotion: (v) => set({ motion: v }),
      setShowFps: (v) => set({ showFps: v }),
      setHydrated: (v) => set({ hydrated: v }),
    }),
    {
      name: 'aetheria.graphics.v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        tier: s.tier,
        tierSource: s.tierSource,
        bloomOverride: s.bloomOverride,
        dofOverride: s.dofOverride,
        ssaoOverride: s.ssaoOverride,
        particleScale: s.particleScale,
        motion: s.motion,
        showFps: s.showFps,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);

/** Resolved feature flags for the current tier + overrides. */
export interface ResolvedQuality {
  tier: Tier;
  stars: number;
  dust: number;
  motes: number;
  bloom: boolean;
  dof: boolean;
  ssao: boolean;
  chromaticAberration: number;
  shadows: boolean;
  dpr: [number, number];
  /** Tier 1 replaces 3D mouse-tracking with touch swipe sheets (spec §6). */
  pointerParallax: boolean;
  physics: boolean;
}

export const selectQuality = (s: GraphicsState): ResolvedQuality => {
  const budget = TIER_BUDGETS[s.tier];
  const scale = s.particleScale;
  return {
    tier: s.tier,
    stars: Math.round(budget.stars * scale),
    dust: Math.round(budget.dust * scale),
    motes: Math.round(budget.motes * scale),
    bloom: s.bloomOverride ?? budget.bloom,
    dof: s.dofOverride ?? budget.dof,
    ssao: s.ssaoOverride ?? budget.ssao,
    chromaticAberration: budget.ca,
    shadows: budget.shadows && s.motion,
    dpr: budget.dpr,
    pointerParallax: s.tier >= 2 && s.motion,
    physics: s.tier >= 2,
  };
};
