import { 
  AceStepGenerationConfig, 
  AceStepLoopResult, 
  AceStepStemType,
  AceStepSongBedConfig,
  AceStepSongBedResult
} from '../types';
import { audioBufferToWav } from '../lib/sunoAudioEngine';
import { getAudioContext } from '../lib/laserSound';

export const NOTE_FREQUENCIES: Record<string, number> = {
  'C': 130.81,
  'C#': 138.59,
  'Db': 138.59,
  'D': 146.83,
  'D#': 155.56,
  'Eb': 155.56,
  'E': 164.81,
  'F': 174.61,
  'F#': 185.00,
  'Gb': 185.00,
  'G': 196.00,
  'G#': 207.65,
  'Ab': 207.65,
  'A': 220.00,
  'A#': 233.08,
  'Bb': 233.08,
  'B': 246.94
};

export const SCALE_INTERVALS: Record<string, number[]> = {
  'minor': [0, 3, 7, 10, 12, 15, 19],
  'major': [0, 4, 7, 11, 12, 16, 19],
  'dorian': [0, 3, 7, 9, 12, 15, 17],
  'phrygian': [0, 1, 7, 8, 12, 13, 19]
};

export const STEM_COLORS: Record<AceStepStemType, string> = {
  'full_loop': '#FFD700',
  'drums': '#00F0FF',
  'bass': '#EC4899',
  'lead': '#A855F7',
  'pad': '#10B981',
  'vocal_chop': '#F59E0B'
};

export const ACESTEP_LOOP_PRESETS: {
  title: string;
  stemType: AceStepStemType;
  prompt: string;
  durationBars: number;
  keyRoot: string;
  scale: 'minor' | 'major' | 'dorian' | 'phrygian';
}[] = [
  {
    title: 'Cyberpunk 303 Rolling Acid Bass',
    stemType: 'bass',
    prompt: 'Driving 16th-note Roland TB-303 square wave acid bassline with resonant low-pass filter squelch, accent envelope, analog drive',
    durationBars: 4,
    keyRoot: 'F#',
    scale: 'minor'
  },
  {
    title: '90s UK Garage 2-Step Shuffle',
    stemType: 'drums',
    prompt: 'Syncopated UK garage 2-step drum break, crisp open hi-hat swing, punchy 909 kick, snappy rimshot clap with vinyl crackle',
    durationBars: 4,
    keyRoot: 'C',
    scale: 'minor'
  },
  {
    title: 'Shoegaze Mellotron Dream Pad',
    stemType: 'pad',
    prompt: 'Warm vintage tape strings, decaying Mellotron choir pad, cavernous stereo shimmer reverb, gentle cassette wow and flutter',
    durationBars: 8,
    keyRoot: 'D',
    scale: 'dorian'
  },
  {
    title: 'Liquid D&B Reese Bass & Sub',
    stemType: 'bass',
    prompt: 'Detuned dual-sawtooth Reese bass glide, deep 808 sub harmonic bed, subtle stereo chorus, rolling motion',
    durationBars: 4,
    keyRoot: 'F',
    scale: 'minor'
  },
  {
    title: 'Neo-Tokyo Synthwave Arp Lead',
    stemType: 'lead',
    prompt: 'Bright plucked analog synth arpeggio, Roland Juno-106 chorus, stereo ping-pong delay, neon melodic hook',
    durationBars: 4,
    keyRoot: 'A',
    scale: 'minor'
  },
  {
    title: 'Soulful Vocal Micro-Chops',
    stemType: 'vocal_chop',
    prompt: 'Rhythmic pitched vocal chops, formant-shifted female soul vocal phrases, vintage tape slapback delay, sidechain pumping',
    durationBars: 4,
    keyRoot: 'G',
    scale: 'major'
  },
  {
    title: 'Trip Hop Midnight Downtempo Groove',
    stemType: 'full_loop',
    prompt: 'Smoky Bristol trip hop full groove: dusty acoustic drum breaks, deep upright bass pluck, detuned Rhodes piano chords, vinyl surface noise',
    durationBars: 8,
    keyRoot: 'C',
    scale: 'minor'
  }
];

export const DEFAULT_COMFYUI_ENDPOINT = 'http://127.0.0.1:8188';
const COMFY_STORAGE_KEY = 'strangelet_acestep_comfyui_config_v1';

export interface AceStepComfyConfig {
  enabled: boolean;
  endpointUrl: string;
  checkpointName: string;
  pollIntervalMs: number;
  timeoutMs: number;
}

export interface AceStepComfyConnectionStatus {
  online: boolean;
  endpointUrl: string;
  deviceName?: string;
  vramFreeMb?: number;
  comfyVersion?: string;
  queueRemaining?: number;
  checkedAt: number;
  error?: string;
}

