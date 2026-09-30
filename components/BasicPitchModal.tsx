import React, { useState, useEffect, useRef } from 'react';
import { 
  Music, 
  Sparkles, 
  Play, 
  Pause, 
  RotateCw, 
  Download, 
  Plus, 
  Sliders, 
  Cpu, 
  Layers, 
  Volume2, 
  Check, 
  X, 
  Radio, 
  Upload, 
  Scissors, 
  Zap, 
  Flame, 
  FileCode, 
  Disc, 
  ArrowRight,
  ChevronRight,
  Activity,
  Keyboard
} from 'lucide-react';
import { 
  Track, 
  Clip, 
  MidiNoteEvent, 
  BasicPitchModelSettings, 
  BasicPitchTranscriptionResult, 
  IngestedSongSource 
} from '../types';
import { 
  PRESET_SONGS, 
  DEFAULT_BASIC_PITCH_SETTINGS, 
  runSpotifyBasicPitchTranscription, 
  decomposeAndTranscribeAllStems,
  MultiStemTranscriptionItem,
  basicPitchSynth, 
  midiToNoteName, 
  midiToFreq 
} from '../services/basicPitchService';
import { playLaserBeamSound, playColliderInjectionSound } from '../lib/laserSound';
import { MidiEditor } from './MidiEditor';

interface BasicPitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks?: Track[];
  onAddMidiTrackToMixer?: (trackName: string, clip: Clip, instrumentName: string) => void;
  onAddMultiStemMidiTracksToMixer?: (newTracks: Track[], bpm: number) => void;
  initialStemCategory?: 'vocals' | 'bass' | 'drums' | 'instruments' | 'full';
  initialSongTitle?: string;
  initialAudioBuffer?: AudioBuffer;
}

const AVAILABLE_INSTRUMENTS = [
  { id: 'SFZ Grand Piano', name: 'SFZ Grand Piano', desc: 'Natural acoustic concert grand with multi-velocity hammer samples', icon: '🎹' },
  { id: 'Rhodes Mark I', name: 'Rhodes Mark I Vintage EP', desc: 'Bell-like tine attack, warm body tone & vintage tremolo', icon: '✨' },
  { id: 'TB-303 Acid Synth', name: 'TB-303 Diode Acid Synth', desc: 'Resonant low-pass diode ladder filter with squelch envelope', icon: '⚡' },
  { id: 'Analog Juno Saw', name: 'Analog Juno Saw Synth', desc: 'Lush stereo detuned sawtooth synth lead and chord arps', icon: '🔮' },
  { id: 'Mellotron Strings', name: 'Mellotron Tape Strings', desc: '1960s magnetic tape strings with gentle wow/flutter drift', icon: '📼' },
  { id: '808 Sub Boom', name: '808 Sub Boom & Glide', desc: 'Deep sine sub bass with punchy pitch transient decay', icon: '💣' },
  { id: 'Faust Karplus Guitar', name: 'Faust Karplus-Strong Guitar', desc: 'Physical modeling plucked acoustic/electric guitar toy', icon: '🎸' },
  { id: 'General MIDI Drum Kit', name: 'General MIDI Drum Kit', desc: 'General MIDI percussion map (Kick 36, Snare 38, Hat 42)', icon: '🥁' }
];

