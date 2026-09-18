import { ColliderChip, ArchiveItem, SunoMetaTag, SunoStyleItem } from '../types';

export const SONIC_COLLIDER_CHIPS: ColliderChip[] = [
  // ==========================================
  // SIDEBAR A: BEAM A (GENRES, ERAS & RHYTHMS)
  // ==========================================
  // Genres
  {
    id: 'genre-samba',
    label: 'Samba',
    category: 'genre',
    sidebarGroup: 'beam_a',
    color: '#F59E0B',
    description: 'Syncopated Brazilian 2/4 rhythm with lively percussion and groove',
    tags: ['brazilian', 'syncopated', 'dance', 'percussive'],
    energyWeight: 0.8
  },
  {
    id: 'genre-indie-rock',
    label: 'Indie Rock',
    category: 'genre',
    sidebarGroup: 'beam_a',
    color: '#EC4899',
    description: 'Jangle guitars, melodic basslines, raw vocal delivery, college radio feel',
    tags: ['guitar-driven', 'melodic', 'alternative', 'indie'],
    energyWeight: 0.85
  },
  {
    id: 'genre-trip-hop',
    label: 'Trip Hop',
    category: 'genre',
    sidebarGroup: 'beam_a',
    color: '#8B5CF6',
    description: 'Downtempo Bristol breaks, dark cinematic vinyl texture, heavy sub',
    tags: ['bristol', 'downtempo', 'dark', 'cinematic'],
    energyWeight: 0.75
  },
  {
    id: 'genre-bossa-nova',
    label: 'Bossa Nova',
    category: 'genre',
    sidebarGroup: 'beam_a',
    color: '#10B981',
    description: 'Intimate nylon guitar chords, whispery vocals, delicate syncopation',
    tags: ['brazilian', 'jazz-chords', 'gentle', 'acoustic'],
    energyWeight: 0.7
  },
  {
    id: 'genre-post-punk',
    label: 'Post-Punk',
    category: 'genre',
    sidebarGroup: 'beam_a',
    color: '#6366F1',
    description: 'Angular driving bass, cold chorus guitars, urgent motorized drums',
    tags: ['angular', 'darkwave', 'driving-bass', 'cold'],
    energyWeight: 0.8
  },
  {
    id: 'genre-synthwave',
    label: 'Synthwave',
    category: 'genre',
    sidebarGroup: 'beam_a',
    color: '#06B6D4',
    description: 'Neon retro arpeggios, analog bass pulses, gated toms, outrun sunset',
    tags: ['retro', 'analog-synths', 'outrun', '80s'],
    energyWeight: 0.8
  },
  {
    id: 'genre-shoegaze',
    label: 'Shoegaze',
    category: 'genre',
    sidebarGroup: 'beam_a',
    color: '#A855F7',
    description: 'Massive swirling wall of fuzz, reverse reverb wash, buried ethereal vocals',
    tags: ['fuzz-wall', 'ethereal', 'glide-guitar', 'reverb-heavy'],
    energyWeight: 0.9
  },
  {
    id: 'genre-afrobeat',
    label: 'Afrobeat',
    category: 'genre',
    sidebarGroup: 'beam_a',
    color: '#EAB308',
    description: 'Complex interlocking horn riffs, polyrhythmic percussion, grooving bass',
    tags: ['polyrhythm', 'horns', 'fela', 'high-energy'],
    energyWeight: 0.85
  },
  {
    id: 'genre-math-rock',
    label: 'Math Rock',
    category: 'genre',
    sidebarGroup: 'beam_a',
    color: '#3B82F6',
    description: 'Tapped clean telecasters, odd time signatures (7/8, 11/8), angular dynamic stop-starts',
    tags: ['odd-meter', 'finger-tapping', 'complex', 'clean-guitars'],
    energyWeight: 0.75
  },
  {
    id: 'genre-ambient-noir',
    label: 'Ambient Noir',
    category: 'genre',
    sidebarGroup: 'beam_a',
    color: '#64748B',
    description: 'Slow ominous drone pads, smoky trumpet echoes, David Lynch red-room mystery',
    tags: ['lynchian', 'cinematic', 'smoky', 'atmospheric'],
    energyWeight: 0.65
  },
  {
    id: 'genre-hyperpop',
    label: 'Hyperpop',
    category: 'genre',
    sidebarGroup: 'beam_a',
    color: '#F43F5E',
    description: 'Pitched squeaky vocal chops, distorted metallic 808s, maximalist bubblegum glitch',
    tags: ['maximalist', 'metallic-bass', 'glitch', 'pc-music'],
    energyWeight: 0.95
  },
  {
    id: 'genre-desert-blues',
    label: 'Desert Blues',
    category: 'genre',
    sidebarGroup: 'beam_a',
    color: '#D97706',
    description: 'Hypnotic repetitive Tuareg pentatonic guitar vamps, handclaps, trance groove',
    tags: ['tuareg', 'hypnotic', 'trance', 'pentatonic'],
    energyWeight: 0.8
  },

  // Eras
  {
    id: 'era-90s-lofi',
    label: '90s Lo-Fi',
    category: 'era',
    sidebarGroup: 'beam_a',
    color: '#14B8A6',
    description: 'Cassette 4-track saturation, warm hiss, unpolished authentic basement intimacy',
    tags: ['cassette', 'tape-hiss', '4-track', 'raw'],
    energyWeight: 0.8
  },
  {
    id: 'era-70s-analog-tape',
    label: '70s Analog Tape',
    category: 'era',
    sidebarGroup: 'beam_a',
    color: '#F97316',
    description: 'Studer 24-track warm saturation, thick wooden drums, lush preamps',
    tags: ['studer', 'warmth', 'harmonic-distortion', 'organic'],
    energyWeight: 0.85
  },
  {
    id: 'era-80s-gated-reverb',
    label: '80s Gated Digital',
    category: 'era',
    sidebarGroup: 'beam_a',
    color: '#84CC16',
    description: 'Explosive SSL Listen-Mic gated snare, Yamaha DX7 FM glassy chimes, Fairlight CMI',
    tags: ['gated-snare', 'dx7', 'fairlight', 'punchy'],
    energyWeight: 0.75
  },
  {
    id: 'era-60s-psychedelic',
    label: '60s Psychedelic',
    category: 'era',
    sidebarGroup: 'beam_a',
    color: '#0EA5E9',
    description: 'Tape flanging, backward guitar solos, sitar drones, Abbey Road Abbey chamber',
    tags: ['abbey-road', 'tape-flange', 'sitar', 'trippy'],
    energyWeight: 0.8
  },
  {
    id: 'era-y2k-futurism',
    label: 'Y2K Cyberpunk 2000s',
    category: 'era',
    sidebarGroup: 'beam_a',
    color: '#38BDF8',
    description: 'Early Millennium digital sheen, filtered resonant phasers, euro-trance euphoria',
    tags: ['millennium', 'clean-digital', 'phaser', 'euphoric'],
    energyWeight: 0.75
  },

  // Rhythms
  {
    id: 'rhythm-odd-meter-7-8',
    label: '7/8 Odd Meter',
    category: 'rhythm',
    sidebarGroup: 'beam_a',
    color: '#E11D48',
    description: 'Asymmetric 2+2+3 or 3+2+2 heartbeat pulse that keeps listeners leaning forward',
    tags: ['odd-time', 'asymmetric', 'prog', 'polyrhythmic'],
    energyWeight: 0.7
  },
  {
    id: 'rhythm-downtempo-half-step',
    label: 'Downtempo Half-Step',
    category: 'rhythm',
    sidebarGroup: 'beam_a',
    color: '#7C3AED',
    description: 'Laid-back behind-the-beat boom-bap swing, relaxed groove pocket',
    tags: ['swung', 'dilla-groove', 'unquantized', 'relaxed'],
    energyWeight: 0.75
  },
  {
    id: 'rhythm-motorik-kraut',
    label: 'Motorik 4/4 Drive',
    category: 'rhythm',
    sidebarGroup: 'beam_a',
    color: '#2563EB',
    description: 'Relentless hypnotic steady pulse inspired by Neu! and Kraftwerk',
    tags: ['hypnotic', 'steady', 'krautrock', 'forward-motion'],
    energyWeight: 0.85
  },
  {
    id: 'rhythm-bossa-clave',
    label: 'Bossa Clave',
    category: 'rhythm',
    sidebarGroup: 'beam_a',
    color: '#059669',
    description: 'Gentle side-stick rimshot pattern dancing around subtle cymbal accents',
    tags: ['rimshot', 'latin', 'subtle', 'flowing'],
    energyWeight: 0.7
  },

  // ==================================================
  // SIDEBAR B: BEAM B (INSTRUMENTS, PRODUCTION & NUANCES)
  // ==================================================
  // Instruments
  {
    id: 'inst-theremin',
    label: 'Theremin Lead',
    category: 'instrument',
    sidebarGroup: 'beam_b',
    color: '#00F0FF',
    description: 'Ethereal alien whistling sine glide, vibrato hand gesture, sci-fi mystery',
    tags: ['theremin', 'ethereal', 'glide', 'vintage-sci-fi'],
    energyWeight: 0.7
  },
  {
    id: 'inst-mellotron-flute',
    label: 'Mellotron Strings/Flutes',
    category: 'instrument',
    sidebarGroup: 'beam_b',
    color: '#FFD700',
    description: 'Analog tape-strip playback instrument, melancholic warble, Strawberry Fields vibe',
    tags: ['mellotron', 'tape-strings', 'nostalgic', 'haunting'],
    energyWeight: 0.8
  },
  {
    id: 'inst-rhodes-mk1',
    label: 'Rhodes MK1 Electric Piano',
    category: 'instrument',
    sidebarGroup: 'beam_b',
    color: '#F59E0B',
    description: 'Warm bell-like chime tines through a slow analog stereo tremolo',
    tags: ['rhodes', 'electric-piano', 'bell-tines', 'neo-soul'],
    energyWeight: 0.85
  },
  {
    id: 'inst-fuzz-telecaster',
    label: 'Fuzz Telecaster',
    category: 'instrument',
    sidebarGroup: 'beam_b',
    color: '#EF4444',
    description: 'Spitty silicon fuzz face into a cranked tube combo amp, biting upper harmonics',
    tags: ['telecaster', 'fuzz-pedal', 'garage', 'raw-power'],
    energyWeight: 0.9
  },
  {
    id: 'inst-808-sub-bass',
    label: 'Deep 808 Sub-Bass',
    category: 'instrument',
    sidebarGroup: 'beam_b',
    color: '#8B5CF6',
    description: 'Pure fundamental 35Hz sub-sine with subtle warm saturation for chest impact',
    tags: ['808', 'sub-bass', 'low-end', 'room-shaker'],
    energyWeight: 0.9
  },
  {
    id: 'inst-karplus-harp',
    label: 'Karplus-Strong Plucked Harp',
    category: 'instrument',
    sidebarGroup: 'beam_b',
    color: '#10B981',
    description: 'Algorithmic physical modeling of plucked metal and nylon strings',
    tags: ['physical-modeling', 'plucked', 'algorithmic', 'crystalline'],
    energyWeight: 0.75
  },
  {
    id: 'inst-steel-tongue-drum',
    label: 'Steel Tongue / Hang Drum',
    category: 'instrument',
    sidebarGroup: 'beam_b',
    color: '#3B82F6',
    description: 'Resonant metallic chambers with endless natural sustain and microtonal overtone shimmer',
    tags: ['hang-drum', 'metallic', 'meditative', 'overtones'],
    energyWeight: 0.7
  },
  {
    id: 'inst-wurlitzer-200a',
    label: 'Wurlitzer 200A',
    category: 'instrument',
    sidebarGroup: 'beam_b',
    color: '#D97706',
    description: 'Barking reed electric piano with rich tube crunch and dynamic bite',
    tags: ['wurlitzer', 'reeds', 'crunch', 'soulful'],
    energyWeight: 0.8
  },

  // Production
  {
    id: 'prod-tape-flutter-wow',
    label: 'Tape Flutter & Wow',
    category: 'production',
    sidebarGroup: 'beam_b',
    color: '#EC4899',
    description: 'Mechanical reel-to-reel motor slip and subtle pitch modulation instability',
    tags: ['pitch-wobble', 'tape-motor', 'nostalgia', 'vintage'],
    energyWeight: 0.75
  },
  {
    id: 'prod-spring-reverb-tank',
    label: 'Spring Reverb Tank Boing',
    category: 'production',
    sidebarGroup: 'beam_b',
    color: '#06B6D4',
    description: 'Twangy metal coil physical reverb with splashy surf and dub echoes',
    tags: ['spring-tank', 'dub-reverb', 'twang', 'surf'],
    energyWeight: 0.8
  },
  {
    id: 'prod-vinyl-crackle-dust',
    label: 'Vinyl Dust & 33 RPM Crackle',
    category: 'production',
    sidebarGroup: 'beam_b',
    color: '#78716C',
    description: 'Warm needle groove noise, gentle pops, and authentic tactile turntable presence',
    tags: ['vinyl', 'groove-noise', 'surface-crackle', 'warmth'],
    energyWeight: 0.7
  },
  {
    id: 'prod-binaural-spatial-mic',
    label: 'Binaural 3D Spatial Field',
    category: 'production',
    sidebarGroup: 'beam_b',
    color: '#38BDF8',
    description: 'Dummy head stereo placement creating hyper-realistic headphone depth and acoustic width',
    tags: ['binaural', '3d-audio', 'headphone-mix', 'immersive'],
    energyWeight: 0.7
  },
  {
    id: 'prod-sidechain-compression',
    label: 'Sidechain Ducking Pump',
    category: 'production',
    sidebarGroup: 'beam_b',
    color: '#A855F7',
    description: 'Rhythmic breathing envelope ducked by the kick drum for infectious bounce',
    tags: ['sidechain', 'pumping', 'french-touch', 'breathing-mix'],
    energyWeight: 0.8
  },

  // Nuance
  {
    id: 'nuance-lynchian-dreamscape',
    label: 'Lynchian Dreamscape Mystery',
    category: 'nuance',
    sidebarGroup: 'beam_b',
    color: '#E11D48',
    description: 'Twin Peaks slow tremolo chords, backward audio reversals, deep eerie silence',
    tags: ['twin-peaks', 'red-room', 'unsettling', 'haunting-beauty'],
    energyWeight: 0.85
  },
  {
    id: 'nuance-cosmic-melancholy',
    label: 'Cosmic Melancholy',
    category: 'nuance',
    sidebarGroup: 'beam_b',
    color: '#6366F1',
    description: 'Floating vastness, lonely astronaut radio transmissions, bittersweet harmonic cadence',
    tags: ['space', 'bittersweet', 'ambient', 'philosophical'],
    energyWeight: 0.8
  },
  {
    id: 'nuance-desert-stargazing',
    label: 'Desert Stargazing Vibe',
    category: 'nuance',
    sidebarGroup: 'beam_b',
    color: '#F59E0B',
    description: 'Dry acoustic wood warmth, campfire night breeze, open expanse, resonant silence',
    tags: ['desert', 'spacious', 'warm-wood', 'night-sky'],
    energyWeight: 0.75
  }
];

