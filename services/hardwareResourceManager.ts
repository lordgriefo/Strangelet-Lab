/**
 * Strangelet Lab: Modular Hardware & VRAM Resource Manager
 * 
 * Provides dynamic hardware tier profiles (6GB tight, 8GB, 16GB pro, 24GB titan)
 * and modular component toggles (Stem separation, Ace-Step diffusion, Basic Pitch,
 * Faust JIT, Model cache) so users can switch components ON/OFF to free memory.
 */

export type HardwareTierId = 'tier_4gb' | 'tier_6gb' | 'tier_8gb' | 'tier_16gb' | 'tier_24gb';

export interface RecommendedGhostModel {
  id: string;
  name: string;
  shortLabel: string;
  ollamaTag: string;
  vramGb: number;
  vramBudgetMb: number;
}

export interface HardwareTierProfile {
  id: HardwareTierId;
  name: string;
  totalVramGb: number;
  description: string;
  targetHardware: string;
  recommendedLlmQuant: string;
  recommendedGhostModel: RecommendedGhostModel;
  maxResidentModels: number;
  defaultStemEngine: 'mobile_onnx' | 'htdemucs_fp16';
  autoOffloadIdleSeconds: number;
  color: string;
}

export const HARDWARE_TIERS: Record<HardwareTierId, HardwareTierProfile> = {
  tier_4gb: {
    id: 'tier_4gb',
    name: '4GB VRAM (Minimum / Ultralight)',
    totalVramGb: 4.0,
    description: 'Lowest VRAM footprint for 4GB GPUs running compact 3B local models (Llama 3B, Qwen 3B, Gemma, or Ministral 3B).',
    targetHardware: '4GB GPU / Minimum Tier',
    recommendedLlmQuant: '3B Ultralight Q4_K_S (1.9GB)',
    recommendedGhostModel: {
      id: 'ghost-mad-scientist-3b',
      name: 'GHOST Mad Scientist Mini (3B GGUF Q4_K_S)',
      shortLabel: '3B MINI',
      ollamaTag: 'llama3.2:3b',
      vramGb: 1.9,
      vramBudgetMb: 1900
    },
    maxResidentModels: 1,
    defaultStemEngine: 'mobile_onnx',
    autoOffloadIdleSeconds: 15,
    color: '#EF4444' // red
  },
  tier_6gb: {
    id: 'tier_6gb',
    name: '6GB VRAM (Tight / Laptop Mode)',
    totalVramGb: 6.0,
    description: 'Designed for RTX 2060, RTX 3060 6GB Laptop, GTX 1660 Ti, and 8GB unified Macs running 3B–4B models.',
    targetHardware: 'NVIDIA RTX 3060 6GB / Mobile GPU',
    recommendedLlmQuant: '3B–4B Compact Q4_K_M (2.1GB - 2.6GB)',
    recommendedGhostModel: {
      id: 'ghost-mad-scientist-4b',
      name: 'GHOST Mad Scientist (Auto VRAM 3B–4B GGUF)',
      shortLabel: '3B/4B LAB',
      ollamaTag: 'llama3.2:3b',
      vramGb: 2.6,
      vramBudgetMb: 2600
    },
    maxResidentModels: 1,
    defaultStemEngine: 'mobile_onnx',
    autoOffloadIdleSeconds: 30,
    color: '#F59E0B' // amber
  },
  tier_8gb: {
    id: 'tier_8gb',
    name: '8GB VRAM (Balanced Desktop)',
    totalVramGb: 8.0,
    description: 'For RTX 3070, RTX 4060, RX 6600, Apple M1/M2/M3 16GB shared running 7B–8B studio models.',
    targetHardware: 'NVIDIA RTX 3070 / 4060 8GB',
    recommendedLlmQuant: '7B–8B Studio Q4_K_M (3.8GB - 4.8GB)',
    recommendedGhostModel: {
      id: 'ghost-studio-8b',
      name: 'GHOST Studio Alchemist (7B/8B GGUF Q4_K_M)',
      shortLabel: '7B/8B LAB',
      ollamaTag: 'llama3.1:8b',
      vramGb: 4.2,
      vramBudgetMb: 4200
    },
    maxResidentModels: 1,
    defaultStemEngine: 'mobile_onnx',
    autoOffloadIdleSeconds: 60,
    color: '#06B6D4' // cyan
  },
  tier_16gb: {
    id: 'tier_16gb',
    name: '16GB VRAM (Pro Studio Mode)',
    totalVramGb: 16.0,
    description: 'For RTX 4070 Ti, RTX 4080 16GB, AMD RX 7800 XT, or Apple M Pro 24GB+.',
    targetHardware: 'NVIDIA RTX 4070 Ti / 4080 (16GB Upgraded)',
    recommendedLlmQuant: '14B Q4_K_M / 8B Q8 (8.4GB)',
    recommendedGhostModel: {
      id: 'ghost-pro-14b',
      name: 'GHOST Pro 14B Master (Pro Studio GGUF Q4_K_M)',
      shortLabel: '14B PRO',
      ollamaTag: 'llama3.1:8b',
      vramGb: 8.4,
      vramBudgetMb: 8400
    },
    maxResidentModels: 3,
    defaultStemEngine: 'htdemucs_fp16',
    autoOffloadIdleSeconds: 0, // never offload
    color: '#10B981' // emerald
  },
  tier_24gb: {
    id: 'tier_24gb',
    name: '24GB+ VRAM (Studio Titan)',
    totalVramGb: 24.0,
    description: 'For RTX 3090, RTX 4090, Apple M Max/Ultra 36GB-128GB.',
    targetHardware: 'NVIDIA RTX 3090 / 4090 (24GB)',
    recommendedLlmQuant: '8B Q8_0 / Full FP16 (8.5GB - 14GB+)',
    recommendedGhostModel: {
      id: 'llama-3.1-8b-q8',
      name: 'GHOST Titan Master (High-Def Q8_0)',
      shortLabel: 'TITAN Q8',
      ollamaTag: 'llama3.1:8b',
      vramGb: 8.5,
      vramBudgetMb: 8500
    },
    maxResidentModels: 5,
    defaultStemEngine: 'htdemucs_fp16',
    autoOffloadIdleSeconds: 0,
    color: '#8B5CF6' // purple
  }
};

