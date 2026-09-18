// "The Tape Deck" Vintage Macro DSP Engine
// Provides real-time Web Audio DSP nodes for:
// 1. Tape Saturation & Non-linear Soft Clipping (tape_drive)
// 2. Tape Wow & Flutter Low-frequency Pitch Drift (tape_wow, tape_flutter)
// 3. Tape Age & Dropouts (tape_age)
// 4. Algorithmic Synthetic Convolution Reverb (ir_sample: spring_reverb_tank, dark_chamber, vintage_plate)
// 5. AnalyserNode hook for real-time oscilloscope & vacuum tube metering

export type IrReverbType = 'spring_reverb_tank' | 'dark_chamber' | 'vintage_plate' | 'cathedral_abyss';

export interface TapeDeckParams {
  drive: number;        // 0 to 1 (soft-clipping warmth & tape saturation)
  wow: number;          // 0 to 1 (slow ~0.6Hz pitch wander)
  flutter: number;      // 0 to 1 (fast ~4.8Hz motor wobble)
  age: number;          // 0 to 1 (high-frequency damping & random dropouts)
  reverbMix: number;    // 0 to 1 (convolution IR wet balance)
  irType: IrReverbType; // IR impulse model
  cutoffHz: number;     // Master lowpass tone filter (20 to 20000 Hz)
}

export class TapeDeckProcessor {
  ctx: AudioContext;
  inputNode: GainNode;
  outputNode: GainNode;
  analyserNode: AnalyserNode;

  // DSP Internal Nodes
  private waveShaperNode: WaveShaperNode;
  private preToneFilter: BiquadFilterNode;
  private postToneFilter: BiquadFilterNode;
  private delayNode: DelayNode;
  private wowOsc: OscillatorNode;
  private wowGain: GainNode;
  private flutterOsc: OscillatorNode;
  private flutterGain: GainNode;
  private ageDampingFilter: BiquadFilterNode;
  private convolveNode: ConvolverNode;
  private dryGain: GainNode;
  private wetGain: GainNode;

  private currentParams: TapeDeckParams;
  private isDestroyed = false;

  constructor(ctx: AudioContext, initialParams?: Partial<TapeDeckParams>) {
    this.ctx = ctx;

    this.currentParams = {
      drive: initialParams?.drive ?? 0.45,
      wow: initialParams?.wow ?? 0.25,
      flutter: initialParams?.flutter ?? 0.2,
      age: initialParams?.age ?? 0.3,
      reverbMix: initialParams?.reverbMix ?? 0.28,
      irType: initialParams?.irType ?? 'spring_reverb_tank',
      cutoffHz: initialParams?.cutoffHz ?? 12000
    };

    // 1. Input & Analyser
    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();
    this.analyserNode = ctx.createAnalyser();
    this.analyserNode.fftSize = 1024;
    this.analyserNode.smoothingTimeConstant = 0.85;

    // 2. Pre-Tone Warmer (analog tape head pre-emphasis)
    this.preToneFilter = ctx.createBiquadFilter();
    this.preToneFilter.type = 'lowshelf';
    this.preToneFilter.frequency.value = 180;
    this.preToneFilter.gain.value = 3.5;

    // 3. Tape Saturation Waveshaper
    this.waveShaperNode = ctx.createWaveShaper();
    this.waveShaperNode.oversample = '4x';
    this.updateDriveCurve(this.currentParams.drive);

    // 4. Wow & Flutter Pitch Modulator Delay
    this.delayNode = ctx.createDelay(0.1);
    this.delayNode.delayTime.value = 0.015; // 15ms baseline delay

    this.wowOsc = ctx.createOscillator();
    this.wowOsc.type = 'sine';
    this.wowOsc.frequency.value = 0.55; // 0.55 Hz wow wander

    this.wowGain = ctx.createGain();
    this.wowGain.gain.value = 0.0006 * this.currentParams.wow;

    this.flutterOsc = ctx.createOscillator();
    this.flutterOsc.type = 'triangle';
    this.flutterOsc.frequency.value = 4.8; // 4.8 Hz motor flutter

    this.flutterGain = ctx.createGain();
    this.flutterGain.gain.value = 0.0003 * this.currentParams.flutter;

    this.wowOsc.connect(this.wowGain);
    this.wowGain.connect(this.delayNode.delayTime);

    this.flutterOsc.connect(this.flutterGain);
    this.flutterGain.connect(this.delayNode.delayTime);

    // 5. Tape Age / Damping Filter
    this.ageDampingFilter = ctx.createBiquadFilter();
    this.ageDampingFilter.type = 'lowpass';
    this.updateAgeFilter(this.currentParams.age);

    // 6. Master Post Tone Filter
    this.postToneFilter = ctx.createBiquadFilter();
    this.postToneFilter.type = 'lowpass';
    this.postToneFilter.frequency.value = this.currentParams.cutoffHz;
    this.postToneFilter.Q.value = 1.0;

    // 7. Convolution Reverb Tank
    this.convolveNode = ctx.createConvolver();
    this.loadSyntheticIR(this.currentParams.irType);

    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.updateReverbMix(this.currentParams.reverbMix);

    // 8. Connect the Graph
    // input -> preTone -> waveShaper -> delayNode -> ageDamping -> postTone
    this.inputNode.connect(this.preToneFilter);
    this.preToneFilter.connect(this.waveShaperNode);
    this.waveShaperNode.connect(this.delayNode);
    this.delayNode.connect(this.ageDampingFilter);
    this.ageDampingFilter.connect(this.postToneFilter);

    // postTone splits into dry and convolve(wet)
    this.postToneFilter.connect(this.dryGain);
    this.postToneFilter.connect(this.convolveNode);
    this.convolveNode.connect(this.wetGain);

    this.dryGain.connect(this.outputNode);
    this.wetGain.connect(this.outputNode);

    // Output routes into Analyser for live oscilloscope/VU metering
    this.outputNode.connect(this.analyserNode);

    // Start LFOs safely
    try {
      const now = ctx.currentTime;
      this.wowOsc.start(now);
      this.flutterOsc.start(now);
    } catch {
      // Ignored if already started
    }
  }

