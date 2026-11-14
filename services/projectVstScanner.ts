import { Track, PluginAutomationLaneConfig, AutomationLaneConfig } from '../types';
import { FAUST_DSP_PRESET_TOYS } from './faustDspService';
import { vstWrapperService, VstActiveInstance, VstPluginManifest } from './vstWrapperService';

export interface ScannedPluginParam {
  paramId: string;
  name: string;
  min: number;
  max: number;
  defaultValue: number;
  currentValue: number;
  unit: string;
  laneId: string; // Deterministic ID inside track.automation.params
  color: string;
}

export interface ScannedProjectPlugin {
  uid: string;
  trackId: string;
  trackName: string;
  trackColor: string;
  pluginId: string;
  pluginName: string;
  source: 'faust' | 'vst_wrapper' | 'classic_vst' | 'vsti';
  formatBadge: string; // 'FAUST DSP' | 'VST3' | 'CLAP' | 'AU' | 'LV2' | 'DAW FX' | 'VSTi'
  bypassed: boolean;
  instanceId?: string;
  manifestId?: string;
  accentColor: string;
  parameters: ScannedPluginParam[];
}

export interface UnifiedAutomationLaneEntry {
  key: string;
  track: Track;
  paramKey: string; // 'volume' | 'pan' | PluginAutomationLaneConfig.id
  kind: 'volume' | 'pan' | 'plugin';
  label: string;
  pluginName: string;
  formatBadge: string;
  min: number;
  max: number;
  defaultValue: number;
  unit: string;
  color: string;
  lane: AutomationLaneConfig;
  pluginLane?: PluginAutomationLaneConfig;
}

const LANE_PALETTE = [
  '#EC4899', // Magenta
  '#10B981', // Emerald
  '#A855F7', // Purple
  '#38BDF8', // Sky
  '#FFD700', // Gold
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16'  // Lime
];

function pickColorForKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return LANE_PALETTE[hash % LANE_PALETTE.length];
}

const CLASSIC_VST_PARAMS: Record<string, { id: string; name: string; min: number; max: number; defaultValue: number; unit: string }[]> = {
  reverb: [
    { id: 'decay_time', name: 'Decay Time', min: 0.2, max: 12.0, defaultValue: 2.8, unit: 's' },
    { id: 'pre_delay', name: 'Pre-Delay', min: 0, max: 200, defaultValue: 28, unit: 'ms' },
    { id: 'damping', name: 'HF Damping', min: 800, max: 16000, defaultValue: 5400, unit: 'Hz' },
    { id: 'mix', name: 'Wet / Dry Mix', min: 0, max: 100, defaultValue: 35, unit: '%' }
  ],
  delay: [
    { id: 'delay_time', name: 'Delay Time', min: 10, max: 1500, defaultValue: 375, unit: 'ms' },
    { id: 'feedback', name: 'Feedback', min: 0, max: 95, defaultValue: 48, unit: '%' },
    { id: 'tone', name: 'Echo Tone', min: 400, max: 12000, defaultValue: 3600, unit: 'Hz' },
    { id: 'mix', name: 'Dry / Wet', min: 0, max: 100, defaultValue: 40, unit: '%' }
  ],
  distortion: [
    { id: 'drive', name: 'Drive Amount', min: 0, max: 100, defaultValue: 55, unit: '%' },
    { id: 'tone', name: 'Bite Cutoff', min: 500, max: 14000, defaultValue: 4200, unit: 'Hz' },
    { id: 'output', name: 'Output Trim', min: -24, max: 12, defaultValue: -2, unit: 'dB' },
    { id: 'mix', name: 'Parallel Blend', min: 0, max: 100, defaultValue: 80, unit: '%' }
  ],
  compressor: [
    { id: 'threshold', name: 'Threshold', min: -48, max: 0, defaultValue: -16, unit: 'dB' },
    { id: 'ratio', name: 'Ratio', min: 1, max: 20, defaultValue: 4, unit: ':1' },
    { id: 'attack', name: 'Attack', min: 0.5, max: 100, defaultValue: 12, unit: 'ms' },
    { id: 'makeup', name: 'Makeup Gain', min: -6, max: 18, defaultValue: 3, unit: 'dB' }
  ],
  'tape saturator': [
    { id: 'flux', name: 'Tape Flux', min: 0, max: 100, defaultValue: 45, unit: '%' },
    { id: 'flutter', name: 'Wow / Flutter', min: 0, max: 100, defaultValue: 22, unit: '%' },
    { id: 'hf_loss', name: 'Head Roll-Off', min: 2000, max: 18000, defaultValue: 8200, unit: 'Hz' },
    { id: 'mix', name: 'Saturation Mix', min: 0, max: 100, defaultValue: 75, unit: '%' }
  ]
};

