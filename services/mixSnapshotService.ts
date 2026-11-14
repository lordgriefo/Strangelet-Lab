import { Track, TrackSend } from '../types';
import { vstWrapperService } from './vstWrapperService';

export interface TrackMixSnapshotState {
  trackId: string;
  trackName: string;
  volume: number;
  pan: number;
  muted: boolean;
  soloed: boolean;
  phaseInverted: boolean;
  isMono: boolean;
  vstBypassed: boolean;
  vsts: string[];
  instrument?: string;
  sends?: TrackSend[];
  automationEnabled?: {
    volume: boolean;
    pan: boolean;
    params: Record<string, boolean>;
  };
}

export interface VstInstanceSnapshotState {
  instanceId: string;
  pluginId: string;
  trackId: string;
  name: string;
  bypassed: boolean;
  paramValues: Record<string, number>;
  selectedPresetId?: string;
}

export interface MixSnapshotSlot {
  slot: number; // 1..8
  name: string;
  savedAt: number;
  masterGain: number;
  tempo: number;
  tracks: TrackMixSnapshotState[];
  vstInstances: VstInstanceSnapshotState[];
}

export interface MixABComparisonState {
  slotA: number | null;
  slotB: number | null;
  activeSide: 'A' | 'B';
}

export interface MixSnapshotDiffSummary {
  volumeDiffs: number;
  panDiffs: number;
  fxDiffs: number;
  masterDiff: boolean;
  totalDiffs: number;
}

const STORAGE_SLOTS_KEY = 'strangelet_mix_snapshots_v1';
const STORAGE_AB_KEY = 'strangelet_mix_snapshots_ab_v1';

class MixSnapshotService {
  private slots = new Map<number, MixSnapshotSlot>();
  private abState: MixABComparisonState = {
    slotA: 1,
    slotB: 2,
    activeSide: 'A'
  };
  private listeners = new Set<() => void>();

