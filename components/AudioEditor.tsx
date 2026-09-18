import React, { useRef, useEffect, useState } from 'react';
import { 
  Scissors, Volume2, ArrowLeftRight, Play, Pause, RotateCcw, 
  Plug, MousePointer2, Repeat, MapPin, Zap, ShieldCheck, Sparkles, 
  ZoomIn, ZoomOut, CheckCircle2, Download 
} from 'lucide-react';
import { Clip } from '../types';
import { snapToGrid } from '../lib/audioUtils';

interface AudioEditorProps {
  clip: Clip | null;
  snapValue: string;
}

export const AudioEditor: React.FC<AudioEditorProps> = ({ clip, snapValue }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [region, setRegion] = useState<{ start: number; end: number } | null>({ start: 0.15, end: 0.65 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [markers, setMarkers] = useState<number[]>([0.25, 0.5, 0.75]);
  const [playheadX, setPlayheadX] = useState<number>(0.15);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const playStartTimeRef = useRef<number>(0);

  // Generate synthetic rich waveform data
  const waveformPeaks = useRef<number[]>(
    Array.from({ length: 250 }, (_, i) => {
      const envelope = Math.exp(-i / 80) * 0.7 + 0.2;
      const wave = Math.sin(i * 0.18) * 0.5 + Math.cos(i * 0.45) * 0.3 + (Math.random() * 0.2);
      return Math.min(1, Math.max(0.05, Math.abs(wave) * envelope));
    })
  ).current;

  // Waveform Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#05070E';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle background timeline grid
    ctx.strokeStyle = '#101726';
    ctx.lineWidth = 1;
    const step = canvas.width / 16;
    for (let x = 0; x < canvas.width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // Center baseline
    ctx.strokeStyle = '#1E293B';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    // Draw Selected Region Background
    if (region) {
      const regStartPx = region.start * canvas.width;
      const regWidthPx = (region.end - region.start) * canvas.width;
      
      const regionGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      regionGrad.addColorStop(0, 'rgba(0, 240, 255, 0.18)');
      regionGrad.addColorStop(1, 'rgba(0, 240, 255, 0.04)');
      ctx.fillStyle = regionGrad;
      ctx.fillRect(regStartPx, 0, regWidthPx, canvas.height);

      // Boundaries
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(regStartPx, 0, regWidthPx, canvas.height);
    }

    // Draw Waveform Bars with Gradient
    const barWidth = canvas.width / waveformPeaks.length;
    waveformPeaks.forEach((peak, i) => {
      const x = i * barWidth;
      const h = peak * (canvas.height * 0.82);
      const y = (canvas.height - h) / 2;

      const inRegion = region && (x / canvas.width >= region.start && x / canvas.width <= region.end);

      ctx.fillStyle = inRegion ? '#00F0FF' : '#334155';
      ctx.fillRect(x, y, barWidth - 1, h);
    });

    // Draw Markers
    markers.forEach((m, idx) => {
      const mx = m * canvas.width;
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(mx, 0);
      ctx.lineTo(mx, canvas.height);
      ctx.stroke();

      // Marker Tag
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(mx - 12, 4, 24, 12);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(`M${idx + 1}`, mx - 6, 13);
    });

    // Draw Playhead
    const px = playheadX * canvas.width;
    ctx.strokeStyle = '#FF2E63';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, canvas.height);
    ctx.stroke();

    // Playhead head
    ctx.fillStyle = '#FF2E63';
    ctx.beginPath();
    ctx.moveTo(px - 5, 0);
    ctx.lineTo(px + 5, 0);
    ctx.lineTo(px, 8);
    ctx.closePath();
    ctx.fill();

  }, [region, markers, playheadX, zoomLevel, waveformPeaks]);

  // Audio Playback simulation
  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    } else {
      setIsPlaying(true);
      const startX = region ? region.start : 0;
      const endX = region ? region.end : 1;
      setPlayheadX(startX);

      let currentX = startX;
      const animatePlayhead = () => {
        currentX += 0.004;
        if (currentX > endX) {
          if (loopEnabled) {
            currentX = startX;
          } else {
            setIsPlaying(false);
            return;
          }
        }
        setPlayheadX(currentX);
        animFrameRef.current = requestAnimationFrame(animatePlayhead);
      };
      animFrameRef.current = requestAnimationFrame(animatePlayhead);
    }
  };

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    if (e.shiftKey) {
      setMarkers(prev => [...prev, x].sort((a, b) => a - b));
      return;
    }

    setIsDragging(true);
    setDragStart(x);
    setRegion({ start: x, end: x });
    setPlayheadX(x);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || dragStart === null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    setRegion({
      start: Math.min(dragStart, x),
      end: Math.max(dragStart, x)
    });
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handleAction = (actionName: string) => {
    setStatusNotice(`✨ Applied ${actionName} to selected region [${((region?.start || 0) * 100).toFixed(0)}% - ${((region?.end || 1) * 100).toFixed(0)}%]`);
    setTimeout(() => setStatusNotice(null), 3500);
  };

  return (
    <div className="h-full w-full bg-[#05070E] flex flex-col overflow-y-auto p-4 md:p-6 text-white font-mono select-none">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1A2338]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00F0FF]/20 via-[#FFD700]/20 to-[#FF2E63]/20 border border-[#00F0FF] flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.3)]">
            <Scissors size={22} className="text-[#00F0FF]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-black uppercase tracking-widest text-[#FFD700]">
                STRANGELET LAB
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 font-bold">
                SAMPLE SCULPTOR
              </span>
            </div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              LASER WAVEFORM & CLIP EDITOR
            </h1>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className={`px-4 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md ${
              isPlaying
                ? 'bg-[#FF2E63] text-white shadow-[0_0_15px_#FF2E63]'
                : 'bg-[#00F0FF] text-black hover:brightness-110'
            }`}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlaying ? 'PAUSE PLAYHEAD' : 'AUDITION REGION'}</span>
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {statusNotice && (
        <div className="mt-3 px-3.5 py-2 rounded-lg bg-[#00F0FF]/15 border border-[#00F0FF] text-xs font-bold text-white flex items-center justify-between shadow-[0_0_15px_rgba(0,240,255,0.3)]">
          <span>{statusNotice}</span>
          <CheckCircle2 size={15} className="text-[#00F0FF]" />
        </div>
      )}

      {/* Main Waveform Stage */}
      <div className="mt-4 p-4 bg-[#080B15] border border-[#1A2338] rounded-2xl flex flex-col gap-3 shadow-inner">
        {/* Info & Zoom Toolbar */}
        <div className="flex items-center justify-between text-xs pb-2 border-b border-[#141C2E]">
          <div className="flex items-center gap-3">
            <span className="text-[#64748B]">TARGET CLIP:</span>
            <span className="text-white font-bold">{clip ? clip.name : 'Master_Audio_Stem.wav'}</span>
            <span className="px-2 py-0.5 rounded bg-[#101726] text-[#00F0FF] border border-[#1E293B] text-[10px]">
              SNAP: {snapValue}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLoopEnabled(!loopEnabled)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 ${
                loopEnabled ? 'border-[#00F0FF] bg-[#00F0FF]/10 text-[#00F0FF]' : 'border-[#1E293B] text-[#64748B]'
              }`}
            >
              <Repeat size={12} />
              <span>LOOP</span>
            </button>
            <button
              onClick={() => setMarkers([])}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-[#1E293B] text-[#64748B] hover:text-white"
            >
              CLEAR MARKERS
            </button>
          </div>
        </div>

        {/* Waveform Canvas */}
        <canvas
          ref={canvasRef}
          width={1000}
          height={260}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          className="w-full h-56 rounded-xl border border-[#141C2E] cursor-crosshair shadow-inner"
        />

        {/* Action Commands Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[#05070E] border border-[#141C2E] rounded-xl text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleAction('Laser Trim')}
              className="px-3 py-1.5 rounded-lg bg-[#101726] hover:bg-[#1A263D] border border-[#1E293B] text-white hover:text-[#00F0FF] transition-all flex items-center gap-1.5 font-bold"
            >
              <Scissors size={13} />
              <span>TRIM REGION</span>
            </button>

            <button
              onClick={() => handleAction('Fade In')}
              className="px-3 py-1.5 rounded-lg bg-[#101726] hover:bg-[#1A263D] border border-[#1E293B] text-white hover:text-[#FFD700] transition-all flex items-center gap-1.5 font-bold"
            >
              <Volume2 size={13} />
              <span>FADE IN</span>
            </button>

            <button
              onClick={() => handleAction('Fade Out')}
              className="px-3 py-1.5 rounded-lg bg-[#101726] hover:bg-[#1A263D] border border-[#1E293B] text-white hover:text-[#FFD700] transition-all flex items-center gap-1.5 font-bold"
            >
              <Volume2 size={13} />
              <span>FADE OUT</span>
            </button>

            <button
              onClick={() => handleAction('Normalize Peak (0dB)')}
              className="px-3 py-1.5 rounded-lg bg-[#101726] hover:bg-[#1A263D] border border-[#1E293B] text-white hover:text-[#00F0FF] transition-all flex items-center gap-1.5 font-bold"
            >
              <ArrowLeftRight size={13} />
              <span>NORMALIZE</span>
            </button>

            <button
              onClick={() => handleAction('Reverse Audio')}
              className="px-3 py-1.5 rounded-lg bg-[#101726] hover:bg-[#1A263D] border border-[#1E293B] text-white hover:text-[#FF2E63] transition-all flex items-center gap-1.5 font-bold"
            >
              <RotateCcw size={13} />
              <span>REVERSE</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setRegion(null)}
              className="px-3 py-1.5 rounded-lg border border-[#1E293B] text-[#64748B] hover:text-white transition-all text-[11px]"
            >
              CLEAR REGION
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioEditor;
