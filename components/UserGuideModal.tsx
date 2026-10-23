import React, { useState } from 'react';
import { 
  X, 
  BookOpen, 
  Search, 
  Sliders, 
  Atom, 
  ShieldCheck, 
  Sparkles, 
  Cpu, 
  Keyboard, 
  Terminal, 
  Flame, 
  Split, 
  Zap, 
  Layers, 
  Check, 
  Copy, 
  ExternalLink,
  ChevronRight, 
  FileText,
  Printer,
  Download,
  Workflow,
  Music,
  Bot
} from 'lucide-react';
import { playLaserBeamSound, playColliderInjectionSound } from '../lib/laserSound';
import { generateOfflineManualPdf } from '../services/pdfManualGenerator';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDojo?: () => void;
  onOpenAiHub?: () => void;
}

type GuideSection = 
  | 'overview' 
  | 'collider' 
  | 'gold_path' 
  | 'dojo_ai' 
  | 'hub_setup' 
  | 'beam_splitter' 
  | 'suno_deglaze' 
  | 'faust_dsp' 
  | 'basic_pitch' 
  | 'shortcuts'
  | 'buddy_duo'
  | 'workflows'
  | 'sfz_library'
  | 'lora_library';

export const UserGuideModal: React.FC<UserGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenDojo,
  onOpenAiHub
}) => {
  const [activeSection, setActiveSection] = useState<GuideSection>('overview');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfProgress, setPdfProgress] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    setPdfProgress('Initializing engine (10%)...');
    playColliderInjectionSound();
    try {
      const blob = await generateOfflineManualPdf({
        version: 'v2.4.0',
        onProgress: (percent, status) => {
          setPdfProgress(`${status} (${percent}%)`);
        }
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Strangelet_Lab_User_Field_Manual_v2.4.0.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      playLaserBeamSound('laser_curve');
      setToastMsg('Downloaded official offline PDF manual (Strangelet_Lab_User_Field_Manual_v2.4.0.pdf)');
      setTimeout(() => setToastMsg(null), 4500);
    } catch (err: any) {
      setToastMsg(`PDF Generation Error: ${err?.message || 'Failed to compile PDF'}`);
      setTimeout(() => setToastMsg(null), 4500);
    } finally {
      setIsGeneratingPdf(false);
      setPdfProgress('');
    }
  };

  const handlePrintPdf = () => {
    playColliderInjectionSound();
    // Creates a print-optimized air-gapped window for instant browser Print-to-PDF
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Strangelet Lab — Official User Field Manual (v2.4.0)</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #111; max-width: 850px; margin: 40px auto; padding: 0 20px; }
    h1 { font-size: 26px; border-bottom: 2px solid #333; padding-bottom: 8px; margin-top: 0; }
    h2 { font-size: 20px; color: #0284c7; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 32px; }
    h3 { font-size: 16px; color: #334155; margin-top: 20px; }
    code, pre { font-family: "Courier New", Courier, monospace; background: #f1f5f9; padding: 2px 5px; border-radius: 4px; font-size: 13px; }
    pre { padding: 12px; overflow-x: auto; border: 1px solid #cbd5e1; }
    .badge { display: inline-block; padding: 2px 8px; font-size: 11px; font-weight: bold; background: #e0f2fe; color: #0369a1; border-radius: 12px; margin-bottom: 12px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background: #f1f5f9; }
    @media print { body { margin: 15mm; } .no-print { display: none; } }
  </style>
</head>
<body>
  <h1>Strangelet Lab — Official User Field Manual</h1>
  <div class="badge">v2.4.0 AIR-GAPPED OFFLINE PRINT EDITION</div>
  <p><em>The ultimate offline guide for quantum synthesis, Faust DSP, mastering, the Ghost & Quinn duo, and Ace-Step diffusion.</em></p>
  
  <h2>Table of Contents</h2>
  <ul>
    <li>1. Architecture & Global Signal Flow</li>
    <li>2. Large Sonic Collider (LSC) Quantum Physics Engine</li>
    <li>3. Gold Path 6-Stage Mastering Suite & A/B Reference</li>
    <li>4. Software Dojo & AI Training Scrolls</li>
    <li>5. Local AI Hub Setup (Kobold.cpp / Ollama / LM Studio)</li>
    <li>6. Beam Splitter Multiband Crossovers</li>
    <li>7. Suno AI De-Glaze & Audio Restoration</li>
    <li>8. Faust WebAudio Real-Time DSP Compiler</li>
    <li>9. Spotify Basic Pitch Polyphonic Audio-to-MIDI</li>
    <li>10. Master Keyboard Shortcuts</li>
    <li>11. The Buddy Duo: Ghost (Llama 3.1) & Quinn (Qwen 3) Co-Op Mode</li>
    <li>12. Guided Quantum Workflows & Production Templates</li>
    <li>13. SFZ Open Library & Community Sample Exchange</li>
    <li>14. Ace-Step 1.5 LoRA Lending Library</li>
  </ul>

  <h2>11. The Buddy Duo: Ghost & Quinn Tag-Team</h2>
  <div class="card">
    <strong>Ghost (Male • Llama 3.1 8B):</strong> The literal Ghost in the Machine. Analog tube sage with legendary studio lore (Lee Scratch Perry tape ceremonies, Prince LinnDrum detuning, Kevin Shields guitar walls, Trevor Horn compression). Soulful, warm, and eccentric.<br/><br/>
    <strong>Quinn (Female • Qwen 3 / 2.5 7B):</strong> Precision DSP Architect. High-order mathematical spectral frequency analysis, Linkwitz-Riley crossovers, Faust JIT compiler, and 8.5kHz de-sheen surgery.<br/><br/>
    <strong>Duo Team Dynamic:</strong> Both buddies converse simultaneously as a tag-team. Ghost delivers analog vibe; Quinn calculates the exact mathematical parameters. Their souls and XP persist independently across all model swaps (6GB laptop to 16GB rig).
  </div>

  <h2>12. The Quantum Alchemist Pipeline</h2>
  <div class="card">
    <ol>
      <li><strong>Prompt Genesis in LSC:</strong> Accelerate Hadron beam to 8.4 TeV and collide sonic concepts.</li>
      <li><strong>Ace-Step 1.5 Neural Diffusion:</strong> Inject collision prompt into Ace-Step, borrow an active LoRA, and generate bar-synced stems.</li>
      <li><strong>Mixer Ingestion:</strong> Route stems with 1 click to the multitrack console with pre-calibrated -14 LUFS headroom.</li>
      <li><strong>Guitar Overdub & Groove Humanizing:</strong> Arm live guitar input; apply Gaussian timing micro-jitter (±12ms) and dynamic velocity drift.</li>
      <li><strong>Beam Splitter & Devine Machine:</strong> Split frequencies into 3 bands and trigger Devine Machine Burroughsian reel cut-up slice reversals.</li>
    </ol>
  </div>

  <h2>13. SFZ Open Library</h2>
  <p>The open-source multi-velocity sample library allows loading instruments (1973 Rhodes Mk I, Juno-106 Chorus Pad, Spitfire Chamber Cello, Model D Moog Bass, LinnDrum LM-1) with real WebAudio audition, .sfz downloads, and local community sample publishing.</p>

  <h2>14. Ace-Step LoRA Lending Library</h2>
  <p>Borrow and stack diffusion adapters (Cassette Degradation Tape Haze, Golden-Era SP-1200 12-Bit, 80s Minneapolis Funk, Dark Ambient Drone, Devine Matrix Glitch). LoRA triggers are auto-injected into prompts.</p>
</body>
</html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  const handleDownloadMarkdown = () => {
    playLaserBeamSound('laser_audio');
    const mdContent = `# Strangelet Lab — Official User Field Manual (Offline Edition)
Version: v2.4.0 AIR-GAPPED OFFLINE BUNDLE

## 1. Architecture & Overview
Strangelet Lab is an offline, air-gapped quantum digital audio workstation and DSP laboratory.

## 11. The Buddy Duo: Ghost & Quinn Tag-Team
- **Ghost (Male • Llama 3.1 8B):** Analog tube sage, legendary producer lore, tape warmth, and groove instinct.
- **Quinn (Female • Qwen 3 7B):** Precision spectral frequency architect, Linkwitz-Riley crossovers, Faust JIT compiler.
- **Duo Co-Op Mode:** Both buddies banter and collaborate as a tag-team in the terminal.
- **Soul Persistence:** Buddy XP, level, and memories are decoupled from the raw weights and persist seamlessly when swapping from 6GB to 16GB VRAM hardware!

## 12. The Quantum Alchemist Pipeline
1. Collide prompt in the Large Sonic Collider (LSC).
2. Diffuse multi-stem song bed in Ace-Step 1.5.
3. Ingest stems into multitrack mixer console.
4. Plug in live guitar and engage Gaussian groove humanizing.
5. Send through Beam Splitter 3-band crossovers and Devine Machine Burroughsian tape slicing.

## 13. SFZ Open Library
Includes 1973 Vintage Rhodes Mk I Stage 73, Juno-106 Analog Chorus Pad, Spitfire Chamber Cello, Model D Moog Bass, and LinnDrum LM-1. Supports sharing and downloading open-format .sfz files.

## 14. Ace-Step LoRA Lending Library
Borrow and stack up to 3 diffusion adapters (Cassette Tape Degradation, Golden-Era SP-1200 12-Bit, 80s Minneapolis Funk, Dark Ambient Drone, Drill 808 Warp).
`;

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Strangelet_Lab_Official_Field_Manual.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const navItems = [
    { id: 'overview' as GuideSection, label: '1. Architecture & Overview', icon: BookOpen, tag: 'Core' },
    { id: 'collider' as GuideSection, label: '2. Large Sonic Collider', icon: Atom, tag: 'Physics' },
    { id: 'gold_path' as GuideSection, label: '3. Gold Path & A/B Mastering', icon: ShieldCheck, tag: 'Mastering' },
    { id: 'dojo_ai' as GuideSection, label: '4. Software Dojo & Training', icon: Sparkles, tag: 'Knowledge' },
    { id: 'hub_setup' as GuideSection, label: '5. Local Hub (Kobold/Ollama)', icon: Cpu, tag: 'Setup' },
    { id: 'beam_splitter' as GuideSection, label: '6. Beam Splitter & Crossovers', icon: Split, tag: 'DSP' },
    { id: 'suno_deglaze' as GuideSection, label: '7. Suno AI De-Glaze Studio', icon: Flame, tag: 'Restore' },
    { id: 'faust_dsp' as GuideSection, label: '8. Faust WebAudio Lab', icon: Terminal, tag: 'WASM' },
    { id: 'basic_pitch' as GuideSection, label: '9. Spotify Audio-to-MIDI', icon: Zap, tag: 'Polyphonic' },
    { id: 'shortcuts' as GuideSection, label: '10. Hotkeys & Shortcuts', icon: Keyboard, tag: 'Controls' },
    { id: 'buddy_duo' as GuideSection, label: '11. Buddy Duo (Ghost & Quinn)', icon: Bot, tag: 'AI Team' },
    { id: 'workflows' as GuideSection, label: '12. Quantum Workflows & Templates', icon: Workflow, tag: 'Pipelines' },
    { id: 'sfz_library' as GuideSection, label: '13. SFZ Open Library & Sharing', icon: Music, tag: 'Samples' },
    { id: 'lora_library' as GuideSection, label: '14. Ace-Step LoRA Library', icon: Layers, tag: 'Diffusion' },
  ];

  const filteredNav = navItems.filter(item => 
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#0B0E17] border border-[#232B42] w-full max-w-5xl h-[88vh] rounded-xl flex flex-col shadow-2xl overflow-hidden shadow-cyan-950/40">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A2234] bg-[#0E1322]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <BookOpen size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">Strangelet Lab — Official User Field Manual</h2>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                  v2.4.0 OFFLINE AIR-GAPPED
                </span>
              </div>
              <p className="text-xs text-[#7E8B9B]">Complete operational manual for quantum audio synthesis, Faust DSP, mastering, and local AI helpers</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Primary Download PDF Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 hover:brightness-110 text-black text-xs font-black transition-all shadow-[0_0_15px_rgba(245,158,11,0.35)] active:scale-95 cursor-pointer disabled:opacity-60"
              title="Generate and download offline PDF field manual"
            >
              <FileText size={14} className={isGeneratingPdf ? 'animate-spin' : ''} />
              <span>{isGeneratingPdf ? (pdfProgress || 'Generating PDF...') : 'Download PDF (.pdf)'}</span>
            </button>

            {/* Print / Save as PDF Button */}
            <button
              onClick={handlePrintPdf}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Print Manual or Save as PDF file"
            >
              <Printer size={13} />
              <span>Print</span>
            </button>

            {/* Download Markdown Button */}
            <button
              onClick={handleDownloadMarkdown}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#141B2D] hover:bg-[#1E2842] border border-[#263554] text-[#8E9DB7] hover:text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Download full air-gapped markdown manual (.md)"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Markdown (.md)</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#7E8B9B] hover:text-white hover:bg-[#1A233A] transition-colors ml-1 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body Layout: Sidebar + Main Content */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Navigation Sidebar */}
          <div className="w-72 bg-[#090C14] border-r border-[#1A2234] flex flex-col">
            <div className="p-3 border-b border-[#1A2234]">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-[#5D6B82]" />
                <input
                  type="text"
                  placeholder="Search guide..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#131929] border border-[#222E47] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#5D6B82] focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredNav.map((item) => {
                const Icon = item.icon;
                const isSelected = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-cyan-950/60 border border-cyan-500/50 text-cyan-200 shadow-sm'
                        : 'text-[#8E9CB2] hover:bg-[#121828] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon size={15} className={isSelected ? 'text-cyan-400' : 'text-[#5D6B82]'} />
                      <span>{item.label}</span>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#182138] text-[#7A8AA5]">
                      {item.tag}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Actions Footer */}
            <div className="p-3 border-t border-[#1A2234] bg-[#0A0E18] space-y-2">
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/40 hover:border-amber-400 text-amber-300 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-60"
                title="Generate and download full offline PDF manual"
              >
                <FileText size={14} className={isGeneratingPdf ? 'animate-spin text-amber-400' : 'text-amber-400'} />
                <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF Guide'}</span>
              </button>

              {onOpenDojo && (
                <button
                  onClick={() => { onClose(); onOpenDojo(); }}
                  className="w-full py-1.5 px-3 rounded-lg bg-amber-950/40 border border-amber-600/40 hover:border-amber-500 text-amber-300 text-xs font-mono font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Sparkles size={13} />
                  <span>Open Software Dojo</span>
                </button>
              )}
              {onOpenAiHub && (
                <button
                  onClick={() => { onClose(); onOpenAiHub(); }}
                  className="w-full py-1.5 px-3 rounded-lg bg-[#141B2D] border border-[#263554] hover:border-cyan-500 text-cyan-300 text-xs font-mono font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Cpu size={13} />
                  <span>Configure AI Hub</span>
                </button>
              )}
            </div>
          </div>

          {/* Main Manual Content */}
          <div className="flex-1 overflow-y-auto p-8 bg-[#0B0E17] text-[#C5D1E8] space-y-8 leading-relaxed">
            
            {/* 1. OVERVIEW */}
            {activeSection === 'overview' && (
              <div className="space-y-6">
                <div className="border-b border-[#1E293B] pb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <BookOpen className="text-cyan-400" />
                    1. Strangelet Lab Architecture & Core Topology
                  </h3>
                  <p className="text-sm text-[#8E9CB2] mt-1">
                    Quantum-Acoustic Workstation & Air-Gapped Local Intelligence Station
                  </p>
                </div>

                {/* Offline PDF Manual Banner */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-[#171329] to-[#0E1528] border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0">
                      <FileText size={22} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        Download Offline PDF Field Manual
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/40 font-mono">
                          v2.4.0
                        </span>
                      </h4>
                      <p className="text-xs text-[#9EADC8]">
                        Complete 17-chapter printable field manual. Keep a copy on your desktop or studio tablet for zero-internet air-gapped sessions.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-black text-xs font-black flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] shrink-0 cursor-pointer disabled:opacity-60"
                  >
                    <Download size={14} className={isGeneratingPdf ? 'animate-spin' : ''} />
                    <span>{isGeneratingPdf ? (pdfProgress || 'Compiling...') : 'Download PDF Manual'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#101626] border border-[#1E293B] p-4 rounded-xl">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider mb-2">
                      <Atom size={14} /> 100% Client-Side DSP
                    </div>
                    <p className="text-xs text-[#8E9CB2]">
                      Runs entirely within the browser via Web Audio API, Web Workers, and WebAssembly. No audio data ever leaves your device.
                    </p>
                  </div>
                  <div className="bg-[#101626] border border-[#1E293B] p-4 rounded-xl">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-2">
                      <Cpu size={14} /> Air-Gapped AI Hub
                    </div>
                    <p className="text-xs text-[#8E9CB2]">
                      Direct REST connection to Kobold.cpp, Ollama, and LM Studio. Zero internet connection required for high-speed local inference.
                    </p>
                  </div>
                  <div className="bg-[#101626] border border-[#1E293B] p-4 rounded-xl">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-2">
                      <ShieldCheck size={14} /> Gold Path Chain
                    </div>
                    <p className="text-xs text-[#8E9CB2]">
                      Broadcast-grade mastering suite featuring Linear-Phase EQ, Mid/Side stereo processing, tape warmth, and real-time A/B auditioning.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-white">How the Views Work Together</h4>
                  <ul className="text-xs text-[#9EADC8] space-y-2 list-disc pl-5">
                    <li><strong className="text-white">Arrangement Timeline:</strong> Record, slice, loop, and cross-fade multi-track audio and MIDI clips.</li>
                    <li><strong className="text-white">Collider:</strong> Send audio stems into the particle chamber to induce relativistic grain synthesis.</li>
                    <li><strong className="text-white">Beam Splitter:</strong> Decompose a track into Mid/Side or Transient/Tonal streams for targeted processing.</li>
                    <li><strong className="text-white">Gold Path Mastering:</strong> Put the final polish, stereo width, and loudness on your master output.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* 2. COLLIDER */}
            {activeSection === 'collider' && (
              <div className="space-y-6">
                <div className="border-b border-[#1E293B] pb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Atom className="text-cyan-400" />
                    2. The Large Sonic Collider (Hadron Synthesis)
                  </h3>
                  <p className="text-sm text-[#8E9CB2] mt-1">
                    Particle acceleration physics applied to audio buffers and spectral grains
                  </p>
                </div>

                <p className="text-xs text-[#A2B1CC]">
                  The Large Sonic Collider treats audio stems as charged relativistic particles orbiting inside a magnetic containment field. When particles collide, they trigger micro-granular fission, creating shimmering pads, sub-bass implosions, and chaotic comb-filter cascades.
                </p>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white">Interactive Laser Pointers</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-[#111728] border border-[#222E47] p-3.5 rounded-lg">
                      <span className="font-mono text-cyan-300 text-xs font-bold block mb-1">🔍 Inspect Tool</span>
                      <p className="text-xs text-[#8E9CB2]">Hover over any particle to read its current Doppler velocity, relativistic gamma factor, and frequency centroid.</p>
                    </div>
                    <div className="bg-[#111728] border border-[#222E47] p-3.5 rounded-lg">
                      <span className="font-mono text-indigo-300 text-xs font-bold block mb-1">🧲 Gravity Well</span>
                      <p className="text-xs text-[#8E9CB2]">Click and drag to pull orbiting particles into a focal point, forcing instant micro-collisions.</p>
                    </div>
                    <div className="bg-[#111728] border border-[#222E47] p-3.5 rounded-lg">
                      <span className="font-mono text-rose-300 text-xs font-bold block mb-1">⚡ Repulsor Beam</span>
                      <p className="text-xs text-[#8E9CB2]">Pushes particles outward against the magnetic wall, creating dynamic pitch dive-bombs and flanging.</p>
                    </div>
                    <div className="bg-[#111728] border border-[#222E47] p-3.5 rounded-lg">
                      <span className="font-mono text-amber-300 text-xs font-bold block mb-1">✨ Ionizer / Exciter</span>
                      <p className="text-xs text-[#8E9CB2]">Injects high-frequency saturation and sub-harmonic resonance into targeted particles on contact.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#121A2F] border border-cyan-800/40 p-4 rounded-xl text-xs space-y-2">
                  <span className="font-bold text-cyan-300 uppercase tracking-wider text-[11px] block">Pro Tip: Colliding AI Stems</span>
                  <p className="text-[#96A7C6]">
                    Drop a separated drum stem and vocal stem into the Collider. Crank the Beam Energy to <strong>4.8 GeV</strong> and set the Magnetic B-Field to <strong>2.4 Tesla</strong> to create organic, synchronized rhythmic drones.
                  </p>
                </div>
              </div>
            )}

            {/* 3. GOLD PATH */}
            {activeSection === 'gold_path' && (
              <div className="space-y-6">
                <div className="border-b border-[#1E293B] pb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="text-emerald-400" />
                    3. Gold Path Mastering Suite & A/B Comparison
                  </h3>
                  <p className="text-sm text-[#8E9CB2] mt-1">
                    Reference-grade mastering chain with instant zero-latency A/B auditioning
                  </p>
                </div>

                <p className="text-xs text-[#A2B1CC]">
                  The Gold Path is designed to achieve streaming and broadcast loudness targets without sacrificing dynamics or punch.
                </p>

                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-white">The 6 Processing Stages</h4>
                  <ol className="text-xs text-[#9EADC8] space-y-2 list-decimal pl-5">
                    <li><strong className="text-white">Sub-Sonic Linear EQ:</strong> Cuts DC offset and rumble below 30 Hz; transparently removes muddy low-mid resonances.</li>
                    <li><strong className="text-white">Mid/Side Stereophonic Processor:</strong> Centers mono bass frequencies (below 120 Hz) while expanding stereo side air (8 kHz+).</li>
                    <li><strong className="text-white">Strangelet Multi-Band Dynamics:</strong> 3-band compressor with program-dependent attack and release times.</li>
                    <li><strong className="text-white">Analogue Tape Saturator:</strong> Simulates 1/2-inch reel-to-reel magnetic tape with warm odd-order harmonics.</li>
                    <li><strong className="text-white">D3 Real-Time Spectral Analyzer:</strong> High-resolution FFT showing raw vs. mastered curves simultaneously.</li>
                    <li><strong className="text-white">True-Peak Brickwall Limiter:</strong> Catches inter-sample peaks with a clean lookahead buffer and -0.3 dBFS ceiling.</li>
                  </ol>
                </div>

                <div className="bg-[#121E24] border border-emerald-600/40 p-4 rounded-xl space-y-2">
                  <span className="font-bold text-emerald-300 uppercase tracking-wider text-[11px] block">Using the A/B Switcher</span>
                  <p className="text-xs text-[#8FB59F]">
                    Click the <strong>[A / B]</strong> toggle button in the Mastering panel or press the corresponding hotkey to instantly compare:
                  </p>
                  <ul className="text-xs text-[#A3C9B4] list-disc pl-5 space-y-1">
                    <li><strong className="text-emerald-200">State A:</strong> The full Gold Path mastered audio with all modules enabled.</li>
                    <li><strong className="text-emerald-200">State B:</strong> The raw unprocessed dry signal (or a captured reference preset) with gain compensation to prevent loudness bias.</li>
                  </ul>
                </div>

                <div className="bg-[#1A142A] border border-amber-500/40 p-4 rounded-xl space-y-2">
                  <span className="font-bold text-amber-300 uppercase tracking-wider text-[11px] block">Batch Multi-Core Auto-Mastering Engine</span>
                  <p className="text-xs text-[#BBAAD0]">
                    Drag a whole folder of multitrack stems or full album tracks into the <strong>Batch Auto-Mastering</strong> view:
                  </p>
                  <ul className="text-xs text-[#D5CAE6] list-disc pl-5 space-y-1">
                    <li><strong className="text-amber-200">Multi-Core Parallel Execution:</strong> Leverages all CPU hardware threads simultaneously via concurrent OfflineAudioContext instances.</li>
                    <li><strong className="text-amber-200">Current Gold Path Presets:</strong> Auto-masters every file using your active Gold Path preset, EQ curves, tape saturation, and true-peak limiting.</li>
                    <li><strong className="text-amber-200">Stem Submix Mode:</strong> Protects -4.5 dB headroom when mastering individual stems so they sum without clipping in your DAW.</li>
                    <li><strong className="text-amber-200">ZIP Batch Export:</strong> Download all mastered 16-bit WAV files in a single organized ZIP archive complete with a mastering log report.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* 4. DOJO AI */}
            {activeSection === 'dojo_ai' && (
              <div className="space-y-6">
                <div className="border-b border-[#1E293B] pb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="text-amber-400" />
                    4. Software Dojo & The Three AI Buddies
                  </h3>
                  <p className="text-sm text-[#8E9CB2] mt-1">
                    Training local LLMs in the software ways of Strangelet Lab
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#14120B] border border-amber-900/60 p-4 rounded-xl">
                    <div className="text-amber-400 font-bold text-xs uppercase mb-1">🥋 Strangelet Guru</div>
                    <div className="text-[10px] text-amber-500 font-mono mb-2">AUDIO NINJA SENSEI</div>
                    <p className="text-xs text-[#B5A58A]">
                      Master of acoustic science, phase coherence, Faust DSP coding, and Gold Path recipes. Gives disciplined, actionable guidance.
                    </p>
                  </div>
                  <div className="bg-[#0D141F] border border-cyan-900/60 p-4 rounded-xl">
                    <div className="text-cyan-400 font-bold text-xs uppercase mb-1">🦙 Llama 3.x / Qwen</div>
                    <div className="text-[10px] text-cyan-500 font-mono mb-2">STUDIO CO-PRODUCER</div>
                    <p className="text-xs text-[#8EA2BE]">
                      Energetic creative partner. Suggests drum grooves, melodic themes, chord voicings, and song arrangement transitions.
                    </p>
                  </div>
                  <div className="bg-[#150E24] border border-purple-900/60 p-4 rounded-xl">
                    <div className="text-purple-400 font-bold text-xs uppercase mb-1">👻 Quinn 3.7</div>
                    <div className="text-[10px] text-purple-500 font-mono mb-2">GHOST IN THE MACHINE</div>
                    <p className="text-xs text-[#AE99C9]">
                      Cryptic, spectral poet. Analyzes hidden frequencies, subtle phasing anomalies, and surreal granular soundbed ideas.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-white">The Dojo Training Scrolls</h4>
                  <p className="text-xs text-[#9EADC8]">
                    The Dojo automatically injects specialized reference documentation into your local model’s system prompt:
                  </p>
                  <ul className="text-xs text-[#9EADC8] space-y-1 list-disc pl-5">
                    <li><strong>Scroll of Gold Path Mastering:</strong> Teaches target LUFS, crossover slopes, and Mid/Side guidelines.</li>
                    <li><strong>Scroll of the Large Sonic Collider:</strong> Instructs on relativistic GeV energies, particle collision rates, and laser tools.</li>
                    <li><strong>Scroll of Faust DSP Synthesizer:</strong> Equips the model with valid Faust audio syntax and WebAudio architecture.</li>
                    <li><strong>Custom Sensei Directives:</strong> Write your own studio secrets and mixing rules in the Dojo Editor!</li>
                  </ul>
                </div>
              </div>
            )}

            {/* 5. HUB SETUP */}
            {activeSection === 'hub_setup' && (
              <div className="space-y-6">
                <div className="border-b border-[#1E293B] pb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Cpu className="text-cyan-400" />
                    5. Local AI Hub Connection Guide (Offline GGUFs)
                  </h3>
                  <p className="text-sm text-[#8E9CB2] mt-1">
                    Connect Kobold.cpp, Ollama, or LM Studio for 100% air-gapped studio assistance
                  </p>
                </div>

                {/* Kobold.cpp */}
                <div className="bg-[#101626] border border-[#222E47] p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-cyan-300 font-mono">Option A: Kobold.cpp (Recommended for GGUFs)</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#182138] text-cyan-400">Port 5001</span>
                  </div>
                  <p className="text-xs text-[#8E9CB2]">
                    Launch your Kobold.cpp executable with your model of choice:
                  </p>
                  <div className="relative bg-[#090C14] border border-[#1B253B] rounded-lg p-3 font-mono text-[11px] text-cyan-300">
                    <code>./koboldcpp --model Qwen2.5-7B-Instruct.gguf --port 5001 --usecublas</code>
                    <button
                      onClick={() => copyToClipboard('./koboldcpp --model Qwen2.5-7B-Instruct.gguf --port 5001 --usecublas', 'kobold')}
                      className="absolute right-2 top-2 p-1.5 rounded bg-[#131B2D] text-[#8E9CB2] hover:text-white"
                      title="Copy command"
                    >
                      {copiedCode === 'kobold' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#71829B]">
                    In Strangelet Lab, set Engine to <strong>Kobold.cpp</strong> and Endpoint to <code>http://localhost:5001</code>.
                  </p>
                </div>

                {/* Ollama */}
                <div className="bg-[#101626] border border-[#222E47] p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-300 font-mono">Option B: Ollama</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#182138] text-amber-400">Port 11434</span>
                  </div>
                  <div className="relative bg-[#090C14] border border-[#1B253B] rounded-lg p-3 font-mono text-[11px] text-amber-300">
                    <code>ollama run qwen2.5:7b</code>
                    <button
                      onClick={() => copyToClipboard('ollama run qwen2.5:7b', 'ollama')}
                      className="absolute right-2 top-2 p-1.5 rounded bg-[#131B2D] text-[#8E9CB2] hover:text-white"
                      title="Copy command"
                    >
                      {copiedCode === 'ollama' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#71829B]">
                    Set Engine to <strong>Ollama</strong>, Endpoint to <code>http://localhost:11434</code>, and Model Name to <code>qwen2.5:7b</code>.
                  </p>
                </div>

                {/* LM Studio */}
                <div className="bg-[#101626] border border-[#222E47] p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-purple-300 font-mono">Option C: LM Studio</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#182138] text-purple-400">Port 1234</span>
                  </div>
                  <p className="text-xs text-[#8E9CB2]">
                    Start the Local Server on port <code>1234</code> inside the LM Studio Local Server tab. Strangelet Lab connects directly via OpenAI-compatible API.
                  </p>
                </div>
              </div>
            )}

            {/* 6. BEAM SPLITTER */}
            {activeSection === 'beam_splitter' && (
              <div className="space-y-6">
                <div className="border-b border-[#1E293B] pb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Split className="text-cyan-400" />
                    6. Beam Splitter & Crossover Deconstruction
                  </h3>
                  <p className="text-sm text-[#8E9CB2] mt-1">
                    Frequency, spatial, and dynamic splitting for surgical audio manipulation
                  </p>
                </div>
                <p className="text-xs text-[#A2B1CC]">
                  The Beam Splitter separates complex audio files into two distinct, phase-aligned channels:
                </p>
                <ul className="text-xs text-[#9EADC8] space-y-2 list-disc pl-5">
                  <li><strong className="text-white">Low/High Split:</strong> Isolates fundamental sub frequencies from midrange textures using adjustable Linkwitz-Riley crossover filters.</li>
                  <li><strong className="text-white">Mid/Side Split:</strong> Separates mono center information (kick, snare, lead vocals) from wide stereophonic elements (pads, reverbs, ambient mics).</li>
                  <li><strong className="text-white">Transient/Tonal Split:</strong> Deconstructs audio into percussive transient clicks versus sustained tonal harmonics.</li>
                </ul>
              </div>
            )}

            {/* 7. SUNO DEGLAZE */}
            {activeSection === 'suno_deglaze' && (
              <div className="space-y-6">
                <div className="border-b border-[#1E293B] pb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Flame className="text-rose-400" />
                    7. Suno AI De-Glaze & Audio Restoration Studio
                  </h3>
                  <p className="text-sm text-[#8E9CB2] mt-1">
                    Un-bake over-compressed AI generations and restore analog transient life
                  </p>
                </div>
                <p className="text-xs text-[#A2B1CC]">
                  AI music models often produce a signature "hollow sheen", comb-filtering, and squashed dynamics. The De-Glaze Studio repairs these artifacts:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#161214] border border-rose-900/50 p-3.5 rounded-lg">
                    <span className="text-rose-300 font-bold block mb-1">De-Sheen Dynamic Filter</span>
                    <p className="text-[#968E95]">Suppresses brittle 12 kHz–16 kHz phase jitter without dulling top-end sparkle.</p>
                  </div>
                  <div className="bg-[#161214] border border-rose-900/50 p-3.5 rounded-lg">
                    <span className="text-rose-300 font-bold block mb-1">Transient Re-Synthesizer</span>
                    <p className="text-[#968E95]">Detects smudged drum transients and injects synthetic impact spikes for punchy punch.</p>
                  </div>
                </div>
              </div>
            )}

            {/* 8. FAUST DSP */}
            {activeSection === 'faust_dsp' && (
              <div className="space-y-6">
                <div className="border-b border-[#1E293B] pb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Terminal className="text-emerald-400" />
                    8. Faust DSP WebAudio Lab
                  </h3>
                  <p className="text-sm text-[#8E9CB2] mt-1">
                    Live WebAssembly audio compiler right inside the workstation
                  </p>
                </div>
                <p className="text-xs text-[#A2B1CC]">
                  Write pure functional Faust code directly in Strangelet Lab. The engine compiles your code to WebAssembly in milliseconds, mounting your custom oscillators, reverbs, or filters onto any track or FX slot.
                </p>
                <div className="bg-[#090E16] border border-[#1C273C] p-3 rounded-lg font-mono text-[11px] text-emerald-300">
                  <pre>
{`import("stdfaust.lib");
freq = hslider("freq", 440, 20, 2000, 0.1);
gate = button("gate");
process = os.sawtooth(freq) * gate;`}
                  </pre>
                </div>
              </div>
            )}

            {/* 9. BASIC PITCH */}
            {activeSection === 'basic_pitch' && (
              <div className="space-y-6">
                <div className="border-b border-[#1E293B] pb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Zap className="text-amber-400" />
                    9. Spotify Basic Pitch Transcriber
                  </h3>
                  <p className="text-sm text-[#8E9CB2] mt-1">
                    Polyphonic neural audio-to-MIDI transcription
                  </p>
                </div>
                <p className="text-xs text-[#A2B1CC]">
                  Drop audio recordings (guitars, piano chords, humming, baseline stems) directly into the Basic Pitch tool to convert raw audio into high-precision MIDI sequences. The transcribed notes can then be assigned to SFZ soundbanks or exported.
                </p>
              </div>
            )}

            {/* 10. SHORTCUTS */}
            {activeSection === 'shortcuts' && (
              <div className="space-y-6">
                <div className="border-b border-[#1E293B] pb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Keyboard className="text-cyan-400" />
                    10. Master Keyboard Shortcuts Cheat Sheet
                  </h3>
                  <p className="text-sm text-[#8E9CB2] mt-1">
                    Instant access controls for high-speed workflow
                  </p>
                </div>

                <div className="border border-[#1E293B] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#121828] text-[#8E9CB2] uppercase border-b border-[#1E293B]">
                      <tr>
                        <th className="px-4 py-2.5">Key</th>
                        <th className="px-4 py-2.5">Function</th>
                        <th className="px-4 py-2.5">Context</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1A2338] text-[#A6B7D4]">
                      <tr>
                        <td className="px-4 py-2 font-bold text-cyan-300">Ctrl + Z</td>
                        <td className="px-4 py-2">Undo Last Track / Clip / Arrangement Operation</td>
                        <td className="px-4 py-2 text-[#64748B]">Global</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-bold text-amber-300">Ctrl + Y / Ctrl + Shift + Z</td>
                        <td className="px-4 py-2">Redo Last Reverted Operation</td>
                        <td className="px-4 py-2 text-[#64748B]">Global</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-bold text-emerald-300">Ctrl + S</td>
                        <td className="px-4 py-2">Manual Project Save (Automatic background save every 60s)</td>
                        <td className="px-4 py-2 text-[#64748B]">Global</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-bold text-cyan-300">Ctrl + B</td>
                        <td className="px-4 py-2">Collapse / Expand Sidebar (Maximize Screen Room)</td>
                        <td className="px-4 py-2 text-[#64748B]">Global</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-bold text-cyan-300">F1 / ?</td>
                        <td className="px-4 py-2">Open This User Manual & Field Guide</td>
                        <td className="px-4 py-2 text-[#64748B]">Global</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-bold text-purple-300">Alt + G</td>
                        <td className="px-4 py-2">Toggle Ghost in the Machine / Buddy Terminal</td>
                        <td className="px-4 py-2 text-[#64748B]">Global</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-bold text-cyan-300">Space</td>
                        <td className="px-4 py-2">Play / Pause Transport</td>
                        <td className="px-4 py-2 text-[#64748B]">Global</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-bold text-rose-300">R</td>
                        <td className="px-4 py-2">Master WAV Recording Toggle</td>
                        <td className="px-4 py-2 text-[#64748B]">Global</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-bold text-cyan-300">Tab</td>
                        <td className="px-4 py-2">Toggle Timeline & Mixer</td>
                        <td className="px-4 py-2 text-[#64748B]">Workspace</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-bold text-emerald-300">M / S</td>
                        <td className="px-4 py-2">Mute / Solo Active Track</td>
                        <td className="px-4 py-2 text-[#64748B]">Mixer / Tracks</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-bold text-cyan-300">Esc</td>
                        <td className="px-4 py-2">Close Modal / Reset Selection</td>
                        <td className="px-4 py-2 text-[#64748B]">Modals</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 11. BUDDY DUO: GHOST & QUINN */}
            {activeSection === 'buddy_duo' && (
              <div className="space-y-6">
                <div className="border-b border-[#1E293B] pb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Bot className="text-purple-400" />
                    11. The AI Helper Duo: Ghost & Quinn Tag-Team
                  </h3>
                  <p className="text-sm text-[#8E9CB2] mt-1">
                    Persistent personalities, eccentric studio lore, and co-op dialogue across all model swaps
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-gradient-to-tr from-[#1B100B] to-[#0F0C16] border border-orange-500/40 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">👻</span>
                      <h4 className="font-bold text-white text-sm">Ghost (Male • Llama 3.1 8B)</h4>
                    </div>
                    <p className="text-xs text-[#C8B89E] leading-relaxed">
                      The literal Ghost in the Machine. Analog tube sage, reel-to-reel tape bias enthusiast, and walking encyclopedia of legendary inside-game studio stories (Lee Scratch Perry tape ceremonies, Prince LinnDrum tuning, Kevin Shields MBV guitar walls, Trevor Horn compression). Soulful, warm, and eccentric.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-gradient-to-tr from-[#0B1522] to-[#0A101D] border border-cyan-500/40 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⚡</span>
                      <h4 className="font-bold text-white text-sm">Quinn (Female • Qwen 3 / 2.5 7B)</h4>
                    </div>
                    <p className="text-xs text-[#9EC4DC] leading-relaxed">
                      Precision DSP Architect. High-order mathematical spectral analysis, Linkwitz-Riley 24dB crossover calculations, Faust JIT compiler bytecode generator, and surgical 8.5kHz de-sheen master. Crisp, brilliant, and analytical.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#121626] border border-[#232F4C] space-y-2 text-xs text-[#A2B1CC]">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <span>👥 Duo Co-Op Mode & Soul Persistence</span>
                  </h4>
                  <p>
                    When "Duo Team" mode is selected, Ghost and Quinn converse together in tag-team banter—Ghost provides instinctive analog mojo while Quinn delivers the exact mathematical formulas. Crucially, the <strong>Buddy Soul Core</strong> (XP, Level, persistent memories, and studio quirks) is stored separately from the raw model weights, meaning you can swap from a 3B model on a 6GB laptop to a 14B model on a 16GB rig without losing their memory or personality!
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#14121F] border border-purple-500/30 space-y-2 text-xs text-[#A2B1CC]">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2 text-purple-300">
                    <span>🛡️ Movable Widget & Screen Real Estate Controls</span>
                  </h4>
                  <p>
                    Never let the floating helper block your master faders or meters! You have full control over the widget:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-[#C4D0E5]">
                    <li><strong>⇄ Move Corner:</strong> Move the widget between Bottom-Right, Bottom-Left, Top-Left, or Top-Right with 1 click.</li>
                    <li><strong>▾ Fold / Minimize:</strong> Collapse the badge into an ultra-discrete 32px glowing orb that takes virtually zero space.</li>
                    <li><strong>✕ Hide:</strong> Completely dismiss the floating widget from the canvas. Re-open it anytime via the <strong>Ghost Buddy</strong> button in the top bar or with the <strong>Alt + G</strong> hotkey!</li>
                  </ul>
                </div>
              </div>
            )}

            {/* 12. GUIDED WORKFLOWS & TEMPLATES */}
            {activeSection === 'workflows' && (
              <div className="space-y-6">
                <div className="border-b border-[#1E293B] pb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Workflow className="text-purple-400" />
                    12. Guided Quantum Workflows & Production Templates
                  </h3>
                  <p className="text-sm text-[#8E9CB2] mt-1">
                    Plotted-out production pipelines connecting the LSC, Ace-Step, Mixer, Groove Humanizer, and Devine Machine
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#101424] border border-purple-500/30 space-y-3">
                  <h4 className="font-bold text-white text-sm text-purple-300">
                    The Quantum Alchemist Pipeline: Step-by-Step
                  </h4>
                  <ol className="list-decimal list-inside space-y-2 text-xs text-[#A2B1CC]">
                    <li><strong>LSC Prompt Genesis:</strong> Collide sonic particles in the Large Sonic Collider (e.g. 88 BPM Boom-Bap Drums + Detuned Rhodes + Reese Sub).</li>
                    <li><strong>Ace-Step 1.5 Diffusion:</strong> Inject the prompt into Ace-Step 1.5 Loop Designer, select stems, and diffuse.</li>
                    <li><strong>Mixer Multitrack Ingestion:</strong> Route stems with 1 click into the multitrack console with pre-calibrated headroom.</li>
                    <li><strong>Live Guitar In & Humanizing:</strong> Arm the live input channel and engage the Groove Humanizer for natural Gaussian timing jitter (±12ms).</li>
                    <li><strong>Beam Splitter & Devine Machine Slicing:</strong> Isolate frequencies with 3-band crossovers and trigger Devine Machine Burroughsian reel cut-ups with reverse slices!</li>
                  </ol>
                </div>

                <div className="p-4 rounded-xl bg-[#121626] border border-[#232F4C] text-xs text-[#A2B1CC]">
                  <h4 className="font-bold text-white text-sm mb-1">One-Click Project Templates</h4>
                  <p>
                    Open the Guided Workflows modal (toolbar) to load complete ready-to-play sessions: <em>Quantum Hip-Hop & Lo-Fi Beat</em>, <em>Cyberpunk Neon Synthwave</em>, <em>Acoustic Chamber & Folk</em>, and <em>Devine Industrial Breaks</em>.
                  </p>
                </div>
              </div>
            )}

            {/* 13. SFZ OPEN LIBRARY */}
            {activeSection === 'sfz_library' && (
              <div className="space-y-6">
                <div className="border-b border-[#1E293B] pb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Music className="text-cyan-400" />
                    13. SFZ Open Library & Community Sample Exchange
                  </h3>
                  <p className="text-sm text-[#8E9CB2] mt-1">
                    Open-format multisample instruments, real WebAudio audition, and local sample sharing
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#12182B] border border-cyan-500/30 space-y-2 text-xs text-[#A2B1CC]">
                  <h4 className="font-bold text-white text-sm text-cyan-300">
                    Included Open-Source SFZ Soundbanks
                  </h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>1973 Vintage Rhodes Mk I Stage 73:</strong> 6 velocity layers per key with mechanical tine release chimes.</li>
                    <li><strong>Juno-106 Analog Saw Chorus Pad:</strong> Rich stereo chorus II BBD circuit pads with sub-oscillator.</li>
                    <li><strong>Spitfire Intimate Chamber Cello:</strong> Rosin friction, sul tasto bowing, and expressive vibrato.</li>
                    <li><strong>Model D Moog Sub Bass:</strong> Discrete transistor ladder filter 3-oscillator sub weight.</li>
                    <li><strong>LinnDrum LM-1 Authentic Tape Chops:</strong> 1980s Minneapolis funk EPROM drum samples through tape.</li>
                    <li><strong>Devine Machine Granular Shards:</strong> Burroughsian permutational tape cut-ups and micro-stutters.</li>
                  </ul>
                </div>

                <p className="text-xs text-[#8E9CB2]">
                  Click "SFZ Open Library" in the toolbar to audition instruments in real-time, load them directly onto MIDI tracks, download standalone <code>.sfz</code> packages, or publish your own custom sample maps!
                </p>
              </div>
            )}

            {/* 14. ACE-STEP LORA LENDING LIBRARY */}
            {activeSection === 'lora_library' && (
              <div className="space-y-6">
                <div className="border-b border-[#1E293B] pb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Layers className="text-pink-400" />
                    14. Ace-Step 1.5 LoRA Lending Library
                  </h3>
                  <p className="text-sm text-[#8E9CB2] mt-1">
                    Borrow, stack, and adjust weights on boutique diffusion adapters
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#170E24] border border-pink-500/30 space-y-2 text-xs text-[#C8B8D8]">
                  <h4 className="font-bold text-white text-sm text-pink-300">
                    Diffusion Sonic Adapters (LoRAs)
                  </h4>
                  <p>
                    Low-Rank Adaptation (LoRA) allows radically altering the timbre, era, and texture of Ace-Step neural diffusion models with minimal VRAM overhead:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><code>lofi-tape-decay</code> — Cassette wow & flutter, tape hiss, and analog mid saturation.</li>
                    <li><code>sp1200-crunch</code> — 12-bit linear DAC aliasing ring and punchy drum transients.</li>
                    <li><code>prince-linn-groove</code> — Minneapolis slap bass, tuned LinnDrum, gated punch.</li>
                    <li><code>glacial-sub-drone</code> — Infinite ambient tails, sub-harmonic resonance.</li>
                    <li><code>devine-matrix-glitch</code> — Asymmetrical micro-stutters and bit-crushed chirps.</li>
                    <li><code>velvet-keys-dilla</code> — Neo-Soul 9th chord voicings and laid-back drunken swing.</li>
                  </ul>
                </div>

                <p className="text-xs text-[#8E9CB2]">
                  Open Ace-Step 1.5 and click "LoRA Library" to borrow up to 3 active LoRAs simultaneously. Guidance weights can be dialed between 0.10x and 1.50x, and trigger tokens are injected automatically into diffusion prompts!
                </p>
              </div>
            )}

          </div>

        </div>

        {/* Floating Download Toast */}
        {toastMsg && (
          <div className="absolute bottom-6 right-6 z-[130] px-4 py-2.5 rounded-xl bg-[#090D1E] border border-amber-400 text-amber-200 text-xs font-mono font-bold shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center gap-2.5 animate-in fade-in backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>{toastMsg}</span>
          </div>
        )}

      </div>
    </div>
  );
};
