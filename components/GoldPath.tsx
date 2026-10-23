import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Settings2, 
  Upload, 
  Download, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Save, 
  Check, 
  Info, 
  Layers, 
  Zap, 
  ShieldCheck, 
  Sliders, 
  Volume2, 
  Activity, 
  X, 
  FileCode,
  Music,
  Share2,
  FolderOpen
} from 'lucide-react';
import BigKnob from './BigKnob';
import ImportArea from './ImportArea';
import { GoldPathSpectralVisualizer } from './GoldPathSpectralVisualizer';
import { 
  GoldPathPreset, 
  GoldPathStageToggles, 
  GoldPathChainParameters 
} from '../types';
import { 
  FACTORY_GOLD_PATH_PRESETS, 
  loadAllGoldPathPresets, 
  saveUserGoldPathPreset, 
  deleteUserGoldPathPreset, 
  exportGoldPathPresetJson, 
  importGoldPathPresetJson, 
  syncGoldPathToMasterBus,
  STORAGE_KEY_ACTIVE_PRESET_ID
} from '../lib/goldPathPresets';
import { playLaserBeamSound, playColliderInjectionSound } from '../lib/laserSound';
import { masterAudioBus } from '../lib/masterBus';

interface GoldPathProps {
  onRunPipeline?: (config: GoldPathPreset) => void;
  onOpenBatchView?: () => void;
}

