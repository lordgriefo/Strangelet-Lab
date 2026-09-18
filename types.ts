export enum View {
  DASHBOARD = 'DASHBOARD',
  WAVE_SPLITTER = 'WAVE_SPLITTER',
  AURA = 'AURA',
  DRUM_TRIGGER = 'DRUM_TRIGGER',
  MIXER = 'MIXER',
  MASTERING = 'MASTERING',
  SYSTEM_CORE = 'SYSTEM_CORE',
  INSTRUMENT_GENERATOR = 'INSTRUMENT_GENERATOR',
  AUDIO_EDITOR = 'AUDIO_EDITOR',
  DRUM_DESIGNER = 'DRUM_DESIGNER',
  PEDALBOARD = 'PEDALBOARD',
  SONIC_COLLIDER = 'SONIC_COLLIDER',
  BEAM_SPLITTER = 'BEAM_SPLITTER'
}

export interface LoopRange {
  startBar: number;
  endBar: number;
  enabled: boolean;
}

export interface Clip {
  id: string;
  name: string;
  startBar: number;
  durationBars: number;
  fadeInBars?: number;
  fadeOutBars?: number;
  isMidi?: boolean;
  isRecorded?: boolean;
  audioUrl?: string;
  waveformSnippet?: number[];
}

export type LaserToolType = 'laser_audio' | 'laser_midi' | 'laser_erase' | 'laser_curve' | 'laser_select';

export interface LaserBeamDefinition {
  id: LaserToolType;
  name: string;
  beamColor: string;
  glowColor: string;
  targetIcon: string;
  description: string;
}

export interface TrackSend {
  target: string;
  levelDb: number; // e.g. -6
}

export interface AutomationPoint {
  id: string;
  time: number; // 0 to 1 (across timeline duration, e.g. 16 bars)
  value: number; // volume: 0 to 1; pan: -1 to 1
  curve?: number; // tension (-1 to 1, default 0 for linear)
}

export interface AutomationLaneConfig {
  enabled: boolean;
  visible: boolean;
  points: AutomationPoint[];
}

export interface TrackAutomation {
  volume: AutomationLaneConfig;
  pan: AutomationLaneConfig;
  activeParameter?: 'volume' | 'pan';
  isExpanded?: boolean;
}

export interface Track {
  id: string;
  name: string;
  type: 'audio' | 'midi';
  volume: number; // 0 to 1
  pan: number; // -1 to 1
  muted: boolean;
  soloed: boolean;
  color: string;
  waveform?: number[];
  phaseInverted: boolean;
  isMono: boolean;
  vstBypassed: boolean;
  clips: Clip[];
  bus?: string; // e.g. 'Vocal Bus', 'Mastering Chain', 'Stereo Master'
  inputSource?: string; // e.g. 'Mic 1 (XLR)', 'Stereo Input', 'Internal Bus'
  vsts?: string[]; // list of active VST/DSP effects
  sends?: TrackSend[];
  automation?: TrackAutomation;
  isArmedForRecord?: boolean;
  inputLevel?: number; // 0 to 1 for live meter
}

export interface RoutingBus {
  id: string;
  name: string;
  color: string;
  destination: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  category: 'RECORDING' | 'MASTERING' | 'ELECTRONIC' | 'BROADCAST' | 'CUSTOM';
  description: string;
  tagline: string;
  recommendedView: View;
  defaultTempo: number;
  sampleRate: number; // 44100, 48000, 96000
  bitDepth: number; // 24, 32
  routingHighlights: string[];
  signalFlowDiagram: {
    stage: string;
    description: string;
    color: string;
  }[];
  buses: RoutingBus[];
  tracks: Track[];
}

export interface ProjectSession {
  name: string;
  templateId: string;
  templateName: string;
  bpm: number;
  sampleRate: number;
  bitDepth: number;
  createdAt?: string;
}

export interface ModelStatus {
  name: string;
  status: 'loaded' | 'unloaded' | 'loading';
  vramUsage: number; // in MB
}

export interface HardwareStats {
  vramTotal: number;
  vramUsed: number;
  gpuLoad: number;
}

// LARGE SONIC COLLIDER (LSC) TYPES
export type ChipCategory = 'genre' | 'era' | 'rhythm' | 'instrument' | 'production' | 'nuance' | 'lyric_theme' | 'poetic_meter';

export interface ColliderChip {
  id: string;
  label: string;
  category: ChipCategory;
  sidebarGroup: 'beam_a' | 'beam_b'; // beam_a = genres/eras/rhythms, beam_b = instruments/production/nuance
  color: string;
  description: string;
  energyWeight?: number; // 0.1 to 1.0 (default 0.75)
  tags?: string[];
}

export interface PromptOutputResult {
  title: string;
  promptText: string;
  styleTags: string[];
  tempoBpm?: number;
  vibeDescription: string;
  structureBlueprint: {
    section: string;
    description: string;
  }[];
  generatedAt: number;
}

