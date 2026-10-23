import React, { useState, useRef } from 'react';
import { Track, Clip, TimelineMarker } from '../types';
import TimelineLane from './TimelineLane';
import Toolbar, { ActiveTool } from './Toolbar';
import { snapToGrid } from '../lib/audioUtils';
import { Clock, Sliders, ChevronDown, Pin, Crosshair, Split, LayoutGrid, Magnet } from 'lucide-react';
import SequencerGridOverlay, { ActivePaintingState } from './SequencerGridOverlay';

interface TimelineProps {
  tracks: Track[];
  playheadPosition: number; // 0 to 1
  setPlayheadPosition: (pos: number) => void;
  loopRange: { start: number; end: number };
  setLoopRange: (range: { start: number; end: number }) => void;
  snapValue: string;
  setSnapValue: (value: string) => void;
  tempo: number;
  setTempo: (tempo: number) => void;
  updateTrack: (id: string, updates: Partial<Track>) => void;
  onEdit: (clip: Clip) => void;
  isRecording?: boolean;
  activeLaserTool?: ActiveTool;
  onToolChange?: (tool: ActiveTool) => void;
  timelineMarkers?: TimelineMarker[];
  onOpenBeatmapper?: () => void;
  onOpenBeamSplitter?: () => void;
  selectedTrackId?: string | null;
  onSelectTrack?: (id: string) => void;
  isAutoArmMode?: boolean;
}

