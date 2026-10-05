import type { Tier } from '@/lib/tokens';

/**
 * GPU / device capability detection (spec §6 — "Implement a GPU detection hook").
 *
 * Deliberately dependency-free and non-suspending: drei's `useDetectGPU`
 * suspends on an async `detect-gpu` call, which forces every 3D subtree into a
 * Suspense boundary and causes a visible tier flip after first paint. This
 * reads the same signals synchronously from a throwaway WebGL context, so the
 * correct tier is known *before* the Canvas mounts and particle counts never
 * have to be rebuilt mid-session.
 */

export interface DeviceProfile {
  tier: Tier;
  renderer: string;
  vendor: string;
  isMobile: boolean;
  cores: number;
  memoryGB: number;
  maxTextureSize: number;
  /** Normalised 0..1 confidence in the tier assignment. */
  score: number;
}

const BLOCKLIST = /swiftshader|llvmpipe|software|basic render|microsoft basic|virtualbox|vmware|angle \(google/i;
const LOW_GPU = /intel.*(hd|uhd)\s?(4[0-5]|5[0-2]|6[0-2])\d?|mali-[tg][0-6]|adreno\s?[3-5]\d\d|powervr|apple gpu/i;
const HIGH_GPU = /rtx\s?(30|40|50)\d\d|rx\s?(6[6-9]|7\d)\d\d|apple m[1-9]|geforce (gtx )?(16|20|30)\d\d|arc a7\d\d/i;

function readRenderer(): { renderer: string; vendor: string; maxTextureSize: number } {
  const fallback = { renderer: 'unknown', vendor: 'unknown', maxTextureSize: 0 };
  if (typeof document === 'undefined') return fallback;
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return fallback;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
    const vendor = dbg ? String(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)) : String(gl.getParameter(gl.VENDOR));
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    // Release the probe context immediately — we only needed its parameters.
    const lose = gl.getExtension('WEBGL_lose_context');
    lose?.loseContext();
    return { renderer, vendor, maxTextureSize };
  } catch {
    return fallback;
  }
}

export function detectTier(): DeviceProfile {
  if (typeof navigator === 'undefined') {
    return { tier: 1, renderer: 'ssr', vendor: 'ssr', isMobile: false, cores: 2, memoryGB: 2, maxTextureSize: 0, score: 0 };
  }

  const { renderer, vendor, maxTextureSize } = readRenderer();
  const ua = navigator.userAgent;
  const isMobile =
    /android|iphone|ipad|ipod|mobile|silk/i.test(ua) ||
    (navigator.maxTouchPoints > 1 && /macintosh/i.test(ua)); // iPadOS masquerades as macOS

  const cores = navigator.hardwareConcurrency ?? 4;
  const memoryGB = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4;

  let score = 0;
  if (BLOCKLIST.test(renderer)) score -= 6;
  if (LOW_GPU.test(renderer)) score -= 2;
  if (HIGH_GPU.test(renderer)) score += 3;
  if (isMobile) score -= 3;
  if (cores >= 8) score += 1.5;
  else if (cores >= 4) score += 0.5;
  else score -= 1;
  if (memoryGB >= 8) score += 1;
  else if (memoryGB <= 2) score -= 1.5;
  if (maxTextureSize >= 16384) score += 0.5;
  else if (maxTextureSize > 0 && maxTextureSize < 8192) score -= 1;
  // Small viewports rarely benefit from full post-processing.
  if (typeof window !== 'undefined' && window.innerWidth < 820) score -= 1;

  const tier: Tier = score >= 1.5 ? 3 : score >= -1.5 ? 2 : 1;

  return { tier, renderer, vendor, isMobile, cores, memoryGB, maxTextureSize, score: Math.max(0, Math.min(1, (score + 6) / 12)) };
}
