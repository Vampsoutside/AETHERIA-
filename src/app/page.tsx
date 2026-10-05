'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect } from 'react';

import { NavRail } from '@/components/hud/NavRail';
import { ToastStack } from '@/components/hud/ToastStack';
import { CelebrationOverlay } from '@/components/hud/CelebrationOverlay';
import { MagneticCursor } from '@/components/hud/MagneticCursor';
import { useLenisScroll } from '@/hooks/useLenisScroll';
import { usePaletteSync } from '@/hooks/usePaletteSync';
import { useReveals } from '@/hooks/useReveals';
import { useFpsBridge, useTierDetection } from '@/hooks/useTierDetection';
import { useUIStore } from '@/lib/store/useUIStore';
import { useQuestStore } from '@/lib/store/useQuestStore';
import { audio } from '@/lib/audio/engine';
import { ROUTES } from '@/lib/tokens';

/** WebGL is client-only and heavy — never ship it in the SSR pass. */
const GateScene = dynamic(() => import('@/components/three/GateScene').then((m) => m.GateScene), {
  ssr: false,
  loading: () => <div className="fixed inset-0 -z-10 bg-void-900" />,
});

const CHAPTERS = 4;

export default function GatePage() {
  useTierDetection();
  usePaletteSync();
  useReveals();
  useFpsBridge();
  useLenisScroll(CHAPTERS);

  const setMounted = useUIStore((s) => s.setMounted);
  const setAudioReady = useUIStore((s) => s.setAudioReady);
  const booted = useUIStore((s) => s.booted);
  const markVisited = useQuestStore((s) => s.markVisited);

  useEffect(() => {
    setMounted(true);
    markVisited('/');
    // Arm the audio engine on the first gesture anywhere in the realm.
    audio.arm((enabled) => useUIStore.getState().setAudioEnabled(enabled));
    audio.init();
    return () => setMounted(false);
  }, [setMounted, markVisited, setAudioReady]);

  return (
    <>
      {/* WebGL backdrop — fixed, content scrolls above it */}
      <div className="pointer-events-auto fixed inset-0 -z-10">
        <GateScene />
      </div>

      {/* Boot veil — lifts once the scene has painted */}
      <div
        className={booted ? 'pointer-events-none fixed inset-0 z-[70] opacity-0 transition-opacity duration-1000' : 'fixed inset-0 z-[70]'}
        style={{ background: 'rgb(var(--bg))' }}
        aria-hidden
      />

      <MagneticCursor />
      <NavRail />
      <ToastStack />
      <CelebrationOverlay />

      <main className="relative z-10">
        <Hero />
        <Chapters />
        <Footer />
      </main>
    </>
  );
}

function Hero() {
  return (
    <section className="relative flex min-h-[100svh] items-center justify-center px-5">
      <div className="mx-auto max-w-3xl text-center">
        <p className="font-mono text-2xs uppercase tracking-[0.42em] text-aether/70" data-reveal>
          01 · Gate of Origin
        </p>

        <h1
          className="mt-6 text-[clamp(2.6rem,9vw,6.2rem)] leading-[0.94] text-white"
          data-reveal
          data-reveal-anim="scale"
        >
          AETHERIA
        </h1>

        <p
          className="mx-auto mt-6 max-w-xl text-balance text-base leading-relaxed text-slate-400"
          data-reveal
        >
          A floating archipelago of emerging technology. Awaken the core, recover what was lost,
          decode the citadel.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3" data-reveal>
          <Link
            href="/playground"
            data-cursor="enter"
            data-cursor-label="Enter the Crucible"
            onMouseEnter={() => audio.play('hover')}
            className="hud-frame glass-strong rounded-lg px-6 py-3 font-mono text-2xs uppercase tracking-[0.22em] text-aether transition-colors hover:bg-aether/10"
          >
            Begin the descent
          </Link>
        </div>

        <p className="mt-14 font-mono text-2xs uppercase tracking-[0.3em] text-slate-600" data-reveal>
          Scroll to travel
        </p>
      </div>
    </section>
  );
}

function Chapters() {
  const copy = [
    {
      n: 'I',
      t: 'Arrival',
      b: 'The gate stands open over an obsidian void. Below it, the archipelago holds its breath — four regions suspended in one continuous sky, waiting to be flown.',
    },
    {
      n: 'II',
      t: 'The Core',
      b: 'Something still burns at the centre of the gate. It is not a light. It is a frequency, and the monolith is tuned to it.',
    },
    {
      n: 'III',
      t: 'The Search',
      b: 'One facet of the monolith answers out of phase with the rest. Warm to the pointer, patient, waiting to be noticed.',
    },
    {
      n: 'IV',
      t: 'The Descent',
      b: 'Beyond the gate the archipelago opens: the Crucible to the east, the Archive to the west, the Citadel highest of all.',
    },
  ];

  return (
    <div className="relative mx-auto max-w-3xl px-5 pb-32">
      {copy.map((c, i) => (
        <section key={c.n} className="flex min-h-[85svh] items-center py-20" data-reveal>
          <div className="glass-strong hud-frame w-full rounded-2xl p-8 md:p-12">
            <p className="font-mono text-2xs uppercase tracking-[0.34em] text-aether/60">{c.n}</p>
            <h2 className="mt-4 text-3xl md:text-4xl">{c.t}</h2>
            <p className="mt-5 text-sm leading-relaxed text-slate-400 md:text-base">{c.b}</p>
            <p className="mt-8 font-mono text-2xs tabular-nums text-slate-600">
              CHAPTER {String(i + 1).padStart(2, '0')} / {String(CHAPTERS).padStart(2, '0')}
            </p>
          </div>
        </section>
      ))}
    </div>
  );
}

function Footer() {
  return (
    <footer className="relative border-t border-white/5 px-5 py-14">
      <div className="mx-auto max-w-3xl">
        <p className="font-mono text-2xs uppercase tracking-[0.3em] text-slate-600">
          {ROUTES.length} regions · recover 5 cores
        </p>
        <p className="mt-4 text-xs leading-relaxed text-slate-600">
          Every core you recover is persisted locally. Clearing site data resets the archipelago.
        </p>
      </div>
    </footer>
  );
}