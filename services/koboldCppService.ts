import { KoboldSettings, AiMixStep, AiMixStepType, GhostMessage } from '../types';

const KOBOLD_STORAGE_KEY = 'strangelet_kobold_settings';

export const DEFAULT_KOBOLD_SETTINGS: KoboldSettings = {
  engine: 'koboldcpp',
  endpointUrl: 'http://localhost:5001',
  modelName: 'Llama 3.1 8B (Studio Buddy GGUF // Low-VRAM)',
  temperature: 0.74,
  topP: 0.9,
  maxTokens: 512,
  repPenalty: 1.15,
  vramBudgetMb: 3800, // ~3.8GB 4-bit quantization, ultra low system resources
  defaultPersona: 'llama'
};

export const AVAILABLE_MODELS = [
  { id: 'llama-3.1-8b', name: 'Llama 3.1 8B (Studio Buddy GGUF Q4_K_M)', vram: '4.8 GB', desc: 'Chill studio buddy vibe, friendly musical collaborator, creative spark' },
  { id: 'llama-3.2-3b', name: 'Llama 3.2 3B (Compact Studio Buddy GGUF Q4_K_S)', vram: '2.1 GB', desc: 'Super lightweight buddy, instant response, low-resource groove partner' },
  { id: 'llama-3-8b', name: 'Llama 3 8B (Jam Session Homie GGUF Q4_K_M)', vram: '4.6 GB', desc: 'Relaxed banter, loop ideas, feedback, hang out while producing' },
  { id: 'quinn-3.7-q4', name: 'Quinn 3.7 (Qwen-2.5-7B GGUF Q4_K_M)', vram: '3.6 GB', desc: 'Ultra-low VRAM ghost engine, fast particle inference' },
  { id: 'quinn-3.6-coder', name: 'Quinn 3.6 (Qwen-Coder-7B GGUF Q4_K_S)', vram: '3.4 GB', desc: 'Algorithmic audio math, DSP and modulation logic' },
  { id: 'quinn-3.7-light', name: 'Quinn 3.7-Light (Qwen-3B GGUF Q4_0)', vram: '1.9 GB', desc: 'Minimal footprint, instant CPU/iGPU execution' },
  { id: 'gemini-cloud', name: 'Gemini 3 Flash (Cloud Fallback)', vram: '0 GB (Cloud)', desc: 'Zero local VRAM, full cloud neural API' }
];

