// Strangelet Lab - Multi-track Export & Batch Stem Zipper Modal
// Supports full stereo bounce (.wav) and batch multi-track export (.zip) with individual 16-bit/24-bit WAV stems.

import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, X, Settings2, Play, Pause, CheckCircle2, Music, 
  Sparkles, Loader2, FolderArchive, Layers, FileText, Check, 
  Sliders, Volume2, ShieldCheck, ArrowRight, RefreshCw, Film
} from 'lucide-react';
import { Track, TimelineMarker } from '../types';
import { 
  offlineAudioRenderer, 
  OfflineAudioRenderer,
  ExportResult, 
  BatchExportResult, 
  StemExportItem,
  KenetiCutExportResult
} from '../services/offlineAudioRenderer';
import { playLaserBeamSound } from '../lib/laserSound';

interface ExportProjectModalProps {
  isOpen: boolean;
  initialMode?: 'mix' | 'stems';
  onClose: () => void;
  tracks: Track[];
  tempo: number;
  masterGain: number;
  loopRange?: { start: number; end: number };
  timelineMarkers?: TimelineMarker[];
}

export const ExportProjectModal: React.FC<ExportProjectModalProps> = ({
  isOpen,
  initialMode = 'mix',
  onClose,
  tracks,
  tempo,
  masterGain,
  loopRange,
  timelineMarkers
}) => {
  const [exportMode, setExportMode] = useState<'mix' | 'stems'>(initialMode);

  // Sync mode when modal opens or initialMode prop changes
  useEffect(() => {
    if (isOpen) {
      setExportMode(initialMode);
      setExportResult(null);
      setBatchResult(null);
      setKenetiCutResult(null);
      setIsRendering(false);
      setIsExportingKenetiCut(false);
      setProgress(0);
      setStatusText('');
    }
  }, [isOpen, initialMode]);

  // General Export Configuration
  const [filename, setFilename] = useState(`Strangelet_Arrangement_${tempo}BPM`);
  const [zipFilename, setZipFilename] = useState(`Strangelet_Stems_${tempo}BPM`);
  const [sampleRate, setSampleRate] = useState<number>(44100);
  const [bitDepth, setBitDepth] = useState<16 | 24>(16);
  const [rangeMode, setRangeMode] = useState<'full' | 'loop' | 'custom'>('full');
  const [customStartBar, setCustomStartBar] = useState<number>(1);
  const [customEndBar, setCustomEndBar] = useState<number>(16);
  const [normalize, setNormalize] = useState<boolean>(true);
  const [limiter, setLimiter] = useState<boolean>(true);

  // Batch Stem Export Specific Configuration
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>(() => 
    tracks.filter(t => !t.muted).map(t => t.id)
  );
  const [dryStems, setDryStems] = useState<boolean>(false);
  const [namingFormat, setNamingFormat] = useState<'numbered' | 'clean' | 'detailed'>('numbered');
  const [includeManifest, setIncludeManifest] = useState<boolean>(true);

  // When tracks change or modal opens, refresh selected tracks
  useEffect(() => {
    setSelectedTrackIds(tracks.filter(t => !t.muted).map(t => t.id));
  }, [tracks, isOpen]);

  // Render Execution State
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [isExportingKenetiCut, setIsExportingKenetiCut] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('');
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [batchResult, setBatchResult] = useState<BatchExportResult | null>(null);
  const [kenetiCutResult, setKenetiCutResult] = useState<KenetiCutExportResult | null>(null);

  // Audio Preview Player
  const [playingStemId, setPlayingStemId] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  if (!isOpen) return null;

  // Toggle Track Selection for Stems
  const handleToggleTrack = (trackId: string) => {
    setSelectedTrackIds(prev => 
      prev.includes(trackId) 
        ? prev.filter(id => id !== trackId)
        : [...prev, trackId]
    );
  };

  const handleSelectAllTracks = () => {
    setSelectedTrackIds(tracks.map(t => t.id));
  };

  const handleSelectActiveTracks = () => {
    setSelectedTrackIds(tracks.filter(t => !t.muted).map(t => t.id));
  };

  const handleDeselectAllTracks = () => {
    setSelectedTrackIds([]);
  };

  // Start Export Process (Stereo Mix or Batch Stems)
  const handleStartExport = async () => {
    setExportError(null);
    setIsRendering(true);
    setProgress(5);
    setExportResult(null);
    setBatchResult(null);

    let range: { startBar: number; endBar: number } | undefined = undefined;
    if (rangeMode === 'loop' && loopRange) {
      range = {
        startBar: Math.floor(loopRange.start * 16),
        endBar: Math.ceil(loopRange.end * 16)
      };
    } else if (rangeMode === 'custom') {
      range = {
        startBar: Math.max(0, customStartBar - 1),
        endBar: Math.min(16, customEndBar)
      };
    }

    try {
      if (exportMode === 'mix') {
        setStatusText('Preparing arrangement tracks for mix bounce...');
        const result = await offlineAudioRenderer.renderProject(tracks, {
          sampleRate,
          bitDepth,
          totalBars: 16,
          tempo,
          masterGain,
          normalize,
          limiter,
          filename,
          range,
          onProgress: (pct, msg) => {
            setProgress(pct);
            setStatusText(msg);
          }
        });

        setExportResult(result);
        playLaserBeamSound('laser_audio');
      } else {
        // BATCH STEMS EXPORT (.ZIP)
        if (selectedTrackIds.length === 0) {
          setExportError('Please select at least one track to export.');
          setIsRendering(false);
          return;
        }

        setStatusText(`Initializing batch export of ${selectedTrackIds.length} stems...`);
        const result = await offlineAudioRenderer.renderBatchStemsZip(tracks, {
          sampleRate,
          bitDepth,
          totalBars: 16,
          tempo,
          masterGain,
          normalize,
          limiter: false,
          filename: zipFilename,
          dryStems,
          namingFormat,
          includeManifest,
          trackIds: selectedTrackIds,
          range,
          onProgress: (pct, msg) => {
            setProgress(pct);
            setStatusText(msg);
          }
        });

        setBatchResult(result);
        playLaserBeamSound('laser_audio');
      }
    } catch (err: unknown) {
      console.error('Offline export error:', err);
      const errMsg = err instanceof Error ? err.message : 'Unknown rendering failure';
      setStatusText(`Export error: ${errMsg}`);
    } finally {
      setIsRendering(false);
    }
  };

  // Download Output File
  const handleDownloadSingleWav = () => {
    if (exportResult) {
      offlineAudioRenderer.constructor && OfflineAudioRendererDownload(exportResult.blob, exportResult.filename);
      playLaserBeamSound('laser_curve');
    }
  };

  const handleDownloadBatchZip = () => {
    if (batchResult) {
      OfflineAudioRendererDownload(batchResult.zipBlob, batchResult.zipFilename);
      playLaserBeamSound('laser_curve');
    }
  };

  // 1-Click KenetiCut VJ Studio Package Export
  const handleExportForKenetiCut = async () => {
    if (exportMode === 'stems' && selectedTrackIds.length === 0) {
      setStatusText('Select at least one track before packaging for KenetiCut VJ Studio.');
      return;
    }

    setIsRendering(true);
    setIsExportingKenetiCut(true);
    setProgress(4);
    setExportResult(null);
    setBatchResult(null);
    setKenetiCutResult(null);
    setStatusText('KenetiCut VJ Bridge: Preparing audio + reactive chop manifest...');

    let range: { startBar: number; endBar: number } | undefined = undefined;
    if (rangeMode === 'loop' && loopRange) {
      range = {
        startBar: Math.floor(loopRange.start * 16),
        endBar: Math.ceil(loopRange.end * 16)
      };
    } else if (rangeMode === 'custom') {
      range = {
        startBar: Math.max(0, customStartBar - 1),
        endBar: Math.min(16, customEndBar)
      };
    }

    try {
      const result = await offlineAudioRenderer.renderKenetiCutVjBundle(tracks, {
        mode: exportMode,
        sampleRate,
        bitDepth,
        totalBars: 16,
        tempo,
        masterGain,
        normalize,
        limiter,
        filename: exportMode === 'stems' ? zipFilename : filename,
        dryStems,
        namingFormat,
        trackIds: exportMode === 'stems' ? selectedTrackIds : undefined,
        markers: timelineMarkers,
        range,
        onProgress: (pct, msg) => {
          setProgress(pct);
          setStatusText(msg);
        }
      });

      setKenetiCutResult(result);
      OfflineAudioRenderer.downloadBlob(result.zipBlob, result.zipFilename);
      playLaserBeamSound('laser_audio');
    } catch (err: unknown) {
      console.error('KenetiCut VJ bridge export error:', err);
      const errMsg = err instanceof Error ? err.message : 'Unknown packaging failure';
      setStatusText(`KenetiCut Export error: ${errMsg}`);
    } finally {
      setIsRendering(false);
      setIsExportingKenetiCut(false);
    }
  };

  const handleDownloadKenetiCutZip = () => {
    if (kenetiCutResult) {
      OfflineAudioRenderer.downloadBlob(kenetiCutResult.zipBlob, kenetiCutResult.zipFilename);
      playLaserBeamSound('laser_curve');
    }
  };

  // Preview Specific Stem in Batch View
  const handleTogglePreviewStem = (stem: StemExportItem) => {
    if (playingStemId === stem.trackId) {
      if (audioPreviewRef.current) audioPreviewRef.current.pause();
      setPlayingStemId(null);
    } else {
      const url = URL.createObjectURL(stem.blob);
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current.src = url;
        audioPreviewRef.current.play().catch(e => console.log('Audio preview error:', e));
        setPlayingStemId(stem.trackId);
        audioPreviewRef.current.onended = () => {
          setPlayingStemId(null);
          URL.revokeObjectURL(url);
        };
      }
    }
  };

  const activeTracksCount = tracks.filter(t => !t.muted).length;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-mono select-none">
      <div className="bg-[#090C16] border border-[#1E293B] rounded-2xl w-full max-w-2xl shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1A2338] flex items-center justify-between bg-[#0E1322]">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
              exportMode === 'stems'
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                : 'bg-amber-500/20 border-amber-500/50 text-amber-400'
            }`}>
              {exportMode === 'stems' ? <FolderArchive size={20} /> : <Download size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#FFD700] uppercase tracking-widest">
                  STRANGELET LAB
                </span>
                <span className={`text-[9px] px-2 py-0.5 rounded font-black border ${
                  exportMode === 'stems'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {exportMode === 'stems' ? 'BATCH STEMS ZIPPER' : 'OFFLINE MASTER BOUNCE'}
                </span>
              </div>
              <h3 className="text-base font-black text-white tracking-tight">
                {exportMode === 'stems' ? 'BATCH EXPORT TRACK STEMS (.ZIP)' : 'EXPORT STEREO MASTER (.WAV)'}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#64748B] hover:text-white rounded-lg hover:bg-[#1E293B] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher: Stereo Mix vs Batch Stems */}
        <div className="flex border-b border-[#1A2338] bg-[#070A12] px-6 pt-2">
          <button
            onClick={() => {
              setExportMode('mix');
              setExportResult(null);
              setBatchResult(null);
            }}
            disabled={isRendering}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              exportMode === 'mix'
                ? 'border-[#FF8C00] text-[#FF8C00] bg-[#FF8C00]/5'
                : 'border-transparent text-[#64748B] hover:text-white'
            }`}
          >
            <Download size={13} />
            <span>1. Stereo Master Mix (.wav)</span>
          </button>

          <button
            onClick={() => {
              setExportMode('stems');
              setExportResult(null);
              setBatchResult(null);
            }}
            disabled={isRendering}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              exportMode === 'stems'
                ? 'border-[#10B981] text-[#10B981] bg-[#10B981]/5 shadow-sm'
                : 'border-transparent text-[#64748B] hover:text-white'
            }`}
          >
            <FolderArchive size={13} />
            <span>2. All Active Tracks as Stems (.zip archive)</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-700 font-mono">
              BATCH
            </span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Output Filename */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#94A3B8] mb-1.5 font-bold">
              {exportMode === 'stems' ? 'Archive Filename (.zip)' : 'Master Filename (.wav)'}
            </label>
            <div className="relative">
              <input
                type="text"
                value={exportMode === 'stems' ? zipFilename : filename}
                onChange={(e) => exportMode === 'stems' ? setZipFilename(e.target.value) : setFilename(e.target.value)}
                disabled={isRendering}
                className="w-full bg-[#121626] border border-[#222E4A] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FFD700] transition-colors pr-16"
              />
              <span className="absolute right-3.5 top-2.5 text-xs text-[#64748B]">
                {exportMode === 'stems' ? '.zip' : '.wav'}
              </span>
            </div>
          </div>

          {/* Quick Metrics KPI Bar */}
          <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-[#0E1322] border border-[#1A2338]">
            <div>
              <span className="text-[10px] uppercase text-[#64748B] block">Session BPM</span>
              <span className="text-xs font-bold text-[#FF8C00]">{tempo} BPM</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-[#64748B] block">Active Tracks</span>
              <span className="text-xs font-bold text-[#10B981]">
                {exportMode === 'stems' ? selectedTrackIds.length : activeTracksCount} / {tracks.length}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-[#64748B] block">Format</span>
              <span className="text-xs font-bold text-white">
                {sampleRate / 1000}kHz / {bitDepth}-bit
              </span>
            </div>
          </div>

          {/* BATCH STEMS SPECIFIC CONFIGURATION */}
          {exportMode === 'stems' && (
            <div className="space-y-4 p-4 rounded-xl bg-[#0B0F1C] border border-[#1C2640]">
              <div className="flex items-center justify-between pb-2 border-b border-[#18233C]">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Layers size={13} className="text-[#10B981]" />
                    SELECT ACTIVE STEM TRACKS ({selectedTrackIds.length} SELECTED)
                  </h4>
                  <p className="text-[10px] text-[#64748B] mt-0.5">
                    Each selected track will be rendered to a separate WAV file inside the ZIP.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    onClick={handleSelectActiveTracks}
                    className="px-2 py-0.5 rounded bg-[#151D30] hover:bg-[#202C48] text-[#10B981] font-bold cursor-pointer"
                  >
                    Active Only
                  </button>
                  <button
                    onClick={handleSelectAllTracks}
                    className="px-2 py-0.5 rounded bg-[#151D30] hover:bg-[#202C48] text-[#64748B] hover:text-white cursor-pointer"
                  >
                    All ({tracks.length})
                  </button>
                  <button
                    onClick={handleDeselectAllTracks}
                    className="px-2 py-0.5 rounded bg-[#151D30] hover:bg-[#202C48] text-[#64748B] hover:text-white cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Tracks Checkbox List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {tracks.map((t, idx) => {
                  const isSelected = selectedTrackIds.includes(t.id);
                  const isMuted = t.muted;
                  return (
                    <div
                      key={t.id}
                      onClick={() => handleToggleTrack(t.id)}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#131C30] border-[#10B981]/50 text-white'
                          : 'bg-[#0E1322] border-[#1A2338] text-[#64748B] hover:border-[#283656]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 ${
                          isSelected ? 'bg-[#10B981] border-[#10B981] text-black' : 'border-[#334155]'
                        }`}>
                          {isSelected && <Check size={10} strokeWidth={3} />}
                        </div>
                        <span 
                          className="w-2 h-2 rounded-full shrink-0" 
                          style={{ backgroundColor: t.color || '#00F0FF' }} 
                        />
                        <span className="truncate font-bold" title={t.name}>
                          {String(idx + 1).padStart(2, '0')}. {t.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 text-[10px]">
                        {isMuted && (
                          <span className="px-1 py-0.2 rounded bg-red-950 text-red-400 font-bold">
                            MUTED
                          </span>
                        )}
                        <span className="text-[9px] text-[#55637E] uppercase">
                          {t.type} • {t.clips?.length || 0} clips
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Stems Routing Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#18233C]">
                <div>
                  <label className="block text-[11px] text-[#94A3B8] font-bold mb-1">
                    Stem Bounce Gain Mode
                  </label>
                  <select
                    value={dryStems ? 'dry' : 'fader'}
                    onChange={(e) => setDryStems(e.target.value === 'dry')}
                    disabled={isRendering}
                    className="w-full bg-[#121626] border border-[#222E4A] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#10B981]"
                  >
                    <option value="fader">With Track Faders, Pan & Automation</option>
                    <option value="dry">Dry Unity Gain (0dB Fader, Center Pan)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-[#94A3B8] font-bold mb-1">
                    Stem Naming Format
                  </label>
                  <select
                    value={namingFormat}
                    onChange={(e) => setNamingFormat(e.target.value as 'numbered' | 'clean' | 'detailed')}
                    disabled={isRendering}
                    className="w-full bg-[#121626] border border-[#222E4A] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#10B981]"
                  >
                    <option value="numbered">Numbered: 01_Drums.wav</option>
                    <option value="clean">Clean: Drums_Stem.wav</option>
                    <option value="detailed">Detailed: 01_Drums_{tempo}BPM.wav</option>
                  </select>
                </div>
              </div>

              {/* Manifest Checkbox */}
              <label className="flex items-center justify-between p-2 rounded-lg bg-[#0E1322] border border-[#1A2338] cursor-pointer hover:border-[#283656]">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-[#10B981]" />
                  <div>
                    <span className="text-xs font-bold text-white block">Include SESSION_MANIFEST.txt</span>
                    <span className="text-[10px] text-[#64748B]">Adds tempo, sample rate, and stem track list info to zip archive</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={includeManifest}
                  onChange={(e) => setIncludeManifest(e.target.checked)}
                  className="accent-[#10B981] w-4 h-4 rounded"
                />
              </label>
            </div>
          )}

          {/* Sample Rate & Bit Depth */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#94A3B8] mb-1.5 font-bold">
                Sample Rate
              </label>
              <select
                value={sampleRate}
                onChange={(e) => setSampleRate(Number(e.target.value))}
                disabled={isRendering}
                className="w-full bg-[#121626] border border-[#222E4A] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FFD700]"
              >
                <option value={44100}>44.1 kHz (CD Standard)</option>
                <option value={48000}>48.0 kHz (Studio / Film Broadcast)</option>
                <option value={96000}>96.0 kHz (Hi-Res Audio)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-[#94A3B8] mb-1.5 font-bold">
                Bit Depth
              </label>
              <select
                value={bitDepth}
                onChange={(e) => setBitDepth(Number(e.target.value) as 16 | 24)}
                disabled={isRendering}
                className="w-full bg-[#121626] border border-[#222E4A] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FFD700]"
              >
                <option value={16}>16-bit PCM (Standard DAW Interchange)</option>
                <option value={24}>24-bit PCM (High Dynamic Range Master)</option>
              </select>
            </div>
          </div>

          {/* Export Range */}
          <div>
            <label className="block text-xs text-[#94A3B8] mb-1.5 font-bold">
              Arrangement Length Range
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRangeMode('full')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-colors border cursor-pointer ${
                  rangeMode === 'full'
                    ? 'bg-[#FF8C00]/20 border-[#FF8C00] text-[#FF8C00]'
                    : 'bg-[#121626] border-[#222E4A] text-[#94A3B8] hover:text-white'
                }`}
              >
                Full (16 Bars)
              </button>
              <button
                type="button"
                onClick={() => setRangeMode('loop')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-colors border cursor-pointer ${
                  rangeMode === 'loop'
                    ? 'bg-[#FF8C00]/20 border-[#FF8C00] text-[#FF8C00]'
                    : 'bg-[#121626] border-[#222E4A] text-[#94A3B8] hover:text-white'
                }`}
              >
                Loop Region
              </button>
              <button
                type="button"
                onClick={() => setRangeMode('custom')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-colors border cursor-pointer ${
                  rangeMode === 'custom'
                    ? 'bg-[#FF8C00]/20 border-[#FF8C00] text-[#FF8C00]'
                    : 'bg-[#121626] border-[#222E4A] text-[#94A3B8] hover:text-white'
                }`}
              >
                Custom Bars
              </button>
            </div>

            {rangeMode === 'custom' && (
              <div className="flex items-center gap-3 mt-2.5">
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-[11px] text-[#64748B]">From Bar:</span>
                  <input
                    type="number"
                    min={1}
                    max={16}
                    value={customStartBar}
                    onChange={(e) => setCustomStartBar(Math.max(1, Number(e.target.value)))}
                    className="w-16 bg-[#121626] border border-[#222E4A] rounded px-2 py-1 text-xs text-white text-center"
                  />
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-[11px] text-[#64748B]">To Bar:</span>
                  <input
                    type="number"
                    min={1}
                    max={16}
                    value={customEndBar}
                    onChange={(e) => setCustomEndBar(Math.min(16, Number(e.target.value)))}
                    className="w-16 bg-[#121626] border border-[#222E4A] rounded px-2 py-1 text-xs text-white text-center"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Normalization & Limiter */}
          <div className="space-y-2 pt-1 border-t border-[#1A2338]">
            <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#0E1322] border border-[#1A2338] cursor-pointer hover:border-[#283656]">
              <div>
                <span className="text-xs font-bold text-white block">Normalize Output Peak</span>
                <span className="text-[10px] text-[#64748B]">Scales audio to -0.35 dBFS peak without clipping</span>
              </div>
              <input
                type="checkbox"
                checked={normalize}
                onChange={(e) => setNormalize(e.target.checked)}
                className="accent-[#FF8C00] w-4 h-4 rounded"
              />
            </label>

            {exportMode === 'mix' && (
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#0E1322] border border-[#1A2338] cursor-pointer hover:border-[#283656]">
                <div>
                  <span className="text-xs font-bold text-white block">Master Bus Brickwall Limiter</span>
                  <span className="text-[10px] text-[#64748B]">2ms lookahead compressor catches loud peaks</span>
                </div>
                <input
                  type="checkbox"
                  checked={limiter}
                  onChange={(e) => setLimiter(e.target.checked)}
                  className="accent-[#FF8C00] w-4 h-4 rounded"
                />
              </label>
            )}
          </div>

          {/* Inline Validation / Export Error */}
          {exportError && !isRendering && (
            <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs flex items-center justify-between">
              <span>{exportError}</span>
              <button onClick={() => setExportError(null)} className="text-red-300 hover:text-white ml-2 font-bold">
                Dismiss
              </button>
            </div>
          )}

          {/* Progress / Status Bar */}
          {isRendering && (
            <div className="p-4 rounded-xl bg-[#0E1322] border border-[#FFD700]/40 space-y-2 animate-fade-in shadow-inner">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#FFD700] flex items-center gap-2 font-bold truncate pr-2">
                  <Loader2 size={14} className="animate-spin text-[#FFD700] shrink-0" />
                  <span className="truncate">{statusText}</span>
                </span>
                <span className="font-black text-white shrink-0">{progress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#060810] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#FF8C00] via-[#FFD700] to-[#10B981] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Hidden audio element for preview */}
          <audio ref={audioPreviewRef} />

          {/* Render Completion: Stereo Mix Result */}
          {exportResult && !isRendering && (
            <div className="p-4 rounded-xl bg-[#091F14] border border-[#10B981]/60 space-y-3 animate-fade-in shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#10B981] flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  MASTER WAV BOUNCE COMPLETE
                </span>
                <span className="text-[11px] text-[#94A3B8]">
                  {(exportResult.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB • {exportResult.durationSeconds.toFixed(1)}s
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#05120B] border border-[#10B981]/30">
                <div className="truncate pr-2">
                  <div className="text-xs font-bold text-white truncate">{exportResult.filename}</div>
                  <div className="text-[10px] text-emerald-400">Pristine 16-bit PCM stereo WAV container</div>
                </div>
                <button
                  onClick={handleDownloadSingleWav}
                  className="px-4 py-2 rounded-lg bg-[#10B981] text-black font-extrabold text-xs hover:bg-white transition-all flex items-center gap-1.5 shrink-0 shadow-md cursor-pointer"
                >
                  <Download size={14} />
                  <span>DOWNLOAD .WAV</span>
                </button>
              </div>
            </div>
          )}

          {/* Render Completion: Batch Stems ZIP Result */}
          {batchResult && !isRendering && (
            <div className="p-4 rounded-xl bg-[#091F14] border border-[#10B981]/60 space-y-3 animate-fade-in shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#10B981] flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  BATCH STEMS ZIP ARCHIVE READY!
                </span>
                <span className="text-[11px] text-[#94A3B8]">
                  {(batchResult.totalSizeBytes / (1024 * 1024)).toFixed(2)} MB ZIP • {batchResult.stems.length} STEMS
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#05120B] border border-[#10B981]/30">
                <div className="truncate pr-2">
                  <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                    <FolderArchive size={14} className="text-[#10B981]" />
                    {batchResult.zipFilename}
                  </div>
                  <div className="text-[10px] text-emerald-400">
                    Includes {batchResult.stems.length} WAV files + SESSION_MANIFEST.txt
                  </div>
                </div>

                <button
                  onClick={handleDownloadBatchZip}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#34D399] text-black font-extrabold text-xs hover:brightness-110 transition-all flex items-center gap-2 shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.5)] cursor-pointer active:scale-95"
                >
                  <Download size={14} />
                  <span>DOWNLOAD STEMS (.ZIP)</span>
                </button>
              </div>

              {/* Stems Manifest List */}
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                <div className="text-[10px] text-[#64748B] uppercase font-bold px-1">
                  ARCHIVED WAV STEMS ({batchResult.stems.length})
                </div>
                {batchResult.stems.map((stem) => (
                  <div
                    key={stem.trackId}
                    className="flex items-center justify-between p-2 rounded bg-[#061009] border border-[#14281B] text-xs"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <button
                        onClick={() => handleTogglePreviewStem(stem)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                          playingStemId === stem.trackId 
                            ? 'bg-[#10B981] text-black' 
                            : 'bg-[#102015] text-[#10B981] hover:bg-[#10B981] hover:text-black'
                        }`}
                        title="Audition stem"
                      >
                        {playingStemId === stem.trackId ? <Pause size={10} /> : <Play size={10} className="ml-0.5" />}
                      </button>
                      <span className="truncate text-white font-mono text-[11px]">{stem.filename}</span>
                    </div>

                    <span className="text-[10px] text-[#64748B] shrink-0 font-mono">
                      {(stem.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Render Completion: KenetiCut VJ Studio Bridge Bundle */}
          {kenetiCutResult && !isRendering && (
            <div className="p-4 rounded-xl bg-gradient-to-b from-[#1A0B24] to-[#0E0716] border border-fuchsia-500/60 space-y-3 animate-fade-in shadow-[0_0_25px_rgba(217,70,239,0.25)]">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-fuchsia-300 flex items-center gap-2">
                  <Film size={15} className="text-fuchsia-400" />
                  KENETICUT VJ STUDIO PACKAGE READY!
                </span>
                <span className="text-[11px] text-[#94A3B8]">
                  {(kenetiCutResult.totalSizeBytes / (1024 * 1024)).toFixed(2)} MB .ZIP • {kenetiCutResult.manifest.audioFiles.length} WAV(s)
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div className="p-2 rounded bg-[#080510] border border-fuchsia-500/20">
                  <span className="text-[#94A3B8] block">Sync Tempo</span>
                  <span className="font-bold text-cyan-300">{kenetiCutResult.manifest.bpm} BPM ({kenetiCutResult.manifest.beatGrid.beatTimestamps.length} beats)</span>
                </div>
                <div className="p-2 rounded bg-[#080510] border border-fuchsia-500/20">
                  <span className="text-[#94A3B8] block">Transient Chops</span>
                  <span className="font-bold text-fuchsia-300">{kenetiCutResult.manifest.transientChopPoints.length} chop points</span>
                </div>
                <div className="p-2 rounded bg-[#080510] border border-fuchsia-500/20">
                  <span className="text-[#94A3B8] block">Song Markers</span>
                  <span className="font-bold text-amber-300">{kenetiCutResult.manifest.songMarkers.length} cues</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#080510] border border-fuchsia-500/30">
                <div className="truncate pr-2">
                  <div className="text-xs font-bold text-white truncate">{kenetiCutResult.zipFilename}</div>
                  <div className="text-[10px] text-fuchsia-300">
                    Contains audio + keneticut_manifest.json (BPM, transients, markers)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadKenetiCutZip}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-black font-extrabold text-xs hover:brightness-110 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Download size={14} />
                  <span>RE-DOWNLOAD VJ .ZIP</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#1A2338] bg-[#0E1322] flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            {/* 1-Click KenetiCut VJ Studio Bridge Button */}
            <button
              type="button"
              onClick={handleExportForKenetiCut}
              disabled={isRendering || (exportMode === 'stems' && selectedTrackIds.length === 0)}
              className="px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 text-white hover:brightness-110 transition-all shadow-[0_0_20px_rgba(217,70,239,0.35)] flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none cursor-pointer active:scale-95 border border-fuchsia-400/50"
              title="1-Click package master audio or stems with BPM, transient chop points & song markers for KenetiCut VJ Studio"
            >
              {isExportingKenetiCut ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>PACKAGING FOR KENETICUT...</span>
                </>
              ) : (
                <>
                  <Film size={14} />
                  <span>Export for KenetiCut VJ Studio</span>
                </>
              )}
            </button>

            {exportMode === 'stems' ? (
              batchResult ? (
                <button
                  type="button"
                  onClick={handleDownloadBatchZip}
                  className="px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-[#10B981] to-[#34D399] text-black hover:brightness-110 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Download size={14} />
                  DOWNLOAD STEMS (.ZIP)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartExport}
                  disabled={isRendering || selectedTrackIds.length === 0}
                  className="px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-[#10B981] via-[#059669] to-[#047857] text-white hover:brightness-110 transition-all shadow-[0_0_20px_rgba(16,185,129,0.35)] flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none cursor-pointer active:scale-95"
                >
                  {isRendering && !isExportingKenetiCut ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      BOUNCING {selectedTrackIds.length} STEMS...
                    </>
                  ) : (
                    <>
                      <FolderArchive size={14} />
                      BATCH EXPORT ALL TRACKS (.ZIP)
                    </>
                  )}
                </button>
              )
            ) : (
              exportResult ? (
                <button
                  type="button"
                  onClick={handleDownloadSingleWav}
                  className="px-6 py-2.5 rounded-xl text-xs font-black bg-[#FFD700] text-black hover:bg-white transition-all shadow-[0_0_20px_rgba(255,215,0,0.4)] flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Download size={14} />
                  DOWNLOAD .WAV
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartExport}
                  disabled={isRendering}
                  className="px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-[#FF8C00] to-[#FFD700] text-black hover:brightness-110 transition-all shadow-[0_0_20px_rgba(255,140,0,0.35)] flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none cursor-pointer active:scale-95"
                >
                  {isRendering && !isExportingKenetiCut ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      BOUNCING MIX...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      BOUNCE & EXPORT .WAV
                    </>
                  )}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to trigger browser download
function OfflineAudioRendererDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export default ExportProjectModal;
