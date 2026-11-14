// ============================================================================
// STRANGELET LAB - SONIC DATA SERVICE (services/sonicData.ts)
// Manages and exports musical and lyric configurations, presets, and category
// mappings for dynamic switching across Sonic Sector & Lyric Lab
// ============================================================================

import { 
  sonicSectorDB, 
  lyricLabDB, 
  tagDescriptions,
  musicPrompts,
  lyricPrompts,
  getCategoryGroup,
  getCategoryColor
} from '../lib/sonicSectorStaticData';
import { ColliderChip } from '../types';

export type SonicMode = 'sonic' | 'lyrics';

export interface SonicPreset {
  id: string;
  name: string;
  mode: SonicMode;
  category: string;
  subcategory?: string;
  description: string;
  tags: string[];
  bpm?: number;
  key?: string;
  promptSnippet: string;
  beamA?: string;
  beamB?: string;
  structure?: string;
  rhymeScheme?: string;
  chips?: Partial<ColliderChip>[];
}

export interface CategoryPresetGroup {
  category: string;
  mode: SonicMode;
  count: number;
  items: SonicPreset[];
}

// Re-export the core raw databases for direct access
export { 
  sonicSectorDB, 
  lyricLabDB, 
  tagDescriptions, 
  musicPrompts, 
  lyricPrompts,
  getCategoryGroup,
  getCategoryColor
};

// ============================================================================
// CURATED MASTER PRESETS: SONIC SECTOR
// ============================================================================

