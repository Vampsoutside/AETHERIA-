/**
 * AETHERIA — Procedural Asset Forge
 * -------------------------------------------------------------
 * Generates the binary .glb models shipped in /public/models with zero
 * external dependencies and zero licensing baggage. Every mesh is authored
 * here as a faceted (flat-shaded) low-poly surface, which is exactly the
 * aesthetic the archipelago needs — and keeps payloads in the tens of KB
 * instead of the megabytes a scanned model would cost.
 *
 * Run:  node scripts/generate-assets.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'models');
mkdirSync(OUT, { recursive: true });

/* ------------------------------------------------------------------ *
 * Deterministic RNG + noise
 * ------------------------------------------------------------------ */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Wrap-around 1D value noise so revolved surfaces seam perfectly. */
function ringNoise(count, octaves, rand) {
  const base = [];
  for (let i = 0; i < count; i++) base.push(rand() * 2 - 1);
  return (i, ring) => {
    let v = 0;
    let amp = 1;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      const idx = (i * (o + 1) + ring * (o + 2)) % count;
      const nxt = (idx + 1) % count;
      const f = ((i * (o + 1)) / count) * 3.7;
      const t = f - Math.floor(f);
      v += amp * (base[idx] * (1 - t) + base[nxt] * t);
      norm += amp;
      amp *= 0.5;
    }
    return v / norm;
  };
}

/* ------------------------------------------------------------------ *
 * Triangle soup helpers (faceted / flat-shaded)
 * ------------------------------------------------------------------ */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm3 = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

/** Convert a list of [v0,v1,v2] triangles into flat-shaded POSITION/NORMAL. */
function faceted(tris) {
  const positions = new Float32Array(tris.length * 9);
  const normals = new Float32Array(tris.length * 9);
  tris.forEach((t, i) => {
    const n = norm3(cross(sub(t[1], t[0]), sub(t[2], t[0])));
    for (let k = 0; k < 3; k++) {
      positions[i * 9 + k * 3 + 0] = t[k][0];
      positions[i * 9 + k * 3 + 1] = t[k][1];
      positions[i * 9 + k * 3 + 2] = t[k][2];
      normals[i * 9 + k * 3 + 0] = n[0];
      normals[i * 9 + k * 3 + 1] = n[1];
      normals[i * 9 + k * 3 + 2] = n[2];
    }
  });
  return { positions, normals };
}

/** Apply a 3x3 matrix + translation to every vertex of a triangle soup. */
function transform(tris, m, t = [0, 0, 0]) {
  return tris.map((tri) =>
    tri.map((v) => [
      m[0] * v[0] + m[1] * v[1] + m[2] * v[2] + t[0],
      m[3] * v[0] + m[4] * v[1] + m[5] * v[2] + t[1],
      m[6] * v[0] + m[7] * v[1] + m[8] * v[2] + t[2],
    ]),
  );
}
const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];
function rotY(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [c, 0, s, 0, 1, 0, -s, 0, c];
}
function rotX(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [1, 0, 0, 0, c, -s, 0, s, c];
}
function rotZ(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}
const mul = (a, b) => {
  const o = new Array(9).fill(0);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      for (let k = 0; k < 3; k++) o[r * 3 + c] += a[r * 3 + k] * b[k * 3 + c];
  return o;
};
const scaleM = (s) => [s[0], 0, 0, 0, s[1], 0, 0, 0, s[2]];

/* ------------------------------------------------------------------ *
 * Primitives
 * ------------------------------------------------------------------ */

/**
 * Surface of revolution from a 2D profile of [radius, y] control points.
 * `jitter` adds seeded rocky displacement; `twist` rotates each ring.
 */
