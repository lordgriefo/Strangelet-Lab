import { FaustDspToy, FaustDspParam } from '../types';
import { getAudioContext } from '../lib/laserSound';

export const FAUST_DSP_PRESET_TOYS: FaustDspToy[] = [
  {
    id: 'faust-tape-echo',
    name: 'Lynchian Tape Echo VST Toy',
    category: 'effect',
    color: '#D97706',
    icon: 'Radio',
    description: 'Analog tape delay with wow, flutter modulation, high-shelf damping, and soft magnetic saturation.',
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
    id: 'faust-acid-filter',
    name: 'TB-303 Diode Acid Filter Toy',
    category: 'effect',
    color: '#EC4899',
    icon: 'Zap',
    description: 'Resonant 18dB/oct diode ladder filter inspired by the Roland TB-303 with non-linear overdrive.',
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
    id: 'faust-karplus-guitar',
    name: 'Karplus-Strong Plucked Guitar Toy',
    category: 'instrument',
    color: '#10B981',
    icon: 'Music',
    description: 'Physical modeling string synthesizer using a filtered delay loop for acoustic and electric guitar plucks.',
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
    id: 'faust-germanium-fuzz',
    name: 'Germanium Fuzz & Voltage Starve Toy',
    category: 'effect',
    color: '#EF4444',
    icon: 'Flame',
    description: 'Boutique vintage Germanium transistor fuzz box with asymmetric clipping and voltage starve sag.',
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
    id: 'faust-space-comb',
    name: 'Holographic Stereo Comb Resonator',
    category: 'effect',
    color: '#8B5CF6',
    icon: 'Sparkles',
    description: 'Pitched dual-comb resonator that turns any drum break or guitar strum into metallic crystalline arpeggios.',
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
    id: 'faust-sub-808',
    name: 'Analog Sub-808 Kick Synth Toy',
    category: 'instrument',
    color: '#00F0FF',
    icon: 'Disc',
    description: 'Sine oscillator with exponential pitch sweep and saturation for booming 808 subs and punchy kicks.',
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
    id: 'faust-bit-crusher',
    name: 'Sample-Hold Bitcrusher Decimator',
    category: 'effect',
    color: '#F59E0B',
    icon: 'Cpu',
    description: 'Sample-and-hold frequency downsampler and bit depth truncator with retro gaming grit.',
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
 * Real-time Web Audio DSP Engine for Faust Toys.
 * Compiles parameters and executes physical audio processing.
 */
export class FaustDspLiveNode {
  private ctx: AudioContext;
  public input: GainNode;
  public output: GainNode;
  private toy: FaustDspToy;
  private nodes: any = {};
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

    if (this.toy.id.includes('tape-echo') || this.toy.id.includes('delay')) {
      const delay = ctx.createDelay(3.0);
      const feedback = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const waveshaper = ctx.createWaveShaper();

      // Soft tape saturation curve
      const n_samples = 44100;
      const curve = new Float32Array(n_samples);
      for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = Math.tanh(x * 1.5);
      }
      waveshaper.curve = curve;

      filter.type = 'lowpass';
      filter.frequency.value = this.getParam('highCut', 3200);

      const timeSec = this.getParam('time', 380) / 1000;
      delay.delayTime.value = timeSec;
      feedback.gain.value = this.getParam('feedback', 55) / 100;

      // Input -> Output (Dry)
      this.input.connect(this.output);

      // Input -> Delay -> Waveshaper -> Filter -> Feedback -> Delay
      this.input.connect(delay);
      delay.connect(waveshaper);
      waveshaper.connect(filter);
      filter.connect(feedback);
      feedback.connect(delay);
      filter.connect(this.output);

      this.nodes = { delay, feedback, filter };
    } else if (this.toy.id.includes('acid') || this.toy.id.includes('filter')) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = this.getParam('cutoff', 1100);
      filter.Q.value = this.getParam('resonance', 4.2) * 2.5;

      const driveGain = ctx.createGain();
      driveGain.gain.value = this.getParam('drive', 2.4);

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
    } else if (this.toy.id.includes('fuzz') || this.toy.id.includes('distortion')) {
      const pregain = ctx.createGain();
      pregain.gain.value = this.getParam('fuzz', 8.0) * 2;

      const shaper = ctx.createWaveShaper();
      const curve = new Float32Array(4096);
      const starve = this.getParam('starve', 4.5) / 9.0;
      for (let i = 0; i < 4096; ++i) {
        const x = (i * 2) / 4096 - 1;
        curve[i] = x > 0 ? Math.tanh(x * 3.5) : Math.tanh(x * 3.5 * starve);
      }
      shaper.curve = curve;

      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = this.getParam('tone', 2800);

      this.input.connect(pregain);
      pregain.connect(shaper);
      shaper.connect(tone);
      tone.connect(this.output);

      this.nodes = { pregain, tone };
    } else {
      // Generic Passthrough with Wet/Dry Filter
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

    if (this.nodes.delay && paramId === 'time') {
      this.nodes.delay.delayTime.setTargetAtTime(value / 1000, this.ctx.currentTime, 0.05);
    }
    if (this.nodes.feedback && paramId === 'feedback') {
      this.nodes.feedback.gain.setTargetAtTime(value / 100, this.ctx.currentTime, 0.05);
    }
    if (this.nodes.filter && (paramId === 'cutoff' || paramId === 'highCut' || paramId === 'tone')) {
      this.nodes.filter.frequency.setTargetAtTime(value, this.ctx.currentTime, 0.05);
    }
    if (this.nodes.filter && paramId === 'resonance') {
      this.nodes.filter.Q.setTargetAtTime(value * 2.5, this.ctx.currentTime, 0.05);
    }
    if (this.nodes.driveGain && paramId === 'drive') {
      this.nodes.driveGain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.05);
    }
  }

  public triggerInstrument() {
    // Generate synthetic audio for physical modeling toys (e.g. Karplus-Strong or 808 kick)
    const ctx = this.ctx;
    const now = ctx.currentTime;

    if (this.toy.id.includes('guitar') || this.toy.id.includes('karplus')) {
      const pitch = this.getParam('pitch', 196);
      const sustain = this.getParam('sustain', 88) / 100;
      const damping = this.getParam('damping', 0.35);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(pitch, now);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime((1 - damping) * 8000 + 400, now);
      filter.frequency.exponentialRampToValueAtTime(300, now + 1.2);

      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (sustain * 2.5));

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.output);

      osc.start(now);
      osc.stop(now + 2.5);
    } else if (this.toy.id.includes('808') || this.toy.id.includes('sub')) {
      const baseTune = this.getParam('baseTune', 55);
      const punchMs = this.getParam('punch', 35);
      const decaySec = this.getParam('decay', 1.4);

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

  public dispose() {
    try {
      this.input.disconnect();
      this.output.disconnect();
    } catch (e) {
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
    author: 'AI Helper (Faust Engine)',
    color: '#00F0FF',
    params: params.length > 0 ? params : [
      { id: 'mix', name: 'Wet / Dry Mix', type: 'slider', min: 0, max: 1, step: 0.01, defaultValue: 0.5, value: 0.5, unit: '' }
    ]
  };
}
