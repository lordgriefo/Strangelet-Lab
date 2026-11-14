import React, { useState } from 'react';
import { 
  X, 
  Download, 
  ExternalLink, 
  Copy, 
  Check, 
  Sparkles, 
  Cpu, 
  Zap, 
  HardDrive, 
  Layers, 
  Bot, 
  Music, 
  Disc,
  FolderArchive,
  ArrowRight
} from 'lucide-react';
import { playLaserBeamSound, playColliderInjectionSound } from '../lib/laserSound';

interface AddonItem {
  id: string;
  name: string;
  category: 'ghost' | 'acestep' | 'yue2' | 'sfz';
  badge: string;
  vram: string;
  fileSize: string;
  description: string;
  downloadUrl?: string;
  ollamaCommand?: string;
  huggingFaceUrl?: string;
  recommendedHardware: string;
  tags: string[];
}

export const ADDONS_CATALOG: AddonItem[] = [
  // GHOST Models
  {
    id: 'ghost-qwen-3b',
    name: 'Ghost Qwen 2.5 3B (Laptop / 4GB-6GB VRAM)',
    category: 'ghost',
    badge: 'LIGHTWEIGHT',
    vram: '2.1 GB VRAM',
    fileSize: '1.9 GB',
    description: 'Fast, low-latency audio mentor. Answers mixing questions, explains frequency clashes, and provides instant DSP heuristics without taxing laptop GPUs.',
    ollamaCommand: 'ollama run qwen2.5:3b',
    huggingFaceUrl: 'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF',
    recommendedHardware: 'GTX 1650 / RTX 3050 / 8GB Macs',
    tags: ['Offline GGUF', '4-bit Quant', 'Qwen 2.5']
  },
  {
    id: 'ghost-qwen-7b',
    name: 'Ghost Qwen 2.5 7B Studio Master (Balanced / 8GB VRAM)',
    category: 'ghost',
    badge: 'RECOMMENDED',
    vram: '4.2 GB VRAM',
    fileSize: '4.7 GB',
    description: 'The definitive Ghost experience. Excels at generating custom Faust DSP WebAssembly code, deep multi-stage Gold Path mastering advice, and eccentric studio lore.',
    ollamaCommand: 'ollama run qwen2.5:7b',
    huggingFaceUrl: 'https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF',
    recommendedHardware: 'RTX 3060 12GB / RTX 4060 / Apple M-series 16GB',
    tags: ['Studio Grade', 'DSP Code Generation', 'Qwen 2.5']
  },
  {
    id: 'ghost-llama-8b',
    name: 'Ghost Llama 3.1 8B Analog Sage (Analog Instinct / 8GB VRAM)',
    category: 'ghost',
    badge: 'ANALOG INSTINCT',
    vram: '4.8 GB VRAM',
    fileSize: '4.9 GB',
    description: 'Rich analog studio knowledge base. Deeply versed in vintage tape saturation curves, transistor biasing, Lee Scratch Perry techniques, and tube overdrive.',
    ollamaCommand: 'ollama run llama3.1:8b',
    huggingFaceUrl: 'https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF',
    recommendedHardware: 'RTX 3070 / RTX 4070 / 16GB VRAM',
    tags: ['Analog Tape Lore', 'Meta Llama 3.1', 'GGUF Q4_K_M']
  },
  {
    id: 'ghost-qwen-14b',
    name: 'Ghost Qwen 2.5 14B Pro Studio (High-VRAM / 16GB+)',
    category: 'ghost',
    badge: 'PRO MASTER',
    vram: '8.8 GB VRAM',
    fileSize: '9.2 GB',
    description: 'Heavyweight reasoning model for complex DSP algorithms, physical modeling math, multi-track harmonic arrangement, and extensive session memory.',
    ollamaCommand: 'ollama run qwen2.5:14b',
    huggingFaceUrl: 'https://huggingface.co/Qwen/Qwen2.5-14B-Instruct-GGUF',
    recommendedHardware: 'RTX 4070 Ti / 4080 / 3090 / Mac M Max 32GB',
    tags: ['Extreme Precision', '14B Parameters', 'Q4_K_M']
  },

  // Ace-Step Models
  {
    id: 'acestep-llm-1.7b',
    name: 'Ace-Step 1.5 5Hz LM Backbone (1.7B GGUF)',
    category: 'acestep',
    badge: 'CORE DIFFUSION',
    vram: '2.4 GB VRAM',
    fileSize: '1.8 GB',
    description: 'Musical language model backbone for Ace-Step 1.5. Interprets style prompts, key centers, chord progressions, and bar lengths for loop diffusion.',
    huggingFaceUrl: 'https://huggingface.co/Comfy-Org/AceStep_1.5_GGUF',
    recommendedHardware: '6GB+ GPU with ComfyUI or Kobold.cpp',
    tags: ['Diffusion LM', '1.7B GGUF', 'Bar-Synced']
  },
  {
    id: 'acestep-dit-turbo',
    name: 'Ace-Step 1.5 Turbo Shift DiT Diffusion Model',
    category: 'acestep',
    badge: 'FAST INFERENCE',
    vram: '3.2 GB VRAM',
    fileSize: '3.4 GB',
    description: 'Turbo-distilled audio DiT (Diffusion Transformer) engine. Synthesizes pristine 44.1kHz stereo stems (drums, bass, leads, pads) in just 8 to 16 steps.',
    huggingFaceUrl: 'https://huggingface.co/Comfy-Org/AceStep_1.5_GGUF',
    recommendedHardware: 'RTX 3060 / 4060 or higher',
    tags: ['Audio DiT', 'Turbo 8-Step', 'Stereo 44.1kHz']
  },
  {
    id: 'acestep-comfyui-workflow',
    name: 'Ace-Step Strangelet ComfyUI Blueprint (.json)',
    category: 'acestep',
    badge: 'WORKFLOW TEMPLATE',
    vram: '0 MB',
    fileSize: '45 KB',
    description: 'Pre-configured drag-and-drop ComfyUI workflow template. Fully mapped to Strangelet Lab API on port 8188 for 1-click generation straight into timeline lanes.',
    huggingFaceUrl: 'https://github.com/lordgriefo/Strangelet-Lab/releases',
    recommendedHardware: 'Any system running ComfyUI',
    tags: ['ComfyUI Node', 'Port 8188', '1-Click API']
  },

  // YuE / Yue2 Full Song Models
  {
    id: 'yue-7b-full-song',
    name: 'YuE 7B Dual-Track Full Song Diffusion Generator',
    category: 'yue2',
    badge: 'FULL ARRANGEMENT',
    vram: '7.8 GB VRAM',
    fileSize: '8.4 GB',
    description: 'End-to-end full song generator. Generates complete verse-chorus arrangements with separated vocal and instrumental tracks up to 4 minutes.',
    huggingFaceUrl: 'https://huggingface.co/multimodalart/YuE-GPT',
    recommendedHardware: '12GB - 16GB GPU (RTX 3060 12GB / 4070 / 3090)',
    tags: ['Dual-Track', 'Full Song', '7B GPT']
  },
  {
    id: 'yue2-vocoder-pack',
    name: 'YuE xCodec Neural Audio Decoder & Vocoder',
    category: 'yue2',
    badge: 'HI-RES VOCODER',
    vram: '1.2 GB VRAM',
    fileSize: '1.1 GB',
    description: 'High-fidelity acoustic vocoder reconstructing neural tokens into 48kHz uncompressed audio with phase preservation.',
    huggingFaceUrl: 'https://huggingface.co/HKUST-Audio/xcodec_mini_infer',
    recommendedHardware: 'Any CUDA / DirectML GPU',
    tags: ['Codec Decoder', '48kHz Stereo', 'Phase Locked']
  },

  // SFZ & SoundFont Packs
  {
    id: 'sfz-grand-piano',
    name: 'Concert Grand Piano SFZ Multi-Velocity Pack',
    category: 'sfz',
    badge: 'ACOUSTIC',
    vram: '0 MB (Web Audio)',
    fileSize: '42 MB',
    description: 'Multi-sampled concert grand piano with 4 dynamic velocity layers, hammer release noise, and sympathetic string resonance.',
    downloadUrl: 'https://github.com/lordgriefo/Strangelet-Lab/releases',
    recommendedHardware: 'Zero GPU required (Runs in RAM)',
    tags: ['SFZ Format', 'Multi-Velocity', 'Zero Latency']
  },
  {
    id: 'sfz-rhodes-mk1',
    name: '1973 Rhodes Mark I Vintage Electric Piano',
    category: 'sfz',
    badge: 'WARM TINES',
    vram: '0 MB (Web Audio)',
    fileSize: '36 MB',
    description: 'Warm electromagnetic tine piano sampled through vintage tube preamps with stereo chorus and bell overtone bloom.',
    downloadUrl: 'https://github.com/lordgriefo/Strangelet-Lab/releases',
    recommendedHardware: 'Zero GPU required',
    tags: ['Vintage Keys', 'Tube Preamp', 'SFZ']
  },
  {
    id: 'sfz-roland-808-909',
    name: 'Roland TR-808 & TR-909 Analog Master Drum Kit',
    category: 'sfz',
    badge: 'DRUM SAMPLES',
    vram: '0 MB (Web Audio)',
    fileSize: '18 MB',
    description: 'Pure analog kicks, squelch snares, rimshots, open/closed hats, and claps recorded through Neve console channels for Drum Transient Replacement.',
    downloadUrl: 'https://github.com/lordgriefo/Strangelet-Lab/releases',
    recommendedHardware: 'Zero GPU required',
    tags: ['Drum Replacement', '808 Sub', '909 Punch']
  }
];

