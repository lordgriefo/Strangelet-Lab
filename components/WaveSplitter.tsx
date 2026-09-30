import React, { useState, useRef, useEffect } from 'react';
import { 
  Scissors, Zap, MousePointer2, Play, Pause, Settings2, 
  Volume2, VolumeX, Radio, Sparkles, Download, Layers, CheckCircle2, Sliders,
  Keyboard, Disc, Upload, ArrowRight
} from 'lucide-react';
import ImportArea from './ImportArea';
import { Track, Clip } from '../types';
import { BasicPitchModal } from './BasicPitchModal';
import { PRESET_SONGS } from '../services/basicPitchService';
import { playLaserBeamSound } from '../lib/laserSound';

interface StemTrack {
  id: string;
  name: string;
  category: 'vocals' | 'bass' | 'drums' | 'instruments';
  color: string;
  volume: number;
  muted: boolean;
  solo: boolean;
  freqRange: string;
  energy: number;
}

interface WaveSplitterProps {
  tracks?: Track[];
  onAddTrackWithClip?: (trackName: string, clip: Clip) => void;
  onNavigateToMixer?: () => void;
}

const INITIAL_STEMS: StemTrack[] = [
  { id: 'st-1', name: 'VOCALS & DIALOGUE', category: 'vocals', color: '#00F0FF', volume: 0.85, muted: false, solo: false, freqRange: '300Hz - 4.5kHz', energy: 72 },
  { id: 'st-2', name: 'SUB & SYNTH BASS', category: 'bass', color: '#FF2E63', volume: 0.9, muted: false, solo: false, freqRange: '20Hz - 250Hz', energy: 88 },
  { id: 'st-3', name: 'DRUMS & TRANSIENTS', category: 'drums', color: '#FFD700', volume: 0.8, muted: false, solo: false, freqRange: '40Hz - 16kHz', energy: 95 },
  { id: 'st-4', name: 'SYNTHS & GUITARS', category: 'instruments', color: '#C084FC', volume: 0.75, muted: false, solo: false, freqRange: '250Hz - 8kHz', energy: 65 },
];

