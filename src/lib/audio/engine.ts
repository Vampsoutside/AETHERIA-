import { Howl, Howler } from 'howler';

/**
 * AETHERIA — Audio Engine
 * ---------------------------------------------------------------
 * Howler.js drives the sample bank (ambient realm drone, UI transients,
 * quest stingers) while a small WebAudio poly-synth — sharing Howler's single
 * AudioContext — drives the Crucible's spatial synthesiser wheel. Using one
 * context matters on iOS: two contexts means two user-gesture unlocks and one
 * of them always loses.
 *
 * Every entry point is guarded so SSR and audio-less browsers are no-ops.
 */

export type Sfx = 'hover' | 'click' | 'core' | 'quest' | 'key' | 'glitch' | 'warp' | 'hum';

const BANK: Record<Sfx, { src: string; volume: number; rate?: [number, number] }> = {
  hover: { src: '/audio/ui-hover.wav', volume: 0.16, rate: [0.96, 1.08] },
  click: { src: '/audio/ui-click.wav', volume: 0.3 },
  core: { src: '/audio/core-discover.wav', volume: 0.62 },
  quest: { src: '/audio/quest-complete.wav', volume: 0.5 },
  key: { src: '/audio/terminal-key.wav', volume: 0.2, rate: [0.9, 1.15] },
  glitch: { src: '/audio/glitch.wav', volume: 0.34 },
  warp: { src: '/audio/warp.wav', volume: 0.3 },
  hum: { src: '/audio/core-hum.wav', volume: 0.22 },
};

const AMBIENT_SRC = '/audio/aether-drone.wav';

type PannerMode = 'stereo' | 'spatial';

class AetherAudioEngine {
  private bank = new Map<Sfx, Howl>();
  private ambient: Howl | null = null;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private synthBus: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private activeVoices = 0;
  private unlockBound = false;

  enabled = false;
  ready = false;
  volume = 0.75;

  /* ---------------- lifecycle ---------------- */

  /** Safe to call anywhere; only touches the DOM once. */
  init(): void {
    if (typeof window === 'undefined' || this.ready) return;
    try {
      Howler.autoUnlock = true;
      Howler.html5PoolSize = 4;
      // Howler's global volume setter is `volume()`; there is no `masterVolume`.
      Howler.volume(this.volume);
      this.ready = true;
    } catch {
      this.ready = false;
    }
  }

