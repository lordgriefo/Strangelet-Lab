import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Play, Pause, Scissors, RotateCcw, Volume2, Sparkles, Check, 
  ArrowLeftRight, Sliders, ShieldCheck, Zap, Maximize2
} from 'lucide-react';
import { getAudioContext, playLaserBeamSound } from '../lib/laserSound';

interface WaveformTrimmerProps {
  sampleName: string;
  samplePath: string;
  waveformType?: string;
  offsetSamples?: number;
  endSamples?: number;
  totalSamples?: number;
  sampleRate?: number;
  normalizedGainDb?: number;
  direction?: 'forward' | 'reverse';
  onUpdateTrim: (offsetSamples: number, endSamples: number) => void;
  onUpdateNormalization: (gainDb: number) => void;
  onToggleDirection?: () => void;
  height?: number;
}

export const WaveformTrimmer: React.FC<WaveformTrimmerProps> = ({
  sampleName,
  samplePath,
  waveformType = 'sample_slice',
  offsetSamples = 0,
  endSamples,
  totalSamples = 44100, // default ~1 sec @ 44.1kHz
  sampleRate = 44100,
  normalizedGainDb = 0,
  direction = 'forward',
  onUpdateTrim,
  onUpdateNormalization,
  onToggleDirection,
  height
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playProgress, setPlayProgress] = useState<number>(0);
  const [targetDb, setTargetDb] = useState<number>(0.0);
  const [detectedPeakDb, setDetectedPeakDb] = useState<number>(-4.6);
  const [snapToZeroCrossing, setSnapToZeroCrossing] = useState<boolean>(true);
  const [isDraggingHandle, setIsDraggingHandle] = useState<'start' | 'end' | null>(null);

  const activeEndSamples = endSamples && endSamples > 0 ? endSamples : totalSamples;
  const activeOffsetSamples = Math.min(offsetSamples, activeEndSamples - 100);

  // Generate deterministic synthetic waveform peak data based on sample name & type
  const peakData = useMemo(() => {
    const numPoints = 256;
    const points = new Float32Array(numPoints);
    let seed = 0;
    for (let i = 0; i < sampleName.length; i++) {
      seed = (seed + sampleName.charCodeAt(i) * (i + 1)) % 1000;
    }

    let maxVal = 0.001;
    for (let i = 0; i < numPoints; i++) {
      const progress = i / numPoints;
      let val = 0;

      if (waveformType.includes('saw')) {
        val = (1 - progress) * (Math.sin(progress * 48 + seed) * 0.4 + 0.6);
      } else if (waveformType.includes('sub') || waveformType.includes('sine')) {
        val = Math.sin(progress * Math.PI) * 0.85;
      } else if (waveformType.includes('bell')) {
        val = Math.exp(-progress * 4) * (Math.sin(progress * 80) * 0.5 + Math.sin(progress * 24) * 0.5);
      } else if (waveformType.includes('noise')) {
        val = (Math.sin(progress * 1337 + seed * 19) * 0.4) + (Math.cos(progress * 999) * 0.4);
      } else {
        // Drums / Slices: Sharp attack punch followed by exponential decay and tail
        const attackEnvelope = Math.min(1, progress * 20);
        const decayEnvelope = Math.exp(-progress * 3.5);
        const transientPunches = Math.sin(progress * 64 + seed) * 0.6 + Math.cos(progress * 128) * 0.4;
        val = attackEnvelope * decayEnvelope * (0.35 + Math.abs(transientPunches) * 0.65);
      }

      // Keep within [-1, 1]
      val = Math.max(-0.95, Math.min(0.95, val));
      points[i] = val;
      if (Math.abs(val) > maxVal) maxVal = Math.abs(val);
    }

    // Set detected peak
    const peakDb = 20 * Math.log10(maxVal);
    setDetectedPeakDb(Number(peakDb.toFixed(1)));

    return points;
  }, [sampleName, waveformType]);

  // Duration in milliseconds
  const totalDurationMs = (totalSamples / sampleRate) * 1000;
  const trimStartMs = (activeOffsetSamples / sampleRate) * 1000;
  const trimEndMs = (activeEndSamples / sampleRate) * 1000;
  const trimSpanMs = trimEndMs - trimStartMs;

  // Render canvas waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);

    // Background Grid
    ctx.fillStyle = '#060810';
    ctx.fillRect(0, 0, width, height);

    // Zero-crossing reference line
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Pixel boundaries for trim start and end
    const startX = (activeOffsetSamples / totalSamples) * width;
    const endX = (activeEndSamples / totalSamples) * width;

    // Dim out trimmed-out left area
    if (startX > 0) {
      ctx.fillStyle = 'rgba(10, 14, 26, 0.75)';
      ctx.fillRect(0, 0, startX, height);
      ctx.strokeStyle = '#334155';
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(startX, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Dim out trimmed-out right area
    if (endX < width) {
      ctx.fillStyle = 'rgba(10, 14, 26, 0.75)';
      ctx.fillRect(endX, 0, width - endX, height);
      ctx.strokeStyle = '#334155';
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(endX, 0);
      ctx.lineTo(endX, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Active Trim Region Highlight
    const activeGrad = ctx.createLinearGradient(0, 0, 0, height);
    activeGrad.addColorStop(0, 'rgba(0, 240, 255, 0.08)');
    activeGrad.addColorStop(0.5, 'rgba(0, 240, 255, 0.02)');
    activeGrad.addColorStop(1, 'rgba(0, 240, 255, 0.08)');
    ctx.fillStyle = activeGrad;
    ctx.fillRect(startX, 0, Math.max(2, endX - startX), height);

    // Waveform Peaks
    const numBars = peakData.length;
    const barWidth = width / numBars;

    // Normalization Gain scale factor
    const normLinear = Math.pow(10, normalizedGainDb / 20);

    for (let i = 0; i < numBars; i++) {
      const x = i * barWidth;
      const rawAmp = peakData[i];
      // Apply normalization gain factor
      const amp = Math.min(1, Math.abs(rawAmp) * normLinear);
      const barHeight = Math.max(2, amp * (height * 0.42));

      const isInsideTrim = x >= startX && x <= endX;

      if (isInsideTrim) {
        if (normalizedGainDb > 0.1) {
          ctx.fillStyle = '#FFD700'; // Gold when boosted
        } else {
          ctx.fillStyle = '#00F0FF'; // Cyan default
        }
      } else {
        ctx.fillStyle = '#334155'; // Dark muted grey for trimmed out
      }

      // Draw mirrored bar around center
      ctx.fillRect(x, centerY - barHeight, Math.max(1, barWidth - 1), barHeight * 2);
    }

    // Draw Start Trim Marker line & handle
    ctx.fillStyle = '#00F0FF';
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, 0);
    ctx.lineTo(startX, height);
    ctx.stroke();
    // Top flag
    ctx.fillRect(startX, 0, 8, 14);

    // Draw End Trim Marker line & handle
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(endX, 0);
    ctx.lineTo(endX, height);
    ctx.stroke();
    // Top flag
    ctx.fillRect(endX - 8, 0, 8, 14);

    // Draw animated Playhead
    if (isPlaying) {
      const playX = startX + playProgress * (endX - startX);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(playX, 0);
      ctx.lineTo(playX, height);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }, [peakData, activeOffsetSamples, activeEndSamples, totalSamples, normalizedGainDb, isPlaying, playProgress]);

  // Click & Drag Handler on Canvas
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSample = Math.round(ratio * totalSamples);

    const distToStart = Math.abs(targetSample - activeOffsetSamples);
    const distToEnd = Math.abs(targetSample - activeEndSamples);

    if (distToStart < distToEnd) {
      setIsDraggingHandle('start');
      applyTrim(targetSample, activeEndSamples);
    } else {
      setIsDraggingHandle('end');
      applyTrim(activeOffsetSamples, targetSample);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingHandle) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    let targetSample = Math.round(ratio * totalSamples);

    if (snapToZeroCrossing) {
      // Find nearest sample where peakData is closest to 0
      const pointIdx = Math.floor((targetSample / totalSamples) * peakData.length);
      let bestIdx = pointIdx;
      let minDiff = 999;
      for (let offset = -4; offset <= 4; offset++) {
        const testIdx = Math.max(0, Math.min(peakData.length - 1, pointIdx + offset));
        const diff = Math.abs(peakData[testIdx]);
        if (diff < minDiff) {
          minDiff = diff;
          bestIdx = testIdx;
        }
      }
      targetSample = Math.round((bestIdx / peakData.length) * totalSamples);
    }

    if (isDraggingHandle === 'start') {
      applyTrim(Math.min(targetSample, activeEndSamples - 256), activeEndSamples);
    } else if (isDraggingHandle === 'end') {
      applyTrim(activeOffsetSamples, Math.max(targetSample, activeOffsetSamples + 256));
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingHandle(null);
  };

  const applyTrim = (start: number, end: number) => {
    const clampedStart = Math.max(0, Math.min(start, totalSamples - 256));
    const clampedEnd = Math.max(clampedStart + 256, Math.min(end, totalSamples));
    onUpdateTrim(clampedStart, clampedEnd);
  };

  // Reset Trimming to full sample bounds
  const handleResetTrim = () => {
    onUpdateTrim(0, totalSamples);
    playLaserBeamSound('laser_erase');
  };

  // Apply Non-Destructive Normalization to Audio Buffer
  const handleNormalizeBuffer = () => {
    const boostNeeded = Number((targetDb - detectedPeakDb).toFixed(1));
    const finalBoost = Math.max(-12, Math.min(24, boostNeeded));
    onUpdateNormalization(finalBoost);
    playLaserBeamSound('laser_audio');
  };

  const handleClearNormalization = () => {
    onUpdateNormalization(0);
    playLaserBeamSound('laser_erase');
  };

  // Audition Trimmed Buffer Segment in Real-Time
  const handlePlayTrimmedBuffer = () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    setIsPlaying(true);
    setPlayProgress(0);

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Frequency derived from sample type
    let baseFreq = 220;
    if (waveformType.includes('sub')) baseFreq = 65;
    else if (waveformType.includes('saw')) baseFreq = 130.8;
    else if (waveformType.includes('bell')) baseFreq = 523.25;
    else baseFreq = 110;

    osc.frequency.setValueAtTime(baseFreq, now);

    // Apply normalization linear gain boost
    const normLinear = Math.pow(10, normalizedGainDb / 20);
    const volume = Math.min(0.85, 0.3 * normLinear);

    const dur = Math.max(0.1, trimSpanMs / 1000);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.015);
    gain.gain.setValueAtTime(volume, now + dur - 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.05);

    // Playhead progress animation
    const startTime = performance.now();
    const durationMs = dur * 1000;

    const animFrame = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      setPlayProgress(progress);

      if (progress < 1) {
        requestAnimationFrame(animFrame);
      } else {
        setIsPlaying(false);
        setPlayProgress(0);
      }
    };

    requestAnimationFrame(animFrame);
    playLaserBeamSound('laser_midi');
  };

  return (
    <div className="bg-[#0A0D16] border border-[#1E293B] rounded-xl p-4 flex flex-col gap-4 font-mono">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1E293B]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#00F0FF]/10 border border-[#00F0FF]/40 flex items-center justify-center text-[#00F0FF]">
            <Scissors size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                AUDIO BUFFER WAVEFORM & TRIM ENGINE
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#162035] text-[#00F0FF] border border-[#00F0FF]/30">
                {sampleName}
              </span>
              {normalizedGainDb !== 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#271E0B] text-[#FFD700] border border-[#FFD700]/40 font-bold">
                  {normalizedGainDb > 0 ? `+${normalizedGainDb}` : normalizedGainDb} dB NORMALIZED
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#94A3B8]">
              Non-destructive trimming (`offset`/`end`) & peak normalization directly on sample buffer
            </p>
          </div>
        </div>

        {/* Audition Play Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePlayTrimmedBuffer}
            className={`px-4 py-2 rounded-lg font-extrabold text-xs flex items-center gap-2 transition-all ${
              isPlaying
                ? 'bg-[#FFD700] text-black shadow-[0_0_15px_#FFD700]'
                : 'bg-[#00F0FF] hover:bg-[#00D0DF] text-black shadow-[0_0_15px_rgba(0,240,255,0.3)]'
            }`}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            {isPlaying ? 'PLAYING TRIM...' : 'AUDITION TRIMMED BUFFER'}
          </button>
        </div>
      </div>

      {/* Interactive Waveform Canvas */}
      <div className="relative flex flex-col gap-1.5">
        <div 
          style={{ height: height ? `${height}px` : undefined }}
          className="relative w-full h-36 rounded-lg overflow-hidden border border-[#1E293B] shadow-inner cursor-crosshair select-none"
        >
          <canvas
            ref={canvasRef}
            width={840}
            height={144}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            className="w-full h-full block"
          />

          {/* Canvas Floating Time Overlay */}
          <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-[#07090F]/85 border border-[#1E293B] text-[10px] flex items-center gap-3 text-[#94A3B8] backdrop-blur-sm pointer-events-none">
            <span>
              START: <strong className="text-[#00F0FF]">{trimStartMs.toFixed(1)} ms</strong> ({activeOffsetSamples} spls)
            </span>
            <span>&bull;</span>
            <span>
              END: <strong className="text-[#FFD700]">{trimEndMs.toFixed(1)} ms</strong> ({activeEndSamples} spls)
            </span>
            <span>&bull;</span>
            <span>
              SPAN: <strong className="text-white">{trimSpanMs.toFixed(1)} ms</strong>
            </span>
          </div>

          <div className="absolute top-2 right-2 px-2 py-1 rounded bg-[#07090F]/85 border border-[#1E293B] text-[10px] flex items-center gap-2 text-[#94A3B8] backdrop-blur-sm pointer-events-none">
            <span>PEAK: <strong className="text-amber-400">{detectedPeakDb} dBFS</strong></span>
            {normalizedGainDb !== 0 && (
              <span className="text-[#FFD700]">
                &bull; EFF. PEAK: <strong>{(detectedPeakDb + normalizedGainDb).toFixed(1)} dBFS</strong>
              </span>
            )}
          </div>
        </div>

        {/* Trim Slider Control Bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <div className="flex justify-between text-[10px] text-[#64748B] mb-1">
              <span className="flex items-center gap-1 text-[#00F0FF]">
                <span className="w-2 h-2 rounded-full bg-[#00F0FF]" />
                TRIM START OFFSET (offset=...)
              </span>
              <span className="text-white font-bold">{trimStartMs.toFixed(1)} ms ({activeOffsetSamples} spls)</span>
            </div>
            <input
              type="range"
              min={0}
              max={totalSamples - 256}
              value={activeOffsetSamples}
              onChange={(e) => applyTrim(Number(e.target.value), activeEndSamples)}
              className="w-full accent-[#00F0FF]"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-[#64748B] mb-1">
              <span className="flex items-center gap-1 text-[#FFD700]">
                <span className="w-2 h-2 rounded-full bg-[#FFD700]" />
                TRIM END BOUND (end=...)
              </span>
              <span className="text-white font-bold">{trimEndMs.toFixed(1)} ms ({activeEndSamples} spls)</span>
            </div>
            <input
              type="range"
              min={activeOffsetSamples + 256}
              max={totalSamples}
              value={activeEndSamples}
              onChange={(e) => applyTrim(activeOffsetSamples, Number(e.target.value))}
              className="w-full accent-[#FFD700]"
            />
          </div>
        </div>
      </div>

      {/* Trimming & Normalization Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-[#060810] border border-[#1E293B] rounded-lg">
        {/* Left: Non-Destructive Trimming Utilities */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
              <Scissors size={12} className="text-[#00F0FF]" />
              TRIMMING UTILITIES
            </span>

            <label className="flex items-center gap-1.5 text-[10px] text-[#64748B] cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={snapToZeroCrossing}
                onChange={(e) => setSnapToZeroCrossing(e.target.checked)}
                className="rounded accent-[#00F0FF]"
              />
              SNAP TO ZERO CROSSING
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleResetTrim}
              className="px-3 py-1.5 rounded bg-[#121826] hover:bg-[#1A2338] text-[#94A3B8] hover:text-white border border-[#1E293B] text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Reset offset and end to sample beginning and end"
            >
              <RotateCcw size={13} />
              RESET TRIM BOUNDS
            </button>

            {onToggleDirection && (
              <button
                onClick={onToggleDirection}
                className={`px-3 py-1.5 rounded border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  direction === 'reverse'
                    ? 'bg-[#2A1638] text-[#C084FC] border-[#A855F7]'
                    : 'bg-[#121826] text-[#94A3B8] hover:text-white border-[#1E293B]'
                }`}
                title="Toggle non-destructive reverse playback direction"
              >
                <ArrowLeftRight size={13} />
                {direction === 'reverse' ? 'REVERSE PLAYBACK (ON)' : 'REVERSE BUFFER'}
              </button>
            )}
          </div>
        </div>

        {/* Right: Audio Buffer Normalization Utilities */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
              <Volume2 size={12} className="text-[#FFD700]" />
              BUFFER PEAK NORMALIZATION
            </span>

            <div className="flex items-center gap-1 bg-[#0A0D16] border border-[#1E293B] rounded p-0.5 text-[10px]">
              <span className="text-[#64748B] px-1">TARGET:</span>
              <button
                onClick={() => setTargetDb(0.0)}
                className={`px-1.5 py-0.5 rounded font-bold ${
                  targetDb === 0.0 ? 'bg-[#FFD700] text-black' : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                0.0 dB
              </button>
              <button
                onClick={() => setTargetDb(-0.1)}
                className={`px-1.5 py-0.5 rounded font-bold ${
                  targetDb === -0.1 ? 'bg-[#FFD700] text-black' : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                -0.1 dB
              </button>
              <button
                onClick={() => setTargetDb(-1.0)}
                className={`px-1.5 py-0.5 rounded font-bold ${
                  targetDb === -1.0 ? 'bg-[#FFD700] text-black' : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                -1.0 dB
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleNormalizeBuffer}
              className="px-3 py-1.5 rounded bg-[#2B230B] hover:bg-[#3D310F] text-[#FFD700] border border-[#FFD700]/50 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              title="Calculate peak amplitude and normalize gain non-destructively"
            >
              <Sparkles size={13} />
              NORMALIZE AUDIO BUFFER
            </button>

            {normalizedGainDb !== 0 && (
              <button
                onClick={handleClearNormalization}
                className="px-2.5 py-1.5 rounded bg-[#1A1215] hover:bg-[#2A1D22] text-red-400 border border-red-900/50 text-xs font-semibold transition-colors"
                title="Remove normalization boost"
              >
                CLEAR NORMALIZATION
              </button>
            )}

            <span className="text-[10px] text-[#64748B] ml-auto">
              Boost: <strong className="text-white">{(targetDb - detectedPeakDb).toFixed(1)} dB</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaveformTrimmer;
