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
import { Clip, View, Track, ProjectSession, ProjectTemplate, LaserToolType, ProjectBinClip } from './types';
import { INITIAL_TRACKS } from './constants';
import { Mic, Music, Zap, Layers, Scissors, X } from 'lucide-react';
import { startLynchianAmbientDrone, stopLynchianAmbientDrone, playLaserBeamSound } from './lib/laserSound';

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
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, muted: !t.muted } : t));
  };

  const handleToggleTrackSolo = (trackId: string) => {
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, soloed: !t.soloed } : t));
  };

  const handleUpdateTrack = (trackId: string, updates: Partial<Track>) => {
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, ...updates } : t));
  };

  const handleAddTrackWithClip = (trackName: string, clip: Clip) => {
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

    const newClip: Clip = {
      id: `clip-from-bin-${Date.now()}`,
      name: clip.name,
      startBar: 0,
      durationBars: clip.durationBars || 1,
      audioUrl: clip.audioUrl
    };

    setTracks(prev => prev.map(t => t.id === audioTrack.id ? { ...t, clips: [...t.clips, newClip] } : t));
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
        return <AudioEditor clip={activeClip} snapValue={snapValue} />;
      case View.SONIC_COLLIDER:
        return <LargeSonicCollider />;
      case View.DRUM_TRIGGER:
        return <PlaceholderView title="DRUM TRIGGER" icon={Music} desc="Audio-to-MIDI conversion logic for drum replacement. Detects transients and maps them to standard General MIDI notes." />;
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
          />
        );
    }
  };

  return (
    <>
      <LaserPointerCursor activeTool={activeLaserTool} enabled={true} />
      <TapeSaturatorOverlay intensity={tapeIntensity} lynchianActive={lynchianMode} />

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
      >
        {renderView()}
      </Layout>

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
    </>
  );
};

export default App;