const VSTI_DEFAULT_PARAMS = [
  { id: 'cutoff', name: 'Filter Cutoff', min: 60, max: 16000, defaultValue: 3800, unit: 'Hz' },
  { id: 'resonance', name: 'Resonance', min: 0.5, max: 16, defaultValue: 2.2, unit: 'Q' },
  { id: 'attack', name: 'Amp Attack', min: 1, max: 2000, defaultValue: 18, unit: 'ms' },
  { id: 'release', name: 'Amp Release', min: 20, max: 4000, defaultValue: 420, unit: 'ms' },
  { id: 'detune', name: 'Voice Detune', min: 0, max: 100, defaultValue: 15, unit: '%' }
];

const CUSTOM_FAUST_FALLBACK_PARAMS = [
  { id: 'cutoff', name: 'Cutoff Freq', min: 60, max: 16000, defaultValue: 2400, unit: 'Hz' },
  { id: 'drive', name: 'DSP Drive', min: 1, max: 10, defaultValue: 2.5, unit: 'x' },
  { id: 'feedback', name: 'Feedback', min: 0, max: 95, defaultValue: 45, unit: '%' },
  { id: 'mix', name: 'Dry / Wet', min: 0, max: 1, defaultValue: 0.65, unit: '' }
];

function stripPrefix(raw: string): { cleanName: string; hintSource?: ScannedProjectPlugin['source']; formatBadge?: string } {
  const trimmed = raw.trim();
  if (trimmed.startsWith('Faust:')) {
    return { cleanName: trimmed.replace(/^Faust:\s*/i, '').trim(), hintSource: 'faust', formatBadge: 'FAUST DSP' };
  }
  const bracketMatch = trimmed.match(/^\[(VST3|CLAP|AU|LV2)\]\s*(.+)$/i);
  if (bracketMatch) {
    return { cleanName: bracketMatch[2].trim(), hintSource: 'vst_wrapper', formatBadge: bracketMatch[1].toUpperCase() };
  }
  if (trimmed.startsWith('VSTi:')) {
    return { cleanName: trimmed.replace(/^VSTi:\s*/i, '').trim(), hintSource: 'vsti', formatBadge: 'VSTi' };
  }
  return { cleanName: trimmed };
}

function buildParamsFromManifest(
  trackId: string,
  pluginId: string,
  source: ScannedProjectPlugin['source'],
  manifest: VstPluginManifest,
  instance?: VstActiveInstance
): ScannedPluginParam[] {
  return manifest.parameters.map(p => {
    const laneId = `${source}:${pluginId}:${p.id}`;
    return {
      paramId: p.id,
      name: p.name,
      min: p.min,
      max: p.max,
      defaultValue: p.defaultValue,
      currentValue: instance?.paramValues[p.id] ?? p.defaultValue,
      unit: p.unit || '',
      laneId,
      color: pickColorForKey(`${trackId}:${laneId}`)
    };
  });
}

/**
 * Scans all tracks, VST wrapper instances, Faust DSP toys, and track instruments
 * to produce a complete project-wide inventory of used plugins and automatable parameters.
 */
