import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { 
  Zap, 
  Feather, 
  Maximize2, 
  Minimize2, 
  RotateCw, 
  Sparkles, 
  Activity, 
  Gauge, 
  Compass,
  Sliders,
  Volume2,
  Save,
  Archive,
  Info
} from 'lucide-react';
import { SonicMode, SonicPreset } from '../../services/sonicData';
import { playLaserBeamSound } from '../../lib/laserSound';
import { calculatePhysicsConstants, PhysicsConstants } from '../../lib/collisionPhysics';

interface SonicColliderD3VisualizerProps {
  mode: SonicMode;
  category: string;
  preset: SonicPreset | null;
  collisionEnergy?: number; // 0.5 to 14.0 TeV
  onChangeCollisionEnergy?: (energy: number) => void;
  onOpenSaveCollision?: () => void;
  savedCollisionsCount?: number;
  onOpenSavedCollisions?: () => void;
  onSelectCategory?: (category: string) => void;
}

interface ParticleNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  beam: 'A' | 'B' | 'core';
  baseRadius: number;
  radius: number;
  baseMass: number;
  mass: number;
  color: string;
  charge: number;
  angle: number;
  orbitRadius: number;
  baseSpeed: number;
  speed: number;
  x: number;
  y: number;
}

interface ParticleLink extends d3.SimulationLinkDatum<ParticleNode> {
  source: ParticleNode | string;
  target: ParticleNode | string;
  value: number;
}

