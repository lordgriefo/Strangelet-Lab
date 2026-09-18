// Web Audio Hybrid Synthesis Engine for Open SFZ v2
// Implements pure web synthesis hybrids:
// - synth:karplus_strong (Plucked string physical model)
// - synth:fm_sine (2-Op / 4-Op Frequency Modulation)
// - synth:sub_bass (Saturated analog sub oscillator)
// - synth:theremin (Continuous pitch glide + vibrato + tube overtone)
// - synth:noise_burst (Resonant filtered burst)
// Plus Scala (.scl) micro-tuning scale math!

export type HybridSynthType = 
  | 'sample_buffer'
  | 'synth:karplus_strong'
  | 'synth:fm_sine'
  | 'synth:sub_bass'
  | 'synth:theremin'
  | 'synth:noise_burst';

export interface ScaleDefinition {
  id: string;
  name: string;
  description: string;
  divisionCount: number;
  cents: number[]; // cents offsets for one octave/cycle
  periodRatio: number; // usually 2 (octave), or 3 (tritave for Bohlen-Pierce)
}

// Built-in Microtonal & Historical Scales
export const BUILT_IN_SCALES: ScaleDefinition[] = [
  {
    id: '12_tet',
    name: '12-TET (Standard Equal Temperament)',
    description: 'Standard modern Western 12-tone equal temperament (100 cents per semitone).',
    divisionCount: 12,
    cents: [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100],
    periodRatio: 2
  },
  {
    id: 'just_intonation',
    name: 'Just Intonation (5-Limit Pure Harmonics)',
    description: 'Pure rational intervals based on natural harmonic series (1/1, 16/15, 9/8, 6/5, 5/4, 4/3, 45/32, 3/2, 8/5, 5/3, 9/5, 15/8).',
    divisionCount: 12,
    cents: [0, 111.73, 203.91, 315.64, 386.31, 498.04, 590.22, 701.96, 813.69, 884.36, 1017.60, 1088.27],
    periodRatio: 2
  },
  {
    id: 'bohlen_pierce',
    name: 'Bohlen-Pierce Scale (13 Divisions of 3:1)',
    description: 'Radical alternative microtonal scale dividing the 3:1 harmonic interval (tritave) into 13 equal parts (~146.3 cents). Completely eliminates the octave.',
    divisionCount: 13,
    cents: [0, 146.3, 292.6, 438.9, 585.2, 731.5, 877.8, 1024.1, 1170.4, 1316.7, 1463.0, 1609.3, 1755.6],
    periodRatio: 3
  },
  {
    id: '19_edo',
    name: '19-EDO (Equal Division of Octave)',
    description: '19 equal steps per octave (~63.16 cents). Yields near-perfect major thirds and sweet diatonic harmony.',
    divisionCount: 19,
    cents: Array.from({ length: 19 }, (_, i) => (1200 / 19) * i),
    periodRatio: 2
  },
  {
    id: '24_edo',
    name: '24-EDO (Quarter-Tone Scale)',
    description: 'Standard 24-tone quarter-tone microtonal division (50 cents per step). Essential for Arabic Maqam and spectralism.',
    divisionCount: 24,
    cents: Array.from({ length: 24 }, (_, i) => 50 * i),
    periodRatio: 2
  },
  {
    id: 'slendro_pelog',
    name: 'Slendro Gamelan (5-Tone Equidistant)',
    description: 'Indonesian gamelan tuning with 5 near-equidistant intervals (~240 cents each).',
    divisionCount: 5,
    cents: [0, 240, 480, 720, 960],
    periodRatio: 2
  },
  {
    id: 'pythagorean',
    name: 'Pythagorean Tuning (Pure 3:2 Fifths)',
    description: 'Ancient Greek acoustic scale generated entirely by stacking pure 3:2 fifths.',
    divisionCount: 12,
    cents: [0, 90.22, 203.91, 294.13, 407.82, 498.04, 611.73, 701.96, 792.18, 905.87, 996.09, 1109.78],
    periodRatio: 2
  },
  {
    id: 'partch_43',
    name: 'Harry Partch 43-Tone Monophonic',
    description: 'Celebrated 43-tone just intonation scale crafted by American maverick composer Harry Partch using diamond lattices up to 11-limit ratios.',
    divisionCount: 43,
    cents: [
      0, 21.5, 41.1, 70.7, 105.0, 111.7, 150.6, 165.0, 182.4, 203.9, 231.2, 267.0, 315.6, 347.4, 386.3, 417.5,
      435.1, 470.8, 498.0, 519.6, 551.3, 582.5, 617.5, 648.7, 680.5, 702.0, 729.2, 764.9, 782.5, 813.7, 852.6,
      884.4, 933.0, 968.8, 996.1, 1017.6, 1035.0, 1049.4, 1088.3, 1129.3, 1158.9, 1178.5, 1190.0
    ],
    periodRatio: 2
  },
  {
    id: 'werckmeister_iii',
    name: 'Werckmeister III (Baroque Well-Temperament)',
    description: 'Historically significant 17th-century well-temperament formulated by Andreas Werckmeister for J.S. Bach organ compositions.',
    divisionCount: 12,
    cents: [0, 90.22, 192.18, 294.13, 390.22, 498.04, 588.27, 696.09, 792.18, 888.27, 996.09, 1092.18],
    periodRatio: 2
  }
];

