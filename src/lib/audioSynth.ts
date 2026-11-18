import type { SynthPreset } from '../types/music';

const SAMPLE_RATE = 22050;

function encodeWav(left: Float32Array, right: Float32Array, sampleRate: number): Blob {
  const numChannels = 2;
  const numSamples = left.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const l = Math.max(-1, Math.min(1, left[i]));
    const r = Math.max(-1, Math.min(1, right[i]));
    view.setInt16(offset, l < 0 ? l * 0x8000 : l * 0x7fff, true);
    view.setInt16(offset + 2, r < 0 ? r * 0x8000 : r * 0x7fff, true);
    offset += 4;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function noteToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function addPluckedNote(
  left: Float32Array,
  right: Float32Array,
  startSec: number,
  durSec: number,
  freq: number,
  amp: number,
  pan: number,
  bright = 1.0
) {
  const startIdx = Math.floor(startSec * SAMPLE_RATE);
  const len = Math.floor(durSec * SAMPLE_RATE);
  const gL = amp * Math.cos(((pan + 1) * Math.PI) / 4);
  const gR = amp * Math.sin(((pan + 1) * Math.PI) / 4);

  for (let i = 0; i < len && startIdx + i < left.length; i++) {
    const t = i / SAMPLE_RATE;
    const attack = Math.min(1, t / 0.014);
    const decay = Math.exp(-t * (2.6 / Math.max(0.4, durSec)));
    const env = attack * decay;
    const h1 = Math.sin(2 * Math.PI * freq * t);
    const h2 = 0.42 * bright * Math.sin(2 * Math.PI * freq * 2 * t) * Math.exp(-t * 4.5);
    const h3 = 0.16 * bright * Math.sin(2 * Math.PI * freq * 3 * t) * Math.exp(-t * 7.0);
    const sample = (h1 + h2 + h3) * env;
    left[startIdx + i] += sample * gL;
    right[startIdx + i] += sample * gR;
  }
}

function addWarmPad(
  left: Float32Array,
  right: Float32Array,
  startSec: number,
  durSec: number,
  freqs: number[],
  amp: number
) {
  const startIdx = Math.floor(startSec * SAMPLE_RATE);
  const len = Math.floor(durSec * SAMPLE_RATE);

  for (let i = 0; i < len && startIdx + i < left.length; i++) {
    const t = i / SAMPLE_RATE;
    const fadeIn = Math.min(1, t / 0.65);
    const fadeOut = Math.min(1, (durSec - t) / 0.85);
    const env = fadeIn * fadeOut;

    let sumL = 0;
    let sumR = 0;
    for (let k = 0; k < freqs.length; k++) {
      const f = freqs[k];
      const detune = k % 2 === 0 ? 1.0022 : 0.9978;
      const wL = Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(2 * Math.PI * f * 2 * t);
      const wR = Math.sin(2 * Math.PI * f * detune * t) + 0.25 * Math.sin(2 * Math.PI * f * 2 * detune * t);
      sumL += wL;
      sumR += wR;
    }
    const norm = amp / Math.max(1, freqs.length);
    left[startIdx + i] += sumL * norm * env;
    right[startIdx + i] += sumR * norm * env;
  }
}

function addSoftKick(left: Float32Array, right: Float32Array, startSec: number, amp: number) {
  const startIdx = Math.floor(startSec * SAMPLE_RATE);
  const len = Math.floor(0.24 * SAMPLE_RATE);
  let phase = 0;
  for (let i = 0; i < len && startIdx + i < left.length; i++) {
    const t = i / SAMPLE_RATE;
    const freq = 48 + 75 * Math.exp(-t * 28);
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    const env = Math.exp(-t * 14);
    const s = Math.sin(phase) * env * amp;
    left[startIdx + i] += s;
    right[startIdx + i] += s;
  }
}

function addSoftRim(left: Float32Array, right: Float32Array, startSec: number, amp: number, pan = 0.25) {
  const startIdx = Math.floor(startSec * SAMPLE_RATE);
  const len = Math.floor(0.06 * SAMPLE_RATE);
  const gL = amp * Math.cos(((pan + 1) * Math.PI) / 4);
  const gR = amp * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < len && startIdx + i < left.length; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 65);
    const noise = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const tone = Math.sin(2 * Math.PI * 1120 * t) * 0.6 + noise * 0.35;
    left[startIdx + i] += tone * env * gL;
    right[startIdx + i] += tone * env * gR;
  }
}

export interface SynthResult {
  blob: Blob;
  duration: number;
}

