import React, { useState, useEffect } from 'react';
import { Cpu, Zap, Sliders } from 'lucide-react';
import { THEME } from '../constants';
import { 
  getStoredResourceState, 
  calculateCurrentVramMetrics, 
  HARDWARE_TIERS 
} from '../services/hardwareResourceManager';

interface HardwareMonitorProps {
  vramUsed?: number;
  vramTotal?: number;
  onOpenResourceManager?: () => void;
}

const HardwareMonitor: React.FC<HardwareMonitorProps> = ({ 
  vramUsed: propVramUsed, 
  vramTotal: propVramTotal,
  onOpenResourceManager 
}) => {
  const [metrics, setMetrics] = useState(() => {
    const resState = getStoredResourceState();
    return calculateCurrentVramMetrics(resState);
  });

  const [activeTier, setActiveTier] = useState(() => {
    return getStoredResourceState().activeTier;
  });

  // Re-read storage only when changed or on low-frequency fallback when visible
  useEffect(() => {
    const update = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      const resState = getStoredResourceState();
      const nextMetrics = calculateCurrentVramMetrics(resState);
      setMetrics(prev =>
        prev.vramUsedGb === nextMetrics.vramUsedGb && prev.vramTotalGb === nextMetrics.vramTotalGb
          ? prev
          : nextMetrics
      );
      setActiveTier(prev => (prev === resState.activeTier ? prev : resState.activeTier));
    };
    window.addEventListener('storage', update);
    window.addEventListener('strangelet-resource-updated', update);
    const interval = window.setInterval(update, 15000);
    return () => {
      window.removeEventListener('storage', update);
      window.removeEventListener('strangelet-resource-updated', update);
      window.clearInterval(interval);
    };
  }, []);

  const total = propVramTotal || metrics.vramTotalGb;
  const used = propVramUsed !== undefined ? propVramUsed : metrics.vramUsedGb;
  const usagePercent = Math.min(100, (used / total) * 100);
  const isHigh = usagePercent > 80;
  const tierProfile = HARDWARE_TIERS[activeTier] || HARDWARE_TIERS.tier_6gb;

  return (
    <div 
      onClick={onOpenResourceManager}
      className={`flex items-center space-x-3 bg-black/60 px-3.5 py-1.5 rounded-full border transition-all ${
        onOpenResourceManager ? 'cursor-pointer hover:border-[#FFD700]/70 hover:bg-[#121624] shadow-[0_0_10px_rgba(0,0,0,0.5)] group' : 'border-[#333]'
      } ${isHigh ? 'border-red-500/50' : 'border-[#262C44]'}`}
      title={onOpenResourceManager ? "Open Modular Resource & VRAM Manager (Switch Tiers / Offload Components)" : undefined}
    >
      <div className="flex items-center space-x-2">
        <Cpu size={14} className={onOpenResourceManager ? "text-[#FFD700] group-hover:scale-110 transition-transform" : "text-[#FFD700]"} />
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono text-[#C0C6DC] hidden sm:inline">
            {tierProfile.targetHardware.split('/')[0].trim()}
          </span>
          <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase border ${
            activeTier === 'tier_4gb'
              ? 'bg-red-950/80 border-red-500/50 text-red-300'
              : activeTier === 'tier_6gb' 
              ? 'bg-amber-950/80 border-amber-500/50 text-amber-300'
              : activeTier === 'tier_16gb'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
              : 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300'
          }`}>
            {tierProfile.totalVramGb}GB
          </span>
        </div>
      </div>
      
      <div className="h-3.5 w-[1px] bg-[#333]" />

      <div className="flex items-center space-x-2 min-w-[125px]">
        <Zap size={14} color={isHigh ? THEME.colors.danger : THEME.colors.gold} />
        <div className="flex flex-col w-full">
            <div className="flex justify-between text-[9px] font-mono mb-0.5">
                <span className="text-[#8E95B8]">VRAM</span>
                <span className={isHigh ? 'text-red-400 font-bold' : 'text-[#FFD700] font-bold'}>
                    {used.toFixed(1)} / {total}GB
                </span>
            </div>
            <div className="w-full h-1 bg-[#1E2538] rounded-full overflow-hidden">
                <div 
                    className="h-full transition-all duration-500 ease-out"
                    style={{ 
                        width: `${usagePercent}%`,
                        backgroundColor: isHigh ? THEME.colors.danger : THEME.colors.gold
                    }}
                />
            </div>
        </div>
        {onOpenResourceManager && (
          <Sliders size={12} className="text-[#888] group-hover:text-amber-300 transition-colors hidden md:block" />
        )}
      </div>
    </div>
  );
};

export default HardwareMonitor;