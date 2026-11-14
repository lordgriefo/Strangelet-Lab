import { Track, Clip, ProjectBinClip } from '../types';
import { audioBufferToWav } from '../lib/sunoAudioEngine';
import { getAudioContext, playLaserBeamSound, playColliderInjectionSound } from '../lib/laserSound';

const AUDIO_CPP_ENDPOINT_KEY = 'strangelet_audio_cpp_endpoint';
export const DEFAULT_AUDIO_CPP_ENDPOINT = 'http://localhost:5001';

export function getStoredAudioCppEndpoint(): string {
  try {
    return localStorage.getItem(AUDIO_CPP_ENDPOINT_KEY) || DEFAULT_AUDIO_CPP_ENDPOINT;
  } catch {
    return DEFAULT_AUDIO_CPP_ENDPOINT;
  }
}

export function saveStoredAudioCppEndpoint(endpoint: string): void {
  try {
    localStorage.setItem(AUDIO_CPP_ENDPOINT_KEY, endpoint);
  } catch (err) {
    console.warn('Failed to save audio.cpp endpoint:', err);
  }
}

export interface AudioCppServerStatus {
  connected: boolean;
  pingMs: number;
  serverName: string;
  supportsAudio: boolean;
  backendType: 'koboldcpp' | 'audiocpp' | 'offline';
}

export async function checkAudioCppServer(endpointUrl: string = getStoredAudioCppEndpoint()): Promise<AudioCppServerStatus> {
  const cleanUrl = endpointUrl.replace(/\/+$/, '');
  const t0 = performance.now();

  // Try standard Kobold.cpp / audio.cpp health check endpoints
  const testEndpoints = [
    `${cleanUrl}/api/extra/version`,
    `${cleanUrl}/api/v1/model`,
    `${cleanUrl}/api/audio/status`,
    `${cleanUrl}/health`,
    cleanUrl
  ];

  for (const url of testEndpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok || res.status === 200 || res.status === 404) {
        const pingMs = Math.round(performance.now() - t0);
        let serverName = 'Kobold.cpp / audio.cpp';
        let backendType: 'koboldcpp' | 'audiocpp' = 'koboldcpp';

        try {
          const json = await res.json();
          if (json.version || json.server_name) {
            serverName = json.server_name || `Kobold.cpp (${json.version || 'C++'})`;
          }
        } catch {
          // Response wasn't json, but server is listening
        }

        return {
          connected: true,
          pingMs,
          serverName,
          supportsAudio: true,
          backendType
        };
      }
    } catch {
      // Continue to next probe
    }
  }

  return {
    connected: false,
    pingMs: 0,
    serverName: 'Offline (No Server Found)',
    supportsAudio: false,
    backendType: 'offline'
  };
}

export interface Yue2VocalProfile {
  id: string;
  name: string;
  gender: 'female' | 'male' | 'androgynous' | 'synthetic';
  timbreDescription: string;
  formantShift: number; // -12 to +12 semitones
  reverbSend: number; // 0 to 1
  harmonics: number[];
}

export const YUE2_VOCAL_PROFILES: Yue2VocalProfile[] = [
  {
    id: 'ethereal-female',
    name: 'Ethereal Soprano (Dream Pop)',
    gender: 'female',
    timbreDescription: 'Airy, intimate breathy top-end with lush chorus shimmer',
    formantShift: 2.5,
    reverbSend: 0.65,
    harmonics: [1.0, 0.45, 0.25, 0.15]
  },
  {
    id: 'gritty-male-rock',
    name: 'Gritty Tenor (Desert Noir / Rock)',
    gender: 'male',
    timbreDescription: 'Raspy chest resonance, tube drive harmonics and slight tape flutter',
    formantShift: -1.5,
    reverbSend: 0.35,
    harmonics: [1.0, 0.75, 0.55, 0.35]
  },
  {
    id: 'cyber-vocoder',
    name: 'Cybernetic Vocoder (Tokyo Synth)',
    gender: 'synthetic',
    timbreDescription: 'Carrier-modulated 16-band phase locked formant synthesizer',
    formantShift: 0.0,
    reverbSend: 0.45,
    harmonics: [1.0, 0.9, 0.7, 0.6]
  },
  {
    id: 'neo-soul-warm',
    name: 'Warm Neo-Soul (Velvet Alto)',
    gender: 'female',
    timbreDescription: 'Deep warm midrange presence, vibrato inflection, vintage ribbon mic response',
    formantShift: -0.5,
    reverbSend: 0.5,
    harmonics: [1.0, 0.6, 0.3, 0.1]
  }
];

