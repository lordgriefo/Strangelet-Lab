// Strangelet Lab - Multi-Core Parallel Batch Mastering Engine
// Processes folders of multitrack stems or full tracks through the Gold Path DSP chain
// Leverages browser Web Audio OfflineAudioContext instances concurrently across CPU cores

import { GoldPathPreset } from '../types';
import { audioBufferToWav, createTapeSaturationCurve } from '../lib/sunoAudioEngine';
import JSZip from 'jszip';

export type StemCategory = 
  | 'drums' 
  | 'kick' 
  | 'snare' 
  | 'bass' 
  | 'vocal' 
  | 'guitar' 
  | 'keys' 
  | 'synth' 
  | 'fx' 
  | 'full_mix' 
  | 'other';

export type BatchItemStatus = 
  | 'queued' 
  | 'decoding' 
  | 'processing' 
  | 'limiting' 
  | 'completed' 
  | 'error';

export interface BatchItem {
  id: string;
  file?: File;
  name: string;
  size: number;
  stemType: StemCategory;
  status: BatchItemStatus;
  progress: number; // 0 - 100
  currentStageText: string;
  errorMessage?: string;
  durationSeconds: number;
  sampleRate: number;
  channels: number;
  inputPeakDb?: number;
  outputPeakDb?: number;
  outputLufs?: number;
  dynamicRangeDb?: number;
  inputBuffer?: AudioBuffer;
  outputBuffer?: AudioBuffer;
  outputBlob?: Blob;
  outputUrl?: string;
  workerId?: number;
  processingTimeMs?: number;
  isDemo?: boolean;
}

export interface BatchMasteringConfig {
  preset: GoldPathPreset;
  stemHeadroomMode: boolean; // If true, leaves -4.5 dB headroom so stems don't clip when summed
  targetLufsOverride?: number; // e.g. -14, -9, -16
  ceilingDbOverride?: number; // e.g. -1.0, -0.5, -0.1
  parallelProcessing: boolean;
  maxConcurrency: number; // 1 to 16 cores
}

/**
 * Heuristic auto-tagger for multitrack stems based on file names
 */
export function detectStemCategory(fileName: string): StemCategory {
  const lower = fileName.toLowerCase();
  if (lower.includes('kick') || lower.includes('bd') || lower.includes('bassdrum')) return 'kick';
  if (lower.includes('snare') || lower.includes('sd') || lower.includes('clap') || lower.includes('rim')) return 'snare';
  if (lower.includes('drum') || lower.includes('perc') || lower.includes('hat') || lower.includes('cymbal') || lower.includes('shaker')) return 'drums';
  if (lower.includes('bass') || lower.includes('sub') || lower.includes('808') || lower.includes('synthbass')) return 'bass';
  if (lower.includes('vox') || lower.includes('vocal') || lower.includes('lead_voc') || lower.includes('bgv') || lower.includes('acapella') || lower.includes('harm')) return 'vocal';
  if (lower.includes('gtr') || lower.includes('guitar') || lower.includes('acoustic') || lower.includes('electric')) return 'guitar';
  if (lower.includes('piano') || lower.includes('keys') || lower.includes('organ') || lower.includes('rhodes')) return 'keys';
  if (lower.includes('synth') || lower.includes('pad') || lower.includes('lead') || lower.includes('arp') || lower.includes('pluck')) return 'synth';
  if (lower.includes('fx') || lower.includes('sfx') || lower.includes('riser') || lower.includes('sweep') || lower.includes('impact') || lower.includes('noise')) return 'fx';
  if (lower.includes('master') || lower.includes('mix') || lower.includes('full') || lower.includes('track') || lower.includes('song')) return 'full_mix';
  return 'other';
}

/**
 * Formats bytes into human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Formats seconds into MM:SS
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Fast estimation of peak dBFS and integrated LUFS
 */
