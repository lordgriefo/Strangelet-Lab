import React, { useState, useRef, useEffect } from 'react';
import { View, HardwareStats, Track, ProjectSession, ProjectBinClip } from '../types';
import { THEME } from '../constants';
import HardwareMonitor from './HardwareMonitor';
import { LayoutGrid, Layers, Mic, Music, Settings2, Sparkles, Terminal, Download, ChevronDown, Scissors, Drum, FolderPlus, Plus, Atom, Split, PanelLeftClose, PanelLeftOpen, Play, Volume2 } from 'lucide-react';
import ImportArea from './ImportArea';
import { INITIAL_TRACKS } from '../constants';

const ExportMenu: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
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

    const handleExport = (type: 'mix' | 'wav' | 'midi' | 'loop') => {
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
            case 'wav':
                // Mock ZIP file content
                blob = new Blob(['PK\x03\x04', 'mock_wav_stems.zip'], { type: 'application/zip' });
                filename = 'wav_stems.zip';
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
  onInsertBinClipToTrack
}) => {
  const [internalSidebarCollapsed, setInternalSidebarCollapsed] = useState<boolean>(false);
  const effectiveSidebarCollapsed = propSidebarCollapsed !== undefined ? propSidebarCollapsed : internalSidebarCollapsed;
  const handleToggleSidebar = onToggleSidebar || (() => setInternalSidebarCollapsed(prev => !prev));

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
        {/* Logo with Secret 5-Click Lynchian Mode Trigger */}
        <div 
          onClick={handleLogoClick}
          className={`p-6 border-b transition-all duration-300 cursor-pointer select-none group relative ${
            lynchianMode ? 'border-[#88081C]/60 bg-[#0E060D]' : 'border-[#222] hover:bg-[#151515]'
          }`}
          title="Strangelet Lab (Click 5 times for Lynchian Noir Mode)"
        >
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tighter text-white flex items-center gap-2">
              <div className={`w-3 h-3 rotate-45 transition-transform duration-300 group-hover:scale-125 ${
                lynchianMode ? 'bg-[#E50914] shadow-[0_0_12px_#E50914]' : 'bg-[#FFD700]'
              }`} />
              STRANGELET <span className={lynchianMode ? 'text-[#E50914]' : 'text-[#FFD700]'}>LAB</span>
            </h1>

            {logoClicks > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono border border-amber-500/40 animate-pulse">
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
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <ImportArea onImport={(file) => console.log('Importing file:', file.name)} />

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

          <div className="text-[10px] font-mono text-cyan-400 uppercase mb-2 px-2 pt-4 flex items-center justify-between">
            <span>Hadron Collider</span>
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/50">LSC</span>
          </div>
          <NavItem view={View.SONIC_COLLIDER} label="SONIC COLLIDER" icon={Atom} />

          <div className="text-[10px] font-mono text-[#444] uppercase mb-2 px-2 pt-4">Workflow</div>
          <NavItem view={View.INSTRUMENT_GENERATOR} label="INSTRUMENT BUILDER" icon={Layers} />
          <NavItem view={View.MIXER} label="MIXER & TIMELINE" icon={Settings2} />
          <NavItem view={View.BEAM_SPLITTER} label="BEAM SPLITTER (PRISM)" icon={Split} />
          <NavItem view={View.WAVE_SPLITTER} label="STEM SPLITTER" icon={Scissors} />
          <NavItem view={View.DRUM_DESIGNER} label="DRUM DESIGNER" icon={Drum} />
          <NavItem view={View.AUDIO_EDITOR} label="AUDIO EDITOR" icon={Scissors} />
          <NavItem view={View.MASTERING} label="MASTERING" icon={Sparkles} />
          
          <div className="text-[10px] font-mono text-[#444] uppercase mb-2 px-2 pt-4">Experimental</div>
          <NavItem view={View.AURA} label="AURA VOICE" icon={Mic} />
          <NavItem view={View.DRUM_TRIGGER} label="DRUM TRIGGER" icon={Music} />
          
          <div className="text-[10px] font-mono text-[#444] uppercase mb-2 px-2 pt-4">Configuration</div>
          <NavItem view={View.SYSTEM_CORE} label="SYSTEM CORE" icon={Terminal} />
        </nav>

        <div className="p-4 border-t border-[#222] text-[10px] text-[#444] text-center font-mono">
           v1.0.0-rc1 // 6GB VRAM Mode
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className={`h-20 border-b flex items-center justify-between px-6 transition-colors duration-500 ${
          lynchianMode ? 'border-[#88081C]/60 bg-[#07050A]' : 'border-[#222] bg-[#121212]'
        }`}>
            <div className="flex items-center gap-3">
                {/* Show/Hide Sidebar Toggle */}
                <button
                  onClick={handleToggleSidebar}
                  className="flex items-center gap-1.5 px-2.5 py-2 bg-[#1A1A1A] hover:bg-[#252525] border border-[#333] hover:border-[#00F0FF]/50 rounded-md transition-all text-xs text-[#AAA] hover:text-white"
                  title={effectiveSidebarCollapsed ? "Show Navigation & Project Sidebar" : "Hide Sidebar (Expand Workspace)"}
                >
                  {effectiveSidebarCollapsed ? (
                    <>
                      <PanelLeftOpen size={16} className="text-[#00F0FF]" />
                      <span className="hidden md:inline font-mono text-[11px] text-[#00F0FF] font-bold">Show Sidebar</span>
                    </>
                  ) : (
                    <>
                      <PanelLeftClose size={16} />
                      <span className="hidden md:inline font-mono text-[11px]">Hide Sidebar</span>
                    </>
                  )}
                </button>

                {onOpenNewProject && (
                  <button
                    onClick={onOpenNewProject}
                    className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[#1E1C12] to-[#1F1E16] hover:from-[#2A2718] hover:to-[#2B291D] border border-[#FFD700]/50 hover:border-[#FFD700] rounded-md transition-all shadow-[0_0_12px_rgba(255,215,0,0.15)] group"
                    title="Choose from pre-configured routing templates like Vocal Tracking or Mastering Chain"
                  >
                    <FolderPlus size={15} className="text-[#FFD700] group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-semibold text-white tracking-wide">New Project</span>
                  </button>
                )}

                {/* Live Microphone Recorder Quick Trigger */}
                {onOpenLiveRecorder && (
                  <button
                    onClick={onOpenLiveRecorder}
                    className="flex items-center gap-2 px-3 py-2 bg-red-950/60 hover:bg-red-900 border border-red-500/50 hover:border-red-400 rounded-md transition-all text-white text-xs font-bold shadow-[0_0_12px_rgba(239,68,68,0.25)]"
                    title="Open Live Microphone Multitrack Recorder"
                  >
                    <Mic size={15} className="text-red-400 animate-pulse" />
                    <span>Live Mic Recorder</span>
                  </button>
                )}

                <ExportMenu />

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
            <HardwareMonitor vramUsed={stats.vramUsed} vramTotal={stats.vramTotal} />
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