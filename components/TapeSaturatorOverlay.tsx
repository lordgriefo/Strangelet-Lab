import React, { useState, useEffect } from 'react';

export type TapeSaturationIntensity = 'off' | 'subtle' | 'warm' | 'lynchian';

interface TapeSaturatorOverlayProps {
  intensity?: TapeSaturationIntensity;
  isRecording?: boolean;
  lynchianActive?: boolean;
}

export const TapeSaturatorOverlay: React.FC<TapeSaturatorOverlayProps> = ({
  intensity = 'subtle',
  isRecording = false,
  lynchianActive = false
}) => {
  const [flickerFrame, setFlickerFrame] = useState<number>(0);
  const [tapeJitter, setTapeJitter] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (intensity === 'off' && !lynchianActive) return;

    const interval = setInterval(() => {
      // Periodic micro-jitter simulating 1/4" tape transport flutter
      if (Math.random() > 0.8) {
        setTapeJitter({
          x: (Math.random() - 0.5) * 1.5,
          y: (Math.random() - 0.5) * 1.0
        });
      } else {
        setTapeJitter({ x: 0, y: 0 });
      }

      setFlickerFrame(prev => (prev + 1) % 10);
    }, 180);

    return () => clearInterval(interval);
  }, [intensity, lynchianActive]);

  if (intensity === 'off' && !lynchianActive) return null;

  // Determine opacity and saturation color tones based on mode
  const effectiveMode = lynchianActive ? 'lynchian' : intensity;

  let scanlineOpacity = 0.04;
  let grainOpacity = 0.05;
  let vignetteIntensity = 'rgba(0, 0, 0, 0.35)';

  if (effectiveMode === 'warm') {
    scanlineOpacity = 0.07;
    grainOpacity = 0.08;
    vignetteIntensity = 'rgba(25, 12, 4, 0.45)';
  } else if (effectiveMode === 'lynchian') {
    scanlineOpacity = 0.12;
    grainOpacity = 0.14;
    vignetteIntensity = 'rgba(30, 2, 8, 0.65)';
  }

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[9990] overflow-hidden select-none transition-transform duration-100 ease-out"
      style={{
        transform: `translate3d(${tapeJitter.x}px, ${tapeJitter.y}px, 0)`,
      }}
    >
      {/* 1960s Ampex Magnetic Tape Horizontal Scanlines */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          opacity: scanlineOpacity,
          backgroundImage:
            'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.9) 50%), linear-gradient(90deg, rgba(255, 140, 0, 0.03), rgba(0, 240, 255, 0.01), rgba(255, 0, 80, 0.03))',
          backgroundSize: '100% 3px, 6px 100%',
        }}
      />

      {/* Magnetic Tape Oxide Grain / Film Flutter */}
      <div
        className="absolute inset-0 w-full h-full mix-blend-overlay"
        style={{
          opacity: isRecording ? grainOpacity * 1.5 : grainOpacity,
          backgroundImage: `radial-gradient(circle at ${50 + (flickerFrame % 3) * 2}% ${50 + (flickerFrame % 2) * 2}%, rgba(255, 215, 0, 0.15) 0%, rgba(0, 0, 0, 0.4) 100%)`,
        }}
      />

      {/* Deep Chiaroscuro Vignette (Noir & Vegas Midnight Lounge) */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          boxShadow: `inset 0 0 120px 40px ${vignetteIntensity}, inset 0 0 40px 10px rgba(0,0,0,0.5)`,
        }}
      />

      {/* Subtle Red Velvet Glow in Lynchian Mode */}
      {lynchianActive && (
        <div
          className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 10%, rgba(220, 20, 60, 0.25) 0%, transparent 60%)',
          }}
        />
      )}
    </div>
  );
};

export default TapeSaturatorOverlay;