  /**
   * Generates polynomial soft-saturation transfer curve
   */
  private updateDriveCurve(drive: number) {
    const samples = 1024;
    const curve = new Float32Array(samples);
    const k = Math.max(0.01, drive * 50);

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Hyperbolic tangent soft saturation with harmonic warmth
      if (k === 0) {
        curve[i] = x;
      } else {
        curve[i] = Math.tanh(k * x) / Math.tanh(k);
      }
    }
    this.waveShaperNode.curve = curve;
  }

  private updateAgeFilter(age: number) {
    // Higher age rolls off high frequencies (old tape oxide degradation)
    const cutoff = 18000 * Math.pow(1 - age * 0.75, 2);
    this.ageDampingFilter.frequency.setTargetAtTime(Math.max(1200, cutoff), this.ctx.currentTime, 0.05);
  }

  private updateReverbMix(mix: number) {
    const dry = Math.cos(mix * 0.5 * Math.PI);
    const wet = Math.sin(mix * 0.5 * Math.PI);
    this.dryGain.gain.setTargetAtTime(dry, this.ctx.currentTime, 0.04);
    this.wetGain.gain.setTargetAtTime(wet, this.ctx.currentTime, 0.04);
  }

  /**
   * Generates algorithmic synthetic impulse responses without needing external WAV files
   */
  public loadSyntheticIR(irType: IrReverbType) {
    const sampleRate = this.ctx.sampleRate;
    let lengthSec = 1.8;
    let decayRate = 3.2;
    let isSpring = false;

    switch (irType) {
      case 'spring_reverb_tank':
        lengthSec = 1.6;
        decayRate = 3.8;
        isSpring = true;
        break;
      case 'dark_chamber':
        lengthSec = 3.2;
        decayRate = 2.0;
        break;
      case 'vintage_plate':
        lengthSec = 2.2;
        decayRate = 4.2;
        break;
      case 'cathedral_abyss':
        lengthSec = 4.5;
        decayRate = 1.4;
        break;
    }

    const length = Math.floor(sampleRate * lengthSec);
    const irBuffer = this.ctx.createBuffer(2, length, sampleRate);
    const left = irBuffer.getChannelData(0);
    const right = irBuffer.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const env = Math.exp(-t * decayRate);

      if (isSpring) {
        // Accutronics spring tank dispersion: chirping high frequencies and metallic reflection taps
        const chirp = Math.sin(2 * Math.PI * 650 * Math.pow(t + 0.001, -0.4)) * 0.35;
        const tap1 = (i % 2400 < 30) ? 0.3 : 0;
        const tap2 = (i % 3800 < 30) ? 0.25 : 0;
        const noiseL = ((Math.random() * 2) - 1) * 0.6;
        const noiseR = ((Math.random() * 2) - 1) * 0.6;

        left[i] = (noiseL + chirp + tap1) * env;
        right[i] = (noiseR - chirp + tap2) * env;
      } else {
        // Diffuse dense velvet reverb tail
        const noiseL = (Math.random() * 2) - 1;
        const noiseR = (Math.random() * 2) - 1;
        left[i] = noiseL * env;
        right[i] = noiseR * env;
      }
    }

    this.convolveNode.buffer = irBuffer;
  }

  public updateParams(newParams: Partial<TapeDeckParams>) {
    this.currentParams = { ...this.currentParams, ...newParams };
    const now = this.ctx.currentTime;

    if (newParams.drive !== undefined) {
      this.updateDriveCurve(this.currentParams.drive);
    }
    if (newParams.wow !== undefined) {
      this.wowGain.gain.setTargetAtTime(0.0006 * this.currentParams.wow, now, 0.05);
    }
    if (newParams.flutter !== undefined) {
      this.flutterGain.gain.setTargetAtTime(0.0003 * this.currentParams.flutter, now, 0.05);
    }
    if (newParams.age !== undefined) {
      this.updateAgeFilter(this.currentParams.age);
    }
    if (newParams.reverbMix !== undefined) {
      this.updateReverbMix(this.currentParams.reverbMix);
    }
    if (newParams.irType !== undefined) {
      this.loadSyntheticIR(this.currentParams.irType);
    }
    if (newParams.cutoffHz !== undefined) {
      this.postToneFilter.frequency.setTargetAtTime(
        Math.max(20, Math.min(20000, this.currentParams.cutoffHz)),
        now,
        0.04
      );
    }
  }

  public getParams(): TapeDeckParams {
    return { ...this.currentParams };
  }

  public destroy() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    try {
      this.wowOsc.stop();
      this.flutterOsc.stop();
      this.inputNode.disconnect();
      this.outputNode.disconnect();
    } catch {}
  }
}

// Global singleton for auditioning in the SFZ Builder
let globalTapeDeck: TapeDeckProcessor | null = null;

export function getTapeDeckProcessor(ctx: AudioContext, params?: Partial<TapeDeckParams>): TapeDeckProcessor {
  if (!globalTapeDeck || globalTapeDeck.ctx !== ctx) {
    if (globalTapeDeck) {
      globalTapeDeck.destroy();
    }
    globalTapeDeck = new TapeDeckProcessor(ctx, params);
  } else if (params) {
    globalTapeDeck.updateParams(params);
  }
  return globalTapeDeck;
}
