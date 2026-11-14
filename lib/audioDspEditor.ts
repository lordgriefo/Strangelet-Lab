// Pure Web Audio PCM & Waveform Peak DSP Helpers for AudioEditor
import { ChronoPin } from '../types';

export type LoopCrossfadeCurve = 'equal_power' | 'linear' | 's_curve';
export type LoopCrossfadeStyle = 'overlap_loop' | 'edge_fades';

export interface DspWaveformData {
  peaks: number[];
  buffer: AudioBuffer | null;
}

/**
 * Compute normalized visual peak envelope (0..1) from an AudioBuffer.
 */
export function extractWaveformPeaks(buffer: AudioBuffer, targetBars: number = 360): number[] {
  const numChannels = buffer.numberOfChannels;
  const totalSamples = buffer.length;
  if (totalSamples === 0 || numChannels === 0) return [];

  const bars = Math.max(32, Math.min(targetBars, totalSamples));
  const blockSize = totalSamples / bars;
  const peaks: number[] = new Array(bars);

  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channelData.push(buffer.getChannelData(ch));
  }

  for (let i = 0; i < bars; i++) {
    const start = Math.floor(i * blockSize);
    const end = Math.min(totalSamples, Math.max(start + 1, Math.floor((i + 1) * blockSize)));
    let maxAbs = 0;
    const step = Math.max(1, Math.floor((end - start) / 64));
    for (let s = start; s < end; s += step) {
      let avgSample = 0;
      for (let ch = 0; ch < numChannels; ch++) {
        avgSample += Math.abs(channelData[ch][s]);
      }
      avgSample /= numChannels;
      if (avgSample > maxAbs) maxAbs = avgSample;
    }
    peaks[i] = Number(Math.max(0.002, Math.min(1, maxAbs)).toFixed(4));
  }

  return peaks;
}

/**
 * Synthesizes a clean musical PCM AudioBuffer shaped by waveform peaks when no decoded AudioBuffer exists yet.
 */
