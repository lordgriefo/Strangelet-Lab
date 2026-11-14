import React, { useState, useMemo, useEffect } from 'react';
import {
  Track,
  PluginAutomationLaneConfig,
  LaserToolType
} from '../types';
import {
  scanProjectPlugins,
  collectUnifiedAutomationLanes,
  createPluginAutomationLane,
  ScannedProjectPlugin,
  ScannedPluginParam,
  UnifiedAutomationLaneEntry
} from '../services/projectVstScanner';
import { vstWrapperService, BUILTIN_VST_MANIFESTS } from '../services/vstWrapperService';
import { FAUST_DSP_PRESET_TOYS } from '../services/faustDspService';
import {
  evaluateAutomationAt,
  formatAutomationValue,
  generateComplexEnvelope,
  generateAutomationPreset,
  getDefaultAutomation,
  volumeToDb,
  panToString,
  ComplexEnvelopeShape
} from '../lib/audioUtils';
import { playLaserBeamSound } from '../lib/laserSound';
import { projectHistory } from '../services/projectHistoryService';
import {
  Cpu,
  Search,
  RefreshCw,
  X,
  ChevronDown,
  ChevronRight,
  Sliders,
  Pencil,
  Eye,
  EyeOff,
  Trash2,
  Waves,
  Zap,
  Sparkles,
  ExternalLink,
  Plus,
  Activity
} from 'lucide-react';

interface GlobalVstBrowserPanelProps {
  tracks: Track[];
  tempo: number;
  playheadPosition: number;
  selectedTrackId?: string | null;
  updateTrack: (id: string, updates: Partial<Track>) => void;
  onSelectTrack?: (id: string) => void;
  onActivateDrawTool?: (tool: LaserToolType) => void;
  onOpenVstWrapperHost?: (pluginId?: string) => void;
  onOpenFaustDspLab?: () => void;
  onClose: () => void;
  containerClassName?: string;
}

const SHAPE_OPTIONS: { id: ComplexEnvelopeShape; label: string }[] = [
  { id: 'sine_2', label: 'Sine 2x' },
  { id: 'sine_4', label: 'Sine 4x' },
  { id: 'triangle_4', label: 'Tri 4x' },
  { id: 'pulse_8', label: 'Pulse 8' },
  { id: 'step_snh', label: 'S&H Rnd' },
  { id: 'ramp_up', label: 'Ramp Up' },
  { id: 'ramp_down', label: 'Ramp Dn' },
  { id: 'arch', label: 'Arch' }
];