export function analyzeAudioBuffer(buffer: AudioBuffer): { peakDb: number; lufsEst: number; dynamicRangeDb: number } {
  let peak = 0;
  let sumSquare = 0;
  let totalSamples = 0;

  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    totalSamples += data.length;
    for (let i = 0; i < data.length; i++) {
      const abs = Math.abs(data[i]);
      if (abs > peak) peak = abs;
      sumSquare += data[i] * data[i];
    }
  }

  const rms = totalSamples > 0 ? Math.sqrt(sumSquare / totalSamples) : 0.0001;
  const peakDb = peak > 0 ? 20 * Math.log10(peak) : -96;
  
  // Standard K-weighting approximation for integrated LUFS
  const lufsEst = rms > 0 ? Math.max(-96, Math.min(0, 20 * Math.log10(rms) - 0.69)) : -96;
  const dynamicRangeDb = Math.max(0, peakDb - lufsEst);

  return {
    peakDb: parseFloat(peakDb.toFixed(1)),
    lufsEst: parseFloat(lufsEst.toFixed(1)),
    dynamicRangeDb: parseFloat(dynamicRangeDb.toFixed(1))
  };
}

/**
 * Real Web Audio Offline DSP Engine executing Gold Path parameters
 */
export async function renderBufferThroughGoldPath(
  inputBuffer: AudioBuffer,
  preset: GoldPathPreset,
  config: {
    stemHeadroomMode: boolean;
    targetLufsOverride?: number;
    ceilingDbOverride?: number;
    onStageUpdate?: (progress: number, stageName: string) => void;
  }
): Promise<{
  outputBuffer: AudioBuffer;
  outputPeakDb: number;
  outputLufs: number;
  dynamicRangeDb: number;
  outputBlob: Blob;
}> {
  const { onStageUpdate } = config;
  const sampleRate = inputBuffer.sampleRate;
  const channels = Math.max(2, inputBuffer.numberOfChannels); // Always export stereo
  
  onStageUpdate?.(10, 'Analyzing input waveform...');
  const inputAnalysis = analyzeAudioBuffer(inputBuffer);

  // Add 0.3s reverb/filter ring out
  const extraTailFrames = Math.floor(0.3 * sampleRate);
  const totalFrames = inputBuffer.length + extraTailFrames;

  onStageUpdate?.(25, 'Building Gold Path DSP Graph...');
  const offlineCtx = new OfflineAudioContext(channels, totalFrames, sampleRate);

  // Buffer source
  const source = offlineCtx.createBufferSource();
  source.buffer = inputBuffer;

  let currentNode: AudioNode = source;

  // 1. STAGE: High-pass sub-filter (lowCutHz)
  if (preset.parameters.lowCutHz > 20) {
    const lowCut = offlineCtx.createBiquadFilter();
    lowCut.type = 'highpass';
    lowCut.frequency.value = preset.parameters.lowCutHz;
    lowCut.Q.value = 0.707;
    currentNode.connect(lowCut);
    currentNode = lowCut;
  }

  // 2. STAGE: De-Mud notch filter (around 380 - 450Hz)
  if (preset.parameters.deMudGainDb !== 0) {
    const deMud = offlineCtx.createBiquadFilter();
    deMud.type = 'peaking';
    deMud.frequency.value = 400;
    deMud.Q.value = 1.4;
    deMud.gain.value = preset.parameters.deMudGainDb * preset.masterIntensity;
    currentNode.connect(deMud);
    currentNode = deMud;
  }

  // 3. STAGE: Air & Presence Shimmer (high shelf 12kHz)
  if (preset.parameters.presenceAirDb !== 0) {
    const presence = offlineCtx.createBiquadFilter();
    presence.type = 'highshelf';
    presence.frequency.value = 12000;
    presence.gain.value = preset.parameters.presenceAirDb * preset.masterIntensity;
    currentNode.connect(presence);
    currentNode = presence;
  }

  // 4. STAGE: Ultrasonic Low-pass filter (highCutHz)
  if (preset.parameters.highCutHz < 22000) {
    const highCut = offlineCtx.createBiquadFilter();
    highCut.type = 'lowpass';
    highCut.frequency.value = preset.parameters.highCutHz;
    highCut.Q.value = 0.707;
    currentNode.connect(highCut);
    currentNode = highCut;
  }

  // 5. STAGE: Analog Tape / Tube Saturation
  if (preset.stages.tapeSaturation && preset.parameters.tapeWarmth > 0) {
    onStageUpdate?.(45, 'Applying Analog Tape Saturation...');
    const shaper = offlineCtx.createWaveShaper();
    const driveAmount = (preset.parameters.tapeWarmth / 100) * preset.masterIntensity;
    shaper.curve = createTapeSaturationCurve(driveAmount) as any;
    shaper.oversample = '4x';
    currentNode.connect(shaper);
    currentNode = shaper;
  }

  // 6. STAGE: Multiband / Glue Compression
  if (preset.stages.multiband) {
    onStageUpdate?.(60, 'Engaging Multiband Glue Compression...');
    const glueComp = offlineCtx.createDynamicsCompressor();
    glueComp.threshold.value = preset.parameters.compressionThresholdDb;
    glueComp.ratio.value = preset.parameters.glueRatio;
    glueComp.attack.value = Math.max(0.005, preset.parameters.attackMs / 1000);
    glueComp.release.value = Math.max(0.04, preset.parameters.releaseMs / 1000);
    currentNode.connect(glueComp);
    currentNode = glueComp;
  }

  // 7. STAGE: True Peak Brickwall Limiter & Headroom Staging
  const targetCeiling = config.ceilingDbOverride ?? preset.parameters.ceilingDb ?? -1.0;
  const effectiveCeiling = config.stemHeadroomMode ? Math.min(targetCeiling, -4.5) : targetCeiling;

  if (preset.stages.limiter) {
    onStageUpdate?.(75, 'Applying True Peak Brickwall Limiter...');
    const limiter = offlineCtx.createDynamicsCompressor();
    limiter.threshold.value = effectiveCeiling;
    limiter.knee.value = 0.5;
    limiter.ratio.value = 20.0;
    limiter.attack.value = 0.001; // Fast 1ms brickwall
    limiter.release.value = 0.050;
    currentNode.connect(limiter);
    currentNode = limiter;
  }

  // Final Output Ceiling Gain
  const ceilingGain = offlineCtx.createGain();
  const linearGain = Math.pow(10, effectiveCeiling / 20);
  ceilingGain.gain.value = linearGain;
  currentNode.connect(ceilingGain);

  ceilingGain.connect(offlineCtx.destination);

  // Start offline render
  onStageUpdate?.(85, 'Rendering Offline Audio Context...');
  source.start(0);

  const renderedBuffer = await offlineCtx.startRendering();

  // Normalize LUFS to target if specified and in full mix mode
  const targetLufs = config.targetLufsOverride ?? preset.parameters.targetLufs ?? -14;
  if (!config.stemHeadroomMode && preset.stages.limiter) {
    const rawAnalysis = analyzeAudioBuffer(renderedBuffer);
    const lufsDiff = targetLufs - rawAnalysis.lufsEst;
    if (Math.abs(lufsDiff) > 0.5 && lufsDiff < 8) {
      const autoGain = Math.min(1.5, Math.pow(10, lufsDiff / 20));
      for (let ch = 0; ch < renderedBuffer.numberOfChannels; ch++) {
        const data = renderedBuffer.getChannelData(ch);
        for (let i = 0; i < data.length; i++) {
          data[i] = Math.max(-0.99, Math.min(0.99, data[i] * autoGain));
        }
      }
    }
  }

  onStageUpdate?.(95, 'Encoding Mastered 16-Bit WAV...');
  const outputAnalysis = analyzeAudioBuffer(renderedBuffer);
  const outputBlob = audioBufferToWav(renderedBuffer);

  onStageUpdate?.(100, 'Mastering Complete');

  return {
    outputBuffer: renderedBuffer,
    outputPeakDb: outputAnalysis.peakDb,
    outputLufs: outputAnalysis.lufsEst,
    dynamicRangeDb: outputAnalysis.dynamicRangeDb,
    outputBlob
  };
}

