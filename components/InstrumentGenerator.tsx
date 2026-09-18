import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Layers, Upload, Zap, Music, Play, Pause, Download, RefreshCw, 
  Sliders, Scissors, FileCode, Check, Volume2, Sparkles, Plus, 
  Disc, FolderPlus, Grid, CornerDownRight, Radio, Film, Share2, Archive
} from 'lucide-react';
import { Track, Clip } from '../types';
import { playLaserBeamSound, getAudioContext } from '../lib/laserSound';
import SfzDefinitionBuilder from './SfzDefinitionBuilder';
import {
  generateSfzSpec,
  generateKontaktSpec,
  generateAbletonSamplerSpec,
  generateDecentSamplerSpec,
  SamplerGlobalSpec,
  SamplerRegionSpec
} from '../lib/samplerFormatGenerators';

interface DevinePreset {
  id: string;
  name: string;
  category: 'Cut-Up' | 'Breaks' | 'Glitch' | 'Lynchian' | 'Wonky' | 'Melodic' | 'Interzone';
  description: string;
  sliceSequence: number[]; // indices of slices 0 to 15
  reverseIndices: number[]; // which slices to reverse
  pitchOffsets: number[]; // semitone pitch shift per slice
}

const DEVINE_PRESETS: DevinePreset[] = [
  {
    id: 'interzone-drive-in',
    name: 'Interzone Drive-In Midnight Broadcast',
    category: 'Interzone',
    description: 'Tape-spliced radio fragments, drifting frequencies, reversed dialogue tails, and detuned synth pulses for the Interzone Drive-In.',
    sliceSequence: [0, 1, 3, 2, 4, 7, 6, 5, 8, 11, 10, 9, 12, 15, 14, 13],
    reverseIndices: [2, 5, 7, 13],
    pitchOffsets: [0, 0, -2, -2, 0, 3, 3, -5, 0, -3, 5, 5, -7, 0, 2, -4]
  },
  {
    id: 'devine-og-tribute',
    name: 'Devine Machine O.G. Tribute Chop',
    category: 'Breaks',
    description: 'Honoring the legendary Devine Machine VST: classic amen cut-ups, ratchets, and explosive transient snaps.',
    sliceSequence: [0, 2, 1, 3, 4, 6, 5, 7, 8, 10, 9, 11, 12, 14, 15, 15],
    reverseIndices: [5, 11],
    pitchOffsets: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3]
  },
  {
    id: 'burroughs-fold-in',
    name: 'Burroughsian Fold-In & Cut-Up',
    category: 'Cut-Up',
    description: 'Permutational phrase chops, alternating tape reversals, and octave leaps inspired by William S. Burroughs reel-to-reel cut-ups.',
    sliceSequence: [0, 8, 1, 9, 2, 10, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15],
    reverseIndices: [1, 3, 5, 7, 9, 11, 13, 15],
    pitchOffsets: [0, -12, 0, -12, 0, 7, 0, 7, 0, -5, 0, -5, 0, 12, 0, 12]
  },
  {
    id: 'naked-lunch-stutter',
    name: 'Naked Lunch Micro-Stutter',
    category: 'Glitch',
    description: 'Rapid staccato ratchets and fragmented syllables spliced across 16th triplets.',
    sliceSequence: [0, 0, 1, 1, 4, 4, 5, 6, 8, 8, 9, 10, 12, 12, 14, 14],
    reverseIndices: [3, 7, 11, 15],
    pitchOffsets: [0, 5, 0, 5, 0, 0, -2, -2, 0, 7, 0, 7, 0, -7, 0, -7]
  },
  {
    id: 'lynchian-red-room',
    name: 'Lynchian Red Room Reverse',
    category: 'Lynchian',
    description: 'Surrealist tape wobble, every even slice reversed with eerie -4 semitone detune.',
    sliceSequence: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    reverseIndices: [1, 3, 5, 7, 9, 11, 13, 15],
    pitchOffsets: [-4, -4, -2, -2, -5, -5, -4, -4, -3, -3, -5, -5, -7, -7, -4, -4]
  },
  {
    id: 'wonky-halftime',
    name: 'Wonky J Dilla Halftime',
    category: 'Wonky',
    description: 'Lazy swing, delayed ghost snares and deep unquantized swagger.',
    sliceSequence: [0, 4, 2, 6, 8, 12, 10, 14, 1, 5, 3, 7, 9, 13, 11, 15],
    reverseIndices: [6, 14],
    pitchOffsets: [0, 0, -1, 0, 0, 0, -2, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  {
    id: 'jungle-drill-rush',
    name: 'Jungle Drum\'n\'Bass Drill',
    category: 'Breaks',
    description: '160 BPM accelerated rolls, rapid 32nd note snare repetitions.',
    sliceSequence: [0, 1, 2, 3, 4, 5, 5, 5, 8, 9, 10, 11, 12, 13, 13, 13],
    reverseIndices: [3, 11],
    pitchOffsets: [0, 0, 0, 0, 0, 2, 4, 7, 0, 0, 0, 0, 0, 3, 5, 7]
  },
  {
    id: 'theremin-granular-cloud',
    name: 'Theremin / Solo Granular Cloud',
    category: 'Melodic',
    description: 'Extended ghost sustain envelopes, pitch shimmer, and atmospheric drone layers.',
    sliceSequence: [0, 1, 0, 2, 3, 4, 3, 5, 6, 7, 6, 8, 9, 10, 11, 12],
    reverseIndices: [2, 5, 8, 11],
    pitchOffsets: [0, 0, 7, 7, 0, 0, 12, 12, 0, 0, 5, 5, 0, 0, 0, 0]
  }
];

interface StemSourcePreset {
  id: string;
  name: string;
  type: 'drums' | 'solo_lead' | 'theremin' | 'guitar' | 'keys';
  description: string;
  bpm: number;
  rootNote: number; // MIDI note (60 = C4)
}

const STEM_PRESETS: StemSourcePreset[] = [
  {
    id: 'breakbeat-1962',
    name: '1962 Sands Casino Breakbeat (Acoustic Kit)',
    type: 'drums',
    description: 'Crisp Ludwig snare, warm 20" kick, ghost rolls, and vintage ribbon mic tone.',
    bpm: 120,
    rootNote: 36 // C1 kick
  },
  {
    id: 'surf-guitar-solo',
    name: 'Ventura Highway Surf Guitar Solo',
    type: 'guitar',
    description: 'Jaguar tremolo picking, dripping spring reverb tank, single-coil twang.',
    bpm: 124,
    rootNote: 64 // E4
  },
  {
    id: 'spooky-theremin',
    name: 'Badalamenti Haunted Theremin Lead',
    type: 'theremin',
    description: 'Continuous heterodyne sine wave vibrato, eerie pitch slides and ghost harmonics.',
    bpm: 110,
    rootNote: 69 // A4 (440Hz)
  },
  {
    id: 'rhodes-mk1-solo',
    name: '1965 Suitcase Rhodes Piano Lick',
    type: 'keys',
    description: 'Bell tine chime, gentle tube drive, and lush stereo panning tremolo.',
    bpm: 96,
    rootNote: 60 // C4
  }
];

interface SliceItem {
  id: number;
  name: string;
  startSec: number;
  endSec: number;
  pitchOffset: number; // semitones
  reversed: boolean;
  midiKey: number;
  velocitySensitivity: number;
}

interface InstrumentGeneratorProps {
  onAddTrack?: (track: Track) => void;
  tempo?: number;
}

export const InstrumentGenerator: React.FC<InstrumentGeneratorProps> = ({
  onAddTrack,
  tempo = 120
}) => {
  // Sector Mode: 'source' (RoFormer Stem Separator) | 'cutup' (The Cut-Up Engine) | 'sfz_builder' (Dedicated SFZ Definition Builder) | 'exporter' (Universal Exporter)
  const [activeTab, setActiveTab] = useState<'source' | 'cutup' | 'sfz_builder' | 'exporter'>('cutup');

  // Source Audio & RoFormer Stem separation state
  const [selectedStemPreset, setSelectedStemPreset] = useState<StemSourcePreset>(STEM_PRESETS[0]);
  const [instrumentName, setInstrumentName] = useState<string>('Sands Breakbeat Devine Kit');
  const [instrumentType, setInstrumentType] = useState<'drumkit' | 'chromatic'>('drumkit');
  const [roformerSeparationActive, setRoformerSeparationActive] = useState<boolean>(false);
  const [roformerProgress, setRoformerProgress] = useState<number>(100);
  const [roformerStems, setRoformerStems] = useState({
    drums: true,
    lead: false,
    bass: false,
    ambience: false
  });

  // Devine Machine Cutup State
  const [activeDevinePreset, setActiveDevinePreset] = useState<DevinePreset>(DEVINE_PRESETS[0]);
  const [sliceCount, setSliceCount] = useState<number>(16);
  const [activeAuditionSlice, setActiveAuditionSlice] = useState<number | null>(null);
  const [loopPlaying, setLoopPlaying] = useState<boolean>(false);
  const [slices, setSlices] = useState<SliceItem[]>([]);

  // SFZ & Decent Sampler Settings
  const [attackMs, setAttackMs] = useState<number>(10);
  const [releaseMs, setReleaseMs] = useState<number>(450);
  const [cutoffHz, setCutoffHz] = useState<number>(8500);
  const [includeDecentUi, setIncludeDecentUi] = useState<boolean>(true);
  const [exportFormat, setExportFormat] = useState<'sfz' | 'kontakt' | 'ableton' | 'decent'>('sfz');
  const [customSfzText, setCustomSfzText] = useState<string>('');
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  const loopTimerRef = useRef<number | null>(null);

  // Initialize slices when preset or slice count changes
  useEffect(() => {
    const totalDuration = (60 / selectedStemPreset.bpm) * 4; // 1 bar duration in seconds
    const sliceLen = totalDuration / sliceCount;

    const newSlices: SliceItem[] = [];
    for (let i = 0; i < sliceCount; i++) {
      const presetSeqIdx = activeDevinePreset.sliceSequence[i % activeDevinePreset.sliceSequence.length] ?? i;
      const isReversed = activeDevinePreset.reverseIndices.includes(i);
      const pitch = activeDevinePreset.pitchOffsets[i % activeDevinePreset.pitchOffsets.length] ?? 0;

      newSlices.push({
        id: i,
        name: `Slice ${i + 1} (${selectedStemPreset.type === 'drums' ? ['Kick', 'Hat', 'Snare', 'Hat', 'Kick', 'Ghost', 'Snare', 'Crash'][i % 8] : 'Note ' + (i + 1)})`,
        startSec: presetSeqIdx * sliceLen,
        endSec: (presetSeqIdx + 1) * sliceLen,
        pitchOffset: pitch,
        reversed: isReversed,
        midiKey: instrumentType === 'drumkit' ? 36 + i : 48 + i, // C1 for drum kit, C3 for chromatic
        velocitySensitivity: 100
      });
    }
    setSlices(newSlices);
  }, [selectedStemPreset, sliceCount, activeDevinePreset, instrumentType]);

  const currentSamplerGlobal: SamplerGlobalSpec = useMemo(() => ({
    instrumentName,
    defaultPath: 'samples/',
    attackSec: attackMs / 1000,
    decaySec: 0.25,
    sustainRatio: 0.75,
    releaseSec: releaseMs / 1000,
    cutoffHz: cutoffHz,
    resonanceQ: 1.5,
    masterVolumeDb: 0
  }), [instrumentName, attackMs, releaseMs, cutoffHz]);

  const currentSamplerRegions: SamplerRegionSpec[] = useMemo(() => {
    return slices.map((s, idx) => ({
      id: `slice-${idx + 1}`,
      name: s.name,
      sample: `slice_${idx + 1}_${selectedStemPreset.id}.wav`,
      lokey: s.midiKey,
      hikey: instrumentType === 'drumkit' ? s.midiKey : s.midiKey + (idx === slices.length - 1 ? 12 : 0),
      pitch_keycenter: instrumentType === 'drumkit' ? s.midiKey : selectedStemPreset.rootNote,
      lovel: 0,
      hivel: 127,
      tuneCents: s.pitchOffset * 100,
      volumeDb: 0,
      panPercent: 0,
      direction: (s.reversed ? 'reverse' : 'forward') as 'reverse' | 'forward',
      loop_mode: 'no_loop' as const,
      offsetSamples: Math.floor(s.startSec * 44100),
      endSamples: Math.floor(s.endSec * 44100)
    }));
  }, [slices, selectedStemPreset, instrumentType]);

  // Generate live format text based on exportFormat
  useEffect(() => {
    if (exportFormat === 'sfz') {
      let sfz = generateSfzSpec(currentSamplerGlobal, currentSamplerRegions);
      if (includeDecentUi) {
        sfz += `\n\n// --- DECENT SAMPLER UI COMPATIBILITY EXTENSION ---\n`;
        sfz += `/* <DecentSampler minVersion="1.0.0">\n`;
        sfz += `   <ui width="812" height="375" bgImage="strangelet_skin.png">\n`;
        sfz += `     <waveform x="40" y="30" width="732" height="110" sampleRate="48000" color="#00F0FF" />\n`;
        sfz += `     <labeled-knob x="100" y="160" label="TAPE SAT" type="float" minValue="0" maxValue="1" value="0.45" />\n`;
        sfz += `     <labeled-knob x="240" y="160" label="CUTOFF" type="float" minValue="20" maxValue="20000" value="${cutoffHz}" />\n`;
        sfz += `     <labeled-knob x="380" y="160" label="ATTACK" type="float" minValue="0.001" maxValue="2.0" value="${(attackMs / 1000).toFixed(3)}" />\n`;
        sfz += `     <labeled-knob x="520" y="160" label="RELEASE" type="float" minValue="0.01" maxValue="4.0" value="${(releaseMs / 1000).toFixed(3)}" />\n`;
        sfz += `   </ui>\n`;
        sfz += `</DecentSampler> */\n`;
      }
      setCustomSfzText(sfz);
    } else if (exportFormat === 'kontakt') {
      setCustomSfzText(generateKontaktSpec(currentSamplerGlobal, currentSamplerRegions));
    } else if (exportFormat === 'ableton') {
      setCustomSfzText(generateAbletonSamplerSpec(currentSamplerGlobal, currentSamplerRegions));
    } else if (exportFormat === 'decent') {
      setCustomSfzText(generateDecentSamplerSpec(currentSamplerGlobal, currentSamplerRegions));
    }
  }, [exportFormat, currentSamplerGlobal, currentSamplerRegions, includeDecentUi, cutoffHz, attackMs, releaseMs]);

  // Audio synthesis to audition slices / test notes
  const playSliceAudio = (sliceIndex: number) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    setActiveAuditionSlice(sliceIndex);
    setTimeout(() => setActiveAuditionSlice(null), 180);

    const slice = slices[sliceIndex];
    if (!slice) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoffHz, now);

    // Dynamic frequency calculation based on stem type and slice
    let baseFreq = 440;
    if (selectedStemPreset.type === 'drums') {
      const drumPitches = [65, 320, 180, 8000, 75, 400, 210, 9500]; // Kick, hat, snare, crash
      baseFreq = drumPitches[sliceIndex % drumPitches.length];
      osc.type = sliceIndex % 2 === 0 ? 'sine' : 'triangle';
    } else if (selectedStemPreset.type === 'theremin') {
      osc.type = 'sine';
      baseFreq = 440 * Math.pow(2, (sliceIndex * 2) / 12);
    } else if (selectedStemPreset.type === 'guitar') {
      osc.type = 'sawtooth';
      baseFreq = 220 * Math.pow(2, (sliceIndex * 2) / 12);
    } else {
      osc.type = 'triangle';
      baseFreq = 261.63 * Math.pow(2, (sliceIndex * 2) / 12);
    }

    // Apply pitch offset
    if (slice.pitchOffset !== 0) {
      baseFreq *= Math.pow(2, slice.pitchOffset / 12);
    }

    osc.frequency.setValueAtTime(baseFreq, now);

    // Fast pitch decay for kicks
    if (selectedStemPreset.type === 'drums' && (sliceIndex % 4 === 0)) {
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.08);
    }

    const dur = Math.max(0.12, slice.endSec - slice.startSec);
    const att = Math.max(0.005, attackMs / 1000);
    const rel = Math.max(0.05, releaseMs / 1000);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.28, now + att);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur + rel);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + dur + rel + 0.1);

    playLaserBeamSound('laser_midi');
  };

  // Run RoFormer v2 stem separation simulation
  const handleRunRoformer = () => {
    setRoformerSeparationActive(true);
    setRoformerProgress(10);
    playLaserBeamSound('laser_audio');

    const steps = [25, 45, 70, 90, 100];
    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length) {
        setRoformerProgress(steps[stepIdx]);
        stepIdx++;
      } else {
        clearInterval(interval);
        setRoformerSeparationActive(false);
        playLaserBeamSound('laser_curve');
      }
    }, 280);
  };

  // Devine Machine Continuous Loop Audition
  const toggleLoopPlayback = () => {
    if (loopPlaying) {
      if (loopTimerRef.current) clearInterval(loopTimerRef.current);
      setLoopPlaying(false);
    } else {
      setLoopPlaying(true);
      const stepMs = ((60 / tempo) * 4 * 1000) / sliceCount;
      let currentStep = 0;

      playSliceAudio(0);
      loopTimerRef.current = window.setInterval(() => {
        currentStep = (currentStep + 1) % sliceCount;
        playSliceAudio(currentStep);
      }, stepMs);
    }
  };

  useEffect(() => {
    return () => {
      if (loopTimerRef.current) clearInterval(loopTimerRef.current);
    };
  }, []);

  // Export handlers
  const handleDownloadSfz = () => {
    const text = generateSfzSpec(currentSamplerGlobal, currentSamplerRegions);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${instrumentName.toLowerCase().replace(/\s+/g, '_')}.sfz`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    playLaserBeamSound('laser_curve');
  };

  const handleDownloadDecentSampler = () => {
    const text = generateDecentSamplerSpec(currentSamplerGlobal, currentSamplerRegions);
    const blob = new Blob([text], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${instrumentName.toLowerCase().replace(/\s+/g, '_')}.dspreset`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    playLaserBeamSound('laser_curve');
  };

  const handleDownloadKontakt = () => {
    const text = generateKontaktSpec(currentSamplerGlobal, currentSamplerRegions);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${instrumentName.toLowerCase().replace(/\s+/g, '_')}_kontakt_multisample.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    playLaserBeamSound('laser_curve');
  };

  const handleDownloadAbleton = () => {
    const text = generateAbletonSamplerSpec(currentSamplerGlobal, currentSamplerRegions);
    const blob = new Blob([text], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${instrumentName.toLowerCase().replace(/\s+/g, '_')}_sampler_preset.adv.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    playLaserBeamSound('laser_curve');
  };

  const handleDownloadAllBundle = () => {
    const sfz = generateSfzSpec(currentSamplerGlobal, currentSamplerRegions);
    const kontakt = generateKontaktSpec(currentSamplerGlobal, currentSamplerRegions);
    const ableton = generateAbletonSamplerSpec(currentSamplerGlobal, currentSamplerRegions);
    const decent = generateDecentSamplerSpec(currentSamplerGlobal, currentSamplerRegions);

    const bundle = `// ====================================================================\n` +
      `// STRANGELET LAB // UNIVERSAL MULTI-FORMAT INSTRUMENT PACKAGE\n` +
      `// Instrument: ${instrumentName}\n` +
      `// ====================================================================\n\n` +
      `/* FORMAT 1: OPEN SFZ v2 SPECIFICATION (.sfz) */\n${sfz}\n\n` +
      `/* FORMAT 2: KONTAKT MULTISAMPLE & SCRIPT (.txt) */\n${kontakt}\n\n` +
      `/* FORMAT 3: ABLETON LIVE SAMPLER DEVICE XML (.adv / .xml) */\n${ableton}\n\n` +
      `/* FORMAT 4: DECENT SAMPLER PRESET (.dspreset) */\n${decent}\n`;

    const blob = new Blob([bundle], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${instrumentName.toLowerCase().replace(/\s+/g, '_')}_multi_format_bundle.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    playLaserBeamSound('laser_audio');
  };

  // Mount to Strangelet Mix as Playable Track
  const handleMountToMixer = () => {
    if (!onAddTrack) return;

    const newTrack: Track = {
      id: `inst-${Date.now()}`,
      name: `${instrumentName}`,
      type: instrumentType === 'drumkit' ? 'audio' : 'midi',
      volume: 0.85,
      pan: 0,
      muted: false,
      soloed: false,
      color: instrumentType === 'drumkit' ? '#FFD700' : '#00F0FF',
      phaseInverted: false,
      isMono: false,
      vstBypassed: false,
      clips: [
        {
          id: `clip-devine-${Date.now()}`,
          name: `${activeDevinePreset.name} (16 Slices)`,
          startBar: 0,
          durationBars: 4,
          isMidi: instrumentType === 'chromatic',
          waveformSnippet: [0.3, 0.8, 0.4, 0.9, 0.5, 0.7, 0.3, 0.95]
        }
      ]
    };

    onAddTrack(newTrack);
    playLaserBeamSound('laser_curve');
  };

  const copySfzCode = () => {
    navigator.clipboard.writeText(customSfzText);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  return (
    <div className="h-full p-6 flex flex-col space-y-6 overflow-y-auto bg-[#07090F] text-[#E2E8F0] font-mono">
      {/* Sector Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1E2538] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#FFD700]/10 border border-[#FFD700]/40 flex items-center justify-center text-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.2)]">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                INSTRUMENT & DRUMKIT BUILDER
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#162035] text-[#00F0FF] border border-[#00F0FF]/30 font-normal">
                  SFZ / DECENT SAMPLER CORE
                </span>
              </h2>
              <p className="text-xs text-[#94A3B8]">
                Isolate with RoFormer v2 &bull; Cut-Up Machine (WS Burroughs / Devine) &bull; Visual SFZ Keyrange Builder &bull; Universal Exporter
              </p>
            </div>
          </div>
        </div>

        {/* Mode Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#0D1220] rounded-lg border border-[#1E293B] flex-wrap">
          <button
            onClick={() => setActiveTab('source')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'source'
                ? 'bg-[#FFD700] text-black shadow-md'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
            }`}
          >
            <Sparkles size={13} />
            1. ROFORMER V2 STEM TOOL
          </button>
          <button
            onClick={() => setActiveTab('cutup')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'cutup'
                ? 'bg-[#00F0FF] text-black shadow-md'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
            }`}
          >
            <Scissors size={13} />
            2. THE CUT-UP ENGINE
          </button>
          <button
            onClick={() => setActiveTab('sfz_builder')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'sfz_builder'
                ? 'bg-[#10B981] text-black shadow-md'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
            }`}
          >
            <FileCode size={13} />
            3. SFZ DEFINITION BUILDER
          </button>
          <button
            onClick={() => setActiveTab('exporter')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'exporter'
                ? 'bg-[#A855F7] text-white shadow-md'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
            }`}
          >
            <Download size={13} />
            4. UNIVERSAL EXPORTER
          </button>
        </div>
      </div>

      {/* Main Content Area Based on Active Tab */}
      {activeTab === 'source' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Preset Stems / Upload */}
          <div className="lg:col-span-1 bg-[#0D1220] border border-[#1E293B] rounded-xl p-5 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-[#FFD700] flex items-center gap-2">
              <Disc size={16} />
              SOURCE AUDIO / SOLO PART
            </h3>
            <p className="text-xs text-[#94A3B8]">
              Select any drum break, guitar riff, theremin solo, or upload custom audio:
            </p>

            <div className="space-y-2">
              {STEM_PRESETS.map((stem) => (
                <button
                  key={stem.id}
                  onClick={() => {
                    setSelectedStemPreset(stem);
                    setInstrumentName(`${stem.name.split('(')[0].trim()} Kit`);
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedStemPreset.id === stem.id
                      ? 'bg-[#162035] border-[#FFD700] text-white shadow-[0_0_12px_rgba(255,215,0,0.15)]'
                      : 'bg-[#0A0D16] border-[#1E293B] text-[#94A3B8] hover:border-[#334155]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                    <span>{stem.name}</span>
                    <span className="text-[10px] text-[#FFD700]">{stem.bpm} BPM</span>
                  </div>
                  <p className="text-[11px] text-[#64748B] leading-relaxed">
                    {stem.description}
                  </p>
                </button>
              ))}
            </div>

            <div className="border-2 border-dashed border-[#1E293B] rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#FFD700] transition-colors">
              <Upload size={22} className="text-[#64748B] mb-2" />
              <span className="text-xs text-[#E2E8F0]">Upload Custom Audio File</span>
              <span className="text-[10px] text-[#64748B]">WAV, MP3, FLAC (Solo, Lead, Drum Loop)</span>
            </div>
          </div>

          {/* Right 2 Columns: RoFormer v2 Clean Separation Engine */}
          <div className="lg:col-span-2 bg-[#0D1220] border border-[#1E293B] rounded-xl p-5 flex flex-col justify-between gap-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles size={16} className="text-[#00F0FF]" />
                    ROFORMER V2 NEURAL STEM SEPARATOR
                  </h3>
                  <p className="text-xs text-[#94A3B8]">
                    High-precision Mel-Band & BS-RoFormer v2 model isolating transients with zero phase bleed.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-400">
                    6GB VRAM OPTIMIZED
                  </span>
                </div>
              </div>

              {/* Spectral Isolation Stem Checkboxes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className={`p-3 rounded-lg border flex flex-col gap-2 ${roformerStems.drums ? 'bg-[#152438] border-[#00F0FF] text-white' : 'bg-[#080B14] border-[#1E293B] text-[#64748B]'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">DRUMS / PERC</span>
                    <input
                      type="checkbox"
                      checked={roformerStems.drums}
                      onChange={(e) => setRoformerStems({ ...roformerStems, drums: e.target.checked })}
                      className="accent-[#00F0FF]"
                    />
                  </div>
                  <span className="text-[10px] text-[#94A3B8]">Transient hits & kicks</span>
                </div>

                <div className={`p-3 rounded-lg border flex flex-col gap-2 ${roformerStems.lead ? 'bg-[#152438] border-[#00F0FF] text-white' : 'bg-[#080B14] border-[#1E293B] text-[#64748B]'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">SOLO / LEAD</span>
                    <input
                      type="checkbox"
                      checked={roformerStems.lead}
                      onChange={(e) => setRoformerStems({ ...roformerStems, lead: e.target.checked })}
                      className="accent-[#00F0FF]"
                    />
                  </div>
                  <span className="text-[10px] text-[#94A3B8]">Theremin / Surf Guitar</span>
                </div>

                <div className={`p-3 rounded-lg border flex flex-col gap-2 ${roformerStems.bass ? 'bg-[#152438] border-[#00F0FF] text-white' : 'bg-[#080B14] border-[#1E293B] text-[#64748B]'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">BASS / SUB</span>
                    <input
                      type="checkbox"
                      checked={roformerStems.bass}
                      onChange={(e) => setRoformerStems({ ...roformerStems, bass: e.target.checked })}
                      className="accent-[#00F0FF]"
                    />
                  </div>
                  <span className="text-[10px] text-[#94A3B8]">Fundamental 40-200Hz</span>
                </div>

                <div className={`p-3 rounded-lg border flex flex-col gap-2 ${roformerStems.ambience ? 'bg-[#152438] border-[#00F0FF] text-white' : 'bg-[#080B14] border-[#1E293B] text-[#64748B]'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">AMBIENCE / TAIL</span>
                    <input
                      type="checkbox"
                      checked={roformerStems.ambience}
                      onChange={(e) => setRoformerStems({ ...roformerStems, ambience: e.target.checked })}
                      className="accent-[#00F0FF]"
                    />
                  </div>
                  <span className="text-[10px] text-[#94A3B8]">Spring reverb & vinyl</span>
                </div>
              </div>

              {/* Progress bar during separation */}
              {roformerSeparationActive && (
                <div className="space-y-1.5 p-3 rounded-lg bg-[#080B14] border border-[#00F0FF]/30">
                  <div className="flex justify-between text-xs text-[#00F0FF]">
                    <span>Demuxing RoFormer v2 Mel-Spectrogram...</span>
                    <span>{roformerProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#020408] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#00F0FF] to-[#10B981] transition-all duration-200"
                      style={{ width: `${roformerProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#1E293B]">
              <button
                onClick={handleRunRoformer}
                disabled={roformerSeparationActive}
                className="px-5 py-2.5 rounded-lg bg-[#141F32] hover:bg-[#1C2C47] text-[#00F0FF] border border-[#00F0FF]/40 text-xs font-bold flex items-center gap-2 transition-all"
              >
                <RefreshCw size={14} className={roformerSeparationActive ? 'animate-spin' : ''} />
                RUN ROFORMER V2 SEPARATION
              </button>

              <button
                onClick={() => setActiveTab('cutup')}
                className="px-6 py-2.5 rounded-lg bg-[#FFD700] hover:bg-[#FFC700] text-black font-extrabold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(255,215,0,0.3)] transition-all"
              >
                SEND ISOLATED STEM TO THE CUT-UP ENGINE
                <CornerDownRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* The Cut-Up Engine (WS Burroughs / Devine Machine) Tab */}
      {activeTab === 'cutup' && (
        <div className="flex flex-col gap-6">
          {/* Preset Selector Bar */}
          <div className="p-4 bg-[#0D1220] border border-[#1E293B] rounded-xl flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#00F0FF]/10 border border-[#00F0FF]/40 flex items-center justify-center text-[#00F0FF]">
                  <Scissors size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      THE CUT-UP ENGINE
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#1A1828] text-[#A855F7] border border-[#A855F7]/30 font-mono">
                      WS BURROUGHS &times; DEVINE MACHINE
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#0F2338] text-[#00F0FF] border border-[#00F0FF]/30 font-mono flex items-center gap-1">
                      <Film size={10} />
                      INTERZONE DRIVE-IN LINK
                    </span>
                  </div>
                  <p className="text-[11px] text-[#94A3B8]">
                    Loop slicer, tape reversals & permutational phrase folds honoring WS Burroughs, the classic Devine Machine VST & the Interzone Drive-In
                  </p>
                </div>
              </div>

              {/* Quick Jump to SFZ Definition Builder */}
              <button
                onClick={() => setActiveTab('sfz_builder')}
                className="px-4 py-2 rounded-lg bg-[#10B981] hover:bg-[#059669] text-black font-extrabold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
              >
                <FileCode size={14} />
                MAP SLICES IN SFZ DEFINITION BUILDER
                <CornerDownRight size={14} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#1E293B]/60">
              {DEVINE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setActiveDevinePreset(preset)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                    activeDevinePreset.id === preset.id
                      ? 'bg-[#00F0FF] text-black font-bold border-[#00F0FF] shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                      : 'bg-[#0A0E1A] text-[#94A3B8] border-[#1E293B] hover:text-white hover:border-[#334155]'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Slicer Controls & Interactive 16-Pad MPC Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Slice Pad Matrix */}
            <div className="lg:col-span-2 bg-[#0D1220] border border-[#1E293B] rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Grid size={16} className="text-[#FFD700]" />
                    DEVINE 16-PAD SLICE AUDITION BOARD
                  </h3>
                  <button
                    onClick={toggleLoopPlayback}
                    className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
                      loopPlaying
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'bg-[#10B981] text-black hover:bg-[#059669]'
                    }`}
                  >
                    {loopPlaying ? <Pause size={12} /> : <Play size={12} />}
                    {loopPlaying ? 'STOP LOOP' : 'PLAY LOOP'}
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#64748B]">Slices:</span>
                  <select
                    value={sliceCount}
                    onChange={(e) => setSliceCount(Number(e.target.value))}
                    className="bg-[#080B14] border border-[#1E293B] rounded px-2 py-1 text-white text-xs"
                  >
                    <option value={8}>8 Slices</option>
                    <option value={16}>16 Slices</option>
                    <option value={32}>32 Slices</option>
                  </select>
                </div>
              </div>

              {/* Active Preset Description Callout */}
              <div className="p-3 bg-[#080C18] rounded-lg border border-[#1E293B] flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-[#00F0FF] mr-2">
                    [{activeDevinePreset.category.toUpperCase()}] {activeDevinePreset.name}:
                  </span>
                  <span className="text-[#94A3B8]">{activeDevinePreset.description}</span>
                </div>
              </div>

              {/* 16 Illuminated MPC Pads */}
              <div className="grid grid-cols-4 gap-3 pt-1">
                {slices.map((slice, idx) => {
                  const isAuditioning = activeAuditionSlice === idx;
                  return (
                    <button
                      key={slice.id}
                      onClick={() => playSliceAudio(idx)}
                      className={`h-20 rounded-xl border p-2 flex flex-col justify-between text-left transition-all relative overflow-hidden transform active:scale-95 ${
                        isAuditioning
                          ? 'bg-[#FFD700] border-white text-black shadow-[0_0_20px_#FFD700]'
                          : slice.reversed
                          ? 'bg-[#1F1225] border-[#A855F7]/60 text-white hover:border-[#A855F7]'
                          : 'bg-[#080C18] border-[#1E293B] text-white hover:border-[#FFD700]/70'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] font-bold opacity-70">
                          PAD {idx + 1}
                        </span>
                        {slice.reversed && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-[#A855F7]/30 text-[#A855F7] font-bold">
                            REV
                          </span>
                        )}
                        {slice.pitchOffset !== 0 && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-blue-950 text-blue-400">
                            {slice.pitchOffset > 0 ? `+${slice.pitchOffset}` : slice.pitchOffset}st
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-bold truncate">
                        {slice.name}
                      </div>

                      <div className="flex items-center justify-between text-[9px] text-[#64748B]">
                        <span>MIDI: {slice.midiKey}</span>
                        <span>{(slice.startSec).toFixed(2)}s</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Mix Synchronization & Direct Insertion */}
            <div className="bg-[#0D1220] border border-[#1E293B] rounded-xl p-5 flex flex-col justify-between gap-5">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#FFD700] flex items-center gap-2">
                  <Sparkles size={16} />
                  PROJECT MIX INTEGRATION
                </h3>
                <p className="text-xs text-[#94A3B8]">
                  Inject this sliced arrangement directly into Strangelet Lab's multitrack timeline, synchronized to your session's tempo.
                </p>

                <div className="space-y-2 p-3 bg-[#080B14] rounded-lg border border-[#1E293B] text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Target Format:</span>
                    <span className="font-bold text-white uppercase">{instrumentType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Session Tempo:</span>
                    <span className="font-bold text-[#00F0FF]">{tempo} BPM (Locked)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Active Slices:</span>
                    <span className="font-bold text-white">{slices.length} Slices</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Preset Applied:</span>
                    <span className="font-bold text-[#FFD700]">{activeDevinePreset.name}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] text-[#94A3B8]">
                    INSTRUMENT / KIT NAME
                  </label>
                  <input
                    type="text"
                    value={instrumentName}
                    onChange={(e) => setInstrumentName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#060810] border border-[#1E293B] rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#FFD700]"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-[#1E293B]">
                <button
                  onClick={handleMountToMixer}
                  className="w-full py-3 rounded-lg bg-[#FFD700] hover:bg-[#FFC700] text-black font-extrabold text-xs tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all"
                >
                  <Plus size={16} />
                  SEND SYNCED LOOP DIRECTLY TO MIX
                </button>

                <button
                  onClick={() => setActiveTab('sfz_builder')}
                  className="w-full py-2.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-black text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                >
                  <FileCode size={15} />
                  SEND SLICES TO SFZ DEFINITION BUILDER (TAB 3)
                </button>

                <button
                  onClick={() => setActiveTab('exporter')}
                  className="w-full py-2 rounded-lg bg-[#162035] hover:bg-[#1E2C4A] text-[#94A3B8] hover:text-white border border-[#1E293B] text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Download size={14} />
                  OPEN UNIVERSAL MULTI-DAW EXPORTER (TAB 4)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SFZ Definition Builder Tab */}
      {activeTab === 'sfz_builder' && (
        <SfzDefinitionBuilder
          instrumentName={instrumentName}
          onChangeInstrumentName={setInstrumentName}
          initialSlices={slices}
          onMountTrack={onAddTrack}
          sessionBpm={tempo}
        />
      )}

      {/* Universal Multi-DAW Exporter & Raw Spec Tab */}
      {activeTab === 'exporter' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SFZ Code Editor / Viewer */}
          <div className="lg:col-span-2 bg-[#0D1220] border border-[#1E293B] rounded-xl p-5 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileCode size={18} className="text-[#10B981]" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  FORMAT EXPORTER & SPEC GENERATOR
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#64748B] font-bold">FORMAT:</span>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as any)}
                  className="px-2.5 py-1 bg-[#060810] border border-[#10B981]/50 rounded text-xs font-mono text-[#10B981] font-bold focus:outline-none focus:ring-1 focus:ring-[#10B981]"
                >
                  <option value="sfz">Open-Source SFZ v2 (.sfz)</option>
                  <option value="kontakt">Native Instruments Kontakt (.txt / .ksp)</option>
                  <option value="ableton">Ableton Live Sampler (.adv / .xml)</option>
                  <option value="decent">Decent Sampler (.dspreset)</option>
                </select>
                <button
                  onClick={copySfzCode}
                  className="px-3 py-1 bg-[#152438] hover:bg-[#1E334E] text-[#00F0FF] rounded text-xs font-bold border border-[#00F0FF]/30 transition-colors flex items-center gap-1.5"
                >
                  {copiedNotification ? <Check size={12} /> : null}
                  {copiedNotification ? 'COPIED TO CLIPBOARD' : 'COPY CODE'}
                </button>
              </div>
            </div>

            {/* Code Mirror / Text Display */}
            <div className="relative rounded-lg overflow-hidden border border-[#1E293B] bg-[#05070D]">
              <textarea
                value={customSfzText}
                onChange={(e) => setCustomSfzText(e.target.value)}
                rows={16}
                className="w-full p-4 bg-transparent text-[#10B981] font-mono text-xs leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-[#10B981]"
                spellCheck={false}
              />
            </div>

            {/* Parameter Knobs / Quick Controls */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-[#080B14] rounded-lg border border-[#1E293B] text-xs">
              <div>
                <label className="block text-[10px] text-[#64748B] mb-1">
                  ATTACK ({attackMs}ms)
                </label>
                <input
                  type="range"
                  min={1}
                  max={500}
                  value={attackMs}
                  onChange={(e) => setAttackMs(Number(e.target.value))}
                  className="w-full accent-[#10B981]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#64748B] mb-1">
                  RELEASE ({releaseMs}ms)
                </label>
                <input
                  type="range"
                  min={10}
                  max={2500}
                  value={releaseMs}
                  onChange={(e) => setReleaseMs(Number(e.target.value))}
                  className="w-full accent-[#10B981]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#64748B] mb-1">
                  FILTER CUTOFF ({cutoffHz}Hz)
                </label>
                <input
                  type="range"
                  min={200}
                  max={18000}
                  step={100}
                  value={cutoffHz}
                  onChange={(e) => setCutoffHz(Number(e.target.value))}
                  className="w-full accent-[#10B981]"
                />
              </div>

              <div className="flex items-center gap-2 pt-3">
                <input
                  type="checkbox"
                  id="decentUiCheck"
                  checked={includeDecentUi}
                  onChange={(e) => setIncludeDecentUi(e.target.checked)}
                  className="accent-[#00F0FF]"
                />
                <label htmlFor="decentUiCheck" className="text-[11px] text-[#94A3B8] cursor-pointer">
                  Include Decent Sampler UI XML
                </label>
              </div>
            </div>
          </div>

          {/* Export Center */}
          <div className="bg-[#0D1220] border border-[#1E293B] rounded-xl p-5 flex flex-col justify-between gap-5">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Download size={16} className="text-[#FFD700]" />
                UNIVERSAL EXPORT CENTER
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Export freely to open-source and proprietary DAWs. No vendor lock-in!
              </p>

              <div className="space-y-2.5">
                {/* 1. Open Source SFZ */}
                <button
                  onClick={handleDownloadSfz}
                  className="w-full p-3 rounded-lg bg-[#14261D] hover:bg-[#1C3829] border border-[#10B981]/50 text-white text-left transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="text-xs font-bold text-[#10B981] group-hover:text-white">
                      EXPORT .SFZ (OPEN SOURCE STANDARD)
                    </div>
                    <div className="text-[10px] text-[#64748B]">
                      LinuxSampler, Sforzando, Carla, SFZ Player
                    </div>
                  </div>
                  <Download size={16} className="text-[#10B981]" />
                </button>

                {/* 2. Decent Sampler Preset */}
                <button
                  onClick={handleDownloadDecentSampler}
                  className="w-full p-3 rounded-lg bg-[#122332] hover:bg-[#1A3348] border border-[#00F0FF]/50 text-white text-left transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="text-xs font-bold text-[#00F0FF] group-hover:text-white">
                      EXPORT DECENT SAMPLER (.dspreset)
                    </div>
                    <div className="text-[10px] text-[#64748B]">
                      Includes modern UI, waveform visualizer & FX knobs
                    </div>
                  </div>
                  <Download size={16} className="text-[#00F0FF]" />
                </button>

                {/* 3. Kontakt Definition */}
                <button
                  onClick={handleDownloadKontakt}
                  className="w-full p-3 rounded-lg bg-[#1B1A28] hover:bg-[#252438] border border-[#A855F7]/50 text-white text-left transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="text-xs font-bold text-[#A855F7] group-hover:text-white">
                      EXPORT KONTAKT SCRIPT DEFINITION (.txt / .ksp)
                    </div>
                    <div className="text-[10px] text-[#64748B]">
                      Native Instruments Kontakt zone map & KSP script
                    </div>
                  </div>
                  <Download size={16} className="text-[#A855F7]" />
                </button>

                {/* 4. Ableton Live Sampler */}
                <button
                  onClick={handleDownloadAbleton}
                  className="w-full p-3 rounded-lg bg-[#1E1C14] hover:bg-[#2A2718] border border-[#FFD700]/50 text-white text-left transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="text-xs font-bold text-[#FFD700] group-hover:text-white">
                      EXPORT ABLETON LIVE SAMPLER (.adv / .xml)
                    </div>
                    <div className="text-[10px] text-[#64748B]">
                      Live Sampler device XML preset with multi-zone map
                    </div>
                  </div>
                  <Download size={16} className="text-[#FFD700]" />
                </button>

                {/* 5. Complete Bundle */}
                <button
                  onClick={handleDownloadAllBundle}
                  className="w-full p-2.5 rounded-lg bg-[#152438] hover:bg-[#1E334E] border border-[#00F0FF]/40 text-[#00F0FF] text-left transition-all flex items-center justify-between group text-xs font-bold"
                >
                  <span className="flex items-center gap-2">
                    <Archive size={14} />
                    DOWNLOAD ALL 4 FORMATS BUNDLE
                  </span>
                  <Download size={14} />
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-[#1E293B]">
              <button
                onClick={handleMountToMixer}
                className="w-full py-3 rounded-lg bg-[#FFD700] hover:bg-[#FFC700] text-black font-extrabold text-xs tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all"
              >
                <Plus size={16} />
                MOUNT AS PLAYABLE TRACK IN MIXER
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstrumentGenerator;
