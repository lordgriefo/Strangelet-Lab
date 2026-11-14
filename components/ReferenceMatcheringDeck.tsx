import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Waves,
  Headphones,
  Volume2,
  RotateCw,
  Trash2,
  Sliders,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { masterAudioBus, ReferenceMatchResult } from '../lib/masterBus';
import { playLaserBeamSound, playColliderInjectionSound } from '../lib/laserSound';

interface ReferenceMatcheringDeckProps {
  onMatchApplied?: (result: ReferenceMatchResult) => void;
  onToast?: (msg: string) => void;
  compact?: boolean;
}

const BAND_SPECS = [
  { key: 'sub' as const, specKey: 'subDb' as const, label: 'Sub', range: '20-90 Hz', color: '#3B82F6' },
  { key: 'lowMid' as const, specKey: 'lowMidDb' as const, label: 'Low-Mid', range: '90-420 Hz', color: '#10B981' },
  { key: 'mid' as const, specKey: 'midDb' as const, label: 'Mid', range: '420-2.2k', color: '#F59E0B' },
  { key: 'presence' as const, specKey: 'presenceDb' as const, label: 'Presence', range: '2.2k-6.5k', color: '#A855F7' },
  { key: 'air' as const, specKey: 'airDb' as const, label: 'Air', range: '6.5k-18k', color: '#06B6D4' }
];

