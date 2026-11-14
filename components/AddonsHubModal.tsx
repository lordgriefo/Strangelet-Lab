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
  category: 'ghost' | 'acestep' | 'yue2' | 'sfz' | 'fx_racks';
  vramTier?: '4-6gb' | '8-12gb' | '16gb+' | 'any';
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
  // === GHOST Models: Tier 1 (4GB - 6GB VRAM) ===
  {
    id: 'ghost-gemma-2b',
    name: 'Ghost Google Gemma 2 2B (Ultralight / 4GB-6GB VRAM)',
    category: 'ghost',
    vramTier: '4-6gb',
    badge: 'GOOGLE GEMMA',
    vram: '1.6 GB VRAM',
    fileSize: '1.6 GB',
    description: 'Ultra-compact Google Gemma 2 architecture. Extremely fast response time, perfect for 4GB–6GB laptops, providing sharp EQ checks and clean studio advice.',
    ollamaCommand: 'ollama run gemma2:2b',
    huggingFaceUrl: 'https://huggingface.co/google/gemma-2-2b-it-GGUF',
    recommendedHardware: 'Any 4GB-6GB GPU / Integrated Graphics',
    tags: ['Google Gemma 2', 'Ultralight', '2B IT', '4-6GB Tier']
  },
  {
    id: 'ghost-qwen-3b',
    name: 'Ghost Qwen 2.5 3B (Laptop / 4GB-6GB VRAM)',
    category: 'ghost',
    vramTier: '4-6gb',
    badge: 'LIGHTWEIGHT',
    vram: '2.1 GB VRAM',
    fileSize: '1.9 GB',
    description: 'Fast, low-latency audio mentor. Answers mixing questions, explains frequency clashes, and provides instant DSP heuristics without taxing laptop GPUs.',
    ollamaCommand: 'ollama run qwen2.5:3b',
    huggingFaceUrl: 'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF',
    recommendedHardware: 'GTX 1650 / RTX 3050 / 8GB Macs',
    tags: ['Offline GGUF', '4-bit Quant', 'Qwen 2.5', '4-6GB Tier']
  },
  {
    id: 'ghost-llama-3.2-3b',
    name: 'Ghost Llama 3.2 3B Instruct (Conversational / 4GB-6GB VRAM)',
    category: 'ghost',
    vramTier: '4-6gb',
    badge: 'STUDIO BUDDY',
    vram: '2.1 GB VRAM',
    fileSize: '2.0 GB',
    description: 'Affable and conversational studio partner. Answers production queries with warm encouragement and clean suggestions.',
    ollamaCommand: 'ollama run llama3.2:3b',
    huggingFaceUrl: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF',
    recommendedHardware: '4GB or 6GB Laptop GPU',
    tags: ['Meta Llama 3.2', '3B Compact', '4-6GB Tier']
  },

  // === GHOST Models: Tier 2 (8GB - 12GB VRAM) ===
  {
    id: 'ghost-hermes-3-8b',
    name: 'Ghost Hermes 3 8B (Nous Research / 8GB-12GB VRAM)',
    category: 'ghost',
    vramTier: '8-12gb',
    badge: 'STEERABLE GENIUS',
    vram: '4.8 GB VRAM',
    fileSize: '4.9 GB',
    description: 'Nous Research Hermes 3 built on Llama 3.1. Renowned for total instruction obedience, zero moralizing refusals, surgical DSP coding, and deeply nuanced studio personality.',
    ollamaCommand: 'ollama run hermes3:8b',
    huggingFaceUrl: 'https://huggingface.co/NousResearch/Hermes-3-Llama-3.1-8B-GGUF',
    recommendedHardware: 'RTX 3060 12GB / RTX 4060 / Apple M 16GB',
    tags: ['Nous Hermes 3', 'Zero Refusal', '8B GGUF', '8-12GB Tier']
  },
  {
    id: 'ghost-gemma-9b',
    name: 'Ghost Google Gemma 2 9B (High-Precision / 8GB-12GB VRAM)',
    category: 'ghost',
    vramTier: '8-12gb',
    badge: 'DEEP REASONING',
    vram: '5.8 GB VRAM',
    fileSize: '5.4 GB',
    description: 'High-capability Google Gemma 2 model with sliding window attention. Excels at generating complex Faust DSP audio code and surgical mix balancing.',
    ollamaCommand: 'ollama run gemma2:9b',
    huggingFaceUrl: 'https://huggingface.co/google/gemma-2-9b-it-GGUF',
    recommendedHardware: 'RTX 3060 12GB / RTX 4060 / 16GB Macs',
    tags: ['Google Gemma 2', 'Sliding Window', '9B IT', '8-12GB Tier']
  },
  {
    id: 'ghost-qwen-7b',
    name: 'Ghost Qwen 2.5 7B Studio Master (Balanced / 8GB-12GB VRAM)',
    category: 'ghost',
    vramTier: '8-12gb',
    badge: 'RECOMMENDED',
    vram: '4.2 GB VRAM',
    fileSize: '4.7 GB',
    description: 'The definitive Ghost experience. Excels at generating custom Faust DSP WebAssembly code, deep multi-stage Gold Path mastering advice, and eccentric studio lore.',
    ollamaCommand: 'ollama run qwen2.5:7b',
    huggingFaceUrl: 'https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF',
    recommendedHardware: 'RTX 3060 12GB / RTX 4060 / Apple M-series 16GB',
    tags: ['Studio Grade', 'DSP Code Generation', 'Qwen 2.5', '8-12GB Tier']
  },
  {
    id: 'ghost-llama-8b',
    name: 'Ghost Llama 3.1 8B Analog Sage (Analog Instinct / 8GB-12GB VRAM)',
    category: 'ghost',
    vramTier: '8-12gb',
    badge: 'ANALOG INSTINCT',
    vram: '4.8 GB VRAM',
    fileSize: '4.9 GB',
    description: 'Rich analog studio knowledge base. Deeply versed in vintage tape saturation curves, transistor biasing, Lee Scratch Perry techniques, and tube overdrive.',
    ollamaCommand: 'ollama run llama3.1:8b',
    huggingFaceUrl: 'https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF',
    recommendedHardware: 'RTX 3070 / RTX 4070 / 16GB VRAM',
    tags: ['Analog Tape Lore', 'Meta Llama 3.1', 'GGUF Q4_K_M', '8-12GB Tier']
  },

  // === GHOST Models: Tier 3 (16GB+ VRAM) ===
  {
    id: 'ghost-qwen-14b',
    name: 'Ghost Qwen 2.5 14B Pro Studio (High-VRAM / 16GB+)',
    category: 'ghost',
    vramTier: '16gb+',
    badge: 'PRO MASTER',
    vram: '8.8 GB VRAM',
    fileSize: '9.2 GB',
    description: 'Heavyweight reasoning model for complex DSP algorithms, physical modeling math, multi-track harmonic arrangement, and extensive session memory.',
    ollamaCommand: 'ollama run qwen2.5:14b',
    huggingFaceUrl: 'https://huggingface.co/Qwen/Qwen2.5-14B-Instruct-GGUF',
    recommendedHardware: 'RTX 4070 Ti / 4080 / 3090 / Mac M Max 32GB',
    tags: ['Extreme Precision', '14B Parameters', 'Q4_K_M', '16GB+ Tier']
  },
  {
    id: 'ghost-qwen-32b',
    name: 'Ghost Qwen 2.5 32B Studio Flagship (Titan VRAM / 24GB+)',
    category: 'ghost',
    vramTier: '16gb+',
    badge: 'FLAGSHIP TITAN',
    vram: '18.2 GB VRAM',
    fileSize: '19.4 GB',
    description: 'Flagship studio intelligence. Unrivaled multi-track orchestration, polyphonic harmonic counterpoint, and comprehensive song bed arrangement.',
    ollamaCommand: 'ollama run qwen2.5:32b',
    huggingFaceUrl: 'https://huggingface.co/Qwen/Qwen2.5-32B-Instruct-GGUF',
    recommendedHardware: 'RTX 3090 / RTX 4090 (24GB) or Apple M 48GB+',
    tags: ['32B Flagship', 'Full Studio Director', '16GB+ Tier']
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
  },

  // Open-Source Effects Racks & DSP Components
  {
    id: 'fx-tuna-js-suite',
    name: 'Tuna.js Modular Web Audio Stompbox Suite',
    category: 'fx_racks',
    badge: '14 STOMPBOXES',
    vram: '0 MB (Web Audio)',
    fileSize: '120 KB',
    description: '14 classic modular audio effects: Overdrive, Chorus, Phaser, Tremolo, WahWah, Bitcrusher, MoogFilter, Cabinet Sim, Compressor, Convolver, and PingPong Delay. Zero latency and built directly on native Web Audio.',
    huggingFaceUrl: 'https://github.com/TheCodeDestroyer/tuna',
    recommendedHardware: 'Zero GPU required (Runs in browser/Electron AudioWorklet)',
    tags: ['Tuna.js', 'Native Web Audio', 'MIT License', 'Zero Latency']
  },
  {
    id: 'fx-wam-chowdsp-suite',
    name: 'WAM 2.0 Web Audio Modules & ChowDSP Plugins',
    category: 'fx_racks',
    badge: 'WASM PLUGINS',
    vram: '0 MB (Wasm DSP)',
    fileSize: '4.5 MB',
    description: 'The modern W3C open WebAssembly standard for browser and desktop DAWs. Includes ChowTape analog tape modeler, ChowCentaur distortion, and Dexed Yamaha DX7 FM synth.',
    huggingFaceUrl: 'https://webaudiomodules.org/',
    recommendedHardware: 'Any modern CPU with WebAssembly support',
    tags: ['WAM 2.0', 'ChowDSP', 'Dexed FM', 'WebAssembly']
  },
  {
    id: 'fx-dattorro-freeverb',
    name: 'Dattorro Plate & Freeverb Algorithmic Network',
    category: 'fx_racks',
    badge: 'ZERO-LATENCY VERB',
    vram: '0 MB (Web Audio)',
    fileSize: '45 KB',
    description: 'Jon Dattorro’s 1997 classic plate reverb and Jezar’s Freeverb topology. Pure algorithmic all-pass diffusion loops that create rich, lush spatial reverb with zero RAM overhead.',
    huggingFaceUrl: 'https://github.com/nick-thompson/freeverb',
    recommendedHardware: 'Runs on any CPU / Web Audio thread',
    tags: ['Freeverb', 'Dattorro Plate', 'Diffuser Matrix', 'Zero RAM']
  },
  {
    id: 'fx-faust-toy-library',
    name: 'Faust DSP 200+ Math-Pure Algorithm Pack',
    category: 'fx_racks',
    badge: 'JIT COMPILER',
    vram: '0 MB (Wasm JIT)',
    fileSize: '2.1 MB',
    description: 'Over 200 physical modeling instruments, TB-303 squelch filters, vintage flangers, and nonlinear diode distortion algorithms compiled in real time directly to WebAudio Wasm.',
    huggingFaceUrl: 'https://faust.grame.fr/',
    recommendedHardware: 'Integrated into Strangelet Lab Faust Lab',
    tags: ['Faust DSP', 'GRAME', 'Live JIT', 'WebAssembly']
  },
  {
    id: 'fx-nam-guitarix',
    name: 'Neural Amp Modeler (NAM) & Guitarix WebAudio',
    category: 'fx_racks',
    badge: 'NEURAL AMP SIM',
    vram: '500 MB RAM',
    fileSize: '15 MB',
    description: 'WaveNet / LSTM neural network emulation of legendary tube amplifiers (Marshall JCM800, Fender Twin Reverb, Mesa Boogie Dual Rectifier) running in WebAssembly.',
    huggingFaceUrl: 'https://github.com/sdatkinson/neural-amp-modeler',
    recommendedHardware: 'Standard multi-core CPU',
    tags: ['Neural DSP', 'Tube Amp Sim', 'Wasm NAM', 'Guitarix']
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
  const [activeCategory, setActiveCategory] = useState<'ghost' | 'acestep' | 'yue2' | 'sfz' | 'fx_racks'>('ghost');
  const [ghostTierFilter, setGhostTierFilter] = useState<'all' | '4-6gb' | '8-12gb' | '16gb+'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyCommand = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    playLaserBeamSound('laser_select');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredItems = ADDONS_CATALOG.filter(item => {
    if (item.category !== activeCategory) return false;
    if (activeCategory === 'ghost' && ghostTierFilter !== 'all') {
      return item.vramTier === ghostTierFilter || item.vramTier === 'any';
    }
    return true;
  });

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
            { id: 'ghost', label: '👻 GHOST AI Brains', desc: 'Local GGUF Models (3B–32B)', color: '#FFD700' },
            { id: 'fx_racks', label: '🎛️ Open DSP & FX Racks', desc: 'Tuna.js, WAM, Freeverb, ChowDSP', color: '#A855F7' },
            { id: 'acestep', label: '⚡ Ace-Step 1.5 Loops', desc: 'Diffusion & ComfyUI Nodes', color: '#EC4899' },
            { id: 'yue2', label: '🎶 YuE2 Full Song', desc: 'End-to-End Dual-Track Audio', color: '#06B6D4' },
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
                {activeCategory === 'ghost' && 'Modular GHOST LLM Brains — Tiered VRAM Audio Intelligence'}
                {activeCategory === 'fx_racks' && 'Open-Source Effects Racks & DSP Components — Zero Latency Web Audio'}
                {activeCategory === 'acestep' && 'Ace-Step 1.5 Neural Audio Diffusion — Bar-Synced Loops'}
                {activeCategory === 'yue2' && 'YuE2 Full Song Generation — Dual-Track Vocal & Instrumental AI'}
                {activeCategory === 'sfz' && 'Zero-Latency Acoustic Instruments — SoundFonts & Drum Samples'}
              </span>
              <p className="text-[11px] text-[#8C98BC] leading-relaxed max-w-3xl">
                {activeCategory === 'ghost' && 'GHOST runs directly on your machine through Kobold.cpp, Ollama, or LM Studio. Models are quant-optimized into 3 clear tiers: 4-6GB (3B-4B), 8-12GB (7B-9B), and 16GB+ (14B-32B).'}
                {activeCategory === 'fx_racks' && 'Embed Tuna.js stompboxes (Chorus, Phaser, Bitcrusher, Overdrive), WAM 2.0 WebAssembly modules (ChowDSP, Dexed FM), Dattorro plate reverb, and Faust physical models directly into Strangelet Lab.'}
                {activeCategory === 'acestep' && 'Ace-Step 1.5 generates tempo-locked stems (drums, bass, leads) via diffusion. Connects directly to local ComfyUI on port 8188 for 1-click timeline imports.'}
                {activeCategory === 'yue2' && 'YuE2 generates complete full-length songs with separate vocal and backing tracks. Use these weights for expansive lyric-to-song workflows.'}
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

          {/* VRAM Tier Sub-Filter Bar (for GHOST Models) */}
          {activeCategory === 'ghost' && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#090D1C] border border-[#1A233C] text-[10px] font-mono flex-wrap">
              <span className="text-[#64748B] font-bold uppercase text-[9px] mr-1">Filter by GPU VRAM:</span>
              <button
                onClick={() => setGhostTierFilter('all')}
                className={`px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                  ghostTierFilter === 'all'
                    ? 'bg-amber-400 text-black border-amber-300 font-bold shadow-sm'
                    : 'bg-[#101626] border-[#222E4E] text-[#8E9BBE] hover:text-white'
                }`}
              >
                All Models ({ADDONS_CATALOG.filter(i => i.category === 'ghost').length})
              </button>
              <button
                onClick={() => setGhostTierFilter('4-6gb')}
                className={`px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                  ghostTierFilter === '4-6gb'
                    ? 'bg-amber-400 text-black border-amber-300 font-bold shadow-sm'
                    : 'bg-[#101626] border-[#222E4E] text-[#8E9BBE] hover:text-white'
                }`}
              >
                4GB–6GB Tier (3B–4B)
              </button>
              <button
                onClick={() => setGhostTierFilter('8-12gb')}
                className={`px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                  ghostTierFilter === '8-12gb'
                    ? 'bg-cyan-400 text-black border-cyan-300 font-bold shadow-sm'
                    : 'bg-[#101626] border-[#222E4E] text-[#8E9BBE] hover:text-white'
                }`}
              >
                8GB–12GB Tier (7B–9B)
              </button>
              <button
                onClick={() => setGhostTierFilter('16gb+')}
                className={`px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                  ghostTierFilter === '16gb+'
                    ? 'bg-emerald-400 text-black border-emerald-300 font-bold shadow-sm'
                    : 'bg-[#101626] border-[#222E4E] text-[#8E9BBE] hover:text-white'
                }`}
              >
                16GB+ Pro Tier (14B–32B)
              </button>
            </div>
          )}

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
