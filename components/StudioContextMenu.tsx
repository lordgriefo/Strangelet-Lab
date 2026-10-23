import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Track, Clip } from '../types';
import {
  Sliders,
  BarChart3,
  Layers,
  Mic,
  Music,
  Scissors,
  Volume2,
  VolumeX,
  Sparkles,
  Plus,
  Trash2,
  Copy,
  Save,
  Undo2,
  Redo2,
  Search,
  Bot,
  Workflow,
  Atom,
  Radio,
  Disc,
  Settings2,
  ShieldCheck,
  HelpCircle,
  Activity,
  Split,
  Code2,
  Keyboard,
  Zap,
  Wand2,
  Flame,
  Gauge,
  CircleDot,
  Headphones,
  Check,
  ChevronRight,
  FolderPlus,
  RotateCcw,
  FolderArchive,
  Download
} from 'lucide-react';

export interface ContextMenuTarget {
  x: number;
  y: number;
  trackId?: string | null;
  clipId?: string | null;
}

export interface StudioContextMenuProps {
  target: ContextMenuTarget | null;
  onClose: () => void;
  tracks: Track[];
  currentView: View;
  onSelectView: (view: View) => void;
  onEditClip: (clip: Clip) => void;
  // Track operations
  onAddAudioTrack: () => void;
  onAddMidiTrack: () => void;
  onDeleteTrack?: (trackId: string) => void;
  onDuplicateTrack?: (trackId: string) => void;
  onUpdateTrack?: (trackId: string, updates: Partial<Track>) => void;
  onArmAllTracks?: (arm: boolean) => void;
  onClearAllMutes?: () => void;
  onClearAllSolos?: () => void;
  // Clip operations
  onDeleteClip?: (trackId: string, clipId: string) => void;
  onDuplicateClip?: (trackId: string, clipId: string) => void;
  onSplitClip?: (trackId: string, clipId: string) => void;
  // Global Project Operations
  onSaveProject: () => void;
  onUndo: () => void;
  onRedo: () => void;
  // Modals & Tools
  onOpenLiveRecorder: () => void;
  onOpenGhostBuddy: () => void;
  onOpenAiMixStep: () => void;
  onOpenAceStep: () => void;
  onOpenBasicPitch: () => void;
  onOpenFaustDsp: () => void;
  onOpenSfzLibrary: () => void;
  onOpenWorkflowStudio: () => void;
  onOpenNewProject: () => void;
  onOpenUserGuide: () => void;
  onOpenBatchStemExport?: () => void;
  onToggleUiSound: () => void;
  isUiSoundMuted: boolean;
  onToggleLynchianMode: () => void;
  lynchianMode: boolean;
}

interface MenuItem {
  id: string;
  category: 'context' | 'views' | 'project' | 'ai' | 'utilities';
  label: string;
  sublabel?: string;
  shortcut?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconColor?: string;
  action: () => void;
  danger?: boolean;
}

