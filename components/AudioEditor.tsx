// Strangelet Lab - Laser Waveform & Clip Editor with Automatic Silence Detection & Trimming
// Features real-time waveform visualization, adjustable sensitivity threshold (-60dB to -12dB),
// safety pre-roll padding, presets (Vocals, Drums, Acoustic, Strict), and 1-click auto-trimming.

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { 
  Scissors, Volume2, VolumeX, ArrowLeftRight, Play, Pause, RotateCcw, 
  Repeat, Sparkles, CheckCircle2, ChevronLeft, Undo2, Save, 
  Sliders, Activity, Info, Zap, Layers, AlertCircle, Crosshair
} from 'lucide-react';
import { Clip, Track } from '../types';
import { snapToGrid, volumeToDb } from '../lib/audioUtils';

interface AudioEditorProps {
  clip: Clip | null;
  snapValue?: string;
  onClose?: () => void;
  tracks?: Track[];
  tempo?: number;
  onUpdateClip?: (updatedClip: Clip) => void;
  onSelectClip?: (clip: Clip) => void;
}

interface SilenceDetectionResult {
  leadingSilenceBars: number;
  trailingSilenceBars: number;
  leadingSilenceSeconds: number;
  trailingSilenceSeconds: number;
  activeDurationSeconds: number;
  activeDurationBars: number;
  leadingIndex: number;
  trailingIndex: number;
  totalBars: number;
  totalSeconds: number;
  trimmedPercent: number;
  detectedAtThresholdDb: number;
  hasSilence: boolean;
}

