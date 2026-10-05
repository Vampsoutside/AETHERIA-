import type { Metadata, Viewport } from 'next';
import { Syne, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

/**
 * Fonts are wired to the `--font-display` / `--font-body` / `--font-mono`
 * custom properties that tailwind.config.ts already reads, so the HUD and the
 * WebGL layer share one type system.
 */
const display = Syne({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const body = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'AETHERIA — Interactive 3D Discovery Lab',
  description:
    'A spatial journey through a floating archipelago of emerging technology. Awaken the core, recover the artifacts, decode the citadel.',
};

export const viewport: Viewport = {
  themeColor: '#050508',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-palette="aether" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}