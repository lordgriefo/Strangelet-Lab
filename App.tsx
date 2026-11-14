import React, { useState, useEffect, useRef, lazy, Suspense, Component, ErrorInfo, ReactNode } from 'react';
import Layout from './components/Layout';
import TapeSaturatorOverlay, { TapeSaturationIntensity } from './components/TapeSaturatorOverlay';
import { projectHistory } from './services/projectHistoryService';
import { projectAutoSave, AutoSaveMetadata } from './services/projectAutoSaveService';
import { AutoSaveRestoreBanner } from './components/AutoSaveRestoreBanner';
import { HistoryHudToast } from './components/HistoryHudToast';
import { collabService, CollabSessionState } from './services/collabService';
import { GlobalMidiLearnHud } from './components/GlobalMidiLearnHud';
import type { ContextMenuTarget } from './components/StudioContextMenu';

const Mixer = lazy(() => import('./components/Mixer'));
const GhostInTheMachine = lazy(() => import('./components/GhostInTheMachine').then(m => ({ default: m.GhostInTheMachine })));

const WaveSplitter = lazy(() => import('./components/WaveSplitter'));
const Mastering = lazy(() => import('./components/Mastering'));
const SystemCore = lazy(() => import('./components/SystemCore'));
const Pedalboard = lazy(() => import('./components/Pedalboard'));
const Aura = lazy(() => import('./components/Aura'));
const InstrumentGenerator = lazy(() => import('./components/InstrumentGenerator'));
const AudioEditor = lazy(() => import('./components/AudioEditor'));
const DrumDesigner = lazy(() => import('./components/DrumDesigner'));
const LargeSonicCollider = lazy(() => import('./components/LargeSonicCollider/LargeSonicCollider'));
const BeamSplitterView = lazy(() => import('./components/BeamSplitterView').then(m => ({ default: m.BeamSplitterView })));
const NewProjectModal = lazy(() => import('./components/NewProjectModal'));
const LiveRecorder = lazy(() => import('./components/LiveRecorder'));
const AiMixStepModal = lazy(() => import('./components/AiMixStepModal').then(m => ({ default: m.AiMixStepModal })));
const KoboldSettingsModal = lazy(() => import('./components/KoboldSettingsModal').then(m => ({ default: m.KoboldSettingsModal })));
const AceStepLoopDesigner = lazy(() => import('./components/AceStepLoopDesigner').then(m => ({ default: m.AceStepLoopDesigner })));
const FaustDspLab = lazy(() => import('./components/FaustDspLab').then(m => ({ default: m.FaustDspLab })));
const BasicPitchModal = lazy(() => import('./components/BasicPitchModal').then(m => ({ default: m.BasicPitchModal })));
const MidiEditor = lazy(() => import('./components/MidiEditor').then(m => ({ default: m.MidiEditor })));
const SoftwareDojoModal = lazy(() => import('./components/SoftwareDojoModal').then(m => ({ default: m.SoftwareDojoModal })));
const UserGuideModal = lazy(() => import('./components/UserGuideModal').then(m => ({ default: m.UserGuideModal })));
const ResourceVramManagerModal = lazy(() => import('./components/ResourceVramManagerModal').then(m => ({ default: m.ResourceVramManagerModal })));
const WorkflowStudioModal = lazy(() => import('./components/WorkflowStudioModal').then(m => ({ default: m.WorkflowStudioModal })));
const SfzOpenLibraryModal = lazy(() => import('./components/SfzOpenLibraryModal').then(m => ({ default: m.SfzOpenLibraryModal })));
const AceStepLoraLibraryModal = lazy(() => import('./components/AceStepLoraLibraryModal').then(m => ({ default: m.AceStepLoraLibraryModal })));
const ProjectStatisticsDashboard = lazy(() => import('./components/ProjectStatisticsDashboard').then(m => ({ default: m.ProjectStatisticsDashboard })));
const VoiceCloner = lazy(() => import('./components/VoiceCloner').then(m => ({ default: m.VoiceCloner })));
const SpectralAnalysisView = lazy(() => import('./components/SpectralAnalysisView').then(m => ({ default: m.SpectralAnalysisView })));
const CollaborativeWorkspaceModal = lazy(() => import('./components/CollaborativeWorkspaceModal').then(m => ({ default: m.CollaborativeWorkspaceModal })));
const Yue2GeneratorModal = lazy(() => import('./components/Yue2GeneratorModal').then(m => ({ default: m.Yue2GeneratorModal })));
const VstWrapperHostModal = lazy(() => import('./components/VstWrapperHostModal').then(m => ({ default: m.VstWrapperHostModal })));
const DrumTriggerView = lazy(() => import('./components/DrumTriggerView').then(m => ({ default: m.DrumTriggerView })));
const StudioContextMenu = lazy(() => import('./components/StudioContextMenu').then(m => ({ default: m.StudioContextMenu })));
const BatchStemExportModal = lazy(() => import('./components/BatchStemExportModal').then(m => ({ default: m.BatchStemExportModal })));
const TemplateGallery = lazy(() => import('./components/TemplateGallery').then(m => ({ default: m.TemplateGallery })));
import { 
  Clip, 
  View, 
  Track, 
  ProjectSession, 
  ProjectTemplate, 
  LaserToolType, 
  ProjectBinClip, 
  AiMixStep, 
  AceStepSongBedResult,
  ProjectTemplateConfig,
  SfzLibraryInstrument
} from './types';
import { INITIAL_TRACKS } from './constants';
import { Mic, Music, Zap, Layers, Scissors, X } from 'lucide-react';
import { 
  startLynchianAmbientDrone, 
  stopLynchianAmbientDrone, 
  playLaserBeamSound, 
  playColliderInjectionSound, 
  setRecordingSafetyGuard,
  isUiSoundMuted,
  toggleUiSoundMuted,
  subscribeUiSoundMute
} from './lib/laserSound';
import { useSnapGrid } from './services/snapGridService';
import { audioService } from './services/audioService';