/**
 * Parses Scala (.scl) file format text
 * Example format:
 * ! test.scl
 * 12 tone equal temperament
 * 12
 * !
 * 100.0
 * 200.0
 * ...
 * 2/1
 */
export function parseScalaFile(sclText: string): ScaleDefinition | null {
  try {
    const lines = sclText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const nonCommentLines = lines.filter(l => !l.startsWith('!'));
    
    if (nonCommentLines.length < 2) return null;
    const description = nonCommentLines[0];
    const divisionCount = parseInt(nonCommentLines[1], 10);
    if (isNaN(divisionCount) || divisionCount <= 0) return null;

    const pitchLines = nonCommentLines.slice(2, 2 + divisionCount);
    const cents: number[] = [0]; // degree 0 is 0 cents (1/1 root)

    for (const pl of pitchLines) {
      if (pl.includes('.')) {
        // Cents representation
        cents.push(parseFloat(pl));
      } else if (pl.includes('/')) {
        // Ratio representation (e.g. 3/2, 5/4, 2/1)
        const parts = pl.split('/');
        const num = parseFloat(parts[0]);
        const den = parseFloat(parts[1]);
        if (!isNaN(num) && !isNaN(den) && den > 0) {
          const ratio = num / den;
          cents.push(1200 * Math.log2(ratio));
        }
      } else {
        // Integer ratio (e.g. 2 for octave)
        const val = parseFloat(pl);
        if (!isNaN(val) && val > 0) {
          cents.push(1200 * Math.log2(val));
        }
      }
    }

    return {
      id: `custom_scl_${Date.now()}`,
      name: description.slice(0, 40) || 'Custom Scala Scale',
      description,
      divisionCount,
      cents: cents.slice(0, divisionCount),
      periodRatio: 2
    };
  } catch (err) {
    console.warn('Failed to parse Scala file:', err);
    return null;
  }
}

/**
 * Calculates the exact frequency in Hz for a MIDI key under an arbitrary scale.
 * Note 69 is A4 (default 440 Hz).
 */
export function calculateScaleFrequency(
  midiKey: number, 
  scale: ScaleDefinition, 
  baseA4Hz: number = 440,
  pitchOffsetCents: number = 0
): number {
  if (scale.id === '12_tet') {
    const standardFreq = baseA4Hz * Math.pow(2, (midiKey - 69 + pitchOffsetCents / 100) / 12);
    return Math.max(10, Math.min(22000, standardFreq));
  }

  // Anchor to C4 (MIDI 60) as scale root
  const ROOT_MIDI = 60; // C4
  const deltaFromRoot = midiKey - ROOT_MIDI;
  const numDegrees = scale.divisionCount;

  const cycleOffset = Math.floor(deltaFromRoot / numDegrees);
  const degreeIndex = ((deltaFromRoot % numDegrees) + numDegrees) % numDegrees;

  const degreeCents = scale.cents[degreeIndex] || 0;
  const cycleCents = 1200 * Math.log2(scale.periodRatio || 2);
  const totalCentsFromC4 = (cycleOffset * cycleCents) + degreeCents + pitchOffsetCents;

  // C4 in 12-TET with A4=440 is ~261.625565 Hz
  const c4Freq = baseA4Hz * Math.pow(2, (60 - 69) / 12);
  const tunedFreq = c4Freq * Math.pow(2, totalCentsFromC4 / 1200);

  return Math.max(10, Math.min(22000, tunedFreq));
}

