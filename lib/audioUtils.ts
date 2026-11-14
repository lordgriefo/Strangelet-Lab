import { AutomationPoint, TrackAutomation, Clip } from '../types';

export const snapToGrid = (value: number, snapValue: string): number => {
  if (!snapValue || snapValue === 'freeform' || snapValue === 'off') return value;
  
  // Triplet handling (1 bar = 4 beats)
  // 1/4T = 1/6 bar, 1/8T = 1/12 bar, 1/16T = 1/24 bar, 1/32T = 1/48 bar
  if (snapValue === 'triplet' || snapValue === '1/12 T' || snapValue === '1/12' || snapValue === '1/8T') {
    const gridSize = 1 / 12; // 1/8 note triplet
    return Number((Math.round(value / gridSize) * gridSize).toFixed(4));
  }
  if (snapValue === '1/16T' || snapValue === '1/24') {
    const gridSize = 1 / 24; // 1/16 note triplet
    return Number((Math.round(value / gridSize) * gridSize).toFixed(4));
  }
  if (snapValue === '1/4T' || snapValue === '1/6') {
    const gridSize = 1 / 6; // 1/4 note triplet
    return Number((Math.round(value / gridSize) * gridSize).toFixed(4));
  }
  if (snapValue === '1/32T' || snapValue === '1/48') {
    const gridSize = 1 / 48;
    return Number((Math.round(value / gridSize) * gridSize).toFixed(4));
  }

  const cleanSnap = snapValue.replace(/[^\d/]/g, '');
  const [numerator, denominator] = cleanSnap.split('/').map(Number);
  if (!denominator || isNaN(numerator) || isNaN(denominator)) return value;
  const gridSize = numerator / denominator;
  
  return Number((Math.round(value / gridSize) * gridSize).toFixed(4));
};

/**
 * Incrementally carves an [eraseStart, eraseEnd] interval (in bars) out of track clips:
 * - Fully covered clips are removed
 * - Front/tail overlaps are trimmed cleanly to the erased boundary
 * - Interior erasures split a clip into left and right pieces around the erased slice
 */
export const carveEraseRegionFromClips = (
  clips: Clip[],
  eraseStart: number,
  eraseEnd: number
): Clip[] => {
  const start = Math.min(eraseStart, eraseEnd);
  const end = Math.max(eraseStart, eraseEnd);
  if (end - start <= 1e-6) return clips;

  const MIN_CLIP_BARS = 0.015;
  const existingIds = new Set(clips.map(c => c.id));
  const result: Clip[] = [];

  for (const clip of clips) {
    const cStart = clip.startBar;
    const cEnd = clip.startBar + clip.durationBars;

    // Outside overlap: keep untouched
    if (end <= cStart + 1e-5 || start >= cEnd - 1e-5) {
      result.push(clip);
      continue;
    }

    const leftDur = Number((start - cStart).toFixed(4));
    const rightDur = Number((cEnd - end).toFixed(4));
    const hasLeft = leftDur >= MIN_CLIP_BARS;
    const hasRight = rightDur >= MIN_CLIP_BARS;

    if (hasLeft) {
      const leftNotes = clip.midiNotes
        ? clip.midiNotes
            .filter(mn => mn.startBar < leftDur - 1e-4)
            .map(mn => {
              const clampedDur = Math.min(mn.durationBars, Number((leftDur - mn.startBar).toFixed(4)));
              const ratio = mn.durationBars > 0 ? clampedDur / mn.durationBars : 1;
              return {
                ...mn,
                durationBars: clampedDur,
                durationSeconds: Number((mn.durationSeconds * ratio).toFixed(4))
              };
            })
        : undefined;

      result.push({
        ...clip,
        durationBars: leftDur,
        fadeInBars: clip.fadeInBars !== undefined ? Math.min(clip.fadeInBars, leftDur) : undefined,
        fadeOutBars: undefined,
        midiNotes: leftNotes
      });
    }

    if (hasRight) {
      const offsetBars = Number((end - cStart).toFixed(4));
      let rightId = clip.id;
      if (hasLeft) {
        let candidate = `${clip.id}__split_r`;
        let suffix = 2;
        while (existingIds.has(candidate)) {
          candidate = `${clip.id}__split_r${suffix}`;
          suffix += 1;
        }
        existingIds.add(candidate);
        rightId = candidate;
      }

      const rightNotes = clip.midiNotes
        ? clip.midiNotes
            .map(mn => {
              const relStart = mn.startBar - offsetBars;
              const relEnd = mn.startBar + mn.durationBars - offsetBars;
              if (relEnd <= 1e-4 || relStart >= rightDur - 1e-4) return null;
              const clampedStart = Math.max(0, Number(relStart.toFixed(4)));
              const clampedEnd = Math.min(rightDur, Number(relEnd.toFixed(4)));
              const clampedDur = Number((clampedEnd - clampedStart).toFixed(4));
              if (clampedDur <= 1e-4) return null;
              const ratio = mn.durationBars > 0 ? clampedDur / mn.durationBars : 1;
              return {
                ...mn,
                startBar: clampedStart,
                durationBars: clampedDur,
                durationSeconds: Number((mn.durationSeconds * ratio).toFixed(4))
              };
            })
            .filter((n): n is NonNullable<typeof n> => n !== null)
        : undefined;

      result.push({
        ...clip,
        id: rightId,
        startBar: Number(end.toFixed(4)),
        durationBars: rightDur,
        fadeInBars: undefined,
        fadeOutBars: clip.fadeOutBars !== undefined ? Math.min(clip.fadeOutBars, rightDur) : undefined,
        midiNotes: rightNotes
      });
    }
  }

  return result;
};