export const CURATED_SONIC_PRESETS: SonicPreset[] = [
  {
    id: 'sonic-cyber-darkwave',
    name: 'Cyberpunk Darkwave 2084',
    mode: 'sonic',
    category: 'Suno Genre Templates',
    subcategory: 'Electronic',
    description: 'Cold analog synthesizers, driving Rickenbacker bass, neon gated reverbs, and dystopian cityscape textures.',
    tags: ['darkwave', 'analog synthesizers', 'juno chorus', 'driving rickenbacker bass', '120 bpm', 'tape saturation'],
    bpm: 120,
    key: 'D minor',
    promptSnippet: 'darkwave, analog synthesizers, juno chorus, driving rickenbacker bass, 120 bpm, tape saturation'
  },
  {
    id: 'sonic-hyperpop-glitch',
    name: 'Hyperpop Quantum Glitch',
    mode: 'sonic',
    category: 'Suno Genre Templates',
    subcategory: 'Electronic - Bass Music & Club',
    description: 'Bitcrushed candy synths, rapid stutter vocal chops, hyperactive 808s, and bubblegum laser percussion.',
    tags: ['hyperpop', 'bitcrushed leads', 'pitched vocal chops', 'distorted 808s', '165 bpm', 'metallic snares'],
    bpm: 165,
    key: 'F# major',
    promptSnippet: 'hyperpop, bitcrushed leads, pitched vocal chops, distorted 808s, 165 bpm, metallic snares'
  },
  {
    id: 'sonic-shoegaze-wall',
    name: 'Infinite Reverb Shoegaze',
    mode: 'sonic',
    category: 'Alternative & Indie',
    subcategory: 'Shoegaze',
    description: 'Colossal wall of reverse reverb Fender Jazzmasters, submerged vocals, hazy bass, and thunderous drums.',
    tags: ['shoegaze', 'reverse reverb guitars', 'fuzz pedal cascade', 'buried vocals', '110 bpm', 'heavy room drums'],
    bpm: 110,
    key: 'A major',
    promptSnippet: 'shoegaze, reverse reverb guitars, fuzz pedal cascade, buried ethereal vocals, 110 bpm, heavy drums'
  },
  {
    id: 'sonic-doom-metal',
    name: 'Cosmic Funeral Doom',
    mode: 'sonic',
    category: 'Metal',
    subcategory: 'Doom Metal',
    description: 'Crushingly slow, low-tuned baritone guitars, mammoth drum strikes, cavernous growls, and bleak drones.',
    tags: ['funeral doom metal', 'drop A tuned guitars', 'cavernous reverb', 'glacial tempo', '55 bpm', 'monolithic drums'],
    bpm: 55,
    key: 'C minor',
    promptSnippet: 'funeral doom metal, drop A tuned guitars, cavernous reverb, glacial tempo, 55 bpm, monolithic drums'
  },
  {
    id: 'sonic-cinematic-scifi',
    name: 'Interstellar Nebula Score',
    mode: 'sonic',
    category: 'Cinematic Soundscapes',
    subcategory: 'Suno Micro-Packs',
    description: 'Sweeping orchestral strings, CS-80 brass swells, deep sub-bass rumbles, and celestial choir textures.',
    tags: ['cinematic score', 'yamaha cs-80 brass', 'swelling symphonic strings', 'sub-bass pulse', 'space drone'],
    bpm: 72,
    key: 'C minor',
    promptSnippet: 'cinematic score, yamaha cs-80 brass, swelling symphonic strings, sub-bass pulse, space drone'
  },
  {
    id: 'sonic-drill-uk',
    name: 'London Midnight Drill',
    mode: 'sonic',
    category: 'Hip Hop & Rap',
    subcategory: 'Drill',
    description: 'Sliding 808 glides, syncopated ghost snares, melancholic detuned piano loops, and aggressive punchy kicks.',
    tags: ['uk drill', 'sliding 808 sub', 'syncopated hi-hats', 'detuned grand piano', '140 bpm', 'dark street ambience'],
    bpm: 140,
    key: 'E minor',
    promptSnippet: 'uk drill, sliding 808 sub, syncopated hi-hats, detuned grand piano, 140 bpm, dark street ambience'
  },
  {
    id: 'sonic-analog-modular',
    name: 'Eurorack Generative Pulse',
    mode: 'sonic',
    category: 'Synths & Unusual Sounds',
    subcategory: 'Experimental / Modular',
    description: 'Complex self-oscillating Buchla modular bleeps, tape-delay feedback loops, and polyrhythmic pulse clocking.',
    tags: ['modular synth', 'buchla bongos', 'generative patch', 'tape echo feedback', '128 bpm', 'analog warmth'],
    bpm: 128,
    key: 'Modal',
    promptSnippet: 'modular synth, buchla bongos, generative patch, tape echo feedback, 128 bpm, analog warmth'
  },
  {
    id: 'sonic-lofi-jazzhop',
    name: 'Rainy Cafe 90s Lo-Fi',
    mode: 'sonic',
    category: 'Suno Instrument Stacks',
    subcategory: 'Lo-fi',
    description: 'Dusty vinyl static, warm Fender Rhodes chords, lazy unquantized swing drums, and muted jazz trumpet.',
    tags: ['lo-fi hip-hop', 'vinyl crackle', 'fender rhodes keys', 'swung boom-bap beat', '84 bpm', 'muted trumpet'],
    bpm: 84,
    key: 'Eb major 7',
    promptSnippet: 'lo-fi hip-hop, vinyl crackle, fender rhodes keys, swung boom-bap beat, 84 bpm, muted trumpet'
  },
  {
    id: 'sonic-folklore-ritual',
    name: 'Pagan Folk & Hurdy-Gurdy',
    mode: 'sonic',
    category: 'World & Regional',
    subcategory: 'Nordic Folk',
    description: 'Resonant hurdy-gurdy drone, bowed tagelharpa, deep shamanic frame drums, and ancient vocal chants.',
    tags: ['nordic dark folk', 'hurdy-gurdy drone', 'tagelharpa', 'shamanic frame drum', 'throat singing', 'ritual chant'],
    bpm: 95,
    key: 'D Dorian',
    promptSnippet: 'nordic dark folk, hurdy-gurdy drone, tagelharpa, shamanic frame drum, throat singing, ritual chant'
  },
  {
    id: 'sonic-acid-techno',
    name: 'TB-303 Acid Warehouse',
    mode: 'sonic',
    category: 'Electronic - Techno',
    subcategory: 'Acid Techno',
    description: 'Resonant Roland TB-303 acid squelch, distorted 909 kick drum, sizzling open hats, and strobe pulse.',
    tags: ['acid techno', 'roland tb-303 squelch', 'distorted 909 kick', 'warehouse reverb', '138 bpm', 'hypnotic'],
    bpm: 138,
    key: 'G minor',
    promptSnippet: 'acid techno, roland tb-303 squelch, distorted 909 kick, warehouse reverb, 138 bpm, hypnotic'
  }
];

// ============================================================================
// CURATED MASTER PRESETS: LYRIC LAB
// ============================================================================