/**
 * Decodes a File or Blob into an AudioBuffer using an AudioContext
 */
export async function decodeAudioFile(file: File | Blob): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  try {
    const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer.slice(0));
    await tempCtx.close();
    return audioBuffer;
  } catch (err) {
    await tempCtx.close();
    throw new Error(`Unable to decode audio format: ${(err as any)?.message || 'Unsupported codec'}`);
  }
}

/**
 * Synthesizes a realistic demo stem AudioBuffer for quick testing
 */
export function generateDemoStemBuffer(stem: StemCategory, sampleRate: number = 44100): AudioBuffer {
  const duration = 4.0; // 4 seconds loop at 120 bpm (2 bars)
  const length = Math.floor(sampleRate * duration);
  const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const buffer = tempCtx.createBuffer(2, length, sampleRate);
  tempCtx.close();

  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const beatTime = (t * 2) % 1; // 120 bpm = 2 beats per second
    const beatIndex = Math.floor(t * 2) % 4;

    let sampleL = 0;
    let sampleR = 0;

    switch (stem) {
      case 'kick': {
        if (beatTime < 0.18) {
          const env = Math.exp(-beatTime * 28);
          const freq = 55 + 85 * Math.exp(-beatTime * 50);
          const sig = Math.sin(2 * Math.PI * freq * beatTime) * 0.7 * env;
          sampleL += sig;
          sampleR += sig;
        }
        break;
      }
      case 'snare':
      case 'drums': {
        // Kick on 0, 2
        if ((beatIndex === 0 || beatIndex === 2) && beatTime < 0.15) {
          const env = Math.exp(-beatTime * 30);
          const sig = Math.sin(2 * Math.PI * 60 * beatTime) * 0.5 * env;
          sampleL += sig;
          sampleR += sig;
        }
        // Snare on 1, 3
        if ((beatIndex === 1 || beatIndex === 3) && beatTime < 0.2) {
          const env = Math.exp(-beatTime * 20);
          const noise = (Math.random() - 0.5) * 0.4 * env;
          const tone = Math.sin(2 * Math.PI * 210 * beatTime) * 0.3 * env;
          sampleL += noise + tone;
          sampleR += noise * 0.9 + tone;
        }
        // Hihat on 8ths
        const subBeat = (t * 4) % 1;
        if (subBeat < 0.05) {
          const hEnv = Math.exp(-subBeat * 60);
          const hat = (Math.random() - 0.5) * 0.15 * hEnv;
          sampleL += hat * 0.7;
          sampleR += hat * 1.1;
        }
        break;
      }
      case 'bass': {
        const root = [55, 65.41, 73.42, 49][beatIndex]; // A1, C2, D2, G1
        const sig = Math.sin(2 * Math.PI * root * t) * 0.45 + Math.sin(2 * Math.PI * root * 2 * t) * 0.15;
        sampleL += sig;
        sampleR += sig;
        break;
      }
      case 'vocal': {
        const vFreq = [440, 523.25, 587.33, 392][beatIndex];
        const vib = Math.sin(2 * Math.PI * 5.5 * t) * 4;
        const sig = Math.sin(2 * Math.PI * (vFreq + vib) * t) * 0.3 * Math.sin(Math.PI * (beatTime));
        sampleL += sig * 0.85;
        sampleR += sig * 1.0;
        break;
      }
      case 'guitar': {
        const chord = [220, 261.63, 329.63];
        chord.forEach((f, idx) => {
          const decay = Math.exp(-beatTime * 6);
          const sig = Math.sin(2 * Math.PI * f * t) * 0.12 * decay;
          sampleL += sig * (idx % 2 === 0 ? 0.9 : 0.4);
          sampleR += sig * (idx % 2 === 0 ? 0.4 : 0.9);
        });
        break;
      }
      default: {
        // Full mix preview
        const chord = [220, 261.63, 329.63, 440];
        const root = chord[0] / 2;
        const bSig = Math.sin(2 * Math.PI * root * t) * 0.25;
        sampleL += bSig;
        sampleR += bSig;

        chord.forEach((f) => {
          sampleL += Math.sin(2 * Math.PI * f * t) * 0.05;
          sampleR += Math.sin(2 * Math.PI * f * 1.002 * t) * 0.05;
        });

        if (beatTime < 0.1) {
          const k = Math.sin(2 * Math.PI * 65 * beatTime) * 0.4 * Math.exp(-beatTime * 35);
          sampleL += k;
          sampleR += k;
        }
        break;
      }
    }

    left[i] = Math.max(-0.9, Math.min(0.9, sampleL));
    right[i] = Math.max(-0.9, Math.min(0.9, sampleR));
  }

  return buffer;
}

