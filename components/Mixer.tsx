import React, { useState, useEffect, useRef } from 'react';
import { INITIAL_TRACKS } from '../constants';
import { Track, Clip, View, LaserToolType, TimelineMarker, ChronoPin, BeamSplitterResult, ProjectBinClip, AceStepSongBedResult } from '../types';
import ChannelStrip from './ChannelStrip';
import Timeline from './Timeline';
import VegasLynchDeck from './VegasLynchDeck';
import RetroMidiKeyboard from './RetroMidiKeyboard';
import { ExportProjectModal } from './ExportProjectModal';
import { BeatmapperModal } from './BeatmapperModal';
import { BeamSplitterModal } from './BeamSplitterModal';
import { AceStepLoopDesigner } from './AceStepLoopDesigner';
import { FaustDspLab } from './FaustDspLab';
import { BasicPitchModal } from './BasicPitchModal';
import { MidiEditor } from './MidiEditor';
import { BatchStemExportModal } from './BatchStemExportModal';
import { 
  Settings2, Play, Pause, Square, Repeat, Rewind, Workflow, 
  CircleDot, Mic, Zap, Sparkles, Radio, Music, Download, Crosshair, Pin, Split, Code2, Keyboard,
  Magnet, BarChart3, FolderArchive, Activity, Plus, Upload, ChevronDown, Sliders, Disc
} from 'lucide-react';
import { midiLearnService, MidiControlMapping, MidiLearningTarget } from '../services/midiLearnService';
import { VirtualMidiControllerRack } from './VirtualMidiControllerRack';
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

