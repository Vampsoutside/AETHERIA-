'use client';

import { useEffect, useState } from 'react';
import { useUIStore } from '@/lib/store/useUIStore';
import { selectCoresFound, useQuestStore } from '@/lib/store/useQuestStore';
import { TOTAL_CORES } from '@/lib/quests';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CoreIcon } from '@/components/ui/icons';

/**
 * Full-screen reward moment fired when a side quest resolves.
 * Deliberately interruptive but short — it must feel like an achievement, not
 * a modal the Explorer has to fight. Auto-dismisses after 6 s.
 */
export function CelebrationOverlay() {
  const celebration = useUIStore((s) => s.celebration);
  const clear = useUIStore((s) => s.clearCelebration);
  const cores = useQuestStore(selectCoresFound);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!celebration) {
      setVisible(false);
      return;
    }
    const show = requestAnimationFrame(() => setVisible(true));
    const hide = window.setTimeout(() => {
      setVisible(false);
      window.setTimeout(clear, 620);
    }, 6000);
    return () => {
      cancelAnimationFrame(show);
      window.clearTimeout(hide);
    };
  }, [celebration, clear]);

  if (!celebration) return null;

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-0 z-[95] flex items-center justify-center transition-all duration-[620ms] ease-out-expo',
        visible ? 'opacity-100' : 'opacity-0',
      )}
      role="alert"
      aria-live="assertive"
    >
      {/* Radial bloom behind the card */}
      <div
        className={cn(
          'absolute inset-0 transition-opacity duration-700',
          visible ? 'opacity-100' : 'opacity-0',
          'bg-[radial-gradient(ellipse_at_center,rgb(var(--accent)/0.16)_0%,rgb(var(--accent-2)/0.09)_38%,transparent_72%)]',
        )}
      />
      {/* Expanding shockwave rings */}
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="absolute h-40 w-40 rounded-full border border-aether/35"
          style={{
            animation: `pulse-ring 2.4s cubic-bezier(0.16,1,0.3,1) ${i * 0.42}s infinite`,
          }}
        />
      ))}

      <div
        className={cn(
          'glass-strong hud-frame pointer-events-auto relative w-[min(92vw,32rem)] rounded-xl px-7 py-8 text-center transition-all duration-[620ms] ease-out-expo',
          visible ? 'translate-y-0 scale-100 blur-0' : 'translate-y-5 scale-[0.94] blur-[6px]',
        )}
      >
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center">
          <span className="absolute h-16 w-16 animate-spin-slow rounded-full border border-dashed border-aether/40" />
          <span className="relative flex h-11 w-11 items-center justify-center bg-aether/15 text-aether shadow-glow">
            <CoreIcon size={22} />
          </span>
        </div>

        <p className="font-mono text-hud uppercase tracking-mega text-aether">Quest Complete</p>
        <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white md:text-4xl">
          {celebration.title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">{celebration.rewardDetail}</p>

        <div className="mt-6 flex items-center justify-center gap-2 border-t border-white/8 pt-5">
          <span className="font-mono text-2xs uppercase tracking-[0.2em] text-slate-500">Grid integrity</span>
          <span className="readout font-display text-lg font-extrabold text-aether text-glow tabular-nums">
            {cores}
            <span className="text-slate-600">/{TOTAL_CORES}</span>
          </span>
          <span className="font-mono text-2xs text-slate-600">
            {Math.round((cores / TOTAL_CORES) * 100)}%
          </span>
        </div>

        <Button variant="primary" size="sm" className="mt-6 w-full" onClick={() => { setVisible(false); window.setTimeout(clear, 400); }}>
          Continue Exploring
        </Button>
      </div>
    </div>
  );
}
