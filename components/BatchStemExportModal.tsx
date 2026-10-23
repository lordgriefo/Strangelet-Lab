import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderArchive, 
  Download, 
  X, 
  Check, 
  Layers, 
  Sliders, 
  Volume2, 
  Play, 
  Pause, 
  CheckCircle2, 
  Loader2, 
  FileText, 
  Sparkles, 
  ShieldCheck, 
  Radio, 
  ArrowRight,
  Music,
  Gauge,
  Activity,
  Maximize2
} from 'lucide-react';
import { Track } from '../types';
import { 
  offlineAudioRenderer, 
  OfflineAudioRenderer, 
  BatchExportResult, 
  StemExportItem,
  NormalizationMode,
  dbToLinearPeak
} from '../services/offlineAudioRenderer';
import { playLaserBeamSound } from '../lib/laserSound';

export interface BatchStemExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: Track[];
  tempo: number;
  masterGain?: number;
  loopRange?: { start: number; end: number };
}

const SAMPLE_RATE_OPTIONS = [
  { value: 44100, label: '44.1 kHz', desc: 'CD Standard & Streaming' },
  { value: 48000, label: '48.0 kHz', desc: 'Pro Studio & Video (Recommended)', badge: 'PRO' },
  { value: 88200, label: '88.2 kHz', desc: '2x Oversampled Master' },
  { value: 96000, label: '96.0 kHz', desc: 'Hi-Res Studio Master', badge: 'HI-RES' },
  { value: 192000, label: '192.0 kHz', desc: 'Audiophile Archival Master' },
];

const PEAK_CEILING_PRESETS = [
  { value: -0.1, label: '-0.1 dBFS', desc: 'Industry Peak Max' },
  { value: -0.35, label: '-0.35 dBFS', desc: 'True-Peak Safe (Recommended)' },
  { value: -1.0, label: '-1.0 dBFS', desc: 'EBU R128 / Streaming Safe' },
  { value: -3.0, label: '-3.0 dBFS', desc: 'Mixdown Stem Headroom' },
  { value: 0.0, label: '0.0 dBFS', desc: 'Full Scale Limit' },
];

