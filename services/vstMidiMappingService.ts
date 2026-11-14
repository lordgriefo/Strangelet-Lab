import { BUILTIN_VST_MANIFESTS, vstWrapperService } from './vstWrapperService';
import { midiLearnService } from './midiLearnService';
import { playLaserBeamSound, playColliderInjectionSound } from '../lib/laserSound';

export interface VstMidiParamAssignment {
  paramId: string;
  paramName: string;
  ccNumber: number; // 0-127
  channel: number; // 1-16 or -1 (omni)
  min: number;
  max: number;
  inverted?: boolean;
  curve?: 'linear' | 'log' | 'exp';
  hardwareLabel?: string;
  enabled: boolean;
}

export interface VstMidiMappingPreset {
  id: string;
  name: string;
  pluginId: string; // Specific plugin ID or '*' for universal
  pluginName: string;
  author?: string;
  description?: string;
  controllerTemplate?: 'Akai MPK Mini' | 'Arturia MiniLab / BeatStep' | 'Novation Launch Control' | 'Korg nanoKONTROL' | 'Expressive Macros' | 'Custom';
  isFactory?: boolean;
  isDefault?: boolean;
  createdAt: number;
  assignments: VstMidiParamAssignment[];
}

const STORAGE_PRESETS_KEY = 'strangelet_vst_midi_mapping_presets_v1';
const STORAGE_ACTIVE_MAPPINGS_KEY = 'strangelet_vst_active_midi_mappings_v1';

