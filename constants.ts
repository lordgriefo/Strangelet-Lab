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
    name: 'Vocals', 
    type: 'audio', 
    volume: 0.82, 
    pan: 0, 
    muted: false, 
    soloed: false, 
    color: '#FFD700', 
    phaseInverted: false, 
    isMono: true, 
    vstBypassed: false, 
    bus: 'Vocal Master Bus',
    clips: [
      { id: 'c1', name: 'Lead_Hook_Take02.wav', startBar: 0, durationBars: 8 },
      { id: 'c2', name: 'Harmony_Stack.wav', startBar: 8, durationBars: 6 }
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
    clips: [
      { id: 'c3', name: 'Acid_Beat_124bpm.wav', startBar: 0, durationBars: 8 },
      { id: 'c4', name: 'Acid_Beat_Breakdown.wav', startBar: 8, durationBars: 8 }
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
    clips: [
      { id: 'c5', name: 'TB303_AcidLine_Fm.wav', startBar: 2, durationBars: 12 }
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
      activeParameter: 'volume',
      isExpanded: false
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
    clips: [
      { id: 'c6', name: 'Ambient_Atmosphere_01.wav', startBar: 0, durationBars: 16 }
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
];

export const MOCK_WAVEFORM = Array.from({ length: 50 }, () => Math.random());