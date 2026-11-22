import React from 'react';
import { ActiveTool } from './Toolbar';
import { snapToGrid } from '../lib/audioUtils';
import { Zap, Magnet, Lock } from 'lucide-react';

const LASER_CURSOR_CACHE = new Map<string, string>();

export function getLaserPointerCursor(activeTool: ActiveTool): string {
  const isSelect = activeTool === 'laser_select' || activeTool === 'select';
  const isMidi = activeTool === 'laser_midi';
  const isErase = activeTool === 'laser_erase' || activeTool === 'erase';
  const isCurve = activeTool === 'laser_curve' || activeTool === 'draw';

  const cacheKey = `${activeTool}`;
  const cached = LASER_CURSOR_CACHE.get(cacheKey);
  if (cached) return cached;

  let svg = '';
  let hotspotX = 2;
  let hotspotY = 2;
  let fallback = 'crosshair';

  if (isSelect) {
    // Lodge Beam: Sleek Purple Precision Arrow + Crosshair
    hotspotX = 2;
    hotspotY = 2;
    fallback = 'default';
    svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">` +
      `<filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="1" dy="1" stdDeviation="1" flood-color="#000000" flood-opacity="0.8"/></filter>` +
      `<g filter="url(#sh)">` +
      `<path d="M2 2 L2 18 L6.5 13.5 L12 24 L15 22.5 L9.5 12 L16.5 12 Z" fill="#0A0E17" stroke="#A855F7" stroke-width="1.6" stroke-linejoin="round"/>` +
      `<path d="M4 5 L4 14.5 L7.2 11.3 L11.8 20.2 L13.2 19.5 L8.6 10.7 L13.5 10.7 Z" fill="#C084FC"/>` +
      `<circle cx="2" cy="2" r="1.5" fill="#FFFFFF"/>` +
      `</g>` +
      `</svg>`;
  } else if (isErase) {
    // Red Laser Eraser Chisel Tool: ACID Pro style erase block
    hotspotX = 3;
    hotspotY = 3;
    svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">` +
      `<filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="1" dy="1" stdDeviation="1.2" flood-color="#000000" flood-opacity="0.9"/></filter>` +
      `<g filter="url(#sh)">` +
      `<circle cx="3" cy="3" r="3.2" fill="#EF4444" fill-opacity="0.5"/>` +
      `<circle cx="3" cy="3" r="1.5" fill="#FFFFFF"/>` +
      `<path d="M3 3 L9 1 L15 7 L9 9 Z" fill="#EF4444" stroke="#000000" stroke-width="1.2"/>` +
      `<path d="M9 9 L15 7 L27 19 L21 25 Z" fill="#1E293B" stroke="#000000" stroke-width="1.2"/>` +
      `<path d="M10 8 L14 6.5 L17 9.5 L13 11 Z" fill="#EF4444" fill-opacity="0.8"/>` +
      `<line x1="21" y1="25" x2="27" y2="19" stroke="#EF4444" stroke-width="2"/>` +
      `<line x1="3" y1="3" x2="7" y2="7" stroke="#FFFFFF" stroke-width="0.9" stroke-linecap="round"/>` +
      `</g>` +
      `</svg>`;
  } else if (isCurve) {
    // Amber Neon Curve Pen
    hotspotX = 2;
    hotspotY = 2;
    svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">` +
      `<filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="1" dy="1" stdDeviation="1" flood-color="#000000" flood-opacity="0.8"/></filter>` +
      `<g filter="url(#sh)">` +
      `<circle cx="2" cy="2" r="3" fill="#FFD700" fill-opacity="0.45"/>` +
      `<circle cx="2" cy="2" r="1.4" fill="#FFFFFF"/>` +
      `<path d="M2 2 L9 5 L23 19 L19 23 L5 9 Z" fill="#0E1726" stroke="#FFD700" stroke-width="1.4" stroke-linejoin="round"/>` +
      `<path d="M2 2 L6 3.5 L3.5 6 Z" fill="#FFD700"/>` +
      `<circle cx="14" cy="14" r="1.6" fill="#FFD700"/>` +
      `</g>` +
      `</svg>`;
  } else {
    // ACID Pro-Style Laser Beam Paintbrush (Blue for Audio, Green for MIDI)
    const color = isMidi ? '#10B981' : '#00F0FF';
    const bristleGlow = isMidi ? 'rgba(16,185,129,0.5)' : 'rgba(0,240,255,0.5)';
    hotspotX = 2;
    hotspotY = 2;
    svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">` +
      `<filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="1" dy="1" stdDeviation="1.2" flood-color="#000000" flood-opacity="0.9"/></filter>` +
      `<g filter="url(#sh)">` +
      `<!-- Laser Beam Emitter Pulse Core at Tip -->` +
      `<circle cx="2" cy="2" r="3.2" fill="${color}" fill-opacity="0.45"/>` +
      `<circle cx="2" cy="2" r="1.5" fill="#FFFFFF"/>` +
      `<!-- Paintbrush Bristles / Laser Emitter Horn -->` +
      `<path d="M2 2 L8 5 L10 8 L5 10 Z" fill="${color}" stroke="#000000" stroke-width="0.8"/>` +
      `<!-- Metal Ferrule -->` +
      `<path d="M8 5 L13 10 L10 13 L5 10 Z" fill="#94A3B8" stroke="#000000" stroke-width="1"/>` +
      `<line x1="7" y1="7" x2="11.5" y2="11.5" stroke="#FFFFFF" stroke-width="0.7"/>` +
      `<!-- Paintbrush Handle -->` +
      `<path d="M13 10 L25 22 C26.5 23.5 26.5 25.5 25 27 C23.5 28.5 21.5 28.5 20 27 L10 15 Z" fill="#0B1322" stroke="${color}" stroke-width="1.4" stroke-linejoin="round"/>` +
      `<!-- Neon Grip Accent on Handle -->` +
      `<path d="M14 12 L19 17" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>` +
      `<circle cx="22" cy="22" r="1.2" fill="${color}"/>` +
      `</g>` +
      `</svg>`;
  }

  const cursorValue = `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotspotX} ${hotspotY}, ${fallback}`;
  LASER_CURSOR_CACHE.set(cacheKey, cursorValue);
  return cursorValue;
}

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
  isMicroBypass?: boolean;
  mode?: 'paint' | 'erase';
}

