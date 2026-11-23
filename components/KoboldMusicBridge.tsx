import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  X, 
  Play, 
  Pause, 
  Download, 
  ArrowRight, 
  Sparkles, 
  Sliders, 
  RefreshCw, 
  Check, 
  Layers, 
  Music, 
  Activity, 
  Radio, 
  Disc, 
  Dices, 
  FolderPlus, 
  ExternalLink,
  Cpu
} from 'lucide-react';
import { playLaserBeamSound } from '../lib/laserSound';

export interface MusicPlan {
  bpm: number;
  keyscale: string;
  timesignature: string;
  tags: string;
  structure?: string[];
  notes?: string;
}

export interface KoboldMusicBridgeProps {
  isOpen: boolean;
  onClose: () => void;
  defaultUrl?: string;
  onAudioGenerated?: (audioUrl: string, title: string, blob?: Blob) => void;
  onSendToStemSplitter?: (audioUrl: string, title: string, blob?: Blob) => void;
}

const STORAGE_KEY_URL = 'strangelet_kobold_music_bridge_url';
const DEFAULT_URL = 'http://localhost:5001';

const PRESET_STYLES = [
  { label: 'Lo-Fi Tape Indie', tags: '1990s lo-fi indie rock, analog 4-track tape, baritone vocals, warm vintage flutter' },
  { label: 'Darkwave Cyberpunk', tags: 'Darkwave cyberpunk synth, analog Moog bassline, industrial drum machine, 124 BPM' },
  { label: 'Lynchian Ambient', tags: 'David Lynchian noir ambient, twin peaks electric guitar, deep analog drone, tape hiss' },
  { label: 'Occult Psychedelic', tags: '1960s occult garage psychedelic rock, fuzz organ, theremin, hypnotic groove' },
  { label: 'Heavy Particle Trip-Hop', tags: 'Sub-bass trip hop, vinyl crackle, broken jazz breakbeats, hypnotic female vocals' }
];

const DEFAULT_LYRICS = `[Verse 1]
Static hums across the vacuum tube
Shadows bend in the particle loop
Signals drifting through the wire
Catching sparks from neon fire

[Chorus]
Take me back to the zero zone
Echoes calling through the microphone
Strangelet collider spinning round
Lost inside the sacred sound

[Instrumental]
[Outro]
Fading into the noise`;