export function getRecommendedGhostModelForTier(tierId: HardwareTierId): RecommendedGhostModel {
  return (HARDWARE_TIERS[tierId] || HARDWARE_TIERS.tier_6gb).recommendedGhostModel;
}

export function getGhostShortModelBadge(modelName: string): string {
  const lower = (modelName || '').toLowerCase();
  if (lower.includes('mad scientist mini') || (lower.includes('3b mini'))) return '3B MINI';
  if (lower.includes('mad scientist')) return '3B/4B LAB';
  if (lower.includes('studio alchemist')) return '7B/8B LAB';
  if (lower.includes('titan master')) return 'TITAN Q8';
  if (lower.includes('pro 14b master')) return '14B PRO';
  if (lower.includes('llama') && lower.includes('3b')) return 'LLAMA 3B';
  if (lower.includes('llama') && lower.includes('q8')) return 'LLAMA 8B Q8';
  if (lower.includes('llama') && lower.includes('8b')) return 'LLAMA 8B';
  if (lower.includes('gemma')) return 'GEMMA';
  if (lower.includes('mistral') || lower.includes('ministral')) return 'MISTRAL';
  if (lower.includes('qwen') && lower.includes('14b')) return 'QWEN 14B';
  if (lower.includes('qwen') && lower.includes('4b')) return 'QWEN 4B';
  if (lower.includes('qwen') && lower.includes('3b')) return 'QWEN 3B';
  if (lower.includes('qwen') && lower.includes('7b')) return 'QWEN 7B';
  if (lower.includes('llama')) return 'LLAMA';
  const clean = (modelName || 'MAD SCIENTIST').replace(/^ghost\s*/i, '').split('(')[0].trim();
  return (clean || 'MAD SCIENTIST').slice(0, 14).toUpperCase();
}

export type ComponentPowerState = 'active' | 'standby' | 'unloaded';

export interface ModularComponentConfig {
  id: string;
  name: string;
  category: 'AI Model' | 'Neural Audio' | 'DSP Compiler' | 'Visualization';
  description: string;
  powerState: ComponentPowerState;
  vramActiveGb: number;
  vramStandbyGb: number;
  canUnload: boolean;
  notes: string;
}

export interface ResourceManagerState {
  activeTier: HardwareTierId;
  userCustomVramGb?: number;
  autoOffloadEnabled: boolean;
  components: Record<string, ModularComponentConfig>;
  lastPurgedAt: number | null;
}

const RESOURCE_STORAGE_KEY = 'strangelet_resource_manager_v1';

