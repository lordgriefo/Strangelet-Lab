import React, { useState } from 'react';
import { Download, X, Settings2, Play, Pause, CheckCircle2, Music, Sparkles, Loader2 } from 'lucide-react';
import { Track } from '../types';
import { offlineAudioRenderer, ExportResult } from '../services/offlineAudioRenderer';
import { playLaserBeamSound } from '../lib/laserSound';

interface ExportProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: Track[];
  tempo: number;
  masterGain: number;
  loopRange?: { start: number; end: number };
}

export const ExportProjectModal: React.FC<ExportProjectModalProps> = ({
  isOpen,
  onClose,
  tracks,
  tempo,
  masterGain,
  loopRange
}) => {
  const [filename, setFilename] = useState(`Strangelet_Arrangement_${tempo}BPM`);
  const [sampleRate, setSampleRate] = useState<number>(44100);
  const [bitDepth, setBitDepth] = useState<16 | 24>(16);
  const [rangeMode, setRangeMode] = useState<'full' | 'loop' | 'custom'>('full');
  const [customStartBar, setCustomStartBar] = useState<number>(1);
  const [customEndBar, setCustomEndBar] = useState<number>(16);
  const [normalize, setNormalize] = useState<boolean>(true);
  const [limiter, setLimiter] = useState<boolean>(true);

  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('');
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);

  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const audioPreviewRef = React.useRef<HTMLAudioElement | null>(null);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    setIsRendering(true);
    setProgress(5);
    setStatusText('Preparing arrangement tracks...');
    setExportResult(null);

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
    } catch (err) {
      console.error('Offline audio export failed:', err);
      setStatusText('Export failed. Please check browser audio permissions.');
    } finally {
      setIsRendering(false);
    }
  };

  const handleDownload = () => {
    if (exportResult) {
      const anchor = document.createElement('a');
      anchor.href = exportResult.downloadUrl;
      anchor.download = exportResult.filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      playLaserBeamSound('laser_curve');
    }
  };

  const togglePreview = () => {
    if (!audioPreviewRef.current) return;
    if (isPlayingPreview) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPreviewRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const activeTracksCount = tracks.filter(t => !t.muted).length;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#0B0D17] border border-[#26619C] rounded-2xl w-full max-w-xl shadow-[0_0_50px_rgba(38,97,156,0.3)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1E293B] flex items-center justify-between bg-[#101426]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#FF8C00]/20 border border-[#FF8C00]/40 flex items-center justify-center text-[#FF8C00]">
              <Download size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono tracking-wide flex items-center gap-2">
                EXPORT PROJECT
                <span className="px-2 py-0.5 rounded text-[10px] bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40">
                  OFFLINE WAV BOUNCE
                </span>
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Render arrangement via browser Web Audio OfflineAudioContext
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#64748B] hover:text-white rounded-lg hover:bg-[#1E293B] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Filename Input */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#94A3B8] mb-1.5 font-bold">
              Output Filename (.wav)
            </label>
            <div className="relative">
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                disabled={isRendering}
                className="w-full bg-[#141829] border border-[#283256] rounded-lg px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#FF8C00] transition-colors pr-16"
              />
              <span className="absolute right-3 top-2 text-xs font-mono text-[#64748B]">.wav</span>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-[#121528] border border-[#1F2646]">
            <div>
              <span className="text-[10px] uppercase font-mono text-[#64748B] block">Tempo</span>
              <span className="text-xs font-mono font-bold text-[#FF8C00]">{tempo} BPM</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono text-[#64748B] block">Active Tracks</span>
              <span className="text-xs font-mono font-bold text-[#10B981]">{activeTracksCount} / {tracks.length}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono text-[#64748B] block">Master Gain</span>
              <span className="text-xs font-mono font-bold text-white">{Math.round(masterGain * 100)}%</span>
            </div>
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sample Rate */}
            <div>
              <label className="block text-xs font-mono text-[#94A3B8] mb-1.5 font-bold">
                Sample Rate
              </label>
              <select
                value={sampleRate}
                onChange={(e) => setSampleRate(Number(e.target.value))}
                disabled={isRendering}
                className="w-full bg-[#141829] border border-[#283256] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#FF8C00]"
              >
                <option value={44100}>44.1 kHz (CD Standard)</option>
                <option value={48000}>48.0 kHz (Studio / Broadcast)</option>
                <option value={96000}>96.0 kHz (Hi-Res Audio)</option>
              </select>
            </div>

            {/* Bit Depth */}
            <div>
              <label className="block text-xs font-mono text-[#94A3B8] mb-1.5 font-bold">
                Bit Depth
              </label>
              <select
                value={bitDepth}
                onChange={(e) => setBitDepth(Number(e.target.value) as 16 | 24)}
                disabled={isRendering}
                className="w-full bg-[#141829] border border-[#283256] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#FF8C00]"
              >
                <option value={16}>16-bit PCM (Standard)</option>
                <option value={24}>24-bit PCM (Studio Master)</option>
              </select>
            </div>
          </div>

          {/* Export Range */}
          <div>
            <label className="block text-xs font-mono text-[#94A3B8] mb-1.5 font-bold">
              Arrangement Range
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRangeMode('full')}
                className={`py-2 px-2.5 rounded-lg text-xs font-mono font-semibold transition-colors border ${
                  rangeMode === 'full'
                    ? 'bg-[#FF8C00]/20 border-[#FF8C00] text-[#FF8C00]'
                    : 'bg-[#141829] border-[#283256] text-[#94A3B8] hover:text-white'
                }`}
              >
                Full (16 Bars)
              </button>
              <button
                type="button"
                onClick={() => setRangeMode('loop')}
                className={`py-2 px-2.5 rounded-lg text-xs font-mono font-semibold transition-colors border ${
                  rangeMode === 'loop'
                    ? 'bg-[#FF8C00]/20 border-[#FF8C00] text-[#FF8C00]'
                    : 'bg-[#141829] border-[#283256] text-[#94A3B8] hover:text-white'
                }`}
              >
                Loop Region
              </button>
              <button
                type="button"
                onClick={() => setRangeMode('custom')}
                className={`py-2 px-2.5 rounded-lg text-xs font-mono font-semibold transition-colors border ${
                  rangeMode === 'custom'
                    ? 'bg-[#FF8C00]/20 border-[#FF8C00] text-[#FF8C00]'
                    : 'bg-[#141829] border-[#283256] text-[#94A3B8] hover:text-white'
                }`}
              >
                Custom Bars
              </button>
            </div>

            {rangeMode === 'custom' && (
              <div className="flex items-center gap-3 mt-2.5">
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-[11px] font-mono text-[#64748B]">From Bar</span>
                  <input
                    type="number"
                    min={1}
                    max={16}
                    value={customStartBar}
                    onChange={(e) => setCustomStartBar(Math.max(1, Number(e.target.value)))}
                    className="w-16 bg-[#141829] border border-[#283256] rounded px-2 py-1 text-xs text-white font-mono text-center"
                  />
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-[11px] font-mono text-[#64748B]">To Bar</span>
                  <input
                    type="number"
                    min={1}
                    max={16}
                    value={customEndBar}
                    onChange={(e) => setCustomEndBar(Math.min(16, Number(e.target.value)))}
                    className="w-16 bg-[#141829] border border-[#283256] rounded px-2 py-1 text-xs text-white font-mono text-center"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Audio Mastering Enhancements */}
          <div className="space-y-2 pt-1 border-t border-[#1E293B]">
            <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#141829] border border-[#283256] cursor-pointer hover:border-[#384576]">
              <div className="flex flex-col">
                <span className="text-xs font-mono font-semibold text-white">Normalize Peak Output</span>
                <span className="text-[10px] text-[#64748B]">Scales audio to -0.35 dBFS peak without clipping</span>
              </div>
              <input
                type="checkbox"
                checked={normalize}
                onChange={(e) => setNormalize(e.target.checked)}
                className="accent-[#FF8C00] w-4 h-4 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#141829] border border-[#283256] cursor-pointer hover:border-[#384576]">
              <div className="flex flex-col">
                <span className="text-xs font-mono font-semibold text-white">Master Brickwall Limiter</span>
                <span className="text-[10px] text-[#64748B]">Fast 2ms lookahead limiter prevents inter-sample peaks</span>
              </div>
              <input
                type="checkbox"
                checked={limiter}
                onChange={(e) => setLimiter(e.target.checked)}
                className="accent-[#FF8C00] w-4 h-4 rounded"
              />
            </label>
          </div>

          {/* Progress / Status Bar */}
          {isRendering && (
            <div className="p-4 rounded-xl bg-[#141829] border border-[#FF8C00]/40 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#FF8C00] flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-[#FF8C00]" />
                  {statusText}
                </span>
                <span className="font-bold text-white">{progress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#060810] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#FF8C00] to-[#FFD700] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Render Completion Preview */}
          {exportResult && !isRendering && (
            <div className="p-4 rounded-xl bg-[#0F2218] border border-[#10B981]/50 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#10B981] flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  RENDER COMPLETE
                </span>
                <span className="text-[11px] font-mono text-[#94A3B8]">
                  {(exportResult.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB • {exportResult.durationSeconds.toFixed(1)}s
                </span>
              </div>

              {/* Hidden audio element for preview */}
              <audio
                ref={audioPreviewRef}
                src={exportResult.downloadUrl}
                onEnded={() => setIsPlayingPreview(false)}
              />

              {/* Preview Player Bar */}
              <div className="flex items-center gap-3 p-2 rounded-lg bg-[#06140E] border border-[#10B981]/30">
                <button
                  onClick={togglePreview}
                  className="p-2 rounded-full bg-[#10B981] text-black hover:bg-white transition-colors"
                >
                  {isPlayingPreview ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-white truncate font-semibold">
                    {exportResult.filename}
                  </div>
                  <div className="text-[10px] font-mono text-[#6EE7B7]">
                    Click to audition before saving to disk
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1E293B] bg-[#101426] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-mono text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {exportResult ? (
              <>
                <button
                  type="button"
                  onClick={handleStartExport}
                  disabled={isRendering}
                  className="px-3.5 py-2 rounded-lg text-xs font-mono text-[#94A3B8] hover:text-white border border-[#283256] hover:bg-[#1A223E] transition-colors"
                >
                  Re-Render
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-5 py-2 rounded-lg text-xs font-mono font-bold bg-[#10B981] text-black hover:bg-white transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center gap-2"
                >
                  <Download size={14} />
                  DOWNLOAD .WAV
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleStartExport}
                disabled={isRendering}
                className="px-6 py-2 rounded-lg text-xs font-mono font-bold bg-gradient-to-r from-[#FF8C00] to-[#FFD700] text-black hover:brightness-110 transition-all shadow-[0_0_20px_rgba(255,140,0,0.35)] flex items-center gap-2 disabled:opacity-50"
              >
                {isRendering ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    RENDERING...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    BOUNCE & EXPORT .WAV
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
