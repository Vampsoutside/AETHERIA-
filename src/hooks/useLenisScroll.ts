'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { publishScroll, resetScroll } from '@/lib/scrollState';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export interface LenisHandle {
  lenis: Lenis;
  scrollTo: (target: number | string | HTMLElement, opts?: { duration?: number; immediate?: boolean }) => void;
  stop: () => void;
  start: () => void;
}

/**
 * Lenis smooth-scroll + GSAP ScrollTrigger integration (spec §2, §3).
 *
 * The two are wired together the way Lenis documents it: ScrollTrigger's
 * update is driven by Lenis' scroll event, and Lenis' own rAF is driven by the
 * GSAP ticker so everything shares one frame clock. `lagSmoothing(0)` stops
 * GSAP from trying to compensate for Lenis' own interpolation.
 */
export function useLenisScroll(chapterCount = 4): LenisHandle {
  const ref = useRef<Lenis | null>(null);

  const lenis = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.92,
      touchMultiplier: 1.6,
      infinite: false,
      syncTouch: false, // native momentum on mobile — smoother than synthetic
    });
  }, []);

  useEffect(() => {
    if (!lenis) return;
    ref.current = lenis;
    resetScroll(chapterCount);

    let lastY = lenis.scroll;

    const onScroll = (instance: Lenis) => {
      const velocity = instance.scroll - lastY;
      lastY = instance.scroll;
      publishScroll({
        y: instance.scroll,
        limit: Math.max(1, instance.limit),
        velocity,
        scrolling: Math.abs(velocity) > 0.35,
      });
      ScrollTrigger.update();
    };

    lenis.on('scroll', onScroll);

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // Prime the state so the camera rig has a valid target before frame one.
    publishScroll({ y: lenis.scroll, limit: Math.max(1, lenis.limit), velocity: 0, scrolling: false });

    const onResize = () => {
      lenis.resize();
      publishScroll({ limit: Math.max(1, lenis.limit) });
      ScrollTrigger.refresh();
    };
    window.addEventListener('resize', onResize);
    // Images/fonts/models settling changes document height.
    const t = window.setTimeout(onResize, 900);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', onResize);
      gsap.ticker.remove(tick);
      lenis.off('scroll', onScroll);
      lenis.destroy();
      ref.current = null;
    };
  }, [lenis, chapterCount]);

  const scrollTo = useCallback(
    (target: number | string | HTMLElement, opts?: { duration?: number; immediate?: boolean }) => {
      ref.current?.scrollTo(target, { duration: opts?.duration ?? 1.2, immediate: opts?.immediate });
    },
    [],
  );

  const stop = useCallback(() => ref.current?.stop(), []);
  const start = useCallback(() => ref.current?.start(), []);

  return { lenis: lenis as Lenis, scrollTo, stop, start };
}

/** Expose the live Lenis instance for HUD components (scroll-progress rail). */
export function useLenisInstance(): Lenis | null {
  return null;
}
