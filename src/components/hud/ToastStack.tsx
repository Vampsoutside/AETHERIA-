'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/lib/store/useUIStore';
import { cn } from '@/lib/utils';
import { audio } from '@/lib/audio/engine';
import { CheckIcon, CoreIcon, BoltIcon, QuestIcon } from '@/components/ui/icons';

/** Transient HUD notifications, bottom-right, newest at the bottom. */
export function ToastStack() {
  const toasts = useUIStore((s) => s.toasts);
  const dismiss = useUIStore((s) => s.dismissToast);

  useEffect(() => {
    if (toasts.length) audio.play('click', { volume: 0.35 });
  }, [toasts.length]);

  if (!toasts.length) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-[min(92vw,22rem)] flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const tone = {
          info: 'border-white/12 text-slate-300',
          success: 'border-aether/45 text-aether',
          core: 'border-nebula/50 text-nebula',
          warn: 'border-signal-gold/45 text-signal-gold',
        }[t.tone];
        const Icon = t.tone === 'core' ? CoreIcon : t.tone === 'warn' ? BoltIcon : t.tone === 'success' ? CheckIcon : QuestIcon;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => dismiss(t.id)}
            className={cn(
              'glass-strong pointer-events-auto flex w-full items-start gap-3 rounded-lg border p-3 text-left',
              'animate-rise-in transition-all duration-300 hover:bg-white/[0.06]',
              tone,
            )}
          >
            <span className="mt-0.5 shrink-0">
              <Icon size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-mono text-2xs uppercase tracking-[0.18em]">{t.title}</span>
              {t.body && <span className="mt-1 block text-[0.72rem] leading-snug text-slate-400">{t.body}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
