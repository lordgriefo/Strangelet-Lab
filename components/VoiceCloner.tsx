// Strangelet Lab - Low-Resource Voice Cloner & Timbre Modeler
// 100% In-Browser CPU-Efficient Voice Cloning & Synthesis
// Features live mic recording, audio file analysis, interactive singing keyboard,
// lyrics-to-sing phrase synthesizer, and direct DAW track routing.

import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Upload, 
  Play, 
  Pause, 
  Square, 
  Download, 
  Sparkles, 
  Music, 
  Sliders, 
  Volume2, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Save, 
  Check, 
  Activity, 
  Waves, 
  Flame, 
  Radio, 
  Layers, 
  UserCheck, 
  RefreshCw, 
  AudioWaveform as WaveformIcon,
  FolderOpen,
  ArrowRight
} from 'lucide-react';
import { VoiceProfile, Track, Clip } from '../types';
import { 
  lowResourceVoiceCloner, 
  FACTORY_VOICE_PROFILES, 
  VOWEL_FORMANT_OFFSETS,
  STORAGE_KEY_ACTIVE_VOICE_ID 
} from '../services/lowResourceVoiceCloner';
import { playLaserBeamSound, playColliderInjectionSound } from '../lib/laserSound';

interface VoiceClonerProps {
  onAddTrack?: (track: Track) => void;
  currentTracks?: Track[];
  onNavigateToMixer?: () => void;
  className?: string;
}

// Preset Melodic Phrases for Quick Audition
const PRESET_MELODIES = [
  {
    name: 'Neon Horizon Hook (Major)',
    lyrics: 'Drifting through the neon lights',
    notes: [
      { pitchHz: 261.63, durationSec: 0.5, vowel: 'I' },  // C4
      { pitchHz: 293.66, durationSec: 0.5, vowel: 'I' },  // D4
      { pitchHz: 329.63, durationSec: 0.6, vowel: 'U' },  // E4
      { pitchHz: 392.00, durationSec: 0.7, vowel: 'A' },  // G4
      { pitchHz: 329.63, durationSec: 0.8, vowel: 'I' }   // E4
    ]
  },
  {
    name: 'Soulful Pentatonic Run',
    lyrics: 'Oh baby feel the vibe',
    notes: [
      { pitchHz: 220.00, durationSec: 0.4, vowel: 'O' },  // A3
      { pitchHz: 261.63, durationSec: 0.4, vowel: 'A' },  // C4
      { pitchHz: 293.66, durationSec: 0.5, vowel: 'I' },  // D4
      { pitchHz: 349.23, durationSec: 0.7, vowel: 'A' },  // F4
      { pitchHz: 329.63, durationSec: 0.9, vowel: 'I' }   // E4
    ]
  },
  {
    name: 'Cybernetic Fast Chants',
    lyrics: 'Strangelet particle machine',
    notes: [
      { pitchHz: 196.00, durationSec: 0.3, vowel: 'A' },  // G3
      { pitchHz: 196.00, durationSec: 0.3, vowel: 'E' },  // G3
      { pitchHz: 233.08, durationSec: 0.35, vowel: 'I' }, // Bb3
      { pitchHz: 261.63, durationSec: 0.4, vowel: 'A' },  // C4
      { pitchHz: 293.66, durationSec: 0.6, vowel: 'I' }   // D4
    ]
  }
];