function revolve(profile, segments, opts = {}) {
  const { jitter = 0, seed = 1, twist = 0, capBottom = true, capTop = true, yScale = 1 } = opts;
  const rand = mulberry32(seed);
  const noise = ringNoise(segments, 3, rand);
  const tris = [];

  const rings = profile.map((p, ri) => {
    const ring = [];
    for (let s = 0; s < segments; s++) {
      const a = (s / segments) * Math.PI * 2 + ri * twist;
      const n = jitter ? noise(s, ri) * jitter : 0;
      const r = Math.max(0, p[0] * (1 + n));
      ring.push([Math.cos(a) * r, p[1] * yScale * (1 + n * 0.25), Math.sin(a) * r]);
    }
    return ring;
  });

  for (let ri = 0; ri < rings.length - 1; ri++) {
    for (let s = 0; s < segments; s++) {
      const s2 = (s + 1) % segments;
      const a = rings[ri][s], b = rings[ri][s2], c = rings[ri + 1][s2], d = rings[ri + 1][s];
      tris.push([a, d, c], [a, c, b]);
    }
  }

  // Fan caps where the profile terminates at (or near) the axis.
  const cap = (ring, y, up) => {
    const apex = [0, y, 0];
    for (let s = 0; s < segments; s++) {
      const s2 = (s + 1) % segments;
      tris.push(up ? [apex, ring[s], ring[s2]] : [apex, ring[s2], ring[s]]);
    }
  };
  if (capTop && rings[rings.length - 1][0][0] < 0.02) cap(rings[rings.length - 1], rings[rings.length - 1][0][1], true);
  if (capBottom && rings[0][0][0] < 0.02) cap(rings[0], rings[0][0][1], false);

  return tris;
}

