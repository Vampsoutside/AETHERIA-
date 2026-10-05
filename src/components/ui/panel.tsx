'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/** Glassmorphic HUD panel — the base surface for every overlay in the realm. */
export const Panel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { frame?: boolean; strong?: boolean }>(
  ({ className, frame = true, strong = false, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(strong ? 'glass-strong' : 'glass', frame && 'hud-frame', 'relative overflow-hidden rounded-lg', className)}
      {...props}
    >
      {children}
    </div>
  ),
);
Panel.displayName = 'Panel';

/** Small uppercase mono label used across every HUD surface. */
export function HudLabel({
  children,
  className,
  dot = false,
}: {
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-mono text-hud uppercase text-slate-500', className)}>
      {dot && <span className="h-1 w-1 rounded-full bg-aether shadow-[0_0_6px_rgb(var(--accent))]" />}
      {children}
    </span>
  );
}

/** Numeric readout with tabular figures so digits never jitter. */
export function Readout({
  value,
  suffix,
  className,
  tone = 'accent',
}: {
  value: string | number;
  suffix?: string;
  className?: string;
  tone?: 'accent' | 'nebula' | 'plain' | 'gold';
}) {
  const toneCls =
    tone === 'accent'
      ? 'text-aether text-glow'
      : tone === 'nebula'
        ? 'text-nebula text-glow-2'
        : tone === 'gold'
          ? 'text-signal-gold'
          : 'text-white';
  return (
    <span className={cn('readout font-display font-extrabold tabular-nums', toneCls, className)}>
      {value}
      {suffix && <span className="ml-0.5 font-mono text-[0.55em] font-normal tracking-widest opacity-60">{suffix}</span>}
    </span>
  );
}

/** Animated hairline separator with a travelling highlight. */
export function Divider({ className, vertical = false }: { className?: string; vertical?: boolean }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-white/[0.07]',
        vertical ? 'h-auto w-px' : 'h-px w-full',
        className,
      )}
    >
      <div
        className={cn(
          'absolute bg-aether/70',
          vertical ? 'h-8 w-px animate-scan' : 'h-px w-1/4 animate-marquee',
        )}
      />
    </div>
  );
}

/** Corner-bracket frame without a background — for overlaying the canvas. */
export function BracketFrame({ className }: { className?: string }) {
  return (
    <div className={cn('pointer-events-none absolute inset-0', className)} aria-hidden>
      {(['left-0 top-0', 'right-0 top-0 rotate-90', 'right-0 bottom-0 rotate-180', 'left-0 bottom-0 -rotate-90'] as const).map(
        (pos) => (
          <svg key={pos} className={cn('absolute h-4 w-4 text-aether/60', pos)} viewBox="0 0 16 16" fill="none">
            <path d="M0 6V0h6" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        ),
      )}
    </div>
  );
}

/** Status pill: online / degraded / locked. */
export function StatusPill({
  tone = 'ok',
  children,
  className,
}: {
  tone?: 'ok' | 'warn' | 'locked' | 'idle';
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    ok: 'border-aether/40 text-aether bg-aether/[0.07]',
    warn: 'border-signal-gold/40 text-signal-gold bg-signal-gold/[0.07]',
    locked: 'border-white/12 text-slate-500 bg-white/[0.03]',
    idle: 'border-white/10 text-slate-400 bg-white/[0.02]',
  } as const;
  return (
    <span
      className={cn(
        'clip-tag inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-2xs uppercase tracking-[0.18em]',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
