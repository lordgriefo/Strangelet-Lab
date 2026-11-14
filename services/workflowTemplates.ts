/**
 * Strangelet Lab: Guided Workflows & Project Templates Engine
 * 
 * Plotted-out production workflows with step-by-step guidance,
 * Ghost (Mad Scientist) tips, and 1-click project templates!
 */

import { GuidedWorkflow, ProjectTemplateConfig } from '../types';

export const GUIDED_WORKFLOWS: GuidedWorkflow[] = [
  {
    id: 'workflow-quantum-alchemist',
    name: 'The Quantum Alchemist (LSC → Ace-Step → Mixer → Humanizer → Devine Machine)',
    tagline: 'From Hadron prompt collision to neural loops, live guitar injection, and tape-sliced glitch alchemy',
    difficulty: 'Intermediate',
    estimatedMinutes: 8,
    startingBpm: 88,
    tags: ['Core Workflow', 'LSC', 'Ace-Step', 'Humanizer', 'Beam Splitter', 'Devine Machine'],
    description: 'The signature Strangelet production workflow requested by top hybrid producers: Synthesize a raw prompt in the Large Sonic Collider, diffuse multi-stem audio in Ace-Step 1.5, route into the mixer console, arm a live guitar with groove humanizing, and warp everything with Beam Splitter crossovers and Devine Machine Burroughsian tape slicing.',
    steps: [
      {
        stepNumber: 1,
        title: 'Prompt Genesis in the Large Sonic Collider (LSC)',
        description: 'Accelerate the Hadron particle beam and collide sonic concepts (e.g. "88 BPM Heavy Dusty Boom-Bap Drums + Detuned Rhodes + Warm Reese Sub"). Copy the collision prompt or let Ghost infuse it with Mad Scientist studio mojo.',
        componentTarget: 'lsc',
        actionButtonLabel: 'Open Large Sonic Collider',
        recommendedPreset: '88 BPM Dusty Boom-Bap & Glitched Rhodes',
        ghostTip: '👻 Ghost: "Don\'t think in sterile genres, brother! Think textures: old reel tape left in the Jamaican sun, crackling vinyl, and a Moog sub that vibrates your ribcage."'
      },
      {
        stepNumber: 2,
        title: 'Ace-Step 1.5 Neural Diffusion Generation',
        description: 'Paste your LSC prompt into Ace-Step 1.5 Loop Designer. Select your stem configuration (Full Loop or individual Drums, Bass, Lead, Pad), select an active LoRA from the Lending Library, and diffuse the audio bed.',
        componentTarget: 'acestep',
        actionButtonLabel: 'Open Ace-Step Loop Designer',
        recommendedPreset: 'Drums & 808 Bass Stems',
        ghostTip: '👻 Ghost: "Enable the Studer Tape Warmth toggle! It rounds off the digital transients so your kick drum thumps like an old SP-1200."'
      },
      {
        stepNumber: 3,
        title: 'Multi-Stem Ingestion into Mixer Console',
        description: 'Click "Send to Mixer Console". Ace-Step automatically builds individual multitrack channels with color-coded stems, gain staging, pan offsets, and bus routing into the Gold Path master bus.',
        componentTarget: 'mixer',
        actionButtonLabel: 'Open Multitrack Mixer',
        ghostTip: '👻 Ghost: "Check your faders! Give your bass and kick room to breathe. Carve out a tiny valley around 250Hz so the muddy boxiness disappears into thin air."'
      },
      {
        stepNumber: 4,
        title: 'Plug In Guitar & Engage Groove Humanizing',
        description: 'Arm the Live Mic / Guitar input channel. Turn on Groove Humanizing (jitter engine) on your MIDI and audio tracks to introduce subtle organic micro-timing variations (±12ms) and dynamic velocity drifts so it never sounds robotic.',
        componentTarget: 'humanizer',
        actionButtonLabel: 'Arm Guitar Track & Humanize',
        ghostTip: '👻 Ghost: "Slap a little spring reverb on that Strat! Humans don\'t play on a grid like machines, man. The magic is in the micro-hesitation right before the downbeat."'
      },
      {
        stepNumber: 5,
        title: 'Beam Splitter Multiband Crossovers & Devine Machine Slicing',
        description: 'Send the guitar loop through the Beam Splitter to refract it into 3 frequency prism bands. Then trigger the Devine Machine VST cut-up engine to perform Burroughsian reel-to-reel slice sequences and reverse flutter!',
        componentTarget: 'devine',
        actionButtonLabel: 'Launch Beam Splitter & Devine Machine',
        ghostTip: '👻 Ghost: "Devine Machine is legendary! Like William Burroughs taking scissors to tape and pasting it backwards. Let slice 5 and 11 run in reverse!"'
      }
    ]
  },
  {
    id: 'workflow-suno-deglaze',
    name: 'Suno AI De-Glaze & Analog Re-Amping',
    tagline: 'Strip the 8.5kHz artificial sheen and restore organic harmonic warmth',
    difficulty: 'Beginner',
    estimatedMinutes: 5,
    startingBpm: 120,
    tags: ['Suno De-Glaze', 'Restoration', 'Gold Path', 'Mastering'],
    description: 'Transform sterile generative AI audio by surgically notching digital artifacts, applying asymmetrical tube saturation in Faust, and running through the Gold Path 6-stage mastering chain.',
    steps: [
      {
        stepNumber: 1,
        title: 'Import Generative AI Audio Track',
        description: 'Drop in your Suno or Udio audio render. Notice the characteristic hyper-compressed high-frequency hiss between 8kHz and 12kHz.',
        componentTarget: 'mixer',
        actionButtonLabel: 'Import Audio File',
        ghostTip: '👻 Ghost: "Hear that glass-like fizzle on the cymbals? That\'s the digital demon trying to rob your soul. We are gonna melt that down."'
      },
      {
        stepNumber: 2,
        title: 'Execute Surgical 8.5kHz Notch & Sub-Mono Lock',
        description: 'Apply the AI Mix Step "Spectral De-Sheen" to notch -3.8dB at 8.5kHz with a high Q-factor and collapse sub frequencies below 90Hz to pure mono.',
        componentTarget: 'mixer',
        actionButtonLabel: 'Apply Anti-Sheen Mix Step',
        ghostTip: '👻 Ghost: "Bam! Instantly smooth like velvet. Now your speakers won\'t drill a hole into your ear canals."'
      },
      {
        stepNumber: 3,
        title: 'Master through Gold Path A/B Suite',
        description: 'Engage the Gold Path mastering chain. Toggle the real-time A/B button to instantly compare your restored, punchy master against the dry digital glare.',
        componentTarget: 'goldpath',
        actionButtonLabel: 'Open Gold Path Mastering Suite',
        ghostTip: '👻 Ghost: "Hit that A/B button! Night and day, brother. One sounds like plastic, the other sounds like Abbey Road."'
      }
    ]
  },
  {
    id: 'workflow-sfz-basic-pitch',
    name: 'Acoustic Guitar/Voice to SFZ Polyphonic Resynthesis',
    tagline: 'Record live audio, transcribe polyphonic MIDI with Basic Pitch, and resynthesize with open SFZ sample banks',
    difficulty: 'Intermediate',
    estimatedMinutes: 6,
    startingBpm: 105,
    tags: ['Basic Pitch', 'SFZ Library', 'MIDI Editor', 'Transcription'],
    description: 'Hum a melody, play a guitar riff, or drop an acoustic recording. Spotify Basic Pitch converts it into nuanced polyphonic MIDI notes with pitch bend, which you can map directly to authentic instruments from the SFZ Open Library.',
    steps: [
      {
        stepNumber: 1,
        title: 'Record or Select Audio Transient',
        description: 'Use the Live Microphone Recorder or pick an existing audio clip in your project bin.',
        componentTarget: 'mixer',
        actionButtonLabel: 'Record Live Take',
        ghostTip: '👻 Ghost: "Sing or pluck with conviction! Even a raspy acoustic chord progression has incredible harmonic secrets inside it."'
      },
      {
        stepNumber: 2,
        title: 'Transcribe with Spotify Basic Pitch (Offline WASM)',
        description: 'Open Basic Pitch, adjust note sensitivity and minimum duration, and click "Transcribe to Polyphonic MIDI".',
        componentTarget: 'mixer',
        actionButtonLabel: 'Open Basic Pitch Transcriber',
        ghostTip: '👻 Ghost: "Watching raw audio turn into piano roll notes without sending data to the cloud is pure cybernetic poetry."'
      },
      {
        stepNumber: 3,
        title: 'Load Vintage Instrument from SFZ Open Library',
        description: 'Open the SFZ Open Library. Choose the 1973 Rhodes Mk I, Intimate Chamber Cello, or Model D Bass and assign the MIDI notes to play through the SFZ engine.',
        componentTarget: 'mixer',
        actionButtonLabel: 'Open SFZ Library',
        ghostTip: '👻 Ghost: "The 1973 Rhodes Mk I has that real mechanical tine thump that breathes life into any MIDI chord progression."'
      }
    ]
  }
];

