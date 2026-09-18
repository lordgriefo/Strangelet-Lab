import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, Upload, Settings, Zap, Play, Pause, Volume2, 
  Sparkles, Radio, Activity, RefreshCw, CheckCircle2, Sliders, Layers 
} from 'lucide-react';

interface VoiceModel {
  id: string;
  name: string;
  category: string;
  vram: string;
  formantShift: number; // semitones
  pitchShift: number;
  genderMorph: number; // -1 to 1 (Male to Female)
  color: string;
}

const VOICE_MODELS: VoiceModel[] = [
  { id: 'vm-1', name: 'STRANGELET NEURAL LEAD', category: 'Singing AI', vram: '1.4GB', formantShift: 0, pitchShift: 0, genderMorph: 0, color: '#00F0FF' },
  { id: 'vm-2', name: 'CYBERPUNK DEEP VOCODER', category: 'Synthetic', vram: '0.8GB', formantShift: -4, pitchShift: -12, genderMorph: -0.8, color: '#FF2E63' },
  { id: 'vm-3', name: 'ETHEREAL GHOST CHORUS', category: 'Harmonic', vram: '1.9GB', formantShift: 5, pitchShift: 7, genderMorph: 0.7, color: '#FFD700' },
  { id: 'vm-4', name: 'LYNCHIAN VELVET WHISPER', category: 'Ambient Tone', vram: '1.1GB', formantShift: -2, pitchShift: -5, genderMorph: -0.3, color: '#C084FC' },
];

