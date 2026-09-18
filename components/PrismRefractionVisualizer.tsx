import React, { useEffect, useRef, useState } from 'react';
import { PrismRay, PrismHitType } from '../types';
import { Zap, Sparkles, Compass, Eye, ShieldCheck, Sun } from 'lucide-react';

interface PrismRefractionVisualizerProps {
  selectedRay: PrismRay | null;
  rays: PrismRay[];
  dispersionSpread?: number; // 0 to 1
  isAuditioning?: boolean;
  onSelectRay?: (ray: PrismRay) => void;
  className?: string;
}

export const PrismRefractionVisualizer: React.FC<PrismRefractionVisualizerProps> = ({
  selectedRay,
  rays,
  dispersionSpread = 0.65,
  isAuditioning = false,
  onSelectRay,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const photonParticlesRef = useRef<Array<{
    x: number;
    y: number;
    speed: number;
    progress: number;
    color: string;
    stage: 'incident' | 'inside' | 'refracted';
    targetRayIndex: number;
    size: number;
  }>>([]);

  const [refractionIntensity, setRefractionIntensity] = useState<number>(1.0);

  // Trigger burst of refraction intensity when selectedRay changes or auditioning
  useEffect(() => {
    setRefractionIntensity(1.6);
    const timeout = setTimeout(() => {
      setRefractionIntensity(1.0);
    }, 450);

    // Spawn 12 photon particles
    const newPhotons = Array.from({ length: 12 }).map((_, i) => ({
      x: 0,
      y: 0,
      speed: 0.015 + Math.random() * 0.02,
      progress: (i / 12) * 0.3,
      color: selectedRay ? selectedRay.color : '#00F0FF',
      stage: 'incident' as const,
      targetRayIndex: selectedRay ? selectedRay.index % 8 : Math.floor(Math.random() * 8),
      size: 2 + Math.random() * 2
    }));

    photonParticlesRef.current = [...photonParticlesRef.current.slice(-16), ...newPhotons];

    return () => clearTimeout(timeout);
  }, [selectedRay?.id, isAuditioning]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.03;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // 1. Geometry Setup
      // Prism position (approx center-left)
      const prismCenterX = width * 0.42;
      const prismCenterY = height * 0.52;
      const prismRadius = Math.min(width * 0.12, height * 0.42);

      // 3 vertices of the triangular quartz prism
      const pTop = { x: prismCenterX, y: prismCenterY - prismRadius };
      const pLeft = { 
        x: prismCenterX - prismRadius * Math.cos(Math.PI / 6), 
        y: prismCenterY + prismRadius * Math.sin(Math.PI / 6) 
      };
      const pRight = { 
        x: prismCenterX + prismRadius * Math.cos(Math.PI / 6), 
        y: prismCenterY + prismRadius * Math.sin(Math.PI / 6) 
      };

      // 2. Incident Laser Emitter (Left side)
      const emitterX = width * 0.05;
      const emitterY = prismCenterY + 4;
      const strikePoint = {
        x: (pTop.x + pLeft.x) / 2 + 6,
        y: (pTop.y + pLeft.y) / 2 + 10
      };

      // Emitter Housing Glow
      ctx.fillStyle = '#0F172A';
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(emitterX - 16, emitterY - 14, 26, 28, [4]);
      ctx.fill();
      ctx.stroke();

      // Laser Aperture Lens
      ctx.fillStyle = '#00F0FF';
      ctx.beginPath();
      ctx.arc(emitterX + 10, emitterY, 4, 0, Math.PI * 2);
      ctx.fill();

      // 3. Draw Incident Coherent Beam (White-Hot with Cyan Corona)
      const incidentGrad = ctx.createLinearGradient(emitterX + 10, emitterY, strikePoint.x, strikePoint.y);
      incidentGrad.addColorStop(0, 'rgba(0, 240, 255, 0.9)');
      incidentGrad.addColorStop(0.4, 'rgba(255, 255, 255, 1.0)');
      incidentGrad.addColorStop(1, 'rgba(255, 255, 255, 0.95)');

      // Outer Corona
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.lineWidth = 6 * refractionIntensity;
      ctx.beginPath();
      ctx.moveTo(emitterX + 10, emitterY);
      ctx.lineTo(strikePoint.x, strikePoint.y);
      ctx.stroke();

      // Inner Core Beam
      ctx.strokeStyle = incidentGrad;
      ctx.lineWidth = 2.5 * refractionIntensity;
      ctx.beginPath();
      ctx.moveTo(emitterX + 10, emitterY);
      ctx.lineTo(strikePoint.x, strikePoint.y);
      ctx.stroke();

      // 4. Draw Quartz Prism Glass Body
      // Glass body gradient with caustic reflections
      const prismGrad = ctx.createLinearGradient(pLeft.x, pTop.y, pRight.x, pRight.y);
      prismGrad.addColorStop(0, 'rgba(0, 240, 255, 0.08)');
      prismGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.16)');
      prismGrad.addColorStop(1, 'rgba(255, 46, 99, 0.08)');

      ctx.fillStyle = prismGrad;
      ctx.beginPath();
      ctx.moveTo(pTop.x, pTop.y);
      ctx.lineTo(pLeft.x, pLeft.y);
      ctx.lineTo(pRight.x, pRight.y);
      ctx.closePath();
      ctx.fill();

      // Glass Edge Bevels
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Facet Highlight (Left Face)
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.8)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(pTop.x, pTop.y);
      ctx.lineTo(pLeft.x, pLeft.y);
      ctx.stroke();

      // Internal Snell Refraction Paths & Exiting Spectral Rays
      const numSpectralBands = Math.max(8, rays.length);
      const rightFaceStart = { x: pTop.x, y: pTop.y };
      const rightFaceEnd = { x: pRight.x, y: pRight.y };

      // Base colors for spectrum
      const spectrumColors = [
        { color: '#FF2E63', nm: 700, hit: 'KICK' },
        { color: '#FF7B00', nm: 640, hit: 'SNARE' },
        { color: '#FFD700', nm: 590, hit: 'CLAP' },
        { color: '#00F59B', nm: 535, hit: 'PERC' },
        { color: '#00F0FF', nm: 490, hit: 'HIHAT' },
        { color: '#3B82F6', nm: 450, hit: 'TOM' },
        { color: '#A855F7', nm: 410, hit: 'SLICE' },
        { color: '#EC4899', nm: 380, hit: 'BURST' },
      ];

      for (let i = 0; i < numSpectralBands; i++) {
        const norm = i / (numSpectralBands - 1);
        const spec = spectrumColors[i % spectrumColors.length];
        const rayAtI = rays[i];
        const isSelected = selectedRay ? (rayAtI ? rayAtI.id === selectedRay.id : i === 0) : (i === 0);
        const rayColor = rayAtI ? rayAtI.color : spec.color;

        // Exit point along right facet
        const exitT = 0.28 + norm * 0.58;
        const exitPoint = {
          x: rightFaceStart.x + (rightFaceEnd.x - rightFaceStart.x) * exitT,
          y: rightFaceStart.y + (rightFaceEnd.y - rightFaceStart.y) * exitT
        };

        // 4a. Internal Refraction Ray (inside crystal)
        ctx.strokeStyle = `${rayColor}${isSelected ? 'FF' : '55'}`;
        ctx.lineWidth = isSelected ? 2.5 : 1.2;
        ctx.beginPath();
        ctx.moveTo(strikePoint.x, strikePoint.y);
        ctx.lineTo(exitPoint.x, exitPoint.y);
        ctx.stroke();

        // 4b. Exiting Refracted Spectral Ray (Fanned dispersion towards right)
        const spreadFactor = (dispersionSpread * 0.8) + 0.2;
        const fanSpreadAngle = (norm - 0.5) * spreadFactor * 0.95;
        const rayLength = width - exitPoint.x - 8;

        const rayTargetY = prismCenterY + fanSpreadAngle * height * 1.3;
        const rayTargetX = width - 12;

        // Exiting beam glow
        const beamGrad = ctx.createLinearGradient(exitPoint.x, exitPoint.y, rayTargetX, rayTargetY);
        beamGrad.addColorStop(0, rayColor);
        beamGrad.addColorStop(0.7, `${rayColor}CC`);
        beamGrad.addColorStop(1, `${rayColor}00`);

        // Draw Wide Aura for selected ray
        if (isSelected) {
          ctx.strokeStyle = `${rayColor}44`;
          ctx.lineWidth = 10 * refractionIntensity;
          ctx.beginPath();
          ctx.moveTo(exitPoint.x, exitPoint.y);
          ctx.lineTo(rayTargetX, rayTargetY);
          ctx.stroke();
        }

        // Draw Focused Laser Core
        ctx.strokeStyle = isSelected ? '#FFFFFF' : beamGrad;
        ctx.lineWidth = isSelected ? 3.5 : 1.5;
        ctx.beginPath();
        ctx.moveTo(exitPoint.x, exitPoint.y);
        ctx.lineTo(rayTargetX, rayTargetY);
        ctx.stroke();

        if (isSelected) {
          // Secondary colored laser line over white core
          ctx.strokeStyle = rayColor;
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(exitPoint.x, exitPoint.y);
          ctx.lineTo(rayTargetX, rayTargetY);
          ctx.stroke();
        }

        // Ray Exit Point Sparkle
        ctx.fillStyle = isSelected ? '#FFFFFF' : rayColor;
        ctx.beginPath();
        ctx.arc(exitPoint.x, exitPoint.y, isSelected ? 3.5 : 2, 0, Math.PI * 2);
        ctx.fill();

        // Ray Wavelength & Tag at Edge
        if (width > 500) {
          ctx.fillStyle = isSelected ? '#FFFFFF' : `${rayColor}AA`;
          ctx.font = isSelected ? 'bold 10px monospace' : '9px monospace';
          ctx.fillText(
            `R${i + 1} ${spec.nm}nm`,
            rayTargetX - 60,
            Math.max(16, Math.min(height - 8, rayTargetY + 3))
          );
        }
      }

      // 5. Strike Point Caustic Flash on Left Facet
      const flashGrad = ctx.createRadialGradient(
        strikePoint.x, strikePoint.y, 1,
        strikePoint.x, strikePoint.y, 16 * refractionIntensity
      );
      flashGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      flashGrad.addColorStop(0.4, 'rgba(0, 240, 255, 0.6)');
      flashGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');

      ctx.fillStyle = flashGrad;
      ctx.beginPath();
      ctx.arc(strikePoint.x, strikePoint.y, 16 * refractionIntensity, 0, Math.PI * 2);
      ctx.fill();

      // 6. Update and Render Photon Particles
      const activePhotons = photonParticlesRef.current;
      for (let pIdx = activePhotons.length - 1; pIdx >= 0; pIdx--) {
        const p = activePhotons[pIdx];
        p.progress += p.speed;

        if (p.progress >= 1.0) {
          activePhotons.splice(pIdx, 1);
          continue;
        }

        let curX = 0;
        let curY = 0;

        if (p.progress < 0.35) {
          // In incident stage
          const t = p.progress / 0.35;
          curX = emitterX + 10 + (strikePoint.x - (emitterX + 10)) * t;
          curY = emitterY + (strikePoint.y - emitterY) * t;
        } else if (p.progress < 0.65) {
          // Inside prism
          const t = (p.progress - 0.35) / 0.3;
          const exitT = 0.28 + (p.targetRayIndex / 8) * 0.58;
          const exitX = rightFaceStart.x + (rightFaceEnd.x - rightFaceStart.x) * exitT;
          const exitY = rightFaceStart.y + (rightFaceEnd.y - rightFaceStart.y) * exitT;
          curX = strikePoint.x + (exitX - strikePoint.x) * t;
          curY = strikePoint.y + (exitY - strikePoint.y) * t;
        } else {
          // Exiting refracted ray
          const t = (p.progress - 0.65) / 0.35;
          const exitT = 0.28 + (p.targetRayIndex / 8) * 0.58;
          const exitX = rightFaceStart.x + (rightFaceEnd.x - rightFaceStart.x) * exitT;
          const exitY = rightFaceStart.y + (rightFaceEnd.y - rightFaceStart.y) * exitT;

          const norm = p.targetRayIndex / 8;
          const spreadFactor = (dispersionSpread * 0.8) + 0.2;
          const fanSpreadAngle = (norm - 0.5) * spreadFactor * 0.95;
          const targetY = prismCenterY + fanSpreadAngle * height * 1.3;
          const targetX = width - 12;

          curX = exitX + (targetX - exitX) * t;
          curY = exitY + (targetY - exitY) * t;
        }

        // Draw Photon particle
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(curX, curY, p.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(curX, curY, p.size * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }

      // 7. Refraction Chamber Telemetry Watermark in top-left
      ctx.fillStyle = 'rgba(0, 240, 255, 0.7)';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('OPTICAL PRISM DISPERSION // n = 1.544 (QUARTZ)', 12, 14);

      if (selectedRay) {
        ctx.fillStyle = selectedRay.color;
        ctx.fillText(
          `ACTIVE RAY: R${selectedRay.index + 1} [${selectedRay.hitType.toUpperCase()}] • ${selectedRay.wavelengthNm || 500}nm`,
          12,
          27
        );
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [selectedRay, rays, dispersionSpread, refractionIntensity]);

  return (
    <div className={`relative w-full rounded-xl overflow-hidden bg-[#04060C] border border-[#00F0FF]/30 shadow-[0_0_25px_rgba(0,240,255,0.15)] ${className}`}>
      {/* Background Optical Grid Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#00F0FF_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* Top telemetry badges */}
      <div className="absolute top-2 right-3 z-10 flex items-center gap-2">
        <div className="px-2 py-0.5 rounded bg-[#0A1020]/90 border border-[#00F0FF]/40 text-[9px] font-mono font-bold text-[#00F0FF] flex items-center gap-1.5 shadow-[0_0_8px_rgba(0,240,255,0.2)]">
          <Zap size={10} className="text-[#FFD700]" />
          <span>SNELL REFRACTOR: ACTIVE</span>
        </div>

        {selectedRay && (
          <div 
            className="px-2 py-0.5 rounded border text-[9px] font-mono font-bold flex items-center gap-1 shadow-sm"
            style={{ 
              backgroundColor: `${selectedRay.color}20`, 
              borderColor: selectedRay.color,
              color: selectedRay.color 
            }}
          >
            <Sparkles size={10} />
            <span>{selectedRay.label} ({selectedRay.hitType.toUpperCase()})</span>
          </div>
        )}
      </div>

      <canvas 
        ref={canvasRef}
        width={800}
        height={130}
        className="w-full h-[120px] md:h-[135px] block cursor-crosshair"
        title="Optical Prism Chopper Chamber: Refracting audio energy into spectral rays"
      />
    </div>
  );
};
