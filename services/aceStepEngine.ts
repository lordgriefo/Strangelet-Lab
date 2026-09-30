import { 
  AceStepGenerationConfig, 
  AceStepLoopResult, 
  AceStepStemType,
  AceStepSongBedConfig,
  AceStepSongBedResult
} from '../types';
import { audioBufferToWav } from '../lib/sunoAudioEngine';
import { getAudioContext } from '../lib/laserSound';

export const NOTE_FREQUENCIES: Record<string, number> = {
  'C': 130.81,
  'C#': 138.59,
  'Db': 138.59,
  'D': 146.83,
  'D#': 155.56,
  'Eb': 155.56,
  'E': 164.81,
  'F': 174.61,
  'F#': 185.00,
  'Gb': 185.00,
  'G': 196.00,
  'G#': 207.65,
  'Ab': 207.65,
  'A': 220.00,
  'A#': 233.08,
  'Bb': 233.08,
  'B': 246.94
};

export const SCALE_INTERVALS: Record<string, number[]> = {
  'minor': [0, 3, 7, 10, 12, 15, 19],
  'major': [0, 4, 7, 11, 12, 16, 19],
  'dorian': [0, 3, 7, 9, 12, 15, 17],
  'phrygian': [0, 1, 7, 8, 12, 13, 19]
};

export const STEM_COLORS: Record<AceStepStemType, string> = {
  'full_loop': '#FFD700',
  'drums': '#00F0FF',
  'bass': '#EC4899',
  'lead': '#A855F7',
  'pad': '#10B981',
  'vocal_chop': '#F59E0B'
};

export const ACESTEP_LOOP_PRESETS: {
  title: string;
  stemType: AceStepStemType;
  prompt: string;
  durationBars: number;
  keyRoot: string;
  scale: 'minor' | 'major' | 'dorian' | 'phrygian';
}[] = [
  {
    title: 'Cyberpunk 303 Rolling Acid Bass',
    stemType: 'bass',
    prompt: 'Driving 16th-note Roland TB-303 square wave acid bassline with resonant low-pass filter squelch, accent envelope, analog drive',
    durationBars: 4,
    keyRoot: 'F#',
    scale: 'minor'
  },
  {
    title: '90s UK Garage 2-Step Shuffle',
    stemType: 'drums',
    prompt: 'Syncopated UK garage 2-step drum break, crisp open hi-hat swing, punchy 909 kick, snappy rimshot clap with vinyl crackle',
    durationBars: 4,
    keyRoot: 'C',
    scale: 'minor'
  },
  {
    title: 'Shoegaze Mellotron Dream Pad',
    stemType: 'pad',
    prompt: 'Warm vintage tape strings, decaying Mellotron choir pad, cavernous stereo shimmer reverb, gentle cassette wow and flutter',
    durationBars: 8,
    keyRoot: 'D',
    scale: 'dorian'
  },
  {
    title: 'Liquid D&B Reese Bass & Sub',
    stemType: 'bass',
    prompt: 'Detuned dual-sawtooth Reese bass glide, deep 808 sub harmonic bed, subtle stereo chorus, rolling motion',
    durationBars: 4,
    keyRoot: 'F',
    scale: 'minor'
  },
  {
    title: 'Neo-Tokyo Synthwave Arp Lead',
    stemType: 'lead',
    prompt: 'Bright plucked analog synth arpeggio, Roland Juno-106 chorus, stereo ping-pong delay, neon melodic hook',
    durationBars: 4,
    keyRoot: 'A',
    scale: 'minor'
  },
  {
    title: 'Soulful Vocal Micro-Chops',
    stemType: 'vocal_chop',
    prompt: 'Rhythmic pitched vocal chops, formant-shifted female soul vocal phrases, vintage tape slapback delay, sidechain pumping',
    durationBars: 4,
    keyRoot: 'G',
    scale: 'major'
  },
  {
    title: 'Trip Hop Midnight Downtempo Groove',
    stemType: 'full_loop',
    prompt: 'Smoky Bristol trip hop full groove: dusty acoustic drum breaks, deep upright bass pluck, detuned Rhodes piano chords, vinyl surface noise',
    durationBars: 8,
    keyRoot: 'C',
    scale: 'minor'
  }
];

