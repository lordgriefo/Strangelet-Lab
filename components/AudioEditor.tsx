// Strangelet Lab - Laser Waveform, Loop Crossfade & Audio Editor
// Features real PCM AudioBuffer editing, Loop Boundary Crossfading, Cut/Copy/Paste/Crop/Silence,
// Fade In/Out, Gain, Normalize, Reverse, Polarity Invert, DC Offset Removal, Varispeed,
// Zoom/Snap/Zero-Crossing Selection, WAV Export, and Automatic Silence Trimming.

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  Scissors, Volume2, VolumeX, ArrowLeftRight, Play, Pause, RotateCcw,
  Repeat, Sparkles, CheckCircle2, ChevronLeft, Undo2, Redo2, Save,
  Sliders, Activity, Info, Layers, Copy, ClipboardPaste, Trash2,
  Crop, ZoomIn, ZoomOut, Download, Magnet, RefreshCw, Waves, Gauge,
  Maximize2, Minimize2, Pin, Lock, Unlock, Clock, Plus, Upload
} from 'lucide-react';
import { Clip, Track, ChronoPin } from '../types';
import { snapToGrid } from '../lib/audioUtils';
import { analyzeAudioBuffer } from '../lib/chronoMapEngine';
import { audioService } from '../services/audioService';
import {
  LoopCrossfadeCurve,
  LoopCrossfadeStyle,
  extractWaveformPeaks,
  createSynthesizedBufferFromPeaks,
  applyLoopCrossfadeToBuffer,
  applyLoopCrossfadeToPeaks,
  applyFadeInToBuffer,
  applyFadeOutToBuffer,
  applyGainDbToBuffer,
  normalizeBuffer,
  reverseBuffer,
  invertPolarityBuffer,
  removeDcOffsetBuffer,
  silenceBufferRegion,
  sliceAudioBuffer,
  deleteAudioBufferRegion,
  insertAudioBufferAt,
  concatAudioBuffers,
  varispeedBuffer,
  timeStretchBufferPreservePitch,
  warpBufferWithChronoPins,
  audioBufferToWavBlob,
  evaluateCrossfadeWeights
} from '../lib/audioDspEditor';

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

interface EditorSnapshot {
  peaks: number[];
  buffer: AudioBuffer | null;
  durationBars: number;
  originalDurationBars?: number;
  timeStretchRatio?: number;
  timeStretchEnabled?: boolean;
  preservePitch?: boolean;
  chronoPins?: ChronoPin[];
  chronoLatchEnabled?: boolean;
  fadeInBars?: number;
  fadeOutBars?: number;
  loopCrossfadeMs?: number;
  loopCrossfadeCurve?: LoopCrossfadeCurve;
  label: string;
}

const TARGET_PEAK_BARS = 360;

