import { ProjectTemplate, View } from './types';

export const ROUTING_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'vocal-tracking',
    name: 'Vocal Tracking',
    category: 'RECORDING',
    tagline: 'Zero-latency vocal tracking matrix with doubles, pitch correction, vocal glue bus, and dual aux sends.',
    description: 'Calibrated for capturing studio-grade vocals. Features low-latency direct monitoring for the performer, auto-tuned lead channel, spread stereo doubles, a sum glue bus, and dedicated Plate Reverb & Ping-Pong Delay aux sends.',
    recommendedView: View.MIXER,
    defaultTempo: 124,
    sampleRate: 48000,
    bitDepth: 24,
    routingHighlights: [
      'Isolated Mono Mic Input with Phase Inversion ready',
      'L/R Hard-Panned Doubles summed to unified Vocal Bus',
      'Aux 1: 100% Wet High-Passed Studio Plate Reverb',
      'Aux 2: 1/8-note Damped Ping-Pong Stereo Delay',
      'Dedicated Zero-Latency Performer Cue Mix Output'
    ],
    signalFlowDiagram: [
      { stage: 'INPUT', description: 'Mic 1 (XLR) -> Preamp Drive -> High-Pass 80Hz', color: '#FFD700' },
      { stage: 'TRACK INSERTS', description: 'Pitch Corrector -> De-Esser HF -> 1176 Opto Comp', color: '#F59E0B' },
      { stage: 'AUX SENDS', description: 'Parallel Send -> Aux 1 (Plate) & Aux 2 (Ping-Pong)', color: '#38BDF8' },
      { stage: 'SUMMING BUS', description: 'All Takes Sum -> Vocal Bus (Tape Saturation + Bus Comp)', color: '#FF8C00' },
      { stage: 'MONITOR CUE', description: 'Zero-Latency Headphone Mix -> DAC Out 3/4', color: '#10B981' }
    ],
    buses: [
      { id: 'vocal-bus', name: 'Vocal Master Bus', color: '#FF8C00', destination: 'Stereo Master Out' },
      { id: 'aux-reverb', name: 'Aux 1: Plate Reverb', color: '#38BDF8', destination: 'Stereo Master Out' },
      { id: 'aux-delay', name: 'Aux 2: Ping-Pong Delay', color: '#818CF8', destination: 'Stereo Master Out' }
    ],
    tracks: [
      {
        id: 'vox-lead',
        name: 'Lead Vox (Main)',
        type: 'audio',
        volume: 0.88,
        pan: 0,
        muted: false,
        soloed: false,
        color: '#FFD700',
        phaseInverted: false,
        isMono: true,
        vstBypassed: false,
        bus: 'Vocal Master Bus',
        inputSource: 'Input 1 (Mic XLR)',
        vsts: ['Pitch Tune Pro', 'De-Esser HF', '1176 Opto Comp', 'Air EQ (12kHz)'],
        sends: [
          { target: 'Aux 1: Plate Reverb', levelDb: -6 },
          { target: 'Aux 2: Ping-Pong Delay', levelDb: -12 }
        ],
        clips: [
          { id: 'clip-lead-01', name: 'Lead_Vox_Take01.wav', startBar: 1, durationBars: 8 }
        ]
      },
      {
        id: 'vox-double-l',
        name: 'Vox Double Left',
        type: 'audio',
        volume: 0.70,
        pan: -0.65,
        muted: false,
        soloed: false,
        color: '#F59E0B',
        phaseInverted: false,
        isMono: true,
        vstBypassed: false,
        bus: 'Vocal Master Bus',
        inputSource: 'Input 1 (Mic XLR)',
        vsts: ['Chorus Shifter', 'Fast FET Comp', 'High-Pass 120Hz'],
        sends: [
          { target: 'Aux 1: Plate Reverb', levelDb: -8 }
        ],
        clips: [
          { id: 'clip-dbl-l', name: 'Double_L_Take01.wav', startBar: 1, durationBars: 8 }
        ]
      },
      {
        id: 'vox-double-r',
        name: 'Vox Double Right',
        type: 'audio',
        volume: 0.70,
        pan: 0.65,
        muted: false,
        soloed: false,
        color: '#F59E0B',
        phaseInverted: false,
        isMono: true,
        vstBypassed: false,
        bus: 'Vocal Master Bus',
        inputSource: 'Input 1 (Mic XLR)',
        vsts: ['Chorus Shifter', 'Fast FET Comp', 'High-Pass 120Hz'],
        sends: [
          { target: 'Aux 1: Plate Reverb', levelDb: -8 }
        ],
        clips: [
          { id: 'clip-dbl-r', name: 'Double_R_Take01.wav', startBar: 1, durationBars: 8 }
        ]
      },
      {
        id: 'vox-harmonies',
        name: 'Harmonies / Ad-Libs',
        type: 'audio',
        volume: 0.62,
        pan: 0.20,
        muted: false,
        soloed: false,
        color: '#D97706',
        phaseInverted: false,
        isMono: true,
        vstBypassed: false,
        bus: 'Vocal Master Bus',
        inputSource: 'Input 1 (Mic XLR)',
        vsts: ['Telephone EQ Filter', 'Dynamic De-Esser', 'Slapback Echo'],
        sends: [
          { target: 'Aux 1: Plate Reverb', levelDb: -4 },
          { target: 'Aux 2: Ping-Pong Delay', levelDb: -6 }
        ],
        clips: [
          { id: 'clip-adlib', name: 'Adlibs_Take01.wav', startBar: 5, durationBars: 4 }
        ]
      },
      {
        id: 'vox-bus-stem',
        name: 'Vocal Bus (Glue)',
        type: 'audio',
        volume: 0.90,
        pan: 0,
        muted: false,
        soloed: false,
        color: '#FF8C00',
        phaseInverted: false,
        isMono: false,
        vstBypassed: false,
        bus: 'Stereo Master Out',
        inputSource: 'Internal Sum: Vocal Bus',
        vsts: ['Tape Head Saturation', 'Vocal Glue Comp (2:1)', 'Soothe Suppressor'],
        clips: []
      },
      {
        id: 'aux-plate-track',
        name: 'Aux: Studio Plate',
        type: 'audio',
        volume: 0.75,
        pan: 0,
        muted: false,
        soloed: false,
        color: '#38BDF8',
        phaseInverted: false,
        isMono: false,
        vstBypassed: false,
        bus: 'Stereo Master Out',
        inputSource: 'Aux Bus 1 (Pre-Fader)',
        vsts: ['Lush Plate 140 (100% Wet)', 'High-Pass 180Hz Filter', 'Stereo Imager'],
        clips: []
      },
      {
        id: 'aux-delay-track',
        name: 'Aux: Ping-Pong 1/8',
        type: 'audio',
        volume: 0.68,
        pan: 0,
        muted: false,
        soloed: false,
        color: '#818CF8',
        phaseInverted: false,
        isMono: false,
        vstBypassed: false,
        bus: 'Stereo Master Out',
        inputSource: 'Aux Bus 2 (Post-Fader)',
        vsts: ['BPM Ping-Pong Delay (1/8D)', 'Analog Tape Flutters', 'Low-Pass 4kHz'],
        clips: []
      }
    ]
  },
  {
    id: 'mastering-chain',
    name: 'Mastering Chain',
    category: 'MASTERING',
    tagline: 'High-definition mastering topology with non-destructive A/B reference switching, M/S surgical EQ, and ISP true-peak limiter.',
    description: 'Designed for finalizing mixes for commercial streaming and vinyl. Features level-matched reference track switching that completely bypasses master inserts, linear-phase low cut, 3-band multiband glue dynamics, harmonic exciter, and a 4x oversampled true-peak limiter.',
    recommendedView: View.MASTERING,
    defaultTempo: 120,
    sampleRate: 96000,
    bitDepth: 32,
    routingHighlights: [
      'Unprocessed Reference Track with direct Monitor routing (bypasses DSP)',
      'Linear-Phase 28Hz Low-Cut eliminating sub-audible DC offset',
      'Mid/Side EQ: mono low-end lock below 120Hz, stereo air sheen at 15kHz',
      '3-Band Multiband Dynamics with auto-release glue compression',
      'Inter-Sample Peak (ISP) Brickwall Limiter targeting -14.0 LUFS'
    ],
    signalFlowDiagram: [
      { stage: 'PRE-MASTER', description: 'Stereo Mixdown (24/32-bit Float) -> Input Gain Trim', color: '#FF8C00' },
      { stage: 'SURGICAL M/S', description: 'Linear Phase Low Cut -> Mid Resonance Tamer -> Side High Shelf', color: '#A020F0' },
      { stage: 'MULTIBAND GLUE', description: '3-Band Dynamic Leveling -> Analog Tube Harmonics', color: '#FFD700' },
      { stage: 'STEREO IMAGING', description: 'Mono Bass (<120Hz) -> Elliptical Equalizer -> Ambient Width', color: '#38BDF8' },
      { stage: 'TRUE-PEAK LIMIT', description: 'ISP 4x Oversampling Limiter (Ceiling -0.3 dBFS / Target -14 LUFS)', color: '#EF4444' }
    ],
    buses: [
      { id: 'mastering-pre', name: 'Pre-Master Mix Bus', color: '#FF8C00', destination: 'Mastering DSP Rack' },
      { id: 'ref-monitor', name: 'Ref Direct Monitor Bus', color: '#9D00FF', destination: 'DAC Monitor Out (Bypass)' },
      { id: 'mastering-final', name: 'Final True-Peak Limiter', color: '#EF4444', destination: 'Stereo Master Out' }
    ],
    tracks: [
      {
        id: 'master-premix',
        name: 'Pre-Master Mix (Stereo)',
        type: 'audio',
        volume: 0.88,
        pan: 0,
        muted: false,
        soloed: false,
        color: '#FF8C00',
        phaseInverted: false,
        isMono: false,
        vstBypassed: false,
        bus: 'Pre-Master Mix Bus',
        inputSource: 'Stems Sum / Mixdown File',
        vsts: ['Linear Phase Low-Cut (28Hz)', 'M/S Surgical Notch EQ', 'Warm Tube Saturation'],
        clips: [
          { id: 'clip-unmastered', name: 'Project_Final_Mixdown_24bit.wav', startBar: 0, durationBars: 16 }
        ]
      },
      {
        id: 'master-ref',
        name: 'A/B Reference Track',
        type: 'audio',
        volume: 0.88,
        pan: 0,
        muted: true,
        soloed: false,
        color: '#9D00FF',
        phaseInverted: false,
        isMono: false,
        vstBypassed: true,
        bus: 'Ref Direct Monitor Bus',
        inputSource: 'Reference Audio File',
        vsts: ['Bypassed (Clean Monitor Out)'],
        clips: [
          { id: 'clip-ref-hit', name: 'Commercial_Reference_Hit.wav', startBar: 0, durationBars: 16 }
        ]
      },
      {
        id: 'master-ms-bus',
        name: 'Mid / Side Precision Stage',
        type: 'audio',
        volume: 0.85,
        pan: 0,
        muted: false,
        soloed: false,
        color: '#A020F0',
        phaseInverted: false,
        isMono: false,
        vstBypassed: false,
        bus: 'Mastering DSP Rack',
        inputSource: 'Internal Sum: Pre-Master',
        vsts: ['Side High-Pass (120Hz)', 'Mid Presence EQ (+1.2dB @ 3.5kHz)', 'Side Air Sheen (+1.8dB @ 15kHz)'],
        clips: []
      },
      {
        id: 'master-multiband',
        name: 'Multiband Dynamics Glue',
        type: 'audio',
        volume: 0.90,
        pan: 0,
        muted: false,
        soloed: false,
        color: '#FFD700',
        phaseInverted: false,
        isMono: false,
        vstBypassed: false,
        bus: 'Mastering DSP Rack',
        inputSource: 'Internal Sum: M/S Stage',
        vsts: ['3-Band Opto-VCA Glue Comp', 'Crest Factor Optimizer', 'Harmonic Tape Exciter'],
        clips: []
      },
      {
        id: 'master-limiter-track',
        name: 'ISP True-Peak Limiter',
        type: 'audio',
        volume: 1.0,
        pan: 0,
        muted: false,
        soloed: false,
        color: '#EF4444',
        phaseInverted: false,
        isMono: false,
        vstBypassed: false,
        bus: 'Stereo Master Out',
        inputSource: 'Final Dynamics Bus',
        vsts: ['ISP 4x Oversampling Limiter', 'Ceiling: -0.3 dBFS', 'Loudness Target: -14 LUFS', 'Dither 24-bit TPDF'],
        clips: []
      }
    ]
  },
  {
    id: 'full-band',
    name: 'Full Band Multi-Track',
    category: 'RECORDING',
    tagline: 'Multi-channel live acoustic band setup with grouped drums, DI & amp bass, dual-mic rhythm guitars, and master bus summing.',
    description: 'Designed for recording rock, jazz, funk, or pop ensembles. Includes separated acoustic drum feeds with sub-group bus, dedicated bass low-end mono lock, rhythm guitar stereo bus with cab impulse responses, and vocal tracking strip.',
    recommendedView: View.MIXER,
    defaultTempo: 118,
    sampleRate: 48000,
    bitDepth: 24,
    routingHighlights: [
      'Drum Stem Bus with parallel New York style compression',
      'Dual Bass Channel: Clean DI sub mono + distorted midrange amp bite',
      'Rhythm Guitars Stereo Bus with Cab Impulse Responses (IR)',
      'Separate Reverb & Room Ambience Sends',
      'Grouped VCA faders for fast ensemble balance'
    ],
    signalFlowDiagram: [
      { stage: 'DRUM BUS', description: 'Kick / Snare / Room -> Parallel NY VCA Compressor', color: '#EF4444' },
      { stage: 'BASS MATRIX', description: 'DI Clean (<120Hz) + Amp Drive Summing to Bass Bus', color: '#EAB308' },
      { stage: 'GUITARS L/R', description: 'Dual Mic Feeds -> Stereo Width Shaper -> Cab IR', color: '#10B981' },
      { stage: 'KEYS & SYNTH', description: 'Stereo DI Input -> Rotary Modulator -> Analog Chorus', color: '#06B6D4' },
      { stage: 'VOCALS', description: 'Mic In -> Optical Comp -> Vintage Console Strip', color: '#FFD700' }
    ],
    buses: [
      { id: 'drum-bus', name: 'Drum Summing Bus', color: '#EF4444', destination: 'Stereo Master Out' },
      { id: 'bass-bus', name: 'Bass Summing Bus', color: '#EAB308', destination: 'Stereo Master Out' },
      { id: 'guitar-bus', name: 'Guitar Stereo Bus', color: '#10B981', destination: 'Stereo Master Out' }
    ],
    tracks: [
      {
        id: 'band-drums',
        name: 'Drums (Sum & Room)',
        type: 'audio',
        volume: 0.80,
        pan: 0,
        muted: false,
        soloed: false,
        color: '#EF4444',
        phaseInverted: false,
        isMono: false,
        vstBypassed: false,
        bus: 'Drum Summing Bus',
        inputSource: 'Inputs 1-4 (Drum Group)',
        vsts: ['Noise Gate/Expander', 'Sub-Kick Punch', 'Parallel NY VCA Comp'],
        clips: [
          { id: 'clip-band-drums', name: 'Live_Drums_Take01.wav', startBar: 0, durationBars: 16 }
        ]
      },
      {
        id: 'band-bass',
        name: 'Bass (DI + Amp)',
        type: 'audio',
        volume: 0.76,
        pan: 0,
        muted: false,
        soloed: false,
        color: '#EAB308',
        phaseInverted: false,
        isMono: true,
        vstBypassed: false,
        bus: 'Bass Summing Bus',
        inputSource: 'Input 5 (Bass Hi-Z)',
        vsts: ['Mono Sub Lock (<100Hz)', 'Opto Bass Comp', 'SVT Tube Amp Sim'],
        clips: [
          { id: 'clip-band-bass', name: 'Bass_Take01.wav', startBar: 0, durationBars: 16 }
        ]
      },
      {
        id: 'band-guitars',
        name: 'Rhythm Guitars (L/R)',
        type: 'audio',
        volume: 0.72,
        pan: 0,
        muted: false,
        soloed: false,
        color: '#10B981',
        phaseInverted: false,
        isMono: false,
        vstBypassed: false,
        bus: 'Guitar Stereo Bus',
        inputSource: 'Inputs 6-7 (Guitar Stereo)',
        vsts: ['Stereo Cab IR Loader', 'Mid Notch 400Hz', 'Tape Flutter'],
        clips: [
          { id: 'clip-band-gt', name: 'Rhythm_Guitar_Stems.wav', startBar: 0, durationBars: 16 }
        ]
      },
      {
        id: 'band-keys',
        name: 'Keys / Organs',
        type: 'audio',
        volume: 0.68,
        pan: 0.25,
        muted: false,
        soloed: false,
        color: '#06B6D4',
        phaseInverted: false,
        isMono: false,
        vstBypassed: false,
        bus: 'Stereo Master Out',
        inputSource: 'Inputs 8-9 (Stereo Line)',
        vsts: ['Rotary Leslie Speaker Sim', 'Warm Chorus', 'Stereo Panning Modulator'],
        clips: []
      },
      {
        id: 'band-vox',
        name: 'Lead Vocals',
        type: 'audio',
        volume: 0.85,
        pan: 0,
        muted: false,
        soloed: false,
        color: '#FFD700',
        phaseInverted: false,
        isMono: true,
        vstBypassed: false,
        bus: 'Stereo Master Out',
        inputSource: 'Input 10 (Lead Mic)',
        vsts: ['Preamp Console Drive', 'LA-2A Optical Comp', 'High-Shelf Air EQ'],
        sends: [
          { target: 'Aux: Studio Plate', levelDb: -6 }
        ],
        clips: [
          { id: 'clip-band-vox', name: 'Vox_Rough_Take.wav', startBar: 2, durationBars: 14 }
        ]
      }
    ]
  },
  {
    id: 'electronic-beat',
    name: 'Electronic & Beat Production',
    category: 'ELECTRONIC',
    tagline: 'Modern 808 sub bass, sidechain pumping duck bus, transient shaped claps, and MIDI synth engines.',
    description: 'Engineered for Hip-Hop, Trap, Synthwave, and EDM. Pre-wired with sidechain compression keyed to the Kick drum so 808s and synths pump automatically without muddy low-end collisions.',
    recommendedView: View.MIXER,
    defaultTempo: 138,
    sampleRate: 48000,
    bitDepth: 24,
    routingHighlights: [
      'Sidechain Ducking Bus automatically keyed to Kick transients',
      'Mono 808 Sub with harmonic tape saturation for phone speaker translation',
      'Transient-shaped punchy Kick & hard clipper on Snare/Clap',
      'Polyphonic MIDI Synth channel linked to built-in arpeggiator',
      'Stereo shimmer pad with automated filter sweeps'
    ],
    signalFlowDiagram: [
      { stage: 'TRANSIENT CORE', description: 'Kick & Claps -> Transient Shaper -> Hard Clipper', color: '#EC4899' },
      { stage: 'SIDECHAIN KEY', description: 'Kick Trigger Signal -> Control Bus (Duck Trigger)', color: '#EF4444' },
      { stage: '808 SUB BASS', description: 'Mono Sub Generator -> Sidechain Ducker -> Harmonic Saturator', color: '#8B5CF6' },
      { stage: 'MIDI SYNTH', description: 'Wavetable Engine -> Filter Envelope -> Tape Ping-Pong Delay', color: '#3B82F6' },
      { stage: 'ATMOSPHERE & FX', description: 'Granular Shimmer Reverb -> Pumping Stereo Bus', color: '#14B8A6' }
    ],
    buses: [
      { id: 'sidechain-bus', name: 'Sidechain Ducking Bus', color: '#EF4444', destination: '808 & Pad Inputs' },
      { id: 'beat-stem-bus', name: 'Drum & Perc Bus', color: '#EC4899', destination: 'Stereo Master Out' }
    ],
    tracks: [
      {
        id: 'beat-kick',
        name: 'Kick (Sidechain Key)',
        type: 'audio',
        volume: 0.88,
        pan: 0,
        muted: false,
        soloed: false,
        color: '#EF4444',
        phaseInverted: false,
        isMono: true,
        vstBypassed: false,
        bus: 'Drum & Perc Bus',
        inputSource: 'Internal Sampler / Audio',
        vsts: ['Transient Punch Enhancer', 'Hard Clipper (0.0dB)'],
        clips: [
          { id: 'clip-kick-loop', name: 'Trap_Kick_Pattern.wav', startBar: 0, durationBars: 8 }
        ]
      },
      {
        id: 'beat-808',
        name: '808 Sub Bass',
        type: 'audio',
        volume: 0.82,
        pan: 0,
        muted: false,
        soloed: false,
        color: '#8B5CF6',
        phaseInverted: false,
        isMono: true,
        vstBypassed: false,
        bus: 'Stereo Master Out',
        inputSource: 'Bass Synth Engine',
        vsts: ['Sidechain Ducker (Key: Kick)', 'Sub Harmonics Generator', 'Tape Saturation Drive'],
        clips: [
          { id: 'clip-808-line', name: 'Sub_808_Glide.wav', startBar: 0, durationBars: 8 }
        ]
      },
      {
        id: 'beat-snare',
        name: 'Snare & Claps',
        type: 'audio',
        volume: 0.78,
        pan: 0,
        muted: false,
        soloed: false,
        color: '#EC4899',
        phaseInverted: false,
        isMono: false,
        vstBypassed: false,
        bus: 'Drum & Perc Bus',
        inputSource: 'Internal Sampler',
        vsts: ['Transient Shaper', 'Plate Reverb Slap (15%)', 'Dynamic EQ'],
        clips: [
          { id: 'clip-snare-loop', name: 'Clap_Snare_Stack.wav', startBar: 0, durationBars: 8 }
        ]
      },
      {
        id: 'beat-synth',
        name: 'Lead Synth (MIDI)',
        type: 'midi',
        volume: 0.74,
        pan: -0.15,
        muted: false,
        soloed: false,
        color: '#3B82F6',
        phaseInverted: false,
        isMono: false,
        vstBypassed: false,
        bus: 'Stereo Master Out',
        inputSource: 'MIDI Keyboard / Sequencer',
        vsts: ['Wavetable Poly Synth', 'Arpeggiator 1/16 Sync', 'Stereo Ping-Pong Delay'],
        clips: [
          { id: 'clip-synth-midi', name: 'Lead_Arp_Progression.mid', startBar: 0, durationBars: 8 }
        ]
      },
      {
        id: 'beat-atmosphere',
        name: 'Atmosphere & Risers',
        type: 'audio',
        volume: 0.65,
        pan: 0,
        muted: false,
        soloed: false,
        color: '#14B8A6',
        phaseInverted: false,
        isMono: false,
        vstBypassed: false,
        bus: 'Stereo Master Out',
        inputSource: 'Audio Loops / FX',
        vsts: ['Sidechain Ducking (Key: Kick)', 'Granular Shimmer', 'Auto-Pan Modulator'],
        clips: [
          { id: 'clip-riser', name: 'Ambient_Texture_Loop.wav', startBar: 4, durationBars: 8 }
        ]
      }
    ]
  },
  {
    id: 'podcast-broadcast',
    name: 'Podcast & Dialogue Broadcast',
    category: 'BROADCAST',
    tagline: 'Dual-mic interview broadcast layout with intelligent noise gate, voice auto-leveler, and sidechain-ducked soundboard.',
    description: 'Calibrated for podcasting, voiceover, and broadcast streaming. Automatic vocal leveling, de-bleed phase alignment, and smart sidechain ducking that automatically softens background music when hosts speak.',
    recommendedView: View.MIXER,
    defaultTempo: 100,
    sampleRate: 48000,
    bitDepth: 24,
    routingHighlights: [
      'Dual-host speech channels with adaptive background noise gates',
      'Dynamic voice levelers ensuring even speech loudness across whispered & loud segments',
      'Intro/Outro & Bumper channel auto-ducked by -12dB when speech is detected',
      'Broadcast-compliant true-peak limiter calibrated to -16.0 LUFS integrated'
    ],
    signalFlowDiagram: [
      { stage: 'INPUT GATING', description: 'Mic A & Mic B -> Low-Cut 90Hz -> Adaptive Expander Gate', color: '#FFD700' },
      { stage: 'VOICE POLISH', description: 'De-Esser -> Dynamic Voice Leveler -> Warm Proximity EQ', color: '#06B6D4' },
      { stage: 'AUTO-DUCKING', description: 'Dialogue Bus -> Sidechain Duck Trigger -> Bumper Music Track', color: '#A855F7' },
      { stage: 'BROADCAST MASTER', description: 'Summing -> Multiband Speech Clarity -> -16 LUFS Limiter', color: '#10B981' }
    ],
    buses: [
      { id: 'dialogue-bus', name: 'Dialogue Master Bus', color: '#06B6D4', destination: 'Broadcast Master Limiter' },
      { id: 'music-bus', name: 'Bumper Music Bus (Ducked)', color: '#A855F7', destination: 'Broadcast Master Limiter' }
    ],
    tracks: [
      {
        id: 'podcast-host',
        name: 'Host 1 (Mic A)',
        type: 'audio',
        volume: 0.88,
        pan: -0.1,
        muted: false,
        soloed: false,
        color: '#FFD700',
        phaseInverted: false,
        isMono: true,
        vstBypassed: false,
        bus: 'Dialogue Master Bus',
        inputSource: 'Input 1 (Shure SM7B)',
        vsts: ['Adaptive Noise Gate', 'Dynamic De-Esser', 'Voice Auto-Leveler', 'Broadcast Body EQ'],
        clips: [
          { id: 'clip-host-take', name: 'Host_Intro_Speech.wav', startBar: 0, durationBars: 12 }
        ]
      },
      {
        id: 'podcast-guest',
        name: 'Guest 2 (Mic B)',
        type: 'audio',
        volume: 0.88,
        pan: 0.1,
        muted: false,
        soloed: false,
        color: '#06B6D4',
        phaseInverted: false,
        isMono: true,
        vstBypassed: false,
        bus: 'Dialogue Master Bus',
        inputSource: 'Input 2 (Mic XLR)',
        vsts: ['Adaptive Noise Gate', 'Dynamic De-Esser', 'Voice Auto-Leveler', 'Presence Sheen EQ'],
        clips: [
          { id: 'clip-guest-take', name: 'Guest_Response_Speech.wav', startBar: 4, durationBars: 10 }
        ]
      },
      {
        id: 'podcast-bumper',
        name: 'Bumper & Soundboard',
        type: 'audio',
        volume: 0.60,
        pan: 0,
        muted: false,
        soloed: false,
        color: '#A855F7',
        phaseInverted: false,
        isMono: false,
        vstBypassed: false,
        bus: 'Bumper Music Bus (Ducked)',
        inputSource: 'Soundboard / Music Track',
        vsts: ['Sidechain Ducking (-12dB Duck when Dialogue Active)', 'Gentle High/Low Pass'],
        clips: [
          { id: 'clip-intro-music', name: 'Podcast_Intro_Theme.wav', startBar: 0, durationBars: 6 }
        ]
      },
      {
        id: 'podcast-master-bus',
        name: 'Dialogue Sum & Master',
        type: 'audio',
        volume: 0.95,
        pan: 0,
        muted: false,
        soloed: false,
        color: '#10B981',
        phaseInverted: false,
        isMono: false,
        vstBypassed: false,
        bus: 'Stereo Master Out',
        inputSource: 'Internal Sum: Dialogue + Bumper',
        vsts: ['Multiband Speech Glue', 'Broadcaster True-Peak Limiter (-16 LUFS)'],
        clips: []
      }
    ]
  },
  {
    id: 'clean-slate',
    name: 'Blank Project (Clean Slate)',
    category: 'CUSTOM',
    tagline: 'Minimalist canvas with a clean stereo master output, perfect for importing custom stems or building bespoke routing.',
    description: 'Starts with zero routing overhead and an uncolored signal path. Add channels, route sub-buses, and insert custom processors from scratch.',
    recommendedView: View.MIXER,
    defaultTempo: 120,
    sampleRate: 44100,
    bitDepth: 24,
    routingHighlights: [
      'Uncolored signal path ready for custom busing',
      'Stereo master bus calibrated to unity gain (0.0 dB)',
      'Flexible track import for drag-and-drop workflow'
    ],
    signalFlowDiagram: [
      { stage: 'TRACK INPUTS', description: 'User-Defined Mono or Stereo Channels', color: '#708090' },
      { stage: 'DSP INSERTS', description: 'Custom VST & Effect Routing', color: '#26619C' },
      { stage: 'STEREO OUT', description: 'Direct Uncolored Master Output', color: '#FFD700' }
    ],
    buses: [
      { id: 'stereo-out', name: 'Stereo Master Out', color: '#FFD700', destination: 'Hardware DAC 1/2' }
    ],
    tracks: [
      {
        id: 'clean-track-1',
        name: 'Stereo Audio 1',
        type: 'audio',
        volume: 0.80,
        pan: 0,
        muted: false,
        soloed: false,
        color: '#FFD700',
        phaseInverted: false,
        isMono: false,
        vstBypassed: true,
        bus: 'Stereo Master Out',
        inputSource: 'Stereo Input 1/2',
        vsts: [],
        clips: []
      }
    ]
  }
];