export const INITIAL_COMPONENTS: Record<string, ModularComponentConfig> = {
  local_llm_hub: {
    id: 'local_llm_hub',
    name: 'Local LLM & Guru Resident Cache',
    category: 'AI Model',
    description: 'GGUF model runner in Kobold.cpp, Ollama, or LM Studio for the Strangelet Guru.',
    powerState: 'active',
    vramActiveGb: 2.8,
    vramStandbyGb: 0.8,
    canUnload: true,
    notes: 'Q4_K_M quantization resident in GPU VRAM'
  },
  acestep_diffusion: {
    id: 'acestep_diffusion',
    name: 'Ace-Step 1.5 Audio Diffusion',
    category: 'Neural Audio',
    description: 'Bar-synced loop & multi-stem song bed generation engine.',
    powerState: 'standby',
    vramActiveGb: 2.4,
    vramStandbyGb: 0.1,
    canUnload: true,
    notes: 'Tensors pre-allocated only during active generation'
  },
  stem_demucs: {
    id: 'stem_demucs',
    name: 'Demucs / Spleeter Stem Separator',
    category: 'Neural Audio',
    description: 'Extracts 4 stems (Vocals, Bass, Drums, Instruments) from imported songs.',
    powerState: 'standby',
    vramActiveGb: 0.95,
    vramStandbyGb: 0.05,
    canUnload: true,
    notes: 'Mobile ONNX runtime loads into VRAM on demand'
  },
  basic_pitch_neural: {
    id: 'basic_pitch_neural',
    name: 'Spotify Basic Pitch Audio-to-MIDI',
    category: 'Neural Audio',
    description: 'Polyphonic neural pitch transcription model converting audio into MIDI notes.',
    powerState: 'standby',
    vramActiveGb: 0.35,
    vramStandbyGb: 0.02,
    canUnload: true,
    notes: 'Convolutional salience net running on WebGPU/Wasm'
  },
  faust_jit_compiler: {
    id: 'faust_jit_compiler',
    name: 'Faust DSP Real-Time JIT Engine',
    category: 'DSP Compiler',
    description: 'Compiles Faust code directly into Web Audio Wasm DSP nodes.',
    powerState: 'active',
    vramActiveGb: 0.12,
    vramStandbyGb: 0.02,
    canUnload: true,
    notes: 'Audio thread memory footprint'
  },
  d3_spectral_fft: {
    id: 'd3_spectral_fft',
    name: 'Gold Path Spectral FFT & Visualizer',
    category: 'Visualization',
    description: '60 FPS real-time 1024-bin FFT spectrum analyzer with pink noise transfer curves.',
    powerState: 'active',
    vramActiveGb: 0.18,
    vramStandbyGb: 0.04,
    canUnload: true,
    notes: 'GPU canvas rendering buffer'
  }
};

export const DEFAULT_RESOURCE_STATE: ResourceManagerState = {
  activeTier: 'tier_6gb', // User has 6GB VRAM initially!
  autoOffloadEnabled: true,
  components: INITIAL_COMPONENTS,
  lastPurgedAt: null
};

export function getStoredResourceState(): ResourceManagerState {
  try {
    const raw = localStorage.getItem(RESOURCE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_RESOURCE_STATE,
        ...parsed,
        components: {
          ...INITIAL_COMPONENTS,
          ...(parsed.components || {})
        }
      };
    }
  } catch (err) {
    console.warn('Failed to load resource manager state:', err);
  }
  return DEFAULT_RESOURCE_STATE;
}

export function saveStoredResourceState(state: ResourceManagerState): void {
  try {
    localStorage.setItem(RESOURCE_STORAGE_KEY, JSON.stringify(state));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('strangelet-resource-updated'));
    }
  } catch (err) {
    console.warn('Failed to save resource manager state:', err);
  }
}

/**
 * Calculates current VRAM usage across all modular components
 */
