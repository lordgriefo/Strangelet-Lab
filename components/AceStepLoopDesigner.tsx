import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Play, 
  Pause, 
  RotateCw, 
  Download, 
  Plus, 
  Sliders, 
  Cpu, 
  Layers, 
  Volume2, 
  Check, 
  X, 
  Music, 
  Activity, 
  Send, 
  Wand2, 
  Bot, 
  Atom, 
  Split,
  ChevronRight,
  Flame,
  FileAudio,
  Mic,
  Radio,
  Headphones,
  ArrowRight,
  Gauge,
  Disc,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { 
  AceStepGenerationConfig, 
  AceStepLoopResult, 
  AceStepStemType,
  AceStepSongBedConfig,
  AceStepSongBedResult,
  Track, 
  Clip, 
  ProjectBinClip 
} from '../types';
import { 
  generateAceStepLoop, 
  generateAceStepSongBed,
  ACESTEP_LOOP_PRESETS, 
  STEM_COLORS 
} from '../services/aceStepEngine';
import { getAceStepPromptIdea } from '../services/koboldCppService';
import { playLaserBeamSound, playColliderInjectionSound } from '../lib/laserSound';
import { AceStepLoraLibraryModal } from './AceStepLoraLibraryModal';

interface AceStepLoopDesignerProps {
  isOpen?: boolean;
  onClose?: () => void;
  projectBpm?: number;
  tracks?: Track[];
  onAddTrackWithClip?: (trackName: string, clip: Clip) => void;
  onAddClipToTrack?: (trackId: string, clip: Clip) => void;
  onAddProjectBinClips?: (clips: ProjectBinClip[]) => void;
  onNavigateToCollider?: () => void;
  onNavigateToMixer?: () => void;
  onApplySongBedToMixer?: (songBed: AceStepSongBedResult) => void;
  initialStemType?: AceStepStemType;
}

const STEM_OPTIONS: { id: AceStepStemType; label: string; desc: string }[] = [
  { id: 'full_loop', label: 'Full Loop', desc: 'Complete arrangement with drums, bass, chords & lead' },
  { id: 'drums', label: 'Drums & Breaks', desc: 'Syncopated kicks, snares, 2-step shuffle, 909 hats' },
  { id: 'bass', label: 'Bass & 808', desc: 'Acid 303 squelch, Reese sub glide, heavy punch' },
  { id: 'lead', label: 'Synth Lead', desc: 'Arpeggiators, pluck hooks, neon synthwave melodies' },
  { id: 'pad', label: 'Ambient Pad', desc: 'Mellotron strings, dream chords, shimmer reverb' },
  { id: 'vocal_chop', label: 'Vocal Chops', desc: 'Pitched formant hooks, rhythmic soul chops' }
];

const ROOT_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const SCALES = [
  { id: 'minor', label: 'Natural Minor (Aeolian)' },
  { id: 'major', label: 'Major (Ionian)' },
  { id: 'dorian', label: 'Dorian (Soul / Synth)' },
  { id: 'phrygian', label: 'Phrygian (Dark / Acid)' }
] as const;

