import React from 'react';
import { ActiveTool } from './Toolbar';
import { snapToGrid } from '../lib/audioUtils';
import { Zap, Magnet, Lock, Crosshair } from 'lucide-react';

export function getSnapStepSize(snapValue: string): number {
  if (!snapValue || snapValue === 'off' || snapValue === 'freeform') return 0.25;
  if (snapValue === '1/1') return 1.0;
  if (snapValue === '1/2') return 0.5;
  if (snapValue === '1/4') return 0.25;
  if (snapValue === '1/8') return 0.125;
  if (snapValue === '1/16') return 0.0625;
  if (snapValue === '1/32') return 0.03125;
  if (snapValue === '1/8T' || snapValue === 'triplet' || snapValue === '1/12' || snapValue === '1/8 T') return 1 / 12;
  if (snapValue === '1/16T' || snapValue === '1/24') return 1 / 24;
  
  const clean = snapValue.replace(/[^\d/]/g, '');
  const [num, den] = clean.split('/').map(Number);
  if (den && !isNaN(num) && !isNaN(den)) {
    return num / den;
  }
  return 0.25;
}

export function formatBarBeat(bar: number): string {
  const safeBar = Math.max(0, bar);
  const barNum = Math.floor(safeBar) + 1;
  const beatRemainder = (safeBar % 1) * 4;
  const beatNum = Math.floor(beatRemainder) + 1;
  const tick = Math.round((beatRemainder % 1) * 100);
  return `${barNum}.${beatNum}.${String(tick).padStart(2, '0')}`;
}

export interface ActivePaintingState {
  isActive: boolean;
  trackId: string;
  startBar: number;
  endBar: number;
  currentBar: number;
  durationBars: number;
}

interface SequencerGridOverlayProps {
  snapValue: string;
  totalBars?: number; // default 16
  activeTool: ActiveTool;
  hoverBar: number | null;
  isHovering: boolean;
  mouseY?: number;
  activePainting?: ActivePaintingState | null;
  tempo?: number;
  showOverlay?: boolean;
}