  constructor() {
    this.load();
  }

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_SLOTS_KEY);
      if (raw) {
        const parsed: MixSnapshotSlot[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(s => {
            if (s && typeof s.slot === 'number') {
              this.slots.set(s.slot, s);
            }
          });
        }
      }
      const rawAb = localStorage.getItem(STORAGE_AB_KEY);
      if (rawAb) {
        const parsedAb = JSON.parse(rawAb);
        if (parsedAb && typeof parsedAb === 'object') {
          this.abState = {
            slotA: typeof parsedAb.slotA === 'number' ? parsedAb.slotA : null,
            slotB: typeof parsedAb.slotB === 'number' ? parsedAb.slotB : null,
            activeSide: parsedAb.activeSide === 'B' ? 'B' : 'A'
          };
        }
      }
    } catch (err) {
      console.warn('Failed to load mix snapshots:', err);
    }
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_SLOTS_KEY, JSON.stringify(Array.from(this.slots.values())));
      localStorage.setItem(STORAGE_AB_KEY, JSON.stringify(this.abState));
    } catch {}
    this.notify();
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  public getAllSlots(): Record<number, MixSnapshotSlot | undefined> {
    const out: Record<number, MixSnapshotSlot | undefined> = {};
    for (let i = 1; i <= 8; i++) {
      out[i] = this.slots.get(i);
    }
    return out;
  }

  public getSlot(slot: number): MixSnapshotSlot | undefined {
    return this.slots.get(slot);
  }

  public getABState(): MixABComparisonState {
    return { ...this.abState };
  }

  public setABSlot(side: 'A' | 'B', slot: number | null) {
    if (side === 'A') this.abState.slotA = slot;
    else this.abState.slotB = slot;
    this.save();
  }

  public setActiveSide(side: 'A' | 'B') {
    this.abState.activeSide = side;
    this.save();
  }

  public saveToSlot(
    slot: number,
    tracks: Track[],
    masterGain: number,
    tempo: number,
    customName?: string
  ): MixSnapshotSlot {
    const existing = this.slots.get(slot);
    const activeInstances = vstWrapperService.getAllInstances();

    const snapshot: MixSnapshotSlot = {
      slot,
      name: customName?.trim() || existing?.name || `Mix ${slot}`,
      savedAt: Date.now(),
      masterGain,
      tempo,
      tracks: tracks.map(t => {
        const paramEnabled: Record<string, boolean> = {};
        if (t.automation?.params) {
          Object.entries(t.automation.params).forEach(([k, lane]) => {
            paramEnabled[k] = !!lane.enabled;
          });
        }
        return {
          trackId: t.id,
          trackName: t.name,
          volume: t.volume,
          pan: t.pan,
          muted: t.muted,
          soloed: t.soloed,
          phaseInverted: t.phaseInverted,
          isMono: t.isMono,
          vstBypassed: t.vstBypassed,
          vsts: [...(t.vsts || [])],
          instrument: t.instrument,
          sends: t.sends ? t.sends.map(s => ({ ...s })) : undefined,
          automationEnabled: {
            volume: !!t.automation?.volume?.enabled,
            pan: !!t.automation?.pan?.enabled,
            params: paramEnabled
          }
        };
      }),
      vstInstances: activeInstances.map(inst => ({
        instanceId: inst.instanceId,
        pluginId: inst.pluginId,
        trackId: inst.trackId,
        name: inst.name,
        bypassed: inst.bypassed,
        paramValues: { ...inst.paramValues },
        selectedPresetId: inst.selectedPresetId
      }))
    };

    this.slots.set(slot, snapshot);

    // Automatically bind first two captured slots to A/B slots if unset
    if (this.abState.slotA === null || !this.slots.has(this.abState.slotA)) {
      this.abState.slotA = slot;
      this.abState.activeSide = 'A';
    } else if (
      (this.abState.slotB === null || !this.slots.has(this.abState.slotB)) &&
      this.abState.slotA !== slot
    ) {
      this.abState.slotB = slot;
    }

    this.save();
    return snapshot;
  }

  public renameSlot(slot: number, name: string) {
    const existing = this.slots.get(slot);
    if (!existing) return;
    this.slots.set(slot, { ...existing, name: name.trim() || `Mix ${slot}` });
    this.save();
  }

  public clearSlot(slot: number) {
    this.slots.delete(slot);
    if (this.abState.slotA === slot) this.abState.slotA = null;
    if (this.abState.slotB === slot) this.abState.slotB = null;
    this.save();
  }

  public applySnapshot(
    slot: number,
    currentTracks: Track[]
  ): { tracks: Track[]; masterGain: number; snapshot: MixSnapshotSlot } | null {
    const snap = this.slots.get(slot);
    if (!snap) return null;

    // Restore active VST wrapper plugin parameters & bypasses
    if (snap.vstInstances.length > 0) {
      vstWrapperService.applyInstanceSnapshots(snap.vstInstances);
    }

    const updatedTracks = currentTracks.map((trk, idx) => {
      const matched =
        snap.tracks.find(st => st.trackId === trk.id) ||
        snap.tracks.find(st => st.trackName.toLowerCase() === trk.name.toLowerCase()) ||
        snap.tracks[idx];
      if (!matched) return trk;

      let nextAutomation = trk.automation;
      if (nextAutomation && matched.automationEnabled) {
        const nextParams = nextAutomation.params ? { ...nextAutomation.params } : undefined;
        if (nextParams && matched.automationEnabled.params) {
          Object.entries(matched.automationEnabled.params).forEach(([k, en]) => {
            if (nextParams[k]) {
              nextParams[k] = { ...nextParams[k], enabled: en };
            }
          });
        }
        nextAutomation = {
          ...nextAutomation,
          volume: { ...nextAutomation.volume, enabled: matched.automationEnabled.volume },
          pan: { ...nextAutomation.pan, enabled: matched.automationEnabled.pan },
          params: nextParams
        };
      }

      return {
        ...trk,
        volume: matched.volume,
        pan: matched.pan,
        muted: matched.muted,
        soloed: matched.soloed,
        phaseInverted: matched.phaseInverted,
        isMono: matched.isMono,
        vstBypassed: matched.vstBypassed,
        vsts: matched.vsts ? [...matched.vsts] : trk.vsts,
        instrument: matched.instrument ?? trk.instrument,
        sends: matched.sends ? matched.sends.map(s => ({ ...s })) : trk.sends,
        automation: nextAutomation
      };
    });

    if (this.abState.slotA === slot) {
      this.abState.activeSide = 'A';
      this.save();
    } else if (this.abState.slotB === slot) {
      this.abState.activeSide = 'B';
      this.save();
    }

    return {
      tracks: updatedTracks,
      masterGain: snap.masterGain,
      snapshot: snap
    };
  }

  public diffSnapshots(a?: MixSnapshotSlot, b?: MixSnapshotSlot): MixSnapshotDiffSummary | null {
    if (!a || !b) return null;
    let volumeDiffs = 0;
    let panDiffs = 0;
    let fxDiffs = 0;

    a.tracks.forEach((ta, idx) => {
      const tb = b.tracks.find(x => x.trackId === ta.trackId) || b.tracks[idx];
      if (!tb) return;
      if (Math.abs(ta.volume - tb.volume) > 0.01) volumeDiffs++;
      if (Math.abs(ta.pan - tb.pan) > 0.02) panDiffs++;
      if (
        ta.vstBypassed !== tb.vstBypassed ||
        ta.muted !== tb.muted ||
        ta.soloed !== tb.soloed ||
        ta.phaseInverted !== tb.phaseInverted ||
        ta.isMono !== tb.isMono ||
        JSON.stringify(ta.vsts) !== JSON.stringify(tb.vsts)
      ) {
        fxDiffs++;
      }
    });

    // Also count VST parameter diffs
    a.vstInstances.forEach(ia => {
      const ib = b.vstInstances.find(x => x.instanceId === ia.instanceId);
      if (!ib) return;
      if (
        ia.bypassed !== ib.bypassed ||
        JSON.stringify(ia.paramValues) !== JSON.stringify(ib.paramValues)
      ) {
        fxDiffs++;
      }
    });

    const masterDiff = Math.abs(a.masterGain - b.masterGain) > 0.01;
    const totalDiffs = volumeDiffs + panDiffs + fxDiffs + (masterDiff ? 1 : 0);

    return { volumeDiffs, panDiffs, fxDiffs, masterDiff, totalDiffs };
  }
}

export const mixSnapshotService = new MixSnapshotService();
