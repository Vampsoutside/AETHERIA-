'use client';

/**
 * The Crucible — interactive shader sandbox (spec §4, Page 2).
 */
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

import { NavRail } from '@/components/hud/NavRail';
import { ToastStack } from '@/components/hud/ToastStack';
import { CelebrationOverlay } from '@/components/hud/CelebrationOverlay';
import { MagneticCursor } from '@/components/hud/MagneticCursor';
import { Slider } from '@/components/ui/slider';
import { useLenisScroll } from '@/hooks/useLenisScroll';
import { usePaletteSync } from '@/hooks/usePaletteSync';
import { useReveals } from '@/hooks/useReveals';
import { useFpsBridge, useTierDetection } from '@/hooks/useTierDetection';
import { useUIStore } from '@/lib/store/useUIStore';
import { useQuestStore } from '@/lib/store/useQuestStore';
import { audio, isResonant, RESONANCE_HZ, RESONANCE_TOLERANCE } from '@/lib/audio/engine';
import { completeQuest } from '@/lib/questEngine';
import { ROUTES } from '@/lib/tokens';

/** WebGL is client-only and heavy — never ship it in the SSR pass. */
const CrucibleScene = dynamic(() => import('@/components/three/CrucibleScene').then((m) => m.CrucibleScene), {
  ssr: false,
  loading: () => <div className="fixed inset-0 -z-10 bg-void-900" />,
});

const CHAPTERS = 3;

/* Frequency slider range maps directly to Hz so the shader and the audio
   resonance check share the same value space. 432 Hz sits inside it. */
const FREQ_MIN = 100;
const FREQ_MAX = 900;

export default function PlaygroundPage() {
  useTierDetection();
  usePaletteSync();
  useReveals();
  useFpsBridge();
  useLenisScroll(CHAPTERS);

  const setMounted = useUIStore((s) => s.setMounted);
  const booted = useUIStore((s) => s.booted);
  const markVisited = useQuestStore((s) => s.markVisited);
  const questDone = useQuestStore((s) => s.quests.find((q) => q.id === 'quantum-calibration')?.isCompleted ?? false);

  // Defaults start resonant-adjacent so the lattice shows life immediately.
  const [frequency, setFrequency] = useState(400);
  const [distortion, setDistortion] = useState(0.6);
  const [emission, setEmission] = useState(1.0);
  const [waveSpeed, setWaveSpeed] = useState(1.0);

  const resonant = isResonant(frequency);
  const resonance = resonant ? 1 : 0;

  useEffect(() => {
    setMounted(true);
    markVisited('/playground');
    // Arm the audio engine on the first gesture anywhere in the realm.
    audio.arm((enabled) => useUIStore.getState().setAudioEnabled(enabled));
    audio.init();
    return () => setMounted(false);
  }, [setMounted, markVisited]);

  // Q-02: complete when the frequency slider locks to 432 Hz
  useEffect(() => {
    if (resonant && !questDone) {
      completeQuest('quantum-calibration');
    }
  }, [resonant, questDone]);

  return (
    <>
      {/* WebGL backdrop — fixed, content scrolls above it */}
      <div className="pointer-events-auto fixed inset-0 -z-10">
        <CrucibleScene
          frequency={frequency}
          distortion={distortion}
          emission={emission}
          waveSpeed={waveSpeed}
          resonance={resonance}
          mode={questDone ? 1 : 0}
        />
      </div>

      {/* Boot veil — lifts once the scene has painted */}
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
        <Controls
          frequency={frequency}
          setFrequency={setFrequency}
          distortion={distortion}
          setDistortion={setDistortion}
          emission={emission}
          setEmission={setEmission}
          waveSpeed={waveSpeed}
          setWaveSpeed={setWaveSpeed}
          resonant={resonant}
          questDone={questDone}
        />
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
          02 · The Crucible
        </p>

        <h1
          className="mt-6 text-[clamp(2.6rem,9vw,6.2rem)] leading-[0.94] text-white"
          data-reveal
          data-reveal-anim="scale"
        >
          THE CRUCIBLE
        </h1>

        <p
          className="mx-auto mt-6 max-w-xl text-balance text-base leading-relaxed text-slate-400"
          data-reveal
        >
          A shader manipulator lattice drifted out of resonance during the fracture. Adjust the frequency and restore the
          old grid's song.
        </p>

        <p className="mt-14 font-mono text-2xs uppercase tracking-[0.3em] text-slate-600" data-reveal>
          Scroll to travel
        </p>
      </div>
    </section>
  );
}

