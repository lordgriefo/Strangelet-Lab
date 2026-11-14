import { Track } from '../types';
import { getAudioContext, playLaserBeamSound, playColliderInjectionSound } from '../lib/laserSound';

export type VstFormat = 'VST3' | 'CLAP' | 'AU' | 'LV2';
export type VstCategory = 'EQ' | 'Dynamics' | 'Distortion' | 'Filter' | 'Time' | 'Spatial' | 'Utility';
export type VstDspTargetStage = 
  | 'pre_gain'        // Input Gain (-24 to +24 dB)
  | 'low_cut'         // Highpass filter (20 to 1000 Hz)
  | 'filter_type'     // Biquad filter type
  | 'filter_freq'     // Filter Cutoff (20 to 20000 Hz)
  | 'filter_q'        // Filter Resonance (0.1 to 24)
  | 'filter_gain'     // Filter Boost/Cut (-24 to +24 dB)
  | 'drive'           // Waveshaper Saturation / Overdrive (0 to 100%)
  | 'saturation_type' // 'tube' | 'tape' | 'diode' | 'foldback'
  | 'high_cut'        // Lowpass filter (1000 to 20000 Hz)
  | 'pan'             // Stereo Panner (-1.0 to +1.0)
  | 'post_gain'       // Output Gain (-24 to +24 dB)
  | 'dry_wet';        // Dry/Wet Mix (0 to 100%)

export interface VstParameterDefinition {
  id: string;
  name: string;
  targetStage: VstDspTargetStage;
  min: number;
  max: number;
  defaultValue: number;
  unit: string;
  curve?: 'linear' | 'log' | 'exp';
  description?: string;
}

export interface VstAutoMapResult {
  paramId: string;
  paramName: string;
  originalStage: VstDspTargetStage;
  mappedStage: VstDspTargetStage;
  confidence: number; // 0 to 100%
  categoryDetected: 'Gain' | 'Pan' | 'Cutoff' | 'Resonance' | 'Drive' | 'Mix' | 'Unchanged';
  reason: string;
  suggestedUnit: string;
  suggestedRange: { min: number; max: number; defaultValue: number };
}

export interface VstAutoMapReport {
  pluginId: string;
  pluginName: string;
  timestamp: number;
  totalParameters: number;
  mappedCount: number;
  details: VstAutoMapResult[];
}

export interface VstPreset {
  id: string;
  name: string;
  author?: string;
  paramValues: Record<string, number>;
}

export interface VstPluginManifest {
  id: string;
  name: string;
  version: string;
  format: VstFormat;
  category: VstCategory;
  vendor: string;
  description: string;
  faceplateTheme: 'analog_tube' | 'british_console' | 'cyberpunk_neon' | 'brushed_steel' | 'mastering_gold';
  parameters: VstParameterDefinition[];
  presets: VstPreset[];
  isCustomNonNative?: boolean;
}

export interface VstActiveInstance {
  instanceId: string;
  pluginId: string;
  trackId: string;
  name: string;
  format: VstFormat;
  bypassed: boolean;
  paramValues: Record<string, number>;
  selectedPresetId?: string;
  stateB?: Record<string, number>; // For A/B comparison
  activeState: 'A' | 'B';
}

export interface VstParamChangeEvent {
  instanceId: string;
  pluginId: string;
  pluginName: string;
  trackId: string;
  paramId: string;
  paramName: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  isBypassToggle?: boolean;
}

