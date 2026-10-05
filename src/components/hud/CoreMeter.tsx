'use client';

import { TOTAL_CORES } from '@/lib/quests';
import { selectCoresFound, useQuestStore } from '@/lib/store/useQuestStore';
import { cn } from '@/lib/utils';

/**
 * Aether Core tally — the persistent objective readout (spec §4: "Quest Teaser
 * HUD: Displays current quest progress (Cores Found: X/5)").
 * Fires a ring pulse whenever the store's `corePulse` counter advances.
 */
export function CoreMeter({ compact = false }: { compact?: boolean }) {
  const cores = useQuestStore(selectCoresFound);
  const pulse = useQuestStore((s) => s.corePulse);

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-md border border-white/10 bg-black/35 px-2.5 py-1.5 backdrop-blur-md',
        compact && 'px-2 py-1',
      )}
      title={`Aether Cores recovered: ${cores} / ${TOTAL_CORES}`}
    >
      <span className="font-mono text-2xs uppercase tracking-[0.2em] text-slate-500">Cores</span>
      <div className="flex items-center gap-1">
        {Array.from({ length: TOTAL_CORES }).map((_, i) => {
          const filled = i < cores;
          return (
            <span key={i} className="relative flex h-3 w-3 items-center justify-center">
              <svg viewBox="0 0 12 12" className={cn('h-3 w-3 transition-all duration-500', filled ? 'text-aether' : 'text-white/18')}>
                <path
                  d="M6 .8 10.6 3.4v5.2L6 11.2 1.4 8.6V3.4z"
                  fill={filled ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="0.9"
                  fillOpacity={filled ? 0.85 : 1}
                />
              </svg>
              {filled && (
                <span
                  key={pulse}
                  className="pointer-events-none absolute inset-0 rounded-full border border-aether/70 animate-pulse-ring"
                />
              )}
            </span>
          );
        })}
      </div>
      <span className="readout font-mono text-[0.65rem] tabular-nums text-white/80">
        {cores}
        <span className="text-slate-600">/{TOTAL_CORES}</span>
      </span>
    </div>
  );
}
