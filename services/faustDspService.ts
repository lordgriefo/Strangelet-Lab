import { FaustDspToy, FaustDspParam, FaustIdeaTag } from '../types';
import { getAudioContext } from '../lib/laserSound';

export const FAUST_IDEA_TAGS: FaustIdeaTag[] = [
  'Time & Warble',
  'Grit & Crunch',
  'Space & Dimension',
  'Physical Modeling',
  'Sci-Fi Glitch'
];

export const FAUST_DSP_PRESET_TOYS: FaustDspToy[] = [
  {
    id: 'faust-tape-echo',
    name: 'Lynchian Tape Echo VST Toy',
    category: 'effect',
    color: '#D97706',
    icon: 'Radio',
    ideaTag: 'Time & Warble',
    archetype: 'Dark Analog Tape Delay',
    description: 'Analog tape delay with wow, flutter modulation, high-shelf damping, and soft magnetic saturation.',
    howItWorks: 'An LFO gently wobbles a fractional delay line while feeding echoes back through a warm low-pass filter and soft tanh clipper.',
    code: `import("stdfaust.lib");

// --- Lynchian Tape Echo & Flutter VST Toy ---
time = hslider("Echo Time[unit:ms]", 380, 20, 1200, 1) * 0.001 * ma.SR;
feedback = hslider("Feedback[unit:%]", 55, 0, 95, 1) * 0.01;
wow = hslider("Tape Wow[unit:%]", 28, 0, 100, 1) * 0.01;
highCut = hslider("High Cut[unit:Hz]", 3200, 600, 12000, 10);
drive = hslider("Tape Drive", 1.8, 1.0, 5.0, 0.1);

flutterMod = os.osc(3.8) * wow * 0.002 * ma.SR;
tapeLoop = (+ : de.fdelay(ma.SR * 2, time + flutterMod)) ~ (*(feedback) : fi.lowpass(2, highCut) : aa.tanh1);

process = _ <: _, (*(drive) : tapeLoop) :> _;`,
    params: [
      { id: 'time', name: 'Echo Time', type: 'slider', min: 20, max: 1200, step: 1, defaultValue: 380, value: 380, unit: 'ms' },
      { id: 'feedback', name: 'Feedback', type: 'slider', min: 0, max: 95, step: 1, defaultValue: 55, value: 55, unit: '%' },
      { id: 'wow', name: 'Tape Wow', type: 'slider', min: 0, max: 100, step: 1, defaultValue: 28, value: 28, unit: '%' },
      { id: 'highCut', name: 'High Cut', type: 'slider', min: 600, max: 12000, step: 10, defaultValue: 3200, value: 3200, unit: 'Hz' },
      { id: 'drive', name: 'Tape Drive', type: 'slider', min: 1.0, max: 5.0, step: 0.1, defaultValue: 1.8, value: 1.8, unit: 'x' }
    ]
  },
  {
    id: 'faust-vhs-chorus',
    name: 'VHS 1985 Chorus & Pitch Drift',
    category: 'effect',
    color: '#06B6D4',
    icon: 'Waves',
    ideaTag: 'Time & Warble',
    archetype: 'Stereo BBD & VCR Transport Drift',
    description: 'Stereo LFO-modulated delay lines emulating worn VHS helical-scan pitch warble and lush 80s chorus.',
    howItWorks: 'Two phase-offset LFOs continuously stretch left and right fractional delay lines to create stereo pitch drift and creamy ensemble width.',
    code: `import("stdfaust.lib");

// --- VHS 1985 Chorus & Pitch Drift Toy ---
driftRate = hslider("Drift Rate[unit:Hz]", 0.85, 0.05, 6.0, 0.05);
chorusDepth = hslider("Pitch Drift[unit:ms]", 5.5, 0.5, 18.0, 0.1);
trackingNoise = hslider("VCR Crinkle[unit:%]", 14, 0, 60, 1) * 0.01;
oxideCut = hslider("Head Roll-Off[unit:Hz]", 6400, 1200, 16000, 50);
mix = hslider("Dry / Wet", 0.58, 0.0, 1.0, 0.01);

lfoL = os.osc(driftRate) * chorusDepth * 0.001 * ma.SR;
lfoR = os.osc(driftRate * 1.13 + 0.35) * chorusDepth * 0.001 * ma.SR;
baseDelay = 0.014 * ma.SR;

wetL(x) = (x + no.noise * trackingNoise * 0.015) : de.fdelay(ma.SR, baseDelay + lfoL) : fi.lowpass(2, oxideCut);
wetR(x) = (x + no.noise * trackingNoise * 0.015) : de.fdelay(ma.SR, baseDelay + lfoR) : fi.lowpass(2, oxideCut);

process(x) = x * (1 - mix) + wetL(x) * mix, x * (1 - mix) + wetR(x) * mix;`,
    params: [
      { id: 'drift_rate', name: 'Drift Rate', type: 'slider', min: 0.05, max: 6.0, step: 0.05, defaultValue: 0.85, value: 0.85, unit: 'Hz' },
      { id: 'pitch_drift', name: 'Pitch Drift', type: 'slider', min: 0.5, max: 18.0, step: 0.1, defaultValue: 5.5, value: 5.5, unit: 'ms' },
      { id: 'vcr_crinkle', name: 'VCR Crinkle', type: 'slider', min: 0, max: 60, step: 1, defaultValue: 14, value: 14, unit: '%' },
      { id: 'head_roll_off', name: 'Head Roll-Off', type: 'slider', min: 1200, max: 16000, step: 50, defaultValue: 6400, value: 6400, unit: 'Hz' },
      { id: 'dry___wet', name: 'Dry / Wet', type: 'slider', min: 0.0, max: 1.0, step: 0.01, defaultValue: 0.58, value: 0.58, unit: '' }
    ]
  },
  {
    id: 'faust-acid-filter',
    name: 'TB-303 Diode Acid Filter Toy',
    category: 'effect',
    color: '#EC4899',
    icon: 'Zap',
    ideaTag: 'Sci-Fi Glitch',
    archetype: 'Self-Oscillating Diode Ladder',
    description: 'Resonant 18dB/oct diode ladder filter inspired by the Roland TB-303 with non-linear overdrive.',
    howItWorks: 'Steep low-pass poles feed high resonance back into a nonlinear diode clipper that squelches loudly around the cutoff frequency.',
    code: `import("stdfaust.lib");

// --- TB-303 Diode Ladder Acid Filter VST Toy ---
cutoff = hslider("Cutoff[unit:Hz]", 1100, 40, 8000, 1);
resonance = hslider("Resonance", 4.2, 0.5, 9.8, 0.1);
envDepth = hslider("Env Depth[unit:%]", 65, 0, 100, 1) * 0.01;
drive = hslider("Acid Drive", 2.4, 1.0, 8.0, 0.1);

process = *(drive) : ve.moog_vcf_2b(resonance * 0.1, cutoff) : aa.tanh1;`,
    params: [
      { id: 'cutoff', name: 'Cutoff', type: 'slider', min: 40, max: 8000, step: 1, defaultValue: 1100, value: 1100, unit: 'Hz' },
      { id: 'resonance', name: 'Resonance', type: 'slider', min: 0.5, max: 9.8, step: 0.1, defaultValue: 4.2, value: 4.2, unit: '' },
      { id: 'envDepth', name: 'Env Depth', type: 'slider', min: 0, max: 100, step: 1, defaultValue: 65, value: 65, unit: '%' },
      { id: 'drive', name: 'Acid Drive', type: 'slider', min: 1.0, max: 8.0, step: 0.1, defaultValue: 2.4, value: 2.4, unit: 'x' }
    ]
  },
  {
    id: 'faust-barberpole-phaser',
    name: 'Barberpole Infinite Phaser',
    category: 'effect',
    color: '#A855F7',
    icon: 'Activity',
    ideaTag: 'Sci-Fi Glitch',
    archetype: 'Shepard-Tone 12-Stage All-Pass Sweep',
    description: '12-stage all-pass sweeping filter creating the psychoacoustic illusion of infinitely rising frequency notches.',
    howItWorks: 'Twelve cascaded all-pass networks shift signal phase by 180 degrees at moving frequencies, cancelling harmonics into hypnotic notches.',
    code: `import("stdfaust.lib");

// --- Barberpole Infinite 12-Stage All-Pass Phaser ---
sweepRate = hslider("Cycle Rate[unit:Hz]", 0.35, 0.05, 4.0, 0.05);
minFreq = hslider("Floor[unit:Hz]", 180, 60, 1000, 10);
maxFreq = hslider("Ceiling[unit:Hz]", 4600, 1000, 12000, 20);
feedback = hslider("Spiral Regen[unit:%]", 68, 0, 92, 1) * 0.01;
mix = hslider("Dry / Wet", 0.72, 0.0, 1.0, 0.01);

sawPhase = os.phasor(1.0, sweepRate);
notchFreq = minFreq + (maxFreq - minFreq) * sawPhase;
apStage = fi.allpass_fcomb(2048, int(ma.SR / notchFreq), 0.5);
bank12 = seq(i, 6, fi.tf2(0.85, -1.6 * cos(2 * ma.PI * notchFreq / ma.SR), 1.0, -1.6 * cos(2 * ma.PI * notchFreq / ma.SR), 0.85));

process(x) = x <: (*(1 - mix), ((+ : bank12) ~ *(feedback)) * mix) :> _;`,
    params: [
      { id: 'cycle_rate', name: 'Cycle Rate', type: 'slider', min: 0.05, max: 4.0, step: 0.05, defaultValue: 0.35, value: 0.35, unit: 'Hz' },
      { id: 'floor', name: 'Floor', type: 'slider', min: 60, max: 1000, step: 10, defaultValue: 180, value: 180, unit: 'Hz' },
      { id: 'ceiling', name: 'Ceiling', type: 'slider', min: 1000, max: 12000, step: 20, defaultValue: 4600, value: 4600, unit: 'Hz' },
      { id: 'spiral_regen', name: 'Spiral Regen', type: 'slider', min: 0, max: 92, step: 1, defaultValue: 68, value: 68, unit: '%' },
      { id: 'dry___wet', name: 'Dry / Wet', type: 'slider', min: 0.0, max: 1.0, step: 0.01, defaultValue: 0.72, value: 0.72, unit: '' }
    ]
  },
  {
    id: 'faust-karplus-guitar',
    name: 'Karplus-Strong Plucked Guitar Toy',
    category: 'instrument',
    color: '#10B981',
    icon: 'Music',
    ideaTag: 'Physical Modeling',
    archetype: 'Acoustic String Waveguide',
    description: 'Physical modeling string synthesizer using a filtered delay loop for acoustic and electric guitar plucks.',
    howItWorks: 'A short burst of white noise excites a tuned delay loop whose low-pass damping mimics high frequencies dying out on a real string.',
    code: `import("stdfaust.lib");

// --- Karplus-Strong Guitar Pluck Toy ---
pitch = hslider("Pitch[unit:Hz]", 196, 55, 660, 0.5);
damping = hslider("String Damping", 0.35, 0.05, 0.95, 0.01);
sustain = hslider("Sustain[unit:%]", 88, 10, 99, 1) * 0.01;
pluck = button("Pluck String");

noiseBurst = no.noise * ba.pulsen(ma.SR / pitch, pluck);
loop = (+ : de.fdelay(ma.SR, ma.SR / pitch)) ~ (*(sustain) : fi.lowpass(1, (1-damping)*10000 + 400));

process = noiseBurst : loop;`,
    params: [
      { id: 'pitch', name: 'Pitch', type: 'slider', min: 55, max: 660, step: 0.5, defaultValue: 196, value: 196, unit: 'Hz' },
      { id: 'damping', name: 'String Damping', type: 'slider', min: 0.05, max: 0.95, step: 0.01, defaultValue: 0.35, value: 0.35, unit: '' },
      { id: 'sustain', name: 'Sustain', type: 'slider', min: 10, max: 99, step: 1, defaultValue: 88, value: 88, unit: '%' },
      { id: 'pluck', name: 'Pluck Trigger', type: 'button', min: 0, max: 1, step: 1, defaultValue: 0, value: 0, unit: '' }
    ]
  },
  {
    id: 'faust-sub-808',
    name: 'Analog Sub-808 Kick Synth Toy',
    category: 'instrument',
    color: '#00F0FF',
    icon: 'Disc',
    ideaTag: 'Physical Modeling',
    archetype: 'Bridged-T Drum Membrane Synth',
    description: 'Sine oscillator with exponential pitch sweep and saturation for booming 808 subs and punchy kicks.',
    howItWorks: 'An instantaneous pitch transient drops rapidly down to the sub fundamental while soft saturation thickens low-end chest thump.',
    code: `import("stdfaust.lib");

// --- Analog 808 Transistor Kick & Sub Bass Generator ---
trigger = button("Trigger 808");
baseTune = hslider("Base Pitch[unit:Hz]", 55, 30, 120, 1);
punch = hslider("Punch Snap[unit:ms]", 35, 5, 90, 1) * 0.001;
decay = hslider("Sub Sustain[unit:s]", 1.4, 0.1, 4.0, 0.05);
drive = hslider("Overdrive", 2.2, 1.0, 6.0, 0.1);

pitchEnv = baseTune + 110 * ba.pulsen(ma.SR * punch, trigger);
ampEnv = en.ar(0.002, decay, trigger);

process = os.osc(pitchEnv) * ampEnv : *(drive) : aa.tanh1;`,
    params: [
      { id: 'baseTune', name: 'Base Pitch', type: 'slider', min: 30, max: 120, step: 1, defaultValue: 55, value: 55, unit: 'Hz' },
      { id: 'punch', name: 'Punch Snap', type: 'slider', min: 5, max: 90, step: 1, defaultValue: 35, value: 35, unit: 'ms' },
      { id: 'decay', name: 'Sub Sustain', type: 'slider', min: 0.1, max: 4.0, step: 0.05, defaultValue: 1.4, value: 1.4, unit: 's' },
      { id: 'drive', name: 'Overdrive', type: 'slider', min: 1.0, max: 6.0, step: 0.1, defaultValue: 2.2, value: 2.2, unit: 'x' },
      { id: 'trigger', name: 'Trigger 808', type: 'button', min: 0, max: 1, step: 1, defaultValue: 0, value: 0, unit: '' }
    ]
  },
  {
    id: 'faust-fm-glass-bell',
    name: 'FM Glass Bell Synth',
    category: 'instrument',
    color: '#38BDF8',
    icon: 'Sparkles',
    ideaTag: 'Physical Modeling',
    archetype: '2-Operator Inharmonic FM Bell',
    description: '2-operator FM synth toy with a non-integer metallic modulator ratio for crystalline glass bells and chimes.',
    howItWorks: 'A high-frequency modulator sine wave bends a carrier oscillator at a 2.41x inharmonic ratio, decaying faster on upper glass partials.',
    code: `import("stdfaust.lib");

// --- FM Glass Bell Synth (2-Operator Metallic Ratio) ---
strike = button("Strike Glass Bell");
noteFreq = hslider("Bell Pitch[unit:Hz]", 440, 110, 1760, 1);
fmRatio = hslider("Metallic Ratio", 2.41, 1.0, 5.5, 0.01);
fmIndex = hslider("Glass Shimmer", 3.6, 0.2, 10.0, 0.1);
ringTime = hslider("Bell Decay[unit:s]", 2.4, 0.3, 6.0, 0.1);

modEnv = en.ar(0.002, ringTime * 0.45, strike);
ampEnv = en.ar(0.002, ringTime, strike);
modulator = os.osc(noteFreq * fmRatio) * (noteFreq * fmIndex * modEnv);
carrier = os.osc(noteFreq + modulator);

process = carrier * ampEnv * 0.7;`,
    params: [
      { id: 'bell_pitch', name: 'Bell Pitch', type: 'slider', min: 110, max: 1760, step: 1, defaultValue: 440, value: 440, unit: 'Hz' },
      { id: 'metallic_ratio', name: 'Metallic Ratio', type: 'slider', min: 1.0, max: 5.5, step: 0.01, defaultValue: 2.41, value: 2.41, unit: 'x' },
      { id: 'glass_shimmer', name: 'Glass Shimmer', type: 'slider', min: 0.2, max: 10.0, step: 0.1, defaultValue: 3.6, value: 3.6, unit: '' },
      { id: 'bell_decay', name: 'Bell Decay', type: 'slider', min: 0.3, max: 6.0, step: 0.1, defaultValue: 2.4, value: 2.4, unit: 's' },
      { id: 'strike_glass_bell', name: 'Strike Glass Bell', type: 'button', min: 0, max: 1, step: 1, defaultValue: 0, value: 0, unit: '' }
    ]
  },
  {
    id: 'faust-germanium-fuzz',
    name: 'Germanium Fuzz & Voltage Starve Toy',
    category: 'effect',
    color: '#EF4444',
    icon: 'Flame',
    ideaTag: 'Grit & Crunch',
    archetype: 'Sputtering Vintage Transistor Box',
    description: 'Boutique vintage Germanium transistor fuzz box with asymmetric clipping and voltage starve sag.',
    howItWorks: 'Positive and negative signal halves clip unevenly while sagging bias rail voltage gates out quiet tails with Velcro sputter.',
    code: `import("stdfaust.lib");

// --- Germanium Fuzz & Starve VST Toy ---
fuzz = hslider("Fuzz Gain", 8.0, 1.0, 20.0, 0.1);
starve = hslider("Voltage Starve[unit:V]", 4.5, 1.5, 9.0, 0.1);
tone = hslider("Tone Bite[unit:Hz]", 2800, 600, 7000, 10);
volume = vslider("Master Volume[unit:dB]", 0, -24, 12, 0.1) : ba.db2linear;

asymClip(x) = ma.tanh(x * fuzz) * (x > 0) + ma.tanh(x * fuzz * (starve / 9.0)) * (x <= 0);

process = asymClip : fi.lowpass(2, tone) : *(volume);`,
    params: [
      { id: 'fuzz', name: 'Fuzz Gain', type: 'slider', min: 1.0, max: 20.0, step: 0.1, defaultValue: 8.0, value: 8.0, unit: 'x' },
      { id: 'starve', name: 'Voltage Starve', type: 'slider', min: 1.5, max: 9.0, step: 0.1, defaultValue: 4.5, value: 4.5, unit: 'V' },
      { id: 'tone', name: 'Tone Bite', type: 'slider', min: 600, max: 7000, step: 10, defaultValue: 2800, value: 2800, unit: 'Hz' },
      { id: 'volume', name: 'Master Volume', type: 'slider', min: -24, max: 12, step: 0.5, defaultValue: 0, value: 0, unit: 'dB' }
    ]
  },
  {
    id: 'faust-cassette-saturator',
    name: 'Cassette Head Magnetic Saturator',
    category: 'effect',
    color: '#F97316',
    icon: 'Radio',
    ideaTag: 'Grit & Crunch',
    archetype: 'Type-I Chrome Oxide Tape Bus',
    description: 'Soft asymmetric tanh clipping paired with high-shelf magnetic head loss for warm analog cassette glue.',
    howItWorks: 'Asymmetric DC bias drives soft hyperbolic compression to bloom even harmonics while a smooth shelf rolls off brittle air above the head gap.',
    code: `import("stdfaust.lib");

// --- Cassette Head Magnetic Saturator Toy ---
flux = hslider("Magnetic Flux", 3.4, 1.0, 10.0, 0.1);
bias = hslider("Head Bias", 0.24, 0.0, 0.8, 0.01);
shelfFreq = hslider("Oxide Shelf[unit:Hz]", 4800, 1200, 14000, 50);
shelfLoss = hslider("High Loss[unit:dB]", -4.5, -12.0, 0.0, 0.5);
mix = hslider("Dry / Wet", 0.82, 0.0, 1.0, 0.01);

magClip(x) = ma.tanh(x * flux + bias) - ma.tanh(bias);
oxideEq = fi.high_shelf(shelfLoss, shelfFreq);

process(x) = x * (1 - mix) + (magClip(x) : oxideEq) * mix;`,
    params: [
      { id: 'magnetic_flux', name: 'Magnetic Flux', type: 'slider', min: 1.0, max: 10.0, step: 0.1, defaultValue: 3.4, value: 3.4, unit: 'x' },
      { id: 'head_bias', name: 'Head Bias', type: 'slider', min: 0.0, max: 0.8, step: 0.01, defaultValue: 0.24, value: 0.24, unit: '' },
      { id: 'oxide_shelf', name: 'Oxide Shelf', type: 'slider', min: 1200, max: 14000, step: 50, defaultValue: 4800, value: 4800, unit: 'Hz' },
      { id: 'high_loss', name: 'High Loss', type: 'slider', min: -12.0, max: 0.0, step: 0.5, defaultValue: -4.5, value: -4.5, unit: 'dB' },
      { id: 'dry___wet', name: 'Dry / Wet', type: 'slider', min: 0.0, max: 1.0, step: 0.01, defaultValue: 0.82, value: 0.82, unit: '' }
    ]
  },
  {
    id: 'faust-bit-crusher',
    name: 'Sample-Hold Bitcrusher Decimator',
    category: 'effect',
    color: '#F59E0B',
    icon: 'Cpu',
    ideaTag: 'Grit & Crunch',
    archetype: '12-Bit & 8-Bit Arcade Quantizer',
    description: 'Sample-and-hold frequency downsampler and bit depth truncator with retro gaming grit.',
    howItWorks: 'Amplitude values snap onto coarse staircase steps while a steep filter simulates low sample-rate aliasing crunch.',
    code: `import("stdfaust.lib");

// --- Sample-Hold Bitcrusher Decimator Toy ---
bits = hslider("Bit Depth[unit:bits]", 6, 2, 16, 1);
downsample = hslider("Sample Rate Cut[unit:Hz]", 4200, 400, 22050, 100);
mix = hslider("Mix", 0.8, 0, 1, 0.01);

crush(b, x) = floor(x * (2^(b-1))) / (2^(b-1));

process(x) = x * (1 - mix) + (crush(bits, x) : fi.lowpass(2, downsample)) * mix;`,
    params: [
      { id: 'bits', name: 'Bit Depth', type: 'slider', min: 2, max: 16, step: 1, defaultValue: 6, value: 6, unit: 'bits' },
      { id: 'downsample', name: 'Sample Rate Cut', type: 'slider', min: 400, max: 22050, step: 100, defaultValue: 4200, value: 4200, unit: 'Hz' },
      { id: 'mix', name: 'Mix', type: 'slider', min: 0, max: 1, step: 0.01, defaultValue: 0.8, value: 0.8, unit: '' }
    ]
  },
  {
    id: 'faust-space-comb',
    name: 'Holographic Stereo Comb Resonator',
    category: 'effect',
    color: '#8B5CF6',
    icon: 'Sparkles',
    ideaTag: 'Space & Dimension',
    archetype: 'Crystalline Micro-Delay Halo',
    description: 'Pitched dual-comb resonator that turns any drum break or guitar strum into metallic crystalline arpeggios.',
    howItWorks: 'Short millisecond delays tuned to musical pitches resonate sympathetically with transients and detune slightly between left and right ears.',
    code: `import("stdfaust.lib");

// --- Holographic Space Comb Resonator ---
pitch = hslider("Resonator Pitch[unit:Hz]", 185, 40, 1200, 1);
regen = hslider("Regen Feedback[unit:%]", 86, 10, 98, 1) * 0.01;
spread = hslider("Stereo Detune[unit:%]", 45, 0, 100, 1) * 0.01;
mix = hslider("Dry/Wet", 0.65, 0.0, 1.0, 0.01);

combL = (+ : de.delay(ma.SR, ma.SR / pitch)) ~ *(regen);
combR = (+ : de.delay(ma.SR, ma.SR / (pitch * (1 + spread * 0.025)))) ~ *(regen);

process(x) = x <: (*(1-mix), *(1-mix)), (combL(x) * mix, combR(x) * mix) :> _, _;`,
    params: [
      { id: 'pitch', name: 'Resonator Pitch', type: 'slider', min: 40, max: 1200, step: 1, defaultValue: 185, value: 185, unit: 'Hz' },
      { id: 'regen', name: 'Regen Feedback', type: 'slider', min: 10, max: 98, step: 1, defaultValue: 86, value: 86, unit: '%' },
      { id: 'spread', name: 'Stereo Detune', type: 'slider', min: 0, max: 100, step: 1, defaultValue: 45, value: 45, unit: '%' },
      { id: 'mix', name: 'Dry / Wet', type: 'slider', min: 0.0, max: 1.0, step: 0.01, defaultValue: 0.65, value: 0.65, unit: '' }
    ]
  },
  {
    id: 'faust-cavern-shimmer',
    name: 'Deep Cavern Shimmer Reverb',
    category: 'effect',
    color: '#6366F1',
    icon: 'Layers',
    ideaTag: 'Space & Dimension',
    archetype: 'Cathedral Convolution + +12st Shimmer',
    description: 'Expansive diffused reverb tank with +1 octave pitch-shifted feedback regeneration for ethereal clouds.',
    howItWorks: 'A lush multi-tap reverb convolves incoming audio while siphoning part of the tail through an octave-up pitch shifter back into the tank.',
    code: `import("stdfaust.lib");

// --- Deep Cavern Shimmer Reverb (Convolver + Octave Feedback) ---
roomSize = hslider("Cavern Size[unit:%]", 82, 20, 99, 1) * 0.01;
shimmerAmt = hslider("Octave Shimmer[unit:%]", 48, 0, 95, 1) * 0.01;
dampFreq = hslider("Stone Damping[unit:Hz]", 5200, 800, 14000, 50);
preDelay = hslider("Pre-Delay[unit:ms]", 45, 0, 200, 1) * 0.001 * ma.SR;
mix = hslider("Dry / Wet", 0.52, 0.0, 1.0, 0.01);

octaveUp = ef.transpose(1024, 128, 12.0);
diffusedTail = de.fdelay(ma.SR, preDelay) : re.mono_freeverb(roomSize, 0.35, 0.6, 0.5);
shimmerLoop(x) = (x + _ * shimmerAmt) : diffusedTail : fi.lowpass(2, dampFreq) <: _, octaveUp ~ _;

process(x) = x * (1 - mix) + (shimmerLoop(x) :> _ * 0.5 * mix);`,
    params: [
      { id: 'cavern_size', name: 'Cavern Size', type: 'slider', min: 20, max: 99, step: 1, defaultValue: 82, value: 82, unit: '%' },
      { id: 'octave_shimmer', name: 'Octave Shimmer', type: 'slider', min: 0, max: 95, step: 1, defaultValue: 48, value: 48, unit: '%' },
      { id: 'stone_damping', name: 'Stone Damping', type: 'slider', min: 800, max: 14000, step: 50, defaultValue: 5200, value: 5200, unit: 'Hz' },
      { id: 'pre_delay', name: 'Pre-Delay', type: 'slider', min: 0, max: 200, step: 1, defaultValue: 45, value: 45, unit: 'ms' },
      { id: 'dry___wet', name: 'Dry / Wet', type: 'slider', min: 0.0, max: 1.0, step: 0.01, defaultValue: 0.52, value: 0.52, unit: '' }
    ]
  }
];

