import type { Config } from 'tailwindcss';

/**
 * AETHERIA — Design System
 * Theme: Cyber-Minimalism meets Spatial Luxury. Dark by default.
 *
 * Accent colours are driven by CSS variables (see globals.css) so the
 * "Cyberpunk Neon" quest reward can re-skin the entire site — and the 3D
 * scene — from a single source of truth.
 */
const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        void: {
          DEFAULT: 'rgb(var(--bg) / <alpha-value>)',
          900: '#050508',
          800: '#08080d',
          700: '#0c0c14',
          600: '#12121c',
          500: '#1a1a26',
        },
        aether: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          soft: 'rgb(var(--accent) / 0.55)',
          faint: 'rgb(var(--accent) / 0.14)',
        },
        nebula: {
          DEFAULT: 'rgb(var(--accent-2) / <alpha-value>)',
          soft: 'rgb(var(--accent-2) / 0.55)',
          faint: 'rgb(var(--accent-2) / 0.14)',
        },
        signal: {
          ember: '#FF3D6E',
          gold: '#FFC46B',
          lime: '#9BFF3D',
        },
        glass: {
          DEFAULT: 'rgba(255,255,255,0.03)',
          md: 'rgba(255,255,255,0.055)',
          lg: 'rgba(255,255,255,0.09)',
          border: 'rgba(255,255,255,0.1)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Syne', 'ui-sans-serif', 'sans-serif'],
        sans: ['var(--font-body)', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem', letterSpacing: '0.16em' }],
        hud: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.22em' }],
      },
      letterSpacing: {
        hyper: '0.42em',
        mega: '0.62em',
      },
      borderRadius: {
        '4xl': '2rem',
        shard: '0.75rem 0.75rem 0.75rem 0.125rem',
      },
      boxShadow: {
        glow: '0 0 24px -4px rgb(var(--accent) / 0.55)',
        'glow-lg': '0 0 70px -8px rgb(var(--accent) / 0.5), 0 0 140px -40px rgb(var(--accent-2) / 0.6)',
        'glow-purple': '0 0 40px -6px rgb(var(--accent-2) / 0.6)',
        inset: 'inset 0 1px 0 0 rgba(255,255,255,0.06)',
        panel: '0 24px 80px -32px rgba(0,0,0,0.9), inset 0 1px 0 0 rgba(255,255,255,0.05)',
      },
      backgroundImage: {
        'grid-faint':
          'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
        'scanlines':
          'repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 3px)',
        'accent-sweep':
          'linear-gradient(100deg, transparent 0%, rgb(var(--accent) / 0.16) 45%, rgb(var(--accent-2) / 0.2) 55%, transparent 100%)',
      },
      backgroundSize: {
        grid: '64px 64px',
      },
      backdropBlur: {
        hud: '14px',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out-quint': 'cubic-bezier(0.83, 0, 0.17, 1)',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translate3d(0,0,0)' },
          '50%': { transform: 'translate3d(0,-10px,0)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.85)', opacity: '0.9' },
          '100%': { transform: 'scale(2.1)', opacity: '0' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(400%)' },
        },
        glitch: {
          '0%,100%': { clipPath: 'inset(0 0 0 0)', transform: 'translate(0)' },
          '20%': { clipPath: 'inset(18% 0 62% 0)', transform: 'translate(-2px,1px)' },
          '40%': { clipPath: 'inset(64% 0 12% 0)', transform: 'translate(2px,-1px)' },
          '60%': { clipPath: 'inset(38% 0 44% 0)', transform: 'translate(-1px,0)' },
          '80%': { clipPath: 'inset(6% 0 88% 0)', transform: 'translate(1px,1px)' },
        },
        'flicker-in': {
          '0%': { opacity: '0' },
          '10%': { opacity: '0.6' },
          '14%': { opacity: '0.1' },
          '22%': { opacity: '0.9' },
          '28%': { opacity: '0.35' },
          '40%': { opacity: '1' },
          '100%': { opacity: '1' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'rise-in': {
          '0%': { opacity: '0', transform: 'translateY(22px)', filter: 'blur(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)', filter: 'blur(0)' },
        },
      },
      animation: {
        float: 'float 7s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2.4s cubic-bezier(0.16,1,0.3,1) infinite',
        scan: 'scan 5.5s linear infinite',
        glitch: 'glitch 2.8s steps(1) infinite',
        'flicker-in': 'flicker-in 1.1s linear both',
        marquee: 'marquee 38s linear infinite',
        'spin-slow': 'spin-slow 26s linear infinite',
        shimmer: 'shimmer 2.6s linear infinite',
        'rise-in': 'rise-in 0.9s cubic-bezier(0.16,1,0.3,1) both',
      },
    },
  },
  plugins: [],
};

export default config;
