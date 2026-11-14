// Offline Audio Renderer for Strangelet Lab Mixer
// Uses Web Audio OfflineAudioContext to render and bounce multitrack arrangements to .wav files.

import { Track, Clip, TimelineMarker } from '../types';
import { evaluateAutomationAt } from '../lib/audioUtils';
import JSZip from 'jszip';

export type NormalizationMode = 'independent' | 'relative' | 'none';

export function dbToLinearPeak(db: number): number {
  return Math.min(1.0, Math.max(0.001, Math.pow(10, db / 20)));
}

/**
 * Universal WAV encoder supporting 16-bit and 24-bit PCM
 */
export function encodeAudioBufferToWav(buffer: AudioBuffer, bitDepth: 16 | 24 = 16): Blob {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bytesPerSample = bitDepth === 24 ? 3 : 2;
  const blockAlign = numOfChan * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = buffer.length * blockAlign;
  const bufferSize = 44 + dataSize;
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const out = new DataView(arrayBuffer);

  let pos = 0;
  function setUint16(data: number) { out.setUint16(pos, data, true); pos += 2; }
  function setUint32(data: number) { out.setUint32(pos, data, true); pos += 4; }

  // 'RIFF'
  out.setUint8(pos++, 0x52); out.setUint8(pos++, 0x49); out.setUint8(pos++, 0x46); out.setUint8(pos++, 0x46);
  setUint32(bufferSize - 8);
  // 'WAVE'
  out.setUint8(pos++, 0x57); out.setUint8(pos++, 0x41); out.setUint8(pos++, 0x56); out.setUint8(pos++, 0x45);
  // 'fmt '
  out.setUint8(pos++, 0x66); out.setUint8(pos++, 0x6d); out.setUint8(pos++, 0x74); out.setUint8(pos++, 0x20);
  setUint32(16); // subchunk1size (16 for PCM)
  setUint16(1);  // format = 1 (PCM)
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(byteRate);
  setUint16(blockAlign);
  setUint16(bitDepth);

  // 'data'
  out.setUint8(pos++, 0x64); out.setUint8(pos++, 0x61); out.setUint8(pos++, 0x74); out.setUint8(pos++, 0x61);
  setUint32(dataSize);

  const channels: Float32Array[] = [];
  for (let i = 0; i < numOfChan; i++) {
    channels.push(buffer.getChannelData(i));
  }

  if (bitDepth === 24) {
    for (let offset = 0; offset < buffer.length; offset++) {
      for (let ch = 0; ch < numOfChan; ch++) {
        let sample = Math.max(-1, Math.min(1, channels[ch][offset]));
        const intVal = sample < 0 ? Math.floor(sample * 0x800000) : Math.floor(sample * 0x7FFFFF);
        out.setUint8(pos++, intVal & 0xFF);
        out.setUint8(pos++, (intVal >> 8) & 0xFF);
        out.setUint8(pos++, (intVal >> 16) & 0xFF);
      }
    }
  } else {
    for (let offset = 0; offset < buffer.length; offset++) {
      for (let ch = 0; ch < numOfChan; ch++) {
        let sample = Math.max(-1, Math.min(1, channels[ch][offset]));
        const intVal = sample < 0 ? Math.floor(sample * 0x8000) : Math.floor(sample * 0x7FFF);
        out.setInt16(pos, intVal, true);
        pos += 2;
      }
    }
  }

  return new Blob([out], { type: 'audio/wav' });
}

export interface ExportOptions {
  sampleRate: number; // 44100, 48000, 88200, 96000, 192000
  bitDepth: 16 | 24;
  totalBars: number;
  tempo: number;
  masterGain: number;
  normalize: boolean;
  limiter: boolean;
  filename?: string;
  normalizationTargetDb?: number; // e.g. -0.1, -0.35, -1.0, -3.0 dBFS
  normalizeMode?: NormalizationMode;
  range?: {
    startBar: number;
    endBar: number;
  };
  onProgress?: (percent: number, statusText: string) => void;
}

export interface BatchStemExportOptions extends ExportOptions {
  includeManifest?: boolean;
  dryStems?: boolean; // If true: 0dB fader & center pan; if false: includes mixer track volume & pan & automation
  namingFormat?: 'numbered' | 'clean' | 'detailed'; // e.g. "01_Drums.wav" vs "Drums_Stem.wav"
  trackIds?: string[]; // Optional subset of track IDs; defaults to all active tracks
}

export interface StemExportItem {
  trackId: string;
  trackName: string;
  filename: string;
  blob: Blob;
  sizeBytes: number;
  durationSeconds: number;
  peakDb?: number;
}

export interface BatchExportResult {
  zipBlob: Blob;
  downloadUrl: string;
  zipFilename: string;
  stems: StemExportItem[];
  totalSizeBytes: number;
  activeTrackCount: number;
  durationSeconds: number;
}

export interface ExportResult {
  blob: Blob;
  downloadUrl: string;
  filename: string;
  durationSeconds: number;
  fileSizeBytes: number;
  sampleRate: number;
  channels: number;
}

export interface KenetiCutTransientChop {
  index: number;
  timeSeconds: number;
  bar: number;
  beat: number;
  intensity: number; // 0 to 1 normalized transient flux
  peakDb: number;
  sourceTrack?: string;
}

export interface KenetiCutSongMarker {
  id: string;
  label: string;
  positionNormalized: number;
  timeSeconds: number;
  bar: number;
  beat: number;
  color?: string;
}

