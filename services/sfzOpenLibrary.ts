/**
 * Strangelet Lab: SFZ Open Library & Sample Community Exchange
 * 
 * Curated catalog of community-shared and open-source SFZ sample instruments,
 * real-time WebAudio audition engine, format exporter, and community sharing.
 */

import { SfzLibraryInstrument } from '../types';
import { getAudioContext } from '../lib/laserSound';

const SFZ_STORAGE_KEY = 'strangelet_sfz_open_library_custom';

export const INITIAL_SFZ_LIBRARY: SfzLibraryInstrument[] = [
  {
    id: 'sfz-rhodes-1973',
    name: '1973 Vintage Rhodes Mk I Stage 73',
    category: 'keys',
    author: 'TineAlchemist (Community)',
    description: 'Captured from an authentic 1973 Stage 73 through a vintage Fender Twin Reverb amp. 6 velocity layers per key with genuine mechanical tine release chimes and warm harmonic chime.',
    sampleCount: 88,
    velocityLayers: 6,
    fileSizeMb: 142.5,
    tags: ['Rhodes', 'Electric Piano', 'Vintage', 'Soul', 'Lo-Fi', 'Warm'],
    previewSynthType: 'keys',
    sfzDefinition: `// 1973 Rhodes Mk I Stage 73 SFZ Map
<global>
polyphony=64
volume=0
ampeg_attack=0.001
ampeg_decay=4.5
ampeg_sustain=0.15
ampeg_release=0.45

<group>
group_label=Sustain Tines
cutoff=8500
fil_type=lpf_2p

<region> sample=samples/rhodes_c2_v1.wav lokey=36 hikey=47 lovel=1 hivel=45 pitch_keycenter=36
<region> sample=samples/rhodes_c2_v2.wav lokey=36 hikey=47 lovel=46 hivel=85 pitch_keycenter=36
<region> sample=samples/rhodes_c2_v3.wav lokey=36 hikey=47 lovel=86 hivel=127 pitch_keycenter=36
<region> sample=samples/rhodes_c4_v1.wav lokey=48 hikey=71 lovel=1 hivel=45 pitch_keycenter=60
<region> sample=samples/rhodes_c4_v2.wav lokey=48 hikey=71 lovel=46 hivel=85 pitch_keycenter=60
<region> sample=samples/rhodes_c4_v3.wav lokey=48 hikey=71 lovel=86 hivel=127 pitch_keycenter=60
`
  },
  {
    id: 'sfz-juno-106-pad',
    name: 'Juno-106 Analog Saw Chorus Pad',
    category: 'synths',
    author: 'RolandPurist (Tokyo Collective)',
    description: 'Sumptuous stereo analog lushness recorded directly through the coveted BBD analog Chorus II circuit. Rich sub-oscillator reinforcement and filter resonance sweep.',
    sampleCount: 48,
    velocityLayers: 4,
    fileSizeMb: 86.2,
    tags: ['Juno 106', 'Analog Pad', 'BBD Chorus', 'Synthwave', 'Ambient'],
    previewSynthType: 'pad',
    sfzDefinition: `// Juno-106 Analog Chorus Pad SFZ Map
<global>
polyphony=32
ampeg_attack=0.45
ampeg_decay=2.8
ampeg_sustain=0.75
ampeg_release=1.8

<group>
group_label=Chorus Saw Pad
pan_curve=2
fil_type=lpf_4p
cutoff=4800

<region> sample=samples/juno_c1.wav lokey=24 hikey=35 lovel=1 hivel=127 pitch_keycenter=24
<region> sample=samples/juno_c2.wav lokey=36 hikey=47 lovel=1 hivel=127 pitch_keycenter=36
<region> sample=samples/juno_c3.wav lokey=48 hikey=59 lovel=1 hivel=127 pitch_keycenter=48
<region> sample=samples/juno_c4.wav lokey=60 hikey=71 lovel=1 hivel=127 pitch_keycenter=60
<region> sample=samples/juno_c5.wav lokey=72 hikey=83 lovel=1 hivel=127 pitch_keycenter=72
`
  },
  {
    id: 'sfz-chamber-cello',
    name: 'Spitfire Intimate Chamber Cello',
    category: 'strings',
    author: 'OrchestralHacks (London)',
    description: 'Hyper-expressive solo cello recorded in a resonant stone chapel. Captures delicate rosin friction, slow sul tasto bowing, and impassioned forte vibrato.',
    sampleCount: 64,
    velocityLayers: 5,
    fileSizeMb: 118.0,
    tags: ['Cello', 'Strings', 'Acoustic', 'Expressive', 'Cinematic', 'Folk'],
    previewSynthType: 'pad',
    sfzDefinition: `// Intimate Chamber Cello SFZ Map
<global>
polyphony=16
ampeg_attack=0.18
ampeg_decay=3.2
ampeg_sustain=0.82
ampeg_release=0.95

<group>
group_label=Solo Sul Tasto Cello
<region> sample=samples/cello_c2_pp.wav lokey=36 hikey=42 lovel=1 hivel=60 pitch_keycenter=36
<region> sample=samples/cello_c2_ff.wav lokey=36 hikey=42 lovel=61 hivel=127 pitch_keycenter=36
<region> sample=samples/cello_g2_pp.wav lokey=43 hikey=50 lovel=1 hivel=60 pitch_keycenter=43
<region> sample=samples/cello_g2_ff.wav lokey=43 hikey=50 lovel=61 hivel=127 pitch_keycenter=43
`
  },
  {
    id: 'sfz-moog-model-d',
    name: 'Model D Moog Sub 3-Osc Bass',
    category: 'bass',
    author: 'TransistorLab (Detroit)',
    description: 'Triple-oscillator discrete transistor ladder filter bass from a 1974 Minimoog. Delivers the undeniable low-end authority that anchors West Coast hip-hop and funk.',
    sampleCount: 36,
    velocityLayers: 4,
    fileSizeMb: 52.4,
    tags: ['Minimoog', 'Analog Bass', 'Ladder Filter', 'Sub', 'Funk', '808'],
    previewSynthType: 'bass',
    sfzDefinition: `// Model D Moog Sub Bass SFZ Map
<global>
polyphony=1
ampeg_attack=0.005
ampeg_decay=1.2
ampeg_sustain=0.4
ampeg_release=0.15

<group>
group_label=Ladder Filter Sub
cutoff=1800
resonance=8.5

<region> sample=samples/moog_c1.wav lokey=24 hikey=35 lovel=1 hivel=127 pitch_keycenter=24
<region> sample=samples/moog_c2.wav lokey=36 hikey=47 lovel=1 hivel=127 pitch_keycenter=36
<region> sample=samples/moog_c3.wav lokey=48 hikey=59 lovel=1 hivel=127 pitch_keycenter=48
`
  },
  {
    id: 'sfz-strat-plucks',
    name: 'Clean Acoustic Stratocaster Plucks',
    category: 'guitars',
    author: 'NashvilleStemGuild',
    description: '1962 Reissue Stratocaster clean neck pickup played with natural fingerstyle attack. Features round-robin note variations and palm-muted staccato layers.',
    sampleCount: 72,
    velocityLayers: 4,
    fileSizeMb: 94.3,
    tags: ['Guitar', 'Stratocaster', 'Fingerstyle', 'Organic', 'Acoustic', 'Clean'],
    previewSynthType: 'pluck',
    sfzDefinition: `// Clean Stratocaster Plucks SFZ Map
<global>
polyphony=24
ampeg_attack=0.002
ampeg_decay=2.1
ampeg_sustain=0.1
ampeg_release=0.25

<group>
group_label=Neck Pickup Fingerstyle
<region> sample=samples/strat_e2.wav lokey=40 hikey=46 lovel=1 hivel=127 pitch_keycenter=40
<region> sample=samples/strat_a2.wav lokey=47 hikey=52 lovel=1 hivel=127 pitch_keycenter=47
<region> sample=samples/strat_d3.wav lokey=53 hikey=58 lovel=1 hivel=127 pitch_keycenter=53
<region> sample=samples/strat_g3.wav lokey=59 hikey=64 lovel=1 hivel=127 pitch_keycenter=59
`
  },
  {
    id: 'sfz-linndrum-tape',
    name: 'LinnDrum LM-1 Authentic Tape Chops',
    category: 'drums',
    author: 'PrinceVaultTribute',
    description: 'The definitive sound of 1980s Minneapolis funk: punchy LM-1 eprom chips tracked directly through a revox A77 tape recorder with variable speed pitch detuning.',
    sampleCount: 32,
    velocityLayers: 4,
    fileSizeMb: 38.6,
    tags: ['LinnDrum', 'LM1', '80s Drums', 'Prince', 'Tape Punch', 'Vintage'],
    previewSynthType: 'lead',
    sfzDefinition: `// LinnDrum LM-1 Tape Chops SFZ Map
<global>
polyphony=16

<group>
group_label=LM1 Tape Drums
<region> sample=samples/lm1_kick.wav key=36 lovel=1 hivel=127
<region> sample=samples/lm1_snare.wav key=38 lovel=1 hivel=127
<region> sample=samples/lm1_sidestick.wav key=37 lovel=1 hivel=127
<region> sample=samples/lm1_hihat_cl.wav key=42 lovel=1 hivel=127
<region> sample=samples/lm1_hihat_op.wav key=46 lovel=1 hivel=127
<region> sample=samples/lm1_tom_hi.wav key=50 lovel=1 hivel=127
<region> sample=samples/lm1_tom_low.wav key=45 lovel=1 hivel=127
<region> sample=samples/lm1_cowbell.wav key=56 lovel=1 hivel=127
<region> sample=samples/lm1_conga.wav key=64 lovel=1 hivel=127
`
  },
  {
    id: 'sfz-devine-granular-shards',
    name: 'Devine Machine Granular Tape Shards',
    category: 'experimental',
    author: 'StrangeletCoreLab',
    description: 'Burroughsian permutational tape cut-ups, micro-stutters, bit-crushed resonant chirps, and reversed tape tails from the legendary Devine Machine VST lineage.',
    sampleCount: 54,
    velocityLayers: 3,
    fileSizeMb: 68.0,
    tags: ['Devine Machine', 'Glitch', 'Granular', 'IDM', 'Reel Cut-Up', 'Burroughs'],
    previewSynthType: 'bell',
    sfzDefinition: `// Devine Machine Granular Tape Shards SFZ Map
<global>
polyphony=32
ampeg_attack=0.01
ampeg_decay=1.8
ampeg_sustain=0.2
ampeg_release=0.4

<group>
group_label=Granular Glitch Chops
<region> sample=samples/shard_slice_1.wav key=60 lovel=1 hivel=127
<region> sample=samples/shard_slice_2.wav key=61 lovel=1 hivel=127
<region> sample=samples/shard_slice_rev.wav key=62 lovel=1 hivel=127
`
  }
];

