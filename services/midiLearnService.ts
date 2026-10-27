import { Track } from '../types';
import { playLaserBeamSound, playColliderInjectionSound } from '../lib/laserSound';

export interface MidiControlMapping {
  id: string; // e.g. `${trackId}-volume` or `${trackId}-pan`
  targetType: 'volume' | 'pan';
  trackId: string;
  trackName: string;
  channel: number; // 1-16 or -1 (any channel)
  ccNumber: number; // 0-127
  controllerName?: string;
  createdAt: number;
}

export interface MidiLearningTarget {
  id: string;
  targetType: 'volume' | 'pan';
  trackId: string;
  trackName: string;
}

export interface MidiDeviceStatus {
  isSupported: boolean;
  isConnected: boolean;
  devices: { id: string; name: string; manufacturer?: string; state: string }[];
  lastReceivedEvent?: {
    channel: number;
    ccNumber: number;
    value: number;
    timestamp: number;
  };
}

const STORAGE_KEY = 'strangelet_midi_mappings_v1';

class MidiLearnService {
  private mappings = new Map<string, MidiControlMapping>();
  private learningTarget: MidiLearningTarget | null = null;
  private midiAccess: any = null;
  private isInitialized = false;
  private changeListeners = new Set<(mappings: MidiControlMapping[]) => void>();
  private statusListeners = new Set<(status: MidiDeviceStatus) => void>();
  private valueChangeListeners = new Set<(mapping: MidiControlMapping, normalizedValue: number) => void>();

  private status: MidiDeviceStatus = {
    isSupported: false,
    isConnected: false,
    devices: []
  };

  constructor() {
    this.loadStoredMappings();
    this.initWebMidi();
  }

