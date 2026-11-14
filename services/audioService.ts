import { Track } from '../types';

// Simple Audio Service to handle loading and playback
class AudioService {
  private audioContext: AudioContext | null = null;
  private trackBuffers: Map<string, AudioBuffer> = new Map();
  private originalTrackBuffers: Map<string, AudioBuffer> = new Map();
  private trackSources: Map<string, AudioBufferSourceNode> = new Map();
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
    if (this.masterGain) {
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
