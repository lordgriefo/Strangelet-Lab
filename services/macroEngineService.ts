import { Track, AutomationPoint, PluginAutomationLaneConfig } from '../types';
import { getDefaultAutomation } from '../lib/audioUtils';

export type MacroEventKind =
  | 'volume'
  | 'pan'
  | 'vst_param'
  | 'vst_bypass'
  | 'track_bypass'
  | 'mute'
  | 'master_gain';

export interface MacroEvent {
  id: string;
  timestampMs: number;
  kind: MacroEventKind;
  trackId?: string;
  trackName?: string;
  label: string;
  value: number;
  min?: number;
  max?: number;
  unit?: string;
  instanceId?: string;
  pluginId?: string;
  pluginName?: string;
  paramId?: string;
}

export interface PerformanceMacro {
  id: string;
  name: string;
  createdAt: number;
  durationMs: number;
  events: MacroEvent[];
  loop: boolean;
  speed: 0.5 | 1 | 2;
  color: string;
}

const STORAGE_KEY = 'strangelet_performance_macros_v1';

const DEFAULT_STARTER_MACROS: PerformanceMacro[] = [
  {
    id: 'macro-acid-drop',
    name: 'Acid Filter Drop',
    createdAt: 1730000000000,
    durationMs: 2400,
    loop: false,
    speed: 1,
    color: '#EC4899',
    events: [
      {
        id: 'ev-acid-1',
        timestampMs: 0,
        kind: 'vst_param',
        trackId: 't2',
        trackName: 'TB-303 Acid Synth',
        pluginId: 'cyberpunk-acid-filter-vst3',
        pluginName: 'Cyberpunk Multi-Filter Box',
        paramId: 'cutoff',
        label: 'CUTOFF FREQ',
        value: 420,
        min: 60,
        max: 18000,
        unit: 'Hz'
      },
      {
        id: 'ev-acid-2',
        timestampMs: 600,
        kind: 'vst_param',
        trackId: 't2',
        trackName: 'TB-303 Acid Synth',
        pluginId: 'cyberpunk-acid-filter-vst3',
        pluginName: 'Cyberpunk Multi-Filter Box',
        paramId: 'cutoff',
        label: 'CUTOFF FREQ',
        value: 2400,
        min: 60,
        max: 18000,
        unit: 'Hz'
      },
      {
        id: 'ev-acid-3',
        timestampMs: 1200,
        kind: 'vst_param',
        trackId: 't2',
        trackName: 'TB-303 Acid Synth',
        pluginId: 'cyberpunk-acid-filter-vst3',
        pluginName: 'Cyberpunk Multi-Filter Box',
        paramId: 'cutoff',
        label: 'CUTOFF FREQ',
        value: 9600,
        min: 60,
        max: 18000,
        unit: 'Hz'
      },
      {
        id: 'ev-acid-4',
        timestampMs: 1800,
        kind: 'volume',
        trackId: 't2',
        trackName: 'TB-303 Acid Synth',
        label: 'Volume',
        value: 0.92,
        min: 0,
        max: 1
      },
      {
        id: 'ev-acid-5',
        timestampMs: 2400,
        kind: 'vst_param',
        trackId: 't2',
        trackName: 'TB-303 Acid Synth',
        pluginId: 'cyberpunk-acid-filter-vst3',
        pluginName: 'Cyberpunk Multi-Filter Box',
        paramId: 'cutoff',
        label: 'CUTOFF FREQ',
        value: 1450,
        min: 60,
        max: 18000,
        unit: 'Hz'
      }
    ]
  },
  {
    id: 'macro-stereo-swell',
    name: 'Stereo Pan Swell',
    createdAt: 1730000001000,
    durationMs: 2000,
    loop: false,
    speed: 1,
    color: '#00F0FF',
    events: [
      { id: 'ev-sw-1', timestampMs: 0, kind: 'pan', trackId: 't1', trackName: 'Track 1', label: 'Pan', value: -0.75, min: -1, max: 1 },
      { id: 'ev-sw-2', timestampMs: 500, kind: 'volume', trackId: 't1', trackName: 'Track 1', label: 'Volume', value: 0.55, min: 0, max: 1 },
      { id: 'ev-sw-3', timestampMs: 1000, kind: 'pan', trackId: 't1', trackName: 'Track 1', label: 'Pan', value: 0.75, min: -1, max: 1 },
      { id: 'ev-sw-4', timestampMs: 1500, kind: 'volume', trackId: 't1', trackName: 'Track 1', label: 'Volume', value: 0.88, min: 0, max: 1 },
      { id: 'ev-sw-5', timestampMs: 2000, kind: 'pan', trackId: 't1', trackName: 'Track 1', label: 'Pan', value: 0, min: -1, max: 1 }
    ]
  }
];

class MacroEngineService {
  private macros: PerformanceMacro[] = [];
  private listeners = new Set<() => void>();

