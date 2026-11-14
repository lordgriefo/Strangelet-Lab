import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { Track, Clip } from '../types';
import Knob from './Knob';
import { Power, Music, GitCommit, Sparkles, Scissors, Sliders, Pin, Split, Keyboard, Copy, Trash2, CircleDot, Cpu, ChevronDown, ChevronUp } from 'lucide-react';
const VstModal = lazy(() => import('./VstModal'));
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
  onOpenChronoMap?: (trackId: string) => void;
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
  onOpenVstWrapperHost?: (pluginId?: string) => void;
}

const Fader: React.FC<{
  value: number;
  onChange: (val: number) => void;
  trackId: string;
  trackName: string;
}> = ({ value, onChange, trackId, trackName }) => {
    const faderRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleMouseDown = () => {
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
      <div
        className="flex-1 w-full flex flex-col items-center min-h-[140px]"
        data-midi-control="fader"
        data-midi-id={`${trackId}-volume`}
        data-midi-label={`${trackName} Volume Fader`}
        data-midi-type="volume"
        data-midi-track-id={trackId}
        data-midi-track-name={trackName}
      >
        <div className="flex-1 w-full flex items-stretch justify-center gap-1 min-h-[110px]">
          {/* Subtle hardware dB scale ticks */}
          <div className="flex flex-col justify-between py-4 text-[7px] font-mono text-[#52607E] select-none text-right w-5">
            <span>0</span>
            <span>-12</span>
            <span>-24</span>
            <span>-42</span>
            <span>-60</span>
          </div>
          <div 
              ref={faderRef} 
              className="w-12 flex-1 bg-[#000000] rounded-full relative cursor-ns-resize pt-4 pb-4 border border-[#26619C] shadow-inner"
              onMouseDown={handleMouseDown}
          >
            <div className="w-1 h-full bg-[#0E1729] mx-auto rounded-full relative">
              <div 
                className="absolute w-10 h-12 bg-gradient-to-b from-[#FF8C00] to-[#A020F0] rounded shadow-lg border border-[#777]/60 left-1/2 -translate-x-1/2 flex items-center justify-center"
                style={{ bottom: `calc(${Math.max(0, Math.min(1, (20 * Math.log10(value + 0.000001) + 60) / 60)) * 100}% - 24px)` }}
              >
                <div className="w-7 h-[2px] bg-black/70" />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-1.5 text-center bg-[#000000] px-2 py-0.5 rounded border border-[#26619C]/80 shrink-0">
            <span className="text-[11px] font-mono font-bold text-[#FF8C00]">{displayDb} dB</span>
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
  onOpenChronoMap,
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
  onStartMidiLearn,
  onOpenVstWrapperHost
}) => {
  const { id, name, volume, pan, muted, soloed, color, phaseInverted, isMono, vstBypassed, automation } = track;
  const [isVstModalOpen, setIsVstModalOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
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

  const handleMidiExtraction = async () => {
      setIsExtractingMidi(true);
      // Simulated MIDI extraction
      await new Promise(resolve => setTimeout(resolve, 2000));
      const mockMidiData = `TRACK: ${name}\nTYPE: MIDI 1.0\nEVENTS:\n0:0:0 NOTE ON C3 100\n0:1:0 NOTE OFF C3 0\n0:2:0 NOTE ON E3 95\n0:3:0 NOTE OFF E3 0\n1:0:0 NOTE ON G3 110\n1:1:0 NOTE OFF G3 0`;
      
      if (onShowMidi) {
          onShowMidi(mockMidiData);
      } else {
          console.info(`Extracted MIDI data for track "${name}"`);
      }
      setIsExtractingMidi(false);
  };
  
  const UtilityButton: React.FC<{ active: boolean, onClick: () => void, midiId?: string, midiLabel?: string, children: React.ReactNode }> = ({ active, onClick, midiId, midiLabel, children }) => (
      <button
        onClick={onClick}
        data-midi-id={midiId}
        data-midi-label={midiLabel}
        data-midi-type="button"
        className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${active ? 'bg-[#FFD700] border-[#FFD700] text-black' : 'bg-transparent border-[#444] text-[#666] hover:border-[#888] hover:text-[#ccc]'}`}
      >
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
        {isVstModalOpen && (
          <Suspense fallback={null}>
            <VstModal 
                isOpen={isVstModalOpen} 
                onClose={() => setIsVstModalOpen(false)} 
                onApply={(vst) => {
                    const currentVsts = track.vsts ? [...track.vsts, vst] : [vst];
                    updateTrack(id, { vsts: currentVsts, vstBypassed: false });
                }}
                onOpenVstWrapperHost={onOpenVstWrapperHost}
            />
          </Suspense>
        )}

        {/* VST & Name */}
        <div className="w-full text-center px-1 pt-0.5 pb-1">
            <div className="flex gap-1 w-full">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsVstModalOpen(true); }} 
                className={`flex-1 flex items-center justify-center gap-1 text-[10px] font-bold py-1 rounded transition-colors ${
                  vstBypassed ? 'bg-[#222] text-[#666]' : 'bg-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/30'
                }`}
                title="Select VST Inserts & DSP Effects"
              >
                  <Power size={10} /> <span>{vstBypassed ? 'BYP' : 'VST'}{track.vsts && track.vsts.length > 0 ? ` (${track.vsts.length})` : ''}</span>
              </button>

              {onOpenVstWrapperHost && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenVstWrapperHost();
                  }}
                  className="px-1.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/50 text-[10px] font-bold transition-all"
                  title="Open Simulated VST3 / CLAP Faceplate Rack for this track"
                >
                  <Sliders size={10} />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between mt-1 px-0.5">
              <p className="font-bold text-white truncate text-xs flex-1 text-left" title={name}>{name}</p>
              <div className="flex items-center gap-0.5 shrink-0 ml-1">
                {onDuplicateTrack && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDuplicateTrack(id); }}
                    className="p-0.5 rounded text-[#8C9BBF] hover:text-[#00F0FF] hover:bg-white/10 transition-colors"
                    title="Duplicate Track (Undoable with Ctrl+Z)"
                  >
                    <Copy size={10} />
                  </button>
                )}
                {onDeleteTrack && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteTrack(id); }}
                    className="p-0.5 rounded text-[#8C9BBF] hover:text-[#EF4444] hover:bg-white/10 transition-colors"
                    title="Delete Track (Undoable with Ctrl+Z)"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            </div>

            {/* Compact Bus / Selection Status Row */}
            <div className="mt-1 flex items-center justify-between gap-1 text-[8px] font-mono">
              {track.bus ? (
                <span className="px-1 py-0.5 rounded bg-[#0A0A10] border border-[#26619C]/50 text-[#FF8C00] truncate flex-1 text-left" title={`Bus: ${track.bus}`}>
                  &rarr; {track.bus}
                </span>
              ) : (
                <span className="text-[#555] truncate flex-1 text-left">Master</span>
              )}
              {isSelected && (
                <span className={`px-1 py-0.5 rounded font-bold uppercase shrink-0 ${
                  track.isArmedForRecord && isAutoArmMode
                    ? 'bg-red-500/25 text-red-300 border border-red-500/60'
                    : track.isArmedForRecord
                      ? 'bg-red-950/70 text-red-300 border border-red-800'
                      : 'bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/40'
                }`}>
                  {track.isArmedForRecord && isAutoArmMode ? 'AUTO' : track.isArmedForRecord ? 'ARM' : 'SEL'}
                </span>
              )}
            </div>
        </div>
        
        {/* Utility Trio */}
        <div className="w-full flex justify-around py-1.5 px-2 my-1 bg-[#000000] rounded border border-[#26619C]/70 shrink-0">
            <UtilityButton
              active={phaseInverted}
              onClick={() => updateTrack(id, { phaseInverted: !phaseInverted })}
              midiId={`${id}-utility-phase`}
              midiLabel={`${name} Phase Invert`}
            >
                <GitCommit size={13} className="transform rotate-90" />
            </UtilityButton>
             <UtilityButton
               active={isMono}
               onClick={() => updateTrack(id, { isMono: !isMono })}
               midiId={`${id}-utility-mono`}
               midiLabel={`${name} Mono Toggle`}
             >
                <span className="text-[10px] font-bold">M</span>
            </UtilityButton>
             <UtilityButton
               active={!vstBypassed && (track.vsts?.length || 0) > 0}
               onClick={() => updateTrack(id, { vstBypassed: !vstBypassed })}
               midiId={`${id}-utility-fx`}
               midiLabel={`${name} FX Bypass`}
             >
                <Sparkles size={11} />
            </UtilityButton>
        </div>

        {/* Automation Status Indicator */}
        {(isVolAutomated || isPanAutomated || (automation?.params && Object.values(automation.params).some(p => p.enabled))) && (
          <div className="flex items-center gap-1 mb-1 px-1.5 py-0.5 rounded bg-[#0A0D18] border border-[#00F0FF]/40 text-[8px] font-mono text-[#00F0FF] shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-pulse" />
            <span>AUTO ACTIVE</span>
          </div>
        )}

        {/* Pan */}
        <div className="flex flex-col items-center w-full">
          {(isMidiLearnMode || panMapping) && (
            <button
              data-midi-learn-ignore="true"
              onClick={(e) => {
                e.stopPropagation();
                onStartMidiLearn?.({ id: `${id}-pan`, targetType: 'pan', controlLabel: `${name} Pan Knob`, trackId: id, trackName: name });
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
              midiId={`${id}-pan`}
              midiLabel={`${name} Pan Knob`}
              midiType="pan"
              midiTrackId={id}
              midiTrackName={name}
          />
        </div>

        {/* Fader */}
        <div className="w-full flex-1 my-2 flex flex-col items-center min-h-0">
          {(isMidiLearnMode || volMapping) && (
            <button
              data-midi-learn-ignore="true"
              onClick={(e) => {
                e.stopPropagation();
                onStartMidiLearn?.({ id: `${id}-volume`, targetType: 'volume', controlLabel: `${name} Volume Fader`, trackId: id, trackName: name });
              }}
              className={`mb-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold tracking-tight transition-all cursor-pointer border shrink-0 ${
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
          <Fader
            value={currentVolume}
            onChange={(val) => updateTrack(id, { volume: val })}
            trackId={id}
            trackName={name}
          />
        </div>
        
        {/* Record Arm / Mute / Solo / Phase */}
        <div className="flex gap-1 w-full py-1 justify-center shrink-0">
            <button 
              data-midi-id={`${id}-rec`}
              data-midi-label={`${name} Record Arm`}
              data-midi-type="button"
              onClick={(e) => {
                e.stopPropagation();
                updateTrack(id, { isArmedForRecord: !track.isArmedForRecord });
              }} 
              className={`flex-1 py-1.5 rounded text-[9px] font-bold border transition-all ${
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
              {track.isArmedForRecord && isAutoArmMode && isSelected ? 'AUTO' : 'REC'}
            </button>
            <button
              data-midi-id={`${id}-mute`}
              data-midi-label={`${name} Mute`}
              data-midi-type="button"
              onClick={(e) => { e.stopPropagation(); updateTrack(id, { muted: !muted }); }}
              className={`w-7 py-1.5 rounded text-[10px] font-bold border ${muted ? 'bg-red-900 border-red-500 text-red-100' : 'bg-[#000000] border-[#26619C] text-[#666]'}`}
            >M</button>
            <button
              data-midi-id={`${id}-solo`}
              data-midi-label={`${name} Solo`}
              data-midi-type="button"
              onClick={() => updateTrack(id, { soloed: !soloed })}
              className={`w-7 py-1.5 rounded text-[10px] font-bold border ${soloed ? 'bg-yellow-800 border-[#FF8C00] text-[#FF8C00]' : 'bg-[#000000] border-[#26619C] text-[#666]'}`}
            >S</button>
            <button
              data-midi-id={`${id}-phase`}
              data-midi-label={`${name} Phase Invert`}
              data-midi-type="button"
              onClick={() => updateTrack(id, { phaseInverted: !phaseInverted })}
              className={`w-7 py-1.5 rounded text-[10px] font-bold border ${phaseInverted ? 'bg-[#A020F0]/50 border-[#A020F0] text-white' : 'bg-[#000000] border-[#26619C] text-[#666]'}`}
            >Ø</button>
        </div>

        {/* Decluttered Quick Action Bar + Collapsible Channel Tools */}
        <div className="w-full pt-1 border-t border-[#222] shrink-0">
          <div className="flex items-center gap-1 w-full">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (track.type === 'midi' && onOpenMidiEditor) {
                  onOpenMidiEditor(track);
                } else if (onEdit && track.clips.length > 0) {
                  onEdit(track.clips[0]);
                }
              }}
              title={track.type === 'midi' ? 'Open Piano Roll MIDI Editor' : 'Open Audio Clip Editor'}
              className="flex-1 py-1 text-[9px] font-mono font-bold text-[#94A3B8] hover:text-[#FF8C00] flex items-center justify-center gap-1 bg-[#080B12] rounded border border-[#26619C]/60"
            >
              {track.type === 'midi' ? <Keyboard size={10} className="text-purple-400" /> : <Scissors size={10} />}
              <span>{track.type === 'midi' ? 'PIANO' : 'EDIT'}</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsToolsOpen(prev => !prev);
              }}
              className={`px-1.5 py-1 rounded text-[9px] font-mono font-bold border flex items-center gap-0.5 transition-colors cursor-pointer ${
                isToolsOpen
                  ? 'bg-[#26619C]/30 border-[#00F0FF] text-[#00F0FF]'
                  : 'bg-[#080B12] border-[#26619C]/60 text-[#7C8AA8] hover:text-white'
              }`}
              title="Expand track DSP & MIDI tools (BasicPitch, Chrono-Pin, Beam Split, Humanize)"
            >
              <span>FX</span>
              {isToolsOpen ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
            </button>
          </div>

          {isToolsOpen && (
            <div className="mt-1.5 flex flex-col gap-1 p-1.5 rounded bg-[#070A12] border border-[#1E293B]">
              {track.type === 'audio' ? (
                <>
                  <button
                    onClick={() => {
                      if (onOpenBasicPitch) onOpenBasicPitch(track);
                      else handleMidiExtraction();
                    }}
                    disabled={isExtractingMidi}
                    className="w-full py-1 text-[9px] font-mono font-bold text-emerald-300 hover:bg-emerald-500/20 flex items-center justify-center gap-1 bg-[#040814] rounded border border-emerald-500/40"
                    title="Transcribe Audio to MIDI via Basic Pitch"
                  >
                    <Cpu size={10} />
                    <span>BASIC PITCH</span>
                  </button>
                  {onOpenChronoMap && (
                    <button
                      onClick={() => onOpenChronoMap(id)}
                      className="w-full py-1 text-[9px] font-mono font-bold text-[#00F0FF] hover:bg-[#00F0FF] hover:text-black flex items-center justify-center gap-1 bg-[#040814] rounded border border-[#00F0FF]/40"
                    >
                      <Pin size={10} className="text-[#FFD700] fill-current" />
                      <span>CHRONOMAP</span>
                    </button>
                  )}
                  {onOpenBeamSplitter && (
                    <button
                      onClick={() => onOpenBeamSplitter(id)}
                      className="w-full py-1 text-[9px] font-mono font-bold text-[#FF2E63] hover:bg-[#FF2E63] hover:text-white flex items-center justify-center gap-1 bg-[#14060E] rounded border border-[#FF2E63]/40"
                    >
                      <Split size={10} className="text-[#00F0FF] transform -rotate-45" />
                      <span>BEAM SPLIT</span>
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between text-[9px] font-mono">
                    <span className="font-bold text-[#10B981]">HUMANIZE</span>
                    <button
                      onClick={handleToggleHumanize}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-black cursor-pointer ${
                        isHumanizeEnabled ? 'bg-[#10B981] text-black' : 'bg-[#1B2234] text-[#64748B]'
                      }`}
                    >
                      {isHumanizeEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  {isHumanizeEnabled && (
                    <>
                      <input
                        type="range"
                        min="0.05"
                        max="0.4"
                        step="0.02"
                        value={humanizeAmount}
                        onChange={e => handleHumanizeAmountChange(parseFloat(e.target.value))}
                        className="w-full accent-[#10B981] cursor-pointer h-1 bg-[#141B2E] rounded"
                      />
                      <button
                        onClick={handleHumanizeClipNotes}
                        className="w-full py-0.5 text-[8px] font-mono font-bold bg-[#10B981]/20 hover:bg-[#10B981] hover:text-black text-[#10B981] rounded border border-[#10B981]/40 cursor-pointer"
                      >
                        RANDOMIZE VEL
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
    </div>
  );
};

export default ChannelStrip;