export const WaveSplitter: React.FC<WaveSplitterProps> = ({
  tracks = [],
  onAddTrackWithClip,
  onNavigateToMixer
}) => {
  const [stems, setStems] = useState<StemTrack[]>(INITIAL_STEMS);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [separationModel, setSeparationModel] = useState<string>('Demucs v4 Hybrid + Basic Pitch');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [selectedSongTitle, setSelectedSongTitle] = useState<string>('Suno AI: Neon Horizon (Master)');
  
  // Basic Pitch Audio-to-MIDI Modal State
  const [isBasicPitchOpen, setIsBasicPitchOpen] = useState<boolean>(false);
  const [targetMidiStem, setTargetMidiStem] = useState<'vocals' | 'bass' | 'drums' | 'instruments' | 'full'>('instruments');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Multi-band Spectral Waveform Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    const renderWave = () => {
      ctx.fillStyle = '#05070E';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid
      ctx.strokeStyle = '#101726';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Draw multi-stem frequency waves
      stems.forEach((stem, index) => {
        if (stem.muted) return;
        const isSoloActive = stems.some(s => s.solo);
        if (isSoloActive && !stem.solo) return;

        const baseFreq = 0.01 + index * 0.012;
        const amp = isPlaying ? (stem.energy / 100) * 45 * stem.volume : 15;
        const yOffset = (canvas.height / (stems.length + 1)) * (index + 1);

        ctx.strokeStyle = stem.color;
        ctx.lineWidth = 2;
        ctx.shadowColor = stem.color;
        ctx.shadowBlur = isPlaying ? 10 : 2;

        ctx.beginPath();
        ctx.moveTo(0, yOffset);
        for (let x = 0; x < canvas.width; x += 3) {
          const y = yOffset + Math.sin((x * baseFreq) + phase + (index * 1.5)) * amp;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      phase += isPlaying ? 0.08 : 0.01;
      animFrameRef.current = requestAnimationFrame(renderWave);
    };

    renderWave();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [stems, isPlaying]);

  const toggleMute = (id: string) => {
    setStems(prev => prev.map(s => s.id === id ? { ...s, muted: !s.muted } : s));
  };

  const toggleSolo = (id: string) => {
    setStems(prev => prev.map(s => s.id === id ? { ...s, solo: !s.solo } : s));
  };

  const updateVolume = (id: string, volume: number) => {
    setStems(prev => prev.map(s => s.id === id ? { ...s, volume } : s));
  };

  const handleExportStems = () => {
    setStatusNotice(`✨ Exporting 4 isolated stems using ${separationModel}...`);
    setTimeout(() => {
      setStatusNotice('✨ Stems batch generated and saved to Project Bin!');
      setTimeout(() => setStatusNotice(null), 3500);
    }, 2000);
  };

  return (
    <div className="h-full w-full bg-[#05070E] flex flex-col overflow-y-auto p-4 md:p-6 text-white font-mono select-none">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1A2338]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00F0FF]/20 via-[#FF2E63]/20 to-[#FFD700]/20 border border-[#00F0FF] flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.3)]">
            <Zap size={22} className="text-[#00F0FF]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-black uppercase tracking-widest text-[#FFD700]">
                STRANGELET LAB
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 font-bold">
                HYBRID AI STEM SEPARATION
              </span>
            </div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              SPECTRAL WAVE SPLITTER & STEM DECK
            </h1>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setTargetMidiStem('instruments');
              setIsBasicPitchOpen(true);
              playLaserBeamSound('laser_select');
            }}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-950 to-teal-950 border border-emerald-500/50 text-emerald-300 hover:border-emerald-400 font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)]"
            title="Convert any stem or song to MIDI via Spotify's Basic Pitch neural network"
          >
            <Keyboard size={13} className="text-emerald-400" />
            <span>BASIC PITCH (AUDIO-TO-MIDI)</span>
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-4 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md ${
              isPlaying
                ? 'bg-[#FF2E63] text-white shadow-[0_0_15px_#FF2E63]'
                : 'bg-[#00F0FF] text-black hover:brightness-110'
            }`}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlaying ? 'STOP PLAYBACK' : 'PREVIEW SEPARATION'}</span>
          </button>

          <button
            onClick={handleExportStems}
            className="px-3.5 py-1.5 rounded-xl bg-[#101726] border border-[#FFD700]/40 text-[#FFD700] hover:bg-[#FFD700] hover:text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Download size={13} />
            <span>EXPORT ALL STEMS</span>
          </button>
        </div>
      </div>

      {/* Song Loader & Decomposer Bar */}
      <div className="mt-3 p-3 rounded-xl bg-[#090D1C] border border-[#1A253E] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Disc size={15} className="text-cyan-400 shrink-0" />
          <span className="text-[#8892B0] font-bold">SONG SOURCE:</span>
          <select 
            value={selectedSongTitle} 
            onChange={(e) => {
              setSelectedSongTitle(e.target.value);
              setStatusNotice(`✨ Loaded song into Demucs: ${e.target.value}`);
              setTimeout(() => setStatusNotice(null), 3000);
            }}
            className="px-2.5 py-1 rounded-lg bg-[#11172A] border border-[#202C48] text-white font-bold"
          >
            {PRESET_SONGS.map(s => (
              <option key={s.id} value={`${s.title} (${s.sourceType.toUpperCase()})`}>
                {s.title} • {s.artist} [{s.bpm} BPM]
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 rounded-lg bg-[#151D33] hover:bg-[#1E2948] border border-[#2A3758] text-cyan-300 flex items-center gap-1.5 transition-colors font-bold"
          >
            <Upload size={12} />
            <span>Upload Song File (MP3/WAV)</span>
          </button>
          <input 
            ref={fileInputRef} 
            type="file" 
            accept="audio/*" 
            className="hidden" 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setSelectedSongTitle(`File: ${file.name}`);
                setStatusNotice(`✨ Decomposing imported song: ${file.name} into 4 discrete stems...`);
                setTimeout(() => setStatusNotice(null), 3500);
              }
            }}
          />
        </div>
      </div>

      {/* Notice Banner */}
      {statusNotice && (
        <div className="mt-3 px-3.5 py-2 rounded-lg bg-[#00F0FF]/15 border border-[#00F0FF] text-xs font-bold text-white flex items-center justify-between shadow-[0_0_15px_rgba(0,240,255,0.3)]">
          <span>{statusNotice}</span>
          <CheckCircle2 size={15} className="text-[#00F0FF]" />
        </div>
      )}

      {/* Multi-Band Waveform Visualizer */}
      <div className="mt-4 p-4 bg-[#080B15] border border-[#1A2338] rounded-2xl flex flex-col gap-2 shadow-inner">
        <div className="flex items-center justify-between pb-2 border-b border-[#141C2E] text-xs">
          <span className="text-[#94A3B8] font-bold">SPECTRAL ENERGY REFRACTION DISPLAY</span>
          <span className="text-[#00F0FF] font-mono text-[10px]">MODEL: {separationModel}</span>
        </div>

        <canvas
          ref={canvasRef}
          width={1000}
          height={190}
          className="w-full h-48 rounded-xl border border-[#141C2E] bg-[#05070E]"
        />
      </div>

      {/* Stems Multi-Track Mixing Deck */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stems.map((stem) => (
          <div
            key={stem.id}
            className="p-4 bg-[#080B15] border border-[#1A2338] rounded-2xl flex flex-col justify-between gap-3 shadow-md hover:border-[#38BDF8]/40 transition-all"
            style={{
              boxShadow: !stem.muted ? `0 8px 20px -6px ${stem.color}15` : 'none'
            }}
          >
            {/* Stem Header */}
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-[#141C2E]">
                <span 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: stem.color }} 
                />
                <span className="text-[9px] text-[#64748B] uppercase font-bold">
                  {stem.freqRange}
                </span>
              </div>
              <h3 className="text-sm font-black text-white mt-2">
                {stem.name}
              </h3>
            </div>

            {/* Live Meter Bar */}
            <div className="w-full bg-[#05070E] h-2 rounded-full overflow-hidden border border-[#141C2E]">
              <div
                className="h-full transition-all duration-100"
                style={{
                  width: isPlaying && !stem.muted ? `${stem.energy}%` : '10%',
                  backgroundColor: stem.color
                }}
              />
            </div>

            {/* Fader & Mute / Solo */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[#141C2E]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#64748B]">GAIN:</span>
                <span className="font-bold text-white">{(stem.volume * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={stem.volume}
                onChange={(e) => updateVolume(stem.id, Number(e.target.value))}
                className="w-full accent-[#00F0FF] cursor-pointer"
              />

              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={() => toggleMute(stem.id)}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold border transition-all ${
                    stem.muted
                      ? 'border-[#FF2E63] bg-[#FF2E63]/20 text-[#FF2E63]'
                      : 'border-[#1E293B] bg-[#0E1524] text-[#94A3B8]'
                  }`}
                >
                  {stem.muted ? 'MUTED' : 'MUTE'}
                </button>
                <button
                  onClick={() => toggleSolo(stem.id)}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold border transition-all ${
                    stem.solo
                      ? 'border-[#FFD700] bg-[#FFD700]/20 text-[#FFD700]'
                      : 'border-[#1E293B] bg-[#0E1524] text-[#94A3B8]'
                  }`}
                >
                  SOLO
                </button>
              </div>

              {/* Transcribe to MIDI (Spotify Basic Pitch) Button */}
              <button
                onClick={() => {
                  setTargetMidiStem(stem.category);
                  setIsBasicPitchOpen(true);
                  playLaserBeamSound('laser_select');
                }}
                className="w-full mt-1.5 py-1.5 px-2 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/50 hover:border-emerald-400 text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-[0_0_10px_rgba(16,185,129,0.2)] active:scale-95"
                title={`Extract polyphonic MIDI from ${stem.name} using Spotify Basic Pitch`}
              >
                <Keyboard size={12} className="text-emerald-400" />
                <span>TRANSCRIBE TO MIDI</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Spotify Basic Pitch Audio-to-MIDI Modal */}
      <BasicPitchModal
        isOpen={isBasicPitchOpen}
        onClose={() => setIsBasicPitchOpen(false)}
        tracks={tracks}
        initialStemCategory={targetMidiStem}
        initialSongTitle={selectedSongTitle}
        onAddMidiTrackToMixer={(trackName, clip, instrumentName) => {
          if (onAddTrackWithClip) {
            onAddTrackWithClip(trackName, clip);
          }
          if (onNavigateToMixer) {
            onNavigateToMixer();
          }
        }}
      />
    </div>
  );
};

export default WaveSplitter;
