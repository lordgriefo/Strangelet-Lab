import { Clip, MidiNoteEvent, Track } from '../types';

export type MidiQuantizeGrid = '1/4' | '1/8' | '1/16' | '1/32';
export type MidiQuantizeScope = 'selected' | 'selected_track' | 'all_midi';

export interface MidiQuantizeOptions {
  grid: MidiQuantizeGrid;
  swingPercent: number; // 0 to 100
  strengthPercent?: number; // 0 to 100 (default 100)
  scope: MidiQuantizeScope;
  selectedClipIds: string[];
  selectedNoteIdsByClip?: Record<string, string[]>;
  selectedTrackId?: string | null;
  quantizeClipStarts?: boolean;
  quantizeNoteLengths?: boolean;
  tempo: number;
  totalBars?: number;
}

export interface MidiQuantizeResult {
  tracks: Track[];
  quantizedClipCount: number;
  quantizedNoteCount: number;
  avgAbsShiftMs: number;
}

export interface ClipBaselineRecord {
  clipStartBar: number;
  fingerprint: string;
  notes: MidiNoteEvent[];
}

// Non-destructive baseline cache keyed by clip ID so interactive Swing / Grid adjustments
// always compute cleanly from original note timings instead of accumulating rounding drift.
const originBaselineCache = new Map<string, ClipBaselineRecord>();

export function getGridBars(grid: MidiQuantizeGrid): number {
  switch (grid) {
    case '1/4':
      return 0.25;
    case '1/8':
      return 0.125;
    case '1/16':
      return 0.0625;
    case '1/32':
      return 0.03125;
    default:
      return 0.0625;
  }
}

export function getSwingFeelInfo(swingPercent: number): {
  label: string;
  ratioText: string;
} {
  const s = Math.max(0, Math.min(100, swingPercent));
  // 0% = 50/50 (0.00 offset); 100% = +0.42 gridBars (~71/29 heavy shuffle); ~79% = 67/33 triplet
  const firstHalfPct = Math.round(50 + (s / 100) * 21);
  const secondHalfPct = 100 - firstHalfPct;
  const ratioText = `${firstHalfPct}/${secondHalfPct}`;

  if (s <= 4) return { label: 'Straight', ratioText: '50/50' };
  if (s <= 35) return { label: 'Subtle Pocket', ratioText };
  if (s <= 68) return { label: 'MPC Bounce', ratioText };
  if (s <= 85) return { label: 'Triplet Groove', ratioText };
  return { label: 'Heavy Shuffle', ratioText };
}

export function previewQuantizeBarWithSwing(
  bar: number,
  grid: MidiQuantizeGrid,
  swingPercent: number,
  strengthPercent: number = 100
): {
  quantizedBar: number;
  straightBar: number;
  stepIndex: number;
  isOffBeat: boolean;
  shiftBars: number;
} {
  const gridBars = getGridBars(grid);
  const clampedSwing = Math.max(0, Math.min(100, swingPercent));
  const strength = Math.max(0, Math.min(100, strengthPercent)) / 100;

  const stepIndex = Math.round(bar / gridBars);
  const straightBar = stepIndex * gridBars;
  const isOffBeat = Math.abs(stepIndex % 2) === 1;

  // Maximum swing offset pushes odd subdivisions forward up to +0.42 of a grid unit
  // (~79% slider cleanly hits exact 2/3 triplet swing = +0.333 * gridBars).
  const swingOffset = isOffBeat ? (clampedSwing / 100) * (gridBars * 0.42) : 0;
  const targetBar = Math.max(0, straightBar + swingOffset);
  const quantizedBar = Math.max(0, bar + (targetBar - bar) * strength);

  return {
    quantizedBar: Number(quantizedBar.toFixed(4)),
    straightBar: Number(straightBar.toFixed(4)),
    stepIndex,
    isOffBeat,
    shiftBars: Number((quantizedBar - bar).toFixed(4))
  };
}

export function quantizeBarWithSwing(
  bar: number,
  grid: MidiQuantizeGrid,
  swingPercent: number,
  strengthPercent: number = 100
): number {
  return previewQuantizeBarWithSwing(bar, grid, swingPercent, strengthPercent).quantizedBar;
}

