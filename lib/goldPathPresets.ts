import { GoldPathPreset, GoldPathStageToggles, GoldPathChainParameters } from '../types';
import { masterAudioBus } from './masterBus';

export type { GoldPathPreset, GoldPathStageToggles, GoldPathChainParameters };

export const FACTORY_GOLD_PATH_PRESETS: GoldPathPreset[] = [
  {
    id: 'factory-gp-audiophile',
    name: 'Gold Path: Transparent Audiophile Master',
    category: 'Factory',
    description: 'Ultra-clean dynamic mastering with transparent peak containment, untouched transients, and linear-phase tonal balance (-14 LUFS).',
    author: 'Strangelet Acoustic Labs',
    createdAt: '2026-01-01',
    masterIntensity: 0.45,
    stages: {
      matchering: false,
      multiband: true,
      limiter: true,
      vst: false,
      spectralAnalysis: true,
      batchProcessing: false,
      tapeSaturation: false,
      stereoImager: true
    },
    parameters: {
      lowCutHz: 26,
      highCutHz: 21500,
      deMudGainDb: -1.2,
      presenceAirDb: +1.4,
      matchDepth: 25,
      referenceProfile: 'Transparent Hi-Fi Reference',
      smoothing: 3.8,
      compressionThresholdDb: -12,
      glueRatio: 2.0,
      releaseMs: 140,
      attackMs: 30,
      tapeWarmth: 12,
      harmonicCharacter: 'clean',
      stereoWidth: 102,
      monoSubCutoffHz: 100,
      ceilingDb: -1.0,
      targetLufs: -14.0,
      truePeakLimit: true
    }
  },
  {
    id: 'factory-gp-tape-glue',
    name: 'Gold Path: 1960s Velvet Tape & Tube Glue',
    category: 'Factory',
    description: 'Lush analog warmth, rounded high-end transients, rich second-order tube harmonics, and vintage console cohesion.',
    author: 'Twin Peaks Soundstage',
    createdAt: '2026-01-01',
    masterIntensity: 0.65,
    stages: {
      matchering: true,
      multiband: true,
      limiter: true,
      vst: false,
      spectralAnalysis: true,
      batchProcessing: false,
      tapeSaturation: true,
      stereoImager: true
    },
    parameters: {
      lowCutHz: 32,
      highCutHz: 18500,
      deMudGainDb: -2.8,
      presenceAirDb: +2.2,
      matchDepth: 68,
      referenceProfile: 'Warm 1960s Tape',
      smoothing: 2.6,
      compressionThresholdDb: -15,
      glueRatio: 3.2,
      releaseMs: 180,
      attackMs: 20,
      tapeWarmth: 58,
      harmonicCharacter: 'tape',
      stereoWidth: 116,
      monoSubCutoffHz: 120,
      ceilingDb: -0.8,
      targetLufs: -12.5,
      truePeakLimit: true
    }
  },
  {
    id: 'factory-gp-modern-pop',
    name: 'Gold Path: Modern Streaming Pop & Club (-9 LUFS)',
    category: 'Factory',
    description: 'High-energy commercial density, punchy transients, tight sub-mono focus, and competitive streaming loudness.',
    author: 'Neon Grid Studios',
    createdAt: '2026-01-01',
    masterIntensity: 0.78,
    stages: {
      matchering: true,
      multiband: true,
      limiter: true,
      vst: false,
      spectralAnalysis: true,
      batchProcessing: false,
      tapeSaturation: true,
      stereoImager: true
    },
    parameters: {
      lowCutHz: 30,
      highCutHz: 20000,
      deMudGainDb: -3.2,
      presenceAirDb: +3.2,
      matchDepth: 82,
      referenceProfile: 'Modern Pop Loudness',
      smoothing: 2.0,
      compressionThresholdDb: -18,
      glueRatio: 4.2,
      releaseMs: 75,
      attackMs: 12,
      tapeWarmth: 42,
      harmonicCharacter: 'transformer',
      stereoWidth: 128,
      monoSubCutoffHz: 130,
      ceilingDb: -0.3,
      targetLufs: -9.0,
      truePeakLimit: true
    }
  },
  {
    id: 'factory-gp-suno-desheen',
    name: 'Gold Path: Suno AI Un-Bake & De-Sheen',
    category: 'Factory',
    description: 'Surgical de-mud notch at 380Hz for cardboard boxiness, aggressive de-harshing on 8-11kHz metallic sheen, restored dynamic punch.',
    author: 'AI Artifact Remediation Lab',
    createdAt: '2026-01-01',
    masterIntensity: 0.60,
    stages: {
      matchering: true,
      multiband: true,
      limiter: true,
      vst: false,
      spectralAnalysis: true,
      batchProcessing: false,
      tapeSaturation: true,
      stereoImager: true
    },
    parameters: {
      lowCutHz: 35,
      highCutHz: 19000,
      deMudGainDb: -4.5,
      presenceAirDb: +1.8,
      matchDepth: 75,
      referenceProfile: 'Suno AI Un-Bake Reference',
      smoothing: 2.2,
      compressionThresholdDb: -14,
      glueRatio: 2.8,
      releaseMs: 110,
      attackMs: 25,
      tapeWarmth: 38,
      harmonicCharacter: 'tube',
      stereoWidth: 112,
      monoSubCutoffHz: 120,
      ceilingDb: -0.5,
      targetLufs: -13.0,
      truePeakLimit: true
    }
  },
  {
    id: 'factory-gp-808-slam',
    name: 'Gold Path: Hip-Hop & 808 Heavyweight Slam',
    category: 'Factory',
    description: 'Reinforced sub-bass foundation (35-65Hz), crisp vocal bite, aggressive glue compression, and controlled sub headroom.',
    author: 'Strangelet Sub-Bass Lab',
    createdAt: '2026-01-01',
    masterIntensity: 0.82,
    stages: {
      matchering: true,
      multiband: true,
      limiter: true,
      vst: false,
      spectralAnalysis: true,
      batchProcessing: false,
      tapeSaturation: true,
      stereoImager: true
    },
    parameters: {
      lowCutHz: 28,
      highCutHz: 20500,
      deMudGainDb: -2.2,
      presenceAirDb: +2.6,
      matchDepth: 86,
      referenceProfile: 'Urban 808 Slam Reference',
      smoothing: 1.8,
      compressionThresholdDb: -20,
      glueRatio: 4.8,
      releaseMs: 65,
      attackMs: 10,
      tapeWarmth: 50,
      harmonicCharacter: 'tube',
      stereoWidth: 122,
      monoSubCutoffHz: 140,
      ceilingDb: -0.2,
      targetLufs: -8.5,
      truePeakLimit: true
    }
  },
  {
    id: 'factory-gp-lynchian-velvet',
    name: 'Gold Path: Lynchian Dreamscape / Dark Ambient',
    category: 'Factory',
    description: 'Deep hypnotic low-end weight, velvety tape flutter saturation, atmospheric wide stereo field, and softened upper glass.',
    author: 'Red Room Reverie',
    createdAt: '2026-01-01',
    masterIntensity: 0.58,
    stages: {
      matchering: true,
      multiband: true,
      limiter: true,
      vst: false,
      spectralAnalysis: true,
      batchProcessing: false,
      tapeSaturation: true,
      stereoImager: true
    },
    parameters: {
      lowCutHz: 20,
      highCutHz: 16500,
      deMudGainDb: -1.6,
      presenceAirDb: -0.8,
      matchDepth: 60,
      referenceProfile: 'Lynchian Ambient Velvet',
      smoothing: 4.2,
      compressionThresholdDb: -16,
      glueRatio: 2.2,
      releaseMs: 260,
      attackMs: 40,
      tapeWarmth: 68,
      harmonicCharacter: 'tape',
      stereoWidth: 148,
      monoSubCutoffHz: 90,
      ceilingDb: -1.2,
      targetLufs: -16.0,
      truePeakLimit: true
    }
  },
  {
    id: 'factory-gp-acoustic-natural',
    name: 'Gold Path: Acoustic & Classical Preservation (-16 LUFS)',
    category: 'Factory',
    description: 'Wide acoustic depth, natural room reverb decay, transparent crest factor, gentle bus glue without pumping.',
    author: 'Philharmonic Hall Master',
    createdAt: '2026-01-01',
    masterIntensity: 0.35,
    stages: {
      matchering: false,
      multiband: true,
      limiter: true,
      vst: false,
      spectralAnalysis: true,
      batchProcessing: false,
      tapeSaturation: false,
      stereoImager: true
    },
    parameters: {
      lowCutHz: 22,
      highCutHz: 22000,
      deMudGainDb: -0.5,
      presenceAirDb: +0.6,
      matchDepth: 18,
      referenceProfile: 'Concert Hall Natural',
      smoothing: 4.6,
      compressionThresholdDb: -8,
      glueRatio: 1.6,
      releaseMs: 220,
      attackMs: 50,
      tapeWarmth: 6,
      harmonicCharacter: 'clean',
      stereoWidth: 104,
      monoSubCutoffHz: 80,
      ceilingDb: -1.5,
      targetLufs: -16.0,
      truePeakLimit: true
    }
  }
];