// Reference Songs for the Song Deconstructor (Tab 3)
export interface ReferenceSongExample {
  id: string;
  title: string;
  artist: string;
  genre: string;
  tempo: string;
  harmonicAtmosphere: string;
  instrumentation: string[];
  productionTechniques: string[];
  lyricalCadence: string;
  famousFor: string;
}

export const REFERENCE_SONGS_CATALOG: ReferenceSongExample[] = [
  {
    id: 'ref-weird-fishes',
    title: 'Weird Fishes / Arpeggi',
    artist: 'Radiohead',
    genre: 'Art Rock / Poly-Arpeggiated Indie',
    tempo: '153 BPM (Driving, relentless 4/4)',
    harmonicAtmosphere: 'Suspended Em9 to A6/9 arpeggio cascades, buoyant modal shifts',
    instrumentation: ['Interlocking clean Fender Telecasters', 'Warm P-Bass walking counterpoint', 'Syncopated live brush drums', 'Ethereal falsetto vocal layers'],
    productionTechniques: ['Zero quantization', 'Tight room ambience', 'Stereo cross-panned guitars in rhythmic phase', 'Analog console saturation'],
    lyricalCadence: 'Hypnotic repetitive nautical metaphors of falling, light refraction, and being eaten by the worms at the bottom of the ocean',
    famousFor: 'Cascading interlocking 3-guitar arpeggios that build into an ecstatic oceanic release'
  },
  {
    id: 'ref-glory-box',
    title: 'Glory Box',
    artist: 'Portishead',
    genre: 'Bristol Trip-Hop / Film Noir Soul',
    tempo: '60 BPM (Slow, smoked-out half-time)',
    harmonicAtmosphere: 'Isaac Hayes sample loop in D-minor, moody descending string orchestration',
    instrumentation: ['Screaming fuzz guitar solo', 'Looming Rhodes chords', 'Heavy vinyl sampled breakbeat', 'Whispering-to-soaring torch vocal'],
    productionTechniques: ['Acetate pressing re-sampled for authentic dust', 'Distorted tube vocal mic', 'Tape delay feedback', 'Sub-frequency bass shelf'],
    lyricalCadence: 'Pleading, defiant, sensual demand for vulnerability and surrender ("Give me a reason to love you")',
    famousFor: 'The contrast between delicate lounge Rhodes and sudden shrieking fuzz guitar freakout'
  },
  {
    id: 'ref-space-oddity',
    title: 'Space Oddity',
    artist: 'David Bowie',
    genre: 'Psych-Folk / Baroque Space Opera',
    tempo: '68 BPM (Stately, progressive)',
    harmonicAtmosphere: 'Fmaj7 - Em - Fmaj7 - Em drifting into C major heroic triumph and lonely descent',
    instrumentation: ['Stylophone pocket synth', '12-string acoustic guitar', 'Dramatic Mellotron strings', 'Military snare roll into orchestral blast'],
    productionTechniques: ['Dramatic stereo panning between ground control and Major Tom', 'Abbey Road tape flanging', 'Sudden dry acoustic cutaways'],
    lyricalCadence: 'Narrative dialogue between NASA control and an astronaut marooned in cosmic awe and isolation',
    famousFor: 'The Stylophone solo and the iconic countdown into floating weightless acoustic space'
  },
  {
    id: 'ref-let-it-happen',
    title: 'Let It Happen',
    artist: 'Tame Impala',
    genre: 'Psychedelic Disco / Neo-Psych Odyssey',
    tempo: '125 BPM (Propulsive disco groove)',
    harmonicAtmosphere: 'Sweeping phaser-drenched synth pads, shifting modal basslines, ecstatic vocal harmonies',
    instrumentation: ['Hofner violin bass with heavy flatwound attack', 'Dave Smith Prophet 08 synths', 'Compressed live acoustic drum kit with flanged cymbals'],
    productionTechniques: ['Famous simulated CD-skipping loop glitch breakdown at minute 4:00', 'Enormous sweeping analog low-pass filters', 'Multi-tracked vocoder choruses'],
    lyricalCadence: 'Fatalistic meditation on letting go of anxiety and giving in to inevitable transformation',
    famousFor: 'The 1-minute CD-skipping glitch loop that erupts into a lush cinematic disco string drop'
  },
  {
    id: 'ref-dreams',
    title: 'Dreams',
    artist: 'Fleetwood Mac',
    genre: 'Classic California Soft Rock / Laurel Canyon',
    tempo: '120 BPM (Infectious heart pulse)',
    harmonicAtmosphere: 'Just two alternating chords (Fmaj7 and G6) sustained for the entire track without losing momentum',
    instrumentation: ['Deep punchy kick drum & hi-hat groove', 'P-Bass with muted foam dampener', 'Clean rhythmic electric guitar chop', 'Soaring crystalline vocal harmonies'],
    productionTechniques: ['Pristine 70s Sound City analog board recording', 'Ultra-clean close mic separation', 'Lush plate reverb on backing vocal tails'],
    lyricalCadence: 'Poetic, gentle warning about the consequences of freedom and lost connection ("Thunder only happens when it’s raining")',
    famousFor: 'Masterclass in 2-chord songwriting dynamics and hypnotic rhythm section pocket'
  }
];

