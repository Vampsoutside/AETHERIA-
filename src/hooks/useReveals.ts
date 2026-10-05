'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '@/lib/utils';

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll-driven reveals (spec §2: "Animation & Scrolling: GSAP + ScrollTrigger").
 *
 * Adds `.is-in` to any element carrying `data-reveal`, which the CSS in
 * globals.css turns into a blur-up + rise transition. Staggered containers use
 * `data-reveal-group` so their children animate in sequence via CSS only —
 * one ScrollTrigger per group instead of per child.
 */
export function useReveals(): void {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reduced = prefersReducedMotion();
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-in), [data-reveal-group]:not(.is-in)'),
    );

    if (reduced) {
      targets.forEach((el) => el.classList.add('is-in'));
      return;
    }

    const triggers = targets.map((el) =>
      ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        once: true,
        onEnter: () => {
          const group = el.hasAttribute('data-reveal-group');
          el.classList.add('is-in', group ? 'stagger' : 'reveal');
          if (!group) el.classList.add('reveal');
          // Let GSAP handle anything with explicit data-reveal-anim
          const custom = el.dataset.revealAnim;
          if (custom === 'scale') {
            gsap.fromTo(el, { scale: 0.94, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.1, ease: 'expo.out' });
          }
        },
      }),
    );

    // Refresh after the page's async content (models, fonts) settles.
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 700);

    return () => {
      window.clearTimeout(t);
      triggers.forEach((tr) => tr.kill());
    };
  }, [pathname]);
}

/** Animate a numeric readout up to `value` when it scrolls into view. */
export function useCountUp(ref: React.RefObject<HTMLElement | null>, value: number, duration = 1.8): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.textContent = value.toLocaleString();
      return;
    }
    const obj = { v: 0 };
    const tween = gsap.to(obj, {
      v: value,
      duration,
      ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      onUpdate: () => {
        el.textContent = Math.round(obj.v).toLocaleString();
      },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [ref, value, duration]);
}