interface ControlsProps {
  frequency: number;
  setFrequency: (v: number) => void;
  distortion: number;
  setDistortion: (v: number) => void;
  emission: number;
  setEmission: (v: number) => void;
  waveSpeed: number;
  setWaveSpeed: (v: number) => void;
  resonant: boolean;
  questDone: boolean;
}

function Controls({
  frequency,
  setFrequency,
  distortion,
  setDistortion,
  emission,
  setEmission,
  waveSpeed,
  setWaveSpeed,
  resonant,
  questDone,
}: ControlsProps) {
  return (
    <section className="relative mx-auto max-w-3xl px-5 pb-24" data-reveal>
      <div className="glass-strong hud-frame rounded-2xl p-6 md:p-10">
        <div className="flex items-center justify-between gap-4">
          <p className="font-mono text-2xs uppercase tracking-[0.34em] text-aether/60">Shader Instruments</p>
          <p
            className={`readout font-mono text-2xs tabular-nums ${resonant ? 'text-aether text-glow' : 'text-slate-500'}`}
          >
            {resonant ? '◉ RESONANCE LOCKED' : '○ SCANNING'}
          </p>
        </div>

        <div className="mt-8 space-y-7">
          <Slider
            label="Frequency"
            unit="Hz"
            value={[frequency]}
            min={FREQ_MIN}
            max={FREQ_MAX}
            step={1}
            resonanceAt={RESONANCE_HZ}
            resonanceTolerance={RESONANCE_TOLERANCE}
            format={(v) => `${v.toFixed(0)}`}
            onChange={([v]) => setFrequency(v)}
          />
          <Slider
            label="Distortion"
            value={[distortion]}
            min={0}
            max={2}
            step={0.01}
            format={(v) => v.toFixed(2)}
            onChange={([v]) => setDistortion(v)}
          />
          <Slider
            label="Emission"
            value={[emission]}
            min={0}
            max={2}
            step={0.01}
            format={(v) => v.toFixed(2)}
            onChange={([v]) => setEmission(v)}
          />
          <Slider
            label="Wave Speed"
            value={[waveSpeed]}
            min={0}
            max={3}
            step={0.01}
            format={(v) => v.toFixed(2)}
            onChange={([v]) => setWaveSpeed(v)}
          />
        </div>

        {resonant && !questDone && (
          <p className="mt-6 font-mono text-2xs text-aether animate-pulse">
            The lattice responds — the emission ring flares at {RESONANCE_HZ} Hz.
          </p>
        )}
        {questDone && (
          <p className="mt-6 border-t border-white/5 pt-6 font-mono text-2xs uppercase tracking-[0.2em] text-aether/70">
            ◉ Q-02 complete — the lattice sings at {RESONANCE_HZ} Hz
          </p>
        )}
      </div>
    </section>
  );
}

function Chapters() {
  const copy = [
    {
      n: 'I',
      t: 'The Fracture',
      b:
        'A shader manipulator lattice drifted out of resonance during the fracture. Its interference pattern collapsed into a flat grid — technically functional, aesthetically dead. The emission ring around the panel is the tell: it flares when you cross the resonance window.',
    },
    {
      n: 'II',
      t: 'The Tuning',
      b:
        'Four instruments control the lattice: Frequency, Distortion, Emission, and Wave Speed. The frequency slider is the one that matters. Between 100 and 900 Hz lies the resonance window — the old grid tuned to 432.',
    },
    {
      n: 'III',
      t: 'The Wheel',
      b:
        'Below the lattice, a ring of twelve nodes waits. Each one plays a spatial chord through the audio engine — a minor pentatonic ladder, so every combination sings. Click a node to hear it.',
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
          The lattice remembers its resonance. Clearing site data resets the archipelago.
        </p>
      </div>
    </footer>
  );
}
