import React, { useMemo, useState } from 'react';
import { Track } from '../types';
import {
  MidiQuantizeGrid,
  MidiQuantizeScope,
  getGridBars,
  getSwingFeelInfo,
  hasBaselineForClips,
  isMidiClipOnTrack,
  previewQuantizeBarWithSwing,
  resolveTargetClipIds
} from '../services/midiQuantizeService';
import {
  Magnet,
  X,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronRight,
  Music,
  SlidersHorizontal,
  Plus
} from 'lucide-react';

interface MidiQuantizePanelProps {
  tracks: Track[];
  tempo: number;
  selectedTrackId: string | null;
  grid: MidiQuantizeGrid;
  swingPercent: number;
  strengthPercent: number;
  scope: MidiQuantizeScope;
  selectedClipIds: string[];
  selectedNoteIdsByClip: Record<string, string[]>;
  quantizeClipStarts: boolean;
  quantizeNoteLengths: boolean;
  livePreview: boolean;
  lastSummary: string | null;
  onGridChange: (grid: MidiQuantizeGrid) => void;
  onSwingChange: (swing: number) => void;
  onStrengthChange: (strength: number) => void;
  onScopeChange: (scope: MidiQuantizeScope) => void;
  onToggleClipSelection: (clipId: string) => void;
  onSelectAllMidiClips: () => void;
  onClearClipSelection: () => void;
  onSetNoteSelectionForClip: (clipId: string, noteIds: string[]) => void;
  onToggleQuantizeClipStarts: (val: boolean) => void;
  onToggleQuantizeNoteLengths: (val: boolean) => void;
  onToggleLivePreview: (val: boolean) => void;
  onApplyQuantize: () => void;
  onRestoreOriginal: () => void;
  onCreateSampleMidiTrack: () => void;
  onClose: () => void;
}

const GRID_OPTIONS: MidiQuantizeGrid[] = ['1/4', '1/8', '1/16', '1/32'];

const SWING_PRESETS = [
  { label: '0% Straight', value: 0 },
  { label: '33% Pocket', value: 33 },
  { label: '66% MPC', value: 66 },
  { label: '79% Triplet', value: 79 },
  { label: '100% Shuffle', value: 100 }
];