export interface LyricLabOutput {
  title: string;
  concept: string;
  structure: string;
  stanzas: {
    section: string;
    lines: string[];
  }[];
  promptTags: string[];
  fullFormattedText: string;
  generatedAt: number;
}

export interface SongDeconstruction {
  referenceSong: string;
  targetTopic: string;
  analyzedDNA: {
    genre: string;
    tempo: string;
    harmonicAtmosphere: string;
    instrumentation: string[];
    productionTechniques: string[];
    lyricalCadence: string;
  };
  reimaginedPrompt: string;
  reimaginedLyrics: string;
  styleTags: string[];
  generatedAt: number;
}

export interface SunoMetaTag {
  id: string;
  tag: string; // e.g. "[Guitar Solo]"
  category: 'structure' | 'solos' | 'vocals' | 'dynamics' | 'in_lyric_styles';
  label: string;
  description: string;
  examplePrompt?: string;
  color?: string;
}

export interface SunoStyleItem {
  id: string;
  label: string;
  category: 'genre' | 'vocal' | 'instrument' | 'production' | 'tempo' | 'mood';
  promptSnippet: string;
  description: string;
}

export interface SunoMasteringSettings {
  antiSheenAmount: number; // 0 to 1 (high-shelf de-harsh 7.5k-11kHz)
  deMudAmount: number; // 0 to 1 (parametric dip 380-450Hz)
  subMonoFreq: number; // 60 to 150 Hz
  tapeWarmth: number; // 0 to 1 (analog waveshaper saturation)
  transientPunch: number; // 0 to 1 (attack transient enhancement)
  stereoAir: number; // -6 to +6 dB (12kHz+ shelf + high side widening)
  targetLufs: -14 | -9 | -7;
  outputGain: number; // dB
  bypass: boolean;
}

export interface ArchiveItem {
  id: string;
  title: string;
  type: 'sonic_sector' | 'lyric_lab' | 'deconstructor' | 'instrument_sfz' | 'suno_mastering';
  timestamp: number;
  summary: string;
  tags: string[];
  chips?: ColliderChip[];
  promptResult?: PromptOutputResult;
  lyricResult?: LyricLabOutput;
  deconstructResult?: SongDeconstruction;
  starred?: boolean;
}

// CHRONO-PIN TEMPO MAPPER & TIME ANCHOR TYPES
export interface ChronoPin {
  id: string;
  label: string; // e.g. "Downbeat (1.1)", "Bar 2.1", "Bar 5.1"
  timeSeconds: number;
  measure: number; // 1-based bar number (1, 2, 3...)
  beat: number; // 1-based beat in bar (1, 2, 3, 4)
  isDownbeat?: boolean;
  isLocked?: boolean;
  transientEnergy?: number;
}

export interface BeatmapResult {
  fileName: string;
  detectedBpm: number;
  userBpm: number;
  downbeatSeconds: number;
  barLengthSeconds: number;
  beatIntervalSeconds: number;
  totalBars: number;
  chronoPins: ChronoPin[];
  waveformPeaks: number[];
  audioBuffer?: AudioBuffer;
  audioUrl?: string;
  appliedAt?: number;
}

export interface TimelineMarker {
  id: string;
  position: number; // 0 to 1 normalized across total bars
  label: string;
  color?: string;
  isChronoPin?: boolean;
  barNumber?: number;
}

// BEAM SPLITTER & OPTICAL PRISM CHOPPER TYPES
export type PrismHitType = 'kick' | 'snare' | 'hihat' | 'clap' | 'perc' | 'slice' | 'loop';
export type PrismDivision = 'transient' | '1/1' | '1/2' | '1/4' | '1/8' | '1/16' | '1/32' | '1/8t' | '1/16t';
export type BeamSplitMode = 'loop' | 'hits' | 'stutter';

export interface PrismRay {
  id: string;
  index: number;
  label: string;
  color: string;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  startSample: number;
  endSample: number;
  hitType: PrismHitType;
  reverse?: boolean;
  pitchSemitones?: number;
  pan?: number;
  gain?: number;
  keyShortcut?: string;
  wavelengthNm?: number; // e.g. 700nm (Red) to 380nm (Violet)
}

export interface BeamSplitterResult {
  mode: 'loop' | 'hits' | 'single_ray';
  sourceName: string;
  targetTrackId?: string;
  targetStartBar: number;
  audioBuffer: AudioBuffer;
  audioUrl?: string;
  slices?: PrismRay[];
  loopRange?: {
    startSeconds: number;
    endSeconds: number;
    durationBars: number;
  };
  singleRay?: PrismRay;
}

export interface ProjectBinClip {
  id: string;
  name: string;
  hitType?: PrismHitType;
  durationSeconds: number;
  durationBars?: number;
  audioUrl?: string;
  audioBuffer?: AudioBuffer;
  color?: string;
  createdAt: number;
  sourceTrack?: string;
  keyShortcut?: string;
}


