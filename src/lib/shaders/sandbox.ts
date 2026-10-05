import { NOISE_GLSL, TONEMAP_GLSL } from './chunks';

/**
 * The Crucible — Shader Manipulator Sandbox (spec §4, Page 2).
 * Four live uniforms driven by HUD sliders: FREQUENCY, DISTORTION, EMISSION,
 * WAVE SPEED. `uResonance` flares when the frequency slider crosses 432 Hz,
 * which is the tell for Quest 2.
 */

export const SANDBOX_VERT = /* glsl */ `
uniform float uTime;
uniform float uFrequency;
uniform float uDistortion;
uniform float uWaveSpeed;
uniform float uResonance;

varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vWorldPos;
varying float vDisp;
varying vec2 vUv;

${NOISE_GLSL}

void main() {
  vUv = uv;
  vec3 n = normalize(normal);
  float t = uTime * uWaveSpeed;

  // Three travelling sine bands on different axes = interference pattern
  float wave =
      sin(position.x * uFrequency * 0.9 + t * 1.7) * 0.5
    + sin(position.y * uFrequency * 1.3 - t * 1.1) * 0.32
    + sin(position.z * uFrequency * 0.7 + t * 2.3) * 0.18;

  // fBM adds the organic component so it never reads as a pure sine
  float organic = fbm3(position * (0.7 + uFrequency * 0.16) + vec3(t * 0.25), 4);

  float disp = (wave * 0.55 + (organic - 0.5) * 1.6) * uDistortion;
  disp += uResonance * 0.09 * sin(t * 7.0 + length(position) * 3.0);

  vec3 p = position + n * disp;
  vDisp = disp;
  vNormal = normalize(normalMatrix * n);

  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorldPos = world.xyz;
  vViewDir = normalize(cameraPosition - world.xyz);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const SANDBOX_FRAG = /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec3 uAccent;
uniform vec3 uAccent2;
uniform float uEmission;
uniform float uFrequency;
uniform float uResonance;
uniform float uMode;     // 0 = standard, 1 = secret shader (quest reward)

varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vWorldPos;
varying float vDisp;
varying vec2 vUv;

${NOISE_GLSL}
${TONEMAP_GLSL}

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vViewDir);
  float fres = pow(1.0 - max(dot(n, v), 0.0), 2.6);

  // Contour bands keyed to displacement — reads as a topographic scan
  float bands = sin(vDisp * 34.0 - uTime * 1.4) * 0.5 + 0.5;
  bands = pow(bands, 3.0);

  vec3 base = mix(vec3(0.02, 0.022, 0.034), vec3(0.055, 0.06, 0.09), vUv.y);

  vec3 lightDir = normalize(vec3(-0.4, 0.9, 0.55));
  float diff = max(dot(n, lightDir), 0.0);
  base *= 0.35 + diff * 0.9;

  // Specular highlight, tight
  vec3 h = normalize(lightDir + v);
  float spec = pow(max(dot(n, h), 0.0), 90.0);

  vec3 tint = mix(uAccent2, uAccent, clamp(vDisp * 1.6 + 0.5, 0.0, 1.0));
  vec3 emit = tint * (bands * 0.85 + fres * 1.15) * uEmission;
  emit += vec3(1.0) * spec * 0.55 * uEmission;

  // Secret shader mode: chromatic split + travelling hex lattice
  if (uMode > 0.5) {
    float hex = abs(sin(vWorldPos.x * 9.0) * sin(vWorldPos.y * 9.0) * sin(vWorldPos.z * 9.0));
    hex = smoothstep(0.06, 0.0, hex);
    emit += mix(uAccent, vec3(1.0, 0.85, 0.2), 0.5) * hex * 1.4;
    emit.r *= 1.0 + 0.35 * sin(uTime * 2.0);
    emit.b *= 1.0 + 0.35 * cos(uTime * 1.7);
  }

  // Resonance flare at 432 Hz
  float ring = smoothstep(0.35, 1.0, sin(vWorldPos.y * 6.0 - uTime * 5.0) * 0.5 + 0.5);
  emit += uAccent * ring * uResonance * 2.2;

  vec3 col = base + emit;
  col = aces(col * 1.1);
  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * Holographic grid floor / barrier field — used by the Crucible table and the
 * Citadel library deck. Purely procedural, no textures.
 */
export const GRID_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldPos;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const GRID_FRAG = /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec3 uAccent;
uniform vec3 uAccent2;
uniform float uCellSize;
uniform float uThickness;
uniform float uOpacity;
uniform float uPulse;

varying vec2 vUv;
varying vec3 vWorldPos;

float gridLine(vec2 p, float cell, float thickness) {
  vec2 g = abs(fract(p / cell - 0.5) - 0.5) / fwidth(p / cell);
  float l = min(g.x, g.y);
  return 1.0 - smoothstep(0.0, thickness, l);
}

void main() {
  vec2 p = vWorldPos.xz;

  float major = gridLine(p, uCellSize, uThickness);
  float minor = gridLine(p, uCellSize * 0.2, uThickness * 0.7) * 0.35;

  float d = length(p);
  // Radial fade so the plane dissolves into the void instead of ending
  float fade = smoothstep(26.0, 4.0, d);

  // Expanding pulse rings from the origin
  float ring = sin(d * 1.3 - uTime * uPulse * 2.0) * 0.5 + 0.5;
  ring = pow(ring, 14.0) * fade;

  vec3 col = mix(uAccent2, uAccent, smoothstep(0.0, 18.0, d));
  float a = (major * 0.85 + minor + ring * 1.4) * fade * uOpacity;

  if (a < 0.003) discard;
  gl_FragColor = vec4(col * (0.7 + major + ring * 2.0), a);
}
`;