// Factory Mapping Presets for standard hardware controllers & built-in plugins
const FACTORY_MAPPING_PRESETS: VstMidiMappingPreset[] = [
  // 1. Strangelet Warm Tube 12AX7 - Akai MPK Mini
  {
    id: 'f-tube-akai',
    name: 'Akai MPK Mini (Knobs 1-6)',
    pluginId: 'strangelet-tube-saturator-vst3',
    pluginName: 'Strangelet Warm Tube 12AX7',
    author: 'Strangelet Factory',
    description: 'Hardware knobs K1-K6 mapped to Tube Drive, Pre-Gain, Tone Cutoff, Resonance, Output Level, and Dry/Wet.',
    controllerTemplate: 'Akai MPK Mini',
    isFactory: true,
    isDefault: true,
    createdAt: 1700000000000,
    assignments: [
      { paramId: 'drive', paramName: 'TUBE DRIVE', ccNumber: 70, channel: -1, min: 0, max: 100, hardwareLabel: 'K1', enabled: true },
      { paramId: 'pre_gain', paramName: 'INPUT TRIM', ccNumber: 71, channel: -1, min: -18, max: 18, hardwareLabel: 'K2', enabled: true },
      { paramId: 'tone_freq', paramName: 'TONE CUTOFF', ccNumber: 72, channel: -1, min: 800, max: 16000, curve: 'log', hardwareLabel: 'K3', enabled: true },
      { paramId: 'tone_q', paramName: 'RES / BARK', ccNumber: 73, channel: -1, min: 0.5, max: 6.0, hardwareLabel: 'K4', enabled: true },
      { paramId: 'post_gain', paramName: 'OUTPUT LEVEL', ccNumber: 74, channel: -1, min: -24, max: 12, hardwareLabel: 'K5', enabled: true },
      { paramId: 'mix', paramName: 'DRY / WET', ccNumber: 75, channel: -1, min: 0, max: 100, hardwareLabel: 'K6', enabled: true }
    ]
  },
  // 2. Strangelet Warm Tube 12AX7 - Arturia MiniLab / BeatStep
  {
    id: 'f-tube-arturia',
    name: 'Arturia MiniLab / BeatStep',
    pluginId: 'strangelet-tube-saturator-vst3',
    pluginName: 'Strangelet Warm Tube 12AX7',
    author: 'Strangelet Factory',
    description: 'Arturia rotary encoders (CC 74 Cutoff, CC 71 Res, CC 76 Drive, CC 73 Output, CC 93 Mix).',
    controllerTemplate: 'Arturia MiniLab / BeatStep',
    isFactory: true,
    createdAt: 1700000001000,
    assignments: [
      { paramId: 'drive', paramName: 'TUBE DRIVE', ccNumber: 76, channel: -1, min: 0, max: 100, hardwareLabel: 'Enc 1', enabled: true },
      { paramId: 'pre_gain', paramName: 'INPUT TRIM', ccNumber: 77, channel: -1, min: -18, max: 18, hardwareLabel: 'Enc 2', enabled: true },
      { paramId: 'tone_freq', paramName: 'TONE CUTOFF', ccNumber: 74, channel: -1, min: 800, max: 16000, curve: 'log', hardwareLabel: 'Enc 3', enabled: true },
      { paramId: 'tone_q', paramName: 'RES / BARK', ccNumber: 71, channel: -1, min: 0.5, max: 6.0, hardwareLabel: 'Enc 4', enabled: true },
      { paramId: 'post_gain', paramName: 'OUTPUT LEVEL', ccNumber: 73, channel: -1, min: -24, max: 12, hardwareLabel: 'Enc 5', enabled: true },
      { paramId: 'mix', paramName: 'DRY / WET', ccNumber: 93, channel: -1, min: 0, max: 100, hardwareLabel: 'Enc 6', enabled: true }
    ]
  },
  // 3. Neve-1073 Console EQ - Novation Launch Control
  {
    id: 'f-neve-novation',
    name: 'Novation Launch Control XL',
    pluginId: 'british-vintage-eq-clap',
    pluginName: 'Neve-1073 Console EQ',
    author: 'Strangelet Factory',
    description: 'Novation Launch Control rotary rows for analog console sculpting.',
    controllerTemplate: 'Novation Launch Control',
    isFactory: true,
    isDefault: true,
    createdAt: 1700000002000,
    assignments: [
      { paramId: 'hpf', paramName: 'HPF (LOW CUT)', ccNumber: 13, channel: -1, min: 20, max: 300, hardwareLabel: 'Row 1 Pot 1', enabled: true },
      { paramId: 'mid_freq', paramName: 'MID FREQ', ccNumber: 14, channel: -1, min: 360, max: 7200, curve: 'log', hardwareLabel: 'Row 1 Pot 2', enabled: true },
      { paramId: 'mid_gain', paramName: 'MID GAIN', ccNumber: 15, channel: -1, min: -12, max: 12, hardwareLabel: 'Row 1 Pot 3', enabled: true },
      { paramId: 'mid_q', paramName: 'MID BANDWIDTH', ccNumber: 16, channel: -1, min: 0.7, max: 4.5, hardwareLabel: 'Row 1 Pot 4', enabled: true },
      { paramId: 'air_lpf', paramName: 'AIR CUTOFF', ccNumber: 17, channel: -1, min: 8000, max: 20000, hardwareLabel: 'Row 1 Pot 5', enabled: true },
      { paramId: 'post_gain', paramName: 'TRIM LEVEL', ccNumber: 18, channel: -1, min: -12, max: 12, hardwareLabel: 'Row 1 Pot 6', enabled: true }
    ]
  },
  // 4. Cyberpunk Multi-Filter Box - Korg nanoKONTROL2
  {
    id: 'f-cyberpunk-korg',
    name: 'Korg nanoKONTROL2 (Sliders 1-6)',
    pluginId: 'cyberpunk-acid-filter-vst3',
    pluginName: 'Cyberpunk Multi-Filter Box',
    author: 'Strangelet Factory',
    description: 'Physical faders on Korg nanoKONTROL2 for dynamic filter sweeps & distortion driving.',
    controllerTemplate: 'Korg nanoKONTROL',
    isFactory: true,
    isDefault: true,
    createdAt: 1700000003000,
    assignments: [
      { paramId: 'cutoff', paramName: 'CUTOFF FREQ', ccNumber: 0, channel: -1, min: 60, max: 18000, curve: 'log', hardwareLabel: 'Slider 1', enabled: true },
      { paramId: 'resonance', paramName: 'RESONANCE (Q)', ccNumber: 1, channel: -1, min: 0.7, max: 18.0, hardwareLabel: 'Slider 2', enabled: true },
      { paramId: 'sub_cut', paramName: 'SUB CLEAN HPF', ccNumber: 2, channel: -1, min: 20, max: 250, hardwareLabel: 'Slider 3', enabled: true },
      { paramId: 'drive', paramName: 'PRE-AMP DRIVE', ccNumber: 3, channel: -1, min: 0, max: 100, hardwareLabel: 'Slider 4', enabled: true },
      { paramId: 'pan_pos', paramName: 'STEREO PAN', ccNumber: 4, channel: -1, min: -1.0, max: 1.0, hardwareLabel: 'Slider 5', enabled: true },
      { paramId: 'dry_wet', paramName: 'FILTER MIX', ccNumber: 5, channel: -1, min: 0, max: 100, hardwareLabel: 'Slider 6', enabled: true }
    ]
  },
  // 5. Precision Mastering Limiter - Akai MPK Mini
  {
    id: 'f-limiter-akai',
    name: 'Akai MPK Mini (Knobs 1-6)',
    pluginId: 'brickwall-limiter-au',
    pluginName: 'Precision Mastering Limiter',
    author: 'Strangelet Factory',
    description: 'Mastering ceiling and threshold calibration with knobs K1-K6.',
    controllerTemplate: 'Akai MPK Mini',
    isFactory: true,
    isDefault: true,
    createdAt: 1700000004000,
    assignments: [
      { paramId: 'thresh_gain', paramName: 'DRIVE / GAIN', ccNumber: 70, channel: -1, min: 0, max: 14, hardwareLabel: 'K1', enabled: true },
      { paramId: 'ceiling', paramName: 'CEILING MARGIN', ccNumber: 71, channel: -1, min: -3.0, max: 0.0, hardwareLabel: 'K2', enabled: true },
      { paramId: 'dc_cut', paramName: 'DC OFFSET HPF', ccNumber: 72, channel: -1, min: 20, max: 60, hardwareLabel: 'K3', enabled: true },
      { paramId: 'air_sheen', paramName: 'AIR POLISH (HF)', ccNumber: 73, channel: -1, min: 10000, max: 20000, hardwareLabel: 'K4', enabled: true },
      { paramId: 'air_gain', paramName: 'AIR BOOST', ccNumber: 74, channel: -1, min: 0, max: 6, hardwareLabel: 'K5', enabled: true },
      { paramId: 'dry_wet', paramName: 'MIX', ccNumber: 75, channel: -1, min: 0, max: 100, hardwareLabel: 'K6', enabled: true }
    ]
  },
  // 6. Space Echo Tape Delay - Expressive Performance
  {
    id: 'f-tape-expressive',
    name: 'Expressive Performance (Mod Wheel & Macros)',
    pluginId: 'space-echo-tape-delay-vst3',
    pluginName: 'RE-201 Space Echo Tape Delay',
    author: 'Strangelet Factory',
    description: 'Mod Wheel (CC 1) drives Echo Blend, Expression (CC 11) controls Tape Drive, CC 74 modulates Tone.',
    controllerTemplate: 'Expressive Macros',
    isFactory: true,
    isDefault: true,
    createdAt: 1700000005000,
    assignments: [
      { paramId: 'mix', paramName: 'ECHO BLEND', ccNumber: 1, channel: -1, min: 0, max: 100, hardwareLabel: 'Mod Wheel (CC 1)', enabled: true },
      { paramId: 'tape_drive', paramName: 'TAPE DRIVE', ccNumber: 11, channel: -1, min: 0, max: 100, hardwareLabel: 'Expression (CC 11)', enabled: true },
      { paramId: 'tone_cut', paramName: 'REPEAT TONE', ccNumber: 74, channel: -1, min: 1200, max: 10000, curve: 'log', hardwareLabel: 'Brightness (CC 74)', enabled: true },
      { paramId: 'tape_pan', paramName: 'HEAD PANNING', ccNumber: 10, channel: -1, min: -1.0, max: 1.0, hardwareLabel: 'Pan (CC 10)', enabled: true },
      { paramId: 'low_mud_cut', paramName: 'BASS DE-MUD', ccNumber: 71, channel: -1, min: 50, max: 400, hardwareLabel: 'Resonance (CC 71)', enabled: true },
      { paramId: 'level', paramName: 'OUTPUT TRIM', ccNumber: 7, channel: -1, min: -12, max: 12, hardwareLabel: 'Volume (CC 7)', enabled: true }
    ]
  }
];