/** Geodesic icosphere returned as a triangle soup (faceted). */
function icosphere(radius, detail) {
  const t = (1 + Math.sqrt(5)) / 2;
  let verts = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map(norm3);
  let faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  const midCache = new Map();
  const midpoint = (a, b) => {
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    if (midCache.has(key)) return midCache.get(key);
    const m = norm3([(verts[a][0] + verts[b][0]) / 2, (verts[a][1] + verts[b][1]) / 2, (verts[a][2] + verts[b][2]) / 2]);
    verts.push(m);
    midCache.set(key, verts.length - 1);
    return verts.length - 1;
  };
  for (let d = 0; d < detail; d++) {
    const next = [];
    midCache.clear();
    for (const [a, b, c] of faces) {
      const ab = midpoint(a, b), bc = midpoint(b, c), ca = midpoint(c, a);
      next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = next;
  }
  return faces.map(([a, b, c]) => [
    verts[a].map((v) => v * radius),
    verts[b].map((v) => v * radius),
    verts[c].map((v) => v * radius),
  ]);
}

/** Displace an icosphere along its normals with layered noise → asteroid rock. */
function rockyBlob(radius, detail, amount, seed) {
  const rand = mulberry32(seed);
  const o1 = [rand() * 9, rand() * 9, rand() * 9];
  const o2 = [rand() * 9, rand() * 9, rand() * 9];
  return icosphere(radius, detail).map((tri) =>
    tri.map((v) => {
      const n = norm3(v);
      const wob =
        Math.sin(n[0] * 2.3 + o1[0]) * Math.cos(n[1] * 1.9 + o1[1]) * 0.6 +
        Math.sin(n[2] * 4.7 + o2[2]) * 0.28 +
        Math.sin(n[0] * 9.1 + n[1] * 7.3 + o2[0]) * 0.12;
      const r = radius * (1 + wob * amount);
      return [n[0] * r, n[1] * r, n[2] * r];
    }),
  );
}

/** Flat annular disc (used for plinths / lab tables). */
function disc(inner, outer, y, segments = 32) {
  const tris = [];
  for (let s = 0; s < segments; s++) {
    const a1 = (s / segments) * Math.PI * 2;
    const a2 = ((s + 1) / segments) * Math.PI * 2;
    const p = (r, a) => [Math.cos(a) * r, y, Math.sin(a) * r];
    tris.push([p(inner, a1), p(inner, a2), p(outer, a2)]);
    tris.push([p(inner, a1), p(outer, a2), p(outer, a1)]);
  }
  return tris;
}

/** Hollow ring / torus-ish band, faceted. */
function band(radius, tube, segments = 40, sides = 6) {
  const tris = [];
  for (let i = 0; i < segments; i++) {
    const a1 = (i / segments) * Math.PI * 2;
    const a2 = ((i + 1) / segments) * Math.PI * 2;
    const ringPts = (a) => {
      const pts = [];
      for (let j = 0; j < sides; j++) {
        const b = (j / sides) * Math.PI * 2;
        const r = radius + Math.cos(b) * tube;
        pts.push([Math.cos(a) * r, Math.sin(b) * tube, Math.sin(a) * r]);
      }
      return pts;
    };
    const A = ringPts(a1), B = ringPts(a2);
    for (let j = 0; j < sides; j++) {
      const j2 = (j + 1) % sides;
      tris.push([A[j], A[j2], B[j2]], [A[j], B[j2], B[j]]);
    }
  }
  return tris;
}

/* ------------------------------------------------------------------ *
 * Materials
 * ------------------------------------------------------------------ */
const mat = (baseColor, { metallic = 0.15, roughness = 0.72, emissive = [0, 0, 0], name = 'mat' } = {}) => ({
  name,
  pbrMetallicRoughness: {
    baseColorFactor: [...baseColor, 1],
    metallicFactor: metallic,
    roughnessFactor: roughness,
  },
  emissiveFactor: emissive,
  doubleSided: false,
});

const ROCK = mat([0.086, 0.09, 0.118], { metallic: 0.05, roughness: 0.94, name: 'aether-rock' });
const ROCK_DARK = mat([0.043, 0.045, 0.066], { metallic: 0.05, roughness: 0.98, name: 'aether-rock-deep' });
const STONE = mat([0.11, 0.118, 0.16], { metallic: 0.35, roughness: 0.42, name: 'aether-stone' });
const SHELL = mat([0.06, 0.62, 0.72], { metallic: 0.9, roughness: 0.18, emissive: [0.0, 0.34, 0.42], name: 'aether-shell' });
const CRYSTAL = mat([0.42, 0.1, 0.95], { metallic: 0.6, roughness: 0.12, emissive: [0.24, 0.02, 0.62], name: 'aether-crystal' });
const CORE = mat([0.0, 0.94, 1.0], { metallic: 1.0, roughness: 0.05, emissive: [0.0, 0.78, 0.92], name: 'aether-core' });

/* ------------------------------------------------------------------ *
 * GLB container writer
 * ------------------------------------------------------------------ */
function writeGLB(filePath, meshes, name) {
  const buffers = [];
  const bufferViews = [];
  const accessors = [];
  const glMeshes = [];
  const materials = [];
  const nodes = [];
  const matIndex = new Map();
  let byteOffset = 0;

  const push = (typed, target) => {
    const pad = (4 - (byteOffset % 4)) % 4;
    if (pad) {
      buffers.push(Buffer.alloc(pad));
      byteOffset += pad;
    }
    const buf = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
    buffers.push(buf);
    bufferViews.push({ buffer: 0, byteOffset, byteLength: typed.byteLength, target });
    byteOffset += typed.byteLength;
    return bufferViews.length - 1;
  };

  const vec3Accessor = (typed, bv, withBounds) => {
    const acc = { bufferView: bv, componentType: 5126, count: typed.length / 3, type: 'VEC3' };
    if (withBounds) {
      const min = [Infinity, Infinity, Infinity];
      const max = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < typed.length; i += 3)
        for (let k = 0; k < 3; k++) {
          const v = typed[i + k];
          if (v < min[k]) min[k] = v;
          if (v > max[k]) max[k] = v;
        }
      acc.min = min.map((v) => +v.toFixed(5));
      acc.max = max.map((v) => +v.toFixed(5));
    }
    accessors.push(acc);
    return accessors.length - 1;
  };

  for (const m of meshes) {
    const key = JSON.stringify(m.material);
    let mi = matIndex.get(key);
    if (mi === undefined) {
      mi = materials.length;
      matIndex.set(key, mi);
      materials.push(m.material);
    }
    const { positions, normals } = faceted(m.tris);
    const pBV = push(positions, 34962);
    const nBV = push(normals, 34962);
    glMeshes.push({
      name: m.name,
      primitives: [
        {
          attributes: { POSITION: vec3Accessor(positions, pBV, true), NORMAL: vec3Accessor(normals, nBV, false) },
          material: mi,
          mode: 4,
        },
      ],
    });
    nodes.push({ mesh: glMeshes.length - 1, name: m.name });
  }

  const binBuf = Buffer.concat(buffers);
  const gltf = {
    asset: { version: '2.0', generator: 'AETHERIA Procedural Asset Forge v1.0' },
    scene: 0,
    scenes: [{ name, nodes: nodes.map((_, i) => i) }],
    nodes,
    meshes: glMeshes,
    materials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: binBuf.length }],
  };

  let jsonStr = JSON.stringify(gltf);
  while (jsonStr.length % 4) jsonStr += ' ';
  const jsonBuf = Buffer.from(jsonStr, 'utf8');
  const binPad = (4 - (binBuf.length % 4)) % 4;
  const binPadded = binPad ? Buffer.concat([binBuf, Buffer.alloc(binPad)]) : binBuf;

  const total = 12 + 8 + jsonBuf.length + 8 + binPadded.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(total, 8);
  const jc = Buffer.alloc(8);
  jc.writeUInt32LE(jsonBuf.length, 0);
  jc.writeUInt32LE(0x4e4f534a, 4);
  const bc = Buffer.alloc(8);
  bc.writeUInt32LE(binPadded.length, 0);
  bc.writeUInt32LE(0x004e4942, 4);

  writeFileSync(filePath, Buffer.concat([header, jc, jsonBuf, bc, binPadded]));
  return { bytes: total, tris: meshes.reduce((n, m) => n + m.tris.length, 0) };
}