export function synthesizeTrackAudio(preset: SynthPreset): SynthResult {
  const duration = 28;
  const totalSamples = SAMPLE_RATE * duration;
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  if (preset === 'raga_dawn') {
    // Bhairav-inspired warm tanpura drone + meditative melody
    addWarmPad(left, right, 0, duration, [noteToFreq(48), noteToFreq(55), noteToFreq(60)], 0.26);
    const scale = [60, 61, 64, 65, 67, 68, 71, 72];
    const motif = [0, 2, 4, 3, 2, 1, 0, 4, 5, 4, 2, 1, 0, 2, 5, 7, 6, 4, 3, 2, 0];
    let t = 0.6;
    for (let i = 0; i < 36 && t < duration - 1.5; i++) {
      const midi = scale[motif[i % motif.length]];
      addPluckedNote(left, right, t, 1.4, noteToFreq(midi), 0.24, (i % 2 === 0 ? -0.25 : 0.25), 1.15);
      t += i % 3 === 2 ? 1.15 : 0.68;
    }
  } else if (preset === 'monsoon_lofi') {
    // Chilled Rhodes 7th chords + relaxed lo-fi pulse
    const chords = [
      [53, 57, 60, 64], // Fmaj7
      [52, 55, 59, 62], // Em7
      [50, 53, 57, 60], // Dm7
      [48, 52, 55, 59], // Cmaj7
    ];
    for (let bar = 0; bar < 7; bar++) {
      const start = bar * 4;
      const chord = chords[bar % chords.length];
      addWarmPad(left, right, start, 4.0, chord.map(noteToFreq), 0.28);
      for (let beat = 0; beat < 4; beat++) {
        const bt = start + beat;
        if (beat === 0 || beat === 2) addSoftKick(left, right, bt, 0.28);
        if (beat === 1 || beat === 3) addSoftRim(left, right, bt, 0.14, 0.2);
        addPluckedNote(left, right, bt + 0.5, 0.7, noteToFreq(chord[beat % chord.length] + 12), 0.12, -0.3, 0.6);
      }
    }
  } else if (preset === 'acoustic_chai') {
    // Warm fingerpicked acoustic pattern
    const progression = [
      [48, 55, 60, 64, 67],
      [45, 52, 57, 60, 64],
      [41, 48, 53, 57, 60],
      [43, 50, 55, 59, 62],
    ];
    let t = 0.25;
    for (let bar = 0; bar < 14 && t < duration - 1; bar++) {
      const notes = progression[bar % progression.length];
      for (let step = 0; step < 6; step++) {
        const n = notes[step % notes.length];
        addPluckedNote(left, right, t, 1.15, noteToFreq(n), 0.22, ((step - 2.5) / 5) * 0.5, 0.9);
        t += 0.32;
      }
    }
  } else if (preset === 'night_drive') {
    // Deep analog pulse + midnight synth arpeggio
    const bass = [36, 36, 41, 43];
    for (let bar = 0; bar < 7; bar++) {
      const start = bar * 4;
      const root = bass[bar % bass.length];
      addWarmPad(left, right, start, 4.0, [noteToFreq(root + 12), noteToFreq(root + 19), noteToFreq(root + 24)], 0.24);
      for (let step = 0; step < 8; step++) {
        const st = start + step * 0.5;
        if (step % 2 === 0) addSoftKick(left, right, st, 0.32);
        if (step % 4 === 2) addSoftRim(left, right, st, 0.12, -0.2);
        const arpOffset = [0, 7, 12, 15][step % 4];
        addPluckedNote(left, right, st, 0.45, noteToFreq(root + 12 + arpOffset), 0.14, step % 2 === 0 ? -0.35 : 0.35, 1.2);
      }
    }
  } else if (preset === 'amber_vinyl') {
    // Slow warm electric piano + soft chime
    const chords = [
      [50, 54, 57, 61],
      [47, 50, 54, 57],
      [43, 47, 50, 54],
      [45, 49, 52, 55],
    ];
    for (let bar = 0; bar < 7; bar++) {
      const start = bar * 4;
      const c = chords[bar % chords.length];
      addWarmPad(left, right, start, 4.0, c.map(noteToFreq), 0.25);
      addPluckedNote(left, right, start + 0.5, 1.8, noteToFreq(c[3] + 12), 0.16, 0.3, 0.5);
      addPluckedNote(left, right, start + 2.25, 1.6, noteToFreq(c[2] + 12), 0.15, -0.3, 0.5);
    }
  } else {
    // sitar_horizon: Yaman-inspired evening notes
    addWarmPad(left, right, 0, duration, [noteToFreq(50), noteToFreq(57), noteToFreq(62)], 0.22);
    const yaman = [62, 64, 66, 68, 69, 71, 73, 74];
    let t = 0.4;
    for (let i = 0; i < 40 && t < duration - 1.2; i++) {
      const idx = (i * 3 + (i % 5)) % yaman.length;
      addPluckedNote(left, right, t, 1.3, noteToFreq(yaman[idx]), 0.22, Math.sin(i) * 0.4, 1.35);
      t += i % 4 === 0 ? 0.95 : 0.55;
    }
  }

  // Smooth master fade-in / fade-out and soft limiter
  const fadeSamples = Math.floor(0.25 * SAMPLE_RATE);
  for (let i = 0; i < totalSamples; i++) {
    let env = 1;
    if (i < fadeSamples) env = i / fadeSamples;
    else if (i > totalSamples - fadeSamples) env = (totalSamples - i) / fadeSamples;
    left[i] = Math.tanh(left[i] * env);
    right[i] = Math.tanh(right[i] * env);
  }

  return {
    blob: encodeWav(left, right, SAMPLE_RATE),
    duration,
  };
}