export interface KenetiCutManifest {
  format: 'KenetiCut-VJ-AudioReactive-v1';
  generator: 'Strangelet Lab Audio Workstation';
  projectName: string;
  exportedAt: string;
  exportMode: 'master' | 'stems';
  bpm: number;
  timeSignature: string;
  totalBars: number;
  durationSeconds: number;
  sampleRate: number;
  bitDepth: 16 | 24;
  audioFiles: {
    role: 'master' | 'stem';
    trackId?: string;
    trackName?: string;
    filename: string;
    sizeBytes: number;
    durationSeconds: number;
    peakDb?: number;
  }[];
  beatGrid: {
    bpm: number;
    secondsPerBeat: number;
    secondsPerBar: number;
    beatTimestamps: number[];
  };
  transientChopPoints: KenetiCutTransientChop[];
  songMarkers: KenetiCutSongMarker[];
  vjReactiveHints: {
    recommendedCutMode: 'transient_chop' | 'beat_sync';
    transientThreshold: number;
    strobeOnStrongTransients: boolean;
    stemDrivenVisuals: boolean;
  };
}

export interface KenetiCutExportOptions extends BatchStemExportOptions {
  mode: 'mix' | 'stems';
  markers?: TimelineMarker[];
}

export interface KenetiCutExportResult {
  zipBlob: Blob;
  downloadUrl: string;
  zipFilename: string;
  manifest: KenetiCutManifest;
  totalSizeBytes: number;
}

export class OfflineAudioRenderer {
  /**
   * Renders the current arrangement of tracks to a WAV Blob via OfflineAudioContext
   */
  public async renderProject(
    tracks: Track[],
    options: ExportOptions
  ): Promise<ExportResult> {
    const {
      sampleRate = 44100,
      tempo = 120,
      onProgress
    } = options;

    // Render raw AudioBuffer via helper
    const renderedBuffer = await this.renderProjectAudioBuffer(tracks, options);

    onProgress?.(85, `Normalizing & encoding ${options.bitDepth || 16}-bit PCM WAV container...`);

    // Convert AudioBuffer to WAV Blob with requested bit depth
    const wavBlob = encodeAudioBufferToWav(renderedBuffer, options.bitDepth || 16);
    const downloadUrl = URL.createObjectURL(wavBlob);

    const safeProjectName = (options.filename || `Strangelet_Mix_${tempo}BPM_${Date.now()}`)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_');
    const finalFilename = safeProjectName.endsWith('.wav') ? safeProjectName : `${safeProjectName}.wav`;

    onProgress?.(100, 'Master export complete!');

    return {
      blob: wavBlob,
      downloadUrl,
      filename: finalFilename,
      durationSeconds: renderedBuffer.duration,
      fileSizeBytes: wavBlob.size,
      sampleRate,
      channels: 2
    };
  }

  /**
   * Internal helper to render the full master mix to an AudioBuffer (used by renderProject and KenetiCut export)
   */
  public async renderProjectAudioBuffer(
    tracks: Track[],
    options: ExportOptions
  ): Promise<AudioBuffer> {
    const {
      sampleRate = 44100,
      totalBars = 16,
      tempo = 120,
      masterGain = 0.8,
      normalize = true,
      limiter = true,
      range,
      onProgress
    } = options;

    onProgress?.(5, 'Initializing Offline Audio Context...');

    const secondsPerBeat = 60 / tempo;
    const secondsPerBar = secondsPerBeat * 4;

    const startBar = range ? Math.max(0, range.startBar) : 0;
    const endBar = range ? Math.min(totalBars, range.endBar) : totalBars;
    const renderBars = Math.max(1, endBar - startBar);

    const durationSeconds = renderBars * secondsPerBar + 1.5;
    const totalFrames = Math.ceil(durationSeconds * sampleRate);

    const offlineCtx = new OfflineAudioContext(2, totalFrames, sampleRate);

    const masterGainNode = offlineCtx.createGain();
    masterGainNode.gain.setValueAtTime(masterGain, 0);

    let finalNode: AudioNode = masterGainNode;

    if (limiter) {
      const brickwallLimiter = offlineCtx.createDynamicsCompressor();
      brickwallLimiter.threshold.setValueAtTime(-1.0, 0);
      brickwallLimiter.knee.setValueAtTime(1.5, 0);
      brickwallLimiter.ratio.setValueAtTime(20, 0);
      brickwallLimiter.attack.setValueAtTime(0.002, 0);
      brickwallLimiter.release.setValueAtTime(0.08, 0);

      masterGainNode.connect(brickwallLimiter);
      finalNode = brickwallLimiter;
    }

    finalNode.connect(offlineCtx.destination);

    onProgress?.(15, 'Building track signal routing and automation...');

    const anySoloed = tracks.some(t => t.soloed);
    const activeTracks = tracks.filter(t => !t.muted && (!anySoloed || t.soloed));

    let processedTrackCount = 0;

    for (const track of activeTracks) {
      const trackGain = offlineCtx.createGain();
      const trackPan = offlineCtx.createStereoPanner();

      const baseVolume = track.phaseInverted ? -track.volume : track.volume;
      trackGain.gain.setValueAtTime(baseVolume, 0);
      trackPan.pan.setValueAtTime(track.pan, 0);

      if (track.automation?.volume?.enabled && track.automation.volume.points.length > 0) {
        const points = [...track.automation.volume.points].sort((a, b) => a.time - b.time);
        points.forEach(pt => {
          const timeSec = pt.time * (renderBars * secondsPerBar);
          const val = track.phaseInverted ? -pt.value : pt.value;
          trackGain.gain.linearRampToValueAtTime(val, Math.max(0.01, timeSec));
        });
      }

      if (track.automation?.pan?.enabled && track.automation.pan.points.length > 0) {
        const points = [...track.automation.pan.points].sort((a, b) => a.time - b.time);
        points.forEach(pt => {
          const timeSec = pt.time * (renderBars * secondsPerBar);
          trackPan.pan.linearRampToValueAtTime(pt.value, Math.max(0.01, timeSec));
        });
      }

      trackGain.connect(trackPan);
      trackPan.connect(masterGainNode);

      const clips = track.clips || [];

      if (clips.length > 0) {
        for (const clip of clips) {
          const clipStartSec = Math.max(0, (clip.startBar - startBar) * secondsPerBar);
          const clipDurSec = (clip.durationBars || 2) * secondsPerBar;

          if (clip.audioUrl) {
            try {
              const res = await fetch(clip.audioUrl);
              const arrayBuffer = await res.arrayBuffer();
              const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);

              const sourceNode = offlineCtx.createBufferSource();
              sourceNode.buffer = audioBuffer;
              sourceNode.connect(trackGain);
              sourceNode.start(clipStartSec, 0, Math.min(clipDurSec, audioBuffer.duration));
            } catch (err) {
              console.warn(`Failed to decode audio for clip ${clip.name}, synthesizing replacement:`, err);
              this.synthesizeTrackEvent(offlineCtx, track, clip, clipStartSec, clipDurSec, trackGain, tempo);
            }
          } else {
            this.synthesizeTrackEvent(offlineCtx, track, clip, clipStartSec, clipDurSec, trackGain, tempo);
          }
        }
      } else {
        const fullTrackDur = renderBars * secondsPerBar;
        this.synthesizeContinuousTrack(offlineCtx, track, 0, fullTrackDur, trackGain, tempo);
      }

      processedTrackCount++;
      const trackProgress = 15 + Math.round((processedTrackCount / Math.max(1, activeTracks.length)) * 45);
      onProgress?.(trackProgress, `Routing track ${processedTrackCount}/${activeTracks.length}: ${track.name}`);
    }