class VstMidiMappingService {
  private userPresets: Map<string, VstMidiMappingPreset> = new Map();
  private activeMappings: Map<string, VstMidiMappingPreset> = new Map(); // Key: pluginId
  private learningTarget: { pluginId: string; paramId: string } | null = null;
  private listeners = new Set<() => void>();
  private activePluginFocus: { pluginId: string; instanceId: string } | null = null;

  constructor() {
    this.loadStoredData();
    this.attachMidiListener();
  }

  private loadStoredData() {
    // 1. Load User Presets
    try {
      const raw = localStorage.getItem(STORAGE_PRESETS_KEY);
      if (raw) {
        const parsed: VstMidiMappingPreset[] = JSON.parse(raw);
        parsed.forEach(p => this.userPresets.set(p.id, p));
      }
    } catch (e) {
      console.warn('Failed to load user VST MIDI mapping presets:', e);
    }

    // 2. Load Active Mappings per plugin
    try {
      const rawActive = localStorage.getItem(STORAGE_ACTIVE_MAPPINGS_KEY);
      if (rawActive) {
        const parsed: Record<string, VstMidiMappingPreset> = JSON.parse(rawActive);
        Object.entries(parsed).forEach(([pId, preset]) => {
          this.activeMappings.set(pId, preset);
        });
      }
    } catch (e) {
      console.warn('Failed to load active VST MIDI mappings:', e);
    }
  }

