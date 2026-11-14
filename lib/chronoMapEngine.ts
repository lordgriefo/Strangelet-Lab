import { ChronoPin, ChronoMapResult } from '../types';

/**
 * ChronoMap & ChronoPins Audio Intelligence Engine
 * Provides transient onset analysis, tempo detection, ChronoPin anchor calculations,
 * and high-precision Web Audio metronome synchronization.
 */

export interface TransientPeak {
  sampleIndex: number;
  timeSeconds: number;
  energy: number;
}

export interface ChronoMapAnalysisOutput {
  detectedBpm: number;
  confidence: number;
  downbeatSeconds: number;
  downbeatSample: number;
  beatIntervalSeconds: number;
  barLengthSeconds: number;
  totalBars: number;
  chronoPins: ChronoPin[];
  waveformPeaks: number[];
  transientPeaks: TransientPeak[];
}

/**
 * Computes root-mean-square and onset novelty across audio buffer
 */
export function analyzeAudioBuffer(buffer: AudioBuffer): ChronoMapAnalysisOutput {
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const numChannels = buffer.numberOfChannels;
  
  // Merge channels to mono array
  const mono = new Float32Array(length);
  const ch0 = buffer.getChannelData(0);
  if (numChannels > 1) {
    const ch1 = buffer.getChannelData(1);
    for (let i = 0; i < length; i++) {
      mono[i] = (ch0[i] + ch1[i]) * 0.5;
    }
  } else {
    mono.set(ch0);
  }

  // 1. Generate visual waveform peaks (512 points for crisp rendering)
  const numWaveformPoints = 512;
  const waveformPeaks: number[] = new Array(numWaveformPoints).fill(0);
  const blockSize = Math.floor(length / numWaveformPoints);
  for (let i = 0; i < numWaveformPoints; i++) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, length);
    let peak = 0;
    for (let j = start; j < end; j += 4) {
      const abs = Math.abs(mono[j]);
      if (abs > peak) peak = abs;
    }
    waveformPeaks[i] = peak;
  }

  // 2. Compute Energy Envelope & Onset Detection Function
  // Window size = ~10ms (e.g. 441 samples at 44.1kHz)
  const hopSize = Math.floor(sampleRate * 0.01); // 10ms hop
  const numHops = Math.floor(length / hopSize);
  const energy = new Float32Array(numHops);

  for (let h = 0; h < numHops; h++) {
    const start = h * hopSize;
    const end = Math.min(start + hopSize, length);
    let sum = 0;
    for (let i = start; i < end; i++) {
      sum += mono[i] * mono[i];
    }
    energy[h] = Math.sqrt(sum / (end - start));
  }

  // Spectral flux / Onset Novelty Curve (half-wave rectified difference)
  const onset = new Float32Array(numHops);
  for (let h = 1; h < numHops; h++) {
    const diff = energy[h] - energy[h - 1];
    onset[h] = diff > 0 ? diff : 0;
  }

  // 3. Detect Transient Peaks with dynamic threshold
  const windowRadius = 8; // ~80ms local context
  const transientPeaks: TransientPeak[] = [];
  let maxOnset = 0;
  for (let h = 0; h < numHops; h++) {
    if (onset[h] > maxOnset) maxOnset = onset[h];
  }

  const baseThreshold = Math.max(0.005, maxOnset * 0.15);

  for (let h = windowRadius; h < numHops - windowRadius; h++) {
    const current = onset[h];
    if (current < baseThreshold) continue;

    // Check if local maximum
    let isLocalMax = true;
    let localAvg = 0;
    for (let k = -windowRadius; k <= windowRadius; k++) {
      localAvg += onset[h + k];
      if (k !== 0 && onset[h + k] >= current) {
        isLocalMax = false;
        break;
      }
    }

    if (isLocalMax && current > (localAvg / (windowRadius * 2 + 1)) * 1.3) {
      const sampleIndex = h * hopSize;
      const timeSeconds = sampleIndex / sampleRate;
      transientPeaks.push({
        sampleIndex,
        timeSeconds,
        energy: current
      });
    }
  }

  // 4. Inter-Onset Interval (IOI) Histogram & Autocorrelation for Tempo
  const bpmMin = 65;
  const bpmMax = 185;
  const candidateBins: { bpm: number; score: number }[] = [];

  // Evaluate candidate BPMs in 0.5 BPM steps
  for (let bpm = bpmMin; bpm <= bpmMax; bpm += 0.5) {
    const beatInterval = 60 / bpm;
    let score = 0;

    // Cross-correlate with transient peaks
    for (let i = 0; i < Math.min(transientPeaks.length, 64); i++) {
      const t1 = transientPeaks[i].timeSeconds;
      const e1 = transientPeaks[i].energy;

      for (let j = i + 1; j < Math.min(transientPeaks.length, 64); j++) {
        const t2 = transientPeaks[j].timeSeconds;
        const e2 = transientPeaks[j].energy;
        const delta = t2 - t1;

        // Check if delta matches 1 beat, 2 beats, 4 beats, or half beat
        const beats = delta / beatInterval;
        const roundedBeats = Math.round(beats);

        if (roundedBeats >= 1 && roundedBeats <= 8) {
          const error = Math.abs(beats - roundedBeats);
          if (error < 0.08) {
            // Gaussian weight matching
            const weight = Math.exp(-((error * error) / (2 * 0.05 * 0.05)));
            score += weight * Math.sqrt(e1 * e2) * (1 / Math.sqrt(roundedBeats));
          }
        }
      }
    }

    // Bias towards common dance/acid/rock range (100-135 BPM)
    const centerBias = 1.0 + 0.15 * Math.exp(-Math.pow((bpm - 122) / 35, 2));
    candidateBins.push({ bpm, score: score * centerBias });
  }

  // Find peak candidate
  candidateBins.sort((a, b) => b.score - a.score);
  let bestBpm = candidateBins.length > 0 ? candidateBins[0].bpm : 120;

  // Round to nearest tenth or integer if very close
  if (Math.abs(bestBpm - Math.round(bestBpm)) < 0.15) {
    bestBpm = Math.round(bestBpm);
  } else {
    bestBpm = Number(bestBpm.toFixed(1));
  }

  const beatIntervalSeconds = 60 / bestBpm;
  const barLengthSeconds = beatIntervalSeconds * 4;

  // 5. Detect Initial Downbeat Chrono-Pin
  // The first strong transient within the first 1.5 seconds is the downbeat
  let downbeatSeconds = 0;
  let downbeatSample = 0;

  const earlyTransients = transientPeaks.filter(p => p.timeSeconds < 1.5);
  if (earlyTransients.length > 0) {
    // Sort by energy
    const strongestEarly = [...earlyTransients].sort((a, b) => b.energy - a.energy)[0];
    // But pick the earliest transient that has at least 60% of strongest early
    const firstLegit = earlyTransients.find(p => p.energy >= strongestEarly.energy * 0.55);
    if (firstLegit) {
      downbeatSeconds = firstLegit.timeSeconds;
      downbeatSample = firstLegit.sampleIndex;
    }
  }

  // 6. Generate per-measure Chrono-Pins across all measures (snapping subtly to nearby strong transients)
  const totalDuration = length / sampleRate;
  const durationAfterDownbeat = totalDuration - downbeatSeconds;
  const totalBars = Math.max(1, Math.round(durationAfterDownbeat / barLengthSeconds));

  const chronoPins: ChronoPin[] = [];

  // Downbeat Chrono-Pin (Pin 1.1)
  chronoPins.push({
    id: 'pin-downbeat-1-1',
    label: 'Downbeat (Bar 1.1)',
    timeSeconds: Number(downbeatSeconds.toFixed(4)),
    targetTimeSeconds: Number(downbeatSeconds.toFixed(4)),
    measure: 1,
    beat: 1,
    isDownbeat: true,
    isLocked: true
  });

  // Measure Chrono-Pins for every measure (Bar 2.1, Bar 3.1, ... up to 64 bars)
  const maxMeasurePins = Math.min(64, totalBars + 1);
  for (let m = 2; m <= maxMeasurePins; m++) {
    const idealTime = downbeatSeconds + (m - 1) * barLengthSeconds;
    if (idealTime <= totalDuration - 0.02) {
      // Snap gently to a prominent onset within +-35ms so measure pins track real rubato/drift
      let detectedTime = idealTime;
      let nearestEnergy = 0;
      let bestDist = 0.035;
      for (const tp of transientPeaks) {
        const dist = Math.abs(tp.timeSeconds - idealTime);
        if (dist < bestDist) {
          bestDist = dist;
          detectedTime = tp.timeSeconds;
          nearestEnergy = tp.energy;
        }
      }

      chronoPins.push({
        id: `pin-measure-${m}`,
        label: `ChronoPin Bar ${m}.1`,
        timeSeconds: Number(detectedTime.toFixed(4)),
        targetTimeSeconds: Number(idealTime.toFixed(4)),
        measure: m,
        beat: 1,
        isDownbeat: false,
        isLocked: false,
        transientEnergy: nearestEnergy > 0 ? Number(nearestEnergy.toFixed(4)) : undefined
      });
    }
  }

  return {
    detectedBpm: bestBpm,
    confidence: candidateBins[0]?.score > 10 ? 0.92 : 0.75,
    downbeatSeconds,
    downbeatSample,
    beatIntervalSeconds,
    barLengthSeconds,
    totalBars,
    chronoPins,
    waveformPeaks,
    transientPeaks
  };
}