// Piano Keys for Virtual Singing Keyboard (C3 to C5)
const PIANO_KEYS = [
  { note: 'C3', freq: 130.81, isBlack: false },
  { note: 'C#3', freq: 138.59, isBlack: true },
  { note: 'D3', freq: 146.83, isBlack: false },
  { note: 'D#3', freq: 155.56, isBlack: true },
  { note: 'E3', freq: 164.81, isBlack: false },
  { note: 'F3', freq: 174.61, isBlack: false },
  { note: 'F#3', freq: 185.00, isBlack: true },
  { note: 'G3', freq: 196.00, isBlack: false },
  { note: 'G#3', freq: 207.65, isBlack: true },
  { note: 'A3', freq: 220.00, isBlack: false },
  { note: 'A#3', freq: 233.08, isBlack: true },
  { note: 'B3', freq: 246.94, isBlack: false },
  { note: 'C4', freq: 261.63, isBlack: false },
  { note: 'C#4', freq: 277.18, isBlack: true },
  { note: 'D4', freq: 293.66, isBlack: false },
  { note: 'D#4', freq: 311.13, isBlack: true },
  { note: 'E4', freq: 329.63, isBlack: false },
  { note: 'F4', freq: 349.23, isBlack: false },
  { note: 'F#4', freq: 369.99, isBlack: true },
  { note: 'G4', freq: 392.00, isBlack: false },
  { note: 'G#4', freq: 415.30, isBlack: true },
  { note: 'A4', freq: 440.00, isBlack: false },
  { note: 'A#4', freq: 466.16, isBlack: true },
  { note: 'B4', freq: 493.88, isBlack: false },
  { note: 'C5', freq: 523.25, isBlack: false }
];

