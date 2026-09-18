import React, { useState, useEffect, useRef } from 'react';
import { 
  Track, Clip, PrismRay, PrismDivision, PrismHitType, 
  BeamSplitMode, BeamSplitterResult, ProjectBinClip 
} from '../types';
import { 
  PRISM_SPECTRUM_COLORS, 
  KEYBOARD_PAD_SHORTCUTS,
  findZeroCrossing,
  detectTransientOnsets,
  refractAudioBeam,
  extractSliceBuffer,
  extractLoopBuffer,
  PrismAudioPlayer,
  createBeamSplitterDemoAudio
} from '../lib/beamSplitterEngine';
import { audioBufferToWav } from '../lib/sunoAudioEngine';
import { PrismRefractionVisualizer } from './PrismRefractionVisualizer';
import { 
  Split, Sparkles, Layers, Disc, Repeat, Zap, Play, Pause, Square, 
  RotateCcw, ShieldCheck, Download, Compass, Volume2, ArrowRight, 
  PanelLeftClose, PanelLeftOpen, Check, ArrowLeft, Sliders, Scissors
} from 'lucide-react';

interface BeamSplitterViewProps {
  tracks: Track[];
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
  tempo: number;
  onNavigateToMixer?: () => void;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  projectBinClips?: ProjectBinClip[];
  onAddProjectBinClips?: (clips: ProjectBinClip[]) => void;
}

