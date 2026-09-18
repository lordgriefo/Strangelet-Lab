import React, { useState, useEffect, useRef } from 'react';
import { INITIAL_TRACKS } from '../constants';
import { Track, Clip, View, LaserToolType, TimelineMarker, ChronoPin, BeamSplitterResult, ProjectBinClip } from '../types';
import ChannelStrip from './ChannelStrip';
import Timeline from './Timeline';
import VegasLynchDeck from './VegasLynchDeck';
import RetroMidiKeyboard from './RetroMidiKeyboard';
import { ExportProjectModal } from './ExportProjectModal';
import { BeatmapperModal } from './BeatmapperModal';
import { BeamSplitterModal } from './BeamSplitterModal';
import { 
  Settings2, Play, Pause, Square, Repeat, Rewind, Workflow, 
  CircleDot, Mic, Zap, Sparkles, Radio, Music, Download, Crosshair, Pin, Split
} from 'lucide-react';
import { audioService } from '../services/audioService';
import { evaluateAutomationAt } from '../lib/audioUtils';
import { liveRecordingEngine } from '../lib/liveRecordingEngine';
import { playLaserBeamSound } from '../lib/laserSound';
import { masterAudioBus } from '../lib/masterBus';

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
  onAddProjectBinClips
}) => {
  const [internalTracks, setInternalTracks] = useState<Track[]>(INITIAL_TRACKS);
  const tracks = externalTracks ?? internalTracks;
  const setTracks = externalSetTracks ?? setInternalTracks;

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
  const [isBeatmapperOpen, setIsBeatmapperOpen] = useState<boolean>(false);
  const [beatmapInitialTrackId, setBeatmapInitialTrackId] = useState<string | undefined>(undefined);
  const [isBeamSplitterOpen, setIsBeamSplitterOpen] = useState<boolean>(false);
  const [beamSplitterSourceTrackId, setBeamSplitterSourceTrackId] = useState<string | undefined>(undefined);
  const [timelineMarkers, setTimelineMarkers] = useState<TimelineMarker[]>([
    { id: 'intro', position: 0.125, label: 'Intro' },
    { id: 'drop', position: 0.5, label: 'Drop / Chorus' },
    { id: 'outro', position: 0.875, label: 'Outro' }
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const trackNodesRef = useRef<Record<string, AudioNodes>>({});
  const masterGainRef = useRef<GainNode | null>(null);

  useEffect(() => {
      if (masterGainRef.current) {
          masterGainRef.current.gain.value = masterGain;
      }
  }, [masterGain]);

  const updateTrack = (id: string, updates: Partial<Track>) => {
    if (externalUpdateTrack) {
      externalUpdateTrack(id, updates);
    } else {
      setTracks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    }
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
    if (result.mode === 'loop') {
      const durationBars = result.loopRange?.durationBars || 1;
      const newClip: Clip = {
        id: `clip-beam-loop-${Date.now()}`,
        name: result.sourceName,
        startBar: result.targetStartBar,
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
            const newClip: Clip = {
              id: `rec-take-${Math.random().toString(36).substr(2, 7)}`,
              name: `Take ${targetTrack.clips.length + 1} (Live Mic)`,
              startBar: Math.floor(playheadPosition * 16),
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

  return (
    <div className="h-full flex flex-col p-4 md:p-6 overflow-hidden bg-[#000000]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <Settings2 className="text-[#FF8C00]" />
            MIXER CONSOLE
        </h2>
        <div className="flex gap-2">
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
                    setTracks([...tracks, newTrack]);
                }
            }} />
            {onOpenNewProject && (
              <button 
                onClick={onOpenNewProject}
                className="px-2.5 py-0.5 border border-[#FFD700] text-[#FFD700] rounded text-[10px] font-bold hover:bg-[#FFD700]/20 transition-colors flex items-center gap-1.5"
                title="Select from pre-configured routing templates"
              >
                <Workflow size={12} /> TEMPLATES
              </button>
            )}
            <button 
              onClick={() => {
                setBeatmapInitialTrackId(undefined);
                setIsBeatmapperOpen(true);
              }}
              className="px-2.5 py-0.5 border border-[#00F0FF] bg-[#00F0FF]/15 text-[#00F0FF] font-black rounded text-[10px] hover:bg-[#00F0FF] hover:text-black transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,240,255,0.3)]"
              title="Chrono-Pin Tempo Mapper: Map audio tempo & align project tracks to the same BPM"
            >
              <Crosshair size={12} className="text-[#FFD700] animate-spin" style={{ animationDuration: '8s' }} />
              <span>CHRONO-PIN MAPPER</span>
            </button>
            <button 
              onClick={() => {
                setBeamSplitterSourceTrackId(undefined);
                setIsBeamSplitterOpen(true);
              }}
              className="px-2.5 py-0.5 border border-[#FF2E63] bg-[#FF2E63]/15 text-[#FF2E63] font-black rounded text-[10px] hover:bg-gradient-to-r hover:from-[#FF2E63] hover:to-[#FFD700] hover:text-black transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(255,46,99,0.3)]"
              title="Beam Splitter & Optical Prism Chopper: Slices loops and refracts beats into single hits"
            >
              <Split size={12} className="text-[#00F0FF] transform -rotate-45" />
              <span>BEAM SPLITTER</span>
            </button>
            <button 
              onClick={() => setIsExportModalOpen(true)}
              className="px-2.5 py-0.5 bg-gradient-to-r from-[#FF8C00] to-[#FFD700] text-black font-extrabold rounded text-[10px] hover:brightness-110 transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(255,140,0,0.4)]"
              title="Render and export the current arrangement as a .wav file"
            >
              <Download size={12} /> EXPORT PROJECT (.WAV)
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-0.5 border border-[#10B981] text-[#10B981] rounded text-[10px] font-bold hover:bg-[#10B981]/20 transition-colors"
            >
              IMPORT AUDIO
            </button>
            <button 
              onClick={() => {
                const newTrack: Track = {
                  id: Math.random().toString(36).substr(2, 9),
                  name: 'New MIDI Track',
                  type: 'midi',
                  volume: 0.7,
                  pan: 0,
                  muted: false,
                  soloed: false,
                  color: '#A020F0',
                  phaseInverted: false,
                  isMono: false,
                  vstBypassed: false,
                  clips: []
                };
                setTracks([...tracks, newTrack]);
              }}
              className="px-2 py-0.5 border border-[#A020F0] text-[#A020F0] rounded text-[10px] font-bold hover:bg-[#A020F0]/20 transition-colors"
            >
              + ADD MIDI TRACK
            </button>
        </div>
      </div>
      
      {/* 1960s Vegas & David Lynch Surrealist Motif Deck */}
      <VegasLynchDeck 
        activeLaserTool={activeLaserTool}
        isPlaying={isPlaying}
        isRecording={isRecording}
        onToggleMidiKeyboard={() => setIsMidiKeyboardOpen(!isMidiKeyboardOpen)}
        isMidiKeyboardOpen={isMidiKeyboardOpen}
      />

      {/* 1960s Transistor MIDI Synth & Keypad Drawer */}
      <RetroMidiKeyboard 
        isOpen={isMidiKeyboardOpen}
        onClose={() => setIsMidiKeyboardOpen(false)}
        activeTrackName={tracks.find(t => t.type === 'midi')?.name || 'Synth'}
        onInsertMidiClip={(chordName) => {
          const midiTrack = tracks.find(t => t.type === 'midi') || tracks[0];
          if (midiTrack) {
            const newClip: Clip = {
              id: `midi-${Math.random().toString(36).substr(2, 7)}`,
              name: `${chordName} Pad`,
              startBar: Math.floor(playheadPosition * 16),
              durationBars: 2,
              isMidi: true
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
            setView(View.AUDIO_EDITOR);
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
          setIsBeamSplitterOpen(true);
        }}
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
                setView(View.AUDIO_EDITOR);
            }}
            onOpenBeatmapper={(trackId) => {
              setBeatmapInitialTrackId(trackId);
              setIsBeatmapperOpen(true);
            }}
            onOpenBeamSplitter={(trackId) => {
              setBeamSplitterSourceTrackId(trackId);
              setIsBeamSplitterOpen(true);
            }}
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
      />
    </div>
  );
};

export default Mixer;
