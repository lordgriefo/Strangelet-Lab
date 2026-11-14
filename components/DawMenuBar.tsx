import React, { useState, useRef, useEffect } from 'react';
import { 
  File, 
  FolderPlus, 
  Save, 
  RotateCcw, 
  RotateCw, 
  Upload, 
  BarChart3, 
  Terminal, 
  Sliders, 
  Layers, 
  Mic, 
  Music, 
  Split, 
  Scissors, 
  Sparkles, 
  Code2, 
  Keyboard, 
  Zap, 
  Activity, 
  Download, 
  FolderArchive, 
  BookOpen, 
  HelpCircle, 
  Workflow, 
  Cpu, 
  Bot, 
  ShieldCheck, 
  Volume2, 
  VolumeX, 
  PanelLeftClose, 
  PanelLeftOpen, 
  Eye, 
  Check, 
  ChevronRight,
  Settings,
  Compass,
  CircleDot,
  Flame,
  Radio,
  Users,
  FolderKanban
} from 'lucide-react';
import { View, Track, ProjectSession } from '../types';
import { playLaserBeamSound } from '../lib/laserSound';
import {
  projectAutoSave,
  AutoSaveSettings,
  AUTOSAVE_INTERVAL_PRESETS,
  formatAutoSaveInterval
} from '../services/projectAutoSaveService';

export interface DawMenuBarProps {
  currentView: View;
  setView: (view: View) => void;
  tracks?: Track[];
  tempo?: number;
  activeSession?: ProjectSession;
  onOpenNewProject?: () => void;
  onManualSave?: () => void;
  onRestoreAutoSave?: () => void;
  onImportAudio?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onClearAllMutes?: () => void;
  onClearAllSolos?: () => void;
  onArmAllTracks?: () => void;
  onAddTrack?: (type: 'audio' | 'midi') => void;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  lynchianMode?: boolean;
  onToggleLynchianMode?: () => void;
  onOpenLiveRecorder?: () => void;
  onOpenChronoMap?: () => void;
  onOpenBeamSplitter?: () => void;
  onOpenBasicPitch?: () => void;
  onOpenGhostBuddy?: () => void;
  onOpenAceStepDesigner?: () => void;
  onOpenAiMixStep?: () => void;
  onOpenFaustDspLab?: () => void;
  onOpenSfzLibrary?: () => void;
  onOpenLoraLibrary?: () => void;
  onOpenWorkflowStudio?: () => void;
  onOpenKoboldSettings?: () => void;
  onOpenExportMix?: () => void;
  onOpenBatchStemExport?: () => void;
  onOpenExportZip?: () => void;
  onOpenUserGuide?: () => void;
  onOpenSoftwareDojo?: () => void;
  onOpenResourceManager?: () => void;
  onOpenAddonsHub?: () => void;
  onMoveGuruToSidebar?: () => void;
  isGuruDockedInSidebar?: boolean;
  isAutoArmMode?: boolean;
  onToggleAutoArm?: () => void;
  onOpenCollabWorkspace?: () => void;
  collabSessionCode?: string | null;
  collabMemberCount?: number;
  onOpenYue2Generator?: () => void;
  onOpenVstWrapperHost?: (pluginId?: string) => void;
}

type MenuKey = 'file' | 'edit' | 'view' | 'track' | 'ai' | 'export' | 'help' | null;