const Timeline: React.FC<TimelineProps> = ({ 
  tracks, 
  playheadPosition, 
  setPlayheadPosition, 
  loopRange, 
  setLoopRange, 
  snapValue, 
  setSnapValue, 
  tempo, 
  setTempo, 
  updateTrack, 
  onEdit,
  isRecording = false,
  activeLaserTool,
  onToolChange,
  timelineMarkers,
  onOpenBeatmapper,
  onOpenBeamSplitter,
  selectedTrackId,
  onSelectTrack,
  isAutoArmMode = false
}) => {
  const [internalTool, setInternalTool] = useState<ActiveTool>('laser_audio');
  const activeTool = activeLaserTool || internalTool;
  const setActiveTool = (tool: ActiveTool) => {
    setInternalTool(tool);
    if (onToolChange) onToolChange(tool);
  };

  const [timeSignature, setTimeSignature] = useState<string>('4/4');
  const [showAllEnvelopes, setShowAllEnvelopes] = useState<boolean>(false);
  const [laserPos, setLaserPos] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const [hoverTimeline, setHoverTimeline] = useState<{
    rawBar: number;
    mouseY: number;
    isHovering: boolean;
  }>({ rawBar: 0, mouseY: 0, isHovering: false });
  const [activePainting, setActivePainting] = useState<ActivePaintingState | null>(null);
  const [showGridOverlay, setShowGridOverlay] = useState<boolean>(true);

  const isPaintTool = activeTool === 'laser_audio' || activeTool === 'laser_midi' || activeTool === 'beam';
  const [defaultMarkers] = useState<{ position: number, label: string }[]>([
    { position: 0.125, label: 'Intro' },
    { position: 0.5, label: 'Drop / Chorus' },
    { position: 0.875, label: 'Outro' }
  ]);

  const activeMarkers = timelineMarkers && timelineMarkers.length > 0
    ? timelineMarkers
    : defaultMarkers.map((m, idx) => ({ id: `def-${idx}`, position: m.position, label: m.label, isChronoPin: false }));

  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const rulerRightRef = useRef<HTMLDivElement>(null);
  const tracksWorkspaceRef = useRef<HTMLDivElement>(null);

  // Laser beam properties
  const getLaserProps = () => {
    switch (activeTool) {
      case 'laser_midi':
        return { color: '#10B981', label: '532nm MIDI MATRIX', pulse: 'rgba(16,185,129,0.5)' };
      case 'laser_erase':
      case 'erase':
        return { color: '#EF4444', label: '650nm INCINERATOR', pulse: 'rgba(239,68,68,0.5)' };
      case 'laser_curve':
      case 'draw':
        return { color: '#FFD700', label: '589nm VEGAS NEON', pulse: 'rgba(255,215,0,0.5)' };
      case 'laser_select':
      case 'select':
        return { color: '#A855F7', label: '405nm LODGE BEAM', pulse: 'rgba(168,85,247,0.5)' };
      default:
        return { color: '#00F0FF', label: '488nm AUDIO BEAM', pulse: 'rgba(0,240,255,0.5)' };
    }
  };

  const laser = getLaserProps();

  // Convert current playhead position to Measures : Beats : Ticks display
  const currentTotalBeats = playheadPosition * 16 * 4;
  const currentMeasure = Math.floor(currentTotalBeats / 4) + 1;
  const currentBeat = Math.floor(currentTotalBeats % 4) + 1;
  const currentTick = Math.floor((currentTotalBeats % 1) * 100);

  // Seconds calculation based on BPM
  const totalSeconds = (16 * 4 * 60) / tempo;
  const currentSeconds = playheadPosition * totalSeconds;
  const minutes = Math.floor(currentSeconds / 60);
  const seconds = (currentSeconds % 60).toFixed(2).padStart(5, '0');

  // Toggle all envelopes
  const handleToggleAllEnvelopes = () => {
    const nextState = !showAllEnvelopes;
    setShowAllEnvelopes(nextState);
    tracks.forEach(t => {
      const auto = t.automation;
      if (auto) {
        updateTrack(t.id, {
          automation: {
            ...auto,
            isExpanded: nextState,
            volume: { ...auto.volume, visible: nextState },
            pan: { ...auto.pan, visible: nextState }
          }
        });
      }
    });
  };

  // Relative mouse position within the right timeline sequencer area (excluding w-64 header)
  const getTimelineAreaMousePosition = (e: React.MouseEvent | MouseEvent) => {
    if (!rulerRightRef.current) return 0;
    const rect = rulerRightRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    return Math.max(0, Math.min(1, x / rect.width));
  };

  const handleStartHandleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const handleMouseMove = (ev: MouseEvent) => {
      const newPos = getTimelineAreaMousePosition(ev);
      setLoopRange({ ...loopRange, start: Math.min(newPos, loopRange.end - 0.02) });
    };
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleEndHandleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const handleMouseMove = (ev: MouseEvent) => {
      const newPos = getTimelineAreaMousePosition(ev);
      setLoopRange({ ...loopRange, end: Math.max(newPos, loopRange.start + 0.02) });
    };
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleRulerMouseDown = (e: React.MouseEvent) => {
    const rawPos = getTimelineAreaMousePosition(e);
    const isOff = snapValue === 'freeform' || snapValue === 'off';
    const snappedPos = isOff 
      ? rawPos 
      : Math.max(0, Math.min(1, snapToGrid(rawPos * 16, snapValue) / 16));
    setPlayheadPosition(snappedPos);

    const handleMouseMove = (ev: MouseEvent) => {
      const pos = getTimelineAreaMousePosition(ev);
      setPlayheadPosition(pos);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div 
      ref={timelineContainerRef}
      className="w-full h-96 bg-[#03060B] border border-[#1E293B] rounded-xl relative flex flex-col overflow-hidden shadow-2xl mb-4"
    >
      {/* Top Toolbar */}
      <Toolbar 
        activeTool={activeTool} 
        setActiveTool={setActiveTool} 
        showAllEnvelopes={showAllEnvelopes}
        onToggleAllEnvelopes={handleToggleAllEnvelopes}
      />
      
      {/* Multitrack Measure & Beat Ruler */}
      <div className="h-9 border-b border-[#1E293B] flex items-center bg-[#070A11] shrink-0 select-none z-20">
        {/* Left Header Controls (w-64 matches track headers) */}
        <div className="w-64 h-full border-r border-[#1E293B] bg-[#0A0E17] px-2 flex items-center justify-between shrink-0">
          {/* Time Readout (Time / Measure) */}
          <div className="flex items-center gap-1.5 font-mono">
            <div className="px-1.5 py-0.5 rounded bg-[#03060B] border border-[#1E293B] text-[11px] font-bold text-[#00F0FF] tracking-wider shadow-inner">
              {String(currentMeasure).padStart(2, '0')}.{String(currentBeat).padStart(2, '0')}.{String(currentTick).padStart(2, '0')}
            </div>
            <div className="text-[10px] text-[#64748B] hidden sm:block">
              {minutes}:{seconds}
            </div>
          </div>

            {/* Snap Selector, Grid Overlay Toggle & Chrono-Pin Launch */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-mono text-[#64748B]">SNAP:</span>
                <select 
                  value={snapValue === 'freeform' ? 'off' : snapValue} 
                  onChange={(e) => setSnapValue(e.target.value)}
                  className="bg-[#03060B] text-[#FF8C00] text-[10px] font-mono border border-[#1E293B] rounded px-1 py-0.5 outline-none cursor-pointer hover:border-[#FF8C00]"
                >
                  <option value="1/1">1 Bar</option>
                  <option value="1/2">1/2 Bar</option>
                  <option value="1/4">1/4 Beat</option>
                  <option value="1/8">1/8 Grid</option>
                  <option value="1/16">1/16 Grid</option>
                  <option value="1/8T">1/8 Triplet</option>
                  <option value="1/16T">1/16 Triplet</option>
                  <option value="off">Off (Free)</option>
                </select>
              </div>

              {/* Visual Grid Overlay Toggle Button */}
              <button
                onClick={() => setShowGridOverlay(prev => !prev)}
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold flex items-center gap-1 transition-all ${
                  showGridOverlay
                    ? 'bg-[#00F0FF]/15 border border-[#00F0FF]/60 text-[#00F0FF] shadow-[0_0_8px_rgba(0,240,255,0.25)]'
                    : 'bg-[#0E131F] border border-[#1E293B] text-[#64748B] hover:text-[#94A3B8]'
                }`}
                title="Toggle Sequencer Quantization Grid Overlay"
              >
                <LayoutGrid size={10} />
                <span className="hidden xl:inline">GRID</span>
              </button>

              {onOpenBeatmapper && (
                <button
                  onClick={onOpenBeatmapper}
                  className="px-1.5 py-0.5 rounded bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] text-[9px] font-mono font-bold hover:bg-[#00F0FF] hover:text-black transition-all flex items-center gap-1 shadow-[0_0_8px_rgba(0,240,255,0.25)]"
                  title="Open Chrono-Pin Tempo Mapper to map track tempo and align grid"
                >
                  <Pin size={10} className="text-[#FFD700] fill-current" />
                  <span className="hidden sm:inline">CHRONO-PIN</span>
                </button>
              )}

              {onOpenBeamSplitter && (
                <button
                  onClick={onOpenBeamSplitter}
                  className="px-1.5 py-0.5 rounded bg-[#FF2E63]/15 border border-[#FF2E63]/40 text-[#FF2E63] text-[9px] font-mono font-bold hover:bg-[#FF2E63] hover:text-white transition-all flex items-center gap-1 shadow-[0_0_8px_rgba(255,46,99,0.25)]"
                  title="Open Beam Splitter & Optical Prism Chopper"
                >
                  <Split size={10} className="text-[#00F0FF] transform -rotate-45" />
                  <span className="hidden sm:inline">BEAM SPLIT</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Ruler Area (16 Bars with Measure Ticks) */}
          <div 
            ref={rulerRightRef}
            className="flex-1 h-full relative cursor-pointer bg-[#0A0D15] flex items-center"
            onMouseDown={handleRulerMouseDown}
          >
            {/* Ruler Snap Tick Highlight when Paint Tool is hovering and snapped to quantization */}
            {showGridOverlay && isPaintTool && snapValue !== 'off' && snapValue !== 'freeform' && hoverTimeline.isHovering && (
              <div
                className="absolute top-0 bottom-0 pointer-events-none z-20 flex flex-col items-center transition-all duration-75"
                style={{
                  left: `${(snapToGrid(hoverTimeline.rawBar, snapValue) / 16) * 100}%`,
                  transform: 'translateX(-50%)'
                }}
              >
                <div 
                  className="w-1.5 h-1.5 rotate-45 border"
                  style={{ 
                    backgroundColor: laser.color, 
                    borderColor: '#FFFFFF',
                    boxShadow: `0 0 8px ${laser.color}` 
                  }} 
                />
                <div 
                  className="w-0.5 h-full opacity-80"
                  style={{ backgroundColor: laser.color, boxShadow: `0 0 4px ${laser.color}` }}
                />
              </div>
            )}

            {/* Loop Region Highlight on Ruler */}
            <div 
              className="absolute top-0 bottom-0 bg-[#A855F7]/25 border-y-2 border-[#A855F7] pointer-events-none"
              style={{ 
                left: `${loopRange.start * 100}%`, 
                width: `${(loopRange.end - loopRange.start) * 100}%` 
              }}
            />

          {/* Loop Start Handle */}
          <div 
            className="absolute top-0 w-3 h-full bg-[#A855F7] rounded-r cursor-ew-resize flex items-center justify-center text-[8px] font-bold text-black z-30 shadow-md hover:scale-110 transition-transform" 
            style={{ left: `${loopRange.start * 100}%` }} 
            onMouseDown={handleStartHandleMouseDown}
            title="Loop Start Marker"
          >
            &gt;
          </div>

          {/* Loop End Handle */}
          <div 
            className="absolute top-0 w-3 h-full bg-[#A855F7] rounded-l cursor-ew-resize flex items-center justify-center text-[8px] font-bold text-black z-30 shadow-md hover:scale-110 transition-transform -translate-x-full" 
            style={{ left: `${loopRange.end * 100}%` }} 
            onMouseDown={handleEndHandleMouseDown}
            title="Loop End Marker"
          >
            &lt;
          </div>

          {/* 16 Bars with subdivisions */}
          {Array.from({ length: 16 }).map((_, i) => (
            <div 
              key={i} 
              className="flex-1 h-full border-r border-[#1E293B] relative flex flex-col justify-between px-1 py-0.5 text-[10px] font-mono text-[#94A3B8] select-none"
            >
              <div className="flex items-center justify-between text-[9px]">
                <span className="font-bold text-[#CBD5E1]">{i + 1}</span>
                <span className="text-[7px] text-[#475569] hidden md:inline">.1</span>
              </div>
              {/* Ticks for 4 beats */}
              <div className="flex justify-between w-full h-1.5 opacity-40">
                <div className="w-px h-full bg-[#64748B]" />
                <div className="w-px h-1 bg-[#475569]" />
                <div className="w-px h-1.5 bg-[#64748B]" />
                <div className="w-px h-1 bg-[#475569]" />
              </div>
            </div>
          ))}

          {/* Section Markers & Chrono-Pins */}
          {activeMarkers.map((marker, i) => (
            <div 
              key={marker.id || i} 
              className={`absolute top-0 -translate-x-1/2 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold shadow-md pointer-events-none z-20 flex items-center gap-1 ${
                marker.isChronoPin 
                  ? 'bg-gradient-to-r from-[#00F0FF] to-[#38BDF8] text-black border border-white shadow-[0_0_10px_rgba(0,240,255,0.6)]' 
                  : 'bg-[#A855F7] text-black'
              }`}
              style={{ left: `${marker.position * 100}%` }}
              title={marker.label}
            >
              {marker.isChronoPin && <Pin size={8} className="fill-current text-[#FFD700]" />}
              <span>{marker.label}</span>
            </div>
          ))}

          {/* Ruler Playhead Flag */}
          <div 
            className="absolute top-0 -translate-x-1/2 w-3 h-3 bg-[#FF8C00] rotate-45 pointer-events-none z-30 shadow-[0_0_8px_#FF8C00]"
            style={{ left: `${playheadPosition * 100}%` }}
          />
        </div>
      </div>

      {/* Tracks Scrollable Workspace */}
      <div 
        ref={tracksWorkspaceRef}
        className="flex-1 overflow-y-auto relative bg-[#04060A]"
        onMouseMove={(e) => {
          if (!tracksWorkspaceRef.current) return;
          const rect = tracksWorkspaceRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          setLaserPos({
            x,
            y,
            visible: true
          });

          // Track hover over the sequencer timeline area (excluding w-64 / 16rem track headers)
          const timelineWidth = Math.max(1, rect.width - 256);
          if (x >= 256) {
            const relX = Math.max(0, Math.min(timelineWidth, x - 256));
            const rawBar = (relX / timelineWidth) * 16;
            setHoverTimeline({
              rawBar,
              mouseY: y,
              isHovering: true
            });
          } else {
            setHoverTimeline(prev => ({ ...prev, isHovering: false }));
          }
        }}
        onMouseLeave={() => {
          setLaserPos(prev => ({ ...prev, visible: false }));
          setHoverTimeline(prev => ({ ...prev, isHovering: false }));
        }}
      >
        {/* Visual Quantization Grid Overlay on the Sequencer Timeline */}
        <div 
          className="absolute top-0 bottom-0 pointer-events-none z-10"
          style={{ left: '16rem', right: 0 }}
        >
          <SequencerGridOverlay
            snapValue={snapValue}
            totalBars={16}
            activeTool={activeTool}
            hoverBar={hoverTimeline.isHovering ? hoverTimeline.rawBar : null}
            isHovering={hoverTimeline.isHovering}
            mouseY={hoverTimeline.mouseY}
            activePainting={activePainting}
            tempo={tempo}
            showOverlay={showGridOverlay}
          />
        </div>

        {/* Track Lanes */}
        {tracks.map((track, idx) => (
          <TimelineLane 
            key={track.id} 
            track={track} 
            trackIndex={idx}
            playheadPosition={playheadPosition} 
            activeTool={activeTool} 
            updateTrack={updateTrack}
            timeSignature={timeSignature}
            snapValue={snapValue}
            onEdit={onEdit}
            isRecording={isRecording}
            allTracks={tracks}
            tempo={tempo}
            onPaintChange={setActivePainting}
            isSelected={track.id === selectedTrackId}
            onSelectTrack={onSelectTrack}
            isAutoArmMode={isAutoArmMode}
          />
        ))}

        {/* Interactive Retro-Futuristic Laser Crosshair Reticle */}
        {laserPos.visible && (
          <div 
            className="absolute pointer-events-none z-40"
            style={{ 
              left: `${laserPos.x}px`, 
              top: `${laserPos.y}px`,
              transform: 'translate(-50%, -50%)' 
            }}
          >
            {/* Outer Pulsing Laser Ring */}
            <div 
              className="w-8 h-8 rounded-full border border-dashed animate-spin flex items-center justify-center opacity-80"
              style={{ borderColor: laser.color, animationDuration: '6s' }}
            >
              {/* Inner Targeting Ring */}
              <div 
                className="w-4 h-4 rounded-full border"
                style={{ borderColor: laser.color }}
              />
            </div>
            {/* Core Laser Dot */}
            <div 
              className="w-1.5 h-1.5 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ backgroundColor: laser.color, boxShadow: `0 0 8px ${laser.color}` }}
            />
            {/* Laser Beam Label */}
            <div 
              className="absolute left-6 -top-2 px-1.5 py-0.5 rounded bg-[#060810]/95 border text-[8px] font-mono whitespace-nowrap shadow-lg select-none"
              style={{ borderColor: laser.color, color: laser.color }}
            >
              {laser.label}
            </div>
          </div>
        )}

        {/* Global Playhead Scrubber Line Across All Track Lanes */}
        <div 
          className="absolute top-0 bottom-0 pointer-events-none z-30 flex flex-col items-center"
          style={{ 
            left: `calc(16rem + (100% - 16rem) * ${playheadPosition})`,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="w-0.5 h-full bg-[#FF8C00] shadow-[0_0_10px_rgba(255,140,0,0.9)]" />
        </div>

        {/* Global Loop Range Background across all track lanes */}
        <div 
          className="absolute top-0 bottom-0 pointer-events-none z-10 bg-[#A855F7]/5 border-x border-[#A855F7]/20"
          style={{ 
            left: `calc(16rem + (100% - 16rem) * ${loopRange.start})`,
            width: `calc((100% - 16rem) * ${loopRange.end - loopRange.start})`
          }}
        />
      </div>
    </div>
  );
};

export default Timeline;