export const PRESET_PROJECT_TEMPLATES: ProjectTemplateConfig[] = [
  {
    id: 'template-quantum-hiphop',
    name: 'Quantum Hip-Hop & Lo-Fi Tape Beat',
    bpm: 88,
    genre: 'Lo-Fi Boom-Bap',
    description: 'Ready-to-record boom-bap bed with Ace-Step drum/bass stems, guitar overdub track armed with groove humanizer, and Devine Machine slicer pre-routed.',
    color: '#F59E0B',
    workflowId: 'workflow-quantum-alchemist',
    activeLoras: ['lora-lofi-tape', 'lora-sp1200-crunch'],
    tracks: [
      { name: 'Ace Drums (SP-1200)', type: 'audio', color: '#EC4899', volume: 0.88, pan: 0, initialClipsCount: 1 },
      { name: 'Ace 808 Sub Bass', type: 'audio', color: '#8B5CF6', volume: 0.90, pan: 0, initialClipsCount: 1 },
      { name: 'SFZ Rhodes Mk I', type: 'midi', color: '#06B6D4', instrument: '1973 Vintage Rhodes Mk I Stage 73', volume: 0.82, pan: -0.15, humanizeEnabled: true, humanizeAmount: 0.22, initialClipsCount: 1 },
      { name: 'Live Guitar In (Amp)', type: 'audio', color: '#10B981', volume: 0.85, pan: 0.2, humanizeEnabled: true, humanizeAmount: 0.18, initialClipsCount: 0 },
      { name: 'Devine Tape Slices', type: 'audio', color: '#F97316', volume: 0.75, pan: 0, initialClipsCount: 1 }
    ]
  },
  {
    id: 'template-cyberpunk-synthwave',
    name: 'Cyberpunk Neon Synthwave Matrix',
    bpm: 124,
    genre: 'Synthwave / Darksynth',
    description: 'Pumping sidechain, aggressive Moog bassline, arpeggiated neon leads with Faust tube saturation, and Gold Path master bus calibrated.',
    color: '#06B6D4',
    tracks: [
      { name: 'Four-on-the-Floor Kick', type: 'audio', color: '#EF4444', volume: 0.92, pan: 0, initialClipsCount: 1 },
      { name: 'Neon Snare & 80s Hats', type: 'audio', color: '#F59E0B', volume: 0.84, pan: 0, initialClipsCount: 1 },
      { name: 'Model D Sawtooth Bass', type: 'midi', color: '#8B5CF6', instrument: 'Model D Moog Sub Bass', volume: 0.88, pan: 0, initialClipsCount: 1 },
      { name: 'Juno-106 Chorus Pad', type: 'synth', color: '#06B6D4', instrument: 'Juno-106 Analog Saw Chorus Pad', volume: 0.78, pan: 0, initialClipsCount: 1 },
      { name: 'Arp 2600 Neon Lead', type: 'midi', color: '#EC4899', instrument: 'Faust Acid Saw Lead', volume: 0.80, pan: 0.25, initialClipsCount: 1 }
    ]
  },
  {
    id: 'template-acoustic-chamber',
    name: 'Acoustic Chamber & Folk Humanizer',
    bpm: 94,
    genre: 'Acoustic / Chamber Folk',
    description: 'Natural organic orchestration with SFZ Grand Piano, Intimate Chamber Cello, Micro-tuning set to 432Hz Pythagorean, and live vocal channel.',
    color: '#10B981',
    tracks: [
      { name: 'SFZ Concert Grand Piano', type: 'midi', color: '#10B981', instrument: 'SFZ Concert Grand Piano', volume: 0.85, pan: -0.1, humanizeEnabled: true, humanizeAmount: 0.25, initialClipsCount: 1 },
      { name: 'Intimate Chamber Cello', type: 'midi', color: '#3B82F6', instrument: 'Spitfire Intimate Chamber Cello', volume: 0.82, pan: 0.15, humanizeEnabled: true, humanizeAmount: 0.2, initialClipsCount: 1 },
      { name: 'Acoustic Strat Plucks', type: 'synth', color: '#F59E0B', instrument: 'Clean Acoustic Stratocaster Plucks', volume: 0.78, pan: -0.2, humanizeEnabled: true, humanizeAmount: 0.15, initialClipsCount: 1 },
      { name: 'Live Vocal / Mic Bus', type: 'audio', color: '#EC4899', volume: 0.88, pan: 0, initialClipsCount: 0 }
    ]
  },
  {
    id: 'template-devine-industrial',
    name: 'Devine Machine Industrial Glitch Breaks',
    bpm: 165,
    genre: 'IDM / Drum & Bass / Breakcore',
    description: 'High-octane amen break chops, randomized slice reversals, Beam Splitter 3-band crossover isolation, and heavy sub glide.',
    color: '#8B5CF6',
    tracks: [
      { name: 'Amen Break (OG Chop)', type: 'audio', color: '#EF4444', volume: 0.90, pan: 0, initialClipsCount: 1 },
      { name: 'Reese Bass Sub Glide', type: 'midi', color: '#8B5CF6', instrument: 'Model D Moog Sub Bass', volume: 0.92, pan: 0, initialClipsCount: 1 },
      { name: 'Devine Granular Shards', type: 'audio', color: '#06B6D4', volume: 0.76, pan: -0.25, initialClipsCount: 1 },
      { name: 'Beam Splitter High Fizz', type: 'audio', color: '#F59E0B', volume: 0.70, pan: 0.3, initialClipsCount: 1 }
    ]
  }
];