  private saveUserPresets() {
    try {
      const arr = Array.from(this.userPresets.values());
      localStorage.setItem(STORAGE_PRESETS_KEY, JSON.stringify(arr));
      this.notify();
    } catch (e) {
      console.warn('Failed to save user VST MIDI presets:', e);
    }
  }

  private saveActiveMappings() {
    try {
      const obj: Record<string, VstMidiMappingPreset> = {};
      this.activeMappings.forEach((val, key) => {
        obj[key] = val;
      });
      localStorage.setItem(STORAGE_ACTIVE_MAPPINGS_KEY, JSON.stringify(obj));
      this.notify();
    } catch (e) {
      console.warn('Failed to save active VST MIDI mappings:', e);
    }
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Sets the currently focused plugin instance in the VstWrapperHostModal
   * so incoming MIDI CC messages update its live parameters in real-time.
   */
  public setFocusedPlugin(pluginId: string, instanceId: string) {
    this.activePluginFocus = { pluginId, instanceId };
  }

  public clearFocusedPlugin() {
    this.activePluginFocus = null;
  }

  /**
   * Wire into Web MIDI message stream
   */
  private attachMidiListener() {
    midiLearnService.onRawMidiMessage((channel, ccNumber, value, deviceName) => {
      this.handleMidiCcMessage(channel, ccNumber, value, deviceName);
    });
  }

  /**
   * Main MIDI CC Handler for VST Parameters
   */
  public handleMidiCcMessage(channel: number, ccNumber: number, value: number, deviceName?: string) {
    // 1. If currently learning a parameter
    if (this.learningTarget) {
      const { pluginId, paramId } = this.learningTarget;
      this.bindLearnedParameter(pluginId, paramId, ccNumber, channel, deviceName);
      this.learningTarget = null;
      playColliderInjectionSound();
      this.notify();
      return;
    }

    // 2. If a plugin is focused, check its active MIDI mapping preset
    if (!this.activePluginFocus) return;
    const { pluginId, instanceId } = this.activePluginFocus;
    const activeMapping = this.getActiveMapping(pluginId);
    if (!activeMapping) return;

    // Look for matching parameter assignment
    const match = activeMapping.assignments.find(
      a => a.enabled && a.ccNumber === ccNumber && (a.channel === -1 || a.channel === channel)
    );

    if (match) {
      // Calculate normalized value (0.0 to 1.0)
      let norm = Math.max(0, Math.min(1, value / 127));
      if (match.inverted) {
        norm = 1.0 - norm;
      }

      // Apply response curve
      if (match.curve === 'log') {
        norm = Math.pow(norm, 2.2);
      } else if (match.curve === 'exp') {
        norm = Math.pow(norm, 0.45);
      }

      // Scale to parameter real range
      const scaledVal = match.min + norm * (match.max - match.min);

      // Send to VST DSP Engine
      vstWrapperService.updateParameter(instanceId, match.paramId, scaledVal);
      this.notify();
    }
  }

  /**
   * Retrieves all available mapping presets (Factory + User) for a plugin
   */
  public getPresetsForPlugin(pluginId: string): VstMidiMappingPreset[] {
    const factory = FACTORY_MAPPING_PRESETS.filter(p => p.pluginId === pluginId || p.pluginId === '*');
    const user = Array.from(this.userPresets.values()).filter(p => p.pluginId === pluginId || p.pluginId === '*');
    return [...factory, ...user];
  }

  /**
   * Retrieves the current active mapping preset for a plugin.
   * If none set, returns or initializes the default factory preset.
   */
  public getActiveMapping(pluginId: string): VstMidiMappingPreset {
    const existing = this.activeMappings.get(pluginId);
    if (existing) return existing;

    // Look for default preset
    const presets = this.getPresetsForPlugin(pluginId);
    const defaultPreset = presets.find(p => p.isDefault) || presets[0];

    if (defaultPreset) {
      const cloned = JSON.parse(JSON.stringify(defaultPreset));
      this.activeMappings.set(pluginId, cloned);
      return cloned;
    }

    // Create blank mapping from manifest parameters
    const manifest = vstWrapperService.getManifest(pluginId);
    const assignments: VstMidiParamAssignment[] = manifest ? manifest.parameters.map((p, idx) => ({
      paramId: p.id,
      paramName: p.name,
      ccNumber: 70 + idx, // Default to standard CC 70-77
      channel: -1,
      min: p.min,
      max: p.max,
      curve: p.curve || 'linear',
      hardwareLabel: `Knob ${idx + 1}`,
      enabled: true
    })) : [];

    const blankPreset: VstMidiMappingPreset = {
      id: `active-${pluginId}-${Date.now()}`,
      name: 'Default MIDI Assignment',
      pluginId,
      pluginName: manifest?.name || 'Unknown Plugin',
      createdAt: Date.now(),
      assignments
    };

    this.activeMappings.set(pluginId, blankPreset);
    this.saveActiveMappings();
    return blankPreset;
  }

  /**
   * Load an existing preset as the active mapping for a plugin
   */
  public loadPresetToPlugin(pluginId: string, presetId: string): VstMidiMappingPreset | null {
    const presets = this.getPresetsForPlugin(pluginId);
    const target = presets.find(p => p.id === presetId);
    if (!target) return null;

    const cloned: VstMidiMappingPreset = JSON.parse(JSON.stringify(target));
    this.activeMappings.set(pluginId, cloned);
    this.saveActiveMappings();
    playColliderInjectionSound();
    return cloned;
  }

  /**
   * Updates a single parameter's MIDI assignment in the active mapping
   */
  public updateAssignment(pluginId: string, assignment: VstMidiParamAssignment) {
    const active = this.getActiveMapping(pluginId);
    const idx = active.assignments.findIndex(a => a.paramId === assignment.paramId);
    if (idx >= 0) {
      active.assignments[idx] = { ...assignment };
    } else {
      active.assignments.push({ ...assignment });
    }
    this.activeMappings.set(pluginId, { ...active });
    this.saveActiveMappings();
  }

  /**
   * Save the current active mapping as a new user preset
   */
  public saveCurrentMappingAsPreset(
    pluginId: string,
    presetName: string,
    controllerTemplate: VstMidiMappingPreset['controllerTemplate'] = 'Custom',
    description?: string
  ): VstMidiMappingPreset {
    const active = this.getActiveMapping(pluginId);
    const manifest = vstWrapperService.getManifest(pluginId);

    const newId = `user-midi-preset-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newPreset: VstMidiMappingPreset = {
      id: newId,
      name: presetName.trim() || 'Custom MIDI Mapping',
      pluginId,
      pluginName: manifest?.name || active.pluginName,
      author: 'User',
      description: description || `Custom MIDI hardware map for ${manifest?.name || 'plugin'}.`,
      controllerTemplate,
      isFactory: false,
      isDefault: false,
      createdAt: Date.now(),
      assignments: JSON.parse(JSON.stringify(active.assignments))
    };

    this.userPresets.set(newId, newPreset);
    this.saveUserPresets();
    playColliderInjectionSound();
    return newPreset;
  }

  /**
   * Delete a custom user preset
   */
  public deleteUserPreset(presetId: string): boolean {
    const deleted = this.userPresets.delete(presetId);
    if (deleted) {
      this.saveUserPresets();
      playLaserBeamSound('laser_erase');
    }
    return deleted;
  }

  /**
   * Sets a preset as the default mapping for that plugin
   */
  public setDefaultPreset(pluginId: string, presetId: string) {
    // Unset existing defaults in user presets for this plugin
    this.userPresets.forEach(p => {
      if (p.pluginId === pluginId) {
        p.isDefault = p.id === presetId;
      }
    });
    this.saveUserPresets();

    // Also load it as active
    this.loadPresetToPlugin(pluginId, presetId);
  }

  /**
   * Export all presets or presets for a plugin as formatted JSON
   */
  public exportPresetsAsJson(pluginId?: string): string {
    const list = pluginId
      ? this.getPresetsForPlugin(pluginId)
      : Array.from(this.userPresets.values());
    return JSON.stringify(list, null, 2);
  }

  /**
   * Import presets from a JSON file / string
   */
  public importPresetsFromJson(jsonStr: string): { importedCount: number; errors: string[] } {
    const errors: string[] = [];
    let count = 0;

    try {
      const parsed = JSON.parse(jsonStr);
      const items: VstMidiMappingPreset[] = Array.isArray(parsed) ? parsed : [parsed];

      items.forEach(item => {
        if (!item.name || !item.assignments || !Array.isArray(item.assignments)) {
          errors.push(`Preset missing valid name or assignments`);
          return;
        }

        const id = `imported-midi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const imported: VstMidiMappingPreset = {
          ...item,
          id,
          isFactory: false,
          createdAt: Date.now()
        };

        this.userPresets.set(id, imported);
        count++;
      });

