import React from 'react';
import { 
  Zap, Crosshair, Sparkles, Flame, Sliders, Music, Waves, Radio, 
  Trash2, MousePointer2, CircleDot, Cpu
} from 'lucide-react';
import { playLaserBeamSound } from '../lib/laserSound';

export type ActiveTool = 
  | 'laser_audio'   // Blue Laser: Audio Loop Add / Slice
  | 'laser_midi'    // Green Laser: MIDI Matrix Add
  | 'laser_erase'   // Red Laser: Incremental Snap Erase
  | 'laser_curve'   // Amber Laser: Vegas Neon Curve Draw
  | 'laser_select'  // Purple: Black Lodge Quantum Scrubber / Select
  | 'beam'          // Backwards compat alias for laser_audio
  | 'erase'         // Backwards compat alias for laser_erase
  | 'draw'          // Backwards compat alias for laser_curve
  | 'select';       // Backwards compat alias for laser_select

interface ToolbarProps {
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
  beamModeEnabled?: boolean;
  onToggleBeamMode?: () => void;
  showAllEnvelopes?: boolean;
  onToggleAllEnvelopes?: () => void;
  isRecording?: boolean;
  isArmedAny?: boolean;
  isVstBrowserOpen?: boolean;
  onToggleVstBrowser?: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  activeTool, 
  setActiveTool,
  beamModeEnabled = true,
  onToggleBeamMode,
  showAllEnvelopes, 
  onToggleAllEnvelopes,
  isRecording = false,
  isArmedAny = false,
  isVstBrowserOpen,
  onToggleVstBrowser
}) => {
  // Normalize active tool for display
  const normalizedTool: string = 
    activeTool === 'beam' ? 'laser_audio' :
    activeTool === 'erase' ? 'laser_erase' :
    activeTool === 'draw' ? 'laser_curve' :
    activeTool === 'select' ? 'laser_select' : activeTool;

  const laserTools = [
    { 
      id: 'laser_audio' as ActiveTool, 
      label: 'Laser Paint [P]', 
      sub: beamModeEnabled ? 'ACID Paint · R Erase' : 'ACID Paint · R Menu',
      beamColor: '#00F0FF', 
      glow: 'rgba(0,240,255,0.4)', 
      icon: Waves 
    },
    { 
      id: 'laser_midi' as ActiveTool, 
      label: 'MIDI Paint [M]', 
      sub: beamModeEnabled ? 'ACID Paint · R Erase' : 'ACID Paint · R Menu',
      beamColor: '#10B981', 
      glow: 'rgba(16,185,129,0.4)', 
      icon: Music 
    },
    { 
      id: 'laser_erase' as ActiveTool, 
      label: 'Red Eraser [E]', 
      sub: 'Snap Erase [E]',
      beamColor: '#EF4444', 
      glow: 'rgba(239,68,68,0.45)', 
      icon: Flame 
    },
    { 
      id: 'laser_curve' as ActiveTool, 
      label: 'Amber Curves [C]', 
      sub: 'Vegas Neon Curves',
      beamColor: '#FFD700', 
      glow: 'rgba(255,215,0,0.4)', 
      icon: Sparkles 
    },
    { 
      id: 'laser_select' as ActiveTool, 
      label: 'Lodge Select [S]', 
      sub: 'Select & Move Clips',
      beamColor: '#A855F7', 
      glow: 'rgba(168,85,247,0.4)', 
      icon: Crosshair 
    },
  ];

  const handleSelectTool = (toolId: ActiveTool) => {
    setActiveTool(toolId);
    playLaserBeamSound(toolId as any);
  };

  return (
    <div className="flex flex-wrap items-center justify-between p-2 bg-[#04060C] border-b border-[#1E293B] gap-2 select-none">
      {/* Laser Pointer Emitter Station */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <div className="flex items-center gap-1.5 mr-1 px-2 py-0.5 rounded bg-[#090D18] border border-[#1E293B]">
          <Zap size={13} className="text-[#FFD700] animate-pulse" />
          <span className="text-[10px] font-mono text-[#FFD700] uppercase tracking-wider font-bold">
            LASER BEAMS:
          </span>
        </div>

        {laserTools.map(tool => {
          const isActive = normalizedTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => handleSelectTool(tool.id)}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-all text-xs font-mono group relative cursor-pointer ${
                isActive 
                  ? 'border shadow-lg font-bold' 
                  : 'bg-[#0A0E18] border border-[#1E293B] text-[#94A3B8] hover:text-white hover:border-[#38BDF8]/60'
              }`}
              style={{
                backgroundColor: isActive ? `${tool.beamColor}20` : undefined,
                borderColor: isActive ? tool.beamColor : undefined,
                color: isActive ? tool.beamColor : undefined,
                boxShadow: isActive ? `0 0 12px ${tool.glow}` : undefined,
              }}
              title={`${tool.label} (${tool.sub})`}
            >
              {/* Glowing Beam Core Indicator */}
              <span 
                className={`w-2 h-2 rounded-full transition-transform ${isActive ? 'scale-125' : 'group-hover:scale-110'}`}
                style={{
                  backgroundColor: tool.beamColor,
                  boxShadow: `0 0 6px ${tool.beamColor}`
                }}
              />
              <tool.icon size={13} style={{ color: isActive ? tool.beamColor : '#94A3B8' }} />
              <div className="flex flex-col text-left leading-none">
                <span className="text-[10px] font-bold">{tool.label}</span>
                <span className="text-[8px] opacity-70 hidden sm:inline">{tool.sub}</span>
              </div>
            </button>
          );
        })}

        {/* Dedicated Beam Mode ON/OFF Switch */}
        {onToggleBeamMode && (
          <button
            type="button"
            onClick={onToggleBeamMode}
            className={`ml-1 px-2.5 py-1 rounded border text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
              beamModeEnabled
                ? 'bg-[#00F0FF]/15 border-[#00F0FF] text-[#00F0FF] shadow-[0_0_10px_rgba(0,240,255,0.28)] font-bold'
                : 'bg-[#0E131F] border-[#334155] text-[#CBD5E1] hover:text-white hover:border-[#64748B]'
            }`}
            title={
              beamModeEnabled
                ? 'Beam Mode ON: Right-click/drag on lanes erases incrementally. Click to turn OFF and restore Studio Right-Click Menu [B]'
                : 'Beam Mode OFF: Right-click on tracks or segments opens the Studio Right-Click Menu (Audio/MIDI Editor, Views, Actions). Click to turn ON [B]'
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                beamModeEnabled ? 'bg-[#00F0FF] animate-pulse shadow-[0_0_6px_#00F0FF]' : 'bg-[#64748B]'
              }`}
            />
            <div className="flex flex-col text-left leading-none">
              <span className="text-[10px] font-bold">
                BEAM MODE: {beamModeEnabled ? 'ON' : 'OFF'}
              </span>
              <span className="text-[8px] opacity-75 hidden sm:inline">
                {beamModeEnabled ? 'R-Click Erases [B]' : 'R-Click Menu [B]'}
              </span>
            </div>
          </button>
        )}
      </div>

      {/* Active Laser Tool Beam Paint / Context Menu Hint Badge */}
      {(normalizedTool === 'laser_audio' || normalizedTool === 'laser_midi') && (
        <div
          className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] font-mono ${
            beamModeEnabled
              ? 'bg-[#09101E] border-[#00F0FF]/30 text-[#00F0FF] shadow-[0_0_8px_rgba(0,240,255,0.15)]'
              : 'bg-[#0C111D] border-[#334155] text-[#CBD5E1]'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              beamModeEnabled ? 'bg-[#00F0FF] animate-pulse' : 'bg-[#A855F7]'
            }`}
          />
          <span className="font-bold">{beamModeEnabled ? 'BEAM MODE:' : 'MENU MODE:'}</span>
          <span className="text-[#8C9BBF]">
            {beamModeEnabled
              ? 'Left-click/drag: paint · Right-click/drag: snap erase · Edge: trim · Alt = micro'
              : 'Left-click/drag: paint · Right-click track/clip: Studio Menu · Edge: trim'}
          </span>
        </div>
      )}
      {normalizedTool === 'laser_erase' && (
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1C0D12] border border-[#EF4444]/40 text-[10px] font-mono text-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.15)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
          <span className="font-bold">RED ERASER [E]:</span>
          <span className="text-[#FCA5A5]">Click: erase 1 snapped step · Drag: carve slice · Shift+Click: delete clip · Alt = micro</span>
        </div>
      )}

      {/* Right controls: All Envelopes & Recording Status */}
      <div className="flex items-center gap-2">
        {/* Live Recording Ready Indicator */}
        {isArmedAny && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1C0D12] border border-[#EF4444] text-[10px] font-mono text-[#EF4444] animate-pulse">
            <CircleDot size={11} />
            <span className="font-bold">ARMED READY</span>
          </div>
        )}

        {onToggleAllEnvelopes && (
          <button
            onClick={onToggleAllEnvelopes}
            className={`px-2.5 py-1 rounded border text-[11px] font-mono flex items-center gap-1.5 transition-colors ${
              showAllEnvelopes 
                ? 'bg-[#FFD700]/20 border-[#FFD700] text-[#FFD700] shadow-[0_0_8px_rgba(255,215,0,0.3)]' 
                : 'bg-[#0E131F] border-[#1E293B] text-[#94A3B8] hover:text-white'
            }`}
            title="Toggle All Track Automation Lanes"
          >
            <Sliders size={12} />
            <span>{showAllEnvelopes ? 'Hide Envelopes' : 'All Envelopes'}</span>
          </button>
        )}

        {onToggleVstBrowser && (
          <button
            onClick={onToggleVstBrowser}
            className={`px-2.5 py-1 rounded border text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isVstBrowserOpen
                ? 'bg-[#EC4899]/20 border-[#EC4899] text-[#EC4899] shadow-[0_0_10px_rgba(236,72,153,0.35)]'
                : 'bg-[#0E131F] border-[#1E293B] text-[#94A3B8] hover:text-[#EC4899] hover:border-[#EC4899]/60'
            }`}
            title="Toggle Global VST Browser & Parameter Automation Side-Panel"
          >
            <Cpu size={12} />
            <span>VST BROWSER</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Toolbar;


