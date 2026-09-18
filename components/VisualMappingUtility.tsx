import React, { useState, useMemo } from 'react';
import { 
  Music, Layers, Scissors, Plus, Play, Sparkles, Radio, 
  ArrowRight, Disc, Sliders, Check, MoveHorizontal, CornerDownRight
} from 'lucide-react';
import { SfzRegion, WaveformType } from './SfzDefinitionBuilder';
import { playLaserBeamSound } from '../lib/laserSound';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToNote(midi: number): string {
  const note = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

interface VisualMappingUtilityProps {
  regions: SfzRegion[];
  selectedRegionId: string;
  onSelectRegion: (id: string) => void;
  onUpdateRegion: (id: string, updates: Partial<SfzRegion>) => void;
  onAddRegionFromSample: (sampleName: string, waveformType: WaveformType, lokey: number, hikey: number, rootKey: number) => void;
  onQuickSpread: (mode: 'octaves' | 'gm_drums' | 'burroughs_split' | 'chromatic') => void;
  cutupSlices?: Array<{ id: number; name: string; pitchOffset: number; reversed: boolean }>;
  keyboardStartOctave: number;
  onChangeOctave: (oct: number) => void;
  activeAuditionMidi: number | null;
  onAuditionKey: (midi: number) => void;
  assignMode: 'none' | 'lokey' | 'hikey' | 'center';
  onSetAssignMode: (mode: 'none' | 'lokey' | 'hikey' | 'center') => void;
}

export const VisualMappingUtility: React.FC<VisualMappingUtilityProps> = ({
  regions,
  selectedRegionId,
  onSelectRegion,
  onUpdateRegion,
  onAddRegionFromSample,
  onQuickSpread,
  cutupSlices = [],
  keyboardStartOctave,
  onChangeOctave,
  activeAuditionMidi,
  onAuditionKey,
  assignMode,
  onSetAssignMode
}) => {
  // Sample pool state for quick mapping
  const [selectedSampleName, setSelectedSampleName] = useState<string>('cutup_slice_1.wav');
  const [selectedWaveformType, setSelectedWaveformType] = useState<WaveformType>('sample_slice');
  const [targetLoKey, setTargetLoKey] = useState<number>(36); // C2
  const [targetHiKey, setTargetHiKey] = useState<number>(47); // B2
  const [targetRootKey, setTargetRootKey] = useState<number>(36); // C2
  const [isSampleTrayOpen, setIsSampleTrayOpen] = useState<boolean>(true);

  const selectedRegion = useMemo(() => {
    return regions.find(r => r.id === selectedRegionId) || regions[0] || null;
  }, [regions, selectedRegionId]);

  // Generate 48 keys for visual piano (4 octaves)
  const keyboardKeys = useMemo(() => {
    const keys: { midi: number; isBlack: boolean; name: string }[] = [];
    const startMidi = keyboardStartOctave * 12 + 12;
    for (let i = 0; i < 48; i++) {
      const midi = startMidi + i;
      const noteInOct = midi % 12;
      const isBlack = [1, 3, 6, 8, 10].includes(noteInOct);
      keys.push({
        midi,
        isBlack,
        name: midiToNote(midi)
      });
    }
    return keys;
  }, [keyboardStartOctave]);

  // Available Built-in Sample and Waveform Pool
  const samplePool = useMemo(() => {
    const pool: { name: string; label: string; type: WaveformType; category: string }[] = [];

    // 1. Cut-Up Engine Slices
    if (cutupSlices && cutupSlices.length > 0) {
      cutupSlices.forEach((s, idx) => {
        pool.push({
          name: `cutup_slice_${idx + 1}.wav`,
          label: `Cut-Up: ${s.name}`,
          type: 'sample_slice',
          category: 'Cut-Up Chopped Slices'
        });
      });
    } else {
      for (let i = 1; i <= 8; i++) {
        pool.push({
          name: `cutup_slice_${i}.wav`,
          label: `Chopped Slice ${i} (Drum/Perc)`,
          type: 'sample_slice',
          category: 'Cut-Up Chopped Slices'
        });
      }
    }

    // 2. Synthesizer Waveforms
    pool.push(
      { name: 'analog_sub_sine.wav', label: 'Analog Sub Sine (32Hz - 120Hz)', type: 'sine_sub', category: 'Synthesizer Waveforms' },
      { name: 'minimoog_saw_fat.wav', label: 'Minimoog Sawtooth Wave', type: 'saw_analog', category: 'Synthesizer Waveforms' },
      { name: 'juno_pulse_square.wav', label: 'Juno-106 Pulse PWM', type: 'pulse_juno', category: 'Synthesizer Waveforms' },
      { name: 'triangle_flute_lead.wav', label: 'Triangle Organic Flute', type: 'triangle_flute', category: 'Synthesizer Waveforms' },
      { name: 'badalamenti_theremin.wav', label: 'Badalamenti Theremin Ghost', type: 'theremin_lead', category: 'Synthesizer Waveforms' },
      { name: 'interzone_fm_bell.wav', label: 'Interzone FM Glass Bell', type: 'interzone_bell', category: 'Synthesizer Waveforms' },
      { name: 'magnetic_tape_noise.wav', label: 'Magnetic Tape Oxide Noise', type: 'tape_noise', category: 'Synthesizer Waveforms' }
    );

    // 3. Stems
    pool.push(
      { name: 'stem_drums.wav', label: 'RoFormer Stem: Drums', type: 'custom_wav', category: 'RoFormer Audio Stems' },
      { name: 'stem_bass.wav', label: 'RoFormer Stem: Bassline', type: 'custom_wav', category: 'RoFormer Audio Stems' },
      { name: 'stem_synth_lead.wav', label: 'RoFormer Stem: Synth Lead', type: 'custom_wav', category: 'RoFormer Audio Stems' },
      { name: 'stem_ambience.wav', label: 'RoFormer Stem: Lynchian Texture', type: 'custom_wav', category: 'RoFormer Audio Stems' }
    );

    return pool;
  }, [cutupSlices]);

  // Handle click on visual key to audition or assign
  const handleKeyClick = (midi: number) => {
    if (assignMode === 'lokey' && selectedRegion) {
      onUpdateRegion(selectedRegion.id, {
        lokey: Math.min(midi, selectedRegion.hikey),
        pitch_keycenter: Math.max(Math.min(midi, selectedRegion.hikey), selectedRegion.pitch_keycenter)
      });
      onSetAssignMode('none');
      playLaserBeamSound('laser_select');
      return;
    }
    if (assignMode === 'hikey' && selectedRegion) {
      onUpdateRegion(selectedRegion.id, {
        hikey: Math.max(midi, selectedRegion.lokey),
        pitch_keycenter: Math.min(Math.max(midi, selectedRegion.lokey), selectedRegion.pitch_keycenter)
      });
      onSetAssignMode('none');
      playLaserBeamSound('laser_select');
      return;
    }
    if (assignMode === 'center' && selectedRegion) {
      const clamped = Math.max(selectedRegion.lokey, Math.min(selectedRegion.hikey, midi));
      onUpdateRegion(selectedRegion.id, { pitch_keycenter: clamped });
      onSetAssignMode('none');
      playLaserBeamSound('laser_select');
      return;
    }

    // Default: Audition key
    onAuditionKey(midi);
  };

  // Assign selected sample to the current region or create new
  const handleAssignToRegion = () => {
    if (selectedRegion) {
      onUpdateRegion(selectedRegion.id, {
        sample: selectedSampleName,
        waveformType: selectedWaveformType,
        lokey: targetLoKey,
        hikey: targetHiKey,
        pitch_keycenter: targetRootKey
      });
      playLaserBeamSound('laser_curve');
    }
  };

  const handleCreateNewZoneFromSample = () => {
    onAddRegionFromSample(selectedSampleName, selectedWaveformType, targetLoKey, targetHiKey, targetRootKey);
    playLaserBeamSound('laser_curve');
  };

  // Adjust low key or high key directly with buttons / stepper
  const stepKey = (type: 'lokey' | 'hikey' | 'center', delta: number) => {
    if (!selectedRegion) return;
    if (type === 'lokey') {
      const nextLo = Math.max(0, Math.min(selectedRegion.hikey, selectedRegion.lokey + delta));
      onUpdateRegion(selectedRegion.id, {
        lokey: nextLo,
        pitch_keycenter: Math.max(nextLo, selectedRegion.pitch_keycenter)
      });
    } else if (type === 'hikey') {
      const nextHi = Math.min(127, Math.max(selectedRegion.lokey, selectedRegion.hikey + delta));
      onUpdateRegion(selectedRegion.id, {
        hikey: nextHi,
        pitch_keycenter: Math.min(nextHi, selectedRegion.pitch_keycenter)
      });
    } else {
      const nextRoot = Math.max(selectedRegion.lokey, Math.min(selectedRegion.hikey, selectedRegion.pitch_keycenter + delta));
      onUpdateRegion(selectedRegion.id, { pitch_keycenter: nextRoot });
    }
  };

  return (
    <div className="bg-[#0A0D16] border border-[#1E293B] rounded-xl p-5 flex flex-col gap-5 font-mono">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1E293B]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#FFD700]/10 border border-[#FFD700]/40 flex items-center justify-center text-[#FFD700] shadow-[0_0_12px_rgba(255,215,0,0.2)]">
            <Music size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                VISUAL KEYRANGE MAPPING UTILITY
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                SFZ v2 COMPLIANT
              </span>
            </div>
            <p className="text-[11px] text-[#94A3B8]">
              Assign chopped loops or audio samples to discrete key ranges with real-time zone boundary handles.
            </p>
          </div>
        </div>

        {/* Quick Mapping Algorithm Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onQuickSpread('gm_drums')}
            className="px-2.5 py-1.5 rounded bg-[#162035] hover:bg-[#1E2E4A] text-[#00F0FF] border border-[#00F0FF]/30 text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Map slices as 1-key triggers starting at C2 (GM standard)"
          >
            GM DRUMS (1-KEY)
          </button>
          <button
            onClick={() => onQuickSpread('octaves')}
            className="px-2.5 py-1.5 rounded bg-[#121B2A] hover:bg-[#1C2C44] text-[#94A3B8] hover:text-white border border-[#1E293B] text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Spread regions across 1-octave segments"
          >
            OCTAVE SPREAD
          </button>
          <button
            onClick={() => onQuickSpread('burroughs_split')}
            className="px-2.5 py-1.5 rounded bg-[#25132A] hover:bg-[#3B1F42] text-[#C084FC] border border-[#A855F7]/40 text-xs font-bold flex items-center gap-1.5 transition-colors"
            title="Burroughs Cut-Up fold-in with reversed alternates"
          >
            BURROUGHS FOLD-IN
          </button>
          <button
            onClick={() => onQuickSpread('chromatic')}
            className="px-2.5 py-1.5 rounded bg-[#121B2A] hover:bg-[#1C2C44] text-[#94A3B8] hover:text-white border border-[#1E293B] text-xs font-semibold transition-colors"
            title="Map all regions chromatically starting at C1"
          >
            CHROMATIC MAP
          </button>
        </div>
      </div>

      {/* Visual Zone Strips Layer (Dynamic Keyrange bars aligned with keyboard) */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] text-[#64748B]">
          <span className="flex items-center gap-1.5">
            <Layers size={13} className="text-[#00F0FF]" />
            ACTIVE SFZ ZONES ({regions.length} MAPPED KEYRANGES)
          </span>
          <span>
            OCTAVE VIEW: <strong>C{keyboardStartOctave + 1} - C{keyboardStartOctave + 4}</strong>
          </span>
        </div>

        <div className="relative h-20 w-full bg-[#05070D] border border-[#1E293B] rounded-lg p-1.5 overflow-hidden flex flex-col justify-start gap-1 select-none">
          {regions.map((reg, idx) => {
            const minMidi = keyboardStartOctave * 12 + 12;
            const isSelected = selectedRegionId === reg.id;

            // Calculate percentage position relative to visible 48 keys
            const leftPct = Math.max(0, Math.min(100, ((reg.lokey - minMidi) / 48) * 100));
            const rightPct = Math.max(0, Math.min(100, ((reg.hikey + 1 - minMidi) / 48) * 100));
            const widthPct = Math.max(2, rightPct - leftPct);
            const centerPct = Math.max(0, Math.min(100, ((reg.pitch_keycenter - minMidi + 0.5) / 48) * 100));

            return (
              <div
                key={reg.id}
                onClick={() => {
                  onSelectRegion(reg.id);
                  playLaserBeamSound('laser_select');
                }}
                style={{
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                  borderColor: reg.color,
                  backgroundColor: isSelected ? `${reg.color}35` : `${reg.color}15`,
                  top: `${(idx % 3) * 22 + 4}px`
                }}
                className={`absolute h-5 rounded border cursor-pointer flex items-center justify-between px-1.5 transition-all text-[9px] font-bold group ${
                  isSelected ? 'ring-2 ring-white z-30 shadow-[0_0_12px_rgba(255,255,255,0.3)]' : 'z-10 hover:brightness-125'
                }`}
                title={`Zone: ${reg.name} | [${midiToNote(reg.lokey)} - ${midiToNote(reg.hikey)}] Root: ${midiToNote(reg.pitch_keycenter)}`}
              >
                {/* Left Drag/Resize handle pill for lokey */}
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    stepKey('lokey', -1);
                  }}
                  className="text-[8px] font-extrabold px-1 rounded bg-black/60 text-[#00F0FF] hover:bg-[#00F0FF] hover:text-black transition-colors"
                  title="Shift Low Key"
                >
                  {midiToNote(reg.lokey)}
                </span>

                <span className="truncate text-white px-1 drop-shadow-sm font-semibold">
                  {reg.name}
                </span>

                {/* Root Key Center Pin */}
                <div
                  style={{ left: `${Math.max(0, Math.min(100, ((centerPct - leftPct) / widthPct) * 100))}%` }}
                  className="absolute -top-1 bottom-0 w-1 bg-white rounded-full shadow-[0_0_8px_#FFF] transform -translate-x-1/2 pointer-events-none"
                  title={`Root: ${midiToNote(reg.pitch_keycenter)}`}
                />

                {/* Right Drag/Resize handle pill for hikey */}
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    stepKey('hikey', 1);
                  }}
                  className="text-[8px] font-extrabold px-1 rounded bg-black/60 text-[#FFD700] hover:bg-[#FFD700] hover:text-black transition-colors"
                  title="Shift High Key"
                >
                  {midiToNote(reg.hikey)}
                </span>
              </div>
            );
          })}
        </div>

        {/* 48-Key Piano Keyboard Component */}
        <div className="relative w-full h-24 select-none bg-[#05070D] rounded-lg p-1 border border-[#1E293B] overflow-hidden flex shadow-inner">
          {/* White keys */}
          <div className="flex w-full h-full">
            {keyboardKeys.filter(k => !k.isBlack).map((key) => {
              const isInSelectedRange = selectedRegion && key.midi >= selectedRegion.lokey && key.midi <= selectedRegion.hikey;
              const isRoot = selectedRegion && key.midi === selectedRegion.pitch_keycenter;
              const isAuditioning = activeAuditionMidi === key.midi;

              return (
                <button
                  key={key.midi}
                  onClick={() => handleKeyClick(key.midi)}
                  className={`flex-1 h-full rounded-b-md border-r border-[#1E293B] relative flex flex-col justify-end pb-1 items-center transition-all ${
                    isAuditioning
                      ? 'bg-[#FFD700] text-black shadow-[0_0_15px_#FFD700]'
                      : isRoot
                      ? 'bg-gradient-to-b from-white to-[#00F0FF]/40 text-black font-extrabold border-b-4 border-[#00F0FF]'
                      : isInSelectedRange
                      ? 'bg-slate-100 text-black font-bold'
                      : 'bg-[#D1D5DB] hover:bg-white text-[#4B5563]'
                  }`}
                  title={`${key.name} (MIDI ${key.midi})`}
                >
                  {isRoot && (
                    <span className="text-[7px] font-extrabold px-1 rounded bg-[#00F0FF] text-black mb-0.5">
                      ROOT
                    </span>
                  )}
                  <span className="text-[9px] font-bold">
                    {key.name.endsWith('C') || key.name.includes('C') ? key.name : ''}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Black keys layer */}
          <div className="absolute inset-0 pointer-events-none flex px-1">
            {keyboardKeys.map((key, idx) => {
              if (!key.isBlack) return null;
              const whiteKeysBefore = keyboardKeys.slice(0, idx).filter(k => !k.isBlack).length;
              const totalWhiteKeys = keyboardKeys.filter(k => !k.isBlack).length;
              const leftPct = (whiteKeysBefore / totalWhiteKeys) * 100;
              const isAuditioning = activeAuditionMidi === key.midi;
              const isInSelectedRange = selectedRegion && key.midi >= selectedRegion.lokey && key.midi <= selectedRegion.hikey;
              const isRoot = selectedRegion && key.midi === selectedRegion.pitch_keycenter;

              return (
                <button
                  key={key.midi}
                  onClick={() => handleKeyClick(key.midi)}
                  style={{
                    left: `calc(${leftPct}% - 1.2%)`,
                    width: '2.4%'
                  }}
                  className={`pointer-events-auto absolute top-0 h-[58%] rounded-b-md border border-black transition-all flex flex-col justify-end pb-1 items-center z-30 ${
                    isAuditioning
                      ? 'bg-[#FFD700] text-black shadow-[0_0_15px_#FFD700]'
                      : isRoot
                      ? 'bg-gradient-to-b from-[#111] to-[#00F0FF] text-white border-b-2 border-white'
                      : isInSelectedRange
                      ? 'bg-[#1A263E] border-[#00F0FF]/50 text-white'
                      : 'bg-[#080B14] hover:bg-[#1E293B] text-[#94A3B8]'
                  }`}
                  title={`${key.name} (MIDI ${key.midi})`}
                >
                  <span className="text-[7px] leading-tight">
                    {key.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Octave Shift and Step Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-[#060810] border border-[#1E293B] rounded-lg text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#64748B] text-[10px]">PIANO OCTAVE:</span>
            <button
              onClick={() => onChangeOctave(Math.max(0, keyboardStartOctave - 1))}
              className="px-2 py-0.5 rounded bg-[#162035] hover:bg-[#1E2E4A] text-white text-[11px]"
            >
              &larr; Oct C{keyboardStartOctave}
            </button>
            <span className="text-[#00F0FF] font-bold text-[11px]">
              C{keyboardStartOctave + 1} - C{keyboardStartOctave + 4}
            </span>
            <button
              onClick={() => onChangeOctave(Math.min(5, keyboardStartOctave + 1))}
              className="px-2 py-0.5 rounded bg-[#162035] hover:bg-[#1E2E4A] text-white text-[11px]"
            >
              Oct C{keyboardStartOctave + 2} &rarr;
            </button>
          </div>

          {/* Quick Key Assignment Mode */}
          <div className="flex items-center gap-2">
            <span className="text-[#64748B] text-[10px]">CLICK PIANO KEY TO SET:</span>
            <button
              onClick={() => onSetAssignMode(assignMode === 'lokey' ? 'none' : 'lokey')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                assignMode === 'lokey' ? 'bg-[#00F0FF] text-black border-white animate-pulse' : 'bg-[#121826] text-[#94A3B8] border-[#1E293B]'
              }`}
            >
              {assignMode === 'lokey' ? 'CLICK LOW KEY...' : 'LOW KEY (lokey)'}
            </button>
            <button
              onClick={() => onSetAssignMode(assignMode === 'hikey' ? 'none' : 'hikey')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                assignMode === 'hikey' ? 'bg-[#FFD700] text-black border-white animate-pulse' : 'bg-[#121826] text-[#94A3B8] border-[#1E293B]'
              }`}
            >
              {assignMode === 'hikey' ? 'CLICK HIGH KEY...' : 'HIGH KEY (hikey)'}
            </button>
            <button
              onClick={() => onSetAssignMode(assignMode === 'center' ? 'none' : 'center')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                assignMode === 'center' ? 'bg-emerald-400 text-black border-white animate-pulse' : 'bg-[#121826] text-[#94A3B8] border-[#1E293B]'
              }`}
            >
              {assignMode === 'center' ? 'CLICK ROOT...' : 'ROOT (pitch_keycenter)'}
            </button>
          </div>
        </div>
      </div>

      {/* Sample / Chopped Loop Assignment Tray */}
      <div className="p-4 bg-[#060810] border border-[#1E293B] rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Disc size={15} className="text-[#00F0FF]" />
            <h5 className="text-xs font-bold text-white uppercase tracking-wider">
              SAMPLE / CHOPPED LOOP ASSIGNMENT TRAY
            </h5>
          </div>
          <span className="text-[10px] text-[#64748B]">
            Select any audio sample & assign to custom key bounds
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Sample Picker */}
          <div>
            <label className="block text-[10px] text-[#64748B] mb-1">
              SOURCE AUDIO SAMPLE / SLICE
            </label>
            <select
              value={selectedSampleName}
              onChange={(e) => {
                const item = samplePool.find(s => s.name === e.target.value);
                if (item) {
                  setSelectedSampleName(item.name);
                  setSelectedWaveformType(item.type);
                }
              }}
              className="w-full px-2.5 py-1.5 bg-[#0A0D16] border border-[#1E293B] rounded text-white text-xs"
            >
              {samplePool.map((s) => (
                <option key={s.name} value={s.name}>
                  [{s.category}] {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Key Range Range Bounds (lokey - hikey - root) */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-[10px] text-[#64748B] mb-1">
                LOW KEY (lokey)
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={targetHiKey}
                  value={targetLoKey}
                  onChange={(e) => setTargetLoKey(Number(e.target.value))}
                  className="w-full px-2 py-1 bg-[#0A0D16] border border-[#1E293B] rounded text-white text-xs"
                />
                <span className="text-[10px] text-[#00F0FF] font-bold w-9">
                  {midiToNote(targetLoKey)}
                </span>
              </div>
            </div>

            <div className="flex-1">
              <label className="block text-[10px] text-[#64748B] mb-1">
                HIGH KEY (hikey)
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={targetLoKey}
                  max={127}
                  value={targetHiKey}
                  onChange={(e) => setTargetHiKey(Number(e.target.value))}
                  className="w-full px-2 py-1 bg-[#0A0D16] border border-[#1E293B] rounded text-white text-xs"
                />
                <span className="text-[10px] text-[#FFD700] font-bold w-9">
                  {midiToNote(targetHiKey)}
                </span>
              </div>
            </div>

            <div className="flex-1">
              <label className="block text-[10px] text-[#64748B] mb-1">
                ROOT (keycenter)
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={targetLoKey}
                  max={targetHiKey}
                  value={targetRootKey}
                  onChange={(e) => setTargetRootKey(Number(e.target.value))}
                  className="w-full px-2 py-1 bg-[#0A0D16] border border-[#1E293B] rounded text-white text-xs"
                />
                <span className="text-[10px] text-emerald-400 font-bold w-9">
                  {midiToNote(targetRootKey)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-end gap-2">
            <button
              onClick={handleAssignToRegion}
              className="flex-1 py-2 rounded bg-[#00F0FF] hover:bg-[#00D0DF] text-black text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
              title="Apply selected sample and keybounds to the currently selected zone"
            >
              <Check size={13} />
              RE-MAP SELECTED ZONE
            </button>

            <button
              onClick={handleCreateNewZoneFromSample}
              className="flex-1 py-2 rounded bg-[#162035] hover:bg-[#1E2E4A] text-[#00F0FF] border border-[#00F0FF]/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              title="Add a new SFZ zone with this sample and keyrange"
            >
              <Plus size={13} />
              ADD NEW ZONE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualMappingUtility;
