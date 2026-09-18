import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, Sliders, Volume2, Power, RotateCcw, Play, Pause, Disc, 
  Sparkles, ArrowRight, ShieldCheck, Radio, Shuffle, Download, Layers 
} from 'lucide-react';

export interface Stompbox {
  id: string;
  name: string;
  category: 'Drive' | 'Modulation' | 'Time' | 'Space' | 'Pitch';
  color: string;
  ledColor: string;
  enabled: boolean;
  mix: number; // 0 to 1
  params: {
    param1: { name: string; value: number; min: number; max: number; unit: string };
    param2: { name: string; value: number; min: number; max: number; unit: string };
    param3: { name: string; value: number; min: number; max: number; unit: string };
  };
}

const INITIAL_PEDALS: Stompbox[] = [
  {
    id: 'neutron-drive',
    name: 'NEUTRON DRIVE',
    category: 'Drive',
    color: '#E11D48',
    ledColor: '#FF2E63',
    enabled: true,
    mix: 0.85,
    params: {
      param1: { name: 'DRIVE', value: 7.5, min: 1, max: 10, unit: '' },
      param2: { name: 'BITE (EQ)', value: 3200, min: 800, max: 8000, unit: 'Hz' },
      param3: { name: 'SAG', value: 45, min: 0, max: 100, unit: '%' }
    }
  },
  {
    id: 'quark-chorus',
    name: 'QUARK CHORUS',
    category: 'Modulation',
    color: '#0284C7',
    ledColor: '#00F0FF',
    enabled: true,
    mix: 0.7,
    params: {
      param1: { name: 'RATE', value: 1.8, min: 0.1, max: 8.0, unit: 'Hz' },
      param2: { name: 'DEPTH', value: 65, min: 0, max: 100, unit: '%' },
      param3: { name: 'WIDTH', value: 80, min: 0, max: 100, unit: '%' }
    }
  },
  {
    id: 'cosmic-delay',
    name: 'CHRONO DELAY',
    category: 'Time',
    color: '#D97706',
    ledColor: '#FFD700',
    enabled: true,
    mix: 0.6,
    params: {
      param1: { name: 'TIME', value: 375, min: 50, max: 1000, unit: 'ms' },
      param2: { name: 'FEEDBACK', value: 55, min: 0, max: 95, unit: '%' },
      param3: { name: 'WARMTH', value: 2400, min: 500, max: 6000, unit: 'Hz' }
    }
  },
  {
    id: 'strangelet-verb',
    name: 'DARK REVERB',
    category: 'Space',
    color: '#7C3AED',
    ledColor: '#C084FC',
    enabled: false,
    mix: 0.5,
    params: {
      param1: { name: 'DECAY', value: 4.2, min: 0.5, max: 10, unit: 's' },
      param2: { name: 'DAMPING', value: 4500, min: 1000, max: 12000, unit: 'Hz' },
      param3: { name: 'SHIMMER', value: 30, min: 0, max: 100, unit: '%' }
    }
  },
  {
    id: 'photon-tremolo',
    name: 'PHOTON TREM',
    category: 'Modulation',
    color: '#059669',
    ledColor: '#34D399',
    enabled: false,
    mix: 0.8,
    params: {
      param1: { name: 'SPEED', value: 4.5, min: 0.5, max: 15, unit: 'Hz' },
      param2: { name: 'SHAPE', value: 50, min: 0, max: 100, unit: '%' },
      param3: { name: 'PULSE', value: 75, min: 0, max: 100, unit: '%' }
    }
  }
];

