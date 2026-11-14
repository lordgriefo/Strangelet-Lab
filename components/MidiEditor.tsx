import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCw, 
  Download, 
  Plus, 
  Sliders, 
  Sparkles, 
  X, 
  Music, 
  Keyboard, 
  Check, 
  Volume2, 
  Volume1, 
  Trash2, 
  ArrowRight, 
  Layers, 
  Maximize2, 
  Minimize2, 
  Repeat, 
  Scissors, 
  Shuffle, 
  MousePointer, 
  Pencil, 
  Eraser, 
  ChevronUp, 
  ChevronDown, 
  HelpCircle,
  FileCode,
  Zap,
  Activity,
  ArrowUp,
  ArrowDown,
  Lock,
  Unlock,
  Magnet,
  SlidersHorizontal,
  Undo2,
  Redo2,
  Radio,
  RefreshCw
} from 'lucide-react';
import { MidiNoteEvent, Track, Clip, BasicPitchTranscriptionResult } from '../types';
import { 
  basicPitchSynth, 
  midiToNoteName, 
  midiToFreq, 
  createStandardMidiFile,
  humanizeMidiNotes,
  PRESET_SONGS,
  runSpotifyBasicPitchTranscription,
  DEFAULT_BASIC_PITCH_SETTINGS,
  WebMidiOutputPortInfo,
  requestWebMidiOutputPorts,
  subscribeWebMidiPortChanges,
  sendWebMidiNote,
  sendWebMidiAllNotesOff
} from '../services/basicPitchService';
import { snapToGrid } from '../lib/audioUtils';
import { playLaserBeamSound, playColliderInjectionSound } from '../lib/laserSound';
import { quantizeBarWithSwing, MidiQuantizeGrid } from '../services/midiQuantizeService';
import { useSnapGrid, formatSnapDivisionLabel } from '../services/snapGridService';

export type ArpPattern = 'up' | 'down' | 'random' | 'converge';

export interface ArpModuleConfig {
  enabled: boolean;
  pattern: ArpPattern;
  latch: boolean;
  rate: '1/4' | '1/8' | '1/16' | '1/32' | '1/8T' | '1/16T';
  octaves: 1 | 2 | 3;
  gate: number; // 0.25 to 1.0
}

export interface MidiEditorProps {
  isOpen?: boolean;
  onClose?: () => void;
  initialNotes?: MidiNoteEvent[];
  clipName?: string;
  projectBpm?: number;
  initialInstrument?: string;
  activeTrackId?: string;
  tracks?: Track[];
  onSaveClipNotes?: (notes: MidiNoteEvent[], clipName?: string, instrument?: string) => void;
  onExportToNewTrack?: (trackName: string, notes: MidiNoteEvent[], instrument: string) => void;
  globalSnapValue?: string;
  initialSwingPercent?: number;
}

const INSTRUMENT_OPTIONS = [
  { id: 'SFZ Grand Piano', name: 'SFZ Grand Piano', icon: '🎹', desc: 'Acoustic Concert Grand' },
  { id: 'Rhodes Mark I', name: 'Rhodes Mark I EP', icon: '✨', desc: 'Vintage Tine Electric Piano' },
  { id: 'TB-303 Acid Synth', name: 'TB-303 Acid Synth', icon: '⚡', desc: 'Diode Resonant Acid Bass' },
  { id: 'Analog Juno Saw', name: 'Analog Juno Saw', icon: '🔮', desc: 'Lush Detuned Poly Saw' },
  { id: 'Mellotron Strings', name: 'Mellotron Strings', icon: '📼', desc: 'Tape Strings 1960s' },
  { id: '808 Sub Boom', name: '808 Sub Boom & Glide', icon: '💣', desc: 'Punchy Sub Bass' },
  { id: 'Faust Karplus Guitar', name: 'Faust Karplus Guitar', icon: '🎸', desc: 'Physical Modeling Guitar' },
  { id: 'General MIDI Drum Kit', name: 'General MIDI Drum Kit', icon: '🥁', desc: 'GM Drum Map (36, 38, 42)' }
];

const SNAP_DIVISIONS = [
  { id: '1/4', label: '1/4', bars: 0.25 },
  { id: '1/8', label: '1/8', bars: 0.125 },
  { id: '1/16', label: '1/16', bars: 0.0625 },
  { id: '1/32', label: '1/32', bars: 0.03125 },
  { id: 'triplet', label: '1/12 T', bars: 0.08333 }
];

