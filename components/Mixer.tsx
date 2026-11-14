import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { INITIAL_TRACKS } from '../constants';
import { Track, Clip, View, LaserToolType, TimelineMarker, ChronoPin, BeamSplitterResult, ProjectBinClip, AceStepSongBedResult } from '../types';
import ChannelStrip from './ChannelStrip';
import Timeline from './Timeline';
import { 
  Settings2, Play, Pause, Square, Repeat, Rewind, Workflow, 
  CircleDot, Mic, Zap, Sparkles, Radio, Music, Download, Crosshair, Pin, Split, Code2, Keyboard,
  Magnet, BarChart3, FolderArchive, Activity, Plus, Upload, ChevronDown, Sliders, Disc, Cpu,
  LayoutList, Columns, Wrench, SlidersHorizontal, Maximize2, FolderKanban
} from 'lucide-react';
import { midiLearnService, MidiControlMapping, MidiLearningTarget } from '../services/midiLearnService';
import { vstWrapperService } from '../services/vstWrapperService';
import { audioService } from '../services/audioService';
import { evaluateAutomationAt, snapToGrid } from '../lib/audioUtils';
import { liveRecordingEngine } from '../lib/liveRecordingEngine';
import { playLaserBeamSound } from '../lib/laserSound';
import { masterAudioBus } from '../lib/masterBus';
import { midiToNoteName } from '../services/basicPitchService';
import { MidiNoteEvent } from '../types';
import { UndoRedoControls } from './UndoRedoControls';
import { AutoSaveIndicator } from './AutoSaveIndicator';
import { projectHistory } from '../services/projectHistoryService';
import { MixSnapshotBar } from './MixSnapshotBar';
import { macroEngineService, PerformanceMacro, MacroEvent } from '../services/macroEngineService';
import { mixSnapshotService } from '../services/mixSnapshotService';
import { useSnapGrid, formatSnapDivisionLabel } from '../services/snapGridService';
import {
  MidiQuantizeGrid,
  MidiQuantizeScope,
  isMidiClipOnTrack,
  quantizeMidiTracks,
  restoreOriginalMidiTiming,
  resolveTargetClipIds
} from '../services/midiQuantizeService';

const RetroMidiKeyboard = lazy(() => import('./RetroMidiKeyboard'));
const ExportProjectModal = lazy(() => import('./ExportProjectModal').then(m => ({ default: m.ExportProjectModal })));
const ChronoMapModal = lazy(() => import('./ChronoMapModal').then(m => ({ default: m.ChronoMapModal })));
const BeamSplitterModal = lazy(() => import('./BeamSplitterModal').then(m => ({ default: m.BeamSplitterModal })));
const AceStepLoopDesigner = lazy(() => import('./AceStepLoopDesigner').then(m => ({ default: m.AceStepLoopDesigner })));
const FaustDspLab = lazy(() => import('./FaustDspLab').then(m => ({ default: m.FaustDspLab })));
const BasicPitchModal = lazy(() => import('./BasicPitchModal').then(m => ({ default: m.BasicPitchModal })));
const MidiEditor = lazy(() => import('./MidiEditor').then(m => ({ default: m.MidiEditor })));
const BatchStemExportModal = lazy(() => import('./BatchStemExportModal').then(m => ({ default: m.BatchStemExportModal })));
const VirtualMidiControllerRack = lazy(() => import('./VirtualMidiControllerRack').then(m => ({ default: m.VirtualMidiControllerRack })));
const GlobalVstBrowserPanel = lazy(() => import('./GlobalVstBrowserPanel').then(m => ({ default: m.GlobalVstBrowserPanel })));
const MacroEnginePanel = lazy(() => import('./MacroEnginePanel').then(m => ({ default: m.MacroEnginePanel })));
const MidiQuantizePanel = lazy(() => import('./MidiQuantizePanel'));
const TemplateGallery = lazy(() => import('./TemplateGallery').then(m => ({ default: m.TemplateGallery })));

const TOTAL_BARS = 16;

type MixerLayoutMode = 'pure' | 'arrange' | 'console' | 'split';

interface AudioNodes {
  oscillator: OscillatorNode;
  gain: GainNode;
  panner: StereoPannerNode;
}

interface MixerProps {
  setActiveClip: (clip: Clip) => void;
  setView: (view: View) => void;
  snapValue: string;
  setSnapValue: (value: string) => void;
  tracks?: Track[];
  setTracks?: React.Dispatch<React.SetStateAction<Track[]>>;
  updateTrack?: (id: string, updates: Partial<Track>) => void;
  tempo?: number;
  setTempo?: (tempo: number) => void;
  onOpenNewProject?: () => void;
  onAddProjectBinClips?: (clips: ProjectBinClip[]) => void;
  onOpenAiMixStep?: () => void;
  onOpenAceStepDesigner?: () => void;
  onOpenFaustDspLab?: () => void;
  onApplySongBedToMixer?: (songBed: AceStepSongBedResult) => void;
  onOpenBasicPitch?: (stemCategory?: 'vocals' | 'bass' | 'drums' | 'instruments' | 'full', songTitle?: string, buffer?: AudioBuffer | null) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onManualSave?: () => void;
  onRestoreAutoSave?: () => void;
  lastSavedTimestamp?: number | null;
  isAutoArmMode?: boolean;
  onToggleAutoArm?: () => void;
  selectedTrackId?: string | null;
  onSelectTrack?: (trackId: string) => void;
  onOpenYue2Generator?: () => void;
  onOpenVstWrapperHost?: (pluginId?: string) => void;
  activeSession?: import('../types').ProjectSession;
  onUpdateSession?: (session: import('../types').ProjectSession) => void;
  onOpenTemplateGalleryView?: () => void;
  activeLaserTool?: LaserToolType;
  onSelectLaserTool?: (tool: LaserToolType) => void;
  beamModeEnabled?: boolean;
  onToggleBeamMode?: () => void;
  externalModalRequest?: { type: 'chronomap' | 'beamsplitter'; id: number } | null;
  onClearExternalModalRequest?: () => void;
}