export function getStoredSfzLibrary(): SfzLibraryInstrument[] {
  try {
    const raw = localStorage.getItem(SFZ_STORAGE_KEY);
    if (!raw) return INITIAL_SFZ_LIBRARY;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_SFZ_LIBRARY;
  } catch (err) {
    return INITIAL_SFZ_LIBRARY;
  }
}

export function saveStoredSfzLibrary(library: SfzLibraryInstrument[]): void {
  try {
    localStorage.setItem(SFZ_STORAGE_KEY, JSON.stringify(library));
  } catch (err) {
    console.warn('Failed to save SFZ library to localStorage:', err);
  }
}

export function addCustomSfzInstrument(instrument: Omit<SfzLibraryInstrument, 'id'>): SfzLibraryInstrument {
  const current = getStoredSfzLibrary();
  const created: SfzLibraryInstrument = {
    ...instrument,
    id: `sfz-custom-${Date.now()}`,
    isCommunityShared: true
  };
  const updated = [created, ...current];
  saveStoredSfzLibrary(updated);
  return created;
}

export function deleteSfzInstrument(id: string): void {
  const current = getStoredSfzLibrary();
  const filtered = current.filter(i => i.id !== id);
  saveStoredSfzLibrary(filtered);
}

/**
 * Real-time Web Audio Synthesizer Audition Engine
 * Plays an authentic musical phrase representing the instrument sound
 */
