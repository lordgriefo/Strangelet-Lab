import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { Track, Clip, TrackFxParams, DEFAULT_TRACK_FX } from '../types';
import Knob from './Knob';
import { Power, Music, GitCommit, Sparkles, Scissors, Sliders, Pin, Split, Keyboard, Copy, Trash2, CircleDot, Cpu, ChevronDown, ChevronUp, SlidersHorizontal, Activity } from 'lucide-react';
const VstModal = lazy(() => import('./VstModal'));
import { evaluateAutomationAt, volumeToDb, panToString } from '../lib/audioUtils';
import { humanizeMidiNotes } from '../services/basicPitchService';
import { playLaserBeamSound } from '../lib/laserSound';
import { MidiControlMapping, MidiLearningTarget } from '../services/midiLearnService';
import { audioService } from '../services/audioService';

const FX_PRESETS: Record<string, Partial<TrackFxParams>> = {
  'Warm Tube': { enabled: true, eqLow: 2.5, eqMid: 0.5, eqHigh: 1.0, drive: 0.35, filterCutoff: 18000, delayMix: 0, reverbMix: 0.15, reverbDecay: 1.5 },
  'Bright Vocal': { enabled: true, eqLow: -2.0, eqMid: 1.5, eqHigh: 4.0, drive: 0.1, filterCutoff: 20000, delayMix: 0.2, delayTime: 0.25, reverbMix: 0.25, reverbDecay: 2.2 },
  'Punchy Kick/Bass': { enabled: true, eqLow: 5.0, eqMid: -2.0, eqHigh: -1.0, drive: 0.25, filterCutoff: 12000, delayMix: 0, reverbMix: 0 },
  'Space Echo': { enabled: true, eqLow: 0, eqMid: 0, eqHigh: 1.0, drive: 0.05, filterCutoff: 16000, delayTime: 0.375, delayFeedback: 0.55, delayMix: 0.45, reverbMix: 0.35, reverbDecay: 3.5 },
  'Telephone Filter': { enabled: true, eqLow: -12, eqMid: 6.0, eqHigh: -12, drive: 0.4, filterType: 'bandpass', filterCutoff: 1500, filterResonance: 4.0, delayMix: 0, reverbMix: 0.05 },
  'Flat / Reset': { ...DEFAULT_TRACK_FX, enabled: false }
};

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
  const [activeTab, setActiveTab] = useState<'fx' | 'tools'>('fx');
  const [isExtractingMidi, setIsExtractingMidi] = useState(false);

  const fxConfig: TrackFxParams = track.fxConfig || DEFAULT_TRACK_FX;

  const handleUpdateFx = (updates: Partial<TrackFxParams>) => {
    const nextFx: TrackFxParams = { ...fxConfig, ...updates };
    updateTrack(id, { fxConfig: nextFx });
    audioService.updateTrackFx(id, nextFx);
  };

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
              onChange={(val) => {
                updateTrack(id, { pan: val });
                audioService.setTrackPan(id, val);
              }}
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
            onChange={(val) => {
              updateTrack(id, { volume: val });
              audioService.setTrackVolume(id, val);
            }}
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
                  : fxConfig.enabled
                    ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                    : 'bg-[#080B12] border-[#26619C]/60 text-[#7C8AA8] hover:text-white'
              }`}
              title="Expand Track Insert FX Chain & Channel Tools"
            >
              {fxConfig.enabled && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              <span>FX</span>
              {isToolsOpen ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
            </button>
          </div>

          {isToolsOpen && (
            <div className="mt-1.5 flex flex-col gap-1.5 p-1.5 rounded bg-[#070A12] border border-[#1E293B]">
              {/* Tab Selector */}
              <div className="flex rounded bg-[#03060C] p-0.5 border border-[#18233C] text-[8px] font-mono">
                <button
                  onClick={() => setActiveTab('fx')}
                  className={`flex-1 py-0.5 font-bold rounded flex items-center justify-center gap-1 transition-all ${
                    activeTab === 'fx'
                      ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 shadow-sm'
                      : 'text-[#64748B] hover:text-white'
                  }`}
                >
                  <Activity size={9} />
                  <span>FX RACK</span>
                </button>
                <button
                  onClick={() => setActiveTab('tools')}
                  className={`flex-1 py-0.5 font-bold rounded flex items-center justify-center gap-1 transition-all ${
                    activeTab === 'tools'
                      ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 shadow-sm'
                      : 'text-[#64748B] hover:text-white'
                  }`}
                >
                  <SlidersHorizontal size={9} />
                  <span>TOOLS</span>
                </button>
              </div>

              {/* FX Rack Tab */}
              {activeTab === 'fx' && (
                <div className="flex flex-col gap-1.5">
                  {/* Master Power Toggle */}
                  <button
                    onClick={() => handleUpdateFx({ enabled: !fxConfig.enabled })}
                    className={`w-full py-1 px-1.5 rounded flex items-center justify-between text-[8px] font-mono font-bold transition-all border cursor-pointer ${
                      fxConfig.enabled 
                        ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.3)]' 
                        : 'bg-[#101420] border-[#2A344E] text-[#64748B]'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${fxConfig.enabled ? 'bg-emerald-400 shadow-[0_0_6px_#34D399]' : 'bg-[#334155]'}`} />
                      <span>INSERT CHAIN</span>
                    </span>
                    <span>{fxConfig.enabled ? 'ACTIVE' : 'BYPASS'}</span>
                  </button>

                  {/* Presets Menu */}
                  <select
                    value=""
                    onChange={(e) => {
                      const preset = FX_PRESETS[e.target.value];
                      if (preset) handleUpdateFx(preset);
                    }}
                    className="w-full bg-[#050811] border border-[#26619C]/60 text-[#94A3B8] text-[8px] font-mono rounded px-1 py-0.5 cursor-pointer"
                  >
                    <option value="" disabled>Load FX Preset...</option>
                    {Object.keys(FX_PRESETS).map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>

                  {/* 3-Band EQ */}
                  <div className="bg-[#0B0F1C] p-1.5 rounded border border-[#1A253D] flex flex-col gap-1 text-[8px] font-mono">
                    <div className="flex justify-between items-center text-[#FF8C00] font-bold">
                      <span>3-BAND EQ</span>
                      <span className="text-[7px]">
                        {fxConfig.eqLow > 0 ? `+${fxConfig.eqLow}` : fxConfig.eqLow} / {fxConfig.eqMid > 0 ? `+${fxConfig.eqMid}` : fxConfig.eqMid} / {fxConfig.eqHigh > 0 ? `+${fxConfig.eqHigh}` : fxConfig.eqHigh} dB
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-center">
                      <div>
                        <span className="text-[#64748B] text-[7px] block">LOW</span>
                        <input 
                          type="range" min="-12" max="12" step="0.5" 
                          value={fxConfig.eqLow} 
                          onChange={e => handleUpdateFx({ eqLow: parseFloat(e.target.value) })}
                          className="w-full h-1 accent-[#FF8C00] bg-[#1E293B] rounded cursor-pointer"
                        />
                      </div>
                      <div>
                        <span className="text-[#64748B] text-[7px] block">MID</span>
                        <input 
                          type="range" min="-12" max="12" step="0.5" 
                          value={fxConfig.eqMid} 
                          onChange={e => handleUpdateFx({ eqMid: parseFloat(e.target.value) })}
                          className="w-full h-1 accent-[#FF8C00] bg-[#1E293B] rounded cursor-pointer"
                        />
                      </div>
                      <div>
                        <span className="text-[#64748B] text-[7px] block">HI</span>
                        <input 
                          type="range" min="-12" max="12" step="0.5" 
                          value={fxConfig.eqHigh} 
                          onChange={e => handleUpdateFx({ eqHigh: parseFloat(e.target.value) })}
                          className="w-full h-1 accent-[#FF8C00] bg-[#1E293B] rounded cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tube Drive / Saturation */}
                  <div className="bg-[#0B0F1C] p-1.5 rounded border border-[#1A253D] flex flex-col gap-0.5 text-[8px] font-mono">
                    <div className="flex justify-between text-[#FF2E63] font-bold">
                      <span>TUBE DRIVE</span>
                      <span>{Math.round(fxConfig.drive * 100)}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="1" step="0.02" 
                      value={fxConfig.drive} 
                      onChange={e => handleUpdateFx({ drive: parseFloat(e.target.value) })}
                      className="w-full h-1 accent-[#FF2E63] bg-[#1E293B] rounded cursor-pointer"
                    />
                  </div>

                  {/* Filter Cutoff */}
                  <div className="bg-[#0B0F1C] p-1.5 rounded border border-[#1A253D] flex flex-col gap-0.5 text-[8px] font-mono">
                    <div className="flex justify-between text-amber-400 font-bold">
                      <span>FILTER CUTOFF</span>
                      <span>{fxConfig.filterCutoff >= 1000 ? `${(fxConfig.filterCutoff / 1000).toFixed(1)}k` : `${Math.round(fxConfig.filterCutoff)}`} Hz</span>
                    </div>
                    <input 
                      type="range" min="100" max="20000" step="100" 
                      value={fxConfig.filterCutoff} 
                      onChange={e => handleUpdateFx({ filterCutoff: parseFloat(e.target.value) })}
                      className="w-full h-1 accent-amber-400 bg-[#1E293B] rounded cursor-pointer"
                    />
                  </div>

                  {/* Delay & Reverb */}
                  <div className="bg-[#0B0F1C] p-1.5 rounded border border-[#1A253D] flex flex-col gap-1 text-[8px] font-mono">
                    <div className="flex justify-between text-[#00F0FF] font-bold">
                      <span>DELAY & REVERB</span>
                    </div>
                    <div className="flex items-center justify-between text-[7px] text-[#94A3B8]">
                      <span>DLY {Math.round(fxConfig.delayMix * 100)}%</span>
                      <input 
                        type="range" min="0" max="1" step="0.05" 
                        value={fxConfig.delayMix} 
                        onChange={e => handleUpdateFx({ delayMix: parseFloat(e.target.value) })}
                        className="w-16 h-1 accent-[#00F0FF] bg-[#1E293B] rounded cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[7px] text-[#94A3B8]">
                      <span>VERB {Math.round(fxConfig.reverbMix * 100)}%</span>
                      <input 
                        type="range" min="0" max="1" step="0.05" 
                        value={fxConfig.reverbMix} 
                        onChange={e => handleUpdateFx({ reverbMix: parseFloat(e.target.value) })}
                        className="w-16 h-1 accent-[#A020F0] bg-[#1E293B] rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tools Tab */}
              {activeTab === 'tools' && (
                <div className="flex flex-col gap-1">
                  {track.type === 'audio' ? (
                    <>
                      <button
                        onClick={() => {
                          if (onOpenBasicPitch) onOpenBasicPitch(track);
                          else handleMidiExtraction();
                        }}
                        disabled={isExtractingMidi}
                        className="w-full py-1 text-[9px] font-mono font-bold text-emerald-300 hover:bg-emerald-500/20 flex items-center justify-center gap-1 bg-[#040814] rounded border border-emerald-500/40 cursor-pointer"
                        title="Transcribe Audio to MIDI via Basic Pitch"
                      >
                        <Cpu size={10} />
                        <span>BASIC PITCH</span>
                      </button>
                      {onOpenChronoMap && (
                        <button
                          onClick={() => onOpenChronoMap(id)}
                          className="w-full py-1 text-[9px] font-mono font-bold text-[#00F0FF] hover:bg-[#00F0FF] hover:text-black flex items-center justify-center gap-1 bg-[#040814] rounded border border-[#00F0FF]/40 cursor-pointer"
                        >
                          <Pin size={10} className="text-[#FFD700] fill-current" />
                          <span>CHRONOMAP</span>
                        </button>
                      )}
                      {onOpenBeamSplitter && (
                        <button
                          onClick={() => onOpenBeamSplitter(id)}
                          className="w-full py-1 text-[9px] font-mono font-bold text-[#FF2E63] hover:bg-[#FF2E63] hover:text-white flex items-center justify-center gap-1 bg-[#14060E] rounded border border-[#FF2E63]/40 cursor-pointer"
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
          )}
        </div>
    </div>
  );
};

export default ChannelStrip;
