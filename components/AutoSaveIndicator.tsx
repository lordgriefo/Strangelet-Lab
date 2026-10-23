// Strangelet Lab - 60-Second Background Auto-Save Status & Control Pill
// Displays real-time auto-save health, countdown, and instant manual save / restore triggers

import React, { useState, useEffect, useRef } from 'react';
import { Save, CheckCircle2, RotateCcw, Trash2, Clock, ChevronDown, Sparkles } from 'lucide-react';
import { projectAutoSave, AutoSaveMetadata } from '../services/projectAutoSaveService';

interface AutoSaveIndicatorProps {
  onManualSave: () => void;
  onRestoreAutoSave: () => void;
  lastSavedTimestamp: number | null;
  className?: string;
}

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  onManualSave,
  onRestoreAutoSave,
  lastSavedTimestamp,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [timeAgo, setTimeAgo] = useState<string>('Just now');
  const [justSaved, setJustSaved] = useState<boolean>(false);
  const [metadata, setMetadata] = useState<AutoSaveMetadata | null>(projectAutoSave.getMetadata());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update relative time readout every 5 seconds
  useEffect(() => {
    const updateRelative = () => {
      if (!lastSavedTimestamp) {
        setTimeAgo('Pending');
        return;
      }
      const diffMs = Date.now() - lastSavedTimestamp;
      if (diffMs < 5000) {
        setTimeAgo('Just now');
      } else if (diffMs < 60000) {
        setTimeAgo(`${Math.floor(diffMs / 1000)}s ago`);
      } else {
        const mins = Math.floor(diffMs / 60000);
        setTimeAgo(`${mins}m ago`);
      }
      setMetadata(projectAutoSave.getMetadata());
    };

    updateRelative();
    const interval = setInterval(updateRelative, 5000);
    return () => clearInterval(interval);
  }, [lastSavedTimestamp]);

  // Flash save animation when lastSavedTimestamp changes
  useEffect(() => {
    if (lastSavedTimestamp) {
      setJustSaved(true);
      const timer = setTimeout(() => setJustSaved(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [lastSavedTimestamp]);

  const handleManualSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onManualSave();
    setIsOpen(false);
  };

  const handleRestoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRestoreAutoSave();
    setIsOpen(false);
  };

  const handleClearClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    projectAutoSave.clear();
    setMetadata(null);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-mono transition-all select-none cursor-pointer ${
          justSaved
            ? 'bg-emerald-950/70 border-emerald-500/70 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
            : 'bg-[#0E121B] hover:bg-[#151C2C] border-[#222E48] hover:border-[#38BDF8]/50 text-[#8C9BBF] hover:text-[#E2E8F0]'
        }`}
        title={`Auto-Save Interval: 60s (Last saved: ${timeAgo}). Click for options.`}
      >
        <span className="relative flex h-2 w-2">
          {justSaved && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${
            justSaved ? 'bg-emerald-400' : 'bg-emerald-500/80'
          }`} />
        </span>

        <span className="text-[11px] font-bold tracking-tight hidden sm:inline">
          {justSaved ? 'SAVED' : 'AUTOSAVE'}
        </span>
        <span className="text-[10px] text-[#64748B] font-normal">
          {timeAgo}
        </span>

        <ChevronDown size={11} className={`text-[#64748B] transition-transform ${isOpen ? 'rotate-180 text-cyan-400' : ''}`} />
      </button>

      {/* Auto-Save Menu Drawer */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-64 bg-[#090D16] border border-[#23314F] rounded-xl shadow-[0_0_35px_rgba(0,0,0,0.9)] backdrop-blur-xl z-50 p-2 font-mono divide-y divide-[#18233C] animate-fade-in">
          <div className="p-1.5">
            <div className="flex items-center justify-between text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider mb-1">
              <span>60-Sec Project Auto-Save</span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-600/40 text-[9px]">
                ACTIVE
              </span>
            </div>
            <p className="text-[10px] text-[#64748B] leading-relaxed">
              Every 60s, your active tracks, arrangement clips, and tempo are written to localStorage.
            </p>
            {metadata && (
              <div className="mt-2 p-1.5 rounded bg-[#04060B] border border-[#18233C] text-[10px] text-[#CBD5E1]">
                <div className="flex justify-between text-[#94A3B8]">
                  <span>Last Saved:</span>
                  <span className="text-emerald-400 font-bold">{metadata.formattedDate}</span>
                </div>
                <div className="flex justify-between text-[#94A3B8] mt-0.5">
                  <span>Project:</span>
                  <span className="text-white truncate max-w-[120px]">{metadata.sessionName}</span>
                </div>
                <div className="flex justify-between text-[#94A3B8] mt-0.5">
                  <span>Contents:</span>
                  <span className="text-[#FF8C00]">{metadata.trackCount} tracks • {metadata.bpm} BPM</span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 flex flex-col gap-1">
            <button
              onClick={handleManualSaveClick}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[#00F0FF] hover:bg-[#00F0FF]/15 border border-[#00F0FF]/30 transition-all font-bold text-left cursor-pointer active:scale-95"
            >
              <Save size={13} className="text-[#00F0FF]" />
              <span>Save Project Now</span>
            </button>

            {metadata && (
              <button
                onClick={handleRestoreClick}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[#FFD700] hover:bg-[#FFD700]/15 border border-[#FFD700]/30 transition-all font-bold text-left cursor-pointer active:scale-95"
              >
                <RotateCcw size={13} className="text-[#FFD700]" />
                <span>Restore Auto-Saved Session</span>
              </button>
            )}

            {metadata && (
              <button
                onClick={handleClearClick}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[#EF4444] hover:bg-red-950/40 border border-transparent hover:border-red-500/30 transition-all text-left cursor-pointer"
              >
                <Trash2 size={13} className="text-[#EF4444]" />
                <span>Clear Auto-Saved Snapshot</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
