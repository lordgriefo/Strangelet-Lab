import React, { useState, useRef } from 'react';
import { Track, Clip } from '../types';
import { snapToGrid, volumeToDb, panToString, getDefaultAutomation } from '../lib/audioUtils';
import AutomationLane from './AutomationLane';
import { ActiveTool } from './Toolbar';
import { playLaserBeamSound } from '../lib/laserSound';
import { midiToNoteName } from '../services/basicPitchService';
import { 
  Volume2, Compass, Waves, Music, ChevronDown, ChevronRight, 
  Pencil, Sliders, Scissors, Zap, Trash2, CircleDot, Flame, Sparkles,
  GripVertical, ChevronLeft
} from 'lucide-react';

interface TimelineLaneProps {
  track: Track;
  trackIndex: number;
  playheadPosition: number;
  activeTool: ActiveTool;
  updateTrack: (id: string, updates: Partial<Track>) => void;
  timeSignature?: string;
  snapValue: string;
  onEdit: (clip: Clip) => void;
  isRecording?: boolean;
}

const TimelineLane: React.FC<TimelineLaneProps> = ({ 
  track, 
  trackIndex, 
  playheadPosition, 
  activeTool, 
  updateTrack, 
  timeSignature = '4/4', 
  snapValue, 
  onEdit,
  isRecording = false
}) => {
  const { id, name, muted, soloed, phaseInverted, color, volume, pan, clips, type, isArmedForRecord } = track;
  
  // Ensure track automation object exists
  const automation = track.automation || getDefaultAutomation(volume, pan);
  const isExpanded = automation.isExpanded ?? (automation.volume.visible || automation.pan.visible);

  // Active parameter for direct track display or expanded lane
  const activeParam = automation.activeParameter || (automation.volume.visible ? 'volume' : 'pan');

  // Time grid math
  const beatsPerBar = parseInt(timeSignature.split('/')[0]) || 4;
  const totalBars = 16;
  const totalBeats = totalBars * beatsPerBar;
  const gridLines = Array.from({ length: totalBeats * 4 + 1 }, (_, i) => i);

  // Toggle Record Arm
  const handleToggleArmRecord = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateTrack(id, { isArmedForRecord: !isArmedForRecord });
  };

  // Toggle volume envelope
  const handleToggleVolumeEnv = (e: React.MouseEvent) => {
    e.stopPropagation();
    const current = automation.volume;
    const newVisible = !current.visible;
    const updatedAutomation = {
      ...automation,
      volume: {
        ...current,
        visible: newVisible,
        enabled: newVisible ? true : current.enabled
      },
      activeParameter: 'volume' as const,
      isExpanded: newVisible || automation.pan.visible
    };
    updateTrack(id, { automation: updatedAutomation });
  };

  // Toggle pan envelope
  const handleTogglePanEnv = (e: React.MouseEvent) => {
    e.stopPropagation();
    const current = automation.pan;
    const newVisible = !current.visible;
    const updatedAutomation = {
      ...automation,
      pan: {
        ...current,
        visible: newVisible,
        enabled: newVisible ? true : current.enabled
      },
      activeParameter: 'pan' as const,
      isExpanded: newVisible || automation.volume.visible
    };
    updateTrack(id, { automation: updatedAutomation });
  };

  // Toggle expanded sub-lane
  const handleToggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateTrack(id, {
      automation: {
        ...automation,
        isExpanded: !isExpanded
      }
    });
  };

  const laneAreaRef = useRef<HTMLDivElement>(null);
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
  const [dragPreviewStartBar, setDragPreviewStartBar] = useState<number | null>(null);

  // Handle clicking on the clip area with laser tools
  const handleLaneClick = (e: React.MouseEvent) => {
    const isAudioLaser = activeTool === 'laser_audio' || activeTool === 'beam';
    const isMidiLaser = activeTool === 'laser_midi';
    const isCurveLaser = activeTool === 'laser_curve' || activeTool === 'draw';

    if (isAudioLaser || isMidiLaser) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const bar = (x / rect.width) * 16;
      const isOff = snapValue === 'off' || snapValue === 'freeform';
      const snappedBar = isOff ? bar : snapToGrid(bar, snapValue);

      // Generate initial melodic/harmonic notes for laser-placed MIDI clip with humanized velocities
      let motifNotes: any = undefined;
      if (isMidiLaser) {
        const isHumanize = track.midiConfig?.humanizeEnabled ?? track.humanizeEnabled ?? true;
        const jitterAmt = track.midiConfig?.humanizeAmount ?? track.humanizeAmount ?? 0.18;
        const baseVel = 95;
        const maxDelta = Math.round(jitterAmt * 80);
        const initialMotifPitches = [60, 64, 67, 72]; // C4, E4, G4, C5
        motifNotes = initialMotifPitches.map((p, idx) => {
          const velOffset = isHumanize ? Math.round((Math.random() * 2 - 1) * maxDelta) : 0;
          return {
            id: `mn-${Date.now()}-${idx}`,
            pitch: p,
            noteName: midiToNoteName(p),
            startBar: idx * 0.5,
            startTimeSeconds: idx * 0.5 * 2,
            durationBars: 0.5,
            durationSeconds: 1,
            velocity: Math.max(20, Math.min(127, baseVel + velOffset)),
            confidence: 1.0
          };
        });
      }
      
      const newClip: Clip = {
        id: `clip-${Math.random().toString(36).substr(2, 7)}`,
        name: isMidiLaser ? `${name} Synth Loop` : `${name} Audio Loop`,
        startBar: Math.max(0, Math.min(14, Number(snappedBar.toFixed(4)))),
        durationBars: 2,
        isMidi: isMidiLaser,
        midiNotes: motifNotes,
        instrument: track.instrument || 'SFZ Grand Piano'
      };
      
      playLaserBeamSound(isMidiLaser ? 'laser_midi' : 'laser_audio');
      updateTrack(id, { clips: [...clips, newClip] });
    } else if (isCurveLaser) {
      playLaserBeamSound('laser_curve');
      if (!automation.volume.visible && !automation.pan.visible) {
        updateTrack(id, {
          automation: {
            ...automation,
            volume: { ...automation.volume, visible: true }
          }
        });
      }
    }
  };

  const handleClipMouseDown = (e: React.MouseEvent, clip: Clip) => {
    const isEraseTool = activeTool === 'laser_erase' || activeTool === 'erase';
    if (isEraseTool) {
      return;
    }

    e.stopPropagation();
    const startX = e.clientX;
    const initialStartBar = clip.startBar;
    let hasMoved = false;

    const handleMouseMove = (ev: MouseEvent) => {
      if (!laneAreaRef.current) return;
      const rect = laneAreaRef.current.getBoundingClientRect();
      const deltaX = ev.clientX - startX;
      
      if (Math.abs(deltaX) > 2) {
        hasMoved = true;
      }
      if (!hasMoved) return;

      const deltaBars = (deltaX / rect.width) * 16;
      const rawBar = initialStartBar + deltaBars;
      const maxBar = Math.max(0, 16 - clip.durationBars);
      const clampedRaw = Math.max(0, Math.min(maxBar, rawBar));

      const isOff = snapValue === 'off' || snapValue === 'freeform';
      const finalBar = isOff
        ? Number(clampedRaw.toFixed(3))
        : Math.max(0, Math.min(maxBar, Number(snapToGrid(clampedRaw, snapValue).toFixed(4))));

      setDraggingClipId(clip.id);
      setDragPreviewStartBar(finalBar);

      const updatedClips = clips.map(c => c.id === clip.id ? { ...c, startBar: finalBar } : c);
      updateTrack(id, { clips: updatedClips });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setDraggingClipId(null);
      setDragPreviewStartBar(null);
      if (!hasMoved) {
        onEdit(clip);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleNudgeClip = (e: React.MouseEvent, clipId: string, direction: -1 | 1) => {
    e.stopPropagation();
    let step = 0.25;
    if (snapValue === '1/4') step = 0.25;
    else if (snapValue === '1/8') step = 0.125;
    else if (snapValue === '1/16') step = 0.0625;
    else if (snapValue === 'off' || snapValue === 'freeform') step = 0.25;

    const targetClip = clips.find(c => c.id === clipId);
    if (!targetClip) return;
    const maxBar = Math.max(0, 16 - targetClip.durationBars);
    const newBar = Math.max(0, Math.min(maxBar, Number((targetClip.startBar + direction * step).toFixed(4))));
    const updatedClips = clips.map(c => c.id === clipId ? { ...c, startBar: newBar } : c);
    updateTrack(id, { clips: updatedClips });
  };

  const removeClip = (clipId: string) => {
    playLaserBeamSound('laser_erase');
    updateTrack(id, { clips: clips.filter(c => c.id !== clipId) });
  };

  // Check if automation overlay should be rendered on top of clips
  const showDirectOverlay = (automation.volume.visible || automation.pan.visible) && !isExpanded;

  return (
    <div className="border-b border-[#1A2234] bg-[#07090E] flex flex-col transition-colors">
      {/* Primary Track Row */}
      <div className="h-16 flex items-stretch relative">
        {/* Track Header */}
        <div className="w-64 border-r border-[#1E293B] bg-[#0A0D15] p-2 flex flex-col justify-between shrink-0 select-none z-10">
          {/* Top Row: Track Number, Name, Type icon, M/S/Phase */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              {/* Color tag & Track index */}
              <div 
                className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono font-bold text-black shrink-0 shadow-sm"
                style={{ backgroundColor: color }}
              >
                {String(trackIndex + 1).padStart(2, '0')}
              </div>
              <div className="truncate flex items-center gap-1 min-w-0">
                {type === 'midi' ? (
                  <Music size={11} className="text-[#A855F7] shrink-0" />
                ) : (
                  <Waves size={11} className="text-[#38BDF8] shrink-0" />
                )}
                <span className="text-xs font-semibold text-[#E2E8F0] truncate" title={name}>
                  {name}
                </span>
              </div>
            </div>

            {/* Record Arm, Mute, Solo, Phase Buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleToggleArmRecord}
                className={`px-1.5 h-5 rounded text-[8px] font-mono font-bold transition-all flex items-center gap-0.5 ${
                  isArmedForRecord 
                    ? 'bg-[#EF4444] text-white border border-[#EF4444] shadow-[0_0_8px_#EF4444] animate-pulse' 
                    : 'bg-[#181116] text-[#78350F] border border-[#3E1B1B] hover:text-[#EF4444] hover:border-[#EF4444]/40'
                }`}
                title={isArmedForRecord ? "Track Armed for Live Recording" : "Arm Track for Recording"}
              >
                <CircleDot size={8} className={isArmedForRecord ? 'animate-ping' : ''} />
                <span>REC</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); updateTrack(id, { muted: !muted }); }}
                className={`w-5 h-5 rounded text-[9px] font-mono font-bold transition-all ${
                  muted 
                    ? 'bg-[#EF4444] text-white border border-[#EF4444] shadow-[0_0_6px_rgba(239,68,68,0.5)]' 
                    : 'bg-[#121622] text-[#64748B] border border-[#1E293B] hover:text-[#94A3B8]'
                }`}
                title="Mute Track"
              >
                M
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); updateTrack(id, { soloed: !soloed }); }}
                className={`w-5 h-5 rounded text-[9px] font-mono font-bold transition-all ${
                  soloed 
                    ? 'bg-[#F59E0B] text-black border border-[#F59E0B] shadow-[0_0_6px_rgba(245,158,11,0.5)]' 
                    : 'bg-[#121622] text-[#64748B] border border-[#1E293B] hover:text-[#94A3B8]'
                }`}
                title="Solo Track"
              >
                S
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); updateTrack(id, { phaseInverted: !phaseInverted }); }}
                className={`w-5 h-5 rounded text-[9px] font-mono font-bold transition-all ${
                  phaseInverted 
                    ? 'bg-[#A855F7] text-white border border-[#A855F7]' 
                    : 'bg-[#121622] text-[#64748B] border border-[#1E293B] hover:text-[#94A3B8]'
                }`}
                title="Invert Phase (Ø)"
              >
                Ø
              </button>
            </div>
          </div>

          {/* Bottom Row: Envelope Toggles (Vol / Pan) & Expand Drawer */}
          <div className="flex items-center justify-between gap-1 mt-1 pt-1 border-t border-[#131B2A]">
            <div className="flex items-center gap-1">
              {/* Volume Envelope Toggle */}
              <button
                onClick={handleToggleVolumeEnv}
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold flex items-center gap-1 transition-all ${
                  automation.volume.visible 
                    ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF] shadow-[0_0_6px_rgba(0,240,255,0.4)]' 
                    : 'bg-[#121622] text-[#64748B] border border-[#1E293B] hover:text-[#00F0FF]'
                }`}
                title="Toggle Volume Automation Envelope"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${automation.volume.visible ? 'bg-[#00F0FF]' : 'bg-[#475569]'}`} />
                <span>VOL</span>
              </button>

              {/* Pan Envelope Toggle */}
              <button
                onClick={handleTogglePanEnv}
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold flex items-center gap-1 transition-all ${
                  automation.pan.visible 
                    ? 'bg-[#FF8C00]/20 text-[#FF8C00] border border-[#FF8C00] shadow-[0_0_6px_rgba(255,140,0,0.4)]' 
                    : 'bg-[#121622] text-[#64748B] border border-[#1E293B] hover:text-[#FF8C00]'
                }`}
                title="Toggle Pan Automation Envelope"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${automation.pan.visible ? 'bg-[#FF8C00]' : 'bg-[#475569]'}`} />
                <span>PAN</span>
              </button>

              {/* MIDI Humanize Quick Toggle */}
              {type === 'midi' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const cur = track.midiConfig?.humanizeEnabled ?? track.humanizeEnabled ?? true;
                    updateTrack(id, {
                      humanizeEnabled: !cur,
                      midiConfig: {
                        ...track.midiConfig,
                        humanizeEnabled: !cur,
                        humanizeAmount: track.midiConfig?.humanizeAmount ?? track.humanizeAmount ?? 0.18
                      }
                    });
                    playLaserBeamSound('laser_select');
                  }}
                  className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold flex items-center gap-0.5 transition-all ${
                    (track.midiConfig?.humanizeEnabled ?? track.humanizeEnabled ?? true)
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 shadow-[0_0_6px_rgba(16,185,129,0.3)]'
                      : 'bg-[#121622] text-[#64748B] border border-[#1E293B]'
                  }`}
                  title="MIDI Humanize: Applies subtle randomized velocity offsets to synthetic notes"
                >
                  <Sparkles size={8} className="text-emerald-400" />
                  <span>HUMAN</span>
                </button>
              )}

              {/* Volume & Pan values preview */}
              <span className="text-[9px] font-mono text-[#64748B] ml-1">
                {volumeToDb(volume)}
              </span>
            </div>

            {/* Expand / Collapse Sub-Lane Button */}
            <button
              onClick={handleToggleExpanded}
              className={`p-1 rounded text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors flex items-center gap-0.5 text-[9px] font-mono`}
              title={isExpanded ? 'Collapse Automation Lanes' : 'Expand Automation Lanes'}
            >
              <span>ENV</span>
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          </div>
        </div>

        {/* Clip and Track Sequencer Area */}
        <div 
          ref={laneAreaRef}
          className="flex-1 h-full relative cursor-pointer overflow-hidden group select-none"
          onClick={handleLaneClick}
        >
          {/* Subtle horizontal track background & beat grid */}
          {gridLines.map(line => (
            <div 
              key={line} 
              className={`absolute top-0 bottom-0 w-px ${
                line % 16 === 0 
                  ? 'bg-[#334155]/60' 
                  : line % 4 === 0 
                    ? 'bg-[#1E293B]/40' 
                    : 'bg-[#0F172A]/25'
              }`} 
              style={{ left: `${(line / (totalBeats * 4)) * 100}%` }} 
            />
          ))}

          {/* Clips Rendered Across Timeline */}
          {clips.map(clip => {
            const isEraseTool = activeTool === 'laser_erase' || activeTool === 'erase';
            const isMidiClip = clip.isMidi || type === 'midi';
            const isCurrentlyDragging = draggingClipId === clip.id;

            return (
              <div 
                key={clip.id}
                className={`absolute top-1.5 bottom-1.5 rounded flex flex-col justify-between p-1 transition-all overflow-hidden shadow-md group/clip select-none ${
                  isEraseTool
                    ? 'cursor-pointer hover:border-[#EF4444] hover:shadow-[0_0_12px_rgba(239,68,68,0.7)]'
                    : isCurrentlyDragging
                      ? 'cursor-grabbing ring-2 ring-[#FF8C00] shadow-[0_0_15px_rgba(255,140,0,0.6)] z-30'
                      : isMidiClip 
                        ? 'cursor-grab active:cursor-grabbing bg-[#061510] border border-[#10B981]/50 hover:border-[#10B981]' 
                        : 'cursor-grab active:cursor-grabbing bg-[#0B1322] border border-[#26619C] hover:border-[#00F0FF]'
                }`}
                style={{ 
                  left: `${(clip.startBar / 16) * 100}%`, 
                  width: `${(clip.durationBars / 16) * 100}%`,
                  borderLeftWidth: '3px',
                  borderLeftColor: isMidiClip ? '#10B981' : (color || '#00F0FF')
                }}
                onMouseDown={(e) => handleClipMouseDown(e, clip)}
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (isEraseTool) {
                    removeClip(clip.id);
                  }
                }}
                title={`${clip.name} (Start: Bar ${clip.startBar.toFixed(2)} • Drag horizontally to snap to ${snapValue} grid • Click to edit)`}
              >
                {/* Clip Title Bar */}
                <div className="flex items-center justify-between text-[9px] font-mono text-[#94A3B8] truncate gap-1">
                  <div className="flex items-center gap-1 truncate">
                    {!isEraseTool && (
                      <GripVertical size={9} className="opacity-40 hover:opacity-100 shrink-0 text-[#94A3B8]" />
                    )}
                    {isMidiClip ? (
                      <Music size={10} className="text-[#10B981] shrink-0" />
                    ) : (
                      <Waves size={10} className="text-[#00F0FF] shrink-0" />
                    )}
                    <span className="truncate font-semibold text-white/90">{clip.name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Quick Nudge Buttons on hover */}
                    <div className="hidden group-hover/clip:flex items-center bg-black/70 rounded px-0.5 border border-[#334155]/60 text-[8px]">
                      <button 
                        onClick={(e) => handleNudgeClip(e, clip.id, -1)}
                        className="hover:text-amber-400 px-0.5" 
                        title={`Nudge back by ${snapValue} grid`}
                      >
                        ◀
                      </button>
                      <button 
                        onClick={(e) => handleNudgeClip(e, clip.id, 1)}
                        className="hover:text-amber-400 px-0.5"
                        title={`Nudge forward by ${snapValue} grid`}
                      >
                        ▶
                      </button>
                    </div>

                    <span className="text-[8px] font-mono font-bold text-amber-300/90 bg-amber-950/70 border border-amber-500/30 px-1 rounded">
                      {clip.startBar.toFixed(2)}b
                    </span>
                    <span className="text-[8px] opacity-60">{clip.durationBars}b</span>
                  </div>
                </div>

                {/* Drag Snap Indicator Overlay */}
                {isCurrentlyDragging && (
                  <div className="absolute inset-0 bg-[#FF8C00]/20 flex items-center justify-center pointer-events-none z-10">
                    <span className="px-1.5 py-0.5 rounded bg-black/90 border border-[#FF8C00] text-[9px] font-mono font-bold text-[#FF8C00] shadow-lg">
                      SNAP {snapValue}: BAR {clip.startBar.toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Waveform / MIDI Note Matrix Representation */}
                {isMidiClip ? (
                  <div className="flex flex-col justify-around h-6 w-full opacity-80 overflow-hidden py-0.5 relative">
                    {clip.midiNotes && clip.midiNotes.length > 0 ? (
                      <div className="relative w-full h-full">
                        {clip.midiNotes.slice(0, 24).map(mn => {
                          const relLeft = (mn.startBar / clip.durationBars) * 100;
                          const relWidth = Math.max(3, (mn.durationBars / clip.durationBars) * 100);
                          const pitchY = ((84 - Math.max(36, Math.min(84, mn.pitch))) / 48) * 100;
                          const velAlpha = 0.5 + (mn.velocity / 127) * 0.5;
                          return (
                            <div
                              key={mn.id}
                              className="absolute rounded-xs bg-[#10B981]"
                              style={{
                                left: `${relLeft}%`,
                                width: `${relWidth}%`,
                                top: `${pitchY}%`,
                                height: '2px',
                                opacity: velAlpha
                              }}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <>
                        {/* Simulated MIDI Piano Roll Steps */}
                        <div className="flex gap-1 h-1.5">
                          <div className="w-3 bg-[#10B981] rounded-xs shadow-[0_0_4px_#10B981]" />
                          <div className="w-5 bg-[#10B981] rounded-xs ml-2" />
                          <div className="w-2 bg-[#10B981] rounded-xs ml-1" />
                        </div>
                        <div className="flex gap-1 h-1.5">
                          <div className="w-4 bg-[#34D399] rounded-xs ml-4" />
                          <div className="w-3 bg-[#34D399] rounded-xs ml-2" />
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-0.5 h-6 w-full opacity-70 overflow-hidden">
                    {Array.from({ length: 28 }).map((_, wIdx) => {
                      const barH = 20 + Math.sin((wIdx + clip.startBar * 2) * 0.8) * 14;
                      return (
                        <div 
                          key={wIdx} 
                          className="flex-1 rounded-full" 
                          style={{ 
                            height: `${Math.max(4, barH)}px`,
                            backgroundColor: color || '#00F0FF',
                            opacity: 0.85
                          }} 
                        />
                      );
                    })}
                  </div>
                )}

                {/* Incinerator Laser Hover Overlay */}
                {isEraseTool && (
                  <div className="absolute inset-0 bg-red-950/85 flex items-center justify-center text-red-300 font-mono text-[10px] font-bold gap-1 border border-red-500 animate-pulse">
                    <Flame size={12} className="text-[#EF4444]" />
                    <span>INCINERATE</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Live Recording Take Visualization Bar when Armed & Recording */}
          {isRecording && isArmedForRecord && (
            <div 
              className="absolute top-1 bottom-1 rounded bg-[#EF4444]/25 border-2 border-[#EF4444] shadow-[0_0_15px_rgba(239,68,68,0.6)] flex items-center px-2 z-20 pointer-events-none animate-pulse"
              style={{
                left: `${playheadPosition * 100}%`,
                width: '12%'
              }}
            >
              <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-[#EF4444]">
                <CircleDot size={10} className="animate-ping" />
                <span>REC TAKE IN PROGRESS...</span>
              </div>
            </div>
          )}

          {/* Direct Automation Overlay on Top of Track (when not expanded or active) */}
          {showDirectOverlay && (
            <div className="absolute inset-0 pointer-events-auto">
              {automation.volume.visible && (
                <AutomationLane
                  track={track}
                  param="volume"
                  playheadPosition={playheadPosition}
                  activeTool={activeTool}
                  snapValue={snapValue}
                  updateTrack={updateTrack}
                  height={64}
                  isOverlay={true}
                />
              )}
              {automation.pan.visible && !automation.volume.visible && (
                <AutomationLane
                  track={track}
                  param="pan"
                  playheadPosition={playheadPosition}
                  activeTool={activeTool}
                  snapValue={snapValue}
                  updateTrack={updateTrack}
                  height={64}
                  isOverlay={true}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expanded Dedicated Automation Sub-Lanes */}
      {isExpanded && (
        <div className="flex flex-col bg-[#05070B] border-t border-[#131B2A]">
          {/* Volume Automation Sub-Lane */}
          {automation.volume.visible && (
            <div className="flex items-stretch border-b border-[#0F172A] relative">
              {/* Sub-Lane Left Label */}
              <div className="w-64 border-r border-[#1E293B] bg-[#070A12] p-2 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00F0FF] shadow-[0_0_6px_#00F0FF]" />
                  <span className="text-[11px] font-mono font-bold text-[#00F0FF]">VOLUME ENVELOPE</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      updateTrack(id, {
                        automation: {
                          ...automation,
                          volume: { ...automation.volume, visible: false }
                        }
                      });
                    }}
                    className="text-[9px] font-mono text-[#64748B] hover:text-red-400 px-1"
                    title="Hide volume envelope"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Dedicated Drawing Canvas */}
              <div className="flex-1 relative">
                <AutomationLane
                  track={track}
                  param="volume"
                  playheadPosition={playheadPosition}
                  activeTool={activeTool}
                  snapValue={snapValue}
                  updateTrack={updateTrack}
                  height={80}
                  isOverlay={false}
                />
              </div>
            </div>
          )}

          {/* Pan Automation Sub-Lane */}
          {automation.pan.visible && (
            <div className="flex items-stretch border-b border-[#0F172A] relative">
              {/* Sub-Lane Left Label */}
              <div className="w-64 border-r border-[#1E293B] bg-[#070A12] p-2 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FF8C00] shadow-[0_0_6px_#FF8C00]" />
                  <span className="text-[11px] font-mono font-bold text-[#FF8C00]">PAN ENVELOPE</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      updateTrack(id, {
                        automation: {
                          ...automation,
                          pan: { ...automation.pan, visible: false }
                        }
                      });
                    }}
                    className="text-[9px] font-mono text-[#64748B] hover:text-red-400 px-1"
                    title="Hide pan envelope"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Dedicated Drawing Canvas */}
              <div className="flex-1 relative">
                <AutomationLane
                  track={track}
                  param="pan"
                  playheadPosition={playheadPosition}
                  activeTool={activeTool}
                  snapValue={snapValue}
                  updateTrack={updateTrack}
                  height={80}
                  isOverlay={false}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TimelineLane;