export const MidiEditor: React.FC<MidiEditorProps> = ({
  isOpen = true,
  onClose,
  initialNotes,
  clipName = 'Basic Pitch MIDI Sequence',
  projectBpm = 120,
  initialInstrument = 'SFZ Grand Piano',
  activeTrackId,
  tracks = [],
  onSaveClipNotes,
  onExportToNewTrack,
  globalSnapValue = '1/16',
  initialSwingPercent = 0
}) => {
  // Active notes state
  const [notes, setNotes] = useState<MidiNoteEvent[]>(() => {
    if (initialNotes && initialNotes.length > 0) {
      return [...initialNotes];
    }
    // Default demo chords if none provided
    return [
      { id: 'n-1', pitch: 60, noteName: 'C4', startBar: 0, startTimeSeconds: 0, durationBars: 1, durationSeconds: 2, velocity: 95, confidence: 0.9 },
      { id: 'n-2', pitch: 64, noteName: 'E4', startBar: 0, startTimeSeconds: 0, durationBars: 1, durationSeconds: 2, velocity: 90, confidence: 0.9 },
      { id: 'n-3', pitch: 67, noteName: 'G4', startBar: 0, startTimeSeconds: 0, durationBars: 1, durationSeconds: 2, velocity: 100, confidence: 0.9 },
      { id: 'n-4', pitch: 71, noteName: 'B4', startBar: 0, startTimeSeconds: 0, durationBars: 1, durationSeconds: 2, velocity: 85, confidence: 0.85 },
      
      { id: 'n-5', pitch: 57, noteName: 'A3', startBar: 1, startTimeSeconds: 2, durationBars: 1, durationSeconds: 2, velocity: 92, confidence: 0.88 },
      { id: 'n-6', pitch: 60, noteName: 'C4', startBar: 1, startTimeSeconds: 2, durationBars: 1, durationSeconds: 2, velocity: 88, confidence: 0.88 },
      { id: 'n-7', pitch: 64, noteName: 'E4', startBar: 1, startTimeSeconds: 2, durationBars: 1, durationSeconds: 2, velocity: 95, confidence: 0.88 },
      { id: 'n-8', pitch: 69, noteName: 'A4', startBar: 1, startTimeSeconds: 2, durationBars: 1, durationSeconds: 2, velocity: 84, confidence: 0.8 },

      { id: 'n-9', pitch: 53, noteName: 'F3', startBar: 2, startTimeSeconds: 4, durationBars: 1, durationSeconds: 2, velocity: 96, confidence: 0.9 },
      { id: 'n-10', pitch: 57, noteName: 'A3', startBar: 2, startTimeSeconds: 4, durationBars: 1, durationSeconds: 2, velocity: 89, confidence: 0.9 },
      { id: 'n-11', pitch: 60, noteName: 'C4', startBar: 2, startTimeSeconds: 4, durationBars: 1, durationSeconds: 2, velocity: 94, confidence: 0.9 },
      { id: 'n-12', pitch: 65, noteName: 'F4', startBar: 2, startTimeSeconds: 4, durationBars: 1, durationSeconds: 2, velocity: 90, confidence: 0.85 },

      { id: 'n-13', pitch: 55, noteName: 'G3', startBar: 3, startTimeSeconds: 6, durationBars: 1, durationSeconds: 2, velocity: 102, confidence: 0.92 },
      { id: 'n-14', pitch: 59, noteName: 'B3', startBar: 3, startTimeSeconds: 6, durationBars: 1, durationSeconds: 2, velocity: 90, confidence: 0.92 },
      { id: 'n-15', pitch: 62, noteName: 'D4', startBar: 3, startTimeSeconds: 6, durationBars: 1, durationSeconds: 2, velocity: 96, confidence: 0.92 },
      { id: 'n-16', pitch: 67, noteName: 'G4', startBar: 3, startTimeSeconds: 6, durationBars: 1, durationSeconds: 2, velocity: 95, confidence: 0.9 }
    ];
  });

  // Basic Pitch Source Ingestion state
  const [selectedPresetSong, setSelectedPresetSong] = useState(PRESET_SONGS[0].id);
  const [selectedPresetStem, setSelectedPresetStem] = useState<'instruments' | 'bass' | 'vocals' | 'drums'>('instruments');
  const [isTranscribingPreset, setIsTranscribingPreset] = useState(false);

  // Editor configuration
  const [instrument, setInstrument] = useState<string>(initialInstrument);
  const [activeTool, setActiveTool] = useState<'select' | 'draw' | 'erase' | 'velocity'>('draw');
  const {
    enabled: snapEnabled,
    division: snapDivision,
    effectiveSnapValue: snapGrid,
    toggleEnabled: toggleSnapEnabled,
    setDivision: setSnapDivision
  } = useSnapGrid();
  const effectiveGlobalSnap = snapDivision;
  const [dragSnapGuide, setDragSnapGuide] = useState<{
    startBar: number;
    endBar: number;
    pitch: number;
    noteName: string;
    mode: 'move' | 'resize';
    isSnapped: boolean;
  } | null>(null);

  const [totalBars, setTotalBars] = useState<number>(4);
  const [bpm, setBpm] = useState<number>(projectBpm);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [quantizeLengths, setQuantizeLengths] = useState<boolean>(false);
  const [swingPercent, setSwingPercent] = useState<number>(initialSwingPercent);
  const [undoStack, setUndoStack] = useState<MidiNoteEvent[][]>([]);
  const [redoStack, setRedoStack] = useState<MidiNoteEvent[][]>([]);
  const [currentVelocity, setCurrentVelocity] = useState<number>(95);
  const [showVelocityLane, setShowVelocityLane] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const pushUndoState = useCallback(() => {
    setUndoStack(prev => [...prev.slice(-30), notes]);
    setRedoStack([]);
  }, [notes]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prevNotes = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, notes]);
    setNotes(prevNotes);
    playLaserBeamSound('laser_select');
    setToastMessage('Undo MIDI edit');
    setTimeout(() => setToastMessage(null), 2500);
  }, [undoStack, notes]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextNotes = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, notes]);
    setNotes(nextNotes);
    playLaserBeamSound('laser_select');
    setToastMessage('Redo MIDI edit');
    setTimeout(() => setToastMessage(null), 2500);
  }, [redoStack, notes]);

  // MIDI Arpeggiator Module State
  const [arpConfig, setArpConfig] = useState<ArpModuleConfig>({
    enabled: false,
    pattern: 'up',
    latch: true,
    rate: '1/16',
    octaves: 1,
    gate: 0.8
  });
  const [latchedPitches, setLatchedPitches] = useState<number[]>([]);

  // Humanize Configuration
  const [humanizeEnabled, setHumanizeEnabled] = useState<boolean>(true);
  const [humanizeAmount, setHumanizeAmount] = useState<number>(0.18); // ±18%
  const [humanizeTiming, setHumanizeTiming] = useState<boolean>(false);

  // Transport & Playback Synchronization state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playheadBar, setPlayheadBar] = useState<number>(0); // 0 to totalBars
  const [loopEnabled, setLoopEnabled] = useState<boolean>(true);
  const [auditionNote, setAuditionNote] = useState<number | null>(null);

  // Live Web MIDI Output state
  const [midiOutPorts, setMidiOutPorts] = useState<WebMidiOutputPortInfo[]>([]);
  const [midiOutSupported, setMidiOutSupported] = useState<boolean>(true);
  const [selectedMidiOutId, setSelectedMidiOutId] = useState<string>('');
  const [midiOutChannel, setMidiOutChannel] = useState<number>(
    initialInstrument.toLowerCase().includes('drum') ? 10 : 1
  );
  const [isRefreshingMidiOut, setIsRefreshingMidiOut] = useState<boolean>(false);
  const [midiOutError, setMidiOutError] = useState<string | null>(null);

  const playbackTimerRef = useRef<any>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const stopSequenceRef = useRef<(() => void) | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const selectedMidiOutRef = useRef<{ portId: string; channel: number }>({ portId: '', channel: 1 });

  selectedMidiOutRef.current = { portId: selectedMidiOutId, channel: midiOutChannel };

  // Vertical pitch range calculation: keep range focused to note content with padding
  const { minPitch, maxPitch, pitchRange } = useMemo(() => {
    if (notes.length === 0) {
      return { minPitch: 48, maxPitch: 72, pitchRange: 25 };
    }
    const pitches = notes.map(n => n.pitch);
    const minP = Math.max(24, Math.min(...pitches) - 3);
    const maxP = Math.min(96, Math.max(...pitches) + 3);
    const diff = Math.max(14, maxP - minP + 1);
    return { minPitch: minP, maxPitch: maxP, pitchRange: diff };
  }, [notes]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const refreshMidiOutputPorts = async (showNotice = false) => {
    setIsRefreshingMidiOut(true);
    const res = await requestWebMidiOutputPorts();
    setMidiOutSupported(res.supported);
    setMidiOutPorts(res.ports);
    setMidiOutError(res.error || null);
    setSelectedMidiOutId(prev => (prev && !res.ports.some(p => p.id === prev) ? '' : prev));
    setIsRefreshingMidiOut(false);
    if (showNotice) {
      if (res.error) {
        showToast(res.error);
      } else if (res.ports.length === 0) {
        showToast('No external/virtual MIDI ports found. Start loopMIDI or IAC Driver and click Scan.');
      } else {
        showToast(`Detected ${res.ports.length} Live Web MIDI Output port${res.ports.length === 1 ? '' : 's'}.`);
      }
    }
  };

  // Discover Web MIDI outputs & listen for hot-plug port changes
  useEffect(() => {
    let unsubscribe = () => {};
    refreshMidiOutputPorts(false).then(() => {
      unsubscribe = subscribeWebMidiPortChanges(() => {
        refreshMidiOutputPorts(false);
      });
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Align channel 10 automatically for General MIDI Drum Kit
  useEffect(() => {
    if (instrument.toLowerCase().includes('drum')) {
      setMidiOutChannel(10);
    } else if (midiOutChannel === 10) {
      setMidiOutChannel(1);
    }
  }, [instrument]);

  // Keep BPM synced if prop changes
  useEffect(() => {
    setBpm(projectBpm);
  }, [projectBpm]);

  // Clean up timers & panic active Web MIDI notes on unmount
  useEffect(() => {
    return () => {
      if (playbackTimerRef.current) cancelAnimationFrame(playbackTimerRef.current);
      if (stopSequenceRef.current) stopSequenceRef.current();
      if (selectedMidiOutRef.current.portId) {
        sendWebMidiAllNotesOff(selectedMidiOutRef.current.portId, selectedMidiOutRef.current.channel);
      }
    };
  }, []);

  // Audio audition for single pitch (also latches into Arpeggiator memory if latch is ON)
  const handleAuditionPitch = (pitch: number) => {
    setAuditionNote(pitch);
    if (arpConfig.enabled && arpConfig.latch) {
      setLatchedPitches(prev => Array.from(new Set([...prev, pitch])).slice(-12));
    }
    const vel = humanizeEnabled
      ? Math.max(20, Math.min(127, currentVelocity + Math.round((Math.random() * 2 - 1) * humanizeAmount * 40)))
      : currentVelocity;
    basicPitchSynth.playNote(pitch, instrument, 0.45, vel);
    if (selectedMidiOutId) {
      sendWebMidiNote(selectedMidiOutId, pitch, vel, 380, midiOutChannel);
    }
    playLaserBeamSound('laser_select');
    setTimeout(() => setAuditionNote(null), 350);
  };

  // Playback synchronization engine
  const handleTogglePlayback = () => {
    if (isPlaying) {
      // Stop
      setIsPlaying(false);
      if (playbackTimerRef.current) cancelAnimationFrame(playbackTimerRef.current);
      if (stopSequenceRef.current) {
        stopSequenceRef.current();
        stopSequenceRef.current = null;
      }
    } else {
      // Start synchronized playback
      setIsPlaying(true);
      playLaserBeamSound('laser_audio');

      const secPerBar = (60 / bpm) * 4;
      const totalSec = totalBars * secPerBar;
      const startSec = playheadBar * secPerBar;
      playbackStartTimeRef.current = performance.now() - (startSec * 1000);

      // Play notes via BasicPitchSynth
      const filteredNotes = notes.filter(n => n.startBar >= playheadBar && n.startBar < totalBars);
      const relativeNotes = filteredNotes.map(n => ({
        ...n,
        startBar: n.startBar - playheadBar
      }));

      stopSequenceRef.current = basicPitchSynth.playSequence(
        relativeNotes,
        instrument,
        bpm,
        undefined,
        { enabled: humanizeEnabled, amount: humanizeAmount },
        selectedMidiOutId
          ? { outputPortId: selectedMidiOutId, channel: midiOutChannel }
          : undefined
      );

      const loop = () => {
        const elapsedSec = (performance.now() - playbackStartTimeRef.current) / 1000;
        const currentBar = elapsedSec / secPerBar;

        if (currentBar >= totalBars) {
          if (loopEnabled) {
            playbackStartTimeRef.current = performance.now();
            setPlayheadBar(0);

            if (stopSequenceRef.current) stopSequenceRef.current();
            const liveMidiOut = selectedMidiOutRef.current;
            stopSequenceRef.current = basicPitchSynth.playSequence(
              notes,
              instrument,
              bpm,
              undefined,
              { enabled: humanizeEnabled, amount: humanizeAmount },
              liveMidiOut.portId
                ? { outputPortId: liveMidiOut.portId, channel: liveMidiOut.channel }
                : undefined
            );
            playbackTimerRef.current = requestAnimationFrame(loop);
          } else {
            setIsPlaying(false);
            setPlayheadBar(0);
            if (stopSequenceRef.current) stopSequenceRef.current();
          }
        } else {
          setPlayheadBar(currentBar);
          playbackTimerRef.current = requestAnimationFrame(loop);
        }
      };

      playbackTimerRef.current = requestAnimationFrame(loop);
    }
  };

  const handleStopPlayback = () => {
    setIsPlaying(false);
    if (playbackTimerRef.current) cancelAnimationFrame(playbackTimerRef.current);
    if (stopSequenceRef.current) {
      stopSequenceRef.current();
      stopSequenceRef.current = null;
    }
    if (selectedMidiOutId) {
      sendWebMidiAllNotesOff(selectedMidiOutId, midiOutChannel);
    }
    setPlayheadBar(0);
  };

  // Generate arpeggio sequence based on pattern, pitches and octaves
  const generateArpSequence = (pitches: number[], pattern: ArpPattern, octaves: 1 | 2 | 3 = 1): number[] => {
    if (pitches.length === 0) return [];
    const unique = Array.from(new Set(pitches)).sort((a, b) => a - b);
    
    // Expand across octaves
    const expanded: number[] = [];
    for (let oct = 0; oct < octaves; oct++) {
      expanded.push(...unique.map(p => Math.min(108, p + oct * 12)));
    }

    if (pattern === 'up') {
      return expanded;
    } else if (pattern === 'down') {
      return [...expanded].reverse();
    } else if (pattern === 'random') {
      const copy = [...expanded];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    } else if (pattern === 'converge') {
      // Outside-in converging: lowest, highest, second lowest, second highest...
      const copy = [...expanded];
      const result: number[] = [];
      let left = 0;
      let right = copy.length - 1;
      let takeLeft = true;
      while (left <= right) {
        if (takeLeft) {
          result.push(copy[left]);
          left++;
        } else {
          result.push(copy[right]);
          right--;
        }
        takeLeft = !takeLeft;
      }
      return result;
    }
    return expanded;
  };

  // Adding a note by clicking in the grid (with Arpeggiator transformation if active)
  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'erase') return;
    if (activeTool === 'select') {
      setSelectedNoteIds([]);
      setSelectedNoteId(null);
      return;
    }
    if (!gridContainerRef.current) return;

    pushUndoState();

    const rect = gridContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Calculate bar and pitch from coordinates
    const barRaw = (clickX / rect.width) * totalBars;
    const isOff = !snapEnabled || e.altKey;
    const snappedBar = isOff ? Number(barRaw.toFixed(4)) : snapToGrid(barRaw, snapDivision);

    const pitchIndex = Math.floor((clickY / rect.height) * pitchRange);
    const pitch = maxPitch - pitchIndex;

    // If Arpeggiator is active: transform incoming / drawn pitch into an arpeggio pattern!
    if (arpConfig.enabled) {
      let pitchPool: number[] = [];
      if (arpConfig.latch) {
        // Latching enabled: accumulate clicked pitch into latched chord memory
        const nextLatched = Array.from(new Set([...latchedPitches, pitch])).slice(-8);
        setLatchedPitches(nextLatched);
        pitchPool = nextLatched;
      } else {
        // Instant pattern arpeggiation starting from clicked pitch
        pitchPool = [pitch, pitch + 4, pitch + 7, pitch + 11];
      }

      const rateMap: Record<string, number> = {
        '1/4': 0.25,
        '1/8': 0.125,
        '1/16': 0.0625,
        '1/32': 0.03125,
        '1/8T': 0.08333,
        '1/16T': 0.04167
      };
      const stepBars = rateMap[arpConfig.rate] || 0.0625;
      const numSteps = arpConfig.latch ? Math.max(4, Math.round(1 / stepBars)) : 4;
      const sequence = generateArpSequence(pitchPool, arpConfig.pattern, arpConfig.octaves);

      const secPerBar = (60 / bpm) * 4;
      const newArpNotes: MidiNoteEvent[] = [];

      for (let s = 0; s < numSteps; s++) {
        const arpPitch = sequence[s % sequence.length];
        const startB = snappedBar + s * stepBars;
        if (startB >= totalBars) break;

        const durB = Number((stepBars * arpConfig.gate).toFixed(4));
        const finalVel = humanizeEnabled
          ? Math.max(20, Math.min(127, currentVelocity + Math.round((Math.random() * 2 - 1) * humanizeAmount * 45)))
          : currentVelocity;

        newArpNotes.push({
          id: `arp-draw-${Date.now()}-${s}-${Math.random().toString(36).substr(2, 4)}`,
          pitch: arpPitch,
          noteName: midiToNoteName(arpPitch),
          startBar: Number(startB.toFixed(4)),
          startTimeSeconds: Number((startB * secPerBar).toFixed(4)),
          durationBars: Math.max(0.02, durB),
          durationSeconds: Number((durB * secPerBar).toFixed(4)),
          velocity: finalVel,
          confidence: 1.0
        });
      }

      setNotes(prev => [...prev, ...newArpNotes]);
      setSelectedNoteIds(newArpNotes.map(n => n.id));
      setSelectedNoteId(newArpNotes[0]?.id || null);
      handleAuditionPitch(pitch);
      playLaserBeamSound('laser_select');
      return;
    }

    // Standard note insertion
    let durationBars = 0.25;
    if (snapDivision === '1/4') durationBars = 0.25;
    else if (snapDivision === '1/8') durationBars = 0.125;
    else if (snapDivision === '1/16') durationBars = 0.0625;
    else if (snapDivision === '1/32') durationBars = 0.03125;
    else if (snapDivision === 'triplet' || snapDivision === '1/8T') durationBars = 0.08333;
    else if (snapDivision === '1/16T') durationBars = 0.04167;

    // Apply Humanize if enabled
    const finalVelocity = humanizeEnabled
      ? Math.max(25, Math.min(127, currentVelocity + Math.round((Math.random() * 2 - 1) * humanizeAmount * 45)))
      : currentVelocity;

    const newNote: MidiNoteEvent = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      pitch,
      noteName: midiToNoteName(pitch),
      startBar: Number(Math.max(0, Math.min(totalBars - durationBars, snappedBar)).toFixed(4)),
      startTimeSeconds: Number((snappedBar * (60 / bpm) * 4).toFixed(4)),
      durationBars,
      durationSeconds: Number((durationBars * (60 / bpm) * 4).toFixed(4)),
      velocity: finalVelocity,
      confidence: 1.0
    };

    setNotes(prev => [...prev, newNote]);
    setSelectedNoteId(newNote.id);
    setSelectedNoteIds([newNote.id]);
    handleAuditionPitch(pitch);
    playLaserBeamSound('laser_select');
  };

  // Delete note
  const handleDeleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    setSelectedNoteIds(prev => prev.filter(item => item !== id));
    if (selectedNoteId === id) setSelectedNoteId(null);
    playLaserBeamSound('laser_erase');
  };

  // Delete all selected notes
  const handleDeleteSelected = () => {
    if (selectedNoteIds.length > 0) {
      const idsToDelete = new Set(selectedNoteIds);
      setNotes(prev => prev.filter(n => !idsToDelete.has(n.id)));
      setSelectedNoteIds([]);
      setSelectedNoteId(null);
      playLaserBeamSound('laser_erase');
      showToast(`Deleted ${selectedNoteIds.length} notes.`);
    } else if (selectedNoteId) {
      handleDeleteNote(selectedNoteId);
    }
  };

  // Quantize selected MIDI notes (or all notes if none selected) to the user's selected snap value
  const handleQuantizeSelected = (overrideSnap?: string) => {
    const activeSnap = overrideSnap && overrideSnap !== 'off' ? overrideSnap : snapDivision;
    if (!activeSnap || activeSnap === 'off') {
      showToast('Choose 1/4, 1/8, 1/16, 1/32, or Triplet to quantize.');
      return;
    }

    if (notes.length === 0) {
      showToast('No notes in clip to quantize.');
      return;
    }

    // Determine target note IDs: selected notes have priority; fallback to all notes if none selected
    const hasSelection = selectedNoteIds.length > 0 || selectedNoteId !== null;
    const targetIds = new Set<string>();

    if (selectedNoteIds.length > 0) {
      selectedNoteIds.forEach(id => targetIds.add(id));
    } else if (selectedNoteId) {
      targetIds.add(selectedNoteId);
    } else {
      notes.forEach(n => targetIds.add(n.id));
    }

    if (targetIds.size === 0) {
      showToast('No notes to quantize.');
      return;
    }

    // Save history snapshot for undo
    pushUndoState();

    const secPerBar = (60 / bpm) * 4;
    const isStandardGrid = activeSnap === '1/4' || activeSnap === '1/8' || activeSnap === '1/16' || activeSnap === '1/32';

    setNotes(prev => prev.map(n => {
      if (!targetIds.has(n.id)) return n;

      // Snap start position to nearest grid division (+ swing % for humanization)
      const rawSnappedStart = isStandardGrid
        ? quantizeBarWithSwing(n.startBar, activeSnap as MidiQuantizeGrid, swingPercent, 100)
        : snapToGrid(n.startBar, activeSnap);
      const snappedStart = Math.max(0, Math.min(totalBars - 0.03125, rawSnappedStart));

      // Snap duration if quantizeLengths is enabled, else preserve length
      let snappedDur = n.durationBars;
      if (quantizeLengths) {
        snappedDur = Math.max(0.03125, snapToGrid(n.durationBars, activeSnap));
      } else {
        snappedDur = Math.max(0.03125, n.durationBars);
      }

      return {
        ...n,
        startBar: Number(snappedStart.toFixed(4)),
        startTimeSeconds: Number((snappedStart * secPerBar).toFixed(4)),
        durationBars: Number(snappedDur.toFixed(4)),
        durationSeconds: Number((snappedDur * secPerBar).toFixed(4))
      };
    }));

    playLaserBeamSound('laser_curve');
    const swingSuffix = isStandardGrid && swingPercent > 0 ? ` (${swingPercent}% swing)` : '';
    if (hasSelection) {
      showToast(`Quantized ${targetIds.size} selected note${targetIds.size === 1 ? '' : 's'} to ${activeSnap}${swingSuffix}!`);
    } else {
      showToast(`Quantized all ${notes.length} notes to ${activeSnap}${swingSuffix}!`);
    }
  };

  // Header quantize alias
  const handleHeaderQuantize = () => handleQuantizeSelected(effectiveGlobalSnap);

  // Quick quantize alias
  const handleQuantizeAll = () => handleQuantizeSelected(snapGrid);

  // Keyboard shortcuts (Space = Play/Pause, Del = Delete selected, Q = Quantize selected, Cmd/Ctrl+A = Select All, Cmd/Ctrl+Z = Undo, Cmd/Ctrl+Y = Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      if ((e.metaKey || e.ctrlKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        const allIds = notes.map(n => n.id);
        setSelectedNoteIds(allIds);
        if (allIds.length > 0 && !selectedNoteId) setSelectedNoteId(allIds[0]);
        showToast(`Selected all ${allIds.length} notes`);
      } else if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlayback();
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
      } else if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        handleQuantizeSelected();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'v' || e.key === 'V') {
        setActiveTool('select');
      } else if (e.key === 'p' || e.key === 'P' || e.key === 'd' || e.key === 'D') {
        setActiveTool('draw');
      } else if (e.key === 'e' || e.key === 'E') {
        setActiveTool('erase');
      } else if (e.key === 'y' || e.key === 'Y') {
        if (!e.metaKey && !e.ctrlKey) {
          setActiveTool('velocity');
        }
      } else if (e.key === 's' || e.key === 'S') {
        if (!e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          const next = toggleSnapEnabled();
          playLaserBeamSound('laser_select');
          showToast(next ? `Snap-to-Grid ON (${formatSnapDivisionLabel(snapDivision)})` : 'Snap-to-Grid OFF (Freeform)');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNoteId, selectedNoteIds, isPlaying, playheadBar, notes, bpm, instrument, humanizeEnabled, humanizeAmount, effectiveGlobalSnap, snapGrid, snapDivision, toggleSnapEnabled, quantizeLengths, undoStack, redoStack, handleQuantizeSelected, handleUndo, handleRedo]);

  // Transform selected or incoming MIDI notes with the MIDI Arpeggiator
  const handleTransformNotesWithArpeggiator = () => {
    const rateMap: Record<string, number> = {
      '1/4': 0.25,
      '1/8': 0.125,
      '1/16': 0.0625,
      '1/32': 0.03125,
      '1/8T': 0.08333,
      '1/16T': 0.04167
    };
    const stepBars = rateMap[arpConfig.rate] || 0.0625;
    const secPerBar = (60 / bpm) * 4;

    const targetNotes = selectedNoteIds.length > 0 
      ? notes.filter(n => selectedNoteIds.includes(n.id))
      : (selectedNoteId ? notes.filter(n => n.id === selectedNoteId) : notes);

    // If no notes exist on the grid or in selection, but latch memory has pitches: generate sequence from playhead!
    if (targetNotes.length === 0) {
      const pitchPool = latchedPitches.length > 0 ? latchedPitches : [60, 64, 67, 71];
      const startBase = Math.floor(playheadBar);
      const spanBars = 1.0;
      const numSteps = Math.round(spanBars / stepBars);
      const sequence = generateArpSequence(pitchPool, arpConfig.pattern, arpConfig.octaves);

      const generatedArpNotes: MidiNoteEvent[] = [];
      for (let s = 0; s < numSteps; s++) {
        const pitch = sequence[s % sequence.length];
        const startB = startBase + s * stepBars;
        if (startB >= totalBars) break;

        const durB = Number((stepBars * arpConfig.gate).toFixed(4));
        const finalVel = humanizeEnabled
          ? Math.max(20, Math.min(127, currentVelocity + Math.round((Math.random() * 2 - 1) * humanizeAmount * 45)))
          : currentVelocity;

        generatedArpNotes.push({
          id: `arp-latched-${Date.now()}-${s}-${Math.random().toString(36).substr(2, 4)}`,
          pitch,
          noteName: midiToNoteName(pitch),
          startBar: Number(startB.toFixed(4)),
          startTimeSeconds: Number((startB * secPerBar).toFixed(4)),
          durationBars: Math.max(0.02, durB),
          durationSeconds: Number((durB * secPerBar).toFixed(4)),
          velocity: finalVel,
          confidence: 0.98
        });
      }

      setNotes(prev => [...prev, ...generatedArpNotes]);
      setSelectedNoteIds(generatedArpNotes.map(n => n.id));
      setSelectedNoteId(generatedArpNotes[0]?.id || null);
      playLaserBeamSound('laser_curve');
      showToast(`Arpeggiator: Generated ${generatedArpNotes.length} notes from Latched Memory (${arpConfig.pattern.toUpperCase()} pattern, ${arpConfig.rate})!`);
      return;
    }

    const uniquePitches = Array.from(new Set(targetNotes.map(n => n.pitch)));
    if (arpConfig.latch) {
      setLatchedPitches(uniquePitches);
    }

    const minStart = Math.min(...targetNotes.map(n => n.startBar));
    const maxEnd = Math.max(...targetNotes.map(n => n.startBar + n.durationBars));
    const spanBars = Math.max(stepBars * 2, maxEnd - minStart);

    const numSteps = Math.max(2, Math.round(spanBars / stepBars));
    const sequence = generateArpSequence(uniquePitches, arpConfig.pattern, arpConfig.octaves);

    const generatedArpNotes: MidiNoteEvent[] = [];

    for (let s = 0; s < numSteps; s++) {
      const pitch = sequence[s % sequence.length];
      const startB = minStart + s * stepBars;
      if (startB >= totalBars) break;

      const durB = Number((stepBars * arpConfig.gate).toFixed(4));
      const finalVel = humanizeEnabled
        ? Math.max(20, Math.min(127, currentVelocity + Math.round((Math.random() * 2 - 1) * humanizeAmount * 45)))
        : currentVelocity;

      generatedArpNotes.push({
        id: `arp-${Date.now()}-${s}-${Math.random().toString(36).substr(2, 4)}`,
        pitch,
        noteName: midiToNoteName(pitch),
        startBar: Number(startB.toFixed(4)),
        startTimeSeconds: Number((startB * secPerBar).toFixed(4)),
        durationBars: Math.max(0.02, durB),
        durationSeconds: Number((durB * secPerBar).toFixed(4)),
        velocity: finalVel,
        confidence: 0.95
      });
    }

    const targetIdSet = new Set(targetNotes.map(n => n.id));
    setNotes(prev => [...prev.filter(n => !targetIdSet.has(n.id)), ...generatedArpNotes]);
    setSelectedNoteIds(generatedArpNotes.map(n => n.id));
    setSelectedNoteId(generatedArpNotes[0]?.id || null);

    playLaserBeamSound('laser_curve');
    showToast(`Arpeggiator: Transformed ${targetNotes.length} notes into ${generatedArpNotes.length} arp steps (${arpConfig.pattern.toUpperCase()} pattern, ${arpConfig.rate})!`);
  };

  // Latch currently selected notes into Arpeggiator memory
  const handleLatchSelectedNotes = () => {
    const targetNotes = selectedNoteIds.length > 0
      ? notes.filter(n => selectedNoteIds.includes(n.id))
      : (selectedNoteId ? notes.filter(n => n.id === selectedNoteId) : notes);

    if (targetNotes.length === 0) {
      showToast('No notes selected to latch.');
      return;
    }
    const pitches = Array.from(new Set(targetNotes.map(n => n.pitch)));
    setLatchedPitches(pitches);
    setArpConfig(prev => ({ ...prev, latch: true, enabled: true }));
    playLaserBeamSound('laser_select');
    showToast(`Latched ${pitches.length} notes [${pitches.map(p => midiToNoteName(p)).join(', ')}] into Arpeggiator memory!`);
  };

  // Quick Chord presets for latching
  const handleLatchPresetChord = (preset: 'maj7' | 'min9' | 'sus4' | 'octave') => {
    const root = selectedNoteId ? (notes.find(n => n.id === selectedNoteId)?.pitch || 60) : 60;
    let intervals: number[] = [0, 4, 7, 11];
    if (preset === 'maj7') intervals = [0, 4, 7, 11];
    else if (preset === 'min9') intervals = [0, 3, 7, 10, 14];
    else if (preset === 'sus4') intervals = [0, 5, 7, 12];
    else if (preset === 'octave') intervals = [0, 12, 24];

    const pitches = intervals.map(i => root + i);
    setLatchedPitches(pitches);
    setArpConfig(prev => ({ ...prev, latch: true, enabled: true }));
    playLaserBeamSound('laser_select');
    showToast(`Latched ${preset.toUpperCase()} chord [${pitches.map(p => midiToNoteName(p)).join(', ')}]!`);
  };

  // Apply humanization to all or selected notes
  const handleApplyHumanize = () => {
    if (notes.length === 0) return;
    const humanized = humanizeMidiNotes(notes, humanizeAmount, humanizeTiming);
    setNotes(humanized);
    playLaserBeamSound('laser_curve');
    showToast(`Humanized ${notes.length} notes (velocity jitter ±${Math.round(humanizeAmount * 80)})`);
  };

  // Transpose notes
  const handleTranspose = (semitones: number) => {
    if (notes.length === 0) return;
    setNotes(prev => prev.map(n => {
      const target = selectedNoteId ? (n.id === selectedNoteId ? n : null) : n;
      if (!target) return n;
      const newPitch = Math.max(12, Math.min(108, n.pitch + semitones));
      return {
        ...n,
        pitch: newPitch,
        noteName: midiToNoteName(newPitch)
      };
    }));
    playLaserBeamSound('laser_select');
    showToast(`Transposed ${selectedNoteId ? 'selected note' : 'all notes'} by ${semitones > 0 ? '+' : ''}${semitones} semitones.`);
  };

  // Load from Basic Pitch Presets
  const handleLoadBasicPitchPreset = async () => {
    setIsTranscribingPreset(true);
    playColliderInjectionSound();
    showToast(`Extracting MIDI from preset "${selectedPresetSong}" [${selectedPresetStem.toUpperCase()}]...`);

    try {
      const song = PRESET_SONGS.find(s => s.id === selectedPresetSong) || PRESET_SONGS[0];
      const result = await runSpotifyBasicPitchTranscription(
        selectedPresetStem,
        `${song.title} (${selectedPresetStem.toUpperCase()})`,
        song.bpm,
        { ...DEFAULT_BASIC_PITCH_SETTINGS, stemTarget: selectedPresetStem }
      );

      if (result.notes.length > 0) {
        setNotes(result.notes);
        setBpm(result.bpm);
        setTotalBars(Math.max(4, Math.min(16, result.totalBars)));
        setInstrument(result.recommendedInstrument);
        showToast(`Loaded ${result.notes.length} notes from Spotify Basic Pitch (${result.keyDetected} ${result.scaleDetected})!`);
        playLaserBeamSound('laser_curve');
      } else {
        showToast('No notes detected in selected stem.');
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading Basic Pitch preset.');
    } finally {
      setIsTranscribingPreset(false);
    }
  };

  // Export / Save Actions
  const handleSaveToCurrentClip = () => {
    if (onSaveClipNotes) {
      onSaveClipNotes(notes, clipName, instrument);
      playColliderInjectionSound();
      showToast(`Saved ${notes.length} MIDI notes to active mixer clip!`);
      if (onClose) onClose();
    } else {
      showToast(`Updated ${notes.length} notes in current clip.`);
    }
  };

  const handleExportNewMidiTrack = () => {
    const trackTitle = `${clipName} [${instrument}]`;
    if (onExportToNewTrack) {
      onExportToNewTrack(trackTitle, notes, instrument);
      playColliderInjectionSound();
      showToast(`Added "${trackTitle}" to Mixer Console!`);
      if (onClose) onClose();
    } else {
      showToast('Exported new MIDI track.');
    }
  };

  const handleDownloadMidi = () => {
    const raw = createStandardMidiFile(notes, bpm);
    const blob = new Blob([raw], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${clipName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.mid`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloaded standard Type 0 MIDI: ${a.download}`);
    playLaserBeamSound('laser_curve');
  };

  // Note Drag & Resize Handlers
  const handleNoteMouseDown = (e: React.MouseEvent, note: MidiNoteEvent, isResize: boolean) => {
    e.stopPropagation();

    if (activeTool === 'erase') {
      handleDeleteNote(note.id);
      return;
    }

    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      setSelectedNoteIds(prev => prev.includes(note.id) ? prev.filter(id => id !== note.id) : [...prev, note.id]);
    } else {
      if (!selectedNoteIds.includes(note.id)) {
        setSelectedNoteIds([note.id]);
      }
    }
    setSelectedNoteId(note.id);
    handleAuditionPitch(note.pitch);

    const startX = e.clientX;
    const startY = e.clientY;
    const initialStartBar = note.startBar;
    const initialDuration = note.durationBars;
    const initialPitch = note.pitch;

    if (!gridContainerRef.current) return;
    const rect = gridContainerRef.current.getBoundingClientRect();
    const pixelsPerBar = rect.width / totalBars;
    const pixelsPerPitch = rect.height / pitchRange;

    const handleMouseMove = (ev: MouseEvent) => {
      const deltaX = ev.clientX - startX;
      const deltaBars = deltaX / pixelsPerBar;
      const isOff = !snapEnabled || ev.altKey;

      if (isResize) {
        // Resizing note length
        const rawDur = Math.max(0.03125, initialDuration + deltaBars);
        const snappedDur = isOff ? rawDur : Math.max(0.03125, snapToGrid(rawDur, snapDivision));

        setDragSnapGuide({
          startBar: note.startBar,
          endBar: Math.min(totalBars, note.startBar + snappedDur),
          pitch: note.pitch,
          noteName: note.noteName,
          mode: 'resize',
          isSnapped: !isOff
        });

        setNotes(prev => prev.map(n => n.id === note.id ? {
          ...n,
          durationBars: Number(snappedDur.toFixed(4)),
          durationSeconds: Number((snappedDur * (60 / bpm) * 4).toFixed(4))
        } : n));
      } else {
        // Moving note in time & pitch
        const rawStart = Math.max(0, Math.min(totalBars - note.durationBars, initialStartBar + deltaBars));
        const snappedStart = isOff ? rawStart : Math.max(0, Math.min(totalBars - note.durationBars, snapToGrid(rawStart, snapDivision)));

        const deltaY = ev.clientY - startY;
        const deltaPitchSteps = Math.round(-deltaY / pixelsPerPitch);
        const newPitch = Math.max(24, Math.min(96, initialPitch + deltaPitchSteps));
        const newNoteName = midiToNoteName(newPitch);

        setDragSnapGuide({
          startBar: snappedStart,
          endBar: Math.min(totalBars, snappedStart + note.durationBars),
          pitch: newPitch,
          noteName: newNoteName,
          mode: 'move',
          isSnapped: !isOff
        });

        setNotes(prev => prev.map(n => n.id === note.id ? {
          ...n,
          startBar: Number(snappedStart.toFixed(4)),
          startTimeSeconds: Number((snappedStart * (60 / bpm) * 4).toFixed(4)),
          pitch: newPitch,
          noteName: newNoteName
        } : n));
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setDragSnapGuide(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const selectedNote = notes.find(n => n.id === selectedNoteId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9995] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in font-mono select-none">
      <div className="relative w-full max-w-7xl h-[94vh] rounded-2xl overflow-hidden border border-[#1E293B] bg-[#070912] text-[#E2E8F0] shadow-[0_0_60px_rgba(0,0,0,0.95)] flex flex-col">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute top-4 right-4 z-50 px-4 py-2.5 rounded-xl bg-emerald-950/95 border border-emerald-400 text-emerald-200 text-xs shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center gap-2 animate-fade-in backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-emerald-300 animate-spin" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Header */}
        <div className="px-5 py-3 border-b border-[#182035] bg-gradient-to-r from-[#0B0F1C] via-[#0F162A] to-[#0A0D18] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500/20 via-cyan-500/20 to-purple-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-bold tracking-wider text-white uppercase">
                  MIDI PIANO ROLL EDITOR // BASIC PITCH SYNC
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold">
                  BPM-SYNCHRONIZED
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-purple-300 font-bold">
                  POLYPHONIC
                </span>
              </div>
              <p className="text-[11px] text-[#7E88AA] truncate max-w-xl">
                Edit polyphonic notes from Spotify Basic Pitch output, adjust velocities & grid timing, and audition with VSTi synth engines.
              </p>
            </div>
          </div>

          {/* Header Action buttons, Global Snap Quantize & Close */}
          <div className="flex items-center gap-2.5 flex-wrap">
              {/* Header Quantize Button: Aligns currently selected MIDI notes to project's persistent snap value */}
            <div className="flex items-center bg-[#070A16] border border-emerald-500/50 rounded-xl p-1 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
              <button
                onClick={handleHeaderQuantize}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:brightness-110 text-black font-black text-xs flex items-center gap-1.5 transition-all shadow-md group active:scale-95"
                title={`Quantize ${selectedNoteIds.length > 0 ? `${selectedNoteIds.length} selected notes` : (selectedNoteId ? 'selected note' : 'all notes')} to project global snap (${formatSnapDivisionLabel(effectiveGlobalSnap)}) to ensure rhythmic precision`}
              >
                <Magnet size={14} className="text-black group-hover:rotate-12 transition-transform" />
                <span className="tracking-wider">QUANTIZE</span>
                <span className="px-1.5 py-0.5 rounded bg-black/25 text-emerald-950 font-black text-[10px]">
                  {formatSnapDivisionLabel(effectiveGlobalSnap)}
                </span>
              </button>

              {/* Project Global Snap Selector (1/4, 1/8, 1/16) */}
              <div className="flex items-center px-1.5 gap-0.5 border-l border-[#1A2542] ml-1">
                {(['1/4', '1/8', '1/16'] as const).map(snap => (
                  <button
                    key={snap}
                    onClick={() => {
                      setSnapDivision(snap);
                      playLaserBeamSound('laser_select');
                      showToast(`Project Global Snap: ${snap}`);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-black transition-all ${
                      effectiveGlobalSnap === snap
                        ? 'bg-emerald-400 text-black shadow-[0_0_8px_#10B981]'
                        : 'text-[#64748B] hover:text-emerald-300 hover:bg-[#12192F]'
                    }`}
                    title={`Set project global snap value: ${snap}`}
                  >
                    {snap}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleDownloadMidi}
              disabled={notes.length === 0}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-400 hover:brightness-110 text-black text-xs font-extrabold flex items-center gap-1.5 shadow-[0_0_16px_rgba(6,182,212,0.35)] transition-all disabled:opacity-40 cursor-pointer"
              title="Download standard Type 0 .mid file for external DAWs"
            >
              <Download size={14} />
              <span>Download .MID File</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-[#7E88AA] hover:text-white hover:bg-[#161D30] transition-colors"
                title="Close Editor"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Toolbar & Basic Pitch Controls Strip */}
        <div className="px-5 py-2.5 border-b border-[#141B2E] bg-[#090D1A] flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          
          {/* Transport Controls */}
          <div className="flex items-center gap-2 bg-[#060810] px-3 py-1.5 rounded-xl border border-[#182138]">
            <button
              onClick={handleStopPlayback}
              className="p-1.5 rounded-lg text-[#94A3B8] hover:text-amber-400 hover:bg-[#161D30] transition-colors"
              title="Rewind & Stop (Bar 0)"
            >
              <Square size={14} />
            </button>

            <button
              onClick={handleTogglePlayback}
              className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                isPlaying 
                  ? 'bg-amber-500 text-black shadow-[0_0_12px_#F59E0B]' 
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_12px_rgba(16,185,129,0.3)]'
              }`}
              title="Toggle Play / Pause (Spacebar)"
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} className="ml-0.5" />}
              <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>

            <button
              onClick={() => setLoopEnabled(!loopEnabled)}
              className={`p-1.5 rounded-lg transition-colors ${
                loopEnabled 
                  ? 'bg-purple-950 text-purple-300 border border-purple-500/50 shadow-[0_0_8px_rgba(192,132,252,0.3)]' 
                  : 'text-[#64748B] hover:text-white'
              }`}
              title="Loop Region"
            >
              <Repeat size={13} />
            </button>

            {/* Live Playhead Indicator */}
            <div className="px-2 py-0.5 rounded bg-black/80 border border-[#202C48] text-[10px] text-amber-300 font-bold">
              BAR {(playheadBar + 1).toFixed(2)} / {totalBars}
            </div>
          </div>

          {/* Project BPM Synchronization */}
          <div className="flex items-center gap-2 bg-[#060810] px-3 py-1.5 rounded-xl border border-[#182138]">
            <span className="text-[10px] font-bold text-[#64748B] uppercase">TEMPO:</span>
            <input
              type="number"
              min="40"
              max="240"
              value={bpm}
              onChange={e => setBpm(Math.max(40, Math.min(240, parseInt(e.target.value) || 120)))}
              className="w-14 px-1.5 py-0.5 bg-[#10162A] border border-[#202C48] rounded text-center text-amber-300 font-bold focus:outline-none focus:border-amber-400"
            />
            <span className="text-[10px] text-[#64748B]">BPM</span>
          </div>

          {/* Tool Palette */}
          <div className="flex items-center gap-1 bg-[#060810] p-1 rounded-xl border border-[#182138]">
            <button
              onClick={() => setActiveTool('select')}
              className={`p-1.5 rounded-lg flex items-center gap-1 text-[11px] font-bold transition-all ${
                activeTool === 'select'
                  ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
              title="Select / Move / Resize Tool (V)"
            >
              <MousePointer size={13} />
              <span className="hidden md:inline">Select</span>
            </button>

            <button
              onClick={() => setActiveTool('draw')}
              className={`p-1.5 rounded-lg flex items-center gap-1 text-[11px] font-bold transition-all ${
                activeTool === 'draw'
                  ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
              title="Pencil / Draw Notes Tool (P)"
            >
              <Pencil size={13} />
              <span className="hidden md:inline">Draw</span>
            </button>

            <button
              onClick={() => setActiveTool('erase')}
              className={`p-1.5 rounded-lg flex items-center gap-1 text-[11px] font-bold transition-all ${
                activeTool === 'erase'
                  ? 'bg-red-500 text-white shadow-[0_0_10px_#EF4444]'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
              title="Eraser Tool (E)"
            >
              <Eraser size={13} />
              <span className="hidden md:inline">Erase</span>
            </button>

            <button
              onClick={() => setActiveTool('velocity')}
              className={`p-1.5 rounded-lg flex items-center gap-1 text-[11px] font-bold transition-all ${
                activeTool === 'velocity'
                  ? 'bg-purple-500 text-white shadow-[0_0_10px_#A855F7]'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
              title="Velocity Tool (Y)"
            >
              <Activity size={13} />
              <span className="hidden md:inline">Velocity</span>
            </button>

            {/* Quick Selection & Undo/Redo Actions */}
            <div className="flex items-center gap-1 border-l border-[#1A2542] pl-1.5 ml-1">
              <button
                onClick={() => {
                  const allIds = notes.map(n => n.id);
                  setSelectedNoteIds(allIds);
                  if (allIds.length > 0) setSelectedNoteId(allIds[0]);
                  showToast(`Selected all ${allIds.length} notes (Cmd/Ctrl+A)`);
                }}
                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#141B2D] text-[#8C96B5] hover:text-white hover:bg-[#1E2942] transition-colors"
                title="Select all MIDI notes in clip (Cmd/Ctrl+A)"
              >
                ALL
              </button>

              {(selectedNoteIds.length > 0 || selectedNoteId) && (
                <button
                  onClick={() => {
                    setSelectedNoteIds([]);
                    setSelectedNoteId(null);
                    showToast('Selection cleared');
                  }}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-950/60 text-rose-300 border border-rose-500/30 hover:bg-rose-900 transition-colors"
                  title="Clear note selection"
                >
                  NONE
                </button>
              )}

              <button
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className={`p-1 rounded-lg flex items-center justify-center transition-all ${
                  undoStack.length > 0
                    ? 'text-[#8C96B5] hover:text-white hover:bg-[#1E2942] cursor-pointer'
                    : 'text-[#334155] opacity-40 cursor-not-allowed'
                }`}
                title="Undo last MIDI edit (Ctrl/Cmd+Z)"
              >
                <Undo2 size={13} />
              </button>

              <button
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className={`p-1 rounded-lg flex items-center justify-center transition-all ${
                  redoStack.length > 0
                    ? 'text-[#8C96B5] hover:text-white hover:bg-[#1E2942] cursor-pointer'
                    : 'text-[#334155] opacity-40 cursor-not-allowed'
                }`}
                title="Redo last MIDI edit (Ctrl/Cmd+Y)"
              >
                <Redo2 size={13} />
              </button>
            </div>
          </div>

          {/* Visual Snap-to-Grid Magnet Toggle + Synced Division Selector */}
          <div className={`flex items-center gap-1 bg-[#060810] px-2 py-1 rounded-xl border transition-colors ${
            snapEnabled ? 'border-emerald-500/50' : 'border-[#182138]'
          }`}>
            <button
              type="button"
              onClick={() => {
                const next = toggleSnapEnabled();
                playLaserBeamSound('laser_select');
                showToast(next ? `Snap-to-Grid ON (${formatSnapDivisionLabel(snapDivision)})` : 'Snap-to-Grid OFF (Freeform)');
              }}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer border ${
                snapEnabled
                  ? 'bg-emerald-400 text-black border-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.45)]'
                  : 'bg-[#101524] text-[#64748B] border-[#1E293B] hover:text-white'
              }`}
              title={`Toggle Snap-to-Grid ON/OFF (Hotkey 'S' • Hold Alt while dragging for temporary freeform • Syncs with Mixer)`}
            >
              <Magnet size={11} />
              <span>{snapEnabled ? 'SNAP ON' : 'SNAP OFF'}</span>
            </button>

            {SNAP_DIVISIONS.map(d => {
              const isSelectedDiv = snapDivision === d.id || (d.id === 'triplet' && (snapDivision === '1/8T' || snapDivision === '1/16T'));
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setSnapDivision(d.id);
                    playLaserBeamSound('laser_select');
                    showToast(`Snap grid: ${d.label} (synced with Mixer)`);
                  }}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer border ${
                    isSelectedDiv && snapEnabled
                      ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400/70 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                      : isSelectedDiv
                        ? 'bg-[#161D30] text-[#94A3B8] border-[#334155]'
                        : 'text-[#64748B] border-transparent hover:text-white hover:bg-[#161D30]'
                  }`}
                  title={`Set snap grid division to ${d.label}`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>

          {/* Quantize Action Deck */}
          <div className="flex items-center gap-1.5 bg-[#060810] px-1.5 py-1 rounded-xl border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            {/* Primary Quantize Button */}
            <button
              onClick={() => handleQuantizeSelected()}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:brightness-110 active:scale-95 text-black font-black text-xs flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(16,185,129,0.35)] group cursor-pointer"
              title={`Snap ${selectedNoteIds.length > 0 ? `${selectedNoteIds.length} selected notes` : (selectedNoteId ? '1 selected note' : 'all notes')} to nearest ${formatSnapDivisionLabel(snapDivision)} grid division (Press 'Q')`}
            >
              <Magnet size={13} className="text-black group-hover:rotate-12 transition-transform" />
              <span className="tracking-wider">QUANTIZE</span>
              <span className="px-1.5 py-0.2 rounded bg-black/25 text-emerald-950 font-black text-[10px]">
                {formatSnapDivisionLabel(snapDivision)}
              </span>
              {(selectedNoteIds.length > 0 || selectedNoteId) && (
                <span className="px-1.5 py-0.2 rounded bg-black/40 text-emerald-200 font-bold text-[9px]">
                  {selectedNoteIds.length > 0 ? `${selectedNoteIds.length} SEL` : '1 SEL'}
                </span>
              )}
            </button>

            {/* Swing Humanize Slider inside Quantize Action Deck */}
            <div className="flex items-center gap-1.5 px-2 border-l border-[#1E293B]">
              <span className="text-[9px] font-bold text-[#94A3B8]">SWING</span>
              <input
                type="range"
                min={0}
                max={100}
                value={swingPercent}
                onChange={(e) => setSwingPercent(Number(e.target.value))}
                className="w-16 accent-[#FF8C00] cursor-pointer"
                title={`Quantize Swing Humanization: ${swingPercent}%`}
              />
              <span className="text-[9px] font-bold tabular-nums text-[#FF8C00] w-7 text-right">
                {swingPercent}%
              </span>
            </div>

            {/* Note Lengths Quantize Toggle */}
            <button
              onClick={() => {
                const nextVal = !quantizeLengths;
                setQuantizeLengths(nextVal);
                showToast(nextVal ? 'Quantize will snap Note Starts AND Lengths' : 'Quantize will snap Note Starts only');
              }}
              className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all ${
                quantizeLengths
                  ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                  : 'bg-[#12192F] text-[#64748B] hover:text-white'
              }`}
              title="Toggle whether note lengths are also snapped to the grid division when quantizing"
            >
              LENGTHS: {quantizeLengths ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* MIDI Arpeggiator Module Deck */}
        <div className="px-5 py-2 border-b border-[#141B2E] bg-gradient-to-r from-[#070B18] via-[#0B1226] to-[#070B18] flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs shadow-inner">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Arpeggiator Module Identity & Power */}
            <div className="flex items-center gap-2 bg-[#050814] px-3 py-1.5 rounded-xl border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.18)]">
              <div className="flex items-center gap-1.5">
                <Zap size={14} className={arpConfig.enabled ? "text-cyan-400 animate-pulse" : "text-[#64748B]"} />
                <span className="font-bold text-xs tracking-wider text-cyan-300 uppercase">
                  MIDI ARPEGGIATOR
                </span>
              </div>
              <button
                onClick={() => {
                  const nextState = !arpConfig.enabled;
                  setArpConfig(prev => ({ ...prev, enabled: nextState }));
                  playLaserBeamSound(nextState ? 'laser_select' : 'laser_erase');
                  showToast(nextState ? 'MIDI Arpeggiator ENABLED (transforms incoming & drawn notes)' : 'MIDI Arpeggiator BYPASSED');
                }}
                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black transition-all ${
                  arpConfig.enabled
                    ? 'bg-cyan-400 text-black shadow-[0_0_10px_#00F0FF]'
                    : 'bg-[#151D33] text-[#64748B] hover:text-white'
                }`}
                title="Toggle MIDI Arpeggiator module"
              >
                {arpConfig.enabled ? 'ACTIVE' : 'OFF'}
              </button>
            </div>

            {/* Arp Pattern Selector: Up, Down, Random, Converge */}
            <div className="flex items-center gap-1 bg-[#050814] px-2.5 py-1.5 rounded-xl border border-[#182138]">
              <span className="text-[10px] font-bold text-[#64748B] uppercase mr-1">PATTERN:</span>
              {(
                [
                  { id: 'up', label: 'UP', icon: ArrowUp, desc: 'Ascending Pitch Sequence' },
                  { id: 'down', label: 'DOWN', icon: ArrowDown, desc: 'Descending Pitch Sequence' },
                  { id: 'random', label: 'RANDOM', icon: Shuffle, desc: 'Randomized Shuffled Order' },
                  { id: 'converge', label: 'CONVERGE', icon: SlidersHorizontal, desc: 'Outside-In Converging Alternation' }
                ] as const
              ).map(pat => {
                const Icon = pat.icon;
                const isActive = arpConfig.pattern === pat.id;
                return (
                  <button
                    key={pat.id}
                    onClick={() => {
                      setArpConfig(prev => ({ ...prev, pattern: pat.id }));
                      playLaserBeamSound('laser_select');
                      showToast(`Arpeggiator Pattern: ${pat.label} (${pat.desc})`);
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                      isActive
                        ? 'bg-cyan-400 text-black shadow-[0_0_8px_#00F0FF]'
                        : 'text-[#94A3B8] hover:text-white hover:bg-[#152038]'
                    }`}
                    title={`${pat.label}: ${pat.desc}`}
                  >
                    <Icon size={11} />
                    <span>{pat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Latching Settings: Latch ON / OFF, Chord Memory & Quick Presets */}
            <div className="flex items-center gap-2 bg-[#050814] px-2.5 py-1.5 rounded-xl border border-[#182138] flex-wrap">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-[#64748B] uppercase">LATCH:</span>
                <button
                  onClick={() => {
                    const nextLatch = !arpConfig.latch;
                    setArpConfig(prev => ({ ...prev, latch: nextLatch }));
                    playLaserBeamSound('laser_select');
                    showToast(nextLatch ? 'Arpeggiator Latch: ON (Accumulates chords in memory)' : 'Arpeggiator Latch: OFF');
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                    arpConfig.latch
                      ? 'bg-purple-500 text-white shadow-[0_0_8px_#A855F7]'
                      : 'bg-[#151D33] text-[#64748B] hover:text-white'
                  }`}
                  title="When latch is ON, notes are remembered and transformed into continuous arpeggios"
                >
                  {arpConfig.latch ? <Lock size={10} /> : <Unlock size={10} />}
                  <span>{arpConfig.latch ? 'LATCH ON' : 'LATCH OFF'}</span>
                </button>
              </div>

              {/* Latched chord notes in memory */}
              {latchedPitches.length > 0 && (
                <div className="flex items-center gap-1.5 pl-1.5 border-l border-[#1A2542]">
                  <span className="text-[9px] text-purple-300 font-bold truncate max-w-[130px]" title={latchedPitches.map(p => midiToNoteName(p)).join(', ')}>
                    [{latchedPitches.map(p => midiToNoteName(p)).join(', ')}]
                  </span>
                  <button
                    onClick={() => {
                      setLatchedPitches([]);
                      playLaserBeamSound('laser_erase');
                      showToast('Cleared Arpeggiator Latched Memory');
                    }}
                    className="text-[#64748B] hover:text-red-400 p-0.5"
                    title="Clear Latched Memory"
                  >
                    <X size={11} />
                  </button>
                </div>
              )}

              {/* Latch quick presets & Latch Selection button */}
              <div className="flex items-center gap-1 pl-1 border-l border-[#1A2542]">
                <button
                  onClick={handleLatchSelectedNotes}
                  className="px-1.5 py-0.5 rounded bg-purple-950/70 border border-purple-500/40 hover:border-purple-400 text-purple-300 text-[9px] font-bold"
                  title="Latch currently selected notes into Arpeggiator memory"
                >
                  Latch Sel
                </button>
                <button
                  onClick={() => handleLatchPresetChord('maj7')}
                  className="px-1.5 py-0.5 rounded bg-[#10172B] hover:bg-[#1A2544] text-[#94A3B8] hover:text-white text-[9px]"
                  title="Latch Major 7th chord"
                >
                  Maj7
                </button>
                <button
                  onClick={() => handleLatchPresetChord('min9')}
                  className="px-1.5 py-0.5 rounded bg-[#10172B] hover:bg-[#1A2544] text-[#94A3B8] hover:text-white text-[9px]"
                  title="Latch Minor 9th chord"
                >
                  Min9
                </button>
                <button
                  onClick={() => handleLatchPresetChord('sus4')}
                  className="px-1.5 py-0.5 rounded bg-[#10172B] hover:bg-[#1A2544] text-[#94A3B8] hover:text-white text-[9px]"
                  title="Latch Sus4 chord"
                >
                  Sus4
                </button>
              </div>
            </div>

            {/* Arp Rate Selector */}
            <div className="flex items-center gap-1 bg-[#050814] px-2 py-1.5 rounded-xl border border-[#182138]">
              <span className="text-[10px] font-bold text-[#64748B] uppercase">RATE:</span>
              {(['1/4', '1/8', '1/16', '1/32', '1/8T', '1/16T'] as const).map(rate => (
                <button
                  key={rate}
                  onClick={() => {
                    setArpConfig(prev => ({ ...prev, rate }));
                    playLaserBeamSound('laser_select');
                  }}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                    arpConfig.rate === rate
                      ? 'bg-emerald-500 text-black'
                      : 'text-[#8C96B5] hover:text-white'
                  }`}
                >
                  {rate}
                </button>
              ))}
            </div>

            {/* Octaves */}
            <div className="flex items-center gap-1 bg-[#050814] px-2 py-1.5 rounded-xl border border-[#182138]">
              <span className="text-[10px] font-bold text-[#64748B] uppercase">OCT:</span>
              {([1, 2, 3] as const).map(oct => (
                <button
                  key={oct}
                  onClick={() => {
                    setArpConfig(prev => ({ ...prev, octaves: oct }));
                    playLaserBeamSound('laser_select');
                  }}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                    arpConfig.octaves === oct
                      ? 'bg-amber-400 text-black'
                      : 'text-[#8C96B5] hover:text-white'
                  }`}
                >
                  {oct}
                </button>
              ))}
            </div>

            {/* Gate */}
            <div className="flex items-center gap-1 bg-[#050814] px-2.5 py-1.5 rounded-xl border border-[#182138]">
              <span className="text-[10px] text-[#64748B] font-bold">GATE:</span>
              <input
                type="range"
                min="0.25"
                max="1.0"
                step="0.05"
                value={arpConfig.gate}
                onChange={e => setArpConfig(prev => ({ ...prev, gate: parseFloat(e.target.value) }))}
                className="w-14 accent-cyan-400 cursor-pointer h-1.5 bg-[#141C31] rounded"
              />
              <span className="text-[10px] text-cyan-300 font-bold">{Math.round(arpConfig.gate * 100)}%</span>
            </div>
          </div>

          {/* Transform Selected Notes with Arpeggiator Action Button */}
          <button
            onClick={handleTransformNotesWithArpeggiator}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:brightness-110 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.3)] transition-all shrink-0 active:scale-95"
            title="Transform currently selected notes (or drawn chord notes) using active pattern and latch settings"
          >
            <Sparkles size={12} className="text-yellow-300 animate-spin" />
            <span>TRANSFORM NOTES WITH ARP</span>
          </button>
        </div>

        {/* Humanize & Basic Pitch Ingestion Sub-Bar */}
        <div className="px-5 py-2 border-b border-[#141B2E] bg-[#070A15] flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          
          {/* Humanize Feature Control Panel */}
          <div className="flex items-center gap-3 bg-[#090D1C] px-3 py-1.5 rounded-xl border border-[#1A233D] flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                <Sparkles size={12} />
                HUMANIZE ENGINE:
              </span>
              <button
                onClick={() => setHumanizeEnabled(!humanizeEnabled)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  humanizeEnabled
                    ? 'bg-emerald-500 text-black shadow-[0_0_8px_#10B981]'
                    : 'bg-[#161D30] text-[#64748B]'
                }`}
                title="Toggle organic randomized velocity offsets to incoming & synthetic notes"
              >
                {humanizeEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#7E88AA]">Velocity Jitter:</span>
              <input
                type="range"
                min="0.05"
                max="0.4"
                step="0.02"
                value={humanizeAmount}
                onChange={e => setHumanizeAmount(parseFloat(e.target.value))}
                className="w-20 accent-emerald-400 cursor-pointer h-1.5 bg-[#151C2E] rounded-lg"
              />
              <span className="text-[10px] font-bold text-emerald-300">
                &plusmn;{Math.round(humanizeAmount * 80)} vel ({Math.round(humanizeAmount * 100)}%)
              </span>
            </div>

            <button
              onClick={handleApplyHumanize}
              className="px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/50 hover:border-emerald-400 text-emerald-300 text-[10px] font-bold transition-colors"
              title="Apply subtle velocity randomization immediately to all notes"
            >
              APPLY NOW
            </button>
          </div>

          {/* Quick Pitch Transpose (+/- 12 semitones, +/- 1 semitone) */}
          <div className="flex items-center gap-1 bg-[#090D1C] px-2.5 py-1.5 rounded-xl border border-[#1A233D]">
            <span className="text-[10px] text-[#64748B] font-bold">TRANSPOSE:</span>
            <button
              onClick={() => handleTranspose(-12)}
              className="px-1.5 py-0.5 rounded bg-[#131A2E] text-[#94A3B8] hover:text-white text-[10px]"
              title="Transpose down 1 Octave (-12)"
            >
              -12
            </button>
            <button
              onClick={() => handleTranspose(-1)}
              className="px-1.5 py-0.5 rounded bg-[#131A2E] text-[#94A3B8] hover:text-white text-[10px]"
              title="Transpose down 1 semitone (-1)"
            >
              -1
            </button>
            <button
              onClick={() => handleTranspose(1)}
              className="px-1.5 py-0.5 rounded bg-[#131A2E] text-[#94A3B8] hover:text-white text-[10px]"
              title="Transpose up 1 semitone (+1)"
            >
              +1
            </button>
            <button
              onClick={() => handleTranspose(12)}
              className="px-1.5 py-0.5 rounded bg-[#131A2E] text-[#94A3B8] hover:text-white text-[10px]"
              title="Transpose up 1 Octave (+12)"
            >
              +12
            </button>
          </div>

          {/* Ingest from Basic Pitch Stem Presets */}
          <div className="flex items-center gap-1.5 bg-[#090D1C] px-2.5 py-1.5 rounded-xl border border-[#1A233D]">
            <span className="text-[10px] text-[#64748B] font-bold">BASIC PITCH SOURCE:</span>
            <select
              value={selectedPresetStem}
              onChange={e => setSelectedPresetStem(e.target.value as any)}
              className="bg-[#12192E] border border-[#202C48] text-purple-300 rounded px-2 py-0.5 text-[10px] font-bold focus:outline-none"
            >
              <option value="instruments">Chords & Arps</option>
              <option value="bass">Bassline / 808</option>
              <option value="vocals">Vocal Topline</option>
              <option value="drums">Drum Map (GM)</option>
            </select>

            <button
              onClick={handleLoadBasicPitchPreset}
              disabled={isTranscribingPreset}
              className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/50 hover:border-purple-400 text-purple-200 text-[10px] font-bold flex items-center gap-1 transition-all disabled:opacity-50"
              title="Re-run Spotify Basic Pitch neural network to ingest notes"
            >
              <RotateCw size={10} className={isTranscribingPreset ? 'animate-spin' : ''} />
              <span>{isTranscribingPreset ? 'Extracting...' : 'Load Stem'}</span>
            </button>
          </div>
        </div>

        {/* Main Piano Roll Container */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#05070E] overflow-hidden relative">
          
          {/* Piano Roll Area: Keys on left, Grid on right */}
          <div className="flex-1 flex min-h-0 overflow-hidden relative">
            
            {/* Left Vertical Piano Keys Axis */}
            <div className="w-16 sm:w-20 border-r border-[#151D33] bg-[#0A0E1A] flex flex-col justify-between py-0.5 select-none shrink-0 z-20">
              {Array.from({ length: pitchRange }).map((_, idx) => {
                const pitch = maxPitch - idx;
                const name = midiToNoteName(pitch);
                const isBlack = name.includes('#');
                const isC = name.startsWith('C') && !name.includes('#');
                const isActive = auditionNote === pitch;

                return (
                  <button
                    key={pitch}
                    onClick={() => handleAuditionPitch(pitch)}
                    className={`h-full text-[9px] px-1 flex items-center justify-between border-b border-[#12182A] transition-colors relative group ${
                      isActive
                        ? 'bg-emerald-500 text-black font-black'
                        : isBlack
                          ? 'bg-[#0E1322] text-[#64748B] hover:bg-[#162038]'
                          : isC
                            ? 'bg-[#18223C] text-emerald-300 font-bold hover:bg-[#1F2C4E]'
                            : 'bg-[#141C31] text-[#94A3B8] hover:bg-[#1A2644]'
                    }`}
                    title={`Audition ${name} (MIDI ${pitch})`}
                  >
                    <span className="font-bold">{name}</span>
                    <span className="text-[7px] opacity-40">{pitch}</span>
                    {isC && (
                      <div className="w-1 h-1 rounded-full bg-emerald-400 absolute right-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right Note Grid Matrix */}
            <div 
              ref={gridContainerRef}
              onClick={handleGridClick}
              className="flex-1 relative overflow-auto bg-[#060810] cursor-crosshair select-none"
            >
              {/* Dynamic Measure, Beat & Active Snap Subdivision Grid Lines */}
              {Array.from({ length: totalBars }).map((_, bar) => {
                const subCount =
                  snapDivision === '1/32' ? 32 :
                  snapDivision === '1/16T' ? 24 :
                  snapDivision === '1/16' ? 16 :
                  (snapDivision === 'triplet' || snapDivision === '1/8T') ? 12 :
                  snapDivision === '1/8' ? 8 :
                  snapDivision === '1/4' ? 4 :
                  snapDivision === '1/2' ? 2 : 1;

                return (
                  <React.Fragment key={bar}>
                    {/* Bar boundary line */}
                    <div
                      className="absolute top-0 bottom-0 border-l-2 border-[#1E293B] pointer-events-none z-10"
                      style={{ left: `${(bar / totalBars) * 100}%` }}
                    >
                      <span className="text-[9px] font-bold text-[#64748B] pl-1.5 select-none">
                        BAR {bar + 1}
                      </span>
                    </div>

                    {/* Quarter note beat subdivisions */}
                    {[1, 2, 3].map(beat => (
                      <div
                        key={beat}
                        className={`absolute top-0 bottom-0 border-l pointer-events-none ${
                          snapEnabled ? 'border-[#162136]' : 'border-[#111827]/70'
                        }`}
                        style={{ left: `${((bar + beat / 4) / totalBars) * 100}%` }}
                      />
                    ))}

                    {/* Active Snap Division Sub-lines (respond dynamically to 1/4, 1/8, 1/16, 1/32, Triplets & Snap ON/OFF) */}
                    {subCount > 4 && Array.from({ length: subCount }).map((_, stepIdx) => {
                      if (stepIdx === 0) return null;
                      const frac = stepIdx / subCount;
                      const isBeat = Math.abs((frac * 4) - Math.round(frac * 4)) < 0.001;
                      if (isBeat) return null;
                      return (
                        <div
                          key={stepIdx}
                          className={`absolute top-0 bottom-0 border-l pointer-events-none transition-opacity ${
                            snapEnabled
                              ? 'border-emerald-500/15 opacity-100'
                              : 'border-[#0D1322]/40 opacity-25'
                          }`}
                          style={{ left: `${((bar + frac) / totalBars) * 100}%` }}
                        />
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {/* Pitch Horizontal Guides */}
              {Array.from({ length: pitchRange }).map((_, idx) => {
                const pitch = maxPitch - idx;
                const name = midiToNoteName(pitch);
                const isBlack = name.includes('#');
                const isC = name.startsWith('C') && !name.includes('#');
                const isDragPitch = dragSnapGuide?.pitch === pitch;

                return (
                  <div
                    key={pitch}
                    className={`absolute left-0 right-0 border-b pointer-events-none ${
                      isDragPitch
                        ? 'border-cyan-400/50 bg-cyan-500/10'
                        : isC
                          ? 'border-emerald-500/20 bg-emerald-950/10'
                          : isBlack
                            ? 'border-[#0F1424] bg-[#070A13]/50'
                            : 'border-[#12192C]'
                    }`}
                    style={{
                      top: `${(idx / pitchRange) * 100}%`,
                      height: `${(1 / pitchRange) * 100}%`
                    }}
                  />
                );
              })}

              {/* Live Magnetic Drag Alignment Guide & Readout */}
              {dragSnapGuide && (
                <>
                  <div
                    className={`absolute top-0 bottom-0 pointer-events-none z-30 ${
                      dragSnapGuide.isSnapped ? 'bg-emerald-400/10' : 'bg-sky-400/5'
                    }`}
                    style={{
                      left: `${(dragSnapGuide.startBar / totalBars) * 100}%`,
                      width: `${Math.max(0.4, ((dragSnapGuide.endBar - dragSnapGuide.startBar) / totalBars) * 100)}%`
                    }}
                  />
                  <div
                    className={`absolute top-0 bottom-0 w-0.5 pointer-events-none z-40 ${
                      dragSnapGuide.isSnapped
                        ? 'bg-emerald-400 shadow-[0_0_12px_#10B981]'
                        : 'bg-sky-400/80 border-l border-dashed border-sky-300'
                    }`}
                    style={{
                      left: `${((dragSnapGuide.mode === 'resize' ? dragSnapGuide.endBar : dragSnapGuide.startBar) / totalBars) * 100}%`
                    }}
                  >
                    <div
                      className={`mt-1 ml-1.5 px-2 py-0.5 rounded text-[9px] font-mono font-black whitespace-nowrap border shadow-xl flex items-center gap-1 ${
                        dragSnapGuide.isSnapped
                          ? 'bg-[#04120E]/95 border-emerald-400 text-emerald-300'
                          : 'bg-[#08101C]/95 border-sky-400 text-sky-300'
                      }`}
                    >
                      <Magnet size={9} />
                      <span>
                        {dragSnapGuide.isSnapped
                          ? `SNAP ${formatSnapDivisionLabel(snapDivision)}`
                          : 'FREEFORM'}
                      </span>
                      <span className="text-white">
                        {dragSnapGuide.mode === 'resize'
                          ? `LEN ${(dragSnapGuide.endBar - dragSnapGuide.startBar).toFixed(2)}b`
                          : `BAR ${(dragSnapGuide.startBar + 1).toFixed(2)}`}
                      </span>
                      <span className="text-amber-300">{dragSnapGuide.noteName}</span>
                    </div>
                  </div>
                </>
              )}

              {/* Synchronized Playhead Marker */}
              {isPlaying && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-[0_0_12px_#F59E0B] z-30 pointer-events-none"
                  style={{ left: `${(playheadBar / totalBars) * 100}%` }}
                >
                  <div className="w-2.5 h-2.5 -ml-1 bg-amber-400 rounded-full shadow-[0_0_8px_#F59E0B]" />
                </div>
              )}

              {/* Rendered MIDI Note Blocks */}
              {notes.map(note => {
                const topPercent = ((maxPitch - note.pitch) / pitchRange) * 100;
                const heightPercent = Math.max(1.8, (1 / pitchRange) * 100);
                const leftPercent = (note.startBar / totalBars) * 100;
                const widthPercent = Math.max(0.6, (note.durationBars / totalBars) * 100);

                const isSelected = selectedNoteId === note.id || selectedNoteIds.includes(note.id);
                const isUnderPlayhead = isPlaying && playheadBar >= note.startBar && playheadBar <= (note.startBar + note.durationBars);

                // Note velocity color scale
                const velNorm = note.velocity / 127;
                const noteColor = isUnderPlayhead 
                  ? '#F59E0B'
                  : isSelected 
                    ? '#00F0FF' 
                    : `rgba(16, 185, 129, ${0.45 + velNorm * 0.55})`;

                return (
                  <div
                    key={note.id}
                    onMouseDown={(e) => handleNoteMouseDown(e, note, false)}
                    className={`absolute rounded-xs cursor-move flex items-center justify-between px-1 border transition-all z-20 group ${
                      isSelected
                        ? 'border-cyan-300 ring-2 ring-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.8)] z-30'
                        : isUnderPlayhead
                          ? 'border-amber-300 shadow-[0_0_15px_#F59E0B] brightness-125'
                          : 'border-black/60 hover:brightness-125 hover:border-emerald-300 shadow-md'
                    }`}
                    style={{
                      top: `${topPercent}%`,
                      height: `${heightPercent}%`,
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                      backgroundColor: noteColor,
                      boxShadow: isUnderPlayhead ? '0 0 10px #F59E0B' : `0 0 6px ${noteColor}60`
                    }}
                    title={`${note.noteName} (${note.pitch}) • Vel: ${note.velocity} • Bar: ${note.startBar.toFixed(2)}`}
                  >
                    <div className="flex items-center gap-1 truncate text-[8px] font-bold text-black drop-shadow-sm">
                      <span>{note.noteName}</span>
                      <span className="opacity-70 text-[7px]">{note.velocity}</span>
                    </div>

                    {/* Resize handle on right edge */}
                    <div
                      onMouseDown={(e) => handleNoteMouseDown(e, note, true)}
                      className="w-1.5 h-full cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/60 hover:bg-white rounded-r-xs shrink-0"
                      title="Drag to resize note duration"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Velocity Lane at Bottom */}
          {showVelocityLane && (
            <div className="h-24 border-t border-[#151D33] bg-[#070914] flex flex-col shrink-0">
              <div className="px-3 py-1 bg-[#090D1C] border-b border-[#141B2E] flex items-center justify-between text-[10px] text-[#64748B]">
                <div className="flex items-center gap-2">
                  <Activity size={12} className="text-purple-400" />
                  <span className="font-bold text-[#A0AEC0]">NOTE VELOCITY MATRIX</span>
                  <span>(0 - 127)</span>
                </div>
                <div className="flex items-center gap-3">
                  {selectedNote && (
                    <span className="text-cyan-300 font-bold">
                      Selected: {selectedNote.noteName} &bull; Velocity: {selectedNote.velocity}
                    </span>
                  )}
                  <button
                    onClick={() => setShowVelocityLane(false)}
                    className="hover:text-white"
                  >
                    &times;
                  </button>
                </div>
              </div>

              {/* Velocity stems visualization */}
              <div className="flex-1 flex items-end pl-16 sm:pl-20 pr-2 relative overflow-hidden bg-[#05070E]">
                {/* Horizontal reference lines */}
                <div className="absolute top-[25%] left-0 right-0 border-b border-[#11172A] pointer-events-none" />
                <div className="absolute top-[50%] left-0 right-0 border-b border-[#11172A] pointer-events-none" />
                <div className="absolute top-[75%] left-0 right-0 border-b border-[#11172A] pointer-events-none" />

                {notes.map(note => {
                  const leftPercent = (note.startBar / totalBars) * 100;
                  const isSelected = selectedNoteId === note.id || selectedNoteIds.includes(note.id);
                  const heightPercent = (note.velocity / 127) * 100;

                  return (
                    <div
                      key={note.id}
                      onClick={() => {
                        setSelectedNoteId(note.id);
                        handleAuditionPitch(note.pitch);
                      }}
                      className="absolute bottom-0 flex flex-col items-center cursor-pointer group"
                      style={{ left: `${leftPercent}%` }}
                    >
                      <div 
                        className={`w-2.5 rounded-full transition-all ${
                          isSelected 
                            ? 'bg-cyan-400 shadow-[0_0_8px_#00F0FF]' 
                            : 'bg-emerald-400/80 group-hover:bg-emerald-300'
                        }`}
                        style={{ height: '5px' }}
                      />
                      <div 
                        className={`w-0.5 transition-all ${
                          isSelected 
                            ? 'bg-cyan-400 shadow-[0_0_8px_#00F0FF]' 
                            : 'bg-emerald-500/70 group-hover:bg-emerald-300'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Instrument Routing, Live Web MIDI Out & Mixer Export Bar */}
        <div className="px-5 py-3 border-t border-[#182035] bg-[#090D1C] flex flex-col gap-2.5 shrink-0">
          {/* Live Web MIDI Output Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-[#141B2E]">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <Radio size={13} className={selectedMidiOutId ? 'text-emerald-400 animate-pulse' : 'text-cyan-400'} />
                <span>Live Web MIDI Output:</span>
              </span>
              <select
                aria-label="Live Web MIDI Output"
                value={selectedMidiOutId}
                onChange={e => {
                  const nextPort = e.target.value;
                  if (selectedMidiOutId && selectedMidiOutId !== nextPort) {
                    sendWebMidiAllNotesOff(selectedMidiOutId, midiOutChannel);
                  }
                  setSelectedMidiOutId(nextPort);
                  const portObj = midiOutPorts.find(p => p.id === nextPort);
                  if (portObj) {
                    showToast(`Live Web MIDI Output routed to "${portObj.name}" (Ch ${midiOutChannel})`);
                  } else {
                    showToast('Routed to Internal WebAudio Synth Only');
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-[#11172A] border border-[#243252] hover:border-cyan-400/70 text-xs font-bold text-white focus:outline-none focus:border-cyan-400 cursor-pointer min-w-[220px]"
              >
                <option value="">Internal WebAudio Synth Only</option>
                {midiOutPorts.map(port => (
                  <option key={port.id} value={port.id}>
                    {port.name} ({port.manufacturer})
                  </option>
                ))}
              </select>

              <select
                aria-label="MIDI Output Channel"
                value={midiOutChannel}
                onChange={e => setMidiOutChannel(parseInt(e.target.value, 10) || 1)}
                className="px-2.5 py-1.5 rounded-xl bg-[#11172A] border border-[#243252] text-xs font-bold text-cyan-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
                title="Target MIDI Channel (1–16)"
              >
                {Array.from({ length: 16 }).map((_, idx) => {
                  const ch = idx + 1;
                  return (
                    <option key={ch} value={ch}>
                      Ch {ch}{ch === 10 ? ' (GM Drums)' : ''}
                    </option>
                  );
                })}
              </select>

              <button
                onClick={() => refreshMidiOutputPorts(true)}
                disabled={isRefreshingMidiOut}
                className="px-2.5 py-1.5 rounded-xl bg-[#11172A] border border-[#202C48] hover:border-cyan-400 text-[#A0AEC0] hover:text-cyan-300 text-[11px] font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                title="Scan for virtual MIDI ports (loopMIDI, IAC Driver) and standalone VST MIDI inputs"
              >
                <RefreshCw size={12} className={isRefreshingMidiOut ? 'animate-spin text-cyan-400' : ''} />
                <span>Scan Ports</span>
              </button>
            </div>

            <div className="text-[10px] flex items-center gap-2">
              {selectedMidiOutId ? (
                <span className="px-2 py-1 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 font-bold">
                  LIVE OUT: {midiOutPorts.find(p => p.id === selectedMidiOutId)?.name || 'Port Active'} • CH {midiOutChannel}
                </span>
              ) : !midiOutSupported ? (
                <span className="text-amber-300/90">Web MIDI unavailable in this browser</span>
              ) : midiOutError ? (
                <span className="text-amber-300/90">{midiOutError}</span>
              ) : midiOutPorts.length === 0 ? (
                <span className="text-[#64748B]">No virtual/hardware MIDI ports detected (loopMIDI / IAC ready)</span>
              ) : (
                <span className="text-cyan-300/80 font-bold">{midiOutPorts.length} MIDI port{midiOutPorts.length === 1 ? '' : 's'} ready</span>
              )}
            </div>
          </div>

          {/* Instrument & Export Row */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Instrument Selector */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#A0AEC0] flex items-center gap-1.5">
                <Music size={13} className="text-cyan-400" />
                <span>Assigned Instrument:</span>
              </span>
              <select
                value={instrument}
                onChange={e => setInstrument(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#11172A] border border-[#202C48] text-xs font-bold text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                {INSTRUMENT_OPTIONS.map(inst => (
                  <option key={inst.id} value={inst.id}>
                    {inst.icon} {inst.name} — {inst.desc}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Note Counts & Key Detection */}
            <div className="flex items-center gap-4 text-xs">
              <div>
                <span className="text-[#64748B]">Total Notes:</span>{' '}
                <span className="font-bold text-emerald-300">{notes.length}</span>
              </div>
              <div>
                <span className="text-[#64748B]">Range:</span>{' '}
                <span className="font-bold text-purple-300">{midiToNoteName(minPitch)} - {midiToNoteName(maxPitch)}</span>
              </div>
            </div>

            {/* Export / Commit Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleDownloadMidi}
                disabled={notes.length === 0}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-400 hover:brightness-110 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.35)] transition-all disabled:opacity-40 cursor-pointer"
                title="Download standard Type 0 .mid file for Ableton, FL Studio, Logic, or Reaper"
              >
                <Download size={14} />
                <span>Download .MID File</span>
              </button>

              <button
                onClick={handleSaveToCurrentClip}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:brightness-110 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
              >
                <Check size={14} />
                <span>Apply to Mixer Clip</span>
              </button>

              <button
                onClick={handleExportNewMidiTrack}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:brightness-110 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(192,132,252,0.3)] transition-all"
              >
                <Plus size={14} />
                <span>Deploy as New MIDI Track</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
