import React, { useState, useRef, useEffect } from 'react';
import { Track, Clip } from '../types';
import Knob from './Knob';
import { Power, Music, Waves, GitCommit, Sparkles, Zap, Mic, Cpu, Scissors, Sliders, Crosshair, Pin, Split, Keyboard, Activity, Copy, Trash2, CircleDot } from 'lucide-react';
import VstModal from './VstModal';
import { evaluateAutomationAt, volumeToDb, panToString } from '../lib/audioUtils';
import { humanizeMidiNotes } from '../services/basicPitchService';
import { playLaserBeamSound } from '../lib/laserSound';
import { MidiControlMapping, MidiLearningTarget } from '../services/midiLearnService';

interface ChannelStripProps {
  track: Track;
  updateTrack: (id: string, updates: Partial<Track>) => void;
  onShowMidi?: (data: string) => void;
  onEdit?: (clip: Clip) => void;
  playheadPosition?: number;
  onOpenBeatmapper?: (trackId: string) => void;
  onOpenBeamSplitter?: (trackId: string) => void;
  onOpenBasicPitch?: (track: Track) => void;
  onOpenMidiEditor?: (track: Track) => void;
  onDuplicateTrack?: (trackId: string) => void;
  onDeleteTrack?: (trackId: string) => void;
  isSelected?: boolean;
  onSelect?: () => void;
  isAutoArmMode?: boolean;
  isMidiLearnMode?: boolean;
  midiMappings?: MidiControlMapping[];
  learningTarget?: MidiLearningTarget | null;
  onStartMidiLearn?: (target: MidiLearningTarget) => void;
}

const Fader: React.FC<{ value: number, onChange: (val: number) => void }> = ({ value, onChange }) => {
    const faderRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !faderRef.current) return;
            const rect = faderRef.current.getBoundingClientRect();
            const trackHeight = rect.height;
            const clientY = e.clientY - rect.top;
            
            // Logarithmic mapping: fader position (0-1) to dB (-60 to 0)
            const faderPos = Math.max(0, Math.min(1, 1 - (clientY / trackHeight)));
            const minDB = -60;
            const maxDB = 0;
            const db = minDB + (maxDB - minDB) * faderPos;
            const linear = Math.pow(10, db / 20);
            onChange(linear);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, onChange]);

    // Convert linear 0-1 value to logarithmic dB scale for display
    const toDB = (linear: number) => {
        if (linear <= 0) return -Infinity;
        return 20 * Math.log10(linear);
    }
    const dbValue = toDB(value);
    const displayDb = isFinite(dbValue) ? dbValue.toFixed(1) : '-inf';

    return (
      <div className="flex-1 w-full flex flex-col items-center">
        <div 
            ref={faderRef} 
            className="w-12 h-full bg-[#000000] rounded-full relative cursor-ns-resize pt-4 pb-4 border border-[#26619C]"
            onMouseDown={handleMouseDown}
        >
          <div className="w-1 h-full bg-[#000000] mx-auto rounded-full relative">
            <div 
              className="absolute w-10 h-14 bg-gradient-to-b from-[#FF8C00] to-[#A020F0] rounded shadow-lg border border-[#555] left-1/2 -translate-x-1/2 flex items-center justify-center"
              style={{ bottom: `calc(${Math.max(0, Math.min(1, (20 * Math.log10(value + 0.000001) + 60) / 60)) * 100}% - 28px)` }}
            >
              <div className="w-8 h-[2px] bg-black/50" />
            </div>
          </div>
        </div>
        <div className="mt-2 text-center bg-[#000000] px-2 py-0.5 rounded border border-[#26619C]">
            <span className="text-xs font-mono text-[#FF8C00]">{displayDb} dB</span>
        </div>
      </div>
    );
};