const MidiQuantizePanel: React.FC<MidiQuantizePanelProps> = ({
  tracks,
  tempo,
  selectedTrackId,
  grid,
  swingPercent,
  strengthPercent,
  scope,
  selectedClipIds,
  selectedNoteIdsByClip,
  quantizeClipStarts,
  quantizeNoteLengths,
  livePreview,
  lastSummary,
  onGridChange,
  onSwingChange,
  onStrengthChange,
  onScopeChange,
  onToggleClipSelection,
  onSelectAllMidiClips,
  onClearClipSelection,
  onSetNoteSelectionForClip,
  onToggleQuantizeClipStarts,
  onToggleQuantizeNoteLengths,
  onToggleLivePreview,
  onApplyQuantize,
  onRestoreOriginal,
  onCreateSampleMidiTrack,
  onClose
}) => {
  const [expandedClipIds, setExpandedClipIds] = useState<string[]>([]);

  const midiClipEntries = useMemo(() => {
    const entries: { track: Track; clip: Track['clips'][number] }[] = [];
    tracks.forEach(track => {
      track.clips.forEach(clip => {
        if (isMidiClipOnTrack(clip, track)) {
          entries.push({ track, clip });
        }
      });
    });
    return entries;
  }, [tracks]);

  const targetedClipIds = useMemo(
    () =>
      resolveTargetClipIds(tracks, {
        scope,
        selectedClipIds,
        selectedNoteIdsByClip,
        selectedTrackId
      }),
    [tracks, scope, selectedClipIds, selectedNoteIdsByClip, selectedTrackId]
  );

  const targetedStats = useMemo(() => {
    let notesCount = 0;
    midiClipEntries.forEach(({ clip }) => {
      if (!targetedClipIds.has(clip.id)) return;
      const customNoteSel = selectedNoteIdsByClip[clip.id];
      if (customNoteSel && customNoteSel.length > 0) {
        notesCount += customNoteSel.length;
      } else {
        notesCount += clip.midiNotes?.length ?? 0;
      }
    });
    return {
      clipCount: targetedClipIds.size,
      noteCount: notesCount
    };
  }, [midiClipEntries, targetedClipIds, selectedNoteIdsByClip]);

  const canRestore = useMemo(
    () => hasBaselineForClips(Array.from(targetedClipIds)),
    [targetedClipIds, tracks]
  );

  const swingFeel = useMemo(() => getSwingFeelInfo(swingPercent), [swingPercent]);
  const secPerBar = (60 / Math.max(30, tempo || 120)) * 4;

  // 1-bar groove lattice preview points (up to 16 steps for visual legibility)
  const previewSteps = useMemo(() => {
    const gridBars = getGridBars(grid);
    const totalSteps = Math.min(16, Math.round(1 / gridBars));
    const displaySpan = totalSteps * gridBars;
    return Array.from({ length: totalSteps }).map((_, idx) => {
      const straightBar = idx * gridBars;
      const q = previewQuantizeBarWithSwing(straightBar, grid, swingPercent, strengthPercent);
      return {
        idx,
        straightPct: (straightBar / displaySpan) * 100,
        swungPct: Math.min(98, (q.quantizedBar / displaySpan) * 100),
        isOffBeat: q.isOffBeat
      };
    });
  }, [grid, swingPercent, strengthPercent]);

  const toggleExpandClip = (clipId: string) => {
    setExpandedClipIds(prev =>
      prev.includes(clipId) ? prev.filter(id => id !== clipId) : [...prev, clipId]
    );
  };

  return (
    <section
      aria-label="Global MIDI Quantize Console"
      className="mb-2.5 bg-[#070B14] border border-[#25324C] rounded-xl p-3 shadow-lg shrink-0"
    >
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[#1A243A]">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-white font-mono text-xs font-bold tracking-wide whitespace-nowrap shrink-0">
            <Magnet size={14} className="text-[#10B981]" />
            <span>GLOBAL MIDI QUANTIZE</span>
          </div>
          <span className="text-[10px] font-mono tabular-nums text-[#94A3B8] bg-[#0C1220] border border-[#1E293B] px-2 py-0.5 rounded whitespace-nowrap shrink-0">
            TARGET: {targetedStats.clipCount} clip{targetedStats.clipCount === 1 ? '' : 's'} · {targetedStats.noteCount} note{targetedStats.noteCount === 1 ? '' : 's'}
          </span>
          {lastSummary && (
            <span className="text-[10px] font-mono tabular-nums text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/30 px-2 py-0.5 rounded whitespace-nowrap shrink-0">
              {lastSummary}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label className="flex items-center gap-1.5 text-[10px] font-mono text-[#CBD5E1] cursor-pointer select-none whitespace-nowrap shrink-0">
            <input
              type="checkbox"
              checked={livePreview}
              onChange={(e) => onToggleLivePreview(e.target.checked)}
              className="accent-[#10B981] cursor-pointer"
            />
            <span>Live Groove Update</span>
          </label>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors cursor-pointer"
            title="Close MIDI Quantize Panel"
            aria-label="Close MIDI Quantize Panel"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Main Controls Row */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-start">
        {/* Left: Grid, Swing, Strength & Groove Lattice */}
        <div className="xl:col-span-7 flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-3">
            {/* Grid Division Selector */}
            <div className="flex items-center gap-1.5 bg-[#04070D] border border-[#1E293B] rounded-lg p-1 shrink-0">
              <span className="text-[10px] font-mono font-bold text-[#94A3B8] px-1.5 whitespace-nowrap shrink-0">
                GRID
              </span>
              {GRID_OPTIONS.map(option => {
                const active = grid === option;
                return (
                  <button
                    key={option}
                    onClick={() => onGridChange(option)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold tabular-nums transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#10B981] text-black'
                        : 'text-[#94A3B8] hover:text-white hover:bg-[#151F33]'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {/* Scope Selector */}
            <div className="flex items-center gap-1 bg-[#04070D] border border-[#1E293B] rounded-lg p-1 shrink-0">
              <span className="text-[10px] font-mono font-bold text-[#94A3B8] px-1.5 whitespace-nowrap shrink-0">
                SCOPE
              </span>
              {(
                [
                  { id: 'selected', label: 'Selected Clips / Notes' },
                  { id: 'selected_track', label: 'Active Track' },
                  { id: 'all_midi', label: 'All MIDI' }
                ] as const
              ).map(item => {
                const active = scope === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onScopeChange(item.id)}
                    className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#FF8C00] text-black'
                        : 'text-[#94A3B8] hover:text-white hover:bg-[#151F33]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Swing & Strength Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 bg-[#04070D] border border-[#1E293B] rounded-lg p-2.5">
            {/* Swing Percentage */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono font-bold text-[#CBD5E1] uppercase tracking-wider">
                  Swing Humanize
                </span>
                <span className="text-[11px] font-mono font-bold tabular-nums text-[#FF8C00]">
                  {swingPercent}% · {swingFeel.ratioText} ({swingFeel.label})
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={swingPercent}
                onChange={(e) => onSwingChange(Number(e.target.value))}
                className="w-full accent-[#FF8C00] cursor-pointer"
                aria-label="MIDI Quantize Swing Percentage"
              />
              <div className="flex flex-wrap items-center gap-1">
                {SWING_PRESETS.map(preset => (
                  <button
                    key={preset.value}
                    onClick={() => onSwingChange(preset.value)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono tabular-nums transition-colors cursor-pointer whitespace-nowrap shrink-0 border ${
                      swingPercent === preset.value
                        ? 'bg-[#FF8C00]/20 border-[#FF8C00] text-[#FFD700]'
                        : 'bg-[#0C1220] border-[#1E293B] text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Strength & Options */}
            <div className="flex flex-col justify-between gap-2">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold text-[#CBD5E1] uppercase tracking-wider">
                    Quantize Strength
                  </span>
                  <span className="text-[11px] font-mono font-bold tabular-nums text-[#10B981]">
                    {strengthPercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={strengthPercent}
                  onChange={(e) => onStrengthChange(Number(e.target.value))}
                  className="w-full accent-[#10B981] cursor-pointer"
                  aria-label="MIDI Quantize Strength Percentage"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <label className="flex items-center gap-1.5 text-[10px] font-mono text-[#CBD5E1] cursor-pointer select-none whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={quantizeClipStarts}
                    onChange={(e) => onToggleQuantizeClipStarts(e.target.checked)}
                    className="accent-[#10B981] cursor-pointer"
                  />
                  <span>Snap Clip Starts</span>
                </label>
                <label className="flex items-center gap-1.5 text-[10px] font-mono text-[#CBD5E1] cursor-pointer select-none whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={quantizeNoteLengths}
                    onChange={(e) => onToggleQuantizeNoteLengths(e.target.checked)}
                    className="accent-[#10B981] cursor-pointer"
                  />
                  <span>Quantize Note Lengths</span>
                </label>
              </div>
            </div>
          </div>

          {/* 1-Bar Swing Lattice Visualizer + Primary Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#04070D] border border-[#1E293B] rounded-lg px-3 py-2">
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center justify-between text-[9px] font-mono text-[#64748B] mb-1">
                <span>GROOVE LATTICE ({grid} GRID)</span>
                <span className="tabular-nums">
                  STEP {(getGridBars(grid) * secPerBar * 1000).toFixed(0)}ms · OFF-BEAT SHIFT +{((swingPercent / 100) * getGridBars(grid) * 0.42 * secPerBar * 1000).toFixed(1)}ms
                </span>
              </div>
              <div className="relative h-4 bg-[#0B111E] rounded border border-[#1E293B] overflow-hidden">
                {previewSteps.map(step => (
                  <React.Fragment key={step.idx}>
                    {/* Straight Grid Ghost Tick */}
                    <div
                      className="absolute top-0 bottom-0 w-px bg-[#334155]"
                      style={{ left: `${step.straightPct}%` }}
                    />
                    {/* Active Quantized Marker */}
                    <div
                      className={`absolute top-1 w-1.5 h-2 rounded-xs -translate-x-1/2 transition-all ${
                        step.isOffBeat ? 'bg-[#FF8C00]' : 'bg-[#10B981]'
                      }`}
                      style={{ left: `${step.swungPct}%` }}
                      title={
                        step.isOffBeat
                          ? `Off-beat step ${step.idx + 1} (Swing ${swingPercent}%)`
                          : `Downbeat step ${step.idx + 1}`
                      }
                    />
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onRestoreOriginal}
                disabled={!canRestore}
                className="px-2.5 py-1.5 rounded-lg border border-[#334155] bg-[#0D1322] text-[#CBD5E1] hover:text-white hover:border-[#64748B] disabled:opacity-35 disabled:pointer-events-none text-[10px] font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title="Restore original unquantized timing from baseline"
              >
                <RotateCcw size={12} />
                <span>Restore Original</span>
              </button>

              <button
                onClick={onApplyQuantize}
                disabled={targetedStats.clipCount === 0}
                className="px-3.5 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#34D399] disabled:opacity-35 disabled:pointer-events-none text-black text-[11px] font-mono font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title="Quantize targeted MIDI clips and notes using current grid & swing"
              >
                <Check size={13} />
                <span>Apply MIDI Quantize</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Interactive MIDI Clip & Note Selector */}
        <div className="xl:col-span-5 bg-[#04070D] border border-[#1E293B] rounded-lg p-2.5 flex flex-col gap-2 max-h-56 overflow-hidden">
          <div className="flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#CBD5E1]">
              <SlidersHorizontal size={11} className="text-[#10B981]" />
              <span>MIDI CLIPS & NOTES ({midiClipEntries.length})</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onSelectAllMidiClips}
                disabled={midiClipEntries.length === 0}
                className="px-1.5 py-0.5 rounded bg-[#0E1628] border border-[#1E293B] text-[9px] font-mono text-[#CBD5E1] hover:text-white disabled:opacity-35 cursor-pointer whitespace-nowrap"
              >
                Select All
              </button>
              <button
                onClick={onClearClipSelection}
                disabled={selectedClipIds.length === 0}
                className="px-1.5 py-0.5 rounded bg-[#0E1628] border border-[#1E293B] text-[9px] font-mono text-[#94A3B8] hover:text-white disabled:opacity-35 cursor-pointer whitespace-nowrap"
              >
                Clear
              </button>
            </div>
          </div>

          {midiClipEntries.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-5 gap-2">
              <Music size={18} className="text-[#64748B]" />
              <p className="text-[11px] font-mono text-[#94A3B8]">
                No MIDI clips in the arrangement yet.
              </p>
              <button
                onClick={onCreateSampleMidiTrack}
                className="px-2.5 py-1 rounded bg-[#10B981]/15 border border-[#10B981]/50 text-[#10B981] hover:bg-[#10B981] hover:text-black text-[10px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus size={11} />
                <span>Add Quantizable MIDI Groove Track</span>
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {midiClipEntries.map(({ track, clip }) => {
                const isClipSelected = selectedClipIds.includes(clip.id);
                const isTargeted = targetedClipIds.has(clip.id);
                const isExpanded = expandedClipIds.includes(clip.id);
                const notes = clip.midiNotes || [];
                const selectedNotesForClip = selectedNoteIdsByClip[clip.id] || [];

                return (
                  <div
                    key={clip.id}
                    className={`rounded border transition-colors ${
                      isTargeted
                        ? 'bg-[#0A1815] border-[#10B981]/60'
                        : 'bg-[#090E1A] border-[#1E293B]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 px-2 py-1.5 text-[10px] font-mono">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isClipSelected}
                          onChange={() => onToggleClipSelection(clip.id)}
                          className="accent-[#10B981] cursor-pointer shrink-0"
                          title={`Select clip ${clip.name} for quantization`}
                        />
                        <button
                          onClick={() => toggleExpandClip(clip.id)}
                          className="text-[#94A3B8] hover:text-white cursor-pointer shrink-0"
                          title="Expand individual MIDI notes"
                        >
                          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </button>
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: track.color || '#10B981' }}
                        />
                        <span className="text-white font-semibold truncate" title={`${track.name}: ${clip.name}`}>
                          {clip.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 tabular-nums text-[9px] text-[#94A3B8]">
                        <span>{clip.startBar.toFixed(2)}b</span>
                        <span className="px-1 py-0.5 rounded bg-[#050811] border border-[#1E293B] text-[#CBD5E1]">
                          {selectedNotesForClip.length > 0
                            ? `${selectedNotesForClip.length}/${notes.length} notes`
                            : `${notes.length} notes`}
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-[#1A243A] bg-[#050811] px-2 py-1.5 space-y-1">
                        <div className="flex items-center justify-between gap-2 pb-1">
                          <span className="text-[9px] font-mono text-[#64748B]">
                            Note-level target (empty = whole clip)
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onSetNoteSelectionForClip(clip.id, notes.map(n => n.id))}
                              className="px-1.5 py-0.5 rounded bg-[#0E1628] text-[9px] font-mono text-[#10B981] hover:bg-[#15223D] cursor-pointer"
                            >
                              All
                            </button>
                            <button
                              onClick={() =>
                                onSetNoteSelectionForClip(
                                  clip.id,
                                  notes
                                    .filter(n => previewQuantizeBarWithSwing(clip.startBar + n.startBar, grid, swingPercent).isOffBeat)
                                    .map(n => n.id)
                                )
                              }
                              className="px-1.5 py-0.5 rounded bg-[#0E1628] text-[9px] font-mono text-[#FF8C00] hover:bg-[#15223D] cursor-pointer"
                            >
                              Off-Beats
                            </button>
                            <button
                              onClick={() => onSetNoteSelectionForClip(clip.id, [])}
                              className="px-1.5 py-0.5 rounded bg-[#0E1628] text-[9px] font-mono text-[#94A3B8] hover:bg-[#15223D] cursor-pointer"
                            >
                              Whole Clip
                            </button>
                          </div>
                        </div>

                        {notes.length === 0 ? (
                          <div className="text-[9px] font-mono text-[#64748B] py-1">
                            No note events inside clip (clip start will still snap to grid).
                          </div>
                        ) : (
                          <div className="max-h-24 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1 pr-0.5">
                            {notes.slice(0, 64).map(note => {
                              const checked = selectedNotesForClip.includes(note.id);
                              const preview = previewQuantizeBarWithSwing(
                                clip.startBar + note.startBar,
                                grid,
                                swingPercent,
                                strengthPercent
                              );
                              const targetRel = Math.max(0, preview.quantizedBar - clip.startBar);
                              return (
                                <label
                                  key={note.id}
                                  className={`flex items-center justify-between gap-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono tabular-nums cursor-pointer border ${
                                    checked
                                      ? 'bg-[#10B981]/15 border-[#10B981]/50 text-white'
                                      : 'bg-[#090E1A] border-[#1E293B]/70 text-[#94A3B8] hover:text-white'
                                  }`}
                                >
                                  <span className="flex items-center gap-1 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => {
                                        const next = checked
                                          ? selectedNotesForClip.filter(id => id !== note.id)
                                          : [...selectedNotesForClip, note.id];
                                        onSetNoteSelectionForClip(clip.id, next);
                                      }}
                                      className="accent-[#10B981] cursor-pointer"
                                    />
                                    <span className="font-bold text-[#CBD5E1]">{note.noteName}</span>
                                  </span>
                                  <span>
                                    {note.startBar.toFixed(2)}→{targetRel.toFixed(2)}b
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default MidiQuantizePanel;
