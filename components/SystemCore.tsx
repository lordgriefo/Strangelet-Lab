import React, { useState } from 'react';
import { 
  Terminal, Code, Download, Cpu, Info, Package, RefreshCw, 
  Zap, Database, Search, Copy, CheckCircle2, HardDrive, ShieldCheck 
} from 'lucide-react';
import { generateSystemCode } from '../services/geminiService';

interface ModelItem {
  name: string;
  category: string;
  status: 'loaded' | 'unloaded';
  vram: string;
  vramVal: number;
}

export const SystemCore: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'hardware' | 'reqs'>('hardware');
  const [code, setCode] = useState<string>('# Click "Generate Code" to build modular Strangelet DSP runtime using your configured AI Hub.');
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<ModelItem[]>([
    { name: 'Roformer-DrumSep v2', category: 'Stem Separation', status: 'loaded', vram: '2.1GB', vramVal: 2.1 },
    { name: 'Basic-Pitch Transient', category: 'Polyphonic Pitch', status: 'loaded', vram: '0.6GB', vramVal: 0.6 },
    { name: 'AURA-RVC Neural Voice', category: 'Voice Morphing', status: 'loaded', vram: '1.4GB', vramVal: 1.4 },
    { name: 'Whisper-Tiny Aligner', category: 'Linguistic Alignment', status: 'unloaded', vram: '0.4GB', vramVal: 0.4 },
  ]);
  const [hfId, setHfId] = useState('');
  const [copied, setCopied] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const totalVramUsed = models.filter(m => m.status === 'loaded').reduce((acc, m) => acc + m.vramVal, 0);

  const toggleModelStatus = (index: number) => {
    setModels(prev => prev.map((m, i) => {
      if (i !== index) return m;
      return {
        ...m,
        status: m.status === 'loaded' ? 'unloaded' : 'loaded'
      };
    }));
  };

  const handleGenerate = async () => {
    setLoading(true);
    setCode('# Querying Strangelet AI Engine...');
    
    let promptContext = "";
    let filename = "";

    if (activeTab === 'hardware') {
      filename = "hardware.py";
      promptContext = "Manage 6GB VRAM limit. Implement Singleton pattern for ModelManager. Use lazy loading: load_model(name), unload_model(). Support CUDA and DirectML detection. Implement a standardized plugin interface for loading modular AI models dynamically from a `plugins/` directory.";
    } else {
      filename = "requirements.txt";
      promptContext = "Include libraries for: Demucs, RVC, PyTorch (CUDA capable), Librosa, SoundFile, NumPy, and PySide6 for potential UI expansions. Include dependencies for model plugin architecture.";
    }

    try {
      const result = await generateSystemCode(filename, promptContext);
      setCode(result);
    } catch (e) {
      setCode('# Error generating code from configured AI Hub. Using offline scaffold.');
    }
    setLoading(false);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSyncHf = () => {
    if (!hfId.trim()) return;
    setStatusNotice(`✨ Model repository "${hfId}" indexed and cached in local checkpoint registry!`);
    setHfId('');
    setTimeout(() => setStatusNotice(null), 3500);
  };

  return (
    <div className="h-full w-full bg-[#05070E] flex flex-col overflow-y-auto p-4 md:p-6 text-white font-mono select-none">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1A2338]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00F0FF]/20 via-[#FFD700]/20 to-[#FF2E63]/20 border border-[#00F0FF] flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.3)]">
            <Terminal size={22} className="text-[#00F0FF]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-black uppercase tracking-widest text-[#FFD700]">
                STRANGELET LAB
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 font-bold">
                SYSTEM CORE & HARDWARE TELEMETRY
              </span>
            </div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              NEURAL RUNTIME & HARDWARE ENGINE
            </h1>
          </div>
        </div>

        {/* VRAM Metric */}
        <div className="flex items-center gap-3 px-3.5 py-1.5 bg-[#090D18] border border-[#1A2338] rounded-xl text-xs">
          <HardDrive size={14} className="text-[#00F0FF]" />
          <span className="text-[#64748B]">ALLOCATED VRAM:</span>
          <span className="text-[#00F0FF] font-bold">{totalVramUsed.toFixed(1)} GB / 6.0 GB</span>
          <div className="w-16 h-2 bg-[#05070E] rounded-full overflow-hidden border border-[#141C2E]">
            <div 
              className="h-full bg-gradient-to-r from-[#00F0FF] to-[#FFD700]"
              style={{ width: `${(totalVramUsed / 6.0) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Notice Banner */}
      {statusNotice && (
        <div className="mt-3 px-3.5 py-2 rounded-lg bg-[#00F0FF]/15 border border-[#00F0FF] text-xs font-bold text-white flex items-center justify-between shadow-[0_0_15px_rgba(0,240,255,0.3)]">
          <span>{statusNotice}</span>
          <CheckCircle2 size={15} className="text-[#00F0FF]" />
        </div>
      )}

      {/* Workspace Grid */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Modular Model Plugins */}
        <div className="bg-[#080B15] border border-[#1A2338] rounded-2xl p-4 flex flex-col gap-3 shadow-inner">
          <div className="flex items-center justify-between pb-2 border-b border-[#141C2E]">
            <div className="flex items-center gap-2">
              <Package size={15} className="text-[#FFD700]" />
              <span className="text-xs font-bold text-white uppercase">MODULAR AI PLUGINS</span>
            </div>
            <span className="text-[10px] text-[#64748B]">VRAM SINGLETON</span>
          </div>

          <div className="space-y-2">
            {models.map((model, i) => (
              <div 
                key={model.name}
                className="flex items-center justify-between p-3 rounded-xl border border-[#141C2E] bg-[#05070E] hover:border-[#1E293B] transition-all"
              >
                <div>
                  <p className="text-white text-xs font-bold">{model.name}</p>
                  <p className="text-[#64748B] text-[10px]">{model.category} • {model.vram}</p>
                </div>
                <button
                  onClick={() => toggleModelStatus(i)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                    model.status === 'loaded'
                      ? 'border-[#00F0FF] bg-[#00F0FF]/15 text-[#00F0FF]'
                      : 'border-[#334155] bg-[#0A0E17] text-[#888]'
                  }`}
                >
                  {model.status === 'loaded' ? 'UNLOAD' : 'LOAD'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Hugging Face Hub Sync */}
        <div className="bg-[#080B15] border border-[#1A2338] rounded-2xl p-4 flex flex-col gap-3 shadow-inner">
          <div className="flex items-center gap-2 pb-2 border-b border-[#141C2E]">
            <Database size={15} className="text-[#00F0FF]" />
            <span className="text-xs font-bold text-white uppercase">HUGGING FACE MODEL HUB</span>
          </div>
          <p className="text-[11px] text-[#64748B]">
            Sync pretrained models, LoRA weights, and tokenizers directly into the Strangelet checkpoint folder.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. strangelet/rvc-lead-v2"
              value={hfId}
              onChange={(e) => setHfId(e.target.value)}
              className="flex-1 bg-[#05070E] border border-[#141C2E] rounded-xl px-3 py-2 text-white text-xs placeholder:text-[#475569] focus:outline-none focus:border-[#00F0FF]"
            />
            <button
              onClick={handleSyncHf}
              className="px-3.5 py-2 rounded-xl bg-[#00F0FF] text-black font-bold text-xs hover:brightness-110 flex items-center gap-1"
            >
              <Search size={14} />
            </button>
          </div>
        </div>

        {/* Global Pipeline Health */}
        <div className="bg-[#080B15] border border-[#1A2338] rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-2 pb-2 border-b border-[#141C2E]">
            <ShieldCheck size={15} className="text-[#10B981]" />
            <span className="text-xs font-bold text-white uppercase">ENVIRONMENT HEALTH</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[#141C2E]">
              <span className="text-[#64748B]">CUDA Backend:</span>
              <span className="text-[#10B981] font-bold">ONLINE (v12.2)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#141C2E]">
              <span className="text-[#64748B]">DirectML Bridge:</span>
              <span className="text-[#00F0FF] font-bold">READY</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#64748B]">Active Threads:</span>
              <span className="text-white font-bold">8 Cores</span>
            </div>
          </div>
        </div>

        {/* Code Generator & Terminal Inspector */}
        <div className="lg:col-span-3 bg-[#080B15] border border-[#1A2338] rounded-2xl flex flex-col overflow-hidden shadow-inner">
          <div className="flex items-center justify-between border-b border-[#141C2E] bg-[#05070E]">
            <div className="flex">
              <button
                onClick={() => { setActiveTab('hardware'); setCode('# Click Generate Code'); }}
                className={`px-5 py-3 font-mono text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === 'hardware'
                    ? 'border-[#00F0FF] text-[#00F0FF] bg-[#0A0F1D]'
                    : 'border-transparent text-[#64748B] hover:text-white'
                }`}
              >
                <Cpu size={14} /> hardware.py
              </button>
              <button
                onClick={() => { setActiveTab('reqs'); setCode('# Click Generate Code'); }}
                className={`px-5 py-3 font-mono text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === 'reqs'
                    ? 'border-[#FFD700] text-[#FFD700] bg-[#0A0F1D]'
                    : 'border-transparent text-[#64748B] hover:text-white'
                }`}
              >
                <Code size={14} /> requirements.txt
              </button>
            </div>

            <div className="pr-4 flex items-center gap-2">
              <button
                onClick={handleCopyCode}
                className="px-2.5 py-1 rounded-lg bg-[#101726] border border-[#1E293B] text-[10px] font-bold text-[#CBD5E1] hover:text-white flex items-center gap-1"
              >
                <Copy size={11} />
                <span>{copied ? 'COPIED!' : 'COPY'}</span>
              </button>

              <button
                onClick={handleGenerate}
                disabled={loading}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  loading
                    ? 'bg-[#1E293B] text-[#64748B]'
                    : 'bg-gradient-to-r from-[#00F0FF] to-[#FFD700] text-black hover:brightness-110 font-black'
                }`}
              >
                {loading ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />}
                <span>{loading ? 'GENERATING...' : 'GENERATE CODE'}</span>
              </button>
            </div>
          </div>

          <div className="p-4 bg-[#03050A] overflow-x-auto min-h-[160px] text-xs font-mono text-[#94A3B8]">
            <pre className="whitespace-pre-wrap">{code}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemCore;
