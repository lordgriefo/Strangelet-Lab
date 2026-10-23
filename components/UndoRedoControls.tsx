// Strangelet Lab - Undo / Redo Toolbar Controls
// Provides 1-click revert/redo with visual tooltips, action names, and keyboard shortcuts

import React, { useState, useEffect } from 'react';
import { Undo2, Redo2, History } from 'lucide-react';
import { projectHistory } from '../services/projectHistoryService';

interface UndoRedoControlsProps {
  onUndo: () => void;
  onRedo: () => void;
  className?: string;
  variant?: 'compact' | 'standard' | 'full';
}

export const UndoRedoControls: React.FC<UndoRedoControlsProps> = ({
  onUndo,
  onRedo,
  className = '',
  variant = 'standard'
}) => {
  const [canUndo, setCanUndo] = useState<boolean>(projectHistory.canUndo());
  const [canRedo, setCanRedo] = useState<boolean>(projectHistory.canRedo());
  const [undoAction, setUndoAction] = useState<string | null>(projectHistory.getUndoAction());
  const [redoAction, setRedoAction] = useState<string | null>(projectHistory.getRedoAction());
  const [counts, setCounts] = useState<{ undoCount: number; redoCount: number }>(projectHistory.getHistoryCount());

  useEffect(() => {
    const update = () => {
      setCanUndo(projectHistory.canUndo());
      setCanRedo(projectHistory.canRedo());
      setUndoAction(projectHistory.getUndoAction());
      setRedoAction(projectHistory.getRedoAction());
      setCounts(projectHistory.getHistoryCount());
    };

    update();
    const unsubscribe = projectHistory.subscribe(update);
    return unsubscribe;
  }, []);

  const isCompact = variant === 'compact';

  return (
    <div 
      className={`flex items-center bg-[#070A11] border border-[#1E293B] rounded-lg p-0.5 gap-0.5 shadow-inner select-none ${className}`}
      title="Project History & Operation Revert System (Ctrl+Z / Ctrl+Y)"
    >
      {/* Undo Button */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono font-bold transition-all ${
          canUndo
            ? 'text-[#00F0FF] hover:bg-[#00F0FF]/15 hover:border-[#00F0FF]/40 border border-transparent cursor-pointer active:scale-95 shadow-[0_0_8px_rgba(0,240,255,0.2)]'
            : 'text-[#475569] border border-transparent opacity-40 cursor-not-allowed'
        }`}
        title={canUndo ? `Undo: ${undoAction || 'Last Action'} (Ctrl+Z)` : 'Nothing to undo (Ctrl+Z)'}
      >
        <Undo2 size={13} className={canUndo ? 'text-[#00F0FF]' : 'text-[#475569]'} />
        {!isCompact && (
          <span className="text-[11px] tracking-wide">
            Undo
          </span>
        )}
        {canUndo && counts.undoCount > 0 && (
          <span className="text-[9px] px-1 py-0.2 rounded bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/30 font-mono">
            {counts.undoCount}
          </span>
        )}
      </button>

      {/* Redo Button */}
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono font-bold transition-all ${
          canRedo
            ? 'text-[#FFD700] hover:bg-[#FFD700]/15 hover:border-[#FFD700]/40 border border-transparent cursor-pointer active:scale-95 shadow-[0_0_8px_rgba(255,215,0,0.2)]'
            : 'text-[#475569] border border-transparent opacity-40 cursor-not-allowed'
        }`}
        title={canRedo ? `Redo: ${redoAction || 'Last Reverted Action'} (Ctrl+Y or Ctrl+Shift+Z)` : 'Nothing to redo (Ctrl+Y)'}
      >
        <Redo2 size={13} className={canRedo ? 'text-[#FFD700]' : 'text-[#475569]'} />
        {!isCompact && (
          <span className="text-[11px] tracking-wide">
            Redo
          </span>
        )}
        {canRedo && counts.redoCount > 0 && (
          <span className="text-[9px] px-1 py-0.2 rounded bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30 font-mono">
            {counts.redoCount}
          </span>
        )}
      </button>
    </div>
  );
};