export const AceStepLoopDesigner: React.FC<AceStepLoopDesignerProps> = ({
  isOpen = true,
  onClose,
  projectBpm = 120,
  tracks = [],
  onAddTrackWithClip,
  onAddClipToTrack,
  onAddProjectBinClips,
  onNavigateToCollider,
  onNavigateToMixer,
  onApplySongBedToMixer,
  initialStemType = 'bass'
}) => {
  const [stemType, setStemType] = useState<AceStepStemType>(initialStemType);
  const [prompt, setPrompt] = useState<string>(
    'Driving 16th-note Roland TB-303 square wave acid bassline with resonant low-pass filter squelch, accent envelope, analog drive'
  );
  const [durationBars, setDurationBars] = useState<number>(4);
  const [bpm, setBpm] = useState<number>(projectBpm);
  const [keyRoot, setKeyRoot] = useState<string>('F#');
  const [scale, setScale] = useState<'minor' | 'major' | 'dorian' | 'phrygian'>('minor');
  const [diffusionSteps, setDiffusionSteps] = useState<number>(24);
  const [guidanceScale, setGuidanceScale] = useState<number>(7.5);
  const [useTapeWarmth, setUseTapeWarmth] = useState<boolean>(true);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentLoop, setCurrentLoop] = useState<AceStepLoopResult | null>(null);
  const [history, setHistory] = useState<AceStepLoopResult[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [targetTrackId, setTargetTrackId] = useState<string>(tracks[0]?.id || '');
  const [notification, setNotification] = useState<string | null>(null);
  const [isLoraModalOpen, setIsLoraModalOpen] = useState<boolean>(false);

  // Mode Selector State: 'loop' | 'song_bed' | 'traditional_hybrid'
  const [designerMode, setDesignerMode] = useState<'loop' | 'song_bed' | 'traditional_hybrid'>('loop');
  const [songBedBars, setSongBedBars] = useState<16 | 32 | 64>(32);
  const [songTitle, setSongTitle] = useState<string>('Project Midnight Drive');
  const [includeGuitarOverdub, setIncludeGuitarOverdub] = useState<boolean>(true);
  const [currentSongBed, setCurrentSongBed] = useState<AceStepSongBedResult | null>(null);
  const [selectedSongBedStems, setSelectedSongBedStems] = useState<AceStepStemType[]>([
    'drums',
    'bass',
    'pad',
    'lead'
  ]);

  // Synchronized Multi-Track Audio Controller
  const [isMultiPlaying, setIsMultiPlaying] = useState<boolean>(false);
  const [mutedStemIds, setMutedStemIds] = useState<string[]>([]);
  const [soloedStemIds, setSoloedStemIds] = useState<string[]>([]);
  const [stemVolumes, setStemVolumes] = useState<Record<string, number>>({});
  const multiAudioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Traditional Tracking Workflow Configuration
  const [countInBars, setCountInBars] = useState<1 | 2>(1);
  const [inputMonitoring, setInputMonitoring] = useState<boolean>(true);
  const [armedTrackName, setArmedTrackName] = useState<string>('🎸 Guitar / Live Overdub (Armed)');

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync project BPM when changed
  useEffect(() => {
    if (projectBpm) {
      setBpm(projectBpm);
    }
  }, [projectBpm]);

  // Audio Playback Controller
  useEffect(() => {
    if (!currentLoop?.audioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(currentLoop.audioUrl);
      audioRef.current.loop = true;
      audioRef.current.onended = () => setIsPlaying(false);
    } else {
      audioRef.current.src = currentLoop.audioUrl;
      audioRef.current.currentTime = 0;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [currentLoop]);

  const handleTogglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(console.warn);
      setIsPlaying(true);
      playLaserBeamSound('laser_audio');
    }
  };

  // Synchronize Multi-Track Audio Elements for Song Bed
  useEffect(() => {
    multiAudioElementsRef.current.forEach(el => el.pause());
    multiAudioElementsRef.current.clear();
    setIsMultiPlaying(false);

    if (currentSongBed?.stems) {
      currentSongBed.stems.forEach(stem => {
        if (stem.audioUrl) {
          const el = new Audio(stem.audioUrl);
          el.loop = true;
          multiAudioElementsRef.current.set(stem.id, el);
        }
      });
    }

    return () => {
      multiAudioElementsRef.current.forEach(el => el.pause());
      multiAudioElementsRef.current.clear();
    };
  }, [currentSongBed]);

  const handleToggleMultiPlay = () => {
    if (!currentSongBed || multiAudioElementsRef.current.size === 0) return;
    if (isMultiPlaying) {
      multiAudioElementsRef.current.forEach(el => el.pause());
      setIsMultiPlaying(false);
    } else {
      const anySoloed = soloedStemIds.length > 0;
      multiAudioElementsRef.current.forEach((el, stemId) => {
        const isMuted = mutedStemIds.includes(stemId);
        const isSoloed = soloedStemIds.includes(stemId);
        if (isMuted || (anySoloed && !isSoloed)) {
          el.volume = 0;
        } else {
          el.volume = stemVolumes[stemId] ?? 0.85;
        }
        el.currentTime = 0;
        el.play().catch(console.warn);
      });
      setIsMultiPlaying(true);
      playLaserBeamSound('laser_audio');
    }
  };

  const handleToggleStemMute = (stemId: string) => {
    setMutedStemIds(prev => {
      const next = prev.includes(stemId) ? prev.filter(id => id !== stemId) : [...prev, stemId];
      const el = multiAudioElementsRef.current.get(stemId);
      if (el) {
        el.volume = next.includes(stemId) ? 0 : (stemVolumes[stemId] ?? 0.85);
      }
      return next;
    });
  };

  const handleToggleStemSolo = (stemId: string) => {
    setSoloedStemIds(prev => {
      const next = prev.includes(stemId) ? prev.filter(id => id !== stemId) : [...prev, stemId];
      const anySolo = next.length > 0;
      multiAudioElementsRef.current.forEach((el, sId) => {
        const isMuted = mutedStemIds.includes(sId);
        const isSolo = next.includes(sId);
        if (isMuted || (anySolo && !isSolo)) {
          el.volume = 0;
        } else {
          el.volume = stemVolumes[sId] ?? 0.85;
        }
      });
      return next;
    });
  };

  const handleSetStemVolume = (stemId: string, vol: number) => {
    setStemVolumes(prev => ({ ...prev, [stemId]: vol }));
    const el = multiAudioElementsRef.current.get(stemId);
    if (el && !mutedStemIds.includes(stemId)) {
      el.volume = vol;
    }
  };

  const handleSelectPreset = (preset: typeof ACESTEP_LOOP_PRESETS[0]) => {
    setStemType(preset.stemType);
    setPrompt(preset.prompt);
    setDurationBars(preset.durationBars);
    setKeyRoot(preset.keyRoot);
    setScale(preset.scale);
    playLaserBeamSound('laser_select');
  };

  const handleAskBuddyForPrompt = () => {
    const idea = getAceStepPromptIdea(stemType, 'cyberpunk', bpm);
    setPrompt(idea);
    playColliderInjectionSound();
    showToast('Llama Buddy generated a fresh loop prompt!');
  };

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    playColliderInjectionSound();

    try {
      const config: AceStepGenerationConfig = {
        prompt,
        stemType,
        durationBars,
        bpm,
        keyRoot,
        scale,
        diffusionSteps,
        guidanceScale,
        useTapeWarmth
      };

      const result = await generateAceStepLoop(config);
      setCurrentLoop(result);
      setHistory(prev => [result, ...prev.slice(0, 7)]);
      setIsPlaying(true);

      // Auto play preview
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(console.warn);
        }
      }, 100);

      playLaserBeamSound('laser_curve');
      showToast(`Ace-Step 1.5 synthesized ${result.name} perfectly synced to ${bpm} BPM!`);
    } catch (err) {
      console.error('Ace-Step generation error:', err);
      showToast('Generation failed. Check audio context.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Full Song Bed Synthesis Handler
  const handleGenerateSongBed = async () => {
    setIsGenerating(true);
    playColliderInjectionSound();

    try {
      const config: AceStepSongBedConfig = {
        songTitle,
        prompt,
        bpm,
        keyRoot,
        scale,
        totalBars: songBedBars,
        includeGuitarOverdubTrack: includeGuitarOverdub,
        selectedStems: selectedSongBedStems,
        useTapeWarmth
      };

      const result = await generateAceStepSongBed(config);
      setCurrentSongBed(result);
      if (result.stems[0]) {
        setCurrentLoop(result.stems[0]);
      }
      playLaserBeamSound('laser_curve');
      showToast(`Ace-Step 1.5 generated full ${result.totalBars}-bar Song Bed with ${result.stems.length} stems!`);
    } catch (err) {
      console.error('Song bed generation error:', err);
      showToast('Failed to generate song bed.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Export Complete Song Bed to Mixer Console
  const handleExportSongBedToMixer = () => {
    if (!currentSongBed) return;
    playColliderInjectionSound();

    if (onApplySongBedToMixer) {
      onApplySongBedToMixer(currentSongBed);
    } else if (onAddTrackWithClip) {
      // Add each stem as an individual track
      currentSongBed.stems.forEach(stem => {
        const clip: Clip = {
          id: `clip-${stem.id}`,
          name: stem.name,
          startBar: 0,
          durationBars: stem.durationBars,
          audioUrl: stem.audioUrl,
          waveformSnippet: stem.waveformSnippet
        };
        onAddTrackWithClip(stem.name, clip);
      });

      // Add empty armed track for guitar/live tracking
      if (includeGuitarOverdub) {
        onAddTrackWithClip('🎸 Guitar / Live Overdub (Armed)', {
          id: `clip-guitar-${Date.now()}`,
          name: 'Guitar Take (Ready to Record)',
          startBar: 0,
          durationBars: currentSongBed.totalBars
        });
      }
    }

    showToast(`Exported ${currentSongBed.title} (${currentSongBed.totalBars} Bars) to Mixer Console in sync!`);
    if (onNavigateToMixer) onNavigateToMixer();
  };

  // 1. Send as New Track to Mixer Console
  const handleSendToNewMixerTrack = () => {
    if (!currentLoop) return;
    const clip: Clip = {
      id: `clip-acestep-${Date.now()}`,
      name: currentLoop.name,
      startBar: 0,
      durationBars: currentLoop.durationBars,
      audioUrl: currentLoop.audioUrl,
      waveformSnippet: currentLoop.waveformSnippet
    };

    if (onAddTrackWithClip) {
      onAddTrackWithClip(currentLoop.name, clip);
      playColliderInjectionSound();
      showToast(`Sent ${currentLoop.name} to Mixer Console as a new track!`);
      if (onNavigateToMixer) onNavigateToMixer();
    }
  };

  // 2. Insert into Existing Selected Track
  const handleInsertIntoSelectedTrack = () => {
    if (!currentLoop || !targetTrackId) return;
    const clip: Clip = {
      id: `clip-acestep-${Date.now()}`,
      name: currentLoop.name,
      startBar: 0,
      durationBars: currentLoop.durationBars,
      audioUrl: currentLoop.audioUrl,
      waveformSnippet: currentLoop.waveformSnippet
    };

    if (onAddClipToTrack) {
      onAddClipToTrack(targetTrackId, clip);
      playColliderInjectionSound();
      showToast(`Inserted clip into track!`);
    }
  };

  // 3. Add to Project Bin
  const handleAddToProjectBin = () => {
    if (!currentLoop || !onAddProjectBinClips) return;
    const binClip: ProjectBinClip = {
      id: `bin-${currentLoop.id}`,
      name: currentLoop.name,
      durationSeconds: currentLoop.durationSeconds,
      durationBars: currentLoop.durationBars,
      audioUrl: currentLoop.audioUrl,
      audioBuffer: currentLoop.audioBuffer,
      color: currentLoop.color,
      createdAt: Date.now(),
      sourceTrack: 'Ace-Step 1.5 GGUF'
    };

    onAddProjectBinClips([binClip]);
    playLaserBeamSound('laser_select');
    showToast(`Added ${currentLoop.name} to Project Bin!`);
  };

  // 4. Download 24-bit WAV
  const handleDownloadWav = () => {
    if (!currentLoop?.audioUrl) return;
    const a = document.createElement('a');
    a.href = currentLoop.audioUrl;
    a.download = `${currentLoop.name}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Downloading ${currentLoop.name}.wav`);
  };

  const activeColor = STEM_COLORS[stemType] || '#00F0FF';

  return (
    <div className="h-full w-full flex flex-col bg-[#07090F] text-[#E0E6F8] font-mono select-none overflow-y-auto">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-cyan-950/90 border border-cyan-400 text-cyan-200 text-xs shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center gap-2 animate-fade-in backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-cyan-300 animate-spin" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="px-6 py-4 border-b border-[#182035] bg-gradient-to-r from-[#0C101E] via-[#0F1528] to-[#0A0D18] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors border"
            style={{ 
              backgroundColor: `${activeColor}22`,
              borderColor: `${activeColor}66`,
              color: activeColor 
            }}
          >
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold tracking-wider text-white uppercase flex items-center gap-2">
                ACE-STEP 1.5 GGUF // NEURAL LOOP DESIGNER
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-bold">
                DIFFUSION SYNTHESIS
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold">
                LOW-RESOURCE GGUF
              </span>
            </div>
            <p className="text-xs text-[#7F87A7] mt-0.5">
              Deterministic, bar-synced neural loop generation running on ultra-low system resources.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {onNavigateToMixer && (
            <button
              onClick={onNavigateToMixer}
              className="px-3 py-1.5 rounded-lg bg-[#141A2D] hover:bg-[#1C2542] border border-[#242F52] text-xs text-[#9DA7CB] hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Open Mixer Console</span>
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#7F87A7] hover:text-white hover:bg-[#182035] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex border-b border-[#182035] bg-[#090C16] px-6 pt-2 gap-2 flex-wrap">
        <button
          onClick={() => setDesignerMode('loop')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            designerMode === 'loop'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
              : 'border-transparent text-[#64748B] hover:text-white'
          }`}
        >
          <Sparkles size={14} className="text-cyan-400" />
          <span>1. SINGLE LOOP / STEM SYNTHESIZER</span>
        </button>

        <button
          onClick={() => setDesignerMode('song_bed')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            designerMode === 'song_bed'
              ? 'border-[#EC4899] text-[#EC4899] bg-pink-950/20'
              : 'border-transparent text-[#64748B] hover:text-white'
          }`}
        >
          <Layers size={14} className="text-[#EC4899]" />
          <span>2. MULTI-TRACK SONG BED GENERATOR (LINE UP TO MIXER)</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-pink-950 text-pink-300 border border-pink-700/60 font-mono font-bold">
            AI TO MIXER
          </span>
        </button>

        <button
          onClick={() => setDesignerMode('traditional_hybrid')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            designerMode === 'traditional_hybrid'
              ? 'border-emerald-400 text-emerald-300 bg-emerald-950/20'
              : 'border-transparent text-[#64748B] hover:text-white'
          }`}
        >
          <Mic size={14} className="text-emerald-400" />
          <span>3. AI + TRADITIONAL RECORDING WORKBENCH</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-mono font-bold">
            HYBRID
          </span>
        </button>
      </div>

      {/* Main Workspace Body */}
      {designerMode === 'loop' ? (
        <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
          {/* Left Column: Stem Selector, Presets & Prompt Controls (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-5">
            {/* Stem Selector Tabs */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#9DA7CB] uppercase tracking-wider flex items-center justify-between">
                <span>Select Stem Layer</span>
                <span className="text-[10px] text-[#697298]">Locks DSP routing & spectral harmonics</span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {STEM_OPTIONS.map(opt => {
                  const optColor = STEM_COLORS[opt.id];
                  const isSelected = stemType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setStemType(opt.id);
                        playLaserBeamSound('laser_select');
                      }}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'bg-[#151C30] border-white/40 shadow-lg'
                          : 'bg-[#0B0F1B] border-[#1C243B] text-[#7F87A7] hover:text-white hover:bg-[#11172A]'
                      }`}
                      style={isSelected ? { borderColor: optColor, boxShadow: `0 0 15px ${optColor}33` } : {}}
                    >
                      <div 
                        className="w-2.5 h-2.5 rounded-full mx-auto mb-1.5 shadow-sm"
                        style={{ backgroundColor: optColor }}
                      />
                      <div className="text-[11px] font-bold text-white truncate">{opt.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Presets Bank */}
            <div className="p-3.5 rounded-2xl bg-[#0B0E1B] border border-[#1C243C] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#8B94B8] uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Legendary Loop Presets</span>
                </span>
                <span className="text-[9px] text-[#616B90]">1-Click load</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ACESTEP_LOOP_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectPreset(p)}
                    className="px-2.5 py-2 rounded-lg bg-[#111628] hover:bg-[#18213D] border border-[#202947] hover:border-cyan-400/50 text-left transition-all text-xs group"
                  >
                    <div className="text-[10px] font-bold text-white group-hover:text-cyan-300 truncate">
                      {p.title}
                    </div>
                    <div className="text-[9px] text-[#6A7398] mt-0.5">
                      {p.keyRoot} {p.scale} • {p.durationBars} Bars
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Input & AI Assistant Trigger */}
            <div className="space-y-1.5 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#9DA7CB] uppercase tracking-wider flex items-center gap-1.5">
                  <span>Prompt Specification</span>
                  <span className="text-[10px] font-normal text-[#697298]">(Instruments, vibe, harmonics)</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsLoraModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-pink-950/60 hover:bg-pink-900/70 border border-pink-500/40 text-pink-300 text-[10px] font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                    title="Open Ace-Step LoRA Lending Library"
                  >
                    <Layers className="w-3.5 h-3.5 text-pink-400" />
                    <span>LoRA Lending Library</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAskBuddyForPrompt}
                    className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-600/30 to-purple-600/30 hover:from-amber-600/50 hover:to-purple-600/50 border border-amber-500/40 text-amber-200 text-[10px] font-bold flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                  >
                    <Bot className="w-3.5 h-3.5 text-amber-300" />
                    <span>Ask Ghost & Quinn for Prompt</span>
                  </button>
                </div>
              </div>

              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={3}
                placeholder="e.g. Rolling TB-303 square wave acid bassline at 128 BPM with resonant low-pass filter squelch and analog drive..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F1C] border border-[#212A45] focus:border-cyan-400 text-white text-xs leading-relaxed focus:outline-none transition-colors resize-none shadow-inner"
              />
            </div>

            {/* Grid, Tempo & Musical Key Synchronizer */}
            <div className="p-4 rounded-2xl bg-[#0B0F1C] border border-[#1E2642] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {/* Duration Bars */}
              <div className="space-y-1">
                <label className="text-[10px] text-[#7A83A8] uppercase font-bold">Bar Length</label>
                <div className="grid grid-cols-4 gap-1">
                  {[2, 4, 8, 16].map(b => (
                    <button
                      key={b}
                      onClick={() => setDurationBars(b)}
                      className={`py-1 rounded text-center font-bold text-[10px] border transition-colors ${
                        durationBars === b
                          ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300'
                          : 'bg-[#12182B] border-[#222B49] text-[#7A83A8] hover:text-white'
                      }`}
                    >
                      {b}B
                    </button>
                  ))}
                </div>
              </div>

              {/* Tempo BPM Sync */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-[#7A83A8] uppercase font-bold">Tempo (BPM)</label>
                  <button
                    onClick={() => setBpm(projectBpm)}
                    className="text-[9px] text-cyan-400 hover:underline"
                    title="Lock to Project BPM"
                  >
                    Sync ({projectBpm})
                  </button>
                </div>
                <input
                  type="number"
                  min={60}
                  max={200}
                  value={bpm}
                  onChange={e => setBpm(Number(e.target.value))}
                  className="w-full px-2.5 py-1 rounded bg-[#12182B] border border-[#222B49] text-white font-bold text-center text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Key Root */}
              <div className="space-y-1">
                <label className="text-[10px] text-[#7A83A8] uppercase font-bold">Root Key</label>
                <select
                  value={keyRoot}
                  onChange={e => setKeyRoot(e.target.value)}
                  className="w-full px-2.5 py-1 rounded bg-[#12182B] border border-[#222B49] text-white font-bold text-xs focus:outline-none focus:border-cyan-400"
                >
                  {ROOT_KEYS.map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>

              {/* Scale */}
              <div className="space-y-1">
                <label className="text-[10px] text-[#7A83A8] uppercase font-bold">Scale Mode</label>
                <select
                  value={scale}
                  onChange={e => setScale(e.target.value as any)}
                  className="w-full px-2 py-1 rounded bg-[#12182B] border border-[#222B49] text-white font-bold text-xs focus:outline-none focus:border-cyan-400"
                >
                  {SCALES.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Diffusion Parameters & Analog Warmth */}
            <div className="p-3.5 rounded-2xl bg-[#090C17] border border-[#1A223B] flex items-center justify-between text-xs flex-wrap gap-3">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-[10px] text-[#697298] uppercase font-bold block">Steps: {diffusionSteps}</span>
                  <input
                    type="range"
                    min={12}
                    max={48}
                    step={2}
                    value={diffusionSteps}
                    onChange={e => setDiffusionSteps(Number(e.target.value))}
                    className="w-24 accent-cyan-400"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-[#697298] uppercase font-bold block">Guidance: {guidanceScale}</span>
                  <input
                    type="range"
                    min={2}
                    max={12}
                    step={0.5}
                    value={guidanceScale}
                    onChange={e => setGuidanceScale(Number(e.target.value))}
                    className="w-24 accent-purple-400"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useTapeWarmth}
                  onChange={e => setUseTapeWarmth(e.target.checked)}
                  className="rounded accent-amber-400 w-3.5 h-3.5"
                />
                <span className="text-[11px] font-bold text-amber-300">
                  Vintage Analog Tape Saturation
                </span>
              </label>
            </div>

            {/* Primary Generate Trigger Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-3.5 rounded-2xl font-bold text-sm uppercase tracking-wider text-black transition-all flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(0,240,255,0.35)] disabled:opacity-50 cursor-pointer"
              style={{
                background: `linear-gradient(135deg, ${activeColor}, #00F0FF)`
              }}
            >
              {isGenerating ? (
                <>
                  <RotateCw className="w-5 h-5 animate-spin" />
                  <span>Synthesizing with Ace-Step 1.5 GGUF...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>GENERATE LOOP WITH ACE-STEP 1.5 GGUF</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Audio Waveform Player, Mixer Integration & Vault (5 cols) */}
          <div className="lg:col-span-5 flex flex-col space-y-5">
            {/* Active Audio Waveform Monitor */}
            <div className="p-5 rounded-2xl bg-[#0B0F1C] border border-[#1E2642] flex flex-col justify-between flex-1 shadow-lg min-h-[300px]">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-[#9DA7CB] uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span>Synthesized Loop Telemetry</span>
                  </span>
                  {currentLoop && (
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ backgroundColor: `${currentLoop.color}22`, color: currentLoop.color }}>
                      {currentLoop.stemType.toUpperCase()}
                    </span>
                  )}
                </div>

                {currentLoop ? (
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-wide truncate">
                        {currentLoop.name}
                      </h3>
                      <div className="flex items-center gap-2 text-[10px] text-[#7A83A8] mt-0.5">
                        <span>{currentLoop.bpm} BPM</span>
                        <span>•</span>
                        <span>{currentLoop.key}</span>
                        <span>•</span>
                        <span>{currentLoop.durationBars} Bars ({currentLoop.durationSeconds}s)</span>
                      </div>
                    </div>

                    {/* Waveform Visualization Canvas */}
                    <div className="h-28 rounded-xl bg-[#060913] border border-[#1A223A] p-2 flex items-center justify-between gap-1 overflow-hidden relative">
                      {currentLoop.waveformSnippet.map((peak, idx) => (
                        <div
                          key={idx}
                          className="flex-1 rounded-full transition-all duration-300"
                          style={{
                            height: `${Math.max(8, peak * 95)}%`,
                            backgroundColor: currentLoop.color,
                            boxShadow: isPlaying ? `0 0 8px ${currentLoop.color}66` : 'none',
                            opacity: isPlaying ? 0.9 : 0.6
                          }}
                        />
                      ))}

                      {/* Playhead Indicator when active */}
                      {isPlaying && (
                        <div className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_white] animate-pulse left-1/2 -translate-x-1/2" />
                      )}
                    </div>

                    {/* Playback Transport Row */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={handleTogglePlay}
                        className="px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 bg-[#141B2E] hover:bg-[#1C2540] border border-cyan-500/40 text-cyan-300 transition-colors shadow-[0_0_10px_rgba(6,182,212,0.2)] cursor-pointer"
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-cyan-300" />}
                        <span>{isPlaying ? 'PAUSE LOOP' : 'PLAY LOOP'}</span>
                      </button>

                      <button
                        onClick={handleDownloadWav}
                        className="p-2 rounded-xl bg-[#141B2E] hover:bg-[#1C2540] border border-[#212B47] text-[#9DA7CB] hover:text-white transition-colors cursor-pointer"
                        title="Download 24-bit WAV"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-44 rounded-xl bg-[#060913] border border-dashed border-[#1C243B] flex flex-col items-center justify-center p-4 text-center text-xs text-[#5D6687]">
                    <Music className="w-8 h-8 text-[#2F395A] mb-2 animate-bounce" />
                    <p className="font-bold text-[#7F87A7]">No Loop Synthesized Yet</p>
                    <p className="text-[10px] text-[#555E7E] mt-1 max-w-xs">
                      Choose a preset or prompt and hit generate to synthesize with Ace-Step 1.5 GGUF.
                    </p>
                  </div>
                )}
              </div>

              {/* Direct Mixer Console Integration Controls */}
              {currentLoop && (
                <div className="pt-4 border-t border-[#1C233B] space-y-2.5">
                  <span className="text-[10px] font-bold text-[#8B94B8] uppercase tracking-wider block">
                    Mixer Console & DAW Actions
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Send to New Track */}
                    <button
                      onClick={handleSendToNewMixerTrack}
                      className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Send as New Track</span>
                    </button>

                    {/* Add to Project Bin */}
                    <button
                      onClick={handleAddToProjectBin}
                      className="px-3 py-2.5 rounded-xl bg-[#141B2E] hover:bg-[#1C2540] border border-[#263152] text-xs font-bold text-[#9DA7CB] hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FileAudio className="w-4 h-4 text-cyan-400" />
                      <span>Add to Project Bin</span>
                    </button>
                  </div>

                  {/* Drop onto Existing Track */}
                  {tracks.length > 0 && (
                    <div className="flex gap-2">
                      <select
                        value={targetTrackId}
                        onChange={e => setTargetTrackId(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#0C1120] border border-[#212B47] text-white text-xs focus:outline-none"
                      >
                        {tracks.map(t => (
                          <option key={t.id} value={t.id}>
                            Insert into {t.name}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={handleInsertIntoSelectedTrack}
                        className="px-3 py-1.5 rounded-lg bg-[#141B2E] hover:bg-cyan-600 hover:text-black border border-cyan-500/40 text-cyan-300 font-bold text-xs transition-all cursor-pointer"
                      >
                        Insert Clip
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Session Loop Vault History */}
            {history.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-[#090C17] border border-[#1A223B] space-y-2">
                <span className="text-[10px] font-bold text-[#7F87A7] uppercase tracking-wider block">
                  Session Generated Loops ({history.length})
                </span>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {history.map(item => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setCurrentLoop(item);
                        playLaserBeamSound('laser_select');
                      }}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        currentLoop?.id === item.id
                          ? 'bg-[#151C30] border-cyan-400/50 text-white'
                          : 'bg-[#0E1322] border-[#1D253E] text-[#7F87A7] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="truncate text-[11px] font-mono">{item.name}</span>
                      </div>

                      <span className="text-[9px] text-[#697298] shrink-0 font-mono">
                        {item.durationBars}B
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Multi-Track Song Bed & AI + Traditional Recording Workbench */
        <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
          {/* Left Column: Full Song Bed Configuration & AI Blending Setup (5 cols) */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            {/* Song Title & Bars */}
            <div className="p-4 rounded-2xl bg-[#0B0F1C] border border-[#1E2642] space-y-3">
              <div>
                <label className="text-[10px] text-[#7A83A8] uppercase font-bold block mb-1">
                  Song Bed Project Title
                </label>
                <input
                  type="text"
                  value={songTitle}
                  onChange={e => setSongTitle(e.target.value)}
                  placeholder="e.g. Midnight Cyberpunk Session"
                  className="w-full px-3 py-2 rounded-xl bg-[#12182B] border border-[#222B49] text-white font-bold text-xs focus:outline-none focus:border-pink-500"
                />
              </div>

              {/* Bar Length Selector */}
              <div>
                <label className="text-[10px] text-[#7A83A8] uppercase font-bold block mb-1">
                  Arrangement Length (Synchronized Bars)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([16, 32, 64] as const).map(b => (
                    <button
                      key={b}
                      onClick={() => setSongBedBars(b)}
                      className={`py-2 rounded-lg text-center font-bold text-xs border transition-colors cursor-pointer ${
                        songBedBars === b
                          ? 'bg-pink-950/80 border-pink-500 text-pink-300 shadow-sm'
                          : 'bg-[#12182B] border-[#222B49] text-[#7A83A8] hover:text-white'
                      }`}
                    >
                      {b} Bars {b === 16 ? '(Intro/Verse)' : b === 32 ? '(Full Song)' : '(Extended)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tempo & Key Grid */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-[#7A83A8] uppercase font-bold">Tempo (BPM)</span>
                    <button
                      onClick={() => setBpm(projectBpm)}
                      className="text-[9px] text-pink-400 hover:underline cursor-pointer"
                    >
                      Sync ({projectBpm})
                    </button>
                  </div>
                  <input
                    type="number"
                    min={60}
                    max={200}
                    value={bpm}
                    onChange={e => setBpm(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#12182B] border border-[#222B49] text-white font-bold text-xs focus:outline-none focus:border-pink-500 text-center"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-[#7A83A8] uppercase font-bold block mb-1">Musical Key</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <select
                      value={keyRoot}
                      onChange={e => setKeyRoot(e.target.value)}
                      className="px-2 py-1.5 rounded-lg bg-[#12182B] border border-[#222B49] text-white font-bold text-xs focus:outline-none"
                    >
                      {ROOT_KEYS.map(k => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>

                    <select
                      value={scale}
                      onChange={e => setScale(e.target.value as any)}
                      className="px-2 py-1.5 rounded-lg bg-[#12182B] border border-[#222B49] text-white font-bold text-xs focus:outline-none"
                    >
                      {SCALES.map(s => (
                        <option key={s.id} value={s.id}>{s.id.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Stem Layers Checklist */}
            <div className="p-4 rounded-2xl bg-[#0B0F1C] border border-[#1E2642] space-y-2.5">
              <span className="text-[10px] font-bold text-[#8B94B8] uppercase tracking-wider block">
                Multi-Stem Backing Layers to Generate
              </span>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'drums', label: 'Drums & Breaks', color: '#00F0FF' },
                  { id: 'bass', label: 'Bass & Sub 808', color: '#39FF14' },
                  { id: 'pad', label: 'Ambient Pad', color: '#A855F7' },
                  { id: 'lead', label: 'Synth Lead Hook', color: '#FFD700' },
                  { id: 'vocal_chop', label: 'Vocal Chops', color: '#EC4899' }
                ].map(stem => {
                  const isChecked = selectedSongBedStems.includes(stem.id as AceStepStemType);
                  return (
                    <div
                      key={stem.id}
                      onClick={() => {
                        setSelectedSongBedStems(prev =>
                          prev.includes(stem.id as AceStepStemType)
                            ? prev.filter(s => s !== stem.id)
                            : [...prev, stem.id as AceStepStemType]
                        );
                      }}
                      className={`p-2 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-[#151D33] border-white/30 text-white'
                          : 'bg-[#0E1322] border-[#1C253E] text-[#64748B]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stem.color }} />
                        <span className="truncate font-bold text-[11px]">{stem.label}</span>
                      </div>
                      <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 ${
                        isChecked ? 'bg-pink-500 border-pink-500 text-black' : 'border-[#334155]'
                      }`}>
                        {isChecked && <Check size={10} strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Traditional Recording Integration Panel */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-[#0A1612] border border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Traditional Live Recording Integration
                  </span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 font-mono font-bold">
                  ARMED AT BAR 0
                </span>
              </div>

              <p className="text-[10px] text-[#7A988E] leading-relaxed">
                Automatically arms a dedicated tracking channel in the Mixer aligned at Bar 0. Record live guitar, vocals, or external hardware synths directly on top of the Ace-Step AI backing bed.
              </p>

              <div className="space-y-2 pt-1 border-t border-emerald-900/50">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-[11px] text-[#A2C2B5] font-bold">Arm Live Recording Channel</span>
                  <input
                    type="checkbox"
                    checked={includeGuitarOverdub}
                    onChange={e => setIncludeGuitarOverdub(e.target.checked)}
                    className="accent-emerald-400 w-4 h-4 rounded"
                  />
                </label>

                {includeGuitarOverdub && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[9px] text-[#698B7F] block uppercase font-bold">Track Name</span>
                      <input
                        type="text"
                        value={armedTrackName}
                        onChange={e => setArmedTrackName(e.target.value)}
                        className="w-full px-2 py-1 rounded bg-[#0A1812] border border-emerald-700/50 text-white text-[11px] font-bold"
                      />
                    </div>

                    <div>
                      <span className="text-[9px] text-[#698B7F] block uppercase font-bold">Pre-Roll Count-in</span>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => setCountInBars(1)}
                          className={`py-1 rounded text-center text-[10px] font-bold border transition-colors ${
                            countInBars === 1
                              ? 'bg-emerald-900/80 border-emerald-400 text-emerald-200'
                              : 'bg-[#0E1C15] border-emerald-900 text-[#698B7F]'
                          }`}
                        >
                          1 Bar Click
                        </button>
                        <button
                          type="button"
                          onClick={() => setCountInBars(2)}
                          className={`py-1 rounded text-center text-[10px] font-bold border transition-colors ${
                            countInBars === 2
                              ? 'bg-emerald-900/80 border-emerald-400 text-emerald-200'
                              : 'bg-[#0E1C15] border-emerald-900 text-[#698B7F]'
                          }`}
                        >
                          2 Bars Click
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Prompt Specification */}
            <div className="space-y-1.5 flex-1 flex flex-col">
              <label className="text-[10px] text-[#7A83A8] uppercase font-bold flex items-center justify-between">
                <span>Song Bed Prompt & Sonic Vibe</span>
                <button
                  type="button"
                  onClick={() => setIsLoraModalOpen(true)}
                  className="text-pink-400 text-[10px] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Layers className="w-3 h-3" />
                  <span>LoRA Library</span>
                </button>
              </label>

              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={2}
                placeholder="Describe harmonic feel, instrumentation, groove, dynamic arc..."
                className="w-full px-3 py-2 rounded-xl bg-[#0B0F1C] border border-[#212A45] focus:border-pink-500 text-white text-xs leading-relaxed focus:outline-none transition-colors resize-none shadow-inner"
              />
            </div>

            {/* Generate Song Bed Master Button */}
            <button
              onClick={handleGenerateSongBed}
              disabled={isGenerating || selectedSongBedStems.length === 0}
              className="w-full py-3.5 rounded-2xl font-bold text-sm uppercase tracking-wider text-white transition-all flex items-center justify-center gap-2.5 shadow-[0_0_30px_rgba(236,72,153,0.35)] disabled:opacity-50 cursor-pointer active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #EC4899, #8B5CF6, #00F0FF)'
              }}
            >
              {isGenerating ? (
                <>
                  <RotateCw className="w-5 h-5 animate-spin text-white" />
                  <span>Synthesizing {selectedSongBedStems.length} Stems with Ace-Step 1.5...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>GENERATE FULL SONG BED ({selectedSongBedStems.length} STEMS)</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Track-by-Track Alignment Telemetry, Multi-Stem Player & Mixer Sync (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            {/* Top Bar: Multi-Track Audition Transport */}
            <div className="p-4 rounded-2xl bg-[#0B0F1C] border border-[#1E2642] flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleToggleMultiPlay}
                  disabled={!currentSongBed}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 bg-[#172036] hover:bg-[#202C4B] border border-pink-500/50 text-pink-300 transition-colors shadow-[0_0_15px_rgba(236,72,153,0.3)] disabled:opacity-40 cursor-pointer"
                >
                  {isMultiPlaying ? <Pause className="w-4 h-4 fill-pink-300" /> : <Play className="w-4 h-4 fill-pink-300" />}
                  <span>{isMultiPlaying ? 'PAUSE ALL STEMS' : 'PLAY ALL STEMS IN SYNC'}</span>
                </button>

                <div>
                  <span className="text-xs font-bold text-white block">
                    {currentSongBed ? currentSongBed.title : 'Ready to Synthesize Song Bed'}
                  </span>
                  <span className="text-[10px] text-[#7A83A8]">
                    {currentSongBed 
                      ? `${currentSongBed.totalBars} Bars • ${currentSongBed.bpm} BPM • ${currentSongBed.key} • ${currentSongBed.durationSeconds}s`
                      : `${songBedBars} Bars • ${bpm} BPM • ${keyRoot} ${scale}`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2.5 py-1 rounded-lg bg-pink-950/80 text-pink-300 border border-pink-500/40 font-mono font-bold">
                  ALIGNED AT BAR 0
                </span>
                <span className="text-[10px] px-2.5 py-1 rounded-lg bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 font-mono font-bold">
                  ZERO AUDIO DRIFT
                </span>
              </div>
            </div>

            {/* Track-by-Track Alignment Rack */}
            <div className="p-4 rounded-2xl bg-[#0B0F1C] border border-[#1E2642] flex-1 flex flex-col justify-between shadow-lg min-h-[360px] space-y-3">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#18233C]">
                  <span className="text-[11px] font-bold text-[#9DA7CB] uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-pink-400" />
                    <span>Track-by-Track Mixer Lineup ({currentSongBed ? currentSongBed.stems.length + (includeGuitarOverdub ? 1 : 0) : selectedSongBedStems.length + (includeGuitarOverdub ? 1 : 0)} Channels)</span>
                  </span>
                  <span className="text-[10px] text-[#697298]">Synchronized Timeline Lanes</span>
                </div>

                {/* Stems Rack List */}
                <div className="space-y-2 mt-3 max-h-[320px] overflow-y-auto pr-1">
                  {currentSongBed ? (
                    currentSongBed.stems.map((stem, idx) => {
                      const isMuted = mutedStemIds.includes(stem.id);
                      const isSoloed = soloedStemIds.includes(stem.id);
                      const currentVol = stemVolumes[stem.id] ?? 0.85;

                      return (
                        <div
                          key={stem.id}
                          className="p-2.5 rounded-xl bg-[#070A14] border border-[#18223B] hover:border-pink-500/40 transition-all flex items-center justify-between gap-3 text-xs"
                        >
                          {/* Channel Badge & Name */}
                          <div className="flex items-center gap-2.5 w-44 truncate">
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#12182B] text-[#7A83A8] font-bold">
                              CH {String(idx + 1).padStart(2, '0')}
                            </span>
                            <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: stem.color }} />
                            <span className="font-bold text-white truncate text-[11px]" title={stem.name}>
                              {stem.name}
                            </span>
                          </div>

                          {/* Mini Waveform Display */}
                          <div className="flex-1 h-6 bg-[#03060C] rounded-lg px-1 flex items-center justify-between gap-0.5 overflow-hidden">
                            {stem.waveformSnippet.slice(0, 24).map((p, pIdx) => (
                              <div
                                key={pIdx}
                                className="flex-1 rounded-full transition-all"
                                style={{
                                  height: `${Math.max(12, p * 100)}%`,
                                  backgroundColor: stem.color,
                                  opacity: isMuted ? 0.2 : isMultiPlaying ? 0.9 : 0.6
                                }}
                              />
                            ))}
                          </div>

                          {/* Controls: Solo, Mute, Fader */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleToggleStemSolo(stem.id)}
                              className={`w-6 h-6 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                isSoloed
                                  ? 'bg-amber-400 text-black border-amber-300'
                                  : 'bg-[#101524] text-[#697298] border-[#1C253E] hover:text-white'
                              }`}
                              title="Solo Stem"
                            >
                              S
                            </button>

                            <button
                              onClick={() => handleToggleStemMute(stem.id)}
                              className={`w-6 h-6 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                isMuted
                                  ? 'bg-red-500 text-white border-red-400'
                                  : 'bg-[#101524] text-[#697298] border-[#1C253E] hover:text-white'
                              }`}
                              title="Mute Stem"
                            >
                              M
                            </button>

                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={currentVol}
                              onChange={e => handleSetStemVolume(stem.id, Number(e.target.value))}
                              className="w-16 accent-pink-400 h-1"
                              title={`Volume: ${Math.round(currentVol * 100)}%`}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    /* Pre-Flight Preview of Planned Stems */
                    <div className="space-y-1.5">
                      {selectedSongBedStems.map((s, idx) => {
                        const opt = STEM_OPTIONS.find(o => o.id === s);
                        const color = STEM_COLORS[s];
                        return (
                          <div
                            key={s}
                            className="p-2.5 rounded-xl bg-[#070A14] border border-dashed border-[#18223B] flex items-center justify-between text-xs opacity-75"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#12182B] text-[#7A83A8] font-bold">
                                CH {String(idx + 1).padStart(2, '0')}
                              </span>
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                              <span className="font-bold text-[#A4B1D6]">{opt?.label || s}</span>
                            </div>
                            <span className="text-[10px] text-[#5A6488] font-mono">
                              Waiting to synthesize ({songBedBars} Bars @ {bpm} BPM)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Armed Live Recording Channel (Track 6) */}
                  {includeGuitarOverdub && (
                    <div className="p-2.5 rounded-xl bg-gradient-to-r from-red-950/30 to-[#120B0B] border border-red-500/40 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-950 text-red-300 font-bold border border-red-700/60">
                          REC CH
                        </span>
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
                        <span className="font-black text-red-200 truncate text-[11px]">
                          {armedTrackName}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-red-300 font-mono">
                        <span className="px-2 py-0.5 rounded bg-red-950/80 border border-red-500/40 font-bold">
                          ● ARMED FOR TRACKING
                        </span>
                        <span className="hidden sm:inline text-[#895E5E]">
                          Line input ready @ Bar 0
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Master Sync & Line Up to Mixer CTA Banner */}
              <div className="pt-3 border-t border-[#1C233B]">
                <button
                  onClick={handleExportSongBedToMixer}
                  disabled={isGenerating}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 hover:from-emerald-400 hover:to-cyan-300 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(16,185,129,0.45)] transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Layers className="w-5 h-5 text-black" />
                  <span>SYNC & LINE UP ALL TRACKS INTO MIXER AT BAR 0</span>
                  <ArrowRight className="w-5 h-5 text-black" />
                </button>
                <p className="text-[10px] text-center text-[#7F8DAF] mt-2">
                  Automatically maps each stem to discrete Mixer channels with correct panning, colors, and armed live tracking lane.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LoRA Lending Library Modal */}
      <AceStepLoraLibraryModal
        isOpen={isLoraModalOpen}
        onClose={() => setIsLoraModalOpen(false)}
        currentPrompt={prompt}
        onApplyPromptWithLoras={(updatedPrompt) => {
          setPrompt(updatedPrompt);
          showToast('Injected active LoRA triggers into prompt!');
        }}
      />
    </div>
  );
};

export default AceStepLoopDesigner;
