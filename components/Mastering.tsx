import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Zap, 
  Settings2, 
  Upload, 
  Info, 
  Radio, 
  Activity, 
  BarChart3, 
  Waves, 
  ShieldCheck,
  Headphones,
  Volume2,
  VolumeX,
  FolderOpen
} from 'lucide-react';
import ImportArea from './ImportArea';
import BigKnob from './BigKnob';
import { SunoMasteringStudio } from './SunoMasteringStudio';
import { SpectralAnalyzer } from './SpectralAnalyzer';
import { GoldPath } from './GoldPath';
import { 
  loadAllGoldPathPresets, 
  GoldPathPreset, 
  STORAGE_KEY_ACTIVE_PRESET_ID, 
  syncGoldPathToMasterBus 
} from '../lib/goldPathPresets';
import { masterAudioBus } from '../lib/masterBus';
import { playLaserBeamSound } from '../lib/laserSound';

export const Mastering: React.FC = () => {
  const [masteringMode, setMasteringMode] = useState<'spectral_analyzer' | 'suno_desheen' | 'pipeline'>('pipeline');
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isBypassed, setIsBypassed] = useState<boolean>(masterAudioBus.isMasteringBypassed());
  
  // Gold Path Presets Synchronization
  const [goldPathPresets, setGoldPathPresets] = useState<GoldPathPreset[]>(() => loadAllGoldPathPresets());
  const [activeGoldPresetId, setActiveGoldPresetId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY_ACTIVE_PRESET_ID) || 'factory-gp-audiophile';
    }
    return 'factory-gp-audiophile';
  });

  const activeGoldPreset = goldPathPresets.find(p => p.id === activeGoldPresetId) || goldPathPresets[0];

  const handleQuickLoadPreset = (presetId: string) => {
    const selected = goldPathPresets.find(p => p.id === presetId);
    if (!selected) return;
    setActiveGoldPresetId(selected.id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_ACTIVE_PRESET_ID, selected.id);
    }
    syncGoldPathToMasterBus(selected);
    playLaserBeamSound('laser_select');
  };

  const [settings, setSettings] = useState({
    matchering: true,
    multiband: true,
    limiter: true,
    vst: false,
    spectralAnalysis: true,
    batchProcessing: false
  });
  const [bigKnobValue, setBigKnobValue] = useState(0.5);

  // Synchronize bypass state with Master Audio Bus
  useEffect(() => {
    const unsub = masterAudioBus.subscribeMasteringBypass(bypassed => {
      setIsBypassed(bypassed);
    });
    return unsub;
  }, []);

  // Keyboard shortcut 'B' for instant A/B bypass auditioning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        handleToggleBypass();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleBypass = () => {
    const next = masterAudioBus.toggleMasteringBypass();
    playLaserBeamSound(next ? 'laser_erase' : 'laser_audio');
  };

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReferenceFile(e.target.files[0]);
    }
  };

  return (
    <div className="h-full p-4 lg:p-7 flex flex-col gap-5 animate-fade-in overflow-y-auto bg-[#05050A]">
      {/* View Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl lg:text-2xl font-bold text-white tracking-tight flex items-center gap-3 font-mono">
              <Sparkles className="text-[#FFD700]" />
              PARAMETRIC EQ & MASTERING SUITE
            </h2>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono border bg-[#111322] border-[#222744]">
              <span className={`w-2 h-2 rounded-full ${isBypassed ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
              <span className={isBypassed ? 'text-amber-300 font-semibold' : 'text-emerald-300 font-semibold'}>
                {isBypassed ? 'RAW UNPROCESSED (BYPASS ACTIVE)' : 'AI-MASTERED DSP ACTIVE'}
              </span>
            </div>
          </div>
          <p className="text-xs lg:text-sm text-[#A0A0A0]">
            Dynamic frequency cut-off points, real-time D3 spectral analysis, and neural AI audio enhancement.
          </p>
        </div>

        {/* Master Toolbar: Dedicated A/B Bypass Button & Tab Switch */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Dedicated A/B Bypass Button */}
          <button
            id="mastering-panel-bypass-toggle-btn"
            onClick={handleToggleBypass}
            className={`relative px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-3 transition-all border shadow-lg cursor-pointer select-none ${
              isBypassed
                ? 'bg-gradient-to-r from-amber-950/80 to-orange-950/80 hover:from-amber-900 hover:to-orange-900 border-amber-500/70 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                : 'bg-gradient-to-r from-[#121626] to-[#1B2138] hover:from-[#171C32] hover:to-[#222946] border-emerald-500/50 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.18)]'
            }`}
            title={
              isBypassed
                ? 'Currently listening to RAW UNPROCESSED AUDIO. Click or press [B] to hear the AI-Mastered result.'
                : 'Currently listening to the AI-MASTERED RESULT. Click or press [B] to bypass and hear the original raw audio.'
            }
          >
            {/* LED Status Indicator */}
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isBypassed ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isBypassed ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              />
            </span>

            <div className="flex flex-col items-start leading-tight text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#8E94B4] font-semibold">A/B COMPARE:</span>
                <span className={`text-xs font-mono font-black tracking-wider ${
                  isBypassed ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {isBypassed ? 'BYPASS [ON]' : 'AI MASTER [ON]'}
                </span>
              </div>
              <span className="text-[9px] text-[#A0A0A0] font-normal tracking-tight">
                {isBypassed ? 'Listening to: Raw Original Audio' : 'Listening to: AI-Mastered Result'}
              </span>
            </div>

            <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-bold bg-[#0A0C16] text-[#7B82A6] rounded border border-[#252A42] ml-1">
              B
            </kbd>
          </button>

          {/* Tab switch */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#121422] border border-[#232742]">
          <button
            onClick={() => setMasteringMode('pipeline')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-2 transition-all ${
              masteringMode === 'pipeline'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-[0_0_15px_rgba(255,215,0,0.4)] font-bold'
                : 'text-[#7B82A6] hover:text-white hover:bg-[#1A1E2F]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gold Path Mastering Chain</span>
          </button>

          <button
            onClick={() => setMasteringMode('spectral_analyzer')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-2 transition-all ${
              masteringMode === 'spectral_analyzer'
                ? 'bg-[#FFD700] text-black shadow-[0_0_15px_rgba(255,215,0,0.4)]'
                : 'text-[#7B82A6] hover:text-white hover:bg-[#1A1E2F]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Parametric EQ & Spectral</span>
          </button>

          <button
            onClick={() => setMasteringMode('suno_desheen')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-2 transition-all ${
              masteringMode === 'suno_desheen'
                ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.35)]'
                : 'text-[#7B82A6] hover:text-white hover:bg-[#1A1E2F]'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-cyan-300" />
            <span>Suno AI De-Sheen</span>
          </button>
        </div>
      </div>
    </div>

      {/* Global Gold Path Preset Strip across Mastering */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[#090C19] border border-[#1F2744] text-xs font-mono shadow-md">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[10px] font-bold text-amber-400 uppercase flex items-center gap-1">
            <Sparkles size={12} className="text-[#FFD700]" />
            GOLD PATH PRESET:
          </span>
          <select
            value={activeGoldPresetId}
            onChange={(e) => {
              handleQuickLoadPreset(e.target.value);
              setGoldPathPresets(loadAllGoldPathPresets());
            }}
            className="bg-[#050711] border border-[#232F52] text-amber-300 font-bold text-xs rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer max-w-xs truncate"
          >
            <optgroup label="FACTORY GOLD PATH PRESETS">
              {goldPathPresets.filter(p => p.category === 'Factory').map(p => (
                <option key={p.id} value={p.id} className="bg-[#0A0D1E] text-white">
                  {p.name}
                </option>
              ))}
            </optgroup>
            {goldPathPresets.some(p => p.category === 'User') && (
              <optgroup label="USER CUSTOM PRESETS">
                {goldPathPresets.filter(p => p.category === 'User').map(p => (
                  <option key={p.id} value={p.id} className="bg-[#0A0D1E] text-cyan-300">
                    ⭐ {p.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <span className="text-[11px] text-[#7E88AA] hidden sm:inline">
            Target: <strong className="text-emerald-300">{activeGoldPreset?.parameters.targetLufs || -14} LUFS</strong> &bull; Ceiling: <strong className="text-amber-300">{activeGoldPreset?.parameters.ceilingDb || -1.0} dBFS</strong> &bull; Drive: <strong className="text-cyan-300">{Math.round((activeGoldPreset?.masterIntensity || 0.5) * 100)}%</strong>
          </span>
        </div>

        {masteringMode !== 'pipeline' && (
          <button
            onClick={() => setMasteringMode('pipeline')}
            className="text-[11px] font-bold text-amber-400 hover:text-white flex items-center gap-1 transition-colors ml-auto"
          >
            <span>Open Gold Path Chain Rack &rarr;</span>
          </button>
        )}
      </div>

      {/* Mode 1: Dedicated D3 Spectral Analyzer View */}
      {masteringMode === 'spectral_analyzer' && (
        <div className="flex flex-col gap-5">
          {/* Main D3 Spectrum Analyzer */}
          <SpectralAnalyzer height={380} showControls={true} />

          {/* Mastering Frequency Band Guide */}
          <div className="bg-[#0A0D1E] border border-[#1F2642] rounded-xl p-4 sm:p-5">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#FFD700] font-bold mb-3 flex items-center gap-2">
              <Waves size={14} />
              Master Bus Frequency Band Reference & Target Envelopes
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-[#060814] border border-[#1C223A]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-indigo-400">Sub (20 - 60 Hz)</span>
                  <span className="text-[10px] font-mono text-[#64748B]">Mono Lock</span>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  High-pass subsonic DC offset and un-pitched rumble. Keep under -6 dBFS to preserve headroom.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#060814] border border-[#1C223A]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-blue-400">Bass (60 - 250 Hz)</span>
                  <span className="text-[10px] font-mono text-[#64748B]">Body & Punch</span>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  Fundamental weight of kick drums and bass guitars. Ensure clean separation from 200 Hz mud.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#060814] border border-[#1C223A]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-emerald-400">Low Mid (250 - 500 Hz)</span>
                  <span className="text-[10px] font-mono text-[#64748B]">Boxiness Zone</span>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  Prime suspect for AI-generated congested "baked" cardboard sound. Gentle notch cleans mix clarity.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#060814] border border-[#1C223A]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-amber-400">Mid (500 - 2 kHz)</span>
                  <span className="text-[10px] font-mono text-[#64748B]">Vocal Core</span>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  Carries the core intelligibility of human voice, snare snap, and primary instrument leads.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#060814] border border-[#1C223A]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-orange-400">High Mid (2k - 4k Hz)</span>
                  <span className="text-[10px] font-mono text-[#64748B]">Attack & Edge</span>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  Ear sensitivity maximum. Excessive build-up produces listener fatigue; careful leveling required.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#060814] border border-[#1C223A]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-pink-400">Presence (4k - 6k Hz)</span>
                  <span className="text-[10px] font-mono text-[#64748B]">Definition</span>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  Front-to-back spatial depth. Boosting brings vocals closer to the listener's ear.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#060814] border border-[#1C223A]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-purple-400">Air (6k - 20k Hz)</span>
                  <span className="text-[10px] font-mono text-[#64748B]">Silky Shimmer</span>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  Smooth high-shelf air. Suno Anti-Sheen tames the 8-11kHz metallic fizz while restoring air above 14kHz.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#060814] border border-[#1C223A] flex flex-col justify-center">
                <div className="flex items-center gap-2 text-cyan-300 text-xs font-mono font-bold mb-1">
                  <ShieldCheck size={14} />
                  <span>Real-time Studio Feed</span>
                </div>
                <p className="text-[11px] text-[#64748B]">
                  Streams directly from the active Mixer output, Suno Mastering playback, or test tone calibration generators.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Suno AI De-Sheen & Un-Bake Studio */}
      {masteringMode === 'suno_desheen' && (
        <SunoMasteringStudio />
      )}

      {/* Mode 3: Gold Path Mastering Chain with Complete Preset System */}
      {masteringMode === 'pipeline' && (
        <GoldPath />
      )}
    </div>
  );
};

export default Mastering;