export function createSynthesizedBufferFromPeaks(
  ctx: BaseAudioContext,
  peaks: number[],
  durationSeconds: number,
  baseFreq: number = 130.81
): AudioBuffer {
  const sampleRate = ctx.sampleRate || 44100;
  const safeDur = Math.max(0.25, Math.min(32, durationSeconds));
  const length = Math.max(1024, Math.round(safeDur * sampleRate));
  const buffer = ctx.createBuffer(2, length, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const peakCount = Math.max(1, peaks.length);
  const twoPi = Math.PI * 2;

  for (let i = 0; i < length; i++) {
    const norm = i / length;
    const peakPos = norm * (peakCount - 1);
    const idx0 = Math.floor(peakPos);
    const idx1 = Math.min(peakCount - 1, idx0 + 1);
    const frac = peakPos - idx0;
    const amp = (peaks[idx0] * (1 - frac) + peaks[idx1] * frac) * 0.65;

    const t = i / sampleRate;
    const fundamental = Math.sin(twoPi * baseFreq * t);
    const fifth = Math.sin(twoPi * baseFreq * 1.498 * t) * 0.35;
    const octave = Math.sin(twoPi * baseFreq * 2 * t) * 0.22;
    const harmonic = Math.sin(twoPi * baseFreq * 3 * t) * 0.1;
    const sampleL = (fundamental + fifth + octave + harmonic) * amp * 0.55;
    const sampleR =
      (Math.sin(twoPi * baseFreq * t + 0.12) +
        Math.sin(twoPi * baseFreq * 1.498 * t - 0.1) * 0.35 +
        octave * 0.9 +
        harmonic) *
      amp *
      0.55;

    left[i] = Math.max(-1, Math.min(1, sampleL));
    right[i] = Math.max(-1, Math.min(1, sampleR));
  }

  return buffer;
}

/**
 * Clones an AudioBuffer into a fresh mutable AudioBuffer.
 */
export function cloneAudioBuffer(ctx: BaseAudioContext, source: AudioBuffer): AudioBuffer {
  const copy = ctx.createBuffer(source.numberOfChannels, source.length, source.sampleRate);
  for (let ch = 0; ch < source.numberOfChannels; ch++) {
    copy.getChannelData(ch).set(source.getChannelData(ch));
  }
  return copy;
}

/**
 * Evaluates crossfade curve weights [inWeight, outWeight] for t in [0, 1].
 */
export function evaluateCrossfadeWeights(
  t: number,
  curve: LoopCrossfadeCurve
): { inGain: number; outGain: number } {
  const clamped = Math.max(0, Math.min(1, t));
  switch (curve) {
    case 'linear':
      return { inGain: clamped, outGain: 1 - clamped };
    case 's_curve': {
      const s = clamped * clamped * (3 - 2 * clamped);
      return { inGain: s, outGain: 1 - s };
    }
    case 'equal_power':
    default: {
      const angle = clamped * (Math.PI / 2);
      return { inGain: Math.sin(angle), outGain: Math.cos(angle) };
    }
  }
}

/**
 * Applies a fluid Loop Crossfade across the start & end of an AudioBuffer.
 * - 'overlap_loop': takes the tail overlap zone and crossfades it seamlessly over the opening head,
 *   optionally preserving exact tempo duration (by gentle time-resampling back to original length)
 *   or trimming by overlap length.
 * - 'edge_fades': applies symmetric anti-click fade-in at start & fade-out at end keeping 100% timing.
 */
export function applyLoopCrossfadeToBuffer(
  ctx: BaseAudioContext,
  source: AudioBuffer,
  crossfadeMs: number,
  curve: LoopCrossfadeCurve = 'equal_power',
  style: LoopCrossfadeStyle = 'overlap_loop',
  preserveDuration: boolean = true
): AudioBuffer {
  const len = source.length;
  const sr = source.sampleRate;
  const requestedSamples = Math.round((Math.max(2, crossfadeMs) / 1000) * sr);
  const fadeSamples = Math.max(8, Math.min(Math.floor(len * 0.42), requestedSamples));

  if (style === 'edge_fades') {
    const out = cloneAudioBuffer(ctx, source);
    for (let ch = 0; ch < out.numberOfChannels; ch++) {
      const data = out.getChannelData(ch);
      for (let i = 0; i < fadeSamples; i++) {
        const tIn = i / Math.max(1, fadeSamples - 1);
        const { inGain } = evaluateCrossfadeWeights(tIn, curve);
        data[i] *= inGain;
        const tailIdx = len - 1 - i;
        if (tailIdx >= 0) {
          data[tailIdx] *= inGain;
        }
      }
    }
    return out;
  }

  // 'overlap_loop': Crossfade tail [len - fadeSamples, len) onto head [0, fadeSamples),
  // making the boundary [newLen - 1] -> [0] genuinely sample-continuous!
  const splicedLen = Math.max(64, len - fadeSamples);
  const tempSpliced = ctx.createBuffer(source.numberOfChannels, splicedLen, sr);

  for (let ch = 0; ch < source.numberOfChannels; ch++) {
    const src = source.getChannelData(ch);
    const dst = tempSpliced.getChannelData(ch);

    // Copy body first
    for (let i = fadeSamples; i < splicedLen; i++) {
      dst[i] = src[i];
    }

    // Overlap-blend tail [len - fadeSamples .. len) into head [0 .. fadeSamples)
    const tailStart = len - fadeSamples;
    for (let i = 0; i < fadeSamples; i++) {
      const t = i / Math.max(1, fadeSamples - 1);
      const { inGain, outGain } = evaluateCrossfadeWeights(t, curve);
      const headSample = src[i];
      const tailSample = src[tailStart + i];
      dst[i] = Math.max(-1, Math.min(1, headSample * inGain + tailSample * outGain));
    }
  }

  if (!preserveDuration) {
    return tempSpliced;
  }

  // Resample splicedLen smoothly back to original `len` so BPM/bar length stays locked to the timeline grid
  const preserved = ctx.createBuffer(source.numberOfChannels, len, sr);
  for (let ch = 0; ch < source.numberOfChannels; ch++) {
    const src = tempSpliced.getChannelData(ch);
    const dst = preserved.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const srcPos = (i / Math.max(1, len - 1)) * (splicedLen - 1);
      const idx0 = Math.floor(srcPos);
      const idx1 = Math.min(splicedLen - 1, idx0 + 1);
      const frac = srcPos - idx0;
      dst[i] = src[idx0] * (1 - frac) + src[idx1] * frac;
    }
  }
  return preserved;
}

