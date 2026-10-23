// Master Audio Bus & Real-time Analyser Hub
// Provides a shared connection point for the Master Bus output across Mixer, Mastering, and Audio services,
// with a real-time 6-band Parametric EQ and frequency response transfer engine.

export interface ParametricEqBand {
  id: string;
  name: string;
  type: BiquadFilterType; // 'highpass' | 'lowpass' | 'lowshelf' | 'highshelf' | 'peaking' | 'notch'
  frequency: number;      // 20 Hz to 20,000 Hz
  gain: number;           // -18 dB to +18 dB (for peaking & shelf)
  q: number;              // 0.1 to 18 (Q factor / resonance)
  enabled: boolean;
  color: string;
  isCutoff?: boolean;     // true if primary HPF (low-cut) or LPF (high-cut)
}

export const DEFAULT_PARAMETRIC_EQ_BANDS: ParametricEqBand[] = [
  {
    id: 'band-1',
    name: 'Low Cut / HPF',
    type: 'highpass',
    frequency: 32,
    gain: 0,
    q: 0.707,
    enabled: true,
    color: '#EC4899', // Hot Pink
    isCutoff: true
  },
  {
    id: 'band-2',
    name: 'Sub / Low Shelf',
    type: 'lowshelf',
    frequency: 110,
    gain: 0,
    q: 0.707,
    enabled: true,
    color: '#3B82F6', // Blue
    isCutoff: false
  },
  {
    id: 'band-3',
    name: 'De-Mud Notch',
    type: 'peaking',
    frequency: 420,
    gain: -2.0,
    q: 1.4,
    enabled: true,
    color: '#10B981', // Emerald
    isCutoff: false
  },
  {
    id: 'band-4',
    name: 'Vocal Mid Bell',
    type: 'peaking',
    frequency: 2400,
    gain: 0,
    q: 1.2,
    enabled: true,
    color: '#F59E0B', // Amber
    isCutoff: false
  },
  {
    id: 'band-5',
    name: 'Anti-Sheen High Mid',
    type: 'peaking',
    frequency: 8500,
    gain: -2.5,
    q: 1.8,
    enabled: true,
    color: '#A855F7', // Purple
    isCutoff: false
  },
  {
    id: 'band-6',
    name: 'High Cut / LPF',
    type: 'lowpass',
    frequency: 19000,
    gain: 0,
    q: 0.707,
    enabled: true,
    color: '#06B6D4', // Cyan
    isCutoff: true
  }
];

class MasterAudioBus {
  private audioContext: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private eqInputNode: GainNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private analyserNode: AnalyserNode | null = null;
  private testSourceNode: AudioBufferSourceNode | OscillatorNode | null = null;
  private testGainNode: GainNode | null = null;
  private isTestingSignal: boolean = false;
  private currentTestType: 'none' | 'pink_noise' | 'multiband_mix' | 'sine_sweep' | 'cal_tone' = 'none';

  private bands: ParametricEqBand[] = JSON.parse(JSON.stringify(DEFAULT_PARAMETRIC_EQ_BANDS));
  private eqBypassed: boolean = false;
  private eqChangeListeners: Set<(bands: ParametricEqBand[], bypassed: boolean) => void> = new Set();

  private compressorNode: DynamicsCompressorNode | null = null;
  private saturationNode: WaveShaperNode | null = null;
  private saturationMakeupNode: GainNode | null = null;
  private compressorBypassed: boolean = false;
  private saturationBypassed: boolean = false;

  private masteringBypassed: boolean = false;
  private masteringBypassListeners: Set<(bypassed: boolean) => void> = new Set();

  public getAudioContext(): AudioContext {
    if (!this.audioContext && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.setupNodes();
    }
    return this.audioContext!;
  }