export function scanProjectPlugins(tracks: Track[]): ScannedProjectPlugin[] {
  const results: ScannedProjectPlugin[] = [];
  const allManifests = vstWrapperService.getAllManifests();
  const allInstances = vstWrapperService.getAllInstances();

  tracks.forEach(track => {
    const seenKeysOnTrack = new Set<string>();
    const trackInstances = allInstances.filter(inst => inst.trackId === track.id);

    // 1. Add active VST Wrapper Host instances on this track first (live parameter values)
    trackInstances.forEach(inst => {
      const manifest = vstWrapperService.getManifest(inst.pluginId);
      if (!manifest) return;
      const dedupeKey = `wrapper:${manifest.name.toLowerCase()}`;
      seenKeysOnTrack.add(dedupeKey);

      results.push({
        uid: `${track.id}::${inst.instanceId}`,
        trackId: track.id,
        trackName: track.name,
        trackColor: track.color,
        pluginId: manifest.id,
        pluginName: manifest.name,
        source: 'vst_wrapper',
        formatBadge: manifest.format,
        bypassed: track.vstBypassed || inst.bypassed,
        instanceId: inst.instanceId,
        manifestId: manifest.id,
        accentColor: '#F59E0B',
        parameters: buildParamsFromManifest(track.id, manifest.id, 'vst_wrapper', manifest, inst)
      });
    });

    // 2. Scan track.vsts list (Faust Toys, [VST3]/[CLAP]/[AU] inserts, VSTi, Classic DAW inserts)
    (track.vsts || []).forEach((rawVst, idx) => {
      const { cleanName, hintSource, formatBadge } = stripPrefix(rawVst);
      const lower = cleanName.toLowerCase();

      // Skip if already represented by a live wrapper instance on this track
      if (seenKeysOnTrack.has(`wrapper:${lower}`)) return;

      // Match Faust DSP Preset Toy
      const faustToy = FAUST_DSP_PRESET_TOYS.find(
        t => t.name.toLowerCase() === lower || lower.includes(t.name.toLowerCase()) || t.id.toLowerCase() === lower
      );
      if (faustToy || hintSource === 'faust') {
        const pluginId = faustToy?.id || `faust-custom-${lower.replace(/[^a-z0-9]+/g, '-')}`;
        if (seenKeysOnTrack.has(`faust:${pluginId}`)) return;
        seenKeysOnTrack.add(`faust:${pluginId}`);

        const rawParams = faustToy
          ? faustToy.params.filter(p => p.type !== 'button')
          : CUSTOM_FAUST_FALLBACK_PARAMS.map(p => ({ ...p, value: p.defaultValue }));

        results.push({
          uid: `${track.id}::${pluginId}::${idx}`,
          trackId: track.id,
          trackName: track.name,
          trackColor: track.color,
          pluginId,
          pluginName: faustToy?.name || cleanName,
          source: 'faust',
          formatBadge: 'FAUST DSP',
          bypassed: track.vstBypassed,
          accentColor: faustToy?.color || '#00F0FF',
          parameters: rawParams.map(p => {
            const laneId = `faust:${pluginId}:${p.id}`;
            return {
              paramId: p.id,
              name: p.name,
              min: p.min,
              max: p.max,
              defaultValue: p.defaultValue,
              currentValue: p.value ?? p.defaultValue,
              unit: p.unit || '',
              laneId,
              color: pickColorForKey(`${track.id}:${laneId}`)
            };
          })
        });
        return;
      }

      // Match VST Wrapper Manifest by name
      const manifest = allManifests.find(m => m.name.toLowerCase() === lower || lower.includes(m.name.toLowerCase()));
      if (manifest || hintSource === 'vst_wrapper') {
        const resolvedManifest = manifest || allManifests[0];
        if (!resolvedManifest) return;
        if (seenKeysOnTrack.has(`wrapper:${resolvedManifest.name.toLowerCase()}`)) return;
        seenKeysOnTrack.add(`wrapper:${resolvedManifest.name.toLowerCase()}`);

        results.push({
          uid: `${track.id}::${resolvedManifest.id}::${idx}`,
          trackId: track.id,
          trackName: track.name,
          trackColor: track.color,
          pluginId: resolvedManifest.id,
          pluginName: resolvedManifest.name,
          source: 'vst_wrapper',
          formatBadge: formatBadge || resolvedManifest.format,
          bypassed: track.vstBypassed,
          manifestId: resolvedManifest.id,
          accentColor: '#F59E0B',
          parameters: buildParamsFromManifest(track.id, resolvedManifest.id, 'vst_wrapper', resolvedManifest)
        });
        return;
      }

      // Match Classic VST insert
      const classicParams = CLASSIC_VST_PARAMS[lower];
      if (classicParams || hintSource !== 'vsti') {
        const pluginId = `classic-${lower.replace(/[^a-z0-9]+/g, '-')}`;
        if (seenKeysOnTrack.has(`classic:${pluginId}`)) return;
        seenKeysOnTrack.add(`classic:${pluginId}`);

        const paramList = classicParams || CLASSIC_VST_PARAMS.reverb;
        results.push({
          uid: `${track.id}::${pluginId}::${idx}`,
          trackId: track.id,
          trackName: track.name,
          trackColor: track.color,
          pluginId,
          pluginName: cleanName,
          source: hintSource === 'vsti' ? 'vsti' : 'classic_vst',
          formatBadge: formatBadge || 'DAW FX',
          bypassed: track.vstBypassed,
          accentColor: '#38BDF8',
          parameters: paramList.map(p => {
            const laneId = `classic_vst:${pluginId}:${p.id}`;
            return {
              paramId: p.id,
              name: p.name,
              min: p.min,
              max: p.max,
              defaultValue: p.defaultValue,
              currentValue: p.defaultValue,
              unit: p.unit,
              laneId,
              color: pickColorForKey(`${track.id}:${laneId}`)
            };
          })
        });
        return;
      }
    });

    // 3. Scan track.instrument (MIDI / VSTi synth engines)
    if (track.instrument && !seenKeysOnTrack.has(`vsti:${track.instrument.toLowerCase()}`)) {
      const instName = track.instrument;
      const pluginId = `vsti-${instName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      seenKeysOnTrack.add(`vsti:${instName.toLowerCase()}`);

      results.push({
        uid: `${track.id}::${pluginId}`,
        trackId: track.id,
        trackName: track.name,
        trackColor: track.color,
        pluginId,
        pluginName: instName,
        source: 'vsti',
        formatBadge: 'VSTi',
        bypassed: track.vstBypassed,
        accentColor: '#10B981',
        parameters: VSTI_DEFAULT_PARAMS.map(p => {
          const laneId = `vsti:${pluginId}:${p.id}`;
          return {
            paramId: p.id,
            name: p.name,
            min: p.min,
            max: p.max,
            defaultValue: p.defaultValue,
            currentValue: p.defaultValue,
            unit: p.unit,
            laneId,
            color: pickColorForKey(`${track.id}:${laneId}`)
          };
        })
      });
    }
  });

  return results;
}

/**
 * Creates a default PluginAutomationLaneConfig ready to insert into track.automation.params
 */
export function createPluginAutomationLane(
  plugin: ScannedProjectPlugin,
  param: ScannedPluginParam,
  visible: boolean = true,
  enabled: boolean = true
): PluginAutomationLaneConfig {
  const uid = () => `pt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const startVal = param.currentValue ?? param.defaultValue;
  return {
    id: param.laneId,
    pluginId: plugin.pluginId,
    pluginName: plugin.pluginName,
    pluginSource: plugin.source,
    instanceId: plugin.instanceId,
    paramId: param.paramId,
    paramName: param.name,
    min: param.min,
    max: param.max,
    defaultValue: param.defaultValue,
    unit: param.unit,
    color: param.color,
    enabled,
    visible,
    points: [
      { id: uid(), time: 0, value: startVal },
      { id: uid(), time: 1, value: startVal }
    ]
  };
}

/**
 * Collects a unified list of all Parameter Automation lanes across all tracks:
 * includes every Faust/VST plugin parameter lane on tracks + active/visible Volume & Pan lanes.
 */
export function collectUnifiedAutomationLanes(tracks: Track[]): UnifiedAutomationLaneEntry[] {
  const entries: UnifiedAutomationLaneEntry[] = [];

  tracks.forEach(track => {
    const auto = track.automation;
    if (!auto) return;

    // 1. Plugin Parameter Lanes (always include all registered plugin lanes)
    if (auto.params) {
      Object.values(auto.params).forEach(pLane => {
        entries.push({
          key: `${track.id}::${pLane.id}`,
          track,
          paramKey: pLane.id,
          kind: 'plugin',
          label: pLane.paramName,
          pluginName: pLane.pluginName,
          formatBadge:
            pLane.pluginSource === 'faust'
              ? 'FAUST'
              : pLane.pluginSource === 'vst_wrapper'
                ? 'VST3/CLAP'
                : pLane.pluginSource === 'vsti'
                  ? 'VSTi'
                  : 'FX',
          min: pLane.min,
          max: pLane.max,
          defaultValue: pLane.defaultValue,
          unit: pLane.unit || '',
          color: pLane.color || '#EC4899',
          lane: pLane,
          pluginLane: pLane
        });
      });
    }

    // 2. Volume Lane (include if enabled, visible, or sculpted with > 2 points)
    if (auto.volume && (auto.volume.enabled || auto.volume.visible || auto.volume.points.length > 2)) {
      entries.push({
        key: `${track.id}::volume`,
        track,
        paramKey: 'volume',
        kind: 'volume',
        label: 'Track Volume',
        pluginName: 'Mixer Channel',
        formatBadge: 'MIXER',
        min: 0,
        max: 1,
        defaultValue: track.volume,
        unit: 'dB',
        color: '#00F0FF',
        lane: auto.volume
      });
    }

    // 3. Pan Lane (include if enabled, visible, or sculpted with > 2 points)
    if (auto.pan && (auto.pan.enabled || auto.pan.visible || auto.pan.points.length > 2)) {
      entries.push({
        key: `${track.id}::pan`,
        track,
        paramKey: 'pan',
        kind: 'pan',
        label: 'Stereo Pan',
        pluginName: 'Mixer Channel',
        formatBadge: 'MIXER',
        min: -1,
        max: 1,
        defaultValue: track.pan,
        unit: 'L/R',
        color: '#FF8C00',
        lane: auto.pan
      });
    }
  });

  return entries;
}
