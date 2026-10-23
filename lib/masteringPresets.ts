// Strangelet Lab - Mastering Preset System
// Configures and stores complete Mastering Configurations:
// 1. EQ Curves (6-Band Parametric + Pre-Cutoff points)
// 2. Compressor Settings (Threshold, Ratio, Attack, Release, Knee, Makeup Gain, Multiband)
// 3. Saturation Levels (Drive, Character, Warmth, Asymmetry, Ceiling)

import { 
  MasteringPreset, 
  MasteringEqBandConfig, 
  MasteringCompressorConfig, 
  MasteringSaturationConfig 
} from '../types';
import { masterAudioBus, ParametricEqBand } from './masterBus';

export const STORAGE_KEY_MASTERING_PRESETS = 'strangelet_mastering_presets_v1';
export const STORAGE_KEY_ACTIVE_MASTERING_PRESET_ID = 'strangelet_active_mastering_preset_id_v1';

export const FACTORY_MASTERING_PRESETS: MasteringPreset[] = [
  {
    id: 'factory-mp-transparent-audiophile',
    name: 'Transparent Audiophile Hi-Fi',
    category: 'Factory',
    description: 'Linear-phase tonal balance with 28Hz rumble cut, gentle 2.0:1 bus glue compression, and subtle 15% tape warmth. Retains pristine dynamic range at -14 LUFS.',
    author: 'Strangelet Acoustic Labs',
    createdAt: '2026-01-01',
    tags: ['Audiophile', 'Hi-Fi', 'Transparent', 'Streaming'],
    targetLufs: -14.0,
    ceilingDb: -1.0,
    stereoWidth: 104,
    eq: {
      curveName: 'Transparent Audiophile Hi-Fi Curve',
      lowCutHz: 28,
      highCutHz: 21500,
      deMudGainDb: -1.2,
      presenceAirDb: +1.4,
      bands: [
        { id: 'band-1', name: 'Low Cut / HPF', type: 'highpass', frequency: 28, gain: 0, q: 0.707, enabled: true },
        { id: 'band-2', name: 'Sub / Low Shelf', type: 'lowshelf', frequency: 95, gain: +0.6, q: 0.707, enabled: true },
        { id: 'band-3', name: 'De-Mud Notch', type: 'peaking', frequency: 390, gain: -1.2, q: 1.5, enabled: true },
        { id: 'band-4', name: 'Mid Clarity', type: 'peaking', frequency: 2500, gain: +0.8, q: 1.1, enabled: true },
        { id: 'band-5', name: 'Silky Air Sheen', type: 'highshelf', frequency: 12500, gain: +1.4, q: 0.707, enabled: true },
        { id: 'band-6', name: 'High Cut / LPF', type: 'lowpass', frequency: 21500, gain: 0, q: 0.707, enabled: true }
      ]
    },
    compressor: {
      thresholdDb: -12.0,
      ratio: 2.0,
      attackMs: 30,
      releaseMs: 150,
      kneeDb: 8.0,
      makeupGainDb: 1.5,
      multiband: true,
      enabled: true
    },
    saturation: {
      drivePercent: 15,
      warmthPercent: 20,
      character: 'clean',
      asymmetry: 5,
      ceilingDb: -1.0,
      enabled: true
    }
  },
  {
    id: 'factory-mp-suno-antisheen',
    name: 'Suno AI Anti-Sheen & Un-Bake',
    category: 'Factory',
    description: 'Surgical anti-metallic notch at 8.2kHz, boxiness scoop at 420Hz, smooth multiband dynamics, and 35% tape de-harsh warmth to restore natural analog acoustic life.',
    author: 'Strangelet Acoustic Labs',
    createdAt: '2026-01-01',
    tags: ['Anti-Sheen', 'AI De-Harsh', 'Suno Fix', 'Acoustic'],
    targetLufs: -13.5,
    ceilingDb: -0.8,
    stereoWidth: 110,
    eq: {
      curveName: 'Suno Anti-Sheen De-Metallic',
      lowCutHz: 34,
      highCutHz: 19500,
      deMudGainDb: -3.4,
      presenceAirDb: +2.0,
      bands: [
        { id: 'band-1', name: 'Low Cut / HPF', type: 'highpass', frequency: 34, gain: 0, q: 0.8, enabled: true },
        { id: 'band-2', name: 'Warm Bass Weight', type: 'lowshelf', frequency: 115, gain: +1.8, q: 0.707, enabled: true },
        { id: 'band-3', name: 'AI Boxiness De-Mud', type: 'peaking', frequency: 420, gain: -3.4, q: 2.1, enabled: true },
        { id: 'band-4', name: 'Vocal Presence', type: 'peaking', frequency: 2800, gain: +1.0, q: 1.3, enabled: true },
        { id: 'band-5', name: 'Anti-Sheen Notch', type: 'peaking', frequency: 8200, gain: -4.8, q: 2.4, enabled: true },
        { id: 'band-6', name: 'High Cut / LPF', type: 'lowpass', frequency: 19500, gain: 0, q: 0.707, enabled: true }
      ]
    },
    compressor: {
      thresholdDb: -15.0,
      ratio: 2.8,
      attackMs: 25,
      releaseMs: 120,
      kneeDb: 6.0,
      makeupGainDb: 2.2,
      multiband: true,
      enabled: true
    },
    saturation: {
      drivePercent: 35,
      warmthPercent: 45,
      character: 'tape',
      asymmetry: 12,
      ceilingDb: -0.8,
      enabled: true
    }
  },
  {
    id: 'factory-mp-modern-pop-loud',
    name: 'Modern Pop & Streaming (-9 LUFS)',
    category: 'Factory',
    description: 'High-density commercial punch, tight sub-mono low shelf, aggressive 4.2:1 VCA bus compression, and punchy transformer saturation for loud playlist dominance.',
    author: 'Neon Grid Studios',
    createdAt: '2026-01-01',
    tags: ['Modern Pop', 'Loudness', 'EDM', 'Punch'],
    targetLufs: -9.0,
    ceilingDb: -0.3,
    stereoWidth: 128,
    eq: {
      curveName: 'Modern Streaming Density',
      lowCutHz: 30,
      highCutHz: 20000,
      deMudGainDb: -2.8,
      presenceAirDb: +3.2,
      bands: [
        { id: 'band-1', name: 'Low Cut / HPF', type: 'highpass', frequency: 30, gain: 0, q: 0.9, enabled: true },
        { id: 'band-2', name: 'Sub Punch Boost', type: 'lowshelf', frequency: 85, gain: +2.5, q: 0.8, enabled: true },
        { id: 'band-3', name: 'Clarity Scoop', type: 'peaking', frequency: 350, gain: -2.8, q: 1.6, enabled: true },
        { id: 'band-4', name: 'Snap & Crack', type: 'peaking', frequency: 3200, gain: +1.8, q: 1.4, enabled: true },
        { id: 'band-5', name: 'Air Shimmer', type: 'highshelf', frequency: 11000, gain: +3.2, q: 0.707, enabled: true },
        { id: 'band-6', name: 'High Cut / LPF', type: 'lowpass', frequency: 20000, gain: 0, q: 0.707, enabled: true }
      ]
    },
    compressor: {
      thresholdDb: -18.0,
      ratio: 4.2,
      attackMs: 12,
      releaseMs: 75,
      kneeDb: 4.0,
      makeupGainDb: 4.5,
      multiband: true,
      enabled: true
    },
    saturation: {
      drivePercent: 52,
      warmthPercent: 38,
      character: 'transformer',
      asymmetry: 15,
      ceilingDb: -0.3,
      enabled: true
    }
  },
  {
    id: 'factory-mp-vintage-tape-glue',
    name: '1960s Velvet Tape & Tube Glue',
    category: 'Factory',
    description: 'Analog valve warmth, rounded high transients, slow optical-style compression with musical breathing, and lush 2nd-order tube harmonic saturation.',
    author: 'Twin Peaks Soundstage',
    createdAt: '2026-01-01',
    tags: ['Vintage', 'Tube', 'Analog Tape', 'Warmth'],
    targetLufs: -12.5,
    ceilingDb: -0.8,
    stereoWidth: 116,
    eq: {
      curveName: 'Vintage Velvet Analog Tilt',
      lowCutHz: 32,
      highCutHz: 18500,
      deMudGainDb: -2.4,
      presenceAirDb: +2.0,
      bands: [
        { id: 'band-1', name: 'Low Cut / HPF', type: 'highpass', frequency: 32, gain: 0, q: 0.707, enabled: true },
        { id: 'band-2', name: 'Tube Low Warmth', type: 'lowshelf', frequency: 120, gain: +2.2, q: 0.707, enabled: true },
        { id: 'band-3', name: 'Warm Mid Bell', type: 'peaking', frequency: 500, gain: -1.5, q: 1.2, enabled: true },
        { id: 'band-4', name: 'Velvet Presence', type: 'peaking', frequency: 2200, gain: +1.4, q: 1.1, enabled: true },
        { id: 'band-5', name: 'Vintage Roll-Off Air', type: 'highshelf', frequency: 9500, gain: +1.8, q: 0.6, enabled: true },
        { id: 'band-6', name: 'High Cut / LPF', type: 'lowpass', frequency: 18500, gain: 0, q: 0.707, enabled: true }
      ]
    },
    compressor: {
      thresholdDb: -14.0,
      ratio: 3.2,
      attackMs: 25,
      releaseMs: 220,
      kneeDb: 10.0,
      makeupGainDb: 2.8,
      multiband: false,
      enabled: true
    },
    saturation: {
      drivePercent: 68,
      warmthPercent: 75,
      character: 'tube',
      asymmetry: 25,
      ceilingDb: -0.8,
      enabled: true
    }
  },
  {
    id: 'factory-mp-club-banger-bass',
    name: 'Club Banger Sub & Transient Slap',
    category: 'Factory',
    description: 'Focused 45Hz sub-pass, kick transient punch at 80Hz, tight VCA compressor with rapid recovery, and analog console overdrive for heavy dancefloor systems.',
    author: 'Sub-Zero Soundworks',
    createdAt: '2026-01-01',
    tags: ['Club', 'Bass', 'Electronic', 'Trap'],
    targetLufs: -10.5,
    ceilingDb: -0.4,
    stereoWidth: 122,
    eq: {
      curveName: 'Club Sub Punch & Transient Focus',
      lowCutHz: 42,
      highCutHz: 19000,
      deMudGainDb: -3.0,
      presenceAirDb: +2.8,
      bands: [
        { id: 'band-1', name: 'Low Cut / HPF', type: 'highpass', frequency: 42, gain: 0, q: 0.95, enabled: true },
        { id: 'band-2', name: 'Kick Fundamental Boost', type: 'peaking', frequency: 80, gain: +3.4, q: 1.8, enabled: true },
        { id: 'band-3', name: 'Boxiness Scoop', type: 'peaking', frequency: 320, gain: -3.0, q: 1.9, enabled: true },
        { id: 'band-4', name: 'Synth Bite', type: 'peaking', frequency: 2600, gain: +1.5, q: 1.3, enabled: true },
        { id: 'band-5', name: 'Crisp Top End', type: 'highshelf', frequency: 10500, gain: +2.8, q: 0.707, enabled: true },
        { id: 'band-6', name: 'High Cut / LPF', type: 'lowpass', frequency: 19000, gain: 0, q: 0.707, enabled: true }
      ]
    },
    compressor: {
      thresholdDb: -16.5,
      ratio: 5.0,
      attackMs: 15,
      releaseMs: 65,
      kneeDb: 3.0,
      makeupGainDb: 3.8,
      multiband: true,
      enabled: true
    },
    saturation: {
      drivePercent: 48,
      warmthPercent: 32,
      character: 'console',
      asymmetry: 10,
      ceilingDb: -0.4,
      enabled: true
    }
  },
  {
    id: 'factory-mp-acoustic-classical',
    name: 'Acoustic & Orchestral Transparency',
    category: 'Factory',
    description: 'Natural acoustic instrument preservation with wide dynamics, ultra-transparent 1.6:1 soft-knee leveling, and whisper-quiet console harmonics at -16 LUFS.',
    author: 'Chamber Acoustics Lab',
    createdAt: '2026-01-01',
    tags: ['Acoustic', 'Orchestral', 'Folk', 'Dynamic'],
    targetLufs: -16.0,
    ceilingDb: -1.2,
    stereoWidth: 108,
    eq: {
      curveName: 'Acoustic Natural Transparency',
      lowCutHz: 24,
      highCutHz: 22000,
      deMudGainDb: -0.8,
      presenceAirDb: +1.0,
      bands: [
        { id: 'band-1', name: 'Low Cut / HPF', type: 'highpass', frequency: 24, gain: 0, q: 0.707, enabled: true },
        { id: 'band-2', name: 'Acoustic Body Shelf', type: 'lowshelf', frequency: 100, gain: +0.4, q: 0.707, enabled: true },
        { id: 'band-3', name: 'Wood Resonator Dip', type: 'peaking', frequency: 450, gain: -0.8, q: 1.2, enabled: true },
        { id: 'band-4', name: 'String Articulation', type: 'peaking', frequency: 3500, gain: +0.6, q: 1.0, enabled: true },
        { id: 'band-5', name: 'Open Air Lift', type: 'highshelf', frequency: 13000, gain: +1.2, q: 0.707, enabled: true },
        { id: 'band-6', name: 'High Cut / LPF', type: 'lowpass', frequency: 22000, gain: 0, q: 0.707, enabled: true }
      ]
    },
    compressor: {
      thresholdDb: -10.0,
      ratio: 1.6,
      attackMs: 40,
      releaseMs: 350,
      kneeDb: 14.0,
      makeupGainDb: 0.8,
      multiband: false,
      enabled: true
    },
    saturation: {
      drivePercent: 10,
      warmthPercent: 12,
      character: 'clean',
      asymmetry: 2,
      ceilingDb: -1.2,
      enabled: false
    }
  },
  {
    id: 'factory-mp-lofi-dusty-vinyl',
    name: 'Lofi Dusty Vinyl & Cassette Tape',
    category: 'Factory',
    description: 'Vintage bandwidth cap, warm midrange hump, slow pumping compressor rhythm, and heavy 78% analog tape harmonic saturation with pleasing tape hiss warmth.',
    author: 'Midnight Tape Deck',
    createdAt: '2026-01-01',
    tags: ['Lofi', 'Cassette', 'Vinyl', 'Chillhop'],
    targetLufs: -13.0,
    ceilingDb: -0.5,
    stereoWidth: 92,
    eq: {
      curveName: 'Lofi Cassette Bandpass & Warmth',
      lowCutHz: 48,
      highCutHz: 15500,
      deMudGainDb: +1.5,
      presenceAirDb: -2.0,
      bands: [
        { id: 'band-1', name: 'Low Cut / HPF', type: 'highpass', frequency: 48, gain: 0, q: 0.8, enabled: true },
        { id: 'band-2', name: 'Warm Thump', type: 'lowshelf', frequency: 130, gain: +2.8, q: 0.707, enabled: true },
        { id: 'band-3', name: 'Vintage Boxy Character', type: 'peaking', frequency: 650, gain: +1.8, q: 1.4, enabled: true },
        { id: 'band-4', name: 'Nostalgic Mid Bell', type: 'peaking', frequency: 2100, gain: +1.2, q: 1.0, enabled: true },
        { id: 'band-5', name: 'Tape Head Roll-Off', type: 'highshelf', frequency: 8000, gain: -3.5, q: 0.707, enabled: true },
        { id: 'band-6', name: 'High Cut / LPF', type: 'lowpass', frequency: 15500, gain: 0, q: 0.8, enabled: true }
      ]
    },
    compressor: {
      thresholdDb: -16.0,
      ratio: 3.5,
      attackMs: 35,
      releaseMs: 300,
      kneeDb: 8.0,
      makeupGainDb: 3.2,
      multiband: false,
      enabled: true
    },
    saturation: {
      drivePercent: 78,
      warmthPercent: 82,
      character: 'tape',
      asymmetry: 35,
      ceilingDb: -0.5,
      enabled: true
    }
  }
];

