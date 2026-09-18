import { PrismRay, PrismHitType, PrismDivision, BeamSplitMode } from '../types';
import { audioBufferToWav } from './sunoAudioEngine';

// Optical Dispersion Spectral Color Palette (Wavelengths ~700nm to 380nm)
export const PRISM_SPECTRUM_COLORS = [
  { name: 'Infrared Red', hex: '#FF2E63', wavelength: 700, defaultHit: 'kick' as PrismHitType },
  { name: 'Neon Amber', hex: '#FF7B00', wavelength: 640, defaultHit: 'snare' as PrismHitType },
  { name: 'Solar Topaz', hex: '#FFD700', wavelength: 590, defaultHit: 'clap' as PrismHitType },
  { name: 'Emerald Laser', hex: '#00F59B', wavelength: 535, defaultHit: 'hihat' as PrismHitType },
  { name: 'Electric Cyan', hex: '#00F0FF', wavelength: 490, defaultHit: 'hihat' as PrismHitType },
  { name: 'Deep Cobalt', hex: '#3B82F6', wavelength: 450, defaultHit: 'perc' as PrismHitType },
  { name: 'Photon Violet', hex: '#A855F7', wavelength: 410, defaultHit: 'slice' as PrismHitType },
  { name: 'Ultraviolet', hex: '#EC4899', wavelength: 380, defaultHit: 'slice' as PrismHitType },
  { name: 'Prism Crimson', hex: '#EF4444', wavelength: 680, defaultHit: 'kick' as PrismHitType },
  { name: 'Corona Orange', hex: '#F97316', wavelength: 620, defaultHit: 'snare' as PrismHitType },
  { name: 'Radiant Gold', hex: '#EAB308', wavelength: 580, defaultHit: 'clap' as PrismHitType },
  { name: 'Prism Teal', hex: '#14B8A6', wavelength: 510, defaultHit: 'perc' as PrismHitType },
  { name: 'Sky Ray', hex: '#06B6D4', wavelength: 480, defaultHit: 'hihat' as PrismHitType },
  { name: 'Indigo Beam', hex: '#6366F1', wavelength: 430, defaultHit: 'slice' as PrismHitType },
  { name: 'Deep Amethyst', hex: '#8B5CF6', wavelength: 400, defaultHit: 'slice' as PrismHitType },
  { name: 'Rose Photon', hex: '#F43F5E', wavelength: 370, defaultHit: 'slice' as PrismHitType }
];

