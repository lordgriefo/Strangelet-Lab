import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Drum,
  Play,
  Pause,
  Square,
  Upload,
  Sparkles,
  Sliders,
  Music,
  Download,
  Layers,
  Zap,
  Check,
  Volume2,
  Activity,
  RefreshCw,
  Wand2,
  ArrowRight,
  Disc,
  Radio,
  FileAudio
} from 'lucide-react';
import { Track, Clip, MidiNoteEvent } from '../types';
import { getAudioContext, playColliderInjectionSound, playLaserBeamSound } from '../lib/laserSound';
import { audioBufferToWav } from '../lib/sunoAudioEngine';
import { audioService } from '../services/audioService';
import { createStandardMidiFile, midiBytesToDataUri } from '../services/basicPitchService';

export type DrumClass = 'kick' | 'snare' | 'hihat' | 'tom';
export type SfzDrumKitId = '808_boom' | '909_vintage' | 'acoustic_snare';
export type AuditionMode = 'original' | 'replaced' | 'blend';

export interface DetectedTransient {
  id: string;
  timeSeconds: number;
  sampleIndex: number;
  barPosition: number;
  peakAmplitude: number;
  velocity: number; // 1-127
  confidence: number;
  drumClass: DrumClass;
  enabled: boolean;
  spectralBand: 'low' | 'mid' | 'high' | 'low_mid';
}

interface WaveformBin {
  min: number;
  max: number;
  rms: number;
}

export interface DrumTriggerViewProps {
  tracks: Track[];
  tempo?: number;
  activeTrackId?: string;
  onAddTrack?: (newTrack: Track) => void;
  onReplaceTrackClips?: (trackId: string, newClip: Clip) => void;
  onOpenInMidiEditor?: (clip: Clip) => void;
  onNavigateToMixer?: () => void;
}

const DRUM_CLASS_META: Record<
  DrumClass,
  { label: string; short: string; color: string; defaultGmNote: number }
> = {
  kick: { label: 'Kick Drum', short: 'K', color: '#FF2E63', defaultGmNote: 36 },
  snare: { label: 'Snare Drum', short: 'S', color: '#00F0FF', defaultGmNote: 38 },
  hihat: { label: 'Hi-Hat', short: 'H', color: '#FFD700', defaultGmNote: 42 },
  tom: { label: 'Tom', short: 'T', color: '#A855F7', defaultGmNote: 45 }
};

const SFZ_DRUM_KITS: {
  id: SfzDrumKitId;
  name: string;
  subtitle: string;
  badge: string;
  accentColor: string;
  sfzPath: string;
  description: string;
}[] = [
  {
    id: '808_boom',
    name: '808 Boom',
    subtitle: 'Sub-Heavy Analog TR-808 SFZ',
    badge: 'SUB / TRAP / ELECTRO',
    accentColor: '#FF2E63',
    sfzPath: 'sfz/drums/808_Boom_Master.sfz',
    description: 'Deep 808 sub pitch-drop kick, crisp analog snare snap, metallic hats, and booming floor tom.'
  },
  {
    id: '909_vintage',
    name: '909 Vintage Kit',
    subtitle: 'Classic Punchy TR-909 SFZ',
    badge: 'HOUSE / TECHNO / BREAKS',
    accentColor: '#00F0FF',
    sfzPath: 'sfz/drums/909_Vintage_Kit.sfz',
    description: 'Punchy click-driven 909 kick, snappy wire crack snare, bright sizzle hi-hats, and tight analog toms.'
  },
  {
    id: 'acoustic_snare',
    name: 'Acoustic Snare',
    subtitle: 'Studio Multi-Velocity Acoustic SFZ',
    badge: 'LIVE STUDIO / ROCK / BREAKBEAT',
    accentColor: '#F59E0B',
    sfzPath: 'sfz/drums/Acoustic_Snare_Studio.sfz',
    description: 'Warm oak room kick, resonant brass-shell Acoustic Snare with snare-wire buzz, bronze hats, and natural tom.'
  }
];

const GM_DRUM_OPTIONS: { note: number; name: string }[] = [
  { note: 35, name: '35 • B0 Acoustic Bass Drum' },
  { note: 36, name: '36 • C1 Bass Drum 1 (Kick)' },
  { note: 37, name: '37 • C#1 Side Stick' },
  { note: 38, name: '38 • D1 Acoustic Snare' },
  { note: 39, name: '39 • D#1 Hand Clap' },
  { note: 40, name: '40 • E1 Electric Snare' },
  { note: 41, name: '41 • F1 Low Floor Tom' },
  { note: 42, name: '42 • F#1 Closed Hi-Hat' },
  { note: 43, name: '43 • G1 High Floor Tom' },
  { note: 44, name: '44 • G#1 Pedal Hi-Hat' },
  { note: 45, name: '45 • A1 Low Tom' },
  { note: 46, name: '46 • A#1 Open Hi-Hat' },
  { note: 47, name: '47 • B1 Low-Mid Tom' },
  { note: 48, name: '48 • C2 Hi-Mid Tom' },
  { note: 49, name: '49 • C#2 Crash Cymbal 1' },
  { note: 51, name: '51 • D#2 Ride Cymbal 1' }
];

function gmNoteLabel(note: number): string {
  const found = GM_DRUM_OPTIONS.find(o => o.note === note);
  return found ? found.name : `GM ${note}`;
}

/**
 * Triggers a single SFZ-modeled drum hit on any BaseAudioContext (live AudioContext or OfflineAudioContext).
 */
