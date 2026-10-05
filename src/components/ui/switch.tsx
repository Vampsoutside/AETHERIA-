'use client';

import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> & { label?: string; hint?: string }
>(({ className, label, hint, id, ...props }, ref) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      {(label || hint) && (
        <label htmlFor={inputId} className="cursor-pointer select-none">
          {label && <span className="block font-mono text-hud uppercase tracking-[0.18em] text-slate-300">{label}</span>}
          {hint && <span className="mt-0.5 block text-[0.7rem] leading-snug text-slate-500">{hint}</span>}
        </label>
      )}
      <SwitchPrimitive.Root
        id={inputId}
        ref={ref}
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full border border-white/12 bg-white/[0.04] transition-colors',
          'data-[state=checked]:border-aether/60 data-[state=checked]:bg-aether/18',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-aether/70',
          className,
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            'block h-3.5 w-3.5 translate-x-0.5 rounded-full bg-slate-500 transition-all duration-300 ease-out-expo',
            'data-[state=checked]:translate-x-[1.15rem] data-[state=checked]:bg-aether data-[state=checked]:shadow-[0_0_10px_rgb(var(--accent))]',
          )}
        />
      </SwitchPrimitive.Root>
    </div>
  );
});
Switch.displayName = 'Switch';

export const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { tone?: 'accent' | 'nebula' | 'gold' }
>(({ className, value = 0, tone = 'accent', ...props }, ref) => {
  const tones = {
    accent: 'from-nebula via-aether to-aether shadow-[0_0_12px_rgb(var(--accent)/0.7)]',
    nebula: 'from-aether via-nebula to-nebula shadow-[0_0_12px_rgb(var(--accent-2)/0.7)]',
    gold: 'from-signal-gold to-signal-ember shadow-[0_0_12px_rgba(255,196,107,0.6)]',
  } as const;
  return (
    <ProgressPrimitive.Root
      ref={ref}
      value={value}
      className={cn('relative h-1 w-full overflow-hidden rounded-full bg-white/[0.07]', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn('h-full rounded-full bg-gradient-to-r transition-[width] duration-700 ease-out-expo', tones[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = 'Progress';
