/**
 * AETHERIA — Audio Forge
 * -------------------------------------------------------------
 * Synthesises every sound the realm needs into 16-bit PCM WAV files.
 * No samples are downloaded, so there is nothing to license and the
 * whole audio bank is reproducible from this one script.
 *
 * Run:  node scripts/generate-audio.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'audio');
mkdirSync(OUT, { recursive: true });

const SR = 44100;

/* ---------------- WAV container ---------------- */
function writeWav(file, frames, channels = 2, sampleRate = SR) {
  const n = frames.length; // interleaved float samples
  const data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, frames[i]));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const byteRate = sampleRate * channels * 2;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(channels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(join(OUT, file), Buffer.concat([header, data]));
  return header.length + data.length;
}

const DRONE_SR = 22050;
const dur = (s, sr = SR) => Math.floor(s * sr);
const env = {
  ad: (t, a, d) => (t < a ? t / a : Math.max(0, 1 - (t - a) / d)),
  adsr: (t, a, d, s, r, total) => {
    if (t < a) return t / a;
    if (t < a + d) return 1 - ((t - a) / d) * (1 - s);
    if (t < total - r) return s;
    return Math.max(0, (s * (total - t)) / r);
  },
};
const TAU = Math.PI * 2;

/** Simple one-pole lowpass for warmth. */
function lowpass(buf, cutoff) {
  const rc = 1 / (TAU * cutoff);
  const dt = 1 / SR;
  const a = dt / (rc + dt);
  const out = new Float32Array(buf.length);
  let prev = 0;
  for (let i = 0; i < buf.length; i++) {
    prev = prev + a * (buf[i] - prev);
    out[i] = prev;
  }
  return out;
}

function normalize(buf, peak = 0.82) {
  let m = 0;
  for (let i = 0; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i]));
  if (m === 0) return buf;
  const g = peak / m;
  const out = new Float32Array(buf.length);
  for (let i = 0; i < buf.length; i++) out[i] = buf[i] * g;
  return out;
}

/** Interleave mono L/R into a stereo frame buffer. */
function stereo(l, r) {
  const n = Math.min(l.length, r.length);
  const out = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    out[i * 2] = l[i];
    out[i * 2 + 1] = r[i];
  }
  return out;
}

/* ---------------- Instruments ---------------- */
/** Additive bell/pad voice: fundamental + partials with individual decay. */
function voice(freq, seconds, { partials = [1, 0.5, 0.28, 0.14, 0.07], decay = 1.6, detune = 0 } = {}) {
  const n = dur(seconds);
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let s = 0;
    partials.forEach((amp, k) => {
      const harm = k + 1;
      s += amp * Math.sin(TAU * freq * harm * t + detune * harm) * Math.exp(-t * decay * (1 + k * 0.35));
    });
    buf[i] = s * env.ad(t, 0.012, seconds);
  }
  return buf;
}

function addInto(target, src, atSec = 0, gain = 1) {
  const off = dur(atSec);
  for (let i = 0; i < src.length; i++) {
    const idx = off + i;
    if (idx >= target.length) break;
    target[idx] += src[i] * gain;
  }
}

const NOTE = (semi) => 440 * Math.pow(2, semi / 12);

/* ---------------- The bank ---------------- */
const bank = [];

// 1. Ambient realm drone — seamless 24s stereo loop in A minor.
{
  const secs = 24;
  const n = dur(secs, DRONE_SR);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const drone = [55, 82.41, 110, 164.81, 220]; // A1 E2 A2 E3 A3
  drone.forEach((f, k) => {
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      // Integer-cycle LFOs so the file loops without a seam.
      const lfo = 0.5 + 0.5 * Math.sin(TAU * ((k + 1) / secs) * t);
      const pan = k % 2 === 0 ? 0.62 : 0.38;
      const v = Math.sin(TAU * f * t + 0.35 * Math.sin(TAU * (0.5 + k * 0.13) * t)) * (0.1 + 0.09 * lfo);
      L[i] += v * pan * 1.25;
      R[i] += v * (1 - pan) * 1.25;
    }
  });
  // Sparse high shimmer bells on loop-locked beats.
  const bellTimes = [0, 3, 6.5, 9, 13, 16.5, 19.5];
  const bellNotes = [12, 19, 24, 16, 28, 21, 24];
  bellTimes.forEach((bt, i) => {
    const b = voice(NOTE(bellNotes[i]), 5.5, { decay: 0.85, partials: [1, 0.32, 0.12, 0.05] });
    const g = 0.055;
    addInto(L, b, bt, g * (i % 2 ? 0.6 : 1));
    addInto(R, b, bt + 0.014, g * (i % 2 ? 1 : 0.6));
  });
  // Airy noise bed.
  let last = 0;
  for (let i = 0; i < n; i++) {
    const w = (Math.random() * 2 - 1) * 0.5;
    last = last * 0.965 + w * 0.035;
    const t = i / SR;
    const swell = 0.5 + 0.5 * Math.sin(TAU * (2 / secs) * t);
    L[i] += last * 0.5 * swell;
    R[i] += last * 0.5 * (1 - swell) * 1.2;
  }
  bank.push(['aether-drone.wav', DRONE_SR, stereo(lowpass(L, 2600), lowpass(R, 2400))]);
}

// 2. UI hover — soft glassy tick.
{
  const b = voice(1567.98, 0.16, { decay: 26, partials: [1, 0.4, 0.1] });
  bank.push(['ui-hover.wav', SR, stereo(b, b)]);
}