/**
 * Applies Loop Crossfade directly to visual peaks array (for synchronized instant visual feedback).
 */
export function applyLoopCrossfadeToPeaks(
  peaks: number[],
  crossfadeRatio: number,
  curve: LoopCrossfadeCurve = 'equal_power',
  style: LoopCrossfadeStyle = 'overlap_loop'
): number[] {
  const n = peaks.length;
  if (n < 8) return [...peaks];
  const fadeBars = Math.max(2, Math.min(Math.floor(n * 0.42), Math.round(crossfadeRatio * n)));
  const out = [...peaks];

  if (style === 'edge_fades') {
    for (let i = 0; i < fadeBars; i++) {
      const t = i / Math.max(1, fadeBars - 1);
      const { inGain } = evaluateCrossfadeWeights(t, curve);
      out[i] = Number(Math.max(0.002, peaks[i] * inGain).toFixed(4));
      out[n - 1 - i] = Number(Math.max(0.002, peaks[n - 1 - i] * inGain).toFixed(4));
    }
    return out;
  }

  // Overlap loop visual blend preserving length n
  const splicedLen = Math.max(8, n - fadeBars);
  const spliced = new Array<number>(splicedLen);
  for (let i = fadeBars; i < splicedLen; i++) {
    spliced[i] = peaks[i];
  }
  const tailStart = n - fadeBars;
  for (let i = 0; i < fadeBars; i++) {
    const t = i / Math.max(1, fadeBars - 1);
    const { inGain, outGain } = evaluateCrossfadeWeights(t, curve);
    spliced[i] = Math.min(1, peaks[i] * inGain + peaks[tailStart + i] * outGain);
  }
  for (let i = 0; i < n; i++) {
    const pos = (i / Math.max(1, n - 1)) * (splicedLen - 1);
    const idx0 = Math.floor(pos);
    const idx1 = Math.min(splicedLen - 1, idx0 + 1);
    const frac = pos - idx0;
    out[i] = Number(Math.max(0.002, spliced[idx0] * (1 - frac) + spliced[idx1] * frac).toFixed(4));
  }
  return out;
}

/**
 * Helper to resolve sample range [startIdx, endIdx) for normalized region [0..1].
 */
function resolveSampleRange(length: number, range?: { start: number; end: number } | null): [number, number] {
  if (!range || Math.abs(range.end - range.start) < 0.005) {
    return [0, length];
  }
  const s = Math.max(0, Math.min(length - 1, Math.floor(Math.min(range.start, range.end) * length)));
  const e = Math.max(s + 1, Math.min(length, Math.ceil(Math.max(range.start, range.end) * length)));
  return [s, e];
}

export function applyFadeInToBuffer(
  ctx: BaseAudioContext,
  source: AudioBuffer,
  curve: LoopCrossfadeCurve = 'equal_power',
  range?: { start: number; end: number } | null
): AudioBuffer {
  const out = cloneAudioBuffer(ctx, source);
  const [s, e] = resolveSampleRange(out.length, range);
  const span = Math.max(1, e - s - 1);
  for (let ch = 0; ch < out.numberOfChannels; ch++) {
    const data = out.getChannelData(ch);
    for (let i = s; i < e; i++) {
      const { inGain } = evaluateCrossfadeWeights((i - s) / span, curve);
      data[i] *= inGain;
    }
  }
  return out;
}