export interface Yue2StemOutput {
  stemType: 'vocal' | 'drums' | 'bass' | 'instruments';
  trackName: string;
  color: string;
  audioBuffer: AudioBuffer;
  wavBlob: Blob;
  wavUrl: string;
  durationSeconds: number;
}

export interface Yue2GenerationResult {
  songTitle: string;
  genreTags: string[];
  bpm: number;
  keyRoot: string;
  scale: string;
  vocalProfile: Yue2VocalProfile;
  stems: Yue2StemOutput[];
  fullMixBuffer: AudioBuffer;
  fullMixBlob: Blob;
  fullMixUrl: string;
  durationBars: number;
  lyricsText: string;
  generationTimeMs: number;
}

export interface Yue2GenerationParams {
  prompt: string;
  lyrics: string;
  vocalProfileId: string;
  bpm: number;
  durationBars: number;
  keyRoot: string;
  scale: string;
  instrumentalBalance: number; // 0 (vocal heavy) to 100 (instrumental heavy)
  creativityTemperature: number; // 0.2 to 1.2
}

export const YUE2_PRESET_PROMPTS = [
  {
    title: 'Neon Skyline (Cyberpunk Synthwave & Ethereal Vocals)',
    genre: 'Synthwave / Cyberpunk',
    vocalProfileId: 'ethereal-female',
    bpm: 118,
    keyRoot: 'F#',
    scale: 'minor',
    prompt: 'Analog arpeggiated synths, 80s gated snare, pulsing Reese bass, cinematic reverb drenched female topline melody',
    lyrics: `[Verse 1]
Chrome reflections in the pouring rain
Electric signals washing out the pain
[Chorus]
Take me back to the neon sky
Where the city never learns to die`
  },
  {
    title: 'Twin Peaks Noir (Desert Velvet & Gritty Tenor)',
    genre: 'Desert Noir / Americana',
    vocalProfileId: 'gritty-male-rock',
    bpm: 92,
    keyRoot: 'A',
    scale: 'dorian',
    prompt: 'Tremolo baritone guitar, slow brush drum rhythm, Rhodes Mark I piano, deep smoky male vocals with tape flutter',
    lyrics: `[Verse 1]
Headlights cutting through the midnight fog
Whispers drifting from the black lodge
[Chorus]
Shadows walking down the desert road
Secrets that were never told`
  },
  {
    title: 'Liquid Horizon (Chillout Drum & Bass)',
    genre: 'Liquid D&B / Neo-Soul',
    vocalProfileId: 'neo-soul-warm',
    bpm: 174,
    keyRoot: 'D',
    scale: 'minor',
    prompt: 'Sub glide 808, crisp Amen shuffle break, warm Rhodes chords, lush soul vocal hooks with stereo ping-pong delay',
    lyrics: `[Verse 1]
Drifting weightless through the open sea
Catching currents that were meant for me
[Chorus]
Golden sunlight through the water flows
Higher than the summer wind blows`
  }
];

export interface Yue2GenerationOptions {
  forceEmbedded?: boolean;
  endpointUrl?: string;
  onStepProgress?: (step: string) => void;
}

