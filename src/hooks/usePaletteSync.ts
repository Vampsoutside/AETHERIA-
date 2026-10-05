'use client';

import { useEffect } from 'react';
import { useQuestStore } from '@/lib/store/useQuestStore';

/**
 * Mirrors the persisted palette choice onto <html data-palette>, which drives
 * every CSS custom property in globals.css. The WebGL layer reads the same
 * store, so DOM and 3D reskin in the same frame — that's what makes the
 * Cyberpunk Neon reward feel like a realm-wide event rather than a theme swap.
 */
export function usePaletteSync(): void {
  const palette = useQuestStore((s) => s.activePalette);
  const hydrated = useQuestStore((s) => s.hydrated);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.palette = palette;
    // Theme colour for mobile browser chrome
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = palette === 'cyberpunk' ? '#09030c' : '#050508';
  }, [palette, hydrated]);
}
