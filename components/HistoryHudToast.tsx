// Strangelet Lab - Action & History HUD Toast
// Subtly broadcasts Undo/Redo & Auto-Save actions directly in viewport

import React, { useState, useEffect } from 'react';
import { Undo2, Redo2, Save, CheckCircle2 } from 'lucide-react';
import { projectHistory } from '../services/projectHistoryService';
import { projectAutoSave } from '../services/projectAutoSaveService';

export const HistoryHudToast: React.FC = () => {
  const [toast, setToast] = useState<{
    id: string;
    message: string;
    type: 'undo' | 'redo' | 'save' | 'record';
    timestamp: number;
  } | null>(null);

  useEffect(() => {
    // Listen for history undo/redo
    const unsubscribeHistory = projectHistory.subscribeToast(({ action, type }) => {
      setToast({
        id: `toast-${Date.now()}`,
        message: type === 'undo' ? `Undone: ${action}` : type === 'redo' ? `Redone: ${action}` : action,
        type,
        timestamp: Date.now()
      });
    });

    // Listen for auto-save and manual snapshot saves
    const unsubscribeAutoSave = projectAutoSave.subscribe((payload) => {
      const label = payload.source === 'manual' ? 'Project snapshot saved' : 'Project auto-saved';
      setToast({
        id: `toast-${Date.now()}`,
        message: `${label} (${payload.trackCount} tracks, ${payload.tempo} BPM)`,
        type: 'save',
        timestamp: Date.now()
      });
    });

    return () => {
      unsubscribeHistory();
      unsubscribeAutoSave();
    };
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 2600);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-bounce-in">
      <div className={`px-4 py-2 rounded-xl flex items-center gap-2.5 font-mono text-xs font-bold border backdrop-blur-xl shadow-2xl ${
        toast.type === 'undo'
          ? 'bg-[#06121E]/95 border-[#00F0FF]/60 text-[#00F0FF] shadow-[0_0_25px_rgba(0,240,255,0.35)]'
          : toast.type === 'redo'
          ? 'bg-[#181406]/95 border-[#FFD700]/60 text-[#FFD700] shadow-[0_0_25px_rgba(255,215,0,0.35)]'
          : 'bg-[#061810]/95 border-emerald-500/60 text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.35)]'
      }`}>
        {toast.type === 'undo' && <Undo2 size={15} className="text-[#00F0FF] shrink-0" />}
        {toast.type === 'redo' && <Redo2 size={15} className="text-[#FFD700] shrink-0" />}
        {toast.type === 'save' && <Save size={15} className="text-emerald-400 shrink-0" />}
        <span className="tracking-wide">{toast.message}</span>
      </div>
    </div>
  );
};