interface AddonsHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenResourceManager?: () => void;
}

export const AddonsHubModal: React.FC<AddonsHubModalProps> = ({
  isOpen,
  onClose,
  onOpenResourceManager
}) => {
  const [activeCategory, setActiveCategory] = useState<'ghost' | 'acestep' | 'yue2' | 'sfz'>('ghost');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyCommand = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    playLaserBeamSound('laser_select');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredItems = ADDONS_CATALOG.filter(item => item.category === activeCategory);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in font-mono select-none">
      <div 
        className="w-full max-w-5xl rounded-2xl bg-[#090C16] border border-[#232A44] shadow-[0_0_60px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#1E253D] bg-gradient-to-r from-[#0F1426] via-[#12182D] to-[#0A0D1A] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 via-cyan-500/20 to-purple-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <FolderArchive className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white tracking-wide uppercase">
                  Strangelet Add-ons & Model Download Hub
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/50 text-amber-300 font-bold">
                  v2.5.0 EXPANSIONS
                </span>
              </div>
              <p className="text-[11px] text-[#7E88AA]">
                Download local offline AI models, neural audio diffusion weights, and high-res instrument sound packs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onOpenResourceManager && (
              <button
                onClick={() => {
                  onClose();
                  onOpenResourceManager();
                }}
                className="px-3 py-1.5 rounded-xl bg-[#141B2D] border border-[#283556] hover:border-cyan-400 text-cyan-300 text-xs font-bold transition-all flex items-center gap-1.5"
                title="View active VRAM budget and hardware tier"
              >
                <Cpu size={13} />
                <span className="hidden sm:inline">VRAM Manager</span>
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 rounded-xl text-[#8E95B8] hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Category Navigation Bar */}
        <div className="px-6 py-2.5 bg-[#0C101E] border-b border-[#1A2035] flex items-center gap-2 overflow-x-auto flex-shrink-0">
          {[
            { id: 'ghost', label: '👻 GHOST AI Brains', desc: 'Local GGUF Models (3B–14B)', color: '#FFD700' },
            { id: 'acestep', label: '⚡ Ace-Step 1.5 Loops', desc: 'Diffusion & ComfyUI Nodes', color: '#EC4899' },
            { id: 'yue2', label: '🎶 YuE 2.0 Full Song', desc: 'End-to-End Dual-Track Audio', color: '#06B6D4' },
            { id: 'sfz', label: '🎹 SFZ & Sample Packs', desc: 'Grand Piano, Rhodes, 808/909', color: '#10B981' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveCategory(tab.id as any);
                playLaserBeamSound('laser_select');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                activeCategory === tab.id
                  ? 'bg-[#182035] border-amber-400/80 text-white shadow-[0_0_15px_rgba(255,215,0,0.2)]'
                  : 'bg-[#080B15] border-[#1C2338] text-[#7E88AA] hover:text-white hover:border-[#2C3756]'
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] opacity-70 hidden sm:inline">({tab.desc})</span>
            </button>
          ))}
        </div>

        {/* Content Grid */}
        <div className="flex-1 p-6 overflow-y-auto bg-[#070913] space-y-4 custom-scrollbar">
          
          {/* Category Banner Explainer */}
          <div className="p-4 rounded-xl bg-[#0E1324] border border-[#232D4C] flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                <Sparkles size={14} className="text-amber-400" />
                {activeCategory === 'ghost' && 'Modular GHOST LLM Brains — Air-Gapped Audio Intelligence'}
                {activeCategory === 'acestep' && 'Ace-Step 1.5 Neural Audio Diffusion — Bar-Synced Loops'}
                {activeCategory === 'yue2' && 'YuE Full Song Generation — Dual-Track Vocal & Instrumental AI'}
                {activeCategory === 'sfz' && 'Zero-Latency Acoustic Instruments — SoundFonts & Drum Samples'}
              </span>
              <p className="text-[11px] text-[#8C98BC] leading-relaxed max-w-3xl">
                {activeCategory === 'ghost' && 'GHOST runs directly on your machine through Kobold.cpp, Ollama, or LM Studio. Models are quant-optimized to fit 4GB, 6GB, 8GB, or 16GB VRAM budgets.'}
                {activeCategory === 'acestep' && 'Ace-Step 1.5 generates tempo-locked stems (drums, bass, leads) via diffusion. Connects directly to local ComfyUI on port 8188 for 1-click timeline imports.'}
                {activeCategory === 'yue2' && 'YuE generates complete full-length songs with separate vocal and backing tracks. Use these weights for expansive lyric-to-song workflows.'}
                {activeCategory === 'sfz' && 'High-fidelity sample packs for Basic Pitch MIDI replacement. Drop them in to instantly replace synthetic sounds with vintage acoustic gear.'}
              </p>
            </div>

            {activeCategory === 'ghost' && (
              <div className="flex items-center gap-2 text-xs">
                <a 
                  href="https://koboldai.org/cpp" 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-300 hover:bg-amber-500/20 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <ExternalLink size={12} />
                  <span>Get Kobold.cpp</span>
                </a>
                <a 
                  href="https://ollama.com" 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <ExternalLink size={12} />
                  <span>Get Ollama</span>
                </a>
              </div>
            )}
          </div>

          {/* Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map(item => (
              <div 
                key={item.id}
                className="bg-[#0B0F1E] border border-[#1E2742] hover:border-amber-400/50 rounded-2xl p-5 flex flex-col justify-between transition-all group shadow-lg space-y-4"
              >
                <div className="space-y-2.5">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300">
                      {item.badge}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <span className="text-cyan-300 font-bold flex items-center gap-1">
                        <Cpu size={11} />
                        {item.vram}
                      </span>
                      <span className="text-[#64748B]">•</span>
                      <span className="text-emerald-300 font-bold flex items-center gap-1">
                        <HardDrive size={11} />
                        {item.fileSize}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-xs text-[#8E99BD] mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Target Hardware */}
                  <div className="text-[11px] text-[#637299] flex items-center gap-1.5">
                    <span className="font-bold text-[#8694B8]">Hardware:</span>
                    <span>{item.recommendedHardware}</span>
                  </div>

                  {/* Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {item.tags.map(tag => (
                      <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full bg-[#13192B] border border-[#232F50] text-[#9AA5C7]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-3 border-t border-[#172037] flex flex-col gap-2">
                  {/* Ollama 1-Click Copy Command */}
                  {item.ollamaCommand && (
                    <div className="flex items-center justify-between bg-black/60 border border-[#202B48] rounded-xl px-3 py-2 text-xs">
                      <code className="text-amber-300 text-[11px] truncate select-all">
                        {item.ollamaCommand}
                      </code>
                      <button
                        onClick={() => handleCopyCommand(item.id, item.ollamaCommand!)}
                        className="ml-2 px-2.5 py-1 rounded-lg bg-[#18233C] hover:bg-amber-400 hover:text-black text-amber-300 text-[10px] font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                        title="Copy terminal command to clipboard"
                      >
                        {copiedId === item.id ? <Check size={11} /> : <Copy size={11} />}
                        <span>{copiedId === item.id ? 'COPIED!' : 'COPY'}</span>
                      </button>
                    </div>
                  )}

                  {/* Hugging Face / Download Links */}
                  <div className="flex items-center gap-2">
                    {item.huggingFaceUrl && (
                      <a
                        href={item.huggingFaceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-black font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                      >
                        <ExternalLink size={13} />
                        <span>Hugging Face GGUF</span>
                      </a>
                    )}
                    {item.downloadUrl && (
                      <a
                        href={item.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-black font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                      >
                        <Download size={13} />
                        <span>Download Instrument Pack</span>
                      </a>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-[#080B15] border-t border-[#1C2338] flex items-center justify-between text-xs text-[#7E88AA] flex-wrap gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Strangelet Add-on Catalog • Free, Open-Source & Air-Gapped Models</span>
          </div>
          <button 
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#141B2D] border border-[#253254] hover:border-amber-400 text-white font-bold transition-all cursor-pointer"
          >
            Close Hub
          </button>
        </div>

      </div>
    </div>
  );
};

export default AddonsHubModal;