export interface AceStepComfyProgress {
  phase:
    | 'connecting'
    | 'queued'
    | 'sampling'
    | 'downloading'
    | 'decoding'
    | 'fallback_synth'
    | 'complete';
  message: string;
  progressPercent: number;
  promptId?: string;
  usedFallback?: boolean;
  backend: 'comfyui' | 'algorithmic_synth';
}

export interface AceStepGenerateOptions {
  comfyConfig?: Partial<AceStepComfyConfig>;
  onProgress?: (progress: AceStepComfyProgress) => void;
  signal?: AbortSignal;
}

interface ComfyHistoryAudioFile {
  filename: string;
  subfolder?: string;
  type?: string;
}

export function normalizeComfyEndpoint(url?: string): string {
  const raw = (url || DEFAULT_COMFYUI_ENDPOINT).trim();
  if (!raw) return DEFAULT_COMFYUI_ENDPOINT;
  return raw.replace(/\/+$/, '');
}

export function getComfyUiConfig(): AceStepComfyConfig {
  try {
    const raw = localStorage.getItem(COMFY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        enabled: Boolean(parsed.enabled),
        endpointUrl: normalizeComfyEndpoint(parsed.endpointUrl),
        checkpointName: parsed.checkpointName || 'acestep_v1.5_q8_0.gguf',
        pollIntervalMs: Number(parsed.pollIntervalMs) || 800,
        timeoutMs: Number(parsed.timeoutMs) || 90000
      };
    }
  } catch (e) {
    console.warn('Failed to parse saved ComfyUI config:', e);
  }
  return {
    enabled: false,
    endpointUrl: DEFAULT_COMFYUI_ENDPOINT,
    checkpointName: 'acestep_v1.5_q8_0.gguf',
    pollIntervalMs: 800,
    timeoutMs: 90000
  };
}

export function saveComfyUiConfig(config: AceStepComfyConfig): AceStepComfyConfig {
  const normalized: AceStepComfyConfig = {
    enabled: Boolean(config.enabled),
    endpointUrl: normalizeComfyEndpoint(config.endpointUrl),
    checkpointName: config.checkpointName?.trim() || 'acestep_v1.5_q8_0.gguf',
    pollIntervalMs: Math.max(300, Number(config.pollIntervalMs) || 800),
    timeoutMs: Math.max(5000, Number(config.timeoutMs) || 90000)
  };
  try {
    localStorage.setItem(COMFY_STORAGE_KEY, JSON.stringify(normalized));
  } catch (e) {
    console.warn('Failed to persist ComfyUI config:', e);
  }
  return normalized;
}

/**
 * Checks whether a local ComfyUI API server is reachable at the configured endpoint.
 */
