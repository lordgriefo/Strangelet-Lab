import { Track, TrackFxParams, DEFAULT_TRACK_FX } from '../types';

interface TrackDspChain {
  inputGain: GainNode;
  eqLow: BiquadFilterNode;
  eqMid: BiquadFilterNode;
  eqHigh: BiquadFilterNode;
  driveNode: WaveShaperNode;
  filterNode: BiquadFilterNode;
  delayNode: DelayNode;
  delayFeedback: GainNode;
  delayWet: GainNode;
  reverbConvolver: ConvolverNode;
  reverbWet: GainNode;
  pannerNode: StereoPannerNode | GainNode;
  volumeGain: GainNode;
  outputGain: GainNode;
  currentFx: TrackFxParams;
}

function makeDistortionCurve(amount: number): Float32Array {
  const n_samples = 4096;
  const curve = new Float32Array(n_samples);
  const k = Math.max(0, Math.min(1, amount)) * 30;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    if (k <= 0.001) {
      curve[i] = x;
    } else {
      curve[i] = Math.tanh(x * (1 + k)) / Math.tanh(1 + k);
    }
  }
  return curve;
}

function createImpulseResponse(ctx: AudioContext, durationSeconds: number, decay: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * Math.max(0.2, durationSeconds)));
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);
  for (let i = 0; i < length; i++) {
    const t = i / length;
    const env = Math.pow(1 - t, decay);
    left[i] = (Math.random() * 2 - 1) * env;
    right[i] = (Math.random() * 2 - 1) * env;
  }
  return impulse;
}

// Audio Service with real per-track DSP Insert Chains, EQ, Saturation, Delay & Reverb
class AudioService {
  private audioContext: AudioContext | null = null;
  private trackBuffers: Map<string, AudioBuffer> = new Map();
  private originalTrackBuffers: Map<string, AudioBuffer> = new Map();
  private trackSources: Map<string, AudioBufferSourceNode> = new Map();
  private trackDspChains: Map<string, TrackDspChain> = new Map();
  private masterGain: GainNode | null = null;

  constructor() {
    // Lazily initialized on demand to avoid browser autoplay / permissions errors on load
  }

  public ensureContext(): AudioContext | null {
    return this.getAudioContext();
  }