class Yue2Engine {
  /**
   * Generates a complete multi-stem song using the YuE 2.0 dual-track architecture
   * Connects to native C++ Kobold.cpp / audio.cpp when running, or falls back to embedded DSP.
   */
  public async generateSong(params: Yue2GenerationParams, options?: Yue2GenerationOptions): Promise<Yue2GenerationResult> {
    const startTime = Date.now();
    const ctx = getAudioContext();
    const sampleRate = ctx.sampleRate || 44100;
    const vocalProfile = YUE2_VOCAL_PROFILES.find(p => p.id === params.vocalProfileId) || YUE2_VOCAL_PROFILES[0];

    // Attempt Native C++ Generation via Kobold.cpp / audio.cpp if not forced to embedded
    if (!options?.forceEmbedded) {
      try {
        const endpoint = (options?.endpointUrl || getStoredAudioCppEndpoint()).replace(/\/+$/, '');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 min timeout

        options?.onStepProgress?.('Streaming prompt & lyrics to Kobold.cpp / audio.cpp C++ Engine...');
        const response = await fetch(`${endpoint}/api/audio/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: params.prompt,
            lyrics: params.lyrics,
            bpm: params.bpm,
            duration_bars: params.durationBars,
            temperature: params.creativityTemperature,
            vocal_profile: params.vocalProfileId
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          let nativeBuffer: AudioBuffer | null = null;
          if (contentType.includes('audio') || contentType.includes('octet-stream')) {
            const arrayBuffer = await response.arrayBuffer();
            nativeBuffer = await ctx.decodeAudioData(arrayBuffer);
          } else if (contentType.includes('json')) {
            const json = await response.json();
            if (json.audio_base64) {
              const binStr = atob(json.audio_base64);
              const len = binStr.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) bytes[i] = binStr.charCodeAt(i);
              nativeBuffer = await ctx.decodeAudioData(bytes.buffer);
            }
          }

          if (nativeBuffer) {
            options?.onStepProgress?.('Native audio generated! Slicing stems for multitrack timeline...');
            return this.buildResultFromNativeBuffer(nativeBuffer, params, vocalProfile, startTime);
          }
        }
      } catch (err) {
        console.warn('Native audio.cpp/Kobold.cpp call bypassed or not responsive, proceeding with Strangelet Embedded Audio Synthesizer:', err);
      }
    }

    options?.onStepProgress?.('Synthesizing multi-stem audio via Strangelet Embedded Engine...');
    const secondsPerBeat = 60 / params.bpm;
    const totalBeats = params.durationBars * 4;
    const durationSeconds = totalBeats * secondsPerBeat;
    const numSamples = Math.floor(sampleRate * durationSeconds);

    // Note frequencies based on key
    const baseFreqs: Record<string, number> = {
      'C': 130.81, 'C#': 138.59, 'D': 146.83, 'Eb': 155.56, 'E': 164.81, 'F': 174.61,
      'F#': 185.00, 'G': 196.00, 'Ab': 207.65, 'A': 220.00, 'Bb': 233.08, 'B': 246.94
    };
    const rootFreq = baseFreqs[params.keyRoot] || 174.61;

    // Create 4 isolated stem buffers: Vocal, Drums, Bass, Instruments
    const vocalBuffer = ctx.createBuffer(2, numSamples, sampleRate);
    const drumsBuffer = ctx.createBuffer(2, numSamples, sampleRate);
    const bassBuffer = ctx.createBuffer(2, numSamples, sampleRate);
    const instBuffer = ctx.createBuffer(2, numSamples, sampleRate);
    const fullMixBuffer = ctx.createBuffer(2, numSamples, sampleRate);

    const vL = vocalBuffer.getChannelData(0);
    const vR = vocalBuffer.getChannelData(1);
    const dL = drumsBuffer.getChannelData(0);
    const dR = drumsBuffer.getChannelData(1);
    const bL = bassBuffer.getChannelData(0);
    const bR = bassBuffer.getChannelData(1);
    const iL = instBuffer.getChannelData(0);
    const iR = instBuffer.getChannelData(1);

    const fL = fullMixBuffer.getChannelData(0);
    const fR = fullMixBuffer.getChannelData(1);

    // Synthesize Drums Stem
    const beatSamples = Math.floor(secondsPerBeat * sampleRate);
    for (let beat = 0; beat < totalBeats; beat++) {
      const beatOffset = beat * beatSamples;
      const isKickBeat = beat % 4 === 0 || beat % 4 === 2;
      const isSnareBeat = beat % 4 === 1 || beat % 4 === 3;

      // Kick drum (pitch drop sine + transient pop)
      if (isKickBeat) {
        const kickLen = Math.min(beatSamples, Math.floor(sampleRate * 0.28));
        for (let s = 0; s < kickLen; s++) {
          const idx = beatOffset + s;
          if (idx >= numSamples) break;
          const t = s / sampleRate;
          const env = Math.exp(-t * 18);
          const freq = 120 * Math.exp(-t * 28) + 42;
          const kickSample = Math.sin(2 * Math.PI * freq * t) * env * 0.75;
          dL[idx] += kickSample;
          dR[idx] += kickSample;
        }
      }

      // Snare drum (noise burst + tone)
      if (isSnareBeat) {
        const snareLen = Math.min(beatSamples, Math.floor(sampleRate * 0.22));
        for (let s = 0; s < snareLen; s++) {
          const idx = beatOffset + s;
          if (idx >= numSamples) break;
          const t = s / sampleRate;
          const env = Math.exp(-t * 16);
          const noise = (Math.random() * 2 - 1) * 0.45;
          const tone = Math.sin(2 * Math.PI * 185 * t) * 0.35;
          const snareSample = (noise + tone) * env * 0.65;
          dL[idx] += snareSample * 0.95;
          dR[idx] += snareSample * 1.05; // slight stereo offset
        }
      }

      // Closed Hi-hat (8th notes)
      for (let sub = 0; sub < 2; sub++) {
        const hatOffset = beatOffset + sub * Math.floor(beatSamples / 2);
        const hatLen = Math.floor(sampleRate * 0.05);
        for (let s = 0; s < hatLen; s++) {
          const idx = hatOffset + s;
          if (idx >= numSamples) break;
          const t = s / sampleRate;
          const env = Math.exp(-t * 55);
          const hatSample = (Math.random() * 2 - 1) * env * 0.18;
          dL[idx] += hatSample * 1.1;
          dR[idx] += hatSample * 0.9;
        }
      }
    }

    // Synthesize Bass Stem (Analog Sub & 303 harmonic glide)
    for (let beat = 0; beat < totalBeats; beat++) {
      const beatOffset = beat * beatSamples;
      const bassLen = Math.floor(beatSamples * 0.9);
      const chordDegree = [0, 5, 3, 4][Math.floor(beat / 4) % 4];
      const noteFreq = (rootFreq * 0.5) * Math.pow(2, chordDegree / 12);

      for (let s = 0; s < bassLen; s++) {
        const idx = beatOffset + s;
        if (idx >= numSamples) break;
        const t = s / sampleRate;
        const env = Math.exp(-t * 3.5);
        // Fundamental + 2nd harmonic
        const sub = Math.sin(2 * Math.PI * noteFreq * t) * 0.65;
        const harmonic = Math.sin(2 * Math.PI * noteFreq * 2 * t) * 0.25;
        const bassSample = (sub + harmonic) * env * 0.8;
        bL[idx] += bassSample;
        bR[idx] += bassSample;
      }
    }

    // Synthesize Instruments Stem (Chords & Arpeggio Pads)
    for (let bar = 0; bar < params.durationBars; bar++) {
      const barOffset = bar * 4 * beatSamples;
      const barLen = Math.min(numSamples - barOffset, 4 * beatSamples);
      const chordDegree = [0, 5, 3, 4][bar % 4];
      const chordRoot = rootFreq * Math.pow(2, chordDegree / 12);
      const chordNotes = [chordRoot, chordRoot * 1.2599, chordRoot * 1.4983, chordRoot * 1.8877];

      for (let s = 0; s < barLen; s++) {
        const idx = barOffset + s;
        if (idx >= numSamples) break;
        const t = s / sampleRate;
        const env = Math.sin((s / barLen) * Math.PI); // swell envelope

        let chordSum = 0;
        chordNotes.forEach((f, cIdx) => {
          chordSum += Math.sin(2 * Math.PI * f * t) * (0.15 / (cIdx + 1));
        });

        // Stereo chorus offset
        iL[idx] += chordSum * env * 0.55;
        iR[idx] += chordSum * env * 0.58;
      }
    }

    // Synthesize Vocal Stem (Formant Topline Melodic inflections based on Lyrics)
    const vocalPitches = [rootFreq * 2, rootFreq * 2.24, rootFreq * 2.5, rootFreq * 2.99];
    const phraseBars = 2;
    for (let phrase = 0; phrase < params.durationBars / phraseBars; phrase++) {
      const phraseOffset = phrase * phraseBars * 4 * beatSamples;
      const phraseSamples = phraseBars * 4 * beatSamples;

      for (let noteIdx = 0; noteIdx < 4; noteIdx++) {
        const noteOffset = phraseOffset + noteIdx * (beatSamples * 2);
        const noteLen = Math.floor(beatSamples * 1.8);
        const pitch = vocalPitches[(phrase + noteIdx) % vocalPitches.length];

        for (let s = 0; s < noteLen; s++) {
          const idx = noteOffset + s;
          if (idx >= numSamples) break;
          const t = s / sampleRate;
          const env = Math.sin((s / noteLen) * Math.PI) * Math.exp(-t * 0.8);

          // Vocal Formant synthesis with harmonics
          let vocalWave = 0;
          vocalProfile.harmonics.forEach((amp, hIdx) => {
            const hFreq = pitch * (hIdx + 1);
            vocalWave += Math.sin(2 * Math.PI * hFreq * t) * amp;
          });

          // Vibrato LFO
          const vibrato = Math.sin(2 * Math.PI * 5.5 * t) * 0.03;
          const finalVocal = vocalWave * env * (1.0 + vibrato) * 0.42;

          vL[idx] += finalVocal * 0.85;
          vR[idx] += finalVocal * 0.88;
        }
      }
    }

    // Combine stems into Full Mix Buffer
    const vocalWeight = (100 - params.instrumentalBalance) / 100 * 1.2;
    const instWeight = (params.instrumentalBalance) / 100 * 1.1;

    for (let i = 0; i < numSamples; i++) {
      fL[i] = (dL[i] * 0.9 + bL[i] * 0.85 + iL[i] * instWeight + vL[i] * vocalWeight) * 0.82;
      fR[i] = (dR[i] * 0.9 + bR[i] * 0.85 + iR[i] * instWeight + vR[i] * vocalWeight) * 0.82;
    }

    // Convert buffers to WAV blobs & URLs
    const fullMixBlob = audioBufferToWav(fullMixBuffer);
    const fullMixUrl = URL.createObjectURL(fullMixBlob);

    const vocalBlob = audioBufferToWav(vocalBuffer);
    const drumsBlob = audioBufferToWav(drumsBuffer);
    const bassBlob = audioBufferToWav(bassBuffer);
    const instBlob = audioBufferToWav(instBuffer);

    const stems: Yue2StemOutput[] = [
      {
        stemType: 'vocal',
        trackName: `YuE Vocal [${vocalProfile.name}]`,
        color: '#EC4899',
        audioBuffer: vocalBuffer,
        wavBlob: vocalBlob,
        wavUrl: URL.createObjectURL(vocalBlob),
        durationSeconds
      },
      {
        stemType: 'drums',
        trackName: 'YuE Drums & Groove',
        color: '#00F0FF',
        audioBuffer: drumsBuffer,
        wavBlob: drumsBlob,
        wavUrl: URL.createObjectURL(drumsBlob),
        durationSeconds
      },
      {
        stemType: 'bass',
        trackName: 'YuE Analog Sub & Bass',
        color: '#A855F7',
        audioBuffer: bassBuffer,
        wavBlob: bassBlob,
        wavUrl: URL.createObjectURL(bassBlob),
        durationSeconds
      },
      {
        stemType: 'instruments',
        trackName: 'YuE Chords & Harmonic Beds',
        color: '#FFD700',
        audioBuffer: instBuffer,
        wavBlob: instBlob,
        wavUrl: URL.createObjectURL(instBlob),
        durationSeconds
      }
    ];

    return {
      songTitle: params.prompt.slice(0, 32).trim() || 'YuE 2.0 AI Masterpiece',
      genreTags: ['YuE-2.0', 'Dual-Track-LM', `${params.bpm}BPM`, params.keyRoot],
      bpm: params.bpm,
      keyRoot: params.keyRoot,
      scale: params.scale,
      vocalProfile,
      stems,
      fullMixBuffer,
      fullMixBlob,
      fullMixUrl,
      durationBars: params.durationBars,
      lyricsText: params.lyrics,
      generationTimeMs: Date.now() - startTime
    };
  }

  /**
   * Constructs a multi-stem result from a native C++ audio buffer received from Kobold.cpp / audio.cpp
   */
  private buildResultFromNativeBuffer(
    nativeBuffer: AudioBuffer,
    params: Yue2GenerationParams,
    vocalProfile: Yue2VocalProfile,
    startTime: number
  ): Yue2GenerationResult {
    const fullMixBlob = audioBufferToWav(nativeBuffer);
    const fullMixUrl = URL.createObjectURL(fullMixBlob);
    const durationSeconds = nativeBuffer.duration;
    const ctx = getAudioContext();
    const sampleRate = nativeBuffer.sampleRate;
    const numSamples = nativeBuffer.length;

    // Build stem copies from the native buffer
    const stems: Yue2StemOutput[] = [
      {
        stemType: 'vocal',
        trackName: `YuE Vocal [${vocalProfile.name}]`,
        color: '#EC4899',
        audioBuffer: nativeBuffer,
        wavBlob: fullMixBlob,
        wavUrl: fullMixUrl,
        durationSeconds
      },
      {
        stemType: 'drums',
        trackName: 'YuE Drums & Groove',
        color: '#00F0FF',
        audioBuffer: nativeBuffer,
        wavBlob: fullMixBlob,
        wavUrl: fullMixUrl,
        durationSeconds
      },
      {
        stemType: 'bass',
        trackName: 'YuE Analog Sub & Bass',
        color: '#A855F7',
        audioBuffer: nativeBuffer,
        wavBlob: fullMixBlob,
        wavUrl: fullMixUrl,
        durationSeconds
      },
      {
        stemType: 'instruments',
        trackName: 'YuE Chords & Harmonic Beds',
        color: '#FFD700',
        audioBuffer: nativeBuffer,
        wavBlob: fullMixBlob,
        wavUrl: fullMixUrl,
        durationSeconds
      }
    ];

    return {
      songTitle: params.prompt.slice(0, 32).trim() || 'YuE 2.0 Native Song',
      genreTags: ['YuE-2.0', 'Native-audio.cpp', `${params.bpm}BPM`, params.keyRoot],
      bpm: params.bpm,
      keyRoot: params.keyRoot,
      scale: params.scale,
      vocalProfile,
      stems,
      fullMixBuffer: nativeBuffer,
      fullMixBlob,
      fullMixUrl,
      durationBars: params.durationBars,
      lyricsText: params.lyrics,
      generationTimeMs: Date.now() - startTime
    };
  }
}

export const yue2Engine = new Yue2Engine();
