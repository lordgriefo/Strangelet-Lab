import React, { useState, useRef, useEffect } from 'react';
import { 
  Drum, Download, Settings, Zap, Play, Volume2, Sparkles, 
  Layers, Sliders, Activity, Disc, RefreshCw, FileCode, CheckCircle2 
} from 'lucide-react';

interface DrumPad {
  id: string;
  name: string;
  type: 'kick' | 'snare' | 'hihat' | 'tom' | 'clap' | 'cymbal' | 'perc' | 'sub';
  key: string;
  pitch: number; // semitones
  decay: number; // seconds
  color: string;
  isHit: boolean;
}

const INITIAL_PADS: DrumPad[] = [
  { id: 'p1', name: 'SUB-ATOMIC KICK', type: 'kick', key: '1', pitch: 0, decay: 0.45, color: '#FF2E63', isHit: false },
  { id: 'p2', name: 'NEON CRACK SNARE', type: 'snare', key: '2', pitch: 0, decay: 0.28, color: '#00F0FF', isHit: false },
  { id: 'p3', name: 'PRISM CLOSED HAT', type: 'hihat', key: '3', pitch: 0, decay: 0.08, color: '#FFD700', isHit: false },
  { id: 'p4', name: 'QUARK OPEN HAT', type: 'hihat', key: '4', pitch: 0, decay: 0.35, color: '#F59E0B', isHit: false },
  { id: 'p5', name: 'PHOTON CLAP', type: 'clap', key: 'Q', pitch: 0, decay: 0.22, color: '#EC4899', isHit: false },
  { id: 'p6', name: 'TACHYON LOW TOM', type: 'tom', key: 'W', pitch: -2, decay: 0.4, color: '#8B5CF6', isHit: false },
  { id: 'p7', name: 'SYNTH CYMBAL CRASH', type: 'cymbal', key: 'E', pitch: 0, decay: 0.8, color: '#10B981', isHit: false },
  { id: 'p8', name: 'DEEP 808 SUB BASS', type: 'sub', key: 'R', pitch: -12, decay: 1.2, color: '#6366F1', isHit: false },
];