export function applyFadeOutToBuffer(
  ctx: BaseAudioContext,
  source: AudioBuffer,
  curve: LoopCrossfadeCurve = 'equal_power',
  range?: { start: number; end: number } | null
): AudioBuffer {
  const out = cloneAudioBuffer(ctx, source);
  const [s, e] = resolveSampleRange(out.length, range);
  const span = Math.max(1, e - s - 1);
  for (let ch = 0; ch < out.numberOfChannels; ch++) {
    const data = out.getChannelData(ch);
    for (let i = s; i < e; i++) {
      const { outGain } = evaluateCrossfadeWeights((i - s) / span, curve);
      data[i] *= outGain;
    }
  }
  return out;
}

export function applyGainDbToBuffer(
  ctx: BaseAudioContext,
  source: AudioBuffer,
  gainDb: number,
  range?: { start: number; end: number } | null
): AudioBuffer {
  const out = cloneAudioBuffer(ctx, source);
  const [s, e] = resolveSampleRange(out.length, range);
  const linear = Math.pow(10, gainDb / 20);
  for (let ch = 0; ch < out.numberOfChannels; ch++) {
    const data = out.getChannelData(ch);
    for (let i = s; i < e; i++) {
      data[i] = Math.max(-1, Math.min(1, data[i] * linear));
    }
  }
  return out;
}

export function normalizeBuffer(
  ctx: BaseAudioContext,
  source: AudioBuffer,
  targetDb: number = -0.3,
  range?: { start: number; end: number } | null
): AudioBuffer {
  const out = cloneAudioBuffer(ctx, source);
  const [s, e] = resolveSampleRange(out.length, range);
  let maxPeak = 0;
  for (let ch = 0; ch < out.numberOfChannels; ch++) {
    const data = out.getChannelData(ch);
    for (let i = s; i < e; i++) {
      const abs = Math.abs(data[i]);
      if (abs > maxPeak) maxPeak = abs;
    }
  }
  if (maxPeak < 1e-5) return out;
  const targetLinear = Math.pow(10, targetDb / 20);
  const scale = targetLinear / maxPeak;
  for (let ch = 0; ch < out.numberOfChannels; ch++) {
    const data = out.getChannelData(ch);
    for (let i = s; i < e; i++) {
      data[i] = Math.max(-1, Math.min(1, data[i] * scale));
    }
  }
  return out;
}

export function reverseBuffer(
  ctx: BaseAudioContext,
  source: AudioBuffer,
  range?: { start: number; end: number } | null
): AudioBuffer {
  const out = cloneAudioBuffer(ctx, source);
  const [s, e] = resolveSampleRange(out.length, range);
  for (let ch = 0; ch < out.numberOfChannels; ch++) {
    const data = out.getChannelData(ch);
    let left = s;
    let right = e - 1;
    while (left < right) {
      const tmp = data[left];
      data[left] = data[right];
      data[right] = tmp;
      left++;
      right--;
    }
  }
  return out;
}

export function invertPolarityBuffer(
  ctx: BaseAudioContext,
  source: AudioBuffer,
  range?: { start: number; end: number } | null
): AudioBuffer {
  const out = cloneAudioBuffer(ctx, source);
  const [s, e] = resolveSampleRange(out.length, range);
  for (let ch = 0; ch < out.numberOfChannels; ch++) {
    const data = out.getChannelData(ch);
    for (let i = s; i < e; i++) {
      data[i] = -data[i];
    }
  }
  return out;
}

