import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Power, 
  Sliders, 
  Sparkles, 
  Cpu, 
  RotateCcw, 
  ChevronDown, 
  Check, 
  Layers, 
  ShieldCheck, 
  Zap, 
  Activity, 
  HelpCircle, 
  Code2, 
  Plus, 
  Save, 
  Terminal, 
  ExternalLink,
  Volume2,
  FolderOpen,
  ArrowRight,
  Disc,
  Wand2,
  FolderSearch,
  Monitor,
  Globe,
  RefreshCw,
  FileCode,
  CheckCircle2,
  Radio,
  Download,
  Upload,
  Trash2,
  Bookmark,
  SlidersHorizontal,
  ToggleLeft,
  ToggleRight,
  Play
} from 'lucide-react';
import { 
  vstWrapperService, 
  VstPluginManifest, 
  VstActiveInstance, 
  VstParameterDefinition,
  VstDspTargetStage,
  BUILTIN_VST_MANIFESTS,
  VstAutoMapReport,
  VstAutoMapResult
} from '../services/vstWrapperService';
import { 
  desktopVstBridgeService, 
  NativePluginInfo, 
  NativePluginInstance 
} from '../services/desktopVstBridgeService';
import {
  vstMidiMappingService,
  VstMidiMappingPreset,
  VstMidiParamAssignment
} from '../services/vstMidiMappingService';
import { Track } from '../types';
import { playLaserBeamSound, playColliderInjectionSound } from '../lib/laserSound';

interface VstWrapperHostModalProps {
  isOpen: boolean;
  onClose: () => void;
  track?: Track;
  tracks?: Track[];
  onUpdateTrack?: (trackId: string, updates: Partial<Track>) => void;
  onApplyVstToTrack?: (trackId: string, vstName: string) => void;
  initialPluginId?: string;
}