function triggerSfzDrumHit(
  ctx: BaseAudioContext,
  destination: AudioNode,
  kitId: SfzDrumKitId,
  drumClass: DrumClass,
  when: number,
  velocityNorm: number
) {
  const vel = Math.max(0.15, Math.min(1.0, velocityNorm));

  if (drumClass === 'kick') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';

    if (kitId === '808_boom') {
      osc.frequency.setValueAtTime(145, when);
      osc.frequency.exponentialRampToValueAtTime(42, when + 0.09);
      osc.frequency.exponentialRampToValueAtTime(32, when + 0.48);
      gain.gain.setValueAtTime(0.95 * vel, when);
      gain.gain.exponentialRampToValueAtTime(0.001, when + 0.52);
      osc.connect(gain);
      gain.connect(destination);
      osc.start(when);
      osc.stop(when + 0.54);
    } else if (kitId === '909_vintage') {
      osc.frequency.setValueAtTime(195, when);
      osc.frequency.exponentialRampToValueAtTime(48, when + 0.065);
      gain.gain.setValueAtTime(0.95 * vel, when);
      gain.gain.exponentialRampToValueAtTime(0.001, when + 0.32);
      osc.connect(gain);
      gain.connect(destination);
      osc.start(when);
      osc.stop(when + 0.34);

      // 909 transient beater click
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(900, when);
      clickOsc.frequency.exponentialRampToValueAtTime(160, when + 0.018);
      clickGain.gain.setValueAtTime(0.45 * vel, when);
      clickGain.gain.exponentialRampToValueAtTime(0.001, when + 0.02);
      clickOsc.connect(clickGain);
      clickGain.connect(destination);
      clickOsc.start(when);
      clickOsc.stop(when + 0.025);
    } else {
      // Acoustic oak studio kick
      osc.frequency.setValueAtTime(150, when);
      osc.frequency.exponentialRampToValueAtTime(52, when + 0.08);
      gain.gain.setValueAtTime(0.85 * vel, when);
      gain.gain.exponentialRampToValueAtTime(0.001, when + 0.28);
      osc.connect(gain);
      gain.connect(destination);
      osc.start(when);
      osc.stop(when + 0.3);
    }
    return;
  }

  if (drumClass === 'snare') {
    const duration = kitId === 'acoustic_snare' ? 0.3 : kitId === '909_vintage' ? 0.22 : 0.18;
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const noiseBuf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;

    const filter = ctx.createBiquadFilter();
    filter.type = kitId === 'acoustic_snare' ? 'highpass' : 'bandpass';
    filter.frequency.setValueAtTime(
      kitId === 'acoustic_snare' ? 1400 : kitId === '909_vintage' ? 2300 : 2800,
      when
    );
    filter.Q.setValueAtTime(kitId === 'acoustic_snare' ? 0.8 : 1.1, when);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime((kitId === 'acoustic_snare' ? 0.78 : 0.68) * vel, when);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, when + duration);

    noiseSrc.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(destination);
    noiseSrc.start(when);

    // Snare shell body tone
    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    bodyOsc.type = 'triangle';
    const startFreq = kitId === 'acoustic_snare' ? 215 : kitId === '909_vintage' ? 190 : 175;
    bodyOsc.frequency.setValueAtTime(startFreq, when);
    bodyOsc.frequency.exponentialRampToValueAtTime(88, when + 0.09);
    bodyGain.gain.setValueAtTime(0.62 * vel, when);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, when + 0.12);
    bodyOsc.connect(bodyGain);
    bodyGain.connect(destination);
    bodyOsc.start(when);
    bodyOsc.stop(when + 0.13);
    return;
  }

  if (drumClass === 'hihat') {
    const duration = kitId === 'acoustic_snare' ? 0.11 : kitId === '909_vintage' ? 0.085 : 0.065;
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const noiseBuf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(kitId === 'acoustic_snare' ? 5800 : 7200, when);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.45 * vel, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + duration);

    noiseSrc.connect(hp);
    hp.connect(gain);
    gain.connect(destination);
    noiseSrc.start(when);
    return;
  }

  // Tom
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  const tomStart = kitId === '808_boom' ? 130 : kitId === '909_vintage' ? 165 : 155;
  const tomEnd = kitId === '808_boom' ? 56 : 72;
  const tomDecay = kitId === '808_boom' ? 0.34 : 0.28;
  osc.frequency.setValueAtTime(tomStart, when);
  osc.frequency.exponentialRampToValueAtTime(tomEnd, when + tomDecay);
  gain.gain.setValueAtTime(0.8 * vel, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + tomDecay);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(when);
  osc.stop(when + tomDecay + 0.02);
}

/**
 * Generates a realistic 4-bar acoustic drum stem AudioBuffer synced to BPM
 * so transient detection & SFZ replacement work out-of-the-box.
 */
async function synthesizeDemoDrumStem(
  bpm: number,
  bars = 4,
  seedWaveform?: number[]
): Promise<AudioBuffer> {
  const sampleRate = 44100;
  const secondsPerBar = (60 / Math.max(40, Math.min(220, bpm))) * 4;
  const durationSeconds = secondsPerBar * bars;
  const offline = new OfflineAudioContext(2, Math.floor(sampleRate * durationSeconds), sampleRate);

  const beatSec = 60 / bpm;

  for (let bar = 0; bar < bars; bar++) {
    const barStart = bar * secondsPerBar;

    // 16th-note grid per bar
    for (let step = 0; step < 16; step++) {
      const t = barStart + step * (beatSec / 4);
      const wfInfluence =
        seedWaveform && seedWaveform.length > 0
          ? seedWaveform[(bar * 16 + step) % seedWaveform.length]
          : 0.75;
      const dynScale = Math.max(0.55, Math.min(1.0, 0.65 + wfInfluence * 0.45));

      // Kicks on 0, 6, 8, (and 14 every 2nd bar)
      if (step === 0 || step === 6 || step === 8 || (bar % 2 === 1 && step === 14)) {
        triggerSfzDrumHit(offline, offline.destination, 'acoustic_snare', 'kick', t, 0.92 * dynScale);
      }
      // Snares on beats 2 and 4 (steps 4 and 12)
      if (step === 4 || step === 12) {
        triggerSfzDrumHit(offline, offline.destination, 'acoustic_snare', 'snare', t, 0.9 * dynScale);
      }
      // Toms fill on last bar steps 13 & 15
      if (bar === bars - 1 && (step === 13 || step === 15)) {
        triggerSfzDrumHit(offline, offline.destination, 'acoustic_snare', 'tom', t, 0.85);
      } else if (step % 2 === 0 || step === 11) {
        // Hi-Hats on 8th notes (+ skip collision on heavy snare/kick if desired, still crisp)
        if (step !== 0 && step !== 4 && step !== 8 && step !== 12) {
          triggerSfzDrumHit(offline, offline.destination, 'acoustic_snare', 'hihat', t, 0.62 * dynScale);
        }
      }
    }
  }

  return await offline.startRendering();
}

/**
 * Analyzes an AudioBuffer for transient attack peaks and classifies each hit into
 * Kick, Snare, Hi-Hat, or Tom using spectral band energy & zero-crossing rate.
 */
