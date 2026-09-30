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
import { Clip, View, Track, ProjectSession, ProjectTemplate, LaserToolType, ProjectBinClip, AiMixStep, AceStepSongBedResult } from './types';
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

  // KoboldCpp AI Step & Quinn Ghost in the Machine State
  const [isAiMixStepModalOpen, setIsAiMixStepModalOpen] = useState<boolean>(false);
  const [isKoboldSettingsOpen, setIsKoboldSettingsOpen] = useState<boolean>(false);
  const [isAceStepModalOpen, setIsAceStepModalOpen] = useState<boolean>(false);
  const [isFaustDspModalOpen, setIsFaustDspModalOpen] = useState<boolean>(false);
  const [isBasicPitchModalOpen, setIsBasicPitchModalOpen] = useState<boolean>(false);
  const [basicPitchStemCategory, setBasicPitchStemCategory] = useState<'vocals' | 'bass' | 'drums' | 'instruments' | 'full'>('instruments');
  const [basicPitchSongTitle, setBasicPitchSongTitle] = useState<string>('Suno AI Master');
  const [basicPitchAudioBuffer, setBasicPitchAudioBuffer] = useState<AudioBuffer | null>(null);
  const [appliedAiMixSteps, setAppliedAiMixSteps] = useState<AiMixStep[]>([]);
  const [globalCollisionEnergy, setGlobalCollisionEnergy] = useState<number>(8.4);

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
    playLaserBeamSound('laser_curve');
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
            onOpenAiMixStep={() => setIsAiMixStepModalOpen(true)}
            onOpenAceStepDesigner={() => setIsAceStepModalOpen(true)}
            onOpenFaustDspLab={() => setIsFaustDspModalOpen(true)}
            onOpenBasicPitch={handleOpenBasicPitch}
            onApplySongBedToMixer={handleApplySongBedToMixer}
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
        onOpenAiMixStep={() => setIsAiMixStepModalOpen(true)}
        onOpenKoboldSettings={() => setIsKoboldSettingsOpen(true)}
        onOpenAceStepDesigner={() => setIsAceStepModalOpen(true)}
        onOpenFaustDspLab={() => setIsFaustDspModalOpen(true)}
        onOpenBasicPitch={() => handleOpenBasicPitch('instruments')}
      >
        {renderView()}
      </Layout>

      {/* Quinn 3.7 / Llama Studio Buddy: Ghost in the Machine AI Helper */}
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

      {/* KoboldCpp Engine & Quinn Configuration Modal */}
      <KoboldSettingsModal
        isOpen={isKoboldSettingsOpen}
        onClose={() => setIsKoboldSettingsOpen(false)}
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
    </>
  );
};

export default App;
