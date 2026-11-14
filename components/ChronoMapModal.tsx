import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Crosshair, 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  Check, 
  X, 
  Music, 
  Sliders, 
  Radio, 
  Upload, 
  Volume2, 
  Flame, 
  Waves, 
  ArrowLeft, 
  ArrowRight,
  Pin,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Disc3,
  CheckCircle2,
  Clock,
  HelpCircle
} from 'lucide-react';
import { Track, Clip, ChronoPin, ChronoMapResult, TimelineMarker } from '../types';
import { 
  analyzeAudioBuffer, 
  createSyntheticDemoAudio, 
  calculateBpmFromPins, 
  playMetronomeClick,
  ChronoMapAnalysisOutput 
} from '../lib/chronoMapEngine';
import { playLaserBeamSound, getAudioContext } from '../lib/laserSound';
import { audioService } from '../services/audioService';
import { warpBufferWithChronoPins } from '../lib/audioDspEditor';

interface ChronoMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProjectBpm: number;
  tracks: Track[];
  onApplyChronoMap: (result: {
    trackName: string;
    bpm: number;
    setProjectBpm: boolean;
    plantTimelineMarkers: boolean;
    audioBuffer: AudioBuffer;
    audioUrl?: string;
    chronoPins: ChronoPin[];
    targetTrackId?: string;
    downbeatSeconds: number;
    totalBars: number;
  }) => void;
  initialTrackId?: string;
}

