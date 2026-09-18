// Web Audio DSP Engine for Suno AI De-Sheen, Anti-Fizz & Un-Bake Mastering

import { SunoMasteringSettings } from '../types';

export const DEFAULT_MASTERING_SETTINGS: SunoMasteringSettings = {
  antiSheenAmount: 0.60, // 60% anti-sheen high-shelf & notch attenuation
  deMudAmount: 0.45,      // 45% mid boxiness cut (~410Hz)
  subMonoFreq: 110,      // Mono below 110Hz
  tapeWarmth: 0.35,      // Calibrated warm analog saturation (sub-protected)
  transientPunch: 0.45,  // Dynamic transient punch
  stereoAir: 1.5,        // +1.5dB silky air above 13kHz
  targetLufs: -14,
  outputGain: 0.5,       // Clean +0.5 dB drive into peak limiter
  bypass: false
};

// Generates a smooth, musical hyperbolic tangent saturation curve for WaveShaperNode
// Strictly bounded to [-1, 1] with zero sharp discontinuities to prevent digital clipping
export function createTapeSaturationCurve(warmth: number, samples: number = 2048): Float32Array {
  const curve = new Float32Array(samples);
  const clampedWarmth = Math.max(0, Math.min(1, warmth));

  if (clampedWarmth < 0.01) {
    for (let i = 0; i < samples; i++) {
      curve[i] = (i * 2) / (samples - 1) - 1;
    }
    return curve;
  }

  // Drive factor: subtle harmonic saturation (drive between 1.05 and 2.2)
  const drive = 1.0 + clampedWarmth * 1.2;
  const norm = Math.tanh(drive);

  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / (samples - 1) - 1; // -1 to +1
    // Hyperbolic tangent soft saturation normalized to unity peak
    curve[i] = Math.tanh(x * drive) / norm;
  }
  return curve;
}

// Builds the real-time mastering Web Audio graph
export interface MasteringGraphNodes {
  inputNode: GainNode;
  highPassNode: BiquadFilterNode;
  deMudNode: BiquadFilterNode;
  antiSheenNode: BiquadFilterNode;
  antiSheenNotchNode: BiquadFilterNode;
  subSplitLowPass: BiquadFilterNode;
  subSplitHighPass: BiquadFilterNode;
  tapeShaperNode: WaveShaperNode;
  satSumNode: GainNode;
  airNode: BiquadFilterNode;
  makeUpGainNode: GainNode;
  limiterNode: DynamicsCompressorNode;
  ceilingNode: GainNode;
  outputNode: GainNode;
  dryGainNode: GainNode;
  wetGainNode: GainNode;
  analyserNode: AnalyserNode;
}

