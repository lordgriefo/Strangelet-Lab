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
        version: 'v2.5.0',
        onProgress: (percent, status) => {
          setPdfProgress(`${status} (${percent}%)`);
        }
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Strangelet_Lab_User_Field_Manual_v2.5.0.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      playLaserBeamSound('laser_curve');
      setToastMsg('Downloaded official offline PDF manual (Strangelet_Lab_User_Field_Manual_v2.5.0.pdf)');
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
  <title>Strangelet Lab — Official User Field Manual (v2.5.0)</title>
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
  <div class="badge">v2.5.0 AIR-GAPPED OFFLINE PRINT EDITION</div>
  <p><em>The complete offline guide for Pure Timeline & Mixer views, Snapshots menu, Reference Matchering, Faust DSP Workbench, Automation & Macros, MIDI Quantize, and GHOST.</em></p>
  
  <h2>Table of Contents</h2>
  <ul>
    <li>1. Architecture & Workspace Views (Pure Timeline / Timeline / Mixer Only / Split + Snapshots Menu)</li>
    <li>2. Large Sonic Collider (LSC) Quantum Physics Engine</li>
    <li>3. Gold Path 6-Stage Mastering Suite, A/B Console & FFT Reference Matchering</li>
    <li>4. Software Dojo & AI Training Scrolls</li>
    <li>5. Local AI Hub Setup (Kobold.cpp / Ollama / LM Studio)</li>
    <li>6. Beam Splitter Multiband Crossovers</li>
    <li>7. Suno AI De-Glaze & Audio Restoration</li>
    <li>8. Faust DSP Workbench (12 Models, Idea Board & Prompt-to-Toy)</li>
    <li>9. Spotify Basic Pitch & Global MIDI Quantize + Swing</li>
    <li>10. Master Keyboard Shortcuts</li>
    <li>11. GHOST (The Ghost in the Machine) — Studio Mentor & DSP Architect</li>
    <li>12. Global VST Browser, Parameter Automation & Macro Engine</li>
    <li>13. SFZ Open Library & Community Sample Exchange</li>
    <li>14. Ace-Step 1.5 LoRA Lending Library</li>
  </ul>

  <h2>1. Pure Timeline, Snapshots Menu & Mixer Views</h2>
  <div class="card">
    <strong>4-Way View Toggle:</strong> Switch between <em>Pure Timeline</em> (full-height distraction-free arrangement with slim micro-transport), <em>Timeline</em> (timeline + side panels & transport), <em>Mixer Only</em> (tall studio faders), and <em>Split</em>. Press <strong>Tab</strong> to toggle between your active timeline view and Mixer Only.<br/><br/>
    <strong>Snapshots Menu Button:</strong> Click <strong>SNAPSHOTS</strong> in the Mixer header to open the 8-slot capture/recall/rename menu and A/B comparator without crowding the timeline.
  </div>

  <h2>3. FFT Reference Matchering (Gold Path Mastering)</h2>
  <div class="card">
    Drop any <code>.wav</code> or <code>.mp3</code> song onto the <strong>Drop Reference Audio Track (Matchering)</strong> zone. Web Audio FFT computes its Sub, Low-Mid, Mid, Presence, and Air contour and auto-calibrates the 6-band Parametric EQ. Click <strong>Audition Reference Track</strong> for level-matched comparison.
  </div>

  <h2>11. GHOST (The Ghost in the Machine)</h2>
  <div class="card">
    <strong>GHOST</strong> is Strangelet Lab's sole audio mentor, DSP architect, and partner. Before answering, GHOST inspects your live BPM, time signature, active track count (Audio vs. MIDI), active Gold Path preset, and Reference Matchering status—delivering concise, practical Hz/kHz & knob-level engineering advice.
  </div>
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
Version: v2.5.0 AIR-GAPPED OFFLINE BUNDLE

