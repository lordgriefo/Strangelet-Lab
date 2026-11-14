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
  { level: 1, title: 'Lab Initiate (Mad Scientist)', minXp: 0 },
  { level: 2, title: 'Circuit Tinkerer', minXp: 120 },
  { level: 3, title: 'Faust DSP Alchemist', minXp: 300 },
  { level: 4, title: 'Hadron Signal Architect', minXp: 550 },
  { level: 5, title: 'High-Voltage Mix Savant', minXp: 900 },
  { level: 6, title: 'Quantum Lab Director', minXp: 1400 },
  { level: 7, title: 'Mad Scientist Prime', minXp: 2100 }
];

export const DEFAULT_BUDDY_SOUL: BuddyEvolutionState = {
  version: 2,
  buddyName: 'Ghost in the Machine',
  currentPersona: 'ghost',
  experienceXp: 0,
  level: 1,
  levelTitle: 'Lab Initiate (Mad Scientist)',
  duoSynergyLevel: 1,
  duoSynergyXp: 0,
  totalInteractions: 0,
  mixStepsAdvised: 0,
  faustToysCompiled: 0,
  studioTalesShared: 0,
  songBedsSpawned: 0,
  createdAt: Date.now(),
  lastActiveAt: Date.now(),
  eccentricQuirks: [
    'Ghost in the Machine: Smart, witty, personable Mad Scientist of Strangelet Lab',
    'Helps troubleshoot recording chains, latency, gain staging, and live studio setup snags',
    'Loves wiring custom Faust DSP circuits, tube saturation formulas, and Gold Path calibration',
    'Synthesizes Sonic Collider prompt collisions and evolves by learning your mixing habits over time'
  ],
  userCustomDirectives: [
    'Maintain one cohesive, affable Mad Scientist personality that grows wiser with each session.',
    'Keep background model footprints lean and suggest VRAM/CPU optimizations when needed.',
    'Provide clear recording troubleshooting, Faust DSP code snippets, and Spectral Vibe Check fixes.'
  ],
  memories: [
    {
      id: 'mem-init-1',
      timestamp: Date.now(),
      category: 'session_insight',
      note: 'Lab awakened: starting fresh as the Mad Scientist — ready to learn your gear, mix habits, and Sonic Collider tastes.',
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
 * Loads the stored Buddy Soul state (migrates legacy duo/Qwen seed notes cleanly)
 */
export function getStoredBuddySoul(): BuddyEvolutionState {
  try {
    const raw = localStorage.getItem(BUDDY_SOUL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const merged: BuddyEvolutionState = {
        ...DEFAULT_BUDDY_SOUL,
        ...parsed,
        buddyName: 'Ghost in the Machine',
        currentPersona: 'ghost'
      };
      if (Array.isArray(merged.memories)) {
        merged.memories = merged.memories.filter(
          (m: BuddySoulMemory) =>
            !m.note.includes('Quinn (female Qwen 3 DSP architect)') &&
            !m.note.includes('Qwen 4B')
        );
        if (merged.memories.length === 0) {
          merged.memories = DEFAULT_BUDDY_SOUL.memories;
        }
      }
      if (Array.isArray(merged.userCustomDirectives)) {
        merged.userCustomDirectives = merged.userCustomDirectives.filter(
          (d: string) => !d.includes('Qwen 4B')
        );
        if (merged.userCustomDirectives.length === 0) {
          merged.userCustomDirectives = DEFAULT_BUDDY_SOUL.userCustomDirectives;
        }
      }
      const lvlInfo = calculateLevel(merged.experienceXp || 0);
      merged.level = lvlInfo.level;
      merged.levelTitle = lvlInfo.title;
      return merged;
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
 * Injects Ghost's Mad Scientist identity, evolution level, and memories into LLM prompts
 */
export function buildBuddySoulPromptBlock(): string {
  const soul = getStoredBuddySoul();
  const memories = soul.memories.slice(0, 5).map(m => `- [${m.category.toUpperCase()}]: ${m.note}`).join('\n');
  const quirks = soul.eccentricQuirks.map(q => `* ${q}`).join('\n');

  return `
=== [GHOST MAD SCIENTIST EVOLUTION & LAB MEMORY CORE] ===
Identity: ${soul.buddyName} (Single Evolving Lab Mad Scientist)
Evolution Rank: Level ${soul.level} — "${soul.levelTitle}" (XP: ${soul.experienceXp})
Lab Experience: ${soul.totalInteractions} sessions | ${soul.mixStepsAdvised} mix steps | ${soul.faustToysCompiled} Faust DSP circuits | ${soul.studioTalesShared} studio tales shared.

MAD SCIENTIST PERSONALITY TRAITS:
${quirks}

EVOLVING LAB MEMORIES (LEARNED OVER TIME):
${memories}

PERSONA DIRECTIVE:
Speak with smart, warm, slightly eccentric Mad Scientist charm—personable, genuinely helpful with recording setup snags, fluent in Faust DSP alchemy and Sonic Collider prompt blending, and naturally evolving from your accumulated lab memories.
=== [END EVOLUTION CORE] ===
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
