import { HASH_GLSL } from './chunks';

/**
 * GPU particle system (starfield / dust / motes / celebration bursts).
 *
 * All motion lives in the vertex shader — the CPU uploads the buffer once and
 * never touches it again, which is what lets Tier 3 push 12,000+ points while
 * Tier 1 runs the same code with a smaller count.
 */

export const PARTICLE_VERT = /* glsl */ `
attribute float aScale;
attribute float aSeed;
attribute float aColorMix;

uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
uniform float uDrift;
uniform float uTurbulence;
uniform float uCollapse;   // 0 = ambient, 1 = pulled to uAttract (bursts)
uniform vec3 uAttract;

varying float vAlpha;
varying float vColorMix;
varying float vSeed;

${HASH_GLSL}

void main() {
  vec3 p = position;
  float s = aSeed;

  // Per-particle orbital drift; hash-derived so no two share a phase.
  float t = uTime * (0.06 + hash11(s * 3.7) * 0.16);
  p.x += sin(t + s * 6.28) * uDrift * (0.4 + hash11(s * 11.0));
  p.y += cos(t * 0.83 + s * 4.11) * uDrift * 0.7;
  p.z += sin(t * 1.17 + s * 2.77) * uDrift * (0.4 + hash11(s * 5.3));

  // Curl-ish turbulence for the dust layers
  if (uTurbulence > 0.001) {
    float n1 = sin(p.y * 0.35 + uTime * 0.22 + s);
    float n2 = cos(p.x * 0.29 - uTime * 0.18 + s * 2.0);
    p.x += n1 * uTurbulence;
    p.y += n2 * uTurbulence * 0.6;
    p.z += (n1 * n2) * uTurbulence;
  }

  // Burst mode: lerp toward the attractor and fade out
  p = mix(p, uAttract, uCollapse);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float dist = max(-mv.z, 0.001);

  // Twinkle
  float tw = 0.55 + 0.45 * sin(uTime * (1.4 + hash11(s * 19.0) * 3.4) + s * 22.0);

  vAlpha = tw * (1.0 - uCollapse) * smoothstep(320.0, 40.0, dist);
  vColorMix = aColorMix;
  vSeed = s;

  gl_PointSize = aScale * uSize * uPixelRatio * (58.0 / dist);
  gl_PointSize = clamp(gl_PointSize, 0.6, 46.0);
  gl_Position = projectionMatrix * mv;
}
`;

export const PARTICLE_FRAG = /* glsl */ `
precision highp float;

uniform vec3 uAccent;
uniform vec3 uAccent2;
uniform vec3 uCore;
uniform float uOpacity;
uniform float uSoftness;

varying float vAlpha;
varying float vColorMix;
varying float vSeed;

void main() {
  // Soft round sprite with an optional hot centre — no texture fetch needed.
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;

  float core = smoothstep(0.5, 0.0, d);
  float glow = pow(core, mix(1.4, 3.6, uSoftness));
  float halo = smoothstep(0.5, 0.14, d) * 0.35;

  vec3 tint = mix(uAccent, uAccent2, vColorMix);
  tint = mix(tint, uCore, smoothstep(0.72, 1.0, core) * 0.85);

  float a = (glow + halo) * vAlpha * uOpacity;
  if (a < 0.004) discard;

  gl_FragColor = vec4(tint * (0.6 + glow * 1.5), a);
}
`;

/**
 * Route-transition dissolve (spec §3 — "Particle explosion transition between
 * route changes using a custom fragment shader dissolve effect").
 * Rendered on a screen-space quad in front of the camera.
 */
export const DISSOLVE_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const DISSOLVE_FRAG = /* glsl */ `
precision highp float;

uniform float uProgress;   // 0 -> 1 across the transition
uniform float uSeed;
uniform vec3 uAccent;
uniform vec3 uAccent2;
uniform vec3 uBackground;
uniform float uAspect;
varying vec2 vUv;

${HASH_GLSL}

float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
             mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * vnoise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = vUv;
  vec2 p = vec2((uv.x - 0.5) * uAspect, uv.y - 0.5);

  // Radial shockwave expanding from the centre of the frame
  float d = length(p);
  float wave = smoothstep(0.0, 1.0, uProgress * 1.9 - d * 1.15);

  // Noise-thresholded dissolve — the classic "burn-away" mask
  float n = fbm(uv * 5.5 + uSeed);
  float mask = smoothstep(wave - 0.22, wave + 0.22, n);
  float coverage = 1.0 - mask;

  if (coverage < 0.004) discard;

  // Glowing leading edge where the dissolve is actively happening
  float edge = smoothstep(0.0, 0.16, coverage) * smoothstep(0.42, 0.16, coverage);
  vec3 edgeCol = mix(uAccent, uAccent2, n);

  // Particle speckle inside the covered area — the "explosion" residue
  float speck = step(0.986, hash21(floor(uv * 460.0) + floor(uProgress * 22.0)));
  float flick = step(0.35, hash21(floor(uv * 460.0) + floor(uProgress * 60.0)));

  vec3 col = uBackground * coverage;
  col += edgeCol * edge * 2.6;
  col += edgeCol * speck * flick * 2.2;

  // Scanline interference while the transition is live
  float scan = sin(uv.y * 900.0 + uProgress * 90.0) * 0.5 + 0.5;
  col += edgeCol * scan * 0.05 * coverage;

  gl_FragColor = vec4(col, coverage * 0.97);
}
`;
