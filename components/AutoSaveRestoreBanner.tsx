// Strangelet Lab - Auto-Save Restoration Banner
// Notifies users when an offline/auto-saved project snapshot is detected in localStorage

import React from 'react';
import { RotateCcw, X, Clock, ShieldCheck, Sparkles } from 'lucide-react';
import { AutoSaveMetadata } from '../services/projectAutoSaveService';

interface AutoSaveRestoreBannerProps {
  metadata: AutoSaveMetadata;
  onRestore: () => void;
  onDismiss: () => void;
}

export const AutoSaveRestoreBanner: React.FC<AutoSaveRestoreBannerProps> = ({
  metadata,
  onRestore,
  onDismiss
}) => {
  return (
    <div className="w-full bg-gradient-to-r from-[#0C1527] via-[#0E1E36] to-[#0C1527] border-b border-[#00F0FF]/40 px-4 py-2 flex items-center justify-between shadow-[0_4px_20px_rgba(0,240,255,0.15)] z-40 animate-fade-in font-mono">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-[#00F0FF]/15 border border-[#00F0FF]/50 flex items-center justify-center text-[#00F0FF] shrink-0">
          <ShieldCheck size={16} />
        </div>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs">
          <span className="text-[#E2E8F0] font-bold tracking-tight">
            Auto-Saved Project Available:
          </span>
          <span className="text-[#00F0FF] font-semibold">
            &ldquo;{metadata.sessionName}&rdquo;
          </span>
          <span className="text-[#94A3B8] text-[11px]">
            ({metadata.trackCount} tracks • {metadata.bpm} BPM • saved {metadata.relativeTime})
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onRestore}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-gradient-to-r from-[#00F0FF] to-[#38BDF8] text-black text-xs font-bold shadow-[0_0_12px_rgba(0,240,255,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
        >
          <RotateCcw size={12} />
          <span>Restore Session</span>
        </button>
        <button
          onClick={onDismiss}
          className="p-1 rounded text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Dismiss banner"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