function analyzeAudioTransients(
  audioBuffer: AudioBuffer,
  threshold: number,
  minSpacingMs: number,
  bpm: number
): { bins: WaveformBin[]; transients: DetectedTransient[] } {
  const sampleRate = audioBuffer.sampleRate || 44100;
  const totalSamples = audioBuffer.length;
  const ch0 = audioBuffer.getChannelData(0);
  const ch1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : ch0;

  // Mix to mono
  const mono = new Float32Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    mono[i] = (ch0[i] + ch1[i]) * 0.5;
  }

  // 1. Compute 240 waveform bins for crisp rendering
  const binCount = 240;
  const binStep = Math.max(1, Math.floor(totalSamples / binCount));
  const bins: WaveformBin[] = [];
  for (let b = 0; b < binCount; b++) {
    const start = b * binStep;
    const end = Math.min(totalSamples, start + binStep);
    let min = 0;
    let max = 0;
    let sumSq = 0;
    for (let i = start; i < end; i++) {
      const v = mono[i];
      if (v < min) min = v;
      if (v > max) max = v;
      sumSq += v * v;
    }
    const count = Math.max(1, end - start);
    bins.push({ min, max, rms: Math.sqrt(sumSq / count) });
  }

  // 2. Scan for transient attack peaks
  const frameSize = Math.max(128, Math.floor(sampleRate * 0.005)); // 5ms frames
  const minHoldoffSamples = Math.floor((minSpacingMs / 1000) * sampleRate);
  const secondsPerBar = (60 / Math.max(40, Math.min(220, bpm))) * 4;

  const transients: DetectedTransient[] = [];
  let lastTriggerSample = -minHoldoffSamples;
  let prevRms = 0.005;

  for (let start = 0; start < totalSamples - frameSize; start += frameSize) {
    let peak = 0;
    let peakIdx = start;
    let sumSq = 0;

    for (let i = start; i < start + frameSize; i++) {
      const a = Math.abs(mono[i]);
      if (a > peak) {
        peak = a;
        peakIdx = i;
      }
      sumSq += a * a;
    }

    const frameRms = Math.sqrt(sumSq / frameSize);
    const attackJump = frameRms / Math.max(0.004, prevRms);

    // Trigger when peak clears threshold AND shows transient attack edge (or clear peak jump)
    if (
      peak >= threshold &&
      attackJump >= 1.35 &&
      peakIdx - lastTriggerSample >= minHoldoffSamples
    ) {
      // Refine exact peak within +/- 4ms window
      const searchEnd = Math.min(totalSamples, peakIdx + Math.floor(sampleRate * 0.012));
      let refinedPeak = peak;
      let refinedIdx = peakIdx;
      for (let j = peakIdx; j < searchEnd; j++) {
        const a = Math.abs(mono[j]);
        if (a > refinedPeak) {
          refinedPeak = a;
          refinedIdx = j;
        }
      }

      // Analyze 30ms spectral character right after onset
      const winStart = Math.max(0, refinedIdx - Math.floor(sampleRate * 0.002));
      const winEnd = Math.min(totalSamples, winStart + Math.floor(sampleRate * 0.032));
      const winLen = Math.max(1, winEnd - winStart);

      let zeroCrossings = 0;
      let lowAcc = 0;
      let prevLp = 0;
      let prevSample = mono[winStart] || 0;
      let lowEnergy = 0;
      let highEnergy = 0;
      let totalEnergy = 0;

      // Simple 1-pole lowpass (~180Hz) to isolate sub/kick body vs high-frequency snap
      const alphaLow = 0.035;
      for (let k = winStart; k < winEnd; k++) {
        const s = mono[k];
        if ((s >= 0 && prevSample < 0) || (s < 0 && prevSample >= 0)) {
          zeroCrossings++;
        }
        prevLp = prevLp + alphaLow * (s - prevLp);
        lowAcc = prevLp;
        const hp = s - prevSample; // derivative approximates high-band energy

        lowEnergy += lowAcc * lowAcc;
        highEnergy += hp * hp;
        totalEnergy += s * s;
        prevSample = s;
      }

      const zcrHz = (zeroCrossings / 2) / (winLen / sampleRate);
      const lowRatio = lowEnergy / Math.max(1e-7, totalEnergy);
      const highRatio = highEnergy / Math.max(1e-7, totalEnergy);

      let drumClass: DrumClass = 'snare';
      let spectralBand: DetectedTransient['spectralBand'] = 'mid';

      if (zcrHz > 2400 || (highRatio > 0.32 && lowRatio < 0.14)) {
        drumClass = 'hihat';
        spectralBand = 'high';
      } else if (lowRatio >= 0.42 && zcrHz < 380) {
        drumClass = 'kick';
        spectralBand = 'low';
      } else if (zcrHz >= 220 && zcrHz <= 700 && lowRatio >= 0.22 && highRatio < 0.16) {
        drumClass = 'tom';
        spectralBand = 'low_mid';
      } else {
        drumClass = 'snare';
        spectralBand = 'mid';
      }

      const timeSeconds = refinedIdx / sampleRate;
      const barPosition = timeSeconds / secondsPerBar;
      const velocity = Math.max(24, Math.min(127, Math.round(refinedPeak * 124)));
      const confidence = Number(Math.min(0.99, Math.max(0.65, 0.7 + (refinedPeak - threshold) * 0.4)).toFixed(2));

      transients.push({
        id: `tr-${transients.length}-${refinedIdx}`,
        timeSeconds,
        sampleIndex: refinedIdx,
        barPosition,
        peakAmplitude: Number(refinedPeak.toFixed(3)),
        velocity,
        confidence,
        drumClass,
        enabled: true,
        spectralBand
      });

      lastTriggerSample = refinedIdx;
    }

    prevRms = prevRms * 0.65 + frameRms * 0.35;
  }

  return { bins, transients };
}