export const Aura: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState<VoiceModel>(VOICE_MODELS[0]);
  const [pitchShift, setPitchShift] = useState<number>(0);
  const [formantShift, setFormantShift] = useState<number>(0);
  const [indexRate, setIndexRate] = useState<number>(0.85);
  const [protectConsonants, setProtectConsonants] = useState<number>(0.65);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isPlayingAudition, setIsPlayingAudition] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Formant Canvas Spectrum Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    const renderSpectrum = () => {
      ctx.fillStyle = '#05070E';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid lines
      ctx.strokeStyle = '#141C2E';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Draw Formant Resonances (F1, F2, F3)
      const f1 = 600 + (formantShift * 40);
      const f2 = 1800 + (formantShift * 90);
      const f3 = 2800 + (formantShift * 110);

      const drawFormantPeak = (freq: number, amplitude: number, color: string) => {
        const xPos = (Math.log10(freq / 100) / Math.log10(10000 / 100)) * canvas.width;
        const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
        grad.addColorStop(0, `${color}00`);
        grad.addColorStop(1, `${color}AA`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(xPos - 45, canvas.height);
        ctx.quadraticCurveTo(xPos, canvas.height - amplitude, xPos + 45, canvas.height);
        ctx.fill();

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      };

      const baseAmp = isPlayingAudition ? 120 + Math.sin(phase) * 20 : 60;
      drawFormantPeak(f1, baseAmp * 0.9, selectedModel.color);
      drawFormantPeak(f2, baseAmp * 0.7, '#FFD700');
      drawFormantPeak(f3, baseAmp * 0.5, '#FF2E63');

      phase += 0.08;
      animFrameRef.current = requestAnimationFrame(renderSpectrum);
    };

    renderSpectrum();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [formantShift, selectedModel, isPlayingAudition]);

  // Audio preview for auditioning formant morphing
  const toggleAudition = () => {
    if (isPlayingAudition) {
      stopAudition();
    } else {
      startAudition();
    }
  };

  const stopAudition = () => {
    if (oscRef.current) {
      try {
        oscRef.current.stop();
        oscRef.current.disconnect();
      } catch (e) {}
      oscRef.current = null;
    }
    setIsPlayingAudition(false);
  };

  const startAudition = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const baseFreq = 220 * Math.pow(2, pitchShift / 12);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);

      // Formant Bandpass Filters
      const f1 = ctx.createBiquadFilter();
      f1.type = 'bandpass';
      f1.frequency.setValueAtTime(750 + formantShift * 50, ctx.currentTime);
      f1.Q.setValueAtTime(4.0, ctx.currentTime);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);

      osc.connect(f1);
      f1.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      oscRef.current = osc;
      gainRef.current = gain;
      setIsPlayingAudition(true);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    return () => {
      stopAudition();
    };
  }, []);

  const handleRunRvc = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setStatusMessage(`✨ Model "${selectedModel.name}" transformed vocal with high-order formant coherence!`);
      setTimeout(() => setStatusMessage(null), 4000);
    }, 1800);
  };

  return (
    <div className="h-full w-full bg-[#05070E] flex flex-col overflow-y-auto p-4 md:p-6 text-white font-mono select-none">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1A2338]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00F0FF]/20 via-[#FFD700]/20 to-[#FF2E63]/20 border border-[#00F0FF] flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.3)]">
            <Mic size={22} className="text-[#00F0FF]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-black uppercase tracking-widest text-[#FFD700]">
                STRANGELET LAB
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 font-bold">
                NEURAL RVC 2.0
              </span>
            </div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              AURA VOICE MORPH & HARMONIC FORMANTS
            </h1>
          </div>
        </div>

        {/* Audition Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAudition}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              isPlayingAudition
                ? 'bg-[#FF2E63] text-white shadow-[0_0_15px_#FF2E63]'
                : 'bg-[#101726] border border-[#00F0FF]/40 text-[#00F0FF] hover:bg-[#00F0FF] hover:text-black'
            }`}
          >
            {isPlayingAudition ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlayingAudition ? 'STOP MORPH AUDITION' : 'AUDITION FORMANT TONE'}</span>
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {statusMessage && (
        <div className="mt-3 px-3.5 py-2 rounded-lg bg-[#00F0FF]/15 border border-[#00F0FF] text-xs font-bold text-white flex items-center justify-between shadow-[0_0_15px_rgba(0,240,255,0.3)]">
          <span>{statusMessage}</span>
          <CheckCircle2 size={15} className="text-[#00F0FF]" />
        </div>
      )}

      {/* Workspace Grid */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Model Selector & File Uploader */}
        <div className="flex flex-col gap-4">
          <div className="p-4 bg-[#080B15] border border-[#1A2338] rounded-2xl flex flex-col gap-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#141C2E]">
              <Radio size={14} className="text-[#00F0FF]" />
              <span className="text-xs font-bold text-white uppercase">NEURAL RVC PRESET MODELS</span>
            </div>

            <div className="space-y-2">
              {VOICE_MODELS.map((model) => {
                const isSelected = model.id === selectedModel.id;
                return (
                  <div
                    key={model.id}
                    onClick={() => setSelectedModel(model)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-white bg-[#101728] shadow-md'
                        : 'border-[#1E293B] bg-[#090D18] hover:border-[#38BDF8]/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: model.color }} 
                        />
                        <span className="text-xs font-bold text-white">{model.name}</span>
                      </div>
                      <div className="text-[10px] text-[#64748B] mt-0.5">
                        {model.category} • VRAM: {model.vram}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40">
                        ACTIVE
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Model File Dropzone */}
          <div className="p-4 bg-[#080B15] border border-[#1A2338] rounded-2xl flex flex-col items-center justify-center text-center p-6 border-dashed border-2 hover:border-[#FFD700] transition-colors cursor-pointer">
            <Upload size={28} className="text-[#64748B] mb-2" />
            <div className="text-xs font-bold text-white">Import Custom RVC Model</div>
            <div className="text-[10px] text-[#64748B] mt-1">Supports .pth checkpoint & .index feature files</div>
          </div>
        </div>

        {/* Center & Right Column: Formant Spectrum & Morphing Controls */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Live Formant Resonance Spectrum Canvas */}
          <div className="p-4 bg-[#080B15] border border-[#1A2338] rounded-2xl flex flex-col gap-2">
            <div className="flex items-center justify-between pb-2 border-b border-[#141C2E]">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-[#FFD700]" />
                <span className="text-xs font-bold text-white uppercase">
                  SPECTRAL FORMANT RESONANCE CURVE (F1 - F3)
                </span>
              </div>
              <span className="text-[10px] text-[#00F0FF] font-mono font-bold">
                {selectedModel.name}
              </span>
            </div>

            <canvas
              ref={canvasRef}
              width={700}
              height={180}
              className="w-full h-44 rounded-xl border border-[#141C2E] bg-[#05070E]"
            />
          </div>

          {/* Morphing Sliders */}
          <div className="p-4 bg-[#080B15] border border-[#1A2338] rounded-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#141C2E]">
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-[#00F0FF]" />
                <span className="text-xs font-bold text-white uppercase">
                  MORPH PARAMETERS & NEURAL INFERENCE
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Pitch Shift */}
              <div className="p-3 bg-[#04060C] border border-[#141C2E] rounded-xl flex flex-col justify-between gap-1">
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Pitch Shift</span>
                  <span className="text-[#FFD700] font-bold">{pitchShift > 0 ? `+${pitchShift}` : pitchShift} semitones</span>
                </div>
                <input
                  type="range"
                  min={-24}
                  max={24}
                  step={1}
                  value={pitchShift}
                  onChange={(e) => setPitchShift(Number(e.target.value))}
                  className="w-full accent-[#FFD700] cursor-pointer"
                />
              </div>

              {/* Formant Shift */}
              <div className="p-3 bg-[#04060C] border border-[#141C2E] rounded-xl flex flex-col justify-between gap-1">
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Formant Shift (Vowel Scale)</span>
                  <span className="text-[#00F0FF] font-bold">{formantShift > 0 ? `+${formantShift}` : formantShift} semitones</span>
                </div>
                <input
                  type="range"
                  min={-12}
                  max={12}
                  step={1}
                  value={formantShift}
                  onChange={(e) => setFormantShift(Number(e.target.value))}
                  className="w-full accent-[#00F0FF] cursor-pointer"
                />
              </div>

              {/* Index Rate */}
              <div className="p-3 bg-[#04060C] border border-[#141C2E] rounded-xl flex flex-col justify-between gap-1">
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Feature Index Rate</span>
                  <span className="text-[#C084FC] font-bold">{indexRate.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={indexRate}
                  onChange={(e) => setIndexRate(Number(e.target.value))}
                  className="w-full accent-[#C084FC] cursor-pointer"
                />
              </div>

              {/* Protect Consonants */}
              <div className="p-3 bg-[#04060C] border border-[#141C2E] rounded-xl flex flex-col justify-between gap-1">
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Consonant Transient Protection</span>
                  <span className="text-[#10B981] font-bold">{protectConsonants.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={protectConsonants}
                  onChange={(e) => setProtectConsonants(Number(e.target.value))}
                  className="w-full accent-[#10B981] cursor-pointer"
                />
              </div>
            </div>

            <button
              onClick={handleRunRvc}
              disabled={isProcessing}
              className={`w-full py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
                isProcessing
                  ? 'bg-[#1E293B] text-[#94A3B8] cursor-wait'
                  : 'bg-gradient-to-r from-[#00F0FF] via-[#FFD700] to-[#FF2E63] text-black hover:brightness-110 shadow-md'
              }`}
            >
              {isProcessing ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
              <span>{isProcessing ? 'PROCESSING NEURAL INFERENCE...' : 'TRANSFORM VOCAL WITH AURA RVC'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Aura;