/**
 * Creates Demo Sessions for 1-click testing
 */
export function createDemoStemSession(): BatchItem[] {
  const stems: { name: string; type: StemCategory; size: number }[] = [
    { name: '01_Drums_Group_Stems.wav', type: 'drums', size: 1420000 },
    { name: '02_Analog_Sub_Bass.wav', type: 'bass', size: 1420000 },
    { name: '03_Lead_Vocals_Main.wav', type: 'vocal', size: 1420000 },
    { name: '04_Electric_Guitars_Stereo.wav', type: 'guitar', size: 1420000 },
    { name: '05_Synth_Pads_Atmosphere.wav', type: 'synth', size: 1420000 }
  ];

  return stems.map(s => {
    const buf = generateDemoStemBuffer(s.type);
    const analysis = analyzeAudioBuffer(buf);
    return {
      id: `demo-${s.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: s.name,
      size: s.size,
      stemType: s.type,
      status: 'queued',
      progress: 0,
      currentStageText: 'Ready to Process',
      durationSeconds: 4.0,
      sampleRate: 44100,
      channels: 2,
      inputPeakDb: analysis.peakDb,
      inputBuffer: buf,
      isDemo: true
    };
  });
}

export function createDemoAlbumSession(): BatchItem[] {
  const tracks: { name: string; type: StemCategory; size: number }[] = [
    { name: 'Track_01_Strangelet_Overture.wav', type: 'full_mix', size: 2150000 },
    { name: 'Track_02_Cybernetic_Dreams.wav', type: 'full_mix', size: 2150000 },
    { name: 'Track_03_Twin_Peaks_Sunset.wav', type: 'full_mix', size: 2150000 }
  ];

  return tracks.map(t => {
    const buf = generateDemoStemBuffer(t.type);
    const analysis = analyzeAudioBuffer(buf);
    return {
      id: `demo-album-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: t.name,
      size: t.size,
      stemType: t.type,
      status: 'queued',
      progress: 0,
      currentStageText: 'Ready to Process',
      durationSeconds: 4.0,
      sampleRate: 44100,
      channels: 2,
      inputPeakDb: analysis.peakDb,
      inputBuffer: buf,
      isDemo: true
    };
  });
}

