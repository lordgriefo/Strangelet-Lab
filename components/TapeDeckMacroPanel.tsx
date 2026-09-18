import React, { useState, useRef, useEffect } from 'react';
import { Disc, Play, Radio, Volume2, Sparkles, Sliders, Zap, Activity, Waves } from 'lucide-react';
import { TapeDeckParams, IrReverbType } from '../lib/tapeDeckDSP';
import { playLaserBeamSound } from '../lib/laserSound';

export interface TapeDeckMacroPanelProps {
  params: TapeDeckParams;
  onChangeParams: (newParams: Partial<TapeDeckParams>) => void;
  analyserNode?: AnalyserNode | null;
  onAuditionTape?: () => void;
  canvasTheme?: 'noir_velvet' | 'vacuum_tube_crt' | 'cyberpunk_amber' | 'bw_chevron';
  onChangeCanvasTheme?: (theme: 'noir_velvet' | 'vacuum_tube_crt' | 'cyberpunk_amber' | 'bw_chevron') => void;
}

export const TapeDeckMacroPanel: React.FC<TapeDeckMacroPanelProps> = ({
  params,
  onChangeParams,
  analyserNode,
  onAuditionTape,
  canvasTheme = 'noir_velvet',
  onChangeCanvasTheme
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reelAngle, setReelAngle] = useState(0);
  const [tubeGlowIntensity, setTubeGlowIntensity] = useState(0.25);

  // Animate tape reels and live oscilloscope
  useEffect(() => {
    let animId: number;
    let dataArray: Uint8Array | null = null;

    if (analyserNode) {
      dataArray = new Uint8Array(analyserNode.frequencyBinCount);
    }

    const render = () => {
      // 1. Rotate reels continuously
      setReelAngle(prev => (prev + 1.2 + params.wow * 1.5) % 360);

      // 2. Draw live oscilloscope
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;

          // Theme color configurations
          let bgColor = '#05070C';
          let beamColor = '#00F0FF';
          let gridColor = 'rgba(0, 240, 255, 0.08)';

          if (canvasTheme === 'vacuum_tube_crt') {
            bgColor = '#030804';
            beamColor = '#10B981';
            gridColor = 'rgba(16, 185, 129, 0.1)';
          } else if (canvasTheme === 'cyberpunk_amber') {
            bgColor = '#0A0602';
            beamColor = '#F59E0B';
            gridColor = 'rgba(245, 158, 11, 0.1)';
          } else if (canvasTheme === 'bw_chevron') {
            bgColor = '#050505';
            beamColor = '#FFFFFF';
            gridColor = 'rgba(255, 255, 255, 0.08)';
          }

          // Persistence fade effect (gives authentic phosphor CRT decay)
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, width, height);

          // Subtle CRT Graticule / Grid Lines
          ctx.strokeStyle = gridColor;
          ctx.lineWidth = 1;
          for (let x = 0; x < width; x += 30) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
          }
          for (let y = 0; y < height; y += 25) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
          }

          // Audio Waveform Beam
          if (analyserNode && dataArray) {
            analyserNode.getByteTimeDomainData(dataArray);

            ctx.lineWidth = 2.2;
            ctx.strokeStyle = beamColor;
            ctx.shadowBlur = 10;
            ctx.shadowColor = beamColor;

            ctx.beginPath();
            const sliceWidth = width / dataArray.length;
            let x = 0;
            let peakRms = 0;

            for (let i = 0; i < dataArray.length; i++) {
              const v = dataArray[i] / 128.0; // 0 to 2, centered at 1
              const y = (v * height) / 2;
              const deviation = Math.abs(v - 1);
              if (deviation > peakRms) peakRms = deviation;

              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
              x += sliceWidth;
            }

            ctx.stroke();
            ctx.shadowBlur = 0;

            // Reactive Vacuum Tube Glow flares with peak audio
            const currentGlow = Math.min(1.0, 0.2 + peakRms * 2.5);
            setTubeGlowIntensity(prev => prev * 0.8 + currentGlow * 0.2);
          } else {
            // Idle simulated gentle sine hum
            ctx.lineWidth = 1.8;
            ctx.strokeStyle = beamColor;
            ctx.beginPath();
            const t = Date.now() * 0.003;
            for (let x = 0; x < width; x += 4) {
              const y = height / 2 + Math.sin(x * 0.04 + t) * 6;
              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [analyserNode, canvasTheme, params.wow]);

  return (
    <div className="bg-[#0A0D16] border border-[#1E293B] rounded-xl p-5 flex flex-col gap-6 font-mono text-[#E2E8F0]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1E293B]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#FFD700]/10 border border-[#FFD700]/40 flex items-center justify-center text-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.2)]">
            <Disc size={18} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              "THE TAPE DECK" VINTAGE MACRO RACK & CRT OSCILLOSCOPE
              <span className="text-[9px] px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-500/40">
                1/4" MASTER TAPE DSP
              </span>
            </h4>
            <p className="text-[11px] text-[#94A3B8]">
              Non-linear soft-clipping tape saturation, dual-LFO wow/flutter, random oxide dropouts, and synthetic spring tank convolution.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Canvas Theme Selector */}
          {onChangeCanvasTheme && (
            <div className="flex items-center gap-1.5 bg-[#07090F] border border-[#1E293B] rounded-lg p-1">
              <span className="text-[10px] text-[#64748B] pl-1 font-bold">THEME:</span>
              <select
                value={canvasTheme}
                onChange={(e) => onChangeCanvasTheme(e.target.value as any)}
                className="px-2 py-0.5 bg-[#0A0D16] text-xs font-bold text-[#00F0FF] rounded border-none focus:outline-none"
              >
                <option value="noir_velvet">Noir Velvet (Cyan)</option>
                <option value="vacuum_tube_crt">1978 CRT (Emerald)</option>
                <option value="cyberpunk_amber">Amber Glow (Gold)</option>
                <option value="bw_chevron">B&W Twin Peaks</option>
              </select>
            </div>
          )}

          {/* Test Audition Button */}
          {onAuditionTape && (
            <button
              onClick={() => {
                onAuditionTape();
                playLaserBeamSound('laser_audio');
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FFD700]/20 hover:bg-[#FFD700]/30 border border-[#FFD700]/50 text-[#FFD700] transition-all flex items-center gap-1.5"
            >
              <Play size={13} />
              AUDITION TAPE TONE
            </button>
          )}
        </div>
      </div>

      {/* Main Rack View: Reels + Live CRT Oscilloscope + Vacuum Tubes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Dual Spinning Tape Reels (4 cols) */}
        <div className="lg:col-span-4 bg-[#060810] border border-[#1E293B] rounded-xl p-4 flex flex-col items-center justify-center gap-3 relative overflow-hidden">
          <div className="text-[10px] font-bold text-[#64748B] tracking-wider w-full flex justify-between">
            <span>AMPEX 456 PRECISION TRANSPORT</span>
            <span className="text-[#FFD700]">15 IPS</span>
          </div>

          <div className="flex items-center justify-center gap-6 py-2 relative">
            {/* Magnetic Tape Ribbon across reels */}
            <div className="absolute top-1/2 left-8 right-8 h-[2px] bg-[#3B2516] -translate-y-1/2 pointer-events-none shadow-[0_0_6px_rgba(180,83,9,0.5)]" />

            {/* Left Supply Reel */}
            <div className="relative w-24 h-24 rounded-full bg-[#111624] border-2 border-[#334155] flex items-center justify-center shadow-lg">
              <div
                className="w-full h-full rounded-full flex items-center justify-center transition-transform duration-75"
                style={{ transform: `rotate(${reelAngle}deg)` }}
              >
                {/* 3 Reel Flange Slots */}
                <div className="absolute w-1.5 h-16 bg-[#334155]/60 rounded" />
                <div className="absolute w-1.5 h-16 bg-[#334155]/60 rounded rotate-60" />
                <div className="absolute w-1.5 h-16 bg-[#334155]/60 rounded -rotate-60" />
                {/* Reel Hub */}
                <div className="w-8 h-8 rounded-full bg-[#1E293B] border border-[#FFD700]/60 flex items-center justify-center shadow-inner">
                  <div className="w-2 h-2 rounded-full bg-[#FFD700]" />
                </div>
              </div>
            </div>

            {/* Right Take-up Reel */}
            <div className="relative w-24 h-24 rounded-full bg-[#111624] border-2 border-[#334155] flex items-center justify-center shadow-lg">
              <div
                className="w-full h-full rounded-full flex items-center justify-center transition-transform duration-75"
                style={{ transform: `rotate(${reelAngle * 1.05}deg)` }}
              >
                <div className="absolute w-1.5 h-16 bg-[#334155]/60 rounded" />
                <div className="absolute w-1.5 h-16 bg-[#334155]/60 rounded rotate-60" />
                <div className="absolute w-1.5 h-16 bg-[#334155]/60 rounded -rotate-60" />
                <div className="w-8 h-8 rounded-full bg-[#1E293B] border border-[#00F0FF]/60 flex items-center justify-center shadow-inner">
                  <div className="w-2 h-2 rounded-full bg-[#00F0FF]" />
                </div>
              </div>
            </div>
          </div>

          <div className="w-full flex items-center justify-between text-[9px] text-[#64748B] pt-1 border-t border-[#1E293B]">
            <span>WOW: {(params.wow * 100).toFixed(0)}%</span>
            <span>FLUTTER: {(params.flutter * 100).toFixed(0)}%</span>
            <span>OXIDE: {(params.age * 100).toFixed(0)}%</span>
          </div>
        </div>

        {/* Live Phosphor CRT Oscilloscope & Dual VU Tubes (8 cols) */}
        <div className="lg:col-span-8 bg-[#060810] border border-[#1E293B] rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-[#00F0FF]" />
              <span className="text-xs font-bold text-white tracking-wider">
                REAL-TIME PHOSPHOR CRT OSCILLOSCOPE
              </span>
            </div>

            {/* Reactive Vacuum Tube Gauges */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#64748B] font-bold">12AX7 TUBE 1:</span>
                <div
                  className="w-3.5 h-8 rounded-full border border-amber-500/50 bg-[#1E1408] flex items-center justify-center relative transition-all duration-75"
                  style={{
                    boxShadow: `0 0 ${tubeGlowIntensity * 18}px rgba(245, 158, 11, ${tubeGlowIntensity * 0.9})`,
                    borderColor: `rgba(245, 158, 11, ${0.4 + tubeGlowIntensity * 0.6})`
                  }}
                >
                  <div
                    className="w-1 h-5 rounded-full bg-amber-400"
                    style={{ opacity: 0.3 + tubeGlowIntensity * 0.7 }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#64748B] font-bold">TUBE 2:</span>
                <div
                  className="w-3.5 h-8 rounded-full border border-amber-500/50 bg-[#1E1408] flex items-center justify-center relative transition-all duration-75"
                  style={{
                    boxShadow: `0 0 ${tubeGlowIntensity * 18}px rgba(245, 158, 11, ${tubeGlowIntensity * 0.9})`,
                    borderColor: `rgba(245, 158, 11, ${0.4 + tubeGlowIntensity * 0.6})`
                  }}
                >
                  <div
                    className="w-1 h-5 rounded-full bg-amber-400"
                    style={{ opacity: 0.3 + tubeGlowIntensity * 0.7 }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* CRT Screen Canvas */}
          <div className="w-full h-32 rounded-lg border border-[#1E293B] overflow-hidden relative shadow-inner">
            <canvas
              ref={canvasRef}
              width={640}
              height={128}
              className="w-full h-full block"
            />
            {/* Scanline CRT overlay */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-40" />
          </div>
        </div>
      </div>

      {/* Tactile Macro Knobs Rack */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Warmth / Tape Drive */}
        <div className="bg-[#07090F] border border-[#FFD700]/30 rounded-xl p-3.5 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#FFD700]">WARMTH / DRIVE</span>
            <span className="text-white font-mono text-[11px]">
              {(params.drive * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={params.drive}
            onChange={(e) => onChangeParams({ drive: parseFloat(e.target.value) })}
            className="w-full accent-[#FFD700] cursor-pointer"
          />
          <div className="text-[10px] text-[#64748B]">
            Hyperbolic soft-clipping tape head saturation
          </div>
        </div>

        {/* 2. Tape Flutter / Wow */}
        <div className="bg-[#07090F] border border-[#00F0FF]/30 rounded-xl p-3.5 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#00F0FF]">TAPE FLUTTER / WOW</span>
            <span className="text-white font-mono text-[11px]">
              {(params.wow * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={params.wow}
            onChange={(e) => onChangeParams({ wow: parseFloat(e.target.value), flutter: parseFloat(e.target.value) * 0.8 })}
            className="w-full accent-[#00F0FF] cursor-pointer"
          />
          <div className="text-[10px] text-[#64748B]">
            0.55Hz & 4.8Hz analog motor transport drift
          </div>
        </div>

        {/* 3. Age / Dropout */}
        <div className="bg-[#07090F] border border-[#A855F7]/30 rounded-xl p-3.5 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#A855F7]">AGE / DROPOUT</span>
            <span className="text-white font-mono text-[11px]">
              {(params.age * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={params.age}
            onChange={(e) => onChangeParams({ age: parseFloat(e.target.value) })}
            className="w-full accent-[#A855F7] cursor-pointer"
          />
          <div className="text-[10px] text-[#64748B]">
            Oxide wear, treble roll-off & random dips
          </div>
        </div>

        {/* 4. Spring IR Tank Reverb */}
        <div className="bg-[#07090F] border border-[#10B981]/30 rounded-xl p-3.5 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#10B981]">SPRING TANK IR</span>
            <span className="text-white font-mono text-[11px]">
              {(params.reverbMix * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={params.reverbMix}
            onChange={(e) => onChangeParams({ reverbMix: parseFloat(e.target.value) })}
            className="w-full accent-[#10B981] cursor-pointer"
          />
          <select
            value={params.irType}
            onChange={(e) => onChangeParams({ irType: e.target.value as IrReverbType })}
            className="text-[10px] bg-[#0A0D16] border border-[#1E293B] text-[#10B981] rounded px-1.5 py-0.5"
          >
            <option value="spring_reverb_tank">Accutronics Spring Tank</option>
            <option value="dark_chamber">Lynchian Dark Chamber</option>
            <option value="vintage_plate">EMT 140 Vintage Plate</option>
            <option value="cathedral_abyss">Cathedral Abyss</option>
          </select>
        </div>

        {/* 5. Master Cutoff */}
        <div className="bg-[#07090F] border border-[#EC4899]/30 rounded-xl p-3.5 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#EC4899]">TONE CUTOFF</span>
            <span className="text-white font-mono text-[11px]">
              {Math.round(params.cutoffHz)} Hz
            </span>
          </div>
          <input
            type="range"
            min="200"
            max="20000"
            step="50"
            value={params.cutoffHz}
            onChange={(e) => onChangeParams({ cutoffHz: parseFloat(e.target.value) })}
            className="w-full accent-[#EC4899] cursor-pointer"
          />
          <div className="text-[10px] text-[#64748B]">
            Master 24dB/oct lowpass tape tone filter
          </div>
        </div>
      </div>
    </div>
  );
};

export default TapeDeckMacroPanel;
