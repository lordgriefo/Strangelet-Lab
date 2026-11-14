import { DojoScroll } from '../types';
import { buildStudioLorePromptBlock } from './studioLoreKnowledge';
import { buildBuddySoulPromptBlock } from './buddyEvolutionCore';

const DOJO_STORAGE_KEY = 'strangelet_dojo_scrolls';
const CUSTOM_SCROLL_KEY = 'strangelet_dojo_custom_scroll';

export const DEFAULT_DOJO_SCROLLS: DojoScroll[] = [
  {
    id: 'scroll-gold-path-mastering',
    title: 'The Gold Path Mastering Chain & A/B Matrix',
    category: 'Mastering & DSP',
    summary: '6-stage surgical mastering chain with Matchering, Glue Comp, Tape Warmth, Limiter, and A/B comparison.',
    content: `Stage 1: Pre-EQ (20-50Hz high-pass, mud dip at 380Hz, presence air at 12-16kHz).
Stage 2: Matchering profile match curve (Harmonic transfer curve mimicking vintage tape or hi-fi references).
Stage 3: Multiband Dynamics (Threshold -18dB to -10dB, ratio 2.0-4.0:1, auto-release for analog bus glue).
Stage 4: Analog Tape Saturation (Even/odd harmonics via tanh waveshaping, 45-75% drive for warmth).
Stage 5: Stereo Imager & Mono Bass Lock (Sums everything below 100Hz to mono, widens side channels 115-140%).
Stage 6: True-Peak Brickwall Limiter (-0.3dB ceiling, prevents inter-sample clipping for streaming).
A/B Toggle: Instantly compares the active Gold Path processed sound (Slot A) against either the untouched Dry Signal or a Saved Reference Preset (Slot B). Real-time D3 spectral FFT analyzer shows pink noise transfer curves and frequency peaks.`,
    enabled: true
  },
  {
    id: 'scroll-acestep-loops',
    title: 'Ace-Step 1.5 GGUF Diffusion & Song Beds',
    category: 'Neural Generation',
    summary: 'Quantized low-VRAM bar-synced loop diffusion for drums, 303 acid bass, pads, and guitar overdub beds.',
    content: `Ace-Step 1.5 runs quantized GGUFs locally on Kobold.cpp, Ollama, or LM Studio.
Stem Generation: Generates bar-synced loops (2, 4, 8, 16 bars) for drums, bass, leads, pads, and vocal chops.
Full Song Bed Mode: Generates synchronized multi-track arrangements (16, 32, 64 bars) with drums, bass, harmonic chords, and leads rendered directly to separate mixer tracks.
Live Overdub Channel: Automatically arms a live microphone / instrument channel (Guitar Overdub) perfectly locked to the project tempo for recording riffs or vocals directly over the generated bed.`,
    enabled: true
  },
  {
    id: 'scroll-faust-dsp-toys',
    title: 'Faust DSP Toy Lab & Real-Time Web Audio VSTs',
    category: 'Coding & Synthesis',
    summary: 'Functional audio stream language for compiling boutique pedals, tape echoes, 303 filters, and custom DSP.',
    content: `Faust compiles functional signal algebra into high-performance audio graphs.
Standard syntax: \`process = *(drive) : fi.lowpass(2, cutoff) : aa.tanh1;\`
Sliders: \`cutoff = hslider("Cutoff[unit:Hz]", 1000, 20, 18000, 1);\`
Pre-built Toys in Strangelet Lab:
- TB-303 Acid Ladder Filter with squelch resonance
- Vintage Germanium Tape Saturation & Tone Box
- Modulated Boutique Tape Flanger with bucket-brigade delay
- Karplus-Strong Physical Plucked String Synthesizer
- Strangelet Quantum Hadron Particle Resonator.
Compiled DSP toys can be inserted directly onto any mixer channel strip.`,
    enabled: true
  },
  {
    id: 'scroll-basic-pitch-midi',
    title: 'Spotify Basic Pitch & Neural Audio-to-MIDI',
    category: 'Audio Analysis & Transcription',
    summary: 'Polyphonic neural pitch transcription converting stem audio into multi-voice MIDI note events.',
    content: `Spotify Basic Pitch employs a deep convolutional neural net estimating note onset, frame activation, and pitch bend salience without monophonic restrictions.
Workflow:
1. Split any song, sample, or Suno track using Demucs stem separation (Vocals, Bass, Drums, Instruments).
2. Feed any isolated stem into Basic Pitch.
3. Configure Onset Threshold (default 0.5) and Frame Threshold (default 0.3) with minimum pitch limits.
4. Export transcription as clean polyphonic MIDI tracks directly into the Mixer console.
5. Assign SFZ sample libraries (Grand Piano, Rhodes, Mellotron) or VST instruments to playback the extracted MIDI notes.`,
    enabled: true
  },
  {
    id: 'scroll-sonic-collider',
    title: 'Large Sonic Collider & Hadron Particle Superposition',
    category: 'Particle Physics DAW',
    summary: 'Subatomic particle collisions (Quarks, Gluons, Strangelets) generating experimental sonic textures.',
    content: `The Large Sonic Collider accelerates particles around a 27-kilometer ring simulation.
Energy Scale: Tunable from 1.0 TeV to 14.0 TeV singularity levels.
Collision Physics: Relativistic particle packets collide in interaction sectors, generating sonic refraction bursts that feed into the Beam Splitter and Vector Morph Pad.
Strangelet Particles: Hypothetical stable bound states of up, down, and strange quarks that inject hyper-dense harmonic resonance into the DAW's audio bus.`,
    enabled: true
  },
  {
    id: 'scroll-laser-tools',
    title: 'Laser Pointer Tools & Holographic Interaction',
    category: 'UI & Automation',
    summary: '5 specialized laser tools for timeline painting, curve shaping, MIDI editing, and track incineration.',
    content: `Laser Tools Station:
- Blue Laser (Audio Loop Paint): Slices, places, and paints audio waveform clips across timeline lanes.
- Green Laser (MIDI Matrix Paint): Injects and paints polyphonic MIDI note events onto clips.
- Red Laser (Incinerator / Erase): Burns away notes, clips, automation points, and clutter with flame effects.
- Amber Laser (Vegas Neon Curves): Draws smooth bezier and neon tension curves for volume and pan automation.
- Purple Lodge Beam (Quantum Scrubber / Select): Multi-selects regions and scrubs high-resolution audio.`,
    enabled: true
  },
  {
    id: 'scroll-suno-desheen',
    title: 'Suno AI Un-Bake & Anti-Sheen De-Glaze',
    category: 'Restoration & Mastering',
    summary: 'Removes harsh digital generative AI phase artifacts, fizzy top-end glare, and MP3 crunch.',
    content: `Generative music models (Suno, Udio) often exhibit harsh phase smear, comb-filtering, and metallic high-frequency sheen between 7.5kHz - 11kHz.
Restoration Strategy:
- Surgical dynamic notch filter at 8.5kHz (-3dB to -6dB).
- Phase alignment and stereo width normalization.
- 2nd-order analog tape bias and tube saturation to reconstruct lost harmonic weight.
- Mono sub-lock below 90Hz to fix stereo mud and phase cancellation in bass frequencies.`,
    enabled: true
  },
  {
    id: 'scroll-faust-advanced-dsp',
    title: 'Faust DSP Functional Stream Architecture & Pedal Forge',
    category: 'Coding & Synthesis',
    summary: 'Mastery of Faust syntax, operators (: , <: :> ~), filters, non-linear tanh saturation, and real-time Web Audio Wasm nodes.',
    content: `Faust (Functional Audio Stream) compiles signal algebra directly into C++, LLVM, or Web Audio Wasm.
Core Syntax & Signal Flow Operators:
- Sequential Composition ':': A : B connects outputs of A to inputs of B.
- Parallel Composition ',': A , B evaluates A and B side-by-side (stereo routing).
- Split Composition '<:': splits N inputs to M outputs.
- Merge Composition ':>': sums N inputs into M outputs.
- Recursive Composition '~': creates feedback loops for delays, filters, and physical models.
Mathematical Primitives:
- Saturation: ma.tanh(x * drive) generates smooth 3rd-order harmonic analog warmth.
- Asymmetrical Diode: ma.tanh(x * drive) + (x * 0.2 * (x > 0)) generates vintage tube even harmonics.
- Filters: fi.lowpass(order, fc), fi.resonlp(fc, q, gain), fi.highpass(order, fc).
- Delays: de.fdelay(maxSamp, curSamp) for modulated chorus and flangers.
UI Sliders & Knobs:
- hslider("Label[unit:Hz]", default, min, max, step)
- checkbox("Bypass"), nentry("Semis", 0, -24, 24, 1)
Pre-configured Toys in Strangelet Lab:
1. TB-303 Acid Resonant Ladder with squelch feedback
2. Vintage Germanium Tape Drive & Tone Cut box
3. Boutique Modulated Tape Flanger with bucket-brigade delay
4. Karplus-Strong Physical Plucked Acoustic String
5. Quantum Hadron Multi-Band Resonator.
Always supply complete, compilable Faust code blocks enclosed in \`\`\`faust.`,
    enabled: true
  },
  {
    id: 'scroll-studio-lore-producers',
    title: 'Legendary Studio Lore & Producer Secret Techniques',
    category: 'Inside Game & Secrets',
    summary: 'Secrets from Lee Scratch Perry, Brian Eno, Prince, Dr. Dre, Sylvia Massy, Bob Katz, Wendy Carlos, and Kevin Shields.',
    content: `Secret Audio Techniques from the Masters:
1. Lee "Scratch" Perry (The Black Ark): Burying 1/4" master tapes under tropical palm trees to "earth magnetic iron particles", blowing ganja smoke into tape capstans, and running high-hats through blown guitar speakers.
2. Prince (When Doves Cry & LinnDrum): Deleting the entire bass guitar track from the mix to give drums infinite headroom; detuning LinnDrum LM-1 rimshots down and soaking in Boss BF-2 flangers.
3. Brian Eno (Oblique Strategies & Prime Delays): Using prime number delay buffers (e.g. 137ms, 311ms) across 30-foot tape loops on pencils so reflections never phase-cancel; "Honor thy error as a hidden intention."
4. Dr. Dre (The Chronic 2001 Low End): 100Hz mono-lock rule; nothing below 100Hz in stereo side channels; stacking 40Hz pure sine sub underneath acoustic kicks, high-passing below 28Hz for maximum amplifier wattage.
5. Sylvia Massy (Adventure Tracking): Passing audio signals through dill pickles and potatoes for asymmetric harmonic crunch; hanging singers upside down for primal diaphragm compression.
6. Kevin Shields (Loveless Glide Guitar): 1-2 tracks, not 200; continuously bending Jazzmaster floating tremolo arm during chords into 100% wet reverse reverb (Yamaha SPX90) into Marshall JCM800. Zero chorus pedals!
7. Bob Katz (K-System & Dynamic Headroom): Mastering to -14 LUFS with -0.3dB true-peak ceiling instead of squashing to -6 LUFS; prevents inter-sample clipping on Bluetooth/streaming DACs.
8. Wendy Carlos (Switched-On Modular): Detuning layered oscillators by 0.7 Hz to simulate living orchestral acoustic drift; pioneering non-octave Alpha and Beta microtuning scales.
9. Rick Rubin (The Reductive Scalpel): Muting 6 synth tracks until only the raw heartbeat remains. "If it doesn't work with just a guitar and a voice, no VST can save it."`,
    enabled: true
  },
  {
    id: 'scroll-modular-vram-management',
    title: 'Modular VRAM Scalability: 6GB Laptop to 16GB Pro Studio',
    category: 'Hardware & Architecture',
    summary: 'Optimizing memory footprint across 6GB, 8GB, 16GB, and 24GB tiers with modular on/off component switching.',
    content: `Hardware Tier Guidelines:
- 6GB VRAM (Tight Mode / Current Setup):
  * Use Q4_K_S quantizations (2.1GB - 3.4GB budget).
  * Run Demucs stem separator on demand (mobile ONNX runtime), unload when idle.
  * Keep Ace-Step diffusion on standby; generate stems sequentially.
  * Use Web Audio native DSP when idle to reserve GPU memory for timeline graphics.
- 16GB VRAM (Pro Studio Mode / Next Upgrade):
  * Keep full 4-stem HTDemucs FP16 resident in VRAM (~1.4GB).
  * Run 8B-14B models (Q8 / FP16) with zero offload latency.
  * Run parallel Ace-Step diffusion and real-time 60FPS D3 spectral analyzers simultaneously.
- Modular Component Power Switches:
  * Users can toggle Stem Separator, AceStep, Basic Pitch, and Faust JIT ON/OFF at any time in the Resource Manager modal to immediately free GPU memory!
- Helper Buddy Soul Preservation:
  * The buddy's memories, personality quirks, XP rank, and custom rules are preserved across ALL model swaps and hardware upgrades via the Buddy Soul JSON state!`,
    enabled: true
  },
  {
    id: 'scroll-track-fx-dsp-rack',
    title: 'Per-Track Insert FX Chain & Open-Source DSP Ecosystem',
    category: 'Mixer & Signal Flow',
    summary: 'Dedicated channel strip inserts: 3-band EQ, tanh tube drive, resonant filter, feedback delay, algorithmic reverb, and open-source DSP modules.',
    content: `Every mixer channel strip features a real-time Web Audio insert FX chain:
1. 3-Band Equalizer: Low shelf (100Hz, ±12dB), Mid peaking (1000Hz, ±12dB), High shelf (8000Hz, ±12dB).
2. Tube Drive / Saturation: Non-linear hyperbolic tangent (tanh) soft-clipping waveshaper delivering 2nd & 3rd order analog harmonic richness.
3. Resonant State-Variable Filter: Lowpass / Highpass / Bandpass with cutoff (20Hz - 20kHz) and resonance Q.
4. Delay Station: Precision millisecond delay (50ms - 1000ms) with feedback regeneration and dry/wet mix.
5. Algorithmic Reverb: Algorithmic impulse convolver with variable decay time (0.5s - 5.0s) and dry/wet blend.
6. Open-Source DSP Components Ecosystem:
   - Tuna.js: 14 classic modular stompboxes (Chorus, Phaser, Overdrive, Tremolo, WahWah, Bitcrusher, MoogFilter, Cabinet Sim).
   - WAM 2.0 (Web Audio Modules): Open-standard WebAssembly audio plugins, including ChowDSP tape/distortion and Dexed FM synth.
   - Faust DSP Lab: Compiles functional signal algebra straight to live Web Audio nodes for zero-latency custom DSP.
   - Freeverb & Dattorro Plate: Classic open-source reverb topologies for lush spatial diffusion.
When users ask for mix adjustments on individual tracks, instruct them to expand the 'FX' drawer on the track's channel strip or propose exact dB and frequency settings.`,
    enabled: true
  },
  {
    id: 'scroll-sonic-collider-prompting',
    title: 'Sonic Collider Prompt Alchemy & Particle Superposition',
    category: 'AI Prompt Engineering',
    summary: 'Mastering prompt particle collisions for Suno, Udio, Ace-Step 1.5, and YuE2: genre fusion, acoustic textures, BPM, and production warmth.',
    content: `In Strangelet Lab's Large Sonic Collider, AI prompts are built by colliding contrasting aesthetic particles.
When the user asks for prompt ideas, synthesize a complete, production-ready prompt string following the 5-Layer Particle Formula:
1. Genre Fusion & Era: Pair two contrasting genres (e.g. "90s trip hop + dark ambient", "shoegaze dream-pop + breakcore", "desert blues + cyberpunk synth").
2. Core Instrumentation: Name specific analog instruments (e.g. "tape-saturated 808 sub, clean rickenbacker bass, juno-106 chorus pad, detuned upright piano").
3. Rhythm & BPM: Specify the groove and tempo (e.g. "86 bpm, swung boom-bap groove, live acoustic drum breaks, ghost snares").
4. Vocal Delivery & Mood: Describe the timbre (e.g. "haunting female vocal, ethereal airy falsetto, close-mic whispered cadence, reverb tails").
5. Analog Grain & Spatial Production: Add production character (e.g. "warm 1/4-inch tape saturation, vinyl surface crackle, lush Dattorro plate reverb, mono sub-lock").
Example Output Format:
[SONIC COLLIDER PROMPT]
"darkwave trip hop, 90s cassette warmth, juno-106 analog pads, heavy rickenbacker bass, driving 88 bpm breakbeat, haunting ethereal female vocals, wide stereo reverb"
[COLLIDER CHIPS]: [Darkwave], [Juno-106], [88 BPM], [Haunting Vocals], [Tape Saturation]`,
    enabled: true
  },
  {
    id: 'scroll-lyric-lab-craft',
    title: 'Lyric Lab Songwriting Architecture & Metatag Directives',
    category: 'Songwriting & Lyric Craft',
    summary: 'Full-song lyric writing with structural brackets ([Verse], [Chorus], [Bridge]), vocal delivery cues, meter, and Burroughs cut-up metaphors.',
    content: `The Lyric Lab inside the Large Sonic Collider formats lyrics specifically for AI audio generation models (Suno, Udio, YuE2) and human vocal tracking.
When assisting with lyrics:
1. Structural Brackets: Always structure songs with bracketed sections so generative models and singers know the pacing:
   - [Intro - Atmospheric Synth Drift]
   - [Verse 1] (Establish the setting, concrete sensory imagery, 4 to 8 lines)
   - [Pre-Chorus - Rising Tension] (2 to 4 lines, builds rhythmic momentum)
   - [Chorus] (The central emotional hook, memorable melody, strong rhyme)
   - [Verse 2] (Deepens the story or introduces a twist)
   - [Chorus]
   - [Bridge - Quantum Cut-Up / Modulation] (Shift perspective, key change, or William Burroughs cut-up fold-in phrases)
   - [Guitar Solo] or [Synth Breakdown]
   - [Chorus - Climax]
   - [Outro - Fading Radio Signal]
2. Vocal Delivery Cues: Insert performance bracket cues directly into the lyrics:
   - [Whispered], [Spoken Word], [Ethereal Harmonies], [Distorted Shout], [Call and Response].
3. Metric Rhythm & Cadence: Ensure line syllables flow musically with natural stress patterns, avoiding clunky robotic syntax.
4. Lyrical Themes: Blend Strangelet Lab's retro-futuristic Méliès cosmos with raw emotional honesty (astrophysics, lost radio signals, neon nights, analog memory).`,
    enabled: true
  }
];

