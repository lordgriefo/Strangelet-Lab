import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { masterAudioBus, ParametricEqBand } from '../lib/masterBus';
import { 
  Activity, Play, Square, Volume2, Sliders, Eye, Zap, 
  BarChart3, RefreshCw, Radio, Layers, Power, RotateCcw,
  Sparkles, Filter, Waves, ArrowDownToLine, ArrowUpFromLine,
  SlidersHorizontal, Check, ChevronDown
} from 'lucide-react';

interface SpectralAnalyzerProps {
  height?: number;
  className?: string;
  showControls?: boolean;
}

interface SpectralPoint {
  freq: number;
  db: number;
}

// Frequency bands for professional audio mastering
const FREQ_BANDS = [
  { name: 'Sub', min: 20, max: 60, color: '#6366F1' },
  { name: 'Bass', min: 60, max: 250, color: '#3B82F6' },
  { name: 'Low Mid', min: 250, max: 500, color: '#10B981' },
  { name: 'Mid', min: 500, max: 2000, color: '#F59E0B' },
  { name: 'High Mid', min: 2000, max: 4000, color: '#F97316' },
  { name: 'Presence', min: 4000, max: 6000, color: '#EC4899' },
  { name: 'Brilliance', min: 6000, max: 20000, color: '#A855F7' }
];

// EQ Presets
const EQ_PRESETS: { name: string; desc: string; bands: Partial<ParametricEqBand>[] }[] = [
  {
    name: 'Suno AI Anti-Sheen & Un-Bake',
    desc: 'Aggressive 8.2kHz metallic sheen notch with 420Hz de-mud dip and high air sheen restore.',
    bands: [
      { id: 'band-1', frequency: 36, gain: 0, q: 0.8, type: 'highpass', enabled: true },
      { id: 'band-2', frequency: 115, gain: 1.2, q: 0.707, type: 'lowshelf', enabled: true },
      { id: 'band-3', frequency: 420, gain: -3.5, q: 2.2, type: 'peaking', enabled: true },
      { id: 'band-4', frequency: 2600, gain: -1.0, q: 1.4, type: 'peaking', enabled: true },
      { id: 'band-5', frequency: 8200, gain: -4.5, q: 2.0, type: 'peaking', enabled: true },
      { id: 'band-6', frequency: 18500, gain: 0, q: 0.707, type: 'lowpass', enabled: true }
    ]
  },
  {
    name: 'Mastering Clean & Transparent',
    desc: 'Gentle mastering touch with sub rumble high-pass, minor boxiness dip, and silky air lift.',
    bands: [
      { id: 'band-1', frequency: 30, gain: 0, q: 0.707, type: 'highpass', enabled: true },
      { id: 'band-2', frequency: 100, gain: 0.5, q: 0.707, type: 'lowshelf', enabled: true },
      { id: 'band-3', frequency: 380, gain: -1.5, q: 1.4, type: 'peaking', enabled: true },
      { id: 'band-4', frequency: 2800, gain: 0.8, q: 1.2, type: 'peaking', enabled: true },
      { id: 'band-5', frequency: 12000, gain: 1.8, q: 0.707, type: 'highshelf', enabled: true },
      { id: 'band-6', frequency: 19500, gain: 0, q: 0.707, type: 'lowpass', enabled: true }
    ]
  },
  {
    name: 'Sub-Bass Tightener (Club Punch)',
    desc: 'Stiff 45Hz high-pass filter with tight 85Hz kick fundamental boost and 300Hz mud notch.',
    bands: [
      { id: 'band-1', frequency: 45, gain: 0, q: 0.9, type: 'highpass', enabled: true },
      { id: 'band-2', frequency: 85, gain: 2.5, q: 1.6, type: 'peaking', enabled: true },
      { id: 'band-3', frequency: 300, gain: -2.8, q: 1.8, type: 'peaking', enabled: true },
      { id: 'band-4', frequency: 1800, gain: 0.5, q: 1.0, type: 'peaking', enabled: true },
      { id: 'band-5', frequency: 10000, gain: 1.2, q: 0.707, type: 'highshelf', enabled: true },
      { id: 'band-6', frequency: 18000, gain: 0, q: 0.707, type: 'lowpass', enabled: true }
    ]
  },
  {
    name: 'Vocal Presence & Shimmer',
    desc: 'High-pass at 65Hz, body scoop at 450Hz, vocal attack lift at 3.2kHz, and 12kHz sheen.',
    bands: [
      { id: 'band-1', frequency: 65, gain: 0, q: 0.707, type: 'highpass', enabled: true },
      { id: 'band-2', frequency: 140, gain: -1.2, q: 0.707, type: 'lowshelf', enabled: true },
      { id: 'band-3', frequency: 450, gain: -2.4, q: 1.8, type: 'peaking', enabled: true },
      { id: 'band-4', frequency: 3200, gain: 2.5, q: 1.3, type: 'peaking', enabled: true },
      { id: 'band-5', frequency: 12500, gain: 3.0, q: 0.707, type: 'highshelf', enabled: true },
      { id: 'band-6', frequency: 20000, gain: 0, q: 0.707, type: 'lowpass', enabled: true }
    ]
  },
  {
    name: 'Flat Neutral Bypass',
    desc: 'Zero decibel curve with wide open cutoff points (20Hz HPF, 20kHz LPF).',
    bands: [
      { id: 'band-1', frequency: 20, gain: 0, q: 0.707, type: 'highpass', enabled: true },
      { id: 'band-2', frequency: 100, gain: 0, q: 0.707, type: 'lowshelf', enabled: true },
      { id: 'band-3', frequency: 500, gain: 0, q: 1.0, type: 'peaking', enabled: true },
      { id: 'band-4', frequency: 2500, gain: 0, q: 1.0, type: 'peaking', enabled: true },
      { id: 'band-5', frequency: 8000, gain: 0, q: 0.707, type: 'peaking', enabled: true },
      { id: 'band-6', frequency: 20000, gain: 0, q: 0.707, type: 'lowpass', enabled: true }
    ]
  }
];

