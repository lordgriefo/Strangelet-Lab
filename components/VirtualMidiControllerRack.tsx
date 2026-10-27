import React, { useState, useEffect } from 'react';
import { midiLearnService, MidiDeviceStatus } from '../services/midiLearnService';
import { Sliders, X, Zap, Cpu, Radio, RotateCcw, Volume2, Sparkles, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface VirtualMidiControllerRackProps {
  isOpen: boolean;
  onClose: () => void;
  onAutoMap8?: () => void;
}

export const VirtualMidiControllerRack: React.FC<VirtualMidiControllerRackProps> = ({
  isOpen,
  onClose,
  onAutoMap8
}) => {
  if (!isOpen) return null;

  const [deviceStatus, setDeviceStatus] = useState<MidiDeviceStatus>(midiLearnService.getStatus());
  const [faderValues, setFaderValues] = useState<number[]>([100, 95, 90, 85, 105, 92, 88, 100]); // 0 - 127
  const [knobValues, setKnobValues] = useState<number[]>([64, 64, 64, 64, 64, 64, 64, 64]); // 0 - 127 (64 is Center)
  const [activeChannel, setActiveChannel] = useState<number>(1);
  const [lastSentCC, setLastSentCC] = useState<{ cc: number; val: number } | null>(null);

  useEffect(() => {
    return midiLearnService.subscribeStatus(setDeviceStatus);
  }, []);

  const handleFaderChange = (index: number, val: number) => {
    const next = [...faderValues];
    next[index] = val;
    setFaderValues(next);

    const ccNumber = index + 1; // CC 1 - 8
    midiLearnService.simulateMidiMessage(activeChannel, ccNumber, val);
    setLastSentCC({ cc: ccNumber, val });
  };

  const handleKnobChange = (index: number, val: number) => {
    const next = [...knobValues];
    next[index] = val;
    setKnobValues(next);

    const ccNumber = index + 16; // CC 16 - 23
    midiLearnService.simulateMidiMessage(activeChannel, ccNumber, val);
    setLastSentCC({ cc: ccNumber, val });
  };

  return (
    <div className="fixed bottom-14 left-4 right-4 md:left-24 md:right-24 z-50 bg-[#0A0D18]/98 border border-[#2D3958] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] backdrop-blur-xl p-4 animate-fade-in font-mono select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1E263E]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wider">HARDWARE MIDI CONTROLLER RACK</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-500/50 text-amber-300 font-bold uppercase">
                {deviceStatus.isConnected ? `${deviceStatus.devices.length} USB Device(s) Ready` : 'Virtual + Physical Ready'}
              </span>
            </div>
            <p className="text-[10px] text-[#828BAE]">
              Move any hardware knob/slider or use the virtual desk below. Click "Learn" on any mixer track to bind!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onAutoMap8 && (
            <button
              onClick={onAutoMap8}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1 transition-all"
              title="Automatically map first 8 mixer tracks (CC 1-8 Volume, CC 16-23 Pan)"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Auto-Map 8 Tracks</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#11172A] border border-[#222D4A] text-[10px] text-[#A0A9C8]">
            <span>Ch:</span>
            <select
              value={activeChannel}
              onChange={(e) => setActiveChannel(Number(e.target.value))}
              className="bg-transparent text-amber-300 font-bold outline-none cursor-pointer"
            >
              {Array.from({ length: 16 }, (_, i) => i + 1).map(ch => (
                <option key={ch} value={ch} className="bg-[#0E1322] text-white">Ch {ch}</option>
              ))}
            </select>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7680A2] hover:text-white hover:bg-[#1A2238] transition-colors"
            title="Close Controller Rack"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Controller Desk: 8 Knobs + 8 Faders */}
      <div className="pt-3 grid grid-cols-8 gap-2">
        {Array.from({ length: 8 }).map((_, idx) => {
          const faderCC = idx + 1;
          const knobCC = idx + 16;
          const isFaderActive = lastSentCC?.cc === faderCC;
          const isKnobActive = lastSentCC?.cc === knobCC;

          return (
            <div key={idx} className="p-2 rounded-xl bg-[#0E1324] border border-[#1E263E] flex flex-col items-center gap-2">
              <div className="text-[9px] font-bold text-[#7E88AA] uppercase">CH {idx + 1}</div>

              {/* Pan Knob Simulator (CC 16-23) */}
              <div className="flex flex-col items-center gap-1 w-full">
                <div className="flex items-center justify-between w-full px-1 text-[8px] text-[#636C8C]">
                  <span>CC {knobCC}</span>
                  <span className={isKnobActive ? 'text-cyan-300 font-bold' : ''}>
                    {knobValues[idx] === 64 ? 'C' : knobValues[idx] < 64 ? `L${64 - knobValues[idx]}` : `R${knobValues[idx] - 64}`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="127"
                  value={knobValues[idx]}
                  onChange={(e) => handleKnobChange(idx, Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-[#171E34] rounded-lg appearance-none cursor-pointer"
                  title={`Knob CC ${knobCC} (Pan)`}
                />
              </div>

              {/* Volume Fader Simulator (CC 1-8) */}
              <div className="flex flex-col items-center gap-1 w-full">
                <div className="flex items-center justify-between w-full px-1 text-[8px] text-[#636C8C]">
                  <span>CC {faderCC}</span>
                  <span className={isFaderActive ? 'text-amber-300 font-bold' : ''}>
                    {faderValues[idx]}
                  </span>
                </div>
                <div className="h-28 w-full flex items-center justify-center py-1">
                  <input
                    type="range"
                    min="0"
                    max="127"
                    value={faderValues[idx]}
                    onChange={(e) => handleFaderChange(idx, Number(e.target.value))}
                    className="w-24 -rotate-90 accent-amber-400 h-2 bg-[#171E34] rounded-lg appearance-none cursor-pointer"
                    title={`Fader CC ${faderCC} (Volume)`}
                  />
                </div>
              </div>

              <div className="text-[8px] text-[#555E7C] font-mono">
                {isFaderActive ? 'SENDING' : isKnobActive ? 'SENDING' : 'READY'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Activity Monitor Footer */}
      <div className="mt-3 pt-2 border-t border-[#1C2338] flex items-center justify-between text-[10px] text-[#6F7796]">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${lastSentCC ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
          <span>
            {lastSentCC 
              ? `MIDI Signal Transmitted: Ch ${activeChannel} • CC #${lastSentCC.cc} • Val ${lastSentCC.val}`
              : (deviceStatus.isConnected 
                  ? `Hardware Connected: ${deviceStatus.devices.map(d => d.name).join(', ')}`
                  : 'Plug in any USB MIDI keyboard or controller anytime. Standard Web MIDI auto-detects inputs.')}
          </span>
        </div>

        <div className="text-[9px] text-[#8E96B5]">
          Logarithmic fader curve &amp; center-detented pan
        </div>
      </div>
    </div>
  );
};
