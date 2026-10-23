// Strangelet Lab - Mastering Preset System
// Manages, edits, saves, and loads unified mastering configurations:
// - EQ Curves (6 Parametric Bands, HPF/LPF cutoffs, De-Mud notch, Air boost)
// - Compressor Settings (Threshold, Ratio, Attack, Release, Knee, Makeup Gain, Multiband)
// - Saturation Levels (Drive, Warmth, Character: Tape/Tube/Transformer/Console/Clean, Asymmetry, Ceiling)

import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Settings2, 
  Save, 
  Download, 
  Upload, 
  Trash2, 
  RotateCcw, 
  Check, 
  Activity, 
  Sliders, 
  Volume2, 
  Flame, 
  Layers, 
  ShieldCheck, 
  Radio, 
  Gauge, 
  SlidersHorizontal,
  X,
  Plus,
  Tag,
  Info
} from 'lucide-react';
import { 
  MasteringPreset, 
  MasteringEqBandConfig, 
  MasteringCompressorConfig, 
  MasteringSaturationConfig 
} from '../types';
import { 
  loadAllMasteringPresets, 
  saveUserMasteringPreset, 
  deleteUserMasteringPreset, 
  exportMasteringPresetJson, 
  importMasteringPresetJson, 
  syncMasteringPresetToBus,
  STORAGE_KEY_ACTIVE_MASTERING_PRESET_ID,
  FACTORY_MASTERING_PRESETS 
} from '../lib/masteringPresets';
import { masterAudioBus, ParametricEqBand } from '../lib/masterBus';
import { playLaserBeamSound, playColliderInjectionSound } from '../lib/laserSound';

interface MasteringPresetSystemProps {
  onPresetChanged?: (preset: MasteringPreset) => void;
  className?: string;
}

