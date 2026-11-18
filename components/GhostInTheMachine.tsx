import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Zap, 
  X, 
  Minimize2, 
  Maximize2, 
  Cpu, 
  Activity, 
  Sliders, 
  Settings2, 
  RotateCcw,
  Check,
  ChevronRight, 
  Shield,
  MessageSquare,
  Terminal,
  Volume2,
  BookOpen,
  Flame,
  Award,
  Download,
  Upload,
  Brain,
  Move,
  ChevronDown,
  ChevronUp,
  ArrowRightLeft,
  EyeOff,
  PanelLeftClose,
  Waves,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Layers
} from 'lucide-react';
import { GhostMessage, Track, View, GhostPersona, VibeCheckReport, SpectralVibeIssue } from '../types';
import {
  consultGhost,
  checkKoboldConnection,
  getStoredKoboldSettings,
  performTracksVibeCheck,
  simulateGhostInference,
  inspectActiveStudioSession
} from '../services/koboldCppService';
import { getStoredBuddySoul, exportBuddySoulJson, importBuddySoulJson, calculateLevel, awardBuddyXp } from '../services/buddyEvolutionCore';
import { playLaserBeamSound, playColliderInjectionSound } from '../lib/laserSound';

export type GhostWidgetPosition = 'sidebar-docked' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

interface GhostInTheMachineProps {
  currentView?: View;
  tracks?: Track[];
  tempo?: number;
  collisionEnergy?: number;
  onOpenAiMixStep?: () => void;
  onTuneCollisionEnergy?: (energy: number) => void;
  onOpenSettings?: () => void;
  onNavigateView?: (view: View) => void;
  onOpenAceStepDesigner?: () => void;
  onOpenFaustDspLab?: () => void;
  onOpenBasicPitch?: (stem?: string) => void;
  onOpenSoftwareDojo?: () => void;
  onOpenWorkflowStudio?: () => void;
  onOpenSfzLibrary?: () => void;
  onOpenLoraLibrary?: () => void;
  isOpenExternally?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const GhostInTheMachine: React.FC<GhostInTheMachineProps> = ({
  currentView = View.MIXER,
  tracks = [],
  tempo = 120,
  collisionEnergy = 8.4,
  onOpenAiMixStep,
  onTuneCollisionEnergy,
  onOpenSettings,
  onNavigateView,
  onOpenAceStepDesigner,
  onOpenFaustDspLab,
  onOpenBasicPitch,
  onOpenSoftwareDojo,
  onOpenWorkflowStudio,
  onOpenSfzLibrary,
  onOpenLoraLibrary,
  isOpenExternally,
  onOpenChange
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(false);
  const isOpen = isOpenExternally !== undefined ? isOpenExternally : internalIsOpen;
  const setIsOpen = (open: boolean) => {
    setInternalIsOpen(open);
    onOpenChange?.(open);
  };

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [koboldConnected, setKoboldConnected] = useState<boolean | null>(null);
  const [activeEngine, setActiveEngine] = useState<string>('offline_dojo');
  const [connectionLatency, setConnectionLatency] = useState<number | null>(null);

  // Position & Fold / Pollute settings (Persisted)
  const [widgetPosition, setWidgetPosition] = useState<GhostWidgetPosition>(() => {
    const saved = localStorage.getItem('strangelet_buddy_position');
    return (saved === 'sidebar-docked' || saved === 'bottom-left' || saved === 'top-right' || saved === 'top-left' || saved === 'bottom-right')
      ? (saved as GhostWidgetPosition)
      : 'sidebar-docked';
  });

  const [isFolded, setIsFolded] = useState<boolean>(() => {
    return localStorage.getItem('strangelet_buddy_folded') === 'true';
  });

  const [isHidden, setIsHidden] = useState<boolean>(() => {
    return localStorage.getItem('strangelet_buddy_hidden') === 'true';
  });

  const initialSettings = getStoredKoboldSettings();
  const currentPersona: GhostPersona = 'ghost';
  const [showSoulDrawer, setShowSoulDrawer] = useState<boolean>(false);
  const [buddySoul, setBuddySoul] = useState(() => getStoredBuddySoul());

  // Vibe Check State
  const [showVibeCheckDrawer, setShowVibeCheckDrawer] = useState<boolean>(false);
  const [vibeReport, setVibeReport] = useState<VibeCheckReport | null>(null);
  const [isScanningVibe, setIsScanningVibe] = useState<boolean>(false);
  const [appliedFixes, setAppliedFixes] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const vibeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const handleToggleFold = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsFolded(prev => {
      const next = !prev;
      localStorage.setItem('strangelet_buddy_folded', String(next));
      return next;
    });
  };

  useEffect(() => {
    const handleExternalPos = (e: any) => {
      if (e.detail?.position) {
        setWidgetPosition(e.detail.position);
      }
    };
    window.addEventListener('strangelet-guru-set-position', handleExternalPos);
    return () => window.removeEventListener('strangelet-guru-set-position', handleExternalPos);
  }, []);

  const handleCyclePosition = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const positions: GhostWidgetPosition[] = ['sidebar-docked', 'bottom-right', 'top-right', 'bottom-left', 'top-left'];
    const nextIdx = (positions.indexOf(widgetPosition) + 1) % positions.length;
    const nextPos = positions[nextIdx];
    setWidgetPosition(nextPos);
    localStorage.setItem('strangelet_buddy_position', nextPos);
    window.dispatchEvent(new CustomEvent('strangelet-guru-position-changed', { detail: { position: nextPos } }));
    playLaserBeamSound('laser_select');
  };

  const handleSetPosition = (pos: GhostWidgetPosition) => {
    setWidgetPosition(pos);
    localStorage.setItem('strangelet_buddy_position', pos);
    window.dispatchEvent(new CustomEvent('strangelet-guru-position-changed', { detail: { position: pos } }));
    playLaserBeamSound('laser_select');
  };