const Mixer: React.FC<MixerProps> = ({ 
  setActiveClip, 
  setView, 
  snapValue, 
  setSnapValue,
  tracks: externalTracks,
  setTracks: externalSetTracks,
  updateTrack: externalUpdateTrack,
  tempo: externalTempo,
  setTempo: externalSetTempo,
  onOpenNewProject,
  onAddProjectBinClips,
  onOpenAiMixStep,
  onOpenAceStepDesigner,
  onOpenFaustDspLab,
  onApplySongBedToMixer,
  onOpenBasicPitch,
  onUndo,
  onRedo,
  onManualSave,
  onRestoreAutoSave,
  lastSavedTimestamp,
  isAutoArmMode: propAutoArmMode,
  onToggleAutoArm: propOnToggleAutoArm,
  selectedTrackId: propSelectedTrackId,
  onSelectTrack: propOnSelectTrack,
  onOpenYue2Generator,
  onOpenVstWrapperHost,
  activeSession,
  onUpdateSession,
  onOpenTemplateGalleryView,
  activeLaserTool: propActiveLaserTool,
  onSelectLaserTool: propOnSelectLaserTool,
  beamModeEnabled: propBeamModeEnabled,
  onToggleBeamMode: propOnToggleBeamMode,
  externalModalRequest,
  onClearExternalModalRequest
}) => {
  const [internalTracks, setInternalTracks] = useState<Track[]>(INITIAL_TRACKS);
  const tracks = externalTracks ?? internalTracks;
  const setTracks = externalSetTracks ?? setInternalTracks;

  const externalUpdateTrackRef = useRef(externalUpdateTrack);
  externalUpdateTrackRef.current = externalUpdateTrack;

  const updateTrack = useCallback((id: string, updates: Partial<Track>) => {
    if (externalUpdateTrackRef.current) {
      externalUpdateTrackRef.current(id, updates);
    } else {
      setTracks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    }
  }, [setTracks]);

  const updateTrackRef = useRef(updateTrack);
  updateTrackRef.current = updateTrack;

  const [internalAutoArmMode, setInternalAutoArmMode] = useState<boolean>(() => {
    return localStorage.getItem('strangelet_auto_arm_mode') !== 'false';
  });
  const isAutoArm = propAutoArmMode ?? internalAutoArmMode;

  const [internalSelectedTrackId, setInternalSelectedTrackId] = useState<string | null>(() => {
    const armed = (externalTracks ?? INITIAL_TRACKS).find(t => t.isArmedForRecord);
    return armed ? armed.id : ((externalTracks ?? INITIAL_TRACKS)[0]?.id || null);
  });
  const selectedTrackId = propSelectedTrackId ?? internalSelectedTrackId;

  const handleSelectTrack = (trackId: string) => {
    if (propOnSelectTrack) {
      propOnSelectTrack(trackId);
    } else {
      setInternalSelectedTrackId(trackId);
      if (isAutoArm) {
        setTracks(prev => prev.map(t => ({
          ...t,
          isArmedForRecord: t.id === trackId
        })));
      }
    }
  };

  const handleToggleAutoArm = () => {
    if (propOnToggleAutoArm) {
      propOnToggleAutoArm();
    } else {
      setInternalAutoArmMode(prev => {
        const next = !prev;
        localStorage.setItem('strangelet_auto_arm_mode', String(next));
        if (next) {
          const targetId = selectedTrackId || tracks[0]?.id;
          if (targetId) {
            setTracks(prev => prev.map(t => ({
              ...t,
              isArmedForRecord: t.id === targetId
            })));
          }
        }
        return next;
      });
    }
    playLaserBeamSound('laser_select');
  };

  const [internalTempo, setInternalTempo] = useState<number>(120);
  const tempo = externalTempo ?? internalTempo;
  const setTempo = externalSetTempo ?? setInternalTempo;

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [internalActiveLaserTool, setInternalActiveLaserTool] = useState<LaserToolType>('laser_audio');
  const activeLaserTool = propActiveLaserTool ?? internalActiveLaserTool;
  const setActiveLaserTool = useCallback((tool: LaserToolType) => {
    if (propOnSelectLaserTool) {
      propOnSelectLaserTool(tool);
    } else {
      setInternalActiveLaserTool(tool);
    }
  }, [propOnSelectLaserTool]);
  const [internalBeamModeEnabled, setInternalBeamModeEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('strangelet_beam_mode_enabled') !== 'false';
    } catch {
      return true;
    }
  });
  const beamModeEnabled = propBeamModeEnabled ?? internalBeamModeEnabled;
  const handleToggleBeamMode = useCallback(() => {
    if (propOnToggleBeamMode) {
      propOnToggleBeamMode();
      return;
    }
    setInternalBeamModeEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('strangelet_beam_mode_enabled', String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
    playLaserBeamSound('laser_select');
  }, [propOnToggleBeamMode]);
  const [isMidiKeyboardOpen, setIsMidiKeyboardOpen] = useState<boolean>(false);
  const [micInputLevel, setMicInputLevel] = useState<number>(0);

  const [playheadPosition, setPlayheadPosition] = useState<number>(0); // 0 to 1
  const [loopEnabled, setLoopEnabled] = useState<boolean>(true);
  const [loopRange, setLoopRange] = useState<{ start: number, end: number }>({ start: 0.25, end: 0.75 }); // 0 to 1
  const [masterGain, setMasterGain] = useState(0.25);
  const [selectedMidiData, setSelectedMidiData] = useState<{ trackName: string, data: string } | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportModalInitialMode, setExportModalInitialMode] = useState<'mix' | 'stems'>('mix');
  const [isBatchStemExportOpen, setIsBatchStemExportOpen] = useState<boolean>(false);
  const [isChronoMapOpen, setIsChronoMapOpen] = useState<boolean>(false);
  const [chronoMapInitialTrackId, setChronoMapInitialTrackId] = useState<string | undefined>(undefined);
  const [isBeamSplitterOpen, setIsBeamSplitterOpen] = useState<boolean>(false);
  const [beamSplitterSourceTrackId, setBeamSplitterSourceTrackId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!externalModalRequest) return;
    if (externalModalRequest.type === 'chronomap') {
      const targetAudioTrack = tracks.find(t => t.type === 'audio' && t.clips.length > 0);
      setChronoMapInitialTrackId(targetAudioTrack?.id);
      setIsChronoMapOpen(true);
      playLaserBeamSound('laser_select');
    } else if (externalModalRequest.type === 'beamsplitter') {
      const targetAudioTrack = tracks.find(t => t.type === 'audio' && t.clips.length > 0);
      setBeamSplitterSourceTrackId(targetAudioTrack?.id);
      setIsBeamSplitterOpen(true);
      playLaserBeamSound('laser_select');
    }
    onClearExternalModalRequest?.();
  }, [externalModalRequest, tracks, onClearExternalModalRequest]);
  const [isAceStepOpen, setIsAceStepOpen] = useState<boolean>(false);
  const [isFaustDspOpen, setIsFaustDspOpen] = useState<boolean>(false);
  const [isBasicPitchOpen, setIsBasicPitchOpen] = useState<boolean>(false);
  const [basicPitchInitialStem, setBasicPitchInitialStem] = useState<'vocals' | 'bass' | 'drums' | 'instruments' | 'full'>('instruments');
  const [basicPitchSongTitle, setBasicPitchSongTitle] = useState<string>('Mixer Audio Track');
  const [basicPitchAudioBuffer, setBasicPitchAudioBuffer] = useState<AudioBuffer | null>(null);

  // MidiEditor State
  const [isMidiEditorOpen, setIsMidiEditorOpen] = useState<boolean>(false);
  const [midiEditorNotes, setMidiEditorNotes] = useState<MidiNoteEvent[]>([]);
  const [midiEditorClipName, setMidiEditorClipName] = useState<string>('MIDI Sequence');
  const [midiEditorInstrument, setMidiEditorInstrument] = useState<string>('SFZ Grand Piano');
  const [midiEditorTargetTrackId, setMidiEditorTargetTrackId] = useState<string | null>(null);
  const [midiEditorTargetClipId, setMidiEditorTargetClipId] = useState<string | null>(null);

  // Global MIDI Quantize & Selection State
  const [isMidiQuantizeOpen, setIsMidiQuantizeOpen] = useState<boolean>(false);
  const [midiQuantizeGrid, setMidiQuantizeGrid] = useState<MidiQuantizeGrid>('1/16');
  const [midiQuantizeSwing, setMidiQuantizeSwing] = useState<number>(0);
  const [midiQuantizeStrength, setMidiQuantizeStrength] = useState<number>(100);
  const [midiQuantizeScope, setMidiQuantizeScope] = useState<MidiQuantizeScope>('selected');
  const [midiQuantizeClipStarts, setMidiQuantizeClipStarts] = useState<boolean>(true);
  const [midiQuantizeNoteLengths, setMidiQuantizeNoteLengths] = useState<boolean>(false);
  const [midiQuantizeLivePreview, setMidiQuantizeLivePreview] = useState<boolean>(false);
  const [midiQuantizeSummary, setMidiQuantizeSummary] = useState<string | null>(null);
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [selectedNoteIdsByClip, setSelectedNoteIdsByClip] = useState<Record<string, string[]>>({});

  // Hardware MIDI Learn & Controller Desk State
  const [isMidiLearnMode, setIsMidiLearnMode] = useState<boolean>(() => midiLearnService.getLearnModeActive());
  const [isVirtualControllerOpen, setIsVirtualControllerOpen] = useState<boolean>(false);
  const [midiMappings, setMidiMappings] = useState<MidiControlMapping[]>(() => midiLearnService.getAllMappings());
  const [learningTarget, setLearningTarget] = useState<MidiLearningTarget | null>(() => midiLearnService.getLearningTarget());

  useEffect(() => {
    const unsubLearn = midiLearnService.subscribeLearnMode((active, target) => {
      setIsMidiLearnMode(active);
      setLearningTarget(target);
    });

    const unsubMappings = midiLearnService.subscribeChange((mappings) => {
      setMidiMappings(mappings);
      setLearningTarget(midiLearnService.getLearningTarget());
    });

    const unsubControl = midiLearnService.onControlValueChange((mapping, normalizedVal) => {
      if (mapping.trackId && mapping.targetType === 'volume') {
        updateTrackRef.current(mapping.trackId, { volume: parseFloat(normalizedVal.toFixed(3)) });
      } else if (mapping.trackId && mapping.targetType === 'pan') {
        updateTrackRef.current(mapping.trackId, { pan: parseFloat(normalizedVal.toFixed(2)) });
      }
    });

    const unsubMasterGain = midiLearnService.registerControl('master-gain', (val) => {
      setMasterGain(Number(Math.max(0, Math.min(1, val)).toFixed(3)));
    });

    return () => {
      unsubLearn();
      unsubMappings();
      unsubControl();
      unsubMasterGain();
    };
  }, []);

  const handleStartMidiLearn = (target: MidiLearningTarget) => {
    setLearningTarget(target);
    setIsMidiLearnMode(true);
    midiLearnService.startLearning(target);
  };

  const [timelineMarkers, setTimelineMarkers] = useState<TimelineMarker[]>([
    { id: 'intro', position: 0.125, label: 'Intro' },
    { id: 'drop', position: 0.5, label: 'Drop / Chorus' },
    { id: 'outro', position: 0.875, label: 'Outro' }
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAceStepStripOpen, setIsAceStepStripOpen] = useState<boolean>(() => {
    return localStorage.getItem('strangelet_acestep_strip_open') === 'true';
  });
  const [isVstBrowserOpen, setIsVstBrowserOpen] = useState<boolean>(() => {
    return localStorage.getItem('strangelet_vst_browser_open') !== 'false';
  });
  const [layoutMode, setLayoutMode] = useState<MixerLayoutMode>(() => {
    const saved = localStorage.getItem('strangelet_mixer_layout_mode');
    return (saved === 'pure' || saved === 'arrange' || saved === 'console' || saved === 'split') ? saved : 'split';
  });
  const lastTimelineModeRef = useRef<'pure' | 'arrange'>(layoutMode === 'pure' ? 'pure' : 'arrange');
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState<boolean>(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const masterFaderRef = useRef<HTMLDivElement>(null);
  const [isDraggingMasterFader, setIsDraggingMasterFader] = useState<boolean>(false);
  const {
    enabled: snapEnabled,
    division: snapDivision,
    showGridLines,
    toggleEnabled: toggleSnapEnabled,
    setDivision: setSnapDivision,
    toggleShowGridLines
  } = useSnapGrid();

  const handleSetLayoutMode = (mode: MixerLayoutMode) => {
    if (mode === 'pure' || mode === 'arrange') {
      lastTimelineModeRef.current = mode;
    }
    setLayoutMode(mode);
    localStorage.setItem('strangelet_mixer_layout_mode', mode);
    playLaserBeamSound('laser_select');
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target as Node)) {
        setIsToolsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Tab key shortcut: cycles between Arrange (Timeline Only) and Console (Mixer Only)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (
        isExportModalOpen ||
        isBatchStemExportOpen ||
        isChronoMapOpen ||
        isBeamSplitterOpen ||
        isAceStepOpen ||
        isFaustDspOpen ||
        isBasicPitchOpen ||
        isMidiEditorOpen ||
        isVirtualControllerOpen ||
        selectedMidiData !== null
      ) {
        return;
      }
      e.preventDefault();
      setLayoutMode(prev => {
        const next: MixerLayoutMode =
          prev === 'console' ? lastTimelineModeRef.current : 'console';
        localStorage.setItem('strangelet_mixer_layout_mode', next);
        return next;
      });
      playLaserBeamSound('laser_select');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isExportModalOpen,
    isBatchStemExportOpen,
    isChronoMapOpen,
    isBeamSplitterOpen,
    isAceStepOpen,
    isFaustDspOpen,
    isBasicPitchOpen,
    isMidiEditorOpen,
    isVirtualControllerOpen,
    selectedMidiData
  ]);

  // Vertical Master Console Fader Drag Handler
  useEffect(() => {
    if (!isDraggingMasterFader) return;
    const handleMove = (clientY: number) => {
      if (!masterFaderRef.current) return;
      const rect = masterFaderRef.current.getBoundingClientRect();
      const ratio = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      setMasterGain(Number(ratio.toFixed(3)));
    };
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientY);
    const onMouseUp = () => setIsDraggingMasterFader(false);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDraggingMasterFader]);

  const handleToggleVstBrowser = () => {
    setIsVstBrowserOpen(prev => {
      const next = !prev;
      localStorage.setItem('strangelet_vst_browser_open', String(next));
      return next;
    });
    playLaserBeamSound('laser_select');
  };

  // --- MACRO ENGINE STATE & LIVE RECORD / REPLAY / MIDI TRIGGERING ---
  const [isMacroPanelOpen, setIsMacroPanelOpen] = useState<boolean>(() => {
    return localStorage.getItem('strangelet_macro_panel_open') === 'true';
  });
  const [isRecordingMacro, setIsRecordingMacro] = useState<boolean>(false);
  const [recordedMacroEvents, setRecordedMacroEvents] = useState<MacroEvent[]>([]);
  const [recordingElapsedMs, setRecordingElapsedMs] = useState<number>(0);
  const [activeMacroId, setActiveMacroId] = useState<string | null>(null);
  const [macroPlaybackProgress, setMacroPlaybackProgress] = useState<number>(0);

  const macroRecStartRef = useRef<number>(0);
  const macroPendingNameRef = useRef<string>('Performance Macro');
  const recordedMacroEventsRef = useRef<MacroEvent[]>([]);
  const isReplayingMacroRef = useRef<boolean>(false);
  const prevTracksForMacroRef = useRef<Track[]>(tracks);
  const prevMasterForMacroRef = useRef<number>(masterGain);
  const macroRafRef = useRef<number | null>(null);
  const tracksRef = useRef<Track[]>(tracks);
  tracksRef.current = tracks;

  const [isTemplatePanelOpen, setIsTemplatePanelOpen] = useState<boolean>(() => {
    return localStorage.getItem('strangelet_template_panel_open') === 'true';
  });

  const handleToggleMacroPanel = () => {
    setIsMacroPanelOpen(prev => {
      const next = !prev;
      localStorage.setItem('strangelet_macro_panel_open', String(next));
      if (next) {
        setIsTemplatePanelOpen(false);
        localStorage.setItem('strangelet_template_panel_open', 'false');
      }
      return next;
    });
    playLaserBeamSound('laser_select');
  };

  const handleToggleTemplatePanel = () => {
    setIsTemplatePanelOpen(prev => {
      const next = !prev;
      localStorage.setItem('strangelet_template_panel_open', String(next));
      if (next) {
        setIsMacroPanelOpen(false);
        localStorage.setItem('strangelet_macro_panel_open', 'false');
      }
      return next;
    });
    playLaserBeamSound('laser_select');
  };

  const appendMacroEvent = (ev: Omit<MacroEvent, 'id' | 'timestampMs'>) => {
    const timestampMs = Math.max(0, Math.round(performance.now() - macroRecStartRef.current));
    const fullEvent: MacroEvent = {
      ...ev,
      id: `mev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestampMs
    };
    recordedMacroEventsRef.current = [...recordedMacroEventsRef.current, fullEvent];
    setRecordedMacroEvents(recordedMacroEventsRef.current);
  };

  const handleStartRecordMacro = (name: string) => {
    macroPendingNameRef.current = name.trim() || 'Performance Macro';
    macroRecStartRef.current = performance.now();
    recordedMacroEventsRef.current = [];
    prevTracksForMacroRef.current = tracks;
    prevMasterForMacroRef.current = masterGain;
    setRecordedMacroEvents([]);
    setRecordingElapsedMs(0);
    setIsRecordingMacro(true);
    playLaserBeamSound('laser_select');
  };

  const handleStopRecordMacro = () => {
    setIsRecordingMacro(false);
    const events = recordedMacroEventsRef.current;
    const elapsed = Math.max(400, Math.round(performance.now() - macroRecStartRef.current));
    const lastTs = events.length > 0 ? events[events.length - 1].timestampMs : elapsed;
    const durationMs = Math.max(500, lastTs, elapsed);
    if (events.length > 0) {
      macroEngineService.saveMacro({
        name: macroPendingNameRef.current,
        durationMs,
        events,
        loop: false,
        speed: 1,
        color: '#FF8C00'
      });
    }
    recordedMacroEventsRef.current = [];
    setRecordedMacroEvents([]);
    setRecordingElapsedMs(0);
    playLaserBeamSound('laser_curve');
  };

  // Elapsed recording timer & VST wrapper parameter capture
  useEffect(() => {
    if (!isRecordingMacro) return;
    const timer = window.setInterval(() => {
      setRecordingElapsedMs(Math.round(performance.now() - macroRecStartRef.current));
    }, 80);

    const unsubVst = vstWrapperService.onParameterChange((ev) => {
      if (isReplayingMacroRef.current) return;
      const matchedTrack = tracksRef.current.find(t => t.id === ev.trackId);
      appendMacroEvent({
        kind: ev.isBypassToggle ? 'vst_bypass' : 'vst_param',
        trackId: ev.trackId,
        trackName: matchedTrack?.name,
        instanceId: ev.instanceId,
        pluginId: ev.pluginId,
        pluginName: ev.pluginName,
        paramId: ev.paramId,
        label: ev.paramName,
        value: ev.value,
        min: ev.min,
        max: ev.max,
        unit: ev.unit
      });
    });

    return () => {
      window.clearInterval(timer);
      unsubVst();
    };
  }, [isRecordingMacro]);

  // Capture track volume, pan, mute, vstBypass & masterGain moves while recording a macro
  useEffect(() => {
    if (!isRecordingMacro || isReplayingMacroRef.current) {
      prevTracksForMacroRef.current = tracks;
      prevMasterForMacroRef.current = masterGain;
      return;
    }

    const prevTracks = prevTracksForMacroRef.current;
    tracks.forEach((trk) => {
      const prev = prevTracks.find(p => p.id === trk.id);
      if (!prev) return;
      if (Math.abs(trk.volume - prev.volume) > 0.004) {
        appendMacroEvent({
          kind: 'volume',
          trackId: trk.id,
          trackName: trk.name,
          label: 'Volume',
          value: Number(trk.volume.toFixed(3)),
          min: 0,
          max: 1
        });
      }
      if (Math.abs(trk.pan - prev.pan) > 0.01) {
        appendMacroEvent({
          kind: 'pan',
          trackId: trk.id,
          trackName: trk.name,
          label: 'Pan',
          value: Number(trk.pan.toFixed(2)),
          min: -1,
          max: 1
        });
      }
      if (trk.vstBypassed !== prev.vstBypassed) {
        appendMacroEvent({
          kind: 'track_bypass',
          trackId: trk.id,
          trackName: trk.name,
          label: 'Track FX Bypass',
          value: trk.vstBypassed ? 1 : 0,
          min: 0,
          max: 1
        });
      }
      if (trk.muted !== prev.muted) {
        appendMacroEvent({
          kind: 'mute',
          trackId: trk.id,
          trackName: trk.name,
          label: 'Mute',
          value: trk.muted ? 1 : 0,
          min: 0,
          max: 1
        });
      }
    });

    if (Math.abs(masterGain - prevMasterForMacroRef.current) > 0.005) {
      appendMacroEvent({
        kind: 'master_gain',
        label: 'Master Gain',
        value: Number(masterGain.toFixed(3)),
        min: 0,
        max: 1
      });
    }

    prevTracksForMacroRef.current = tracks;
    prevMasterForMacroRef.current = masterGain;
  }, [tracks, masterGain, isRecordingMacro]);

  const handleStopMacroPlayback = () => {
    if (macroRafRef.current) {
      cancelAnimationFrame(macroRafRef.current);
      macroRafRef.current = null;
    }
    isReplayingMacroRef.current = false;
    setActiveMacroId(null);
    setMacroPlaybackProgress(0);
  };

  const applySingleMacroEvent = (ev: MacroEvent) => {
    isReplayingMacroRef.current = true;
    try {
      if (ev.kind === 'master_gain') {
        setMasterGain(Math.max(0, Math.min(1, ev.value)));
        return;
      }

      const currentTracks = tracksRef.current;
      const targetTrack =
        currentTracks.find(t => t.id === ev.trackId) ||
        (ev.trackName ? currentTracks.find(t => t.name.toLowerCase() === ev.trackName!.toLowerCase()) : undefined) ||
        currentTracks[0];

      if (ev.kind === 'volume' && targetTrack) {
        updateTrack(targetTrack.id, { volume: Math.max(0, Math.min(1, ev.value)) });
      } else if (ev.kind === 'pan' && targetTrack) {
        updateTrack(targetTrack.id, { pan: Math.max(-1, Math.min(1, ev.value)) });
      } else if (ev.kind === 'track_bypass' && targetTrack) {
        updateTrack(targetTrack.id, { vstBypassed: ev.value >= 0.5 });
      } else if (ev.kind === 'mute' && targetTrack) {
        updateTrack(targetTrack.id, { muted: ev.value >= 0.5 });
      } else if ((ev.kind === 'vst_param' || ev.kind === 'vst_bypass') && ev.paramId) {
        const allInstances = vstWrapperService.getAllInstances();
        const inst =
          (ev.instanceId ? allInstances.find(i => i.instanceId === ev.instanceId) : undefined) ||
          allInstances.find(
            i =>
              (!ev.trackId || i.trackId === ev.trackId || (targetTrack && i.trackId === targetTrack.id)) &&
              (!ev.pluginId || i.pluginId === ev.pluginId)
          ) ||
          (ev.pluginId ? allInstances.find(i => i.pluginId === ev.pluginId) : undefined);

        if (inst) {
          if (ev.kind === 'vst_bypass') {
            vstWrapperService.setBypass(inst.instanceId, ev.value >= 0.5);
          } else {
            vstWrapperService.updateParameterLive(inst.instanceId, ev.paramId, ev.value);
          }
        }
      }
    } finally {
      window.setTimeout(() => {
        isReplayingMacroRef.current = false;
      }, 0);
    }
  };

  const handleTriggerMacro = (macro: PerformanceMacro) => {
    handleStopMacroPlayback();
    if (macro.events.length === 0) return;

    const sortedEvents = [...macro.events].sort((a, b) => a.timestampMs - b.timestampMs);
    const totalDuration = Math.max(250, macro.durationMs, sortedEvents[sortedEvents.length - 1].timestampMs);
    let cycleStartMs = performance.now();
    let nextIdx = 0;

    setActiveMacroId(macro.id);
    setMacroPlaybackProgress(0);
    playLaserBeamSound('laser_curve');

    const step = (now: number) => {
      const scaledElapsed = (now - cycleStartMs) * macro.speed;
      while (nextIdx < sortedEvents.length && sortedEvents[nextIdx].timestampMs <= scaledElapsed) {
        applySingleMacroEvent(sortedEvents[nextIdx]);
        nextIdx++;
      }

      const progress = Math.max(0, Math.min(1, scaledElapsed / totalDuration));
      setMacroPlaybackProgress(progress);

      if (scaledElapsed >= totalDuration) {
        if (macro.loop) {
          cycleStartMs = now;
          nextIdx = 0;
          setMacroPlaybackProgress(0);
          macroRafRef.current = requestAnimationFrame(step);
        } else {
          macroRafRef.current = null;
          setActiveMacroId(null);
          setMacroPlaybackProgress(0);
        }
        return;
      }
      macroRafRef.current = requestAnimationFrame(step);
    };

    macroRafRef.current = requestAnimationFrame(step);
  };

  const triggerMacroRef = useRef(handleTriggerMacro);
  triggerMacroRef.current = handleTriggerMacro;

  // Register every Performance Macro with midiLearnService so MIDI controller buttons trigger it anytime
  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const syncMidiRegistrations = () => {
      unsubs.forEach(u => u());
      const macros = macroEngineService.getMacros();
      unsubs = macros.map((macro) =>
        midiLearnService.registerControl(macroEngineService.getMidiControlId(macro.id), () => {
          triggerMacroRef.current(macro);
        })
      );
    };

    syncMidiRegistrations();
    const unsubMacros = macroEngineService.subscribe(syncMidiRegistrations);

    return () => {
      unsubMacros();
      unsubs.forEach(u => u());
      if (macroRafRef.current) cancelAnimationFrame(macroRafRef.current);
    };
  }, []);

  const handleBakeMacroToTimeline = (macro: PerformanceMacro) => {
    projectHistory.pushSnapshot(`Bake Macro [${macro.name}]`, tracks, tempo);
    const nextTracks = macroEngineService.bakeMacroToTracks(macro, tracks, tempo, playheadPosition);
    setTracks(nextTracks);
    if (layoutMode === 'console') {
      handleSetLayoutMode('split');
    }
    playLaserBeamSound('laser_curve');
  };

  // --- AUTO-MIX SNAPSHOT HANDLERS ---
  const handleSaveMixSnapshot = (slot: number, customName?: string) => {
    mixSnapshotService.saveToSlot(slot, tracks, masterGain, tempo, customName);
    playLaserBeamSound('laser_select');
  };

  const handleApplyMixSnapshot = (slot: number) => {
    const result = mixSnapshotService.applySnapshot(slot, tracks);
    if (!result) return;
    projectHistory.pushSnapshot(`Recall Mix Snapshot ${slot} [${result.snapshot.name}]`, tracks, tempo);
    setTracks(result.tracks);
    setMasterGain(result.masterGain);
    playLaserBeamSound('laser_curve');
  };

  const handleAddAudioTrack = () => {
    const newId = `track-audio-${Date.now()}`;
    const newTrack: Track = {
      id: newId,
      name: `Audio Track ${tracks.length + 1}`,
      type: 'audio',
      volume: 0.8,
      pan: 0,
      muted: false,
      soloed: false,
      color: '#10B981',
      phaseInverted: false,
      isMono: false,
      vstBypassed: true,
      isArmedForRecord: isAutoArm ? true : false,
      clips: []
    };
    projectHistory.pushSnapshot('Add Audio Track', tracks, tempo);
    playLaserBeamSound('laser_audio');
    if (isAutoArm) {
      if (propOnSelectTrack) propOnSelectTrack(newId);
      else setInternalSelectedTrackId(newId);
      setTracks(prev => [...prev.map(t => ({ ...t, isArmedForRecord: false })), newTrack]);
    } else {
      setTracks(prev => [...prev, newTrack]);
    }
  };
  
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const trackNodesRef = useRef<Record<string, AudioNodes>>({});
  const masterGainRef = useRef<GainNode | null>(null);

  useEffect(() => {
      if (masterGainRef.current) {
          masterGainRef.current.gain.value = masterGain;
      }
  }, [masterGain]);

  const handleDeleteTrack = (trackId: string) => {
    const target = tracks.find(t => t.id === trackId);
    if (!target) return;
    projectHistory.pushSnapshot(`Delete Track [${target.name}]`, tracks, tempo);
    playLaserBeamSound('laser_erase');
    setTracks(prev => prev.filter(t => t.id !== trackId));
  };

  const handleDuplicateTrack = (trackId: string) => {
    const target = tracks.find(t => t.id === trackId);
    if (!target) return;
    const duplicated: Track = {
      ...target,
      id: `track-dup-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: `${target.name} (Copy)`,
      clips: target.clips.map(c => ({
        ...c,
        id: `clip-dup-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      }))
    };
    projectHistory.pushSnapshot(`Duplicate Track [${target.name}]`, tracks, tempo);
    playLaserBeamSound('laser_curve');
    setTracks(prev => [...prev, duplicated]);
  };

  const handleOpenMidiEditorForTrack = (track: Track) => {
    const firstClip = track.clips[0];
    const notes = firstClip?.midiNotes || [];
    setMidiEditorNotes(notes);
    setMidiEditorClipName(firstClip?.name || track.name);
    setMidiEditorInstrument(track.instrument || 'SFZ Grand Piano');
    setMidiEditorTargetTrackId(track.id);
    setMidiEditorTargetClipId(firstClip?.id || null);
    setIsMidiEditorOpen(true);
  };

  const handleOpenMidiEditorForClip = (clip: Clip) => {
    const parentTrack = tracks.find(t => t.clips.some(c => c.id === clip.id));
    setMidiEditorNotes(clip.midiNotes || []);
    setMidiEditorClipName(clip.name);
    setMidiEditorInstrument(clip.instrument || parentTrack?.instrument || 'SFZ Grand Piano');
    setMidiEditorTargetTrackId(parentTrack?.id || null);
    setMidiEditorTargetClipId(clip.id);
    setIsMidiEditorOpen(true);
  };

  const handleSaveMidiEditorNotes = (notes: MidiNoteEvent[], name?: string, inst?: string) => {
    if (midiEditorTargetTrackId && midiEditorTargetClipId) {
      const track = tracks.find(t => t.id === midiEditorTargetTrackId);
      if (track) {
        updateTrack(midiEditorTargetTrackId, {
          instrument: inst || midiEditorInstrument,
          clips: track.clips.map(c => {
            if (c.id === midiEditorTargetClipId) {
              return {
                ...c,
                name: name || c.name,
                midiNotes: notes,
                instrument: inst || c.instrument
              };
            }
            return c;
          })
        });
      }
    } else if (midiEditorTargetTrackId) {
      const tr = tracks.find(t => t.id === midiEditorTargetTrackId);
      if (tr) {
        const newClip: Clip = {
          id: `midi-clip-${Date.now()}`,
          name: name || 'MIDI Sequence',
          startBar: 0,
          durationBars: 4,
          isMidi: true,
          midiNotes: notes,
          instrument: inst || midiEditorInstrument
        };
        updateTrack(tr.id, {
          instrument: inst || tr.instrument,
          clips: [...tr.clips, newClip]
        });
      }
    }
  };

  const handleExportNewMidiTrackFromEditor = (trackName: string, notes: MidiNoteEvent[], inst: string) => {
    const newTrackId = `track-midi-${Date.now()}`;
    const newClip: Clip = {
      id: `clip-midi-${Date.now()}`,
      name: trackName,
      startBar: 0,
      durationBars: 4,
      isMidi: true,
      midiNotes: notes,
      instrument: inst
    };
    const newTrack: Track = {
      id: newTrackId,
      name: trackName,
      type: 'midi',
      volume: 0.82,
      pan: 0,
      muted: false,
      soloed: false,
      color: '#A855F7',
      phaseInverted: false,
      isMono: false,
      vstBypassed: true,
      instrument: inst,
      humanizeEnabled: true,
      humanizeAmount: 0.18,
      midiConfig: {
        humanizeEnabled: true,
        humanizeAmount: 0.18
      },
      clips: [newClip]
    };
    setTracks(prev => [...prev, newTrack]);
  };

  // Handle ChronoMap & ChronoPins synchronization & pin placement
  const handleApplyChronoMap = (result: {
    trackName: string;
    bpm: number;
    setProjectBpm: boolean;
    plantTimelineMarkers: boolean;
    audioBuffer: AudioBuffer;
    audioUrl?: string;
    chronoPins: ChronoPin[];
    targetTrackId?: string;
    downbeatSeconds: number;
    totalBars: number;
  }) => {
    // 1. Lock global project BPM if requested
    if (result.setProjectBpm) {
      setTempo(result.bpm);
    }

    // 2. Plant Chrono-Pins into the timeline ruler
    if (result.plantTimelineMarkers && result.chronoPins.length > 0) {
      const activeBpm = result.setProjectBpm ? result.bpm : tempo;
      const totalSessionSeconds = (60 / activeBpm) * 4 * TOTAL_BARS;

      const newMarkers: TimelineMarker[] = result.chronoPins.map(pin => {
        const normPos = Math.max(0, Math.min(1, pin.timeSeconds / totalSessionSeconds));
        return {
          id: pin.id,
          position: normPos,
          label: pin.isDownbeat ? 'Chrono 1.1' : `Chrono ${pin.measure}.1`,
          color: pin.isDownbeat ? '#FFD700' : '#00F0FF',
          isChronoPin: true,
          barNumber: pin.measure
        };
      });

      setTimelineMarkers(prev => [
        ...prev.filter(m => !m.isChronoPin),
        ...newMarkers
      ].sort((a, b) => a.position - b.position));
    }

    // 3. Update existing or insert new Audio Track (preserving ChronoPins on the Clip)
    if (result.targetTrackId) {
      updateTrack(result.targetTrackId, {
        name: `${result.trackName} [${result.bpm.toFixed(1)} BPM]`,
        clips: [{
          id: `clip-${Date.now()}`,
          name: `${result.trackName} (${result.bpm.toFixed(1)} BPM)`,
          startBar: 0,
          durationBars: Math.min(TOTAL_BARS, result.totalBars),
          originalDurationBars: Math.min(TOTAL_BARS, result.totalBars),
          audioUrl: result.audioUrl,
          chronoPins: result.chronoPins,
          chronoLatchEnabled: true
        }]
      });
      audioService.setTrackAudioBuffer(result.targetTrackId, result.audioBuffer);
    } else {
      const newTrackId = `chronomap-track-${Date.now()}`;
      const newTrack: Track = {
        id: newTrackId,
        name: `${result.trackName} [${result.bpm.toFixed(1)} BPM]`,
        type: 'audio',
        volume: 0.85,
        pan: 0,
        muted: false,
        soloed: false,
        color: '#00F0FF',
        phaseInverted: false,
        isMono: false,
        vstBypassed: true,
        clips: [{
          id: `clip-${Date.now()}`,
          name: `${result.trackName} (${result.bpm.toFixed(1)} BPM)`,
          startBar: 0,
          durationBars: Math.min(TOTAL_BARS, result.totalBars),
          originalDurationBars: Math.min(TOTAL_BARS, result.totalBars),
          audioUrl: result.audioUrl,
          chronoPins: result.chronoPins,
          chronoLatchEnabled: true
        }]
      };
      setTracks(prev => [...prev, newTrack]);
      audioService.setTrackAudioBuffer(newTrackId, result.audioBuffer);
    }
  };

  // Handle Beam Splitter & Optical Prism Chopper injections
  const handleApplyBeamSplitter = (result: BeamSplitterResult) => {
    const isOff = snapValue === 'off' || snapValue === 'freeform';
    const effectiveStartBar = isOff ? result.targetStartBar : snapToGrid(result.targetStartBar, snapValue);

    if (result.mode === 'loop') {
      const durationBars = result.loopRange?.durationBars || 1;
      const newClip: Clip = {
        id: `clip-beam-loop-${Date.now()}`,
        name: result.sourceName,
        startBar: effectiveStartBar,
        durationBars,
        audioUrl: result.audioUrl
      };

      if (result.targetTrackId) {
        setTracks(prev => prev.map(t => {
          if (t.id === result.targetTrackId) {
            return { ...t, clips: [...t.clips, newClip] };
          }
          return t;
        }));
        audioService.setTrackAudioBuffer(result.targetTrackId, result.audioBuffer);
      } else {
        const newTrackId = `track-beam-prism-${Date.now()}`;
        const newTrack: Track = {
          id: newTrackId,
          name: 'Prism Loop Track',
          type: 'audio',
          volume: 0.85,
          pan: 0,
          muted: false,
          soloed: false,
          phaseInverted: false,
          isMono: false,
          vstBypassed: true,
          color: '#00F0FF',
          clips: [newClip]
        };
        setTracks(prev => [...prev, newTrack]);
        audioService.setTrackAudioBuffer(newTrackId, result.audioBuffer);
      }
    } else if (result.mode === 'hits') {
      const slices = result.slices || [];
      const secondsPerBar = (60 / tempo) * 4;

      const newClips: Clip[] = slices.map((slice, idx) => {
        const sliceBars = Math.max(0.0625, Number((slice.durationSeconds / secondsPerBar).toFixed(3)));
        const offsetBars = Number((slice.startSeconds / secondsPerBar).toFixed(3));

        return {
          id: `clip-beam-hit-${slice.id}-${idx}`,
          name: `${slice.label} [${slice.hitType}]`,
          startBar: Number((result.targetStartBar + offsetBars).toFixed(3)),
          durationBars: sliceBars,
          audioUrl: result.audioUrl
        };
      });

      if (result.targetTrackId) {
        setTracks(prev => prev.map(t => {
          if (t.id === result.targetTrackId) {
            return { ...t, clips: [...t.clips, ...newClips] };
          }
          return t;
        }));
        audioService.setTrackAudioBuffer(result.targetTrackId, result.audioBuffer);
      } else {
        const newTrackId = `track-refracted-hits-${Date.now()}`;
        const newTrack: Track = {
          id: newTrackId,
          name: 'Refracted Ray Hits',
          type: 'audio',
          volume: 0.85,
          pan: 0,
          muted: false,
          soloed: false,
          phaseInverted: false,
          isMono: false,
          vstBypassed: true,
          color: '#FF2E63',
          clips: newClips
        };
        setTracks(prev => [...prev, newTrack]);
        audioService.setTrackAudioBuffer(newTrackId, result.audioBuffer);
      }
    } else if (result.mode === 'single_ray' && result.singleRay) {
      const secondsPerBar = (60 / tempo) * 4;
      const sliceBars = Math.max(0.0625, Number((result.singleRay.durationSeconds / secondsPerBar).toFixed(3)));

      const newClip: Clip = {
        id: `clip-ray-single-${Date.now()}`,
        name: result.sourceName,
        startBar: result.targetStartBar,
        durationBars: sliceBars,
        audioUrl: result.audioUrl
      };

      if (result.targetTrackId) {
        setTracks(prev => prev.map(t => {
          if (t.id === result.targetTrackId) {
            return { ...t, clips: [...t.clips, newClip] };
          }
          return t;
        }));
        audioService.setTrackAudioBuffer(result.targetTrackId, result.audioBuffer);
      } else {
        const newTrackId = `track-ray-paint-${Date.now()}`;
        const newTrack: Track = {
          id: newTrackId,
          name: 'Prism Painted Track',
          type: 'audio',
          volume: 0.85,
          pan: 0,
          muted: false,
          soloed: false,
          phaseInverted: false,
          isMono: false,
          vstBypassed: true,
          color: result.singleRay?.color || '#00F0FF',
          clips: [newClip]
        };
        setTracks(prev => [...prev, newTrack]);
        audioService.setTrackAudioBuffer(newTrackId, result.audioBuffer);
      }
    }
  };

  const isArmedAny = tracks.some(t => t.isArmedForRecord);

  const initAudio = () => {
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') return;

    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = context;

    const masterGainNode = context.createGain();
    masterGainNode.gain.value = masterGain; 
    masterGainNode.connect(context.destination);
    masterGainRef.current = masterGainNode;

    // Connect to shared master audio bus for real-time spectral analysis
    masterAudioBus.connectToMaster(masterGainNode);

    tracks.forEach((track, idx) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const panner = context.createStereoPanner();
      
      let freq = 440;
      let type: OscillatorType = 'sine';
      
      const trackName = track.name.toLowerCase();
      if (trackName.includes('vocal')) {
        freq = 329.63; // E4
        type = 'triangle';
      } else if (trackName.includes('drum')) {
        freq = 82.41; // E2 kick/sub
        type = 'sawtooth';
      } else if (trackName.includes('bass')) {
        freq = 110.0; // A2
        type = 'sawtooth';
      } else if (trackName.includes('synth')) {
        freq = 220.0; // A3
        type = 'sine';
      } else {
        const chord = [220, 261.63, 329.63, 392, 440, 523.25];
        freq = chord[idx % chord.length];
      }

      oscillator.frequency.value = freq;
      oscillator.type = type;
      
      gain.gain.value = 0; // Start silent
      panner.pan.value = track.pan;

      oscillator.connect(gain).connect(panner);
      panner.connect(masterGainNode);
      oscillator.start();
      
      trackNodesRef.current[track.id] = { oscillator, gain, panner };
    });
  };

  // Timeline animation
  useEffect(() => {
    const animate = () => {
      setPlayheadPosition(prev => {
        let nextPos = prev + 0.0006; // Transport playback progression
        
        if (loopEnabled) {
          if (nextPos >= loopRange.end) {
            return loopRange.start;
          }
        } else {
          if (nextPos >= 1) {
            setIsPlaying(false);
            return 0;
          }
        }
        return nextPos;
      });
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, loopEnabled, loopRange]);

  // Unmount cleanup: stop all oscillators, disconnect DSP graph, cancel animation frames, and close AudioContext
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (macroRafRef.current) {
        cancelAnimationFrame(macroRafRef.current);
        macroRafRef.current = null;
      }
      Object.values(trackNodesRef.current).forEach((nodes) => {
        try { nodes.oscillator.stop(); } catch (_) {}
        try { nodes.oscillator.disconnect(); } catch (_) {}
        try { nodes.gain.disconnect(); } catch (_) {}
        try { nodes.panner.disconnect(); } catch (_) {}
      });
      trackNodesRef.current = {};
      if (masterGainRef.current) {
        try { masterGainRef.current.disconnect(); } catch (_) {}
        masterGainRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      audioContextRef.current = null;
    };
  }, []);

  // Audio state controller: dynamically evaluates volume & pan automation curves in real-time
  useEffect(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') return;

    const context = audioContextRef.current;
    const anySoloed = tracks.some(t => t.soloed);

    tracks.forEach((track, idx) => {
      let nodes = trackNodesRef.current[track.id];
      
      // Lazily setup node if missing for new track
      if (!nodes && masterGainRef.current) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const panner = context.createStereoPanner();
        oscillator.frequency.value = 220 + idx * 40;
        oscillator.type = 'triangle';
        gain.gain.value = 0;
        panner.pan.value = track.pan;
        oscillator.connect(gain).connect(panner);
        panner.connect(masterGainRef.current);
        oscillator.start();
        nodes = { oscillator, gain, panner };
        trackNodesRef.current[track.id] = nodes;
      }

      if (nodes) {
        const isMuted = track.muted || (anySoloed && !track.soloed);

        // Evaluate volume from automation curve if enabled, otherwise use track slider
        let activeVolume = track.volume;
        if (track.automation?.volume?.enabled && track.automation.volume.points.length > 0) {
          activeVolume = evaluateAutomationAt(track.automation.volume.points, playheadPosition, track.volume);
        }

        // Evaluate pan from automation curve if enabled, otherwise use track knob
        let activePan = track.pan;
        if (track.automation?.pan?.enabled && track.automation.pan.points.length > 0) {
          activePan = evaluateAutomationAt(track.automation.pan.points, playheadPosition, track.pan);
        }

        const targetVolume = isPlaying && !isMuted ? activeVolume : 0;
        
        nodes.gain.gain.setTargetAtTime(targetVolume, context.currentTime, 0.015);
        nodes.panner.pan.setTargetAtTime(activePan, context.currentTime, 0.015);
      }

      // Evaluate Faust / VST parameter automation lanes & push live updates to wrapper instances
      const paramLanes = track.automation?.params ? Object.values(track.automation.params) : [];
      if (isPlaying && paramLanes.length > 0 && !track.vstBypassed) {
        const trackInstances = vstWrapperService.getInstancesForTrack(track.id);
        paramLanes.forEach(pLane => {
          if (!pLane.enabled || pLane.points.length === 0) return;
          const liveVal = evaluateAutomationAt(pLane.points, playheadPosition, pLane.defaultValue);
          const matchedInst = pLane.instanceId
            ? trackInstances.find(i => i.instanceId === pLane.instanceId)
            : trackInstances.find(i => i.pluginId === pLane.pluginId || i.name.toLowerCase() === pLane.pluginName.toLowerCase());
          if (matchedInst && !matchedInst.bypassed) {
            vstWrapperService.updateParameterLive(matchedInst.instanceId, pLane.paramId, liveVal);
          }
        });
      }
    });
  }, [tracks, isPlaying, playheadPosition]);

  // Live Multitrack Recording Toggle
  const handleToggleRecord = async () => {
    initAudio();
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    if (isRecording) {
      // Stop live recording & create real track clips
      const takes = await liveRecordingEngine.stopRecording();
      setIsRecording(false);
      setIsPlaying(false);

      if (takes && takes.length > 0) {
        takes.forEach(take => {
          const targetTrack = tracks.find(t => t.id === take.trackId);
          if (targetTrack) {
            const totalSeconds = (16 * 4 * 60) / tempo;
            const durBars = Math.max(1, Math.min(16, Math.round((take.durationSeconds / totalSeconds) * 16)));
            const rawBar = playheadPosition * 16;
            const isOff = snapValue === 'off' || snapValue === 'freeform';
            const snappedStart = isOff ? rawBar : snapToGrid(rawBar, snapValue);
            const newClip: Clip = {
              id: `rec-take-${Math.random().toString(36).substr(2, 7)}`,
              name: `Take ${targetTrack.clips.length + 1} (Live Mic)`,
              startBar: Math.max(0, Math.min(16 - durBars, Number(snappedStart.toFixed(4)))),
              durationBars: durBars,
              isRecorded: true,
              audioUrl: take.url,
              waveformSnippet: take.waveform
            };
            updateTrack(targetTrack.id, {
              clips: [...targetTrack.clips, newClip]
            });
          }
        });
      }
      playLaserBeamSound('laser_audio');
    } else {
      // Start live recording
      let armed = tracks.filter(t => t.isArmedForRecord);
      // Auto-arm first audio track if none armed
      if (armed.length === 0) {
        const defaultAudio = tracks.find(t => t.type === 'audio') || tracks[0];
        if (defaultAudio) {
          updateTrack(defaultAudio.id, { isArmedForRecord: true });
          armed = [defaultAudio];
        }
      }

      if (audioContextRef.current) {
        await liveRecordingEngine.initMic(audioContextRef.current, (lvl) => {
          setMicInputLevel(lvl);
        });
      }

      liveRecordingEngine.startRecording(armed.map(t => t.id));
      setIsRecording(true);
      setIsPlaying(true);
    }
  };

  const handleTransportClick = (action: 'play' | 'pause' | 'stop' | 'rewind' | 'loop') => {
    switch(action) {
      case 'play':
        initAudio();
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
        setIsPlaying(true);
        tracks.forEach(track => {
            if (!track.muted && !track.soloed) {
                audioService.playTrack(track.id, playheadPosition * 10);
            }
        });
        break;
      case 'pause':
        if (isRecording) {
          handleToggleRecord();
        } else {
          setIsPlaying(false);
          tracks.forEach(track => audioService.stopTrack(track.id));
        }
        break;
      case 'stop':
        if (isRecording) {
          handleToggleRecord();
        }
        setIsPlaying(false);
        setPlayheadPosition(0);
        tracks.forEach(track => audioService.stopTrack(track.id));
        break;
      case 'rewind':
        setPlayheadPosition(0);
        break;
      case 'loop':
        setLoopEnabled(prev => !prev);
        break;
    }
  };

  // Global Snap Grid Division handler (syncs persistently across Mixer, Timeline & MIDI Editor)
  const handleQuantizeChange = (qVal: string) => {
    setSnapDivision(qVal);
    setSnapValue(qVal);
    playLaserBeamSound('laser_select');
  };

  const handleSnapAllClips = () => {
    if (snapValue === 'off' || snapValue === 'freeform') return;
    projectHistory.pushSnapshot(`Snap All Clips to Grid (${snapValue})`, tracks, tempo);
    playLaserBeamSound('laser_curve');
    setTracks(prev => prev.map(track => ({
      ...track,
      clips: track.clips.map(clip => {
        const snapped = snapToGrid(clip.startBar, snapValue);
        const maxStart = Math.max(0, TOTAL_BARS - clip.durationBars);
        return {
          ...clip,
          startBar: Math.max(0, Math.min(maxStart, Number(snapped.toFixed(4))))
        };
      })
    })));
  };

  // Global MIDI Quantize & Clip/Note Selection Handlers
  const handleToggleSelectClip = (clipId: string, multi: boolean = true) => {
    setSelectedClipIds(prev => {
      if (!multi) {
        return prev.includes(clipId) && prev.length === 1 ? [] : [clipId];
      }
      return prev.includes(clipId)
        ? prev.filter(id => id !== clipId)
        : [...prev, clipId];
    });
  };

  const handleSelectAllMidiClips = () => {
    const allMidiIds: string[] = [];
    tracks.forEach(track => {
      track.clips.forEach(clip => {
        if (isMidiClipOnTrack(clip, track)) {
          allMidiIds.push(clip.id);
        }
      });
    });
    setSelectedClipIds(allMidiIds);
  };

  const handleClearMidiClipSelection = () => {
    setSelectedClipIds([]);
    setSelectedNoteIdsByClip({});
  };

  const handleSetNoteSelectionForClip = (clipId: string, noteIds: string[]) => {
    setSelectedNoteIdsByClip(prev => ({
      ...prev,
      [clipId]: noteIds
    }));
  };

  const runMidiQuantize = (override?: {
    grid?: MidiQuantizeGrid;
    swing?: number;
    strength?: number;
    scope?: MidiQuantizeScope;
    pushUndo?: boolean;
  }) => {
    const activeGrid = override?.grid ?? midiQuantizeGrid;
    const activeSwing = override?.swing ?? midiQuantizeSwing;
    const activeStrength = override?.strength ?? midiQuantizeStrength;
    const activeScope = override?.scope ?? midiQuantizeScope;
    const shouldPushUndo = override?.pushUndo ?? true;

    const result = quantizeMidiTracks(tracks, {
      grid: activeGrid,
      swingPercent: activeSwing,
      strengthPercent: activeStrength,
      scope: activeScope,
      selectedClipIds,
      selectedNoteIdsByClip,
      selectedTrackId,
      quantizeClipStarts: midiQuantizeClipStarts,
      quantizeNoteLengths: midiQuantizeNoteLengths,
      tempo,
      totalBars: TOTAL_BARS
    });

    if (result.quantizedClipCount === 0) {
      setMidiQuantizeSummary('No MIDI clips or notes matched current scope');
      return;
    }

    if (shouldPushUndo) {
      projectHistory.pushSnapshot(
        `MIDI Quantize (${activeGrid}, Swing ${activeSwing}%)`,
        tracks,
        tempo
      );
      playLaserBeamSound('laser_curve');
    }

    setTracks(result.tracks);
    setMidiQuantizeSummary(
      `Quantized ${result.quantizedClipCount} clip${result.quantizedClipCount === 1 ? '' : 's'}, ${result.quantizedNoteCount} note${result.quantizedNoteCount === 1 ? '' : 's'} · ${activeGrid} · ${activeSwing}% swing`
    );
  };

  const handleMidiQuantizeGridChange = (nextGrid: MidiQuantizeGrid) => {
    setMidiQuantizeGrid(nextGrid);
    if (midiQuantizeLivePreview) {
      runMidiQuantize({ grid: nextGrid, pushUndo: false });
    }
  };

  const handleMidiQuantizeSwingChange = (nextSwing: number) => {
    setMidiQuantizeSwing(nextSwing);
    if (midiQuantizeLivePreview) {
      runMidiQuantize({ swing: nextSwing, pushUndo: false });
    }
  };

  const handleMidiQuantizeStrengthChange = (nextStrength: number) => {
    setMidiQuantizeStrength(nextStrength);
    if (midiQuantizeLivePreview) {
      runMidiQuantize({ strength: nextStrength, pushUndo: false });
    }
  };

  const handleRestoreOriginalMidi = () => {
    const targetIds = Array.from(
      resolveTargetClipIds(tracks, {
        scope: midiQuantizeScope,
        selectedClipIds,
        selectedNoteIdsByClip,
        selectedTrackId
      })
    );
    if (targetIds.length === 0) return;

    const restored = restoreOriginalMidiTiming(tracks, targetIds, tempo);
    if (restored.restoredCount > 0) {
      projectHistory.pushSnapshot('Restore Unquantized MIDI Timing', tracks, tempo);
      setTracks(restored.tracks);
      playLaserBeamSound('laser_select');
      setMidiQuantizeSummary(`Restored original timing on ${restored.restoredCount} clip${restored.restoredCount === 1 ? '' : 's'}`);
    }
  };

  const handleCreateSampleMidiTrack = () => {
    const secPerBar = (60 / Math.max(30, tempo)) * 4;
    const baseOffsets = [0, 0.0625, 0.125, 0.1875, 0.25, 0.3125, 0.375, 0.4375, 0.5, 0.5625, 0.625, 0.6875, 0.75, 0.8125, 0.875, 0.9375];
    const pitches = [48, 55, 60, 63, 48, 55, 62, 67, 48, 55, 60, 65, 50, 58, 63, 67];
    const organicJitter = [0.008, -0.013, 0.016, -0.009, 0.004, -0.015, 0.012, -0.011, 0.007, -0.014, 0.015, -0.008, 0.005, -0.016, 0.011, -0.012];

    const notes: MidiNoteEvent[] = baseOffsets.map((barOffset, idx) => {
      const startBar = Math.max(0, Number((barOffset + organicJitter[idx]).toFixed(4)));
      const pitch = pitches[idx];
      return {
        id: `demo-mq-${Date.now()}-${idx}`,
        pitch,
        noteName: midiToNoteName(pitch),
        startBar,
        startTimeSeconds: Number((startBar * secPerBar).toFixed(4)),
        durationBars: 0.055,
        durationSeconds: Number((0.055 * secPerBar).toFixed(4)),
        velocity: idx % 2 === 0 ? 108 : 82,
        confidence: 0.95
      };
    });

    const newTrackId = `track-midi-quantize-${Date.now()}`;
    const newClipId = `clip-midi-quantize-${Date.now()}`;
    const newClip: Clip = {
      id: newClipId,
      name: '16th_Synth_Groove.mid',
      startBar: 0.03,
      durationBars: 2,
      isMidi: true,
      midiNotes: notes,
      instrument: 'TB-303 Acid Synth'
    };

    const newTrack: Track = {
      id: newTrackId,
      name: 'Synth Arp Groove',
      type: 'midi',
      volume: 0.8,
      pan: 0,
      muted: false,
      soloed: false,
      color: '#10B981',
      phaseInverted: false,
      isMono: false,
      vstBypassed: false,
      instrument: 'TB-303 Acid Synth',
      clips: [newClip]
    };

    projectHistory.pushSnapshot('Add Quantizable MIDI Groove Track', tracks, tempo);
    playLaserBeamSound('laser_midi');
    setTracks(prev => [...prev, newTrack]);
    setSelectedClipIds(prev => [...prev, newClipId]);
    setMidiQuantizeSummary('Added Synth Arp Groove clip (ready to quantize)');
  };

  const selectedTrack = tracks.find(t => t.id === selectedTrackId);

  const isPureTimeline = layoutMode === 'pure';
  const isFullTimelineHeight = layoutMode === 'pure' || layoutMode === 'arrange';

  const handleAddMidiTrack = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newTrack: Track = {
      id: newId,
      name: `MIDI Track ${tracks.length + 1}`,
      type: 'midi',
      volume: 0.7,
      pan: 0,
      muted: false,
      soloed: false,
      color: '#A020F0',
      phaseInverted: false,
      isMono: false,
      vstBypassed: false,
      isArmedForRecord: isAutoArm ? true : false,
      clips: []
    };
    projectHistory.pushSnapshot('Add MIDI Track', tracks, tempo);
    playLaserBeamSound('laser_midi');
    if (isAutoArm) {
      if (propOnSelectTrack) propOnSelectTrack(newId);
      else setInternalSelectedTrackId(newId);
      setTracks(prev => [...prev.map(t => ({ ...t, isArmedForRecord: false })), newTrack]);
    } else {
      setTracks(prev => [...prev, newTrack]);
    }
  };

  const renderViewSwitcher = (compact = false) => (
    <div
      className="flex items-center bg-[#070A11] border border-[#1E293B] rounded-lg p-0.5 gap-0.5 shadow-inner select-none"
      role="group"
      aria-label="Workspace View Mode"
      title="Switch layout view — Press [Tab] anywhere to cycle Timeline and Mixer Only"
    >
      <button
        type="button"
        onClick={() => handleSetLayoutMode('pure')}
        className={`${compact ? 'px-2 py-0.5' : 'px-2.5 py-1'} rounded-md text-[10px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer ${
          layoutMode === 'pure'
            ? 'bg-gradient-to-r from-[#00F0FF] to-[#38BDF8] text-black shadow-[0_0_12px_rgba(0,240,255,0.45)]'
            : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]/60'
        }`}
        title="Pure Timeline: Distraction-free full-screen arrangement timeline only"
      >
        <Maximize2 size={11} />
        <span>Pure Timeline</span>
      </button>
      <button
        type="button"
        onClick={() => handleSetLayoutMode('arrange')}
        className={`${compact ? 'px-2 py-0.5' : 'px-2.5 py-1'} rounded-md text-[10px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer ${
          layoutMode === 'arrange'
            ? 'bg-gradient-to-r from-[#FF8C00] to-[#FFD700] text-black shadow-[0_0_12px_rgba(255,140,0,0.45)]'
            : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]/60'
        }`}
        title="Timeline + Tools: Full-height timeline with side panels and mixer transport"
      >
        <LayoutList size={12} />
        <span>Timeline</span>
      </button>
      <button
        type="button"
        onClick={() => handleSetLayoutMode('console')}
        className={`${compact ? 'px-2 py-0.5' : 'px-2.5 py-1'} rounded-md text-[10px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer ${
          layoutMode === 'console'
            ? 'bg-gradient-to-r from-[#FF8C00] to-[#FFD700] text-black shadow-[0_0_12px_rgba(255,140,0,0.45)]'
            : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]/60'
        }`}
        title="Mixer Only (Console): Tall studio height for channel strips & master fader"
      >
        <SlidersHorizontal size={12} />
        <span>Mixer Only</span>
      </button>
      <button
        type="button"
        onClick={() => handleSetLayoutMode('split')}
        className={`${compact ? 'px-2 py-0.5' : 'px-2.5 py-1'} rounded-md text-[10px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer ${
          layoutMode === 'split'
            ? 'bg-gradient-to-r from-[#FF8C00] to-[#FFD700] text-black shadow-[0_0_12px_rgba(255,140,0,0.45)]'
            : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]/60'
        }`}
        title="Split View: Timeline above, Console strips below"
      >
        <Columns size={12} />
        <span>Split</span>
      </button>
      <span className="hidden xl:inline-flex items-center px-1.5 py-0.5 ml-0.5 rounded bg-[#0F172A] border border-[#334155] text-[8px] font-mono text-[#94A3B8]">
        TAB
      </span>
    </div>
  );

  return (
    <div className={`h-full flex flex-col overflow-hidden bg-[#000000] ${isPureTimeline ? 'p-1.5 md:p-2' : 'p-3 md:p-4'}`}>
      {isPureTimeline ? (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5 px-2 py-1 bg-[#060912] border border-[#1E293B] rounded-lg shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {renderViewSwitcher(true)}

            {/* Slim Micro-Transport for Pure Timeline */}
            <div className="flex items-center gap-1 bg-[#03050B] border border-[#1E293B] rounded-lg px-1.5 py-0.5">
              <button
                type="button"
                onClick={() => handleTransportClick('rewind')}
                className="p-1 text-[#94A3B8] hover:text-[#FF8C00] rounded transition-colors cursor-pointer"
                title="Rewind to Bar 1"
              >
                <Rewind size={13} />
              </button>
              <button
                type="button"
                onClick={() => handleTransportClick('stop')}
                className="p-1 text-[#94A3B8] hover:text-[#FF8C00] rounded transition-colors cursor-pointer"
                title="Stop & Reset"
              >
                <Square size={13} />
              </button>
              <button
                type="button"
                onClick={() => (isPlaying ? handleTransportClick('pause') : handleTransportClick('play'))}
                className={`p-1 rounded transition-colors cursor-pointer ${
                  isPlaying ? 'bg-white text-black' : 'bg-[#FF8C00] text-black hover:bg-white'
                }`}
                title={isPlaying ? 'Pause Playback' : 'Play Transport'}
              >
                {isPlaying ? <Pause size={13} /> : <Play size={13} />}
              </button>
              <button
                type="button"
                onClick={handleToggleRecord}
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                  isRecording
                    ? 'bg-[#EF4444] text-white animate-pulse'
                    : isArmedAny
                    ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/60'
                    : 'text-[#94A3B8] hover:text-[#EF4444]'
                }`}
                title={isRecording ? 'Stop Recording' : 'Record Live Audio'}
              >
                <CircleDot size={10} />
                <span>REC</span>
              </button>
              <button
                type="button"
                onClick={() => handleTransportClick('loop')}
                className={`p-1 rounded transition-colors cursor-pointer ${
                  loopEnabled ? 'text-[#FF8C00] bg-[#FF8C00]/15' : 'text-[#94A3B8] hover:text-[#FF8C00]'
                }`}
                title="Toggle Loop Region"
              >
                <Repeat size={13} />
              </button>
              <span className="text-[10px] font-mono text-[#00F0FF] tabular-nums px-1.5 border-l border-[#1E293B]">
                {tempo} BPM
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleAddAudioTrack}
              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              title="Add Audio Track"
            >
              <Plus size={11} />
              <span>AUDIO</span>
            </button>
            <button
              type="button"
              onClick={handleAddMidiTrack}
              className="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              title="Add MIDI Track"
            >
              <Music size={11} />
              <span>MIDI</span>
            </button>
            <div className="flex items-center gap-1 bg-[#03050B] border border-[#1E293B] rounded-lg px-1.5 py-0.5">
              <button
                type="button"
                onClick={() => {
                  toggleSnapEnabled();
                  playLaserBeamSound('laser_select');
                }}
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-black flex items-center gap-1 transition-all cursor-pointer border ${
                  snapEnabled
                    ? 'bg-gradient-to-r from-[#FF8C00] to-[#FFD700] text-black border-[#FFD700] shadow-[0_0_8px_rgba(255,140,0,0.4)]'
                    : 'bg-[#0B101D] text-[#64748B] border-[#334155] hover:text-white'
                }`}
                title={snapEnabled ? `Visual Snap-to-Grid ON (${formatSnapDivisionLabel(snapDivision)}) — click to switch to Freeform` : `Visual Snap-to-Grid OFF — click to restore ${formatSnapDivisionLabel(snapDivision)} snap`}
              >
                <Magnet size={10} />
                <span>{snapEnabled ? 'SNAP ON' : 'SNAP OFF'}</span>
              </button>
              <select
                value={snapDivision}
                onChange={(e) => handleQuantizeChange(e.target.value)}
                className={`bg-transparent text-[10px] font-mono font-bold outline-none cursor-pointer px-1 ${
                  snapEnabled ? 'text-[#FFD700]' : 'text-[#64748B]'
                }`}
                title="Active Snap-to-Grid division (persists across Mixer & MIDI Editor)"
              >
                <option value="1/4" className="bg-[#070A11]">1/4</option>
                <option value="1/8" className="bg-[#070A11]">1/8</option>
                <option value="1/16" className="bg-[#070A11]">1/16</option>
                <option value="1/32" className="bg-[#070A11]">1/32</option>
                <option value="triplet" className="bg-[#070A11]">1/12 T</option>
              </select>
              <button
                type="button"
                onClick={() => toggleShowGridLines()}
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border transition-all cursor-pointer ${
                  showGridLines
                    ? 'bg-[#00F0FF]/15 border-[#00F0FF]/50 text-[#00F0FF]'
                    : 'border-transparent text-[#64748B] hover:text-white'
                }`}
                title="Toggle Visual Grid Lines Overlay"
              >
                GRID
              </button>
            </div>
            <MixSnapshotBar
              compact
              tracks={tracks}
              masterGain={masterGain}
              tempo={tempo}
              onApplySnapshot={handleApplyMixSnapshot}
              onSaveSnapshot={handleSaveMixSnapshot}
            />
          </div>
        </div>
      ) : (
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 border-b border-[#1E293B]/70 pb-2.5 shrink-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="text-lg md:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Settings2 size={18} className="text-[#FF8C00]" />
            MIXER CONSOLE
          </h2>

          {/* 4-Way View Toggle: Pure Timeline / Timeline / Mixer Only / Split */}
          {renderViewSwitcher(false)}

          {/* Persistent Visual Snap-to-Grid Toggle & Division Selector */}
          <div 
            className={`flex items-center bg-[#070A11] border rounded-lg p-0.5 gap-0.5 shadow-inner select-none transition-colors ${
              snapEnabled ? 'border-[#FF8C00]/50' : 'border-[#1E293B]'
            }`}
            title="Visual Snap-to-Grid: Persists across Mixer Timeline and MIDI Editor for aligned dragging"
          >
            <button
              type="button"
              onClick={() => {
                toggleSnapEnabled();
                playLaserBeamSound('laser_select');
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-black flex items-center gap-1 transition-all cursor-pointer ${
                snapEnabled
                  ? 'bg-gradient-to-r from-[#FF8C00] to-[#FFD700] text-black shadow-[0_0_10px_rgba(255,140,0,0.4)]'
                  : 'bg-[#0E131F] text-[#94A3B8] hover:text-white border border-[#1E293B]'
              }`}
              title={snapEnabled ? `Snap-to-Grid is ON (${formatSnapDivisionLabel(snapDivision)}) — click to disable` : `Snap-to-Grid is OFF (Freeform) — click to re-enable ${formatSnapDivisionLabel(snapDivision)}`}
            >
              <Magnet size={11} className={snapEnabled ? 'text-black' : 'text-[#64748B]'} />
              <span>{snapEnabled ? 'SNAP ON' : 'SNAP OFF'}</span>
            </button>

            {(['1/4', '1/8', '1/16', '1/32', 'triplet'] as const).map((qVal) => {
              const isSelectedDiv = snapDivision === qVal || (qVal === 'triplet' && (snapDivision === '1/8T' || snapDivision === '1/16T'));
              return (
                <button
                  key={qVal}
                  type="button"
                  onClick={() => handleQuantizeChange(qVal)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-black transition-all cursor-pointer ${
                    isSelectedDiv && snapEnabled
                      ? 'bg-[#FF8C00]/25 text-[#FFD700] border border-[#FF8C00]/60 shadow-[0_0_8px_rgba(255,140,0,0.25)]'
                      : isSelectedDiv
                        ? 'bg-[#1E293B]/60 text-[#94A3B8] border border-[#334155]'
                        : 'text-[#64748B] hover:text-white hover:bg-[#1E293B]/70 border border-transparent'
                  }`}
                  title={`Set Snap Grid division to ${formatSnapDivisionLabel(qVal)}`}
                >
                  {formatSnapDivisionLabel(qVal)}
                </button>
              );
            })}

            <button
              type="button"
              onClick={handleSnapAllClips}
              disabled={!snapEnabled}
              className="ml-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border border-[#FF8C00]/40 text-[#FF8C00] hover:bg-[#FF8C00] hover:text-black disabled:opacity-25 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer"
              title="Snap all existing clips on all tracks to the current grid"
            >
              <Sparkles size={10} />
              <span className="hidden xl:inline">SNAP ALL</span>
            </button>
          </div>

          {/* Global MIDI Quantize & Swing Drawer Toggle */}
          <button
            onClick={() => {
              setIsMidiQuantizeOpen(prev => !prev);
              playLaserBeamSound('laser_select');
            }}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer border whitespace-nowrap shrink-0 ${
              isMidiQuantizeOpen
                ? 'bg-[#10B981] text-black border-[#34D399]'
                : 'bg-[#070A11] border-[#10B981]/50 text-[#10B981] hover:bg-[#10B981]/15 hover:border-[#10B981]'
            }`}
            title="Open Global MIDI Quantize (1/4, 1/8, 1/16, 1/32 + Swing % humanization)"
          >
            <Magnet size={11} />
            <span>MIDI QUANTIZE</span>
            <span className={`text-[9px] tabular-nums px-1 rounded ${
              isMidiQuantizeOpen ? 'bg-black/20 text-black' : 'bg-[#0E1726] text-[#CBD5E1]'
            }`}>
              {midiQuantizeGrid} · {midiQuantizeSwing}%
            </span>
            {selectedClipIds.length > 0 && (
              <span className={`text-[9px] tabular-nums px-1 rounded font-extrabold ${
                isMidiQuantizeOpen ? 'bg-black text-[#10B981]' : 'bg-[#FFD700] text-black'
              }`}>
                {selectedClipIds.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
            <input type="file" ref={fileInputRef} className="hidden" accept="audio/*" onChange={async (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    const file = e.target.files[0];
                    const id = Math.random().toString(36).substr(2, 9);
                    
                    await audioService.loadAudio(id, file);

                    const newTrack: Track = {
                      id,
                      name: file.name,
                      type: 'audio',
                      volume: 0.8,
                      pan: 0,
                      muted: false,
                      soloed: false,
                      color: '#10B981',
                      phaseInverted: false,
                      isMono: false,
                      vstBypassed: true,
                      clips: [{
                        id: Math.random().toString(36).substr(2, 9),
                        name: file.name,
                        startBar: 0,
                        durationBars: 4
                      }]
                    };
                    projectHistory.pushSnapshot(`Import Audio Track [${file.name}]`, tracks, tempo);
                    setTracks([...tracks, newTrack]);
                }
            }} />

            {/* Auto-Arm Mode Toggle Button */}
            <button
              onClick={handleToggleAutoArm}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer border ${
                isAutoArm
                  ? 'bg-red-950/70 border-red-500 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.35)]'
                  : 'bg-[#0E121E] border-[#252E48] text-[#8C9BBF] hover:text-white hover:border-[#3E4C74]'
              }`}
              title={isAutoArm ? "Auto-Arm Mode: ENABLED. Tracks automatically arm for live recording upon selection." : "Auto-Arm Mode: DISABLED."}
            >
              <CircleDot size={11} className={isAutoArm ? 'text-red-400 animate-pulse' : 'text-[#8C9BBF]'} />
              <span>AUTO-ARM</span>
            </button>

            {/* + Add Audio Track */}
            <button 
              onClick={handleAddAudioTrack}
              className="px-2 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded text-[10px] font-bold transition-all flex items-center gap-1 shadow-[0_0_8px_rgba(16,185,129,0.25)] cursor-pointer"
              title="Add a new blank Audio track to arrangement"
            >
              <Plus size={12} />
              <span>AUDIO</span>
            </button>

            {/* + Add MIDI Track */}
            <button 
              onClick={handleAddMidiTrack}
              className="px-2 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded text-[10px] font-bold transition-all flex items-center gap-1 shadow-[0_0_8px_rgba(168,85,247,0.25)] cursor-pointer"
              title="Add a new blank MIDI track with Piano Roll editor"
            >
              <Music size={11} />
              <span>MIDI</span>
            </button>

            {/* Import Audio File */}
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-1 border border-[#10B981]/60 text-[#10B981] hover:bg-[#10B981]/20 rounded text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
              title="Import audio file from local disk"
            >
              <Upload size={11} />
              <span>IMPORT</span>
            </button>

            {/* Batch Stem Export (.WAV) */}
            <button 
              onClick={() => setIsBatchStemExportOpen(true)}
              className="px-2 py-1 border border-[#10B981] bg-[#10B981]/15 text-[#10B981] hover:bg-[#10B981] hover:text-black font-extrabold rounded text-[10px] transition-all flex items-center gap-1 cursor-pointer"
              title="Batch Stem Export: Export all active tracks as individual WAV files"
            >
              <FolderArchive size={11} />
              <span>STEMS</span>
            </button>

            {/* Hardware MIDI Learn Toggle */}
            <button
              data-midi-learn-ignore="true"
              onClick={() => midiLearnService.toggleLearnMode()}
              className={`px-2 py-1 rounded text-[10px] font-bold font-mono transition-all flex items-center gap-1 cursor-pointer border ${
                isMidiLearnMode
                  ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_12px_#F59E0B] animate-pulse'
                  : midiMappings.length > 0
                    ? 'bg-amber-950/40 border-amber-500/60 text-amber-300 hover:bg-amber-900/50'
                    : 'bg-[#0E121E] border-[#252E48] text-[#8C9BBF] hover:text-white hover:border-amber-400'
              }`}
              title={
                isMidiLearnMode 
                  ? "MIDI Learn ACTIVE: Click any knob, fader, or button across the UI, then touch your hardware controller." 
                  : "Toggle Hardware MIDI Learn Mode"
              }
            >
              <Sliders size={11} className={isMidiLearnMode ? 'text-black' : 'text-amber-400'} />
              <span>LEARN</span>
              {midiMappings.length > 0 && (
                <span className={`text-[8px] px-1 rounded-full font-extrabold ${
                  isMidiLearnMode ? 'bg-black text-amber-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {midiMappings.length}
                </span>
              )}
            </button>

            {/* VST Wrapper Host Faceplate Window Trigger */}
            {onOpenVstWrapperHost && (
              <button
                onClick={() => onOpenVstWrapperHost()}
                className="px-2 py-1 rounded text-[10px] font-bold font-mono transition-all flex items-center gap-1 cursor-pointer border bg-amber-950/40 border-amber-500/60 text-amber-300 hover:bg-amber-900/50 hover:border-amber-400"
                title="Open VST Wrapper Layer: Non-native plugin host & faceplate rack"
              >
                <Sliders size={11} className="text-amber-400" />
                <span>VST RACK</span>
              </button>
            )}

            {/* Global VST Browser & Parameter Automation Side-Panel Toggle */}
            {layoutMode !== 'console' && (
              <button
                onClick={handleToggleVstBrowser}
                className={`px-2 py-1 rounded text-[10px] font-bold font-mono transition-all flex items-center gap-1 cursor-pointer border ${
                  isVstBrowserOpen
                    ? 'bg-[#EC4899] text-black border-pink-300 shadow-[0_0_12px_rgba(236,72,153,0.45)]'
                    : 'bg-[#120A16] border-[#EC4899]/50 text-pink-300 hover:bg-pink-950/60 hover:border-pink-400'
                }`}
                title="Toggle Global VST Browser & Unified Parameter Automation Side-Panel"
              >
                <Cpu size={11} className={isVstBrowserOpen ? 'text-black' : 'text-[#EC4899]'} />
                <span>VST BROWSER</span>
              </button>
            )}

            {/* Macro Engine Side Panel Toggle */}
            <button
              onClick={handleToggleMacroPanel}
              className={`px-2 py-1 rounded text-[10px] font-bold font-mono transition-all flex items-center gap-1 cursor-pointer border ${
                isRecordingMacro
                  ? 'bg-[#DC2626] text-white border-red-400 animate-pulse'
                  : isMacroPanelOpen
                    ? 'bg-[#FF8C00] text-black border-amber-300 shadow-[0_0_12px_rgba(255,140,0,0.45)]'
                    : 'bg-[#140F07] border-[#FF8C00]/50 text-[#FF8C00] hover:bg-amber-950/50 hover:border-[#FF8C00]'
              }`}
              title="Toggle Macro Engine Side Panel: Record VST, volume & pan sequences as MIDI-triggerable Performance Macros"
            >
              <Zap size={11} />
              <span>{isRecordingMacro ? 'REC MACRO' : 'MACROS'}</span>
            </button>

            {/* Template Gallery Side Panel Toggle */}
            <button
              onClick={handleToggleTemplatePanel}
              className={`px-2 py-1 rounded text-[10px] font-bold font-mono transition-all flex items-center gap-1 cursor-pointer border ${
                isTemplatePanelOpen
                  ? 'bg-[#00F0FF] text-black border-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                  : 'bg-[#08111A] border-[#00F0FF]/45 text-[#00F0FF] hover:bg-cyan-950/50 hover:border-[#00F0FF]'
              }`}
              title="Toggle Template Gallery Side-Panel: Save and load track configurations, VST chains, and routing setups as JSON templates"
            >
              <FolderKanban size={11} />
              <span>TEMPLATES</span>
            </button>

            {/* Auto-Mix Snapshot Bank Menu Button */}
            <MixSnapshotBar
              tracks={tracks}
              masterGain={masterGain}
              tempo={tempo}
              onApplySnapshot={handleApplyMixSnapshot}
              onSaveSnapshot={handleSaveMixSnapshot}
            />

            {/* Decluttered Studio & AI Tools Popover Menu */}
            <div className="relative" ref={toolsMenuRef}>
              <button
                onClick={() => setIsToolsMenuOpen(prev => !prev)}
                className={`px-2 py-1 rounded text-[10px] font-bold font-mono transition-all flex items-center gap-1 cursor-pointer border ${
                  isToolsMenuOpen || isVirtualControllerOpen
                    ? 'bg-[#1E293B] border-[#FF8C00] text-[#FF8C00]'
                    : 'bg-[#090C16] border-[#252E48] text-[#94A3B8] hover:text-white hover:border-[#475569]'
                }`}
                title="AI Generators, Virtual Controller Desk & Transistor Synth Keypad"
              >
                <Wrench size={11} />
                <span>STUDIO</span>
                <ChevronDown size={11} className={`transition-transform ${isToolsMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isToolsMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-[#090C15] border border-[#26619C] rounded-xl shadow-[0_12px_36px_rgba(0,0,0,0.9)] p-1.5 z-50 flex flex-col gap-1">
                  {onOpenYue2Generator && (
                    <button
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        onOpenYue2Generator();
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg text-left text-[11px] font-mono font-bold text-pink-300 hover:bg-pink-950/60 flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5"><Sparkles size={12} className="text-pink-400" /> YuE 2.0 Full-Song AI</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsToolsMenuOpen(false);
                      if (onOpenAceStepDesigner) onOpenAceStepDesigner();
                      else setIsAceStepOpen(true);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-[11px] font-mono font-bold text-pink-300 hover:bg-pink-950/60 flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5"><Sparkles size={12} className="text-pink-400" /> Ace-Step 1.5 Loop AI</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsToolsMenuOpen(false);
                      setIsVirtualControllerOpen(prev => !prev);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-[11px] font-mono font-bold text-cyan-300 hover:bg-cyan-950/50 flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5"><Radio size={12} className="text-cyan-400" /> Virtual Controller Desk</span>
                    <span className={`text-[9px] px-1 rounded ${isVirtualControllerOpen ? 'bg-cyan-500 text-black' : 'text-[#64748B]'}`}>
                      {isVirtualControllerOpen ? 'ON' : 'OFF'}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setIsToolsMenuOpen(false);
                      setIsMidiKeyboardOpen(prev => !prev);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-[11px] font-mono font-bold text-emerald-300 hover:bg-emerald-950/50 flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5"><Keyboard size={12} className="text-emerald-400" /> Transistor Synth Keypad</span>
                    <span className={`text-[9px] px-1 rounded ${isMidiKeyboardOpen ? 'bg-emerald-500 text-black' : 'text-[#64748B]'}`}>
                      {isMidiKeyboardOpen ? 'ON' : 'OFF'}
                    </span>
                  </button>
                </div>
              )}
            </div>
        </div>
      </div>
      )}

      {/* Ace-Step 1.5 Multi-Track Synchronizer Strip (Collapsible, hidden in Pure Timeline) */}
      {!isPureTimeline && isAceStepStripOpen && (
        <div className="px-4 py-1.5 bg-gradient-to-r from-pink-950/30 via-[#0B0F1C] to-cyan-950/30 border-b border-[#1E2642] flex items-center justify-between text-xs flex-wrap gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <Sparkles size={13} className="text-[#00F0FF] animate-pulse" />
            <span className="text-[11px] font-black tracking-wider text-pink-300 uppercase">
              ACE-STEP 1.5 NEURAL ENGINE:
            </span>
            <span className="text-[11px] text-[#9DA7CB]">
              Generate multi-track AI song bed & line up track-by-track with armed live recording at Bar 0
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (onOpenAceStepDesigner) {
                  onOpenAceStepDesigner();
                } else {
                  setIsAceStepOpen(true);
                }
              }}
              className="px-3 py-1 rounded-lg bg-gradient-to-r from-[#EC4899] to-[#00F0FF] text-black font-black text-[10px] hover:brightness-110 transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(236,72,153,0.3)] cursor-pointer"
            >
              <Sparkles size={11} className="text-black" />
              <span>RUN ACE-STEP & SYNC TO MIXER</span>
            </button>

            <button
              onClick={() => setIsBatchStemExportOpen(true)}
              className="px-3 py-1 rounded-lg bg-[#10B981]/20 border border-[#10B981]/50 text-[#10B981] hover:bg-[#10B981] hover:text-black font-bold text-[10px] transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.2)]"
            >
              <FolderArchive size={11} />
              <span>BATCH STEM EXPORT (.WAV)</span>
            </button>
          </div>
        </div>
      )}
      
      <Suspense fallback={null}>
        {/* 1960s Transistor MIDI Synth & Keypad Drawer */}
        {isMidiKeyboardOpen && (
          <RetroMidiKeyboard 
            isOpen={isMidiKeyboardOpen}
            onClose={() => setIsMidiKeyboardOpen(false)}
            activeTrackName={tracks.find(t => t.type === 'midi')?.name || 'Synth'}
            onInsertMidiClip={(chordName) => {
              const midiTrack = tracks.find(t => t.type === 'midi') || tracks[0];
              if (midiTrack) {
                const rawBar = playheadPosition * 16;
                const isOff = snapValue === 'off' || snapValue === 'freeform';
                const snappedStart = isOff ? rawBar : snapToGrid(rawBar, snapValue);

                // Generate chord notes according to chordName
                const chordPitchesMap: Record<string, number[]> = {
                  'Am9 (Twin Peaks)': [57, 60, 64, 67, 71],
                  'Dm7 (Vegas Lounge)': [50, 57, 60, 65],
                  'E7#9 (Atomic Saw)': [52, 56, 59, 62, 67],
                  'Cmaj7 (Desert Neon)': [48, 52, 55, 59]
                };
                const pitches = chordPitchesMap[chordName] || [60, 64, 67];

                // Apply subtle Humanize randomized velocity offsets to incoming synthetic notes
                const isHumanize = midiTrack.midiConfig?.humanizeEnabled ?? midiTrack.humanizeEnabled ?? true;
                const jitterAmt = midiTrack.midiConfig?.humanizeAmount ?? midiTrack.humanizeAmount ?? 0.18;
                const baseVelocity = 95;
                const maxDelta = Math.round(jitterAmt * 80);

                const generatedNotes: MidiNoteEvent[] = pitches.map((pitch, pIdx) => {
                  const velOffset = isHumanize ? Math.round((Math.random() * 2 - 1) * maxDelta) : 0;
                  const finalVel = Math.max(20, Math.min(127, baseVelocity + velOffset));
                  return {
                    id: `mn-${Date.now()}-${pIdx}`,
                    pitch,
                    noteName: midiToNoteName(pitch),
                    startBar: 0,
                    startTimeSeconds: 0,
                    durationBars: 2,
                    durationSeconds: 2 * (60 / tempo) * 4,
                    velocity: finalVel,
                    confidence: 1.0
                  };
                });

                const newClip: Clip = {
                  id: `midi-${Math.random().toString(36).substr(2, 7)}`,
                  name: `${chordName} Pad`,
                  startBar: Math.max(0, Math.min(14, Number(snappedStart.toFixed(4)))),
                  durationBars: 2,
                  isMidi: true,
                  midiNotes: generatedNotes,
                  instrument: midiTrack.instrument || 'TB-303 Acid Synth'
                };
                updateTrack(midiTrack.id, {
                  clips: [...midiTrack.clips, newClip]
                });
              }
            }}
          />
        )}
        
        {/* Global MIDI Quantize & Swing Console */}
        {!isPureTimeline && isMidiQuantizeOpen && (
          <MidiQuantizePanel
            tracks={tracks}
            tempo={tempo}
            selectedTrackId={selectedTrackId}
            grid={midiQuantizeGrid}
            swingPercent={midiQuantizeSwing}
            strengthPercent={midiQuantizeStrength}
            scope={midiQuantizeScope}
            selectedClipIds={selectedClipIds}
            selectedNoteIdsByClip={selectedNoteIdsByClip}
            quantizeClipStarts={midiQuantizeClipStarts}
            quantizeNoteLengths={midiQuantizeNoteLengths}
            livePreview={midiQuantizeLivePreview}
            lastSummary={midiQuantizeSummary}
            onGridChange={handleMidiQuantizeGridChange}
            onSwingChange={handleMidiQuantizeSwingChange}
            onStrengthChange={handleMidiQuantizeStrengthChange}
            onScopeChange={setMidiQuantizeScope}
            onToggleClipSelection={(clipId) => handleToggleSelectClip(clipId, true)}
            onSelectAllMidiClips={handleSelectAllMidiClips}
            onClearClipSelection={handleClearMidiClipSelection}
            onSetNoteSelectionForClip={handleSetNoteSelectionForClip}
            onToggleQuantizeClipStarts={setMidiQuantizeClipStarts}
            onToggleQuantizeNoteLengths={setMidiQuantizeNoteLengths}
            onToggleLivePreview={setMidiQuantizeLivePreview}
            onApplyQuantize={() => runMidiQuantize({ pushUndo: true })}
            onRestoreOriginal={handleRestoreOriginalMidi}
            onCreateSampleMidiTrack={handleCreateSampleMidiTrack}
            onClose={() => setIsMidiQuantizeOpen(false)}
          />
        )}
      </Suspense>

      {/* Main Studio Workspace + Optional Macro Engine Side Panel */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3">
        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          {layoutMode !== 'console' && (
            <div
              className={`flex flex-col lg:flex-row gap-3 ${
                isFullTimelineHeight
                  ? isPureTimeline
                    ? 'flex-1 min-h-0'
                    : 'flex-1 min-h-0 mb-2'
                  : 'mb-3 shrink-0'
              }`}
            >
              <div className="flex-1 min-w-0 h-full">
                <Timeline 
                  tracks={tracks}
                  playheadPosition={playheadPosition} 
                  setPlayheadPosition={setPlayheadPosition}
                  loopRange={loopRange} 
                  setLoopRange={setLoopRange} 
                  snapValue={snapValue}
                  setSnapValue={setSnapValue}
                  tempo={tempo}
                  setTempo={setTempo}
                  updateTrack={updateTrack}
                  onEdit={(clip) => {
                      setActiveClip(clip);
                      if (clip.isMidi || clip.midiNotes) {
                        handleOpenMidiEditorForClip(clip);
                      } else {
                        setView(View.AUDIO_EDITOR);
                      }
                  }}
                  isRecording={isRecording}
                  activeLaserTool={activeLaserTool}
                  onToolChange={(t) => setActiveLaserTool(t as any)}
                  beamModeEnabled={beamModeEnabled}
                  onToggleBeamMode={handleToggleBeamMode}
                  timelineMarkers={timelineMarkers}
                  onOpenChronoMap={() => {
                    setChronoMapInitialTrackId(undefined);
                    setIsChronoMapOpen(true);
                  }}
                  onOpenBeamSplitter={() => {
                    setBeamSplitterSourceTrackId(undefined);
                    setIsBeamSplitterOpen(true);
                  }}
                  selectedTrackId={selectedTrackId}
                  onSelectTrack={handleSelectTrack}
                  isAutoArmMode={isAutoArm}
                  isVstBrowserOpen={!isPureTimeline && isVstBrowserOpen}
                  onToggleVstBrowser={isPureTimeline ? undefined : handleToggleVstBrowser}
                  containerClassName={isFullTimelineHeight ? 'h-full' : 'h-80 lg:h-96'}
                  selectedClipIds={selectedClipIds}
                  onToggleSelectClip={handleToggleSelectClip}
                />
              </div>

              {!isPureTimeline && isVstBrowserOpen && (
                <Suspense fallback={null}>
                  <GlobalVstBrowserPanel
                    tracks={tracks}
                    tempo={tempo}
                    playheadPosition={playheadPosition}
                    selectedTrackId={selectedTrackId}
                    updateTrack={updateTrack}
                    onSelectTrack={handleSelectTrack}
                    onActivateDrawTool={(tool) => setActiveLaserTool(tool)}
                    onOpenVstWrapperHost={onOpenVstWrapperHost}
                    onOpenFaustDspLab={() => {
                      if (onOpenFaustDspLab) onOpenFaustDspLab();
                      else setIsFaustDspOpen(true);
                    }}
                    onClose={handleToggleVstBrowser}
                    containerClassName={isFullTimelineHeight ? 'h-full' : 'h-80 lg:h-96'}
                  />
                </Suspense>
              )}
            </div>
          )}

          {layoutMode !== 'arrange' && layoutMode !== 'pure' && (
            <div className="flex-1 min-h-0 bg-[#000000] border border-[#26619C] p-3 flex items-stretch justify-start gap-3 overflow-x-auto rounded-xl">
              <div className="flex-1 flex items-stretch justify-around gap-3 min-w-0">
                {tracks.map(track => (
                  <ChannelStrip 
                    key={track.id} 
                    track={track} 
                    updateTrack={updateTrack} 
                    playheadPosition={playheadPosition}
                    onShowMidi={(data) => setSelectedMidiData({ trackName: track.name, data })}
                    onEdit={(clip) => {
                        setActiveClip(clip);
                        if (clip.isMidi || clip.midiNotes) {
                          handleOpenMidiEditorForClip(clip);
                        } else {
                          setView(View.AUDIO_EDITOR);
                        }
                    }}
                    onOpenMidiEditor={handleOpenMidiEditorForTrack}
                    onOpenChronoMap={(trackId) => {
                      setChronoMapInitialTrackId(trackId);
                      setIsChronoMapOpen(true);
                    }}
                    onOpenBeamSplitter={(trackId) => {
                      setBeamSplitterSourceTrackId(trackId);
                      setIsBeamSplitterOpen(true);
                    }}
                    onOpenBasicPitch={(t) => {
                      setBasicPitchSongTitle(t.name);
                      const lower = t.name.toLowerCase();
                      const stem = lower.includes('bass') ? 'bass' : lower.includes('drum') ? 'drums' : lower.includes('vocal') ? 'vocals' : 'instruments';
                      setBasicPitchInitialStem(stem);
                      setIsBasicPitchOpen(true);
                    }}
                    onDuplicateTrack={handleDuplicateTrack}
                    onDeleteTrack={handleDeleteTrack}
                    isSelected={track.id === selectedTrackId}
                    onSelect={() => handleSelectTrack(track.id)}
                    isAutoArmMode={isAutoArm}
                    isMidiLearnMode={isMidiLearnMode}
                    midiMappings={midiMappings}
                    learningTarget={learningTarget}
                    onStartMidiLearn={handleStartMidiLearn}
                    onOpenVstWrapperHost={onOpenVstWrapperHost}
                  />
                ))}
              </div>

              {/* Dedicated Vertical Master Bus Fader Strip */}
              <div
                data-midi-id="master-gain"
                data-midi-label="Master Console Fader"
                data-midi-type="fader"
                onClick={(e) => {
                  if (isMidiLearnMode) {
                    e.stopPropagation();
                    handleStartMidiLearn({
                      id: 'master-gain',
                      controlLabel: 'Master Gain Fader',
                      targetType: 'fader'
                    });
                  }
                }}
                className={`w-32 shrink-0 bg-[#080B14] border rounded-lg p-2 flex flex-col items-center justify-between select-none sticky right-0 z-10 shadow-[-8px_0_24px_rgba(0,0,0,0.85)] ${
                  isMidiLearnMode
                    ? 'border-amber-400 cursor-crosshair'
                    : 'border-[#FF8C00]/60'
                }`}
                title="Master Output Bus Fader"
              >
                <div className="w-full text-center border-b border-[#1E293B] pb-1.5">
                  <div className="text-[10px] font-mono font-black tracking-widest text-[#FF8C00]">MASTER OUT</div>
                  <div className="text-[9px] font-mono text-[#FFD700] mt-0.5">
                    {masterGain <= 0.005 ? '-∞ dB' : `${(20 * Math.log10(masterGain)).toFixed(1)} dB`}
                  </div>
                </div>

                <div className="flex-1 w-full min-h-[140px] flex items-center justify-center gap-2 py-2">
                  <div className="h-full flex flex-col justify-between text-[8px] font-mono text-[#64748B] select-none py-1">
                    <span>0</span>
                    <span>-12</span>
                    <span>-24</span>
                    <span>-42</span>
                    <span>-∞</span>
                  </div>
                  <div
                    ref={masterFaderRef}
                    onMouseDown={(e) => {
                      if (isMidiLearnMode) return;
                      e.stopPropagation();
                      if (masterFaderRef.current) {
                        const rect = masterFaderRef.current.getBoundingClientRect();
                        const ratio = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
                        setMasterGain(Number(ratio.toFixed(3)));
                      }
                      setIsDraggingMasterFader(true);
                    }}
                    className="relative w-8 h-full bg-[#04060B] border border-[#26619C]/70 rounded-md flex justify-center cursor-ns-resize py-1"
                  >
                    <div className="w-1.5 h-full bg-[#121826] rounded-full relative overflow-hidden">
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#FF8C00] to-[#FFD700] rounded-full"
                        style={{ height: `${masterGain * 100}%` }}
                      />
                    </div>
                    <div
                      className="absolute left-1/2 -translate-x-1/2 w-7 h-4 bg-gradient-to-b from-[#FF8C00] to-[#B45309] border border-[#FFD700] rounded shadow-[0_0_10px_rgba(255,140,0,0.6)] pointer-events-none flex items-center justify-center"
                      style={{ bottom: `calc(${masterGain * 100}% - 8px)` }}
                    >
                      <div className="w-4 h-0.5 bg-black/70 rounded-full" />
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExportModalOpen(true);
                  }}
                  className="w-full py-1.5 rounded bg-[#141828] border border-[#FF8C00]/50 text-[#FF8C00] hover:bg-[#FF8C00] hover:text-black font-mono text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  title="Bounce Master Output (.WAV)"
                >
                  <Download size={11} />
                  <span>BOUNCE</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {!isPureTimeline && isMacroPanelOpen && (
          <Suspense fallback={null}>
            <MacroEnginePanel
              isRecordingMacro={isRecordingMacro}
              recordedEvents={recordedMacroEvents}
              recordingElapsedMs={recordingElapsedMs}
              activeMacroId={activeMacroId}
              macroPlaybackProgress={macroPlaybackProgress}
              isMidiLearnMode={isMidiLearnMode}
              midiMappings={midiMappings}
              learningTarget={learningTarget}
              onStartRecord={handleStartRecordMacro}
              onStopRecord={handleStopRecordMacro}
              onTriggerMacro={handleTriggerMacro}
              onStopMacroPlayback={handleStopMacroPlayback}
              onBakeMacroToTimeline={handleBakeMacroToTimeline}
              onStartMidiLearn={handleStartMidiLearn}
              onOpenVirtualDesk={() => setIsVirtualControllerOpen(true)}
              onClose={handleToggleMacroPanel}
              containerClassName="h-full"
            />
          </Suspense>
        )}

        {!isPureTimeline && isTemplatePanelOpen && (
          <Suspense fallback={null}>
            <TemplateGallery
              variant="panel"
              tracks={tracks}
              setTracks={setTracks}
              tempo={tempo}
              setTempo={setTempo}
              activeSession={activeSession}
              onUpdateSession={onUpdateSession}
              onExpandToView={onOpenTemplateGalleryView}
              onClose={handleToggleTemplatePanel}
              containerClassName="h-full"
            />
          </Suspense>
        )}
      </div>

      {/* 1960s Vegas & Atomic Analog Transport Bar (Hidden in Pure Timeline) */}
      {!isPureTimeline && (
      <div className="h-20 bg-[#060810] border-t-2 border-[#FFD700]/30 rounded-b-xl mt-2 flex items-center justify-center gap-3 md:gap-5 px-4 relative overflow-hidden shadow-2xl">
        {/* Subtle Chevron Border Accent */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[repeating-linear-gradient(45deg,#FFD700_0px,#FFD700_6px,#000_6px,#000_12px)] opacity-40 pointer-events-none" />

        {/* Rewind */}
        <button 
          data-midi-id="transport-rewind"
          data-midi-label="Transport Rewind"
          data-midi-type="button"
          onClick={() => handleTransportClick('rewind')} 
          className="p-2.5 text-[#A0A0A0] hover:text-[#FF8C00] transition-colors rounded hover:bg-[#0F1320]"
          title="Rewind to Bar 1"
        >
          <Rewind size={20} />
        </button>

        {/* Stop */}
        <button 
          data-midi-id="transport-stop"
          data-midi-label="Transport Stop"
          data-midi-type="button"
          onClick={() => handleTransportClick('stop')} 
          className={`p-2.5 transition-colors rounded hover:bg-[#0F1320] ${!isPlaying && playheadPosition === 0 ? 'text-[#FF8C00]' : 'text-[#A0A0A0]'} hover:text-[#FF8C00]`}
          title="Stop & Reset"
        >
          <Square size={20} />
        </button>

        {/* Play / Pause */}
        <button 
          data-midi-id="transport-play"
          data-midi-label="Transport Play / Pause"
          data-midi-type="button"
          onClick={() => isPlaying ? handleTransportClick('pause') : handleTransportClick('play')} 
          className={`p-3.5 rounded-full shadow-[0_0_15px_rgba(255,140,0,0.5)] transition-all ${
            isPlaying ? 'bg-white text-black scale-105' : 'bg-[#FF8C00] text-black hover:bg-white'
          }`}
          title={isPlaying ? "Pause Playback" : "Play Transport"}
        >
          {isPlaying ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
        </button>

        {/* 1960s Vegas Jewel Recording Button */}
        <button
          data-midi-id="transport-record"
          data-midi-label="Transport Record"
          data-midi-type="button"
          onClick={handleToggleRecord}
          className={`px-4 py-2.5 rounded-full flex items-center gap-2 font-mono text-xs font-bold transition-all shadow-lg ${
            isRecording 
              ? 'bg-[#EF4444] text-white border-2 border-white shadow-[0_0_20px_#EF4444] animate-pulse scale-105' 
              : isArmedAny
                ? 'bg-[#EF4444]/25 text-[#EF4444] border-2 border-[#EF4444] hover:bg-[#EF4444] hover:text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                : 'bg-[#181116] text-[#94A3B8] border border-[#3E1B1B] hover:text-[#EF4444] hover:border-[#EF4444]'
          }`}
          title={isRecording ? "Stop Live Recording" : isArmedAny ? "Record Live Audio to Armed Tracks" : "Record Live Take (Arms Track 1 & Starts Recording)"}
        >
          <CircleDot size={14} className={isRecording ? 'animate-ping' : ''} />
          <span>{isRecording ? '● RECORDING' : '● REC'}</span>
        </button>

        {/* Auto-Arm Live Telemetry Indicator & Toggle */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#0A0D18] border border-[#222B42] rounded-full text-xs font-mono select-none">
          <button
            data-midi-id="transport-auto-arm"
            data-midi-label="Auto-Arm Mode Toggle"
            data-midi-type="button"
            onClick={handleToggleAutoArm}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
              isAutoArm 
                ? 'bg-red-500/20 text-red-300 border border-red-500/60 shadow-[0_0_8px_rgba(239,68,68,0.3)]' 
                : 'text-[#64748B] hover:text-white'
            }`}
            title="Auto-Arm Mode: Automatically enables recording for selected track (Click to toggle)"
          >
            <CircleDot size={11} className={isAutoArm ? 'text-red-400 animate-pulse' : 'text-[#64748B]'} />
            <span>AUTO-ARM: {isAutoArm ? 'ON' : 'OFF'}</span>
          </button>
          {isAutoArm && selectedTrack && (
            <span className="text-[10px] text-[#94A3B8] max-w-[110px] truncate hidden lg:inline flex items-center gap-1" title={`Armed Active Track: ${selectedTrack.name}`}>
              <span className="text-red-400">&bull;</span>
              <span className="truncate">{selectedTrack.name}</span>
            </span>
          )}
        </div>

        {/* Loop */}
        <button 
          data-midi-id="transport-loop"
          data-midi-label="Transport Loop Toggle"
          data-midi-type="button"
          onClick={() => handleTransportClick('loop')} 
          className={`p-2.5 rounded transition-colors ${loopEnabled ? 'text-[#FF8C00] bg-[#FF8C00]/15 border border-[#FF8C00]/40' : 'text-[#A0A0A0] hover:text-[#FF8C00]'}`}
          title="Toggle Loop Region"
        >
          <Repeat size={18} />
        </button>

        <div className="w-px h-8 bg-[#1E293B] mx-2 hidden sm:block" />

        {/* Master Gain Slider */}
        <div className="flex flex-col items-center">
            <label className="text-[9px] text-[#FFD700] font-mono uppercase tracking-wider font-bold">Master Gain</label>
            <input 
              data-midi-id="master-gain"
              data-midi-label="Master Gain Fader"
              data-midi-type="fader"
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={masterGain} 
              onChange={(e) => setMasterGain(parseFloat(e.target.value))} 
              className="accent-[#FF8C00] w-24 sm:w-28 cursor-pointer" 
            />
        </div>

        <div className="w-px h-8 bg-[#1E293B] mx-2 hidden md:block" />

        {/* Quick Export Button */}
        <button
          data-midi-id="transport-bounce"
          data-midi-label="Bounce & Export Project"
          data-midi-type="button"
          onClick={() => setIsExportModalOpen(true)}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141828] border border-[#FF8C00]/40 text-[#FF8C00] hover:bg-[#FF8C00] hover:text-black font-mono text-[11px] font-bold transition-all shadow-md"
          title="Export current arrangement to .WAV"
        >
          <Download size={13} />
          <span>BOUNCE</span>
        </button>
      </div>
      )}

      {/* MIDI Data Modal */}
      {selectedMidiData && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#1E1E1E] border border-[#26619C] p-6 rounded-xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Settings2 className="text-[#FF8C00]" />
                MIDI DATA: {selectedMidiData.trackName}
              </h3>
              <button 
                onClick={() => setSelectedMidiData(null)}
                className="text-[#666] hover:text-white transition-colors"
              >
                <Square size={20} className="rotate-45" />
              </button>
            </div>
            <div className="bg-[#000000] border border-[#333] p-4 rounded-lg overflow-y-auto max-h-96">
              <pre className="text-[#FF8C00] font-mono text-sm whitespace-pre-wrap">
                {selectedMidiData.data}
              </pre>
            </div>
            <button 
              onClick={() => setSelectedMidiData(null)} 
              className="w-full mt-6 py-3 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-white transition-all shadow-lg"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      <Suspense fallback={null}>
        {/* Offline Audio Export Project Modal */}
        {isExportModalOpen && (
          <ExportProjectModal
            isOpen={isExportModalOpen}
            initialMode={exportModalInitialMode}
            onClose={() => setIsExportModalOpen(false)}
            tracks={tracks}
            tempo={tempo}
            masterGain={masterGain}
            loopRange={loopEnabled ? loopRange : undefined}
            timelineMarkers={timelineMarkers}
          />
        )}

        {/* ChronoMap & ChronoPins Tempo Engine Modal */}
        {isChronoMapOpen && (
          <ChronoMapModal
            isOpen={isChronoMapOpen}
            onClose={() => setIsChronoMapOpen(false)}
            currentProjectBpm={tempo}
            tracks={tracks}
            initialTrackId={chronoMapInitialTrackId}
            onApplyChronoMap={handleApplyChronoMap}
          />
        )}

        {/* Beam Splitter & Optical Prism Chopper Modal */}
        {isBeamSplitterOpen && (
          <BeamSplitterModal
            isOpen={isBeamSplitterOpen}
            onClose={() => setIsBeamSplitterOpen(false)}
            tracks={tracks}
            initialTrackId={beamSplitterSourceTrackId}
            currentProjectBpm={tempo}
            playheadPositionBars={playheadPosition * TOTAL_BARS}
            onApplyBeamSplitter={handleApplyBeamSplitter}
            onAddProjectBinClips={onAddProjectBinClips}
            onOpenBasicPitch={(stemCat, songTitle, buffer) => {
              setIsBeamSplitterOpen(false);
              setBasicPitchInitialStem(stemCat || 'instruments');
              if (songTitle) setBasicPitchSongTitle(songTitle);
              setBasicPitchAudioBuffer(buffer || null);
              setIsBasicPitchOpen(true);
            }}
          />
        )}

        {/* Dedicated Batch Stem Export Modal (Individual WAVs with Normalization & Resampling) */}
        {isBatchStemExportOpen && (
          <BatchStemExportModal
            isOpen={isBatchStemExportOpen}
            onClose={() => setIsBatchStemExportOpen(false)}
            tracks={tracks}
            tempo={tempo}
            loopRange={loopRange}
            timelineMarkers={timelineMarkers}
          />
        )}

        {/* Ace-Step 1.5 GGUF Neural Loop Designer Modal */}
        {isAceStepOpen && (
          <div className="fixed inset-0 z-[9990] flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in font-mono">
            <div className="relative w-full max-w-6xl h-[92vh] rounded-2xl overflow-hidden border border-[#232A44] shadow-[0_0_60px_rgba(0,0,0,0.95)]">
              <AceStepLoopDesigner
                isOpen={true}
                onClose={() => setIsAceStepOpen(false)}
                projectBpm={tempo}
                tracks={tracks}
                onAddTrackWithClip={(trackName, clip) => {
                  const newTrack: Track = {
                    id: `acestep-track-${Date.now()}`,
                    name: trackName,
                    type: 'audio',
                    volume: 0.82,
                    pan: 0,
                    muted: false,
                    soloed: false,
                    color: '#EC4899',
                    phaseInverted: false,
                    isMono: false,
                    vstBypassed: false,
                    clips: [clip]
                  };
                  setTracks(prev => [...prev, newTrack]);
                  setIsAceStepOpen(false);
                }}
                onAddClipToTrack={(targetId, clip) => {
                  setTracks(prev => prev.map(t => {
                    if (t.id === targetId) {
                      return {
                        ...t,
                        clips: [...t.clips, clip]
                      };
                    }
                    return t;
                  }));
                  setIsAceStepOpen(false);
                }}
                onAddProjectBinClips={onAddProjectBinClips}
                onApplySongBedToMixer={(songBed) => {
                  if (onApplySongBedToMixer) {
                    onApplySongBedToMixer(songBed);
                  } else {
                    if (setTempo) setTempo(songBed.bpm);
                    const newTracks: Track[] = songBed.stems.map((stem, idx) => ({
                      id: `songbed-track-${stem.id}-${idx}`,
                      name: stem.name,
                      type: 'audio',
                      volume: stem.stemType === 'drums' ? 0.88 : stem.stemType === 'bass' ? 0.84 : 0.78,
                      pan: stem.stemType === 'pad' ? -0.2 : stem.stemType === 'lead' ? 0.2 : 0,
                      muted: false,
                      soloed: false,
                      color: stem.color || '#EC4899',
                      phaseInverted: false,
                      isMono: stem.stemType === 'bass',
                      vstBypassed: false,
                      clips: [{
                        id: `clip-${stem.id}`,
                        name: stem.name,
                        startBar: 0,
                        durationBars: stem.durationBars,
                        audioUrl: stem.audioUrl,
                        waveformSnippet: stem.waveformSnippet
                      }]
                    }));
                    if (songBed.guitarOverdubTrackName) {
                      newTracks.push({
                        id: `rec-track-guitar-${Date.now()}`,
                        name: songBed.guitarOverdubTrackName,
                        type: 'audio',
                        volume: 0.85,
                        pan: 0,
                        muted: false,
                        soloed: false,
                        color: '#EF4444',
                        phaseInverted: false,
                        isMono: true,
                        isArmedForRecord: true,
                        vstBypassed: false,
                        clips: []
                      });
                    }
                    setTracks(prev => [...prev, ...newTracks]);
                  }
                  setIsAceStepOpen(false);
                }}
                onNavigateToMixer={() => setIsAceStepOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Faust DSP Lab & Toy VST Workbench Modal */}
        {isFaustDspOpen && (
          <div className="fixed inset-0 z-[9991] flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in font-mono">
            <div className="relative w-full max-w-6xl h-[92vh] rounded-2xl overflow-hidden border border-[#232A44] shadow-[0_0_60px_rgba(0,0,0,0.95)]">
              <FaustDspLab
                isOpen={true}
                onClose={() => setIsFaustDspOpen(false)}
                tracks={tracks}
                onApplyVstToTrack={(trackId, vstName) => {
                  const targetTrack = tracks.find(t => t.id === trackId);
                  const currentVsts = targetTrack?.vsts ? [...targetTrack.vsts, vstName] : [vstName];
                  updateTrack(trackId, {
                    vsts: currentVsts,
                    vstBypassed: false
                  });
                  setIsFaustDspOpen(false);
                }}
              />
            </div>
          </div>
        )}

        {/* Spotify Basic Pitch Audio-to-MIDI Modal */}
        {isBasicPitchOpen && (
          <BasicPitchModal
            isOpen={isBasicPitchOpen}
            onClose={() => setIsBasicPitchOpen(false)}
            tracks={tracks}
            initialStemCategory={basicPitchInitialStem}
            initialSongTitle={basicPitchSongTitle}
            initialAudioBuffer={basicPitchAudioBuffer || undefined}
            onAddMidiTrackToMixer={(trackName, clip, instrumentName) => {
              const newTrack: Track = {
                id: `midi-track-${Date.now()}`,
                name: trackName,
                type: 'midi',
                volume: 0.85,
                pan: 0,
                muted: false,
                soloed: false,
                color: '#10B981',
                phaseInverted: false,
                isMono: false,
                vstBypassed: false,
                instrument: instrumentName,
                clips: [clip]
              };
              setTracks(prev => [...prev, newTrack]);
              setIsBasicPitchOpen(false);
            }}
            onAddMultiStemMidiTracksToMixer={(newTracks, bpm) => {
              if (setTempo) setTempo(bpm);
              setTracks(prev => [...prev, ...newTracks]);
              setIsBasicPitchOpen(false);
            }}
          />
        )}

        {/* MidiEditor Modal */}
        {isMidiEditorOpen && (
          <MidiEditor
            isOpen={isMidiEditorOpen}
            onClose={() => setIsMidiEditorOpen(false)}
            initialNotes={midiEditorNotes}
            clipName={midiEditorClipName}
            projectBpm={tempo}
            initialInstrument={midiEditorInstrument}
            activeTrackId={midiEditorTargetTrackId || undefined}
            tracks={tracks}
            onSaveClipNotes={handleSaveMidiEditorNotes}
            onExportToNewTrack={handleExportNewMidiTrackFromEditor}
            globalSnapValue={snapValue}
            initialSwingPercent={midiQuantizeSwing}
          />
        )}

        {/* Virtual Hardware MIDI Controller Rack (Motorized 8-Fader & 8-Knob Desk) */}
        {isVirtualControllerOpen && (
          <VirtualMidiControllerRack
            isOpen={isVirtualControllerOpen}
            onClose={() => setIsVirtualControllerOpen(false)}
            onAutoMap8={() => {
              midiLearnService.autoMap8Tracks(tracks);
            }}
          />
        )}
      </Suspense>
    </div>
  );
};

export default Mixer;