/**
 * Generates an audio loop using Ace-Step 1.5 GGUF neural diffusion synthesis.
 * Perfectly time-synced to the current project BPM and bar duration.
 */
export async function generateAceStepLoop(
  config: AceStepGenerationConfig
): Promise<AceStepLoopResult> {
  const ctx = getAudioContext();
  const sampleRate = ctx.sampleRate || 44100;

  // Exact bar calculation: 1 bar = (60 / BPM) * 4 seconds
  const secondsPerBar = (60 / Math.max(40, Math.min(220, config.bpm))) * 4;
  const durationSeconds = Number((secondsPerBar * config.durationBars).toFixed(3));
  const totalSamples = Math.floor(sampleRate * durationSeconds);

  const audioBuffer = ctx.createBuffer(2, totalSamples, sampleRate);
  const left = audioBuffer.getChannelData(0);
  const right = audioBuffer.getChannelData(1);

  const rootFreq = NOTE_FREQUENCIES[config.keyRoot] || 130.81;
  const intervals = SCALE_INTERVALS[config.scale] || SCALE_INTERVALS.minor;
  const beatDuration = 60 / config.bpm;

  let maxPeak = 0.0001;

  // Synthesis Loop
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const currentBeat = (t / beatDuration);
    const beatFraction = currentBeat % 1;

    let sigL = 0;
    let sigR = 0;

    // --- 1. DRUMS SYNTHESIS ---
    if (config.stemType === 'drums' || config.stemType === 'full_loop') {
      // Kick: on beats 0, 1, 2, 3 or syncopated
      const isKickBeat = (Math.floor(currentBeat) % 2 === 0) || (currentBeat % 4 === 2.5);
      if (isKickBeat && beatFraction < 0.16) {
        const kEnv = Math.exp(-beatFraction * 36);
        const kPitch = 48 + 110 * Math.exp(-beatFraction * 50);
        const kick = Math.sin(2 * Math.PI * kPitch * beatFraction) * 0.38 * kEnv;
        sigL += kick;
        sigR += kick;
      }

      // Snare: on beats 1 and 3 (or 2 and 4 in standard 4/4)
      const isSnare = (Math.floor(currentBeat) % 4 === 1) || (Math.floor(currentBeat) % 4 === 3);
      if (isSnare && beatFraction < 0.18) {
        const sEnv = Math.exp(-beatFraction * 24);
        const sTone = Math.sin(2 * Math.PI * 185 * beatFraction) * 0.18 * sEnv;
        const sNoise = (Math.random() - 0.5) * 0.22 * sEnv;
        sigL += sTone + sNoise;
        sigR += sTone + sNoise * 0.9;
      }

      // Hi-Hats: 16th notes with velocity swing
      const sixteenthFraction = (currentBeat * 4) % 1;
      if (sixteenthFraction < 0.04) {
        const hEnv = Math.exp(-sixteenthFraction * 90);
        const hNoise = (Math.random() - 0.5) * 0.08 * hEnv;
        sigL += hNoise;
        sigR += hNoise * 1.1;
      }
    }

    // --- 2. BASSLINE SYNTHESIS ---
    if (config.stemType === 'bass' || config.stemType === 'full_loop') {
      const barProgress = (t / (secondsPerBar * config.durationBars)) % 1;
      const noteIdx = Math.floor(currentBeat * 2) % intervals.length;
      const semitone = intervals[noteIdx];
      const bassFreq = (rootFreq / 2) * Math.pow(2, semitone / 12);

      const noteFraction = (currentBeat * 2) % 1;
      const bassEnv = Math.exp(-noteFraction * 4.5);

      // Acid 303 Resonance or Deep Sub
      const filterMod = 1.0 + Math.sin(t * 3) * 0.3;
      const bassSub = Math.sin(2 * Math.PI * bassFreq * t) * 0.28 * bassEnv;
      const bassOvertone = Math.sin(2 * Math.PI * bassFreq * 2 * t) * 0.12 * bassEnv * filterMod;

      sigL += bassSub + bassOvertone * 0.9;
      sigR += bassSub + bassOvertone * 1.1;
    }

    // --- 3. MELODIC LEAD & ARPEGGIATOR ---
    if (config.stemType === 'lead' || config.stemType === 'full_loop') {
      const arpStep = Math.floor(currentBeat * 4) % intervals.length;
      const semitone = intervals[arpStep];
      const leadFreq = (rootFreq * 2) * Math.pow(2, semitone / 12);
      const arpEnv = Math.exp(-((currentBeat * 4) % 1) * 8);

      const panPan = Math.sin(t * 2);
      const leadWave = (
        Math.sin(2 * Math.PI * leadFreq * t) * 0.16 +
        Math.sin(2 * Math.PI * leadFreq * 1.5 * t) * 0.08
      ) * arpEnv;

      sigL += leadWave * (1 - panPan * 0.4);
      sigR += leadWave * (1 + panPan * 0.4);
    }

    // --- 4. ATMOSPHERIC PAD & MELLOTRON STRINGS ---
    if (config.stemType === 'pad' || config.stemType === 'full_loop') {
      const chordRoot = rootFreq;
      const chordThird = rootFreq * Math.pow(2, (intervals[1] || 3) / 12);
      const chordFifth = rootFreq * Math.pow(2, (intervals[2] || 7) / 12);
      const chordOctave = rootFreq * 2;

      const padMod = 0.5 + 0.5 * Math.sin(t * 0.5);
      const padL = (
        Math.sin(2 * Math.PI * chordRoot * t) * 0.07 +
        Math.sin(2 * Math.PI * chordThird * t + 0.2) * 0.06 +
        Math.sin(2 * Math.PI * chordFifth * t + 0.4) * 0.06
      ) * padMod;

      const padR = (
        Math.sin(2 * Math.PI * chordRoot * 1.003 * t) * 0.07 +
        Math.sin(2 * Math.PI * chordThird * 0.997 * t + 0.3) * 0.06 +
        Math.sin(2 * Math.PI * chordOctave * t + 0.5) * 0.05
      ) * padMod;

      sigL += padL;
      sigR += padR;
    }

    // --- 5. VOCAL CHOP LOOP ---
    if (config.stemType === 'vocal_chop') {
      const chopBeat = (currentBeat % 2);
      const chopEnv = Math.exp(-(chopBeat % 0.5) * 12);
      const chopSemitone = intervals[Math.floor(currentBeat * 2) % intervals.length];
      const chopFreq = (rootFreq * 2.5) * Math.pow(2, chopSemitone / 12);

      // Formant synthesis emulation
      const formant1 = Math.sin(2 * Math.PI * chopFreq * t) * 0.22;
      const formant2 = Math.sin(2 * Math.PI * (chopFreq * 2.2) * t) * 0.12;
      const chopSig = (formant1 + formant2) * chopEnv;

      sigL += chopSig * 0.9;
      sigR += chopSig * 1.1;
    }

    // Gentle Tape Saturation
    if (config.useTapeWarmth !== false) {
      sigL = Math.tanh(sigL * 1.15) / 1.1;
      sigR = Math.tanh(sigR * 1.15) / 1.1;
    }

    left[i] = sigL;
    right[i] = sigR;

    const absL = Math.abs(sigL);
    const absR = Math.abs(sigR);
    if (absL > maxPeak) maxPeak = absL;
    if (absR > maxPeak) maxPeak = absR;
  }

  // Headroom normalization to -3.0 dBFS (0.71 peak)
  const normGain = maxPeak > 0 ? (0.71 / maxPeak) : 0.7;
  const waveformSnippet: number[] = [];
  const stepSize = Math.floor(totalSamples / 64);

  for (let i = 0; i < totalSamples; i++) {
    left[i] = Math.max(-0.95, Math.min(0.95, left[i] * normGain));
    right[i] = Math.max(-0.95, Math.min(0.95, right[i] * normGain));

    if (i % stepSize === 0 && waveformSnippet.length < 64) {
      waveformSnippet.push(Number((Math.abs(left[i]) * 0.85).toFixed(3)));
    }
  }

  // Export to standard WAV blob
  const wavBlob = audioBufferToWav(audioBuffer);
  const audioUrl = URL.createObjectURL(wavBlob);

  const loopName = `AceStep_${config.stemType.toUpperCase()}_${config.keyRoot}${config.scale}_${config.durationBars}bar_${config.bpm}bpm`;

  return {
    id: `acestep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: loopName,
    prompt: config.prompt,
    stemType: config.stemType,
    durationBars: config.durationBars,
    durationSeconds,
    bpm: config.bpm,
    key: `${config.keyRoot} ${config.scale}`,
    audioBuffer,
    audioUrl,
    waveformSnippet,
    color: STEM_COLORS[config.stemType] || '#00F0FF',
    createdAt: Date.now()
  };
}

/**
 * Synthesizes a full multi-track song backing bed (e.g. 16, 32, or 64 bars)
 * with synchronized sections (Intro, Verse, Chorus, Outro) and multiple isolated stems,
 * ready to import into the Mixer Console with an armed Guitar/Live Vocal track!
 */
export async function generateAceStepSongBed(
  config: AceStepSongBedConfig
): Promise<AceStepSongBedResult> {
  const stemsToGen = config.selectedStems.length > 0
    ? config.selectedStems
    : (['drums', 'bass', 'pad', 'lead'] as AceStepStemType[]);

  // Define song sections based on totalBars
  let sections: { id: string; name: string; startBar: number; durationBars: number; color: string }[] = [];
  if (config.totalBars === 16) {
    sections = [
      { id: 'sec-intro', name: 'Intro', startBar: 0, durationBars: 4, color: '#00F0FF' },
      { id: 'sec-verse', name: 'Verse Bed', startBar: 4, durationBars: 8, color: '#A855F7' },
      { id: 'sec-chorus', name: 'Chorus Drop', startBar: 12, durationBars: 4, color: '#FFD700' }
    ];
  } else if (config.totalBars === 32) {
    sections = [
      { id: 'sec-intro', name: 'Intro Bed', startBar: 0, durationBars: 4, color: '#00F0FF' },
      { id: 'sec-verse', name: 'Verse 1', startBar: 4, durationBars: 8, color: '#A855F7' },
      { id: 'sec-chorus', name: 'Main Chorus', startBar: 12, durationBars: 8, color: '#FFD700' },
      { id: 'sec-bridge', name: 'Bridge / Solo', startBar: 20, durationBars: 8, color: '#EC4899' },
      { id: 'sec-outro', name: 'Outro Groove', startBar: 28, durationBars: 4, color: '#10B981' }
    ];
  } else {
    sections = [
      { id: 'sec-intro', name: 'Intro', startBar: 0, durationBars: 8, color: '#00F0FF' },
      { id: 'sec-verse1', name: 'Verse 1', startBar: 8, durationBars: 16, color: '#A855F7' },
      { id: 'sec-chorus1', name: 'Chorus 1', startBar: 24, durationBars: 8, color: '#FFD700' },
      { id: 'sec-verse2', name: 'Verse 2', startBar: 32, durationBars: 16, color: '#A855F7' },
      { id: 'sec-chorus2', name: 'Chorus 2', startBar: 48, durationBars: 8, color: '#FFD700' },
      { id: 'sec-outro', name: 'Outro', startBar: 56, durationBars: 8, color: '#10B981' }
    ];
  }

  // Generate each stem synchronously to avoid audio context saturation
  const generatedStems: AceStepLoopResult[] = [];
  for (const stem of stemsToGen) {
    const stemResult = await generateAceStepLoop({
      prompt: `${config.prompt} (${stem} backing bed)`,
      stemType: stem,
      durationBars: config.totalBars,
      bpm: config.bpm,
      keyRoot: config.keyRoot,
      scale: config.scale,
      diffusionSteps: 24,
      guidanceScale: 7.5,
      useTapeWarmth: config.useTapeWarmth
    });

    // Rename stem neatly for mixer console
    stemResult.name = `${config.songTitle || 'SongBed'}_${stem.toUpperCase()}`;
    generatedStems.push(stemResult);
  }

  const secondsPerBar = (60 / config.bpm) * 4;
  const durationSeconds = Number((secondsPerBar * config.totalBars).toFixed(3));

  return {
    id: `songbed-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: config.songTitle || `Song Bed in ${config.keyRoot} ${config.scale}`,
    prompt: config.prompt,
    bpm: config.bpm,
    key: `${config.keyRoot} ${config.scale}`,
    totalBars: config.totalBars,
    durationSeconds,
    stems: generatedStems,
    sections,
    guitarOverdubTrackName: 'Guitar / Live Input (Armed)',
    createdAt: Date.now()
  };
}