export function removeDcOffsetBuffer(
  ctx: BaseAudioContext,
  source: AudioBuffer,
  range?: { start: number; end: number } | null
): AudioBuffer {
  const out = cloneAudioBuffer(ctx, source);
  const [s, e] = resolveSampleRange(out.length, range);
  const count = Math.max(1, e - s);
  for (let ch = 0; ch < out.numberOfChannels; ch++) {
    const data = out.getChannelData(ch);
    let sum = 0;
    for (let i = s; i < e; i++) sum += data[i];
    const mean = sum / count;
    for (let i = s; i < e; i++) {
      data[i] = Math.max(-1, Math.min(1, data[i] - mean));
    }
  }
  return out;
}

export function silenceBufferRegion(
  ctx: BaseAudioContext,
  source: AudioBuffer,
  range: { start: number; end: number }
): AudioBuffer {
  const out = cloneAudioBuffer(ctx, source);
  const [s, e] = resolveSampleRange(out.length, range);
  const microFade = Math.min(64, Math.floor((e - s) / 4));
  for (let ch = 0; ch < out.numberOfChannels; ch++) {
    const data = out.getChannelData(ch);
    for (let i = s; i < e; i++) {
      if (i - s < microFade) {
        data[i] *= 1 - (i - s) / Math.max(1, microFade);
      } else if (e - 1 - i < microFade) {
        data[i] *= 1 - (e - 1 - i) / Math.max(1, microFade);
      } else {
        data[i] = 0;
      }
    }
  }
  return out;
}

export function sliceAudioBuffer(
  ctx: BaseAudioContext,
  source: AudioBuffer,
  range: { start: number; end: number }
): AudioBuffer {
  const [s, e] = resolveSampleRange(source.length, range);
  const sliceLen = Math.max(16, e - s);
  const out = ctx.createBuffer(source.numberOfChannels, sliceLen, source.sampleRate);
  for (let ch = 0; ch < source.numberOfChannels; ch++) {
    const src = source.getChannelData(ch);
    const dst = out.getChannelData(ch);
    dst.set(src.subarray(s, Math.min(source.length, s + sliceLen)));
  }
  return out;
}

export function deleteAudioBufferRegion(
  ctx: BaseAudioContext,
  source: AudioBuffer,
  range: { start: number; end: number }
): AudioBuffer {
  const [s, e] = resolveSampleRange(source.length, range);
  const remaining = Math.max(32, source.length - (e - s));
  const out = ctx.createBuffer(source.numberOfChannels, remaining, source.sampleRate);
  const microXfade = Math.min(48, s, source.length - e);
  for (let ch = 0; ch < source.numberOfChannels; ch++) {
    const src = source.getChannelData(ch);
    const dst = out.getChannelData(ch);
    dst.set(src.subarray(0, s), 0);
    if (e < source.length) {
      dst.set(src.subarray(e), s);
    }
    // Micro-smooth splice point at `s` to prevent click
    for (let k = 0; k < microXfade; k++) {
      const t = k / Math.max(1, microXfade - 1);
      const idx = Math.max(0, s - Math.floor(microXfade / 2) + k);
      if (idx < dst.length) {
        dst[idx] *= 0.85 + 0.15 * Math.cos((t - 0.5) * Math.PI);
      }
    }
  }
  return out;
}

export function insertAudioBufferAt(
  ctx: BaseAudioContext,
  target: AudioBuffer,
  insert: AudioBuffer,
  normalizedPosition: number
): AudioBuffer {
  const pos = Math.max(0, Math.min(target.length, Math.round(normalizedPosition * target.length)));
  const totalLen = target.length + insert.length;
  const out = ctx.createBuffer(target.numberOfChannels, totalLen, target.sampleRate);
  for (let ch = 0; ch < target.numberOfChannels; ch++) {
    const srcTarget = target.getChannelData(ch);
    const srcInsert = insert.getChannelData(Math.min(ch, insert.numberOfChannels - 1));
    const dst = out.getChannelData(ch);
    if (pos > 0) dst.set(srcTarget.subarray(0, pos), 0);
    dst.set(srcInsert, pos);
    if (pos < target.length) dst.set(srcTarget.subarray(pos), pos + insert.length);
  }
  return out;
}

