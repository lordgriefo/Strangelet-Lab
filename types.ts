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
  BEAM_SPLITTER = 'BEAM_SPLITTER',
  ACESTEP_LOOP_DESIGNER = 'ACESTEP_LOOP_DESIGNER',
  FAUST_DSP_LAB = 'FAUST_DSP_LAB',
  MIDI_EDITOR = 'MIDI_EDITOR'
}

export interface LoopRange {
  startBar: number;
  endBar: number;
  enabled: boolean;
}

export interface MidiNoteEvent {
  id: string;
  pitch: number; // 0-127 (e.g. 60 = C4)
  noteName: string; // e.g. "C4", "A3", "F#2"
  startBar: number; // position relative to clip
  startTimeSeconds: number;
  durationBars: number;
  durationSeconds: number;
  velocity: number; // 0-127
  confidence: number; // 0.0 - 1.0 (Basic Pitch salience)
  pitchBend?: number[]; // pitch bend deviations
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
  midiNotes?: MidiNoteEvent[];
  instrument?: string;
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

export interface MidiTrackConfig {
  humanizeEnabled?: boolean;
  humanizeAmount?: number; // 0.05 to 0.5 (e.g. 0.18 = ±18% velocity jitter)
  velocityOffset?: number; // -32 to +32
  timingJitterMs?: number; // subtle timing humanize (0 to 15ms)
  octaveShift?: number; // -2 to +2
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
  instrument?: string; // e.g. 'SFZ Grand Piano', 'TB-303 Acid Synth', 'Rhodes Mark I', 'Faust Karplus Guitar'
  sends?: TrackSend[];
  automation?: TrackAutomation;
  isArmedForRecord?: boolean;
  inputLevel?: number; // 0 to 1 for live meter
  midiConfig?: MidiTrackConfig;
  humanizeEnabled?: boolean;
  humanizeAmount?: number;
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
  collisionEnergy?: number;
  massConstant?: number;
  velocityConstant?: number;
  gravityConstant?: number;
}

export interface SavedCollision {
  id: string;
  name: string;
  timestamp: number;
  mode: 'sonic' | 'lyrics';
  collisionEnergy: number; // in TeV (0.5 to 14.0)
  massConstant: number;
  velocityConstant: number;
  gravityConstant: number;
  category: string;
  presetId?: string;
  presetName?: string;
  chips?: ColliderChip[];
  themeA?: string;
  themeB?: string;
  promptResult?: PromptOutputResult;
  lyricResult?: LyricLabOutput;
  tags?: string[];
  notes?: string;
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

// KOBOLDCPP & QUINN (GHOST IN THE MACHINE) TYPES
export type AiEngineType = 'koboldcpp' | 'gemini' | 'simulated';

export interface KoboldSettings {
  engine: AiEngineType;
  endpointUrl: string; // e.g. "http://localhost:5001"
  modelName: string; // e.g. "Llama 3.1 8B (Studio Buddy GGUF)" or "Quinn 3.7 (Qwen-2.5 GGUF)"
  temperature: number; // 0.1 to 1.5
  topP: number;
  maxTokens: number;
  repPenalty: number;
  vramBudgetMb: number; // e.g. 3500
  defaultPersona?: GhostPersona;
}

export type AiMixStepType = 
  | 'spectral_desheen' 
  | 'harmonic_tape_saturation' 
  | 'dynamic_bus_balance' 
  | 'particle_superposition' 
  | 'lyrical_cadence' 
  | 'transient_reconstruction';

export interface AiMixStep {
  id: string;
  name: string;
  type: AiMixStepType;
  timestamp: number;
  targetTrackId?: string;
  targetTrackName?: string;
  parameters: {
    volumeAdjustmentDb?: number; // e.g. -1.5 dB
    panAdjustment?: number; // e.g. -0.2 to +0.2
    antiSheenCutDb?: number; // e.g. -3.2 dB around 8.5kHz
    tapeWarmthPercent?: number; // 0 to 100%
    subMonoCutHz?: number; // 60 to 140 Hz
    stereoAirDb?: number; // -3 to +3 dB
    promptDirective?: string;
  };
  explanation: string;
  applied: boolean;
}

export type GhostPersona = 'quinn' | 'llama';

export interface GhostMessage {
  id: string;
  sender: 'quinn' | 'llama' | 'user' | 'system';
  persona?: GhostPersona;
  text: string;
  timestamp: number;
  actionProposal?: {
    type: 'apply_mix_step' | 'tune_collision_energy' | 'inject_particles' | 'navigate_view' | 'open_acestep_loop_designer' | 'open_faust_dsp_toy' | 'open_faust_dsp_lab' | 'open_basic_pitch';
    payload: any;
    label: string;
  };
}

// ACE-STEP 1.5 GGUF NEURAL LOOP & SONG BED TYPES
export type AceStepStemType = 'full_loop' | 'drums' | 'bass' | 'lead' | 'pad' | 'vocal_chop';

export interface AceStepGenerationConfig {
  prompt: string;
  stemType: AceStepStemType;
  durationBars: number; // 2, 4, 8, 16, 32
  bpm: number;
  keyRoot: string; // e.g. "C", "D", "E", "F", "G", "A", "B", "F#", "Eb"
  scale: 'minor' | 'major' | 'dorian' | 'phrygian';
  diffusionSteps: number; // 15 to 50
  guidanceScale: number; // 1.0 to 12.0
  seed?: number;
  useTapeWarmth?: boolean;
}

export interface AceStepLoopResult {
  id: string;
  name: string;
  prompt: string;
  stemType: AceStepStemType;
  durationBars: number;
  durationSeconds: number;
  bpm: number;
  key: string;
  audioBuffer: AudioBuffer;
  audioUrl?: string;
  waveformSnippet: number[];
  color: string;
  createdAt: number;
}

export interface AceStepSongBedConfig {
  songTitle: string;
  prompt: string;
  bpm: number;
  keyRoot: string;
  scale: 'minor' | 'major' | 'dorian' | 'phrygian';
  totalBars: 16 | 32 | 64;
  includeGuitarOverdubTrack: boolean;
  selectedStems: AceStepStemType[];
  useTapeWarmth?: boolean;
}

export interface AceStepSongBedResult {
  id: string;
  title: string;
  prompt: string;
  bpm: number;
  key: string;
  totalBars: number;
  durationSeconds: number;
  stems: AceStepLoopResult[];
  sections: {
    id: string;
    name: string;
    startBar: number;
    durationBars: number;
    color: string;
  }[];
  guitarOverdubTrackName: string;
  createdAt: number;
}

// FAUST DSP TOY & CODE GENERATOR TYPES
export interface FaustDspParam {
  id: string;
  name: string;
  type: 'slider' | 'button' | 'checkbox';
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  value: number;
  unit?: string;
}

export interface FaustDspToy {
  id: string;
  name: string;
  category: 'effect' | 'instrument' | 'toy';
  code: string; // valid Faust .dsp code
  description: string;
  author?: string;
  params: FaustDspParam[];
  color?: string;
  targetTrackId?: string;
  icon?: string;
}

// SPOTIFY BASIC PITCH NEURAL AUDIO-TO-MIDI TYPES
export interface BasicPitchModelSettings {
  onsetThreshold: number; // 0.1 to 0.9 (default: 0.5)
  frameThreshold: number; // 0.1 to 0.9 (default: 0.3)
  minNoteLengthMs: number; // e.g. 58ms
  minPitchHz: number; // e.g. 30Hz
  maxPitchHz: number; // e.g. 3000Hz
  includePitchBends: boolean;
  quantization: 'none' | '1/16' | '1/8' | '1/4' | 'triplet';
  stemTarget: 'vocals' | 'bass' | 'drums' | 'instruments' | 'full';
}

export interface BasicPitchTranscriptionResult {
  id: string;
  sourceName: string;
  stemCategory: 'vocals' | 'bass' | 'drums' | 'instruments' | 'full';
  notes: MidiNoteEvent[];
  bpm: number;
  totalBars: number;
  durationSeconds: number;
  midiDataUri?: string; // standard .mid file base64 download
  rawMidiBytes?: Uint8Array;
  keyDetected?: string;
  scaleDetected?: string;
  polyphonyPeak: number;
  recommendedInstrument: string;
}

export interface IngestedSongSource {
  id: string;
  title: string;
  artist: string;
  sourceType: 'suno_ai' | 'radio_broadcast' | 'file_upload' | 'project_track';
  durationSeconds: number;
  bpm: number;
  key: string;
  audioUrl?: string;
  audioBuffer?: AudioBuffer;
  stemsExtracted: boolean;
  description: string;
}

// GOLD PATH MASTERING CHAIN CONFIGURATION & PRESET TYPES
export interface GoldPathStageToggles {
  matchering: boolean;
  multiband: boolean;
  limiter: boolean;
  vst: boolean;
  spectralAnalysis: boolean;
  batchProcessing: boolean;
  tapeSaturation: boolean;
  stereoImager: boolean;
}

export interface GoldPathChainParameters {
  // Stage 1: Pre-EQ & Sub Filtering
  lowCutHz: number;          // 20 - 50 Hz
  highCutHz: number;         // 16000 - 22000 Hz
  deMudGainDb: number;       // -6.0 to +1.0 dB (around 350-450 Hz)
  presenceAirDb: number;     // -2.0 to +5.0 dB (around 12-16 kHz)