## 1. Architecture, Views & Snapshots Menu
- **4-Way Layout Switcher:** Switch between **Pure Timeline** (edge-to-edge full-height timeline + slim micro-transport), **Timeline**, **Mixer Only**, and **Split**. Press **Tab** to flip between your active timeline view and Mixer Only.
- **Snapshots Dropdown Menu:** Click **SNAPSHOTS** in the Mixer header for 8 save/recall/rename slots and instant A/B mix comparison without taking vertical timeline space.
- **Native Hardware Cursor:** Zero-latency OS pointer for instant 60fps fader and timeline response.

## 3. Gold Path Mastering & FFT Reference Matchering
- Drop a reference .wav/.mp3 track onto **Drop Reference Audio Track (Matchering)** to analyze its 5-band FFT spectrum (Sub, Low-Mid, Mid, Presence, Air) and auto-calibrate the 6-band Parametric EQ.
- Toggle **Audition Reference Track** for level-matched A/B comparison.

## 8. Faust DSP Workbench (12 Models, Idea Board & Prompt-to-Toy)
- Includes 12 boutique preset toys (including VHS 1985 Chorus & Pitch Drift, Deep Cavern Shimmer Reverb, Cassette Head Magnetic Saturator, Barberpole Infinite Phaser, and FM Glass Bell Synth).
- **Idea Board / Cookbook Tab:** Browse models by tags ([Time & Warble], [Grit & Crunch], [Space & Dimension], [Physical Modeling], [Sci-Fi Glitch]) with plain-English explanations.
- **Prompt-to-Toy Recipes:** Click quick recipe chips to have GHOST assemble and compile live Faust DSP code.