function generateDefaultOrganicPeaks(): number[] {
  const totalSamples = 320;
  const samples: number[] = [];
  const leadSilenceSamples = Math.floor(totalSamples * 0.08);
  const tailSilenceSamples = Math.floor(totalSamples * 0.1);
  const activeStart = leadSilenceSamples;
  const activeEnd = totalSamples - tailSilenceSamples;

  for (let i = 0; i < totalSamples; i++) {
    if (i < activeStart) {
      const noise = (Math.sin(i * 1.7) * 0.5) * 0.015;
      samples.push(Math.max(0.002, Math.abs(noise)));
    } else if (i > activeEnd) {
      const tailDecay = Math.exp(-(i - activeEnd) / 14) * 0.025;
      const noise = (Math.cos(i * 1.9) * 0.5) * 0.012;
      samples.push(Math.max(0.002, Math.abs(tailDecay + noise)));
    } else {
      const relPos = (i - activeStart) / (activeEnd - activeStart);
      const envelope = Math.sin(relPos * Math.PI) * 0.72 + 0.28;
      const transient = i % 24 < 3 ? 0.94 : 0.48;
      const wave =
        Math.sin(i * 0.22) * 0.42 +
        Math.cos(i * 0.55) * 0.34 +
        Math.abs(Math.sin(i * 0.91)) * 0.24;
      const val = Math.min(1.0, Math.max(0.04, Math.abs(wave) * envelope * transient));
      samples.push(Number(val.toFixed(4)));
    }
  }
  return samples;
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

  const [selectedClip, setSelectedClip] = useState<Clip | null>(() => {
    if (initialClip) return initialClip;
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

  useEffect(() => {
    if (initialClip) {
      setSelectedClip(initialClip);
      setOriginalDurationBars(initialClip.originalDurationBars ?? initialClip.durationBars ?? 4);
      setTimeStretchRatio(initialClip.timeStretchRatio ?? 1.0);
      setTimeStretchEnabled(initialClip.timeStretchEnabled ?? false);
      setPreservePitch(initialClip.preservePitch ?? true);
      if (initialClip.chronoPins) {
        setChronoPins(initialClip.chronoPins);
      }
    }
  }, [initialClip]);

  const parentTrack = useMemo(() => {
    if (!selectedClip) return null;
    return tracks.find(t => t.clips?.some(c => c.id === selectedClip.id)) || null;
  }, [tracks, selectedClip]);

  const currentDurationBars = selectedClip?.durationBars || 4;
  const clipDurationSeconds = useMemo(() => {
    return Number(((currentDurationBars * 4 * 60) / tempo).toFixed(3));
  }, [currentDurationBars, tempo]);

  const initialWaveform = useMemo<number[]>(() => {
    if (selectedClip?.waveformSnippet && selectedClip.waveformSnippet.length >= 24) {
      return [...selectedClip.waveformSnippet];
    }
    return generateDefaultOrganicPeaks();
  }, [selectedClip?.id]);

  // Core editable waveform + PCM AudioBuffer state
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>(initialWaveform);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [originalBackup, setOriginalBackup] = useState<EditorSnapshot>({
    peaks: initialWaveform,
    buffer: null,
    durationBars: currentDurationBars,
    originalDurationBars: selectedClip?.originalDurationBars ?? currentDurationBars,
    timeStretchRatio: selectedClip?.timeStretchRatio ?? 1.0,
    timeStretchEnabled: selectedClip?.timeStretchEnabled ?? false,
    preservePitch: selectedClip?.preservePitch ?? true,
    chronoPins: selectedClip?.chronoPins ?? [],
    chronoLatchEnabled: selectedClip?.chronoLatchEnabled ?? false,
    fadeInBars: selectedClip?.fadeInBars,
    fadeOutBars: selectedClip?.fadeOutBars,
    loopCrossfadeMs: selectedClip?.loopCrossfadeMs,
    loopCrossfadeCurve: selectedClip?.loopCrossfadeCurve,
    label: 'Original'
  });

  // Multi-step Undo/Redo + Internal Clipboard
  const [undoStack, setUndoStack] = useState<EditorSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<EditorSnapshot[]>([]);
  const [clipboardBuffer, setClipboardBuffer] = useState<AudioBuffer | null>(null);
  const [clipboardPeaks, setClipboardPeaks] = useState<number[] | null>(null);
  const [hasUncommittedEdits, setHasUncommittedEdits] = useState<boolean>(false);
  const [isTrimmed, setIsTrimmed] = useState<boolean>(false);

  // Silence Detection Parameters
  const [sensitivityDb, setSensitivityDb] = useState<number>(-36);
  const [safetyPaddingMs, setSafetyPaddingMs] = useState<number>(10);
  const [trimMode, setTrimMode] = useState<'both' | 'start' | 'end'>('both');
  const [showSilenceOverlays, setShowSilenceOverlays] = useState<boolean>(false);
  const [showThresholdLine, setShowThresholdLine] = useState<boolean>(false);

  // Loop Crossfade Studio State
  const [loopCrossfadeMs, setLoopCrossfadeMs] = useState<number>(
    () => selectedClip?.loopCrossfadeMs ?? 45
  );
  const [loopCrossfadeCurve, setLoopCrossfadeCurve] = useState<LoopCrossfadeCurve>(
    () => selectedClip?.loopCrossfadeCurve ?? 'equal_power'
  );
  const [loopCrossfadeStyle, setLoopCrossfadeStyle] = useState<LoopCrossfadeStyle>('overlap_loop');
  const [preserveLoopTempo, setPreserveLoopTempo] = useState<boolean>(true);
  const [showCrossfadeOverlay, setShowCrossfadeOverlay] = useState<boolean>(true);

  // Non-Destructive Time Stretch & ChronoPins State
  const [originalDurationBars, setOriginalDurationBars] = useState<number>(
    () => selectedClip?.originalDurationBars ?? selectedClip?.durationBars ?? 4
  );
  const [timeStretchRatio, setTimeStretchRatio] = useState<number>(
    () => selectedClip?.timeStretchRatio ?? 1.0
  );
  const [timeStretchEnabled, setTimeStretchEnabled] = useState<boolean>(
    () => selectedClip?.timeStretchEnabled ?? false
  );
  const [preservePitch, setPreservePitch] = useState<boolean>(
    () => selectedClip?.preservePitch ?? true
  );
  const [chronoPins, setChronoPins] = useState<ChronoPin[]>(
    () => selectedClip?.chronoPins ?? []
  );
  const [selectedChronoPinId, setSelectedChronoPinId] = useState<string | null>(null);
  const [showChronoPinsOverlay, setShowChronoPinsOverlay] = useState<boolean>(true);
  const [draggingChronoPinId, setDraggingChronoPinId] = useState<string | null>(null);

  // Basic Editing / Gain / Zoom / Snap State
  const [gainAdjustDb, setGainAdjustDb] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [scrollOffset, setScrollOffset] = useState<number>(0); // 0 to 1 - 1/zoomLevel
  const [snapSelectionEnabled, setSnapSelectionEnabled] = useState<boolean>(false);
  const [zeroCrossingSnap, setZeroCrossingSnap] = useState<boolean>(true);
  const [waveformExpanded, setWaveformExpanded] = useState<boolean>(false);
  const [activeDockPanel, setActiveDockPanel] = useState<'all' | 'stretch' | 'chrono' | 'crossfade' | 'silence'>('all');

  // Region and Playhead State
  const [region, setRegion] = useState<{ start: number; end: number } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPreviewingSeam, setIsPreviewingSeam] = useState<boolean>(false);
  const [loopEnabled, setLoopEnabled] = useState<boolean>(true);
  const [markers, setMarkers] = useState<number[]>([0.25, 0.5, 0.75]);
  const [playheadX, setPlayheadX] = useState<number>(0);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const noticeTimerRef = useRef<number | null>(null);

  const showNotice = useCallback((msg: string, ms: number = 3500) => {
    setStatusNotice(msg);
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setStatusNotice(null);
      noticeTimerRef.current = null;
    }, ms);
  }, []);

  const ensureAudioContext = useCallback((): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  // Load real AudioBuffer from audioService or clip.audioUrl, falling back to synthesized musical PCM from peaks
  useEffect(() => {
    let cancelled = false;
    const ctx = ensureAudioContext();
    const basePeaks =
      selectedClip?.waveformSnippet && selectedClip.waveformSnippet.length >= 24
        ? [...selectedClip.waveformSnippet]
        : generateDefaultOrganicPeaks();

    setWaveformPeaks(basePeaks);
    setUndoStack([]);
    setRedoStack([]);
    setHasUncommittedEdits(false);
    setIsTrimmed(false);
    setZoomLevel(1);
    setScrollOffset(0);
    setRegion(null);
    setPlayheadX(0);
    setLoopCrossfadeMs(selectedClip?.loopCrossfadeMs ?? 45);
    setLoopCrossfadeCurve(selectedClip?.loopCrossfadeCurve ?? 'equal_power');
    setOriginalDurationBars(selectedClip?.originalDurationBars ?? selectedClip?.durationBars ?? 4);
    setTimeStretchRatio(selectedClip?.timeStretchRatio ?? 1.0);
    setTimeStretchEnabled(selectedClip?.timeStretchEnabled ?? false);
    setPreservePitch(selectedClip?.preservePitch ?? true);
    setChronoPins(selectedClip?.chronoPins ?? []);
    setSelectedChronoPinId(selectedClip?.chronoPins?.[0]?.id ?? null);

    const loadBuffer = async () => {
      if (!ctx) return;

      let resolvedBuffer: AudioBuffer | null = null;
      let pristineOriginalBuffer: AudioBuffer | null = null;
      if (parentTrack?.id) {
        const cached = audioService.getTrackAudioBuffer(parentTrack.id);
        const origCached = audioService.getOriginalTrackAudioBuffer(parentTrack.id);
        if (cached) {
          resolvedBuffer = cached;
        }
        if (origCached) {
          pristineOriginalBuffer = origCached;
        }
      }

      if (!resolvedBuffer && selectedClip?.audioUrl) {
        try {
          const resp = await fetch(selectedClip.audioUrl);
          if (resp.ok) {
            const arr = await resp.arrayBuffer();
            resolvedBuffer = await ctx.decodeAudioData(arr);
          }
        } catch {
          // Fallback to synthesized buffer from peaks
        }
      }

      if (!resolvedBuffer) {
        const durSec = ((selectedClip?.durationBars || 4) * 4 * 60) / tempo;
        resolvedBuffer = createSynthesizedBufferFromPeaks(ctx, basePeaks, durSec);
      }

      if (cancelled) return;
      const syncedPeaks =
        selectedClip?.waveformSnippet && selectedClip.waveformSnippet.length >= 24
          ? [...selectedClip.waveformSnippet]
          : extractWaveformPeaks(resolvedBuffer, TARGET_PEAK_BARS);

      const backupBuffer = pristineOriginalBuffer || resolvedBuffer;
      const backupPeaks = extractWaveformPeaks(backupBuffer, TARGET_PEAK_BARS);

      setAudioBuffer(resolvedBuffer);
      setWaveformPeaks(syncedPeaks);
      setOriginalBackup({
        peaks: backupPeaks.length > 0 ? backupPeaks : syncedPeaks,
        buffer: backupBuffer,
        durationBars: selectedClip?.originalDurationBars ?? selectedClip?.durationBars ?? 4,
        originalDurationBars: selectedClip?.originalDurationBars ?? selectedClip?.durationBars ?? 4,
        timeStretchRatio: 1.0,
        timeStretchEnabled: selectedClip?.timeStretchEnabled ?? false,
        preservePitch: selectedClip?.preservePitch ?? true,
        chronoPins: selectedClip?.chronoPins ?? [],
        chronoLatchEnabled: selectedClip?.chronoLatchEnabled ?? false,
        fadeInBars: selectedClip?.fadeInBars,
        fadeOutBars: selectedClip?.fadeOutBars,
        loopCrossfadeMs: selectedClip?.loopCrossfadeMs,
        loopCrossfadeCurve: selectedClip?.loopCrossfadeCurve,
        label: 'Original'
      });
    };

    loadBuffer();

    return () => {
      cancelled = true;
    };
  }, [selectedClip?.id]);

  // Helper to obtain guaranteed AudioBuffer + AudioContext before any edit
  const getWorkingBuffer = useCallback((): { ctx: AudioContext; buffer: AudioBuffer } | null => {
    const ctx = ensureAudioContext();
    if (!ctx) return null;
    if (audioBuffer) return { ctx, buffer: audioBuffer };
    const synthesized = createSynthesizedBufferFromPeaks(ctx, waveformPeaks, clipDurationSeconds);
    return { ctx, buffer: synthesized };
  }, [audioBuffer, ensureAudioContext, waveformPeaks, clipDurationSeconds]);

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    setIsPreviewingSeam(false);
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.stop();
        activeSourceRef.current.disconnect();
      } catch {
        // already stopped
      }
      activeSourceRef.current = null;
    }
  }, []);

  // Push current state to Undo stack and apply new peaks/buffer
  const commitEditorMutation = useCallback(
    (
      label: string,
      nextBuffer: AudioBuffer,
      nextPeaks?: number[],
      extraMeta?: Partial<
        Pick<
          Clip,
          | 'durationBars'
          | 'originalDurationBars'
          | 'timeStretchRatio'
          | 'timeStretchEnabled'
          | 'preservePitch'
          | 'chronoPins'
          | 'chronoLatchEnabled'
          | 'fadeInBars'
          | 'fadeOutBars'
          | 'loopCrossfadeMs'
          | 'loopCrossfadeCurve'
        >
      >
    ) => {
      const snapshot: EditorSnapshot = {
        peaks: waveformPeaks,
        buffer: audioBuffer,
        durationBars: selectedClip?.durationBars || 4,
        originalDurationBars,
        timeStretchRatio,
        timeStretchEnabled,
        preservePitch,
        chronoPins,
        chronoLatchEnabled: selectedClip?.chronoLatchEnabled,
        fadeInBars: selectedClip?.fadeInBars,
        fadeOutBars: selectedClip?.fadeOutBars,
        loopCrossfadeMs: selectedClip?.loopCrossfadeMs,
        loopCrossfadeCurve: selectedClip?.loopCrossfadeCurve,
        label
      };
      setUndoStack(prev => [...prev.slice(-24), snapshot]);
      setRedoStack([]);

      const computedPeaks = nextPeaks || extractWaveformPeaks(nextBuffer, TARGET_PEAK_BARS);
      setAudioBuffer(nextBuffer);
      setWaveformPeaks(computedPeaks);
      setHasUncommittedEdits(true);

      if (extraMeta?.originalDurationBars !== undefined) setOriginalDurationBars(extraMeta.originalDurationBars);
      if (extraMeta?.timeStretchRatio !== undefined) setTimeStretchRatio(extraMeta.timeStretchRatio);
      if (extraMeta?.timeStretchEnabled !== undefined) setTimeStretchEnabled(extraMeta.timeStretchEnabled);
      if (extraMeta?.preservePitch !== undefined) setPreservePitch(extraMeta.preservePitch);
      if (extraMeta?.chronoPins !== undefined) setChronoPins(extraMeta.chronoPins);

      if (extraMeta && selectedClip) {
        setSelectedClip(prev => (prev ? { ...prev, ...extraMeta, waveformSnippet: computedPeaks } : prev));
      } else if (selectedClip) {
        setSelectedClip(prev => (prev ? { ...prev, waveformSnippet: computedPeaks } : prev));
      }
      showNotice(`✨ ${label}`);
    },
    [
      audioBuffer,
      chronoPins,
      originalDurationBars,
      preservePitch,
      selectedClip,
      showNotice,
      timeStretchEnabled,
      timeStretchRatio,
      waveformPeaks
    ]
  );

  // Undo & Redo
  const handleEditorUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    stopPlayback();
    const prevSnap = undoStack[undoStack.length - 1];
    const currentSnap: EditorSnapshot = {
      peaks: waveformPeaks,
      buffer: audioBuffer,
      durationBars: selectedClip?.durationBars || 4,
      originalDurationBars,
      timeStretchRatio,
      timeStretchEnabled,
      preservePitch,
      chronoPins,
      chronoLatchEnabled: selectedClip?.chronoLatchEnabled,
      fadeInBars: selectedClip?.fadeInBars,
      fadeOutBars: selectedClip?.fadeOutBars,
      loopCrossfadeMs: selectedClip?.loopCrossfadeMs,
      loopCrossfadeCurve: selectedClip?.loopCrossfadeCurve,
      label: prevSnap.label
    };
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, currentSnap]);
    setWaveformPeaks(prevSnap.peaks);
    setAudioBuffer(prevSnap.buffer);
    if (prevSnap.originalDurationBars !== undefined) setOriginalDurationBars(prevSnap.originalDurationBars);
    if (prevSnap.timeStretchRatio !== undefined) setTimeStretchRatio(prevSnap.timeStretchRatio);
    if (prevSnap.timeStretchEnabled !== undefined) setTimeStretchEnabled(prevSnap.timeStretchEnabled);
    if (prevSnap.preservePitch !== undefined) setPreservePitch(prevSnap.preservePitch);
    if (prevSnap.chronoPins !== undefined) setChronoPins(prevSnap.chronoPins);

    if (selectedClip) {
      setSelectedClip({
        ...selectedClip,
        durationBars: prevSnap.durationBars,
        originalDurationBars: prevSnap.originalDurationBars ?? selectedClip.originalDurationBars,
        timeStretchRatio: prevSnap.timeStretchRatio ?? selectedClip.timeStretchRatio,
        timeStretchEnabled: prevSnap.timeStretchEnabled ?? selectedClip.timeStretchEnabled,
        preservePitch: prevSnap.preservePitch ?? selectedClip.preservePitch,
        chronoPins: prevSnap.chronoPins ?? selectedClip.chronoPins,
        chronoLatchEnabled: prevSnap.chronoLatchEnabled ?? selectedClip.chronoLatchEnabled,
        fadeInBars: prevSnap.fadeInBars,
        fadeOutBars: prevSnap.fadeOutBars,
        loopCrossfadeMs: prevSnap.loopCrossfadeMs,
        loopCrossfadeCurve: prevSnap.loopCrossfadeCurve,
        waveformSnippet: prevSnap.peaks
      });
    }
    setHasUncommittedEdits(true);
    showNotice(`↩️ Undid: ${prevSnap.label}`);
  }, [
    audioBuffer,
    chronoPins,
    originalDurationBars,
    preservePitch,
    selectedClip,
    showNotice,
    stopPlayback,
    timeStretchEnabled,
    timeStretchRatio,
    undoStack,
    waveformPeaks
  ]);

  const handleEditorRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    stopPlayback();
    const nextSnap = redoStack[redoStack.length - 1];
    const currentSnap: EditorSnapshot = {
      peaks: waveformPeaks,
      buffer: audioBuffer,
      durationBars: selectedClip?.durationBars || 4,
      originalDurationBars,
      timeStretchRatio,
      timeStretchEnabled,
      preservePitch,
      chronoPins,
      chronoLatchEnabled: selectedClip?.chronoLatchEnabled,
      fadeInBars: selectedClip?.fadeInBars,
      fadeOutBars: selectedClip?.fadeOutBars,
      loopCrossfadeMs: selectedClip?.loopCrossfadeMs,
      loopCrossfadeCurve: selectedClip?.loopCrossfadeCurve,
      label: nextSnap.label
    };
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, currentSnap]);
    setWaveformPeaks(nextSnap.peaks);
    setAudioBuffer(nextSnap.buffer);
    if (nextSnap.originalDurationBars !== undefined) setOriginalDurationBars(nextSnap.originalDurationBars);
    if (nextSnap.timeStretchRatio !== undefined) setTimeStretchRatio(nextSnap.timeStretchRatio);
    if (nextSnap.timeStretchEnabled !== undefined) setTimeStretchEnabled(nextSnap.timeStretchEnabled);
    if (nextSnap.preservePitch !== undefined) setPreservePitch(nextSnap.preservePitch);
    if (nextSnap.chronoPins !== undefined) setChronoPins(nextSnap.chronoPins);

    if (selectedClip) {
      setSelectedClip({
        ...selectedClip,
        durationBars: nextSnap.durationBars,
        originalDurationBars: nextSnap.originalDurationBars ?? selectedClip.originalDurationBars,
        timeStretchRatio: nextSnap.timeStretchRatio ?? selectedClip.timeStretchRatio,
        timeStretchEnabled: nextSnap.timeStretchEnabled ?? selectedClip.timeStretchEnabled,
        preservePitch: nextSnap.preservePitch ?? selectedClip.preservePitch,
        chronoPins: nextSnap.chronoPins ?? selectedClip.chronoPins,
        chronoLatchEnabled: nextSnap.chronoLatchEnabled ?? selectedClip.chronoLatchEnabled,
        fadeInBars: nextSnap.fadeInBars,
        fadeOutBars: nextSnap.fadeOutBars,
        loopCrossfadeMs: nextSnap.loopCrossfadeMs,
        loopCrossfadeCurve: nextSnap.loopCrossfadeCurve,
        waveformSnippet: nextSnap.peaks
      });
    }
    setHasUncommittedEdits(true);
    showNotice(`↪️ Redid: ${nextSnap.label}`);
  }, [
    audioBuffer,
    chronoPins,
    originalDurationBars,
    preservePitch,
    redoStack,
    selectedClip,
    showNotice,
    stopPlayback,
    timeStretchEnabled,
    timeStretchRatio,
    waveformPeaks
  ]);

  // Commit edited clip + AudioBuffer back to Mixer & Timeline
  const handleCommitToTimeline = useCallback(() => {
    if (!selectedClip) return;
    const isStretchedNonDestructively = Math.abs(timeStretchRatio - 1.0) > 0.005;
    const updatedClip: Clip = {
      ...selectedClip,
      originalDurationBars,
      timeStretchRatio,
      timeStretchEnabled,
      preservePitch,
      chronoPins,
      waveformSnippet: waveformPeaks
    };
    if (parentTrack?.id && audioBuffer) {
      audioService.setTrackAudioBuffer(parentTrack.id, audioBuffer, isStretchedNonDestructively);
    }
    if (onUpdateClip) {
      onUpdateClip(updatedClip);
    }
    setSelectedClip(updatedClip);
    setHasUncommittedEdits(false);
    showNotice('✅ Saved edited waveform, Time Stretch & ChronoPins to timeline!');
  }, [
    audioBuffer,
    chronoPins,
    onUpdateClip,
    originalDurationBars,
    parentTrack?.id,
    preservePitch,
    selectedClip,
    showNotice,
    timeStretchEnabled,
    timeStretchRatio,
    waveformPeaks
  ]);

  // Active normalized selection bounds (returns null if no explicit sub-selection)
  const activeSelectionRange = useMemo(() => {
    if (!region || Math.abs(region.end - region.start) < 0.004) return null;
    return {
      start: Math.min(region.start, region.end),
      end: Math.max(region.start, region.end)
    };
  }, [region]);

  // Basic Editing Handlers (all real PCM + Peak operations)
  const handleFadeIn = useCallback(() => {
    const working = getWorkingBuffer();
    if (!working) return;
    const range = activeSelectionRange || { start: 0, end: Math.min(0.35, Math.max(0.08, loopCrossfadeMs / Math.max(100, clipDurationSeconds * 1000))) };
    const nextBuf = applyFadeInToBuffer(working.ctx, working.buffer, loopCrossfadeCurve, range);
    const fadeBars = Number(((range.end - range.start) * currentDurationBars).toFixed(4));
    commitEditorMutation(
      `Fade In (${(range.end - range.start) * clipDurationSeconds < 1 ? `${Math.round((range.end - range.start) * clipDurationSeconds * 1000)}ms` : `${((range.end - range.start) * clipDurationSeconds).toFixed(2)}s`})`,
      nextBuf,
      undefined,
      { fadeInBars: fadeBars }
    );
  }, [activeSelectionRange, clipDurationSeconds, commitEditorMutation, currentDurationBars, getWorkingBuffer, loopCrossfadeCurve, loopCrossfadeMs]);

  const handleFadeOut = useCallback(() => {
    const working = getWorkingBuffer();
    if (!working) return;
    const span = Math.min(0.35, Math.max(0.08, loopCrossfadeMs / Math.max(100, clipDurationSeconds * 1000)));
    const range = activeSelectionRange || { start: 1 - span, end: 1 };
    const nextBuf = applyFadeOutToBuffer(working.ctx, working.buffer, loopCrossfadeCurve, range);
    const fadeBars = Number(((range.end - range.start) * currentDurationBars).toFixed(4));
    commitEditorMutation(
      `Fade Out (${(range.end - range.start) * clipDurationSeconds < 1 ? `${Math.round((range.end - range.start) * clipDurationSeconds * 1000)}ms` : `${((range.end - range.start) * clipDurationSeconds).toFixed(2)}s`})`,
      nextBuf,
      undefined,
      { fadeOutBars: fadeBars }
    );
  }, [activeSelectionRange, clipDurationSeconds, commitEditorMutation, currentDurationBars, getWorkingBuffer, loopCrossfadeCurve, loopCrossfadeMs]);

  const handleNormalize = useCallback(() => {
    const working = getWorkingBuffer();
    if (!working) return;
    const nextBuf = normalizeBuffer(working.ctx, working.buffer, -0.3, activeSelectionRange);
    commitEditorMutation(
      activeSelectionRange ? 'Normalized Selection (-0.3 dB)' : 'Normalized Full Clip (-0.3 dB)',
      nextBuf
    );
  }, [activeSelectionRange, commitEditorMutation, getWorkingBuffer]);

  const handleReverse = useCallback(() => {
    const working = getWorkingBuffer();
    if (!working) return;
    const nextBuf = reverseBuffer(working.ctx, working.buffer, activeSelectionRange);
    commitEditorMutation(
      activeSelectionRange ? 'Reversed Selected Region' : 'Reversed Full Clip',
      nextBuf
    );
  }, [activeSelectionRange, commitEditorMutation, getWorkingBuffer]);

  const handleInvertPolarity = useCallback(() => {
    const working = getWorkingBuffer();
    if (!working) return;
    const nextBuf = invertPolarityBuffer(working.ctx, working.buffer, activeSelectionRange);
    commitEditorMutation('Inverted Phase Polarity (Ø)', nextBuf);
  }, [activeSelectionRange, commitEditorMutation, getWorkingBuffer]);

  const handleRemoveDcOffset = useCallback(() => {
    const working = getWorkingBuffer();
    if (!working) return;
    const nextBuf = removeDcOffsetBuffer(working.ctx, working.buffer, activeSelectionRange);
    commitEditorMutation('Removed DC Offset (0V Centered)', nextBuf);
  }, [activeSelectionRange, commitEditorMutation, getWorkingBuffer]);

  const handleApplyGain = useCallback((dbOverride?: number) => {
    const db = dbOverride !== undefined ? dbOverride : gainAdjustDb;
    if (Math.abs(db) < 0.05) return;
    const working = getWorkingBuffer();
    if (!working) return;
    const nextBuf = applyGainDbToBuffer(working.ctx, working.buffer, db, activeSelectionRange);
    commitEditorMutation(
      `Gain ${db > 0 ? '+' : ''}${db.toFixed(1)} dB${activeSelectionRange ? ' (Selection)' : ''}`,
      nextBuf
    );
    if (dbOverride === undefined) setGainAdjustDb(0);
  }, [activeSelectionRange, commitEditorMutation, gainAdjustDb, getWorkingBuffer]);

  const handleSilenceRegion = useCallback(() => {
    if (!activeSelectionRange) {
      showNotice('Select a region on the waveform first to mute/silence it.');
      return;
    }
    const working = getWorkingBuffer();
    if (!working) return;
    const nextBuf = silenceBufferRegion(working.ctx, working.buffer, activeSelectionRange);
    commitEditorMutation('Silenced Selected Region', nextBuf);
  }, [activeSelectionRange, commitEditorMutation, getWorkingBuffer, showNotice]);

  const handleCopySelection = useCallback(() => {
    const working = getWorkingBuffer();
    if (!working) return;
    const range = activeSelectionRange || { start: 0, end: 1 };
    const sliced = sliceAudioBuffer(working.ctx, working.buffer, range);
    const startIdx = Math.floor(range.start * waveformPeaks.length);
    const endIdx = Math.max(startIdx + 1, Math.ceil(range.end * waveformPeaks.length));
    setClipboardBuffer(sliced);
    setClipboardPeaks(waveformPeaks.slice(startIdx, endIdx));
    showNotice(`📋 Copied ${sliced.duration.toFixed(2)}s to editor clipboard`);
  }, [activeSelectionRange, getWorkingBuffer, showNotice, waveformPeaks]);

  const handleCutSelection = useCallback(() => {
    if (!activeSelectionRange) {
      showNotice('Select a region on the waveform first to cut.');
      return;
    }
    const working = getWorkingBuffer();
    if (!working) return;
    stopPlayback();
    const sliced = sliceAudioBuffer(working.ctx, working.buffer, activeSelectionRange);
    const startIdx = Math.floor(activeSelectionRange.start * waveformPeaks.length);
    const endIdx = Math.max(startIdx + 1, Math.ceil(activeSelectionRange.end * waveformPeaks.length));
    setClipboardBuffer(sliced);
    setClipboardPeaks(waveformPeaks.slice(startIdx, endIdx));

    const remainingBuf = deleteAudioBufferRegion(working.ctx, working.buffer, activeSelectionRange);
    const cutFraction = activeSelectionRange.end - activeSelectionRange.start;
    const nextDurationBars = Math.max(0.125, Number((currentDurationBars * (1 - cutFraction)).toFixed(4)));
    setRegion(null);
    setPlayheadX(activeSelectionRange.start);
    commitEditorMutation(
      `Cut ${(sliced.duration).toFixed(2)}s Region`,
      remainingBuf,
      undefined,
      { durationBars: nextDurationBars }
    );
  }, [activeSelectionRange, commitEditorMutation, currentDurationBars, getWorkingBuffer, showNotice, stopPlayback, waveformPeaks]);

  const handleDeleteSelection = useCallback(() => {
    if (!activeSelectionRange) {
      showNotice('Select a region on the waveform first to delete.');
      return;
    }
    const working = getWorkingBuffer();
    if (!working) return;
    stopPlayback();
    const remainingBuf = deleteAudioBufferRegion(working.ctx, working.buffer, activeSelectionRange);
    const cutFraction = activeSelectionRange.end - activeSelectionRange.start;
    const nextDurationBars = Math.max(0.125, Number((currentDurationBars * (1 - cutFraction)).toFixed(4)));
    setRegion(null);
    setPlayheadX(activeSelectionRange.start);
    commitEditorMutation(
      `Deleted Selected Region (${(cutFraction * 100).toFixed(0)}%)`,
      remainingBuf,
      undefined,
      { durationBars: nextDurationBars }
    );
  }, [activeSelectionRange, commitEditorMutation, currentDurationBars, getWorkingBuffer, showNotice, stopPlayback]);

  const handlePasteAtPlayhead = useCallback(() => {
    if (!clipboardBuffer) {
      showNotice('Clipboard is empty — Copy or Cut a waveform region first.');
      return;
    }
    const working = getWorkingBuffer();
    if (!working) return;
    stopPlayback();
    const nextBuf = insertAudioBufferAt(working.ctx, working.buffer, clipboardBuffer, playheadX);
    const addedRatio = clipboardBuffer.length / Math.max(1, working.buffer.length);
    const nextDurationBars = Math.min(16, Number((currentDurationBars * (1 + addedRatio)).toFixed(4)));
    commitEditorMutation(
      `Pasted ${clipboardBuffer.duration.toFixed(2)}s at ${(playheadX * 100).toFixed(0)}%`,
      nextBuf,
      undefined,
      { durationBars: nextDurationBars }
    );
  }, [clipboardBuffer, commitEditorMutation, currentDurationBars, getWorkingBuffer, playheadX, showNotice, stopPlayback]);

  const handleCropToSelection = useCallback(() => {
    if (!activeSelectionRange) {
      showNotice('Select a region on the waveform first to crop.');
      return;
    }
    const working = getWorkingBuffer();
    if (!working) return;
    stopPlayback();
    const croppedBuf = sliceAudioBuffer(working.ctx, working.buffer, activeSelectionRange);
    const selRatio = Math.max(0.02, activeSelectionRange.end - activeSelectionRange.start);
    const nextDurationBars = Math.max(0.125, Number((currentDurationBars * selRatio).toFixed(4)));
    setRegion(null);
    setPlayheadX(0);
    setIsTrimmed(true);
    commitEditorMutation(
      `Cropped to Selection (${croppedBuf.duration.toFixed(2)}s)`,
      croppedBuf,
      undefined,
      { durationBars: nextDurationBars }
    );
  }, [activeSelectionRange, commitEditorMutation, currentDurationBars, getWorkingBuffer, showNotice, stopPlayback]);

  const handleDuplicateLoop = useCallback(() => {
    const working = getWorkingBuffer();
    if (!working) return;
    stopPlayback();
    const sourceSlice = activeSelectionRange
      ? sliceAudioBuffer(working.ctx, working.buffer, activeSelectionRange)
      : working.buffer;
    const xfadeSamples = Math.round((loopCrossfadeMs / 1000) * working.buffer.sampleRate);
    const joined = concatAudioBuffers(working.ctx, working.buffer, sourceSlice, xfadeSamples);
    const ratio = joined.length / Math.max(1, working.buffer.length);
    const nextDurationBars = Math.min(16, Number((currentDurationBars * ratio).toFixed(4)));
    commitEditorMutation(
      activeSelectionRange ? 'Appended Crossfaded Selection' : 'Doubled Loop (With Seam Crossfade)',
      joined,
      undefined,
      { durationBars: nextDurationBars }
    );
  }, [activeSelectionRange, commitEditorMutation, currentDurationBars, getWorkingBuffer, loopCrossfadeMs, stopPlayback]);

  const handleVarispeed = useCallback((speedFactor: number, label: string) => {
    const working = getWorkingBuffer();
    if (!working) return;
    stopPlayback();
    const resampled = varispeedBuffer(working.ctx, working.buffer, speedFactor);
    const nextDurationBars = Math.max(0.125, Math.min(16, Number((currentDurationBars / speedFactor).toFixed(4))));
    commitEditorMutation(`Resampled ${label}`, resampled, undefined, { durationBars: nextDurationBars });
  }, [commitEditorMutation, currentDurationBars, getWorkingBuffer, stopPlayback]);

  // Non-Destructive Pitch-Locked Time Stretch
  const handleApplyTimeStretch = useCallback(
    (targetSpeedRatio: number, customPreservePitch?: boolean) => {
      const working = getWorkingBuffer();
      if (!working) return;
      stopPlayback();

      const clampedRatio = Math.max(0.25, Math.min(4.0, Number(targetSpeedRatio.toFixed(3))));
      const nextPreservePitch = customPreservePitch !== undefined ? customPreservePitch : preservePitch;
      const baseBars = originalDurationBars > 0 ? originalDurationBars : currentDurationBars;
      const sourceOrig =
        (parentTrack?.id ? audioService.getOriginalTrackAudioBuffer(parentTrack.id) : undefined) ||
        originalBackup.buffer ||
        working.buffer;

      const stretchFactor = 1 / clampedRatio;
      const stretchedBuf = timeStretchBufferPreservePitch(working.ctx, sourceOrig, stretchFactor, nextPreservePitch);
      const nextDurationBars = Math.max(0.125, Math.min(32, Number((baseBars / clampedRatio).toFixed(4))));
      const computedPeaks = extractWaveformPeaks(stretchedBuf, TARGET_PEAK_BARS);

      commitEditorMutation(
        `Time Stretch ${clampedRatio.toFixed(2)}x (${nextPreservePitch ? 'Pitch-Locked' : 'Resample'}) → ${nextDurationBars.toFixed(2)} bars`,
        stretchedBuf,
        computedPeaks,
        {
          durationBars: nextDurationBars,
          originalDurationBars: baseBars,
          timeStretchRatio: clampedRatio,
          preservePitch: nextPreservePitch
        }
      );

      if (parentTrack?.id) {
        audioService.setTrackAudioBuffer(parentTrack.id, stretchedBuf, Math.abs(clampedRatio - 1.0) > 0.005);
      }
      if (selectedClip && onUpdateClip) {
        onUpdateClip({
          ...selectedClip,
          durationBars: nextDurationBars,
          originalDurationBars: baseBars,
          timeStretchRatio: clampedRatio,
          timeStretchEnabled,
          preservePitch: nextPreservePitch,
          waveformSnippet: computedPeaks
        });
        setHasUncommittedEdits(false);
      }
    },
    [
      commitEditorMutation,
      currentDurationBars,
      getWorkingBuffer,
      onUpdateClip,
      originalBackup.buffer,
      originalDurationBars,
      parentTrack?.id,
      preservePitch,
      selectedClip,
      stopPlayback,
      timeStretchEnabled
    ]
  );

  const handleToggleTimelineStretchMode = useCallback(() => {
    const nextEnabled = !timeStretchEnabled;
    const baseBars = originalDurationBars > 0 ? originalDurationBars : currentDurationBars;
    setTimeStretchEnabled(nextEnabled);
    setOriginalDurationBars(baseBars);
    if (selectedClip) {
      const nextClip: Clip = {
        ...selectedClip,
        originalDurationBars: baseBars,
        timeStretchRatio,
        timeStretchEnabled: nextEnabled,
        preservePitch
      };
      setSelectedClip(nextClip);
      if (onUpdateClip) onUpdateClip(nextClip);
    }
    showNotice(
      nextEnabled
        ? '⇄ Timeline Right-Edge Time Stretch ENABLED — drag clip right edge in Mixer to stretch without changing pitch!'
        : 'Timeline Right-Edge Time Stretch disabled (Ctrl+Drag still stretches anytime).'
    );
  }, [
    currentDurationBars,
    onUpdateClip,
    originalDurationBars,
    preservePitch,
    selectedClip,
    showNotice,
    timeStretchEnabled,
    timeStretchRatio
  ]);

  // ChronoPins: Auto-Attach to Every Measure, Drop, Drag, Lock, & Latch Drifting Measures to Project Grid
  const syncChronoPinsToClip = useCallback(
    (nextPins: ChronoPin[]) => {
      setChronoPins(nextPins);
      if (selectedClip) {
        const nextClip: Clip = { ...selectedClip, chronoPins: nextPins };
        setSelectedClip(nextClip);
        if (onUpdateClip) onUpdateClip(nextClip);
      }
    },
    [onUpdateClip, selectedClip]
  );

  const handleAutoDetectChronoPins = useCallback(() => {
    const working = getWorkingBuffer();
    if (!working) return;
    const analysis = analyzeAudioBuffer(working.buffer);
    const pins = analysis.chronoPins;
    setShowChronoPinsOverlay(true);
    setSelectedChronoPinId(pins[0]?.id ?? null);
    syncChronoPinsToClip(pins);
    showNotice(
      `📌 Attached ${pins.length} ChronoPins across measures (detected ~${analysis.detectedBpm} BPM vs ${tempo} BPM project grid)`
    );
  }, [getWorkingBuffer, showNotice, syncChronoPinsToClip, tempo]);

  const handleDropChronoPinAtPlayhead = useCallback(() => {
    const timeSec = Number((playheadX * clipDurationSeconds).toFixed(4));
    const beatSec = 60 / Math.max(30, tempo);
    const totalBeatIdx = Math.max(0, Math.round(timeSec / beatSec));
    const measure = Math.floor(totalBeatIdx / 4) + 1;
    const beat = (totalBeatIdx % 4) + 1;
    const idealSec = Number((totalBeatIdx * beatSec).toFixed(4));

    const newPin: ChronoPin = {
      id: `pin-custom-${Date.now()}-${Math.round(Math.random() * 999)}`,
      label: measure === 1 && beat === 1 ? 'Downbeat (Bar 1.1)' : `ChronoPin Bar ${measure}.${beat}`,
      timeSeconds: timeSec,
      targetTimeSeconds: idealSec,
      measure,
      beat,
      isDownbeat: measure === 1 && beat === 1,
      isLocked: false
    };

    const nextPins = [...chronoPins, newPin].sort((a, b) => a.timeSeconds - b.timeSeconds);
    setShowChronoPinsOverlay(true);
    setSelectedChronoPinId(newPin.id);
    syncChronoPinsToClip(nextPins);
    showNotice(`📌 Dropped ChronoPin Bar ${measure}.${beat} at ${timeSec.toFixed(2)}s`);
  }, [chronoPins, clipDurationSeconds, playheadX, showNotice, syncChronoPinsToClip, tempo]);

  const handleSnapPinToIdealBeat = useCallback(
    (pinId: string) => {
      const beatSec = 60 / Math.max(30, tempo);
      const nextPins = chronoPins.map(p => {
        if (p.id !== pinId) return p;
        const beatPos = (p.measure - 1) * 4 + (p.beat - 1);
        const ideal = Number((beatPos * beatSec).toFixed(4));
        return { ...p, timeSeconds: Math.min(clipDurationSeconds, Math.max(0, ideal)), targetTimeSeconds: ideal };
      });
      syncChronoPinsToClip(nextPins);
    },
    [chronoPins, clipDurationSeconds, syncChronoPinsToClip, tempo]
  );

  const handleNudgeSelectedChronoPin = useCallback(
    (deltaMs: number) => {
      if (!selectedChronoPinId) return;
      const deltaSec = deltaMs / 1000;
      const nextPins = chronoPins
        .map(p =>
          p.id === selectedChronoPinId
            ? { ...p, timeSeconds: Number(Math.max(0, Math.min(clipDurationSeconds, p.timeSeconds + deltaSec)).toFixed(4)) }
            : p
        )
        .sort((a, b) => a.timeSeconds - b.timeSeconds);
      syncChronoPinsToClip(nextPins);
    },
    [chronoPins, clipDurationSeconds, selectedChronoPinId, syncChronoPinsToClip]
  );

  const handleDeleteChronoPin = useCallback(
    (pinId: string) => {
      const nextPins = chronoPins.filter(p => p.id !== pinId);
      if (selectedChronoPinId === pinId) {
        setSelectedChronoPinId(nextPins[0]?.id ?? null);
      }
      syncChronoPinsToClip(nextPins);
      showNotice('Removed ChronoPin anchor');
    },
    [chronoPins, selectedChronoPinId, showNotice, syncChronoPinsToClip]
  );

  const handleToggleChronoPinLock = useCallback(
    (pinId: string) => {
      const nextPins = chronoPins.map(p => (p.id === pinId ? { ...p, isLocked: !p.isLocked } : p));
      syncChronoPinsToClip(nextPins);
    },
    [chronoPins, syncChronoPinsToClip]
  );

  const handleClearChronoPins = useCallback(() => {
    setSelectedChronoPinId(null);
    syncChronoPinsToClip([]);
    showNotice('Cleared all ChronoPins from clip');
  }, [showNotice, syncChronoPinsToClip]);

  const handleLatchChronoPinsToGrid = useCallback(() => {
    if (chronoPins.length < 2) {
      showNotice('Attach or drop at least 2 ChronoPins first so slow/drifting sections can latch onto the grid.');
      return;
    }
    const working = getWorkingBuffer();
    if (!working) return;
    stopPlayback();

    const warped = warpBufferWithChronoPins(working.ctx, working.buffer, chronoPins, tempo, preservePitch);
    const computedPeaks = extractWaveformPeaks(warped.buffer, TARGET_PEAK_BARS);
    const nextDurationBars = Math.max(0.25, Math.min(32, Number(((warped.buffer.duration * tempo) / 240).toFixed(4))));

    commitEditorMutation(
      `Latched ${warped.warpedPins.length} ChronoPins to ${tempo} BPM (fixed ${warped.maxDriftMs}ms drift across ${warped.segmentsWarped} segments)`,
      warped.buffer,
      computedPeaks,
      {
        durationBars: nextDurationBars,
        chronoPins: warped.warpedPins,
        chronoLatchEnabled: true,
        preservePitch
      }
    );

    if (parentTrack?.id) {
      audioService.setTrackAudioBuffer(parentTrack.id, warped.buffer, true);
    }
    if (selectedClip && onUpdateClip) {
      onUpdateClip({
        ...selectedClip,
        durationBars: nextDurationBars,
        chronoPins: warped.warpedPins,
        chronoLatchEnabled: true,
        preservePitch,
        waveformSnippet: computedPeaks
      });
      setHasUncommittedEdits(false);
    }
  }, [
    chronoPins,
    commitEditorMutation,
    getWorkingBuffer,
    onUpdateClip,
    parentTrack?.id,
    preservePitch,
    selectedClip,
    showNotice,
    stopPlayback,
    tempo
  ]);

  // Apply Fluid Loop Crossfade (Beginning ↔ End)
  const handleApplyLoopCrossfade = useCallback(() => {
    const working = getWorkingBuffer();
    if (!working) return;
    stopPlayback();

    const nextBuf = applyLoopCrossfadeToBuffer(
      working.ctx,
      working.buffer,
      loopCrossfadeMs,
      loopCrossfadeCurve,
      loopCrossfadeStyle,
      preserveLoopTempo
    );

    const crossfadeRatio = Math.min(0.42, (loopCrossfadeMs / 1000) / Math.max(0.1, working.buffer.duration));
    const nextPeaks =
      audioBuffer !== null
        ? extractWaveformPeaks(nextBuf, TARGET_PEAK_BARS)
        : applyLoopCrossfadeToPeaks(waveformPeaks, crossfadeRatio, loopCrossfadeCurve, loopCrossfadeStyle);

    const fadeBars = Number(((loopCrossfadeMs / 1000) / Math.max(0.1, clipDurationSeconds) * currentDurationBars).toFixed(4));
    const nextDurationBars =
      loopCrossfadeStyle === 'overlap_loop' && !preserveLoopTempo
        ? Math.max(0.125, Number((currentDurationBars * (nextBuf.length / working.buffer.length)).toFixed(4)))
        : currentDurationBars;

    commitEditorMutation(
      `Applied ${loopCrossfadeMs}ms ${loopCrossfadeCurve.replace('_', '-')} Loop Crossfade`,
      nextBuf,
      nextPeaks,
      {
        durationBars: nextDurationBars,
        fadeInBars: fadeBars,
        fadeOutBars: fadeBars,
        loopCrossfadeMs,
        loopCrossfadeCurve
      }
    );
  }, [
    audioBuffer,
    clipDurationSeconds,
    commitEditorMutation,
    currentDurationBars,
    getWorkingBuffer,
    loopCrossfadeCurve,
    loopCrossfadeMs,
    loopCrossfadeStyle,
    preserveLoopTempo,
    stopPlayback,
    waveformPeaks
  ]);

  // Export WAV Download
  const handleExportWav = useCallback(() => {
    const working = getWorkingBuffer();
    if (!working) return;
    const wavBlob = audioBufferToWavBlob(working.buffer);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    const baseName = (selectedClip?.name || 'edited_loop').replace(/\.[^/.]+$/, '');
    a.download = `${baseName}_edited.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showNotice(`💾 Exported "${baseName}_edited.wav"`);
  }, [getWorkingBuffer, selectedClip?.name, showNotice]);

  const audioImportInputRef = useRef<HTMLInputElement>(null);

  const handleImportAudioFileDirectly = useCallback(async (file: File) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = audioCtxRef.current || new AudioCtx();
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') {
        try { await ctx.resume(); } catch (_) {}
      }
      const arrayBuf = await file.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuf);
      
      const secondsPerBar = (60 / Math.max(40, tempo)) * 4;
      const durBars = Math.max(1, Math.min(64, Math.round((decoded.duration / secondsPerBar) * 4) / 4));
      
      const newClip: Clip = {
        id: `imported-clip-${Date.now()}`,
        name: file.name,
        startBar: 0,
        durationBars: durBars,
        audioUrl: URL.createObjectURL(file)
      };
      
      audioService.setTrackAudioBuffer(newClip.id, decoded);
      setSelectedClip(newClip);
      setBufferHistory([decoded]);
      setHistoryIndex(0);
      setHasUncommittedEdits(false);
      onSelectClip?.(newClip);
      showNotice(`✨ Loaded "${file.name}" into Audio Editor!`);
    } catch (err) {
      console.error(err);
      showNotice(`Failed to load audio: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [tempo, onSelectClip, showNotice]);

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
        activeDurationBars: currentDurationBars,
        leadingIndex: 0,
        trailingIndex: 0,
        totalBars: currentDurationBars,
        totalSeconds: clipDurationSeconds,
        trimmedPercent: 0,
        detectedAtThresholdDb: sensitivityDb,
        hasSilence: false
      };
    }

    const durationSec = clipDurationSeconds;
    const paddingFraction = (safetyPaddingMs / 1000) / (durationSec || 1);
    const paddingSamples = Math.floor(paddingFraction * totalSamples);

    let firstActiveIndex = 0;
    for (let i = 0; i < totalSamples; i++) {
      if (waveformPeaks[i] >= thresholdLinear) {
        firstActiveIndex = i;
        break;
      }
    }
    const leadingIndex = Math.max(0, firstActiveIndex - paddingSamples);

    let lastActiveIndex = totalSamples - 1;
    for (let i = totalSamples - 1; i >= 0; i--) {
      if (waveformPeaks[i] >= thresholdLinear) {
        lastActiveIndex = i;
        break;
      }
    }
    const trailingIndex = Math.min(totalSamples - 1, lastActiveIndex + paddingSamples);

    const leadingFraction = totalSamples > 0 ? leadingIndex / totalSamples : 0;
    const trailingFraction = totalSamples > 0 ? (totalSamples - 1 - trailingIndex) / totalSamples : 0;

    const leadingSilenceSeconds = Number((leadingFraction * durationSec).toFixed(3));
    const trailingSilenceSeconds = Number((trailingFraction * durationSec).toFixed(3));
    const leadingSilenceBars = Number((leadingFraction * currentDurationBars).toFixed(3));
    const trailingSilenceBars = Number((trailingFraction * currentDurationBars).toFixed(3));

    const activeFraction = Math.max(0.05, 1 - leadingFraction - trailingFraction);
    const activeDurationSeconds = Number((activeFraction * durationSec).toFixed(3));
    const activeDurationBars = Number((activeFraction * currentDurationBars).toFixed(3));

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
      totalBars: currentDurationBars,
      totalSeconds: durationSec,
      trimmedPercent,
      detectedAtThresholdDb: sensitivityDb,
      hasSilence
    };
  }, [waveformPeaks, thresholdLinear, clipDurationSeconds, currentDurationBars, safetyPaddingMs, sensitivityDb]);

  // Visible viewport window based on horizontal zoom & scrollOffset
  const visibleWindow = useMemo(() => {
    const span = 1 / Math.max(1, zoomLevel);
    const start = Math.max(0, Math.min(1 - span, scrollOffset));
    return { start, end: start + span, span };
  }, [zoomLevel, scrollOffset]);

  // Real-time Web Audio Playback (Audition Region / Full Clip / Loop Seam Preview)
  const togglePlay = useCallback(
    (mode: 'normal' | 'trimmed' | 'seam' = 'normal') => {
      if (isPlaying) {
        stopPlayback();
        return;
      }

      const working = getWorkingBuffer();
      if (!working) return;
      const { ctx, buffer } = working;

      let playbackBuffer = buffer;
      if (mode === 'seam') {
        playbackBuffer = applyLoopCrossfadeToBuffer(
          ctx,
          buffer,
          loopCrossfadeMs,
          loopCrossfadeCurve,
          loopCrossfadeStyle,
          preserveLoopTempo
        );
      }

      let startNorm = 0;
      let endNorm = 1;
      if (mode === 'trimmed') {
        startNorm = silenceResult.leadingIndex / Math.max(1, waveformPeaks.length);
        endNorm = silenceResult.trailingIndex / Math.max(1, waveformPeaks.length);
      } else if (mode === 'seam') {
        startNorm = 0;
        endNorm = 1;
      } else if (activeSelectionRange) {
        startNorm = activeSelectionRange.start;
        endNorm = activeSelectionRange.end;
      }

      const dur = playbackBuffer.duration;
      const segStartSec = startNorm * dur;
      const segEndSec = Math.max(segStartSec + 0.05, endNorm * dur);
      const segDurSec = segEndSec - segStartSec;

      // In seam preview mode, start ~30% before end so user immediately hears the end -> start crossfade wrap
      const initialNorm =
        mode === 'seam' ? Math.max(0, 1 - Math.min(0.45, Math.max(0.18, (loopCrossfadeMs / 1000) * 3 / Math.max(0.2, dur)))) : startNorm;
      const initialOffsetSec = initialNorm * dur;

      const source = ctx.createBufferSource();
      source.buffer = playbackBuffer;
      const useLoop = mode === 'seam' ? true : loopEnabled;
      source.loop = useLoop;
      if (useLoop) {
        source.loopStart = segStartSec;
        source.loopEnd = segEndSec;
      }

      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.85;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      const startedAtCtx = ctx.currentTime;
      if (useLoop) {
        source.start(0, initialOffsetSec);
      } else {
        source.start(0, initialOffsetSec, Math.max(0.05, segEndSec - initialOffsetSec));
      }

      activeSourceRef.current = source;
      setIsPlaying(true);
      setIsPreviewingSeam(mode === 'seam');
      setPlayheadX(initialNorm);

      source.onended = () => {
        if (!useLoop) {
          setIsPlaying(false);
          setIsPreviewingSeam(false);
          if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
      };

      const tick = () => {
        const elapsed = ctx.currentTime - startedAtCtx;
        const rawSec = initialOffsetSec + elapsed;
        let currentSec = rawSec;
        if (useLoop) {
          const offsetFromSegStart = (((rawSec - segStartSec) % segDurSec) + segDurSec) % segDurSec;
          currentSec = segStartSec + offsetFromSegStart;
        } else if (rawSec >= segEndSec) {
          setPlayheadX(endNorm);
          setIsPlaying(false);
          setIsPreviewingSeam(false);
          return;
        }
        setPlayheadX(Math.max(0, Math.min(1, currentSec / dur)));
        animFrameRef.current = requestAnimationFrame(tick);
      };

      animFrameRef.current = requestAnimationFrame(tick);
    },
    [
      activeSelectionRange,
      getWorkingBuffer,
      isPlaying,
      loopCrossfadeCurve,
      loopCrossfadeMs,
      loopCrossfadeStyle,
      loopEnabled,
      preserveLoopTempo,
      silenceResult,
      stopPlayback,
      waveformPeaks.length
    ]
  );

  useEffect(() => {
    return () => {
      stopPlayback();
      if (noticeTimerRef.current !== null) {
        window.clearTimeout(noticeTimerRef.current);
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
      audioCtxRef.current = null;
    };
  }, [stopPlayback]);

  // Keyboard Shortcuts inside AudioEditor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay('normal');
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.stopPropagation();
        handleEditorUndo();
        return;
      }

      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        e.stopPropagation();
        handleEditorRedo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setRegion({ start: 0, end: 1 });
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopySelection();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        handleCutSelection();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handlePasteAtPlayhead();
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && activeSelectionRange) {
        e.preventDefault();
        handleDeleteSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeSelectionRange,
    handleCopySelection,
    handleCutSelection,
    handleDeleteSelection,
    handleEditorRedo,
    handleEditorUndo,
    handlePasteAtPlayhead,
    togglePlay
  ]);

  // Waveform Canvas Render Loop (with Zoom, Selection, Crossfade Curves & Seam Zones)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const { start: winStart, end: winEnd, span: winSpan } = visibleWindow;
    const toPx = (norm: number) => ((norm - winStart) / winSpan) * width;

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#040711');
    bgGrad.addColorStop(1, '#090D1A');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Beat / 16th Gridlines across normalized [0..1] timeline
    ctx.strokeStyle = '#121A2D';
    ctx.lineWidth = 1;
    const totalGridDivisions = Math.max(8, Math.round(currentDurationBars * 4));
    for (let g = 0; g <= totalGridDivisions; g++) {
      const gx = toPx(g / totalGridDivisions);
      if (gx < 0 || gx > width) continue;
      ctx.strokeStyle = g % 4 === 0 ? '#1E2A44' : '#101728';
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, height);
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
    const leadNorm = totalSamples > 0 ? silenceResult.leadingIndex / totalSamples : 0;
    const trailNorm = totalSamples > 0 ? silenceResult.trailingIndex / totalSamples : 1;

    // Optional Silence Overlays
    if (showSilenceOverlays && silenceResult.hasSilence) {
      const leadPx = toPx(leadNorm);
      const trailPx = toPx(trailNorm);

      if (leadPx > 2 && (trimMode === 'both' || trimMode === 'start')) {
        const clampedLead = Math.min(width, Math.max(0, leadPx));
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.fillRect(0, 0, clampedLead, height);
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(clampedLead, 0);
        ctx.lineTo(clampedLead, height);
        ctx.stroke();
      }

      if (trailPx < width - 2 && (trimMode === 'both' || trimMode === 'end')) {
        const clampedTrail = Math.min(width, Math.max(0, trailPx));
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.fillRect(clampedTrail, 0, width - clampedTrail, height);
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(clampedTrail, 0);
        ctx.lineTo(clampedTrail, height);
        ctx.stroke();
      }
    }

    // Selected Region Shading
    if (activeSelectionRange) {
      const regStartPx = Math.max(0, toPx(activeSelectionRange.start));
      const regEndPx = Math.min(width, toPx(activeSelectionRange.end));
      if (regEndPx > regStartPx) {
        const regionGrad = ctx.createLinearGradient(0, 0, 0, height);
        regionGrad.addColorStop(0, 'rgba(0, 240, 255, 0.18)');
        regionGrad.addColorStop(1, 'rgba(0, 240, 255, 0.04)');
        ctx.fillStyle = regionGrad;
        ctx.fillRect(regStartPx, 0, regEndPx - regStartPx, height);
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(regStartPx, 0, regEndPx - regStartPx, height);
      }
    }

    // Draw Sensitivity Threshold Line if enabled
    if (showThresholdLine) {
      const thresholdYUpper = height / 2 - thresholdLinear * (height * 0.41);
      const thresholdYLower = height / 2 + thresholdLinear * (height * 0.41);
      ctx.save();
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, thresholdYUpper);
      ctx.lineTo(width, thresholdYUpper);
      ctx.moveTo(0, thresholdYLower);
      ctx.lineTo(width, thresholdYLower);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#FFD700';
      ctx.font = '9px monospace';
      ctx.fillText(`THRESHOLD: ${sensitivityDb} dB`, 8, Math.max(12, thresholdYUpper - 3));
    }

    // Draw Waveform Bars inside visible window
    if (totalSamples > 0) {
      const firstBar = Math.max(0, Math.floor(winStart * totalSamples));
      const lastBar = Math.min(totalSamples - 1, Math.ceil(winEnd * totalSamples));
      const visibleCount = Math.max(1, lastBar - firstBar + 1);
      const barWidth = width / (winSpan * totalSamples);

      for (let i = firstBar; i <= lastBar; i++) {
        const normPos = i / totalSamples;
        const x = toPx(normPos);
        const peak = waveformPeaks[i];
        const h = Math.max(2, peak * (height * 0.84));
        const y = (height - h) / 2;

        const isInsideSilenceZone =
          showSilenceOverlays &&
          ((i < silenceResult.leadingIndex && (trimMode === 'both' || trimMode === 'start')) ||
            (i > silenceResult.trailingIndex && (trimMode === 'both' || trimMode === 'end')));
        const inUserRegion =
          activeSelectionRange && normPos >= activeSelectionRange.start && normPos <= activeSelectionRange.end;

        if (isInsideSilenceZone) {
          ctx.fillStyle = '#5B1F1F';
        } else if (inUserRegion) {
          ctx.fillStyle = '#00F0FF';
        } else {
          ctx.fillStyle = '#38BDF8';
        }

        ctx.fillRect(x, y, Math.max(1, barWidth - (visibleCount > 180 ? 0.6 : 1)), h);
      }
    }

    // Draw Loop Crossfade Head & Tail Curve Overlays
    if (showCrossfadeOverlay && loopCrossfadeMs > 0 && clipDurationSeconds > 0) {
      const xfNorm = Math.min(0.42, (loopCrossfadeMs / 1000) / Math.max(0.1, clipDurationSeconds));
      const headStartPx = toPx(0);
      const headEndPx = toPx(xfNorm);
      const tailStartPx = toPx(1 - xfNorm);
      const tailEndPx = toPx(1);

      // Head crossfade overlay
      if (headEndPx > 0 && headStartPx < width) {
        const clampedS = Math.max(0, headStartPx);
        const clampedE = Math.min(width, headEndPx);
        if (clampedE > clampedS) {
          ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
          ctx.fillRect(clampedS, 0, clampedE - clampedS, height);
        }
        ctx.save();
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const steps = 28;
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const { inGain } = evaluateCrossfadeWeights(t, loopCrossfadeCurve);
          const cx = toPx(t * xfNorm);
          const cy = height - 10 - inGain * (height - 24);
          if (s === 0) ctx.moveTo(cx, cy);
          else ctx.lineTo(cx, cy);
        }
        ctx.stroke();
        ctx.restore();

        if (headEndPx > 32) {
          ctx.fillStyle = '#FFD700';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(`XFADE IN ${loopCrossfadeMs}ms`, Math.max(6, headStartPx + 6), 14);
        }
      }

      // Tail crossfade overlay
      if (tailEndPx > 0 && tailStartPx < width) {
        const clampedS = Math.max(0, tailStartPx);
        const clampedE = Math.min(width, tailEndPx);
        if (clampedE > clampedS) {
          ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
          ctx.fillRect(clampedS, 0, clampedE - clampedS, height);
        }
        ctx.save();
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const steps = 28;
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const { outGain } = evaluateCrossfadeWeights(t, loopCrossfadeCurve);
          const cx = toPx(1 - xfNorm + t * xfNorm);
          const cy = height - 10 - outGain * (height - 24);
          if (s === 0) ctx.moveTo(cx, cy);
          else ctx.lineTo(cx, cy);
        }
        ctx.stroke();
        ctx.restore();

        if (tailEndPx - tailStartPx > 36) {
          ctx.fillStyle = '#10B981';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(`XFADE OUT ${loopCrossfadeMs}ms`, Math.max(6, tailStartPx + 6), 14);
        }
      }
    }

    // Draw Cue Markers
    markers.forEach((m, idx) => {
      const mx = toPx(m);
      if (mx < -10 || mx > width + 10) return;
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(mx, 0);
      ctx.lineTo(mx, height);
      ctx.stroke();

      ctx.fillStyle = '#FFD700';
      ctx.fillRect(mx - 10, height - 16, 20, 12);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(`M${idx + 1}`, mx - 6, height - 7);
    });

    // Draw ChronoPins Overlay (measure anchors + ideal grid drift ghosts)
    if (showChronoPinsOverlay && chronoPins.length > 0 && clipDurationSeconds > 0) {
      const beatSec = 60 / Math.max(30, tempo);
      chronoPins.forEach(pin => {
        const pinNorm = Math.max(0, Math.min(1, pin.timeSeconds / clipDurationSeconds));
        const pxPin = toPx(pinNorm);
        if (pxPin < -28 || pxPin > width + 28) return;

        const isSelected = pin.id === selectedChronoPinId;
        const firstPin = chronoPins[0];
        const firstBeatPos = firstPin ? (firstPin.measure - 1) * 4 + (firstPin.beat - 1) : 0;
        const beatPos = (pin.measure - 1) * 4 + (pin.beat - 1);
        const idealSec = (firstPin?.timeSeconds ?? 0) + (beatPos - firstBeatPos) * beatSec;
        const driftMs = Math.round((pin.timeSeconds - idealSec) * 1000);

        // Ghost target grid line when measure drifted > 8ms
        if (Math.abs(driftMs) > 8) {
          const idealPx = toPx(Math.max(0, Math.min(1, idealSec / clipDurationSeconds)));
          if (idealPx >= -10 && idealPx <= width + 10) {
            ctx.save();
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(idealPx, 18);
            ctx.lineTo(idealPx, height);
            ctx.stroke();
            ctx.restore();

            ctx.fillStyle = 'rgba(16, 185, 129, 0.14)';
            ctx.fillRect(Math.min(pxPin, idealPx), 18, Math.abs(pxPin - idealPx), height - 18);
          }
        }

        const pinColor = isSelected ? '#10B981' : pin.isDownbeat ? '#FFD700' : '#C084FC';
        ctx.save();
        ctx.strokeStyle = pinColor;
        ctx.lineWidth = isSelected ? 2 : 1.5;
        ctx.beginPath();
        ctx.moveTo(pxPin, 0);
        ctx.lineTo(pxPin, height);
        ctx.stroke();
        ctx.restore();

        // Top draggable ChronoPin flag pill
        const tag = `${pin.measure}.${pin.beat}`;
        const pillW = Math.max(24, tag.length * 7 + 8);
        ctx.fillStyle = pinColor;
        ctx.fillRect(pxPin - pillW / 2, 2, pillW, 15);
        ctx.fillStyle = '#040711';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(tag, pxPin - pillW / 2 + 4, 13);
      });
    }

    // Draw Playhead
    const px = toPx(playheadX);
    if (px >= -2 && px <= width + 2) {
      ctx.strokeStyle = '#FF2E63';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
      ctx.stroke();

      ctx.fillStyle = '#FF2E63';
      ctx.beginPath();
      ctx.moveTo(px - 5, 0);
      ctx.lineTo(px + 5, 0);
      ctx.lineTo(px, 8);
      ctx.closePath();
      ctx.fill();
    }
  }, [
    activeSelectionRange,
    chronoPins,
    clipDurationSeconds,
    currentDurationBars,
    loopCrossfadeCurve,
    loopCrossfadeMs,
    markers,
    playheadX,
    selectedChronoPinId,
    sensitivityDb,
    showChronoPinsOverlay,
    showCrossfadeOverlay,
    showSilenceOverlays,
    showThresholdLine,
    silenceResult,
    tempo,
    thresholdLinear,
    trimMode,
    visibleWindow,
    waveformPeaks
  ]);

  // Snap / Zero-Crossing coordinate helper for Canvas pointer events
  const resolvePointerNorm = useCallback(
    (clientX: number, altBypass: boolean) => {
      const canvas = canvasRef.current;
      if (!canvas) return 0;
      const rect = canvas.getBoundingClientRect();
      const relX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      let norm = visibleWindow.start + relX * visibleWindow.span;

      if (snapSelectionEnabled && !altBypass) {
        const barPos = norm * currentDurationBars;
        const snappedBar = snapToGrid(barPos, snapValue);
        norm = Math.max(0, Math.min(1, snappedBar / currentDurationBars));
      } else if (zeroCrossingSnap && !altBypass && waveformPeaks.length > 20) {
        // Nudge toward local quietest valley within ±2 bars of peak index to avoid zero-crossing clicks
        const idx = Math.round(norm * (waveformPeaks.length - 1));
        let bestIdx = idx;
        let bestVal = waveformPeaks[idx];
        const radius = 2;
        for (let k = Math.max(0, idx - radius); k <= Math.min(waveformPeaks.length - 1, idx + radius); k++) {
          if (waveformPeaks[k] < bestVal) {
            bestVal = waveformPeaks[k];
            bestIdx = k;
          }
        }
        norm = bestIdx / (waveformPeaks.length - 1);
      }

      return Math.max(0, Math.min(1, norm));
    },
    [currentDurationBars, snapSelectionEnabled, snapValue, visibleWindow, waveformPeaks, zeroCrossingSnap]
  );

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas && showChronoPinsOverlay && chronoPins.length > 0 && clipDurationSeconds > 0) {
      const rect = canvas.getBoundingClientRect();
      const relY = e.clientY - rect.top;
      const clickRelX = (e.clientX - rect.left) / Math.max(1, rect.width);
      const clickPxCanvas = clickRelX * canvas.width;

      // Hit-test ChronoPin top handle (top ~28px)
      if (relY <= 28) {
        let hitPin: ChronoPin | null = null;
        let bestDist = 20;
        for (const pin of chronoPins) {
          const pinNorm = pin.timeSeconds / clipDurationSeconds;
          const pinPx = ((pinNorm - visibleWindow.start) / visibleWindow.span) * canvas.width;
          const dist = Math.abs(pinPx - clickPxCanvas);
          if (dist < bestDist) {
            bestDist = dist;
            hitPin = pin;
          }
        }
        if (hitPin) {
          setDraggingChronoPinId(hitPin.id);
          setSelectedChronoPinId(hitPin.id);
          setPlayheadX(Math.max(0, Math.min(1, hitPin.timeSeconds / clipDurationSeconds)));
          return;
        }
      }
    }

    const x = resolvePointerNorm(e.clientX, e.altKey);

    if (e.shiftKey) {
      setMarkers(prev => [...prev, x].sort((a, b) => a - b));
      showNotice(`📌 Added cue marker M${markers.length + 1} at ${(x * clipDurationSeconds).toFixed(2)}s`);
      return;
    }

    setIsDragging(true);
    setDragStart(x);
    setRegion({ start: x, end: x });
    setPlayheadX(x);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingChronoPinId) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
      const norm = Math.max(0, Math.min(1, visibleWindow.start + relX * visibleWindow.span));
      const nextTimeSec = Number((norm * clipDurationSeconds).toFixed(4));
      setChronoPins(prev =>
        prev.map(p => (p.id === draggingChronoPinId ? { ...p, timeSeconds: nextTimeSec } : p))
      );
      setPlayheadX(norm);
      return;
    }

    if (!isDragging || dragStart === null) return;
    const x = resolvePointerNorm(e.clientX, e.altKey);
    setRegion({
      start: Math.min(dragStart, x),
      end: Math.max(dragStart, x)
    });
  };

  const handleCanvasMouseUp = () => {
    if (draggingChronoPinId) {
      const sorted = [...chronoPins].sort((a, b) => a.timeSeconds - b.timeSeconds);
      setDraggingChronoPinId(null);
      syncChronoPinsToClip(sorted);
      return;
    }
    setIsDragging(false);
    setDragStart(null);
  };

  // Silence Trimming (updates both PCM buffer & peaks + undo history)
  const handleTrimSilence = () => {
    if (!silenceResult.hasSilence) {
      showNotice('ℹ️ No silence detected above the current threshold.');
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

    const trimmedPeaks = waveformPeaks.slice(newStartIndex, newEndIndex);
    if (trimmedPeaks.length < 10) {
      showNotice('⚠️ Trim boundaries too narrow. Adjust sensitivity threshold.');
      return;
    }

    const working = getWorkingBuffer();
    if (!working) return;
    stopPlayback();

    const startNorm = newStartIndex / totalSamples;
    const endNorm = newEndIndex / totalSamples;
    const slicedBuf = sliceAudioBuffer(working.ctx, working.buffer, { start: startNorm, end: endNorm });

    const leadingShiftBars = trimMode === 'both' || trimMode === 'start' ? silenceResult.leadingSilenceBars : 0;
    const newDurationBars = Math.max(0.125, Number(silenceResult.activeDurationBars.toFixed(3)));
    const newStartBar = Number(((selectedClip?.startBar || 0) + leadingShiftBars).toFixed(3));

    setIsTrimmed(true);
    setRegion(null);
    setPlayheadX(0);

    const updatedClip: Clip = {
      ...(selectedClip || { id: 'clip-trimmed', name: 'Trimmed_Clip.wav', startBar: 0, durationBars: newDurationBars }),
      startBar: newStartBar,
      durationBars: newDurationBars,
      fadeInBars: Math.min(0.04, newDurationBars * 0.05),
      fadeOutBars: Math.min(0.04, newDurationBars * 0.05),
      waveformSnippet: trimmedPeaks
    };

    commitEditorMutation(
      `Auto-Trimmed ${silenceResult.trimmedPercent}% Silence`,
      slicedBuf,
      trimmedPeaks,
      { durationBars: newDurationBars, fadeInBars: updatedClip.fadeInBars, fadeOutBars: updatedClip.fadeOutBars }
    );
    setSelectedClip(updatedClip);
    if (parentTrack?.id) audioService.setTrackAudioBuffer(parentTrack.id, slicedBuf);
    if (onUpdateClip) onUpdateClip(updatedClip);
    setHasUncommittedEdits(false);
  };

  // Restore Original Waveform & Bounds
  const handleResetOriginal = () => {
    stopPlayback();
    setWaveformPeaks(originalBackup.peaks);
    setAudioBuffer(originalBackup.buffer);
    setIsTrimmed(false);
    setUndoStack([]);
    setRedoStack([]);
    setRegion(null);
    setPlayheadX(0);

    const restoredOrigBars = originalBackup.originalDurationBars ?? originalBackup.durationBars;
    setOriginalDurationBars(restoredOrigBars);
    setTimeStretchRatio(1.0);
    setPreservePitch(true);
    setChronoPins(originalBackup.chronoPins ?? []);

    if (selectedClip) {
      const restoredClip: Clip = {
        ...selectedClip,
        durationBars: restoredOrigBars,
        originalDurationBars: restoredOrigBars,
        timeStretchRatio: 1.0,
        preservePitch: true,
        chronoPins: originalBackup.chronoPins ?? [],
        chronoLatchEnabled: false,
        fadeInBars: originalBackup.fadeInBars,
        fadeOutBars: originalBackup.fadeOutBars,
        loopCrossfadeMs: originalBackup.loopCrossfadeMs,
        loopCrossfadeCurve: originalBackup.loopCrossfadeCurve,
        waveformSnippet: originalBackup.peaks
      };
      setSelectedClip(restoredClip);
      if (parentTrack?.id && originalBackup.buffer) {
        audioService.setTrackAudioBuffer(parentTrack.id, originalBackup.buffer, false);
      }
      if (onUpdateClip) {
        onUpdateClip(restoredClip);
      }
    }
    setHasUncommittedEdits(false);
    showNotice('↺ Restored original clip audio, speed (1.00x), and timing.');
  };

  const applyPreset = (name: string, db: number, padMs: number) => {
    setSensitivityDb(db);
    setSafetyPaddingMs(padMs);
    setShowSilenceOverlays(true);
    setShowThresholdLine(true);
    showNotice(`⚡ Applied "${name}" preset: ${db} dB threshold, ${padMs}ms safety padding`);
  };

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

  const selectionReadout = useMemo(() => {
    if (!activeSelectionRange) {
      return {
        label: 'Full Clip',
        startSec: 0,
        endSec: clipDurationSeconds,
        durSec: clipDurationSeconds,
        bars: currentDurationBars
      };
    }
    const startSec = activeSelectionRange.start * clipDurationSeconds;
    const endSec = activeSelectionRange.end * clipDurationSeconds;
    return {
      label: 'Selection',
      startSec,
      endSec,
      durSec: Math.max(0.01, endSec - startSec),
      bars: (activeSelectionRange.end - activeSelectionRange.start) * currentDurationBars
    };
  }, [activeSelectionRange, clipDurationSeconds, currentDurationBars]);

  return (
    <div className="h-full w-full bg-[#05070E] flex flex-col overflow-hidden p-3 md:p-4 text-white font-mono select-none">
      {/* Pinned Top Header */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-[#1A2338]">
        <div className="flex items-center gap-2.5">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] border border-[#334155] text-[#94A3B8] hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
              title="Return to Mixer & Timeline"
            >
              <ChevronLeft size={17} />
            </button>
          )}

          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00F0FF]/20 via-[#FFD700]/20 to-[#FF2E63]/20 border border-[#00F0FF] flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.3)]">
            <Scissors size={18} className="text-[#00F0FF]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono font-black uppercase tracking-widest text-[#FFD700]">
                STRANGELET LAB
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 font-bold">
                WAVEFORM · LOOP CROSSFADE · DSP EDITOR
              </span>
              {hasUncommittedEdits && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                  UNSAVED EDITS
                </span>
              )}
              {isTrimmed && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                  <CheckCircle2 size={11} /> TRIMMED
                </span>
              )}
            </div>
            <h1 className="text-base md:text-lg font-black text-white tracking-tight leading-tight">
              LASER AUDIO EDITOR &amp; LOOP CROSSFADE STUDIO
            </h1>
          </div>
        </div>

        {/* Global Clip Selector, Audition & Timeline Commit */}
        <div className="flex flex-wrap items-center gap-1.5">
          {availableClips.length > 1 && (
            <div className="flex items-center gap-1.5 bg-[#090D18] border border-[#1E293B] rounded-xl px-2.5 py-1 text-xs">
              <Layers size={13} className="text-[#64748B]" />
              <select
                value={selectedClip?.id || ''}
                onChange={(e) => {
                  const target = availableClips.find(item => item.clip.id === e.target.value);
                  if (target) {
                    stopPlayback();
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
            onClick={handleEditorUndo}
            disabled={undoStack.length === 0}
            className="px-2.5 py-1.5 rounded-xl bg-[#0D1322] border border-[#1E293B] text-xs font-bold text-[#CBD5E1] hover:text-white disabled:opacity-35 disabled:pointer-events-none flex items-center gap-1 cursor-pointer"
            title="Undo Last Audio Edit (Ctrl+Z)"
          >
            <Undo2 size={13} />
            <span>UNDO</span>
          </button>

          <button
            onClick={handleEditorRedo}
            disabled={redoStack.length === 0}
            className="px-2.5 py-1.5 rounded-xl bg-[#0D1322] border border-[#1E293B] text-xs font-bold text-[#CBD5E1] hover:text-white disabled:opacity-35 disabled:pointer-events-none flex items-center gap-1 cursor-pointer"
            title="Redo Audio Edit (Ctrl+Y)"
          >
            <Redo2 size={13} />
            <span>REDO</span>
          </button>

          <button
            onClick={() => togglePlay('normal')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
              isPlaying && !isPreviewingSeam
                ? 'bg-[#FF2E63] text-white shadow-[0_0_15px_#FF2E63]'
                : 'bg-[#00F0FF] text-black hover:brightness-110 active:scale-95'
            }`}
          >
            {isPlaying && !isPreviewingSeam ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlaying && !isPreviewingSeam ? 'PAUSE' : 'AUDITION'}</span>
          </button>

          <input
            ref={audioImportInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                await handleImportAudioFileDirectly(file);
              }
            }}
          />
          <button
            onClick={() => audioImportInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-[#0E1626] border border-cyan-500/40 text-cyan-300 hover:border-cyan-400 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_8px_rgba(6,182,212,0.2)]"
            title="Import an audio file directly into the Audio Editor"
          >
            <Upload size={13} />
            <span>IMPORT AUDIO</span>
          </button>

          <button
            onClick={handleExportWav}
            className="px-3 py-1.5 rounded-xl bg-[#0E1626] border border-[#1E293B] text-[#10B981] hover:border-[#10B981] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="Download edited audio clip as 16-bit PCM WAV"
          >
            <Download size={13} />
            <span>EXPORT WAV</span>
          </button>

          {onUpdateClip && (
            <button
              onClick={handleCommitToTimeline}
              className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                hasUncommittedEdits
                  ? 'bg-gradient-to-r from-[#10B981] to-[#00F0FF] text-black shadow-[0_0_14px_rgba(16,185,129,0.45)] animate-pulse'
                  : 'bg-[#0E1726] border border-[#00F0FF]/40 text-[#00F0FF] hover:bg-[#00F0FF]/15'
              }`}
              title="Apply waveform edits, fades, and loop crossfades back to Mixer timeline"
            >
              <Save size={13} />
              <span>APPLY TO TIMELINE</span>
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFD700] text-black font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(255,140,0,0.4)] hover:brightness-110 active:scale-95 cursor-pointer"
            >
              <Sliders size={13} />
              <span>MIXER</span>
            </button>
          )}
        </div>
      </div>

      {/* Pinned Main Waveform Stage (always stays in view while scrolling/editing below) */}
      <div className="shrink-0 mt-2.5 p-3 bg-[#080B15] border border-[#1A2338] rounded-2xl flex flex-col gap-2 shadow-xl">
        {/* Clip Info & View Controls Header */}
        <div className="flex flex-wrap items-center justify-between text-xs pb-2 border-b border-[#141C2E] gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-[#00F0FF] text-[9px] font-bold uppercase tracking-wider">
              <Pin size={10} />
              LOCKED VIEW
            </span>
            <span className="text-white font-bold">{selectedClip ? selectedClip.name : 'Master_Audio_Stem.wav'}</span>
            <span className="px-2 py-0.5 rounded bg-[#101726] text-[#00F0FF] border border-[#1E293B] text-[10px]">
              {clipDurationSeconds}s ({currentDurationBars.toFixed(2)} bars)
            </span>
            <span className="px-2 py-0.5 rounded bg-[#101726] text-[#FFD700] border border-[#1E293B] text-[10px]">
              {tempo} BPM
            </span>
            <span className="px-2 py-0.5 rounded bg-[#101726] text-emerald-300 border border-[#1E293B] text-[10px]">
              {selectionReadout.label}: {selectionReadout.startSec.toFixed(2)}s → {selectionReadout.endSec.toFixed(2)}s ({selectionReadout.durSec.toFixed(2)}s)
            </span>
            {Math.abs(timeStretchRatio - 1.0) > 0.005 && (
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                ⇄ {timeStretchRatio.toFixed(2)}x {preservePitch ? 'PITCH LOCK' : 'VARISPEED'}
              </span>
            )}
            {chronoPins.length > 0 && (
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold">
                📌 {chronoPins.length} CHRONOPINS
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-[#05070E] border border-[#1E293B] rounded-lg px-1.5 py-0.5">
              <button
                onClick={() => {
                  const next = Math.max(1, zoomLevel / 2);
                  setZoomLevel(next);
                  setScrollOffset(prev => Math.min(prev, Math.max(0, 1 - 1 / next)));
                }}
                disabled={zoomLevel <= 1}
                className="p-0.5 text-[#94A3B8] hover:text-white disabled:opacity-30 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut size={12} />
              </button>
              <span className="text-[10px] text-[#00F0FF] font-bold px-1">{zoomLevel}x</span>
              <button
                onClick={() => setZoomLevel(prev => Math.min(8, prev * 2))}
                disabled={zoomLevel >= 8}
                className="p-0.5 text-[#94A3B8] hover:text-white disabled:opacity-30 cursor-pointer"
                title="Zoom In (inspect loop boundaries & transients)"
              >
                <ZoomIn size={12} />
              </button>
            </div>

            <button
              onClick={() => setSnapSelectionEnabled(prev => !prev)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                snapSelectionEnabled ? 'border-[#FF8C00] bg-[#FF8C00]/15 text-[#FFD700]' : 'border-[#1E293B] text-[#64748B] hover:text-white'
              }`}
              title={`Snap waveform selection to ${snapValue} grid (Alt bypasses)`}
            >
              <Magnet size={11} />
              <span>SNAP {snapValue}</span>
            </button>

            <button
              onClick={() => setZeroCrossingSnap(prev => !prev)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                zeroCrossingSnap ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300' : 'border-[#1E293B] text-[#64748B] hover:text-white'
              }`}
              title="Snap freeform selections to quietest local valley to avoid clicks"
            >
              ZERO-X
            </button>

            <button
              onClick={() => setShowChronoPinsOverlay(prev => !prev)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                showChronoPinsOverlay ? 'border-[#C084FC] bg-[#C084FC]/15 text-[#E9D5FF]' : 'border-[#1E293B] text-[#64748B]'
              }`}
              title="Show / drag ChronoPins measure anchors directly on the waveform"
            >
              <Clock size={11} />
              <span>CHRONOPINS ({chronoPins.length})</span>
            </button>

            <button
              onClick={() => setShowCrossfadeOverlay(prev => !prev)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                showCrossfadeOverlay ? 'border-[#FFD700] bg-[#FFD700]/15 text-[#FFD700]' : 'border-[#1E293B] text-[#64748B]'
              }`}
              title="Show head/tail loop crossfade curves on waveform"
            >
              <Waves size={11} />
              <span>XFADE OVERLAY</span>
            </button>

            <button
              onClick={() => setShowSilenceOverlays(prev => !prev)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                showSilenceOverlays ? 'border-[#EF4444] bg-[#EF4444]/15 text-[#EF4444]' : 'border-[#1E293B] text-[#64748B]'
              }`}
              title="Toggle silence overlay highlighting on waveform"
            >
              <VolumeX size={11} />
              <span>SILENCE</span>
            </button>

            <button
              onClick={() => setShowThresholdLine(prev => !prev)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                showThresholdLine ? 'border-[#FFD700] bg-[#FFD700]/15 text-[#FFD700]' : 'border-[#1E293B] text-[#64748B]'
              }`}
              title="Toggle dB threshold line"
            >
              <Activity size={11} />
              <span>THRESHOLD</span>
            </button>

            <button
              onClick={() => setLoopEnabled(!loopEnabled)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                loopEnabled ? 'border-[#00F0FF] bg-[#00F0FF]/15 text-[#00F0FF]' : 'border-[#1E293B] text-[#64748B]'
              }`}
            >
              <Repeat size={11} />
              <span>LOOP</span>
            </button>

            <button
              onClick={() => setMarkers([])}
              className="px-2 py-1 rounded-lg text-[10px] font-bold border border-[#1E293B] text-[#64748B] hover:text-white cursor-pointer"
            >
              CLEAR M
            </button>

            <button
              onClick={() => setWaveformExpanded(prev => !prev)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                waveformExpanded ? 'border-[#00F0FF] bg-[#00F0FF]/15 text-[#00F0FF]' : 'border-[#1E293B] text-[#94A3B8] hover:text-white'
              }`}
              title={waveformExpanded ? 'Compact waveform height' : 'Expand waveform height'}
            >
              {waveformExpanded ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
              <span>{waveformExpanded ? 'COMPACT' : 'TALL'}</span>
            </button>
          </div>
        </div>

        {/* Waveform Canvas with Non-Shifting Overlay Status Pill */}
        <div className="relative w-full">
          {statusNotice && (
            <div className="absolute top-2.5 right-2.5 z-20 max-w-[85%] px-3 py-1.5 rounded-xl bg-[#05070E]/92 backdrop-blur-md border border-[#00F0FF] text-[11px] font-bold text-white flex items-center gap-2 shadow-[0_0_16px_rgba(0,240,255,0.3)]">
              <Sparkles size={13} className="text-[#00F0FF] shrink-0 animate-pulse" />
              <span className="truncate">{statusNotice}</span>
              <button onClick={() => setStatusNotice(null)} className="text-[#64748B] hover:text-white cursor-pointer ml-1 shrink-0">
                ✕
              </button>
            </div>
          )}
          <canvas
            ref={canvasRef}
            width={1200}
            height={250}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            className={`w-full rounded-xl border border-[#141C2E] cursor-crosshair shadow-inner transition-[height] duration-200 ${
              waveformExpanded ? 'h-56 sm:h-64' : 'h-36 sm:h-40 lg:h-44'
            }`}
          />
          {zoomLevel > 1 && (
            <div className="mt-1.5 flex items-center gap-2 text-[10px] text-[#94A3B8]">
              <span>PAN:</span>
              <input
                type="range"
                min={0}
                max={Math.max(0, 1 - 1 / zoomLevel)}
                step={0.005}
                value={scrollOffset}
                onChange={(e) => setScrollOffset(Number(e.target.value))}
                className="flex-1 h-1.5 bg-[#1A263D] rounded-lg appearance-none cursor-pointer accent-[#00F0FF]"
              />
              <span>{Math.round(visibleWindow.start * 100)}% – {Math.round(visibleWindow.end * 100)}%</span>
            </div>
          )}
        </div>

        {/* Row 1: Region Selection, Clipboard & Structural Editing */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 px-2.5 py-1.5 bg-[#05070E] border border-[#141C2E] rounded-xl text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[9px] text-[#64748B] uppercase font-bold mr-1">REGION:</span>
            <button
              onClick={() => setRegion({ start: 0, end: 1 })}
              className="px-2.5 py-1 rounded-lg bg-[#101726] hover:bg-[#1A263D] border border-[#1E293B] text-white text-[11px] font-bold cursor-pointer"
              title="Select entire clip (Ctrl+A)"
            >
              SELECT ALL
            </button>
            {activeSelectionRange && (
              <button
                onClick={() => setRegion(null)}
                className="px-2 py-1 rounded-lg bg-[#101726] hover:bg-[#1A263D] border border-[#1E293B] text-[#94A3B8] hover:text-white text-[11px] cursor-pointer"
              >
                DESELECT
              </button>
            )}
            <button
              onClick={handleCutSelection}
              disabled={!activeSelectionRange}
              className="px-2.5 py-1 rounded-lg bg-[#101726] hover:bg-[#1A263D] border border-[#1E293B] text-white hover:text-[#EF4444] disabled:opacity-35 disabled:pointer-events-none flex items-center gap-1 text-[11px] font-bold cursor-pointer"
              title="Cut selection to clipboard (Ctrl+X)"
            >
              <Scissors size={11} />
              <span>CUT</span>
            </button>
            <button
              onClick={handleCopySelection}
              className="px-2.5 py-1 rounded-lg bg-[#101726] hover:bg-[#1A263D] border border-[#1E293B] text-white hover:text-[#00F0FF] flex items-center gap-1 text-[11px] font-bold cursor-pointer"
              title="Copy selection or full clip to clipboard (Ctrl+C)"
            >
              <Copy size={11} />
              <span>COPY</span>
            </button>
            <button
              onClick={handlePasteAtPlayhead}
              disabled={!clipboardBuffer}
              className="px-2.5 py-1 rounded-lg bg-[#101726] hover:bg-[#1A263D] border border-[#1E293B] text-white hover:text-[#10B981] disabled:opacity-35 disabled:pointer-events-none flex items-center gap-1 text-[11px] font-bold cursor-pointer"
              title="Insert clipboard audio at red playhead (Ctrl+V)"
            >
              <ClipboardPaste size={11} />
              <span>PASTE</span>
            </button>
            <button
              onClick={handleDeleteSelection}
              disabled={!activeSelectionRange}
              className="px-2.5 py-1 rounded-lg bg-[#101726] hover:bg-[#1A263D] border border-[#1E293B] text-white hover:text-[#EF4444] disabled:opacity-35 disabled:pointer-events-none flex items-center gap-1 text-[11px] font-bold cursor-pointer"
              title="Ripple-delete selected region (Del)"
            >
              <Trash2 size={11} />
              <span>DELETE</span>
            </button>
            <button
              onClick={handleCropToSelection}
              disabled={!activeSelectionRange}
              className="px-2.5 py-1 rounded-lg bg-[#101726] hover:bg-[#1A263D] border border-[#1E293B] text-white hover:text-[#FFD700] disabled:opacity-35 disabled:pointer-events-none flex items-center gap-1 text-[11px] font-bold cursor-pointer"
              title="Keep only the selected region"
            >
              <Crop size={11} />
              <span>CROP</span>
            </button>
            <button
              onClick={handleSilenceRegion}
              disabled={!activeSelectionRange}
              className="px-2.5 py-1 rounded-lg bg-[#101726] hover:bg-[#1A263D] border border-[#1E293B] text-white hover:text-amber-300 disabled:opacity-35 disabled:pointer-events-none flex items-center gap-1 text-[11px] font-bold cursor-pointer"
              title="Silence/mute breath or noise in selected region without changing timing"
            >
              <VolumeX size={11} />
              <span>SILENCE</span>
            </button>
            <button
              onClick={handleDuplicateLoop}
              className="px-2.5 py-1 rounded-lg bg-[#101726] hover:bg-[#1A263D] border border-[#1E293B] text-white hover:text-[#00F0FF] flex items-center gap-1 text-[11px] font-bold cursor-pointer"
              title="Append crossfaded copy (doubles loop or extends with selection)"
            >
              <Repeat size={11} />
              <span>2X / APPEND</span>
            </button>
          </div>

          <span className="text-[10px] text-[#64748B]">
            Drag to select · Shift+Click: Marker · Alt: Bypass Snap
          </span>
        </div>

        {/* Row 2: Fades, Gain, DSP & Varispeed */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 px-2.5 py-1.5 bg-[#05070E] border border-[#141C2E] rounded-xl text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[9px] text-[#64748B] uppercase font-bold mr-1">DSP:</span>
            <button
              onClick={handleFadeIn}
              className="px-2.5 py-1 rounded-lg bg-[#101726] hover:bg-[#1A263D] border border-[#1E293B] text-white hover:text-[#FFD700] flex items-center gap-1 text-[11px] font-bold cursor-pointer"
              title="Apply fade-in curve to selection (or clip head)"
            >
              <Volume2 size={11} />
              <span>FADE IN</span>
            </button>
            <button
              onClick={handleFadeOut}
              className="px-2.5 py-1 rounded-lg bg-[#101726] hover:bg-[#1A263D] border border-[#1E293B] text-white hover:text-[#FFD700] flex items-center gap-1 text-[11px] font-bold cursor-pointer"
              title="Apply fade-out curve to selection (or clip tail)"
            >
              <Volume2 size={11} />
              <span>FADE OUT</span>
            </button>
            <button
              onClick={handleNormalize}
              className="px-2.5 py-1 rounded-lg bg-[#101726] hover:bg-[#1A263D] border border-[#1E293B] text-white hover:text-[#00F0FF] flex items-center gap-1 text-[11px] font-bold cursor-pointer"
              title="Peak-normalize to -0.3 dB"
            >
              <ArrowLeftRight size={11} />
              <span>NORMALIZE</span>
            </button>
            <button
              onClick={handleReverse}
              className="px-2.5 py-1 rounded-lg bg-[#101726] hover:bg-[#1A263D] border border-[#1E293B] text-white hover:text-[#FF2E63] flex items-center gap-1 text-[11px] font-bold cursor-pointer"
              title="Reverse audio samples in selection or full clip"
            >
              <RotateCcw size={11} />
              <span>REVERSE</span>
            </button>
            <button
              onClick={handleInvertPolarity}
              className="px-2.5 py-1 rounded-lg bg-[#101726] hover:bg-[#1A263D] border border-[#1E293B] text-white hover:text-purple-300 text-[11px] font-bold cursor-pointer"
              title="Invert phase polarity (180° Ø)"
            >
              Ø POLARITY
            </button>
            <button
              onClick={handleRemoveDcOffset}
              className="px-2.5 py-1 rounded-lg bg-[#101726] hover:bg-[#1A263D] border border-[#1E293B] text-white hover:text-emerald-300 text-[11px] font-bold cursor-pointer"
              title="Center waveform to eliminate DC bias clicks"
            >
              DC ZERO
            </button>

            {/* Gain Trim Control */}
            <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-[#1E293B]">
              <span className="text-[10px] text-[#94A3B8]">GAIN:</span>
              <input
                type="range"
                min={-18}
                max={18}
                step={0.5}
                value={gainAdjustDb}
                onChange={(e) => setGainAdjustDb(Number(e.target.value))}
                className="w-20 h-1.5 bg-[#1A263D] rounded-lg appearance-none cursor-pointer accent-[#00F0FF]"
              />
              <span className="text-[10px] font-bold text-[#00F0FF] w-12">
                {gainAdjustDb > 0 ? `+${gainAdjustDb}` : gainAdjustDb} dB
              </span>
              <button
                onClick={() => handleApplyGain()}
                disabled={Math.abs(gainAdjustDb) < 0.05}
                className="px-2 py-0.5 rounded bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] hover:bg-[#00F0FF] hover:text-black text-[10px] font-bold disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
              >
                APPLY
              </button>
            </div>
          </div>

          {/* Varispeed / Pitch Quick Tools */}
          <div className="flex items-center gap-1">
            <Gauge size={12} className="text-[#A855F7]" />
            <span className="text-[9px] text-[#94A3B8] mr-1">SPEED:</span>
            <button
              onClick={() => handleVarispeed(0.5, '0.5x Halftime')}
              className="px-2 py-0.5 rounded bg-[#101726] hover:bg-[#1A263D] border border-[#1E293B] text-[10px] text-purple-300 font-bold cursor-pointer"
              title="Halftime (0.5x speed, -1 octave)"
            >
              0.5x
            </button>
            <button
              onClick={() => handleVarispeed(Math.pow(2, -1 / 12), '-1 Semitone')}
              className="px-2 py-0.5 rounded bg-[#101726] hover:bg-[#1A263D] border border-[#1E293B] text-[10px] text-[#CBD5E1] font-bold cursor-pointer"
              title="Varispeed -1 semitone"
            >
              -1st
            </button>
            <button
              onClick={() => handleVarispeed(Math.pow(2, 1 / 12), '+1 Semitone')}
              className="px-2 py-0.5 rounded bg-[#101726] hover:bg-[#1A263D] border border-[#1E293B] text-[10px] text-[#CBD5E1] font-bold cursor-pointer"
              title="Varispeed +1 semitone"
            >
              +1st
            </button>
            <button
              onClick={() => handleVarispeed(2.0, '2.0x Doubletime')}
              className="px-2 py-0.5 rounded bg-[#101726] hover:bg-[#1A263D] border border-[#1E293B] text-[10px] text-purple-300 font-bold cursor-pointer"
              title="Doubletime (2.0x speed, +1 octave)"
            >
              2.0x
            </button>
            <button
              onClick={handleResetOriginal}
              className="ml-2 px-2 py-0.5 rounded bg-[#121622] hover:bg-[#1E293B] border border-[#334155] text-[10px] text-[#94A3B8] hover:text-white flex items-center gap-1 cursor-pointer"
              title="Reset entire clip back to original state"
            >
              <RefreshCw size={10} />
              <span>RESET</span>
            </button>
          </div>
        </div>
      </div>

      {/* Independently Scrollable Bottom Controls Dock (Waveform stays pinned above) */}
      <div className="flex-1 min-h-0 flex flex-col mt-2.5">
        {/* Dock Panel Filter Bar */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 pb-2">
          <div className="flex flex-wrap items-center gap-1.5 bg-[#080B15] p-1 rounded-xl border border-[#1A2338]">
            {(
              [
                { id: 'all', label: 'ALL EDITING PANELS' },
                { id: 'stretch', label: 'TIME STRETCH' },
                { id: 'chrono', label: `CHRONOPINS (${chronoPins.length})` },
                { id: 'crossfade', label: 'LOOP CROSSFADE' },
                { id: 'silence', label: 'SILENCE TRIMMER' }
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveDockPanel(tab.id)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
                  activeDockPanel === tab.id
                    ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/50'
                    : 'text-[#64748B] hover:text-white border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-[#64748B]">
            Drag ChronoPin tags at top of waveform · Scroll panels below
          </span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3 pb-2">
          {/* DEDICATED NON-DESTRUCTIVE PITCH-LOCKED TIME STRETCH TOOL */}
          {(activeDockPanel === 'all' || activeDockPanel === 'stretch') && (
            <div className="p-4 bg-[#080C16] border border-emerald-500/35 rounded-2xl shadow-xl flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-[#152033]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/60 flex items-center justify-center">
                    <ArrowLeftRight size={16} className="text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      NON-DESTRUCTIVE TIME STRETCH (PITCH-LOCKED)
                    </h2>
                    <p className="text-[11px] text-[#64748B]">
                      Alter playback speed and update clip durationBars seamlessly while keeping original pitch, or drag the right edge of this clip in the timeline.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleToggleTimelineStretchMode}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold border transition-all flex items-center gap-1.5 cursor-pointer ${
                      timeStretchEnabled
                        ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.45)]'
                        : 'bg-[#0D1422] text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/15'
                    }`}
                    title="Enable dragging the right edge of the clip on the Mixer timeline to time-stretch directly"
                  >
                    <ArrowLeftRight size={13} />
                    <span>{timeStretchEnabled ? 'TIMELINE RIGHT-EDGE STRETCH: ON' : 'ENABLE TIMELINE RIGHT-EDGE STRETCH'}</span>
                  </button>

                  <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#05070E] border border-[#1E293B] text-[10px] font-bold text-[#CBD5E1] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preservePitch}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setPreservePitch(checked);
                        if (Math.abs(timeStretchRatio - 1.0) > 0.005) {
                          handleApplyTimeStretch(timeStretchRatio, checked);
                        }
                      }}
                      className="accent-emerald-400 cursor-pointer"
                    />
                    <span>Maintain Pitch (WSOLA)</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-6 p-3.5 rounded-xl bg-[#05070E] border border-[#18233C] flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#94A3B8] font-bold">PLAYBACK SPEED RATIO</span>
                    <span className="text-base font-black text-emerald-400">
                      {timeStretchRatio.toFixed(2)}x ({currentDurationBars.toFixed(2)} bars)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-[#64748B]">0.50x</span>
                    <input
                      type="range"
                      min={0.5}
                      max={2.0}
                      step={0.01}
                      value={timeStretchRatio}
                      onChange={(e) => setTimeStretchRatio(Number(e.target.value))}
                      className="flex-1 h-2 bg-[#1A263D] rounded-lg appearance-none cursor-pointer accent-emerald-400"
                    />
                    <span className="text-[10px] text-[#64748B]">2.00x</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#64748B]">
                    <span>Base length: {originalDurationBars.toFixed(2)} bars</span>
                    <span>Target stretch: {(originalDurationBars / Math.max(0.25, timeStretchRatio)).toFixed(2)} bars</span>
                  </div>
                </div>

                <div className="md:col-span-6 p-3.5 rounded-xl bg-[#05070E] border border-[#18233C] flex flex-col gap-2">
                  <span className="text-xs text-[#94A3B8] font-bold">QUICK STRETCH RATIOS &amp; APPLY</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { label: '0.50x (2x Long)', ratio: 0.5 },
                      { label: '0.75x (Slow)', ratio: 0.75 },
                      { label: '0.85x', ratio: 0.85 },
                      { label: '1.00x Reset', ratio: 1.0 },
                      { label: '1.25x', ratio: 1.25 },
                      { label: '1.50x (Fast)', ratio: 1.5 },
                      { label: '2.00x (Half Len)', ratio: 2.0 }
                    ].map(preset => (
                      <button
                        key={preset.label}
                        onClick={() => handleApplyTimeStretch(preset.ratio)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          Math.abs(timeStretchRatio - preset.ratio) < 0.015
                            ? 'bg-emerald-500 text-black border-emerald-400'
                            : 'bg-[#101726] border-[#1E293B] text-[#CBD5E1] hover:text-white'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      onClick={() => handleApplyTimeStretch(timeStretchRatio)}
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-[#00F0FF] text-black font-extrabold text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.35)] hover:brightness-110 cursor-pointer"
                    >
                      <ArrowLeftRight size={13} />
                      <span>RENDER {timeStretchRatio.toFixed(2)}x TIME STRETCH</span>
                    </button>
                    <span className="text-[9px] text-[#64748B]">
                      Tip: Hold Ctrl + Drag right edge in Timeline anytime
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DEDICATED CHRONOPINS PANEL (PER-MEASURE ANCHORS & TEMPO-DRIFT LATCH) */}
          {(activeDockPanel === 'all' || activeDockPanel === 'chrono') && (
            <div className="p-4 bg-[#080C16] border border-[#C084FC]/40 rounded-2xl shadow-xl flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-[#152033]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#C084FC]/15 border border-[#C084FC]/60 flex items-center justify-center">
                    <Clock size={16} className="text-[#C084FC]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      CHRONOPINS — MEASURE ANCHORS &amp; TEMPO-DRIFT LATCH
                    </h2>
                    <p className="text-[11px] text-[#64748B]">
                      Attach ChronoPins across every measure of a wave clip, drag pins onto drifting/slowed-down hits, and latch them cleanly back onto the {tempo} BPM grid.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={handleAutoDetectChronoPins}
                    className="px-3 py-1.5 rounded-xl bg-[#C084FC]/20 hover:bg-[#C084FC]/30 border border-[#C084FC]/60 text-[#E9D5FF] text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer"
                    title="Scan audio transients and attach a ChronoPin to every measure"
                  >
                    <Sparkles size={13} />
                    <span>ATTACH TO MEASURES</span>
                  </button>

                  <button
                    onClick={handleDropChronoPinAtPlayhead}
                    className="px-3 py-1.5 rounded-xl bg-[#101726] hover:bg-[#1A263D] border border-[#FFD700]/50 text-[#FFD700] text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                    title="Insert a new ChronoPin anchor at the red waveform playhead"
                  >
                    <Plus size={13} />
                    <span>DROP PIN AT PLAYHEAD</span>
                  </button>

                  <button
                    onClick={handleLatchChronoPinsToGrid}
                    disabled={chronoPins.length < 2}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#C084FC] to-[#00F0FF] text-black text-[11px] font-extrabold flex items-center gap-1.5 shadow-[0_0_14px_rgba(192,132,252,0.4)] hover:brightness-110 disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
                    title="Time-warp drifting/slowed segments between ChronoPins squarely onto the project BPM grid while preserving pitch"
                  >
                    <Magnet size={13} />
                    <span>LATCH TO {tempo} BPM GRID</span>
                  </button>

                  {chronoPins.length > 0 && (
                    <button
                      onClick={handleClearChronoPins}
                      className="px-2.5 py-1.5 rounded-xl bg-[#101726] hover:bg-[#1E293B] border border-[#334155] text-[#94A3B8] hover:text-white text-[10px] font-bold cursor-pointer"
                    >
                      CLEAR PINS
                    </button>
                  )}
                </div>
              </div>

              {chronoPins.length === 0 ? (
                <div className="p-3 rounded-xl bg-[#05070E] border border-dashed border-[#334155] flex flex-wrap items-center justify-between gap-2 text-xs text-[#94A3B8]">
                  <span>
                    No ChronoPins attached to this clip yet. Click <strong className="text-[#E9D5FF]">ATTACH TO MEASURES</strong> to auto-pin every measure (or drop custom pins at the playhead).
                  </span>
                  <button
                    onClick={handleAutoDetectChronoPins}
                    className="px-3 py-1 rounded-lg bg-[#C084FC] text-black font-extrabold text-[11px] cursor-pointer"
                  >
                    AUTO-PIN MEASURES NOW
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {/* Fine nudge toolbar for selected pin */}
                  {selectedChronoPinId && (
                    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-[#05070E] border border-[#1E293B] text-[10px]">
                      <span className="text-[#CBD5E1] font-bold">
                        Selected: {chronoPins.find(p => p.id === selectedChronoPinId)?.label || 'ChronoPin'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#64748B]">Nudge:</span>
                        <button
                          onClick={() => handleNudgeSelectedChronoPin(-15)}
                          className="px-2 py-0.5 rounded bg-[#101726] border border-[#1E293B] hover:text-white cursor-pointer"
                        >
                          -15ms
                        </button>
                        <button
                          onClick={() => handleNudgeSelectedChronoPin(-5)}
                          className="px-2 py-0.5 rounded bg-[#101726] border border-[#1E293B] hover:text-white cursor-pointer"
                        >
                          -5ms
                        </button>
                        <button
                          onClick={() => handleNudgeSelectedChronoPin(5)}
                          className="px-2 py-0.5 rounded bg-[#101726] border border-[#1E293B] hover:text-white cursor-pointer"
                        >
                          +5ms
                        </button>
                        <button
                          onClick={() => handleNudgeSelectedChronoPin(15)}
                          className="px-2 py-0.5 rounded bg-[#101726] border border-[#1E293B] hover:text-white cursor-pointer"
                        >
                          +15ms
                        </button>
                        <button
                          onClick={() => handleSnapPinToIdealBeat(selectedChronoPinId)}
                          className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold cursor-pointer"
                        >
                          Snap Pin to Beat
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Measure ChronoPin Chip Strip */}
                  <div className="flex flex-wrap gap-2">
                    {chronoPins.map(pin => {
                      const isSel = pin.id === selectedChronoPinId;
                      const beatSec = 60 / Math.max(30, tempo);
                      const firstPin = chronoPins[0];
                      const firstBeatPos = firstPin ? (firstPin.measure - 1) * 4 + (firstPin.beat - 1) : 0;
                      const beatPos = (pin.measure - 1) * 4 + (pin.beat - 1);
                      const idealSec = (firstPin?.timeSeconds ?? 0) + (beatPos - firstBeatPos) * beatSec;
                      const driftMs = Math.round((pin.timeSeconds - idealSec) * 1000);

                      return (
                        <div
                          key={pin.id}
                          onClick={() => {
                            setSelectedChronoPinId(pin.id);
                            if (clipDurationSeconds > 0) {
                              setPlayheadX(Math.max(0, Math.min(1, pin.timeSeconds / clipDurationSeconds)));
                            }
                          }}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-[10px] transition-all cursor-pointer ${
                            isSel
                              ? 'bg-[#C084FC]/20 border-[#C084FC] text-white shadow-[0_0_10px_rgba(192,132,252,0.25)]'
                              : pin.isDownbeat
                                ? 'bg-[#05070E] border-[#FFD700]/50 text-[#FFD700]'
                                : 'bg-[#05070E] border-[#1E293B] text-[#CBD5E1] hover:border-[#334155]'
                          }`}
                        >
                          <span className="font-black">Bar {pin.measure}.{pin.beat}</span>
                          <span className="text-[#94A3B8]">{pin.timeSeconds.toFixed(2)}s</span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold ${
                              Math.abs(driftMs) <= 8
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                            title="Timing drift vs ideal project BPM grid"
                          >
                            {driftMs === 0 ? 'LOCKED' : `${driftMs > 0 ? '+' : ''}${driftMs}ms`}
                          </span>
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation();
                              handleToggleChronoPinLock(pin.id);
                            }}
                            className="text-[#94A3B8] hover:text-white cursor-pointer"
                            title={pin.isLocked ? 'Unlock ChronoPin' : 'Lock ChronoPin'}
                          >
                            {pin.isLocked ? <Lock size={11} className="text-[#FFD700]" /> : <Unlock size={11} />}
                          </button>
                          {!pin.isDownbeat && (
                            <button
                              onClick={(ev) => {
                                ev.stopPropagation();
                                handleDeleteChronoPin(pin.id);
                              }}
                              className="text-[#64748B] hover:text-[#EF4444] cursor-pointer"
                              title="Remove ChronoPin"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DEDICATED LOOP BOUNDARY CROSSFADE STUDIO */}
          {(activeDockPanel === 'all' || activeDockPanel === 'crossfade') && (
            <div className="p-4 bg-[#080C16] border border-[#00F0FF]/35 rounded-2xl shadow-xl flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-[#152033]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#00F0FF]/15 border border-[#00F0FF]/60 flex items-center justify-center">
                    <Repeat size={16} className="text-[#00F0FF]" />
                  </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                SEAMLESS LOOP BOUNDARY CROSSFADE
              </h2>
              <p className="text-[11px] text-[#64748B]">
                Crossfade the end of a loop smoothly back into its beginning for click-free, fluid repetition.
              </p>
            </div>
          </div>

          {/* Quick Crossfade Presets */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#05070E] p-1 rounded-xl border border-[#18233C]">
            <span className="text-[9px] text-[#64748B] px-1.5 font-bold uppercase">PRESETS:</span>
            {[
              { label: '10ms Tight', ms: 10 },
              { label: '25ms Drums', ms: 25 },
              { label: '60ms Smooth', ms: 60 },
              { label: '150ms Pad', ms: 150 },
              { label: '300ms Wash', ms: 300 }
            ].map(p => (
              <button
                key={p.label}
                onClick={() => setLoopCrossfadeMs(p.ms)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                  loopCrossfadeMs === p.ms
                    ? 'bg-[#00F0FF]/20 border-[#00F0FF] text-[#00F0FF]'
                    : 'bg-[#101726] border-[#1E293B] text-[#94A3B8] hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Crossfade Length Slider */}
          <div className="md:col-span-5 p-3.5 rounded-xl bg-[#05070E] border border-[#18233C] flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#94A3B8] font-bold">CROSSFADE LENGTH</span>
              <span className="text-base font-black text-[#00F0FF]">{loopCrossfadeMs} ms</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-[#64748B]">5ms</span>
              <input
                type="range"
                min={5}
                max={400}
                step={5}
                value={loopCrossfadeMs}
                onChange={(e) => setLoopCrossfadeMs(Number(e.target.value))}
                className="flex-1 h-2 bg-[#1A263D] rounded-lg appearance-none cursor-pointer accent-[#00F0FF]"
              />
              <span className="text-[10px] text-[#64748B]">400ms</span>
            </div>
            <span className="text-[9px] text-[#64748B]">
              Blends {loopCrossfadeMs}ms across the end → start loop seam
            </span>
          </div>

          {/* Curve Shape */}
          <div className="md:col-span-3 p-3.5 rounded-xl bg-[#05070E] border border-[#18233C] flex flex-col gap-2">
            <span className="text-xs text-[#94A3B8] font-bold">CROSSFADE CURVE</span>
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  { id: 'equal_power', label: 'Eq-Pwr' },
                  { id: 's_curve', label: 'S-Curve' },
                  { id: 'linear', label: 'Linear' }
                ] as const
              ).map(c => (
                <button
                  key={c.id}
                  onClick={() => setLoopCrossfadeCurve(c.id)}
                  className={`py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    loopCrossfadeCurve === c.id
                      ? 'bg-[#FFD700] text-black shadow-[0_0_8px_rgba(255,215,0,0.4)]'
                      : 'bg-[#101726] text-[#64748B] hover:text-white'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <span className="text-[9px] text-[#64748B]">
              {loopCrossfadeCurve === 'equal_power'
                ? 'Constant RMS energy across loop seam'
                : loopCrossfadeCurve === 's_curve'
                  ? 'Smooth cosine transition with gentle tails'
                  : 'Straight linear ramp crossfade'}
            </span>
          </div>

          {/* Seam Mode & Tempo Lock */}
          <div className="md:col-span-4 p-3.5 rounded-xl bg-[#05070E] border border-[#18233C] flex flex-col gap-2">
            <span className="text-xs text-[#94A3B8] font-bold">LOOP BLEND MODE</span>
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => setLoopCrossfadeStyle('overlap_loop')}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  loopCrossfadeStyle === 'overlap_loop'
                    ? 'bg-[#00F0FF] text-black'
                    : 'bg-[#101726] text-[#64748B] hover:text-white'
                }`}
              >
                Tail → Head Blend
              </button>
              <button
                onClick={() => setLoopCrossfadeStyle('edge_fades')}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  loopCrossfadeStyle === 'edge_fades'
                    ? 'bg-[#00F0FF] text-black'
                    : 'bg-[#101726] text-[#64748B] hover:text-white'
                }`}
              >
                Edge Micro-Fades
              </button>
            </div>
            <label className="flex items-center gap-2 text-[10px] text-[#CBD5E1] cursor-pointer">
              <input
                type="checkbox"
                checked={preserveLoopTempo}
                onChange={(e) => setPreserveLoopTempo(e.target.checked)}
                className="accent-[#00F0FF] cursor-pointer"
              />
              <span>Keep exact bar/BPM loop length ({currentDurationBars.toFixed(2)} bars)</span>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleApplyLoopCrossfade}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00F0FF] to-[#10B981] text-black font-extrabold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(0,240,255,0.35)] hover:brightness-110 active:scale-95 cursor-pointer"
            >
              <Repeat size={14} />
              <span>APPLY LOOP CROSSFADE</span>
            </button>

            <button
              onClick={() => togglePlay('seam')}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all cursor-pointer ${
                isPlaying && isPreviewingSeam
                  ? 'bg-[#FF2E63] border-[#FF2E63] text-white shadow-[0_0_12px_rgba(255,46,99,0.5)]'
                  : 'bg-[#101726] border-[#FFD700]/50 text-[#FFD700] hover:bg-[#FFD700]/15'
              }`}
              title="Jump near the end of the loop and audition the end → start seam live with crossfade applied"
            >
              {isPlaying && isPreviewingSeam ? <Pause size={13} /> : <Play size={13} />}
              <span>{isPlaying && isPreviewingSeam ? 'STOP SEAM PREVIEW' : 'TEST LOOP SEAM'}</span>
            </button>
          </div>

          <span className="text-[10px] text-[#64748B]">
            Gold curve = Head fade-in · Emerald curve = Tail fade-out
          </span>
        </div>
      </div>
          )}

      {/* DEDICATED SILENCE DETECTION & AUTO-TRIM CONTROL CENTER */}
      {(activeDockPanel === 'all' || activeDockPanel === 'silence') && (
      <div className="p-4 bg-[#080C16] border border-[#1E293B] rounded-2xl shadow-xl flex flex-col gap-3">
        {/* Panel Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-[#152033]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EF4444]/20 border border-[#EF4444]/60 flex items-center justify-center">
              <VolumeX size={16} className="text-[#EF4444]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                AUTOMATIC SILENCE DETECTOR &amp; TRIMMER
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
          <div className="md:col-span-6 p-3.5 rounded-xl bg-[#05070E] border border-[#18233C] flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#94A3B8] font-bold flex items-center gap-1.5">
                <Sliders size={13} className="text-[#FFD700]" />
                SENSITIVITY THRESHOLD
              </span>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-[#FFD700]">{sensitivityDb} dB</span>
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
          </div>

          <div className="md:col-span-3 p-3.5 rounded-xl bg-[#05070E] border border-[#18233C] flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#94A3B8] font-bold flex items-center gap-1.5">
                <ShieldAlertIcon size={13} className="text-[#00F0FF]" />
                SAFETY PADDING
              </span>
              <span className="text-base font-black text-[#00F0FF]">{safetyPaddingMs} ms</span>
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
          </div>

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
          </div>
        </div>

        {/* Telemetry Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-[#05070E] border border-[#18233C] flex flex-col justify-between">
            <span className="text-[10px] text-[#64748B] uppercase">Leading Silence</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-[#EF4444]">{silenceResult.leadingSilenceSeconds}s</span>
              <span className="text-[10px] text-[#64748B]">({silenceResult.leadingSilenceBars} bars)</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#05070E] border border-[#18233C] flex flex-col justify-between">
            <span className="text-[10px] text-[#64748B] uppercase">Trailing Silence</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-[#EF4444]">{silenceResult.trailingSilenceSeconds}s</span>
              <span className="text-[10px] text-[#64748B]">({silenceResult.trailingSilenceBars} bars)</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#05070E] border border-[#18233C] flex flex-col justify-between">
            <span className="text-[10px] text-[#64748B] uppercase">Active Audio Core</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-emerald-400">{silenceResult.activeDurationSeconds}s</span>
              <span className="text-[10px] text-[#64748B]">({silenceResult.activeDurationBars} bars)</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#05070E] border border-[#18233C] flex flex-col justify-between">
            <span className="text-[10px] text-[#64748B] uppercase">Timeline Savings</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-[#FFD700]">{silenceResult.trimmedPercent}%</span>
              <span className="text-[10px] text-[#64748B]">freed</span>
            </div>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleTrimSilence}
              disabled={!silenceResult.hasSilence}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#EF4444] via-[#F97316] to-[#FFD700] text-black font-extrabold text-xs flex items-center gap-2 transition-all shadow-[0_0_18px_rgba(239,68,68,0.4)] hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <Scissors size={14} />
              <span>AUTO-TRIM SILENCE NOW</span>
            </button>

            <button
              onClick={() => togglePlay('trimmed')}
              className="px-4 py-2 rounded-xl bg-[#101726] hover:bg-[#1A263D] border border-[#1E293B] text-white hover:text-[#00F0FF] font-bold text-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <Play size={13} className="text-[#00F0FF]" />
              <span>AUDITION TRIMMED CORE</span>
            </button>

            {isTrimmed && (
              <button
                onClick={handleResetOriginal}
                className="px-3.5 py-2 rounded-xl bg-[#101726] hover:bg-[#1A263D] border border-[#1E293B] text-[#94A3B8] hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Undo2 size={13} />
                <span>RESTORE ORIGINAL</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <Info size={13} className="text-[#00F0FF]" />
            <span>Auto-trim updates clip bounds on timeline automatically</span>
          </div>
        </div>
      </div>
      )}
        </div>
      </div>
    </div>
  );
};

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