export async function checkComfyUiConnection(
  endpointUrl?: string
): Promise<AceStepComfyConnectionStatus> {
  const baseUrl = normalizeComfyEndpoint(endpointUrl);
  const checkedAt = Date.now();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${baseUrl}/system_stats`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!res.ok) {
      return {
        online: false,
        endpointUrl: baseUrl,
        checkedAt,
        error: `HTTP ${res.status} from ComfyUI`
      };
    }

    const stats = await res.json().catch(() => ({}));
    const firstDevice = Array.isArray(stats?.devices) ? stats.devices[0] : undefined;
    const vramFreeBytes = typeof firstDevice?.vram_free === 'number' ? firstDevice.vram_free : undefined;

    let queueRemaining: number | undefined;
    try {
      const qCtrl = new AbortController();
      const qTimer = setTimeout(() => qCtrl.abort(), 1500);
      const qRes = await fetch(`${baseUrl}/queue`, { signal: qCtrl.signal });
      clearTimeout(qTimer);
      if (qRes.ok) {
        const qData = await qRes.json();
        const running = Array.isArray(qData?.queue_running) ? qData.queue_running.length : 0;
        const pending = Array.isArray(qData?.queue_pending) ? qData.queue_pending.length : 0;
        queueRemaining = running + pending;
      }
    } catch {
      // Non-fatal queue check failure
    }

    return {
      online: true,
      endpointUrl: baseUrl,
      deviceName: firstDevice?.name || 'Local Compute Device',
      vramFreeMb: vramFreeBytes ? Math.round(vramFreeBytes / (1024 * 1024)) : undefined,
      comfyVersion: stats?.system?.comfyui_version,
      queueRemaining,
      checkedAt
    };
  } catch (err: any) {
    return {
      online: false,
      endpointUrl: baseUrl,
      checkedAt,
      error: err?.name === 'AbortError'
        ? 'Connection timed out (ComfyUI offline)'
        : (err?.message || 'ComfyUI unreachable')
    };
  }
}

/**
 * Builds an ACE-Step 1.5 ComfyUI workflow graph payload for POST /prompt.
 * Encodes prompt, BPM, duration bars, duration seconds, key/scale, and stem target.
 */
export function buildAceStepComfyWorkflow(
  config: AceStepGenerationConfig,
  durationSeconds: number,
  checkpointName = 'acestep_v1.5_q8_0.gguf'
): Record<string, any> {
  const seed = config.seed ?? Math.floor(Math.random() * 2147483647);
  const stemTagMap: Record<AceStepStemType, string> = {
    full_loop: 'full arrangement, drums, bass, chords, melody, bar-synced loop',
    drums: 'isolated drums, percussion loop, crisp transients, no bass, no melody',
    bass: 'isolated bassline, sub 808, mono low-end groove, no drums, no vocals',
    lead: 'isolated synth lead, melodic hook, arpeggio, no drums, no bass',
    pad: 'isolated ambient pad, warm chords, atmospheric texture, no drums',
    vocal_chop: 'isolated rhythmic vocal chops, formant phrases, no drums, no bass'
  };

  const formattedTags = [
    stemTagMap[config.stemType] || config.stemType,
    `${config.bpm} bpm`,
    `${config.durationBars} bars`,
    `${config.keyRoot} ${config.scale}`,
    config.useTapeWarmth !== false ? 'analog tape saturation' : 'clean digital studio'
  ].join(', ');

  return {
    '1': {
      class_type: 'ACEStepCheckpointLoader',
      inputs: {
        ckpt_name: checkpointName
      }
    },
    '2': {
      class_type: 'ACEStepConditioning',
      inputs: {
        model: ['1', 0],
        prompt: config.prompt,
        tags: formattedTags,
        bpm: config.bpm,
        duration_bars: config.durationBars,
        duration_seconds: durationSeconds,
        stem_target: config.stemType,
        key_root: config.keyRoot,
        scale: config.scale
      }
    },
    '3': {
      class_type: 'ACEStepSampler',
      inputs: {
        model: ['1', 0],
        positive: ['2', 0],
        latent_audio: ['2', 1],
        seed,
        steps: config.diffusionSteps,
        cfg: config.guidanceScale,
        sampler_name: 'euler',
        scheduler: 'normal',
        denoise: 1.0
      }
    },
    '4': {
      class_type: 'ACEStepVAEDecodeAudio',
      inputs: {
        samples: ['3', 0],
        vae: ['1', 2]
      }
    },
    '5': {
      class_type: 'SaveAudio',
      inputs: {
        audio: ['4', 0],
        filename_prefix: `Strangelet_AceStep_${config.stemType}_${config.bpm}bpm_${config.durationBars}bar`
      }
    }
  };
}

function extractAudioFileFromComfyOutputs(outputs: Record<string, any> | undefined): ComfyHistoryAudioFile | null {
  if (!outputs || typeof outputs !== 'object') return null;

  for (const nodeKey of Object.keys(outputs)) {
    const nodeOut = outputs[nodeKey];
    if (!nodeOut || typeof nodeOut !== 'object') continue;

    const candidateLists = [nodeOut.audio, nodeOut.audios, nodeOut.files, nodeOut.gifs];
    for (const list of candidateLists) {
      if (!Array.isArray(list)) continue;
      for (const item of list) {
        if (item && typeof item.filename === 'string') {
          const lower = item.filename.toLowerCase();
          if (
            list === nodeOut.audio ||
            list === nodeOut.audios ||
            /\.(wav|mp3|flac|ogg|aac|m4a|opus)$/.test(lower)
          ) {
            return {
              filename: item.filename,
              subfolder: item.subfolder || '',
              type: item.type || 'output'
            };
          }
        }
      }
    }
  }
  return null;
}

function computeWaveformSnippet(channelData: Float32Array, bins = 64): number[] {
  const snippet: number[] = [];
  const total = channelData.length;
  if (total === 0) return Array(bins).fill(0.1);
  const step = Math.max(1, Math.floor(total / bins));

  for (let i = 0; i < total && snippet.length < bins; i += step) {
    let peak = 0;
    const end = Math.min(total, i + step);
    for (let j = i; j < end; j++) {
      const v = Math.abs(channelData[j]);
      if (v > peak) peak = v;
    }
    snippet.push(Number(Math.min(1, peak).toFixed(3)));
  }
  while (snippet.length < bins) {
    snippet.push(0.08);
  }
  return snippet;
}

function sleepWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Posts a generation request to local ComfyUI (/prompt), polls /history/{prompt_id}
 * until the audio output is ready, downloads the rendered audio from /view, and
 * decodes it into a Web Audio AudioBuffer ready for Strangelet Lab's tracks.
 */
async function generateViaComfyUi(
  config: AceStepGenerationConfig,
  comfyConfig: AceStepComfyConfig,
  onProgress?: (progress: AceStepComfyProgress) => void,
  signal?: AbortSignal
): Promise<AceStepLoopResult> {
  const baseUrl = normalizeComfyEndpoint(comfyConfig.endpointUrl);
  const secondsPerBar = (60 / Math.max(40, Math.min(220, config.bpm))) * 4;
  const targetDurationSeconds = Number((secondsPerBar * config.durationBars).toFixed(3));
  const clientId = `strangelet-lab-${Date.now()}`;

  onProgress?.({
    phase: 'connecting',
    message: `Posting ${config.stemType.toUpperCase()} (${config.durationBars} bars @ ${config.bpm} BPM) to ${baseUrl}/prompt...`,
    progressPercent: 10,
    backend: 'comfyui'
  });

  const workflow = buildAceStepComfyWorkflow(
    config,
    targetDurationSeconds,
    comfyConfig.checkpointName
  );

  // 1. POST to /prompt
  const postController = new AbortController();
  const postTimeout = setTimeout(() => postController.abort(), 5000);
  if (signal) {
    signal.addEventListener('abort', () => postController.abort(), { once: true });
  }

  let promptId = '';
  try {
    const promptRes = await fetch(`${baseUrl}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        prompt: workflow,
        extra_data: {
          strangelet_acestep: {
            prompt: config.prompt,
            bpm: config.bpm,
            durationBars: config.durationBars,
            durationSeconds: targetDurationSeconds,
            stemTarget: config.stemType,
            keyRoot: config.keyRoot,
            scale: config.scale
          }
        }
      }),
      signal: postController.signal
    });
    clearTimeout(postTimeout);

    if (!promptRes.ok) {
      const errText = await promptRes.text().catch(() => '');
      throw new Error(`ComfyUI /prompt returned ${promptRes.status}${errText ? `: ${errText.slice(0, 120)}` : ''}`);
    }

    const promptData = await promptRes.json();
    if (!promptData?.prompt_id) {
      throw new Error('ComfyUI /prompt response missing prompt_id');
    }
    promptId = String(promptData.prompt_id);
  } catch (err) {
    clearTimeout(postTimeout);
    throw err;
  }

  onProgress?.({
    phase: 'queued',
    message: `Job queued on ComfyUI (ID: ${promptId.slice(0, 8)}). Polling /history...`,
    progressPercent: 22,
    promptId,
    backend: 'comfyui'
  });

  // 2. Poll /history/{promptId}
  const startedAt = Date.now();
  const pollInterval = Math.max(300, comfyConfig.pollIntervalMs || 800);
  const timeoutMs = Math.max(5000, comfyConfig.timeoutMs || 90000);
  let audioFile: ComfyHistoryAudioFile | null = null;
  let pollAttempt = 0;

  while (Date.now() - startedAt < timeoutMs) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    pollAttempt += 1;
    const elapsedRatio = Math.min(1, (Date.now() - startedAt) / Math.min(timeoutMs, 25000));
    const estProgress = Math.min(82, Math.round(25 + elapsedRatio * 55));

    try {
      const histRes = await fetch(`${baseUrl}/history/${encodeURIComponent(promptId)}`, {
        method: 'GET',
        signal
      });
      if (histRes.ok) {
        const histJson = await histRes.json();
        const entry = histJson?.[promptId];

        if (entry) {
          if (entry.status?.status_str === 'error') {
            throw new Error('ComfyUI reported workflow execution error');
          }

          const extracted = extractAudioFileFromComfyOutputs(entry.outputs);
          if (extracted) {
            audioFile = extracted;
            break;
          }

          if (entry.status?.completed === true) {
            throw new Error('ComfyUI finished prompt without an audio output file');
          }
        }
      }
    } catch (pollErr: any) {
      if (pollErr?.name === 'AbortError') throw pollErr;
      if (pollErr?.message?.includes('ComfyUI')) throw pollErr;
    }

    onProgress?.({
      phase: 'sampling',
      message: `Polling ComfyUI /history (${pollAttempt}) — rendering ${config.stemType} via ACE-Step 1.5...`,
      progressPercent: estProgress,
      promptId,
      backend: 'comfyui'
    });

    await sleepWithAbort(pollInterval, signal);
  }

  if (!audioFile) {
    throw new Error(`ComfyUI /history polling timed out after ${Math.round(timeoutMs / 1000)}s`);
  }

  // 3. Download rendered audio buffer from /view
  onProgress?.({
    phase: 'downloading',
    message: `Downloading rendered audio "${audioFile.filename}" from ComfyUI...`,
    progressPercent: 88,
    promptId,
    backend: 'comfyui'
  });

  const viewParams = new URLSearchParams({
    filename: audioFile.filename,
    subfolder: audioFile.subfolder || '',
    type: audioFile.type || 'output'
  });
  const viewRes = await fetch(`${baseUrl}/view?${viewParams.toString()}`, {
    method: 'GET',
    signal
  });
  if (!viewRes.ok) {
    throw new Error(`Failed to download ComfyUI audio (${viewRes.status})`);
  }

  const rawArrayBuffer = await viewRes.arrayBuffer();
  const mimeType = viewRes.headers.get('content-type') || 'audio/wav';
  const audioBlob = new Blob([rawArrayBuffer], { type: mimeType });

  // 4. Decode directly into Web Audio AudioBuffer for Strangelet Lab tracks
  onProgress?.({
    phase: 'decoding',
    message: 'Decoding ComfyUI audio buffer into Strangelet Lab tracks...',
    progressPercent: 95,
    promptId,
    backend: 'comfyui'
  });

  const ctx = getAudioContext();
  const decodedBuffer = await ctx.decodeAudioData(rawArrayBuffer.slice(0));
  const durationSeconds = Number((decodedBuffer.duration || targetDurationSeconds).toFixed(3));
  const waveformSnippet = computeWaveformSnippet(decodedBuffer.getChannelData(0), 64);

  // Convert to clean WAV URL so downstream Mixer / Track players can loop reliably
  const wavBlob = mimeType.includes('wav') ? audioBlob : audioBufferToWav(decodedBuffer);
  const audioUrl = URL.createObjectURL(wavBlob);
  const loopName = `ComfyUI_AceStep_${config.stemType.toUpperCase()}_${config.keyRoot}${config.scale}_${config.durationBars}bar_${config.bpm}bpm`;

  onProgress?.({
    phase: 'complete',
    message: `ComfyUI rendered "${audioFile.filename}" (${durationSeconds}s) ready for tracks!`,
    progressPercent: 100,
    promptId,
    usedFallback: false,
    backend: 'comfyui'
  });

  return {
    id: `acestep-comfy-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: loopName,
    prompt: config.prompt,
    stemType: config.stemType,
    durationBars: config.durationBars,
    durationSeconds,
    bpm: config.bpm,
    key: `${config.keyRoot} ${config.scale}`,
    audioBuffer: decodedBuffer,
    audioUrl,
    waveformSnippet,
    color: STEM_COLORS[config.stemType] || '#00F0FF',
    createdAt: Date.now(),
    engineSource: 'comfyui',
    comfyPromptId: promptId,
    usedFallback: false
  };
}

/**
 * Built-in zero-config algorithmic synthesizer (instant bar-synced DSP synthesis).
 * Used directly when ComfyUI is toggled off, or as an instant seamless fallback
 * whenever the local ComfyUI endpoint is offline or unreachable.
 */
export async function synthesizeAlgorithmicLoop(
  config: AceStepGenerationConfig,
  usedFallback = false
): Promise<AceStepLoopResult> {
  const ctx = getAudioContext();
  const sampleRate = ctx.sampleRate || 44100;

  // Exact bar calculation: 1 bar = (60 / BPM) * 4 seconds
  const secondsPerBar = (60 / Math.max(40, Math.min(220, config.bpm))) * 4;
  const durationSeconds = Number((secondsPerBar * config.durationBars).toFixed(3));
  const totalSamples = Math.floor(sampleRate * durationSeconds);

  const audioBuffer = ctx.createBuffer(2, totalSamples, sampleRate);
  const left = audioBuffer.getChannelData(0);
  const right = audioBuffer.getChannelData(1);

  const rootFreq = NOTE_FREQUENCIES[config.keyRoot] || 130.81;
  const intervals = SCALE_INTERVALS[config.scale] || SCALE_INTERVALS.minor;
  const beatDuration = 60 / config.bpm;

  let maxPeak = 0.0001;

  // Synthesis Loop
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const currentBeat = (t / beatDuration);
    const beatFraction = currentBeat % 1;

    let sigL = 0;
    let sigR = 0;

    // --- 1. DRUMS SYNTHESIS ---
    if (config.stemType === 'drums' || config.stemType === 'full_loop') {
      // Kick: on beats 0, 1, 2, 3 or syncopated
      const isKickBeat = (Math.floor(currentBeat) % 2 === 0) || (currentBeat % 4 === 2.5);
      if (isKickBeat && beatFraction < 0.16) {
        const kEnv = Math.exp(-beatFraction * 36);
        const kPitch = 48 + 110 * Math.exp(-beatFraction * 50);
        const kick = Math.sin(2 * Math.PI * kPitch * beatFraction) * 0.38 * kEnv;
        sigL += kick;
        sigR += kick;
      }

      // Snare: on beats 1 and 3 (or 2 and 4 in standard 4/4)
      const isSnare = (Math.floor(currentBeat) % 4 === 1) || (Math.floor(currentBeat) % 4 === 3);
      if (isSnare && beatFraction < 0.18) {
        const sEnv = Math.exp(-beatFraction * 24);
        const sTone = Math.sin(2 * Math.PI * 185 * beatFraction) * 0.18 * sEnv;
        const sNoise = (Math.random() - 0.5) * 0.22 * sEnv;
        sigL += sTone + sNoise;
        sigR += sTone + sNoise * 0.9;
      }

      // Hi-Hats: 16th notes with velocity swing
      const sixteenthFraction = (currentBeat * 4) % 1;
      if (sixteenthFraction < 0.04) {
        const hEnv = Math.exp(-sixteenthFraction * 90);
        const hNoise = (Math.random() - 0.5) * 0.08 * hEnv;
        sigL += hNoise;
        sigR += hNoise * 1.1;
      }
    }

    // --- 2. BASSLINE SYNTHESIS ---
    if (config.stemType === 'bass' || config.stemType === 'full_loop') {
      const noteIdx = Math.floor(currentBeat * 2) % intervals.length;
      const semitone = intervals[noteIdx];
      const bassFreq = (rootFreq / 2) * Math.pow(2, semitone / 12);

      const noteFraction = (currentBeat * 2) % 1;
      const bassEnv = Math.exp(-noteFraction * 4.5);

      // Acid 303 Resonance or Deep Sub
      const filterMod = 1.0 + Math.sin(t * 3) * 0.3;
      const bassSub = Math.sin(2 * Math.PI * bassFreq * t) * 0.28 * bassEnv;
      const bassOvertone = Math.sin(2 * Math.PI * bassFreq * 2 * t) * 0.12 * bassEnv * filterMod;

      sigL += bassSub + bassOvertone * 0.9;
      sigR += bassSub + bassOvertone * 1.1;
    }

    // --- 3. MELODIC LEAD & ARPEGGIATOR ---
    if (config.stemType === 'lead' || config.stemType === 'full_loop') {
      const arpStep = Math.floor(currentBeat * 4) % intervals.length;
      const semitone = intervals[arpStep];
      const leadFreq = (rootFreq * 2) * Math.pow(2, semitone / 12);
      const arpEnv = Math.exp(-((currentBeat * 4) % 1) * 8);

      const panPan = Math.sin(t * 2);
      const leadWave = (
        Math.sin(2 * Math.PI * leadFreq * t) * 0.16 +
        Math.sin(2 * Math.PI * leadFreq * 1.5 * t) * 0.08
      ) * arpEnv;

      sigL += leadWave * (1 - panPan * 0.4);
      sigR += leadWave * (1 + panPan * 0.4);
    }

    // --- 4. ATMOSPHERIC PAD & MELLOTRON STRINGS ---
    if (config.stemType === 'pad' || config.stemType === 'full_loop') {
      const chordRoot = rootFreq;
      const chordThird = rootFreq * Math.pow(2, (intervals[1] || 3) / 12);
      const chordFifth = rootFreq * Math.pow(2, (intervals[2] || 7) / 12);
      const chordOctave = rootFreq * 2;

      const padMod = 0.5 + 0.5 * Math.sin(t * 0.5);
      const padL = (
        Math.sin(2 * Math.PI * chordRoot * t) * 0.07 +
        Math.sin(2 * Math.PI * chordThird * t + 0.2) * 0.06 +
        Math.sin(2 * Math.PI * chordFifth * t + 0.4) * 0.06
      ) * padMod;

      const padR = (
        Math.sin(2 * Math.PI * chordRoot * 1.003 * t) * 0.07 +
        Math.sin(2 * Math.PI * chordThird * 0.997 * t + 0.3) * 0.06 +
        Math.sin(2 * Math.PI * chordOctave * t + 0.5) * 0.05
      ) * padMod;

      sigL += padL;
      sigR += padR;
    }

    // --- 5. VOCAL CHOP LOOP ---
    if (config.stemType === 'vocal_chop') {
      const chopBeat = (currentBeat % 2);
      const chopEnv = Math.exp(-(chopBeat % 0.5) * 12);
      const chopSemitone = intervals[Math.floor(currentBeat * 2) % intervals.length];
      const chopFreq = (rootFreq * 2.5) * Math.pow(2, chopSemitone / 12);

      // Formant synthesis emulation
      const formant1 = Math.sin(2 * Math.PI * chopFreq * t) * 0.22;
      const formant2 = Math.sin(2 * Math.PI * (chopFreq * 2.2) * t) * 0.12;
      const chopSig = (formant1 + formant2) * chopEnv;

      sigL += chopSig * 0.9;
      sigR += chopSig * 1.1;
    }

    // Gentle Tape Saturation
    if (config.useTapeWarmth !== false) {
      sigL = Math.tanh(sigL * 1.15) / 1.1;
      sigR = Math.tanh(sigR * 1.15) / 1.1;
    }

    left[i] = sigL;
    right[i] = sigR;

    const absL = Math.abs(sigL);
    const absR = Math.abs(sigR);
    if (absL > maxPeak) maxPeak = absL;
    if (absR > maxPeak) maxPeak = absR;
  }

  // Headroom normalization to -3.0 dBFS (0.71 peak)
  const normGain = maxPeak > 0 ? (0.71 / maxPeak) : 0.7;
  const waveformSnippet: number[] = [];
  const stepSize = Math.max(1, Math.floor(totalSamples / 64));

  for (let i = 0; i < totalSamples; i++) {
    left[i] = Math.max(-0.95, Math.min(0.95, left[i] * normGain));
    right[i] = Math.max(-0.95, Math.min(0.95, right[i] * normGain));

    if (i % stepSize === 0 && waveformSnippet.length < 64) {
      waveformSnippet.push(Number((Math.abs(left[i]) * 0.85).toFixed(3)));
    }
  }

  // Export to standard WAV blob
  const wavBlob = audioBufferToWav(audioBuffer);
  const audioUrl = URL.createObjectURL(wavBlob);

  const loopName = `AceStep_${config.stemType.toUpperCase()}_${config.keyRoot}${config.scale}_${config.durationBars}bar_${config.bpm}bpm`;

  return {
    id: `acestep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: loopName,
    prompt: config.prompt,
    stemType: config.stemType,
    durationBars: config.durationBars,
    durationSeconds,
    bpm: config.bpm,
    key: `${config.keyRoot} ${config.scale}`,
    audioBuffer,
    audioUrl,
    waveformSnippet,
    color: STEM_COLORS[config.stemType] || '#00F0FF',
    createdAt: Date.now(),
    engineSource: 'algorithmic_synth',
    usedFallback
  };
}