export function getStoredDojoScrolls(): DojoScroll[] {
  try {
    const raw = localStorage.getItem(DOJO_STORAGE_KEY);
    if (raw) {
      const parsed: DojoScroll[] = JSON.parse(raw);
      // Merge with defaults in case new ones were added
      const existingIds = new Set(parsed.map(s => s.id));
      const missingDefaults = DEFAULT_DOJO_SCROLLS.filter(s => !existingIds.has(s.id));
      return [...parsed, ...missingDefaults];
    }
  } catch (err) {
    console.warn('Failed to load Dojo scrolls:', err);
  }
  return DEFAULT_DOJO_SCROLLS;
}

export function saveStoredDojoScrolls(scrolls: DojoScroll[]): void {
  try {
    localStorage.setItem(DOJO_STORAGE_KEY, JSON.stringify(scrolls));
  } catch (err) {
    console.warn('Failed to save Dojo scrolls:', err);
  }
}

export function getCustomDojoTrainingNote(): string {
  try {
    return localStorage.getItem(CUSTOM_SCROLL_KEY) || 
`// Ninja Training Directives & Studio Principles:
- Treat Strangelet Lab as a sacred particle collider and analog tape studio.
- When asked for prompt ideas, synthesize 5-layer Sonic Collider prompts (Genre Fusion + Instruments + BPM + Vocal Delivery + Analog Grain).
- When asked for lyrics or songwriting help, format lyrics with full Lyric Lab structural brackets ([Verse], [Pre-Chorus], [Chorus], [Bridge], [Outro]) and vocal performance cues ([Whispered], [Harmonies], [Spoken Word]).
- Suggest Faust DSP code snippets whenever the user asks for pedals, distortion, filters, or instruments.
- For AI-generated or muddy tracks, immediately recommend the 8.5kHz Suno De-Sheen cut and Gold Path Stage 4 Tape Saturation.
- When generating loops, favor syncopated grooves, deep 808 sub lock, and bar-synced AceStep diffusion.
- Always provide actionable, punchy ninja-sensei advice with executable DAW action proposals.`;
  } catch {
    return '';
  }
}

