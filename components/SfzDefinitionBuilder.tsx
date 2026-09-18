import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  FileCode, Play, Pause, Plus, Trash2, Copy, Download, Check, 
  Layers, Volume2, Sliders, Music, Sparkles, RefreshCw, Eye, 
  ChevronRight, ChevronDown, ArrowRight, CornerDownRight, Radio,
  FolderPlus, Disc, Scissors, Maximize2, Archive, Share2, Compass, Scale, Activity
} from 'lucide-react';
import { getAudioContext, playLaserBeamSound } from '../lib/laserSound';
import { Track } from '../types';
import WaveformTrimmer from './WaveformTrimmer';
import VisualMappingUtility from './VisualMappingUtility';
import VectorMorphPad, { VectorCornerConfig } from './VectorMorphPad';
import TapeDeckMacroPanel from './TapeDeckMacroPanel';
import MicroTuningPanel from './MicroTuningPanel';
import { TapeDeckParams, getTapeDeckProcessor, TapeDeckProcessor } from '../lib/tapeDeckDSP';
import {
  BUILT_IN_SCALES,
  ScaleDefinition,
  calculateScaleFrequency,
  synthesizeKarplusStrong,
  synthesizeFmSine,
  synthesizeSubBass,
  synthesizeTheremin
} from '../lib/hybridSynthEngine';
import {
  generateSfzSpec,
  generateKontaktSpec,
  generateAbletonSamplerSpec,
  generateDecentSamplerSpec,
  SamplerGlobalSpec,
  SamplerRegionSpec
} from '../lib/samplerFormatGenerators';

export type ExportFormat = 'sfz' | 'kontakt' | 'ableton' | 'decent';
export type ViewMode = 'mapping' | 'waveform' | 'vector_pad' | 'tape_deck' | 'microtuning' | 'hierarchy' | 'exporter';

export type WaveformType = 
  | 'sine_sub' 
  | 'saw_analog' 
  | 'pulse_juno' 
  | 'triangle_flute' 
  | 'theremin_lead' 
  | 'tape_noise' 
  | 'interzone_bell'
  | 'sample_slice'
  | 'custom_wav';

export interface SfzRegion {
  id: string;
  name: string;
  groupId: string;
  sample: string;
  waveformType: WaveformType;
  lokey: number; // 0 - 127
  hikey: number; // 0 - 127
  pitch_keycenter: number; // 0 - 127
  lovel: number; // 0 - 127
  hivel: number; // 0 - 127
  offsetSamples?: number; // non-destructive trim start offset
  endSamples?: number; // non-destructive trim end bound
  totalSamples?: number; // total buffer sample frames
  normalizedGainDb?: number; // non-destructive buffer normalization boost
  tune: number; // cents -100 to +100
  volume: number; // dB -24 to +6
  pan: number; // -100 to 100
  direction: 'forward' | 'reverse';
  loop_mode: 'no_loop' | 'loop_continuous' | 'loop_sustain';
  color: string;
}

export interface SfzGroup {
  id: string;
  name: string;
  polyphony: number;
  off_by?: number;
}

export interface SfzGlobalConfig {
  ampeg_attack: number; // seconds
  ampeg_decay: number; // seconds
  ampeg_sustain: number; // 0 to 1
  ampeg_release: number; // seconds
  cutoff: number; // Hz
  resonance: number; // Q
  master_volume: number; // dB
  default_path: string;
}