/**
 * Parses Faust DSP code to extract UI parameters:
 * Matches hslider, vslider, button, and checkbox declarations.
 */
export function parseFaustCodeParameters(code: string): FaustDspParam[] {
  const params: FaustDspParam[] = [];

  // Match slider declarations: [hv]slider("Label[unit:xyz]", default, min, max, step)
  const sliderRegex = /(?:hslider|vslider)\s*\(\s*"([^"]+)"\s*,\s*([-0-9.]+)\s*,\s*([-0-9.]+)\s*,\s*([-0-9.]+)\s*,\s*([-0-9.]+)\s*\)/g;
  let match: RegExpExecArray | null;

  while ((match = sliderRegex.exec(code)) !== null) {
    const rawLabel = match[1];
    const defaultValue = parseFloat(match[2]);
    const min = parseFloat(match[3]);
    const max = parseFloat(match[4]);
    const step = parseFloat(match[5]);

    // Extract unit if in label, e.g. "Echo Time[unit:ms]"
    const unitMatch = rawLabel.match(/\[unit:([^\]]+)\]/);
    const unit = unitMatch ? unitMatch[1] : '';
    const cleanName = rawLabel.replace(/\[unit:[^\]]+\]/, '').trim();
    const id = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_');

    params.push({
      id,
      name: cleanName,
      type: 'slider',
      min,
      max,
      step,
      defaultValue,
      value: defaultValue,
      unit
    });
  }

  // Match button declarations: button("Label")
  const buttonRegex = /button\s*\(\s*"([^"]+)"\s*\)/g;
  while ((match = buttonRegex.exec(code)) !== null) {
    const name = match[1];
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    params.push({
      id,
      name,
      type: 'button',
      min: 0,
      max: 1,
      step: 1,
      defaultValue: 0,
      value: 0
    });
  }

  return params;
}