const ChannelStrip: React.FC<ChannelStripProps> = ({ 
  track, 
  updateTrack, 
  onShowMidi, 
  onEdit, 
  playheadPosition = 0,
  onOpenBeatmapper,
  onOpenBeamSplitter,
  onOpenBasicPitch,
  onOpenMidiEditor,
  onDuplicateTrack,
  onDeleteTrack,
  isSelected = false,
  onSelect,
  isAutoArmMode = false,
  isMidiLearnMode = false,
  midiMappings = [],
  learningTarget = null,
  onStartMidiLearn
}) => {
  const { id, name, volume, pan, muted, soloed, color, phaseInverted, isMono, vstBypassed, automation } = track;
  const [isVstModalOpen, setIsVstModalOpen] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isExtractingMidi, setIsExtractingMidi] = useState(false);

  // Active MIDI Learn mapping checks for this channel
  const volMapping = midiMappings.find(m => m.trackId === id && m.targetType === 'volume');
  const panMapping = midiMappings.find(m => m.trackId === id && m.targetType === 'pan');
  const isLearningVol = learningTarget?.trackId === id && learningTarget?.targetType === 'volume';
  const isLearningPan = learningTarget?.trackId === id && learningTarget?.targetType === 'pan';

  // Humanize Feature State for MIDI Tracks
  const isHumanizeEnabled = track.midiConfig?.humanizeEnabled ?? track.humanizeEnabled ?? true;
  const humanizeAmount = track.midiConfig?.humanizeAmount ?? track.humanizeAmount ?? 0.18;

  const handleToggleHumanize = () => {
    const nextVal = !isHumanizeEnabled;
    updateTrack(id, {
      humanizeEnabled: nextVal,
      midiConfig: {
        ...track.midiConfig,
        humanizeEnabled: nextVal,
        humanizeAmount
      }
    });
    playLaserBeamSound('laser_select');
  };

  const handleHumanizeAmountChange = (amount: number) => {
    updateTrack(id, {
      humanizeAmount: amount,
      midiConfig: {
        ...track.midiConfig,
        humanizeEnabled: isHumanizeEnabled,
        humanizeAmount: amount
      }
    });
  };

  const handleHumanizeClipNotes = () => {
    if (!track.clips || track.clips.length === 0) return;
    const updatedClips = track.clips.map(c => {
      if (c.midiNotes && c.midiNotes.length > 0) {
        return {
          ...c,
          midiNotes: humanizeMidiNotes(c.midiNotes, humanizeAmount)
        };
      }
      return c;
    });
    updateTrack(id, { clips: updatedClips });
    playLaserBeamSound('laser_curve');
  };

  // Compute live automated volume & pan if enabled
  const isVolAutomated = automation?.volume?.enabled && automation.volume.points.length > 0;
  const isPanAutomated = automation?.pan?.enabled && automation.pan.points.length > 0;

  const currentVolume = isVolAutomated
    ? evaluateAutomationAt(automation.volume.points, playheadPosition, volume)
    : volume;

  const currentPan = isPanAutomated
    ? evaluateAutomationAt(automation.pan.points, playheadPosition, pan)
    : pan;
  
  const handleTranscribe = async () => {
      setIsTranscribing(true);
      // Simulated transcription
      await new Promise(resolve => setTimeout(resolve, 1500));
      setTranscription("This is a simulated transcription of the audio track.");
      setIsTranscribing(false);
  };

  const handleMidiExtraction = async () => {
      setIsExtractingMidi(true);
      // Simulated MIDI extraction
      await new Promise(resolve => setTimeout(resolve, 2000));
      const mockMidiData = `TRACK: ${name}\nTYPE: MIDI 1.0\nEVENTS:\n0:0:0 NOTE ON C3 100\n0:1:0 NOTE OFF C3 0\n0:2:0 NOTE ON E3 95\n0:3:0 NOTE OFF E3 0\n1:0:0 NOTE ON G3 110\n1:1:0 NOTE OFF G3 0`;
      
      if (onShowMidi) {
          onShowMidi(mockMidiData);
      } else {
          // Fallback if prop not provided
          alert(`Successfully extracted MIDI data from ${name}!`);
      }
      setIsExtractingMidi(false);
  };
  
  const UtilityButton: React.FC<{ active: boolean, onClick: () => void, children: React.ReactNode }> = ({ active, onClick, children }) => (
      <button onClick={onClick} className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${active ? 'bg-[#FFD700] border-[#FFD700] text-black' : 'bg-transparent border-[#444] text-[#666] hover:border-[#888] hover:text-[#ccc]'}`}>
          {children}
      </button>
  );

  return (
    <div 
        data-track-id={id}
        onClick={() => onSelect?.()}
        className={`w-40 h-full bg-[#151515] border rounded-lg flex flex-col items-center p-2 relative shrink-0 border-t-4 transition-all duration-150 cursor-pointer ${
          isSelected 
            ? track.isArmedForRecord
              ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.45)] ring-2 ring-red-500/70 bg-[#191416]'
              : 'border-[#00F0FF] shadow-[0_0_16px_rgba(0,240,255,0.3)] ring-1 ring-[#00F0FF]/60 bg-[#121620]'
            : 'border-[#333] hover:border-[#555]'
        }`}
        style={{ borderTopColor: color }}
    >
        {/* VST Modal */}
        <VstModal 
            isOpen={isVstModalOpen} 
            onClose={() => setIsVstModalOpen(false)} 
            onApply={(vst) => {
                const currentVsts = track.vsts ? [...track.vsts, vst] : [vst];
                updateTrack(id, { vsts: currentVsts, vstBypassed: false });
            }}
        />

        {/* VST & Name */}
        <div className="w-full text-center p-2">
            <button onClick={(e) => { e.stopPropagation(); setIsVstModalOpen(true); }} className={`w-full flex items-center justify-center gap-2 text-xs py-1 rounded ${vstBypassed ? 'bg-[#222] text-[#666]' : 'bg-[#10B981]/20 text-[#10B981]'}`}>
                <Power size={12} /> {vstBypassed ? 'BYPASSED' : 'VST ACTIVE'}
            </button>
            <div className="flex items-center justify-between mt-1.5 px-0.5">
              <p className="font-bold text-white truncate text-xs flex-1 text-left" title={name}>{name}</p>
              <div className="flex items-center gap-0.5 shrink-0 ml-1">
                {onDuplicateTrack && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDuplicateTrack(id); }}
                    className="p-1 rounded text-[#8C9BBF] hover:text-[#00F0FF] hover:bg-white/10 transition-colors"
                    title="Duplicate Track (Undoable with Ctrl+Z)"
                  >
                    <Copy size={11} />
                  </button>
                )}
                {onDeleteTrack && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteTrack(id); }}
                    className="p-1 rounded text-[#8C9BBF] hover:text-[#EF4444] hover:bg-white/10 transition-colors"
                    title="Delete Track (Undoable with Ctrl+Z)"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            </div>

            {/* Selection & Auto-Arm Status Badge */}
            {isSelected && (
              <div className={`mt-1.5 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider uppercase flex items-center justify-center gap-1 ${
                track.isArmedForRecord && isAutoArmMode
                  ? 'bg-red-500/25 text-red-300 border border-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.35)] animate-pulse'
                  : track.isArmedForRecord
                    ? 'bg-red-950/70 text-red-300 border border-red-800'
                    : 'bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/40'
              }`}>
                <CircleDot size={9} className={track.isArmedForRecord ? "text-red-400 animate-spin" : "text-[#00F0FF]"} />
                <span>{track.isArmedForRecord && isAutoArmMode ? 'AUTO-ARMED' : track.isArmedForRecord ? 'ARMED' : 'SELECTED'}</span>
              </div>
            )}

            {track.bus && (
              <div className="mt-1 px-1 py-0.5 rounded bg-[#0A0A10] border border-[#26619C]/60 text-[9px] font-mono text-[#FF8C00] truncate" title={`Bus: ${track.bus}`}>
                &rarr; {track.bus}
              </div>
            )}
            {track.vsts && track.vsts.length > 0 && (
              <div className="mt-0.5 text-[8px] font-mono text-[#888] truncate" title={track.vsts.join(' > ')}>
                DSP: {track.vsts.length} inserts
              </div>
            )}
        </div>
        
        {/* Utility Trio */}
        <div className="w-full flex justify-around p-2 my-2 bg-[#000000] rounded border border-[#26619C]">
            <UtilityButton active={phaseInverted} onClick={() => updateTrack(id, { phaseInverted: !phaseInverted })}>
                <GitCommit size={14} className="transform rotate-90" />
            </UtilityButton>
             <UtilityButton active={isMono} onClick={() => updateTrack(id, { isMono: !isMono })}>
                <span className="text-[10px] font-bold">M</span>
            </UtilityButton>
             <UtilityButton active={false} onClick={() => {}}>
                <Sparkles size={12} />
            </UtilityButton>
        </div>

        {/* Automation Status Indicator */}
        {(isVolAutomated || isPanAutomated) && (
          <div className="flex items-center gap-1 my-1 px-1.5 py-0.5 rounded bg-[#0A0D18] border border-[#00F0FF]/40 text-[8px] font-mono text-[#00F0FF] shadow-[0_0_8px_rgba(0,240,255,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-pulse" />
            <span>AUTO: {isVolAutomated ? 'VOL' : ''}{isVolAutomated && isPanAutomated ? ' + ' : ''}{isPanAutomated ? 'PAN' : ''}</span>
          </div>
        )}

        {/* Pan */}
        <div className="flex flex-col items-center w-full">
          {(isMidiLearnMode || panMapping) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartMidiLearn?.({ id: `${id}-pan`, targetType: 'pan', trackId: id, trackName: name });
              }}
              className={`mb-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold tracking-tight transition-all cursor-pointer border ${
                isLearningPan
                  ? 'bg-amber-400 text-black border-amber-300 animate-pulse shadow-[0_0_8px_#F59E0B]'
                  : panMapping
                    ? 'bg-amber-950/80 text-amber-300 border-amber-500/50 hover:bg-amber-800/40'
                    : 'bg-[#151926] text-[#7888A8] border-[#2A3756] hover:text-white hover:border-amber-400'
              }`}
              title={panMapping ? `Mapped to MIDI CC ${panMapping.ccNumber} (Ch ${panMapping.channel === -1 ? 'All' : panMapping.channel}). Click to re-map.` : 'Click to map hardware MIDI knob to Pan'}
            >
              {isLearningPan ? '● LISTEN CC...' : panMapping ? `CC ${panMapping.ccNumber} [PAN]` : '+ LEARN PAN'}
            </button>
          )}
          <Knob 
              label="PAN" 
              value={currentPan} 
              min={-1} 
              max={1} 
              onChange={(val) => updateTrack(id, { pan: val })}
          />
        </div>

        {/* Fader */}
        <div className="w-full flex-1 my-3 flex flex-col items-center">
          {(isMidiLearnMode || volMapping) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartMidiLearn?.({ id: `${id}-volume`, targetType: 'volume', trackId: id, trackName: name });
              }}
              className={`mb-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold tracking-tight transition-all cursor-pointer border ${
                isLearningVol
                  ? 'bg-amber-400 text-black border-amber-300 animate-pulse shadow-[0_0_8px_#F59E0B]'
                  : volMapping
                    ? 'bg-amber-950/80 text-amber-300 border-amber-500/50 hover:bg-amber-800/40'
                    : 'bg-[#151926] text-[#7888A8] border-[#2A3756] hover:text-white hover:border-amber-400'
              }`}
              title={volMapping ? `Mapped to MIDI CC ${volMapping.ccNumber} (Ch ${volMapping.channel === -1 ? 'All' : volMapping.channel}). Click to re-map.` : 'Click to map hardware MIDI fader to Volume'}
            >
              {isLearningVol ? '● LISTEN CC...' : volMapping ? `CC ${volMapping.ccNumber} [VOL]` : '+ LEARN VOL'}
            </button>
          )}
          <Fader value={currentVolume} onChange={(val) => updateTrack(id, { volume: val })} />
        </div>
        
        {/* Record Arm / Mute / Solo / Phase */}
        <div className="flex gap-1.5 w-full p-1 justify-center">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                updateTrack(id, { isArmedForRecord: !track.isArmedForRecord });
              }} 
              className={`w-full py-1.5 rounded text-[10px] font-bold border transition-all ${
                track.isArmedForRecord 
                  ? 'bg-[#EF4444] border-white text-white shadow-[0_0_8px_#EF4444] animate-pulse font-black' 
                  : 'bg-[#181014] border-[#3E1B1B] text-[#78350F] hover:text-[#EF4444] hover:border-[#EF4444]'
              }`}
              title={
                track.isArmedForRecord 
                  ? isAutoArmMode && isSelected 
                    ? "Track Auto-Armed on Selection (Ready for Live Record)" 
                    : "Track is Armed for Recording" 
                  : "Arm Track for Recording"
              }
            >
              {track.isArmedForRecord && isAutoArmMode && isSelected ? 'AUTO REC' : 'REC'}
            </button>
            <button onClick={(e) => { e.stopPropagation(); updateTrack(id, { muted: !muted }); }} className={`w-full py-1.5 rounded text-xs font-bold border ${muted ? 'bg-red-900 border-red-500 text-red-100' : 'bg-[#000000] border-[#26619C] text-[#666]'}`}>M</button>
            <button onClick={() => updateTrack(id, { soloed: !soloed })} className={`w-full py-1.5 rounded text-xs font-bold border ${soloed ? 'bg-yellow-800 border-[#FF8C00] text-[#FF8C00]' : 'bg-[#000000] border-[#26619C] text-[#666]'}`}>S</button>
            <button onClick={() => updateTrack(id, { phaseInverted: !phaseInverted })} className={`w-full py-1.5 rounded text-xs font-bold border ${phaseInverted ? 'bg-[#A020F0]/50 border-[#A020F0] text-white' : 'bg-[#000000] border-[#26619C] text-[#666]'}`}>Ø</button>
        </div>

        <div className="flex gap-2 w-full mt-2">
            <button 
                onClick={() => {
                    if (onEdit && track.clips.length > 0) {
                        onEdit(track.clips[0]);
                    }
                }}
                title="Edit Clip"
                className="flex-1 py-1 text-xs text-[#555] hover:text-[#FF8C00] flex items-center justify-center gap-1 bg-[#000000] rounded border border-[#26619C]"
            >
                <Scissors size={12} /> Edit
            </button>
            <button 
                onClick={() => console.log('Sending to Aura Voice Morphing:', name)}
                title="Send to Aura Voice Morphing"
                className="flex-1 py-1 text-xs text-[#555] hover:text-[#FF8C00] flex items-center justify-center gap-1 bg-[#000000] rounded border border-[#26619C]"
            >
                <Mic size={12} /> Aura
            </button>
        </div>
        <div className="flex gap-2 w-full mt-2">
            <button 
                onClick={() => {
                  if (onOpenBasicPitch) {
                    onOpenBasicPitch(track);
                  } else {
                    handleMidiExtraction();
                  }
                }}
                disabled={isExtractingMidi}
                title="Extract polyphonic MIDI via Spotify Basic Pitch neural network"
                className={`flex-1 py-1 text-xs text-[#555] hover:text-emerald-400 flex items-center justify-center gap-1 bg-[#000000] rounded border border-[#26619C] hover:border-emerald-500/60 transition-colors ${isExtractingMidi ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <Cpu size={12} className="text-emerald-400" /> <span>MIDI</span>
            </button>
            <button 
                onClick={() => {
                  if (onOpenBasicPitch) {
                    onOpenBasicPitch(track);
                  } else {
                    handleMidiExtraction();
                  }
                }}
                disabled={isExtractingMidi}
                title="Transcribe Audio to MIDI with Spotify Basic Pitch & assign to VSTi"
                className={`flex-1 py-1 text-xs text-[#555] hover:text-emerald-400 flex items-center justify-center gap-1 bg-[#000000] rounded border border-[#26619C] hover:border-emerald-500/60 transition-colors ${isExtractingMidi ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <Music size={12} className="text-emerald-400" /> <span>BasicPitch</span>
            </button>
        </div>
        <div className="flex gap-2 w-full mt-2">
            <button 
                onClick={handleTranscribe}
                disabled={isTranscribing}
                title="Transcribe audio to text"
                className={`flex-1 py-1 text-xs text-[#555] hover:text-[#FF8C00] flex items-center justify-center gap-1 bg-[#000000] rounded border border-[#26619C] ${isTranscribing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <Zap size={12} /> {isTranscribing ? '...' : 'Transcribe'}
            </button>
        </div>

        {track.type === 'audio' && (
          <div className="w-full mt-2 flex flex-col gap-1">
            {onOpenBeatmapper && (
              <button
                onClick={() => onOpenBeatmapper(id)}
                title="Open Chrono-Pin Tempo Mapper for this Track"
                className="w-full py-1 text-[10px] font-mono font-bold text-[#00F0FF] hover:bg-[#00F0FF] hover:text-black flex items-center justify-center gap-1.5 bg-[#040814] rounded border border-[#00F0FF]/40 shadow-[0_0_8px_rgba(0,240,255,0.2)] transition-all"
              >
                <Pin size={11} className="text-[#FFD700] fill-current" />
                <span>CHRONO-PIN</span>
              </button>
            )}

            {onOpenBeamSplitter && (
              <button
                onClick={() => onOpenBeamSplitter(id)}
                title="Open Beam Splitter (Prism Chopper) for this Track"
                className="w-full py-1 text-[10px] font-mono font-bold text-[#FF2E63] hover:bg-gradient-to-r hover:from-[#FF2E63] hover:to-[#FFD700] hover:text-black flex items-center justify-center gap-1.5 bg-[#14060E] rounded border border-[#FF2E63]/40 shadow-[0_0_8px_rgba(255,46,99,0.2)] transition-all"
              >
                <Split size={11} className="text-[#00F0FF] transform -rotate-45" />
                <span>BEAM SPLIT</span>
              </button>
            )}
          </div>
        )}

        {track.type === 'midi' && (
          <div className="w-full mt-2.5 flex flex-col gap-1.5 p-1.5 rounded-lg bg-[#070A14] border border-[#10B981]/40">
            {/* Header with humanize status */}
            <div className="flex items-center justify-between text-[9px] font-mono">
              <span className="font-bold text-[#10B981] flex items-center gap-1">
                <Sparkles size={10} />
                <span>HUMANIZE</span>
              </span>
              <button
                onClick={handleToggleHumanize}
                className={`px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider transition-all cursor-pointer ${
                  isHumanizeEnabled
                    ? 'bg-[#10B981] text-black shadow-[0_0_8px_#10B981]'
                    : 'bg-[#1B2234] text-[#64748B]'
                }`}
                title="Toggle organic randomized velocity offsets to incoming MIDI notes"
              >
                {isHumanizeEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Velocity jitter amount slider */}
            {isHumanizeEnabled && (
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between text-[8px] font-mono text-[#8C96B5]">
                  <span>Jitter:</span>
                  <span className="text-emerald-300 font-bold">&plusmn;{Math.round(humanizeAmount * 80)} vel</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.4"
                  step="0.02"
                  value={humanizeAmount}
                  onChange={e => handleHumanizeAmountChange(parseFloat(e.target.value))}
                  className="w-full accent-[#10B981] cursor-pointer h-1 bg-[#141B2E] rounded"
                  title="Random velocity offset range applied to incoming notes"
                />
                
                <button
                  onClick={handleHumanizeClipNotes}
                  className="w-full mt-0.5 py-0.5 text-[8px] font-mono font-bold bg-[#10B981]/20 hover:bg-[#10B981] hover:text-black text-[#10B981] rounded border border-[#10B981]/40 transition-colors cursor-pointer"
                  title="Apply randomized velocity offsets to this track's current clip notes"
                >
                  RANDOMIZE CLIP VEL
                </button>
              </div>
            )}

            {/* Launch Piano Roll MIDI Editor */}
            {onOpenMidiEditor && (
              <button
                onClick={() => onOpenMidiEditor(track)}
                className="w-full py-1 text-[9px] font-mono font-bold text-purple-300 hover:bg-purple-600 hover:text-white flex items-center justify-center gap-1 bg-[#150D24] rounded border border-purple-500/50 shadow-[0_0_8px_rgba(168,85,247,0.25)] transition-all cursor-pointer"
                title="Open interactive Grid Piano Roll MIDI Editor"
              >
                <Keyboard size={11} className="text-purple-400" />
                <span>PIANO ROLL</span>
              </button>
            )}
          </div>
        )}
    </div>
  );
};

export default ChannelStrip;
