import React, { useState, useEffect, useRef } from 'react';
import { midiLearnService } from '../services/midiLearnService';

interface KnobProps {
  label: string;
  value: number; // 0 to 1 usually, or specific range
  min?: number;
  max?: number;
  onChange: (val: number) => void;
  color?: string;
  midiId?: string;
  midiLabel?: string;
  midiType?: 'knob' | 'pan';
  midiTrackId?: string;
  midiTrackName?: string;
}

const Knob: React.FC<KnobProps> = ({
  label,
  value,
  min = 0,
  max = 1,
  onChange,
  color = '#FFD700',
  midiId,
  midiLabel,
  midiType = 'knob',
  midiTrackId,
  midiTrackName
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef<number>(0);
  const startVal = useRef<number>(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const resolvedMidiId =
    midiId || `knob-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

  useEffect(() => {
    if (midiType === 'pan') return;
    return midiLearnService.registerControl(resolvedMidiId, (mappedVal) => {
      onChangeRef.current(Number(mappedVal.toFixed(3)));
    });
  }, [resolvedMidiId, midiType]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startY.current = e.clientY;
    startVal.current = value;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const delta = startY.current - e.clientY;
      const range = max - min;
      const sensitivity = 0.005 * range; // Value change per pixel
      
      let newValue = startVal.current + delta * sensitivity;
      newValue = Math.max(min, Math.min(max, newValue));
      
      onChange(newValue);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, max, min, onChange]);

  // Calculate rotation: 0 value = -145deg, Max value = 145deg
  const percentage = (value - min) / (max - min);
  const rotation = -145 + (percentage * 290);

  return (
    <div
      className="flex flex-col items-center select-none group"
      data-midi-control="knob"
      data-midi-id={resolvedMidiId}
      data-midi-label={midiLabel || `${label} Knob`}
      data-midi-type={midiType}
      data-midi-min={min}
      data-midi-max={max}
      data-midi-track-id={midiTrackId}
      data-midi-track-name={midiTrackName}
    >
      <div 
        className="relative w-12 h-12 rounded-full border-2 border-[#333] bg-[#1E1E1E] cursor-ns-resize hover:border-[#555] transition-colors"
        onMouseDown={handleMouseDown}
      >
        <div 
          className="absolute w-full h-full rounded-full"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
            <div 
                className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-3 rounded-full shadow-[0_0_5px_rgba(0,0,0,0.5)]"
                style={{ backgroundColor: color }}
            />
        </div>
      </div>
      <span className="text-[10px] mt-2 font-mono text-[#A0A0A0] group-hover:text-[#E0E0E0] uppercase tracking-wider">
        {label}
      </span>
      <span className="text-[9px] text-[#555] font-mono">
        {value.toFixed(2)}
      </span>
    </div>
  );
};

export default Knob;