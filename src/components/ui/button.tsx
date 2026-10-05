'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'group relative inline-flex items-center justify-center gap-2 font-mono uppercase tracking-[0.18em] transition-all duration-300 ease-out-expo select-none no-tap-highlight disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-aether/80 active:scale-[0.975]',
  {
    variants: {
      variant: {
        primary:
          'clip-shard bg-aether/12 text-white border border-aether/45 hover:bg-aether/22 hover:border-aether hover:shadow-glow hover:text-white',
        ghost: 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent',
        outline:
          'clip-shard border border-white/15 bg-white/[0.02] text-slate-200 hover:border-aether/60 hover:text-white hover:bg-aether/[0.06]',
        nebula:
          'clip-shard border border-nebula/50 bg-nebula/12 text-white hover:bg-nebula/24 hover:shadow-glow-purple',
        solid: 'clip-shard bg-white text-black hover:bg-aether hover:text-black font-semibold',
        danger: 'clip-shard border border-signal-ember/50 bg-signal-ember/10 text-signal-ember hover:bg-signal-ember/20',
      },
      size: {
        xs: 'h-7 px-2.5 text-2xs',
        sm: 'h-9 px-3.5 text-[0.65rem]',
        md: 'h-11 px-5 text-[0.7rem]',
        lg: 'h-14 px-8 text-xs',
        icon: 'h-9 w-9',
        'icon-sm': 'h-7 w-7',
      },
    },
    defaultVariants: { variant: 'outline', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render a sweeping highlight line across the button on hover */
  sheen?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, sheen = true, children, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), sheen && 'sheen', className)} {...props}>
      {children}
    </button>
  ),
);
Button.displayName = 'Button';

/** Anchor variant that keeps identical styling (used by the nav rail). */
export const ButtonLink = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & VariantProps<typeof buttonVariants>
>(({ className, variant, size, children, ...props }, ref) => (
  <a ref={ref} className={cn(buttonVariants({ variant, size }), 'sheen', className)} {...props}>
    {children}
  </a>
));
ButtonLink.displayName = 'ButtonLink';

export { buttonVariants };