// Default Archive Items for Strange Vault
export const INITIAL_ARCHIVE_ITEMS: ArchiveItem[] = [
  {
    id: 'arch-strangelet-001',
    title: 'Samba-Rock Solar Collision',
    type: 'sonic_sector',
    timestamp: Date.now() - 3600000 * 24 * 2,
    summary: 'Samba syncopation smashed into 90s Lo-Fi Indie Rock with Theremin lead and tape flutter.',
    tags: ['samba', 'indie-rock', 'lo-fi', 'theremin', 'tape-flutter'],
    starred: true,
    promptResult: {
      title: 'Copacabana Basement Tape',
      promptText: 'A high-energy blend of Brazilian samba syncopation and 90s lo-fi indie rock, featuring lively agogo bells and surdo bass drums collided with crunchy fuzz Telecaster riffs, an eerie theremin lead melody, warm 4-track cassette saturation, tape flutter, 118 BPM',
      styleTags: ['samba', 'indie rock', '90s lo-fi', 'theremin', 'tape flutter', 'analog warmth'],
      tempoBpm: 118,
      vibeDescription: 'Sweaty Rio dancehall colliding with a rain-soaked Seattle basement studio in 1994.',
      structureBlueprint: [
        { section: '[Intro]', description: 'Solo cassette tape click, gentle bossa nylon guitar strum with subtle tape wow' },
        { section: '[Verse 1]', description: 'Full samba percussion kicks in with syncopated drums and dry walking bass' },
        { section: '[Chorus]', description: 'Explosion of crunchy fuzz Telecaster and soaring theremin lead' },
        { section: '[Bridge]', description: 'Microtonal breakdown with cassette tape rewinds and polyrhythmic rimshots' },
        { section: '[Outro]', description: 'Theremin fading into warm vinyl crackle and rain field recording' }
      ],
      generatedAt: Date.now() - 3600000 * 24 * 2
    }
  },
  {
    id: 'arch-lyric-002',
    title: 'Quantum Entanglement at Midnight',
    type: 'lyric_lab',
    timestamp: Date.now() - 3600000 * 12,
    summary: 'Burroughsian cut-up of particle physics terminology collided with melancholic neon heartbreak.',
    tags: ['quantum', 'cut-up', 'neon-heartbreak', 'burroughs'],
    starred: false,
    lyricResult: {
      title: 'Spin State Down',
      concept: 'Two lovers separated across galaxies whose heartbeats remain locked in instant spooky action at a distance.',
      structure: 'Verse - Chorus - Verse - Chorus - Quantum Bridge - Chorus - Outro',
      promptTags: ['trip-hop', 'sub-bass', 'cinematic strings', 'female vocal', '84 bpm'],
      fullFormattedText: `[Verse 1]
We measured the angle of your departure in radians
Cold cloud chamber traces on the bedroom floor
The detector flashed once: parity violation
Now I hear your voice through the radio core.

[Chorus]
Spin state down, spin state up
Pour the strangelet in my silver cup
Light-years fold where the leptons bleed
Spooky action is all we need.

[Verse 2]
Feynman diagrams carved into the radiator
Steam rising up like subatomic ghosts
You were the positron, I was the annihilator
Burning through what we loved the most.

[Quantum Bridge - Burroughs Cut-Up]
Collided frequency / shattered prism / the tape loops reverse
Gravity bends the vowel / electrons don't rehearse.

[Outro]
Superposition fading out...
Zero Kelvin whisper...
Spin state down.`,
      stanzas: [
        {
          section: '[Verse 1]',
          lines: [
            'We measured the angle of your departure in radians',
            'Cold cloud chamber traces on the bedroom floor',
            'The detector flashed once: parity violation',
            'Now I hear your voice through the radio core.'
          ]
        },
        {
          section: '[Chorus]',
          lines: [
            'Spin state down, spin state up',
            'Pour the strangelet in my silver cup',
            'Light-years fold where the leptons bleed',
            'Spooky action is all we need.'
          ]
        }
      ],
      generatedAt: Date.now() - 3600000 * 12
    }
  }
];