export function concatAudioBuffers(
  ctx: BaseAudioContext,
  a: AudioBuffer,
  b: AudioBuffer,
  crossfadeSamples: number = 64
): AudioBuffer {
  const overlap = Math.max(0, Math.min(crossfadeSamples, Math.floor(a.length * 0.2), Math.floor(b.length * 0.2)));
  const totalLen = a.length + b.length - overlap;
  const out = ctx.createBuffer(a.numberOfChannels, totalLen, a.sampleRate);
  for (let ch = 0; ch < a.numberOfChannels; ch++) {
    const srcA = a.getChannelData(ch);
    const srcB = b.getChannelData(Math.min(ch, b.numberOfChannels - 1));
    const dst = out.getChannelData(ch);
    dst.set(srcA.subarray(0, a.length - overlap), 0);
    for (let i = 0; i < overlap; i++) {
      const t = i / Math.max(1, overlap - 1);
      const { inGain, outGain } = evaluateCrossfadeWeights(t, 'equal_power');
      dst[a.length - overlap + i] = srcA[a.length - overlap + i] * outGain + srcB[i] * inGain;
    }
    dst.set(srcB.subarray(overlap), a.length);
  }
  return out;
}

/**
 * Resamples buffer playback speed / varispeed pitch by `speedFactor` (e.g., 0.5 = half speed, 2.0 = double speed).
 */
export function varispeedBuffer(
  ctx: BaseAudioContext,
  source: AudioBuffer,
  speedFactor: number
): AudioBuffer {
  const safeSpeed = Math.max(0.25, Math.min(4.0, speedFactor));
  const newLength = Math.max(64, Math.round(source.length / safeSpeed));
  const out = ctx.createBuffer(source.numberOfChannels, newLength, source.sampleRate);
  for (let ch = 0; ch < source.numberOfChannels; ch++) {
    const src = source.getChannelData(ch);
    const dst = out.getChannelData(ch);
    for (let i = 0; i < newLength; i++) {
      const pos = i * safeSpeed;
      const idx0 = Math.min(source.length - 1, Math.floor(pos));
      const idx1 = Math.min(source.length - 1, idx0 + 1);
      const frac = pos - idx0;
      dst[i] = src[idx0] * (1 - frac) + src[idx1] * frac;
    }
  }
  return out;
}

/**
 * Pitch-preserving WSOLA (Waveform Similarity Overlap-Add) time-stretcher.
 * `stretchFactor` > 1.0 lengthens duration (slower playback speed = 1 / stretchFactor);
 * `stretchFactor` < 1.0 shortens duration (faster playback speed = 1 / stretchFactor);
 * Maintains original pitch when `preservePitch` is true.
 */