export const CURATED_LYRIC_PRESETS: SonicPreset[] = [
  {
    id: 'lyric-bowie-glam-alien',
    name: 'Ziggy Stardust Cosmic Glam',
    mode: 'lyrics',
    category: 'Songwriting: The Masters',
    subcategory: 'Rock & Alternative',
    description: 'Apocalyptic theatrical glam, alien messiah mythos, fractured identity, and high-camp dramatic vocal hooks.',
    tags: ['david bowie', 'theatrical glam', 'cosmic alien', 'apocalyptic optimism', 'dramatic vocal octave jump'],
    beamA: 'Alien Messenger in Neon Metropoles',
    beamB: '70s Glam Rock Melodrama & Stardust',
    promptSnippet: 'glam rock, theatrical male vocals, acoustic 12-string, soaring guitar solo, string section, dramatic crescendo',
    structure: 'Intro - Verse - Verse - Chorus - Verse - Chorus - Guitar Solo - Outro',
    rhymeScheme: 'AABB Narrative Rhyme'
  },
  {
    id: 'lyric-burroughs-cutup',
    name: 'Burroughs Naked City Cut-Up',
    mode: 'lyrics',
    category: 'Lit: Postmodern Experimenters',
    subcategory: 'Beat Generation',
    description: 'Paranoid tape loops, spliced newspaper headlines, sinister medical conspiracies, and subterranean police states.',
    tags: ['william s burroughs', 'cut-up technique', 'naked lunch', 'paranoid cold war', 'dadaist stream of consciousness'],
    beamA: 'Interzone Tape-Recorder Hallucinations',
    beamB: 'Cold War Surveillance State & Police Sirens',
    promptSnippet: 'industrial noise rock, spoken word monologue, distorted bassline, tape delay oscillations, nervous drum breaks',
    structure: 'Spoken Intro - Fragmented Verse 1 - Break - Fragmented Verse 2 - Feedback Solo - Cut-up Outro',
    rhymeScheme: 'Unrhymed Burroughs Cut-up'
  },
  {
    id: 'lyric-lynch-red-room',
    name: 'Lynchian Red Room Dream-Pop',
    mode: 'lyrics',
    category: 'Vis: Directors of the Strange',
    subcategory: 'Surrealist Art House',
    description: 'Zigzag floors, red velvet curtains, backward phonetics, diner jukeboxes, and haunting romantic sadness.',
    tags: ['david lynch', 'twin peaks', 'backward singing', 'subconscious dream noir', 'uncanny romanticism'],
    beamA: 'Velvet Curtains & Backward Phonetics',
    beamB: '3 AM Rainy Diner Heartbreak & Neon Shadows',
    promptSnippet: 'dream pop, slow tremolo baritone guitar, lush electric piano, whispering female vocals, vintage tape hiss',
    structure: 'Intro - Verse 1 - Dream Sequence - Chorus - Verse 2 - Chorus - Ethereal Vocal Solo - Slow Fade Out',
    rhymeScheme: 'ABCB Melodic Whispers'
  },
  {
    id: 'lyric-cave-murder-ballad',
    name: 'Gothic Southern Murder Ballad',
    mode: 'lyrics',
    category: 'Songwriting: Storytellers & Architects',
    subcategory: 'Rock & Alternative',
    description: 'Old Testament fire and brimstone, dark creek beds, tragic revenge, biblical thunder, and gravelly baritone.',
    tags: ['nick cave', 'southern gothic', 'murder ballad', 'biblical retribution', 'haunted storytelling'],
    beamA: 'Old Testament Brimstone & Swampland Guilt',
    beamB: 'Late Night Gallows Confession',
    promptSnippet: 'southern gothic folk rock, dark grand piano, weeping violin, gravelly baritone vocals, brush snare pulse',
    structure: 'Story Intro - Stanza 1 - Stanza 2 - Refrain - Stanza 3 - Climax Chorus - Solemn Outro',
    rhymeScheme: 'AABB Folk Ballad Rhyme'
  },
  {
    id: 'lyric-quantum-eraser',
    name: 'Delayed-Choice Quantum Eraser',
    mode: 'lyrics',
    category: 'Bizarre: Philosophical & Scientific',
    subcategory: 'Physics & Forteana',
    description: 'Entangled photons changing the past upon observation, wave-particle duality, and irreversible mathematical grief.',
    tags: ['quantum mechanics', 'delayed-choice eraser', 'retrocausality', 'wavefunction collapse', 'spooky action'],
    beamA: 'Retrocausal Quantum Eraser & Photon Entanglement',
    beamB: 'Irreversible Goodbye Letter at the Train Station',
    promptSnippet: 'post-rock, clean math-rock guitars, swelling ambient synths, introspective vocals, dynamic explosive drop',
    structure: 'Ambient Intro - Verse 1 - Pre-Chorus - Chorus - Mathematical Bridge - Massive Drop - Cosmic Outro',
    rhymeScheme: 'ABAB Metaphysical Rhyme'
  },
  {
    id: 'lyric-cronenberg-biomech',
    name: 'Videodrome Flesh & Silicon',
    mode: 'lyrics',
    category: 'Vis: Horror & Cult',
    subcategory: 'Transgressive & Body Horror',
    description: 'Cathode ray tubes pulsing with biological tissue, magnetic tape in human skin, and techno-organic transmutation.',
    tags: ['david cronenberg', 'videodrome', 'body horror', 'cybernetic flesh', 'surveillance hallucination'],
    beamA: 'Cathode Ray Tube Hallucination & Organic Plastic',
    beamB: '90s Static Broadcast & Industrial Rust',
    promptSnippet: 'dark industrial, metallic clangs, rhythmic breathing synth, robotic vocoder, distorted bass drop',
    structure: 'Signal Intro - Verse 1 - Flesh Pre-Chorus - Chorus - Industrial Machine Solo - Static Outro',
    rhymeScheme: 'AABB Harsh Rhyme'
  },
  {
    id: 'lyric-boom-bap-alchemist',
    name: 'Golden Era 90s Street Philosophy',
    mode: 'lyrics',
    category: 'Lyrical Flow (Hip-Hop)',
    subcategory: 'Boom Bap',
    description: 'Complex multi-syllabic rhymes, chess metaphors, dusty soul crates, and gritty brownstone stoop wisdom.',
    tags: ['boom-bap', 'internal rhymes', 'five percenter wisdom', 'dusty vinyl samples', 'nas flow'],
    beamA: 'Mystical Urban Street Geometry & Chess Moves',
    beamB: '90s Cassette Dust & Brooklyn Fire Escapes',
    promptSnippet: 'classic boom-bap, dusty soul sample chop, hard-hitting 90s snare, upright bassline, vinyl crackle',
    structure: 'Intro / Dial-in - 16-Bar Verse 1 - Scratch Hook - 16-Bar Verse 2 - Scratch Hook - Outro Dialogue',
    rhymeScheme: 'Dense Multi-syllabic Internal Rhymes'
  },
  {
    id: 'lyric-cyberpunk-sprawl',
    name: 'Neuromancer Sprawl Run',
    mode: 'lyrics',
    category: 'Vis: Sci-Fi & Cyberpunk',
    subcategory: 'New Weird & Sci-Fi Lit',
    description: 'Chiba City neon rain, decking into cyberspace, black ice countermeasures, and carbon-fiber trenchcoats.',
    tags: ['william gibson', 'neuromancer', 'cyberspace matrix', 'chiba city', 'neon rain'],
    beamA: 'Cyberspace Matrix Decking & Black ICE Intrusion',
    beamB: 'Alleyway Rain & Cheap Cyberware Solder',
    promptSnippet: 'darksynth, driving 16th note bass arp, analog synth brass, punchy drums, filtered male vocals',
    structure: 'Boot-up Intro - Fast Verse 1 - Cyber Pre-Chorus - Anthem Chorus - Glitch Breakdown - Cyber Outro',
    rhymeScheme: 'AABB Cyberpunk Cadence'
  }
];

