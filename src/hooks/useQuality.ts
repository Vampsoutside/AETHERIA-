'use client';

/**
 * Zustand v5 has no default shallow-equality, so subscribing to
 * `selectQuality` (which returns a fresh object on every call) would hand
 * `useSyncExternalStore` a new snapshot each render and loop forever
 * ("getSnapshot should be cached" / "Maximum update depth exceeded").
 *
 * `useShallow` compares the fields one level deep and keeps identity stable.
 * Every region's WebGL scene reuses this bridge instead of subscribing raw.
 */
import { useShallow } from 'zustand/react/shallow';
import { selectQuality, useGraphicsStore } from '@/lib/store/useGraphicsStore';
import type { ResolvedQuality } from '@/lib/store/useGraphicsStore';

export function useQuality(): ResolvedQuality {
  return useGraphicsStore(useShallow(selectQuality));
}