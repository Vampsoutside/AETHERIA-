'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/40 p-1 backdrop-blur-md',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'relative flex items-center gap-2 rounded px-3 py-1.5 font-mono text-2xs uppercase tracking-[0.18em] text-slate-400',
      'transition-all duration-300 ease-out-expo hover:text-white',
      'data-[state=active]:bg-aether/12 data-[state=active]:text-aether data-[state=active]:shadow-[inset_0_0_0_1px_rgb(var(--accent)/0.35)]',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-aether/70',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('mt-5 focus-visible:outline-none data-[state=active]:animate-rise-in', className)}
    {...props}
  />
));
TabsContent.displayName = 'TabsContent';
