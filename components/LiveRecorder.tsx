import React, { useState, useEffect, useRef } from 'react';
import { liveRecordingEngine, RecordedTake } from '../lib/liveRecordingEngine';
import { Track, Clip } from '../types';
import { Mic, MicOff, Disc, Volume2, Radio, Check, X, Play, Square, Circle, Sparkles, ChevronRight } from 'lucide-react';

interface LiveRecorderProps {
  tracks: Track[];
  tempo: number;
  playheadBar?: number;
  onAddTrackWithClip: (trackName: string, clip: Clip) => void;
  onAddClipToTrack: (trackId: string, clip: Clip) => void;
  onClose?: () => void;
  isDocked?: boolean;
}

export const LiveRecorder: React.FC<LiveRecorderProps> = ({
  tracks,
  tempo,
  playheadBar = 0,
  onAddTrackWithClip,
  onAddClipToTrack,
  onClose,
  isDocked = false
}) => {
  const [isArmed, setIsArmed] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [micActive, setMicActive] = useState<boolean>(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [meterLevel, setMeterLevel] = useState<number>(0);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [targetTrackMode, setTargetTrackMode] = useState<'new' | string>('new');
  const [takeName, setTakeName] = useState<string>('Lead Vocal Take 1');
  const [monitorThrough, setMonitorThrough] = useState<boolean>(false);
  const [lastTake, setLastTake] = useState<RecordedTake | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const waveformHistoryRef = useRef<number[]>([]);

  // Initialize Mic stream on mount or arm
  const initMicrophone = async () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => {});
      }

      const success = await liveRecordingEngine.initMic(ctx, (level) => {
        setMeterLevel(level);
        waveformHistoryRef.current.push(level);
        if (waveformHistoryRef.current.length > 200) {
          waveformHistoryRef.current.shift();
        }
      });

      setMicActive(true);
      setMicError(null);
      return success;
    } catch (err: any) {
      console.warn('Microphone error:', err);
      setMicError(err.message || 'Microphone access restricted. Operating in simulated vintage tape mode.');
      setMicActive(true); // Still allow recording in simulated tape mode
      return false;
    }
  };

  useEffect(() => {
    initMicrophone();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Real-time oscilloscope visualizer loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    const draw = () => {
      phase += 0.05;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Background subtle grid
      ctx.strokeStyle = '#121A28';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Center zero-line
      ctx.strokeStyle = '#1E293B';
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Waveform trace
      ctx.beginPath();
      ctx.lineWidth = isRecording ? 2.5 : 1.5;
      ctx.strokeStyle = isRecording ? '#EF4444' : '#00F0FF';
      ctx.shadowColor = isRecording ? '#EF4444' : '#00F0FF';
      ctx.shadowBlur = isRecording ? 12 : 8;

      const history = waveformHistoryRef.current;
      const step = width / Math.max(1, history.length);

      for (let i = 0; i < history.length; i++) {
        const amp = history[i];
        const x = i * step;
        const waveFlutter = Math.sin(phase + i * 0.1) * 3;
        const y = height / 2 + (amp * (height * 0.45) * Math.sin(i * 0.2)) + (isRecording ? waveFlutter : 0);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    animationFrameRef.current = requestAnimationFrame(draw);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isRecording]);

  // Start Recording
  const handleStartRecord = () => {
    setIsRecording(true);
    setElapsedSec(0);
    waveformHistoryRef.current = [];

    // Assign temporary ID
    const targetId = targetTrackMode === 'new' ? `track-new-${Date.now()}` : targetTrackMode;
    liveRecordingEngine.startRecording([targetId]);

    timerRef.current = window.setInterval(() => {
      setElapsedSec((prev) => prev + 0.1);
    }, 100);
  };

  // Stop Recording & Auto-Place on Timeline
  const handleStopAndPlace = async () => {
    if (!isRecording) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setIsRecording(false);
    const takes = await liveRecordingEngine.stopRecording();

    if (takes && takes.length > 0) {
      const take = takes[0];
      setLastTake(take);

      // Calculate bars from recorded seconds
      const secondsPerBeat = 60 / tempo;
      const secondsPerBar = secondsPerBeat * 4;
      const durationBars = Math.max(1, Math.ceil(take.durationSeconds / secondsPerBar));

      const newClip: Clip = {
        id: `mic-take-${Math.random().toString(36).substring(2, 9)}`,
        name: takeName || `Live Take (${take.durationSeconds.toFixed(1)}s)`,
        startBar: Math.floor(playheadBar),
        durationBars: durationBars,
        isRecorded: true,
        audioUrl: take.url,
        waveformSnippet: take.waveform.length > 0 ? take.waveform : [0.2, 0.5, 0.8, 0.6, 0.3]
      };

      if (targetTrackMode === 'new') {
        onAddTrackWithClip(takeName || `Recorded Mic ${tracks.length + 1}`, newClip);
      } else {
        onAddClipToTrack(targetTrackMode, newClip);
      }
    }
  };

  // Calculate Bars:Beats display
  const secondsPerBeat = 60 / tempo;
  const currentTotalBeats = Math.floor(elapsedSec / secondsPerBeat);
  const currentBars = Math.floor(currentTotalBeats / 4) + 1;
  const currentBeatInBar = (currentTotalBeats % 4) + 1;

  return (
    <div
      className={`bg-[#0A0D18] border border-[#222F4E] rounded-xl overflow-hidden shadow-2xl flex flex-col ${
        isDocked ? 'w-full h-full' : 'max-w-2xl w-full mx-auto my-4'
      }`}
    >
      {/* Header */}
      <div className="px-5 py-3.5 bg-[#0D1220] border-b border-[#1E293B] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
              isRecording
                ? 'bg-red-950 border-red-500 text-red-400 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                : 'bg-[#141B2D] border-[#334155] text-[#00F0FF]'
            }`}
          >
            <Mic size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              LIVE MICROPHONE RECORDER
              {isRecording && (
                <span className="px-2 py-0.5 rounded text-[9px] bg-red-600 text-white font-mono animate-ping">
                  REC
                </span>
              )}
            </h3>
            <p className="text-[11px] text-[#94A3B8]">
              Direct browser mic capture with real-time waveform & automatic timeline placement
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="text-[#64748B] hover:text-white p-1 rounded hover:bg-[#1E293B] transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Main Recording Console */}
      <div className="p-5 flex flex-col gap-4">
        {/* Real-time Oscilloscope & VU Meters */}
        <div className="relative rounded-lg overflow-hidden border border-[#1E293B] bg-[#05070D]">
          <canvas
            ref={canvasRef}
            width={600}
            height={130}
            className="w-full h-32 block"
          />

          {/* Overlay Status */}
          <div className="absolute top-2.5 left-3 flex items-center gap-2 text-[10px] font-mono text-[#94A3B8] bg-black/60 px-2 py-0.5 rounded border border-white/10">
            <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-emerald-400'}`} />
            <span>{isRecording ? 'STREAM CAPTURING' : 'MONITOR STANDBY'}</span>
            <span className="text-[#475569]">|</span>
            <span>{tempo} BPM</span>
          </div>

          {/* Timecode & Bar Counter */}
          <div className="absolute top-2.5 right-3 text-right bg-black/70 px-2.5 py-1 rounded border border-[#00F0FF]/30 font-mono">
            <div className="text-xs font-bold text-[#00F0FF]">
              BAR {currentBars} : BEAT {currentBeatInBar}
            </div>
            <div className="text-[10px] text-[#94A3B8]">
              {elapsedSec.toFixed(1)}s elapsed
            </div>
          </div>
        </div>

        {/* Dual LED Stereo VU Meter Bars */}
        <div className="p-3 bg-[#080B14] rounded-lg border border-[#1E293B] flex items-center gap-4">
          <div className="text-[10px] font-mono text-[#64748B] w-8">VU</div>
          <div className="flex-1 flex flex-col gap-1.5">
            {/* Left Channel */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-[#94A3B8] w-3">L</span>
              <div className="flex-1 h-2.5 bg-[#020408] rounded-sm overflow-hidden flex border border-[#1E293B]">
                <div
                  className="h-full transition-all duration-75"
                  style={{
                    width: `${Math.min(100, meterLevel * 100)}%`,
                    background:
                      meterLevel > 0.85
                        ? 'linear-gradient(90deg, #10B981 60%, #F59E0B 80%, #EF4444 100%)'
                        : meterLevel > 0.6
                        ? 'linear-gradient(90deg, #10B981 70%, #F59E0B 100%)'
                        : '#10B981',
                  }}
                />
              </div>
            </div>
            {/* Right Channel */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-[#94A3B8] w-3">R</span>
              <div className="flex-1 h-2.5 bg-[#020408] rounded-sm overflow-hidden flex border border-[#1E293B]">
                <div
                  className="h-full transition-all duration-75"
                  style={{
                    width: `${Math.min(100, meterLevel * 95)}%`,
                    background:
                      meterLevel > 0.85
                        ? 'linear-gradient(90deg, #10B981 60%, #F59E0B 80%, #EF4444 100%)'
                        : meterLevel > 0.6
                        ? 'linear-gradient(90deg, #10B981 70%, #F59E0B 100%)'
                        : '#10B981',
                  }}
                />
              </div>
            </div>
          </div>
          <div className="text-[10px] font-mono text-[#00F0FF] w-12 text-right">
            {(meterLevel * 100).toFixed(0)}%
          </div>
        </div>

        {/* Configuration Row: Take Name & Target Track */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-mono text-[#94A3B8] mb-1">
              TAKE NAME
            </label>
            <input
              type="text"
              value={takeName}
              onChange={(e) => setTakeName(e.target.value)}
              placeholder="e.g. Lead Vocal Take 1"
              disabled={isRecording}
              className="w-full px-3 py-2 bg-[#060810] border border-[#1E293B] rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#00F0FF]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-[#94A3B8] mb-1">
              DESTINATION TIMELINE TRACK
            </label>
            <select
              value={targetTrackMode}
              onChange={(e) => setTargetTrackMode(e.target.value)}
              disabled={isRecording}
              className="w-full px-3 py-2 bg-[#060810] border border-[#1E293B] rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#00F0FF]"
            >
              <option value="new">+ CREATE NEW AUDIO TRACK</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  Track: {t.name} ({t.type})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Record / Stop Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 text-[11px] text-[#94A3B8]">
            <Disc
              size={16}
              className={`text-[#FFD700] ${isRecording ? 'animate-spin' : ''}`}
            />
            <span>
              Placement starts at Bar <strong className="text-white">{Math.floor(playheadBar)}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isRecording ? (
              <button
                onClick={handleStartRecord}
                className="px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all transform active:scale-95"
              >
                <Circle size={14} className="fill-white" />
                START RECORDING
              </button>
            ) : (
              <button
                onClick={handleStopAndPlace}
                className="px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all transform active:scale-95"
              >
                <Square size={14} className="fill-black" />
                STOP & PLACE ON TIMELINE
              </button>
            )}
          </div>
        </div>

        {/* Confirmation Toast / Last Take Info */}
        {lastTake && (
          <div className="p-2.5 rounded-lg bg-[#0F172A] border border-emerald-500/40 text-xs flex items-center justify-between text-emerald-300">
            <div className="flex items-center gap-2">
              <Check size={14} className="text-emerald-400" />
              <span>
                Take successfully recorded ({lastTake.durationSeconds.toFixed(1)}s) and placed on timeline!
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#94A3B8]">
              Ready for playback
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveRecorder;