export const BasicPitchModal: React.FC<BasicPitchModalProps> = ({
  isOpen,
  onClose,
  tracks = [],
  onAddMidiTrackToMixer,
  onAddMultiStemMidiTracksToMixer,
  initialStemCategory = 'instruments',
  initialSongTitle,
  initialAudioBuffer
}) => {
  if (!isOpen) return null;

  // Step 1: Song Source
  const [selectedSong, setSelectedSong] = useState<IngestedSongSource>(() => {
    return PRESET_SONGS[0];
  });
  const [customAudioFile, setCustomAudioFile] = useState<File | null>(null);

  // Step 2: Stem Engine Selection
  const [selectedStem, setSelectedStem] = useState<'vocals' | 'bass' | 'drums' | 'instruments' | 'full'>(initialStemCategory);

  // Step 3: Basic Pitch Model Settings
  const [settings, setSettings] = useState<BasicPitchModelSettings>({
    ...DEFAULT_BASIC_PITCH_SETTINGS,
    stemTarget: initialStemCategory
  });

  // Step 4: Transcribed Output & Preview
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [isBatchDecomposing, setIsBatchDecomposing] = useState<boolean>(false);
  const [transcriptionResult, setTranscriptionResult] = useState<BasicPitchTranscriptionResult | null>(null);
  const [selectedInstrument, setSelectedInstrument] = useState<string>('SFZ Grand Piano');
  const [isMidiEditorOpen, setIsMidiEditorOpen] = useState<boolean>(false);

  // Live Audition State
  const [isPlayingMidi, setIsPlayingMidi] = useState<boolean>(false);
  const [playheadPosPercent, setPlayheadPosPercent] = useState<number>(0);
  const [activeAuditionNote, setActiveAuditionNote] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const stopSequenceRef = useRef<(() => void) | null>(null);
  const playheadIntervalRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Run transcription automatically on mount or when stem changes
  useEffect(() => {
    handleTranscribeAudio();
  }, [selectedStem, selectedSong.id]);

  // Clean up playback on unmount
  useEffect(() => {
    return () => {
      if (stopSequenceRef.current) stopSequenceRef.current();
      if (playheadIntervalRef.current) clearInterval(playheadIntervalRef.current);
    };
  }, []);

  const handleTranscribeAudio = async () => {
    setIsTranscribing(true);
    playColliderInjectionSound();

    try {
      // Simulate Spotify Basic Pitch neural network processing
      await new Promise(r => setTimeout(r, 650));

      const res = await runSpotifyBasicPitchTranscription(
        selectedStem,
        `${selectedSong.title} (${selectedStem.toUpperCase()})`,
        selectedSong.bpm,
        settings
      );

      setTranscriptionResult(res);
      setSelectedInstrument(res.recommendedInstrument);
      showToast(`Spotify Basic Pitch transcribed ${res.notes.length} MIDI notes from ${selectedStem.toUpperCase()} stem!`);
      playLaserBeamSound('laser_curve');
    } catch (err) {
      console.error(err);
      showToast('Transcription error. Check audio pipeline.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleTogglePlayMidi = () => {
    if (!transcriptionResult || transcriptionResult.notes.length === 0) return;

    if (isPlayingMidi) {
      if (stopSequenceRef.current) {
        stopSequenceRef.current();
        stopSequenceRef.current = null;
      }
      if (playheadIntervalRef.current) {
        clearInterval(playheadIntervalRef.current);
        playheadIntervalRef.current = null;
      }
      setIsPlayingMidi(false);
      setPlayheadPosPercent(0);
      setActiveAuditionNote(null);
    } else {
      setIsPlayingMidi(true);
      playLaserBeamSound('laser_audio');

      const totalDurSec = transcriptionResult.durationSeconds;
      const startTime = Date.now();

      playheadIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const pct = Math.min(100, (elapsed / totalDurSec) * 100);
        setPlayheadPosPercent(pct);

        if (elapsed >= totalDurSec) {
          setIsPlayingMidi(false);
          setPlayheadPosPercent(0);
          setActiveAuditionNote(null);
          clearInterval(playheadIntervalRef.current);
        }
      }, 50);

      stopSequenceRef.current = basicPitchSynth.playSequence(
        transcriptionResult.notes,
        selectedInstrument,
        selectedSong.bpm
      );
    }
  };

  const handleSingleNoteAudition = (pitch: number) => {
    setActiveAuditionNote(pitch);
    basicPitchSynth.playNote(pitch, selectedInstrument, 0.6, 95);
    playLaserBeamSound('laser_select');
    setTimeout(() => setActiveAuditionNote(null), 400);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCustomAudioFile(file);
    const newSong: IngestedSongSource = {
      id: `custom-${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: 'User Imported Audio',
      sourceType: 'file_upload',
      durationSeconds: 16.0,
      bpm: 120,
      key: 'Detected from audio',
      description: `Imported file: ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`,
      stemsExtracted: true
    };
    setSelectedSong(newSong);
    showToast(`Loaded ${file.name}. Running Spotify Basic Pitch stem decomposition...`);
  };

  const handleExportMidiToMixer = () => {
    if (!transcriptionResult || !onAddMidiTrackToMixer) return;

    const stemLabels: Record<string, string> = {
      vocals: 'Vocal Lead (MIDI)',
      bass: 'Bassline (MIDI)',
      drums: 'Drum Map (MIDI)',
      instruments: 'Chords & Melody (MIDI)',
      full: 'Full Mix (MIDI)'
    };

    const trackName = `${stemLabels[selectedStem] || 'Transcribed MIDI'} [${selectedInstrument}]`;

    const clip: Clip = {
      id: `clip-midi-${Date.now()}`,
      name: `${selectedSong.title} (${selectedStem.toUpperCase()})`,
      startBar: 0,
      durationBars: transcriptionResult.totalBars,
      isMidi: true,
      midiNotes: transcriptionResult.notes,
      instrument: selectedInstrument
    };

    onAddMidiTrackToMixer(trackName, clip, selectedInstrument);
    playColliderInjectionSound();
    showToast(`Sent ${transcriptionResult.notes.length} MIDI notes to Mixer Console with ${selectedInstrument}!`);
    onClose();
  };

  const handleBatchDecomposeAllStems = async () => {
    setIsBatchDecomposing(true);
    playColliderInjectionSound();
    showToast(`Decomposing "${selectedSong.title}" into 4 stems with Spotify Basic Pitch...`);

    try {
      await new Promise(r => setTimeout(r, 600));
      const stemResults = await decomposeAndTranscribeAllStems(
        selectedSong,
        settings,
        initialAudioBuffer
      );

      const newMidiTracks: Track[] = stemResults.map((item, idx) => ({
        id: `midi-track-stem-${item.stemCategory}-${Date.now()}-${idx}`,
        name: item.trackName,
        type: 'midi' as const,
        volume: item.stemCategory === 'drums' ? 0.88 : item.stemCategory === 'bass' ? 0.84 : 0.78,
        pan: item.stemCategory === 'instruments' ? -0.2 : item.stemCategory === 'vocals' ? 0.15 : 0,
        muted: false,
        soloed: false,
        color: item.color,
        phaseInverted: false,
        isMono: item.stemCategory === 'bass',
        vstBypassed: false,
        instrument: item.instrument,
        clips: [{
          id: `clip-midi-${item.stemCategory}-${Date.now()}`,
          name: `${selectedSong.title} (${item.stemCategory.toUpperCase()})`,
          startBar: 0,
          durationBars: item.result.totalBars,
          isMidi: true,
          midiNotes: item.result.notes,
          instrument: item.instrument
        }]
      }));

      if (onAddMultiStemMidiTracksToMixer) {
        onAddMultiStemMidiTracksToMixer(newMidiTracks, selectedSong.bpm);
      } else if (onAddMidiTrackToMixer) {
        newMidiTracks.forEach(t => {
          onAddMidiTrackToMixer(t.name, t.clips[0], t.instrument || 'SFZ Grand Piano');
        });
      }

      playLaserBeamSound('laser_curve');
      showToast(`Deconstructed "${selectedSong.title}" into 4 stem MIDI tracks with VSTi instruments!`);
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Error during multi-stem Basic Pitch transcription.');
    } finally {
      setIsBatchDecomposing(false);
    }
  };

  const handleDownloadMidiFile = () => {
    if (!transcriptionResult?.midiDataUri) return;
    const a = document.createElement('a');
    a.href = transcriptionResult.midiDataUri;
    a.download = `${selectedSong.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${selectedStem}.mid`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Exported ${a.download} (Standard Type 0 MIDI)`);
    playLaserBeamSound('laser_curve');
  };

  // Piano Roll visual rendering data
  const notes = transcriptionResult?.notes || [];
  const minPitch = notes.length > 0 ? Math.max(24, Math.min(...notes.map(n => n.pitch)) - 2) : 36;
  const maxPitch = notes.length > 0 ? Math.min(84, Math.max(...notes.map(n => n.pitch)) + 2) : 72;
  const pitchRange = Math.max(12, maxPitch - minPitch + 1);

  return (
    <div className="fixed inset-0 z-[9994] flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in font-mono select-none">
      <div className="relative w-full max-w-6xl h-[92vh] rounded-2xl overflow-hidden border border-[#1E293B] bg-[#07090F] text-[#E2E8F0] shadow-[0_0_60px_rgba(0,0,0,0.95)] flex flex-col">
        {/* Toast Notification */}
        {toastMsg && (
          <div className="absolute top-4 right-4 z-50 px-4 py-2.5 rounded-xl bg-cyan-950/90 border border-cyan-400 text-cyan-200 text-xs shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center gap-2 animate-fade-in backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-cyan-300 animate-spin" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Top Header */}
        <div className="px-6 py-4 border-b border-[#182035] bg-gradient-to-r from-[#0C101E] via-[#0F1528] to-[#0A0D18] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500/20 via-cyan-500/20 to-purple-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-wider text-white uppercase">
                  SPOTIFY BASIC PITCH // AUDIO-TO-MIDI STEM ROUTE
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold">
                  NEURAL POLYPHONIC
                </span>
              </div>
              <p className="text-[11px] text-[#7E88AA]">
                Decompose Suno, radio, or audio tracks into stems & transcribe polyphonic notes into MIDI tracks for your mixer instruments
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#7E88AA] hover:text-white hover:bg-[#161D30] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Main Body Grid */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* Left Column: Source Song, Stem Splitter & Model Configuration */}
          <div className="w-full md:w-80 border-r border-[#151C2E] bg-[#090C16] flex flex-col p-4 overflow-y-auto space-y-4 flex-shrink-0">
            {/* Step 1: Song Source Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#A0AEC0] flex items-center gap-1.5">
                  <Disc size={13} className="text-cyan-400" />
                  <span>1. Song Source (Suno / Radio / File)</span>
                </span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-bold"
                >
                  Upload File
                </button>
                <input 
                  ref={fileInputRef} 
                  type="file" 
                  accept="audio/*" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </div>

              <div className="space-y-1.5">
                {PRESET_SONGS.map(song => (
                  <button
                    key={song.id}
                    onClick={() => {
                      setSelectedSong(song);
                      playLaserBeamSound('laser_select');
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all ${
                      selectedSong.id === song.id
                        ? 'border-cyan-500/80 bg-cyan-950/40 text-white shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                        : 'border-[#151C2E] bg-[#0C101D] text-[#8C96B5] hover:border-[#202B45] hover:text-white'
                    }`}
                  >
                    <div className="font-bold truncate">{song.title}</div>
                    <div className="text-[10px] text-[#64748B] flex items-center justify-between mt-0.5">
                      <span>{song.artist}</span>
                      <span>{song.bpm} BPM • {song.key}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Stem Engine Selection (Vocals, Bass, Drums, Instruments) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#A0AEC0] flex items-center gap-1.5">
                  <Scissors size={13} className="text-purple-400" />
                  <span>2. Stem Engine Route</span>
                </span>
                <span className="text-[10px] text-purple-400 font-bold px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800/40">
                  STEM CELL
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                {[
                  { id: 'instruments', label: 'Chords / Keys', color: '#C084FC', icon: '🎹' },
                  { id: 'bass', label: 'Bass & 808', color: '#FF2E63', icon: '🎸' },
                  { id: 'vocals', label: 'Vocals', color: '#00F0FF', icon: '🎤' },
                  { id: 'drums', label: 'Drums (GM Map)', color: '#FFD700', icon: '🥁' }
                ].map(stem => (
                  <button
                    key={stem.id}
                    onClick={() => {
                      setSelectedStem(stem.id as any);
                      playLaserBeamSound('laser_select');
                    }}
                    className={`p-2.5 rounded-xl border text-xs text-left transition-all flex items-center gap-2 ${
                      selectedStem === stem.id
                        ? 'border-purple-500 bg-purple-950/40 text-white shadow-[0_0_12px_rgba(192,132,252,0.25)] font-bold'
                        : 'border-[#151C2E] bg-[#0C101D] text-[#8C96B5] hover:text-white'
                    }`}
                  >
                    <span>{stem.icon}</span>
                    <span className="truncate">{stem.label}</span>
                  </button>
                ))}
              </div>

              {/* Instant Full-Song Deconstruction Button */}
              <button
                onClick={handleBatchDecomposeAllStems}
                disabled={isBatchDecomposing}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-purple-950 via-pink-950 to-emerald-950 border border-purple-500/60 hover:border-purple-400 text-purple-200 hover:text-white text-[11px] font-bold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(192,132,252,0.25)] transition-all disabled:opacity-50"
                title="Automatically separate all 4 stems and run Spotify Basic Pitch on each to produce synchronized multitrack MIDI in the mixer"
              >
                <Zap size={13} className={`text-yellow-400 ${isBatchDecomposing ? 'animate-bounce' : ''}`} />
                <span>{isBatchDecomposing ? 'Separating All 4 Stems...' : 'Deconstruct All 4 Stems to MIDI'}</span>
              </button>
            </div>

            {/* Step 3: Spotify Basic Pitch Neural Parameters */}
            <div className="border-t border-[#151C2E] pt-3 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#A0AEC0] flex items-center gap-1.5">
                <Sliders size={13} className="text-emerald-400" />
                <span>3. Basic Pitch Model Parameters</span>
              </span>

              {/* Onset Threshold Slider */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-[#8C96B5]">Onset Threshold:</span>
                  <span className="text-emerald-300 font-bold">{settings.onsetThreshold.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={settings.onsetThreshold}
                  onChange={e => setSettings(s => ({ ...s, onsetThreshold: parseFloat(e.target.value) }))}
                  className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-[#151C2E] rounded-lg"
                />
              </div>

              {/* Frame Threshold Slider */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-[#8C96B5]">Frame Threshold:</span>
                  <span className="text-emerald-300 font-bold">{settings.frameThreshold.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={settings.frameThreshold}
                  onChange={e => setSettings(s => ({ ...s, frameThreshold: parseFloat(e.target.value) }))}
                  className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-[#151C2E] rounded-lg"
                />
              </div>

              {/* Quantization */}
              <div>
                <div className="text-[11px] text-[#8C96B5] mb-1">Quantization Snap:</div>
                <div className="grid grid-cols-4 gap-1 text-[10px]">
                  {['none', '1/16', '1/8', 'triplet'].map(q => (
                    <button
                      key={q}
                      onClick={() => setSettings(s => ({ ...s, quantization: q as any }))}
                      className={`py-1 rounded border uppercase font-bold transition-all ${
                        settings.quantization === q
                          ? 'border-emerald-500 bg-emerald-950/70 text-emerald-300'
                          : 'border-[#151C2E] bg-[#0A0D18] text-[#71789B] hover:text-white'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Retranscribe Trigger */}
              <button
                onClick={handleTranscribeAudio}
                disabled={isTranscribing}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50"
              >
                <RotateCw size={13} className={isTranscribing ? 'animate-spin' : ''} />
                <span>{isTranscribing ? 'Extracting MIDI Notes...' : 'Re-Run Basic Pitch Extraction'}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Piano Roll Visualizer, Audition & Instrument Assign */}
          <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto space-y-4 min-w-0 bg-[#060810]">
            {/* Top Stat Bar */}
            <div className="p-3.5 rounded-2xl bg-[#090D1A] border border-[#182138] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-[10px] text-[#64748B] uppercase font-bold">Total Notes</span>
                  <div className="text-sm font-bold text-emerald-300">{notes.length}</div>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748B] uppercase font-bold">Detected Key</span>
                  <div className="text-sm font-bold text-cyan-300">
                    {transcriptionResult?.keyDetected || 'F#'} {transcriptionResult?.scaleDetected || 'Minor'}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748B] uppercase font-bold">Max Polyphony</span>
                  <div className="text-sm font-bold text-purple-300">
                    {transcriptionResult?.polyphonyPeak || 4} Voices
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748B] uppercase font-bold">Tempo</span>
                  <div className="text-sm font-bold text-amber-300">{selectedSong.bpm} BPM</div>
                </div>
              </div>

              {/* Audition Player Controller */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTogglePlayMidi}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    isPlayingMidi
                      ? 'bg-amber-500 text-black shadow-[0_0_15px_#F59E0B]'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  }`}
                >
                  {isPlayingMidi ? <Pause size={14} /> : <Play size={14} />}
                  <span>{isPlayingMidi ? 'Stop Audition' : 'Audition Synthesized MIDI'}</span>
                </button>

                <button
                  onClick={() => setIsMidiEditorOpen(true)}
                  className="px-3 py-2 rounded-xl bg-purple-950/80 border border-purple-500/70 hover:border-purple-400 text-purple-200 text-xs font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(192,132,252,0.3)] transition-all cursor-pointer"
                  title="Open advanced interactive Piano Roll Editor for these notes"
                >
                  <Keyboard size={13} className="text-purple-300" />
                  <span>Piano Roll Editor</span>
                </button>

                <button
                  onClick={handleDownloadMidiFile}
                  className="px-3 py-2 rounded-xl bg-[#11172A] border border-[#202C48] hover:border-cyan-400 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  title="Download standard .mid file for Ableton, FL Studio, Logic"
                >
                  <Download size={13} />
                  <span>Export .MID</span>
                </button>
              </div>
            </div>

            {/* Interactive Piano Roll Grid */}
            <div className="flex-1 min-h-[260px] rounded-2xl border border-[#182138] bg-[#070A14] flex flex-col overflow-hidden relative shadow-inner">
              <div className="px-3 py-1.5 border-b border-[#141B2E] bg-[#090D1C] flex items-center justify-between text-[10px] text-[#64748B]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#A0AEC0]">PIANO ROLL DISPATCH</span>
                  <span>(Click any key to audition pitch)</span>
                </div>
                <div className="flex items-center gap-3">
                  <span>8 Bars (32 Beats)</span>
                  <span className="text-emerald-400 font-bold">SPOTIFY BASIC PITCH CONFIDENCE MAPPING</span>
                </div>
              </div>

              {/* Piano Roll Content Canvas / Elements */}
              <div className="flex-1 flex overflow-hidden relative">
                {/* Vertical Keyboard (Pitch Axis) */}
                <div className="w-16 border-r border-[#182138] bg-[#0A0E1A] flex flex-col justify-between py-1 z-10 select-none">
                  {Array.from({ length: pitchRange }).map((_, idx) => {
                    const pitch = maxPitch - idx;
                    const name = midiToNoteName(pitch);
                    const isBlack = name.includes('#');
                    const isActive = activeAuditionNote === pitch;

                    return (
                      <button
                        key={pitch}
                        onClick={() => handleSingleNoteAudition(pitch)}
                        className={`h-full text-[9px] px-1 flex items-center justify-between border-b border-[#12182A] transition-colors ${
                          isActive
                            ? 'bg-emerald-500 text-black font-black'
                            : isBlack
                              ? 'bg-[#0E1322] text-[#64748B] hover:bg-[#162038]'
                              : 'bg-[#151D33] text-[#A0AEC0] hover:bg-[#1E2948]'
                        }`}
                      >
                        <span>{name}</span>
                        <span className="text-[7px] opacity-40">{pitch}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Note Events Timeline Area */}
                <div className="flex-1 relative overflow-x-auto bg-[#05070E]">
                  {/* Bar Grid Background Lines */}
                  {Array.from({ length: 9 }).map((_, bar) => (
                    <div
                      key={bar}
                      className="absolute top-0 bottom-0 border-l border-[#131B2E]"
                      style={{ left: `${(bar / 8) * 100}%` }}
                    >
                      <span className="text-[8px] font-mono text-[#334155] pl-1">Bar {bar + 1}</span>
                    </div>
                  ))}

                  {/* Playhead Marker */}
                  {isPlayingMidi && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-[0_0_10px_#F59E0B] z-20 pointer-events-none transition-all duration-75"
                      style={{ left: `${playheadPosPercent}%` }}
                    />
                  )}

                  {/* Render Transcribed MIDI Notes */}
                  {notes.map(n => {
                    const topPercent = ((maxPitch - n.pitch) / pitchRange) * 100;
                    const heightPercent = Math.max(2, (1 / pitchRange) * 100);
                    const leftPercent = (n.startBar / 8) * 100;
                    const widthPercent = Math.max(0.8, (n.durationBars / 8) * 100);

                    const colorByStem: Record<string, string> = {
                      vocals: '#00F0FF',
                      bass: '#FF2E63',
                      drums: '#FFD700',
                      instruments: '#C084FC',
                      full: '#10B981'
                    };
                    const noteColor = colorByStem[selectedStem] || '#10B981';

                    return (
                      <div
                        key={n.id}
                        onClick={() => handleSingleNoteAudition(n.pitch)}
                        className="absolute rounded-sm border border-black/40 cursor-pointer hover:brightness-125 transition-all group"
                        style={{
                          top: `${topPercent}%`,
                          height: `${heightPercent}%`,
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                          backgroundColor: noteColor,
                          opacity: 0.85,
                          boxShadow: `0 0 6px ${noteColor}60`
                        }}
                        title={`${n.noteName} (${n.pitch}) • Vel: ${n.velocity} • Bar: ${n.startBar.toFixed(2)}`}
                      >
                        <span className="hidden group-hover:block absolute bottom-full left-0 z-30 px-1 py-0.5 rounded bg-black text-[8px] text-white whitespace-nowrap">
                          {n.noteName} • {n.velocity} vel
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Step 5: Assign Instrument & Deploy to Mixer */}
            <div className="p-4 rounded-2xl bg-[#090D1C] border border-[#182138] flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex-1 w-full">
                <span className="text-xs font-bold uppercase tracking-wider text-[#A0AEC0] flex items-center gap-1.5 mb-1.5">
                  <Music size={13} className="text-cyan-400" />
                  <span>Assigned VSTi / Sample-Based Instrument</span>
                </span>
                <select
                  value={selectedInstrument}
                  onChange={e => setSelectedInstrument(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#11172A] border border-[#202C48] text-xs font-bold text-white focus:outline-none focus:border-cyan-400"
                >
                  {AVAILABLE_INSTRUMENTS.map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.icon} {inst.name} — {inst.desc}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-4">
                <button
                  onClick={handleBatchDecomposeAllStems}
                  disabled={isBatchDecomposing}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:brightness-110 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(192,132,252,0.4)] transition-all disabled:opacity-50"
                  title="Deconstruct the entire song into 4 stems and generate 4 synchronized MIDI tracks for the mixer"
                >
                  <Layers size={14} className={isBatchDecomposing ? 'animate-spin' : ''} />
                  <span>{isBatchDecomposing ? 'Extracting 4 Stems...' : 'Deconstruct ALL 4 Stems to Multitrack MIDI'}</span>
                </button>

                <button
                  onClick={handleExportMidiToMixer}
                  className="flex-1 md:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:brightness-110 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all"
                >
                  <ArrowRight size={15} />
                  <span>Send {selectedStem.toUpperCase()} MIDI to Mixer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* MidiEditor Sub-Modal */}
        {isMidiEditorOpen && (
          <MidiEditor
            isOpen={isMidiEditorOpen}
            onClose={() => setIsMidiEditorOpen(false)}
            initialNotes={transcriptionResult?.notes || []}
            clipName={`${selectedSong.title} (${selectedStem.toUpperCase()})`}
            projectBpm={selectedSong.bpm}
            initialInstrument={selectedInstrument}
            globalSnapValue="1/16"
            onSaveClipNotes={(editedNotes, _name, inst) => {
              if (transcriptionResult) {
                setTranscriptionResult({
                  ...transcriptionResult,
                  notes: editedNotes
                });
              }
              if (inst) setSelectedInstrument(inst);
              showToast(`Applied ${editedNotes.length} edited MIDI notes from MidiEditor!`);
            }}
            onExportToNewTrack={(trackName, editedNotes, inst) => {
              if (onAddMidiTrackToMixer) {
                const clip: Clip = {
                  id: `clip-midi-${Date.now()}`,
                  name: trackName,
                  startBar: 0,
                  durationBars: transcriptionResult?.totalBars || 4,
                  isMidi: true,
                  midiNotes: editedNotes,
                  instrument: inst
                };
                onAddMidiTrackToMixer(trackName, clip, inst);
                onClose();
              }
            }}
          />
        )}
      </div>
    </div>
  );
};