/**
 * Generates a synthetic stereo cathedral impulse response buffer for Web Audio ConvolverNode.
 */
function createCavernImpulseResponse(ctx: AudioContext, durationSec: number, dampingHz: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * durationSec));
  const buffer = ctx.createBuffer(2, length, sampleRate);
  const alpha = Math.min(0.95, Math.max(0.05, dampingHz / (sampleRate * 0.5)));

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const envelope = Math.pow(1 - t, 2.4);
      const white = Math.random() * 2 - 1;
      lp = lp + alpha * (white - lp);
      data[i] = lp * envelope * 0.6;
    }
  }
  return buffer;
}

/**
 * Real-time Web Audio DSP Engine for Faust Toys.
 * Compiles parameters and executes physical audio processing.
 */
export class FaustDspLiveNode {
  private ctx: AudioContext;
  public input: GainNode;
  public output: GainNode;
  private toy: FaustDspToy;
  private nodes: any = {};
  private oscNodes: OscillatorNode[] = [];
  private activeParamValues: Record<string, number> = {};

  constructor(toy: FaustDspToy) {
    this.ctx = getAudioContext();
    this.toy = toy;
    this.input = this.ctx.createGain();
    this.output = this.ctx.createGain();

    toy.params.forEach(p => {
      this.activeParamValues[p.id] = p.value;
    });

    this.buildDspGraph();
  }

