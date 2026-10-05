'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

/**
 * HUD slider. Renders a numeric readout alongside the track because every
 * slider in AETHERIA is an instrument, not a preference — the Explorer needs
 * to see the exact value (Quest 2 requires hitting precisely 432 Hz).
 */
export interface SliderProps {
  label?: string;
  unit?: string;
  value?: number[];
  defaultValue?: number[];
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  inverted?: boolean;
  /** Highlight the track when the value enters this window */
  resonanceAt?: number;
  resonanceTolerance?: number;
  format?: (v: number) => string;
  onChange: (value: number[]) => void;
  className?: string;
  'aria-label'?: string;
}

export const Slider = React.forwardRef<React.ElementRef<typeof SliderPrimitive.Root>, SliderProps>(
  ({ className, label, unit, value, resonanceAt, resonanceTolerance = 1.5, format, onChange, ...props }, ref) => {
    const current = Array.isArray(value) ? (value[0] ?? 0) : 0;
    const resonant = resonanceAt !== undefined && Math.abs(current - resonanceAt) <= resonanceTolerance;

    const handleChange = (val: number[]) => {
      onChange(val);
    };

    return (
      <div className={cn('w-full', className)}>
        {(label || unit) && (
          <div className="mb-2 flex items-baseline justify-between gap-3">
            {label && (
              <span className="font-mono text-hud uppercase tracking-[0.2em] text-slate-400">{label}</span>
            )}
            <span
              className={cn(
                'readout font-mono text-xs tabular-nums transition-colors duration-200',
                resonant ? 'text-aether text-glow' : 'text-white/85',
              )}
            >
              {format ? format(current) : current}
              {unit && <span className="ml-0.5 text-[0.7em] text-slate-500">{unit}</span>}
            </span>
          </div>
        )}
        <SliderPrimitive.Root
          ref={ref}
          value={Array.isArray(value) ? value : [current]}
          onValueChange={handleChange}
          className={cn('relative flex w-full touch-none select-none items-center py-2.5', className)}
          {...props}
        >
          <SliderPrimitive.Track className="relative h-[3px] w-full grow overflow-hidden rounded-full bg-white/10">
            <SliderPrimitive.Range
              className={cn(
                'absolute h-full transition-colors duration-300',
                resonant ? 'bg-aether shadow-[0_0_14px_rgb(var(--accent))]' : 'bg-gradient-to-r from-nebula to-aether',
              )}
            />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            aria-label={label ?? 'slider'}
            className={cn(
              'block h-3.5 w-3.5 rotate-45 border bg-void-900 transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aether/70 focus-visible:ring-offset-2 focus-visible:ring-offset-void-900',
              resonant
                ? 'scale-125 border-aether shadow-[0_0_18px_rgb(var(--accent))]'
                : 'border-aether/70 shadow-[0_0_10px_rgb(var(--accent)/0.35)] hover:border-aether',
            )}
          />
        </SliderPrimitive.Root>
      </div>
    );
  },
);
Slider.displayName = 'Slider';