/**
 * Loads all user presets from localStorage combined with factory presets
 */
export function loadAllMasteringPresets(): MasteringPreset[] {
  if (typeof window === 'undefined') {
    return [...FACTORY_MASTERING_PRESETS];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_MASTERING_PRESETS);
    if (!raw) {
      return [...FACTORY_MASTERING_PRESETS];
    }
    const userPresets: MasteringPreset[] = JSON.parse(raw);
    const validUserPresets = userPresets.filter(p => p && p.id && p.name && p.eq && p.compressor && p.saturation);
    return [...FACTORY_MASTERING_PRESETS, ...validUserPresets];
  } catch (err) {
    console.error('Failed to load mastering presets from localStorage', err);
    return [...FACTORY_MASTERING_PRESETS];
  }
}

/**
 * Saves or updates a user mastering preset in localStorage
 */
export function saveUserMasteringPreset(preset: MasteringPreset): MasteringPreset[] {
  if (typeof window === 'undefined') return [...FACTORY_MASTERING_PRESETS];

  try {
    const raw = localStorage.getItem(STORAGE_KEY_MASTERING_PRESETS);
    let userPresets: MasteringPreset[] = raw ? JSON.parse(raw) : [];

    const existingIdx = userPresets.findIndex(p => p.id === preset.id);
    const sanitized: MasteringPreset = {
      ...preset,
      category: 'User',
      createdAt: preset.createdAt || new Date().toISOString().split('T')[0]
    };

    if (existingIdx >= 0) {
      userPresets[existingIdx] = sanitized;
    } else {
      userPresets.push(sanitized);
    }

    localStorage.setItem(STORAGE_KEY_MASTERING_PRESETS, JSON.stringify(userPresets));
    localStorage.setItem(STORAGE_KEY_ACTIVE_MASTERING_PRESET_ID, sanitized.id);
    return [...FACTORY_MASTERING_PRESETS, ...userPresets];
  } catch (err) {
    console.error('Failed to save user mastering preset', err);
    return [...FACTORY_MASTERING_PRESETS];
  }
}