export const volumeToDb = (linear: number): string => {
  if (linear <= 0.0001) return '-inf';
  const db = 20 * Math.log10(linear);
  if (!isFinite(db)) return '-inf';
  return `${db > 0 ? '+' : ''}${db.toFixed(1)} dB`;
};

export const panToString = (pan: number): string => {
  if (Math.abs(pan) < 0.02) return 'Center';
  if (pan < 0) {
    return `${Math.round(Math.abs(pan) * 100)}% Left`;
  }
  return `${Math.round(pan * 100)}% Right`;
};

export const getDefaultAutomation = (volume: number = 0.8, pan: number = 0): TrackAutomation => {
  return {
    volume: {
      enabled: false,
      visible: false,
      points: [
        { id: `vol-start-${Math.random().toString(36).substr(2, 6)}`, time: 0, value: volume },
        { id: `vol-end-${Math.random().toString(36).substr(2, 6)}`, time: 1, value: volume }
      ]
    },
    pan: {
      enabled: false,
      visible: false,
      points: [
        { id: `pan-start-${Math.random().toString(36).substr(2, 6)}`, time: 0, value: pan },
        { id: `pan-end-${Math.random().toString(36).substr(2, 6)}`, time: 1, value: pan }
      ]
    },
    activeParameter: 'volume',
    isExpanded: false
  };
};

/**
 * Interpolates automation value at a given normalized time (0 to 1),
 * supporting optional segment curve tension (-1 to 1, 0 = linear) stored on the starting point.
 */
export const evaluateAutomationAt = (
  points: AutomationPoint[],
  time: number,
  defaultValue: number
): number => {
  if (!points || points.length === 0) return defaultValue;

  const sorted = [...points].sort((a, b) => a.time - b.time);

  if (time <= sorted[0].time) return sorted[0].value;
  if (time >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].value;

  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i];
    const p2 = sorted[i + 1];

    if (time >= p1.time && time <= p2.time) {
      if (p2.time === p1.time) return p1.value;
      const linearT = Math.max(0, Math.min(1, (time - p1.time) / (p2.time - p1.time)));
      const curve = p1.curve ?? 0;
      let shapedT = linearT;
      if (Math.abs(curve) > 0.005) {
        if (curve > 0) {
          shapedT = Math.pow(linearT, 1 + curve * 2.5);
        } else {
          shapedT = 1 - Math.pow(1 - linearT, 1 + Math.abs(curve) * 2.5);
        }
      }
      return p1.value + shapedT * (p2.value - p1.value);
    }
  }

  return defaultValue;
};

/**
 * Formats an automation parameter value cleanly with its unit.
 */