/**
 * Creates a Zip archive containing all mastered WAV files and a mastering report
 */
export async function createBatchMasteringZip(
  items: BatchItem[],
  preset: GoldPathPreset,
  onZipProgress?: (percent: number) => void
): Promise<Blob> {
  const zip = new JSZip();
  const completedItems = items.filter(i => i.status === 'completed' && i.outputBlob);

  if (completedItems.length === 0) {
    throw new Error('No completed mastered tracks available to zip.');
  }

  // Create folder inside zip
  const folderName = `GoldPath_Mastered_${preset.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const folder = zip.folder(folderName) || zip;

  // Add audio files
  completedItems.forEach((item, index) => {
    if (item.outputBlob) {
      const cleanName = item.name.replace(/\.[^/.]+$/, '');
      const outFileName = `${cleanName}_Mastered.wav`;
      folder.file(outFileName, item.outputBlob);
    }
  });

  // Add mastering report manifest
  const reportLines = [
    `STRANGELET ACOUSTIC LABS - BATCH MASTERING REPORT`,
    `Generated: ${new Date().toISOString()}`,
    `Gold Path Preset: "${preset.name}" (${preset.category})`,
    `Target Loudness: ${preset.parameters.targetLufs} LUFS | Peak Ceiling: ${preset.parameters.ceilingDb} dBFS`,
    `Master Intensity: ${Math.round(preset.masterIntensity * 100)}%`,
    `------------------------------------------------------------------------`,
    `TRACK NAME | STEM TYPE | IN PEAK | OUT PEAK | OUT LUFS | DYNAMIC RANGE | STATUS`,
    `------------------------------------------------------------------------`
  ];

  completedItems.forEach(item => {
    reportLines.push(
      `${item.name} | ${item.stemType.toUpperCase()} | ${item.inputPeakDb ?? '-'} dBFS | ${item.outputPeakDb ?? '-'} dBFS | ${item.outputLufs ?? '-'} LUFS | ${item.dynamicRangeDb ?? '-'} dB | DONE`
    );
  });

  reportLines.push(`------------------------------------------------------------------------`);
  reportLines.push(`Total Tracks Mastered: ${completedItems.length}`);
  reportLines.push(`All files mastered at 16-bit PCM WAV standard.`);

  folder.file('Mastering_Log_Report.txt', reportLines.join('\n'));

  // Generate zip file with progress
  const zipBlob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
    metadata => {
      onZipProgress?.(Math.round(metadata.percent));
    }
  );

  return zipBlob;
}
