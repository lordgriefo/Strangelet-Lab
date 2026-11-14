import { Track } from '../types';
import { playLaserBeamSound, playColliderInjectionSound } from '../lib/laserSound';

export type MidiControlTargetType = 'volume' | 'pan' | 'fader' | 'knob' | 'button' | 'toggle';

export interface MidiControlMapping {
  id: string; // e.g. `${trackId}-volume`, `master-gain`, `transport-play`, or DOM control id
  targetType: MidiControlTargetType;
  controlLabel?: string; // Human-readable UI control label
  trackId?: string;
  trackName?: string;
  channel: number; // 1-16 or -1 (any channel)
  ccNumber: number; // 0-127
  minValue?: number;
  maxValue?: number;
  domSelector?: string;
  controllerName?: string;
  createdAt: number;
}

export interface MidiLearningTarget {
  id: string;
  targetType: MidiControlTargetType;
  controlLabel?: string;
  trackId?: string;
  trackName?: string;
  minValue?: number;
  maxValue?: number;
  domSelector?: string;
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

export type MidiControlHandler = (
  normalizedValue: number,
  rawCcValue: number,
  mapping: MidiControlMapping
) => void;

const STORAGE_KEY = 'strangelet_midi_mappings_v1';

class MidiLearnService {
  private mappings = new Map<string, MidiControlMapping>();
  private learningTarget: MidiLearningTarget | null = null;
  private isLearnModeActive: boolean = false;
  private midiAccess: any = null;
  private changeListeners = new Set<(mappings: MidiControlMapping[]) => void>();
  private statusListeners = new Set<(status: MidiDeviceStatus) => void>();
  private learnModeListeners = new Set<(active: boolean, learningTarget: MidiLearningTarget | null) => void>();
  private valueChangeListeners = new Set<(mapping: MidiControlMapping, normalizedValue: number) => void>();
  private rawMessageListeners = new Set<(channel: number, ccNumber: number, value: number, deviceName?: string) => void>();
  private registeredControls = new Map<string, MidiControlHandler>();
  private lastCcValues = new Map<string, number>();

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
    const data1 = data[1]; // CC Number or Note
    const data2 = data[2]; // CC Value / Velocity (0-127)

    // Check if it's a Control Change (CC) message: 0xB0 - 0xBF (Channels 1-16)
    if ((status & 0xF0) === 0xB0) {
      const channel = (status & 0x0F) + 1;
      const ccNumber = data1;
      const value = data2;

      const ccKey = `${channel}:${ccNumber}`;
      const prevValue = this.lastCcValues.get(ccKey) ?? 0;
      this.lastCcValues.set(ccKey, value);

      this.status.lastReceivedEvent = {
        channel,
        ccNumber,
        value,
        timestamp: Date.now()
      };
      this.notifyStatus();
      this.rawMessageListeners.forEach(listener => listener(channel, ccNumber, value, deviceName));

      // Case 1: Waiting for user to touch a hardware knob/fader to bind selected UI control
      if (this.learningTarget) {
        const target = this.learningTarget;
        this.learningTarget = null;
        this.assignMapping({
          id: target.id,
          targetType: target.targetType,
          controlLabel: target.controlLabel || target.trackName || target.id,
          trackId: target.trackId,
          trackName: target.trackName,
          minValue: target.minValue,
          maxValue: target.maxValue,
          domSelector: target.domSelector,
          channel,
          ccNumber,
          controllerName: deviceName,
          createdAt: Date.now()
        });

        playColliderInjectionSound();
        this.notifyLearnMode();
        return;
      }

      // Case 2: Standard Control Execution - look up mapped target(s)
      for (const mapping of this.mappings.values()) {
        if (mapping.ccNumber === ccNumber && (mapping.channel === -1 || mapping.channel === channel)) {
          if (mapping.targetType === 'button' || mapping.targetType === 'toggle') {
            // Rising edge threshold trigger (prevents rapid repeat firing when turning a CC dial above 64)
            const isRisingEdge = prevValue < 64 && value >= 64;
            if (!isRisingEdge) continue;

            const directHandler = this.registeredControls.get(mapping.id);
            if (directHandler) {
              directHandler(1, value, mapping);
            }
            this.valueChangeListeners.forEach(listener => listener(mapping, 1));
            continue;
          }

          let normalizedValue: number;
          if (mapping.targetType === 'pan') {
            // Map 0-127 to -1.0 to +1.0 stereo pan (64 center)
            normalizedValue = value === 64 ? 0 : Math.max(-1, Math.min(1, (value / 63.5) - 1.0));
          } else {
            const minV = mapping.minValue ?? 0;
            const maxV = mapping.maxValue ?? 1;
            const t = Math.max(0, Math.min(1, value / 127));
            normalizedValue = minV + t * (maxV - minV);
          }

          const directHandler = this.registeredControls.get(mapping.id);
          if (directHandler) {
            directHandler(normalizedValue, value, mapping);
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

  public getLearnModeActive(): boolean {
    return this.isLearnModeActive;
  }

  public setLearnModeActive(active: boolean) {
    this.isLearnModeActive = active;
    if (!active) {
      this.learningTarget = null;
    }
    this.notifyLearnMode();
    this.notifyChange();
  }

  public toggleLearnMode(): boolean {
    const next = !this.isLearnModeActive;
    this.setLearnModeActive(next);
    playLaserBeamSound('laser_select');
    return next;
  }

  public startLearning(target: MidiLearningTarget) {
    this.isLearnModeActive = true;
    this.learningTarget = target;
    playLaserBeamSound('laser_select');
    this.notifyLearnMode();
    this.notifyChange();
  }

  public cancelLearning() {
    this.learningTarget = null;
    this.notifyLearnMode();
    this.notifyChange();
  }

  public getLearningTarget(): MidiLearningTarget | null {
    return this.learningTarget;
  }

  public registerControl(id: string, handler: MidiControlHandler): () => void {
    this.registeredControls.set(id, handler);
    return () => {
      if (this.registeredControls.get(id) === handler) {
        this.registeredControls.delete(id);
      }
    };
  }

  public hasRegisteredControl(id: string): boolean {
    return this.registeredControls.has(id);
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
        controlLabel: `${trk.name} Volume Fader`,
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
        controlLabel: `${trk.name} Pan Knob`,
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

  public subscribeLearnMode(listener: (active: boolean, learningTarget: MidiLearningTarget | null) => void): () => void {
    this.learnModeListeners.add(listener);
    listener(this.isLearnModeActive, this.learningTarget);
    return () => this.learnModeListeners.delete(listener);
  }

  public onControlValueChange(listener: (mapping: MidiControlMapping, normalizedValue: number) => void): () => void {
    this.valueChangeListeners.add(listener);
    return () => this.valueChangeListeners.delete(listener);
  }

  public onRawMidiMessage(listener: (channel: number, ccNumber: number, value: number, deviceName?: string) => void): () => void {
    this.rawMessageListeners.add(listener);
    return () => this.rawMessageListeners.delete(listener);
  }

  private notifyChange() {
    const list = this.getAllMappings();
    this.changeListeners.forEach(fn => fn(list));
  }

  private notifyStatus() {
    const s = this.getStatus();
    this.statusListeners.forEach(fn => fn(s));
  }

  private notifyLearnMode() {
    this.learnModeListeners.forEach(fn => fn(this.isLearnModeActive, this.learningTarget));
  }
}

export const midiLearnService = new MidiLearnService();
