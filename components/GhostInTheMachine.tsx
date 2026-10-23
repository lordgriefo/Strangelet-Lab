import React, { useState, useEffect, useRef } from 'react';
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
  PanelLeftClose
} from 'lucide-react';
import { GhostMessage, Track, View, GhostPersona } from '../types';
import { consultQuinnGhost, checkKoboldConnection, getStoredKoboldSettings } from '../services/koboldCppService';
import { getStoredBuddySoul, exportBuddySoulJson, importBuddySoulJson, calculateLevel } from '../services/buddyEvolutionCore';
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
  const [activeEngine, setActiveEngine] = useState<string>('koboldcpp');
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
  const [currentPersona, setCurrentPersona] = useState<GhostPersona>(
    initialSettings.defaultPersona || 'ghost'
  );
  const [showSoulDrawer, setShowSoulDrawer] = useState<boolean>(false);
  const [buddySoul, setBuddySoul] = useState(() => getStoredBuddySoul());

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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

  // Initial welcome messages based on selected persona
  const getInitialMessage = (persona: GhostPersona): GhostMessage => {
    switch (persona) {
      case 'qwen_abliterated':
        return {
          id: 'qwen-abliterated-welcome',
          sender: 'qwen_abliterated',
          persona: 'qwen_abliterated',
          text: "⚡ GHOST QWEN 4B [ABLITERATED & UNCENSORED] ONLINE.\n• Refusal directions: Neutralized (100% Uninhibited Audio Intel)\n• VRAM Footprint: 2.6 GB | Speed: ~64 tok/sec\n• Ready for asymmetric tube clipping, bootleg saturation circuits, and surgical DSP compilation. Click '⚡ TEST RUN (QWEN 4B)' or type any audio engineering question.",
          timestamp: Date.now() - 1000 * 60,
          actionProposal: {
            type: 'apply_mix_step',
            payload: { stepType: 'harmonic_tape_saturation' },
            label: '🔥 Inject Asymmetric Tube Overdrive (Uncensored Step)'
          }
        };
      case 'duo_team':
        return {
          id: 'duo-welcome',
          sender: 'duo_team',
          persona: 'duo_team',
          text: "👻 Ghost: \"Yo! The tag-team is in the building, brother! I've got the analog grit, the tape reels, and the studio stories.\"\n⚡ Quinn: \"And I monitor spectral FFT symmetry, Faust JIT bytecode, and 8.5kHz de-sheening. We operate as a unified powerhouse.\"\n👥 Duo Verdict: Ask us anything or launch the Quantum Alchemist workflow!",
          timestamp: Date.now() - 1000 * 60,
          actionProposal: {
            type: 'open_workflow_studio',
            payload: {},
            label: '🚀 Open Guided Workflow Studio'
          }
        };
      case 'ghost':
      case 'llama':
        return {
          id: 'ghost-welcome',
          sender: 'ghost',
          persona: 'ghost',
          text: "👻 Ghost in the machine here! (Male • Llama 3.1 8B). Got the Studer tape bias tuned up, the vacuum tubes glowing warm, and inside game stories from Lee Perry, Prince, and Brian Eno ready to roll. What are we jamming on, brother?",
          timestamp: Date.now() - 1000 * 60,
          actionProposal: {
            type: 'open_acestep_loop_designer',
            payload: { stemType: 'bass', bpm: tempo },
            label: '🔥 Cook Up Loop with Ace-Step 1.5 GGUF'
          }
        };
      case 'strangelet_guru':
        return {
          id: 'guru-welcome',
          sender: 'strangelet_guru',
          persona: 'strangelet_guru',
          text: "🥋 Greetings, producer. I am the Strangelet Guru—your resident audio ninja sensei. Trained in the Software Dojo across the Large Sonic Collider, Faust DSP Lab, Ace-Step diffusion, and Gold Path mastering. How shall we sculpt the signal today?",
          timestamp: Date.now() - 1000 * 60,
          actionProposal: {
            type: 'open_software_dojo',
            payload: {},
            label: '🥋 Open Software Dojo Training Scrolls'
          }
        };
      case 'quinn':
      default:
        return {
          id: 'quinn-welcome',
          sender: 'quinn',
          persona: 'quinn',
          text: "⚡ Quinn standing by (Female • Qwen 3 7B • Spectral DSP Architect). Operating on ultra-low local VRAM, I calculate phase coherence, Linkwitz-Riley crossovers, and surgical 8.5kHz de-sheen notches. How shall we sculpt the signal?",
          timestamp: Date.now() - 1000 * 60,
          actionProposal: {
            type: 'apply_mix_step',
            payload: { stepType: 'spectral_desheen' },
            label: '⚡ Incorporate AI Mix Step'
          }
        };
    }
  };

  const [messages, setMessages] = useState<GhostMessage[]>([getInitialMessage(currentPersona)]);

  // Periodic health check on local AI hub
  useEffect(() => {
    let isMounted = true;
    const testPing = async () => {
      const res = await checkKoboldConnection();
      if (isMounted) {
        setKoboldConnected(res.connected);
        setActiveEngine(res.engine || 'local');
        setConnectionLatency(res.latencyMs || null);
      }
    };
    testPing();
    const interval = setInterval(testPing, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

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

    try {
      const reply = await consultQuinnGhost(text, messages, {
        bpm: tempo,
        currentView: String(currentView),
        tracksCount: tracks.length,
        collisionEnergy
      }, currentPersona);
      setMessages(prev => [...prev, reply]);
      playLaserBeamSound('laser_audio');
      refreshSoul();
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `${currentPersona}-err-${Date.now()}`,
          sender: currentPersona,
          persona: currentPersona,
          text: currentPersona === 'strangelet_guru'
            ? "🥋 Kata momentarily interrupted by quantum drift. Stand firm; the offline Dojo kernel remains listening."
            : (currentPersona === 'llama'
              ? "Yo my bad, had a brief glitch in the loopback buffer! Still right here with you though, homie."
              : "The quantum buffer momentarily drifted. I remain listening through the local loopback."),
          timestamp: Date.now()
        }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleExecuteActionProposal = (action: GhostMessage['actionProposal']) => {
    if (!action) return;
    playColliderInjectionSound();

    if (action.type === 'open_software_dojo' && onOpenSoftwareDojo) {
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
    handleSendMessage("⚡ Run full benchmark test run on Qwen 4B Abliterated: verify refusal-free telemetry, latency, and DSP recommendations.");
  };

  const handleSwitchPersona = (persona: GhostPersona) => {
    if (persona === currentPersona) return;
    setCurrentPersona(persona);
    playColliderInjectionSound();

    let switchMsg: GhostMessage;
    if (persona === 'qwen_abliterated') {
      switchMsg = {
        id: `qwen-abliterated-switch-${Date.now()}`,
        sender: 'qwen_abliterated',
        persona: 'qwen_abliterated',
        text: "⚡ GHOST QWEN 4B [ABLITERATED & UNCENSORED] ACTIVE!\nRefusal directions: Neutralized. VRAM: 2.6 GB footprint. Uninhibited analog drive, raw tape saturation, and extreme frequency surgery are unlocked with zero corporate disclaimers.",
        timestamp: Date.now(),
        actionProposal: {
          type: 'apply_mix_step',
          payload: { stepType: 'harmonic_tape_saturation' },
          label: '🔥 Inject Asymmetric Tube Overdrive'
        }
      };
    } else if (persona === 'duo_team') {
      switchMsg = {
        id: `duo-switch-${Date.now()}`,
        sender: 'duo_team',
        persona: 'duo_team',
        text: "👥 Ghost & Quinn Co-Op Mode engaged! Ghost provides the gritty analog instinct and legendary studio stories; Quinn calculates spectral physics, Linkwitz-Riley crossovers, and Faust code. Ask us anything!",
        timestamp: Date.now(),
        actionProposal: {
          type: 'open_workflow_studio',
          payload: {},
          label: '🚀 Open Guided Workflow Studio'
        }
      };
    } else if (persona === 'ghost' || persona === 'llama') {
      switchMsg = {
        id: `ghost-switch-${Date.now()}`,
        sender: 'ghost',
        persona: 'ghost',
        text: "👻 Ghost in the machine active! (Male • Llama 3.1 8B). Vacuum tubes warm, tape reels spinning. Let's make some dirty organic music, brother.",
        timestamp: Date.now(),
        actionProposal: {
          type: 'open_acestep_loop_designer',
          payload: { stemType: 'bass', bpm: tempo },
          label: '🔥 Cook Up Loop with Ace-Step 1.5 GGUF'
        }
      };
    } else if (persona === 'strangelet_guru') {
      switchMsg = {
        id: `guru-switch-${Date.now()}`,
        sender: 'strangelet_guru',
        persona: 'strangelet_guru',
        text: "🥋 Strangelet Ninja/Guru activated. The sacred geometry of your session is now under the discipline of the Software Dojo. What element shall we master?",
        timestamp: Date.now(),
        actionProposal: {
          type: 'open_software_dojo',
          payload: {},
          label: '🥋 View Dojo Master Scrolls'
        }
      };
    } else {
      switchMsg = {
        id: `quinn-switch-${Date.now()}`,
        sender: 'quinn',
        persona: 'quinn',
        text: "⚡ Quinn 3.7 synaptic core engaged (Female • Qwen 3 7B). Spectral harmonics, FFT frequency matrices, and Faust JIT compiler ready.",
        timestamp: Date.now(),
        actionProposal: {
          type: 'apply_mix_step',
          payload: { stepType: 'spectral_desheen' },
          label: '⚡ Incorporate AI Mix Step'
        }
      };
    }

    setMessages(prev => [...prev, switchMsg]);
  };

  const isQwenAbliterated = currentPersona === 'qwen_abliterated';
  const isDuo = currentPersona === 'duo_team';
  const isGhost = currentPersona === 'ghost' || currentPersona === 'llama';
  const isLlama = isGhost;
  const isQuinn = currentPersona === 'quinn';
  const isGuru = currentPersona === 'strangelet_guru';

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
              className={`p-2 rounded-xl border shadow-[0_0_20px_rgba(0,0,0,0.6)] flex items-center justify-center transition-all hover:scale-110 backdrop-blur-md relative ${
                isGuru
                  ? 'bg-[#140F06]/95 border-amber-500/60 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                  : isLlama
                    ? 'bg-[#120D08]/95 border-orange-500/50 text-orange-300 shadow-[0_0_15px_rgba(249,115,22,0.3)]'
                    : isDuo
                      ? 'bg-[#190D25]/95 border-purple-500/60 text-pink-300 shadow-[0_0_15px_rgba(236,72,153,0.3)]'
                      : 'bg-[#090C16]/95 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
              }`}
              title="Strangelet Buddy (Folded) — Click to open chat"
            >
              <Bot className="w-4 h-4 animate-pulse" />
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
              className={`p-2.5 rounded-2xl border shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center gap-2.5 text-white transition-all transform hover:scale-[1.02] backdrop-blur-md ${
                isGuru
                  ? 'bg-[#140F06]/92 hover:bg-[#1E170A] border-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.35)]'
                  : isLlama
                    ? 'bg-[#120D08]/92 hover:bg-[#1D140C] border-orange-500/40 shadow-[0_0_25px_rgba(249,115,22,0.3)]'
                    : isDuo
                      ? 'bg-[#190D25]/92 hover:bg-[#251336] border-purple-500/50 shadow-[0_0_25px_rgba(236,72,153,0.3)]'
                      : 'bg-[#090C16]/92 hover:bg-[#101526] border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.3)]'
              }`}
              title={isGuru ? "Consult Strangelet Guru // Audio Ninja Sensei" : (isLlama ? "Talk with Ghost (Llama 3.1)" : isDuo ? "Ghost & Quinn Tag-Team" : "Consult Quinn 3.7")}
            >
              {/* Pulsing Holographic Eye */}
              <div className="relative flex items-center justify-center">
                <div className={`w-7 h-7 rounded-xl border flex items-center justify-center shadow-[0_0_12px_rgba(0,0,0,0.5)] ${
                  isGuru
                    ? 'bg-gradient-to-tr from-amber-500/40 via-yellow-500/30 to-orange-500/40 border-amber-400 text-amber-300'
                    : isLlama
                      ? 'bg-gradient-to-tr from-orange-500/30 via-pink-500/30 to-purple-500/30 border-orange-400/50 text-orange-300'
                      : isDuo
                        ? 'bg-gradient-to-tr from-purple-500/40 via-pink-500/30 to-cyan-500/40 border-purple-400 text-pink-300'
                        : 'bg-gradient-to-tr from-cyan-500/30 via-purple-500/30 to-amber-500/30 border-cyan-400/50 text-cyan-300'
                }`}>
                  <Bot className="w-3.5 h-3.5 animate-pulse" />
                </div>
                <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ring-2 ring-[#090C16] ${
                  koboldConnected ? 'bg-emerald-400 animate-ping' : (isGuru ? 'bg-amber-400' : (isLlama ? 'bg-orange-400' : 'bg-cyan-400'))
                }`} />
              </div>

              <div className="text-left font-mono pr-1">
                <div className={`text-xs font-bold tracking-wider flex items-center gap-1.5 ${
                  isGuru ? 'text-amber-300' : (isLlama ? 'text-orange-300' : isDuo ? 'text-pink-300' : 'text-cyan-300')
                }`}>
                  <span>{isGuru ? 'STRANGELET GURU' : (isLlama ? 'GHOST' : isDuo ? 'GHOST & QUINN' : 'QUINN 3.7')}</span>
                  <span className={`text-[8px] px-1 py-0.2 rounded border font-bold ${
                    isGuru
                      ? 'bg-amber-950/90 text-amber-300 border-amber-600/50'
                      : isLlama 
                        ? 'bg-orange-950/80 text-orange-300 border-orange-600/40' 
                        : isDuo
                          ? 'bg-purple-950/80 text-pink-300 border-purple-600/40'
                          : 'bg-cyan-950/80 text-cyan-400 border-cyan-600/40'
                  }`}>
                    {isGuru ? 'NINJA' : (isLlama ? 'BUDDY' : isDuo ? 'DUO' : 'GHOST')}
                  </span>
                </div>
                <div className="text-[9px] text-[#7E85A8]">
                  {koboldConnected ? `${activeEngine.toUpperCase()} Active` : 'Offline Dojo'}
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
          } rounded-2xl bg-[#080B14]/95 border ${
            isGuru ? 'border-[#4D3815]' : (isLlama ? 'border-[#3D2C1B]' : 'border-[#232B45]')
          } shadow-[0_0_60px_rgba(0,0,0,0.9)] backdrop-blur-xl flex flex-col overflow-hidden animate-fade-in font-mono`}
        >
          {/* Terminal Title Bar */}
          <div className={`px-4 py-3 border-b flex items-center justify-between flex-shrink-0 select-none ${
            isQwenAbliterated
              ? 'border-[#4D1A1A] bg-gradient-to-r from-[#220B0B] via-[#1A0E18] to-[#0D1526]'
              : isDuo
                ? 'border-[#3D1A45] bg-gradient-to-r from-[#1C0E28] via-[#16122C] to-[#0D1526]'
                : isGuru
                  ? 'border-[#3D2C12] bg-gradient-to-r from-[#1A1308] via-[#22180A] to-[#0E0C06]'
                  : isGhost 
                    ? 'border-[#2D2115] bg-gradient-to-r from-[#17110B] via-[#1C140D] to-[#0D0B08]' 
                    : 'border-[#1C233A] bg-gradient-to-r from-[#0C101F] via-[#10162B] to-[#0A0D1A]'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.4)] ${
                isQwenAbliterated
                  ? 'bg-gradient-to-tr from-red-500/40 via-orange-500/30 to-amber-500/40 border-red-400 text-amber-300 shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                  : isDuo
                    ? 'bg-gradient-to-tr from-purple-500/40 via-pink-500/30 to-cyan-500/40 border-purple-400 text-pink-300'
                    : isGuru
                      ? 'bg-gradient-to-tr from-amber-500/40 to-yellow-500/40 border-amber-400 text-amber-300'
                      : isGhost 
                        ? 'bg-gradient-to-tr from-orange-500/30 to-amber-500/30 border-orange-400/50 text-orange-300' 
                        : 'bg-gradient-to-tr from-cyan-500/30 to-purple-500/30 border-cyan-400/50 text-cyan-300'
              }`}>
                {isQwenAbliterated ? <Flame className="w-4 h-4 text-orange-400 animate-pulse" /> : <Bot className="w-4 h-4" />}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white tracking-wider">
                    {isQwenAbliterated
                      ? 'GHOST QWEN 4B // ABLITERATED & UNCENSORED'
                      : isDuo 
                        ? 'GHOST & QUINN // TAG-TEAM DUO' 
                        : (isGuru 
                            ? 'STRANGELET GURU // AUDIO NINJA' 
                            : (isGhost 
                                ? 'GHOST (LLAMA 3.1) // ANALOG SAGE' 
                                : 'QUINN (QWEN 3) // DSP ARCHITECT'))}
                  </span>
                  {isQwenAbliterated && (
                    <span className="text-[8px] px-1 py-0.2 rounded bg-red-950/90 text-red-300 border border-red-500/60 font-bold uppercase tracking-wider animate-pulse">
                      UNCENSORED
                    </span>
                  )}
                  <span className={`w-2 h-2 rounded-full ${
                    koboldConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                  }`} title={koboldConnected ? 'Hub connected' : 'Offline Dojo Kernel active'} />
                </div>
                <div className="text-[9px] text-[#6E7599] flex items-center gap-2">
                  <span>HUB: {activeEngine.toUpperCase()}</span>
                  <span>•</span>
                  <span>VRAM: {isQwenAbliterated ? '2.6 GB' : '3.8 GB'}</span>
                  <span>•</span>
                  <span>LATENCY: {connectionLatency ? `${connectionLatency}ms` : '12ms (Kernel)'}</span>
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
                title={widgetPosition === 'sidebar-docked' ? 'Currently docked in Sidebar (Click to float on screen)' : 'Dock Guru to top of Sidebar (Clears floating button from mixer grid)'}
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
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-[#6E7599] hover:text-white hover:bg-[#161B2E] transition-colors"
                title="Close terminal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Persona Switcher Bar (5 Modes: Qwen 4B Abliterated, Ghost, Quinn, Duo Team, Guru) */}
          <div className="px-3 py-1.5 bg-[#060810] border-b border-[#161D2E] flex items-center justify-between text-xs overflow-x-auto scrollbar-none">
            <span className="text-[10px] text-[#636C8E] uppercase font-bold tracking-wider mr-2 flex-shrink-0">
              Buddies:
            </span>
            <div className="flex items-center gap-1 bg-[#0D1220] p-0.5 rounded-lg border border-[#1F273E] flex-shrink-0">
              <button
                onClick={() => handleSwitchPersona('qwen_abliterated')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                  isQwenAbliterated
                    ? 'bg-gradient-to-r from-red-600/30 to-amber-600/30 text-amber-300 border border-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                    : 'text-[#7B84A6] hover:text-white'
                }`}
                title="Ghost Qwen 4B: Latest Qwen 2.5 3B/4B Abliterated & Uncensored GGUF — Refusal directions stripped, raw audio engineering"
              >
                <span>🔓 Qwen 4B (Uncensored)</span>
              </button>
              <button
                onClick={() => handleSwitchPersona('ghost')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                  isGhost
                    ? 'bg-orange-500/25 text-orange-300 border border-orange-500/50 shadow-sm'
                    : 'text-[#7B84A6] hover:text-white'
                }`}
                title="Ghost: Male (Llama 3.1) — Analog tape sage & eccentric studio lore"
              >
                <span>👻 Ghost (Male)</span>
              </button>
              <button
                onClick={() => handleSwitchPersona('quinn')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                  isQuinn
                    ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 shadow-sm'
                    : 'text-[#7B84A6] hover:text-white'
                }`}
                title="Quinn: Female (Qwen 3) — Precision DSP architect & spectral math"
              >
                <span>⚡ Quinn (Female)</span>
              </button>
              <button
                onClick={() => handleSwitchPersona('duo_team')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                  isDuo
                    ? 'bg-purple-500/25 text-purple-300 border border-purple-500/50 shadow-sm'
                    : 'text-[#7B84A6] hover:text-white'
                }`}
                title="Duo Team: Ghost & Quinn Tag-Team Co-Op Mode"
              >
                <span>👥 Duo Team</span>
              </button>
              <button
                onClick={() => handleSwitchPersona('strangelet_guru')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                  isGuru
                    ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-sm'
                    : 'text-[#7B84A6] hover:text-white'
                }`}
                title="Strangelet Guru: Audio Sensei & Software Dojo Master"
              >
                <span>🥋 Sensei</span>
              </button>
            </div>
          </div>

          {/* Telemetry Status Bar with 1-Click Live Test Run Trigger */}
          <div className="px-4 py-1.5 bg-[#0A0E1A] border-b border-[#181F33] flex items-center justify-between text-[10px] text-[#71789B]">
            <div className="flex items-center gap-3">
              <span>VIEW: <strong className="text-cyan-300">{String(currentView)}</strong></span>
              <span>TEMPO: <strong className="text-amber-300">{tempo} BPM</strong></span>
              <span>TRACKS: <strong className="text-purple-300">{tracks.length}</strong></span>
            </div>

            <div className="flex items-center gap-2">
              {/* 1-Click Live Test Run Trigger */}
              <button
                type="button"
                onClick={handleRunTestRun}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-bold text-[9px] shadow-[0_0_12px_rgba(239,68,68,0.5)] border border-yellow-300/40 animate-pulse transition-all cursor-pointer active:scale-95"
                title="Execute Live Benchmark Test Run on Qwen 4B Abliterated (Verifies Refusal-Free Telemetry & Audio Parameters)"
              >
                <Zap className="w-2.5 h-2.5 text-yellow-200 fill-yellow-200" />
                <span>⚡ TEST RUN (QWEN 4B)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSoulDrawer(prev => !prev)}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/40 text-purple-300 hover:text-white hover:bg-purple-900/60 transition-colors text-[9px] font-bold"
                title="Open Buddy Evolution & Persistent Soul Memories"
              >
                <Brain className="w-2.5 h-2.5 text-purple-400 animate-pulse" />
                <span>Lv.{buddySoul.level} Soul ({buddySoul.experienceXp} XP)</span>
              </button>
            </div>
          </div>

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

              {/* Level Progress */}
              <div className="p-2.5 rounded-lg bg-[#111424] border border-[#232B45] space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[#A5B4FC] font-bold">
                    Rank: Level {buddySoul.level} — "{buddySoul.levelTitle}"
                  </span>
                  <span className="text-purple-300 font-bold">{buddySoul.experienceXp} XP</span>
                </div>
                <div className="w-full h-1.5 bg-[#1B2138] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                    style={{ width: `${calculateLevel(buddySoul.experienceXp).progressPercent}%` }}
                  />
                </div>
              </div>

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
              const isMsgGuru = msg.sender === 'strangelet_guru' || msg.persona === 'strangelet_guru';
              const isMsgLlama = msg.sender === 'llama' || msg.persona === 'llama';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
                >
                  <div className="flex items-center gap-1.5 text-[9px] text-[#616988] px-1 font-mono">
                    <span>
                      {isUser ? 'PRODUCER (YOU)' : (isMsgGuru ? 'STRANGELET GURU // NINJA SENSEI' : (isMsgLlama ? 'LLAMA // STUDIO BUDDY' : 'QUINN 3.7 // GHOST'))}
                    </span>
                    <span>•</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>

                  <div
                    className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed transition-all ${
                      isUser
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-xs shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                        : isMsgGuru
                          ? 'bg-[#151108] border border-amber-500/40 text-[#EAD8BA] rounded-bl-xs shadow-[0_0_20px_rgba(245,158,11,0.12)]'
                          : isMsgLlama
                            ? 'bg-[#140F0A] border border-orange-500/30 text-[#E8D6C8] rounded-bl-xs shadow-[0_0_15px_rgba(249,115,22,0.1)]'
                            : 'bg-[#0D1222] border border-[#232B45] text-[#D0D6EC] rounded-bl-xs shadow-[0_0_15px_rgba(0,0,0,0.5)]'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>

                    {/* Action Proposal Button */}
                    {msg.actionProposal && (
                      <div className="mt-3 pt-2.5 border-t border-white/10">
                        <button
                          onClick={() => handleExecuteActionProposal(msg.actionProposal)}
                          className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all group ${
                            isMsgGuru
                              ? 'bg-amber-950/70 hover:bg-amber-900/80 border-amber-400 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                              : isMsgLlama
                                ? 'bg-orange-950/60 hover:bg-orange-900/80 border-orange-400 text-orange-200 shadow-[0_0_12px_rgba(249,115,22,0.25)]'
                                : 'bg-cyan-950/60 hover:bg-cyan-900/80 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                          }`}
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
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#0D1222] border border-[#232B45] max-w-[200px] text-xs text-[#8A93B8] animate-pulse">
                <Bot className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span>{isGuru ? 'Guru consulting scrolls...' : (isLlama ? 'Llama cooking up ideas...' : 'Quinn computing...')}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Ninja Prompt Chips */}
          <div className="px-3 py-2 bg-[#090C16] border-t border-[#181F33] flex items-center gap-1.5 overflow-x-auto text-[10px] select-none scrollbar-none">
            <span className="text-[#5B6384] font-bold uppercase text-[9px] mr-1 flex-shrink-0">
              Quick:
            </span>
            {[
              { label: '⚡ Run Qwen 4B Test Run', prompt: 'Execute live test run benchmark on Qwen 4B Abliterated model with DAW audio telemetry, refusal verification, and DSP parameters.' },
              { label: '🔥 Uncensored Tube Overdrive', prompt: 'Give me an uncensored asymmetric vacuum tube saturation formula for extreme guitar and drum punch.' },
              { label: '🚀 Quantum Alchemist Workflow', prompt: 'Walk me through the full pipeline: LSC prompt into Ace-Step, into mixer console, live guitar humanizing, and Devine Machine tape slicing!' },
              { label: '👥 Duo Tag-Team Advice', prompt: 'Ghost and Quinn, what are your contrasting takes on our session mix?' },
              { label: '🎲 Mad Studio Tale', prompt: 'Tell me an eccentric studio story from Lee Perry, Brian Eno, Prince, or Dr Dre!' },
              { label: '🎹 SFZ Open Library', prompt: 'How do I use the SFZ Open Library to load the 1973 Rhodes Mk I or share custom samples?' },
              { label: '📼 Ace-Step LoRAs', prompt: 'How does the LoRA Lending Library change the Ace-Step sound with SP-1200 or tape decay adapters?' },
              { label: '🎸 Faust DSP Toy', prompt: 'Write real-time Faust DSP code for a boutique guitar pedal or tape saturator.' },
              { label: '💾 6GB/16GB VRAM', prompt: 'How do I optimize models on my 6GB VRAM rig and upgrade to 16GB?' },
              { label: '✨ Gold Path A/B', prompt: 'How do I use the Gold Path mastering chain and A/B compare against the dry audio?' },
              { label: '🗡️ Suno De-Sheen', prompt: 'Run an 8.5kHz anti-sheen step to clean digital glare from my mix.' }
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip.prompt)}
                className={`px-2 py-0.5 rounded-md border text-[#9CA5CA] hover:text-white transition-colors flex-shrink-0 ${
                  chip.label.includes('Qwen') || chip.label.includes('Uncensored')
                    ? 'bg-red-950/40 border-red-500/50 text-amber-300 hover:bg-red-900/60 font-bold'
                    : 'bg-[#131728] hover:bg-[#1E2540] border-[#242C4C]'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Message Input Box */}
          <div className="p-3 bg-[#0A0D1B] border-t border-[#1C233B]">
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                placeholder={
                  isQwenAbliterated
                    ? "Ask Ghost Qwen 4B (Uncensored DSP, analog clipping, sub-mono lock, tube circuits)..."
                    : isDuo
                      ? "Ask Ghost & Quinn (Workflow, analog mojo vs DSP math)..."
                      : isGuru
                        ? "Ask the Strangelet Guru (DAW, DSP, Gold Path, Faust)..."
                        : isGhost
                          ? "Talk with Ghost (analog tape, eccentric tales, guitar vibe)..."
                          : "Ask Quinn (quantum DSP, spectral math, de-sheening)..."
                }
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#121626] border border-[#232944] text-white text-xs focus:outline-none focus:border-purple-400 transition-colors placeholder:text-[#5B6384]"
              />

              <button
                type="submit"
                disabled={!inputMessage.trim() || isThinking}
                className={`p-2.5 rounded-xl transition-all disabled:opacity-40 flex items-center justify-center ${
                  isQwenAbliterated
                    ? 'bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                    : isGuru
                      ? 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-black font-bold shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                      : isLlama
                        ? 'bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-500 hover:to-pink-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)]'
                        : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                }`}
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