export function isMidiClipOnTrack(clip: Clip, track: Track): boolean {
  return Boolean(clip.isMidi || (clip.midiNotes && clip.midiNotes.length > 0) || track.type === 'midi');
}

function buildClipFingerprint(clip: Clip): string {
  const noteIds = (clip.midiNotes || []).map(n => `${n.id}:${n.pitch}`).join('|');
  return `${noteIds}`;
}

export function clearMidiQuantizeOriginCache(clipIds?: string[]): void {
  if (!clipIds) {
    originBaselineCache.clear();
    return;
  }
  clipIds.forEach(id => originBaselineCache.delete(id));
}

export function hasBaselineForClips(clipIds: string[]): boolean {
  return clipIds.some(id => originBaselineCache.has(id));
}

export function getClipBaseline(clip: Clip): ClipBaselineRecord | null {
  return originBaselineCache.get(clip.id) || null;
}

function ensureBaseline(clip: Clip): ClipBaselineRecord {
  const existing = originBaselineCache.get(clip.id);
  const fingerprint = buildClipFingerprint(clip);
  if (existing && existing.fingerprint === fingerprint) {
    return existing;
  }
  const snapshot: ClipBaselineRecord = {
    clipStartBar: clip.startBar,
    fingerprint,
    notes: (clip.midiNotes || []).map(n => ({ ...n }))
  };
  originBaselineCache.set(clip.id, snapshot);
  return snapshot;
}

export function resolveTargetClipIds(tracks: Track[], options: Pick<MidiQuantizeOptions, 'scope' | 'selectedClipIds' | 'selectedNoteIdsByClip' | 'selectedTrackId'>): Set<string> {
  const targeted = new Set<string>();
  const noteMap = options.selectedNoteIdsByClip || {};

  for (const track of tracks) {
    for (const clip of track.clips) {
      if (!isMidiClipOnTrack(clip, track)) continue;
      if (options.scope === 'all_midi') {
        targeted.add(clip.id);
      } else if (options.scope === 'selected_track') {
        if (options.selectedTrackId && track.id === options.selectedTrackId) {
          targeted.add(clip.id);
        }
      } else if (options.scope === 'selected') {
        const hasSelectedNotesInClip = (noteMap[clip.id]?.length ?? 0) > 0;
        if (options.selectedClipIds.includes(clip.id) || hasSelectedNotesInClip) {
          targeted.add(clip.id);
        }
      }
    }
  }

  return targeted;
}

