import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { AutomationPoint, AutomationLaneConfig, PluginAutomationLaneConfig, Track } from '../types';
import {
  snapToGrid,
  volumeToDb,
  panToString,
  simplifyDrawnPoints,
  generateAutomationPreset,
  generateComplexEnvelope,
  evaluateAutomationAt,
  formatAutomationValue,
  getDefaultAutomation,
  ComplexEnvelopeShape
} from '../lib/audioUtils';
import {
  Pencil,
  RotateCcw,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Activity,
  Waves,
  Zap
} from 'lucide-react';

interface AutomationLaneProps {
  track: Track;
  param: string; // 'volume' | 'pan' | PluginAutomationLaneConfig.id
  playheadPosition: number; // 0 to 1
  activeTool: string;
  snapValue: string;
  updateTrack: (id: string, updates: Partial<Track>) => void;
  height?: number;
  isOverlay?: boolean;
  pluginLane?: PluginAutomationLaneConfig;
}

const AutomationLane: React.FC<AutomationLaneProps> = ({
  track,
  param,
  playheadPosition,
  activeTool,
  snapValue,
  updateTrack,
  height = 96,
  isOverlay = false,
  pluginLane
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [containerWidth, setContainerWidth] = useState<number>(1000);
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);
  const [draggingCurveIndex, setDraggingCurveIndex] = useState<{ index: number; startY: number; initialCurve: number } | null>(null);
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);
  const [isPencilArmed, setIsPencilArmed] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawnStroke, setDrawnStroke] = useState<{ x: number; y: number; time: number; value: number }[]>([]);
  const [dragTooltip, setDragTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [activePresetMenu, setActivePresetMenu] = useState<boolean>(false);

  // Track responsive container width when side-panel toggles
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateWidth = () => {
      if (el.clientWidth > 0) setContainerWidth(el.clientWidth);
    };
    updateWidth();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateWidth);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const isVolume = param === 'volume';
  const isPan = param === 'pan';
  const resolvedPluginLane: PluginAutomationLaneConfig | undefined = useMemo(() => {
    if (isVolume || isPan) return undefined;
    return pluginLane || track.automation?.params?.[param];
  }, [isVolume, isPan, pluginLane, track.automation?.params, param]);

  // Parameter metadata (range, unit, colors, label)
  const meta = useMemo(() => {
    if (isVolume) {
      return {
        label: 'VOL ENV',
        min: 0,
        max: 1,
        defaultValue: track.volume,
        unit: 'dB',
        strokeColor: '#00F0FF',
        fillColor: 'rgba(0, 240, 255, 0.14)',
        glowColor: 'rgba(0, 240, 255, 0.6)'
      };
    }
    if (isPan) {
      return {
        label: 'PAN ENV',
        min: -1,
        max: 1,
        defaultValue: track.pan,
        unit: '',
        strokeColor: '#FF8C00',
        fillColor: 'rgba(255, 140, 0, 0.14)',
        glowColor: 'rgba(255, 140, 0, 0.6)'
      };
    }
    const accent = resolvedPluginLane?.color || '#EC4899';
    return {
      label: resolvedPluginLane ? `${resolvedPluginLane.paramName}` : param,
      min: resolvedPluginLane?.min ?? 0,
      max: resolvedPluginLane?.max ?? 1,
      defaultValue: resolvedPluginLane?.defaultValue ?? 0.5,
      unit: resolvedPluginLane?.unit ?? '',
      strokeColor: accent,
      fillColor: `${accent}24`,
      glowColor: `${accent}99`
    };
  }, [isVolume, isPan, track.volume, track.pan, resolvedPluginLane, param]);

  // Get current parameter automation configuration
  const automation = track.automation;
  const laneConfig: AutomationLaneConfig = useMemo(() => {
    if (isVolume && automation?.volume) return automation.volume;
    if (isPan && automation?.pan) return automation.pan;
    if (resolvedPluginLane) return resolvedPluginLane;

    return {
      enabled: false,
      visible: true,
      points: [
        { id: `init-1`, time: 0, value: meta.defaultValue },
        { id: `init-2`, time: 1, value: meta.defaultValue }
      ]
    };
  }, [automation, isVolume, isPan, resolvedPluginLane, meta.defaultValue]);

  const points = useMemo(() => {
    return [...laneConfig.points].sort((a, b) => a.time - b.time);
  }, [laneConfig.points]);

  // Format readout string for current parameter
  const formatVal = useCallback(
    (val: number) => {
      if (isVolume) return volumeToDb(val);
      if (isPan) return panToString(val);
      return formatAutomationValue(val, meta.unit, meta.min, meta.max);
    },
    [isVolume, isPan, meta.unit, meta.min, meta.max]
  );

  // Commit updated points back to track state
  const commitPoints = useCallback(
    (newPoints: AutomationPoint[]) => {
      const baseAuto = track.automation || getDefaultAutomation(track.volume, track.pan);
      const sorted = [...newPoints].sort((a, b) => a.time - b.time);

      if (isVolume) {
        updateTrack(track.id, {
          automation: {
            ...baseAuto,
            volume: {
              ...laneConfig,
              enabled: true,
              visible: true,
              points: sorted
            }
          }
        });
      } else if (isPan) {
        updateTrack(track.id, {
          automation: {
            ...baseAuto,
            pan: {
              ...laneConfig,
              enabled: true,
              visible: true,
              points: sorted
            }
          }
        });
      } else if (resolvedPluginLane) {
        const nextParams = {
          ...(baseAuto.params || {}),
          [param]: {
            ...resolvedPluginLane,
            enabled: true,
            visible: true,
            points: sorted
          }
        };
        updateTrack(track.id, {
          automation: {
            ...baseAuto,
            params: nextParams
          }
        });
      }
    },
    [track.id, track.automation, track.volume, track.pan, isVolume, isPan, resolvedPluginLane, param, laneConfig, updateTrack]
  );

  // Coordinate Conversion
  const timeToX = useCallback((time: number, width: number) => {
    return Math.max(0, Math.min(width, time * width));
  }, []);

  const valueToY = useCallback(
    (val: number, h: number) => {
      const pad = 10;
      const effH = Math.max(1, h - pad * 2);
      const span = meta.max - meta.min || 1;
      const norm = Math.max(0, Math.min(1, (val - meta.min) / span));
      return pad + (1 - norm) * effH;
    },
    [meta.min, meta.max]
  );

  const xToTime = useCallback((x: number, width: number) => {
    return Math.max(0, Math.min(1, x / Math.max(1, width)));
  }, []);

  const yToValue = useCallback(
    (y: number, h: number) => {
      const pad = 10;
      const effH = Math.max(1, h - pad * 2);
      const norm = Math.max(0, Math.min(1, 1 - (y - pad) / effH));
      const span = meta.max - meta.min;
      const raw = meta.min + norm * span;
      const decimals = span >= 100 ? 1 : span >= 10 ? 2 : 3;
      return Math.max(meta.min, Math.min(meta.max, Number(raw.toFixed(decimals))));
    },
    [meta.min, meta.max]
  );

  // Sample curve segments smoothly (handles curved tension segments accurately)
  const sampledSvgVertices = useMemo(() => {
    if (points.length === 0) return [];
    const width = containerWidth || 1000;
    const verts: { x: number; y: number }[] = [];

    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      verts.push({ x: timeToX(p1.time, width), y: valueToY(p1.value, height) });
      if (i < points.length - 1) {
        const p2 = points[i + 1];
        const curve = p1.curve ?? 0;
        if (Math.abs(curve) > 0.01 && p2.time > p1.time) {
          const subSteps = 12;
          for (let s = 1; s < subSteps; s++) {
            const linT = s / subSteps;
            const shapedT =
              curve > 0
                ? Math.pow(linT, 1 + curve * 2.5)
                : 1 - Math.pow(1 - linT, 1 + Math.abs(curve) * 2.5);
            const t = p1.time + linT * (p2.time - p1.time);
            const v = p1.value + shapedT * (p2.value - p1.value);
            verts.push({ x: timeToX(t, width), y: valueToY(v, height) });
          }
        }
      }
    }
    return verts;
  }, [points, containerWidth, height, timeToX, valueToY]);

  const pathD = useMemo(() => {
    if (sampledSvgVertices.length === 0) return '';
    return sampledSvgVertices.reduce(
      (acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`,
      ''
    );
  }, [sampledSvgVertices]);

  const areaPathD = useMemo(() => {
    if (sampledSvgVertices.length < 2) return '';
    const baseY = isPan ? height / 2 : height - 10;
    let str = `M ${sampledSvgVertices[0].x.toFixed(1)} ${baseY}`;
    sampledSvgVertices.forEach(p => {
      str += ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    });
    str += ` L ${sampledSvgVertices[sampledSvgVertices.length - 1].x.toFixed(1)} ${baseY} Z`;
    return str;
  }, [sampledSvgVertices, height, isPan]);

  // Midpoint tension handles for bending segments
  const segmentMidpoints = useMemo(() => {
    const width = containerWidth || 1000;
    const mids: { index: number; x: number; y: number; curve: number }[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dx = timeToX(p2.time - p1.time, width);
      if (dx < 34) continue; // Skip very tight freehand segments
      const midTime = (p1.time + p2.time) * 0.5;
      const midVal = evaluateAutomationAt([p1, p2], midTime, p1.value);
      mids.push({
        index: i,
        x: timeToX(midTime, width),
        y: valueToY(midVal, height),
        curve: p1.curve ?? 0
      });
    }
    return mids;
  }, [points, containerWidth, height, timeToX, valueToY]);

  // Current interpolated value at playhead position
  const currentInterpolatedValue = useMemo(() => {
    return evaluateAutomationAt(points, playheadPosition, meta.defaultValue);
  }, [points, playheadPosition, meta.defaultValue]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || e.button !== 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const time = xToTime(x, rect.width);
    const value = yToValue(y, rect.height);

    // Freehand Draw Mode when Draw tool, Laser Curve tool, Pencil toggle, or Shift+Drag
    if (isPencilArmed || activeTool === 'draw' || activeTool === 'laser_curve' || e.shiftKey) {
      e.stopPropagation();
      setIsDrawing(true);
      setDrawnStroke([{ x, y, time, value }]);
      setDragTooltip({
        x: e.clientX,
        y: e.clientY - 28,
        text: `Bar ${(time * 16 + 1).toFixed(1)} • ${formatVal(value)}`
      });
      return;
    }

    // Add breakpoint node on click
    e.stopPropagation();
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
    setDragTooltip({
      x: e.clientX,
      y: e.clientY - 28,
      text: `Bar ${(snappedTime * 16 + 1).toFixed(1)} • ${formatVal(value)}`
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const rawTime = xToTime(x, rect.width);
    const value = yToValue(y, rect.height);

    if (isDrawing) {
      setDrawnStroke(prev => [...prev, { x, y, time: rawTime, value }]);
      setDragTooltip({
        x: e.clientX,
        y: e.clientY - 28,
        text: `Bar ${(rawTime * 16 + 1).toFixed(1)} • ${formatVal(value)}`
      });
      return;
    }

    if (draggingCurveIndex !== null) {
      const deltaY = e.clientY - draggingCurveIndex.startY;
      const nextCurve = Math.max(-1, Math.min(1, Number((draggingCurveIndex.initialCurve + deltaY / 55).toFixed(2))));
      const updated = points.map((p, idx) =>
        idx === draggingCurveIndex.index ? { ...p, curve: nextCurve } : p
      );
      commitPoints(updated);
      setDragTooltip({
        x: e.clientX,
        y: e.clientY - 28,
        text: `Curve Tension: ${nextCurve > 0 ? '+' : ''}${Math.round(nextCurve * 100)}%`
      });
      return;
    }

    if (draggingPointId) {
      const ptIndex = points.findIndex(p => p.id === draggingPointId);
      if (ptIndex === -1) return;

      const isFirst = ptIndex === 0;
      const isLast = ptIndex === points.length - 1;

      let newTime = rawTime;
      if (isFirst && points[0].time === 0) {
        newTime = 0;
      } else if (isLast && points[points.length - 1].time === 1) {
        newTime = 1;
      } else if (snapValue !== 'freeform' && snapValue !== 'off' && !e.altKey) {
        const snappedBar = snapToGrid(rawTime * 16, snapValue);
        newTime = Math.max(0.001, Math.min(0.999, snappedBar / 16));
      }

      const updated = points.map(p => (p.id === draggingPointId ? { ...p, time: newTime, value } : p));
      commitPoints(updated);

      setDragTooltip({
        x: e.clientX,
        y: e.clientY - 28,
        text: `Bar ${(newTime * 16 + 1).toFixed(1)} • ${formatVal(value)}`
      });
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && drawnStroke.length > 0) {
      const newDrawnPoints = simplifyDrawnPoints(
        drawnStroke.map(s => ({ time: s.time, value: s.value }))
      );
      if (newDrawnPoints.length >= 2) {
        commitPoints(newDrawnPoints);
      }
      setIsDrawing(false);
      setDrawnStroke([]);
      setDragTooltip(null);
      return;
    }

    if (draggingCurveIndex !== null) {
      setDraggingCurveIndex(null);
      setDragTooltip(null);
      return;
    }

    if (draggingPointId) {
      setDraggingPointId(null);
      setDragTooltip(null);
    }
  };

  const handlePointRemove = (e: React.MouseEvent, pointId: string) => {
    e.stopPropagation();
    if (points.length <= 2) return;
    const updated = points.filter(p => p.id !== pointId);
    commitPoints(updated);
  };

  const applyPreset = (preset: 'fade_in' | 'fade_out' | 'sidechain' | 'auto_pan' | 'lfo_tremolo' | 'reset') => {
    const currentVal = isVolume ? track.volume : track.pan;
    const presetPoints = generateAutomationPreset(preset, isVolume ? 'volume' : 'pan', currentVal);
    commitPoints(presetPoints);
    setActivePresetMenu(false);
  };

  const applyComplexShape = (shape: ComplexEnvelopeShape) => {
    const pts = generateComplexEnvelope(shape, meta.min, meta.max, meta.defaultValue, meta.label.toLowerCase().replace(/[^a-z0-9]/g, ''));
    commitPoints(pts);
    setActivePresetMenu(false);
  };

  const toggleEnableAutomation = () => {
    const baseAuto = track.automation || getDefaultAutomation(track.volume, track.pan);
    if (isVolume) {
      updateTrack(track.id, {
        automation: { ...baseAuto, volume: { ...laneConfig, enabled: !laneConfig.enabled } }
      });
    } else if (isPan) {
      updateTrack(track.id, {
        automation: { ...baseAuto, pan: { ...laneConfig, enabled: !laneConfig.enabled } }
      });
    } else if (resolvedPluginLane) {
      updateTrack(track.id, {
        automation: {
          ...baseAuto,
          params: {
            ...(baseAuto.params || {}),
            [param]: { ...resolvedPluginLane, enabled: !laneConfig.enabled }
          }
        }
      });
    }
  };

  const safeSvgId = `${track.id}-${param}`.replace(/[^a-zA-Z0-9_-]/g, '_');

  return (
    <div
      ref={containerRef}
      className={`w-full relative select-none overflow-hidden ${
        isOverlay ? 'absolute inset-0 z-10 pointer-events-auto' : 'border-b border-[#1A2333] bg-[#07090E]'
      } ${isPencilArmed || activeTool === 'draw' || activeTool === 'laser_curve' ? 'cursor-crosshair' : ''}`}
      style={{ height: `${height}px` }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Reference Grid & Default/Unity Lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-45">
        <line
          x1="0"
          y1={valueToY(meta.defaultValue, height)}
          x2="100%"
          y2={valueToY(meta.defaultValue, height)}
          stroke={meta.strokeColor}
          strokeWidth="1"
          strokeDasharray="4 4"
          strokeOpacity="0.45"
        />
      </svg>

      {/* Main Curve Render SVG */}
      <svg ref={svgRef} className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <linearGradient id={`grad-${safeSvgId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={meta.strokeColor} stopOpacity="0.28" />
            <stop offset="100%" stopColor={meta.strokeColor} stopOpacity="0.0" />
          </linearGradient>
          <filter id={`glow-${safeSvgId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={meta.glowColor} floodOpacity="0.8" />
          </filter>
        </defs>

        {areaPathD && <path d={areaPathD} fill={`url(#grad-${safeSvgId})`} />}

        {isDrawing && drawnStroke.length > 1 && (
          <path
            d={drawnStroke.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '')}
            fill="none"
            stroke="#FFF"
            strokeWidth="2.5"
            strokeDasharray="3 3"
            filter={`url(#glow-${safeSvgId})`}
          />
        )}

        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke={meta.strokeColor}
            strokeWidth={laneConfig.enabled ? 2.2 : 1.5}
            strokeOpacity={laneConfig.enabled ? 1 : 0.45}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#glow-${safeSvgId})`}
          />
        )}

        {/* Live Playhead Value Tracker Dot */}
        <circle
          cx={timeToX(playheadPosition, containerWidth)}
          cy={valueToY(currentInterpolatedValue, height)}
          r="4.5"
          fill="#FFF"
          stroke={meta.strokeColor}
          strokeWidth="2.5"
          filter={`url(#glow-${safeSvgId})`}
        />
      </svg>

      {/* Segment Curve Tension Diamond Handles */}
      {segmentMidpoints.map(mid => (
        <div
          key={`curve-${mid.index}`}
          onMouseDown={e => {
            e.stopPropagation();
            setDraggingCurveIndex({ index: mid.index, startY: e.clientY, initialCurve: mid.curve });
          }}
          onDoubleClick={e => {
            e.stopPropagation();
            const updated = points.map((p, idx) => (idx === mid.index ? { ...p, curve: 0 } : p));
            commitPoints(updated);
          }}
          className="absolute -translate-x-1/2 -translate-y-1/2 z-15 cursor-ns-resize opacity-50 hover:opacity-100 transition-opacity"
          style={{ left: `${mid.x}px`, top: `${mid.y}px` }}
          title="Drag vertically to bend curve tension • Double-click to reset linear"
        >
          <div
            className="w-2.5 h-2.5 rotate-45 border bg-[#060911] hover:scale-125 transition-transform"
            style={{
              borderColor: Math.abs(mid.curve) > 0.05 ? '#FFD700' : meta.strokeColor
            }}
          />
        </div>
      ))}

      {/* Interactive Keyframe Node Points */}
      {points.map(pt => {
        const cx = timeToX(pt.time, containerWidth);
        const cy = valueToY(pt.value, height);
        const isHovered = hoveredPointId === pt.id;
        const isDraggingThis = draggingPointId === pt.id;

        return (
          <div
            key={pt.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing z-20 group"
            style={{ left: `${cx}px`, top: `${cy}px` }}
            onMouseDown={e => {
              e.stopPropagation();
              if (activeTool === 'erase' || activeTool === 'laser_erase' || e.altKey) {
                handlePointRemove(e, pt.id);
              } else {
                setDraggingPointId(pt.id);
              }
            }}
            onMouseEnter={() => setHoveredPointId(pt.id)}
            onMouseLeave={() => setHoveredPointId(null)}
            onDoubleClick={e => handlePointRemove(e, pt.id)}
            title="Drag to move • Alt+Click or Double-click to delete"
          >
            <div
              className={`w-3.5 h-3.5 rounded-full border-2 transition-transform flex items-center justify-center ${
                isDraggingThis || isHovered
                  ? 'scale-125 bg-white border-white shadow-[0_0_10px_#FFF]'
                  : 'scale-100 bg-[#0A0A10]'
              }`}
              style={{ borderColor: meta.strokeColor }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: isDraggingThis ? meta.strokeColor : '#FFF' }}
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
      <div
        className="absolute top-1.5 left-2 flex items-center gap-1.5 z-30 bg-[#0A0D14]/90 backdrop-blur-sm px-2 py-1 rounded-md border border-[#1E293B]"
        onMouseDown={e => e.stopPropagation()}
      >
        <button
          onClick={e => {
            e.stopPropagation();
            toggleEnableAutomation();
          }}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold transition-all cursor-pointer ${
            laneConfig.enabled
              ? 'border text-white shadow-sm'
              : 'bg-[#181820] text-[#777] border border-[#2B2B38] hover:text-[#BBB]'
          }`}
          style={
            laneConfig.enabled
              ? {
                  backgroundColor: `${meta.strokeColor}26`,
                  borderColor: `${meta.strokeColor}99`,
                  color: meta.strokeColor
                }
              : undefined
          }
          title={laneConfig.enabled ? 'Automation Active (Reading envelope)' : 'Automation Bypassed'}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: laneConfig.enabled ? meta.strokeColor : '#555' }}
          />
          <span className="max-w-[110px] truncate">{meta.label}</span>
        </button>

        {/* Live Numeric Readout */}
        <div className="text-[10px] font-mono text-[#CBD5E1] px-1.5 py-0.5 bg-[#12121A] rounded border border-[#222]">
          {formatVal(currentInterpolatedValue)}
        </div>

        {/* Pencil Freehand Draw Mode Toggle */}
        <button
          onClick={e => {
            e.stopPropagation();
            setIsPencilArmed(prev => !prev);
          }}
          className={`p-1 rounded text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer ${
            isPencilArmed || activeTool === 'draw' || activeTool === 'laser_curve' || isDrawing
              ? 'bg-[#FFD700] text-black font-bold shadow-[0_0_8px_rgba(255,215,0,0.45)]'
              : 'text-[#888] hover:text-white hover:bg-[#1A1A26]'
          }`}
          title="Toggle Freehand Pencil Draw (or hold Shift + Drag anywhere)"
        >
          <Pencil size={11} />
        </button>

        {/* Shapes & Complex Envelopes Dropdown */}
        <div className="relative">
          <button
            onClick={e => {
              e.stopPropagation();
              setActivePresetMenu(prev => !prev);
            }}
            className="px-1.5 py-0.5 rounded text-[10px] font-mono text-[#AAA] hover:text-[#FFD700] hover:bg-[#1A1A26] flex items-center gap-1 cursor-pointer"
            title="Complex Envelope Shapes & LFO Generators"
          >
            <Sparkles size={11} className="text-[#FFD700]" />
            <span className="text-[9px] font-bold">Shapes</span>
          </button>

          {activePresetMenu && (
            <div
              className="absolute left-0 top-full mt-1 w-52 bg-[#0E111A] border border-[#26619C] rounded-lg shadow-[0_8px_28px_rgba(0,0,0,0.9)] py-1 z-50 flex flex-col text-xs font-mono"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-2.5 py-1 text-[9px] text-[#7D8AB0] uppercase border-b border-[#1E2538] truncate">
                {meta.label} ENVELOPES
              </div>

              {isVolume && (
                <>
                  <button
                    onClick={() => applyPreset('fade_in')}
                    className="flex items-center gap-2 px-3 py-1.5 text-left text-[#CCC] hover:text-white hover:bg-[#1A2234] text-[11px]"
                  >
                    <TrendingUp size={12} className="text-[#10B981]" /> Fade In (0 &rarr; Unity)
                  </button>
                  <button
                    onClick={() => applyPreset('fade_out')}
                    className="flex items-center gap-2 px-3 py-1.5 text-left text-[#CCC] hover:text-white hover:bg-[#1A2234] text-[11px]"
                  >
                    <TrendingDown size={12} className="text-[#EF4444]" /> Fade Out (Unity &rarr; 0)
                  </button>
                  <button
                    onClick={() => applyPreset('sidechain')}
                    className="flex items-center gap-2 px-3 py-1.5 text-left text-[#CCC] hover:text-white hover:bg-[#1A2234] text-[11px]"
                  >
                    <Activity size={12} className="text-[#FF8C00]" /> 4-on-Floor Sidechain
                  </button>
                  <button
                    onClick={() => applyPreset('lfo_tremolo')}
                    className="flex items-center gap-2 px-3 py-1.5 text-left text-[#CCC] hover:text-white hover:bg-[#1A2234] text-[11px]"
                  >
                    <Sparkles size={12} className="text-[#00F0FF]" /> Tremolo Wave LFO
                  </button>
                  <div className="border-t border-[#1E2538] my-1" />
                </>
              )}

              {isPan && (
                <>
                  <button
                    onClick={() => applyPreset('auto_pan')}
                    className="flex items-center gap-2 px-3 py-1.5 text-left text-[#CCC] hover:text-white hover:bg-[#1A2234] text-[11px]"
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
                    className="flex items-center gap-2 px-3 py-1.5 text-left text-[#CCC] hover:text-white hover:bg-[#1A2234] text-[11px]"
                  >
                    <TrendingUp size={12} className="text-[#38BDF8]" /> Left &rarr; Right Sweep
                  </button>
                  <div className="border-t border-[#1E2538] my-1" />
                </>
              )}

              <button
                onClick={() => applyComplexShape('sine_2')}
                className="flex items-center gap-2 px-3 py-1.5 text-left text-[#CCC] hover:text-white hover:bg-[#1A2234] text-[11px]"
              >
                <Waves size={12} className="text-[#00F0FF]" /> Smooth Sine LFO (2x)
              </button>
              <button
                onClick={() => applyComplexShape('sine_4')}
                className="flex items-center gap-2 px-3 py-1.5 text-left text-[#CCC] hover:text-white hover:bg-[#1A2234] text-[11px]"
              >
                <Waves size={12} className="text-[#EC4899]" /> Fast Sine LFO (4x)
              </button>
              <button
                onClick={() => applyComplexShape('triangle_4')}
                className="flex items-center gap-2 px-3 py-1.5 text-left text-[#CCC] hover:text-white hover:bg-[#1A2234] text-[11px]"
              >
                <Activity size={12} className="text-[#A855F7]" /> Triangle Sweep (4x)
              </button>
              <button
                onClick={() => applyComplexShape('pulse_8')}
                className="flex items-center gap-2 px-3 py-1.5 text-left text-[#CCC] hover:text-white hover:bg-[#1A2234] text-[11px]"
              >
                <Zap size={12} className="text-[#FFD700]" /> 8-Step Pulse Gate
              </button>
              <button
                onClick={() => applyComplexShape('step_snh')}
                className="flex items-center gap-2 px-3 py-1.5 text-left text-[#CCC] hover:text-white hover:bg-[#1A2234] text-[11px]"
              >
                <Sparkles size={12} className="text-[#10B981]" /> Random S&amp;H Stepper
              </button>
              <button
                onClick={() => applyComplexShape('ramp_up')}
                className="flex items-center gap-2 px-3 py-1.5 text-left text-[#CCC] hover:text-white hover:bg-[#1A2234] text-[11px]"
              >
                <TrendingUp size={12} className="text-[#38BDF8]" /> Curved Build Up
              </button>
              <button
                onClick={() => applyComplexShape('arch')}
                className="flex items-center gap-2 px-3 py-1.5 text-left text-[#CCC] hover:text-white hover:bg-[#1A2234] text-[11px]"
              >
                <TrendingUp size={12} className="text-[#F97316]" /> Bell Swell Arch
              </button>

              <div className="border-t border-[#1E2538] my-1" />

              <button
                onClick={() => (isVolume || isPan ? applyPreset('reset') : applyComplexShape('reset'))}
                className="flex items-center gap-2 px-3 py-1.5 text-left text-[#888] hover:text-[#FFD700] hover:bg-[#1A2234] text-[11px]"
              >
                <RotateCcw size={12} /> Reset to Default Flat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right-corner Guide badge */}
      <div className="absolute bottom-1 right-2 pointer-events-none text-[9px] font-mono text-[#5D6A8A] flex items-center gap-2">
        <span>Click: Add • ◆ Curve Tension • Pencil / Shift+Drag: Freehand</span>
      </div>
    </div>
  );
};

export default AutomationLane;