export const StudioContextMenu: React.FC<StudioContextMenuProps> = ({
  target,
  onClose,
  tracks,
  currentView,
  onSelectView,
  onEditClip,
  onAddAudioTrack,
  onAddMidiTrack,
  onDeleteTrack,
  onDuplicateTrack,
  onUpdateTrack,
  onArmAllTracks,
  onClearAllMutes,
  onClearAllSolos,
  onDeleteClip,
  onDuplicateClip,
  onSplitClip,
  onSaveProject,
  onUndo,
  onRedo,
  onOpenLiveRecorder,
  onOpenGhostBuddy,
  onOpenAiMixStep,
  onOpenAceStep,
  onOpenBasicPitch,
  onOpenFaustDsp,
  onOpenSfzLibrary,
  onOpenWorkflowStudio,
  onOpenNewProject,
  onOpenUserGuide,
  onOpenBatchStemExport,
  onToggleUiSound,
  isUiSoundMuted,
  onToggleLynchianMode,
  lynchianMode
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'context' | 'views' | 'project' | 'ai' | 'tools'>('all');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Identify targeted track and clip
  const targetTrack = useMemo(() => {
    if (!target?.trackId) return null;
    return tracks.find(t => t.id === target.trackId) || null;
  }, [target?.trackId, tracks]);

  const targetClip = useMemo(() => {
    if (!targetTrack || !target?.clipId) return null;
    return targetTrack.clips.find(c => c.id === target.clipId) || null;
  }, [targetTrack, target?.clipId]);

  // Build items list
  const allItems = useMemo(() => {
    const list: MenuItem[] = [];

    // 1. Contextual Track/Clip Actions (Top priority if clicked on track or clip)
    if (targetTrack) {
      if (targetClip) {
        list.push({
          id: 'clip-edit',
          category: 'context',
          label: `Edit Clip: "${targetClip.name}"`,
          sublabel: targetClip.isMidi || targetTrack.type === 'midi' ? 'Open in MIDI Piano Roll' : 'Open in Audio Waveform Editor',
          shortcut: 'Enter',
          icon: Scissors,
          iconColor: 'text-[#00F0FF]',
          action: () => {
            onEditClip(targetClip);
            if (targetClip.isMidi || targetTrack.type === 'midi') {
              onSelectView(View.MIDI_EDITOR);
            } else {
              onSelectView(View.AUDIO_EDITOR);
            }
          }
        });

        if (onDuplicateClip) {
          list.push({
            id: 'clip-duplicate',
            category: 'context',
            label: 'Duplicate Clip',
            sublabel: 'Copies clip to the next bar boundary',
            shortcut: 'Ctrl+D',
            icon: Copy,
            iconColor: 'text-[#38BDF8]',
            action: () => onDuplicateClip(targetTrack.id, targetClip.id)
          });
        }

        if (onSplitClip) {
          list.push({
            id: 'clip-split',
            category: 'context',
            label: 'Split Clip at Playhead',
            sublabel: 'Slices audio/MIDI region into two clips',
            shortcut: 'S',
            icon: Split,
            iconColor: 'text-[#FFD700]',
            action: () => onSplitClip(targetTrack.id, targetClip.id)
          });
        }

        if (onDeleteClip) {
          list.push({
            id: 'clip-delete',
            category: 'context',
            label: 'Delete Clip',
            shortcut: 'Del',
            icon: Trash2,
            iconColor: 'text-red-400',
            danger: true,
            action: () => onDeleteClip(targetTrack.id, targetClip.id)
          });
        }
      }

      // Track Controls
      list.push({
        id: 'track-arm',
        category: 'context',
        label: targetTrack.isArmedForRecord ? `Disarm Track: "${targetTrack.name}"` : `Arm Track for Record: "${targetTrack.name}"`,
        sublabel: 'Toggles live recording input for this track',
        shortcut: 'R',
        icon: CircleDot,
        iconColor: targetTrack.isArmedForRecord ? 'text-red-400' : 'text-[#888]',
        action: () => onUpdateTrack && onUpdateTrack(targetTrack.id, { isArmedForRecord: !targetTrack.isArmedForRecord })
      });

      list.push({
        id: 'track-mute',
        category: 'context',
        label: targetTrack.muted ? `Unmute Track: "${targetTrack.name}"` : `Mute Track: "${targetTrack.name}"`,
        shortcut: 'M',
        icon: targetTrack.muted ? Volume2 : VolumeX,
        iconColor: targetTrack.muted ? 'text-emerald-400' : 'text-amber-400',
        action: () => onUpdateTrack && onUpdateTrack(targetTrack.id, { muted: !targetTrack.muted })
      });

      list.push({
        id: 'track-solo',
        category: 'context',
        label: targetTrack.soloed ? `Unsolo Track: "${targetTrack.name}"` : `Solo Track: "${targetTrack.name}"`,
        shortcut: 'S',
        icon: Headphones,
        iconColor: targetTrack.soloed ? 'text-yellow-400' : 'text-[#888]',
        action: () => onUpdateTrack && onUpdateTrack(targetTrack.id, { soloed: !targetTrack.soloed })
      });

      list.push({
        id: 'track-phase',
        category: 'context',
        label: `Invert Polarity (Phase Flip: ${targetTrack.phaseInverted ? 'ON' : 'OFF'})`,
        sublabel: '180° phase inversion for checking acoustic cancellation',
        icon: Activity,
        iconColor: 'text-cyan-400',
        action: () => onUpdateTrack && onUpdateTrack(targetTrack.id, { phaseInverted: !targetTrack.phaseInverted })
      });

      if (onDuplicateTrack) {
        list.push({
          id: 'track-duplicate',
          category: 'context',
          label: `Duplicate Track: "${targetTrack.name}"`,
          sublabel: 'Duplicates track settings, volume, and clips',
          icon: Copy,
          iconColor: 'text-blue-400',
          action: () => onDuplicateTrack(targetTrack.id)
        });
      }

      if (onDeleteTrack) {
        list.push({
          id: 'track-delete',
          category: 'context',
          label: `Delete Track: "${targetTrack.name}"`,
          icon: Trash2,
          iconColor: 'text-red-400',
          danger: true,
          action: () => onDeleteTrack(targetTrack.id)
        });
      }
    }

    // 2. Project Actions & History
    list.push({
      id: 'proj-save',
      category: 'project',
      label: 'Save Project Snapshot',
      sublabel: 'Persist project tracks, clips & BPM to local storage',
      shortcut: 'Ctrl+S',
      icon: Save,
      iconColor: 'text-emerald-400',
      action: onSaveProject
    });

    list.push({
      id: 'proj-undo',
      category: 'project',
      label: 'Undo Last Action',
      shortcut: 'Ctrl+Z',
      icon: Undo2,
      iconColor: 'text-[#00F0FF]',
      action: onUndo
    });

    list.push({
      id: 'proj-redo',
      category: 'project',
      label: 'Redo Action',
      shortcut: 'Ctrl+Y',
      icon: Redo2,
      iconColor: 'text-[#00F0FF]',
      action: onRedo
    });

    list.push({
      id: 'proj-add-audio',
      category: 'project',
      label: 'Add Audio Track',
      sublabel: 'Create an armed or clean stereo audio lane',
      shortcut: 'Ctrl+T',
      icon: Plus,
      iconColor: 'text-sky-400',
      action: onAddAudioTrack
    });

    list.push({
      id: 'proj-add-midi',
      category: 'project',
      label: 'Add MIDI Track',
      sublabel: 'Create an instrument or synth track',
      shortcut: 'Ctrl+Shift+T',
      icon: Music,
      iconColor: 'text-purple-400',
      action: onAddMidiTrack
    });

    list.push({
      id: 'proj-new',
      category: 'project',
      label: 'New Project / Templates',
      sublabel: 'Open project template selector (EDM, Rock, Synthwave...)',
      icon: FolderPlus,
      iconColor: 'text-amber-400',
      action: onOpenNewProject
    });

    if (onOpenBatchStemExport) {
      list.push({
        id: 'proj-batch-stems',
        category: 'project',
        label: 'Batch Stem Export (All Tracks to WAV)',
        sublabel: 'Export active tracks as individual WAVs with normalization & sample rate conversion',
        shortcut: 'Shift+E',
        icon: FolderArchive,
        iconColor: 'text-emerald-400',
        action: onOpenBatchStemExport
      });
    }

    if (onClearAllMutes) {
      list.push({
        id: 'proj-unmute-all',
        category: 'project',
        label: 'Unmute All Tracks',
        icon: Volume2,
        iconColor: 'text-teal-400',
        action: onClearAllMutes
      });
    }

    if (onClearAllSolos) {
      list.push({
        id: 'proj-clear-solos',
        category: 'project',
        label: 'Clear All Solos',
        icon: Headphones,
        iconColor: 'text-yellow-400',
        action: onClearAllSolos
      });
    }

    // 3. Studio Views (Fast View Switching)
    list.push({
      id: 'view-mixer',
      category: 'views',
      label: 'Mixer Console & Timeline',
      sublabel: 'Main multitrack arranger & faders',
      shortcut: 'M',
      icon: Sliders,
      iconColor: 'text-[#FFD700]',
      action: () => onSelectView(View.MIXER)
    });

    list.push({
      id: 'view-spectral',
      category: 'views',
      label: 'Spectral Frequency & Phase Analysis',
      sublabel: 'Real-time FFT spectrum & stereo phase correlation meter',
      shortcut: 'S',
      icon: BarChart3,
      iconColor: 'text-[#00F0FF]',
      action: () => onSelectView(View.SPECTRAL_ANALYSIS)
    });

    list.push({
      id: 'view-midi-editor',
      category: 'views',
      label: 'MIDI Piano Roll Editor',
      sublabel: 'Note sequencing, humanize & velocity controls',
      icon: Music,
      iconColor: 'text-purple-400',
      action: () => onSelectView(View.MIDI_EDITOR)
    });

    list.push({
      id: 'view-audio-editor',
      category: 'views',
      label: 'Audio Sample Editor',
      sublabel: 'Waveform trimming, silence strip & normalization',
      icon: Scissors,
      iconColor: 'text-cyan-400',
      action: () => onSelectView(View.AUDIO_EDITOR)
    });

    list.push({
      id: 'view-mastering',
      category: 'views',
      label: 'Suno AI Mastering Studio',
      sublabel: 'Loudness normalization, multi-band limiter & tape glue',
      icon: Gauge,
      iconColor: 'text-pink-400',
      action: () => onSelectView(View.MASTERING)
    });

    list.push({
      id: 'view-beam-splitter',
      category: 'views',
      label: 'Beam Splitter (Stem Separator)',
      sublabel: 'AI 4-stem separation: vocals, drums, bass, instruments',
      icon: Split,
      iconColor: 'text-indigo-400',
      action: () => onSelectView(View.BEAM_SPLITTER)
    });

    list.push({
      id: 'view-drum-designer',
      category: 'views',
      label: 'Drum Machine & Step Sequencer',
      sublabel: 'Synthesize 808s, kicks, snares and hi-hat patterns',
      icon: Disc,
      iconColor: 'text-orange-400',
      action: () => onSelectView(View.DRUM_DESIGNER)
    });

    list.push({
      id: 'view-voice-cloner',
      category: 'views',
      label: 'Voice Cloner & Timbre Modeler',
      sublabel: 'Zero-resource neural vocal cloning & pitch morphing',
      icon: Mic,
      iconColor: 'text-emerald-400',
      action: () => onSelectView(View.VOICE_CLONER)
    });

    list.push({
      id: 'view-pedalboard',
      category: 'views',
      label: 'Pedalboard & Guitar Amp Rack',
      sublabel: 'Overdrive, chorus, delay & cabinet convolution',
      icon: Zap,
      iconColor: 'text-yellow-400',
      action: () => onSelectView(View.PEDALBOARD)
    });

    list.push({
      id: 'view-faust-dsp',
      category: 'views',
      label: 'Faust DSP Audio Code Lab',
      sublabel: 'Interactive WebAssembly DSP synthesizer workbench',
      icon: Code2,
      iconColor: 'text-violet-400',
      action: onOpenFaustDsp
    });

    list.push({
      id: 'view-system-core',
      category: 'views',
      label: 'Tape Deck & Tube Saturator',
      sublabel: 'Lynchian reel-to-reel warmth & flutter modeling',
      icon: Radio,
      iconColor: 'text-rose-400',
      action: () => onSelectView(View.SYSTEM_CORE)
    });

    list.push({
      id: 'view-project-stats',
      category: 'views',
      label: 'Project Telemetry & VRAM Monitor',
      sublabel: 'Hardware stats, clip density & memory telemetry',
      icon: Activity,
      iconColor: 'text-cyan-400',
      action: () => onSelectView(View.PROJECT_STATS)
    });

    // 4. AI & Creative Accelerators
    list.push({
      id: 'ai-ghost-buddy',
      category: 'ai',
      label: 'Ghost in the Machine (Strangelet Buddy)',
      sublabel: 'Autonomous AI studio engineer & production advisor',
      shortcut: 'Alt+G',
      icon: Bot,
      iconColor: 'text-purple-400',
      action: onOpenGhostBuddy
    });

    list.push({
      id: 'ai-mix-assistant',
      category: 'ai',
      label: 'AI Mix Assistant (Local LLM / KoboldCpp)',
      sublabel: 'Autonomous level balancing, panning & EQ guidance',
      icon: Wand2,
      iconColor: 'text-pink-400',
      action: onOpenAiMixStep
    });

    list.push({
      id: 'ai-acestep',
      category: 'ai',
      label: 'Ace-Step 1.5 Multi-Track Generator',
      sublabel: 'Generate complete synchronized multi-stem song beds',
      icon: Sparkles,
      iconColor: 'text-amber-400',
      action: onOpenAceStep
    });

    list.push({
      id: 'ai-basic-pitch',
      category: 'ai',
      label: 'Suno Basic Pitch Neural Audio-to-MIDI',
      sublabel: 'Transcribe polyphonic audio into MIDI tracks',
      icon: Music,
      iconColor: 'text-emerald-400',
      action: onOpenBasicPitch
    });

    list.push({
      id: 'ai-sfz-library',
      category: 'ai',
      label: 'SFZ Multi-Sample Sound Library',
      sublabel: 'Browse acoustic pianos, vintage synths & 808 patches',
      icon: Layers,
      iconColor: 'text-blue-400',
      action: onOpenSfzLibrary
    });

    list.push({
      id: 'ai-workflow-studio',
      category: 'ai',
      label: 'Guided Workflow Studio & Templates',
      sublabel: 'Step-by-step masterclass pathways for complete songs',
      icon: Workflow,
      iconColor: 'text-orange-400',
      action: onOpenWorkflowStudio
    });

    // 5. Studio Utilities & Recording Safety
    list.push({
      id: 'util-live-recorder',
      category: 'utilities',
      label: 'Live Microphone / Instrument Recorder',
      sublabel: 'Arm microphone and record takes directly into timeline',
      icon: Mic,
      iconColor: 'text-red-400',
      action: onOpenLiveRecorder
    });

    list.push({
      id: 'util-ui-sound',
      category: 'utilities',
      label: isUiSoundMuted ? 'Studio Silent Mode (Currently Active)' : 'UI Sound Effects (Currently Active)',
      sublabel: isUiSoundMuted ? 'Muted: Prevents mic bleed & monitor corruption. Click to unmute.' : 'Caution: UI beeps may leak into live recordings. Click to mute.',
      icon: isUiSoundMuted ? ShieldCheck : Volume2,
      iconColor: isUiSoundMuted ? 'text-emerald-400' : 'text-amber-400',
      action: onToggleUiSound
    });

    list.push({
      id: 'util-lynchian',
      category: 'utilities',
      label: lynchianMode ? 'Lynchian Red Room Mode: ON' : 'Lynchian Red Room Mode: OFF',
      sublabel: 'Dark surrealist crimson aesthetic & subterranean tape drones',
      icon: Flame,
      iconColor: lynchianMode ? 'text-red-400' : 'text-[#888]',
      action: onToggleLynchianMode
    });

    list.push({
      id: 'util-user-guide',
      category: 'utilities',
      label: 'Studio User Manual & Shortcuts',
      sublabel: 'Complete hotkey reference & DSP documentation',
      shortcut: 'F1 / ?',
      icon: HelpCircle,
      iconColor: 'text-cyan-400',
      action: onOpenUserGuide
    });

    return list;
  }, [
    targetTrack,
    targetClip,
    currentView,
    tracks,
    isUiSoundMuted,
    lynchianMode,
    onEditClip,
    onSelectView,
    onAddAudioTrack,
    onAddMidiTrack,
    onDeleteTrack,
    onDuplicateTrack,
    onUpdateTrack,
    onDeleteClip,
    onDuplicateClip,
    onSplitClip,
    onSaveProject,
    onUndo,
    onRedo,
    onOpenLiveRecorder,
    onOpenGhostBuddy,
    onOpenAiMixStep,
    onOpenAceStep,
    onOpenBasicPitch,
    onOpenFaustDsp,
    onOpenSfzLibrary,
    onOpenWorkflowStudio,
    onOpenNewProject,
    onOpenUserGuide,
    onOpenBatchStemExport,
    onToggleUiSound,
    onToggleLynchianMode
  ]);

  // Filter items by category and search query
  const filteredItems = useMemo(() => {
    let items = allItems;

    if (selectedCategory !== 'all') {
      if (selectedCategory === 'tools') {
        items = items.filter(i => i.category === 'utilities');
      } else {
        items = items.filter(i => i.category === selectedCategory);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(i =>
        i.label.toLowerCase().includes(q) ||
        (i.sublabel && i.sublabel.toLowerCase().includes(q)) ||
        (i.shortcut && i.shortcut.toLowerCase().includes(q))
      );
    }

    return items;
  }, [allItems, selectedCategory, searchQuery]);

  // Reset highlighted index when filtered items change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredItems.length, searchQuery, selectedCategory]);

  // Auto-focus search input when menu opens
  useEffect(() => {
    if (target) {
      // Focus search after render
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [target]);

  // Keyboard navigation inside context menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!target) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[highlightedIndex]) {
          filteredItems[highlightedIndex].action();
          onClose();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [target, filteredItems, highlightedIndex, onClose]);

  // Click outside to dismiss
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleWindowBlur = () => {
      onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', onClose);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [onClose]);

  if (!target) return null;

  // Viewport-aware coordinate calculation
  const menuWidth = 330;
  const menuHeight = 490; // estimated max height
  const padding = 12;

  let posX = target.x;
  let posY = target.y;

  if (typeof window !== 'undefined') {
    if (posX + menuWidth > window.innerWidth - padding) {
      posX = Math.max(padding, target.x - menuWidth);
    }
    if (posY + menuHeight > window.innerHeight - padding) {
      posY = Math.max(padding, target.y - menuHeight);
    }
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-[99999] w-[330px] max-h-[500px] flex flex-col rounded-xl bg-[#0D0F18]/95 backdrop-blur-xl border border-[#23293D] shadow-[0_16px_40px_rgba(0,0,0,0.8),0_0_1px_rgba(255,255,255,0.15)] text-[#E2E8F0] overflow-hidden select-none animate-in fade-in zoom-in-95 duration-100"
      style={{
        left: `${posX}px`,
        top: `${posY}px`
      }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header with Context Identity */}
      <div className="p-2.5 pb-2 border-b border-[#1E2436] bg-[#0A0C14]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-2 h-2 rounded-full bg-[#00F0FF] shadow-[0_0_6px_#00F0FF]" />
            <span className="font-mono text-[11px] font-bold tracking-wider uppercase text-[#00F0FF] truncate">
              {targetClip 
                ? `Clip: ${targetClip.name}`
                : targetTrack 
                  ? `Track: ${targetTrack.name}` 
                  : 'Studio Shortcuts'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#64748B] shrink-0">
            Right-Click Menu
          </span>
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2.5 text-[#64748B]" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks, views, actions..."
            className="w-full bg-[#131724] border border-[#232A3E] rounded-md pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#00F0FF] focus:ring-1 focus:ring-[#00F0FF]/50 transition-all font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-2 text-[10px] font-mono text-[#64748B] hover:text-white"
            >
              ESC
            </button>
          )}
        </div>

        {/* Category Filter Tabs */}
        {!searchQuery && (
          <div className="flex items-center gap-1 mt-2 overflow-x-auto no-scrollbar text-[10px] font-mono">
            {(['all', 'context', 'views', 'project', 'ai', 'tools'] as const).map((cat) => {
              if (cat === 'context' && !targetTrack) return null;
              const labels: Record<string, string> = {
                all: 'All',
                context: 'Context',
                views: 'Views',
                project: 'Project',
                ai: 'AI & Mix',
                tools: 'Safety'
              };
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-[#00F0FF]/20 text-[#00F0FF] font-bold border border-[#00F0FF]/40'
                      : 'text-[#8C9BBF] hover:text-white hover:bg-white/5'
                  }`}
                >
                  {labels[cat]}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Shortcuts List */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 max-h-[340px] custom-scrollbar">
        {filteredItems.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#64748B] font-mono">
            No matching studio actions found for &quot;{searchQuery}&quot;
          </div>
        ) : (
          filteredItems.map((item, idx) => {
            const Icon = item.icon;
            const isHighlighted = idx === highlightedIndex;

            return (
              <button
                key={item.id}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onClick={() => {
                  item.action();
                  onClose();
                }}
                className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between gap-2.5 transition-all cursor-pointer group ${
                  isHighlighted
                    ? item.danger
                      ? 'bg-red-950/40 text-red-300 border border-red-500/40'
                      : 'bg-[#182032] text-white border border-[#2D3C5E]'
                    : 'text-[#CBD5E1] hover:bg-[#141A29] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className={`p-1.5 rounded-md bg-[#0B0E17] border border-[#1A2234] shrink-0 group-hover:scale-105 transition-transform ${item.iconColor || 'text-white'}`}>
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate flex items-center gap-1.5">
                      <span>{item.label}</span>
                    </div>
                    {item.sublabel && (
                      <div className="text-[10px] text-[#64748B] truncate group-hover:text-[#94A3B8] transition-colors">
                        {item.sublabel}
                      </div>
                    )}
                  </div>
                </div>

                {/* Shortcut Badge */}
                {item.shortcut && (
                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[#090C14] border border-[#22293C] text-[#8C9BBF] shrink-0 group-hover:border-[#38BDF8]/40 group-hover:text-[#38BDF8] transition-colors">
                    {item.shortcut}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="px-3 py-1.5 border-t border-[#1E2436] bg-[#0A0C14] flex items-center justify-between text-[10px] font-mono text-[#64748B]">
        <span>↑↓ Navigate • ↵ Select</span>
        <button
          onClick={onClose}
          className="hover:text-white transition-colors cursor-pointer"
        >
          ESC to Close
        </button>
      </div>
    </div>
  );
};