// 3. UI click — brighter, shorter, with a low thud body.
{
  const n = dur(0.22);
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    b[i] =
      Math.sin(TAU * 880 * t) * Math.exp(-t * 42) * 0.7 +
      Math.sin(TAU * 1760 * t) * Math.exp(-t * 60) * 0.3 +
      Math.sin(TAU * 110 * t) * Math.exp(-t * 22) * 0.5;
  }
  bank.push(['ui-click.wav', SR, stereo(b, b)]);
}

// 4. Core discovered — ascending arpeggio + shimmer tail.
{
  const secs = 3.2;
  const L = new Float32Array(dur(secs));
  const R = new Float32Array(dur(secs));
  [0, 7, 12, 19, 24].forEach((s, i) => {
    const v = voice(NOTE(s), 2.6, { decay: 1.5, partials: [1, 0.55, 0.3, 0.16, 0.08] });
    addInto(L, v, i * 0.085, 0.42);
    addInto(R, v, i * 0.085 + 0.03, 0.42);
  });
  const riser = new Float32Array(dur(secs));
  for (let i = 0; i < riser.length; i++) {
    const t = i / SR;
    const f = 220 * Math.pow(2, t * 1.6);
    riser[i] = Math.sin(TAU * f * t) * Math.min(1, t * 1.4) * Math.exp(-t * 0.7) * 0.25;
  }
  addInto(L, riser, 0, 0.7);
  addInto(R, riser, 0, 0.7);
  bank.push(['core-discover.wav', SR, stereo(normalize(lowpass(L, 9000), 0.85), normalize(lowpass(R, 9000), 0.85))]);
}

// 5. Quest complete — warm chord swell (A minor add9 → resolution).
{
  const secs = 3.6;
  const L = new Float32Array(dur(secs));
  const R = new Float32Array(dur(secs));
  const chordA = [0, 3, 7, 12, 14]; // A minor add9
  const chordB = [5, 9, 12, 17, 21]; // F major 9
  chordA.forEach((s, i) => {
    const v = voice(NOTE(s - 12), secs * 0.6, { decay: 0.9, partials: [1, 0.5, 0.25, 0.12] });
    for (let k = 0; k < v.length; k++) v[k] *= env.adsr(k / SR, 0.5, 0.4, 0.8, 0.8, v.length / SR);
    addInto(L, v, 0, 0.3);
    addInto(R, v, 0.02, 0.3);
  });
  chordB.forEach((s, i) => {
    const v = voice(NOTE(s - 12), 2.4, { decay: 1.1, partials: [1, 0.45, 0.2, 0.1] });
    for (let k = 0; k < v.length; k++) v[k] *= env.adsr(k / SR, 0.35, 0.3, 0.75, 1.0, v.length / SR);
    addInto(L, v, 1.25, 0.26);
    addInto(R, v, 1.28, 0.26);
  });
  bank.push(['quest-complete.wav', SR, stereo(normalize(L, 0.8), normalize(R, 0.8))]);
}

// 6. Terminal keystroke — dry mechanical tick.
{
  const n = dur(0.05);
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    b[i] = (Math.random() * 2 - 1) * Math.exp(-t * 260) * 0.6 + Math.sin(TAU * 2100 * t) * Math.exp(-t * 190) * 0.4;
  }
  bank.push(['terminal-key.wav', SR, stereo(b, b)]);
}

// 7. Glitch burst — for the corrupted Codex block.
{
  const n = dur(0.5);
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const gate = Math.sin(TAU * 37 * t) > 0.2 ? 1 : 0.06;
    b[i] = (Math.random() * 2 - 1) * gate * Math.exp(-t * 4) * 0.5 + Math.sin(TAU * 187 * t * (1 + Math.sin(t * 90))) * 0.2 * gate;
  }
  bank.push(['glitch.wav', SR, stereo(lowpass(b, 6000), lowpass(b, 5200))]);
}

// 8. Warp / camera whoosh — route transitions.
{
  const secs = 1.1;
  const n = dur(secs);
  const b = new Float32Array(n);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const w = Math.random() * 2 - 1;
    lp = lp * 0.9 + w * 0.1;
    b[i] = lp * Math.sin(Math.PI * (t / secs)) * 1.6;
  }
  bank.push(['warp.wav', SR, stereo(normalize(b, 0.6), normalize(b.slice().reverse(), 0.6))]);
}

// 9. Aether core idle hum — short loopable pulse for collected cores.
{
  const secs = 2;
  const n = dur(secs);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const pulse = Math.pow(0.5 + 0.5 * Math.sin(TAU * t), 3);
    const v = (Math.sin(TAU * 220 * t) * 0.5 + Math.sin(TAU * 330 * t) * 0.3 + Math.sin(TAU * 660 * t) * 0.12) * (0.25 + pulse * 0.5);
    L[i] = v * 0.9;
    R[i] = v * 0.7 + Math.sin(TAU * 440 * t) * pulse * 0.12;
  }
  bank.push(['core-hum.wav', SR, stereo(L, R)]);
}

let total = 0;
for (const [file, sampleRate, frames] of bank) {
  const bytes = writeWav(file, frames, 2, sampleRate);
  total += bytes;
  console.log(`  ✓ ${file.padEnd(22)} ${(bytes / 1024).toFixed(1).padStart(8)} KB   ${(frames.length / 2 / sampleRate).toFixed(2)}s @ ${sampleRate}Hz`);
}
console.log(`\nSynthesised ${bank.length} sounds → public/audio  (${(total / 1024 / 1024).toFixed(2)} MB)`);