export function timeStretchBufferPreservePitch(
  ctx: BaseAudioContext,
  source: AudioBuffer,
  stretchFactor: number,
  preservePitch: boolean = true
): AudioBuffer {
  const safeStretch = Math.max(0.25, Math.min(4.0, stretchFactor));
  if (Math.abs(safeStretch - 1.0) < 0.002) {
    return cloneAudioBuffer(ctx, source);
  }

  if (!preservePitch) {
    return varispeedBuffer(ctx, source, 1 / safeStretch);
  }

  const numChannels = source.numberOfChannels;
  const srcLen = source.length;
  const sr = source.sampleRate;
  const dstLen = Math.max(64, Math.round(srcLen * safeStretch));
  const out = ctx.createBuffer(numChannels, dstLen, sr);

  // If clip is extremely short, gracefully fallback to linear resampling
  if (srcLen < 512) {
    return varispeedBuffer(ctx, source, 1 / safeStretch);
  }

  // Hanning window ~44ms with 75% overlap (synthesisHop = winSize / 4)
  const winSize = Math.min(2048, Math.max(256, 1 << Math.round(Math.log2(sr * 0.044))));
  const halfWin = winSize >> 1;
  const synHop = winSize >> 2;
  const searchRadius = Math.min(160, Math.floor(synHop * 0.65));

  const hann = new Float32Array(winSize);
  for (let i = 0; i < winSize; i++) {
    hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (winSize - 1)));
  }

  const srcChannels: Float32Array[] = [];
  const dstChannels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    srcChannels.push(source.getChannelData(ch));
    dstChannels.push(out.getChannelData(ch));
  }
  const weightSum = new Float32Array(dstLen);

  // Use channel 0 for waveform similarity alignment so stereo phase stays locked
  const refSrc = srcChannels[0];
  let prevGrainEndOffset = -1;

  for (let outPos = 0; outPos < dstLen; outPos += synHop) {
    const nominalSrcPos = Math.round(outPos / safeStretch);
    let bestSrcPos = Math.max(0, Math.min(srcLen - 1, nominalSrcPos));

    // Waveform similarity search around nominal analysis position against previous grain continuation
    if (prevGrainEndOffset >= 0 && nominalSrcPos > searchRadius && nominalSrcPos + winSize < srcLen - searchRadius) {
      const refStart = Math.max(0, Math.min(srcLen - 128, prevGrainEndOffset));
      let bestCorr = -Infinity;
      const compareLen = Math.min(96, srcLen - refStart);

      for (let delta = -searchRadius; delta <= searchRadius; delta += 4) {
        const cand = nominalSrcPos + delta;
        if (cand < 0 || cand + compareLen >= srcLen) continue;
        let corr = 0;
        for (let k = 0; k < compareLen; k += 2) {
          corr += refSrc[refStart + k] * refSrc[cand + k];
        }
        if (corr > bestCorr) {
          bestCorr = corr;
          bestSrcPos = cand;
        }
      }
    }

    for (let i = 0; i < winSize; i++) {
      const dstIdx = outPos + i - halfWin;
      if (dstIdx < 0 || dstIdx >= dstLen) continue;
      const srcIdx = Math.max(0, Math.min(srcLen - 1, bestSrcPos + i - halfWin));
      const w = hann[i];
      weightSum[dstIdx] += w;
      for (let ch = 0; ch < numChannels; ch++) {
        dstChannels[ch][dstIdx] += srcChannels[ch][srcIdx] * w;
      }
    }

    prevGrainEndOffset = bestSrcPos + synHop;
  }

  for (let i = 0; i < dstLen; i++) {
    const norm = weightSum[i] > 1e-4 ? 1 / weightSum[i] : 1;
    for (let ch = 0; ch < numChannels; ch++) {
      dstChannels[ch][i] = Math.max(-1, Math.min(1, dstChannels[ch][i] * norm));
    }
  }

  return out;
}

/**
 * Piecewise ChronoPin Tempo-Latch Engine:
 * Stretches/compresses each region between ChronoPins so drifting or slowed-down sections
 * latch smoothly back onto the project's exact BPM measure grid while preserving pitch.
 */
