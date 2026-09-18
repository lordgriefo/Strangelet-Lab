import React, { useEffect, useState } from 'react';
import { getAudioContext, playLaserBeamSound } from '../lib/laserSound';
import { Music, Sparkles, Volume2 } from 'lucide-react';

interface RetroMidiKeyboardProps {
  onPlayNote?: (note: string, freq: number) => void;
  isOpen: boolean;
  onClose: () => void;
  activeTrackName?: string;
  onInsertMidiClip?: (chordName: string) => void;
}

const KEYS = [
  { note: 'C3', freq: 130.81, key: 'A', isBlack: false },
  { note: 'C#3', freq: 138.59, key: 'W', isBlack: true },
  { note: 'D3', freq: 146.83, key: 'S', isBlack: false },
  { note: 'D#3', freq: 155.56, key: 'E', isBlack: true },
  { note: 'E3', freq: 164.81, key: 'D', isBlack: false },
  { note: 'F3', freq: 174.61, key: 'F', isBlack: false },
  { note: 'F#3', freq: 185.00, key: 'T', isBlack: true },
  { note: 'G3', freq: 196.00, key: 'G', isBlack: false },
  { note: 'G#3', freq: 207.65, key: 'Y', isBlack: true },
  { note: 'A3', freq: 220.00, key: 'H', isBlack: false },
  { note: 'A#3', freq: 233.08, key: 'U', isBlack: true },
  { note: 'B3', freq: 246.94, key: 'J', isBlack: false },
  { note: 'C4', freq: 261.63, key: 'K', isBlack: false },
  { note: 'C#4', freq: 277.18, key: 'O', isBlack: true },
  { note: 'D4', freq: 293.66, key: 'L', isBlack: false },
  { note: 'E4', freq: 329.63, key: ';', isBlack: false },
];

const PRESET_CHORDS = [
  { name: 'Am9 (Twin Peaks)', notes: [220, 261.63, 329.63, 392, 493.88], desc: 'Lynchian Dream Pad' },
  { name: 'Dm7 (Vegas Lounge)', notes: [146.83, 220, 261.63, 349.23], desc: '1960s Midnight Stardust' },
  { name: 'E7#9 (Atomic Saw)', notes: [164.81, 207.65, 246.94, 293.66, 392], desc: 'Hendrix Desert Psyche' },
  { name: 'Cmaj7 (Desert Neon)', notes: [130.81, 164.81, 196.0, 246.94], desc: 'Warm Vacuum Glow' },
];

const RetroMidiKeyboard: React.FC<RetroMidiKeyboardProps> = ({
  isOpen,
  onClose,
  activeTrackName = 'Synth',
  onInsertMidiClip
}) => {
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [synthType, setSynthType] = useState<OscillatorType>('sawtooth');
  const [vibrato, setVibrato] = useState<boolean>(true);

  const triggerSynthNote = (note: string, freq: number) => {
    setActiveNote(note);
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = synthType;
      osc.frequency.setValueAtTime(freq, now);

      if (vibrato) {
        // 1960s Organ Vibrato / Chorus
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 5.5; // 5.5 Hz vintage Leslie / Farfisa wobble
        lfoGain.gain.value = 3.5;
        lfo.connect(osc.frequency);
        lfo.start(now);
        lfo.stop(now + 0.8);
      }

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, now);
      filter.Q.value = 3;

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc.connect(filter).connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.75);
    } catch (e) {
      // AudioContext ignored
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) return;
    const key = e.key.toUpperCase();
    const found = KEYS.find((k) => k.key === key);
    if (found) {
      triggerSynthNote(found.note, found.freq);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, synthType, vibrato]);

  if (!isOpen) return null;

  return (
    <div className="bg-[#090C16] border-t-2 border-[#10B981] p-3 shadow-2xl relative select-none">
      {/* Black Lodge Chevron Accent Border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[repeating-linear-gradient(45deg,#000_0px,#000_6px,#FFF_6px,#FFF_12px)] opacity-60" />

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse shadow-[0_0_8px_#10B981]" />
          <span className="font-mono text-xs font-bold tracking-wider text-[#10B981] uppercase flex items-center gap-1.5">
            <Music size={13} />
            1960s DESERT TRANSISTOR SYNTH &bull; MIDI CONTROLLER
          </span>
          <span className="text-[10px] font-mono text-[#64748B] hidden sm:inline">
            (Armed Target: <span className="text-white font-semibold">{activeTrackName}</span>)
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="flex items-center gap-1 bg-[#04060A] px-2 py-0.5 rounded border border-[#1E293B]">
            <span className="text-[9px] text-[#64748B]">WAVE:</span>
            {(['sawtooth', 'square', 'triangle', 'sine'] as OscillatorType[]).map((t) => (
              <button
                key={t}
                onClick={() => setSynthType(t)}
                className={`px-1.5 py-0.5 rounded text-[9px] uppercase ${
                  synthType === t ? 'bg-[#10B981] text-black font-bold' : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                {t.slice(0, 3)}
              </button>
            ))}
          </div>

          <button
            onClick={() => setVibrato(!vibrato)}
            className={`px-2 py-0.5 rounded border text-[10px] ${
              vibrato ? 'bg-[#FFD700]/20 border-[#FFD700] text-[#FFD700]' : 'border-[#1E293B] text-[#64748B]'
            }`}
          >
            60s Vibrato
          </button>

          <button
            onClick={onClose}
            className="px-2 py-0.5 rounded bg-[#1C1F2E] border border-[#2D3748] text-[#94A3B8] hover:text-white text-[10px]"
          >
            Close &times;
          </button>
        </div>
      </div>

      {/* Preset Chord Pads for Rapid MIDI Paint */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {PRESET_CHORDS.map((chord) => (
          <button
            key={chord.name}
            onClick={() => {
              playLaserBeamSound('laser_midi');
              chord.notes.forEach((f) => triggerSynthNote(chord.name, f));
              onInsertMidiClip?.(chord.name);
            }}
            className="px-2.5 py-1.5 rounded bg-[#070A12] border border-[#10B981]/40 hover:border-[#10B981] hover:bg-[#10B981]/15 text-left transition-all group"
          >
            <div className="flex items-center justify-between text-[11px] font-mono text-[#10B981] font-bold">
              <span>{chord.name}</span>
              <Sparkles size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-[9px] text-[#64748B] font-mono">{chord.desc}</div>
          </button>
        ))}
      </div>

      {/* Piano Keyboard Keys */}
      <div className="relative h-20 bg-[#0A0D15] rounded-lg border border-[#1E293B] p-1 flex overflow-x-auto shadow-inner">
        {KEYS.map((k) => (
          <button
            key={k.note}
            onClick={() => triggerSynthNote(k.note, k.freq)}
            className={`relative flex flex-col justify-end items-center pb-1 text-[9px] font-mono transition-all select-none ${
              k.isBlack
                ? 'w-7 h-12 -mx-3.5 z-10 bg-[#0B0D14] border border-[#273549] text-[#64748B] rounded-b hover:bg-[#10B981] hover:text-black shadow-md'
                : 'flex-1 h-full bg-[#E2E8F0] border-r border-[#CBD5E1] text-[#1E293B] rounded-b hover:bg-[#6EE7B7] active:bg-[#10B981] active:text-black shadow'
            } ${activeNote === k.note ? '!bg-[#10B981] !text-black shadow-[0_0_12px_#10B981]' : ''}`}
          >
            <span className="font-bold">{k.note}</span>
            <span className="text-[7px] opacity-70">[{k.key}]</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RetroMidiKeyboard;