/* ------------------------------------------------------------------ *
 * The catalogue
 * ------------------------------------------------------------------ */
const catalogue = [];

// --- Floating island: alpha (large, hero island) --------------------
{
  const top = revolve(
    [[0.02, 1.15], [1.4, 1.02], [2.6, 0.72], [3.1, 0.24], [2.9, -0.1]],
    26,
    { jitter: 0.13, seed: 7, capTop: true },
  );
  const bottom = revolve(
    [[2.9, -0.1], [2.4, -0.85], [1.6, -1.9], [0.85, -3.1], [0.32, -4.2], [0.02, -5.0]],
    22,
    { jitter: 0.26, seed: 91, capBottom: true },
  );
  const shards = [];
  const rand = mulberry32(3);
  for (let i = 0; i < 7; i++) {
    const a = rand() * Math.PI * 2;
    const d = 3.4 + rand() * 2.2;
    const s = 0.22 + rand() * 0.4;
    shards.push(
      transform(rockyBlob(s, 1, 0.34, 40 + i), mul(rotY(a), rotX(rand() * 0.6)), [
        Math.cos(a) * d, -1.4 - rand() * 2.6, Math.sin(a) * d,
      ]),
    );
  }
  catalogue.push({
    file: 'island-alpha.glb',
    name: 'IslandAlpha',
    meshes: [
      { name: 'island-crust', tris: top, material: ROCK },
      { name: 'island-root', tris: bottom, material: ROCK_DARK },
      { name: 'island-debris', tris: shards.flat(), material: ROCK_DARK },
    ],
  });
}

// --- Floating island: beta (small, distant) -------------------------
{
  const top = revolve([[0.02, 0.7], [0.9, 0.6], [1.6, 0.3], [1.5, -0.05]], 18, { jitter: 0.16, seed: 21 });
  const bottom = revolve([[1.5, -0.05], [1.1, -0.8], [0.5, -1.7], [0.02, -2.3]], 16, {
    jitter: 0.3, seed: 55, capBottom: true,
  });
  catalogue.push({
    file: 'island-beta.glb',
    name: 'IslandBeta',
    meshes: [
      { name: 'crust', tris: top, material: ROCK },
      { name: 'root', tris: bottom, material: ROCK_DARK },
    ],
  });
}