export const BatchStemExportModal: React.FC<BatchStemExportModalProps> = ({
  isOpen,
  onClose,
  tracks,
  tempo,
  masterGain = 0.8,
  loopRange
}) => {
  // Track selection state (defaults to all active / unmuted tracks)
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>(() =>
    tracks.filter(t => !t.muted).map(t => t.id)
  );

  // Normalization Configuration
  const [normalizeEnabled, setNormalizeEnabled] = useState<boolean>(true);
  const [normalizeMode, setNormalizeMode] = useState<NormalizationMode>('independent');
  const [targetPeakDb, setTargetPeakDb] = useState<number>(-0.35);

  // Sample Rate Conversion & Bit Depth
  const [sampleRate, setSampleRate] = useState<number>(48000);
  const [bitDepth, setBitDepth] = useState<16 | 24>(24);

  // Stems Routing & Naming
  const [dryStems, setDryStems] = useState<boolean>(false);
  const [namingFormat, setNamingFormat] = useState<'numbered' | 'clean' | 'detailed'>('numbered');
  const [includeManifest, setIncludeManifest] = useState<boolean>(true);
  const [archiveName, setArchiveName] = useState<string>(`Project_Stems_${tempo}BPM`);

  // Range Selection
  const [rangeMode, setRangeMode] = useState<'full' | 'loop' | 'custom'>('full');
  const [customStartBar, setCustomStartBar] = useState<number>(1);
  const [customEndBar, setCustomEndBar] = useState<number>(16);

  // Execution & Progress State
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('');
  const [batchResult, setBatchResult] = useState<BatchExportResult | null>(null);
  const [isBatchDownloading, setIsBatchDownloading] = useState<boolean>(false);

  // In-Dialog Audio Audition Player
  const [playingStemId, setPlayingStemId] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Reset & refresh tracks when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTrackIds(tracks.filter(t => !t.muted).map(t => t.id));
      setBatchResult(null);
      setIsRendering(false);
      setProgress(0);
      setStatusText('');
      setArchiveName(`Project_Stems_${tempo}BPM`);
    }
  }, [isOpen, tracks, tempo]);

  if (!isOpen) return null;

  // Track selection helpers
  const handleToggleTrack = (id: string) => {
    setSelectedTrackIds(prev => 
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  const handleSelectActiveOnly = () => {
    setSelectedTrackIds(tracks.filter(t => !t.muted).map(t => t.id));
  };

  const handleSelectAll = () => {
    setSelectedTrackIds(tracks.map(t => t.id));
  };

  const handleInvertSelection = () => {
    setSelectedTrackIds(prev => tracks.filter(t => !prev.includes(t.id)).map(t => t.id));
  };

  const handleClearSelection = () => {
    setSelectedTrackIds([]);
  };

  // Render Execution
  const handleStartStemExport = async () => {
    if (selectedTrackIds.length === 0) {
      alert('Please select at least one active track to export.');
      return;
    }

    setIsRendering(true);
    setProgress(3);
    setBatchResult(null);
    setStatusText(`Initializing batch stem render for ${selectedTrackIds.length} tracks...`);

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
      const result = await offlineAudioRenderer.renderBatchStemsZip(tracks, {
        sampleRate,
        bitDepth,
        totalBars: 16,
        tempo,
        masterGain,
        normalize: normalizeEnabled,
        normalizeMode: normalizeEnabled ? normalizeMode : 'none',
        normalizationTargetDb: targetPeakDb,
        limiter: false,
        filename: archiveName,
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
    } catch (err: unknown) {
      console.error('Batch stem export error:', err);
      const errMsg = err instanceof Error ? err.message : 'Unknown rendering failure';
      setStatusText(`Batch Export Failed: ${errMsg}`);
    } finally {
      setIsRendering(false);
    }
  };

  // Download all stems as individual WAV files
  const handleDownloadAllWavsIndividually = async () => {
    if (!batchResult || batchResult.stems.length === 0) return;
    setIsBatchDownloading(true);
    playLaserBeamSound('laser_curve');
    try {
      await OfflineAudioRenderer.downloadAllStemsIndividually(batchResult.stems, 300);
    } finally {
      setIsBatchDownloading(false);
    }
  };

  // Download single stem WAV
  const handleDownloadSingleStemWav = (stem: StemExportItem) => {
    OfflineAudioRenderer.downloadBlob(stem.blob, stem.filename);
    playLaserBeamSound('laser_select');
  };

  // Download full ZIP archive
  const handleDownloadZip = () => {
    if (!batchResult) return;
    OfflineAudioRenderer.downloadBlob(batchResult.zipBlob, batchResult.zipFilename);
    playLaserBeamSound('laser_curve');
  };

  // Audition preview
  const handleToggleAudition = (stem: StemExportItem) => {
    if (playingStemId === stem.trackId) {
      if (audioPreviewRef.current) audioPreviewRef.current.pause();
      setPlayingStemId(null);
    } else {
      const url = URL.createObjectURL(stem.blob);
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current.src = url;
        audioPreviewRef.current.play().catch(console.warn);
        setPlayingStemId(stem.trackId);
        audioPreviewRef.current.onended = () => {
          setPlayingStemId(null);
          URL.revokeObjectURL(url);
        };
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-fade-in font-mono select-none">
      <div className="bg-[#090D18] border border-[#1E293B] rounded-2xl w-full max-w-4xl shadow-[0_0_80px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-[#1A253E] flex items-center justify-between bg-gradient-to-r from-[#0C1222] via-[#0F182E] to-[#0A0E1A]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-400 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <FolderArchive size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#FFD700] uppercase tracking-widest">
                  STRANGELET LAB // MULTI-TRACK AUDIO ENGINE
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded font-black border bg-emerald-950/80 text-emerald-300 border-emerald-500/40">
                  BATCH STEM EXPORT
                </span>
              </div>
              <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                <span>EXPORT ALL ACTIVE TRACKS AS INDIVIDUAL WAVs</span>
                <span className="text-xs font-normal text-[#94A3B8]">
                  ({selectedTrackIds.length} of {tracks.length} Tracks Selected)
                </span>
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#64748B] hover:text-white rounded-lg hover:bg-[#1E293B] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Telemetry Bar */}
        <div className="px-6 py-2.5 bg-[#060912] border-b border-[#162035] flex items-center justify-between text-xs flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#64748B] uppercase font-bold">Tempo:</span>
              <span className="font-bold text-[#FF8C00] font-mono">{tempo} BPM</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#64748B] uppercase font-bold">Sample Rate:</span>
              <span className="font-bold text-cyan-300 font-mono">{(sampleRate / 1000).toFixed(1)} kHz</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#64748B] uppercase font-bold">Bit Depth:</span>
              <span className="font-bold text-emerald-400 font-mono">{bitDepth}-bit PCM</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#64748B] uppercase font-bold">Normalization:</span>
              <span className="font-bold text-amber-300 font-mono">
                {normalizeEnabled ? `${targetPeakDb} dBFS (${normalizeMode})` : 'Bypassed'}
              </span>
            </div>
          </div>

          <div className="text-[10px] text-[#7E8BA8]">
            Phase-coherent stem bounce for Ableton, Logic, Pro Tools, Reaper & FL Studio
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[72vh]">
          {/* 1. Track Selection Matrix */}
          <div className="p-4 rounded-xl bg-[#0B101E] border border-[#1C2640] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#18233C] flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers size={14} className="text-emerald-400" />
                  <span>1. Active Tracks Selection ({selectedTrackIds.length} Selected)</span>
                </h3>
                <p className="text-[10px] text-[#64748B] mt-0.5">
                  Select which active studio tracks will be rendered into individual WAV files.
                </p>
              </div>

              <div className="flex items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={handleSelectActiveOnly}
                  className="px-2.5 py-1 rounded bg-[#131B2E] hover:bg-[#1E2B48] text-emerald-400 border border-emerald-500/30 font-bold transition-colors cursor-pointer"
                >
                  Active Only
                </button>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2.5 py-1 rounded bg-[#131B2E] hover:bg-[#1E2B48] text-[#94A3B8] hover:text-white border border-[#212C46] transition-colors cursor-pointer"
                >
                  Select All ({tracks.length})
                </button>
                <button
                  type="button"
                  onClick={handleInvertSelection}
                  className="px-2.5 py-1 rounded bg-[#131B2E] hover:bg-[#1E2B48] text-[#94A3B8] hover:text-white border border-[#212C46] transition-colors cursor-pointer"
                >
                  Invert
                </button>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-2.5 py-1 rounded bg-[#131B2E] hover:bg-[#1E2B48] text-[#64748B] hover:text-red-400 border border-[#212C46] transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Track Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
              {tracks.map((track, idx) => {
                const isSelected = selectedTrackIds.includes(track.id);
                const isMuted = track.muted;
                const isSoloed = track.soloed;

                return (
                  <div
                    key={track.id}
                    onClick={() => handleToggleTrack(track.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#121C32] border-emerald-500/50 text-white shadow-sm'
                        : 'bg-[#0B0F1C] border-[#18233C] text-[#64748B] hover:border-[#243354]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-all ${
                        isSelected ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-[#2F3D5B] bg-[#0A0E1A]'
                      }`}>
                        {isSelected && <Check size={11} strokeWidth={3} />}
                      </div>

                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: track.color || '#00F0FF' }}
                      />

                      <span className="truncate font-bold text-[11px]" title={track.name}>
                        {String(idx + 1).padStart(2, '0')}. {track.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 text-[9px] font-mono">
                      {isSoloed && (
                        <span className="px-1 py-0.5 rounded bg-amber-950 text-amber-300 font-bold border border-amber-500/40">
                          SOLO
                        </span>
                      )}
                      {isMuted && (
                        <span className="px-1 py-0.5 rounded bg-red-950 text-red-400 font-bold border border-red-500/40">
                          MUTE
                        </span>
                      )}
                      <span className="text-[#55637E] uppercase">
                        {track.isMono ? '1ch' : '2ch'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Normalization & Peak Ceiling Controls */}
          <div className="p-4 rounded-xl bg-[#0B101E] border border-[#1C2640] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#18233C]">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Gauge size={14} className="text-amber-400" />
                  <span>2. Audio Normalization & Peak Calibration</span>
                </h3>
                <p className="text-[10px] text-[#64748B] mt-0.5">
                  Scales stems to optimal dynamic headroom without introducing analog clipping or distortion.
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={normalizeEnabled}
                  onChange={(e) => setNormalizeEnabled(e.target.checked)}
                  className="accent-amber-400 w-4 h-4 rounded"
                />
                <span className={`text-xs font-bold transition-colors ${
                  normalizeEnabled ? 'text-amber-300' : 'text-[#64748B]'
                }`}>
                  {normalizeEnabled ? 'NORMALIZATION ENABLED' : 'BYPASS NORMALIZATION'}
                </span>
              </label>
            </div>

            {normalizeEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Normalization Mode Selection */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-[#94A3B8]">
                    Normalization Algorithm Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNormalizeMode('independent')}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        normalizeMode === 'independent'
                          ? 'bg-amber-950/50 border-amber-500 text-white shadow-sm'
                          : 'bg-[#121626] border-[#222E4A] text-[#7E8BA8] hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center justify-between">
                        <span>Independent Peak</span>
                        {normalizeMode === 'independent' && <Check size={12} className="text-amber-400" />}
                      </div>
                      <div className="text-[9px] text-[#64748B] mt-1 leading-snug">
                        Each stem boosted to target peak individually (Max dynamic presence for stems).
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNormalizeMode('relative')}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        normalizeMode === 'relative'
                          ? 'bg-amber-950/50 border-amber-500 text-white shadow-sm'
                          : 'bg-[#121626] border-[#222E4A] text-[#7E8BA8] hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center justify-between">
                        <span>Master-Relative</span>
                        {normalizeMode === 'relative' && <Check size={12} className="text-amber-400" />}
                      </div>
                      <div className="text-[9px] text-[#64748B] mt-1 leading-snug">
                        Lifts entire track group while preserving exact inter-track fader mix balance.
                      </div>
                    </button>
                  </div>
                </div>

                {/* Target Peak Ceiling Presets */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-[#94A3B8]">
                      Target Peak Ceiling
                    </label>
                    <span className="text-xs font-bold text-amber-300 font-mono">
                      {targetPeakDb.toFixed(2)} dBFS (Linear: {(dbToLinearPeak(targetPeakDb) * 100).toFixed(1)}%)
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5">
                    {PEAK_CEILING_PRESETS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setTargetPeakDb(p.value)}
                        className={`py-1.5 px-1 rounded text-center border text-[10px] font-bold transition-all cursor-pointer ${
                          Math.abs(targetPeakDb - p.value) < 0.01
                            ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
                            : 'bg-[#121626] border-[#222E4A] text-[#8C98B8] hover:text-white'
                        }`}
                        title={p.desc}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div className="pt-1 flex items-center gap-3">
                    <span className="text-[10px] text-[#64748B]">-12 dBFS</span>
                    <input
                      type="range"
                      min={-12}
                      max={0}
                      step={0.1}
                      value={targetPeakDb}
                      onChange={(e) => setTargetPeakDb(Number(e.target.value))}
                      className="flex-1 accent-amber-400 h-1.5 rounded-lg bg-[#141A2C]"
                    />
                    <span className="text-[10px] text-[#64748B]">0.0 dBFS</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Sample Rate Conversion & Bit Depth */}
          <div className="p-4 rounded-xl bg-[#0B101E] border border-[#1C2640] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#18233C]">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Activity size={14} className="text-cyan-400" />
                  <span>3. Sample Rate Conversion & Bit Depth</span>
                </h3>
                <p className="text-[10px] text-[#64748B] mt-0.5">
                  High-precision sinc interpolation resampling via Web Audio Offline Rendering Engine.
                </p>
              </div>

              <div className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 font-bold">
                PRISTINE RESAMPLING
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sample Rate Options */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-[#94A3B8]">
                  Export Sample Rate
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {SAMPLE_RATE_OPTIONS.map((sr) => (
                    <button
                      key={sr.value}
                      type="button"
                      onClick={() => setSampleRate(sr.value)}
                      className={`px-3 py-2 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                        sampleRate === sr.value
                          ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-sm'
                          : 'bg-[#121626] border-[#222E4A] text-[#7E8BA8] hover:text-white'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold flex items-center gap-2">
                          <span>{sr.label}</span>
                          {sr.badge && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-900/60 text-cyan-300 font-mono font-bold">
                              {sr.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-[#64748B] mt-0.5">{sr.desc}</div>
                      </div>

                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        sampleRate === sr.value ? 'border-cyan-400 bg-cyan-400' : 'border-[#334155]'
                      }`}>
                        {sampleRate === sr.value && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bit Depth & Routing Mode */}
              <div className="space-y-4">
                {/* Bit Depth */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#94A3B8]">
                    PCM Bit Depth Container
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBitDepth(24)}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        bitDepth === 24
                          ? 'bg-emerald-950/60 border-emerald-400 text-white shadow-sm'
                          : 'bg-[#121626] border-[#222E4A] text-[#7E8BA8] hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center justify-between">
                        <span>24-bit PCM WAV</span>
                        <span className="text-[9px] text-emerald-400 font-bold">PRO</span>
                      </div>
                      <div className="text-[9px] text-[#64748B] mt-1">
                        144 dB dynamic range. Studio standard for multi-track stem interchange.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBitDepth(16)}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        bitDepth === 16
                          ? 'bg-emerald-950/60 border-emerald-400 text-white shadow-sm'
                          : 'bg-[#121626] border-[#222E4A] text-[#7E8BA8] hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center justify-between">
                        <span>16-bit PCM WAV</span>
                        <span className="text-[9px] text-[#64748B]">CD</span>
                      </div>
                      <div className="text-[9px] text-[#64748B] mt-1">
                        96 dB dynamic range. Compact legacy format for CD / hardware samplers.
                      </div>
                    </button>
                  </div>
                </div>

                {/* Stems Routing Mode */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#94A3B8]">
                    Stem Bounce Signal Path
                  </label>
                  <select
                    value={dryStems ? 'dry' : 'wet'}
                    onChange={(e) => setDryStems(e.target.value === 'dry')}
                    className="w-full bg-[#121626] border border-[#222E4A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="wet">With Track Faders, Pan & Automation Envelopes</option>
                    <option value="dry">Dry Unity Gain (0 dB Fader, Center Pan, Raw Out)</option>
                  </select>
                </div>

                {/* Stem Naming Pattern */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#94A3B8]">
                    Stem File Naming Format
                  </label>
                  <select
                    value={namingFormat}
                    onChange={(e) => setNamingFormat(e.target.value as any)}
                    className="w-full bg-[#121626] border border-[#222E4A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="numbered">Numbered: 01_Drums.wav, 02_Bass.wav</option>
                    <option value="clean">Clean: Drums_Stem.wav, Bass_Stem.wav</option>
                    <option value="detailed">Detailed: 01_Drums_{tempo}BPM_{sampleRate}Hz_{bitDepth}bit.wav</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Arrangement Range & Archive Filename */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#94A3B8] mb-1.5 uppercase">
                Stem Archive Filename
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={archiveName}
                  onChange={(e) => setArchiveName(e.target.value)}
                  disabled={isRendering}
                  className="w-full bg-[#121626] border border-[#222E4A] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 transition-colors pr-14"
                />
                <span className="absolute right-3.5 top-2 text-xs text-[#64748B]">.zip</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#94A3B8] mb-1.5 uppercase">
                Export Arrangement Span
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRangeMode('full')}
                  className={`py-2 px-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    rangeMode === 'full'
                      ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300'
                      : 'bg-[#121626] border-[#222E4A] text-[#7E8BA8] hover:text-white'
                  }`}
                >
                  Full (16 Bars)
                </button>
                <button
                  type="button"
                  onClick={() => setRangeMode('loop')}
                  className={`py-2 px-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    rangeMode === 'loop'
                      ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300'
                      : 'bg-[#121626] border-[#222E4A] text-[#7E8BA8] hover:text-white'
                  }`}
                >
                  Loop Region
                </button>
                <button
                  type="button"
                  onClick={() => setRangeMode('custom')}
                  className={`py-2 px-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    rangeMode === 'custom'
                      ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300'
                      : 'bg-[#121626] border-[#222E4A] text-[#7E8BA8] hover:text-white'
                  }`}
                >
                  Custom Bars
                </button>
              </div>
            </div>
          </div>

          {/* Manifest Checkbox */}
          <label className="flex items-center justify-between p-3 rounded-xl bg-[#0E1424] border border-[#1A253E] cursor-pointer hover:border-[#28385A]">
            <div className="flex items-center gap-2.5">
              <FileText size={16} className="text-emerald-400" />
              <div>
                <span className="text-xs font-bold text-white block">
                  Generate SESSION_MANIFEST.txt & DAW Routing Guide
                </span>
                <span className="text-[10px] text-[#64748B]">
                  Embeds BPM, sample rate, bit depth, stem channel assignments, and RMS peak analysis.
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={includeManifest}
              onChange={(e) => setIncludeManifest(e.target.checked)}
              className="accent-emerald-400 w-4 h-4 rounded"
            />
          </label>

          {/* Render Progress Telemetry */}
          {isRendering && (
            <div className="p-4 rounded-xl bg-[#091522] border border-cyan-500/50 space-y-2.5 animate-fade-in shadow-inner">
              <div className="flex items-center justify-between text-xs">
                <span className="text-cyan-300 flex items-center gap-2 font-bold truncate pr-2">
                  <Loader2 size={15} className="animate-spin text-cyan-400 shrink-0" />
                  <span className="truncate">{statusText}</span>
                </span>
                <span className="font-mono font-black text-white shrink-0">{progress}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-[#050B14] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-[#FFD700] transition-all duration-300 shadow-[0_0_12px_rgba(6,182,212,0.6)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Audio preview element */}
          <audio ref={audioPreviewRef} />

          {/* Render Completion Results View */}
          {batchResult && !isRendering && (
            <div className="p-5 rounded-xl bg-gradient-to-b from-[#0A1F16] to-[#07140E] border border-emerald-500/60 space-y-4 animate-fade-in shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-900/50 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-400" />
                  <div>
                    <h4 className="text-sm font-black text-white tracking-wide">
                      BATCH STEM EXPORT COMPLETE!
                    </h4>
                    <p className="text-[10px] text-emerald-300">
                      {batchResult.stems.length} Active Tracks rendered to {bitDepth}-bit / {(sampleRate/1000).toFixed(1)} kHz WAV
                    </p>
                  </div>
                </div>

                <div className="text-xs text-[#94A3B8] font-mono">
                  {(batchResult.totalSizeBytes / (1024 * 1024)).toFixed(2)} MB Total • {batchResult.durationSeconds.toFixed(1)}s
                </div>
              </div>

              {/* Action Buttons: Download ZIP or Download All Individual WAVs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleDownloadAllWavsIndividually}
                  disabled={isBatchDownloading}
                  className="px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  title="Directly trigger browser downloads for each individual WAV file"
                >
                  {isBatchDownloading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>DOWNLOADING INDIVIDUAL WAVS...</span>
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      <span>DOWNLOAD ALL INDIVIDUAL WAVs</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadZip}
                  className="px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all cursor-pointer active:scale-95"
                  title="Download all stems bundled into a single ZIP archive"
                >
                  <FolderArchive size={16} />
                  <span>DOWNLOAD ZIP ARCHIVE (.ZIP)</span>
                </button>
              </div>

              {/* Individual Stems List with In-Dialog Audition & Direct Download */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                <div className="text-[10px] text-[#7E8BA8] uppercase font-bold px-1 flex items-center justify-between">
                  <span>RENDERED ACTIVE STEMS ({batchResult.stems.length})</span>
                  <span>1-CLICK AUDITION & INDIVIDUAL DOWNLOAD</span>
                </div>

                {batchResult.stems.map((stem) => (
                  <div
                    key={stem.trackId}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#06120B] border border-[#122A1A] hover:border-emerald-500/40 text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2.5 truncate pr-2">
                      <button
                        type="button"
                        onClick={() => handleToggleAudition(stem)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                          playingStemId === stem.trackId 
                            ? 'bg-emerald-400 text-black shadow-[0_0_10px_rgba(16,185,129,0.6)]' 
                            : 'bg-[#0E2416] text-emerald-400 hover:bg-emerald-500 hover:text-black'
                        }`}
                        title="Audition stem"
                      >
                        {playingStemId === stem.trackId ? <Pause size={12} /> : <Play size={12} className="ml-0.5 fill-current" />}
                      </button>

                      <div className="truncate">
                        <div className="text-white font-mono text-[11px] font-bold truncate">
                          {stem.filename}
                        </div>
                        <div className="text-[9px] text-[#7E8BA8] flex items-center gap-2 mt-0.5 font-mono">
                          <span>{(stem.sizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
                          <span>•</span>
                          <span>{stem.durationSeconds.toFixed(1)}s</span>
                          {stem.peakDb !== undefined && (
                            <>
                              <span>•</span>
                              <span className="text-amber-300 font-bold">Peak: {stem.peakDb} dBFS</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDownloadSingleStemWav(stem)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#0E2416] hover:bg-emerald-500 hover:text-black text-emerald-400 font-bold text-[10px] flex items-center gap-1.5 transition-all shrink-0 border border-emerald-500/30 cursor-pointer"
                      title={`Download ${stem.filename}`}
                    >
                      <Download size={11} />
                      <span>Download .WAV</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-[#1A253E] bg-[#0C1222] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {batchResult ? (
              <button
                type="button"
                onClick={handleDownloadAllWavsIndividually}
                className="px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-cyan-400 to-blue-500 text-black hover:brightness-110 transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Download size={14} />
                DOWNLOAD ALL INDIVIDUAL WAVs ({batchResult.stems.length})
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartStemExport}
                disabled={isRendering || selectedTrackIds.length === 0}
                className="px-7 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-black hover:brightness-110 transition-all shadow-[0_0_25px_rgba(16,185,129,0.4)] flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none cursor-pointer active:scale-95"
              >
                {isRendering ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-black" />
                    <span>BOUNCING {selectedTrackIds.length} ACTIVE STEMS...</span>
                  </>
                ) : (
                  <>
                    <FolderArchive size={14} />
                    <span>RENDER & BATCH EXPORT ALL ACTIVE TRACKS (.WAV)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchStemExportModal;
