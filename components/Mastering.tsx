import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Zap, 
  Settings2, 
  Upload, 
  Download,
  Info, 
  Radio, 
  Activity, 
  BarChart3, 
  Waves, 
  ShieldCheck,
  Headphones,
  Volume2,
  VolumeX,
  FolderOpen,
  Save,
  Plus,
  Trash2,
  RotateCcw,
  X,
  Check,
  Sliders,
  Layers,
  Play,
  Pause,
  Square,
  Music
} from 'lucide-react';
import ImportArea from './ImportArea';
import BigKnob from './BigKnob';
import { SunoMasteringStudio } from './SunoMasteringStudio';
import { SpectralAnalyzer } from './SpectralAnalyzer';
import { GoldPathSpectralVisualizer } from './GoldPathSpectralVisualizer';
import { GoldPath } from './GoldPath';
import { BatchProcessingView } from './BatchProcessingView';
import { MasteringPresetSystem } from './MasteringPresetSystem';
import { 
  loadAllGoldPathPresets, 
  GoldPathPreset, 
  STORAGE_KEY_ACTIVE_PRESET_ID, 
  syncGoldPathToMasterBus,
  saveUserGoldPathPreset,
  deleteUserGoldPathPreset,
  exportGoldPathPresetJson,
  importGoldPathPresetJson,
  FACTORY_GOLD_PATH_PRESETS
} from '../lib/goldPathPresets';
import { masterAudioBus } from '../lib/masterBus';
import { playLaserBeamSound, playColliderInjectionSound } from '../lib/laserSound';
import { ReferenceMatcheringDeck } from './ReferenceMatcheringDeck';

