import React from 'react';
import { X, Sparkles, Terminal, Code2 } from 'lucide-react';
import { FAUST_DSP_PRESET_TOYS } from '../services/faustDspService';

interface VstModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (vst: string) => void;
  onOpenFaustDspLab?: () => void;
}

const VstModal: React.FC<VstModalProps> = ({ isOpen, onClose, onApply, onOpenFaustDspLab }) => {
  if (!isOpen) return null;

  const classicVsts = ['Reverb', 'Delay', 'Distortion', 'Compressor', 'Tape Saturator'];

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 font-mono">
      <div className="bg-[#090D18] border border-[#232B44] p-6 rounded-2xl w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.9)]">
        <div className="flex justify-between items-center mb-4 border-b border-[#182035] pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-bold uppercase text-sm tracking-wider">Select VST Insert Effect</h3>
          </div>
          <button onClick={onClose} className="text-[#888] hover:text-white p-1 rounded hover:bg-[#1A2035]">
            <X size={18} />
          </button>
        </div>

        {/* Sample-Based VSTi Instruments Section */}
        <div className="mb-4">
          <div className="text-[10px] uppercase font-bold text-emerald-400 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="text-sm">🎹</span>
              <span>Sample-Based & Physical VSTi Instruments</span>
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50">VSTi</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { name: 'SFZ Grand Piano', icon: '🎹' },
              { name: 'Rhodes Mark I EP', icon: '✨' },
              { name: 'TB-303 Acid Synth', icon: '⚡' },
              { name: 'Mellotron Strings', icon: '📼' },
              { name: '808 Sub Boom', icon: '💣' },
              { name: 'Faust Guitar Toy', icon: '🎸' }
            ].map(vsti => (
              <button
                key={vsti.name}
                onClick={() => { onApply(`VSTi: ${vsti.name}`); onClose(); }}
                className="p-2 rounded-xl border border-[#162520] hover:border-emerald-500/70 bg-[#0B1512] hover:bg-[#10231D] text-left transition-all flex items-center gap-1.5 text-xs text-white"
              >
                <span>{vsti.icon}</span>
                <span className="truncate">{vsti.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Faust DSP Toys Section */}
        <div className="mb-4">
          <div className="text-[10px] uppercase font-bold text-cyan-400 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Code2 size={12} className="text-cyan-400" />
              <span>Faust DSP VST Toys (Web Audio Compiled)</span>
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50">LIVE DSP</span>
          </div>
          <div className="grid gap-1.5">
            {FAUST_DSP_PRESET_TOYS.slice(0, 4).map(toy => (
              <button 
                key={toy.id}
                onClick={() => { onApply(`Faust: ${toy.name}`); onClose(); }}
                className="p-2.5 rounded-xl border border-[#1A233A] hover:border-cyan-500/70 bg-[#0E1324] hover:bg-[#131B32] text-left transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {toy.name}
                  </div>
                  <div className="text-[10px] text-[#7E88AA] line-clamp-1">
                    {toy.description}
                  </div>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 font-bold border border-cyan-800/40">
                  {toy.params.length} Knb
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Classic DAW VSTs */}
        <div className="mb-4">
          <div className="text-[10px] uppercase font-bold text-[#888] mb-2">Classic DAW Inserts</div>
          <div className="grid grid-cols-2 gap-1.5">
            {classicVsts.map(vst => (
              <button 
                key={vst}
                onClick={() => { onApply(vst); onClose(); }}
                className="p-2.5 rounded-xl border border-[#182035] hover:border-amber-500/60 bg-[#0C101D] hover:bg-[#151C30] text-[#AAA] hover:text-white font-mono text-xs uppercase transition-colors text-center"
              >
                {vst}
              </button>
            ))}
          </div>
        </div>

        {/* Open Faust DSP Lab Workbench button */}
        {onOpenFaustDspLab && (
          <button
            onClick={() => {
              onClose();
              onOpenFaustDspLab();
            }}
            className="w-full mt-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-950 via-blue-950 to-purple-950 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 hover:text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] flex items-center justify-center gap-2"
          >
            <Sparkles size={14} className="text-cyan-400 animate-pulse" />
            <span>Open Faust DSP Lab & Code New VST Toy</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default VstModal;
