import React, { useRef } from 'react';
import { Upload, FileAudio, Mic, Music } from 'lucide-react';

interface ImportAreaProps {
  onImport: (file: File) => void;
  onOpenLoops?: () => void;
  onOpenLiveInput?: () => void;
}

const ImportArea: React.FC<ImportAreaProps> = ({ onImport, onOpenLoops, onOpenLiveInput }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onImport(event.target.files[0]);
      event.target.value = '';
    }
  };

  return (
    <div className="bg-[#1E1E1E] border border-[#333] rounded-lg p-4 mb-4">
      <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <Upload size={16} className="text-[#FFD700]" /> Import Audio
      </h3>
      <div className="grid grid-cols-3 gap-2">
        <button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center p-3 bg-[#121212] border border-[#333] rounded hover:border-[#FFD700] transition-colors cursor-pointer"
          title="Import WAV, MP3, OGG, or FLAC audio onto a new track"
        >
          <FileAudio size={20} className="text-[#A0A0A0] mb-1" />
          <span className="text-[10px] text-[#A0A0A0]">Audio File</span>
        </button>
        <button
          type="button"
          onClick={() => onOpenLoops?.()}
          className="flex flex-col items-center justify-center p-3 bg-[#121212] border border-[#333] rounded hover:border-[#FFD700] transition-colors cursor-pointer"
          title="Open Ace-Step 1.5 Loop & Stem Designer"
        >
          <Music size={20} className="text-[#A0A0A0] mb-1" />
          <span className="text-[10px] text-[#A0A0A0]">Loops/MIDI</span>
        </button>
        <button
          type="button"
          onClick={() => onOpenLiveInput?.()}
          className="flex flex-col items-center justify-center p-3 bg-[#121212] border border-[#333] rounded hover:border-[#FFD700] transition-colors cursor-pointer"
          title="Open Live Microphone / Guitar Recorder"
        >
          <Mic size={20} className="text-[#A0A0A0] mb-1" />
          <span className="text-[10px] text-[#A0A0A0]">Live Input</span>
        </button>
      </div>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="audio/*" />
    </div>
  );
};

export default ImportArea;
