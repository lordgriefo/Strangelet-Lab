import { SavedCollision, ColliderChip } from '../types';

export interface PhysicsConstants {
  energyTeV: number; // 0.5 to 14.0 TeV
  massConstant: number; // 0.70 to 2.80 m0
  velocityConstant: number; // 0.50 to 2.20 c
  gravityConstant: number; // 0.60 to 3.00 G0
  luminosity: string; // e.g. "2.8 × 10³⁴ cm⁻²s⁻¹"
  lorentzGamma: number; // Relativistic dilation factor
  magneticBendingTesla: number; // Superconducting magnet field
  description: string;
}

/**
 * Calculates relativistic particle physics constants based on Collision Energy (TeV).
 * In particle collider physics (CERN LHC), higher beam energy corresponds to:
 * - Increased relativistic mass (m = gamma * m0)
 * - Higher particle velocity nearing c (Lorentz boosted)
 * - Enhanced gravitational attractor / spatial curvature well (G)
 */
export function calculatePhysicsConstants(energyTeV: number): PhysicsConstants {
  const clampedEnergy = Math.max(0.5, Math.min(14.0, Number(energyTeV) || 8.4));
  const normalized = (clampedEnergy - 0.5) / 13.5; // 0 to 1

  // Relativistic mass constant: particles gain effective relativistic mass
  const massConstant = parseFloat((0.7 + normalized * 2.1).toFixed(2));

  // Particle velocity constant: accelerates orbital momentum
  const velocityConstant = parseFloat((0.5 + normalized * 1.7).toFixed(2));

  // Gravitational well constant: curvature pull toward the central Strangelet core
  const gravityConstant = parseFloat((0.6 + normalized * 2.4).toFixed(2));

  // Lorentz factor gamma = 1 / sqrt(1 - beta^2)
  const beta = Math.min(0.9995, 0.45 + normalized * 0.54);
  const lorentzGamma = parseFloat((1 / Math.sqrt(1 - beta * beta)).toFixed(2));

  // Superconducting dipole magnet strength (Tesla)
  const magneticBendingTesla = parseFloat((2.0 + normalized * 6.33).toFixed(2));

  // Synchrotron luminosity
  const lumVal = (0.75 + normalized * 3.45).toFixed(2);
  const luminosity = `${lumVal} × 10³⁴ cm⁻²s⁻¹`;

  let description = 'Sub-TeV Soft Ion Injection';
  if (clampedEnergy >= 12.0) {
    description = 'Ultra-Relativistic Strangelet Singularity';
  } else if (clampedEnergy >= 8.5) {
    description = 'High-Luminosity Synchrotron Resonance';
  } else if (clampedEnergy >= 5.0) {
    description = 'Standard Beam Cross-Section Collider';
  }

  return {
    energyTeV: clampedEnergy,
    massConstant,
    velocityConstant,
    gravityConstant,
    luminosity,
    lorentzGamma,
    magneticBendingTesla,
    description
  };
}

export const DEFAULT_SAVED_COLLISIONS: SavedCollision[] = [
  {
    id: 'sc-cyber-darkwave-118',
    name: 'Cyberpunk Darkwave × Theremin Singularity',
    timestamp: Date.now() - 1000 * 60 * 45,
    mode: 'sonic',
    collisionEnergy: 11.8,
    massConstant: 2.46,
    velocityConstant: 1.93,
    gravityConstant: 2.61,
    category: 'Suno Genre Templates',
    presetId: 'sonic-cyber-darkwave',
    presetName: 'Cyberpunk Darkwave Grid',
    tags: ['cyberpunk', 'darkwave', 'heavy-sub', 'analog-tape', '11.8-tev'],
    notes: 'High-energy relativistic collision with maximum tape flutter and intense low-end inertia.',
    starred: true,
    chips: [
      {
        id: 'genre-post-punk',
        label: 'Post-Punk',
        category: 'genre',
        sidebarGroup: 'beam_a',
        color: '#6366F1',
        description: 'Angular driving bass, cold chorus guitars, urgent motorized drums',
        energyWeight: 0.85
      },
      {
        id: 'inst-theremin',
        label: 'Theremin',
        category: 'instrument',
        sidebarGroup: 'beam_b',
        color: '#38BDF8',
        description: 'Continuous sinusoidal pitch slide, eerie sci-fi glide',
        energyWeight: 0.9
      },
      {
        id: 'prod-tape-flutter-wow',
        label: 'Tape Flutter & Wow',
        category: 'production',
        sidebarGroup: 'beam_b',
        color: '#F472B6',
        description: 'Mechanical tape warble, periodic pitch drift and head wear',
        energyWeight: 0.8
      }
    ]
  },
  {
    id: 'sc-twin-peaks-96',
    name: 'Twin Peaks Noir × Quantum Entanglement',
    timestamp: Date.now() - 1000 * 60 * 120,
    mode: 'lyrics',
    collisionEnergy: 9.6,
    massConstant: 2.12,
    velocityConstant: 1.65,
    gravityConstant: 2.22,
    category: 'Strange Literature & Sci-Fi',
    presetId: 'lyric-quantum-entangle',
    presetName: 'Quantum Entanglement & Cold Spacetime',
    themeA: 'Twin Peaks / Lynchian Dream Noir',
    themeB: 'Quantum Field Theory & Entanglement',
    tags: ['lynchian', 'quantum', 'noir', 'backward-speech', '9.6-tev'],
    notes: 'Harmonic poetic lattice folding backward speech into non-local wavefunctions.',
    starred: true
  },
  {
    id: 'sc-hadron-math-rock-134',
    name: 'Hadron Math Rock × Tape Saturation Superposition',
    timestamp: Date.now() - 1000 * 60 * 360,
    mode: 'sonic',
    collisionEnergy: 13.4,
    massConstant: 2.71,
    velocityConstant: 2.13,
    gravityConstant: 2.90,
    category: 'Production & Space Techniques',
    presetId: 'sonic-sub-heavy-industrial',
    presetName: 'Sub-Heavy Industrial Hammer',
    tags: ['math-rock', 'industrial', 'tape-saturation', '13.4-tev'],
    notes: 'Near-maximum beam collision energy resulting in extreme angular percussion and relativistic compression.',
    starred: false
  }
];