  // Stage 2: Matchering / Reference Harmonic Curve
  matchDepth: number;        // 0 - 100%
  referenceProfile: string;  // e.g. 'Warm 1960s Tape', 'Modern Pop Loudness', 'Analog Console Glue', 'Transparent Hi-Fi'
  smoothing: number;         // 1.0 - 5.0

  // Stage 3: Multiband Dynamics & Glue Compression
  compressionThresholdDb: number; // -24 to -6 dB
  glueRatio: number;              // 1.5 to 8.0
  releaseMs: number;              // 30 - 400 ms
  attackMs: number;               // 5 - 80 ms

  // Stage 4: Analog Tape / Tube Saturation Warmth
  tapeWarmth: number;             // 0 - 100%
  harmonicCharacter: 'tube' | 'tape' | 'transformer' | 'clean';

  // Stage 5: Stereo Imager & Width
  stereoWidth: number;            // 70% - 160%
  monoSubCutoffHz: number;        // 80 - 160 Hz (mono lock)

  // Stage 6: Brickwall Peak Limiter & Loudness Maximizer
  ceilingDb: number;              // -1.5 to -0.1 dBFS
  targetLufs: number;             // -18 to -8 LUFS
  truePeakLimit: boolean;
}

export interface GoldPathPreset {
  id: string;
  name: string;
  category: 'Factory' | 'User';
  description: string;
  author?: string;
  createdAt?: string;
  masterIntensity: number; // 0.0 - 1.0 (BigKnob value)
  stages: GoldPathStageToggles;
  parameters: GoldPathChainParameters;
}




