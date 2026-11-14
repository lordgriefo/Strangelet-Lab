import React, { useState } from 'react';
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
  Info,
  BookOpen,
  Flame,
  Bot
} from 'lucide-react';
import { KoboldSettings, GhostPersona, AiEngineType } from '../types';
import { 
  getStoredKoboldSettings, 
  saveStoredKoboldSettings, 
  checkKoboldConnection, 
  AVAILABLE_MODELS,
  HUB_PRESETS
} from '../services/koboldCppService';
import { getStoredResourceState, getRecommendedGhostModelForTier } from '../services/hardwareResourceManager';
import { playColliderInjectionSound, playLaserBeamSound } from '../lib/laserSound';

interface KoboldSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsUpdated?: (settings: KoboldSettings) => void;
  onOpenSoftwareDojo?: () => void;
  onOpenResourceManager?: () => void;
}

export const KoboldSettingsModal: React.FC<KoboldSettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsUpdated,
  onOpenSoftwareDojo,
  onOpenResourceManager
}) => {
  const [settings, setSettings] = useState<KoboldSettings>(getStoredKoboldSettings);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    connected: boolean;
    engine?: AiEngineType;
    model?: string;
    latencyMs?: number;
    error?: string;
  } | null>(null);

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [selectedTierFilter, setSelectedTierFilter] = useState<'all' | '4-6gb' | '8-12gb' | '16gb+'>('all');

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    playLaserBeamSound('laser_select');

    try {
      const res = await checkKoboldConnection(settings.endpointUrl, settings.engine, settings.customApiKey);
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

  const handleSelectHubPreset = (hub: typeof HUB_PRESETS[0]) => {
    setSettings(prev => ({
      ...prev,
      engine: hub.id,
      endpointUrl: hub.defaultUrl
    }));
    playLaserBeamSound('laser_select');
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
    <div className="fixed inset-0 z-[9997] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-mono select-none">
      <div 
        className="w-full max-w-2xl rounded-2xl bg-[#090C16] border border-[#232A44] shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1E253D] bg-gradient-to-r from-[#0F1426] via-[#12182D] to-[#0A0D1A] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 via-cyan-500/20 to-purple-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-wider uppercase text-white">
                  AUDIO AI HUB &amp; ENGINE SELECTOR
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-red-950/80 border border-red-600/40 text-red-300 font-bold">
                  KOBOLD.CPP DEFAULT
                </span>
              </div>
              <p className="text-xs text-[#8288AA]">
                Choose Kobold.cpp (Primary Audio AI), Ollama, LM Studio, or any custom AI server — zero built-in cloud keys.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenSoftwareDojo && (
              <button
                type="button"
                onClick={() => { onClose(); onOpenSoftwareDojo(); }}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
                title="Open Software Dojo Training Scrolls"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Software Dojo</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#7E85A8] hover:text-white hover:bg-[#1E233B] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Singular Ghost in the Machine Companion Card */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#A2A9D0] uppercase tracking-wider flex items-center justify-between">
              <span>Resident Studio AI Partner</span>
              <span className="text-[10px] text-amber-400 font-normal">Single evolving companion</span>
            </label>
            <div className="p-3.5 rounded-xl border border-amber-500/40 bg-gradient-to-r from-[#17120B] via-[#141224] to-[#0A0D1A] shadow-[0_0_20px_rgba(245,158,11,0.15)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/30 via-orange-500/20 to-purple-500/30 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)] flex-shrink-0">
                  <Bot className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-amber-300 tracking-wider">THE GHOST IN THE MACHINE</span>
                    <span className="text-[8px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-500/50 font-bold uppercase tracking-wider">
                      RESIDENT COMPANION
                    </span>
                  </div>
                  <p className="text-[10px] text-[#A0A7C4] mt-0.5 leading-snug">
                    One unified companion mastering how your lab runs: Software Dojo scrolls, Faust DSP JIT bytecode, Ace-Step diffusion, and Spectral Vibe Checks.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                <div className="px-2.5 py-1 rounded-lg bg-[#0E1222] border border-[#232B45] text-right">
                  <div className="text-[8px] text-[#71789B] uppercase font-bold">Soul Memory</div>
                  <div className="text-[10px] text-purple-300 font-bold">Persistent Local XP</div>
                </div>
              </div>
            </div>
          </div>

          {/* Uncensored / Refusal-Ablated Mode Switch */}
          <div className="p-3 rounded-xl bg-red-950/25 border border-red-500/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-300">
                <Flame className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-white">Abliterated &amp; Uncensored Refusal Neutralization</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-700/60 font-bold uppercase">
                    RAW AUDIO INTEL
                  </span>
                </div>
                <p className="text-[10px] text-[#A2A9D0]">
                  Neutralizes refusal vectors for uninhibited DSP calculation, extreme tube saturation clipping, and bootleg audio circuit recipes without corporate boilerplate.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSettings(prev => ({ ...prev, uncensoredMode: !prev.uncensoredMode, isAbliterated: !prev.isAbliterated }))}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold font-mono transition-all ${
                settings.uncensoredMode !== false
                  ? 'bg-red-600 text-white border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                  : 'bg-[#151B2E] text-[#8E95B8] border-[#252E4C]'
              }`}
            >
              {settings.uncensoredMode !== false ? '⚡ ABLITERATED (ACTIVE)' : 'FILTERED'}
            </button>
          </div>

          {/* Engine Hub Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#A2A9D0] uppercase tracking-wider">
                Select AI Service Provider
              </label>
              <span className="text-[10px] text-cyan-400">User-selected • Zero exposed keys</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {HUB_PRESETS.map(hub => (
                <button
                  type="button"
                  key={hub.id}
                  onClick={() => handleSelectHubPreset(hub)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    settings.engine === hub.id
                      ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                      : 'bg-[#0E1220] border-[#222944] text-[#7A82A4] hover:text-white'
                  }`}
                  title={hub.desc}
                >
                  <div className="font-bold text-[11px] text-white truncate">{hub.name.split(' (')[0]}</div>
                  <div className="text-[9px] text-amber-400 font-mono mt-0.5">
                    {hub.port ? `Port ${hub.port}` : 'Embedded'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Endpoint URL & Test Connection */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-[11px] font-bold text-[#A2A9D0] uppercase tracking-wider">
                Active AI Server Endpoint URL
              </label>
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, endpointUrl: 'http://localhost:5001', engine: 'koboldcpp' }))}
                  className="text-cyan-400 hover:underline"
                >
                  :5001 (Kobold)
                </button>
                <span className="text-[#4F577A]">|</span>
                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, endpointUrl: 'http://localhost:11434', engine: 'ollama' }))}
                  className="text-amber-400 hover:underline"
                >
                  :11434 (Ollama)
                </button>
                <span className="text-[#4F577A]">|</span>
                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, endpointUrl: 'http://localhost:1234', engine: 'lmstudio' }))}
                  className="text-purple-400 hover:underline"
                >
                  :1234 (LM Studio)
                </button>
                <span className="text-[#4F577A]">|</span>
                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, endpointUrl: 'http://localhost:8000', engine: 'openai_compatible' }))}
                  className="text-emerald-400 hover:underline"
                >
                  :8000 (Custom)
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={settings.endpointUrl}
                onChange={e => setSettings(prev => ({ ...prev, endpointUrl: e.target.value }))}
                placeholder="http://localhost:5001"
                className="flex-1 px-3.5 py-2 rounded-xl bg-[#121626] border border-[#242A44] text-white text-xs focus:outline-none focus:border-cyan-400 font-mono"
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
                      ? `Connected to ${testResult.engine || 'Hub'} successfully! Model: ${testResult.model}`
                      : `Offline: ${testResult.error || 'Server offline'}`}
                  </span>
                </div>
                {testResult.latencyMs !== undefined && (
                  <span className="text-[10px] font-mono text-[#8E95B8]">
                    {testResult.latencyMs}ms
                  </span>
                )}
              </div>
            )}
            {/* Optional Custom Endpoint Bearer Key (LocalStorage Only) */}
            {settings.engine === 'openai_compatible' && (
              <div className="pt-1 space-y-1">
                <label className="text-[10px] font-bold text-[#A2A9D0] uppercase tracking-wider flex items-center justify-between">
                  <span>Optional Bearer Token / API Key</span>
                  <span className="text-[9px] text-[#6E7599] font-normal">Saved only in your browser localStorage</span>
                </label>
                <input
                  type="password"
                  value={settings.customApiKey || ''}
                  onChange={e => setSettings(prev => ({ ...prev, customApiKey: e.target.value }))}
                  placeholder="Optional (leave blank for local llama-server / vLLM)"
                  autoComplete="off"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#121626] border border-[#242A44] text-white text-xs focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
            )}
          </div>

          {/* Model Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#A2A9D0] uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>Model Identifier / GGUF Profile</span>
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const tierId = getStoredResourceState().activeTier;
                    const rec = getRecommendedGhostModelForTier(tierId);
                    setSettings(prev => ({
                      ...prev,
                      modelName: rec.name,
                      vramBudgetMb: rec.vramBudgetMb
                    }));
                    playLaserBeamSound('laser_select');
                  }}
                  className="text-[10px] text-cyan-300 hover:text-white flex items-center gap-1 font-mono bg-cyan-950/60 border border-cyan-500/40 px-2 py-0.5 rounded"
                  title="Automatically pick the best Ghost Mad Scientist model tier (3B/4B Compact, 7B/8B Balanced, or 14B Pro) for your current VRAM"
                >
                  <Zap className="w-3 h-3 text-cyan-400" />
                  <span>Auto-Match VRAM ({getRecommendedGhostModelForTier(getStoredResourceState().activeTier).shortLabel})</span>
                </button>
                {onOpenResourceManager && (
                  <button
                    type="button"
                    onClick={() => { onClose(); onOpenResourceManager(); }}
                    className="text-[10px] text-amber-300 hover:text-white flex items-center gap-1 underline font-mono"
                  >
                    <Sliders className="w-3 h-3" />
                    <span>Configure 4GB–24GB VRAM Tiers</span>
                  </button>
                )}
              </div>
            </div>

            <input
              type="text"
              value={settings.modelName}
              onChange={e => setSettings(prev => ({ ...prev, modelName: e.target.value }))}
              placeholder="e.g. qwen2.5:7b, llama3.1:8b, or pick a GGUF profile below"
              className="w-full px-3.5 py-2 rounded-xl bg-[#121626] border border-[#242A44] text-cyan-200 text-xs focus:outline-none focus:border-cyan-400 font-mono"
            />

            {/* Helper Buddy Soul Preservation Notice */}
            <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/40 text-[10px] text-purple-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-purple-400" />
                <span>
                  <strong>Buddy Soul Evolved:</strong> Whichever local or custom model you choose, Ghost's Mad Scientist memory, Faust code skills, and eccentric studio stories are preserved seamlessly!
                </span>
              </div>
            </div>

            {/* VRAM Tier Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-mono">
              <span className="text-[#64748B] text-[9px] uppercase font-bold mr-1">VRAM Tiers:</span>
              <button
                type="button"
                onClick={() => setSelectedTierFilter('all')}
                className={`px-2 py-0.5 rounded-lg border transition-all ${
                  selectedTierFilter === 'all'
                    ? 'bg-cyan-500 text-black border-cyan-400 font-bold shadow-sm'
                    : 'bg-[#0E1322] border-[#222B48] text-[#8E95B8] hover:text-white'
                }`}
              >
                All ({AVAILABLE_MODELS.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedTierFilter('4-6gb')}
                className={`px-2 py-0.5 rounded-lg border transition-all ${
                  selectedTierFilter === '4-6gb'
                    ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-sm'
                    : 'bg-[#0E1322] border-[#222B48] text-[#8E95B8] hover:text-white'
                }`}
              >
                4GB–6GB (3B–4B)
              </button>
              <button
                type="button"
                onClick={() => setSelectedTierFilter('8-12gb')}
                className={`px-2 py-0.5 rounded-lg border transition-all ${
                  selectedTierFilter === '8-12gb'
                    ? 'bg-cyan-500 text-black border-cyan-400 font-bold shadow-sm'
                    : 'bg-[#0E1322] border-[#222B48] text-[#8E95B8] hover:text-white'
                }`}
              >
                8GB–12GB (7B–9B)
              </button>
              <button
                type="button"
                onClick={() => setSelectedTierFilter('16gb+')}
                className={`px-2 py-0.5 rounded-lg border transition-all ${
                  selectedTierFilter === '16gb+'
                    ? 'bg-emerald-500 text-black border-emerald-400 font-bold shadow-sm'
                    : 'bg-[#0E1322] border-[#222B48] text-[#8E95B8] hover:text-white'
                }`}
              >
                16GB+ (14B–32B)
              </button>
            </div>

            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
              {AVAILABLE_MODELS.filter(m => selectedTierFilter === 'all' || m.vramTier === selectedTierFilter || m.vramTier === 'any').map(m => (
                <div
                  key={m.id}
                  onClick={() => setSettings(prev => ({ ...prev, modelName: m.name }))}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    settings.modelName === m.name
                      ? 'bg-cyan-950/40 border-cyan-400/60 text-white shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                      : 'bg-[#0E1220] border-[#222944] text-[#8E95B8] hover:text-white'
                  }`}
                >
                  <div>
                    <div className="font-bold text-[11px] text-white flex items-center gap-2">
                      <span>{m.name}</span>
                      {settings.modelName === m.name && (
                        <Check className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                      <span className={`text-[9px] px-1.5 py-0.2 rounded border font-bold ${
                        m.vramTier === '4-6gb'
                          ? 'bg-amber-950/80 border-amber-500/40 text-amber-300'
                          : m.vramTier === '8-12gb'
                          ? 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300'
                          : m.vramTier === '16gb+'
                          ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                          : 'bg-[#151B2E] border-[#242E4C] text-[#8E95B8]'
                      }`}>
                        {m.vramTier === '4-6gb' ? '4-6GB TIER' : m.vramTier === '8-12gb' ? '8-12GB TIER' : m.vramTier === '16gb+' ? '16GB+ PRO' : 'ANY'}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#6E7599] mt-0.5">{m.desc}</div>
                  </div>

                  <span className="text-[10px] px-2 py-0.5 rounded bg-black/40 text-amber-300 border border-white/10 font-mono flex-shrink-0 ml-2">
                    {m.vram}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Terminal Launch Cheat-Sheet */}
          <div className="p-3 rounded-xl bg-[#080B14] border border-[#1E253E] space-y-1.5 text-[10px] text-[#71789B]">
            <div className="flex items-center gap-1.5 text-[#A2A9D0] font-bold uppercase">
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span>Offline Terminal Commands to Launch Local AI Hub</span>
            </div>
            <div className="space-y-1 font-mono text-[9px]">
              <div className="p-1.5 rounded bg-black/70 border border-white/10 text-cyan-300 select-all">
                # Kobold.cpp: ./koboldcpp --model qwen2.5-7b.gguf --port 5001
              </div>
              <div className="p-1.5 rounded bg-black/70 border border-white/10 text-amber-300 select-all">
                # Ollama: ollama run qwen2.5:7b
              </div>
              <div className="p-1.5 rounded bg-black/70 border border-white/10 text-purple-300 select-all">
                # LM Studio: Open LM Studio -&gt; Local Server -&gt; Start Server (Port 1234)
              </div>
              <div className="p-1.5 rounded bg-black/70 border border-white/10 text-emerald-300 select-all">
                # llama.cpp / OpenAI-Compat: ./llama-server -m model.gguf --port 8000
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-[#1C2237] flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (onOpenSoftwareDojo) {
                  onClose();
                  onOpenSoftwareDojo();
                }
              }}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1.5 font-bold"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Train in Software Dojo</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs text-[#8E94B8] hover:text-white hover:bg-[#161B2E] transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-600 to-cyan-600 hover:from-amber-500 hover:to-cyan-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>{savedSuccess ? 'Saved!' : 'Save Engine Settings'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