      if (count > 0) {
        this.saveUserPresets();
        playColliderInjectionSound();
      }
    } catch (e: any) {
      errors.push(`Invalid JSON format: ${e.message}`);
    }

    return { importedCount: count, errors };
  }

  /**
   * MIDI Learn target management
   */
  public startLearning(pluginId: string, paramId: string) {
    this.learningTarget = { pluginId, paramId };
    playLaserBeamSound('laser_select');
    this.notify();
  }

  public cancelLearning() {
    this.learningTarget = null;
    playLaserBeamSound('laser_select');
    this.notify();
  }

  public getLearningTarget(): { pluginId: string; paramId: string } | null {
    return this.learningTarget;
  }

  private bindLearnedParameter(pluginId: string, paramId: string, ccNumber: number, channel: number, deviceName?: string) {
    const active = this.getActiveMapping(pluginId);
    const existing = active.assignments.find(a => a.paramId === paramId);

    if (existing) {
      existing.ccNumber = ccNumber;
      existing.channel = channel;
      existing.hardwareLabel = deviceName ? `${deviceName} CC ${ccNumber}` : `CC ${ccNumber}`;
      existing.enabled = true;
    } else {
      const manifest = vstWrapperService.getManifest(pluginId);
      const paramDef = manifest?.parameters.find(p => p.id === paramId);
      active.assignments.push({
        paramId,
        paramName: paramDef?.name || paramId,
        ccNumber,
        channel,
        min: paramDef?.min ?? 0,
        max: paramDef?.max ?? 100,
        curve: paramDef?.curve || 'linear',
        hardwareLabel: deviceName ? `${deviceName} CC ${ccNumber}` : `CC ${ccNumber}`,
        enabled: true
      });
    }

    this.activeMappings.set(pluginId, { ...active });
    this.saveActiveMappings();
  }

  /**
   * Virtual MIDI Simulation for testing parameter automation without physical gear
   */
  public simulateMidiCc(ccNumber: number, value: number, channel: number = 1) {
    midiLearnService.simulateMidiMessage(channel, ccNumber, value);
  }
}

export const vstMidiMappingService = new VstMidiMappingService();
