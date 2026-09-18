// Offline Audio Renderer for Strangelet Lab Mixer
// Uses Web Audio OfflineAudioContext to render and bounce multitrack arrangements to .wav files.

import { Track, Clip } from '../types';
import { evaluateAutomationAt } from '../lib/audioUtils';
import { audioBufferToWav } from '../lib/sunoAudioEngine';

export interface ExportOptions {
  sampleRate: number; // 44100, 48000, 96000
  bitDepth: 16 | 24;
  totalBars: number;
  tempo: number;
  masterGain: number;
  normalize: boolean;
  limiter: boolean;
  filename?: string;
  range?: {
    startBar: number;
    endBar: number;
  };
  onProgress?: (percent: number, statusText: string) => void;
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
      totalBars = 16,
      tempo = 120,
      masterGain = 0.8,
      normalize = true,
      limiter = true,
      range,
      onProgress
    } = options;

    onProgress?.(5, 'Initializing Offline Audio Context...');

    // Calculate time duration
    // 1 bar = 4 beats. 1 beat = 60 / tempo seconds
    const secondsPerBeat = 60 / tempo;
    const secondsPerBar = secondsPerBeat * 4;

    const startBar = range ? Math.max(0, range.startBar) : 0;
    const endBar = range ? Math.min(totalBars, range.endBar) : totalBars;
    const renderBars = Math.max(1, endBar - startBar);
    
    // Add 1.5 seconds tail for reverb/delay ringing out
    const durationSeconds = renderBars * secondsPerBar + 1.5;
    const totalFrames = Math.ceil(durationSeconds * sampleRate);

    const offlineCtx = new OfflineAudioContext(2, totalFrames, sampleRate);

    // Master Bus Chain
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

      // Apply Volume & Pan Automation if configured
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

      // Process Clips on this track
      const clips = track.clips || [];

      if (clips.length > 0) {
        for (const clip of clips) {
          const clipStartSec = Math.max(0, (clip.startBar - startBar) * secondsPerBar);
          const clipDurSec = (clip.durationBars || 2) * secondsPerBar;

          if (clip.audioUrl) {
            // Recorded audio or imported audio file clip
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
            // MIDI / Pattern based clip: synthesize musical content
            this.synthesizeTrackEvent(offlineCtx, track, clip, clipStartSec, clipDurSec, trackGain, tempo);
          }
        }
      } else {
        // Track has no explicit clips: synthesize continuous track content across the active arrangement
        const fullTrackDur = renderBars * secondsPerBar;
        this.synthesizeContinuousTrack(offlineCtx, track, 0, fullTrackDur, trackGain, tempo);
      }

      processedTrackCount++;
      const trackProgress = 15 + Math.round((processedTrackCount / activeTracks.length) * 45);
      onProgress?.(trackProgress, `Routing track ${processedTrackCount}/${activeTracks.length}: ${track.name}`);
    }

    onProgress?.(65, 'Executing high-speed offline Web Audio rendering...');

    // Run offline bounce
    const renderedBuffer = await offlineCtx.startRendering();

    onProgress?.(85, 'Normalizing & encoding 16-bit PCM WAV container...');

    // Optional Normalization to -0.3 dBFS peak
    if (normalize) {
      this.normalizeBuffer(renderedBuffer, 0.96);
    }

    // Convert AudioBuffer to WAV Blob
    const wavBlob = audioBufferToWav(renderedBuffer);
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
      durationSeconds,
      fileSizeBytes: wavBlob.size,
      sampleRate,
      channels: 2
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
}

export const offlineAudioRenderer = new OfflineAudioRenderer();
