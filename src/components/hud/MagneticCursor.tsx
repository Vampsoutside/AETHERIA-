'use client';

import { useEffect, useRef, useState } from 'react';
import { cn, dampFactor, isTouchDevice } from '@/lib/utils';
import { useUIStore } from '@/lib/store/useUIStore';
import { audio } from '@/lib/audio/engine';

/**
 * Magnetic multi-layer cursor (spec §3 — Micro-Interactions & Cursor Physics).
 *
 * Two independently-driven layers: an inner dot that tracks the pointer
 * exactly, and an outer ring that chases it with a critically damped spring.
 * The lag IS the effect — it gives the cursor apparent mass, which makes the
 * whole interface feel like a physical place.
 *
 * Over any element carrying `data-cursor="DRAG 3D"` (or a WebGL object that
 * writes to the UI store) the ring expands and renders a context label.
 */
export function MagneticCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState('');
  const [variant, setVariant] = useState<string>('default');
  const [down, setDown] = useState(false);
  const [visible, setVisible] = useState(false);

  const cursor = useUIStore((s) => s.cursor);

  useEffect(() => {
    if (isTouchDevice()) {
      setEnabled(false);
      return;
    }
    setEnabled(true);
    document.body.classList.add('has-custom-cursor');

    // DOM hover targets: anything with a data-cursor attribute
    let domLabel = '';
    let domVariant = 'default';
    const over = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.('[data-cursor]') as HTMLElement | null;
      if (el) {
        domLabel = el.dataset.cursorLabel ?? el.dataset.cursor ?? '';
        domVariant = el.dataset.cursor ?? 'default';
      } else {
        domLabel = '';
        domVariant = 'default';
      }
    };
    window.addEventListener('pointerover', over, { passive: true });

    const downFn = () => setDown(true);
    const upFn = () => setDown(false);
    const leave = () => setVisible(false);
    const enter = () => setVisible(true);
    window.addEventListener('pointerdown', downFn);
    window.addEventListener('pointerup', upFn);
    document.addEventListener('mouseleave', leave);
    document.addEventListener('mouseenter', enter);
    setVisible(true);

    /* ---- magnetic pull toward elements marked data-magnetic ---- */
    let magnetX = 0;
    let magnetY = 0;
    let magnetScale = 1;
    let magnetTarget: HTMLElement | null = null;

    const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ring = { x: pointer.x, y: pointer.y };
    const dot = { x: pointer.x, y: pointer.y };
    let lastLabel = '';

    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      const el = (e.target as HTMLElement | null)?.closest?.('[data-magnetic]') as HTMLElement | null;
      magnetTarget = el;
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    let raf = 0;
    let prev = performance.now();

    const tick = (now: number) => {
      const delta = Math.min(0.05, (now - prev) / 1000);
      prev = now;

      // Magnetic attraction: pull the ring toward the centre of its target
      if (magnetTarget) {
        const r = magnetTarget.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const strength = Math.min(1, 90 / Math.max(60, r.width));
        magnetX += ((cx - pointer.x) * 0.34 * strength - magnetX) * dampFactor(9, delta);
        magnetY += ((cy - pointer.y) * 0.34 * strength - magnetY) * dampFactor(9, delta);
        magnetScale += (1.5 - magnetScale) * dampFactor(9, delta);
      } else {
        magnetX += (0 - magnetX) * dampFactor(9, delta);
        magnetY += (0 - magnetY) * dampFactor(9, delta);
        magnetScale += (1 - magnetScale) * dampFactor(9, delta);
      }

      // Inner dot: near-instant
      dot.x += (pointer.x - dot.x) * dampFactor(60, delta);
      dot.y += (pointer.y - dot.y) * dampFactor(60, delta);
      // Outer ring: lagging spring (~60 ms settle, no overshoot)
      ring.x += (pointer.x + magnetX - ring.x) * dampFactor(22, delta);
      ring.y += (pointer.y + magnetY - ring.y) * dampFactor(22, delta);

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${dot.x}px, ${dot.y}px, 0) translate(-50%, -50%) scale(${down ? 0.6 : 1})`;
      }
      if (ringRef.current) {
        const expansion = variantSize(domVariant || variant) * magnetScale * (down ? 0.86 : 1);
        ringRef.current.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0) translate(-50%, -50%) scale(${expansion})`;
      }

      const nextLabel = domLabel || label || '';
      if (nextLabel !== lastLabel) {
        lastLabel = nextLabel;
        setLabel(nextLabel);
        if (labelRef.current) {
          labelRef.current.style.opacity = nextLabel ? '1' : '0';
        }
        if (nextLabel) audio.play('hover', { volume: 0.5 });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerover', over);
      window.removeEventListener('pointerdown', downFn);
      window.removeEventListener('pointerup', upFn);
      document.removeEventListener('mouseleave', leave);
      document.removeEventListener('mouseenter', enter);
      document.body.classList.remove('has-custom-cursor');
    };
  }, [label, variant, down]);

  // Sync WebGL-driven cursor state (3D objects write to the store, not the DOM)
  useEffect(() => {
    setVariant(cursor.variant);
    setLabel(cursor.label);
    setDown(cursor.down);
    if (cursor.active) setVisible(true);
  }, [cursor.variant, cursor.label, cursor.down, cursor.active]);

  if (!enabled) return null;

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none fixed inset-0 z-[200] transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    >
      {/* Outer ring — lags, expands, carries the context label */}
      <div
        ref={ringRef}
        className="absolute left-0 top-0 will-change-transform"
        style={{ transform: 'translate3d(-100px,-100px,0)' }}
      >
        <div className="relative -ml-5 -mt-5 h-10 w-10">
          <svg viewBox="0 0 40 40" className="h-full w-full overflow-visible">
            <circle
              cx="20"
              cy="20"
              r="18"
              fill="none"
              stroke="rgb(var(--accent) / 0.75)"
              strokeWidth="0.9"
              strokeDasharray="3 5"
              className="origin-center animate-spin-slow"
            />
            <circle cx="20" cy="20" r="13.5" fill="rgb(var(--accent) / 0.04)" stroke="rgb(var(--accent) / 0.4)" strokeWidth="0.6" />
            {[0, 90, 180, 270].map((a) => {
              const rad = (a * Math.PI) / 180;
              const p = (r: number) => [20 + Math.cos(rad) * r, 20 + Math.sin(rad) * r] as const;
              const [x1, y1] = p(15.5);
              const [x2, y2] = p(20.5);
              return (
                <line
                  key={a}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgb(var(--accent) / 0.85)"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
          <span
            ref={labelRef}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[0.5rem] uppercase tracking-[0.2em] text-aether opacity-0 transition-opacity duration-200"
            style={{ textShadow: '0 0 10px rgb(var(--accent) / 0.9)' }}
          >
            {label}
          </span>
        </div>
      </div>

      {/* Inner dot — tracks exactly */}
      <div
        ref={dotRef}
        className="absolute left-0 top-0 will-change-transform"
        style={{ transform: 'translate3d(-100px,-100px,0)' }}
      >
        <div
          className={cn(
            '-ml-[3px] -mt-[3px] h-1.5 w-1.5 rounded-full bg-white transition-all duration-200',
            down && 'bg-aether',
          )}
          style={{ boxShadow: '0 0 8px rgb(var(--accent) / 0.95), 0 0 20px rgb(var(--accent) / 0.45)' }}
        />
      </div>
    </div>
  );
}

function variantSize(variant: string): number {
  switch (variant) {
    case 'drag':
      return 2.1;
    case 'inspect':
      return 2.6;
    case 'enter':
      return 1.9;
    case 'text':
      return 0.55;
    case 'hidden':
      return 0.001;
    default:
      return 1;
  }
}