// --- The Monolith (Gate of Origin centrepiece) ----------------------
{
  const body = revolve(
    [[1.05, -4.4], [1.0, -3.6], [0.92, 0], [0.86, 3.2], [0.6, 4.6], [0.22, 5.5], [0.02, 5.9]],
    8,
    { jitter: 0.018, seed: 4, twist: 0.055, capTop: true },
  );
  const plinth = revolve([[0.02, -5.2], [1.9, -5.0], [2.3, -4.6], [1.5, -4.35], [1.05, -4.4]], 8, {
    jitter: 0.02, seed: 4, twist: 0.055, capBottom: true,
  });
  const rings = [];
  for (let i = 0; i < 3; i++) {
    rings.push(transform(band(1.28 + i * 0.34, 0.035, 44, 5), mul(rotX(Math.PI / 2), rotY(i * 0.5)), [0, -1.4 + i * 2.3, 0]));
  }
  catalogue.push({
    file: 'monolith.glb',
    name: 'Monolith',
    meshes: [
      { name: 'monolith-body', tris: body, material: STONE },
      { name: 'monolith-plinth', tris: plinth, material: ROCK_DARK },
      { name: 'monolith-rings', tris: rings.flat(), material: SHELL },
    ],
  });
}

// --- Crystal shard cluster ------------------------------------------
{
  const shard = (h, r, seed) =>
    revolve([[0.02, -h * 0.42], [r, -h * 0.1], [r * 0.82, h * 0.22], [r * 0.34, h * 0.46], [0.02, h * 0.58]], 6, {
      jitter: 0.05, seed, capTop: true, capBottom: true,
    });
  const rand = mulberry32(77);
  const parts = [shard(3.4, 0.42, 11)];
  for (let i = 0; i < 4; i++) {
    const a = rand() * Math.PI * 2;
    const h = 1.3 + rand() * 1.5;
    parts.push(
      transform(shard(h, 0.16 + rand() * 0.16, 20 + i), mul(rotZ((rand() - 0.5) * 0.7), rotY(a)), [
        Math.cos(a) * (0.42 + rand() * 0.3), -0.3 + rand() * 0.5, Math.sin(a) * (0.42 + rand() * 0.3),
      ]),
    );
  }
  catalogue.push({
    file: 'crystal.glb',
    name: 'CrystalCluster',
    meshes: [{ name: 'crystal', tris: parts.flat(), material: CRYSTAL }],
  });
}

// --- Aether Core (the collectible) ----------------------------------
{
  const shell = rockyBlob(1.0, 2, 0.09, 5);
  const inner = icosphere(0.62, 1);
  const cage = [];
  for (let i = 0; i < 3; i++) cage.push(transform(band(1.12, 0.022, 36, 4), rotY((i * Math.PI) / 3), [0, 0, 0]));
  catalogue.push({
    file: 'aether-core.glb',
    name: 'AetherCore',
    meshes: [
      { name: 'core-shell', tris: shell, material: SHELL },
      { name: 'core-heart', tris: inner, material: CORE },
      { name: 'core-cage', tris: cage.flat(), material: STONE },
    ],
  });
}

// --- Citadel spire (background landmark) ----------------------------
{
  const spire = revolve(
    [[1.5, -3.0], [1.2, -2.4], [0.7, 1.2], [0.42, 4.0], [0.16, 6.2], [0.02, 7.2]],
    6,
    { jitter: 0.03, seed: 13, twist: 0.12, capTop: true },
  );
  const base = revolve([[0.02, -4.2], [2.6, -3.9], [2.9, -3.3], [1.5, -3.0]], 6, { jitter: 0.05, seed: 13, capBottom: true });
  catalogue.push({
    file: 'citadel-spire.glb',
    name: 'CitadelSpire',
    meshes: [
      { name: 'spire', tris: spire, material: STONE },
      { name: 'spire-base', tris: base, material: ROCK_DARK },
    ],
  });
}

/* ------------------------------------------------------------------ *
 * Forge
 * ------------------------------------------------------------------ */
let totalBytes = 0;
let totalTris = 0;
for (const entry of catalogue) {
  const p = join(OUT, entry.file);
  const { bytes, tris } = writeGLB(p, entry.meshes, entry.name);
  totalBytes += bytes;
  totalTris += tris;
  console.log(`  ✓ ${entry.file.padEnd(20)} ${(bytes / 1024).toFixed(1).padStart(7)} KB   ${String(tris).padStart(5)} tris`);
}
console.log(`\nForged ${catalogue.length} models → public/models`);
console.log(`  total ${(totalBytes / 1024).toFixed(1)} KB · ${totalTris} triangles`);
