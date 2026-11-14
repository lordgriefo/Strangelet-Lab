import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Play, 
  Pause, 
  Download, 
  Plus, 
  Layers, 
  Volume2, 
  X, 
  Music, 
  Activity, 
  Mic, 
  Radio, 
  Disc, 
  ShieldCheck, 
  Zap, 
  Sliders, 
  ArrowRight,
  Flame,
  Check,
  RotateCw,
  Cpu
} from 'lucide-react';
import { 
  yue2Engine, 
  YUE2_VOCAL_PROFILES, 
  YUE2_PRESET_PROMPTS, 
  Yue2GenerationResult, 
  Yue2StemOutput 
} from '../services/yue2Engine';
import { Track, Clip, ProjectBinClip } from '../types';
import { playLaserBeamSound, playColliderInjectionSound } from '../lib/laserSound';

interface Yue2GeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectBpm?: number;
  tracks?: Track[];
  onAddTrackWithClip?: (trackName: string, clip: Clip) => void;
  onAddMultiStemTracks?: (stems: { name: string; buffer: AudioBuffer; color: string; durationBars: number }[], bpm: number) => void;
  onAddProjectBinClips?: (clips: ProjectBinClip[]) => void;
  onNavigateToMixer?: () => void;
  initialPrompt?: string;
}