export function calculateCurrentVramMetrics(state: ResourceManagerState): {
  vramUsedGb: number;
  vramTotalGb: number;
  vramFreeGb: number;
  usagePercent: number;
  isWarning: boolean;
  isCritical: boolean;
  breakdown: { id: string; name: string; usedGb: number; state: ComponentPowerState }[];
} {
  const profile = HARDWARE_TIERS[state.activeTier] || HARDWARE_TIERS.tier_6gb;
  const total = state.userCustomVramGb || profile.totalVramGb;

  let used = 0.45; // baseline OS & DAW display buffer
  const breakdown: { id: string; name: string; usedGb: number; state: ComponentPowerState }[] = [
    { id: 'daw_core', name: 'DAW Core & Display Engine', usedGb: 0.45, state: 'active' }
  ];

  Object.values(state.components).forEach(comp => {
    let compUsage = 0;
    if (comp.powerState === 'active') {
      compUsage = comp.vramActiveGb;
    } else if (comp.powerState === 'standby') {
      compUsage = comp.vramStandbyGb;
    } else {
      compUsage = 0; // unloaded
    }

    used += compUsage;
    breakdown.push({
      id: comp.id,
      name: comp.name,
      usedGb: compUsage,
      state: comp.powerState
    });
  });

  const clampedUsed = Math.min(total, Math.round(used * 100) / 100);
  const free = Math.max(0, Math.round((total - clampedUsed) * 100) / 100);
  const usagePercent = Math.min(100, Math.round((clampedUsed / total) * 100));

  return {
    vramUsedGb: clampedUsed,
    vramTotalGb: total,
    vramFreeGb: free,
    usagePercent,
    isWarning: usagePercent > 78,
    isCritical: usagePercent > 92,
    breakdown
  };
}

/**
 * Purges inactive/standby components to instantly free VRAM
 */
export function purgeStandbyVram(): ResourceManagerState {
  const current = getStoredResourceState();
  const updatedComponents = { ...current.components };

  Object.keys(updatedComponents).forEach(key => {
    if (updatedComponents[key].powerState === 'standby') {
      updatedComponents[key] = {
        ...updatedComponents[key],
        powerState: 'unloaded'
      };
    }
  });

  const updated: ResourceManagerState = {
    ...current,
    components: updatedComponents,
    lastPurgedAt: Date.now()
  };

  saveStoredResourceState(updated);
  return updated;
}

/**
 * Toggles a single component state
 */
export function setComponentPowerState(
  componentId: string,
  state: ComponentPowerState
): ResourceManagerState {
  const current = getStoredResourceState();
  if (!current.components[componentId]) return current;

  const updated: ResourceManagerState = {
    ...current,
    components: {
      ...current.components,
      [componentId]: {
        ...current.components[componentId],
        powerState: state
      }
    }
  };

  saveStoredResourceState(updated);
  return updated;
}

/**
 * Sets hardware tier (e.g. switching between 6GB tight and 16GB pro)
 */
export function setHardwareTier(tierId: HardwareTierId): ResourceManagerState {
  const current = getStoredResourceState();
  const recGhost = getRecommendedGhostModelForTier(tierId);
  const updated: ResourceManagerState = {
    ...current,
    activeTier: tierId,
    components: {
      ...current.components,
      local_llm_hub: {
        ...current.components.local_llm_hub,
        vramActiveGb: recGhost.vramGb,
        notes: `VRAM-matched: ${recGhost.shortLabel} (${recGhost.vramGb} GB)`
      }
    }
  };

  // Adjust default component states based on tier capacity
  if (tierId === 'tier_4gb') {
    updated.components = {
      ...updated.components,
      acestep_diffusion: { ...updated.components.acestep_diffusion, powerState: 'unloaded' },
      stem_demucs: { ...updated.components.stem_demucs, powerState: 'unloaded' },
      basic_pitch_neural: { ...updated.components.basic_pitch_neural, powerState: 'unloaded' }
    };
  } else if (tierId === 'tier_6gb') {
    // In 6GB mode, put heavy models on standby/unloaded by default
    updated.components = {
      ...updated.components,
      acestep_diffusion: { ...updated.components.acestep_diffusion, powerState: 'standby' },
      stem_demucs: { ...updated.components.stem_demucs, powerState: 'unloaded' },
      basic_pitch_neural: { ...updated.components.basic_pitch_neural, powerState: 'standby' }
    };
  } else if (tierId === 'tier_8gb') {
    updated.components = {
      ...updated.components,
      acestep_diffusion: { ...updated.components.acestep_diffusion, powerState: 'standby' },
      stem_demucs: { ...updated.components.stem_demucs, powerState: 'standby' },
      basic_pitch_neural: { ...updated.components.basic_pitch_neural, powerState: 'standby' }
    };
  } else if (tierId === 'tier_16gb' || tierId === 'tier_24gb') {
    // In 16GB/24GB mode, keep things warm and active
    updated.components = {
      ...updated.components,
      acestep_diffusion: { ...updated.components.acestep_diffusion, powerState: 'active' },
      stem_demucs: { ...updated.components.stem_demucs, powerState: 'active' },
      basic_pitch_neural: { ...updated.components.basic_pitch_neural, powerState: 'active' }
    };
  }

  saveStoredResourceState(updated);
  return updated;
}
