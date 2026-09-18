import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  RotateCcw, 
  Upload, 
  Download, 
  Sliders, 
  Zap, 
  Layers, 
  Check, 
  AlertCircle,
  HelpCircle,
  Headphones,
  Music,
  Radio,
  FileAudio
} from 'lucide-react';
import { SunoMasteringSettings } from '../types';
import { 
  DEFAULT_MASTERING_SETTINGS, 
  buildMasteringGraph, 
  renderDeSheenedMasterWav, 
  generateSyntheticSunoSample,
  createTapeSaturationCurve,
  MasteringGraphNodes
} from '../lib/sunoAudioEngine';
import { playLaserBeamSound } from '../lib/laserSound';
import { masterAudioBus } from '../lib/masterBus';

interface SunoMasteringStudioProps {
  initialAudioFile?: File | null;
  onClose?: () => void;
}

const PRESETS: { name: string; desc: string; settings: Partial<SunoMasteringSettings> }[] = [
  {
    name: 'Suno V3/V3.5 Heavy Anti-Sheen',
    desc: 'Deep de-harshing on metallic high-end fizz with focused 400Hz mid-scoop for baked vocals.',
    settings: {
      antiSheenAmount: 0.70,
      deMudAmount: 0.50,
      tapeWarmth: 0.35,
      stereoAir: 1.5,
      targetLufs: -14,
      outputGain: 0.5
    }
  },
  {
    name: 'Rock & Metal Wall-of-Sound Un-Bake',
    desc: 'Separates buried guitars from cymbals and tightens distorted bass mud.',
    settings: {
      antiSheenAmount: 0.55,
      deMudAmount: 0.55,
      tapeWarmth: 0.40,
      stereoAir: 1.8,
      targetLufs: -9,
      outputGain: 1.0
    }
  },
  {
    name: 'Electronic / Synthwave Sub-Tightener',
    desc: 'Solid sub-mono lock, smooth high roll-off, and punchy tape compression.',
    settings: {
      antiSheenAmount: 0.50,
      deMudAmount: 0.40,
      tapeWarmth: 0.38,
      stereoAir: 2.0,
      targetLufs: -9,
      outputGain: 1.0
    }
  },
  {
    name: 'Acoustic & Folk Gentle Polish',
    desc: 'Subtle high smoothing preserving intimate breath without digital phase distortion.',
    settings: {
      antiSheenAmount: 0.35,
      deMudAmount: 0.30,
      tapeWarmth: 0.20,
      stereoAir: 1.0,
      targetLufs: -14,
      outputGain: 0.0
    }
  },
  {
    name: 'Club & Dance Maximizer (-9 LUFS)',
    desc: 'Punchy transients, saturated warmth, and commercial competitive volume.',
    settings: {
      antiSheenAmount: 0.60,
      deMudAmount: 0.45,
      tapeWarmth: 0.42,
      stereoAir: 2.2,
      targetLufs: -9,
      outputGain: 1.5
    }
  }
];

