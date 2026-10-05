import * as THREE from 'three';
import { REGIONS, type RouteId } from '@/lib/tokens';

/**
 * Camera choreography (spec §2 — "Dynamic Camera: GSAP Spline Control tied to
 * Lenis Scroll").
 *
 * Each region owns a Catmull-Rom spline for the camera *position* and a second
 * one for the *look-at target*. Scroll progress 0→1 samples both, so the page
 * literally flies the viewer through the archipelago. Paths are authored in
 * local space and offset by the region origin, which keeps the four regions
 * persistent in one shared world — travelling between routes is a real flight,
 * not a scene swap.
 */

export interface RegionPath {
  origin: THREE.Vector3;
  /** Camera positions, local space */
  positions: THREE.CatmullRomCurve3;
  /** Look-at targets, local space */
  targets: THREE.CatmullRomCurve3;
  /** Default FOV at scroll 0 */
  fov: number;
  /** Sections on the page, used to snap the HUD chapter indicator */
  chapters: number;
}

const curve = (pts: [number, number, number][], closed = false) =>
  new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), closed, 'catmullrom', 0.42);

const originOf = (r: RouteId) => new THREE.Vector3(...(REGIONS[r].origin as readonly [number, number, number]));

export const REGION_PATHS: Record<RouteId, RegionPath> = {
  /* ---- 01 · Gate of Origin ---------------------------------------- */
  '/': {
    origin: originOf('/'),
    positions: curve([
      [0, 3.2, 34],
      [9, 5.5, 25],
      [12, 2.0, 15],
      [4, 7.5, 9],
      [-7, 3.0, 8],
      [-3, 1.2, 5.4],
    ]),
    targets: curve([
      [0, 2.0, 0],
      [0, 1.4, 0],
      [0, 0.6, 0],
      [0, 2.6, 0],
      [0, 0.2, 0],
      [0, 1.0, 0],
    ]),
    fov: 52,
    chapters: 4,
  },

  /* ---- 02 · The Crucible ------------------------------------------ */
  '/playground': {
    origin: originOf('/playground'),
    positions: curve([
      [0, 9, 24],
      [11, 6, 15],
      [9, 3.4, 5],
      [-2, 4.6, 6],
      [-11, 3.0, 11],
      [-4, 2.2, 3.2],
    ]),
    targets: curve([
      [0, 1.0, 0],
      [0, 1.6, -1],
      [1.5, 2.2, -1],
      [-2.0, 2.4, -1],
      [-3.5, 2.0, 0],
      [0, 2.4, -1.5],
    ]),
    fov: 56,
    chapters: 3,
  },

  /* ---- 03 · Archive of Artifacts ---------------------------------- */
  '/vault': {
    origin: originOf('/vault'),
    positions: curve([
      [0, 6, 30],
      [14, 3, 18],
      [16, 1.2, 2],
      [6, 2.6, -12],
      [-10, 4.0, -6],
      [-13, 1.8, 9],
    ]),
    targets: curve([
      [0, 0.5, 0],
      [0, 0.5, 0],
      [0, 0.8, 0],
      [0, 0.5, 0],
      [0, 0.8, 0],
      [0, 0.5, 0],
    ]),
    fov: 50,
    chapters: 3,
  },

  /* ---- 04 · Citadel of Knowledge ---------------------------------- */
  '/codex': {
    origin: originOf('/codex'),
    positions: curve([
      [0, 4, 30],
      [7, 7, 18],
      [3, 12, 8],
      [-6, 9, 2],
      [-2, 5, -6],
      [0, 3.4, -13],
    ]),
    targets: curve([
      [0, 4.0, 0],
      [0, 6.0, -2],
      [0, 9.0, -3],
      [0, 7.0, -4],
      [0, 4.0, -6],
      [0, 3.0, -8],
    ]),
    fov: 58,
    chapters: 4,
  },
};

/** Transit arc used when the route changes — a swoop, not a cut. */
export function buildTransitCurve(from: THREE.Vector3, to: THREE.Vector3): THREE.CatmullRomCurve3 {
  const mid = from.clone().lerp(to, 0.5);
  const dist = from.distanceTo(to);
  // Arc upward and outward so the flight reads as travelling *between* islands.
  mid.y += Math.max(14, dist * 0.22);
  mid.multiplyScalar(1.12);
  const q1 = from.clone().lerp(mid, 0.34);
  q1.y += dist * 0.08;
  const q2 = mid.clone().lerp(to, 0.62);
  q2.y += dist * 0.05;
  return new THREE.CatmullRomCurve3([from.clone(), q1, mid, q2, to.clone()], false, 'catmullrom', 0.5);
}

const _pos = new THREE.Vector3();
const _look = new THREE.Vector3();

/** Sample a region's spline at normalised progress, in world space. */
export function sampleRegion(route: RouteId, progress: number, outPos: THREE.Vector3, outLook: THREE.Vector3) {
  const region = REGION_PATHS[route];
  const t = THREE.MathUtils.clamp(progress, 0, 1);
  region.positions.getPointAt(t, _pos);
  region.targets.getPointAt(t, _look);
  outPos.copy(_pos).add(region.origin);
  outLook.copy(_look).add(region.origin);
  return { pos: outPos, look: outLook };
}

export const regionStart = (route: RouteId) => {
  const p = new THREE.Vector3();
  const l = new THREE.Vector3();
  sampleRegion(route, 0, p, l);
  return { pos: p, look: l };
};