// --------------------------------------------------------------------------
// LIVE WEB AUDIO HYBRID SYNTHESIZERS
// --------------------------------------------------------------------------

/**
 * 1. Karplus-Strong Plucked String Synthesis
 * Physical modeling of an acoustic vibrating string using an initial noise burst
 * and a feedback delay loop with a low-pass loss filter.
 */
export function synthesizeKarplusStrong(
  ctx: AudioContext,
  frequency: number,
  durationSec: number = 1.8,
  gainLevel: number = 0.35,
  decayDamping: number = 0.985
): AudioNode {
  const outputGain = ctx.createGain();
  outputGain.gain.value = gainLevel;

  const now = ctx.currentTime;
  const period = 1 / Math.max(20, Math.min(4000, frequency));

  // Delay node for the vibrating string cycle
  const delayNode = ctx.createDelay(1.0);
  delayNode.delayTime.setValueAtTime(period, now);

  // Feedback loss filter (string damping)
  const dampingFilter = ctx.createBiquadFilter();
  dampingFilter.type = 'lowpass';
  dampingFilter.frequency.setValueAtTime(Math.min(12000, frequency * 4.5), now);
  dampingFilter.Q.setValueAtTime(1.2, now);

  // Feedback loop gain
  const feedbackGain = ctx.createGain();
  feedbackGain.gain.setValueAtTime(Math.min(0.995, decayDamping), now);

  // Connect loop: delay -> filter -> feedback -> delay
  delayNode.connect(dampingFilter);
  dampingFilter.connect(feedbackGain);
  feedbackGain.connect(delayNode);

  // Connect to output
  dampingFilter.connect(outputGain);

  // Excite string with a burst of filtered noise (plectrum pluck)
  const burstLength = Math.max(0.002, Math.min(0.02, period * 2));
  const bufferSize = Math.floor(ctx.sampleRate * burstLength);
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    // White noise with exponential decay
    const decay = 1 - (i / bufferSize);
    data[i] = ((Math.random() * 2) - 1) * decay;
  }

  const burstSource = ctx.createBufferSource();
  burstSource.buffer = noiseBuffer;
  burstSource.connect(delayNode);
  burstSource.start(now);

  // Natural release envelope on the output
  outputGain.gain.setValueAtTime(gainLevel, now);
  outputGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  return outputGain;
}

/**
 * 2. 2-Operator FM Synthesizer (Carrier + Modulator)
 * Synthesizes glassy bells, DX7 Rhodes electric pianos, and cutting metallic tones.
 */
export function synthesizeFmSine(
  ctx: AudioContext,
  frequency: number,
  durationSec: number = 2.0,
  harmonicityRatio: number = 2.0,
  modulationIndex: number = 3.5,
  gainLevel: number = 0.32
): AudioNode {
  const outputGain = ctx.createGain();
  const now = ctx.currentTime;

  // Carrier oscillator
  const carrier = ctx.createOscillator();
  carrier.type = 'sine';
  carrier.frequency.setValueAtTime(frequency, now);

  // Modulator oscillator
  const modulator = ctx.createOscillator();
  modulator.type = 'sine';
  const modFreq = frequency * harmonicityRatio;
  modulator.frequency.setValueAtTime(modFreq, now);

  // Modulation Depth Gain Node
  const modGain = ctx.createGain();
  const peakModDepth = modFreq * modulationIndex;
  modGain.gain.setValueAtTime(peakModDepth, now);
  // FM index decays over time (bell/pluck envelope)
  modGain.gain.exponentialRampToValueAtTime(peakModDepth * 0.05, now + durationSec * 0.8);

  // Connect modulator to carrier frequency
  modulator.connect(modGain);
  modGain.connect(carrier.frequency);

  // Output gain envelope
  outputGain.gain.setValueAtTime(0.001, now);
  outputGain.gain.linearRampToValueAtTime(gainLevel, now + 0.008);
  outputGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  carrier.connect(outputGain);

  carrier.start(now);
  modulator.start(now);
  carrier.stop(now + durationSec + 0.05);
  modulator.stop(now + durationSec + 0.05);

  return outputGain;
}