const SequencerGridOverlay: React.FC<SequencerGridOverlayProps> = ({
  snapValue,
  totalBars = 16,
  activeTool,
  hoverBar,
  isHovering,
  mouseY,
  activePainting,
  tempo = 120,
  showOverlay = true
}) => {
  if (!showOverlay) return null;

  const isPaintTool = activeTool === 'laser_audio' || activeTool === 'laser_midi' || activeTool === 'beam';
  const isEraseTool = activeTool === 'laser_erase' || activeTool === 'erase';
  const isCurveTool = activeTool === 'laser_curve' || activeTool === 'draw';

  const isQuantizationActive = snapValue !== 'off' && snapValue !== 'freeform';
  const stepSize = getSnapStepSize(snapValue);
  
  // Theme styling for the active laser tool
  const toolColor = activeTool === 'laser_midi' 
    ? '#10B981' 
    : isEraseTool 
      ? '#EF4444' 
      : isCurveTool 
        ? '#FFD700' 
        : '#00F0FF';

  const toolGlow = activeTool === 'laser_midi' 
    ? 'rgba(16, 185, 129, 0.7)' 
    : isEraseTool 
      ? 'rgba(239, 68, 68, 0.7)' 
      : isCurveTool 
        ? 'rgba(255, 215, 0, 0.7)' 
        : 'rgba(0, 240, 255, 0.7)';

  // Calculate bar lines (0 to totalBars)
  const barLines = Array.from({ length: totalBars + 1 }, (_, i) => i);

  // Calculate beat lines (4 beats per bar, excluding bar lines)
  const totalBeats = totalBars * 4;
  const beatLines = Array.from({ length: totalBeats + 1 }, (_, i) => i * 0.25).filter(
    b => Math.abs(b - Math.round(b)) > 0.001
  );

  // Calculate sub-divisions if snap is finer than 1/4 (e.g. 1/8, 1/16, or triplets)
  const subdivisionLines: number[] = [];
  if (isQuantizationActive && stepSize < 0.25) {
    const totalSteps = Math.round(totalBars / stepSize);
    for (let s = 0; s <= totalSteps; s++) {
      const b = s * stepSize;
      // Skip if it aligns with a bar or 1/4 beat line
      const isBar = Math.abs(b - Math.round(b)) < 0.001;
      const isBeat = Math.abs((b * 4) - Math.round(b * 4)) < 0.001;
      if (!isBar && !isBeat && b <= totalBars) {
        subdivisionLines.push(b);
      }
    }
  }

  // Snapped target bar position when hovering
  let snappedBar: number | null = null;
  let isSnapLocked = false;
  if (hoverBar !== null && isQuantizationActive) {
    snappedBar = Math.max(0, Math.min(totalBars, snapToGrid(hoverBar, snapValue)));
    isSnapLocked = true;
  }

  const snappedPercent = snappedBar !== null ? (snappedBar / totalBars) * 100 : null;
  const stepWidthPercent = (stepSize / totalBars) * 100;

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden">
      {/* 1. Underlying Base Grid Lines */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="laser-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Sub-beat Subdivision Lines (1/8, 1/16, triplets) */}
        {subdivisionLines.map((bVal, idx) => {
          const xPct = (bVal / totalBars) * 100;
          return (
            <line
              key={`sub-${idx}`}
              x1={`${xPct}%`}
              y1="0"
              x2={`${xPct}%`}
              y2="100%"
              stroke={isPaintTool ? '#1E293B' : '#0F172A'}
              strokeWidth={isPaintTool ? '0.75' : '0.5'}
              strokeDasharray={isPaintTool ? '1,3' : '2,4'}
              opacity={isPaintTool ? 0.65 : 0.4}
            />
          );
        })}

        {/* Quarter Note Beat Lines (1/4 notes) */}
        {beatLines.map((bVal, idx) => {
          const xPct = (bVal / totalBars) * 100;
          return (
            <line
              key={`beat-${idx}`}
              x1={`${xPct}%`}
              y1="0"
              x2={`${xPct}%`}
              y2="100%"
              stroke="#1E293B"
              strokeWidth="1"
              strokeDasharray="2,2"
              opacity={isPaintTool ? 0.75 : 0.55}
            />
          );
        })}

        {/* Major Bar Lines (Bars 1 to 16) */}
        {barLines.map((bar) => {
          const xPct = (bar / totalBars) * 100;
          return (
            <line
              key={`bar-${bar}`}
              x1={`${xPct}%`}
              y1="0"
              x2={`${xPct}%`}
              y2="100%"
              stroke="#334155"
              strokeWidth="1.5"
              opacity={isPaintTool ? 0.85 : 0.7}
            />
          );
        })}

        {/* 2. Active Paint Drag Quantization Highlighting */}
        {activePainting && activePainting.isActive && activePainting.durationBars > 0 && (
          <g>
            {/* Painted Range Column Shimmer */}
            <rect
              x={`${(activePainting.startBar / totalBars) * 100}%`}
              y="0"
              width={`${(activePainting.durationBars / totalBars) * 100}%`}
              height="100%"
              fill={toolColor}
              fillOpacity={0.08}
            />

            {/* Quantized Steps inside Painted Range */}
            {Array.from({ length: Math.ceil(activePainting.durationBars / stepSize) }).map((_, stepIdx) => {
              const tickBar = activePainting.startBar + stepIdx * stepSize;
              if (tickBar > activePainting.endBar) return null;
              const xPct = (tickBar / totalBars) * 100;
              return (
                <line
                  key={`paint-tick-${stepIdx}`}
                  x1={`${xPct}%`}
                  y1="0"
                  x2={`${xPct}%`}
                  y2="100%"
                  stroke={toolColor}
                  strokeWidth="1"
                  strokeDasharray="3,3"
                  opacity={0.4}
                />
              );
            })}

            {/* Start Snap Line */}
            <line
              x1={`${(activePainting.startBar / totalBars) * 100}%`}
              y1="0"
              x2={`${(activePainting.startBar / totalBars) * 100}%`}
              y2="100%"
              stroke={toolColor}
              strokeWidth="2.5"
              filter="url(#laser-glow)"
              opacity={0.95}
            />

            {/* End Snap Line */}
            <line
              x1={`${(activePainting.endBar / totalBars) * 100}%`}
              y1="0"
              x2={`${(activePainting.endBar / totalBars) * 100}%`}
              y2="100%"
              stroke={toolColor}
              strokeWidth="2.5"
              filter="url(#laser-glow)"
              opacity={0.95}
            />
          </g>
        )}

        {/* 3. Hover Snapped Quantization Guide Line for the 'Paint' Tool */}
        {isPaintTool && isHovering && snappedPercent !== null && isSnapLocked && (
          <g>
            {/* Quantized Column Interval Highlight */}
            <rect
              x={`${snappedPercent}%`}
              y="0"
              width={`${Math.min(stepWidthPercent, 100 - snappedPercent)}%`}
              height="100%"
              fill={toolColor}
              fillOpacity={0.07}
            />

            {/* Bright Neon Snap Line */}
            <line
              x1={`${snappedPercent}%`}
              y1="0"
              x2={`${snappedPercent}%`}
              y2="100%"
              stroke={toolColor}
              strokeWidth="2"
              filter="url(#laser-glow)"
              opacity={0.9}
            />

            {/* Inner Pure Core Line */}
            <line
              x1={`${snappedPercent}%`}
              y1="0"
              x2={`${snappedPercent}%`}
              y2="100%"
              stroke="#FFFFFF"
              strokeWidth="0.75"
              opacity={0.8}
            />
          </g>
        )}
      </svg>

      {/* 4. Interactive Magnetic Snap Lock Heads & HUD Badges */}
      {isPaintTool && isHovering && snappedBar !== null && isSnapLocked && (
        <div
          className="absolute top-0 flex flex-col items-center pointer-events-none z-30 transition-all duration-75"
          style={{
            left: `${snappedPercent}%`,
            transform: 'translateX(-50%)'
          }}
        >
          {/* Top Snap Magnet Pip */}
          <div 
            className="w-3 h-3 rounded-full flex items-center justify-center shadow-lg transform -translate-y-1 animate-pulse"
            style={{
              backgroundColor: toolColor,
              boxShadow: `0 0 10px ${toolColor}`
            }}
          >
            <Magnet size={8} className="text-black" />
          </div>

          {/* Floating Quantization Lock Badge */}
          <div
            className="mt-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold flex items-center gap-1 shadow-2xl border backdrop-blur-md whitespace-nowrap"
            style={{
              backgroundColor: '#060A14EE',
              borderColor: toolColor,
              color: toolColor,
              boxShadow: `0 0 10px ${toolGlow}`
            }}
          >
            <Lock size={8} className="fill-current text-[#FFD700]" />
            <span>SNAP {snapValue}</span>
            <span className="text-white opacity-90">[{formatBarBeat(snappedBar)}]</span>
          </div>

          {/* Reticle Snap Pip near Mouse Y */}
          {mouseY !== undefined && (
            <div
              className="absolute w-4 h-4 rounded-full border-2 flex items-center justify-center pointer-events-none"
              style={{
                top: `${mouseY}px`,
                borderColor: toolColor,
                transform: 'translateY(-50%)',
                boxShadow: `0 0 8px ${toolColor}`
              }}
            >
              <div 
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: toolColor }}
              />
            </div>
          )}
        </div>
      )}

      {/* 5. Active Painting Quantization Feedback HUD */}
      {activePainting && activePainting.isActive && activePainting.durationBars > 0 && (
        <div
          className="absolute top-1 z-30 pointer-events-none flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/90 border text-[9px] font-mono font-bold shadow-2xl"
          style={{
            left: `${((activePainting.startBar + activePainting.durationBars / 2) / totalBars) * 100}%`,
            transform: 'translateX(-50%)',
            borderColor: toolColor,
            color: toolColor,
            boxShadow: `0 0 14px ${toolGlow}`
          }}
        >
          <Zap size={10} className="text-[#FFD700] animate-pulse" />
          <span>PAINT SNAP: {activePainting.durationBars.toFixed(2)} BARS</span>
          <span className="text-white opacity-70">
            ({Math.max(1, Math.round(activePainting.durationBars / 2))} LOOPS • {snapValue} QUANTIZE)
          </span>
        </div>
      )}
    </div>
  );
};

export default SequencerGridOverlay;
