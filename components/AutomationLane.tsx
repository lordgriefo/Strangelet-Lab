import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { AutomationPoint, AutomationLaneConfig, Track } from '../types';
import { snapToGrid, volumeToDb, panToString, simplifyDrawnPoints, generateAutomationPreset, evaluateAutomationAt } from '../lib/audioUtils';
import { 
  Volume2, Compass, Pencil, Plus, Trash2, RotateCcw, 
  Sparkles, TrendingUp, TrendingDown, Activity, Sliders, Check
} from 'lucide-react';

interface AutomationLaneProps {
  track: Track;
  param: 'volume' | 'pan';
  playheadPosition: number; // 0 to 1
  activeTool: string;
  snapValue: string;
  updateTrack: (id: string, updates: Partial<Track>) => void;
  height?: number;
  isOverlay?: boolean;
}

const AutomationLane: React.FC<AutomationLaneProps> = ({
  track,
  param,
  playheadPosition,
  activeTool,
  snapValue,
  updateTrack,
  height = 96,
  isOverlay = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawnStroke, setDrawnStroke] = useState<{ x: number; y: number; time: number; value: number }[]>([]);
  const [dragTooltip, setDragTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [activePresetMenu, setActivePresetMenu] = useState<boolean>(false);

  // Get current parameter automation configuration
  const automation = track.automation;
  const laneConfig: AutomationLaneConfig = useMemo(() => {
    if (automation && automation[param]) {
      return automation[param];
    }
    // Fallback default points
    const defaultVal = param === 'volume' ? track.volume : track.pan;
    return {
      enabled: false,
      visible: true,
      points: [
        { id: `init-1`, time: 0, value: defaultVal },
        { id: `init-2`, time: 1, value: defaultVal }
      ]
    };
  }, [automation, param, track.volume, track.pan]);

  const points = useMemo(() => {
    return [...laneConfig.points].sort((a, b) => a.time - b.time);
  }, [laneConfig.points]);

  const isVolume = param === 'volume';
  const strokeColor = isVolume ? '#00F0FF' : '#FF8C00';
  const fillColor = isVolume ? 'rgba(0, 240, 255, 0.12)' : 'rgba(255, 140, 0, 0.12)';
  const glowColor = isVolume ? 'rgba(0, 240, 255, 0.6)' : 'rgba(255, 140, 0, 0.6)';

  // Helper to commit updated points back to track state
  const commitPoints = useCallback((newPoints: AutomationPoint[]) => {
    const updatedAutomation = {
      ...track.automation,
      volume: track.automation?.volume || { enabled: false, visible: false, points: [] },
      pan: track.automation?.pan || { enabled: false, visible: false, points: [] },
      [param]: {
        ...laneConfig,
        enabled: true, // Automatically enable automation once points are edited
        points: newPoints.sort((a, b) => a.time - b.time)
      }
    };
    updateTrack(track.id, { automation: updatedAutomation });
  }, [track.id, track.automation, param, laneConfig, updateTrack]);

  // Coordinate Conversion:
  // time (0..1) -> X (0..width)
  // value -> Y (0..height)
  // For volume: value 1.0 is top (y=8), value 0 is bottom (y=height-8)
  // For pan: value -1 (Left) is top (y=8), value 0 (Center) is middle (height/2), value +1 (Right) is bottom (y=height-8)
  const timeToX = useCallback((time: number, width: number) => {
    return Math.max(0, Math.min(width, time * width));
  }, []);

  const valueToY = useCallback((val: number, h: number) => {
    const pad = 10;
    const effH = h - pad * 2;
    if (isVolume) {
      // Linear volume 0 to 1.0 (clamped)
      const norm = Math.max(0, Math.min(1, val));
      return pad + (1 - norm) * effH;
    } else {
      // Pan: -1 (Left, top) to +1 (Right, bottom)
      const norm = Math.max(0, Math.min(1, (val + 1) / 2));
      return pad + (1 - norm) * effH;
    }
  }, [isVolume]);

  const xToTime = useCallback((x: number, width: number) => {
    return Math.max(0, Math.min(1, x / width));
  }, []);

  const yToValue = useCallback((y: number, h: number) => {
    const pad = 10;
    const effH = h - pad * 2;
    const norm = Math.max(0, Math.min(1, 1 - (y - pad) / effH));
    if (isVolume) {
      return Math.max(0, Math.min(1, Number(norm.toFixed(3))));
    } else {
      const pan = norm * 2 - 1;
      return Math.max(-1, Math.min(1, Number(pan.toFixed(3))));
    }
  }, [isVolume]);

  // Generate SVG Path data for smooth curve
  const pathD = useMemo(() => {
    if (!containerRef.current || points.length === 0) {
      // Fallback coordinate space 1000 x height
      const w = 1000;
      const pts = points.map(p => ({ x: timeToX(p.time, w), y: valueToY(p.value, height) }));
      return pts.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
    }
    const width = containerRef.current.clientWidth || 1000;
    const pts = points.map(p => ({ x: timeToX(p.time, width), y: valueToY(p.value, height) }));

    return pts.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '');
  }, [points, timeToX, valueToY, height]);

  // Generate SVG Area Fill Path
  const areaPathD = useMemo(() => {
    if (!containerRef.current || points.length === 0) return '';
    const width = containerRef.current.clientWidth || 1000;
    const pts = points.map(p => ({ x: timeToX(p.time, width), y: valueToY(p.value, height) }));
    
    if (pts.length < 2) return '';
    const baseY = isVolume ? height - 10 : height / 2;
    
    let str = `M ${pts[0].x.toFixed(1)} ${baseY}`;
    pts.forEach(p => {
      str += ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    });
    str += ` L ${pts[pts.length - 1].x.toFixed(1)} ${baseY} Z`;
    return str;
  }, [points, timeToX, valueToY, height, isVolume]);

  // Current interpolated value at playhead position
  const currentInterpolatedValue = useMemo(() => {
    const defaultVal = isVolume ? track.volume : track.pan;
    return evaluateAutomationAt(points, playheadPosition, defaultVal);
  }, [points, playheadPosition, isVolume, track.volume, track.pan]);

  // Handle Freehand Draw Mode (Laser Pencil)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const time = xToTime(x, rect.width);
    const value = yToValue(y, rect.height);

    // If Draw or Laser Curve tool is active, start drawing curve
    if (activeTool === 'draw' || activeTool === 'laser_curve' || e.shiftKey) {
      setIsDrawing(true);
      setDrawnStroke([{ x, y, time, value }]);
      setDragTooltip({
        x: e.clientX,
        y: e.clientY - 28,
        text: isVolume ? volumeToDb(value) : panToString(value)
      });
      return;
    }

    // In Select or Laser mode: if clicking on blank lane area, add a new point
    if (activeTool === 'select' || activeTool === 'laser_select' || activeTool === 'laser_audio' || activeTool === 'laser_midi' || activeTool === 'beam') {
      const isOff = snapValue === 'freeform' || snapValue === 'off';
      const snappedTime = isOff 
        ? time 
        : Math.max(0, Math.min(1, snapToGrid(time * 16, snapValue) / 16));
      
      const newPoint: AutomationPoint = {
        id: `pt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        time: snappedTime,
        value
      };

      const updated = [...points, newPoint];
      commitPoints(updated);
      setDraggingPointId(newPoint.id);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const rawTime = xToTime(x, rect.width);
    const value = yToValue(y, rect.height);

    // If drawing freehand curve
    if (isDrawing) {
      setDrawnStroke(prev => [...prev, { x, y, time: rawTime, value }]);
      setDragTooltip({
        x: e.clientX,
        y: e.clientY - 28,
        text: `Bar ${(rawTime * 16 + 1).toFixed(1)} • ${isVolume ? volumeToDb(value) : panToString(value)}`
      });
      return;
    }

    // If dragging an existing point
    if (draggingPointId) {
      const ptIndex = points.findIndex(p => p.id === draggingPointId);
      if (ptIndex === -1) return;

      const isFirst = ptIndex === 0;
      const isLast = ptIndex === points.length - 1;

      // Restrict time movement for boundary endpoints, but let them change value freely
      let newTime = rawTime;
      if (isFirst && points[0].time === 0) {
        newTime = 0;
      } else if (isLast && points[points.length - 1].time === 1) {
        newTime = 1;
      } else {
        if (snapValue !== 'freeform' && snapValue !== 'off' && !e.altKey) {
          const snappedBar = snapToGrid(rawTime * 16, snapValue);
          newTime = Math.max(0.001, Math.min(0.999, snappedBar / 16));
        }
      }

      const updated = points.map(p => p.id === draggingPointId ? { ...p, time: newTime, value } : p);
      commitPoints(updated);

      setDragTooltip({
        x: e.clientX,
        y: e.clientY - 28,
        text: `Bar ${(newTime * 16 + 1).toFixed(1)} • ${isVolume ? volumeToDb(value) : panToString(value)}`
      });
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && drawnStroke.length > 0) {
      // Process drawn curve into optimized keyframes
      const newDrawnPoints = simplifyDrawnPoints(
        drawnStroke.map(s => ({ time: s.time, value: s.value }))
      );
      commitPoints(newDrawnPoints);
      setIsDrawing(false);
      setDrawnStroke([]);
      setDragTooltip(null);
      return;
    }

    if (draggingPointId) {
      setDraggingPointId(null);
      setDragTooltip(null);
    }
  };

  // Double click point to delete
  const handlePointDoubleClick = (e: React.MouseEvent, pointId: string) => {
    e.stopPropagation();
    if (points.length <= 2) return; // Keep at least 2 points
    const updated = points.filter(p => p.id !== pointId);
    commitPoints(updated);
  };

  // Quick preset applicator
  const applyPreset = (preset: 'fade_in' | 'fade_out' | 'sidechain' | 'auto_pan' | 'lfo_tremolo' | 'reset') => {
    const currentVal = isVolume ? track.volume : track.pan;
    const presetPoints = generateAutomationPreset(preset, param, currentVal);
    commitPoints(presetPoints);
    setActivePresetMenu(false);
  };

  const toggleEnableAutomation = () => {
    const updatedAutomation = {
      ...track.automation,
      volume: track.automation?.volume || { enabled: false, visible: false, points: [] },
      pan: track.automation?.pan || { enabled: false, visible: false, points: [] },
      [param]: {
        ...laneConfig,
        enabled: !laneConfig.enabled
      }
    };
    updateTrack(track.id, { automation: updatedAutomation });
  };

  return (
    <div 
      ref={containerRef}
      className={`w-full relative select-none overflow-hidden ${
        isOverlay ? 'absolute inset-0 z-10 pointer-events-auto' : 'border-b border-[#1A2333] bg-[#07090E]'
      }`}
      style={{ height: `${height}px` }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Reference Grid & Center/Unity Lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
        {/* Zero / Unity reference line */}
        {isVolume ? (
          <line 
            x1="0" 
            y1={valueToY(0.8, height)} 
            x2="100%" 
            y2={valueToY(0.8, height)} 
            stroke="#00F0FF" 
            strokeWidth="1" 
            strokeDasharray="4 4" 
            strokeOpacity="0.4"
          />
        ) : (
          <line 
            x1="0" 
            y1={height / 2} 
            x2="100%" 
            y2={height / 2} 
            stroke="#FF8C00" 
            strokeWidth="1" 
            strokeDasharray="4 4" 
            strokeOpacity="0.5"
          />
        )}
      </svg>

      {/* Main Curve Render SVG */}
      <svg ref={svgRef} className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <linearGradient id={`grad-${track.id}-${param}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
          <filter id={`glow-${track.id}-${param}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={glowColor} floodOpacity="0.8" />
          </filter>
        </defs>

        {/* Shaded Area Under Curve */}
        {areaPathD && (
          <path 
            d={areaPathD} 
            fill={`url(#grad-${track.id}-${param})`} 
          />
        )}

        {/* Drawn Stroke (when user is actively painting freehand) */}
        {isDrawing && drawnStroke.length > 1 && (
          <path
            d={drawnStroke.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '')}
            fill="none"
            stroke="#FFF"
            strokeWidth="2.5"
            strokeDasharray="3 3"
            filter={`url(#glow-${track.id}-${param})`}
          />
        )}

        {/* The Committed Automation Curve */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#glow-${track.id}-${param})`}
          />
        )}

        {/* Live Playhead Value Tracker Dot */}
        {containerRef.current && (
          <circle
            cx={timeToX(playheadPosition, containerRef.current.clientWidth || 1000)}
            cy={valueToY(currentInterpolatedValue, height)}
            r="4.5"
            fill="#FFF"
            stroke={strokeColor}
            strokeWidth="2.5"
            filter={`url(#glow-${track.id}-${param})`}
          />
        )}
      </svg>

      {/* Interactive Keyframe Node Points */}
      {containerRef.current && points.map(pt => {
        const cx = timeToX(pt.time, containerRef.current?.clientWidth || 1000);
        const cy = valueToY(pt.value, height);
        const isHovered = hoveredPointId === pt.id;
        const isDraggingThis = draggingPointId === pt.id;

        return (
          <div
            key={pt.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing z-20 group"
            style={{ left: `${cx}px`, top: `${cy}px` }}
            onMouseDown={(e) => {
              e.stopPropagation();
              if (activeTool === 'erase') {
                handlePointDoubleClick(e, pt.id);
              } else {
                setDraggingPointId(pt.id);
              }
            }}
            onMouseEnter={() => setHoveredPointId(pt.id)}
            onMouseLeave={() => setHoveredPointId(null)}
            onDoubleClick={(e) => handlePointDoubleClick(e, pt.id)}
            title="Drag to adjust • Double-click to remove"
          >
            <div 
              className={`w-3.5 h-3.5 rounded-full border-2 transition-transform flex items-center justify-center ${
                isDraggingThis || isHovered 
                  ? 'scale-125 bg-white border-white shadow-[0_0_10px_#FFF]' 
                  : 'scale-100 bg-[#0A0A10]'
              }`}
              style={{ borderColor: strokeColor }}
            >
              <div 
                className="w-1.5 h-1.5 rounded-full" 
                style={{ backgroundColor: isDraggingThis ? strokeColor : '#FFF' }}
              />
            </div>
          </div>
        );
      })}

      {/* Floating Hover / Drag Value Tooltip */}
      {dragTooltip && (
        <div 
          className="fixed pointer-events-none z-50 px-2 py-1 rounded bg-[#0A0A12] border border-[#00F0FF] text-white text-[10px] font-mono shadow-[0_0_12px_rgba(0,240,255,0.4)] whitespace-nowrap -translate-x-1/2"
          style={{ left: `${dragTooltip.x}px`, top: `${dragTooltip.y}px` }}
        >
          {dragTooltip.text}
        </div>
      )}

      {/* Floating Automation Lane Header Controls */}
      <div className="absolute top-1.5 left-2 flex items-center gap-1.5 z-30 bg-[#0A0D14]/90 backdrop-blur-sm px-2 py-1 rounded-md border border-[#1E293B]">
        {/* Toggle Automation Enable (Read/Bypass) */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleEnableAutomation(); }}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold transition-all ${
            laneConfig.enabled 
              ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/60 shadow-[0_0_8px_rgba(0,240,255,0.3)]' 
              : 'bg-[#181820] text-[#777] border border-[#2B2B38] hover:text-[#BBB]'
          }`}
          title={laneConfig.enabled ? 'Automation Active (Reading curves)' : 'Automation Bypassed'}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${laneConfig.enabled ? 'bg-[#00F0FF]' : 'bg-[#555]'}`} />
          <span>{isVolume ? 'VOL ENV' : 'PAN ENV'}</span>
        </button>

        {/* Live Numeric Readout */}
        <div className="text-[10px] font-mono text-[#AAA] px-1.5 py-0.5 bg-[#12121A] rounded border border-[#222]">
          {isVolume ? volumeToDb(currentInterpolatedValue) : panToString(currentInterpolatedValue)}
        </div>

        {/* Draw Freehand Curve Quick Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Start draw mode or apply quick prompt
            setIsDrawing(true);
          }}
          className={`p-1 rounded text-[10px] font-mono flex items-center gap-1 transition-colors ${
            activeTool === 'draw' || isDrawing
              ? 'bg-[#FFD700] text-black font-bold'
              : 'text-[#888] hover:text-white hover:bg-[#1A1A26]'
          }`}
          title="Paint curve directly with pencil tool"
        >
          <Pencil size={11} />
        </button>

        {/* Presets Dropdown Button */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setActivePresetMenu(prev => !prev); }}
            className="p-1 rounded text-[10px] font-mono text-[#888] hover:text-[#FFD700] hover:bg-[#1A1A26] flex items-center gap-1"
            title="Curve Presets (Fade, Sidechain, Pan LFO)"
          >
            <Sparkles size={11} />
            <span className="text-[9px]">Curves</span>
          </button>

          {/* Preset Choices Popover */}
          {activePresetMenu && (
            <div 
              className="absolute left-0 top-full mt-1 w-44 bg-[#0E111A] border border-[#26619C] rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.8)] py-1 z-50 flex flex-col text-xs font-mono"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2 py-1 text-[9px] text-[#666] uppercase border-b border-[#1E1E28]">
                {param.toUpperCase()} CURVE PRESETS
              </div>
              
              {isVolume ? (
                <>
                  <button 
                    onClick={() => applyPreset('fade_in')}
                    className="flex items-center gap-2 px-3 py-1.5 text-left text-[#CCC] hover:text-white hover:bg-[#1A2234] text-xs"
                  >
                    <TrendingUp size={12} className="text-[#10B981]" /> Fade In (0 &rarr; Unity)
                  </button>
                  <button 
                    onClick={() => applyPreset('fade_out')}
                    className="flex items-center gap-2 px-3 py-1.5 text-left text-[#CCC] hover:text-white hover:bg-[#1A2234] text-xs"
                  >
                    <TrendingDown size={12} className="text-[#EF4444]" /> Fade Out (Unity &rarr; 0)
                  </button>
                  <button 
                    onClick={() => applyPreset('sidechain')}
                    className="flex items-center gap-2 px-3 py-1.5 text-left text-[#CCC] hover:text-white hover:bg-[#1A2234] text-xs"
                  >
                    <Activity size={12} className="text-[#FF8C00]" /> 4-on-Floor Sidechain
                  </button>
                  <button 
                    onClick={() => applyPreset('lfo_tremolo')}
                    className="flex items-center gap-2 px-3 py-1.5 text-left text-[#CCC] hover:text-white hover:bg-[#1A2234] text-xs"
                  >
                    <Sparkles size={12} className="text-[#00F0FF]" /> Tremolo Wave LFO
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => applyPreset('auto_pan')}
                    className="flex items-center gap-2 px-3 py-1.5 text-left text-[#CCC] hover:text-white hover:bg-[#1A2234] text-xs"
                  >
                    <Activity size={12} className="text-[#FF8C00]" /> Stereo Ping-Pong Sine
                  </button>
                  <button 
                    onClick={() => {
                      commitPoints([
                        { id: 'p-l1', time: 0, value: -0.85 },
                        { id: 'p-r1', time: 1, value: 0.85 }
                      ]);
                      setActivePresetMenu(false);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-left text-[#CCC] hover:text-white hover:bg-[#1A2234] text-xs"
                  >
                    <TrendingUp size={12} className="text-[#38BDF8]" /> Left &rarr; Right Sweep
                  </button>
                </>
              )}

              <div className="border-t border-[#1E1E28] my-1" />

              <button 
                onClick={() => applyPreset('reset')}
                className="flex items-center gap-2 px-3 py-1.5 text-left text-[#888] hover:text-[#FFD700] hover:bg-[#1A2234] text-xs"
              >
                <RotateCcw size={12} /> Reset to Unity Flat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right-corner Guide badge */}
      <div className="absolute bottom-1 right-2 pointer-events-none text-[9px] font-mono text-[#555] flex items-center gap-2">
        <span>Click to add node • Drag to sculpt • Shift+Drag or Pencil to draw</span>
      </div>
    </div>
  );
};

export default AutomationLane;