export const KEYBOARD_PAD_SHORTCUTS = ['1', '2', '3', '4', '5', '6', '7', '8', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I'];

/**
 * Finds the nearest zero-crossing sample to avoid audio clicks and pops
 */
export function findZeroCrossing(
  channelData: Float32Array,
  targetSample: number,
  searchWindow: number = 512
): number {
  const maxSearch = Math.min(channelData.length - 2, targetSample + searchWindow);
  const minSearch = Math.max(0, targetSample - searchWindow);

  let bestSample = targetSample;
  let minDiff = Infinity;

  for (let i = minSearch; i < maxSearch; i++) {
    // Check sign change (zero crossing)
    if ((channelData[i] <= 0 && channelData[i + 1] >= 0) || (channelData[i] >= 0 && channelData[i + 1] <= 0)) {
      const distance = Math.abs(i - targetSample);
      if (distance < minDiff) {
        minDiff = distance;
        bestSample = i;
      }
    }
  }

  return bestSample;
}

/**
 * Transient Detection Engine:
 * Analyzes sudden energetic onsets across the audio waveform to identify percussive drum hits
 */
export function detectTransientOnsets(
  buffer: AudioBuffer,
  bpm: number = 120,
  sensitivity: number = 0.35,
  maxSlices: number = 16
): number[] {
  const sampleRate = buffer.sampleRate;
  const channelData = buffer.getChannelData(0);
  const windowSize = Math.floor(sampleRate * 0.015); // 15ms analysis windows
  const stepSize = Math.floor(sampleRate * 0.0075);  // 7.5ms hop
  const numSteps = Math.floor((channelData.length - windowSize) / stepSize);

  const energies = new Float32Array(numSteps);
  for (let i = 0; i < numSteps; i++) {
    const start = i * stepSize;
    let sumSq = 0;
    for (let j = 0; j < windowSize; j++) {
      const s = channelData[start + j];
      sumSq += s * s;
    }
    energies[i] = Math.sqrt(sumSq / windowSize);
  }

  // Calculate local energy delta (spectral onset flux)
  const onsets: number[] = [0]; // First hit at 0
  const minHitSamples = Math.floor((60 / bpm) * sampleRate * 0.25); // At least 1/16th note apart

  let lastHitSample = 0;
  for (let i = 2; i < numSteps - 2; i++) {
    const prevE = energies[i - 1];
    const currE = energies[i];
    const nextE = energies[i + 1];

    const currentSample = i * stepSize;
    if (currE > prevE && currE > nextE && currE > sensitivity * 0.4) {
      const delta = currE - prevE;
      if (delta > 0.03 && (currentSample - lastHitSample) >= minHitSamples) {
        const zeroSample = findZeroCrossing(channelData, currentSample);
        onsets.push(zeroSample / sampleRate);
        lastHitSample = currentSample;
        if (onsets.length >= maxSlices) break;
      }
    }
  }

  // If too few transients were detected, fallback to rhythmic grid
  if (onsets.length < 4) {
    const secondsPerBeat = 60 / bpm;
    const totalDuration = buffer.duration;
    const fallbackOnsets: number[] = [];
    for (let t = 0; t < totalDuration && fallbackOnsets.length < maxSlices; t += secondsPerBeat * 0.5) {
      fallbackOnsets.push(t);
    }
    return fallbackOnsets;
  }

  return onsets;
}

/**
 * Refracts the audio beam into discrete spectral Prism Rays based on division mode or onsets
 */
export function refractAudioBeam(
  buffer: AudioBuffer,
  bpm: number = 120,
  division: PrismDivision = '1/8',
  snapZeroCrossing: boolean = true,
  maxRays: number = 16
): PrismRay[] {
  const sampleRate = buffer.sampleRate;
  const channelData = buffer.getChannelData(0);
  const totalDuration = buffer.duration;
  const rays: PrismRay[] = [];

  let sliceTimes: number[] = [];

  if (division === 'transient') {
    sliceTimes = detectTransientOnsets(buffer, bpm, 0.35, maxRays);
  } else {
    // Quantized rhythm divisions (beats, measures, subdivisions)
    let beatFraction = 0.5; // default 1/8 note = 0.5 beat
    switch (division) {
      case '1/1': beatFraction = 4.0; break;
      case '1/2': beatFraction = 2.0; break;
      case '1/4': beatFraction = 1.0; break;
      case '1/8': beatFraction = 0.5; break;
      case '1/16': beatFraction = 0.25; break;
      case '1/32': beatFraction = 0.125; break;
      case '1/8t': beatFraction = 1 / 3; break;
      case '1/16t': beatFraction = 1 / 6; break;
    }

    const sliceDurationSeconds = (60 / bpm) * beatFraction;
    let t = 0;
    while (t < totalDuration && sliceTimes.length < maxRays) {
      sliceTimes.push(t);
      t += sliceDurationSeconds;
    }
  }

  // Construct ray slices with optical spectrum properties
  for (let i = 0; i < sliceTimes.length; i++) {
    const startSec = sliceTimes[i];
    const endSec = i < sliceTimes.length - 1 ? sliceTimes[i + 1] : totalDuration;
    let rawStartSample = Math.floor(startSec * sampleRate);
    let rawEndSample = Math.min(channelData.length - 1, Math.floor(endSec * sampleRate));

    let startSample = snapZeroCrossing ? findZeroCrossing(channelData, rawStartSample) : rawStartSample;
    let endSample = snapZeroCrossing ? findZeroCrossing(channelData, rawEndSample) : rawEndSample;

    if (endSample <= startSample) {
      endSample = Math.min(channelData.length - 1, startSample + 512);
    }

    const actualStartSec = startSample / sampleRate;
    const actualEndSec = endSample / sampleRate;
    const actualDuration = actualEndSec - actualStartSec;

    const colorConfig = PRISM_SPECTRUM_COLORS[i % PRISM_SPECTRUM_COLORS.length];
    const shortcut = i < KEYBOARD_PAD_SHORTCUTS.length ? KEYBOARD_PAD_SHORTCUTS[i] : undefined;

    // Automatic classification based on position and transient index
    let hitType: PrismHitType = colorConfig.defaultHit;
    if (i === 0 || i % 4 === 0) hitType = 'kick';
    else if (i % 4 === 2) hitType = 'snare';
    else if (i % 2 === 1) hitType = 'hihat';

    rays.push({
      id: `prism-ray-${i}-${Date.now()}`,
      index: i,
      label: `Ray ${i + 1} [${colorConfig.wavelength}nm]`,
      color: colorConfig.hex,
      startSeconds: actualStartSec,
      endSeconds: actualEndSec,
      durationSeconds: actualDuration,
      startSample,
      endSample,
      hitType,
      reverse: false,
      pitchSemitones: 0,
      pan: ((i % 5) - 2) * 0.25, // Natural stereo fan dispersion
      gain: 1.0,
      keyShortcut: shortcut,
      wavelengthNm: colorConfig.wavelength
    });
  }

  return rays;
}

/**
 * Extracts a dedicated AudioBuffer for an individual Prism Ray slice with optional micro-crossfade and reverse
 */
export function extractSliceBuffer(
  ctx: AudioContext,
  sourceBuffer: AudioBuffer,
  slice: PrismRay,
  crossfadeMs: number = 3
): AudioBuffer {
  const sampleRate = sourceBuffer.sampleRate;
  const numChannels = sourceBuffer.numberOfChannels;
  const sliceLength = Math.max(64, slice.endSample - slice.startSample);

  const newBuffer = ctx.createBuffer(numChannels, sliceLength, sampleRate);
  const fadeSamples = Math.min(Math.floor(sliceLength / 4), Math.floor((crossfadeMs / 1000) * sampleRate));

  for (let ch = 0; ch < numChannels; ch++) {
    const srcData = sourceBuffer.getChannelData(ch);
    const destData = newBuffer.getChannelData(ch);

    for (let i = 0; i < sliceLength; i++) {
      const srcIdx = slice.reverse 
        ? slice.endSample - 1 - i 
        : slice.startSample + i;

      let val = (srcIdx >= 0 && srcIdx < srcData.length) ? srcData[srcIdx] : 0;

      // Micro fade-in to eliminate click
      if (i < fadeSamples) {
        val *= (i / fadeSamples);
      }
      // Micro fade-out
      if (i > sliceLength - fadeSamples) {
        val *= ((sliceLength - i) / fadeSamples);
      }

      destData[i] = val * (slice.gain ?? 1.0);
    }
  }

  return newBuffer;
}

/**
 * Extracts a seamless, perfect loop buffer between startSeconds and endSeconds with zero-crossing crossfade
 */
export function extractLoopBuffer(
  ctx: AudioContext,
  sourceBuffer: AudioBuffer,
  startSeconds: number,
  endSeconds: number,
  crossfadeMs: number = 6
): AudioBuffer {
  const sampleRate = sourceBuffer.sampleRate;
  const numChannels = sourceBuffer.numberOfChannels;
  const channelData0 = sourceBuffer.getChannelData(0);

  const rawStart = Math.floor(startSeconds * sampleRate);
  const rawEnd = Math.min(sourceBuffer.length - 1, Math.floor(endSeconds * sampleRate));

  const startSample = findZeroCrossing(channelData0, rawStart);
  const endSample = findZeroCrossing(channelData0, rawEnd);
  const loopLength = Math.max(128, endSample - startSample);

  const loopBuffer = ctx.createBuffer(numChannels, loopLength, sampleRate);
  const fadeSamples = Math.min(Math.floor(loopLength / 8), Math.floor((crossfadeMs / 1000) * sampleRate));

  for (let ch = 0; ch < numChannels; ch++) {
    const srcData = sourceBuffer.getChannelData(ch);
    const destData = loopBuffer.getChannelData(ch);

    for (let i = 0; i < loopLength; i++) {
      const srcIdx = startSample + i;
      let sample = (srcIdx < srcData.length) ? srcData[srcIdx] : 0;

      // Equal-power crossfade between loop seam
      if (i < fadeSamples) {
        const t = i / fadeSamples;
        sample *= Math.sin(t * (Math.PI / 2));
      } else if (i > loopLength - fadeSamples) {
        const t = (loopLength - i) / fadeSamples;
        sample *= Math.sin(t * (Math.PI / 2));
      }

      destData[i] = sample;
    }
  }

  return loopBuffer;
}

/**
 * Real-time Optical Ray Audio Player Node
 * Triggers a slice or loop with pitch transposition, optical filtering, and stereo dispersion
 */
export class PrismAudioPlayer {
  private ctx: AudioContext | null = null;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private masterGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;

  constructor() {
    // Deferred until user interaction
  }

  private initCtx(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'allpass'; // Transparent until set

      this.filterNode.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setFilter(type: BiquadFilterType, frequency: number, resonance: number = 1.0) {
    if (!this.filterNode) return;
    this.filterNode.type = type;
    this.filterNode.frequency.setValueAtTime(frequency, this.ctx?.currentTime || 0);
    this.filterNode.Q.setValueAtTime(resonance, this.ctx?.currentTime || 0);
  }

  public setMasterVolume(gain: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(2.0, gain)), this.ctx.currentTime);
    }
  }

  /**
   * Plays a single Prism Ray slice with pitch, pan, reverse, and volume
   */
  public playRaySlice(
    sourceBuffer: AudioBuffer,
    ray: PrismRay,
    volume: number = 1.0,
    onEnded?: () => void
  ): AudioBufferSourceNode | null {
    const ctx = this.initCtx();
    try {
      const sliceBuf = extractSliceBuffer(ctx, sourceBuffer, ray);
      const source = ctx.createBufferSource();
      source.buffer = sliceBuf;

      // Pitch shift via playback rate (semitones)
      if (ray.pitchSemitones) {
        const rate = Math.pow(2, ray.pitchSemitones / 12);
        source.playbackRate.setValueAtTime(rate, ctx.currentTime);
      }

      // Gain Node
      const gainNode = ctx.createGain();
      const rayGain = (ray.gain ?? 1.0) * volume;
      gainNode.gain.setValueAtTime(rayGain, ctx.currentTime);

      // Stereo Panner Node
      if (ctx.createStereoPanner && ray.pan !== undefined) {
        const panner = ctx.createStereoPanner();
        panner.pan.setValueAtTime(Math.max(-1, Math.min(1, ray.pan)), ctx.currentTime);
        source.connect(gainNode);
        gainNode.connect(panner);
        panner.connect(this.filterNode || ctx.destination);
      } else {
        source.connect(gainNode);
        gainNode.connect(this.filterNode || ctx.destination);
      }

      source.onended = () => {
        this.activeSources.delete(source);
        if (onEnded) onEnded();
      };

      this.activeSources.add(source);
      source.start(0);
      return source;
    } catch (e) {
      console.warn('PrismAudioPlayer playRaySlice error:', e);
      return null;
    }
  }

  /**
   * Plays a loop continuous preview between start and end seconds
   */
  public playLoopPreview(
    sourceBuffer: AudioBuffer,
    startSeconds: number,
    endSeconds: number,
    loop: boolean = true
  ): AudioBufferSourceNode | null {
    const ctx = this.initCtx();
    this.stopAll();

    try {
      const source = ctx.createBufferSource();
      source.buffer = sourceBuffer;
      source.loop = loop;
      source.loopStart = startSeconds;
      source.loopEnd = endSeconds;

      source.connect(this.filterNode || ctx.destination);
      this.activeSources.add(source);
      source.start(0, startSeconds);
      return source;
    } catch (e) {
      console.warn('PrismAudioPlayer playLoopPreview error:', e);
      return null;
    }
  }

  /**
   * Photon Stutter: Fires a rapid burst of repeated slices (e.g. 1/16, 1/32, 1/64 photon burst)
   */
  public triggerPhotonStutter(
    sourceBuffer: AudioBuffer,
    ray: PrismRay,
    stutterRate: '1/16' | '1/32' | '1/64',
    bpm: number = 120,
    burstCount: number = 8
  ) {
    const ctx = this.initCtx();
    const beatSec = 60 / bpm;
    const interval = stutterRate === '1/16' ? beatSec / 4 : stutterRate === '1/32' ? beatSec / 8 : beatSec / 16;
    const now = ctx.currentTime;

    const sliceBuf = extractSliceBuffer(ctx, sourceBuffer, ray);

    for (let i = 0; i < burstCount; i++) {
      const fireTime = now + (i * interval);
      const src = ctx.createBufferSource();
      src.buffer = sliceBuf;

      const gain = ctx.createGain();
      // Increasing photon intensity curve
      const vol = 0.5 + (i / burstCount) * 0.5;
      gain.gain.setValueAtTime(vol, fireTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, fireTime + interval * 0.95);

      src.connect(gain);
      gain.connect(this.filterNode || ctx.destination);

      src.start(fireTime);
      src.stop(fireTime + interval);
    }
  }

  public stopAll() {
    this.activeSources.forEach(s => {
      try {
        s.stop();
      } catch (e) {}
    });
    this.activeSources.clear();
  }
}

