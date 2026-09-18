import React from 'react';
import { X } from 'lucide-react';

interface VstModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (vst: string) => void;
}

const VstModal: React.FC<VstModalProps> = ({ isOpen, onClose, onApply }) => {
  if (!isOpen) return null;

  const vsts = ['Reverb', 'Delay', 'Distortion', 'Compressor'];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-[#000000] border border-[#26619C] p-6 rounded-xl w-96">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[#FF8C00] font-mono uppercase">Select VST Effect</h3>
          <button onClick={onClose} className="text-[#26619C] hover:text-[#FF8C00]"><X size={20} /></button>
        </div>
        <div className="grid gap-2">
          {vsts.map(vst => (
            <button 
              key={vst}
              onClick={() => { onApply(vst); onClose(); }}
              className="p-3 border border-[#26619C] text-[#26619C] hover:border-[#FF8C00] hover:text-[#FF8C00] font-mono text-sm uppercase transition-colors"
            >
              {vst}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VstModal;