export function quantizeMidiTracks(tracks: Track[], options: MidiQuantizeOptions): MidiQuantizeResult {
  const {
    grid,
    swingPercent,
    strengthPercent = 100,
    scope,
    selectedClipIds,
    selectedNoteIdsByClip = {},
    selectedTrackId,
    quantizeClipStarts = true,
    quantizeNoteLengths = false,
    tempo,
    totalBars = 16
  } = options;

  const targetClipIds = resolveTargetClipIds(tracks, {
    scope,
    selectedClipIds,
    selectedNoteIdsByClip,
    selectedTrackId
  });

  if (targetClipIds.size === 0) {
    return {
      tracks,
      quantizedClipCount: 0,
      quantizedNoteCount: 0,
      avgAbsShiftMs: 0
    };
  }

  const secPerBar = (60 / Math.max(30, tempo || 120)) * 4;
  const gridBars = getGridBars(grid);
  let quantizedClipCount = 0;
  let quantizedNoteCount = 0;
  let totalAbsShiftMs = 0;

  const updatedTracks = tracks.map(track => {
    let trackChanged = false;
    const nextClips = track.clips.map(clip => {
      if (!targetClipIds.has(clip.id)) return clip;

      const baseline = ensureBaseline(clip);
      const explicitNoteIds = selectedNoteIdsByClip[clip.id];
      const hasNoteFilter = Array.isArray(explicitNoteIds) && explicitNoteIds.length > 0;
      const targetNoteSet = hasNoteFilter ? new Set(explicitNoteIds) : null;

      // Only snap clip.startBar when quantizeClipStarts is on AND user isn't targeting a specific subset of notes inside an unselected clip
      const shouldSnapClipStart = quantizeClipStarts && (!hasNoteFilter || selectedClipIds.includes(clip.id));
      const maxClipStart = Math.max(0, totalBars - clip.durationBars);
      const nextClipStartBar = shouldSnapClipStart
        ? Math.max(0, Math.min(maxClipStart, quantizeBarWithSwing(baseline.clipStartBar, grid, swingPercent, strengthPercent)))
        : clip.startBar;

      const sourceNotes = baseline.notes;
      const noteSourceById = new Map(sourceNotes.map(n => [n.id, n]));

      const nextNotes = (clip.midiNotes || []).map(currentNote => {
        const origNote = noteSourceById.get(currentNote.id) || currentNote;
        if (targetNoteSet && !targetNoteSet.has(currentNote.id)) {
          return currentNote;
        }

        // Quantize in absolute timeline bar coordinates so off-beat swing aligns with the project bar groove
        const origAbsStart = baseline.clipStartBar + origNote.startBar;
        const quantizedAbs = quantizeBarWithSwing(origAbsStart, grid, swingPercent, strengthPercent);
        const minRemain = 0.03125;
        const relStart = Math.max(0, Math.min(Math.max(0, clip.durationBars - minRemain), quantizedAbs - nextClipStartBar));

        const nextDurationBars = quantizeNoteLengths
          ? Math.max(minRemain, Number((Math.max(1, Math.round(origNote.durationBars / gridBars)) * gridBars).toFixed(4)))
          : origNote.durationBars;

        const absShiftBars = Math.abs(relStart - currentNote.startBar);
        totalAbsShiftMs += absShiftBars * secPerBar * 1000;
        quantizedNoteCount += 1;

        return {
          ...currentNote,
          startBar: Number(relStart.toFixed(4)),
          startTimeSeconds: Number((relStart * secPerBar).toFixed(4)),
          durationBars: nextDurationBars,
          durationSeconds: Number((nextDurationBars * secPerBar).toFixed(4))
        };
      });

      quantizedClipCount += 1;
      trackChanged = true;

      return {
        ...clip,
        startBar: Number(nextClipStartBar.toFixed(4)),
        midiNotes: clip.midiNotes ? nextNotes : clip.midiNotes
      };
    });

    return trackChanged ? { ...track, clips: nextClips } : track;
  });

  return {
    tracks: updatedTracks,
    quantizedClipCount,
    quantizedNoteCount,
    avgAbsShiftMs: quantizedNoteCount > 0 ? Number((totalAbsShiftMs / quantizedNoteCount).toFixed(1)) : 0
  };
}

export function restoreOriginalMidiTiming(
  tracks: Track[],
  clipIdsToRestore: string[],
  tempo: number
): { tracks: Track[]; restoredCount: number } {
  const restoreSet = new Set(clipIdsToRestore);
  const secPerBar = (60 / Math.max(30, tempo || 120)) * 4;
  let restoredCount = 0;

  const updatedTracks = tracks.map(track => {
    let changed = false;
    const nextClips = track.clips.map(clip => {
      if (!restoreSet.has(clip.id)) return clip;
      const baseline = originBaselineCache.get(clip.id);
      if (!baseline) return clip;

      restoredCount += 1;
      changed = true;
      const restoredById = new Map(baseline.notes.map(n => [n.id, n]));

      return {
        ...clip,
        startBar: baseline.clipStartBar,
        midiNotes: clip.midiNotes?.map(n => {
          const orig = restoredById.get(n.id);
          if (!orig) return n;
          return {
            ...orig,
            startTimeSeconds: Number((orig.startBar * secPerBar).toFixed(4)),
            durationSeconds: Number((orig.durationBars * secPerBar).toFixed(4))
          };
        })
      };
    });
    return changed ? { ...track, clips: nextClips } : track;
  });

  return { tracks: updatedTracks, restoredCount };
}
