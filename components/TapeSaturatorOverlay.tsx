import React from 'react';

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
    <div className="fixed inset-0 pointer-events-none z-[9990] overflow-hidden select-none">
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

      {/* Magnetic Tape Oxide Tone Wash */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          opacity: isRecording ? grainOpacity * 1.4 : grainOpacity,
          backgroundImage:
            'radial-gradient(circle at 50% 50%, rgba(255, 215, 0, 0.14) 0%, rgba(0, 0, 0, 0.38) 100%)',
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
