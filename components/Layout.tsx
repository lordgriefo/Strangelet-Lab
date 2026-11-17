import React, { useState, useRef, useEffect } from 'react';
import { View, HardwareStats, Track, ProjectSession, ProjectBinClip } from '../types';
import { THEME } from '../constants';
import HardwareMonitor from './HardwareMonitor';
import { LayoutGrid, Layers, Mic, Music, Settings2, Sparkles, Terminal, Download, ChevronDown, Scissors, Drum, FolderPlus, Plus, Atom, Split, PanelLeftClose, PanelLeftOpen, Play, Volume2, VolumeX, Zap, Cpu, Code2, Keyboard, BookOpen, HelpCircle, Workflow, Bot, SlidersHorizontal, ArrowRightLeft, BarChart3, Activity, Bell, BellOff, ShieldCheck, Radio, Sliders, FolderKanban } from 'lucide-react';
import ImportArea from './ImportArea';
import { INITIAL_TRACKS } from '../constants';
import { UndoRedoControls } from './UndoRedoControls';
import { AutoSaveIndicator } from './AutoSaveIndicator';
import { isUiSoundMuted, toggleUiSoundMuted, subscribeUiSoundMute, playLaserBeamSound } from '../lib/laserSound';
import { DawMenuBar } from './DawMenuBar';
import { midiLearnService } from '../services/midiLearnService';
import { getStoredKoboldSettings } from '../services/koboldCppService';
import { getGhostShortModelBadge } from '../services/hardwareResourceManager';

interface ExportMenuProps {
    tracks?: Track[];
}

