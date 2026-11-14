import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  X, Play, Pause, Square, Repeat, Scissors, Split, Sparkles, Volume2, 
  RotateCcw, Sliders, Music, Zap, Download, Layers, Crosshair, ArrowRight,
  ShieldCheck, Disc, Radio, Filter, Wand2, Compass, Check, Keyboard
} from 'lucide-react';
import { Track, Clip, PrismRay, PrismDivision, PrismHitType, BeamSplitMode, BeamSplitterResult, ProjectBinClip } from '../types';
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

interface BeamSplitterModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: Track[];
  initialTrackId?: string;
  currentProjectBpm: number;
  playheadPositionBars?: number; // Cursor position in bars (0 to 16)
  onApplyBeamSplitter: (result: BeamSplitterResult) => void;
  onAddProjectBinClips?: (clips: ProjectBinClip[]) => void;
  onOpenBasicPitch?: (stemCategory?: 'vocals' | 'bass' | 'drums' | 'instruments' | 'full', songTitle?: string, audioBuffer?: AudioBuffer) => void;
}

export const BeamSplitterModal: React.FC<BeamSplitterModalProps> = ({
  isOpen,
  onClose,
  tracks,
  initialTrackId,
  currentProjectBpm,
  playheadPositionBars = 0,
  onApplyBeamSplitter,
  onAddProjectBinClips,
  onOpenBasicPitch
}) => {
  // Mode selection: 'loop' (Prism Loop Isolator) | 'hits' (Beat Refractor into Single Hits) | 'stutter' (Photon Burst)
  const [splitMode, setSplitMode] = useState<BeamSplitMode>('hits');

  // Audio source state
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [sourceName, setSourceName] = useState<string>('Neutron_Breakbeat_126BPM.wav');
  const [selectedTrackId, setSelectedTrackId] = useState<string>(initialTrackId || '');
  const [targetTimelineTrackId, setTargetTimelineTrackId] = useState<string>(initialTrackId || '');
  const [targetStartBar, setTargetStartBar] = useState<number>(Math.floor(playheadPositionBars));

  // Optical & Refraction parameters
  const [activeDivision, setActiveDivision] = useState<PrismDivision>('transient');
  const [snapZeroCrossing, setSnapZeroCrossing] = useState<boolean>(true);
  const [refractionPitch, setRefractionPitch] = useState<number>(0); // semitones (-12 to +12)
  const [prismDispersionSpread, setPrismDispersionSpread] = useState<number>(0.5); // 0 to 1 (stereo pan fan)
  const [opticalFilterCutoff, setOpticalFilterCutoff] = useState<number>(20000); // Hz
  const [opticalFilterType, setOpticalFilterType] = useState<BiquadFilterType>('allpass');
  const [masterVolume, setMasterVolume] = useState<number>(1.0);

  // Refracted rays and loop state
  const [rays, setRays] = useState<PrismRay[]>([]);
  const [selectedRayId, setSelectedRayId] = useState<string | null>(null);
  const [loopStartSec, setLoopStartSec] = useState<number>(0);
  const [loopEndSec, setLoopEndSec] = useState<number>(2.0); // Default 1-2 bars
  const [activeLoopPresetBars, setActiveLoopPresetBars] = useState<number>(1);

  // Audition playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeAuditioningRayId, setActiveAuditioningRayId] = useState<string | null>(null);
  const [activeStutterRate, setActiveStutterRate] = useState<'1/16' | '1/32' | '1/64' | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1); // 1x to 4x

  // Waveform visualization & Canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveformPeaksRef = useRef<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const playerRef = useRef<PrismAudioPlayer | null>(null);
  const isDraggingHandleRef = useRef<'start' | 'end' | null>(null);

  // Instantiate audio player lazily and dispose on unmount
  useEffect(() => {
    playerRef.current = new PrismAudioPlayer();
    return () => {
      playerRef.current?.dispose();
      playerRef.current = null;
    };
  }, []);

  // Update master volume on player
  useEffect(() => {
    playerRef.current?.setMasterVolume(masterVolume);
  }, [masterVolume]);

  // Update optical filter
  useEffect(() => {
    playerRef.current?.setFilter(opticalFilterType, opticalFilterCutoff);
  }, [opticalFilterType, opticalFilterCutoff]);

  // Load initial demo audio or track on open
  useEffect(() => {
    if (!isOpen) {
      playerRef.current?.stopAll();
      setIsPlaying(false);
      return;
    }

    // If a track with audioBuffer exists, prioritize that
    if (initialTrackId) {
      const tr = tracks.find(t => t.id === initialTrackId);
      if (tr) {
        setSelectedTrackId(initialTrackId);
        setTargetTimelineTrackId(initialTrackId);
        setSourceName(tr.name);
      }
    }

    if (!audioBuffer) {
      loadDemoBeam('photon_break');
    }
  }, [isOpen, initialTrackId]);

  // Helper to load synthetic high-energy demo audio beams
  const loadDemoBeam = (style: 'photon_break' | 'prism_house' | 'subatomic_trap' | 'quantum_synth') => {
    playerRef.current?.stopAll();
    setIsPlaying(false);
    const demo = createBeamSplitterDemoAudio(style);
    setAudioBuffer(demo.buffer);
    setSourceName(`${demo.title}.wav`);
    processWaveformPeaks(demo.buffer);

    // Default loop duration = 1 bar at demo BPM
    const secondsPerBar = (60 / demo.bpm) * 4;
    setLoopStartSec(0);
    setLoopEndSec(Math.min(demo.buffer.duration, secondsPerBar));
    setActiveLoopPresetBars(1);

    // Initial refraction
    const splitRays = refractAudioBeam(demo.buffer, demo.bpm, activeDivision, snapZeroCrossing);
    setRays(splitRays);
    if (splitRays.length > 0) setSelectedRayId(splitRays[0].id);
  };

  // Re-refract when division, snap, or buffer changes
  useEffect(() => {
    if (!audioBuffer) return;
    const splitRays = refractAudioBeam(
      audioBuffer, 
      currentProjectBpm, 
      activeDivision, 
      snapZeroCrossing
    );

    // Apply stereo dispersion spread
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
  }, [audioBuffer, activeDivision, snapZeroCrossing, prismDispersionSpread, currentProjectBpm]);

  // Compute waveform visual peaks
  const processWaveformPeaks = (buffer: AudioBuffer) => {
    const rawData = buffer.getChannelData(0);
    const numBuckets = 600;
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

  // User file upload handler
  const handleFileUpload = async (file: File) => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    try {
      const arrayBuffer = await file.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuffer);

      setAudioBuffer(decoded);
      setSourceName(file.name);
      processWaveformPeaks(decoded);

      const secondsPerBar = (60 / currentProjectBpm) * 4;
      setLoopStartSec(0);
      setLoopEndSec(Math.min(decoded.duration, secondsPerBar));
      setActiveLoopPresetBars(1);

      const splitRays = refractAudioBeam(decoded, currentProjectBpm, activeDivision, snapZeroCrossing);
      setRays(splitRays);
      if (splitRays.length > 0) setSelectedRayId(splitRays[0].id);
    } catch (err) {
      console.error('Beam Splitter file decode error:', err);
    } finally {
      ctx.close().catch(() => {});
    }
  };

  // Switch to project track audio
  const handleSelectTrack = (trackId: string) => {
    setSelectedTrackId(trackId);
    setTargetTimelineTrackId(trackId);
    const tr = tracks.find(t => t.id === trackId);
    if (!tr) return;

    setSourceName(tr.name);
    // If track has audio buffer loaded in audioService or synthetic
    loadDemoBeam('photon_break');
  };

  // Set Loop Presets (1/2 Bar, 1 Bar, 2 Bars, 4 Bars)
  const handleSetLoopPreset = (bars: number) => {
    if (!audioBuffer) return;
    setActiveLoopPresetBars(bars);
    const secondsPerBar = (60 / currentProjectBpm) * 4;
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

  // Audition playback of a single Prism Ray
  const playRay = useCallback((ray: PrismRay) => {
    if (!audioBuffer || !playerRef.current) return;
    setActiveAuditioningRayId(ray.id);
    setSelectedRayId(ray.id);

    // Apply global refraction pitch
    const modifiedRay = {
      ...ray,
      pitchSemitones: (ray.pitchSemitones || 0) + refractionPitch
    };

    playerRef.current.playRaySlice(audioBuffer, modifiedRay, 1.0, () => {
      setActiveAuditioningRayId(null);
    });
  }, [audioBuffer, refractionPitch]);

  // Audition playback of the Prism Loop
  const togglePlayLoop = () => {
    if (!audioBuffer || !playerRef.current) return;

    if (isPlaying) {
      playerRef.current.stopAll();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      playerRef.current.playLoopPreview(audioBuffer, loopStartSec, loopEndSec, true);
    }
  };

  // Trigger Photon Stutter on hold
  const handlePhotonStutter = (rate: '1/16' | '1/32' | '1/64') => {
    if (!audioBuffer || !playerRef.current) return;
    setActiveStutterRate(rate);

    const activeRay = rays.find(r => r.id === selectedRayId) || rays[0];
    if (activeRay) {
      playerRef.current.triggerPhotonStutter(audioBuffer, activeRay, rate, currentProjectBpm, 12);
    }

    setTimeout(() => {
      setActiveStutterRate(null);
    }, 450);
  };

  // Keyboard shortcut listener for drum-pad trigger
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || e.repeat) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const key = e.key.toUpperCase();
      const targetRay = rays.find(r => r.keyShortcut?.toUpperCase() === key);
      if (targetRay) {
        e.preventDefault();
        playRay(targetRay);
      } else if (e.code === 'Space') {
        e.preventDefault();
        togglePlayLoop();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, rays, playRay]);

  // Draw Waveform & Refracted Ray Prism Spectrum onto Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBuffer) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const peaks = waveformPeaksRef.current;
    const duration = audioBuffer.duration;

    ctx.clearRect(0, 0, width, height);

    // 1. Background chamber gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#040711');
    bgGrad.addColorStop(1, '#070D1C');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Optical Grid Lines
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
    ctx.lineWidth = 1;
    const gridCols = 16;
    for (let c = 1; c < gridCols; c++) {
      const x = (c / gridCols) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // 3. Draw Refracted Ray Spectral Bands (Mode === 'hits')
    if (splitMode === 'hits' && rays.length > 0) {
      rays.forEach((ray) => {
        const x1 = (ray.startSeconds / duration) * width;
        const x2 = (ray.endSeconds / duration) * width;
        const sliceW = Math.max(1, x2 - x1);

        const isSelected = ray.id === selectedRayId;
        const isAuditioning = ray.id === activeAuditioningRayId;

        // Band background glow
        ctx.fillStyle = isAuditioning 
          ? `${ray.color}55` 
          : isSelected 
            ? `${ray.color}33` 
            : `${ray.color}15`;
        ctx.fillRect(x1, 0, sliceW, height);

        // Ray divider edge with optical laser line
        ctx.strokeStyle = isSelected ? '#FFFFFF' : `${ray.color}AA`;
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(x1, 0);
        ctx.lineTo(x1, height);
        ctx.stroke();

        // Ray wavelength & label tag at top
        ctx.fillStyle = ray.color;
        ctx.font = '9px monospace';
        ctx.fillText(`R${ray.index + 1}`, x1 + 3, 12);
      });
    }

    // 4. Draw Waveform Peaks
    const midY = height / 2;
    ctx.lineWidth = 1.5;

    for (let i = 0; i < peaks.length; i++) {
      const x = (i / peaks.length) * width;
      const peakVal = peaks[i] || 0.05;
      const barH = peakVal * (height * 0.42);

      // Determine color based on time and active slice
      const timeAtPoint = (i / peaks.length) * duration;
      const rayAtPoint = rays.find(r => timeAtPoint >= r.startSeconds && timeAtPoint < r.endSeconds);
      const strokeColor = rayAtPoint ? rayAtPoint.color : '#00F0FF';

      ctx.strokeStyle = strokeColor;
      ctx.beginPath();
      ctx.moveTo(x, midY - barH);
      ctx.lineTo(x, midY + barH);
      ctx.stroke();
    }

    // 5. Center zero-line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    // 6. Draw Prism Loop Bounds & Shading (Mode === 'loop')
    if (splitMode === 'loop') {
      const loopX1 = (loopStartSec / duration) * width;
      const loopX2 = (loopEndSec / duration) * width;
      const loopW = Math.max(2, loopX2 - loopX1);

      // Outside Dimming Mask
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillRect(0, 0, loopX1, height);
      ctx.fillRect(loopX2, 0, width - loopX2, height);

      // Loop Active Glow
      const loopGrad = ctx.createLinearGradient(loopX1, 0, loopX2, 0);
      loopGrad.addColorStop(0, 'rgba(0, 240, 255, 0.25)');
      loopGrad.addColorStop(0.5, 'rgba(255, 215, 0, 0.2)');
      loopGrad.addColorStop(1, 'rgba(0, 240, 255, 0.25)');
      ctx.fillStyle = loopGrad;
      ctx.fillRect(loopX1, 0, loopW, height);

      // Start Handle (Gold Laser)
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(loopX1, 0);
      ctx.lineTo(loopX1, height);
      ctx.stroke();

      // End Handle (Cyan Laser)
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(loopX2, 0);
      ctx.lineTo(loopX2, height);
      ctx.stroke();

      // Handle grab flags
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(loopX1 - 5, 0, 10, 16);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('IN', loopX1 - 4, 12);

      ctx.fillStyle = '#00F0FF';
      ctx.fillRect(loopX2 - 7, 0, 14, 16);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('OUT', loopX2 - 8, 12);
    }
  }, [audioBuffer, rays, splitMode, selectedRayId, activeAuditioningRayId, loopStartSec, loopEndSec]);

  // Waveform click to select ray or scrub
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
        // Move start to click point while preserving length
        const dur = loopEndSec - loopStartSec;
        setLoopStartSec(clickTime);
        setLoopEndSec(Math.min(audioBuffer.duration, clickTime + dur));
      }
    } else {
      // Find ray at click
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
      if (time < loopEndSec - 0.05) {
        setLoopStartSec(time);
      }
    } else if (isDraggingHandleRef.current === 'end') {
      if (time > loopStartSec + 0.05) {
        setLoopEndSec(time);
      }
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

  // INJECTION ACTIONS (Prism Loop Chopper Core Functionality):
  
  // 1. Inject Perfect Loop into Timeline
  const handleInjectLoop = () => {
    if (!audioBuffer) return;

    const secondsPerBar = (60 / currentProjectBpm) * 4;
    const loopDurationSec = loopEndSec - loopStartSec;
    const rawBars = loopDurationSec / secondsPerBar;
    const durationBars = Math.max(0.25, Number(rawBars.toFixed(2)));

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    let extractedLoop: AudioBuffer;
    try {
      extractedLoop = extractLoopBuffer(ctx, audioBuffer, loopStartSec, loopEndSec, 5);
    } finally {
      ctx.close().catch(() => {});
    }
    const wavBlob = audioBufferToWav(extractedLoop);
    const audioUrl = URL.createObjectURL(wavBlob);

    onApplyBeamSplitter({
      mode: 'loop',
      sourceName: `${sourceName} [Prism Loop]`,
      targetTrackId: targetTimelineTrackId || undefined,
      targetStartBar,
      audioBuffer: extractedLoop,
      audioUrl,
      loopRange: {
        startSeconds: loopStartSec,
        endSeconds: loopEndSec,
        durationBars
      }
    });

    onClose();
  };

  // 2. Refract Beat into Single Hits and Inject All Slices onto Track
  const handleInjectAllSlices = () => {
    if (!audioBuffer || rays.length === 0) return;

    const wavBlob = audioBufferToWav(audioBuffer);
    const audioUrl = URL.createObjectURL(wavBlob);

    onApplyBeamSplitter({
      mode: 'hits',
      sourceName: `${sourceName} [Refracted Slices]`,
      targetTrackId: targetTimelineTrackId || undefined,
      targetStartBar,
      audioBuffer,
      audioUrl,
      slices: rays
    });

    onClose();
  };

  // 3. Paint Single Focused Ray to Playhead Cursor
  const handlePaintRayToPlayhead = (ray: PrismRay) => {
    if (!audioBuffer) return;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    let sliceBuf: AudioBuffer;
    try {
      sliceBuf = extractSliceBuffer(ctx, audioBuffer, ray, 3);
    } finally {
      ctx.close().catch(() => {});
    }
    const wavBlob = audioBufferToWav(sliceBuf);
    const audioUrl = URL.createObjectURL(wavBlob);

    onApplyBeamSplitter({
      mode: 'single_ray',
      sourceName: `${ray.label} (${ray.hitType})`,
      targetTrackId: targetTimelineTrackId || undefined,
      targetStartBar,
      audioBuffer: sliceBuf,
      audioUrl,
      singleRay: ray
    });

    // Advance cursor by slice duration in bars
    const secondsPerBar = (60 / currentProjectBpm) * 4;
    const sliceBars = Number((ray.durationSeconds / secondsPerBar).toFixed(2));
    setTargetStartBar(prev => Number((prev + sliceBars).toFixed(2)));
  };

  // 4. Download Slices or Loop as WAV File
  const handleExportWav = () => {
    if (!audioBuffer) return;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();

    let exportBuf: AudioBuffer;
    let fileName: string;

    try {
      if (splitMode === 'loop') {
        exportBuf = extractLoopBuffer(ctx, audioBuffer, loopStartSec, loopEndSec);
        fileName = `${sourceName.replace('.wav', '')}_Prism_Loop_${activeLoopPresetBars}Bar.wav`;
      } else {
        const activeRay = rays.find(r => r.id === selectedRayId) || rays[0];
        exportBuf = extractSliceBuffer(ctx, audioBuffer, activeRay);
        fileName = `${sourceName.replace('.wav', '')}_Ray_${activeRay.index + 1}_${activeRay.hitType}.wav`;
      }
    } finally {
      ctx.close().catch(() => {});
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

  const [batchExportNotice, setBatchExportNotice] = useState<string | null>(null);

  // CORE REQUEST: Batch Export Entire Track to Project Bin based on detected transients
  const handleBatchExportToBin = () => {
    if (!audioBuffer || rays.length === 0) return;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const secondsPerBar = (60 / currentProjectBpm) * 4;

    let newBinClips: ProjectBinClip[];
    try {
      newBinClips = rays.map((ray, idx) => {
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
    } finally {
      ctx.close().catch(() => {});
    }

    if (onAddProjectBinClips) {
      onAddProjectBinClips(newBinClips);
    }

    setBatchExportNotice(`✨ Sliced & batch exported ${newBinClips.length} transient clips to Project Bin!`);
    setTimeout(() => {
      setBatchExportNotice(null);
    }, 4500);
  };

  const selectedRay = rays.find(r => r.id === selectedRayId) || null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9995] flex items-center justify-center p-3 md:p-6 bg-black/90 backdrop-blur-lg animate-fade-in select-none">
      <div className="relative w-full max-w-6xl bg-[#060810] border-2 border-[#00F0FF]/40 rounded-2xl shadow-[0_0_60px_rgba(0,240,255,0.25)] flex flex-col max-h-[94vh] overflow-hidden">
        
        {/* Optical Header Banner */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#0A0E1A] via-[#10182E] to-[#080B14] border-b border-[#00F0FF]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Stylized Prism Icon */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00F0FF]/20 via-[#FFD700]/20 to-[#FF2E63]/20 border border-[#00F0FF] flex items-center justify-center shadow-[0_0_15px_#00F0FF]">
              <Split size={20} className="text-[#00F0FF] transform -rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black uppercase tracking-widest text-[#FFD700]">
                  STRANGELET LAB // OPTICAL CHOPPER
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/50 font-mono font-bold">
                  PRISM DISPERSION ENGINE
                </span>
              </div>
              <h2 className="text-lg font-black text-white font-mono tracking-tight flex items-center gap-2">
                BEAM SPLITTER & PRISM SLICER
              </h2>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#03050A] border border-[#1E293B]">
            <button
              onClick={() => setSplitMode('hits')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
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
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
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
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                splitMode === 'stutter'
                  ? 'bg-gradient-to-r from-[#A855F7] to-[#EC4899] text-white shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Zap size={14} />
              <span>PHOTON STUTTER</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#141B2D] border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500 hover:text-black flex items-center justify-center transition-all"
            title="Close Beam Splitter"
          >
            <X size={18} />
          </button>
        </div>

        {/* Top Control Deck: Source Loading & Optical Dispersion */}
        <div className="px-5 py-3 bg-[#080C17] border-b border-[#1A2338] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          {/* Source Audio Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[#64748B] font-bold">SOURCE BEAM:</span>
            <select
              value={selectedTrackId}
              onChange={(e) => handleSelectTrack(e.target.value)}
              className="px-2.5 py-1 rounded bg-[#0D1424] border border-cyan-500/30 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-400"
            >
              <option value="">-- Synthetic / Uploaded Audio --</option>
              {tracks.filter(t => t.type === 'audio').map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 rounded bg-[#10192C] border border-[#334155] text-white hover:border-[#00F0FF] hover:text-[#00F0FF] transition-all flex items-center gap-1"
            >
              <Disc size={13} />
              <span>Upload Audio</span>
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

            {/* Instant Demo Presets */}
            <div className="flex items-center gap-1 ml-2">
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

          {/* Slicing / Division Selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-[#64748B] font-bold">REFRACTION:</span>
              <select
                value={activeDivision}
                onChange={(e) => setActiveDivision(e.target.value as PrismDivision)}
                className="px-2 py-1 rounded bg-[#0D1424] border border-[#00F0FF]/40 text-[#00F0FF] font-bold text-xs"
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

            {/* Zero-Crossing Lock */}
            <button
              onClick={() => setSnapZeroCrossing(!snapZeroCrossing)}
              className={`px-2 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                snapZeroCrossing 
                  ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]' 
                  : 'bg-[#121826] text-[#64748B] border border-[#1E293B]'
              }`}
              title="Snap slice boundaries to zero-crossings to prevent clicks"
            >
              <ShieldCheck size={13} />
              <span>ZERO SNAP</span>
            </button>

            {/* BATCH EXPORT BUTTON (USER SPECIFICATION) */}
            <button
              onClick={handleBatchExportToBin}
              disabled={!audioBuffer || rays.length === 0}
              className="px-3.5 py-1 rounded-lg bg-gradient-to-r from-[#00F0FF] via-[#FFD700] to-[#FF2E63] text-black font-black text-xs hover:brightness-110 transition-all shadow-[0_0_15px_rgba(0,240,255,0.4)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Batch export all detected transient slices into individual clips in the Project Bin"
            >
              <Layers size={13} className="text-black" />
              <span>BATCH EXPORT TO BIN ({rays.length})</span>
            </button>

            {/* ROUTE STEM TO BASIC PITCH AUDIO-TO-MIDI */}
            {onOpenBasicPitch && (
              <button
                onClick={() => {
                  onClose();
                  const guessedCategory: 'vocals' | 'bass' | 'drums' | 'instruments' =
                    sourceName.toLowerCase().includes('drum') || sourceName.toLowerCase().includes('break') || activeDivision === 'transient'
                      ? 'drums'
                      : sourceName.toLowerCase().includes('bass')
                        ? 'bass'
                        : sourceName.toLowerCase().includes('vocal')
                          ? 'vocals'
                          : 'instruments';
                  onOpenBasicPitch(guessedCategory, sourceName, audioBuffer || undefined);
                }}
                className="px-3 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/70 text-emerald-300 hover:text-white font-black text-xs transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center gap-1.5 cursor-pointer"
                title="Send this stem to Spotify Basic Pitch to extract polyphonic MIDI notes and assign a VSTi instrument"
              >
                <Keyboard size={13} className="text-emerald-400" />
                <span>AUDIO TO MIDI</span>
              </button>
            )}
          </div>
        </div>

        {/* Notice Banner */}
        {batchExportNotice && (
          <div className="mx-4 mt-2 px-3.5 py-2 rounded-lg bg-gradient-to-r from-[#00F0FF]/20 via-[#FFD700]/20 to-[#FF2E63]/20 border border-[#00F0FF] text-xs font-bold text-white flex items-center justify-between shadow-[0_0_15px_rgba(0,240,255,0.3)] animate-fade-in">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-[#FFD700] animate-spin" />
              <span>{batchExportNotice}</span>
            </div>
            <span className="text-[10px] text-[#94A3B8]">Saved in Project Bin</span>
          </div>
        )}

        {/* Main Interactive Stage: Waveform & Refraction Canvas */}
        <div className="p-4 bg-[#05070D] flex flex-col gap-3">
          
          {/* OPTICAL PRISM REFRACTION VISUALIZER (USER SPECIFICATION) */}
          <div className="w-full">
            <PrismRefractionVisualizer
              selectedRay={selectedRay}
              rays={rays}
              dispersionSpread={prismDispersionSpread}
              isAuditioning={activeAuditioningRayId !== null}
              onSelectRay={playRay}
            />
          </div>

          {/* Waveform Viewport */}
          <div className="relative h-44 w-full bg-[#03050A] rounded-xl border border-[#1E293B] overflow-hidden shadow-inner flex flex-col justify-between">
            
            {/* Visual Prism Header Info */}
            <div className="absolute top-2 left-3 z-10 flex items-center gap-3 pointer-events-none">
              <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-cyan-300 bg-black/60 px-2 py-0.5 rounded border border-cyan-500/30 backdrop-blur-sm">
                <Compass size={12} className="text-[#FFD700]" />
                <span>{sourceName}</span>
              </div>
              <div className="text-[10px] font-mono text-[#94A3B8] bg-black/60 px-2 py-0.5 rounded border border-[#1E293B]">
                {splitMode === 'loop' 
                  ? `Loop Range: ${(loopEndSec - loopStartSec).toFixed(3)}s [${activeLoopPresetBars} Bar(s)]`
                  : `Refracted Rays: ${rays.length} Spectral Slices`
                }
              </div>
            </div>

            {/* Canvas */}
            <canvas
              ref={canvasRef}
              width={1000}
              height={176}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              className="w-full h-full cursor-crosshair"
            />

            {/* Bottom Transport inside Waveform */}
            <div className="absolute bottom-2 left-3 right-3 z-10 flex items-center justify-between pointer-events-auto">
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlayLoop}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md ${
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
                  className="px-2.5 py-1 rounded-lg bg-[#141C2E] border border-[#334155] text-[#94A3B8] hover:text-white text-xs font-mono font-bold"
                >
                  <Square size={13} />
                </button>
              </div>

              {/* Loop Presets (Mode === 'loop') */}
              {splitMode === 'loop' && (
                <div className="flex items-center gap-1 bg-black/75 p-1 rounded-lg border border-[#1E293B] backdrop-blur-sm">
                  <span className="text-[10px] text-[#64748B] font-mono px-1">BARS:</span>
                  {[0.5, 1, 2, 4, 8].map(b => (
                    <button
                      key={b}
                      onClick={() => handleSetLoopPreset(b)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                        activeLoopPresetBars === b
                          ? 'bg-[#FFD700] text-black shadow-[0_0_8px_#FFD700]'
                          : 'bg-[#101626] text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      {b >= 1 ? `${b}b` : '1/2b'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Middle Section: Refracted Rays Pad Trigger Matrix OR Loop Deck */}
        <div className="flex-1 px-5 py-3 overflow-y-auto bg-[#070A14] flex flex-col gap-3">
          
          {/* Hits Refraction Mode: Illuminated Drum / Ray Pad Matrix */}
          {splitMode === 'hits' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-white font-bold flex items-center gap-1.5">
                  <Wand2 size={14} className="text-[#00F0FF]" />
                  <span>REFRACTED RAY AUDITION PADS (CLICK OR PRESS KEYS TO TRIGGER)</span>
                </span>
                <span className="text-[11px] text-[#64748B]">
                  Shortcuts: <kbd className="px-1 py-0.5 rounded bg-[#10182E] text-cyan-300">1 - 8</kbd> / <kbd className="px-1 py-0.5 rounded bg-[#10182E] text-cyan-300">Q - I</kbd>
                </span>
              </div>

              {/* Grid of 8 to 16 Optical Pads */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
                {rays.slice(0, 16).map((ray) => {
                  const isAuditioning = ray.id === activeAuditioningRayId;
                  const isSelected = ray.id === selectedRayId;

                  return (
                    <div
                      key={ray.id}
                      onClick={() => playRay(ray)}
                      className={`relative p-2.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all duration-100 group select-none shadow-md ${
                        isAuditioning
                          ? 'scale-95 shadow-[0_0_20px_#FFFFFF] border-white'
                          : isSelected
                            ? 'border-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                            : 'border-[#1E293B] hover:border-white/50'
                      }`}
                      style={{
                        backgroundColor: isAuditioning ? ray.color : '#0A0E1A'
                      }}
                    >
                      {/* Top pad row: Shortcut & Wavelength */}
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span 
                          className="px-1.5 py-0.5 rounded font-black text-black"
                          style={{ backgroundColor: ray.color }}
                        >
                          {ray.keyShortcut || ray.index + 1}
                        </span>
                        <span className={`text-[9px] ${isAuditioning ? 'text-black font-bold' : 'text-[#64748B]'}`}>
                          {ray.wavelengthNm}nm
                        </span>
                      </div>

                      {/* Middle: Hit Name & Type */}
                      <div className="my-2 flex flex-col items-center justify-center">
                        <div 
                          className="w-3.5 h-3.5 rounded-full mb-1 shadow-sm"
                          style={{ backgroundColor: ray.color }}
                        />
                        <span className={`text-xs font-black uppercase tracking-wider ${isAuditioning ? 'text-black' : 'text-white'}`}>
                          {ray.hitType}
                        </span>
                        <span className={`text-[9px] font-mono ${isAuditioning ? 'text-black' : 'text-[#94A3B8]'}`}>
                          {(ray.durationSeconds * 1000).toFixed(0)}ms
                        </span>
                      </div>

                      {/* Bottom Pad Actions: Paint to cursor / Reverse */}
                      <div className="flex items-center justify-between pt-1 border-t border-white/10" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setRays(prev => prev.map(r => r.id === ray.id ? { ...r, reverse: !r.reverse } : r));
                          }}
                          className={`text-[9px] px-1 py-0.5 rounded font-mono font-bold transition-all ${
                            ray.reverse ? 'bg-[#FF2E63] text-white' : 'text-[#64748B] hover:text-white'
                          }`}
                          title="Reverse this ray slice"
                        >
                          REV
                        </button>

                        <button
                          onClick={() => handlePaintRayToPlayhead(ray)}
                          className="text-[9px] px-1 py-0.5 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500 hover:text-black font-mono font-bold transition-all"
                          title="Paint this single ray hit onto timeline track at cursor"
                        >
                          PAINT
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stutter / Photon Burst Deck */}
          {splitMode === 'stutter' && (
            <div className="p-4 rounded-xl bg-[#0B0E1B] border border-[#1E293B] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                  <Zap size={14} className="text-[#FFD700]" />
                  <span>PHOTON BURST REPEATER (HOLD TO FIRE GLITCH ROLLS)</span>
                </span>
                <span className="text-[11px] font-mono text-[#64748B]">Target Ray: {rays.find(r => r.id === selectedRayId)?.label || 'Ray 1'}</span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {(['1/16', '1/32', '1/64'] as const).map(rate => (
                  <button
                    key={rate}
                    onMouseDown={() => handlePhotonStutter(rate)}
                    className={`py-4 rounded-xl border font-mono font-black text-sm flex flex-col items-center justify-center gap-1 transition-all ${
                      activeStutterRate === rate
                        ? 'bg-white text-black scale-95 shadow-[0_0_25px_#FFFFFF]'
                        : 'bg-[#121828] border-purple-500/40 text-purple-300 hover:bg-purple-500 hover:text-black shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                    }`}
                  >
                    <Zap size={18} />
                    <span>{rate} PHOTON BURST</span>
                    <span className="text-[9px] opacity-70 font-normal">Rapid Optical Stream</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Optical Modifiers: Pitch, Stereo Dispersion Fan, Optical Filter */}
          <div className="p-3 rounded-xl bg-[#090C18] border border-[#172033] grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
            {/* Chromatic Refraction Pitch */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span>REFRACTION PITCH:</span>
                <span className="font-bold text-[#00F0FF]">{refractionPitch > 0 ? `+${refractionPitch}` : refractionPitch} st</span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                step="1"
                value={refractionPitch}
                onChange={(e) => setRefractionPitch(Number(e.target.value))}
                className="w-full accent-[#00F0FF]"
              />
            </div>

            {/* Stereo Dispersion Fan */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span>PRISM DISPERSION (PAN FAN):</span>
                <span className="font-bold text-[#FFD700]">{Math.round(prismDispersionSpread * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={prismDispersionSpread}
                onChange={(e) => setPrismDispersionSpread(Number(e.target.value))}
                className="w-full accent-[#FFD700]"
              />
            </div>

            {/* Optical Filter Cutoff */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span>OPTICAL FILTER CUTOFF:</span>
                <span className="font-bold text-[#10B981]">{opticalFilterCutoff >= 1000 ? `${(opticalFilterCutoff / 1000).toFixed(1)} kHz` : `${opticalFilterCutoff} Hz`}</span>
              </div>
              <input
                type="range"
                min="200"
                max="20000"
                step="100"
                value={opticalFilterCutoff}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setOpticalFilterCutoff(val);
                  setOpticalFilterType(val < 18000 ? 'lowpass' : 'allpass');
                }}
                className="w-full accent-[#10B981]"
              />
            </div>

            {/* Master Beam Gain */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span>BEAM INTENSITY (GAIN):</span>
                <span className="font-bold text-white">{(masterVolume * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.5"
                step="0.05"
                value={masterVolume}
                onChange={(e) => setMasterVolume(Number(e.target.value))}
                className="w-full accent-white"
              />
            </div>
          </div>
        </div>

        {/* Footer: Timeline Multitrack Injection & Prism Loop Chopper Export */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#090D1A] via-[#0E1528] to-[#080B14] border-t border-[#00F0FF]/30 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
          {/* Target Track & Cursor Position Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[#64748B] font-bold">TARGET TRACK:</span>
              <select
                value={targetTimelineTrackId}
                onChange={(e) => setTargetTimelineTrackId(e.target.value)}
                className="px-2.5 py-1 rounded bg-[#0D1424] border border-cyan-500/30 text-cyan-300 font-bold"
              >
                <option value="">+ Create New Refracted Track</option>
                {tracks.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[#64748B] font-bold">START AT BAR:</span>
              <input
                type="number"
                min="0"
                max="16"
                step="0.25"
                value={targetStartBar}
                onChange={(e) => setTargetStartBar(Math.max(0, Number(e.target.value)))}
                className="w-16 px-2 py-1 rounded bg-[#0D1424] border border-[#334155] text-white text-center font-bold"
              />
            </div>
          </div>

          {/* Action Buttons: Inject into Timeline / Export */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchExportToBin}
              disabled={!audioBuffer || rays.length === 0}
              className="px-3 py-1.5 rounded-lg bg-[#0E1729] hover:bg-[#162542] border border-[#00F0FF]/50 text-[#00F0FF] hover:text-white transition-all flex items-center gap-1.5 font-bold disabled:opacity-50"
              title="Batch export all slices to Project Bin"
            >
              <Layers size={14} />
              <span>BATCH TO BIN</span>
            </button>

            <button
              onClick={handleExportWav}
              className="px-3 py-1.5 rounded-lg bg-[#141B2D] border border-[#334155] text-white hover:border-[#FFD700] hover:text-[#FFD700] transition-all flex items-center gap-1.5"
              title="Download slice or loop as WAV file"
            >
              <Download size={14} />
              <span>EXPORT WAV</span>
            </button>

            {onOpenBasicPitch && (
              <button
                onClick={() => {
                  onClose();
                  const guessedCategory: 'vocals' | 'bass' | 'drums' | 'instruments' =
                    sourceName.toLowerCase().includes('drum') || sourceName.toLowerCase().includes('break') || activeDivision === 'transient'
                      ? 'drums'
                      : sourceName.toLowerCase().includes('bass')
                        ? 'bass'
                        : sourceName.toLowerCase().includes('vocal')
                          ? 'vocals'
                          : 'instruments';
                  onOpenBasicPitch(guessedCategory, sourceName, audioBuffer || undefined);
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/70 text-emerald-300 hover:text-white transition-all flex items-center gap-1.5 font-bold shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                title="Transcribe this audio slice/loop to MIDI using Spotify Basic Pitch & route to VSTi"
              >
                <Keyboard size={14} className="text-emerald-400" />
                <span>TO BASIC PITCH MIDI</span>
              </button>
            )}

            {splitMode === 'loop' ? (
              <button
                onClick={handleInjectLoop}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#00F0FF] to-[#10B981] text-black font-black hover:brightness-110 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(0,240,255,0.4)]"
              >
                <Repeat size={15} />
                <span>INJECT LOOP TO TIMELINE</span>
              </button>
            ) : (
              <button
                onClick={handleInjectAllSlices}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#FF2E63] via-[#FF7B00] to-[#FFD700] text-black font-black hover:brightness-110 transition-all flex items-center gap-2 shadow-[0_0_18px_rgba(255,46,99,0.4)]"
              >
                <Split size={15} />
                <span>REFRACT SLICES TO TRACK</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