// ============================================================================
// SERVICE API & PRESET MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Get all available categories for a specific mode
 */
export function getPresetCategories(mode: SonicMode): string[] {
  if (mode === 'sonic') {
    return Object.keys(sonicSectorDB);
  } else {
    return Object.keys(lyricLabDB);
  }
}

/**
 * Get presets for a specific mode and category
 */
export function getPresetsForCategory(mode: SonicMode, category: string): SonicPreset[] {
  const curated = (mode === 'sonic' ? CURATED_SONIC_PRESETS : CURATED_LYRIC_PRESETS)
    .filter(p => p.category === category);

  const db = mode === 'sonic' ? sonicSectorDB : lyricLabDB;
  const rawItems = db[category] || [];

  // Generate dynamic presets from the raw DB entries
  const generated: SonicPreset[] = rawItems.map((item, idx) => {
    const desc = tagDescriptions[item] || tagDescriptions[category] || `Sonic configuration for ${item}`;
    const id = `${mode}-${category.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${idx}`;
    
    return {
      id,
      name: item,
      mode,
      category,
      description: desc,
      tags: [item.toLowerCase(), category.toLowerCase()],
      promptSnippet: mode === 'sonic' 
        ? `${item.toLowerCase()}, analog production, pristine studio mix` 
        : `in the evocative lyrical style of ${item}`,
      beamA: mode === 'lyrics' ? item : undefined,
      beamB: mode === 'lyrics' ? 'Late-Night Metaphysical Solitude' : undefined,
      structure: 'Verse - Chorus - Verse - Chorus - Bridge - Outro',
      rhymeScheme: 'AABB Melodic Rhyme'
    };
  });

  return [...curated, ...generated];
}