export const KoboldMusicBridge: React.FC<KoboldMusicBridgeProps> = ({
  isOpen,
  onClose,
  defaultUrl = DEFAULT_URL,
  onAudioGenerated,
  onSendToStemSplitter
}) => {
  // Server URL
  const [serverUrl, setServerUrl] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_URL) || defaultUrl;
  });
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState<string>('');

  // Generation Inputs
  const [engine, setEngine] = useState<'ACE-Step 1.5' | 'YuE2'>('ACE-Step 1.5');
  const [styleTags, setStyleTags] = useState<string>(PRESET_STYLES[0].tags);
  const [lyrics, setLyrics] = useState<string>(DEFAULT_LYRICS);
  const [duration, setDuration] = useState<number>(60); // 15 to 240 seconds
  const [seed, setSeed] = useState<number>(-1);

  // Step 1: Prepared Plan State
  const [isPreparing, setIsPreparing] = useState<boolean>(false);
  const [planPrepared, setPlanPrepared] = useState<boolean>(false);
  const [planBpm, setPlanBpm] = useState<number>(116);
  const [planKeyScale, setPlanKeyScale] = useState<string>('D minor');
  const [planTimeSignature, setPlanTimeSignature] = useState<string>('4/4');
  const [planRefinedTags, setPlanRefinedTags] = useState<string>('');
  const [step1Error, setStep1Error] = useState<string | null>(null);

  // Step 2: Generation Result State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const [step2Error, setStep2Error] = useState<string | null>(null);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [generatedAudioBlob, setGeneratedAudioBlob] = useState<Blob | null>(null);
  const [generatedTitle, setGeneratedTitle] = useState<string>('');

  // Audio Playback
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Persist URL
  const handleUrlChange = (url: string) => {
    setServerUrl(url);
    localStorage.setItem(STORAGE_KEY_URL, url);
  };

  // Test Server Ping
  const testConnection = async () => {
    setConnectionStatus('testing');
    setConnectionMessage('Pinging server endpoint...');
    const cleanUrl = serverUrl.replace(/\/+$/, '');
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      const res = await fetch(`${cleanUrl}/api/v1/model`, {
        method: 'GET',
        signal: controller.signal
      }).catch(async () => {
        // Fallback check to root or version
        return await fetch(`${cleanUrl}/api/extra/version`, { signal: controller.signal });
      });

      clearTimeout(timeoutId);

      if (res && (res.ok || res.status === 200 || res.status === 404)) {
        setConnectionStatus('connected');
        setConnectionMessage('Connected to KoboldCpp REST API');
      } else {
        setConnectionStatus('connected');
        setConnectionMessage(`Server reachable (HTTP ${res.status})`);
      }
    } catch (e: any) {
      setConnectionStatus('error');
      setConnectionMessage(e.name === 'AbortError' ? 'Connection timed out' : 'Server offline or CORS blocked');
    }
  };

  // Step 1: Prepare Music Plan
  const handlePreparePlan = async () => {
    setIsPreparing(true);
    setStep1Error(null);
    playLaserBeamSound('laser_select');

    const cleanUrl = serverUrl.replace(/\/+$/, '');
    const endpoint = `${cleanUrl}/api/extra/music/prepare`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: styleTags,
          lyrics: lyrics,
          duration: duration,
          engine: engine,
          seed: seed
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      setPlanBpm(Number(data.bpm) || 120);
      setPlanKeyScale(data.keyscale || data.key || 'D minor');
      setPlanTimeSignature(data.timesignature || data.time_signature || '4/4');
      setPlanRefinedTags(data.tags || data.refined_tags || styleTags);
      setPlanPrepared(true);
      playLaserBeamSound('laser_select');
    } catch (err: any) {
      console.warn('KoboldCpp music prepare endpoint error or offline fallback:', err);
      // Heuristic plan fallback so user can still review/tweak plan if server lacks /api/extra/music/prepare
      const detectedBpm = styleTags.match(/(\d{2,3})\s*bpm/i)?.[1];
      setPlanBpm(detectedBpm ? parseInt(detectedBpm, 10) : 118);
      setPlanKeyScale('D minor (432Hz Occult Standard)');
      setPlanTimeSignature('4/4');
      setPlanRefinedTags(`${styleTags}, tape-saturated, high-energy particle acoustics, master stem balance`);
      setPlanPrepared(true);
      setStep1Error(`Note: ${err.message || 'Direct endpoint unreachable'}. Heuristic plan loaded below for review.`);
    } finally {
      setIsPreparing(false);
    }
  };

  // Step 2: Generate Track
  const handleGenerateTrack = async () => {
    setIsGenerating(true);
    setStep2Error(null);
    setGenerationProgress('Sending parameters to KoboldCpp audio generation engine...');
    playLaserBeamSound('laser_audio');

    const cleanUrl = serverUrl.replace(/\/+$/, '');
    const endpoint = `${cleanUrl}/api/extra/music/generate`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: planRefinedTags || styleTags,
          lyrics: lyrics,
          duration: duration,
          engine: engine,
          seed: seed,
          bpm: planBpm,
          keyscale: planKeyScale,
          timesignature: planTimeSignature
        })
      });

      if (!response.ok) {
        throw new Error(`Generation failed with HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      let blob: Blob;

      if (contentType.includes('application/json')) {
        const json = await response.json();
        if (json.audio) {
          // Decode Base64 string to Blob
          const binary = atob(json.audio.replace(/^data:audio\/\w+;base64,/, ''));
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          const mime = json.format === 'mp3' ? 'audio/mpeg' : 'audio/wav';
          blob = new Blob([bytes], { type: mime });
        } else {
          throw new Error(json.error || 'Server did not return audio data');
        }
      } else {
        // Direct binary audio response (audio/wav or audio/mpeg)
        blob = await response.blob();
      }

      if (blob.size < 100) {
        throw new Error('Received audio stream was empty or corrupt.');
      }

      const url = URL.createObjectURL(blob);
      const title = `Kobold_${engine.replace(/\s+/g, '')}_${planBpm}BPM_${Date.now().toString().slice(-4)}`;

      setGeneratedAudioBlob(blob);
      setGeneratedAudioUrl(url);
      setGeneratedTitle(title);
      setGenerationProgress('Audio generation complete!');
      playLaserBeamSound('laser_midi');
    } catch (err: any) {
      console.error('Track generation error:', err);
      setStep2Error(err.message || 'Generation failed. Verify KoboldCpp is running with music model.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle inline audio playback
  const handleTogglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(e => console.error('Audio playback error:', e));
    }
  };

  // Download Generated Track
  const handleDownload = () => {
    if (!generatedAudioUrl) return;
    const a = document.createElement('a');
    a.href = generatedAudioUrl;
    a.download = `${generatedTitle || 'Strangelet_Kobold_Track'}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Send to Timeline
  const handleSendToTimeline = () => {
    if (!generatedAudioUrl) return;
    if (onAudioGenerated) {
      onAudioGenerated(generatedAudioUrl, generatedTitle, generatedAudioBlob || undefined);
    }
    onClose();
  };

  // Send to Stem Splitter
  const handleSendToStemSplitter = () => {
    if (!generatedAudioUrl) return;
    if (onSendToStemSplitter) {
      onSendToStemSplitter(generatedAudioUrl, generatedTitle, generatedAudioBlob || undefined);
    }
    onClose();
  };

  // Quick lyrics tag inserter
  const insertLyricTag = (tag: string) => {
    setLyrics(prev => prev ? `${prev}\n\n${tag}\n` : `${tag}\n`);
  };

  // Randomize seed
  const randomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 9999999) + 1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9990] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in select-none">
      <div 
        className="relative w-full max-w-4xl bg-[#0C0D14] border border-[#2A2E44] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#141624] via-[#10121D] to-[#141624] border-b border-[#25293E] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1A1E30] border border-amber-500/50 flex items-center justify-center text-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.25)]">
              <Zap size={22} className="fill-[#FFD700]/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white font-mono tracking-wide">
                  KOBOLD AUDIO BRIDGE
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-[#FFD700] border border-amber-500/40">
                  REST v1.0
                </span>
              </div>
              <p className="text-[11px] text-[#8E99B8] font-mono">
                Two-Step AI Music Generation • KoboldCpp Neural Connector
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#1A1D2D] hover:bg-[#282D46] text-[#888] hover:text-white border border-[#2D334E] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-[#CCD]">
          {/* Server URL & Status Bar */}
          <div className="p-4 rounded-xl bg-[#121420] border border-[#22273D] space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-[11px] font-mono text-[#8E99B8] uppercase font-bold shrink-0">
                  KoboldCpp Server:
                </span>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="http://localhost:5001"
                  className="flex-1 min-w-[200px] px-3 py-1.5 bg-[#0A0B12] border border-[#2B3250] rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#FFD700] transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={testConnection}
                  disabled={connectionStatus === 'testing'}
                  className="px-3 py-1.5 rounded-lg bg-[#1B2035] hover:bg-[#262D4A] border border-[#30395C] text-[#B0BEE6] hover:text-white font-mono text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw size={12} className={connectionStatus === 'testing' ? 'animate-spin text-[#FFD700]' : ''} />
                  <span>Test Connection</span>
                </button>

                {connectionStatus === 'connected' && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 font-mono text-[10px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>ONLINE</span>
                  </span>
                )}
                {connectionStatus === 'error' && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-950/60 border border-red-500/50 text-red-400 font-mono text-[10px]">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    <span>UNREACHABLE</span>
                  </span>
                )}
              </div>
            </div>

            {connectionMessage && (
              <p className="text-[10px] font-mono text-[#7E8BAE] pl-1">
                {connectionMessage}
              </p>
            )}
          </div>

          {/* Core Configuration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left Column: Style Tags & Presets */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-mono uppercase font-bold text-[#E0E6FA] flex items-center gap-1.5">
                    <Music size={13} className="text-[#FFD700]" />
                    <span>Genre / Style Tags</span>
                  </label>
                  <span className="text-[10px] text-[#7E8BAE] font-mono">Descriptors & Mood</span>
                </div>
                <textarea
                  rows={3}
                  value={styleTags}
                  onChange={(e) => setStyleTags(e.target.value)}
                  placeholder="e.g., 1990s lo-fi indie rock, analog 4-track tape, baritone vocals, nostalgic tape hiss"
                  className="w-full p-3 bg-[#0E101A] border border-[#252B44] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#FFD700] transition-colors resize-none leading-relaxed"
                />
              </div>

              {/* Style Tag Presets */}
              <div>
                <span className="text-[10px] font-mono text-[#8E99B8] uppercase block mb-1.5">
                  Quick Style Recipes:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_STYLES.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setStyleTags(preset.tags)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-mono transition-colors border ${
                        styleTags === preset.tags
                          ? 'bg-[#FFD700]/20 border-[#FFD700] text-[#FFD700] font-bold'
                          : 'bg-[#141726] border-[#22283E] text-[#9AA5C4] hover:text-white hover:bg-[#1C2034]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Engine Selector & Duration / Seed */}
              <div className="p-4 rounded-xl bg-[#10121D] border border-[#20253A] space-y-4">
                {/* Engine Selector */}
                <div>
                  <label className="text-[10px] font-mono uppercase font-bold text-[#8E99B8] block mb-2">
                    Neural Audio Engine:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['ACE-Step 1.5', 'YuE2'] as const).map((eng) => (
                      <button
                        key={eng}
                        onClick={() => setEngine(eng)}
                        className={`p-2.5 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                          engine === eng
                            ? 'bg-[#FFD700]/15 border-[#FFD700] text-[#FFD700] font-bold shadow-[0_0_15px_rgba(255,215,0,0.15)]'
                            : 'bg-[#151928] border-[#252D48] text-[#8E99B8] hover:text-white'
                        }`}
                      >
                        <span className="text-xs font-mono">{eng}</span>
                        <span className="text-[9px] font-mono opacity-70">
                          {eng === 'ACE-Step 1.5' ? 'Bar-Synced Loop Diffusion' : 'Full Song Dual-Track Diffusion'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration Slider */}
                <div>
                  <div className="flex items-center justify-between mb-1 text-[11px] font-mono">
                    <span className="text-[#8E99B8] uppercase">Duration:</span>
                    <span className="text-[#FFD700] font-bold">{duration}s ({Math.floor(duration / 60)}m {duration % 60}s)</span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={240}
                    step={5}
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                    className="w-full accent-[#FFD700] bg-[#1E243A] h-1.5 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-[#666] font-mono mt-0.5">
                    <span>15s (Clip)</span>
                    <span>60s (Standard)</span>
                    <span>120s (Extended)</span>
                    <span>240s (Full 4m)</span>
                  </div>
                </div>

                {/* Seed Input */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-mono text-[#8E99B8] uppercase">Seed:</label>
                    <input
                      type="number"
                      value={seed}
                      onChange={(e) => setSeed(parseInt(e.target.value, 10) || -1)}
                      className="w-28 px-2.5 py-1 bg-[#090A10] border border-[#2B3250] rounded text-white font-mono text-xs focus:outline-none focus:border-[#FFD700]"
                    />
                  </div>
                  <button
                    onClick={randomizeSeed}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1A1F33] hover:bg-[#252C48] border border-[#2D3658] rounded text-[#B0BEE6] hover:text-white font-mono text-[10px] transition-colors cursor-pointer"
                  >
                    <Dices size={12} className="text-[#FFD700]" />
                    <span>Randomize</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Multi-Line Lyrics Input */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono uppercase font-bold text-[#E0E6FA] flex items-center gap-1.5">
                  <Activity size={13} className="text-[#FFD700]" />
                  <span>Song Lyrics & Section Tags</span>
                </label>
                <span className="text-[10px] text-[#7E8BAE] font-mono">Format with [Verse], [Chorus]</span>
              </div>

              {/* Tag Quick Inserters */}
              <div className="flex items-center gap-1.5">
                {(['[Verse]', '[Chorus]', '[Bridge]', '[Instrumental]', '[Outro]'] as const).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => insertLyricTag(tag)}
                    className="px-2 py-0.5 rounded bg-[#171A2A] hover:bg-[#22273D] border border-[#282F4B] text-[10px] font-mono text-[#8E99B8] hover:text-[#FFD700] transition-colors"
                  >
                    +{tag}
                  </button>
                ))}
              </div>

              <textarea
                rows={12}
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder="Enter song lyrics structured with section tags..."
                className="flex-1 w-full p-3.5 bg-[#0E101A] border border-[#252B44] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#FFD700] transition-colors leading-relaxed resize-none"
              />
            </div>
          </div>

          {/* Step 1: Preparation Action & Plan Confirmation */}
          <div className="p-5 rounded-xl bg-gradient-to-r from-[#121524] to-[#0E101C] border border-[#272D46] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#FFD700] text-black text-[11px] font-extrabold">1</span>
                  <span>STEP 1: PREPARE MUSIC PLAN</span>
                </h3>
                <p className="text-[11px] text-[#8E99B8] font-mono mt-0.5">
                  Queries <code className="text-[#FFD700]">/api/extra/music/prepare</code> to compute BPM, key scale, and refined musical tags.
                </p>
              </div>

              <button
                onClick={handlePreparePlan}
                disabled={isPreparing}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-[#FFD700] hover:from-amber-400 hover:to-[#FFE44D] text-black font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,215,0,0.25)] transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isPreparing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>PREPARING PLAN...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>PREPARE PLAN</span>
                  </>
                )}
              </button>
            </div>

            {step1Error && (
              <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/40 text-amber-300 font-mono text-[11px]">
                {step1Error}
              </div>
            )}

            {/* Editable Plan Parameters Display */}
            {planPrepared && (
              <div className="p-4 rounded-xl bg-[#090A10] border border-[#2F3758] space-y-3 animate-fade-in">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FFD700] border-b border-[#20263C] pb-2">
                  <Check size={14} className="text-emerald-400" />
                  <span>PREPARED PLAN READY FOR REVIEW (EDITABLE)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-[#8E99B8] block mb-1">
                      Tempo (BPM):
                    </label>
                    <input
                      type="number"
                      value={planBpm}
                      onChange={(e) => setPlanBpm(parseInt(e.target.value, 10) || 120)}
                      className="w-full px-3 py-1.5 bg-[#121422] border border-[#2B3352] rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#FFD700]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-[#8E99B8] block mb-1">
                      Key / Scale:
                    </label>
                    <input
                      type="text"
                      value={planKeyScale}
                      onChange={(e) => setPlanKeyScale(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#121422] border border-[#2B3352] rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#FFD700]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-[#8E99B8] block mb-1">
                      Time Signature:
                    </label>
                    <input
                      type="text"
                      value={planTimeSignature}
                      onChange={(e) => setPlanTimeSignature(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#121422] border border-[#2B3352] rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#FFD700]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-[#8E99B8] block mb-1">
                    Refined Style & Instrument Tags:
                  </label>
                  <textarea
                    rows={2}
                    value={planRefinedTags}
                    onChange={(e) => setPlanRefinedTags(e.target.value)}
                    className="w-full p-2.5 bg-[#121422] border border-[#2B3352] rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#FFD700] resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Generation Execution & Audio Output */}
          <div className="p-5 rounded-xl bg-gradient-to-r from-[#121524] to-[#0E101C] border border-[#272D46] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#00F0FF] text-black text-[11px] font-extrabold">2</span>
                  <span>STEP 2: GENERATE TRACK</span>
                </h3>
                <p className="text-[11px] text-[#8E99B8] font-mono mt-0.5">
                  Sends confirmed plan to <code className="text-[#00F0FF]">/api/extra/music/generate</code> for neural rendering.
                </p>
              </div>

              <button
                onClick={handleGenerateTrack}
                disabled={isGenerating || !planPrepared}
                className={`px-6 py-2.5 rounded-xl font-mono font-bold text-xs flex items-center justify-center gap-2 transition-all transform active:scale-95 cursor-pointer ${
                  planPrepared
                    ? 'bg-gradient-to-r from-cyan-500 to-[#00F0FF] hover:from-cyan-400 hover:to-[#55F7FF] text-black shadow-[0_0_20px_rgba(0,240,255,0.3)]'
                    : 'bg-[#1D2132] text-[#666] border border-[#2E3550] cursor-not-allowed opacity-60'
                }`}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={14} className="animate-spin text-black" />
                    <span>RENDERING TRACK...</span>
                  </>
                ) : (
                  <>
                    <Disc size={14} className={planPrepared ? 'text-black' : ''} />
                    <span>GENERATE TRACK</span>
                  </>
                )}
              </button>
            </div>

            {generationProgress && (
              <p className="text-[11px] font-mono text-cyan-300 animate-pulse pl-1">
                ⚡ {generationProgress}
              </p>
            )}

            {step2Error && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/50 text-red-300 font-mono text-[11px]">
                {step2Error}
              </div>
            )}

            {/* Audio Preview & Workspace Ingestion Toolbar */}
            {generatedAudioUrl && (
              <div className="p-4 rounded-xl bg-[#090B14] border border-[#00F0FF]/40 space-y-4 animate-fade-in shadow-[0_0_25px_rgba(0,240,255,0.15)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E253E] pb-3">
                  <div>
                    <span className="text-[10px] font-mono text-[#7E8BAE] uppercase">Generated Master Audio:</span>
                    <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                      <Music size={15} className="text-[#00F0FF]" />
                      <span>{generatedTitle || 'Strangelet_Generated_Master.wav'}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
                        {planBpm} BPM • {planKeyScale}
                      </span>
                    </h4>
                  </div>

                  <audio
                    ref={audioRef}
                    src={generatedAudioUrl}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />

                  {/* Playback & Download Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleTogglePlay}
                      className="px-4 py-2 rounded-lg bg-[#182035] hover:bg-[#202C48] border border-[#00F0FF]/40 text-[#00F0FF] font-mono text-xs flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                      <span>{isPlaying ? 'PAUSE' : 'PREVIEW'}</span>
                    </button>

                    <button
                      onClick={handleDownload}
                      className="px-3.5 py-2 rounded-lg bg-[#181D2E] hover:bg-[#242C46] border border-[#2E3758] text-[#AAA] hover:text-white font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Download master audio file"
                    >
                      <Download size={14} />
                      <span>DOWNLOAD</span>
                    </button>
                  </div>
                </div>

                {/* Direct DAW Integration Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-1">
                  <span className="text-[11px] font-mono text-[#8E99B8] sm:mr-auto">
                    Transfer finished audio directly into Strangelet Lab:
                  </span>

                  {onSendToStemSplitter && (
                    <button
                      onClick={handleSendToStemSplitter}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#1B2238] hover:bg-[#242E4D] border border-cyan-500/50 text-cyan-300 font-mono font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.15)]"
                    >
                      <Layers size={14} className="text-cyan-400" />
                      <span>SEND TO STEM SPLITTER</span>
                    </button>
                  )}

                  {onAudioGenerated && (
                    <button
                      onClick={handleSendToTimeline}
                      className="w-full sm:w-auto px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-[#FFD700] hover:from-amber-400 hover:to-[#FFE44D] text-black font-mono font-extrabold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all cursor-pointer"
                    >
                      <FolderPlus size={15} />
                      <span>ADD TO TIMELINE MIXER</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-[#0B0C14] border-t border-[#1C2032] flex items-center justify-between text-[10px] font-mono text-[#6A7596] shrink-0">
          <span>KoboldCpp Extra Music REST API • Offline-First Quantum Collider</span>
          <span>Strangelet Lab v2.5 Beta</span>
        </div>
      </div>
    </div>
  );
};

export default KoboldMusicBridge;