// ==========================================================
// SUNO & UDIO META-TAGS & SOLOS PALETTE CATALOG
// ==========================================================
export const SUNO_META_TAGS_CATALOG: SunoMetaTag[] = [
  // --- Structure ---
  { id: 'tag-intro', tag: '[Intro]', category: 'structure', label: 'Intro', description: 'Sets the foundational groove or atmosphere before singing begins', color: '#06B6D4' },
  { id: 'tag-short-intro', tag: '[Short Intro]', category: 'structure', label: 'Short Intro', description: 'Immediate 2-4 bar start straight into the track', color: '#06B6D4' },
  { id: 'tag-atmos-intro', tag: '[Atmospheric Intro]', category: 'structure', label: 'Atmospheric Intro', description: 'Ambient pads, drones, or cinematic tape textures', color: '#06B6D4' },
  { id: 'tag-verse-1', tag: '[Verse 1]', category: 'structure', label: 'Verse 1', description: 'Establishes narrative, mood, and chord progression', color: '#3B82F6' },
  { id: 'tag-verse-2', tag: '[Verse 2]', category: 'structure', label: 'Verse 2', description: 'Advances story with added rhythmic elements', color: '#3B82F6' },
  { id: 'tag-verse-3', tag: '[Verse 3]', category: 'structure', label: 'Verse 3', description: 'Late-track narrative resolution or darker variation', color: '#3B82F6' },
  { id: 'tag-pre-chorus', tag: '[Pre-Chorus]', category: 'structure', label: 'Pre-Chorus', description: 'Builds harmonic tension leading up to the main hook', color: '#8B5CF6' },
  { id: 'tag-chorus', tag: '[Chorus]', category: 'structure', label: 'Chorus', description: 'The main memorable anthemic hook of the song', color: '#EC4899' },
  { id: 'tag-post-chorus', tag: '[Post-Chorus]', category: 'structure', label: 'Post-Chorus', description: 'Rhythmic vocal chant or secondary melodic echo', color: '#EC4899' },
  { id: 'tag-hook', tag: '[Hook]', category: 'structure', label: 'Hook', description: 'High-earworm repeating central melody', color: '#F43F5E' },
  { id: 'tag-bridge', tag: '[Bridge]', category: 'structure', label: 'Bridge', description: 'Key/harmonic departure providing contrast before final chorus', color: '#F59E0B' },
  { id: 'tag-interlude', tag: '[Interlude]', category: 'structure', label: 'Interlude', description: 'Instrumental breathing room between song sections', color: '#10B981' },
  { id: 'tag-breakdown', tag: '[Breakdown]', category: 'structure', label: 'Breakdown', description: 'Strips drums and rhythm down to minimal elements', color: '#EAB308' },
  { id: 'tag-drop', tag: '[Drop]', category: 'structure', label: 'Drop', description: 'Sudden explosive release of maximum bass and energy', color: '#EF4444' },
  { id: 'tag-build', tag: '[Build-Up]', category: 'structure', label: 'Build-Up', description: 'Rising snare roll and pitch sweep into the drop', color: '#F97316' },
  { id: 'tag-outro', tag: '[Outro]', category: 'structure', label: 'Outro', description: 'Song conclusion, settling back into silence or loop', color: '#64748B' },
  { id: 'tag-fade-out', tag: '[Fade Out]', category: 'structure', label: 'Fade Out', description: 'Instructs the AI model to slowly fade down volume', color: '#64748B' },
  { id: 'tag-big-finish', tag: '[Big Finish]', category: 'structure', label: 'Big Finish', description: 'Climactic final sustained chord and cymbal crash', color: '#F59E0B' },

  // --- Solos & Instrumental Breaks ---
  { id: 'tag-guitar-solo', tag: '[Guitar Solo]', category: 'solos', label: 'Guitar Solo', description: 'Lead electric guitar solo feature', color: '#F59E0B' },
  { id: 'tag-melodic-guitar-solo', tag: '[Melodic Guitar Solo]', category: 'solos', label: 'Melodic Guitar Solo', description: 'Singing, emotive David Gilmour-style sustained leads', color: '#F59E0B' },
  { id: 'tag-shred-guitar-solo', tag: '[Shredding Heavy Metal Solo]', category: 'solos', label: 'Shred Solo', description: 'Fast virtuosic sweeps, arpeggios, and whammy divebombs', color: '#EF4444' },
  { id: 'tag-acoustic-guitar-solo', tag: '[Acoustic Guitar Solo]', category: 'solos', label: 'Acoustic Solo', description: 'Fingerpicked nylon or steel string acoustic highlight', color: '#D97706' },
  { id: 'tag-bass-solo', tag: '[Bass Solo]', category: 'solos', label: 'Bass Solo', description: 'Funky melodic bassline front and center', color: '#8B5CF6' },
  { id: 'tag-slap-bass-break', tag: '[Slap Bass Break]', category: 'solos', label: 'Slap Bass Break', description: 'Percussive thumb slap and pop groove breakdown', color: '#A855F7' },
  { id: 'tag-drum-solo', tag: '[Drum Solo]', category: 'solos', label: 'Drum Solo', description: 'Acoustic drum kit showcase with intense rolls and fills', color: '#10B981' },
  { id: 'tag-drum-fill', tag: '[Drum Fill]', category: 'solos', label: 'Drum Fill', description: 'Dynamic tom-tom fill leading into the next measure', color: '#10B981' },
  { id: 'tag-half-time-break', tag: '[Half-Time Drum Groove]', category: 'solos', label: 'Half-Time Break', description: 'Tempo feels cut in half with heavy snare on 3', color: '#06B6D4' },
  { id: 'tag-synth-solo', tag: '[Synthesizer Lead Solo]', category: 'solos', label: 'Synth Solo', description: 'Analog Moog/Juno sawtooth lead solo with pitch bends', color: '#06B6D4' },
  { id: 'tag-synth-arp-break', tag: '[Modular Arpeggio Solo]', category: 'solos', label: 'Modular Arp', description: 'Rapid sequencing filter sweep and resonance escalation', color: '#3B82F6' },
  { id: 'tag-sax-solo', tag: '[Saxophone Solo]', category: 'solos', label: 'Saxophone Solo', description: 'Smoky 80s tenor sax solo dripping with reverb', color: '#EC4899' },
  { id: 'tag-piano-solo', tag: '[Piano Solo]', category: 'solos', label: 'Piano Solo', description: 'Classical/jazz acoustic grand piano melodic flourish', color: '#F43F5E' },
  { id: 'tag-violin-solo', tag: '[Violin Solo]', category: 'solos', label: 'Violin Solo', description: 'Emotive folk fiddle or lush orchestral violin lead', color: '#EAB308' },
  { id: 'tag-turntable-scratch', tag: '[Turntable Scratch Break]', category: 'solos', label: 'Scratch Break', description: '90s hip-hop vinyl record scratch chops', color: '#6366F1' },
  { id: 'tag-horns-blast', tag: '[Brass Horn Blast]', category: 'solos', label: 'Horn Section', description: 'Stabs from trumpet, trombone, and saxophone', color: '#F59E0B' },

  // --- Vocal Performance Cues ---
  { id: 'tag-whisper', tag: '[Whisper]', category: 'vocals', label: 'Whisper', description: 'Intimate close-mic breathy delivery', color: '#06B6D4' },
  { id: 'tag-spoken-word', tag: '[Spoken Word]', category: 'vocals', label: 'Spoken Word', description: 'Talked rather than sung; deadpan noir poetry', color: '#64748B' },
  { id: 'tag-belting', tag: '[Belting]', category: 'vocals', label: 'Belting', description: 'Powerful, full-chested vocal delivery with high volume', color: '#EF4444' },
  { id: 'tag-emotional-belting', tag: '[Emotional Belting]', category: 'vocals', label: 'Emotional Belting', description: 'Raw, cracked, passionate vocal peak', color: '#F43F5E' },
  { id: 'tag-falsetto', tag: '[Falsetto]', category: 'vocals', label: 'Falsetto', description: 'Airy high-register head voice', color: '#A855F7' },
  { id: 'tag-harmonies', tag: '[Harmonies]', category: 'vocals', label: 'Harmonies', description: 'Layered 3rds and 5ths supporting the main vocal', color: '#EC4899' },
  { id: 'tag-backing-vocals', tag: '[Layered Backing Vocals]', category: 'vocals', label: 'Backing Vocals', description: 'Wide stereo group vocals echoing phrases', color: '#8B5CF6' },
  { id: 'tag-call-response', tag: '[Call and Response]', category: 'vocals', label: 'Call & Response', description: 'Lead line answered immediately by chorus or echo', color: '#3B82F6' },
  { id: 'tag-ad-libs', tag: '[Vocal Ad-libs]', category: 'vocals', label: 'Ad-libs', description: 'Improvised runs, yeahs, hums, and vocal flourishes', color: '#10B981' },
  { id: 'tag-chant', tag: '[Chant]', category: 'vocals', label: 'Chant', description: 'Rhythmic crowd repetition in unison', color: '#EAB308' },
  { id: 'tag-gospel-choir', tag: '[Gospel Choir]', category: 'vocals', label: 'Gospel Choir', description: 'Massive spiritual multi-voice backing choir', color: '#F59E0B' },
  { id: 'tag-dual-vocals', tag: '[Dual Vocals]', category: 'vocals', label: 'Dual Vocals', description: 'Two voices singing simultaneously in counterpoint', color: '#06B6D4' },
  { id: 'tag-male-vocal', tag: '[Male Vocal]', category: 'vocals', label: 'Male Vocal', description: 'Explicit directive for male singer for this section', color: '#3B82F6' },
  { id: 'tag-female-vocal', tag: '[Female Vocal]', category: 'vocals', label: 'Female Vocal', description: 'Explicit directive for female singer for this section', color: '#EC4899' },
  { id: 'tag-screamed', tag: '[Screamed Vocals]', category: 'vocals', label: 'Screamed', description: 'Aggressive distorted metalcore/punk delivery', color: '#EF4444' },
  { id: 'tag-autotune-hook', tag: '[Autotuned Vocal Hook]', category: 'vocals', label: 'Autotune Hook', description: 'Hard robotic pitch-corrected modern trap/hyperpop sound', color: '#06B6D4' },

  // --- Dynamic Shifts & FX ---
  { id: 'tag-silence', tag: '[Silence]', category: 'dynamics', label: 'Silence', description: 'Complete 1-beat or 1-bar mute of all audio', color: '#64748B' },
  { id: 'tag-dramatic-pause', tag: '[Dramatic Pause]', category: 'dynamics', label: 'Dramatic Pause', description: 'Hangs on a ringing chord before exploding back in', color: '#F59E0B' },
  { id: 'tag-tape-stop', tag: '[Tape Stop]', category: 'dynamics', label: 'Tape Stop', description: 'Classic slowing pitch drop like an analog reel being halted', color: '#EF4444' },
  { id: 'tag-tempo-up', tag: '[Tempo Accelerates]', category: 'dynamics', label: 'Accelerando', description: 'Gradual speed up into hyper-speed finale', color: '#10B981' },
  { id: 'tag-tempo-down', tag: '[Tempo Slows Down]', category: 'dynamics', label: 'Ritardando', description: 'Gradual slowdown into a heavy sluggish sludge beat', color: '#3B82F6' },
  { id: 'tag-lofi-radio', tag: '[Lo-Fi Radio Effect]', category: 'dynamics', label: 'Lo-Fi Radio', description: 'Bandpassed thin EQ simulating an AM transister radio', color: '#EAB308' },
  { id: 'tag-applause', tag: '[Crowd Cheering & Applause]', category: 'dynamics', label: 'Crowd Cheering', description: 'Live concert ambience with audience reaction', color: '#A855F7' },

  // --- In-Lyric Style Shifts ---
  { id: 'tag-style-acoustic', tag: '[Stripped-back Acoustic Ballad]', category: 'in_lyric_styles', label: 'Acoustic Shift', description: 'Switches the music abruptly to intimate acoustic guitar', color: '#D97706' },
  { id: 'tag-style-heavy-drop', tag: '[Heavy Distorted Blast]', category: 'in_lyric_styles', label: 'Distorted Shift', description: 'Switches abruptly into wall-of-sound fuzz', color: '#EF4444' },
  { id: 'tag-style-trap-switch', tag: '[Half-Time Trap Beat Switch]', category: 'in_lyric_styles', label: 'Trap Beat Switch', description: 'Switches rhythm to rolling hi-hats and heavy 808', color: '#8B5CF6' },
  { id: 'tag-style-ambient-wash', tag: '[Ambient Reverb Wash]', category: 'in_lyric_styles', label: 'Ambient Wash', description: 'Instruments dissolve into a floating psychedelic cloud', color: '#06B6D4' }
];