/**
 * Synthesizes high-fidelity rhythmic demo audio for instant ChronoMap testing
 */
export function createSyntheticDemoAudio(
  style: 'acid_breakbeat' | 'house_groove' | 'hiphop_boom' | 'synthwave_arp',
  sampleRate: number = 44100
): { buffer: AudioBuffer; nominalBpm: number; title: string } {
  let nominalBpm = 126;
  let totalBars = 4;
  let title = 'Strangelet Breakbeat 126 BPM';

  if (style === 'house_groove') {
    nominalBpm = 124;
    totalBars = 4;
    title = 'Chicago House Beat 124 BPM';
  } else if (style === 'hiphop_boom') {
    nominalBpm = 94;
    totalBars = 4;
    title = 'Boom-Bap Drum Break 94 BPM';
  } else if (style === 'synthwave_arp') {
    nominalBpm = 118;
    totalBars = 4;
    title = 'Synthwave 1984 Groove 118 BPM';
  }

  const secondsPerBeat = 60 / nominalBpm;
  const barSeconds = secondsPerBeat * 4;
  const totalSeconds = totalBars * barSeconds;
  const totalSamples = Math.floor(totalSeconds * sampleRate);

  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const tempCtx = new AudioCtx();
  const buffer = tempCtx.createBuffer(2, totalSamples, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Synthesize drum hits and bass pulses
  const totalBeats = totalBars * 4;
  const stepsPerBeat = 4; // 16th notes
  const totalSteps = totalBeats * stepsPerBeat;
  const stepSeconds = secondsPerBeat / stepsPerBeat;

  for (let step = 0; step < totalSteps; step++) {
    const stepTime = step * stepSeconds;
    const stepSample = Math.floor(stepTime * sampleRate);
    const beatIndex = Math.floor(step / stepsPerBeat) % 4; // 0, 1, 2, 3
    const subStep = step % stepsPerBeat; // 0, 1, 2, 3

    // 1. Kick Drum: on beats 1 and 3 (or all 4 in house)
    const isKick = style === 'house_groove' 
      ? subStep === 0 
      : (beatIndex === 0 || beatIndex === 2 || (style === 'acid_breakbeat' && step % 16 === 10)) && subStep === 0;

    if (isKick) {
      const kickDuration = Math.floor(0.28 * sampleRate);
      for (let s = 0; s < kickDuration && stepSample + s < totalSamples; s++) {
        const t = s / sampleRate;
        // Pitch drop from 150Hz -> 45Hz
        const freq = 45 + 105 * Math.exp(-t * 28);
        const env = Math.exp(-t * 12);
        const val = Math.sin(2 * Math.PI * freq * t) * env * 0.85;
        left[stepSample + s] += val;
        right[stepSample + s] += val;
      }
    }

    // 2. Snare Drum: on beats 2 and 4
    const isSnare = (beatIndex === 1 || beatIndex === 3) && subStep === 0;
    if (isSnare) {
      const snareDuration = Math.floor(0.22 * sampleRate);
      for (let s = 0; s < snareDuration && stepSample + s < totalSamples; s++) {
        const t = s / sampleRate;
        const tone = Math.sin(2 * Math.PI * 185 * t) * Math.exp(-t * 20) * 0.4;
        const noise = (Math.random() * 2 - 1) * Math.exp(-t * 14) * 0.55;
        const val = tone + noise;
        left[stepSample + s] += val;
        right[stepSample + s] += val;
      }
    }

    // 3. Hi-Hat: 16th notes or 8th notes
    const isHat = subStep % 2 === 0 || style === 'acid_breakbeat';
    if (isHat) {
      const hatDuration = Math.floor(0.045 * sampleRate);
      const isAccent = subStep === 2; // upbeat open hat feel
      const amp = isAccent ? 0.35 : 0.18;
      for (let s = 0; s < hatDuration && stepSample + s < totalSamples; s++) {
        const t = s / sampleRate;
        const noise = (Math.random() * 2 - 1) * Math.exp(-t * 70) * amp;
        left[stepSample + s] += noise * 0.8;
        right[stepSample + s] += noise * 1.1; // subtle stereo spread
      }
    }

    // 4. Bass or Acid Synth Arp
    if (subStep === 0 || subStep === 2) {
      const noteFreqs = [55, 55, 65.41, 73.42, 82.41, 98.0, 110];
      const noteFreq = noteFreqs[(step + 2) % noteFreqs.length];
      const bassDuration = Math.floor(0.12 * sampleRate);
      for (let s = 0; s < bassDuration && stepSample + s < totalSamples; s++) {
        const t = s / sampleRate;
        const env = Math.exp(-t * 10);
        // Resonant Sawtooth / Square
        const val = (Math.sin(2 * Math.PI * noteFreq * t) + 0.5 * Math.sin(4 * Math.PI * noteFreq * t)) * env * 0.28;
        left[stepSample + s] += val;
        right[stepSample + s] += val;
      }
    }
  }

  // Soft clip normalization
  for (let i = 0; i < totalSamples; i++) {
    left[i] = Math.max(-0.95, Math.min(0.95, left[i]));
    right[i] = Math.max(-0.95, Math.min(0.95, right[i]));
  }

  return { buffer, nominalBpm, title };
}

/**
 * Calculates new BPM based on the time distance between two Chrono-Pins
 */
export function calculateBpmFromPins(
  pin1: ChronoPin,
  pin2: ChronoPin
): number {
  const timeDelta = Math.abs(pin2.timeSeconds - pin1.timeSeconds);
  if (timeDelta <= 0.05) return 120;

  // Total beats between pins: measure difference * 4 + beat difference
  const totalBeats1 = (pin1.measure - 1) * 4 + (pin1.beat - 1);
  const totalBeats2 = (pin2.measure - 1) * 4 + (pin2.beat - 1);
  const beatsDelta = Math.abs(totalBeats2 - totalBeats1);

  if (beatsDelta === 0) return 120;

  const rawBpm = (beatsDelta * 60) / timeDelta;
  return Number(rawBpm.toFixed(2));
}

/**
 * High-precision Web Audio Metronome click
 */
export function playMetronomeClick(
  ctx: AudioContext,
  time: number,
  isDownbeat: boolean,
  volume: number = 0.6
) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Downbeat click is 1800Hz; other beats are 900Hz
    const freq = isDownbeat ? 1800 : 900;
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(isDownbeat ? volume * 1.0 : volume * 0.65, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + 0.045);
  } catch (e) {
    console.warn('Metronome click error', e);
  }
}
