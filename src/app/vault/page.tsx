'use client';

/**
 * The Archive — artifact carousel with 3D inspector (spec §4, Page 3).
 */
import dynamic from 'next/dynamic';
import { useEffect } from 'react';

import { NavRail } from '@/components/hud/NavRail';
import { ToastStack } from '@/components/hud/ToastStack';
import { CelebrationOverlay } from '@/components/hud/CelebrationOverlay';
import { MagneticCursor } from '@/components/hud/MagneticCursor';
import { Panel } from '@/components/ui/panel';
import { useLenisScroll } from '@/hooks/useLenisScroll';
import { usePaletteSync } from '@/hooks/usePaletteSync';
import { useReveals } from '@/hooks/useReveals';
import { useFpsBridge, useTierDetection } from '@/hooks/useTierDetection';
import { useUIStore } from '@/lib/store/useUIStore';
import { useQuestStore } from '@/lib/store/useQuestStore';
import { audio } from '@/lib/audio/engine';
import { isQuestDone } from '@/lib/questEngine';
import { ARTIFACTS, ARTIFACT_MAP, ARTIFACT_IDS } from '@/lib/content/artifacts';
import { ROUTES } from '@/lib/tokens';

/** WebGL is client-only and heavy — never ship it in the SSR pass. */
const VaultScene = dynamic(() => import('@/components/three/VaultScene').then((m) => m.VaultScene), {
  ssr: false,
  loading: () => <div className="fixed inset-0 -z-10 bg-void-900" />,
});

const CHAPTERS = 3;

export default function VaultPage() {
  useTierDetection();
  usePaletteSync();
  useReveals();
  useFpsBridge();
  useLenisScroll(CHAPTERS);

  const setMounted = useUIStore((s) => s.setMounted);
  const booted = useUIStore((s) => s.booted);
  const markVisited = useQuestStore((s) => s.markVisited);

  useEffect(() => {
    setMounted(true);
    markVisited('/vault');
    audio.arm((enabled) => useUIStore.getState().setAudioEnabled(enabled));
    audio.init();
    return () => setMounted(false);
  }, [setMounted, markVisited]);

  return (
    <>
      {/* WebGL backdrop — fixed, content scrolls above it */}
      <div className="pointer-events-auto fixed inset-0 -z-10">
        <VaultScene />
      </div>

      {/* Boot veil */}
      <div
        className={
          booted
            ? 'pointer-events-none fixed inset-0 z-[70] opacity-0 transition-opacity duration-1000'
            : 'fixed inset-0 z-[70]'
        }
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
          03 · Archive of Artifacts
        </p>

        <h1
          className="mt-6 text-[clamp(2.6rem,9vw,6.2rem)] leading-[0.94] text-white"
          data-reveal
          data-reveal-anim="scale"
        >
          THE ARCHIVE
        </h1>

        <p
          className="mx-auto mt-6 max-w-xl text-balance text-base leading-relaxed text-slate-400"
          data-reveal
        >
          Six artifacts recovered from the fracture. Each holds a sealed developer commentary — the seal breaks
          only for an Explorer who truly looks at the object. Rotate any artifact a full 360°.
        </p>

        <p className="mt-14 font-mono text-2xs uppercase tracking-[0.3em] text-slate-600" data-reveal>
          Scroll to travel
        </p>
      </div>
    </section>
  );
}

