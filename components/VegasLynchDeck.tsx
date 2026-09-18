import React, { useState, useEffect } from 'react';
import { playLynchianFx } from '../lib/laserSound';
import { Sparkles, Radio, Disc, Coffee, Eye, Zap, Flame, Volume2, ShieldAlert } from 'lucide-react';
import { LaserToolType } from '../types';

interface VegasLynchDeckProps {
  activeLaserTool: LaserToolType;
  isPlaying: boolean;
  isRecording: boolean;
  onToggleTapeEcho?: () => void;
  onToggleSilencio?: () => void;
  onToggleMidiKeyboard?: () => void;
  isMidiKeyboardOpen?: boolean;
}

const VegasLynchDeck: React.FC<VegasLynchDeckProps> = ({
  activeLaserTool,
  isPlaying,
  isRecording,
  onToggleTapeEcho,
  onToggleSilencio,
  onToggleMidiKeyboard,
  isMidiKeyboardOpen = false
}) => {
  const [owlMode, setOwlMode] = useState<boolean>(false);
  const [silencioMode, setSilencioMode] = useState<boolean>(false);
  const [tubeDriveWarmth, setTubeDriveWarmth] = useState<number>(65); // 0 to 100
  const [desertRadioActive, setDesertRadioActive] = useState<boolean>(false);
  const [marqueeFlicker, setMarqueeFlicker] = useState<boolean>(false);

  // Random neon marquee flicker effect
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.75) {
        setMarqueeFlicker(true);
        setTimeout(() => setMarqueeFlicker(false), 120);
      }
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  const handleOwlToggle = () => {
    const next = !owlMode;
    setOwlMode(next);
    playLynchianFx('owl');
  };

  const handleSilencioToggle = () => {
    const next = !silencioMode;
    setSilencioMode(next);
    playLynchianFx('silencio');
    if (onToggleSilencio) onToggleSilencio();
  };

  const handleRadioToggle = () => {
    setDesertRadioActive(!desertRadioActive);
    playLynchianFx('tape_rewind');
  };

  const getLaserInfo = () => {
    switch (activeLaserTool) {
      case 'laser_audio':
        return { name: 'BLUE AUDIO PHOTON BEAM', color: '#00F0FF', desc: 'Slices & Paints Audio Loops' };
      case 'laser_midi':
        return { name: 'GREEN MIDI MATRIX BEAM', color: '#10B981', desc: 'Paints Melodic Chords & Arpeggios' };
      case 'laser_erase':
        return { name: 'RED INCINERATOR LASER', color: '#EF4444', desc: 'Disintegrates Clips & Nodes' };
      case 'laser_curve':
        return { name: 'VEGAS NEON CURVE SCULPTOR', color: '#FFD700', desc: 'Bends Midnight Neon Envelopes' };
      default:
        return { name: 'BLACK LODGE QUANTUM POINTER', color: '#A855F7', desc: 'Precision Time & Node Scrubber' };
    }
  };

  const laserInfo = getLaserInfo();

  return (
    <div className="w-full bg-[#06070D] border-y border-[#1E2538] relative overflow-hidden select-none">
      {/* Black Lodge Chevron (Twin Peaks iconic zigzag motif runner) */}
      <div 
        className="w-full h-1.5 opacity-50 shadow-sm"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, #FFD700 0, #FFD700 8px, #000 8px, #000 16px, #FFF 16px, #FFF 24px, #000 24px, #000 32px)'
        }}
      />

      <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        {/* Left: 1960s Vegas Marquee & Midnight Desert Sign */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0D101C] border border-[#FFD700]/40 shadow-[0_0_12px_rgba(255,215,0,0.15)]">
            <span className={`w-2 h-2 rounded-full bg-[#FFD700] ${marqueeFlicker ? 'opacity-20' : 'animate-ping'}`} />
            <span 
              className="font-bold tracking-widest text-[#FFD700] text-[11px] uppercase drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              THE SANDS &bull; 1962 ATOMIC SOUND
            </span>
            <span className="text-[9px] text-[#A0AEC0] hidden sm:inline">&bull; Midnight Desert</span>
          </div>

          {/* Active Laser Beam Status */}
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#090C16] border transition-all"
            style={{ borderColor: `${laserInfo.color}66`, boxShadow: `0 0 10px ${laserInfo.color}33` }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: laserInfo.color }} />
            <span className="font-bold text-[10px]" style={{ color: laserInfo.color }}>
              {laserInfo.name}
            </span>
            <span className="text-[9px] text-[#64748B] hidden md:inline">&mdash; {laserInfo.desc}</span>
          </div>
        </div>

        {/* Center: Spinning Reel-to-Reel Tape Recorder (1960s Tape deck visualizer) */}
        <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-[#080B14] border border-[#1E293B]">
          <div className="flex items-center gap-1 text-[10px] text-[#94A3B8]">
            <Disc 
              size={15} 
              className={`text-[#FFD700] transition-transform ${
                isPlaying || isRecording ? 'animate-spin' : ''
              }`} 
              style={{ animationDuration: isRecording ? '1s' : '2.5s' }}
            />
            <Disc 
              size={15} 
              className={`text-[#FF8C00] transition-transform ${
                isPlaying || isRecording ? 'animate-spin' : ''
              }`} 
              style={{ animationDuration: isRecording ? '1s' : '2.5s' }}
            />
            <span className="text-[9px] font-bold text-[#E2E8F0] tracking-wider ml-1 uppercase">
              {isRecording ? 'LIVE TAPE RECORDING' : isPlaying ? 'REEL PLAYBACK' : 'REEL-TO-REEL READY'}
            </span>
          </div>

          {/* Vacuum Tube Filament Glow */}
          <div className="flex items-center gap-1 pl-2 border-l border-[#1E293B]" title="1960s Warm Vacuum Tube Stage">
            <Flame size={12} className="text-[#FF8C00] animate-pulse" />
            <div className="w-12 h-2 bg-[#020408] rounded-full border border-[#FF8C00]/30 overflow-hidden flex items-center px-0.5">
              <div 
                className="h-1 bg-gradient-to-r from-[#FF8C00] to-[#FFD700] rounded-full shadow-[0_0_6px_#FF8C00]"
                style={{ width: `${tubeDriveWarmth}%` }}
              />
            </div>
            <span className="text-[8px] text-[#FF8C00]">{tubeDriveWarmth}% Tube</span>
          </div>
        </div>

        {/* Right: David Lynchian Easter Eggs & Surrealist Toggles */}
        <div className="flex items-center gap-2">
          {/* Easter Egg 1: "The Owls Are Not What They Seem" */}
          <button
            onClick={handleOwlToggle}
            className={`px-2 py-1 rounded border flex items-center gap-1 text-[10px] font-mono transition-all ${
              owlMode 
                ? 'bg-[#10B981]/25 border-[#10B981] text-[#10B981] shadow-[0_0_12px_rgba(16,185,129,0.5)] font-bold' 
                : 'bg-[#0B0E19] border-[#1E293B] text-[#94A3B8] hover:text-[#10B981] hover:border-[#10B981]/50'
            }`}
            title="Twin Peaks Easter Egg: The Owls Are Not What They Seem (Drone & Tape Wobble)"
          >
            <Eye size={12} className={owlMode ? 'text-[#10B981] animate-pulse' : 'text-[#64748B]'} />
            <span>{owlMode ? 'OWL SIGHT ON' : 'THE OWLS...'}</span>
          </button>

          {/* Easter Egg 2: "Club Silencio" (Mulholland Drive) */}
          <button
            onClick={handleSilencioToggle}
            className={`px-2 py-1 rounded border flex items-center gap-1 text-[10px] font-mono transition-all ${
              silencioMode 
                ? 'bg-[#FF2A6D]/25 border-[#FF2A6D] text-[#FF2A6D] shadow-[0_0_12px_rgba(255,42,109,0.5)] font-bold' 
                : 'bg-[#0B0E19] border-[#1E293B] text-[#94A3B8] hover:text-[#FF2A6D] hover:border-[#FF2A6D]/50'
            }`}
            title="Mulholland Drive Easter Egg: Club Silencio (No hay banda - Dream Reverb & Vinyl Warmth)"
          >
            <Sparkles size={12} className={silencioMode ? 'text-[#FF2A6D] animate-spin' : 'text-[#64748B]'} />
            <span>{silencioMode ? 'SILENCIO ACTIVE' : 'SILENCIO'}</span>
          </button>

          {/* Easter Egg 3: Lost Highway Desert Radio */}
          <button
            onClick={handleRadioToggle}
            className={`px-2 py-1 rounded border flex items-center gap-1 text-[10px] font-mono transition-all ${
              desertRadioActive 
                ? 'bg-[#FF8C00]/25 border-[#FF8C00] text-[#FF8C00] shadow-[0_0_12px_rgba(255,140,0,0.5)] font-bold' 
                : 'bg-[#0B0E19] border-[#1E293B] text-[#94A3B8] hover:text-[#FF8C00] hover:border-[#FF8C00]/50'
            }`}
            title="Lost Highway Desert Radio: K-DESERT 98.6 FM Midnight Filter"
          >
            <Radio size={12} className={desertRadioActive ? 'text-[#FF8C00]' : 'text-[#64748B]'} />
            <span className="hidden sm:inline">K-DESERT 98.6</span>
          </button>

          {/* 1960s Transistor Synth / MIDI Keypad Drawer Toggle */}
          {onToggleMidiKeyboard && (
            <button
              onClick={onToggleMidiKeyboard}
              className={`px-2 py-1 rounded border flex items-center gap-1 text-[10px] font-mono transition-all ${
                isMidiKeyboardOpen 
                  ? 'bg-[#10B981] text-black font-bold border-[#10B981] shadow-[0_0_10px_#10B981]' 
                  : 'bg-[#0E1524] border-[#10B981]/50 text-[#10B981] hover:bg-[#10B981]/20'
              }`}
              title="Open 1960s Transistor MIDI Synth & Preset Chord Keypad"
            >
              <Zap size={12} />
              <span>SYNTH KEYPAD</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VegasLynchDeck;