export const DrumTriggerView: React.FC<DrumTriggerViewProps> = ({
  tracks,
  tempo = 120,
  activeTrackId,
  onAddTrack,
  onReplaceTrackClips,
  onOpenInMidiEditor,
  onNavigateToMixer
}) => {
  const audioTracks = useMemo(
    () => tracks.filter(t => t.type === 'audio'),
    [tracks]
  );

  // Pick initial drum stem or active track
  const initialTrackId = useMemo(() => {
    if (activeTrackId && audioTracks.some(t => t.id === activeTrackId)) {
      return activeTrackId;
    }
    const drumNamed = audioTracks.find(t =>
      /drum|kick|snare|beat|perc|808|909/i.test(t.name)
    );
    return drumNamed?.id || audioTracks[0]?.id || '';
  }, [audioTracks, activeTrackId]);

  const [selectedTrackId, setSelectedTrackId] = useState<string>(initialTrackId);
  const [sourceLabel, setSourceLabel] = useState<string>('Acoustic Drum Break Stem');
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isLoadingSource, setIsLoadingSource] = useState<boolean>(false);

  // Detection controls
  const [threshold, setThreshold] = useState<number>(0.22);
  const [minSpacingMs, setMinSpacingMs] = useState<number>(75);
  const [filterClass, setFilterClass] = useState<DrumClass | 'all'>('all');

  // Transient overrides / toggles
  const [transients, setTransients] = useState<DetectedTransient[]>([]);
  const [waveformBins, setWaveformBins] = useState<WaveformBin[]>([]);
  const [selectedTransientId, setSelectedTransientId] = useState<string | null>(null);

  // Replacement targets
  const [selectedSfzKit, setSelectedSfzKit] = useState<SfzDrumKitId>('808_boom');
  const [gmNoteMap, setGmNoteMap] = useState<Record<DrumClass, number>>({
    kick: 36,
    snare: 38,
    hihat: 42,
    tom: 45
  });

  // Playback state
  const [auditionMode, setAuditionMode] = useState<AuditionMode>('blend');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playheadSeconds, setPlayheadSeconds] = useState<number>(0);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeSourcesRef = useRef<AudioNode[]>([]);
  const playStartCtxTimeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const isDraggingThresholdRef = useRef<boolean>(false);

  const showNotice = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => setStatusBanner(null), 4000);
  };

  const stopPlayback = useCallback(() => {
    activeSourcesRef.current.forEach(node => {
      try {
        if ('stop' in node && typeof (node as any).stop === 'function') {
          (node as any).stop();
        }
        node.disconnect();
      } catch {
        // ignore stopped nodes
      }
    });
    activeSourcesRef.current = [];
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsPlaying(false);
    setPlayheadSeconds(0);
  }, []);

  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, [stopPlayback]);

  // Load selected track audio or synthesize stem
  const loadFromTrack = useCallback(async (trackId: string) => {
    stopPlayback();
    setIsLoadingSource(true);
    try {
      const trk = audioTracks.find(t => t.id === trackId);
      if (!trk) {
        const demo = await synthesizeDemoDrumStem(tempo, 4);
        setAudioBuffer(demo);
        setSourceLabel('Demo 4-Bar Drum Break Stem');
        return;
      }

      setSourceLabel(trk.name);

      // 1. Check audioService cache
      const cached = audioService.getTrackAudioBuffer(trk.id);
      if (cached) {
        setAudioBuffer(cached);
        return;
      }

      // 2. Check clip audioUrl
      const clipWithUrl = trk.clips.find(c => Boolean(c.audioUrl));
      if (clipWithUrl?.audioUrl) {
        try {
          const res = await fetch(clipWithUrl.audioUrl);
          if (res.ok) {
            const arr = await res.arrayBuffer();
            const ctx = getAudioContext();
            const decoded = await ctx.decodeAudioData(arr);
            audioService.setTrackAudioBuffer(trk.id, decoded);
            setAudioBuffer(decoded);
            return;
          }
        } catch (err) {
          console.warn('Could not fetch/decode clip audioUrl, synthesizing track stem:', err);
        }
      }

      // 3. Fallback: Synthesize bar-synced drum stem seeded by track waveform
      const clipBars = trk.clips[0]?.durationBars || 4;
      const bars = Math.max(2, Math.min(8, clipBars));
      const synthBuf = await synthesizeDemoDrumStem(tempo, bars, trk.waveform);
      audioService.setTrackAudioBuffer(trk.id, synthBuf);
      setAudioBuffer(synthBuf);
    } finally {
      setIsLoadingSource(false);
    }
  }, [audioTracks, tempo, stopPlayback]);

  useEffect(() => {
    if (selectedTrackId) {
      loadFromTrack(selectedTrackId);
    } else {
      loadFromTrack('');
    }
  }, [selectedTrackId]);

  const handleUploadAudioFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopPlayback();
    setIsLoadingSource(true);
    try {
      const arr = await file.arrayBuffer();
      const ctx = getAudioContext();
      const decoded = await ctx.decodeAudioData(arr);
      setAudioBuffer(decoded);
      setSourceLabel(file.name);
      playColliderInjectionSound();
      showNotice(`Loaded "${file.name}" (${decoded.duration.toFixed(2)}s) for transient analysis!`);
    } catch (err) {
      console.error('Failed to decode uploaded drum stem:', err);
      showNotice('Could not decode audio file. Please select a WAV, MP3, or OGG file.');
    } finally {
      setIsLoadingSource(false);
      e.target.value = '';
    }
  };

  const handleLoadDemoBreak = async () => {
    stopPlayback();
    setIsLoadingSource(true);
    try {
      const demo = await synthesizeDemoDrumStem(tempo, 4);
      setAudioBuffer(demo);
      setSourceLabel(`Studio Drum Break (${tempo} BPM)`);
      playColliderInjectionSound();
      showNotice(`Generated 4-bar studio drum stem @ ${tempo} BPM`);
    } finally {
      setIsLoadingSource(false);
    }
  };

  // Run transient detection whenever audioBuffer, threshold, or minSpacingMs changes
  useEffect(() => {
    if (!audioBuffer) return;
    const { bins, transients: detected } = analyzeAudioTransients(
      audioBuffer,
      threshold,
      minSpacingMs,
      tempo
    );
    setWaveformBins(bins);
    setTransients(detected);
  }, [audioBuffer, threshold, minSpacingMs, tempo]);

  // Draw waveform, threshold markers, transient spikes, and playhead onto Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBuffer) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 800;
    const height = canvas.clientHeight || 220;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#060810';
    ctx.fillRect(0, 0, width, height);

    const midY = height / 2;

    // Subtle bar grid lines
    const secondsPerBar = (60 / Math.max(40, Math.min(220, tempo))) * 4;
    const totalDuration = audioBuffer.duration || 1;
    const totalBars = totalDuration / secondsPerBar;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let bar = 1; bar < totalBars; bar++) {
      const x = (bar / totalBars) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.font = '10px monospace';
      ctx.fillText(`B${bar + 1}`, x + 4, height - 6);
    }

    // Center axis line
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    // Waveform bars
    if (waveformBins.length > 0) {
      const barW = width / waveformBins.length;
      waveformBins.forEach((bin, idx) => {
        const x = idx * barW;
        const topY = midY - Math.max(1, bin.max * (midY - 20));
        const botY = midY - Math.min(-1, bin.min * (midY - 20));
        const h = Math.max(2, botY - topY);

        ctx.fillStyle = bin.max >= threshold || Math.abs(bin.min) >= threshold
          ? 'rgba(0, 240, 255, 0.72)'
          : 'rgba(100, 116, 139, 0.45)';
        ctx.fillRect(x, topY, Math.max(1, barW - 0.8), h);
      });
    }

    // Horizontal Threshold Lines (+ and -)
    const threshOffset = threshold * (midY - 20);
    const topThreshY = midY - threshOffset;
    const botThreshY = midY + threshOffset;

    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(0, topThreshY);
    ctx.lineTo(width, topThreshY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, botThreshY);
    ctx.lineTo(width, botThreshY);
    ctx.stroke();
    ctx.restore();

    // Threshold Label
    ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`THRESH ${(threshold * 100).toFixed(0)}%`, 8, Math.max(12, topThreshY - 4));

    // Transient Attack Markers
    transients.forEach(tr => {
      if (filterClass !== 'all' && tr.drumClass !== filterClass) return;
      const x = (tr.timeSeconds / totalDuration) * width;
      const meta = DRUM_CLASS_META[tr.drumClass];
      const isSelected = tr.id === selectedTransientId;

      ctx.save();
      ctx.globalAlpha = tr.enabled ? 1.0 : 0.28;

      // Vertical attack marker line
      ctx.strokeStyle = meta.color;
      ctx.lineWidth = isSelected ? 2.5 : 1.4;
      ctx.beginPath();
      ctx.moveTo(x, 18);
      ctx.lineTo(x, height - 12);
      ctx.stroke();

      // Peak dot
      const peakY = midY - tr.peakAmplitude * (midY - 20);
      ctx.fillStyle = meta.color;
      ctx.beginPath();
      ctx.arc(x, peakY, isSelected ? 4.5 : 3, 0, Math.PI * 2);
      ctx.fill();

      // Top class pill tag (K / S / H / T)
      ctx.fillStyle = isSelected ? '#FFFFFF' : meta.color;
      ctx.fillRect(x - 7, 2, 14, 14);
      ctx.fillStyle = '#05070E';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(meta.short, x, 12);

      ctx.restore();
    });

    // Live Playhead
    if (isPlaying && totalDuration > 0) {
      const px = (playheadSeconds / totalDuration) * width;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
      ctx.stroke();
    }
  }, [
    audioBuffer,
    waveformBins,
    threshold,
    transients,
    filterClass,
    selectedTransientId,
    isPlaying,
    playheadSeconds,
    tempo
  ]);

  // Interactive Canvas click: adjust threshold or select transient
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBuffer) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const width = rect.width;
    const height = rect.height;
    const midY = height / 2;

    // Check if clicking near a transient marker
    const clickTime = (x / width) * audioBuffer.duration;
    const hitToleranceSec = (10 / width) * audioBuffer.duration;
    const nearby = transients.find(
      tr =>
        (filterClass === 'all' || tr.drumClass === filterClass) &&
        Math.abs(tr.timeSeconds - clickTime) <= hitToleranceSec
    );

    if (nearby && y < 28) {
      setSelectedTransientId(nearby.id);
      const ctx = getAudioContext();
      triggerSfzDrumHit(ctx, ctx.destination, selectedSfzKit, nearby.drumClass, ctx.currentTime, nearby.velocity / 127);
      return;
    }

    // Otherwise drag threshold directly from Y coordinate
    isDraggingThresholdRef.current = true;
    const normDist = Math.abs(y - midY) / Math.max(1, midY - 20);
    setThreshold(Number(Math.max(0.05, Math.min(0.88, normDist)).toFixed(2)));
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingThresholdRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const midY = rect.height / 2;
    const normDist = Math.abs(y - midY) / Math.max(1, midY - 20);
    setThreshold(Number(Math.max(0.05, Math.min(0.88, normDist)).toFixed(2)));
  };

  const handleCanvasPointerUp = () => {
    isDraggingThresholdRef.current = false;
  };

  // Playback of Original, SFZ Replaced, or Blended audio
  const handleTogglePlayback = () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }
    if (!audioBuffer) return;

    const ctx = getAudioContext();
    const now = ctx.currentTime + 0.04;
    const createdNodes: AudioNode[] = [];

    if (auditionMode === 'original' || auditionMode === 'blend') {
      const src = ctx.createBufferSource();
      src.buffer = audioBuffer;
      const origGain = ctx.createGain();
      origGain.gain.value = auditionMode === 'blend' ? 0.52 : 0.9;
      src.connect(origGain);
      origGain.connect(ctx.destination);
      src.start(now);
      createdNodes.push(src, origGain);
    }

    if (auditionMode === 'replaced' || auditionMode === 'blend') {
      const sfzGain = ctx.createGain();
      sfzGain.gain.value = auditionMode === 'blend' ? 0.85 : 1.0;
      sfzGain.connect(ctx.destination);
      createdNodes.push(sfzGain);

      transients
        .filter(t => t.enabled)
        .forEach(tr => {
          triggerSfzDrumHit(
            ctx,
            sfzGain,
            selectedSfzKit,
            tr.drumClass,
            now + tr.timeSeconds,
            tr.velocity / 127
          );
        });
    }

    activeSourcesRef.current = createdNodes;
    playStartCtxTimeRef.current = now;
    setIsPlaying(true);
    playLaserBeamSound('laser_audio');

    const totalDur = audioBuffer.duration;
    const tick = () => {
      const elapsed = ctx.currentTime - playStartCtxTimeRef.current;
      if (elapsed >= totalDur) {
        stopPlayback();
        return;
      }
      setPlayheadSeconds(Math.max(0, elapsed));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  // Cycle drum class on a detected transient
  const handleCycleTransientClass = (id: string) => {
    const order: DrumClass[] = ['kick', 'snare', 'hihat', 'tom'];
    setTransients(prev =>
      prev.map(tr => {
        if (tr.id !== id) return tr;
        const nextClass = order[(order.indexOf(tr.drumClass) + 1) % order.length];
        const ctx = getAudioContext();
        triggerSfzDrumHit(ctx, ctx.destination, selectedSfzKit, nextClass, ctx.currentTime, tr.velocity / 127);
        return { ...tr, drumClass: nextClass };
      })
    );
  };

  const handleToggleTransientEnabled = (id: string) => {
    setTransients(prev =>
      prev.map(tr => (tr.id === id ? { ...tr, enabled: !tr.enabled } : tr))
    );
  };

  // Render SFZ Kit replacement into an OfflineAudioContext WAV buffer and add/replace track
  const handleReplaceWithSfzKit = async (mode: 'new_track' | 'replace_selected') => {
    if (!audioBuffer) return;
    const enabledHits = transients.filter(t => t.enabled);
    if (enabledHits.length === 0) {
      showNotice('No active transients enabled to replace. Lower the threshold slider first.');
      return;
    }

    setIsRendering(true);
    try {
      const sampleRate = audioBuffer.sampleRate || 44100;
      const offline = new OfflineAudioContext(2, audioBuffer.length, sampleRate);

      enabledHits.forEach(tr => {
        triggerSfzDrumHit(
          offline,
          offline.destination,
          selectedSfzKit,
          tr.drumClass,
          tr.timeSeconds,
          tr.velocity / 127
        );
      });

      const renderedBuffer = await offline.startRendering();
      const wavBlob = audioBufferToWav(renderedBuffer);
      const audioUrl = URL.createObjectURL(wavBlob);

      // Build 32-bin waveform snippet
      const ch = renderedBuffer.getChannelData(0);
      const snippet: number[] = [];
      const step = Math.max(1, Math.floor(ch.length / 32));
      for (let i = 0; i < ch.length && snippet.length < 32; i += step) {
        snippet.push(Number(Math.min(1, Math.abs(ch[i])).toFixed(3)));
      }

      const kitMeta = SFZ_DRUM_KITS.find(k => k.id === selectedSfzKit)!;
      const secondsPerBar = (60 / Math.max(40, Math.min(220, tempo))) * 4;
      const durationBars = Math.max(1, Math.round(renderedBuffer.duration / secondsPerBar));
      const clipName = `${kitMeta.name} Trigger (${enabledHits.length} hits)`;

      const newClip: Clip = {
        id: `clip-sfz-drum-${Date.now()}`,
        name: clipName,
        startBar: 0,
        durationBars,
        audioUrl,
        waveformSnippet: snippet
      };

      if (mode === 'replace_selected' && selectedTrackId && onReplaceTrackClips) {
        audioService.setTrackAudioBuffer(selectedTrackId, renderedBuffer);
        onReplaceTrackClips(selectedTrackId, newClip);
        playColliderInjectionSound();
        showNotice(`Replaced track audio with ${kitMeta.name} SFZ Kit (${enabledHits.length} hits)!`);
      } else if (onAddTrack) {
        const newTrackId = `track-sfz-drum-${Date.now()}`;
        audioService.setTrackAudioBuffer(newTrackId, renderedBuffer);
        const newTrack: Track = {
          id: newTrackId,
          name: `${kitMeta.name} [SFZ Replaced]`,
          type: 'audio',
          volume: 0.88,
          pan: 0,
          muted: false,
          soloed: false,
          color: kitMeta.accentColor,
          waveform: snippet,
          phaseInverted: false,
          isMono: false,
          vstBypassed: false,
          instrument: kitMeta.name,
          clips: [newClip]
        };
        onAddTrack(newTrack);
        playColliderInjectionSound();
        showNotice(`Created "${newTrack.name}" audio track with ${enabledHits.length} SFZ hits!`);
      }
    } catch (err) {
      console.error('SFZ kit replacement render failed:', err);
      showNotice('Failed to render SFZ drum replacement.');
    } finally {
      setIsRendering(false);
    }
  };

  // Build General MIDI Note Events from detected transients
  const buildGeneralMidiNotes = (): MidiNoteEvent[] => {
    const beatSec = 60 / Math.max(40, Math.min(220, tempo));
    const hitDurSec = Math.min(0.18, beatSec / 4);
    const hitDurBars = 0.0625; // 1/16th note duration

    return transients
      .filter(t => t.enabled)
      .map((tr, idx) => {
        const gmNote = gmNoteMap[tr.drumClass];
        return {
          id: `gm-drum-${idx}-${Date.now()}`,
          pitch: gmNote,
          noteName: gmNoteLabel(gmNote),
          startBar: Number(tr.barPosition.toFixed(4)),
          startTimeSeconds: Number(tr.timeSeconds.toFixed(4)),
          durationBars: hitDurBars,
          durationSeconds: hitDurSec,
          velocity: tr.velocity,
          confidence: tr.confidence
        };
      });
  };

  // 1-Click Replace to General MIDI Track
  const handleExportToGmMidiTrack = (openEditorAfter = false) => {
    const midiNotes = buildGeneralMidiNotes();
    if (midiNotes.length === 0) {
      showNotice('No active transients enabled to map to General MIDI.');
      return;
    }

    const secondsPerBar = (60 / Math.max(40, Math.min(220, tempo))) * 4;
    const durationBars = audioBuffer
      ? Math.max(1, Math.round(audioBuffer.duration / secondsPerBar))
      : 4;

    const kitMeta = SFZ_DRUM_KITS.find(k => k.id === selectedSfzKit)!;
    const midiClip: Clip = {
      id: `clip-drum-gm-${Date.now()}`,
      name: `${sourceLabel} → GM Drums`,
      startBar: 0,
      durationBars,
      isMidi: true,
      midiNotes,
      instrument: `${kitMeta.name} (GM Ch 10)`
    };

    if (openEditorAfter && onOpenInMidiEditor) {
      playColliderInjectionSound();
      onOpenInMidiEditor(midiClip);
      return;
    }

    if (onAddTrack) {
      const newTrack: Track = {
        id: `track-gm-drums-${Date.now()}`,
        name: `GM Drum Trigger (${midiNotes.length} hits)`,
        type: 'midi',
        volume: 0.85,
        pan: 0,
        muted: false,
        soloed: false,
        color: '#FFD700',
        phaseInverted: false,
        isMono: false,
        vstBypassed: true,
        instrument: `${kitMeta.name} (GM Ch 10)`,
        clips: [midiClip]
      };
      onAddTrack(newTrack);
      playColliderInjectionSound();
      showNotice(`Mapped ${midiNotes.length} drum transients to Standard General MIDI track!`);
    }
  };

  // Download binary .MID file
  const handleDownloadMidFile = () => {
    const midiNotes = buildGeneralMidiNotes();
    if (midiNotes.length === 0) {
      showNotice('No active transients enabled to export.');
      return;
    }
    const bytes = createStandardMidiFile(midiNotes, tempo);
    const dataUri = midiBytesToDataUri(bytes);
    const a = document.createElement('a');
    a.href = dataUri;
    a.download = `${sourceLabel.replace(/\s+/g, '_')}_GM_Drums.mid`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    playLaserBeamSound('laser_select');
    showNotice(`Downloaded "${a.download}" (${midiNotes.length} GM notes)`);
  };

  const counts = useMemo(() => {
    const c: Record<DrumClass, number> = { kick: 0, snare: 0, hihat: 0, tom: 0 };
    transients.forEach(t => {
      if (t.enabled) c[t.drumClass] += 1;
    });
    return c;
  }, [transients]);

  const totalEnabled = counts.kick + counts.snare + counts.hihat + counts.tom;

  return (
    <div className="h-full w-full flex flex-col bg-[#080A10] text-[#E2E8F0] font-mono overflow-y-auto select-none">
      {/* Toast Notice */}
      {statusBanner && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-cyan-950/95 border border-cyan-400 text-cyan-100 text-xs shadow-[0_0_25px_rgba(0,240,255,0.4)] flex items-center gap-2 backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-cyan-300 animate-pulse" />
          <span>{statusBanner}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="px-6 py-4 border-b border-[#1A2033] bg-gradient-to-r from-[#0C101C] via-[#111526] to-[#0A0D16] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#FF2E63]/15 border border-[#FF2E63]/50 flex items-center justify-center text-[#FF2E63] shadow-[0_0_20px_rgba(255,46,99,0.25)]">
            <Drum className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-black tracking-wider text-white uppercase">
                DRUM TRIGGER // TRANSIENT-TO-MIDI &amp; SFZ REPLACEMENT
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300 font-bold">
                SPECTRAL ONSET ENGINE
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-bold">
                GM CH 10 + SFZ KITS
              </span>
            </div>
            <p className="text-xs text-[#7F89A8] mt-0.5">
              Detect Kick, Snare, Hi-Hat, and Tom attack peaks over any drum stem and 1-click replace with internal SFZ kits or General MIDI notes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToMixer && (
            <button
              onClick={onNavigateToMixer}
              className="px-3.5 py-2 rounded-xl bg-[#13192B] hover:bg-[#1B243E] border border-[#253052] text-xs font-bold text-[#9DA9CC] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Return to Mixer</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Left/Top Column (8 cols): Source, Waveform + Threshold Visualizer, Transient Matrix */}
        <div className="lg:col-span-8 flex flex-col space-y-5">
          {/* Source Selector & Upload Strip */}
          <div className="p-4 rounded-2xl bg-[#0D111C] border border-[#1E263D] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap flex-1 min-w-[260px]">
              <div className="flex items-center gap-2 text-xs font-bold text-[#9DA9CC]">
                <FileAudio className="w-4 h-4 text-cyan-400" />
                <span>Drum Stem / Audio Track:</span>
              </div>

              <select
                value={selectedTrackId}
                onChange={(e) => setSelectedTrackId(e.target.value)}
                className="flex-1 min-w-[180px] px-3 py-1.5 rounded-xl bg-[#13192B] border border-[#253152] text-white text-xs font-bold focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                {audioTracks.length === 0 && <option value="">Demo Studio Drum Break</option>}
                {audioTracks.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.clips.length} clip{t.clips.length === 1 ? '' : 's'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleLoadDemoBreak}
                disabled={isLoadingSource}
                className="px-3 py-1.5 rounded-xl bg-[#141B2E] hover:bg-[#1C2742] border border-[#253258] text-xs font-bold text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSource ? 'animate-spin' : ''}`} />
                <span>Synth Demo Break</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/70 border border-cyan-500/40 text-xs font-bold text-cyan-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Load Audio Stem</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleUploadAudioFile}
                className="hidden"
              />
            </div>
          </div>

          {/* Interactive Waveform + Threshold Marker Visualizer */}
          <div className="p-5 rounded-2xl bg-[#0D111C] border border-[#1E263D] space-y-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#FF2E63]" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Transient Detection Scope — {sourceLabel}
                  </h2>
                </div>
                <p className="text-[11px] text-[#7883A3] mt-0.5">
                  Drag vertically on the waveform to adjust the detection threshold, or click any top marker badge (K/S/H/T) to audition.
                </p>
              </div>

              {/* Audition Mode & Transport */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex rounded-xl bg-[#070910] border border-[#1E263D] p-0.5 text-[10px] font-bold">
                  {([
                    { id: 'original', label: 'ORIG' },
                    { id: 'blend', label: 'BLEND' },
                    { id: 'replaced', label: 'SFZ KIT' }
                  ] as const).map(m => (
                    <button
                      key={m.id}
                      onClick={() => setAuditionMode(m.id)}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        auditionMode === m.id
                          ? 'bg-cyan-500 text-black'
                          : 'text-[#7F89A8] hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleTogglePlayback}
                  disabled={!audioBuffer || isLoadingSource}
                  className={`px-4 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all cursor-pointer ${
                    isPlaying
                      ? 'bg-[#FF2E63] border-[#FF2E63] text-white shadow-[0_0_15px_rgba(255,46,99,0.45)]'
                      : 'bg-[#141C30] hover:bg-[#1C2744] border-cyan-500/50 text-cyan-200'
                  }`}
                >
                  {isPlaying ? <Square className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-cyan-300" />}
                  <span>{isPlaying ? 'STOP' : 'AUDITION'}</span>
                </button>
              </div>
            </div>

            {/* Canvas Waveform Scope */}
            <div className="relative rounded-xl overflow-hidden border border-[#1C243C] bg-[#060810]">
              <canvas
                ref={canvasRef}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                onPointerLeave={handleCanvasPointerUp}
                className="w-full h-56 block cursor-ns-resize"
              />
              {isLoadingSource && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-xs text-cyan-300 gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analyzing audio stem waveform...</span>
                </div>
              )}
            </div>

            {/* Threshold, Holdoff & Drum Class Filter Controls */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-1 items-center">
              <div className="md:col-span-4 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-amber-300 font-bold">Attack Threshold</span>
                  <span className="text-white font-bold">{(threshold * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={0.85}
                  step={0.01}
                  value={threshold}
                  onChange={e => setThreshold(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div className="md:col-span-3 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-cyan-300 font-bold">Retrigger Holdoff</span>
                  <span className="text-white font-bold">{minSpacingMs} ms</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={220}
                  step={5}
                  value={minSpacingMs}
                  onChange={e => setMinSpacingMs(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="md:col-span-5 flex flex-wrap items-center justify-end gap-1.5">
                <button
                  onClick={() => setFilterClass('all')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                    filterClass === 'all'
                      ? 'bg-white text-black border-white'
                      : 'bg-[#121829] border-[#222B45] text-[#8E99BA] hover:text-white'
                  }`}
                >
                  ALL ({totalEnabled})
                </button>
                {(['kick', 'snare', 'hihat', 'tom'] as DrumClass[]).map(dc => {
                  const meta = DRUM_CLASS_META[dc];
                  const active = filterClass === dc;
                  return (
                    <button
                      key={dc}
                      onClick={() => setFilterClass(dc)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1"
                      style={{
                        backgroundColor: active ? `${meta.color}28` : '#121829',
                        borderColor: active ? meta.color : '#222B45',
                        color: active ? meta.color : '#8E99BA'
                      }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
                      <span>{meta.short}: {counts[dc]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Detected Transients Hit Inspector Table */}
          <div className="p-4 rounded-2xl bg-[#0D111C] border border-[#1E263D] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Detected Transient Attack Peaks ({totalEnabled} Active / {transients.length} Total)</span>
              </span>
              <span className="text-[10px] text-[#7883A3]">
                Click Drum Class pill to reassign Kick / Snare / Hi-Hat / Tom
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto rounded-xl border border-[#192136] bg-[#070910]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0E1322] text-[10px] text-[#7E89AA] uppercase sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Use</th>
                    <th className="py-2 px-3">Time / Bar</th>
                    <th className="py-2 px-3">Detected Class</th>
                    <th className="py-2 px-3">GM Note Target</th>
                    <th className="py-2 px-3">Velocity</th>
                    <th className="py-2 px-3 text-right">Audition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#151C2F]">
                  {transients
                    .filter(t => filterClass === 'all' || t.drumClass === filterClass)
                    .map(tr => {
                      const meta = DRUM_CLASS_META[tr.drumClass];
                      const gmNote = gmNoteMap[tr.drumClass];
                      return (
                        <tr
                          key={tr.id}
                          onClick={() => setSelectedTransientId(tr.id)}
                          className={`transition-colors cursor-pointer ${
                            selectedTransientId === tr.id
                              ? 'bg-cyan-950/30'
                              : 'hover:bg-white/[0.02]'
                          } ${!tr.enabled ? 'opacity-45' : ''}`}
                        >
                          <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={tr.enabled}
                              onChange={() => handleToggleTransientEnabled(tr.id)}
                              className="accent-cyan-400 w-3.5 h-3.5 rounded cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-3 text-[#C8D1EC]">
                            {tr.timeSeconds.toFixed(3)}s{' '}
                            <span className="text-[10px] text-[#687394]">(B{(tr.barPosition + 1).toFixed(2)})</span>
                          </td>
                          <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleCycleTransientClass(tr.id)}
                              className="px-2.5 py-0.5 rounded-md text-[10px] font-bold border cursor-pointer"
                              style={{
                                backgroundColor: `${meta.color}20`,
                                borderColor: `${meta.color}80`,
                                color: meta.color
                              }}
                              title="Click to cycle Kick / Snare / Hi-Hat / Tom"
                            >
                              {meta.label}
                            </button>
                          </td>
                          <td className="py-2 px-3 text-[#9DA9CC] text-[11px]">
                            {gmNoteLabel(gmNote)}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-[#151C30] overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${(tr.velocity / 127) * 100}%`,
                                    backgroundColor: meta.color
                                  }}
                                />
                              </div>
                              <span className="text-[10px] text-white w-6">{tr.velocity}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                const ctx = getAudioContext();
                                triggerSfzDrumHit(
                                  ctx,
                                  ctx.destination,
                                  selectedSfzKit,
                                  tr.drumClass,
                                  ctx.currentTime,
                                  tr.velocity / 127
                                );
                              }}
                              className="p-1 rounded bg-[#141C30] hover:bg-cyan-500 hover:text-black text-cyan-300 transition-colors cursor-pointer"
                              title="Audition SFZ hit"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): 1-Click Replacement Mapping Targets (a. Internal SFZ Kits, b. General MIDI) */}
        <div className="lg:col-span-4 flex flex-col space-y-5">
          {/* A. Internal SFZ Drum Kit Replacement */}
          <div className="p-5 rounded-2xl bg-[#0D111C] border border-[#1E263D] space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Disc className="w-4 h-4 text-[#FF2E63]" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  A) Internal SFZ Drum Kits
                </h3>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded bg-pink-950/70 border border-pink-500/40 text-pink-300 font-bold">
                1-CLICK AUDIO REPLACE
              </span>
            </div>

            <div className="space-y-2.5">
              {SFZ_DRUM_KITS.map(kit => {
                const isSelected = selectedSfzKit === kit.id;
                return (
                  <div
                    key={kit.id}
                    onClick={() => {
                      setSelectedSfzKit(kit.id);
                      const ctx = getAudioContext();
                      triggerSfzDrumHit(ctx, ctx.destination, kit.id, 'kick', ctx.currentTime, 0.9);
                      triggerSfzDrumHit(ctx, ctx.destination, kit.id, 'snare', ctx.currentTime + 0.14, 0.85);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#141A2C] shadow-lg'
                        : 'bg-[#080B14] border-[#1A2136] hover:border-[#2C3758]'
                    }`}
                    style={
                      isSelected
                        ? { borderColor: kit.accentColor, boxShadow: `0 0 18px ${kit.accentColor}26` }
                        : {}
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: kit.accentColor }}
                        />
                        <span className="text-xs font-black text-white">{kit.name}</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/50 text-[#9DA9CC] border border-white/10">
                        {kit.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#7D87A8] mt-1 leading-relaxed">
                      {kit.description}
                    </p>

                    {/* Quick Kit Pad Audition Buttons */}
                    <div
                      className="grid grid-cols-4 gap-1.5 mt-2.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(['kick', 'snare', 'hihat', 'tom'] as DrumClass[]).map(dc => (
                        <button
                          key={dc}
                          onClick={() => {
                            setSelectedSfzKit(kit.id);
                            const ctx = getAudioContext();
                            triggerSfzDrumHit(ctx, ctx.destination, kit.id, dc, ctx.currentTime, 0.92);
                          }}
                          className="py-1 rounded bg-[#0A0E18] hover:bg-white/10 border border-white/10 text-[9px] font-bold text-[#C8D1EC] uppercase cursor-pointer"
                        >
                          {dc}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 1-Click SFZ Replace Actions */}
            <div className="space-y-2 pt-2 border-t border-[#1A2238]">
              <button
                onClick={() => handleReplaceWithSfzKit('new_track')}
                disabled={isRendering || totalEnabled === 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF2E63] to-[#A855F7] hover:brightness-110 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,46,99,0.35)] transition-all cursor-pointer disabled:opacity-40"
              >
                <Wand2 className="w-4 h-4" />
                <span>
                  {isRendering
                    ? 'Rendering SFZ Kit Audio...'
                    : `1-Click Replace → New SFZ Track (${totalEnabled} hits)`}
                </span>
              </button>

              {selectedTrackId && onReplaceTrackClips && (
                <button
                  onClick={() => handleReplaceWithSfzKit('replace_selected')}
                  disabled={isRendering || totalEnabled === 0}
                  className="w-full py-2 rounded-xl bg-[#13192B] hover:bg-[#1B243E] border border-[#29365A] text-[11px] font-bold text-[#B8C4E6] hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                >
                  Overwrite Selected Track with SFZ Audio
                </button>
              )}
            </div>
          </div>

          {/* B. Standard General MIDI Drum Note Mapping */}
          <div className="p-5 rounded-2xl bg-[#0D111C] border border-[#1E263D] space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-[#FFD700]" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  B) Standard General MIDI Map
                </h3>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded bg-amber-950/70 border border-amber-500/40 text-amber-300 font-bold">
                GM CH 10
              </span>
            </div>

            <div className="space-y-2.5">
              {(['kick', 'snare', 'hihat', 'tom'] as DrumClass[]).map(dc => {
                const meta = DRUM_CLASS_META[dc];
                return (
                  <div
                    key={dc}
                    className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#070910] border border-[#192136]"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: meta.color }}
                      />
                      <span className="text-xs font-bold text-white">{meta.label}</span>
                      <span className="text-[10px] text-[#687394]">({counts[dc]})</span>
                    </div>

                    <select
                      value={gmNoteMap[dc]}
                      onChange={e =>
                        setGmNoteMap(prev => ({ ...prev, [dc]: Number(e.target.value) }))
                      }
                      className="w-44 px-2 py-1 rounded-lg bg-[#12182B] border border-[#253152] text-[11px] text-amber-200 font-bold focus:outline-none cursor-pointer"
                    >
                      {GM_DRUM_OPTIONS.map(opt => (
                        <option key={opt.note} value={opt.note}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>

            {/* 1-Click GM MIDI Export Actions */}
            <div className="space-y-2 pt-2 border-t border-[#1A2238]">
              <button
                onClick={() => handleExportToGmMidiTrack(false)}
                disabled={totalEnabled === 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FFD700] to-[#F59E0B] hover:brightness-110 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all cursor-pointer disabled:opacity-40"
              >
                <Sparkles className="w-4 h-4" />
                <span>1-Click Replace → General MIDI Track</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                {onOpenInMidiEditor && (
                  <button
                    onClick={() => handleExportToGmMidiTrack(true)}
                    disabled={totalEnabled === 0}
                    className="py-2 rounded-xl bg-[#13192B] hover:bg-[#1B243E] border border-cyan-500/40 text-[11px] font-bold text-cyan-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>Open Piano Roll</span>
                  </button>
                )}

                <button
                  onClick={handleDownloadMidFile}
                  disabled={totalEnabled === 0}
                  className={`py-2 rounded-xl bg-[#13192B] hover:bg-[#1B243E] border border-[#29365A] text-[11px] font-bold text-[#C8D1EC] flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 ${
                    !onOpenInMidiEditor ? 'col-span-2' : ''
                  }`}
                >
                  <Download className="w-3.5 h-3.5 text-amber-300" />
                  <span>Export .MID</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrumTriggerView;