export const ReferenceMatcheringDeck: React.FC<ReferenceMatcheringDeckProps> = ({
  onMatchApplied,
  onToast,
  compact = false
}) => {
  const [match, setMatch] = useState<ReferenceMatchResult | null>(() => masterAudioBus.getReferenceMatchState().match);
  const [isAuditioning, setIsAuditioning] = useState<boolean>(() => masterAudioBus.getReferenceMatchState().isAuditioning);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(() => masterAudioBus.getReferenceMatchState().isAnalyzing);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastFileRef = useRef<File | null>(null);

  useEffect(() => {
    return masterAudioBus.subscribeReferenceMatch(state => {
      setMatch(state.match);
      setIsAuditioning(state.isAuditioning);
      setIsAnalyzing(state.isAnalyzing);
    });
  }, []);

  const processReferenceFile = async (file: File) => {
    setErrorMsg(null);
    lastFileRef.current = file;
    playLaserBeamSound('laser_select');

    try {
      const result = await masterAudioBus.loadAndMatchReferenceTrack(file);
      playColliderInjectionSound();
      onMatchApplied?.(result);
      onToast?.(
        `Matchering calibrated 6-band EQ to "${result.fileName}" (Level match ${result.levelMatchTrimDb >= 0 ? '+' : ''}${result.levelMatchTrimDb.toFixed(1)} dB)`
      );
    } catch (err: any) {
      const msg = err?.message || 'Could not decode reference audio file. Please drop a valid .wav or .mp3 track.';
      setErrorMsg(msg);
      onToast?.(msg);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processReferenceFile(file);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processReferenceFile(file);
    }
  };

  const handleToggleAudition = () => {
    const nowPlayingRef = masterAudioBus.toggleReferenceAudition();
    playLaserBeamSound(nowPlayingRef ? 'laser_audio' : 'laser_select');
    onToast?.(
      nowPlayingRef
        ? `Auditioning Reference Track (${match?.levelMatchTrimDb !== undefined ? `${match.levelMatchTrimDb >= 0 ? '+' : ''}${match.levelMatchTrimDb.toFixed(1)} dB level-matched` : 'level-matched'})`
        : 'Returned to Master Bus Output'
    );
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = Math.floor(sec % 60);
    return `${mins}:${rem.toString().padStart(2, '0')}`;
  };

  const dbToPercent = (db: number) => Math.max(6, Math.min(100, ((db + 65) / 65) * 100));

  return (
    <div
      onDragOver={e => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
      }}
      onDragLeave={e => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
      }}
      onDrop={handleDrop}
      className={`rounded-2xl border transition-all font-mono ${
        isDragging
          ? 'bg-amber-950/30 border-[#FFD700] shadow-[0_0_25px_rgba(255,215,0,0.3)]'
          : 'bg-[#090C19] border-[#212948] shadow-xl'
      } ${compact ? 'p-3.5 space-y-3' : 'p-4 sm:p-5 space-y-3.5'}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".wav,.mp3,.ogg,.flac,.m4a,audio/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Top Row: Dropzone Prompt + Controls */}
      <div className={`flex ${compact ? 'flex-col gap-3' : 'flex-col lg:flex-row lg:items-center justify-between gap-4'}`}>
        {/* Interactive Drop Target */}
        <div
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`flex-1 flex items-center gap-3.5 rounded-xl border-2 border-dashed px-4 py-3 cursor-pointer transition-all group ${
            isDragging
              ? 'border-[#FFD700] bg-amber-950/40'
              : match
              ? 'border-emerald-500/40 bg-[#050814] hover:border-[#FFD700]'
              : 'border-[#253052] bg-[#050711] hover:border-[#FFD700]'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
              isAnalyzing
                ? 'bg-amber-950/60 border-amber-400 text-amber-300'
                : match
                ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
                : 'bg-[#0E1326] border-[#232D4D] text-[#7D88AC] group-hover:text-[#FFD700] group-hover:border-[#FFD700]/50'
            }`}
          >
            {isAnalyzing ? <RotateCw className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-white group-hover:text-[#FFD700] transition-colors">
                Drop Reference Audio Track (Matchering)
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded bg-amber-950/70 border border-amber-500/40 text-amber-300 font-bold uppercase">
                Web Audio FFT Match
              </span>
              {match && (
                <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>6-Band EQ Calibrated</span>
                </span>
              )}
            </div>

            {isAnalyzing ? (
              <p className="text-[11px] text-amber-300 mt-0.5">
                Decoding audio buffer &amp; computing 5-band FFT tonal contour...
              </p>
            ) : match ? (
              <p className="text-[11px] text-[#98A4C8] mt-0.5 truncate">
                <strong className="text-white">{match.fileName}</strong> &bull; {formatDuration(match.durationSec)} &bull; Ref RMS{' '}
                <span className="text-cyan-300">{match.refRmsDb.toFixed(1)} dB</span> vs Master{' '}
                <span className="text-amber-300">{match.masterRmsDb.toFixed(1)} dB</span> &bull; Compared to:{' '}
                <span className="text-purple-300">{match.masterSourceLabel}</span>
              </p>
            ) : (
              <p className="text-[11px] text-[#7E88AA] mt-0.5">
                Drop or click to load a .WAV / .MP3 reference song. Automatically measures Sub, Low-Mid, Mid, Presence &amp; Air FFT balance and calibrates the 6-band Parametric EQ.
              </p>
            )}
          </div>
        </div>

        {/* Audition & Utility Actions */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleToggleAudition}
            disabled={!match || isAnalyzing}
            className={`px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all border cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isAuditioning
                ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-black border-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.45)] animate-pulse'
                : match
                ? 'bg-[#11172E] hover:bg-[#192344] text-cyan-200 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.18)]'
                : 'bg-[#0C1020] text-[#5B6487] border-[#1D2542]'
            }`}
            title="Toggle level-matched playback between your Master Bus and the Reference Track"
          >
            {isAuditioning ? <Volume2 className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
            <span>{isAuditioning ? 'Auditioning Reference (Switch to Master)' : 'Audition Reference Track'}</span>
            {match && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                isAuditioning ? 'bg-black/20 text-black' : 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
              }`}>
                {match.levelMatchTrimDb >= 0 ? '+' : ''}
                {match.levelMatchTrimDb.toFixed(1)} dB Match
              </span>
            )}
          </button>

          {match && lastFileRef.current && (
            <button
              type="button"
              onClick={() => void processReferenceFile(lastFileRef.current!)}
              disabled={isAnalyzing}
              className="px-2.5 py-2.5 rounded-xl bg-[#11172D] hover:bg-[#1B2444] border border-[#243054] text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all"
              title="Re-run FFT spectral match against current Master Bus"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Re-Match</span>
            </button>
          )}

          {match && (
            <button
              type="button"
              onClick={() => {
                lastFileRef.current = null;
                masterAudioBus.clearReferenceTrack();
                onToast?.('Cleared reference matchering track.');
              }}
              className="p-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 transition-colors"
              title="Unload reference track"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="px-3 py-2 rounded-lg bg-red-950/50 border border-red-500/40 text-red-300 text-[11px]">
          {errorMsg}
        </div>
      )}

      {/* 5-Band FFT Comparison & 6-Band EQ Auto-Calibration Readout */}
      {match && (
        <div className="pt-2 border-t border-[#18203B] space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
            <span className="text-[#9AA5C9] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Waves className="w-3.5 h-3.5 text-cyan-400" />
              <span>5-Band FFT Tonal Comparison &amp; Auto-Calibrated 6-Band EQ Offsets</span>
            </span>
            <span className="text-[#7E88AA]">
              HPF: <strong className="text-pink-300">{match.calibratedLowCutHz} Hz</strong> &bull; LPF:{' '}
              <strong className="text-cyan-300">{(match.calibratedHighCutHz / 1000).toFixed(1)} kHz</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {BAND_SPECS.map(spec => {
              const refVal = match.refSpectrum[spec.specKey];
              const masterVal = match.masterSpectrum[spec.specKey];
              const eqDelta = match.eqAdjustmentsDb[spec.key];
              return (
                <div
                  key={spec.key}
                  className="p-2.5 rounded-xl bg-[#050814] border border-[#1B2340] space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white">{spec.label}</span>
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                        eqDelta > 0.2
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                          : eqDelta < -0.2
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                          : 'bg-[#12182C] text-[#8E96B8]'
                      }`}
                    >
                      {eqDelta >= 0 ? '+' : ''}
                      {eqDelta.toFixed(1)} dB
                    </span>
                  </div>

                  {/* Mini Dual Bars: Reference vs Master */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[9px] text-[#7D88AC]">
                      <span className="w-6">REF</span>
                      <div className="flex-1 h-1.5 bg-[#12182D] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${dbToPercent(refVal)}%`, backgroundColor: spec.color }}
                        />
                      </div>
                      <span className="w-9 text-right text-[#CBD5F5]">{refVal.toFixed(0)}dB</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] text-[#7D88AC]">
                      <span className="w-6">MST</span>
                      <div className="flex-1 h-1.5 bg-[#12182D] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-400/80"
                          style={{ width: `${dbToPercent(masterVal)}%` }}
                        />
                      </div>
                      <span className="w-9 text-right text-amber-200">{masterVal.toFixed(0)}dB</span>
                    </div>
                  </div>

                  <div className="text-[9px] text-[#5B6488] flex items-center justify-between">
                    <span>{spec.range}</span>
                    <Sparkles className="w-2.5 h-2.5 text-amber-400/70" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferenceMatcheringDeck;