export const DawMenuBar: React.FC<DawMenuBarProps> = ({
  currentView,
  setView,
  tracks = [],
  tempo = 120,
  activeSession,
  onOpenNewProject,
  onManualSave,
  onRestoreAutoSave,
  onImportAudio,
  onUndo,
  onRedo,
  onClearAllMutes,
  onClearAllSolos,
  onArmAllTracks,
  onAddTrack,
  onToggleSidebar,
  isSidebarCollapsed,
  lynchianMode,
  onToggleLynchianMode,
  onOpenLiveRecorder,
  onOpenChronoMap,
  onOpenBeamSplitter,
  onOpenBasicPitch,
  onOpenGhostBuddy,
  onOpenAceStepDesigner,
  onOpenAiMixStep,
  onOpenFaustDspLab,
  onOpenSfzLibrary,
  onOpenLoraLibrary,
  onOpenWorkflowStudio,
  onOpenKoboldSettings,
  onOpenExportMix,
  onOpenBatchStemExport,
  onOpenExportZip,
  onOpenUserGuide,
  onOpenSoftwareDojo,
  onOpenResourceManager,
  onOpenAddonsHub,
  onMoveGuruToSidebar,
  isGuruDockedInSidebar,
  isAutoArmMode,
  onToggleAutoArm,
  onOpenCollabWorkspace,
  collabSessionCode,
  collabMemberCount,
  onOpenYue2Generator,
  onOpenVstWrapperHost
}) => {
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const [autoSaveSettings, setAutoSaveSettings] = useState<AutoSaveSettings>(() => projectAutoSave.getSettings());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = projectAutoSave.subscribeSettings(setAutoSaveSettings);
    return unsubscribe;
  }, []);

  // Close menus on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleMenuClick = (menu: MenuKey) => {
    if (openMenu === menu) {
      setOpenMenu(null);
    } else {
      setOpenMenu(menu);
      playLaserBeamSound('laser_select');
    }
  };

  const handleMenuHover = (menu: MenuKey) => {
    if (openMenu !== null && openMenu !== menu) {
      setOpenMenu(menu);
    }
  };

  const executeAction = (action?: () => void) => {
    setOpenMenu(null);
    if (action) {
      action();
      playLaserBeamSound('laser_select');
    }
  };

  return (
    <div 
      ref={containerRef}
      className="flex items-center gap-0.5 text-xs font-mono select-none relative z-50"
    >
      {/* FILE MENU */}
      <div className="relative">
        <button
          onClick={() => handleMenuClick('file')}
          onMouseEnter={() => handleMenuHover('file')}
          className={`px-2.5 py-1 rounded text-xs transition-colors font-medium ${
            openMenu === 'file' 
              ? 'bg-[#252538] text-[#00F0FF] font-bold' 
              : 'text-[#BBB] hover:text-white hover:bg-[#1C1C28]'
          }`}
        >
          File
        </button>

        {openMenu === 'file' && (
          <div className="absolute left-0 top-full mt-1 w-64 bg-[#0E111C]/98 border border-[#252E48] rounded-xl shadow-[0_10px_35px_rgba(0,0,0,0.85)] backdrop-blur-xl p-1 z-50 animate-fade-in text-xs">
            <button
              onClick={() => executeAction(onOpenNewProject)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                <FolderPlus size={14} className="text-[#FFD700]" />
                <span>New Project (Templates)...</span>
              </span>
              <span className="text-[10px] text-[#666]">Ctrl+N</span>
            </button>

            <button
              onClick={() => executeAction(() => setView(View.TEMPLATE_GALLERY))}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                <FolderKanban size={14} className="text-[#00F0FF]" />
                <span>Template Gallery (JSON)...</span>
              </span>
            </button>

            <button
              onClick={() => executeAction(onManualSave)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Save size={14} className="text-[#00F0FF]" />
                <span>Save Project Snapshot</span>
              </span>
              <span className="text-[10px] text-[#666]">Ctrl+S</span>
            </button>

            {onRestoreAutoSave && (
              <button
                onClick={() => executeAction(onRestoreAutoSave)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
              >
                <span className="flex items-center gap-2">
                  <RotateCcw size={14} className="text-emerald-400" />
                  <span>Restore Auto-Save Backup...</span>
                </span>
                <span className={`text-[10px] font-bold ${autoSaveSettings.enabled ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {autoSaveSettings.enabled ? formatAutoSaveInterval(autoSaveSettings.intervalSeconds) : 'OFF'}
                </span>
              </button>
            )}

            {/* Auto-Save Toggle & Duration Quick Picker */}
            <div className="mx-1.5 my-1 p-2 rounded-lg bg-[#080B14] border border-[#1B243A] flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                  Auto-Save Schedule
                </span>
                <button
                  type="button"
                  onClick={() => projectAutoSave.setEnabled(!autoSaveSettings.enabled)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border transition-all cursor-pointer ${
                    autoSaveSettings.enabled
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60'
                      : 'bg-[#161923] text-[#94A3B8] border-[#334155] hover:text-white'
                  }`}
                >
                  {autoSaveSettings.enabled ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className={`grid grid-cols-6 gap-1 ${autoSaveSettings.enabled ? '' : 'opacity-50'}`}>
                {AUTOSAVE_INTERVAL_PRESETS.map((presetSec) => (
                  <button
                    key={presetSec}
                    type="button"
                    onClick={() => projectAutoSave.setIntervalSeconds(presetSec)}
                    className={`py-0.5 rounded text-[9px] font-bold border transition-all cursor-pointer ${
                      autoSaveSettings.intervalSeconds === presetSec
                        ? 'bg-[#00F0FF]/20 border-[#00F0FF] text-[#00F0FF]'
                        : 'bg-[#0E1422] border-[#1E293B] text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    {formatAutoSaveInterval(presetSec)}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[1px] bg-[#1E2438] my-1" />

            <button
              onClick={() => executeAction(onImportAudio)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Upload size={14} className="text-[#FF8C00]" />
                <span>Import Audio File...</span>
              </span>
            </button>

            {onOpenCollabWorkspace && (
              <button
                onClick={() => executeAction(onOpenCollabWorkspace)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-cyan-300 hover:text-white hover:bg-cyan-950/40 transition-colors font-bold"
              >
                <span className="flex items-center gap-2">
                  <Users size={14} className="text-cyan-400" />
                  <span>Real-Time Collaborative Workspace...</span>
                </span>
                <span className="text-[10px] text-cyan-400 font-mono font-bold">
                  {collabSessionCode ? `[${collabSessionCode}]` : 'LIVE'}
                </span>
              </button>
            )}

            <div className="h-[1px] bg-[#1E2438] my-1" />

            <button
              onClick={() => executeAction(() => setView(View.PROJECT_STATS))}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                <BarChart3 size={14} className="text-cyan-400" />
                <span>Project Statistics & Telemetry</span>
              </span>
            </button>

            <button
              onClick={() => executeAction(() => setView(View.SYSTEM_CORE))}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Terminal size={14} className="text-purple-400" />
                <span>System Core & VRAM Monitor</span>
              </span>
            </button>
          </div>
        )}
      </div>

      {/* EDIT MENU */}
      <div className="relative">
        <button
          onClick={() => handleMenuClick('edit')}
          onMouseEnter={() => handleMenuHover('edit')}
          className={`px-2.5 py-1 rounded text-xs transition-colors font-medium ${
            openMenu === 'edit' 
              ? 'bg-[#252538] text-[#00F0FF] font-bold' 
              : 'text-[#BBB] hover:text-white hover:bg-[#1C1C28]'
          }`}
        >
          Edit
        </button>

        {openMenu === 'edit' && (
          <div className="absolute left-0 top-full mt-1 w-60 bg-[#0E111C]/98 border border-[#252E48] rounded-xl shadow-[0_10px_35px_rgba(0,0,0,0.85)] backdrop-blur-xl p-1 z-50 animate-fade-in text-xs">
            <button
              onClick={() => executeAction(onUndo)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                <RotateCcw size={14} className="text-[#00F0FF]" />
                <span>Undo</span>
              </span>
              <span className="text-[10px] text-[#666]">Ctrl+Z</span>
            </button>

            <button
              onClick={() => executeAction(onRedo)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                <RotateCw size={14} className="text-[#00F0FF]" />
                <span>Redo</span>
              </span>
              <span className="text-[10px] text-[#666]">Ctrl+Y</span>
            </button>

            <div className="h-[1px] bg-[#1E2438] my-1" />

            <button
              onClick={() => executeAction(onClearAllMutes)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Volume2 size={14} className="text-amber-400" />
                <span>Clear All Mutes</span>
              </span>
            </button>

            <button
              onClick={() => executeAction(onClearAllSolos)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                <VolumeX size={14} className="text-yellow-400" />
                <span>Clear All Solos</span>
              </span>
            </button>

            <button
              onClick={() => executeAction(onArmAllTracks)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Mic size={14} className="text-red-400" />
                <span>Arm All Tracks for Recording</span>
              </span>
            </button>

            <div className="h-[1px] bg-[#1E2438] my-1" />

            <button
              onClick={() => executeAction(onOpenKoboldSettings)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Settings size={14} className="text-[#A0A0A0]" />
                <span>Local AI Hub & Preferences...</span>
              </span>
            </button>
          </div>
        )}
      </div>

      {/* VIEW MENU */}
      <div className="relative">
        <button
          onClick={() => handleMenuClick('view')}
          onMouseEnter={() => handleMenuHover('view')}
          className={`px-2.5 py-1 rounded text-xs transition-colors font-medium ${
            openMenu === 'view' 
              ? 'bg-[#252538] text-[#00F0FF] font-bold' 
              : 'text-[#BBB] hover:text-white hover:bg-[#1C1C28]'
          }`}
        >
          View
        </button>

        {openMenu === 'view' && (
          <div className="absolute left-0 top-full mt-1 w-64 bg-[#0E111C]/98 border border-[#252E48] rounded-xl shadow-[0_10px_35px_rgba(0,0,0,0.85)] backdrop-blur-xl p-1 z-50 animate-fade-in text-xs">
            <button
              onClick={() => executeAction(() => setView(View.MIXER))}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                currentView === View.MIXER ? 'bg-[#1C2542] text-[#00F0FF] font-bold' : 'text-[#DDD] hover:text-white hover:bg-[#1E2640]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Sliders size={14} className="text-[#00F0FF]" />
                <span>Mixer Console & Timeline Grid</span>
              </span>
              <span className="text-[10px] text-[#666]">Alt+1</span>
            </button>

            <button
              onClick={() => executeAction(() => setView(View.TEMPLATE_GALLERY))}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                currentView === View.TEMPLATE_GALLERY ? 'bg-[#1C2542] text-[#00F0FF] font-bold' : 'text-[#DDD] hover:text-white hover:bg-[#1E2640]'
              }`}
            >
              <span className="flex items-center gap-2">
                <FolderKanban size={14} className="text-[#FF8C00]" />
                <span>Template Gallery (Routing &amp; VSTs)</span>
              </span>
            </button>

            <button
              onClick={() => executeAction(() => setView(View.MIDI_EDITOR))}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                currentView === View.MIDI_EDITOR ? 'bg-[#1C2542] text-[#00F0FF] font-bold' : 'text-[#DDD] hover:text-white hover:bg-[#1E2640]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Music size={14} className="text-purple-400" />
                <span>MIDI Piano Roll Editor</span>
              </span>
              <span className="text-[10px] text-[#666]">Alt+2</span>
            </button>

            <button
              onClick={() => executeAction(() => setView(View.SPECTRAL_ANALYSIS))}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                currentView === View.SPECTRAL_ANALYSIS ? 'bg-[#1C2542] text-[#00F0FF] font-bold' : 'text-[#DDD] hover:text-white hover:bg-[#1E2640]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Activity size={14} className="text-cyan-400" />
                <span>Spectral Analyzer & FFT</span>
              </span>
              <span className="text-[10px] text-[#666]">Alt+3</span>
            </button>

            <button
              onClick={() => executeAction(() => setView(View.SONIC_COLLIDER))}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                currentView === View.SONIC_COLLIDER ? 'bg-[#1C2542] text-[#00F0FF] font-bold' : 'text-[#DDD] hover:text-white hover:bg-[#1E2640]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Sparkles size={14} className="text-amber-400" />
                <span>Large Sonic Collider (LSC)</span>
              </span>
              <span className="text-[10px] text-[#666]">Alt+4</span>
            </button>

            <button
              onClick={() => executeAction(() => setView(View.WAVE_SPLITTER))}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                currentView === View.WAVE_SPLITTER ? 'bg-[#1C2542] text-[#00F0FF] font-bold' : 'text-[#DDD] hover:text-white hover:bg-[#1E2640]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Scissors size={14} className="text-red-400" />
                <span>Stem Splitter (Demucs AI)</span>
              </span>
            </button>

            <button
              onClick={() => executeAction(() => setView(View.BEAM_SPLITTER))}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                currentView === View.BEAM_SPLITTER ? 'bg-[#1C2542] text-[#00F0FF] font-bold' : 'text-[#DDD] hover:text-white hover:bg-[#1E2640]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Split size={14} className="text-[#00F0FF]" />
                <span>Beam Splitter (Prism Chopper)</span>
              </span>
            </button>

            <button
              onClick={() => executeAction(() => setView(View.VOICE_CLONER))}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                currentView === View.VOICE_CLONER ? 'bg-[#1C2542] text-[#00F0FF] font-bold' : 'text-[#DDD] hover:text-white hover:bg-[#1E2640]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Mic size={14} className="text-pink-400" />
                <span>Voice Cloner & Singing Synth</span>
              </span>
            </button>

            <button
              onClick={() => executeAction(() => setView(View.MASTERING))}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                currentView === View.MASTERING ? 'bg-[#1C2542] text-[#00F0FF] font-bold' : 'text-[#DDD] hover:text-white hover:bg-[#1E2640]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Sparkles size={14} className="text-[#FFD700]" />
                <span>Gold Path Mastering Console</span>
              </span>
            </button>

            <div className="h-[1px] bg-[#1E2438] my-1" />

            <button
              onClick={() => executeAction(onToggleSidebar)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                {isSidebarCollapsed ? <PanelLeftOpen size={14} className="text-[#00F0FF]" /> : <PanelLeftClose size={14} className="text-[#AAA]" />}
                <span>{isSidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar'}</span>
              </span>
              <span className="text-[10px] text-[#666]">Ctrl+B</span>
            </button>

            {onToggleLynchianMode && (
              <button
                onClick={() => executeAction(onToggleLynchianMode)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Eye size={14} className="text-[#E50914]" />
                  <span>Lynchian Noir Mode</span>
                </span>
                {lynchianMode && <span className="text-[9px] px-1 bg-red-950 text-red-400 rounded border border-red-700">ON</span>}
              </button>
            )}
          </div>
        )}
      </div>

      {/* TRACK MENU */}
      <div className="relative">
        <button
          onClick={() => handleMenuClick('track')}
          onMouseEnter={() => handleMenuHover('track')}
          className={`px-2.5 py-1 rounded text-xs transition-colors font-medium ${
            openMenu === 'track' 
              ? 'bg-[#252538] text-[#00F0FF] font-bold' 
              : 'text-[#BBB] hover:text-white hover:bg-[#1C1C28]'
          }`}
        >
          Track
        </button>

        {openMenu === 'track' && (
          <div className="absolute left-0 top-full mt-1 w-64 bg-[#0E111C]/98 border border-[#252E48] rounded-xl shadow-[0_10px_35px_rgba(0,0,0,0.85)] backdrop-blur-xl p-1 z-50 animate-fade-in text-xs">
            <button
              onClick={() => executeAction(() => onAddTrack?.('audio'))}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Layers size={14} className="text-emerald-400" />
                <span>+ Add Audio Track</span>
              </span>
            </button>

            <button
              onClick={() => executeAction(() => onAddTrack?.('midi'))}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Music size={14} className="text-purple-400" />
                <span>+ Add MIDI Track</span>
              </span>
            </button>

            <div className="h-[1px] bg-[#1E2438] my-1" />

            <button
              onClick={() => executeAction(onOpenLiveRecorder)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Mic size={14} className="text-red-400 animate-pulse" />
                <span>Live Mic Multitrack Recorder</span>
              </span>
            </button>

            <button
              onClick={() => executeAction(onOpenChronoMap)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Compass size={14} className="text-[#FFD700]" />
                <span>ChronoMap &amp; ChronoPins Tempo Engine</span>
              </span>
            </button>

            <button
              onClick={() => executeAction(onOpenBeamSplitter)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Split size={14} className="text-[#00F0FF]" />
                <span>Beam Splitter (Prism Chopper)</span>
              </span>
            </button>

            <button
              onClick={() => executeAction(onOpenBasicPitch)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Keyboard size={14} className="text-emerald-400" />
                <span>Basic Pitch (Audio-to-MIDI)</span>
              </span>
            </button>

            {onOpenVstWrapperHost && (
              <button
                onClick={() => executeAction(() => onOpenVstWrapperHost())}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-amber-300 hover:text-white hover:bg-amber-950/40 transition-colors font-bold"
              >
                <span className="flex items-center gap-2">
                  <Sliders size={14} className="text-amber-400" />
                  <span>VST3 / CLAP Wrapper Host Rack...</span>
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-600/40">
                  DSP STAGE
                </span>
              </button>
            )}

            <div className="h-[1px] bg-[#1E2438] my-1" />

            {onToggleAutoArm && (
              <button
                onClick={() => executeAction(onToggleAutoArm)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
              >
                <span className="flex items-center gap-2">
                  <CircleDot size={14} className={isAutoArmMode ? "text-red-400 animate-pulse" : "text-[#777]"} />
                  <span>Auto-Arm on Selection</span>
                </span>
                {isAutoArmMode && (
                  <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 bg-red-950/80 text-red-300 rounded border border-red-700 font-mono font-bold">
                    <Check size={10} /> ON
                  </span>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* AI & TOOLS MENU */}
      <div className="relative">
        <button
          onClick={() => handleMenuClick('ai')}
          onMouseEnter={() => handleMenuHover('ai')}
          className={`px-2.5 py-1 rounded text-xs transition-colors font-medium flex items-center gap-1 ${
            openMenu === 'ai' 
              ? 'bg-[#252538] text-amber-300 font-bold' 
              : 'text-[#BBB] hover:text-amber-300 hover:bg-[#1C1C28]'
          }`}
        >
          <span>AI / Tools</span>
        </button>

        {openMenu === 'ai' && (
          <div className="absolute left-0 top-full mt-1 w-72 bg-[#0E111C]/98 border border-[#252E48] rounded-xl shadow-[0_10px_35px_rgba(0,0,0,0.85)] backdrop-blur-xl p-1 z-50 animate-fade-in text-xs">
            <button
              onClick={() => executeAction(onOpenGhostBuddy)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-amber-300 hover:text-white hover:bg-[#2A1D0E] transition-colors font-bold"
            >
              <span className="flex items-center gap-2">
                <Bot size={15} className="text-amber-400 animate-pulse" />
                <span>👻 Ghost in the Machine (Mad Scientist)</span>
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-600/50 font-bold">DSP LAB AI</span>
            </button>

            {onOpenAddonsHub && (
              <button
                onClick={() => executeAction(onOpenAddonsHub)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-950/40 transition-colors font-bold"
              >
                <span className="flex items-center gap-2">
                  <Download size={14} className="text-emerald-400" />
                  <span>📦 Add-ons & Model Download Hub...</span>
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-600/50">
                  MODELS
                </span>
              </button>
            )}

            <div className="h-[1px] bg-[#1E2438] my-1" />

            {onOpenYue2Generator && (
              <button
                onClick={() => executeAction(onOpenYue2Generator)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-pink-300 hover:text-white hover:bg-pink-950/40 transition-colors font-bold"
              >
                <span className="flex items-center gap-2">
                  <Sparkles size={14} className="text-pink-400 animate-pulse" />
                  <span>YuE 2.0 Full-Song & Multi-Stem Generator</span>
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-pink-950 text-pink-300 border border-pink-600/50">
                  DUAL-TRACK
                </span>
              </button>
            )}

            <button
              onClick={() => executeAction(onOpenAceStepDesigner)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Sparkles size={14} className="text-pink-400" />
                <span>Ace-Step 1.5 Multi-Track Generator</span>
              </span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-pink-950 text-pink-300 border border-pink-700/50">GGUF</span>
            </button>

            <button
              onClick={() => executeAction(onOpenAiMixStep)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Zap size={14} className="text-amber-400" />
                <span>AI Mix Assistant (Kobold / Local LLM)</span>
              </span>
            </button>

            <button
              onClick={() => executeAction(onOpenBasicPitch)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Keyboard size={14} className="text-emerald-400" />
                <span>Spotify Basic Pitch (Audio-to-MIDI)</span>
              </span>
            </button>

            <button
              onClick={() => executeAction(onOpenFaustDspLab)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Code2 size={14} className="text-cyan-400" />
                <span>Faust DSP Toy Lab & VST Generator</span>
              </span>
            </button>

            {onOpenVstWrapperHost && (
              <button
                onClick={() => executeAction(() => onOpenVstWrapperHost())}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Sliders size={14} className="text-amber-400" />
                  <span>VST Host Wrapper Layer & Stage Matrix</span>
                </span>
                <span className="text-[9px] px-1 rounded bg-amber-950 text-amber-300 border border-amber-700/50">
                  VST3/CLAP
                </span>
              </button>
            )}

            <button
              onClick={() => executeAction(onOpenSfzLibrary)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Music size={14} className="text-blue-400" />
                <span>SFZ Open Multi-Sample Sound Library</span>
              </span>
            </button>

            <button
              onClick={() => executeAction(onOpenLoraLibrary)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Sparkles size={14} className="text-purple-400" />
                <span>Ace-Step LoRA Lending Library</span>
              </span>
            </button>

            <button
              onClick={() => executeAction(onOpenWorkflowStudio)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Workflow size={14} className="text-purple-300" />
                <span>Guided Studio Workflows & Pipelines</span>
              </span>
            </button>

            <div className="h-[1px] bg-[#1E2438] my-1" />

            {/* Guru Positioning Toggle Option */}
            <button
              onClick={() => executeAction(onMoveGuruToSidebar)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Bot size={14} className="text-amber-400" />
                <span>Guru Button: {isGuruDockedInSidebar ? 'Docked in Sidebar' : 'Floating on Screen'}</span>
              </span>
              <span className="text-[10px] text-cyan-400">{isGuruDockedInSidebar ? 'Switch to Float' : 'Dock to Sidebar'}</span>
            </button>

            <button
              onClick={() => executeAction(onOpenKoboldSettings)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Settings size={14} className="text-[#888]" />
                <span>Local AI Hub Settings...</span>
              </span>
            </button>
          </div>
        )}
      </div>

      {/* EXPORT MENU */}
      <div className="relative">
        <button
          onClick={() => handleMenuClick('export')}
          onMouseEnter={() => handleMenuHover('export')}
          className={`px-2.5 py-1 rounded text-xs transition-colors font-medium flex items-center gap-1 ${
            openMenu === 'export' 
              ? 'bg-[#252538] text-emerald-400 font-bold' 
              : 'text-[#BBB] hover:text-emerald-400 hover:bg-[#1C1C28]'
          }`}
        >
          <span>Export</span>
        </button>

        {openMenu === 'export' && (
          <div className="absolute left-0 top-full mt-1 w-64 bg-[#0E111C]/98 border border-[#252E48] rounded-xl shadow-[0_10px_35px_rgba(0,0,0,0.85)] backdrop-blur-xl p-1 z-50 animate-fade-in text-xs">
            <button
              onClick={() => executeAction(onOpenExportMix)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors font-semibold"
            >
              <span className="flex items-center gap-2">
                <Download size={14} className="text-[#FFD700]" />
                <span>Export Master Mix (.WAV)</span>
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-700/50">STEREO</span>
            </button>

            <button
              onClick={() => executeAction(onOpenBatchStemExport)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-emerald-300 hover:text-white hover:bg-[#102A20] transition-colors font-bold"
            >
              <span className="flex items-center gap-2">
                <FolderArchive size={14} className="text-emerald-400" />
                <span>Batch Stem Export (All Tracks to WAV)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50">PRO</span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">Ctrl+E</span>
              </span>
            </button>

            <button
              onClick={() => executeAction(onOpenExportZip)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                <FolderArchive size={14} className="text-[#10B981]" />
                <span>Stems Archive (.ZIP)</span>
              </span>
            </button>

            <button
              onClick={() => executeAction(() => {
                const midiBlob = new Blob(['MThd', 'strangelet_midi_stems.mid'], { type: 'audio/midi' });
                const url = URL.createObjectURL(midiBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${activeSession?.name || 'Project'}_MIDI_Stems.mid`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              })}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Music size={14} className="text-purple-400" />
                <span>MIDI Stems (.MID)</span>
              </span>
            </button>
          </div>
        )}
      </div>

      {/* HELP MENU */}
      <div className="relative">
        <button
          onClick={() => handleMenuClick('help')}
          onMouseEnter={() => handleMenuHover('help')}
          className={`px-2.5 py-1 rounded text-xs transition-colors font-medium ${
            openMenu === 'help' 
              ? 'bg-[#252538] text-cyan-300 font-bold' 
              : 'text-[#BBB] hover:text-cyan-300 hover:bg-[#1C1C28]'
          }`}
        >
          Help
        </button>

        {openMenu === 'help' && (
          <div className="absolute left-0 top-full mt-1 w-64 bg-[#0E111C]/98 border border-[#252E48] rounded-xl shadow-[0_10px_35px_rgba(0,0,0,0.85)] backdrop-blur-xl p-1 z-50 animate-fade-in text-xs">
            <button
              onClick={() => executeAction(onOpenUserGuide)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-cyan-300 hover:text-white hover:bg-[#162738] transition-colors font-bold"
            >
              <span className="flex items-center gap-2">
                <BookOpen size={14} className="text-cyan-400" />
                <span>User Manual & Field Guide</span>
              </span>
              <span className="text-[10px] text-cyan-400">F1</span>
            </button>

            <button
              onClick={() => executeAction(onOpenGhostBuddy)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Bot size={14} className="text-amber-400" />
                <span>Consult Ghost (Mad Scientist)</span>
              </span>
            </button>

            <button
              onClick={() => executeAction(onOpenSoftwareDojo)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-amber-400" />
                <span>Software Dojo (Directives)</span>
              </span>
            </button>

            <button
              onClick={() => executeAction(onOpenResourceManager)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#DDD] hover:text-white hover:bg-[#1E2640] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Cpu size={14} className="text-purple-400" />
                <span>Resource & VRAM Manager</span>
              </span>
              <span className="text-[10px] text-purple-400 font-bold">6GB / 16GB</span>
            </button>

            <div className="h-[1px] bg-[#1E2438] my-1" />

            <div className="px-3 py-2 text-[10px] text-[#7E88A6] select-none">
              <div className="font-bold text-[#A8B4D4]">STRANGELET LAB DAW</div>
              <div>v1.0.0-rc1 • Low-Resource GGUF</div>
              <div className="text-[9px] text-[#556080] mt-0.5">Desktop Workstation & AI Hybrid Studio</div>
            </div>
          </div>
        )}
      </div>

      {/* Real-Time Collaborative Workspace Quick Trigger */}
      {onOpenCollabWorkspace && (
        <button
          onClick={onOpenCollabWorkspace}
          className={`ml-2 px-2.5 py-1 rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
            collabSessionCode
              ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35)]'
              : 'bg-[#121624] border-[#222E4A] text-[#8C9BBF] hover:text-cyan-300 hover:border-cyan-500/50'
          }`}
          title="Real-Time Collaborative Workspace: Join or share session across local network with room code"
        >
          <Radio size={12} className={collabSessionCode ? 'text-cyan-400 animate-pulse' : 'text-[#8C9BBF]'} />
          <span className="hidden sm:inline">{collabSessionCode ? `ROOM: ${collabSessionCode}` : 'COLLAB'}</span>
          {(collabMemberCount || 0) > 1 && (
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-400 text-black font-extrabold shadow-[0_0_6px_#06B6D4]">
              {collabMemberCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
};