export function warpBufferWithChronoPins(
  ctx: BaseAudioContext,
  source: AudioBuffer,
  pins: ChronoPin[],
  projectBpm: number,
  preservePitch: boolean = true
): { buffer: AudioBuffer; warpedPins: ChronoPin[]; maxDriftMs: number; segmentsWarped: number } {
  const safeBpm = Math.max(30, Math.min(300, projectBpm || 120));
  const beatSec = 60 / safeBpm;
  const sr = source.sampleRate;
  const totalSrcSec = source.duration;

  if (!pins || pins.length === 0) {
    return {
      buffer: cloneAudioBuffer(ctx, source),
      warpedPins: [],
      maxDriftMs: 0,
      segmentsWarped: 0
    };
  }

  const sorted = [...pins].sort((a, b) => a.timeSeconds - b.timeSeconds);
  const firstPin = sorted[0];
  const anchorOffset = Math.max(0, firstPin.timeSeconds);
  const firstPinBeatPos = (firstPin.measure - 1) * 4 + (firstPin.beat - 1);

  const computeGridTarget = (pin: ChronoPin): number => {
    const beatPos = (pin.measure - 1) * 4 + (pin.beat - 1);
    return Math.max(0, anchorOffset + (beatPos - firstPinBeatPos) * beatSec);
  };

  let maxDriftMs = 0;
  let segmentsWarped = 0;
  const pieces: AudioBuffer[] = [];

  // Optional pre-downbeat intro before first pin (unchanged)
  if (firstPin.timeSeconds > 0.015) {
    const preLen = Math.min(source.length, Math.round(firstPin.timeSeconds * sr));
    if (preLen > 32) {
      const preBuf = ctx.createBuffer(source.numberOfChannels, preLen, sr);
      for (let ch = 0; ch < source.numberOfChannels; ch++) {
        preBuf.getChannelData(ch).set(source.getChannelData(ch).subarray(0, preLen));
      }
      pieces.push(preBuf);
    }
  }

  for (let i = 0; i < sorted.length; i++) {
    const pStart = sorted[i];
    const pEnd = sorted[i + 1];

    const srcStartSec = Math.max(0, Math.min(totalSrcSec - 0.02, pStart.timeSeconds));
    const srcEndSec = pEnd
      ? Math.max(srcStartSec + 0.02, Math.min(totalSrcSec, pEnd.timeSeconds))
      : totalSrcSec;

    const targetStartSec = computeGridTarget(pStart);
    const targetEndSec = pEnd
      ? Math.max(targetStartSec + 0.02, computeGridTarget(pEnd))
      : targetStartSec + (srcEndSec - srcStartSec);

    const srcSpan = srcEndSec - srcStartSec;
    const targetSpan = targetEndSec - targetStartSec;
    const stretchFactor = Math.max(0.4, Math.min(2.5, targetSpan / Math.max(0.02, srcSpan)));

    const driftMs = Math.abs(srcSpan - targetSpan) * 1000;
    if (driftMs > maxDriftMs) maxDriftMs = driftMs;
    if (Math.abs(stretchFactor - 1.0) > 0.01) segmentsWarped++;

    const sSample = Math.floor(srcStartSec * sr);
    const eSample = Math.min(source.length, Math.max(sSample + 64, Math.floor(srcEndSec * sr)));
    const segLen = eSample - sSample;
    const segBuf = ctx.createBuffer(source.numberOfChannels, segLen, sr);
    for (let ch = 0; ch < source.numberOfChannels; ch++) {
      segBuf.getChannelData(ch).set(source.getChannelData(ch).subarray(sSample, eSample));
    }

    const stretchedSeg = timeStretchBufferPreservePitch(ctx, segBuf, stretchFactor, preservePitch);
    pieces.push(stretchedSeg);
  }

  let merged = pieces[0] || cloneAudioBuffer(ctx, source);
  const seamSamples = Math.round(0.008 * sr); // 8ms micro-crossfade across ChronoPin seams
  for (let i = 1; i < pieces.length; i++) {
    merged = concatAudioBuffers(ctx, merged, pieces[i], seamSamples);
  }

  const warpedPins = sorted.map(pin => {
    const target = Number(computeGridTarget(pin).toFixed(4));
    return {
      ...pin,
      timeSeconds: target,
      targetTimeSeconds: target,
      isLocked: true
    };
  });

  return {
    buffer: merged,
    warpedPins,
    maxDriftMs: Math.round(maxDriftMs),
    segmentsWarped
  };
}

/**
 * Encodes an AudioBuffer into a downloadable stereo/mono 16-bit PCM WAV Blob.
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = Math.min(2, buffer.numberOfChannels);
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) {
      view.setUint8(offset + i, s.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}
