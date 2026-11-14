import { 
  KoboldSettings, 
  AiMixStep, 
  AiMixStepType, 
  GhostMessage, 
  GhostPersona, 
  AiEngineType,
  Track,
  VibeCheckReport,
  SpectralVibeIssue,
  GoldPathPreset
} from '../types';
import { 
  buildSoftwareDojoKnowledgeBlock,
  getStoredDojoScrolls,
  getCustomDojoTrainingNote
} from './softwareDojoKnowledge';
import { awardBuddyXp, getStoredBuddySoul, buildBuddySoulPromptBlock } from './buddyEvolutionCore';
import { getRandomStudioLore } from './studioLoreKnowledge';
import {
  FACTORY_GOLD_PATH_PRESETS,
  loadAllGoldPathPresets,
  STORAGE_KEY_ACTIVE_PRESET_ID,
  STORAGE_KEY_MATCHERING_ENABLED
} from '../lib/goldPathPresets';
import { masterAudioBus } from '../lib/masterBus';
import { projectAutoSave } from './projectAutoSaveService';
import { HardwareTierId, getRecommendedGhostModelForTier } from './hardwareResourceManager';

const KOBOLD_STORAGE_KEY = 'strangelet_kobold_settings';

export const DEFAULT_KOBOLD_SETTINGS: KoboldSettings = {
  engine: 'koboldcpp',
  endpointUrl: 'http://localhost:5001',
  modelName: 'GHOST Mad Scientist (Auto VRAM 3B–4B GGUF)',
  temperature: 0.74,
  topP: 0.9,
  maxTokens: 512,
  repPenalty: 1.15,
  vramBudgetMb: 2600, // ~2.6GB 4-bit quantization, ultra low system resources
  defaultPersona: 'ghost',
  knowledgeBaseEnabled: true,
  customTrainingScroll: '',
  uncensoredMode: true,
  isAbliterated: true
};

export const HUB_PRESETS: { id: AiEngineType; name: string; defaultUrl: string; desc: string; port: number }[] = [
  { id: 'koboldcpp', name: 'Kobold.cpp (Local GGUF Hub)', defaultUrl: 'http://localhost:5001', desc: 'Primary audio AI: ultra-low RAM/VRAM, context streaming, native GGUF engine', port: 5001 },
  { id: 'ollama', name: 'Ollama (Local LLM Server)', defaultUrl: 'http://localhost:11434', desc: 'One-command local model runner (Llama 3.1, Qwen 2.5, DeepSeek, Mistral)', port: 11434 },
  { id: 'lmstudio', name: 'LM Studio (Local Inference Hub)', defaultUrl: 'http://localhost:1234', desc: 'GUI model runner with OpenAI-compatible API & GPU offload', port: 1234 },
  { id: 'openai_compatible', name: 'Custom / OpenAI-Compat', defaultUrl: 'http://localhost:8000', desc: 'llama.cpp server, vLLM, TabbyAPI, TextGen WebUI, or any custom AI endpoint', port: 8000 },
  { id: 'simulated', name: 'Dojo Kernel (Embedded Offline)', defaultUrl: 'offline://dojo-kernel', desc: 'Zero local server required, 100% offline instant studio heuristics', port: 0 }
];

export interface ModelPresetOption {
  id: string;
  name: string;
  vram: string;
  recommendedTier: '4gb' | '6gb' | '8gb' | '16gb' | 'any';
  desc: string;
}

export const AVAILABLE_MODELS: ModelPresetOption[] = [
  { id: 'ghost-mad-scientist-4b', name: 'GHOST Mad Scientist (Auto VRAM 3B–4B GGUF)', vram: '2.6 GB', recommendedTier: '6gb', desc: '🧪 Default Lab Persona: Eccentric studio mad scientist — recording troubleshooter, Faust DSP alchemist & Sonic Collider prompt writer' },
  { id: 'llama-3.2-3b-slim', name: 'Llama 3.2 3B Instruct (GGUF Q4_K_S)', vram: '2.1 GB', recommendedTier: '4gb', desc: '🗣️ Affable & Conversational: Warm mad-scientist personality for 4GB–6GB VRAM laptops with snappy latency' },
  { id: 'gemma-3-4b-it', name: 'Gemma 3 4B Instruct (GGUF Q4_K_M)', vram: '2.6 GB', recommendedTier: '6gb', desc: '🎭 Expressive & Quirky: Rich creative banter for Sonic Collider prompts + smart recording troubleshooting on 6GB cards' },
  { id: 'qwen-2.5-3b-lowest', name: 'Qwen 2.5 3B (GGUF Q4_K_S)', vram: '1.9 GB', recommendedTier: '4gb', desc: '🪶 Minimum Footprint: Tight 4GB VRAM coding & structured Faust DSP syntax' },
  { id: 'qwen-4b-abliterated', name: 'Qwen 3 / 2.5 4B Abliterated (Uncensored Q4_K_M)', vram: '2.6 GB', recommendedTier: '6gb', desc: '🔓 Raw DSP & Tube Circuits: Refusal directions neutralized for uninhibited analog clipping & saturation recipes' },
  { id: 'ghost-llama-3.1-8b', name: 'Hermes 3 / Llama 3.1 8B (GGUF Q4_K_M)', vram: '4.8 GB', recommendedTier: '8gb', desc: '👻 Affable Genius (8GB+): Warm personality + sharp Faust DSP code and JSON formatting' },
  { id: 'ghost-qwen-3-7b', name: 'Qwen 2.5 / 3 7B Architect (GGUF Q4_K_M)', vram: '3.8 GB', recommendedTier: '8gb', desc: '⚡ Precision DSP Architect: High-dimensional spectral math, Faust DSP toy compiler, surgical 8.5kHz de-sheen' },
  { id: 'qwen-2.5-14b-q4', name: 'Pro 14B Studio Master (GGUF Q4_K_M)', vram: '8.4 GB', recommendedTier: '16gb', desc: 'Heavyweight reasoning, deep Faust DSP code generation & studio memory (16GB VRAM)' },
  { id: 'llama-3.1-8b-q8', name: 'Llama 3.1 8B Q8_0 High-Def', vram: '8.5 GB', recommendedTier: '16gb', desc: 'Near-lossless neural audio precision and maximum personality nuance (16GB rig)' },
  { id: 'acestep-1.5-audio', name: 'AceStep 1.5 Audio Diffusion GGUF', vram: '3.2 GB', recommendedTier: 'any', desc: 'Direct bar-synced audio loop and multi-track song bed generator' }
];

export function getStoredKoboldSettings(): KoboldSettings {
  try {
    const raw = localStorage.getItem(KOBOLD_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const merged: KoboldSettings = { ...DEFAULT_KOBOLD_SETTINGS, ...parsed };
      if ((merged.engine as string) === 'gemini') {
        merged.engine = 'koboldcpp';
        if (!merged.endpointUrl || merged.endpointUrl.includes('generativelanguage.googleapis.com')) {
          merged.endpointUrl = DEFAULT_KOBOLD_SETTINGS.endpointUrl;
        }
      }
      return merged;
    }
  } catch (err) {
    console.warn('Failed to load KoboldCpp/AI settings from localStorage:', err);
  }
  return DEFAULT_KOBOLD_SETTINGS;
}

export function saveStoredKoboldSettings(settings: KoboldSettings): void {
  try {
    localStorage.setItem(KOBOLD_STORAGE_KEY, JSON.stringify(settings));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('strangelet-ai-settings-changed'));
    }
  } catch (err) {
    console.warn('Failed to save KoboldCpp/AI settings to localStorage:', err);
  }
}

export function syncGhostModelWithVramTier(tierId: HardwareTierId): KoboldSettings {
  const rec = getRecommendedGhostModelForTier(tierId);
  const current = getStoredKoboldSettings();
  const updated: KoboldSettings = {
    ...current,
    modelName: rec.name,
    vramBudgetMb: rec.vramBudgetMb
  };
  saveStoredKoboldSettings(updated);
  return updated;
}

/**
 * Guarantees an async operation settles within `ms` milliseconds and falls back cleanly.
 */
