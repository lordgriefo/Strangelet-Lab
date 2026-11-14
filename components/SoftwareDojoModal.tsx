import React, { useState, useEffect } from 'react';
import { 
  X, 
  BookOpen, 
  ShieldCheck, 
  Sparkles, 
  Check, 
  Save, 
  RotateCcw, 
  Download, 
  Upload, 
  Zap, 
  Cpu, 
  FileText, 
  Terminal, 
  Sliders,
  Flame,
  Info
} from 'lucide-react';
import { DojoScroll } from '../types';
import { 
  getStoredDojoScrolls, 
  saveStoredDojoScrolls, 
  getCustomDojoTrainingNote, 
  saveCustomDojoTrainingNote,
  DEFAULT_DOJO_SCROLLS
} from '../services/softwareDojoKnowledge';
import { STUDIO_LORE_DATABASE } from '../services/studioLoreKnowledge';
import { playColliderInjectionSound, playLaserBeamSound } from '../lib/laserSound';

interface SoftwareDojoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenHubSettings?: () => void;
}

export const SoftwareDojoModal: React.FC<SoftwareDojoModalProps> = ({
  isOpen,
  onClose,
  onOpenHubSettings
}) => {
  const [scrolls, setScrolls] = useState<DojoScroll[]>(getStoredDojoScrolls);
  const [activeScrollId, setActiveScrollId] = useState<string>(scrolls[0]?.id || 'custom-training');
  const [customNote, setCustomNote] = useState<string>(getCustomDojoTrainingNote);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scrolls' | 'custom_training' | 'studio_lore' | 'offline_guide'>('scrolls');
  const [selectedLoreId, setSelectedLoreId] = useState<string>(STUDIO_LORE_DATABASE[0]?.id);

  const selectedScroll = scrolls.find(s => s.id === activeScrollId);

  const handleToggleScroll = (id: string) => {
    setScrolls(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
    playLaserBeamSound('laser_select');
  };

  const handleSaveAll = () => {
    saveStoredDojoScrolls(scrolls);
    saveCustomDojoTrainingNote(customNote);
    playColliderInjectionSound();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleResetDefaults = () => {
    setScrolls(DEFAULT_DOJO_SCROLLS);
    saveStoredDojoScrolls(DEFAULT_DOJO_SCROLLS);
    playLaserBeamSound('laser_curve');
  };

  const handleExportJson = () => {
    const data = {
      scrolls,
      customNote,
      exportedAt: new Date().toISOString(),
      app: 'Strangelet Lab Software Dojo'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `strangelet-dojo-training-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    playLaserBeamSound('laser_audio');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (parsed.scrolls) setScrolls(parsed.scrolls);
        if (parsed.customNote !== undefined) setCustomNote(parsed.customNote);
        setImportError(null);
        playColliderInjectionSound();
      } catch (err) {
        setImportError('Invalid Dojo training JSON file. Please choose a valid Strangelet Dojo export.');
        setTimeout(() => setImportError(null), 5000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9996] flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in font-mono select-none">
      <div 
        className="w-full max-w-4xl h-[88vh] rounded-2xl bg-[#080B15] border border-[#222A44] shadow-[0_0_70px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1E253E] bg-gradient-to-r from-[#0E1325] via-[#141A33] to-[#0A0D1B] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 via-cyan-500/20 to-purple-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-wider uppercase text-white flex items-center gap-2">
                  <span>SOFTWARE DOJO</span>
                  <span className="text-amber-400">//</span>
                  <span className="text-cyan-400">OFFLINE AI TRAINING SCROLLS</span>
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 border border-amber-600/40 text-amber-300 font-bold">
                  NINJA / GURU BRAIN
                </span>
              </div>
              <p className="text-xs text-[#868EA8]">
                Train the offline helper buddies in the ways of Strangelet Lab systems, Faust DSP, and Gold Path mastering.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveAll}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            >
              {savedSuccess ? <Check className="w-3.5 h-3.5 text-white" /> : <Save className="w-3.5 h-3.5" />}
              <span>{savedSuccess ? 'Trained!' : 'Train Buddies'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#7E85A8] hover:text-white hover:bg-[#1E233B] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Inline Error Notification */}
        {importError && (
          <div className="mx-6 mt-3 px-3 py-2 rounded-lg bg-red-950/70 border border-red-500/50 text-red-200 text-xs flex items-center justify-between">
            <span>{importError}</span>
            <button onClick={() => setImportError(null)} className="text-red-300 hover:text-white ml-2">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Top Navigation Tabs */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-[#0C101E] border-b border-[#1A223B] text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setActiveTab('scrolls'); playLaserBeamSound('laser_select'); }}
              className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'scrolls'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                  : 'text-[#8A92B2] hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Master Software Scrolls ({scrolls.filter(s => s.enabled).length}/{scrolls.length})</span>
            </button>

            <button
              onClick={() => { setActiveTab('custom_training'); playLaserBeamSound('laser_select'); }}
              className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'custom_training'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                  : 'text-[#8A92B2] hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Custom Sensei Directives</span>
            </button>

            <button
              onClick={() => { setActiveTab('studio_lore'); playLaserBeamSound('laser_select'); }}
              className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'studio_lore'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                  : 'text-[#8A92B2] hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Studio Lore ({STUDIO_LORE_DATABASE.length} Producer Tales)</span>
            </button>

            <button
              onClick={() => { setActiveTab('offline_guide'); playLaserBeamSound('laser_select'); }}
              className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'offline_guide'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                  : 'text-[#8A92B2] hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Offline Hub &amp; Guide</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJson}
              className="p-1 rounded bg-[#13182C] hover:bg-[#1A223E] text-[#9098BD] hover:text-white border border-[#242C4C] transition-colors"
              title="Export Dojo Training JSON"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <label 
              className="p-1 rounded bg-[#13182C] hover:bg-[#1A223E] text-[#9098BD] hover:text-white border border-[#242C4C] transition-colors cursor-pointer"
              title="Import Dojo Training JSON"
            >
              <Upload className="w-3.5 h-3.5" />
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>
            <button
              onClick={handleResetDefaults}
              className="p-1 rounded bg-[#13182C] hover:bg-[#1A223E] text-[#9098BD] hover:text-white border border-[#242C4C] transition-colors"
              title="Reset to Factory Scrolls"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tab 1: Master Software Scrolls */}
        {activeTab === 'scrolls' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Scroll List Sidebar */}
            <div className="w-1/3 border-r border-[#1B223B] bg-[#0A0D1A] overflow-y-auto p-3 space-y-2">
              <div className="text-[10px] text-[#6E7599] uppercase tracking-wider font-bold px-2 py-1 flex items-center justify-between">
                <span>SYSTEM SCROLLS</span>
                <span className="text-amber-400 font-normal">Active in prompt</span>
              </div>
              {scrolls.map(scroll => (
                <div
                  key={scroll.id}
                  onClick={() => { setActiveScrollId(scroll.id); playLaserBeamSound('laser_select'); }}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    activeScrollId === scroll.id
                      ? 'bg-[#151C33] border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.15)] text-white'
                      : 'bg-[#0E1222] border-[#1E2540] text-[#7E86A8] hover:text-white hover:border-[#2C365C]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs truncate max-w-[180px] text-white">
                      {scroll.title}
                    </span>
                    <input
                      type="checkbox"
                      checked={scroll.enabled}
                      onChange={e => { e.stopPropagation(); handleToggleScroll(scroll.id); }}
                      className="accent-amber-400 w-3.5 h-3.5 cursor-pointer rounded"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-700/40">
                      {scroll.category}
                    </span>
                    <span className="text-[10px] text-[#828AA8] truncate">
                      {scroll.summary}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Scroll Detail Content */}
            <div className="flex-1 p-6 overflow-y-auto bg-[#070A14] flex flex-col">
              {selectedScroll ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#1D243F]">
                    <div>
                      <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                        {selectedScroll.category}
                      </div>
                      <h3 className="text-base font-bold text-white mt-0.5">
                        {selectedScroll.title}
                      </h3>
                      <p className="text-xs text-[#8A92B4] mt-1">
                        {selectedScroll.summary}
                      </p>
                    </div>

                    <button
                      onClick={() => handleToggleScroll(selectedScroll.id)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                        selectedScroll.enabled
                          ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                          : 'bg-[#12162A] border-[#222A46] text-[#7E86A8]'
                      }`}
                    >
                      {selectedScroll.enabled ? '✓ Active in AI Context' : 'Disabled'}
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#A2A9D0] uppercase tracking-wider flex items-center justify-between">
                      <span>Scroll Doctrine & Instructions</span>
                      <span className="text-[10px] text-[#6E7599]">Editable</span>
                    </label>
                    <textarea
                      value={selectedScroll.content}
                      onChange={e => {
                        const val = e.target.value;
                        setScrolls(prev => prev.map(s => s.id === selectedScroll.id ? { ...s, content: val } : s));
                      }}
                      rows={14}
                      className="w-full p-4 rounded-xl bg-[#0E1222] border border-[#222944] text-[#DCE2F4] text-xs font-mono leading-relaxed focus:outline-none focus:border-amber-400 resize-none shadow-inner"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-[#6E7599] text-xs">
                  Select a master scroll to view or edit training directives.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Custom Sensei Directives */}
        {activeTab === 'custom_training' && (
          <div className="flex-1 p-6 overflow-y-auto bg-[#070A14] flex flex-col space-y-4">
            <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/40 text-cyan-300 text-xs flex items-start gap-3">
              <Zap className="w-5 h-5 flex-shrink-0 text-cyan-400 mt-0.5" />
              <div>
                <div className="font-bold text-white text-xs">Custom Sensei Training Notes & Studio Principles</div>
                <p className="text-[11px] text-[#A2B3D4] mt-1 leading-relaxed">
                  Teach the Strangelet Ninja/Guru your exact studio rules, mixing workflows, favorite key centers, Faust DSP recipes, and mastering recipes. These directives are injected directly into the system prompt for local GGUFs on Kobold.cpp, Ollama, and LM Studio.
                </p>
              </div>
            </div>

            <div className="flex-1 flex flex-col space-y-1.5">
              <label className="text-[11px] font-bold text-[#A2A9D0] uppercase tracking-wider flex items-center justify-between">
                <span>Custom Directives Buffer</span>
                <span className="text-[10px] text-[#6E7599]">Stored in persistent local memory</span>
              </label>
              <textarea
                value={customNote}
                onChange={e => setCustomNote(e.target.value)}
                rows={16}
                placeholder="Enter custom training directives for your helper buddies..."
                className="w-full flex-1 p-4 rounded-xl bg-[#0E1222] border border-[#222944] text-[#DCE2F4] text-xs font-mono leading-relaxed focus:outline-none focus:border-cyan-400 resize-none shadow-inner"
              />
            </div>
          </div>
        )}

        {/* Tab 3: Legendary Studio Lore (12 Producer Inside Game Stories) */}
        {activeTab === 'studio_lore' && (
          <div className="flex-1 flex overflow-hidden bg-[#070A14]">
            {/* Story List Sidebar */}
            <div className="w-80 border-r border-[#1B223B] bg-[#0A0D1B] overflow-y-auto p-3 space-y-1.5 custom-scrollbar flex-shrink-0">
              <div className="text-[10px] text-[#636C8E] uppercase font-bold tracking-wider px-2 py-1">
                Inside Game Secret Chronicles
              </div>
              {STUDIO_LORE_DATABASE.map(story => {
                const isSelected = story.id === selectedLoreId;
                return (
                  <div
                    key={story.id}
                    onClick={() => { setSelectedLoreId(story.id); playLaserBeamSound('laser_select'); }}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-400/80 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : 'bg-[#0E1222] border-[#1C2237] text-[#8E95B8] hover:text-white hover:border-[#2C385C]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className={isSelected ? 'text-amber-300' : 'text-white'}>{story.artistOrProducer}</span>
                      <span className="text-[9px] text-[#6E7599]">{story.era.split('(')[0].trim()}</span>
                    </div>
                    <div className="text-[10px] text-[#CAD2EA] font-semibold mt-0.5 line-clamp-1">
                      {story.title}
                    </div>
                    <div className="text-[9px] text-[#71789B] mt-0.5 line-clamp-2">
                      {story.teaser}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Story Full Viewer */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar">
              {(() => {
                const lore = STUDIO_LORE_DATABASE.find(s => s.id === selectedLoreId) || STUDIO_LORE_DATABASE[0];
                return (
                  <div className="space-y-4 animate-fade-in max-w-3xl">
                    <div className="p-4 rounded-xl bg-gradient-to-r from-[#171208] via-[#1F170A] to-[#120F08] border border-amber-500/40 space-y-1 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                          {lore.artistOrProducer} • {lore.era}
                        </span>
                        <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                          LEGENDARY LORE
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white tracking-wide">
                        {lore.title}
                      </h3>
                      <p className="text-xs text-[#EAD8BA] leading-relaxed pt-1">
                        {lore.fullTale}
                      </p>
                    </div>

                    {/* Actionable Dojo Technique Card */}
                    <div className="p-4 rounded-xl bg-[#0C1518] border border-emerald-500/40 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 text-emerald-300" />
                        <span>Actionable Dojo Technique (Apply In Your Session)</span>
                      </div>
                      <p className="text-xs text-[#D1F2D9] leading-relaxed">
                        {lore.actionableDojoTechnique}
                      </p>
                    </div>

                    {/* Faust / DAW Trick Card */}
                    <div className="p-4 rounded-xl bg-[#0D1322] border border-cyan-500/40 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                          <Terminal className="w-4 h-4 text-cyan-300" />
                          <span>Faust DSP &amp; Strangelet DAW Implementation</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(lore.faustOrDawTrick);
                            playLaserBeamSound('laser_curve');
                          }}
                          className="px-2 py-0.5 rounded text-[10px] bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 font-bold transition-colors"
                        >
                          Copy Trick
                        </button>
                      </div>
                      <div className="p-3 rounded-lg bg-[#060810] border border-[#1A233D] font-mono text-[11px] text-cyan-200">
                        {lore.faustOrDawTrick}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Tab 4: Offline Hub & Compilation Guide */}
        {activeTab === 'offline_guide' && (
          <div className="flex-1 p-6 overflow-y-auto bg-[#070A14] space-y-5 text-xs">
            {/* Status Banner */}
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                <div>
                  <div className="font-bold text-white text-sm">Strangelet Lab is 100% Offline-Ready!</div>
                  <p className="text-[11px] text-[#A0C4B4] mt-0.5">
                    The entire application is completely buildable and standalone. Zero cloud dependencies required for DSP, synthesis, or mastering.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-bold text-[11px]">
                BUILD: READY
              </span>
            </div>

            {/* Offline Hubs Table */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#A2A9D0] flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>Supported Local AI Hubs for Offline GGUF Execution</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Kobold.cpp */}
                <div className="p-3.5 rounded-xl bg-[#0E1222] border border-[#222944] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">Kobold.cpp</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/40 font-bold">Port 5001</span>
                  </div>
                  <p className="text-[10px] text-[#868EA8] leading-relaxed">
                    Ultra-lean standalone C++ GGUF runner. Uses only ~3.5GB VRAM for 7B Q4 models, leaving all system resources free for audio buffers.
                  </p>
                  <div className="p-2 rounded bg-[#060810] border border-[#1B223B] font-mono text-[9px] text-[#A2B3D4]">
                    koboldcpp --model qwen2.5-7b.gguf --port 5001
                  </div>
                </div>

                {/* Ollama */}
                <div className="p-3.5 rounded-xl bg-[#0E1222] border border-[#222944] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">Ollama</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-700/40 font-bold">Port 11434</span>
                  </div>
                  <p className="text-[10px] text-[#868EA8] leading-relaxed">
                    Super popular single-command local LLM server. Automatically downloads and runs Llama 3.1, Qwen 2.5, DeepSeek R1, or Mistral.
                  </p>
                  <div className="p-2 rounded bg-[#060810] border border-[#1B223B] font-mono text-[9px] text-[#A2B3D4]">
                    ollama run qwen2.5:7b
                  </div>
                </div>

                {/* LM Studio */}
                <div className="p-3.5 rounded-xl bg-[#0E1222] border border-[#222944] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">LM Studio</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-700/40 font-bold">Port 1234</span>
                  </div>
                  <p className="text-[10px] text-[#868EA8] leading-relaxed">
                    Beautiful desktop GUI for searching and running any HuggingFace GGUF with GPU layer offloading and local OpenAI-compatible endpoint.
                  </p>
                  <div className="p-2 rounded bg-[#060810] border border-[#1B223B] font-mono text-[9px] text-[#A2B3D4]">
                    Local Server Tab -&gt; Start Server (Port 1234)
                  </div>
                </div>
              </div>
            </div>

            {/* Offline Compilation Instructions */}
            <div className="p-4 rounded-xl bg-[#0E1222] border border-[#222944] space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#A2A9D0] flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>How to Compile Strangelet Lab Standalone for Air-Gapped / Offline Studio</span>
              </h4>
              <p className="text-[11px] text-[#9EA7CA] leading-relaxed">
                To run Strangelet Lab on a completely disconnected studio laptop or desktop rig:
              </p>
              <div className="p-3 rounded-lg bg-[#060810] border border-[#1B223B] font-mono text-[10px] text-emerald-300 space-y-1">
                <div># 1. Compile static bundle</div>
                <div className="text-white">npm run build</div>
                <div className="text-[#6E7599] mt-2"># 2. Host locally on any port (or open dist/index.html)</div>
                <div className="text-white">npx serve dist -l 3000   # or python3 -m http.server 3000 --directory dist</div>
                <div className="text-[#6E7599] mt-2"># 3. Fire up Kobold.cpp, Ollama, or LM Studio and Strangelet Lab connects instantly!</div>
              </div>
            </div>

            {onOpenHubSettings && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => { onClose(); onOpenHubSettings(); }}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-2 transition-colors shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                >
                  <Sliders className="w-4 h-4" />
                  <span>Configure AI Hub Endpoints &amp; Personas</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#1E253E] bg-[#0A0D1B] flex items-center justify-between text-xs text-[#828AA8]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Dojo Status: Ready. All scrolls synchronized with local GGUF prompt injector.</span>
          </div>
          <button
            onClick={handleSaveAll}
            className="px-4 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 font-bold transition-colors"
          >
            Save &amp; Train Buddies
          </button>
        </div>
      </div>
    </div>
  );
};