export interface ActiveDragSnapState {
  trackId: string;
  clipName: string;
  startBar: number;
  endBar: number;
  isSnapped: boolean;
  mode?: 'move' | 'trim-start' | 'trim-end' | 'time-stretch';
  stretchRatio?: number;
  preservePitch?: boolean;
  isMicroBypass?: boolean;
}

interface SequencerGridOverlayProps {
  snapValue: string;
  totalBars?: number; // default 16
  activeTool: ActiveTool;
  hoverBar: number | null;
  isHovering: boolean;
  mouseY?: number;
  activePainting?: ActivePaintingState | null;
  activeDragSnap?: ActiveDragSnapState | null;
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
  activeDragSnap,
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

  // Snapped target bar position when hovering (Paint) or incremental cell (Red Eraser)
  let snappedBar: number | null = null;
  let isSnapLocked = false;
  if (hoverBar !== null && isQuantizationActive) {
    // ACID Pro cell-quantized highlight: covers the exact grid cell under pointer
    snappedBar = Math.max(0, Math.min(totalBars - stepSize, Math.floor((hoverBar + 1e-6) / stepSize) * stepSize));
    isSnapLocked = true;
  }

  const effEraseStep = Math.max(0.03125, isQuantizationActive ? stepSize : 0.25);
  const eraseCellStart =
    isEraseTool && hoverBar !== null
      ? Math.max(0, Math.min(totalBars - effEraseStep, Math.floor((hoverBar + 1e-6) / effEraseStep) * effEraseStep))
      : null;
  const eraseCellEnd =
    eraseCellStart !== null ? Math.min(totalBars, eraseCellStart + effEraseStep) : null;

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

        {/* 2. Active Paint Drag or Beam Right-Click Erase Highlighting & Shooting Laser Strike Beam */}
        {activePainting && activePainting.isActive && (() => {
          const beamColor = activePainting.mode === 'erase' ? '#EF4444' : toolColor;
          const beamPct = Math.max(0, Math.min(100, (activePainting.currentBar / totalBars) * 100));
          return (
            <g>
              {/* Instant Laser Pointer Beam Shooting onto the Active Grid Line */}
              <line
                x1={`${beamPct}%`}
                y1="0"
                x2={`${beamPct}%`}
                y2="100%"
                stroke={beamColor}
                strokeWidth="4"
                opacity={0.35}
              />
              <line
                x1={`${beamPct}%`}
                y1="0"
                x2={`${beamPct}%`}
                y2="100%"
                stroke={beamColor}
                strokeWidth="2"
                filter="url(#laser-glow)"
                opacity={0.95}
              />
              <line
                x1={`${beamPct}%`}
                y1="0"
                x2={`${beamPct}%`}
                y2="100%"
                stroke="#FFFFFF"
                strokeWidth="0.9"
                opacity={0.9}
              />

              {activePainting.durationBars > 0 && (
                <>
                  {/* Active Range Column Shimmer */}
                  <rect
                    x={`${(activePainting.startBar / totalBars) * 100}%`}
                    y="0"
                    width={`${(activePainting.durationBars / totalBars) * 100}%`}
                    height="100%"
                    fill={beamColor}
                    fillOpacity={activePainting.mode === 'erase' ? 0.12 : 0.08}
                  />

                  {/* Quantized Steps inside Active Range */}
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
                        stroke={beamColor}
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
                    stroke={beamColor}
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
                    stroke={beamColor}
                    strokeWidth="2.5"
                    filter="url(#laser-glow)"
                    opacity={0.95}
                  />
                </>
              )}
            </g>
          );
        })()}