export const VstWrapperHostModal: React.FC<VstWrapperHostModalProps> = ({
  isOpen,
  onClose,
  track,
  tracks = [],
  onUpdateTrack,
  onApplyVstToTrack,
  initialPluginId
}) => {
  const [activeTab, setActiveTab] = useState<'rack' | 'routing' | 'midi_mapping' | 'builder' | 'desktop_guide'>('rack');
  const [selectedPluginId, setSelectedPluginId] = useState<string>(initialPluginId || BUILTIN_VST_MANIFESTS[0].id);
  const [activeInstance, setActiveInstance] = useState<VstActiveInstance | null>(null);
  const [activeTrackId, setActiveTrackId] = useState<string>(track?.id || tracks[0]?.id || 'track-1');
  const [currentManifest, setCurrentManifest] = useState<VstPluginManifest>(() => {
    return vstWrapperService.getManifest(selectedPluginId) || BUILTIN_VST_MANIFESTS[0];
  });

  // MIDI Parameter Mapping Presets State
  const [activeMidiMapping, setActiveMidiMapping] = useState<VstMidiMappingPreset>(() => 
    vstMidiMappingService.getActiveMapping(selectedPluginId)
  );
  const [availableMidiPresets, setAvailableMidiPresets] = useState<VstMidiMappingPreset[]>(() =>
    vstMidiMappingService.getPresetsForPlugin(selectedPluginId)
  );
  const [isSavePresetModalOpen, setIsSavePresetModalOpen] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [newPresetTemplate, setNewPresetTemplate] = useState<VstMidiMappingPreset['controllerTemplate']>('Akai MPK Mini');
  const [newPresetDesc, setNewPresetDesc] = useState<string>('');
  const [learningParamId, setLearningParamId] = useState<string | null>(null);
  const [midiStatusMsg, setMidiStatusMsg] = useState<string | null>(null);
  const [simulatedCcNumber, setSimulatedCcNumber] = useState<number>(70);
  const [simulatedCcVal, setSimulatedCcVal] = useState<number>(64);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom VST Builder Form State
  const [builderName, setBuilderName] = useState<string>('Custom Channel Strip VST3');
  const [builderVendor, setBuilderVendor] = useState<string>('Strangelet User Audio');
  const [builderFormat, setBuilderFormat] = useState<'VST3' | 'CLAP' | 'AU'>('VST3');
  const [builderCategory, setBuilderCategory] = useState<'EQ' | 'Dynamics' | 'Distortion' | 'Filter' | 'Time'>('Distortion');
  const [builderTheme, setBuilderTheme] = useState<'analog_tube' | 'british_console' | 'cyberpunk_neon' | 'brushed_steel' | 'mastering_gold'>('analog_tube');
  const [builderParams, setBuilderParams] = useState<VstParameterDefinition[]>([
    { id: 'drive', name: 'WARM DRIVE', targetStage: 'drive', min: 0, max: 100, defaultValue: 45, unit: '%', curve: 'log' },
    { id: 'tone', name: 'LPF TONE', targetStage: 'filter_freq', min: 500, max: 18000, defaultValue: 5500, unit: 'Hz', curve: 'log' },
    { id: 'sub', name: 'TIGHT SUB', targetStage: 'low_cut', min: 20, max: 200, defaultValue: 40, unit: 'Hz' },
    { id: 'out', name: 'OUTPUT TRIM', targetStage: 'post_gain', min: -18, max: 12, defaultValue: -1.5, unit: 'dB' }
  ]);

  // Sync / load instance on mount or track switch
  useEffect(() => {
    const manifest = vstWrapperService.getManifest(selectedPluginId) || BUILTIN_VST_MANIFESTS[0];
    setCurrentManifest(manifest);

    // Look for existing instance or create one
    const existing = vstWrapperService.getInstancesForTrack(activeTrackId).find(i => i.pluginId === manifest.id);
    if (existing) {
      setActiveInstance(existing);
    } else {
      const newInst = vstWrapperService.instantiatePlugin(manifest.id, activeTrackId);
      setActiveInstance(newInst);
    }
  }, [selectedPluginId, activeTrackId]);

  // Subscribe to service updates
  useEffect(() => {
    return vstWrapperService.subscribe(() => {
      if (activeInstance) {
        const fresh = vstWrapperService.getInstance(activeInstance.instanceId);
        if (fresh) setActiveInstance({ ...fresh });
      }
    });
  }, [activeInstance?.instanceId]);

  const handleSelectPlugin = (pluginId: string) => {
    setSelectedPluginId(pluginId);
    playLaserBeamSound('laser_select');
  };

  const handleParamChange = (paramId: string, val: number) => {
    if (!activeInstance) return;
    vstWrapperService.updateParameter(activeInstance.instanceId, paramId, val);
    setActiveInstance(prev => prev ? {
      ...prev,
      paramValues: { ...prev.paramValues, [paramId]: val }
    } : null);
  };

  const handleToggleBypass = () => {
    if (!activeInstance) return;
    const next = !activeInstance.bypassed;
    vstWrapperService.setBypass(activeInstance.instanceId, next);
    setActiveInstance(prev => prev ? { ...prev, bypassed: next } : null);
    if (onUpdateTrack && track) {
      onUpdateTrack(activeTrackId, { vstBypassed: next });
    }
  };

  const handleToggleAB = () => {
    if (!activeInstance) return;
    vstWrapperService.toggleABState(activeInstance.instanceId);
    const fresh = vstWrapperService.getInstance(activeInstance.instanceId);
    if (fresh) setActiveInstance({ ...fresh });
  };

  const handleLoadPreset = (presetId: string) => {
    if (!activeInstance) return;
    vstWrapperService.loadPreset(activeInstance.instanceId, presetId);
    const fresh = vstWrapperService.getInstance(activeInstance.instanceId);
    if (fresh) setActiveInstance({ ...fresh });
  };

  const handleCreateCustomPlugin = () => {
    const created = vstWrapperService.registerCustomNonNativePlugin({
      name: builderName,
      vendor: builderVendor,
      version: '1.0.0',
      format: builderFormat,
      category: builderCategory,
      description: `Custom non-native parameter mapped ${builderCategory} plugin for Strangelet Lab.`,
      faceplateTheme: builderTheme,
      parameters: builderParams,
      presets: [
        {
          id: 'def',
          name: 'Default Init',
          paramValues: builderParams.reduce((acc, p) => ({ ...acc, [p.id]: p.defaultValue }), {})
        }
      ]
    });

    setSelectedPluginId(created.id);
    setActiveTab('rack');
    playColliderInjectionSound();
  };

  // Auto-Map Diagnostic & Drawer State
  const [lastAutoMapReport, setLastAutoMapReport] = useState<VstAutoMapReport | null>(null);
  const [showAutoMapDrawer, setShowAutoMapDrawer] = useState<boolean>(false);
  const [autoMapSuccessToast, setAutoMapSuccessToast] = useState<string | null>(null);

  // Desktop Native VST Bridge State
  const [nativeScanLoading, setNativeScanLoading] = useState<boolean>(false);
  const [scannedNativePlugins, setScannedNativePlugins] = useState<NativePluginInfo[]>([]);
  const [activeNativeInstance, setActiveNativeInstance] = useState<NativePluginInstance | null>(null);

  const handleAutoMapActivePlugin = () => {
    try {
      const report = vstWrapperService.autoMapManifest(currentManifest.id);
      setLastAutoMapReport(report);
      setShowAutoMapDrawer(true);
      setAutoMapSuccessToast(`Auto-Mapped ${report.mappedCount} parameters to Gain, Pan, Cutoff & DSP stages!`);
      const fresh = vstWrapperService.getManifest(currentManifest.id);
      if (fresh) setCurrentManifest({ ...fresh });
      playColliderInjectionSound();
      setTimeout(() => setAutoMapSuccessToast(null), 4000);
    } catch (e) {
      console.error('Auto-Map error:', e);
    }
  };

  const handleAutoMapBuilderParams = () => {
    const { params, report } = vstWrapperService.autoMapCustomParams(builderParams);
    setBuilderParams(params);
    setAutoMapSuccessToast(`Auto-detected stages for ${report.length} custom parameters!`);
    playColliderInjectionSound();
    setTimeout(() => setAutoMapSuccessToast(null), 4000);
  };

  const handleScanNativeDesktopPlugins = async () => {
    setNativeScanLoading(true);
    playLaserBeamSound('laser_select');
    try {
      const discovered = await desktopVstBridgeService.scanSystemPlugins();
      setScannedNativePlugins(discovered);
      playColliderInjectionSound();
    } catch (err) {
      console.error('Scan native plugins failed:', err);
    } finally {
      setNativeScanLoading(false);
    }
  };

  const handleToggleNativeEditor = async (plugin: NativePluginInfo) => {
    try {
      let inst = activeNativeInstance;
      if (!inst || inst.pluginId !== plugin.id) {
        inst = await desktopVstBridgeService.instantiateNativePlugin(plugin, activeTrackId);
        setActiveNativeInstance(inst);
      }
      const isOpen = await desktopVstBridgeService.toggleNativeEditorWindow(inst.instanceId);
      setActiveNativeInstance({ ...inst, isWindowOpen: isOpen });
      playLaserBeamSound(isOpen ? 'laser_curve' : 'laser_select');
    } catch (e) {
      console.error('Native editor error:', e);
    }
  };

  // Sync VST MIDI Mapping Focus with active instance
  useEffect(() => {
    if (activeInstance) {
      vstMidiMappingService.setFocusedPlugin(currentManifest.id, activeInstance.instanceId);
    }
    return () => {
      vstMidiMappingService.clearFocusedPlugin();
    };
  }, [currentManifest.id, activeInstance?.instanceId]);

  useEffect(() => {
    setActiveMidiMapping(vstMidiMappingService.getActiveMapping(selectedPluginId));
    setAvailableMidiPresets(vstMidiMappingService.getPresetsForPlugin(selectedPluginId));
  }, [selectedPluginId]);

  useEffect(() => {
    return vstMidiMappingService.subscribe(() => {
      setActiveMidiMapping(vstMidiMappingService.getActiveMapping(selectedPluginId));
      setAvailableMidiPresets(vstMidiMappingService.getPresetsForPlugin(selectedPluginId));
      const target = vstMidiMappingService.getLearningTarget();
      setLearningParamId(target?.paramId || null);

      if (activeInstance) {
        const fresh = vstWrapperService.getInstance(activeInstance.instanceId);
        if (fresh) setActiveInstance({ ...fresh });
      }
    });
  }, [selectedPluginId, activeInstance?.instanceId]);

  const handleLoadMidiPreset = (presetId: string) => {
    const loaded = vstMidiMappingService.loadPresetToPlugin(selectedPluginId, presetId);
    if (loaded) {
      setActiveMidiMapping({ ...loaded });
      setMidiStatusMsg(`Loaded MIDI Preset: "${loaded.name}"`);
      setTimeout(() => setMidiStatusMsg(null), 3000);
    }
  };

  const handleSaveMidiPreset = () => {
    if (!newPresetName.trim()) return;
    const created = vstMidiMappingService.saveCurrentMappingAsPreset(
      selectedPluginId,
      newPresetName,
      newPresetTemplate,
      newPresetDesc
    );
    setAvailableMidiPresets(vstMidiMappingService.getPresetsForPlugin(selectedPluginId));
    setActiveMidiMapping({ ...created });
    setIsSavePresetModalOpen(false);
    setNewPresetName('');
    setNewPresetDesc('');
    setMidiStatusMsg(`Saved Mapping Preset: "${created.name}"`);
    setTimeout(() => setMidiStatusMsg(null), 3500);
  };

  const handleDeleteMidiPreset = (presetId: string) => {
    const deleted = vstMidiMappingService.deleteUserPreset(presetId);
    if (deleted) {
      setAvailableMidiPresets(vstMidiMappingService.getPresetsForPlugin(selectedPluginId));
      setActiveMidiMapping(vstMidiMappingService.getActiveMapping(selectedPluginId));
      setMidiStatusMsg('Preset deleted');
      setTimeout(() => setMidiStatusMsg(null), 2500);
    }
  };

  const handleSetDefaultMidiPreset = (presetId: string) => {
    vstMidiMappingService.setDefaultPreset(selectedPluginId, presetId);
    setMidiStatusMsg('Set as default MIDI mapping for this plugin');
    setTimeout(() => setMidiStatusMsg(null), 3000);
  };

  const handleExportMidiPresets = () => {
    const json = vstMidiMappingService.exportPresetsAsJson(selectedPluginId);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentManifest.name.replace(/\s+/g, '_')}_MIDI_Mappings.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setMidiStatusMsg('Exported MIDI Mapping Presets (.json)');
    setTimeout(() => setMidiStatusMsg(null), 3000);
  };

  const handleImportMidiPresets = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = vstMidiMappingService.importPresetsFromJson(content);
        if (res.importedCount > 0) {
          setAvailableMidiPresets(vstMidiMappingService.getPresetsForPlugin(selectedPluginId));
          setMidiStatusMsg(`Imported ${res.importedCount} MIDI Mapping Preset(s)!`);
        } else {
          setMidiStatusMsg(`Import failed: ${res.errors.join(', ')}`);
        }
        setTimeout(() => setMidiStatusMsg(null), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleToggleMidiLearn = (paramId: string) => {
    if (learningParamId === paramId) {
      vstMidiMappingService.cancelLearning();
      setLearningParamId(null);
    } else {
      vstMidiMappingService.startLearning(selectedPluginId, paramId);
      setLearningParamId(paramId);
    }
  };

  const handleUpdateAssignmentField = (paramId: string, updates: Partial<VstMidiParamAssignment>) => {
    const current = activeMidiMapping.assignments.find(a => a.paramId === paramId);
    if (!current) return;
    const updated: VstMidiParamAssignment = { ...current, ...updates };
    vstMidiMappingService.updateAssignment(selectedPluginId, updated);
    setActiveMidiMapping({
      ...activeMidiMapping,
      assignments: activeMidiMapping.assignments.map(a => a.paramId === paramId ? updated : a)
    });
  };

  const handleSimulateCcTwist = (val: number) => {
    setSimulatedCcVal(val);
    vstMidiMappingService.simulateMidiCc(simulatedCcNumber, val);
  };

  // Theme styling configurations
  const getThemeStyles = () => {
    switch (currentManifest.faceplateTheme) {
      case 'analog_tube':
        return {
          wrapper: 'bg-gradient-to-b from-[#1C120C] via-[#24170E] to-[#140A05] border-amber-600/50 shadow-[0_0_35px_rgba(245,158,11,0.2)]',
          header: 'border-b border-amber-900/50 bg-[#160E08]',
          plate: 'bg-[#18110B] border border-amber-700/30',
          knobTrack: 'stroke-amber-900/50',
          knobFill: 'stroke-amber-400',
          textAccent: 'text-amber-400',
          badge: 'bg-amber-950 text-amber-300 border-amber-600/60'
        };
      case 'british_console':
        return {
          wrapper: 'bg-gradient-to-b from-[#101A24] via-[#152332] to-[#0A121A] border-sky-600/50 shadow-[0_0_35px_rgba(2,132,199,0.2)]',
          header: 'border-b border-sky-900/50 bg-[#0C1620]',
          plate: 'bg-[#121E2A] border border-sky-700/30',
          knobTrack: 'stroke-sky-900/50',
          knobFill: 'stroke-sky-400',
          textAccent: 'text-sky-300',
          badge: 'bg-sky-950 text-sky-300 border-sky-600/60'
        };
      case 'cyberpunk_neon':
        return {
          wrapper: 'bg-gradient-to-b from-[#160B24] via-[#1F0D33] to-[#0D0517] border-fuchsia-500/50 shadow-[0_0_35px_rgba(217,70,239,0.25)]',
          header: 'border-b border-fuchsia-900/50 bg-[#140821]',
          plate: 'bg-[#180A28] border border-fuchsia-700/30',
          knobTrack: 'stroke-fuchsia-900/50',
          knobFill: 'stroke-[#00F0FF]',
          textAccent: 'text-[#00F0FF]',
          badge: 'bg-fuchsia-950 text-fuchsia-300 border-fuchsia-500/60'
        };
      case 'mastering_gold':
        return {
          wrapper: 'bg-gradient-to-b from-[#1A180E] via-[#242114] to-[#12110A] border-yellow-500/50 shadow-[0_0_35px_rgba(234,179,8,0.2)]',
          header: 'border-b border-yellow-900/50 bg-[#16140C]',
          plate: 'bg-[#1C1A10] border border-yellow-700/30',
          knobTrack: 'stroke-yellow-900/50',
          knobFill: 'stroke-yellow-400',
          textAccent: 'text-yellow-300',
          badge: 'bg-yellow-950 text-yellow-300 border-yellow-500/60'
        };
      case 'brushed_steel':
      default:
        return {
          wrapper: 'bg-gradient-to-b from-[#15171C] via-[#1E2129] to-[#0E1014] border-slate-500/50 shadow-[0_0_35px_rgba(100,116,139,0.2)]',
          header: 'border-b border-slate-800 bg-[#121418]',
          plate: 'bg-[#181B22] border border-slate-700/40',
          knobTrack: 'stroke-slate-800',
          knobFill: 'stroke-emerald-400',
          textAccent: 'text-emerald-300',
          badge: 'bg-slate-900 text-slate-300 border-slate-600/60'
        };
    }
  };

  const theme = getThemeStyles();
  const allManifests = vstWrapperService.getAllManifests();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md font-mono select-none animate-fade-in">
      <div className={`w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl border ${theme.wrapper} overflow-hidden shadow-2xl transition-all`}>
        
        {/* Host Title Bar */}
        <div className={`px-5 py-3.5 flex items-center justify-between ${theme.header}`}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Sliders size={18} className={theme.textAccent} />
              <span className="font-extrabold text-sm tracking-wider text-white uppercase">
                VST HOST WRAPPER LAYER
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 ml-2">
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${theme.badge}`}>
                {currentManifest.format} 64-BIT
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-black/50 text-[#889] border border-white/10 hidden sm:inline">
                DSP STAGE MAPPER
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setActiveTab('rack')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                activeTab === 'rack' ? 'bg-white text-black shadow-sm' : 'text-[#889] hover:text-white'
              }`}
            >
              Faceplate Rack
            </button>
            <button
              onClick={() => setActiveTab('midi_mapping')}
              className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'midi_mapping' ? 'bg-white text-black shadow-sm' : 'text-[#889] hover:text-white'
              }`}
            >
              <Radio size={12} className={activeTab === 'midi_mapping' ? 'text-black' : 'text-amber-400'} />
              <span>MIDI Mappings</span>
              <span className={`text-[9px] px-1 rounded font-mono ${
                activeTab === 'midi_mapping' ? 'bg-black text-amber-300 font-bold' : 'bg-amber-950 text-amber-300 border border-amber-600/40'
              }`}>
                {activeMidiMapping.assignments.filter(a => a.enabled).length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('routing')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                activeTab === 'routing' ? 'bg-white text-black shadow-sm' : 'text-[#889] hover:text-white'
              }`}
            >
              Stage Matrix
            </button>
            <button
              onClick={() => setActiveTab('builder')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                activeTab === 'builder' ? 'bg-white text-black shadow-sm' : 'text-[#889] hover:text-white'
              }`}
            >
              Custom VST Builder
            </button>
            <button
              onClick={() => setActiveTab('desktop_guide')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                activeTab === 'desktop_guide' ? 'bg-white text-black shadow-sm' : 'text-[#889] hover:text-white'
              }`}
            >
              Desktop VST Guide
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg bg-black/40 hover:bg-white/20 text-[#AAA] hover:text-white border border-white/10 transition-colors"
              title="Close Plugin Window [Esc]"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Plugin & Track Selector Strip */}
        <div className="px-5 py-2.5 bg-black/40 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Plugin Browser Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-[#778]">Plugin:</span>
            <select
              value={selectedPluginId}
              onChange={(e) => handleSelectPlugin(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-[#0E121B] border border-white/15 text-white font-bold text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              {allManifests.map(m => (
                <option key={m.id} value={m.id}>
                  [{m.format}] {m.name} ({m.category})
                </option>
              ))}
            </select>

            {/* Target Track Selector */}
            <span className="text-[10px] uppercase font-bold text-[#778] ml-2">Track:</span>
            <select
              value={activeTrackId}
              onChange={(e) => setActiveTrackId(e.target.value)}
              className="px-2 py-1 rounded-lg bg-[#0E121B] border border-white/15 text-cyan-300 font-bold text-xs focus:outline-none cursor-pointer"
            >
              {tracks.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.type.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Preset Selector & Comparison Controls */}
          {activeInstance && (
            <div className="flex items-center gap-2">
              {/* Preset Selector (.vstpreset) */}
              <div className="flex items-center gap-1 bg-[#090C12] px-2 py-1 rounded-lg border border-white/10" title="Audio Sound Preset (.vstpreset)">
                <FolderOpen size={12} className="text-[#889]" />
                <select
                  value={activeInstance.selectedPresetId || ''}
                  onChange={(e) => handleLoadPreset(e.target.value)}
                  className="bg-transparent text-amber-300 text-xs font-bold focus:outline-none cursor-pointer max-w-[130px] truncate"
                >
                  <option value="" disabled>Sound Preset</option>
                  {currentManifest.presets.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* MIDI Parameter Mapping Preset (.json) Quick-Bar */}
              <div className="flex items-center gap-1 bg-[#090C12] px-2 py-1 rounded-lg border border-amber-500/30" title="MIDI Controller Parameter Mapping Preset">
                <Radio size={12} className="text-amber-400" />
                <select
                  value={activeMidiMapping.id}
                  onChange={(e) => handleLoadMidiPreset(e.target.value)}
                  className="bg-transparent text-amber-200 text-xs font-bold focus:outline-none cursor-pointer max-w-[150px] truncate"
                  title="Load MIDI Hardware Mapping Preset"
                >
                  <optgroup label="Factory Controller Maps">
                    {availableMidiPresets.filter(p => p.isFactory).map(p => (
                      <option key={p.id} value={p.id}>{p.name} {p.isDefault ? '★' : ''}</option>
                    ))}
                  </optgroup>
                  {availableMidiPresets.filter(p => !p.isFactory).length > 0 && (
                    <optgroup label="User Custom Presets">
                      {availableMidiPresets.filter(p => !p.isFactory).map(p => (
                        <option key={p.id} value={p.id}>{p.name} {p.isDefault ? '★' : ''}</option>
                      ))}
                    </optgroup>
                  )}
                </select>

                <button
                  onClick={() => {
                    setNewPresetName(`${currentManifest.name} Map`);
                    setIsSavePresetModalOpen(true);
                  }}
                  className="p-1 hover:text-amber-300 text-[#889] transition-colors"
                  title="Save Current MIDI Mapping as New Preset..."
                >
                  <Save size={12} />
                </button>
              </div>

              {/* A/B Switch */}
              <button
                onClick={handleToggleAB}
                className={`px-2 py-1 rounded-lg font-bold text-xs border transition-all cursor-pointer ${
                  activeInstance.activeState === 'A'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                    : 'bg-purple-500/20 text-purple-300 border-purple-500/60 shadow-[0_0_8px_rgba(168,85,247,0.3)]'
                }`}
                title="A/B Compare two parameter configurations"
              >
                STATE: {activeInstance.activeState}
              </button>

              {/* Intelligent Auto-Map Parameters Button */}
              <button
                onClick={handleAutoMapActivePlugin}
                className="px-2.5 py-1 rounded-lg font-extrabold text-xs flex items-center gap-1.5 border border-purple-500/60 bg-gradient-to-r from-purple-950/70 via-indigo-950/70 to-cyan-950/70 hover:from-purple-900/90 hover:to-cyan-900/90 text-purple-200 hover:text-white shadow-[0_0_12px_rgba(168,85,247,0.35)] transition-all cursor-pointer active:scale-95 group"
                title="Auto-Map: Intelligently detects common VST parameters (Gain, Pan, Cutoff, Res, Drive, Mix) and maps them to DSP interface stages"
              >
                <Wand2 size={12} className="text-cyan-400 group-hover:rotate-12 transition-transform animate-pulse" />
                <span className="tracking-wide">AUTO-MAP</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-purple-900/60 text-purple-300 font-mono font-bold">
                  DSP
                </span>
              </button>

              {/* Bypass Button */}
              <button
                onClick={handleToggleBypass}
                className={`px-2.5 py-1 rounded-lg font-extrabold text-xs flex items-center gap-1.5 border transition-all cursor-pointer ${
                  activeInstance.bypassed
                    ? 'bg-zinc-900 border-zinc-700 text-zinc-500'
                    : 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                }`}
              >
                <Power size={12} />
                <span>{activeInstance.bypassed ? 'BYPASSED' : 'ACTIVE'}</span>
              </button>
            </div>
          )}
        </div>

        {/* MIDI Mapping Presets Status Banner */}
        {midiStatusMsg && (
          <div className="px-5 py-2 bg-gradient-to-r from-amber-950/90 via-orange-950/90 to-yellow-950/90 border-b border-amber-500/50 flex items-center justify-between text-xs animate-fade-in font-mono">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <Radio size={14} className="text-amber-400 animate-pulse" />
              <span>{midiStatusMsg}</span>
            </div>
            <button
              onClick={() => setActiveTab('midi_mapping')}
              className="text-[11px] underline text-amber-200 hover:text-white font-mono cursor-pointer"
            >
              Configure in MIDI Mappings Tab &rarr;
            </button>
          </div>
        )}

        {/* Auto-Map Success Notification Banner */}
        {autoMapSuccessToast && (
          <div className="px-5 py-2 bg-gradient-to-r from-purple-950/90 via-indigo-950/90 to-cyan-950/90 border-b border-purple-500/50 flex items-center justify-between text-xs animate-fade-in">
            <div className="flex items-center gap-2 text-cyan-300 font-bold">
              <CheckCircle2 size={14} className="text-cyan-400" />
              <span>{autoMapSuccessToast}</span>
            </div>
            {lastAutoMapReport && (
              <button
                onClick={() => setShowAutoMapDrawer(prev => !prev)}
                className="text-[11px] underline text-purple-300 hover:text-white font-mono cursor-pointer"
              >
                {showAutoMapDrawer ? 'Hide Details' : 'View Detection Matrix'}
              </button>
            )}
          </div>
        )}

        {/* Auto-Map Detailed Mapping Inspector Drawer */}
        {showAutoMapDrawer && lastAutoMapReport && (
          <div className="px-6 py-4 bg-[#090C14] border-b border-purple-500/30 text-xs font-mono animate-fade-in max-h-56 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-purple-300 font-bold uppercase tracking-wider text-[11px]">
                <Wand2 size={13} className="text-cyan-400" />
                <span>Auto-Map Parameter Detection Matrix — {lastAutoMapReport.pluginName}</span>
              </div>
              <button 
                onClick={() => setShowAutoMapDrawer(false)}
                className="text-[#778] hover:text-white p-1"
              >
                <X size={12} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {lastAutoMapReport.details.map((item) => (
                <div key={item.paramId} className="p-2.5 rounded-lg bg-black/60 border border-white/10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-bold text-white text-[11px] truncate">{item.paramName}</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase ${
                        item.categoryDetected === 'Gain' ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/50' :
                        item.categoryDetected === 'Pan' ? 'bg-amber-950 text-amber-300 border border-amber-600/50' :
                        item.categoryDetected === 'Cutoff' ? 'bg-sky-950 text-sky-300 border border-sky-600/50' :
                        item.categoryDetected === 'Resonance' ? 'bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-600/50' :
                        item.categoryDetected === 'Drive' ? 'bg-orange-950 text-orange-300 border border-orange-600/50' :
                        'bg-purple-950 text-purple-300 border border-purple-600/50'
                      }`}>
                        {item.categoryDetected}
                      </span>
                    </div>
                    <div className="text-[10px] text-cyan-300/80 mb-1">
                      Stage: <span className="text-white font-bold">{item.mappedStage}</span>
                    </div>
                    <p className="text-[9px] text-[#889] leading-tight">{item.reason}</p>
                  </div>
                  <div className="mt-2 pt-1 border-t border-white/5 flex items-center justify-between text-[9px] text-[#667]">
                    <span>Range: {item.suggestedRange.min}..{item.suggestedRange.max} {item.suggestedUnit}</span>
                    <span className="text-emerald-400 font-bold">{item.confidence}% Match</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 1: Faceplate Rack View */}
        {activeTab === 'rack' && activeInstance && (
          <div className="p-6 flex-1 overflow-y-auto flex flex-col items-center justify-center">
            
            {/* The Physical Simulated Hardware Chassis */}
            <div className={`w-full max-w-4xl p-6 sm:p-8 rounded-2xl border-2 ${theme.plate} shadow-2xl relative overflow-hidden`}>
              
              {/* Subtle screw heads on chassis corners */}
              <div className="absolute top-2.5 left-2.5 w-3 h-3 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-[7px] text-white/40 font-mono">+</div>
              <div className="absolute top-2.5 right-2.5 w-3 h-3 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-[7px] text-white/40 font-mono">+</div>
              <div className="absolute bottom-2.5 left-2.5 w-3 h-3 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-[7px] text-white/40 font-mono">+</div>
              <div className="absolute bottom-2.5 right-2.5 w-3 h-3 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-[7px] text-white/40 font-mono">+</div>

              {/* Chassis Branding Header */}
              <div className="flex items-center justify-between pb-6 mb-6 border-b border-white/10">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[#889] font-bold">
                    {currentManifest.vendor} • {currentManifest.format}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                    {currentManifest.name}
                  </h2>
                  <p className="text-xs text-[#99A] mt-1 max-w-xl">
                    {currentManifest.description}
                  </p>
                </div>

                {/* Simulated Glow Indicator / Vacuum Tube Window */}
                <div className="flex items-center gap-3">
                  {currentManifest.faceplateTheme === 'analog_tube' && (
                    <div className="w-16 h-12 rounded-xl bg-gradient-to-t from-black via-amber-950/80 to-amber-700/40 border border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.5)] flex items-center justify-center relative overflow-hidden group">
                      <div className="w-2 h-7 bg-amber-400 rounded-full animate-pulse shadow-[0_0_12px_#F59E0B]" />
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.4),transparent)]" />
                    </div>
                  )}

                  <div className="text-right">
                    <div className="text-[10px] text-[#667] font-bold">I/O CALIBRATION</div>
                    <div className="text-xs font-mono font-bold text-emerald-400 flex items-center justify-end gap-1">
                      <Activity size={12} className="animate-pulse" />
                      <span>-18 dBFS REF</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rotary Knobs & Sliders Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 sm:gap-8 justify-items-center my-4">
                {currentManifest.parameters.map((param) => {
                  const currentValue = activeInstance.paramValues[param.id] !== undefined
                    ? activeInstance.paramValues[param.id]
                    : param.defaultValue;

                  // Normalize percentage (0 to 1) for SVG knob rotation
                  const range = param.max - param.min;
                  const normalized = range > 0 ? (currentValue - param.min) / range : 0.5;
                  const angle = -135 + normalized * 270; // -135 deg to +135 deg

                  return (
                    <div key={param.id} className="flex flex-col items-center group w-full">
                      
                      {/* Rotary Dial */}
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                          {/* Background Arc */}
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            strokeWidth="8"
                            className={theme.knobTrack}
                            strokeDasharray="188.5"
                            strokeDashoffset="47.1"
                          />
                          {/* Active Value Arc */}
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            strokeWidth="8"
                            className={theme.knobFill}
                            strokeDasharray="188.5"
                            strokeDashoffset={188.5 - (normalized * 188.5 * 0.75)}
                            strokeLinecap="round"
                          />
                        </svg>

                        {/* Physical Inner Dial Body */}
                        <div 
                          className="absolute w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-gradient-to-b from-[#333] to-[#111] border-2 border-white/20 shadow-lg flex items-center justify-center cursor-ns-resize transition-transform"
                          style={{ transform: `rotate(${angle}deg)` }}
                        >
                          {/* Indicator Notch */}
                          <div className="w-1 h-3.5 bg-white rounded-full -translate-y-3.5 shadow-[0_0_5px_white]" />
                        </div>
                      </div>

                      {/* Knob Label & Value Control Slider */}
                      <div className="mt-2 text-center w-full">
                        <div className="text-[11px] font-extrabold text-white tracking-wider uppercase truncate px-1" title={param.name}>
                          {param.name}
                        </div>
                        
                        <div className="mt-1 flex items-center justify-center gap-1">
                          <input
                            type="range"
                            min={param.min}
                            max={param.max}
                            step={param.max - param.min > 200 ? 5 : (param.max - param.min > 10 ? 0.5 : 0.05)}
                            value={currentValue}
                            onChange={(e) => handleParamChange(param.id, parseFloat(e.target.value))}
                            className="w-20 accent-cyan-400 h-1 bg-black/60 rounded cursor-pointer"
                          />
                        </div>

                        <div className="mt-1 text-xs font-mono font-bold text-cyan-300">
                          {currentValue.toFixed(param.unit === 'Hz' || param.unit === '%' ? 0 : 1)} {param.unit}
                        </div>

                        {/* Target DSP Stage Tag */}
                        <div className="mt-1 text-[8px] font-mono text-[#778] uppercase truncate px-1">
                          &rarr; {param.targetStage.replace('_', ' ')}
                        </div>

                        {/* MIDI CC Assignment Badge & Quick Learn Button */}
                        {(() => {
                          const midiAssign = activeMidiMapping.assignments.find(a => a.paramId === param.id);
                          const isLearning = learningParamId === param.id;
                          return (
                            <button
                              onClick={() => handleToggleMidiLearn(param.id)}
                              className={`mt-1.5 text-[9px] font-mono px-2 py-0.5 rounded-full border transition-all cursor-pointer flex items-center justify-center gap-1 mx-auto ${
                                isLearning
                                  ? 'bg-amber-500 text-black border-amber-300 font-extrabold animate-pulse shadow-[0_0_8px_#F59E0B]'
                                  : midiAssign && midiAssign.enabled
                                    ? 'bg-[#121622] text-amber-300 border-amber-500/50 hover:border-amber-400 hover:bg-amber-950/40'
                                    : 'bg-black/40 text-[#667] border-white/10 hover:border-amber-500/30 hover:text-amber-300'
                              }`}
                              title={
                                isLearning
                                  ? 'Listening for hardware MIDI CC... Twist any knob or fader.'
                                  : midiAssign && midiAssign.enabled
                                    ? `Assigned to MIDI CC ${midiAssign.ccNumber}${midiAssign.channel !== -1 ? ` (Ch ${midiAssign.channel})` : ' (Omni)'}. Click to Learn new CC.`
                                    : 'Click to MIDI Learn hardware controller knob'
                              }
                            >
                              <Radio size={8} className={isLearning ? 'animate-ping' : ''} />
                              <span>{isLearning ? 'LEARN...' : (midiAssign && midiAssign.enabled ? `CC ${midiAssign.ccNumber}` : '+ MIDI')}</span>
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chassis Bottom Strip */}
              <div className="mt-8 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between text-[10px] text-[#778] font-mono">
                <div>
                  ENGINE: Web Audio 32-bit Floating Point Graph • Latency: 0.0ms
                </div>
                <div className="flex items-center gap-2">
                  <span>DSP INSERT HOST</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: MIDI Mapping Presets & CC Assignment Studio */}
        {activeTab === 'midi_mapping' && (
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="max-w-5xl mx-auto space-y-6">

              {/* Preset Header & Toolbar */}
              <div className="p-5 rounded-2xl bg-black/50 border border-cyan-500/30 backdrop-blur-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
                      <SlidersHorizontal size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white tracking-wide">
                          MIDI Parameter Mapping Presets
                        </h3>
                        <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${
                          activeMidiMapping.isFactory 
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        }`}>
                          {activeMidiMapping.isFactory ? 'Factory Preset' : 'User Preset'}
                        </span>
                      </div>
                      <p className="text-xs text-[#889] mt-0.5">
                        Recall and customize hardware controller bindings, CC assignments, min/max ranges, and response curves for <span className="text-cyan-300 font-mono">{currentManifest.name}</span>.
                      </p>
                    </div>
                  </div>

                  {/* Preset Selector & Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Preset Dropdown */}
                    <div className="relative">
                      <select
                        value={activeMidiMapping.id}
                        onChange={(e) => handleLoadMidiPreset(e.target.value)}
                        className="appearance-none bg-[#0E131F] border border-cyan-500/40 text-cyan-200 text-xs font-mono rounded-lg px-3 py-2 pr-8 hover:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer"
                      >
                        {availableMidiPresets.map((pr) => (
                          <option key={pr.id} value={pr.id} className="bg-[#0B0F19] text-white">
                            {pr.name} {pr.isFactory ? '★' : ''} ({pr.assignments.filter(a => a.ccNumber !== -1).length} CCs)
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none" />
                    </div>

                    {/* Save As New Preset Button */}
                    <button
                      onClick={() => {
                        setNewPresetName(`${currentManifest.name} Custom Map`);
                        setIsSavePresetModalOpen(true);
                      }}
                      className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-900/40 cursor-pointer"
                    >
                      <Save size={13} />
                      <span>Save As...</span>
                    </button>

                    {/* Set Default */}
                    <button
                      onClick={() => handleSetDefaultMidiPreset(activeMidiMapping.id)}
                      title="Set current mapping as default for this plugin"
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-amber-300 border border-amber-500/20 text-xs flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Bookmark size={14} />
                      <span className="hidden sm:inline">Set Default</span>
                    </button>

                    {/* Export JSON */}
                    <button
                      onClick={handleExportMidiPresets}
                      title="Export mapping presets as JSON file"
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#BBC] border border-white/10 text-xs flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Download size={14} />
                      <span className="hidden sm:inline">Export</span>
                    </button>

                    {/* Import JSON */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      title="Import mapping presets from JSON file"
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#BBC] border border-white/10 text-xs flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Upload size={14} />
                      <span className="hidden sm:inline">Import</span>
                    </button>

                    {/* Delete Preset (User presets only) */}
                    {!activeMidiMapping.isFactory && (
                      <button
                        onClick={() => handleDeleteMidiPreset(activeMidiMapping.id)}
                        title="Delete this custom preset"
                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs transition-all cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Preset Metadata & Quick Controller Templates */}
                <div className="mt-4 pt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-[#889] font-mono">
                    <span className="text-white font-semibold">{activeMidiMapping.name}:</span>
                    <span>{activeMidiMapping.description || 'Pre-configured hardware assignments.'}</span>
                  </div>

                  {/* Quick Hardware Switchers */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[#778] uppercase tracking-wider font-mono mr-1">Quick Templates:</span>
                    {availableMidiPresets.map((p) => {
                      const isActive = p.id === activeMidiMapping.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => handleLoadMidiPreset(p.id)}
                          className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-all cursor-pointer ${
                            isActive
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-sm shadow-cyan-500/30'
                              : 'bg-white/5 border-white/10 text-[#889] hover:text-white hover:border-white/20'
                          }`}
                        >
                          {p.name.replace(/Preset|Mapping|Controller/gi, '').trim()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Virtual MIDI Bench & Real-Time Controller Simulator */}
              <div className="p-4 rounded-xl bg-[#090C14] border border-cyan-500/20 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Radio size={18} className="text-emerald-400" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Live Web MIDI Input Engine</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-mono">
                        Active Listener Ready
                      </span>
                    </div>
                    <p className="text-[11px] text-[#778]">
                      Incoming hardware CC messages are automatically mapped, scaled, and dispatched to DSP nodes.
                    </p>
                  </div>
                </div>

                {/* Virtual CC Twist Simulator */}
                <div className="flex items-center gap-3 w-full md:w-auto bg-black/40 p-2.5 rounded-lg border border-white/10">
                  <div className="text-[11px] font-mono text-[#99A] whitespace-nowrap">
                    Test CC Twist:
                  </div>
                  <select
                    value={simulatedCcNumber}
                    onChange={(e) => setSimulatedCcNumber(Number(e.target.value))}
                    className="bg-[#121624] border border-white/15 text-cyan-300 text-xs font-mono rounded px-2 py-1"
                  >
                    {activeMidiMapping.assignments
                      .filter(a => a.ccNumber !== -1)
                      .map(a => {
                        const param = currentManifest.parameters.find(p => p.id === a.paramId);
                        return (
                          <option key={a.paramId} value={a.ccNumber}>
                            CC {a.ccNumber} - {param?.name || a.paramId}
                          </option>
                        );
                      })}
                    {/* Fallback option if none mapped */}
                    <option value={14}>CC 14 (Test CC)</option>
                    <option value={15}>CC 15 (Test CC)</option>
                    <option value={16}>CC 16 (Test CC)</option>
                    <option value={17}>CC 17 (Test CC)</option>
                    <option value={74}>CC 74 (Filter Cutoff)</option>
                  </select>
                  <input
                    type="range"
                    min={0}
                    max={127}
                    value={simulatedCcVal}
                    onChange={(e) => handleSimulateCcTwist(Number(e.target.value))}
                    className="w-28 sm:w-36 accent-cyan-400 cursor-pointer"
                  />
                  <span className="w-8 text-right font-mono text-xs text-cyan-300 font-bold">
                    {simulatedCcVal}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleSimulateCcTwist(0)}
                      className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-white/5 hover:bg-white/10 text-[#889]"
                    >
                      0
                    </button>
                    <button
                      onClick={() => handleSimulateCcTwist(64)}
                      className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-white/5 hover:bg-white/10 text-[#889]"
                    >
                      64
                    </button>
                    <button
                      onClick={() => handleSimulateCcTwist(127)}
                      className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-white/5 hover:bg-white/10 text-[#889]"
                    >
                      127
                    </button>
                  </div>
                </div>
              </div>

              {/* Parameter Assignment Matrix Table */}
              <div className="bg-[#0B0F19] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                <div className="px-5 py-4 border-b border-white/10 bg-black/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders size={16} className="text-cyan-400" />
                    <span className="text-sm font-bold text-white tracking-wider">
                      Parameter MIDI CC Matrix
                    </span>
                    <span className="text-[11px] font-mono text-[#889] ml-2">
                      ({activeMidiMapping.assignments.filter(a => a.ccNumber !== -1).length} of {currentManifest.parameters.length} controls mapped)
                    </span>
                  </div>
                  <div className="text-[11px] text-[#778] font-mono">
                    Click 'LEARN' & turn hardware knob to bind instantly
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.02] text-[#778] uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-4">Plugin Parameter</th>
                        <th className="py-3 px-3">DSP Stage</th>
                        <th className="py-3 px-3">Controller Label</th>
                        <th className="py-3 px-3">MIDI CC#</th>
                        <th className="py-3 px-3">Channel</th>
                        <th className="py-3 px-3">Invert</th>
                        <th className="py-3 px-3">Min / Max Range</th>
                        <th className="py-3 px-3">Curve</th>
                        <th className="py-3 px-4 text-center">MIDI Learn</th>
                        <th className="py-3 px-4">Live Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {currentManifest.parameters.map((param) => {
                        const assignment: VstMidiParamAssignment = activeMidiMapping.assignments.find(a => a.paramId === param.id) || {
                          paramId: param.id,
                          paramName: param.name,
                          ccNumber: -1,
                          channel: -1,
                          min: param.min,
                          max: param.max,
                          inverted: false,
                          curve: 'linear',
                          hardwareLabel: 'Unassigned',
                          enabled: true
                        };
                        const isLearning = learningParamId === param.id;
                        const isMapped = assignment.ccNumber !== -1;
                        const curVal = activeInstance?.paramValues[param.id] ?? param.defaultValue;
                        const valRatio = (curVal - param.min) / (param.max - param.min);

                        return (
                          <tr 
                            key={param.id} 
                            className={`transition-colors ${
                              isLearning 
                                ? 'bg-cyan-500/10 border-l-2 border-cyan-400' 
                                : isMapped 
                                  ? 'hover:bg-white/[0.03]' 
                                  : 'hover:bg-white/[0.02] opacity-75'
                            }`}
                          >
                            {/* Param Name & Unit */}
                            <td className="py-3 px-4">
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>{param.name}</span>
                                {param.unit && (
                                  <span className="text-[10px] text-[#778] font-normal">({param.unit})</span>
                                )}
                              </div>
                              <div className="text-[10px] text-[#667]">ID: {param.id}</div>
                            </td>

                            {/* DSP Target Stage */}
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                                {param.targetStage}
                              </span>
                            </td>

                            {/* Controller Knob Label */}
                            <td className="py-3 px-3">
                              <input
                                type="text"
                                value={assignment.hardwareLabel || ''}
                                placeholder="e.g. K1"
                                onChange={(e) => handleUpdateAssignmentField(param.id, { hardwareLabel: e.target.value })}
                                className="w-20 px-2 py-1 rounded bg-[#121624] border border-white/10 text-white text-[11px] focus:outline-none focus:border-cyan-400"
                              />
                            </td>

                            {/* MIDI CC# Selector */}
                            <td className="py-3 px-3">
                              <select
                                value={assignment.ccNumber}
                                onChange={(e) => handleUpdateAssignmentField(param.id, { ccNumber: Number(e.target.value) })}
                                className={`px-2 py-1 rounded text-[11px] font-mono border focus:outline-none cursor-pointer ${
                                  isMapped 
                                    ? 'bg-cyan-900/30 border-cyan-500/40 text-cyan-200' 
                                    : 'bg-[#121624] border-white/10 text-[#667]'
                                }`}
                              >
                                <option value={-1}>None (Unmapped)</option>
                                {Array.from({ length: 128 }, (_, i) => (
                                  <option key={i} value={i}>
                                    CC {i} {i === 1 ? '(Mod Wheel)' : i === 7 ? '(Volume)' : i === 10 ? '(Pan)' : i === 74 ? '(Cutoff)' : i === 71 ? '(Resonance)' : ''}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Channel Selector */}
                            <td className="py-3 px-3">
                              <select
                                value={assignment.channel === -1 ? 'omni' : assignment.channel}
                                onChange={(e) => {
                                  const val = e.target.value === 'omni' ? -1 : Number(e.target.value);
                                  handleUpdateAssignmentField(param.id, { channel: val });
                                }}
                                className="px-2 py-1 rounded bg-[#121624] border border-white/10 text-white text-[11px] focus:outline-none cursor-pointer"
                              >
                                <option value="omni">Omni</option>
                                {Array.from({ length: 16 }, (_, i) => (
                                  <option key={i + 1} value={i + 1}>
                                    Ch {i + 1}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Invert */}
                            <td className="py-3 px-3">
                              <button
                                onClick={() => handleUpdateAssignmentField(param.id, { inverted: !assignment.inverted })}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer ${
                                  assignment.inverted
                                    ? 'bg-pink-500/20 border-pink-400 text-pink-300 font-bold'
                                    : 'bg-white/5 border-white/10 text-[#778] hover:text-white'
                                }`}
                              >
                                {assignment.inverted ? 'INV' : 'NORM'}
                              </button>
                            </td>

                            {/* Min / Max Range */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1 text-[11px]">
                                <input
                                  type="number"
                                  value={assignment.min}
                                  step={param.unit === 'Hz' ? 10 : 0.1}
                                  onChange={(e) => handleUpdateAssignmentField(param.id, { min: Number(e.target.value) })}
                                  className="w-14 px-1.5 py-0.5 rounded bg-[#121624] border border-white/10 text-white text-[10px]"
                                  title="Minimum scaled value"
                                />
                                <span className="text-[#667]">→</span>
                                <input
                                  type="number"
                                  value={assignment.max}
                                  step={param.unit === 'Hz' ? 10 : 0.1}
                                  onChange={(e) => handleUpdateAssignmentField(param.id, { max: Number(e.target.value) })}
                                  className="w-14 px-1.5 py-0.5 rounded bg-[#121624] border border-white/10 text-white text-[10px]"
                                  title="Maximum scaled value"
                                />
                              </div>
                            </td>

                            {/* Response Curve */}
                            <td className="py-3 px-3">
                              <select
                                value={assignment.curve || 'linear'}
                                onChange={(e) => handleUpdateAssignmentField(param.id, { curve: e.target.value as any })}
                                className="px-2 py-1 rounded bg-[#121624] border border-white/10 text-white text-[10px] focus:outline-none cursor-pointer"
                              >
                                <option value="linear">Linear</option>
                                <option value="logarithmic">Log (Audio)</option>
                                <option value="exponential">Exponential</option>
                              </select>
                            </td>

                            {/* MIDI Learn Button */}
                            <td className="py-3 px-4 text-center">
                              {isLearning ? (
                                <button
                                  onClick={() => handleToggleMidiLearn(param.id)}
                                  className="px-2.5 py-1 rounded-full bg-cyan-500 text-black text-[10px] font-bold tracking-wider animate-pulse flex items-center justify-center gap-1 mx-auto cursor-pointer shadow-lg shadow-cyan-400/50"
                                >
                                  <Radio size={11} className="animate-spin" />
                                  <span>WAITING CC...</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleMidiLearn(param.id)}
                                  className={`px-2.5 py-1 rounded text-[10px] font-mono border transition-all mx-auto flex items-center gap-1 cursor-pointer ${
                                    isMapped
                                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20'
                                      : 'bg-white/5 border-white/10 text-[#889] hover:bg-white/10 hover:text-white'
                                  }`}
                                >
                                  <Radio size={10} />
                                  <span>{isMapped ? 'Re-Learn' : 'Learn CC'}</span>
                                </button>
                              )}
                            </td>

                            {/* Live Value Preview */}
                            <td className="py-3 px-4">
                              <div className="w-24">
                                <div className="flex justify-between text-[10px] mb-1 font-mono text-[#99A]">
                                  <span>{typeof curVal === 'number' ? curVal.toFixed(1) : curVal}</span>
                                  <span className="text-[#667]">{param.unit}</span>
                                </div>
                                <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden border border-white/10">
                                  <div 
                                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-75"
                                    style={{ width: `${Math.min(100, Math.max(0, valRatio * 100))}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer Summary */}
                <div className="px-5 py-3 border-t border-white/10 bg-black/30 flex items-center justify-between text-[11px] text-[#778] font-mono">
                  <div>
                    Stored in local preset bank: <code className="text-cyan-400">strangelet_vst_midi_mapping_presets_v1</code>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        // Clear all CC mappings for current plugin
                        currentManifest.parameters.forEach(p => {
                          handleUpdateAssignmentField(p.id, { ccNumber: -1 });
                        });
                        setMidiStatusMsg('Cleared all CC assignments for current session');
                        setTimeout(() => setMidiStatusMsg(null), 3000);
                      }}
                      className="text-red-400 hover:underline cursor-pointer"
                    >
                      Clear All CCs
                    </button>
                    <span>•</span>
                    <button
                      onClick={() => handleLoadMidiPreset(availableMidiPresets[0]?.id || '')}
                      className="text-cyan-400 hover:underline cursor-pointer"
                    >
                      Reset to Factory Default
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab 2: Parameter Routing & Stage Matrix */}
        {activeTab === 'routing' && (
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-6">
              
              <div className="p-5 rounded-2xl bg-black/40 border border-white/10">
                <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                  <Activity size={16} className="text-cyan-400" />
                  <span>DSP Signal Flow & Parameter Binding Architecture</span>
                </h3>
                <p className="text-xs text-[#99A] leading-relaxed">
                  The Strangelet VST Wrapper layer maps arbitrary plugin parameter slots into a standardized 8-stage
                  Web Audio node chain. When physical knobs on the plugin faceplate are adjusted, they modulate the
                  underlying audio graph in real time without audio glitching or buffer stalls.
                </p>
              </div>

              {/* Node Chain Stage Flow Diagram */}
              <div className="p-5 rounded-2xl bg-[#0B0F19] border border-cyan-500/30">
                <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-4 flex items-center justify-between">
                  <span>Track Signal Flow Diagram</span>
                  <span className="text-[10px] text-[#889]">AudioContext @ 48kHz</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
                  {[
                    { stage: '1. PRE-GAIN', desc: 'Input Trim Stage', target: 'pre_gain', node: 'GainNode (-18 to +18 dB)', color: 'border-amber-500/50 text-amber-300' },
                    { stage: '2. LOW-CUT HPF', desc: 'Subsonic Eliminator', target: 'low_cut', node: 'BiquadFilter (18dB HPF)', color: 'border-pink-500/50 text-pink-300' },
                    { stage: '3. MAIN FILTER', desc: 'Tone / Cutoff / Res', target: 'filter_freq / filter_q', node: 'BiquadFilter (Peak/Lowpass)', color: 'border-cyan-500/50 text-cyan-300' },
                    { stage: '4. WAVESHAPER', desc: 'Analog Tube Saturation', target: 'drive', node: 'WaveShaper (Oversampled 2x)', color: 'border-red-500/50 text-red-300' },
                    { stage: '5. HIGH-CUT LPF', desc: 'Air / Harshness Tame', target: 'high_cut', node: 'BiquadFilter (12dB LPF)', color: 'border-blue-500/50 text-blue-300' },
                    { stage: '6. STEREO PAN', desc: 'Spatial Imager', target: 'pan', node: 'StereoPanner (-1.0 to +1.0)', color: 'border-purple-500/50 text-purple-300' },
                    { stage: '7. POST-GAIN', desc: 'Makeup / Ceiling Limit', target: 'post_gain', node: 'GainNode / Limiter', color: 'border-emerald-500/50 text-emerald-300' },
                    { stage: '8. DRY / WET', desc: 'Parallel Blend Matrix', target: 'dry_wet', node: 'Dual Crossfader Matrix', color: 'border-yellow-500/50 text-yellow-300' }
                  ].map((s, idx) => (
                    <div key={idx} className={`p-3 rounded-xl border bg-black/60 flex flex-col justify-between ${s.color}`}>
                      <div>
                        <div className="font-black text-xs">{s.stage}</div>
                        <div className="text-[10px] text-[#889] mt-0.5">{s.desc}</div>
                      </div>
                      <div className="mt-3 pt-2 border-t border-white/5 text-[9px] text-white/80">
                        {s.node}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Plugin Parameter Map Table */}
              <div className="p-5 rounded-2xl bg-black/40 border border-white/10">
                <div className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                  Current Plugin Mappings: [{currentManifest.name}]
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono text-left">
                    <thead>
                      <tr className="border-b border-white/10 text-[#889]">
                        <th className="pb-2">Parameter</th>
                        <th className="pb-2">Mapped DSP Stage</th>
                        <th className="pb-2">Range</th>
                        <th className="pb-2">Current Value</th>
                        <th className="pb-2">Curve</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {currentManifest.parameters.map((p) => {
                        const val = activeInstance?.paramValues[p.id] ?? p.defaultValue;
                        return (
                          <tr key={p.id} className="text-[#CCC]">
                            <td className="py-2.5 font-bold text-white">{p.name}</td>
                            <td className="py-2.5 text-cyan-300 font-bold">{p.targetStage}</td>
                            <td className="py-2.5 text-[#889]">{p.min} - {p.max} {p.unit}</td>
                            <td className="py-2.5 text-amber-300 font-bold">{val.toFixed(1)} {p.unit}</td>
                            <td className="py-2.5 uppercase text-[10px] text-[#889]">{p.curve || 'linear'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab 3: Custom Non-Native VST Builder */}
        {activeTab === 'builder' && (
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto space-y-6">
              
              <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-blue-950/30 to-black/40 border border-purple-500/40">
                <h3 className="text-base font-bold text-white mb-1.5 flex items-center gap-2">
                  <Sparkles size={16} className="text-purple-400" />
                  <span>Build Custom Non-Native VST Plugin</span>
                </h3>
                <p className="text-xs text-[#99A] leading-relaxed">
                  Design a custom plugin faceplate, declare its parameters, and bind each control directly to any Web Audio
                  gain, filter, drive, or pan stage. Your custom plugin is stored locally and can be loaded on any track.
                </p>
              </div>

              {/* Plugin Metadata Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-[#889] uppercase">Plugin Name</label>
                  <input
                    type="text"
                    value={builderName}
                    onChange={(e) => setBuilderName(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white font-bold text-xs focus:outline-none focus:border-purple-400"
                    placeholder="e.g. Modern Glue Compressor"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#889] uppercase">Developer / Vendor</label>
                  <input
                    type="text"
                    value={builderVendor}
                    onChange={(e) => setBuilderVendor(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white font-bold text-xs focus:outline-none focus:border-purple-400"
                    placeholder="e.g. Acme Audio Labs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#889] uppercase">Plugin Format</label>
                  <select
                    value={builderFormat}
                    onChange={(e) => setBuilderFormat(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-cyan-300 font-bold text-xs focus:outline-none"
                  >
                    <option value="VST3">VST3 (Steinberg 64-bit)</option>
                    <option value="CLAP">CLAP (Clever Audio Plugin)</option>
                    <option value="AU">AU (Audio Units v2)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#889] uppercase">Chassis Faceplate Theme</label>
                  <select
                    value={builderTheme}
                    onChange={(e) => setBuilderTheme(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-amber-300 font-bold text-xs focus:outline-none"
                  >
                    <option value="analog_tube">Analog Tube (Warm Amber & Wood)</option>
                    <option value="british_console">British Console (Neve Blue-Grey)</option>
                    <option value="cyberpunk_neon">Cyberpunk Neon (Tokyo Cyan & Magenta)</option>
                    <option value="mastering_gold">Mastering Gold (Precision Anodized)</option>
                    <option value="brushed_steel">Brushed Steel (Vintage Tape Rack)</option>
                  </select>
                </div>
              </div>

              {/* Parameter Editor */}
              <div className="p-5 rounded-2xl bg-black/50 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Assigned Parameters ({builderParams.length}/6)
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAutoMapBuilderParams}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600/30 border border-indigo-500/50 hover:bg-indigo-600 text-indigo-200 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_8px_rgba(99,102,241,0.2)]"
                      title="Auto-Map: Analyze parameter names to automatically set target DSP stages and units"
                    >
                      <Wand2 size={12} className="text-cyan-400" />
                      <span>Auto-Detect Stages</span>
                    </button>

                    {builderParams.length < 6 && (
                      <button
                        onClick={() => {
                          const newParam: VstParameterDefinition = {
                            id: `param-${Date.now()}`,
                            name: `KNOB ${builderParams.length + 1}`,
                            targetStage: 'filter_freq',
                            min: 200,
                            max: 12000,
                            defaultValue: 2500,
                            unit: 'Hz'
                          };
                          setBuilderParams([...builderParams, newParam]);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-purple-600/30 border border-purple-500/50 hover:bg-purple-600 text-purple-200 hover:text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={12} />
                        <span>Add Parameter</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5">
                  {builderParams.map((p, idx) => (
                    <div key={p.id} className="p-3 rounded-xl bg-[#0E121B] border border-white/10 flex flex-wrap items-center gap-3 text-xs">
                      <div className="w-6 h-6 rounded-full bg-black/60 border border-white/20 flex items-center justify-center font-bold text-white text-[10px]">
                        {idx + 1}
                      </div>

                      <div className="flex-1 min-w-[130px]">
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) => {
                            const next = [...builderParams];
                            next[idx].name = e.target.value;
                            setBuilderParams(next);
                          }}
                          className="w-full px-2 py-1 bg-black/40 border border-white/10 rounded text-white font-bold text-xs"
                          placeholder="Param Name"
                        />
                      </div>

                      <div className="w-40">
                        <select
                          value={p.targetStage}
                          onChange={(e) => {
                            const next = [...builderParams];
                            next[idx].targetStage = e.target.value as VstDspTargetStage;
                            setBuilderParams(next);
                          }}
                          className="w-full px-2 py-1 bg-black/40 border border-white/10 rounded text-cyan-300 font-bold text-xs"
                        >
                          <option value="pre_gain">Input Gain (dB)</option>
                          <option value="low_cut">Low Cut HPF (Hz)</option>
                          <option value="filter_freq">Filter Cutoff (Hz)</option>
                          <option value="filter_q">Filter Res (Q)</option>
                          <option value="filter_gain">Filter Gain (dB)</option>
                          <option value="drive">Drive / Saturation (%)</option>
                          <option value="high_cut">High Cut LPF (Hz)</option>
                          <option value="pan">Stereo Pan (-1..+1)</option>
                          <option value="post_gain">Output Level (dB)</option>
                          <option value="dry_wet">Dry/Wet Mix (%)</option>
                        </select>
                      </div>

                      <button
                        onClick={() => {
                          setBuilderParams(builderParams.filter((_, i) => i !== idx));
                        }}
                        className="text-[#889] hover:text-red-400 p-1"
                        title="Delete parameter"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleCreateCustomPlugin}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-extrabold text-sm shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save size={16} />
                <span>Compile & Insert Custom Non-Native Plugin</span>
              </button>

            </div>
          </div>
        )}

        {/* Tab 4: Desktop VST Bridge Guide */}
        {activeTab === 'desktop_guide' && (
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto space-y-6">
              
              {/* Runtime Environment Status Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0D1525] via-[#101B30] to-[#0A101C] border border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.15)] flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-cyan-400 font-black text-sm uppercase mb-1">
                    <ShieldCheck size={18} />
                    <span>Hybrid Workstation: Web Browser & Native Desktop Builds</span>
                  </div>
                  <p className="text-xs text-[#A8B4D4] leading-relaxed max-w-xl">
                    Strangelet Lab operates seamlessly as a zero-install web application via Web Audio & Faust Wasm, 
                    and also compiles into a native <strong className="text-white">Tauri</strong> or <strong className="text-white">Electron</strong> desktop binary capable of loading system VST3 & AU dynamic libraries natively.
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1.5 font-mono text-xs">
                  <span className="text-[10px] text-[#778] uppercase font-bold">Detected Runtime:</span>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 border border-emerald-500/50 text-emerald-300">
                    <Globe size={13} className="text-emerald-400 animate-pulse" />
                    <span className="font-bold">WEB (SANDBOXED DSP)</span>
                  </div>
                </div>
              </div>

              {/* Native Plugin Scanner Interactive Test */}
              <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <FolderSearch size={15} className="text-amber-400" />
                      <span>System VST3 / AU Plugin Scanner</span>
                    </h3>
                    <p className="text-[11px] text-[#889] mt-0.5">
                      Scans standard operating system directories (<code className="text-white">C:\Program Files\Common Files\VST3</code> / <code className="text-white">/Library/Audio/Plug-Ins/VST3</code>)
                    </p>
                  </div>

                  <button
                    onClick={handleScanNativeDesktopPlugins}
                    disabled={nativeScanLoading}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.3)] transition-all active:scale-95"
                  >
                    <RefreshCw size={13} className={nativeScanLoading ? "animate-spin" : ""} />
                    <span>{nativeScanLoading ? "Scanning Directories..." : "Scan System VSTs"}</span>
                  </button>
                </div>

                {scannedNativePlugins.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/10 animate-fade-in font-mono text-xs">
                    <div className="text-[10px] uppercase font-bold text-[#778] flex items-center justify-between">
                      <span>Discovered Native Plugins ({scannedNativePlugins.length})</span>
                      <span className="text-emerald-400 font-bold">Ready for Desktop Bridge</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                      {scannedNativePlugins.map(p => (
                        <div key={p.id} className="p-3 rounded-xl bg-[#0E131F] border border-white/10 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-xs truncate">{p.name}</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                                {p.format}
                              </span>
                              <span className="text-[9px] text-[#889]">{p.vendor}</span>
                            </div>
                            <div className="text-[10px] text-[#667] truncate mt-0.5">{p.path}</div>
                          </div>

                          <button
                            onClick={() => handleToggleNativeEditor(p)}
                            className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/50 text-[11px] font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
                          >
                            <Monitor size={12} />
                            <span>
                              {activeNativeInstance?.pluginId === p.id && activeNativeInstance.isWindowOpen
                                ? "Hide GUI"
                                : "Launch GUI Frame"}
                            </span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 4 Architectural Approaches Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                
                <div className="p-4 rounded-xl bg-black/50 border border-white/10 space-y-2">
                  <div className="text-white font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Approach A: Electron / Tauri C++ Node Addon</span>
                  </div>
                  <p className="text-[#889] text-[11px] leading-relaxed">
                    Compiles the Steinberg VST3 SDK or JUCE <code className="text-white">AudioPluginInstance</code> as a C++ Node.js native addon (<code className="text-white">.node</code>). Audio buffers from the frontend flow through zero-copy shared memory directly to the native VST process.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-black/50 border border-white/10 space-y-2">
                  <div className="text-white font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span>Approach B: IPC Plugin Daemon (Carla / Element)</span>
                  </div>
                  <p className="text-[#889] text-[11px] leading-relaxed">
                    A lightweight headless daemon (like Carla, Kushview Element, or yabridge) runs locally and communicates with Strangelet Lab over low-latency WebSockets or Unix domain sockets, rendering native plugins in external windows.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-black/50 border border-white/10 space-y-2">
                  <div className="text-white font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    <span>Approach C: WebAssembly (Wasm) CLAP & Faust</span>
                  </div>
                  <p className="text-[#889] text-[11px] leading-relaxed">
                    Open-source C/C++ plugins compiled to WebAssembly (Wasm) run directly in the browser with near-native DSP performance. Strangelet Lab already supports live Faust DSP compilation for custom audio toys!
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-black/50 border border-white/10 space-y-2">
                  <div className="text-white font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>Approach D: VST Wrapper Layer (Active Now)</span>
                  </div>
                  <p className="text-[#889] text-[11px] leading-relaxed">
                    Simulates standard VST3 host behaviors: parameter normalization, preset saving, A/B comparison, and direct mapping to 32-bit floating point Web Audio gain/pan/filter/waveshaper stages.
                  </p>
                </div>

              </div>

              {/* Ready-to-Run Desktop Packaging Commands */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-black border border-white/15 text-xs font-mono space-y-2">
                  <div className="text-cyan-400 text-[10px] uppercase font-bold flex items-center gap-1.5">
                    <FileCode size={13} />
                    <span>Tauri 2.0 Native Build:</span>
                  </div>
                  <pre className="p-2.5 rounded bg-[#090C14] text-emerald-400 text-[11px] select-all overflow-x-auto leading-relaxed">
                    npm run tauri dev{'\n'}
                    npm run tauri build
                  </pre>
                  <p className="text-[10px] text-[#778]">Produces high-performance lightweight native installer with Rust/C++ JUCE bindings.</p>
                </div>

                <div className="p-4 rounded-xl bg-black border border-white/15 text-xs font-mono space-y-2">
                  <div className="text-purple-400 text-[10px] uppercase font-bold flex items-center gap-1.5">
                    <FileCode size={13} />
                    <span>Electron Native Build:</span>
                  </div>
                  <pre className="p-2.5 rounded bg-[#090C14] text-purple-300 text-[11px] select-all overflow-x-auto leading-relaxed">
                    electron ./desktop/electron-main.cjs{'\n'}
                    npm run electron:build
                  </pre>
                  <p className="text-[10px] text-[#778]">Launches the pre-configured Electron wrapper in <code className="text-white">desktop/electron-main.cjs</code>.</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Hidden File Input for MIDI Preset JSON Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportMidiPresets}
        accept=".json"
        className="hidden"
      />

      {/* Save MIDI Preset Modal Dialog */}
      {isSavePresetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0C101A] border border-cyan-500/40 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-black/60 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
                  <Bookmark size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white tracking-wide">
                    Save MIDI Mapping Preset
                  </h4>
                  <p className="text-[10px] text-[#889] font-mono">
                    Target: {currentManifest.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSavePresetModalOpen(false)}
                className="p-1 rounded-lg text-[#889] hover:text-white hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <div className="p-6 space-y-4 text-xs font-mono">
              <div>
                <label className="block text-[#99A] text-[11px] mb-1.5 font-bold uppercase tracking-wider">
                  Preset Name *
                </label>
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="e.g. Stage Performance Map"
                  className="w-full px-3 py-2 rounded-lg bg-[#121624] border border-white/15 text-white focus:outline-none focus:border-cyan-400 text-xs"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[#99A] text-[11px] mb-1.5 font-bold uppercase tracking-wider">
                  Hardware Controller Template
                </label>
                <select
                  value={newPresetTemplate}
                  onChange={(e) => setNewPresetTemplate(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-[#121624] border border-white/15 text-cyan-200 focus:outline-none focus:border-cyan-400 text-xs cursor-pointer"
                >
                  <option value="Akai MPK Mini">Akai MPK Mini Series (8 Knobs)</option>
                  <option value="Arturia MiniLab / BeatStep">Arturia MiniLab / BeatStep</option>
                  <option value="Novation Launch Control">Novation Launch Control XL</option>
                  <option value="Korg nanoKONTROL">Korg nanoKONTROL2</option>
                  <option value="Expressive Macros">Expressive Macros</option>
                  <option value="Custom">Custom Hardware / Generic CC Map</option>
                </select>
              </div>

              <div>
                <label className="block text-[#99A] text-[11px] mb-1.5 font-bold uppercase tracking-wider">
                  Description / Notes (Optional)
                </label>
                <textarea
                  value={newPresetDesc}
                  onChange={(e) => setNewPresetDesc(e.target.value)}
                  placeholder="Notes about controller layout, knob mapping, or live performance use..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-[#121624] border border-white/15 text-white focus:outline-none focus:border-cyan-400 text-xs resize-none"
                />
              </div>

              <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-[11px] text-cyan-300/80 leading-relaxed">
                Will store <span className="font-bold text-white">{activeMidiMapping.assignments.filter(a => a.ccNumber !== -1).length} active CC mappings</span> with custom ranges, curves, and channel settings in your Strangelet browser bank.
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-black/40 border-t border-white/10 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsSavePresetModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-mono text-[#889] hover:text-white hover:bg-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMidiPreset}
                disabled={!newPresetName.trim()}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-xs font-mono flex items-center gap-1.5 shadow-lg shadow-cyan-950 cursor-pointer"
              >
                <Save size={14} />
                <span>Save Preset</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
