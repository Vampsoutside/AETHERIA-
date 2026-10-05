import { NOISE_GLSL, ROTATION_GLSL, TONEMAP_GLSL } from './chunks';

/**
 * The Monolith — hero shader for the Gate of Origin.
 *
 * Vertex: second-order domain-warped displacement along the normal, so the
 * obelisk's facets breathe like something alive under the stone.
 * Fragment: emissive ridge extraction (the "cracks with energy running through
 * them" look), a fresnel rim, a slow vertical scan sweep, and a `uSecret`
 * channel that lights the hidden node for Quest 1.
 */

export const MONOLITH_VERT = /* glsl */ `
uniform float uTime;
uniform float uFrequency;
uniform float uDistortion;
uniform float uSecret;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vViewDir;
varying float vDisp;
varying vec2 vUv;

${NOISE_GLSL}
${ROTATION_GLSL}

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);

  vec3 p = position;

  // Domain-warped field evaluated on the object surface.
  float t = uTime * 0.16;
  vec2 sp = p.xy * uFrequency + p.z * 0.35;
  float field = warpField(sp, t, 3.4, 4);

  // Ridged variant: folds the field so creases read as faults in the stone.
  float ridge = pow(abs(field * 2.0 - 1.0), 1.6);

  float disp = (ridge - 0.45) * uDistortion;
  disp += 0.035 * sin(p.y * 2.2 + uTime * 0.7);

  // The hidden node: a soft bulge on one facet, only visible when sought.
  float secretMask = smoothstep(0.72, 1.0, sin(p.y * 0.9 + 1.1) * cos(atan(p.z, p.x) * 3.0));
  disp += secretMask * uSecret * 0.06 * (0.6 + 0.4 * sin(uTime * 3.0));

  p += normal * disp;
  vDisp = disp;

  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorldPos = world.xyz;
  vViewDir = normalize(cameraPosition - world.xyz);

  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const MONOLITH_FRAG = /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec3 uAccent;
uniform vec3 uAccent2;
uniform float uEmission;
uniform float uHover;
uniform float uSecret;
uniform float uSecretPulse;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vViewDir;
varying float vDisp;
varying vec2 vUv;

${NOISE_GLSL}
${TONEMAP_GLSL}

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vViewDir);

  // --- Base stone: two-tone vertical gradient with fine grain ------------
  float grain = vnoise(vWorldPos.xz * 26.0 + vWorldPos.y * 9.0);
  vec3 stone = mix(vec3(0.028, 0.030, 0.042), vec3(0.075, 0.082, 0.112), vUv.y);
  stone *= 0.72 + grain * 0.6;

  // --- Key light ---------------------------------------------------------
  vec3 lightDir = normalize(vec3(0.42, 0.86, 0.32));
  float diff = max(dot(n, lightDir), 0.0);
  float wrap = max(dot(n, lightDir) * 0.5 + 0.5, 0.0);
  stone *= 0.30 + diff * 0.85 + wrap * 0.22;

  // --- Emissive ridges ---------------------------------------------------
  float t = uTime * 0.16;
  float field = warpField(vUv * 5.2 + vWorldPos.y * 0.12, t, 3.6, 4);
  float ridge = pow(1.0 - abs(field * 2.0 - 1.0), 6.0);

  // Energy pulses travelling up the cracks
  float pulse = smoothstep(0.4, 1.0, sin(vWorldPos.y * 1.5 - uTime * 1.15) * 0.5 + 0.5);
  vec3 emissive = mix(uAccent, uAccent2, smoothstep(0.1, 0.9, field)) * ridge * (0.55 + pulse * 1.5);
  emissive *= uEmission;

  // --- Scan sweep --------------------------------------------------------
  float sweep = fract(vWorldPos.y * 0.09 - uTime * 0.06);
  float scan = smoothstep(0.0, 0.035, sweep) * smoothstep(0.16, 0.035, sweep);
  emissive += uAccent * scan * 0.45;

  // --- Fresnel rim -------------------------------------------------------
  float fres = pow(1.0 - max(dot(n, v), 0.0), 3.2);
  vec3 rim = mix(uAccent2, uAccent, 0.65) * fres * (0.55 + uHover * 1.4);

  // --- Quest 1: the hidden node -----------------------------------------
  float secretMask = smoothstep(0.72, 1.0, sin(vWorldPos.y * 0.9 + 1.1) * cos(atan(vWorldPos.z, vWorldPos.x) * 3.0));
  vec3 secretGlow = uAccent * secretMask * uSecretPulse * 2.4;
  secretGlow += uAccent2 * secretMask * uSecret * 0.6;

  vec3 col = stone + emissive + rim + secretGlow;
  col = aces(col * 1.06);

  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * Holographic shell used by Aether Cores and artifact pedestals.
 * Additive fresnel + interference bands — cheap and reads beautifully in bloom.
 */
export const SHELL_VERT = /* glsl */ `
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vWorldPos;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  vViewDir = normalize(cameraPosition - world.xyz);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const SHELL_FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec3 uAccent;
uniform vec3 uAccent2;
uniform float uOpacity;
uniform float uIntensity;
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vWorldPos;

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vViewDir);
  float fres = pow(1.0 - abs(dot(n, v)), 2.4);

  // Thin-film interference bands
  float bands = sin(vWorldPos.y * 42.0 - uTime * 2.2) * 0.5 + 0.5;
  bands = pow(bands, 6.0);

  vec3 col = mix(uAccent2, uAccent, fres) * (fres * 1.8 + bands * 0.55);
  col *= uIntensity;

  float alpha = clamp(fres * uOpacity + bands * 0.18, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}
`;