interface SfzDefinitionBuilderProps {
  instrumentName?: string;
  onChangeInstrumentName?: (name: string) => void;
  initialSlices?: {
    id: number;
    name: string;
    startSec: number;
    endSec: number;
    pitchOffset: number;
    reversed: boolean;
    midiKey: number;
  }[];
  onMountTrack?: (track: Track) => void;
  sessionBpm?: number;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToNoteName(midi: number): string {
  const note = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1; // 60 = C4
  return `${note}${octave}`;
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const REGION_PALETTE = [
  '#00F0FF', // Cyan
  '#FFD700', // Gold
  '#10B981', // Emerald
  '#A855F7', // Purple
  '#F97316', // Orange
  '#EC4899', // Pink
  '#38BDF8', // Sky
  '#EAB308'  // Amber
];

const INITIAL_GROUPS: SfzGroup[] = [
  { id: 'group-1', name: 'Primary_Waveforms', polyphony: 16 },
  { id: 'group-2', name: 'Cutup_Slices', polyphony: 8, off_by: 1 }
];

export const SfzDefinitionBuilder: React.FC<SfzDefinitionBuilderProps> = ({
  instrumentName = 'Interzone SFZ Hybrid',
  onChangeInstrumentName,
  initialSlices = [],
  onMountTrack,
  sessionBpm = 120
}) => {
  // Global SFZ parameters
  const [globalConfig, setGlobalConfig] = useState<SfzGlobalConfig>({
    ampeg_attack: 0.015,
    ampeg_decay: 0.25,
    ampeg_sustain: 0.8,
    ampeg_release: 0.45,
    cutoff: 7500,
    resonance: 1.8,
    master_volume: 0,
    default_path: 'samples/'
  });

  const [groups, setGroups] = useState<SfzGroup[]>(INITIAL_GROUPS);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('group-1');

  // Regions state
  const [regions, setRegions] = useState<SfzRegion[]>([
    {
      id: 'reg-sub-bass',
      name: 'Sub Bass Foundation',
      groupId: 'group-1',
      sample: 'synth_sub_c1.wav',
      waveformType: 'sine_sub',
      lokey: 24, // C1
      hikey: 47, // B2
      pitch_keycenter: 36, // C2
      lovel: 0,
      hivel: 127,
      tune: 0,
      volume: 0,
      pan: 0,
      direction: 'forward',
      loop_mode: 'loop_continuous',
      color: '#00F0FF'
    },
    {
      id: 'reg-analog-saw',
      name: 'Minimoog Lead / Chords',
      groupId: 'group-1',
      sample: 'synth_saw_c3.wav',
      waveformType: 'saw_analog',
      lokey: 48, // C3
      hikey: 71, // B4
      pitch_keycenter: 60, // C4
      lovel: 0,
      hivel: 127,
      tune: 0,
      volume: -2,
      pan: -15,
      direction: 'forward',
      loop_mode: 'loop_continuous',
      color: '#FFD700'
    },
    {
      id: 'reg-interzone-bell',
      name: 'Interzone FM Glass Bell',
      groupId: 'group-1',
      sample: 'interzone_fm_bell_c5.wav',
      waveformType: 'interzone_bell',
      lokey: 72, // C5
      hikey: 84, // C6
      pitch_keycenter: 72, // C5
      lovel: 0,
      hivel: 127,
      tune: 5,
      volume: -1,
      pan: 25,
      direction: 'forward',
      loop_mode: 'no_loop',
      color: '#A855F7'
    },
    {
      id: 'reg-theremin-high',
      name: 'Badalamenti Theremin Lead',
      groupId: 'group-1',
      sample: 'theremin_lead_a5.wav',
      waveformType: 'theremin_lead',
      lokey: 85, // C#6
      hikey: 96, // C7
      pitch_keycenter: 93, // A6
      lovel: 0,
      hivel: 127,
      tune: -4,
      volume: -3,
      pan: 0,
      direction: 'forward',
      loop_mode: 'loop_continuous',
      color: '#10B981'
    }
  ]);

  const [selectedRegionId, setSelectedRegionId] = useState<string>('reg-sub-bass');
  const [activeAuditionMidi, setActiveAuditionMidi] = useState<number | null>(null);
  const [keyboardStartOctave, setKeyboardStartOctave] = useState<number>(2); // C2 to C6 default
  const [assignMode, setAssignMode] = useState<'none' | 'lokey' | 'hikey' | 'center'>('none');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('mapping');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('sfz');

  // Vector Morphing & Pure Web Synthesis Hybrids state
  const [vectorX, setVectorX] = useState<number>(0.5);
  const [vectorY, setVectorY] = useState<number>(0.5);
  const [thirdMindActive, setThirdMindActive] = useState<boolean>(false);
  const [vectorCorners, setVectorCorners] = useState<VectorCornerConfig[]>([
    { id: 'top_left', label: 'Layer A (Clean Sample)', sourceType: 'sample', color: '#00F0FF' },
    { id: 'top_right', label: 'Layer B (Karplus-Strong)', sourceType: 'synth:karplus_strong', color: '#FFD700' },
    { id: 'bottom_left', label: 'Layer C (FM Bell/Sine)', sourceType: 'synth:fm_sine', color: '#A855F7' },
    { id: 'bottom_right', label: 'Layer D (Theremin Lead)', sourceType: 'synth:theremin', color: '#10B981' }
  ]);

  // "The Tape Deck" Vintage Macro Panel & Canvas DSP state
  const [tapeDeckParams, setTapeDeckParams] = useState<TapeDeckParams>({
    drive: 0.45,
    wow: 0.25,
    flutter: 0.20,
    age: 0.30,
    reverbMix: 0.28,
    irType: 'spring_reverb_tank',
    cutoffHz: 7500
  });
  const [canvasTheme, setCanvasTheme] = useState<'noir_velvet' | 'vacuum_tube_crt' | 'cyberpunk_amber' | 'bw_chevron'>('noir_velvet');
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  // Algorithmic Micro-Tuning & Scala (.scl) state
  const [currentScale, setCurrentScale] = useState<ScaleDefinition>(BUILT_IN_SCALES[0]);
  const [baseA4Hz, setBaseA4Hz] = useState<number>(440);
  const [microTuneCents, setMicroTuneCents] = useState<number>(0);

  // Initialize tape deck DSP processor on demand
  useEffect(() => {
    try {
      const ctx = getAudioContext();
      if (ctx) {
        const proc = getTapeDeckProcessor(ctx, tapeDeckParams);
        setAnalyserNode(proc.analyserNode);
      }
    } catch {}
  }, []);

  const handleUpdateTapeParams = (newParams: Partial<TapeDeckParams>) => {
    setTapeDeckParams(prev => {
      const updated = { ...prev, ...newParams };
      try {
        const ctx = getAudioContext();
        if (ctx) {
          const proc = getTapeDeckProcessor(ctx, updated);
          setAnalyserNode(proc.analyserNode);
        }
      } catch {}
      return updated;
    });
  };

  const handleChangeCornerSource = (cornerId: VectorCornerConfig['id'], newSource: VectorCornerConfig['sourceType']) => {
    setVectorCorners(prev => prev.map(c => c.id === cornerId ? { ...c, sourceType: newSource } : c));
  };

  // Currently selected region
  const selectedRegion = useMemo(() => {
    return regions.find(r => r.id === selectedRegionId) || regions[0] || null;
  }, [regions, selectedRegionId]);

  // Non-destructive trimming and normalization update handlers
  const handleUpdateTrim = (offsetSamples: number, endSamples: number) => {
    if (!selectedRegion) return;
    setRegions(prev => prev.map(r => r.id === selectedRegion.id ? {
      ...r,
      offsetSamples,
      endSamples
    } : r));
  };

  const handleUpdateNormalization = (gainDb: number) => {
    if (!selectedRegion) return;
    setRegions(prev => prev.map(r => r.id === selectedRegion.id ? {
      ...r,
      normalizedGainDb: gainDb
    } : r));
  };

  const handleAddRegionFromSample = (sampleName: string, waveformType: WaveformType, lokey: number, hikey: number, rootKey: number) => {
    const newRegion: SfzRegion = {
      id: `reg-${Date.now()}`,
      name: sampleName.replace(/\.wav$/i, ''),
      groupId: selectedGroupId,
      sample: sampleName,
      waveformType,
      lokey,
      hikey,
      pitch_keycenter: rootKey,
      lovel: 0,
      hivel: 127,
      tune: 0,
      volume: 0,
      pan: 0,
      direction: 'forward',
      loop_mode: 'no_loop',
      color: REGION_PALETTE[regions.length % REGION_PALETTE.length]
    };
    setRegions(prev => [...prev, newRegion]);
    setSelectedRegionId(newRegion.id);
  };

  // Convert regions to universal sampler region specs
  const samplerRegions: SamplerRegionSpec[] = useMemo(() => {
    return regions.map((r, i) => {
      let hybridSynth: SamplerRegionSpec['hybridSynth'] = undefined;
      if (r.waveformType === 'theremin_lead') hybridSynth = 'synth:theremin';
      else if (r.waveformType === 'sine_sub') hybridSynth = 'synth:sub_bass';
      else if (r.waveformType === 'interzone_bell') hybridSynth = 'synth:fm_sine';

      // Assign vector corners to first 4 zones
      const cornerAssignments: ('top_left' | 'top_right' | 'bottom_left' | 'bottom_right')[] = [
        'top_left', 'top_right', 'bottom_left', 'bottom_right'
      ];

      return {
        id: r.id,
        name: r.name,
        sample: r.sample,
        hybridSynth,
        vectorCorner: cornerAssignments[i % 4],
        lokey: r.lokey,
        hikey: r.hikey,
        pitch_keycenter: r.pitch_keycenter,
        lovel: r.lovel,
        hivel: r.hivel,
        offsetSamples: r.offsetSamples,
        endSamples: r.endSamples,
        tuneCents: r.tune,
        volumeDb: r.volume,
        panPercent: r.pan,
        direction: r.direction,
        loop_mode: r.loop_mode,
        normalizedGainDb: r.normalizedGainDb
      };
    });
  }, [regions]);

  const samplerGlobal: SamplerGlobalSpec = useMemo(() => {
    return {
      instrumentName,
      defaultPath: globalConfig.default_path,
      attackSec: globalConfig.ampeg_attack,
      decaySec: globalConfig.ampeg_decay,
      sustainRatio: globalConfig.ampeg_sustain,
      releaseSec: globalConfig.ampeg_release,
      cutoffHz: globalConfig.cutoff,
      resonanceQ: globalConfig.resonance,
      masterVolumeDb: globalConfig.master_volume,
      // Enhanced Open SFZ Opcodes
      tapeDrive: tapeDeckParams.drive,
      tapeWow: tapeDeckParams.wow,
      tapeFlutter: tapeDeckParams.flutter,
      tapeAge: tapeDeckParams.age,
      irSample: `${tapeDeckParams.irType}.wav`,
      reverbMix: tapeDeckParams.reverbMix,
      scaleFile: currentScale.id !== '12_tet' ? `${currentScale.id}.scl` : undefined,
      scaleName: currentScale.name,
      microTuneCents: microTuneCents !== 0 ? microTuneCents : undefined,
      vectorMorph: {
        padId: 'xy_1',
        x: vectorX,
        y: vectorY,
        thirdMindGenerative: thirdMindActive,
        corners: vectorCorners.map(c => ({
          pos: c.id,
          label: c.label,
          target: c.sourceType
        }))
      },
      canvasTheme: {
        theme: canvasTheme,
        reactiveTubes: true,
        oscilloscopeBeam: true
      }
    };
  }, [
    instrumentName, globalConfig, tapeDeckParams, currentScale,
    microTuneCents, vectorX, vectorY, thirdMindActive, vectorCorners, canvasTheme
  ]);

  // Generated Text based on format dropdown selection
  const generatedExportText = useMemo(() => {
    switch (exportFormat) {
      case 'kontakt':
        return generateKontaktSpec(samplerGlobal, samplerRegions);
      case 'ableton':
        return generateAbletonSamplerSpec(samplerGlobal, samplerRegions);
      case 'decent':
        return generateDecentSamplerSpec(samplerGlobal, samplerRegions);
      case 'sfz':
      default:
        return generateSfzSpec(samplerGlobal, samplerRegions);
    }
  }, [exportFormat, samplerGlobal, samplerRegions]);

  // If initial slices are passed from Cut-Up Engine, allow importing them as regions
  const handleImportCutupSlices = () => {
    if (!initialSlices || initialSlices.length === 0) return;

    const sliceRegions: SfzRegion[] = initialSlices.map((slice, idx) => ({
      id: `reg-cutup-${slice.id}-${Date.now()}`,
      name: `Cut-Up ${slice.name}`,
      groupId: 'group-2',
      sample: `cutup_slice_${idx + 1}.wav`,
      waveformType: 'sample_slice',
      lokey: 36 + idx, // C2 GM drum standard
      hikey: 36 + idx,
      pitch_keycenter: 36 + idx,
      lovel: 0,
      hivel: 127,
      tune: slice.pitchOffset * 100,
      volume: 0,
      pan: idx % 2 === 0 ? -10 : 10,
      direction: slice.reversed ? 'reverse' : 'forward',
      loop_mode: 'no_loop',
      color: REGION_PALETTE[idx % REGION_PALETTE.length]
    }));

    setRegions(prev => [...prev.filter(r => r.groupId !== 'group-2'), ...sliceRegions]);
    setSelectedGroupId('group-2');
    if (sliceRegions[0]) setSelectedRegionId(sliceRegions[0].id);
    playLaserBeamSound('laser_curve');
  };

  // Real-time SFZ Opcode text generation
  const generatedSfzText = useMemo(() => {
    return generateSfzSpec(samplerGlobal, samplerRegions);
  }, [samplerGlobal, samplerRegions]);

  // Web Audio Synth to Audition Notes in Real-Time
  const playMidiNote = (midiNote: number) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    setActiveAuditionMidi(midiNote);
    setTimeout(() => setActiveAuditionMidi(null), 250);

    // Initialize or retrieve Tape Deck DSP processor
    const tapeProc = getTapeDeckProcessor(ctx, tapeDeckParams);
    setAnalyserNode(tapeProc.analyserNode);

    // Ensure Tape Processor output connects to destination
    try {
      tapeProc.outputNode.connect(ctx.destination);
    } catch {}

    // 1. Calculate Microtonally Tuned Frequency via Scala Engine
    const baseFreq = calculateScaleFrequency(midiNote, currentScale, baseA4Hz, microTuneCents);
    const now = ctx.currentTime;

    // 2. VECTOR MORPHING MODE: Blend 4 Quadrants
    if (viewMode === 'vector_pad') {
      const wTL = (1 - vectorX) * vectorY;
      const wTR = vectorX * vectorY;
      const wBL = (1 - vectorX) * (1 - vectorY);
      const wBR = vectorX * (1 - vectorY);

      // In Third Mind mode, apply Burroughsian pitch permutation
      let thirdMindOffset = 0;
      if (thirdMindActive && Math.random() > 0.4) {
        const shifts = [-5, 7, 12, -12, 5];
        thirdMindOffset = shifts[Math.floor(Math.random() * shifts.length)];
      }
      const effectiveFreq = baseFreq * Math.pow(2, thirdMindOffset / 12);

      // Layer A: Top-Left (Sub Bass / Sample)
      if (wTL > 0.02) {
        const nodeA = synthesizeSubBass(ctx, effectiveFreq, 1.4, wTL * 0.4);
        nodeA.connect(tapeProc.inputNode);
      }

      // Layer B: Top-Right (Karplus-Strong Plucked String)
      if (wTR > 0.02) {
        const nodeB = synthesizeKarplusStrong(ctx, effectiveFreq, 1.6, wTR * 0.45);
        nodeB.connect(tapeProc.inputNode);
      }

      // Layer C: Bottom-Left (2-Op FM Sine Bell)
      if (wBL > 0.02) {
        const nodeC = synthesizeFmSine(ctx, effectiveFreq, 1.8, 2.76, 3.2, wBL * 0.38);
        nodeC.connect(tapeProc.inputNode);
      }

      // Layer D: Bottom-Right (Badalamenti Theremin Lead)
      if (wBR > 0.02) {
        const nodeD = synthesizeTheremin(ctx, effectiveFreq, 2.0, 5.6, 14, wBR * 0.35);
        nodeD.connect(tapeProc.inputNode);
      }

      playLaserBeamSound('laser_midi');
      return;
    }

    // 3. REGION / KEYBOARD AUDITION MODE
    const matchedRegion = regions.find(r => midiNote >= r.lokey && midiNote <= r.hikey) || selectedRegion;
    if (!matchedRegion) return;

    // Direct Hybrid Synthesizer generators
    if (matchedRegion.waveformType === 'theremin_lead') {
      const theremin = synthesizeTheremin(ctx, baseFreq, 1.8, 5.8, 12, 0.32);
      theremin.connect(tapeProc.inputNode);
      playLaserBeamSound('laser_midi');
      return;
    }

    if (matchedRegion.waveformType === 'interzone_bell') {
      const bell = synthesizeFmSine(ctx, baseFreq, 1.8, 2.76, 3.5, 0.35);
      bell.connect(tapeProc.inputNode);
      playLaserBeamSound('laser_midi');
      return;
    }

    if (matchedRegion.waveformType === 'sine_sub') {
      const sub = synthesizeSubBass(ctx, baseFreq, 1.5, 0.4);
      sub.connect(tapeProc.inputNode);
      playLaserBeamSound('laser_midi');
      return;
    }

    // Standard Analog Osc / Cut-up sample slice emulation
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(globalConfig.cutoff, now);
    filter.Q.setValueAtTime(globalConfig.resonance, now);

    switch (matchedRegion.waveformType) {
      case 'saw_analog':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(baseFreq, now);
        break;
      case 'pulse_juno':
        osc.type = 'square';
        osc.frequency.setValueAtTime(baseFreq, now);
        break;
      case 'triangle_flute':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq, now);
        break;
      case 'tape_noise':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(baseFreq, now);
        filter.frequency.setValueAtTime(1200, now);
        break;
      default:
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq, now);
        break;
    }

