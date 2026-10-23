import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import WaveSplitter from './components/WaveSplitter';
import Mixer from './components/Mixer';
import Mastering from './components/Mastering';
import SystemCore from './components/SystemCore';
import Pedalboard from './components/Pedalboard';
import Aura from './components/Aura';
import InstrumentGenerator from './components/InstrumentGenerator';
import AudioEditor from './components/AudioEditor';
import DrumDesigner from './components/DrumDesigner';
import LargeSonicCollider from './components/LargeSonicCollider/LargeSonicCollider';
import { BeamSplitterView } from './components/BeamSplitterView';
import NewProjectModal from './components/NewProjectModal';
import LiveRecorder from './components/LiveRecorder';
import LaserPointerCursor from './components/LaserPointerCursor';
import TapeSaturatorOverlay, { TapeSaturationIntensity } from './components/TapeSaturatorOverlay';
import { GhostInTheMachine } from './components/GhostInTheMachine';
import { AiMixStepModal } from './components/AiMixStepModal';
import { KoboldSettingsModal } from './components/KoboldSettingsModal';
import { AceStepLoopDesigner } from './components/AceStepLoopDesigner';
import { FaustDspLab } from './components/FaustDspLab';
import { BasicPitchModal } from './components/BasicPitchModal';
import { MidiEditor } from './components/MidiEditor';
import { SoftwareDojoModal } from './components/SoftwareDojoModal';
import { UserGuideModal } from './components/UserGuideModal';
import { ResourceVramManagerModal } from './components/ResourceVramManagerModal';
import { WorkflowStudioModal } from './components/WorkflowStudioModal';
import { SfzOpenLibraryModal } from './components/SfzOpenLibraryModal';
import { AceStepLoraLibraryModal } from './components/AceStepLoraLibraryModal';
import { ProjectStatisticsDashboard } from './components/ProjectStatisticsDashboard';
import { VoiceCloner } from './components/VoiceCloner';
import { SpectralAnalysisView } from './components/SpectralAnalysisView';
import { projectHistory } from './services/projectHistoryService';
import { projectAutoSave, AutoSaveMetadata } from './services/projectAutoSaveService';
import { AutoSaveRestoreBanner } from './components/AutoSaveRestoreBanner';
import { HistoryHudToast } from './components/HistoryHudToast';
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
import { StudioContextMenu, ContextMenuTarget } from './components/StudioContextMenu';
import { BatchStemExportModal } from './components/BatchStemExportModal';