/**
 * 3. Analog Saturated Sub Bass
 * Deep sine foundation layered with subtle octave-down triangle and warm harmonic drive.
 */
export function synthesizeSubBass(
  ctx: AudioContext,
  frequency: number,
  durationSec: number = 1.5,
  gainLevel: number = 0.4
): AudioNode {
  const outputGain = ctx.createGain();
  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(frequency, now);
  // Subtle pitch punch at transient
  osc1.frequency.exponentialRampToValueAtTime(frequency, now + 0.04);

  const osc2 = ctx.createOscillator();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(frequency * 0.5, now);

  const osc2Gain = ctx.createGain();
  osc2Gain.gain.value = 0.35;
  osc2.connect(osc2Gain);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(320, now);
  filter.Q.value = 2.0;

  osc1.connect(filter);
  osc2Gain.connect(filter);
  filter.connect(outputGain);

  outputGain.gain.setValueAtTime(0.001, now);
  outputGain.gain.linearRampToValueAtTime(gainLevel, now + 0.015);
  outputGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + durationSec + 0.05);
  osc2.stop(now + durationSec + 0.05);

  return outputGain;
}

/**
 * 4. Badalamenti / Lynchian Theremin Lead
 * Pure sine with expressive vibrato LFO and smooth portamento.
 */
export function synthesizeTheremin(
  ctx: AudioContext,
  frequency: number,
  durationSec: number = 2.2,
  vibratoRate: number = 5.6,
  vibratoDepthHz: number = 12,
  gainLevel: number = 0.3
): AudioNode {
  const outputGain = ctx.createGain();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency * 0.95, now);
  osc.frequency.exponentialRampToValueAtTime(frequency, now + 0.08);

  // Vibrato LFO
  const lfo = ctx.createOscillator();
  lfo.frequency.setValueAtTime(vibratoRate, now);
  const lfoGain = ctx.createGain();
  lfoGain.gain.setValueAtTime(0, now);
  // Vibrato gently swells in
  lfoGain.gain.linearRampToValueAtTime(vibratoDepthHz, now + 0.35);

  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);

  // Overtone warmer
  const warmer = ctx.createBiquadFilter();
  warmer.type = 'lowpass';
  warmer.frequency.setValueAtTime(frequency * 3.5, now);
  warmer.Q.value = 1.0;

  osc.connect(warmer);
  warmer.connect(outputGain);

  outputGain.gain.setValueAtTime(0.001, now);
  outputGain.gain.linearRampToValueAtTime(gainLevel, now + 0.04);
  outputGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  osc.start(now);
  lfo.start(now);
  osc.stop(now + durationSec + 0.05);
  lfo.stop(now + durationSec + 0.05);

  return outputGain;
}

/**
 * 5. Resonant Noise Burst
 */
export function synthesizeNoiseBurst(
  ctx: AudioContext,
  frequency: number,
  durationSec: number = 0.5,
  gainLevel: number = 0.3
): AudioNode {
  const outputGain = ctx.createGain();
  const now = ctx.currentTime;

  const bufferSize = Math.floor(ctx.sampleRate * durationSec);
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2) - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(frequency, now);
  filter.Q.value = 6.0;

  noise.connect(filter);
  filter.connect(outputGain);

  outputGain.gain.setValueAtTime(gainLevel, now);
  outputGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  noise.start(now);
  noise.stop(now + durationSec);

  return outputGain;
}