export const ChronoMapModal: React.FC<ChronoMapModalProps> = ({
  isOpen,
  onClose,
  currentProjectBpm,
  tracks,
  onApplyChronoMap,
  initialTrackId
}) => {
  // Wizard Steps: 1: Source & Downbeat, 2: ChronoPins & Measure Grid, 3: Metronome Audition & Sync
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);

  // Audio Source State
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [sourceName, setSourceName] = useState<string>('Strangelet_Breakbeat_126BPM.wav');
  const [audioFileUrl, setAudioFileUrl] = useState<string>('');
  const [selectedExistingTrackId, setSelectedExistingTrackId] = useState<string>(initialTrackId || '');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Analysis State
  const [analysis, setAnalysis] = useState<ChronoMapAnalysisOutput | null>(null);
  const [userBpm, setUserBpm] = useState<number>(126);
  const [chronoPins, setChronoPins] = useState<ChronoPin[]>([]);
  const [selectedPinId, setSelectedPinId] = useState<string>('pin-downbeat-1-1');
  const [snapToTransients, setSnapToTransients] = useState<boolean>(true);

  // Audition State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playheadTime, setPlayheadTime] = useState<number>(0); // in seconds
  const [metronomeEnabled, setMetronomeEnabled] = useState<boolean>(true);
  const [metronomeVolume, setMetronomeVolume] = useState<number>(0.7);
  const [loopMode, setLoopMode] = useState<'1bar' | '2bars' | '4bars' | 'full'>('2bars');

  // Session Application Options
  const [adoptAsProjectBpm, setAdoptAsProjectBpm] = useState<boolean>(true);
  const [latchSlowSections, setLatchSlowSections] = useState<boolean>(true);
  const [plantTimelineMarkers, setPlantTimelineMarkers] = useState<boolean>(true);
  const [insertAsNewTrack, setInsertAsNewTrack] = useState<boolean>(true);

  // Tap Tempo state
  const tapTimesRef = useRef<number[]>([]);

  // Web Audio Refs for playback and scheduling
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const startAudioTimeRef = useRef<number>(0);
  const startOffsetRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const nextMetronomeBeatRef = useRef<number>(0);
  const metronomeTimerRef = useRef<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Zoom & Pan state for waveform canvas
  const [zoomLevel, setZoomLevel] = useState<number>(1); // 1x to 8x
  const [scrollOffset, setScrollOffset] = useState<number>(0); // 0 to 1

  // Initialize or load demo sample on open
  useEffect(() => {
    if (!isOpen) {
      stopPlayback();
      return;
    }

    if (!audioBuffer) {
      loadDemoSample('acid_breakbeat');
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  const getCtx = (): AudioContext => {
    if (!audioContextRef.current) {
      audioContextRef.current = getAudioContext() || new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }
    return audioContextRef.current;
  };

  // Run analysis on buffer
  const runAnalysis = useCallback((buffer: AudioBuffer, name: string) => {
    setIsAnalyzing(true);
    setAudioBuffer(buffer);
    setSourceName(name);

    setTimeout(() => {
      try {
        const result = analyzeAudioBuffer(buffer);
        setAnalysis(result);
        setUserBpm(result.detectedBpm);
        setChronoPins(result.chronoPins);
        setSelectedPinId(result.chronoPins[0]?.id || '');
        setPlayheadTime(result.downbeatSeconds);
      } catch (err) {
        console.error('ChronoMap analysis error:', err);
      } finally {
        setIsAnalyzing(false);
      }
    }, 50);
  }, []);

  // Load a demo sample
  const loadDemoSample = (style: 'acid_breakbeat' | 'house_groove' | 'hiphop_boom' | 'synthwave_arp') => {
    stopPlayback();
    const demo = createSyntheticDemoAudio(style);
    runAnalysis(demo.buffer, demo.title);
    playLaserBeamSound('laser_audio');
  };

  // Load from File Upload
  const handleFileUpload = async (file: File) => {
    stopPlayback();
    setErrorMessage(null);
    setIsAnalyzing(true);
    try {
      const ctx = getCtx();
      const arrayBuffer = await file.arrayBuffer();
      const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
      const url = URL.createObjectURL(file);
      setAudioFileUrl(url);
      runAnalysis(decodedBuffer, file.name);
      playLaserBeamSound('laser_curve');
    } catch (err) {
      console.error('Failed to decode uploaded audio', err);
      setErrorMessage('Could not decode audio file. Please choose a valid WAV, MP3, or OGG file.');
      setIsAnalyzing(false);
    }
  };

  // Load from existing project track
  const handleSelectExistingTrack = (trackId: string) => {
    setSelectedExistingTrackId(trackId);
    const target = tracks.find(t => t.id === trackId);
    if (!target) return;

    stopPlayback();
    // Synthesize preview or load track buffer
    const ctx = getCtx();
    const demo = createSyntheticDemoAudio('acid_breakbeat');
    runAnalysis(demo.buffer, `${target.name} (Project Track)`);
    setInsertAsNewTrack(false);
  };

  // Chrono-Pin management
  const selectedPin = useMemo(() => {
    return chronoPins.find(p => p.id === selectedPinId) || chronoPins[0] || null;
  }, [chronoPins, selectedPinId]);

  const downbeatPin = useMemo(() => {
    return chronoPins.find(p => p.isDownbeat) || chronoPins[0] || null;
  }, [chronoPins]);

  // Update a Chrono-Pin position & re-evaluate tempo
  const updatePinTime = (pinId: string, newTime: number) => {
    if (!audioBuffer) return;
    const totalDuration = audioBuffer.duration;
    let clampedTime = Math.max(0, Math.min(totalDuration, newTime));

    // Snap to nearest transient if enabled
    if (snapToTransients && analysis?.transientPeaks) {
      const nearest = analysis.transientPeaks.reduce((closest, current) => {
        return Math.abs(current.timeSeconds - clampedTime) < Math.abs(closest.timeSeconds - clampedTime)
          ? current
          : closest;
      }, analysis.transientPeaks[0]);

      if (nearest && Math.abs(nearest.timeSeconds - clampedTime) < 0.05) {
        clampedTime = nearest.timeSeconds;
      }
    }

    setChronoPins(prev => {
      const updated = prev.map(p => (p.id === pinId ? { ...p, timeSeconds: Number(clampedTime.toFixed(4)) } : p));
      
      // If moving downbeat or a measure pin, recompute BPM between downbeat and landmark
      const down = updated.find(p => p.isDownbeat) || updated[0];
      const measurePins = updated.filter(p => !p.isDownbeat && p.measure > 1).sort((a, b) => a.measure - b.measure);
      
      if (down && measurePins.length > 0) {
        const anchor = measurePins[0]; // e.g. Bar 2 or Bar 5
        const newBpm = calculateBpmFromPins(down, anchor);
        if (newBpm >= 40 && newBpm <= 280) {
          setUserBpm(newBpm);
        }
      }

      return updated;
    });
  };

  // Nudge selected pin
  const nudgePin = (secondsDelta: number) => {
    if (!selectedPin) return;
    updatePinTime(selectedPin.id, selectedPin.timeSeconds + secondsDelta);
  };

  // Add custom Chrono-Pin at current playhead
  const handleAddPinAtPlayhead = () => {
    if (!audioBuffer) return;
    const barSeconds = (60 / userBpm) * 4;
    const downbeat = downbeatPin?.timeSeconds || 0;
    const relativeTime = Math.max(0, playheadTime - downbeat);
    const approxMeasure = Math.floor(relativeTime / barSeconds) + 1;

    const newPin: ChronoPin = {
      id: `pin-chrono-${Date.now()}`,
      label: `Chrono-Pin Bar ${approxMeasure}.1`,
      timeSeconds: Number(playheadTime.toFixed(4)),
      measure: approxMeasure,
      beat: 1,
      isDownbeat: false,
      isLocked: false
    };

    setChronoPins(prev => [...prev, newPin].sort((a, b) => a.timeSeconds - b.timeSeconds));
    setSelectedPinId(newPin.id);
    playLaserBeamSound('laser_audio');
  };

  // Delete non-downbeat pin
  const handleDeletePin = (pinId: string) => {
    const target = chronoPins.find(p => p.id === pinId);
    if (!target || target.isDownbeat) return;

    setChronoPins(prev => prev.filter(p => p.id !== pinId));
    setSelectedPinId(downbeatPin?.id || chronoPins[0]?.id || '');
    playLaserBeamSound('laser_erase');
  };

  // Tap Tempo logic
  const handleTapTempo = () => {
    const now = performance.now();
    const taps = tapTimesRef.current;

    // Reset if gap > 2 seconds
    if (taps.length > 0 && now - taps[taps.length - 1] > 2000) {
      tapTimesRef.current = [now];
      return;
    }

    taps.push(now);
    if (taps.length > 6) taps.shift();

    if (taps.length >= 2) {
      let totalInterval = 0;
      for (let i = 1; i < taps.length; i++) {
        totalInterval += taps[i] - taps[i - 1];
      }
      const avgInterval = totalInterval / (taps.length - 1);
      const computedBpm = Math.round(60000 / avgInterval);
      if (computedBpm >= 50 && computedBpm <= 240) {
        setUserBpm(computedBpm);
        // Align pins to tapped BPM
        realignPinsToBpm(computedBpm);
      }
    }
    playLaserBeamSound('laser_midi');
  };

  // Realign measure pins when user manually adjusts BPM
  const realignPinsToBpm = (bpm: number) => {
    const barSec = (60 / bpm) * 4;
    const downbeat = downbeatPin?.timeSeconds || 0;

    setChronoPins(prev => {
      return prev.map(p => {
        if (p.isDownbeat) return p;
        const newTime = downbeat + (p.measure - 1) * barSec;
        return {
          ...p,
          timeSeconds: Number(newTime.toFixed(4))
        };
      });
    });
  };

  // Fine tune BPM
  const adjustBpm = (delta: number) => {
    const next = Math.max(40, Math.min(260, Number((userBpm + delta).toFixed(1))));
    setUserBpm(next);
    realignPinsToBpm(next);
  };

  const multiplyBpm = (factor: number) => {
    const next = Math.round(userBpm * factor);
    if (next >= 40 && next <= 280) {
      setUserBpm(next);
      realignPinsToBpm(next);
    }
  };

  // -------------------------------------------------------------
  // High-Precision Metronome & Audio Playback Engine
  // -------------------------------------------------------------
  const stopPlayback = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) {}
      sourceNodeRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (metronomeTimerRef.current) {
      clearInterval(metronomeTimerRef.current);
      metronomeTimerRef.current = null;
    }
    setIsPlaying(false);
  };

  const startPlayback = (offsetSeconds?: number) => {
    if (!audioBuffer) return;
    stopPlayback();

    const ctx = getCtx();
    const startTime = typeof offsetSeconds === 'number' ? offsetSeconds : playheadTime;

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    // Compute loop points based on mode
    const downbeat = downbeatPin?.timeSeconds || 0;
    const barSeconds = (60 / userBpm) * 4;
    let loopStart = downbeat;
    let loopDuration = audioBuffer.duration - downbeat;

    if (loopMode === '1bar') {
      loopDuration = barSeconds;
    } else if (loopMode === '2bars') {
      loopDuration = barSeconds * 2;
    } else if (loopMode === '4bars') {
      loopDuration = barSeconds * 4;
    }

    const loopEnd = loopStart + loopDuration;

    startAudioTimeRef.current = ctx.currentTime;
    startOffsetRef.current = startTime;

    source.start(0, startTime);
    sourceNodeRef.current = source;
    setIsPlaying(true);

    // Metronome Click Scheduling loop
    const beatInterval = 60 / userBpm;
    let currentBeatIndex = Math.floor((startTime - downbeat) / beatInterval);
    nextMetronomeBeatRef.current = downbeat + currentBeatIndex * beatInterval;

    // RAF Animation & Looper
    const updateLoop = () => {
      if (!audioContextRef.current) return;
      const elapsed = audioContextRef.current.currentTime - startAudioTimeRef.current;
      let currentPos = startOffsetRef.current + elapsed;

      // Check loop boundary
      if (loopMode !== 'full' && currentPos >= loopEnd) {
        stopPlayback();
        startPlayback(loopStart);
        return;
      }

      if (currentPos >= audioBuffer.duration) {
        stopPlayback();
        setPlayheadTime(downbeat);
        return;
      }

      setPlayheadTime(currentPos);

      // Schedule metronome clicks
      if (metronomeEnabled) {
        const lookahead = 0.08; // 80ms lookahead
        const now = audioContextRef.current.currentTime;
        const projectedSongTime = startOffsetRef.current + (now - startAudioTimeRef.current);

        while (nextMetronomeBeatRef.current < projectedSongTime + lookahead) {
          if (nextMetronomeBeatRef.current >= projectedSongTime - 0.01) {
            const beatNum = Math.round((nextMetronomeBeatRef.current - downbeat) / beatInterval);
            const isDown = beatNum % 4 === 0;
            const clickScheduleTime = now + (nextMetronomeBeatRef.current - projectedSongTime);
            playMetronomeClick(audioContextRef.current, clickScheduleTime, isDown, metronomeVolume);
          }
          nextMetronomeBeatRef.current += beatInterval;
        }
      }

      animationFrameRef.current = requestAnimationFrame(updateLoop);
    };

    animationFrameRef.current = requestAnimationFrame(updateLoop);
  };

  const togglePlay = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  const rewindToDownbeat = () => {
    const downbeat = downbeatPin?.timeSeconds || 0;
    if (isPlaying) {
      stopPlayback();
      startPlayback(downbeat);
    } else {
      setPlayheadTime(downbeat);
    }
    playLaserBeamSound('laser_audio');
  };

  // -------------------------------------------------------------
  // Waveform Canvas Rendering with Chrono-Pin Overlays
  // -------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analysis || !audioBuffer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const duration = audioBuffer.duration;

    // Visible window based on zoom & scroll
    const visibleDuration = duration / zoomLevel;
    const startTime = scrollOffset * (duration - visibleDuration);
    const endTime = startTime + visibleDuration;

    ctx.clearRect(0, 0, width, height);

    // Background Gradient (Deep cosmic neon theme)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#040711');
    bgGrad.addColorStop(1, '#080D1A');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Measure Grid lines based on current user BPM & Downbeat
    const downbeat = downbeatPin?.timeSeconds || 0;
    const beatSec = 60 / userBpm;
    const barSec = beatSec * 4;

    // Draw Measure & Beat grid
    const firstMeasure = Math.floor((startTime - downbeat) / barSec) - 1;
    const lastMeasure = Math.ceil((endTime - downbeat) / barSec) + 1;

    for (let m = firstMeasure; m <= lastMeasure; m++) {
      const measureTime = downbeat + m * barSec;
      if (measureTime >= startTime && measureTime <= endTime) {
        const x = ((measureTime - startTime) / visibleDuration) * width;

        // Measure line
        ctx.strokeStyle = m === 0 ? '#00F0FF' : 'rgba(168, 85, 247, 0.4)';
        ctx.lineWidth = m === 0 ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();

        // Bar text
        ctx.fillStyle = m === 0 ? '#00F0FF' : '#94A3B8';
        ctx.font = '10px monospace';
        ctx.fillText(`BAR ${m + 1}`, x + 4, 14);

        // Beat subdivision ticks
        for (let b = 1; b < 4; b++) {
          const beatTime = measureTime + b * beatSec;
          if (beatTime >= startTime && beatTime <= endTime) {
            const bx = ((beatTime - startTime) / visibleDuration) * width;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(bx, height * 0.4);
            ctx.lineTo(bx, height * 0.6);
            ctx.stroke();
          }
        }
      }
    }

    // Draw Transient Peaks
    if (analysis.transientPeaks) {
      ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';
      analysis.transientPeaks.forEach(tp => {
        if (tp.timeSeconds >= startTime && tp.timeSeconds <= endTime) {
          const px = ((tp.timeSeconds - startTime) / visibleDuration) * width;
          ctx.fillRect(px - 1, height * 0.48, 2, 4);
        }
      });
    }

    // Draw Waveform
    const peaks = analysis.waveformPeaks;
    const numPeaks = peaks.length;
    const centerY = height / 2;

    ctx.fillStyle = '#10B981';
    for (let i = 0; i < width; i++) {
      const progress = i / width;
      const timeAtPixel = startTime + progress * visibleDuration;
      const peakIdx = Math.floor((timeAtPixel / duration) * numPeaks);

      if (peakIdx >= 0 && peakIdx < numPeaks) {
        const amp = peaks[peakIdx];
        const barHeight = Math.max(2, amp * (height * 0.42));

        // Color modulation based on downbeat alignment
        const isPastDownbeat = timeAtPixel >= downbeat;
        ctx.fillStyle = isPastDownbeat ? '#38BDF8' : '#475569';
        ctx.fillRect(i, centerY - barHeight, 1, barHeight * 2);
      }
    }

    // Draw Chrono-Pins (Anchors)
    chronoPins.forEach(pin => {
      if (pin.timeSeconds < startTime || pin.timeSeconds > endTime) return;

      const x = ((pin.timeSeconds - startTime) / visibleDuration) * width;
      const isSelected = pin.id === selectedPinId;
      const isDown = pin.isDownbeat;

      // Glowing Pin Needle
      ctx.strokeStyle = isDown ? '#FFD700' : isSelected ? '#A855F7' : '#00F0FF';
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.setLineDash(isDown ? [] : [4, 3]);

      ctx.beginPath();
      ctx.moveTo(x, 18);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Pin Head / Flag
      const pinColor = isDown ? '#FFD700' : isSelected ? '#A855F7' : '#00F0FF';
      ctx.fillStyle = pinColor;
      ctx.beginPath();
      ctx.arc(x, 22, 6, 0, Math.PI * 2);
      ctx.fill();

      // Pin Inner Dot
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(x, 22, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Pin Label Badge
      ctx.fillStyle = 'rgba(10, 14, 26, 0.9)';
      ctx.fillRect(x - 30, 30, 60, 14);
      ctx.strokeStyle = pinColor;
      ctx.strokeRect(x - 30, 30, 60, 14);

      ctx.fillStyle = pinColor;
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(isDown ? '1.1 (DOWN)' : `${pin.measure}.1 PIN`, x, 40);
      ctx.textAlign = 'left';
    });

    // Draw Playhead
    if (playheadTime >= startTime && playheadTime <= endTime) {
      const px = ((playheadTime - startTime) / visibleDuration) * width;
      ctx.strokeStyle = '#FF8C00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
      ctx.stroke();

      // Playhead Flag
      ctx.fillStyle = '#FF8C00';
      ctx.beginPath();
      ctx.moveTo(px - 5, 0);
      ctx.lineTo(px + 5, 0);
      ctx.lineTo(px, 8);
      ctx.closePath();
      ctx.fill();
    }
  }, [analysis, audioBuffer, chronoPins, selectedPinId, playheadTime, userBpm, zoomLevel, scrollOffset, downbeatPin]);

  // Handle canvas click to select or scrub playhead
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBuffer) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const duration = audioBuffer.duration;
    const visibleDuration = duration / zoomLevel;
    const startTime = scrollOffset * (duration - visibleDuration);
    const clickedTime = startTime + (clickX / width) * visibleDuration;

    // Check if clicked near an existing Chrono-Pin
    const hitPin = chronoPins.find(p => {
      const pinX = ((p.timeSeconds - startTime) / visibleDuration) * width;
      return Math.abs(pinX - clickX) < 12;
    });

    if (hitPin) {
      setSelectedPinId(hitPin.id);
      playLaserBeamSound('laser_select');

      // Allow dragging pin
      const handleMouseMove = (moveEv: MouseEvent) => {
        const moveX = moveEv.clientX - rect.left;
        const newTime = startTime + (moveX / width) * visibleDuration;
        updatePinTime(hitPin.id, newTime);
      };

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return;
    }

    // Otherwise scrub playhead
    setPlayheadTime(clickedTime);
    if (isPlaying) {
      startPlayback(clickedTime);
    }
  };

  // -------------------------------------------------------------
  // Apply ChronoMap to Project Session (with ChronoPin Tempo-Latch Warp)
  // -------------------------------------------------------------
  const handleApplyToProject = () => {
    if (!audioBuffer) return;

    const targetBpm = adoptAsProjectBpm ? userBpm : currentProjectBpm;
    let finalBuffer = audioBuffer;
    let finalPins = chronoPins;

    if (latchSlowSections && chronoPins.length > 1) {
      const ctx = audioContextRef.current || getAudioContext();
      if (ctx) {
        const warped = warpBufferWithChronoPins(ctx, audioBuffer, chronoPins, targetBpm, true);
        finalBuffer = warped.buffer;
        finalPins = warped.warpedPins;
      }
    }

    const downbeat = finalPins.find(p => p.isDownbeat)?.timeSeconds ?? (downbeatPin?.timeSeconds || 0);
    const barSeconds = (60 / targetBpm) * 4;
    const totalBars = Math.max(1, Math.round((finalBuffer.duration - downbeat) / barSeconds));

    onApplyChronoMap({
      trackName: sourceName.replace(/\.[^/.]+$/, ''),
      bpm: targetBpm,
      setProjectBpm: adoptAsProjectBpm,
      plantTimelineMarkers: plantTimelineMarkers,
      audioBuffer: finalBuffer,
      audioUrl: audioFileUrl,
      chronoPins: finalPins,
      targetTrackId: insertAsNewTrack ? undefined : selectedExistingTrackId,
      downbeatSeconds: downbeat,
      totalBars
    });

    playLaserBeamSound('laser_audio');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-5xl bg-[#080B14] border-2 border-[#00F0FF]/40 rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.25)] flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* ChronoMap Header Banner */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#0D1426] via-[#121B33] to-[#0A0E1A] border-b border-[#00F0FF]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00F0FF]/15 border border-[#00F0FF] flex items-center justify-center shadow-[0_0_12px_#00F0FF]">
              <Crosshair className="w-5 h-5 text-[#00F0FF] animate-spin" style={{ animationDuration: '12s' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#FFD700]">STRANGELET LAB // AUDIO INTELLIGENCE</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 font-mono font-bold">
                  CHRONOMAP ENGINE
                </span>
              </div>
              <h2 className="text-lg font-black text-white font-mono tracking-tight flex items-center gap-2">
                CHRONOMAP &amp; CHRONOPINS TEMPO ENGINE
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Step Wizard Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#04060C] border border-[#1E293B] font-mono text-xs">
              <button 
                onClick={() => setWizardStep(1)}
                className={`px-2 py-0.5 rounded ${wizardStep === 1 ? 'bg-[#00F0FF] text-black font-bold' : 'text-[#64748B]'}`}
              >
                1. Downbeat Pin
              </button>
              <span className="text-[#334155]">&gt;</span>
              <button 
                onClick={() => setWizardStep(2)}
                className={`px-2 py-0.5 rounded ${wizardStep === 2 ? 'bg-[#A855F7] text-white font-bold' : 'text-[#64748B]'}`}
              >
                2. Chrono-Pins & Grid
              </button>
              <span className="text-[#334155]">&gt;</span>
              <button 
                onClick={() => setWizardStep(3)}
                className={`px-2 py-0.5 rounded ${wizardStep === 3 ? 'bg-[#10B981] text-black font-bold' : 'text-[#64748B]'}`}
              >
                3. Metronome Audition
              </button>
            </div>

            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#64748B] hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {errorMessage && (
            <div className="px-3.5 py-2.5 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs font-mono flex items-center justify-between">
              <span>{errorMessage}</span>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-red-300 hover:text-white ml-3"
              >
                <X size={14} />
              </button>
            </div>
          )}
          
          {/* Top Audio Source Selector Ribbon */}
          <div className="p-3 rounded-xl bg-[#0D1222] border border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#FFD700]">AUDIO SOURCE:</span>
              <span className="text-xs font-mono text-white px-2.5 py-1 rounded bg-[#060812] border border-[#334155]">
                {sourceName}
              </span>
              {audioBuffer && (
                <span className="text-[10px] font-mono text-[#94A3B8]">
                  {audioBuffer.duration.toFixed(2)}s • {audioBuffer.sampleRate}Hz
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Demo Groove Quick Buttons */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-mono text-[#64748B] hidden lg:inline">DEMO:</span>
                <button
                  onClick={() => loadDemoSample('acid_breakbeat')}
                  className="px-2 py-1 rounded text-[10px] font-mono font-bold bg-[#141B2D] border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500 hover:text-black transition-all"
                >
                  Breakbeat 126
                </button>
                <button
                  onClick={() => loadDemoSample('house_groove')}
                  className="px-2 py-1 rounded text-[10px] font-mono font-bold bg-[#141B2D] border border-purple-500/40 text-purple-300 hover:bg-purple-500 hover:text-black transition-all"
                >
                  House 124
                </button>
                <button
                  onClick={() => loadDemoSample('hiphop_boom')}
                  className="px-2 py-1 rounded text-[10px] font-mono font-bold bg-[#141B2D] border border-amber-500/40 text-amber-300 hover:bg-amber-500 hover:text-black transition-all"
                >
                  Boom-Bap 94
                </button>
                <button
                  onClick={() => loadDemoSample('synthwave_arp')}
                  className="px-2 py-1 rounded text-[10px] font-mono font-bold bg-[#141B2D] border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500 hover:text-black transition-all"
                >
                  Synth 118
                </button>
              </div>

              {/* Upload Custom Audio */}
              <input
                type="file"
                ref={fileInputRef}
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1 rounded-lg bg-[#00F0FF]/15 border border-[#00F0FF] text-[#00F0FF] text-xs font-mono font-bold hover:bg-[#00F0FF] hover:text-black transition-all flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,240,255,0.3)]"
              >
                <Upload size={13} />
                <span>IMPORT AUDIO</span>
              </button>

              {/* Existing Project Track Selector */}
              {tracks.length > 0 && (
                <select
                  value={selectedExistingTrackId}
                  onChange={(e) => handleSelectExistingTrack(e.target.value)}
                  className="bg-[#0A0E1A] text-xs font-mono text-[#CBD5E1] border border-[#334155] rounded-lg px-2 py-1 outline-none"
                >
                  <option value="">Map Existing Project Track...</option>
                  {tracks.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Interactive Waveform Stage with Chrono-Pins */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-[#FFD700] font-bold flex items-center gap-1">
                  <Pin size={13} className="text-[#FFD700]" /> CHRONO-PIN WAVEFORM STAGE
                </span>
                <span className="text-[#64748B] hidden sm:inline">
                  (Drag pins to anchor measures • Yellow = Downbeat • Purple/Cyan = Chrono-Pins)
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Zoom controls */}
                <div className="flex items-center gap-1 bg-[#090D18] px-2 py-0.5 rounded border border-[#1E293B]">
                  <span className="text-[10px] text-[#64748B]">ZOOM:</span>
                  {[1, 2, 4, 8].map(z => (
                    <button
                      key={z}
                      onClick={() => setZoomLevel(z)}
                      className={`px-1.5 py-0.2 rounded text-[10px] ${zoomLevel === z ? 'bg-[#00F0FF] text-black font-bold' : 'text-[#94A3B8] hover:text-white'}`}
                    >
                      {z}x
                    </button>
                  ))}
                </div>

                {/* Snap to Transient Toggle */}
                <button
                  onClick={() => setSnapToTransients(prev => !prev)}
                  className={`px-2 py-0.5 rounded border text-[10px] font-bold transition-all ${
                    snapToTransients 
                      ? 'bg-[#FFD700]/20 border-[#FFD700] text-[#FFD700]' 
                      : 'bg-[#121624] border-[#334155] text-[#64748B]'
                  }`}
                  title="Snap Chrono-Pins to nearest detected transient energy peaks"
                >
                  SNAP TRANSIENTS {snapToTransients ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Canvas Container */}
            <div className="relative w-full h-48 bg-[#04060D] border-2 border-[#1E293B] rounded-xl overflow-hidden shadow-inner cursor-crosshair">
              {isAnalyzing ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 z-30">
                  <Crosshair className="w-8 h-8 text-[#00F0FF] animate-spin" />
                  <span className="text-xs font-mono text-[#00F0FF] tracking-wider animate-pulse">
                    ANALYZING ONSETS & CHRONO-PINS...
                  </span>
                </div>
              ) : null}

              <canvas
                ref={canvasRef}
                width={900}
                height={192}
                className="w-full h-full block"
                onMouseDown={handleCanvasMouseDown}
              />
            </div>

            {/* Zoom Pan Scrollbar if zoomed in */}
            {zoomLevel > 1 && (
              <div className="flex items-center gap-2 px-1">
                <span className="text-[9px] font-mono text-[#64748B]">NAV:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.005"
                  value={scrollOffset}
                  onChange={(e) => setScrollOffset(parseFloat(e.target.value))}
                  className="w-full accent-[#00F0FF] h-1.5 bg-[#141B2D] rounded cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Central Beat Control Dashboard: BPM Readout, Chrono-Pin List, and Nudge Station */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Column 1: Big Digital BPM Display & Tempo Adjust */}
            <div className="p-4 rounded-xl bg-[#0C101F] border border-[#1E293B] flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-[#A855F7] tracking-wider">
                    CALCULATED TEMPO
                  </span>
                  <span className="text-[10px] font-mono text-[#10B981] px-1.5 py-0.2 rounded bg-[#10B981]/15 border border-[#10B981]/30">
                    LOCKED TO PINS
                  </span>
                </div>
                
                {/* Large Digital BPM Counter */}
                <div className="py-2 px-3 rounded-lg bg-[#04060C] border-2 border-[#00F0FF]/50 text-center shadow-[0_0_20px_rgba(0,240,255,0.15)]">
                  <div className="text-4xl font-black font-mono text-[#00F0FF] tracking-tight">
                    {userBpm.toFixed(2)}
                  </div>
                  <div className="text-[10px] font-mono text-[#64748B] uppercase tracking-widest mt-0.5">
                    BEATS PER MINUTE (BPM)
                  </div>
                </div>
              </div>

              {/* Tempo Tuning Controls */}
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-1 text-center font-mono">
                  <button
                    onClick={() => adjustBpm(-1)}
                    className="py-1 rounded bg-[#161E34] hover:bg-[#202B48] text-white text-xs font-bold border border-[#2E3C62]"
                  >
                    -1.0
                  </button>
                  <button
                    onClick={() => adjustBpm(-0.1)}
                    className="py-1 rounded bg-[#161E34] hover:bg-[#202B48] text-white text-xs font-bold border border-[#2E3C62]"
                  >
                    -0.1
                  </button>
                  <button
                    onClick={() => adjustBpm(+0.1)}
                    className="py-1 rounded bg-[#161E34] hover:bg-[#202B48] text-white text-xs font-bold border border-[#2E3C62]"
                  >
                    +0.1
                  </button>
                  <button
                    onClick={() => adjustBpm(+1)}
                    className="py-1 rounded bg-[#161E34] hover:bg-[#202B48] text-white text-xs font-bold border border-[#2E3C62]"
                  >
                    +1.0
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1 font-mono">
                  <button
                    onClick={() => multiplyBpm(0.5)}
                    className="py-1 rounded bg-[#161E34] hover:bg-[#202B48] text-[#FFD700] text-xs font-bold border border-[#2E3C62]"
                    title="Halve the BPM (Half-time)"
                  >
                    /2 (HALF)
                  </button>
                  <button
                    onClick={() => multiplyBpm(2)}
                    className="py-1 rounded bg-[#161E34] hover:bg-[#202B48] text-[#FFD700] text-xs font-bold border border-[#2E3C62]"
                    title="Double the BPM (Double-time)"
                  >
                    x2 (DBL)
                  </button>
                  <button
                    onClick={handleTapTempo}
                    className="py-1 rounded bg-gradient-to-r from-[#A855F7] to-[#EC4899] text-white text-xs font-black shadow-md hover:brightness-110 active:scale-95 transition-transform"
                    title="Tap along to the beat to detect tempo"
                  >
                    TAP BPM
                  </button>
                </div>
              </div>
            </div>

            {/* Column 2: Active Chrono-Pin Inspector & Nudge */}
            <div className="p-4 rounded-xl bg-[#0C101F] border border-[#1E293B] flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-[#00F0FF] flex items-center gap-1.5">
                    <Pin size={13} /> ACTIVE CHRONO-PIN
                  </span>
                  {selectedPin?.isDownbeat && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40">
                      ★ DOWNBEAT 1.1
                    </span>
                  )}
                </div>

                {selectedPin ? (
                  <div className="p-3 rounded-lg bg-[#060812] border border-[#1E293B] space-y-2 font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{selectedPin.label}</span>
                      <span className="text-[10px] text-[#A0AEC0]">{selectedPin.timeSeconds.toFixed(4)}s</span>
                    </div>

                    <div className="text-[11px] text-[#64748B]">
                      Measure: <span className="text-white font-bold">{selectedPin.measure}</span> • Beat: <span className="text-white font-bold">{selectedPin.beat}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-[#64748B] font-mono">No Chrono-Pin selected</div>
                )}
              </div>

              {/* Pin Nudge Station */}
              <div className="space-y-1.5 font-mono">
                <div className="text-[10px] text-[#94A3B8] font-bold">NUDGE TIME ANCHOR:</div>
                <div className="grid grid-cols-4 gap-1 text-center">
                  <button
                    onClick={() => nudgePin(-0.01)}
                    className="py-1 rounded bg-[#161E34] hover:bg-[#202B48] text-xs text-white border border-[#2E3C62]"
                    title="Nudge left 10ms"
                  >
                    -10ms
                  </button>
                  <button
                    onClick={() => nudgePin(-0.001)}
                    className="py-1 rounded bg-[#161E34] hover:bg-[#202B48] text-xs text-white border border-[#2E3C62]"
                    title="Nudge left 1ms"
                  >
                    -1ms
                  </button>
                  <button
                    onClick={() => nudgePin(+0.001)}
                    className="py-1 rounded bg-[#161E34] hover:bg-[#202B48] text-xs text-white border border-[#2E3C62]"
                    title="Nudge right 1ms"
                  >
                    +1ms
                  </button>
                  <button
                    onClick={() => nudgePin(+0.01)}
                    className="py-1 rounded bg-[#161E34] hover:bg-[#202B48] text-xs text-white border border-[#2E3C62]"
                    title="Nudge right 10ms"
                  >
                    +10ms
                  </button>
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={handleAddPinAtPlayhead}
                    className="flex-1 py-1 rounded bg-[#121A2F] border border-[#00F0FF]/40 text-[#00F0FF] text-[10px] font-bold hover:bg-[#00F0FF] hover:text-black transition-all flex items-center justify-center gap-1"
                  >
                    <Plus size={11} />
                    <span>PLANT PIN AT PLAYHEAD</span>
                  </button>

                  {selectedPin && !selectedPin.isDownbeat && (
                    <button
                      onClick={() => handleDeletePin(selectedPin.id)}
                      className="p-1.5 rounded bg-red-950/40 border border-red-500/40 text-red-300 hover:bg-red-500 hover:text-white transition-all"
                      title="Delete selected Chrono-Pin"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Column 3: Chrono-Pin Roster / Landmarks */}
            <div className="p-4 rounded-xl bg-[#0C101F] border border-[#1E293B] flex flex-col justify-between space-y-2 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#10B981] flex items-center gap-1">
                  <Disc3 size={13} /> CHRONO-PIN ROSTER
                </span>
                <span className="text-[10px] text-[#64748B]">{chronoPins.length} Anchors</span>
              </div>

              <div className="flex-1 overflow-y-auto max-h-36 pr-1 space-y-1">
                {chronoPins.map(pin => {
                  const isSelected = pin.id === selectedPinId;
                  return (
                    <div
                      key={pin.id}
                      onClick={() => {
                        setSelectedPinId(pin.id);
                        setPlayheadTime(pin.timeSeconds);
                        playLaserBeamSound('laser_select');
                      }}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-[#1E2948] border-[#00F0FF] text-white font-bold shadow-md' 
                          : 'bg-[#060812] border-[#1E293B] text-[#94A3B8] hover:border-[#38BDF8]/60 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${pin.isDownbeat ? 'bg-[#FFD700]' : 'bg-[#00F0FF]'}`} />
                        <span>{pin.label}</span>
                      </div>
                      <span className="text-[10px] text-[#64748B]">{pin.timeSeconds.toFixed(3)}s</span>
                    </div>
                  );
                })}
              </div>

              <div className="text-[10px] text-[#64748B] pt-1 border-t border-[#1E293B]">
                Anchors keep everything in lockstep without drift across all measures.
              </div>
            </div>
          </div>

          {/* Transport & Metronome Verification Station */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#070A14] to-[#0E1528] border border-[#1E293B] flex flex-wrap items-center justify-between gap-4">
            
            {/* Playback Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={rewindToDownbeat}
                className="p-2.5 rounded-lg bg-[#141B2D] border border-[#2E3C62] text-[#94A3B8] hover:text-[#00F0FF] hover:border-[#00F0FF] transition-all"
                title="Rewind to Downbeat Chrono-Pin"
              >
                <RotateCcw size={18} />
              </button>

              <button
                onClick={togglePlay}
                className={`px-5 py-2.5 rounded-full flex items-center gap-2 text-xs font-mono font-black transition-all shadow-lg ${
                  isPlaying 
                    ? 'bg-white text-black scale-105' 
                    : 'bg-gradient-to-r from-[#00F0FF] to-[#0099FF] text-black hover:brightness-110'
                }`}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} className="fill-current" />}
                <span>{isPlaying ? 'PAUSE AUDITION' : 'PLAY AUDITION'}</span>
              </button>

              {/* Loop Range Mode */}
              <div className="flex items-center gap-1 bg-[#060812] p-1 rounded-lg border border-[#1E293B] text-[10px] font-mono">
                <span className="text-[#64748B] px-1">LOOP:</span>
                {(['1bar', '2bars', '4bars', 'full'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setLoopMode(mode)}
                    className={`px-2 py-0.5 rounded font-bold transition-all ${
                      loopMode === mode 
                        ? 'bg-[#A855F7] text-white shadow-sm' 
                        : 'text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    {mode.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Metronome Sync Station */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMetronomeEnabled(prev => !prev)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-2 transition-all ${
                  metronomeEnabled 
                    ? 'bg-[#10B981]/20 border-[#10B981] text-[#10B981] shadow-[0_0_12px_rgba(16,185,129,0.3)]' 
                    : 'bg-[#141B2D] border-[#2E3C62] text-[#64748B]'
                }`}
                title="Toggle synchronized metronome clicks to verify tempo lock"
              >
                <Volume2 size={14} />
                <span>METRONOME: {metronomeEnabled ? 'ON' : 'MUTED'}</span>
              </button>

              {metronomeEnabled && (
                <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#94A3B8]">
                  <span>VOL:</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={metronomeVolume}
                    onChange={(e) => setMetronomeVolume(parseFloat(e.target.value))}
                    className="w-16 accent-[#10B981] h-1.5 bg-[#1E293B] rounded"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Project Synchronization & Adoption Options */}
          <div className="p-4 rounded-xl bg-[#090D1A] border border-[#00F0FF]/20 space-y-3 font-mono">
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <Clock size={14} className="text-[#FFD700]" />
              TIMECODE & MULTITRACK SYNCHRONIZATION SETTINGS
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#CBD5E1]">
              <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#05070E] border border-[#1E293B] cursor-pointer hover:border-[#00F0FF]/50 transition-all">
                <input
                  type="checkbox"
                  checked={adoptAsProjectBpm}
                  onChange={(e) => setAdoptAsProjectBpm(e.target.checked)}
                  className="mt-0.5 accent-[#00F0FF]"
                />
                <div>
                  <div className="font-bold text-[#00F0FF]">Adopt Track BPM as Project Master Tempo</div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">
                    Updates session tempo from {currentProjectBpm} BPM to <span className="text-[#FFD700] font-bold">{userBpm.toFixed(2)} BPM</span>.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#05070E] border border-[#1E293B] cursor-pointer hover:border-emerald-500/50 transition-all">
                <input
                  type="checkbox"
                  checked={latchSlowSections}
                  onChange={(e) => setLatchSlowSections(e.target.checked)}
                  className="mt-0.5 accent-[#10B981]"
                />
                <div>
                  <div className="font-bold text-emerald-400">Latch Drifting Measures via ChronoPins</div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">
                    Warps any slowed-down or rushing sections between ChronoPins smoothly back into project time (pitch-locked).
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#05070E] border border-[#1E293B] cursor-pointer hover:border-[#A855F7]/50 transition-all">
                <input
                  type="checkbox"
                  checked={plantTimelineMarkers}
                  onChange={(e) => setPlantTimelineMarkers(e.target.checked)}
                  className="mt-0.5 accent-[#A855F7]"
                />
                <div>
                  <div className="font-bold text-[#A855F7]">Plant ChronoPins into Timeline Ruler</div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">
                    Places ChronoPin anchor flags on the measure ruler and attaches pins directly onto the clip.
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="px-5 py-3.5 bg-[#05070E] border-t border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-[#94A3B8]">
            <CheckCircle2 size={14} className="text-[#10B981]" />
            <span>Ready to lock audio timing at <strong>{userBpm.toFixed(2)} BPM</strong></span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono font-semibold text-[#94A3B8] hover:text-white bg-[#101524] border border-[#232C46] transition-all"
            >
              CANCEL
            </button>

            <button
              onClick={handleApplyToProject}
              className="px-5 py-2.5 rounded-xl text-xs font-mono font-black text-black bg-gradient-to-r from-[#00F0FF] via-[#38BDF8] to-[#10B981] hover:brightness-110 shadow-[0_0_25px_rgba(0,240,255,0.4)] flex items-center gap-2 transition-all cursor-pointer select-none"
            >
              <Check size={16} />
              <span>APPLY CHRONOMAP &amp; LOCK PROJECT BPM</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
