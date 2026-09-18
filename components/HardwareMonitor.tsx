import React from 'react';
import { Cpu, Zap } from 'lucide-react';
import { THEME } from '../constants';

interface HardwareMonitorProps {
  vramUsed: number;
  vramTotal: number;
}

const HardwareMonitor: React.FC<HardwareMonitorProps> = ({ vramUsed, vramTotal }) => {
  const usagePercent = (vramUsed / vramTotal) * 100;
  const isHigh = usagePercent > 80;

  return (
    <div className="flex items-center space-x-4 bg-black/40 px-4 py-2 rounded-full border border-[#333]">
      <div className="flex items-center space-x-2">
        <Cpu size={16} color={THEME.colors.gold} />
        <span className="text-xs font-mono text-[#A0A0A0]">GPU: NVIDIA RTX 3060</span>
      </div>
      
      <div className="h-4 w-[1px] bg-[#333]" />

      <div className="flex items-center space-x-2 min-w-[140px]">
        <Zap size={16} color={isHigh ? THEME.colors.danger : THEME.colors.gold} />
        <div className="flex flex-col w-full">
            <div className="flex justify-between text-[10px] font-mono mb-1">
                <span className="text-[#A0A0A0]">VRAM</span>
                <span className={isHigh ? 'text-red-500' : 'text-[#FFD700]'}>
                    {vramUsed.toFixed(1)}GB / {vramTotal}GB
                </span>
            </div>
            <div className="w-full h-1 bg-[#333] rounded-full overflow-hidden">
                <div 
                    className="h-full transition-all duration-500 ease-out"
                    style={{ 
                        width: `${usagePercent}%`,
                        backgroundColor: isHigh ? THEME.colors.danger : THEME.colors.gold
                    }}
                />
            </div>
        </div>
      </div>
    </div>
  );
};

export default HardwareMonitor;