export const SonicColliderD3Visualizer: React.FC<SonicColliderD3VisualizerProps> = ({
  mode,
  category,
  preset,
  collisionEnergy = 8.4,
  onChangeCollisionEnergy,
  onOpenSaveCollision,
  savedCollisionsCount = 0,
  onOpenSavedCollisions
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Cross-fade state between Sonic Sector & Lyric Lab
  const [displayMode, setDisplayMode] = useState<SonicMode>(mode);
  const [isCrossFading, setIsCrossFading] = useState<boolean>(false);
  const prevModeRef = useRef<SonicMode>(mode);

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [entropy, setEntropy] = useState<number>(0.5); // 0.1 to 1.0
  const [showPhysicsTooltip, setShowPhysicsTooltip] = useState<boolean>(false);

  // Calculate live physics parameters from Collision Energy
  const physics: PhysicsConstants = calculatePhysicsConstants(collisionEnergy);

  const [activeTelemetry, setActiveTelemetry] = useState({
    flux: `${physics.energyTeV.toFixed(1)} TeV`,
    coherence: '98.7%',
    particles: 42,
    curvature: `G: ×${physics.gravityConstant.toFixed(2)} G₀`,
    luminosity: physics.luminosity
  });

  // Shockwave trigger state
  const shockwaveTriggerRef = useRef<number>(0);

  // Trigger shockwave
  const triggerPulse = () => {
    shockwaveTriggerRef.current = Date.now();
    playLaserBeamSound('laser_curve');
  };

  // Cross-fade transition handler when mode prop toggles
  useEffect(() => {
    if (prevModeRef.current !== mode) {
      setIsCrossFading(true);
      playLaserBeamSound('laser_curve');

      const fadeTimer = setTimeout(() => {
        setDisplayMode(mode);
        prevModeRef.current = mode;

        const finishTimer = setTimeout(() => {
          setIsCrossFading(false);
        }, 60);

        return () => clearTimeout(finishTimer);
      }, 200);

      return () => clearTimeout(fadeTimer);
    } else {
      setDisplayMode(mode);
    }
  }, [mode]);

  // --------------------------------------------------------------------------
  // D3 RENDERING ENGINE: Governed by Mass, Velocity, and Gravity Physics Constants
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = isExpanded ? 340 : 180;
    const centerX = width / 2;
    const centerY = height / 2;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    // Definitions: Filters and Gradients
    const defs = svg.append('defs');

    // Glow filter with energy-dependent glow dispersion
    const filter = defs.append('filter')
      .attr('id', 'neon-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    
    const glowStdDev = displayMode === 'sonic' 
      ? (3 + (collisionEnergy / 14) * 3).toFixed(1) 
      : (2 + (collisionEnergy / 14) * 2.5).toFixed(1);

    filter.append('feGaussianBlur')
      .attr('stdDeviation', glowStdDev)
      .attr('result', 'coloredBlur');

    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Root Scene Group for cross-fade entrance
    const sceneG = svg.append('g')
      .attr('class', 'scene-root')
      .attr('opacity', 0);

    sceneG.transition()
      .duration(400)
      .ease(d3.easeCubicOut)
      .attr('opacity', 1);

    // Background Subtle Grid / Radar Circles
    const backgroundG = sceneG.append('g').attr('class', 'bg-grid').attr('opacity', 0.25);

    // Radar Concentric Rings scaled by gravity curvature
    [0.2, 0.4, 0.6, 0.8, 0.95].forEach(scale => {
      backgroundG.append('circle')
        .attr('cx', centerX)
        .attr('cy', centerY)
        .attr('r', (Math.min(width, height) / 2) * scale)
        .attr('fill', 'none')
        .attr('stroke', displayMode === 'sonic' ? '#06b6d4' : '#a855f7')
        .attr('stroke-width', 0.75)
        .attr('stroke-dasharray', scale === 0.6 ? '4,4' : 'none');
    });

    // Crosshairs
    backgroundG.append('line')
      .attr('x1', centerX - 40)
      .attr('x2', centerX + 40)
      .attr('y1', centerY)
      .attr('y2', centerY)
      .attr('stroke', displayMode === 'sonic' ? '#06b6d4' : '#ec4899')
      .attr('stroke-width', 1);

    backgroundG.append('line')
      .attr('x1', centerX)
      .attr('x2', centerX)
      .attr('y1', centerY - 40)
      .attr('y2', centerY + 40)
      .attr('stroke', displayMode === 'sonic' ? '#06b6d4' : '#ec4899')
      .attr('stroke-width', 1);

    let animFrameId: number;

    // ========================================================================
    // MODE 1: SONIC SECTOR - PARTICLE ACCELERATOR WITH MASS, VELOCITY & GRAVITY
    // ========================================================================
    if (displayMode === 'sonic') {
      const particleCount = 42;
      const sonicCategory = category.toLowerCase();
      
      // Dynamic energy tuned by category + physics constants
      let categorySpeedMultiplier = 1.0;
      if (sonicCategory.includes('metal') || sonicCategory.includes('drum')) categorySpeedMultiplier = 1.6;
      else if (sonicCategory.includes('ambient') || sonicCategory.includes('lo-fi')) categorySpeedMultiplier = 0.6;
      else if (sonicCategory.includes('synth') || sonicCategory.includes('edm')) categorySpeedMultiplier = 1.35;

      // Seed Nodes representing colliding sound particles with Mass & Velocity constants
      const nodes: ParticleNode[] = Array.from({ length: particleCount }, (_, i) => {
        const isBeamA = i % 2 === 0;
        const orbitRadius = 38 + Math.random() * (Math.min(width, height) / 2 - 42);
        const angle = (i / particleCount) * Math.PI * 2;
        
        let color = isBeamA ? '#06b6d4' : '#f59e0b'; // Cyan (Beam A) vs Amber (Beam B)
        if (i === 0) color = '#ffffff'; // Core Boson
        else if (i % 7 === 0) color = '#ec4899'; // Strangelet anomaly
        else if (i % 5 === 0) color = '#a855f7'; // Quantum meson

        const baseRadius = i === 0 ? 10 : 2.5 + Math.random() * 3.5;
        const baseMass = i === 0 ? 5.0 : 0.8 + Math.random() * 1.5;
        
        // Effective Mass governed by collision physics mass constant
        const mass = baseMass * physics.massConstant;
        // Visual radius scales subtly with relativistic mass density
        const radius = Math.min(16, baseRadius * Math.sqrt(physics.massConstant / 1.1));

        // Base velocity scaled by velocity constant
        const baseSpeed = (isBeamA ? 0.014 : -0.017) * categorySpeedMultiplier;
        const speed = baseSpeed * physics.velocityConstant * (0.8 + entropy * 0.6);

        const tagSample = preset?.tags[i % (preset?.tags.length || 1)] || category;

        return {
          id: `node-${i}`,
          name: tagSample,
          beam: i === 0 ? 'core' : isBeamA ? 'A' : 'B',
          baseRadius,
          radius,
          baseMass,
          mass,
          color,
          charge: (Math.random() - 0.5) * 2,
          angle,
          orbitRadius,
          baseSpeed,
          speed,
          x: centerX + Math.cos(angle) * orbitRadius,
          y: centerY + Math.sin(angle) * orbitRadius
        };
      });

      // Links between proximate particles
      const links: ParticleLink[] = [];
      for (let i = 1; i < nodes.length; i++) {
        if (Math.random() > 0.68) {
          links.push({
            source: nodes[i],
            target: nodes[(i + 1) % nodes.length],
            value: Math.random()
          });
        }
      }

      // Group containers
      const linkG = sceneG.append('g').attr('class', 'links');
      const arcG = sceneG.append('g').attr('class', 'collision-arcs');
      const nodeG = sceneG.append('g').attr('class', 'nodes');
      const shockwaveG = sceneG.append('g').attr('class', 'shockwaves');

      // Create lines
      const linkElements = linkG.selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('stroke', '#06b6d4')
        .attr('stroke-opacity', 0.2 + (physics.energyTeV / 14) * 0.15)
        .attr('stroke-width', 0.8);

      // Create Circles with mass-proportional radius and halo
      const nodeElements = nodeG.selectAll('circle')
        .data(nodes)
        .enter()
        .append('circle')
        .attr('r', d => d.radius)
        .attr('fill', d => d.color)
        .attr('filter', 'url(#neon-glow)')
        .attr('opacity', 0.88)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', d => d.beam === 'core' ? 2 : 0.6);

      // Gravitational Well Focal Ring
      const collisionChamberRing = sceneG.append('circle')
        .attr('cx', centerX)
        .attr('cy', centerY)
        .attr('r', 32)
        .attr('fill', 'none')
        .attr('stroke', '#06b6d4')
        .attr('stroke-width', 1.5 + (physics.gravityConstant / 3.0) * 1.5)
        .attr('stroke-dasharray', '3,3')
        .attr('opacity', 0.7);

      // Core Strangelet Singularity
      const corePulse = sceneG.append('circle')
        .attr('cx', centerX)
        .attr('cy', centerY)
        .attr('r', 12)
        .attr('fill', '#ffffff')
        .attr('filter', 'url(#neon-glow)')
        .attr('opacity', 0.95);

      let stepTime = 0;

      // Animate Particle Accelerator with Physics Equations
      const renderSonicLoop = () => {
        stepTime += 0.02 * physics.velocityConstant;

        // Shockwave pulse
        const now = Date.now();
        const shockAge = now - shockwaveTriggerRef.current;
        if (shockAge < 1000) {
          const shockRadius = (shockAge / 1000) * (width / 2);
          const shockOpacity = 1 - shockAge / 1000;
          shockwaveG.selectAll('*').remove();
          shockwaveG.append('circle')
            .attr('cx', centerX)
            .attr('cy', centerY)
            .attr('r', shockRadius)
            .attr('fill', 'none')
            .attr('stroke', '#38bdf8')
            .attr('stroke-width', 3 + (physics.energyTeV / 14) * 3)
            .attr('opacity', shockOpacity);
        } else {
          shockwaveG.selectAll('*').remove();
        }

        // Particle Trajectory & Gravity Updates:
        // Relativistic precession & central gravitational attractor pull
        const gravityEffect = (physics.gravityConstant - 0.6) * 0.15; // Inward radial curvature tension

        nodes.forEach((node, idx) => {
          if (idx === 0) {
            // Core boson oscillates with energy frequency
            const coreJitter = 3 + (physics.energyTeV / 14) * 3;
            node.x = centerX + Math.sin(stepTime * 3) * coreJitter;
            node.y = centerY + Math.cos(stepTime * 2.5) * coreJitter;
            return;
          }

          // Advance orbital angle proportional to velocity constant & mass inertia
          // Heavier particles experience slightly more inertial stability, lighter particles accelerate
          const massInertiaModifier = 1 / (1 + (node.mass - 1) * 0.12);
          node.angle += node.speed * massInertiaModifier;

          // Gravitational curvature well: high gravity contracts orbit toward core with Keplerian precession
          const gravitationalCompression = 1 - gravityEffect * Math.sin(node.angle * 2 + stepTime);
          const jitter = Math.sin(stepTime * 4 + idx) * (entropy * 5 * (physics.energyTeV / 8.4));
          const currentRadius = Math.max(25, (node.orbitRadius * gravitationalCompression) + jitter);

          node.x = centerX + Math.cos(node.angle) * currentRadius;
          node.y = centerY + Math.sin(node.angle) * currentRadius;
        });

        // Dynamic High-Energy Micro-Arcs during proximity passes
        if (physics.energyTeV > 4.5 && Math.random() > 0.4) {
          arcG.selectAll('*').remove();
          // Find proximate opposite-beam particles near collision chamber
          for (let a = 1; a < Math.min(18, nodes.length); a += 2) {
            for (let b = 2; b < Math.min(18, nodes.length); b += 2) {
              const dx = nodes[a].x - nodes[b].x;
              const dy = nodes[a].y - nodes[b].y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 45) {
                arcG.append('line')
                  .attr('x1', nodes[a].x)
                  .attr('y1', nodes[a].y)
                  .attr('x2', nodes[b].x)
                  .attr('y2', nodes[b].y)
                  .attr('stroke', physics.energyTeV > 10 ? '#f43f5e' : '#38bdf8')
                  .attr('stroke-width', (physics.energyTeV / 14) * 1.8)
                  .attr('stroke-opacity', 0.85);
                break;
              }
            }
          }
        }

        // Update DOM elements
        nodeElements
          .attr('cx', d => d.x || centerX)
          .attr('cy', d => d.y || centerY);

        linkElements
          .attr('x1', d => (d.source as ParticleNode).x || centerX)
          .attr('y1', d => (d.source as ParticleNode).y || centerY)
          .attr('x2', d => (d.target as ParticleNode).x || centerX)
          .attr('y2', d => (d.target as ParticleNode).y || centerY);

        // Core pulsation modulated by mass and gravity
        const ringPulse = 28 + (physics.gravityConstant * 2.5) + Math.sin(stepTime * 4) * 6;
        collisionChamberRing.attr('r', Math.max(15, ringPulse));
        corePulse.attr('r', 8 + (physics.massConstant * 2) + Math.cos(stepTime * 5) * 3);

        animFrameId = requestAnimationFrame(renderSonicLoop);
      };

      renderSonicLoop();

      // Update telemetry
      setActiveTelemetry({
        flux: `${physics.energyTeV.toFixed(1)} TeV`,
        coherence: `${(98.8 - (physics.energyTeV / 14) * 4.2).toFixed(1)}%`,
        particles: particleCount,
        curvature: `G: ×${physics.gravityConstant.toFixed(2)} G₀`,
        luminosity: physics.luminosity
      });

    } 
    // ========================================================================
    // MODE 2: LYRIC LAB - SACRED GEOMETRIC FLOW MODULATED BY PHYSICS CONSTANTS
    // ========================================================================
    else {
      const lyricCategory = category.toLowerCase();
      let geometryType: 'sacred_spiral' | 'chladni_rings' | 'chevron_noir' | 'crystal_poly' = 'sacred_spiral';

      if (lyricCategory.includes('masters') || lyricCategory.includes('songwriting')) {
        geometryType = 'sacred_spiral';
      } else if (lyricCategory.includes('strange') || lyricCategory.includes('directors')) {
        geometryType = 'chevron_noir';
      } else if (lyricCategory.includes('bizarre') || lyricCategory.includes('philosophical')) {
        geometryType = 'chladni_rings';
      } else {
        geometryType = 'crystal_poly';
      }

      const geomG = sceneG.append('g').attr('class', 'geom-lattice');
      const waveG = sceneG.append('g').attr('class', 'flow-wave');
      const pointG = sceneG.append('g').attr('class', 'verse-points');

      const maxR = Math.min(width, height) / 2 - 20;
      let angleOffset = 0;

      // Generate Sacred Geometry Paths modulated by Velocity, Mass, and Gravity constants
      const renderGeometricLoop = () => {
        angleOffset += 0.008 * physics.velocityConstant * (0.6 + entropy * 0.8);

        // Check shockwave
        const now = Date.now();
        const shockAge = now - shockwaveTriggerRef.current;
        const shockPulse = shockAge < 800 ? Math.sin((shockAge / 800) * Math.PI) * (15 * (physics.energyTeV / 8.4)) : 0;

        geomG.selectAll('*').remove();
        waveG.selectAll('*').remove();
        pointG.selectAll('*').remove();

        // 1. Chladni & Harmonic Rings
        if (geometryType === 'chladni_rings' || geometryType === 'sacred_spiral') {
          const ringCount = 8;
          for (let r = 1; r <= ringCount; r++) {
            const rad = (maxR / ringCount) * r + shockPulse;
            const points: [number, number][] = [];
            const segments = 60;
            const freq = r * 2;

            for (let s = 0; s <= segments; s++) {
              const theta = (s / segments) * Math.PI * 2;
              const waveMod = Math.sin(theta * freq + angleOffset * 3) * (5 * entropy * physics.massConstant);
              // Gravity curves the outer points inward
              const gravDistort = 1 - (physics.gravityConstant - 0.6) * 0.08 * (r / ringCount);
              const px = centerX + Math.cos(theta + angleOffset * (r % 2 === 0 ? 1 : -1)) * ((rad + waveMod) * gravDistort);
              const py = centerY + Math.sin(theta + angleOffset * (r % 2 === 0 ? 1 : -1)) * ((rad + waveMod) * gravDistort);
              points.push([px, py]);
            }

            const lineGen = d3.line().curve(d3.curveBasisClosed);
            geomG.append('path')
              .attr('d', lineGen(points) || '')
              .attr('fill', 'none')
              .attr('stroke', r % 2 === 0 ? '#c084fc' : '#ec4899')
              .attr('stroke-width', (0.8 + (physics.massConstant / 2.8) * 1.2).toFixed(1))
              .attr('stroke-opacity', 0.4 + (r / ringCount) * 0.4)
              .attr('filter', 'url(#neon-glow)');
          }
        }

        // 2. Metatron's Polyhedral Rhombus Vector Lattice
        if (geometryType === 'crystal_poly' || geometryType === 'sacred_spiral') {
          const vertexCount = 12;
          const polyRadius = maxR * 0.75 + shockPulse;
          const polyPoints: { x: number; y: number }[] = [];

          for (let v = 0; v < vertexCount; v++) {
            const a = (v / vertexCount) * Math.PI * 2 + angleOffset;
            const px = centerX + Math.cos(a) * polyRadius;
            const py = centerY + Math.sin(a) * polyRadius;
            polyPoints.push({ x: px, y: py });

            // Node dot with mass-proportional radius
            pointG.append('circle')
              .attr('cx', px)
              .attr('cy', py)
              .attr('r', 2 + physics.massConstant)
              .attr('fill', '#f472b6')
              .attr('filter', 'url(#neon-glow)');
          }

          // Sacred interconnected lines
          for (let i = 0; i < polyPoints.length; i++) {
            for (let j = i + 1; j < polyPoints.length; j++) {
              if ((j - i) % 2 === 0 || (j - i) === 3) {
                geomG.append('line')
                  .attr('x1', polyPoints[i].x)
                  .attr('y1', polyPoints[i].y)
                  .attr('x2', polyPoints[j].x)
                  .attr('y2', polyPoints[j].y)
                  .attr('stroke', '#a855f7')
                  .attr('stroke-width', 0.6 + (physics.energyTeV / 14) * 0.6)
                  .attr('stroke-opacity', 0.35);
              }
            }
          }
        }

        // 3. Lynchian Chevron / Wave Flow
        if (geometryType === 'chevron_noir') {
          const chevronLines = 14;
          for (let c = 0; c < chevronLines; c++) {
            const yPos = (height / chevronLines) * c;
            const wavePoints: [number, number][] = [];
            for (let x = 0; x <= width; x += 25) {
              const theta = (x / width) * Math.PI * 4 + angleOffset * 2 + c;
              const y = yPos + Math.sin(theta) * (10 + physics.massConstant * 4);
              wavePoints.push([x, y]);
            }

            const lineGen = d3.line().curve(d3.curveCardinal);
            waveG.append('path')
              .attr('d', lineGen(wavePoints) || '')
              .attr('fill', 'none')
              .attr('stroke', c % 2 === 0 ? '#f43f5e' : '#8b5cf6')
              .attr('stroke-width', 1.0 + (physics.massConstant / 2.8) * 0.8)
              .attr('stroke-opacity', 0.45);
          }
        }

        // Golden Ratio Central Glyph
        geomG.append('circle')
          .attr('cx', centerX)
          .attr('cy', centerY)
          .attr('r', 16 + (physics.massConstant * 2) + Math.sin(angleOffset * 4) * 3)
          .attr('fill', 'none')
          .attr('stroke', '#f43f5e')
          .attr('stroke-width', 1.5 + (physics.gravityConstant / 3) * 1.5)
          .attr('filter', 'url(#neon-glow)');

        animFrameId = requestAnimationFrame(renderGeometricLoop);
      };

      renderGeometricLoop();

      // Update telemetry
      setActiveTelemetry({
        flux: `${physics.energyTeV.toFixed(1)} TeV`,
        coherence: `${(99.4 - (physics.energyTeV / 14) * 3.1).toFixed(1)}%`,
        particles: geometryType === 'sacred_spiral' ? 64 : 48,
        curvature: `Golden Ratio (1.618) // G: ×${physics.gravityConstant.toFixed(2)}`,
        luminosity: physics.luminosity
      });
    }

    return () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
    };
  }, [displayMode, category, isExpanded, entropy, preset, collisionEnergy]);


  return (
    <div 
      ref={containerRef}
      className={`w-full border-b relative transition-all duration-500 overflow-hidden ${
        displayMode === 'sonic'
          ? 'border-cyan-900/40 shadow-[inset_0_1px_15px_rgba(6,182,212,0.05)]'
          : 'border-purple-900/40 shadow-[inset_0_1px_15px_rgba(168,85,247,0.05)]'
      }`}
      style={{ 
        height: isExpanded ? '380px' : '220px',
        background: displayMode === 'sonic'
          ? 'radial-gradient(ellipse at 50% 50%, #081626 0%, #050811 80%, #030408 100%)'
          : 'radial-gradient(ellipse at 50% 50%, #1e0926 0%, #0a0512 80%, #030408 100%)'
      }}
    >
      {/* Dynamic Mode Cross-Fade Warp Sweep Beam */}
      <div 
        className={`absolute inset-0 pointer-events-none transition-opacity duration-300 z-20 flex flex-col items-center justify-center ${
          isCrossFading ? 'opacity-100 backdrop-blur-[1px]' : 'opacity-0'
        }`}
      >
        {/* Horizontal glowing laser pulse sweep */}
        <div 
          className={`w-full h-[2px] shadow-lg transition-all duration-300 ${
            displayMode === 'sonic'
              ? 'bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_#06b6d4]'
              : 'bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_20px_#a855f7]'
          }`} 
        />
        
        {/* Phase Transition HUD Badge */}
        <div className={`mt-3 px-4 py-1 rounded-full border text-[11px] font-mono font-bold tracking-widest uppercase shadow-2xl backdrop-blur-md animate-pulse ${
          displayMode === 'sonic'
            ? 'bg-cyan-950/90 border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
            : 'bg-purple-950/90 border-purple-400 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.4)]'
        }`}>
          COLLIDER PHASE TRANSITION // {displayMode === 'sonic' ? 'SONIC SECTOR' : 'LYRIC LAB'}
        </div>
      </div>

      {/* Visualizer Header Controls Overlay */}
      <div className="absolute top-2 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Sector Badge & Category Status */}
        <div className={`flex items-center gap-2.5 pointer-events-auto backdrop-blur-md px-3 py-1 rounded-lg border shadow-sm transition-colors duration-500 ${
          displayMode === 'sonic' 
            ? 'bg-[#09131e]/90 border-cyan-900/60' 
            : 'bg-[#160b20]/90 border-purple-900/60'
        }`}>
          {displayMode === 'sonic' ? (
            <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-400">
              <Zap className="w-3.5 h-3.5 animate-pulse" />
              <span className="font-bold uppercase tracking-wider text-white">LHC PARTICLE COLLIDER</span>
              <span className="text-[#64748b]">/</span>
              <span className="text-cyan-300 truncate max-w-[180px]">{category}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-mono text-purple-400">
              <Feather className="w-3.5 h-3.5 animate-pulse" />
              <span className="font-bold uppercase tracking-wider text-white">SACRED GEOMETRIC FLOW</span>
              <span className="text-[#64748b]">/</span>
              <span className="text-purple-300 truncate max-w-[180px]">{category}</span>
            </div>
          )}
        </div>

        {/* Center / Right: Interactive Physics Sliders & Collision Controls */}
        <div className="flex items-center gap-2 pointer-events-auto flex-wrap">
          {/* Collision Energy Slider */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-lg backdrop-blur-md border text-xs font-mono transition-colors relative ${
            displayMode === 'sonic'
              ? 'bg-[#0A121F]/90 border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
              : 'bg-[#150A1F]/90 border-purple-500/40 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.15)]'
          }`}>
            <span className="text-white font-bold flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Collision Energy:</span>
            </span>

            {/* Slider */}
            <input 
              type="range" 
              min="0.5" 
              max="14.0" 
              step="0.1"
              value={collisionEnergy}
              onChange={e => onChangeCollisionEnergy && onChangeCollisionEnergy(parseFloat(e.target.value))}
              className={`w-20 md:w-28 h-1.5 rounded cursor-pointer ${
                displayMode === 'sonic' ? 'accent-cyan-400 bg-[#162740]' : 'accent-purple-400 bg-[#301640]'
              }`}
              title={`Adjust collision beam energy: ${collisionEnergy.toFixed(1)} TeV (alters particle mass, velocity & gravity)`}
            />

            {/* Value Badge */}
            <button
              onClick={() => setShowPhysicsTooltip(prev => !prev)}
              className="px-1.5 py-0.5 rounded bg-black/40 border border-white/20 text-white font-bold text-[11px] flex items-center gap-1 hover:border-amber-400 transition-colors"
              title="Click to toggle mass, velocity, gravity constants readout"
            >
              <span>{collisionEnergy.toFixed(1)} TeV</span>
              <Info className="w-3 h-3 text-[#94A3B8]" />
            </button>

            {/* Physics Constants Popup Hover/Click */}
            {showPhysicsTooltip && (
              <div className="absolute top-9 left-0 right-0 z-30 p-2.5 rounded-xl bg-[#0B0E1A] border border-[#2B3356] shadow-2xl text-[10px] space-y-1 text-[#C4C9E4] animate-fade-in pointer-events-auto">
                <div className="flex items-center justify-between border-b border-[#202744] pb-1 text-[#8E95B8] uppercase font-bold">
                  <span>Particle Physics Matrix</span>
                  <span className="text-amber-300">⚡ {physics.energyTeV.toFixed(1)} TeV</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 pt-1 text-center">
                  <div className="p-1 rounded bg-[#121626]">
                    <div className="text-[#64748b]">MASS</div>
                    <div className="text-amber-300 font-bold">×{physics.massConstant.toFixed(2)} m₀</div>
                  </div>
                  <div className="p-1 rounded bg-[#121626]">
                    <div className="text-[#64748b]">VELOCITY</div>
                    <div className="text-cyan-300 font-bold">×{physics.velocityConstant.toFixed(2)} c</div>
                  </div>
                  <div className="p-1 rounded bg-[#121626]">
                    <div className="text-[#64748b]">GRAVITY</div>
                    <div className="text-purple-300 font-bold">×{physics.gravityConstant.toFixed(2)} G₀</div>
                  </div>
                </div>
                <div className="pt-1 text-[9px] text-[#6E7599] text-center">
                  Superconducting Field: {physics.magneticBendingTesla} T | Lorentz γ: {physics.lorentzGamma}
                </div>
              </div>
            )}
          </div>

          {/* Quick Save Collision Button */}
          {onOpenSaveCollision && (
            <button
              onClick={onOpenSaveCollision}
              className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 text-white ${
                displayMode === 'sonic'
                  ? 'bg-cyan-900/80 hover:bg-cyan-800 border-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : 'bg-purple-900/80 hover:bg-purple-800 border-purple-400/60 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
              }`}
              title="Save current collision parameters, energy, and particle chamber state"
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Save Collision</span>
            </button>
          )}

          {/* Saved Collisions Library Button */}
          {onOpenSavedCollisions && (
            <button
              onClick={onOpenSavedCollisions}
              className="px-2.5 py-1 rounded-lg bg-[#0E111B]/90 hover:bg-[#1A1F30] border border-[#232940] text-xs font-mono text-[#8E92B0] hover:text-white flex items-center gap-1.5 transition-colors"
              title="View and restore saved collisions"
            >
              <Archive className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Collisions</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/50 text-[10px] text-amber-300 border border-amber-500/30">
                {savedCollisionsCount}
              </span>
            </button>
          )}

          {/* Pulse Shockwave Button */}
          <button
            onClick={triggerPulse}
            className={`px-2 py-1 rounded-lg border text-xs font-mono flex items-center gap-1 transition-all ${
              displayMode === 'sonic'
                ? 'bg-cyan-950/60 hover:bg-cyan-900/80 border-cyan-500/40 text-cyan-300'
                : 'bg-purple-950/60 hover:bg-purple-900/80 border-purple-500/40 text-purple-300'
            }`}
            title="Fire quantum shockwave pulse"
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Pulse</span>
          </button>

          {/* Expand / Minimize Toggle */}
          <button
            onClick={() => setIsExpanded(prev => !prev)}
            className="p-1.5 rounded-lg bg-[#0E111B]/90 hover:bg-[#1A1F30] border border-[#232940] text-[#8E92B0] hover:text-white transition-colors"
            title={isExpanded ? 'Collapse visualizer' : 'Expand full visualizer canvas'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* SVG Canvas with Cross-Fade Opacity & Filter Transition */}
      <svg 
        ref={svgRef} 
        className={`w-full h-full block transition-all duration-300 ease-in-out transform ${
          isCrossFading 
            ? 'opacity-0 scale-[0.98] blur-[3px]' 
            : 'opacity-100 scale-100 blur-0'
        }`}
        style={{ background: 'transparent' }}
      />

      {/* Bottom Subtle Overlay Note */}
      <div className="absolute bottom-1.5 left-4 right-4 flex items-center justify-between text-[10px] font-mono text-[#525875] pointer-events-none">
        <div className="flex items-center gap-3">
          <span>
            {displayMode === 'sonic' 
              ? `HADRON ACCELERATOR // BEAM ENERGY: ${collisionEnergy.toFixed(1)} TeV` 
              : `SACRED POETIC LATTICE // HARMONIC TENSION: ${collisionEnergy.toFixed(1)} TeV`}
          </span>
          <span className="hidden md:inline text-[#64748b]">
            MASS: <strong className="text-amber-400">×{physics.massConstant.toFixed(2)}m₀</strong> | 
            VEL: <strong className="text-cyan-400">×{physics.velocityConstant.toFixed(2)}c</strong> | 
            GRAV: <strong className="text-purple-400">×{physics.gravityConstant.toFixed(2)}G₀</strong>
          </span>
        </div>
        {preset && (
          <div className="truncate max-w-[280px]">
            ACTIVE TARGET: <span className="text-white font-semibold">{preset.name}</span>
          </div>
        )}
      </div>
    </div>
  );
};