/**
 * Generates an audio loop using either the local ComfyUI ACE-Step 1.5 API endpoint
 * (when enabled) or the built-in algorithmic synthesizer. Automatically falls back to
 * the algorithmic synthesizer if ComfyUI is offline or unreachable.
 */
export async function generateAceStepLoop(
  config: AceStepGenerationConfig,
  options?: AceStepGenerateOptions
): Promise<AceStepLoopResult> {
  const savedConfig = getComfyUiConfig();
  const effectiveComfy: AceStepComfyConfig = {
    ...savedConfig,
    ...options?.comfyConfig,
    enabled: config.useComfyUi ?? options?.comfyConfig?.enabled ?? savedConfig.enabled,
    endpointUrl: normalizeComfyEndpoint(
      config.comfyEndpointUrl ?? options?.comfyConfig?.endpointUrl ?? savedConfig.endpointUrl
    )
  };

  if (effectiveComfy.enabled) {
    try {
      return await generateViaComfyUi(
        config,
        effectiveComfy,
        options?.onProgress,
        options?.signal
      );
    } catch (err: any) {
      if (err?.name === 'AbortError' && options?.signal?.aborted) {
        throw err;
      }
      console.warn(
        `ComfyUI ACE-Step endpoint (${effectiveComfy.endpointUrl}) unavailable — using built-in algorithmic synthesizer fallback:`,
        err?.message || err
      );
      options?.onProgress?.({
        phase: 'fallback_synth',
        message: 'ComfyUI offline — using built-in algorithmic synthesizer fallback',
        progressPercent: 75,
        usedFallback: true,
        backend: 'algorithmic_synth'
      });

      const fallbackResult = await synthesizeAlgorithmicLoop(config, true);
      options?.onProgress?.({
        phase: 'complete',
        message: `Synthesized ${fallbackResult.name} via built-in algorithmic fallback`,
        progressPercent: 100,
        usedFallback: true,
        backend: 'algorithmic_synth'
      });
      return fallbackResult;
    }
  }

  options?.onProgress?.({
    phase: 'sampling',
    message: `Synthesizing ${config.stemType.toUpperCase()} (${config.durationBars} bars @ ${config.bpm} BPM) via built-in DSP...`,
    progressPercent: 60,
    backend: 'algorithmic_synth'
  });

  const synthResult = await synthesizeAlgorithmicLoop(config, false);
  options?.onProgress?.({
    phase: 'complete',
    message: `Synthesized ${synthResult.name}`,
    progressPercent: 100,
    usedFallback: false,
    backend: 'algorithmic_synth'
  });
  return synthResult;
}