/**
 * Deletes a user preset from localStorage
 */
export function deleteUserMasteringPreset(presetId: string): MasteringPreset[] {
  if (typeof window === 'undefined') return [...FACTORY_MASTERING_PRESETS];

  try {
    const raw = localStorage.getItem(STORAGE_KEY_MASTERING_PRESETS);
    if (!raw) return [...FACTORY_MASTERING_PRESETS];
    const userPresets: MasteringPreset[] = JSON.parse(raw);
    const filtered = userPresets.filter(p => p.id !== presetId);
    localStorage.setItem(STORAGE_KEY_MASTERING_PRESETS, JSON.stringify(filtered));
    return [...FACTORY_MASTERING_PRESETS, ...filtered];
  } catch (err) {
    console.error('Failed to delete user mastering preset', err);
    return [...FACTORY_MASTERING_PRESETS];
  }
}

/**
 * Exports a Mastering Preset as a JSON string
 */
export function exportMasteringPresetJson(preset: MasteringPreset): string {
  const exportPayload = {
    strangeletSchema: 'mastering-preset-v1',
    exportedAt: new Date().toISOString(),
    preset
  };
  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Imports a Mastering Preset from JSON string
 */
export function importMasteringPresetJson(jsonStr: string): MasteringPreset {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('Invalid JSON format for preset file.');
  }

  const data: MasteringPreset = parsed.preset || parsed;
  if (!data || !data.name || !data.eq || !data.compressor || !data.saturation) {
    throw new Error('Invalid Mastering Preset file structure: missing EQ, Compressor, or Saturation.');
  }

  const importedPreset: MasteringPreset = {
    id: `user-mp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    name: `${data.name} (Imported)`,
    category: 'User',
    description: data.description || 'Imported user mastering preset.',
    author: data.author || 'Mastering Engineer',
    createdAt: new Date().toISOString().split('T')[0],
    tags: Array.isArray(data.tags) ? data.tags : ['Imported'],
    targetLufs: Number(data.targetLufs) || -14.0,
    ceilingDb: Number(data.ceilingDb) || -1.0,
    stereoWidth: Number(data.stereoWidth) || 100,
    eq: {
      curveName: data.eq.curveName || `${data.name} Curve`,
      lowCutHz: Number(data.eq.lowCutHz) || 30,
      highCutHz: Number(data.eq.highCutHz) || 20000,
      deMudGainDb: Number(data.eq.deMudGainDb) || -1.5,
      presenceAirDb: Number(data.eq.presenceAirDb) || 1.5,
      bands: Array.isArray(data.eq.bands) && data.eq.bands.length > 0
        ? data.eq.bands.map((b: any, idx: number) => ({
            id: b.id || `band-${idx + 1}`,
            name: b.name || `Band ${idx + 1}`,
            type: b.type || 'peaking',
            frequency: Number(b.frequency) || 1000,
            gain: Number(b.gain) || 0,
            q: Number(b.q) || 1.0,
            enabled: b.enabled !== false
          }))
        : FACTORY_MASTERING_PRESETS[0].eq.bands
    },
    compressor: {
      thresholdDb: Number(data.compressor.thresholdDb) || -14,
      ratio: Number(data.compressor.ratio) || 3.0,
      attackMs: Number(data.compressor.attackMs) || 25,
      releaseMs: Number(data.compressor.releaseMs) || 150,
      kneeDb: Number(data.compressor.kneeDb) || 6,
      makeupGainDb: Number(data.compressor.makeupGainDb) || 2.0,
      multiband: data.compressor.multiband !== false,
      enabled: data.compressor.enabled !== false
    },
    saturation: {
      drivePercent: Number(data.saturation.drivePercent) || 25,
      warmthPercent: Number(data.saturation.warmthPercent) || 30,
      character: data.saturation.character || 'tape',
      asymmetry: Number(data.saturation.asymmetry) || 10,
      ceilingDb: Number(data.saturation.ceilingDb) || -1.0,
      enabled: data.saturation.enabled !== false
    }
  };

  saveUserMasteringPreset(importedPreset);
  return importedPreset;
}

/**
 * Synchronizes the entire mastering preset with the live audio hardware engine (masterAudioBus)
 */
export function syncMasteringPresetToBus(preset: MasteringPreset) {
  try {
    // 1. Sync Parametric EQ bands
    const currentBands = masterAudioBus.getBands();
    const updatedBands: ParametricEqBand[] = currentBands.map((band, idx) => {
      const presetBand = preset.eq.bands.find(b => b.id === band.id) || preset.eq.bands[idx];
      if (presetBand) {
        return {
          ...band,
          frequency: presetBand.frequency,
          gain: presetBand.gain,
          q: presetBand.q,
          type: presetBand.type as BiquadFilterType,
          enabled: presetBand.enabled
        };
      }
      return band;
    });

    masterAudioBus.setAllBands(updatedBands);

    // 2. Sync Compressor & Saturation to masterAudioBus if supported
    if (typeof (masterAudioBus as any).applyDynamicsAndSaturation === 'function') {
      (masterAudioBus as any).applyDynamicsAndSaturation(preset.compressor, preset.saturation);
    }
  } catch (err) {
    console.warn('Could not sync mastering preset to master audio bus', err);
  }
}