export const Yue2GeneratorModal: React.FC<Yue2GeneratorModalProps> = ({
  isOpen,
  onClose,
  projectBpm = 120,
  tracks = [],
  onAddTrackWithClip,
  onAddMultiStemTracks,
  onAddProjectBinClips,
  onNavigateToMixer,
  initialPrompt
}) => {
  if (!isOpen) return null;

  const [prompt, setPrompt] = useState<string>(initialPrompt || YUE2_PRESET_PROMPTS[0].prompt);
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      setPrompt(initialPrompt);
    }
  }, [initialPrompt]);
  const [lyrics, setLyrics] = useState<string>(YUE2_PRESET_PROMPTS[0].lyrics);
  const [vocalProfileId, setVocalProfileId] = useState<string>(YUE2_PRESET_PROMPTS[0].vocalProfileId);
  const [bpm, setBpm] = useState<number>(projectBpm || 118);
  const [keyRoot, setKeyRoot] = useState<string>(YUE2_PRESET_PROMPTS[0].keyRoot);
  const [scale, setScale] = useState<string>(YUE2_PRESET_PROMPTS[0].scale);
  const [durationBars, setDurationBars] = useState<number>(16);
  const [instrumentalBalance, setInstrumentalBalance] = useState<number>(50); // 50/50 balance
  const [creativityTemp, setCreativityTemp] = useState<number>(0.85);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [result, setResult] = useState<Yue2GenerationResult | null>(null);

  // Playback state
  const [isPlayingFullMix, setIsPlayingFullMix] = useState<boolean>(false);
  const [activeStemPlaying, setActiveStemPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleSelectPreset = (pIdx: number) => {
    const p = YUE2_PRESET_PROMPTS[pIdx];
    setPrompt(p.prompt);
    setLyrics(p.lyrics);
    setVocalProfileId(p.vocalProfileId);
    setBpm(p.bpm);
    setKeyRoot(p.keyRoot);
    setScale(p.scale);
    playLaserBeamSound('laser_select');
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationStep('YuE 2.0 Stage 1: Dual-Track Autoregressive Token Generation...');
    playColliderInjectionSound();

    try {
      await new Promise(r => setTimeout(r, 600));
      setGenerationStep('YuE 2.0 Stage 2: Formant Vocal Alignment & Neural Stem Separation...');
      await new Promise(r => setTimeout(r, 800));
      setGenerationStep('YuE 2.0 Stage 3: Rendering 32-bit Floating Point Audio Stems...');

      const genResult = await yue2Engine.generateSong({
        prompt,
        lyrics,
        vocalProfileId,
        bpm,
        durationBars,
        keyRoot,
        scale,
        instrumentalBalance,
        creativityTemperature: creativityTemp
      });

      setResult(genResult);
      playLaserBeamSound('laser_curve');
    } catch (err) {
      console.error('YuE 2.0 generation failed:', err);
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  const handleTogglePlayFullMix = () => {
    if (!result) return;
    if (isPlayingFullMix) {
      audioRef.current?.pause();
      setIsPlayingFullMix(false);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(result.fullMixUrl);
        audioRef.current.onended = () => setIsPlayingFullMix(false);
      } else {
        audioRef.current.src = result.fullMixUrl;
      }
      audioRef.current.play();
      setIsPlayingFullMix(true);
      setActiveStemPlaying(null);
    }
  };

  const handlePlayStem = (stem: Yue2StemOutput) => {
    if (activeStemPlaying === stem.stemType) {
      audioRef.current?.pause();
      setActiveStemPlaying(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(stem.wavUrl);
      audioRef.current.onended = () => setActiveStemPlaying(null);
      audioRef.current.play();
      setActiveStemPlaying(stem.stemType);
      setIsPlayingFullMix(false);
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleDeployAllStemsToMixer = () => {
    if (!result) return;
    playColliderInjectionSound();

    if (onAddMultiStemTracks) {
      const stemPayload = result.stems.map(s => ({
        name: s.trackName,
        buffer: s.audioBuffer,
        color: s.color,
        durationBars: result.durationBars
      }));
      onAddMultiStemTracks(stemPayload, result.bpm);
    } else if (onAddTrackWithClip) {
      result.stems.forEach(stem => {
        const newClip: Clip = {
          id: `clip-yue-${stem.stemType}-${Date.now()}`,
          name: stem.trackName,
          startBar: 0,
          durationBars: result.durationBars,
          audioUrl: stem.wavUrl
        };
        onAddTrackWithClip(stem.trackName, newClip);
      });
    }

    // Also inject into Project Bin
    if (onAddProjectBinClips) {
      const binClips: ProjectBinClip[] = result.stems.map(s => ({
        id: `bin-yue-${s.stemType}-${Date.now()}`,
        name: s.trackName,
        durationSeconds: s.durationSeconds,
        durationBars: result.durationBars,
        audioUrl: s.wavUrl,
        hitType: s.stemType === 'drums' ? 'perc' : (s.stemType === 'bass' ? 'loop' : 'slice'),
        color: s.color,
        createdAt: Date.now(),
        audioBuffer: s.audioBuffer
      }));
      onAddProjectBinClips(binClips);
    }

    onClose();
    if (onNavigateToMixer) {
      onNavigateToMixer();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md font-mono select-none animate-fade-in">
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl border border-pink-500/40 bg-gradient-to-b from-[#140812] via-[#1B0C1A] to-[#0A0409] shadow-[0_0_45px_rgba(236,72,153,0.25)] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-pink-900/40 bg-[#160814] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-black font-black text-sm shadow-[0_0_15px_#EC4899]">
              <Sparkles size={18} className="text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                  YuE 2.0 FULL-SONG & MULTI-STEM NEURAL ENGINE
                </h2>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-pink-950 text-pink-300 border border-pink-600/50">
                  DUAL-TRACK LM
                </span>
              </div>
              <p className="text-xs text-[#9DA7CB] mt-0.5">
                Generate complete arrangements with isolated Vocal, Drums, Bass & Instrument stems aligned at Bar 0.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-black/40 hover:bg-white/20 text-[#AAA] hover:text-white border border-white/10 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          
          {/* Quick Presets Strip */}
          <div>
            <label className="text-[10px] font-bold text-[#8C9BBF] uppercase tracking-wider block mb-2">
              Instant Generation Presets:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {YUE2_PRESET_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPreset(idx)}
                  className="p-2.5 rounded-xl border border-pink-900/30 hover:border-pink-500/70 bg-black/40 hover:bg-pink-950/30 text-left transition-all group cursor-pointer"
                >
                  <div className="text-xs font-bold text-white group-hover:text-pink-300 truncate">
                    {p.title}
                  </div>
                  <div className="text-[10px] text-[#717C9B] mt-0.5">
                    {p.genre} • {p.bpm} BPM • Key: {p.keyRoot}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Form Controls Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left: Style Prompt & Vocal Timbre */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-white uppercase flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5 text-pink-300">
                    <Music size={14} />
                    <span>Style, Genre & Production Prompt</span>
                  </span>
                  <span className="text-[10px] text-[#717C9B]">{prompt.length} chars</span>
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  className="w-full p-3 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-pink-400 leading-relaxed resize-none"
                  placeholder="Describe instruments, acoustic vibe, analog synths, groove, drums..."
                />
              </div>

              {/* Vocal Profile Selection */}
              <div>
                <label className="text-xs font-bold text-white uppercase flex items-center gap-1.5 text-pink-300 mb-1.5">
                  <Mic size={14} />
                  <span>YuE Vocal Topline Profile</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {YUE2_VOCAL_PROFILES.map(prof => (
                    <button
                      key={prof.id}
                      onClick={() => setVocalProfileId(prof.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        vocalProfileId === prof.id
                          ? 'bg-pink-950/70 border-pink-400 text-white shadow-[0_0_12px_rgba(236,72,153,0.3)]'
                          : 'bg-black/40 border-white/10 text-[#8C9BBF] hover:text-white hover:border-white/20'
                      }`}
                    >
                      <div className="text-xs font-bold truncate">{prof.name}</div>
                      <div className="text-[9px] text-[#717C9B] line-clamp-1 mt-0.5">{prof.timbreDescription}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Musical Parameters */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-[#8C9BBF] uppercase">Tempo (BPM)</label>
                  <input
                    type="number"
                    min={60}
                    max={200}
                    value={bpm}
                    onChange={(e) => setBpm(parseInt(e.target.value) || 120)}
                    className="w-full mt-1 p-2 rounded-xl bg-black/60 border border-white/15 text-white font-bold text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#8C9BBF] uppercase">Key Root</label>
                  <select
                    value={keyRoot}
                    onChange={(e) => setKeyRoot(e.target.value)}
                    className="w-full mt-1 p-2 rounded-xl bg-black/60 border border-white/15 text-amber-300 font-bold"
                  >
                    {['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'].map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#8C9BBF] uppercase">Duration</label>
                  <select
                    value={durationBars}
                    onChange={(e) => setDurationBars(parseInt(e.target.value))}
                    className="w-full mt-1 p-2 rounded-xl bg-black/60 border border-white/15 text-cyan-300 font-bold"
                  >
                    <option value={8}>8 Bars (Short)</option>
                    <option value={16}>16 Bars (Standard)</option>
                    <option value={24}>24 Bars (Extended)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Right: Lyrics & Dual-Track Balance */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-white uppercase flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5 text-pink-300">
                    <Radio size={14} />
                    <span>Lyrical Structure & Section Tags</span>
                  </span>
                  <span className="text-[10px] text-[#717C9B]">Supports [Verse], [Chorus], [Outro]</span>
                </label>
                <textarea
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  rows={6}
                  className="w-full p-3 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-pink-400 leading-relaxed resize-none"
                  placeholder="[Verse 1]&#10;Write lyrics here...&#10;[Chorus]&#10;Chorus topline melody..."
                />
              </div>

              {/* Vocal vs Instrumental Balance */}
              <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-pink-300">Vocal Emphasis ({100 - instrumentalBalance}%)</span>
                  <span className="text-cyan-300">Instrumental ({instrumentalBalance}%)</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={90}
                  value={instrumentalBalance}
                  onChange={(e) => setInstrumentalBalance(parseInt(e.target.value))}
                  className="w-full accent-pink-400 h-1.5 bg-black/60 rounded cursor-pointer"
                />
              </div>
            </div>

          </div>

          {/* Action Button */}
          <div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`w-full py-4 rounded-xl font-black text-sm tracking-wide transition-all shadow-[0_0_25px_rgba(236,72,153,0.3)] flex items-center justify-center gap-2 cursor-pointer ${
                isGenerating
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:brightness-110 text-black'
              }`}
            >
              {isGenerating ? (
                <>
                  <RotateCw size={18} className="animate-spin text-pink-400" />
                  <span>{generationStep || 'Generating Multi-Track Song...'}</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>GENERATE FULL SONG & SEPARATED STEMS WITH YUE 2.0</span>
                </>
              )}
            </button>
          </div>

          {/* Result Stems Deck */}
          {result && (
            <div className="p-6 rounded-2xl bg-black/60 border-2 border-pink-500/50 space-y-5 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
                <div>
                  <div className="text-[10px] text-pink-400 font-bold uppercase tracking-wider">
                    Generation Complete ({result.generationTimeMs}ms)
                  </div>
                  <h3 className="text-lg font-black text-white">{result.songTitle}</h3>
                  <div className="text-xs text-[#8C9BBF] mt-0.5">
                    {result.bpm} BPM • Key: {result.keyRoot} • {result.durationBars} Bars • {result.vocalProfile.name}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTogglePlayFullMix}
                    className="px-4 py-2 rounded-xl bg-white text-black font-extrabold text-xs flex items-center gap-2 hover:bg-pink-300 transition-colors cursor-pointer"
                  >
                    {isPlayingFullMix ? <Pause size={14} /> : <Play size={14} />}
                    <span>{isPlayingFullMix ? 'Pause Full Mix' : 'Play Full Mix'}</span>
                  </button>

                  <button
                    onClick={handleDeployAllStemsToMixer}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-black font-black text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(236,72,153,0.4)] transition-all cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>DEPLOY ALL STEMS TO MIXER (BAR 0)</span>
                  </button>
                </div>
              </div>

              {/* The 4 Separated Stems Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {result.stems.map((stem) => {
                  const isPlaying = activeStemPlaying === stem.stemType;
                  return (
                    <div 
                      key={stem.stemType}
                      className="p-4 rounded-xl bg-[#110A14] border border-white/10 flex flex-col justify-between space-y-3"
                      style={{ borderTop: `3px solid ${stem.color}` }}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-black/60 font-mono" style={{ color: stem.color }}>
                            {stem.stemType}
                          </span>
                          <span className="text-[10px] text-[#717C9B] font-mono">{stem.durationSeconds.toFixed(1)}s</span>
                        </div>
                        <h4 className="text-xs font-bold text-white mt-1.5 truncate" title={stem.trackName}>
                          {stem.trackName}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                        <button
                          onClick={() => handlePlayStem(stem)}
                          className="flex-1 py-1.5 rounded-lg bg-black/60 hover:bg-white/10 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
                        >
                          {isPlaying ? <Pause size={12} className="text-pink-400" /> : <Play size={12} />}
                          <span>{isPlaying ? 'Pause' : 'Solo Preview'}</span>
                        </button>

                        <a
                          href={stem.wavUrl}
                          download={`${stem.trackName.replace(/\s+/g, '_')}.wav`}
                          className="p-1.5 rounded-lg bg-black/60 hover:bg-white/10 text-[#8C9BBF] hover:text-white border border-white/10 transition-colors"
                          title="Download WAV file"
                        >
                          <Download size={13} />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