        {/* 2.5 Active Clip Drag / Edge Pull-Back Magnetic Alignment Guides */}
        {activeDragSnap && (
          <g>
            <rect
              x={`${(activeDragSnap.startBar / totalBars) * 100}%`}
              y="0"
              width={`${((activeDragSnap.endBar - activeDragSnap.startBar) / totalBars) * 100}%`}
              height="100%"
              fill={activeDragSnap.isSnapped ? '#FF8C00' : '#38BDF8'}
              fillOpacity={0.07}
            />
            <line
              x1={`${(activeDragSnap.startBar / totalBars) * 100}%`}
              y1="0"
              x2={`${(activeDragSnap.startBar / totalBars) * 100}%`}
              y2="100%"
              stroke={activeDragSnap.isSnapped ? (activeDragSnap.mode === 'trim-end' ? '#FFD700' : '#FF8C00') : '#38BDF8'}
              strokeWidth={activeDragSnap.mode === 'trim-end' ? '1.25' : '2.25'}
              strokeDasharray={activeDragSnap.mode === 'trim-end' ? '3,3' : activeDragSnap.isSnapped ? undefined : '4,4'}
              filter={activeDragSnap.mode === 'trim-end' ? undefined : 'url(#laser-glow)'}
              opacity={activeDragSnap.mode === 'trim-end' ? 0.65 : 0.95}
            />
            <line
              x1={`${(activeDragSnap.endBar / totalBars) * 100}%`}
              y1="0"
              x2={`${(activeDragSnap.endBar / totalBars) * 100}%`}
              y2="100%"
              stroke={activeDragSnap.isSnapped ? (activeDragSnap.mode === 'trim-end' ? '#00F0FF' : '#FFD700') : '#38BDF8'}
              strokeWidth={activeDragSnap.mode === 'trim-end' ? '2.5' : '1.25'}
              strokeDasharray={activeDragSnap.mode === 'trim-end' ? (activeDragSnap.isSnapped ? undefined : '4,4') : '3,3'}
              filter={activeDragSnap.mode === 'trim-end' ? 'url(#laser-glow)' : undefined}
              opacity={activeDragSnap.mode === 'trim-end' ? 0.98 : 0.65}
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
        {/* 3.5 Hover Snapped Incremental Erase Cell Target for the Red Laser Eraser */}
        {isEraseTool && isHovering && !activePainting?.isActive && eraseCellStart !== null && eraseCellEnd !== null && (
          <g>
            <rect
              x={`${(eraseCellStart / totalBars) * 100}%`}
              y="0"
              width={`${((eraseCellEnd - eraseCellStart) / totalBars) * 100}%`}
              height="100%"
              fill="#EF4444"
              fillOpacity={0.14}
            />
            <line
              x1={`${(eraseCellStart / totalBars) * 100}%`}
              y1="0"
              x2={`${(eraseCellStart / totalBars) * 100}%`}
              y2="100%"
              stroke="#EF4444"
              strokeWidth="2"
              filter="url(#laser-glow)"
              opacity={0.95}
            />
            <line
              x1={`${(eraseCellEnd / totalBars) * 100}%`}
              y1="0"
              x2={`${(eraseCellEnd / totalBars) * 100}%`}
              y2="100%"
              stroke="#EF4444"
              strokeWidth="1.5"
              strokeDasharray="3,3"
              opacity={0.85}
            />
          </g>
        )}
      </svg>

      {/* 4. Reticle Snap Pip near Mouse Y (kept off top-of-track-1 area) */}
      {((isPaintTool && isHovering && snappedPercent !== null && isSnapLocked) ||
        (isEraseTool && isHovering && eraseCellStart !== null && !activePainting?.isActive)) &&
        mouseY !== undefined && (
        <div
          className="absolute w-4 h-4 rounded-full border-2 flex items-center justify-center pointer-events-none z-20"
          style={{
            left: `${isEraseTool && eraseCellStart !== null ? (eraseCellStart / totalBars) * 100 : snappedPercent}%`,
            top: `${mouseY}px`,
            borderColor: toolColor,
            transform: 'translate(-50%, -50%)',
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
  );
};

interface SequencerRulerSnapTooltipProps {
  snapValue: string;
  totalBars?: number;
  activeTool: ActiveTool;
  hoverBar: number | null;
  isHovering: boolean;
  activePainting?: ActivePaintingState | null;
  activeDragSnap?: ActiveDragSnapState | null;
  showOverlay?: boolean;
}

function getHorizontalClampTransform(pct: number): string {
  if (pct < 8) return 'translateX(0%)';
  if (pct > 92) return 'translateX(-100%)';
  return 'translateX(-50%)';
}

export const SequencerRulerSnapTooltip: React.FC<SequencerRulerSnapTooltipProps> = ({
  snapValue,
  totalBars = 16,
  activeTool,
  hoverBar,
  isHovering,
  activePainting,
  activeDragSnap,
  showOverlay = true
}) => {
  const isPaintTool = activeTool === 'laser_audio' || activeTool === 'laser_midi' || activeTool === 'beam';
  const isEraseTool = activeTool === 'laser_erase' || activeTool === 'erase';
  const isCurveTool = activeTool === 'laser_curve' || activeTool === 'draw';
  const isQuantizationActive = snapValue !== 'off' && snapValue !== 'freeform';

  const toolColor = activeTool === 'laser_midi'
    ? '#10B981'
    : isEraseTool
      ? '#EF4444'
      : isCurveTool
        ? '#FFD700'
        : '#00F0FF';

  const toolGlow = activeTool === 'laser_midi'
    ? 'rgba(16, 185, 129, 0.55)'
    : isEraseTool
      ? 'rgba(239, 68, 68, 0.55)'
      : isCurveTool
        ? 'rgba(255, 215, 0, 0.55)'
        : 'rgba(0, 240, 255, 0.55)';

  // 1. Active painting / erasing HUD tooltip (positioned in the ruler above Track 1)
  if (activePainting && activePainting.isActive && activePainting.durationBars > 0) {
    const pct = Math.max(0, Math.min(100, (activePainting.currentBar / totalBars) * 100));
    const snapLabel = activePainting.isMicroBypass ? 'MICRO (ALT)' : snapValue;
    const isActiveErase = isEraseTool || activePainting.mode === 'erase';
    const hudColor = isActiveErase ? '#EF4444' : toolColor;
    const hudGlow = isActiveErase ? 'rgba(239, 68, 68, 0.55)' : toolGlow;
    return (
      <div
        className="absolute bottom-0.5 z-40 pointer-events-none flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#050811]/95 border text-[9px] font-mono font-bold leading-tight shadow-xl whitespace-nowrap"
        style={{
          left: `${pct}%`,
          transform: getHorizontalClampTransform(pct),
          borderColor: hudColor,
          color: hudColor,
          boxShadow: `0 0 12px ${hudGlow}`
        }}
      >
        <Zap size={9} className="text-[#FFD700] shrink-0" />
        <span>{isActiveErase ? 'ERASE' : 'PAINT'}: {activePainting.durationBars.toFixed(2)}b</span>
        <span className="text-white/90">
          [{formatBarBeat(activePainting.startBar)}–{formatBarBeat(activePainting.endBar)}]
        </span>
        <span className="text-white/65">· {snapLabel}</span>
      </div>
    );
  }

  // 2. Active clip drag / edge trim / non-destructive time-stretch snap badge (positioned in ruler above Track 1)
  if (activeDragSnap) {
    const isTrimEnd = activeDragSnap.mode === 'trim-end';
    const isTrimStart = activeDragSnap.mode === 'trim-start';
    const isTimeStretch = activeDragSnap.mode === 'time-stretch';
    const anchorBar = isTrimEnd || isTimeStretch ? activeDragSnap.endBar : activeDragSnap.startBar;
    const pct = Math.max(0, Math.min(100, (anchorBar / totalBars) * 100));
    const snapModeLabel = activeDragSnap.isMicroBypass
      ? 'MICRO (ALT)'
      : activeDragSnap.isSnapped
        ? `SNAP ${snapValue}`
        : 'FREEFORM';
    const actionLabel = isTimeStretch
      ? `TIME STRETCH ${(activeDragSnap.stretchRatio ?? 1).toFixed(2)}x${activeDragSnap.preservePitch !== false ? ' · PITCH LOCK' : ''}`
      : isTrimEnd
        ? 'TRIM END'
        : isTrimStart
          ? 'TRIM START'
          : snapModeLabel;
    const clipLen = Math.max(0, activeDragSnap.endBar - activeDragSnap.startBar);

    return (
      <div
        className="absolute bottom-0.5 z-40 pointer-events-none flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#050811]/95 border text-[9px] font-mono font-bold leading-tight shadow-xl whitespace-nowrap"
        style={{
          left: `${pct}%`,
          transform: getHorizontalClampTransform(pct),
          borderColor: isTimeStretch ? '#10B981' : isTrimEnd || isTrimStart ? '#00F0FF' : activeDragSnap.isSnapped ? '#FF8C00' : '#38BDF8',
          color: isTimeStretch ? '#34D399' : isTrimEnd || isTrimStart ? '#67E8F9' : activeDragSnap.isSnapped ? '#FFD700' : '#7DD3FC',
          boxShadow: isTimeStretch
            ? '0 0 12px rgba(16,185,129,0.5)'
            : isTrimEnd || isTrimStart
              ? '0 0 12px rgba(0,240,255,0.45)'
              : activeDragSnap.isSnapped
                ? '0 0 10px rgba(255,140,0,0.45)'
                : '0 0 10px rgba(56,189,248,0.35)'
        }}
      >
        <Magnet size={9} className="shrink-0" />
        <span>{actionLabel}</span>
        <span className="text-white">[{formatBarBeat(anchorBar)}]</span>
        {(isTrimEnd || isTrimStart || isTimeStretch) && (
          <span className="text-amber-300">
            LEN {clipLen.toFixed(2)}b · {snapModeLabel}
          </span>
        )}
      </div>
    );
  }

  // 3. Hover incremental erase target tooltip (Red Laser)
  if (showOverlay && isEraseTool && isHovering && hoverBar !== null) {
    const effStep = Math.max(0.03125, isQuantizationActive ? getSnapStepSize(snapValue) : 0.25);
    const cellStart = Math.max(0, Math.min(totalBars - effStep, Math.floor((hoverBar + 1e-6) / effStep) * effStep));
    const cellEnd = Math.min(totalBars, cellStart + effStep);
    const pct = (cellStart / totalBars) * 100;
    return (
      <div
        className="absolute bottom-0.5 z-40 pointer-events-none flex items-center gap-1 px-2 py-0.5 rounded bg-[#14070B]/95 border text-[9px] font-mono font-bold leading-tight shadow-xl whitespace-nowrap"
        style={{
          left: `${pct}%`,
          transform: getHorizontalClampTransform(pct),
          borderColor: '#EF4444',
          color: '#FCA5A5',
          boxShadow: '0 0 10px rgba(239, 68, 68, 0.55)'
        }}
      >
        <Lock size={8} className="fill-current text-[#EF4444] shrink-0" />
        <span>ERASE {isQuantizationActive ? snapValue : '1/4'}</span>
        <span className="text-white/90">
          [{formatBarBeat(cellStart)}–{formatBarBeat(cellEnd)}]
        </span>
      </div>
    );
  }

  // 4. Hover quantization lock tooltip for Paint tools (positioned in the ruler above Track 1)
  if (showOverlay && isPaintTool && isHovering && hoverBar !== null && isQuantizationActive) {
    const snappedBar = Math.max(0, Math.min(totalBars, snapToGrid(hoverBar, snapValue)));
    const pct = (snappedBar / totalBars) * 100;
    return (
      <div
        className="absolute bottom-0.5 z-40 pointer-events-none flex items-center gap-1 px-2 py-0.5 rounded bg-[#050811]/95 border text-[9px] font-mono font-bold leading-tight shadow-xl whitespace-nowrap"
        style={{
          left: `${pct}%`,
          transform: getHorizontalClampTransform(pct),
          borderColor: toolColor,
          color: toolColor,
          boxShadow: `0 0 10px ${toolGlow}`
        }}
      >
        <Lock size={8} className="fill-current text-[#FFD700] shrink-0" />
        <span>SNAP {snapValue}</span>
        <span className="text-white/90">[{formatBarBeat(snappedBar)}]</span>
      </div>
    );
  }

  return null;
};

export default SequencerGridOverlay;
