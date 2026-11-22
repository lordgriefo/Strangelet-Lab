import { Track } from './types';

export const THEME = {
  colors: {
    bg: '#121212',
    panel: '#1E1E1E',
    panelHover: '#252525',
    gold: '#FFD700',
    goldDim: '#BFA200',
    textMain: '#E0E0E0',
    textMuted: '#A0A0A0',
    danger: '#EF4444',
    success: '#10B981'
  }
};

export const INITIAL_TRACKS: Track[] = [
  { 
    id: '1', 
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
    bus: 'Vocal Master Bus',
    vsts: ['[VST3] Strangelet Warm Tube 12AX7', 'Faust: Deep Cavern Shimmer Reverb'],
    clips: [
      { id: 'c1', name: 'The_Breach_Lead_Vox.wav', startBar: 0, durationBars: 8 },
      { id: 'c2', name: 'The_Breach_Harmony_Stack.wav', startBar: 8, durationBars: 8 }
    ],
    automation: {
      volume: {
        enabled: true,
        visible: true,
        points: [
          { id: 'v1-1', time: 0, value: 0.2 },
          { id: 'v1-2', time: 0.125, value: 0.85 },
          { id: 'v1-3', time: 0.375, value: 0.72 },
          { id: 'v1-4', time: 0.5, value: 0.9 },
          { id: 'v1-5', time: 0.875, value: 0.85 },
          { id: 'v1-6', time: 1.0, value: 0.1 }
        ]
      },
      pan: {
        enabled: false,
        visible: false,
        points: [
          { id: 'p1-1', time: 0, value: 0 },
          { id: 'p1-2', time: 0.5, value: -0.2 },
          { id: 'p1-3', time: 1, value: 0.2 }
        ]
      },
      activeParameter: 'volume',
      isExpanded: true
    }
  },
  { 
    id: '2', 
    name: 'Drums', 
    type: 'audio', 
    volume: 0.78, 
    pan: 0, 
    muted: false, 
    soloed: false, 
    color: '#38BDF8', 
    phaseInverted: false, 
    isMono: false, 
    vstBypassed: true, 
    bus: 'Drum Group Bus',
    vsts: ['[AU] Precision Mastering Limiter'],
    clips: [
      { id: 'c3', name: 'The_Breach_Drums_124bpm.wav', startBar: 0, durationBars: 8 },
      { id: 'c4', name: 'The_Breach_Breakdown_Beat.wav', startBar: 8, durationBars: 8 }
    ],
    automation: {
      volume: {
        enabled: true,
        visible: false,
        points: [
          { id: 'v2-1', time: 0, value: 0.75 },
          { id: 'v2-2', time: 0.48, value: 0.75 },
          { id: 'v2-3', time: 0.5, value: 0.3 },
          { id: 'v2-4', time: 0.53, value: 0.85 },
          { id: 'v2-5', time: 1.0, value: 0.75 }
        ]
      },
      pan: {
        enabled: false,
        visible: false,
        points: [
          { id: 'p2-1', time: 0, value: 0 },
          { id: 'p2-2', time: 1, value: 0 }
        ]
      },
      activeParameter: 'volume',
      isExpanded: false
    }
  },
  { 
    id: '3', 
    name: 'Acid 303 Bass', 
    type: 'audio', 
    volume: 0.74, 
    pan: 0.05, 
    muted: false, 
    soloed: false, 
    color: '#10B981', 
    phaseInverted: false, 
    isMono: true, 
    vstBypassed: false, 
    bus: 'Stereo Master',
    vsts: ['Faust: TB-303 Diode Acid Filter Toy'],
    clips: [
      { id: 'c5', name: 'The_Breach_Acid_Bassline.wav', startBar: 0, durationBars: 16 }
    ],
    automation: {
      volume: {
        enabled: true,
        visible: false,
        points: [
          { id: 'v3-1', time: 0, value: 0 },
          { id: 'v3-2', time: 0.125, value: 0.75 },
          { id: 'v3-3', time: 0.25, value: 0.2 },
          { id: 'v3-4', time: 0.31, value: 0.8 },
          { id: 'v3-5', time: 0.5, value: 0.2 },
          { id: 'v3-6', time: 0.56, value: 0.85 },
          { id: 'v3-7', time: 0.75, value: 0.2 },
          { id: 'v3-8', time: 0.81, value: 0.8 },
          { id: 'v3-9', time: 1.0, value: 0.7 }
        ]
      },
      pan: {
        enabled: false,
        visible: false,
        points: [
          { id: 'p3-1', time: 0, value: 0 },
          { id: 'p3-2', time: 1, value: 0 }
        ]
      },
      params: {
        'faust:faust-acid-filter:cutoff': {
          id: 'faust:faust-acid-filter:cutoff',
          pluginId: 'faust-acid-filter',
          pluginName: 'TB-303 Diode Acid Filter Toy',
          pluginSource: 'faust',
          paramId: 'cutoff',
          paramName: 'Cutoff',
          min: 40,
          max: 8000,
          defaultValue: 1100,
          unit: 'Hz',
          color: '#EC4899',
          enabled: true,
          visible: true,
          points: [
            { id: 'ac-1', time: 0, value: 420, curve: 0.35 },
            { id: 'ac-2', time: 0.25, value: 3200, curve: -0.25 },
            { id: 'ac-3', time: 0.5, value: 6400, curve: 0.3 },
            { id: 'ac-4', time: 0.75, value: 1850, curve: -0.2 },
            { id: 'ac-5', time: 1, value: 520 }
          ]
        }
      },
      activeParameter: 'faust:faust-acid-filter:cutoff',
      isExpanded: true
    }
  },
  { 
    id: '4', 
    name: 'Synth Pad', 
    type: 'audio', 
    volume: 0.68, 
    pan: -0.25, 
    muted: false, 
    soloed: false, 
    color: '#A855F7', 
    phaseInverted: false, 
    isMono: false, 
    vstBypassed: false, 
    bus: 'Stereo Master',
    vsts: ['Faust: VHS 1985 Chorus & Pitch Drift'],
    clips: [
      { id: 'c6', name: 'The_Breach_Atmosphere_Pad.wav', startBar: 0, durationBars: 16 }
    ],
    automation: {
      volume: {
        enabled: false,
        visible: false,
        points: [
          { id: 'v4-1', time: 0, value: 0.65 },
          { id: 'v4-2', time: 1, value: 0.65 }
        ]
      },
      pan: {
        enabled: true,
        visible: true,
        points: [
          { id: 'p4-1', time: 0, value: -0.75 },
          { id: 'p4-2', time: 0.25, value: 0.75 },
          { id: 'p4-3', time: 0.5, value: -0.75 },
          { id: 'p4-4', time: 0.75, value: 0.75 },
          { id: 'p4-5', time: 1.0, value: -0.75 }
        ]
      },
      activeParameter: 'pan',
      isExpanded: true
    }
  },
  { 
    id: '5', 
    name: 'Occult Lead Guitar', 
    type: 'audio', 
    volume: 0.75, 
    pan: 0.20, 
    muted: false, 
    soloed: false, 
    color: '#F59E0B', 
    phaseInverted: false, 
    isMono: true, 
    vstBypassed: false, 
    bus: 'Stereo Master',
    vsts: ['Faust: Lynchean Tape Echo VST Toy'],
    clips: [
      { id: 'c7', name: 'The_Breach_Lead_Guitar.wav', startBar: 2, durationBars: 14 }
    ],
    automation: {
      volume: {
        enabled: false,
        visible: false,
        points: [
          { id: 'v5-1', time: 0, value: 0.75 },
          { id: 'v5-2', time: 1, value: 0.75 }
        ]
      },
      pan: {
        enabled: false,
        visible: false,
        points: [
          { id: 'p5-1', time: 0, value: 0.2 },
          { id: 'p5-2', time: 1, value: 0.2 }
        ]
      },
      activeParameter: 'volume',
      isExpanded: false
    }
  },
];

export const MOCK_WAVEFORM = Array.from({ length: 50 }, () => Math.random());