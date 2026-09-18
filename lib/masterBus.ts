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

    prevNode.connect(this.analyserNode);
    this.analyserNode.connect(ctx.destination);
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