// ==========================================================
// SUNO STYLE PROMPT BUILDER CATALOG
// ==========================================================
export const SUNO_STYLE_CATALOG: SunoStyleItem[] = [
  // --- Genres ---
  { id: 'style-darkwave', label: 'Darkwave', category: 'genre', promptSnippet: 'darkwave', description: 'Cold 80s synths, gated snares, Gothic romance' },
  { id: 'style-synthwave', label: 'Synthwave', category: 'genre', promptSnippet: 'synthwave, outrun', description: 'Retro neon analog arpeggios and punchy drums' },
  { id: 'style-post-punk', label: 'Post-Punk', category: 'genre', promptSnippet: 'post-punk, driving bassline', description: 'Angular guitars, urgent motorik rhythm' },
  { id: 'style-indie-rock', label: 'Indie Rock', category: 'genre', promptSnippet: 'indie rock, jangle guitar', description: 'Catchy melodic hooks, chiming guitars' },
  { id: 'style-shoegaze', label: 'Shoegaze', category: 'genre', promptSnippet: 'shoegaze, fuzz guitar wall', description: 'Lush swirl of dense distortion and glide chords' },
  { id: 'style-trip-hop', label: 'Trip-Hop', category: 'genre', promptSnippet: 'trip-hop, downtempo bristol break', description: 'Dusty vinyl breakbeats, deep sub-bass' },
  { id: 'style-liquid-dnb', label: 'Liquid Drum & Bass', category: 'genre', promptSnippet: 'liquid drum and bass, 174 bpm', description: 'Fast rolling amen breaks, soulful Rhodes' },
  { id: 'style-midwest-emo', label: 'Midwest Emo', category: 'genre', promptSnippet: 'midwest emo, clean guitar tapping', description: 'Nostalgic twinkly guitars, raw honest dynamic' },
  { id: 'style-math-rock', label: 'Math Rock', category: 'genre', promptSnippet: 'math rock, odd time signatures', description: 'Complex interlocking 7/8 rhythms, sharp tone' },
  { id: 'style-hyperpop', label: 'Hyperpop', category: 'genre', promptSnippet: 'hyperpop, metallic 808', description: 'Bubblegum maximalism, glitch chops' },
  { id: 'style-neo-soul', label: 'Neo-Soul', category: 'genre', promptSnippet: 'neo-soul, drunken dilla swing', description: 'Warm jazzy chords, laidback syncopation' },
  { id: 'style-desert-blues', label: 'Desert Blues', category: 'genre', promptSnippet: 'desert blues, hypnotic guitar groove', description: 'Sahara rhythmic trance, modal acoustic' },
  { id: 'style-city-pop', label: 'Japanese City Pop', category: 'genre', promptSnippet: 'city pop, brass horn stabs, slap bass', description: 'Upbeat 80s Tokyo breezy summer groove' },
  { id: 'style-outlaw-country', label: 'Outlaw Country', category: 'genre', promptSnippet: 'outlaw country, pedal steel guitar', description: 'Gravelly storytelling, twang telecaster' },

  // --- Vocals ---
  { id: 'style-ethereal-female', label: 'Ethereal Female Vocals', category: 'vocal', promptSnippet: 'ethereal female vocals', description: 'Floating, breathy, Kate Bush/Cocteau Twins vibe' },
  { id: 'style-raspy-male', label: 'Raspy Male Vocals', category: 'vocal', promptSnippet: 'raspy male vocals', description: 'Raw, smoky, gritty rock delivery' },
  { id: 'style-deep-baritone', label: 'Deep Baritone', category: 'vocal', promptSnippet: 'deep baritone voice', description: 'Resonant, melancholic Leonard Cohen/Ian Curtis feel' },
  { id: 'style-intimate-whisper', label: 'Intimate Whispered Vocals', category: 'vocal', promptSnippet: 'intimate whispered vocals', description: 'Very close to the microphone, fragile delivery' },
  { id: 'style-soulful-belting', label: 'Soulful Belting', category: 'vocal', promptSnippet: 'soulful belted vocals', description: 'Dynamic vocal power with rich gospel vibrato' },
  { id: 'style-autotuned-trap', label: 'Autotuned Vocals', category: 'vocal', promptSnippet: 'autotuned melodic vocal runs', description: 'Modern hard-tuned pitch-corrected sheen' },
  { id: 'style-layered-harmonies', label: 'Choral Harmonies', category: 'vocal', promptSnippet: 'layered vocal harmonies', description: 'Multi-tracked lush backing vocal chords' },
  { id: 'style-spoken-noir', label: 'Spoken-Word Noir', category: 'vocal', promptSnippet: 'spoken-word deadpan vocals', description: 'Hypnotic monotone reciting over atmospheric beat' },

  // --- Instrumentation ---
  { id: 'style-analog-synths', label: 'Analog Synths', category: 'instrument', promptSnippet: 'analog synthesizers, juno chorus', description: 'Warm organic sawtooth pads and leads' },
  { id: 'style-rhodes', label: 'Fender Rhodes', category: 'instrument', promptSnippet: 'fender rhodes electric piano', description: 'Velvety bell-like keyboard tines' },
  { id: 'style-rickenbacker', label: 'Rickenbacker Bass', category: 'instrument', promptSnippet: 'punchy rickenbacker bass', description: 'Gritty treble bite with tight low-end' },
  { id: 'style-808-sub', label: '808 Sub-Bass', category: 'instrument', promptSnippet: 'heavy 808 sub-bass', description: 'Rumbling, earth-shaking electronic bass' },
  { id: 'style-punchy-drums', label: 'Punchy Drums', category: 'instrument', promptSnippet: 'punchy acoustic drum kit', description: 'Real wooden drum room recording with crack' },
  { id: 'style-linndrum', label: '80s LinnDrum', category: 'instrument', promptSnippet: '80s linndrum gated snare', description: 'Iconic Prince/New Wave electronic drum machine' },
  { id: 'style-tele-clean', label: 'Chiming Telecaster', category: 'instrument', promptSnippet: 'chiming clean telecaster guitar', description: 'Bright single-coil sparkle' },
  { id: 'style-fuzz-wall', label: 'Fuzz Guitar Wall', category: 'instrument', promptSnippet: 'massive fuzz distortion guitar wall', description: 'Overdriven harmonic saturation' },
  { id: 'style-fingerpick', label: 'Fingerpicked Acoustic', category: 'instrument', promptSnippet: 'fingerpicked steel string acoustic guitar', description: 'Intricate Nick Drake folk warmth' },
  { id: 'style-mellotron', label: 'Mellotron Strings', category: 'instrument', promptSnippet: 'vintage mellotron tape strings', description: 'Wobbly, nostalgic 60s/70s tape choir' },

  // --- Production & Mix ---
  { id: 'style-tape-sat', label: 'Analog Tape Saturation', category: 'production', promptSnippet: 'warm analog tape saturation', description: 'Soft harmonic compression that kills digital harshness' },
  { id: 'style-wide-stereo', label: 'Wide Stereo Field', category: 'production', promptSnippet: 'wide stereo mix, immersive depth', description: 'Expansive soundstage with panoramic panning' },
  { id: 'style-lofi-hiss', label: 'Lo-Fi Cassette Hiss', category: 'production', promptSnippet: 'lo-fi cassette texture, gentle hiss', description: 'Warm vintage imperfections and warble' },
  { id: 'style-lush-reverb', label: 'Lush Hall Reverb', category: 'production', promptSnippet: 'lush cavernous hall reverb', description: 'Big cinematic spatial decay' },
  { id: 'style-gated-reverb', label: 'Gated Reverb Snare', category: 'production', promptSnippet: '80s gated reverb snare', description: 'Huge snare tail abruptly cut off' },
  { id: 'style-dry-mix', label: 'Dry Intimate Mix', category: 'production', promptSnippet: 'dry up-front mix, zero reverb', description: 'In-your-face closeness, bone-dry drums' },
  { id: 'style-vinyl-texture', label: 'Vinyl Crackle', category: 'production', promptSnippet: 'vintage vinyl surface crackle', description: 'Organic nostalgic needle noise' },
  { id: 'style-sidechain', label: 'Sidechain Pumping', category: 'production', promptSnippet: 'heavy sidechain compression pump', description: 'French house/EDM ducking rhythm' },

  // --- Tempo & Groove ---
  { id: 'style-85-bpm', label: '85 BPM Downtempo', category: 'tempo', promptSnippet: '85 bpm, laidback groove', description: 'Slow, brooding head-nod pace' },
  { id: 'style-105-bpm', label: '105 BPM Mid-Tempo', category: 'tempo', promptSnippet: '105 bpm, funky strut', description: 'Effortless walking rhythm' },
  { id: 'style-120-bpm', label: '120 BPM 4-on-the-Floor', category: 'tempo', promptSnippet: '120 bpm, four-on-the-floor driving beat', description: 'Classic club, house, and synthpop pulse' },
  { id: 'style-140-bpm', label: '140 BPM Driving Rock', category: 'tempo', promptSnippet: '140 bpm, fast driving tempo', description: 'High-energy motorik propulsion' },
  { id: 'style-174-bpm', label: '174 BPM Fast DnB', category: 'tempo', promptSnippet: '174 bpm, rapid kinetic breaks', description: 'Drum & bass adrenaline speed' },
  { id: 'style-half-time', label: 'Half-Time Feel', category: 'tempo', promptSnippet: 'half-time rhythm feel', description: 'Heavy spaced-out groove' },

  // --- Mood & Emotion ---
  { id: 'style-nocturnal', label: 'Nocturnal & Moody', category: 'mood', promptSnippet: 'nocturnal, melancholic, 3am mood', description: 'Rainy city streets, reflective isolation' },
  { id: 'style-euphoric', label: 'Euphoric & Uplifting', category: 'mood', promptSnippet: 'euphoric, uplifting, triumphant', description: 'Soaring choruses, serotonin rush' },
  { id: 'style-haunting', label: 'Haunting & Cinematic', category: 'mood', promptSnippet: 'haunting, cinematic, eerie beauty', description: 'Chilling atmosphere, David Lynch mystery' },
  { id: 'style-bittersweet', label: 'Bittersweet Nostalgia', category: 'mood', promptSnippet: 'bittersweet nostalgia, golden hour', description: 'Wistful longing for past memories' },
  { id: 'style-aggressive', label: 'Raw & Aggressive', category: 'mood', promptSnippet: 'raw aggressive intensity, rebellious', description: 'Furious distortion, heavy angst' },
  { id: 'style-hypnotic', label: 'Hypnotic & Trance', category: 'mood', promptSnippet: 'hypnotic, repetitive trance groove', description: 'Locked-in cyclical meditation' }
];