  private loadStoredMappings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: MidiControlMapping[] = JSON.parse(raw);
        parsed.forEach(m => this.mappings.set(m.id, m));
      }
    } catch (e) {
      console.warn('Failed to load stored MIDI mappings:', e);
    }
  }

  private saveMappings() {
    try {
      const arr = Array.from(this.mappings.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
      this.notifyChange();
    } catch (e) {
      console.warn('Failed to save MIDI mappings:', e);
    }
  }

  public async initWebMidi(): Promise<boolean> {
    if (typeof window === 'undefined' || !navigator) return false;

    if (!('requestMIDIAccess' in navigator)) {
      this.status.isSupported = false;
      this.notifyStatus();
      return false;
    }

    this.status.isSupported = true;

    try {
      // @ts-ignore
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      this.isInitialized = true;
      this.updateConnectedDevices();

      // Listen for input device connect/disconnect
      this.midiAccess.onstatechange = () => {
        this.updateConnectedDevices();
      };

      // Attach message listeners to all inputs
      this.attachInputListeners();
      return true;
    } catch (err) {
      console.warn('Web MIDI permission denied or unavailable:', err);
      this.updateConnectedDevices();
      return false;
    }
  }

  private updateConnectedDevices() {
    if (!this.midiAccess) {
      this.status.isConnected = false;
      this.status.devices = [];
      this.notifyStatus();
      return;
    }

    const devices: MidiDeviceStatus['devices'] = [];
    const inputs = this.midiAccess.inputs.values();
    for (const input of inputs) {
      devices.push({
        id: input.id,
        name: input.name || 'Generic MIDI Device',
        manufacturer: input.manufacturer || 'Unknown',
        state: input.state
      });
    }

    this.status.devices = devices;
    this.status.isConnected = devices.length > 0;
    this.attachInputListeners();
    this.notifyStatus();
  }

  private attachInputListeners() {
    if (!this.midiAccess) return;
    const inputs = this.midiAccess.inputs.values();
    for (const input of inputs) {
      input.onmidimessage = (event: any) => this.handleMidiMessage(event, input.name);
    }
  }

  /**
   * Core MIDI message processor
   */
  public handleMidiMessage(event: { data: Uint8Array }, deviceName: string = 'Hardware Controller') {
    const data = event.data;
    if (!data || data.length < 3) return;

    const status = data[0];
    const data1 = data[1]; // CC Number
    const data2 = data[2]; // CC Value (0-127)

    // Check if it's a Control Change (CC) message: 0xB0 - 0xBF (Channels 1-16)
    if ((status & 0xF0) === 0xB0) {
      const channel = (status & 0x0F) + 1;
      const ccNumber = data1;
      const value = data2;

      this.status.lastReceivedEvent = {
        channel,
        ccNumber,
        value,
        timestamp: Date.now()
      };
      this.notifyStatus();

      // Case 1: In MIDI Learn Mode - waiting for user to twist knob/fader
      if (this.learningTarget) {
        this.assignMapping({
          id: this.learningTarget.id,
          targetType: this.learningTarget.targetType,
          trackId: this.learningTarget.trackId,
          trackName: this.learningTarget.trackName,
          channel,
          ccNumber,
          controllerName: deviceName,
          createdAt: Date.now()
        });

        playColliderInjectionSound();
        this.learningTarget = null;
        return;
      }

      // Case 2: Standard Control Execution - look up mapped target
      for (const mapping of this.mappings.values()) {
        if (mapping.ccNumber === ccNumber && (mapping.channel === -1 || mapping.channel === channel)) {
          let normalizedValue: number;
          if (mapping.targetType === 'volume') {
            // Map 0-127 to 0.0-1.0 linear volume
            normalizedValue = Math.max(0, Math.min(1, value / 127));
          } else {
            // Map 0-127 to -1.0 to +1.0 stereo pan
            normalizedValue = Math.max(-1, Math.min(1, (value / 63.5) - 1.0));
          }

          this.valueChangeListeners.forEach(listener => listener(mapping, normalizedValue));
        }
      }
    }
  }

  /**
   * Virtual MIDI message simulation for testing without physical hardware
   */
  public simulateMidiMessage(channel: number, ccNumber: number, value: number) {
    const status = 0xB0 | ((channel - 1) & 0x0F);
    const data = new Uint8Array([status, ccNumber, value]);
    this.handleMidiMessage({ data }, 'Virtual Hardware Rack');
  }

  public startLearning(target: MidiLearningTarget) {
    this.learningTarget = target;
    playLaserBeamSound('laser_select');
    this.notifyChange();
  }

  public cancelLearning() {
    this.learningTarget = null;
    this.notifyChange();
  }

  public getLearningTarget(): MidiLearningTarget | null {
    return this.learningTarget;
  }

  public assignMapping(mapping: MidiControlMapping) {
    this.mappings.set(mapping.id, mapping);
    this.saveMappings();
  }

  public removeMapping(id: string) {
    this.mappings.delete(id);
    this.saveMappings();
  }

  public clearAllMappings() {
    this.mappings.clear();
    this.saveMappings();
    playLaserBeamSound('laser_select');
  }

  public getMappingForTarget(id: string): MidiControlMapping | undefined {
    return this.mappings.get(id);
  }

  public getAllMappings(): MidiControlMapping[] {
    return Array.from(this.mappings.values());
  }

  public getStatus(): MidiDeviceStatus {
    return { ...this.status };
  }

  /**
   * Auto-maps first 8 tracks to standard MIDI CCs
   * Track 1-8 Volume -> CC 1 to 8
   * Track 1-8 Pan -> CC 16 to 23
   */
  public autoMap8Tracks(tracks: Track[]) {
    tracks.slice(0, 8).forEach((trk, idx) => {
      // Volume CC 1-8
      this.mappings.set(`${trk.id}-volume`, {
        id: `${trk.id}-volume`,
        targetType: 'volume',
        trackId: trk.id,
        trackName: trk.name,
        channel: 1,
        ccNumber: idx + 1,
        controllerName: 'Auto Standard Fader',
        createdAt: Date.now()
      });

      // Pan CC 16-23
      this.mappings.set(`${trk.id}-pan`, {
        id: `${trk.id}-pan`,
        targetType: 'pan',
        trackId: trk.id,
        trackName: trk.name,
        channel: 1,
        ccNumber: idx + 16,
        controllerName: 'Auto Standard Knob',
        createdAt: Date.now()
      });
    });

    this.saveMappings();
    playColliderInjectionSound();
  }

  public subscribeChange(listener: (mappings: MidiControlMapping[]) => void): () => void {
    this.changeListeners.add(listener);
    listener(this.getAllMappings());
    return () => this.changeListeners.delete(listener);
  }

  public subscribeStatus(listener: (status: MidiDeviceStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.getStatus());
    return () => this.statusListeners.delete(listener);
  }

  public onControlValueChange(listener: (mapping: MidiControlMapping, normalizedValue: number) => void): () => void {
    this.valueChangeListeners.add(listener);
    return () => this.valueChangeListeners.delete(listener);
  }

  private notifyChange() {
    const list = this.getAllMappings();
    this.changeListeners.forEach(fn => fn(list));
  }

  private notifyStatus() {
    const s = this.getStatus();
    this.statusListeners.forEach(fn => fn(s));
  }
}

export const midiLearnService = new MidiLearnService();
