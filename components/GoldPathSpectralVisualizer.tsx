import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { masterAudioBus } from '../lib/masterBus';
import { GoldPathChainParameters, GoldPathStageToggles } from '../types';
import { 
  Activity, 
  Play, 
  Square, 
  Volume2, 
  Sliders, 
  Eye, 
  Zap, 
  Sparkles, 
  Waves, 
  Radio, 
  RotateCcw,
  ShieldCheck,
  Check,
  Lock,
  ChevronDown
} from 'lucide-react';
import { playLaserBeamSound } from '../lib/laserSound';

export interface GoldPathSpectralVisualizerProps {
  height?: number;
  className?: string;
  parameters?: GoldPathChainParameters;
  stages?: GoldPathStageToggles;
  masterIntensity?: number;
  presetName?: string;
  showControls?: boolean;
}

interface SpectralPoint {
  freq: number;
  db: number;
}

// Frequency bands for professional Gold Path audio mastering
const GOLD_PATH_BANDS = [
  { name: 'Sub (Mono Lock)', min: 20, max: 60, color: '#6366F1', desc: 'Subsonic DC & mono fundamental' },
  { name: 'Bass Punch', min: 60, max: 250, color: '#3B82F6', desc: 'Kick body & bass guitar weight' },
  { name: 'Low Mid / De-Mud', min: 250, max: 500, color: '#10B981', desc: 'Boxiness & cardboard clean zone' },
  { name: 'Mid Core', min: 500, max: 2000, color: '#F59E0B', desc: 'Vocal core & primary leads' },
  { name: 'High Mid Attack', min: 2000, max: 4000, color: '#F97316', desc: 'Snare attack & ear sensitivity' },
  { name: 'Presence', min: 4000, max: 8000, color: '#EC4899', desc: 'Vocal presence & forwardness' },
  { name: 'Gold Air & Sheen', min: 8000, max: 20000, color: '#FFD700', desc: 'Silky air & anti-sheen zone' }
];

