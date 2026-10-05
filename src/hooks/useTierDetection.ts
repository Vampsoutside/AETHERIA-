'use client';

import { useEffect } from 'react';
import { detectTier } from '@/lib/gpu';
import { useGraphicsStore } from '@/lib/store/useGraphicsStore';
import { useUIStore } from '@/lib/store/useUIStore';

/**
 * Runs the GPU probe once after hydration and writes the result into the
 * graphics store. A manual override from the HUD settings panel always wins —
 * we only auto-assign while `tierSource === 'auto'`.
 */
export function useTierDetection(): void {
  useEffect(() => {
    const gfx = useGraphicsStore.getState();
    const profile = detectTier();
    gfx.setGpuInfo(profile.renderer === 'unknown' ? `${profile.vendor} · ${profile.cores} cores` : profile.renderer);

    if (gfx.tierSource === 'auto') {
      gfx.setTier(profile.tier, 'auto');
    }

    if (typeof window !== 'undefined') {
      (window as unknown as { __aetheriaProfile?: unknown }).__aetheriaProfile = profile;
    }

    // Reduced-motion preference overrides the motion flag regardless of GPU.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      gfx.setMotion(false);
    }
  }, []);
}

/** Surfaces live FPS in the HUD when the Explorer enables the readout. */
export function useFpsBridge(): void {
  useEffect(() => {
    if (!useUIStore.getState().mounted) return;
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const loop = () => {
      frames++;
      const now = performance.now();
      if (now - last >= 500) {
        useUIStore.getState().setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
}