const PlaceholderView: React.FC<{ title: string; icon: any; desc: string }> = ({ title, icon: Icon, desc }) => (
  <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-[#0D0D11]">
    <div className="w-16 h-16 rounded-2xl bg-[#1A1A26] border border-[#282838] flex items-center justify-center text-[#FFD700] mb-4 shadow-[0_0_20px_rgba(255,215,0,0.15)]">
      <Icon size={32} />
    </div>
    <h3 className="text-xl font-bold text-white mb-2 tracking-wide font-mono">{title}</h3>
    <p className="text-sm text-[#888] max-w-md leading-relaxed">{desc}</p>
  </div>
);

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.MIXER);
  const [activeClip, setActiveClip] = useState<Clip | null>(null);
  const [snapValue, setSnapValue] = useState<string>('1/16');

  // Lynchian Mode, Laser Pointer, Tape Saturator & Live Recorder State
  const [lynchianMode, setLynchianMode] = useState<boolean>(false);
  const [isAmbientDroneMuted, setIsAmbientDroneMuted] = useState<boolean>(false);
  const [activeLaserTool, setActiveLaserTool] = useState<LaserToolType>('laser_audio');
  const [tapeIntensity, setTapeIntensity] = useState<TapeSaturationIntensity>('subtle');
  const [isLiveRecorderOpen, setIsLiveRecorderOpen] = useState<boolean>(false);

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

  // Undo/Redo & 60-Second Auto-Save State
  const [lastAutoSavedTimestamp, setLastAutoSavedTimestamp] = useState<number | null>(projectAutoSave.getLastSavedTimestamp());
  const [autoSaveRestorePrompt, setAutoSaveRestorePrompt] = useState<AutoSaveMetadata | null>(null);

  // Check for auto-saved session snapshot on initial launch
  useEffect(() => {
    if (projectAutoSave.hasAutoSave()) {
      const meta = projectAutoSave.getMetadata();
      if (meta && meta.trackCount > 0) {
        setAutoSaveRestorePrompt(meta);
      }
    }
  }, []);

  // 60-Second Background Auto-Save Interval
  useEffect(() => {
    const timer = setInterval(() => {
      if (projectAutoSave.isEnabled()) {
        const ok = projectAutoSave.save(activeSession, tracks, tempo);
        if (ok) {
          setLastAutoSavedTimestamp(Date.now());
        }
      }
    }, 60000); // 60 seconds

    return () => clearInterval(timer);
  }, [activeSession, tracks, tempo]);

  // Undo operation
  const handleUndo = () => {
    const restored = projectHistory.undo(tracks, tempo);
    if (restored) {
      setTracks(restored.tracks);
      setTempo(restored.tempo);
    }
  };

  // Redo operation
  const handleRedo = () => {
    const restored = projectHistory.redo(tracks, tempo);
    if (restored) {
      setTracks(restored.tracks);
      setTempo(restored.tempo);
    }
  };

  // Manual save trigger
  const handleManualSave = () => {
    const ok = projectAutoSave.save(activeSession, tracks, tempo);
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

      // F1 or ?: Open User Guide & Manual
      if (e.key === 'F1' || (e.key === '?' && !e.ctrlKey && !e.metaKey)) {
        e.preventDefault();
        setIsUserGuideOpen(true);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tracks, tempo, activeSession]);

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

  // Global hotkeys (e.g. '?' opens the User Guide)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return;
      }
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setIsUserGuideOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
        return (
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
          />
        );
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
              projectHistory.pushSnapshot(`Trim Silence on ${updatedClip.name}`, tracks, tempo);
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
          />
        );
      case View.ACESTEP_LOOP_DESIGNER:
        return (
          <AceStepLoopDesigner
            isOpen={true}
            projectBpm={tempo}
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
        return <PlaceholderView title="DRUM TRIGGER" icon={Music} desc="Audio-to-MIDI conversion logic for drum replacement. Detects transients and maps them to standard General MIDI notes." />;
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
      default:
        return (
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
          />
        );
    }
  };

  return (
    <>
      <LaserPointerCursor activeTool={activeLaserTool} enabled={true} />
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
        onClearAllMutes={handleClearAllMutes}
        onClearAllSolos={handleClearAllSolos}
        onArmAllTracks={() => handleArmAllTracks(true)}
        tempo={tempo}
        isAutoArmMode={isAutoArmMode}
        onToggleAutoArm={handleToggleAutoArm}
      >
        {renderView()}
      </Layout>

      {/* Strangelet Guru / Ghost / Quinn: Ghost in the Machine AI Helper */}
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

      {/* AI Mix Step Processor Modal (KoboldCpp Pipeline) */}
      <AiMixStepModal
        isOpen={isAiMixStepModalOpen}
        onClose={() => setIsAiMixStepModalOpen(false)}
        tracks={tracks}
        onApplyStepToTrack={handleApplyAiMixStep}
        appliedSteps={appliedAiMixSteps}
        onRevertStep={handleRevertAiMixStep}
      />

      {/* Local AI Hub (Kobold.cpp, Ollama, LM Studio) Configuration Modal */}
      <KoboldSettingsModal
        isOpen={isKoboldSettingsOpen}
        onClose={() => setIsKoboldSettingsOpen(false)}
        onOpenSoftwareDojo={() => setIsSoftwareDojoOpen(true)}
        onOpenResourceManager={() => setIsResourceManagerOpen(true)}
      />

      {/* Modular Hardware & VRAM Resource Manager Modal */}
      <ResourceVramManagerModal
        isOpen={isResourceManagerOpen}
        onClose={() => setIsResourceManagerOpen(false)}
        onOpenSoftwareDojo={() => setIsSoftwareDojoOpen(true)}
        onOpenAiHub={() => setIsKoboldSettingsOpen(true)}
      />

      {/* Software Dojo: Offline Knowledge & Ninja Training Modal */}
      <SoftwareDojoModal
        isOpen={isSoftwareDojoOpen}
        onClose={() => setIsSoftwareDojoOpen(false)}
        onOpenHubSettings={() => setIsKoboldSettingsOpen(true)}
      />

      {/* Official User Guide & Field Manual Modal */}
      <UserGuideModal
        isOpen={isUserGuideOpen}
        onClose={() => setIsUserGuideOpen(false)}
        onOpenDojo={() => setIsSoftwareDojoOpen(true)}
        onOpenAiHub={() => setIsKoboldSettingsOpen(true)}
      />

      {/* Ace-Step 1.5 GGUF Neural Loop Designer Modal */}
      {isAceStepModalOpen && (
        <div className="fixed inset-0 z-[9992] flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in font-mono">
          <div className="relative w-full max-w-6xl h-[92vh] rounded-2xl overflow-hidden border border-[#232A44] shadow-[0_0_60px_rgba(0,0,0,0.95)]">
            <AceStepLoopDesigner
              isOpen={true}
              onClose={() => setIsAceStepModalOpen(false)}
              projectBpm={tempo}
              tracks={tracks}
              onAddTrackWithClip={handleAddTrackWithClip}
              onAddClipToTrack={handleAddClipToTrack}
              onAddProjectBinClips={handleAddProjectBinClips}
              onApplySongBedToMixer={handleApplySongBedToMixer}
              onNavigateToMixer={() => {
                setIsAceStepModalOpen(false);
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
      <NewProjectModal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        onCreateProject={handleCreateProject}
        currentSessionName={activeSession.name}
      />

      {/* Guided Workflows & Project Templates Studio Modal */}
      <WorkflowStudioModal
        isOpen={isWorkflowStudioOpen}
        onClose={() => setIsWorkflowStudioOpen(false)}
        onLoadTemplate={handleLoadTemplate}
        onLaunchWorkflowStep={handleLaunchWorkflowStep}
        onOpenGhostTerminal={() => {}}
      />

      {/* SFZ Open Library & Sample Community Exchange Modal */}
      <SfzOpenLibraryModal
        isOpen={isSfzLibraryOpen}
        onClose={() => setIsSfzLibraryOpen(false)}
        onLoadInstrumentToTrack={handleLoadSfzInstrument}
        onOpenSfzBuilder={() => setCurrentView(View.INSTRUMENT_GENERATOR)}
      />

      {/* Ace-Step 1.5 LoRA Lending Library Standalone Modal */}
      <AceStepLoraLibraryModal
        isOpen={isLoraLibraryOpen}
        onClose={() => setIsLoraLibraryOpen(false)}
      />

      {/* Global Studio Right-Click Shortcut Context Menu */}
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
      />

      {/* Dedicated Batch Stem Export Modal (All active tracks to WAV with normalization & resampling) */}
      <BatchStemExportModal
        isOpen={isBatchStemExportOpen}
        onClose={() => setIsBatchStemExportOpen(false)}
        tracks={tracks}
        tempo={tempo}
      />
    </>
  );
};

export default App;