// Built-in Suite of Simulated Non-Native VST Plugins
export const BUILTIN_VST_MANIFESTS: VstPluginManifest[] = [
  {
    id: 'strangelet-tube-saturator-vst3',
    name: 'Strangelet Warm Tube 12AX7',
    version: '2.4.1',
    format: 'VST3',
    category: 'Distortion',
    vendor: 'Strangelet DSP Labs',
    description: 'Triode tube saturation simulator with cathode bias modeling, asymmetrical clipping and tone shaping.',
    faceplateTheme: 'analog_tube',
    parameters: [
      { id: 'drive', name: 'TUBE DRIVE', targetStage: 'drive', min: 0, max: 100, defaultValue: 42, unit: '%', curve: 'log', description: 'Sets 12AX7 grid overdrive & harmonics' },
      { id: 'pre_gain', name: 'INPUT TRIM', targetStage: 'pre_gain', min: -18, max: 18, defaultValue: 0, unit: 'dB', description: 'Pre-saturation gain calibration' },
      { id: 'tone_freq', name: 'TONE CUTOFF', targetStage: 'filter_freq', min: 800, max: 16000, defaultValue: 6500, unit: 'Hz', curve: 'log', description: 'Post-tube smoothing lowpass filter' },
      { id: 'tone_q', name: 'RES / BARK', targetStage: 'filter_q', min: 0.5, max: 6.0, defaultValue: 1.2, unit: 'Q', description: 'Resonant harmonic emphasis peak' },
      { id: 'post_gain', name: 'OUTPUT LEVEL', targetStage: 'post_gain', min: -24, max: 12, defaultValue: -2.0, unit: 'dB', description: 'Makeup gain compensation' },
      { id: 'mix', name: 'DRY / WET', targetStage: 'dry_wet', min: 0, max: 100, defaultValue: 85, unit: '%', description: 'Parallel tube blend ratio' }
    ],
    presets: [
      { id: 'p1', name: 'Vintage Vocal Warmth', paramValues: { drive: 28, pre_gain: 2, tone_freq: 9000, tone_q: 0.8, post_gain: -1.0, mix: 70 } },
      { id: 'p2', name: 'Heavy Bass Squelch', paramValues: { drive: 74, pre_gain: 4, tone_freq: 3800, tone_q: 2.8, post_gain: -4.5, mix: 95 } },
      { id: 'p3', name: 'Parallel Drum Glue', paramValues: { drive: 50, pre_gain: 0, tone_freq: 7200, tone_q: 1.0, post_gain: -2.0, mix: 50 } }
    ]
  },
  {
    id: 'british-vintage-eq-clap',
    name: 'Neve-1073 Console EQ',
    version: '1.8.0',
    format: 'CLAP',
    category: 'EQ',
    vendor: 'British Analog Foundry',
    description: 'Class-A transformer-balanced channel strip EQ with inductor mid-band and fixed 12kHz high shelf.',
    faceplateTheme: 'british_console',
    parameters: [
      { id: 'hpf', name: 'HPF (LOW CUT)', targetStage: 'low_cut', min: 20, max: 300, defaultValue: 45, unit: 'Hz', curve: 'log', description: '18dB/oct steep sub rumble filter' },
      { id: 'mid_freq', name: 'MID FREQ', targetStage: 'filter_freq', min: 360, max: 7200, defaultValue: 2400, unit: 'Hz', curve: 'log', description: 'Inductor bell mid-range target' },
      { id: 'mid_gain', name: 'MID GAIN', targetStage: 'filter_gain', min: -12, max: 12, defaultValue: 3.5, unit: 'dB', description: 'Bell boost / cut presence' },
      { id: 'mid_q', name: 'MID BANDWIDTH', targetStage: 'filter_q', min: 0.7, max: 4.5, defaultValue: 1.4, unit: 'Q', description: 'Inductor Q factor' },
      { id: 'air_lpf', name: 'AIR CUTOFF', targetStage: 'high_cut', min: 8000, max: 20000, defaultValue: 18000, unit: 'Hz', description: 'Smooth high-frequency air roll-off' },
      { id: 'post_gain', name: 'TRIM LEVEL', targetStage: 'post_gain', min: -12, max: 12, defaultValue: 0, unit: 'dB', description: 'Console channel output fader' }
    ],
    presets: [
      { id: 'p1', name: 'Snare Crack & Punch', paramValues: { hpf: 80, mid_freq: 3200, mid_gain: 4.5, mid_q: 1.8, air_lpf: 19000, post_gain: -1.5 } },
      { id: 'p2', name: 'Thick Acoustic Guitar', paramValues: { hpf: 90, mid_freq: 1200, mid_gain: -2.0, mid_q: 1.2, air_lpf: 16000, post_gain: 0 } },
      { id: 'p3', name: 'Lead Vocal Presence', paramValues: { hpf: 110, mid_freq: 4800, mid_gain: 3.0, mid_q: 1.1, air_lpf: 20000, post_gain: -0.5 } }
    ]
  },
  {
    id: 'cyberpunk-acid-filter-vst3',
    name: 'Cyberpunk Multi-Filter Box',
    version: '3.0.2',
    format: 'VST3',
    category: 'Filter',
    vendor: 'Tokyo Neon Audio',
    description: '4-pole 24dB diode ladder filter with aggressive self-oscillating resonance and stereo pan mod.',
    faceplateTheme: 'cyberpunk_neon',
    parameters: [
      { id: 'cutoff', name: 'CUTOFF FREQ', targetStage: 'filter_freq', min: 60, max: 18000, defaultValue: 1450, unit: 'Hz', curve: 'log', description: 'Diode ladder filter cutoff frequency' },
      { id: 'resonance', name: 'RESONANCE (Q)', targetStage: 'filter_q', min: 0.7, max: 18.0, defaultValue: 8.5, unit: 'Q', description: 'Self-oscillating feedback peak' },
      { id: 'sub_cut', name: 'SUB CLEAN HPF', targetStage: 'low_cut', min: 20, max: 250, defaultValue: 35, unit: 'Hz', description: 'Subsonic rumble eliminator' },
      { id: 'drive', name: 'PRE-AMP DRIVE', targetStage: 'drive', min: 0, max: 100, defaultValue: 55, unit: '%', description: 'Overdrives the diode ladder stage' },
      { id: 'pan_pos', name: 'STEREO PAN', targetStage: 'pan', min: -1.0, max: 1.0, defaultValue: 0.0, unit: '', description: 'Stereo placement stage' },
      { id: 'dry_wet', name: 'FILTER MIX', targetStage: 'dry_wet', min: 0, max: 100, defaultValue: 100, unit: '%', description: 'Filter blend level' }
    ],
    presets: [
      { id: 'p1', name: 'Screaming 303 Acid', paramValues: { cutoff: 2200, resonance: 14.0, sub_cut: 40, drive: 75, pan_pos: 0, dry_wet: 100 } },
      { id: 'p2', name: 'Underwater Lofi Sweep', paramValues: { cutoff: 750, resonance: 2.5, sub_cut: 80, drive: 20, pan_pos: -0.15, dry_wet: 90 } },
      { id: 'p3', name: 'Wide Stereo Resonance', paramValues: { cutoff: 3400, resonance: 9.0, sub_cut: 30, drive: 40, pan_pos: 0.35, dry_wet: 85 } }
    ]
  },
  {
    id: 'brickwall-limiter-au',
    name: 'Precision Mastering Limiter',
    version: '4.1.0',
    format: 'AU',
    category: 'Dynamics',
    vendor: 'Mastering Grade Labs',
    description: 'Lookahead brickwall peak limiter with true peak inter-sample clipping protection and ceiling margin.',
    faceplateTheme: 'mastering_gold',
    parameters: [
      { id: 'thresh_gain', name: 'DRIVE / GAIN', targetStage: 'pre_gain', min: 0, max: 14, defaultValue: 4.5, unit: 'dB', description: 'Drives signal up into brickwall threshold' },
      { id: 'ceiling', name: 'CEILING MARGIN', targetStage: 'post_gain', min: -3.0, max: 0.0, defaultValue: -0.3, unit: 'dBFS', description: 'True-peak intersample protection ceiling' },
      { id: 'dc_cut', name: 'DC OFFSET HPF', targetStage: 'low_cut', min: 20, max: 60, defaultValue: 25, unit: 'Hz', description: 'Sub-bass DC blocker filter' },
      { id: 'air_sheen', name: 'AIR POLISH (HF)', targetStage: 'filter_freq', min: 10000, max: 20000, defaultValue: 14500, unit: 'Hz', description: 'High-frequency sweetening stage' },
      { id: 'air_gain', name: 'AIR BOOST', targetStage: 'filter_gain', min: 0, max: 6, defaultValue: 1.5, unit: 'dB', description: 'Gentle shelf air lift' },
      { id: 'dry_wet', name: 'MIX', targetStage: 'dry_wet', min: 0, max: 100, defaultValue: 100, unit: '%', description: 'Parallel limiting blend' }
    ],
    presets: [
      { id: 'p1', name: 'Commercial CD Master (-0.3dB)', paramValues: { thresh_gain: 5.5, ceiling: -0.3, dc_cut: 25, air_sheen: 14000, air_gain: 1.2, dry_wet: 100 } },
      { id: 'p2', name: 'Streaming Safe (-1.0dB)', paramValues: { thresh_gain: 3.5, ceiling: -1.0, dc_cut: 30, air_sheen: 16000, air_gain: 0.8, dry_wet: 100 } },
      { id: 'p3', name: 'Gentle Drum Bus Glue', paramValues: { thresh_gain: 2.0, ceiling: -0.5, dc_cut: 20, air_sheen: 12000, air_gain: 0.0, dry_wet: 70 } }
    ]
  },
  {
    id: 'space-echo-tape-delay-vst3',
    name: 'RE-201 Space Echo Tape Delay',
    version: '1.2.0',
    format: 'VST3',
    category: 'Time',
    vendor: 'Osaka Tape Machine Co.',
    description: 'Analog multi-head magnetic tape delay with tape head tone filter, wow-flutter tone and feedback saturation.',
    faceplateTheme: 'brushed_steel',
    parameters: [
      { id: 'tape_drive', name: 'TAPE DRIVE', targetStage: 'drive', min: 0, max: 100, defaultValue: 35, unit: '%', description: 'Simulates magnetic oxide saturation on repeats' },
      { id: 'tone_cut', name: 'REPEAT TONE', targetStage: 'filter_freq', min: 1200, max: 10000, defaultValue: 3800, unit: 'Hz', curve: 'log', description: 'Warm tape head high-frequency dampening' },
      { id: 'low_mud_cut', name: 'BASS DE-MUD', targetStage: 'low_cut', min: 50, max: 400, defaultValue: 150, unit: 'Hz', description: 'Prevents low-end buildup on multiple repeats' },
      { id: 'tape_pan', name: 'HEAD PANNING', targetStage: 'pan', min: -1.0, max: 1.0, defaultValue: 0.2, unit: '', description: 'Offset head stereo placement' },
      { id: 'level', name: 'OUTPUT TRIM', targetStage: 'post_gain', min: -12, max: 12, defaultValue: -1.0, unit: 'dB', description: 'Final delay output gain' },
      { id: 'mix', name: 'ECHO BLEND', targetStage: 'dry_wet', min: 0, max: 100, defaultValue: 45, unit: '%', description: 'Dry vs echo repeat ratio' }
    ],
    presets: [
      { id: 'p1', name: 'Dub Reggae Slap', paramValues: { tape_drive: 55, tone_cut: 2800, low_mud_cut: 180, tape_pan: 0.25, level: 0, mix: 50 } },
      { id: 'p2', name: 'Psych Rock Lead Echo', paramValues: { tape_drive: 40, tone_cut: 4500, low_mud_cut: 120, tape_pan: -0.15, level: -1.5, mix: 40 } },
      { id: 'p3', name: 'Ambient Tape Trails', paramValues: { tape_drive: 65, tone_cut: 2200, low_mud_cut: 220, tape_pan: 0.4, level: -2.0, mix: 65 } }
    ]
  }
];