// Converts frequency in Hz to musical note (e.g. 440 -> A4, 55 -> A1)
function freqToNoteName(freq: number): string {
  if (freq < 16) return '--';
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const midi = Math.round(69 + 12 * Math.log2(freq / 440));
  const note = noteNames[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

export const GoldPathSpectralVisualizer: React.FC<GoldPathSpectralVisualizerProps> = ({
  height = 300,
  className = '',
  parameters,
  stages,
  masterIntensity = 0.5,
  presetName = 'Gold Path Master',
  showControls = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 850, height });

  // Visualizer display configuration
  const [fftSize, setFftSize] = useState<number>(2048);
  const [smoothing, setSmoothing] = useState<number>(0.84);
  const [showPeakHold, setShowPeakHold] = useState<boolean>(true);
  const [showGoldCurve, setShowGoldCurve] = useState<boolean>(true);
  const [showStageGuides, setShowStageGuides] = useState<boolean>(true);
  const [tiltMode, setTiltMode] = useState<'flat' | '3db' | '4.5db'>('3db');
  const [displayMode, setDisplayMode] = useState<'both' | 'area' | 'line'>('both');
  const [activeSignal, setActiveSignal] = useState<'none' | 'pink_noise' | 'multiband_mix' | 'sine_sweep' | 'cal_tone'>('none');

  // Real-time audio metrics
  const [peakFreq, setPeakFreq] = useState<number>(0);
  const [peakDb, setPeakDb] = useState<number>(-100);
  const [dominantNote, setDominantNote] = useState<string>('--');
  const [estimatedRms, setEstimatedRms] = useState<number>(-100);
  const [hoverData, setHoverData] = useState<{ freq: number; db: number; x: number; y: number } | null>(null);

  const animationFrameRef = useRef<number | null>(null);
  const peakHoldBufferRef = useRef<Float32Array | null>(null);

  // ResizeObserver for fluid width scaling
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 50) {
          setDimensions({ width, height });
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [height]);

  // Configure AnalyserNode
  useEffect(() => {
    try {
      const analyser = masterAudioBus.getAnalyser();
      analyser.fftSize = fftSize;
      analyser.smoothingTimeConstant = smoothing;
    } catch (e) {
      console.warn('Analyser configure deferred:', e);
    }
  }, [fftSize, smoothing]);

  // Clean up test signal on unmount
  useEffect(() => {
    return () => {
      masterAudioBus.stopTestSignal();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Handle signal generator toggle
  const handleToggleTestSignal = (type: 'pink_noise' | 'multiband_mix' | 'sine_sweep' | 'cal_tone') => {
    if (activeSignal === type) {
      masterAudioBus.stopTestSignal();
      setActiveSignal('none');
      playLaserBeamSound('laser_erase');
    } else {
      masterAudioBus.startTestSignal(type);
      setActiveSignal(type);
      playLaserBeamSound('laser_audio');
    }
  };

  // Dimensions & Margins
  const margin = { top: 28, right: 50, bottom: 44, left: 52 };
  const innerWidth = Math.max(10, dimensions.width - margin.left - margin.right);
  const innerHeight = Math.max(10, dimensions.height - margin.top - margin.bottom);

  // D3 Scales
  // 1. Logarithmic Frequency Scale (20 Hz - 20,000 Hz)
  const xScale = useMemo(() => {
    return d3.scaleLog()
      .domain([20, 20000])
      .range([margin.left, dimensions.width - margin.right])
      .clamp(true);
  }, [dimensions.width, margin.left, margin.right]);

  // 2. Linear Decibel Scale (-90 dBFS to 0 dBFS)
  const yScale = useMemo(() => {
    return d3.scaleLinear()
      .domain([-90, 0])
      .range([dimensions.height - margin.bottom, margin.top])
      .clamp(true);
  }, [dimensions.height, margin.top, margin.bottom]);

  // 3. Gold Path Transfer Curve dB Scale (-18 dB to +18 dB, centered at 0 dB)
  const yScaleGoldCurve = useMemo(() => {
    return d3.scaleLinear()
      .domain([-18, 18])
      .range([dimensions.height - margin.bottom - 10, margin.top + 10])
      .clamp(true);
  }, [dimensions.height, margin.top, margin.bottom]);

  // Sample array of 160 log-spaced frequencies for evaluating Gold Path Transfer function
  const goldSampleFreqs = useMemo(() => {
    const arr = new Float32Array(160);
    for (let i = 0; i < 160; i++) {
      const t = i / (160 - 1);
      arr[i] = 20 * Math.pow(20000 / 20, t);
    }
    return arr;
  }, []);

  // Compute mathematical Gold Path Transfer Function Curve in dB across spectrum
  const computeGoldPathCurvePoints = useCallback((): [number, number][] => {
    const lowCut = parameters?.lowCutHz || 28;
    const highCut = parameters?.highCutHz || 20000;
    const deMudDb = parameters?.deMudGainDb ?? -2.0;
    const presenceDb = parameters?.presenceAirDb ?? 1.5;
    const intensity = masterIntensity;

    const points: [number, number][] = [];

    for (let i = 0; i < goldSampleFreqs.length; i++) {
      const f = goldSampleFreqs[i];
      let totalDb = 0;

      // 1. Low Cut HPF (2nd-order Butterworth -12 dB/oct roll-off)
      if (f < lowCut) {
        const ratio = f / lowCut;
        totalDb -= 20 * Math.log10(1 + Math.pow(1 / Math.max(0.001, ratio), 2));
      }

      // 2. De-Mud Notch at 400 Hz (peaking bell)
      const fMud = 400;
      const qMud = 1.6;
      const distMud = Math.log2(f / fMud);
      const bellMud = Math.exp(-Math.pow(distMud * qMud, 2));
      totalDb += deMudDb * bellMud * intensity;

      // 3. High Air / Presence Shelf at 12 kHz
      const fAir = 12000;
      if (f > 4000) {
        const tAir = Math.min(1, Math.max(0, Math.log2(f / 4000) / Math.log2(fAir / 4000)));
        totalDb += presenceDb * tAir * intensity;
      }

      // 4. High Cut LPF (roll-off above highCut)
      if (f > highCut) {
        const ratio = f / highCut;
        totalDb -= 20 * Math.log10(1 + Math.pow(ratio, 2));
      }

      // Clamp to reasonable visual range (-18 to +18 dB)
      totalDb = Math.max(-18, Math.min(18, totalDb));
      points.push([f, totalDb]);
    }

    return points;
  }, [goldSampleFreqs, parameters, masterIntensity]);

  // Frequency and Decibel Ticks
  const freqTicks = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
  const dbTicks = [0, -12, -24, -36, -48, -60, -72, -84];

  // =========================================================================
  // D3 REAL-TIME ANIMATION LOOP
  // =========================================================================
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    if (!svg.node()) return;

    let analyser: AnalyserNode;
    try {
      analyser = masterAudioBus.getAnalyser();
    } catch (e) {
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const freqData = new Float32Array(bufferLength);
    const audioCtx = masterAudioBus.getAudioContext();
    const sampleRate = audioCtx.sampleRate || 44100;

    if (!peakHoldBufferRef.current || peakHoldBufferRef.current.length !== bufferLength) {
      peakHoldBufferRef.current = new Float32Array(bufferLength).fill(-100);
    }

    // D3 Area & Line Generators for Real-time FFT
    const areaGen = d3.area<SpectralPoint>()
      .x(d => xScale(d.freq))
      .y0(yScale(-90))
      .y1(d => yScale(d.db))
      .curve(d3.curveMonotoneX);

    const lineGen = d3.line<SpectralPoint>()
      .x(d => xScale(d.freq))
      .y(d => yScale(d.db))
      .curve(d3.curveMonotoneX);

    // D3 Line & Area Generator for Gold Path Transfer Curve
    const goldLineGen = d3.line<[number, number]>()
      .x(d => xScale(d[0]))
      .y(d => yScaleGoldCurve(d[1]))
      .curve(d3.curveMonotoneX);

    const goldAreaGen = d3.area<[number, number]>()
      .x(d => xScale(d[0]))
      .y0(yScaleGoldCurve(0))
      .y1(d => yScaleGoldCurve(d[1]))
      .curve(d3.curveMonotoneX);

    let frameCount = 0;

    const renderLoop = () => {
      analyser.getFloatFrequencyData(freqData);

      const points: SpectralPoint[] = [];
      const peakPoints: SpectralPoint[] = [];
      let maxDb = -100;
      let maxFreq = 0;
      let sumLinear = 0;

      const peakHold = peakHoldBufferRef.current!;

      // Calculate log-spaced frequency points across SVG inner width
      const numPoints = Math.min(180, Math.floor(innerWidth / 3.5));
      for (let i = 0; i < numPoints; i++) {
        const t = i / (numPoints - 1);
        const freq = 20 * Math.pow(20000 / 20, t);
        const binIndex = Math.min(
          bufferLength - 1,
          Math.max(0, Math.round((freq / (sampleRate / 2)) * bufferLength))
        );

        let db = freqData[binIndex];
        if (!isFinite(db) || db < -90) db = -90;

        // Apply spectral tilt for mastering evaluation (Pink Noise target curve)
        if (tiltMode === '3db') {
          const octaves = Math.log2(freq / 1000);
          db += octaves * 3.0;
        } else if (tiltMode === '4.5db') {
          const octaves = Math.log2(freq / 1000);
          db += octaves * 4.5;
        }
        db = Math.max(-90, Math.min(0, db));

        // Peak Hold tracking with smooth decay
        if (db > peakHold[binIndex]) {
          peakHold[binIndex] = db;
        } else {
          peakHold[binIndex] = Math.max(-90, peakHold[binIndex] - 0.25);
        }

        points.push({ freq, db });
        peakPoints.push({ freq, db: peakHold[binIndex] });

        if (db > maxDb) {
          maxDb = db;
          maxFreq = freq;
        }

        sumLinear += Math.pow(10, db / 20);
      }

      // Update Real-time Spectral Path elements via D3
      const areaPath = svg.select<SVGPathElement>('.gold-spectral-area');
      const linePath = svg.select<SVGPathElement>('.gold-spectral-line');
      const peakPath = svg.select<SVGPathElement>('.gold-spectral-peak-line');

      if (!areaPath.empty() && (displayMode === 'area' || displayMode === 'both')) {
        areaPath.attr('d', areaGen(points) || '');
      } else if (!areaPath.empty()) {
        areaPath.attr('d', '');
      }

      if (!linePath.empty() && (displayMode === 'line' || displayMode === 'both')) {
        linePath.attr('d', lineGen(points) || '');
      } else if (!linePath.empty()) {
        linePath.attr('d', '');
      }

      if (!peakPath.empty() && showPeakHold) {
        peakPath.attr('d', lineGen(peakPoints) || '');
      } else if (!peakPath.empty()) {
        peakPath.attr('d', '');
      }

      // Update Gold Path Target Curve via D3
      if (showGoldCurve) {
        const goldCurvePoints = computeGoldPathCurvePoints();
        const goldCurvePath = svg.select<SVGPathElement>('.gold-curve-line');
        const goldCurveArea = svg.select<SVGPathElement>('.gold-curve-area');

        if (!goldCurvePath.empty()) {
          goldCurvePath.attr('d', goldLineGen(goldCurvePoints) || '');
        }
        if (!goldCurveArea.empty()) {
          goldCurveArea.attr('d', goldAreaGen(goldCurvePoints) || '');
        }
      }

      // Throttle React state telemetry to ~15fps for zero main-thread lag
      frameCount++;
      if (frameCount % 4 === 0) {
        setPeakFreq(Math.round(maxFreq));
        setPeakDb(Number(maxDb.toFixed(1)));
        setDominantNote(maxDb > -75 ? freqToNoteName(maxFreq) : '--');

        const avgLinear = sumLinear / numPoints;
        const approxRms = avgLinear > 0.0001 ? 20 * Math.log10(avgLinear) : -90;
        setEstimatedRms(Number(approxRms.toFixed(1)));
      }

      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [xScale, yScale, yScaleGoldCurve, innerWidth, tiltMode, displayMode, showPeakHold, showGoldCurve, computeGoldPathCurvePoints]);

  // Mouse hover listener on graph for exact frequency inspection
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (
      mouseX >= margin.left && 
      mouseX <= dimensions.width - margin.right &&
      mouseY >= margin.top && 
      mouseY <= dimensions.height - margin.bottom
    ) {
      const freq = xScale.invert(mouseX);
      const db = yScale.invert(mouseY);
      setHoverData({ freq: Math.round(freq), db: Number(db.toFixed(1)), x: mouseX, y: mouseY });
    } else {
      setHoverData(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverData(null);
  };

  // Safe coordinates for Gold Path stage markers
  const subMonoX = xScale(Math.max(20, Math.min(20000, parameters?.monoSubCutoffHz || 120)));
  const deMudX = xScale(400);
  const airX = xScale(12000);
  const ceilingY = yScale(Math.max(-90, Math.min(0, parameters?.ceilingDb || -0.8)));

  return (
    <div 
      ref={containerRef}
      className={`w-full bg-[#070A16] border border-[#1E2849] rounded-2xl overflow-hidden flex flex-col shadow-2xl font-mono select-none ${className}`}
    >
      {/* Top Telemetry Header */}
      <div className="px-4 py-2.5 bg-gradient-to-r from-[#090D20] via-[#0E1530] to-[#090D20] border-b border-[#18213D] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
            <Activity className="w-4 h-4 text-[#FFD700]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white uppercase tracking-wider text-xs flex items-center gap-1.5">
                <span>D3.JS SPECTRAL ANALYZER</span>
                <span className="text-[10px] text-amber-400 font-bold">&bull; GOLD PATH FEED</span>
              </span>
              <span className="px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-500/40 text-[9px] font-bold text-amber-300">
                REAL-TIME FFT
              </span>
            </div>
            <p className="text-[10px] text-[#64748B]">
              Real-time logarithmic frequency transfer & mastering spectrum analysis
            </p>
          </div>
        </div>

        {/* Real-time Audio Readout Badges */}
        <div className="flex items-center gap-2.5 flex-wrap text-[11px]">
          {/* Peak Frequency & Note */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#050711] border border-[#1C2542]">
            <span className="text-[10px] text-[#64748B] font-bold uppercase">PEAK:</span>
            <span className="font-bold text-amber-300">{peakFreq > 0 ? `${peakFreq} Hz` : '--'}</span>
            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-black text-[9px]">
              {dominantNote}
            </span>
          </div>

          {/* Peak Level dBFS */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#050711] border border-[#1C2542]">
            <span className="text-[10px] text-[#64748B] font-bold uppercase">LEVEL:</span>
            <span className={`font-bold ${peakDb > -6 ? 'text-red-400 animate-pulse' : peakDb > -14 ? 'text-amber-300' : 'text-emerald-300'}`}>
              {peakDb > -90 ? `${peakDb} dBFS` : '--'}
            </span>
          </div>

          {/* Target LUFS indicator */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#050711] border border-[#1C2542]">
            <span className="text-[10px] text-[#64748B] font-bold uppercase">TARGET:</span>
            <span className="font-bold text-emerald-300">
              {parameters?.targetLufs ? `${parameters.targetLufs} LUFS` : '-14.0 LUFS'}
            </span>
          </div>

          {/* Active Preset Tag */}
          <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#050711] border border-amber-500/30 text-[10px] text-amber-300 font-bold truncate max-w-[180px]">
            <Sparkles size={11} className="text-[#FFD700] shrink-0" />
            <span className="truncate">{presetName}</span>
          </div>
        </div>
      </div>

      {/* Main D3 Interactive SVG Canvas */}
      <div className="relative w-full overflow-hidden bg-[#04060E]">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full block select-none cursor-crosshair"
        >
          <defs>
            {/* Real-time Spectrum Gradient (Amber Gold into Cyan/Indigo) */}
            <linearGradient id="goldSpectrumGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFD700" stopOpacity="0.45" />
              <stop offset="35%" stopColor="#F59E0B" stopOpacity="0.25" />
              <stop offset="70%" stopColor="#06B6D4" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
            </linearGradient>

            {/* Gold Path Transfer Curve Shaded Area Gradient */}
            <linearGradient id="goldCurveAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFD700" stopOpacity="0.18" />
              <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#FFD700" stopOpacity="0.0" />
            </linearGradient>

            {/* Glowing Filter for Gold Path lines */}
            <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. Frequency Band Background Shading */}
          {GOLD_PATH_BANDS.map((band, idx) => {
            const x1 = xScale(band.min);
            const x2 = xScale(band.max);
            const w = Math.max(0, x2 - x1);
            return (
              <rect
                key={band.name}
                x={x1}
                y={margin.top}
                width={w}
                height={innerHeight}
                fill={band.color}
                opacity={idx % 2 === 0 ? 0.03 : 0.055}
                pointerEvents="none"
              />
            );
          })}

          {/* 2. Frequency Grid Lines & Labels */}
          {freqTicks.map(freq => {
            const x = xScale(freq);
            const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
            return (
              <g key={`freq-${freq}`} pointerEvents="none">
                <line
                  x1={x}
                  y1={margin.top}
                  x2={x}
                  y2={dimensions.height - margin.bottom}
                  stroke="#16203A"
                  strokeWidth="1"
                  strokeDasharray={freq === 1000 ? 'none' : '3 3'}
                />
                <text
                  x={x}
                  y={dimensions.height - margin.bottom + 18}
                  fill="#64748B"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* 3. Decibel (dBFS) Grid Lines & Labels */}
          {dbTicks.map(db => {
            const y = yScale(db);
            return (
              <g key={`db-${db}`} pointerEvents="none">
                <line
                  x1={margin.left}
                  y1={y}
                  x2={dimensions.width - margin.right}
                  y2={y}
                  stroke={db === 0 ? '#38466E' : '#141C34'}
                  strokeWidth={db === 0 ? '1.5' : '1'}
                  strokeDasharray={db === 0 ? 'none' : '2 4'}
                />
                <text
                  x={margin.left - 8}
                  y={y + 3}
                  fill={db === 0 ? '#F59E0B' : '#64748B'}
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="end"
                  fontWeight={db === 0 ? 'bold' : 'normal'}
                >
                  {db}
                </text>
              </g>
            );
          })}

          {/* Right Y-Axis: Gold Path EQ Gain Curve (+/- 18 dB) */}
          {[12, 6, 0, -6, -12].map(eqDb => {
            const y = yScaleGoldCurve(eqDb);
            return (
              <text
                key={`eq-label-${eqDb}`}
                x={dimensions.width - margin.right + 8}
                y={y + 3}
                fill={eqDb === 0 ? '#FFD700' : '#475569'}
                fontSize="8"
                fontFamily="monospace"
                textAnchor="start"
                pointerEvents="none"
              >
                {eqDb > 0 ? `+${eqDb}` : eqDb}
              </text>
            );
          })}

          {/* 4. REAL-TIME FFT SPECTRUM AREA & STROKE (D3 Controlled) */}
          <path
            className="gold-spectral-area"
            fill="url(#goldSpectrumGradient)"
            pointerEvents="none"
          />
          <path
            className="gold-spectral-line"
            fill="none"
            stroke="#00F0FF"
            strokeWidth="1.8"
            opacity="0.9"
            pointerEvents="none"
          />
          <path
            className="gold-spectral-peak-line"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="1.2"
            strokeDasharray="2 2"
            opacity="0.75"
            pointerEvents="none"
          />

          {/* 5. GOLD PATH TARGET TRANSFER CURVE (D3 Controlled) */}
          <path
            className="gold-curve-area"
            fill="url(#goldCurveAreaGradient)"
            pointerEvents="none"
          />
          <path
            className="gold-curve-line"
            fill="none"
            stroke="#FFD700"
            strokeWidth="2.4"
            filter="url(#goldGlow)"
            pointerEvents="none"
          />

          {/* 6. Gold Path Stage Visual Guides */}
          {showStageGuides && (
            <g className="gold-path-stage-guides" pointerEvents="none">
              {/* Mono Sub Lock Guideline */}
              {subMonoX >= margin.left && subMonoX <= dimensions.width - margin.right && (
                <g>
                  <line
                    x1={subMonoX}
                    y1={margin.top}
                    x2={subMonoX}
                    y2={dimensions.height - margin.bottom}
                    stroke="#6366F1"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    opacity="0.8"
                  />
                  <rect
                    x={subMonoX - 35}
                    y={margin.top + 6}
                    width="70"
                    height="16"
                    rx="4"
                    fill="#1E1B4B"
                    stroke="#6366F1"
                    strokeWidth="1"
                  />
                  <text
                    x={subMonoX}
                    y={margin.top + 17}
                    fill="#C7D2FE"
                    fontSize="8"
                    fontFamily="monospace"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    MONO SUB {parameters?.monoSubCutoffHz || 120}Hz
                  </text>
                </g>
              )}

              {/* 400Hz De-Mud Notch Guide */}
              {deMudX >= margin.left && deMudX <= dimensions.width - margin.right && (
                <g>
                  <line
                    x1={deMudX}
                    y1={margin.top}
                    x2={deMudX}
                    y2={dimensions.height - margin.bottom}
                    stroke="#10B981"
                    strokeWidth="1"
                    strokeDasharray="2 3"
                    opacity="0.6"
                  />
                  <rect
                    x={deMudX - 30}
                    y={margin.top + 26}
                    width="60"
                    height="15"
                    rx="3"
                    fill="#064E3B"
                    stroke="#10B981"
                    strokeWidth="0.8"
                  />
                  <text
                    x={deMudX}
                    y={margin.top + 36}
                    fill="#A7F3D0"
                    fontSize="8"
                    fontFamily="monospace"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    DE-MUD {parameters?.deMudGainDb ? `${parameters.deMudGainDb}dB` : '-2.0dB'}
                  </text>
                </g>
              )}

              {/* Brickwall Limiter Ceiling Guideline */}
              {ceilingY >= margin.top && ceilingY <= dimensions.height - margin.bottom && (
                <g>
                  <line
                    x1={margin.left}
                    y1={ceilingY}
                    x2={dimensions.width - margin.right}
                    y2={ceilingY}
                    stroke="#EF4444"
                    strokeWidth="1.2"
                    strokeDasharray="6 3"
                    opacity="0.85"
                  />
                  <text
                    x={dimensions.width - margin.right - 6}
                    y={ceilingY - 5}
                    fill="#FCA5A5"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="end"
                    fontWeight="bold"
                  >
                    CEILING: {parameters?.ceilingDb || -0.8} dBFS
                  </text>
                </g>
              )}
            </g>
          )}

          {/* 7. Mouse Hover Tooltip Crosshair */}
          {hoverData && (
            <g pointerEvents="none">
              <line
                x1={hoverData.x}
                y1={margin.top}
                x2={hoverData.x}
                y2={dimensions.height - margin.bottom}
                stroke="#FFD700"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.75"
              />
              <line
                x1={margin.left}
                y1={hoverData.y}
                x2={dimensions.width - margin.right}
                y2={hoverData.y}
                stroke="#FFD700"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.75"
              />
              <circle
                cx={hoverData.x}
                cy={hoverData.y}
                r="4"
                fill="#FFD700"
                stroke="#000"
                strokeWidth="1.5"
              />
              <rect
                x={Math.min(dimensions.width - margin.right - 95, Math.max(margin.left + 5, hoverData.x + 8))}
                y={Math.max(margin.top + 5, hoverData.y - 30)}
                width="90"
                height="24"
                rx="4"
                fill="#0A0E22"
                stroke="#FFD700"
                strokeWidth="1"
                opacity="0.95"
              />
              <text
                x={Math.min(dimensions.width - margin.right - 50, Math.max(margin.left + 50, hoverData.x + 53))}
                y={Math.max(margin.top + 21, hoverData.y - 14)}
                fill="#FFD700"
                fontSize="10"
                fontFamily="monospace"
                textAnchor="middle"
                fontWeight="bold"
              >
                {hoverData.freq >= 1000 ? `${(hoverData.freq / 1000).toFixed(2)} kHz` : `${hoverData.freq} Hz`} | {hoverData.db} dB
              </text>
            </g>
          )}

          {/* Bottom Frequency Band Category Labels */}
          <g className="band-category-labels" pointerEvents="none">
            {GOLD_PATH_BANDS.map(band => {
              const xMid = Math.sqrt(band.min * band.max);
              const xPos = xScale(xMid);
              if (xPos < margin.left || xPos > dimensions.width - margin.right) return null;
              return (
                <text
                  key={`band-tag-${band.name}`}
                  x={xPos}
                  y={margin.top + 14}
                  fill={band.color}
                  fontSize="8"
                  fontFamily="monospace"
                  textAnchor="middle"
                  opacity="0.65"
                  fontWeight="bold"
                >
                  {band.name}
                </text>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Bottom Visualizer Controls & Real-Time Test Signal Deck */}
      {showControls && (
        <div className="px-4 py-2.5 bg-[#060814] border-t border-[#18213D] flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Signal Source Calibration (Generate test tones through Gold Path chain) */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-[#64748B] uppercase flex items-center gap-1">
              <Zap size={11} className="text-yellow-400" />
              <span>TEST SIGNAL:</span>
            </span>

            {[
              { id: 'pink_noise', label: 'Pink Noise' },
              { id: 'multiband_mix', label: 'Multiband Mix' },
              { id: 'sine_sweep', label: 'Sine Sweep' },
              { id: 'cal_tone', label: '1kHz Cal' }
            ].map(sig => {
              const isActive = activeSignal === sig.id;
              return (
                <button
                  key={sig.id}
                  onClick={() => handleToggleTestSignal(sig.id as any)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                    isActive
                      ? 'bg-amber-500 text-black shadow-[0_0_10px_#F59E0B]'
                      : 'bg-[#10162B] text-[#94A3B8] hover:text-white hover:bg-[#18223E] border border-[#1F2C4E]'
                  }`}
                  title={`Run ${sig.label} reference signal through Gold Path chain`}
                >
                  {isActive ? <Square size={9} fill="black" /> : <Play size={9} />}
                  <span>{sig.label}</span>
                </button>
              );
            })}
          </div>

          {/* Display & D3 Layer Toggles */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Gold Path Transfer Curve Toggle */}
            <button
              onClick={() => setShowGoldCurve(!showGoldCurve)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all ${
                showGoldCurve
                  ? 'bg-amber-950/80 border-amber-500/60 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                  : 'bg-[#10162B] border-[#1F2C4E] text-[#64748B]'
              }`}
              title="Toggle Gold Path Target Transfer Curve overlay"
            >
              <Sparkles size={11} className="text-[#FFD700]" />
              <span>Gold Curve</span>
            </button>

            {/* Stage Guides Toggle */}
            <button
              onClick={() => setShowStageGuides(!showStageGuides)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all ${
                showStageGuides
                  ? 'bg-indigo-950/80 border-indigo-500/60 text-indigo-300'
                  : 'bg-[#10162B] border-[#1F2C4E] text-[#64748B]'
              }`}
              title="Toggle Stage Boundary Guides (Mono Sub, De-Mud, Ceiling)"
            >
              <ShieldCheck size={11} />
              <span>Guides</span>
            </button>

            {/* Peak Hold Toggle */}
            <button
              onClick={() => setShowPeakHold(!showPeakHold)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all ${
                showPeakHold
                  ? 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300'
                  : 'bg-[#10162B] border-[#1F2C4E] text-[#64748B]'
              }`}
              title="Toggle Spectrum Peak Hold lines"
            >
              <Waves size={11} />
              <span>Peak Hold</span>
            </button>

            {/* Tilt Mode (Mastering pink-noise target slope) */}
            <div className="flex items-center bg-[#0C1226] border border-[#1F2C4E] rounded-lg px-2 py-0.5 text-[10px]">
              <span className="text-[#64748B] mr-1 font-bold">TILT:</span>
              <button
                onClick={() => setTiltMode(prev => prev === 'flat' ? '3db' : prev === '3db' ? '4.5db' : 'flat')}
                className="text-amber-300 font-bold hover:text-white"
                title="Spectral slope weighting for mastering balance"
              >
                {tiltMode === '3db' ? '+3.0 dB/oct' : tiltMode === '4.5db' ? '+4.5 dB/oct' : 'Flat'}
              </button>
            </div>

            {/* FFT Resolution selector */}
            <div className="flex items-center bg-[#0C1226] border border-[#1F2C4E] rounded-lg px-2 py-0.5 text-[10px]">
              <span className="text-[#64748B] mr-1 font-bold">FFT:</span>
              <select
                value={fftSize}
                onChange={e => setFftSize(parseInt(e.target.value))}
                className="bg-transparent text-cyan-300 font-bold focus:outline-none cursor-pointer"
              >
                <option value={1024} className="bg-[#0A0E22]">1024</option>
                <option value={2048} className="bg-[#0A0E22]">2048</option>
                <option value={4096} className="bg-[#0A0E22]">4096</option>
              </select>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default GoldPathSpectralVisualizer;