export const Mastering: React.FC = () => {
  const [masteringMode, setMasteringMode] = useState<'mastering_presets' | 'spectral_analyzer' | 'suno_desheen' | 'pipeline' | 'batch_processing'>('mastering_presets');
  const [spectralViewMode, setSpectralViewMode] = useState<'gold_path' | 'full_spectrum'>('gold_path');
  const [isBypassed, setIsBypassed] = useState<boolean>(masterAudioBus.isMasteringBypassed());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Preset Save Modal State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [saveName, setSaveName] = useState<string>('');
  const [saveDesc, setSaveDesc] = useState<string>('');
  const [saveAuthor, setSaveAuthor] = useState<string>('Mastering Engineer');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Standalone Direct Mastering Track State
  const audioImportRef = useRef<HTMLInputElement>(null);
  const [directTrackState, setDirectTrackState] = useState(() => masterAudioBus.getMasteringState());
  const [isExportingMaster, setIsExportingMaster] = useState(false);
  const [directCurrentTime, setDirectCurrentTime] = useState(0);

  useEffect(() => {
    return masterAudioBus.subscribeMasteringState(state => {
      setDirectTrackState(state);
      setDirectCurrentTime(state.currentTime);
    });
  }, []);

  useEffect(() => {
    if (!directTrackState.isPlaying) return;
    const interval = setInterval(() => {
      const state = masterAudioBus.getMasteringState();
      setDirectCurrentTime(state.currentTime);
    }, 100);
    return () => clearInterval(interval);
  }, [directTrackState.isPlaying]);

  const handleImportDirectAudio = async (file: File) => {
    try {
      showToast(`Loading "${file.name}" into Mastering Deck...`);
      await masterAudioBus.loadMasteringTrack(file);
      showToast(`✨ "${file.name}" loaded! Ready to master.`);
    } catch (err) {
      console.error(err);
      showToast(`Failed to load audio: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleTogglePlayDirect = () => {
    if (directTrackState.isPlaying) {
      masterAudioBus.pauseMasteringTrack();
    } else {
      masterAudioBus.playMasteringTrack();
    }
  };

  const handleStopDirect = () => {
    masterAudioBus.stopMasteringTrack();
  };

  const handleSeekDirect = (sec: number) => {
    masterAudioBus.seekMasteringTrack(sec);
    setDirectCurrentTime(sec);
  };

  const handleExportMastered = async () => {
    if (!directTrackState.buffer) {
      showToast('Please import an audio file to master first!');
      return;
    }
    setIsExportingMaster(true);
    showToast('✨ Rendering mastered audio with active Gold Path DSP chain...');
    try {
      const blob = await masterAudioBus.exportMasteredWavBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const baseName = directTrackState.fileName.replace(/\.[^/.]+$/, '');
      a.download = `${baseName}_GoldPath_Master.wav`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`✨ Mastered WAV downloaded successfully!`);
    } catch (err) {
      console.error(err);
      showToast(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExportingMaster(false);
    }
  };
  
  // Gold Path Presets Synchronization
  const [goldPathPresets, setGoldPathPresets] = useState<GoldPathPreset[]>(() => loadAllGoldPathPresets());
  const [activeGoldPresetId, setActiveGoldPresetId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY_ACTIVE_PRESET_ID) || 'factory-gp-audiophile';
    }
    return 'factory-gp-audiophile';
  });

  const activeGoldPreset = goldPathPresets.find(p => p.id === activeGoldPresetId) || goldPathPresets[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleQuickLoadPreset = (presetId: string) => {
    const selected = goldPathPresets.find(p => p.id === presetId);
    if (!selected) return;
    setActiveGoldPresetId(selected.id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_ACTIVE_PRESET_ID, selected.id);
    }
    syncGoldPathToMasterBus(selected);
    playLaserBeamSound('laser_select');
    showToast(`Loaded Gold Path preset: "${selected.name}"`);
  };

  // Open Save Preset Modal
  const handleOpenSaveModal = () => {
    setSaveName(activeGoldPreset.category === 'User' ? activeGoldPreset.name : `${activeGoldPreset.name} (Custom)`);
    setSaveDesc(activeGoldPreset.description);
    setSaveAuthor(activeGoldPreset.author || 'Mastering Engineer');
    setIsSaveModalOpen(true);
  };

  // Confirm Save Preset
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
      masterIntensity: activeGoldPreset.masterIntensity,
      stages: { ...activeGoldPreset.stages },
      parameters: { ...activeGoldPreset.parameters }
    };

    const updated = saveUserGoldPathPreset(newPreset);
    setGoldPathPresets(updated);
    setActiveGoldPresetId(newPresetId);
    setIsSaveModalOpen(false);

    playColliderInjectionSound();
    showToast(`Saved new Gold Path preset: "${newPreset.name}"!`);
  };

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Delete User Preset (In-App Two-Step Confirmation)
  const handleDeletePreset = (id: string, name: string) => {
    if (pendingDeleteId !== id) {
      setPendingDeleteId(id);
      return;
    }
    setPendingDeleteId(null);
    const updated = deleteUserGoldPathPreset(id);
    setGoldPathPresets(updated);
    const fallback = updated[0] || FACTORY_GOLD_PATH_PRESETS[0];
    handleQuickLoadPreset(fallback.id);
    playLaserBeamSound('laser_erase');
    showToast(`Deleted preset "${name}".`);
  };

  // Export Active Preset as JSON file
  const handleExportPreset = () => {
    const jsonStr = exportGoldPathPresetJson(activeGoldPreset);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeGoldPreset.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_goldpath.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    playLaserBeamSound('laser_curve');
    showToast(`Exported "${activeGoldPreset.name}" JSON file.`);
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
        setGoldPathPresets(updated);
        handleQuickLoadPreset(imported.id);
        playColliderInjectionSound();
        showToast(`Imported preset: "${imported.name}"!`);
      } catch (err: any) {
        showToast(err.message || 'Failed to import preset file.');
      }
    };
    reader.readAsText(file);
  };

  const [settings, setSettings] = useState({
    matchering: true,
    multiband: true,
    limiter: true,
    vst: false,
    spectralAnalysis: true,
    batchProcessing: false
  });
  const [bigKnobValue, setBigKnobValue] = useState(0.5);

  // =========================================================================
  // A/B AUDITIONING SYSTEM STATE & LOGIC
  // Compares Current Gold Path Processing (Slot A) against either:
  // 1) Original Dry Signal (100% Bypass)
  // 2) Previous Saved Preset State (or specific reference preset)
  // =========================================================================
  const [abSlot, setAbSlot] = useState<'A' | 'B'>('A');
  const [bReferenceMode, setBReferenceMode] = useState<'dry' | 'saved_preset'>('dry');
  const [bReferencePresetId, setBReferencePresetId] = useState<string>('factory-gp-audiophile');

  const referencePreset = goldPathPresets.find(p => p.id === bReferencePresetId) || goldPathPresets[0];

  // Core function to switch audio audition between Slot A and Slot B
  const applyAbAudition = (targetSlot: 'A' | 'B', targetMode?: 'dry' | 'saved_preset', targetRefId?: string) => {
    const mode = targetMode || bReferenceMode;
    const refId = targetRefId || bReferencePresetId;
    const refPreset = goldPathPresets.find(p => p.id === refId) || goldPathPresets[0];

    if (targetSlot === 'A') {
      setAbSlot('A');
      masterAudioBus.setMasteringBypass(false);
      syncGoldPathToMasterBus(activeGoldPreset);
      playLaserBeamSound('laser_select');
      showToast(`A/B Audition: [A] Current Gold Path Processing ("${activeGoldPreset.name}")`);
    } else {
      setAbSlot('B');
      if (mode === 'dry') {
        masterAudioBus.setMasteringBypass(true);
        playLaserBeamSound('laser_erase');
        showToast('A/B Audition: [B] Original Dry Signal (100% Unprocessed Bypass)');
      } else {
        masterAudioBus.setMasteringBypass(false);
        syncGoldPathToMasterBus(refPreset);
        playLaserBeamSound('laser_curve');
        showToast(`A/B Audition: [B] Saved Preset Baseline ("${refPreset.name}")`);
      }
    }
  };

  const handleToggleAb = () => {
    const nextSlot = abSlot === 'A' ? 'B' : 'A';
    applyAbAudition(nextSlot);
  };

  // Synchronize bypass state with Master Audio Bus
  useEffect(() => {
    const unsub = masterAudioBus.subscribeMasteringBypass(bypassed => {
      setIsBypassed(bypassed);
      if (bypassed) {
        setAbSlot('B');
      }
    });
    return unsub;
  }, []);

  // Keyboard shortcut 'B' for toggling A/B audition, 'A' for Slot A
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        handleToggleAb();
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        applyAbAudition('A');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [abSlot, bReferenceMode, bReferencePresetId, activeGoldPreset, goldPathPresets]);

  // Clean up reference audition if user leaves the Mastering view
  useEffect(() => {
    return () => {
      masterAudioBus.stopReferenceAudition();
    };
  }, []);

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="h-full p-4 lg:p-7 flex flex-col gap-5 animate-fade-in overflow-y-auto bg-[#05050A]">
      {/* View Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl lg:text-2xl font-bold text-white tracking-tight flex items-center gap-3 font-mono">
              <Sparkles className="text-[#FFD700]" />
              PARAMETRIC EQ & MASTERING SUITE
            </h2>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono border bg-[#111322] border-[#222744]">
              <span className={`w-2 h-2 rounded-full ${
                abSlot === 'A' 
                  ? 'bg-emerald-400 animate-pulse' 
                  : bReferenceMode === 'dry' 
                  ? 'bg-cyan-400 animate-ping' 
                  : 'bg-purple-400 animate-ping'
              }`} />
              <span className={
                abSlot === 'A' 
                  ? 'text-emerald-300 font-bold' 
                  : bReferenceMode === 'dry' 
                  ? 'text-cyan-300 font-bold' 
                  : 'text-purple-300 font-bold'
              }>
                {abSlot === 'A' 
                  ? 'A/B: [A] CURRENT GOLD PATH DSP' 
                  : bReferenceMode === 'dry' 
                  ? 'A/B: [B] ORIGINAL DRY SIGNAL (BYPASS)' 
                  : `A/B: [B] SAVED PRESET (${referencePreset.name})`}
              </span>
            </div>
          </div>
          <p className="text-xs lg:text-sm text-[#A0A0A0]">
            Dynamic frequency cut-off points, real-time D3 spectral analysis, and neural AI audio enhancement.
          </p>
        </div>

        {/* Master Toolbar: Dedicated Hardware A/B Comparison Console & Tab Switch */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* HARDWARE A/B COMPARISON CONSOLE */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-[#090D1E] border border-[#212948] shadow-xl">
            {/* Slot A / Quick Flip / Slot B Buttons */}
            <div className="flex items-center gap-1 bg-[#050711] p-1 rounded-xl border border-[#17203B]">
              {/* Slot A Button */}
              <button
                id="mastering-ab-slot-a-btn"
                onClick={() => applyAbAudition('A')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-black tracking-wider uppercase flex items-center gap-2 transition-all cursor-pointer ${
                  abSlot === 'A'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)] font-black'
                    : 'text-[#7B82A6] hover:text-white hover:bg-[#12172C]'
                }`}
                title="Audition Slot A: Current Gold Path Processing (Press [A])"
              >
                <span className={`w-2 h-2 rounded-full ${abSlot === 'A' ? 'bg-black animate-pulse' : 'bg-[#3A456B]'}`} />
                <span>[A] PROCESSED</span>
              </button>

              {/* Quick A/B Flip Toggle Button */}
              <button
                onClick={handleToggleAb}
                className="px-2 py-1.5 rounded-lg bg-[#11172D] hover:bg-[#1A2242] text-[#FFD700] border border-[#232F52] hover:border-amber-400 text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer"
                title="Toggle between Slot A and Slot B (Press [B])"
              >
                <RotateCcw size={12} className={abSlot === 'B' ? 'rotate-180 text-cyan-300 transition-transform duration-300' : 'transition-transform duration-300'} />
                <span className="text-[10px] font-black">A/B</span>
              </button>

              {/* Slot B Button */}
              <button
                id="mastering-ab-slot-b-btn"
                onClick={() => applyAbAudition('B')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-black tracking-wider uppercase flex items-center gap-2 transition-all cursor-pointer ${
                  abSlot === 'B'
                    ? bReferenceMode === 'dry'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.5)] font-black'
                      : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)] font-black'
                    : 'text-[#7B82A6] hover:text-white hover:bg-[#12172C]'
                }`}
                title={`Audition Slot B: ${bReferenceMode === 'dry' ? 'Original Dry Signal (Bypass)' : 'Saved Preset State'} (Press [B])`}
              >
                <span className={`w-2 h-2 rounded-full ${abSlot === 'B' ? (bReferenceMode === 'dry' ? 'bg-black animate-ping' : 'bg-white animate-ping') : 'bg-[#3A456B]'}`} />
                <span>[B] {bReferenceMode === 'dry' ? 'DRY SIGNAL' : 'SAVED PRESET'}</span>
              </button>
            </div>

            {/* B Reference Mode Configuration: Dry vs Saved Preset */}
            <div className="flex items-center gap-1.5 bg-[#050711] px-2.5 py-1 rounded-xl border border-[#17203B] text-[11px]">
              <span className="text-[9px] font-bold text-[#6B7599] uppercase tracking-wider hidden md:inline">
                COMPARE VS:
              </span>
              <select
                value={bReferenceMode}
                onChange={(e) => {
                  const nextMode = e.target.value as 'dry' | 'saved_preset';
                  setBReferenceMode(nextMode);
                  if (abSlot === 'B') {
                    applyAbAudition('B', nextMode);
                  }
                }}
                className="bg-[#0C1022] border border-[#232F52] text-[11px] font-bold text-amber-300 rounded-lg px-2 py-0.5 focus:outline-none cursor-pointer"
                title="Select comparison target for Slot B: Original dry audio or a saved preset"
              >
                <option value="dry">Dry Original (100% Bypass)</option>
                <option value="saved_preset">Saved Preset State</option>
              </select>

              {/* If Saved Preset mode, choose which preset is Slot B */}
              {bReferenceMode === 'saved_preset' && (
                <select
                  value={bReferencePresetId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setBReferencePresetId(nextId);
                    if (abSlot === 'B') {
                      applyAbAudition('B', 'saved_preset', nextId);
                    }
                  }}
                  className="bg-[#0C1022] border border-purple-500/40 text-[11px] font-bold text-purple-300 rounded-lg px-2 py-0.5 focus:outline-none cursor-pointer max-w-[130px] truncate"
                  title="Choose which saved preset to compare against in Slot B"
                >
                  <optgroup label="FACTORY PRESETS">
                    {goldPathPresets.filter(p => p.category === 'Factory').map(p => (
                      <option key={p.id} value={p.id} className="bg-[#0A0D1E] text-white">
                        {p.name}
                      </option>
                    ))}
                  </optgroup>
                  {goldPathPresets.some(p => p.category === 'User') && (
                    <optgroup label="USER PRESETS">
                      {goldPathPresets.filter(p => p.category === 'User').map(p => (
                        <option key={p.id} value={p.id} className="bg-[#0A0D1E] text-cyan-300">
                          ⭐ {p.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              )}

              {/* Keyboard shortcut badges */}
              <div className="hidden lg:flex items-center gap-1 text-[9px] text-[#6B7599] font-mono pl-1 border-l border-[#1A2340]">
                <span>KEY:</span>
                <kbd className="px-1.5 py-0.5 bg-[#0D1224] rounded border border-[#232C4A] text-amber-300 font-bold">B</kbd>
              </div>
            </div>
          </div>

          {/* Tab switch */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#121422] border border-[#232742]">
          <button
            onClick={() => setMasteringMode('mastering_presets')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-2 transition-all ${
              masteringMode === 'mastering_presets'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-[0_0_15px_rgba(255,215,0,0.4)] font-bold'
                : 'text-[#7B82A6] hover:text-white hover:bg-[#1A1E2F]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Mastering Presets (EQ, Comp, Sat)</span>
          </button>

          <button
            onClick={() => setMasteringMode('pipeline')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-2 transition-all ${
              masteringMode === 'pipeline'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-[0_0_15px_rgba(255,215,0,0.4)] font-bold'
                : 'text-[#7B82A6] hover:text-white hover:bg-[#1A1E2F]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gold Path Chain</span>
          </button>

          <button
            onClick={() => setMasteringMode('spectral_analyzer')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-2 transition-all ${
              masteringMode === 'spectral_analyzer'
                ? 'bg-[#FFD700] text-black shadow-[0_0_15px_rgba(255,215,0,0.4)]'
                : 'text-[#7B82A6] hover:text-white hover:bg-[#1A1E2F]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Parametric EQ & Spectral</span>
          </button>

          <button
            onClick={() => setMasteringMode('suno_desheen')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-2 transition-all ${
              masteringMode === 'suno_desheen'
                ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.35)]'
                : 'text-[#7B82A6] hover:text-white hover:bg-[#1A1E2F]'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-cyan-300" />
            <span>Suno AI De-Sheen</span>
          </button>

          <button
            onClick={() => setMasteringMode('batch_processing')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-2 transition-all ${
              masteringMode === 'batch_processing'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-[0_0_15px_rgba(255,215,0,0.4)] font-bold'
                : 'text-[#7B82A6] hover:text-white hover:bg-[#1A1E2F]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Batch Auto-Mastering</span>
          </button>
        </div>
      </div>
    </div>

      {/* =========================================================================
          DIRECT STANDALONE MASTERING TRACK DECK
          Allows importing and mastering any audio file independently
          ========================================================================= */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0C1024] via-[#0E1530] to-[#0C1024] border border-[#232F54] shadow-2xl flex flex-col gap-3 font-mono">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)] shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-400 tracking-wider">
                  INDEPENDENT MASTERING DECK
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
                  DIRECT AUDIO IMPORT
                </span>
              </div>
              <div className="text-xs text-[#8A95B5]">
                Import any song to master directly through 6-Band Parametric EQ, Dynamics, & Tape Saturation.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input 
              ref={audioImportRef} 
              type="file" 
              accept="audio/*" 
              className="hidden" 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportDirectAudio(file);
              }}
            />
            <button
              onClick={() => audioImportRef.current?.click()}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black text-xs tracking-wider flex items-center gap-2 hover:brightness-110 transition-all shadow-[0_0_15px_rgba(245,158,11,0.35)] cursor-pointer"
            >
              <Upload size={14} className="stroke-[2.5]" />
              <span>{directTrackState.buffer ? 'CHANGE AUDIO FILE' : '🎵 IMPORT AUDIO TO MASTER'}</span>
            </button>
            {directTrackState.buffer && (
              <button
                onClick={handleExportMastered}
                disabled={isExportingMaster}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs tracking-wider flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.35)] cursor-pointer disabled:opacity-50"
              >
                <Download size={14} className="stroke-[2.5]" />
                <span>{isExportingMaster ? 'RENDERING MASTER...' : 'EXPORT MASTERED WAV'}</span>
              </button>
            )}
          </div>
        </div>

        {directTrackState.buffer ? (
          <div className="p-3 rounded-xl bg-[#070A17] border border-[#1B2442] flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Track Info */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                <Music size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate max-w-xs md:max-w-md">
                  {directTrackState.fileName}
                </div>
                <div className="text-[10px] text-[#7A88AB] flex items-center gap-2">
                  <span>{directTrackState.buffer.numberOfChannels === 2 ? 'Stereo' : 'Mono'}</span>
                  <span>•</span>
                  <span>{directTrackState.buffer.sampleRate} Hz</span>
                  <span>•</span>
                  <span>{Math.floor(directTrackState.duration / 60)}:{(Math.floor(directTrackState.duration % 60)).toString().padStart(2, '0')}</span>
                </div>
              </div>
            </div>

            {/* Transport & Scrub */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <button
                onClick={handleTogglePlayDirect}
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-all shadow-md cursor-pointer ${
                  directTrackState.isPlaying
                    ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                    : 'bg-[#151D38] border border-[#273560] text-amber-400 hover:bg-[#1E294E]'
                }`}
                title={directTrackState.isPlaying ? 'Pause' : 'Play through Master Bus'}
              >
                {directTrackState.isPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
              </button>

              <button
                onClick={handleStopDirect}
                className="w-9 h-9 rounded-xl bg-[#151D38] border border-[#273560] text-[#7A88AB] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Stop & Return to Start"
              >
                <Square size={13} />
              </button>

              {/* Scrubber */}
              <div className="flex items-center gap-2 text-[11px] text-[#A0A0A0]">
                <span>{Math.floor(directCurrentTime / 60)}:{(Math.floor(directCurrentTime % 60)).toString().padStart(2, '0')}</span>
                <input
                  type="range"
                  min={0}
                  max={directTrackState.duration || 1}
                  step={0.1}
                  value={directCurrentTime}
                  onChange={(e) => handleSeekDirect(parseFloat(e.target.value))}
                  className="w-32 lg:w-48 accent-amber-500 cursor-pointer"
                />
                <span>{Math.floor(directTrackState.duration / 60)}:{(Math.floor(directTrackState.duration % 60)).toString().padStart(2, '0')}</span>
              </div>

              {/* Quick A/B Toggle */}
              <button
                onClick={handleToggleAb}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                  abSlot === 'A'
                    ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300'
                    : 'bg-cyan-950 border-cyan-500/50 text-cyan-300'
                }`}
                title="A/B Compare Mastered vs Dry Original"
              >
                {abSlot === 'A' ? 'A: MASTERED' : 'B: DRY (BYPASS)'}
              </button>
            </div>
          </div>
        ) : (
          <div 
            onClick={() => audioImportRef.current?.click()}
            className="p-4 rounded-xl border border-dashed border-[#232F54] hover:border-amber-500/60 bg-[#070A17]/60 hover:bg-[#070A17] flex items-center justify-center gap-2.5 text-xs text-[#7A88AB] hover:text-amber-300 cursor-pointer transition-all"
          >
            <Upload size={14} className="text-amber-400" />
            <span>Drop your audio track here or click to import for instant mastering (no mixer setup needed)</span>
          </div>
        )}
      </div>

      {/* Global Gold Path Preset Strip across Mastering */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[#090C19] border border-[#1F2744] text-xs font-mono shadow-md">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[10px] font-bold text-amber-400 uppercase flex items-center gap-1">
            <Sparkles size={12} className="text-[#FFD700]" />
            GOLD PATH PRESET:
          </span>
          <select
            value={activeGoldPresetId}
            onChange={(e) => {
              handleQuickLoadPreset(e.target.value);
              setGoldPathPresets(loadAllGoldPathPresets());
            }}
            className="bg-[#050711] border border-[#232F52] text-amber-300 font-bold text-xs rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer max-w-xs truncate"
          >
            <optgroup label="FACTORY GOLD PATH PRESETS">
              {goldPathPresets.filter(p => p.category === 'Factory').map(p => (
                <option key={p.id} value={p.id} className="bg-[#0A0D1E] text-white">
                  {p.name}
                </option>
              ))}
            </optgroup>
            {goldPathPresets.some(p => p.category === 'User') && (
              <optgroup label="USER CUSTOM PRESETS">
                {goldPathPresets.filter(p => p.category === 'User').map(p => (
                  <option key={p.id} value={p.id} className="bg-[#0A0D1E] text-cyan-300">
                    ⭐ {p.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <span className="text-[11px] text-[#7E88AA] hidden lg:inline">
            Target: <strong className="text-emerald-300">{activeGoldPreset?.parameters.targetLufs || -14} LUFS</strong> &bull; Ceiling: <strong className="text-amber-300">{activeGoldPreset?.parameters.ceilingDb || -1.0} dBFS</strong> &bull; Drive: <strong className="text-cyan-300">{Math.round((activeGoldPreset?.masterIntensity || 0.5) * 100)}%</strong>
          </span>

          {/* Quick A/B Audition Pill & Action Buttons */}
          <div className="flex items-center gap-1.5 ml-1">
            {/* Quick A/B Switch Pill */}
            <div className="flex items-center bg-[#050711] border border-[#212C4E] rounded-lg p-0.5 shadow-inner">
              <button
                onClick={() => applyAbAudition('A')}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                  abSlot === 'A'
                    ? 'bg-amber-400 text-black shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                    : 'text-[#7E88AA] hover:text-white'
                }`}
                title="Audition Slot A: Current Gold Path Processing"
              >
                [A]
              </button>
              <button
                onClick={handleToggleAb}
                className="px-1 py-0.5 text-[#64748B] hover:text-amber-300 transition-colors"
                title="Flip A/B"
              >
                <RotateCcw size={10} className={abSlot === 'B' ? 'rotate-180 text-cyan-300 transition-transform' : 'transition-transform'} />
              </button>
              <button
                onClick={() => applyAbAudition('B')}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                  abSlot === 'B'
                    ? bReferenceMode === 'dry'
                      ? 'bg-cyan-400 text-black shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                      : 'bg-purple-400 text-white shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                    : 'text-[#7E88AA] hover:text-white'
                }`}
                title={`Audition Slot B: ${bReferenceMode === 'dry' ? 'Original Dry Signal (Bypass)' : 'Saved Preset Baseline'}`}
              >
                [B] {bReferenceMode === 'dry' ? 'DRY' : 'PRESET'}
              </button>
            </div>

            <button
              onClick={handleOpenSaveModal}
              className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 text-[11px] font-bold transition-all shadow-sm"
              title="Save current configuration as new user preset"
            >
              <Save size={12} />
              <span>Save Preset</span>
            </button>

            <button
              onClick={handleExportPreset}
              className="px-2 py-1 rounded-lg bg-[#141C31] hover:bg-[#1C2642] text-[#A0AEC0] hover:text-white border border-[#232F52] flex items-center gap-1 text-[11px] font-medium transition-all"
              title="Export preset to JSON file"
            >
              <Download size={12} />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              onClick={handleTriggerImport}
              className="px-2 py-1 rounded-lg bg-[#141C31] hover:bg-[#1C2642] text-[#A0AEC0] hover:text-white border border-[#232F52] flex items-center gap-1 text-[11px] font-medium transition-all"
              title="Import preset from JSON file"
            >
              <Upload size={12} />
              <span className="hidden sm:inline">Import</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              accept=".json" 
              onChange={handleImportFileChange} 
              className="hidden" 
            />

            {activeGoldPreset.category === 'User' && (
              pendingDeleteId === activeGoldPreset.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDeletePreset(activeGoldPreset.id, activeGoldPreset.name)}
                    className="px-2 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white border border-red-400 flex items-center gap-1 text-[11px] font-bold transition-all"
                    title={`Confirm delete "${activeGoldPreset.name}"`}
                  >
                    <Trash2 size={12} />
                    <span>Confirm</span>
                  </button>
                  <button
                    onClick={() => setPendingDeleteId(null)}
                    className="px-2 py-1 rounded-lg bg-[#141C31] text-[#A0AEC0] hover:text-white border border-[#232F52] text-[11px]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleDeletePreset(activeGoldPreset.id, activeGoldPreset.name)}
                  className="px-2 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 border border-red-500/30 flex items-center gap-1 text-[11px] font-medium transition-all"
                  title="Delete this user preset"
                >
                  <Trash2 size={12} />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              )
            )}
          </div>
        </div>

        {masteringMode !== 'pipeline' && (
          <button
            onClick={() => setMasteringMode('pipeline')}
            className="text-[11px] font-bold text-amber-400 hover:text-white flex items-center gap-1 transition-colors ml-auto"
          >
            <span>Open Gold Path Chain Rack &rarr;</span>
          </button>
        )}
      </div>

      {/* Permanent Reference Audio Track (Matchering) Deck on Main Mastering Console */}
      {masteringMode !== 'pipeline' && (
        <ReferenceMatcheringDeck onToast={showToast} />
      )}

      {/* Mode 0: Dedicated Mastering Preset System (EQ Curves, Compressor Settings, Saturation Levels) */}
      {masteringMode === 'mastering_presets' && (
        <MasteringPresetSystem />
      )}

      {/* Mode 1: Dedicated D3 Spectral Analyzer View */}
      {masteringMode === 'spectral_analyzer' && (
        <div className="flex flex-col gap-5">
          {/* Sub-toggle: Gold Path D3 Signal Chain Visualizer vs Full Studio Spectrum */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-xl bg-[#090D20] border border-[#1E2849]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSpectralViewMode('gold_path')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all ${
                  spectralViewMode === 'gold_path'
                    ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                    : 'text-[#7B82A6] hover:text-white hover:bg-[#141B32]'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Gold Path Signal Chain (D3 Real-Time FFT & Curve)</span>
              </button>
              <button
                onClick={() => setSpectralViewMode('full_spectrum')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all ${
                  spectralViewMode === 'full_spectrum'
                    ? 'bg-[#FFD700] text-black shadow-[0_0_15px_rgba(255,215,0,0.4)]'
                    : 'text-[#7B82A6] hover:text-white hover:bg-[#141B32]'
                }`}
              >
                <Waves className="w-3.5 h-3.5" />
                <span>Parametric Studio Spectrum</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Live Audition Badge */}
              <div className="text-[10px] font-mono flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#060914] border border-[#1D2544]">
                <span className={`w-2 h-2 rounded-full ${
                  abSlot === 'A' ? 'bg-amber-400 animate-pulse' : bReferenceMode === 'dry' ? 'bg-cyan-400' : 'bg-purple-400'
                }`} />
                <span className="text-[#8E94B4]">AUDITIONING:</span>
                <strong className={
                  abSlot === 'A' ? 'text-amber-300' : bReferenceMode === 'dry' ? 'text-cyan-300' : 'text-purple-300'
                }>
                  {abSlot === 'A' 
                    ? `[A] ${activeGoldPreset.name}` 
                    : bReferenceMode === 'dry' 
                    ? '[B] DRY SIGNAL (BYPASS)' 
                    : `[B] ${referencePreset.name}`}
                </strong>
              </div>
            </div>
          </div>

          {/* D3.js Spectral Visualizer for Gold Path vs Parametric Spectrum */}
          {spectralViewMode === 'gold_path' ? (
            <GoldPathSpectralVisualizer 
              height={380} 
              parameters={
                abSlot === 'B' && bReferenceMode === 'dry'
                  ? { ...activeGoldPreset.parameters, lowCutHz: 20, highCutHz: 20000, deMudGainDb: 0, presenceAirDb: 0 }
                  : abSlot === 'B' && bReferenceMode === 'saved_preset'
                  ? referencePreset.parameters
                  : activeGoldPreset.parameters
              }
              stages={
                abSlot === 'B' && bReferenceMode === 'dry'
                  ? { matchering: false, multiband: false, limiter: false, vst: false, spectralAnalysis: true, batchProcessing: false, tapeSaturation: false, stereoImager: false }
                  : abSlot === 'B' && bReferenceMode === 'saved_preset'
                  ? referencePreset.stages
                  : activeGoldPreset.stages
              }
              masterIntensity={
                abSlot === 'B' && bReferenceMode === 'dry'
                  ? 0
                  : abSlot === 'B' && bReferenceMode === 'saved_preset'
                  ? referencePreset.masterIntensity
                  : activeGoldPreset.masterIntensity
              }
              presetName={
                abSlot === 'A'
                  ? `[A: ACTIVE DSP] ${activeGoldPreset.name}`
                  : bReferenceMode === 'dry'
                  ? '[B: ORIGINAL DRY SIGNAL - BYPASS]'
                  : `[B: SAVED PRESET] ${referencePreset.name}`
              }
              showControls={true}
            />
          ) : (
            <SpectralAnalyzer height={380} showControls={true} />
          )}

          {/* Mastering Frequency Band Guide */}
          <div className="bg-[#0A0D1E] border border-[#1F2642] rounded-xl p-4 sm:p-5">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#FFD700] font-bold mb-3 flex items-center gap-2">
              <Waves size={14} />
              Master Bus Frequency Band Reference & Target Envelopes
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-[#060814] border border-[#1C223A]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-indigo-400">Sub (20 - 60 Hz)</span>
                  <span className="text-[10px] font-mono text-[#64748B]">Mono Lock</span>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  High-pass subsonic DC offset and un-pitched rumble. Keep under -6 dBFS to preserve headroom.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#060814] border border-[#1C223A]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-blue-400">Bass (60 - 250 Hz)</span>
                  <span className="text-[10px] font-mono text-[#64748B]">Body & Punch</span>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  Fundamental weight of kick drums and bass guitars. Ensure clean separation from 200 Hz mud.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#060814] border border-[#1C223A]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-emerald-400">Low Mid (250 - 500 Hz)</span>
                  <span className="text-[10px] font-mono text-[#64748B]">Boxiness Zone</span>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  Prime suspect for AI-generated congested "baked" cardboard sound. Gentle notch cleans mix clarity.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#060814] border border-[#1C223A]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-amber-400">Mid (500 - 2 kHz)</span>
                  <span className="text-[10px] font-mono text-[#64748B]">Vocal Core</span>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  Carries the core intelligibility of human voice, snare snap, and primary instrument leads.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#060814] border border-[#1C223A]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-orange-400">High Mid (2k - 4k Hz)</span>
                  <span className="text-[10px] font-mono text-[#64748B]">Attack & Edge</span>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  Ear sensitivity maximum. Excessive build-up produces listener fatigue; careful leveling required.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#060814] border border-[#1C223A]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-pink-400">Presence (4k - 6k Hz)</span>
                  <span className="text-[10px] font-mono text-[#64748B]">Definition</span>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  Front-to-back spatial depth. Boosting brings vocals closer to the listener's ear.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#060814] border border-[#1C223A]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-purple-400">Air (6k - 20k Hz)</span>
                  <span className="text-[10px] font-mono text-[#64748B]">Silky Shimmer</span>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  Smooth high-shelf air. Suno Anti-Sheen tames the 8-11kHz metallic fizz while restoring air above 14kHz.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#060814] border border-[#1C223A] flex flex-col justify-center">
                <div className="flex items-center gap-2 text-cyan-300 text-xs font-mono font-bold mb-1">
                  <ShieldCheck size={14} />
                  <span>Real-time Studio Feed</span>
                </div>
                <p className="text-[11px] text-[#64748B]">
                  Streams directly from the active Mixer output, Suno Mastering playback, or test tone calibration generators.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Suno AI De-Sheen & Un-Bake Studio */}
      {masteringMode === 'suno_desheen' && (
        <SunoMasteringStudio />
      )}

      {/* Mode 3: Gold Path Mastering Chain with Complete Preset System */}
      {masteringMode === 'pipeline' && (
        <GoldPath onOpenBatchView={() => setMasteringMode('batch_processing')} />
      )}

      {/* Mode 4: Batch Processing View for Multitrack Stems & Full Tracks */}
      {masteringMode === 'batch_processing' && (
        <BatchProcessingView
          activeGoldPreset={activeGoldPreset}
          allPresets={goldPathPresets}
          onSelectPreset={handleQuickLoadPreset}
          onOpenChainRack={() => setMasteringMode('pipeline')}
        />
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[9999] px-4 py-2.5 rounded-xl bg-[#0B0F24] border border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.35)] text-white text-xs font-mono font-bold flex items-center gap-2.5 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Save Preset Modal Dialog */}
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
                  placeholder="e.g. Warm Modern Master"
                  className="w-full px-3 py-2 rounded-xl bg-[#050711] border border-[#212948] focus:border-amber-400 focus:outline-none text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[#A0AEC0] mb-1 font-bold">Description & Sonic Goal:</label>
                <textarea 
                  value={saveDesc}
                  onChange={e => setSaveDesc(e.target.value)}
                  rows={2}
                  placeholder="e.g. Preserves high-end sparkle, tightens sub mono, -14 LUFS target."
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

              {/* Snapshot details */}
              <div className="p-3 rounded-xl bg-[#050711] border border-[#182138] space-y-1 text-[11px] text-[#7E88AA]">
                <div className="text-white font-bold mb-1">Configuration Snapshot:</div>
                <div>&bull; Master Intensity: {Math.round(activeGoldPreset.masterIntensity * 100)}%</div>
                <div>&bull; Low Cut: {activeGoldPreset.parameters.lowCutHz}Hz | Ceiling: {activeGoldPreset.parameters.ceilingDb} dBFS</div>
                <div>&bull; Target Loudness: {activeGoldPreset.parameters.targetLufs} LUFS</div>
                <div>&bull; Active Stages: {Object.entries(activeGoldPreset.stages).filter(([_, v]) => v).map(([k]) => k).join(', ')}</div>
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

export default Mastering;
