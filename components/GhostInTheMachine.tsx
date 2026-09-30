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
  Volume2
} from 'lucide-react';
import { GhostMessage, Track, View } from '../types';
import { consultQuinnGhost, checkKoboldConnection, getStoredKoboldSettings } from '../services/koboldCppService';
import { playLaserBeamSound, playColliderInjectionSound } from '../lib/laserSound';

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
  onOpenBasicPitch
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [koboldConnected, setKoboldConnected] = useState<boolean | null>(null);
  const [connectionLatency, setConnectionLatency] = useState<number | null>(null);

  const initialSettings = getStoredKoboldSettings();
  const [currentPersona, setCurrentPersona] = useState<'llama' | 'quinn'>(
    initialSettings.defaultPersona || 'llama'
  );

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Initial messages based on selected persona
  const [messages, setMessages] = useState<GhostMessage[]>([
    initialSettings.defaultPersona === 'quinn'
      ? {
          id: 'quinn-welcome',
          sender: 'quinn',
          persona: 'quinn',
          text: "I am Quinn 3.7—the Ghost in the Machine. Operating on ultra-low system resources via KoboldCpp, I observe your audio waveforms and particle collisions. How shall we sculpt the signal today?",
          timestamp: Date.now() - 1000 * 60,
          actionProposal: {
            type: 'apply_mix_step',
            payload: { stepType: 'spectral_desheen' },
            label: '⚡ Incorporate AI Mix Step'
          }
        }
      : {
          id: 'llama-welcome',
          sender: 'llama',
          persona: 'llama',
          text: "Yo what's good! I'm Llama—your studio buddy powered by low-resource GGUF on KoboldCpp. I'm chilling in your session, ready to cook up sick loops with Ace-Step 1.5, talk beats, or help dial in the mixer console. What's the vibe today?",
          timestamp: Date.now() - 1000 * 60,
          actionProposal: {
            type: 'open_acestep_loop_designer',
            payload: { stemType: 'bass', bpm: tempo },
            label: '🔥 Cook Up Loop with Ace-Step 1.5 GGUF'
          }
        }
  ]);

  // Periodic health check on KoboldCpp server
  useEffect(() => {
    let isMounted = true;
    const testPing = async () => {
      const res = await checkKoboldConnection();
      if (isMounted) {
        setKoboldConnected(res.connected);
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
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `${currentPersona}-err-${Date.now()}`,
          sender: currentPersona,
          persona: currentPersona,
          text: currentPersona === 'llama'
            ? "Yo my bad, had a brief glitch in the loopback buffer! Still right here with you though, homie."
            : "The quantum buffer momentarily drifted. I remain listening through the local KoboldCpp loopback.",
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

    if (action.type === 'apply_mix_step' && onOpenAiMixStep) {
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

  const handleSwitchPersona = (persona: 'llama' | 'quinn') => {
    if (persona === currentPersona) return;
    setCurrentPersona(persona);
    playColliderInjectionSound();

    const switchMsg: GhostMessage = persona === 'llama'
      ? {
          id: `llama-switch-${Date.now()}`,
          sender: 'llama',
          persona: 'llama',
          text: "Yo! Switched over to Llama Studio Buddy. What's the plan? We can cook up some fresh loops on Ace-Step 1.5 GGUF or dial in the mixer faders.",
          timestamp: Date.now(),
          actionProposal: {
            type: 'open_acestep_loop_designer',
            payload: { stemType: 'bass', bpm: tempo },
            label: '🔥 Cook Up Loop with Ace-Step 1.5 GGUF'
          }
        }
      : {
          id: `quinn-switch-${Date.now()}`,
          sender: 'quinn',
          persona: 'quinn',
          text: "Quinn 3.7 synaptic core engaged. Spectral harmonics and Large Sonic Collider channels are live and observing.",
          timestamp: Date.now(),
          actionProposal: {
            type: 'apply_mix_step',
            payload: { stepType: 'spectral_desheen' },
            label: '⚡ Incorporate AI Mix Step'
          }
        };

    setMessages(prev => [...prev, switchMsg]);
  };

  const isLlama = currentPersona === 'llama';

  return (
    <>
      {/* Floating Ghost Orb Trigger (Bottom Right) */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            playLaserBeamSound('laser_select');
          }}
          className={`fixed bottom-5 right-5 z-40 p-3 rounded-2xl border shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center gap-2.5 text-white transition-all transform hover:scale-105 group backdrop-blur-md ${
            isLlama
              ? 'bg-[#120D08]/90 hover:bg-[#1D140C] border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.3)]'
              : 'bg-[#090C16]/90 hover:bg-[#101526] border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.3)]'
          }`}
          title={isLlama ? "Talk with Llama // Studio Buddy" : "Consult Quinn 3.7 // Ghost in the Machine"}
        >
          {/* Pulsing Holographic Eye */}
          <div className="relative flex items-center justify-center">
            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shadow-[0_0_12px_rgba(0,0,0,0.5)] ${
              isLlama
                ? 'bg-gradient-to-tr from-amber-500/30 via-pink-500/30 to-purple-500/30 border-amber-400/50 text-amber-300'
                : 'bg-gradient-to-tr from-cyan-500/30 via-purple-500/30 to-amber-500/30 border-cyan-400/50 text-cyan-300'
            }`}>
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ring-2 ring-[#090C16] ${
              koboldConnected ? 'bg-emerald-400 animate-ping' : (isLlama ? 'bg-amber-400' : 'bg-cyan-400')
            }`} />
          </div>

          <div className="text-left font-mono pr-1">
            <div className={`text-xs font-bold tracking-wider flex items-center gap-1.5 ${
              isLlama ? 'text-amber-300' : 'text-cyan-300'
            }`}>
              <span>{isLlama ? 'LLAMA 3.1' : 'QUINN 3.7'}</span>
              <span className={`text-[9px] px-1 py-0.2 rounded border font-bold ${
                isLlama 
                  ? 'bg-amber-950/80 text-amber-300 border-amber-600/40' 
                  : 'bg-cyan-950/80 text-cyan-400 border-cyan-600/40'
              }`}>
                {isLlama ? 'BUDDY' : 'GHOST'}
              </span>
            </div>
            <div className="text-[10px] text-[#7E85A8]">
              {koboldConnected ? 'KoboldCpp Online' : 'Low-Resource Mode'}
            </div>
          </div>
        </button>
      )}

      {/* Expanded Holographic Terminal Window */}
      {isOpen && (
        <div 
          className={`fixed z-50 transition-all duration-300 ${
            isExpanded 
              ? 'inset-6 md:inset-12' 
              : 'bottom-4 right-4 w-[92vw] sm:w-[460px] h-[590px]'
          } rounded-2xl bg-[#080B14]/95 border ${
            isLlama ? 'border-[#3D2C1B]' : 'border-[#232B45]'
          } shadow-[0_0_60px_rgba(0,0,0,0.9)] backdrop-blur-xl flex flex-col overflow-hidden animate-fade-in font-mono`}
        >
          {/* Terminal Title Bar */}
          <div className={`px-4 py-3 border-b flex items-center justify-between flex-shrink-0 select-none ${
            isLlama 
              ? 'border-[#2D2115] bg-gradient-to-r from-[#17110B] via-[#1C140D] to-[#0D0B08]' 
              : 'border-[#1C233A] bg-gradient-to-r from-[#0C101F] via-[#10162B] to-[#0A0D1A]'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.4)] ${
                isLlama 
                  ? 'bg-gradient-to-tr from-amber-500/30 to-pink-500/30 border-amber-400/50 text-amber-300' 
                  : 'bg-gradient-to-tr from-cyan-500/30 to-purple-500/30 border-cyan-400/50 text-cyan-300'
              }`}>
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white tracking-wider">
                    {isLlama ? 'LLAMA 3.1 // STUDIO BUDDY' : 'QUINN 3.7 // GHOST IN THE MACHINE'}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${
                    koboldConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                  }`} title={koboldConnected ? 'KoboldCpp active' : 'Using embedded low-resource kernel'} />
                </div>
                <div className="text-[9px] text-[#6E7599] flex items-center gap-2">
                  <span>ENGINE: KOBOLDCPP ({isLlama ? 'LLAMA GGUF' : 'QWEN GGUF'})</span>
                  <span>•</span>
                  <span>VRAM: ~3.8GB</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="p-1.5 rounded-lg text-[#6E7599] hover:text-white hover:bg-[#161B2E] transition-colors"
                  title="Configure KoboldCpp endpoint & models"
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
                title="Close companion terminal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Persona Switcher Bar */}
          <div className="px-4 py-2 bg-[#060810] border-b border-[#161D2E] flex items-center justify-between text-xs">
            <span className="text-[10px] text-[#636C8E] uppercase font-bold tracking-wider">
              AI Personality:
            </span>
            <div className="flex items-center gap-1.5 bg-[#0D1220] p-0.5 rounded-lg border border-[#1F273E]">
              <button
                onClick={() => handleSwitchPersona('llama')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                  isLlama
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-[#7B84A6] hover:text-white'
                }`}
              >
                <span>🦙 Llama Buddy</span>
              </button>
              <button
                onClick={() => handleSwitchPersona('quinn')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                  !isLlama
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-[#7B84A6] hover:text-white'
                }`}
              >
                <span>👻 Quinn Ghost</span>
              </button>
            </div>
          </div>

          {/* Ghost Telemetry Status Bar */}
          <div className="px-4 py-1.5 bg-[#0A0E1A] border-b border-[#181F33] flex items-center justify-between text-[10px] text-[#71789B]">
            <div className="flex items-center gap-3">
              <span>VIEW: <strong className="text-cyan-300">{String(currentView)}</strong></span>
              <span>TEMPO: <strong className="text-amber-300">{tempo} BPM</strong></span>
              <span>COLLIDER: <strong className="text-purple-300">{collisionEnergy.toFixed(1)} TeV</strong></span>
            </div>
            <div className="flex items-center gap-2">
              {onOpenAceStepDesigner && (
                <button
                  onClick={onOpenAceStepDesigner}
                  className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition-colors"
                  title="Open Ace-Step 1.5 GGUF Loop Designer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Ace-Step</span>
                </button>
              )}
              {onOpenAiMixStep && (
                <button
                  onClick={onOpenAiMixStep}
                  className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 transition-colors"
                >
                  <Zap className="w-3 h-3" />
                  <span>Mix Step</span>
                </button>
              )}
            </div>
          </div>
          {/* Chat Messages Log */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0 text-xs">
            {messages.map(msg => {
              const isAssistant = msg.sender === 'quinn' || msg.sender === 'llama';
              const isLlamaMsg = msg.sender === 'llama';

              return (
                <div 
                  key={msg.id}
                  className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
                >
                  <div className="text-[9px] text-[#555D7E] mb-1 px-1 flex items-center gap-1">
                    {isAssistant ? (
                      isLlamaMsg ? (
                        <span className="text-amber-400 font-bold">🦙 LLAMA [STUDIO BUDDY]</span>
                      ) : (
                        <span className="text-cyan-400 font-bold">👻 QUINN 3.7 [GHOST]</span>
                      )
                    ) : (
                      'PRODUCER'
                    )}
                  </div>

                  <div 
                    className={`max-w-[88%] p-3 rounded-2xl leading-relaxed ${
                      isAssistant 
                        ? (isLlamaMsg
                            ? 'bg-[#140F0A] border border-[#382614] text-[#EFE4D8] shadow-sm'
                            : 'bg-[#101524] border border-[#222A44] text-[#D8DEF6] shadow-sm')
                        : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                    }`}
                  >
                    {msg.text}

                    {/* Action proposal if offered */}
                    {msg.actionProposal && (
                      <div className="mt-2.5 pt-2 border-t border-white/10">
                        <button
                          onClick={() => handleExecuteActionProposal(msg.actionProposal)}
                          className={`w-full py-1.5 px-3 rounded-xl border font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md ${
                            isLlamaMsg
                              ? 'bg-amber-950/80 hover:bg-amber-900 border-amber-500/40 text-amber-300'
                              : 'bg-cyan-950/80 hover:bg-cyan-900 border-cyan-500/40 text-cyan-300'
                          }`}
                        >
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span>{msg.actionProposal.label}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isThinking && (
              <div className="flex items-center gap-2 text-[#7E85A8] text-xs p-2">
                <div className={`w-2 h-2 rounded-full animate-ping ${isLlama ? 'bg-amber-400' : 'bg-cyan-400'}`} />
                <span className="italic">
                  {isLlama ? 'Llama is cooking up studio thoughts...' : 'Quinn 3.7 is synthesizing quantum advice via KoboldCpp...'}
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Suggestions */}
          <div className="px-3 py-1.5 border-t border-[#181F33] bg-[#0A0D18] flex items-center gap-1.5 overflow-x-auto text-[10px] text-[#71789B] flex-shrink-0">
            <span className="text-[#4E5474] uppercase shrink-0">Quick:</span>
            {(isLlama ? [
              "🎹 Transcribe Suno stems to MIDI with Basic Pitch",
              "🎸 Code a Faust tape flanger toy VST",
              "⚡ Build a Faust 303 acid filter toy",
              "🎵 Start full song bed in Ace-Step 1.5",
              "🔥 Cook up a 303 acid loop in Ace-Step",
              "🎸 Guitar overdub setup in mixer",
              "⚡ Slap an AI Mix Step on the faders"
            ] : [
              "Transcribe audio to MIDI via Spotify Basic Pitch",
              "Compile Faust DSP VST toy",
              "Start Ace-Step song bed with stems",
              "Incorporate AI Mix Step",
              "De-sheen high frequencies",
              "Tune collider to 11.8 TeV"
            ]).map(prompt => (
              <button
                key={prompt}
                onClick={() => handleSendMessage(prompt)}
                className={`px-2 py-0.5 rounded-lg border text-xs shrink-0 transition-colors ${
                  isLlama
                    ? 'bg-[#150F0A] hover:bg-[#20170F] border-[#2E1E12] text-[#C4A992] hover:text-white'
                    : 'bg-[#121626] hover:bg-[#1A2035] border-[#20273F] text-[#8E95B8] hover:text-white'
                }`}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Input Field */}
          <div className="p-3 border-t border-[#1C233A] bg-[#0B0F1C] flex items-center gap-2 flex-shrink-0">
            <input
              type="text"
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              placeholder={isLlama 
                ? "Talk with Llama buddy about Ace-Step songs, Faust VST toys, mixing..."
                : "Ask Quinn 3.7 about Faust DSP, mix steps, particle collisions..."
              }
              className={`flex-1 px-3.5 py-2 rounded-xl bg-[#12172A] border text-xs text-white placeholder-[#505778] focus:outline-none transition-colors ${
                isLlama ? 'border-[#332516] focus:border-amber-400' : 'border-[#232A44] focus:border-cyan-400'
              }`}
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isThinking}
              className={`p-2 rounded-xl text-white disabled:opacity-40 transition-all shadow-md active:scale-95 ${
                isLlama
                  ? 'bg-gradient-to-r from-amber-600 to-pink-600 hover:from-amber-500 hover:to-pink-500 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
              }`}
              title={isLlama ? "Send to Llama" : "Send to Quinn 3.7"}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