export const VoiceCloner: React.FC<VoiceClonerProps> = ({
  onAddTrack,
  currentTracks = [],
  onNavigateToMixer,
  className = ''
}) => {
  // Voice Profile State
  const [profiles, setProfiles] = useState<VoiceProfile[]>(() => lowResourceVoiceCloner.loadAllProfiles());
  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY_ACTIVE_VOICE_ID) || FACTORY_VOICE_PROFILES[0].id;
    }
    return FACTORY_VOICE_PROFILES[0].id;
  });

  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0] || FACTORY_VOICE_PROFILES[0];

  // Performance Controls
  const [activeVowel, setActiveVowel] = useState<string>('A');
  const [formantShift, setFormantShift] = useState<number>(1.0); // 0.75 (deep) to 1.35 (bright)
  const [octaveShift, setOctaveShift] = useState<number>(0);
  const [activePlayingNote, setActivePlayingNote] = useState<string | null>(null);

  // Performance Mode: 'keyboard' | 'text_to_sing' | 'clone_new'
  const [activeTab, setActiveTab] = useState<'keyboard' | 'text_to_sing' | 'clone_new'>('keyboard');

  // Text-to-Sing State
  const [lyricsInput, setLyricsInput] = useState('Drifting through the neon city lights');
  const [selectedMelodyIdx, setSelectedMelodyIdx] = useState<number>(0);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [renderedAudioBuffer, setRenderedAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlayingRendered, setIsPlayingRendered] = useState(false);

  // Microphone Live Recording State
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micMediaRecorder, setMicMediaRecorder] = useState<MediaRecorder | null>(null);
  const [micAudioChunks, setMicAudioChunks] = useState<Blob[]>([]);
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState(false);
  const [clonedProfileName, setClonedProfileName] = useState('My Cloned Vocal');

  // Audio Playback Source Ref
  const activePlaybackSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const fileUploadInputRef = useRef<HTMLInputElement>(null);
  const recordingTimerRef = useRef<any>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Switch Active Voicebank
  const handleSelectVoice = (id: string) => {
    const target = profiles.find(p => p.id === id);
    if (!target) return;
    setActiveProfileId(target.id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_ACTIVE_VOICE_ID, target.id);
    }
    playLaserBeamSound('laser_select');
    showToast(`Loaded Cloned Voice: "${target.name}"`);
  };

  // Keyboard note down
  const handleNoteMouseDown = (freq: number, noteName: string) => {
    const adjustedFreq = freq * Math.pow(2, octaveShift);
    setActivePlayingNote(noteName);
    lowResourceVoiceCloner.startNoteSinging(adjustedFreq, activeProfile, activeVowel, formantShift);
  };

  // Keyboard note up
  const handleNoteMouseUp = () => {
    setActivePlayingNote(null);
    lowResourceVoiceCloner.stopNoteSinging();
  };

  // Start Mic Recording
  const handleStartMicRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        await analyzeAudioBlob(blob, clonedProfileName || 'My Cloned Vocal');
      };

      setMicAudioChunks([]);
      setRecordingSeconds(0);
      recorder.start();
      setMicMediaRecorder(recorder);
      setIsRecordingMic(true);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);

      playLaserBeamSound('laser_select');
      showToast('Recording voice sample... Sing or speak a phrase (3-10 sec)');
    } catch (err: any) {
      showToast(err.message || 'Microphone access denied.');
    }
  };

  // Stop Mic Recording
  const handleStopMicRecord = () => {
    if (micMediaRecorder && isRecordingMic) {
      clearInterval(recordingTimerRef.current);
      micMediaRecorder.stop();
      setIsRecordingMic(false);
      playLaserBeamSound('laser_erase');
    }
  };

  // Analyze audio and extract acoustic profile
  const analyzeAudioBlob = async (blob: Blob, name: string) => {
    setIsAnalyzingAudio(true);
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const ctx = lowResourceVoiceCloner.getAudioContext();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      const newProfile = await lowResourceVoiceCloner.extractVoiceProfileFromBuffer(audioBuffer, name);
      const updated = lowResourceVoiceCloner.saveUserProfile(newProfile);
      setProfiles(updated);
      setActiveProfileId(newProfile.id);

      playColliderInjectionSound();
      showToast(`Acoustic Profile Extracted! Cloned "${newProfile.name}" successfully!`);
    } catch (err: any) {
      showToast(err.message || 'Failed to analyze audio sample.');
    } finally {
      setIsAnalyzingAudio(false);
    }
  };

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.replace(/\.[^/.]+$/, '');
    analyzeAudioBlob(file, `Cloned: ${name}`);
  };

  // Synthesize Phrase (Text-to-Sing)
  const handleSynthesizePhrase = async () => {
    setIsSynthesizing(true);
    try {
      const melody = PRESET_MELODIES[selectedMelodyIdx] || PRESET_MELODIES[0];
      const buffer = await lowResourceVoiceCloner.renderClonedVocalPhrase(
        activeProfile,
        lyricsInput,
        melody.notes,
        120,
        formantShift
      );
      setRenderedAudioBuffer(buffer);
      playColliderInjectionSound();
      showToast(`Synthesized "${activeProfile.name}" phrase! Ready to audition or send to DAW.`);
    } catch (err: any) {
      showToast(err.message || 'Error synthesizing voice phrase.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Play Rendered Audio
  const handleTogglePlayRendered = () => {
    if (!renderedAudioBuffer) return;

    if (isPlayingRendered) {
      if (activePlaybackSourceRef.current) {
        try { activePlaybackSourceRef.current.stop(); } catch {}
      }
      setIsPlayingRendered(false);
    } else {
      const ctx = lowResourceVoiceCloner.getAudioContext();
      if (ctx.state === 'suspended') ctx.resume();

      const source = ctx.createBufferSource();
      source.buffer = renderedAudioBuffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlayingRendered(false);
      source.start();
      activePlaybackSourceRef.current = source;
      setIsPlayingRendered(true);
    }
  };

  // Export as WAV
  const handleDownloadWav = () => {
    if (!renderedAudioBuffer) return;
    const blob = lowResourceVoiceCloner.audioBufferToWavBlob(renderedAudioBuffer);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeProfile.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_cloned_vocal.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded WAV audio file.');
  };

  // Send to Project DAW Track
  const handleSendToDawTrack = () => {
    if (!renderedAudioBuffer) {
      showToast('Please synthesize a vocal phrase first.');
      return;
    }

    const blob = lowResourceVoiceCloner.audioBufferToWavBlob(renderedAudioBuffer);
    const audioUrl = URL.createObjectURL(blob);

    // Build waveform snippet
    const channel = renderedAudioBuffer.getChannelData(0);
    const step = Math.floor(channel.length / 64);
    const waveformSnippet: number[] = [];
    for (let i = 0; i < 64; i++) {
      waveformSnippet.push(Math.abs(channel[i * step] || 0));
    }

    const durationBars = Math.max(2, Math.ceil((renderedAudioBuffer.duration / 2.0))); // approx bars

    const newClip: Clip = {
      id: `clip-voice-${Date.now()}`,
      name: `${activeProfile.name} Phrase`,
      startBar: 1,
      durationBars,
      audioUrl,
      waveformSnippet
    };

    const newTrack: Track = {
      id: `track-voice-${Date.now()}`,
      name: `Vocal [${activeProfile.name.split(' ')[0]}]`,
      type: 'audio',
      volume: 0.85,
      pan: 0,
      muted: false,
      soloed: false,
      color: activeProfile.vocalType === 'Soprano' ? '#EC4899' : activeProfile.vocalType === 'Alto' ? '#A855F7' : '#3B82F6',
      waveform: waveformSnippet,
      phaseInverted: false,
      isMono: true,
      vstBypassed: false,
      clips: [newClip],
      bus: 'Vocal Bus'
    };

    if (onAddTrack) {
      onAddTrack(newTrack);
      playColliderInjectionSound();
      showToast(`Added track "${newTrack.name}" to DAW Mixer!`);
      if (onNavigateToMixer) {
        setTimeout(onNavigateToMixer, 800);
      }
    }
  };

  // Delete User Profile
  const handleDeleteProfile = (id: string, name: string) => {
    if (window.confirm(`Delete cloned profile "${name}"?`)) {
      const updated = lowResourceVoiceCloner.deleteUserProfile(id);
      setProfiles(updated);
      handleSelectVoice(updated[0].id);
      showToast(`Deleted voice profile "${name}".`);
    }
  };

  return (
    <div className={`h-full p-4 lg:p-7 flex flex-col gap-5 animate-fade-in overflow-y-auto bg-[#05050A] ${className}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[9999] px-4 py-2.5 rounded-xl bg-[#0F172A] border border-cyan-500/60 shadow-2xl text-cyan-300 font-mono text-xs flex items-center gap-2 animate-bounce">
          <Sparkles size={14} className="text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Mic size={20} className="text-black" />
            </div>
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5 font-mono">
                <span>LOW-RESOURCE VOICE CLONER</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  100% IN-BROWSER DSP
                </span>
              </h2>
              <p className="text-xs text-[#8E9BBE]">
                Zero GPU overhead &bull; Real-time acoustic formant modeling &bull; Instant singing synthesis &bull; Direct DAW stem routing
              </p>
            </div>
          </div>
        </div>

        {/* Global Voicebank Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-[#090D1E] border border-[#212948] rounded-xl px-3 py-1.5 shadow-md">
            <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold hidden sm:inline">
              VOICE MODEL:
            </span>
            <select
              value={activeProfileId}
              onChange={(e) => handleSelectVoice(e.target.value)}
              className="bg-transparent text-cyan-300 font-mono font-bold text-xs focus:outline-none cursor-pointer max-w-[200px] sm:max-w-xs truncate"
            >
              <optgroup label="FACTORY VOICEBANKS">
                {profiles.filter(p => p.category === 'Factory').map(p => (
                  <option key={p.id} value={p.id} className="bg-[#0A0D1E] text-white">
                    {p.name}
                  </option>
                ))}
              </optgroup>
              {profiles.some(p => p.category === 'User') && (
                <optgroup label="USER CLONED VOICES">
                  {profiles.filter(p => p.category === 'User').map(p => (
                    <option key={p.id} value={p.id} className="bg-[#0A0D1E] text-amber-300">
                      ⭐ {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <button
            onClick={() => setActiveTab('clone_new')}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:brightness-110 text-black font-mono font-bold text-xs shadow-md shadow-cyan-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span>Clone New Voice</span>
          </button>
        </div>
      </div>

      {/* ACTIVE VOICE TELEMETRY STRIP */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#090D20] border border-[#1E2849] text-xs font-mono shadow-xl">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-bold text-sm">{activeProfile.name}</span>
            <span className="px-2 py-0.5 rounded-full text-[9px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              {activeProfile.vocalType}
            </span>
            <span className="text-[#64748B]">&bull;</span>
            <span className="text-emerald-400">Fundamental: {activeProfile.pitchCenterHz} Hz</span>
          </div>
          <p className="text-[11px] text-[#8E9BBE] leading-relaxed">
            {activeProfile.description}
          </p>
        </div>

        {/* Formant Resonance Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-[#050713] px-2.5 py-1.5 rounded-xl border border-[#17203A] text-center">
            <span className="text-[9px] text-[#64748B] block">F1 (Jaw)</span>
            <span className="text-pink-300 font-bold">{activeProfile.formants.f1} Hz</span>
          </div>
          <div className="bg-[#050713] px-2.5 py-1.5 rounded-xl border border-[#17203A] text-center">
            <span className="text-[9px] text-[#64748B] block">F2 (Tongue)</span>
            <span className="text-cyan-300 font-bold">{activeProfile.formants.f2} Hz</span>
          </div>
          <div className="bg-[#050713] px-2.5 py-1.5 rounded-xl border border-[#17203A] text-center">
            <span className="text-[9px] text-[#64748B] block">F3 (Tract)</span>
            <span className="text-purple-300 font-bold">{activeProfile.formants.f3} Hz</span>
          </div>
          <div className="bg-[#050713] px-2.5 py-1.5 rounded-xl border border-[#17203A] text-center">
            <span className="text-[9px] text-[#64748B] block">Vibrato</span>
            <span className="text-amber-300 font-bold">{activeProfile.vibratoRateHz} Hz</span>
          </div>

          {activeProfile.category === 'User' && (
            <button
              onClick={() => handleDeleteProfile(activeProfile.id, activeProfile.name)}
              className="p-2 rounded-xl bg-red-950/40 text-red-400 hover:bg-red-900/60 border border-red-800 transition-all cursor-pointer"
              title="Delete this cloned profile"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* PERFORMANCE MODE NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-[#1A2342] pb-2">
        <button
          onClick={() => setActiveTab('keyboard')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'keyboard'
              ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
              : 'text-[#7B86A8] hover:text-white hover:bg-[#12172F]'
          }`}
        >
          <Music size={14} />
          <span>Interactive Singing Keyboard</span>
        </button>

        <button
          onClick={() => setActiveTab('text_to_sing')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'text_to_sing'
              ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/20'
              : 'text-[#7B86A8] hover:text-white hover:bg-[#12172F]'
          }`}
        >
          <Sparkles size={14} />
          <span>Lyrics & Melody Synthesizer</span>
        </button>

        <button
          onClick={() => setActiveTab('clone_new')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'clone_new'
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
              : 'text-[#7B86A8] hover:text-white hover:bg-[#12172F]'
          }`}
        >
          <Mic size={14} />
          <span>Acoustic Cloner Studio</span>
        </button>
      </div>

      {/* MODE 1: INTERACTIVE SINGING KEYBOARD & PERFORMANCE */}
      {activeTab === 'keyboard' && (
        <div className="flex flex-col gap-5">
          {/* Controls Bar: Vowel Selection, Formant Shift, Octave */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-[#090D1E] border border-[#1E2849]">
            {/* Vowel Phonemes */}
            <div className="space-y-1.5">
              <span className="text-xs font-mono font-bold text-[#A0AEC0] uppercase block">
                Singing Vowel Phoneme:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {Object.keys(VOWEL_FORMANT_OFFSETS).map(v => (
                  <button
                    key={v}
                    onClick={() => setActiveVowel(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      activeVowel === v
                        ? 'bg-cyan-400 text-black shadow-md shadow-cyan-400/30'
                        : 'bg-[#050713] text-[#8E9BBE] hover:text-white border border-[#1A223C]'
                    }`}
                  >
                    [{v}]
                  </button>
                ))}
              </div>
            </div>

            {/* Formant Shift (Gender / Vocal Tract Length Morph) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono text-[#A0AEC0]">
                <span>Formant Shift (Tract Scale):</span>
                <span className="font-bold text-cyan-300">{formantShift.toFixed(2)}x</span>
              </div>
              <input 
                type="range" min="0.75" max="1.35" step="0.02"
                value={formantShift}
                onChange={e => setFormantShift(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-2 bg-[#141C31] rounded"
              />
              <div className="flex justify-between text-[9px] font-mono text-[#64748B]">
                <span>Deep / Monster (0.75x)</span>
                <span>Natural (1.0x)</span>
                <span>Bright / Anime (1.35x)</span>
              </div>
            </div>

            {/* Octave Transposition */}
            <div className="space-y-1.5">
              <span className="text-xs font-mono font-bold text-[#A0AEC0] uppercase block">
                Octave Transpose:
              </span>
              <div className="flex items-center gap-2">
                {[-1, 0, 1].map(oct => (
                  <button
                    key={oct}
                    onClick={() => setOctaveShift(oct)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      octaveShift === oct
                        ? 'bg-amber-400 text-black'
                        : 'bg-[#050713] text-[#8E9BBE] hover:text-white border border-[#1A223C]'
                    }`}
                  >
                    {oct === 0 ? 'Normal (0)' : oct > 0 ? `+${oct} Oct` : `${oct} Oct`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* VIRTUAL PIANO ROLL KEYBOARD */}
          <div className="p-4 rounded-2xl bg-[#080B1C] border border-[#1C2546] shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#8E9BBE] flex items-center gap-2">
                <Music size={14} className="text-cyan-400" />
                <span>Click & hold piano keys to sing in real time with the cloned voice:</span>
              </span>
              {activePlayingNote && (
                <span className="px-3 py-1 rounded-full text-xs font-mono font-black bg-cyan-500 text-black animate-pulse">
                  SINGING: {activePlayingNote} [{activeVowel}]
                </span>
              )}
            </div>

            {/* Keys Deck */}
            <div className="relative h-44 flex select-none overflow-x-auto pb-2">
              {PIANO_KEYS.map((key) => {
                const isActive = activePlayingNote === key.note;
                if (!key.isBlack) {
                  return (
                    <button
                      key={key.note}
                      onMouseDown={() => handleNoteMouseDown(key.freq, key.note)}
                      onMouseUp={handleNoteMouseUp}
                      onMouseLeave={handleNoteMouseUp}
                      onTouchStart={() => handleNoteMouseDown(key.freq, key.note)}
                      onTouchEnd={handleNoteMouseUp}
                      className={`relative flex-1 min-w-[36px] max-w-[50px] h-full rounded-b-lg border border-[#212948] transition-all flex flex-col justify-end items-center pb-3 cursor-pointer ${
                        isActive
                          ? 'bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.8)] translate-y-1'
                          : 'bg-white hover:bg-slate-100'
                      }`}
                    >
                      <span className={`text-[10px] font-mono font-bold ${isActive ? 'text-black' : 'text-slate-700'}`}>
                        {key.note}
                      </span>
                    </button>
                  );
                } else {
                  return (
                    <button
                      key={key.note}
                      onMouseDown={() => handleNoteMouseDown(key.freq, key.note)}
                      onMouseUp={handleNoteMouseUp}
                      onMouseLeave={handleNoteMouseUp}
                      onTouchStart={() => handleNoteMouseDown(key.freq, key.note)}
                      onTouchEnd={handleNoteMouseUp}
                      className={`absolute z-10 w-7 h-28 -ml-3.5 rounded-b-md transition-all flex flex-col justify-end items-center pb-2 cursor-pointer ${
                        isActive
                          ? 'bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.8)] translate-y-1'
                          : 'bg-[#0E1326] hover:bg-[#18203B] border border-[#26335C]'
                      }`}
                      style={{
                        left: `${(PIANO_KEYS.filter((k, idx) => !k.isBlack && idx < PIANO_KEYS.indexOf(key)).length / 15) * 100}%`
                      }}
                    >
                      <span className={`text-[8px] font-mono font-bold ${isActive ? 'text-black' : 'text-slate-400'}`}>
                        {key.note}
                      </span>
                    </button>
                  );
                }
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: LYRICS & MELODY PHRASE SYNTHESIZER */}
      {activeTab === 'text_to_sing' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Col: Lyrics & Preset Selector */}
          <div className="p-5 rounded-2xl bg-[#090D1E] border border-[#1E2849] flex flex-col gap-4">
            <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={16} className="text-purple-400" />
              <span>Phrase Composition Deck</span>
            </h4>

            {/* Preset Melodies */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#8E9BBE]">Melodic Phrase Preset:</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {PRESET_MELODIES.map((m, idx) => (
                  <button
                    key={m.name}
                    onClick={() => {
                      setSelectedMelodyIdx(idx);
                      setLyricsInput(m.lyrics);
                    }}
                    className={`p-2.5 rounded-xl border text-left font-mono transition-all cursor-pointer ${
                      selectedMelodyIdx === idx
                        ? 'bg-purple-950/60 border-purple-400 text-white shadow-md'
                        : 'bg-[#050713] border-[#18223E] text-[#7E88AA] hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-bold block">{m.name}</span>
                    <span className="text-[10px] text-[#64748B] block mt-0.5 truncate">{m.lyrics}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Lyrics Text Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#8E9BBE]">Lyrics / Sung Text:</label>
              <textarea 
                value={lyricsInput}
                onChange={e => setLyricsInput(e.target.value)}
                rows={2}
                placeholder="Type words to sing..."
                className="w-full p-3 rounded-xl bg-[#050713] border border-[#212948] text-white font-mono text-xs focus:border-purple-400 focus:outline-none"
              />
            </div>

            {/* Synthesize Button */}
            <button
              onClick={handleSynthesizePhrase}
              disabled={isSynthesizing}
              className={`w-full py-3 rounded-xl font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-xl cursor-pointer transition-all ${
                isSynthesizing
                  ? 'bg-purple-900 text-purple-300'
                  : 'bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500 text-white hover:brightness-110 shadow-purple-500/25'
              }`}
            >
              {isSynthesizing ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Synthesizing Cloned Voice Formants...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Synthesize Cloned Vocal Phrase Now</span>
                </>
              )}
            </button>
          </div>

          {/* Right Col: Audio Playback & DAW Actions */}
          <div className="p-5 rounded-2xl bg-[#090D1E] border border-[#1E2849] flex flex-col justify-between gap-5">
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <Volume2 size={16} className="text-cyan-400" />
                <span>Audition & DAW Routing</span>
              </h4>

              {renderedAudioBuffer ? (
                <div className="p-4 rounded-xl bg-[#050713] border border-[#17203A] space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-white font-bold">{activeProfile.name} Output</span>
                    <span className="text-emerald-300 font-bold">{renderedAudioBuffer.duration.toFixed(2)}s</span>
                  </div>

                  {/* Play / Pause button */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleTogglePlayRendered}
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md"
                    >
                      {isPlayingRendered ? <Square size={14} /> : <Play size={14} />}
                      <span>{isPlayingRendered ? 'Stop Playback' : 'Audition Cloned Vocal'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-xl bg-[#050713] border border-[#17203A] text-center text-xs font-mono text-[#64748B] space-y-2">
                  <WaveformIcon size={28} className="mx-auto text-[#26335C]" />
                  <p>No vocal phrase synthesized yet. Click "Synthesize Cloned Vocal Phrase" to generate audio.</p>
                </div>
              )}
            </div>

            {/* DAW Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-[#1A2342]">
              <button
                onClick={handleSendToDawTrack}
                disabled={!renderedAudioBuffer}
                className="w-full sm:flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 disabled:opacity-50 text-black font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer hover:brightness-110"
              >
                <Layers size={14} />
                <span>Send to Project DAW Track</span>
              </button>

              <button
                onClick={handleDownloadWav}
                disabled={!renderedAudioBuffer}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#141C33] hover:bg-[#1E294A] text-[#9AA5C4] hover:text-white border border-[#232F52] font-mono text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download size={14} />
                <span>Export WAV</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: CLONE NEW VOICE (MIC RECORDING & FILE UPLOAD) */}
      {activeTab === 'clone_new' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Method A: Microphone Live Recording */}
          <div className="p-5 rounded-2xl bg-[#090D1E] border border-[#1E2849] flex flex-col justify-between gap-5">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Mic size={18} className="text-red-400" />
                <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  Option 1: Microphone Live Recording
                </h4>
              </div>
              <p className="text-xs text-[#8E9BBE] font-mono">
                Sing or speak into your microphone for 3 to 10 seconds. The engine extracts formants, pitch center, and vibrato in under 100ms.
              </p>

              <div>
                <label className="text-xs font-mono text-[#8E9BBE] block mb-1">Cloned Voice Name:</label>
                <input 
                  type="text" 
                  value={clonedProfileName}
                  onChange={e => setClonedProfileName(e.target.value)}
                  placeholder="e.g. My Lead Vocal"
                  className="w-full p-2.5 rounded-xl bg-[#050713] border border-[#212948] text-amber-300 font-mono text-xs focus:outline-none"
                />
              </div>

              {/* Record Timer & Visual Pulse */}
              <div className="p-6 rounded-xl bg-[#050713] border border-[#17203A] flex flex-col items-center justify-center gap-3 text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                  isRecordingMic 
                    ? 'bg-red-500/20 border-2 border-red-500 animate-pulse shadow-[0_0_25px_rgba(239,68,68,0.5)]' 
                    : 'bg-[#0E1428] border border-[#202948]'
                }`}>
                  <Mic size={28} className={isRecordingMic ? 'text-red-400' : 'text-[#64748B]'} />
                </div>
                <span className="text-lg font-mono font-black text-white">
                  {isRecordingMic ? `RECORDING: 00:0${recordingSeconds}` : 'READY TO RECORD'}
                </span>
              </div>
            </div>

            <div className="pt-2">
              {!isRecordingMic ? (
                <button
                  onClick={handleStartMicRecord}
                  disabled={isAnalyzingAudio}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 hover:brightness-110 text-white font-mono font-bold text-xs shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Mic size={14} />
                  <span>Start Live Recording</span>
                </button>
              ) : (
                <button
                  onClick={handleStopMicRecord}
                  className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer animate-pulse"
                >
                  <Square size={14} />
                  <span>Stop & Extract Voice Profile ({recordingSeconds}s)</span>
                </button>
              )}
            </div>
          </div>

          {/* Method B: Audio File Upload */}
          <div className="p-5 rounded-2xl bg-[#090D1E] border border-[#1E2849] flex flex-col justify-between gap-5">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Upload size={18} className="text-cyan-400" />
                <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  Option 2: Audio File Upload
                </h4>
              </div>
              <p className="text-xs text-[#8E9BBE] font-mono">
                Upload any WAV, MP3, or OGG vocal stem or reference track to clone its vocal timbre.
              </p>

              <div 
                onClick={() => fileUploadInputRef.current?.click()}
                className="p-8 rounded-xl bg-[#050713] border-2 border-dashed border-[#232F52] hover:border-cyan-400 transition-all flex flex-col items-center justify-center gap-3 text-center cursor-pointer group"
              >
                <Upload size={32} className="text-[#64748B] group-hover:text-cyan-400 transition-colors" />
                <span className="text-xs font-mono text-white font-bold">
                  Click to select audio file (.wav, .mp3)
                </span>
                <span className="text-[10px] font-mono text-[#64748B]">
                  Processes instantly on your CPU
                </span>
                <input 
                  type="file" 
                  ref={fileUploadInputRef} 
                  accept="audio/*" 
                  onChange={handleFileUpload}
                  className="hidden" 
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#060814] border border-[#17203A] text-[11px] font-mono text-[#8E9BBE] space-y-1">
              <span className="text-white font-bold block">Low-Resource Guarantee:</span>
              <p>
                Unlike heavy neural models requiring 24GB VRAM GPU servers, this acoustic formant cloner runs with 0 GPU cost, zero telemetry, and 100% private in-browser analysis.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceCloner;