export const MasteringPresetSystem: React.FC<MasteringPresetSystemProps> = ({
  onPresetChanged,
  className = ''
}) => {
  const [presets, setPresets] = useState<MasteringPreset[]>(() => loadAllMasteringPresets());
  const [activePresetId, setActivePresetId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY_ACTIVE_MASTERING_PRESET_ID) || FACTORY_MASTERING_PRESETS[0].id;
    }
    return FACTORY_MASTERING_PRESETS[0].id;
  });

  const activePreset = presets.find(p => p.id === activePresetId) || presets[0] || FACTORY_MASTERING_PRESETS[0];

  // Working state for active configuration
  const [currentEq, setCurrentEq] = useState(activePreset.eq);
  const [currentCompressor, setCurrentCompressor] = useState<MasteringCompressorConfig>(activePreset.compressor);
  const [currentSaturation, setCurrentSaturation] = useState<MasteringSaturationConfig>(activePreset.saturation);
  const [isModified, setIsModified] = useState(false);

  // Active Sub-Tab: 'overview' | 'eq' | 'compressor' | 'saturation'
  const [activeTab, setActiveTab] = useState<'overview' | 'eq' | 'compressor' | 'saturation'>('overview');

  // Real-time Gain Reduction Meter
  const [gainReductionDb, setGainReductionDb] = useState(0);

  // Save Modal State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [saveAuthor, setSaveAuthor] = useState('Mastering Engineer');
  const [saveTagInput, setSaveTagInput] = useState('Mastering');

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync to Audio Engine whenever working state changes
  useEffect(() => {
    const workingPreset: MasteringPreset = {
      ...activePreset,
      eq: currentEq,
      compressor: currentCompressor,
      saturation: currentSaturation
    };
    syncMasteringPresetToBus(workingPreset);
    if (onPresetChanged) {
      onPresetChanged(workingPreset);
    }
  }, [currentEq, currentCompressor, currentSaturation]);

  // Real-time animation frame for gain reduction meter
  useEffect(() => {
    let animId: number;
    const pollMeter = () => {
      const gr = masterAudioBus.getCompressorGainReduction();
      setGainReductionDb(prev => prev * 0.7 + gr * 0.3); // smooth dampening
      animId = requestAnimationFrame(pollMeter);
    };
    animId = requestAnimationFrame(pollMeter);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Handle Preset Switching
  const handleSelectPreset = (presetId: string) => {
    const target = presets.find(p => p.id === presetId);
    if (!target) return;

    setActivePresetId(target.id);
    setCurrentEq(target.eq);
    setCurrentCompressor({ ...target.compressor });
    setCurrentSaturation({ ...target.saturation });
    setIsModified(false);

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_ACTIVE_MASTERING_PRESET_ID, target.id);
    }

    syncMasteringPresetToBus(target);
    playLaserBeamSound('laser_select');
    showToast(`Loaded Mastering Preset: "${target.name}"`);
  };

  // Update EQ Parameter
  const handleUpdateEqParam = (key: 'lowCutHz' | 'highCutHz' | 'deMudGainDb' | 'presenceAirDb', val: number) => {
    setCurrentEq(prev => ({
      ...prev,
      [key]: val
    }));
    setIsModified(true);
  };

  // Update EQ Band
  const handleUpdateBand = (bandId: string, updates: Partial<MasteringEqBandConfig>) => {
    setCurrentEq(prev => ({
      ...prev,
      bands: prev.bands.map(b => b.id === bandId ? { ...b, ...updates } : b)
    }));
    setIsModified(true);
  };

  // Update Compressor Param
  const handleUpdateCompressor = (key: keyof MasteringCompressorConfig, val: any) => {
    setCurrentCompressor(prev => ({
      ...prev,
      [key]: val
    }));
    setIsModified(true);
  };

  // Update Saturation Param
  const handleUpdateSaturation = (key: keyof MasteringSaturationConfig, val: any) => {
    setCurrentSaturation(prev => ({
      ...prev,
      [key]: val
    }));
    setIsModified(true);
  };

  // Open Save Modal
  const handleOpenSaveModal = () => {
    setSaveName(activePreset.category === 'User' ? activePreset.name : `${activePreset.name} (Custom)`);
    setSaveDesc(activePreset.description || 'Custom calibrated mastering preset configuration.');
    setSaveAuthor(activePreset.author || 'Mastering Engineer');
    setSaveTagInput(activePreset.tags?.join(', ') || 'Custom');
    setIsSaveModalOpen(true);
  };

  // Confirm Save Preset
  const handleConfirmSave = () => {
    if (!saveName.trim()) {
      showToast('Please enter a valid preset name.');
      return;
    }

    const newId = `user-mp-${Date.now()}`;
    const tags = saveTagInput.split(',').map(t => t.trim()).filter(Boolean);
    const newPreset: MasteringPreset = {
      id: newId,
      name: saveName.trim(),
      category: 'User',
      description: saveDesc.trim() || 'Custom user mastering preset configuration.',
      author: saveAuthor.trim() || 'Mastering Engineer',
      createdAt: new Date().toISOString().split('T')[0],
      tags: tags.length ? tags : ['User'],
      targetLufs: activePreset.targetLufs || -14.0,
      ceilingDb: currentSaturation.ceilingDb || -1.0,
      stereoWidth: activePreset.stereoWidth || 100,
      eq: currentEq,
      compressor: currentCompressor,
      saturation: currentSaturation
    };

    const updated = saveUserMasteringPreset(newPreset);
    setPresets(updated);
    setActivePresetId(newId);
    setIsModified(false);
    setIsSaveModalOpen(false);

    playColliderInjectionSound();
    showToast(`Saved Mastering Preset "${newPreset.name}"!`);
  };

  // Delete User Preset
  const handleDeletePreset = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete user preset "${name}"?`)) {
      const updated = deleteUserMasteringPreset(id);
      setPresets(updated);
      const fallback = updated[0] || FACTORY_MASTERING_PRESETS[0];
      handleSelectPreset(fallback.id);
      playLaserBeamSound('laser_erase');
      showToast(`Deleted preset "${name}".`);
    }
  };

  // Export JSON
  const handleExport = () => {
    const workingPreset: MasteringPreset = {
      ...activePreset,
      eq: currentEq,
      compressor: currentCompressor,
      saturation: currentSaturation
    };
    const json = exportMasteringPresetJson(workingPreset);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workingPreset.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_mastering.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    playLaserBeamSound('laser_curve');
    showToast(`Exported "${workingPreset.name}" JSON file.`);
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
        const text = event.target?.result as string;
        const imported = importMasteringPresetJson(text);
        const updated = loadAllMasteringPresets();
        setPresets(updated);
        handleSelectPreset(imported.id);
        playColliderInjectionSound();
        showToast(`Imported mastering preset "${imported.name}"!`);
      } catch (err: any) {
        showToast(err.message || 'Failed to import preset file.');
      }
    };
    reader.readAsText(file);
  };

  // Reset to Flat Default
  const handleResetFlat = () => {
    const flatEq = {
      curveName: 'Flat Neutral Response',
      lowCutHz: 20,
      highCutHz: 20000,
      deMudGainDb: 0,
      presenceAirDb: 0,
      bands: currentEq.bands.map(b => ({
        ...b,
        gain: 0,
        frequency: b.id === 'band-1' ? 20 : b.id === 'band-6' ? 20000 : b.frequency,
        enabled: true
      }))
    };
    const flatComp: MasteringCompressorConfig = {
      thresholdDb: 0,
      ratio: 1.0,
      attackMs: 30,
      releaseMs: 150,
      kneeDb: 6,
      makeupGainDb: 0,
      multiband: false,
      enabled: false
    };
    const flatSat: MasteringSaturationConfig = {
      drivePercent: 0,
      warmthPercent: 0,
      character: 'clean',
      asymmetry: 0,
      ceilingDb: -1.0,
      enabled: false
    };

    setCurrentEq(flatEq);
    setCurrentCompressor(flatComp);
    setCurrentSaturation(flatSat);
    setIsModified(true);
    playLaserBeamSound('laser_erase');
    showToast('Reset EQ, Compressor, and Saturation to Flat Neutral.');
  };

  return (
    <div className={`flex flex-col gap-5 bg-[#070A18] border border-[#1C2544] rounded-2xl p-4 sm:p-6 shadow-2xl ${className}`}>
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-[#0F172A] border border-amber-500/60 shadow-2xl text-amber-300 font-mono text-xs flex items-center gap-2 animate-bounce">
          <Sparkles size={14} className="text-[#FFD700]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER BAR: PRESET SELECTOR & COMMAND DECK */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1A2342]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 p-0.5 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Sparkles size={18} className="text-black" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-wide font-mono flex items-center gap-2">
                <span>MASTERING PRESET SYSTEM</span>
                {isModified && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    MODIFIED
                  </span>
                )}
              </h3>
              <p className="text-xs text-[#8A95B8]">
                Synchronized EQ Curves, Dynamics Compressor, & Analog Saturation Deck
              </p>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Selector Dropdown */}
          <div className="flex items-center gap-2 bg-[#050713] border border-[#232F52] rounded-xl px-3 py-1.5 shadow-inner">
            <span className="text-[10px] font-mono uppercase text-amber-400 font-bold hidden sm:inline">
              PRESET:
            </span>
            <select
              value={activePresetId}
              onChange={(e) => handleSelectPreset(e.target.value)}
              className="bg-transparent text-amber-300 font-mono font-bold text-xs focus:outline-none cursor-pointer max-w-[220px] sm:max-w-xs truncate"
            >
              <optgroup label="FACTORY MASTERING PRESETS">
                {presets.filter(p => p.category === 'Factory').map(p => (
                  <option key={p.id} value={p.id} className="bg-[#0A0E22] text-white">
                    {p.name}
                  </option>
                ))}
              </optgroup>
              {presets.some(p => p.category === 'User') && (
                <optgroup label="USER CUSTOM PRESETS">
                  {presets.filter(p => p.category === 'User').map(p => (
                    <option key={p.id} value={p.id} className="bg-[#0A0E22] text-cyan-300">
                      ⭐ {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Save Preset Button */}
          <button
            onClick={handleOpenSaveModal}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-mono font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 hover:brightness-110 transition-all cursor-pointer"
            title="Save current EQ, compressor, and saturation configuration as a preset"
          >
            <Save size={13} />
            <span>Save Preset</span>
          </button>

          {/* Export JSON */}
          <button
            onClick={handleExport}
            className="px-2.5 py-1.5 rounded-xl bg-[#12182E] hover:bg-[#1A2242] text-[#9AA5C4] hover:text-white border border-[#232F52] text-xs font-mono flex items-center gap-1 transition-all cursor-pointer"
            title="Export preset to JSON file"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Import JSON */}
          <button
            onClick={handleTriggerImport}
            className="px-2.5 py-1.5 rounded-xl bg-[#12182E] hover:bg-[#1A2242] text-[#9AA5C4] hover:text-white border border-[#232F52] text-xs font-mono flex items-center gap-1 transition-all cursor-pointer"
            title="Import preset from JSON file"
          >
            <Upload size={13} />
            <span className="hidden sm:inline">Import</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            accept=".json" 
            onChange={handleImportFileChange} 
            className="hidden" 
          />

          {/* Delete User Preset */}
          {activePreset.category === 'User' && (
            <button
              onClick={() => handleDeletePreset(activePreset.id, activePreset.name)}
              className="px-2.5 py-1.5 rounded-xl bg-red-950/50 hover:bg-red-900/70 text-red-400 border border-red-800 text-xs font-mono flex items-center gap-1 transition-all cursor-pointer"
              title="Delete user preset"
            >
              <Trash2 size={13} />
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}

          {/* Reset Flat */}
          <button
            onClick={handleResetFlat}
            className="px-2.5 py-1.5 rounded-xl bg-[#12182E] hover:bg-[#1A2242] text-[#818CA8] hover:text-white border border-[#212946] text-xs font-mono flex items-center gap-1 transition-all cursor-pointer"
            title="Reset to 0dB flat response, neutral compressor, and saturation off"
          >
            <RotateCcw size={13} />
            <span className="hidden lg:inline">Reset Flat</span>
          </button>
        </div>
      </div>

      {/* PRESET INFO BANNER */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#0B0F24] border border-[#1C2546] text-xs font-mono">
        <div className="space-y-1 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-bold">{activePreset.name}</span>
            <span className="text-[#64748B]">&bull;</span>
            <span className="text-amber-400/90">{activePreset.author || 'Mastering Engineer'}</span>
            {activePreset.tags?.map(t => (
              <span key={t} className="px-2 py-0.2 rounded-full text-[9px] bg-amber-500/10 text-amber-300 border border-amber-500/30">
                {t}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-[#8E9BBE] leading-relaxed">
            {activePreset.description}
          </p>
        </div>

        {/* Real-time Hardware Telemetry Pill */}
        <div className="flex items-center gap-3 bg-[#060814] px-3 py-1.5 rounded-xl border border-[#19223D] shrink-0">
          <div className="flex flex-col text-[10px]">
            <span className="text-[#64748B]">TARGET</span>
            <span className="text-emerald-300 font-bold">{activePreset.targetLufs || -14} LUFS</span>
          </div>
          <div className="h-6 w-px bg-[#1F294D]" />
          <div className="flex flex-col text-[10px]">
            <span className="text-[#64748B]">CEILING</span>
            <span className="text-amber-300 font-bold">{currentSaturation.ceilingDb || -1.0} dBFS</span>
          </div>
          <div className="h-6 w-px bg-[#1F294D]" />
          <div className="flex flex-col text-[10px]">
            <span className="text-[#64748B]">GAIN REDUCTION</span>
            <span className={`font-bold ${gainReductionDb > 3 ? 'text-red-400' : gainReductionDb > 0.5 ? 'text-amber-300' : 'text-[#64748B]'}`}>
              -{gainReductionDb.toFixed(1)} dB
            </span>
          </div>
        </div>
      </div>

      {/* SECTION TABS */}
      <div className="flex items-center gap-2 border-b border-[#1A2342] pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Mastering Overview', icon: Layers },
          { id: 'eq', label: '1. EQ Curves', icon: Activity },
          { id: 'compressor', label: '2. Compressor Dynamics', icon: SlidersHorizontal },
          { id: 'saturation', label: '3. Analog Saturation', icon: Flame }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                  : 'text-[#7B86A8] hover:text-white hover:bg-[#12172F]'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: MASTERING OVERVIEW (ALL 3 PILLARS AT A GLANCE) */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Card 1: EQ Curves Summary */}
          <div className="bg-[#0A0E24] border border-[#1E274A] rounded-2xl p-4 flex flex-col justify-between gap-4 shadow-lg">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-pink-400 flex items-center gap-1.5 font-mono">
                  <Activity size={14} />
                  <span>1. PARAMETRIC EQ CURVE</span>
                </span>
                <button
                  onClick={() => setActiveTab('eq')}
                  className="text-[10px] text-amber-400 hover:underline font-mono"
                >
                  Configure &rarr;
                </button>
              </div>
              <p className="text-[11px] text-[#7E8BAF] font-mono">
                {currentEq.curveName || 'Mastering EQ Shape'}
              </p>
              
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1">
                <div className="bg-[#050714] p-2 rounded-lg border border-[#161D36]">
                  <span className="text-[#64748B] block">Low Cut (HPF)</span>
                  <span className="text-pink-300 font-bold">{currentEq.lowCutHz} Hz</span>
                </div>
                <div className="bg-[#050714] p-2 rounded-lg border border-[#161D36]">
                  <span className="text-[#64748B] block">High Cut (LPF)</span>
                  <span className="text-cyan-300 font-bold">{(currentEq.highCutHz / 1000).toFixed(1)} kHz</span>
                </div>
                <div className="bg-[#050714] p-2 rounded-lg border border-[#161D36]">
                  <span className="text-[#64748B] block">De-Mud Notch</span>
                  <span className="text-emerald-300 font-bold">{currentEq.deMudGainDb > 0 ? '+' : ''}{currentEq.deMudGainDb} dB</span>
                </div>
                <div className="bg-[#050714] p-2 rounded-lg border border-[#161D36]">
                  <span className="text-[#64748B] block">Air / Presence</span>
                  <span className="text-amber-300 font-bold">{currentEq.presenceAirDb > 0 ? '+' : ''}{currentEq.presenceAirDb} dB</span>
                </div>
              </div>
            </div>

            {/* Mini Visual Curve Representation */}
            <div className="h-16 bg-[#050713] rounded-xl border border-[#182038] p-1 flex items-end justify-between gap-1 overflow-hidden">
              {currentEq.bands.map((b, i) => {
                const normH = Math.max(10, Math.min(100, 50 + b.gain * 3));
                return (
                  <div key={b.id} className="flex-1 flex flex-col items-center h-full justify-end group" title={`${b.name}: ${b.frequency}Hz, ${b.gain}dB`}>
                    <div 
                      className={`w-full rounded-t transition-all ${b.enabled ? 'bg-pink-400 group-hover:bg-amber-300' : 'bg-slate-700'}`}
                      style={{ height: `${normH}%` }}
                    />
                    <span className="text-[7px] text-[#64748B] font-mono mt-0.5">B{i+1}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 2: Compressor Dynamics Summary */}
          <div className="bg-[#0A0E24] border border-[#1E274A] rounded-2xl p-4 flex flex-col justify-between gap-4 shadow-lg">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 font-mono">
                  <SlidersHorizontal size={14} />
                  <span>2. DYNAMICS COMPRESSOR</span>
                </span>
                <button
                  onClick={() => setActiveTab('compressor')}
                  className="text-[10px] text-amber-400 hover:underline font-mono"
                >
                  Configure &rarr;
                </button>
              </div>
              <p className="text-[11px] text-[#7E8BAF] font-mono">
                {currentCompressor.enabled ? (currentCompressor.multiband ? 'Multiband Glue Bus Mode' : 'Stereo VCA Leveler') : 'Bypassed'}
              </p>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1">
                <div className="bg-[#050714] p-2 rounded-lg border border-[#161D36]">
                  <span className="text-[#64748B] block">Threshold</span>
                  <span className="text-amber-300 font-bold">{currentCompressor.thresholdDb} dB</span>
                </div>
                <div className="bg-[#050714] p-2 rounded-lg border border-[#161D36]">
                  <span className="text-[#64748B] block">Ratio</span>
                  <span className="text-amber-300 font-bold">{currentCompressor.ratio.toFixed(1)}:1</span>
                </div>
                <div className="bg-[#050714] p-2 rounded-lg border border-[#161D36]">
                  <span className="text-[#64748B] block">Attack / Release</span>
                  <span className="text-cyan-300 font-bold">{currentCompressor.attackMs}ms / {currentCompressor.releaseMs}ms</span>
                </div>
                <div className="bg-[#050714] p-2 rounded-lg border border-[#161D36]">
                  <span className="text-[#64748B] block">Makeup Gain</span>
                  <span className="text-emerald-300 font-bold">+{currentCompressor.makeupGainDb} dB</span>
                </div>
              </div>
            </div>

            {/* Real-time GR Meter Graphic */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-mono text-[#64748B]">
                <span>GAIN REDUCTION METER</span>
                <span className="text-amber-300 font-bold">-{gainReductionDb.toFixed(1)} dB</span>
              </div>
              <div className="h-2.5 bg-[#050713] rounded-full border border-[#1A2342] overflow-hidden flex">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500 transition-all duration-75"
                  style={{ width: `${Math.min(100, (gainReductionDb / 12) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Analog Saturation Summary */}
          <div className="bg-[#0A0E24] border border-[#1E274A] rounded-2xl p-4 flex flex-col justify-between gap-4 shadow-lg">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5 font-mono">
                  <Flame size={14} />
                  <span>3. ANALOG SATURATION</span>
                </span>
                <button
                  onClick={() => setActiveTab('saturation')}
                  className="text-[10px] text-amber-400 hover:underline font-mono"
                >
                  Configure &rarr;
                </button>
              </div>
              <p className="text-[11px] text-[#7E8BAF] font-mono uppercase">
                {currentSaturation.enabled ? `${currentSaturation.character} Harmonics (${currentSaturation.drivePercent}%)` : 'Bypassed'}
              </p>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1">
                <div className="bg-[#050714] p-2 rounded-lg border border-[#161D36]">
                  <span className="text-[#64748B] block">Drive</span>
                  <span className="text-purple-300 font-bold">{currentSaturation.drivePercent}%</span>
                </div>
                <div className="bg-[#050714] p-2 rounded-lg border border-[#161D36]">
                  <span className="text-[#64748B] block">Warmth</span>
                  <span className="text-purple-300 font-bold">{currentSaturation.warmthPercent}%</span>
                </div>
                <div className="bg-[#050714] p-2 rounded-lg border border-[#161D36]">
                  <span className="text-[#64748B] block">Harmonics Mode</span>
                  <span className="text-amber-300 font-bold uppercase">{currentSaturation.character}</span>
                </div>
                <div className="bg-[#050714] p-2 rounded-lg border border-[#161D36]">
                  <span className="text-[#64748B] block">Clip Ceiling</span>
                  <span className="text-cyan-300 font-bold">{currentSaturation.ceilingDb} dBFS</span>
                </div>
              </div>
            </div>

            {/* Saturation Tube/Tape Glow Bar */}
            <div className="p-2 rounded-xl bg-[#050714] border border-[#182038] flex items-center justify-between">
              <span className="text-[10px] text-[#64748B] font-mono">Analog Harmonic Drive:</span>
              <div className="flex items-center gap-1.5">
                {[...Array(6)].map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`w-3 h-2 rounded-sm transition-all ${
                      currentSaturation.enabled && (currentSaturation.drivePercent / 100) * 6 > idx
                        ? 'bg-gradient-to-t from-amber-500 to-yellow-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                        : 'bg-[#151D33]'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DETAILED EQ CURVES CONFIGURATOR */}
      {activeTab === 'eq' && (
        <div className="flex flex-col gap-5">
          {/* Cutoff & Shelf Macro Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-[#0A0E24] border border-[#1C2546]">
            <div>
              <div className="flex justify-between text-xs font-mono text-[#A0AEC0] mb-1">
                <span>Low Cut (HPF):</span>
                <span className="font-bold text-pink-300">{currentEq.lowCutHz} Hz</span>
              </div>
              <input 
                type="range" min="20" max="60" step="1"
                value={currentEq.lowCutHz}
                onChange={e => handleUpdateEqParam('lowCutHz', parseInt(e.target.value))}
                className="w-full accent-pink-400 cursor-pointer h-1.5 bg-[#141C31] rounded"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-[#A0AEC0] mb-1">
                <span>High Cut (LPF):</span>
                <span className="font-bold text-cyan-300">{(currentEq.highCutHz / 1000).toFixed(1)} kHz</span>
              </div>
              <input 
                type="range" min="16000" max="22000" step="250"
                value={currentEq.highCutHz}
                onChange={e => handleUpdateEqParam('highCutHz', parseInt(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#141C31] rounded"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-[#A0AEC0] mb-1">
                <span>De-Mud Notch (400Hz):</span>
                <span className="font-bold text-emerald-300">{currentEq.deMudGainDb.toFixed(1)} dB</span>
              </div>
              <input 
                type="range" min="-6.0" max="2.0" step="0.2"
                value={currentEq.deMudGainDb}
                onChange={e => handleUpdateEqParam('deMudGainDb', parseFloat(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-[#141C31] rounded"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-[#A0AEC0] mb-1">
                <span>Presence / Air Shelf:</span>
                <span className="font-bold text-amber-300">+{currentEq.presenceAirDb.toFixed(1)} dB</span>
              </div>
              <input 
                type="range" min="-2.0" max="6.0" step="0.2"
                value={currentEq.presenceAirDb}
                onChange={e => handleUpdateEqParam('presenceAirDb', parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-[#141C31] rounded"
              />
            </div>
          </div>

          {/* 6 Parametric EQ Bands Deck */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentEq.bands.map((band, idx) => (
              <div 
                key={band.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  band.enabled 
                    ? 'bg-[#0A0E24] border-[#1F294D]' 
                    : 'bg-[#050714] border-[#151D33] opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-white font-mono">{band.name}</span>
                  </div>
                  <button
                    onClick={() => handleUpdateBand(band.id, { enabled: !band.enabled })}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer ${
                      band.enabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-400 border border-red-500/40'
                    }`}
                  >
                    {band.enabled ? 'ACTIVE' : 'BYPASS'}
                  </button>
                </div>

                <div className="space-y-2 text-[11px] font-mono">
                  {/* Frequency */}
                  <div>
                    <div className="flex justify-between text-[#8E9BBE] mb-0.5">
                      <span>Freq:</span>
                      <span className="text-cyan-300 font-bold">
                        {band.frequency >= 1000 ? `${(band.frequency / 1000).toFixed(2)} kHz` : `${Math.round(band.frequency)} Hz`}
                      </span>
                    </div>
                    <input 
                      type="range" min="20" max="20000" step="5"
                      value={band.frequency}
                      onChange={e => handleUpdateBand(band.id, { frequency: parseInt(e.target.value) })}
                      className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#141C31] rounded"
                    />
                  </div>

                  {/* Gain */}
                  <div>
                    <div className="flex justify-between text-[#8E9BBE] mb-0.5">
                      <span>Gain:</span>
                      <span className={`font-bold ${band.gain > 0 ? 'text-amber-300' : band.gain < 0 ? 'text-emerald-300' : 'text-slate-400'}`}>
                        {band.gain > 0 ? '+' : ''}{band.gain.toFixed(1)} dB
                      </span>
                    </div>
                    <input 
                      type="range" min="-18" max="18" step="0.2"
                      value={band.gain}
                      onChange={e => handleUpdateBand(band.id, { gain: parseFloat(e.target.value) })}
                      className="w-full accent-amber-400 cursor-pointer h-1.5 bg-[#141C31] rounded"
                    />
                  </div>

                  {/* Q Factor */}
                  <div>
                    <div className="flex justify-between text-[#8E9BBE] mb-0.5">
                      <span>Q Factor:</span>
                      <span className="text-pink-300 font-bold">{band.q.toFixed(2)}</span>
                    </div>
                    <input 
                      type="range" min="0.2" max="10" step="0.1"
                      value={band.q}
                      onChange={e => handleUpdateBand(band.id, { q: parseFloat(e.target.value) })}
                      className="w-full accent-pink-400 cursor-pointer h-1.5 bg-[#141C31] rounded"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: DYNAMICS COMPRESSOR CONTROLS */}
      {activeTab === 'compressor' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Compressor Fader Controls */}
          <div className="lg:col-span-2 bg-[#0A0E24] border border-[#1E274A] rounded-2xl p-5 flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#1A223E]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-amber-400" />
                <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  Master Bus Compressor Parameters
                </h4>
              </div>
              <button
                onClick={() => handleUpdateCompressor('enabled', !currentCompressor.enabled)}
                className={`px-3 py-1 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${
                  currentCompressor.enabled 
                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20' 
                    : 'bg-[#151D33] text-[#64748B]'
                }`}
              >
                {currentCompressor.enabled ? 'COMPRESSOR ACTIVE' : 'BYPASSED'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs font-mono">
              {/* Threshold */}
              <div className="p-3.5 rounded-xl bg-[#060815] border border-[#17203A]">
                <div className="flex justify-between text-[#8E9BBE] mb-1">
                  <span>Compression Threshold:</span>
                  <span className="text-amber-300 font-bold">{currentCompressor.thresholdDb} dB</span>
                </div>
                <input 
                  type="range" min="-36" max="0" step="0.5"
                  value={currentCompressor.thresholdDb}
                  onChange={e => handleUpdateCompressor('thresholdDb', parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer h-2 bg-[#141C31] rounded"
                />
              </div>

              {/* Ratio */}
              <div className="p-3.5 rounded-xl bg-[#060815] border border-[#17203A]">
                <div className="flex justify-between text-[#8E9BBE] mb-1">
                  <span>Compression Ratio:</span>
                  <span className="text-amber-300 font-bold">{currentCompressor.ratio.toFixed(1)}:1</span>
                </div>
                <input 
                  type="range" min="1.0" max="16.0" step="0.2"
                  value={currentCompressor.ratio}
                  onChange={e => handleUpdateCompressor('ratio', parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer h-2 bg-[#141C31] rounded"
                />
              </div>

              {/* Attack */}
              <div className="p-3.5 rounded-xl bg-[#060815] border border-[#17203A]">
                <div className="flex justify-between text-[#8E9BBE] mb-1">
                  <span>Attack Time:</span>
                  <span className="text-cyan-300 font-bold">{currentCompressor.attackMs} ms</span>
                </div>
                <input 
                  type="range" min="1" max="80" step="1"
                  value={currentCompressor.attackMs}
                  onChange={e => handleUpdateCompressor('attackMs', parseInt(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer h-2 bg-[#141C31] rounded"
                />
              </div>

              {/* Release */}
              <div className="p-3.5 rounded-xl bg-[#060815] border border-[#17203A]">
                <div className="flex justify-between text-[#8E9BBE] mb-1">
                  <span>Release Time:</span>
                  <span className="text-cyan-300 font-bold">{currentCompressor.releaseMs} ms</span>
                </div>
                <input 
                  type="range" min="20" max="500" step="5"
                  value={currentCompressor.releaseMs}
                  onChange={e => handleUpdateCompressor('releaseMs', parseInt(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer h-2 bg-[#141C31] rounded"
                />
              </div>

              {/* Knee */}
              <div className="p-3.5 rounded-xl bg-[#060815] border border-[#17203A]">
                <div className="flex justify-between text-[#8E9BBE] mb-1">
                  <span>Soft Knee Width:</span>
                  <span className="text-pink-300 font-bold">{currentCompressor.kneeDb} dB</span>
                </div>
                <input 
                  type="range" min="0" max="20" step="1"
                  value={currentCompressor.kneeDb}
                  onChange={e => handleUpdateCompressor('kneeDb', parseInt(e.target.value))}
                  className="w-full accent-pink-400 cursor-pointer h-2 bg-[#141C31] rounded"
                />
              </div>

              {/* Makeup Gain */}
              <div className="p-3.5 rounded-xl bg-[#060815] border border-[#17203A]">
                <div className="flex justify-between text-[#8E9BBE] mb-1">
                  <span>Makeup Gain:</span>
                  <span className="text-emerald-300 font-bold">+{currentCompressor.makeupGainDb} dB</span>
                </div>
                <input 
                  type="range" min="0" max="10" step="0.2"
                  value={currentCompressor.makeupGainDb}
                  onChange={e => handleUpdateCompressor('makeupGainDb', parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer h-2 bg-[#141C31] rounded"
                />
              </div>
            </div>

            {/* Multiband Glue Mode Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#060815] border border-[#17203A]">
              <div>
                <span className="text-xs font-bold text-white font-mono block">Multiband Glue Crossover Mode</span>
                <span className="text-[10px] text-[#64748B] font-mono">Splits audio into 3 bands before dynamics compression</span>
              </div>
              <button
                onClick={() => handleUpdateCompressor('multiband', !currentCompressor.multiband)}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                  currentCompressor.multiband ? 'bg-amber-400' : 'bg-[#1C253D]'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-black transition-transform ${
                  currentCompressor.multiband ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>

          {/* Right Col: Live GR Telemetry & Compression Curve */}
          <div className="bg-[#0A0E24] border border-[#1E274A] rounded-2xl p-5 flex flex-col justify-between gap-5">
            <div className="space-y-3">
              <span className="text-xs font-bold text-amber-400 font-mono flex items-center gap-2">
                <Gauge size={14} />
                <span>DYNAMIC GAIN REDUCTION METER</span>
              </span>

              {/* Large Analog-style GR VU Meter */}
              <div className="p-4 rounded-xl bg-[#050713] border border-[#161D36] flex flex-col items-center gap-3 text-center">
                <span className="text-[10px] text-[#64748B] font-mono">CURRENT ATTENUATION</span>
                <span className="text-3xl font-black font-mono text-amber-300">
                  -{gainReductionDb.toFixed(1)} <span className="text-sm font-normal text-[#64748B]">dB</span>
                </span>
                <div className="w-full h-3 bg-[#0C1126] rounded-full overflow-hidden flex border border-[#1A2342]">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500 transition-all duration-75"
                    style={{ width: `${Math.min(100, (gainReductionDb / 14) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between w-full text-[9px] font-mono text-[#64748B]">
                  <span>0 dB</span>
                  <span>-3 dB</span>
                  <span>-6 dB</span>
                  <span>-12 dB</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#060815] border border-[#17203A] text-[11px] font-mono text-[#8E9BBE] space-y-1.5">
              <span className="text-white font-bold block flex items-center gap-1">
                <Info size={12} className="text-amber-400" />
                <span>Mastering Tip:</span>
              </span>
              <p>
                Aim for 1.5 to 3.0 dB of gain reduction on loud chorus passages to preserve transient punch while achieving cohesive commercial glue.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SATURATION LEVELS CONTROLS */}
      {activeTab === 'saturation' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Saturation Controls */}
          <div className="lg:col-span-2 bg-[#0A0E24] border border-[#1E274A] rounded-2xl p-5 flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#1A223E]">
              <div className="flex items-center gap-2">
                <Flame size={16} className="text-purple-400" />
                <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  Harmonic Saturation & Warmth
                </h4>
              </div>
              <button
                onClick={() => handleUpdateSaturation('enabled', !currentSaturation.enabled)}
                className={`px-3 py-1 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${
                  currentSaturation.enabled 
                    ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20' 
                    : 'bg-[#151D33] text-[#64748B]'
                }`}
              >
                {currentSaturation.enabled ? 'SATURATION ACTIVE' : 'BYPASSED'}
              </button>
            </div>

            {/* Character Selector */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#A0AEC0] font-mono uppercase tracking-wider">
                Analog Harmonic Character:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'tape', name: 'Analog Tape', desc: 'Tanh soft compression & silky highs' },
                  { id: 'tube', name: 'Triode Tube', desc: '2nd-order even harmonics & warmth' },
                  { id: 'transformer', name: 'Transformer', desc: 'Magnetic core punch & low-end weight' },
                  { id: 'console', name: 'British Desk', desc: 'Class-A mixing console soft clipping' },
                  { id: 'clean', name: 'Transparent', desc: 'Linear phase ultra-clean ceiling' }
                ].map(c => {
                  const isSelected = currentSaturation.character === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleUpdateSaturation('character', c.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-purple-950/60 border-purple-400 text-white shadow-md shadow-purple-500/20' 
                          : 'bg-[#060815] border-[#18213B] text-[#7B86A8] hover:text-white hover:bg-[#0D1226]'
                      }`}
                    >
                      <span className="text-xs font-bold font-mono block">{c.name}</span>
                      <span className="text-[9px] text-[#64748B] block mt-0.5 leading-tight">{c.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sliders: Drive, Warmth, Asymmetry, Ceiling */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs font-mono pt-2">
              {/* Saturation Drive */}
              <div className="p-3.5 rounded-xl bg-[#060815] border border-[#17203A]">
                <div className="flex justify-between text-[#8E9BBE] mb-1">
                  <span>Drive Intensity:</span>
                  <span className="text-purple-300 font-bold">{currentSaturation.drivePercent}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" step="1"
                  value={currentSaturation.drivePercent}
                  onChange={e => handleUpdateSaturation('drivePercent', parseInt(e.target.value))}
                  className="w-full accent-purple-400 cursor-pointer h-2 bg-[#141C31] rounded"
                />
              </div>

              {/* Analog Warmth */}
              <div className="p-3.5 rounded-xl bg-[#060815] border border-[#17203A]">
                <div className="flex justify-between text-[#8E9BBE] mb-1">
                  <span>Harmonic Warmth:</span>
                  <span className="text-purple-300 font-bold">{currentSaturation.warmthPercent}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" step="1"
                  value={currentSaturation.warmthPercent}
                  onChange={e => handleUpdateSaturation('warmthPercent', parseInt(e.target.value))}
                  className="w-full accent-purple-400 cursor-pointer h-2 bg-[#141C31] rounded"
                />
              </div>

              {/* Asymmetry / 2nd-order harmonics */}
              <div className="p-3.5 rounded-xl bg-[#060815] border border-[#17203A]">
                <div className="flex justify-between text-[#8E9BBE] mb-1">
                  <span>Harmonic Asymmetry:</span>
                  <span className="text-amber-300 font-bold">{currentSaturation.asymmetry}%</span>
                </div>
                <input 
                  type="range" min="0" max="50" step="1"
                  value={currentSaturation.asymmetry}
                  onChange={e => handleUpdateSaturation('asymmetry', parseInt(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer h-2 bg-[#141C31] rounded"
                />
              </div>

              {/* Soft Clip Ceiling */}
              <div className="p-3.5 rounded-xl bg-[#060815] border border-[#17203A]">
                <div className="flex justify-between text-[#8E9BBE] mb-1">
                  <span>Saturation Ceiling:</span>
                  <span className="text-cyan-300 font-bold">{currentSaturation.ceilingDb} dBFS</span>
                </div>
                <input 
                  type="range" min="-3.0" max="-0.1" step="0.1"
                  value={currentSaturation.ceilingDb}
                  onChange={e => handleUpdateSaturation('ceilingDb', parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer h-2 bg-[#141C31] rounded"
                />
              </div>
            </div>
          </div>

          {/* Right Col: Transfer Curve Preview & Info */}
          <div className="bg-[#0A0E24] border border-[#1E274A] rounded-2xl p-5 flex flex-col justify-between gap-5">
            <div className="space-y-3">
              <span className="text-xs font-bold text-purple-400 font-mono flex items-center gap-2">
                <Flame size={14} />
                <span>TRANSFER FUNCTION SHAPER</span>
              </span>

              {/* Graphic Shaper Box */}
              <div className="p-4 rounded-xl bg-[#050713] border border-[#161D36] flex flex-col items-center gap-2">
                <svg viewBox="0 0 100 100" className="w-full h-32 bg-[#03050E] rounded-lg border border-[#141A30]">
                  {/* Grid lines */}
                  <line x1="50" y1="0" x2="50" y2="100" stroke="#17203B" strokeWidth="1" strokeDasharray="2,2" />
                  <line x1="0" y1="50" x2="100" y2="50" stroke="#17203B" strokeWidth="1" strokeDasharray="2,2" />
                  <line x1="0" y1="100" x2="100" y2="0" stroke="#253258" strokeWidth="1" strokeDasharray="1,3" />

                  {/* S-curve path */}
                  <path 
                    d={`M 10 90 Q ${35 - (currentSaturation.drivePercent/10)} ${70 - (currentSaturation.asymmetry/5)}, 50 50 T 90 10`}
                    fill="none"
                    stroke="#C084FC"
                    strokeWidth="2.5"
                  />
                </svg>
                <div className="flex justify-between w-full text-[9px] font-mono text-[#64748B]">
                  <span>-1.0</span>
                  <span>INPUT &rarr; OUTPUT</span>
                  <span>+1.0</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#060815] border border-[#17203A] text-[11px] font-mono text-[#8E9BBE] space-y-1">
              <span className="text-white font-bold block">Analog Character Guide:</span>
              <p>
                <strong className="text-purple-300">Tape</strong> rounds transient edges for glue; <strong className="text-amber-300">Tube</strong> introduces rich even harmonics that make vocals cut through dense arrangements.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SAVE PRESET MODAL */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A0E24] border border-[#232F55] rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 animate-fade-in font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-[#1A2342]">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[#FFD700]" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Save Mastering Preset
                </h4>
              </div>
              <button 
                onClick={() => setIsSaveModalOpen(false)}
                className="text-[#64748B] hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#8E9BBE] block mb-1">Preset Name:</label>
                <input 
                  type="text" 
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  placeholder="e.g. Velvet Vinyl Warmth"
                  className="w-full bg-[#050713] border border-[#232F52] text-amber-300 font-bold rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[#8E9BBE] block mb-1">Description:</label>
                <textarea 
                  value={saveDesc}
                  onChange={e => setSaveDesc(e.target.value)}
                  rows={2}
                  placeholder="Describe the EQ curve, compressor glue, and saturation vibe..."
                  className="w-full bg-[#050713] border border-[#232F52] text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#8E9BBE] block mb-1">Author:</label>
                  <input 
                    type="text" 
                    value={saveAuthor}
                    onChange={e => setSaveAuthor(e.target.value)}
                    className="w-full bg-[#050713] border border-[#232F52] text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[#8E9BBE] block mb-1">Tags (comma sep):</label>
                  <input 
                    type="text" 
                    value={saveTagInput}
                    onChange={e => setSaveTagInput(e.target.value)}
                    placeholder="HipHop, Tape, Loud"
                    className="w-full bg-[#050713] border border-[#232F52] text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Summary snapshot */}
              <div className="p-3 rounded-xl bg-[#060814] border border-[#161D36] text-[10px] space-y-1 text-[#8E9BBE]">
                <div className="flex justify-between">
                  <span>EQ Cutoffs:</span>
                  <span className="text-pink-300 font-bold">{currentEq.lowCutHz}Hz - {(currentEq.highCutHz/1000).toFixed(1)}kHz</span>
                </div>
                <div className="flex justify-between">
                  <span>Compressor:</span>
                  <span className="text-amber-300 font-bold">{currentCompressor.thresholdDb}dB @ {currentCompressor.ratio}:1</span>
                </div>
                <div className="flex justify-between">
                  <span>Saturation:</span>
                  <span className="text-purple-300 font-bold">{currentSaturation.drivePercent}% {currentSaturation.character}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-[#7E88AA] hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold text-xs shadow-lg shadow-amber-500/20 hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check size={14} />
                <span>Save Preset Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