export function playSfzInstrumentAudition(synthType: SfzLibraryInstrument['previewSynthType']): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const notes = [
      { f: 261.63, t: 0, d: 0.35 },    // C4
      { f: 329.63, t: 0.3, d: 0.35 },  // E4
      { f: 392.00, t: 0.6, d: 0.4 },   // G4
      { f: 523.25, t: 0.9, d: 0.7 }    // C5
    ];

    notes.forEach(({ f, t, d }) => {
      const startTime = now + t;
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      if (synthType === 'keys') {
        // Rhodes tine model: sine + gentle harmonics + filter decay
        osc.type = 'sine';
        osc2.type = 'triangle';
        osc.frequency.setValueAtTime(f, startTime);
        osc2.frequency.setValueAtTime(f * 2, startTime);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2400, startTime);
        filter.frequency.exponentialRampToValueAtTime(600, startTime + d);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.18, startTime + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + d);
      } else if (synthType === 'bass') {
        // Moog 3-osc sub: saw + square with ladder lowpass
        osc.type = 'sawtooth';
        osc2.type = 'square';
        osc.frequency.setValueAtTime(f * 0.5, startTime);
        osc2.frequency.setValueAtTime(f * 0.505, startTime);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, startTime);
        filter.frequency.exponentialRampToValueAtTime(140, startTime + d);
        filter.Q.setValueAtTime(5.5, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.25, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + d);
      } else if (synthType === 'pad') {
        // Lush analog Juno chorus pad
        osc.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, startTime);
        osc2.frequency.setValueAtTime(f * 1.004, startTime);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3200, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.14, startTime + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + d + 0.2);
      } else if (synthType === 'pluck') {
        // Acoustic guitar pluck
        osc.type = 'triangle';
        osc2.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, startTime);
        osc2.frequency.setValueAtTime(f * 2, startTime);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(4500, startTime);
        filter.frequency.exponentialRampToValueAtTime(400, startTime + d);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.2, startTime + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + d);
      } else {
        // Bell / Glitch / Lead
        osc.type = 'sine';
        osc2.type = 'sine';
        osc.frequency.setValueAtTime(f, startTime);
        osc2.frequency.setValueAtTime(f * 2.76, startTime); // metallic ratio
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(f * 2, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.16, startTime + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + d);
      }

      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc2.start(startTime);
      osc.stop(startTime + d + 0.2);
      osc2.stop(startTime + d + 0.2);
    });
  } catch (err) {
    console.warn('Audio audition error:', err);
  }
}

/**
 * Downloads SFZ definition as a formatted .sfz file
 */
export function downloadSfzFile(instrument: SfzLibraryInstrument): void {
  const blob = new Blob([instrument.sfzDefinition], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${instrument.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.sfz`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