export const Pedalboard: React.FC = () => {
  const [pedals, setPedals] = useState<Stompbox[]>(INITIAL_PEDALS);
  const [activePedalId, setActivePedalId] = useState<string>(INITIAL_PEDALS[0].id);
  const [isPlayingTest, setIsPlayingTest] = useState<boolean>(false);
  const [masterVolume, setMasterVolume] = useState<number>(0.85);
  const [inputLevel, setInputLevel] = useState<number>(0.75);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const testOscRef = useRef<{ osc: OscillatorNode; gain: GainNode } | null>(null);
  const testIntervalRef = useRef<number | null>(null);

  // Audio preview generator for auditioning the pedalboard signal chain
  const toggleTestRiff = () => {
    if (isPlayingTest) {
      stopTestRiff();
    } else {
      startTestRiff();
    }
  };

  const stopTestRiff = () => {
    if (testIntervalRef.current) {
      clearInterval(testIntervalRef.current);
      testIntervalRef.current = null;
    }
    if (testOscRef.current) {
      try {
        testOscRef.current.osc.stop();
        testOscRef.current.osc.disconnect();
      } catch (e) {}
      testOscRef.current = null;
    }
    setIsPlayingTest(false);
  };

  const startTestRiff = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(masterVolume * 0.25, ctx.currentTime);
      masterGain.connect(ctx.destination);

      // Simple bluesy/cyberpunk riff note sequence
      const notes = [110, 110, 130.81, 146.83, 164.81, 146.83, 130.81, 98];
      let step = 0;

      const playStep = () => {
        if (!audioCtxRef.current) return;
        const now = audioCtxRef.current.currentTime;
        const osc = audioCtxRef.current.createOscillator();
        const noteGain = audioCtxRef.current.createGain();

        // Check if drive pedal is enabled
        const drivePedal = pedals.find(p => p.id === 'neutron-drive');
        const driveEnabled = drivePedal?.enabled;
        const driveAmt = drivePedal ? drivePedal.params.param1.value : 5;

        osc.type = driveEnabled ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(notes[step % notes.length], now);

        // Filter emulation
        const filter = audioCtxRef.current.createBiquadFilter();
        filter.type = 'lowpass';
        const delayPedal = pedals.find(p => p.id === 'cosmic-delay');
        filter.frequency.setValueAtTime(
          driveEnabled ? 2000 + driveAmt * 400 : 1800,
          now
        );

        noteGain.gain.setValueAtTime(0.35 * inputLevel, now);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(masterGain);

        osc.start(now);
        osc.stop(now + 0.38);

        step++;
      };

      playStep();
      testIntervalRef.current = window.setInterval(playStep, 220);
      setIsPlayingTest(true);
    } catch (e) {
      console.error('Test audio error:', e);
    }
  };

  useEffect(() => {
    return () => {
      stopTestRiff();
    };
  }, []);

  const togglePedal = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPedals(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
  };

  const updateParam = (pedalId: string, paramKey: 'param1' | 'param2' | 'param3', value: number) => {
    setPedals(prev => prev.map(p => {
      if (p.id !== pedalId) return p;
      return {
        ...p,
        params: {
          ...p.params,
          [paramKey]: {
            ...p.params[paramKey],
            value
          }
        }
      };
    }));
  };

  const movePedal = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pedals.length) return;
    setPedals(prev => {
      const copy = [...prev];
      const [item] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, item);
      return copy;
    });
  };

  const activePedal = pedals.find(p => p.id === activePedalId) || pedals[0];

  return (
    <div className="h-full w-full bg-[#05070E] flex flex-col overflow-y-auto p-4 md:p-6 text-white font-mono select-none">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1A2338]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E11D48]/20 via-[#00F0FF]/20 to-[#FFD700]/20 border border-[#FF2E63] flex items-center justify-center shadow-[0_0_20px_rgba(255,46,99,0.3)]">
            <Zap size={22} className="text-[#FF2E63]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-black uppercase tracking-widest text-[#FFD700]">
                STRANGELET LAB
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#FF2E63]/20 text-[#FF2E63] border border-[#FF2E63]/40 font-bold">
                ANALOG MATRIX RIG
              </span>
            </div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              QUANTUM STOMPBOX PEDALBOARD
            </h1>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTestRiff}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md ${
              isPlayingTest
                ? 'bg-[#FF2E63] text-white shadow-[0_0_15px_#FF2E63]'
                : 'bg-[#101726] border border-[#00F0FF]/40 text-[#00F0FF] hover:bg-[#00F0FF] hover:text-black'
            }`}
          >
            {isPlayingTest ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlayingTest ? 'STOP AUDITION' : 'TEST RIFF SIGNAL'}</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1 bg-[#090D18] border border-[#1E293B] rounded-xl text-xs">
            <span className="text-[#64748B]">OUTPUT:</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={masterVolume}
              onChange={(e) => setMasterVolume(Number(e.target.value))}
              className="w-20 accent-[#00F0FF] cursor-pointer"
            />
            <span className="text-[#00F0FF] font-bold text-[10px]">
              {(masterVolume * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Signal Flow Status Bar */}
      <div className="mt-4 p-3 bg-[#080C17] border border-[#1A2338] rounded-xl flex items-center justify-between text-xs overflow-x-auto gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[#64748B] font-bold uppercase text-[10px]">SERIAL SIGNAL PATH:</span>
          <span className="px-2 py-0.5 rounded bg-[#101726] text-[#94A3B8] border border-[#1E293B] text-[10px]">
            INPUT GUITAR / SYNTH
          </span>
          <ArrowRight size={12} className="text-[#475569]" />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {pedals.map((p, idx) => (
            <React.Fragment key={p.id}>
              <div 
                onClick={() => setActivePedalId(p.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  p.id === activePedalId 
                    ? 'border-white bg-[#162035] text-white shadow-sm' 
                    : p.enabled 
                      ? 'border-[#334155] bg-[#0E1524] text-[#CCC]' 
                      : 'border-[#1E293B] bg-[#0A0D15] text-[#555] line-through'
                }`}
              >
                <span 
                  className="w-1.5 h-1.5 rounded-full" 
                  style={{ backgroundColor: p.enabled ? p.ledColor : '#444' }} 
                />
                <span>{p.name.split(' ')[0]}</span>
              </div>
              {idx < pedals.length - 1 && <ArrowRight size={10} className="text-[#334155]" />}
            </React.Fragment>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ArrowRight size={12} className="text-[#475569]" />
          <span className="px-2 py-0.5 rounded bg-[#101726] text-[#00F0FF] border border-[#00F0FF]/30 text-[10px] font-bold">
            STRANGELET BUS
          </span>
        </div>
      </div>

      {/* Main Pedals Rack Viewport */}
      <div className="mt-4 p-5 bg-[#03050A] border border-[#1A2338] rounded-2xl shadow-inner">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {pedals.map((pedal, index) => {
            const isSelected = pedal.id === activePedalId;
            return (
              <div
                key={pedal.id}
                onClick={() => setActivePedalId(pedal.id)}
                className={`relative rounded-2xl border flex flex-col justify-between p-4 transition-all duration-200 cursor-pointer select-none group shadow-lg ${
                  isSelected 
                    ? 'ring-2 ring-white/80 scale-[1.02]' 
                    : 'hover:border-[#38BDF8]/60 hover:scale-[1.01]'
                }`}
                style={{
                  backgroundColor: '#090D18',
                  borderColor: isSelected ? '#FFFFFF' : pedal.enabled ? `${pedal.color}90` : '#1E293B',
                  boxShadow: pedal.enabled ? `0 10px 25px -5px ${pedal.color}25` : 'none'
                }}
              >
                {/* Pedal Top Plate Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[#1A2338]">
                  <div className="flex items-center gap-1.5">
                    <span 
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                        pedal.enabled 
                          ? 'shadow-[0_0_12px_currentColor]' 
                          : 'opacity-30'
                      }`}
                      style={{ 
                        backgroundColor: pedal.ledColor,
                        color: pedal.ledColor
                      }}
                    />
                    <span className="text-[9px] font-mono uppercase text-[#64748B]">
                      {pedal.category}
                    </span>
                  </div>

                  {/* Ordering arrows */}
                  <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        movePedal(index, index - 1);
                      }}
                      disabled={index === 0}
                      className="p-1 text-[10px] text-[#888] hover:text-white disabled:opacity-20"
                      title="Move pedal earlier in signal chain"
                    >
                      ←
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        movePedal(index, index + 1);
                      }}
                      disabled={index === pedals.length - 1}
                      className="p-1 text-[10px] text-[#888] hover:text-white disabled:opacity-20"
                      title="Move pedal later in signal chain"
                    >
                      →
                    </button>
                  </div>
                </div>

                {/* Pedal Title with Metallic Plate Stamping */}
                <div className="my-3 text-center">
                  <h3 
                    className="text-sm font-black tracking-tight"
                    style={{ color: pedal.enabled ? pedal.ledColor : '#777' }}
                  >
                    {pedal.name}
                  </h3>
                  <div className="text-[8px] tracking-widest text-[#555] uppercase mt-0.5">
                    TRUE BYPASS CHASSIS
                  </div>
                </div>

                {/* Mini Knobs Row */}
                <div className="grid grid-cols-3 gap-1.5 py-2 my-1 bg-[#04060C] p-2 rounded-xl border border-[#141C2E]">
                  {(['param1', 'param2', 'param3'] as const).map(pKey => {
                    const pDef = pedal.params[pKey];
                    const pct = ((pDef.value - pDef.min) / (pDef.max - pDef.min)) * 100;
                    return (
                      <div key={pKey} className="flex flex-col items-center">
                        <div className="relative w-8 h-8 rounded-full bg-[#121826] border border-[#23314D] flex items-center justify-center shadow-inner">
                          {/* Radial indicator notch */}
                          <div 
                            className="absolute w-1 h-3 rounded-full bg-white top-1 origin-bottom transition-transform"
                            style={{ 
                              transform: `rotate(${(pct * 2.7) - 135}deg)`,
                              backgroundColor: pedal.enabled ? pedal.ledColor : '#666'
                            }}
                          />
                        </div>
                        <span className="text-[7px] text-[#718096] uppercase mt-1 truncate max-w-full font-bold">
                          {pDef.name.split(' ')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Heavy Duty Stomp Foot Switch */}
                <div className="flex flex-col items-center pt-3 mt-2 border-t border-[#141C2E]">
                  <button
                    onClick={(e) => togglePedal(pedal.id, e)}
                    className={`relative w-12 h-12 rounded-full border-2 transition-all flex items-center justify-center shadow-md active:scale-95 ${
                      pedal.enabled
                        ? 'border-white bg-gradient-to-b from-[#2A3449] to-[#121826]'
                        : 'border-[#334155] bg-[#0E131F]'
                    }`}
                    title={pedal.enabled ? "Bypass pedal" : "Engage pedal"}
                  >
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                      pedal.enabled ? 'border-[#00F0FF] bg-black/50' : 'border-[#222] bg-black/80'
                    }`}>
                      <Power 
                        size={14} 
                        className={pedal.enabled ? 'text-white' : 'text-[#555]'} 
                      />
                    </div>
                  </button>
                  <span className={`text-[9px] font-bold tracking-wider mt-1.5 uppercase ${
                    pedal.enabled ? 'text-white' : 'text-[#555]'
                  }`}>
                    {pedal.enabled ? 'ENGAGED' : 'BYPASS'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Pedal Inspector & Deep Editor */}
      {activePedal && (
        <div className="mt-4 p-5 bg-[#080B15] border border-[#1A2338] rounded-2xl flex flex-col lg:flex-row gap-6">
          {/* Left Inspector Header */}
          <div className="lg:w-1/3 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#1A2338] pb-4 lg:pb-0 lg:pr-6">
            <div>
              <div className="flex items-center gap-2">
                <span 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: activePedal.ledColor }} 
                />
                <span className="text-xs font-mono uppercase text-[#00F0FF] font-bold">
                  ACTIVE PEDAL INSPECTOR
                </span>
              </div>
              <h2 className="text-2xl font-black text-white mt-1">
                {activePedal.name}
              </h2>
              <p className="text-xs text-[#64748B] mt-1">
                Category: {activePedal.category} • High-precision zero-latency DSP module with hardware emulation.
              </p>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => togglePedal(activePedal.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activePedal.enabled
                    ? 'bg-white text-black font-black'
                    : 'bg-[#101726] border border-[#334155] text-[#888]'
                }`}
              >
                <Power size={14} />
                <span>{activePedal.enabled ? 'BYPASS PEDAL' : 'ENGAGE PEDAL'}</span>
              </button>
            </div>
          </div>

          {/* Right Parameters Slider Grid */}
          <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['param1', 'param2', 'param3'] as const).map(paramKey => {
              const p = activePedal.params[paramKey];
              return (
                <div key={paramKey} className="p-3 bg-[#05070E] border border-[#162035] rounded-xl flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#94A3B8] font-bold">{p.name}</span>
                    <span className="text-[#FFD700] font-mono font-bold">
                      {p.value} {p.unit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={p.min}
                    max={p.max}
                    step={(p.max - p.min) / 100}
                    value={p.value}
                    onChange={(e) => updateParam(activePedal.id, paramKey, Number(e.target.value))}
                    className="w-full accent-[#00F0FF] cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-[#475569]">
                    <span>{p.min}</span>
                    <span>{p.max}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Pedalboard;