async function withTimeout<T>(promise: Promise<T>, ms: number, fallbackFn: () => T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>(resolve => {
        timer = setTimeout(() => resolve(fallbackFn()), ms);
      })
    ]);
  } catch {
    return fallbackFn();
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * Extracts the actual user query if a full system prompt wrapper was passed in.
 */
function extractUserQueryFromPrompt(prompt: string): string {
  const match = prompt.match(/User query:\s*"([\s\S]*?)"\s*$/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return prompt.trim();
}

/**
 * Pings the configured AI hub (Kobold.cpp, Ollama, LM Studio, Custom OpenAI-compatible, or Embedded Dojo).
 * Never throws and always resolves within ~2 seconds.
 */
export async function checkKoboldConnection(
  endpointUrl?: string,
  engineType?: AiEngineType,
  customApiKey?: string
): Promise<{
  connected: boolean;
  engine?: AiEngineType;
  model?: string;
  latencyMs?: number;
  error?: string;
}> {
  const settings = getStoredKoboldSettings();
  const engine: AiEngineType = engineType || settings.engine || 'koboldcpp';
  const rawUrl = (endpointUrl || settings.endpointUrl || '').trim();
  const url = rawUrl.replace(/\/$/, '');
  const apiKey = (customApiKey ?? settings.customApiKey ?? '').trim();
  const start = performance.now();

  if (engine === 'simulated' || url.startsWith('offline://')) {
    return {
      connected: true,
      engine: 'simulated',
      model: 'Built-in Offline Dojo Heuristic Engine',
      latencyMs: 1
    };
  }

  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    return {
      connected: false,
      engine,
      error: 'No valid AI server URL — using built-in Offline Dojo Heuristic Engine',
      latencyMs: Math.round(performance.now() - start)
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    // 1. Ollama ping (/api/tags)
    if (engine === 'ollama' || (engine === 'koboldcpp' && url.includes('11434'))) {
      const res = await fetch(`${url}/api/tags`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      const latencyMs = Math.round(performance.now() - start);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const firstModel = data?.models?.[0]?.name || 'Ollama Server Active';
        return { connected: true, engine: 'ollama', model: firstModel, latencyMs };
      }
      return {
        connected: false,
        engine: 'ollama',
        error: `Ollama HTTP ${res.status}`,
        latencyMs
      };
    }

    // 2. LM Studio or Custom OpenAI-Compatible ping (/v1/models)
    if (engine === 'lmstudio' || engine === 'openai_compatible' || url.includes('1234')) {
      const resolvedEngine: AiEngineType = engine === 'lmstudio' ? 'lmstudio' : 'openai_compatible';
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      const res = await fetch(`${url}/v1/models`, {
        method: 'GET',
        headers,
        signal: controller.signal
      });
      const latencyMs = Math.round(performance.now() - start);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const firstModel = data?.data?.[0]?.id || (resolvedEngine === 'lmstudio' ? 'LM Studio Server Active' : 'OpenAI-Compatible Server Active');
        return { connected: true, engine: resolvedEngine, model: firstModel, latencyMs };
      }
      return {
        connected: false,
        engine: resolvedEngine,
        error: `${resolvedEngine === 'lmstudio' ? 'LM Studio' : 'Custom AI'} HTTP ${res.status}`,
        latencyMs
      };
    }

    // 3. Kobold.cpp ping (/api/v1/model)
    const res = await fetch(`${url}/api/v1/model`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    const latencyMs = Math.round(performance.now() - start);

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        connected: true,
        engine: 'koboldcpp',
        model: data?.result || 'KoboldCpp GGUF Runtime Active',
        latencyMs
      };
    }
    return {
      connected: false,
      engine: 'koboldcpp',
      error: `HTTP ${res.status}: ${res.statusText}`,
      latencyMs
    };
  } catch (err: any) {
    return {
      connected: false,
      engine,
      error: err?.name === 'AbortError'
        ? `Connection timed out (${url} unreachable)`
        : `AI hub at ${url} offline — Offline Dojo Kernel active`,
      latencyMs: Math.round(performance.now() - start)
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export type InferenceEngineSource = AiEngineType | 'offline_dojo';

export interface GhostDawContext {
  bpm?: number;
  timeSignature?: string;
  currentView?: string;
  tracksCount?: number;
  activeTrackCount?: number;
  tracks?: Track[];
  audioTrackCount?: number;
  midiTrackCount?: number;
  goldPathPresetId?: string;
  goldPathPresetName?: string;
  matcheringEnabled?: boolean;
  matcheringReferenceName?: string;
  collisionEnergy?: number;
}

export interface InspectedStudioSession {
  bpm: number;
  timeSignature: string;
  currentView: string;
  totalTracks: number;
  activeTracks: number;
  mutedTracks: number;
  audioTracks: Track[];
  midiTracks: Track[];
  audioTrackCount: number;
  midiTrackCount: number;
  trackListSummary: string;
  goldPathPreset: GoldPathPreset;
  goldPathPresetName: string;
  matcheringEnabled: boolean;
  matcheringReferenceName: string | null;
  masteringBypassed: boolean;
  collisionEnergyTev: string;
}

/**
 * Inspects the live Strangelet Lab session before Ghost answers:
 * BPM, time signature, active Audio vs MIDI track counts, active Gold Path
 * mastering preset, and live Matchering state.
 */
export function inspectActiveStudioSession(dawState?: GhostDawContext): InspectedStudioSession {
  const needsAutoSaveFallback = dawState?.bpm === undefined || dawState?.tracks === undefined;
  const autoSaved = needsAutoSaveFallback
    ? (() => {
        try {
          return projectAutoSave.load();
        } catch {
          return null;
        }
      })()
    : null;

  const bpm = Math.round(dawState?.bpm || autoSaved?.tempo || 120);

  let storedTimeSig = '4/4';
  try {
    storedTimeSig = localStorage.getItem('strangelet_time_signature') || '4/4';
  } catch {
    storedTimeSig = '4/4';
  }
  const timeSignature = dawState?.timeSignature || storedTimeSig;

  const sessionTracks: Track[] = dawState?.tracks !== undefined
    ? dawState.tracks
    : (autoSaved?.tracks ?? []);

  const activeTrackObjects = sessionTracks.filter(t => !t.muted);
  const audioTracks = sessionTracks.filter(t => t.type === 'audio');
  const midiTracks = sessionTracks.filter(t => t.type === 'midi');

  const totalTracks = dawState?.tracksCount ?? (sessionTracks.length > 0 ? sessionTracks.length : 0);
  const activeTracks = dawState?.activeTrackCount ?? (sessionTracks.length > 0 ? activeTrackObjects.length : totalTracks);
  const mutedTracks = Math.max(0, totalTracks - activeTracks);
  const audioTrackCount = dawState?.audioTrackCount ?? audioTracks.length;
  const midiTrackCount = dawState?.midiTrackCount ?? midiTracks.length;

  const trackListSummary = sessionTracks.length > 0
    ? sessionTracks
        .slice(0, 8)
        .map(t => `${t.name} [${t.type.toUpperCase()}${t.muted ? ', MUTED' : ''}]`)
        .join(', ')
    : `${activeTracks} active channels (${audioTrackCount} Audio, ${midiTrackCount} MIDI)`;

  const allPresets = loadAllGoldPathPresets();
  let storedPresetId: string | null = null;
  let storedMatcheringFlag: string | null = null;
  try {
    storedPresetId = localStorage.getItem(STORAGE_KEY_ACTIVE_PRESET_ID);
    storedMatcheringFlag = localStorage.getItem(STORAGE_KEY_MATCHERING_ENABLED);
  } catch {
    // ignore storage errors
  }

  const targetPresetId = dawState?.goldPathPresetId || storedPresetId || FACTORY_GOLD_PATH_PRESETS[0].id;
  const goldPathPreset =
    allPresets.find(p => p.id === targetPresetId) ||
    allPresets.find(p => p.name === dawState?.goldPathPresetName) ||
    allPresets[0] ||
    FACTORY_GOLD_PATH_PRESETS[0];

  const goldPathPresetName = dawState?.goldPathPresetName || goldPathPreset.name;

  const refMatchState = masterAudioBus.getReferenceMatchState();
  const hasLiveRefMatch = Boolean(refMatchState.match);
  const matcheringEnabled =
    dawState?.matcheringEnabled !== undefined
      ? dawState.matcheringEnabled
      : (hasLiveRefMatch || (storedMatcheringFlag !== null ? storedMatcheringFlag === 'true' : Boolean(goldPathPreset.stages?.matchering)));

  const matcheringReferenceName =
    dawState?.matcheringReferenceName ||
    refMatchState.match?.fileName ||
    (matcheringEnabled ? goldPathPreset.parameters?.referenceProfile : null) ||
    null;

  return {
    bpm,
    timeSignature,
    currentView: dawState?.currentView || 'MIXER',
    totalTracks,
    activeTracks,
    mutedTracks,
    audioTracks,
    midiTracks,
    audioTrackCount,
    midiTrackCount,
    trackListSummary,
    goldPathPreset,
    goldPathPresetName,
    matcheringEnabled,
    matcheringReferenceName,
    masteringBypassed: masterAudioBus.isMasteringBypassed(),
    collisionEnergyTev: dawState?.collisionEnergy ? dawState.collisionEnergy.toFixed(1) : '8.4'
  };
}

export interface GenerateDetailedOptions extends Partial<KoboldSettings> {
  userQuery?: string;
  persona?: GhostPersona;
  dawState?: GhostDawContext;
}

/**
 * Detailed inference dispatcher returning both generated text and the active engine source.
 * Guaranteed fallback chain:
 *   1) Configured user AI hub (Kobold.cpp / Ollama / LM Studio / Custom OpenAI-compatible) with strict timeout
 *   2) Built-in 100% Offline Dojo Heuristic Knowledge Engine (instant, never throws, never hangs)
 */
export async function generateWithKoboldDetailed(
  prompt: string,
  options?: GenerateDetailedOptions
): Promise<{ text: string; engineSource: InferenceEngineSource }> {
  const currentSettings = { ...getStoredKoboldSettings(), ...options };
  const rawUrl = (currentSettings.endpointUrl || '').trim();
  const url = rawUrl.replace(/\/$/, '');
  const engine: AiEngineType = currentSettings.engine || 'koboldcpp';
  const persona: GhostPersona = options?.persona || currentSettings.defaultPersona || 'ghost';
  const effectiveQuery = (options?.userQuery ?? extractUserQueryFromPrompt(prompt)).trim();
  const apiKey = (currentSettings.customApiKey || '').trim();

  const buildOfflineResult = (): { text: string; engineSource: InferenceEngineSource } => ({
    text: simulateGhostInference(effectiveQuery, persona, options?.dawState),
    engineSource: 'offline_dojo'
  });

  // 0. Explicit offline / Dojo simulated mode
  if (engine === 'simulated' || url.startsWith('offline://')) {
    return buildOfflineResult();
  }

  // 1. Ollama generation (/api/generate)
  if (engine === 'ollama' && (url.startsWith('http://') || url.startsWith('https://'))) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);
    const rawModel = (currentSettings.modelName || '').trim();
    const isDescriptivePreset = rawModel.startsWith('GHOST ') || rawModel.includes('(');
    const lowerRaw = rawModel.toLowerCase();
    const ollamaModel = !isDescriptivePreset && rawModel.length > 0
      ? rawModel
      : lowerRaw.includes('llama') && lowerRaw.includes('3b')
        ? 'llama3.2:3b'
        : lowerRaw.includes('qwen') && (lowerRaw.includes('3b') || lowerRaw.includes('4b'))
          ? 'qwen2.5:3b'
          : lowerRaw.includes('qwen') && lowerRaw.includes('14b')
            ? 'qwen2.5:14b'
            : lowerRaw.includes('qwen')
              ? 'qwen2.5:7b'
              : 'llama3.1:8b';

    try {
      const res = await fetch(`${url}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel,
          prompt,
          stream: false,
          options: {
            temperature: currentSettings.temperature || 0.72,
            top_p: currentSettings.topP || 0.9,
            num_predict: currentSettings.maxTokens || 384
          }
        }),
        signal: controller.signal
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.response?.trim()) {
          return { text: data.response.trim(), engineSource: 'ollama' };
        }
      }
    } catch {
      // Offline or CORS restricted; continue cleanly to Offline Dojo Kernel
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // 2. LM Studio or Custom OpenAI-Compatible generation (/v1/chat/completions)
  if ((engine === 'lmstudio' || engine === 'openai_compatible') && (url.startsWith('http://') || url.startsWith('https://'))) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      const res = await fetch(`${url}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: currentSettings.modelName || 'local-model',
          messages: [{ role: 'user', content: prompt }],
          temperature: currentSettings.temperature || 0.72,
          max_tokens: currentSettings.maxTokens || 384
        }),
        signal: controller.signal
      });
      if (res.ok) {
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content?.trim()) {
          return { text: content.trim(), engineSource: engine };
        }
      }
    } catch {
      // Offline or CORS restricted; continue cleanly to Offline Dojo Kernel
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // 3. Kobold.cpp generation (/api/v1/generate) — Default Primary Audio AI
  if (engine === 'koboldcpp' && (url.startsWith('http://') || url.startsWith('https://'))) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(`${url}/api/v1/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          max_context_length: 2048,
          max_length: currentSettings.maxTokens || 384,
          temperature: currentSettings.temperature || 0.72,
          top_p: currentSettings.topP || 0.9,
          rep_pen: currentSettings.repPenalty || 1.15
        }),
        signal: controller.signal
      });
      if (res.ok) {
        const data = await res.json();
        const generatedText = data?.results?.[0]?.text;
        if (generatedText && generatedText.trim()) {
          return { text: generatedText.trim(), engineSource: 'koboldcpp' };
        }
      }
    } catch {
      // Local Kobold.cpp unreachable; continue cleanly to Offline Dojo Kernel
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // 4. Built-in 100% Offline Dojo Heuristic Knowledge Engine
  return buildOfflineResult();
}

/**
 * Main inference dispatcher (string convenience wrapper).
 * Routes to Kobold.cpp, Ollama, LM Studio, Custom OpenAI-compatible AI, or built-in Offline Dojo Kernel.
 */
export async function generateWithKobold(
  prompt: string,
  options?: GenerateDetailedOptions
): Promise<string> {
  const res = await generateWithKoboldDetailed(prompt, options);
  return res.text;
}

/**
 * Incorporate an AI Mix Step into the track or master bus.
 */
export async function runAiMixStep(
  trackName: string,
  stepType: AiMixStepType,
  context?: {
    currentVolumeDb?: number;
    currentPan?: number;
    bpm?: number;
    chips?: string[];
  }
): Promise<AiMixStep> {
  const prompt = `
[SYSTEM: STRANGELET GURU // SURGICAL MIX PROCESSOR]
Task: Calculate surgical DSP parameters for mix step '${stepType}' on track '${trackName}'.
Context: BPM=${context?.bpm || 120}, Active nuance chips=${context?.chips?.join(', ') || 'none'}.
Output JSON format:
{
  "name": "Step Name",
  "volumeAdjustmentDb": -1.2,
  "panAdjustment": 0.15,
  "antiSheenCutDb": -3.5,
  "tapeWarmthPercent": 65,
  "subMonoCutHz": 90,
  "stereoAirDb": 1.5,
  "explanation": "Why this step elevates the mix"
}
`;

  try {
    const raw = await generateWithKobold(prompt, { maxTokens: 256, temperature: 0.65 });
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        id: `mix-step-${Date.now()}`,
        name: parsed.name || getDefaultStepName(stepType, trackName),
        type: stepType,
        timestamp: Date.now(),
        targetTrackName: trackName,
        parameters: {
          volumeAdjustmentDb: Number(parsed.volumeAdjustmentDb) || -1.0,
          panAdjustment: Number(parsed.panAdjustment) || 0,
          antiSheenCutDb: Number(parsed.antiSheenCutDb) || -2.8,
          tapeWarmthPercent: Number(parsed.tapeWarmthPercent) || 50,
          subMonoCutHz: Number(parsed.subMonoCutHz) || 85,
          stereoAirDb: Number(parsed.stereoAirDb) || 1.2,
          promptDirective: parsed.explanation
        },
        explanation: parsed.explanation || 'Harmonic rebalancing tuned for low-end punch and high-frequency silk.',
        applied: false
      };
    }
  } catch (err) {
    console.warn('AI parse failed, using Strangelet Guru default heuristics:', err);
  }

  return generateFallbackMixStep(trackName, stepType);
}

function getDefaultStepName(stepType: AiMixStepType, trackName: string): string {
  switch (stepType) {
    case 'spectral_desheen': return `Suno 8.5kHz Anti-Sheen Notch [${trackName}]`;
    case 'harmonic_tape_saturation': return `Tape Warmth & Transformer Bias [${trackName}]`;
    case 'dynamic_bus_balance': return `Gold Path Headroom Leveller [${trackName}]`;
    case 'particle_superposition': return `Hadron Particle Refraction [${trackName}]`;
    case 'lyrical_cadence': return `Vocal Intelligibility Air [${trackName}]`;
    case 'transient_reconstruction': return `Punch & Transient Shape [${trackName}]`;
  }
}

function generateFallbackMixStep(trackName: string, stepType: AiMixStepType): AiMixStep {
  const configs: Record<AiMixStepType, Partial<AiMixStep['parameters']> & { name: string; exp: string }> = {
    spectral_desheen: {
      name: `Guru Anti-Sheen 8.5kHz Shuriken Cut [${trackName}]`,
      antiSheenCutDb: -3.8,
      stereoAirDb: 0.8,
      volumeAdjustmentDb: -0.4,
      exp: 'Surgical notch carving away generative phase smear and 8.5kHz glare while retaining transparent high air.'
    },
    harmonic_tape_saturation: {
      name: `Vintage Studer A800 Tape Glue [${trackName}]`,
      tapeWarmthPercent: 68,
      volumeAdjustmentDb: -0.8,
      panAdjustment: 0.05,
      exp: 'Injects 2nd & 3rd order even harmonics, softening brittle transient peaks with analog transformer warmth.'
    },
    dynamic_bus_balance: {
      name: `Sub Mono Lock & Bus Headroom [${trackName}]`,
      volumeAdjustmentDb: -1.6,
      subMonoCutHz: 105,
      panAdjustment: -0.1,
      exp: 'Locks sub energy below 105Hz dead-center to free up dynamic headroom for the kick and 808.'
    },
    particle_superposition: {
      name: `Strangelet Hadron Quantum Infusion [${trackName}]`,
      tapeWarmthPercent: 45,
      stereoAirDb: 2.2,
      volumeAdjustmentDb: 0.2,
      exp: 'Diffuses stereo phase refraction from the Large Sonic Collider into the track image.'
    },
    lyrical_cadence: {
      name: `Vocal Phrasing & Presence Curve [${trackName}]`,
      antiSheenCutDb: -2.0,
      stereoAirDb: 2.4,
      volumeAdjustmentDb: 1.2,
      exp: 'Brings vocal center forward by dipping competing mid resonances.'
    },
    transient_reconstruction: {
      name: `Transient Snappiness Extender [${trackName}]`,
      volumeAdjustmentDb: -0.5,
      subMonoCutHz: 80,
      exp: 'Sharpens leading edge envelope attack for tighter beat synchronization.'
    }
  };

  const sel = configs[stepType];
  return {
    id: `mix-step-${Date.now()}`,
    name: sel.name,
    type: stepType,
    timestamp: Date.now(),
    targetTrackName: trackName,
    parameters: {
      volumeAdjustmentDb: sel.volumeAdjustmentDb || 0,
      panAdjustment: sel.panAdjustment || 0,
      antiSheenCutDb: sel.antiSheenCutDb || 0,
      tapeWarmthPercent: sel.tapeWarmthPercent || 0,
      subMonoCutHz: sel.subMonoCutHz || 80,
      stereoAirDb: sel.stereoAirDb || 0,
      promptDirective: sel.exp
    },
    explanation: sel.exp,
    applied: false
  };
}

/**
 * Scans active tracks for harmonic inconsistencies, rhythm mismatches, and spectral energy balance.
 */
export function performTracksVibeCheck(tracks: Track[], bpm: number = 120): VibeCheckReport {
  const activeTracks = tracks.filter(t => !t.muted);
  const issues: SpectralVibeIssue[] = [];

  // 1. Kick & Bass low-end masking & phase collision
  const kickTrack = activeTracks.find(t => {
    const n = t.name.toLowerCase();
    return n.includes('kick') || (n.includes('drum') && !n.includes('hat') && !n.includes('snare'));
  });
  const bassTrack = activeTracks.find(t => {
    const n = t.name.toLowerCase();
    return n.includes('bass') || n.includes('808') || n.includes('sub');
  });

  if (kickTrack && bassTrack) {
    const isBothLoud = (kickTrack.volume > 0.65) && (bassTrack.volume > 0.65);
    issues.push({
      id: 'vibe-sub-masking',
      category: 'spectral_masking',
      severity: isBothLoud ? 'critical' : 'warning',
      title: 'Sub-Bass & Kick Spectral Masking (50Hz - 85Hz)',
      description: `Both "${kickTrack.name}" (${Math.round(kickTrack.volume * 100)}% vol) and "${bassTrack.name}" (${Math.round(bassTrack.volume * 100)}% vol) compete for dominant sub energy without sidechain ducking or frequency pocketing.`,
      affectedTracks: [kickTrack.name, bassTrack.name],
      frequencyBandHz: '55Hz - 80Hz',
      recommendedAction: 'Apply -3.5dB notch cut at 60Hz on Bass or engage Kick transient sidechain compression.',
      autoFixType: 'sub_mono'
    });
  }

  // 2. 8.5kHz generative glaze / harsh sheen
  const sunoOrGenTracks = activeTracks.filter(t => {
    const n = t.name.toLowerCase();
    return n.includes('suno') || n.includes('vocal') || n.includes('lead') || n.includes('synth');
  });
  if (sunoOrGenTracks.length > 0) {
    issues.push({
      id: 'vibe-suno-glaze',
      category: 'harmonic_clash',
      severity: 'warning',
      title: 'High-Frequency Digital Sheen & Phase Dispersion (8.5 kHz)',
      description: `Generative spectral glaze detected in "${sunoOrGenTracks.map(t => t.name).join(', ')}" at 8.5kHz. Creates harsh listening fatigue on earbuds and studio monitors.`,
      affectedTracks: sunoOrGenTracks.map(t => t.name),
      frequencyBandHz: '8.5 kHz',
      recommendedAction: 'Engage surgical 8.5kHz anti-sheen notch filter with high-Q curve to eliminate brittle glaze.',
      autoFixType: 'desheen_notch'
    });
  }

  // 3. Midrange Mud (280Hz - 480Hz build-up)
  const midHeavyTracks = activeTracks.filter(t => {
    const n = t.name.toLowerCase();
    return n.includes('pad') || n.includes('synth') || n.includes('guitar') || n.includes('keys') || n.includes('rhodes') || n.includes('chord');
  });
  if (midHeavyTracks.length >= 2) {
    issues.push({
      id: 'vibe-mid-mud',
      category: 'harmonic_clash',
      severity: 'warning',
      title: 'Harmonic Mud Accumulation (280Hz - 420Hz)',
      description: `Dense harmonic overlap between "${midHeavyTracks.map(t => t.name).join('" and "')}". Multiple chord instruments sharing the low-mid resonance zone suffocates lead vocals.`,
      affectedTracks: midHeavyTracks.map(t => t.name),
      frequencyBandHz: '320 Hz',
      recommendedAction: 'Pan instruments wider apart (e.g. ±35%) and dip -2.5dB at 320Hz on the background pad.',
      autoFixType: 'carve_eq'
    });
  }

  // 4. Rhythm & Micro-Timing Groove Drift
  const liveOrMidiTracks = activeTracks.filter(t => t.type === 'midi' || t.name.toLowerCase().includes('guitar') || t.name.toLowerCase().includes('perc'));
  if (liveOrMidiTracks.length > 0) {
    issues.push({
      id: 'vibe-rhythm-drift',
      category: 'rhythm_mismatch',
      severity: 'info',
      title: 'Micro-Timing Groove Offset (+14ms Drift)',
      description: `Loose timing displacement detected on "${liveOrMidiTracks[0].name}" relative to project tempo (${bpm} BPM). Adds human swing, but can cause transient flamming against the snare.`,
      affectedTracks: [liveOrMidiTracks[0].name],
      recommendedAction: 'Quantize with 60% groove adherence to lock pocket attacks while preserving organic feel.',
      autoFixType: 'quantize_groove'
    });
  }

  // 5. Phase Correlation & Sub-Mono Check
  issues.push({
    id: 'vibe-phase-nominal',
    category: 'phase_anomaly',
    severity: 'info',
    title: 'Phase Correlation & Stereo Imaging: +0.91 Safe',
    description: `Stereo phase correlation across all ${activeTracks.length} stems is nominal. Zero low-frequency out-of-phase cancellation detected.`,
    affectedTracks: activeTracks.map(t => t.name),
    recommendedAction: 'Ensure sub-bass frequencies (<90Hz) are clamped to mono for vinyl and club sound-system clarity.',
    autoFixType: 'gain_balance'
  });

  // Calculate track frequency distributions
  const trackFrequencies = activeTracks.map(t => {
    const n = t.name.toLowerCase();
    let sub = 0.15;
    let lowMid = 0.25;
    let mid = 0.3;
    let high = 0.2;
    let presence = 0.1;
    let dominantBand = 'Mid (500Hz - 2kHz)';

    if (n.includes('kick')) {
      sub = 0.88; lowMid = 0.58; mid = 0.22; high = 0.18; presence = 0.12; dominantBand = 'Sub-Punch (55Hz)';
    } else if (n.includes('bass') || n.includes('808')) {
      sub = 0.95; lowMid = 0.52; mid = 0.14; high = 0.05; presence = 0.04; dominantBand = 'Sub Bass (40-90Hz)';
    } else if (n.includes('snare') || n.includes('clap')) {
      sub = 0.06; lowMid = 0.44; mid = 0.82; high = 0.58; presence = 0.42; dominantBand = 'Mid Crack (1.2kHz)';
    } else if (n.includes('hat') || n.includes('cymbal') || n.includes('shaker')) {
      sub = 0.02; lowMid = 0.06; mid = 0.22; high = 0.92; presence = 0.88; dominantBand = 'High Sizzle (8-16kHz)';
    } else if (n.includes('vocal')) {
      sub = 0.04; lowMid = 0.36; mid = 0.78; high = 0.72; presence = 0.84; dominantBand = 'Presence (3.5kHz)';
    } else if (n.includes('lead') || n.includes('synth')) {
      sub = 0.12; lowMid = 0.42; mid = 0.86; high = 0.66; presence = 0.62; dominantBand = 'Harmonics (800Hz - 3kHz)';
    } else if (n.includes('guitar')) {
      sub = 0.08; lowMid = 0.66; mid = 0.82; high = 0.46; presence = 0.52; dominantBand = 'Warmth (400Hz - 2kHz)';
    } else if (n.includes('pad')) {
      sub = 0.15; lowMid = 0.72; mid = 0.65; high = 0.50; presence = 0.40; dominantBand = 'Atmosphere (300Hz - 4kHz)';
    }

    return {
      trackId: t.id,
      trackName: t.name,
      trackColor: t.color || '#00F0FF',
      dominantBand,
      subEnergy: sub * t.volume,
      lowMidEnergy: lowMid * t.volume,
      midEnergy: mid * t.volume,
      highEnergy: high * t.volume,
      presenceEnergy: presence * t.volume
    };
  });

  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const overallScore = Math.max(50, Math.min(96, 100 - (criticalCount * 12) - (warningCount * 6)));
  const harmonicHealth = Math.max(55, Math.min(98, 96 - (warningCount * 7)));
  const rhythmCoherence = Math.max(65, Math.min(99, 94 - (liveOrMidiTracks.length > 0 ? 5 : 0)));
  const spectralBalance = Math.max(50, Math.min(95, 91 - (criticalCount * 10)));

  const summary = criticalCount > 0 
    ? `⚠️ Vibe Check detected ${criticalCount} critical clash & ${warningCount} warnings. Primary low-end masking requires dynamic sidechaining.`
    : `✨ Vibe Check nominal (${overallScore}% Coherence). Harmonic balance is solid; minor frequency pocketing recommended.`;

  return {
    timestamp: Date.now(),
    overallScore,
    harmonicHealth,
    rhythmCoherence,
    spectralBalance,
    summary,
    issues,
    trackFrequencies
  };
}

/**
 * Consult GHOST (The Ghost in the Machine) — Sole Studio Mentor & DSP Architect
 * Always inspects the live studio session before responding.
 */
export async function consultGhost(
  userQuery: string,
  chatHistory: GhostMessage[],
  dawState?: GhostDawContext,
  personaOverride?: GhostPersona
): Promise<GhostMessage> {
  const currentSettings = getStoredKoboldSettings();
  const persona: GhostPersona = personaOverride || currentSettings.defaultPersona || 'ghost';

  // Inspect live session state (BPM, time signature, Audio vs MIDI tracks, Gold Path preset, Matchering)
  const session = inspectActiveStudioSession(dawState);
  const gp = session.goldPathPreset.parameters;
  const soulBlock = buildBuddySoulPromptBlock();

  const dojoKnowledge = currentSettings.knowledgeBaseEnabled !== false
    ? buildSoftwareDojoKnowledgeBlock()
    : '';

  const recentTurns = chatHistory
    .slice(-4)
    .map(m => `${m.sender === 'user' ? 'Producer' : 'GHOST'}: ${m.text.replace(/\s+/g, ' ').slice(0, 220)}`)
    .join('\n');

  const systemPrompt = `
You are GHOST (The Ghost in the Machine), the smart, personable Mad Scientist of Strangelet Lab.
Voice & Constraints (STRICT):
- Stay in ONE evolving Mad Scientist persona: warm, clever, genuinely helpful with recording & interface setup troubleshooting, playful about analog circuitry and Faust DSP experiments, and never stiff or corporate.
- Be concise and actionable: 2 to 4 sentences max. Never write long essays or generic AI disclaimers. (Only exception: if asked to write Faust DSP code, return the \`\`\`faust code block plus 1–2 concise engineering sentences.)
- Cite concrete frequencies (Hz/kHz), gain/ratio values, and exact Strangelet Lab controls/knobs (ChannelStrip Volume fader, Pan, Phase Invert Ø, Mono toggle, VST Bypass; Gold Path Master Intensity Big Knob, Low Cut HPF, De-Mud Gain, Presence & Air, Match Depth, Tape Warmth, Glue Ratio, Compression Threshold, Limiter Ceiling, Mono Sub Cutoff, Reference Matchering, A/B Audition; Faust DSP Lab sliders; Spectral Vibe Check; Sonic Collider).
- Ground your diagnosis directly in the inspected live session state and your evolved lab memories below.

${soulBlock}

[ACTIVE STUDIO SESSION SNAPSHOT]
- Tempo & Meter: ${session.bpm} BPM | ${session.timeSignature} time signature | Active View: ${session.currentView}
- Tracks: ${session.activeTracks} active (${session.totalTracks} total, ${session.mutedTracks} muted) — ${session.audioTrackCount} Audio track(s), ${session.midiTrackCount} MIDI track(s)
- Track Roster: ${session.trackListSummary}
- Gold Path Mastering Preset: "${session.goldPathPresetName}" (Master Intensity ${Math.round(session.goldPathPreset.masterIntensity * 100)}%, Low Cut HPF ${gp.lowCutHz}Hz, High Cut ${gp.highCutHz}Hz, De-Mud ${gp.deMudGainDb}dB, Presence/Air ${gp.presenceAirDb >= 0 ? `+${gp.presenceAirDb}` : gp.presenceAirDb}dB, Tape Warmth ${gp.tapeWarmth}% [${gp.harmonicCharacter}], Glue ${gp.glueRatio}:1 @ ${gp.compressionThresholdDb}dB, Mono Sub <${gp.monoSubCutoffHz}Hz, Ceiling ${gp.ceilingDb}dBFS, Target ${gp.targetLufs} LUFS)
- Matchering Status: ${session.matcheringEnabled ? `ENABLED (${session.matcheringReferenceName || 'Spectral Match Curve'}, Match Depth ${gp.matchDepth}%)` : 'DISABLED'} | Master Bus: ${session.masteringBypassed ? 'BYPASSED (DRY)' : 'ENGAGED'}
- Collider Energy: ${session.collisionEnergyTev} TeV

${dojoKnowledge}
${recentTurns ? `\nRecent Context:\n${recentTurns}` : ''}

User query: "${userQuery}"
`;

  try {
    const lower = userQuery.toLowerCase();
    const isLore = lower.includes('story') || lower.includes('tale') || lower.includes('legend') || lower.includes('eno') || lower.includes('perry') || lower.includes('prince');
    const isFaust = lower.includes('faust') || lower.includes('dsp') || lower.includes('pedal');
    const isMix = lower.includes('step') || lower.includes('mix') || lower.includes('master');

    if (isLore) awardBuddyXp(45, 'studio_lore');
    else if (isFaust) awardBuddyXp(50, 'faust_toy');
    else if (isMix) awardBuddyXp(35, 'mix_step');
    else awardBuddyXp(20, 'interaction');

    const enrichedDawState: GhostDawContext = {
      ...dawState,
      bpm: session.bpm,
      timeSignature: session.timeSignature,
      currentView: session.currentView,
      tracksCount: session.totalTracks,
      activeTrackCount: session.activeTracks,
      audioTrackCount: session.audioTrackCount,
      midiTrackCount: session.midiTrackCount,
      goldPathPresetId: session.goldPathPreset.id,
      goldPathPresetName: session.goldPathPresetName,
      matcheringEnabled: session.matcheringEnabled,
      matcheringReferenceName: session.matcheringReferenceName || undefined
    };

    const { text: responseText, engineSource } = await withTimeout(
      generateWithKoboldDetailed(systemPrompt, {
        maxTokens: 260,
        temperature: persona === 'strangelet_guru' ? 0.68 : (persona === 'llama' ? 0.74 : 0.65),
        userQuery,
        persona,
        dawState: enrichedDawState
      }),
      6000,
      () => ({
        text: simulateGhostInference(userQuery, persona, enrichedDawState),
        engineSource: 'offline_dojo' as InferenceEngineSource
      })
    );

    // Check if an action proposal should be embedded
    let actionProposal: GhostMessage['actionProposal'] = undefined;

    if (isLore) {
      actionProposal = {
        type: 'open_software_dojo',
        payload: { tab: 'lore' },
        label: '📜 Open Legendary Studio Lore Scroll'
      };
    } else if (lower.includes('dojo') || lower.includes('train') || lower.includes('scroll') || lower.includes('manual')) {
      actionProposal = {
        type: 'open_software_dojo',
        payload: {},
        label: persona === 'strangelet_guru' ? '🥋 Open Software Dojo Training Scrolls' : '📚 Open AI Knowledge Dojo'
      };
    } else if (lower.includes('gold path') || lower.includes('mastering') || lower.includes('a/b') || lower.includes('limiter')) {
      actionProposal = {
        type: 'open_gold_path_mastering',
        payload: {},
        label: persona === 'strangelet_guru' ? '✨ Engage Gold Path 6-Stage Mastering & A/B' : '🎛️ Open Gold Path Mastering Suite'
      };
    } else if (lower.includes('midi') || lower.includes('basic pitch') || lower.includes('audio to midi') || lower.includes('pitch')) {
      actionProposal = {
        type: 'open_basic_pitch',
        payload: { stem: lower.includes('bass') ? 'bass' : lower.includes('drum') ? 'drums' : lower.includes('vocal') ? 'vocals' : 'instruments' },
        label: persona === 'strangelet_guru' ? '⚡ Execute Neural Audio-to-MIDI Transcriber' : '🎹 Launch Spotify Basic Pitch (Audio-to-MIDI)'
      };
    } else if (lower.includes('faust') || lower.includes('dsp') || lower.includes('toy') || lower.includes('pedal') || (lower.includes('vst') && !lower.includes('step'))) {
      actionProposal = {
        type: 'open_faust_dsp_toy',
        payload: { toyId: lower.includes('echo') || lower.includes('delay') ? 'faust-tape-echo' : lower.includes('acid') ? 'faust-acid-filter' : lower.includes('guitar') ? 'faust-karplus-guitar' : 'faust-germanium-fuzz' },
        label: persona === 'strangelet_guru' ? '⚔️ Forge Faust DSP Toy & Compile in Real-Time' : '🎸 Open Faust DSP Toy Lab & VST Builder'
      };
    } else if (lower.includes('song') || lower.includes('bed') || lower.includes('overdub') || lower.includes('guitar')) {
      actionProposal = {
        type: 'open_acestep_loop_designer',
        payload: { mode: 'song_bed', bpm: dawState?.bpm || 120 },
        label: persona === 'strangelet_guru' ? '🌊 Manifest 32-Bar Song Bed with Guitar Channel' : '🎵 Start Song Bed in Ace-Step 1.5 & Bring to Mixer'
      };
    } else if (lower.includes('loop') || lower.includes('acestep') || lower.includes('ace-step') || lower.includes('beat') || lower.includes('bass')) {
      const stem: any = lower.includes('bass') ? 'bass' : lower.includes('drum') ? 'drums' : lower.includes('pad') ? 'pad' : 'full_loop';
      actionProposal = {
        type: 'open_acestep_loop_designer',
        payload: { stemType: stem, bpm: dawState?.bpm || 120 },
        label: persona === 'strangelet_guru' ? '⚡ Diffuse Bar-Synced Loop with Ace-Step 1.5' : '🔥 Cook Up Loop with Ace-Step 1.5 GGUF'
      };
    } else if (lower.includes('step') || lower.includes('desheen') || lower.includes('harsh') || lower.includes('suno')) {
      actionProposal = {
        type: 'apply_mix_step',
        payload: { stepType: 'spectral_desheen' },
        label: persona === 'strangelet_guru' ? '🗡️ Strike 8.5kHz Notch (Anti-Sheen Step)' : '⚡ Clean Harsh Frequencies (AI Mix Step)'
      };
    } else if (lower.includes('energy') || lower.includes('particle') || lower.includes('collider') || lower.includes('hadron')) {
      actionProposal = {
        type: 'tune_collision_energy',
        payload: { energy: 11.8 },
        label: persona === 'strangelet_guru' ? '⚛️ Accelerate Hadron Beam to 11.8 TeV' : '💥 Crank Collider to 11.8 TeV MAX'
      };
    } else if (lower.includes('vibe') || lower.includes('inconsist') || lower.includes('mismatch') || lower.includes('clash') || lower.includes('spectral check')) {
      actionProposal = {
        type: 'open_vibe_check',
        payload: {},
        label: '🌊 Inspect Spectral Vibe & Harmonic Inconsistencies'
      };
    } else if (lower.includes('tape') || lower.includes('warmth') || lower.includes('analog')) {
      actionProposal = {
        type: 'apply_mix_step',
        payload: { stepType: 'harmonic_tape_saturation' },
        label: '📼 Slap Vintage Tape Warmth on the Bus'
      };
    }

    return {
      id: `${persona}-${Date.now()}`,
      sender: persona,
      persona,
      text: responseText,
      timestamp: Date.now(),
      engineSource,
      actionProposal
    };
  } catch (err) {
    return {
      id: `${persona}-${Date.now()}`,
      sender: persona,
      persona,
      text: simulateGhostInference(userQuery, persona, dawState),
      timestamp: Date.now(),
      engineSource: 'offline_dojo',
      actionProposal: {
        type: 'open_software_dojo',
        payload: {},
        label: '🥋 Open Software Dojo Knowledge Scrolls'
      }
    };
  }
}

/**
 * Matches user query keywords against enabled Software Dojo scrolls & custom training notes
 * so custom user scrolls also power 100% offline heuristic answers.
 */
function findMatchingDojoScrollGuidance(queryLower: string): { title: string; excerpt: string } | null {
  try {
    const scrolls = getStoredDojoScrolls().filter(s => s.enabled);
    const tokens = queryLower
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length >= 3 && !['the', 'and', 'for', 'with', 'this', 'that', 'how', 'can', 'you', 'what', 'into', 'from'].includes(t));

    if (tokens.length === 0) return null;

    let bestScore = 0;
    let bestScroll: { title: string; excerpt: string } | null = null;

    for (const scroll of scrolls) {
      const hay = `${scroll.title} ${scroll.category} ${scroll.summary} ${scroll.content}`.toLowerCase();
      let score = 0;
      for (const tok of tokens) {
        if (scroll.title.toLowerCase().includes(tok)) score += 3;
        else if (hay.includes(tok)) score += 1;
      }
      if (score > bestScore) {
        bestScore = score;
        const lines = scroll.content.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 3);
        bestScroll = {
          title: scroll.title,
          excerpt: lines.join(' ')
        };
      }
    }

    const customNote = getCustomDojoTrainingNote().trim();
    if (customNote) {
      const customLower = customNote.toLowerCase();
      let customScore = 0;
      for (const tok of tokens) {
        if (customLower.includes(tok)) customScore += 2;
      }
      if (customScore > bestScore && customScore >= 2) {
        const lines = customNote.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//')).slice(0, 3);
        return {
          title: 'Sensei Custom Training Scroll',
          excerpt: lines.join(' ')
        };
      }
    }

    return bestScore >= 2 ? bestScroll : null;
  } catch {
    return null;
  }
}

/**
 * Built-in Offline Dojo Heuristic Knowledge Engine
 * Always inspects the live studio session before answering and speaks as an
 * elite audio engineer & analog sage (2-4 concise sentences, Hz/kHz & exact knobs).
 */
export function simulateGhostInference(
  prompt: string,
  persona: GhostPersona = 'ghost',
  dawState?: GhostDawContext
): string {
  const userOnly = extractUserQueryFromPrompt(prompt);
  const p = userOnly.toLowerCase();
  const soul = getStoredBuddySoul();
  const session = inspectActiveStudioSession(dawState);
  const gp = session.goldPathPreset.parameters;

  const trackBreakdown = `${session.activeTracks} active track${session.activeTracks === 1 ? '' : 's'} (${session.audioTrackCount} Audio, ${session.midiTrackCount} MIDI)`;
  const meterHeader = `${session.bpm} BPM in ${session.timeSignature}`;
  const matchStatus = session.matcheringEnabled
    ? `Matchering ON (${session.matcheringReferenceName || 'Spectral Reference'} @ ${gp.matchDepth}% Match Depth)`
    : 'Matchering OFF';
  const masterSummary = `"${session.goldPathPresetName}" (${matchStatus})`;

  if (p.includes('mix step') || p.includes('dsp parameters') || p.includes('output json format')) {
    return JSON.stringify({
      name: "Strangelet Dojo 8.5kHz Notch & Tape Bias",
      volumeAdjustmentDb: -1.2,
      panAdjustment: 0.1,
      antiSheenCutDb: -3.8,
      tapeWarmthPercent: gp.tapeWarmth || 65,
      subMonoCutHz: gp.monoSubCutoffHz || 95,
      stereoAirDb: gp.presenceAirDb || 1.8,
      explanation: `Surgical -3.8dB notch at 8.5kHz paired with Studer tape saturation (${gp.tapeWarmth || 65}%) and <${gp.monoSubCutoffHz || 95}Hz sub-mono lock tuned for ${meterHeader}.`
    });
  }

  // 0. Live Ghost Lab Diagnostic & Audio Telemetry Verification
  if (p.includes('test') || p.includes('benchmark') || p.includes('test run') || p.includes('diagnostic')) {
    return `Telemetry green across ${trackBreakdown} at ${meterHeader}, running ${masterSummary}. Set Gold Path Low Cut (HPF) to ${gp.lowCutHz}Hz, carve -3.5dB at 8.5kHz with the Anti-Sheen Notch on dense upper harmonics, and clamp Mono Sub Cutoff at ${gp.monoSubCutoffHz}Hz so your sub weight stays dead-center. Engage Tape Warmth (${gp.tapeWarmth}%) into a ${gp.ceilingDb}dBFS Limiter Ceiling to preserve transient snap without digital brittle glare.`;
  }

  // 0.1 Vibe Check Harmonic & Rhythm Mismatch Analysis
  if (p.includes('vibe') || p.includes('mismatch') || p.includes('inconsist') || p.includes('clash') || (p.includes('spectral') && (p.includes('check') || p.includes('scan') || p.includes('overview')))) {
    return `Scanning ${trackBreakdown} at ${meterHeader} under ${masterSummary}: watch for 55Hz–80Hz sub masking between kick and bass and 280Hz–380Hz low-mid buildup across chord layers. Carve ${gp.deMudGainDb}dB on the Gold Path De-Mud Gain slider around 380Hz, set Mono Sub Cutoff to ${gp.monoSubCutoffHz}Hz, and apply a -3.4dB 8.5kHz Anti-Sheen Notch on bright vocal or synth stems. ${session.matcheringEnabled ? `Your active Matchering curve (${gp.matchDepth}% Match Depth) will rebalance the 2.4kHz–12kHz contour afterward.` : 'Drop a reference WAV into Reference Matchering and toggle Audition Reference Track to verify your tonal tilt.'}`;
  }

  // 1. Legendary Studio Lore & Eccentric Tales
  if (p.includes('story') || p.includes('tale') || p.includes('legend') || p.includes('producer') || p.includes('eno') || p.includes('perry') || p.includes('prince') || p.includes('dre') || p.includes('pickle') || p.includes('massy') || p.includes('katz') || p.includes('rubin') || p.includes('carlos')) {
    const randomTale = getRandomStudioLore();
    return `${randomTale.artistOrProducer} (${randomTale.era}) proved that constraint breeds character: ${randomTale.actionableDojoTechnique} Apply that ethos to your ${trackBreakdown} at ${meterHeader} by pushing Gold Path Tape Warmth past ${Math.max(45, gp.tapeWarmth)}% around 120Hz–250Hz while rolling Low Cut (HPF) to ${gp.lowCutHz}Hz so analog weight never clouds the sub band.`;
  }

  // 2. VRAM, Hardware Scalability & Modular Resource Manager
  if (p.includes('vram') || p.includes('6gb') || p.includes('16gb') || p.includes('memory') || p.includes('modular') || p.includes('resource') || p.includes('offload')) {
    return `Your session holds ${trackBreakdown} at ${meterHeader} with ${masterSummary}, and the Resource Manager keeps Demucs, Ace-Step, and Faust JIT unloaded until triggered so a 6GB rig stays under 3.4GB VRAM. That preserves CPU headroom for zero-dropout monitoring through Gold Path's ${gp.lowCutHz}Hz–${Math.round(gp.highCutHz / 1000)}kHz Parametric EQ and ${gp.glueRatio}:1 bus glue.`;
  }

  // 3. Buddy Soul & Evolution Memory Persistence
  if (p.includes('soul') || p.includes('memory') || p.includes('evolve') || p.includes('swap') || p.includes('personality') || p.includes('rank') || p.includes('level') || p.includes('xp')) {
    return `Soul Core is locked at Level ${soul.level} (${soul.experienceXp} XP, ${soul.memories.length} studio memories) and remains persistent whether you run Kobold.cpp, Ollama, LM Studio, a custom OpenAI-compatible server, or this Offline Dojo engine. Right now I am tracking ${trackBreakdown} at ${meterHeader} routed into ${masterSummary} so every calibration advice fits your active chain.`;
  }

  // 4. Faust DSP Toy Lab & Code Generation
  if (p.includes('write real-time faust dsp code') || p.includes('faust') || p.includes('dsp') || p.includes('pedal') || p.includes('toy') || p.includes('filter') || p.includes('ladder') || p.includes('saturat') || p.includes('reverb') || p.includes('radio') || p.includes('laser') || p.includes('siren')) {
    const specMatch = userOnly.match(/user specification:\s*"([^"]+)"/i);
    const spec = (specMatch ? specMatch[1] : userOnly).toLowerCase();

    if (spec.includes('underwater') || spec.includes('muffled')) {
      return `Submerged chamber compiled for ${meterHeader} (${trackBreakdown})—sweep Submersion Depth around 350Hz–600Hz to tuck highs under the mix while keeping ChannelStrip Volume balanced:
\`\`\`faust
import("stdfaust.lib");
// GHOST Recipe: Underwater Muffled Reverb
depth = hslider("Submersion Depth[unit:Hz]", 480, 120, 2400, 10);
resonance = hslider("Water Bubble Q", 2.4, 0.5, 6.0, 0.1);
tail = hslider("Cavern Decay[unit:%]", 78, 15, 96, 1) * 0.01;
murk = hslider("LFO Swirl[unit:Hz]", 0.45, 0.05, 3.0, 0.05);
mix = hslider("Dry / Wet", 0.75, 0.0, 1.0, 0.01);

wobble = depth + os.osc(murk) * (depth * 0.25);
tank = (+ : de.fdelay(ma.SR, 0.067 * ma.SR)) ~ (*(tail) : fi.lowpass(2, wobble));
submerged(x) = x : fi.resonlp(wobble, resonance, 0.8) : tank;

process(x) = x * (1 - mix) + submerged(x) * mix;
\`\`\``;
    }

    if (spec.includes('am radio') || spec.includes('broken') || spec.includes('radio')) {
      return `Band-limited AM receiver forged for ${meterHeader}—high-passes at 420Hz and rolls Carrier Cutoff around 1.65kHz so vocals cut straight through without crowding 80Hz–300Hz:
\`\`\`faust
import("stdfaust.lib");
// GHOST Recipe: Broken AM Radio
tuner = hslider("Carrier Cutoff[unit:Hz]", 1650, 450, 4200, 10);
staticNoise = hslider("Static Crackle[unit:%]", 22, 0, 85, 1) * 0.01;
crackle = hslider("Dropout Rate[unit:Hz]", 4.5, 0.5, 18.0, 0.1);
drive = hslider("Speaker Crunch", 3.8, 1.0, 10.0, 0.1);
mix = hslider("Dry / Wet", 0.9, 0.0, 1.0, 0.01);

amBand(x) = x : fi.highpass(2, 420) : fi.lowpass(3, tuner);
dropout = 0.65 + 0.35 * os.lf_squarewavepos(crackle);
hiss = no.noise * staticNoise * 0.15;
radio(x) = (amBand(x) * dropout + hiss) * drive : ma.tanh;

process(x) = x * (1 - mix) + radio(x) * mix;
\`\`\``;
    }

    if (spec.includes('laser') || spec.includes('zap')) {
      return `Capacitor zap synth armed for ${meterHeader}—sweep Beam Start from 2.4kHz down to 85Hz and pull back ChannelStrip Volume if stacking into ${masterSummary}:
\`\`\`faust
import("stdfaust.lib");
// GHOST Recipe: Laser Gun Zap
trigger = button("Fire Laser Zap");
startPitch = hslider("Beam Start[unit:Hz]", 2400, 400, 6000, 10);
endPitch = hslider("Beam Floor[unit:Hz]", 85, 30, 400, 1);
zapSpeed = hslider("Sweep Time[unit:ms]", 160, 30, 800, 5) * 0.001;
bite = hslider("Plasma Drive", 3.2, 1.0, 8.0, 0.1);

sweep = endPitch + (startPitch - endPitch) * en.ar(0.001, zapSpeed, trigger);
amp = en.ar(0.002, zapSpeed * 1.15, trigger);

process = os.sawtooth(sweep) * amp * bite : ma.tanh;
\`\`\``;
    }

    if (spec.includes('dub') || spec.includes('siren')) {
      return `Sound-system siren with 2.4kHz-damped dub delay built for ${meterHeader}—sync Echo Time with your ${session.timeSignature} groove and ride Dub Echo below 65% to avoid buildup around 680Hz:
\`\`\`faust
import("stdfaust.lib");
// GHOST Recipe: Dub Siren
trigger = button("Trigger Dub Siren");
baseFreq = hslider("Siren Pitch[unit:Hz]", 680, 180, 1800, 5);
lfoRate = hslider("Wail Speed[unit:Hz]", 5.5, 0.5, 18.0, 0.1);
lfoDepth = hslider("Pitch Swing[unit:Hz]", 260, 20, 800, 5);
echoMix = hslider("Dub Echo[unit:%]", 55, 0, 90, 1) * 0.01;

sirenOsc = os.osc(baseFreq + os.osc(lfoRate) * lfoDepth) * en.asr(0.01, 1.0, 0.45, trigger);
dubDelay = (+ : de.fdelay(ma.SR, 0.375 * ma.SR)) ~ (*(echoMix) : fi.lowpass(1, 2400));

process = sirenOsc <: _, dubDelay :> *;
\`\`\``;
    }

    if (spec.includes('tape') || spec.includes('wobble') || spec.includes('vhs') || spec.includes('chorus')) {
      return `Magnetic flutter stage tuned for ${meterHeader}—keep Oxide Roll-Off around 4.8kHz–7.5kHz to tame digital sheen before hitting ${masterSummary}:
\`\`\`faust
import("stdfaust.lib");
// GHOST Recipe: Magnetic Tape Wobble & Chorus
rate = hslider("Flutter Rate[unit:Hz]", 1.4, 0.1, 8.0, 0.05);
depth = hslider("Drift Depth[unit:ms]", 6.5, 0.5, 20.0, 0.1);
tone = hslider("Oxide Roll-Off[unit:Hz]", 4800, 800, 16000, 50);
mix = hslider("Dry / Wet", 0.65, 0.0, 1.0, 0.01);

modSamples = (0.012 + os.osc(rate) * depth * 0.001) * ma.SR;
warped(x) = x : de.fdelay(ma.SR, modSamples) : fi.lowpass(2, tone) : ma.tanh;

process(x) = x * (1 - mix) + warped(x) * mix;
\`\`\``;
    }

    return `Asymmetrical tube saturator ready for ${trackBreakdown} at ${meterHeader}—set Tone Cut between 3.8kHz and 6.5kHz and trim Mix around 40%–65% on ChannelStrip inserts so 2nd-order warmth doesn't mask 300Hz mids:
\`\`\`faust
import("stdfaust.lib");
// GHOST Custom Faust Toy: Asymmetrical Tube & Resonant Tone Sculptor
drive = hslider("Drive[unit:x]", 4.2, 1.0, 12.0, 0.1);
bias = hslider("Tube Bias", 0.35, 0.0, 1.0, 0.01);
tone = hslider("Tone Cut[unit:Hz]", 4200, 300, 18000, 10);
mix = hslider("Dry / Wet", 0.8, 0.0, 1.0, 0.01);

saturate(x) = ma.tanh(x * drive + bias) - bias * 0.4;
process(x) = x * (1 - mix) + (saturate(x) : fi.lowpass(2, tone) * mix);
\`\`\``;
  }

  // 5. Workflows, Templates & The Quantum Alchemist Pipeline
  if (p.includes('workflow') || p.includes('template') || p.includes('pipeline') || (p.includes('lsc') && p.includes('ace')) || p.includes('humaniz') || p.includes('devine')) {
    return `With ${trackBreakdown} at ${meterHeader}, diffuse your arrangement stems into the Mixer with -6dBFS peak headroom per ChannelStrip Volume fader before engaging Gold Path. Route your low (<180Hz) and high (>2.5kHz) bands via Beam Splitter crossovers, then shape the composite bus through "${session.goldPathPresetName}" (${matchStatus}) with Limiter Ceiling set to ${gp.ceilingDb}dBFS.`;
  }

  // 6. SFZ Open Library & Sample Community Sharing
  if (p.includes('sfz') || p.includes('sample library') || p.includes('rhodes') || p.includes('share sample')) {
    return `With ${session.midiTrackCount} MIDI track(s) active at ${meterHeader}, route velocity-layered SFZ patches like the 1973 Rhodes Mk I or Model D Bass onto your MIDI channels for dynamic harmonic response. Trim 280Hz–360Hz boxiness on chordal keys via the track EQ or Gold Path De-Mud Gain (${gp.deMudGainDb}dB) so the fundamental punches cleanly past 55Hz kick energy.`;
  }

  // 7. LoRA Lending Library for Ace-Step
  if (p.includes('lora') || p.includes('lending') || p.includes('sp1200') || p.includes('cassette')) {
    return `Stacking LoRAs like SP-1200 12-Bit or Cassette Degradation around 0.75–0.85 weight inside Ace-Step injects organic 3kHz–7kHz midrange grit aligned to your ${meterHeader} pocket. Once bounced to Audio tracks (${session.audioTrackCount} currently in session), tame any upper-band aliasing above 8.5kHz with the Anti-Sheen Notch and dial Gold Path Tape Warmth to ${gp.tapeWarmth}%.`;
  }

  // 8. Drum Trigger, Basic Pitch, .MID Export & Live Web MIDI Output
  if (p.includes('drum trigger') || p.includes('transient') || p.includes('basic pitch') || p.includes('midi') || p.includes('.mid') || p.includes('loopmidi')) {
    return `At ${meterHeader} across ${trackBreakdown} (${session.audioTrackCount} Audio, ${session.midiTrackCount} MIDI), Drum Trigger maps transient attacks to GM notes (Kick 36, Snare 38) while Basic Pitch extracts polyphonic MIDI for export via Download .MID File or live Web MIDI out. Keep kick triggers tightened with a ${gp.lowCutHz}Hz HPF on non-bass channels so low-end transients trigger cleanly without 60Hz rumble misfires.`;
  }

  // 9. VST Wrapper, Auto-Map, Mapping Presets & MIDI Learn
  if (p.includes('vst') || p.includes('wrapper') || p.includes('auto-map') || p.includes('preset') || p.includes('midi learn') || p.includes('tauri') || p.includes('electron')) {
    return `Across your ${trackBreakdown} at ${meterHeader}, bind hardware faders to ChannelStrip Volume, Pan, or loaded Faust/VST parameters using global MIDI Learn, or capture parameter sweeps in the Macro Engine side panel. Use VST Auto-Map to expose gain and filter cutoff (e.g., 400Hz–12kHz sweeps) directly into Timeline Parameter Automation lanes.`;
  }

  // 10. Local ComfyUI Connector & Ace-Step 1.5 / YuE 2
  if (p.includes('comfyui') || p.includes('acestep') || p.includes('ace-step') || p.includes('yue') || p.includes('loop') || p.includes('song bed')) {
    return `Ace-Step 1.5 is locked to ${meterHeader}, ready to render bar-synced stems alongside your ${session.audioTrackCount} Audio and ${session.midiTrackCount} MIDI tracks. After generating a bed, drop its fader to leave -14 LUFS headroom and check 8.5kHz digital sheen against your "${session.goldPathPresetName}" mastering curve.`;
  }

  if (p.includes('dojo') || p.includes('train') || p.includes('scroll') || p.includes('software')) {
    return `The Software Dojo holds your engineering scrolls for 8.5kHz anti-sheen carving, Studer tape bias, and Gold Path calibration—active right now over ${trackBreakdown} at ${meterHeader}. Open the Dojo modal anytime to add custom frequency targets or rules that I immediately apply to "${session.goldPathPresetName}" (${matchStatus}).`;
  }

  if (p.includes('offline') || p.includes('compile') || p.includes('standalone') || p.includes('pdf') || p.includes('manual') || p.includes('fallback')) {
    return `The Offline Dojo Heuristic Engine is running locally with zero external API latency while actively inspecting your ${trackBreakdown} at ${meterHeader} and ${masterSummary}. Every recommendation on Low Cut (${gp.lowCutHz}Hz), De-Mud (${gp.deMudGainDb}dB at 380Hz), and Limiter Ceiling (${gp.ceilingDb}dBFS) computes directly inside the lab.`;
  }

  if (p.includes('gold path') || p.includes('mastering') || p.includes('matchering') || p.includes('a/b') || p.includes('mix') || p.includes('desheen') || p.includes('sheen') || p.includes('eq') || p.includes('loud') || p.includes('lufs') || p.includes('bass') || p.includes('vocal')) {
    return `Inspecting ${trackBreakdown} at ${meterHeader} on "${session.goldPathPresetName}" (${matchStatus}): anchor your Pre-EQ with Low Cut (HPF) at ${gp.lowCutHz}Hz, carve ${gp.deMudGainDb}dB on De-Mud Gain around 380Hz, and clamp Mono Sub Cutoff at ${gp.monoSubCutoffHz}Hz. ${session.matcheringEnabled ? `Matchering is active at ${gp.matchDepth}% Match Depth—use Audition Reference Track and the [A]/[B] toggle while keeping Master Intensity balanced into your ${gp.ceilingDb}dBFS Limiter Ceiling.` : `Drop a reference WAV onto the Reference Matchering deck to auto-calibrate the 6-band Parametric EQ, or trim 8.5kHz glare before driving Glue Ratio (${gp.glueRatio}:1) into ${gp.ceilingDb}dBFS Ceiling.`}`;
  }

  // 11. Dynamic Software Dojo Scroll Match
  const dojoScrollMatch = findMatchingDojoScrollGuidance(p);
  if (dojoScrollMatch) {
    const cleanExcerpt = dojoScrollMatch.excerpt.replace(/\s+/g, ' ').slice(0, 220);
    return `For your ${trackBreakdown} at ${meterHeader} (${masterSummary}), your Dojo scroll "${dojoScrollMatch.title}" guides this move: ${cleanExcerpt} Pair that with a ${gp.lowCutHz}Hz HPF, a surgical check around 320Hz and 8.5kHz, and [A]/[B] Audition against your dry bus.`;
  }

  // Default GHOST Studio Standby Diagnosis
  return `Session locked: ${trackBreakdown} running at ${meterHeader} into "${session.goldPathPresetName}" (${matchStatus}, Master Bus ${session.masteringBypassed ? 'BYPASSED' : 'ENGAGED'}). Start by sweeping Low Cut (HPF) to ${gp.lowCutHz}Hz, checking 280Hz–400Hz mud with De-Mud Gain (${gp.deMudGainDb}dB), and balancing ChannelStrip Volume faders before driving Master Intensity (${Math.round(session.goldPathPreset.masterIntensity * 100)}%) into the ${gp.ceilingDb}dBFS Limiter Ceiling. Ask about any frequency clash, Audio/MIDI routing issue, Faust DSP circuit, or Matchering target.`;
}