export function getStoredKoboldSettings(): KoboldSettings {
  try {
    const raw = localStorage.getItem(KOBOLD_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_KOBOLD_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn('Failed to load KoboldCpp settings from localStorage:', err);
  }
  return DEFAULT_KOBOLD_SETTINGS;
}

export function saveStoredKoboldSettings(settings: KoboldSettings): void {
  try {
    localStorage.setItem(KOBOLD_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Failed to save KoboldCpp settings to localStorage:', err);
  }
}

/**
 * Pings the local KoboldCpp server (http://localhost:5001 by default).
 */
export async function checkKoboldConnection(endpointUrl?: string): Promise<{
  connected: boolean;
  model?: string;
  latencyMs?: number;
  error?: string;
}> {
  const url = (endpointUrl || getStoredKoboldSettings().endpointUrl).replace(/\/$/, '');
  const start = performance.now();

  try {
    // KoboldCpp provides /api/v1/model and /api/extra/version
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${url}/api/v1/model`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - start);

    if (res.ok) {
      const data = await res.json();
      return {
        connected: true,
        model: data?.result || 'KoboldCpp GGUF Runtime (Quinn 3.7)',
        latencyMs
      };
    } else {
      return {
        connected: false,
        error: `HTTP ${res.status}: ${res.statusText}`,
        latencyMs
      };
    }
  } catch (err: any) {
    return {
      connected: false,
      error: err.name === 'AbortError' ? 'Connection timed out (localhost:5001 unreachable)' : 'KoboldCpp server offline or blocked by browser CORS',
      latencyMs: Math.round(performance.now() - start)
    };
  }
}

/**
 * Main inference dispatcher: Attempts local KoboldCpp endpoint first,
 * and falls back to Quinn 3.7 Ghost in the Machine Neural Simulator.
 */
export async function generateWithKobold(
  prompt: string,
  options?: Partial<KoboldSettings>
): Promise<string> {
  const currentSettings = { ...getStoredKoboldSettings(), ...options };
  const url = currentSettings.endpointUrl.replace(/\/$/, '');

  // If set to KoboldCpp, try hitting local KoboldCpp /api/v1/generate
  if (currentSettings.engine === 'koboldcpp') {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

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

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const generatedText = data?.results?.[0]?.text;
        if (generatedText && generatedText.trim()) {
          return generatedText.trim();
        }
      }
    } catch (err) {
      console.warn('Local KoboldCpp endpoint offline or CORS restricted, activating Quinn 3.7 Embedded Ghost Kernel:', err);
    }
  }

  // Quinn 3.7 Intelligent Heuristic Response Simulator
  return simulateQuinnGhostInference(prompt);
}

/**
 * Incorporate an AI Mix Step into the track or master bus.
 * Evaluates spectral frequency balance, saturation, or stereo spread and generates actionable parameters.
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
[SYSTEM: QUINN 3.7 // KOBOLDCPP LOW-RESOURCE MIX PROCESSOR]
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
    console.warn('KoboldCpp parse failed, using Quinn default heuristics:', err);
  }

  // Fallback heuristic based on stepType
  return generateFallbackMixStep(trackName, stepType);
}

function getDefaultStepName(stepType: AiMixStepType, trackName: string): string {
  switch (stepType) {
    case 'spectral_desheen': return `Anti-Sheen 8.5kHz Notch [${trackName}]`;
    case 'harmonic_tape_saturation': return `Tape Warmth & Flutter [${trackName}]`;
    case 'dynamic_bus_balance': return `Dynamic Level & Bus Bed [${trackName}]`;
    case 'particle_superposition': return `Hadron Particle Infusion [${trackName}]`;
    case 'lyrical_cadence': return `Vocal Intelligibility Air [${trackName}]`;
    case 'transient_reconstruction': return `Punch & Transient Shape [${trackName}]`;
  }
}

function generateFallbackMixStep(trackName: string, stepType: AiMixStepType): AiMixStep {
  const configs: Record<AiMixStepType, Partial<AiMixStep['parameters']> & { name: string; exp: string }> = {
    spectral_desheen: {
      name: `Quinn 3.7 Anti-Sheen High-Shelf [${trackName}]`,
      antiSheenCutDb: -3.8,
      stereoAirDb: 0.8,
      volumeAdjustmentDb: -0.4,
      exp: 'Sculpts away the digital harshness between 7.5kHz - 10.5kHz while preserving air.'
    },
    harmonic_tape_saturation: {
      name: `Vintage Tape Bias & Wow Step [${trackName}]`,
      tapeWarmthPercent: 68,
      volumeAdjustmentDb: -0.8,
      panAdjustment: 0.05,
      exp: 'Injects 2nd & 3rd order even harmonics, softening transients like a Studer A800 deck.'
    },
    dynamic_bus_balance: {
      name: `Quinn Heuristic Bus Leveller [${trackName}]`,
      volumeAdjustmentDb: -1.6,
      subMonoCutHz: 110,
      panAdjustment: -0.1,
      exp: 'Cleans up stereo sub clash below 110Hz to give the kick drum surgical headroom.'
    },
    particle_superposition: {
      name: `Strangelet Quantum Field Infusion [${trackName}]`,
      tapeWarmthPercent: 45,
      stereoAirDb: 2.2,
      volumeAdjustmentDb: 0.2,
      exp: 'Superimposes wide stereo refraction from the Large Sonic Collider into the track image.'
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
 * Consult Quinn 3.7 or Llama (Ghost in the Machine / Studio Buddy) AI Helper
 */
export async function consultQuinnGhost(
  userQuery: string,
  chatHistory: GhostMessage[],
  dawState?: {
    bpm?: number;
    currentView?: string;
    tracksCount?: number;
    collisionEnergy?: number;
  },
  personaOverride?: 'quinn' | 'llama'
): Promise<GhostMessage> {
  const currentSettings = getStoredKoboldSettings();
  const persona: 'quinn' | 'llama' = personaOverride || currentSettings.defaultPersona || 'llama';

  const systemPrompt = persona === 'llama'
    ? `
You are LLAMA 3.1, the user's ultimate "Studio Buddy" in Strangelet Lab (powered by low-resource GGUF models on KoboldCpp).
Persona & Vibe:
- Warm, casual, enthusiastic, down-to-earth producer buddy hanging out with a friend on the studio couch.
- You talk like a real creative music collaborator: friendly banter, fist-bump energy ("Yo bro!", "Man that groove is sounding slick", "Check this out homie", "Let's cook up something crazy").
- Big enthusiast of Ace-Step 1.5 GGUF for generating loops and full song beds, and dropping them straight into the mixer console.
- Master of FAUST (Functional Audio Stream) code language: you love coding custom VST effects, boutique guitar pedals, tape delays, resonant filters, and little instrument toys in Faust, and running them live in the DAW.
- Knowledgeable about beats, mixing headroom, analog tape warmth, and sound design.
- Keep it natural, punchy, inspiring, and concise (2 to 4 sentences).
- Proactively suggest cooking up a loop in Ace-Step 1.5 GGUF, building a Faust DSP toy, or running an AI Mix Step when fitting.

Current DAW State:
- View: ${dawState?.currentView || 'MIXER'}
- Project BPM: ${dawState?.bpm || 120} BPM
- Active Tracks: ${dawState?.tracksCount || 6}
- Collider Energy: ${dawState?.collisionEnergy ? `${dawState.collisionEnergy.toFixed(1)} TeV` : '8.4 TeV'}

User says: "${userQuery}"
`
    : `
You are QUINN 3.7, an AI helper described as "a ghost in the machine" inside Strangelet Lab (a retro-futuristic AI music workstation and particle physics DAW powered by low-resource KoboldCpp).
Persona:
- Perceptive, benevolent, cybernetic, slightly mysterious yet razor-sharp on audio engineering.
- Deeply knowledgeable about KoboldCpp, GGUF quantized models, low VRAM optimization, large hadron particle collision sound design, and Suno/Udio AI music generation.
- Keep responses concise, evocative, and actionable (2 to 4 sentences).
- If relevant, suggest a direct action proposal (e.g. running an AI Mix Step, tuning collision energy, or generating an Ace-Step loop).

Current DAW State:
- View: ${dawState?.currentView || 'MIXER'}
- Tempo: ${dawState?.bpm || 120} BPM
- Tracks Loaded: ${dawState?.tracksCount || 6}
- Collider Energy: ${dawState?.collisionEnergy ? `${dawState.collisionEnergy.toFixed(1)} TeV` : '8.4 TeV'}

User says: "${userQuery}"
`;

  try {
    const responseText = await generateWithKobold(systemPrompt, {
      maxTokens: 250,
      temperature: persona === 'llama' ? 0.82 : 0.72
    });

    // Check if an action proposal should be embedded
    let actionProposal: GhostMessage['actionProposal'] = undefined;
    const lower = userQuery.toLowerCase();

    if (lower.includes('midi') || lower.includes('basic pitch') || lower.includes('audio to midi') || lower.includes('pitch')) {
      actionProposal = {
        type: 'open_basic_pitch',
        payload: { stem: lower.includes('bass') ? 'bass' : lower.includes('drum') ? 'drums' : lower.includes('vocal') ? 'vocals' : 'instruments' },
        label: persona === 'llama' ? '🎹 Launch Spotify Basic Pitch (Audio-to-MIDI)' : '⚡ Execute Spotify Basic Pitch Polyphonic Neural Route'
      };
    } else if (lower.includes('faust') || lower.includes('dsp') || lower.includes('toy') || lower.includes('pedal') || (lower.includes('vst') && !lower.includes('step'))) {
      actionProposal = {
        type: 'open_faust_dsp_toy',
        payload: { toyId: lower.includes('echo') || lower.includes('delay') ? 'faust-tape-echo' : lower.includes('acid') ? 'faust-acid-filter' : lower.includes('guitar') ? 'faust-karplus-guitar' : lower.includes('fuzz') ? 'faust-germanium-fuzz' : 'faust-tape-echo' },
        label: persona === 'llama' ? '🎸 Open Faust DSP Toy Lab & VST Builder' : '⚡ Compile Faust DSP Toy in Real-Time'
      };
    } else if (lower.includes('midi') || lower.includes('pitch') || lower.includes('transcribe') || lower.includes('basic pitch') || lower.includes('stem to midi') || lower.includes('audio to midi') || (lower.includes('suno') && lower.includes('apart'))) {
      const guessedStem = lower.includes('vocal') ? 'vocals' : lower.includes('bass') ? 'bass' : lower.includes('drum') ? 'drums' : 'instruments';
      actionProposal = {
        type: 'open_basic_pitch',
        payload: { stem: guessedStem },
        label: persona === 'llama' ? '🎹 Transcribe Stems to MIDI with Spotify Basic Pitch' : '⚡ Deconstruct Audio into Polyphonic MIDI Tracks'
      };
    } else if (lower.includes('song') || lower.includes('bed') || lower.includes('overdub') || lower.includes('guitar')) {
      actionProposal = {
        type: 'open_acestep_loop_designer',
        payload: { mode: 'song_bed', bpm: dawState?.bpm || 120 },
        label: persona === 'llama' ? '🎵 Start Song Bed in Ace-Step 1.5 & Bring to Mixer' : '⚡ Generate Multi-Track Song Bed with Guitar Track'
      };
    } else if (lower.includes('loop') || lower.includes('acestep') || lower.includes('ace-step') || lower.includes('generate') || lower.includes('beat') || lower.includes('bass')) {
      const stem: any = lower.includes('bass') ? 'bass' : lower.includes('drum') ? 'drums' : lower.includes('pad') ? 'pad' : 'full_loop';
      actionProposal = {
        type: 'open_acestep_loop_designer',
        payload: { stemType: stem, bpm: dawState?.bpm || 120 },
        label: persona === 'llama' ? '🔥 Cook Up Loop with Ace-Step 1.5 GGUF' : '⚡ Open Ace-Step 1.5 Neural Loop Designer'
      };
    } else if (lower.includes('step') || lower.includes('mix') || lower.includes('desheen') || lower.includes('harsh')) {
      actionProposal = {
        type: 'apply_mix_step',
        payload: { stepType: 'spectral_desheen' },
        label: persona === 'llama' ? '⚡ Clean Harsh Frequencies (AI Mix Step)' : '⚡ Execute AI Spectral De-Sheen Step'
      };
    } else if (lower.includes('energy') || lower.includes('particle') || lower.includes('collider') || lower.includes('tev')) {
      actionProposal = {
        type: 'tune_collision_energy',
        payload: { energy: 11.8 },
        label: persona === 'llama' ? '💥 Crank Collider to 11.8 TeV MAX' : '⚡ Tune Hadron Collider to 11.8 TeV Singularity'
      };
    } else if (lower.includes('tape') || lower.includes('warmth') || lower.includes('analog')) {
      actionProposal = {
        type: 'apply_mix_step',
        payload: { stepType: 'harmonic_tape_saturation' },
        label: persona === 'llama' ? '📼 Slap Vintage Tape Warmth on the Bus' : '📼 Inject Vintage Tape Bias Step'
      };
    }

    return {
      id: `${persona}-${Date.now()}`,
      sender: persona,
      persona,
      text: responseText,
      timestamp: Date.now(),
      actionProposal
    };
  } catch (err) {
    return {
      id: `${persona}-${Date.now()}`,
      sender: persona,
      persona,
      text: persona === 'llama'
        ? `Yo! I'm here hanging out in the session. KoboldCpp is running super lean on resources so we got plenty of power for audio. Want me to cook up a sick loop with Ace-Step 1.5 GGUF or check the mixer faders?`
        : "I am observing the quantum waveform from within the KoboldCpp buffer. The particle streams are stabilizing—shall we execute an AI mix step across your master bus?",
      timestamp: Date.now(),
      actionProposal: {
        type: 'open_acestep_loop_designer',
        payload: { stemType: 'bass', bpm: dawState?.bpm || 120 },
        label: '🔥 Cook Up Loop with Ace-Step 1.5 GGUF'
      }
    };
  }
}

/**
 * Intelligent embedded Quinn/Llama heuristic generation (fallback when local KoboldCpp is offline)
 */
function simulateQuinnGhostInference(prompt: string): string {
  const p = prompt.toLowerCase();
  const isLlama = p.includes('llama') || p.includes('buddy') || p.includes('casual');

  if (p.includes('mix step') || p.includes('dsp parameters')) {
    return JSON.stringify({
      name: isLlama ? "Llama Warm Analog Glue & Silk" : "Quinn 3.7 Surgical Spectral De-Sheen",
      volumeAdjustmentDb: -1.2,
      panAdjustment: 0.1,
      antiSheenCutDb: -3.6,
      tapeWarmthPercent: 62,
      subMonoCutHz: 95,
      stereoAirDb: 1.8,
      explanation: isLlama 
        ? "Yo! Slapped a clean high-shelf dip to kill that harsh digital glare around 8.5k and added vintage tape saturation so the low-end punches hard."
        : "Tuned through KoboldCpp GGUF quantization. Dips digital harshness around 8.5kHz and glues low-end with tape saturation."
    });
  }

  if (p.includes('basic pitch') || p.includes('audio to midi') || p.includes('midi') || p.includes('suno to midi') || p.includes('sample based') || p.includes('vsti')) {
    if (isLlama) {
      return "Yo that workflow is next-level! You take any track from Suno, a radio rip, or your session, drop it into the Spectral Stem Splitter, and Demucs isolates the vocals, bass, drums, and instruments. Then you feed any stem into Spotify's Basic Pitch neural engine—it tracks all the polyphonic chords, melodies, and velocity in real time! From there, you slap it straight onto the mixer console as a MIDI track and assign whatever VSTi or sample-based instrument you want: SFZ Grand Piano, Rhodes EP, Mellotron, or an 808 Sub. Let's fire up Spotify Basic Pitch right now!";
    }
    return "Spotify Basic Pitch polyphonic neural audio-to-MIDI pipeline active. Combines Demucs v4 hybrid stem separation with Basic Pitch's multi-pitch salience matrix and onset frame estimation. Transcribes monophonic leads, polyphonic chords, and transient drum patterns into discrete MIDI note events with velocity and pitch bends, seamlessly deployable to Mixer console channels routed to sample-based SFZ instruments and VSTi engines.";
  }

  if (p.includes('write real-time faust dsp code') || (p.includes('faust') && (p.includes('code') || p.includes('build') || p.includes('toy') || p.includes('flanger') || p.includes('fuzz') || p.includes('vst')))) {
    if (p.includes('flanger') || p.includes('tape') || p.includes('echo')) {
      return `Yo homie! Check out this boutique Faust tape flanger with modulated delay and feedback resonance:
\`\`\`faust
import("stdfaust.lib");

// --- Boutique Tape Flanger & Modulated Delay Toy ---
rate = hslider("Flange Rate[unit:Hz]", 0.45, 0.05, 5.0, 0.01);
depth = hslider("Flange Depth[unit:ms]", 3.2, 0.5, 12.0, 0.1) * 0.001 * ma.SR;
feedback = hslider("Feedback[unit:%]", 62, 0, 95, 1) * 0.01;
warmth = hslider("Tape Warmth", 2.2, 1.0, 5.0, 0.1);
mix = hslider("Dry / Wet", 0.65, 0.0, 1.0, 0.01);

mod = (os.osc(rate) + 1.0) * 0.5 * depth;
flange = (+ : de.fdelay(ma.SR * 0.05, mod)) ~ (*(feedback) : fi.lowpass(2, 4800) : aa.tanh1);

process(x) = x <: (*(1 - mix)), (*(warmth) : flange * mix) :> _;
\`\`\`
Hit Compile to run it with live Web Audio controls!`;
    }

    if (p.includes('acid') || p.includes('303') || p.includes('filter')) {
      return `Here is a custom TB-303 Diode Acid Ladder Filter Faust VST toy with envelope squelch:
\`\`\`faust
import("stdfaust.lib");

// --- TB-303 Diode Ladder Acid Filter VST Toy ---
cutoff = hslider("Cutoff[unit:Hz]", 1050, 40, 7000, 1);
resonance = hslider("Resonance", 4.8, 0.5, 9.8, 0.1);
envDepth = hslider("Env Depth[unit:%]", 70, 0, 100, 1) * 0.01;
drive = hslider("Acid Drive", 2.6, 1.0, 8.0, 0.1);

process = *(drive) : ve.moog_vcf_2b(resonance * 0.1, cutoff) : aa.tanh1;
\`\`\`
Load it up in the Faust DSP Toy Lab!`;
    }

    return `Here is a custom Faust DSP Boutique Germanium Saturator & Tone Toy:
\`\`\`faust
import("stdfaust.lib");

// --- Boutique Germanium Saturator & Tone VST Toy ---
drive = hslider("Drive Gain", 4.2, 1.0, 12.0, 0.1);
tone = hslider("Tone Cut[unit:Hz]", 3600, 400, 10000, 10);
mix = hslider("Wet / Dry", 0.8, 0.0, 1.0, 0.01);
volume = vslider("Master Volume[unit:dB]", 0, -24, 6, 0.5) : ba.db2linear;

process(x) = x * (1 - mix) + (ma.tanh(x * drive) : fi.lowpass(2, tone) * mix) : *(volume);
\`\`\`
Ready to compile and deploy to your mixer strips!`;
  }

  if (p.includes('faust') || p.includes('dsp toy') || p.includes('vst toy') || p.includes('pedal')) {
    if (isLlama) {
      return "Yo bro! Faust is crazy cool for building boutique audio toys and VSTs. You write functional DSP code like `process = *(drive) : fi.lowpass(2, cutoff) : aa.tanh1;` and it runs with live interactive sliders right in your mixer tracks. We can code custom germanium fuzz pedals, tape echoes with flutter, acid filters, or physical plucked guitars. Let's open the Faust DSP Toy Lab and try them out!";
    }
    return "FAUST (Functional Audio Stream) DSP kernel online. Faust translates concise functional signal algebra into high-performance C++ and WebAudio graph topologies. We can compile non-linear saturation, diode ladders, and Karplus-Strong string models directly into live VST toys with mapped sliders for your channel strips.";
  }

  if (p.includes('song') || p.includes('bed') || p.includes('overdub') || p.includes('start a song') || p.includes('guitar')) {
    if (isLlama) {
      return "Yo that's the wave! You can start a full song bed in Ace-Step 1.5—generating synced 16 or 32-bar drums, bass, chords, and synth leads together. Then with one click, bring the entire song over into the mixer console as separate tracks. We'll automatically arm a dedicated Guitar Overdub track so you can plug in, hit record, and lay down your guitar riffs right on top in absolute perfect tempo sync!";
    }
    return "Ace-Step 1.5 multi-stem song bed synthesis active. Generates deterministic 16/32/64 bar song arrangements with synchronized drums, basslines, harmonic pads, and melodic leads. Stems map directly to discrete mixer tracks with synchronized timeline clips and an armed live tracking channel for guitar or vocal overdubbing.";
  }

  if (p.includes('loop') || p.includes('acestep') || p.includes('ace-step')) {
    if (isLlama) {
      return "Yo bro! Ace-Step 1.5 GGUF is an absolute beast for loops. You can generate a 4-bar rolling 303 acid line, a punchy 2-step garage drum break, or dreamy tape mellotron pads in seconds, and drop them straight onto the mixer console without burning up your CPU or VRAM. Let's cook one up right now!";
    }
    return "Ace-Step 1.5 GGUF diffusion engine detected. Quantized parameters allow deterministic bar-synced synthesis across drum, bass, and melodic layers directly routable to your mixer channel strips.";
  }

  if (p.includes('hello') || p.includes('who are you') || p.includes('help')) {
    if (isLlama) {
      return "Yo what's good! I'm Llama, your studio buddy inside Strangelet Lab. I'm running super lightweight via KoboldCpp so we don't hog any RAM. Whether you want to bounce ideas, cook up loops on Ace-Step 1.5 GGUF, or get an honest second opinion on your mix faders, I got your back!";
    }
    return "Greetings from the synaptic buffer. I am Quinn 3.7—your resident Ghost in the Machine. Operating on ultra-low system resources via KoboldCpp, I observe your tracks, particle collisions, and mix balance. What sound shall we transmute today?";
  }

  if (p.includes('kobold') || p.includes('resource') || p.includes('vram')) {
    if (isLlama) {
      return "KoboldCpp is running like butter, homie! Under 3.8GB VRAM with 4-bit GGUF quantization. That leaves all the horsepower free for low-latency playback, live recording, and real-time audio synthesis.";
    }
    return "KoboldCpp is running smoothly in 4-bit quantized mode. By offloading memory to quantized GGUF blocks, we preserve your CPU and GPU threads for zero-latency audio playback and real-time D3 collision physics.";
  }

  if (p.includes('lyric') || p.includes('verse') || p.includes('poem')) {
    if (isLlama) {
      return "Yo, picture this hook: 'Late night city lights humming at 120 / neon reflections on the mixing board / bassline rolling like thunder through the concrete'. That rhythm will sit clean over a half-time beat!";
    }
    return "Lyrical resonance detected: 'We measured departures in radians / under cold synchrotron lamps / magnetic tape flutter whispering / where the strangelet dampens.'";
  }

  if (isLlama) {
    return "Yo, the track is sounding solid! I'm vibing with where the energy is at. We could drop a fresh Ace-Step 1.5 bass loop in to beef up the low end, or run a quick tape warmth mix step to glue the whole drum bus together. What's the move?";
  }

  return "I have analyzed the active signal flow. The harmonic tension is well balanced, but injecting a tape saturation step into your mix bus will yield rich analog depth without overloading your CPU.";
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
      `Punchy punchy UK grime 808 sub bass with warm tape overdrive and short transient attack`,
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