  private buildDspGraph() {
    const ctx = this.ctx;
    const signature = `${this.toy.id} ${this.toy.name} ${this.toy.code}`.toLowerCase();

    if (signature.includes('vhs') || signature.includes('chorus') || signature.includes('wobble')) {
      const dryGain = ctx.createGain();
      const wetGain = ctx.createGain();
      const delayL = ctx.createDelay(0.5);
      const delayR = ctx.createDelay(0.5);
      const lfoL = ctx.createOscillator();
      const lfoR = ctx.createOscillator();
      const depthGainL = ctx.createGain();
      const depthGainR = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      const rate = this.getAnyParam(['drift_rate', 'flutter_rate'], 0.85);
      const depthMs = this.getAnyParam(['pitch_drift', 'drift_depth'], 5.5);
      const mix = this.getAnyParam(['dry___wet', 'mix'], 0.58);
      const cut = this.getAnyParam(['head_roll_off', 'oxide_roll_off'], 6400);

      delayL.delayTime.value = 0.014;
      delayR.delayTime.value = 0.018;
      lfoL.frequency.value = rate;
      lfoR.frequency.value = rate * 1.13;
      depthGainL.gain.value = (depthMs / 1000) * 0.45;
      depthGainR.gain.value = (depthMs / 1000) * 0.45;

      filter.type = 'lowpass';
      filter.frequency.value = cut;

      dryGain.gain.value = 1 - mix;
      wetGain.gain.value = mix;

      lfoL.connect(depthGainL);
      depthGainL.connect(delayL.delayTime);
      lfoR.connect(depthGainR);
      depthGainR.connect(delayR.delayTime);
      lfoL.start();
      lfoR.start();
      this.oscNodes.push(lfoL, lfoR);

      this.input.connect(dryGain);
      dryGain.connect(this.output);

      this.input.connect(delayL);
      this.input.connect(delayR);
      delayL.connect(filter);
      delayR.connect(filter);
      filter.connect(wetGain);
      wetGain.connect(this.output);

      this.nodes = { dryGain, wetGain, lfoL, lfoR, depthGainL, depthGainR, filter };
    } else if (signature.includes('shimmer') || signature.includes('cavern') || signature.includes('reverb') || signature.includes('underwater') || signature.includes('muffled')) {
      const dryGain = ctx.createGain();
      const wetGain = ctx.createGain();
      const preDelay = ctx.createDelay(1.0);
      const convolver = ctx.createConvolver();
      const dampFilter = ctx.createBiquadFilter();
      const feedbackDelay = ctx.createDelay(1.5);
      const shimmerGain = ctx.createGain();
      const octaveFilter = ctx.createBiquadFilter();

      const sizePct = this.getAnyParam(['cavern_size', 'cavern_decay'], 82);
      const dampHz = this.getAnyParam(['stone_damping', 'submersion_depth'], signature.includes('underwater') ? 480 : 5200);
      const preMs = this.getAnyParam(['pre_delay'], 45);
      const shimmerPct = this.getAnyParam(['octave_shimmer'], 48);
      const mix = this.getAnyParam(['dry___wet', 'mix'], 0.55);

      convolver.buffer = createCavernImpulseResponse(ctx, 1.2 + (sizePct / 100) * 2.4, dampHz);
      preDelay.delayTime.value = preMs / 1000;
      dampFilter.type = 'lowpass';
      dampFilter.frequency.value = dampHz;
      dampFilter.Q.value = this.getAnyParam(['water_bubble_q'], 1.2);

      octaveFilter.type = 'highshelf';
      octaveFilter.frequency.value = 1800;
      octaveFilter.gain.value = (shimmerPct / 100) * 9;
      feedbackDelay.delayTime.value = 0.085;
      shimmerGain.gain.value = (shimmerPct / 100) * 0.42;

      dryGain.gain.value = 1 - mix;
      wetGain.gain.value = mix;

      this.input.connect(dryGain);
      dryGain.connect(this.output);

      this.input.connect(preDelay);
      preDelay.connect(convolver);
      convolver.connect(dampFilter);
      dampFilter.connect(octaveFilter);
      octaveFilter.connect(wetGain);
      octaveFilter.connect(feedbackDelay);
      feedbackDelay.connect(shimmerGain);
      shimmerGain.connect(convolver);
      wetGain.connect(this.output);

      this.nodes = { dryGain, wetGain, preDelay, filter: dampFilter, octaveFilter, shimmerGain };
    } else if (signature.includes('barberpole') || signature.includes('phaser')) {
      const dryGain = ctx.createGain();
      const wetGain = ctx.createGain();
      const stages: BiquadFilterNode[] = [];
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const feedback = ctx.createGain();

      const rate = this.getAnyParam(['cycle_rate'], 0.35);
      const floorHz = this.getAnyParam(['floor'], 180);
      const ceilHz = this.getAnyParam(['ceiling'], 4600);
      const regenPct = this.getAnyParam(['spiral_regen'], 68);
      const mix = this.getAnyParam(['dry___wet', 'mix'], 0.72);

      const centerHz = (floorHz + ceilHz) * 0.35;
      for (let i = 0; i < 12; i++) {
        const ap = ctx.createBiquadFilter();
        ap.type = 'allpass';
        ap.frequency.value = centerHz * (0.6 + (i % 4) * 0.28);
        ap.Q.value = 0.85;
        stages.push(ap);
      }
      for (let i = 0; i < stages.length - 1; i++) {
        stages[i].connect(stages[i + 1]);
      }

      lfo.type = 'sawtooth';
      lfo.frequency.value = rate;
      lfoGain.gain.value = Math.max(200, (ceilHz - floorHz) * 0.35);
      lfo.connect(lfoGain);
      stages.forEach(ap => lfoGain.connect(ap.frequency));
      lfo.start();
      this.oscNodes.push(lfo);

      feedback.gain.value = (regenPct / 100) * 0.65;
      stages[stages.length - 1].connect(feedback);
      feedback.connect(stages[0]);

      dryGain.gain.value = 1 - mix;
      wetGain.gain.value = mix;

      this.input.connect(dryGain);
      dryGain.connect(this.output);
      this.input.connect(stages[0]);
      stages[stages.length - 1].connect(wetGain);
      wetGain.connect(this.output);

      this.nodes = { dryGain, wetGain, lfo, lfoGain, feedback, phaserStages: stages };
    } else if (signature.includes('cassette') || signature.includes('magnetic') || signature.includes('saturator') || signature.includes('tube')) {
      const dryGain = ctx.createGain();
      const wetGain = ctx.createGain();
      const preDrive = ctx.createGain();
      const shaper = ctx.createWaveShaper();
      const oxideShelf = ctx.createBiquadFilter();

      const flux = this.getAnyParam(['magnetic_flux', 'drive'], 3.4);
      const bias = this.getAnyParam(['head_bias', 'tube_bias'], 0.24);
      const shelfFreq = this.getAnyParam(['oxide_shelf', 'tone_cut'], 4800);
      const shelfLoss = this.getAnyParam(['high_loss'], -4.5);
      const mix = this.getAnyParam(['dry___wet', 'mix'], 0.82);

      const curve = new Float32Array(4096);
      for (let i = 0; i < 4096; i++) {
        const x = (i * 2) / 4096 - 1;
        curve[i] = Math.tanh(x * flux + bias) - Math.tanh(bias);
      }
      shaper.curve = curve;

      oxideShelf.type = 'highshelf';
      oxideShelf.frequency.value = shelfFreq;
      oxideShelf.gain.value = shelfLoss;

      preDrive.gain.value = 1.1;
      dryGain.gain.value = 1 - mix;
      wetGain.gain.value = mix;

      this.input.connect(dryGain);
      dryGain.connect(this.output);
      this.input.connect(preDrive);
      preDrive.connect(shaper);
      shaper.connect(oxideShelf);
      oxideShelf.connect(wetGain);
      wetGain.connect(this.output);

      this.nodes = { dryGain, wetGain, shaper, oxideShelf, driveGain: preDrive };
    } else if (signature.includes('am radio') || signature.includes('broken')) {
      const hp = ctx.createBiquadFilter();
      const lp = ctx.createBiquadFilter();
      const shaper = ctx.createWaveShaper();
      const dryGain = ctx.createGain();
      const wetGain = ctx.createGain();

      hp.type = 'highpass';
      hp.frequency.value = 420;
      lp.type = 'lowpass';
      lp.frequency.value = this.getAnyParam(['carrier_cutoff'], 1650);

      const drive = this.getAnyParam(['speaker_crunch'], 3.8);
      const curve = new Float32Array(4096);
      for (let i = 0; i < 4096; i++) {
        const x = (i * 2) / 4096 - 1;
        curve[i] = Math.tanh(x * drive);
      }
      shaper.curve = curve;

      const mix = this.getAnyParam(['dry___wet', 'mix'], 0.9);
      dryGain.gain.value = 1 - mix;
      wetGain.gain.value = mix;

      this.input.connect(dryGain);
      dryGain.connect(this.output);
      this.input.connect(hp);
      hp.connect(lp);
      lp.connect(shaper);
      shaper.connect(wetGain);
      wetGain.connect(this.output);

      this.nodes = { dryGain, wetGain, filter: lp, shaper };
    } else if (signature.includes('tape-echo') || signature.includes('tape echo') || signature.includes('delay')) {
      const delay = ctx.createDelay(3.0);
      const feedback = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const waveshaper = ctx.createWaveShaper();

      const n_samples = 44100;
      const curve = new Float32Array(n_samples);
      for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = Math.tanh(x * 1.5);
      }
      waveshaper.curve = curve;

      filter.type = 'lowpass';
      filter.frequency.value = this.getAnyParam(['highCut', 'high_cut'], 3200);

      const timeSec = this.getAnyParam(['time', 'echo_time'], 380) / 1000;
      delay.delayTime.value = timeSec;
      feedback.gain.value = this.getAnyParam(['feedback'], 55) / 100;

      this.input.connect(this.output);
      this.input.connect(delay);
      delay.connect(waveshaper);
      waveshaper.connect(filter);
      filter.connect(feedback);
      feedback.connect(delay);
      filter.connect(this.output);

      this.nodes = { delay, feedback, filter };
    } else if (signature.includes('acid') || signature.includes('filter')) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = this.getAnyParam(['cutoff'], 1100);
      filter.Q.value = this.getAnyParam(['resonance'], 4.2) * 2.5;