export function saveCustomDojoTrainingNote(note: string): void {
  try {
    localStorage.setItem(CUSTOM_SCROLL_KEY, note);
  } catch (err) {
    console.warn('Failed to save custom Dojo training note:', err);
  }
}

/**
 * Compiles active Dojo scrolls and custom training notes into a unified knowledge prompt block
 */
export function buildSoftwareDojoKnowledgeBlock(): string {
  const scrolls = getStoredDojoScrolls().filter(s => s.enabled);
  const customNote = getCustomDojoTrainingNote().trim();

  let block = `=== [STRANGELET LAB // SOFTWARE DOJO MASTER SCROLLS] ===\n`;
  block += `The AI is trained as a Grand Sensei / Audio Ninja with complete mastery of Strangelet Lab systems:\n\n`;

  scrolls.forEach((scroll, index) => {
    block += `[SCROLL ${index + 1}: ${scroll.title.toUpperCase()} (${scroll.category})]\n`;
    block += `${scroll.content}\n\n`;
  });

  if (customNote) {
    block += `[CUSTOM DOJO TRAINING DIRECTIVES FROM SENSEI USER]:\n`;
    block += `${customNote}\n\n`;
  }

  block += `=== [END MASTER SCROLLS] ===\n\n`;
  block += buildStudioLorePromptBlock();
  block += `\n`;
  block += buildBuddySoulPromptBlock();

  return block;
}