export const STORAGE_KEY_GOLD_PATH_PRESETS = 'strangelet_gold_path_presets';
export const STORAGE_KEY_ACTIVE_PRESET_ID = 'strangelet_gold_path_active_preset_id';

/**
 * Loads all Gold Path presets (Factory + User presets from LocalStorage)
 */
export function loadAllGoldPathPresets(): GoldPathPreset[] {
  if (typeof window === 'undefined') {
    return [...FACTORY_GOLD_PATH_PRESETS];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_GOLD_PATH_PRESETS);
    if (!raw) {
      return [...FACTORY_GOLD_PATH_PRESETS];
    }
    const userPresets: GoldPathPreset[] = JSON.parse(raw);
    if (Array.isArray(userPresets)) {
      return [...FACTORY_GOLD_PATH_PRESETS, ...userPresets];
    }
  } catch (err) {
    console.warn('Failed to parse Gold Path user presets from localStorage', err);
  }

  return [...FACTORY_GOLD_PATH_PRESETS];
}

/**
 * Saves a new or updated user preset to LocalStorage
 */
export function saveUserGoldPathPreset(preset: GoldPathPreset): GoldPathPreset[] {
  if (typeof window === 'undefined') return [...FACTORY_GOLD_PATH_PRESETS];

  try {
    const all = loadAllGoldPathPresets();
    const existingIndex = all.findIndex(p => p.id === preset.id);

    const userPresetToSave: GoldPathPreset = {
      ...preset,
      category: 'User',
      createdAt: preset.createdAt || new Date().toISOString().split('T')[0]
    };

    let updatedUserPresets: GoldPathPreset[] = [];
    const raw = localStorage.getItem(STORAGE_KEY_GOLD_PATH_PRESETS);
    const existingUserPresets: GoldPathPreset[] = raw ? JSON.parse(raw) : [];

    const userIndex = existingUserPresets.findIndex(p => p.id === preset.id);
    if (userIndex >= 0) {
      existingUserPresets[userIndex] = userPresetToSave;
      updatedUserPresets = existingUserPresets;
    } else {
      updatedUserPresets = [...existingUserPresets, userPresetToSave];
    }

    localStorage.setItem(STORAGE_KEY_GOLD_PATH_PRESETS, JSON.stringify(updatedUserPresets));
    localStorage.setItem(STORAGE_KEY_ACTIVE_PRESET_ID, userPresetToSave.id);

    return [...FACTORY_GOLD_PATH_PRESETS, ...updatedUserPresets];
  } catch (err) {
    console.error('Error saving user preset to localStorage', err);
    return loadAllGoldPathPresets();
  }
}

