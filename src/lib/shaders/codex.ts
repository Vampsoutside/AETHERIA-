import { HASH_GLSL } from './chunks';

/**
 * The Citadel of Knowledge — floating glyph field (spec §4, Page 4).
 *
 * Runes are generated entirely in the fragment shader from a per-instance
 * seed: a 3×5 cell matrix lit by a hash, so 400 glyphs cost one draw call via
 * InstancedMesh and zero texture memory.
 */

export const GLYPH_VERT = /* glsl */ `
attribute float aSeed;

uniform float uTime;
uniform float uDrift;

varying vec2 vUv;
varying float vSeed;
varying float vFade;

${HASH_GLSL}

void main() {
  vUv = uv;
  vSeed = aSeed;

  vec3 p = position;

  // Billboard: cancel the model rotation so glyphs always face the camera
  vec4 mvInstance = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mvInstance.xy += p.xy * (0.7 + hash11(aSeed * 7.3) * 0.7);

  float bob = sin(uTime * (0.35 + hash11(aSeed) * 0.5) + aSeed * 12.0) * uDrift;
  mvInstance.y += bob;
  mvInstance.x += cos(uTime * 0.22 + aSeed * 4.0) * uDrift * 0.5;

  // Flicker: some glyphs blink in and out of existence
  float blink = step(0.14, hash11(floor(uTime * 1.6) + aSeed * 31.0));
  vFade = mix(0.25, 1.0, blink);

  gl_Position = projectionMatrix * mvInstance;
}
`;

export const GLYPH_FRAG = /* glsl */ `
precision highp float;

uniform vec3 uAccent;
uniform vec3 uAccent2;
uniform float uOpacity;
uniform float uTime;

varying vec2 vUv;
varying float vSeed;
varying float vFade;

${HASH_GLSL}

void main() {
  // 3 x 5 rune matrix
  vec2 cell = floor(vec2(vUv.x * 3.0, vUv.y * 5.0));
  float cellId = cell.x + cell.y * 3.0;
  float lit = step(0.52, hash21(cell + vSeed * 13.7));

  // Inset the cells so glyphs read as segments, not a solid block
  vec2 f = fract(vec2(vUv.x * 3.0, vUv.y * 5.0));
  float inset = step(0.16, f.x) * step(f.x, 0.84) * step(0.14, f.y) * step(f.y, 0.86);

  // Outer frame
  vec2 b = abs(vUv - 0.5);
  float frame = step(0.46, max(b.x, b.y)) * step(max(b.x, b.y), 0.5);

  float mask = (lit * inset + frame * 0.45) * vFade;
  if (mask < 0.02) discard;

  vec3 col = mix(uAccent, uAccent2, hash11(vSeed * 3.1));
  // Scrolling brighten pass
  float sweep = smoothstep(0.0, 0.25, fract(vUv.y * 0.5 - uTime * 0.08 + vSeed));
  col *= 0.65 + sweep * 0.9;

  gl_FragColor = vec4(col, mask * uOpacity);
}
`;

/**
 * Volumetric-ish light shafts for the library stacks. A few additive, slowly
 * rotating quads fake god rays for a fraction of the cost of a real pass.
 */
export const SHAFT_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const SHAFT_FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec3 uAccent;
uniform float uOpacity;
varying vec2 vUv;

void main() {
  float horizontal = smoothstep(0.0, 0.35, vUv.x) * smoothstep(1.0, 0.65, vUv.x);
  float vertical = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.4, vUv.y);
  float flicker = 0.82 + 0.18 * sin(uTime * 0.9 + vUv.y * 6.0);
  float a = horizontal * vertical * uOpacity * flicker;
  if (a < 0.003) discard;
  gl_FragColor = vec4(uAccent * (0.5 + vertical), a);
}
`;
