import React, { useEffect, useRef } from 'react';
import { midiLearnService } from '../services/midiLearnService';

interface BigKnobProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  midiId?: string;
}

const BigKnob: React.FC<BigKnobProps> = ({ label, value, onChange, midiId }) => {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const resolvedMidiId =
    midiId || `bigknob-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

  useEffect(() => {
    return midiLearnService.registerControl(resolvedMidiId, (mappedVal) => {
      onChangeRef.current(Number(mappedVal.toFixed(3)));
    });
  }, [resolvedMidiId]);

  return (
    <div
      className="flex flex-col items-center gap-2 select-none"
      data-midi-control="knob"
      data-midi-id={resolvedMidiId}
      data-midi-label={`${label} Big Knob`}
      data-midi-type="knob"
      data-midi-min={0}
      data-midi-max={1}
    >
      <div
        onClick={() => onChange(Math.min(1, Number((value + 0.1).toFixed(2))))}
        className="w-24 h-24 rounded-full bg-gradient-to-br from-[#444] to-[#111] border-4 border-[#333] shadow-xl flex items-center justify-center cursor-pointer relative"
      >
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
