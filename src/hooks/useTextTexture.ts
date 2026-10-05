import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';

/**
 * Canvas-rendered text → THREE.CanvasTexture.
 *
 * drei's <Text> pulls a default font from a CDN at runtime, which fails
 * offline and causes a visible re-layout inside the Canvas. Rendering glyphs
 * to a 2D canvas instead means zero network, zero extra dependencies, exact
 * control over tracking/weight, and crisp SDF-free results at HUD sizes.
 */

export interface TextTextureOptions {
  text: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number | string;
  color?: string;
  letterSpacing?: number;
  padding?: number;
  glow?: string;
  glowBlur?: number;
  align?: CanvasTextAlign;
  /** Multiply canvas resolution for sharper text on high-DPR displays */
  scale?: number;
}

export function makeTextTexture(opts: TextTextureOptions): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const {
    text,
    fontSize = 64,
    fontFamily = '"JetBrains Mono", ui-monospace, monospace',
    fontWeight = 600,
    color = '#ffffff',
    letterSpacing = 0,
    padding = 16,
    glow,
    glowBlur = 0,
    align = 'center',
    scale = 2,
  } = opts;

  const font = `${fontWeight} ${fontSize * scale}px ${fontFamily}`;
  const measure = document.createElement('canvas').getContext('2d');
  if (!measure) return null;
  measure.font = font;

  // Manual per-character advance: ctx.letterSpacing is not universal.
  const chars = Array.from(text);
  let textWidth = 0;
  for (const ch of chars) textWidth += measure.measureText(ch).width + letterSpacing * scale;
  textWidth -= letterSpacing * scale;

  const width = Math.max(4, Math.ceil(textWidth + padding * 2 * scale));
  const height = Math.ceil(fontSize * scale * 1.45 + padding * 2 * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, width, height);
  ctx.font = font;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = glowBlur * scale;
  }
  ctx.fillStyle = color;

  const startX = align === 'center' ? (width - textWidth) / 2 : align === 'right' ? width - textWidth - padding * scale : padding * scale;
  let x = startX;
  const y = height / 2;
  for (const ch of chars) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + letterSpacing * scale;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  // Aspect is returned on the texture so callers can size their plane correctly.
  (texture as THREE.CanvasTexture & { aspect?: number }).aspect = width / height;
  return texture;
}

/** Hook wrapper with automatic disposal. Returns [texture, aspect]. */
export function useTextTexture(opts: TextTextureOptions): [THREE.CanvasTexture | null, number] {
  const key = JSON.stringify(opts);
  const [state, setState] = useState<{ tex: THREE.CanvasTexture | null; aspect: number }>({ tex: null, aspect: 1 });

  useEffect(() => {
    const tex = makeTextTexture(JSON.parse(key) as TextTextureOptions);
    const aspect = tex ? ((tex as THREE.CanvasTexture & { aspect?: number }).aspect ?? 1) : 1;
    setState((prev) => {
      prev.tex?.dispose();
      return { tex, aspect };
    });
    return () => {
      tex?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return useMemo(() => [state.tex, state.aspect] as const, [state]);
}