/**
 * High-fidelity synthetic demo beat generator for instant testing
 */
export function createBeamSplitterDemoAudio(
  style: 'photon_break' | 'prism_house' | 'subatomic_trap' | 'quantum_synth' = 'photon_break'
): { buffer: AudioBuffer; bpm: number; title: string } {
  const sampleRate = 44100;
  let bpm = 126;
  let totalBars = 4;
  let title = 'Neutron Breakbeat 126 BPM';

  if (style === 'prism_house') {
    bpm = 124;
    title = 'Prism House Groove 124 BPM';
  } else if (style === 'subatomic_trap') {
    bpm = 140;
    title = 'Subatomic Trap 140 BPM';
  } else if (style === 'quantum_synth') {
    bpm = 120;
    title = 'Quantum Synth Arp 120 BPM';
  }

  const secondsPerBeat = 60 / bpm;
  const totalSeconds = secondsPerBeat * 4 * totalBars;
  const totalSamples = Math.floor(totalSeconds * sampleRate);

  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioCtx();
  const buffer = ctx.createBuffer(2, totalSamples, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const totalSteps = totalBars * 16;
  const samplesPerStep = Math.floor((secondsPerBeat / 4) * sampleRate);

  for (let step = 0; step < totalSteps; step++) {
    const stepStart = step * samplesPerStep;
    const barIndex = Math.floor(step / 16);
    const stepInBar = step % 16;
    const beatIndex = Math.floor(stepInBar / 4);
    const subStep = stepInBar % 4;

    // 1. KICK (Punchy sub transient)
    const isKick = style === 'prism_house' 
      ? subStep === 0 
      : (stepInBar === 0 || stepInBar === 6 || stepInBar === 10);

    if (isKick) {
      const dur = Math.floor(samplesPerStep * 2.2);
      for (let i = 0; i < dur && (stepStart + i) < totalSamples; i++) {
        const t = i / sampleRate;
        const pitchEnv = 150 * Math.exp(-t * 36) + 48;
        const ampEnv = Math.exp(-t * 14);
        const val = Math.sin(2 * Math.PI * pitchEnv * t) * ampEnv * 0.95;
        left[stepStart + i] += val;
        right[stepStart + i] += val;
      }
    }

    // 2. SNARE / CLAP (Bright transient + burst noise)
    const isSnare = (beatIndex === 1 || beatIndex === 3) && subStep === 0;
    if (isSnare) {
      const dur = Math.floor(samplesPerStep * 2.5);
      for (let i = 0; i < dur && (stepStart + i) < totalSamples; i++) {
        const t = i / sampleRate;
        const tone = Math.sin(2 * Math.PI * 220 * t) * Math.exp(-t * 24);
        const noise = (Math.random() * 2 - 1) * Math.exp(-t * 18);
        const val = (tone * 0.4 + noise * 0.6) * 0.85;
        left[stepStart + i] += val;
        right[stepStart + i] += val * 0.9;
      }
    }

    // 3. HI-HATS / PERCUSSION (Refracted spectral ticks)
    const isHat = subStep % 2 === 0 || (style === 'subatomic_trap' && subStep === 3);
    if (isHat && !isSnare) {
      const isOpen = stepInBar === 2 || stepInBar === 14;
      const decay = isOpen ? 12 : 65;
      const dur = Math.floor(samplesPerStep * (isOpen ? 1.8 : 0.8));
      for (let i = 0; i < dur && (stepStart + i) < totalSamples; i++) {
        const t = i / sampleRate;
        const noise = (Math.random() * 2 - 1) * Math.exp(-t * decay);
        const pannedL = noise * 0.35 * (subStep === 2 ? 0.6 : 0.9);
        const pannedR = noise * 0.35 * (subStep === 2 ? 0.9 : 0.6);
        left[stepStart + i] += pannedL;
        right[stepStart + i] += pannedR;
      }
    }

    // 4. BASS / SYNTH RESONANCE
    if (stepInBar % 2 === 0 || style === 'quantum_synth') {
      const notes = [40, 43, 47, 50, 52, 55];
      const noteFreq = 440 * Math.pow(2, (notes[(step + barIndex) % notes.length] - 69) / 12);
      const dur = Math.floor(samplesPerStep * 1.5);
      for (let i = 0; i < dur && (stepStart + i) < totalSamples; i++) {
        const t = i / sampleRate;
        const val = Math.sin(2 * Math.PI * noteFreq * t) * Math.exp(-t * 8) * 0.28;
        left[stepStart + i] += val;
        right[stepStart + i] += val;
      }
    }
  }

  // Final normalization to prevent clipping
  let peak = 0;
  for (let i = 0; i < totalSamples; i++) {
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  }
  if (peak > 0.001) {
    const scale = 0.92 / peak;
    for (let i = 0; i < totalSamples; i++) {
      left[i] *= scale;
      right[i] *= scale;
    }
  }

  return { buffer, bpm, title };
}
