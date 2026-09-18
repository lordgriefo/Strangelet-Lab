import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Compass, Sparkles, RefreshCw, Layers, Sliders, Play, RotateCcw, Activity } from 'lucide-react';
import { playLaserBeamSound } from '../lib/laserSound';

export interface VectorCornerConfig {
  id: 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right';
  label: string;
  sourceType: 'sample' | 'synth:karplus_strong' | 'synth:fm_sine' | 'synth:sub_bass' | 'synth:theremin';
  color: string;
}

export interface VectorMorphPadProps {
  x: number; // 0 to 1
  y: number; // 0 to 1
  onChangePosition: (x: number, y: number) => void;
  thirdMindActive: boolean;
  onToggleThirdMind: () => void;
  corners: VectorCornerConfig[];
  onChangeCornerSource?: (cornerId: VectorCornerConfig['id'], newSource: VectorCornerConfig['sourceType']) => void;
  onAuditionMorph?: () => void;
  filterCutoffHz?: number;
}

export const VectorMorphPad: React.FC<VectorMorphPadProps> = ({
  x,
  y,
  onChangePosition,
  thirdMindActive,
  onToggleThirdMind,
  corners,
  onChangeCornerSource,
  onAuditionMorph,
  filterCutoffHz = 8500
}) => {
  const padRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lfoOrbitActive, setLfoOrbitActive] = useState(false);
  const orbitAngleRef = useRef(0);

  // Compute 4 bilinear weights (normalized 0 to 1)
  // Top-Left (A): (1 - x) * y
  // Top-Right (B): x * y
  // Bottom-Left (C): (1 - x) * (1 - y)
  // Bottom-Right (D): x * (1 - y)
  const weightTL = (1 - x) * y;
  const weightTR = x * y;
  const weightBL = (1 - x) * (1 - y);
  const weightBR = x * (1 - y);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setLfoOrbitActive(false);
    updateFromPointer(e.clientX, e.clientY);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    playLaserBeamSound('laser_select');
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updateFromPointer(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const updateFromPointer = useCallback((clientX: number, clientY: number) => {
    if (!padRef.current) return;
    const rect = padRef.current.getBoundingClientRect();
    const rawX = (clientX - rect.left) / rect.width;
    const rawY = 1 - ((clientY - rect.top) / rect.height); // inverted so top is y=1

    const clampedX = Math.max(0, Math.min(1, rawX));
    const clampedY = Math.max(0, Math.min(1, rawY));
    onChangePosition(clampedX, clampedY);
  }, [onChangePosition]);

  // Autonomous Lissajous LFO Orbit Mode for evolving ambient morphs
  useEffect(() => {
    if (!lfoOrbitActive) return;

    let animId: number;
    const animate = () => {
      orbitAngleRef.current += 0.015;
      const t = orbitAngleRef.current;
      // Figure-8 Lissajous
      const orbX = 0.5 + 0.38 * Math.sin(t);
      const orbY = 0.5 + 0.38 * Math.sin(t * 2);
      onChangePosition(Math.max(0, Math.min(1, orbX)), Math.max(0, Math.min(1, orbY)));
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [lfoOrbitActive, onChangePosition]);

  const cornerTL = corners.find(c => c.id === 'top_left') || { id: 'top_left', label: 'Layer A', sourceType: 'sample', color: '#00F0FF' };
  const cornerTR = corners.find(c => c.id === 'top_right') || { id: 'top_right', label: 'Layer B', sourceType: 'synth:karplus_strong', color: '#FFD700' };
  const cornerBL = corners.find(c => c.id === 'bottom_left') || { id: 'bottom_left', label: 'Layer C', sourceType: 'synth:fm_sine', color: '#A855F7' };
  const cornerBR = corners.find(c => c.id === 'bottom_right') || { id: 'bottom_right', label: 'Layer D', sourceType: 'synth:theremin', color: '#10B981' };

  // Calculate dynamic modulated cutoff based on X position
  const dynamicCutoff = Math.round(200 + x * (filterCutoffHz - 200));

  return (
    <div className="bg-[#0A0D16] border border-[#1E293B] rounded-xl p-5 flex flex-col gap-5 font-mono">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1E293B]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#00F0FF]/10 border border-[#00F0FF]/40 flex items-center justify-center text-[#00F0FF]">
            <Compass size={18} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              4-WAY X/Y VECTOR MORPHING GRID
              {thirdMindActive && (
                <span className="text-[9px] px-2 py-0.5 rounded bg-pink-950/80 text-pink-400 border border-pink-500/40 animate-pulse">
                  THIRD MIND ACTIVE
                </span>
              )}
            </h4>
            <p className="text-[11px] text-[#94A3B8]">
              Crossfades 4 distinct sample/synth quadrants seamlessly while scaling WebAudio filter cutoffs and saturation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* LFO Orbit Toggle */}
          <button
            onClick={() => {
              setLfoOrbitActive(!lfoOrbitActive);
              playLaserBeamSound('laser_midi');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
              lfoOrbitActive
                ? 'bg-[#00F0FF]/20 border-[#00F0FF] text-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                : 'bg-[#07090F] border-[#1E293B] text-[#94A3B8] hover:text-white'
            }`}
          >
            <Activity size={13} className={lfoOrbitActive ? 'animate-spin' : ''} />
            LFO ORBIT
          </button>

          {/* The "Third Mind" Generative Pad Toggle */}
          <button
            onClick={() => {
              onToggleThirdMind();
              playLaserBeamSound('laser_curve');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
              thirdMindActive
                ? 'bg-[#EC4899]/20 border-[#EC4899] text-[#EC4899] shadow-[0_0_15px_rgba(236,72,153,0.35)]'
                : 'bg-[#07090F] border-[#1E293B] text-[#94A3B8] hover:text-white'
            }`}
            title="William S. Burroughs Third Mind: Inverts and chops sample slices dynamically as vector moves"
          >
            <Sparkles size={13} />
            THE THIRD MIND
          </button>

          {/* Audition Button */}
          {onAuditionMorph && (
            <button
              onClick={onAuditionMorph}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#10B981]/20 hover:bg-[#10B981]/30 border border-[#10B981]/50 text-[#10B981] transition-all flex items-center gap-1.5"
            >
              <Play size={13} />
              AUDITION NOTE
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* The 2D Interactive Vector Pad (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] text-[#64748B]">
            <span>X: {(x * 100).toFixed(0)}% (Cutoff: {dynamicCutoff} Hz)</span>
            <span>Y: {(y * 100).toFixed(0)}% (Harmonics)</span>
          </div>

          <div
            ref={padRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative w-full h-72 sm:h-80 bg-[#060810] border-2 border-[#1E293B] rounded-2xl cursor-crosshair overflow-hidden touch-none select-none shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]"
          >
            {/* Background 4-Quadrant Soft Color Glows */}
            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-75"
              style={{
                background: `
                  radial-gradient(circle at 10% 10%, rgba(0, 240, 255, ${weightTL * 0.45}) 0%, transparent 60%),
                  radial-gradient(circle at 90% 10%, rgba(255, 215, 0, ${weightTR * 0.45}) 0%, transparent 60%),
                  radial-gradient(circle at 10% 90%, rgba(168, 85, 247, ${weightBL * 0.45}) 0%, transparent 60%),
                  radial-gradient(circle at 90% 90%, rgba(16, 185, 129, ${weightBR * 0.45}) 0%, transparent 60%)
                `
              }}
            />

            {/* Sub-grid Crosshair lines */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
              <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-[#64748B]" />
              <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-[#64748B]" />
              <div className="absolute top-1/4 left-0 right-0 h-[1px] border-b border-dashed border-[#64748B]/40" />
              <div className="absolute top-3/4 left-0 right-0 h-[1px] border-b border-dashed border-[#64748B]/40" />
              <div className="absolute left-1/4 top-0 bottom-0 w-[1px] border-r border-dashed border-[#64748B]/40" />
              <div className="absolute left-3/4 top-0 bottom-0 w-[1px] border-r border-dashed border-[#64748B]/40" />
            </div>

            {/* Corner Labels Inside Pad */}
            <div className="absolute top-3 left-3 text-[10px] font-bold text-[#00F0FF] bg-[#0A0D16]/90 px-2 py-1 rounded border border-[#00F0FF]/30 pointer-events-none">
              A: {cornerTL.label}
            </div>
            <div className="absolute top-3 right-3 text-[10px] font-bold text-[#FFD700] bg-[#0A0D16]/90 px-2 py-1 rounded border border-[#FFD700]/30 pointer-events-none">
              B: {cornerTR.label}
            </div>
            <div className="absolute bottom-3 left-3 text-[10px] font-bold text-[#A855F7] bg-[#0A0D16]/90 px-2 py-1 rounded border border-[#A855F7]/30 pointer-events-none">
              C: {cornerBL.label}
            </div>
            <div className="absolute bottom-3 right-3 text-[10px] font-bold text-[#10B981] bg-[#0A0D16]/90 px-2 py-1 rounded border border-[#10B981]/30 pointer-events-none">
              D: {cornerBR.label}
            </div>

            {/* Draggable Puck / Crosshair Cursor */}
            <div
              className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full pointer-events-none flex items-center justify-center transition-transform duration-75"
              style={{
                left: `${x * 100}%`,
                top: `${(1 - y) * 100}%`,
              }}
            >
              <div className="w-8 h-8 rounded-full bg-white/10 border-2 border-white shadow-[0_0_20px_#00F0FF] flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-[#00F0FF] shadow-[0_0_8px_#00F0FF]" />
              </div>
              {/* Dynamic Vector Lines radiating to corners */}
              <div className="absolute inset-0 rounded-full border border-dashed border-white/30 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
          </div>
        </div>

        {/* Quadrant Blend Meters & Layer Configuration (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-3">
          <div className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-2">
            <Layers size={14} className="text-[#00F0FF]" />
            QUADRANT LAYER BLEND MATRIX
          </div>

          <div className="space-y-3">
            {/* Corner A: Top Left */}
            <div className="p-2.5 rounded-lg bg-[#07090F] border border-[#00F0FF]/30 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#00F0FF] flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#00F0FF]" />
                  A (Top-Left): {cornerTL.label}
                </span>
                <span className="font-mono text-white text-[11px]">
                  {(weightTL * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#00F0FF] transition-all duration-75"
                  style={{ width: `${weightTL * 100}%` }}
                />
              </div>
              {onChangeCornerSource && (
                <select
                  value={cornerTL.sourceType}
                  onChange={(e) => onChangeCornerSource('top_left', e.target.value as any)}
                  className="text-[10px] bg-[#0A0D16] border border-[#1E293B] text-[#94A3B8] rounded px-2 py-0.5 mt-0.5"
                >
                  <option value="sample">Raw Audio Sample Buffer</option>
                  <option value="synth:karplus_strong">WebAudio Karplus-Strong String</option>
                  <option value="synth:fm_sine">WebAudio 2-Op FM Sine Bell</option>
                  <option value="synth:sub_bass">WebAudio Analog Sub Bass</option>
                  <option value="synth:theremin">WebAudio Lynchian Theremin</option>
                </select>
              )}
            </div>

            {/* Corner B: Top Right */}
            <div className="p-2.5 rounded-lg bg-[#07090F] border border-[#FFD700]/30 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#FFD700] flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#FFD700]" />
                  B (Top-Right): {cornerTR.label}
                </span>
                <span className="font-mono text-white text-[11px]">
                  {(weightTR * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#FFD700] transition-all duration-75"
                  style={{ width: `${weightTR * 100}%` }}
                />
              </div>
              {onChangeCornerSource && (
                <select
                  value={cornerTR.sourceType}
                  onChange={(e) => onChangeCornerSource('top_right', e.target.value as any)}
                  className="text-[10px] bg-[#0A0D16] border border-[#1E293B] text-[#94A3B8] rounded px-2 py-0.5 mt-0.5"
                >
                  <option value="synth:karplus_strong">WebAudio Karplus-Strong String</option>
                  <option value="sample">Raw Audio Sample Buffer</option>
                  <option value="synth:fm_sine">WebAudio 2-Op FM Sine Bell</option>
                  <option value="synth:sub_bass">WebAudio Analog Sub Bass</option>
                  <option value="synth:theremin">WebAudio Lynchian Theremin</option>
                </select>
              )}
            </div>

            {/* Corner C: Bottom Left */}
            <div className="p-2.5 rounded-lg bg-[#07090F] border border-[#A855F7]/30 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#A855F7] flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#A855F7]" />
                  C (Bottom-Left): {cornerBL.label}
                </span>
                <span className="font-mono text-white text-[11px]">
                  {(weightBL * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#A855F7] transition-all duration-75"
                  style={{ width: `${weightBL * 100}%` }}
                />
              </div>
              {onChangeCornerSource && (
                <select
                  value={cornerBL.sourceType}
                  onChange={(e) => onChangeCornerSource('bottom_left', e.target.value as any)}
                  className="text-[10px] bg-[#0A0D16] border border-[#1E293B] text-[#94A3B8] rounded px-2 py-0.5 mt-0.5"
                >
                  <option value="synth:fm_sine">WebAudio 2-Op FM Sine Bell</option>
                  <option value="sample">Raw Audio Sample Buffer</option>
                  <option value="synth:karplus_strong">WebAudio Karplus-Strong String</option>
                  <option value="synth:sub_bass">WebAudio Analog Sub Bass</option>
                  <option value="synth:theremin">WebAudio Lynchian Theremin</option>
                </select>
              )}
            </div>

            {/* Corner D: Bottom Right */}
            <div className="p-2.5 rounded-lg bg-[#07090F] border border-[#10B981]/30 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#10B981] flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                  D (Bottom-Right): {cornerBR.label}
                </span>
                <span className="font-mono text-white text-[11px]">
                  {(weightBR * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#10B981] transition-all duration-75"
                  style={{ width: `${weightBR * 100}%` }}
                />
              </div>
              {onChangeCornerSource && (
                <select
                  value={cornerBR.sourceType}
                  onChange={(e) => onChangeCornerSource('bottom_right', e.target.value as any)}
                  className="text-[10px] bg-[#0A0D16] border border-[#1E293B] text-[#94A3B8] rounded px-2 py-0.5 mt-0.5"
                >
                  <option value="synth:theremin">WebAudio Lynchian Theremin</option>
                  <option value="sample">Raw Audio Sample Buffer</option>
                  <option value="synth:karplus_strong">WebAudio Karplus-Strong String</option>
                  <option value="synth:fm_sine">WebAudio 2-Op FM Sine Bell</option>
                  <option value="synth:sub_bass">WebAudio Analog Sub Bass</option>
                </select>
              )}
            </div>
          </div>

          <div className="p-3 bg-[#060810] border border-[#1E293B] rounded-lg text-[10px] text-[#64748B]">
            <span className="text-[#00F0FF] font-bold">SFZ Script Macro:</span> Automatically generates <code>// &lt;vector_morph pad="xy_1" x="{(x).toFixed(2)}" y="{(y).toFixed(2)}" /&gt;</code> comments and sets zone volume offsets in exported instruments.
          </div>
        </div>
      </div>
    </div>
  );
};

export default VectorMorphPad;