// Converts frequency in Hz to musical note (e.g. 440 -> A4)
function freqToNoteName(freq: number): string {
  if (freq < 16) return '';
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const midi = Math.round(69 + 12 * Math.log2(freq / 440));
  const note = noteNames[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

export const SpectralAnalyzer: React.FC<SpectralAnalyzerProps> = ({
  height = 360,
  className = '',
  showControls = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height });

  // FFT & Display Settings
  const [fftSize, setFftSize] = useState<number>(2048);
  const [smoothing, setSmoothing] = useState<number>(0.82);
  const [showPeakHold, setShowPeakHold] = useState<boolean>(true);
  const [tiltMode, setTiltMode] = useState<'flat' | '3db' | '4.5db'>('3db');
  const [displayMode, setDisplayMode] = useState<'area' | 'line' | 'both'>('both');
  const [activeSignal, setActiveSignal] = useState<'none' | 'pink_noise' | 'multiband_mix' | 'sine_sweep' | 'cal_tone'>('none');

  // Parametric EQ State
  const [bands, setBands] = useState<ParametricEqBand[]>(masterAudioBus.getBands());
  const [eqBypassed, setEqBypassed] = useState<boolean>(masterAudioBus.isEqBypassed());
  const [selectedBandId, setSelectedBandId] = useState<string>('band-1');
  const [showEqCurve, setShowEqCurve] = useState<boolean>(true);
  const [draggingBandId, setDraggingBandId] = useState<string | null>(null);
  const [hoveredBandId, setHoveredBandId] = useState<string | null>(null);

  // Real-time Metrics
  const [peakFreq, setPeakFreq] = useState<number>(0);
  const [peakDb, setPeakDb] = useState<number>(-100);
  const [dominantNote, setDominantNote] = useState<string>('');
  const [hoverData, setHoverData] = useState<{ freq: number; db: number; x: number; y: number } | null>(null);

  const animationFrameRef = useRef<number | null>(null);
  const peakHoldBufferRef = useRef<Float32Array | null>(null);

  // Resize Observer for fluid responsiveness
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

  // Subscribe to Master Audio Bus Parametric EQ updates
  useEffect(() => {
    const unsub = masterAudioBus.subscribeEqChange((updatedBands, bypassed) => {
      setBands(updatedBands);
      setEqBypassed(bypassed);
    });
    return unsub;
  }, []);

  // Update Analyser settings
  useEffect(() => {
    try {
      const analyser = masterAudioBus.getAnalyser();
      analyser.fftSize = fftSize;
      analyser.smoothingTimeConstant = smoothing;
    } catch (e) {
      console.warn('Analyser configure deferred:', e);
    }
  }, [fftSize, smoothing]);

  // Cleanup test audio on unmount
  useEffect(() => {
    return () => {
      masterAudioBus.stopTestSignal();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Handle signal source changes
  const handleToggleTestSignal = (type: 'pink_noise' | 'multiband_mix' | 'sine_sweep' | 'cal_tone') => {
    if (activeSignal === type) {
      masterAudioBus.stopTestSignal();
      setActiveSignal('none');
    } else {
      masterAudioBus.startTestSignal(type);
      setActiveSignal(type);
    }
  };

  // D3 Scales & Dimensions Math
  const margin = { top: 26, right: 46, bottom: 44, left: 50 };
  const innerWidth = Math.max(10, dimensions.width - margin.left - margin.right);
  const innerHeight = Math.max(10, dimensions.height - margin.top - margin.bottom);

  // Frequency Scale (Logarithmic 20 Hz to 20,000 Hz)
  const xScale = useMemo(() => {
    return d3.scaleLog()
      .domain([20, 20000])
      .range([margin.left, dimensions.width - margin.right])
      .clamp(true);
  }, [dimensions.width, margin.left, margin.right]);

  // Spectral dB Scale (Linear -100 dBFS to 0 dBFS)
  const yScale = useMemo(() => {
    return d3.scaleLinear()
      .domain([-100, 0])
      .range([dimensions.height - margin.bottom, margin.top])
      .clamp(true);
  }, [dimensions.height, margin.top, margin.bottom]);

  // Parametric EQ Gain Scale (-18 dB to +18 dB, center at 0 dB)
  const yScaleEq = useMemo(() => {
    return d3.scaleLinear()
      .domain([-18, 18])
      .range([dimensions.height - margin.bottom - 12, margin.top + 12])
      .clamp(true);
  }, [dimensions.height, margin.top, margin.bottom]);

  // Sample array of 128 frequencies for evaluating the EQ transfer function
  const eqSampleFreqs = useMemo(() => {
    const arr = new Float32Array(140);
    for (let i = 0; i < 140; i++) {
      const t = i / (140 - 1);
      arr[i] = 20 * Math.pow(20000 / 20, t);
    }
    return arr;
  }, []);

  // Static Frequency & dB Ticks
  const freqTicks = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
  const dbTicks = [0, -12, -24, -36, -48, -60, -72, -84, -96];
  const eqDbTicks = [18, 12, 6, 0, -6, -12, -18];

  // Real-time Audio Visualizer & EQ Transfer Curve Loop
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

    const areaGen = d3.area<SpectralPoint>()
      .x(d => xScale(d.freq))
      .y0(yScale(-100))
      .y1(d => yScale(d.db))
      .curve(d3.curveMonotoneX);

    const lineGen = d3.line<SpectralPoint>()
      .x(d => xScale(d.freq))
      .y(d => yScale(d.db))
      .curve(d3.curveMonotoneX);

    // Generator for the combined Parametric EQ frequency curve
    const eqLineGen = d3.line<[number, number]>()
      .x(d => xScale(d[0]))
      .y(d => yScaleEq(d[1]))
      .curve(d3.curveMonotoneX);

    const eqAreaGen = d3.area<[number, number]>()
      .x(d => xScale(d[0]))
      .y0(yScaleEq(0))
      .y1(d => yScaleEq(d[1]))
      .curve(d3.curveMonotoneX);

    let frameCount = 0;

    const renderSpectrumAndEq = () => {
      analyser.getFloatFrequencyData(freqData);

      const points: SpectralPoint[] = [];
      const peakPoints: SpectralPoint[] = [];
      let maxDb = -100;
      let maxFreq = 0;

      const peakHold = peakHoldBufferRef.current!;

      // Step log-spaced points from 20 Hz to 20 kHz
      const numPoints = Math.min(180, Math.floor(innerWidth / 3));
      for (let i = 0; i < numPoints; i++) {
        const t = i / (numPoints - 1);
        const freq = 20 * Math.pow(20000 / 20, t);
        const binIndex = Math.min(
          bufferLength - 1,
          Math.max(0, Math.round((freq / (sampleRate / 2)) * bufferLength))
        );

        let db = freqData[binIndex];
        if (!isFinite(db) || db < -100) db = -100;

        // Apply spectral tilt for mastering perspective
        if (tiltMode === '3db') {
          const octaves = Math.log2(freq / 1000);
          db += octaves * 3.0;
        } else if (tiltMode === '4.5db') {
          const octaves = Math.log2(freq / 1000);
          db += octaves * 4.5;
        }
        db = Math.max(-100, Math.min(0, db));

        // Peak Hold logic
        if (db > peakHold[binIndex]) {
          peakHold[binIndex] = db;
        } else {
          peakHold[binIndex] = Math.max(-100, peakHold[binIndex] - 0.28);
        }

        points.push({ freq, db });
        peakPoints.push({ freq, db: peakHold[binIndex] });

        if (db > maxDb) {
          maxDb = db;
          maxFreq = freq;
        }
      }

      // Update Real-time Spectral Path Attributes
      const areaPath = svg.select<SVGPathElement>('.spectral-area');
      const linePath = svg.select<SVGPathElement>('.spectral-line');
      const peakPath = svg.select<SVGPathElement>('.spectral-peak-line');

      if (!areaPath.empty()) {
        areaPath.attr('d', areaGen(points) || '');
      }
      if (!linePath.empty()) {
        linePath.attr('d', lineGen(points) || '');
      }
      if (!peakPath.empty()) {
        peakPath.attr('d', lineGen(peakPoints) || '');
      }

      // Render Dynamic Parametric EQ Transfer Function Curve
      if (showEqCurve) {
        const eqDbArray = masterAudioBus.getCombinedFrequencyResponse(eqSampleFreqs);
        const eqDataPoints: [number, number][] = [];
        for (let i = 0; i < eqSampleFreqs.length; i++) {
          eqDataPoints.push([eqSampleFreqs[i], eqDbArray[i]]);
        }

        const eqCurvePath = svg.select<SVGPathElement>('.eq-curve-line');
        const eqAreaPath = svg.select<SVGPathElement>('.eq-curve-area');

        if (!eqCurvePath.empty()) {
          eqCurvePath.attr('d', eqLineGen(eqDataPoints) || '');
        }
        if (!eqAreaPath.empty()) {
          eqAreaPath.attr('d', eqAreaGen(eqDataPoints) || '');
        }
      }

      // Throttle React state updates to ~15fps for stats to keep main thread silky smooth
      frameCount++;
      if (frameCount % 4 === 0) {
        setPeakFreq(Math.round(maxFreq));
        setPeakDb(Number(maxDb.toFixed(1)));
        setDominantNote(maxDb > -70 ? freqToNoteName(maxFreq) : '--');
      }

      animationFrameRef.current = requestAnimationFrame(renderSpectrumAndEq);
    };

    renderSpectrumAndEq();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [xScale, yScale, yScaleEq, tiltMode, innerWidth, showEqCurve, eqSampleFreqs]);

  // Handle Mouse Hover on Graph for Exact Frequency & Note readout
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (mouseX >= margin.left && mouseX <= dimensions.width - margin.right &&
        mouseY >= margin.top && mouseY <= dimensions.height - margin.bottom) {
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

  // Interactive Drag Handlers for Parametric EQ Handles
  const handleBandPointerDown = (e: React.PointerEvent, bandId: string) => {
    e.stopPropagation();
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch (err) {}
    setSelectedBandId(bandId);
    setDraggingBandId(bandId);
  };

  const handleBandPointerMove = (e: React.PointerEvent, band: ParametricEqBand) => {
    if (draggingBandId !== band.id) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newFreq = Math.round(Math.max(20, Math.min(20000, xScale.invert(mouseX))));

    if (band.type === 'highpass' || band.type === 'lowpass') {
      // Cutoff filters: horizontal drag updates cut-off frequency.
      // Vertical drag adjusts resonance peak / Q factor slightly
      const yZero = yScaleEq(0);
      const dy = (yZero - mouseY);
      const qOffset = Math.max(-0.4, Math.min(3.0, dy * 0.025));
      const newQ = Number(Math.max(0.4, Math.min(6.0, 0.707 + qOffset)).toFixed(2));
      masterAudioBus.updateBand(band.id, { frequency: newFreq, q: newQ });
    } else {
      // Peaking or Shelf filters: horizontal drag is frequency, vertical drag is gain
      const newGain = Number(Math.max(-18, Math.min(18, yScaleEq.invert(mouseY))).toFixed(1));
      masterAudioBus.updateBand(band.id, { frequency: newFreq, gain: newGain });
    }
  };

  const handleBandPointerUp = (e: React.PointerEvent) => {
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch (err) {}
    setDraggingBandId(null);
  };

  // Selected Band Reference
  const currentBand = useMemo(() => {
    return bands.find(b => b.id === selectedBandId) || bands[0];
  }, [bands, selectedBandId]);

  // Primary Cutoff Points for dynamic visual callouts
  const hpfCutoffBand = bands.find(b => b.type === 'highpass');
  const lpfCutoffBand = bands.find(b => b.type === 'lowpass');

  // Load Preset
  const handleApplyPreset = (preset: typeof EQ_PRESETS[0]) => {
    const updated = bands.map(b => {
      const match = preset.bands.find(pb => pb.id === b.id);
      return match ? { ...b, ...match } : b;
    });
    masterAudioBus.setAllBands(updated);
  };

  return (
    <div className={`flex flex-col bg-[#050711] border border-[#232946] rounded-xl overflow-hidden shadow-2xl ${className}`} ref={containerRef}>
      {/* Top Header & Real-time Readout Toolbar */}
      <div className="px-4 py-3 bg-[#0A0D1E] border-b border-[#1C223C] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#FFD700]/15 border border-[#FFD700]/30 flex items-center justify-center text-[#FFD700]">
            <Activity size={16} />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold text-white tracking-wider flex items-center gap-2">
              D3 MASTER BUS SPECTRAL ANALYZER & PARAMETRIC EQ
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-semibold">
                REAL-TIME DSP
              </span>
            </h3>
            <p className="text-[10px] text-[#717C9B] font-mono">
              Dynamic biquad filter transfer curve • Drag cut-off handles to filter audio in real-time
            </p>
          </div>
        </div>

        {/* Real-time Metering Stats */}
        <div className="flex items-center gap-3 bg-[#050711] border border-[#1C223C] px-3 py-1.5 rounded-lg font-mono text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#64748B] uppercase">Peak:</span>
            <span className="text-[#FFD700] font-bold">
              {peakFreq > 0 ? (peakFreq >= 1000 ? `${(peakFreq / 1000).toFixed(2)} kHz` : `${peakFreq} Hz`) : '--'}
            </span>
          </div>

          <div className="w-px h-3.5 bg-[#1F2642]" />

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#64748B] uppercase">Level:</span>
            <span className={peakDb > -12 ? 'text-[#EF4444] font-bold' : peakDb > -30 ? 'text-[#10B981] font-bold' : 'text-[#64748B]'}>
              {peakDb > -95 ? `${peakDb} dB` : '-inf'}
            </span>
          </div>

          <div className="w-px h-3.5 bg-[#1F2642]" />

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#64748B] uppercase">Note:</span>
            <span className="text-cyan-400 font-bold">{dominantNote || '--'}</span>
          </div>
        </div>

        {/* Signal Generator Quick Buttons */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-[#64748B] uppercase mr-1 hidden sm:inline">Feed Signal:</span>
          <button
            onClick={() => handleToggleTestSignal('pink_noise')}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-semibold transition-all border ${
              activeSignal === 'pink_noise'
                ? 'bg-[#FFD700] text-black border-[#FFD700] shadow-[0_0_10px_rgba(255,215,0,0.4)]'
                : 'bg-[#12162B] text-[#94A3B8] border-[#222B4C] hover:text-white'
            }`}
            title="Pink Noise (Flat energy per octave across 20Hz-20kHz)"
          >
            Pink Noise
          </button>
          <button
            onClick={() => handleToggleTestSignal('multiband_mix')}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-semibold transition-all border ${
              activeSignal === 'multiband_mix'
                ? 'bg-[#10B981] text-black border-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                : 'bg-[#12162B] text-[#94A3B8] border-[#222B4C] hover:text-white'
            }`}
            title="Harmonic multi-band music chord progression"
          >
            AI Mix Ref
          </button>
          <button
            onClick={() => handleToggleTestSignal('cal_tone')}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-semibold transition-all border ${
              activeSignal === 'cal_tone'
                ? 'bg-purple-500 text-white border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                : 'bg-[#12162B] text-[#94A3B8] border-[#222B4C] hover:text-white'
            }`}
            title="1 kHz Calibration Tone (-18 dBFS)"
          >
            1 kHz Tone
          </button>
          {activeSignal !== 'none' && (
            <button
              onClick={() => handleToggleTestSignal(activeSignal as any)}
              className="p-1 text-red-400 hover:text-white rounded bg-red-950/40 border border-red-800/60"
              title="Stop Signal Generator"
            >
              <Square size={12} />
            </button>
          )}
        </div>
      </div>

      {/* SVG Canvas Area: D3 Real-Time Spectrum + Parametric EQ Overlay */}
      <div className="relative w-full flex-1 bg-[#050711] overflow-hidden select-none">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full block cursor-crosshair"
        >
          <defs>
            {/* Spectral Area Gradient */}
            <linearGradient id="spectralGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFD700" stopOpacity="0.40" />
              <stop offset="35%" stopColor="#EC4899" stopOpacity="0.22" />
              <stop offset="70%" stopColor="#3B82F6" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#050711" stopOpacity="0.0" />
            </linearGradient>

            {/* Parametric EQ Fill Gradient (Boost / Cut Area) */}
            <linearGradient id="eqFillGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFD700" stopOpacity="0.28" />
              <stop offset="50%" stopColor="#A855F7" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.25" />
            </linearGradient>

            {/* Low-Cut / HPF Barrier Gradient */}
            <linearGradient id="lowCutGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#EC4899" stopOpacity="0.28" />
              <stop offset="85%" stopColor="#EC4899" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#EC4899" stopOpacity="0.0" />
            </linearGradient>

            {/* High-Cut / LPF Barrier Gradient */}
            <linearGradient id="highCutGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.0" />
              <stop offset="15%" stopColor="#06B6D4" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.28" />
            </linearGradient>

            {/* Subtle glow filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Band Shading */}
          {FREQ_BANDS.map((band, idx) => {
            const x1 = xScale(band.min);
            const x2 = xScale(band.max);
            return (
              <g key={band.name}>
                <rect
                  x={x1}
                  y={margin.top}
                  width={Math.max(1, x2 - x1)}
                  height={innerHeight}
                  fill={idx % 2 === 0 ? 'rgba(255, 255, 255, 0.012)' : 'rgba(0, 0, 0, 0.04)'}
                />
                <text
                  x={x1 + (x2 - x1) / 2}
                  y={margin.top - 8}
                  textAnchor="middle"
                  className="fill-[#4C5577] text-[9px] font-mono uppercase tracking-widest font-semibold"
                >
                  {band.name}
                </text>
                <line
                  x1={x2}
                  y1={margin.top}
                  x2={x2}
                  y2={dimensions.height - margin.bottom}
                  stroke="#161B33"
                  strokeDasharray="2,3"
                />
              </g>
            );
          })}

          {/* Shaded Cutoff Barriers */}
          {hpfCutoffBand && hpfCutoffBand.enabled && (
            <g className="hpf-cut-zone">
              <rect
                x={xScale(20)}
                y={margin.top}
                width={Math.max(0, xScale(hpfCutoffBand.frequency) - xScale(20))}
                height={innerHeight}
                fill="url(#lowCutGradient)"
              />
              <line
                x1={xScale(hpfCutoffBand.frequency)}
                y1={margin.top}
                x2={xScale(hpfCutoffBand.frequency)}
                y2={dimensions.height - margin.bottom}
                stroke="#EC4899"
                strokeWidth="1.5"
                strokeDasharray="4,3"
                opacity="0.9"
              />
              <text
                x={xScale(hpfCutoffBand.frequency) + 4}
                y={margin.top + 18}
                className="fill-[#EC4899] text-[9px] font-mono font-bold select-none"
              >
                HPF CUT: {Math.round(hpfCutoffBand.frequency)} Hz
              </text>
            </g>
          )}

          {lpfCutoffBand && lpfCutoffBand.enabled && (
            <g className="lpf-cut-zone">
              <rect
                x={xScale(lpfCutoffBand.frequency)}
                y={margin.top}
                width={Math.max(0, xScale(20000) - xScale(lpfCutoffBand.frequency))}
                height={innerHeight}
                fill="url(#highCutGradient)"
              />
              <line
                x1={xScale(lpfCutoffBand.frequency)}
                y1={margin.top}
                x2={xScale(lpfCutoffBand.frequency)}
                y2={dimensions.height - margin.bottom}
                stroke="#06B6D4"
                strokeWidth="1.5"
                strokeDasharray="4,3"
                opacity="0.9"
              />
              <text
                x={xScale(lpfCutoffBand.frequency) - 6}
                y={margin.top + 18}
                textAnchor="end"
                className="fill-[#06B6D4] text-[9px] font-mono font-bold select-none"
              >
                LPF CUT: {(lpfCutoffBand.frequency / 1000).toFixed(1)} kHz
              </text>
            </g>
          )}

          {/* Horizontal dB Grid Lines (Left Axis: Spectrum dBFS) */}
          {dbTicks.map(db => {
            const y = yScale(db);
            return (
              <g key={`spec-${db}`}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={dimensions.width - margin.right}
                  y2={y}
                  stroke={db === 0 ? '#EF4444' : db === -12 ? '#374151' : '#14182E'}
                  strokeDasharray={db === 0 ? 'none' : '3,3'}
                  strokeWidth={db === 0 ? 1.2 : 1}
                />
                <text
                  x={margin.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-[#4A5578] text-[9px] font-mono select-none"
                >
                  {db} dB
                </text>
              </g>
            );
          })}

          {/* Parametric EQ 0 dB Center Reference Line & Right Axis Ticks */}
          {showEqCurve && (
            <g className="eq-reference-axis">
              {/* 0 dB Center Line */}
              <line
                x1={margin.left}
                y1={yScaleEq(0)}
                x2={dimensions.width - margin.right}
                y2={yScaleEq(0)}
                stroke="#FFD700"
                strokeWidth="1.2"
                strokeDasharray="4,4"
                opacity="0.5"
              />
              {/* Right Axis EQ dB Scale */}
              {eqDbTicks.map(eqDb => {
                const y = yScaleEq(eqDb);
                return (
                  <g key={`eq-${eqDb}`}>
                    <text
                      x={dimensions.width - margin.right + 6}
                      y={y + 3}
                      className={`text-[8px] font-mono font-bold select-none ${
                        eqDb === 0 ? 'fill-[#FFD700]' : eqDb > 0 ? 'fill-emerald-400' : 'fill-cyan-400'
                      }`}
                    >
                      {eqDb > 0 ? `+${eqDb}` : eqDb}
                    </text>
                  </g>
                );
              })}
              <text
                x={dimensions.width - 6}
                y={margin.top - 8}
                textAnchor="end"
                className="fill-[#FFD700] text-[8px] font-mono uppercase font-bold"
              >
                EQ (dB)
              </text>
            </g>
          )}

          {/* Vertical Frequency Grid Lines & Labels */}
          {freqTicks.map(f => {
            const x = xScale(f);
            const label = f >= 1000 ? `${f / 1000}k` : `${f}`;
            return (
              <g key={`freq-${f}`}>
                <line
                  x1={x}
                  y1={margin.top}
                  x2={x}
                  y2={dimensions.height - margin.bottom}
                  stroke="#14182E"
                  strokeWidth={1}
                />
                <text
                  x={x}
                  y={dimensions.height - margin.bottom + 16}
                  textAnchor="middle"
                  className="fill-[#5B668D] text-[9px] font-mono select-none"
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* D3 Dynamic Real-time Spectrum Area */}
          {(displayMode === 'area' || displayMode === 'both') && (
            <path
              className="spectral-area pointer-events-none"
              fill="url(#spectralGradient)"
            />
          )}

          {/* D3 Dynamic Real-time Peak Hold Curve */}
          {showPeakHold && (
            <path
              className="spectral-peak-line pointer-events-none"
              fill="none"
              stroke="#A855F7"
              strokeWidth="1.2"
              strokeDasharray="2,2"
              opacity="0.75"
            />
          )}

          {/* D3 Dynamic Real-time Spectral Curve Line */}
          {(displayMode === 'line' || displayMode === 'both') && (
            <path
              className="spectral-line pointer-events-none"
              fill="none"
              stroke="#FFD700"
              strokeWidth="1.8"
              filter="url(#glow)"
            />
          )}

          {/* Parametric EQ Shaded Area between 0 dB and Filter Curve */}
          {showEqCurve && (
            <path
              className="eq-curve-area pointer-events-none"
              fill="url(#eqFillGradient)"
              opacity={eqBypassed ? 0.08 : 0.35}
            />
          )}

          {/* Parametric EQ Transfer Curve Line */}
          {showEqCurve && (
            <path
              className="eq-curve-line pointer-events-none"
              fill="none"
              stroke={eqBypassed ? '#64748B' : '#FFD700'}
              strokeWidth={eqBypassed ? '1.5' : '2.8'}
              strokeDasharray={eqBypassed ? '4,4' : 'none'}
              filter={eqBypassed ? undefined : 'url(#glow)'}
              opacity={eqBypassed ? 0.4 : 0.95}
            />
          )}

          {/* Interactive Draggable EQ Band Nodes / Cut-off Handles */}
          {showEqCurve && bands.map((band, idx) => {
            const isSelected = selectedBandId === band.id;
            const isHovered = hoveredBandId === band.id;
            const isDragging = draggingBandId === band.id;

            const cx = xScale(band.frequency);
            // Highpass and Lowpass handles ride along the 0 dB plane
            const cy = (band.type === 'highpass' || band.type === 'lowpass')
              ? yScaleEq(0)
              : yScaleEq(band.gain);

            return (
              <g
                key={band.id}
                className="eq-node-handle cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => handleBandPointerDown(e, band.id)}
                onPointerMove={(e) => handleBandPointerMove(e, band)}
                onPointerUp={handleBandPointerUp}
                onPointerCancel={handleBandPointerUp}
                onMouseEnter={() => setHoveredBandId(band.id)}
                onMouseLeave={() => setHoveredBandId(null)}
              >
                {/* Outer Touch Target (for effortless click and mobile touch) */}
                <circle
                  cx={cx}
                  cy={cy}
                  r="24"
                  fill="transparent"
                />

                {/* Outer Selection Halo Ring */}
                {(isSelected || isHovered || isDragging) && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isDragging ? 18 : 15}
                    fill="none"
                    stroke={band.color}
                    strokeWidth="2"
                    strokeDasharray={band.enabled ? 'none' : '3,2'}
                    opacity={band.enabled ? 0.8 : 0.4}
                    className="animate-pulse"
                  />
                )}

                {/* Inner Node Body */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 10 : 8}
                  fill={band.enabled ? band.color : '#334155'}
                  stroke="#050711"
                  strokeWidth="2.2"
                  filter="url(#glow)"
                />

                {/* Band Index Number */}
                <text
                  cx={cx}
                  cy={cy}
                  x={cx}
                  y={cy + 3}
                  textAnchor="middle"
                  className="fill-[#050711] text-[9px] font-mono font-extrabold select-none pointer-events-none"
                >
                  {idx + 1}
                </text>

                {/* Active/Hover Floating HUD Tooltip */}
                {(isSelected || isHovered || isDragging) && (
                  <g className="pointer-events-none">
                    <rect
                      x={Math.min(dimensions.width - margin.right - 85, Math.max(margin.left + 5, cx - 45))}
                      y={Math.max(margin.top + 5, cy - 38)}
                      width="90"
                      height="26"
                      rx="5"
                      fill="#080C1B"
                      stroke={band.color}
                      strokeWidth="1.2"
                      opacity="0.95"
                    />
                    <text
                      x={Math.min(dimensions.width - margin.right - 85, Math.max(margin.left + 5, cx - 45)) + 45}
                      y={Math.max(margin.top + 5, cy - 38) + 11}
                      textAnchor="middle"
                      className="fill-white text-[9px] font-mono font-bold"
                    >
                      {band.frequency >= 1000 ? `${(band.frequency / 1000).toFixed(2)} kHz` : `${Math.round(band.frequency)} Hz`}
                      <tspan className="fill-[#FFD700]"> ({freqToNoteName(band.frequency)})</tspan>
                    </text>
                    <text
                      x={Math.min(dimensions.width - margin.right - 85, Math.max(margin.left + 5, cx - 45)) + 45}
                      y={Math.max(margin.top + 5, cy - 38) + 22}
                      textAnchor="middle"
                      className="fill-[#94A3B8] text-[8px] font-mono"
                    >
                      {band.type === 'highpass' ? 'HPF Cutoff' : band.type === 'lowpass' ? 'LPF Cutoff' : `${band.gain > 0 ? '+' : ''}${band.gain} dB`} • Q {band.q}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Hover Crosshair Guide */}
          {hoverData && !draggingBandId && (
            <g className="hover-guide pointer-events-none">
              <line
                x1={hoverData.x}
                y1={margin.top}
                x2={hoverData.x}
                y2={dimensions.height - margin.bottom}
                stroke="#06B6D4"
                strokeWidth="1"
                strokeDasharray="3,2"
              />
              <line
                x1={margin.left}
                y1={hoverData.y}
                x2={dimensions.width - margin.right}
                y2={hoverData.y}
                stroke="#06B6D4"
                strokeWidth="1"
                strokeDasharray="3,2"
              />
              <circle
                cx={hoverData.x}
                cy={hoverData.y}
                r="4"
                fill="#06B6D4"
                stroke="#fff"
                strokeWidth="1.5"
              />
            </g>
          )}
        </svg>

        {/* Hover Tooltip Overlay for Spectrum Cursor */}
        {hoverData && !draggingBandId && (
          <div
            className="absolute pointer-events-none z-20 px-2.5 py-1 rounded-md bg-[#0F1426]/95 border border-cyan-500/50 shadow-xl font-mono text-[11px] text-white backdrop-blur-sm -translate-x-1/2 -translate-y-full -mt-2"
            style={{ left: hoverData.x, top: hoverData.y }}
          >
            <div className="flex items-center gap-2">
              <span className="text-cyan-300 font-bold">
                {hoverData.freq >= 1000 ? `${(hoverData.freq / 1000).toFixed(2)} kHz` : `${hoverData.freq} Hz`}
              </span>
              <span className="text-[#FFD700] font-bold">({freqToNoteName(hoverData.freq)})</span>
              <span className="text-[#94A3B8]">{hoverData.db} dBFS</span>
            </div>
          </div>
        )}
      </div>

      {/* PARAMETRIC EQ CONTROL DOCK */}
      {showControls && (
        <div className="bg-[#090C1C] border-t border-[#1C223C] p-3 sm:p-4 flex flex-col gap-3">
          {/* Master EQ Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#181E35]">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[#FFD700] font-bold flex items-center gap-1.5">
                <SlidersHorizontal size={14} />
                PARAMETRIC MASTERING EQ
              </span>

              {/* Master Bypass Toggle */}
              <button
                onClick={() => masterAudioBus.setEqBypass(!eqBypassed)}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all flex items-center gap-1.5 border ${
                  eqBypassed
                    ? 'bg-red-950/60 text-red-400 border-red-800'
                    : 'bg-emerald-950/60 text-emerald-400 border-emerald-800 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                }`}
                title="Bypass all parametric EQ filters"
              >
                <Power size={11} />
                <span>{eqBypassed ? 'EQ BYPASSED' : 'EQ ACTIVE'}</span>
              </button>

              {/* Show/Hide EQ Curve on Graph */}
              <button
                onClick={() => setShowEqCurve(!showEqCurve)}
                className={`px-2 py-1 rounded text-[10px] font-mono transition-colors border ${
                  showEqCurve
                    ? 'bg-[#151A33] text-cyan-300 border-[#252E56]'
                    : 'bg-[#0A0D1E] text-[#64748B] border-[#1C223C]'
                }`}
                title="Toggle EQ Curve visual overlay"
              >
                <Eye size={11} className="inline mr-1" />
                <span>Curve Overlay</span>
              </button>

              {/* Reset to Flat */}
              <button
                onClick={() => masterAudioBus.resetEqToFlat()}
                className="px-2 py-1 rounded text-[10px] font-mono text-[#8E99B8] hover:text-white bg-[#12162B] border border-[#222B4C] hover:bg-[#1A203C] transition-colors flex items-center gap-1"
                title="Reset all EQ bands to 0 dB"
              >
                <RotateCcw size={11} />
                <span>Reset Flat</span>
              </button>
            </div>

            {/* Presets Quick Selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
              <span className="text-[10px] font-mono text-[#64748B] uppercase mr-1">Presets:</span>
              {EQ_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handleApplyPreset(preset)}
                  className="px-2.5 py-1 rounded text-[10px] font-mono text-[#A5B4FC] bg-[#12162D] border border-[#232B52] hover:bg-[#1C2346] hover:text-white transition-all whitespace-nowrap"
                  title={preset.desc}
                >
                  {preset.name.split(' ')[0]} {preset.name.split(' ')[1]}
                </button>
              ))}
            </div>
          </div>

          {/* 6 Band Selection Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {bands.map((band, idx) => {
              const isSelected = selectedBandId === band.id;
              return (
                <div
                  key={band.id}
                  onClick={() => setSelectedBandId(band.id)}
                  className={`p-2 rounded-lg cursor-pointer transition-all border flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#141A36] border-[#FFD700] shadow-[0_0_12px_rgba(255,215,0,0.2)]'
                      : 'bg-[#090C1A] border-[#181F38] hover:border-[#2C3760] hover:bg-[#0E1226]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: band.color }}
                      />
                      <span className="text-[10px] font-mono font-bold text-white">
                        Band {idx + 1}
                      </span>
                    </div>

                    {/* Band Power Toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        masterAudioBus.updateBand(band.id, { enabled: !band.enabled });
                      }}
                      className={`p-0.5 rounded ${
                        band.enabled ? 'text-emerald-400 hover:text-emerald-300' : 'text-[#64748B] hover:text-white'
                      }`}
                      title="Enable/Disable this band"
                    >
                      <Power size={11} />
                    </button>
                  </div>

                  <div className="space-y-0.5 font-mono text-[10px]">
                    <div className="flex justify-between text-[#94A3B8]">
                      <span>Freq:</span>
                      <span className="text-white font-bold">
                        {band.frequency >= 1000 ? `${(band.frequency / 1000).toFixed(1)}k` : `${Math.round(band.frequency)}Hz`}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#94A3B8]">
                      <span>Gain:</span>
                      <span className={band.gain > 0 ? 'text-emerald-400 font-bold' : band.gain < 0 ? 'text-cyan-400 font-bold' : 'text-[#94A3B8]'}>
                        {band.type === 'highpass' ? 'HPF Cut' : band.type === 'lowpass' ? 'LPF Cut' : `${band.gain > 0 ? '+' : ''}${band.gain}dB`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Band Fine-Tuning Console */}
          {currentBand && (
            <div className="bg-[#0D1126] border border-[#1C2548] rounded-lg p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs items-center">
              {/* Band Identifier & Filter Type */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentBand.color }} />
                  <span className="font-bold text-white tracking-wide">{currentBand.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-[#64748B] uppercase">Type:</label>
                  <select
                    value={currentBand.type}
                    onChange={(e) => masterAudioBus.updateBand(currentBand.id, { type: e.target.value as any })}
                    className="bg-[#050711] border border-[#252E56] rounded px-2 py-1 text-[11px] text-cyan-300 font-mono focus:outline-none focus:border-[#FFD700]"
                  >
                    <option value="highpass">High-Pass / Low Cut</option>
                    <option value="lowshelf">Low Shelf</option>
                    <option value="peaking">Bell / Peaking</option>
                    <option value="notch">Notch</option>
                    <option value="highshelf">High Shelf</option>
                    <option value="lowpass">Low-Pass / High Cut</option>
                  </select>
                </div>
              </div>

              {/* Frequency Cut-off / Center Frequency Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#64748B]">Cut-off / Center:</span>
                  <span className="text-[#FFD700] font-bold">
                    {currentBand.frequency >= 1000
                      ? `${(currentBand.frequency / 1000).toFixed(2)} kHz`
                      : `${Math.round(currentBand.frequency)} Hz`}{' '}
                    ({freqToNoteName(currentBand.frequency)})
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="20000"
                  step="1"
                  value={currentBand.frequency}
                  onChange={(e) => masterAudioBus.updateBand(currentBand.id, { frequency: parseFloat(e.target.value) })}
                  className="w-full accent-[#FFD700] cursor-pointer"
                />
              </div>

              {/* Gain Slider (Enabled for Bell & Shelves) */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#64748B]">Gain (dB):</span>
                  <span className={currentBand.gain > 0 ? 'text-emerald-400 font-bold' : currentBand.gain < 0 ? 'text-cyan-400 font-bold' : 'text-white'}>
                    {currentBand.type === 'highpass' || currentBand.type === 'lowpass' ? 'Cutoff (0dB)' : `${currentBand.gain > 0 ? '+' : ''}${currentBand.gain} dB`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-18"
                  max="18"
                  step="0.1"
                  disabled={currentBand.type === 'highpass' || currentBand.type === 'lowpass'}
                  value={currentBand.gain}
                  onChange={(e) => masterAudioBus.updateBand(currentBand.id, { gain: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer disabled:opacity-30"
                />
              </div>

              {/* Q Factor / Resonance Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#64748B]">Q / Bandwidth:</span>
                  <span className="text-purple-400 font-bold">{currentBand.q}</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="12"
                  step="0.05"
                  value={currentBand.q}
                  onChange={(e) => masterAudioBus.updateBand(currentBand.id, { q: parseFloat(e.target.value) })}
                  className="w-full accent-purple-400 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Bottom Display Controls Ribbon */}
          <div className="pt-2 border-t border-[#181E35] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            {/* FFT Resolution */}
            <div className="flex items-center gap-2">
              <span className="text-[#64748B] text-[10px] uppercase font-semibold">FFT Size:</span>
              <div className="flex items-center rounded-lg bg-[#050711] p-0.5 border border-[#1E2542]">
                {[1024, 2048, 4096].map(size => (
                  <button
                    key={size}
                    onClick={() => setFftSize(size)}
                    className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                      fftSize === size ? 'bg-[#FFD700] text-black font-bold' : 'text-[#8490B5] hover:text-white'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Spectral Tilt Compensation */}
            <div className="flex items-center gap-2">
              <span className="text-[#64748B] text-[10px] uppercase font-semibold">Tilt Weighting:</span>
              <div className="flex items-center rounded-lg bg-[#050711] p-0.5 border border-[#1E2542]">
                <button
                  onClick={() => setTiltMode('flat')}
                  className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                    tiltMode === 'flat' ? 'bg-cyan-500 text-black font-bold' : 'text-[#8490B5] hover:text-white'
                  }`}
                  title="Raw 0 dB/oct spectrum"
                >
                  0 dB
                </button>
                <button
                  onClick={() => setTiltMode('3db')}
                  className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                    tiltMode === '3db' ? 'bg-cyan-500 text-black font-bold' : 'text-[#8490B5] hover:text-white'
                  }`}
                  title="+3 dB/oct Pink Noise Flat Target"
                >
                  +3 dB (SPAN)
                </button>
                <button
                  onClick={() => setTiltMode('4.5db')}
                  className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                    tiltMode === '4.5db' ? 'bg-cyan-500 text-black font-bold' : 'text-[#8490B5] hover:text-white'
                  }`}
                  title="+4.5 dB/oct Mastering Target"
                >
                  +4.5 dB
                </button>
              </div>
            </div>

            {/* Display Toggles */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer text-[#8490B5] hover:text-white">
                <input
                  type="checkbox"
                  checked={showPeakHold}
                  onChange={(e) => setShowPeakHold(e.target.checked)}
                  className="accent-purple-500 w-3.5 h-3.5 rounded"
                />
                <span className="text-[10px]">Peak Hold</span>
              </label>

              <div className="flex items-center rounded-lg bg-[#050711] p-0.5 border border-[#1E2542]">
                {(['both', 'area', 'line'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setDisplayMode(mode)}
                    className={`px-2 py-0.5 rounded text-[10px] capitalize transition-colors ${
                      displayMode === mode ? 'bg-purple-600 text-white font-bold' : 'text-[#8490B5] hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpectralAnalyzer;