export const BeamSplitterView: React.FC<BeamSplitterViewProps> = ({
  tracks,
  setTracks,
  tempo,
  onNavigateToMixer,
  onToggleSidebar,
  isSidebarCollapsed = false,
  projectBinClips = [],
  onAddProjectBinClips
}) => {
  // Mode selection: 'hits' (Refracted Hits) | 'loop' (Prism Loop Isolator) | 'stutter' (Photon Burst)
  const [splitMode, setSplitMode] = useState<BeamSplitMode>('hits');

  // Audio source state
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [sourceName, setSourceName] = useState<string>('Photon_Breakbeat_126BPM.wav');
  const [selectedTrackId, setSelectedTrackId] = useState<string>('');
  const [targetTimelineTrackId, setTargetTimelineTrackId] = useState<string>('');
  const [targetStartBar, setTargetStartBar] = useState<number>(0);

  // Optical & Refraction parameters
  const [activeDivision, setActiveDivision] = useState<PrismDivision>('transient');
  const [snapZeroCrossing, setSnapZeroCrossing] = useState<boolean>(true);
  const [refractionPitch, setRefractionPitch] = useState<number>(0);
  const [prismDispersionSpread, setPrismDispersionSpread] = useState<number>(0.6);
  const [opticalFilterCutoff, setOpticalFilterCutoff] = useState<number>(20000);
  const [opticalFilterType, setOpticalFilterType] = useState<BiquadFilterType>('allpass');
  const [masterVolume, setMasterVolume] = useState<number>(1.0);

  // Refracted rays and loop state
  const [rays, setRays] = useState<PrismRay[]>([]);
  const [selectedRayId, setSelectedRayId] = useState<string | null>(null);
  const [loopStartSec, setLoopStartSec] = useState<number>(0);
  const [loopEndSec, setLoopEndSec] = useState<number>(2.0);
  const [activeLoopPresetBars, setActiveLoopPresetBars] = useState<number>(1);

  // Audition playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeAuditioningRayId, setActiveAuditioningRayId] = useState<string | null>(null);
  const [activeStutterRate, setActiveStutterRate] = useState<'1/16' | '1/32' | '1/64' | null>(null);

  // Feedback notifications
  const [batchExportNotice, setBatchExportNotice] = useState<string | null>(null);
  const [recentBatchCount, setRecentBatchCount] = useState<number>(0);

  // Canvas & Audio refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveformPeaksRef = useRef<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const playerRef = useRef<PrismAudioPlayer | null>(null);
  const isDraggingHandleRef = useRef<'start' | 'end' | null>(null);

  // Initialize audio player
  useEffect(() => {
    playerRef.current = new PrismAudioPlayer();
    return () => {
      playerRef.current?.stopAll();
    };
  }, []);

  useEffect(() => {
    playerRef.current?.setMasterVolume(masterVolume);
  }, [masterVolume]);

  useEffect(() => {
    playerRef.current?.setFilter(opticalFilterType, opticalFilterCutoff);
  }, [opticalFilterType, opticalFilterCutoff]);

  // Load initial demo beam
  useEffect(() => {
    if (!audioBuffer) {
      loadDemoBeam('photon_break');
    }
  }, []);

  const loadDemoBeam = (style: 'photon_break' | 'prism_house' | 'subatomic_trap' | 'quantum_synth') => {
    playerRef.current?.stopAll();
    setIsPlaying(false);
    const demo = createBeamSplitterDemoAudio(style);
    setAudioBuffer(demo.buffer);
    setSourceName(`${demo.title}.wav`);
    processWaveformPeaks(demo.buffer);

    const secondsPerBar = (60 / demo.bpm) * 4;
    setLoopStartSec(0);
    setLoopEndSec(Math.min(demo.buffer.duration, secondsPerBar));
    setActiveLoopPresetBars(1);

    const splitRays = refractAudioBeam(demo.buffer, demo.bpm, activeDivision, snapZeroCrossing);
    setRays(splitRays);
    if (splitRays.length > 0) setSelectedRayId(splitRays[0].id);
  };

  // Re-refract when division, snap, or buffer changes
  useEffect(() => {
    if (!audioBuffer) return;
    const splitRays = refractAudioBeam(
      audioBuffer, 
      tempo, 
      activeDivision, 
      snapZeroCrossing
    );

    const spreadRays = splitRays.map((ray, i) => {
      const normalizedPos = splitRays.length > 1 ? (i / (splitRays.length - 1)) * 2 - 1 : 0;
      return {
        ...ray,
        pan: normalizedPos * prismDispersionSpread
      };
    });

    setRays(spreadRays);
    if (spreadRays.length > 0 && !selectedRayId) {
      setSelectedRayId(spreadRays[0].id);
    }
  }, [audioBuffer, activeDivision, snapZeroCrossing, prismDispersionSpread, tempo]);

  const processWaveformPeaks = (buffer: AudioBuffer) => {
    const rawData = buffer.getChannelData(0);
    const numBuckets = 700;
    const bucketSize = Math.floor(rawData.length / numBuckets);
    const peaks: number[] = [];

    for (let i = 0; i < numBuckets; i++) {
      let maxVal = 0;
      const start = i * bucketSize;
      for (let j = 0; j < bucketSize; j++) {
        const val = Math.abs(rawData[start + j]);
        if (val > maxVal) maxVal = val;
      }
      peaks.push(maxVal);
    }

    waveformPeaksRef.current = peaks;
  };

  const handleFileUpload = async (file: File) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const arrayBuffer = await file.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuffer);

      setAudioBuffer(decoded);
      setSourceName(file.name);
      processWaveformPeaks(decoded);

      const secondsPerBar = (60 / tempo) * 4;
      setLoopStartSec(0);
      setLoopEndSec(Math.min(decoded.duration, secondsPerBar));
      setActiveLoopPresetBars(1);

      const splitRays = refractAudioBeam(decoded, tempo, activeDivision, snapZeroCrossing);
      setRays(splitRays);
      if (splitRays.length > 0) setSelectedRayId(splitRays[0].id);
    } catch (err) {
      console.error('Beam Splitter file decode error:', err);
    }
  };

  const handleSelectTrack = (trackId: string) => {
    setSelectedTrackId(trackId);
    setTargetTimelineTrackId(trackId);
    const tr = tracks.find(t => t.id === trackId);
    if (!tr) return;

    setSourceName(tr.name);
    loadDemoBeam('photon_break');
  };

  const handleSetLoopPreset = (bars: number) => {
    if (!audioBuffer) return;
    setActiveLoopPresetBars(bars);
    const secondsPerBar = (60 / tempo) * 4;
    const targetDur = secondsPerBar * bars;

    const newStart = loopStartSec;
    let newEnd = newStart + targetDur;

    if (newEnd > audioBuffer.duration) {
      newEnd = audioBuffer.duration;
    }

    if (snapZeroCrossing) {
      const chData = audioBuffer.getChannelData(0);
      const sr = audioBuffer.sampleRate;
      const startSample = findZeroCrossing(chData, Math.floor(newStart * sr));
      const endSample = findZeroCrossing(chData, Math.floor(newEnd * sr));
      setLoopStartSec(startSample / sr);
      setLoopEndSec(endSample / sr);
    } else {
      setLoopStartSec(newStart);
      setLoopEndSec(newEnd);
    }
  };

  const playRay = (ray: PrismRay) => {
    if (!audioBuffer || !playerRef.current) return;
    setSelectedRayId(ray.id);
    setActiveAuditioningRayId(ray.id);

    const modifiedRay = {
      ...ray,
      pitchSemitones: (ray.pitchSemitones || 0) + refractionPitch
    };

    playerRef.current.playRaySlice(
      audioBuffer,
      modifiedRay,
      1.0,
      () => {
        setActiveAuditioningRayId(null);
      }
    );
  };

  const togglePlayLoop = () => {
    if (!audioBuffer || !playerRef.current) return;

    if (isPlaying) {
      playerRef.current.stopAll();
      setIsPlaying(false);
    } else {
      playerRef.current.playLoopPreview(audioBuffer, loopStartSec, loopEndSec, true);
      setIsPlaying(true);
    }
  };

  const handleTriggerStutter = (rate: '1/16' | '1/32' | '1/64') => {
    if (!audioBuffer || !playerRef.current) return;
    setActiveStutterRate(rate);

    const activeRay = rays.find(r => r.id === selectedRayId) || rays[0];
    if (activeRay) {
      playerRef.current.triggerPhotonStutter(audioBuffer, activeRay, rate, tempo, 16);
    }

    setTimeout(() => {
      setActiveStutterRate(null);
    }, 1200);
  };

  // Keyboard shortcut listener for pads 1-8, Q-I
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toUpperCase();
      const shortcutIndex = KEYBOARD_PAD_SHORTCUTS.indexOf(key);

      if (shortcutIndex >= 0 && shortcutIndex < rays.length) {
        e.preventDefault();
        playRay(rays[shortcutIndex]);
      } else if (e.code === 'Space') {
        e.preventDefault();
        togglePlayLoop();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rays, isPlaying, audioBuffer, loopStartSec, loopEndSec, refractionPitch]);

  // Waveform rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBuffer) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const duration = audioBuffer.duration;
    const peaks = waveformPeaksRef.current;

    ctx.clearRect(0, 0, width, height);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#060913');
    bgGrad.addColorStop(1, '#020306');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Grid bars
    const secondsPerBeat = 60 / tempo;
    const totalBeats = Math.floor(duration / secondsPerBeat);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
    ctx.lineWidth = 1;

    for (let b = 0; b <= totalBeats; b++) {
      const beatX = ((b * secondsPerBeat) / duration) * width;
      ctx.beginPath();
      ctx.moveTo(beatX, 0);
      ctx.lineTo(beatX, height);
      ctx.stroke();

      if (b % 4 === 0) {
        ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.font = '9px monospace';
        ctx.fillText(`Bar ${b / 4 + 1}`, beatX + 4, 12);
      }
    }

    // Draw Slices in hits/stutter mode
    if (splitMode === 'hits' && rays.length > 0) {
      rays.forEach((ray) => {
        const x1 = (ray.startSeconds / duration) * width;
        const x2 = (ray.endSeconds / duration) * width;
        const sliceW = Math.max(1, x2 - x1);

        const isSelected = ray.id === selectedRayId;
        const isAuditioning = ray.id === activeAuditioningRayId;

        ctx.fillStyle = isAuditioning 
          ? `${ray.color}66` 
          : isSelected 
            ? `${ray.color}40` 
            : `${ray.color}15`;
        ctx.fillRect(x1, 0, sliceW, height);

        ctx.strokeStyle = isSelected ? '#FFFFFF' : `${ray.color}AA`;
        ctx.lineWidth = isSelected ? 2.5 : 1;
        ctx.beginPath();
        ctx.moveTo(x1, 0);
        ctx.lineTo(x1, height);
        ctx.stroke();

        ctx.fillStyle = isSelected ? '#FFFFFF' : ray.color;
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`R${ray.index + 1}`, x1 + 3, 14);
      });
    }

    // Draw Waveform
    const midY = height / 2;
    for (let i = 0; i < peaks.length; i++) {
      const x = (i / peaks.length) * width;
      const peakVal = peaks[i] || 0.05;
      const barH = peakVal * (height * 0.42);

      const timeAtPoint = (i / peaks.length) * duration;
      const rayAtPoint = rays.find(r => timeAtPoint >= r.startSeconds && timeAtPoint < r.endSeconds);
      const strokeColor = rayAtPoint ? rayAtPoint.color : '#00F0FF';

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x, midY - barH);
      ctx.lineTo(x, midY + barH);
      ctx.stroke();
    }

    // Center zero-line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    // Loop bounds in 'loop' mode
    if (splitMode === 'loop') {
      const loopX1 = (loopStartSec / duration) * width;
      const loopX2 = (loopEndSec / duration) * width;
      const loopW = Math.max(2, loopX2 - loopX1);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillRect(0, 0, loopX1, height);
      ctx.fillRect(loopX2, 0, width - loopX2, height);

      const loopGrad = ctx.createLinearGradient(loopX1, 0, loopX2, 0);
      loopGrad.addColorStop(0, 'rgba(0, 240, 255, 0.3)');
      loopGrad.addColorStop(0.5, 'rgba(255, 215, 0, 0.2)');
      loopGrad.addColorStop(1, 'rgba(0, 240, 255, 0.3)');
      ctx.fillStyle = loopGrad;
      ctx.fillRect(loopX1, 0, loopW, height);

      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(loopX1, 0);
      ctx.lineTo(loopX1, height);
      ctx.stroke();

      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(loopX2, 0);
      ctx.lineTo(loopX2, height);
      ctx.stroke();

      ctx.fillStyle = '#FFD700';
      ctx.fillRect(loopX1 - 5, 0, 10, 16);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('IN', loopX1 - 4, 12);

      ctx.fillStyle = '#00F0FF';
      ctx.fillRect(loopX2 - 7, 0, 14, 16);
      ctx.fillStyle = '#000000';
      ctx.fillText('OUT', loopX2 - 8, 12);
    }
  }, [audioBuffer, rays, splitMode, selectedRayId, activeAuditioningRayId, loopStartSec, loopEndSec, tempo]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !audioBuffer) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const normX = Math.max(0, Math.min(1, x / rect.width));
    const clickTime = normX * audioBuffer.duration;

    if (splitMode === 'loop') {
      const loopX1 = (loopStartSec / audioBuffer.duration) * rect.width;
      const loopX2 = (loopEndSec / audioBuffer.duration) * rect.width;

      if (Math.abs(x - loopX1) < 14) {
        isDraggingHandleRef.current = 'start';
      } else if (Math.abs(x - loopX2) < 14) {
        isDraggingHandleRef.current = 'end';
      } else {
        const dur = loopEndSec - loopStartSec;
        setLoopStartSec(clickTime);
        setLoopEndSec(Math.min(audioBuffer.duration, clickTime + dur));
      }
    } else {
      const foundRay = rays.find(r => clickTime >= r.startSeconds && clickTime <= r.endSeconds);
      if (foundRay) {
        playRay(foundRay);
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingHandleRef.current || !canvasRef.current || !audioBuffer) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const normX = Math.max(0, Math.min(1, x / rect.width));
    const time = normX * audioBuffer.duration;

    if (isDraggingHandleRef.current === 'start') {
      if (time < loopEndSec - 0.05) setLoopStartSec(time);
    } else if (isDraggingHandleRef.current === 'end') {
      if (time > loopStartSec + 0.05) setLoopEndSec(time);
    }
  };

  const handleCanvasMouseUp = () => {
    if (isDraggingHandleRef.current && snapZeroCrossing && audioBuffer) {
      const chData = audioBuffer.getChannelData(0);
      const sr = audioBuffer.sampleRate;
      const startSample = findZeroCrossing(chData, Math.floor(loopStartSec * sr));
      const endSample = findZeroCrossing(chData, Math.floor(loopEndSec * sr));
      setLoopStartSec(startSample / sr);
      setLoopEndSec(endSample / sr);
    }
    isDraggingHandleRef.current = null;
  };

  // CORE REQUEST: Batch Export Entire Track to Project Bin
  const handleBatchExportToBin = () => {
    if (!audioBuffer || rays.length === 0) return;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const secondsPerBar = (60 / tempo) * 4;

    const newBinClips: ProjectBinClip[] = rays.map((ray, idx) => {
      const sliceBuffer = extractSliceBuffer(ctx, audioBuffer, ray, snapZeroCrossing ? 3 : 0);
      const wavBlob = audioBufferToWav(sliceBuffer);
      const audioUrl = URL.createObjectURL(wavBlob);
      const durationBars = Number((ray.durationSeconds / secondsPerBar).toFixed(3));

      return {
        id: `bin-clip-beam-${Date.now()}-${ray.id}-${idx}`,
        name: `${sourceName.replace('.wav', '')}_R${ray.index + 1}_${ray.hitType.toUpperCase()}`,
        hitType: ray.hitType,
        durationSeconds: Number(ray.durationSeconds.toFixed(3)),
        durationBars,
        audioUrl,
        audioBuffer: sliceBuffer,
        color: ray.color,
        createdAt: Date.now(),
        sourceTrack: sourceName,
        keyShortcut: KEYBOARD_PAD_SHORTCUTS[idx % KEYBOARD_PAD_SHORTCUTS.length]
      };
    });

    if (onAddProjectBinClips) {
      onAddProjectBinClips(newBinClips);
    }

    setRecentBatchCount(newBinClips.length);
    setBatchExportNotice(`✨ Successfully sliced & batch exported ${newBinClips.length} transient clips into Project Bin!`);
    setTimeout(() => {
      setBatchExportNotice(null);
    }, 4500);
  };

  // Timeline Injection Handlers
  const handleInjectLoop = () => {
    if (!audioBuffer) return;

    const secondsPerBar = (60 / tempo) * 4;
    const loopDurationSec = loopEndSec - loopStartSec;
    const rawBars = loopDurationSec / secondsPerBar;
    const durationBars = Math.max(0.25, Number(rawBars.toFixed(2)));

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const extractedLoop = extractLoopBuffer(ctx, audioBuffer, loopStartSec, loopEndSec, 5);
    const wavBlob = audioBufferToWav(extractedLoop);
    const audioUrl = URL.createObjectURL(wavBlob);

    const newClip: Clip = {
      id: `clip-beam-loop-${Date.now()}`,
      name: `${sourceName} [Prism Loop]`,
      startBar: targetStartBar,
      durationBars,
      audioUrl
    };

    setTracks(prev => {
      if (targetTimelineTrackId) {
        return prev.map(t => t.id === targetTimelineTrackId ? { ...t, clips: [...t.clips, newClip] } : t);
      } else {
        const newTrack: Track = {
          id: `track-beam-loop-${Date.now()}`,
          name: 'Prism Loop Track',
          type: 'audio',
          volume: 0.8,
          pan: 0,
          muted: false,
          soloed: false,
          phaseInverted: false,
          isMono: false,
          vstBypassed: true,
          color: '#00F0FF',
          clips: [newClip]
        };
        return [...prev, newTrack];
      }
    });

    setBatchExportNotice(`✨ Injected loop (${durationBars} bars) onto timeline track!`);
    setTimeout(() => setBatchExportNotice(null), 3000);
  };

  const handleInjectAllSlicesToTrack = () => {
    if (!audioBuffer || rays.length === 0) return;

    const wavBlob = audioBufferToWav(audioBuffer);
    const audioUrl = URL.createObjectURL(wavBlob);
    const secondsPerBar = (60 / tempo) * 4;

    const newClips: Clip[] = rays.map((slice, idx) => {
      const sliceBars = Math.max(0.125, Number((slice.durationSeconds / secondsPerBar).toFixed(2)));
      const offsetBars = Number((slice.startSeconds / secondsPerBar).toFixed(2));

      return {
        id: `clip-beam-hit-${slice.id}-${idx}`,
        name: `${slice.label} [${slice.hitType}]`,
        startBar: targetStartBar + offsetBars,
        durationBars: sliceBars,
        audioUrl
      };
    });

    setTracks(prev => {
      if (targetTimelineTrackId) {
        return prev.map(t => t.id === targetTimelineTrackId ? { ...t, clips: [...t.clips, ...newClips] } : t);
      } else {
        const newTrack: Track = {
          id: `track-refracted-hits-${Date.now()}`,
          name: 'Refracted Ray Hits',
          type: 'audio',
          volume: 0.8,
          pan: 0,
          muted: false,
          soloed: false,
          phaseInverted: false,
          isMono: false,
          vstBypassed: true,
          color: '#FF2E63',
          clips: newClips
        };
        return [...prev, newTrack];
      }
    });

    setBatchExportNotice(`✨ Placed ${newClips.length} slices sequentially on timeline track!`);
    setTimeout(() => setBatchExportNotice(null), 3000);
  };

  const handlePaintRayToPlayhead = (ray: PrismRay) => {
    if (!audioBuffer) return;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const sliceBuf = extractSliceBuffer(ctx, audioBuffer, ray, 3);
    const wavBlob = audioBufferToWav(sliceBuf);
    const audioUrl = URL.createObjectURL(wavBlob);

    const secondsPerBar = (60 / tempo) * 4;
    const sliceBars = Math.max(0.125, Number((ray.durationSeconds / secondsPerBar).toFixed(2)));

    const newClip: Clip = {
      id: `clip-ray-single-${Date.now()}`,
      name: `${ray.label} (${ray.hitType})`,
      startBar: targetStartBar,
      durationBars: sliceBars,
      audioUrl
    };

    setTracks(prev => {
      if (targetTimelineTrackId) {
        return prev.map(t => t.id === targetTimelineTrackId ? { ...t, clips: [...t.clips, newClip] } : t);
      } else {
        const newTrack: Track = {
          id: `track-ray-paint-${Date.now()}`,
          name: 'Prism Painted Track',
          type: 'audio',
          volume: 0.8,
          pan: 0,
          muted: false,
          soloed: false,
          phaseInverted: false,
          isMono: false,
          vstBypassed: true,
          color: ray.color || '#00F0FF',
          clips: [newClip]
        };
        return [...prev, newTrack];
      }
    });

    setTargetStartBar(prev => Number((prev + sliceBars).toFixed(2)));
  };

  const handleExportWav = () => {
    if (!audioBuffer) return;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();

    let exportBuf: AudioBuffer;
    let fileName: string;

    if (splitMode === 'loop') {
      exportBuf = extractLoopBuffer(ctx, audioBuffer, loopStartSec, loopEndSec);
      fileName = `${sourceName.replace('.wav', '')}_Prism_Loop_${activeLoopPresetBars}Bar.wav`;
    } else {
      const activeRay = rays.find(r => r.id === selectedRayId) || rays[0];
      exportBuf = extractSliceBuffer(ctx, audioBuffer, activeRay);
      fileName = `${sourceName.replace('.wav', '')}_Ray_${activeRay.index + 1}_${activeRay.hitType}.wav`;
    }

    const blob = audioBufferToWav(exportBuf);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectedRay = rays.find(r => r.id === selectedRayId) || null;

  return (
    <div className="h-full w-full bg-[#05070E] flex flex-col overflow-y-auto select-none p-4 md:p-6 text-white font-mono">
      {/* Top Banner Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#00F0FF]/25">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00F0FF]/20 via-[#FFD700]/20 to-[#FF2E63]/20 border border-[#00F0FF] flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.3)]">
            <Split size={22} className="text-[#00F0FF] transform -rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-black uppercase tracking-widest text-[#FFD700]">
                STRANGELET LAB
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/50 font-bold">
                PRISM CHOPPER ENGINE
              </span>
            </div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              BEAM SPLITTER & OPTICAL REFRACTOR
            </h1>
          </div>
        </div>

        {/* Action Controls & Sidebar Toggle */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#080D1A] border border-[#1E293B]">
            <button
              onClick={() => setSplitMode('hits')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                splitMode === 'hits'
                  ? 'bg-gradient-to-r from-[#FF2E63] to-[#FF7B00] text-white shadow-[0_0_12px_rgba(255,46,99,0.5)]'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Split size={14} />
              <span>REFRACTED HITS</span>
            </button>
            <button
              onClick={() => setSplitMode('loop')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                splitMode === 'loop'
                  ? 'bg-gradient-to-r from-[#00F0FF] to-[#10B981] text-black shadow-[0_0_12px_rgba(0,240,255,0.5)]'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Repeat size={14} />
              <span>PRISM LOOP</span>
            </button>
            <button
              onClick={() => setSplitMode('stutter')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                splitMode === 'stutter'
                  ? 'bg-gradient-to-r from-[#A855F7] to-[#EC4899] text-white shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Zap size={14} />
              <span>BURST STUTTER</span>
            </button>
          </div>

          {/* Show/Hide Sidebar Option to expand workspace */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="px-3 py-1.5 rounded-xl bg-[#0D1424] hover:bg-[#152038] border border-[#00F0FF]/40 text-xs font-bold text-[#00F0FF] hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
              title={isSidebarCollapsed ? "Show Sidebar" : "Hide Sidebar to maximize workspace"}
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
              <span>{isSidebarCollapsed ? 'SHOW SIDEBAR' : 'EXPAND WORKSPACE'}</span>
            </button>
          )}

          {onNavigateToMixer && (
            <button
              onClick={onNavigateToMixer}
              className="px-3 py-1.5 rounded-xl bg-[#0E1626] border border-[#1E293B] text-[#94A3B8] hover:text-white text-xs transition-all flex items-center gap-1"
            >
              <ArrowLeft size={14} />
              <span>Mixer</span>
            </button>
          )}
        </div>
      </div>

      {/* Notice Banner */}
      {batchExportNotice && (
        <div className="mt-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00F0FF]/20 via-[#FFD700]/20 to-[#FF2E63]/20 border border-[#00F0FF] text-xs font-bold text-white flex items-center justify-between shadow-[0_0_20px_rgba(0,240,255,0.3)] animate-fade-in">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#FFD700] animate-spin" />
            <span>{batchExportNotice}</span>
          </div>
          <span className="text-[10px] text-[#94A3B8]">Check Project Bin in sidebar</span>
        </div>
      )}

      {/* Top Source & Division Control Strip */}
      <div className="mt-4 p-3 bg-[#080C17] border border-[#1A2338] rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Source Audio Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[#64748B] font-bold">SOURCE BEAM:</span>
          <select
            value={selectedTrackId}
            onChange={(e) => handleSelectTrack(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[#0D1424] border border-cyan-500/40 text-cyan-300 font-mono text-xs focus:outline-none"
          >
            <option value="">-- Synthetic / Uploaded Audio --</option>
            {tracks.filter(t => t.type === 'audio').map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1.5 rounded-lg bg-[#10192C] border border-[#334155] text-white hover:border-[#00F0FF] hover:text-[#00F0FF] transition-all flex items-center gap-1.5"
          >
            <Disc size={13} />
            <span>Load Audio File</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileUpload(f);
            }}
          />

          {/* Quick Demos */}
          <div className="flex items-center gap-1 ml-1">
            <span className="text-[10px] text-[#475569]">DEMOS:</span>
            <button
              onClick={() => loadDemoBeam('photon_break')}
              className="px-2 py-0.5 rounded text-[10px] bg-[#111B30] border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500 hover:text-black transition-all"
            >
              Break 126
            </button>
            <button
              onClick={() => loadDemoBeam('prism_house')}
              className="px-2 py-0.5 rounded text-[10px] bg-[#111B30] border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500 hover:text-black transition-all"
            >
              House 124
            </button>
            <button
              onClick={() => loadDemoBeam('subatomic_trap')}
              className="px-2 py-0.5 rounded text-[10px] bg-[#111B30] border border-amber-500/30 text-amber-300 hover:bg-amber-500 hover:text-black transition-all"
            >
              Trap 140
            </button>
            <button
              onClick={() => loadDemoBeam('quantum_synth')}
              className="px-2 py-0.5 rounded text-[10px] bg-[#111B30] border border-purple-500/30 text-purple-300 hover:bg-purple-500 hover:text-black transition-all"
            >
              Synth 120
            </button>
          </div>
        </div>

        {/* Refraction Division & Snap & BATCH EXPORT BUTTON */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1">
            <span className="text-[#64748B] font-bold">DIVISION:</span>
            <select
              value={activeDivision}
              onChange={(e) => setActiveDivision(e.target.value as PrismDivision)}
              className="px-2.5 py-1.5 rounded-lg bg-[#0D1424] border border-[#00F0FF]/40 text-[#00F0FF] font-bold text-xs"
            >
              <option value="transient">⚡ Transient Onsets (Beat Hits)</option>
              <option value="1/4">1/4 Note Rays</option>
              <option value="1/8">1/8 Note Rays</option>
              <option value="1/16">1/16 Note Rays</option>
              <option value="1/32">1/32 Note Rays</option>
              <option value="1/8t">1/8 Triplets</option>
              <option value="1/16t">1/16 Triplets</option>
              <option value="1/1">1 Bar Rays</option>
              <option value="1/2">1/2 Bar Rays</option>
            </select>
          </div>

          <button
            onClick={() => setSnapZeroCrossing(!snapZeroCrossing)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              snapZeroCrossing 
                ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]' 
                : 'bg-[#121826] text-[#64748B] border border-[#1E293B]'
            }`}
            title="Snap slice boundaries to zero-crossings to eliminate clicks"
          >
            <ShieldCheck size={13} />
            <span>ZERO SNAP</span>
          </button>

          {/* BATCH EXPORT BUTTON (USER SPECIFICATION) */}
          <button
            onClick={handleBatchExportToBin}
            disabled={!audioBuffer || rays.length === 0}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00F0FF] via-[#FFD700] to-[#FF2E63] text-black font-black text-xs hover:brightness-110 transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Batch export all detected transient slices into individual clips in the Project Bin"
          >
            <Layers size={15} className="text-black" />
            <span>BATCH EXPORT TO BIN ({rays.length})</span>
          </button>
        </div>
      </div>

      {/* OPTICAL PRISM REFRACTION VISUALIZER (USER SPECIFICATION) */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-1.5 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[#00F0FF] uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={12} className="text-[#FFD700]" />
              <span>OPTICAL PRISM REFRACTION CHAMBER</span>
            </span>
            <span className="text-[10px] text-[#64748B]">
              Simulating Snell's Law caustic dispersion across audio wavelengths
            </span>
          </div>
          <div className="text-[10px] text-[#FFD700] font-mono">
            Dispersion Spread: {(prismDispersionSpread * 100).toFixed(0)}%
          </div>
        </div>

        <PrismRefractionVisualizer
          selectedRay={selectedRay}
          rays={rays}
          dispersionSpread={prismDispersionSpread}
          isAuditioning={activeAuditioningRayId !== null}
          onSelectRay={playRay}
        />
      </div>

      {/* INTERACTIVE WAVEFORM & SLICE VIEWPORT */}
      <div className="mt-4 flex flex-col gap-2">
        <div className="relative h-48 w-full bg-[#03050A] rounded-xl border border-[#1E293B] overflow-hidden shadow-inner flex flex-col justify-between">
          {/* Waveform Top Header Overlay */}
          <div className="absolute top-2 left-3 z-10 flex items-center gap-3 pointer-events-none">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-300 bg-black/70 px-2.5 py-1 rounded-lg border border-cyan-500/30 backdrop-blur-sm">
              <Compass size={13} className="text-[#FFD700]" />
              <span>{sourceName}</span>
            </div>
            <div className="text-[10px] font-mono text-[#94A3B8] bg-black/70 px-2 py-1 rounded-lg border border-[#1E293B]">
              {splitMode === 'loop' 
                ? `Loop Range: ${(loopEndSec - loopStartSec).toFixed(3)}s [${activeLoopPresetBars} Bar(s)]`
                : `Detected Slices: ${rays.length} Spectral Rays`
              }
            </div>
          </div>

          {/* Interactive Canvas */}
          <canvas
            ref={canvasRef}
            width={1200}
            height={192}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            className="w-full h-full cursor-crosshair"
            title="Click slices to audition. Drag handles in Loop mode to isolate zero-crossing loop."
          />

          {/* Waveform Bottom Floating Transport */}
          <div className="absolute bottom-2 left-3 right-3 z-10 flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlayLoop}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md ${
                  isPlaying 
                    ? 'bg-white text-black font-black' 
                    : 'bg-[#00F0FF] text-black hover:bg-white'
                }`}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                <span>{isPlaying ? 'PAUSE' : 'PLAY LOOP'}</span>
              </button>

              <button
                onClick={() => {
                  playerRef.current?.stopAll();
                  setIsPlaying(false);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#141C2E] border border-[#334155] text-[#94A3B8] hover:text-white text-xs font-mono font-bold"
                title="Stop all audio playback"
              >
                <Square size={13} />
              </button>

              {splitMode === 'loop' && (
                <div className="flex items-center gap-1 ml-2">
                  <span className="text-[10px] text-[#64748B]">PRESETS:</span>
                  {[0.5, 1, 2, 4].map(bars => (
                    <button
                      key={bars}
                      onClick={() => handleSetLoopPreset(bars)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase transition-all ${
                        activeLoopPresetBars === bars
                          ? 'bg-[#FFD700] text-black font-bold'
                          : 'bg-[#101726] border border-[#23314D] text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      {bars < 1 ? '1/2 Bar' : `${bars} Bar${bars > 1 ? 's' : ''}`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Stutter Instant Buttons */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#A855F7] font-bold">BURST:</span>
              {(['1/16', '1/32', '1/64'] as const).map(rate => (
                <button
                  key={rate}
                  onClick={() => handleTriggerStutter(rate)}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-bold border transition-all ${
                    activeStutterRate === rate
                      ? 'bg-[#A855F7] text-white border-[#A855F7] shadow-[0_0_10px_#A855F7]'
                      : 'bg-[#140F22] border-[#2E1F47] text-[#C084FC] hover:bg-[#A855F7] hover:text-white'
                  }`}
                >
                  {rate}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* LOWER SECTION: 16-PAD MATRIX & OPTICAL DSP */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: 16-Pad Spectral Ray Matrix */}
        <div className="lg:col-span-2 p-4 bg-[#080B15] border border-[#1A2338] rounded-xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#FFD700] tracking-wider uppercase">
                SPECTRAL RAY CHROMATIC PADS
              </span>
              <span className="text-[10px] text-[#64748B]">
                (Keys: 1-8, Q-I for immediate finger-triggering)
              </span>
            </div>

            {selectedRay && (
              <span 
                className="text-[10px] font-bold px-2 py-0.5 rounded border"
                style={{ 
                  backgroundColor: `${selectedRay.color}20`, 
                  borderColor: selectedRay.color, 
                  color: selectedRay.color 
                }}
              >
                FOCUSED: {selectedRay.label} ({selectedRay.hitType.toUpperCase()})
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {rays.slice(0, 16).map((ray, idx) => {
              const isSelected = ray.id === selectedRayId;
              const isAuditioning = ray.id === activeAuditioningRayId;

              return (
                <div
                  key={ray.id}
                  onClick={() => playRay(ray)}
                  className={`relative p-2.5 rounded-xl border flex flex-col justify-between h-20 transition-all cursor-pointer group select-none ${
                    isAuditioning
                      ? 'scale-95 shadow-[0_0_20px_currentColor]'
                      : isSelected
                        ? 'scale-[1.02] border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                        : 'border-[#1E293B] hover:border-[#38BDF8]/60 hover:bg-[#0E1729]'
                  }`}
                  style={{
                    backgroundColor: isAuditioning ? `${ray.color}40` : isSelected ? `${ray.color}25` : '#0A0F1D',
                    borderColor: isSelected ? '#FFFFFF' : isAuditioning ? ray.color : undefined
                  }}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span 
                      className="w-2 h-2 rounded-full shadow-sm" 
                      style={{ backgroundColor: ray.color }} 
                    />
                    <span className="font-mono text-[9px] text-[#94A3B8] group-hover:text-white font-bold">
                      {ray.keyShortcut}
                    </span>
                  </div>

                  <div className="text-center">
                    <span className="text-xs font-black tracking-tight" style={{ color: ray.color }}>
                      R{ray.index + 1}
                    </span>
                    <div className="text-[9px] uppercase font-bold text-[#CCC]">
                      {ray.hitType}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[8px] text-[#64748B]">
                    <span>{(ray.durationSeconds * 1000).toFixed(0)}ms</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePaintRayToPlayhead(ray);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-[#00F0FF] transition-opacity"
                      title="Place slice at cursor on timeline"
                    >
                      +TIMELINE
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Optical DSP & Project Bin Quick Actions */}
        <div className="p-4 bg-[#080B15] border border-[#1A2338] rounded-xl flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#1A2338]">
              <span className="text-xs font-bold text-[#00F0FF] uppercase tracking-wider flex items-center gap-1.5">
                <Sliders size={13} />
                <span>OPTICAL DSP CHAIN</span>
              </span>
              <span className="text-[10px] text-[#64748B]">Prism Tuning</span>
            </div>

            <div className="space-y-3 mt-3">
              {/* Refraction Pitch Shift */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-[#94A3B8]">Refraction Pitch:</span>
                  <span className="text-[#FFD700] font-bold">
                    {refractionPitch > 0 ? `+${refractionPitch}` : refractionPitch} st
                  </span>
                </div>
                <input
                  type="range"
                  min={-12}
                  max={12}
                  step={1}
                  value={refractionPitch}
                  onChange={(e) => setRefractionPitch(Number(e.target.value))}
                  className="w-full accent-[#FFD700] cursor-pointer"
                />
              </div>

              {/* Dispersion Spread */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-[#94A3B8]">Stereo Dispersion Fan:</span>
                  <span className="text-[#00F0FF] font-bold">
                    {(prismDispersionSpread * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={prismDispersionSpread}
                  onChange={(e) => setPrismDispersionSpread(Number(e.target.value))}
                  className="w-full accent-[#00F0FF] cursor-pointer"
                />
              </div>

              {/* Optical Filter */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-[#94A3B8]">Optical Filter:</span>
                  <span className="text-[#10B981] font-bold">
                    {opticalFilterCutoff < 20000 ? `${(opticalFilterCutoff / 1000).toFixed(1)} kHz` : 'Bypass'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={opticalFilterType}
                    onChange={(e) => setOpticalFilterType(e.target.value as BiquadFilterType)}
                    className="px-2 py-1 rounded bg-[#0D1424] border border-[#1E293B] text-[10px] text-white"
                  >
                    <option value="allpass">Bypass</option>
                    <option value="lowpass">Low-Pass</option>
                    <option value="highpass">High-Pass</option>
                    <option value="bandpass">Band-Pass</option>
                  </select>
                  <input
                    type="range"
                    min={200}
                    max={20000}
                    step={100}
                    value={opticalFilterCutoff}
                    onChange={(e) => setOpticalFilterCutoff(Number(e.target.value))}
                    className="flex-1 accent-[#10B981] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Timeline Destination Settings */}
          <div className="p-3 rounded-lg bg-[#04060C] border border-[#1E293B] space-y-2">
            <span className="text-[10px] text-[#64748B] font-bold uppercase block">
              Timeline Destination
            </span>
            <div className="flex items-center gap-2">
              <select
                value={targetTimelineTrackId}
                onChange={(e) => setTargetTimelineTrackId(e.target.value)}
                className="flex-1 px-2 py-1 rounded bg-[#0D1424] border border-[#1E293B] text-xs text-white"
              >
                <option value="">-- Create New Track --</option>
                {tracks.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>

              <div className="flex items-center gap-1 text-xs">
                <span className="text-[#64748B]">Bar:</span>
                <input
                  type="number"
                  min={0}
                  max={64}
                  value={targetStartBar}
                  onChange={(e) => setTargetStartBar(Math.max(0, Number(e.target.value)))}
                  className="w-12 px-1.5 py-1 rounded bg-[#0D1424] border border-[#1E293B] text-white text-center font-bold"
                />
              </div>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-col gap-2">
            {splitMode === 'loop' ? (
              <button
                onClick={handleInjectLoop}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00F0FF] to-[#10B981] text-black font-black text-xs hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,240,255,0.4)]"
              >
                <Repeat size={14} />
                <span>INJECT LOOP INTO TIMELINE</span>
              </button>
            ) : (
              <button
                onClick={handleInjectAllSlicesToTrack}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FF2E63] to-[#FF7B00] text-white font-black text-xs hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,46,99,0.4)]"
              >
                <ArrowRight size={14} />
                <span>PLACE ALL SLICES ON TRACK</span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleBatchExportToBin}
                className="py-2 rounded-lg bg-[#0E1626] hover:bg-[#142038] border border-[#00F0FF]/40 text-[#00F0FF] hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                title="Batch export all slices to project bin"
              >
                <Layers size={13} />
                <span>To Project Bin</span>
              </button>

              <button
                onClick={handleExportWav}
                className="py-2 rounded-lg bg-[#141C2E] hover:bg-[#1A253D] border border-[#334155] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Download size={13} />
                <span>Export WAV</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
