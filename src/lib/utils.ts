import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind-aware class combiner (shadcn/ui convention). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Frame-rate independent damping factor. */
export const dampFactor = (lambda: number, delta: number) => 1 - Math.exp(-lambda * delta);

export const round = (v: number, dp = 2) => Math.round(v * 10 ** dp) / 10 ** dp;

export const pad = (v: number, len = 3) => String(v).padStart(len, '0');

/** Deterministic pseudo-random in [0,1) from an integer seed. */
export function seededRandom(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

export const formatCompact = (n: number) =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** True when the code is executing in a browser with WebGL-capable hardware. */
export const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';

export const prefersReducedMotion = () =>
  isBrowser() && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const isTouchDevice = () =>
  isBrowser() && (window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window);
