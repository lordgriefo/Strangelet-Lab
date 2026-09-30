import { AutomationPoint, TrackAutomation } from '../types';

export const snapToGrid = (value: number, snapValue: string): number => {
  if (snapValue === 'freeform' || snapValue === 'off') return value;
  
  const [numerator, denominator] = snapValue.split('/').map(Number);
  if (!denominator || isNaN(numerator) || isNaN(denominator)) return value;
  const gridSize = numerator / denominator;
  
  return Number((Math.round(value / gridSize) * gridSize).toFixed(4));
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
 * Interpolates automation value at a given normalized time (0 to 1)
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
      const t = (time - p1.time) / (p2.time - p1.time);
      return p1.value + t * (p2.value - p1.value);
    }
  }

  return defaultValue;
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
        { id: `${prefix}-1`, time: 0, value: 0 },
        { id: `${prefix}-2`, time: 0.25, value: currentVal * 0.35 },
        { id: `${prefix}-3`, time: 0.5, value: currentVal * 0.75 },
        { id: `${prefix}-4`, time: 1.0, value: currentVal || 0.85 }
      ];
    case 'fade_out':
      return [
        { id: `${prefix}-1`, time: 0, value: currentVal || 0.85 },
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
        
        points.push({ id: `${prefix}-duck-${b}`, time: duckPoint, value: 0.15 });
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