export const AudioEditor: React.FC<AudioEditorProps> = ({ 
  clip: initialClip, 
  snapValue = '1/16',
  onClose,
  tracks = [],
  tempo = 120,
  onUpdateClip,
  onSelectClip
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Active clip state (fallback if none selected)
  const [selectedClip, setSelectedClip] = useState<Clip | null>(() => {
    if (initialClip) return initialClip;
    // Find first audio clip in tracks
    for (const t of tracks) {
      if (t.clips && t.clips.length > 0) return t.clips[0];
    }
    return {
      id: 'default-clip',
      name: 'Vocal_Take_Lead_01.wav',
      startBar: 0,
      durationBars: 4,
      fadeInBars: 0.05,
      fadeOutBars: 0.05
    };
  });

  // Keep in sync with initialClip prop when changed from parent
  useEffect(() => {
    if (initialClip) {
      setSelectedClip(initialClip);
    }
  }, [initialClip]);

  // Clip duration calculation
  const clipDurationSeconds = useMemo(() => {
    const bars = selectedClip?.durationBars || 4;
    return Number(((bars * 4 * 60) / tempo).toFixed(3));
  }, [selectedClip?.durationBars, tempo]);

  // Original untrimmed waveform buffer (preserved for reset)
  const initialWaveform = useMemo<number[]>(() => {
    if (selectedClip?.waveformSnippet && selectedClip.waveformSnippet.length > 50) {
      return [...selectedClip.waveformSnippet];
    }
    // Generate organic audio sample waveform with natural silence at start & end
    const totalSamples = 300;
    const samples: number[] = [];
    const leadSilenceSamples = Math.floor(totalSamples * 0.12); // ~12% leading silence
    const tailSilenceSamples = Math.floor(totalSamples * 0.16); // ~16% trailing silence
    const activeStart = leadSilenceSamples;
    const activeEnd = totalSamples - tailSilenceSamples;

    for (let i = 0; i < totalSamples; i++) {
      if (i < activeStart) {
        // Very low noise floor in leading silence zone (-54dB to -60dB)
        const noise = (Math.random() - 0.5) * 0.015;
        samples.push(Math.max(0.002, Math.abs(noise)));
      } else if (i > activeEnd) {
        // Low ambient decay in trailing silence zone
        const tailDecay = Math.exp(-(i - activeEnd) / 15) * 0.02;
        const noise = (Math.random() - 0.5) * 0.012;
        samples.push(Math.max(0.002, Math.abs(tailDecay + noise)));
      } else {
        // Active audio content with transients, body, harmonics
        const relPos = (i - activeStart) / (activeEnd - activeStart);
        const envelope = Math.sin(relPos * Math.PI) * 0.75 + 0.25;
        const transient = (i % 24 < 3) ? 0.95 : 0.45; // rhythmic spikes
        const wave = Math.sin(i * 0.22) * 0.4 + Math.cos(i * 0.55) * 0.35 + (Math.random() * 0.25);
        const val = Math.min(1.0, Math.max(0.04, Math.abs(wave) * envelope * transient));
        samples.push(val);
      }
    }
    return samples;
  }, [selectedClip?.id]);

  // Active editable waveform
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>(initialWaveform);
  const [originalPeaksBackup, setOriginalPeaksBackup] = useState<number[]>(initialWaveform);
  const [isTrimmed, setIsTrimmed] = useState<boolean>(false);

  // When selected clip changes, reload waveform
  useEffect(() => {
    setWaveformPeaks(initialWaveform);
    setOriginalPeaksBackup(initialWaveform);
    setIsTrimmed(false);
  }, [initialWaveform]);

  // Silence Detection Parameters
  const [sensitivityDb, setSensitivityDb] = useState<number>(-36); // -60dB to -12dB
  const [safetyPaddingMs, setSafetyPaddingMs] = useState<number>(10); // 0ms to 50ms
  const [trimMode, setTrimMode] = useState<'both' | 'start' | 'end'>('both');
  const [showSilenceOverlays, setShowSilenceOverlays] = useState<boolean>(true);
  const [showThresholdLine, setShowThresholdLine] = useState<boolean>(true);

  // Region and Playhead state
  const [region, setRegion] = useState<{ start: number; end: number } | null>({ start: 0.12, end: 0.84 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [loopEnabled, setLoopEnabled] = useState<boolean>(true);
  const [markers, setMarkers] = useState<number[]>([0.25, 0.5, 0.75]);
  const [playheadX, setPlayheadX] = useState<number>(0.12);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const activeOscillatorRef = useRef<OscillatorNode | null>(null);

  // Convert sensitivity in dB to linear amplitude threshold (0.0 to 1.0)
  const thresholdLinear = useMemo(() => {
    return Math.pow(10, sensitivityDb / 20);
  }, [sensitivityDb]);

  // Calculate Silence Detection on current waveform
  const silenceResult = useMemo<SilenceDetectionResult>(() => {
    const totalSamples = waveformPeaks.length;
    if (totalSamples === 0) {
      return {
        leadingSilenceBars: 0,
        trailingSilenceBars: 0,
        leadingSilenceSeconds: 0,
        trailingSilenceSeconds: 0,
        activeDurationSeconds: clipDurationSeconds,
        activeDurationBars: selectedClip?.durationBars || 4,
        leadingIndex: 0,
        trailingIndex: 0,
        totalBars: selectedClip?.durationBars || 4,
        totalSeconds: clipDurationSeconds,
        trimmedPercent: 0,
        detectedAtThresholdDb: sensitivityDb,
        hasSilence: false
      };
    }

    const durationSec = clipDurationSeconds;
    const durationBars = selectedClip?.durationBars || 4;
    const paddingFraction = (safetyPaddingMs / 1000) / (durationSec || 1);
    const paddingSamples = Math.floor(paddingFraction * totalSamples);

    // 1. Scan from start for leading silence
    let firstActiveIndex = 0;
    for (let i = 0; i < totalSamples; i++) {
      if (waveformPeaks[i] >= thresholdLinear) {
        firstActiveIndex = i;
        break;
      }
    }

    // Apply safety padding before first transient
    const leadingIndex = Math.max(0, firstActiveIndex - paddingSamples);

    // 2. Scan from end for trailing silence
    let lastActiveIndex = totalSamples - 1;
    for (let i = totalSamples - 1; i >= 0; i--) {
      if (waveformPeaks[i] >= thresholdLinear) {
        lastActiveIndex = i;
        break;
      }
    }

    // Apply safety padding after last decay
    const trailingIndex = Math.min(totalSamples - 1, lastActiveIndex + paddingSamples);

    const leadingFraction = totalSamples > 0 ? (leadingIndex / totalSamples) : 0;
    const trailingFraction = totalSamples > 0 ? ((totalSamples - 1 - trailingIndex) / totalSamples) : 0;

    const leadingSilenceSeconds = Number((leadingFraction * durationSec).toFixed(3));
    const trailingSilenceSeconds = Number((trailingFraction * durationSec).toFixed(3));
    const leadingSilenceBars = Number((leadingFraction * durationBars).toFixed(3));
    const trailingSilenceBars = Number((trailingFraction * durationBars).toFixed(3));

    const activeFraction = Math.max(0.05, 1 - leadingFraction - trailingFraction);
    const activeDurationSeconds = Number((activeFraction * durationSec).toFixed(3));
    const activeDurationBars = Number((activeFraction * durationBars).toFixed(3));

    const trimmedPercent = Number(((leadingFraction + trailingFraction) * 100).toFixed(1));
    const hasSilence = leadingIndex > 2 || trailingIndex < totalSamples - 3;

    return {
      leadingSilenceBars,
      trailingSilenceBars,
      leadingSilenceSeconds,
      trailingSilenceSeconds,
      activeDurationSeconds,
      activeDurationBars,
      leadingIndex,
      trailingIndex,
      totalBars: durationBars,
      totalSeconds: durationSec,
      trimmedPercent,
      detectedAtThresholdDb: sensitivityDb,
      hasSilence
    };
  }, [waveformPeaks, thresholdLinear, clipDurationSeconds, selectedClip?.durationBars, safetyPaddingMs, sensitivityDb]);

  // Sync region selector to detected silence boundaries on mount or when requested
  useEffect(() => {
    if (waveformPeaks.length > 0 && silenceResult.hasSilence) {
      const startNorm = silenceResult.leadingIndex / waveformPeaks.length;
      const endNorm = silenceResult.trailingIndex / waveformPeaks.length;
      setRegion({
        start: Number(startNorm.toFixed(3)),
        end: Number(endNorm.toFixed(3))
      });
      setPlayheadX(Number(startNorm.toFixed(3)));
    }
  }, [silenceResult.leadingIndex, silenceResult.trailingIndex, waveformPeaks.length]);

  // Waveform Render Loop on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#040711');
    bgGrad.addColorStop(1, '#090D1A');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle bar gridlines (16th notes / subdivisions)
    ctx.strokeStyle = '#121A2D';
    ctx.lineWidth = 1;
    const step = width / 16;
    for (let x = 0; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Center 0V baseline
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    const totalSamples = waveformPeaks.length;
    const leadPx = totalSamples > 0 ? (silenceResult.leadingIndex / totalSamples) * width : 0;
    const trailPx = totalSamples > 0 ? (silenceResult.trailingIndex / totalSamples) * width : width;

    // Draw Silence Overlays if enabled
    if (showSilenceOverlays && silenceResult.hasSilence) {
      // 1. Leading Silence Shading (Striped red/amber)
      if (leadPx > 2 && (trimMode === 'both' || trimMode === 'start')) {
        const leadGrad = ctx.createLinearGradient(0, 0, leadPx, 0);
        leadGrad.addColorStop(0, 'rgba(239, 68, 68, 0.28)');
        leadGrad.addColorStop(1, 'rgba(239, 68, 68, 0.08)');
        ctx.fillStyle = leadGrad;
        ctx.fillRect(0, 0, leadPx, height);

        // Diagonal striped hatch lines
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.18)';
        ctx.lineWidth = 1;
        for (let hx = -height; hx < leadPx; hx += 12) {
          ctx.beginPath();
          ctx.moveTo(hx, height);
          ctx.lineTo(hx + height, 0);
          ctx.stroke();
        }

        // Boundary line
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(leadPx, 0);
        ctx.lineTo(leadPx, height);
        ctx.stroke();

        // Label Tag
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(2, 6, Math.min(leadPx - 4, 110), 16);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`LEAD SILENCE ${silenceResult.leadingSilenceSeconds}s`, 6, 17);
      }

      // 2. Trailing Silence Shading
      if (trailPx < width - 2 && (trimMode === 'both' || trimMode === 'end')) {
        const trailWidth = width - trailPx;
        const trailGrad = ctx.createLinearGradient(trailPx, 0, width, 0);
        trailGrad.addColorStop(0, 'rgba(239, 68, 68, 0.08)');
        trailGrad.addColorStop(1, 'rgba(239, 68, 68, 0.28)');
        ctx.fillStyle = trailGrad;
        ctx.fillRect(trailPx, 0, trailWidth, height);

        // Diagonal striped hatch lines
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.18)';
        ctx.lineWidth = 1;
        for (let hx = trailPx - height; hx < width; hx += 12) {
          ctx.beginPath();
          ctx.moveTo(hx, height);
          ctx.lineTo(hx + height, 0);
          ctx.stroke();
        }

        // Boundary line
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(trailPx, 0);
        ctx.lineTo(trailPx, height);
        ctx.stroke();

        // Label Tag
        ctx.fillStyle = '#EF4444';
        const tagX = Math.max(trailPx + 4, width - 120);
        ctx.fillRect(tagX, 6, 115, 16);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`TRAIL SILENCE ${silenceResult.trailingSilenceSeconds}s`, tagX + 4, 17);
      }

      // 3. Active Audio Core Tag
      const activeMidX = (leadPx + trailPx) / 2;
      ctx.fillStyle = '#10B981';
      ctx.fillRect(activeMidX - 60, height - 20, 120, 14);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`ACTIVE CORE: ${silenceResult.activeDurationSeconds}s`, activeMidX - 54, height - 10);
    }

    // Selected Custom Region Shading
    if (region) {
      const regStartPx = region.start * width;
      const regWidthPx = (region.end - region.start) * width;
      
      const regionGrad = ctx.createLinearGradient(0, 0, 0, height);
      regionGrad.addColorStop(0, 'rgba(0, 240, 255, 0.15)');
      regionGrad.addColorStop(1, 'rgba(0, 240, 255, 0.03)');
      ctx.fillStyle = regionGrad;
      ctx.fillRect(regStartPx, 0, regWidthPx, height);

      // Boundaries
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(regStartPx, 0, regWidthPx, height);
    }

    // Draw Sensitivity Threshold Line if enabled
    if (showThresholdLine) {
      const thresholdYUpper = (height / 2) - (thresholdLinear * (height * 0.41));
      const thresholdYLower = (height / 2) + (thresholdLinear * (height * 0.41));

      ctx.save();
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      // Upper threshold line
      ctx.beginPath();
      ctx.moveTo(0, thresholdYUpper);
      ctx.lineTo(width, thresholdYUpper);
      ctx.stroke();

      // Lower threshold line
      ctx.beginPath();
      ctx.moveTo(0, thresholdYLower);
      ctx.lineTo(width, thresholdYLower);
      ctx.stroke();

      ctx.restore();

      // Threshold Label
      ctx.fillStyle = '#FFD700';
      ctx.font = '8px monospace';
      ctx.fillText(`THRESHOLD: ${sensitivityDb} dB`, 8, thresholdYUpper - 3);
    }

    // Draw Waveform Bars
    const barWidth = width / waveformPeaks.length;
    waveformPeaks.forEach((peak, i) => {
      const x = i * barWidth;
      const h = Math.max(2, peak * (height * 0.82));
      const y = (height - h) / 2;

      const isInsideSilenceZone = (i < silenceResult.leadingIndex && (trimMode === 'both' || trimMode === 'start')) ||
                                  (i > silenceResult.trailingIndex && (trimMode === 'both' || trimMode === 'end'));
      const inUserRegion = region && (x / width >= region.start && x / width <= region.end);

      if (isInsideSilenceZone && showSilenceOverlays) {
        ctx.fillStyle = '#451A1A'; // Subdued red for silence
      } else if (inUserRegion) {
        ctx.fillStyle = '#00F0FF'; // Neon cyan for active selected region
      } else {
        ctx.fillStyle = '#384B66'; // Cool slate for unselected body
      }

      ctx.fillRect(x, y, Math.max(1, barWidth - 0.8), h);
    });

    // Draw Markers
    markers.forEach((m, idx) => {
      const mx = m * width;
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(mx, 0);
      ctx.lineTo(mx, height);
      ctx.stroke();

      ctx.fillStyle = '#FFD700';
      ctx.fillRect(mx - 10, 4, 20, 12);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(`M${idx + 1}`, mx - 6, 13);
    });

    // Draw Playhead
    const px = playheadX * width;
    ctx.strokeStyle = '#FF2E63';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, height);
    ctx.stroke();

    // Playhead arrow flag
    ctx.fillStyle = '#FF2E63';
    ctx.beginPath();
    ctx.moveTo(px - 5, 0);
    ctx.lineTo(px + 5, 0);
    ctx.lineTo(px, 8);
    ctx.closePath();
    ctx.fill();

  }, [
    region, markers, playheadX, waveformPeaks, silenceResult, 
    showSilenceOverlays, showThresholdLine, sensitivityDb, 
    thresholdLinear, trimMode
  ]);

  // Audio Playback Simulation using Web Audio API synthesis
  const togglePlay = useCallback((playTrimmedOnly: boolean = false) => {
    if (isPlaying) {
      setIsPlaying(false);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (activeOscillatorRef.current) {
        try { activeOscillatorRef.current.stop(); } catch (_) {}
        activeOscillatorRef.current = null;
      }
    } else {
      setIsPlaying(true);
      
      let startX = 0;
      let endX = 1;

      if (playTrimmedOnly) {
        startX = silenceResult.leadingIndex / waveformPeaks.length;
        endX = silenceResult.trailingIndex / waveformPeaks.length;
      } else if (region) {
        startX = region.start;
        endX = region.end;
      }

      setPlayheadX(startX);

      // Web Audio synthetic preview generator
      try {
        if (!audioCtxRef.current) {
          const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          audioCtxRef.current = new AudioContextClass();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4);

        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        activeOscillatorRef.current = osc;
      } catch (err) {
        console.log('Web Audio playback error:', err);
      }

      let currentX = startX;
      const animatePlayhead = () => {
        currentX += 0.004;
        if (currentX >= endX) {
          if (loopEnabled) {
            currentX = startX;
          } else {
            setIsPlaying(false);
            if (activeOscillatorRef.current) {
              try { activeOscillatorRef.current.stop(); } catch (_) {}
              activeOscillatorRef.current = null;
            }
            return;
          }
        }
        setPlayheadX(currentX);
        animFrameRef.current = requestAnimationFrame(animatePlayhead);
      };
      animFrameRef.current = requestAnimationFrame(animatePlayhead);
    }
  }, [isPlaying, loopEnabled, region, silenceResult, waveformPeaks.length]);

  // Clean up animation frame and audio context on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (activeOscillatorRef.current) {
        try { activeOscillatorRef.current.stop(); } catch (_) {}
      }
    };
  }, []);

  // Canvas Mouse Dragging Handlers
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

  // Perform Silence Trimming
  const handleTrimSilence = () => {
    if (!silenceResult.hasSilence) {
      setStatusNotice('ℹ️ No silence detected above the current threshold.');
      setTimeout(() => setStatusNotice(null), 3500);
      return;
    }

    const totalSamples = waveformPeaks.length;
    let newStartIndex = 0;
    let newEndIndex = totalSamples;

    if (trimMode === 'both') {
      newStartIndex = silenceResult.leadingIndex;
      newEndIndex = silenceResult.trailingIndex;
    } else if (trimMode === 'start') {
      newStartIndex = silenceResult.leadingIndex;
      newEndIndex = totalSamples;
    } else if (trimMode === 'end') {
      newStartIndex = 0;
      newEndIndex = silenceResult.trailingIndex;
    }

    // Slice waveform peaks to the trimmed boundaries
    const trimmedPeaks = waveformPeaks.slice(newStartIndex, newEndIndex);
    if (trimmedPeaks.length < 10) {
      setStatusNotice('⚠️ Trim boundaries too narrow. Adjust sensitivity threshold.');
      setTimeout(() => setStatusNotice(null), 3500);
      return;
    }

    setWaveformPeaks(trimmedPeaks);
    setIsTrimmed(true);

    // Calculate new clip timing
    const leadingShiftBars = (trimMode === 'both' || trimMode === 'start') 
      ? silenceResult.leadingSilenceBars 
      : 0;
    const newDurationBars = Number(silenceResult.activeDurationBars.toFixed(3));
    const newStartBar = Number(((selectedClip?.startBar || 0) + leadingShiftBars).toFixed(3));

    const updatedClip: Clip = {
      ...(selectedClip || { id: 'clip-trimmed', name: 'Trimmed_Clip.wav' }),
      startBar: newStartBar,
      durationBars: newDurationBars,
      fadeInBars: Math.min(0.04, newDurationBars * 0.05),
      fadeOutBars: Math.min(0.04, newDurationBars * 0.05),
      waveformSnippet: trimmedPeaks
    };

    setSelectedClip(updatedClip);
    if (onUpdateClip) {
      onUpdateClip(updatedClip);
    }

    // Reset region to full width of trimmed audio
    setRegion({ start: 0, end: 1 });
    setPlayheadX(0);

    const timeSaved = ((trimMode === 'both' ? (silenceResult.leadingSilenceSeconds + silenceResult.trailingSilenceSeconds) : (trimMode === 'start' ? silenceResult.leadingSilenceSeconds : silenceResult.trailingSilenceSeconds))).toFixed(2);
    setStatusNotice(`✂️ Successfully trimmed ${timeSaved}s of silence! (${silenceResult.trimmedPercent}% freed up)`);
    setTimeout(() => setStatusNotice(null), 4500);
  };

  // Restore Original Waveform & Bounds
  const handleResetTrim = () => {
    setWaveformPeaks(originalPeaksBackup);
    setIsTrimmed(false);

    if (selectedClip && onUpdateClip) {
      const restoredClip: Clip = {
        ...selectedClip,
        durationBars: silenceResult.totalBars,
        startBar: Math.max(0, (selectedClip.startBar || 0) - silenceResult.leadingSilenceBars),
        waveformSnippet: originalPeaksBackup
      };
      setSelectedClip(restoredClip);
      onUpdateClip(restoredClip);
    }

    setRegion({ start: 0.12, end: 0.84 });
    setPlayheadX(0.12);
    setStatusNotice('↺ Restored original untrimmed clip audio and timing.');
    setTimeout(() => setStatusNotice(null), 3500);
  };

  // Preset Handlers
  const applyPreset = (name: string, db: number, padMs: number) => {
    setSensitivityDb(db);
    setSafetyPaddingMs(padMs);
    setStatusNotice(`⚡ Applied "${name}" preset: ${db} dB threshold, ${padMs}ms safety padding`);
    setTimeout(() => setStatusNotice(null), 3000);
  };

  const handleAction = (actionName: string) => {
    setStatusNotice(`✨ Applied ${actionName} to selected region [${((region?.start || 0) * 100).toFixed(0)}% - ${((region?.end || 1) * 100).toFixed(0)}%]`);
    setTimeout(() => setStatusNotice(null), 3500);
  };

  // Find all audio clips in tracks for switching
  const availableClips = useMemo(() => {
    const list: { trackName: string; clip: Clip }[] = [];
    tracks.forEach(track => {
      if (track.type === 'audio') {
        track.clips?.forEach(c => {
          list.push({ trackName: track.name, clip: c });
        });
      }
    });
    return list;
  }, [tracks]);

  return (
    <div className="h-full w-full bg-[#05070E] flex flex-col overflow-y-auto p-4 md:p-6 text-white font-mono select-none">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1A2338]">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] border border-[#334155] text-[#94A3B8] hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
              title="Return to Mixer & Timeline"
            >
              <ChevronLeft size={18} />
            </button>
          )}

          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00F0FF]/20 via-[#FFD700]/20 to-[#FF2E63]/20 border border-[#00F0FF] flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.3)]">
            <Scissors size={22} className="text-[#00F0FF]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-black uppercase tracking-widest text-[#FFD700]">
                STRANGELET LAB
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 font-bold">
                DSP WAVEFORM & SILENCE TRIMMER
              </span>
              {isTrimmed && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                  <CheckCircle2 size={11} /> TRIMMED
                </span>
              )}
            </div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              LASER AUDIO EDITOR & AUTO-SILENCE TRIMMER
            </h1>
          </div>
        </div>

        {/* Global Audition & Action Triggers */}
        <div className="flex items-center gap-2">
          {availableClips.length > 1 && (
            <div className="flex items-center gap-1.5 bg-[#090D18] border border-[#1E293B] rounded-xl px-2.5 py-1.5 text-xs">
              <Layers size={13} className="text-[#64748B]" />
              <select
                value={selectedClip?.id || ''}
                onChange={(e) => {
                  const target = availableClips.find(item => item.clip.id === e.target.value);
                  if (target) {
                    setSelectedClip(target.clip);
                    if (onSelectClip) onSelectClip(target.clip);
                  }
                }}
                className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
              >
                {availableClips.map(({ trackName, clip: c }) => (
                  <option key={c.id} value={c.id} className="bg-[#090D18] text-white">
                    {trackName}: {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => togglePlay(false)}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
              isPlaying
                ? 'bg-[#FF2E63] text-white shadow-[0_0_15px_#FF2E63]'
                : 'bg-[#00F0FF] text-black hover:brightness-110 active:scale-95'
            }`}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlaying ? 'PAUSE' : 'AUDITION'}</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFD700] text-black font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(255,140,0,0.4)] hover:brightness-110 active:scale-95 cursor-pointer"
            >
              <Sliders size={13} />
              <span>RETURN TO MIXER</span>
            </button>
          )}
        </div>
      </div>

      {/* Notice Banner */}
      {statusNotice && (
        <div className="mt-3 px-3.5 py-2.5 rounded-xl bg-[#00F0FF]/15 border border-[#00F0FF] text-xs font-bold text-white flex items-center justify-between shadow-[0_0_15px_rgba(0,240,255,0.3)] animate-fade-in">
          <span className="flex items-center gap-2">
            <Sparkles size={14} className="text-[#00F0FF] animate-pulse" />
            {statusNotice}
          </span>
          <button onClick={() => setStatusNotice(null)} className="text-[#64748B] hover:text-white cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Main Waveform Stage */}
      <div className="mt-4 p-4 bg-[#080B15] border border-[#1A2338] rounded-2xl flex flex-col gap-3 shadow-xl">
        {/* Clip Info & Snap Header */}
        <div className="flex flex-wrap items-center justify-between text-xs pb-2 border-b border-[#141C2E] gap-2">
          <div className="flex items-center gap-3">
            <span className="text-[#64748B]">TARGET AUDIO CLIP:</span>
            <span className="text-white font-bold">{selectedClip ? selectedClip.name : 'Master_Audio_Stem.wav'}</span>
            <span className="px-2 py-0.5 rounded bg-[#101726] text-[#00F0FF] border border-[#1E293B] text-[10px]">
              DURATION: {clipDurationSeconds}s ({selectedClip?.durationBars || 4} bars)
            </span>
            <span className="px-2 py-0.5 rounded bg-[#101726] text-[#FFD700] border border-[#1E293B] text-[10px]">
              TEMPO: {tempo} BPM
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSilenceOverlays(prev => !prev)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                showSilenceOverlays ? 'border-[#EF4444] bg-[#EF4444]/15 text-[#EF4444]' : 'border-[#1E293B] text-[#64748B]'
              }`}
              title="Toggle silence overlay highlighting on waveform"
            >
              <VolumeX size={11} />
              <span>SILENCE HATCHING</span>
            </button>

            <button
              onClick={() => setShowThresholdLine(prev => !prev)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                showThresholdLine ? 'border-[#FFD700] bg-[#FFD700]/15 text-[#FFD700]' : 'border-[#1E293B] text-[#64748B]'
              }`}
              title="Toggle dB sensitivity threshold line on waveform"
            >
              <Activity size={11} />
              <span>THRESHOLD LINE</span>
            </button>

            <button
              onClick={() => setLoopEnabled(!loopEnabled)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                loopEnabled ? 'border-[#00F0FF] bg-[#00F0FF]/15 text-[#00F0FF]' : 'border-[#1E293B] text-[#64748B]'
              }`}
            >
              <Repeat size={11} />
              <span>LOOP</span>
            </button>
            <button
              onClick={() => setMarkers([])}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-[#1E293B] text-[#64748B] hover:text-white cursor-pointer"
            >
              CLEAR MARKERS
            </button>
          </div>
        </div>

        {/* Waveform Canvas */}
        <div className="relative w-full">
          <canvas
            ref={canvasRef}
            width={1200}
            height={260}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            className="w-full h-64 rounded-xl border border-[#141C2E] cursor-crosshair shadow-inner"
          />
        </div>

        {/* Standard Audio Manipulation Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-[#05070E] border border-[#141C2E] rounded-xl text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleAction('Fade In (0.1s)')}
              className="px-2.5 py-1 rounded-lg bg-[#101726] hover:bg-[#1A263D] border border-[#1E293B] text-white hover:text-[#FFD700] transition-all flex items-center gap-1.5 font-bold cursor-pointer"
            >
              <Volume2 size={12} />
              <span>FADE IN</span>
            </button>

            <button
              onClick={() => handleAction('Fade Out (0.1s)')}
              className="px-2.5 py-1 rounded-lg bg-[#101726] hover:bg-[#1A263D] border border-[#1E293B] text-white hover:text-[#FFD700] transition-all flex items-center gap-1.5 font-bold cursor-pointer"
            >
              <Volume2 size={12} />
              <span>FADE OUT</span>
            </button>

            <button
              onClick={() => handleAction('Peak Normalization (0dB)')}
              className="px-2.5 py-1 rounded-lg bg-[#101726] hover:bg-[#1A263D] border border-[#1E293B] text-white hover:text-[#00F0FF] transition-all flex items-center gap-1.5 font-bold cursor-pointer"
            >
              <ArrowLeftRight size={12} />
              <span>NORMALIZE</span>
            </button>

            <button
              onClick={() => handleAction('Audio Inversion')}
              className="px-2.5 py-1 rounded-lg bg-[#101726] hover:bg-[#1A263D] border border-[#1E293B] text-white hover:text-[#FF2E63] transition-all flex items-center gap-1.5 font-bold cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>REVERSE</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
            <span>Click & drag on waveform to select region • Shift+Click to add markers</span>
          </div>
        </div>
      </div>

      {/* DEDICATED SILENCE DETECTION & AUTO-TRIM CONTROL CENTER */}
      <div className="mt-4 p-5 bg-[#080C16] border border-[#1E293B] rounded-2xl shadow-xl flex flex-col gap-4">
        {/* Panel Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#152033]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EF4444]/20 border border-[#EF4444]/60 flex items-center justify-center">
              <VolumeX size={16} className="text-[#EF4444]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                AUTOMATIC SILENCE DETECTOR & TRIMMER
              </h2>
              <p className="text-[11px] text-[#64748B]">
                Intelligently strips dead air, cable buzz, and idle silence at head and tail of audio clips.
              </p>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#05070E] p-1 rounded-xl border border-[#18233C]">
            <span className="text-[9px] text-[#64748B] px-1.5 font-bold uppercase">PRESETS:</span>
            <button
              onClick={() => applyPreset('Studio Vocals', -36, 15)}
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#101726] hover:bg-[#1A263D] text-[#00F0FF] border border-[#1E293B] transition-all cursor-pointer"
            >
              Vocals (-36dB)
            </button>
            <button
              onClick={() => applyPreset('Tight Drums', -24, 5)}
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#101726] hover:bg-[#1A263D] text-[#FFD700] border border-[#1E293B] transition-all cursor-pointer"
            >
              Punchy Drums (-24dB)
            </button>
            <button
              onClick={() => applyPreset('Acoustic / Room', -48, 30)}
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#101726] hover:bg-[#1A263D] text-[#A855F7] border border-[#1E293B] transition-all cursor-pointer"
            >
              Acoustic Room (-48dB)
            </button>
            <button
              onClick={() => applyPreset('Zero Floor', -60, 10)}
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#101726] hover:bg-[#1A263D] text-emerald-400 border border-[#1E293B] transition-all cursor-pointer"
            >
              Strict Zero (-60dB)
            </button>
          </div>
        </div>

        {/* Sliders and Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Sensitivity Threshold Slider */}
          <div className="md:col-span-6 p-3.5 rounded-xl bg-[#05070E] border border-[#18233C] flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#94A3B8] font-bold flex items-center gap-1.5">
                <Sliders size={13} className="text-[#FFD700]" />
                SENSITIVITY THRESHOLD
              </span>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-[#FFD700]">
                  {sensitivityDb} dB
                </span>
                <span className="text-[10px] text-[#64748B]">
                  ({(thresholdLinear * 100).toFixed(1)}% amplitude)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] text-[#64748B] font-mono">-60 dB</span>
              <input
                type="range"
                min={-60}
                max={-12}
                step={1}
                value={sensitivityDb}
                onChange={(e) => setSensitivityDb(Number(e.target.value))}
                className="flex-1 h-2 bg-[#1A263D] rounded-lg appearance-none cursor-pointer accent-[#FFD700]"
              />
              <span className="text-[10px] text-[#64748B] font-mono">-12 dB</span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-[#64748B] pt-0.5">
              <span>Very Sensitive (Preserves soft tails)</span>
              <span>Aggressive (Cuts background noise)</span>
            </div>
          </div>

          {/* Safety Pre-roll Padding Slider */}
          <div className="md:col-span-3 p-3.5 rounded-xl bg-[#05070E] border border-[#18233C] flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#94A3B8] font-bold flex items-center gap-1.5">
                <ShieldAlertIcon size={13} className="text-[#00F0FF]" />
                SAFETY PADDING
              </span>
              <span className="text-base font-black text-[#00F0FF]">
                {safetyPaddingMs} ms
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#64748B]">0ms</span>
              <input
                type="range"
                min={0}
                max={50}
                step={5}
                value={safetyPaddingMs}
                onChange={(e) => setSafetyPaddingMs(Number(e.target.value))}
                className="flex-1 h-2 bg-[#1A263D] rounded-lg appearance-none cursor-pointer accent-[#00F0FF]"
              />
              <span className="text-[10px] text-[#64748B]">50ms</span>
            </div>
            <span className="text-[9px] text-[#64748B]">Protects initial attack transients</span>
          </div>

          {/* Trim Mode Target */}
          <div className="md:col-span-3 p-3.5 rounded-xl bg-[#05070E] border border-[#18233C] flex flex-col gap-2">
            <span className="text-xs text-[#94A3B8] font-bold flex items-center gap-1.5">
              <Scissors size={13} className="text-[#EF4444]" />
              TRIM DIRECTION
            </span>
            <div className="grid grid-cols-3 gap-1">
              {(['both', 'start', 'end'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setTrimMode(mode)}
                  className={`py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    trimMode === mode
                      ? 'bg-[#EF4444] text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                      : 'bg-[#101726] text-[#64748B] hover:text-white'
                  }`}
                >
                  {mode === 'both' ? 'Both' : mode === 'start' ? 'Head' : 'Tail'}
                </button>
              ))}
            </div>
            <span className="text-[9px] text-[#64748B]">
              {trimMode === 'both' ? 'Crops leading & trailing' : trimMode === 'start' ? 'Crops lead-in only' : 'Crops tail decay only'}
            </span>
          </div>
        </div>

        {/* Real-Time Detection Telemetry Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-[#05070E] border border-[#18233C] flex flex-col justify-between">
            <span className="text-[10px] text-[#64748B] uppercase">Leading Silence</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-[#EF4444]">{silenceResult.leadingSilenceSeconds}s</span>
              <span className="text-[10px] text-[#64748B]">({silenceResult.leadingSilenceBars} bars)</span>
            </div>
            <span className="text-[9px] text-[#64748B] mt-0.5">Prior to first transient</span>
          </div>

          <div className="p-3 rounded-xl bg-[#05070E] border border-[#18233C] flex flex-col justify-between">
            <span className="text-[10px] text-[#64748B] uppercase">Trailing Silence</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-[#EF4444]">{silenceResult.trailingSilenceSeconds}s</span>
              <span className="text-[10px] text-[#64748B]">({silenceResult.trailingSilenceBars} bars)</span>
            </div>
            <span className="text-[9px] text-[#64748B] mt-0.5">Following last audio decay</span>
          </div>

          <div className="p-3 rounded-xl bg-[#05070E] border border-[#18233C] flex flex-col justify-between">
            <span className="text-[10px] text-[#64748B] uppercase">Active Audio Core</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-emerald-400">{silenceResult.activeDurationSeconds}s</span>
              <span className="text-[10px] text-[#64748B]">({silenceResult.activeDurationBars} bars)</span>
            </div>
            <span className="text-[9px] text-[#64748B] mt-0.5">Kept arrangement content</span>
          </div>

          <div className="p-3 rounded-xl bg-[#05070E] border border-[#18233C] flex flex-col justify-between">
            <span className="text-[10px] text-[#64748B] uppercase">Timeline Savings</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-[#FFD700]">{silenceResult.trimmedPercent}%</span>
              <span className="text-[10px] text-[#64748B]">freed</span>
            </div>
            <span className="text-[9px] text-[#64748B] mt-0.5">Clean mix headspace</span>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Main Auto-Trim Button */}
            <button
              onClick={handleTrimSilence}
              disabled={!silenceResult.hasSilence}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#EF4444] via-[#F97316] to-[#FFD700] text-black font-extrabold text-xs flex items-center gap-2 transition-all shadow-[0_0_18px_rgba(239,68,68,0.4)] hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              title="Automatically trim silence at start and end of this clip based on sensitivity threshold"
            >
              <Scissors size={15} />
              <span>AUTO-TRIM SILENCE NOW</span>
            </button>

            {/* Audition Active Trimmed Segment */}
            <button
              onClick={() => togglePlay(true)}
              className="px-4 py-2.5 rounded-xl bg-[#101726] hover:bg-[#1A263D] border border-[#1E293B] text-white hover:text-[#00F0FF] font-bold text-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95"
              title="Preview trimmed active core region"
            >
              <Play size={13} className="text-[#00F0FF]" />
              <span>AUDITION TRIMMED CORE</span>
            </button>

            {/* Reset / Restore Button */}
            {isTrimmed && (
              <button
                onClick={handleResetTrim}
                className="px-3.5 py-2.5 rounded-xl bg-[#101726] hover:bg-[#1A263D] border border-[#1E293B] text-[#94A3B8] hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                title="Restore original untrimmed waveform and timing"
              >
                <Undo2 size={13} />
                <span>RESTORE ORIGINAL</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <Info size={13} className="text-[#00F0FF]" />
            <span>Updates clip bounds on multi-track timeline automatically</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Fallback icon helper
const ShieldAlertIcon: React.FC<{ size?: number; className?: string }> = ({ size = 14, className }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </svg>
);

export default AudioEditor;