  private getAudioContext(): AudioContext | null {
    if (!this.audioContext && typeof window !== 'undefined') {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
          this.masterGain = this.audioContext.createGain();
          this.masterGain.connect(this.audioContext.destination);
        }
      } catch (err) {
        console.warn('AudioService: AudioContext initialization deferred:', err);
      }
    }
    return this.audioContext;
  }

  public getOrCreateTrackDspChain(trackId: string): TrackDspChain | null {
    const ctx = this.getAudioContext();
    if (!ctx) return null;

    if (this.trackDspChains.has(trackId)) {
      return this.trackDspChains.get(trackId)!;
    }

    try {
      const inputGain = ctx.createGain();

      // 3-Band Equalizer
      const eqLow = ctx.createBiquadFilter();
      eqLow.type = 'lowshelf';
      eqLow.frequency.value = 100;
      eqLow.gain.value = 0;

      const eqMid = ctx.createBiquadFilter();
      eqMid.type = 'peaking';
      eqMid.frequency.value = 1000;
      eqMid.Q.value = 1.0;
      eqMid.gain.value = 0;

      const eqHigh = ctx.createBiquadFilter();
      eqHigh.type = 'highshelf';
      eqHigh.frequency.value = 8000;
      eqHigh.gain.value = 0;

      // Tube Saturation / Drive
      const driveNode = ctx.createWaveShaper();
      driveNode.curve = makeDistortionCurve(0);
      driveNode.oversample = '2x';

      // Resonant Filter
      const filterNode = ctx.createBiquadFilter();
      filterNode.type = 'lowpass';
      filterNode.frequency.value = 20000;
      filterNode.Q.value = 1.0;

      // Delay Node + Feedback
      const delayNode = ctx.createDelay(2.0);
      delayNode.delayTime.value = 0.25;

      const delayFeedback = ctx.createGain();
      delayFeedback.gain.value = 0.35;

      const delayWet = ctx.createGain();
      delayWet.gain.value = 0.0;

      // Reverb Node
      const reverbConvolver = ctx.createConvolver();
      reverbConvolver.buffer = createImpulseResponse(ctx, 2.0, 2.0);

      const reverbWet = ctx.createGain();
      reverbWet.gain.value = 0.0;

      // Panner Node (with fallback if StereoPannerNode not supported)
      let pannerNode: StereoPannerNode | GainNode;
      if (typeof ctx.createStereoPanner === 'function') {
        pannerNode = ctx.createStereoPanner();
        pannerNode.pan.value = 0;
      } else {
        pannerNode = ctx.createGain();
      }

      const volumeGain = ctx.createGain();
      volumeGain.gain.value = 0.8;

      const outputGain = ctx.createGain();
      outputGain.gain.value = 1.0;

      // Connect Signal Graph:
      // inputGain -> eqLow -> eqMid -> eqHigh -> driveNode -> filterNode
      inputGain.connect(eqLow);
      eqLow.connect(eqMid);
      eqMid.connect(eqHigh);
      eqHigh.connect(driveNode);
      driveNode.connect(filterNode);

      // Dry path directly to panner
      filterNode.connect(pannerNode);

      // Delay loop: filterNode -> delayNode -> delayWet -> pannerNode
      filterNode.connect(delayNode);
      delayNode.connect(delayFeedback);
      delayFeedback.connect(delayNode);
      delayNode.connect(delayWet);
      delayWet.connect(pannerNode);

      // Reverb path: filterNode -> reverbConvolver -> reverbWet -> pannerNode
      filterNode.connect(reverbConvolver);
      reverbConvolver.connect(reverbWet);
      reverbWet.connect(pannerNode);

      // Post-FX Volume & Master routing
      pannerNode.connect(volumeGain);
      volumeGain.connect(outputGain);
      if (this.masterGain) {
        outputGain.connect(this.masterGain);
      } else {
        outputGain.connect(ctx.destination);
      }

      const chain: TrackDspChain = {
        inputGain,
        eqLow,
        eqMid,
        eqHigh,
        driveNode,
        filterNode,
        delayNode,
        delayFeedback,
        delayWet,
        reverbConvolver,
        reverbWet,
        pannerNode,
        volumeGain,
        outputGain,
        currentFx: { ...DEFAULT_TRACK_FX }
      };

      this.trackDspChains.set(trackId, chain);
      return chain;
    } catch (e) {
      console.warn(`Failed to create DSP chain for track ${trackId}:`, e);
      return null;
    }
  }

  updateTrackFx(trackId: string, fxUpdates: Partial<TrackFxParams>): void {
    const chain = this.getOrCreateTrackDspChain(trackId);
    if (!chain) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const newFx: TrackFxParams = { ...chain.currentFx, ...fxUpdates };
    chain.currentFx = newFx;

    // If FX bypassed or disabled
    if (!newFx.enabled) {
      chain.eqLow.gain.setTargetAtTime(0, now, 0.02);
      chain.eqMid.gain.setTargetAtTime(0, now, 0.02);
      chain.eqHigh.gain.setTargetAtTime(0, now, 0.02);
      chain.driveNode.curve = makeDistortionCurve(0);
      chain.filterNode.frequency.setTargetAtTime(20000, now, 0.02);
      chain.delayWet.gain.setTargetAtTime(0, now, 0.02);
      chain.reverbWet.gain.setTargetAtTime(0, now, 0.02);
      return;
    }

    // Apply 3-Band EQ
    chain.eqLow.gain.setTargetAtTime(Math.max(-15, Math.min(15, newFx.eqLow)), now, 0.02);
    chain.eqMid.gain.setTargetAtTime(Math.max(-15, Math.min(15, newFx.eqMid)), now, 0.02);
    chain.eqHigh.gain.setTargetAtTime(Math.max(-15, Math.min(15, newFx.eqHigh)), now, 0.02);

    // Apply Drive
    chain.driveNode.curve = makeDistortionCurve(newFx.drive);

    // Apply Filter
    chain.filterNode.type = newFx.filterType || 'lowpass';
    chain.filterNode.frequency.setTargetAtTime(Math.max(20, Math.min(20000, newFx.filterCutoff)), now, 0.02);
    chain.filterNode.Q.setTargetAtTime(Math.max(0.1, Math.min(15, newFx.filterResonance)), now, 0.02);

    // Apply Delay
    chain.delayNode.delayTime.setTargetAtTime(Math.max(0.01, Math.min(1.5, newFx.delayTime)), now, 0.02);
    chain.delayFeedback.gain.setTargetAtTime(Math.max(0, Math.min(0.92, newFx.delayFeedback)), now, 0.02);
    chain.delayWet.gain.setTargetAtTime(Math.max(0, Math.min(1.0, newFx.delayMix)), now, 0.02);

    // Apply Reverb
    if (Math.abs(chain.currentFx.reverbDecay - newFx.reverbDecay) > 0.1) {
      try {
        chain.reverbConvolver.buffer = createImpulseResponse(ctx, newFx.reverbDecay, 2.0);
      } catch (err) {
        // Convolver buffer re-assignment
      }
    }
    chain.reverbWet.gain.setTargetAtTime(Math.max(0, Math.min(1.0, newFx.reverbMix)), now, 0.02);
  }

  setTrackVolume(trackId: string, volume: number): void {
    const chain = this.getOrCreateTrackDspChain(trackId);
    if (!chain) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    chain.volumeGain.gain.setTargetAtTime(Math.max(0, Math.min(2.0, volume)), ctx.currentTime, 0.01);
  }

  setTrackPan(trackId: string, pan: number): void {
    const chain = this.getOrCreateTrackDspChain(trackId);
    if (!chain) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    if ('pan' in chain.pannerNode) {
      (chain.pannerNode as StereoPannerNode).pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), ctx.currentTime, 0.01);
    }
  }

  async loadAudio(trackId: string, file: File): Promise<void> {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      this.trackBuffers.set(trackId, audioBuffer);
      this.originalTrackBuffers.set(trackId, audioBuffer);
    } catch (e) {
      console.warn('Failed to decode audio:', e);
    }
  }

  setTrackAudioBuffer(trackId: string, buffer: AudioBuffer, preserveOriginal: boolean = false): void {
    this.trackBuffers.set(trackId, buffer);
    if (!preserveOriginal || !this.originalTrackBuffers.has(trackId)) {
      this.originalTrackBuffers.set(trackId, buffer);
    }
  }

  getTrackAudioBuffer(trackId: string): AudioBuffer | undefined {
    return this.trackBuffers.get(trackId);
  }

  getOriginalTrackAudioBuffer(trackId: string): AudioBuffer | undefined {
    return this.originalTrackBuffers.get(trackId) || this.trackBuffers.get(trackId);
  }

  getAllTrackBuffers(): AudioBuffer[] {
    return Array.from(this.trackBuffers.values());
  }

  playTrack(trackId: string, startTime: number = 0) {
    const ctx = this.getAudioContext();
    if (!ctx || !this.trackBuffers.has(trackId)) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const buffer = this.trackBuffers.get(trackId)!;
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Route through per-track DSP Chain
    const chain = this.getOrCreateTrackDspChain(trackId);
    if (chain) {
      source.connect(chain.inputGain);
    } else if (this.masterGain) {
      source.connect(this.masterGain);
    } else {
      source.connect(ctx.destination);
    }

    source.start(0, startTime);
    this.trackSources.set(trackId, source);
  }

  stopTrack(trackId: string) {
    const source = this.trackSources.get(trackId);
    if (source) {
      try {
        source.stop();
      } catch (e) {
        // already stopped
      }
      this.trackSources.delete(trackId);
    }
  }

  setMasterVolume(volume: number) {
    const ctx = this.getAudioContext();
    if (this.masterGain) {
      this.masterGain.gain.value = volume;
    }
  }
}

export const audioService = new AudioService();