export const formatAutomationValue = (
  value: number,
  unit: string = '',
  min: number = 0,
  max: number = 1
): string => {
  if (unit === 'Hz' || unit === 'hz') {
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(2)} kHz`;
    }
    return `${Math.round(value)} Hz`;
  }
  const span = Math.abs(max - min);
  const formatted = span >= 100 ? value.toFixed(0) : span >= 10 ? value.toFixed(1) : value.toFixed(2);
  return unit ? `${formatted} ${unit}` : formatted;
};

/**
 * Simplifies a sequence of freehand drawn points to prevent over-clustering
 */
export const simplifyDrawnPoints = (
  raw: { time: number; value: number }[],
  minTimeDelta: number = 0.015
): AutomationPoint[] => {
  if (raw.length === 0) return [];
  
  // Sort by time
  const sorted = [...raw].sort((a, b) => a.time - b.time);
  const result: AutomationPoint[] = [];

  // Ensure start point exists (at time 0 or first drawn time)
  if (sorted[0].time > 0.02) {
    result.push({
      id: `p-${Math.random().toString(36).substr(2, 7)}`,
      time: 0,
      value: sorted[0].value
    });
  }

  let lastTime = -1;
  for (const pt of sorted) {
    if (lastTime === -1 || pt.time - lastTime >= minTimeDelta) {
      result.push({
        id: `p-${Math.random().toString(36).substr(2, 7)}`,
        time: Math.max(0, Math.min(1, pt.time)),
        value: pt.value
      });
      lastTime = pt.time;
    }
  }

  // Ensure end point exists (at time 1)
  const lastPt = result[result.length - 1];
  if (lastPt.time < 0.98) {
    result.push({
      id: `p-${Math.random().toString(36).substr(2, 7)}`,
      time: 1,
      value: lastPt.value
    });
  } else {
    lastPt.time = 1;
  }

  return result;
};

export type ComplexEnvelopeShape =
  | 'ramp_up'
  | 'ramp_down'
  | 'arch'
  | 'sine_2'
  | 'sine_4'
  | 'triangle_4'
  | 'pulse_8'
  | 'step_snh'
  | 'reset';

/**
 * Generates complex multi-point or curved automation envelopes scaled to any parameter [min, max].
 */
export const generateComplexEnvelope = (
  shape: ComplexEnvelopeShape,
  min: number,
  max: number,
  defaultValue: number,
  prefix: string = 'env'
): AutomationPoint[] => {
  const clampVal = (v: number) => {
    const clamped = Math.max(min, Math.min(max, v));
    return Number(clamped.toFixed(4));
  };
  const mid = min + (max - min) * 0.5;
  const amp = (max - min) * 0.42;
  const uid = () => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  switch (shape) {
    case 'ramp_up':
      return [
        { id: uid(), time: 0, value: clampVal(min + (max - min) * 0.08), curve: 0.35 },
        { id: uid(), time: 1, value: clampVal(max - (max - min) * 0.05) }
      ];
    case 'ramp_down':
      return [
        { id: uid(), time: 0, value: clampVal(max - (max - min) * 0.05), curve: -0.35 },
        { id: uid(), time: 1, value: clampVal(min + (max - min) * 0.08) }
      ];
    case 'arch':
      return [
        { id: uid(), time: 0, value: clampVal(min + (max - min) * 0.1), curve: -0.3 },
        { id: uid(), time: 0.5, value: clampVal(max - (max - min) * 0.05), curve: 0.3 },
        { id: uid(), time: 1, value: clampVal(min + (max - min) * 0.1) }
      ];
    case 'sine_2': {
      const pts: AutomationPoint[] = [];
      const steps = 24;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        pts.push({ id: uid(), time: Number(t.toFixed(4)), value: clampVal(mid - Math.cos(t * Math.PI * 4) * amp) });
      }
      return pts;
    }
    case 'sine_4': {
      const pts: AutomationPoint[] = [];
      const steps = 32;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        pts.push({ id: uid(), time: Number(t.toFixed(4)), value: clampVal(mid + Math.sin(t * Math.PI * 8) * amp) });
      }
      return pts;
    }
    case 'triangle_4': {
      const pts: AutomationPoint[] = [];
      const peaks = 8;
      for (let i = 0; i <= peaks; i++) {
        const t = i / peaks;
        const val = i % 2 === 0 ? min + (max - min) * 0.12 : max - (max - min) * 0.12;
        pts.push({ id: uid(), time: Number(t.toFixed(4)), value: clampVal(val) });
      }
      return pts;
    }
    case 'pulse_8': {
      const pts: AutomationPoint[] = [];
      const low = clampVal(min + (max - min) * 0.15);
      const high = clampVal(max - (max - min) * 0.12);
      const steps = 8;
      for (let i = 0; i < steps; i++) {
        const t0 = i / steps;
        const tMid = (i + 0.48) / steps;
        const tNext = (i + 0.5) / steps;
        const tEnd = (i + 0.98) / steps;
        pts.push({ id: uid(), time: Number(t0.toFixed(4)), value: high });
        pts.push({ id: uid(), time: Number(tMid.toFixed(4)), value: high });
        pts.push({ id: uid(), time: Number(tNext.toFixed(4)), value: low });
        pts.push({ id: uid(), time: Number(tEnd.toFixed(4)), value: low });
      }
      pts.push({ id: uid(), time: 1, value: low });
      return pts;
    }
    case 'step_snh': {
      const pts: AutomationPoint[] = [];
      const steps = 16;
      for (let i = 0; i < steps; i++) {
        const t0 = i / steps;
        const t1 = Math.min(1, (i + 0.94) / steps);
        const pseudoRand = Math.abs(Math.sin((i + 1) * 12.9898) * 43758.5453) % 1;
        const v = clampVal(min + (0.1 + pseudoRand * 0.82) * (max - min));
        pts.push({ id: uid(), time: Number(t0.toFixed(4)), value: v });
        pts.push({ id: uid(), time: Number(t1.toFixed(4)), value: v });
      }
      pts.push({ id: uid(), time: 1, value: clampVal(defaultValue) });
      return pts;
    }
    case 'reset':
    default:
      return [
        { id: uid(), time: 0, value: clampVal(defaultValue) },
        { id: uid(), time: 1, value: clampVal(defaultValue) }
      ];
  }
};

/**
 * Generates musical automation preset curves
 */
export const generateAutomationPreset = (
  preset: 'fade_in' | 'fade_out' | 'sidechain' | 'auto_pan' | 'lfo_tremolo' | 'reset',
  param: 'volume' | 'pan',
  currentVal: number = param === 'volume' ? 0.8 : 0
): AutomationPoint[] => {
  const prefix = param;
  switch (preset) {
    case 'fade_in':
      return [
        { id: `${prefix}-1`, time: 0, value: 0, curve: -0.25 },
        { id: `${prefix}-2`, time: 0.25, value: currentVal * 0.35 },
        { id: `${prefix}-3`, time: 0.5, value: currentVal * 0.75 },
        { id: `${prefix}-4`, time: 1.0, value: currentVal || 0.85 }
      ];
    case 'fade_out':
      return [
        { id: `${prefix}-1`, time: 0, value: currentVal || 0.85, curve: 0.25 },
        { id: `${prefix}-2`, time: 0.5, value: (currentVal || 0.85) * 0.75 },
        { id: `${prefix}-3`, time: 0.75, value: (currentVal || 0.85) * 0.35 },
        { id: `${prefix}-4`, time: 1.0, value: 0 }
      ];
    case 'sidechain': {
      // 16-bar or 4-bar 4-on-the-floor rhythmic ducking
      const points: AutomationPoint[] = [];
      const totalPulses = 16; // 1 per bar
      for (let b = 0; b < totalPulses; b++) {
        const barStart = b / totalPulses;
        const duckPoint = barStart + 0.01;
        const recovery = barStart + (0.8 / totalPulses);
        
        points.push({ id: `${prefix}-duck-${b}`, time: duckPoint, value: 0.15, curve: -0.4 });
        points.push({ id: `${prefix}-rec-${b}`, time: recovery, value: currentVal || 0.8 });
      }
      points.push({ id: `${prefix}-end`, time: 1, value: currentVal || 0.8 });
      return points;
    }
    case 'auto_pan': {
      // Sine wave between Left and Right across the 16 bars
      const points: AutomationPoint[] = [];
      const steps = 16;
      for (let i = 0; i <= steps; i++) {
        const time = i / steps;
        // 2 full cycles across 16 bars
        const panValue = Math.sin(time * Math.PI * 4) * 0.85;
        points.push({ id: `pan-step-${i}`, time, value: Number(panValue.toFixed(2)) });
      }
      return points;
    }
    case 'lfo_tremolo': {
      // Subtle volume oscillation
      const points: AutomationPoint[] = [];
      const steps = 16;
      const base = currentVal || 0.75;
      for (let i = 0; i <= steps; i++) {
        const time = i / steps;
        const mod = Math.sin(time * Math.PI * 8) * 0.25;
        points.push({ 
          id: `vol-lfo-${i}`, 
          time, 
          value: Math.max(0.1, Math.min(1, base + mod)) 
        });
      }
      return points;
    }
    case 'reset':
    default:
      return [
        { id: `${prefix}-reset-1`, time: 0, value: currentVal },
        { id: `${prefix}-reset-2`, time: 1, value: currentVal }
      ];
  }
};