export function buildMasteringGraph(
  ctx: AudioContext | OfflineAudioContext,
  settings: SunoMasteringSettings
): MasteringGraphNodes {
  const inputNode = ctx.createGain();
  const analyserNode = ctx.createAnalyser();
  analyserNode.fftSize = 512;
  analyserNode.smoothingTimeConstant = 0.8;

  // Wet / Dry crossover for instant A/B bypass
  const wetGainNode = ctx.createGain();
  const dryGainNode = ctx.createGain();
  wetGainNode.gain.value = settings.bypass ? 0 : 1;
  dryGainNode.gain.value = settings.bypass ? 1 : 0;

  // 1. Subsonic High Pass (cleans DC offset and inaudible sub rumble below 30 Hz)
  const highPassNode = ctx.createBiquadFilter();
  highPassNode.type = 'highpass';
  highPassNode.frequency.value = 30;
  highPassNode.Q.value = 0.707;

  // 2. De-Mud Filter: cuts congested boxy mid mud (~390Hz - 440Hz)
  const deMudNode = ctx.createBiquadFilter();
  deMudNode.type = 'peaking';
  deMudNode.frequency.value = 410;
  deMudNode.Q.value = 1.3;
  deMudNode.gain.value = -5.5 * settings.deMudAmount;

  // 3. Anti-Sheen High-Shelf Filter: smooth de-harshing on 7.8kHz - 11.5kHz
  const antiSheenNode = ctx.createBiquadFilter();
  antiSheenNode.type = 'highshelf';
  antiSheenNode.frequency.value = 8200;
  antiSheenNode.gain.value = -6.5 * settings.antiSheenAmount;

  // 3b. Anti-Sheen Narrow Notch Filter: tames sharp metallic comb-filter whistle at 8.1kHz
  const antiSheenNotchNode = ctx.createBiquadFilter();
  antiSheenNotchNode.type = 'peaking';
  antiSheenNotchNode.frequency.value = 8100;
  antiSheenNotchNode.Q.value = 3.2;
  antiSheenNotchNode.gain.value = -3.5 * settings.antiSheenAmount;

  // 4. Sub-Protected Tape Warmth (Crossover split at 130 Hz)
  // Sub-bass fundamental (< 130 Hz) stays 100% clean and linear without distortion
  const subSplitLowPass = ctx.createBiquadFilter();
  subSplitLowPass.type = 'lowpass';
  subSplitLowPass.frequency.value = 130;
  subSplitLowPass.Q.value = 0.707;

  // Low-mids, mids, and highs (> 130 Hz) receive rich tape saturation harmonics
  const subSplitHighPass = ctx.createBiquadFilter();
  subSplitHighPass.type = 'highpass';
  subSplitHighPass.frequency.value = 130;
  subSplitHighPass.Q.value = 0.707;

  const tapeShaperNode = ctx.createWaveShaper();
  tapeShaperNode.curve = createTapeSaturationCurve(settings.tapeWarmth);
  tapeShaperNode.oversample = '2x';

  const satSumNode = ctx.createGain();
  satSumNode.gain.value = 1.0;

  // 5. Silky Air High-Shelf above 13.2kHz (restores sweet sparkle without harshness)
  const airNode = ctx.createBiquadFilter();
  airNode.type = 'highshelf';
  airNode.frequency.value = 13200;
  airNode.gain.value = Math.max(0, settings.stereoAir);

  // 6. Pre-Limiter Drive & Level Staging (Placed BEFORE limiter for safe, unclipped punch)
  const makeUpGainNode = ctx.createGain();
  const linearDrive = Math.pow(10, (settings.outputGain || 0) / 20);
  makeUpGainNode.gain.value = linearDrive;

  // 7. Brickwall Mastering Peak Limiter (prevents digital clipping, controls dynamics)
  const limiterNode = ctx.createDynamicsCompressor();
  limiterNode.threshold.value = settings.targetLufs === -7 ? -6.5 : settings.targetLufs === -9 ? -4.0 : -2.0;
  limiterNode.knee.value = 1.5;
  limiterNode.ratio.value = 20;
  limiterNode.attack.value = 0.001; // 1 ms peak catch
  limiterNode.release.value = 0.08; // 80 ms clean recovery

  // 8. True Peak Safety Ceiling (-0.35 dBFS headroom)
  const ceilingNode = ctx.createGain();
  ceilingNode.gain.value = 0.96; // -0.35 dBFS ceiling to prevent inter-sample clipping

  // Final Output Node
  const outputNode = ctx.createGain();

  // WET Chain Routing:
  // input -> highPass -> deMud -> antiSheen -> antiSheenNotch
  inputNode.connect(highPassNode);
  highPassNode.connect(deMudNode);
  deMudNode.connect(antiSheenNode);
  antiSheenNode.connect(antiSheenNotchNode);

  // -> Crossover Split:
  // Sub branch (Clean punch):
  antiSheenNotchNode.connect(subSplitLowPass);
  subSplitLowPass.connect(satSumNode);

  // Mids/Highs branch (Tape Warmth):
  antiSheenNotchNode.connect(subSplitHighPass);
  subSplitHighPass.connect(tapeShaperNode);
  tapeShaperNode.connect(satSumNode);

  // -> Air -> Pre-Limiter Drive -> Brickwall Limiter -> True Peak Ceiling -> Wet Gain -> Output
  satSumNode.connect(airNode);
  airNode.connect(makeUpGainNode);
  makeUpGainNode.connect(limiterNode);
  limiterNode.connect(ceilingNode);
  ceilingNode.connect(wetGainNode);
  wetGainNode.connect(outputNode);

  // DRY Chain Routing (Instant A/B Bypass):
  inputNode.connect(dryGainNode);
  dryGainNode.connect(outputNode);

  // Tap output into visualizer analyser
  outputNode.connect(analyserNode);

  return {
    inputNode,
    highPassNode,
    deMudNode,
    antiSheenNode,
    antiSheenNotchNode,
    subSplitLowPass,
    subSplitHighPass,
    tapeShaperNode,
    satSumNode,
    airNode,
    makeUpGainNode,
    limiterNode,
    ceilingNode,
    outputNode,
    dryGainNode,
    wetGainNode,
    analyserNode
  };
}

// Renders an AudioBuffer through the mastering chain and returns a clean 16-bit WAV Blob
export async function renderDeSheenedMasterWav(
  audioBuffer: AudioBuffer,
  settings: SunoMasteringSettings
): Promise<Blob> {
  const offlineCtx = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;

  const graph = buildMasteringGraph(offlineCtx, { ...settings, bypass: false });
  source.connect(graph.inputNode);
  graph.outputNode.connect(offlineCtx.destination);

  source.start(0);
  const renderedBuffer = await offlineCtx.startRendering();

  return audioBufferToWav(renderedBuffer);
}