      const driveGain = ctx.createGain();
      driveGain.gain.value = this.getAnyParam(['drive', 'acid_drive'], 2.4);

      const waveshaper = ctx.createWaveShaper();
      const curve = new Float32Array(4096);
      for (let i = 0; i < 4096; ++i) {
        const x = (i * 2) / 4096 - 1;
        curve[i] = Math.tanh(x * 2.0);
      }
      waveshaper.curve = curve;

      this.input.connect(driveGain);
      driveGain.connect(filter);
      filter.connect(waveshaper);
      waveshaper.connect(this.output);

      this.nodes = { filter, driveGain };
    } else if (signature.includes('fuzz') || signature.includes('distortion')) {
      const pregain = ctx.createGain();
      pregain.gain.value = this.getAnyParam(['fuzz', 'fuzz_gain'], 8.0) * 2;

      const shaper = ctx.createWaveShaper();
      const curve = new Float32Array(4096);
      const starve = this.getAnyParam(['starve', 'voltage_starve'], 4.5) / 9.0;
      for (let i = 0; i < 4096; ++i) {
        const x = (i * 2) / 4096 - 1;
        curve[i] = x > 0 ? Math.tanh(x * 3.5) : Math.tanh(x * 3.5 * starve);
      }
      shaper.curve = curve;

      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = this.getAnyParam(['tone', 'tone_bite'], 2800);

      this.input.connect(pregain);
      pregain.connect(shaper);
      shaper.connect(tone);
      tone.connect(this.output);

      this.nodes = { pregain, filter: tone };
    } else if (signature.includes('comb')) {
      const pitch = this.getAnyParam(['pitch', 'resonator_pitch'], 185);
      const regen = this.getAnyParam(['regen', 'regen_feedback'], 86) / 100;
      const mix = this.getAnyParam(['mix', 'dry_wet'], 0.65);

      const delay = ctx.createDelay(0.5);
      delay.delayTime.value = Math.min(0.25, Math.max(0.0005, 1 / pitch));
      const fb = ctx.createGain();
      fb.gain.value = Math.min(0.95, regen);
      const dryGain = ctx.createGain();
      const wetGain = ctx.createGain();
      dryGain.gain.value = 1 - mix;
      wetGain.gain.value = mix;

      this.input.connect(dryGain);
      dryGain.connect(this.output);
      this.input.connect(delay);
      delay.connect(fb);
      fb.connect(delay);
      delay.connect(wetGain);
      wetGain.connect(this.output);

      this.nodes = { delay, feedback: fb, dryGain, wetGain };
    } else if (signature.includes('bitcrusher') || signature.includes('decimator')) {
      const bits = this.getAnyParam(['bits', 'bit_depth'], 6);
      const cut = this.getAnyParam(['downsample', 'sample_rate_cut'], 4200);
      const mix = this.getAnyParam(['mix'], 0.8);

      const shaper = ctx.createWaveShaper();
      const steps = Math.pow(2, bits - 1);
      const curve = new Float32Array(4096);
      for (let i = 0; i < 4096; i++) {
        const x = (i * 2) / 4096 - 1;
        curve[i] = Math.floor(x * steps) / steps;
      }
      shaper.curve = curve;

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = cut;

      const dryGain = ctx.createGain();
      const wetGain = ctx.createGain();
      dryGain.gain.value = 1 - mix;
      wetGain.gain.value = mix;

      this.input.connect(dryGain);
      dryGain.connect(this.output);
      this.input.connect(shaper);
      shaper.connect(lp);
      lp.connect(wetGain);
      wetGain.connect(this.output);

      this.nodes = { shaper, filter: lp, dryGain, wetGain };
    } else {
      const biquad = ctx.createBiquadFilter();
      biquad.type = 'peaking';
      biquad.frequency.value = 1000;
      biquad.gain.value = 0;

      this.input.connect(biquad);
      biquad.connect(this.output);
      this.nodes = { biquad };
    }
  }

  public updateParam(paramId: string, value: number) {
    this.activeParamValues[paramId] = value;
    const now = this.ctx.currentTime;

    if (this.nodes.delay && (paramId === 'time' || paramId === 'echo_time')) {
      this.nodes.delay.delayTime.setTargetAtTime(value / 1000, now, 0.05);
    }
    if (this.nodes.delay && (paramId === 'pitch' || paramId === 'resonator_pitch')) {
      this.nodes.delay.delayTime.setTargetAtTime(Math.min(0.25, Math.max(0.0005, 1 / value)), now, 0.03);
    }
    if (this.nodes.feedback && (paramId === 'feedback' || paramId === 'regen' || paramId === 'regen_feedback')) {
      this.nodes.feedback.gain.setTargetAtTime(Math.min(0.95, value / 100), now, 0.05);
    }
    if (this.nodes.filter && (paramId === 'cutoff' || paramId === 'highCut' || paramId === 'high_cut' || paramId === 'tone' || paramId === 'tone_bite' || paramId === 'stone_damping' || paramId === 'submersion_depth' || paramId === 'carrier_cutoff' || paramId === 'head_roll_off' || paramId === 'downsample' || paramId === 'sample_rate_cut')) {
      this.nodes.filter.frequency.setTargetAtTime(value, now, 0.05);
    }
    if (this.nodes.oxideShelf && (paramId === 'oxide_shelf' || paramId === 'tone_cut')) {
      this.nodes.oxideShelf.frequency.setTargetAtTime(value, now, 0.05);
    }
    if (this.nodes.oxideShelf && paramId === 'high_loss') {
      this.nodes.oxideShelf.gain.setTargetAtTime(value, now, 0.05);
    }
    if (this.nodes.filter && (paramId === 'resonance' || paramId === 'water_bubble_q')) {
      this.nodes.filter.Q.setTargetAtTime(value * 2.5, now, 0.05);
    }
    if (this.nodes.driveGain && (paramId === 'drive' || paramId === 'acid_drive' || paramId === 'magnetic_flux')) {
      this.nodes.driveGain.gain.setTargetAtTime(Math.max(0.5, value * 0.4), now, 0.05);
    }
    if (this.nodes.lfoL && (paramId === 'drift_rate' || paramId === 'flutter_rate')) {
      this.nodes.lfoL.frequency.setTargetAtTime(value, now, 0.05);
      if (this.nodes.lfoR) this.nodes.lfoR.frequency.setTargetAtTime(value * 1.13, now, 0.05);
    }
    if (this.nodes.depthGainL && (paramId === 'pitch_drift' || paramId === 'drift_depth')) {
      const gainVal = (value / 1000) * 0.45;
      this.nodes.depthGainL.gain.setTargetAtTime(gainVal, now, 0.05);
      if (this.nodes.depthGainR) this.nodes.depthGainR.gain.setTargetAtTime(gainVal, now, 0.05);
    }
    if (this.nodes.lfo && paramId === 'cycle_rate') {
      this.nodes.lfo.frequency.setTargetAtTime(value, now, 0.05);
    }
    if (this.nodes.feedback && paramId === 'spiral_regen') {
      this.nodes.feedback.gain.setTargetAtTime((value / 100) * 0.65, now, 0.05);
    }
    if (this.nodes.shimmerGain && paramId === 'octave_shimmer') {
      this.nodes.shimmerGain.gain.setTargetAtTime((value / 100) * 0.42, now, 0.05);
    }
    if (this.nodes.dryGain && this.nodes.wetGain && (paramId === 'dry___wet' || paramId === 'dry_wet' || paramId === 'mix')) {
      this.nodes.dryGain.gain.setTargetAtTime(1 - value, now, 0.05);
      this.nodes.wetGain.gain.setTargetAtTime(value, now, 0.05);
    }
  }

  public triggerInstrument() {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const signature = `${this.toy.id} ${this.toy.name} ${this.toy.code}`.toLowerCase();

    if (signature.includes('bell') || signature.includes('fm glass')) {
      const pitch = this.getAnyParam(['bell_pitch', 'note_freq'], 440);
      const ratio = this.getAnyParam(['metallic_ratio', 'fm_ratio'], 2.41);
      const index = this.getAnyParam(['glass_shimmer', 'fm_index'], 3.6);
      const ringTime = this.getAnyParam(['bell_decay', 'ring_time'], 2.4);

      const carrier = ctx.createOscillator();
      const modulator = ctx.createOscillator();
      const modGain = ctx.createGain();
      const ampGain = ctx.createGain();

      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(pitch, now);

      modulator.type = 'sine';
      modulator.frequency.setValueAtTime(pitch * ratio, now);

      modGain.gain.setValueAtTime(pitch * index, now);
      modGain.gain.exponentialRampToValueAtTime(0.01, now + ringTime * 0.45);

      ampGain.gain.setValueAtTime(0.55, now);
      ampGain.gain.exponentialRampToValueAtTime(0.0008, now + ringTime);

      modulator.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(ampGain);
      ampGain.connect(this.output);

      modulator.start(now);
      carrier.start(now);
      modulator.stop(now + ringTime + 0.05);
      carrier.stop(now + ringTime + 0.05);
    } else if (signature.includes('laser') || signature.includes('zap')) {
      const startHz = this.getAnyParam(['beam_start'], 2400);
      const endHz = this.getAnyParam(['beam_floor'], 85);
      const sweepSec = this.getAnyParam(['sweep_time'], 160) / 1000;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(startHz, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endHz), now + sweepSec);

      gain.gain.setValueAtTime(0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + sweepSec * 1.15);

      osc.connect(gain);
      gain.connect(this.output);
      osc.start(now);
      osc.stop(now + sweepSec * 1.2 + 0.05);
    } else if (signature.includes('siren') || signature.includes('dub')) {
      const baseHz = this.getAnyParam(['siren_pitch'], 680);
      const rate = this.getAnyParam(['wail_speed'], 5.5);
      const depth = this.getAnyParam(['pitch_swing'], 260);
      const dur = 1.4;

      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const amp = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseHz, now);
      lfo.frequency.setValueAtTime(rate, now);
      lfoGain.gain.setValueAtTime(depth, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      amp.gain.setValueAtTime(0.45, now);
      amp.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(amp);
      amp.connect(this.output);
      lfo.start(now);
      osc.start(now);
      lfo.stop(now + dur + 0.05);
      osc.stop(now + dur + 0.05);
    } else if (signature.includes('guitar') || signature.includes('karplus')) {
      const pitch = this.getAnyParam(['pitch'], 196);
      const sustain = this.getAnyParam(['sustain'], 88) / 100;
      const damping = this.getAnyParam(['damping', 'string_damping'], 0.35);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(pitch, now);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime((1 - damping) * 8000 + 400, now);
      filter.frequency.exponentialRampToValueAtTime(300, now + 1.2);

      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + sustain * 2.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.output);

      osc.start(now);
      osc.stop(now + 2.5);
    } else if (signature.includes('808') || signature.includes('sub')) {
      const baseTune = this.getAnyParam(['baseTune', 'base_pitch'], 55);
      const punchMs = this.getAnyParam(['punch', 'punch_snap'], 35);
      const decaySec = this.getAnyParam(['decay', 'sub_sustain'], 1.4);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseTune + 120, now);
      osc.frequency.exponentialRampToValueAtTime(baseTune, now + punchMs / 1000);

      gain.gain.setValueAtTime(0.9, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decaySec);

      osc.connect(gain);
      gain.connect(this.output);

      osc.start(now);
      osc.stop(now + decaySec);
    }
  }

  private getParam(id: string, fallback: number): number {
    return this.activeParamValues[id] !== undefined ? this.activeParamValues[id] : fallback;
  }

  private getAnyParam(ids: string[], fallback: number): number {
    for (const id of ids) {
      if (this.activeParamValues[id] !== undefined) {
        return this.activeParamValues[id];
      }
    }
    return fallback;
  }

  public dispose() {
    this.oscNodes.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Ignored
      }
    });
    this.oscNodes = [];
    try {
      this.input.disconnect();
      this.output.disconnect();
    } catch {
      // Ignored
    }
  }
}

/**
 * Creates a synthetic Faust DSP Toy from user or AI-generated Faust code.
 */
export function compileFaustToyFromCode(
  code: string,
  name: string = 'Custom Faust VST Toy',
  category: 'effect' | 'instrument' | 'toy' = 'effect'
): FaustDspToy {
  const params = parseFaustCodeParameters(code);

  return {
    id: `faust-custom-${Date.now()}`,
    name,
    category,
    code,
    description: 'Custom compiled Faust DSP Toy running in real-time Web Audio.',
    author: 'GHOST (Faust DSP Architect)',
    color: '#00F0FF',
    params: params.length > 0 ? params : [
      { id: 'mix', name: 'Wet / Dry Mix', type: 'slider', min: 0, max: 1, step: 0.01, defaultValue: 0.5, value: 0.5, unit: '' }
    ]
  };
}
