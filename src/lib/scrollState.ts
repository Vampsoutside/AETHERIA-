/**
 * Mutable scroll telemetry shared between Lenis (DOM) and the R3F render loop.
 *
 * This is intentionally NOT a zustand store: the camera rig reads it 60×/s
 * inside `useFrame`, and routing that through React state would re-render the
 * entire HUD tree every frame. Components that *do* need reactive scroll
 * values subscribe via `onScrollChange` at a throttled cadence instead.
 */

export interface ScrollSnapshot {
  /** Raw pixel offset */
  y: number;
  /** Total scrollable height in px */
  limit: number;
  /** Normalised 0..1 page progress */
  progress: number;
  /** Signed px/frame velocity, used for camera roll + FOV kick */
  velocity: number;
  /** True while the user is actively driving the scroll */
  scrolling: boolean;
  /** Which of the page's scroll "chapters" is currently in view */
  chapter: number;
  chapterCount: number;
  /** Direction of travel: -1 up, 0 idle, 1 down */
  direction: number;
}

export const scrollState: ScrollSnapshot = {
  y: 0,
  limit: 1,
  progress: 0,
  velocity: 0,
  scrolling: false,
  chapter: 0,
  chapterCount: 4,
  direction: 0,
};

type Listener = (s: ScrollSnapshot) => void;
const listeners = new Set<Listener>();

export function onScrollChange(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let lastEmit = 0;

/** Called by the Lenis provider on every animation frame. */
export function publishScroll(patch: Partial<ScrollSnapshot>) {
  const prevY = scrollState.y;
  Object.assign(scrollState, patch);
  if (patch.y !== undefined && patch.y !== prevY) {
    scrollState.direction = patch.y > prevY ? 1 : patch.y < prevY ? -1 : 0;
  }
  if (scrollState.limit > 0) {
    scrollState.progress = Math.max(0, Math.min(1, scrollState.y / scrollState.limit));
    scrollState.chapter = Math.min(
      scrollState.chapterCount - 1,
      Math.floor(scrollState.progress * scrollState.chapterCount),
    );
  }
  // Throttle reactive listeners to ~20 Hz; the render loop reads directly.
  const now = performance.now();
  if (now - lastEmit > 50) {
    lastEmit = now;
    const snap = { ...scrollState };
    listeners.forEach((l) => l(snap));
  }
}

export function resetScroll(chapterCount: number) {
  scrollState.chapterCount = Math.max(1, chapterCount);
  scrollState.chapter = 0;
  scrollState.progress = 0;
  scrollState.velocity = 0;
  scrollState.direction = 0;
}