const TOTAL_BARS = 16;

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
  onSelectTrack: propOnSelectTrack
}) => {
  const [internalTracks, setInternalTracks] = useState<Track[]>(INITIAL_TRACKS);
  const tracks = externalTracks ?? internalTracks;
  const setTracks = externalSetTracks ?? setInternalTracks;

  const updateTrack = (id: string, updates: Partial<Track>) => {
    if (externalUpdateTrack) {
      externalUpdateTrack(id, updates);
    } else {
      setTracks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    }
  };

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
  const [activeLaserTool, setActiveLaserTool] = useState<LaserToolType>('laser_audio');
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
  const [isBeatmapperOpen, setIsBeatmapperOpen] = useState<boolean>(false);
  const [beatmapInitialTrackId, setBeatmapInitialTrackId] = useState<string | undefined>(undefined);
  const [isBeamSplitterOpen, setIsBeamSplitterOpen] = useState<boolean>(false);
  const [beamSplitterSourceTrackId, setBeamSplitterSourceTrackId] = useState<string | undefined>(undefined);
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

  // Hardware MIDI Learn & Controller Desk State
  const [isMidiLearnMode, setIsMidiLearnMode] = useState<boolean>(false);
  const [isVirtualControllerOpen, setIsVirtualControllerOpen] = useState<boolean>(false);
  const [midiMappings, setMidiMappings] = useState<MidiControlMapping[]>(() => midiLearnService.getAllMappings());
  const [learningTarget, setLearningTarget] = useState<MidiLearningTarget | null>(null);

  useEffect(() => {
    const unsubMappings = midiLearnService.subscribeChange((mappings) => {
      setMidiMappings(mappings);
      // If we were learning, clearing target once mapping is added
      setLearningTarget(midiLearnService.getLearningTarget());
    });

    const unsubControl = midiLearnService.onControlValueChange((mapping, normalizedVal) => {
      if (mapping.targetType === 'volume') {
        updateTrack(mapping.trackId, { volume: parseFloat(normalizedVal.toFixed(3)) });
      } else if (mapping.targetType === 'pan') {
        updateTrack(mapping.trackId, { pan: parseFloat(normalizedVal.toFixed(2)) });
      }
    });

    return () => {
      unsubMappings();
      unsubControl();
    };
  }, [updateTrack]);

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
  const [isVegasDeckOpen, setIsVegasDeckOpen] = useState<boolean>(() => {
    return localStorage.getItem('strangelet_vegas_deck_open') !== 'false';
  });

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

  // Handle Chrono-Pin Tempo Mapper synchronization & pin placement
  const handleApplyBeatmap = (result: {
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

    // 3. Update existing or insert new Audio Track
    if (result.targetTrackId) {
      updateTrack(result.targetTrackId, {
        name: `${result.trackName} [${result.bpm.toFixed(1)} BPM]`,
        clips: [{
          id: `clip-${Date.now()}`,
          name: `${result.trackName} (${result.bpm.toFixed(1)} BPM)`,
          startBar: 0,
          durationBars: Math.min(TOTAL_BARS, result.totalBars),
          audioUrl: result.audioUrl
        }]
      });
      audioService.setTrackAudioBuffer(result.targetTrackId, result.audioBuffer);
    } else {
      const newTrackId = `beatmap-track-${Date.now()}`;
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
          audioUrl: result.audioUrl
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
    if (audioContextRef.current) return;

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

  // Audio state controller: dynamically evaluates volume & pan automation curves in real-time
  useEffect(() => {
    if (!audioContextRef.current) return;

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

  // Global Quantization handlers
  const handleQuantizeChange = (qVal: '1/4' | '1/8' | '1/16' | 'off') => {
    setSnapValue(qVal);
    playLaserBeamSound('laser_select');

    // When quantizing to a grid, restrict all existing clips' start times to the grid
    if (qVal !== 'off') {
      projectHistory.pushSnapshot(`Quantize Clips (${qVal})`, tracks, tempo);
      setTracks(prev => prev.map(track => ({
        ...track,
        clips: track.clips.map(clip => {
          const snapped = snapToGrid(clip.startBar, qVal);
          const maxStart = Math.max(0, TOTAL_BARS - clip.durationBars);
          return {
            ...clip,
            startBar: Math.max(0, Math.min(maxStart, Number(snapped.toFixed(4))))
          };
        })
      })));
    }
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

  const selectedTrack = tracks.find(t => t.id === selectedTrackId);

  return (
    <div className="h-full flex flex-col p-4 md:p-6 overflow-hidden bg-[#000000]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-[#1E293B]/70 pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Settings2 className="text-[#FF8C00]" />
            MIXER CONSOLE
          </h2>

          {/* Global Quantization Toggle (1/4, 1/8, 1/16, off) */}
          <div 
            className="flex items-center bg-[#070A11] border border-[#1E293B] rounded-lg p-1 gap-1 shadow-inner select-none"
            title="Global Quantization: Restricts timeline clip start times to selected grid subdivisions"
          >
            <div className="flex items-center gap-1 px-1.5 text-[10px] font-mono font-bold text-[#94A3B8]">
              <Magnet size={12} className={snapValue === 'off' || snapValue === 'freeform' ? 'text-[#64748B]' : 'text-[#FF8C00] animate-pulse'} />
              <span className="tracking-wider">QUANTIZE:</span>
            </div>
            {(['1/4', '1/8', '1/16', 'off'] as const).map((qVal) => {
              const isActive = snapValue === qVal || (qVal === 'off' && snapValue === 'freeform');
              return (
                <button
                  key={qVal}
                  onClick={() => handleQuantizeChange(qVal)}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-black transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-[#FF8C00] to-[#FFD700] text-black shadow-[0_0_12px_rgba(255,140,0,0.5)] scale-105'
                      : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]/70'
                  }`}
                  title={`Quantize clip start times to ${qVal === 'off' ? 'OFF (freeform)' : `${qVal} grid`}`}
                >
                  {qVal.toUpperCase()}
                </button>
              );
            })}

            <button
              onClick={handleSnapAllClips}
              disabled={snapValue === 'off' || snapValue === 'freeform'}
              className="ml-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold border border-[#FF8C00]/40 text-[#FF8C00] hover:bg-[#FF8C00] hover:text-black disabled:opacity-25 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer"
              title="Snap all existing clips on all tracks to the current grid"
            >
              <Sparkles size={10} />
              <span className="hidden sm:inline">SNAP ALL</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border ${
                isAutoArm
                  ? 'bg-red-950/70 border-red-500 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                  : 'bg-[#0E121E] border-[#252E48] text-[#8C9BBF] hover:text-white hover:border-[#3E4C74]'
              }`}
              title={isAutoArm ? "Auto-Arm Mode: ENABLED. Tracks automatically arm for live recording upon selection. Click to disable." : "Auto-Arm Mode: DISABLED. Click to enable automatic track arming on selection."}
            >
              <CircleDot size={13} className={isAutoArm ? 'text-red-400 animate-pulse' : 'text-[#8C9BBF]'} />
              <span>AUTO-ARM: {isAutoArm ? 'ON' : 'OFF'}</span>
            </button>

            {/* + Add Audio Track */}
            <button 
              onClick={handleAddAudioTrack}
              className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.3)] cursor-pointer"
              title="Add a new blank Audio track to arrangement"
            >
              <Plus size={13} />
              <span>+ AUDIO</span>
            </button>

            {/* + Add MIDI Track */}
            <button 
              onClick={() => {
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
              }}
              className="px-2.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-[0_0_10px_rgba(168,85,247,0.3)] cursor-pointer"
              title="Add a new blank MIDI track with Piano Roll editor"
            >
              <Music size={13} />
              <span>+ MIDI</span>
            </button>

            {/* Import Audio File */}
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 border border-[#10B981]/60 text-[#10B981] hover:bg-[#10B981]/20 rounded text-[11px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Import audio file from local disk"
            >
              <Upload size={12} />
              <span>IMPORT</span>
            </button>

            {/* Batch Stem Export (.WAV) */}
            <button 
              onClick={() => setIsBatchStemExportOpen(true)}
              className="px-2.5 py-1 border border-[#10B981] bg-[#10B981]/15 text-[#10B981] hover:bg-[#10B981] hover:text-black font-extrabold rounded text-[11px] transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.3)] cursor-pointer"
              title="Batch Stem Export: Export all active tracks as individual WAV files with normalization & sample rate conversion"
            >
              <FolderArchive size={12} />
              <span>STEMS (.WAV)</span>
            </button>

            {/* Ace-Step Multi-Track Bed & AI Sync Trigger */}
            <button 
              onClick={() => {
                if (onOpenAceStepDesigner) onOpenAceStepDesigner();
                else setIsAceStepOpen(true);
              }}
              className="px-2.5 py-1 border border-pink-500/60 bg-pink-950/30 text-pink-300 hover:bg-pink-600 hover:text-black font-extrabold rounded text-[11px] transition-all flex items-center gap-1.5 shadow-[0_0_10px_rgba(236,72,153,0.25)] cursor-pointer"
              title="Open Ace-Step 1.5 Multi-Track Generator & Stem Synchronizer"
            >
              <Sparkles size={12} className="text-pink-400" />
              <span>ACE-STEP 1.5</span>
            </button>

            {/* Hardware MIDI Learn Toggle */}
            <button
              onClick={() => {
                setIsMidiLearnMode(prev => {
                  const next = !prev;
                  if (!next) {
                    midiLearnService.cancelLearning();
                    setLearningTarget(null);
                  }
                  return next;
                });
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer border ${
                isMidiLearnMode
                  ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_14px_#F59E0B] animate-pulse'
                  : midiMappings.length > 0
                    ? 'bg-amber-950/40 border-amber-500/60 text-amber-300 hover:bg-amber-900/50'
                    : 'bg-[#0E121E] border-[#252E48] text-[#8C9BBF] hover:text-white hover:border-amber-400'
              }`}
              title={
                isMidiLearnMode 
                  ? "MIDI Learn ACTIVE: Click any channel strip knob or fader learn badge, then touch your hardware knob/slider. (Click to exit)" 
                  : "Toggle Hardware MIDI Learn Mode: Map external knobs & faders directly to volume and pan"
              }
            >
              <Sliders size={12} className={isMidiLearnMode ? 'text-black' : 'text-amber-400'} />
              <span>MIDI LEARN</span>
              {midiMappings.length > 0 && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  isMidiLearnMode ? 'bg-black text-amber-300' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {midiMappings.length}
                </span>
              )}
            </button>

            {/* Virtual Hardware Controller Rack Drawer */}
            <button
              onClick={() => setIsVirtualControllerOpen(prev => !prev)}
              className={`px-2.5 py-1 rounded text-[11px] font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer border ${
                isVirtualControllerOpen
                  ? 'bg-cyan-500 text-black border-cyan-300 shadow-[0_0_12px_#06B6D4]'
                  : 'bg-[#0A101D] border-[#1D2B44] text-cyan-300 hover:bg-cyan-950/50 hover:border-cyan-400'
              }`}
              title="Open Virtual 8-Channel Hardware Controller Desk: Test physical CC sliders and rotary knobs directly in browser"
            >
              <Radio size={12} className={isVirtualControllerOpen ? 'text-black' : 'text-cyan-400'} />
              <span>DESK RACK</span>
            </button>

            {/* Toggle 1960s Motif Deck to free vertical mixer space */}
            <button
              onClick={() => {
                setIsVegasDeckOpen(prev => {
                  const next = !prev;
                  localStorage.setItem('strangelet_vegas_deck_open', String(next));
                  return next;
                });
              }}
              className={`px-2 py-1 rounded text-[10px] font-mono border transition-all flex items-center gap-1 cursor-pointer ${
                isVegasDeckOpen 
                  ? 'bg-[#181508] border-[#FFD700]/40 text-[#FFD700]' 
                  : 'bg-[#090C16] border-[#202738] text-[#717C9B] hover:text-white'
              }`}
              title={isVegasDeckOpen ? "Hide 1960s Sands & Twin Peaks Motif Deck (Maximizes vertical room for mixer faders & arrangement grid)" : "Show 1960s Sands & Twin Peaks Motif Deck"}
            >
              <Disc size={11} className={isVegasDeckOpen ? "text-[#FFD700] animate-spin" : "text-[#717C9B]"} style={{ animationDuration: '4s' }} />
              <span className="hidden sm:inline font-bold">{isVegasDeckOpen ? 'DECK' : 'DECK'}</span>
            </button>
        </div>
      </div>

      {/* Ace-Step 1.5 Multi-Track Synchronizer Strip (Collapsible) */}
      {isAceStepStripOpen && (
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
      
      {/* 1960s Vegas & David Lynch Surrealist Motif Deck (Toggleable) */}
      {isVegasDeckOpen && (
        <VegasLynchDeck 
          activeLaserTool={activeLaserTool}
          isPlaying={isPlaying}
          isRecording={isRecording}
          onToggleMidiKeyboard={() => setIsMidiKeyboardOpen(!isMidiKeyboardOpen)}
          isMidiKeyboardOpen={isMidiKeyboardOpen}
        />
      )}

      {/* 1960s Transistor MIDI Synth & Keypad Drawer */}
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
        timelineMarkers={timelineMarkers}
        onOpenBeatmapper={() => {
          setBeatmapInitialTrackId(undefined);
          setIsBeatmapperOpen(true);
        }}
        onOpenBeamSplitter={() => {
          setBeamSplitterSourceTrackId(undefined);
          setIsBeatmapperOpen(true);
        }}
        selectedTrackId={selectedTrackId}
        onSelectTrack={handleSelectTrack}
        isAutoArmMode={isAutoArm}
      />

      <div className="flex-1 bg-[#000000] border border-[#26619C] p-4 flex justify-around gap-4 overflow-x-auto rounded-xl">
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
            onOpenBeatmapper={(trackId) => {
              setBeatmapInitialTrackId(trackId);
              setIsBeatmapperOpen(true);
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
          />
        ))}
      </div>

      {/* 1960s Vegas & Atomic Analog Transport Bar */}
      <div className="h-20 bg-[#060810] border-t-2 border-[#FFD700]/30 rounded-b-xl mt-2 flex items-center justify-center gap-3 md:gap-5 px-4 relative overflow-hidden shadow-2xl">
        {/* Subtle Chevron Border Accent */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[repeating-linear-gradient(45deg,#FFD700_0px,#FFD700_6px,#000_6px,#000_12px)] opacity-40 pointer-events-none" />

        {/* Rewind */}
        <button 
          onClick={() => handleTransportClick('rewind')} 
          className="p-2.5 text-[#A0A0A0] hover:text-[#FF8C00] transition-colors rounded hover:bg-[#0F1320]"
          title="Rewind to Bar 1"
        >
          <Rewind size={20} />
        </button>

        {/* Stop */}
        <button 
          onClick={() => handleTransportClick('stop')} 
          className={`p-2.5 transition-colors rounded hover:bg-[#0F1320] ${!isPlaying && playheadPosition === 0 ? 'text-[#FF8C00]' : 'text-[#A0A0A0]'} hover:text-[#FF8C00]`}
          title="Stop & Reset"
        >
          <Square size={20} />
        </button>

        {/* Play / Pause */}
        <button 
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
          onClick={() => setIsExportModalOpen(true)}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141828] border border-[#FF8C00]/40 text-[#FF8C00] hover:bg-[#FF8C00] hover:text-black font-mono text-[11px] font-bold transition-all shadow-md"
          title="Export current arrangement to .WAV"
        >
          <Download size={13} />
          <span>BOUNCE</span>
        </button>
      </div>

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

      {/* Offline Audio Export Project Modal */}
      <ExportProjectModal
        isOpen={isExportModalOpen}
        initialMode={exportModalInitialMode}
        onClose={() => setIsExportModalOpen(false)}
        tracks={tracks}
        tempo={tempo}
        masterGain={masterGain}
        loopRange={loopEnabled ? loopRange : undefined}
      />

      {/* Chrono-Pin Tempo Mapper & Time Anchor Modal */}
      <BeatmapperModal
        isOpen={isBeatmapperOpen}
        onClose={() => setIsBeatmapperOpen(false)}
        currentProjectBpm={tempo}
        tracks={tracks}
        initialTrackId={beatmapInitialTrackId}
        onApplyBeatmap={handleApplyBeatmap}
      />

      {/* Beam Splitter & Optical Prism Chopper Modal */}
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

      {/* Dedicated Batch Stem Export Modal (Individual WAVs with Normalization & Resampling) */}
      <BatchStemExportModal
        isOpen={isBatchStemExportOpen}
        onClose={() => setIsBatchStemExportOpen(false)}
        tracks={tracks}
        tempo={tempo}
        loopRange={loopRange}
      />

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
        />
      )}

      {/* Virtual Hardware MIDI Controller Rack (Motorized 8-Fader & 8-Knob Desk) */}
      <VirtualMidiControllerRack
        isOpen={isVirtualControllerOpen}
        onClose={() => setIsVirtualControllerOpen(false)}
        onAutoMap8={() => {
          midiLearnService.autoMap8Tracks(tracks);
        }}
      />
    </div>
  );
};

export default Mixer;
