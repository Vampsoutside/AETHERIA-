/**
 * Shared GLSL chunks. Concatenated into materials at runtime so every shader in
 * the realm uses identical noise — which is what makes the palette read as one
 * world rather than four demos.
 *
 * Written in GLSL ES 1.00 (gl_FragColor / varying / texture2D) for maximum
 * driver compatibility; three.js accepts this on WebGL2 contexts.
 */

export const HASH_GLSL = /* glsl */ `
float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}
float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
`;

export const NOISE_GLSL = /* glsl */ `
${HASH_GLSL}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i + vec2(0.0, 0.0));
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float vnoise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  float n = i.x + i.y * 157.0 + 113.0 * i.z;
  float a = hash11(n + 0.0);   float b = hash11(n + 1.0);
  float c = hash11(n + 157.0); float d = hash11(n + 158.0);
  float e = hash11(n + 113.0); float f2 = hash11(n + 114.0);
  float g = hash11(n + 270.0); float h = hash11(n + 271.0);
  return mix(mix(mix(a, b, u.x), mix(c, d, u.x), u.y),
             mix(mix(e, f2, u.x), mix(g, h, u.x), u.y), u.z);
}

float fbm(vec2 p, int octaves) {
  float v = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    v += amp * vnoise(p);
    p = rot * p * 2.02;
    amp *= 0.5;
  }
  return v;
}

float fbm3(vec3 p, int octaves) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    if (i >= octaves) break;
    v += amp * vnoise3(p);
    p = p * 2.07 + vec3(11.3, 7.7, 3.1);
    amp *= 0.5;
  }
  return v;
}

/* Second-order domain warp — see Codex article 01. */
float warpField(vec2 p, float t, float amp, int oct) {
  vec2 q = vec2(fbm(p + vec2(0.0, 0.0), oct),
                fbm(p + vec2(5.2, 1.3), oct));
  vec2 r = vec2(fbm(p + amp * q + vec2(1.7, 9.2) + 0.150 * t, oct),
                fbm(p + amp * q + vec2(8.3, 2.8) + 0.126 * t, oct));
  return fbm(p + amp * r, oct);
}
`;

export const ROTATION_GLSL = /* glsl */ `
mat2 rot2(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}
mat3 rotY3(float a) {
  float c = cos(a), s = sin(a);
  return mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);
}
mat3 rotX3(float a) {
  float c = cos(a), s = sin(a);
  return mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c);
}
`;

/** Simple ACES-ish tonemap so emissive blooms roll off instead of clipping. */
export const TONEMAP_GLSL = /* glsl */ `
vec3 aces(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
`;

/** Shared uniform names, kept in one place so JS and GLSL never drift. */
export const U = {
  time: 'uTime',
  accent: 'uAccent',
  accent2: 'uAccent2',
  opacity: 'uOpacity',
  progress: 'uProgress',
  frequency: 'uFrequency',
  distortion: 'uDistortion',
  emission: 'uEmission',
  waveSpeed: 'uWaveSpeed',
  pixelRatio: 'uPixelRatio',
  hover: 'uHover',
  secret: 'uSecret',
} as const;