  constructor() {
    this.load();
  }

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.macros = parsed;
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to load performance macros:', err);
    }
    this.macros = DEFAULT_STARTER_MACROS;
    this.save();
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.macros));
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

  public getMacros(): PerformanceMacro[] {
    return [...this.macros];
  }

  public getMidiControlId(macroId: string): string {
    return `macro-trigger-${macroId}`;
  }

  public saveMacro(macro: Omit<PerformanceMacro, 'id' | 'createdAt'>): PerformanceMacro {
    const created: PerformanceMacro = {
      ...macro,
      id: `macro-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now()
    };
    this.macros = [created, ...this.macros];
    this.save();
    return created;
  }

  public updateMacro(id: string, updates: Partial<PerformanceMacro>) {
    this.macros = this.macros.map(m => (m.id === id ? { ...m, ...updates } : m));
    this.save();
  }

  public deleteMacro(id: string) {
    this.macros = this.macros.filter(m => m.id !== id);
    this.save();
  }

  public restoreStarters() {
    const existingIds = new Set(this.macros.map(m => m.id));
    const missing = DEFAULT_STARTER_MACROS.filter(s => !existingIds.has(s.id));
    if (missing.length > 0) {
      this.macros = [...this.macros, ...missing];
      this.save();
    }
  }

  /**
   * Converts a Performance Macro's recorded volume, pan, and VST parameter events
   * into real timeline automation keyframes anchored at playheadPosition.
   */
  public bakeMacroToTracks(
    macro: PerformanceMacro,
    tracks: Track[],
    tempo: number,
    playheadPosition: number
  ): Track[] {
    if (macro.events.length === 0 || tracks.length === 0) return tracks;

    const totalProjectMs = (16 * 4 * (60 / Math.max(40, tempo))) * 1000;
    const anchorNorm = Math.max(0, Math.min(0.95, playheadPosition));
    const updatedMap = new Map<string, Track>(
      tracks.map(t => [t.id, JSON.parse(JSON.stringify(t)) as Track])
    );

    const resolveTrack = (event: MacroEvent): Track | undefined => {
      if (event.trackId && updatedMap.has(event.trackId)) {
        return updatedMap.get(event.trackId);
      }
      if (event.trackName) {
        const byName = Array.from(updatedMap.values()).find(
          t => t.name.toLowerCase() === event.trackName!.toLowerCase()
        );
        if (byName) return byName;
      }
      return Array.from(updatedMap.values())[0];
    };

    macro.events.forEach((ev, idx) => {
      const target = resolveTrack(ev);
      if (!target) return;

      const auto = target.automation || getDefaultAutomation(target.volume, target.pan);
      const timeNorm = Math.max(
        0,
        Math.min(1, anchorNorm + ev.timestampMs / Math.max(1000, totalProjectMs))
      );
      const pt: AutomationPoint = {
        id: `macro-pt-${macro.id}-${idx}-${Date.now()}`,
        time: Number(timeNorm.toFixed(4)),
        value: ev.value,
        curve: 0
      };

      if (ev.kind === 'volume') {
        auto.isExpanded = true;
        auto.volume = {
          ...auto.volume,
          enabled: true,
          visible: true,
          points: [...auto.volume.points, pt].sort((a, b) => a.time - b.time)
        };
      } else if (ev.kind === 'pan') {
        auto.isExpanded = true;
        auto.pan = {
          ...auto.pan,
          enabled: true,
          visible: true,
          points: [...auto.pan.points, pt].sort((a, b) => a.time - b.time)
        };
      } else if (ev.kind === 'vst_param' && ev.pluginId && ev.paramId) {
        const laneKey = `vst_wrapper:${ev.pluginId}:${ev.paramId}`;
        const existingParams = auto.params || {};
        const existingLane: PluginAutomationLaneConfig = existingParams[laneKey] || {
          id: laneKey,
          pluginId: ev.pluginId,
          pluginName: ev.pluginName || ev.pluginId,
          pluginSource: 'vst_wrapper',
          instanceId: ev.instanceId,
          paramId: ev.paramId,
          paramName: ev.label,
          min: ev.min ?? 0,
          max: ev.max ?? 1,
          defaultValue: ev.value,
          unit: ev.unit,
          color: macro.color,
          enabled: true,
          visible: true,
          points: []
        };
        existingLane.enabled = true;
        existingLane.visible = true;
        existingLane.points = [...existingLane.points, pt].sort((a, b) => a.time - b.time);
        auto.isExpanded = true;
        auto.activeParameter = laneKey;
        auto.params = {
          ...existingParams,
          [laneKey]: existingLane
        };
      }

      target.automation = auto;
    });

    return tracks.map(t => updatedMap.get(t.id) || t);
  }
}

export const macroEngineService = new MacroEngineService();
