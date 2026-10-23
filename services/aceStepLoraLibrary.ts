/**
 * Strangelet Lab: Ace-Step 1.5 LoRA Lending Library
 * 
 * Provides community and boutique LoRA adapters for Ace-Step neural diffusion models.
 * Users can borrow, activate, stack, adjust weights, and lend/share custom LoRAs!
 */

import { AceStepLora } from '../types';

const LORA_STORAGE_KEY = 'strangelet_acestep_lora_library';

export const INITIAL_ACESTEP_LORAS: AceStepLora[] = [
  {
    id: 'lora-lofi-tape',
    name: 'Cassette Degradation Tape Haze v2',
    triggerWord: 'lofi-tape-decay',
    author: 'ReelToReelSage',
    description: 'Imbues generations with authentic wow & flutter pitch drift, magnetic tape saturation, rolled-off high frequencies, and 1980s micro-dropouts.',
    genre: 'Lo-Fi / Vintage',
    recommendedWeight: 0.85,
    active: false,
    currentWeight: 0.85,
    fileSizeMb: 124.0,
    tags: ['Tape', 'Cassette', 'Warmth', 'Lo-Fi', 'Wow & Flutter', 'Analog'],
    sonicCharacter: 'Smoky, nostalgic, subtle pitch flutter and tape compression'
  },
  {
    id: 'lora-sp1200-crunch',
    name: 'Golden-Era SP-1200 12-Bit Ring',
    triggerWord: 'sp1200-crunch',
    author: 'DillaCartel',
    description: 'Emulates the legendary E-mu SP-1200 26.04kHz 12-bit linear DAC sampling architecture with punchy mid-range transient snap and aliasing bite.',
    genre: 'Boom-Bap / Hip-Hop',
    recommendedWeight: 0.90,
    active: false,
    currentWeight: 0.90,
    fileSizeMb: 98.5,
    tags: ['SP-1200', '12-Bit', 'Boom-Bap', 'Drums', 'Emu', 'Crunch'],
    sonicCharacter: 'Aggressive transient attack, 12-bit grit, chunky kick drums'
  },
  {
    id: 'lora-minneapolis-funk',
    name: '80s Minneapolis Hyper-Funk & Gated Punch',
    triggerWord: 'prince-linn-groove',
    author: 'PaisleyParkGhost',
    description: 'Tuned LinnDrum transients, envelope-filtered slap bass punch, tight dry gated reverbs, and bouncy syncopated pocket swing.',
    genre: 'Funk / Minneapolis Sound',
    recommendedWeight: 0.80,
    active: false,
    currentWeight: 0.80,
    fileSizeMb: 112.0,
    tags: ['Funk', 'Prince', 'LinnDrum', 'Slap Bass', 'Gated Reverb', '80s'],
    sonicCharacter: 'Laser-precise rhythmic snap, envelope-filtered squelch'
  },
  {
    id: 'lora-dark-ambient-drone',
    name: 'Glacial Sub-Zero Dark Ambient Drone',
    triggerWord: 'glacial-sub-drone',
    author: 'NordicVoid',
    description: 'Extends diffusion decay times into infinite glacial soundscapes. Massive sub-harmonic resonance, eerie drifting pitch clusters, and subterranean rumble.',
    genre: 'Ambient / Drone / Cinematic',
    recommendedWeight: 1.0,
    active: false,
    currentWeight: 1.0,
    fileSizeMb: 140.0,
    tags: ['Dark Ambient', 'Drone', 'Glacial', 'Cinematic', 'Sub Rumble'],
    sonicCharacter: 'Vast frozen atmospheres, subterranean depth, infinite decay'
  },
  {
    id: 'lora-devine-matrix-glitch',
    name: 'Devine Machine Matrix Glitch & IDM',
    triggerWord: 'devine-matrix-glitch',
    author: 'BurroughsCutUp',
    description: 'Generates micro-stutter granular bursts, bit-crushed resonant chirps, and asymmetric rhythm divisions inspired by the Devine Machine cut-up engine.',
    genre: 'Glitch / IDM / Experimental',
    recommendedWeight: 0.75,
    active: false,
    currentWeight: 0.75,
    fileSizeMb: 108.0,
    tags: ['Devine Machine', 'Glitch', 'IDM', 'Granular', 'Micro-Stutter'],
    sonicCharacter: 'Surgical cybernetic chops, metallic ratchets, wonky syncopation'
  },
  {
    id: 'lora-neo-soul-velvet',
    name: 'Neo-Soul Satin Velvet Rhodes & Epiano',
    triggerWord: 'velvet-keys-dilla',
    author: 'SoulquarianVibe',
    description: 'Trains the diffusion model on lush 9th/11th chord voicings, drunken micro-timing swing, and rich bell-like mechanical tines with tube vibrato.',
    genre: 'Neo-Soul / Jazz / R&B',
    recommendedWeight: 0.85,
    active: false,
    currentWeight: 0.85,
    fileSizeMb: 116.5,
    tags: ['Neo-Soul', 'Rhodes', 'Chords', 'Dilla Swing', 'Velvet', 'Warm'],
    sonicCharacter: 'Lush harmonic depth, laid-back pocket, velvet tube warmth'
  },
  {
    id: 'lora-drill-808-warp',
    name: 'Drill 808 Sliding Sub Warp Matrix',
    triggerWord: 'drill-808-warp',
    author: 'LondonSlideKing',
    description: 'Hyper-responsive glide-tuned 808 pitch slides, saturated 3rd harmonic upper sizzle that cuts through phone speakers, and explosive sub drops.',
    genre: 'UK / NY Drill / Trap',
    recommendedWeight: 0.95,
    active: false,
    currentWeight: 0.95,
    fileSizeMb: 89.0,
    tags: ['808', 'Drill', 'Pitch Slide', 'Sub Bass', 'Saturation', 'Trap'],
    sonicCharacter: 'Menacing pitch slides, aggressive upper-mid bite, earth-shaking sub'
  },
  {
    id: 'lora-faust-strings',
    name: 'Faustian Micro-Tuned Chamber Strings',
    triggerWord: 'faust-chamber-silk',
    author: 'WasmSpectralGuild',
    description: 'Blends physical acoustic bow modeling with microtonal just-intonation intervals for hauntingly pure orchestral harmonics and rosin grit.',
    genre: 'Modern Classical / Avant-Garde',
    recommendedWeight: 0.80,
    active: false,
    currentWeight: 0.80,
    fileSizeMb: 130.0,
    tags: ['Faust', 'Chamber', 'Strings', 'Microtonal', 'Rosin', 'Orchestral'],
    sonicCharacter: 'Expressive organic bow friction, pure resonant string overtone'
  }
];

