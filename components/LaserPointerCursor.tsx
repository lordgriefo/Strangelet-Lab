import React, { useEffect, useState, useRef } from 'react';
import { LaserToolType } from '../types';
import { playLaserBeamSound } from '../lib/laserSound';

interface LaserPointerCursorProps {
  activeTool: LaserToolType | string;
  enabled?: boolean;
}

export const LaserPointerCursor: React.FC<LaserPointerCursorProps> = ({
  activeTool,
  enabled = true
}) => {
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: -100, y: -100 });
  const [isClicking, setIsClicking] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isNoteworthy, setIsNoteworthy] = useState<boolean>(false);
  const [sacredPhase, setSacredPhase] = useState<'vesica' | 'infinity' | 'both'>('vesica');

  const rafRef = useRef<number | null>(null);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: -100, y: -100 });
  const dwellTimerRef = useRef<NodeJS.Timeout | null>(null);
  const phaseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Tool base color scheme
  const getToolBaseColor = () => {
    switch (activeTool) {
      case 'laser_audio':
      case 'select':
      case 'laser_select':
        return '#00F0FF';
      case 'laser_midi':
      case 'draw':
        return '#10B981';
      case 'laser_erase':
      case 'erase':
        return '#EF4444';
      case 'laser_curve':
        return '#FFD700';
      default:
        return '#00F0FF';
    }
  };

  const baseColor = getToolBaseColor();

  // Cycle sacred geometry display modes while resting on noteworthy element
  useEffect(() => {
    if (!isNoteworthy) {
      if (phaseTimerRef.current) clearInterval(phaseTimerRef.current);
      return;
    }

    const phases: ('vesica' | 'infinity' | 'both')[] = ['vesica', 'infinity', 'both'];
    let idx = 0;
    phaseTimerRef.current = setInterval(() => {
      idx = (idx + 1) % phases.length;
      setSacredPhase(phases[idx]);
    }, 2800);

    return () => {
      if (phaseTimerRef.current) clearInterval(phaseTimerRef.current);
    };
  }, [isNoteworthy]);

  useEffect(() => {
    if (!enabled) return;

    const checkNoteworthy = (target: Element | null) => {
      if (!target) return false;
      return !!target.closest(
        'button, a, input, select, textarea, canvas, [role="button"], [role="slider"], [role="tab"], [role="switch"], [role="menuitem"], [role="checkbox"], [data-noteworthy], [data-piano-key], .cursor-pointer, .knob, .fader, .piano-key, .clip-item, .transport-btn, .waveform-trimmer, [data-interactive="true"]'
      );
    };

    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
      if (!isVisible) setIsVisible(true);

      const target = document.elementFromPoint(e.clientX, e.clientY) || (e.target as Element | null);
      const isOverInteractive = checkNoteworthy(target);

      // Smooth dwell debounce so it doesn't flicker when traversing borders
      if (isOverInteractive) {
        if (!dwellTimerRef.current && !isNoteworthy) {
          dwellTimerRef.current = setTimeout(() => {
            setIsNoteworthy(true);
            dwellTimerRef.current = null;
          }, 60);
        }
      } else {
        if (dwellTimerRef.current) {
          clearTimeout(dwellTimerRef.current);
          dwellTimerRef.current = null;
        }
        setIsNoteworthy(false);
      }

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          setPos(mousePosRef.current);
          rafRef.current = null;
        });
      }
    };

    const handleMouseDown = () => {
      setIsClicking(true);
      try {
        playLaserBeamSound((activeTool as any) || 'laser_audio');
      } catch {}
    };

    const handleMouseUp = () => setIsClicking(false);
    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);
      if (phaseTimerRef.current) clearInterval(phaseTimerRef.current);
    };
  }, [enabled, isVisible, isNoteworthy, activeTool]);

  if (!enabled || !isVisible || pos.x < 0) return null;

  return (
    <>
      <style>{`
        @keyframes sacred-chroma-cycle {
          0% {
            filter: drop-shadow(0 0 5px #00F0FF) drop-shadow(0 0 12px rgba(0, 240, 255, 0.7));
            stroke: #00F0FF;
          }
          20% {
            filter: drop-shadow(0 0 5px #38BDF8) drop-shadow(0 0 12px rgba(56, 189, 248, 0.7));
            stroke: #38BDF8;
          }
          40% {
            filter: drop-shadow(0 0 6px #C084FC) drop-shadow(0 0 14px rgba(192, 132, 252, 0.8));
            stroke: #E879F9;
          }
          60% {
            filter: drop-shadow(0 0 6px #F43F5E) drop-shadow(0 0 14px rgba(244, 63, 94, 0.8));
            stroke: #FB7185;
          }
          80% {
            filter: drop-shadow(0 0 6px #F59E0B) drop-shadow(0 0 14px rgba(245, 158, 11, 0.8));
            stroke: #FFD700;
          }
          90% {
            filter: drop-shadow(0 0 6px #10B981) drop-shadow(0 0 14px rgba(16, 185, 129, 0.8));
            stroke: #34D399;
          }
          100% {
            filter: drop-shadow(0 0 5px #00F0FF) drop-shadow(0 0 12px rgba(0, 240, 255, 0.7));
            stroke: #00F0FF;
          }
        }

        @keyframes sacred-infinity-flow {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: -96;
          }
        }

        @keyframes sacred-mandala-spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes sacred-vesica-pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.95;
          }
          50% {
            transform: scale(1.06);
            opacity: 1;
          }
        }

        @keyframes sacred-particle-orbit {
          0% {
            transform: rotate(0deg) translateX(15px) rotate(0deg);
            opacity: 0.8;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: rotate(360deg) translateX(15px) rotate(-360deg);
            opacity: 0.8;
          }
        }
      `}</style>

      <div
        className="fixed pointer-events-none z-[9999] transition-transform duration-75 ease-out select-none"
        style={{
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* If cursor is resting on something noteworthy: SACRED GEOMETRY MORPHING ANIMATION */}
        {isNoteworthy ? (
          <div
            className={`relative flex items-center justify-center transition-all duration-300 ${
              isClicking ? 'scale-125' : 'scale-100'
            }`}
            style={{ width: '56px', height: '56px' }}
          >
            {/* Morphing Sacred Geometry Canvas SVG */}
            <svg
              viewBox="-28 -28 56 56"
              className="w-14 h-14 overflow-visible"
              style={{
                animation: 'sacred-chroma-cycle 4.5s linear infinite',
              }}
            >
              <defs>
                <linearGradient id="sacred-linear-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00F0FF" />
                  <stop offset="33%" stopColor="#E879F9" />
                  <stop offset="66%" stopColor="#FFD700" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>

                <radialGradient id="sacred-lens-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
                  <stop offset="40%" stopColor="#00F0FF" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#E879F9" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Outer Sacred Compass Ring with Cardinal Ticks */}
              <g style={{ animation: 'sacred-mandala-spin 18s linear infinite', transformOrigin: '0 0' }}>
                <circle
                  cx="0"
                  cy="0"
                  r="23"
                  fill="none"
                  strokeWidth="0.75"
                  strokeDasharray="2 4"
                  opacity="0.65"
                />
                <line x1="0" y1="-25" x2="0" y2="-21" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="0" y1="21" x2="0" y2="25" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="-25" y1="0" x2="-21" y2="0" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="21" y1="0" x2="25" y2="0" strokeWidth="1.2" strokeLinecap="round" />
                {/* Ordinal micro dots */}
                <circle cx="-16.2" cy="-16.2" r="0.9" fill="currentColor" opacity="0.7" />
                <circle cx="16.2" cy="-16.2" r="0.9" fill="currentColor" opacity="0.7" />
                <circle cx="-16.2" cy="16.2" r="0.9" fill="currentColor" opacity="0.7" />
                <circle cx="16.2" cy="16.2" r="0.9" fill="currentColor" opacity="0.7" />
              </g>

              {/* 1. VESICA PISCIS GEOMETRY */}
              <g
                className="transition-all duration-700 ease-in-out"
                style={{
                  opacity: sacredPhase === 'vesica' || sacredPhase === 'both' ? 1 : 0.15,
                  transform: `scale(${sacredPhase === 'vesica' ? 1.05 : sacredPhase === 'both' ? 0.95 : 0.85})`,
                  transformOrigin: '0 0',
                  animation: 'sacred-vesica-pulse 2.8s ease-in-out infinite',
                }}
              >
                {/* Left Circle of Vesica */}
                <circle
                  cx="-5.5"
                  cy="0"
                  r="10.5"
                  fill="none"
                  strokeWidth="1.2"
                  opacity="0.8"
                />
                {/* Right Circle of Vesica */}
                <circle
                  cx="5.5"
                  cy="0"
                  r="10.5"
                  fill="none"
                  strokeWidth="1.2"
                  opacity="0.8"
                />
                {/* Center Almond Lens (Mandorla) with soft illumination */}
                <path
                  d="M 0 -8.9 A 10.5 10.5 0 0 1 0 8.9 A 10.5 10.5 0 0 1 0 -8.9 Z"
                  fill="url(#sacred-lens-glow)"
                  strokeWidth="1.4"
                  opacity="0.9"
                />
              </g>

              {/* 2. INFINITY SYMBOL (LEMNISCATE ∞) */}
              <g
                className="transition-all duration-700 ease-in-out"
                style={{
                  opacity: sacredPhase === 'infinity' || sacredPhase === 'both' ? 1 : 0.15,
                  transform: `scale(${sacredPhase === 'infinity' ? 1.08 : sacredPhase === 'both' ? 0.92 : 0.8})`,
                  transformOrigin: '0 0',
                }}
              >
                {/* Flowing Radiant Infinity Track */}
                <path
                  d="M 0 0 C 3.5 6, 11 6, 11 0 C 11 -6, 3.5 -6, 0 0 C -3.5 6, -11 6, -11 0 C -11 -6, -3.5 -6, 0 0 Z"
                  fill="none"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="14 6"
                  style={{
                    animation: 'sacred-infinity-flow 2.4s linear infinite',
                  }}
                />
                {/* Secondary fine outer infinity trace */}
                <path
                  d="M 0 0 C 3.5 6, 11 6, 11 0 C 11 -6, 3.5 -6, 0 0 C -3.5 6, -11 6, -11 0 C -11 -6, -3.5 -6, 0 0 Z"
                  fill="none"
                  strokeWidth="0.8"
                  opacity="0.5"
                />
              </g>

              {/* Central Quantum Nexus Star Core */}
              <circle
                cx="0"
                cy="0"
                r="2.2"
                fill="#FFFFFF"
                style={{
                  filter: 'drop-shadow(0 0 4px #FFFFFF) drop-shadow(0 0 8px #FFD700)',
                }}
              />
              <circle cx="0" cy="0" r="4.2" fill="none" strokeWidth="0.8" opacity="0.75" />
            </svg>

            {/* Orbiting Quantum Photon Mote */}
            <div
              className="absolute w-1.5 h-1.5 rounded-full bg-white shadow-sm"
              style={{
                animation: 'sacred-particle-orbit 2.6s linear infinite',
                boxShadow: '0 0 6px #FFFFFF, 0 0 12px #00F0FF',
              }}
            />

            {/* Click Wave Implosion / Ripple */}
            {isClicking && (
              <div
                className="absolute inset-0 rounded-full animate-ping opacity-75"
                style={{
                  border: '2px solid #FFFFFF',
                  boxShadow: '0 0 16px #00F0FF, inset 0 0 8px #E879F9',
                }}
              />
            )}
          </div>
        ) : (
          /* Default Sleek Laser Collimator Reticle (No bulky tooltip-blocking badge) */
          <div
            className={`relative flex items-center justify-center rounded-full transition-all duration-150 ${
              isClicking ? 'scale-125' : 'scale-100'
            }`}
            style={{
              width: isClicking ? '32px' : '22px',
              height: isClicking ? '32px' : '22px',
              border: `1.5px solid ${baseColor}`,
              boxShadow: `0 0 12px ${baseColor}, inset 0 0 6px ${baseColor}44`,
            }}
          >
            {/* Fine Collimator Crosshair Ticks */}
            <div
              className="absolute -top-1 w-0.5 h-1 rounded-sm"
              style={{ backgroundColor: baseColor, boxShadow: `0 0 4px ${baseColor}` }}
            />
            <div
              className="absolute -bottom-1 w-0.5 h-1 rounded-sm"
              style={{ backgroundColor: baseColor, boxShadow: `0 0 4px ${baseColor}` }}
            />
            <div
              className="absolute -left-1 h-0.5 w-1 rounded-sm"
              style={{ backgroundColor: baseColor, boxShadow: `0 0 4px ${baseColor}` }}
            />
            <div
              className="absolute -right-1 h-0.5 w-1 rounded-sm"
              style={{ backgroundColor: baseColor, boxShadow: `0 0 4px ${baseColor}` }}
            />

            {/* Central High-Precision Laser Point */}
            <div
              className="rounded-full transition-all duration-100"
              style={{
                width: isClicking ? '6px' : '3.5px',
                height: isClicking ? '6px' : '3.5px',
                backgroundColor: '#FFFFFF',
                boxShadow: `0 0 8px #FFFFFF, 0 0 14px ${baseColor}`,
              }}
            />

            {/* Click Ripple Wave */}
            {isClicking && (
              <div
                className="absolute inset-0 rounded-full animate-ping opacity-60"
                style={{ border: `2px solid ${baseColor}` }}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default LaserPointerCursor;