const STORAGE_CUSTOM_PLUGINS_KEY = 'strangelet_custom_vst_manifests_v1';
const STORAGE_INSTANCES_KEY = 'strangelet_active_vst_instances_v1';

class VstWrapperService {
  private manifests: Map<string, VstPluginManifest> = new Map();
  private instances: Map<string, VstActiveInstance> = new Map();
  private listeners = new Set<() => void>();
  private paramChangeListeners = new Set<(event: VstParamChangeEvent) => void>();

  constructor() {
    this.initRegistry();
  }

  private initRegistry() {
    // Register built-in VSTs
    BUILTIN_VST_MANIFESTS.forEach(m => {
      this.manifests.set(m.id, m);
    });

    // Load custom plugins created by the user
    try {
      const raw = localStorage.getItem(STORAGE_CUSTOM_PLUGINS_KEY);
      if (raw) {
        const parsed: VstPluginManifest[] = JSON.parse(raw);
        parsed.forEach(m => this.manifests.set(m.id, m));
      }
    } catch (e) {
      console.warn('Failed to load custom VST manifests:', e);
    }

    // Load active instances
    try {
      const rawInst = localStorage.getItem(STORAGE_INSTANCES_KEY);
      if (rawInst) {
        const parsed: VstActiveInstance[] = JSON.parse(rawInst);
        parsed.forEach(inst => this.instances.set(inst.instanceId, inst));
      }
    } catch (e) {
      console.warn('Failed to load active VST instances:', e);
    }
  }

