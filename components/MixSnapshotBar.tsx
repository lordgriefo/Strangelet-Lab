import React, { useState, useEffect, useRef } from 'react';
import {
  mixSnapshotService,
  MixSnapshotSlot,
  MixABComparisonState
} from '../services/mixSnapshotService';
import { Track } from '../types';
import { playLaserBeamSound } from '../lib/laserSound';
import { Camera, ArrowLeftRight, Trash2, Check, ChevronDown, X, Pencil } from 'lucide-react';

interface MixSnapshotBarProps {
  tracks: Track[];
  masterGain: number;
  tempo: number;
  onApplySnapshot: (slot: number) => void;
  onSaveSnapshot: (slot: number, customName?: string) => void;
  compact?: boolean;
}

const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export const MixSnapshotBar: React.FC<MixSnapshotBarProps> = ({
  onApplySnapshot,
  onSaveSnapshot,
  compact = false
}) => {
  const [slots, setSlots] = useState<Record<number, MixSnapshotSlot | undefined>>(() =>
    mixSnapshotService.getAllSlots()
  );
  const [abState, setAbState] = useState<MixABComparisonState>(() =>
    mixSnapshotService.getABState()
  );
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [isSaveArmed, setIsSaveArmed] = useState<boolean>(false);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [draftName, setDraftName] = useState<string>('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = mixSnapshotService.subscribe(() => {
      setSlots(mixSnapshotService.getAllSlots());
      setAbState(mixSnapshotService.getABState());
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setEditingSlot(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingSlot !== null) {
          setEditingSlot(null);
        } else {
          setIsOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, editingSlot]);

  const handleSlotClick = (slotNum: number) => {
    const existing = slots[slotNum];
    if (isSaveArmed || !existing) {
      onSaveSnapshot(slotNum);
      setActiveSlot(slotNum);
      setIsSaveArmed(false);
    } else {
      onApplySnapshot(slotNum);
      setActiveSlot(slotNum);
    }
  };

  const handleToggleAB = () => {
    const slotA = abState.slotA;
    const slotB = abState.slotB;
    const snapA = slotA ? slots[slotA] : undefined;
    const snapB = slotB ? slots[slotB] : undefined;

    if (!snapA && !snapB) return;

    if (abState.activeSide === 'A' && snapB && slotB) {
      mixSnapshotService.setActiveSide('B');
      onApplySnapshot(slotB);
      setActiveSlot(slotB);
    } else if (snapA && slotA) {
      mixSnapshotService.setActiveSide('A');
      onApplySnapshot(slotA);
      setActiveSlot(slotA);
    } else if (snapB && slotB) {
      mixSnapshotService.setActiveSide('B');
      onApplySnapshot(slotB);
      setActiveSlot(slotB);
    }
  };

  const snapA = abState.slotA ? slots[abState.slotA] : undefined;
  const snapB = abState.slotB ? slots[abState.slotB] : undefined;
  const diff = mixSnapshotService.diffSnapshots(snapA, snapB);
  const canCompare = Boolean(snapA && snapB);
  const savedCount = SLOTS.filter((n) => Boolean(slots[n])).length;

  return (
    <div className="relative inline-flex items-center gap-1" ref={menuRef}>
      {/* Compact Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          playLaserBeamSound('laser_select');
        }}
        className={`rounded-lg font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer border whitespace-nowrap ${
          compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[10px]'
        } ${
          isOpen
            ? 'bg-[#FF8C00] text-black border-[#FFD700] shadow-[0_0_12px_rgba(255,140,0,0.45)]'
            : activeSlot !== null || savedCount > 0
            ? 'bg-[#0C1220] border-[#00F0FF]/50 text-[#E2E8F0] hover:border-[#00F0FF] hover:text-white'
            : 'bg-[#070A11] border-[#1E293B] text-[#94A3B8] hover:border-[#FF8C00]/70 hover:text-white'
        }`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Auto-Mix Snapshot Menu"
        title="Open Auto-Mix Snapshots menu (Save, recall, rename & A/B compare mix states)"
      >
        <Camera size={11} className={isOpen ? 'text-black' : 'text-[#00F0FF]'} />
        <span>SNAPSHOTS</span>
        <span
          className={`text-[9px] tabular-nums px-1 rounded ${
            isOpen
              ? 'bg-black/20 text-black'
              : activeSlot !== null
              ? 'bg-[#00F0FF]/20 text-[#00F0FF]'
              : 'bg-[#121A2B] text-[#94A3B8]'
          }`}
        >
          {activeSlot !== null ? `#${activeSlot}` : `${savedCount}/8`}
        </span>
        <ChevronDown
          size={11}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Instant 1-Click A/B Toggle Pill when A & B are both assigned */}
      {canCompare && (
        <button
          type="button"
          onClick={handleToggleAB}
          className={`rounded-lg font-mono font-bold transition-all flex items-center gap-1 cursor-pointer border whitespace-nowrap ${
            compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]'
          } ${
            abState.activeSide === 'B'
              ? 'bg-[#00F0FF] text-black border-[#00F0FF]'
              : 'bg-[#FF8C00] text-black border-[#FF8C00]'
          }`}
          title={`Instant A/B Compare (Active: ${abState.activeSide} — Slot ${
            abState.activeSide === 'A' ? abState.slotA : abState.slotB
          })`}
        >
          <ArrowLeftRight size={10} />
          <span>{abState.activeSide}</span>
        </button>
      )}

      {/* Dropdown Popover Menu */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1.5 w-[390px] max-w-[92vw] bg-[#070A12] border border-[#26619C] rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.95)] p-3 z-50"
          role="dialog"
          aria-label="Auto-Mix Snapshot Bank"
        >
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b border-[#1E293B]">
            <div className="flex items-center gap-2 min-w-0">
              <Camera size={13} className="text-[#00F0FF] shrink-0" />
              <span className="text-xs font-mono font-bold text-white tracking-wide">
                MIX SNAPSHOTS
              </span>
              <span className="text-[10px] font-mono text-[#64748B]">
                ({savedCount}/8)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsSaveArmed((prev) => !prev);
                  playLaserBeamSound('laser_select');
                }}
                className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold transition-colors flex items-center gap-1 cursor-pointer border ${
                  isSaveArmed
                    ? 'bg-[#FF8C00] text-black border-[#FF8C00]'
                    : 'bg-[#0B0F1A] text-[#CBD5E1] border-[#1E293B] hover:border-[#FF8C00]/70 hover:text-white'
                }`}
                title={
                  isSaveArmed
                    ? 'Save mode armed: click any slot 1–8 to overwrite with current mix'
                    : 'Arm Save Mode to overwrite an existing slot (empty slots always save on click)'
                }
              >
                <Camera size={11} />
                <span>{isSaveArmed ? 'Pick Slot to Save' : 'Save Mode'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setEditingSlot(null);
                }}
                className="p-1 rounded text-[#64748B] hover:text-white hover:bg-[#1E293B]/60 cursor-pointer"
                title="Close Snapshots menu"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* 2-Column Grid of Snapshot Slots 1-8 */}
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {SLOTS.map((slotNum) => {
              const snap = slots[slotNum];
              const isSelected = activeSlot === slotNum;
              const isSlotA = abState.slotA === slotNum;
              const isSlotB = abState.slotB === slotNum;
              const abMarker = isSlotA && isSlotB ? 'A/B' : isSlotA ? 'A' : isSlotB ? 'B' : '';

              if (editingSlot === slotNum && snap) {
                return (
                  <div
                    key={slotNum}
                    className="flex items-center gap-1 bg-[#04060C] border border-[#FF8C00] rounded-lg px-2 py-1.5"
                  >
                    <span className="text-[10px] font-mono text-[#FF8C00] font-bold">
                      {slotNum}
                    </span>
                    <input
                      type="text"
                      value={draftName}
                      autoFocus
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          mixSnapshotService.renameSlot(slotNum, draftName);
                          setEditingSlot(null);
                        } else if (e.key === 'Escape') {
                          e.stopPropagation();
                          setEditingSlot(null);
                        }
                      }}
                      className="flex-1 min-w-0 bg-transparent text-[11px] text-white outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        mixSnapshotService.renameSlot(slotNum, draftName);
                        setEditingSlot(null);
                      }}
                      className="text-[#10B981] hover:text-white cursor-pointer shrink-0"
                      title="Confirm slot name"
                    >
                      <Check size={12} />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={slotNum}
                  className={`group flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg border transition-colors ${
                    isSaveArmed
                      ? 'border-dashed border-[#FF8C00] bg-[#1A1205] hover:bg-[#FF8C00]/20'
                      : snap
                      ? isSelected
                        ? 'border-[#00F0FF] bg-[#0B1F29]'
                        : 'border-[#25324B] bg-[#0C1220] hover:border-[#00F0FF]/60'
                      : 'border-[#1E293B]/80 bg-[#05070E] hover:border-[#334155]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSlotClick(slotNum)}
                    onDoubleClick={() => {
                      if (snap) {
                        setEditingSlot(slotNum);
                        setDraftName(snap.name);
                      }
                    }}
                    className="flex-1 min-w-0 text-left flex items-center gap-1.5 cursor-pointer"
                    title={
                      isSaveArmed
                        ? `Save current mix to Slot ${slotNum}`
                        : snap
                        ? `Recall Slot ${slotNum}: ${snap.name} (${snap.tracks.length} tracks)`
                        : `Slot ${slotNum} empty — Click to capture current mix`
                    }
                  >
                    <span
                      className={`text-[11px] font-mono font-bold tabular-nums shrink-0 ${
                        isSaveArmed
                          ? 'text-[#FF8C00]'
                          : snap
                          ? isSelected
                            ? 'text-[#00F0FF]'
                            : 'text-white'
                          : 'text-[#64748B]'
                      }`}
                    >
                      {slotNum}
                    </span>
                    <span
                      className={`text-[11px] font-mono truncate ${
                        snap ? 'text-[#CBD5E1]' : 'text-[#475569] italic'
                      }`}
                    >
                      {isSaveArmed ? 'Click to Save' : snap ? snap.name : 'Empty'}
                    </span>
                    {snap && abMarker && (
                      <span className="text-[9px] font-mono font-bold px-1 rounded bg-[#FF8C00]/20 text-[#FF8C00] shrink-0">
                        {abMarker}
                      </span>
                    )}
                  </button>

                  {snap && !isSaveArmed && (
                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSlot(slotNum);
                          setDraftName(snap.name);
                        }}
                        className="p-0.5 text-[#64748B] hover:text-[#00F0FF] cursor-pointer"
                        title={`Rename Slot ${slotNum}`}
                      >
                        <Pencil size={10} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          mixSnapshotService.clearSlot(slotNum);
                          if (activeSlot === slotNum) setActiveSlot(null);
                          playLaserBeamSound('laser_erase');
                        }}
                        className="p-0.5 text-[#64748B] hover:text-[#F87171] cursor-pointer"
                        title={`Clear Slot ${slotNum}`}
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* A / B Quick Comparison Footer */}
          <div className="pt-2.5 border-t border-[#1E293B] flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums text-[#94A3B8]">
                <label className="flex items-center gap-1">
                  <span className={abState.activeSide === 'A' && canCompare ? 'text-[#FF8C00] font-bold' : ''}>
                    A:
                  </span>
                  <select
                    value={abState.slotA ?? ''}
                    onChange={(e) =>
                      mixSnapshotService.setABSlot('A', e.target.value ? Number(e.target.value) : null)
                    }
                    className="bg-[#0B0F1A] border border-[#1E293B] rounded px-1.5 py-0.5 text-[11px] text-white outline-none cursor-pointer max-w-[92px]"
                    aria-label="Select A snapshot slot"
                  >
                    <option value="">--</option>
                    {SLOTS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                        {slots[n] ? ` (${slots[n]!.name})` : ' (empty)'}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-1">
                  <span className={abState.activeSide === 'B' && canCompare ? 'text-[#00F0FF] font-bold' : ''}>
                    B:
                  </span>
                  <select
                    value={abState.slotB ?? ''}
                    onChange={(e) =>
                      mixSnapshotService.setABSlot('B', e.target.value ? Number(e.target.value) : null)
                    }
                    className="bg-[#0B0F1A] border border-[#1E293B] rounded px-1.5 py-0.5 text-[11px] text-white outline-none cursor-pointer max-w-[92px]"
                    aria-label="Select B snapshot slot"
                  >
                    <option value="">--</option>
                    {SLOTS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                        {slots[n] ? ` (${slots[n]!.name})` : ' (empty)'}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <button
                type="button"
                onClick={handleToggleAB}
                disabled={!canCompare}
                className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer border disabled:opacity-40 disabled:cursor-not-allowed ${
                  abState.activeSide === 'B' && canCompare
                    ? 'bg-[#00F0FF] text-black border-[#00F0FF]'
                    : 'bg-[#FF8C00] text-black border-[#FF8C00]'
                }`}
                title={
                  canCompare
                    ? `Toggle A/B during playback (Active ${abState.activeSide}: Slot ${
                        abState.activeSide === 'A' ? abState.slotA : abState.slotB
                      })`
                    : 'Save at least two slots and assign A and B to compare'
                }
              >
                <ArrowLeftRight size={11} />
                <span>
                  {canCompare
                    ? `A/B: ${abState.activeSide}`
                    : 'A/B Compare'}
                </span>
              </button>
            </div>

            {diff && (
              <div className="text-[10px] font-mono tabular-nums text-[#94A3B8] flex items-center justify-between">
                <span>A vs B delta:</span>
                <span>
                  {diff.totalDiffs === 0
                    ? 'Identical'
                    : `${diff.volumeDiffs} vol · ${diff.panDiffs} pan · ${diff.fxDiffs} FX`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