  private setupNodes() {
    if (!this.audioContext) return;
    if (this.analyserNode) return;

    const ctx = this.audioContext;
    this.masterGainNode = ctx.createGain();
    this.masterGainNode.gain.value = 1.0;

    this.testGainNode = ctx.createGain();
    this.testGainNode.gain.value = 0.22;

    this.eqInputNode = ctx.createGain();
    this.eqInputNode.gain.value = 1.0;

    this.analyserNode = ctx.createAnalyser();
    this.analyserNode.fftSize = 2048;
    this.analyserNode.smoothingTimeConstant = 0.82;
    this.analyserNode.minDecibels = -100;
    this.analyserNode.maxDecibels = -10;

    // Connect Inputs -> EQ Input
    this.masterGainNode.connect(this.eqInputNode);
    this.testGainNode.connect(this.eqInputNode);

    // Build Parametric EQ BiquadFilter chain:
    // eqInputNode -> Filter 0 -> Filter 1 -> ... -> Filter N -> analyserNode -> destination
    let prevNode: AudioNode = this.eqInputNode;
    this.eqFilters = this.bands.map(band => {
      const filter = ctx.createBiquadFilter();
      filter.type = band.type;
      filter.frequency.value = band.frequency;
      filter.gain.value = band.gain;
      filter.Q.value = band.q;

      prevNode.connect(filter);
      prevNode = filter;
      return filter;
    });

    // Mastering Bus Dynamics Compressor
    this.compressorNode = ctx.createDynamicsCompressor();
    this.compressorNode.threshold.value = -12;
    this.compressorNode.ratio.value = 2.0;
    this.compressorNode.attack.value = 0.03;
    this.compressorNode.release.value = 0.15;
    this.compressorNode.knee.value = 8.0;

    // Analog Saturation WaveShaper & Makeup Gain
    this.saturationNode = ctx.createWaveShaper();
    this.saturationNode.oversample = '4x';
    this.saturationMakeupNode = ctx.createGain();
    this.saturationMakeupNode.gain.value = 1.0;
    this.setSaturationCurve(15, 'clean', 5);

    // Chain: EQ Filters -> Compressor -> Saturation -> Saturation Makeup -> Analyser -> Master Gain -> Destination
    prevNode.connect(this.compressorNode);
    this.compressorNode.connect(this.saturationNode);
    this.saturationNode.connect(this.saturationMakeupNode);
    this.saturationMakeupNode.connect(this.analyserNode);
    this.analyserNode.connect(this.masterGainNode);
    this.masterGainNode.connect(ctx.destination);
  }

  public getCompressorGainReduction(): number {
    if (!this.compressorNode || this.compressorBypassed || this.masteringBypassed) return 0;
    try {
      return Math.abs(this.compressorNode.reduction);
    } catch {
      return 0;
    }
  }

  public applyDynamicsAndSaturation(
    comp: { thresholdDb: number; ratio: number; attackMs: number; releaseMs: number; kneeDb: number; makeupGainDb: number; enabled: boolean },
    sat: { drivePercent: number; warmthPercent: number; character: 'tape' | 'tube' | 'transformer' | 'console' | 'clean'; asymmetry: number; ceilingDb: number; enabled: boolean }
  ) {
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;

    this.compressorBypassed = !comp.enabled;
    this.saturationBypassed = !sat.enabled;

    if (this.compressorNode) {
      if (!comp.enabled || this.masteringBypassed) {
        this.compressorNode.threshold.setTargetAtTime(0, now, 0.015);
        this.compressorNode.ratio.setTargetAtTime(1, now, 0.015);
      } else {
        this.compressorNode.threshold.setTargetAtTime(Math.max(-40, Math.min(0, comp.thresholdDb)), now, 0.015);
        this.compressorNode.ratio.setTargetAtTime(Math.max(1, Math.min(20, comp.ratio)), now, 0.015);
        this.compressorNode.attack.setTargetAtTime(Math.max(0.001, Math.min(0.2, comp.attackMs / 1000)), now, 0.015);
        this.compressorNode.release.setTargetAtTime(Math.max(0.02, Math.min(1.0, comp.releaseMs / 1000)), now, 0.015);
        this.compressorNode.knee.setTargetAtTime(Math.max(0, Math.min(24, comp.kneeDb)), now, 0.015);
      }
    }

    if (this.saturationNode && this.saturationMakeupNode) {
      if (!sat.enabled || this.masteringBypassed || sat.drivePercent <= 0) {
        this.setSaturationLinear();
        this.saturationMakeupNode.gain.setTargetAtTime(1.0, now, 0.015);
      } else {
        this.setSaturationCurve(sat.drivePercent, sat.character, sat.asymmetry);
        const makeup = Math.pow(10, ((comp.enabled ? comp.makeupGainDb : 0) * 0.5) / 20);
        this.saturationMakeupNode.gain.setTargetAtTime(Math.max(0.2, Math.min(2.5, makeup)), now, 0.015);
      }
    }
  }

