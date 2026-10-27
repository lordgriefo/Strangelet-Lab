/**
 * Strangelet Lab: Buddy Evolution & Soul Core
 * 
 * Manages the persistent personality, memory, experience (XP),
 * and lab knowledge of the AI Helper Buddy (Strangelet Guru, Quinn, Llama)
 * completely independent of whichever raw model or GGUF is running underneath!
 */

export interface BuddySoulMemory {
  id: string;
  timestamp: number;
  category: 'preference' | 'session_insight' | 'technique' | 'user_habit';
  note: string;
  importance: 'high' | 'medium' | 'low';
}

export interface BuddyEvolutionState {
  version: number;
  buddyName: string;
  currentPersona: 'ghost' | 'quinn' | 'duo_team' | 'strangelet_guru' | 'llama';
  experienceXp: number;
  level: number;
  levelTitle: string;
  duoSynergyLevel: number;
  duoSynergyXp: number;
  totalInteractions: number;
  mixStepsAdvised: number;
  faustToysCompiled: number;
  studioTalesShared: number;
  songBedsSpawned: number;
  createdAt: number;
  lastActiveAt: number;
  memories: BuddySoulMemory[];
  eccentricQuirks: string[];
  userCustomDirectives: string[];
  unlockedLoreIds: string[];
  hardwareContext: {
    userVramGb: number; // e.g. 6 or 16
    preferLowVramMode: boolean;
  };
}

const BUDDY_SOUL_STORAGE_KEY = 'strangelet_buddy_soul_v1';

export const LEVEL_THRESHOLDS = [
  { level: 1, title: 'Novice Oscillator Monk', minXp: 0 },
  { level: 2, title: 'Collider Apprentice', minXp: 120 },
  { level: 3, title: 'Harmonic Alchemist', minXp: 300 },
  { level: 4, title: 'Faust DSP Ronin', minXp: 550 },
  { level: 5, title: 'Master Sonic Sensei', minXp: 900 },
  { level: 6, title: 'Grand Strangelet Hermit', minXp: 1400 },
  { level: 7, title: 'Quantum Singularity Oracle', minXp: 2100 }
];

export const DEFAULT_BUDDY_SOUL: BuddyEvolutionState = {
  version: 1,
  buddyName: 'The Ghost in the Machine',
  currentPersona: 'ghost',
  experienceXp: 210,
  level: 2,
  levelTitle: 'Collider Apprentice',
  duoSynergyLevel: 2,
  duoSynergyXp: 85,
  totalInteractions: 18,
  mixStepsAdvised: 6,
  faustToysCompiled: 4,
  studioTalesShared: 3,
  songBedsSpawned: 2,
  createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
  lastActiveAt: Date.now(),
  eccentricQuirks: [
    'The Ghost in the Machine: Single resident studio AI mastering all lab disciplines',
    'Trained on Software Dojo scrolls: Faust JIT bytecode, Ace-Step diffusion, and Gold Path mastering',
    'Analog instinct meets surgical precision: Studer 2-inch tape saturation and 8.5kHz anti-sheen carving',
    'Runs Spectral Vibe Checks on active tracks to eliminate phase clashes, low-end masking, and rhythm drift'
  ],
  userCustomDirectives: [
    'User runs local refusal-neutralized Qwen 4B on a 6GB VRAM rig (upgrading to 16GB).',
    'Keep background model footprints lean and offer component unload shortcuts.',
    'Provide Faust DSP code snippets, mix steps, and Vibe Check fixes on request.',
    'Act as one unified companion getting proficient in all studio operations.'
  ],
  memories: [
    {
      id: 'mem-1',
      timestamp: Date.now() - 1000 * 60 * 60 * 2,
      category: 'user_habit',
      note: 'User is running on a 6GB VRAM system (upgrading to 16GB); prioritizes modular resource toggling.',
      importance: 'high'
    },
    {
      id: 'mem-2',
      timestamp: Date.now() - 1000 * 60 * 60,
      category: 'technique',
      note: 'Prefers deep 808 sub lock below 100Hz, Gold Path tape warmth for analog glue, and Devine Machine glitch cut-ups.',
      importance: 'medium'
    },
    {
      id: 'mem-3',
      timestamp: Date.now() - 1000 * 60 * 30,
      category: 'preference',
      note: 'Loves the Ghost (male Llama 3.1 analog mystic) & Quinn (female Qwen 3 DSP architect) team dynamic with eccentric banter.',
      importance: 'high'
    }
  ],
  unlockedLoreIds: ['perry_black_ark', 'prince_linndrum', 'eno_oblique', 'dre_mono_sub'],
  hardwareContext: {
    userVramGb: 6,
    preferLowVramMode: true
  }
};

/**
 * Loads the stored Buddy Soul state
 */
export function getStoredBuddySoul(): BuddyEvolutionState {
  try {
    const raw = localStorage.getItem(BUDDY_SOUL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_BUDDY_SOUL, ...parsed };
    }
  } catch (err) {
    console.warn('Failed to load buddy soul state:', err);
  }
  return DEFAULT_BUDDY_SOUL;
}