    onProgress?.(65, 'Executing high-speed offline Web Audio rendering...');

    const renderedBuffer = await offlineCtx.startRendering();

    if (normalize && options.normalizeMode !== 'none') {
      const targetCeiling = options.normalizationTargetDb !== undefined
        ? dbToLinearPeak(options.normalizationTargetDb)
        : 0.96;
      this.normalizeBuffer(renderedBuffer, targetCeiling);
    }

    return renderedBuffer;
  }

  /**
   * Renders a single track and returns both the AudioBuffer and encoded WAV Blob
   */
  public async renderTrackStemWithBuffer(
    track: Track,
    options: ExportOptions,
    dryStem: boolean = false
  ): Promise<{ buffer: AudioBuffer; blob: Blob; durationSeconds: number; sizeBytes: number; peakDb: number }> {
    const {
      sampleRate = 44100,
      totalBars = 16,
      tempo = 120,
      normalize = true,
      bitDepth = 16,
      range
    } = options;

    const secondsPerBeat = 60 / tempo;
    const secondsPerBar = secondsPerBeat * 4;

    const startBar = range ? Math.max(0, range.startBar) : 0;
    const endBar = range ? Math.min(totalBars, range.endBar) : totalBars;
    const renderBars = Math.max(1, endBar - startBar);

    const durationSeconds = renderBars * secondsPerBar + 1.5;
    const totalFrames = Math.ceil(durationSeconds * sampleRate);

    const offlineCtx = new OfflineAudioContext(track.isMono ? 1 : 2, totalFrames, sampleRate);

    const trackGain = offlineCtx.createGain();
    const trackPan = offlineCtx.createStereoPanner();

    if (dryStem) {
      trackGain.gain.setValueAtTime(1.0, 0);
      trackPan.pan.setValueAtTime(0, 0);
    } else {
      const baseVolume = track.phaseInverted ? -track.volume : track.volume;
      trackGain.gain.setValueAtTime(baseVolume, 0);
      trackPan.pan.setValueAtTime(track.pan, 0);

      if (track.automation?.volume?.enabled && track.automation.volume.points.length > 0) {
        const points = [...track.automation.volume.points].sort((a, b) => a.time - b.time);
        points.forEach(pt => {
          const timeSec = pt.time * (renderBars * secondsPerBar);
          const val = track.phaseInverted ? -pt.value : pt.value;
          trackGain.gain.linearRampToValueAtTime(val, Math.max(0.01, timeSec));
        });
      }

      if (track.automation?.pan?.enabled && track.automation.pan.points.length > 0) {
        const points = [...track.automation.pan.points].sort((a, b) => a.time - b.time);
        points.forEach(pt => {
          const timeSec = pt.time * (renderBars * secondsPerBar);
          trackPan.pan.linearRampToValueAtTime(pt.value, Math.max(0.01, timeSec));
        });
      }
    }

    trackGain.connect(trackPan);
    trackPan.connect(offlineCtx.destination);

    const clips = track.clips || [];
    if (clips.length > 0) {
      for (const clip of clips) {
        const clipStartSec = Math.max(0, (clip.startBar - startBar) * secondsPerBar);
        const clipDurSec = (clip.durationBars || 2) * secondsPerBar;

        if (clip.audioUrl) {
          try {
            const res = await fetch(clip.audioUrl);
            const arrayBuffer = await res.arrayBuffer();
            const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);

            const sourceNode = offlineCtx.createBufferSource();
            sourceNode.buffer = audioBuffer;
            sourceNode.connect(trackGain);
            sourceNode.start(clipStartSec, 0, Math.min(clipDurSec, audioBuffer.duration));
          } catch (_) {
            this.synthesizeTrackEvent(offlineCtx, track, clip, clipStartSec, clipDurSec, trackGain, tempo);
          }
        } else {
          this.synthesizeTrackEvent(offlineCtx, track, clip, clipStartSec, clipDurSec, trackGain, tempo);
        }
      }
    } else {
      const fullTrackDur = renderBars * secondsPerBar;
      this.synthesizeContinuousTrack(offlineCtx, track, 0, fullTrackDur, trackGain, tempo);
    }

    const renderedBuffer = await offlineCtx.startRendering();

    const targetCeiling = options.normalizationTargetDb !== undefined
      ? dbToLinearPeak(options.normalizationTargetDb)
      : 0.96;

    if (normalize && options.normalizeMode !== 'none') {
      this.normalizeBuffer(renderedBuffer, targetCeiling);
    }

    let maxVal = 0;
    for (let c = 0; c < renderedBuffer.numberOfChannels; c++) {
      const data = renderedBuffer.getChannelData(c);
      for (let i = 0; i < data.length; i++) {
        const abs = Math.abs(data[i]);
        if (abs > maxVal) maxVal = abs;
      }
    }
    const peakDb = maxVal > 0.0001 ? Number((20 * Math.log10(maxVal)).toFixed(1)) : -96.0;

    const wavBlob = encodeAudioBufferToWav(renderedBuffer, bitDepth);
    return {
      buffer: renderedBuffer,
      blob: wavBlob,
      durationSeconds,
      sizeBytes: wavBlob.size,
      peakDb
    };
  }

  /**
   * Renders a single track to a pristine stereo 16-bit or 24-bit PCM WAV Blob
   */
  public async renderTrackStem(
    track: Track,
    options: ExportOptions,
    dryStem: boolean = false
  ): Promise<{ blob: Blob; durationSeconds: number; sizeBytes: number; peakDb: number }> {
    const res = await this.renderTrackStemWithBuffer(track, options, dryStem);
    return {
      blob: res.blob,
      durationSeconds: res.durationSeconds,
      sizeBytes: res.sizeBytes,
      peakDb: res.peakDb
    };
  }

  /**
   * Batch exports all active tracks as individual WAV files in a single zipped archive
   */
  public async renderBatchStemsZip(
    tracks: Track[],
    options: BatchStemExportOptions
  ): Promise<BatchExportResult> {
    const {
      tempo = 120,
      filename,
      dryStems = false,
      namingFormat = 'numbered',
      includeManifest = true,
      trackIds,
      onProgress
    } = options;

    const anySoloed = tracks.some(t => t.soloed);
    let targetTracks = tracks.filter(t => !t.muted && (!anySoloed || t.soloed));
    
    if (trackIds && trackIds.length > 0) {
      targetTracks = targetTracks.filter(t => trackIds.includes(t.id));
    }

    if (targetTracks.length === 0) {
      throw new Error('No active tracks selected for batch export.');
    }

    const zip = new JSZip();
    const stems: StemExportItem[] = [];
    let totalSizeBytes = 0;
    let maxDurationSeconds = 0;

    onProgress?.(5, `Initializing batch stem bounce for ${targetTracks.length} active tracks...`);

    for (let i = 0; i < targetTracks.length; i++) {
      const track = targetTracks[i];
      const trackIndex = i + 1;
      const indexPrefix = String(trackIndex).padStart(2, '0');
      
      const safeTrackName = track.name
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_');

      let stemFilename = `${indexPrefix}_${safeTrackName}.wav`;
      if (namingFormat === 'clean') {
        stemFilename = `${safeTrackName}_Stem.wav`;
      } else if (namingFormat === 'detailed') {
        stemFilename = `${indexPrefix}_${safeTrackName}_${tempo}BPM_${options.sampleRate || 44100}Hz.wav`;
      }

      const stepProgress = 5 + Math.round((i / targetTracks.length) * 75);
      onProgress?.(stepProgress, `Rendering stem [${i + 1}/${targetTracks.length}]: ${track.name}...`);

      const stemResult = await this.renderTrackStem(track, options, dryStems);
      
      zip.file(stemFilename, stemResult.blob);
      totalSizeBytes += stemResult.sizeBytes;
      maxDurationSeconds = Math.max(maxDurationSeconds, stemResult.durationSeconds);

      stems.push({
        trackId: track.id,
        trackName: track.name,
        filename: stemFilename,
        blob: stemResult.blob,
        sizeBytes: stemResult.sizeBytes,
        durationSeconds: stemResult.durationSeconds,
        peakDb: stemResult.peakDb
      });
    }

    if (includeManifest) {
      const manifestContent = [
        `======================================================================`,
        `STRANGELET LAB - BATCH STEM MULTITRACK ARCHIVE MANIFEST`,
        `======================================================================`,
        `Project / Session: ${filename || 'Strangelet_Project'}`,
        `Tempo: ${tempo} BPM`,
        `Sample Rate: ${options.sampleRate || 44100} Hz`,
        `Bit Depth: ${options.bitDepth || 16}-bit PCM WAV`,
        `Export Timestamp: ${new Date().toISOString()}`,
        `Total Active Stems: ${stems.length}`,
        `Stem Mode: ${dryStems ? 'Dry Unity Gain (0dB Fader, Center Pan)' : 'Bounced with Channel Mix & Automation'}`,
        `----------------------------------------------------------------------`,
        `STEM TRACKS:`,
        ...stems.map((s, idx) => `  ${String(idx + 1).padStart(2, '0')}. ${s.filename.padEnd(36)} [${(s.sizeBytes / (1024 * 1024)).toFixed(2)} MB | ${s.durationSeconds.toFixed(1)}s]`),
        `----------------------------------------------------------------------`,
        `DAW Compatibility: Ableton Live, Pro Tools, Logic Pro, FL Studio, Reaper`,
        `Generated via Strangelet Lab Offline Audio Multitrack Engine`,
        `======================================================================`
      ].join('\n');

      zip.file('SESSION_MANIFEST.txt', manifestContent);
    }

    onProgress?.(82, `Compressing ${stems.length} WAV stems into zip archive...`);

    const zipBlob = await zip.generateAsync(
      { 
        type: 'blob', 
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      },
      (metadata) => {
        const zipProg = 82 + Math.round(metadata.percent * 0.16);
        onProgress?.(zipProg, `Compressing zip archive: ${metadata.percent.toFixed(0)}%...`);
      }
    );

    const safeProjectName = (filename || `Strangelet_Stems_${tempo}BPM_${Date.now()}`)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_');
    const zipFilename = safeProjectName.endsWith('.zip') ? safeProjectName : `${safeProjectName}.zip`;
    const downloadUrl = URL.createObjectURL(zipBlob);

    onProgress?.(100, `Batch export complete! ${stems.length} tracks zipped.`);

    return {
      zipBlob,
      downloadUrl,
      zipFilename,
      stems,
      totalSizeBytes: zipBlob.size,
      activeTrackCount: stems.length,
      durationSeconds: maxDurationSeconds
    };
  }

  /**
   * Normalizes an AudioBuffer to a target peak level (e.g. 0.96 for -0.35 dBFS)
   */
  private normalizeBuffer(buffer: AudioBuffer, targetPeak: number = 0.96) {
    let maxVal = 0;
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < data.length; i++) {
        const abs = Math.abs(data[i]);
        if (abs > maxVal) maxVal = abs;
      }
    }

    if (maxVal > 0.0001 && maxVal < targetPeak) {
      const scale = targetPeak / maxVal;
      for (let c = 0; c < buffer.numberOfChannels; c++) {
        const data = buffer.getChannelData(c);
        for (let i = 0; i < data.length; i++) {
          data[i] *= scale;
        }
      }
    }
  }

  /**
   * Synthesizes rich musical content for a clip according to track category (drums, bass, vocal, synth, piano)
   */
  private synthesizeTrackEvent(
    ctx: OfflineAudioContext,
    track: Track,
    clip: Clip,
    startTime: number,
    duration: number,
    destination: AudioNode,
    tempo: number
  ) {
    const trackName = track.name.toLowerCase();
    const secondsPerBeat = 60 / tempo;

    if (trackName.includes('drum') || trackName.includes('beat') || trackName.includes('percussion')) {
      // 4-bar or 2-bar rhythm grid
      const totalBeats = Math.floor(duration / secondsPerBeat);
      for (let b = 0; b < totalBeats; b++) {
        const beatTime = startTime + b * secondsPerBeat;
        const beatIndex = b % 4;

        // Kick on beat 1 and 3
        if (beatIndex === 0 || beatIndex === 2) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.setValueAtTime(130, beatTime);
          osc.frequency.exponentialRampToValueAtTime(45, beatTime + 0.12);
          gain.gain.setValueAtTime(0.7, beatTime);
          gain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.22);
          osc.connect(gain);
          gain.connect(destination);
          osc.start(beatTime);
          osc.stop(beatTime + 0.25);
        }

        // Snare on beat 2 and 4
        if (beatIndex === 1 || beatIndex === 3) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(220, beatTime);
          osc.frequency.exponentialRampToValueAtTime(90, beatTime + 0.15);
          gain.gain.setValueAtTime(0.5, beatTime);
          gain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.18);
          osc.connect(gain);
          gain.connect(destination);
          osc.start(beatTime);
          osc.stop(beatTime + 0.2);

          // Snare noise snap
          const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.15), ctx.sampleRate);
          const noiseData = noiseBuffer.getChannelData(0);
          for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.04));
          }
          const noiseSource = ctx.createBufferSource();
          noiseSource.buffer = noiseBuffer;
          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(0.35, beatTime);
          noiseSource.connect(noiseGain);
          noiseGain.connect(destination);
          noiseSource.start(beatTime);
          noiseSource.stop(beatTime + 0.15);
        }

        // Hi-hat on 8th notes
        for (let sub = 0; sub < 2; sub++) {
          const hatTime = beatTime + sub * (secondsPerBeat / 2);
          const hatBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate);
          const hatData = hatBuffer.getChannelData(0);
          for (let i = 0; i < hatData.length; i++) {
            hatData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.012));
          }
          const hatSource = ctx.createBufferSource();
          hatSource.buffer = hatBuffer;
          const hatGain = ctx.createGain();
          hatGain.gain.setValueAtTime(sub === 0 ? 0.25 : 0.15, hatTime);
          hatSource.connect(hatGain);
          hatGain.connect(destination);
          hatSource.start(hatTime);
          hatSource.stop(hatTime + 0.05);
        }
      }
    } else if (trackName.includes('bass')) {
      // Bass line: follows root notes (A2 -> F2 -> C2 -> G2)
      const rootNotes = [110, 87.31, 65.41, 98]; // A, F, C, G
      const bars = Math.floor(duration / (secondsPerBeat * 4));
      for (let bar = 0; bar < Math.max(1, bars); bar++) {
        const barStart = startTime + bar * (secondsPerBeat * 4);
        const rootFreq = rootNotes[bar % rootNotes.length];
        
        // 8th note driving bassline
        for (let i = 0; i < 8; i++) {
          const noteTime = barStart + i * (secondsPerBeat / 2);
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(rootFreq, noteTime);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(rootFreq * 4, noteTime);
          filter.frequency.exponentialRampToValueAtTime(rootFreq * 1.5, noteTime + secondsPerBeat * 0.4);

          gain.gain.setValueAtTime(0.4, noteTime);
          gain.gain.exponentialRampToValueAtTime(0.001, noteTime + secondsPerBeat * 0.45);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(destination);

          osc.start(noteTime);
          osc.stop(noteTime + secondsPerBeat * 0.5);
        }
      }
    } else {
      // Polyphonic Synth / Pad / Lead / Vocal track
      const chordNotes = [
        [220, 261.63, 329.63, 440], // Am
        [174.61, 220, 261.63, 349.23], // F
        [130.81, 164.81, 196, 261.63], // C
        [196, 246.94, 293.66, 392] // G
      ];

      const bars = Math.floor(duration / (secondsPerBeat * 4));
      for (let bar = 0; bar < Math.max(1, bars); bar++) {
        const barStart = startTime + bar * (secondsPerBeat * 4);
        const barDuration = secondsPerBeat * 4;
        const activeChord = chordNotes[bar % chordNotes.length];

        activeChord.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();

          osc.type = trackName.includes('vocal') ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freq, barStart);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(2500, barStart);

          const baseAmp = 0.25 / activeChord.length;
          gain.gain.setValueAtTime(0.001, barStart);
          gain.gain.linearRampToValueAtTime(baseAmp, barStart + 0.15);
          gain.gain.setValueAtTime(baseAmp * 0.8, barStart + barDuration - 0.2);
          gain.gain.exponentialRampToValueAtTime(0.001, barStart + barDuration);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(destination);

          osc.start(barStart);
          osc.stop(barStart + barDuration);
        });
      }
    }
  }

  /**
   * Synthesizes audio across an entire track duration
   */
  private synthesizeContinuousTrack(
    ctx: OfflineAudioContext,
    track: Track,
    startTime: number,
    duration: number,
    destination: AudioNode,
    tempo: number
  ) {
    const dummyClip: Clip = {
      id: `cont-${track.id}`,
      name: track.name,
      startBar: 0,
      durationBars: Math.ceil(duration / ((60 / tempo) * 4))
    };
    this.synthesizeTrackEvent(ctx, track, dummyClip, startTime, duration, destination, tempo);
  }

  /**
   * Detects percussive / energy onset chop points from a rendered AudioBuffer for KenetiCut VJ auto-chopping
   */
  public detectAudioBufferTransients(
    buffer: AudioBuffer,
    bpm: number,
    sourceTrack?: string,
    maxChops: number = 96
  ): KenetiCutTransientChop[] {
    const sampleRate = buffer.sampleRate;
    const ch0 = buffer.getChannelData(0);
    const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : ch0;

    const hopSize = Math.max(256, Math.floor(sampleRate * 0.015)); // 15ms frames
    const winSize = Math.max(512, Math.floor(sampleRate * 0.03)); // 30ms window
    const numFrames = Math.floor((ch0.length - winSize) / hopSize);
    if (numFrames <= 2) return [];

    const energies = new Float32Array(numFrames);
    const peaks = new Float32Array(numFrames);
    for (let f = 0; f < numFrames; f++) {
      const start = f * hopSize;
      let sumSq = 0;
      let maxAbs = 0;
      for (let i = 0; i < winSize; i++) {
        const mono = 0.5 * (ch0[start + i] + ch1[start + i]);
        const abs = Math.abs(mono);
        if (abs > maxAbs) maxAbs = abs;
        sumSq += mono * mono;
      }
      energies[f] = Math.sqrt(sumSq / winSize);
      peaks[f] = maxAbs;
    }

    // Half-wave rectified energy flux
    const flux = new Float32Array(numFrames);
    let maxFlux = 0;
    let sumFlux = 0;
    for (let f = 1; f < numFrames; f++) {
      const diff = Math.max(0, energies[f] - energies[f - 1] * 0.92);
      flux[f] = diff;
      sumFlux += diff;
      if (diff > maxFlux) maxFlux = diff;
    }

    if (maxFlux <= 0.0001) return [];

    const meanFlux = sumFlux / numFrames;
    let varFlux = 0;
    for (let f = 0; f < numFrames; f++) {
      const d = flux[f] - meanFlux;
      varFlux += d * d;
    }
    const stdFlux = Math.sqrt(varFlux / numFrames);
    const adaptiveThreshold = Math.max(meanFlux + stdFlux * 1.15, maxFlux * 0.16);
    const minRefractoryFrames = Math.max(1, Math.floor((0.11 * sampleRate) / hopSize)); // 110ms minimum spacing

    const secondsPerBeat = 60 / Math.max(30, bpm);
    const secondsPerBar = secondsPerBeat * 4;

    const candidates: KenetiCutTransientChop[] = [];
    let lastAcceptedFrame = -minRefractoryFrames;

    for (let f = 1; f < numFrames - 1; f++) {
      if (f - lastAcceptedFrame < minRefractoryFrames) continue;
      if (flux[f] >= adaptiveThreshold && flux[f] >= flux[f - 1] && flux[f] > flux[f + 1]) {
        const timeSeconds = Number(((f * hopSize) / sampleRate).toFixed(4));
        const totalBeats = timeSeconds / secondsPerBeat;
        const bar = Math.floor(totalBeats / 4) + 1;
        const beat = Number(((totalBeats % 4) + 1).toFixed(2));
        const intensity = Number(Math.min(1, flux[f] / maxFlux).toFixed(3));
        const peakVal = Math.max(0.0001, peaks[f]);
        const peakDb = Number((20 * Math.log10(peakVal)).toFixed(1));

        candidates.push({
          index: candidates.length + 1,
          timeSeconds,
          bar,
          beat,
          intensity,
          peakDb,
          sourceTrack
        });
        lastAcceptedFrame = f;
      }
    }

    // If capped, retain the strongest transients sorted chronologically
    if (candidates.length > maxChops) {
      const top = [...candidates]
        .sort((a, b) => b.intensity - a.intensity)
        .slice(0, maxChops)
        .sort((a, b) => a.timeSeconds - b.timeSeconds)
        .map((item, idx) => ({ ...item, index: idx + 1 }));
      return top;
    }

    // Check bar alignment consistency (fallback safeguard not needed unless silence)
    void secondsPerBar;
    return candidates;
  }

  /**
   * Packages the project master audio or stems alongside an audio-reactive JSON manifest
   * (BPM, detected transient chop points, beat grid, and song markers) ready for KenetiCut VJ Studio.
   */
  public async renderKenetiCutVjBundle(
    tracks: Track[],
    options: KenetiCutExportOptions
  ): Promise<KenetiCutExportResult> {
    const {
      mode = 'mix',
      sampleRate = 44100,
      bitDepth = 16,
      totalBars = 16,
      tempo = 120,
      masterGain = 0.8,
      normalize = true,
      limiter = true,
      filename,
      dryStems = false,
      namingFormat = 'numbered',
      trackIds,
      markers,
      range,
      onProgress
    } = options;

    const secondsPerBeat = 60 / tempo;
    const secondsPerBar = secondsPerBeat * 4;
    const effectiveStartBar = range ? Math.max(0, range.startBar) : 0;
    const effectiveEndBar = range ? Math.min(totalBars, range.endBar) : totalBars;
    const renderBars = Math.max(1, effectiveEndBar - effectiveStartBar);
    const arrangementDurationSec = renderBars * secondsPerBar;

    const zip = new JSZip();
    const audioFiles: KenetiCutManifest['audioFiles'] = [];
    let allTransients: KenetiCutTransientChop[] = [];
    let exportDurationSeconds = arrangementDurationSec;

    if (mode === 'mix') {
      onProgress?.(10, 'KenetiCut VJ Bridge: Rendering stereo master audio...');
      const buffer = await this.renderProjectAudioBuffer(tracks, {
        ...options,
        normalize,
        limiter,
        onProgress: (pct, msg) => onProgress?.(Math.min(70, Math.round(pct * 0.7)), msg)
      });
      exportDurationSeconds = buffer.duration;

      onProgress?.(74, 'KenetiCut VJ Bridge: Detecting transient chop points...');
      allTransients = this.detectAudioBufferTransients(buffer, tempo, 'Master Mix', 128);

      const safeMasterBase = (filename || `Strangelet_KenetiCut_${tempo}BPM`)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/\.wav$/i, '');
      const masterWavName = `${safeMasterBase}.wav`;
      const wavBlob = encodeAudioBufferToWav(buffer, bitDepth);

      let maxPeak = 0;
      for (let c = 0; c < buffer.numberOfChannels; c++) {
        const d = buffer.getChannelData(c);
        for (let i = 0; i < d.length; i++) {
          const abs = Math.abs(d[i]);
          if (abs > maxPeak) maxPeak = abs;
        }
      }
      const peakDb = maxPeak > 0.0001 ? Number((20 * Math.log10(maxPeak)).toFixed(1)) : -96.0;

      zip.file(masterWavName, wavBlob);
      audioFiles.push({
        role: 'master',
        trackName: 'Master Mix',
        filename: masterWavName,
        sizeBytes: wavBlob.size,
        durationSeconds: buffer.duration,
        peakDb
      });
    } else {
      const anySoloed = tracks.some(t => t.soloed);
      let targetTracks = tracks.filter(t => !t.muted && (!anySoloed || t.soloed));
      if (trackIds && trackIds.length > 0) {
        targetTracks = targetTracks.filter(t => trackIds.includes(t.id));
      }
      if (targetTracks.length === 0) {
        throw new Error('No active tracks selected for KenetiCut VJ stem package.');
      }

      const combinedTransients: KenetiCutTransientChop[] = [];
      for (let i = 0; i < targetTracks.length; i++) {
        const track = targetTracks[i];
        const indexPrefix = String(i + 1).padStart(2, '0');
        const safeTrackName = track.name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');

        let stemFilename = `${indexPrefix}_${safeTrackName}.wav`;
        if (namingFormat === 'clean') {
          stemFilename = `${safeTrackName}_Stem.wav`;
        } else if (namingFormat === 'detailed') {
          stemFilename = `${indexPrefix}_${safeTrackName}_${tempo}BPM_${sampleRate}Hz.wav`;
        }

        const pct = 8 + Math.round((i / targetTracks.length) * 60);
        onProgress?.(pct, `KenetiCut VJ Bridge: Rendering stem [${i + 1}/${targetTracks.length}] ${track.name}...`);

        const stemRes = await this.renderTrackStemWithBuffer(track, options, dryStems);
        exportDurationSeconds = Math.max(exportDurationSeconds, stemRes.durationSeconds);

        zip.file(stemFilename, stemRes.blob);
        audioFiles.push({
          role: 'stem',
          trackId: track.id,
          trackName: track.name,
          filename: stemFilename,
          sizeBytes: stemRes.sizeBytes,
          durationSeconds: stemRes.durationSeconds,
          peakDb: stemRes.peakDb
        });

        const trackTransients = this.detectAudioBufferTransients(stemRes.buffer, tempo, track.name, 48);
        combinedTransients.push(...trackTransients);
      }

      onProgress?.(74, 'KenetiCut VJ Bridge: Merging multi-stem transient chop points...');
      // Sort chronologically and merge near-simultaneous hits within 65ms keeping higher intensity
      combinedTransients.sort((a, b) => a.timeSeconds - b.timeSeconds);
      const merged: KenetiCutTransientChop[] = [];
      for (const chop of combinedTransients) {
        const prev = merged[merged.length - 1];
        if (prev && Math.abs(chop.timeSeconds - prev.timeSeconds) < 0.065) {
          if (chop.intensity > prev.intensity) {
            merged[merged.length - 1] = chop;
          }
        } else {
          merged.push(chop);
        }
      }
      allTransients = merged.slice(0, 128).map((c, idx) => ({ ...c, index: idx + 1 }));
    }

    onProgress?.(82, 'KenetiCut VJ Bridge: Generating beat grid & song marker manifest...');

    // Build Beat Grid
    const beatTimestamps: number[] = [];
    const totalBeats = renderBars * 4;
    for (let b = 0; b < totalBeats; b++) {
      beatTimestamps.push(Number((b * secondsPerBeat).toFixed(4)));
    }

    // Build Song Markers from project TimelineMarkers or arrangement defaults
    const sourceMarkers: TimelineMarker[] = (markers && markers.length > 0)
      ? markers
      : [
          { id: 'intro', position: 0.0, label: 'Intro', barNumber: 1 },
          { id: 'drop', position: 0.25, label: 'Drop / Main Groove', barNumber: Math.max(2, Math.round(totalBars * 0.25) + 1) },
          { id: 'breakdown', position: 0.5, label: 'Breakdown', barNumber: Math.max(3, Math.round(totalBars * 0.5) + 1) },
          { id: 'outro', position: 0.875, label: 'Outro', barNumber: Math.max(4, Math.round(totalBars * 0.875) + 1) }
        ];

    const songMarkers: KenetiCutSongMarker[] = sourceMarkers
      .map(m => {
        const pos = Math.max(0, Math.min(1, m.position));
        const timeSeconds = Number((pos * arrangementDurationSec).toFixed(4));
        const totalBeatsAtPos = pos * totalBars * 4;
        const bar = m.barNumber || Math.floor(totalBeatsAtPos / 4) + 1;
        const beat = Number(((totalBeatsAtPos % 4) + 1).toFixed(2));
        return {
          id: m.id,
          label: m.label,
          positionNormalized: pos,
          timeSeconds,
          bar,
          beat,
          color: m.color
        };
      })
      .sort((a, b) => a.timeSeconds - b.timeSeconds);

    const projectName = (filename || `Strangelet_KenetiCut_${tempo}BPM`)
      .replace(/\.(wav|zip)$/i, '');

    const manifest: KenetiCutManifest = {
      format: 'KenetiCut-VJ-AudioReactive-v1',
      generator: 'Strangelet Lab Audio Workstation',
      projectName,
      exportedAt: new Date().toISOString(),
      exportMode: mode === 'mix' ? 'master' : 'stems',
      bpm: tempo,
      timeSignature: '4/4',
      totalBars: renderBars,
      durationSeconds: Number(exportDurationSeconds.toFixed(3)),
      sampleRate,
      bitDepth,
      audioFiles,
      beatGrid: {
        bpm: tempo,
        secondsPerBeat: Number(secondsPerBeat.toFixed(6)),
        secondsPerBar: Number(secondsPerBar.toFixed(6)),
        beatTimestamps
      },
      transientChopPoints: allTransients,
      songMarkers,
      vjReactiveHints: {
        recommendedCutMode: allTransients.length >= 8 ? 'transient_chop' : 'beat_sync',
        transientThreshold: 0.35,
        strobeOnStrongTransients: allTransients.some(t => t.intensity >= 0.75),
        stemDrivenVisuals: mode === 'stems'
      }
    };

    zip.file('keneticut_manifest.json', JSON.stringify(manifest, null, 2));

    const readme = [
      '========================================================================',
      'KENETICUT VJ STUDIO - AUDIO-REACTIVE EXPORT BRIDGE PACKAGE',
      '========================================================================',
      `Project: ${projectName}`,
      `Mode: ${mode === 'mix' ? 'Master Audio Bounce' : `Multi-Stem Package (${audioFiles.length} stems)`}`,
      `Tempo: ${tempo} BPM (4/4)`,
      `Detected Transient Chop Points: ${allTransients.length}`,
      `Song Markers: ${songMarkers.length} (${songMarkers.map(m => m.label).join(', ')})`,
      `Format: ${sampleRate} Hz / ${bitDepth}-bit PCM WAV`,
      '',
      'HOW TO LOAD IN KENETICUT VJ STUDIO:',
      '1. Import this .zip archive or extract into a KenetiCut project folder.',
      '2. KenetiCut automatically reads keneticut_manifest.json to align:',
      '   - Master BPM & sample-accurate beat grid',
      '   - Transient chop timestamps for reactive video cuts/strobes',
      '   - Arrangement song markers for scene transitions',
      '========================================================================'
    ].join('\n');
    zip.file('KENETICUT_VJ_README.txt', readme);

    onProgress?.(88, 'Compressing KenetiCut VJ Studio bundle (.zip)...');

    const zipBlob = await zip.generateAsync(
      {
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      },
      (metadata) => {
        const zipProg = 88 + Math.round(metadata.percent * 0.11);
        onProgress?.(zipProg, `Packaging KenetiCut VJ bundle: ${metadata.percent.toFixed(0)}%`);
      }
    );

    const safeZipName = `${projectName.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_')}_KenetiCut_VJ.zip`;
    const downloadUrl = URL.createObjectURL(zipBlob);

    onProgress?.(100, `KenetiCut VJ bundle ready (${allTransients.length} chop points, ${songMarkers.length} markers)`);

    return {
      zipBlob,
      downloadUrl,
      zipFilename: safeZipName,
      manifest,
      totalSizeBytes: zipBlob.size
    };
  }

  /**
   * Helper to trigger a browser download for a generated WAV Blob
   */
  public static downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  /**
   * Helper to download all stems as individual WAV files directly to the browser
   */
  public static async downloadAllStemsIndividually(stems: StemExportItem[], staggerMs: number = 250): Promise<void> {
    for (let i = 0; i < stems.length; i++) {
      const stem = stems[i];
      OfflineAudioRenderer.downloadBlob(stem.blob, stem.filename);
      if (i < stems.length - 1) {
        await new Promise(resolve => setTimeout(resolve, staggerMs));
      }
    }
  }
}

export const offlineAudioRenderer = new OfflineAudioRenderer();
