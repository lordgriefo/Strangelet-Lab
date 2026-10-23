import React, { useState, useEffect, useRef } from 'react';
import {
  FolderOpen,
  FileAudio,
  Upload,
  Play,
  Pause,
  Download,
  Trash2,
  Sparkles,
  Zap,
  Cpu,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Sliders,
  Volume2,
  Activity,
  HardDrive,
  FileArchive,
  BarChart2,
  ShieldCheck,
  Disc,
  ArrowRight
} from 'lucide-react';
import { GoldPathPreset } from '../types';
import {
  BatchItem,
  BatchItemStatus,
  StemCategory,
  detectStemCategory,
  formatBytes,
  formatDuration,
  renderBufferThroughGoldPath,
  decodeAudioFile,
  createDemoStemSession,
  createDemoAlbumSession,
  createBatchMasteringZip,
  analyzeAudioBuffer
} from '../services/batchMasteringEngine';
import { playLaserBeamSound, playColliderInjectionSound } from '../lib/laserSound';

interface BatchProcessingViewProps {
  activeGoldPreset: GoldPathPreset;
  allPresets: GoldPathPreset[];
  onSelectPreset: (presetId: string) => void;
  onOpenChainRack?: () => void;
}

export const BatchProcessingView: React.FC<BatchProcessingViewProps> = ({
  activeGoldPreset,
  allPresets,
  onSelectPreset,
  onOpenChainRack
}) => {
  // Batch Queue State
  const [queue, setQueue] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Configuration State
  const [stemHeadroomMode, setStemHeadroomMode] = useState<boolean>(false);
  const [targetLufsPreset, setTargetLufsPreset] = useState<number>(activeGoldPreset.parameters.targetLufs || -14);
  const [ceilingDbOverride, setCeilingDbOverride] = useState<number>(activeGoldPreset.parameters.ceilingDb || -1.0);
  
  // Multi-Core Parallel Processing State
  const hardwareCores = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4;
  const [parallelProcessing, setParallelProcessing] = useState<boolean>(true);
  const [concurrency, setConcurrency] = useState<number>(Math.min(8, Math.max(2, hardwareCores)));
  
  // Real-Time Core Telemetry
  const [coreStatus, setCoreStatus] = useState<{ id: number; active: boolean; currentItemName?: string }[]>(() => {
    return Array.from({ length: 8 }, (_, i) => ({ id: i + 1, active: false }));
  });

  // Batch Progress Metrics
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [zipProgress, setZipProgress] = useState<number | null>(null);

  // Audio Auditioning State
  const [playingItemId, setPlayingItemId] = useState<string | null>(null);
  const [auditionSlot, setAuditionSlot] = useState<Record<string, 'dry' | 'mastered'>>({});
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // File Input References
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cancellation and processing control refs
  const abortControllerRef = useRef<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync default target LUFS when preset changes
  useEffect(() => {
    setTargetLufsPreset(activeGoldPreset.parameters.targetLufs || -14);
    setCeilingDbOverride(activeGoldPreset.parameters.ceilingDb || -1.0);
  }, [activeGoldPreset.id]);

  // Timer for elapsed batch processing
  useEffect(() => {
    let timer: any;
    if (isProcessing && !isPaused) {
      timer = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isProcessing, isPaused]);

  // Clean up Web Audio preview on unmount
  useEffect(() => {
    return () => {
      if (activeSourceRef.current) {
        try {
          activeSourceRef.current.stop();
        } catch (e) {}
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Update Core Telemetry based on Concurrency
  useEffect(() => {
    setCoreStatus(prev => {
      const targetCount = parallelProcessing ? concurrency : 1;
      return Array.from({ length: targetCount }, (_, i) => ({
        id: i + 1,
        active: prev[i]?.active || false,
        currentItemName: prev[i]?.currentItemName
      }));
    });
  }, [concurrency, parallelProcessing]);

  // Stop active audio audition playback
  const stopAudition = () => {
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.stop();
      } catch (e) {}
      activeSourceRef.current = null;
    }
    setPlayingItemId(null);
  };

  // Play audition track with A/B Dry vs Mastered toggle
  const handleToggleAudition = async (item: BatchItem) => {
    if (playingItemId === item.id) {
      stopAudition();
      return;
    }

    stopAudition();

    const slot = auditionSlot[item.id] || (item.outputBuffer ? 'mastered' : 'dry');
    let bufferToPlay = slot === 'mastered' && item.outputBuffer ? item.outputBuffer : item.inputBuffer;

    if (!bufferToPlay && item.file) {
      try {
        bufferToPlay = await decodeAudioFile(item.file);
      } catch (e) {
        showToast('Unable to preview track audio.');
        return;
      }
    }

    if (!bufferToPlay) return;

    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    const src = audioContextRef.current.createBufferSource();
    src.buffer = bufferToPlay;
    src.connect(audioContextRef.current.destination);
    src.onended = () => {
      setPlayingItemId(null);
      activeSourceRef.current = null;
    };

    activeSourceRef.current = src;
    src.start(0);
    setPlayingItemId(item.id);
  };

  // Switch A/B slot during audition
  const handleToggleAuditionSlot = (itemId: string, item: BatchItem) => {
    const current = auditionSlot[itemId] || (item.outputBuffer ? 'mastered' : 'dry');
    const next = current === 'mastered' ? 'dry' : 'mastered';
    setAuditionSlot(prev => ({ ...prev, [itemId]: next }));

    if (playingItemId === itemId) {
      stopAudition();
      setTimeout(() => {
        handleToggleAudition(item);
      }, 50);
    }
  };

  // Helper to add files to queue
  const addFilesToQueue = (files: File[]) => {
    const audioFiles = files.filter(f => {
      const ext = f.name.toLowerCase();
      return ext.endsWith('.wav') || ext.endsWith('.mp3') || ext.endsWith('.flac') ||
             ext.endsWith('.ogg') || ext.endsWith('.m4a') || ext.endsWith('.aac') ||
             ext.endsWith('.aif') || ext.endsWith('.aiff') || f.type.startsWith('audio/');
    });

    if (audioFiles.length === 0) {
      showToast('No valid audio files detected in selection.');
      return;
    }

    const newItems: BatchItem[] = audioFiles.map(file => {
      const category = detectStemCategory(file.name);
      return {
        id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        name: file.name,
        size: file.size,
        stemType: category,
        status: 'queued',
        progress: 0,
        currentStageText: 'Queued',
        durationSeconds: 0,
        sampleRate: 44100,
        channels: 2
      };
    });

    setQueue(prev => [...prev, ...newItems]);
    playColliderInjectionSound();
    showToast(`Added ${newItems.length} audio file${newItems.length > 1 ? 's' : ''} to mastering queue.`);
  };

  // Folder drop recursive reader
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const items = e.dataTransfer.items;
    const filesToProcess: File[] = [];

    if (items && items.length > 0) {
      const entryPromises: Promise<void>[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (typeof item.webkitGetAsEntry === 'function') {
          const entry = item.webkitGetAsEntry();
          if (entry) {
            entryPromises.push(scanFileSystemEntry(entry, filesToProcess));
          }
        } else {
          const file = item.getAsFile();
          if (file) filesToProcess.push(file);
        }
      }

      await Promise.all(entryPromises);
      if (filesToProcess.length > 0) {
        addFilesToQueue(filesToProcess);
        return;
      }
    }

    // Fallback standard files drop
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(Array.from(e.dataTransfer.files));
    }
  };

  // Helper to scan directory entries
  const scanFileSystemEntry = async (entry: any, fileList: File[]): Promise<void> => {
    if (entry.isFile) {
      return new Promise<void>((resolve) => {
        entry.file((file: File) => {
          fileList.push(file);
          resolve();
        }, () => resolve());
      });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      return new Promise<void>((resolve) => {
        const readEntries = () => {
          dirReader.readEntries(async (entries: any[]) => {
            if (entries.length === 0) {
              resolve();
            } else {
              for (const child of entries) {
                await scanFileSystemEntry(child, fileList);
              }
              readEntries();
            }
          }, () => resolve());
        };
        readEntries();
      });
    }
  };

  // Load Demo Session
  const handleLoadDemoStems = () => {
    const demoItems = createDemoStemSession();
    setQueue(prev => [...prev, ...demoItems]);
    playColliderInjectionSound();
    showToast('Loaded 5-stem multitrack session demo (Drums, Bass, Vocal, Guitar, Synth).');
  };

  const handleLoadDemoAlbum = () => {
    const albumItems = createDemoAlbumSession();
    setQueue(prev => [...prev, ...albumItems]);
    playColliderInjectionSound();
    showToast('Loaded 3 full-mix tracks for album auto-mastering.');
  };

  // Remove single item
  const handleRemoveItem = (id: string) => {
    if (playingItemId === id) stopAudition();
    setQueue(prev => prev.filter(i => i.id !== id));
    playLaserBeamSound('laser_erase');
  };

  // Clear completed or all
  const handleClearCompleted = () => {
    setQueue(prev => prev.filter(i => i.status !== 'completed'));
    showToast('Cleared completed items from queue.');
  };

  const handleClearAll = () => {
    if (isProcessing) {
      showToast('Please stop batch mastering before clearing.');
      return;
    }
    stopAudition();
    setQueue([]);
    setElapsedSeconds(0);
    showToast('Cleared mastering queue.');
  };

  // =========================================================================
  // PARALLEL BATCH PROCESS DISPATCHER
  // =========================================================================
  const handleStartBatch = async () => {
    const queuedItems = queue.filter(i => i.status === 'queued' || i.status === 'error');
    if (queuedItems.length === 0) {
      showToast('No pending tracks in queue to master.');
      return;
    }

    setIsProcessing(true);
    setIsPaused(false);
    abortControllerRef.current = false;
    playColliderInjectionSound();
    showToast(`Started Gold Path batch mastering with ${parallelProcessing ? `${concurrency} parallel cores` : 'single sequential core'}...`);

    // Worker pool execution
    const maxWorkers = parallelProcessing ? concurrency : 1;
    let nextIndex = 0;
    const totalItems = queue.length;

    // Worker function
    const runWorker = async (workerId: number) => {
      while (!abortControllerRef.current) {
        // Find next item to process
        let targetItem: BatchItem | null = null;
        setQueue(prev => {
          const itemIndex = prev.findIndex(item => item.status === 'queued' || item.status === 'error');
          if (itemIndex === -1) return prev;
          targetItem = { ...prev[itemIndex], status: 'decoding', workerId };
          const updated = [...prev];
          updated[itemIndex] = targetItem;
          return updated;
        });

        // If no more items, worker terminates
        if (!targetItem) {
          setCoreStatus(prev => prev.map(c => c.id === workerId ? { ...c, active: false, currentItemName: undefined } : c));
          break;
        }

        const currentItem = targetItem as BatchItem;
        const startTime = Date.now();

        // Update core status telemetry
        setCoreStatus(prev => prev.map(c => c.id === workerId ? { ...c, active: true, currentItemName: currentItem.name } : c));

        try {
          // 1. Decode audio
          let inputBuffer: AudioBuffer;
          if (currentItem.inputBuffer) {
            inputBuffer = currentItem.inputBuffer;
          } else if (currentItem.file) {
            inputBuffer = await decodeAudioFile(currentItem.file);
          } else {
            throw new Error('No audio source file provided');
          }

          const inputAnalysis = analyzeAudioBuffer(inputBuffer);

          // Update item to processing
          setQueue(prev => prev.map(item => item.id === currentItem.id ? {
            ...item,
            status: 'processing',
            durationSeconds: inputBuffer.duration,
            sampleRate: inputBuffer.sampleRate,
            channels: inputBuffer.numberOfChannels,
            inputPeakDb: inputAnalysis.peakDb,
            inputBuffer
          } : item));

          // 2. Render through Gold Path DSP
          const result = await renderBufferThroughGoldPath(
            inputBuffer,
            activeGoldPreset,
            {
              stemHeadroomMode,
              targetLufsOverride: targetLufsPreset,
              ceilingDbOverride,
              onStageUpdate: (progress, stageName) => {
                setQueue(prev => prev.map(item => item.id === currentItem.id ? {
                  ...item,
                  progress,
                  currentStageText: stageName,
                  status: progress >= 75 ? 'limiting' : 'processing'
                } : item));
              }
            }
          );

          const durationMs = Date.now() - startTime;
          const outputUrl = URL.createObjectURL(result.outputBlob);

          // Mark complete
          setQueue(prev => prev.map(item => item.id === currentItem.id ? {
            ...item,
            status: 'completed',
            progress: 100,
            currentStageText: 'Mastered',
            outputBuffer: result.outputBuffer,
            outputPeakDb: result.outputPeakDb,
            outputLufs: result.outputLufs,
            dynamicRangeDb: result.dynamicRangeDb,
            outputBlob: result.outputBlob,
            outputUrl,
            processingTimeMs: durationMs
          } : item));

        } catch (err: any) {
          setQueue(prev => prev.map(item => item.id === currentItem.id ? {
            ...item,
            status: 'error',
            progress: 0,
            currentStageText: 'Failed',
            errorMessage: err?.message || 'Processing error'
          } : item));
        }

        // Brief delay between jobs
        await new Promise(r => setTimeout(r, 60));
      }

      setCoreStatus(prev => prev.map(c => c.id === workerId ? { ...c, active: false, currentItemName: undefined } : c));
    };

    // Launch worker pool
    const workers = Array.from({ length: maxWorkers }, (_, i) => runWorker(i + 1));
    await Promise.all(workers);

    setIsProcessing(false);
    playLaserBeamSound('laser_curve');
    showToast('Batch mastering complete!');
  };

  const handleStopBatch = () => {
    abortControllerRef.current = true;
    setIsProcessing(false);
    showToast('Batch processing paused / halted.');
  };

  // Download single mastered WAV
  const handleDownloadItem = (item: BatchItem) => {
    if (!item.outputBlob) return;
    const url = item.outputUrl || URL.createObjectURL(item.outputBlob);
    const a = document.createElement('a');
    a.href = url;
    const cleanName = item.name.replace(/\.[^/.]+$/, '');
    a.download = `${cleanName}_Mastered.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    playLaserBeamSound('laser_select');
  };

  // Download All as ZIP
  const handleDownloadAllZip = async () => {
    const completedItems = queue.filter(i => i.status === 'completed' && i.outputBlob);
    if (completedItems.length === 0) {
      showToast('No completed tracks to download.');
      return;
    }

    try {
      setZipProgress(1);
      showToast('Compiling ZIP archive of all mastered files...');
      
      const zipBlob = await createBatchMasteringZip(
        queue,
        activeGoldPreset,
        (progress) => setZipProgress(progress)
      );

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Strangelet_GoldPath_Mastered_${activeGoldPreset.name.replace(/[^a-zA-Z0-9]/g, '_')}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setZipProgress(null);
      playColliderInjectionSound();
      showToast('Successfully downloaded ZIP archive!');
    } catch (err: any) {
      setZipProgress(null);
      showToast(`ZIP generation failed: ${err?.message || 'Error'}`);
    }
  };

  // Aggregate stats
  const completedCount = queue.filter(i => i.status === 'completed').length;
  const inProgressCount = queue.filter(i => i.status === 'processing' || i.status === 'decoding' || i.status === 'limiting').length;
  const queuedCount = queue.filter(i => i.status === 'queued').length;
  const overallProgress = queue.length > 0 ? Math.round((completedCount / queue.length) * 100) : 0;
  const totalAudioDuration = queue.reduce((acc, item) => acc + (item.durationSeconds || 0), 0);

  // ETA Estimation
  const completedItems = queue.filter(i => i.status === 'completed' && i.processingTimeMs);
  const avgTimePerTrackMs = completedItems.length > 0 
    ? completedItems.reduce((acc, i) => acc + (i.processingTimeMs || 0), 0) / completedItems.length 
    : 1800;
  const remainingTracks = queuedCount + inProgressCount;
  const activeWorkers = parallelProcessing ? concurrency : 1;
  const estimatedSecondsRemaining = Math.ceil((remainingTracks * avgTimePerTrackMs) / (activeWorkers * 1000));

  return (
    <div className="flex flex-col gap-6 animate-fade-in font-mono select-none">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[9999] px-4 py-2.5 rounded-xl bg-amber-950/95 border border-amber-400 text-amber-200 text-xs shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center gap-2 animate-fade-in backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden File Inputs for Browse */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept="audio/*,.wav,.mp3,.flac,.ogg,.m4a,.aif,.aiff"
        onChange={(e) => {
          if (e.target.files) addFilesToQueue(Array.from(e.target.files));
        }}
        className="hidden"
      />
      <input
        type="file"
        ref={folderInputRef}
        multiple
        // @ts-ignore
        webkitdirectory="true"
        // @ts-ignore
        directory="true"
        onChange={(e) => {
          if (e.target.files) addFilesToQueue(Array.from(e.target.files));
        }}
        className="hidden"
      />

      {/* ========================================================================= */}
      {/* 1. TOP HEADER & ACTIVE GOLD PATH CHAIN CONFIGURATION STRIP                 */}
      {/* ========================================================================= */}
      <div className="bg-[#090C19] border border-[#212948] rounded-2xl p-5 shadow-xl flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/30 text-amber-400">
              <Layers size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white tracking-wide uppercase">
                  Batch Multi-Core Auto-Mastering
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300">
                  GOLD PATH DSP
                </span>
              </div>
              <p className="text-xs text-[#8E94B4]">
                Drag a folder of stems or full tracks for instant parallel multi-core mastering, brickwall limiting, and loudness alignment.
              </p>
            </div>
          </div>

          {/* Quick link to Gold Path Rack */}
          {onOpenChainRack && (
            <button
              onClick={onOpenChainRack}
              className="px-3 py-1.5 rounded-xl bg-[#12182D] hover:bg-[#1A2342] text-amber-400 border border-[#232F52] hover:border-amber-400/50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Sliders size={13} />
              <span>Tweak Chain Rack &rarr;</span>
            </button>
          )}
        </div>

        {/* Current Gold Path Preset Selector & Chain Snapshot */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[#17203A]">
          {/* Preset Selector */}
          <div className="p-3 rounded-xl bg-[#050711] border border-[#19233E] flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={11} />
              Active Mastering Profile:
            </span>
            <select
              value={activeGoldPreset.id}
              onChange={(e) => onSelectPreset(e.target.value)}
              className="bg-[#0A0E1F] border border-[#232E52] text-amber-300 font-bold text-xs rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              <optgroup label="FACTORY PRESETS">
                {allPresets.filter(p => p.category === 'Factory').map(p => (
                  <option key={p.id} value={p.id} className="bg-[#0A0D1E] text-white">
                    {p.name}
                  </option>
                ))}
              </optgroup>
              {allPresets.some(p => p.category === 'User') && (
                <optgroup label="USER PRESETS">
                  {allPresets.filter(p => p.category === 'User').map(p => (
                    <option key={p.id} value={p.id} className="bg-[#0A0D1E] text-cyan-300">
                      ⭐ {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <div className="text-[10px] text-[#717A9B] truncate">
              {activeGoldPreset.description}
            </div>
          </div>

          {/* Stem Mode vs Full Track Master Mode */}
          <div className="p-3 rounded-xl bg-[#050711] border border-[#19233E] flex flex-col justify-between gap-1.5">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
              <Activity size={11} />
              Processing Mode & Headroom:
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setStemHeadroomMode(false)}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all text-center ${
                  !stemHeadroomMode
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-md'
                    : 'bg-[#0E1428] text-[#7E88AA] hover:text-white'
                }`}
                title="Full track mastering with loudness maximizer and ceiling containment"
              >
                Full Track Master
              </button>
              <button
                onClick={() => setStemHeadroomMode(true)}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all text-center ${
                  stemHeadroomMode
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-black shadow-md'
                    : 'bg-[#0E1428] text-[#7E88AA] hover:text-white'
                }`}
                title="Preserves -4.5 dB headroom so stems sum cleanly without clipping in a DAW"
              >
                Stem Submix (-4.5dB)
              </button>
            </div>
            <span className="text-[10px] text-[#64748B]">
              {stemHeadroomMode ? 'Stem Headroom Protection Active (Prevents sum clipping)' : 'Commercial Streaming Loudness Maximization'}
            </span>
          </div>

          {/* Target Loudness / Ceiling Quick Dial */}
          <div className="p-3 rounded-xl bg-[#050711] border border-[#19233E] flex flex-col justify-between gap-1.5">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck size={11} />
              Target Loudness & Ceiling:
            </span>
            <div className="flex items-center gap-2">
              <select
                value={targetLufsPreset}
                onChange={(e) => setTargetLufsPreset(parseFloat(e.target.value))}
                className="bg-[#0A0E1F] border border-[#232E52] text-emerald-300 font-bold text-xs rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer flex-1"
              >
                <option value="-14">-14.0 LUFS (Spotify / YouTube)</option>
                <option value="-16">-16.0 LUFS (Apple Music / Podcasts)</option>
                <option value="-9">-9.0 LUFS (Club / EDM / Hardstyle)</option>
                <option value="-11">-11.0 LUFS (CD / Loud Streaming)</option>
                <option value="-23">-23.0 LUFS (Broadcast EBU R128)</option>
              </select>

              <select
                value={ceilingDbOverride}
                onChange={(e) => setCeilingDbOverride(parseFloat(e.target.value))}
                className="bg-[#0A0E1F] border border-[#232E52] text-amber-300 font-bold text-xs rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
                title="Peak Ceiling Limit"
              >
                <option value="-0.1">-0.1 dBFS</option>
                <option value="-0.5">-0.5 dBFS</option>
                <option value="-1.0">-1.0 dBFS (True Peak)</option>
                <option value="-1.5">-1.5 dBFS</option>
              </select>
            </div>
            <div className="flex items-center justify-between text-[10px] text-[#64748B]">
              <span>Intensity: <strong className="text-amber-400">{Math.round(activeGoldPreset.masterIntensity * 100)}%</strong></span>
              <span>Low-Cut: <strong className="text-indigo-300">{activeGoldPreset.parameters.lowCutHz}Hz</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MULTI-CORE PARALLEL PROCESSING CONSOLE                                  */}
      {/* ========================================================================= */}
      <div className="bg-[#090C19] border border-[#212948] rounded-2xl p-5 shadow-xl flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Cpu className="text-amber-400" size={18} />
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                Multi-Core Parallel Execution Engine
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
                  {hardwareCores} CPU Cores Detected
                </span>
              </h4>
              <p className="text-[11px] text-[#7E88AA]">
                Dispatches simultaneous OfflineAudioContext threads across multi-core CPUs for ultra-fast batch throughput.
              </p>
            </div>
          </div>

          {/* Parallel Toggle & Concurrency Slider */}
          <div className="flex items-center gap-4 bg-[#050711] px-4 py-2 rounded-xl border border-[#19233E]">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
              <input
                type="checkbox"
                checked={parallelProcessing}
                onChange={(e) => setParallelProcessing(e.target.checked)}
                className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
              />
              <span>Parallel Multi-Core Engine</span>
            </label>

            {parallelProcessing && (
              <div className="flex items-center gap-2 pl-3 border-l border-[#1D2746]">
                <span className="text-[11px] text-[#7E88AA]">Worker Threads:</span>
                <input
                  type="range"
                  min="2"
                  max={Math.max(8, hardwareCores)}
                  step="1"
                  value={concurrency}
                  onChange={(e) => setConcurrency(parseInt(e.target.value))}
                  className="w-24 accent-amber-400 cursor-pointer h-1.5 bg-[#17213C] rounded"
                />
                <span className="text-xs font-extrabold text-amber-300 w-5 text-right font-mono">
                  {concurrency}x
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Live Multi-Core Activity Rack Visualizer */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-2">
          {coreStatus.map(core => (
            <div
              key={core.id}
              className={`p-2.5 rounded-xl border transition-all flex flex-col gap-1.5 ${
                core.active
                  ? 'bg-[#0E162E] border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                  : 'bg-[#050711] border-[#151C33] opacity-65'
              }`}
            >
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-mono font-bold text-[#8E94B4]">CORE #{core.id}</span>
                <span className={`w-2 h-2 rounded-full ${core.active ? 'bg-amber-400 animate-ping' : 'bg-[#252E4B]'}`} />
              </div>

              {/* Activity VU bar */}
              <div className="h-1.5 w-full bg-[#10162B] rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    core.active
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-300 w-full animate-pulse'
                      : 'w-0'
                  }`}
                />
              </div>

              <span className="text-[9px] truncate text-[#A0AEC0] font-mono">
                {core.active ? (core.currentItemName || 'DSP Rendering') : 'Thread Idle'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. FOLDER / FILE DRAG-AND-DROP INTAKE ZONE                                 */}
      {/* ========================================================================= */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-4 transition-all text-center cursor-pointer ${
          isDragOver
            ? 'border-amber-400 bg-[#141B33] shadow-[0_0_30px_rgba(245,158,11,0.3)]'
            : 'border-[#222B4A] hover:border-amber-500/60 bg-[#080B18]/70 hover:bg-[#0B1022]'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className={`p-4 rounded-2xl transition-all ${
          isDragOver ? 'bg-amber-500 text-black scale-110' : 'bg-[#121932] text-amber-400 border border-[#232F52]'
        }`}>
          <FolderOpen size={36} />
        </div>

        <div className="space-y-1">
          <h4 className="text-sm font-bold text-white tracking-wider uppercase">
            Drag & Drop Audio Folder or Stems Here
          </h4>
          <p className="text-xs text-[#7E88AA] max-w-md">
            Drop entire session folders, multi-stem archives, or individual tracks (.wav, .mp3, .flac, .ogg, .m4a, .aif).
          </p>
        </div>

        {/* Action Buttons to Select Folder or Load Demo */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => folderInputRef.current?.click()}
            className="px-4 py-2 rounded-xl bg-[#141C35] hover:bg-[#1D274A] text-white border border-[#27345C] hover:border-amber-400 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <FolderOpen size={14} className="text-amber-400" />
            <span>Select Folder (Stems / Album)</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-xl bg-[#141C35] hover:bg-[#1D274A] text-white border border-[#27345C] hover:border-amber-400 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <FileAudio size={14} className="text-cyan-400" />
            <span>Add Audio Files</span>
          </button>

          <button
            onClick={handleLoadDemoStems}
            className="px-3 py-2 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Load 5 synthetic multitrack stems (Drums, Bass, Vocal, Guitar, Synth)"
          >
            <Disc size={13} />
            <span>Load Demo 5-Stem Session</span>
          </button>

          <button
            onClick={handleLoadDemoAlbum}
            className="px-3 py-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Load 3 full mix tracks for album mastering"
          >
            <Disc size={13} />
            <span>Load Demo Album Tracks</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. OVERALL BATCH PROGRESS & MASTER ACTION CONTROLS                          */}
      {/* ========================================================================= */}
      {queue.length > 0 && (
        <div className="bg-[#090C19] border border-[#212948] rounded-2xl p-5 shadow-xl flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-extrabold text-white uppercase tracking-wider">
                Batch Progress: {completedCount} / {queue.length} Tracks Mastered
              </span>
              <span className="text-xs font-bold text-amber-400">
                ({overallProgress}%)
              </span>
            </div>

            {/* Timers & Speed telemetry */}
            <div className="flex items-center gap-4 text-xs font-mono text-[#8E94B4]">
              <div className="flex items-center gap-1.5">
                <Clock size={13} className="text-amber-400" />
                <span>Elapsed: <strong className="text-white">{formatDuration(elapsedSeconds)}</strong></span>
              </div>
              {isProcessing && remainingTracks > 0 && (
                <div className="flex items-center gap-1.5">
                  <Activity size={13} className="text-cyan-400" />
                  <span>ETA: <strong className="text-cyan-300">~{formatDuration(estimatedSecondsRemaining)}</strong></span>
                </div>
              )}
              <div>
                <span>Audio Queue: <strong className="text-white">{formatDuration(totalAudioDuration)}</strong></span>
              </div>
            </div>
          </div>

          {/* Master Progress Bar */}
          <div className="h-3 w-full bg-[#050711] rounded-full border border-[#19233E] overflow-hidden p-0.5 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
              style={{ width: `${overallProgress}%` }}
            />
          </div>

          {/* Main Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              {!isProcessing ? (
                <button
                  onClick={handleStartBatch}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 hover:brightness-110 text-black font-extrabold text-xs tracking-wider uppercase flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all cursor-pointer"
                >
                  <Zap size={15} />
                  <span>Start Batch Mastering ({queuedCount} Pending)</span>
                </button>
              ) : (
                <button
                  onClick={handleStopBatch}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs tracking-wider uppercase flex items-center gap-2 shadow-lg transition-all cursor-pointer animate-pulse"
                >
                  <Pause size={15} />
                  <span>Halt / Pause Batch</span>
                </button>
              )}

              {completedCount > 0 && (
                <button
                  onClick={handleDownloadAllZip}
                  disabled={zipProgress !== null}
                  className="px-4 py-2.5 rounded-xl bg-[#141C35] hover:bg-[#1C274A] text-amber-300 border border-[#27345C] hover:border-amber-400 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
                  title="Download all mastered tracks in a single ZIP archive with mastering report"
                >
                  <FileArchive size={15} />
                  <span>{zipProgress !== null ? `Zipping (${zipProgress}%)...` : `Download All (ZIP)`}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {completedCount > 0 && (
                <button
                  onClick={handleClearCompleted}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#7E88AA] hover:text-white hover:bg-[#131A30] transition-colors"
                >
                  Clear Completed
                </button>
              )}
              <button
                onClick={handleClearAll}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. QUEUE ITEMS TABLE & TRACK LEVEL DSP TRACKING                           */}
      {/* ========================================================================= */}
      {queue.length > 0 && (
        <div className="bg-[#090C19] border border-[#212948] rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 bg-[#050711] border-b border-[#1A223E] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileAudio size={16} className="text-amber-400" />
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                Processing Queue & Audition Deck ({queue.length} Tracks)
              </h4>
            </div>
            <span className="text-[10px] text-[#7E88AA]">
              A/B listen dry vs master in row
            </span>
          </div>

          <div className="divide-y divide-[#151C33] overflow-x-auto">
            {queue.map((item, index) => {
              const isPlaying = playingItemId === item.id;
              const slot = auditionSlot[item.id] || (item.outputBuffer ? 'mastered' : 'dry');
              
              // Stem category badge colors
              const stemColors: Record<StemCategory, string> = {
                drums: 'text-red-400 bg-red-950/50 border-red-500/30',
                kick: 'text-rose-400 bg-rose-950/50 border-rose-500/30',
                snare: 'text-amber-400 bg-amber-950/50 border-amber-500/30',
                bass: 'text-purple-400 bg-purple-950/50 border-purple-500/30',
                vocal: 'text-cyan-400 bg-cyan-950/50 border-cyan-500/30',
                guitar: 'text-yellow-400 bg-yellow-950/50 border-yellow-500/30',
                keys: 'text-emerald-400 bg-emerald-950/50 border-emerald-500/30',
                synth: 'text-pink-400 bg-pink-950/50 border-pink-500/30',
                fx: 'text-blue-400 bg-blue-950/50 border-blue-500/30',
                full_mix: 'text-amber-300 bg-amber-950/60 border-amber-500/50',
                other: 'text-slate-400 bg-slate-900 border-slate-700'
              };

              return (
                <div
                  key={item.id}
                  className={`p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                    item.status === 'processing' || item.status === 'limiting'
                      ? 'bg-[#0E152C]'
                      : item.status === 'completed'
                      ? 'hover:bg-[#0B0F22]'
                      : 'hover:bg-[#070A18]'
                  }`}
                >
                  {/* Left: Index, Name, Stem Category, Size */}
                  <div className="flex items-center gap-3 min-w-[240px] flex-1">
                    <span className="text-xs font-mono font-bold text-[#4B5578] w-5 text-right">
                      {index + 1}
                    </span>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate max-w-[260px] sm:max-w-[340px]" title={item.name}>
                          {item.name}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border shrink-0 ${stemColors[item.stemType]}`}>
                          {item.stemType.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-[#6B7599] font-mono">
                        <span>{formatBytes(item.size)}</span>
                        {item.durationSeconds > 0 && <span>&bull; {formatDuration(item.durationSeconds)}</span>}
                        {item.workerId && <span>&bull; Core #{item.workerId}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Progress Bar & DSP Stage text */}
                  <div className="flex flex-col gap-1 w-full md:w-56 shrink-0">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className={
                        item.status === 'completed' 
                          ? 'text-emerald-400 font-bold' 
                          : item.status === 'error' 
                          ? 'text-red-400 font-bold' 
                          : item.status === 'processing' || item.status === 'limiting'
                          ? 'text-amber-400 font-bold animate-pulse'
                          : 'text-[#6B7599]'
                      }>
                        {item.currentStageText}
                      </span>
                      <span className="text-[#8E94B4]">{item.progress}%</span>
                    </div>

                    <div className="h-1.5 w-full bg-[#050711] rounded-full overflow-hidden border border-[#19233E]">
                      <div
                        className={`h-full transition-all duration-200 ${
                          item.status === 'completed'
                            ? 'bg-emerald-400'
                            : item.status === 'error'
                            ? 'bg-red-500'
                            : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                        }`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Audio Metrics: In Peak vs Out LUFS */}
                  <div className="flex items-center gap-4 text-[10px] font-mono shrink-0 min-w-[170px]">
                    <div>
                      <span className="text-[#64748B] block text-[9px]">IN PEAK</span>
                      <strong className="text-[#CBD5E1]">
                        {item.inputPeakDb !== undefined ? `${item.inputPeakDb} dB` : '--'}
                      </strong>
                    </div>

                    <ArrowRight size={12} className="text-[#3A456B]" />

                    <div>
                      <span className="text-[#64748B] block text-[9px]">OUT LUFS</span>
                      <strong className={item.outputLufs !== undefined ? 'text-emerald-300 font-bold' : 'text-[#64748B]'}>
                        {item.outputLufs !== undefined ? `${item.outputLufs} LUFS` : '--'}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[#64748B] block text-[9px]">OUT PEAK</span>
                      <strong className={item.outputPeakDb !== undefined ? 'text-amber-300' : 'text-[#64748B]'}>
                        {item.outputPeakDb !== undefined ? `${item.outputPeakDb} dB` : '--'}
                      </strong>
                    </div>
                  </div>

                  {/* Right Actions: Audition Player (A/B), Download WAV, Remove */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Audition Play / Stop */}
                    <button
                      onClick={() => handleToggleAudition(item)}
                      className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                        isPlaying
                          ? 'bg-amber-400 text-black shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                          : 'bg-[#121932] hover:bg-[#1B254A] text-white border border-[#232F52]'
                      }`}
                      title={isPlaying ? 'Stop Audition' : 'Listen Preview'}
                    >
                      {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                    </button>

                    {/* A/B Switcher (Dry vs Mastered) */}
                    {item.outputBuffer && (
                      <button
                        onClick={() => handleToggleAuditionSlot(item.id, item)}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          slot === 'mastered'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        }`}
                        title="Click to toggle between Mastered and Dry original signal"
                      >
                        {slot === 'mastered' ? 'A: MASTER' : 'B: DRY'}
                      </button>
                    )}

                    {/* Download WAV button */}
                    {item.status === 'completed' && item.outputBlob && (
                      <button
                        onClick={() => handleDownloadItem(item)}
                        className="p-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 transition-all cursor-pointer shadow-sm"
                        title="Download Mastered WAV"
                      >
                        <Download size={14} />
                      </button>
                    )}

                    {/* Remove button */}
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-2 rounded-xl text-[#6B7599] hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
                      title="Remove from queue"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Helpful Audio Tip Banner */}
      <div className="p-4 rounded-xl bg-[#070A17] border border-[#18213C] flex items-center gap-3 text-xs text-[#7E88AA] font-mono">
        <ShieldCheck size={18} className="text-amber-400 shrink-0" />
        <p className="leading-relaxed">
          <strong className="text-white">Pro Tip for Stem Mastering:</strong> When mastering stems for final arrangement summing in Strangelet Mixer or external DAWs, use <strong className="text-cyan-300">Stem Submix (-4.5dB)</strong> mode. This retains pristine dynamic headroom so tracks sum cleanly without digital intermodulation distortion.
        </p>
      </div>

    </div>
  );
};
