import React, { useState, useEffect } from 'react';
import { 
  X, 
  Cpu, 
  Settings2, 
  Check, 
  RefreshCw, 
  HardDrive, 
  Sliders, 
  Activity, 
  ShieldCheck, 
  Terminal, 
  ExternalLink,
  Zap,
  Info
} from 'lucide-react';
import { KoboldSettings } from '../types';
import { 
  getStoredKoboldSettings, 
  saveStoredKoboldSettings, 
  checkKoboldConnection, 
  AVAILABLE_MODELS 
} from '../services/koboldCppService';
import { playColliderInjectionSound, playLaserBeamSound } from '../lib/laserSound';

interface KoboldSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsUpdated?: (settings: KoboldSettings) => void;
}

export const KoboldSettingsModal: React.FC<KoboldSettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsUpdated
}) => {
  if (!isOpen) return null;

  const [settings, setSettings] = useState<KoboldSettings>(getStoredKoboldSettings);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    connected: boolean;
    model?: string;
    latencyMs?: number;
    error?: string;
  } | null>(null);

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    playLaserBeamSound('laser_select');

    try {
      const res = await checkKoboldConnection(settings.endpointUrl);
      setTestResult(res);
      if (res.connected) {
        playColliderInjectionSound();
      }
    } catch (err: any) {
      setTestResult({
        connected: false,
        error: err.message || 'Unknown network error'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredKoboldSettings(settings);
    onSettingsUpdated?.(settings);
    setSavedSuccess(true);
    playColliderInjectionSound();
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-mono">
      <div 
        className="w-full max-w-2xl rounded-2xl bg-[#090C16] border border-[#232A44] shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1E253D] bg-gradient-to-r from-[#0F1426] via-[#12182D] to-[#0A0D1A] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 via-purple-500/20 to-amber-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-wider uppercase text-white">
                  KOBOLDCPP // LLAMA & QUINN CONFIGURATION
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-600/40 text-cyan-300 font-bold">
                  LOW-RESOURCE AI
                </span>
              </div>
              <p className="text-xs text-[#8288AA]">
                Run local GGUF quantized models with low VRAM footprint and companion studio personality.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7E85A8] hover:text-white hover:bg-[#1E233B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* AI Helper Persona */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#A2A9D0] uppercase tracking-wider flex items-center justify-between">
              <span>AI Companion Persona & Vibe</span>
              <span className="text-[10px] text-amber-400 font-normal">Switch personality anytime</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSettings(prev => ({ 
                  ...prev, 
                  defaultPersona: 'llama',
                  modelName: prev.modelName.includes('Quinn') ? 'Llama 3.1 8B (Studio Buddy GGUF Q4_K_M)' : prev.modelName
                }))}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                  (settings.defaultPersona === 'llama' || !settings.defaultPersona)
                    ? 'bg-amber-950/40 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                    : 'bg-[#0E1220] border-[#222944] text-[#7A82A4] hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                    🦙 Llama (Studio Buddy)
                  </span>
                  {(settings.defaultPersona === 'llama' || !settings.defaultPersona) && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#A0A7C4] mt-1 leading-relaxed">
                  Warm, casual studio buddy vibe! Hangs out on the studio couch, hypes your beats, suggests Ace-Step 1.5 loops, and gives constructive mixer feedback.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSettings(prev => ({ 
                  ...prev, 
                  defaultPersona: 'quinn',
                  modelName: prev.modelName.includes('Llama') ? 'Quinn 3.7 (Qwen-2.5-7B GGUF Q4_K_M)' : prev.modelName
                }))}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                  settings.defaultPersona === 'quinn'
                    ? 'bg-cyan-950/40 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                    : 'bg-[#0E1220] border-[#222944] text-[#7A82A4] hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-cyan-300 flex items-center gap-1.5">
                    👻 Quinn 3.7 (Ghost in Machine)
                  </span>
                  {settings.defaultPersona === 'quinn' && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#A0A7C4] mt-1 leading-relaxed">
                  Cybernetic, mysterious, and surgical audio engineering ghost. Deeply attuned to quantum particle collisions and surgical frequency sculpting.
                </p>
              </button>
            </div>
          </div>
          {/* Engine Mode */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#A2A9D0] uppercase tracking-wider">
              AI Engine Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'koboldcpp', label: 'KoboldCpp (Local GGUF)', desc: 'Lowest system resources (~3.5GB)' },
                { id: 'simulated', label: 'Quinn Embedded Kernel', desc: 'Zero installs, instant local rules' },
                { id: 'gemini', label: 'Gemini Cloud API', desc: 'Server-side neural API' }
              ].map(opt => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setSettings(prev => ({ ...prev, engine: opt.id as any }))}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    settings.engine === opt.id
                      ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                      : 'bg-[#0E1220] border-[#222944] text-[#7A82A4] hover:text-white'
                  }`}
                >
                  <div className="font-bold text-[11px] text-white">{opt.label}</div>
                  <div className="text-[9px] text-[#6E7599] mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Endpoint URL & Test Connection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#A2A9D0] uppercase tracking-wider">
                KoboldCpp Local Endpoint URL
              </label>
              <span className="text-[10px] text-[#6E7599]">Default: http://localhost:5001</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={settings.endpointUrl}
                onChange={e => setSettings(prev => ({ ...prev, endpointUrl: e.target.value }))}
                placeholder="http://localhost:5001"
                className="flex-1 px-3.5 py-2 rounded-xl bg-[#121626] border border-[#242A44] text-white text-xs focus:outline-none focus:border-cyan-400"
              />

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-4 py-2 rounded-xl bg-[#161B2E] hover:bg-[#1E253F] border border-[#293254] text-cyan-300 font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'Testing...' : 'Test Ping'}</span>
              </button>
            </div>

            {/* Test result status banner */}
            {testResult && (
              <div className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between animate-fade-in ${
                testResult.connected
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-500/50 text-amber-300'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${testResult.connected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span>
                    {testResult.connected
                      ? `Connected to KoboldCpp successfully! Model: ${testResult.model}`
                      : `Offline: ${testResult.error || 'Check if KoboldCpp is running'}`}
                  </span>
                </div>
                {testResult.latencyMs && (
                  <span className="text-[10px] font-mono text-[#8E95B8]">
                    {testResult.latencyMs}ms
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Model Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#A2A9D0] uppercase tracking-wider">
              Selected Model Profile (Quinn 3.6 / 3.7 Series)
            </label>
            <div className="space-y-1.5">
              {AVAILABLE_MODELS.map(m => (
                <div
                  key={m.id}
                  onClick={() => setSettings(prev => ({ ...prev, modelName: m.name }))}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    settings.modelName === m.name
                      ? 'bg-cyan-950/40 border-cyan-400/60 text-white'
                      : 'bg-[#0E1220] border-[#222944] text-[#8E95B8] hover:text-white'
                  }`}
                >
                  <div>
                    <div className="font-bold text-[11px] text-white flex items-center gap-1.5">
                      <span>{m.name}</span>
                      {settings.modelName === m.name && (
                        <Check className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                    </div>
                    <div className="text-[10px] text-[#6E7599]">{m.desc}</div>
                  </div>

                  <span className="text-[10px] px-2 py-0.5 rounded bg-black/40 text-amber-300 border border-white/10">
                    {m.vram}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* How to Launch KoboldCpp Quick Guide */}
          <div className="p-3 rounded-xl bg-[#080B14] border border-[#1E253E] space-y-1.5 text-[10px] text-[#71789B]">
            <div className="flex items-center gap-1.5 text-[#A2A9D0] font-bold uppercase">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Quick Start Command for KoboldCpp</span>
            </div>
            <p className="leading-relaxed">
              KoboldCpp runs as a single lightweight binary (.exe on Windows, executable on Linux/Mac):
            </p>
            <div className="p-2 rounded bg-black/70 border border-white/10 text-cyan-300 font-mono select-all">
              ./koboldcpp --model quinn-3.7.gguf --port 5001 --usecublas --contextsize 2048
            </div>
            <p className="text-[9px] text-[#555C7E]">
              Supports 4-bit Q4_K_M GGUF models with minimal RAM footprint (~3.5GB) and zero background telemetry.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-[#1C2237] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-[#8E94B8] hover:text-white hover:bg-[#161B2E] transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{savedSuccess ? 'Saved!' : 'Save Engine Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
