import { cn } from '@/lib/utils';

/**
 * Inline SVG icon set. Hand-rolled rather than pulled from a library so the
 * glyphs match the HUD's faceted language — and so nothing has to be fetched.
 */

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export const CoreIcon = ({ size = 16, className, ...p }: IconProps) => (
  <svg {...base(size ?? 16)} className={cn(className)} {...p}>
    <path d="M12 2.6 20.4 7.3v9.4L12 21.4 3.6 16.7V7.3z" />
    <path d="M12 7.4 16.6 10v5.2L12 17.8 7.4 15.2V10z" opacity=".55" />
    <circle cx="12" cy="12.4" r="1.7" fill="currentColor" stroke="none" />
  </svg>
);

export const QuestIcon = ({ size = 16, className, ...p }: IconProps) => (
  <svg {...base(size ?? 16)} className={cn(className)} {...p}>
    <circle cx="12" cy="12" r="8.4" />
    <circle cx="12" cy="12" r="4" opacity=".6" />
    <path d="M12 1.8v3.4M12 18.8v3.4M1.8 12h3.4M18.8 12h3.4" />
    <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

export const SlidersIcon = ({ size = 16, className, ...p }: IconProps) => (
  <svg {...base(size ?? 16)} className={cn(className)} {...p}>
    <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h13M20 18h0" />
    <circle cx="15" cy="6" r="2" />
    <circle cx="9" cy="12" r="2" />
    <circle cx="19" cy="18" r="2" />
  </svg>
);

export const SoundOnIcon = ({ size = 16, className, ...p }: IconProps) => (
  <svg {...base(size ?? 16)} className={cn(className)} {...p}>
    <path d="M4 9.5h3.2L12 5.4v13.2L7.2 14.5H4z" />
    <path d="M15.6 9.2a4 4 0 0 1 0 5.6M18.2 6.6a7.6 7.6 0 0 1 0 10.8" opacity=".8" />
  </svg>
);

export const SoundOffIcon = ({ size = 16, className, ...p }: IconProps) => (
  <svg {...base(size ?? 16)} className={cn(className)} {...p}>
    <path d="M4 9.5h3.2L12 5.4v13.2L7.2 14.5H4z" />
    <path d="m16.2 9.8 4.4 4.4M20.6 9.8l-4.4 4.4" />
  </svg>
);

export const CloseIcon = ({ size = 16, className, ...p }: IconProps) => (
  <svg {...base(size ?? 16)} className={cn(className)} {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const ArrowIcon = ({ size = 16, className, ...p }: IconProps) => (
  <svg {...base(size ?? 16)} className={cn(className)} {...p}>
    <path d="M4.5 12h15M13.4 6l6 6-6 6" />
  </svg>
);

export const ChevronIcon = ({ size = 16, className, ...p }: IconProps) => (
  <svg {...base(size ?? 16)} className={cn(className)} {...p}>
    <path d="m8.5 5 7 7-7 7" />
  </svg>
);

export const TerminalIcon = ({ size = 16, className, ...p }: IconProps) => (
  <svg {...base(size ?? 16)} className={cn(className)} {...p}>
    <rect x="2.6" y="4.2" width="18.8" height="15.6" rx="1.6" />
    <path d="m6.8 10 2.6 2.4-2.6 2.4M12.4 15.2h4.4" />
  </svg>
);

export const LockIcon = ({ size = 16, className, ...p }: IconProps) => (
  <svg {...base(size ?? 16)} className={cn(className)} {...p}>
    <rect x="4.6" y="10.4" width="14.8" height="9.4" rx="1.5" />
    <path d="M8.2 10.4V7.8a3.8 3.8 0 0 1 7.6 0v2.6" />
    <circle cx="12" cy="15.1" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const UnlockIcon = ({ size = 16, className, ...p }: IconProps) => (
  <svg {...base(size ?? 16)} className={cn(className)} {...p}>
    <rect x="4.6" y="10.4" width="14.8" height="9.4" rx="1.5" />
    <path d="M8.2 10.4V7.8a3.8 3.8 0 0 1 7.3-1.4" />
    <circle cx="12" cy="15.1" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const CubeIcon = ({ size = 16, className, ...p }: IconProps) => (
  <svg {...base(size ?? 16)} className={cn(className)} {...p}>
    <path d="M12 2.8 21 7.6v8.8L12 21.2 3 16.4V7.6z" />
    <path d="M3 7.6 12 12.4l9-4.8M12 12.4v8.8" opacity=".6" />
  </svg>
);

export const ScanIcon = ({ size = 16, className, ...p }: IconProps) => (
  <svg {...base(size ?? 16)} className={cn(className)} {...p}>
    <path d="M3.4 8.4V5.2a1.8 1.8 0 0 1 1.8-1.8h3.2M15.6 3.4h3.2a1.8 1.8 0 0 1 1.8 1.8v3.2M20.6 15.6v3.2a1.8 1.8 0 0 1-1.8 1.8h-3.2M8.4 20.6H5.2a1.8 1.8 0 0 1-1.8-1.8v-3.2" />
    <path d="M3.8 12h16.4" opacity=".7" />
  </svg>
);

export const GridIcon = ({ size = 16, className, ...p }: IconProps) => (
  <svg {...base(size ?? 16)} className={cn(className)} {...p}>
    <rect x="3.4" y="3.4" width="7" height="7" rx="1" />
    <rect x="13.6" y="3.4" width="7" height="7" rx="1" />
    <rect x="3.4" y="13.6" width="7" height="7" rx="1" />
    <rect x="13.6" y="13.6" width="7" height="7" rx="1" />
  </svg>
);

export const MenuIcon = ({ size = 16, className, ...p }: IconProps) => (
  <svg {...base(size ?? 16)} className={cn(className)} {...p}>
    <path d="M3.6 7h16.8M3.6 12h16.8M3.6 17h10.4" />
  </svg>
);

export const DragIcon = ({ size = 16, className, ...p }: IconProps) => (
  <svg {...base(size ?? 16)} className={cn(className)} {...p}>
    <path d="M12 3.4v17.2M3.4 12h17.2" opacity=".45" />
    <path d="m12 3.4-2.4 2.6M12 3.4l2.4 2.6M12 20.6l-2.4-2.6M12 20.6l2.4-2.6M3.4 12l2.6-2.4M3.4 12l2.6 2.4M20.6 12l-2.6-2.4M20.6 12l-2.6 2.4" />
  </svg>
);

export const BoltIcon = ({ size = 16, className, ...p }: IconProps) => (
  <svg {...base(size ?? 16)} className={cn(className)} {...p}>
    <path d="M13.4 2.6 4.8 13.4h5.6L10.2 21.4l8.8-11h-5.8z" />
  </svg>
);

export const CheckIcon = ({ size = 16, className, ...p }: IconProps) => (
  <svg {...base(size ?? 16)} className={cn(className)} {...p}>
    <path d="m4.8 12.6 4.6 4.6L19.4 7.2" />
  </svg>
);

export const AetheriaMark = ({ size = 28, className, ...p }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={cn(className)} {...p}>
    <path d="M16 2.2 28.6 9.4v13.2L16 29.8 3.4 22.6V9.4z" stroke="currentColor" strokeWidth="1.1" opacity=".5" />
    <path d="M16 7.6 23.8 12v8.2L16 24.6 8.2 20.2V12z" stroke="currentColor" strokeWidth="1.3" />
    <path d="M16 12.6 19.6 14.7v4.2L16 21l-3.6-2.1v-4.2z" fill="currentColor" opacity=".85" />
    <path d="M16 2.2v5.4M28.6 9.4 23.8 12M28.6 22.6 23.8 20.2M16 29.8v-5.2M3.4 22.6 8.2 20.2M3.4 9.4 8.2 12" stroke="currentColor" strokeWidth=".7" opacity=".4" />
  </svg>
);
