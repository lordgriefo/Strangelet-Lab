import React from 'react';

interface BigKnobProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
}

const BigKnob: React.FC<BigKnobProps> = ({ label, value, onChange }) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#444] to-[#111] border-4 border-[#333] shadow-xl flex items-center justify-center cursor-pointer relative">
        <div 
          className="w-2 h-10 bg-[#FFD700] absolute top-2 rounded-full transition-transform"
          style={{ transform: `rotate(${value * 270 - 135}deg)` }}
        />
      </div>
      <span className="text-white font-mono text-xs uppercase">{label}</span>
    </div>
  );
};

export default BigKnob;