export const DrumDesigner: React.FC = () => {
  const [pads, setPads] = useState<DrumPad[]>(INITIAL_PADS);
  const [selectedPadId, setSelectedPadId] = useState<string>(INITIAL_PADS[0].id);
  const [isProcessingSep, setIsProcessingSep] = useState<boolean>(false);
  const [separationProgress, setSeparationProgress] = useState<number>(0);
  const [separatedStems, setSeparatedStems] = useState<string[]>([
    'Kick Transients', 'Snare Wire & Shell', 'Cymbals / Bleed', 'Percussion Residual'
  ]);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Real Web Audio Drum Synthesizer
  const playDrumSound = (pad: DrumPad) => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const pitchMultiplier = Math.pow(2, pad.pitch / 12);

    // Visual trigger
    setPads(prev => prev.map(p => p.id === pad.id ? { ...p, isHit: true } : p));
    setTimeout(() => {
      setPads(prev => prev.map(p => p.id === pad.id ? { ...p, isHit: false } : p));
    }, 150);

    if (pad.type === 'kick' || pad.type === 'sub') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const baseFreq = (pad.type === 'sub' ? 55 : 130) * pitchMultiplier;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(pad.type === 'sub' ? 30 : 38, now + pad.decay);

      gain.gain.setValueAtTime(1.0, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + pad.decay);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + pad.decay);
    } else if (pad.type === 'snare' || pad.type === 'clap') {
      // Noise burst for snare / clap snap
      const bufferSize = ctx.sampleRate * pad.decay;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime((pad.type === 'clap' ? 1800 : 2500) * pitchMultiplier, now);
      filter.Q.setValueAtTime(1.2, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.9, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + pad.decay);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      whiteNoise.start(now);

      // Body tone for snare
      if (pad.type === 'snare') {
        const osc = ctx.createOscillator();
        const bodyGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180 * pitchMultiplier, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.1);
        bodyGain.gain.setValueAtTime(0.7, now);
        bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(bodyGain);
        bodyGain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      }
    } else if (pad.type === 'hihat' || pad.type === 'cymbal') {
      // Highpass filtered metallic noise
      const bufferSize = ctx.sampleRate * pad.decay;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(7000 * pitchMultiplier, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + pad.decay);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
    } else {
      // Tom
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200 * pitchMultiplier, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + pad.decay);
      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + pad.decay);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + pad.decay);
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;
      const pressedKey = e.key.toUpperCase();
      const matchedPad = pads.find(p => p.key === pressedKey);
      if (matchedPad) {
        playDrumSound(matchedPad);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pads]);

  const handleSimulateRoformer = () => {
    setIsProcessingSep(true);
    setSeparationProgress(0);
    const interval = setInterval(() => {
      setSeparationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsProcessingSep(false);
          setExportNotice('✨ Roformer DrumSep 2.0 isolated 4 clean transient drum layers!');
          setTimeout(() => setExportNotice(null), 4000);
          return 100;
        }
        return prev + 25;
      });
    }, 400);
  };

  const handleExportSfz = (format: string) => {
    const sfzContent = `// STRANGELET LAB DRUMKIT DEFINITION - ${format}
<control>
default_path=samples/
<global>
loop_mode=no_loop
volume=0

${pads.map((p, idx) => `
<group> key=${36 + idx}
<region> sample=${p.name.replace(/\s+/g, '_').toLowerCase()}.wav tune=${p.pitch * 100}
`).join('')}`;

    const blob = new Blob([sfzContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Strangelet_Kit_${format.toLowerCase()}.sfz`;
    a.click();
    URL.revokeObjectURL(url);

    setExportNotice(`✨ Downloaded ${format} Instrument Mapping Map!`);
    setTimeout(() => setExportNotice(null), 3500);
  };

  const selectedPad = pads.find(p => p.id === selectedPadId) || pads[0];

  return (
    <div className="h-full w-full bg-[#05070E] flex flex-col overflow-y-auto p-4 md:p-6 text-white font-mono select-none">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1A2338]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFD700]/20 via-[#00F0FF]/20 to-[#FF2E63]/20 border border-[#FFD700] flex items-center justify-center shadow-[0_0_20px_rgba(255,215,0,0.3)]">
            <Drum size={22} className="text-[#FFD700]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-black uppercase tracking-widest text-[#FFD700]">
                STRANGELET LAB
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 font-bold">
                ROFORMER DRUMSEP ENGINE
              </span>
            </div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              SUBATOMIC DRUMKIT & TRANSIENT DESIGNER
            </h1>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExportSfz('SFZ')}
            className="px-3.5 py-1.5 rounded-xl bg-[#101726] border border-[#00F0FF]/40 text-[#00F0FF] hover:bg-[#00F0FF] hover:text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Download size={13} />
            <span>EXPORT SFZ KIT</span>
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {exportNotice && (
        <div className="mt-3 px-3.5 py-2 rounded-lg bg-[#00F0FF]/15 border border-[#00F0FF] text-xs font-bold text-white flex items-center justify-between shadow-[0_0_15px_rgba(0,240,255,0.3)]">
          <span>{exportNotice}</span>
          <CheckCircle2 size={15} className="text-[#00F0FF]" />
        </div>
      )}

      {/* Main Grid Workspace */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: 8-Pad Drum Performance Surface */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="p-4 bg-[#080B15] border border-[#1A2338] rounded-2xl shadow-inner">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#141C2E]">
              <div className="flex items-center gap-2 text-xs text-[#94A3B8] font-bold">
                <Sparkles size={14} className="text-[#FFD700]" />
                <span>DYNAMIC VELOCITY PADS (PRESS KEYBOARD 1-4, Q-R)</span>
              </div>
              <span className="text-[10px] text-[#64748B]">8 SYNTHESIS VOICES</span>
            </div>

            {/* 4x2 Pad Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {pads.map((pad) => {
                const isSelected = pad.id === selectedPadId;
                return (
                  <div
                    key={pad.id}
                    onClick={() => {
                      setSelectedPadId(pad.id);
                      playDrumSound(pad);
                    }}
                    className={`relative h-32 rounded-2xl border p-3 flex flex-col justify-between transition-all duration-100 cursor-pointer select-none group shadow-lg ${
                      pad.isHit
                        ? 'scale-95 brightness-150 shadow-[0_0_25px_currentColor]'
                        : isSelected
                          ? 'ring-2 ring-white/80 scale-[1.01]'
                          : 'hover:border-[#38BDF8]/60 hover:scale-[1.01]'
                    }`}
                    style={{
                      backgroundColor: pad.isHit ? pad.color : '#090E1A',
                      borderColor: isSelected ? '#FFFFFF' : pad.color,
                      color: pad.color
                    }}
                  >
                    {/* Top Row: Shortcut & Status */}
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-lg bg-black/60 text-white font-mono font-black text-xs border border-white/20">
                        {pad.key}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-white/80">
                        {pad.type}
                      </span>
                    </div>

                    {/* Center Icon Graphic */}
                    <div className="flex items-center justify-center">
                      <div 
                        className={`w-10 h-10 rounded-full border border-white/20 flex items-center justify-center transition-transform ${
                          pad.isHit ? 'scale-125 bg-white text-black' : 'bg-black/40 text-white'
                        }`}
                      >
                        <Drum size={18} />
                      </div>
                    </div>

                    {/* Bottom Label */}
                    <div>
                      <div className="text-xs font-black text-white truncate">
                        {pad.name}
                      </div>
                      <div className="text-[9px] text-white/60 font-mono">
                        Pitch: {pad.pitch > 0 ? `+${pad.pitch}` : pad.pitch}st • {pad.decay}s
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Pad Deep Transient Sculptor */}
          <div className="p-4 bg-[#080B15] border border-[#1A2338] rounded-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#141C2E]">
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-[#00F0FF]" />
                <span className="text-xs font-bold text-white">
                  TRANSIENT SCULPTOR: {selectedPad.name}
                </span>
              </div>
              <button
                onClick={() => playDrumSound(selectedPad)}
                className="px-3 py-1 rounded-lg bg-[#00F0FF] text-black font-bold text-[10px] hover:brightness-110 flex items-center gap-1"
              >
                <Play size={10} fill="currentColor" /> AUDITION
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Pitch */}
              <div className="p-2.5 bg-[#04060C] border border-[#141C2E] rounded-xl flex flex-col justify-between gap-1">
                <div className="flex justify-between">
                  <span className="text-[#888]">Tuning Pitch</span>
                  <span className="text-[#FFD700] font-bold">{selectedPad.pitch} semitones</span>
                </div>
                <input
                  type="range"
                  min={-12}
                  max={12}
                  step={1}
                  value={selectedPad.pitch}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setPads(prev => prev.map(p => p.id === selectedPad.id ? { ...p, pitch: val } : p));
                  }}
                  className="w-full accent-[#00F0FF] cursor-pointer"
                />
              </div>

              {/* Decay */}
              <div className="p-2.5 bg-[#04060C] border border-[#141C2E] rounded-xl flex flex-col justify-between gap-1">
                <div className="flex justify-between">
                  <span className="text-[#888]">Decay Envelope</span>
                  <span className="text-[#00F0FF] font-bold">{selectedPad.decay}s</span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={2.0}
                  step={0.05}
                  value={selectedPad.decay}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setPads(prev => prev.map(p => p.id === selectedPad.id ? { ...p, decay: val } : p));
                  }}
                  className="w-full accent-[#FFD700] cursor-pointer"
                />
              </div>

              {/* Color Assignment */}
              <div className="p-2.5 bg-[#04060C] border border-[#141C2E] rounded-xl flex flex-col justify-between gap-1">
                <span className="text-[#888]">Spectrum Glow Color</span>
                <div className="flex items-center gap-2 mt-1">
                  {['#FF2E63', '#00F0FF', '#FFD700', '#10B981', '#8B5CF6', '#EC4899'].map(c => (
                    <button
                      key={c}
                      onClick={() => setPads(prev => prev.map(p => p.id === selectedPad.id ? { ...p, color: c } : p))}
                      className="w-5 h-5 rounded-full border border-white/40 cursor-pointer"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Roformer DrumSep Multi-Stem Separation */}
        <div className="flex flex-col gap-4">
          <div className="p-4 bg-[#080B15] border border-[#1A2338] rounded-2xl flex flex-col gap-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#141C2E]">
              <Zap size={15} className="text-[#FFD700]" />
              <span className="text-xs font-bold text-white uppercase">
                ROFORMER DRUMSEP 2.0
              </span>
            </div>

            <p className="text-[11px] text-[#64748B] leading-relaxed">
              Neural multi-target stem isolation separating acoustic and synthetic drums into isolated transient stems.
            </p>

            <button
              onClick={handleSimulateRoformer}
              disabled={isProcessingSep}
              className={`w-full py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
                isProcessingSep
                  ? 'bg-[#1E293B] text-[#94A3B8] cursor-wait'
                  : 'bg-gradient-to-r from-[#FFD700] via-[#00F0FF] to-[#FF2E63] text-black hover:brightness-110 shadow-md'
              }`}
            >
              {isProcessingSep ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
              <span>{isProcessingSep ? `SEPARATING STEMS (${separationProgress}%)` : 'RUN ROFORMER DRUMSEP'}</span>
            </button>

            {/* Separated Stems Preview */}
            <div className="mt-2 space-y-2">
              {separatedStems.map((stem, i) => (
                <div key={stem} className="p-2.5 bg-[#05070E] border border-[#141C2E] rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#00F0FF]" />
                    <span className="text-white font-bold">{stem}</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#101726] text-[#64748B] border border-[#1E293B]">
                    ISOLATED
                  </span>
                </div>
              ))}
            </div>

            {/* Formats Export Grid */}
            <div className="pt-3 border-t border-[#141C2E] flex flex-col gap-2">
              <span className="text-[10px] text-[#64748B] font-bold">EXPORT TO SAMPLER FORMATS:</span>
              <div className="grid grid-cols-3 gap-2">
                {['SFZ', 'ABLETON', 'KONTAKT'].map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => handleExportSfz(fmt)}
                    className="py-1.5 rounded-lg bg-[#0C1220] hover:bg-[#142038] border border-[#1E293B] text-[10px] font-bold text-[#CBD5E1] hover:text-[#00F0FF] transition-all"
                  >
                    .{fmt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrumDesigner;