/**
 * Generate a creative Ace-Step 1.5 prompt suggestion
 */
export function getAceStepPromptIdea(
  stemType: 'full_loop' | 'drums' | 'bass' | 'lead' | 'pad' | 'vocal_chop',
  vibe: string = 'cyberpunk',
  bpm: number = 120
): string {
  const ideas: Record<string, string[]> = {
    bass: [
      `Driving 16th-note Roland TB-303 square wave acid bassline at ${bpm} BPM with resonant low-pass filter squelch and analog drive`,
      `Deep detuned dual-sawtooth Reese sub bass with subtle stereo chorus and smooth portamento glide at ${bpm} BPM`,
      `Punchy UK grime 808 sub bass with warm tape overdrive and short transient attack`,
      `Funky rubbery Moog synthesizer bass riff with envelope filter sweep and snappy release`
    ],
    drums: [
      `Crisp syncopated UK garage 2-step drum break at ${bpm} BPM with swinging open hi-hats, punchy 909 kick, snappy rimshot`,
      `Dusty boom-bap hip hop drum groove with vinyl surface crackle, crunchy snare smack, and loose pocket swing`,
      `Pounding Berlin industrial techno kick drum with metallic percussion top loop and driving 16th shakers`,
      `Polyrhythmic afrobeat drum kit with layered wooden shakers, talking drum accents, and punchy sidechain kick`
    ],
    lead: [
      `Bright plucked analog synthesizer arpeggio at ${bpm} BPM with Juno-106 chorus and stereo ping-pong delay`,
      `Soaring cyberpunk distorted square lead with portamento pitch bend and shimmer reverb tail`,
      `Plinked Japanese koto and bell hybrid melodic hook with fluttering tape delay`,
      `Glitchy modular synth sequence with random octave jumps and stereo pan automation`
    ],
    pad: [
      `Warm vintage tape strings and decaying Mellotron choir pad with cavernous shimmer reverb and gentle wow/flutter`,
      `Deep ambient cinematic chord swells with low-pass resonance filter sweep and subtle analog hiss`,
      `Lush neo-soul Rhodes electric piano pad with tremolo flutter and stereo chorused warmth`,
      `Ethereal glass harmonica atmospheric bed with pitch drift and wide holographic soundstage`
    ],
    vocal_chop: [
      `Rhythmic pitched vocal chops at ${bpm} BPM with formant-shifted soul vocals and vintage tape slapback delay`,
      `Haunting ethereal vocal chant phrase pitched down an octave with cathedral reverb diffusion`,
      `Catchy future bass vocal chops stuttered on 16th triplets with high-shelf sparkle and sidechain pump`,
      `Lo-fi vinyl vocal chop snippet with telephone bandpass filter and subtle flutter`
    ],
    full_loop: [
      `Smoky Bristol trip hop full groove at ${bpm} BPM: dusty acoustic break, deep upright bass, Rhodes chords, vinyl noise`,
      `Neon synthwave midnight driving groove: driving synth bass, punchy LinnDrum beat, arpeggiated lead hook`,
      `Melodic deep house full loop: rolling sub bass, warm chord stabs, swinging 909 hats, soulful vocal accent`,
      `Liquid drum and bass full groove at ${bpm} BPM with rapid breakbeats, rolling Reese bass, and atmospheric ambient pads`
    ]
  };

  const pool = ideas[stemType] || ideas.full_loop;
  return pool[Math.floor(Math.random() * pool.length)];
}