  private setSaturationLinear() {
    if (!this.saturationNode) return;
    const n = 1024;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      curve[i] = (i / (n - 1)) * 2 - 1;
    }
    this.saturationNode.curve = curve;
  }

  private setSaturationCurve(drivePercent: number, character: 'tape' | 'tube' | 'transformer' | 'console' | 'clean', asymmetry: number) {
    if (!this.saturationNode) return;
    const n = 2048;
    const curve = new Float32Array(n);
    const drive = 1 + (drivePercent / 100) * 3.5;
    const asym = (asymmetry / 100) * 0.35;

    for (let i = 0; i < n; i++) {
      let x = (i / (n - 1)) * 2 - 1;
      let y = x;

      if (character === 'tape') {
        // Tanh soft saturation with tape compression
        const driven = (x + asym * x * x) * drive;
        y = Math.tanh(driven) / Math.tanh(drive);
      } else if (character === 'tube') {
        // Asymmetric even-order harmonic saturation
        const xOffset = x + asym;
        if (xOffset > 0) {
          y = (1 - Math.exp(-xOffset * drive)) / (1 - Math.exp(-drive));
        } else {
          y = -(1 - Math.exp(xOffset * drive)) / (1 - Math.exp(-drive));
        }
      } else if (character === 'transformer') {
        // Magnetic hysteresis core saturation
        const driven = x * drive;
        y = (driven / (1 + Math.abs(driven) * 0.7)) * 1.1;
      } else if (character === 'console') {
        // Class-A desk soft-clip sigmoid
        y = (2 / Math.PI) * Math.atan(x * drive * 1.5);
      } else {
        // Clean transparent soft ceiling
        const driven = x * drive;
        y = Math.max(-1, Math.min(1, driven));
      }

      curve[i] = Math.max(-1, Math.min(1, y));
    }

    this.saturationNode.curve = curve;
  }

  public getAnalyser(): AnalyserNode {
    this.getAudioContext();
    return this.analyserNode!;
  }

  public getMasterGain(): GainNode {
    this.getAudioContext();
    return this.masterGainNode!;
  }

  // Connects an external audio node (like Mixer master or audioService master) into the Master Bus
  public connectToMaster(node: AudioNode) {
    this.getAudioContext();
    if (this.masterGainNode) {
      try {
        node.connect(this.masterGainNode);
      } catch (e) {
        // already connected or incompatible context
      }
    }
  }

  // Parametric EQ controls
  public getBands(): ParametricEqBand[] {
    return [...this.bands];
  }

  public isEqBypassed(): boolean {
    return this.eqBypassed;
  }

  public setEqBypass(bypassed: boolean) {
    this.eqBypassed = bypassed;
    this.syncFilterNodes();
    this.notifyEqListeners();
  }

  // Mastering AI DSP Bypass (A/B testing original vs mastered)
  public isMasteringBypassed(): boolean {
    return this.masteringBypassed;
  }

  public setMasteringBypass(bypassed: boolean) {
    if (this.masteringBypassed === bypassed) return;
    this.masteringBypassed = bypassed;
    this.notifyMasteringBypassListeners();
  }

  public toggleMasteringBypass(): boolean {
    const next = !this.masteringBypassed;
    this.setMasteringBypass(next);
    return next;
  }

  public subscribeMasteringBypass(listener: (bypassed: boolean) => void): () => void {
    this.masteringBypassListeners.add(listener);
    try {
      listener(this.masteringBypassed);
    } catch (e) {
      console.error(e);
    }
    return () => {
      this.masteringBypassListeners.delete(listener);
    };
  }

  private notifyMasteringBypassListeners() {
    this.masteringBypassListeners.forEach(listener => {
      try {
        listener(this.masteringBypassed);
      } catch (e) {
        console.error('Error in mastering bypass listener', e);
      }
    });
  }

  public updateBand(bandId: string, updates: Partial<ParametricEqBand>) {
    this.bands = this.bands.map(b => (b.id === bandId ? { ...b, ...updates } : b));
    this.syncFilterNodes();
    this.notifyEqListeners();
  }

  public setAllBands(newBands: ParametricEqBand[]) {
    this.bands = JSON.parse(JSON.stringify(newBands));
    this.syncFilterNodes();
    this.notifyEqListeners();
  }

  public resetEqToFlat() {
    this.bands = this.bands.map(b => ({
      ...b,
      gain: 0,
      frequency: b.id === 'band-1' ? 20 : b.id === 'band-6' ? 20000 : b.frequency,
      enabled: true
    }));
    this.syncFilterNodes();
    this.notifyEqListeners();
  }

  private syncFilterNodes() {
    if (!this.audioContext || this.eqFilters.length === 0) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    this.bands.forEach((band, idx) => {
      const filter = this.eqFilters[idx];
      if (!filter) return;

      const isEffectivelyActive = band.enabled && !this.eqBypassed;

      if (!isEffectivelyActive) {
        // Transparent neutral state
        if (band.type === 'highpass') {
          filter.frequency.setTargetAtTime(10, now, 0.015);
          filter.Q.setTargetAtTime(0.707, now, 0.015);
        } else if (band.type === 'lowpass') {
          filter.frequency.setTargetAtTime(24000, now, 0.015);
          filter.Q.setTargetAtTime(0.707, now, 0.015);
        } else {
          filter.gain.setTargetAtTime(0, now, 0.015);
        }
      } else {
        filter.type = band.type;
        filter.frequency.setTargetAtTime(Math.max(10, Math.min(22000, band.frequency)), now, 0.015);
        filter.gain.setTargetAtTime(Math.max(-24, Math.min(24, band.gain)), now, 0.015);
        filter.Q.setTargetAtTime(Math.max(0.1, Math.min(24, band.q)), now, 0.015);
      }
    });
  }

  public subscribeEqChange(cb: (bands: ParametricEqBand[], bypassed: boolean) => void): () => void {
    this.eqChangeListeners.add(cb);
    return () => {
      this.eqChangeListeners.delete(cb);
    };
  }

  private notifyEqListeners() {
    this.eqChangeListeners.forEach(cb => cb(this.getBands(), this.eqBypassed));
  }

  /**
   * Evaluates the mathematically exact combined dB frequency response of the parametric EQ
   * across the provided frequencies array using Web Audio's getFrequencyResponse.
   */
  public getCombinedFrequencyResponse(frequencies: Float32Array): Float32Array {
    const totalDb = new Float32Array(frequencies.length).fill(0);
    if (this.eqBypassed || this.eqFilters.length === 0) {
      return totalDb;
    }

    const magResponse = new Float32Array(frequencies.length);
    const phaseResponse = new Float32Array(frequencies.length);

    this.bands.forEach((band, idx) => {
      if (!band.enabled) return;
      const filter = this.eqFilters[idx];
      if (!filter) return;

      try {
        filter.getFrequencyResponse(frequencies, magResponse, phaseResponse);
        for (let i = 0; i < frequencies.length; i++) {
          const mag = Math.max(0.00001, magResponse[i]);
          totalDb[i] += 20 * Math.log10(mag);
        }
      } catch (e) {
        // fallback
      }
    });

    return totalDb;
  }

  // Starts a reference test signal (Pink Noise, Multiband Mix, Sine Sweep, Cal Tone)
  public startTestSignal(type: 'pink_noise' | 'multiband_mix' | 'sine_sweep' | 'cal_tone') {
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    this.stopTestSignal();
    this.isTestingSignal = true;
    this.currentTestType = type;

    if (type === 'pink_noise') {
      const bufferSize = ctx.sampleRate * 4;
      const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
          b6 = white * 0.115926;
        }
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(this.testGainNode!);
      source.start();
      this.testSourceNode = source;
    } else if (type === 'multiband_mix') {
      const bufferSize = ctx.sampleRate * 6;
      const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      const freqs = [
        [55, 110, 220, 261.63, 329.63, 392, 523.25, 1046.5, 2093, 4186, 8372], // Am7
        [43.65, 87.31, 174.61, 220, 261.63, 349.23, 698.46, 1396.9, 2793, 5587], // Fmaj7
        [65.41, 130.81, 196, 261.63, 329.63, 523.25, 1046.5, 2093, 4186, 7839], // C
        [49, 98, 196, 246.94, 293.66, 392, 783.99, 1567.9, 3135, 6271] // G
      ];

      for (let i = 0; i < bufferSize; i++) {
        const t = i / ctx.sampleRate;
        const chordIdx = Math.floor((t / 1.5) % 4);
        const activeChord = freqs[chordIdx];
        let sampleL = 0;
        let sampleR = 0;

        // Sub bass kick pulse (4 on the floor)
        const beatPos = (t * 2) % 1;
        const kickEnvelope = Math.exp(-beatPos * 12);
        const kickFreq = 120 * Math.exp(-beatPos * 25) + 45;
        const kick = Math.sin(2 * Math.PI * kickFreq * t) * kickEnvelope * 0.35;
        sampleL += kick;
        sampleR += kick;

        // Chords with harmonics
        activeChord.forEach((f, idx) => {
          const weight = 0.18 / Math.sqrt(idx + 1);
          const pan = idx % 2 === 0 ? 0.8 : -0.8;
          const osc = Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t);
          sampleL += osc * weight * (1 - pan * 0.3);
          sampleR += osc * weight * (1 + pan * 0.3);
        });

        // Hi-hat sizzle
        const hihatEnv = Math.exp(-((t * 4) % 1) * 30);
        const hihat = (Math.random() * 2 - 1) * hihatEnv * 0.08;
        sampleL += hihat;
        sampleR += hihat;

        left[i] = Math.max(-1, Math.min(1, sampleL * 0.65));
        right[i] = Math.max(-1, Math.min(1, sampleR * 0.65));
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(this.testGainNode!);
      source.start();
      this.testSourceNode = source;
    } else if (type === 'sine_sweep') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(20, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(20000, ctx.currentTime + 5);
      osc.connect(this.testGainNode!);
      osc.start();
      this.testSourceNode = osc;
    } else if (type === 'cal_tone') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 1000;
      osc.connect(this.testGainNode!);
      osc.start();
      this.testSourceNode = osc;
    }
  }

  public stopTestSignal() {
    if (this.testSourceNode) {
      try {
        this.testSourceNode.stop();
        this.testSourceNode.disconnect();
      } catch (e) {
        // ignored
      }
      this.testSourceNode = null;
    }
    this.isTestingSignal = false;
    this.currentTestType = 'none';
  }

  public getTestStatus() {
    return {
      isPlaying: this.isTestingSignal,
      type: this.currentTestType
    };
  }
}

export const masterAudioBus = new MasterAudioBus();
