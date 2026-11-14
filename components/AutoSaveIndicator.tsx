// Strangelet Lab - Configurable Background Auto-Save Status & Control Pill
// Displays real-time auto-save state, ON/OFF toggle, interval duration selector, and manual save / restore triggers

import React, { useState, useEffect, useRef } from 'react';
import { Save, RotateCcw, Trash2, Clock, ChevronDown, Power } from 'lucide-react';
import {
  projectAutoSave,
  AutoSaveMetadata,
  AutoSaveSettings,
  AUTOSAVE_INTERVAL_PRESETS,
  MIN_AUTOSAVE_INTERVAL_SEC,
  MAX_AUTOSAVE_INTERVAL_SEC,
  formatAutoSaveInterval
} from '../services/projectAutoSaveService';

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
  const [timeAgo, setTimeAgo] = useState<string>('Pending');
  const [justSaved, setJustSaved] = useState<boolean>(false);
  const [metadata, setMetadata] = useState<AutoSaveMetadata | null>(projectAutoSave.getMetadata());
  const [settings, setSettings] = useState<AutoSaveSettings>(() => projectAutoSave.getSettings());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync with projectAutoSave settings changes (from indicator or File menu)
  useEffect(() => {
    const unsubscribe = projectAutoSave.subscribeSettings(setSettings);
    return unsubscribe;
  }, []);

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

  // Update relative time readout
  useEffect(() => {
    const updateRelative = () => {
      if (!lastSavedTimestamp) {
        setTimeAgo(settings.enabled ? 'Pending' : 'No save');
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
  }, [lastSavedTimestamp, settings.enabled]);

  // Flash save animation when lastSavedTimestamp changes
  useEffect(() => {
    if (lastSavedTimestamp) {
      setJustSaved(true);
      const timer = setTimeout(() => setJustSaved(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [lastSavedTimestamp]);

  const handleToggleEnabled = (e: React.MouseEvent) => {
    e.stopPropagation();
    projectAutoSave.setEnabled(!settings.enabled);
  };

  const handleSelectInterval = (seconds: number) => {
    projectAutoSave.setIntervalSeconds(seconds);
  };

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

  const intervalLabel = formatAutoSaveInterval(settings.intervalSeconds);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-mono transition-all select-none cursor-pointer ${
          justSaved
            ? 'bg-emerald-950/70 border-emerald-500/70 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
            : settings.enabled
              ? 'bg-[#0E121B] hover:bg-[#151C2C] border-[#222E48] hover:border-[#38BDF8]/50 text-[#8C9BBF] hover:text-[#E2E8F0]'
              : 'bg-[#121014] hover:bg-[#1C1820] border-[#3B2F2F] hover:border-amber-500/40 text-amber-200/75 hover:text-amber-200'
        }`}
        title={
          settings.enabled
            ? `Auto-Save ON (Every ${intervalLabel} • Last saved: ${timeAgo}). Click to configure.`
            : `Auto-Save OFF (Last saved: ${timeAgo}). Click to configure or save manually.`
        }
      >
        <span className="relative flex h-2 w-2">
          {justSaved && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              justSaved
                ? 'bg-emerald-400'
                : settings.enabled
                  ? 'bg-emerald-500/80'
                  : 'bg-amber-500/70'
            }`}
          />
        </span>

        <span className="text-[11px] font-bold tracking-tight hidden sm:inline">
          {justSaved
            ? 'SAVED'
            : settings.enabled
              ? `AUTOSAVE · ${intervalLabel}`
              : 'AUTOSAVE OFF'}
        </span>
        <span className="text-[10px] text-[#64748B] font-normal">
          {timeAgo}
        </span>

        <ChevronDown
          size={11}
          className={`text-[#64748B] transition-transform ${isOpen ? 'rotate-180 text-cyan-400' : ''}`}
        />
      </button>

      {/* Auto-Save Configuration & Control Drawer */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-72 bg-[#090D16] border border-[#23314F] rounded-xl shadow-[0_0_35px_rgba(0,0,0,0.9)] backdrop-blur-xl z-50 p-2.5 font-mono divide-y divide-[#18233C] animate-fade-in">
          {/* Status & ON/OFF Switch */}
          <div className="pb-2.5">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 text-[10px] text-[#CBD5E1] font-bold uppercase tracking-wider">
                <Clock size={12} className={settings.enabled ? 'text-emerald-400' : 'text-amber-400'} />
                <span>Project Auto-Save</span>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={settings.enabled}
                onClick={handleToggleEnabled}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-extrabold transition-all cursor-pointer ${
                  settings.enabled
                    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                    : 'bg-[#161923] text-[#94A3B8] border-[#334155] hover:text-white'
                }`}
                title={settings.enabled ? 'Turn Auto-Save OFF' : 'Turn Auto-Save ON'}
              >
                <Power size={10} />
                <span>{settings.enabled ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            <p className="text-[10px] text-[#64748B] leading-relaxed">
              {settings.enabled
                ? `Automatically saves tracks, clips, and tempo every ${intervalLabel} to localStorage.`
                : 'Background auto-save is paused. Manual Save (Ctrl+S) still works anytime.'}
            </p>
          </div>

          {/* Interval Duration Selector */}
          <div className={`py-2.5 transition-opacity ${settings.enabled ? 'opacity-100' : 'opacity-60'}`}>
            <div className="flex items-center justify-between text-[10px] mb-1.5">
              <span className="text-[#94A3B8] font-bold uppercase tracking-wider">
                Interval Duration
              </span>
              <span className="text-[#00F0FF] font-extrabold">{intervalLabel}</span>
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-6 gap-1 mb-2">
              {AUTOSAVE_INTERVAL_PRESETS.map((presetSec) => {
                const isSelected = settings.intervalSeconds === presetSec;
                return (
                  <button
                    key={presetSec}
                    type="button"
                    onClick={() => handleSelectInterval(presetSec)}
                    className={`py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#00F0FF]/20 border-[#00F0FF] text-[#00F0FF]'
                        : 'bg-[#0E1422] border-[#1E293B] text-[#94A3B8] hover:text-white hover:border-[#334155]'
                    }`}
                  >
                    {formatAutoSaveInterval(presetSec)}
                  </button>
                );
              })}
            </div>

            {/* Fine Slider + Custom Stepper */}
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={MIN_AUTOSAVE_INTERVAL_SEC}
                max={600}
                step={5}
                value={Math.min(600, settings.intervalSeconds)}
                onChange={(e) => handleSelectInterval(Number(e.target.value))}
                className="flex-1 h-1.5 bg-[#1A263D] rounded-lg appearance-none cursor-pointer accent-[#00F0FF]"
                aria-label="Auto-save interval in seconds"
              />
              <div className="flex items-center gap-0.5 bg-[#04060B] border border-[#1E293B] rounded px-1 py-0.5 text-[10px]">
                <input
                  type="number"
                  min={MIN_AUTOSAVE_INTERVAL_SEC}
                  max={MAX_AUTOSAVE_INTERVAL_SEC}
                  step={5}
                  value={settings.intervalSeconds}
                  onChange={(e) => {
                    const parsed = Number(e.target.value);
                    if (!Number.isNaN(parsed)) {
                      handleSelectInterval(parsed);
                    }
                  }}
                  className="w-10 bg-transparent text-right text-white font-bold focus:outline-none"
                  title="Custom interval in seconds (10s - 1800s)"
                />
                <span className="text-[#64748B]">s</span>
              </div>
            </div>
          </div>

          {/* Snapshot Metadata & Manual Actions */}
          <div className="pt-2.5 flex flex-col gap-1.5">
            {metadata && (
              <div className="mb-1 p-1.5 rounded bg-[#04060B] border border-[#18233C] text-[10px] text-[#CBD5E1]">
                <div className="flex justify-between text-[#94A3B8]">
                  <span>Last Saved:</span>
                  <span className="text-emerald-400 font-bold">{metadata.formattedDate}</span>
                </div>
                <div className="flex justify-between text-[#94A3B8] mt-0.5">
                  <span>Project:</span>
                  <span className="text-white truncate max-w-[140px]">{metadata.sessionName}</span>
                </div>
                <div className="flex justify-between text-[#94A3B8] mt-0.5">
                  <span>Contents:</span>
                  <span className="text-[#FF8C00]">{metadata.trackCount} tracks • {metadata.bpm} BPM</span>
                </div>
              </div>
            )}

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

