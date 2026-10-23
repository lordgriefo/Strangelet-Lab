// Strangelet Lab - Spectral Analysis View
// High-fidelity real-time frequency distribution visualizer powered by Recharts
// Displays real-time frequency spectrum, 31-band 1/3-octave bars, 7-band acoustic energy balance,
// and comprehensive acoustic telemetry for the currently active audio track.

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ReferenceLine, 
  Cell 
} from 'recharts';
import { 
  Activity, 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  SlidersHorizontal, 
  Layers, 
  Radio, 
  Sparkles, 
  Music, 
  Mic, 
  Waves, 
  Zap, 
  BarChart3, 
  Camera, 
  Check, 
  ChevronDown, 
  Download,
  Flame,
  Gauge,
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  HelpCircle,
  Split
} from 'lucide-react';
import { Track, View } from '../types';
import { masterAudioBus } from '../lib/masterBus';
import { audioService } from '../services/audioService';

interface SpectralAnalysisViewProps {
  tracks: Track[];
  tempo?: number;
  activeTrackId?: string;
  onSelectTrack?: (trackId: string) => void;
  onNavigateToMixer?: () => void;
}

// 7 Standard Acoustic Mastering Frequency Bands
export interface FrequencyBandInfo {
  name: string;
  shortName: string;
  minFreq: number;
  maxFreq: number;
  color: string;
  description: string;
}

export const ACOUSTIC_BANDS: FrequencyBandInfo[] = [
  { name: 'Sub Bass', shortName: 'SUB', minFreq: 20, maxFreq: 60, color: '#6366F1', description: 'Sub rumble, 808 fundamental & kick weight' },
  { name: 'Bass', shortName: 'BASS', minFreq: 60, maxFreq: 250, color: '#00F0FF', description: 'Bassline warmth, body & fundamental groove' },
  { name: 'Low Mid', shortName: 'LOW-MID', minFreq: 250, maxFreq: 500, color: '#10B981', description: 'Warmth, mud control, instrument resonance' },
  { name: 'Mid', shortName: 'MID', minFreq: 500, maxFreq: 2000, color: '#F59E0B', description: 'Vocal core, guitar bite, snare body' },
  { name: 'High Mid', shortName: 'HI-MID', minFreq: 2000, maxFreq: 4000, color: '#F97316', description: 'Clarity, attack transient, vocal presence' },
  { name: 'Presence', shortName: 'PRESENCE', minFreq: 4000, maxFreq: 8000, color: '#EC4899', description: 'Consonants, vocal cut, metallic definition' },
  { name: 'Brilliance', shortName: 'AIR', minFreq: 8000, maxFreq: 20000, color: '#A855F7', description: 'Air shimmer, cymbal sheen, modern polish' }
];

// ISO standard 31-band 1/3-octave center frequencies (Hz)
export const ISO_31_FREQUENCIES = [
  20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 
  630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 
  10000, 12500, 16000, 20000
];

// 48 Logarithmic frequency bins for continuous Area spectrum
export const LOG_SPECTRUM_FREQUENCIES = [
  20, 24, 28, 33, 40, 48, 58, 70, 85, 102, 122, 146, 175, 210, 250, 300, 
  360, 430, 515, 620, 740, 880, 1050, 1250, 1500, 1800, 2150, 2550, 3050, 
  3650, 4350, 5200, 6200, 7400, 8800, 10500, 12000, 13500, 15000, 16500, 
  18000, 20000
];

// Convert frequency (Hz) to closest musical note name and deviation in cents
function freqToNoteName(freq: number): { note: string; octave: number; cents: number } {
  if (freq < 15) return { note: '---', octave: 0, cents: 0 };
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const midi = 69 + 12 * Math.log2(freq / 440);
  const roundedMidi = Math.round(midi);
  const cents = Math.round((midi - roundedMidi) * 100);
  const noteIndex = ((roundedMidi % 12) + 12) % 12;
  const octave = Math.floor(roundedMidi / 12) - 1;
  return { note: noteNames[noteIndex], octave, cents };
}

// Target Reference Profiles
export type TargetProfileKey = 'flat' | 'pink_noise' | 'fletcher_munson' | 'edm_club' | 'pop_vocal' | 'suno_de_sheen';

interface TargetProfile {
  id: TargetProfileKey;
  name: string;
  description: string;
  calculateDb: (freq: number) => number;
}

const TARGET_PROFILES: TargetProfile[] = [
  {
    id: 'flat',
    name: 'Flat 0dB Line',
    description: 'Flat technical reference ceiling across all audible frequencies',
    calculateDb: () => -24
  },
  {
    id: 'pink_noise',
    name: 'Pink Noise (-3dB/oct)',
    description: 'Natural equal energy per octave balance for mix translation',
    calculateDb: (freq) => {
      // Relative to 1kHz at -24dB: -3dB per octave doubling
      const octaves = Math.log2(freq / 1000);
      return Math.max(-80, -24 - (octaves * 3.0));
    }
  },
  {
    id: 'fletcher_munson',
    name: 'Equal Loudness (80 Phon)',
    description: 'Human psychoacoustic loudness perception curve',
    calculateDb: (freq) => {
      // Boost bass and 3kHz ear canal resonance
      let val = -24;
      if (freq < 100) val += 10 * Math.log10(100 / freq);
      if (freq >= 2000 && freq <= 5000) val += 3.5;
      if (freq > 10000) val -= 4 * Math.log10(freq / 10000);
      return Math.max(-80, val);
    }
  },
  {
    id: 'edm_club',
    name: 'Club Bass Curve',
    description: 'Sub-heavy modern dance slope with steep rumble rolloff',
    calculateDb: (freq) => {
      if (freq < 35) return -45;
      if (freq <= 85) return -12;
      const octaves = Math.log2(freq / 100);
      return Math.max(-75, -14 - (octaves * 4.2));
    }
  },
  {
    id: 'pop_vocal',
    name: 'Vocal Presence Target',
    description: 'Sub-filtered body, dipped 400Hz boxiness, 3.2kHz forward intelligibility',
    calculateDb: (freq) => {
      if (freq < 75) return -55;
      let val = -22;
      if (freq >= 300 && freq <= 600) val -= 3.5;
      if (freq >= 2000 && freq <= 4500) val += 4.0;
      if (freq > 12000) val -= 2.0;
      return val;
    }
  },
  {
    id: 'suno_de_sheen',
    name: 'Suno AI Anti-Sheen',
    description: 'Targets metallic 8.2kHz synthetic distortion artifacts',
    calculateDb: (freq) => {
      let val = -24;
      if (freq >= 7500 && freq <= 9200) val -= 6.5; // Sheen notch
      if (freq >= 12000) val += 1.5; // Air restore
      return val;
    }
  }
];