export const SunoMasteringStudio: React.FC<SunoMasteringStudioProps> = ({ initialAudioFile }) => {
  const [settings, setSettings] = useState<SunoMasteringSettings>({ ...DEFAULT_MASTERING_SETTINGS });
  const [activePreset, setActivePreset] = useState<string>('Suno V3/V3.5 Heavy Anti-Sheen');
  
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(6.0);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportComplete, setExportComplete] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('synthetic_suno_demo.mp3');

  // Web Audio refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const graphNodesRef = useRef<MasteringGraphNodes | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseOffsetRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Initialize Web Audio context from shared Master Audio Bus
  const getOrCreateContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = masterAudioBus.getAudioContext();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  // Load synth demo on mount
  useEffect(() => {
    const ctx = getOrCreateContext();
    const synthSample = generateSyntheticSunoSample(ctx);
    audioBufferRef.current = synthSample;
    setDuration(synthSample.duration);
    setFileName('synthetic_suno_demo.mp3');

    // Build master graph
    const graph = buildMasteringGraph(ctx, settings);
    // Connect ONLY ONCE to master audio bus (prevents duplicate audio output & digital clipping)
    masterAudioBus.connectToMaster(graph.outputNode);
    graphNodesRef.current = graph;

    return () => {
      stopPlayback();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Subscribe to Master Audio Bus mastering bypass state
  useEffect(() => {
    const unsub = masterAudioBus.subscribeMasteringBypass(bypassed => {
      setSettings(prev => (prev.bypass !== bypassed ? { ...prev, bypass: bypassed } : prev));
    });
    return unsub;
  }, []);

  // Update live DSP nodes when settings change
  useEffect(() => {
    if (!graphNodesRef.current || !audioContextRef.current) return;
    const g = graphNodesRef.current;
    const now = audioContextRef.current.currentTime;

    // Bypass crossfade
    g.wetGainNode.gain.setValueAtTime(settings.bypass ? 0 : 1, now);
    g.dryGainNode.gain.setValueAtTime(settings.bypass ? 1 : 0, now);

    // De-mud peaking filter
    g.deMudNode.gain.setValueAtTime(-5.5 * settings.deMudAmount, now);

    // Anti-sheen high-shelf & notch
    g.antiSheenNode.gain.setValueAtTime(-6.5 * settings.antiSheenAmount, now);
    if (g.antiSheenNotchNode) {
      g.antiSheenNotchNode.gain.setValueAtTime(-3.5 * settings.antiSheenAmount, now);
    }

    // Tape saturation (crossover protected)
    g.tapeShaperNode.curve = createTapeSaturationCurve(settings.tapeWarmth) as any;

    // Stereo Air
    g.airNode.gain.setValueAtTime(Math.max(0, settings.stereoAir), now);

    // Pre-limiter drive / make-up gain
    const linearDrive = Math.pow(10, (settings.outputGain || 0) / 20);
    g.makeUpGainNode.gain.setValueAtTime(linearDrive, now);

    // Limiter threshold based on target LUFS
    g.limiterNode.threshold.setValueAtTime(
      settings.targetLufs === -7 ? -6.5 : settings.targetLufs === -9 ? -4.0 : -2.0,
      now
    );
  }, [settings]);

  // Spectrum Visualizer loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderSpectrum = () => {
      const g = graphNodesRef.current;
      if (!g) {
        animFrameRef.current = requestAnimationFrame(renderSpectrum);
        return;
      }

      const bufferLength = g.analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      g.analyserNode.getByteFrequencyData(dataArray);

      const width = canvas.width;
      const height = canvas.height;

      // Dark background
      ctx.fillStyle = '#0B0D14';
      ctx.fillRect(0, 0, width, height);

      // Grid guidelines
      ctx.strokeStyle = '#181C2B';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += width / 8) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Region highlight: Anti-Sheen Zone (7.5k - 11k)
      // Approximate X mapping: log-like distribution
      const deSheenXStart = width * 0.68;
      const deSheenXEnd = width * 0.88;
      ctx.fillStyle = settings.bypass ? 'rgba(239, 68, 68, 0.08)' : 'rgba(168, 85, 247, 0.12)';
      ctx.fillRect(deSheenXStart, 0, deSheenXEnd - deSheenXStart, height);

      // Region highlight: De-Mud Zone (350 - 450 Hz)
      const deMudXStart = width * 0.22;
      const deMudXEnd = width * 0.35;
      ctx.fillStyle = settings.bypass ? 'rgba(239, 68, 68, 0.05)' : 'rgba(6, 182, 212, 0.10)';
      ctx.fillRect(deMudXStart, 0, deMudXEnd - deMudXStart, height);

      // Spectrum Bars
      const barWidth = (width / (bufferLength * 0.75));
      let x = 0;

      for (let i = 0; i < bufferLength * 0.75; i++) {
        const barHeight = (dataArray[i] / 255) * (height - 12);

        // Color gradation
        if (settings.bypass) {
          // Red-ish when bypassed (raw harsh audio)
          ctx.fillStyle = `rgb(${180 + dataArray[i] * 0.25}, 60, 80)`;
        } else {
          // Cyan to purple to amber when mastered
          if (i < bufferLength * 0.25) {
            ctx.fillStyle = '#06B6D4'; // cyan bass
          } else if (i < bufferLength * 0.55) {
            ctx.fillStyle = '#A855F7'; // purple mids
          } else {
            ctx.fillStyle = '#F59E0B'; // amber air
          }
        }

        ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }

      // Filter Target Curve (Visual representation of De-Mud + Anti-Sheen)
      if (!settings.bypass) {
        ctx.strokeStyle = '#EC4899';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let px = 0; px < width; px += 4) {
          let y = height * 0.5;
          // De-mud dip around deMudX
          const d1 = Math.abs(px - (deMudXStart + deMudXEnd) / 2);
          if (d1 < 45) {
            y += (1 - d1 / 45) * 16 * settings.deMudAmount;
          }
          // Anti-sheen shelf dip around deSheenX
          const d2 = Math.abs(px - (deSheenXStart + deSheenXEnd) / 2);
          if (d2 < 60) {
            y += (1 - d2 / 60) * 22 * settings.antiSheenAmount;
          }
          // Air lift at very end
          if (px > deSheenXEnd) {
            y -= ((px - deSheenXEnd) / (width - deSheenXEnd)) * 12 * (settings.stereoAir / 3);
          }

          if (px === 0) ctx.moveTo(px, y);
          else ctx.lineTo(px, y);
        }
        ctx.stroke();
      }

      // Zone Labels
      ctx.font = '9px monospace';
      ctx.fillStyle = '#8E92B0';
      ctx.fillText('SUB (32Hz)', 10, 14);
      ctx.fillText('DE-MUD (400Hz)', deMudXStart + 4, 14);
      ctx.fillText('ANTI-SHEEN (8kHz)', deSheenXStart + 4, 14);
      ctx.fillText('AIR (14kHz+)', width - 80, 14);

      // Playback progress update
      if (isPlaying && audioContextRef.current && audioBufferRef.current) {
        const elapsed = (audioContextRef.current.currentTime - startTimeRef.current) % duration;
        setCurrentTime(elapsed);
      }

      animFrameRef.current = requestAnimationFrame(renderSpectrum);
    };

    renderSpectrum();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, settings, duration]);

  // Audio Playback Controls
  const startPlayback = () => {
    const ctx = getOrCreateContext();
    if (!audioBufferRef.current || !graphNodesRef.current) return;

    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (_) {}
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBufferRef.current;
    source.loop = isLooping;
    source.connect(graphNodesRef.current.inputNode);

    const offset = pauseOffsetRef.current % audioBufferRef.current.duration;
    source.start(0, offset);
    startTimeRef.current = ctx.currentTime - offset;
    sourceNodeRef.current = source;
    setIsPlaying(true);

    source.onended = () => {
      if (!isLooping) {
        setIsPlaying(false);
        pauseOffsetRef.current = 0;
        setCurrentTime(0);
      }
    };
  };

  const stopPlayback = () => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (_) {}
      sourceNodeRef.current = null;
    }
    if (audioContextRef.current) {
      pauseOffsetRef.current = (audioContextRef.current.currentTime - startTimeRef.current) % duration;
    }
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  const restartPlayback = () => {
    pauseOffsetRef.current = 0;
    setCurrentTime(0);
    if (isPlaying) {
      startPlayback();
    }
  };

  // Toggle A/B Bypass
  const handleToggleBypass = () => {
    const nextBypass = masterAudioBus.toggleMasteringBypass();
    playLaserBeamSound(nextBypass ? 'laser_erase' : 'laser_audio');
  };

  // Load Preset
  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setActivePreset(preset.name);
    setSettings(prev => ({
      ...prev,
      ...preset.settings,
      bypass: false
    }));
    masterAudioBus.setMasteringBypass(false);
    playLaserBeamSound('laser_midi');
  };

  // Handle User File Upload
  const handleFileUpload = async (file: File) => {
    try {
      const ctx = getOrCreateContext();
      const arrayBuffer = await file.arrayBuffer();
      const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);

      stopPlayback();
      audioBufferRef.current = decodedBuffer;
      setDuration(decodedBuffer.duration);
      setFileName(file.name);
      pauseOffsetRef.current = 0;
      setCurrentTime(0);
      playLaserBeamSound('laser_select');
      startPlayback();
    } catch (err) {
      console.error('Error decoding audio file:', err);
      alert('Could not decode audio file. Please try a standard MP3 or WAV file.');
    }
  };

  // Load Synthetic Demo Sample
  const handleLoadDemoSample = () => {
    const ctx = getOrCreateContext();
    stopPlayback();
    const synth = generateSyntheticSunoSample(ctx);
    audioBufferRef.current = synth;
    setDuration(synth.duration);
    setFileName('synthetic_suno_demo.mp3');
    pauseOffsetRef.current = 0;
    setCurrentTime(0);
    playLaserBeamSound('laser_midi');
    startPlayback();
  };

  // Export De-Sheened WAV
  const handleExportWav = async () => {
    if (!audioBufferRef.current) return;
    setIsExporting(true);
    setExportComplete(false);

    try {
      const wavBlob = await renderDeSheenedMasterWav(audioBufferRef.current, settings);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      const baseName = fileName.replace(/\.[^/.]+$/, '');
      a.href = url;
      a.download = `${baseName}_AntiSheen_Master.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportComplete(true);
      playLaserBeamSound('laser_audio');
      setTimeout(() => setExportComplete(false), 3500);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export audio. Please check browser permissions.');
    } finally {
      setIsExporting(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto pr-1">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#141624] border border-[#232742]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-wider text-white uppercase">Suno Anti-Sheen & Un-Bake Mastering Station</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-semibold">
                NEURAL DSP CLEANUP
              </span>
            </div>
            <p className="text-xs text-[#8E92B0]">
              Eliminates the metallic diffusion "sheen" and un-bakes 400Hz mid congestion from Suno & Udio tracks.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Dedicated A/B Bypass Audition Button */}
          <button
            id="suno-mastering-bypass-btn"
            onClick={handleToggleBypass}
            className={`px-3.5 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md select-none ${
              settings.bypass
                ? 'bg-gradient-to-r from-amber-950/80 to-red-950/80 hover:from-amber-900 hover:to-red-900 text-amber-300 border-amber-500/70 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                : 'bg-[#181D30] hover:bg-[#202742] text-emerald-300 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
            }`}
            title="Toggle instant A/B Bypass comparison between original raw audio and AI-mastered audio (Hotkey: B)"
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${settings.bypass ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${settings.bypass ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            </span>
            <Headphones className="w-3.5 h-3.5" />
            <span>BYPASS: {settings.bypass ? 'ON (RAW AUDIO)' : 'OFF (AI MASTER)'}</span>
            <kbd className="hidden sm:inline-block px-1 py-0.2 text-[9px] font-sans font-semibold bg-[#0A0C16] text-[#8E94B4] rounded border border-[#262C46]">
              B
            </kbd>
          </button>

          <button
            onClick={handleLoadDemoSample}
            className="px-3 py-1.5 rounded-lg bg-[#181C2D] hover:bg-[#20253B] text-cyan-300 border border-cyan-500/30 text-xs font-mono flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(6,182,212,0.15)]"
            title="Load generated AI audio track with metallic sheen to audition the filters"
          >
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>Load AI Test Track</span>
          </button>

          <label className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            <Upload className="w-3.5 h-3.5" />
            <span>Drop Suno MP3/WAV</span>
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={e => {
                if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
              }}
            />
          </label>
        </div>
      </div>

      {/* Main Grid: Left Spectrum & Player (60%), Right Presets & Knobs (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Visualizer, A/B Switch, Player (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Real-Time Spectrum Analyzer */}
          <div className="p-4 rounded-xl bg-[#121420] border border-[#22263C] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-cyan-400 uppercase flex items-center gap-1.5">
                  <ActivityIcon className="w-3.5 h-3.5" />
                  <span>Real-Time Spectrum Analyzer & Filter Cutout</span>
                </span>
                <span className="text-[10px] font-mono text-[#6E7596]">512-POINT FFT</span>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${settings.bypass ? 'bg-red-500 animate-ping' : 'bg-emerald-400'}`} />
                <span className={`text-[10px] font-mono font-semibold ${settings.bypass ? 'text-red-400' : 'text-emerald-400'}`}>
                  {settings.bypass ? 'RAW SUNO (BYPASS)' : 'MASTERED & DE-SHEENED'}
                </span>
              </div>
            </div>

            {/* Canvas */}
            <div className="relative rounded-lg overflow-hidden border border-[#242940] bg-[#0B0D14]">
              <canvas
                ref={canvasRef}
                width={700}
                height={160}
                className="w-full h-40 block"
              />
              
              {/* Overlay labels */}
              <div className="absolute bottom-1 left-2 right-2 flex justify-between pointer-events-none text-[9px] font-mono text-[#585E7E]">
                <span>20Hz</span>
                <span>100Hz</span>
                <span>400Hz (Mud)</span>
                <span>1kHz</span>
                <span>8kHz (AI Sheen)</span>
                <span>16kHz</span>
              </div>
            </div>

            {/* A/B Switch Strip */}
            <div className="pt-1">
              <button
                id="suno-studio-spectrum-ab-strip-btn"
                onClick={handleToggleBypass}
                className={`w-full py-3 px-4 rounded-xl font-mono text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-3 transition-all border cursor-pointer select-none ${
                  settings.bypass
                    ? 'bg-gradient-to-r from-amber-950/90 to-red-950/90 hover:from-amber-900 hover:to-red-900 text-amber-200 border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                    : 'bg-gradient-to-r from-purple-700 via-indigo-600 to-cyan-600 hover:from-purple-600 hover:to-cyan-500 text-white border-purple-400/50 shadow-[0_0_25px_rgba(168,85,247,0.35)]'
                }`}
                title="Instant A/B auditioning (Keyboard shortcut: B)"
              >
                <Headphones className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {settings.bypass 
                    ? 'CURRENT: [MODE B: RAW UNPROCESSED AUDIO] • CLICK OR PRESS [B] TO AUDITION AI MASTER'
                    : 'CURRENT: [MODE A: AI-MASTERED RESULT] • CLICK OR PRESS [B] TO AUDITION RAW ORIGINAL'}
                </span>
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-sans font-semibold bg-black/40 rounded border border-white/20 ml-1">
                  B
                </kbd>
              </button>
            </div>
          </div>

          {/* Transport & Export Bar */}
          <div className="p-4 rounded-xl bg-[#121420] border border-[#22263C] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileAudio className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-mono text-white truncate max-w-[220px]" title={fileName}>
                  {fileName}
                </span>
                <span className="text-[10px] font-mono text-[#787F9E]">
                  ({formatTime(duration)})
                </span>
              </div>

              {/* Time display */}
              <div className="text-xs font-mono text-cyan-300">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            {/* Scrubber / Progress bar */}
            <div className="w-full bg-[#1A1D2B] h-2 rounded-full overflow-hidden relative cursor-pointer"
              onClick={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                pauseOffsetRef.current = ratio * duration;
                setCurrentTime(ratio * duration);
                if (isPlaying) startPlayback();
              }}
            >
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full transition-all"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>

            {/* Transport Controls & Export Action */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlayback}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-mono font-semibold flex items-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
                </button>

                <button
                  onClick={restartPlayback}
                  className="p-2 rounded-lg bg-[#1B1E2D] hover:bg-[#252A3F] text-[#8E92B0] hover:text-white border border-[#2B3048] transition-colors"
                  title="Restart to beginning"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsLooping(!isLooping)}
                  className={`px-3 py-2 rounded-lg border text-xs font-mono transition-colors ${
                    isLooping
                      ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                      : 'bg-[#1B1E2D] text-[#767D9C] border-[#2A2E44]'
                  }`}
                  title="Toggle looping"
                >
                  LOOP
                </button>

                {/* Dedicated Transport A/B Bypass Button */}
                <button
                  id="suno-studio-transport-bypass-btn"
                  onClick={handleToggleBypass}
                  className={`px-3 py-2 rounded-lg border text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    settings.bypass
                      ? 'bg-gradient-to-r from-amber-950/80 to-red-950/80 text-amber-300 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                      : 'bg-[#181D30] hover:bg-[#222942] text-emerald-300 border-emerald-500/40 hover:border-emerald-500/60'
                  }`}
                  title="Toggle instant A/B Bypass: compare unprocessed original with AI mastered (Key: B)"
                >
                  <span className={`w-2 h-2 rounded-full ${settings.bypass ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                  <Headphones className="w-3.5 h-3.5" />
                  <span>{settings.bypass ? 'BYPASS: RAW' : 'MASTERED (A/B)'}</span>
                </button>
              </div>

              {/* Export Button */}
              <button
                onClick={handleExportWav}
                disabled={isExporting}
                className={`px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-2 transition-all ${
                  exportComplete
                    ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                    : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-[0_0_18px_rgba(245,158,11,0.3)]'
                }`}
              >
                {exportComplete ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                <span>{isExporting ? 'RENDERING MASTER...' : exportComplete ? 'MASTER SAVED!' : 'EXPORT DE-SHEENED WAV'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: De-Sheen DSP Processing Rack & Presets (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Quick Presets Selection */}
          <div className="p-4 rounded-xl bg-[#121420] border border-[#22263C] space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-purple-300 uppercase flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                <span>Anti-Sheen Mastering Presets</span>
              </label>
              <span className="text-[10px] font-mono text-[#6E7596]">SUNO OPTIMIZED</span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {PRESETS.map(p => (
                <button
                  key={p.name}
                  onClick={() => handleApplyPreset(p)}
                  className={`text-left p-2.5 rounded-lg border transition-all ${
                    activePreset === p.name
                      ? 'bg-purple-950/50 border-purple-500/50 text-white shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                      : 'bg-[#161928] border-[#252A42] text-[#8E94B4] hover:text-white hover:bg-[#1C2033]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">{p.name}</span>
                    {activePreset === p.name && (
                      <span className="text-[10px] font-mono text-purple-400 font-bold">ACTIVE</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#797F9E] mt-0.5 line-clamp-1">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Precision DSP Parameter Controls */}
          <div className="p-4 rounded-xl bg-[#121420] border border-[#22263C] space-y-4">
            <div className="flex items-center justify-between border-b border-[#21253C] pb-2">
              <span className="text-xs font-mono text-white uppercase font-bold tracking-wide">
                Neural De-Sheen Rack Controls
              </span>
              <span className="text-[10px] font-mono text-cyan-400">HARDWARE DSP</span>
            </div>

            {/* 1. Anti-Sheen De-Harsh */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-purple-300 flex items-center gap-1">
                  <span>Anti-Sheen High-Shelf (8kHz)</span>
                  <span className="text-[10px] text-[#696F8E]" title="Attenuates metallic AI phase sizzle">(De-Harsh)</span>
                </span>
                <span className="text-purple-400 font-bold">{Math.round(settings.antiSheenAmount * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.02"
                value={settings.antiSheenAmount}
                onChange={e => setSettings(prev => ({ ...prev, antiSheenAmount: parseFloat(e.target.value) }))}
                className="w-full h-1.5 bg-[#1B1F32] rounded-lg appearance-none cursor-pointer accent-purple-400"
              />
              <div className="flex justify-between text-[10px] text-[#555B7A] font-mono">
                <span>0dB (Off)</span>
                <span>-4dB</span>
                <span>-8dB (Maximum De-Harsh)</span>
              </div>
            </div>

            {/* 2. De-Mud 400Hz Boxiness */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-cyan-300 flex items-center gap-1">
                  <span>De-Mud Boxiness Scooper (410Hz)</span>
                  <span className="text-[10px] text-[#696F8E]" title="Carves out the mid-range mud where AI mashes instruments together">(Un-Bake)</span>
                </span>
                <span className="text-cyan-400 font-bold">{Math.round(settings.deMudAmount * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.02"
                value={settings.deMudAmount}
                onChange={e => setSettings(prev => ({ ...prev, deMudAmount: parseFloat(e.target.value) }))}
                className="w-full h-1.5 bg-[#1B1F32] rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] text-[#555B7A] font-mono">
                <span>0dB (Flat)</span>
                <span>-3.2dB</span>
                <span>-6.5dB (Deep Separation)</span>
              </div>
            </div>

            {/* 3. Analog Tape Warmth */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-amber-300 flex items-center gap-1">
                  <span>Analog Tape Saturation</span>
                  <span className="text-[10px] text-[#696F8E]" title="Fills in musical harmonics to mask diffusion noise">(Warmth)</span>
                </span>
                <span className="text-amber-400 font-bold">{Math.round(settings.tapeWarmth * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.02"
                value={settings.tapeWarmth}
                onChange={e => setSettings(prev => ({ ...prev, tapeWarmth: parseFloat(e.target.value) }))}
                className="w-full h-1.5 bg-[#1B1F32] rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <div className="flex justify-between text-[10px] text-[#555B7A] font-mono">
                <span>Linear</span>
                <span>Warm Tape</span>
                <span>Heavy Tube Drive</span>
              </div>
            </div>

            {/* 4. Silky Air (12.5kHz+) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-pink-300 flex items-center gap-1">
                  <span>Silky Air & Stereo Width</span>
                  <span className="text-[10px] text-[#696F8E]" title="Restores smooth sparkle above 12.5kHz without harsh fizz">(Sparkle)</span>
                </span>
                <span className="text-pink-400 font-bold">{settings.stereoAir > 0 ? `+${settings.stereoAir.toFixed(1)}` : settings.stereoAir.toFixed(1)} dB</span>
              </div>
              <input
                type="range"
                min="-2.0"
                max="5.0"
                step="0.2"
                value={settings.stereoAir}
                onChange={e => setSettings(prev => ({ ...prev, stereoAir: parseFloat(e.target.value) }))}
                className="w-full h-1.5 bg-[#1B1F32] rounded-lg appearance-none cursor-pointer accent-pink-400"
              />
              <div className="flex justify-between text-[10px] text-[#555B7A] font-mono">
                <span>-2.0 dB</span>
                <span>+1.5 dB (Sweet Spot)</span>
                <span>+5.0 dB</span>
              </div>
            </div>

            {/* 5. Target Loudness & Limiter */}
            <div className="space-y-2 pt-1 border-t border-[#1C2033]">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-mono text-[#8E94B4]">Target Streaming Loudness</span>
                  <div className="flex gap-1.5">
                    {(['-14', '-9', '-7'] as const).map(lufs => {
                      const num = parseInt(lufs, 10) as -14 | -9 | -7;
                      return (
                        <button
                          key={lufs}
                          onClick={() => setSettings(prev => ({ ...prev, targetLufs: num }))}
                          className={`text-[11px] font-mono px-2.5 py-1 rounded transition-colors ${
                            settings.targetLufs === num
                              ? 'bg-purple-600 text-white font-bold'
                              : 'bg-[#191D2F] text-[#7A809E] hover:text-white'
                          }`}
                        >
                          {lufs} LUFS
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1 text-right">
                  <span className="text-xs font-mono text-[#8E94B4]">Drive / Gain Staging</span>
                  <div className="text-xs font-mono text-cyan-400 font-bold">
                    {settings.outputGain > 0 ? `+${settings.outputGain.toFixed(1)}` : settings.outputGain.toFixed(1)} dB
                  </div>
                </div>
              </div>

              {/* Make-up Gain Slider */}
              <input
                type="range"
                min="-3.0"
                max="3.5"
                step="0.1"
                value={settings.outputGain}
                onChange={e => setSettings(prev => ({ ...prev, outputGain: parseFloat(e.target.value) }))}
                className="w-full h-1.5 bg-[#1B1F32] rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] text-[#555B7A] font-mono">
                <span>-3.0 dB (Headroom)</span>
                <span>0.0 dB</span>
                <span>+3.5 dB (Max Loudness)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Activity Icon helper
function ActivityIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

export default SunoMasteringStudio;