export const GlobalVstBrowserPanel: React.FC<GlobalVstBrowserPanelProps> = ({
  tracks,
  tempo,
  playheadPosition,
  selectedTrackId,
  updateTrack,
  onSelectTrack,
  onActivateDrawTool,
  onOpenVstWrapperHost,
  onOpenFaustDspLab,
  onClose,
  containerClassName = 'h-96'
}) => {
  const [activeTab, setActiveTab] = useState<'plugins' | 'lanes'>('plugins');
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'faust' | 'vst'>('all');
  const [expandedPlugins, setExpandedPlugins] = useState<Record<string, boolean>>({});
  const [scanNonce, setScanNonce] = useState(0);
  const [scanFlash, setScanFlash] = useState(false);

  // Quick attach state
  const [attachTrackId, setAttachTrackId] = useState<string>(selectedTrackId || tracks[0]?.id || '');
  const [attachPluginKey, setAttachPluginKey] = useState<string>(`faust::${FAUST_DSP_PRESET_TOYS[0]?.id || ''}`);

  useEffect(() => {
    if (selectedTrackId) setAttachTrackId(selectedTrackId);
  }, [selectedTrackId]);

  // Subscribe to vstWrapperService changes so browser automatically rescans
  useEffect(() => {
    const unsub = vstWrapperService.subscribe(() => {
      setScanNonce(n => n + 1);
    });
    return () => unsub();
  }, []);

  const scannedPlugins = useMemo(() => {
    void scanNonce;
    return scanProjectPlugins(tracks);
  }, [tracks, scanNonce]);

  // Auto-expand first two scanned plugins on initial render
  useEffect(() => {
    if (scannedPlugins.length > 0 && Object.keys(expandedPlugins).length === 0) {
      const initial: Record<string, boolean> = {};
      scannedPlugins.slice(0, 2).forEach(p => {
        initial[p.uid] = true;
      });
      setExpandedPlugins(initial);
    }
  }, [scannedPlugins]);

  const unifiedLanes = useMemo(() => {
    return collectUnifiedAutomationLanes(tracks);
  }, [tracks]);

  const filteredPlugins = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scannedPlugins.filter(plug => {
      if (sourceFilter === 'faust' && plug.source !== 'faust') return false;
      if (sourceFilter === 'vst' && plug.source === 'faust') return false;
      if (!q) return true;
      return (
        plug.pluginName.toLowerCase().includes(q) ||
        plug.trackName.toLowerCase().includes(q) ||
        plug.formatBadge.toLowerCase().includes(q) ||
        plug.parameters.some(p => p.name.toLowerCase().includes(q))
      );
    });
  }, [scannedPlugins, searchQuery, sourceFilter]);

  const filteredLanes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return unifiedLanes.filter(entry => {
      if (sourceFilter === 'faust' && entry.pluginLane?.pluginSource !== 'faust') return false;
      if (sourceFilter === 'vst' && entry.pluginLane?.pluginSource === 'faust') return false;
      if (!q) return true;
      return (
        entry.label.toLowerCase().includes(q) ||
        entry.pluginName.toLowerCase().includes(q) ||
        entry.track.name.toLowerCase().includes(q)
      );
    });
  }, [unifiedLanes, searchQuery, sourceFilter]);

  const handleRescan = () => {
    setScanNonce(n => n + 1);
    setScanFlash(true);
    playLaserBeamSound('laser_select');
    setTimeout(() => setScanFlash(false), 600);
  };

  const togglePluginExpand = (uid: string) => {
    setExpandedPlugins(prev => ({ ...prev, [uid]: !prev[uid] }));
  };

  // Focus or create a plugin parameter automation lane directly on the track timeline
  const handleAutomateParam = (
    plugin: ScannedProjectPlugin,
    param: ScannedPluginParam,
    initialShape?: ComplexEnvelopeShape
  ) => {
    const targetTrack = tracks.find(t => t.id === plugin.trackId);
    if (!targetTrack) return;

    const baseAuto = targetTrack.automation || getDefaultAutomation(targetTrack.volume, targetTrack.pan);
    const existingLane = baseAuto.params?.[param.laneId];

    projectHistory.pushSnapshot(`Automate ${param.name} [${targetTrack.name}]`, tracks, tempo);

    let lane: PluginAutomationLaneConfig = existingLane
      ? { ...existingLane, visible: true, enabled: true, instanceId: plugin.instanceId || existingLane.instanceId }
      : createPluginAutomationLane(plugin, param, true, true);

    if (initialShape) {
      lane = {
        ...lane,
        enabled: true,
        visible: true,
        points: generateComplexEnvelope(initialShape, param.min, param.max, param.defaultValue, param.paramId)
      };
    }

    updateTrack(targetTrack.id, {
      automation: {
        ...baseAuto,
        isExpanded: true,
        activeParameter: lane.id,
        params: {
          ...(baseAuto.params || {}),
          [lane.id]: lane
        }
      }
    });

    onSelectTrack?.(targetTrack.id);
    onActivateDrawTool?.('laser_curve');
    playLaserBeamSound('laser_curve');
  };

  // Lane list helpers
  const handleToggleLaneEnabled = (entry: UnifiedAutomationLaneEntry) => {
    const auto = entry.track.automation || getDefaultAutomation(entry.track.volume, entry.track.pan);
    if (entry.kind === 'volume') {
      updateTrack(entry.track.id, {
        automation: { ...auto, volume: { ...auto.volume, enabled: !auto.volume.enabled } }
      });
    } else if (entry.kind === 'pan') {
      updateTrack(entry.track.id, {
        automation: { ...auto, pan: { ...auto.pan, enabled: !auto.pan.enabled } }
      });
    } else if (entry.pluginLane) {
      updateTrack(entry.track.id, {
        automation: {
          ...auto,
          params: {
            ...(auto.params || {}),
            [entry.paramKey]: { ...entry.pluginLane, enabled: !entry.pluginLane.enabled }
          }
        }
      });
    }
    playLaserBeamSound('laser_select');
  };

  const handleToggleLaneVisible = (entry: UnifiedAutomationLaneEntry) => {
    const auto = entry.track.automation || getDefaultAutomation(entry.track.volume, entry.track.pan);
    const nextVis = !entry.lane.visible;
    if (entry.kind === 'volume') {
      updateTrack(entry.track.id, {
        automation: {
          ...auto,
          isExpanded: nextVis ? true : auto.isExpanded,
          volume: { ...auto.volume, visible: nextVis }
        }
      });
    } else if (entry.kind === 'pan') {
      updateTrack(entry.track.id, {
        automation: {
          ...auto,
          isExpanded: nextVis ? true : auto.isExpanded,
          pan: { ...auto.pan, visible: nextVis }
        }
      });
    } else if (entry.pluginLane) {
      updateTrack(entry.track.id, {
        automation: {
          ...auto,
          isExpanded: nextVis ? true : auto.isExpanded,
          params: {
            ...(auto.params || {}),
            [entry.paramKey]: { ...entry.pluginLane, visible: nextVis }
          }
        }
      });
    }
  };

  const handleFocusLaneOnTimeline = (entry: UnifiedAutomationLaneEntry) => {
    const auto = entry.track.automation || getDefaultAutomation(entry.track.volume, entry.track.pan);
    if (entry.kind === 'volume') {
      updateTrack(entry.track.id, {
        automation: {
          ...auto,
          isExpanded: true,
          activeParameter: 'volume',
          volume: { ...auto.volume, visible: true, enabled: true }
        }
      });
    } else if (entry.kind === 'pan') {
      updateTrack(entry.track.id, {
        automation: {
          ...auto,
          isExpanded: true,
          activeParameter: 'pan',
          pan: { ...auto.pan, visible: true, enabled: true }
        }
      });
    } else if (entry.pluginLane) {
      updateTrack(entry.track.id, {
        automation: {
          ...auto,
          isExpanded: true,
          activeParameter: entry.paramKey,
          params: {
            ...(auto.params || {}),
            [entry.paramKey]: { ...entry.pluginLane, visible: true, enabled: true }
          }
        }
      });
    }
    onSelectTrack?.(entry.track.id);
    onActivateDrawTool?.('laser_curve');
    playLaserBeamSound('laser_curve');
  };

  const handleApplyShapeToEntry = (entry: UnifiedAutomationLaneEntry, shape: ComplexEnvelopeShape) => {
    const auto = entry.track.automation || getDefaultAutomation(entry.track.volume, entry.track.pan);
    projectHistory.pushSnapshot(`Shape ${entry.label} (${shape}) [${entry.track.name}]`, tracks, tempo);

    if (entry.kind === 'volume' || entry.kind === 'pan') {
      const pts = generateComplexEnvelope(shape, entry.min, entry.max, entry.defaultValue, entry.kind);
      updateTrack(entry.track.id, {
        automation: {
          ...auto,
          isExpanded: true,
          activeParameter: entry.kind,
          [entry.kind]: { enabled: true, visible: true, points: pts }
        }
      });
    } else if (entry.pluginLane) {
      const pts = generateComplexEnvelope(shape, entry.min, entry.max, entry.defaultValue, entry.pluginLane.paramId);
      updateTrack(entry.track.id, {
        automation: {
          ...auto,
          isExpanded: true,
          activeParameter: entry.paramKey,
          params: {
            ...(auto.params || {}),
            [entry.paramKey]: { ...entry.pluginLane, enabled: true, visible: true, points: pts }
          }
        }
      });
    }
    playLaserBeamSound('laser_curve');
  };

  const handleRemoveOrResetLane = (entry: UnifiedAutomationLaneEntry) => {
    const auto = entry.track.automation || getDefaultAutomation(entry.track.volume, entry.track.pan);
    projectHistory.pushSnapshot(`Clear Automation ${entry.label} [${entry.track.name}]`, tracks, tempo);

    if (entry.kind === 'volume') {
      updateTrack(entry.track.id, {
        automation: {
          ...auto,
          volume: { enabled: false, visible: false, points: generateAutomationPreset('reset', 'volume', entry.track.volume) }
        }
      });
    } else if (entry.kind === 'pan') {
      updateTrack(entry.track.id, {
        automation: {
          ...auto,
          pan: { enabled: false, visible: false, points: generateAutomationPreset('reset', 'pan', entry.track.pan) }
        }
      });
    } else if (auto.params) {
      const nextParams = { ...auto.params };
      delete nextParams[entry.paramKey];
      updateTrack(entry.track.id, {
        automation: {
          ...auto,
          params: nextParams,
          activeParameter: auto.activeParameter === entry.paramKey ? 'volume' : auto.activeParameter
        }
      });
    }
    playLaserBeamSound('laser_erase');
  };

  const handleQuickAttachPlugin = () => {
    const targetTrack = tracks.find(t => t.id === attachTrackId) || tracks[0];
    if (!targetTrack || !attachPluginKey) return;

    const [kind, id] = attachPluginKey.split('::');
    let vstString = '';
    if (kind === 'faust') {
      const toy = FAUST_DSP_PRESET_TOYS.find(t => t.id === id);
      if (!toy) return;
      vstString = `Faust: ${toy.name}`;
    } else if (kind === 'vst') {
      const manifest = BUILTIN_VST_MANIFESTS.find(m => m.id === id);
      if (!manifest) return;
      vstString = `[${manifest.format}] ${manifest.name}`;
      // Also instantiate in wrapper service if not yet present
      const existing = vstWrapperService.getInstancesForTrack(targetTrack.id).find(i => i.pluginId === manifest.id);
      if (!existing) {
        vstWrapperService.instantiatePlugin(manifest.id, targetTrack.id);
      }
    }
    if (!vstString) return;

    projectHistory.pushSnapshot(`Attach ${vstString} [${targetTrack.name}]`, tracks, tempo);
    const existingVsts = targetTrack.vsts || [];
    if (!existingVsts.includes(vstString)) {
      updateTrack(targetTrack.id, {
        vsts: [...existingVsts, vstString],
        vstBypassed: false
      });
    } else {
      updateTrack(targetTrack.id, { vstBypassed: false });
    }
    handleRescan();
  };

  return (
    <div className={`w-full lg:w-[370px] xl:w-[410px] bg-[#050811] border border-[#24304D] rounded-xl flex flex-col overflow-hidden shadow-2xl shrink-0 font-mono ${containerClassName}`}>
      {/* Header */}
      <div className="px-3 py-2 bg-[#080D1B] border-b border-[#1E293B] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-[#EC4899]/20 border border-[#EC4899]/60 flex items-center justify-center shrink-0">
            <Cpu size={13} className="text-[#EC4899]" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-black text-white tracking-wider truncate">
              GLOBAL VST BROWSER
            </div>
            <div className="text-[9px] text-[#7D8AB0] truncate">
              {scannedPlugins.length} Scanned Plugins • {unifiedLanes.length} Automation Lanes
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleRescan}
            className={`px-2 py-1 rounded text-[9px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
              scanFlash
                ? 'bg-[#00F0FF] text-black border-white'
                : 'bg-[#0E1528] border-[#253356] text-[#00F0FF] hover:bg-[#00F0FF]/15'
            }`}
            title="Scan all project tracks for Faust DSP toys, VST3/CLAP/AU plugins, and instruments"
          >
            <RefreshCw size={10} className={scanFlash ? 'animate-spin' : ''} />
            <span>SCAN</span>
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#64748B] hover:text-white hover:bg-[#151D30] transition-colors cursor-pointer"
            title="Close Global VST Browser"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Mode Tabs: Used Plugins vs Unified Parameter Automation Lane List */}
      <div className="grid grid-cols-2 gap-1 p-1.5 bg-[#060A14] border-b border-[#1A233A] shrink-0">
        <button
          onClick={() => setActiveTab('plugins')}
          className={`py-1 px-2 rounded text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'plugins'
              ? 'bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/50 shadow-[0_0_8px_rgba(0,240,255,0.2)]'
              : 'text-[#7D8AB0] hover:text-white border border-transparent'
          }`}
        >
          <Cpu size={11} />
          <span>PLUGINS ({scannedPlugins.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('lanes')}
          className={`py-1 px-2 rounded text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'lanes'
              ? 'bg-[#EC4899]/20 text-[#EC4899] border border-[#EC4899]/50 shadow-[0_0_8px_rgba(236,72,153,0.2)]'
              : 'text-[#7D8AB0] hover:text-white border border-transparent'
          }`}
        >
          <Sliders size={11} />
          <span>PARAM LANES ({unifiedLanes.length})</span>
        </button>
      </div>

      {/* Search & Source Filter Bar */}
      <div className="px-2.5 py-1.5 bg-[#070B16] border-b border-[#162038] flex items-center gap-1.5 shrink-0">
        <div className="relative flex-1 min-w-0">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'plugins' ? 'Filter plugins or params...' : 'Filter automation lanes...'}
            className="w-full bg-[#03050B] border border-[#1E293B] focus:border-[#00F0FF] rounded pl-6 pr-2 py-1 text-[10px] text-white outline-none"
          />
        </div>
        <div className="flex items-center gap-0.5 bg-[#03050B] border border-[#1E293B] rounded p-0.5 shrink-0">
          {(['all', 'faust', 'vst'] as const).map(f => (
            <button
              key={f}
              onClick={() => setSourceFilter(f)}
              className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase cursor-pointer transition-colors ${
                sourceFilter === f
                  ? 'bg-[#26619C] text-white'
                  : 'text-[#64748B] hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {activeTab === 'plugins' ? (
          filteredPlugins.length === 0 ? (
            <div className="p-4 text-center border border-dashed border-[#1E293B] rounded-lg text-[10px] text-[#64748B] space-y-2">
              <div>No matching Faust or VST plugins found in the current project.</div>
              <div className="text-[9px] text-[#7D8AB0]">
                Attach a Faust DSP Toy or VST3 plugin below to scan & automate its parameters.
              </div>
            </div>
          ) : (
            filteredPlugins.map(plug => {
              const isOpen = !!expandedPlugins[plug.uid];
              const targetTrack = tracks.find(t => t.id === plug.trackId);
              const trackParams = targetTrack?.automation?.params || {};
              const automatedCount = plug.parameters.filter(p => trackParams[p.laneId]?.enabled).length;

              return (
                <div
                  key={plug.uid}
                  className="rounded-lg border border-[#1B2540] bg-[#080C18] overflow-hidden"
                >
                  {/* Plugin Header Card */}
                  <div
                    onClick={() => togglePluginExpand(plug.uid)}
                    className="px-2.5 py-2 flex items-center justify-between gap-2 cursor-pointer hover:bg-[#0D1326] transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isOpen ? (
                        <ChevronDown size={12} className="text-[#94A3B8] shrink-0" />
                      ) : (
                        <ChevronRight size={12} className="text-[#94A3B8] shrink-0" />
                      )}
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: plug.trackColor }}
                        title={`Track: ${plug.trackName}`}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-white truncate" title={plug.pluginName}>
                            {plug.pluginName}
                          </span>
                          <span
                            className="text-[8px] px-1 py-0.2 rounded font-bold shrink-0 border"
                            style={{
                              borderColor: `${plug.accentColor}66`,
                              backgroundColor: `${plug.accentColor}1A`,
                              color: plug.accentColor
                            }}
                          >
                            {plug.formatBadge}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-[#7D8AB0] truncate">
                          <span>Track: {plug.trackName}</span>
                          <span>•</span>
                          <span>{plug.parameters.length} params</span>
                          {automatedCount > 0 && (
                            <span className="text-[#EC4899] font-bold">
                              • {automatedCount} auto
                            </span>
                          )}
                          {plug.bypassed && (
                            <span className="text-amber-400">• BYPASSED</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Open Plugin Editor Quick Action */}
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      {plug.source === 'faust' && onOpenFaustDspLab && (
                        <button
                          onClick={onOpenFaustDspLab}
                          className="p-1 rounded bg-[#0E162B] border border-[#24355B] text-[#00F0FF] hover:border-[#00F0FF] text-[9px]"
                          title="Open Faust DSP Lab"
                        >
                          <ExternalLink size={10} />
                        </button>
                      )}
                      {plug.source === 'vst_wrapper' && onOpenVstWrapperHost && (
                        <button
                          onClick={() => onOpenVstWrapperHost(plug.manifestId)}
                          className="p-1 rounded bg-[#18120B] border border-amber-500/40 text-amber-300 hover:border-amber-400 text-[9px]"
                          title="Open in VST Wrapper Host"
                        >
                          <ExternalLink size={10} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Parameter List */}
                  {isOpen && (
                    <div className="border-t border-[#151E34] bg-[#050811] divide-y divide-[#0E1526]">
                      {plug.parameters.map(param => {
                        const existingLane = trackParams[param.laneId];
                        const isAutomated = !!existingLane?.enabled;
                        const isVisible = !!existingLane?.visible;
                        const liveVal = existingLane
                          ? evaluateAutomationAt(existingLane.points, playheadPosition, param.defaultValue)
                          : param.currentValue;

                        return (
                          <div
                            key={param.laneId}
                            className="px-2.5 py-1.5 flex items-center justify-between gap-2 hover:bg-[#0A1020] transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: isAutomated ? param.color : '#475569' }}
                                />
                                <span className="text-[10px] font-bold text-[#E2E8F0] truncate">
                                  {param.name}
                                </span>
                                {existingLane && (
                                  <span
                                    className="text-[8px] px-1 rounded font-bold"
                                    style={{
                                      backgroundColor: `${param.color}22`,
                                      color: param.color
                                    }}
                                  >
                                    {existingLane.points.length} pts
                                  </span>
                                )}
                              </div>
                              <div className="text-[8px] text-[#64748B] truncate pl-3">
                                {formatAutomationValue(liveVal, param.unit, param.min, param.max)} ({param.min}..{param.max}
                                {param.unit ? ` ${param.unit}` : ''})
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {/* 1-click LFO / Ramp stamps directly onto timeline */}
                              <button
                                onClick={() => handleAutomateParam(plug, param, 'sine_2')}
                                className="p-1 rounded bg-[#0B1222] border border-[#1E2A48] text-[#94A3B8] hover:text-[#00F0FF] hover:border-[#00F0FF]/60 cursor-pointer"
                                title="Generate Sine LFO envelope & draw on timeline"
                              >
                                <Waves size={10} />
                              </button>
                              <button
                                onClick={() => handleAutomateParam(plug, param, 'pulse_8')}
                                className="p-1 rounded bg-[#0B1222] border border-[#1E2A48] text-[#94A3B8] hover:text-[#FFD700] hover:border-[#FFD700]/60 cursor-pointer"
                                title="Generate 8-Step Pulse envelope & draw on timeline"
                              >
                                <Zap size={10} />
                              </button>

                              {/* Draw on Timeline button */}
                              <button
                                onClick={() => handleAutomateParam(plug, param)}
                                className={`px-2 py-0.5 rounded text-[9px] font-bold border flex items-center gap-1 transition-all cursor-pointer ${
                                  isVisible
                                    ? 'bg-[#EC4899]/20 border-[#EC4899] text-[#EC4899]'
                                    : 'bg-[#0E162B] border-[#263558] text-[#CBD5E1] hover:border-[#00F0FF] hover:text-[#00F0FF]'
                                }`}
                                title="Show lane on Track Timeline and activate Curve/Pencil drawing"
                              >
                                <Pencil size={9} />
                                <span>{isVisible ? 'DRAWING' : 'DRAW'}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : /* Unified Parameter Automation Lane List Tab */
        filteredLanes.length === 0 ? (
          <div className="p-4 text-center border border-dashed border-[#1E293B] rounded-lg text-[10px] text-[#64748B] space-y-1.5">
            <div>No active Parameter Automation lanes match your filter.</div>
            <div className="text-[9px] text-[#7D8AB0]">
              Switch to the PLUGINS tab and click DRAW on any Faust or VST parameter to create an envelope lane.
            </div>
          </div>
        ) : (
          filteredLanes.map(entry => {
            const liveVal = evaluateAutomationAt(entry.lane.points, playheadPosition, entry.defaultValue);
            const liveText =
              entry.kind === 'volume'
                ? volumeToDb(liveVal)
                : entry.kind === 'pan'
                  ? panToString(liveVal)
                  : formatAutomationValue(liveVal, entry.unit, entry.min, entry.max);

            // Mini sparkline SVG path (width 100, height 20)
            const sortedPts = [...entry.lane.points].sort((a, b) => a.time - b.time);
            const span = entry.max - entry.min || 1;
            const sparkPath = sortedPts
              .map((p, idx) => {
                const sx = (p.time * 100).toFixed(1);
                const normY = Math.max(0, Math.min(1, (p.value - entry.min) / span));
                const sy = (18 - normY * 16).toFixed(1);
                return `${idx === 0 ? 'M' : 'L'} ${sx} ${sy}`;
              })
              .join(' ');

            const isFocused = entry.track.automation?.activeParameter === entry.paramKey;

            return (
              <div
                key={entry.key}
                className={`rounded-lg border p-2 transition-all space-y-1.5 ${
                  isFocused
                    ? 'bg-[#0C1222] border-[#EC4899]/60 shadow-[0_0_12px_rgba(236,72,153,0.18)]'
                    : 'bg-[#080C18] border-[#1A2440] hover:border-[#2C3C66]'
                }`}
              >
                {/* Row 1: Identity & Live Value */}
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: entry.color, boxShadow: `0 0 6px ${entry.color}` }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-white truncate">{entry.label}</span>
                        <span
                          className="text-[8px] px-1 rounded font-bold shrink-0"
                          style={{ backgroundColor: `${entry.color}22`, color: entry.color }}
                        >
                          {entry.formatBadge}
                        </span>
                      </div>
                      <div className="text-[8px] text-[#7D8AB0] truncate">
                        {entry.track.name} • {entry.pluginName}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-bold text-[#E2E8F0]">{liveText}</div>
                    <div className="text-[8px] text-[#64748B]">{entry.lane.points.length} nodes</div>
                  </div>
                </div>

                {/* Row 2: Mini Envelope Sparkline + Playhead */}
                <div
                  onClick={() => handleFocusLaneOnTimeline(entry)}
                  className="h-6 w-full rounded bg-[#03050B] border border-[#141C30] relative overflow-hidden cursor-pointer"
                  title="Click to focus and draw this envelope on the Track Timeline"
                >
                  <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-full">
                    {sparkPath && (
                      <path
                        d={sparkPath}
                        fill="none"
                        stroke={entry.color}
                        strokeWidth="1.5"
                        strokeOpacity={entry.lane.enabled ? 0.95 : 0.35}
                      />
                    )}
                    <line
                      x1={playheadPosition * 100}
                      y1="0"
                      x2={playheadPosition * 100}
                      y2="20"
                      stroke="#FF8C00"
                      strokeWidth="1"
                    />
                  </svg>
                </div>

                {/* Row 3: Quick Actions & Complex Shape Stamps */}
                <div className="flex items-center justify-between gap-1 pt-0.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleLaneEnabled(entry)}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold border cursor-pointer ${
                        entry.lane.enabled
                          ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300'
                          : 'bg-[#111624] border-[#1E293B] text-[#64748B]'
                      }`}
                      title={entry.lane.enabled ? 'Automation Enabled' : 'Automation Bypassed'}
                    >
                      {entry.lane.enabled ? 'ON' : 'BYP'}
                    </button>

                    <button
                      onClick={() => handleToggleLaneVisible(entry)}
                      className={`p-1 rounded border cursor-pointer ${
                        entry.lane.visible
                          ? 'bg-[#0E182E] border-[#00F0FF]/50 text-[#00F0FF]'
                          : 'bg-[#0B0F1B] border-[#1E293B] text-[#64748B] hover:text-white'
                      }`}
                      title={entry.lane.visible ? 'Hide lane on timeline' : 'Show lane on timeline'}
                    >
                      {entry.lane.visible ? <Eye size={10} /> : <EyeOff size={10} />}
                    </button>

                    <select
                      value=""
                      onChange={e => {
                        if (e.target.value) {
                          handleApplyShapeToEntry(entry, e.target.value as ComplexEnvelopeShape);
                        }
                      }}
                      className="bg-[#0B101E] border border-[#1E293B] hover:border-[#FFD700]/60 rounded px-1 py-0.5 text-[8px] text-[#CBD5E1] outline-none cursor-pointer"
                      title="Stamp complex envelope curve onto this parameter lane"
                    >
                      <option value="">+ Shape...</option>
                      {SHAPE_OPTIONS.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleFocusLaneOnTimeline(entry)}
                      className="px-2 py-0.5 rounded bg-[#EC4899]/20 border border-[#EC4899]/60 text-[#EC4899] hover:bg-[#EC4899] hover:text-black text-[8px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                      title="Focus on track timeline & draw envelope"
                    >
                      <Pencil size={9} />
                      <span>DRAW</span>
                    </button>

                    <button
                      onClick={() => handleRemoveOrResetLane(entry)}
                      className="p-1 rounded bg-[#140B10] border border-[#3B1822] text-[#EF4444]/80 hover:text-[#EF4444] hover:border-[#EF4444] cursor-pointer"
                      title={entry.kind === 'plugin' ? 'Remove automation lane' : 'Reset lane to flat'}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer: Quick Attach Faust / VST Plugin to Any Track */}
      <div className="p-2 bg-[#070B16] border-t border-[#1E293B] flex items-center gap-1.5 shrink-0">
        <select
          value={attachTrackId}
          onChange={e => setAttachTrackId(e.target.value)}
          className="w-24 bg-[#03050B] border border-[#1E293B] rounded px-1.5 py-1 text-[9px] text-[#CBD5E1] outline-none truncate"
          title="Target track to insert plugin onto"
        >
          {tracks.map(t => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <select
          value={attachPluginKey}
          onChange={e => setAttachPluginKey(e.target.value)}
          className="flex-1 min-w-0 bg-[#03050B] border border-[#1E293B] rounded px-1.5 py-1 text-[9px] text-[#00F0FF] outline-none truncate"
          title="Select Faust DSP Toy or VST3/CLAP/AU plugin to attach"
        >
          <optgroup label="Faust DSP Boutique Toys">
            {FAUST_DSP_PRESET_TOYS.map(toy => (
              <option key={toy.id} value={`faust::${toy.id}`}>
                Faust: {toy.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="VST3 / CLAP / AU Wrapper Plugins">
            {BUILTIN_VST_MANIFESTS.map(m => (
              <option key={m.id} value={`vst::${m.id}`}>
                [{m.format}] {m.name}
              </option>
            ))}
          </optgroup>
        </select>

        <button
          onClick={handleQuickAttachPlugin}
          className="px-2 py-1 rounded bg-[#00F0FF]/20 border border-[#00F0FF]/60 text-[#00F0FF] hover:bg-[#00F0FF] hover:text-black text-[9px] font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer"
          title="Attach plugin to selected track and rescan"
        >
          <Plus size={10} />
          <span>ADD</span>
        </button>
      </div>
    </div>
  );
};