  /**
   * Browsers only permit an AudioContext after a gesture. We attach one-shot
   * listeners so the first click anywhere in the realm arms the engine.
   */
  arm(onStateChange?: (enabled: boolean) => void): void {
    if (typeof window === 'undefined' || this.unlockBound) return;
    this.unlockBound = true;
    const unlock = () => {
      this.enable();
      onStateChange?.(true);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
  }

  enable(): void {
    this.init();
    if (!this.ready || this.enabled) return;
    this.enabled = true;
    Howler.mute(false);
    Howler.volume(this.volume);
    this.startAmbient();
  }

  disable(): void {
    this.enabled = false;
    Howler.mute(true);
    this.ambient?.stop();
    this.stopAllVoices();
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    Howler.volume(this.volume);
  }

  private startAmbient(): void {
    if (!this.enabled) return;
    if (!this.ambient) {
      this.ambient = new Howl({
        src: [AMBIENT_SRC],
        loop: true,
        volume: 0.0,
        html5: true, // streamed, keeps the decoded-audio heap small
      });
      this.ambient.once('load', () => this.ambient?.play());
    }
    this.ambient.play();
    // Slow swell so the realm fades in rather than snapping on.
    this.ambient.fade(this.ambient.volume(), 0.34, 4200);
  }

  /** Duck the ambient bed — used during quest stingers and route warps. */
  duck(to = 0.1, ms = 320): void {
    if (!this.ambient) return;
    this.ambient.fade(this.ambient.volume(), to, ms);
    window.setTimeout(() => this.ambient && this.enabled && this.ambient.fade(this.ambient.volume(), 0.34, ms * 3), ms * 4);
  }

  /* ---------------- sample playback ---------------- */

  private getSound(name: Sfx): Howl | null {
    if (!this.enabled) return null;
    let howl = this.bank.get(name);
    if (!howl) {
      const cfg = BANK[name];
      howl = new Howl({ src: [cfg.src], volume: cfg.volume, rate: cfg.rate?.[0] ?? 1, pool: 6 });
      this.bank.set(name, howl);
    }
    if (howl.rate() === 1 && BANK[name].rate) {
      const [lo, hi] = BANK[name].rate!;
      howl.rate(lo + Math.random() * (hi - lo));
    }
    return howl;
  }

  play(name: Sfx, opts: { volume?: number; rate?: number; at?: [number, number, number] } = {}): number | null {
    const howl = this.getSound(name);
    if (!howl) return null;
    if (opts.volume !== undefined) howl.volume(opts.volume * BANK[name].volume);
    if (opts.rate !== undefined) howl.rate(opts.rate);
    const id = howl.play();
    // Spatialise through Howler's PannerNode when a world position is given.
    if (opts.at) {
      howl.pos(opts.at[0], opts.at[1], opts.at[2], id);
      howl.pannerAttr(
        { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: 6, maxDistance: 60, rolloffFactor: 1.4 },
        id,
      );
    }
    return id;
  }

  /** Move the listener — called from the camera rig so audio tracks the view. */
  setListener(pos: [number, number, number], forward: [number, number, number] = [0, 0, -1]): void {
    if (!this.enabled) return;
    try {
      Howler.pos(pos[0], pos[1], pos[2]);
      Howler.orientation(forward[0], forward[1], forward[2], 0, 1, 0);
    } catch {
      /* orientation unsupported in some browsers — ignore */
    }
  }

  /* ---------------- spatial poly-synth ---------------- */

  private ensureGraph(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      // Reuse Howler's context so iOS only has to unlock one.
      const shared = (Howler as unknown as { ctx?: AudioContext }).ctx;
      if (shared) {
        this.ctx = shared;
      } else {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        this.ctx = new Ctor();
      }
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;

      // Algorithmic plate reverb built from a decaying noise impulse — gives the
      // synth wheel its cathedral-in-a-void tail without shipping an IR file.
      this.reverb = this.ctx.createConvolver();
      this.reverb.buffer = this.buildImpulse(this.ctx, 3.4, 2.6);
      const wet = this.ctx.createGain();
      wet.gain.value = 0.42;
      const dry = this.ctx.createGain();
      dry.gain.value = 0.72;

      this.synthBus = this.ctx.createGain();
      this.synthBus.gain.value = 0.5;
      this.synthBus.connect(dry).connect(this.master);
      this.synthBus.connect(this.reverb).connect(wet).connect(this.master);
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private buildImpulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
    const rate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(rate * seconds));
    const buffer = ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (1 - t * 0.2);
      }
    }
    return buffer;
  }

  private stopAllVoices(): void {
    this.activeVoices = 0;
  }

  /**
   * Play a chord through a spatialised panner.
   * @param freqs   harmonic series in Hz
   * @param at      world position of the emitter
   * @param opts    attack/release/waveform/gain
   */
  playSpatialChord(
    freqs: number[],
    at: [number, number, number],
    opts: { attack?: number; release?: number; type?: OscillatorType; gain?: number; listener?: [number, number, number] } = {},
  ): void {
    if (!this.enabled) return;
    const ctx = this.ensureGraph();
    if (!ctx || !this.synthBus) return;
    if (this.activeVoices > 18) return; // hard polyphony ceiling

    const { attack = 0.06, release = 1.5, type = 'triangle', gain = 0.13, listener = [0, 0, 0] } = opts;
    const now = ctx.currentTime;

    const panner = ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 5;
    panner.maxDistance = 90;
    panner.rolloffFactor = 1.2;
    panner.positionX.value = at[0];
    panner.positionY.value = at[1];
    panner.positionZ.value = at[2];

    const bus = ctx.createGain();
    bus.gain.value = 0;
    bus.gain.setValueAtTime(0, now);
    bus.gain.linearRampToValueAtTime(gain, now + attack);
    bus.gain.exponentialRampToValueAtTime(0.0001, now + attack + release);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, now);
    filter.frequency.exponentialRampToValueAtTime(5200, now + attack * 2);
    filter.frequency.exponentialRampToValueAtTime(900, now + attack + release);
    filter.Q.value = 3.2;

    const oscs = freqs.map((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 0 ? type : 'sine';
      o.frequency.value = f;
      // Slight detune per partial keeps the pad from sounding like a test tone.
      o.detune.value = (i - freqs.length / 2) * 4.5;
      const g = ctx.createGain();
      g.gain.value = 1 / (i + 1.6);
      o.connect(g).connect(filter);
      o.start(now);
      o.stop(now + attack + release + 0.05);
      return o;
    });

    filter.connect(bus).connect(panner).connect(this.synthBus);
    this.activeVoices += oscs.length;
    const done = () => {
      this.activeVoices = Math.max(0, this.activeVoices - oscs.length);
      try {
        panner.disconnect();
        bus.disconnect();
        filter.disconnect();
      } catch {
        /* already torn down */
      }
    };
    oscs[oscs.length - 1]?.addEventListener?.('ended', done, { once: true });
    window.setTimeout(done, (attack + release + 0.4) * 1000);

    // Keep the listener pinned to the camera so panning reads correctly.
    try {
      const l = ctx.listener;
      if (l.positionX) {
        l.positionX.value = listener[0];
        l.positionY.value = listener[1];
        l.positionZ.value = listener[2];
      } else {
        l.setPosition(listener[0], listener[1], listener[2]);
      }
    } catch {
      /* older implementations */
    }
  }

  /** Short non-spatial blip for HUD micro-interactions (cheaper than a Howl). */
  blip(freq = 880, ms = 70, type: OscillatorType = 'sine', gain = 0.06): void {
    if (!this.enabled) return;
    const ctx = this.ensureGraph();
    if (!ctx || !this.synthBus) return;
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, now);
    o.frequency.exponentialRampToValueAtTime(freq * 0.72, now + ms / 1000);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gain, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + ms / 1000);
    o.connect(g).connect(this.synthBus);
    o.start(now);
    o.stop(now + ms / 1000 + 0.02);
  }
}

/** Process-wide singleton. */
export const audio = new AetherAudioEngine();

/** Musical helpers for the Crucible synth wheel. */
export const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/** A minor pentatonic ladder — always consonant, so random traversal still sings. */
export const PENTATONIC = [57, 60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84];

export function chordFromNode(index: number, total: number): number[] {
  const root = PENTATONIC[index % PENTATONIC.length];
  const spread = 1 + Math.floor((index / total) * 3);
  return [hz(root), hz(root + 3 * spread), hz(root + 7), hz(root + 12)] as number[];
}

/** 432 Hz tuning reference — the resonance target for Quest 2. */
export const RESONANCE_HZ = 432;
export const RESONANCE_TOLERANCE = 1.5;
export const isResonant = (v: number) => Math.abs(v - RESONANCE_HZ) <= RESONANCE_TOLERANCE;

export type { PannerMode };