## 11. GHOST (The Ghost in the Machine)
- Sole audio mentor, DSP architect, and studio partner.
- Inspects live BPM, time signature, track count (Audio/MIDI), Gold Path preset, and Matchering state before responding with concise Hz/kHz and knob-specific advice.
- Soul XP, rank, and studio habits persist across local GGUF model swaps via \`buddyEvolutionCore\`.

## 12. Global VST Browser, Macro Engine & MIDI Quantize
- **Global VST Browser:** Scans project tracks for Faust/VST plugins and provides unified Parameter Automation lanes directly on the timeline.
- **Macro Engine:** Records sequences of fader, pan, and VST tweaks into MIDI-triggerable Performance Macros or bakes them to timeline automation.
- **Global MIDI Quantize:** Snap selected MIDI clips or notes to 1/4, 1/8, 1/16, or 1/32 grids with adjustable Swing % humanization.
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
    { id: 'overview' as GuideSection, label: '1. Architecture, Views & Snapshots', icon: BookOpen, tag: 'Core' },
    { id: 'collider' as GuideSection, label: '2. Large Sonic Collider', icon: Atom, tag: 'Physics' },
    { id: 'gold_path' as GuideSection, label: '3. Gold Path & Matchering', icon: ShieldCheck, tag: 'Mastering' },
    { id: 'dojo_ai' as GuideSection, label: '4. Software Dojo & Scrolls', icon: Sparkles, tag: 'Knowledge' },
    { id: 'hub_setup' as GuideSection, label: '5. Local Hub (Kobold/Ollama)', icon: Cpu, tag: 'Setup' },
    { id: 'beam_splitter' as GuideSection, label: '6. Beam Splitter & Crossovers', icon: Split, tag: 'DSP' },
    { id: 'suno_deglaze' as GuideSection, label: '7. Suno AI De-Glaze Studio', icon: Flame, tag: 'Restore' },
    { id: 'faust_dsp' as GuideSection, label: '8. Faust Workbench (12 Toys)', icon: Terminal, tag: 'WASM' },
    { id: 'basic_pitch' as GuideSection, label: '9. Basic Pitch & MIDI Quantize', icon: Zap, tag: 'MIDI' },
    { id: 'shortcuts' as GuideSection, label: '10. Hotkeys & Shortcuts', icon: Keyboard, tag: 'Controls' },
    { id: 'buddy_duo' as GuideSection, label: '11. GHOST (Ghost in the Machine)', icon: Bot, tag: 'AI Mentor' },
    { id: 'workflows' as GuideSection, label: '12. VST Browser, Macros & Workflows', icon: Workflow, tag: 'Automation' },
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
                  v2.5.0 OFFLINE AIR-GAPPED
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
                          v2.5.0
                        </span>
                      </h4>
                      <p className="text-xs text-[#9EADC8]">
                        Complete 13-chapter printable PDF manual covering Pure Timeline, Snapshots Menu, Reference Matchering, Faust 12-Model Lab, VST Automation, Macros, MIDI Quantize, and GHOST.
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
                      Runs entirely within the browser via Web Audio API, Web Workers, and WebAssembly with a zero-latency native hardware cursor.
                    </p>
                  </div>
                  <div className="bg-[#101626] border border-[#1E293B] p-4 rounded-xl">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-2">
                      <Cpu size={14} /> Air-Gapped AI Hub
                    </div>
                    <p className="text-xs text-[#8E9CB2]">
                      Direct REST connection to Kobold.cpp, Ollama, and LM Studio powering GHOST with live studio session awareness.
                    </p>
                  </div>
                  <div className="bg-[#101626] border border-[#1E293B] p-4 rounded-xl">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-2">
                      <ShieldCheck size={14} /> Gold Path & Matchering
                    </div>
                    <p className="text-xs text-[#8E9CB2]">
                      Broadcast-grade 6-stage mastering chain with FFT Reference Matchering auto-EQ, tape warmth, and level-matched A/B auditioning.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-white">Workspace Views & Auto-Mix Snapshots Menu</h4>
                  <ul className="text-xs text-[#9EADC8] space-y-2 list-disc pl-5">
                    <li><strong className="text-white">Pure Timeline:</strong> Edge-to-edge full-height arrangement timeline with a single slim micro-transport bar (Play/Stop/Rec/Loop/BPM, +Audio/+MIDI, and Snapshots), hiding mixer strips and sidebars.</li>
                    <li><strong className="text-white">Timeline / Mixer Only / Split:</strong> Switch between full-height Timeline + Tools, tall Mixer Console strips, or Split dual-pane layout. Press <code className="text-cyan-300">Tab</code> to cycle Timeline &lt;-&gt; Mixer Only.</li>
                    <li><strong className="text-white">SNAPSHOTS Menu Button:</strong> Compact header button opens the 8-slot Auto-Mix Snapshot menu (save, recall, rename, and A/B compare) without consuming vertical timeline space.</li>
                    <li><strong className="text-white">Collider, Beam Splitter & Gold Path:</strong> Send stems to relativistic hadron synthesis, split crossovers, and calibrate your master against reference tracks.</li>
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
                  <span className="font-bold text-emerald-300 uppercase tracking-wider text-[11px] block">Real-Time FFT Reference Matchering & A/B Switcher</span>
                  <p className="text-xs text-[#8FB59F]">
                    Drop any commercial <code>.wav</code> or <code>.mp3</code> track onto the permanent <strong>Drop Reference Audio Track (Matchering)</strong> zone:
                  </p>
                  <ul className="text-xs text-[#A3C9B4] list-disc pl-5 space-y-1">
                    <li><strong className="text-emerald-200">5-Band FFT Analysis:</strong> Computes Sub, Low-Mid, Mid, Presence, and Air energy against your master bus and auto-calibrates the 6-band Parametric EQ.</li>
                    <li><strong className="text-emerald-200">Audition Reference Track:</strong> Toggle instantaneously between your Gold Path master and the level-matched reference track to prevent loudness bias.</li>
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
                    4. Software Dojo & GHOST Intelligence
                  </h3>
                  <p className="text-sm text-[#8E9CB2] mt-1">
                    Training local LLMs in the DSP and studio architecture of Strangelet Lab
                  </p>
                </div>

                <div className="bg-[#150E24] border border-purple-700/60 p-4 rounded-xl">
                  <div className="text-purple-300 font-bold text-xs uppercase mb-1">GHOST — The Ghost in the Machine</div>
                  <div className="text-[10px] text-amber-400 font-mono mb-2">SOLE AUDIO MENTOR, DSP ARCHITECT & PARTNER</div>
                  <p className="text-xs text-[#C5B8DB]">
                    GHOST inspects your live BPM, time signature, active tracks (Audio vs. MIDI), Gold Path preset, and Reference Matchering status before responding with concise, hyper-practical Hz/kHz & knob-level studio guidance or custom Faust DSP code.
                  </p>
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
                    8. Faust DSP Workbench (12 Models, Idea Board & Prompt-to-Toy)
                  </h3>
                  <p className="text-sm text-[#8E9CB2] mt-1">
                    Live WebAssembly DSP compiler, visual Cookbook, and GHOST Prompt-to-Toy synthesis
                  </p>
                </div>
                <p className="text-xs text-[#A2B1CC]">
                  Write functional Faust code compiled in milliseconds, pick from 12 boutique preset toys (including <strong>VHS 1985 Chorus &amp; Pitch Drift</strong>, <strong>Deep Cavern Shimmer Reverb</strong>, <strong>Cassette Head Magnetic Saturator</strong>, <strong>Barberpole Infinite Phaser</strong>, and <strong>FM Glass Bell Synth</strong>), or browse the <strong>Idea Board / Cookbook</strong> tab organized by sonic tags.
                </p>
                <div className="bg-[#0E1726] border border-[#1E293B] p-3.5 rounded-xl text-xs text-[#9EADC8] space-y-1.5">
                  <div className="font-bold text-emerald-300">Prompt-to-Toy One-Click Recipes</div>
                  <p>Click quick chips such as <em>Underwater Muffled Reverb</em>, <em>Broken AM Radio</em>, <em>Laser Gun Zap</em>, or <em>Dub Siren</em> to populate the prompt and automatically have GHOST assemble and compile custom Faust DSP code in real time.</p>
                </div>
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

            {/* 9. BASIC PITCH & MIDI QUANTIZE */}
            {activeSection === 'basic_pitch' && (
              <div className="space-y-6">
                <div className="border-b border-[#1E293B] pb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Zap className="text-amber-400" />
                    9. Spotify Basic Pitch &amp; Global MIDI Quantize + Swing
                  </h3>
                  <p className="text-sm text-[#8E9CB2] mt-1">
                    Polyphonic audio-to-MIDI transcription and groove quantization
                  </p>
                </div>
                <p className="text-xs text-[#A2B1CC]">
                  Drop audio recordings (guitars, piano chords, humming, bass stems) into Basic Pitch to transcribe polyphonic MIDI sequences. Then open <strong>MIDI QUANTIZE</strong> in the Mixer header to snap selected MIDI clips or notes to <code>1/4</code>, <code>1/8</code>, <code>1/16</code>, or <code>1/32</code> grids with adjustable <strong>Swing %</strong> humanization, Quantize Strength, live preview, and non-destructive timing restore.
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
                        <td className="px-4 py-2">Cycle Active Timeline View (Pure Timeline / Timeline) &lt;-&gt; Mixer Only</td>
                        <td className="px-4 py-2 text-[#64748B]">Workspace</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-bold text-emerald-300">M / S</td>
                        <td className="px-4 py-2">Mute / Solo Active Track</td>
                        <td className="px-4 py-2 text-[#64748B]">Mixer / Tracks</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-bold text-cyan-300">Esc</td>
                        <td className="px-4 py-2">Close Modal / Popover Menu / Reset Selection</td>
                        <td className="px-4 py-2 text-[#64748B]">Modals</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 11. GHOST (THE GHOST IN THE MACHINE) */}
            {activeSection === 'buddy_duo' && (
              <div className="space-y-6">
                <div className="border-b border-[#1E293B] pb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Bot className="text-purple-400" />
                    11. GHOST (The Ghost in the Machine)
                  </h3>
                  <p className="text-sm text-[#8E9CB2] mt-1">
                    Your sole resident audio mentor, DSP architect, and studio partner across all model swaps
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-tr from-[#1B100B] to-[#0B1522] border border-amber-500/40 space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white text-sm">GHOST — Analog Sage &amp; Precision DSP Architect</h4>
                  </div>
                  <p className="text-xs text-[#C8C0B4] leading-relaxed">
                    GHOST combines studio lore, tape &amp; gain-staging instinct, and exact Faust DSP engineering. Before answering, GHOST automatically inspects your live session telemetry—BPM, time signature, active track count (Audio vs. MIDI), Gold Path preset, and Matchering status—to give concise 2–4 sentence answers referencing exact Hz/kHz frequencies and Strangelet Lab knobs.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#121626] border border-[#232F4C] space-y-2 text-xs text-[#A2B1CC]">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <span>Soul Persistence Across Model Upgrades</span>
                  </h4>
                  <p>
                    The <strong>Buddy Soul Core</strong> (XP, Rank, and persistent studio habits) is decoupled from local GGUF weights, so upgrading from a 3B model on a 6GB laptop to a 14B model on a 16GB rig preserves GHOST's entire memory.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#14121F] border border-purple-500/30 space-y-2 text-xs text-[#A2B1CC]">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2 text-purple-300">
                    <span>Movable Widget &amp; Screen Real Estate Controls</span>
                  </h4>
                  <p>
                    Dock GHOST to the sidebar or float it in any corner, fold it into a compact badge, or dismiss it completely and toggle anytime with <strong>Alt + G</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* 12. VST BROWSER, MACROS & WORKFLOWS */}
            {activeSection === 'workflows' && (
              <div className="space-y-6">
                <div className="border-b border-[#1E293B] pb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Workflow className="text-purple-400" />
                    12. Global VST Browser, Macro Engine &amp; Guided Workflows
                  </h3>
                  <p className="text-sm text-[#8E9CB2] mt-1">
                    Unified plugin parameter automation, MIDI-triggered Performance Macros, and production pipelines
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#12182B] border border-pink-500/30 space-y-2 text-xs text-[#A2B1CC]">
                  <h4 className="font-bold text-white text-sm text-pink-300">
                    Global VST Browser &amp; Macro Engine
                  </h4>
                  <ul className="list-disc list-inside space-y-1.5">
                    <li><strong>Global VST Browser:</strong> Scans tracks for active Faust/VST plugins and provides a unified Parameter Automation lane list so you can draw envelopes directly on the timeline.</li>
                    <li><strong>Macro Engine:</strong> Records live VST tweaks, volume moves, and panning sweeps as reusable Performance Macros triggered by MIDI controller buttons or baked straight to track automation lanes.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-[#101424] border border-purple-500/30 space-y-3">
                  <h4 className="font-bold text-white text-sm text-purple-300">
                    The Quantum Alchemist Pipeline: Step-by-Step
                  </h4>
                  <ol className="list-decimal list-inside space-y-2 text-xs text-[#A2B1CC]">
                    <li><strong>LSC Prompt Genesis:</strong> Collide sonic particles in the Large Sonic Collider (e.g. 88 BPM Boom-Bap Drums + Detuned Rhodes + Reese Sub).</li>
                    <li><strong>Ace-Step 1.5 Diffusion:</strong> Inject the prompt into Ace-Step 1.5 Loop Designer, select stems, and diffuse.</li>
                    <li><strong>Mixer Multitrack Ingestion:</strong> Route stems with 1 click into the multitrack console with pre-calibrated headroom.</li>
                    <li><strong>Live Guitar In &amp; Quantize/Humanizing:</strong> Arm the live input channel, record or refine MIDI with Global MIDI Quantize + Swing %, and save mix states in the SNAPSHOTS menu.</li>
                    <li><strong>Beam Splitter &amp; Gold Path Matchering:</strong> Isolate frequency bands and match commercial loudness/tonal balance via FFT Reference Matchering.</li>
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