/**
 * Deletes a user preset from LocalStorage
 */
export function deleteUserGoldPathPreset(presetId: string): GoldPathPreset[] {
  if (typeof window === 'undefined') return [...FACTORY_GOLD_PATH_PRESETS];

  try {
    const raw = localStorage.getItem(STORAGE_KEY_GOLD_PATH_PRESETS);
    if (raw) {
      const existingUserPresets: GoldPathPreset[] = JSON.parse(raw);
      const filtered = existingUserPresets.filter(p => p.id !== presetId);
      localStorage.setItem(STORAGE_KEY_GOLD_PATH_PRESETS, JSON.stringify(filtered));
    }
  } catch (err) {
    console.error('Error deleting user preset from localStorage', err);
  }

  return loadAllGoldPathPresets();
}

/**
 * Exports a Gold Path preset as a formatted JSON string
 */
export function exportGoldPathPresetJson(preset: GoldPathPreset): string {
  return JSON.stringify({
    schema: 'strangelet-gold-path-preset-v1',
    exportedAt: new Date().toISOString(),
    preset
  }, null, 2);
}

/**
 * Imports and validates a Gold Path preset from a JSON string
 */
export function importGoldPathPresetJson(jsonString: string): GoldPathPreset {
  const parsed = JSON.parse(jsonString);
  const data = parsed.preset || parsed;

  if (!data.name || typeof data.name !== 'string') {
    throw new Error('Invalid Gold Path preset: Missing preset name.');
  }

  const newId = `user-gp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const importedPreset: GoldPathPreset = {
    id: newId,
    name: data.name.includes('(Imported)') ? data.name : `${data.name} (Imported)`,
    category: 'User',
    description: data.description || 'Custom imported Gold Path chain configuration.',
    author: data.author || 'User Import',
    createdAt: new Date().toISOString().split('T')[0],
    masterIntensity: typeof data.masterIntensity === 'number' ? Math.max(0, Math.min(1, data.masterIntensity)) : 0.6,
    stages: {
      matchering: !!data.stages?.matchering,
      multiband: data.stages?.multiband !== false,
      limiter: data.stages?.limiter !== false,
      vst: !!data.stages?.vst,
      spectralAnalysis: data.stages?.spectralAnalysis !== false,
      batchProcessing: !!data.stages?.batchProcessing,
      tapeSaturation: !!data.stages?.tapeSaturation,
      stereoImager: data.stages?.stereoImager !== false
    },
    parameters: {
      lowCutHz: Number(data.parameters?.lowCutHz) || 28,
      highCutHz: Number(data.parameters?.highCutHz) || 20000,
      deMudGainDb: Number(data.parameters?.deMudGainDb) ?? -2.0,
      presenceAirDb: Number(data.parameters?.presenceAirDb) ?? 1.5,
      matchDepth: Number(data.parameters?.matchDepth) ?? 60,
      referenceProfile: data.parameters?.referenceProfile || 'Analog Console Glue',
      smoothing: Number(data.parameters?.smoothing) || 2.5,
      compressionThresholdDb: Number(data.parameters?.compressionThresholdDb) ?? -14,
      glueRatio: Number(data.parameters?.glueRatio) || 3.0,
      releaseMs: Number(data.parameters?.releaseMs) || 120,
      attackMs: Number(data.parameters?.attackMs) || 20,
      tapeWarmth: Number(data.parameters?.tapeWarmth) ?? 35,
      harmonicCharacter: data.parameters?.harmonicCharacter || 'tape',
      stereoWidth: Number(data.parameters?.stereoWidth) || 115,
      monoSubCutoffHz: Number(data.parameters?.monoSubCutoffHz) || 120,
      ceilingDb: Number(data.parameters?.ceilingDb) ?? -0.5,
      targetLufs: Number(data.parameters?.targetLufs) ?? -14.0,
      truePeakLimit: data.parameters?.truePeakLimit !== false
    }
  };

  saveUserGoldPathPreset(importedPreset);
  return importedPreset;
}

/**
 * Synchronizes Gold Path chain parameters with the live Master Parametric EQ filters in masterAudioBus
 */
export function syncGoldPathToMasterBus(preset: GoldPathPreset) {
  try {
    const currentBands = masterAudioBus.getBands();
    const updatedBands = currentBands.map(band => {
      // Band 1: Low Cut / HPF
      if (band.id === 'band-1' || band.type === 'highpass') {
        return {
          ...band,
          frequency: preset.parameters.lowCutHz,
          enabled: true
        };
      }
      // Band 3: De-Mud Notch (around 400Hz)
      if (band.id === 'band-3') {
        return {
          ...band,
          gain: preset.parameters.deMudGainDb,
          enabled: true
        };
      }
      // Band 5: Presence / Air or Anti-Sheen
      if (band.id === 'band-5') {
        return {
          ...band,
          gain: preset.parameters.presenceAirDb,
          enabled: true
        };
      }
      // Band 6: High Cut / LPF
      if (band.id === 'band-6' || band.type === 'lowpass') {
        return {
          ...band,
          frequency: preset.parameters.highCutHz,
          enabled: true
        };
      }
      return band;
    });

    masterAudioBus.setAllBands(updatedBands);
  } catch (err) {
    // Non-fatal if audio context not yet active
  }
}