  private saveCustomManifests() {
    try {
      const customs = Array.from(this.manifests.values()).filter(m => m.isCustomNonNative);
      localStorage.setItem(STORAGE_CUSTOM_PLUGINS_KEY, JSON.stringify(customs));
    } catch {}
  }

  private saveInstances() {
    try {
      const list = Array.from(this.instances.values());
      localStorage.setItem(STORAGE_INSTANCES_KEY, JSON.stringify(list));
      this.notify();
    } catch {}
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  public onParameterChange(cb: (event: VstParamChangeEvent) => void): () => void {
    this.paramChangeListeners.add(cb);
    return () => this.paramChangeListeners.delete(cb);
  }

  private emitParamChange(event: VstParamChangeEvent) {
    this.paramChangeListeners.forEach(fn => {
      try {
        fn(event);
      } catch (err) {
        console.warn('VST parameter listener error:', err);
      }
    });
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  public getAllManifests(): VstPluginManifest[] {
    return Array.from(this.manifests.values());
  }

  public getManifest(pluginId: string): VstPluginManifest | undefined {
    return this.manifests.get(pluginId);
  }

  /**
   * Instantiate a plugin for a specific track
   */
  public instantiatePlugin(pluginId: string, trackId: string): VstActiveInstance {
    const manifest = this.manifests.get(pluginId) || BUILTIN_VST_MANIFESTS[0];
    const instanceId = `vst-inst-${trackId}-${pluginId}-${Date.now()}`;

    // Initialize default parameter values
    const paramValues: Record<string, number> = {};
    manifest.parameters.forEach(p => {
      paramValues[p.id] = p.defaultValue;
    });

    const instance: VstActiveInstance = {
      instanceId,
      pluginId: manifest.id,
      trackId,
      name: manifest.name,
      format: manifest.format,
      bypassed: false,
      paramValues,
      activeState: 'A',
      selectedPresetId: manifest.presets[0]?.id
    };

    this.instances.set(instanceId, instance);
    this.saveInstances();
    playLaserBeamSound('laser_select');
    return instance;
  }

  public getInstance(instanceId: string): VstActiveInstance | undefined {
    return this.instances.get(instanceId);
  }

  public getAllInstances(): VstActiveInstance[] {
    return Array.from(this.instances.values());
  }

  public getInstancesForTrack(trackId: string): VstActiveInstance[] {
    return Array.from(this.instances.values()).filter(i => i.trackId === trackId);
  }

  public updateParameter(instanceId: string, paramId: string, value: number) {
    const inst = this.instances.get(instanceId);
    if (!inst) return;

    inst.paramValues[paramId] = value;
    this.saveInstances();

    const manifest = this.manifests.get(inst.pluginId);
    const paramDef = manifest?.parameters.find(p => p.id === paramId);
    this.emitParamChange({
      instanceId: inst.instanceId,
      pluginId: inst.pluginId,
      pluginName: inst.name,
      trackId: inst.trackId,
      paramId,
      paramName: paramDef?.name || paramId,
      value,
      min: paramDef?.min ?? 0,
      max: paramDef?.max ?? 1,
      unit: paramDef?.unit
    });
  }

  /**
   * Lightweight in-memory parameter update used by 60fps timeline automation playback
   * without spamming localStorage serialization on every animation frame.
   */
  public updateParameterLive(instanceId: string, paramId: string, value: number) {
    const inst = this.instances.get(instanceId);
    if (!inst) return;
    if (inst.paramValues[paramId] === value) return;
    inst.paramValues[paramId] = value;
  }

  public setBypass(instanceId: string, bypassed: boolean) {
    const inst = this.instances.get(instanceId);
    if (!inst) return;
    inst.bypassed = bypassed;
    this.saveInstances();
    playLaserBeamSound('laser_select');

    this.emitParamChange({
      instanceId: inst.instanceId,
      pluginId: inst.pluginId,
      pluginName: inst.name,
      trackId: inst.trackId,
      paramId: '__bypass__',
      paramName: `${inst.name} Bypass`,
      value: bypassed ? 1 : 0,
      min: 0,
      max: 1,
      isBypassToggle: true
    });
  }

  public loadPreset(instanceId: string, presetId: string) {
    const inst = this.instances.get(instanceId);
    if (!inst) return;
    const manifest = this.manifests.get(inst.pluginId);
    if (!manifest) return;

    const preset = manifest.presets.find(p => p.id === presetId);
    if (preset) {
      inst.paramValues = { ...preset.paramValues };
      inst.selectedPresetId = presetId;
      this.saveInstances();
      playColliderInjectionSound();

      Object.entries(preset.paramValues).forEach(([paramId, val]) => {
        const paramDef = manifest.parameters.find(p => p.id === paramId);
        this.emitParamChange({
          instanceId: inst.instanceId,
          pluginId: inst.pluginId,
          pluginName: inst.name,
          trackId: inst.trackId,
          paramId,
          paramName: paramDef?.name || paramId,
          value: val,
          min: paramDef?.min ?? 0,
          max: paramDef?.max ?? 1,
          unit: paramDef?.unit
        });
      });
    }
  }

  /**
   * Restore captured VST instance parameter & bypass states (used by Auto-Mix Snapshot recall)
   */
  public applyInstanceSnapshots(
    snapshots: {
      instanceId: string;
      pluginId: string;
      trackId: string;
      bypassed: boolean;
      paramValues: Record<string, number>;
      selectedPresetId?: string;
    }[]
  ) {
    snapshots.forEach(snap => {
      const existing = this.instances.get(snap.instanceId);
      if (existing) {
        existing.bypassed = snap.bypassed;
        existing.paramValues = { ...snap.paramValues };
        existing.selectedPresetId = snap.selectedPresetId;
      } else {
        const byPluginTrack = Array.from(this.instances.values()).find(
          i => i.trackId === snap.trackId && i.pluginId === snap.pluginId
        );
        if (byPluginTrack) {
          byPluginTrack.bypassed = snap.bypassed;
          byPluginTrack.paramValues = { ...snap.paramValues };
          byPluginTrack.selectedPresetId = snap.selectedPresetId;
        }
      }
    });
    this.saveInstances();
  }

  public toggleABState(instanceId: string) {
    const inst = this.instances.get(instanceId);
    if (!inst) return;

    if (inst.activeState === 'A') {
      // Save current to state A, switch to B
      if (!inst.stateB) {
        inst.stateB = { ...inst.paramValues };
      }
      const temp = { ...inst.paramValues };
      inst.paramValues = { ...inst.stateB };
      inst.stateB = temp;
      inst.activeState = 'B';
    } else {
      const temp = { ...inst.paramValues };
      inst.paramValues = { ...inst.stateB! };
      inst.stateB = temp;
      inst.activeState = 'A';
    }
    this.saveInstances();
    playLaserBeamSound('laser_curve');
  }

  public removeInstance(instanceId: string) {
    this.instances.delete(instanceId);
    this.saveInstances();
    playLaserBeamSound('laser_erase');
  }

  /**
   * Register a user-created custom Non-Native VST interface
   */
  public registerCustomNonNativePlugin(plugin: Omit<VstPluginManifest, 'id' | 'isCustomNonNative'>): VstPluginManifest {
    const id = `custom-vst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const fullManifest: VstPluginManifest = {
      ...plugin,
      id,
      isCustomNonNative: true
    };

    this.manifests.set(id, fullManifest);
    this.saveCustomManifests();
    this.notify();
    playColliderInjectionSound();
    return fullManifest;
  }

  /**
   * Intelligently detects common VST parameters (Gain, Pan, Cutoff, Resonance, Drive, Mix)
   * by analyzing parameter name tokens, units, and ranges.
   */
  public detectParameterStage(param: { name: string; targetStage?: VstDspTargetStage; unit?: string; min?: number; max?: number }): {
    stage: VstDspTargetStage;
    confidence: number;
    category: 'Gain' | 'Pan' | 'Cutoff' | 'Resonance' | 'Drive' | 'Mix' | 'Unchanged';
    reason: string;
    suggestedUnit: string;
    suggestedMin: number;
    suggestedMax: number;
    suggestedDefault: number;
  } {
    const n = param.name.trim().toLowerCase();
    const u = (param.unit || '').trim().toLowerCase();

    // 1. Pan / Stereo Balance
    if (n.includes('pan') || n.includes('balance') || n.includes('bal') || n.includes('stereo') || n.includes('width') || n.includes('spread') || n.includes('panner') || n.includes('azimuth') || n === 'l/r') {
      return {
        stage: 'pan',
        confidence: 96,
        category: 'Pan',
        reason: 'Detected stereo balance / panoramic control',
        suggestedUnit: '',
        suggestedMin: -1.0,
        suggestedMax: 1.0,
        suggestedDefault: 0.0
      };
    }

    // 2. Cutoff / Filter Frequency
    if (n.includes('low cut') || n.includes('lowcut') || n.includes('hpf') || n.includes('high pass') || n.includes('highpass') || n.includes('sub cut') || n.includes('rumble')) {
      return {
        stage: 'low_cut',
        confidence: 95,
        category: 'Cutoff',
        reason: 'Detected sub-bass / low-cut highpass filter',
        suggestedUnit: 'Hz',
        suggestedMin: 20,
        suggestedMax: 1000,
        suggestedDefault: 35
      };
    }

    if (n.includes('high cut') || n.includes('highcut') || n.includes('lpf') || n.includes('low pass') || n.includes('lowpass') || n.includes('air cut') || n.includes('sheen cut')) {
      return {
        stage: 'high_cut',
        confidence: 95,
        category: 'Cutoff',
        reason: 'Detected treble / high-cut lowpass filter',
        suggestedUnit: 'Hz',
        suggestedMin: 1000,
        suggestedMax: 20000,
        suggestedDefault: 16000
      };
    }

    if (n.includes('cutoff') || n.includes('cut-off') || n.includes('cut off') || n.includes('freq') || n.includes('frequency') || n.includes('center') || n.includes('tone') || (u === 'hz' || u === 'khz')) {
      return {
        stage: 'filter_freq',
        confidence: 94,
        category: 'Cutoff',
        reason: 'Detected primary filter cutoff frequency',
        suggestedUnit: 'Hz',
        suggestedMin: 40,
        suggestedMax: 18000,
        suggestedDefault: 2500
      };
    }

    // 3. Resonance / Q
    if (n.includes('res') || n.includes('resonance') || n.includes(' q') || n === 'q' || n.includes('bark') || n.includes('bandwidth') || n.includes('emphasis') || u === 'q') {
      return {
        stage: 'filter_q',
        confidence: 93,
        category: 'Resonance',
        reason: 'Detected resonance Q bandwidth peak',
        suggestedUnit: 'Q',
        suggestedMin: 0.1,
        suggestedMax: 18.0,
        suggestedDefault: 1.0
      };
    }

    // 4. Gain / Volume / Trim / Level
    if (n.includes('input') || n.includes('in gain') || n.includes('pre gain') || n.includes('pre-gain') || n.includes('trim') || n.includes('sensitivity') || n.includes('sens') || n.includes('drive in') || n.includes('threshold')) {
      return {
        stage: 'pre_gain',
        confidence: 96,
        category: 'Gain',
        reason: 'Detected input trim / pre-gain stage',
        suggestedUnit: 'dB',
        suggestedMin: -24,
        suggestedMax: 24,
        suggestedDefault: 0
      };
    }

    if (n.includes('output') || n.includes('out gain') || n.includes('post gain') || n.includes('post-gain') || n.includes('master') || n.includes('level') || n.includes('makeup') || n.includes('ceiling') || n.includes('volume') || n.includes('vol') || (n === 'gain' && u === 'db')) {
      return {
        stage: 'post_gain',
        confidence: 95,
        category: 'Gain',
        reason: 'Detected output level / makeup gain stage',
        suggestedUnit: 'dB',
        suggestedMin: -24,
        suggestedMax: 12,
        suggestedDefault: 0
      };
    }

    // 5. Drive / Saturation / Distortion
    if (n.includes('drive') || n.includes('sat') || n.includes('saturation') || n.includes('dist') || n.includes('distortion') || n.includes('overdrive') || n.includes('fuzz') || n.includes('tube') || n.includes('warmth') || n.includes('crunch') || n.includes('bias')) {
      return {
        stage: 'drive',
        confidence: 93,
        category: 'Drive',
        reason: 'Detected saturation / harmonic drive stage',
        suggestedUnit: '%',
        suggestedMin: 0,
        suggestedMax: 100,
        suggestedDefault: 35
      };
    }

    // 6. Dry / Wet / Mix / Blend
    if (n.includes('mix') || n.includes('dry/wet') || n.includes('dry wet') || n.includes('blend') || n.includes('parallel') || n.includes('wet') || n.includes('amount') || n.includes('depth')) {
      return {
        stage: 'dry_wet',
        confidence: 95,
        category: 'Mix',
        reason: 'Detected parallel dry/wet crossfader',
        suggestedUnit: '%',
        suggestedMin: 0,
        suggestedMax: 100,
        suggestedDefault: 100
      };
    }

    // Fallback: Retain current or unmapped
    return {
      stage: param.targetStage || 'filter_freq',
      confidence: 50,
      category: 'Unchanged',
      reason: 'Retained existing stage binding',
      suggestedUnit: param.unit || '',
      suggestedMin: param.min ?? 0,
      suggestedMax: param.max ?? 100,
      suggestedDefault: (param.min ?? 0)
    };
  }

  /**
   * Auto-maps an existing manifest's parameters, updates stage bindings in storage,
   * and returns a detailed diagnostic report.
   */
  public autoMapManifest(manifestId: string): VstAutoMapReport {
    const manifest = this.manifests.get(manifestId);
    if (!manifest) {
      throw new Error(`Manifest not found: ${manifestId}`);
    }

    const details: VstAutoMapResult[] = [];
    let mappedCount = 0;

    const updatedParams = manifest.parameters.map(param => {
      const originalStage = param.targetStage;
      const detected = this.detectParameterStage(param);

      const hasChanged = originalStage !== detected.stage;
      if (hasChanged || detected.confidence >= 90) {
        mappedCount++;
      }

      details.push({
        paramId: param.id,
        paramName: param.name,
        originalStage,
        mappedStage: detected.stage,
        confidence: detected.confidence,
        categoryDetected: detected.category,
        reason: detected.reason,
        suggestedUnit: detected.suggestedUnit,
        suggestedRange: {
          min: detected.suggestedMin,
          max: detected.suggestedMax,
          defaultValue: detected.suggestedDefault
        }
      });

      return {
        ...param,
        targetStage: detected.stage,
        unit: param.unit || detected.suggestedUnit
      };
    });

    // Update manifest
    manifest.parameters = updatedParams;
    this.manifests.set(manifestId, manifest);
    this.saveCustomManifests();
    this.notify();
    playColliderInjectionSound();

    return {
      pluginId: manifest.id,
      pluginName: manifest.name,
      timestamp: Date.now(),
      totalParameters: manifest.parameters.length,
      mappedCount,
      details
    };
  }

  /**
   * Auto-maps a list of custom parameter definitions for the Plugin Builder
   */
  public autoMapCustomParams(params: VstParameterDefinition[]): {
    params: VstParameterDefinition[];
    report: VstAutoMapResult[];
  } {
    const report: VstAutoMapResult[] = [];
    const updated = params.map(p => {
      const orig = p.targetStage;
      const det = this.detectParameterStage(p);
      report.push({
        paramId: p.id,
        paramName: p.name,
        originalStage: orig,
        mappedStage: det.stage,
        confidence: det.confidence,
        categoryDetected: det.category,
        reason: det.reason,
        suggestedUnit: det.suggestedUnit,
        suggestedRange: {
          min: det.suggestedMin,
          max: det.suggestedMax,
          defaultValue: det.suggestedDefault
        }
      });
      return {
        ...p,
        targetStage: det.stage,
        unit: p.unit || det.suggestedUnit,
        min: p.min ?? det.suggestedMin,
        max: p.max ?? det.suggestedMax
      };
    });

    playLaserBeamSound('laser_curve');
    return { params: updated, report };
  }

  /**
   * Creates a dedicated Web Audio DSP Node Chain for a track's VST insert,
   * wiring Pre-Gain -> Low Cut HPF -> Main Filter -> WaveShaper -> Post-Filter -> Pan -> Post-Gain -> Dry/Wet
   */
  public createDspChain(ctx: AudioContext, instance: VstActiveInstance): {
    inputNode: GainNode;
    outputNode: GainNode;
    updateParams: () => void;
    destroy: () => void;
  } {
    const manifest = this.getManifest(instance.pluginId) || BUILTIN_VST_MANIFESTS[0];

    // Nodes
    const inputNode = ctx.createGain();
    const dryNode = ctx.createGain();
    const wetNode = ctx.createGain();
    const outputNode = ctx.createGain();

    const preGain = ctx.createGain();
    const lowCutHpf = ctx.createBiquadFilter();
    lowCutHpf.type = 'highpass';
    lowCutHpf.Q.value = 0.707;

    const mainFilter = ctx.createBiquadFilter();
    mainFilter.type = 'peaking';
    mainFilter.Q.value = 1.0;

    const waveShaper = ctx.createWaveShaper();
    waveShaper.oversample = '2x';

    const highCutLpf = ctx.createBiquadFilter();
    highCutLpf.type = 'lowpass';
    highCutLpf.Q.value = 0.707;

    const panner = ctx.createStereoPanner();
    const postGain = ctx.createGain();

    // Wiring Dry Path
    inputNode.connect(dryNode);
    dryNode.connect(outputNode);

    // Wiring Wet Path
    inputNode.connect(preGain);
    preGain.connect(lowCutHpf);
    lowCutHpf.connect(mainFilter);
    mainFilter.connect(waveShaper);
    waveShaper.connect(highCutLpf);
    highCutLpf.connect(panner);
    panner.connect(postGain);
    postGain.connect(wetNode);
    wetNode.connect(outputNode);

    // Distortion curve generator for WaveShaper
    const makeDistortionCurve = (amount: number): Float32Array => {
      const n_samples = 44100;
      const curve = new Float32Array(n_samples);
      const k = Math.max(0, Math.min(100, amount)) * 2;
      const deg = Math.PI / 180;
      for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        if (k === 0) {
          curve[i] = x;
        } else {
          curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
        }
      }
      return curve;
    };

    const updateParams = () => {
      if (instance.bypassed) {
        dryNode.gain.value = 1.0;
        wetNode.gain.value = 0.0;
        return;
      }

      // Read parameter values and map to target stages
      let dryWetPercent = 100;

      manifest.parameters.forEach(p => {
        const val = instance.paramValues[p.id] !== undefined ? instance.paramValues[p.id] : p.defaultValue;

        switch (p.targetStage) {
          case 'pre_gain': {
            // val in dB -> linear gain
            const linear = Math.pow(10, val / 20);
            preGain.gain.setValueAtTime(linear, ctx.currentTime);
            break;
          }
          case 'low_cut': {
            lowCutHpf.frequency.setValueAtTime(Math.max(10, Math.min(2000, val)), ctx.currentTime);
            break;
          }
          case 'filter_freq': {
            mainFilter.frequency.setValueAtTime(Math.max(20, Math.min(20000, val)), ctx.currentTime);
            break;
          }
          case 'filter_q': {
            mainFilter.Q.setValueAtTime(Math.max(0.1, Math.min(30, val)), ctx.currentTime);
            break;
          }
          case 'filter_gain': {
            mainFilter.gain.setValueAtTime(val, ctx.currentTime);
            break;
          }
          case 'drive': {
            waveShaper.curve = makeDistortionCurve(val);
            break;
          }
          case 'high_cut': {
            highCutLpf.frequency.setValueAtTime(Math.max(500, Math.min(20000, val)), ctx.currentTime);
            break;
          }
          case 'pan': {
            panner.pan.setValueAtTime(Math.max(-1.0, Math.min(1.0, val)), ctx.currentTime);
            break;
          }
          case 'post_gain': {
            const linear = Math.pow(10, val / 20);
            postGain.gain.setValueAtTime(linear, ctx.currentTime);
            break;
          }
          case 'dry_wet': {
            dryWetPercent = Math.max(0, Math.min(100, val));
            break;
          }
        }
      });

      const wetLinear = dryWetPercent / 100;
      const dryLinear = 1.0 - wetLinear;
      wetNode.gain.setValueAtTime(wetLinear, ctx.currentTime);
      dryNode.gain.setValueAtTime(dryLinear, ctx.currentTime);
    };

    // Initial update
    updateParams();

    const destroy = () => {
      try {
        inputNode.disconnect();
        dryNode.disconnect();
        wetNode.disconnect();
        outputNode.disconnect();
        preGain.disconnect();
        lowCutHpf.disconnect();
        mainFilter.disconnect();
        waveShaper.disconnect();
        highCutLpf.disconnect();
        panner.disconnect();
        postGain.disconnect();
      } catch {}
    };

    return {
      inputNode,
      outputNode,
      updateParams,
      destroy
    };
  }
}

export const vstWrapperService = new VstWrapperService();