export const GoldPath: React.FC<GoldPathProps> = ({ onRunPipeline, onOpenBatchView }) => {
  // Preset System State
  const [presets, setPresets] = useState<GoldPathPreset[]>(() => loadAllGoldPathPresets());
  const [activePresetId, setActivePresetId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem(STORAGE_KEY_ACTIVE_PRESET_ID);
      if (savedId) return savedId;
    }
    return FACTORY_GOLD_PATH_PRESETS[0].id;
  });

  // Current Working Chain Configuration
  const initialPreset = presets.find(p => p.id === activePresetId) || presets[0] || FACTORY_GOLD_PATH_PRESETS[0];
  const [currentStages, setCurrentStages] = useState<GoldPathStageToggles>({ ...initialPreset.stages });
  const [currentParams, setCurrentParams] = useState<GoldPathChainParameters>({ ...initialPreset.parameters });
  const [masterIntensity, setMasterIntensity] = useState<number>(initialPreset.masterIntensity);
  const [isModified, setIsModified] = useState<boolean>(false);

  // Reference Track & Processing State
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Save Modal State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [saveName, setSaveName] = useState<string>('');
  const [saveDesc, setSaveDesc] = useState<string>('');
  const [saveAuthor, setSaveAuthor] = useState<string>('Mastering Engineer');

  // A/B Auditioning State
  const [abSlot, setAbSlot] = useState<'A' | 'B'>('A');
  const [bMode, setBMode] = useState<'dry' | 'saved_preset'>('dry');

  // File import ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active preset object
  const activePreset = presets.find(p => p.id === activePresetId) || presets[0] || FACTORY_GOLD_PATH_PRESETS[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const applyAbSlot = (target: 'A' | 'B', modeOverride?: 'dry' | 'saved_preset') => {
    const effectiveBMode = modeOverride || bMode;
    if (target === 'A') {
      setAbSlot('A');
      masterAudioBus.setMasteringBypass(false);
      syncGoldPathToMasterBus({
        ...activePreset,
        stages: currentStages,
        parameters: currentParams,
        masterIntensity
      });
      playLaserBeamSound('laser_select');
      showToast('A/B Audition: Slot [A] Tweaked Working Chain');
    } else {
      setAbSlot('B');
      if (effectiveBMode === 'dry') {
        masterAudioBus.setMasteringBypass(true);
        playLaserBeamSound('laser_erase');
        showToast('A/B Audition: Slot [B] Original Dry Signal (100% Bypass)');
      } else {
        masterAudioBus.setMasteringBypass(false);
        syncGoldPathToMasterBus(activePreset);
        playLaserBeamSound('laser_curve');
        showToast(`A/B Audition: Slot [B] Saved Preset Baseline ("${activePreset.name}")`);
      }
    }
  };

  const handleToggleAb = () => {
    applyAbSlot(abSlot === 'A' ? 'B' : 'A');
  };

  // Sync chain changes to Master Audio Bus (when in slot A)
  useEffect(() => {
    if (abSlot === 'A') {
      syncGoldPathToMasterBus({
        ...activePreset,
        stages: currentStages,
        parameters: currentParams,
        masterIntensity
      });
    }
  }, [currentParams, currentStages, masterIntensity, activePreset, abSlot]);

  // Load a preset by ID
  const handleSelectPreset = (presetId: string) => {
    const selected = presets.find(p => p.id === presetId);
    if (!selected) return;

    setActivePresetId(selected.id);
    setCurrentStages({ ...selected.stages });
    setCurrentParams({ ...selected.parameters });
    setMasterIntensity(selected.masterIntensity);
    setIsModified(false);

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_ACTIVE_PRESET_ID, selected.id);
    }

    syncGoldPathToMasterBus(selected);
    playLaserBeamSound('laser_select');
    showToast(`Loaded Gold Path preset: "${selected.name}"`);
  };

  // Revert changes back to current preset defaults
  const handleRevertChanges = () => {
    if (!activePreset) return;
    setCurrentStages({ ...activePreset.stages });
    setCurrentParams({ ...activePreset.parameters });
    setMasterIntensity(activePreset.masterIntensity);
    setIsModified(false);
    syncGoldPathToMasterBus(activePreset);
    playLaserBeamSound('laser_erase');
    showToast(`Reverted back to "${activePreset.name}" defaults.`);
  };

  // Open Save Modal
  const handleOpenSaveModal = () => {
    setSaveName(activePreset.category === 'User' ? activePreset.name : `${activePreset.name} (Custom)`);
    setSaveDesc(activePreset.description);
    setSaveAuthor(activePreset.author || 'Mastering Engineer');
    setIsSaveModalOpen(true);
  };

  // Confirm Save as User Preset
  const handleConfirmSavePreset = () => {
    if (!saveName.trim()) {
      showToast('Please enter a valid preset name.');
      return;
    }

    const newPresetId = `user-gp-${Date.now()}`;
    const newPreset: GoldPathPreset = {
      id: newPresetId,
      name: saveName.trim(),
      category: 'User',
      description: saveDesc.trim() || 'Custom user Gold Path mastering chain configuration.',
      author: saveAuthor.trim() || 'Mastering Engineer',
      createdAt: new Date().toISOString().split('T')[0],
      masterIntensity,
      stages: { ...currentStages },
      parameters: { ...currentParams }
    };

    const updated = saveUserGoldPathPreset(newPreset);
    setPresets(updated);
    setActivePresetId(newPresetId);
    setIsModified(false);
    setIsSaveModalOpen(false);

    playColliderInjectionSound();
    showToast(`Successfully saved new preset: "${newPreset.name}"!`);
  };

  // Quick Overwrite for existing User Preset
  const handleUpdateCurrentPreset = () => {
    if (activePreset.category !== 'User') return;

    const updatedPreset: GoldPathPreset = {
      ...activePreset,
      masterIntensity,
      stages: { ...currentStages },
      parameters: { ...currentParams }
    };

    const updated = saveUserGoldPathPreset(updatedPreset);
    setPresets(updated);
    setIsModified(false);

    playColliderInjectionSound();
    showToast(`Updated preset "${activePreset.name}" with current settings.`);
  };

  // Delete User Preset
  const handleDeletePreset = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete user preset "${name}"?`)) {
      const updated = deleteUserGoldPathPreset(id);
      setPresets(updated);
      const fallback = updated[0] || FACTORY_GOLD_PATH_PRESETS[0];
      handleSelectPreset(fallback.id);
      playLaserBeamSound('laser_erase');
      showToast(`Deleted preset "${name}".`);
    }
  };

  // Export Active Preset as JSON file
  const handleExportPreset = () => {
    const presetToExport: GoldPathPreset = {
      ...activePreset,
      name: isModified ? `${activePreset.name} (Custom)` : activePreset.name,
      masterIntensity,
      stages: { ...currentStages },
      parameters: { ...currentParams }
    };

    const jsonStr = exportGoldPathPresetJson(presetToExport);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${presetToExport.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_goldpath.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    playLaserBeamSound('laser_curve');
    showToast(`Exported "${presetToExport.name}" JSON file.`);
  };

  // Trigger Import JSON
  const handleTriggerImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = importGoldPathPresetJson(content);
        const updated = loadAllGoldPathPresets();
        setPresets(updated);
        handleSelectPreset(imported.id);
        playColliderInjectionSound();
        showToast(`Imported preset: "${imported.name}"!`);
      } catch (err: any) {
        alert(err.message || 'Failed to import preset file.');
      }
    };
    reader.readAsText(file);
  };

  // Stage toggle helper
  const toggleStage = (key: keyof GoldPathStageToggles) => {
    setCurrentStages(prev => ({ ...prev, [key]: !prev[key] }));
    setIsModified(true);
    playLaserBeamSound('laser_select');
  };

  // Param update helper
  const updateParam = <K extends keyof GoldPathChainParameters>(key: K, val: GoldPathChainParameters[K]) => {
    setCurrentParams(prev => ({ ...prev, [key]: val }));
    setIsModified(true);
  };

  // BigKnob Intensity change
  const handleIntensityChange = (val: number) => {
    setMasterIntensity(val);
    setIsModified(true);
  };

  // Run pipeline trigger
  const handleRunPipeline = () => {
    setIsProcessing(!isProcessing);
    playColliderInjectionSound();
    if (!isProcessing) {
      showToast(`Running Gold Path Mastering Chain with "${activePreset.name}" configuration...`);
      if (onRunPipeline) {
        onRunPipeline({
          ...activePreset,
          stages: currentStages,
          parameters: currentParams,
          masterIntensity
        });
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in font-mono select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[9999] px-4 py-2.5 rounded-xl bg-amber-950/95 border border-amber-400 text-amber-200 text-xs shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center gap-2 animate-fade-in backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden File Input for Preset Import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImportFileChange} 
        accept=".json" 
        className="hidden" 
      />

      {/* ========================================================================= */}
      {/* PRESET SYSTEM DECK / MASTERING PRESET CONTROLLER                          */}
      {/* ========================================================================= */}
      <div className="bg-[#090C19] border border-[#212948] rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col gap-4">
        
        {/* Top Deck: Header, Active Preset Selector & Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1A213B] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 via-yellow-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
              <Sparkles className="w-5 h-5 text-[#FFD700]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wider uppercase flex items-center gap-2">
                  GOLD PATH MASTERING CHAIN
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/50 text-amber-300 font-bold">
                  PRESET SYSTEM
                </span>
                {isModified && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 font-bold animate-pulse">
                    &bull; MODIFIED
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#7E88AA]">
                Save, load, and calibrate complete multi-stage Gold Path master chain configurations.
              </p>
            </div>
          </div>

          {/* Preset Selector Dropdown & Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Preset Selector */}
            <div className="flex items-center bg-[#050711] border border-[#2A345B] rounded-xl px-2 py-1 shadow-inner">
              <span className="text-[10px] font-bold text-[#64748B] uppercase px-1.5 flex items-center gap-1">
                <FolderOpen size={11} className="text-amber-400" />
                PRESET:
              </span>
              <select
                value={activePresetId}
                onChange={(e) => handleSelectPreset(e.target.value)}
                className="bg-transparent text-xs font-bold text-amber-300 focus:outline-none cursor-pointer py-1 max-w-[200px] sm:max-w-xs truncate"
              >
                <optgroup label="FACTORY GOLD PATH PRESETS">
                  {presets.filter(p => p.category === 'Factory').map(p => (
                    <option key={p.id} value={p.id} className="bg-[#0C0F1E] text-white">
                      {p.name}
                    </option>
                  ))}
                </optgroup>
                {presets.some(p => p.category === 'User') && (
                  <optgroup label="USER CUSTOM PRESETS">
                    {presets.filter(p => p.category === 'User').map(p => (
                      <option key={p.id} value={p.id} className="bg-[#0C0F1E] text-cyan-300">
                        ⭐ {p.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Revert Button (when modified) */}
            {isModified && (
              <button
                onClick={handleRevertChanges}
                className="px-2.5 py-1.5 rounded-xl bg-[#141B2D] border border-[#253254] hover:border-amber-400 text-amber-300 text-xs font-bold flex items-center gap-1 transition-colors"
                title="Revert parameters to original preset defaults"
              >
                <RotateCcw size={12} />
                <span className="hidden sm:inline">Revert</span>
              </button>
            )}

            {/* Save New Preset Button */}
            <button
              onClick={handleOpenSaveModal}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-black text-xs font-extrabold flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all"
              title="Save current chain settings as a new custom preset"
            >
              <Save size={13} />
              <span>Save As...</span>
            </button>

            {/* Overwrite button if user preset */}
            {activePreset.category === 'User' && (
              <>
                <button
                  onClick={handleUpdateCurrentPreset}
                  disabled={!isModified}
                  className="px-2.5 py-1.5 rounded-xl bg-[#141B2D] border border-[#253254] hover:border-cyan-400 text-cyan-300 text-xs font-bold flex items-center gap-1 transition-colors disabled:opacity-40"
                  title="Overwrite this user preset with current settings"
                >
                  <Check size={12} />
                  <span className="hidden sm:inline">Update</span>
                </button>

                <button
                  onClick={() => handleDeletePreset(activePreset.id, activePreset.name)}
                  className="p-1.5 rounded-xl bg-red-950/50 border border-red-500/40 text-red-400 hover:text-white hover:bg-red-900 transition-colors"
                  title="Delete this user preset"
                >
                  <Trash2 size={13} />
                </button>
              </>
            )}

            {/* Export & Import JSON */}
            <div className="flex items-center gap-1 border-l border-[#1F2744] pl-2">
              <button
                onClick={handleExportPreset}
                className="p-1.5 rounded-xl text-[#7E88AA] hover:text-white hover:bg-[#161D30] transition-colors"
                title="Export preset configuration to JSON"
              >
                <Download size={14} />
              </button>

              <button
                onClick={handleTriggerImport}
                className="p-1.5 rounded-xl text-[#7E88AA] hover:text-white hover:bg-[#161D30] transition-colors"
                title="Import preset configuration from JSON"
              >
                <Upload size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Preset Info Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#050711] p-3 rounded-xl border border-[#182138] text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-950/80 border border-amber-500/40 text-amber-300 shrink-0">
              {activePreset.category}
            </span>
            <p className="text-[#A0AEC0] truncate">
              {activePreset.description}
            </p>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-[#7E88AA] shrink-0">
            <div>
              <span>Target: </span>
              <span className="font-bold text-emerald-300">{currentParams.targetLufs} LUFS</span>
            </div>
            <div>
              <span>Ceiling: </span>
              <span className="font-bold text-amber-300">{currentParams.ceilingDb} dBFS</span>
            </div>
            <div>
              <span>Intensity: </span>
              <span className="font-bold text-cyan-300">{Math.round(masterIntensity * 100)}%</span>
            </div>
          </div>
        </div>

        {/* A/B Audition Console in Gold Path */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#060914] border border-[#1D2544]">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <RotateCcw size={12} className="text-[#FFD700]" />
              A/B COMPARISON:
            </span>

            {/* A/B Toggle Segment */}
            <div className="flex items-center bg-[#0C1022] p-0.5 rounded-lg border border-[#212C4E]">
              <button
                onClick={() => applyAbSlot('A')}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                  abSlot === 'A'
                    ? 'bg-amber-400 text-black shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                    : 'text-[#7E88AA] hover:text-white'
                }`}
                title="Audition current working chain settings (Slot A)"
              >
                [A] Tweaked Working Chain
              </button>
              <button
                onClick={handleToggleAb}
                className="px-1.5 py-1 text-[#64748B] hover:text-amber-300 cursor-pointer"
                title="Flip A/B (Press B)"
              >
                &harr;
              </button>
              <button
                onClick={() => applyAbSlot('B')}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                  abSlot === 'B'
                    ? bMode === 'dry'
                      ? 'bg-cyan-400 text-black shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                      : 'bg-purple-400 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                    : 'text-[#7E88AA] hover:text-white'
                }`}
                title={`Audition Slot B: ${bMode === 'dry' ? 'Original Dry Signal (Bypass)' : 'Saved Preset Baseline'}`}
              >
                [B] {bMode === 'dry' ? 'Original Dry Signal' : 'Saved Preset Baseline'}
              </button>
            </div>

            {/* B Comparison Target Selector */}
            <div className="flex items-center gap-1 text-[11px] text-[#7E88AA]">
              <span>Compare against:</span>
              <select
                value={bMode}
                onChange={(e) => {
                  const next = e.target.value as 'dry' | 'saved_preset';
                  setBMode(next);
                  if (abSlot === 'B') {
                    applyAbSlot('B', next);
                  }
                }}
                className="bg-[#0C1022] border border-[#232F52] text-amber-300 text-xs font-bold rounded px-2 py-0.5 focus:outline-none cursor-pointer"
              >
                <option value="dry">Original Dry Signal (100% Bypass)</option>
                <option value="saved_preset">Saved Preset State ("{activePreset.name}")</option>
              </select>
            </div>
          </div>

          <div className="text-[10px] font-mono text-[#8E94B4] flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              abSlot === 'A' ? 'bg-amber-400 animate-pulse' : bMode === 'dry' ? 'bg-cyan-400 animate-ping' : 'bg-purple-400 animate-ping'
            }`} />
            <span>Auditioning: <strong className={abSlot === 'A' ? 'text-amber-300' : bMode === 'dry' ? 'text-cyan-300' : 'text-purple-300'}>
              {abSlot === 'A' ? 'Current Tweaked DSP [A]' : bMode === 'dry' ? 'Original Dry Signal [B]' : `Saved Preset Baseline [B]`}
            </strong></span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN CHAIN ARCHITECTURE: PIPELINE STAGES & INTENSITY CONTROLLER           */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Gold Path Pipeline Stages */}
        <div className="lg:col-span-2 bg-[#090C19] border border-[#212948] rounded-2xl p-5 flex flex-col gap-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings2 size={16} className="text-[#FFD700]" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Chain Modules & Active Stages
              </h4>
            </div>
            <span className="text-[10px] text-[#64748B]">
              Toggle stages in the signal path
            </span>
          </div>

          {/* 8 Primary Stage Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'matchering', label: 'Reference Matchering', desc: 'Spectral curve alignment against reference audio track.' },
              { key: 'multiband', label: 'Multiband Dynamics', desc: 'Crossover frequency compression and glue control.' },
              { key: 'limiter', label: 'Brickwall Peak Limiter', desc: 'Final loudness maximizer with true-peak safety.' },
              { key: 'tapeSaturation', label: 'Analog Tape / Tube Warmth', desc: 'Non-linear harmonic saturation and subtle soft-clipping.' },
              { key: 'stereoImager', label: 'Stereo Imager & Mono Sub', desc: 'Sub-bass mono lock with high-mid stereo widening.' },
              { key: 'vst', label: 'External VST FX Slot', desc: 'Custom Faust DSP or external Toy VST routing.' },
              { key: 'spectralAnalysis', label: 'D3 Spectral Analyzer', desc: 'High-precision logarithmic FFT spectral analysis.' },
              { key: 'batchProcessing', label: 'Batch Export Pipeline', desc: 'Multi-stem master export processing.' }
            ].map(item => {
              const active = currentStages[item.key as keyof GoldPathStageToggles];
              return (
                <div 
                  key={item.key} 
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    active 
                      ? 'bg-[#0E1428] border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.12)]' 
                      : 'bg-[#050711] border-[#182138] opacity-75'
                  }`}
                >
                  <div className="flex flex-col pr-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${active ? 'text-white' : 'text-[#7E88AA]'}`}>
                        {item.label}
                      </span>
                      {item.key === 'batchProcessing' && onOpenBatchView && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenBatchView();
                          }}
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all cursor-pointer"
                        >
                          Open Batch &rarr;
                        </button>
                      )}
                    </div>
                    <span className="text-[10px] text-[#64748B] leading-tight">
                      {item.desc}
                    </span>
                  </div>

                  <button 
                    onClick={() => toggleStage(item.key as keyof GoldPathStageToggles)}
                    className={`w-11 h-6 rounded-full transition-colors shrink-0 p-0.5 ${
                      active ? 'bg-[#FFD700]' : 'bg-[#1C253D]'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-black transition-transform ${
                      active ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Interactive Parameter Controls for Active Stages */}
          <div className="border-t border-[#1A213B] pt-4 flex flex-col gap-4">
            <h5 className="text-xs font-bold text-[#A0AEC0] uppercase tracking-wider flex items-center gap-1.5">
              <Sliders size={13} className="text-amber-400" />
              <span>Calibrated Stage Parameters</span>
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Pre-EQ Filtering Card */}
              <div className="p-3.5 rounded-xl bg-[#060814] border border-[#1A223B] flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-pink-400">1. Sub Filtering & Air EQ</span>
                  <span className="text-[10px] text-[#64748B]">Pre-EQ</span>
                </div>
                
                <div className="space-y-2 text-[11px]">
                  <div>
                    <div className="flex justify-between text-[#A0AEC0] mb-1">
                      <span>Low Cut (HPF):</span>
                      <span className="font-bold text-pink-300">{currentParams.lowCutHz} Hz</span>
                    </div>
                    <input 
                      type="range" min="20" max="50" step="1" 
                      value={currentParams.lowCutHz} 
                      onChange={e => updateParam('lowCutHz', parseInt(e.target.value))}
                      className="w-full accent-pink-400 cursor-pointer h-1.5 bg-[#141C31] rounded"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[#A0AEC0] mb-1">
                      <span>De-Mud Notch (400Hz):</span>
                      <span className="font-bold text-emerald-300">{currentParams.deMudGainDb.toFixed(1)} dB</span>
                    </div>
                    <input 
                      type="range" min="-6.0" max="1.0" step="0.2" 
                      value={currentParams.deMudGainDb} 
                      onChange={e => updateParam('deMudGainDb', parseFloat(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-[#141C31] rounded"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[#A0AEC0] mb-1">
                      <span>Presence / Air Boost:</span>
                      <span className="font-bold text-cyan-300">+{currentParams.presenceAirDb.toFixed(1)} dB</span>
                    </div>
                    <input 
                      type="range" min="-2.0" max="5.0" step="0.2" 
                      value={currentParams.presenceAirDb} 
                      onChange={e => updateParam('presenceAirDb', parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#141C31] rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Multiband & Glue Compression Card */}
              <div className="p-3.5 rounded-xl bg-[#060814] border border-[#1A223B] flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400">2. Multiband & Glue Dynamics</span>
                  <span className="text-[10px] text-[#64748B]">Dynamics</span>
                </div>

                <div className="space-y-2 text-[11px]">
                  <div>
                    <div className="flex justify-between text-[#A0AEC0] mb-1">
                      <span>Threshold:</span>
                      <span className="font-bold text-amber-300">{currentParams.compressionThresholdDb} dB</span>
                    </div>
                    <input 
                      type="range" min="-24" max="-6" step="1" 
                      value={currentParams.compressionThresholdDb} 
                      onChange={e => updateParam('compressionThresholdDb', parseInt(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer h-1.5 bg-[#141C31] rounded"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[#A0AEC0] mb-1">
                      <span>Glue Ratio:</span>
                      <span className="font-bold text-amber-300">{currentParams.glueRatio.toFixed(1)} : 1</span>
                    </div>
                    <input 
                      type="range" min="1.5" max="8.0" step="0.5" 
                      value={currentParams.glueRatio} 
                      onChange={e => updateParam('glueRatio', parseFloat(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer h-1.5 bg-[#141C31] rounded"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[#A0AEC0] mb-1">
                      <span>Release Time:</span>
                      <span className="font-bold text-amber-300">{currentParams.releaseMs} ms</span>
                    </div>
                    <input 
                      type="range" min="40" max="350" step="10" 
                      value={currentParams.releaseMs} 
                      onChange={e => updateParam('releaseMs', parseInt(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer h-1.5 bg-[#141C31] rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Tape Warmth & Saturation Card */}
              <div className="p-3.5 rounded-xl bg-[#060814] border border-[#1A223B] flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-400">3. Analog Saturation</span>
                  <span className="text-[10px] text-[#64748B]">Harmonics</span>
                </div>

                <div className="space-y-2 text-[11px]">
                  <div>
                    <div className="flex justify-between text-[#A0AEC0] mb-1">
                      <span>Warmth Drive:</span>
                      <span className="font-bold text-purple-300">{currentParams.tapeWarmth}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" step="2" 
                      value={currentParams.tapeWarmth} 
                      onChange={e => updateParam('tapeWarmth', parseInt(e.target.value))}
                      className="w-full accent-purple-400 cursor-pointer h-1.5 bg-[#141C31] rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[#A0AEC0]">Harmonic Character:</span>
                    <select
                      value={currentParams.harmonicCharacter}
                      onChange={e => updateParam('harmonicCharacter', e.target.value as any)}
                      className="bg-[#12182C] border border-[#212E52] text-xs font-bold text-purple-300 rounded px-2 py-0.5 focus:outline-none"
                    >
                      <option value="tube">Tube (Triode 2nd Harmonic)</option>
                      <option value="tape">Tape (Magnetic Saturation)</option>
                      <option value="transformer">Transformer (Iron Core)</option>
                      <option value="clean">Clean (Linear)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Peak Limiting & Loudness Card */}
              <div className="p-3.5 rounded-xl bg-[#060814] border border-[#1A223B] flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400">4. Brickwall Peak Limiter</span>
                  <span className="text-[10px] text-[#64748B]">Loudness</span>
                </div>

                <div className="space-y-2 text-[11px]">
                  <div>
                    <div className="flex justify-between text-[#A0AEC0] mb-1">
                      <span>Ceiling Limit:</span>
                      <span className="font-bold text-emerald-300">{currentParams.ceilingDb} dBFS</span>
                    </div>
                    <input 
                      type="range" min="-1.5" max="-0.1" step="0.1" 
                      value={currentParams.ceilingDb} 
                      onChange={e => updateParam('ceilingDb', parseFloat(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-[#141C31] rounded"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[#A0AEC0] mb-1">
                      <span>Target Loudness:</span>
                      <span className="font-bold text-emerald-300">{currentParams.targetLufs} LUFS</span>
                    </div>
                    <input 
                      type="range" min="-18" max="-8" step="0.5" 
                      value={currentParams.targetLufs} 
                      onChange={e => updateParam('targetLufs', parseFloat(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-[#141C31] rounded"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Right Col: BigKnob Intensity, Reference Track & Run Actions */}
        <div className="bg-[#090C19] border border-[#212948] rounded-2xl p-5 flex flex-col items-center justify-between gap-6 shadow-xl">
          
          {/* BigKnob Component */}
          <div className="flex flex-col items-center gap-2 pt-2">
            <BigKnob 
              label="Gold Path Intensity" 
              value={masterIntensity} 
              onChange={handleIntensityChange} 
            />
            <span className="text-[11px] font-bold text-amber-400">
              {Math.round(masterIntensity * 100)}% Chain Drive
            </span>
          </div>

          {/* Reference Audio Dropzone */}
          <div className="w-full">
            <label className="flex flex-col items-center justify-center gap-2.5 h-28 w-full bg-[#050711] border-2 border-dashed border-[#202947] hover:border-[#FFD700] rounded-xl transition-all cursor-pointer group p-3 text-center">
              <input 
                type="file" 
                accept="audio/*" 
                className="hidden" 
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setReferenceFile(e.target.files[0]);
                    showToast(`Loaded reference track: ${e.target.files[0].name}`);
                  }
                }} 
              />
              <Upload size={24} className="text-[#64748B] group-hover:text-[#FFD700] transition-colors" />
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold text-white truncate max-w-[200px]">
                  {referenceFile ? referenceFile.name : "Drop Reference Track"}
                </span>
                <span className="text-[10px] text-[#64748B]">
                  {referenceFile ? `${(referenceFile.size / (1024 * 1024)).toFixed(1)} MB` : "Matchering Target Curve"}
                </span>
              </div>
            </label>
          </div>

          {/* Process Master Button */}
          <button 
            onClick={handleRunPipeline}
            className={`w-full py-3.5 rounded-xl font-extrabold text-xs tracking-widest uppercase transition-all shadow-lg flex items-center justify-center gap-2 ${
              isProcessing 
                ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse' 
                : 'bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 hover:brightness-110 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)]'
            }`}
          >
            <Zap size={14} className={isProcessing ? "animate-spin" : ""} />
            <span>{isProcessing ? 'Bypassing / Stop' : 'Run Gold Path Master'}</span>
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* INTEGRATED D3 SPECTRAL ANALYZER WITH GOLD PATH CURVE                      */}
      {/* ========================================================================= */}
      <div className="space-y-2 bg-[#090C19] border border-[#212948] rounded-2xl p-4 shadow-xl">
        <GoldPathSpectralVisualizer 
          height={320} 
          parameters={
            abSlot === 'B' && bMode === 'dry'
              ? { ...currentParams, lowCutHz: 20, highCutHz: 20000, deMudGainDb: 0, presenceAirDb: 0 }
              : abSlot === 'B' && bMode === 'saved_preset'
              ? activePreset.parameters
              : currentParams
          }
          stages={
            abSlot === 'B' && bMode === 'dry'
              ? { matchering: false, multiband: false, limiter: false, vst: false, spectralAnalysis: true, batchProcessing: false, tapeSaturation: false, stereoImager: false }
              : abSlot === 'B' && bMode === 'saved_preset'
              ? activePreset.stages
              : currentStages
          }
          masterIntensity={
            abSlot === 'B' && bMode === 'dry'
              ? 0
              : abSlot === 'B' && bMode === 'saved_preset'
              ? activePreset.masterIntensity
              : masterIntensity
          }
          presetName={
            abSlot === 'A'
              ? `[SLOT A: WORKING CHAIN] ${activePreset.name}`
              : bMode === 'dry'
              ? '[SLOT B: ORIGINAL DRY SIGNAL - BYPASS]'
              : `[SLOT B: SAVED PRESET] ${activePreset.name}`
          }
          showControls={true}
        />
      </div>

      {/* ========================================================================= */}
      {/* SAVE NEW PRESET MODAL DIALOG                                              */}
      {/* ========================================================================= */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono">
          <div className="relative w-full max-w-lg bg-[#0A0D1E] border border-amber-500/50 rounded-2xl p-6 shadow-[0_0_50px_rgba(245,158,11,0.3)] flex flex-col gap-4 text-white">
            <div className="flex items-center justify-between border-b border-[#1A223E] pb-3">
              <div className="flex items-center gap-2">
                <Save className="text-amber-400 w-5 h-5" />
                <h3 className="font-bold text-sm uppercase tracking-wider text-white">
                  Save Gold Path Preset
                </h3>
              </div>
              <button 
                onClick={() => setIsSaveModalOpen(false)}
                className="text-[#64748B] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#A0AEC0] mb-1 font-bold">Preset Name:</label>
                <input 
                  type="text"
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  placeholder="e.g. My Warm Analog Master"
                  className="w-full px-3 py-2 rounded-xl bg-[#050711] border border-[#212948] focus:border-amber-400 focus:outline-none text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[#A0AEC0] mb-1 font-bold">Description & Sonic Goal:</label>
                <textarea 
                  value={saveDesc}
                  onChange={e => setSaveDesc(e.target.value)}
                  rows={2}
                  placeholder="e.g. Designed for vocal clarity, punchy kick, and -14 LUFS streaming output."
                  className="w-full px-3 py-2 rounded-xl bg-[#050711] border border-[#212948] focus:border-amber-400 focus:outline-none text-white resize-none"
                />
              </div>

              <div>
                <label className="block text-[#A0AEC0] mb-1 font-bold">Author / Studio Tag:</label>
                <input 
                  type="text"
                  value={saveAuthor}
                  onChange={e => setSaveAuthor(e.target.value)}
                  placeholder="e.g. Strangelet Studio A"
                  className="w-full px-3 py-2 rounded-xl bg-[#050711] border border-[#212948] focus:border-amber-400 focus:outline-none text-white"
                />
              </div>

              {/* Preview of parameters saved */}
              <div className="p-3 rounded-xl bg-[#050711] border border-[#182138] space-y-1 text-[11px] text-[#7E88AA]">
                <div className="text-white font-bold mb-1">Configuration Snapshot:</div>
                <div>&bull; Master Intensity: {Math.round(masterIntensity * 100)}%</div>
                <div>&bull; Low Cut: {currentParams.lowCutHz}Hz | De-Mud: {currentParams.deMudGainDb}dB</div>
                <div>&bull; Ceiling: {currentParams.ceilingDb} dBFS | Target: {currentParams.targetLufs} LUFS</div>
                <div>&bull; Active Modules: {Object.entries(currentStages).filter(([_, v]) => v).map(([k]) => k).join(', ')}</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1A223E]">
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#141B2D] text-[#A0AEC0] hover:text-white font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSavePreset}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-black font-extrabold text-xs shadow-md"
              >
                Confirm & Save Preset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoldPath;