/**
 * Synthesizes a full multi-track song backing bed (e.g. 16, 32, or 64 bars)
 * with synchronized sections (Intro, Verse, Chorus, Outro) and multiple isolated stems,
 * ready to import into the Mixer Console with an armed Guitar/Live Vocal track!
 */
export async function generateAceStepSongBed(
  config: AceStepSongBedConfig,
  options?: AceStepGenerateOptions
): Promise<AceStepSongBedResult> {
  const stemsToGen = config.selectedStems.length > 0
    ? config.selectedStems
    : (['drums', 'bass', 'pad', 'lead'] as AceStepStemType[]);

  // Define song sections based on totalBars
  let sections: { id: string; name: string; startBar: number; durationBars: number; color: string }[] = [];
  if (config.totalBars === 16) {
    sections = [
      { id: 'sec-intro', name: 'Intro', startBar: 0, durationBars: 4, color: '#00F0FF' },
      { id: 'sec-verse', name: 'Verse Bed', startBar: 4, durationBars: 8, color: '#A855F7' },
      { id: 'sec-chorus', name: 'Chorus Drop', startBar: 12, durationBars: 4, color: '#FFD700' }
    ];
  } else if (config.totalBars === 32) {
    sections = [
      { id: 'sec-intro', name: 'Intro Bed', startBar: 0, durationBars: 4, color: '#00F0FF' },
      { id: 'sec-verse', name: 'Verse 1', startBar: 4, durationBars: 8, color: '#A855F7' },
      { id: 'sec-chorus', name: 'Main Chorus', startBar: 12, durationBars: 8, color: '#FFD700' },
      { id: 'sec-bridge', name: 'Bridge / Solo', startBar: 20, durationBars: 8, color: '#EC4899' },
      { id: 'sec-outro', name: 'Outro Groove', startBar: 28, durationBars: 4, color: '#10B981' }
    ];
  } else {
    sections = [
      { id: 'sec-intro', name: 'Intro', startBar: 0, durationBars: 8, color: '#00F0FF' },
      { id: 'sec-verse1', name: 'Verse 1', startBar: 8, durationBars: 16, color: '#A855F7' },
      { id: 'sec-chorus1', name: 'Chorus 1', startBar: 24, durationBars: 8, color: '#FFD700' },
      { id: 'sec-verse2', name: 'Verse 2', startBar: 32, durationBars: 16, color: '#A855F7' },
      { id: 'sec-chorus2', name: 'Chorus 2', startBar: 48, durationBars: 8, color: '#FFD700' },
      { id: 'sec-outro', name: 'Outro', startBar: 56, durationBars: 8, color: '#10B981' }
    ];
  }

  // Generate each stem sequentially to avoid audio context / local GPU saturation
  const generatedStems: AceStepLoopResult[] = [];
  for (let i = 0; i < stemsToGen.length; i++) {
    const stem = stemsToGen[i];
    const stemResult = await generateAceStepLoop(
      {
        prompt: `${config.prompt} (${stem} backing bed)`,
        stemType: stem,
        durationBars: config.totalBars,
        bpm: config.bpm,
        keyRoot: config.keyRoot,
        scale: config.scale,
        diffusionSteps: 24,
        guidanceScale: 7.5,
        useTapeWarmth: config.useTapeWarmth
      },
      {
        ...options,
        onProgress: (p) => {
          const overall = Math.round(((i + p.progressPercent / 100) / stemsToGen.length) * 100);
          options?.onProgress?.({
            ...p,
            progressPercent: overall,
            message: `[Stem ${i + 1}/${stemsToGen.length}: ${stem.toUpperCase()}] ${p.message}`
          });
        }
      }
    );

    // Rename stem neatly for mixer console
    stemResult.name = `${config.songTitle || 'SongBed'}_${stem.toUpperCase()}`;
    generatedStems.push(stemResult);
  }

  const secondsPerBar = (60 / config.bpm) * 4;
  const durationSeconds = Number((secondsPerBar * config.totalBars).toFixed(3));

  return {
    id: `songbed-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: config.songTitle || `Song Bed in ${config.keyRoot} ${config.scale}`,
    prompt: config.prompt,
    bpm: config.bpm,
    key: `${config.keyRoot} ${config.scale}`,
    totalBars: config.totalBars,
    durationSeconds,
    stems: generatedStems,
    sections,
    guitarOverdubTrackName: 'Guitar / Live Input (Armed)',
    createdAt: Date.now()
  };
}