    // Envelope
    const att = Math.max(0.005, globalConfig.ampeg_attack);
    const rel = Math.max(0.05, globalConfig.ampeg_release);
    const vol = Math.pow(10, (matchedRegion.volume + globalConfig.master_volume) / 20) * 0.28;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(vol, now + att);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + att + rel + 0.1);

    // Pan
    let outNode: AudioNode = gain;
    if (ctx.createStereoPanner && matchedRegion.pan !== 0) {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(matchedRegion.pan / 100, now);
      gain.connect(panner);
      outNode = panner;
    }

    osc.connect(filter);
    filter.connect(gain);
    // Route into Tape Deck DSP processor
    outNode.connect(tapeProc.inputNode);

    osc.start(now);
    osc.stop(now + att + rel + 0.15);

    playLaserBeamSound('laser_midi');
  };

  // Piano Key Click Handler (handles audition or key assignment)
  const handleKeyClick = (midi: number) => {
    if (assignMode !== 'none' && selectedRegion) {
      if (assignMode === 'lokey') {
        updateRegion(selectedRegion.id, {
          lokey: Math.min(midi, selectedRegion.hikey),
          pitch_keycenter: Math.max(Math.min(midi, selectedRegion.hikey), selectedRegion.pitch_keycenter)
        });
        setAssignMode('none');
      } else if (assignMode === 'hikey') {
        updateRegion(selectedRegion.id, {
          hikey: Math.max(midi, selectedRegion.lokey)
        });
        setAssignMode('none');
      } else if (assignMode === 'center') {
        updateRegion(selectedRegion.id, {
          pitch_keycenter: midi
        });
        setAssignMode('none');
      }
      playLaserBeamSound('laser_curve');
      return;
    }

    playMidiNote(midi);
  };

  // Region update helper
  const updateRegion = (id: string, patch: Partial<SfzRegion>) => {
    setRegions(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  };

  // Add new region
  const handleAddRegion = () => {
    const newId = `reg-${Date.now()}`;
    const nextColor = REGION_PALETTE[regions.length % REGION_PALETTE.length];
    const newRegion: SfzRegion = {
      id: newId,
      name: `Custom Region ${regions.length + 1}`,
      groupId: selectedGroupId,
      sample: `custom_waveform_${regions.length + 1}.wav`,
      waveformType: 'saw_analog',
      lokey: 60, // C4
      hikey: 72, // C5
      pitch_keycenter: 60,
      lovel: 0,
      hivel: 127,
      tune: 0,
      volume: 0,
      pan: 0,
      direction: 'forward',
      loop_mode: 'loop_continuous',
      color: nextColor
    };
    setRegions(prev => [...prev, newRegion]);
    setSelectedRegionId(newId);
    playLaserBeamSound('laser_curve');
  };

  // Remove region
  const handleRemoveRegion = (id: string) => {
    if (regions.length <= 1) return;
    setRegions(prev => prev.filter(r => r.id !== id));
    if (selectedRegionId === id) {
      const remaining = regions.filter(r => r.id !== id);
      setSelectedRegionId(remaining[0]?.id || '');
    }
    playLaserBeamSound('laser_erase');
  };

  // Quick Auto-Spread Keyrange Actions
  const handleQuickSpread = (mode: 'gm_drums' | 'octaves' | 'full_range' | 'burroughs_split' | 'chromatic') => {
    if (mode === 'gm_drums') {
      // 1-key per region starting at C2 (36)
      setRegions(prev => prev.map((r, i) => ({
        ...r,
        lokey: 36 + i,
        hikey: 36 + i,
        pitch_keycenter: 36 + i
      })));
    } else if (mode === 'chromatic') {
      // 1-key per region starting at C3 (48)
      setRegions(prev => prev.map((r, i) => ({
        ...r,
        lokey: 48 + i,
        hikey: 48 + i,
        pitch_keycenter: 48 + i
      })));
    } else if (mode === 'octaves') {
      // Distribute regions across consecutive octaves starting at C2
      const octSpan = 12;
      setRegions(prev => prev.map((r, i) => {
        const start = 36 + (i * octSpan);
        return {
          ...r,
          lokey: start,
          hikey: start + octSpan - 1,
          pitch_keycenter: start
        };
      }));
    } else if (mode === 'full_range') {
      // Span selected region across entire keyboard
      if (selectedRegion) {
        updateRegion(selectedRegion.id, {
          lokey: 24, // C1
          hikey: 96, // C7
          pitch_keycenter: 60 // C4
        });
      }
    } else if (mode === 'burroughs_split') {
      // Permutational cutup split: Alternating keys
      setRegions(prev => prev.map((r, i) => ({
        ...r,
        lokey: 48 + (i * 6),
        hikey: 48 + ((i + 1) * 6) - 1,
        pitch_keycenter: 48 + (i * 6),
        tune: (i % 2 === 0 ? 0 : -300),
        direction: i % 2 === 0 ? 'forward' : 'reverse'
      })));
    }
    playLaserBeamSound('laser_curve');
  };

  // Export handlers
  const handleDownloadFormat = (targetFormat?: 'sfz' | 'kontakt' | 'ableton' | 'decent') => {
    const format = targetFormat || exportFormat;
    let filename = instrumentName.toLowerCase().replace(/\s+/g, '_');
    let mimeType = 'text/plain';

    if (format === 'sfz') {
      filename += '.sfz';
    } else if (format === 'kontakt') {
      filename += '_kontakt_multisample.txt';
    } else if (format === 'ableton') {
      filename += '_sampler_preset.adv.xml';
      mimeType = 'application/xml';
    } else if (format === 'decent') {
      filename += '.dspreset';
      mimeType = 'application/xml';
    }

    let text = generatedExportText;
    if (targetFormat && targetFormat !== exportFormat) {
      if (targetFormat === 'sfz') text = generateSfzSpec(samplerGlobal, samplerRegions);
      else if (targetFormat === 'kontakt') text = generateKontaktSpec(samplerGlobal, samplerRegions);
      else if (targetFormat === 'ableton') text = generateAbletonSamplerSpec(samplerGlobal, samplerRegions);
      else if (targetFormat === 'decent') text = generateDecentSamplerSpec(samplerGlobal, samplerRegions);
    }

    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    playLaserBeamSound('laser_audio');
  };

  const handleDownloadAllFormats = () => {
    const bundleName = `${instrumentName.toLowerCase().replace(/\s+/g, '_')}_multi_format_bundle.txt`;
    const sfz = generateSfzSpec(samplerGlobal, samplerRegions);
    const kontakt = generateKontaktSpec(samplerGlobal, samplerRegions);
    const ableton = generateAbletonSamplerSpec(samplerGlobal, samplerRegions);
    const decent = generateDecentSamplerSpec(samplerGlobal, samplerRegions);

    const manifest = {
      instrument: instrumentName,
      created: new Date().toISOString(),
      formats: ['Open SFZ v2 (.sfz)', 'Native Instruments Kontakt (.txt / .ksp)', 'Ableton Live Sampler (.adv/.xml)', 'Decent Sampler (.dspreset)'],
      totalMappedZones: regions.length,
      samplePath: globalConfig.default_path
    };

    const combined = `// ====================================================================\n` +
      `// STRANGELET LAB // UNIVERSAL MULTI-FORMAT INSTRUMENT BUNDLE\n` +
      `// Instrument: ${instrumentName}\n` +
      `// ====================================================================\n\n` +
      `/* MANIFEST */\n${JSON.stringify(manifest, null, 2)}\n\n` +
      `/* --------------------------------------------------------------------\n` +
      `   FORMAT 1: OPEN-SOURCE SFZ v2 SPECIFICATION (.sfz)\n` +
      `   -------------------------------------------------------------------- */\n` +
      `${sfz}\n\n` +
      `/* --------------------------------------------------------------------\n` +
      `   FORMAT 2: NATIVE INSTRUMENTS KONTAKT MAPPING & KSP SCRIPT (.txt)\n` +
      `   -------------------------------------------------------------------- */\n` +
      `${kontakt}\n\n` +
      `/* --------------------------------------------------------------------\n` +
      `   FORMAT 3: ABLETON LIVE SAMPLER DEVICE XML PRESET (.adv / .xml)\n` +
      `   -------------------------------------------------------------------- */\n` +
      `${ableton}\n\n` +
      `/* --------------------------------------------------------------------\n` +
      `   FORMAT 4: DECENT SAMPLER PRESET (.dspreset)\n` +
      `   -------------------------------------------------------------------- */\n` +
      `${decent}\n`;

    const blob = new Blob([combined], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = bundleName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    playLaserBeamSound('laser_audio');
  };

  const handleDownloadSfz = () => {
    handleDownloadFormat();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedExportText);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    playLaserBeamSound('laser_select');
  };

  const handleMountToTimeline = () => {
    if (!onMountTrack) return;
    const newTrack: Track = {
      id: `sfz-track-${Date.now()}`,
      name: `${instrumentName}`,
      type: 'midi',
      volume: 0.85,
      pan: 0,
      muted: false,
      soloed: false,
      color: '#00F0FF',
      phaseInverted: false,
      isMono: false,
      vstBypassed: false,
      clips: [
        {
          id: `clip-sfz-${Date.now()}`,
          name: `${instrumentName} SFZ Zone Clip`,
          startBar: 0,
          durationBars: 4,
          isMidi: true,
          waveformSnippet: [0.4, 0.7, 0.9, 0.5, 0.8, 0.3, 0.9, 0.6]
        }
      ]
    };
    onMountTrack(newTrack);
    playLaserBeamSound('laser_curve');
  };

  // Generate piano keys for visible range (4 octaves = 48 keys)
  const keyboardKeys = useMemo(() => {
    const keys: { midi: number; isBlack: boolean; name: string }[] = [];
    const startMidi = keyboardStartOctave * 12 + 12; // e.g. Oct 2 = C2 (36)
    const numKeys = 48; // 4 octaves

    for (let i = 0; i < numKeys; i++) {
      const midi = startMidi + i;
      const noteInOct = midi % 12;
      const isBlack = [1, 3, 6, 8, 10].includes(noteInOct);
      keys.push({
        midi,
        isBlack,
        name: midiToNoteName(midi)
      });
    }
    return keys;
  }, [keyboardStartOctave]);

  return (
    <div className="flex flex-col space-y-6 font-mono text-[#E2E8F0]">
      {/* Top Header & Summary Bar */}
      <div className="p-4 bg-[#0A0D16] border border-[#1E293B] rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#00F0FF]/10 border border-[#00F0FF]/40 flex items-center justify-center text-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.25)]">
            <FileCode size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-white tracking-wide">
                SFZ DEFINITION BUILDER
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                SFZ v2 OPEN STANDARD
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-500/30">
                REAL-TIME KEYRANGE
              </span>
            </div>
            <p className="text-xs text-[#94A3B8]">
              Visual block hierarchy mapping custom waveforms & cutup slices to MIDI note ranges with zero latency.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {initialSlices && initialSlices.length > 0 && (
            <button
              onClick={handleImportCutupSlices}
              className="px-3 py-1.5 rounded-lg bg-[#162035] hover:bg-[#1E2E4A] border border-[#00F0FF]/40 text-[#00F0FF] text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              title="Import current 16 slices from Cut-Up Engine as mapped SFZ regions"
            >
              <Radio size={14} className="text-[#00F0FF]" />
              IMPORT CUT-UP ENGINE SLICES
            </button>
          )}

          <div className="flex flex-wrap items-center bg-[#07090F] border border-[#1E293B] rounded-lg p-1 gap-1">
            <button
              onClick={() => setViewMode('mapping')}
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                viewMode === 'mapping' ? 'bg-[#00F0FF] text-black shadow-sm' : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              VISUAL MAPPER
            </button>
            <button
              onClick={() => setViewMode('waveform')}
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                viewMode === 'waveform' ? 'bg-[#A855F7] text-white shadow-sm' : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              WAVEFORM & TRIMMER
            </button>
            <button
              onClick={() => setViewMode('vector_pad')}
              className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                viewMode === 'vector_pad' ? 'bg-[#38BDF8] text-black shadow-sm' : 'text-[#38BDF8]/80 hover:text-[#38BDF8]'
              }`}
            >
              <Compass size={13} />
              VECTOR MORPH & HYBRIDS
            </button>
            <button
              onClick={() => setViewMode('tape_deck')}
              className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                viewMode === 'tape_deck' ? 'bg-[#F59E0B] text-black shadow-sm' : 'text-[#F59E0B]/80 hover:text-[#F59E0B]'
              }`}
            >
              <Disc size={13} />
              TAPE DECK & CRT TUBES
            </button>
            <button
              onClick={() => setViewMode('microtuning')}
              className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                viewMode === 'microtuning' ? 'bg-[#10B981] text-black shadow-sm' : 'text-[#10B981]/80 hover:text-[#10B981]'
              }`}
            >
              <Scale size={13} />
              MICRO-TUNING & SCALA
            </button>
            <button
              onClick={() => setViewMode('hierarchy')}
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                viewMode === 'hierarchy' ? 'bg-[#FFD700] text-black shadow-sm' : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              OPCODES HIERARCHY
            </button>
            <button
              onClick={() => setViewMode('exporter')}
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                viewMode === 'exporter' ? 'bg-[#EC4899] text-white shadow-sm' : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              FORMAT EXPORTER
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: Visual Keyrange Mapping Utility */}
      {viewMode === 'mapping' && (
        <VisualMappingUtility
          regions={regions}
          selectedRegionId={selectedRegionId}
          onSelectRegion={setSelectedRegionId}
          onUpdateRegion={updateRegion}
          onAddRegionFromSample={handleAddRegionFromSample}
          onQuickSpread={handleQuickSpread}
          cutupSlices={initialSlices}
          keyboardStartOctave={keyboardStartOctave}
          onChangeOctave={setKeyboardStartOctave}
          activeAuditionMidi={activeAuditionMidi}
          onAuditionKey={playMidiNote}
          assignMode={assignMode}
          onSetAssignMode={setAssignMode}
        />
      )}

      {/* VIEW 2: Dedicated Waveform View & Non-Destructive Buffer Trimming */}
      {viewMode === 'waveform' && (
        <div className="bg-[#0A0D16] border border-[#1E293B] rounded-xl p-5 flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1E293B]">
            <div className="flex items-center gap-2">
              <Scissors size={18} className="text-[#00F0FF]" />
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  SAMPLE WAVEFORM INSPECTOR & NON-DESTRUCTIVE AUDIO BUFFER TOOLS
                </h4>
                <p className="text-[11px] text-[#94A3B8]">
                  Trimming offsets directly generate SFZ <code>offset</code> / <code>end</code> opcodes; normalization sets buffer peak and non-destructive <code>volume</code>.
                </p>
              </div>
            </div>

            {/* Region Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#64748B]">ACTIVE ZONE:</span>
              <select
                value={selectedRegion?.id || ''}
                onChange={(e) => setSelectedRegionId(e.target.value)}
                className="px-3 py-1.5 bg-[#060810] border border-[#1E293B] rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#00F0FF]"
              >
                {regions.map((r, i) => (
                  <option key={r.id} value={r.id}>
                    Zone {i + 1}: {r.name} ({r.sample})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedRegion && (
            <WaveformTrimmer
              sampleName={selectedRegion.sample}
              samplePath={`${globalConfig.default_path}/${selectedRegion.sample}`}
              offsetSamples={selectedRegion.offsetSamples || 0}
              endSamples={selectedRegion.endSamples || 44100}
              totalSamples={44100}
              normalizedGainDb={selectedRegion.normalizedGainDb || 0}
              direction={selectedRegion.direction}
              onUpdateTrim={handleUpdateTrim}
              onUpdateNormalization={handleUpdateNormalization}
              height={230}
            />
          )}
        </div>
      )}

      {/* VIEW: 4-Way Vector Morphing Pad & Hybrid Synths */}
      {viewMode === 'vector_pad' && (
        <VectorMorphPad
          x={vectorX}
          y={vectorY}
          onChangePosition={(newX, newY) => {
            setVectorX(newX);
            setVectorY(newY);
          }}
          corners={vectorCorners}
          onChangeCornerSource={handleChangeCornerSource}
          thirdMindActive={thirdMindActive}
          onToggleThirdMind={() => setThirdMindActive(prev => !prev)}
          onAuditionMorph={() => playMidiNote(60)}
          filterCutoffHz={globalConfig.cutoff}
        />
      )}

      {/* VIEW: The Tape Deck Vintage Macro Panel & Canvas Tubes */}
      {viewMode === 'tape_deck' && (
        <TapeDeckMacroPanel
          params={tapeDeckParams}
          onChangeParams={handleUpdateTapeParams}
          analyserNode={analyserNode}
          canvasTheme={canvasTheme}
          onChangeCanvasTheme={setCanvasTheme}
          onAuditionTape={() => playMidiNote(60)}
        />
      )}

      {/* VIEW: Algorithmic Micro-Tuning & Scala (.scl) */}
      {viewMode === 'microtuning' && (
        <MicroTuningPanel
          currentScale={currentScale}
          onSelectScale={setCurrentScale}
          baseA4Hz={baseA4Hz}
          onChangeBaseA4Hz={setBaseA4Hz}
          microTuneCents={microTuneCents}
          onChangeMicroTuneCents={setMicroTuneCents}
          onAuditionScaleDegree={(idx, freq) => {
            // Find MIDI note nearest to degree or play middle octave
            const midiBase = 60 + idx;
            playMidiNote(midiBase);
          }}
        />
      )}

      {/* VIEW 3: SFZ Visual Hierarchy vs. Inspector */}
      {viewMode === 'hierarchy' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: SFZ Architectural Blocks (<control>, <global>, <group>, <region>) */}
          <div className="lg:col-span-2 space-y-5">
            {/* Block 1: <control> & <global> Master Envelope / Filter Block */}
            <div className="bg-[#0A0D16] border border-[#1E293B] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#00F0FF]" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    &lt;global&gt; MASTER ENVELOPE & FILTER CONTROL
                  </h4>
                </div>
                <span className="text-[10px] text-[#64748B] font-mono">
                  DEFAULT_PATH = {globalConfig.default_path}
                </span>
              </div>

              {/* Sliders: Attack, Decay, Sustain, Release, Cutoff, Resonance */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="flex justify-between text-[10px] text-[#64748B] mb-1">
                    <span>ATTACK</span>
                    <span className="text-[#00F0FF]">{(globalConfig.ampeg_attack * 1000).toFixed(0)} ms</span>
                  </label>
                  <input
                    type="range"
                    min={0.001}
                    max={0.5}
                    step={0.005}
                    value={globalConfig.ampeg_attack}
                    onChange={(e) => setGlobalConfig({ ...globalConfig, ampeg_attack: Number(e.target.value) })}
                    className="w-full accent-[#00F0FF]"
                  />
                </div>

                <div>
                  <label className="flex justify-between text-[10px] text-[#64748B] mb-1">
                    <span>RELEASE</span>
                    <span className="text-[#00F0FF]">{(globalConfig.ampeg_release * 1000).toFixed(0)} ms</span>
                  </label>
                  <input
                    type="range"
                    min={0.05}
                    max={3.0}
                    step={0.05}
                    value={globalConfig.ampeg_release}
                    onChange={(e) => setGlobalConfig({ ...globalConfig, ampeg_release: Number(e.target.value) })}
                    className="w-full accent-[#00F0FF]"
                  />
                </div>

                <div>
                  <label className="flex justify-between text-[10px] text-[#64748B] mb-1">
                    <span>CUTOFF</span>
                    <span className="text-[#FFD700]">{globalConfig.cutoff} Hz</span>
                  </label>
                  <input
                    type="range"
                    min={200}
                    max={18000}
                    step={100}
                    value={globalConfig.cutoff}
                    onChange={(e) => setGlobalConfig({ ...globalConfig, cutoff: Number(e.target.value) })}
                    className="w-full accent-[#FFD700]"
                  />
                </div>

                <div>
                  <label className="flex justify-between text-[10px] text-[#64748B] mb-1">
                    <span>RESONANCE</span>
                    <span className="text-[#FFD700]">{globalConfig.resonance.toFixed(1)} Q</span>
                  </label>
                  <input
                    type="range"
                    min={0.5}
                    max={8.0}
                    step={0.1}
                    value={globalConfig.resonance}
                    onChange={(e) => setGlobalConfig({ ...globalConfig, resonance: Number(e.target.value) })}
                    className="w-full accent-[#FFD700]"
                  />
                </div>

                <div>
                  <label className="flex justify-between text-[10px] text-[#64748B] mb-1">
                    <span>SUSTAIN</span>
                    <span className="text-[#10B981]">{(globalConfig.ampeg_sustain * 100).toFixed(0)}%</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={globalConfig.ampeg_sustain}
                    onChange={(e) => setGlobalConfig({ ...globalConfig, ampeg_sustain: Number(e.target.value) })}
                    className="w-full accent-[#10B981]"
                  />
                </div>

                <div>
                  <label className="flex justify-between text-[10px] text-[#64748B] mb-1">
                    <span>MASTER VOL</span>
                    <span className="text-white">{globalConfig.master_volume.toFixed(1)} dB</span>
                  </label>
                  <input
                    type="range"
                    min={-18}
                    max={6}
                    step={0.5}
                    value={globalConfig.master_volume}
                    onChange={(e) => setGlobalConfig({ ...globalConfig, master_volume: Number(e.target.value) })}
                    className="w-full accent-white"
                  />
                </div>
              </div>
            </div>

            {/* Block 2: <group> & <region> Hierarchy Cards */}
            <div className="bg-[#0A0D16] border border-[#1E293B] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-[#A855F7]" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    &lt;region&gt; MAPPING CARDS ({regions.length} ACTIVE ZONES)
                  </h4>
                </div>

                <button
                  onClick={handleAddRegion}
                  className="px-3 py-1.5 rounded-lg bg-[#00F0FF] hover:bg-[#00D0DF] text-black text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(0,240,255,0.3)]"
                >
                  <Plus size={14} />
                  ADD REGION
                </button>
              </div>

              {/* List of Regions in current group */}
              <div className="space-y-3">
                {regions.map((reg, idx) => {
                  const isSelected = selectedRegionId === reg.id;
                  return (
                    <div
                      key={reg.id}
                      onClick={() => setSelectedRegionId(reg.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-3 ${
                        isSelected
                          ? 'bg-[#101726] border-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                          : 'bg-[#060810] border-[#1E293B] hover:border-[#334155]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: reg.color }}
                          />
                          <span className="text-xs font-bold text-white">
                            ZONE {idx + 1}: {reg.name}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#162035] text-[#00F0FF] font-mono border border-[#00F0FF]/30">
                            sample={reg.sample}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              playMidiNote(reg.pitch_keycenter);
                            }}
                            className="px-2 py-1 rounded bg-[#162035] hover:bg-[#1E2E4A] text-[#00F0FF] text-[10px] flex items-center gap-1"
                            title="Audition root note"
                          >
                            <Play size={10} />
                            TEST NOTE
                          </button>

                          {regions.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveRegion(reg.id);
                              }}
                              className="p-1 rounded text-[#64748B] hover:text-red-400 hover:bg-red-950/40"
                              title="Delete region"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Opcode Badges Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                        <div className="p-2 bg-[#030408] rounded border border-[#1E293B] flex flex-col">
                          <span className="text-[9px] text-[#64748B]">KEYRANGE (lokey - hikey)</span>
                          <span className="text-[#00F0FF] font-bold">
                            {reg.lokey} &rarr; {reg.hikey} [{midiToNoteName(reg.lokey)} - {midiToNoteName(reg.hikey)}]
                          </span>
                        </div>

                        <div className="p-2 bg-[#030408] rounded border border-[#1E293B] flex flex-col">
                          <span className="text-[9px] text-[#64748B]">ROOT (pitch_keycenter)</span>
                          <span className="text-[#FFD700] font-bold">
                            {reg.pitch_keycenter} [{midiToNoteName(reg.pitch_keycenter)}]
                          </span>
                        </div>

                        <div className="p-2 bg-[#030408] rounded border border-[#1E293B] flex flex-col">
                          <span className="text-[9px] text-[#64748B]">WAVEFORM / SOURCE</span>
                          <span className="text-white truncate">
                            {reg.waveformType.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>

                        <div className="p-2 bg-[#030408] rounded border border-[#1E293B] flex flex-col">
                          <span className="text-[9px] text-[#64748B]">TUNE & PAN</span>
                          <span className="text-[#10B981]">
                            {reg.tune >= 0 ? `+${reg.tune}` : reg.tune}c &bull; {reg.pan}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Selected Region Opcode Editor */}
          {selectedRegion && (
            <div className="bg-[#0A0D16] border border-[#1E293B] rounded-xl p-5 flex flex-col justify-between gap-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
                  <div className="flex items-center gap-2">
                    <Sliders size={16} className="text-[#00F0FF]" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      REGION PARAMETER INSPECTOR
                    </h4>
                  </div>
                  <span className="text-[10px] text-[#00F0FF] font-mono">
                    ID: {selectedRegion.id}
                  </span>
                </div>

                {/* Region Name & Sample Path */}
                <div className="space-y-2">
                  <label className="block text-[10px] text-[#64748B]">
                    REGION LABEL
                  </label>
                  <input
                    type="text"
                    value={selectedRegion.name}
                    onChange={(e) => updateRegion(selectedRegion.id, { name: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#060810] border border-[#1E293B] rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>

                {/* Waveform Selector */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-[#64748B]">
                    SYNTHESIS WAVEFORM OR CUT-UP SAMPLE
                  </label>
                  <select
                    value={selectedRegion.waveformType}
                    onChange={(e) => {
                      const wType = e.target.value as WaveformType;
                      updateRegion(selectedRegion.id, {
                        waveformType: wType,
                        sample: wType === 'sample_slice' ? 'cutup_slice_1.wav' : `${wType}_c${Math.floor(selectedRegion.pitch_keycenter / 12) - 1}.wav`
                      });
                    }}
                    className="w-full px-3 py-1.5 bg-[#060810] border border-[#1E293B] rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#00F0FF]"
                  >
                    <option value="sine_sub">Analog Sub Sine Wave (Pure Deep Bass)</option>
                    <option value="saw_analog">Minimoog Sawtooth (Buzzy Lead / Chords)</option>
                    <option value="pulse_juno">Juno Pulse / Square Wave (80s Brass / Bass)</option>
                    <option value="triangle_flute">Triangle Flute (Warm Hollow Melodies)</option>
                    <option value="theremin_lead">Badalamenti Theremin (Surreal Sine Vibrato)</option>
                    <option value="interzone_bell">Interzone FM Glass Bell (Chime Harmonic)</option>
                    <option value="tape_noise">Ampex 1962 Tape Oxide Noise</option>
                    <option value="sample_slice">Cut-Up Engine Sliced Transient</option>
                    <option value="custom_wav">Custom User WAV Sample</option>
                  </select>
                </div>

                {/* Sample Filename Input */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-[#64748B]">
                    SFZ SAMPLE OPOCDE (sample=...)
                  </label>
                  <input
                    type="text"
                    value={selectedRegion.sample}
                    onChange={(e) => updateRegion(selectedRegion.id, { sample: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#060810] border border-[#1E293B] rounded-lg text-emerald-400 font-mono text-xs focus:outline-none focus:border-[#10B981]"
                  />
                </div>

                {/* Non-Destructive Audio Buffer Waveform Trimmer */}
                <div className="pt-2 border-t border-[#1E293B]">
                  <WaveformTrimmer
                    sampleName={selectedRegion.sample}
                    samplePath={`${globalConfig.default_path}/${selectedRegion.sample}`}
                    offsetSamples={selectedRegion.offsetSamples || 0}
                    endSamples={selectedRegion.endSamples || 44100}
                    totalSamples={44100}
                    normalizedGainDb={selectedRegion.normalizedGainDb || 0}
                    direction={selectedRegion.direction}
                    onUpdateTrim={handleUpdateTrim}
                    onUpdateNormalization={handleUpdateNormalization}
                    height={115}
                  />
                </div>

                {/* Keyrange Sliders: Lokey, Hikey, Center */}
                <div className="space-y-3 pt-2">
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-[#64748B]">LOW KEY (lokey)</span>
                      <span className="text-[#00F0FF] font-bold">
                        {selectedRegion.lokey} ({midiToNoteName(selectedRegion.lokey)})
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={127}
                      value={selectedRegion.lokey}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        updateRegion(selectedRegion.id, {
                          lokey: Math.min(val, selectedRegion.hikey),
                          pitch_keycenter: Math.max(Math.min(val, selectedRegion.hikey), selectedRegion.pitch_keycenter)
                        });
                      }}
                      className="w-full accent-[#00F0FF]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-[#64748B]">HIGH KEY (hikey)</span>
                      <span className="text-[#00F0FF] font-bold">
                        {selectedRegion.hikey} ({midiToNoteName(selectedRegion.hikey)})
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={127}
                      value={selectedRegion.hikey}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        updateRegion(selectedRegion.id, {
                          hikey: Math.max(val, selectedRegion.lokey)
                        });
                      }}
                      className="w-full accent-[#00F0FF]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-[#64748B]">ROOT CENTER (pitch_keycenter)</span>
                      <span className="text-[#FFD700] font-bold">
                        {selectedRegion.pitch_keycenter} ({midiToNoteName(selectedRegion.pitch_keycenter)})
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={127}
                      value={selectedRegion.pitch_keycenter}
                      onChange={(e) => updateRegion(selectedRegion.id, { pitch_keycenter: Number(e.target.value) })}
                      className="w-full accent-[#FFD700]"
                    />
                  </div>
                </div>

                {/* Fine Tune & Panning */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="flex justify-between text-[10px] text-[#64748B] mb-1">
                      <span>TUNE (Cents)</span>
                      <span className="text-white">{selectedRegion.tune}c</span>
                    </label>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      value={selectedRegion.tune}
                      onChange={(e) => updateRegion(selectedRegion.id, { tune: Number(e.target.value) })}
                      className="w-full accent-white"
                    />
                  </div>

                  <div>
                    <label className="flex justify-between text-[10px] text-[#64748B] mb-1">
                      <span>PAN</span>
                      <span className="text-white">{selectedRegion.pan}%</span>
                    </label>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      value={selectedRegion.pan}
                      onChange={(e) => updateRegion(selectedRegion.id, { pan: Number(e.target.value) })}
                      className="w-full accent-white"
                    />
                  </div>
                </div>

                {/* Direction & Loop Mode */}
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div>
                    <label className="block text-[9px] text-[#64748B] mb-1">
                      DIRECTION
                    </label>
                    <select
                      value={selectedRegion.direction}
                      onChange={(e) => updateRegion(selectedRegion.id, { direction: e.target.value as any })}
                      className="w-full px-2 py-1 bg-[#060810] border border-[#1E293B] rounded text-white text-[10px]"
                    >
                      <option value="forward">Forward</option>
                      <option value="reverse">Reverse (Lynchian)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] text-[#64748B] mb-1">
                      LOOP MODE
                    </label>
                    <select
                      value={selectedRegion.loop_mode}
                      onChange={(e) => updateRegion(selectedRegion.id, { loop_mode: e.target.value as any })}
                      className="w-full px-2 py-1 bg-[#060810] border border-[#1E293B] rounded text-white text-[10px]"
                    >
                      <option value="no_loop">No Loop (One-shot)</option>
                      <option value="loop_continuous">Loop Continuous</option>
                      <option value="loop_sustain">Loop Sustain</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-4 border-t border-[#1E293B]">
                <button
                  onClick={handleMountToTimeline}
                  className="w-full py-2.5 rounded-lg bg-[#FFD700] hover:bg-[#FFC700] text-black font-extrabold text-xs tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,215,0,0.3)] transition-all"
                >
                  <Plus size={15} />
                  MOUNT SFZ TO TIMELINE TRACK
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadSfz}
                    className="flex-1 py-2 rounded-lg bg-[#14261D] hover:bg-[#1C3829] text-[#10B981] border border-[#10B981]/50 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Download size={14} />
                    EXPORT .SFZ
                  </button>

                  <button
                    onClick={handleCopyCode}
                    className="flex-1 py-2 rounded-lg bg-[#152438] hover:bg-[#1E334E] text-[#00F0FF] border border-[#00F0FF]/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                    {copiedCode ? 'COPIED!' : 'COPY CODE'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: Multi-DAW & Open Source Format Exporter */}
      {viewMode === 'exporter' && (
        <div className="bg-[#0A0D16] border border-[#1E293B] rounded-xl p-5 flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
            <div className="flex items-center gap-2.5">
              <FileCode size={20} className="text-[#10B981]" />
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  UNIVERSAL SAMPLER FORMAT EXPORTER
                </h4>
                <p className="text-xs text-[#94A3B8]">
                  Export open-source SFZ v2, Decent Sampler, Kontakt KSP, or Ableton Live Sampler specs with 100% keyrange and trimming parity.
                </p>
              </div>
            </div>

            {/* Format Dropdown Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#64748B]">TARGET SAMPLER FORMAT:</span>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'sfz' | 'kontakt' | 'ableton' | 'decent')}
                className="px-3 py-1.5 bg-[#060810] border border-[#10B981]/50 rounded-lg text-[#10B981] font-mono text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#10B981]"
              >
                <option value="sfz">Open-Source SFZ v2 (.sfz) [Standard]</option>
                <option value="kontakt">Native Instruments Kontakt (.txt / .ksp) [Multisample]</option>
                <option value="ableton">Ableton Live Sampler (.adv / .xml) [XML Device]</option>
                <option value="decent">Decent Sampler Preset (.dspreset) [XML UI Engine]</option>
              </select>
            </div>
          </div>

          {/* Format Metadata & Compatibility Badge */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-[#060810] rounded-lg border border-[#1E293B] text-xs">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#64748B]">SELECTED ENGINE:</span>
              <span className="font-bold text-white uppercase">
                {exportFormat === 'sfz' && 'SFZ Format v2.0 (Open Source)'}
                {exportFormat === 'kontakt' && 'NI Kontakt Multisample Map & KSP'}
                {exportFormat === 'ableton' && 'Ableton Live Sampler / Simpler XML'}
                {exportFormat === 'decent' && 'Decent Sampler .dspreset Engine'}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#64748B]">OUTPUT EXTENSION:</span>
              <span className="font-mono text-[#00F0FF] font-bold">
                {exportFormat === 'sfz' && '.sfz'}
                {exportFormat === 'kontakt' && '.txt / .ksp'}
                {exportFormat === 'ableton' && '.adv / .xml'}
                {exportFormat === 'decent' && '.dspreset'}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#64748B]">COMPATIBLE PLAYERS:</span>
              <span className="text-[#94A3B8]">
                {exportFormat === 'sfz' && 'Sforzando, LinuxSampler, Carla, Decent'}
                {exportFormat === 'kontakt' && 'Native Instruments Kontakt 5 / 6 / 7'}
                {exportFormat === 'ableton' && 'Ableton Live 10 / 11 / 12 Suite'}
                {exportFormat === 'decent' && 'Decent Sampler (macOS, Win, Linux, iOS)'}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#64748B]">ACTIVE ZONES EXPORTED:</span>
              <span className="text-emerald-400 font-bold">
                {regions.length} Keyranges & Trims Defined
              </span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleDownloadFormat(exportFormat)}
                className="px-3.5 py-1.5 bg-[#14261D] hover:bg-[#1C3829] text-[#10B981] rounded-lg text-xs font-bold border border-[#10B981]/50 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Download size={14} />
                DOWNLOAD {exportFormat.toUpperCase()} PRESET
              </button>
              <button
                onClick={handleDownloadAllFormats}
                className="px-3.5 py-1.5 bg-[#1C1835] hover:bg-[#2A2350] text-[#A855F7] rounded-lg text-xs font-bold border border-[#A855F7]/40 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Download size={14} />
                DOWNLOAD ALL 4 FORMATS BUNDLE
              </button>
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-[#152438] hover:bg-[#1E334E] text-[#00F0FF] rounded-lg text-xs font-bold border border-[#00F0FF]/30 transition-all flex items-center gap-1.5"
              >
                {copiedCode ? <Check size={13} /> : <Copy size={13} />}
                {copiedCode ? 'COPIED TO CLIPBOARD' : `COPY ${exportFormat.toUpperCase()} SPEC`}
              </button>
            </div>

            <button
              onClick={handleMountToTimeline}
              className="px-3 py-1.5 bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 text-[#00F0FF] border border-[#00F0FF]/40 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Share2 size={13} />
              MOUNT TO TIMELINE TRACK
            </button>
          </div>

          {/* Code Mirror / Monospace Display */}
          <div className="relative rounded-lg overflow-hidden border border-[#1E293B] bg-[#030408]">
            <pre className="p-4 text-[#10B981] font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre select-text max-h-[480px]">
              {generatedExportText}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default SfzDefinitionBuilder;
