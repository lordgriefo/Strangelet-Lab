import React, { useEffect, useRef } from 'react';

interface ColliderChamberCanvasProps {
  isAccelerating: boolean;
  isColliding: boolean;
  particleCount?: number;
  chipsCount?: number;
  collisionEnergy?: number;
}

interface Particle {
  track: 1 | 2; // Beam 1 (clockwise) or Beam 2 (counter-clockwise)
  angle: number;
  speed: number;
  radius: number;
  color: string;
  size: number;
  trail: { x: number; y: number; alpha: number }[];
}

interface ExplosionSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
  decay: number;
}

export const ColliderChamberCanvas: React.FC<ColliderChamberCanvasProps> = ({
  isAccelerating,
  isColliding,
  particleCount = 18,
  chipsCount = 4,
  collisionEnergy = 8.4
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const sparksRef = useRef<ExplosionSpark[]>([]);
  const shockwavesRef = useRef<{ radius: number; maxRadius: number; alpha: number; color: string }[]>([]);
  const lastCollisionRef = useRef<boolean>(false);

  // Initialize or re-seed particles
  useEffect(() => {
    const colors = ['#00F0FF', '#E879F9', '#FFD700', '#10B981', '#F43F5E', '#38BDF8'];
    const count = Math.max(12, Math.min(48, particleCount + chipsCount * 3));
    const newParticles: Particle[] = [];
    const energySpeedMultiplier = 0.6 + (collisionEnergy / 14) * 1.2;

    for (let i = 0; i < count; i++) {
      newParticles.push({
        track: i % 2 === 0 ? 1 : 2,
        angle: (i / count) * Math.PI * 2 + Math.random() * 0.2,
        speed: (0.015 + Math.random() * 0.01) * (i % 2 === 0 ? 1 : -1) * energySpeedMultiplier,
        radius: 110 + (Math.random() - 0.5) * 16,
        color: colors[i % colors.length],
        size: 2.2 + Math.random() * 2.5,
        trail: []
      });
    }
    particlesRef.current = newParticles;
  }, [particleCount, chipsCount, collisionEnergy]);

  // Trigger collision sparks when isColliding flips to true
  useEffect(() => {
    if (isColliding && !lastCollisionRef.current) {
      const colors = ['#FFFFFF', '#00F0FF', '#FFD700', '#E879F9', '#F43F5E', '#34D399'];
      const newSparks: ExplosionSpark[] = [];
      const sparkTotal = Math.floor(45 + (collisionEnergy / 14) * 55);

      for (let i = 0; i < sparkTotal; i++) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = 2.5 + Math.random() * (4.0 + (collisionEnergy / 14) * 5.0);
        newSparks.push({
          x: 0,
          y: 0,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1.0,
          size: 1.5 + Math.random() * 3,
          decay: 0.015 + Math.random() * 0.02
        });
      }
      sparksRef.current = newSparks;

      // Add 3 quantum shockwaves scaled by energy
      const shockwaveMax = 180 + (collisionEnergy / 14) * 140;
      shockwavesRef.current = [
        { radius: 5, maxRadius: shockwaveMax * 0.65, alpha: 0.95, color: '#FFFFFF' },
        { radius: 2, maxRadius: shockwaveMax * 0.85, alpha: 0.85, color: '#00F0FF' },
        { radius: 1, maxRadius: shockwaveMax, alpha: 0.75, color: '#E879F9' }
      ];
    }
    lastCollisionRef.current = isColliding;
  }, [isColliding, collisionEnergy]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 480);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 340);

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        width = canvas.width = entry.contentRect.width;
        height = canvas.height = entry.contentRect.height;
      }
    });

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    let globalRotation = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const baseRadius = Math.min(width, height) * 0.37;

      globalRotation += isAccelerating ? 0.03 : 0.005;

      ctx.save();
      ctx.translate(cx, cy);

      // --- 1. LHC VACUUM TUBE & OUTER BEAM RINGS ---
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#1C2030';
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius + 18, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, baseRadius - 18, 0, Math.PI * 2);
      ctx.stroke();

      // Main beam tracks (Track 1 & Track 2)
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = isAccelerating ? 'rgba(0, 240, 255, 0.4)' : 'rgba(0, 240, 255, 0.15)';
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius + 4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = isAccelerating ? 'rgba(232, 121, 249, 0.4)' : 'rgba(232, 121, 249, 0.15)';
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius - 4, 0, Math.PI * 2);
      ctx.stroke();

      // Radial sensor ticks around ring (LHC Quadrupole Electromagnets)
      const tickCount = 32;
      for (let i = 0; i < tickCount; i++) {
        const a = (i / tickCount) * Math.PI * 2;
        const innerR = baseRadius - 22;
        const outerR = baseRadius + 22;
        const isMajor = i % 4 === 0;

        ctx.strokeStyle = isMajor
          ? (isAccelerating ? '#FFD700' : 'rgba(255, 215, 0, 0.4)')
          : 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = isMajor ? 1.5 : 0.75;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * innerR, Math.sin(a) * innerR);
        ctx.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
        ctx.stroke();
      }

      // --- 2. SACRED GEOMETRY INTERLACE (VESICA PISCIS & INFINITY LOOP) ---
      // Vesica Piscis interlocking circles
      const vesicaR = baseRadius * 0.46;
      const vesicaDist = vesicaR * 0.55;

      ctx.save();
      ctx.rotate(globalRotation * 0.4);

      ctx.lineWidth = 1.2;
      ctx.strokeStyle = isAccelerating ? 'rgba(0, 240, 255, 0.6)' : 'rgba(0, 240, 255, 0.25)';
      ctx.beginPath();
      ctx.arc(-vesicaDist, 0, vesicaR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = isAccelerating ? 'rgba(232, 121, 249, 0.6)' : 'rgba(232, 121, 249, 0.25)';
      ctx.beginPath();
      ctx.arc(vesicaDist, 0, vesicaR, 0, Math.PI * 2);
      ctx.stroke();

      // Mandorla Center Lens Glow
      const lensGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, vesicaR * 0.8);
      lensGrad.addColorStop(0, isAccelerating ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)');
      lensGrad.addColorStop(0.6, isAccelerating ? 'rgba(0, 240, 255, 0.15)' : 'rgba(0, 240, 255, 0.02)');
      lensGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = lensGrad;
      ctx.beginPath();
      ctx.arc(0, 0, vesicaDist * 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Lemniscate Infinity Center Wave
      ctx.save();
      ctx.rotate(-globalRotation * 0.2);
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = isAccelerating ? 'rgba(255, 215, 0, 0.8)' : 'rgba(255, 215, 0, 0.35)';
      ctx.beginPath();
      const infScale = baseRadius * 0.32;
      for (let t = 0; t <= Math.PI * 2; t += 0.05) {
        const denom = 1 + Math.sin(t) * Math.sin(t);
        const x = (infScale * Math.cos(t)) / denom;
        const y = (infScale * Math.sin(t) * Math.cos(t)) / denom;
        if (t === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      // --- 3. CIRCULATING PARTICLE BEAMS (LHC HADRONS) ---
      const speedMultiplier = isAccelerating ? 5.5 : 1.0;

      particlesRef.current.forEach(p => {
        p.angle += p.speed * speedMultiplier;
        const targetRadius = p.track === 1 ? baseRadius + 4 : baseRadius - 4;
        const px = Math.cos(p.angle) * targetRadius;
        const py = Math.sin(p.angle) * targetRadius;

        // Trail history
        p.trail.unshift({ x: px, y: py, alpha: 1.0 });
        if (p.trail.length > (isAccelerating ? 14 : 7)) {
          p.trail.pop();
        }

        // Render particle trail
        for (let i = 0; i < p.trail.length - 1; i++) {
          const pt = p.trail[i];
          const nextPt = p.trail[i + 1];
          const trailAlpha = (1 - i / p.trail.length) * (isAccelerating ? 0.75 : 0.4);
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = trailAlpha;
          ctx.lineWidth = p.size * (1 - i / p.trail.length);
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y);
          ctx.lineTo(nextPt.x, nextPt.y);
          ctx.stroke();
        }

        // Render particle nucleus
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = p.color;
        ctx.shadowBlur = isAccelerating ? 14 : 6;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // --- 4. SHOCKWAVES & EXPLOSION SPARKS ---
      // Quantum shockwaves
      for (let i = shockwavesRef.current.length - 1; i >= 0; i--) {
        const wave = shockwavesRef.current[i];
        wave.radius += 5.5;
        wave.alpha = Math.max(0, 1 - wave.radius / wave.maxRadius);

        if (wave.alpha <= 0) {
          shockwavesRef.current.splice(i, 1);
          continue;
        }

        ctx.strokeStyle = wave.color;
        ctx.globalAlpha = wave.alpha;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, wave.radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Explosion fragments
      for (let i = sparksRef.current.length - 1; i >= 0; i--) {
        const s = sparksRef.current[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.98;
        s.vy *= 0.98;
        s.alpha -= s.decay;

        if (s.alpha <= 0) {
          sparksRef.current.splice(i, 1);
          continue;
        }

        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.alpha;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // --- 5. CENTRAL COLLISION CORE NEXUS ---
      ctx.globalAlpha = 1.0;
      if (isColliding) {
        // Flash core
        const flashGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 48);
        flashGrad.addColorStop(0, '#FFFFFF');
        flashGrad.addColorStop(0.3, '#00F0FF');
        flashGrad.addColorStop(0.7, '#E879F9');
        flashGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = flashGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 48, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Idle / Accelerating Nexus Point
        const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
        coreGrad.addColorStop(0, isAccelerating ? '#FFFFFF' : '#FFD700');
        coreGrad.addColorStop(0.5, isAccelerating ? '#00F0FF' : 'rgba(255, 215, 0, 0.4)');
        coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(0, 0, isAccelerating ? 22 : 14, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
    };
  }, [isAccelerating, isColliding]);

  return (
    <div className="relative w-full h-full min-h-[260px] flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-[#0A0A10] via-[#0E0F18] to-[#08080C] border border-[#202235]">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Optical Vignette Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_45%,rgba(5,5,8,0.75)_100%)]" />

      {/* Chamber Metadata Badge */}
      <div className="absolute top-3 left-3 px-2.5 py-1 rounded bg-[#10121C]/80 border border-[#24273E] text-[10px] font-mono text-[#8E92B0] flex items-center gap-2 backdrop-blur-sm">
        <span className={`w-2 h-2 rounded-full ${isAccelerating ? 'bg-cyan-400 animate-ping' : 'bg-emerald-400'}`} />
        <span>LSC CHAMBER // {isColliding ? 'COLLISION EVENT' : isAccelerating ? 'INJECTING BEAM' : 'STANDBY'}</span>
      </div>

      <div className="absolute top-3 right-3 px-2.5 py-1 rounded bg-[#10121C]/80 border border-[#24273E] text-[10px] font-mono text-[#FFD700] flex items-center gap-1.5 backdrop-blur-sm">
        <span>ACTIVE ATOMS: {chipsCount}</span>
      </div>
    </div>
  );
};

export default ColliderChamberCanvas;