// Converts AudioBuffer to standard PCM 16-bit stereo/mono WAV Blob
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const channels: Float32Array[] = [];
  let sampleRate = buffer.sampleRate;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    out.setUint16(pos, data, true);
    pos += 2;
  }
  function setUint32(data: number) {
    out.setUint32(pos, data, true);
    pos += 4;
  }

  // RIFF header
  out.setUint8(pos++, 0x52); out.setUint8(pos++, 0x49); out.setUint8(pos++, 0x46); out.setUint8(pos++, 0x46); // 'RIFF'
  setUint32(length - 8);
  out.setUint8(pos++, 0x57); out.setUint8(pos++, 0x41); out.setUint8(pos++, 0x56); out.setUint8(pos++, 0x45); // 'WAVE'

  // fmt sub-chunk
  out.setUint8(pos++, 0x66); out.setUint8(pos++, 0x6d); out.setUint8(pos++, 0x74); out.setUint8(pos++, 0x20); // 'fmt '
  setUint32(16); // subchunk1size (16 for PCM)
  setUint16(1);  // audioFormat 1 = PCM
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan); // byteRate
  setUint16(numOfChan * 2);              // blockAlign
  setUint16(16);                         // bitsPerSample

  // data sub-chunk
  out.setUint8(pos++, 0x64); out.setUint8(pos++, 0x61); out.setUint8(pos++, 0x74); out.setUint8(pos++, 0x61); // 'data'
  setUint32(length - pos - 4);

  // Write channel data interleaved
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = channels[i][offset];
      sample = Math.max(-1, Math.min(1, sample)); // Clamp
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out.buffer], { type: 'audio/wav' });
}

// Synthesizes a demo AI audio buffer with realistic Suno characteristics (metallic sheen, boxy mids)
// Carefully gain-staged with -3.1 dBFS headroom to prevent digital distortion
export function generateSyntheticSunoSample(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const duration = 6.0; // 6 seconds loop (3 bars at 120 bpm)
  const length = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(2, length, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Chords: Am -> F -> C -> G
  const chordFreqs = [
    [220, 261.63, 329.63, 440],     // Am
    [174.61, 220, 261.63, 349.23],  // F
    [130.81, 164.81, 196, 261.63],  // C
    [196, 246.94, 293.66, 392]       // G
  ];

  let maxPeak = 0.0001;

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const chordIdx = Math.floor((t / (duration / 4)) % 4);
    const chord = chordFreqs[chordIdx];
    const barProgress = (t / (duration / 4)) % 1;

    let sigL = 0;
    let sigR = 0;

    // 1. Clean, punchy sub-bass fundamental (chord root / 2) with smooth envelope
    const bassFreq = chord[0] / 2;
    const bassEnv = Math.sin(Math.PI * Math.max(0, Math.min(1, barProgress)));
    const bass = Math.sin(2 * Math.PI * bassFreq * t) * 0.20 * bassEnv;
    sigL += bass;
    sigR += bass;

    // 2. Warm musical polyphonic chords with stereo spread
    chord.forEach((freq, idx) => {
      const pan = (idx % 2 === 0 ? 0.72 : 0.28);
      const tone = Math.sin(2 * Math.PI * freq * t) * 0.06;
      sigL += tone * pan;
      sigR += tone * (1 - pan);
    });

    // 3. Realistic Suno AI artifacts (to be cleaned by the de-sheen master chain):
    // Metallic phasey comb-filtering around 8.1kHz - 9.4kHz
    const sheenFlutter = 0.8 + 0.2 * Math.sin(2 * Math.PI * 3.5 * t);
    const metallicFizz = (
      Math.sin(2 * Math.PI * 8120 * t) * 0.045 +
      Math.sin(2 * Math.PI * 9340 * t) * 0.035 +
      (Math.random() - 0.5) * 0.02
    ) * sheenFlutter;

    // "Baked mid congestion" resonance around 415Hz
    const muddyMids = Math.sin(2 * Math.PI * 415 * t) * 0.07;

    // 4. Tight kick drum with pitch envelope on 4-on-the-floor beats (120 bpm -> 0.5s per beat)
    const beatTime = (t * 2) % 1;
    let kick = 0;
    if (beatTime < 0.14) {
      const kEnv = Math.exp(-beatTime * 32);
      const kFreq = 48 + 90 * Math.exp(-beatTime * 45);
      kick = Math.sin(2 * Math.PI * kFreq * beatTime) * 0.26 * kEnv;
    }

    // 5. Snare on beats 2 and 4
    const beatNum = Math.floor(t * 2) % 4;
    let snare = 0;
    if ((beatNum === 1 || beatNum === 3) && beatTime < 0.16) {
      const sEnv = Math.exp(-beatTime * 22);
      const sNoise = (Math.random() - 0.5) * 0.16 * sEnv;
      const sTone = Math.sin(2 * Math.PI * 185 * beatTime) * 0.10 * sEnv;
      snare = sNoise + sTone;
    }

    sigL += kick + snare + metallicFizz + muddyMids;
    sigR += kick + snare + (metallicFizz * 0.88) + muddyMids;

    left[i] = sigL;
    right[i] = sigR;

    const absL = Math.abs(sigL);
    const absR = Math.abs(sigR);
    if (absL > maxPeak) maxPeak = absL;
    if (absR > maxPeak) maxPeak = absR;
  }

  // Normalize entire buffer to precisely -3.1 dBFS (0.70 peak) to guarantee clean headroom
  const targetPeak = 0.70;
  const normGain = maxPeak > 0 ? (targetPeak / maxPeak) : 0.7;
  for (let i = 0; i < length; i++) {
    left[i] = Math.max(-0.95, Math.min(0.95, left[i] * normGain));
    right[i] = Math.max(-0.95, Math.min(0.95, right[i] * normGain));
  }

  return buffer;
}