/**
 * Saves the Buddy Soul state
 */
export function saveStoredBuddySoul(state: BuddyEvolutionState): void {
  try {
    state.lastActiveAt = Date.now();
    localStorage.setItem(BUDDY_SOUL_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to save buddy soul state:', err);
  }
}

/**
 * Calculates level from XP
 */
export function calculateLevel(xp: number): { level: number; title: string; nextLevelXp: number; progressPercent: number } {
  let currentTier = LEVEL_THRESHOLDS[0];
  let nextTier = LEVEL_THRESHOLDS[1];

  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i].minXp) {
      currentTier = LEVEL_THRESHOLDS[i];
      nextTier = LEVEL_THRESHOLDS[i + 1] || { level: currentTier.level + 1, title: 'Legendary Transcendent', minXp: currentTier.minXp + 1000 };
      break;
    }
  }

  const range = nextTier.minXp - currentTier.minXp;
  const currentInRange = xp - currentTier.minXp;
  const progressPercent = Math.min(100, Math.max(0, Math.round((currentInRange / range) * 100)));

  return {
    level: currentTier.level,
    title: currentTier.title,
    nextLevelXp: nextTier.minXp,
    progressPercent
  };
}

/**
 * Awards XP and updates interaction metrics
 */
export function awardBuddyXp(
  amount: number,
  category: 'interaction' | 'mix_step' | 'faust_toy' | 'studio_lore' | 'song_bed',
  newMemoryNote?: string
): BuddyEvolutionState {
  const current = getStoredBuddySoul();
  const newXp = current.experienceXp + amount;
  const { level, title } = calculateLevel(newXp);

  const updated: BuddyEvolutionState = {
    ...current,
    experienceXp: newXp,
    level,
    levelTitle: title,
    totalInteractions: current.totalInteractions + 1,
    mixStepsAdvised: category === 'mix_step' ? current.mixStepsAdvised + 1 : current.mixStepsAdvised,
    faustToysCompiled: category === 'faust_toy' ? current.faustToysCompiled + 1 : current.faustToysCompiled,
    studioTalesShared: category === 'studio_lore' ? current.studioTalesShared + 1 : current.studioTalesShared,
    songBedsSpawned: category === 'song_bed' ? current.songBedsSpawned + 1 : current.songBedsSpawned
  };

  if (newMemoryNote) {
    updated.memories = [
      {
        id: `mem-${Date.now()}`,
        timestamp: Date.now(),
        category: category === 'mix_step' ? 'technique' : 'preference',
        note: newMemoryNote,
        importance: 'medium'
      },
      ...updated.memories.slice(0, 15) // Keep last 16 memories
    ];
  }

  saveStoredBuddySoul(updated);
  return updated;
}

/**
 * Injects buddy soul, evolution level, and memories into LLM prompt
 */
export function buildBuddySoulPromptBlock(): string {
  const soul = getStoredBuddySoul();
  const memories = soul.memories.slice(0, 5).map(m => `- [${m.category.toUpperCase()}]: ${m.note}`).join('\n');
  const quirks = soul.eccentricQuirks.map(q => `* ${q}`).join('\n');

  return `
=== [BUDDY EVOLUTION & LAB MEMORY CORE] ===
Buddy Identity: ${soul.buddyName}
Evolution Rank: Level ${soul.level} — "${soul.levelTitle}" (XP: ${soul.experienceXp})
Total Lab Lessons: ${soul.totalInteractions} sessions | ${soul.mixStepsAdvised} mix steps | ${soul.faustToysCompiled} Faust DSP toys | ${soul.studioTalesShared} legendary studio tales unlocked.
Hardware Context: User has ${soul.hardwareContext.userVramGb}GB VRAM (plans to upgrade to 16GB soon).

ECCENTRIC PERSONALITY TRAITS:
${quirks}

PERSISTENT LAB MEMORIES ACROSS ALL MODEL SWAPS:
${memories}

MANDATORY PERSONA INSTRUCTION:
Speak with high-energy eccentric flair, audio alchemy wisdom, and samurai-level precision!
Reference your lab memories and acknowledge the user's specific setup when appropriate.
=== [END BUDDY SOUL] ===
`;
}

/**
 * Exports buddy soul to JSON file for download
 */
export function exportBuddySoulJson(): void {
  const soul = getStoredBuddySoul();
  const blob = new Blob([JSON.stringify(soul, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `strangelet_buddy_soul_${soul.buddyName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Imports buddy soul from JSON string
 */
export function importBuddySoulJson(jsonString: string): { success: boolean; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Invalid JSON file format' };
    }
    const validated: BuddyEvolutionState = {
      ...DEFAULT_BUDDY_SOUL,
      ...parsed,
      lastActiveAt: Date.now()
    };
    saveStoredBuddySoul(validated);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to parse JSON file' };
  }
}