/**
 * Search presets across all categories for a given mode
 */
export function searchPresets(mode: SonicMode, query: string): SonicPreset[] {
  const cleanQ = query.toLowerCase().trim();
  if (!cleanQ) return getAllPresets(mode).slice(0, 30);

  const all = getAllPresets(mode);
  return all.filter(p => 
    p.name.toLowerCase().includes(cleanQ) ||
    p.category.toLowerCase().includes(cleanQ) ||
    p.description.toLowerCase().includes(cleanQ) ||
    p.tags.some(t => t.toLowerCase().includes(cleanQ))
  );
}

/**
 * Get all presets for a mode (curated + DB items)
 */
export function getAllPresets(mode: SonicMode): SonicPreset[] {
  const curated = mode === 'sonic' ? CURATED_SONIC_PRESETS : CURATED_LYRIC_PRESETS;
  const db = mode === 'sonic' ? sonicSectorDB : lyricLabDB;
  
  const generated: SonicPreset[] = [];
  Object.entries(db).forEach(([cat, list]) => {
    list.forEach((item, idx) => {
      generated.push({
        id: `${mode}-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${idx}`,
        name: item,
        mode,
        category: cat,
        description: tagDescriptions[item] || tagDescriptions[cat] || `Preset configuration for ${item}`,
        tags: [item.toLowerCase(), cat.toLowerCase()],
        promptSnippet: mode === 'sonic' 
          ? `${item.toLowerCase()}, studio mix, clear harmonics` 
          : `in the lyrical perspective of ${item}`,
        beamA: mode === 'lyrics' ? item : undefined,
        beamB: mode === 'lyrics' ? 'Superposition of Love and Decay' : undefined,
        structure: 'Verse - Chorus - Verse - Chorus - Bridge - Outro',
        rhymeScheme: 'AABB Melodic Rhyme'
      });
    });
  });

  return [...curated, ...generated];
}

/**
 * Get a random preset for a mode
 */
export function getRandomPreset(mode: SonicMode, category?: string): SonicPreset {
  const pool = category ? getPresetsForCategory(mode, category) : getAllPresets(mode);
  if (pool.length === 0) {
    return mode === 'sonic' ? CURATED_SONIC_PRESETS[0] : CURATED_LYRIC_PRESETS[0];
  }
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

/**
 * Converts a SonicPreset into ColliderChip objects ready for chamber injection
 */
export function convertPresetToChamberChips(preset: SonicPreset): ColliderChip[] {
  const chips: ColliderChip[] = [];
  const baseCategory = preset.category;
  const color = getCategoryColor(baseCategory);

  chips.push({
    id: `chip-${preset.id}-primary`,
    label: preset.name,
    category: 'genre',
    sidebarGroup: 'beam_a',
    color,
    description: preset.description,
    energyWeight: 0.9,
    tags: preset.tags
  });

  // Add tags as auxiliary particles
  preset.tags.slice(0, 3).forEach((tag, idx) => {
    chips.push({
      id: `chip-${preset.id}-tag-${idx}`,
      label: tag,
      category: idx % 2 === 0 ? 'instrument' : 'production',
      sidebarGroup: idx % 2 === 0 ? 'beam_a' : 'beam_b',
      color: idx % 2 === 0 ? '#A855F7' : '#F59E0B',
      description: `Sonic layer: ${tag}`,
      energyWeight: 0.75,
      tags: [tag]
    });
  });

  return chips;
}


export default {
  CURATED_SONIC_PRESETS,
  CURATED_LYRIC_PRESETS,
  getPresetCategories,
  getPresetsForCategory,
  searchPresets,
  getAllPresets,
  getRandomPreset,
  convertPresetToChamberChips,
  sonicSectorDB,
  lyricLabDB,
  tagDescriptions,
  musicPrompts,
  lyricPrompts
};