export const SpectralAnalysisView: React.FC<SpectralAnalysisViewProps> = ({
  tracks,
  tempo = 120,
  activeTrackId,
  onSelectTrack,
  onNavigateToMixer
}) => {
  // Track Selection: defaults to activeTrackId or first audio track
  const [selectedTrackId, setSelectedTrackId] = useState<string>(() => {
    if (activeTrackId && (tracks.some(t => t.id === activeTrackId) || activeTrackId === 'master')) {
      return activeTrackId;
    }
    const firstAudio = tracks.find(t => t.type === 'audio');
    return firstAudio ? firstAudio.id : (tracks[0]?.id || '1');
  });

  // Keep in sync if activeTrackId prop changes
  useEffect(() => {
    if (activeTrackId && activeTrackId !== selectedTrackId) {
      setSelectedTrackId(activeTrackId);
    }
  }, [activeTrackId]);

  const currentTrack = useMemo(() => {
    if (selectedTrackId === 'master') {
      return {
        id: 'master',
        name: 'Stereo Master Bus',
        type: 'audio' as const,
        volume: 0.95,
        pan: 0,
        muted: false,
        soloed: false,
        color: '#FFD700',
        phaseInverted: false,
        isMono: false,
        vstBypassed: false,
        clips: []
      };
    }
    return tracks.find(t => t.id === selectedTrackId) || tracks[0];
  }, [selectedTrackId, tracks]);

  // Visualizer View Mode
  const [viewMode, setViewMode] = useState<'area' | 'iso31' | 'energy'>('area');
  const [targetProfileKey, setTargetProfileKey] = useState<TargetProfileKey>('pink_noise');
  const [showTargetLine, setShowTargetLine] = useState<boolean>(true);
  const [showPeakHold, setShowPeakHold] = useState<boolean>(true);
  const [fftResolution, setFftResolution] = useState<number>(2048);
  const [smoothingFactor, setSmoothingFactor] = useState<number>(0.82);
  const [isFrozen, setIsFrozen] = useState<boolean>(false);
  const [savedSnapshot, setSavedSnapshot] = useState<{ [freq: number]: number } | null>(null);

  // Playback & Signal Generator State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [auditionSource, setAuditionSource] = useState<'track' | 'pink_noise' | 'sine_sweep' | 'cal_1k' | 'mic'>('track');
  const [auditionVolume, setAuditionVolume] = useState<number>(0.85);
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Real-Time Telemetry Metrics State
  const [telemetry, setTelemetry] = useState({
    peakFreq: 440,
    peakDb: -60,
    peakNote: 'A4',
    peakCents: 0,
    rmsDb: -60,
    spectralCentroid: 1200,
    rollOffFreq: 8500,
    crestFactor: 12.0
  });

  // Stereo Phase Correlation & Mono Compatibility State
  const [phaseMetrics, setPhaseMetrics] = useState({
    correlation: 0.95, // Range: -1.0 to +1.0
    stereoWidthPercent: 55, // 0% (Pure mono) to 100% (Extreme stereo)
    monoLossDb: -0.4, // Estimated level loss in dB if summed to mono
    leftRmsDb: -60,
    rightRmsDb: -60,
    midRmsDb: -60,
    sideRmsDb: -72,
    monoStatus: 'Safe Stereo' as 'Safe Stereo' | 'Mono' | 'Wide Stereo' | 'Severe Phase Cancellation' | 'Inverted Polarity'
  });

  // Recharts Chart Data
  const [spectrumData, setSpectrumData] = useState<any[]>(() => {
    return LOG_SPECTRUM_FREQUENCIES.map(freq => ({
      freq,
      freqLabel: freq >= 1000 ? `${(freq / 1000).toFixed(1)}k` : `${freq}`,
      db: -70,
      peakDb: -70,
      targetDb: TARGET_PROFILES.find(p => p.id === 'pink_noise')?.calculateDb(freq) ?? -24
    }));
  });

  const [iso31Data, setIso31Data] = useState<any[]>(() => {
    return ISO_31_FREQUENCIES.map(freq => ({
      freq,
      freqLabel: freq >= 1000 ? (freq % 1000 === 0 ? `${freq / 1000}k` : `${(freq / 1000).toFixed(1)}k`) : `${freq}`,
      db: -70,
      peakDb: -70
    }));
  });

  const [energyBandsData, setEnergyBandsData] = useState<any[]>(() => {
    return ACOUSTIC_BANDS.map(b => ({
      name: b.shortName,
      fullName: b.name,
      minFreq: b.minFreq,
      maxFreq: b.maxFreq,
      color: b.color,
      energyPercent: 14.2,
      avgDb: -70
    }));
  });

  // Web Audio Context & Nodes References
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const leftAnalyserRef = useRef<AnalyserNode | null>(null);
  const rightAnalyserRef = useRef<AnalyserNode | null>(null);
  const channelSplitterRef = useRef<ChannelSplitterNode | null>(null);
  const sourceNodeRef = useRef<AudioNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const synthIntervalRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const peakHoldArrayRef = useRef<Float32Array | null>(null);
  const isoPeakHoldArrayRef = useRef<Float32Array | null>(null);

  // Initialize Web Audio Analyzer
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioCtx();
    }
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }
    return audioContextRef.current!;
  }, []);

  const setupAnalyser = useCallback(() => {
    const ctx = getAudioContext();
    if (!analyserRef.current) {
      analyserRef.current = ctx.createAnalyser();
    }
    analyserRef.current.fftSize = fftResolution;
    analyserRef.current.smoothingTimeConstant = smoothingFactor;
    analyserRef.current.minDecibels = -95;
    analyserRef.current.maxDecibels = 0;

    // Dedicated Left & Right Time-Domain Analysers for Phase Correlation
    if (!leftAnalyserRef.current) {
      leftAnalyserRef.current = ctx.createAnalyser();
      leftAnalyserRef.current.fftSize = 1024;
      leftAnalyserRef.current.smoothingTimeConstant = 0.5;
    }
    if (!rightAnalyserRef.current) {
      rightAnalyserRef.current = ctx.createAnalyser();
      rightAnalyserRef.current.fftSize = 1024;
      rightAnalyserRef.current.smoothingTimeConstant = 0.5;
    }
    if (!channelSplitterRef.current) {
      channelSplitterRef.current = ctx.createChannelSplitter(2);
      channelSplitterRef.current.connect(leftAnalyserRef.current, 0);
      channelSplitterRef.current.connect(rightAnalyserRef.current, 1);
    }

    if (!gainNodeRef.current) {
      gainNodeRef.current = ctx.createGain();
      gainNodeRef.current.gain.value = isMuted ? 0 : auditionVolume;
      analyserRef.current.connect(gainNodeRef.current);
      gainNodeRef.current.connect(ctx.destination);
    }
    return {
      masterAnalyser: analyserRef.current,
      leftAnalyser: leftAnalyserRef.current,
      rightAnalyser: rightAnalyserRef.current,
      splitter: channelSplitterRef.current
    };
  }, [getAudioContext, fftResolution, smoothingFactor, auditionVolume, isMuted]);

  // Update Gain when auditionVolume or isMuted changes
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = isMuted ? 0 : auditionVolume;
    }
  }, [auditionVolume, isMuted]);

  // Update Analyser parameters
  useEffect(() => {
    if (analyserRef.current) {
      analyserRef.current.fftSize = fftResolution;
      analyserRef.current.smoothingTimeConstant = smoothingFactor;
    }
  }, [fftResolution, smoothingFactor]);

  // Stop any active audition sound
  const stopAuditionAudio = useCallback(() => {
    if (synthIntervalRef.current) {
      clearInterval(synthIntervalRef.current);
      synthIntervalRef.current = null;
    }
    if (sourceNodeRef.current) {
      try {
        (sourceNodeRef.current as any).stop?.();
        sourceNodeRef.current.disconnect();
      } catch (e) {
        // ignore
      }
      sourceNodeRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
      setIsMicActive(false);
    }
  }, []);

  // Synthesize realistic audio signal tailored to track type
  const startTrackAudition = useCallback((track: Track) => {
    stopAuditionAudio();
    const ctx = getAudioContext();
    const { masterAnalyser, splitter } = setupAnalyser();
    const now = ctx.currentTime;

    // Helper to connect stereo/mono sources to both master analyser and phase correlation splitter
    const routeAuditionSource = (node: AudioNode) => {
      node.connect(masterAnalyser);
      try {
        node.connect(splitter);
      } catch (e) {
        // ignore
      }
    };

    // Check if real track buffer is already cached in audioService
    const realBuffer = audioService.getTrackAudioBuffer(track.id);
    if (realBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = realBuffer;
      src.loop = true;
      routeAuditionSource(src);
      src.start(0);
      sourceNodeRef.current = src;
      return;
    }

    // Type-tailored high-fidelity synthetic audition loop:
    const trackNameLower = (track.name || '').toLowerCase();
    const isVocal = trackNameLower.includes('vocal') || trackNameLower.includes('voice') || trackNameLower.includes('lead_hook');
    const isBass = trackNameLower.includes('bass') || trackNameLower.includes('808');
    const isDrums = trackNameLower.includes('drum') || trackNameLower.includes('percussion') || trackNameLower.includes('snare');

    if (isVocal) {
      // Human Vocal Formant Synthesis (Ah / Oh vowels with natural vibrato)
      const carrier = ctx.createOscillator();
      carrier.type = 'sawtooth';
      carrier.frequency.setValueAtTime(220, now); // A3

      // Vibrato LFO
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 5.2; // 5.2 Hz human vibrato
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 6.5; // pitch wobble depth
      lfo.connect(lfoGain);
      lfoGain.connect(carrier.frequency);
      lfo.start(now);

      // Formant Bandpass Filters: F1 (730Hz), F2 (1090Hz), F3 (2440Hz)
      const f1 = ctx.createBiquadFilter();
      f1.type = 'bandpass';
      f1.frequency.value = 730;
      f1.Q.value = 4.2;

      const f2 = ctx.createBiquadFilter();
      f2.type = 'bandpass';
      f2.frequency.value = 1090;
      f2.Q.value = 5.0;

      const f3 = ctx.createBiquadFilter();
      f3.type = 'bandpass';
      f3.frequency.value = 2440;
      f3.Q.value = 4.5;

      const vocalMix = ctx.createGain();
      vocalMix.gain.value = 0.45;

      // Stereo Doubler / Chorus for Vocals (Subtle Haas delay on right channel for realistic width)
      const merger = ctx.createChannelMerger(2);
      const delayR = ctx.createDelay();
      delayR.delayTime.value = 0.012; // 12ms Haas effect

      carrier.connect(f1);
      carrier.connect(f2);
      carrier.connect(f3);
      f1.connect(vocalMix);
      f2.connect(vocalMix);
      f3.connect(vocalMix);

      vocalMix.connect(merger, 0, 0); // Left channel
      vocalMix.connect(delayR);
      delayR.connect(merger, 0, 1); // Right channel (stereo spread)

      routeAuditionSource(merger);
      carrier.start(now);
      sourceNodeRef.current = carrier;

      // Subtle vowel melody movement
      let step = 0;
      const notes = [220, 246.9, 261.6, 293.7, 329.6, 293.7]; // A3, B3, C4, D4, E4, D4
      synthIntervalRef.current = window.setInterval(() => {
        step = (step + 1) % notes.length;
        carrier.frequency.setTargetAtTime(notes[step], ctx.currentTime, 0.12);
      }, 650);

    } else if (isBass) {
      // 808 Sub-Bass Generator with Harmonic Saturation (Tight Mono Foundation)
      const subOsc = ctx.createOscillator();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(45, now); // 45 Hz deep sub

      const satOsc = ctx.createOscillator();
      satOsc.type = 'triangle';
      satOsc.frequency.setValueAtTime(90, now); // 2nd harmonic warmth

      const satGain = ctx.createGain();
      satGain.gain.value = 0.28;

      const bassMix = ctx.createGain();
      bassMix.gain.value = 0.65;

      subOsc.connect(bassMix);
      satOsc.connect(satGain);
      satGain.connect(bassMix);
      routeAuditionSource(bassMix);

      subOsc.start(now);
      satOsc.start(now);
      sourceNodeRef.current = subOsc;

      // Bass groove modulation
      const bassNotes = [45, 45, 55, 45, 40, 50];
      let step = 0;
      synthIntervalRef.current = window.setInterval(() => {
        step = (step + 1) % bassNotes.length;
        const targetFreq = bassNotes[step];
        subOsc.frequency.setValueAtTime(targetFreq + 25, ctx.currentTime);
        subOsc.frequency.exponentialRampToValueAtTime(targetFreq, ctx.currentTime + 0.1);
        satOsc.frequency.setValueAtTime((targetFreq + 25) * 2, ctx.currentTime);
        satOsc.frequency.exponentialRampToValueAtTime(targetFreq * 2, ctx.currentTime + 0.1);
      }, 500);

    } else if (isDrums) {
      // Rhythmic Drum Groove (Kick mono, Snare center, Hi-Hats panned)
      const masterDrumGain = ctx.createGain();
      masterDrumGain.gain.value = 0.55;

      // Stereo merger for drums
      const drumMerger = ctx.createChannelMerger(2);
      masterDrumGain.connect(drumMerger, 0, 0);
      masterDrumGain.connect(drumMerger, 0, 1);
      routeAuditionSource(drumMerger);

      // Create white noise buffer for snare and hi-hats
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      let beatCount = 0;
      const triggerKick = (time: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(140, time);
        osc.frequency.exponentialRampToValueAtTime(50, time + 0.08);
        gain.gain.setValueAtTime(0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
        osc.connect(gain);
        gain.connect(masterDrumGain);
        osc.start(time);
        osc.stop(time + 0.3);
      };

      const triggerSnare = (time: number) => {
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 1200;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.4, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(masterDrumGain);
        noise.start(time);
        noise.stop(time + 0.2);
      };

      const triggerHat = (time: number) => {
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const hatFilter = ctx.createBiquadFilter();
        hatFilter.type = 'bandpass';
        hatFilter.frequency.value = 11000;
        hatFilter.Q.value = 5.0;
        const hatGain = ctx.createGain();
        hatGain.gain.setValueAtTime(0.25, time);
        hatGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

        noise.connect(hatFilter);
        hatFilter.connect(hatGain);
        hatGain.connect(masterDrumGain);
        noise.start(time);
        noise.stop(time + 0.07);
      };

      // Interval scheduler for rhythm
      synthIntervalRef.current = window.setInterval(() => {
        const t = ctx.currentTime;
        triggerHat(t); // Every 16th note
        if (beatCount % 4 === 0) triggerKick(t); // Kick on 1 and 3
        if (beatCount % 4 === 2) triggerSnare(t); // Snare on 2 and 4
        beatCount = (beatCount + 1) % 16;
      }, 150);

    } else {
      // Polyphonic Synth Pad & Arp Lead (Wide Stereo Chorus Spread)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(261.63, now); // C4
      osc2.frequency.setValueAtTime(329.63, now); // E4 (Major third)

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2200;
      filter.Q.value = 3.5;

      const padGain = ctx.createGain();
      padGain.gain.value = 0.35;

      const merger = ctx.createChannelMerger(2);
      const delayL = ctx.createDelay();
      const delayR = ctx.createDelay();
      delayL.delayTime.value = 0.003;
      delayR.delayTime.value = 0.018; // Stereo spread

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(padGain);

      padGain.connect(delayL);
      padGain.connect(delayR);
      delayL.connect(merger, 0, 0);
      delayR.connect(merger, 0, 1);

      routeAuditionSource(merger);

      osc1.start(now);
      osc2.start(now);
      sourceNodeRef.current = osc1;

      // Filter cutoff sweep
      let phase = 0;
      synthIntervalRef.current = window.setInterval(() => {
        phase += 0.15;
        const cutoff = 1200 + Math.sin(phase) * 1000;
        filter.frequency.setTargetAtTime(cutoff, ctx.currentTime, 0.2);
      }, 100);
    }
  }, [getAudioContext, setupAnalyser, stopAuditionAudio]);

  // Start Dedicated Test Signals
  const startTestSignal = useCallback((type: 'pink_noise' | 'sine_sweep' | 'cal_1k') => {
    stopAuditionAudio();
    const ctx = getAudioContext();
    const { masterAnalyser, splitter } = setupAnalyser();
    const now = ctx.currentTime;

    const routeAuditionSource = (node: AudioNode) => {
      node.connect(masterAnalyser);
      try {
        node.connect(splitter);
      } catch (e) {
        // ignore
      }
    };

    if (type === 'cal_1k') {
      // 1 kHz Calibration Tone
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, now);
      const gain = ctx.createGain();
      gain.gain.value = 0.35;
      osc.connect(gain);
      routeAuditionSource(gain);
      osc.start(now);
      sourceNodeRef.current = osc;

    } else if (type === 'sine_sweep') {
      // Logarithmic Sine Sweep 20Hz -> 20kHz
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(20, now);
      const gain = ctx.createGain();
      gain.gain.value = 0.35;
      osc.connect(gain);
      routeAuditionSource(gain);
      osc.start(now);
      sourceNodeRef.current = osc;

      let sweepFreq = 20;
      synthIntervalRef.current = window.setInterval(() => {
        sweepFreq *= 1.12;
        if (sweepFreq > 20000) sweepFreq = 20;
        osc.frequency.setTargetAtTime(sweepFreq, ctx.currentTime, 0.05);
      }, 80);

    } else if (type === 'pink_noise') {
      // Stereo Pink Noise Generator (Paul Kellet algorithm) with correlated L/R channels
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      
      for (let ch = 0; ch < 2; ch++) {
        const out = noiseBuffer.getChannelData(ch);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        }
      }

      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = noiseBuffer;
      noiseSrc.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0.45;
      noiseSrc.connect(gain);
      routeAuditionSource(gain);
      noiseSrc.start(now);
      sourceNodeRef.current = noiseSrc;
    }
  }, [getAudioContext, setupAnalyser, stopAuditionAudio]);

  // Live Microphone Input
  const startMicInput = useCallback(async () => {
    stopAuditionAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const ctx = getAudioContext();
      const { masterAnalyser, splitter } = setupAnalyser();
      const micSource = ctx.createMediaStreamSource(stream);
      micSource.connect(masterAnalyser);
      try {
        micSource.connect(splitter);
      } catch (e) {
        // ignore
      }
      sourceNodeRef.current = micSource;
      setIsMicActive(true);
      setIsPlaying(true);
    } catch (err) {
      console.warn('Microphone access denied or unavailable:', err);
      setIsMicActive(false);
      setIsPlaying(false);
    }
  }, [getAudioContext, setupAnalyser, stopAuditionAudio]);

  // Play / Pause Toggle
  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      stopAuditionAudio();
      setIsPlaying(false);
    } else {
      if (auditionSource === 'mic') {
        startMicInput();
      } else if (auditionSource === 'track') {
        startTrackAudition(currentTrack);
        setIsPlaying(true);
      } else {
        startTestSignal(auditionSource as any);
        setIsPlaying(true);
      }
    }
  }, [isPlaying, auditionSource, currentTrack, startMicInput, startTrackAudition, startTestSignal, stopAuditionAudio]);

  // When selected track or audition source changes while playing, restart playback smoothly
  useEffect(() => {
    if (isPlaying) {
      if (auditionSource === 'track') {
        startTrackAudition(currentTrack);
      } else if (auditionSource === 'mic') {
        startMicInput();
      } else {
        startTestSignal(auditionSource as any);
      }
    }
  }, [selectedTrackId, auditionSource]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAuditionAudio();
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [stopAuditionAudio]);

  // Real-time Audio Frequency Polling Loop (Throttled for silky 35fps Recharts performance)
  useEffect(() => {
    let lastPollTime = 0;
    const targetIntervalMs = 28; // ~35 FPS

    const pollFrequencyData = (timestamp: number) => {
      if (timestamp - lastPollTime >= targetIntervalMs && !isFrozen) {
        lastPollTime = timestamp;

        const analyser = analyserRef.current || (selectedTrackId === 'master' ? masterAudioBus.getAnalyser() : null);
        if (analyser) {
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Float32Array(bufferLength);
          analyser.getFloatFrequencyData(dataArray);

          const sampleRate = analyser.context.sampleRate;
          const freqResolution = sampleRate / analyser.fftSize;

          // Initialize or resize peak hold arrays
          if (!peakHoldArrayRef.current || peakHoldArrayRef.current.length !== LOG_SPECTRUM_FREQUENCIES.length) {
            peakHoldArrayRef.current = new Float32Array(LOG_SPECTRUM_FREQUENCIES.length).fill(-90);
          }
          if (!isoPeakHoldArrayRef.current || isoPeakHoldArrayRef.current.length !== ISO_31_FREQUENCIES.length) {
            isoPeakHoldArrayRef.current = new Float32Array(ISO_31_FREQUENCIES.length).fill(-90);
          }

          const peakHold = peakHoldArrayRef.current;
          const isoPeakHold = isoPeakHoldArrayRef.current;
          const targetProfile = TARGET_PROFILES.find(p => p.id === targetProfileKey);

          // 1. Process 48 Logarithmic Spectrum Points
          let maxVal = -120;
          let maxFreq = 440;
          let sumWeightedFreq = 0;
          let sumPower = 0;

          const updatedSpectrum = LOG_SPECTRUM_FREQUENCIES.map((freq, idx) => {
            const bin = Math.min(bufferLength - 1, Math.max(0, Math.round(freq / freqResolution)));
            // Smooth adjacent bins for ultra-clean continuous curve
            const binPrev = Math.max(0, bin - 1);
            const binNext = Math.min(bufferLength - 1, bin + 1);
            const rawDb = (dataArray[binPrev] + dataArray[bin] * 2 + dataArray[binNext]) / 4;
            const clampedDb = Math.max(-90, Math.min(0, isNaN(rawDb) || !isFinite(rawDb) ? -90 : rawDb));

            // Peak Hold with smooth decay
            if (clampedDb > peakHold[idx]) {
              peakHold[idx] = clampedDb;
            } else {
              peakHold[idx] = Math.max(-90, peakHold[idx] - 0.22); // subtle decay
            }

            // Peak detection & Spectral Centroid accumulation
            if (clampedDb > maxVal) {
              maxVal = clampedDb;
              maxFreq = freq;
            }
            const linearPower = Math.pow(10, clampedDb / 20);
            sumPower += linearPower;
            sumWeightedFreq += freq * linearPower;

            const targetDb = targetProfile ? targetProfile.calculateDb(freq) : -24;

            return {
              freq,
              freqLabel: freq >= 1000 ? (freq % 1000 === 0 ? `${freq / 1000}k` : `${(freq / 1000).toFixed(1)}k`) : `${freq}`,
              db: Number(clampedDb.toFixed(1)),
              peakDb: Number(peakHold[idx].toFixed(1)),
              targetDb: Number(targetDb.toFixed(1)),
              snapshotDb: savedSnapshot && savedSnapshot[freq] !== undefined ? savedSnapshot[freq] : undefined
            };
          });

          // 2. Process ISO 31-Band 1/3-Octave Analyzer Bars
          const updatedIso31 = ISO_31_FREQUENCIES.map((freq, idx) => {
            const bin = Math.min(bufferLength - 1, Math.max(0, Math.round(freq / freqResolution)));
            const rawDb = dataArray[bin];
            const clampedDb = Math.max(-90, Math.min(0, isNaN(rawDb) || !isFinite(rawDb) ? -90 : rawDb));

            if (clampedDb > isoPeakHold[idx]) {
              isoPeakHold[idx] = clampedDb;
            } else {
              isoPeakHold[idx] = Math.max(-90, isoPeakHold[idx] - 0.25);
            }

            return {
              freq,
              freqLabel: freq >= 1000 ? (freq % 1000 === 0 ? `${freq / 1000}k` : `${(freq / 1000).toFixed(1)}k`) : `${freq}`,
              db: Number(clampedDb.toFixed(1)),
              peakDb: Number(isoPeakHold[idx].toFixed(1))
            };
          });

          // 3. Process 7-Band Acoustic Energy Groups
          let totalEnergy = 0;
          const bandAverages = ACOUSTIC_BANDS.map(band => {
            const startBin = Math.min(bufferLength - 1, Math.max(0, Math.floor(band.minFreq / freqResolution)));
            const endBin = Math.min(bufferLength - 1, Math.max(startBin, Math.ceil(band.maxFreq / freqResolution)));
            
            let bandSum = 0;
            let count = 0;
            for (let b = startBin; b <= endBin; b++) {
              const linear = Math.pow(10, dataArray[b] / 20);
              bandSum += linear;
              count++;
            }
            const avgLinear = count > 0 ? bandSum / count : 0.0001;
            const avgDb = Math.max(-90, Math.min(0, 20 * Math.log10(avgLinear)));
            totalEnergy += avgLinear;

            return {
              band,
              linear: avgLinear,
              avgDb: Number(avgDb.toFixed(1))
            };
          });

          const updatedEnergyBands = bandAverages.map(item => {
            const percent = totalEnergy > 0 ? (item.linear / totalEnergy) * 100 : 14.2;
            return {
              name: item.band.shortName,
              fullName: item.band.name,
              minFreq: item.band.minFreq,
              maxFreq: item.band.maxFreq,
              color: item.band.color,
              energyPercent: Number(percent.toFixed(1)),
              avgDb: item.avgDb
            };
          });

          // 4. Update Telemetry
          const noteInfo = freqToNoteName(maxFreq);
          const spectralCentroid = sumPower > 0 ? Math.round(sumWeightedFreq / sumPower) : 1200;
          const rmsDb = Math.max(-90, Math.min(0, 20 * Math.log10(sumPower / LOG_SPECTRUM_FREQUENCIES.length)));
          const crestFactor = Math.max(1, Math.min(30, maxVal - rmsDb));

          // 5. Real-Time Phase Correlation & Stereo Width Calculation (Pearson Cross-Correlation r)
          const leftAnalyser = leftAnalyserRef.current;
          const rightAnalyser = rightAnalyserRef.current;
          if (leftAnalyser && rightAnalyser) {
            const timeBufferLength = leftAnalyser.fftSize;
            const leftTimeData = new Float32Array(timeBufferLength);
            const rightTimeData = new Float32Array(timeBufferLength);
            leftAnalyser.getFloatTimeDomainData(leftTimeData);
            rightAnalyser.getFloatTimeDomainData(rightTimeData);

            let sumL = 0;
            let sumR = 0;
            let sumL2 = 0;
            let sumR2 = 0;
            let sumLR = 0;
            let sumMid2 = 0;
            let sumSide2 = 0;

            for (let i = 0; i < timeBufferLength; i++) {
              const l = leftTimeData[i];
              const r = rightTimeData[i];
              const m = 0.5 * (l + r);
              const s = 0.5 * (l - r);

              sumL += l;
              sumR += r;
              sumL2 += l * l;
              sumR2 += r * r;
              sumLR += l * r;
              sumMid2 += m * m;
              sumSide2 += s * s;
            }

            const meanL = sumL / timeBufferLength;
            const meanR = sumR / timeBufferLength;
            const varL = Math.max(1e-9, sumL2 / timeBufferLength - meanL * meanL);
            const varR = Math.max(1e-9, sumR2 / timeBufferLength - meanR * meanR);
            const covLR = sumLR / timeBufferLength - meanL * meanR;

            // Phase correlation coefficient: -1.0 (180 deg out of phase) to +1.0 (perfect in-phase mono)
            let corr = covLR / (Math.sqrt(varL) * Math.sqrt(varR));
            if (isNaN(corr) || !isFinite(corr)) corr = 0.98;
            corr = Math.max(-1.0, Math.min(1.0, corr));

            // Mid/Side RMS levels
            const leftRms = Math.sqrt(sumL2 / timeBufferLength);
            const rightRms = Math.sqrt(sumR2 / timeBufferLength);
            const midRms = Math.sqrt(sumMid2 / timeBufferLength);
            const sideRms = Math.sqrt(sumSide2 / timeBufferLength);

            const leftRmsDb = Math.max(-90, Math.min(0, 20 * Math.log10(Math.max(1e-5, leftRms))));
            const rightRmsDb = Math.max(-90, Math.min(0, 20 * Math.log10(Math.max(1e-5, rightRms))));
            const midRmsDb = Math.max(-90, Math.min(0, 20 * Math.log10(Math.max(1e-5, midRms))));
            const sideRmsDb = Math.max(-90, Math.min(0, 20 * Math.log10(Math.max(1e-5, sideRms))));

            // Estimated level difference when summed to mono vs stereo power
            const stereoPower = Math.max(1e-7, (leftRms * leftRms + rightRms * rightRms) * 0.5);
            const monoPower = Math.max(1e-7, midRms * midRms);
            const monoRatio = monoPower / stereoPower;
            const monoLossDb = Number((10 * Math.log10(monoRatio)).toFixed(1));

            // Stereo Width % (Side energy relative to total energy)
            const totalEnergy = midRms + sideRms;
            const stereoWidthPercent = totalEnergy > 0.0001 
              ? Math.round(Math.min(100, Math.max(0, (sideRms / totalEnergy) * 200)))
              : 50;

            // Mono compatibility status assessment
            let monoStatus: 'Safe Stereo' | 'Mono' | 'Wide Stereo' | 'Severe Phase Cancellation' | 'Inverted Polarity' = 'Safe Stereo';
            if (corr < -0.6) {
              monoStatus = 'Inverted Polarity';
            } else if (corr < 0) {
              monoStatus = 'Severe Phase Cancellation';
            } else if (corr > 0.92 && sideRmsDb < -45) {
              monoStatus = 'Mono';
            } else if (corr < 0.45) {
              monoStatus = 'Wide Stereo';
            } else {
              monoStatus = 'Safe Stereo';
            }

            setPhaseMetrics({
              correlation: Number(corr.toFixed(2)),
              stereoWidthPercent,
              monoLossDb,
              leftRmsDb: Number(leftRmsDb.toFixed(1)),
              rightRmsDb: Number(rightRmsDb.toFixed(1)),
              midRmsDb: Number(midRmsDb.toFixed(1)),
              sideRmsDb: Number(sideRmsDb.toFixed(1)),
              monoStatus
            });
          }

          setSpectrumData(updatedSpectrum);
          setIso31Data(updatedIso31);
          setEnergyBandsData(updatedEnergyBands);
          setTelemetry({
            peakFreq: maxFreq,
            peakDb: Number(maxVal.toFixed(1)),
            peakNote: `${noteInfo.note}${noteInfo.octave}`,
            peakCents: noteInfo.cents,
            rmsDb: Number(rmsDb.toFixed(1)),
            spectralCentroid,
            rollOffFreq: Math.min(20000, Math.round(spectralCentroid * 2.2)),
            crestFactor: Number(crestFactor.toFixed(1))
          });
        }
      }
      rafIdRef.current = requestAnimationFrame(pollFrequencyData);
    };

    rafIdRef.current = requestAnimationFrame(pollFrequencyData);
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [isFrozen, targetProfileKey, selectedTrackId, savedSnapshot]);

  // Snapshot Capture
  const handleTakeSnapshot = () => {
    const snapMap: { [freq: number]: number } = {};
    spectrumData.forEach(item => {
      snapMap[item.freq] = item.db;
    });
    setSavedSnapshot(snapMap);
  };

  const handleClearSnapshot = () => {
    setSavedSnapshot(null);
  };

  // Export JSON Telemetry Report
  const handleExportTelemetry = () => {
    const report = {
      timestamp: new Date().toISOString(),
      track: currentTrack.name,
      trackType: currentTrack.type,
      telemetry,
      phaseCorrelation: phaseMetrics,
      acousticBands: energyBandsData,
      spectrum: spectrumData
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spectral_analysis_${currentTrack.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Custom Recharts Tooltip Component
  const CustomSpectrumTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    const note = freqToNoteName(data.freq);
    const band = ACOUSTIC_BANDS.find(b => data.freq >= b.minFreq && data.freq <= b.maxFreq);

    return (
      <div className="bg-[#12131A] border border-[#2A2E3D] p-3 rounded-lg shadow-2xl font-mono text-xs backdrop-blur-md">
        <div className="flex items-center justify-between gap-4 pb-1.5 border-b border-[#252836]">
          <span className="font-bold text-[#00F0FF]">
            {data.freq >= 1000 ? `${(data.freq / 1000).toFixed(2)} kHz` : `${data.freq} Hz`}
          </span>
          <span className="text-[#FFD700] text-[11px] font-semibold">
            {note.note}{note.octave} {note.cents >= 0 ? `+${note.cents}` : note.cents}¢
          </span>
        </div>
        <div className="mt-2 space-y-1 text-[#AAA]">
          <div className="flex justify-between gap-4">
            <span>Live Amplitude:</span>
            <span className="text-white font-bold">{data.db} dBFS</span>
          </div>
          {data.peakDb !== undefined && (
            <div className="flex justify-between gap-4">
              <span>Peak Hold:</span>
              <span className="text-cyan-400">{data.peakDb} dBFS</span>
            </div>
          )}
          {showTargetLine && data.targetDb !== undefined && (
            <div className="flex justify-between gap-4">
              <span>Target Ref:</span>
              <span className="text-amber-400">{data.targetDb} dBFS</span>
            </div>
          )}
          {data.snapshotDb !== undefined && (
            <div className="flex justify-between gap-4">
              <span>Frozen Snapshot:</span>
              <span className="text-pink-400">{data.snapshotDb} dBFS</span>
            </div>
          )}
          {band && (
            <div className="pt-1.5 mt-1 border-t border-[#252836] flex items-center justify-between gap-2">
              <span className="text-[10px] text-[#777]">Acoustic Zone:</span>
              <span className="text-[10px] font-semibold" style={{ color: band.color }}>
                {band.name} ({band.minFreq}-{band.maxFreq >= 1000 ? `${band.maxFreq / 1000}k` : band.maxFreq}Hz)
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#0A0B0E] text-white select-none overflow-y-auto">
      {/* Top Header & Telemetry Bar */}
      <div className="px-6 py-4 bg-[#101218] border-b border-[#1E2230] flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00F0FF]/20 to-[#A855F7]/20 border border-[#00F0FF]/40 flex items-center justify-center text-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <Activity size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-wider font-mono text-white flex items-center gap-2">
                SPECTRAL ANALYSIS VIEW
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 font-semibold">
                RECHARTS FFT ENGINE
              </span>
            </div>
            <p className="text-xs text-[#8C96B5] font-mono">
              Real-time frequency distribution, 1/3-octave telemetry & acoustic energy balance
            </p>
          </div>
        </div>

        {/* Global Action Navigation */}
        <div className="flex items-center gap-2">
          {onNavigateToMixer && (
            <button
              onClick={onNavigateToMixer}
              className="px-3 py-1.5 rounded-lg border border-[#2D3345] bg-[#161922] hover:bg-[#1E2230] text-xs font-mono text-[#AAA] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>RETURN TO MIXER</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Track Selector & Audition Transport Bar */}
      <div className="px-6 py-3 bg-[#13151D] border-b border-[#1E2230] flex flex-wrap items-center justify-between gap-4 shrink-0">
        {/* Active Track Dropdown / Selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[#777] uppercase tracking-wider">Active Track:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {tracks.map(t => {
              const isSelected = t.id === selectedTrackId;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTrackId(t.id);
                    onSelectTrack?.(t.id);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-2 cursor-pointer border ${
                    isSelected
                      ? 'bg-[#1C2030] text-white shadow-[0_0_12px_rgba(0,240,255,0.25)] border-[#00F0FF]'
                      : 'bg-[#14161F] text-[#888] hover:text-[#DDD] hover:bg-[#1A1D28] border-transparent'
                  }`}
                >
                  <span 
                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                    style={{ backgroundColor: t.color || '#00F0FF' }}
                  />
                  <span className="font-semibold truncate max-w-[120px]">{t.name}</span>
                  <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-black/40 text-[#AAA]">
                    {t.type}
                  </span>
                </button>
              );
            })}

            {/* Stereo Master Bus Option */}
            <button
              onClick={() => {
                setSelectedTrackId('master');
                onSelectTrack?.('master');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-2 cursor-pointer border ${
                selectedTrackId === 'master'
                  ? 'bg-amber-950/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)] border-amber-500'
                  : 'bg-[#14161F] text-[#888] hover:text-[#DDD] hover:bg-[#1A1D28] border-transparent'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFD700] shrink-0" />
              <span className="font-semibold">Stereo Master</span>
            </button>
          </div>
        </div>

        {/* Audition Signal Generator Controls */}
        <div className="flex items-center gap-3">
          {/* Signal Source Selector */}
          <div className="flex items-center gap-1 bg-[#0E1015] p-1 rounded-lg border border-[#252836]">
            <button
              onClick={() => setAuditionSource('track')}
              className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                auditionSource === 'track' ? 'bg-[#00F0FF] text-black font-bold' : 'text-[#888] hover:text-white'
              }`}
              title="Audition live track audio or type-tailored synthesizer"
            >
              <Music size={13} />
              <span>TRACK</span>
            </button>
            <button
              onClick={() => setAuditionSource('pink_noise')}
              className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                auditionSource === 'pink_noise' ? 'bg-[#00F0FF] text-black font-bold' : 'text-[#888] hover:text-white'
              }`}
              title="Pink Noise (-3dB/octave standard reference)"
            >
              <Waves size={13} />
              <span>PINK NOISE</span>
            </button>
            <button
              onClick={() => setAuditionSource('sine_sweep')}
              className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                auditionSource === 'sine_sweep' ? 'bg-[#00F0FF] text-black font-bold' : 'text-[#888] hover:text-white'
              }`}
              title="20Hz - 20kHz Logarithmic Frequency Sweep"
            >
              <Radio size={13} />
              <span>SWEEP</span>
            </button>
            <button
              onClick={() => setAuditionSource('cal_1k')}
              className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                auditionSource === 'cal_1k' ? 'bg-[#00F0FF] text-black font-bold' : 'text-[#888] hover:text-white'
              }`}
              title="1 kHz 0 dBFS Reference Calibration Sine"
            >
              <Zap size={13} />
              <span>1kHz REF</span>
            </button>
            <button
              onClick={() => setAuditionSource('mic')}
              className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                auditionSource === 'mic' ? 'bg-pink-500 text-black font-bold' : 'text-[#888] hover:text-white'
              }`}
              title="Analyze microphone input in real time"
            >
              <Mic size={13} />
              <span>MIC IN</span>
            </button>
          </div>

          {/* Play / Pause Audition Button */}
          <button
            onClick={handleTogglePlay}
            className={`px-4 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all shadow-lg ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/25'
                : 'bg-[#00F0FF] hover:bg-[#38bdf8] text-black shadow-cyan-500/25'
            }`}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlaying ? 'STOP AUDITION' : 'PLAY AUDITION'}</span>
          </button>

          {/* Mute & Audition Gain Slider */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#252836]">
            <button
              onClick={() => setIsMuted(prev => !prev)}
              className={`p-1.5 rounded-md border cursor-pointer ${
                isMuted ? 'bg-red-950/60 border-red-500/80 text-red-400' : 'bg-[#181B24] border-[#2A2E3D] text-[#888] hover:text-white'
              }`}
              title={isMuted ? 'Unmute Audition Monitor' : 'Mute Audition Monitor'}
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={auditionVolume}
              onChange={(e) => setAuditionVolume(parseFloat(e.target.value))}
              className="w-20 accent-[#00F0FF] cursor-pointer"
              title={`Audition Volume: ${Math.round(auditionVolume * 100)}%`}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 space-y-6 flex-1">
        {/* Real-Time Acoustic & Phase Telemetry Heads-Up Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="bg-[#12141C] border border-[#202434] p-3 rounded-xl flex flex-col">
            <span className="text-[10px] font-mono text-[#777] uppercase tracking-wider">Dominant Peak</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-mono text-[#00F0FF]">
                {telemetry.peakFreq >= 1000 ? `${(telemetry.peakFreq / 1000).toFixed(2)}k` : `${telemetry.peakFreq}`}
              </span>
              <span className="text-xs font-mono text-[#666]">Hz</span>
            </div>
            <span className="text-[11px] font-mono text-[#FFD700] mt-0.5">
              Pitch: {telemetry.peakNote} {telemetry.peakCents >= 0 ? `+${telemetry.peakCents}` : telemetry.peakCents}¢
            </span>
          </div>

          <div className="bg-[#12141C] border border-[#202434] p-3 rounded-xl flex flex-col">
            <span className="text-[10px] font-mono text-[#777] uppercase tracking-wider">Peak Amplitude</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-mono text-white">
                {telemetry.peakDb}
              </span>
              <span className="text-xs font-mono text-[#666]">dBFS</span>
            </div>
            <span className="text-[11px] font-mono text-[#8C96B5] mt-0.5">
              True Peak Ceiling
            </span>
          </div>

          <div className="bg-[#12141C] border border-[#202434] p-3 rounded-xl flex flex-col">
            <span className="text-[10px] font-mono text-[#777] uppercase tracking-wider">RMS Energy Level</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-mono text-emerald-400">
                {telemetry.rmsDb}
              </span>
              <span className="text-xs font-mono text-[#666]">dBFS</span>
            </div>
            <span className="text-[11px] font-mono text-[#8C96B5] mt-0.5">
              Average Dynamic Power
            </span>
          </div>

          <div className="bg-[#12141C] border border-[#202434] p-3 rounded-xl flex flex-col">
            <span className="text-[10px] font-mono text-[#777] uppercase tracking-wider">Spectral Centroid</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-mono text-amber-400">
                {telemetry.spectralCentroid >= 1000 ? `${(telemetry.spectralCentroid / 1000).toFixed(2)}k` : `${telemetry.spectralCentroid}`}
              </span>
              <span className="text-xs font-mono text-[#666]">Hz</span>
            </div>
            <span className="text-[11px] font-mono text-[#8C96B5] mt-0.5">
              Acoustic Brightness
            </span>
          </div>

          <div className="bg-[#12141C] border border-[#202434] p-3 rounded-xl flex flex-col">
            <span className="text-[10px] font-mono text-[#777] uppercase tracking-wider">Crest Factor</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-mono text-purple-400">
                {telemetry.crestFactor}
              </span>
              <span className="text-xs font-mono text-[#666]">dB</span>
            </div>
            <span className="text-[11px] font-mono text-[#8C96B5] mt-0.5">
              Transient Punch
            </span>
          </div>

          <div className="bg-[#12141C] border border-[#202434] p-3 rounded-xl flex flex-col">
            <span className="text-[10px] font-mono text-[#777] uppercase tracking-wider">High Roll-off</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-mono text-pink-400">
                {(telemetry.rollOffFreq / 1000).toFixed(1)}k
              </span>
              <span className="text-xs font-mono text-[#666]">Hz</span>
            </div>
            <span className="text-[11px] font-mono text-[#8C96B5] mt-0.5">
              85% Energy Limit
            </span>
          </div>

          {/* Phase Correlation Real-Time Metric Card */}
          <div className={`p-3 rounded-xl flex flex-col border transition-all ${
            phaseMetrics.correlation < 0 
              ? 'bg-red-950/40 border-red-500/70 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
              : phaseMetrics.correlation > 0.6 
                ? 'bg-[#12141C] border-cyan-500/40' 
                : 'bg-[#12141C] border-[#202434]'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#777] uppercase tracking-wider">Phase Corr (r)</span>
              {phaseMetrics.correlation < 0 && <ShieldAlert size={12} className="text-red-400 animate-pulse" />}
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className={`text-xl font-bold font-mono ${
                phaseMetrics.correlation >= 0.5 
                  ? 'text-cyan-400' 
                  : phaseMetrics.correlation >= 0 
                    ? 'text-amber-400' 
                    : 'text-red-400'
              }`}>
                {phaseMetrics.correlation > 0 ? `+${phaseMetrics.correlation}` : `${phaseMetrics.correlation}`}
              </span>
              <span className="text-[10px] font-mono text-[#666]">[-1..+1]</span>
            </div>
            <span className={`text-[10px] font-mono mt-0.5 truncate ${
              phaseMetrics.correlation < 0 
                ? 'text-red-400 font-bold' 
                : phaseMetrics.correlation >= 0.7 
                  ? 'text-cyan-300' 
                  : 'text-amber-300'
            }`}>
              {phaseMetrics.monoStatus}
            </span>
          </div>

          {/* Stereo Width & Mono Sum Loss Card */}
          <div className="bg-[#12141C] border border-[#202434] p-3 rounded-xl flex flex-col">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#777] uppercase tracking-wider">Stereo Width</span>
              <Split size={12} className="text-[#8C96B5]" />
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-bold font-mono text-[#00F0FF]">
                {phaseMetrics.stereoWidthPercent}%
              </span>
              <span className="text-[10px] font-mono text-[#666]">Spread</span>
            </div>
            <span className="text-[10px] font-mono text-[#8C96B5] mt-0.5">
              Mono Loss: <span className={phaseMetrics.monoLossDb < -3 ? 'text-red-400 font-bold' : 'text-emerald-400'}>{phaseMetrics.monoLossDb} dB</span>
            </span>
          </div>
        </div>

        {/* Spectral Analyzer Chart Box */}
        <div className="bg-[#12141C] border border-[#1E2230] rounded-2xl p-5 shadow-2xl flex flex-col space-y-4">
          {/* Chart Header & Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#1E2230]">
            {/* View Mode Segmented Switcher */}
            <div className="flex items-center gap-1 bg-[#0A0B0E] p-1 rounded-lg border border-[#252836]">
              <button
                onClick={() => setViewMode('area')}
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'area' ? 'bg-[#1C2030] text-[#00F0FF] font-bold shadow-sm' : 'text-[#777] hover:text-white'
                }`}
              >
                <Activity size={14} />
                <span>Continuous FFT Curve</span>
              </button>
              <button
                onClick={() => setViewMode('iso31')}
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'iso31' ? 'bg-[#1C2030] text-[#00F0FF] font-bold shadow-sm' : 'text-[#777] hover:text-white'
                }`}
              >
                <BarChart3 size={14} />
                <span>31-Band 1/3-Octave</span>
              </button>
              <button
                onClick={() => setViewMode('energy')}
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'energy' ? 'bg-[#1C2030] text-[#00F0FF] font-bold shadow-sm' : 'text-[#777] hover:text-white'
                }`}
              >
                <Layers size={14} />
                <span>7 Acoustic Energy Zones</span>
              </button>
            </div>

            {/* Target Reference Profile Selector & Display Options */}
            <div className="flex items-center gap-2 flex-wrap">
              {viewMode === 'area' && (
                <>
                  <div className="flex items-center gap-1.5 bg-[#0A0B0E] px-2.5 py-1 rounded-lg border border-[#252836] text-xs font-mono">
                    <span className="text-[#666]">Target Curve:</span>
                    <select
                      value={targetProfileKey}
                      onChange={(e) => setTargetProfileKey(e.target.value as TargetProfileKey)}
                      className="bg-transparent text-amber-300 font-semibold focus:outline-none cursor-pointer"
                    >
                      {TARGET_PROFILES.map(p => (
                        <option key={p.id} value={p.id} className="bg-[#12141C] text-white">
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => setShowTargetLine(prev => !prev)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-mono cursor-pointer transition-colors ${
                      showTargetLine ? 'bg-amber-950/40 border-amber-600/60 text-amber-300' : 'bg-[#0A0B0E] border-[#252836] text-[#777]'
                    }`}
                    title="Toggle reference target curve line"
                  >
                    Target Line: {showTargetLine ? 'ON' : 'OFF'}
                  </button>

                  <button
                    onClick={() => setShowPeakHold(prev => !prev)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-mono cursor-pointer transition-colors ${
                      showPeakHold ? 'bg-cyan-950/40 border-cyan-600/60 text-cyan-300' : 'bg-[#0A0B0E] border-[#252836] text-[#777]'
                    }`}
                    title="Toggle peak hold transient curve"
                  >
                    Peak Hold: {showPeakHold ? 'ON' : 'OFF'}
                  </button>
                </>
              )}

              {/* Freeze & Snapshot Buttons */}
              <button
                onClick={() => setIsFrozen(prev => !prev)}
                className={`px-3 py-1 rounded-lg border text-xs font-mono font-bold cursor-pointer transition-all ${
                  isFrozen
                    ? 'bg-red-500 text-black border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                    : 'bg-[#181B24] border-[#2A2E3D] text-[#AAA] hover:text-white'
                }`}
              >
                {isFrozen ? 'UNFREEZE' : 'FREEZE'}
              </button>

              <button
                onClick={handleTakeSnapshot}
                className="px-2.5 py-1 rounded-lg border border-[#2A2E3D] bg-[#181B24] hover:bg-[#202534] text-xs font-mono text-[#00F0FF] hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                title="Capture current spectrum as frozen comparison curve"
              >
                <Camera size={13} />
                <span>SNAP</span>
              </button>

              {savedSnapshot && (
                <button
                  onClick={handleClearSnapshot}
                  className="px-2 py-1 rounded-lg border border-pink-700/50 bg-pink-950/40 text-pink-300 text-xs font-mono hover:bg-pink-900/60 transition-colors cursor-pointer"
                  title="Clear snapshot overlay"
                >
                  CLEAR SNAP
                </button>
              )}

              <button
                onClick={handleExportTelemetry}
                className="px-2.5 py-1 rounded-lg border border-[#2A2E3D] bg-[#181B24] hover:bg-[#202534] text-xs font-mono text-[#AAA] hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                title="Export spectral data and telemetry to JSON"
              >
                <Download size={13} />
                <span>JSON</span>
              </button>
            </div>
          </div>

          {/* Visualization Canvas Area */}
          <div className="w-full h-[380px] relative">
            {viewMode === 'area' && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spectrumData} margin={{ top: 15, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spectrumGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00F0FF" stopOpacity={0.65} />
                      <stop offset="40%" stopColor="#A855F7" stopOpacity={0.4} />
                      <stop offset="85%" stopColor="#FFD700" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#0B0C10" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="peakGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  {/* Decibel Reference Lines */}
                  <ReferenceLine y={0} stroke="#EF4444" strokeDasharray="3 3" strokeWidth={1} label={{ value: '0 dBFS (Clip)', fill: '#EF4444', position: 'right', fontSize: 10, fontFamily: 'monospace' }} />
                  <ReferenceLine y={-12} stroke="#374151" strokeDasharray="2 2" strokeWidth={1} />
                  <ReferenceLine y={-24} stroke="#374151" strokeDasharray="2 2" strokeWidth={1} />
                  <ReferenceLine y={-36} stroke="#374151" strokeDasharray="2 2" strokeWidth={1} />
                  <ReferenceLine y={-48} stroke="#374151" strokeDasharray="2 2" strokeWidth={1} />
                  <ReferenceLine y={-60} stroke="#374151" strokeDasharray="2 2" strokeWidth={1} />

                  <XAxis 
                    dataKey="freqLabel" 
                    stroke="#555E75" 
                    tick={{ fill: '#8C96B5', fontSize: 10, fontFamily: 'monospace' }}
                    interval={2}
                    tickLine={{ stroke: '#2D3345' }}
                  />
                  <YAxis 
                    domain={[-85, 0]} 
                    ticks={[0, -12, -24, -36, -48, -60, -72, -84]}
                    stroke="#555E75" 
                    tick={{ fill: '#8C96B5', fontSize: 10, fontFamily: 'monospace' }}
                    tickFormatter={(v) => `${v}dB`}
                    tickLine={{ stroke: '#2D3345' }}
                  />
                  <Tooltip content={<CustomSpectrumTooltip />} />

                  {/* Target Reference Curve */}
                  {showTargetLine && (
                    <Area 
                      type="monotone" 
                      dataKey="targetDb" 
                      stroke="#F59E0B" 
                      strokeWidth={1.5} 
                      strokeDasharray="4 4" 
                      fill="none" 
                      isAnimationActive={false}
                    />
                  )}

                  {/* Saved Snapshot Curve */}
                  {savedSnapshot && (
                    <Area 
                      type="monotone" 
                      dataKey="snapshotDb" 
                      stroke="#EC4899" 
                      strokeWidth={1.8} 
                      strokeDasharray="3 2" 
                      fill="none" 
                      isAnimationActive={false}
                    />
                  )}

                  {/* Peak Hold Curve */}
                  {showPeakHold && (
                    <Area 
                      type="monotone" 
                      dataKey="peakDb" 
                      stroke="#38bdf8" 
                      strokeWidth={1.2} 
                      fill="url(#peakGradient)" 
                      isAnimationActive={false}
                    />
                  )}

                  {/* Live FFT Spectrum Curve */}
                  <Area 
                    type="monotone" 
                    dataKey="db" 
                    stroke="#00F0FF" 
                    strokeWidth={2} 
                    fill="url(#spectrumGradient)" 
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {viewMode === 'iso31' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={iso31Data} margin={{ top: 15, right: 20, left: -10, bottom: 0 }}>
                  <ReferenceLine y={0} stroke="#EF4444" strokeDasharray="3 3" strokeWidth={1} />
                  <ReferenceLine y={-18} stroke="#374151" strokeDasharray="2 2" strokeWidth={1} />
                  <ReferenceLine y={-36} stroke="#374151" strokeDasharray="2 2" strokeWidth={1} />
                  <ReferenceLine y={-54} stroke="#374151" strokeDasharray="2 2" strokeWidth={1} />

                  <XAxis 
                    dataKey="freqLabel" 
                    stroke="#555E75" 
                    tick={{ fill: '#8C96B5', fontSize: 9, fontFamily: 'monospace' }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={40}
                  />
                  <YAxis 
                    domain={[-80, 0]} 
                    ticks={[0, -12, -24, -36, -48, -60, -72]}
                    stroke="#555E75" 
                    tick={{ fill: '#8C96B5', fontSize: 10, fontFamily: 'monospace' }}
                    tickFormatter={(v) => `${v}dB`}
                  />
                  <Tooltip content={<CustomSpectrumTooltip />} />

                  <Bar dataKey="db" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                    {iso31Data.map((entry, index) => {
                      const band = ACOUSTIC_BANDS.find(b => entry.freq >= b.minFreq && entry.freq <= b.maxFreq);
                      return <Cell key={`cell-${index}`} fill={band ? band.color : '#00F0FF'} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {viewMode === 'energy' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={energyBandsData} layout="vertical" margin={{ top: 15, right: 40, left: 60, bottom: 10 }}>
                  <XAxis 
                    type="number" 
                    domain={[0, 40]} 
                    stroke="#555E75" 
                    tick={{ fill: '#8C96B5', fontSize: 10, fontFamily: 'monospace' }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="#555E75" 
                    tick={{ fill: '#FFF', fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}
                  />
                  <Tooltip 
                    formatter={(value: any, name: any, item: any) => [
                      `${value}% Energy (${item.payload.avgDb} dBFS)`, 
                      `${item.payload.fullName} (${item.payload.minFreq}-${item.payload.maxFreq}Hz)`
                    ]}
                    contentStyle={{ backgroundColor: '#12141C', border: '1px solid #252836', fontFamily: 'monospace', fontSize: '11px' }}
                  />
                  <Bar dataKey="energyPercent" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                    {energyBandsData.map((entry, index) => (
                      <Cell key={`cell-energy-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* 7 Acoustic Frequency Band Labels Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-3 border-t border-[#1E2230]">
            {ACOUSTIC_BANDS.map(band => {
              const liveBand = energyBandsData.find(b => b.name === band.shortName);
              return (
                <div 
                  key={band.shortName} 
                  className="bg-[#0A0B0E] p-2.5 rounded-xl border border-[#1A1D28] flex flex-col justify-between"
                  style={{ borderLeft: `3px solid ${band.color}` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold font-mono text-white">{band.shortName}</span>
                    <span className="text-[10px] font-mono text-[#AAA]">
                      {liveBand ? `${liveBand.energyPercent}%` : '--'}
                    </span>
                  </div>
                  <div className="text-[9px] font-mono text-[#777] mt-0.5">
                    {band.minFreq >= 1000 ? `${band.minFreq / 1000}k` : band.minFreq} - {band.maxFreq >= 1000 ? `${band.maxFreq / 1000}k` : band.maxFreq} Hz
                  </div>
                  <div className="text-[10px] font-mono font-semibold mt-1" style={{ color: band.color }}>
                    {liveBand ? `${liveBand.avgDb} dB` : '--'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Phase Correlation & Stereo Width Mastering Meter Panel */}
        <div className="bg-[#12141C] border border-[#1E2230] rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1E2230]">
            <div className="flex items-center gap-2.5">
              <div className={`p-1.5 rounded-lg border ${
                phaseMetrics.correlation < 0 
                  ? 'bg-red-950/60 border-red-500 text-red-400 animate-pulse' 
                  : 'bg-cyan-950/60 border-cyan-500/50 text-[#00F0FF]'
              }`}>
                <ShieldAlert size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold font-mono tracking-wider text-white">
                    STEREO PHASE CORRELATION & MONO-COMPATIBILITY METER
                  </h3>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                    phaseMetrics.correlation < 0
                      ? 'bg-red-950 text-red-300 border-red-600 animate-pulse'
                      : phaseMetrics.correlation >= 0.7
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                        : 'bg-amber-950 text-amber-300 border-amber-700/60'
                  }`}>
                    {phaseMetrics.monoStatus.toUpperCase()}
                  </span>
                </div>
                <p className="text-[11px] text-[#8C96B5] font-mono">
                  Identifies phase cancellation, stereo collapse risk, and side-channel leakage across mastering playback systems
                </p>
              </div>
            </div>

            {/* Quick Diagnostic Status Bar */}
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-[#AAA]">
                <span>Phase (r):</span>
                <span className={`font-bold ${
                  phaseMetrics.correlation >= 0.5 
                    ? 'text-cyan-400' 
                    : phaseMetrics.correlation >= 0 
                      ? 'text-amber-400' 
                      : 'text-red-400'
                }`}>
                  {phaseMetrics.correlation > 0 ? `+${phaseMetrics.correlation}` : `${phaseMetrics.correlation}`}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[#AAA]">
                <span>Stereo Width:</span>
                <span className="text-white font-bold">{phaseMetrics.stereoWidthPercent}%</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#AAA]">
                <span>Mono Collapse Loss:</span>
                <span className={`font-bold ${phaseMetrics.monoLossDb < -3 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {phaseMetrics.monoLossDb} dB
                </span>
              </div>
            </div>
          </div>

          {/* Analog-Style Broadcast Phase Correlation Bar (-1 to +1) */}
          <div className="space-y-2 pt-1">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-red-400 font-bold flex items-center gap-1">
                <span>-1.0</span>
                <span className="text-[10px] text-red-400/80 font-normal">(180° Inverted / Full Cancellation)</span>
              </span>
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <span>0.0</span>
                <span className="text-[10px] text-amber-400/80 font-normal">(Wide Stereo / Independent L/R)</span>
              </span>
              <span className="text-cyan-400 font-bold flex items-center gap-1">
                <span className="text-[10px] text-cyan-400/80 font-normal">(Mono Compatible / In-Phase)</span>
                <span>+1.0</span>
              </span>
            </div>

            {/* Continuous Phase Meter Track */}
            <div className="relative h-6 w-full rounded-lg bg-[#08090C] border border-[#252836] overflow-hidden p-0.5">
              {/* Background Zones: Red (-1..0), Amber (0..0.4), Green/Cyan (0.4..1.0) */}
              <div className="absolute inset-0 flex opacity-20 pointer-events-none">
                <div className="w-1/2 h-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-500" />
                <div className="w-1/2 h-full bg-gradient-to-r from-amber-500 via-emerald-500 to-[#00F0FF]" />
              </div>

              {/* Center Zero Tick */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-[#4B5563] z-10" />

              {/* Center -0.5 and +0.5 subtle marks */}
              <div className="absolute left-1/4 top-0 bottom-0 w-px bg-[#262B3B] z-10" />
              <div className="absolute left-3/4 top-0 bottom-0 w-px bg-[#262B3B] z-10" />

              {/* Active Correlation Value Bar */}
              {phaseMetrics.correlation >= 0 ? (
                // Positive fill from center 50% towards right
                <div 
                  className="absolute top-1 bottom-1 bg-gradient-to-r from-amber-400 to-[#00F0FF] rounded-r transition-all duration-75 shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                  style={{
                    left: '50%',
                    width: `${(phaseMetrics.correlation * 50).toFixed(1)}%`
                  }}
                />
              ) : (
                // Negative fill from center 50% towards left (danger zone)
                <div 
                  className="absolute top-1 bottom-1 bg-gradient-to-l from-amber-500 to-red-500 rounded-l transition-all duration-75 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse"
                  style={{
                    right: '50%',
                    width: `${(Math.abs(phaseMetrics.correlation) * 50).toFixed(1)}%`
                  }}
                />
              )}

              {/* Needle Indicator Marker */}
              <div 
                className="absolute top-0 bottom-0 w-1.5 bg-white rounded-full z-20 shadow-[0_0_8px_rgba(255,255,255,0.9)] transition-all duration-75 -translate-x-1/2"
                style={{
                  left: `${((phaseMetrics.correlation + 1) / 2 * 100).toFixed(1)}%`
                }}
              />
            </div>

            {/* Meter Scale Markings */}
            <div className="flex justify-between text-[10px] font-mono text-[#555] px-1">
              <span>-1.0</span>
              <span>-0.8</span>
              <span>-0.5</span>
              <span>-0.2</span>
              <span className="text-[#888]">0.0</span>
              <span>+0.2</span>
              <span>+0.5</span>
              <span>+0.8</span>
              <span>+1.0</span>
            </div>
          </div>

          {/* Stereo Width, Mid/Side Energy Balance & Mono Diagnosis Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* 1. Mid / Side Acoustic Balance */}
            <div className="bg-[#0A0B0E] p-3 rounded-xl border border-[#1E2230] flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-white uppercase tracking-wider">
                  Mid vs Side Power (M/S)
                </span>
                <span className="text-[10px] font-mono text-[#AAA]">Stereo Dispersion</span>
              </div>

              {/* Mid Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-cyan-400 font-semibold">Mid Channel (Center / Mono):</span>
                  <span className="text-white font-bold">{phaseMetrics.midRmsDb} dBFS</span>
                </div>
                <div className="h-2 w-full bg-[#161922] rounded overflow-hidden">
                  <div 
                    className="h-full bg-cyan-400 rounded transition-all duration-75"
                    style={{ width: `${Math.min(100, Math.max(0, (phaseMetrics.midRmsDb + 90) / 90 * 100))}%` }}
                  />
                </div>
              </div>

              {/* Side Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-purple-400 font-semibold">Side Channel (Stereo Difference):</span>
                  <span className="text-white font-bold">{phaseMetrics.sideRmsDb} dBFS</span>
                </div>
                <div className="h-2 w-full bg-[#161922] rounded overflow-hidden">
                  <div 
                    className="h-full bg-purple-400 rounded transition-all duration-75"
                    style={{ width: `${Math.min(100, Math.max(0, (phaseMetrics.sideRmsDb + 90) / 90 * 100))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 2. Left vs Right Channel Levels */}
            <div className="bg-[#0A0B0E] p-3 rounded-xl border border-[#1E2230] flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-white uppercase tracking-wider">
                  Left / Right Channel Levels
                </span>
                <span className="text-[10px] font-mono text-[#AAA]">RMS Amplitude</span>
              </div>

              {/* Left Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-emerald-400 font-semibold">Left Channel:</span>
                  <span className="text-white font-bold">{phaseMetrics.leftRmsDb} dBFS</span>
                </div>
                <div className="h-2 w-full bg-[#161922] rounded overflow-hidden">
                  <div 
                    className="h-full bg-emerald-400 rounded transition-all duration-75"
                    style={{ width: `${Math.min(100, Math.max(0, (phaseMetrics.leftRmsDb + 90) / 90 * 100))}%` }}
                  />
                </div>
              </div>

              {/* Right Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-emerald-400 font-semibold">Right Channel:</span>
                  <span className="text-white font-bold">{phaseMetrics.rightRmsDb} dBFS</span>
                </div>
                <div className="h-2 w-full bg-[#161922] rounded overflow-hidden">
                  <div 
                    className="h-full bg-emerald-400 rounded transition-all duration-75"
                    style={{ width: `${Math.min(100, Math.max(0, (phaseMetrics.rightRmsDb + 90) / 90 * 100))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 3. Mastering Phase Cancellation Diagnostic */}
            <div className="bg-[#0A0B0E] p-3 rounded-xl border border-[#1E2230] flex flex-col justify-between space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle size={13} className={phaseMetrics.correlation < 0 ? 'text-red-400' : 'text-amber-400'} />
                  Mastering Diagnostic
                </span>
                <span className="text-[10px] font-mono text-[#777]">Translation Risk</span>
              </div>

              <div className="text-[11px] font-mono text-[#AAA] space-y-1">
                {phaseMetrics.correlation < 0 ? (
                  <div className="p-2 rounded bg-red-950/40 border border-red-500/50 text-red-300 space-y-0.5">
                    <div className="font-bold text-red-200">⚠ Phase Cancellation Alert!</div>
                    <div className="text-[10px] text-red-300/90 leading-tight">
                      When summed to mono on phones or club systems, audio elements will phase-cancel with ~{Math.abs(phaseMetrics.monoLossDb)} dB loss. Check stereo wideners, chorus delay, or invert polarity.
                    </div>
                  </div>
                ) : phaseMetrics.correlation < 0.35 ? (
                  <div className="p-2 rounded bg-amber-950/40 border border-amber-500/50 text-amber-300 space-y-0.5">
                    <div className="font-bold text-amber-200">Moderate Stereo Widening</div>
                    <div className="text-[10px] text-amber-300/90 leading-tight">
                      Very wide stereo image. High mono collapse risk in bass frequencies. Keep sub-bass (&lt; 100Hz) centered in pure mono.
                    </div>
                  </div>
                ) : (
                  <div className="p-2 rounded bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 space-y-0.5">
                    <div className="font-bold text-emerald-200">✓ Excellent Mono Compatibility</div>
                    <div className="text-[10px] text-emerald-300/90 leading-tight">
                      Phase alignment is healthy across channels (+{phaseMetrics.correlation}). Track will translate cleanly on smartphones, Bluetooth speakers, and vinyl mastering.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* FFT Settings & Advanced Analysis Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* FFT Resolution Card */}
          <div className="bg-[#12141C] border border-[#1E2230] p-4 rounded-xl flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <SlidersHorizontal size={14} className="text-[#00F0FF]" />
                  FFT Resolution
                </span>
                <span className="text-xs font-mono text-cyan-400 font-bold">{fftResolution} bins</span>
              </div>
              <p className="text-[11px] text-[#777] mt-1 font-mono">
                Higher resolution increases frequency precision for low-bass fundamentals.
              </p>
            </div>
            <div className="grid grid-cols-4 gap-1.5 pt-2">
              {[512, 1024, 2048, 4096].map(bins => (
                <button
                  key={bins}
                  onClick={() => setFftResolution(bins)}
                  className={`py-1 text-xs font-mono rounded border cursor-pointer ${
                    fftResolution === bins 
                      ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 font-bold' 
                      : 'bg-[#181B24] border-[#2A2E3D] text-[#888] hover:text-white'
                  }`}
                >
                  {bins}
                </button>
              ))}
            </div>
          </div>

          {/* Time Smoothing Card */}
          <div className="bg-[#12141C] border border-[#1E2230] p-4 rounded-xl flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Activity size={14} className="text-purple-400" />
                  Time Smoothing
                </span>
                <span className="text-xs font-mono text-purple-400 font-bold">{smoothingFactor.toFixed(2)}</span>
              </div>
              <p className="text-[11px] text-[#777] mt-1 font-mono">
                Controls the ballistics dampening of the spectral decay.
              </p>
            </div>
            <div className="space-y-1.5 pt-1">
              <input
                type="range"
                min="0.4"
                max="0.95"
                step="0.02"
                value={smoothingFactor}
                onChange={(e) => setSmoothingFactor(parseFloat(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#666]">
                <span>Fast (0.40)</span>
                <span>Balanced (0.82)</span>
                <span>Heavy (0.95)</span>
              </div>
            </div>
          </div>

          {/* Active Track Mix Telemetry Summary */}
          <div className="bg-[#12141C] border border-[#1E2230] p-4 rounded-xl flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Gauge size={14} className="text-emerald-400" />
                  Track Audio Metadata
                </span>
                <span 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: currentTrack.color || '#00F0FF' }}
                />
              </div>
              <div className="mt-2 space-y-1 text-xs font-mono text-[#AAA]">
                <div className="flex justify-between">
                  <span>Name:</span>
                  <span className="text-white font-bold">{currentTrack.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Type:</span>
                  <span className="text-cyan-400 uppercase">{currentTrack.type} Track</span>
                </div>
                <div className="flex justify-between">
                  <span>Clips Arranged:</span>
                  <span className="text-amber-400 font-semibold">{currentTrack.clips?.length || 0} Clips</span>
                </div>
                <div className="flex justify-between">
                  <span>Track Fader:</span>
                  <span className="text-white">{Math.round((currentTrack.volume || 1) * 100)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpectralAnalysisView;