const ExportMenu: React.FC<ExportMenuProps> = ({ tracks = [] }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleExport = async (type: 'mix' | 'wav' | 'midi' | 'loop') => {
        if (type === 'wav') {
            setIsExporting(true);
            try {
                const { offlineAudioRenderer } = await import('../services/offlineAudioRenderer');
                const res = await offlineAudioRenderer.renderBatchStemsZip(tracks, {
                    sampleRate: 44100,
                    bitDepth: 16,
                    totalBars: 16,
                    tempo: 120,
                    masterGain: 0.8,
                    normalize: true,
                    limiter: false,
                    filename: 'Strangelet_Stems'
                });
                const a = document.createElement('a');
                a.href = res.downloadUrl;
                a.download = res.zipFilename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } catch (e) {
                console.error('Batch stem export error:', e);
            } finally {
                setIsExporting(false);
                setIsOpen(false);
            }
            return;
        }

        let blob: Blob;
        let filename = '';

        switch (type) {
            case 'mix':
                // Minimal WAV header for a 1-second silent file
                const wavHeader = new Uint8Array([
                    82, 73, 70, 70, 44, 0, 0, 0, 87, 65, 86, 69, 102, 109, 116, 32, 16, 0, 0, 0, 1, 0, 1, 0, 68, 172, 0, 0, 136, 88, 1, 0, 2, 0, 16, 0, 100, 97, 116, 97, 8, 0, 0, 0, 0, 0, 0, 0
                ]);
                blob = new Blob([wavHeader], { type: 'audio/wav' });
                filename = 'custom_mix.wav';
                break;
            case 'midi':
                // Mock MIDI file content
                blob = new Blob(['MThd', 'mock_midi_stems.mid'], { type: 'audio/midi' });
                filename = 'midi_stems.zip';
                break;
            case 'loop':
                // Minimal WAV header for a 1-second silent file
                const loopHeader = new Uint8Array([
                    82, 73, 70, 70, 44, 0, 0, 0, 87, 65, 86, 69, 102, 109, 116, 32, 16, 0, 0, 0, 1, 0, 1, 0, 68, 172, 0, 0, 136, 88, 1, 0, 2, 0, 16, 0, 100, 97, 116, 97, 8, 0, 0, 0, 0, 0, 0, 0
                ]);
                blob = new Blob([loopHeader], { type: 'audio/wav' });
                filename = 'loop_selection.wav';
                break;
            default:
                return;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsOpen(false);
    };

    const menuItems = [
        { label: "Custom Mix (.wav)", type: 'mix' as const },
        { label: "WAV Stems (.zip)", type: 'wav' as const },
        { label: "MIDI Stems (.zip)", type: 'midi' as const },
        { label: "Loop Selection (.wav)", type: 'loop' as const }
    ];

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-[#1E1E1E] border border-[#333] rounded-md hover:border-[#FFD700] transition-colors"
            >
                <Download size={16} className="text-[#FFD700]" />
                <span className="text-sm font-medium text-white">Export</span>
                <ChevronDown size={16} className={`text-[#666] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#1E1E1E] border border-[#333] rounded-md shadow-lg z-20">
                    <div className="p-1">
                        {menuItems.map(item => (
                             <button 
                                key={item.label} 
                                onClick={() => handleExport(item.type)}
                                className="w-full text-left block px-3 py-2 text-sm text-[#A0A0A0] hover:bg-[#252525] hover:text-[#FFD700] rounded-md"
                             >
                                {item.label}
                             </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};


interface LayoutProps {
  currentView: View;
  setView: (view: View) => void;
  children: React.ReactNode;
  onOpenNewProject?: () => void;
  activeSession?: ProjectSession;
  tracks?: Track[];
  onToggleTrackMute?: (id: string) => void;
  onToggleTrackSolo?: (id: string) => void;
  lynchianMode?: boolean;
  onToggleLynchianMode?: () => void;
  onOpenLiveRecorder?: () => void;
  activeLaserTool?: string;
  onSelectLaserTool?: (tool: string) => void;
  tapeIntensity?: 'off' | 'subtle' | 'warm' | 'lynchian';
  onChangeTapeIntensity?: (intensity: 'off' | 'subtle' | 'warm' | 'lynchian') => void;
  isAmbientDroneMuted?: boolean;
  onToggleAmbientDroneMute?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  projectBinClips?: ProjectBinClip[];
  onInsertBinClipToTrack?: (clip: ProjectBinClip) => void;
  onOpenAiMixStep?: () => void;
  onOpenKoboldSettings?: () => void;
  onOpenAceStepDesigner?: () => void;
  onOpenFaustDspLab?: () => void;
  onOpenBasicPitch?: () => void;
  onOpenSoftwareDojo?: () => void;
  onOpenUserGuide?: () => void;
  onOpenResourceManager?: () => void;
  onOpenWorkflowStudio?: () => void;
  onOpenSfzLibrary?: () => void;
  onOpenLoraLibrary?: () => void;
  onOpenGhostBuddy?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onManualSave?: () => void;
  onRestoreAutoSave?: () => void;
  lastSavedTimestamp?: number | null;
  onOpenBatchStemExport?: () => void;
  onAddTrack?: (type: 'audio' | 'midi') => void;
  onImportAudio?: () => void;
  onImportAudioFile?: (file: File) => void;
  onClearAllMutes?: () => void;
  onClearAllSolos?: () => void;
  onArmAllTracks?: () => void;
  onOpenChronoMap?: () => void;
  onOpenBeamSplitter?: () => void;
  tempo?: number;
  isAutoArmMode?: boolean;
  onToggleAutoArm?: () => void;
  onOpenCollabWorkspace?: () => void;
  collabSessionCode?: string | null;
  collabMemberCount?: number;
  onOpenYue2Generator?: () => void;
  onOpenAddonsHub?: () => void;
  onOpenVstWrapperHost?: (pluginId?: string) => void;
  onReplaySplashScreen?: () => void;
  onOpenKoboldMusicBridge?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  currentView, 
  setView, 
  children,
  onOpenNewProject,
  activeSession,
  tracks = INITIAL_TRACKS,
  onToggleTrackMute,
  onToggleTrackSolo,
  lynchianMode = false,
  onToggleLynchianMode,
  onOpenLiveRecorder,
  activeLaserTool = 'laser_audio',
  onSelectLaserTool,
  tapeIntensity = 'subtle',
  onChangeTapeIntensity,
  isAmbientDroneMuted = false,
  onToggleAmbientDroneMute,
  isSidebarCollapsed: propSidebarCollapsed,
  onToggleSidebar,
  projectBinClips = [],
  onInsertBinClipToTrack,
  onOpenAiMixStep,
  onOpenKoboldSettings,
  onOpenAceStepDesigner,
  onOpenFaustDspLab,
  onOpenBasicPitch,
  onOpenSoftwareDojo,
  onOpenUserGuide,
  onOpenResourceManager,
  onOpenWorkflowStudio,
  onOpenSfzLibrary,
  onOpenLoraLibrary,
  onOpenGhostBuddy,
  onUndo,
  onRedo,
  onManualSave,
  onRestoreAutoSave,
  lastSavedTimestamp,
  onOpenBatchStemExport,
  onAddTrack,
  onImportAudio,
  onImportAudioFile,
  onClearAllMutes,
  onClearAllSolos,
  onArmAllTracks,
  onOpenChronoMap,
  onOpenBeamSplitter,
  tempo = 120,
  isAutoArmMode,
  onToggleAutoArm,
  onOpenCollabWorkspace,
  collabSessionCode,
  collabMemberCount,
  onOpenYue2Generator,
  onOpenAddonsHub,
  onOpenVstWrapperHost,
  onReplaySplashScreen,
  onOpenKoboldMusicBridge
}) => {
  const [internalSidebarCollapsed, setInternalSidebarCollapsed] = useState<boolean>(false);
  const effectiveSidebarCollapsed = propSidebarCollapsed !== undefined ? propSidebarCollapsed : internalSidebarCollapsed;
  const handleToggleSidebar = onToggleSidebar || (() => setInternalSidebarCollapsed(prev => !prev));

  const [uiSoundMuted, setUiSoundMutedState] = useState<boolean>(() => isUiSoundMuted());
  const [globalMidiLearnActive, setGlobalMidiLearnActive] = useState<boolean>(() => midiLearnService.getLearnModeActive());
  const [midiMappingCount, setMidiMappingCount] = useState<number>(() => midiLearnService.getAllMappings().length);
  const [ghostModelBadge, setGhostModelBadge] = useState<string>(() => getGhostShortModelBadge(getStoredKoboldSettings().modelName));

  useEffect(() => {
    const unsubMute = subscribeUiSoundMute((muted) => {
      setUiSoundMutedState(muted);
    });
    const unsubLearn = midiLearnService.subscribeLearnMode((active) => {
      setGlobalMidiLearnActive(active);
    });
    const unsubMap = midiLearnService.subscribeChange((list) => {
      setMidiMappingCount(list.length);
    });
    const syncGhostBadge = () => {
      setGhostModelBadge(getGhostShortModelBadge(getStoredKoboldSettings().modelName));
    };
    window.addEventListener('strangelet-ai-settings-changed', syncGhostBadge);
    window.addEventListener('strangelet-resource-updated', syncGhostBadge);
    return () => {
      unsubMute();
      unsubLearn();
      unsubMap();
      window.removeEventListener('strangelet-ai-settings-changed', syncGhostBadge);
      window.removeEventListener('strangelet-resource-updated', syncGhostBadge);
    };
  }, []);

  const [isGuruDockedInSidebar, setIsGuruDockedInSidebar] = useState<boolean>(() => {
    const saved = localStorage.getItem('strangelet_buddy_position');
    return saved === 'sidebar-docked' || !saved;
  });

  useEffect(() => {
    const handlePosChange = (e: any) => {
      if (e.detail?.position) {
        setIsGuruDockedInSidebar(e.detail.position === 'sidebar-docked');
      }
    };
    window.addEventListener('strangelet-guru-position-changed', handlePosChange);
    return () => window.removeEventListener('strangelet-guru-position-changed', handlePosChange);
  }, []);

  const handleToggleGuruDocking = () => {
    const nextPos = isGuruDockedInSidebar ? 'bottom-right' : 'sidebar-docked';
    localStorage.setItem('strangelet_buddy_position', nextPos);
    setIsGuruDockedInSidebar(nextPos === 'sidebar-docked');
    window.dispatchEvent(new CustomEvent('strangelet-guru-set-position', { detail: { position: nextPos } }));
    window.dispatchEvent(new CustomEvent('strangelet-guru-position-changed', { detail: { position: nextPos } }));
    playLaserBeamSound('laser_select');
  };

  const [logoClicks, setLogoClicks] = useState<number>(0);
  const clickTimeoutRef = useRef<number | null>(null);
  const [auditioningClipId, setAuditioningClipId] = useState<string | null>(null);
  const audioElemRef = useRef<HTMLAudioElement | null>(null);

  const handleAuditionClip = (clip: ProjectBinClip) => {
    if (auditioningClipId === clip.id) {
      if (audioElemRef.current) {
        audioElemRef.current.pause();
        audioElemRef.current = null;
      }
      setAuditioningClipId(null);
      return;
    }

    if (audioElemRef.current) {
      audioElemRef.current.pause();
    }

    if (clip.audioUrl) {
      const audio = new Audio(clip.audioUrl);
      audioElemRef.current = audio;
      setAuditioningClipId(clip.id);
      audio.onended = () => setAuditioningClipId(null);
      audio.play().catch(e => console.log('Audio audition error:', e));
    }
  };

  // Keyboard shortcuts for Sidebar and Manual
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // Ctrl+B or Cmd+B: Toggle Sidebar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleToggleSidebar();
        return;
      }

      // Ctrl+E or Cmd+E: Batch Stem Export
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        onOpenBatchStemExport?.();
        return;
      }

      // F1 or ?: Open User Guide & Manual
      if (e.key === 'F1' || (e.key === '?' && !e.ctrlKey && !e.metaKey)) {
        e.preventDefault();
        onOpenUserGuide?.();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleSidebar, onOpenUserGuide, onOpenBatchStemExport]);

  // Secret Lynchian Mode Trigger: Click the Strangelet Lab logo 5 times
  const handleLogoClick = () => {
    const nextCount = logoClicks + 1;
    setLogoClicks(nextCount);

    if (nextCount >= 5) {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      setLogoClicks(0);
      onToggleLynchianMode?.();
      return;
    }

    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    clickTimeoutRef.current = window.setTimeout(() => {
      setLogoClicks(0);
    }, 2800);
  };

  // Mock Hardware Stats
  const stats: HardwareStats = {
    vramTotal: 6.0,
    vramUsed: 1.2,
    gpuLoad: 15
  };

  const NavItem = ({ view, label, icon: Icon }: { view: View, label: string, icon: any }) => (
    <button 
      onClick={() => setView(view)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${currentView === view ? 'bg-[#1E1E1E] text-[#FFD700] border border-[#333]' : 'text-[#888] hover:text-[#E0E0E0] hover:bg-[#181818]'}`}
    >
      <Icon size={18} className={`transition-colors ${currentView === view ? 'text-[#FFD700]' : 'text-[#666] group-hover:text-[#E0E0E0]'}`} />
      <span className="font-medium tracking-wide text-sm">{label}</span>
      {currentView === view && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#FFD700] shadow-[0_0_5px_#FFD700]" />}
    </button>
  );

  return (
    <div className={`flex h-screen w-screen transition-colors duration-500 overflow-hidden ${
      lynchianMode ? 'bg-[#030305] text-[#FFF8E7]' : 'bg-[#121212] text-[#E0E0E0]'
    }`}>
      {/* Sidebar */}
      <div className={`${
        effectiveSidebarCollapsed 
          ? 'w-0 opacity-0 overflow-hidden border-r-0 p-0 pointer-events-none' 
          : 'w-64 opacity-100'
      } flex flex-col border-r transition-all duration-300 shrink-0 ${
        lynchianMode ? 'border-[#88081C]/60 bg-[#07050A]' : 'border-[#222] bg-[#0E0E0E]'
      }`}>
        {/* Logo with Secret 5-Click Lynchian Mode Trigger & Quick Collapse Button */}
        <div 
          className={`p-5 border-b transition-all duration-300 select-none group relative flex items-center justify-between ${
            lynchianMode ? 'border-[#88081C]/60 bg-[#0E060D]' : 'border-[#222] bg-[#111111]'
          }`}
        >
          <div 
            onClick={handleLogoClick}
            className="cursor-pointer flex-1 min-w-0"
            title="Strangelet Lab (Click 5 times for Lynchian Noir Mode)"
          >
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold tracking-tighter text-white flex items-center gap-2 truncate">
                <img 
                  src="./strangelet-lab-logo.jpg" 
                  alt="Strangelet Lab Seal" 
                  className={`w-7 h-7 rounded-full border object-cover shrink-0 transition-transform duration-300 group-hover:scale-110 ${
                    lynchianMode 
                      ? 'border-[#E50914] shadow-[0_0_12px_#E50914]' 
                      : 'border-[#FFD700]/60 shadow-[0_0_10px_rgba(255,215,0,0.35)]'
                  }`} 
                />
                <span>STRANGELET <span className={lynchianMode ? 'text-[#E50914]' : 'text-[#FFD700]'}>LAB</span></span>
              </h1>

              {logoClicks > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono border border-amber-500/40 animate-pulse shrink-0 ml-1">
                  {logoClicks}/5
                </span>
              )}
            </div>
            <p className="text-[10px] text-[#777] mt-1 tracking-widest uppercase flex items-center justify-between">
              <span>AI Audio Workstation</span>
              {lynchianMode && (
                <span className="text-[9px] text-[#E50914] font-bold tracking-normal animate-pulse">
                  [NOIR]
                </span>
              )}
            </p>

            {onOpenKoboldMusicBridge && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenKoboldMusicBridge();
                }}
                className="mt-2.5 w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#161A2B] hover:bg-[#20273F] border border-amber-500/40 hover:border-[#FFD700] text-[#FFD700] transition-all cursor-pointer group shadow-[0_0_12px_rgba(255,215,0,0.15)]"
                title="Open Kobold Audio Bridge (AI Music Generator)"
              >
                <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold">
                  <Zap size={13} className="fill-[#FFD700]/30 group-hover:scale-110 transition-transform" />
                  <span>KOBOLD BRIDGE</span>
                </span>
                <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-[#FFD700] font-mono border border-amber-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>REST</span>
                </span>
              </button>
            )}
          </div>

          {/* Quick Collapse Button inside Sidebar Header */}
          <button
            onClick={handleToggleSidebar}
            className="p-1.5 ml-2 rounded-lg bg-[#181818] hover:bg-[#252525] border border-[#333] hover:border-[#00F0FF]/60 text-[#888] hover:text-[#00F0FF] transition-all shrink-0"
            title="Collapse Sidebar (Ctrl+B) to expand workspace"
          >
            <PanelLeftClose size={15} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {/* Strangelet Guru Audio Ninja Sensei Sidebar Banner (Top of Sidebar) */}
          {onOpenGhostBuddy && (
            <div className="relative group/guru mb-2">
              <button
                onClick={() => {
                  onOpenGhostBuddy();
                  playLaserBeamSound('laser_select');
                }}
                className="w-full p-2.5 rounded-xl border bg-gradient-to-r from-[#1A1206] via-[#24180A] to-[#140F05] border-amber-500/50 hover:border-amber-400 text-left transition-all group shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] cursor-pointer"
                title="Consult Ghost in the Machine: Resident Mad Scientist, Recording Troubleshooter & Faust DSP Mentor (Shortcut: Alt+G)"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/30 to-yellow-600/30 border border-amber-400/60 flex items-center justify-center text-amber-300 shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.3)] group-hover:scale-105 transition-transform">
                    <Bot size={16} className="text-amber-300 animate-pulse" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold font-mono text-amber-300 tracking-wider flex items-center gap-1 truncate">
                        <span>GHOST IN THE MACHINE</span>
                      </span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded font-mono shrink-0 border ${
                        isGuruDockedInSidebar
                          ? 'bg-amber-950 text-amber-300 border-amber-600/60'
                          : 'bg-[#121624] text-[#00F0FF] border-[#2A3B60]'
                      }`}>
                        {isGuruDockedInSidebar ? 'DOCKED' : 'FLOAT'}
                      </span>
                    </div>
                    <div className="text-[9px] text-[#C4B58E] truncate mt-0.5 font-mono flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <span>Mad Scientist • Lab AI</span>
                    </div>
                  </div>
                </div>
              </button>

              {/* Quick Undock / Dock to Screen Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleGuruDocking();
                }}
                className="absolute top-2 right-2 p-1 rounded-md bg-[#0D0B06]/95 hover:bg-[#1E170A] text-[#888] hover:text-amber-300 border border-amber-500/30 opacity-0 group-hover/guru:opacity-100 transition-opacity z-10"
                title={isGuruDockedInSidebar ? "Undock / Float on Screen Corner" : "Dock to Top of Sidebar (Removes floating overlay)"}
              >
                <ArrowRightLeft size={11} />
              </button>
            </div>
          )}

          <ImportArea
            onImport={(file) => {
              if (onImportAudioFile) {
                onImportAudioFile(file);
              } else {
                onImportAudio?.();
              }
            }}
            onOpenLoops={onOpenAceStepDesigner}
            onOpenLiveInput={onOpenLiveRecorder}
          />

          <div className="flex items-center justify-between px-2 pt-2 mb-2">
            <span className="text-[10px] font-mono text-[#555] uppercase tracking-wider">
              Tracks ({tracks.length})
            </span>
            {onOpenNewProject && (
              <button 
                onClick={onOpenNewProject}
                className="text-[10px] font-mono text-[#FFD700] hover:text-white flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1C1C14] hover:bg-[#2A2A20] border border-[#FFD700]/30 transition-colors"
                title="Initialize New Project from Template"
              >
                <Plus size={10} /> NEW
              </button>
            )}
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
            {tracks.map(track => (
              <div 
                key={track.id} 
                className="flex items-center justify-between px-2.5 py-1.5 bg-[#161616] hover:bg-[#1C1C1C] border border-[#222] rounded text-xs text-white transition-colors"
              >
                <div className="flex items-center gap-2 truncate min-w-0 pr-1">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: track.color }} />
                  <span className="truncate text-xs text-[#DDD]" title={track.name}>
                    {track.name}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button 
                    onClick={() => onToggleTrackMute?.(track.id)}
                    className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center transition-colors ${
                      track.muted 
                        ? 'bg-red-900/90 text-red-200 border border-red-500' 
                        : 'bg-[#252525] text-[#777] hover:text-[#CCC]'
                    }`}
                    title={track.muted ? 'Unmute' : 'Mute'}
                  >
                    M
                  </button>
                  <button 
                    onClick={() => onToggleTrackSolo?.(track.id)}
                    className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center transition-colors ${
                      track.soloed 
                        ? 'bg-amber-600 text-black border border-amber-400 font-extrabold' 
                        : 'bg-[#252525] text-[#777] hover:text-[#CCC]'
                    }`}
                    title={track.soloed ? 'Unsolo' : 'Solo'}
                  >
                    S
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Project Clip Bin (Slices from Beam Splitter) */}
          <div className="pt-3 pb-1 border-t border-[#1F1F1F]">
            <div className="flex items-center justify-between px-2 mb-1.5">
              <span className="text-[10px] font-mono text-[#00F0FF] uppercase tracking-wider flex items-center gap-1.5 font-bold">
                <Split size={11} className="text-[#00F0FF]" />
                <span>Project Bin ({projectBinClips.length})</span>
              </span>
              {projectBinClips.length > 0 && (
                <span className="text-[8px] font-mono px-1 py-0.2 bg-[#00F0FF]/20 text-[#00F0FF] rounded">
                  CLIPS
                </span>
              )}
            </div>

            {projectBinClips.length === 0 ? (
              <div className="px-2 py-2 text-[10px] text-[#555] font-mono text-center border border-dashed border-[#222] rounded bg-[#0A0A0E]">
                No clips in bin. Use Beam Splitter to batch export slices.
              </div>
            ) : (
              <div className="space-y-1 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                {projectBinClips.map(clip => (
                  <div 
                    key={clip.id}
                    className="flex items-center justify-between px-2 py-1 bg-[#13151D] hover:bg-[#1A1E2C] border border-[#222] hover:border-[#00F0FF]/40 rounded text-xs transition-colors group"
                  >
                    <div className="flex items-center gap-1.5 truncate min-w-0 pr-1">
                      <button
                        onClick={() => handleAuditionClip(clip)}
                        className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                          auditioningClipId === clip.id
                            ? 'bg-[#00F0FF] text-black'
                            : 'bg-[#202534] text-[#888] group-hover:text-white'
                        }`}
                        title="Audition slice"
                      >
                        <Play size={8} fill={auditioningClipId === clip.id ? 'black' : 'currentColor'} />
                      </button>
                      <span 
                        className="w-1.5 h-1.5 rounded-full shrink-0" 
                        style={{ backgroundColor: clip.color || '#00F0FF' }} 
                      />
                      <span className="truncate font-mono text-[10px] text-[#CCC] group-hover:text-white" title={clip.name}>
                        {clip.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {clip.hitType && (
                        <span className="text-[8px] font-mono font-bold px-1 rounded bg-[#00F0FF]/15 text-[#00F0FF] uppercase">
                          {clip.hitType}
                        </span>
                      )}
                      <span className="text-[9px] font-mono text-[#666]">
                        {clip.durationSeconds}s
                      </span>
                      {onInsertBinClipToTrack && (
                        <button
                          onClick={() => onInsertBinClipToTrack(clip)}
                          className="w-4 h-4 rounded bg-[#1C2436] hover:bg-[#00F0FF] hover:text-black text-[#AAA] flex items-center justify-center text-[10px] font-bold transition-colors ml-0.5"
                          title="Place clip onto first audio track"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-[10px] font-mono text-[#EC4899] uppercase mb-2 px-2 pt-4 flex items-center justify-between">
            <span>Neural Loop Engine</span>
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-pink-950/80 text-pink-300 border border-pink-700/50">GGUF</span>
          </div>
          <NavItem view={View.ACESTEP_LOOP_DESIGNER} label="ACE-STEP 1.5 LOOPS" icon={Sparkles} />

          <div className="text-[10px] font-mono text-cyan-400 uppercase mb-2 px-2 pt-4 flex items-center justify-between">
            <span>Faust DSP Workbench</span>
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/50">TOY VST</span>
          </div>
          <NavItem view={View.FAUST_DSP_LAB} label="FAUST DSP TOY LAB" icon={Code2} />

          <div className="text-[10px] font-mono text-emerald-400 uppercase mb-2 px-2 pt-4 flex items-center justify-between">
            <span>Audio to MIDI</span>
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/50">BASIC PITCH</span>
          </div>
          {onOpenBasicPitch ? (
            <button
              onClick={onOpenBasicPitch}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono text-[#8C96B5] hover:text-emerald-300 hover:bg-emerald-950/30 transition-all border border-transparent hover:border-emerald-500/30 text-left"
            >
              <Keyboard size={16} className="text-emerald-400 shrink-0" />
              <span className="truncate">BASIC PITCH (AUDIO-TO-MIDI)</span>
            </button>
          ) : (
            <NavItem view={View.MIXER} label="BASIC PITCH (AUDIO-TO-MIDI)" icon={Keyboard} />
          )}
          <NavItem view={View.MIDI_EDITOR} label="MIDI PIANO ROLL" icon={Music} />

          <div className="text-[10px] font-mono text-cyan-400 uppercase mb-2 px-2 pt-4 flex items-center justify-between">
            <span>Hadron Collider</span>
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/50">LSC</span>
          </div>
          <NavItem view={View.SONIC_COLLIDER} label="SONIC COLLIDER" icon={Atom} />

          <div className="text-[10px] font-mono text-purple-400 uppercase mb-2 px-2 pt-4 flex items-center justify-between">
            <span>Pipelines & Soundbanks</span>
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-700/50">STUDIO</span>
          </div>
          {onOpenWorkflowStudio && (
            <button
              onClick={onOpenWorkflowStudio}
              className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-xs font-mono text-purple-300 hover:text-white hover:bg-purple-950/40 transition-all text-left"
            >
              <Workflow size={16} className="text-purple-400 shrink-0" />
              <span className="font-medium tracking-wide">GUIDED WORKFLOWS</span>
            </button>
          )}
          {onOpenSfzLibrary && (
            <button
              onClick={onOpenSfzLibrary}
              className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-xs font-mono text-cyan-300 hover:text-white hover:bg-cyan-950/40 transition-all text-left"
            >
              <Music size={16} className="text-cyan-400 shrink-0" />
              <span className="font-medium tracking-wide">SFZ OPEN LIBRARY</span>
            </button>
          )}

          <div className="text-[10px] font-mono text-[#444] uppercase mb-2 px-2 pt-4">Workflow</div>
          <NavItem view={View.INSTRUMENT_GENERATOR} label="INSTRUMENT BUILDER" icon={Layers} />
          <NavItem view={View.MIXER} label="MIXER & TIMELINE" icon={Settings2} />
          <NavItem view={View.TEMPLATE_GALLERY} label="TEMPLATE GALLERY" icon={FolderKanban} />
          <NavItem view={View.PROJECT_STATS} label="PROJECT STATISTICS" icon={BarChart3} />
          <NavItem view={View.SPECTRAL_ANALYSIS} label="SPECTRAL ANALYZER" icon={Activity} />
          <NavItem view={View.BEAM_SPLITTER} label="BEAM SPLITTER (PRISM)" icon={Split} />
          <NavItem view={View.WAVE_SPLITTER} label="STEM SPLITTER" icon={Scissors} />
          <NavItem view={View.DRUM_DESIGNER} label="DRUM DESIGNER" icon={Drum} />
          <NavItem view={View.AUDIO_EDITOR} label="AUDIO EDITOR" icon={Scissors} />
          <NavItem view={View.VOICE_CLONER} label="VOICE CLONER" icon={Mic} />
          <NavItem view={View.MASTERING} label="MASTERING" icon={Sparkles} />
          
          <div className="text-[10px] font-mono text-[#444] uppercase mb-2 px-2 pt-4">Experimental</div>
          <NavItem view={View.AURA} label="AURA VOICE" icon={Mic} />
          <NavItem view={View.DRUM_TRIGGER} label="DRUM TRIGGER" icon={Music} />
          
          <div className="text-[10px] font-mono text-cyan-400 uppercase mb-2 px-2 pt-4 flex items-center justify-between">
            <span>Documentation & Help</span>
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/50">OFFLINE MANUAL</span>
          </div>
          {onOpenUserGuide && (
            <button
              onClick={onOpenUserGuide}
              className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-xs font-mono text-cyan-300 hover:text-white hover:bg-cyan-950/50 border border-cyan-500/40 hover:border-cyan-400 transition-all text-left shadow-[0_0_10px_rgba(6,182,212,0.15)] group"
            >
              <BookOpen size={16} className="text-cyan-400 shrink-0 group-hover:scale-110 transition-transform" />
              <div className="flex flex-col min-w-0">
                <span className="font-bold tracking-wide text-white">USER MANUAL & GUIDE</span>
                <span className="text-[9px] text-cyan-400/80 font-mono">PDF Export • Faust • AI • Shortcuts [F1]</span>
              </div>
            </button>
          )}

          <div className="text-[10px] font-mono text-[#444] uppercase mb-2 px-2 pt-4">Configuration</div>
          <NavItem view={View.SYSTEM_CORE} label="SYSTEM CORE" icon={Terminal} />
        </nav>

        <div className="p-4 border-t border-[#222] text-[10px] text-[#444] text-center font-mono">
           v1.0.0-rc1 // 6GB VRAM Mode
        </div>
      </div>

      {/* Floating edge handle when sidebar is collapsed */}
      {effectiveSidebarCollapsed && (
        <button
          onClick={handleToggleSidebar}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-30 px-1 py-4 bg-[#141414]/90 hover:bg-[#1C2030] border-r-2 border-y border-[#333] hover:border-[#00F0FF] rounded-r-lg text-[#888] hover:text-[#00F0FF] transition-all shadow-[0_0_20px_rgba(0,0,0,0.8)] flex flex-col items-center gap-2 group backdrop-blur-md"
          title="Expand Navigation Sidebar (Ctrl+B)"
        >
          <PanelLeftOpen size={16} className="text-[#00F0FF] group-hover:scale-110 transition-transform" />
          <span className="[writing-mode:vertical-lr] text-[9px] font-mono tracking-widest text-[#AAA] group-hover:text-white uppercase font-bold">
            SIDEBAR
          </span>
        </button>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className={`h-20 border-b flex items-center justify-between px-6 transition-colors duration-500 ${
          lynchianMode ? 'border-[#88081C]/60 bg-[#07050A]' : 'border-[#222] bg-[#121212]'
        }`}>
            <div className="flex items-center gap-2">
                {/* Collapsed Logo Header Emblem */}
                {effectiveSidebarCollapsed && (
                  <div className="flex items-center gap-1.5 pr-2 border-r border-[#222]">
                    <img 
                      src="./strangelet-lab-logo.jpg" 
                      alt="Strangelet Lab Seal" 
                      className="w-6 h-6 rounded-full border border-[#FFD700]/60 object-cover shrink-0 shadow-[0_0_8px_rgba(255,215,0,0.35)]" 
                    />
                    <span className="font-bold text-white font-mono text-xs hidden sm:inline">
                      STRANGELET <span className={lynchianMode ? 'text-[#E50914]' : 'text-[#FFD700]'}>LAB</span>
                    </span>
                  </div>
                )}

                {/* Show/Hide Sidebar Toggle */}
                <button
                  onClick={handleToggleSidebar}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#181C28] hover:bg-[#22293C] border border-[#2B3550] hover:border-[#00F0FF]/50 rounded-lg transition-all text-xs text-[#AAA] hover:text-white cursor-pointer"
                  title={effectiveSidebarCollapsed ? "Show Navigation & Project Sidebar (Ctrl+B)" : "Hide Sidebar (Ctrl+B)"}
                >
                  {effectiveSidebarCollapsed ? (
                    <>
                      <PanelLeftOpen size={15} className="text-[#00F0FF]" />
                      <span className="hidden md:inline font-mono text-[11px] text-[#00F0FF] font-bold">Sidebar</span>
                    </>
                  ) : (
                    <>
                      <PanelLeftClose size={15} />
                      <span className="hidden md:inline font-mono text-[11px]">Sidebar</span>
                    </>
                  )}
                </button>

                {/* Kobold Audio Bridge Direct Header Button */}
                {onOpenKoboldMusicBridge && (
                  <button
                    onClick={onOpenKoboldMusicBridge}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161A2B] hover:bg-[#20273F] border border-amber-500/50 hover:border-[#FFD700] rounded-lg transition-all text-xs text-[#FFD700] font-mono font-bold cursor-pointer shadow-[0_0_12px_rgba(255,215,0,0.2)] group"
                    title="Open Kobold Audio Bridge: Two-step neural music generator connecting to KoboldCpp REST API"
                  >
                    <Zap size={14} className="fill-[#FFD700]/30 text-[#FFD700] group-hover:scale-110 transition-transform" />
                    <span className="hidden sm:inline">KOBOLD BRIDGE</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                  </button>
                )}

                {/* TRADITIONAL DAW MENU BAR (UPPER LEFT: File, Edit, View, Track, AI / Tools, Export, Help) */}
                <DawMenuBar
                  currentView={currentView}
                  setView={setView}
                  tracks={tracks}
                  tempo={tempo}
                  activeSession={activeSession}
                  onOpenNewProject={onOpenNewProject}
                  onManualSave={onManualSave}
                  onRestoreAutoSave={onRestoreAutoSave}
                  onImportAudio={onImportAudio}
                  onUndo={onUndo}
                  onRedo={onRedo}
                  onClearAllMutes={onClearAllMutes}
                  onClearAllSolos={onClearAllSolos}
                  onArmAllTracks={onArmAllTracks}
                  onAddTrack={onAddTrack}
                  onToggleSidebar={handleToggleSidebar}
                  isSidebarCollapsed={effectiveSidebarCollapsed}
                  lynchianMode={lynchianMode}
                  onToggleLynchianMode={onToggleLynchianMode}
                  onOpenLiveRecorder={onOpenLiveRecorder}
                  onOpenChronoMap={onOpenChronoMap}
                  onOpenBeamSplitter={onOpenBeamSplitter}
                  onOpenBasicPitch={onOpenBasicPitch}
                  onOpenGhostBuddy={onOpenGhostBuddy}
                  onOpenAceStepDesigner={onOpenAceStepDesigner}
                  onOpenAiMixStep={onOpenAiMixStep}
                  onOpenFaustDspLab={onOpenFaustDspLab}
                  onOpenSfzLibrary={onOpenSfzLibrary}
                  onOpenLoraLibrary={onOpenLoraLibrary}
                  onOpenWorkflowStudio={onOpenWorkflowStudio}
                  onOpenKoboldSettings={onOpenKoboldSettings}
                  onOpenExportMix={() => onOpenBatchStemExport?.()}
                  onOpenBatchStemExport={onOpenBatchStemExport}
                  onOpenExportZip={() => onOpenBatchStemExport?.()}
                  onOpenUserGuide={onOpenUserGuide}
                  onOpenSoftwareDojo={onOpenSoftwareDojo}
                  onOpenResourceManager={onOpenResourceManager}
                  isGuruDockedInSidebar={isGuruDockedInSidebar}
                  onMoveGuruToSidebar={handleToggleGuruDocking}
                  isAutoArmMode={isAutoArmMode}
                  onToggleAutoArm={onToggleAutoArm}
                  onOpenCollabWorkspace={onOpenCollabWorkspace}
                  collabSessionCode={collabSessionCode}
                  collabMemberCount={collabMemberCount}
                  onOpenYue2Generator={onOpenYue2Generator}
                  onOpenAddonsHub={onOpenAddonsHub}
                  onOpenVstWrapperHost={onOpenVstWrapperHost}
                  onReplaySplashScreen={onReplaySplashScreen}
                  onOpenKoboldMusicBridge={onOpenKoboldMusicBridge}
                />

                {/* Global Undo & Redo History Controls */}
                {onUndo && onRedo && (
                  <UndoRedoControls onUndo={onUndo} onRedo={onRedo} variant="compact" />
                )}

                {/* 60-Second Auto-Save Status Pill */}
                {onManualSave && onRestoreAutoSave && (
                  <AutoSaveIndicator 
                    onManualSave={onManualSave} 
                    onRestoreAutoSave={onRestoreAutoSave} 
                    lastSavedTimestamp={lastSavedTimestamp ?? null} 
                  />
                )}

                {/* Tape Saturator Visual Mode Selector */}
                {onChangeTapeIntensity && (
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-[#181824] border border-[#2B2B3E] rounded-md text-xs">
                    <span className="text-[10px] font-mono text-[#888]">TAPE:</span>
                    {(['off', 'subtle', 'warm', 'lynchian'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => onChangeTapeIntensity(mode)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase transition-colors ${
                          tapeIntensity === mode
                            ? 'bg-[#FFD700] text-black font-bold'
                            : 'text-[#888] hover:text-white'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                )}

                {/* Lynchian Noir Mode Active Pill */}
                {lynchianMode && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#88081C]/40 border border-[#E50914] text-[#FFF8E7] text-xs font-mono shadow-[0_0_15px_rgba(229,9,20,0.4)] animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-[#E50914]" />
                    <span className="font-bold">LYNCHIAN NOIR MODE</span>
                    {onToggleAmbientDroneMute && (
                      <button
                        onClick={onToggleAmbientDroneMute}
                        className={`px-1.5 py-0.5 rounded text-[9px] border ${
                          isAmbientDroneMuted
                            ? 'bg-black/80 text-[#888] border-[#444]'
                            : 'bg-[#E50914] text-white border-white'
                        }`}
                        title="Toggle ambient background drone"
                      >
                        {isAmbientDroneMuted ? 'FX MUTED' : 'FX ON'}
                      </button>
                    )}
                    <button
                      onClick={onToggleLynchianMode}
                      className="text-[10px] text-[#CCC] hover:text-white ml-1 underline"
                    >
                      Exit
                    </button>
                  </div>
                )}

                <div className="text-xs text-[#777] font-mono uppercase hidden xl:flex items-center gap-2 border-l border-[#222] pl-4">
                    <span>Active Session:</span>
                    <span className="text-white font-bold tracking-tight">
                      {activeSession ? activeSession.name : 'Project_Neon_Sky.slp'}
                    </span>
                    {activeSession && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[#1A1A24] text-[#FF8C00] border border-[#282838] normal-case">
                        {activeSession.templateName} • {activeSession.bpm} BPM
                      </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Studio UI Sound Effects Mute Toggle (Audio Recording & Clean Monitoring Protection) */}
              <button
                onClick={() => toggleUiSoundMuted()}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-mono transition-all cursor-pointer active:scale-95 ${
                  uiSoundMuted
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/50 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                    : 'bg-amber-950/40 border-amber-500/60 text-amber-300 hover:bg-amber-900/50'
                }`}
                title={
                  uiSoundMuted
                    ? 'Studio Silent Mode Active: UI beeps and clicks are disabled to ensure clean microphone recording, headphone isolation, and uncorrupted loopback/master bus monitoring. (Click to enable retro audio feedback)'
                    : 'Caution: UI Audio Feedback is Active! Clicks and beeps may bleed into live microphones or loopback recording takes. (Click to mute)'
                }
              >
                {uiSoundMuted ? (
                  <>
                    <ShieldCheck size={13} className="text-emerald-400" />
                    <span className="hidden md:inline font-bold text-[11px] tracking-tight">REC SAFE (SILENT)</span>
                  </>
                ) : (
                  <>
                    <Volume2 size={13} className="text-amber-400 animate-pulse" />
                    <span className="hidden md:inline font-bold text-[11px] text-amber-300">UI BEEPS ON</span>
                  </>
                )}
              </button>

              {/* Ghost Qwen 4B Active Quick Trigger Pill in Top Bar */}
              {onOpenGhostBuddy && (
                <button
                  onClick={() => {
                    onOpenGhostBuddy();
                    playLaserBeamSound('laser_select');
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-mono transition-all cursor-pointer bg-gradient-to-r from-red-950/60 via-orange-950/40 to-amber-950/50 border-red-500/50 hover:border-amber-400 text-amber-300 hover:text-white shadow-[0_0_12px_rgba(239,68,68,0.25)] active:scale-95"
                  title={`Ghost in the Machine (${getStoredKoboldSettings().modelName}) is active and scaled to your VRAM profile. Click to focus/toggle terminal (Alt+G)`}
                >
                  <Zap size={13} className="text-orange-400 animate-pulse" />
                  <span className="font-bold text-[11px] tracking-tight">👻 GHOST: {ghostModelBadge}</span>
                  <span className="text-[8px] px-1 py-0.2 rounded bg-amber-950 text-amber-200 border border-amber-600/50 font-bold hidden sm:inline">
                    LAB AI
                  </span>
                </button>
              )}

              {/* YuE 2.0 Foundation Model Generator Quick Launcher */}
              {onOpenYue2Generator && (
                <button
                  onClick={() => {
                    onOpenYue2Generator();
                    playLaserBeamSound('laser_select');
                  }}
                  className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-mono transition-all cursor-pointer bg-gradient-to-r from-purple-950/60 via-indigo-950/40 to-cyan-950/50 border-purple-500/50 hover:border-cyan-400 text-purple-200 hover:text-white shadow-[0_0_10px_rgba(168,85,247,0.2)] active:scale-95"
                  title="YuE 2.0 AI Generator: Dual-Track Song Foundation Model with full lyrics-to-song and multi-stem export"
                >
                  <Sparkles size={13} className="text-cyan-400 animate-pulse" />
                  <span className="font-bold text-[11px] tracking-tight">YUE 2.0</span>
                  <span className="text-[8px] px-1 py-0.2 rounded bg-purple-900/60 text-purple-300 border border-purple-500/40 font-bold">
                    AI
                  </span>
                </button>
              )}

              {/* Global UI-Wide MIDI Learn Mode Toggle */}
              <button
                data-midi-learn-ignore="true"
                onClick={() => midiLearnService.toggleLearnMode()}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-mono transition-all cursor-pointer active:scale-95 ${
                  globalMidiLearnActive
                    ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_16px_#F59E0B] animate-pulse'
                    : midiMappingCount > 0
                      ? 'bg-amber-950/40 border-amber-500/60 text-amber-300 hover:bg-amber-900/50'
                      : 'bg-[#121624] border-[#2B3550] text-[#9EB0D8] hover:text-amber-300 hover:border-amber-400/70'
                }`}
                title="Toggle Global MIDI Learn Mode: Click any knob, fader, or button anywhere in Strangelet Lab and touch a hardware MIDI CC control to map it"
              >
                <Sliders size={13} className={globalMidiLearnActive ? 'text-black' : 'text-amber-400'} />
                <span className="font-bold text-[11px] tracking-tight">MIDI LEARN</span>
                {midiMappingCount > 0 && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    globalMidiLearnActive ? 'bg-black text-amber-300' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {midiMappingCount}
                  </span>
                )}
              </button>

              {/* VST Wrapper Host Quick Launcher */}
              {onOpenVstWrapperHost && (
                <button
                  onClick={() => {
                    onOpenVstWrapperHost();
                    playLaserBeamSound('laser_select');
                  }}
                  className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-mono transition-all cursor-pointer bg-[#181822] hover:bg-[#20202E] border-[#3A3855] hover:border-[#FFD700]/70 text-[#C9C8E0] hover:text-[#FFD700] active:scale-95"
                  title="Simulated VST Wrapper Layer: Non-native plugin host with physical chassis faceplates and 8-stage DSP routing"
                >
                  <SlidersHorizontal size={13} className="text-[#FFD700]" />
                  <span className="font-bold text-[11px] tracking-tight">VST RACK</span>
                </button>
              )}

              {/* Real-Time Collaborative Workspace Session Pill in Top Bar */}
              {onOpenCollabWorkspace && (
                <button
                  onClick={() => {
                    onOpenCollabWorkspace();
                    playLaserBeamSound('laser_select');
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-mono transition-all cursor-pointer active:scale-95 ${
                    collabSessionCode
                      ? 'bg-gradient-to-r from-cyan-950/80 to-blue-950/80 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35)]'
                      : 'bg-[#101524] border-[#222E4A] text-[#8C9BBF] hover:text-cyan-300 hover:border-cyan-500/50'
                  }`}
                  title={collabSessionCode ? `Connected to Collaborative Session: ${collabSessionCode}. Click to manage room.` : 'Real-Time Collaboration: Join or host a session with a shared 6-character code'}
                >
                  <Radio size={13} className={collabSessionCode ? 'text-cyan-400 animate-pulse' : 'text-[#8C9BBF]'} />
                  <span className="font-bold text-[11px] tracking-tight">
                    {collabSessionCode ? `COLLAB: ${collabSessionCode}` : 'COLLABORATE'}
                  </span>
                  {(collabMemberCount || 0) > 1 && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-400 text-black font-extrabold shadow-[0_0_6px_#06B6D4]">
                      {collabMemberCount}
                    </span>
                  )}
                </button>
              )}

              {/* Hardware Monitor */}
              <HardwareMonitor 
                vramUsed={stats.vramUsed} 
                vramTotal={stats.vramTotal} 
                onOpenResourceManager={onOpenResourceManager}
              />
            </div>
        </div>

        {/* Viewport */}
        <div className={`flex-1 overflow-y-auto relative transition-colors duration-500 ${
          lynchianMode ? 'bg-[#030305]' : 'bg-[#121212]'
        }`}>
            {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;