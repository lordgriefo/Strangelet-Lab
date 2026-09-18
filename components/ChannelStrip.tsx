import React, { useState, useRef, useEffect } from 'react';
import { Track, Clip } from '../types';
import Knob from './Knob';
import { Power, Music, Waves, GitCommit, Sparkles, Zap, Mic, Cpu, Scissors, Sliders, Crosshair, Pin, Split } from 'lucide-react';
import VstModal from './VstModal';
import { evaluateAutomationAt, volumeToDb, panToString } from '../lib/audioUtils';

interface ChannelStripProps {
  track: Track;
  updateTrack: (id: string, updates: Partial<Track>) => void;
  onShowMidi?: (data: string) => void;
  onEdit?: (clip: Clip) => void;
  playheadPosition?: number;
  onOpenBeatmapper?: (trackId: string) => void;
  onOpenBeamSplitter?: (trackId: string) => void;
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
  onOpenBeamSplitter
}) => {
  const { id, name, volume, pan, muted, soloed, color, phaseInverted, isMono, vstBypassed, automation } = track;
  const [isVstModalOpen, setIsVstModalOpen] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isExtractingMidi, setIsExtractingMidi] = useState(false);

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
        className="w-40 h-full bg-[#151515] border border-[#333] rounded-lg flex flex-col items-center p-2 relative shrink-0 border-t-4"
        style={{ borderTopColor: color }}
    >
        {/* VST Modal */}
        <VstModal 
            isOpen={isVstModalOpen} 
            onClose={() => setIsVstModalOpen(false)} 
            onApply={(vst) => {
                console.log(`Applying VST: ${vst} to track: ${name}`);
                updateTrack(id, { vstBypassed: false });
            }}
        />

        {/* VST & Name */}
        <div className="w-full text-center p-2">
            <button onClick={() => setIsVstModalOpen(true)} className={`w-full flex items-center justify-center gap-2 text-xs py-1 rounded ${vstBypassed ? 'bg-[#222] text-[#666]' : 'bg-[#10B981]/20 text-[#10B981]'}`}>
                <Power size={12} /> {vstBypassed ? 'BYPASSED' : 'VST ACTIVE'}
            </button>
            <p className="font-bold text-white mt-1.5 truncate text-xs">{name}</p>
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
        <Knob 
            label="PAN" 
            value={currentPan} 
            min={-1} 
            max={1} 
            onChange={(val) => updateTrack(id, { pan: val })}
        />

        {/* Fader */}
        <div className="w-full flex-1 my-4">
            <Fader value={currentVolume} onChange={(val) => updateTrack(id, { volume: val })} />
        </div>
        
        {/* Record Arm / Mute / Solo / Phase */}
        <div className="flex gap-1.5 w-full p-1 justify-center">
            <button 
              onClick={() => updateTrack(id, { isArmedForRecord: !track.isArmedForRecord })} 
              className={`w-full py-1.5 rounded text-[10px] font-bold border transition-all ${
                track.isArmedForRecord 
                  ? 'bg-[#EF4444] border-white text-white shadow-[0_0_8px_#EF4444] animate-pulse font-black' 
                  : 'bg-[#181014] border-[#3E1B1B] text-[#78350F] hover:text-[#EF4444] hover:border-[#EF4444]'
              }`}
              title={track.isArmedForRecord ? "Track is Armed for Recording" : "Arm Track for Recording"}
            >
              REC
            </button>
            <button onClick={() => updateTrack(id, { muted: !muted })} className={`w-full py-1.5 rounded text-xs font-bold border ${muted ? 'bg-red-900 border-red-500 text-red-100' : 'bg-[#000000] border-[#26619C] text-[#666]'}`}>M</button>
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
                onClick={handleMidiExtraction}
                disabled={isExtractingMidi}
                title="Trigger MIDI note detection"
                className={`flex-1 py-1 text-xs text-[#555] hover:text-[#FF8C00] flex items-center justify-center gap-1 bg-[#000000] rounded border border-[#26619C] ${isExtractingMidi ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <Cpu size={12} /> {isExtractingMidi ? '...' : 'MIDI'}
            </button>
            <button 
                onClick={handleMidiExtraction}
                disabled={isExtractingMidi}
                title="Extract MIDI data from audio clip"
                className={`flex-1 py-1 text-xs text-[#555] hover:text-[#FF8C00] flex items-center justify-center gap-1 bg-[#000000] rounded border border-[#26619C] ${isExtractingMidi ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <Music size={12} /> {isExtractingMidi ? '...' : 'MIDI Ext'}
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
    </div>
  );
};

export default ChannelStrip;