function ArtifactCards() {
  const selectedId = useUIStore((s) => s.activeArtifactId);
  const setActiveArtifact = useUIStore((s) => s.setActiveArtifact);
  const activePalette = useQuestStore((s) => s.activePalette);

  const artifact = selectedId ? ARTIFACT_MAP[selectedId] : null;

  if (!artifact) return null;

  const p = (typeof window !== 'undefined' && document.documentElement)
    ? { accent: artifact.accent, accent2: artifact.accent2 }
    : { accent: '#00F0FF', accent2: '#7000FF' };

  return (
    <section className="relative mx-auto max-w-4xl px-5 pb-24" data-reveal>
      <div
        className="glass-strong hud-frame rounded-2xl p-6 md:p-10"
        style={{ borderColor: `color-mix(in srgb, ${artifact.accent} 40%, transparent)` }}
      >
        {/* Header with close */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="font-mono text-2xs uppercase tracking-[0.22em] text-slate-500">{artifact.codename}</p>
            <h2 className="mt-1 text-2xl md:text-3xl font-display">{artifact.name}</h2>
            <p className="mt-2 font-mono text-2xs text-slate-500">
              {artifact.category} · {artifact.year} · {artifact.studio}
            </p>
          </div>
          <button
            onClick={() => setActiveArtifact(null)}
            className="flex h-8 w-8 items-center justify-center rounded border border-white/10 text-slate-400 hover:text-white hover:border-aether/50 transition-colors"
            aria-label="Close inspector"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Summary */}
        <p className="text-sm leading-relaxed text-slate-400 mb-6">{artifact.summary}</p>

        {/* Story */}
        <div className="space-y-3 mb-6">
          {artifact.story.map((paragraph, i) => (
            <p key={i} className="text-sm leading-relaxed text-slate-400 border-l-2 pl-4" style={{ borderColor: artifact.accent }}>
              {paragraph}
            </p>
          ))}
        </div>

        {/* Specs grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {artifact.specs.map((spec, i) => (
            <div key={i} className="glass-strong rounded-lg p-3" style={{ borderColor: `color-mix(in srgb, ${artifact.accent} 20%, transparent)` }}>
              <p className="font-mono text-2xs uppercase tracking-[0.15em] text-slate-500">{spec.label}</p>
              <p className="mt-1 text-sm text-white/90">{spec.value}</p>
            </div>
          ))}
        </div>

        {/* Stack badges */}
        <div className="flex flex-wrap gap-2 mb-6">
          {artifact.stack.map((tech, i) => (
            <span
              key={i}
              className="font-mono text-2xs px-2 py-1 rounded border"
              style={{
                borderColor: `color-mix(in srgb, ${artifact.accent} 40%, transparent)`,
                color: artifact.accent,
              }}
            >
              {tech}
            </span>
          ))}
        </div>

        {/* Seal / Commentary */}
        <div
          className="relative rounded-lg p-6"
          style={{
            background: `color-mix(in srgb, ${artifact.accent} 8%, transparent)`,
            borderColor: `color-mix(in srgb, ${artifact.accent} 30%, transparent)`,
          }}
        >
          <div className="flex items-center justify-between gap-4 mb-4">
            <p className="font-mono text-2xs uppercase tracking-[0.22em]" style={{ color: artifact.accent }}>
              {isQuestDone('artifact-inspector') ? 'SEAL BROKEN' : artifact.seal}
            </p>
            {isQuestDone('artifact-inspector') && (
              <span className="font-mono text-2xs" style={{ color: artifact.accent2 }}>
                ◉ DEVELOPER COMMENTARY UNLOCKED
              </span>
            )}
          </div>

          {isQuestDone('artifact-inspector') ? (
            <div className="space-y-3">
              <p className="font-mono text-2xs text-slate-500">{artifact.commentary.speaker} — {artifact.commentary.role}</p>
              <p className="text-sm leading-relaxed text-slate-400 italic">"{artifact.commentary.transcript}"</p>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-slate-500">
              Click the artifact in the ring, then drag to rotate it a full 360°. The seal tracks your accumulated rotation.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function Chapters() {
  const copy = [
    {
      n: 'I',
      t: 'The Collection',
      b:
        'The fracture scattered six artifacts across the archipelago. The Archive has gathered them into a single ring — each one a sealed record of a project that survived the event. The seal is not a lock; it is a test of attention.',
    },
    {
      n: 'II',
      t: 'The Inspection',
      b:
        'Click an artifact in the ring to open the inspector. Drag to rotate. The seal tracks your accumulated rotation across the session — there is no timeout, no reset, only the total. One full revolution breaks the seal and recovers the developer commentary.',
    },
    {
      n: 'III',
      t: 'The Commentary',
      b:
        'Every artifact carries a voice from the studio that built it. The transcripts are not marketing copy — they are the things the teams said to each other when the cameras were off. The Archive preserves them exactly as spoken.',
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

      {/* Inspector panel appears when an artifact is selected */}
      <ArtifactCards />
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
          {ARTIFACTS.length} artifacts in the Archive. Clearing site data resets the collection.
        </p>
      </div>
    </footer>
  );
}