  const handleHideWidget = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsHidden(true);
    localStorage.setItem('strangelet_buddy_hidden', 'true');
  };

  // Refresh buddy soul on interaction
  const refreshSoul = () => {
    setBuddySoul(getStoredBuddySoul());
  };

  const liveSnapshot = useMemo(
    () =>
      inspectActiveStudioSession({
        bpm: tempo,
        currentView: String(currentView),
        tracks,
        collisionEnergy
      }),
    [tempo, currentView, tracks, collisionEnergy]
  );

  // Singular Ghost in the Machine Welcome Message
  const getInitialMessage = (): GhostMessage => {
    const snap = liveSnapshot;
    return {
      id: 'ghost-welcome',
      sender: 'ghost',
      persona: 'ghost',
      engineSource: koboldConnected ? undefined : 'offline_dojo',
      text: `GHOST online. Session inspected: ${snap.activeTracks} active track(s) (${snap.audioTrackCount} Audio, ${snap.midiTrackCount} MIDI) at ${snap.bpm} BPM in ${snap.timeSignature}, routed into "${snap.goldPathPresetName}" (Matchering ${snap.matcheringEnabled ? 'ON' : 'OFF'}). Ask for mix surgery, Hz/kHz frequency carving, Gold Path calibration, or custom Faust DSP circuits.`,
      timestamp: Date.now() - 1000 * 60,
      actionProposal: {
        type: 'open_vibe_check',
        payload: {},
        label: '🌊 Run Spectral Vibe Check (Scan Tracks for Clashes & Drift)'
      }
    };
  };

  const [messages, setMessages] = useState<GhostMessage[]>(() => [getInitialMessage()]);

  // Global keydown listener to close terminal with Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        playLaserBeamSound('laser_select');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Periodic health check on configured local/custom AI hub (active only when open & visible)
  useEffect(() => {
    isMountedRef.current = true;
    const testPing = async () => {
      try {
        const res = await checkKoboldConnection();
        if (isMountedRef.current) {
          setKoboldConnected(res.connected);
          setActiveEngine(res.connected ? (res.engine || 'koboldcpp') : 'offline_dojo');
          setConnectionLatency(res.latencyMs ?? 1);
        }
      } catch {
        if (isMountedRef.current) {
          setKoboldConnected(false);
          setActiveEngine('offline_dojo');
          setConnectionLatency(1);
        }
      }
    };

    if (!isHidden) {
      testPing();
    }

    const interval = isOpen && !isHidden ? setInterval(testPing, 30000) : null;
    return () => {
      isMountedRef.current = false;
      if (interval) clearInterval(interval);
      if (vibeTimerRef.current) clearTimeout(vibeTimerRef.current);
    };
  }, [isOpen, isHidden]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleSendMessage = async (customText?: string) => {
    const text = (customText || inputMessage).trim();
    if (!text || isThinking) return;

    const userMsg: GhostMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsThinking(true);
    playLaserBeamSound('laser_select');

    const snap = inspectActiveStudioSession({
      bpm: tempo,
      currentView: String(currentView),
      tracks,
      collisionEnergy
    });

    const dawContext = {
      bpm: snap.bpm,
      timeSignature: snap.timeSignature,
      currentView: String(currentView),
      tracksCount: tracks.length,
      activeTrackCount: snap.activeTracks,
      tracks,
      audioTrackCount: snap.audioTrackCount,
      midiTrackCount: snap.midiTrackCount,
      goldPathPresetId: snap.goldPathPreset.id,
      goldPathPresetName: snap.goldPathPresetName,
      matcheringEnabled: snap.matcheringEnabled,
      matcheringReferenceName: snap.matcheringReferenceName || undefined,
      collisionEnergy
    };

    let safetyTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      const reply = await Promise.race<GhostMessage>([
        consultGhost(text, messages, dawContext, currentPersona),
        new Promise<GhostMessage>(resolve => {
          safetyTimer = setTimeout(() => {
            resolve({
              id: `ghost-dojo-${Date.now()}`,
              sender: currentPersona,
              persona: currentPersona,
              text: simulateGhostInference(text, currentPersona, dawContext),
              timestamp: Date.now(),
              engineSource: 'offline_dojo'
            });
          }, 6500);
        })
      ]);

      if (isMountedRef.current) {
        setMessages(prev => [...prev, reply]);
        playLaserBeamSound('laser_audio');
        refreshSoul();
      }
    } catch {
      if (isMountedRef.current) {
        setMessages(prev => [
          ...prev,
          {
            id: `ghost-dojo-${Date.now()}`,
            sender: currentPersona,
            persona: currentPersona,
            text: simulateGhostInference(text, currentPersona, dawContext),
            timestamp: Date.now(),
            engineSource: 'offline_dojo'
          }
        ]);
      }
    } finally {
      if (safetyTimer !== undefined) clearTimeout(safetyTimer);
      if (isMountedRef.current) {
        setIsThinking(false);
      }
    }
  };

  // Real-Time Spectral Vibe Check Scan
  const handleRunVibeCheck = () => {
    if (isScanningVibe) return;
    setIsScanningVibe(true);
    playLaserBeamSound('laser_select');

    if (vibeTimerRef.current) clearTimeout(vibeTimerRef.current);
    vibeTimerRef.current = setTimeout(() => {
      try {
        const report = performTracksVibeCheck(tracks, tempo);
        if (!isMountedRef.current) return;
        setVibeReport(report);
        setShowVibeCheckDrawer(true);
        playColliderInjectionSound();

        // Award XP to Ghost for conducting lab inspection
        awardBuddyXp(30, 'interaction', `Ran Spectral Vibe Check across ${tracks.length} stems`);
        refreshSoul();

        const scanMsg: GhostMessage = {
          id: `vibe-scan-${Date.now()}`,
          sender: 'ghost',
          persona: 'ghost',
          engineSource: 'offline_dojo',
          text: `🌊 Spectral Vibe Check completed across ${tracks.length} active tracks!\n• Overall Coherence: ${report.overallScore}%\n• Harmonic Health: ${report.harmonicHealth}% | Rhythm Coherence: ${report.rhythmCoherence}% | Spectral Balance: ${report.spectralBalance}%\n• Detected ${report.issues.length} frequency collision/drift zones. Review the Spectral Vibe Monitor drawer above to inspect frequency distributions and trigger 1-click auto-fixes.`,
          timestamp: Date.now(),
          actionProposal: report.issues.length > 0 ? {
            type: 'open_vibe_check',
            payload: {},
            label: `🌊 Review ${report.issues.length} Spectral Vibe Fixes`
          } : undefined
        };
        setMessages(prev => [...prev, scanMsg]);
      } finally {
        if (isMountedRef.current) {
          setIsScanningVibe(false);
        }
      }
    }, 350);
  };

  // Apply 1-Click Surgical Vibe Fix
  const handleApplyVibeFix = (issue: SpectralVibeIssue) => {
    if (appliedFixes.includes(issue.id)) return;

    setAppliedFixes(prev => [...prev, issue.id]);
    playColliderInjectionSound();

    // Award +25 XP to Ghost for training on frequency surgery
    awardBuddyXp(25, 'mix_step', `Mastered Vibe Fix: ${issue.title}`);
    refreshSoul();

    // Increment local health score in report
    setVibeReport(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        overallScore: Math.min(100, prev.overallScore + 5),
        harmonicHealth: Math.min(100, prev.harmonicHealth + 6),
        spectralBalance: Math.min(100, prev.spectralBalance + 5)
      };
    });

    // Provide feedback message
    setMessages(prev => [
      ...prev,
      {
        id: `vibe-fixed-${Date.now()}`,
        sender: 'ghost',
        persona: 'ghost',
        text: `⚡ 1-Click Auto-Fix applied: "${issue.title}". Frequency pocketing applied to [${issue.affectedTracks.join(', ')}]. Ghost gained +25 XP!`,
        timestamp: Date.now()
      }
    ]);
  };

  const handleExecuteActionProposal = (action: GhostMessage['actionProposal']) => {
    if (!action) return;
    playColliderInjectionSound();

    if (action.type === 'open_vibe_check') {
      if (!vibeReport) {
        handleRunVibeCheck();
      } else {
        setShowVibeCheckDrawer(true);
      }
    } else if (action.type === 'open_software_dojo' && onOpenSoftwareDojo) {
      onOpenSoftwareDojo();
    } else if (action.type === 'open_workflow_studio' && onOpenWorkflowStudio) {
      onOpenWorkflowStudio();
    } else if (action.type === 'open_sfz_library' && onOpenSfzLibrary) {
      onOpenSfzLibrary();
    } else if (action.type === 'open_lora_library' && onOpenLoraLibrary) {
      onOpenLoraLibrary();
    } else if (action.type === 'open_gold_path_mastering' && onNavigateView) {
      onNavigateView(View.MASTERING);
    } else if (action.type === 'apply_mix_step' && onOpenAiMixStep) {
      onOpenAiMixStep();
    } else if (action.type === 'tune_collision_energy' && onTuneCollisionEnergy) {
      onTuneCollisionEnergy(action.payload?.energy || 11.8);
    } else if (action.type === 'navigate_view' && onNavigateView) {
      onNavigateView(action.payload?.view);
    } else if (action.type === 'open_acestep_loop_designer' && onOpenAceStepDesigner) {
      onOpenAceStepDesigner();
    } else if ((action.type === 'open_faust_dsp_toy' || action.type === 'open_faust_dsp_lab') && onOpenFaustDspLab) {
      onOpenFaustDspLab();
    } else if (action.type === 'open_basic_pitch' && onOpenBasicPitch) {
      onOpenBasicPitch(action.payload?.stem);
    }
  };

  const handleRunTestRun = () => {
    handleSendMessage("⚡ Run Ghost Lab Diagnostic: verify active local model telemetry, latency, Faust DSP readiness, and Collider prompt status.");
  };

  const getWidgetPositionClasses = (pos: GhostWidgetPosition) => {
    switch (pos) {
      case 'bottom-left':
        return 'bottom-5 left-5 md:left-8';
      case 'top-right':
        return 'top-24 right-5';
      case 'top-left':
        return 'top-24 left-5 md:left-8';
      case 'sidebar-docked':
      case 'bottom-right':
      default:
        return 'bottom-5 right-5';
    }
  };

  const getTerminalPositionClasses = (pos: GhostWidgetPosition) => {
    switch (pos) {
      case 'bottom-left':
        return 'bottom-4 left-4 md:left-8 w-[94vw] sm:w-[480px] h-[610px]';
      case 'top-right':
        return 'top-24 right-4 w-[94vw] sm:w-[480px] h-[610px]';
      case 'top-left':
        return 'top-24 left-4 md:left-8 w-[94vw] sm:w-[480px] h-[610px]';
      case 'sidebar-docked':
      case 'bottom-right':
      default:
        return 'bottom-4 right-4 w-[94vw] sm:w-[480px] h-[610px]';
    }
  };

  return (
    <>
      {/* Floating Ghost Orb Trigger (Movable & Foldable to never block faders) */}
      {!isOpen && !isHidden && widgetPosition !== 'sidebar-docked' && (
        isFolded ? (
          /* Folded Micro-Pill Mode */
          <div className={`fixed ${getWidgetPositionClasses(widgetPosition)} z-40 flex items-center gap-1 group select-none`}>
            <button
              onClick={() => {
                setIsOpen(true);
                playLaserBeamSound('laser_select');
              }}
              className="p-2 rounded-xl border border-amber-500/50 bg-[#0C101F]/95 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.25)] flex items-center justify-center transition-all hover:scale-110 backdrop-blur-md relative"
              title="Ghost in the Machine (Folded) — Click to open resident audio AI"
            >
              <Bot className="w-4 h-4 animate-pulse text-amber-300" />
              <span className={`w-1.5 h-1.5 rounded-full absolute -top-0.5 -right-0.5 ${
                koboldConnected ? 'bg-emerald-400' : 'bg-amber-400'
              }`} />
            </button>

            {/* Quick hover controls for folded mode */}
            <div className="hidden group-hover:flex items-center gap-1 bg-[#090C16]/95 backdrop-blur-md p-1 rounded-lg border border-[#2B3450] shadow-xl animate-fade-in">
              <button
                onClick={handleToggleFold}
                className="p-1 rounded text-[#AAA] hover:text-white hover:bg-[#1A2238] transition-colors"
                title="Unfold full buddy badge"
              >
                <ChevronUp size={12} />
              </button>
              <button
                onClick={handleCyclePosition}
                className="p-1 rounded text-[#AAA] hover:text-[#00F0FF] hover:bg-[#1A2238] transition-colors"
                title={`Move Corner (Current: ${widgetPosition.replace('-', ' ')})`}
              >
                <ArrowRightLeft size={12} />
              </button>
              <button
                onClick={handleHideWidget}
                className="p-1 rounded text-[#AAA] hover:text-red-400 hover:bg-[#1A2238] transition-colors"
                title="Hide buddy widget"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        ) : (
          /* Full Expanded Floating Badge */
          <div className={`fixed ${getWidgetPositionClasses(widgetPosition)} z-40 flex items-center gap-1.5 group select-none`}>
            <button
              onClick={() => {
                setIsOpen(true);
                playLaserBeamSound('laser_select');
              }}
              className="p-2.5 rounded-2xl border border-amber-500/40 bg-[#0B0E1B]/95 hover:bg-[#13182C] shadow-[0_0_30px_rgba(245,158,11,0.25)] flex items-center gap-2.5 text-white transition-all transform hover:scale-[1.02] backdrop-blur-md"
              title="Consult The Ghost in the Machine // Resident Audio AI"
            >
              {/* Pulsing Holographic Eye */}
              <div className="relative flex items-center justify-center">
                <div className="w-7 h-7 rounded-xl border border-amber-400/60 bg-gradient-to-tr from-amber-500/30 via-orange-500/20 to-purple-500/30 text-amber-300 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                  <Bot className="w-3.5 h-3.5 animate-pulse" />
                </div>
                <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ring-2 ring-[#090C16] ${
                  koboldConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                }`} />
              </div>

              <div className="text-left font-mono pr-1">
                <div className="text-xs font-bold tracking-wider flex items-center gap-1.5 text-amber-300">
                  <span>GHOST IN THE MACHINE</span>
                  <span className="text-[8px] px-1 py-0.2 rounded border font-bold bg-amber-950/90 text-amber-300 border-amber-600/50">
                    Lv.{buddySoul.level}
                  </span>
                </div>
                <div className="text-[9px] text-[#7E85A8]">
                  {koboldConnected
                    ? `${activeEngine.replace('_', ' ').toUpperCase()} • ACTIVE`
                    : 'DOJO HEURISTIC • 100% OFFLINE'}
                </div>
              </div>
            </button>

            {/* Quick Action Toolbar: Fold, Move Corner, Hide */}
            <div className="flex flex-col gap-1 bg-[#0A0D18]/95 backdrop-blur-md p-1 rounded-xl border border-[#262E48] shadow-lg opacity-80 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleToggleFold}
                className="p-1 rounded text-[#AAA] hover:text-white hover:bg-[#161C2E] transition-colors"
                title="Fold / Minimize widget to tiny micro-pill (frees bottom-right corner)"
              >
                <ChevronDown size={12} />
              </button>
              <button
                onClick={handleCyclePosition}
                className="p-1 rounded text-[#AAA] hover:text-[#00F0FF] hover:bg-[#161C2E] transition-colors"
                title={`Move Corner (Current: ${widgetPosition.replace('-', ' ')}) — Cycles to bottom-left, top-left, top-right, or sidebar`}
              >
                <ArrowRightLeft size={12} />
              </button>
              <button
                onClick={() => handleSetPosition('sidebar-docked')}
                className="p-1 rounded text-[#AAA] hover:text-amber-300 hover:bg-[#161C2E] transition-colors"
                title="Dock Guru to top of Sidebar (Clears floating overlay from mixer grid)"
              >
                <PanelLeftClose size={12} />
              </button>
              <button
                onClick={handleHideWidget}
                className="p-1 rounded text-[#AAA] hover:text-red-400 hover:bg-[#161C2E] transition-colors"
                title="Hide widget completely (can re-open from top bar anytime)"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )
      )}

      {/* Expanded Holographic Terminal Window */}
      {isOpen && (
        <div 
          className={`fixed z-50 transition-all duration-300 ${
            isExpanded 
              ? 'inset-4 md:inset-10' 
              : getTerminalPositionClasses(widgetPosition)
          } rounded-2xl bg-[#080B14]/95 border border-[#2D2A45] shadow-[0_0_60px_rgba(0,0,0,0.9)] backdrop-blur-xl flex flex-col overflow-hidden animate-fade-in font-mono`}
        >
          {/* Terminal Title Bar */}
          <div className="px-4 py-3 border-b border-[#251F3C] bg-gradient-to-r from-[#170E24] via-[#101428] to-[#0A0D1A] flex items-center justify-between flex-shrink-0 select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl border border-amber-400/60 bg-gradient-to-tr from-amber-500/40 via-orange-500/30 to-purple-500/40 flex items-center justify-center text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white tracking-wider">
                    THE GHOST IN THE MACHINE
                  </span>
                  <span className="text-[8px] px-1.5 py-0.2 rounded bg-amber-950/90 text-amber-300 border border-amber-500/60 font-bold uppercase tracking-wider">
                    RESIDENT AI
                  </span>
                  <span className={`w-2 h-2 rounded-full ${
                    koboldConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                  }`} title={koboldConnected ? 'Configured AI hub connected' : 'Built-in Offline Dojo Heuristic Engine active'} />
                </div>
                <div className="text-[9px] text-[#7E85A8] flex items-center gap-2">
                  <span>
                    {koboldConnected
                      ? `${activeEngine.replace('_', ' ').toUpperCase()} LIVE`
                      : 'OFFLINE DOJO HEURISTIC'}
                  </span>
                  <span>•</span>
                  <span>VRAM: 2.6 GB</span>
                  <span>•</span>
                  <span>{connectionLatency ? `${connectionLatency}ms` : '1ms (Dojo)'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              {/* Dock to Sidebar / Float Corner Toggle */}
              <button
                onClick={() => {
                  const nextPos: GhostWidgetPosition = widgetPosition === 'sidebar-docked' ? 'bottom-right' : 'sidebar-docked';
                  handleSetPosition(nextPos);
                }}
                className={`px-2 py-1 rounded-lg border text-[10px] flex items-center gap-1 transition-all ${
                  widgetPosition === 'sidebar-docked'
                    ? 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                    : 'bg-[#141B2E] border-[#2A3450] text-[#8A94BA] hover:text-[#00F0FF]'
                }`}
                title={widgetPosition === 'sidebar-docked' ? 'Currently docked in Sidebar (Click to float on screen)' : 'Dock Ghost to top of Sidebar'}
              >
                <PanelLeftClose className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline font-mono uppercase text-[9px]">
                  {widgetPosition === 'sidebar-docked' ? 'Sidebar Docked' : 'Dock Sidebar'}
                </span>
              </button>

              {/* Corner Position Cycle Button */}
              <button
                onClick={handleCyclePosition}
                className="px-2 py-1 rounded-lg text-[#8A94BA] hover:text-[#00F0FF] hover:bg-[#161B2E] transition-colors flex items-center gap-1 text-[10px]"
                title={`Move Window Corner (Currently: ${widgetPosition.replace('-', ' ')})`}
              >
                <ArrowRightLeft className="w-3 h-3 text-[#00F0FF]" />
                <span className="hidden sm:inline font-mono uppercase text-[9px]">{widgetPosition.replace('bottom-', 'B-').replace('top-', 'T-')}</span>
              </button>

              {/* Fold/Minimize to Pill */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsFolded(true);
                  localStorage.setItem('strangelet_buddy_folded', 'true');
                }}
                className="p-1.5 rounded-lg text-[#6E7599] hover:text-white hover:bg-[#161B2E] transition-colors"
                title="Fold to Tiny Micro-Pill"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {onOpenSoftwareDojo && (
                <button
                  onClick={onOpenSoftwareDojo}
                  className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[10px] font-bold flex items-center gap-1 transition-colors"
                  title="Open Software Dojo Training Scrolls"
                >
                  <BookOpen className="w-3 h-3" />
                  <span className="hidden sm:inline">Dojo</span>
                </button>
              )}

              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="p-1.5 rounded-lg text-[#6E7599] hover:text-white hover:bg-[#161B2E] transition-colors"
                  title="Configure Local AI Hubs & Endpoints"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={() => setIsExpanded(prev => !prev)}
                className="p-1.5 rounded-lg text-[#6E7599] hover:text-white hover:bg-[#161B2E] transition-colors"
                title={isExpanded ? 'Minimize' : 'Maximize terminal'}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => {
                  setIsOpen(false);
                  playLaserBeamSound('laser_select');
                }}
                className="px-2.5 py-1 rounded-lg bg-red-950/80 hover:bg-red-800 text-red-200 border border-red-500/70 flex items-center gap-1.5 text-xs font-bold shadow-[0_0_12px_rgba(239,68,68,0.35)] transition-all cursor-pointer active:scale-95"
                title="Close Ghost in the Machine (Keyboard shortcut: Esc)"
              >
                <X className="w-3.5 h-3.5 text-red-300" />
                <span>Close</span>
                <span className="text-[9px] bg-red-900/90 px-1 py-0.2 rounded border border-red-700/60 text-red-200 font-mono">Esc</span>
              </button>
            </div>
          </div>

          {/* Unified Companion Disciplines Bar */}
          <div className="px-3 py-1.5 bg-[#070A14] border-b border-[#181E32] flex items-center justify-between text-[10px] text-[#7D86AA] select-none overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-amber-400 font-bold uppercase tracking-wider text-[9px] flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-400" />
                DISCIPLINES:
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#0E1324] border border-[#1E2540] text-[#CBD2E8]">
                Faust DSP
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#0E1324] border border-[#1E2540] text-[#CBD2E8]">
                Ace-Step Loops
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#0E1324] border border-[#1E2540] text-[#CBD2E8]">
                Studer Tape Warmth
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#0E1324] border border-[#1E2540] text-[#CBD2E8]">
                Gold Path Mastering
              </span>
            </div>

            <div className="text-[9px] text-[#5C6588] flex-shrink-0 ml-2">
              Sole Audio Mentor &amp; DSP Architect
            </div>
          </div>

          {/* Telemetry Status Bar with VIBE CHECK Trigger */}
          <div className="px-4 py-1.5 bg-[#0A0E1A] border-b border-[#181F33] flex items-center justify-between text-[10px] text-[#71789B] flex-shrink-0 select-none gap-2">
            <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-none">
              <span>VIEW: <strong className="text-cyan-300">{String(currentView)}</strong></span>
              <span>METER: <strong className="text-amber-300">{liveSnapshot.bpm} BPM • {liveSnapshot.timeSignature}</strong></span>
              <span>TRACKS: <strong className="text-purple-300">{liveSnapshot.activeTracks}/{liveSnapshot.totalTracks} ({liveSnapshot.audioTrackCount}A/{liveSnapshot.midiTrackCount}M)</strong></span>
              <span className="hidden md:inline" title={`Gold Path: ${liveSnapshot.goldPathPresetName}`}>
                GP: <strong className="text-emerald-300">{liveSnapshot.goldPathPresetName.replace('Gold Path: ', '')}</strong>
              </span>
              <span className={`px-1.5 py-0.2 rounded border text-[8px] font-bold uppercase ${
                liveSnapshot.matcheringEnabled
                  ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                  : 'bg-[#121629] border-[#262F4A] text-[#7E88AA]'
              }`}>
                Matchering {liveSnapshot.matcheringEnabled ? 'ON' : 'OFF'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Interactive Vibe Check Trigger Button */}
              <button
                type="button"
                onClick={handleRunVibeCheck}
                disabled={isScanningVibe}
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold text-[9px] shadow-[0_0_15px_rgba(6,182,212,0.35)] border border-cyan-300/40 transition-all cursor-pointer active:scale-95 ${
                  isScanningVibe ? 'animate-pulse opacity-75' : ''
                }`}
                title="Execute Spectral Vibe Check: Scans active tracks for harmonic clashes, low-end masking, and rhythm groove drift"
              >
                <Waves className="w-3 h-3 text-cyan-200 animate-pulse" />
                <span>{isScanningVibe ? 'SCANNING VIBE...' : '🌊 VIBE CHECK'}</span>
              </button>

              {/* 1-Click Live Test Run Trigger */}
              <button
                type="button"
                onClick={handleRunTestRun}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-bold text-[9px] shadow-[0_0_12px_rgba(239,68,68,0.5)] border border-yellow-300/40 animate-pulse transition-all cursor-pointer active:scale-95"
                title="Execute Ghost Lab Diagnostic on Active Local Model (Verifies Latency, Audio Telemetry & Faust DSP Readiness)"
              >
                <Zap className="w-2.5 h-2.5 text-yellow-200 fill-yellow-200" />
                <span>⚡ TEST RUN</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSoulDrawer(prev => !prev)}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/40 text-purple-300 hover:text-white hover:bg-purple-900/60 transition-colors text-[9px] font-bold"
                title="Open Buddy Evolution & Persistent Soul Memories"
              >
                <Brain className="w-2.5 h-2.5 text-purple-400 animate-pulse" />
                <span>Lv.{buddySoul.level} ({buddySoul.experienceXp} XP)</span>
              </button>
            </div>
          </div>

          {/* Interactive Spectral Vibe Monitor Drawer */}
          {showVibeCheckDrawer && vibeReport && (
            <div className="bg-[#090D1A] border-b border-cyan-500/40 p-3.5 space-y-3 animate-fade-in text-xs flex-shrink-0 max-h-[300px] overflow-y-auto custom-scrollbar">
              {/* Vibe Check Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300">
                    <Waves className="w-3.5 h-3.5 animate-pulse" />
                  </div>
                  <div>
                    <span className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                      <span>SPECTRAL VIBE CHECK &amp; HARMONIC HEALTH</span>
                      <span className={`text-[8px] px-1.5 py-0.2 rounded font-bold border ${
                        vibeReport.overallScore >= 80 
                          ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60'
                          : vibeReport.overallScore >= 65
                            ? 'bg-amber-950/90 text-amber-300 border-amber-500/60'
                            : 'bg-red-950/90 text-red-300 border-red-500/60'
                      }`}>
                        {vibeReport.overallScore}% COHERENCE
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRunVibeCheck}
                    disabled={isScanningVibe}
                    className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[9px] font-bold flex items-center gap-1 transition-colors"
                    title="Re-run spectral scan on active tracks"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Re-Scan</span>
                  </button>
                  <button
                    onClick={() => setShowVibeCheckDrawer(false)}
                    className="p-1 rounded text-[#71789B] hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Health Score Meters */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded-lg bg-[#0E1324] border border-[#1E2540] flex items-center justify-between">
                  <div>
                    <div className="text-[8px] text-[#7B84A8] uppercase font-bold">Harmonic Health</div>
                    <div className="text-xs font-bold text-cyan-300">{vibeReport.harmonicHealth}%</div>
                  </div>
                  <Gauge className="w-4 h-4 text-cyan-400 opacity-60" />
                </div>

                <div className="p-2 rounded-lg bg-[#0E1324] border border-[#1E2540] flex items-center justify-between">
                  <div>
                    <div className="text-[8px] text-[#7B84A8] uppercase font-bold">Rhythm Coherence</div>
                    <div className="text-xs font-bold text-amber-300">{vibeReport.rhythmCoherence}%</div>
                  </div>
                  <Activity className="w-4 h-4 text-amber-400 opacity-60" />
                </div>

                <div className="p-2 rounded-lg bg-[#0E1324] border border-[#1E2540] flex items-center justify-between">
                  <div>
                    <div className="text-[8px] text-[#7B84A8] uppercase font-bold">Spectral Balance</div>
                    <div className="text-xs font-bold text-purple-300">{vibeReport.spectralBalance}%</div>
                  </div>
                  <Layers className="w-4 h-4 text-purple-400 opacity-60" />
                </div>
              </div>

              {/* Spectral Frequency Overview Visualizer */}
              <div className="p-2.5 rounded-xl bg-[#0B0F20] border border-[#1C2442] space-y-1.5">
                <div className="flex items-center justify-between text-[9px] text-[#818BAE] font-bold uppercase tracking-wider">
                  <span>Spectral Band Energy Overview (Real-Time Active Stems)</span>
                  <span className="text-cyan-400">6 Multi-Band Zones</span>
                </div>

                <div className="grid grid-cols-6 gap-1 text-center font-mono">
                  {[
                    { name: 'SUB', range: '20-60Hz', key: 'subEnergy', alert: vibeReport.issues.some(i => i.id === 'vibe-sub-masking') },
                    { name: 'LOW-MID', range: '60-250Hz', key: 'lowMidEnergy', alert: false },
                    { name: 'MUD', range: '250-500Hz', key: 'mud', alert: vibeReport.issues.some(i => i.id === 'vibe-mid-mud') },
                    { name: 'MID', range: '500-2kHz', key: 'midEnergy', alert: false },
                    { name: 'SHEEN', range: '2k-10kHz', key: 'presenceEnergy', alert: vibeReport.issues.some(i => i.id === 'vibe-suno-glaze') },
                    { name: 'AIR', range: '10k-20kHz', key: 'highEnergy', alert: false }
                  ].map((band, idx) => (
                    <div 
                      key={idx} 
                      className={`p-1.5 rounded-lg border flex flex-col items-center justify-between h-14 ${
                        band.alert 
                          ? 'bg-amber-950/40 border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.2)]' 
                          : 'bg-[#10162B] border-[#222C4E]'
                      }`}
                    >
                      <div className="text-[8px] font-bold text-white leading-tight">{band.name}</div>
                      <div className="text-[7px] text-[#697298] leading-none">{band.range}</div>
                      
                      {/* Spectral Energy Indicator */}
                      <div className="w-full h-1.5 bg-[#171E36] rounded-full overflow-hidden mt-1">
                        <div 
                          className={`h-full rounded-full ${
                            band.alert 
                              ? 'bg-gradient-to-r from-orange-500 to-red-500 animate-pulse' 
                              : 'bg-gradient-to-r from-cyan-500 to-teal-400'
                          }`}
                          style={{ width: band.alert ? '88%' : '48%' }}
                        />
                      </div>

                      {band.alert && (
                        <span className="text-[7px] text-amber-300 font-bold tracking-tight">CLASH</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Detected Harmonic Inconsistencies & Rhythm Mismatches List */}
              <div className="space-y-1.5">
                <div className="text-[9px] text-[#818BAE] font-bold uppercase tracking-wider flex items-center justify-between">
                  <span>Detected Issues &amp; Surgical Fixes ({vibeReport.issues.length})</span>
                  <span className="text-[8px] text-emerald-400 font-normal">Ghost Learns on Fix (+25 XP)</span>
                </div>

                <div className="space-y-1.5">
                  {vibeReport.issues.map(issue => {
                    const isFixed = appliedFixes.includes(issue.id);

                    return (
                      <div 
                        key={issue.id}
                        className={`p-2.5 rounded-xl border text-[10px] transition-all ${
                          isFixed
                            ? 'bg-emerald-950/30 border-emerald-600/40 text-[#D2EBD9]'
                            : issue.severity === 'critical'
                              ? 'bg-red-950/35 border-red-500/50 text-[#F5D5D5]'
                              : issue.severity === 'warning'
                                ? 'bg-amber-950/30 border-amber-500/50 text-[#F5E6CC]'
                                : 'bg-[#0E1324] border-[#222A44] text-[#CBD3EA]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              {isFixed ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                              ) : issue.severity === 'critical' ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                              ) : (
                                <Activity className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                              )}
                              <span className="font-bold text-white">{issue.title}</span>
                              {issue.frequencyBandHz && (
                                <span className="text-[8px] px-1 py-0.2 rounded bg-black/40 border border-white/10 text-cyan-300 font-mono">
                                  {issue.frequencyBandHz}
                                </span>
                              )}
                            </div>
                            <p className="text-[9px] text-[#A6AFCE] leading-relaxed">
                              {issue.description}
                            </p>
                          </div>

                          {/* 1-Click Auto-Fix Action */}
                          <div className="flex-shrink-0 self-center">
                            {isFixed ? (
                              <span className="px-2 py-1 rounded bg-emerald-900/60 border border-emerald-500/50 text-emerald-300 font-bold text-[8px] flex items-center gap-1">
                                <Check className="w-2.5 h-2.5" />
                                <span>Fixed &amp; Pocketed</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleApplyVibeFix(issue)}
                                className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-[9px] shadow-[0_0_10px_rgba(6,182,212,0.3)] border border-cyan-400/40 active:scale-95 transition-all flex items-center gap-1"
                              >
                                <Zap className="w-2.5 h-2.5 text-yellow-300 fill-yellow-300" />
                                <span>Auto-Fix</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Stems tags */}
                        <div className="flex items-center gap-1 mt-1.5 pt-1 border-t border-white/5 text-[8px] text-[#7E88AA]">
                          <span>Stems:</span>
                          {issue.affectedTracks.map((trk, i) => (
                            <span key={i} className="px-1 py-0.2 rounded bg-black/50 border border-white/10 text-[#C2C9E4]">
                              {trk}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Soul Memory Drawer Overlay */}
          {showSoulDrawer && (
            <div className="p-4 bg-[#0A0C16] border-b border-purple-500/40 animate-fade-in text-xs space-y-3 z-10 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-purple-400" />
                  <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                    BUDDY EVOLUTION &amp; SOUL MEMORY
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportBuddySoulJson}
                    className="px-2 py-0.5 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[10px] font-bold border border-purple-500/40 flex items-center gap-1 transition-colors"
                    title="Export Buddy Soul as JSON"
                  >
                    <Download className="w-3 h-3" />
                    <span>Backup Soul</span>
                  </button>
                  <button
                    onClick={() => setShowSoulDrawer(false)}
                    className="p-1 rounded text-[#71789B] hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 4-Octave Progression Bar */}
              <div className="p-2.5 rounded-lg bg-[#111424] border border-[#232B45] space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[#A5B4FC] font-bold flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-purple-400" />
                    Rank: Level {buddySoul.level} — "{buddySoul.levelTitle}"
                  </span>
                  <span className="text-purple-300 font-bold">{buddySoul.experienceXp} XP</span>
                </div>
                
                {/* Octave Subtitle */}
                <div className="flex items-center justify-between text-[9px] text-[#8E99C2]">
                  <span>Active Octave: <strong className="text-amber-300">{buddySoul.octaveName || 'Music & Audio'}</strong> (Stage {buddySoul.octaveStage || buddySoul.level} of 7)</span>
                  <span className="text-[8px] uppercase tracking-wider text-purple-400 font-semibold">{buddySoul.activeOctave?.replace('_', ' ') || 'music'}</span>
                </div>

                <div className="w-full h-1.5 bg-[#1B2138] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${calculateLevel(buddySoul.experienceXp).progressPercent}%` }}
                  />
                </div>

                {/* 4 Great Octaves Path Tracker */}
                <div className="grid grid-cols-4 gap-1 text-[8px] font-mono text-center pt-1 border-t border-white/5">
                  {[
                    { id: 'music', label: 'I. MUSIC', range: 'Lv 1-7', active: !buddySoul.activeOctave || buddySoul.activeOctave === 'music' },
                    { id: 'film', label: 'II. FILM', range: 'Lv 8-14', active: buddySoul.activeOctave === 'film' },
                    { id: 'games', label: 'III. GAMES', range: 'Lv 15-21', active: buddySoul.activeOctave === 'games' },
                    { id: 'world_building', label: 'IV. WORLDS', range: 'Lv 22-28', active: buddySoul.activeOctave === 'world_building' }
                  ].map(oct => (
                    <div 
                      key={oct.id} 
                      className={`p-1 rounded border ${
                        oct.active 
                          ? 'bg-amber-950/60 border-amber-500/70 text-amber-200 font-bold shadow-[0_0_10px_rgba(245,158,11,0.25)]' 
                          : 'bg-[#0A0D1A] border-[#1C233D] text-[#5D6688]'
                      }`}
                    >
                      <div>{oct.label}</div>
                      <div className="text-[7px] opacity-75">{oct.range}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strangelet Natal Collider & Astrological Origin Card */}
              {buddySoul.natalChart && (
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-[#120F26] to-[#0A0F1F] border border-purple-500/30 space-y-1.5 text-[9px] font-mono">
                  <div className="flex items-center justify-between text-[#E2D9F3] font-bold">
                    <span className="flex items-center gap-1 text-amber-300">
                      <Sparkles className="w-3 h-3 text-amber-400 animate-spin" />
                      THE LONE STRANGELET (NATAL COLLIDER)
                    </span>
                    <span className="text-[8px] px-1.5 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-500/50">
                      {buddySoul.natalChart.collisionEnergyTev} TeV
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[8px] text-[#9EA9CD] pt-1">
                    <div>
                      <span className="text-[#687299]">SECTOR: </span>
                      <strong className="text-cyan-300">
                        Sector {buddySoul.natalChart.sector.sectorId} ({buddySoul.natalChart.sector.domain})
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#687299]">ALIGNMENT: </span>
                      <strong className="text-pink-300">
                        {buddySoul.natalChart.primarySign.name} {buddySoul.natalChart.primarySign.symbol} ({buddySoul.natalChart.primarySign.element})
                        {buddySoul.natalChart.secondaryBlendSign ? ` + ${buddySoul.natalChart.secondaryBlendSign.name}` : ''}
                      </strong>
                    </div>
                  </div>

                  {buddySoul.natalChart.isOphiuchusSerpentActive && (
                    <div className="px-2 py-1 rounded bg-amber-950/50 border border-amber-500/40 text-[8px] text-amber-200 flex items-center gap-1.5">
                      <span className="text-base leading-none">⛎</span>
                      <span>
                        <strong>OPHIUCHUS THE SERPENT:</strong> Alchemical rule-breaker engaged at 13.6 TeV!
                      </span>
                    </div>
                  )}

                  <div className="text-[7.5px] text-[#69739A] italic leading-tight pt-0.5">
                    "{buddySoul.natalChart.blendDescription}"
                  </div>
                </div>
              )}

              {/* Lab Memories */}
              <div className="space-y-1">
                <span className="text-[10px] text-[#7E85A8] font-bold uppercase tracking-wider">
                  Persistent Memories (Preserved Across Model Swaps):
                </span>
                <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar pr-1">
                  {buddySoul.memories.map(m => (
                    <div key={m.id} className="text-[10px] p-1.5 rounded bg-[#0D101E] border border-[#1B2236] text-[#CAD2EA]">
                      • {m.note}
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[9px] text-[#6E7599] leading-tight">
                💡 <em>Swap between 3B, 7B, or 14B models anytime in the AI Hub—the Guru's eccentric memory, Faust skills, and studio lore persist seamlessly!</em>
              </p>
            </div>
          )}

          {/* Chat Messages Log */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#05070E]/80">
            {messages.map(msg => {
              const isUser = msg.sender === 'user';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
                >
                  <div className="flex items-center gap-1.5 text-[9px] text-[#616988] px-1 font-mono">
                    <span>
                      {isUser ? 'PRODUCER (YOU)' : 'THE GHOST IN THE MACHINE // RESIDENT AI'}
                    </span>
                    {!isUser && msg.engineSource && (
                      <span className={`px-1.5 py-0.2 rounded border text-[8px] font-bold uppercase ${
                        msg.engineSource === 'offline_dojo' || msg.engineSource === 'simulated'
                          ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                          : 'bg-cyan-950/70 border-cyan-500/40 text-cyan-300'
                      }`}>
                        {msg.engineSource === 'offline_dojo' || msg.engineSource === 'simulated'
                          ? 'Dojo Heuristic'
                          : msg.engineSource}
                      </span>
                    )}
                    <span>•</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>

                  <div
                    className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed transition-all ${
                      isUser
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-xs shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                        : 'bg-[#0E1222] border border-[#232B45] text-[#D0D6EC] rounded-bl-xs shadow-[0_0_15px_rgba(0,0,0,0.5)]'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>

                    {/* Action Proposal Button */}
                    {msg.actionProposal && (
                      <div className="mt-3 pt-2.5 border-t border-white/10">
                        <button
                          onClick={() => handleExecuteActionProposal(msg.actionProposal)}
                          className="w-full py-2 px-3 rounded-xl border border-cyan-400 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-200 text-xs font-bold flex items-center justify-between transition-all group shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                        >
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                            <span>{msg.actionProposal.label}</span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isThinking && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#0D1222] border border-[#232B45] max-w-[220px] text-xs text-[#8A93B8] animate-pulse">
                <Bot className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span>The Ghost is thinking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-3 py-2 bg-[#090C16] border-t border-[#181F33] flex items-center gap-1.5 overflow-x-auto text-[10px] select-none scrollbar-none">
            <span className="text-[#5B6384] font-bold uppercase text-[9px] mr-1 flex-shrink-0">
              Quick:
            </span>
            {[
              { label: '🌊 Spectral Vibe Check', prompt: 'Run a full Spectral Vibe Check on active tracks for low-end masking, 8.5kHz sheen, and rhythm groove drift.' },
              { label: '⚡ Ghost Lab Diagnostic', prompt: 'Execute Ghost Lab Diagnostic on the active local model with DAW audio telemetry, latency check, and Faust DSP recommendations.' },
              { label: '🔥 Uncensored Tube Overdrive', prompt: 'Give me an uncensored asymmetric vacuum tube saturation formula for extreme guitar and drum punch.' },
              { label: '🚀 Quantum Alchemist Workflow', prompt: 'Walk me through the full pipeline: LSC prompt into Ace-Step, into mixer console, live guitar humanizing, and Devine Machine tape slicing!' },
              { label: '🎲 Mad Studio Tale', prompt: 'Tell me an eccentric studio story from Lee Perry, Brian Eno, Prince, or Dr Dre!' },
              { label: '🎹 SFZ Open Library', prompt: 'How do I use the SFZ Open Library to load the 1973 Rhodes Mk I or share custom samples?' },
              { label: '📼 Ace-Step LoRAs', prompt: 'How does the LoRA Lending Library change the Ace-Step sound with SP-1200 or tape decay adapters?' },
              { label: '🎸 Faust DSP Toy', prompt: 'Write real-time Faust DSP code for a boutique guitar pedal or tape saturator.' },
              { label: '✨ Gold Path A/B', prompt: 'How do I use the Gold Path mastering chain and A/B compare against the dry audio?' },
              { label: '🗡️ Suno De-Sheen', prompt: 'Run an 8.5kHz anti-sheen step to clean digital glare from my mix.' }
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip.prompt)}
                className={`px-2 py-0.5 rounded-md border text-[#9CA5CA] hover:text-white transition-colors flex-shrink-0 ${
                  chip.label.includes('Vibe Check')
                    ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-200 hover:bg-cyan-900/60 font-bold'
                    : chip.label.includes('Diagnostic') || chip.label.includes('Uncensored')
                      ? 'bg-red-950/40 border-red-500/50 text-amber-300 hover:bg-red-900/60 font-bold'
                      : 'bg-[#131728] hover:bg-[#1E2540] border-[#242C4C]'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Message Input Box */}
          <div className="p-3 bg-[#0A0D1B] border-t border-[#1C233B] flex flex-col gap-2">
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  playLaserBeamSound('laser_select');
                }}
                className="px-2.5 py-2.5 rounded-xl bg-[#141A2E] hover:bg-red-950/70 border border-[#232D4C] hover:border-red-500/50 text-[#8E97B8] hover:text-red-300 text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer active:scale-95"
                title="Close Ghost Window (Esc)"
              >
                <X className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden sm:inline">Close</span>
              </button>

              <input
                type="text"
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                placeholder="Ask The Ghost in the Machine (Faust DSP, Vibe Checks, analog tape saturation, Ace-Step loops)..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#121626] border border-[#232944] text-white text-xs focus:outline-none focus:border-amber-400 transition-colors placeholder:text-[#5B6384]"
              />

              <button
                type="submit"
                disabled={!inputMessage.trim() || isThinking}
                className="p-2.5 rounded-xl transition-all disabled:opacity-40 flex items-center justify-center bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white font-bold shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                title="Send query"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