const PlaceholderView: React.FC<{ title: string; icon: any; desc: string }> = ({ title, icon: Icon, desc }) => (
  <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-[#0D0D11]">
    <div className="w-16 h-16 rounded-2xl bg-[#1A1A26] border border-[#282838] flex items-center justify-center text-[#FFD700] mb-4 shadow-[0_0_20px_rgba(255,215,0,0.15)]">
      <Icon size={32} />
    </div>
    <h3 className="text-xl font-bold text-white mb-2 tracking-wide font-mono">{title}</h3>
    <p className="text-sm text-[#888] max-w-md leading-relaxed">{desc}</p>
  </div>
);

interface ViewErrorBoundaryProps {
  viewKey: string;
  onRecover: () => void;
  children: ReactNode;
}

interface ViewErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class ViewErrorBoundary extends Component<ViewErrorBoundaryProps, ViewErrorBoundaryState> {
  constructor(props: ViewErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  public static getDerivedStateFromError(error: Error): ViewErrorBoundaryState {
    return { hasError: true, errorMessage: error.message || 'Module failed to initialize' };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Studio View Boundary caught error:', error, errorInfo);
  }

  public componentDidUpdate(prevProps: ViewErrorBoundaryProps) {
    if (prevProps.viewKey !== this.props.viewKey && this.state.hasError) {
      this.setState({ hasError: false, errorMessage: '' });
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-6 bg-[#060810] text-center font-mono">
          <div className="max-w-md p-6 rounded-xl bg-[#0D1220] border border-red-500/50 shadow-xl">
            <h3 className="text-sm font-bold text-[#FFD700] mb-2">STUDIO MODULE INTERRUPTED</h3>
            <p className="text-xs text-[#94A3B8] mb-4">
              {this.state.errorMessage || 'A workspace module encountered a temporary runtime error.'}
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => this.setState({ hasError: false, errorMessage: '' })}
                className="px-3 py-1.5 rounded bg-[#1E2538] hover:bg-[#2A334D] text-cyan-300 text-xs border border-cyan-500/40"
              >
                Retry Module
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, errorMessage: '' });
                  this.props.onRecover();
                }}
                className="px-3 py-1.5 rounded bg-[#FF8C00] hover:bg-[#FFD700] text-black font-bold text-xs"
              >
                Return to Mixer
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.MIXER);
  const [activeClip, setActiveClip] = useState<Clip | null>(null);
  const { effectiveSnapValue: snapValue, setDivision: setSnapValue } = useSnapGrid();

  // Lynchian Mode, Laser Pointer, Tape Saturator & Live Recorder State
  const [lynchianMode, setLynchianMode] = useState<boolean>(false);
  const [isAmbientDroneMuted, setIsAmbientDroneMuted] = useState<boolean>(false);
  const [activeLaserTool, setActiveLaserTool] = useState<LaserToolType>('laser_audio');
  const [beamModeEnabled, setBeamModeEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('strangelet_beam_mode_enabled') !== 'false';
    } catch {
      return true;
    }
  });
  const handleToggleBeamMode = () => {
    setBeamModeEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('strangelet_beam_mode_enabled', String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
    playLaserBeamSound('laser_select');
  };
  const [tapeIntensity, setTapeIntensity] = useState<TapeSaturationIntensity>('subtle');
  const [isLiveRecorderOpen, setIsLiveRecorderOpen] = useState<boolean>(false);
  const [mixerModalRequest, setMixerModalRequest] = useState<{ type: 'chronomap' | 'beamsplitter'; id: number } | null>(null);
  const globalAudioImportInputRef = useRef<HTMLInputElement>(null);

  // Global Project & Routing State
  const [isNewProjectOpen, setIsNewProjectOpen] = useState<boolean>(false);
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [tempo, setTempo] = useState<number>(120);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [projectBinClips, setProjectBinClips] = useState<ProjectBinClip[]>([]);
  const [activeSession, setActiveSession] = useState<ProjectSession>({
    name: 'Project_Neon_Sky.slp',
    bpm: 120,
    sampleRate: 48000,
    bitDepth: 24,
    templateId: 'vocal-tracking',
    templateName: 'Standard Multitrack'
  });

  // Auto-Arm on Selection State
  const [isAutoArmMode, setIsAutoArmMode] = useState<boolean>(() => {
    return localStorage.getItem('strangelet_auto_arm_mode') !== 'false';
  });

  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(() => {
    const armed = INITIAL_TRACKS.find(t => t.isArmedForRecord);
    return armed ? armed.id : (INITIAL_TRACKS[0]?.id || null);
  });

  const handleToggleAutoArm = () => {
    setIsAutoArmMode(prev => {
      const next = !prev;
      localStorage.setItem('strangelet_auto_arm_mode', String(next));
      if (next) {
        const targetId = selectedTrackId || tracks[0]?.id;
        if (targetId) {
          setTracks(prevTracks => prevTracks.map(t => ({
            ...t,
            isArmedForRecord: t.id === targetId
          })));
        }
      }
      return next;
    });
    playLaserBeamSound('laser_select');
  };

  const handleSelectTrack = (trackId: string) => {
    setSelectedTrackId(trackId);
    if (isAutoArmMode) {
      setTracks(prev => prev.map(t => ({
        ...t,
        isArmedForRecord: t.id === trackId
      })));
    }
  };

  // KoboldCpp AI Step & Quinn Ghost in the Machine State
  const [isAiMixStepModalOpen, setIsAiMixStepModalOpen] = useState<boolean>(false);
  const [isKoboldSettingsOpen, setIsKoboldSettingsOpen] = useState<boolean>(false);
  const [isResourceManagerOpen, setIsResourceManagerOpen] = useState<boolean>(false);
  const [isSoftwareDojoOpen, setIsSoftwareDojoOpen] = useState<boolean>(false);
  const [isUserGuideOpen, setIsUserGuideOpen] = useState<boolean>(false);
  const [isAceStepModalOpen, setIsAceStepModalOpen] = useState<boolean>(false);
  const [isFaustDspModalOpen, setIsFaustDspModalOpen] = useState<boolean>(false);
  const [isBasicPitchModalOpen, setIsBasicPitchModalOpen] = useState<boolean>(false);
  const [basicPitchStemCategory, setBasicPitchStemCategory] = useState<'vocals' | 'bass' | 'drums' | 'instruments' | 'full'>('instruments');
  const [basicPitchSongTitle, setBasicPitchSongTitle] = useState<string>('Suno AI Master');
  const [basicPitchAudioBuffer, setBasicPitchAudioBuffer] = useState<AudioBuffer | null>(null);
  const [appliedAiMixSteps, setAppliedAiMixSteps] = useState<AiMixStep[]>([]);
  const [globalCollisionEnergy, setGlobalCollisionEnergy] = useState<number>(8.4);
  const [isWorkflowStudioOpen, setIsWorkflowStudioOpen] = useState<boolean>(false);
  const [isSfzLibraryOpen, setIsSfzLibraryOpen] = useState<boolean>(false);
  const [isLoraLibraryOpen, setIsLoraLibraryOpen] = useState<boolean>(false);
  const [isGhostBuddyOpen, setIsGhostBuddyOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('strangelet_ghost_buddy_active');
    return saved !== null ? saved === 'true' : true; // Default active on launch as requested
  });
  const [isBatchStemExportOpen, setIsBatchStemExportOpen] = useState<boolean>(false);
  const [isCollabModalOpen, setIsCollabModalOpen] = useState<boolean>(false);
  const [collabState, setCollabState] = useState<CollabSessionState>(() => collabService.getState());
  const [isYue2ModalOpen, setIsYue2ModalOpen] = useState<boolean>(false);
  const [aceStepInitialPrompt, setAceStepInitialPrompt] = useState<string>('');
  const [yue2InitialPrompt, setYue2InitialPrompt] = useState<string>('');
  const [isVstWrapperHostOpen, setIsVstWrapperHostOpen] = useState<boolean>(false);
  const [vstWrapperHostPluginId, setVstWrapperHostPluginId] = useState<string | undefined>(undefined);

  // Real-Time Collaborative Workspace Subscriptions
  useEffect(() => {
    const unsubState = collabService.subscribe(setCollabState);

    const unsubTrackChange = collabService.onTrackChange((trackId, updates) => {
      setTracks(prev => prev.map(t => t.id === trackId ? { ...t, ...updates } : t));
    });

    const unsubAllTracks = collabService.onAllTracks((remoteTracks) => {
      setTracks(remoteTracks);
    });

    const unsubTransport = collabService.onTransportChange((transport) => {
      if (transport.tempo !== undefined) {
        setTempo(transport.tempo);
      }
    });

    // Check URL parameters for direct room join links (e.g. ?session=NEON-7701)
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const urlSession = searchParams.get('session');
      if (urlSession && urlSession.trim().length >= 4) {
        collabService.joinSession(urlSession.trim().toUpperCase(), tracks, tempo);
      }
    } catch (e) {
      console.warn('Collaborative session URL check failed:', e);
    }

    return () => {
      unsubState();
      unsubTrackChange();
      unsubAllTracks();
      unsubTransport();
    };
  }, []);

  // Studio Right-Click Shortcut Context Menu State & UI Sound Subscription
  const [contextMenuTarget, setContextMenuTarget] = useState<ContextMenuTarget | null>(null);
  const [uiSoundMuted, setUiSoundMuted] = useState<boolean>(() => isUiSoundMuted());

  useEffect(() => {
    return subscribeUiSoundMute((muted) => {
      setUiSoundMuted(muted);
    });
  }, []);

  // Global Right-Click Studio Shortcut Context Menu Trigger
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Allow browser native menu inside text inputs / textareas / contenteditables
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // In Beam Paint mode (Blue/Green laser), right-click on track lanes is reserved for ACID-style incremental erase
      if (!e.ctrlKey && target.closest('[data-beam-paint-lane="true"]')) {
        e.preventDefault();
        return;
      }

      e.preventDefault();

      const trackEl = target.closest('[data-track-id]');
      const clipEl = target.closest('[data-clip-id]');

      const trackId = trackEl?.getAttribute('data-track-id') || null;
      const clipId = clipEl?.getAttribute('data-clip-id') || null;

      setContextMenuTarget({
        x: e.clientX,
        y: e.clientY,
        trackId,
        clipId
      });
    };

    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  // Undo/Redo & Configurable Auto-Save State
  const [lastAutoSavedTimestamp, setLastAutoSavedTimestamp] = useState<number | null>(projectAutoSave.getLastSavedTimestamp());
  const [autoSaveRestorePrompt, setAutoSaveRestorePrompt] = useState<AutoSaveMetadata | null>(null);
  const [autoSaveSettings, setAutoSaveSettings] = useState(() => projectAutoSave.getSettings());

  useEffect(() => {
    const unsubscribe = projectAutoSave.subscribeSettings(setAutoSaveSettings);
    return unsubscribe;
  }, []);

  // Check for auto-saved session snapshot on initial launch
  useEffect(() => {
    if (projectAutoSave.hasAutoSave()) {
      const meta = projectAutoSave.getMetadata();
      if (meta && meta.trackCount > 0) {
        setAutoSaveRestorePrompt(meta);
      }
    }
  }, []);

  const latestTracksRef = useRef(tracks);
  latestTracksRef.current = tracks;
  const latestTempoRef = useRef(tempo);
  latestTempoRef.current = tempo;
  const latestSessionRef = useRef(activeSession);
  latestSessionRef.current = activeSession;

  // Configurable Background Auto-Save Interval (restarts cleanly when toggled or duration changes)
  useEffect(() => {
    if (!autoSaveSettings.enabled) return;

    const intervalMs = Math.max(10, autoSaveSettings.intervalSeconds) * 1000;
    const timer = window.setInterval(() => {
      if (projectAutoSave.isEnabled()) {
        const ok = projectAutoSave.save(
          latestSessionRef.current,
          latestTracksRef.current,
          latestTempoRef.current,
          { source: 'auto' }
        );
        if (ok) {
          setLastAutoSavedTimestamp(Date.now());
        }
      }
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [autoSaveSettings.enabled, autoSaveSettings.intervalSeconds]);

  // Undo operation
  const handleUndo = () => {
    const restored = projectHistory.undo(latestTracksRef.current, latestTempoRef.current);
    if (restored) {
      setTracks(restored.tracks);
      setTempo(restored.tempo);
    }
  };

  // Redo operation
  const handleRedo = () => {
    const restored = projectHistory.redo(latestTracksRef.current, latestTempoRef.current);
    if (restored) {
      setTracks(restored.tracks);
      setTempo(restored.tempo);
    }
  };

  // Manual save trigger (works even when background auto-save is turned off)
  const handleManualSave = () => {
    const ok = projectAutoSave.save(
      latestSessionRef.current,
      latestTracksRef.current,
      latestTempoRef.current,
      { force: true, source: 'manual' }
    );
    if (ok) {
      setLastAutoSavedTimestamp(Date.now());
      playLaserBeamSound('laser_curve');
    }
  };

  // Restore auto-saved session
  const handleRestoreAutoSave = () => {
    const payload = projectAutoSave.load();
    if (payload) {
      projectHistory.pushSnapshot('Before Restoring Auto-Saved Project', tracks, tempo);
      setTracks(payload.tracks);
      setTempo(payload.tempo);
      setActiveSession(payload.session);
      setAutoSaveRestorePrompt(null);
      playLaserBeamSound('laser_select');
    }
  };

  // Global keyboard shortcuts (Ctrl+Z / Ctrl+Y / Ctrl+S, Alt+G for Ghost Buddy, F1/? for Manual, Ctrl+B for Sidebar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // Undo: Ctrl+Z / Cmd+Z (without Shift)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Y / Cmd+Y or Ctrl+Shift+Z / Cmd+Shift+Z
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
          ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Manual Quick Save: Ctrl+S / Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleManualSave();
        return;
      }

      // Alt+G: Toggle Ghost Buddy
      if (e.altKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setIsGhostBuddyOpen(prev => !prev);
        return;
      }

      // Ctrl+B: Toggle Sidebar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed(prev => !prev);
        return;
      }

      // Batch Stem Export: Ctrl+E / Cmd+E (triggers from any view)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setIsBatchStemExportOpen(true);
        playLaserBeamSound('laser_select');
        return;
      }

      // F1 or ?: Toggle User Guide & Manual
      if (e.key === 'F1' || (e.key === '?' && !e.ctrlKey && !e.metaKey)) {
        e.preventDefault();
        setIsUserGuideOpen(prev => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 1-Click Project Template Loader
  const handleLoadTemplate = (template: ProjectTemplateConfig) => {
    projectHistory.pushSnapshot(`Load Template [${template.name}]`, tracks, tempo);
    setTempo(template.bpm);
    setActiveSession({
      name: `${template.name.replace(/\s+/g, '_')}.slp`,
      bpm: template.bpm,
      sampleRate: 48000,
      bitDepth: 24,
      templateId: template.id,
      templateName: template.name
    });

    const newTracks: Track[] = template.tracks.map((t, idx) => ({
      id: `tmpl-track-${idx}-${Date.now()}`,
      name: t.name,
      type: t.type === 'synth' ? 'midi' : t.type,
      volume: t.volume,
      pan: t.pan,
      muted: false,
      soloed: false,
      color: t.color,
      phaseInverted: false,
      isMono: t.type === 'audio' && t.name.toLowerCase().includes('bass'),
      vstBypassed: false,
      instrument: t.instrument,
      humanizeEnabled: t.humanizeEnabled ?? false,
      humanizeAmount: t.humanizeAmount ?? 0.18,
      midiConfig: t.humanizeEnabled ? { humanizeEnabled: true, humanizeAmount: t.humanizeAmount ?? 0.18 } : undefined,
      clips: (t.initialClipsCount || 0) > 0 ? [{
        id: `clip-tmpl-${idx}-${Date.now()}`,
        name: `${t.name} Loop`,
        startBar: 0,
        durationBars: 4,
        isMidi: t.type === 'midi',
        instrument: t.instrument
      }] : []
    }));

    setTracks(newTracks);
    setCurrentView(View.MIXER);
  };

  // Launch Guided Workflow Step
  const handleLaunchWorkflowStep = (stepNumber: number, target: string, workflowId: string) => {
    switch (target) {
      case 'lsc':
        setCurrentView(View.SONIC_COLLIDER);
        break;
      case 'acestep':
        setIsAceStepModalOpen(true);
        break;
      case 'mixer':
        setCurrentView(View.MIXER);
        break;
      case 'humanizer':
        setCurrentView(View.MIXER);
        setIsLiveRecorderOpen(true);
        break;
      case 'beamsplitter':
        setCurrentView(View.BEAM_SPLITTER);
        break;
      case 'devine':
        setCurrentView(View.INSTRUMENT_GENERATOR);
        break;
      case 'faust':
        setIsFaustDspModalOpen(true);
        break;
      case 'goldpath':
        setCurrentView(View.MASTERING);
        break;
      default:
        setCurrentView(View.MIXER);
    }
  };

  // Load SFZ Instrument to Track
  const handleLoadSfzInstrument = (inst: SfzLibraryInstrument) => {
    projectHistory.pushSnapshot(`Load SFZ Instrument [${inst.name}]`, tracks, tempo);
    const newTrack: Track = {
      id: `sfz-track-${Date.now()}`,
      name: inst.name,
      type: 'midi',
      volume: 0.85,
      pan: 0,
      muted: false,
      soloed: false,
      color: inst.category === 'keys' ? '#06B6D4' : (inst.category === 'bass' ? '#8B5CF6' : '#EC4899'),
      phaseInverted: false,
      isMono: inst.category === 'bass',
      vstBypassed: false,
      instrument: inst.name,
      humanizeEnabled: true,
      humanizeAmount: 0.18,
      clips: [{
        id: `clip-sfz-${Date.now()}`,
        name: `${inst.name} Region`,
        startBar: 0,
        durationBars: 4,
        isMidi: true,
        instrument: inst.name
      }]
    };
    setTracks(prev => [...prev, newTrack]);
    setCurrentView(View.MIXER);
  };

  const handleOpenBasicPitch = (
    stemCategory: 'vocals' | 'bass' | 'drums' | 'instruments' | 'full' = 'instruments',
    songTitle: string = 'Suno AI Master',
    audioBuffer?: AudioBuffer
  ) => {
    setBasicPitchStemCategory(stemCategory);
    setBasicPitchSongTitle(songTitle);
    setBasicPitchAudioBuffer(audioBuffer || null);
    setIsBasicPitchModalOpen(true);
  };

  // Apply complete multi-track song bed from Ace-Step 1.5 to Mixer Console in sync
  const handleApplySongBedToMixer = (songBed: AceStepSongBedResult) => {
    projectHistory.pushSnapshot(`Apply Ace-Step Song Bed (${songBed.bpm} BPM)`, tracks, tempo);
    setTempo(songBed.bpm);
    
    // Convert stems to synchronized tracks positioned at bar 0
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

    // If guitar overdub track is requested, add an armed live tracking channel
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
    setIsAceStepModalOpen(false);
    setCurrentView(View.MIXER);
  };

  // 1-Click Multi-Stem deployment for YuE 2.0 AI Generator
  const handleAddYuE2StemsToMixer = (stems: { name: string; buffer: AudioBuffer; color: string; durationBars: number }[], newBpm: number) => {
    projectHistory.pushSnapshot(`Import YuE 2.0 Stems (${stems.length} stems)`, tracks, tempo);
    setTempo(newBpm);
    const newTracks: Track[] = stems.map((stem, idx) => ({
      id: `yue-track-${idx}-${Date.now()}`,
      name: stem.name,
      type: 'audio',
      volume: 0.82,
      pan: 0,
      muted: false,
      soloed: false,
      color: stem.color,
      phaseInverted: false,
      isMono: stem.name.toLowerCase().includes('bass'),
      vstBypassed: false,
      clips: [{
        id: `clip-yue-${idx}-${Date.now()}`,
        name: stem.name,
        startBar: 0,
        durationBars: stem.durationBars
      }]
    }));
    setTracks(prev => [...prev, ...newTracks]);
    setIsYue2ModalOpen(false);
    setCurrentView(View.MIXER);
  };

  const handleApplyVstToTrack = (trackId: string, vstName: string) => {
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        const vsts = t.vsts ? [...t.vsts, vstName] : [vstName];
        return {
          ...t,
          vsts,
          vstBypassed: false
        };
      }
      return t;
    }));
  };

  const handleApplyAiMixStep = (step: AiMixStep) => {
    projectHistory.pushSnapshot(`Apply AI Mix: ${step.name}`, tracks, tempo);
    if (step.targetTrackId && step.targetTrackId !== 'master') {
      setTracks(prev => prev.map(t => {
        if (t.id === step.targetTrackId) {
          const volDelta = (step.parameters.volumeAdjustmentDb || 0) / 24;
          const newVol = Math.max(0.1, Math.min(1.0, t.volume + volDelta));
          const newPan = Math.max(-1.0, Math.min(1.0, t.pan + (step.parameters.panAdjustment || 0)));
          return {
            ...t,
            volume: parseFloat(newVol.toFixed(2)),
            pan: parseFloat(newPan.toFixed(2))
          };
        }
        return t;
      }));
    }
    setAppliedAiMixSteps(prev => [step, ...prev.filter(s => s.id !== step.id)]);
  };

  const handleRevertAiMixStep = (stepId: string) => {
    setAppliedAiMixSteps(prev => prev.filter(s => s.id !== stepId));
  };

  // Lynchian Mode ambient sound manager: runs isolated to prevent take corruption
  useEffect(() => {
    if (lynchianMode && !isAmbientDroneMuted) {
      startLynchianAmbientDrone(0.06);
    } else {
      stopLynchianAmbientDrone();
    }

    return () => {
      stopLynchianAmbientDrone();
    };
  }, [lynchianMode, isAmbientDroneMuted]);

  // Audio Recording Safety Guard:
  // Automatically suppress all UI sound effects (beeps, clicks, sweeps) whenever an audio track is armed for recording
  // or the live microphone recorder is open, guaranteeing zero acoustic bleed or loopback interference.
  useEffect(() => {
    const isArmed = tracks.some(t => t.isArmedForRecord) || isLiveRecorderOpen;
    setRecordingSafetyGuard(isArmed);
  }, [tracks, isLiveRecorderOpen]);


  const handleToggleLynchianMode = () => {
    setLynchianMode(prev => {
      const next = !prev;
      playLaserBeamSound(next ? 'laser_curve' : 'laser_audio');
      return next;
    });
  };

  const handleToggleAmbientDroneMute = () => {
    setIsAmbientDroneMuted(prev => !prev);
  };


  const handleCreateProject = (
    template: ProjectTemplate,
    config: { name: string; bpm: number; sampleRate: number; bitDepth: number }
  ) => {
    projectHistory.pushSnapshot(`New Project [${config.name}]`, tracks, tempo);
    // Deep clone template tracks to give them distinct mutable references
    const newTracks: Track[] = template.tracks.map((t, idx) => ({
      ...t,
      id: `track-${template.id}-${idx + 1}-${Date.now()}`,
      clips: t.clips ? t.clips.map(c => ({ ...c, id: `clip-${Math.random().toString(36).substr(2, 9)}` })) : []
    }));

    setTracks(newTracks);
    setTempo(config.bpm);
    setActiveSession({
      name: config.name,
      bpm: config.bpm,
      sampleRate: config.sampleRate,
      bitDepth: config.bitDepth,
      templateId: template.id,
      templateName: template.name
    });

    // Automatically navigate to the optimal view for this template
    if (template.recommendedView) {
      setCurrentView(template.recommendedView);
    }
  };

  const handleToggleTrackMute = (trackId: string) => {
    const target = tracks.find(t => t.id === trackId);
    if (target) {
      projectHistory.pushSnapshot(`${target.muted ? 'Unmute' : 'Mute'} Track [${target.name}]`, tracks, tempo);
    }
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, muted: !t.muted } : t));
  };

  const handleToggleTrackSolo = (trackId: string) => {
    const target = tracks.find(t => t.id === trackId);
    if (target) {
      projectHistory.pushSnapshot(`${target.soloed ? 'Unsolo' : 'Solo'} Track [${target.name}]`, tracks, tempo);
    }
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, soloed: !t.soloed } : t));
  };

  const handleUpdateTrack = (trackId: string, updates: Partial<Track>) => {
    const target = tracks.find(t => t.id === trackId);
    if (target) {
      if (updates.clips && updates.clips !== target.clips) {
        projectHistory.pushSnapshot(`Update Clips [${target.name}]`, tracks, tempo);
      } else if (updates.muted !== undefined && updates.muted !== target.muted) {
        projectHistory.pushSnapshot(`${updates.muted ? 'Mute' : 'Unmute'} Track [${target.name}]`, tracks, tempo);
      } else if (updates.soloed !== undefined && updates.soloed !== target.soloed) {
        projectHistory.pushSnapshot(`${updates.soloed ? 'Solo' : 'Unsolo'} Track [${target.name}]`, tracks, tempo);
      } else if (updates.name && updates.name !== target.name) {
        projectHistory.pushSnapshot(`Rename Track to "${updates.name}"`, tracks, tempo);
      }
    }
    // Broadcast track changes to room collaborators unless triggered by remote peer
    if (!collabService.getIsRemoteUpdate()) {
      collabService.broadcastTrackUpdate(trackId, updates);
    }
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, ...updates } : t));
  };

  const handleAddTrackWithClip = (trackName: string, clip: Clip) => {
    projectHistory.pushSnapshot(`Add Recorded Track [${trackName}]`, tracks, tempo);
    const newTrack: Track = {
      id: `rec-track-${Date.now()}`,
      name: trackName,
      type: 'audio',
      volume: 0.85,
      pan: 0,
      muted: false,
      soloed: false,
      color: '#EF4444',
      phaseInverted: false,
      isMono: false,
      vstBypassed: false,
      clips: [clip]
    };
    setTracks(prev => [...prev, newTrack]);
    setIsLiveRecorderOpen(false);
  };

  const handleAddClipToTrack = (trackId: string, clip: Clip) => {
    const target = tracks.find(t => t.id === trackId);
    projectHistory.pushSnapshot(`Add Clip to [${target?.name || 'Track'}]`, tracks, tempo);
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        return {
          ...t,
          clips: [...t.clips, clip]
        };
      }
      return t;
    }));
    setIsLiveRecorderOpen(false);
  };

  const handleAddProjectBinClips = (newClips: ProjectBinClip[]) => {
    setProjectBinClips(prev => [...newClips, ...prev]);
  };

  const handleInsertBinClipToTrack = (clip: ProjectBinClip) => {
    const audioTrack = tracks.find(t => t.type === 'audio') || tracks[0];
    if (!audioTrack) return;

    projectHistory.pushSnapshot(`Insert Bin Clip [${clip.name}]`, tracks, tempo);
    const newClip: Clip = {
      id: `clip-from-bin-${Date.now()}`,
      name: clip.name,
      startBar: 0,
      durationBars: clip.durationBars || 1,
      audioUrl: clip.audioUrl
    };

    setTracks(prev => prev.map(t => t.id === audioTrack.id ? { ...t, clips: [...t.clips, newClip] } : t));
  };

  // Global Audio File Import (used by DawMenuBar -> File -> Import Audio & Sidebar ImportArea)
  const handleImportAudioFile = async (file: File) => {
    const id = `audio-import-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    let durationBars = 4;
    let waveformSnippet: number[] | undefined;

    try {
      await audioService.loadAudio(id, file);
      const buf = audioService.getTrackAudioBuffer(id);
      if (buf && buf.duration > 0) {
        const secondsPerBar = (60 / Math.max(40, tempo)) * 4;
        durationBars = Math.max(1, Math.min(32, Math.round((buf.duration / secondsPerBar) * 4) / 4));
        const ch = buf.getChannelData(0);
        const bars = 80;
        const step = Math.max(1, Math.floor(ch.length / bars));
        const peaks: number[] = [];
        for (let i = 0; i < bars; i++) {
          let peak = 0;
          const start = i * step;
          for (let j = 0; j < step && start + j < ch.length; j += 4) {
            const v = Math.abs(ch[start + j]);
            if (v > peak) peak = v;
          }
          peaks.push(Number(Math.min(1, peak).toFixed(3)));
        }
        waveformSnippet = peaks;
      }
    } catch (err) {
      console.warn('Audio decode fallback during global import:', err);
    }

    const newClip: Clip = {
      id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: file.name,
      startBar: 0,
      durationBars,
      waveformSnippet
    };

    const newTrack: Track = {
      id,
      name: file.name.replace(/\.[^/.]+$/, '') || file.name,
      type: 'audio',
      volume: 0.8,
      pan: 0,
      muted: false,
      soloed: false,
      color: '#10B981',
      phaseInverted: false,
      isMono: false,
      vstBypassed: true,
      waveform: waveformSnippet,
      clips: [newClip]
    };

    projectHistory.pushSnapshot(`Import Audio Track [${file.name}]`, tracks, tempo);
    setTracks(prev => [...prev, newTrack]);
    setActiveClip(newClip);
    setSelectedTrackId(id);
    setCurrentView(View.MIXER);
    playLaserBeamSound('laser_audio');
  };

  // Studio Context Menu Track & Clip Operations
  const handleAddAudioTrack = () => {
    projectHistory.pushSnapshot('Add Audio Track', tracks, tempo);
    const count = tracks.filter(t => t.type === 'audio').length + 1;
    const newId = `audio-track-${Date.now()}`;
    const newTrack: Track = {
      id: newId,
      name: `Audio ${count}`,
      type: 'audio',
      volume: 0.85,
      pan: 0,
      muted: false,
      soloed: false,
      color: '#38BDF8',
      phaseInverted: false,
      isMono: false,
      vstBypassed: false,
      isArmedForRecord: isAutoArmMode ? true : false,
      clips: []
    };
    if (isAutoArmMode) {
      setSelectedTrackId(newId);
      setTracks(prev => [...prev.map(t => ({ ...t, isArmedForRecord: false })), newTrack]);
    } else {
      setTracks(prev => [...prev, newTrack]);
    }
  };

  const handleAddMidiTrack = () => {
    projectHistory.pushSnapshot('Add MIDI Track', tracks, tempo);
    const count = tracks.filter(t => t.type === 'midi').length + 1;
    const newId = `midi-track-${Date.now()}`;
    const newTrack: Track = {
      id: newId,
      name: `MIDI Synth ${count}`,
      type: 'midi',
      volume: 0.85,
      pan: 0,
      muted: false,
      soloed: false,
      color: '#A855F7',
      phaseInverted: false,
      isMono: false,
      vstBypassed: false,
      isArmedForRecord: isAutoArmMode ? true : false,
      clips: []
    };
    if (isAutoArmMode) {
      setSelectedTrackId(newId);
      setTracks(prev => [...prev.map(t => ({ ...t, isArmedForRecord: false })), newTrack]);
    } else {
      setTracks(prev => [...prev, newTrack]);
    }
  };

  const handleDeleteTrack = (trackId: string) => {
    const target = tracks.find(t => t.id === trackId);
    projectHistory.pushSnapshot(`Delete Track [${target?.name || trackId}]`, tracks, tempo);
    setTracks(prev => prev.filter(t => t.id !== trackId));
  };

  const handleDuplicateTrack = (trackId: string) => {
    const target = tracks.find(t => t.id === trackId);
    if (!target) return;
    projectHistory.pushSnapshot(`Duplicate Track [${target.name}]`, tracks, tempo);
    const duplicated: Track = {
      ...target,
      id: `track-dup-${Date.now()}`,
      name: `${target.name} (Copy)`,
      clips: target.clips.map(c => ({
        ...c,
        id: `clip-dup-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
      }))
    };
    setTracks(prev => [...prev, duplicated]);
  };

  const handleArmAllTracks = (arm: boolean = true) => {
    projectHistory.pushSnapshot(`${arm ? 'Arm' : 'Disarm'} All Tracks`, tracks, tempo);
    setTracks(prev => prev.map(t => ({ ...t, isArmedForRecord: arm })));
  };

  const handleClearAllMutes = () => {
    projectHistory.pushSnapshot('Clear All Mutes', tracks, tempo);
    setTracks(prev => prev.map(t => ({ ...t, muted: false })));
  };

  const handleClearAllSolos = () => {
    projectHistory.pushSnapshot('Clear All Solos', tracks, tempo);
    setTracks(prev => prev.map(t => ({ ...t, soloed: false })));
  };

  const handleDeleteClip = (trackId: string, clipId: string) => {
    projectHistory.pushSnapshot('Delete Clip', tracks, tempo);
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, clips: t.clips.filter(c => c.id !== clipId) } : t));
  };

  const handleDuplicateClip = (trackId: string, clipId: string) => {
    const track = tracks.find(t => t.id === trackId);
    const clip = track?.clips.find(c => c.id === clipId);
    if (!track || !clip) return;
    projectHistory.pushSnapshot(`Duplicate Clip [${clip.name}]`, tracks, tempo);
    const maxBar = Math.max(0, 16 - clip.durationBars);
    const targetStart = Math.min(maxBar, clip.startBar + clip.durationBars);
    const duplicated: Clip = {
      ...clip,
      id: `clip-dup-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: `${clip.name} (Copy)`,
      startBar: targetStart
    };
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, clips: [...t.clips, duplicated] } : t));
  };

  const handleSplitClip = (trackId: string, clipId: string) => {
    const track = tracks.find(t => t.id === trackId);
    const clip = track?.clips.find(c => c.id === clipId);
    if (!track || !clip || clip.durationBars <= 0.25) return;
    projectHistory.pushSnapshot(`Split Clip [${clip.name}]`, tracks, tempo);
    const half = Number((clip.durationBars / 2).toFixed(4));
    const first: Clip = {
      ...clip,
      id: `clip-split-a-${Date.now()}`,
      name: `${clip.name} Pt.1`,
      durationBars: half
    };
    const second: Clip = {
      ...clip,
      id: `clip-split-b-${Date.now()}`,
      name: `${clip.name} Pt.2`,
      startBar: Number((clip.startBar + half).toFixed(4)),
      durationBars: Number((clip.durationBars - half).toFixed(4))
    };
    setTracks(prev => prev.map(t => t.id === trackId ? {
      ...t,
      clips: t.clips.map(c => c.id === clipId ? first : c).concat(second)
    } : t));
  };

  const renderMixerView = () => (
    <Mixer 
      setActiveClip={setActiveClip} 
      setView={setCurrentView} 
      snapValue={snapValue} 
      setSnapValue={setSnapValue}
      tracks={tracks}
      setTracks={setTracks}
      updateTrack={handleUpdateTrack}
      tempo={tempo}
      setTempo={setTempo}
      onOpenNewProject={() => setIsNewProjectOpen(true)}
      onAddProjectBinClips={handleAddProjectBinClips}
      onOpenAiMixStep={() => setIsAiMixStepModalOpen(true)}
      onOpenAceStepDesigner={() => setIsAceStepModalOpen(true)}
      onOpenFaustDspLab={() => setIsFaustDspModalOpen(true)}
      onOpenBasicPitch={handleOpenBasicPitch}
      onApplySongBedToMixer={handleApplySongBedToMixer}
      onUndo={handleUndo}
      onRedo={handleRedo}
      onManualSave={handleManualSave}
      onRestoreAutoSave={handleRestoreAutoSave}
      lastSavedTimestamp={lastAutoSavedTimestamp}
      isAutoArmMode={isAutoArmMode}
      onToggleAutoArm={handleToggleAutoArm}
      selectedTrackId={selectedTrackId}
      onSelectTrack={handleSelectTrack}
      onOpenYue2Generator={() => setIsYue2ModalOpen(true)}
      onOpenVstWrapperHost={(pluginId) => {
        setVstWrapperHostPluginId(pluginId);
        setIsVstWrapperHostOpen(true);
      }}
      activeSession={activeSession}
      onUpdateSession={setActiveSession}
      onOpenTemplateGalleryView={() => setCurrentView(View.TEMPLATE_GALLERY)}
      activeLaserTool={activeLaserTool}
      onSelectLaserTool={setActiveLaserTool}
      beamModeEnabled={beamModeEnabled}
      onToggleBeamMode={handleToggleBeamMode}
      externalModalRequest={mixerModalRequest}
      onClearExternalModalRequest={() => setMixerModalRequest(null)}
    />
  );

  const renderView = () => {
    switch (currentView) {
      case View.WAVE_SPLITTER:
        return <WaveSplitter />;
      case View.BEAM_SPLITTER:
        return (
          <BeamSplitterView 
            tracks={tracks}
            setTracks={setTracks}
            tempo={tempo}
            onNavigateToMixer={() => setCurrentView(View.MIXER)}
            onToggleSidebar={() => setIsSidebarCollapsed(prev => !prev)}
            isSidebarCollapsed={isSidebarCollapsed}
            projectBinClips={projectBinClips}
            onAddProjectBinClips={handleAddProjectBinClips}
          />
        );
      case View.DRUM_DESIGNER:
        return <DrumDesigner />;
      case View.MIXER:
        return renderMixerView();
      case View.MASTERING:
        return <Mastering />;
      case View.SYSTEM_CORE:
        return <SystemCore />;
      case View.AURA:
        return <Aura />;
      case View.INSTRUMENT_GENERATOR:
        return (
          <InstrumentGenerator 
            onAddTrack={(newTrack) => setTracks(prev => [...prev, newTrack])} 
            tempo={tempo} 
          />
        );
      case View.AUDIO_EDITOR:
        return (
          <AudioEditor 
            clip={activeClip} 
            snapValue={snapValue} 
            onClose={() => setCurrentView(View.MIXER)}
            tracks={tracks}
            tempo={tempo}
            onUpdateClip={(updatedClip) => {
              projectHistory.pushSnapshot(`Update Audio Clip [${updatedClip.name}]`, tracks, tempo);
              setTracks(prev => prev.map(t => ({
                ...t,
                clips: t.clips.map(c => c.id === updatedClip.id ? updatedClip : c)
              })));
              setActiveClip(updatedClip);
            }}
            onSelectClip={(newClip) => setActiveClip(newClip)}
          />
        );
      case View.PROJECT_STATS:
        return (
          <ProjectStatisticsDashboard 
            tracks={tracks} 
            tempo={tempo} 
            session={activeSession} 
            onNavigateToMixer={() => setCurrentView(View.MIXER)}
            onNavigateView={(view) => setCurrentView(view)}
          />
        );
      case View.SONIC_COLLIDER:
        return (
          <LargeSonicCollider 
            onOpenAiMixStep={() => setIsAiMixStepModalOpen(true)}
            onOpenKoboldSettings={() => setIsKoboldSettingsOpen(true)}
            onSendPromptToAceStep={(promptText) => {
              setAceStepInitialPrompt(promptText);
              setIsAceStepModalOpen(true);
            }}
            onSendPromptToYue2={(promptText) => {
              setYue2InitialPrompt(promptText);
              setIsYue2ModalOpen(true);
            }}
          />
        );
      case View.ACESTEP_LOOP_DESIGNER:
        return (
          <AceStepLoopDesigner
            isOpen={true}
            projectBpm={tempo}
            initialPrompt={aceStepInitialPrompt}
            tracks={tracks}
            onAddTrackWithClip={handleAddTrackWithClip}
            onAddClipToTrack={handleAddClipToTrack}
            onAddProjectBinClips={handleAddProjectBinClips}
            onNavigateToMixer={() => setCurrentView(View.MIXER)}
            onApplySongBedToMixer={handleApplySongBedToMixer}
          />
        );
      case View.FAUST_DSP_LAB:
        return (
          <FaustDspLab
            isOpen={true}
            tracks={tracks}
            onApplyVstToTrack={handleApplyVstToTrack}
          />
        );
      case View.MIDI_EDITOR:
        return (
          <MidiEditor
            isOpen={true}
            onClose={() => setCurrentView(View.MIXER)}
            initialNotes={activeClip?.midiNotes || []}
            clipName={activeClip?.name || 'Basic Pitch MIDI Sequence'}
            projectBpm={tempo}
            initialInstrument={activeClip?.instrument || 'SFZ Grand Piano'}
            tracks={tracks}
            globalSnapValue={snapValue}
            onSaveClipNotes={(editedNotes, name, inst) => {
              if (activeClip) {
                setTracks(prev => prev.map(t => ({
                  ...t,
                  clips: t.clips.map(c => c.id === activeClip.id ? {
                    ...c,
                    name: name || c.name,
                    midiNotes: editedNotes,
                    instrument: inst || c.instrument
                  } : c)
                })));
              }
            }}
            onExportToNewTrack={(trackName, editedNotes, inst) => {
              const newTrack: Track = {
                id: `track-midi-${Date.now()}`,
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
                midiConfig: { humanizeEnabled: true, humanizeAmount: 0.18 },
                clips: [{
                  id: `clip-midi-${Date.now()}`,
                  name: trackName,
                  startBar: 0,
                  durationBars: 4,
                  isMidi: true,
                  midiNotes: editedNotes,
                  instrument: inst
                }]
              };
              setTracks(prev => [...prev, newTrack]);
              setCurrentView(View.MIXER);
            }}
          />
        );
      case View.DRUM_TRIGGER:
        return (
          <DrumTriggerView
            tracks={tracks}
            tempo={tempo}
            activeTrackId={
              selectedTrackId ||
              (activeClip ? tracks.find(t => t.clips.some(c => c.id === activeClip.id))?.id : undefined)
            }
            onAddTrack={(newTrack) => {
              projectHistory.pushSnapshot(`Drum Trigger [${newTrack.name}]`, tracks, tempo);
              setTracks(prev => [...prev, newTrack]);
              setCurrentView(View.MIXER);
            }}
            onReplaceTrackClips={(targetId, newClip) => {
              const target = tracks.find(t => t.id === targetId);
              projectHistory.pushSnapshot(`SFZ Drum Replace [${target?.name || 'Track'}]`, tracks, tempo);
              setTracks(prev =>
                prev.map(t => (t.id === targetId ? { ...t, clips: [newClip], waveform: newClip.waveformSnippet || t.waveform } : t))
              );
              setCurrentView(View.MIXER);
            }}
            onOpenInMidiEditor={(midiClip) => {
              setActiveClip(midiClip);
              setCurrentView(View.MIDI_EDITOR);
            }}
            onNavigateToMixer={() => setCurrentView(View.MIXER)}
          />
        );
      case View.VOICE_CLONER:
        return (
          <VoiceCloner
            onAddTrack={(newTrack) => setTracks(prev => [...prev, newTrack])}
            currentTracks={tracks}
            onNavigateToMixer={() => setCurrentView(View.MIXER)}
          />
        );
      case View.SPECTRAL_ANALYSIS:
        return (
          <SpectralAnalysisView
            tracks={tracks}
            tempo={tempo}
            activeTrackId={activeClip ? tracks.find(t => t.clips.some(c => c.id === activeClip.id))?.id : undefined}
            onSelectTrack={(trackId) => {
              const trk = tracks.find(t => t.id === trackId);
              if (trk && trk.clips.length > 0) {
                setActiveClip(trk.clips[0]);
              }
            }}
            onNavigateToMixer={() => setCurrentView(View.MIXER)}
          />
        );
      case 'PEDALBOARD':
        return <Pedalboard />;
      case View.TEMPLATE_GALLERY:
        return (
          <TemplateGallery
            variant="view"
            tracks={tracks}
            setTracks={setTracks}
            tempo={tempo}
            setTempo={setTempo}
            activeSession={activeSession}
            onUpdateSession={setActiveSession}
            onNavigateToMixer={() => setCurrentView(View.MIXER)}
          />
        );
      default:
        return renderMixerView();
    }
  };

  return (
    <>
      <TapeSaturatorOverlay intensity={tapeIntensity} lynchianActive={lynchianMode} />
      <HistoryHudToast />

      {autoSaveRestorePrompt && (
        <AutoSaveRestoreBanner
          metadata={autoSaveRestorePrompt}
          onRestore={handleRestoreAutoSave}
          onDismiss={() => setAutoSaveRestorePrompt(null)}
        />
      )}

      <Layout 
        currentView={currentView} 
        setView={setCurrentView}
        onOpenNewProject={() => setIsNewProjectOpen(true)}
        activeSession={activeSession}
        tracks={tracks}
        onToggleTrackMute={handleToggleTrackMute}
        onToggleTrackSolo={handleToggleTrackSolo}
        lynchianMode={lynchianMode}
        onToggleLynchianMode={handleToggleLynchianMode}
        onOpenLiveRecorder={() => setIsLiveRecorderOpen(true)}
        activeLaserTool={activeLaserTool}
        onSelectLaserTool={(tool) => setActiveLaserTool(tool as LaserToolType)}
        tapeIntensity={tapeIntensity}
        onChangeTapeIntensity={setTapeIntensity}
        isAmbientDroneMuted={isAmbientDroneMuted}
        onToggleAmbientDroneMute={handleToggleAmbientDroneMute}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed(prev => !prev)}
        projectBinClips={projectBinClips}
        onInsertBinClipToTrack={handleInsertBinClipToTrack}
        onOpenAiMixStep={() => setIsAiMixStepModalOpen(true)}
        onOpenKoboldSettings={() => setIsKoboldSettingsOpen(true)}
        onOpenSoftwareDojo={() => setIsSoftwareDojoOpen(true)}
        onOpenUserGuide={() => setIsUserGuideOpen(true)}
        onOpenAceStepDesigner={() => setIsAceStepModalOpen(true)}
        onOpenFaustDspLab={() => setIsFaustDspModalOpen(true)}
        onOpenBasicPitch={() => handleOpenBasicPitch('instruments')}
        onOpenResourceManager={() => setIsResourceManagerOpen(true)}
        onOpenWorkflowStudio={() => setIsWorkflowStudioOpen(true)}
        onOpenSfzLibrary={() => setIsSfzLibraryOpen(true)}
        onOpenLoraLibrary={() => setIsLoraLibraryOpen(true)}
        onOpenGhostBuddy={() => setIsGhostBuddyOpen(prev => !prev)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onManualSave={handleManualSave}
        onRestoreAutoSave={handleRestoreAutoSave}
        lastSavedTimestamp={lastAutoSavedTimestamp}
        onOpenBatchStemExport={() => setIsBatchStemExportOpen(true)}
        onAddTrack={(type) => type === 'audio' ? handleAddAudioTrack() : handleAddMidiTrack()}
        onImportAudio={() => globalAudioImportInputRef.current?.click()}
        onImportAudioFile={handleImportAudioFile}
        onClearAllMutes={handleClearAllMutes}
        onClearAllSolos={handleClearAllSolos}
        onArmAllTracks={() => handleArmAllTracks(true)}
        tempo={tempo}
        isAutoArmMode={isAutoArmMode}
        onToggleAutoArm={handleToggleAutoArm}
        onOpenCollabWorkspace={() => setIsCollabModalOpen(true)}
        collabSessionCode={collabState.sessionCode}
        collabMemberCount={collabState.members.length}
        onOpenChronoMap={() => {
          setCurrentView(View.MIXER);
          setMixerModalRequest({ type: 'chronomap', id: Date.now() });
        }}
        onOpenBeamSplitter={() => {
          setCurrentView(View.MIXER);
          setMixerModalRequest({ type: 'beamsplitter', id: Date.now() });
        }}
        onOpenYue2Generator={() => setIsYue2ModalOpen(true)}
        onOpenVstWrapperHost={(pluginId) => {
          setVstWrapperHostPluginId(pluginId);
          setIsVstWrapperHostOpen(true);
        }}
      >
        <ViewErrorBoundary viewKey={String(currentView)} onRecover={() => setCurrentView(View.MIXER)}>
          <Suspense
            fallback={
              <div className="h-full flex flex-col items-center justify-center gap-2 bg-[#060810] text-xs font-mono text-[#94A3B8]">
                <div className="w-6 h-6 rounded-full border-2 border-[#FFD700]/30 border-t-[#FFD700] animate-spin" />
                <span>Loading Studio Module...</span>
              </div>
            }
          >
            {renderView()}
          </Suspense>
        </ViewErrorBoundary>
      </Layout>

      {/* Strangelet Guru / Ghost / Quinn: Ghost in the Machine AI Helper */}
      <Suspense fallback={null}>
        <GhostInTheMachine
          currentView={currentView}
          tracks={tracks}
          tempo={tempo}
          collisionEnergy={globalCollisionEnergy}
          onOpenAiMixStep={() => setIsAiMixStepModalOpen(true)}
          onTuneCollisionEnergy={setGlobalCollisionEnergy}
          onOpenSettings={() => setIsKoboldSettingsOpen(true)}
          onNavigateView={(view) => setCurrentView(view)}
          onOpenAceStepDesigner={() => setIsAceStepModalOpen(true)}
          onOpenFaustDspLab={() => setIsFaustDspModalOpen(true)}
          onOpenBasicPitch={(stem) => handleOpenBasicPitch((stem as any) || 'instruments')}
          onOpenSoftwareDojo={() => setIsSoftwareDojoOpen(true)}
          onOpenWorkflowStudio={() => setIsWorkflowStudioOpen(true)}
          onOpenSfzLibrary={() => setIsSfzLibraryOpen(true)}
          onOpenLoraLibrary={() => setIsLoraLibraryOpen(true)}
          isOpenExternally={isGhostBuddyOpen}
          onOpenChange={(open) => {
            setIsGhostBuddyOpen(open);
            localStorage.setItem('strangelet_ghost_buddy_active', String(open));
          }}
        />
      </Suspense>

      <Suspense
        fallback={
          <div className="fixed bottom-4 right-4 z-[9994] px-3 py-1.5 rounded-lg bg-[#0D1220]/95 border border-[#FFD700]/40 text-[11px] font-mono text-[#FFD700] shadow-lg">
            Loading Studio Tool...
          </div>
        }
      >
        {/* AI Mix Step Processor Modal (KoboldCpp Pipeline) */}
        {isAiMixStepModalOpen && (
          <AiMixStepModal
            isOpen={isAiMixStepModalOpen}
            onClose={() => setIsAiMixStepModalOpen(false)}
            tracks={tracks}
            onApplyStepToTrack={handleApplyAiMixStep}
            appliedSteps={appliedAiMixSteps}
            onRevertStep={handleRevertAiMixStep}
          />
        )}

        {/* Local AI Hub (Kobold.cpp, Ollama, LM Studio) Configuration Modal */}
        {isKoboldSettingsOpen && (
          <KoboldSettingsModal
            isOpen={isKoboldSettingsOpen}
            onClose={() => setIsKoboldSettingsOpen(false)}
            onOpenSoftwareDojo={() => setIsSoftwareDojoOpen(true)}
            onOpenResourceManager={() => setIsResourceManagerOpen(true)}
          />
        )}

        {/* Modular Hardware & VRAM Resource Manager Modal */}
        {isResourceManagerOpen && (
          <ResourceVramManagerModal
            isOpen={isResourceManagerOpen}
            onClose={() => setIsResourceManagerOpen(false)}
            onOpenSoftwareDojo={() => setIsSoftwareDojoOpen(true)}
            onOpenAiHub={() => setIsKoboldSettingsOpen(true)}
          />
        )}

        {/* Software Dojo: Offline Knowledge & Ninja Training Modal */}
        {isSoftwareDojoOpen && (
          <SoftwareDojoModal
            isOpen={isSoftwareDojoOpen}
            onClose={() => setIsSoftwareDojoOpen(false)}
            onOpenHubSettings={() => setIsKoboldSettingsOpen(true)}
          />
        )}

        {/* Official User Guide & Field Manual Modal */}
        {isUserGuideOpen && (
          <UserGuideModal
            isOpen={isUserGuideOpen}
            onClose={() => setIsUserGuideOpen(false)}
            onOpenDojo={() => setIsSoftwareDojoOpen(true)}
            onOpenAiHub={() => setIsKoboldSettingsOpen(true)}
          />
        )}

        {/* Ace-Step 1.5 GGUF Neural Loop Designer Modal */}
        {isAceStepModalOpen && (
          <div className="fixed inset-0 z-[9992] flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in font-mono">
            <div className="relative w-full max-w-6xl h-[92vh] rounded-2xl overflow-hidden border border-[#232A44] shadow-[0_0_60px_rgba(0,0,0,0.95)]">
              <AceStepLoopDesigner
                isOpen={true}
                onClose={() => {
                  setIsAceStepModalOpen(false);
                  setAceStepInitialPrompt('');
                }}
                projectBpm={tempo}
                initialPrompt={aceStepInitialPrompt}
                tracks={tracks}
                onAddTrackWithClip={handleAddTrackWithClip}
                onAddClipToTrack={handleAddClipToTrack}
                onAddProjectBinClips={handleAddProjectBinClips}
                onApplySongBedToMixer={handleApplySongBedToMixer}
                onNavigateToMixer={() => {
                  setIsAceStepModalOpen(false);
                  setAceStepInitialPrompt('');
                  setCurrentView(View.MIXER);
                }}
              />
            </div>
          </div>
        )}

        {/* Faust DSP Lab & VST Toy Builder Modal */}
        {isFaustDspModalOpen && (
          <div className="fixed inset-0 z-[9993] flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in font-mono">
            <div className="relative w-full max-w-6xl h-[92vh] rounded-2xl overflow-hidden border border-[#232A44] shadow-[0_0_60px_rgba(0,0,0,0.95)]">
              <FaustDspLab
                isOpen={true}
                onClose={() => setIsFaustDspModalOpen(false)}
                tracks={tracks}
                onApplyVstToTrack={(trackId, vstName) => {
                  handleApplyVstToTrack(trackId, vstName);
                  setIsFaustDspModalOpen(false);
                }}
              />
            </div>
          </div>
        )}

        {/* Spotify Basic Pitch Audio-to-MIDI Modal */}
        {isBasicPitchModalOpen && (
          <BasicPitchModal
            isOpen={isBasicPitchModalOpen}
            onClose={() => setIsBasicPitchModalOpen(false)}
            tracks={tracks}
            initialStemCategory={basicPitchStemCategory}
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
              setIsBasicPitchModalOpen(false);
              setCurrentView(View.MIXER);
            }}
            onAddMultiStemMidiTracksToMixer={(newTracks, bpm) => {
              setTempo(bpm);
              setTracks(prev => [...prev, ...newTracks]);
              setIsBasicPitchModalOpen(false);
              setCurrentView(View.MIXER);
            }}
          />
        )}

        {/* Live Microphone Recorder Modal */}
        {isLiveRecorderOpen && (
          <div className="fixed inset-0 z-[9995] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-2xl">
              <LiveRecorder
                tracks={tracks}
                tempo={tempo}
                onAddTrackWithClip={handleAddTrackWithClip}
                onAddClipToTrack={handleAddClipToTrack}
                onClose={() => setIsLiveRecorderOpen(false)}
              />
            </div>
          </div>
        )}

        {/* New Project Routing Templates Modal */}
        {isNewProjectOpen && (
          <NewProjectModal
            isOpen={isNewProjectOpen}
            onClose={() => setIsNewProjectOpen(false)}
            onCreateProject={handleCreateProject}
            currentSessionName={activeSession.name}
          />
        )}

        {/* Guided Workflows & Project Templates Studio Modal */}
        {isWorkflowStudioOpen && (
          <WorkflowStudioModal
            isOpen={isWorkflowStudioOpen}
            onClose={() => setIsWorkflowStudioOpen(false)}
            onLoadTemplate={handleLoadTemplate}
            onLaunchWorkflowStep={handleLaunchWorkflowStep}
            onOpenGhostTerminal={() => {
              setIsGhostBuddyOpen(true);
              localStorage.setItem('strangelet_ghost_buddy_active', 'true');
            }}
          />
        )}

        {/* SFZ Open Library & Sample Community Exchange Modal */}
        {isSfzLibraryOpen && (
          <SfzOpenLibraryModal
            isOpen={isSfzLibraryOpen}
            onClose={() => setIsSfzLibraryOpen(false)}
            onLoadInstrumentToTrack={handleLoadSfzInstrument}
            onOpenSfzBuilder={() => setCurrentView(View.INSTRUMENT_GENERATOR)}
          />
        )}

        {/* Ace-Step 1.5 LoRA Lending Library Standalone Modal */}
        {isLoraLibraryOpen && (
          <AceStepLoraLibraryModal
            isOpen={isLoraLibraryOpen}
            onClose={() => setIsLoraLibraryOpen(false)}
          />
        )}

        {/* Global Studio Right-Click Shortcut Context Menu */}
        {contextMenuTarget && (
          <StudioContextMenu
            target={contextMenuTarget}
            onClose={() => setContextMenuTarget(null)}
            tracks={tracks}
            currentView={currentView}
            onSelectView={(view) => setCurrentView(view)}
            onEditClip={(clip) => setActiveClip(clip)}
            onAddAudioTrack={handleAddAudioTrack}
            onAddMidiTrack={handleAddMidiTrack}
            onDeleteTrack={handleDeleteTrack}
            onDuplicateTrack={handleDuplicateTrack}
            onUpdateTrack={handleUpdateTrack}
            onArmAllTracks={handleArmAllTracks}
            onClearAllMutes={handleClearAllMutes}
            onClearAllSolos={handleClearAllSolos}
            onDeleteClip={handleDeleteClip}
            onDuplicateClip={handleDuplicateClip}
            onSplitClip={handleSplitClip}
            onSaveProject={handleManualSave}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onOpenLiveRecorder={() => setIsLiveRecorderOpen(true)}
            onOpenGhostBuddy={() => setIsGhostBuddyOpen(true)}
            onOpenAiMixStep={() => setIsAiMixStepModalOpen(true)}
            onOpenAceStep={() => setIsAceStepModalOpen(true)}
            onOpenBasicPitch={() => setIsBasicPitchModalOpen(true)}
            onOpenFaustDsp={() => setIsFaustDspModalOpen(true)}
            onOpenSfzLibrary={() => setIsSfzLibraryOpen(true)}
            onOpenWorkflowStudio={() => setIsWorkflowStudioOpen(true)}
            onOpenNewProject={() => setIsNewProjectOpen(true)}
            onOpenUserGuide={() => setIsUserGuideOpen(true)}
            onOpenBatchStemExport={() => setIsBatchStemExportOpen(true)}
            onToggleUiSound={() => toggleUiSoundMuted()}
            isUiSoundMuted={uiSoundMuted}
            onToggleLynchianMode={handleToggleLynchianMode}
            lynchianMode={lynchianMode}
            beamModeEnabled={beamModeEnabled}
            onToggleBeamMode={handleToggleBeamMode}
          />
        )}

        {/* Dedicated Batch Stem Export Modal (All active tracks to WAV with normalization & resampling) */}
        {isBatchStemExportOpen && (
          <BatchStemExportModal
            isOpen={isBatchStemExportOpen}
            onClose={() => setIsBatchStemExportOpen(false)}
            tracks={tracks}
            tempo={tempo}
          />
        )}

        {/* Real-Time Collaborative Workspace Modal */}
        {isCollabModalOpen && (
          <CollaborativeWorkspaceModal
            isOpen={isCollabModalOpen}
            onClose={() => setIsCollabModalOpen(false)}
            tracks={tracks}
            tempo={tempo}
          />
        )}

        {/* YuE 2.0 AI Song Foundation Generator Modal */}
        {isYue2ModalOpen && (
          <Yue2GeneratorModal
            isOpen={isYue2ModalOpen}
            onClose={() => {
              setIsYue2ModalOpen(false);
              setYue2InitialPrompt('');
            }}
            projectBpm={tempo}
            initialPrompt={yue2InitialPrompt}
            onAddMultiStemTracks={handleAddYuE2StemsToMixer}
          />
        )}

        {/* VST Wrapper Host & Parameter Mapping DSP Rack Modal */}
        {isVstWrapperHostOpen && (
          <VstWrapperHostModal
            isOpen={isVstWrapperHostOpen}
            onClose={() => {
              setIsVstWrapperHostOpen(false);
              setVstWrapperHostPluginId(undefined);
            }}
            tracks={tracks}
            initialPluginId={vstWrapperHostPluginId}
            onApplyVstToTrack={handleApplyVstToTrack}
          />
        )}
      </Suspense>

      {/* Hidden Global Audio File Input for Menu Bar File -> Import Audio */}
      <input
        type="file"
        ref={globalAudioImportInputRef}
        className="hidden"
        accept="audio/*"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            await handleImportAudioFile(file);
            e.target.value = '';
          }
        }}
      />

      {/* Global UI-Wide Click-to-Map MIDI Learn HUD & Capture Interceptor */}
      <GlobalMidiLearnHud />
    </>
  );
};

export default App;
