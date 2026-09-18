import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Check, Mic, Sparkles, Layers, Zap, Radio, 
  ArrowRight, Workflow, Sliders, Volume2, Clock, 
  PlusCircle, Disc, ShieldCheck, Activity, Cpu, ChevronRight
} from 'lucide-react';
import { ProjectTemplate, View } from '../types';
import { ROUTING_TEMPLATES } from '../routingTemplates';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (
    template: ProjectTemplate,
    config: { name: string; bpm: number; sampleRate: number; bitDepth: number }
  ) => void;
  currentSessionName?: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  RECORDING: Mic,
  MASTERING: Sparkles,
  ELECTRONIC: Zap,
  BROADCAST: Radio,
  CUSTOM: PlusCircle,
};

const TEMPLATE_ICONS: Record<string, any> = {
  'vocal-tracking': Mic,
  'mastering-chain': Sparkles,
  'full-band': Layers,
  'electronic-beat': Zap,
  'podcast-broadcast': Radio,
  'clean-slate': PlusCircle
};

const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
  currentSessionName
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('vocal-tracking');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [projectName, setProjectName] = useState<string>('Vocal_Session_Take01.slp');
  const [bpm, setBpm] = useState<number>(124);
  const [sampleRate, setSampleRate] = useState<number>(48000);
  const [bitDepth, setBitDepth] = useState<number>(24);
  const [activeTab, setActiveTab] = useState<'SIGNAL_FLOW' | 'TRACKS' | 'HIGHLIGHTS'>('SIGNAL_FLOW');

  const selectedTemplate = useMemo(() => {
    return ROUTING_TEMPLATES.find(t => t.id === selectedTemplateId) || ROUTING_TEMPLATES[0];
  }, [selectedTemplateId]);

  // When selected template changes, update default parameters to recommended values
  useEffect(() => {
    if (selectedTemplate) {
      const sanitizedName = selectedTemplate.name
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_');
      setProjectName(`${sanitizedName}_Session.slp`);
      setBpm(selectedTemplate.defaultTempo);
      setSampleRate(selectedTemplate.sampleRate);
      setBitDepth(selectedTemplate.bitDepth);
    }
  }, [selectedTemplateId]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredTemplates = ROUTING_TEMPLATES.filter(template => {
    if (selectedCategory === 'ALL') return true;
    return template.category === selectedCategory;
  });

  const handleLaunch = () => {
    onCreateProject(selectedTemplate, {
      name: projectName.trim() || `${selectedTemplate.name}_Session.slp`,
      bpm,
      sampleRate,
      bitDepth
    });
    onClose();
  };

  const TemplateIcon = TEMPLATE_ICONS[selectedTemplate.id] || Workflow;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-[#0D0D11] border border-[#26619C]/80 rounded-2xl w-full max-w-5xl h-[92vh] max-h-[820px] flex flex-col shadow-[0_0_50px_rgba(38,97,156,0.25)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#222] bg-[#0A0A0E] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#FFD700]/10 border border-[#FFD700]/30 flex items-center justify-center text-[#FFD700]">
              <Workflow size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2 font-mono">
                  NEW PROJECT <span className="text-[#FF8C00]">//</span> ROUTING TEMPLATES
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#1E1E28] text-[#818CF8] border border-[#333]">
                  STRANGELET LAB v1.0
                </span>
              </div>
              <p className="text-xs text-[#888] mt-0.5">
                Initialize session topology with pre-wired summing buses, low-latency cue feeds, and insert DSP chains.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#666] hover:text-white hover:bg-[#1C1C24] transition-colors border border-transparent hover:border-[#333]"
            title="Close modal (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body - 2 Columns */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Column: Template Selection & Categories */}
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-[#1E1E28] bg-[#08080C] flex flex-col shrink-0">
            {/* Category Filter Pills */}
            <div className="p-3 border-b border-[#1A1A22] space-y-1.5 shrink-0">
              <div className="text-[10px] font-mono text-[#555] uppercase tracking-wider px-1">
                Workflow Category
              </div>
              <div className="flex flex-wrap gap-1">
                {['ALL', 'RECORDING', 'MASTERING', 'ELECTRONIC', 'BROADCAST', 'CUSTOM'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-1 rounded text-[11px] font-mono transition-all ${
                      selectedCategory === cat 
                        ? 'bg-[#FFD700] text-black font-bold shadow-[0_0_10px_rgba(255,215,0,0.3)]' 
                        : 'bg-[#14141C] text-[#888] hover:text-[#CCC] hover:bg-[#1A1A26] border border-[#222]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Card List */}
            <div className="flex-1 p-3 space-y-2 overflow-y-auto custom-scrollbar">
              {filteredTemplates.map(template => {
                const IconComponent = TEMPLATE_ICONS[template.id] || Workflow;
                const isSelected = template.id === selectedTemplateId;
                
                return (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplateId(template.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all border relative flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#1E1C12] to-[#14141F] border-[#FFD700] shadow-[0_0_18px_rgba(255,215,0,0.15)]'
                        : 'bg-[#0E0E14] border-[#1C1C26] hover:border-[#333] hover:bg-[#13131C]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-[#FFD700] text-black' : 'bg-[#1A1A26] text-[#A0A0A0]'
                        }`}>
                          <IconComponent size={14} />
                        </div>
                        <span className={`text-sm font-semibold tracking-tight ${
                          isSelected ? 'text-[#FFD700]' : 'text-[#E0E0E0]'
                        }`}>
                          {template.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#181822] text-[#888] border border-[#282836]">
                        {template.category}
                      </span>
                    </div>

                    <p className="text-xs text-[#777] line-clamp-2 pl-9 leading-relaxed">
                      {template.tagline}
                    </p>

                    <div className="flex items-center gap-2 pt-1 pl-9 text-[10px] font-mono text-[#555]">
                      <span>{template.tracks.length} Tracks</span>
                      <span>•</span>
                      <span>{template.buses.length} Buses</span>
                      <span>•</span>
                      <span className="text-[#818CF8]">{template.defaultTempo} BPM</span>
                    </div>

                    {isSelected && (
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#FFD700]">
                        <ChevronRight size={18} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Current Active Session Info Footnote */}
            <div className="p-3 border-t border-[#1A1A22] bg-[#07070A] text-[11px] font-mono text-[#555] flex items-center justify-between">
              <span className="truncate">Current: <span className="text-[#999]">{currentSessionName || 'Project_Neon_Sky.slp'}</span></span>
              <Disc size={13} className="text-[#FF8C00] shrink-0" />
            </div>
          </div>

          {/* Right Column: Template Inspector & Session Configuration */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#0A0A0F] overflow-y-auto custom-scrollbar">
            {/* Template Header Banner */}
            <div className="p-6 border-b border-[#1E1E28] bg-gradient-to-b from-[#12121A] to-[#0A0A0F] shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFD700]/20 to-[#FF8C00]/10 border border-[#FFD700]/40 flex items-center justify-center text-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.15)]">
                    <TemplateIcon size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-white tracking-tight">
                        {selectedTemplate.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#FF8C00]/20 text-[#FF8C00] border border-[#FF8C00]/30 uppercase">
                        {selectedTemplate.category}
                      </span>
                    </div>
                    <p className="text-xs text-[#888] mt-1">
                      {selectedTemplate.tagline}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <div className="px-2.5 py-1 rounded bg-[#161622] border border-[#282838] text-[11px] font-mono text-[#A0A0A0]">
                    Routes to: <span className="text-[#FFD700] font-bold">{selectedTemplate.recommendedView}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#A0A0A0] mt-3 leading-relaxed bg-[#0E0E16] p-3 rounded-lg border border-[#1E1E28]">
                {selectedTemplate.description}
              </p>
            </div>

            {/* Session Settings Form */}
            <div className="p-6 border-b border-[#1E1E28] bg-[#0C0C12] space-y-4 shrink-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono text-[#FFD700] uppercase tracking-wider flex items-center gap-2">
                  <Sliders size={14} /> Project Initialization Parameters
                </h4>
                <span className="text-[10px] font-mono text-[#666]">
                  Strangelet Audio Engine Core
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                {/* Session File Name */}
                <div className="md:col-span-6 space-y-1.5">
                  <label className="text-[11px] font-mono text-[#888] block">
                    Session File Name (.slp)
                  </label>
                  <div className="relative">
                    <input 
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="w-full bg-[#14141E] border border-[#282838] focus:border-[#FFD700] text-white px-3 py-2 rounded-lg text-xs font-mono focus:outline-none transition-colors"
                      placeholder="My_Session_01.slp"
                    />
                  </div>
                </div>

                {/* Tempo (BPM) */}
                <div className="md:col-span-6 space-y-1.5">
                  <label className="text-[11px] font-mono text-[#888] flex items-center justify-between">
                    <span>Project Tempo</span>
                    <span className="text-[#FFD700]">{bpm} BPM</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setBpm(Math.max(40, bpm - 1))}
                      className="px-2.5 py-2 bg-[#14141E] border border-[#282838] rounded-lg text-xs text-white hover:bg-[#1E1E2C] active:bg-[#2A2A3E]"
                    >
                      -1
                    </button>
                    <input 
                      type="range"
                      min={60}
                      max={180}
                      value={bpm}
                      onChange={(e) => setBpm(Number(e.target.value))}
                      className="flex-1 accent-[#FFD700] cursor-pointer"
                    />
                    <button 
                      onClick={() => setBpm(Math.min(240, bpm + 1))}
                      className="px-2.5 py-2 bg-[#14141E] border border-[#282838] rounded-lg text-xs text-white hover:bg-[#1E1E2C] active:bg-[#2A2A3E]"
                    >
                      +1
                    </button>
                  </div>
                </div>

                {/* Sample Rate Selector */}
                <div className="md:col-span-6 space-y-1.5">
                  <label className="text-[11px] font-mono text-[#888] block">
                    Master Sample Rate
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: '44.1 kHz', val: 44100 },
                      { label: '48.0 kHz', val: 48000 },
                      { label: '96.0 kHz', val: 96000 }
                    ].map(sr => (
                      <button
                        key={sr.val}
                        type="button"
                        onClick={() => setSampleRate(sr.val)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-mono border transition-all ${
                          sampleRate === sr.val
                            ? 'bg-[#FF8C00]/20 border-[#FF8C00] text-[#FF8C00] font-bold shadow-[0_0_8px_rgba(255,140,0,0.2)]'
                            : 'bg-[#14141E] border-[#222] text-[#888] hover:text-[#CCC]'
                        }`}
                      >
                        {sr.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bit Depth Selector */}
                <div className="md:col-span-6 space-y-1.5">
                  <label className="text-[11px] font-mono text-[#888] block">
                    Audio Bit Depth
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: '24-bit PCM', val: 24 },
                      { label: '32-bit Float', val: 32 }
                    ].map(bd => (
                      <button
                        key={bd.val}
                        type="button"
                        onClick={() => setBitDepth(bd.val)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-mono border transition-all ${
                          bitDepth === bd.val
                            ? 'bg-[#10B981]/20 border-[#10B981] text-[#10B981] font-bold shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                            : 'bg-[#14141E] border-[#222] text-[#888] hover:text-[#CCC]'
                        }`}
                      >
                        {bd.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Template Detailed Tabs: SIGNAL FLOW | TRACKS | HIGHLIGHTS */}
            <div className="p-6 flex-1 flex flex-col min-h-0">
              <div className="flex border-b border-[#222] mb-4 gap-4">
                <button
                  onClick={() => setActiveTab('SIGNAL_FLOW')}
                  className={`pb-2 text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    activeTab === 'SIGNAL_FLOW'
                      ? 'text-[#FFD700] border-b-2 border-[#FFD700] font-bold'
                      : 'text-[#777] hover:text-[#BBB]'
                  }`}
                >
                  <Workflow size={13} /> Signal Flow Blueprint
                </button>
                <button
                  onClick={() => setActiveTab('TRACKS')}
                  className={`pb-2 text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    activeTab === 'TRACKS'
                      ? 'text-[#FFD700] border-b-2 border-[#FFD700] font-bold'
                      : 'text-[#777] hover:text-[#BBB]'
                  }`}
                >
                  <Volume2 size={13} /> Channels & Inserts ({selectedTemplate.tracks.length})
                </button>
                <button
                  onClick={() => setActiveTab('HIGHLIGHTS')}
                  className={`pb-2 text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    activeTab === 'HIGHLIGHTS'
                      ? 'text-[#FFD700] border-b-2 border-[#FFD700] font-bold'
                      : 'text-[#777] hover:text-[#BBB]'
                  }`}
                >
                  <ShieldCheck size={13} /> Routing Highlights
                </button>
              </div>

              {/* Tab 1: Signal Flow Blueprint */}
              {activeTab === 'SIGNAL_FLOW' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="bg-[#0D0D14] border border-[#202030] p-4 rounded-xl space-y-3">
                    <div className="text-[11px] font-mono text-[#888] uppercase tracking-wider flex items-center justify-between">
                      <span>End-To-End Signal Flow Topology</span>
                      <span className="text-[#38BDF8]">Calibrated Latency: &lt; 1.5ms</span>
                    </div>

                    <div className="space-y-2">
                      {selectedTemplate.signalFlowDiagram.map((step, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center gap-3 p-2.5 rounded-lg bg-[#12121C] border border-[#1E1E2A]"
                        >
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0" 
                            style={{ backgroundColor: step.color, boxShadow: `0 0 8px ${step.color}66` }} 
                          />
                          <span className="text-[10px] font-mono font-bold uppercase w-28 shrink-0 text-white tracking-wider">
                            {step.stage}
                          </span>
                          <span className="text-xs text-[#BBB] font-mono flex-1">
                            {step.description}
                          </span>
                          <span className="text-[10px] font-mono text-[#555] shrink-0">
                            STEP 0{idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Configured Buses */}
                  <div className="bg-[#0D0D14] border border-[#202030] p-4 rounded-xl">
                    <div className="text-[11px] font-mono text-[#888] uppercase tracking-wider mb-2">
                      Internal Routing Summing Buses
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {selectedTemplate.buses.map(bus => (
                        <div key={bus.id} className="p-2.5 bg-[#12121C] border border-[#1E1E2A] rounded-lg">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: bus.color }} />
                            <span className="text-xs font-semibold text-white truncate">{bus.name}</span>
                          </div>
                          <p className="text-[10px] font-mono text-[#777] truncate">
                            &rarr; {bus.destination}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Channels & Inserts */}
              {activeTab === 'TRACKS' && (
                <div className="space-y-2.5 animate-in fade-in duration-150">
                  {selectedTemplate.tracks.map((track, idx) => (
                    <div 
                      key={track.id}
                      className="p-3 bg-[#0E0E16] border border-[#1F1F2C] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div 
                          className="w-3 h-10 rounded-sm shrink-0" 
                          style={{ backgroundColor: track.color }} 
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-[#555]">0{idx + 1}</span>
                            <h5 className="text-sm font-bold text-white truncate">{track.name}</h5>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#1A1A28] text-[#888] uppercase border border-[#282838]">
                              {track.isMono ? 'MONO' : 'STEREO'}
                            </span>
                            {track.type === 'midi' && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#3B82F6]/20 text-[#3B82F6] uppercase border border-[#3B82F6]/40">
                                MIDI
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[10px] font-mono text-[#666] mt-0.5">
                            <span>Input: <span className="text-[#999]">{track.inputSource || 'Line In'}</span></span>
                            <span>•</span>
                            <span>Bus: <span className="text-[#FF8C00]">{track.bus || 'Master'}</span></span>
                            {track.pan !== 0 && (
                              <>
                                <span>•</span>
                                <span>Pan: <span className="text-[#38BDF8]">{track.pan < 0 ? `L${Math.abs(Math.round(track.pan * 100))}%` : `R${Math.round(track.pan * 100)}%`}</span></span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Preloaded VST Plugins / Inserts */}
                      <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
                        {track.vsts && track.vsts.length > 0 ? (
                          track.vsts.map((vst, vIdx) => (
                            <span 
                              key={vIdx}
                              className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#161622] text-[#A0A0B0] border border-[#28283C]"
                            >
                              {vst}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] font-mono text-[#555]">No default inserts</span>
                        )}
                        {track.sends && track.sends.length > 0 && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30">
                            {track.sends.length} Aux Send{track.sends.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 3: Highlights */}
              {activeTab === 'HIGHLIGHTS' && (
                <div className="bg-[#0D0D14] border border-[#202030] p-4 rounded-xl space-y-3 animate-in fade-in duration-150">
                  <div className="text-[11px] font-mono text-[#888] uppercase tracking-wider mb-2">
                    Architectural Advantages & Calibration
                  </div>
                  <ul className="space-y-2.5">
                    {selectedTemplate.routingHighlights.map((highlight, hIdx) => (
                      <li key={hIdx} className="flex items-start gap-2.5 text-xs text-[#CCC] leading-relaxed">
                        <div className="w-5 h-5 rounded-full bg-[#10B981]/20 border border-[#10B981]/40 flex items-center justify-center text-[#10B981] shrink-0 mt-0.5">
                          <Check size={12} />
                        </div>
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 p-3 bg-[#131320] border border-[#26619C]/50 rounded-lg text-xs text-[#888] font-mono flex items-center gap-2">
                    <Activity size={14} className="text-[#FFD700] shrink-0" />
                    <span>
                      Hardware Engine will initialize {selectedTemplate.tracks.length} DSP channels into 6GB VRAM memory buffer with zero artifact headroom.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#222] bg-[#0A0A0E] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#777] font-mono">
            <span>Template ID: <span className="text-[#AAA]">{selectedTemplate.id}</span></span>
            <span>•</span>
            <span>Recommended View: <span className="text-[#FFD700]">{selectedTemplate.recommendedView}</span></span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-[#333] hover:border-[#555] text-sm text-[#A0A0A0] hover:text-white rounded-lg transition-colors font-mono"
            >
              Cancel
            </button>
            <button
              onClick={handleLaunch}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#FFD700] to-[#FF8C00] text-black font-bold rounded-lg text-sm transition-all hover:brightness-110 shadow-[0_0_20px_rgba(255,215,0,0.3)] active:scale-[0.98]"
            >
              <span>Initialize {selectedTemplate.name}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewProjectModal;