export function getStoredAceStepLoras(): AceStepLora[] {
  try {
    const raw = localStorage.getItem(LORA_STORAGE_KEY);
    if (!raw) return INITIAL_ACESTEP_LORAS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_ACESTEP_LORAS;
  } catch (err) {
    return INITIAL_ACESTEP_LORAS;
  }
}

export function saveStoredAceStepLoras(loras: AceStepLora[]): void {
  try {
    localStorage.setItem(LORA_STORAGE_KEY, JSON.stringify(loras));
  } catch (err) {
    console.warn('Failed to save Ace-Step LoRAs to localStorage:', err);
  }
}

export function toggleLoraActive(loraId: string): AceStepLora[] {
  const current = getStoredAceStepLoras();
  const updated = current.map(l => l.id === loraId ? { ...l, active: !l.active } : l);
  saveStoredAceStepLoras(updated);
  return updated;
}

export function updateLoraWeight(loraId: string, weight: number): AceStepLora[] {
  const current = getStoredAceStepLoras();
  const updated = current.map(l => l.id === loraId ? { ...l, currentWeight: Math.max(0.1, Math.min(1.5, weight)) } : l);
  saveStoredAceStepLoras(updated);
  return updated;
}

export function addCustomLora(lora: Omit<AceStepLora, 'id'>): AceStepLora {
  const current = getStoredAceStepLoras();
  const created: AceStepLora = {
    ...lora,
    id: `lora-custom-${Date.now()}`,
    isCustomUploaded: true
  };
  const updated = [created, ...current];
  saveStoredAceStepLoras(updated);
  return created;
}

/**
 * Builds an injected prompt string incorporating active LoRA trigger tokens and guidance
 */
export function injectActiveLorasIntoPrompt(basePrompt: string): { prompt: string; activeCount: number; lorasUsed: string[] } {
  const loras = getStoredAceStepLoras().filter(l => l.active);
  if (loras.length === 0) {
    return { prompt: basePrompt, activeCount: 0, lorasUsed: [] };
  }

  const triggers = loras.map(l => `<lora:${l.triggerWord}:${l.currentWeight.toFixed(2)}>`).join(' ');
  const keywords = loras.map(l => l.tags.slice(0, 2).join(', ')).join(', ');
  
  const mergedPrompt = `${basePrompt}, ${triggers}, with ${keywords} sonic signature`;
  return {
    prompt: mergedPrompt,
    activeCount: loras.length,
    lorasUsed: loras.map(l => `${l.name} (${(l.currentWeight * 100).toFixed(0)}%)`)
  };
}
