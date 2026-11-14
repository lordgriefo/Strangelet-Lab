import { generateWithKoboldDetailed } from './koboldCppService';
import { awardBuddyXp, buildBuddySoulPromptBlock } from './buddyEvolutionCore';
import { buildSoftwareDojoKnowledgeBlock } from './softwareDojoKnowledge';
import { ColliderChip, PromptOutputResult, LyricLabOutput, SongDeconstruction } from '../types';

export const generateSystemCode = async (filename: string, context: string): Promise<string> => {
  try {
    const prompt = `
      You are an expert Python engineer specializing in Audio Processing and AI pipelines.
      The user is building "Strangelet Lab", an AI music workstation.
      
      Context: ${context}
      
      Task: Generate the complete source code for the file: '${filename}'.
      Style: Professional, type-hinted Python code using PyTorch where applicable.
      Constraints: 
      - If hardware.py: Implement lazy loading, VRAM management (6GB limit), torch.cuda.empty_cache(), and support for CUDA/DirectML. Optimize for mechanical HDD I/O where possible.
      - If requirements.txt: List all necessary dependencies for:
        - Stem Separation: Roformer (drum sep v2), Demucs.
        - MIDI/Audio: Audio-to-MIDI conversion (e.g., basic-pitch), SFZ/VSTi rendering (e.g., sf2-loader).
        - SFZ Generation: Python libraries for sample mapping and SFZ file writing.
        - Mastering: Matchering 2.0.
        - Backend: FastAPI, Celery (for task queue), Redis.
        - Model Plugin Architecture: Implement a standardized interface for loading modular AI models (e.g., Ace-Step 1.5, Lora-based models) dynamically from a \`plugins/\` directory.
      - The system should be configurable to use local AI endpoints such as Kobold.cpp, Ollama, LM Studio, or any OpenAI-compatible server.
      
      Return ONLY the raw code/text content, no markdown formatting blocks if possible, or minimally wrapped.
    `;

    const res = await generateWithKoboldDetailed(prompt, {
      maxTokens: 1200,
      temperature: 0.35
    });

    if (res.engineSource !== 'offline_dojo' && res.text.trim()) {
      return res.text
        .replace(/^```(?:python|text|txt)?\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
    }

    // Deterministic offline scaffolding when no local LLM server is running
    if (filename === 'requirements.txt') {
      return `# Strangelet Lab Modular DSP & AI Runtime Dependencies
torch>=2.3.0
torchaudio>=2.3.0
numpy>=1.26.0
scipy>=1.12.0
librosa>=0.10.2
soundfile>=0.12.1
audio-separator>=0.18.0
demucs>=4.0.1
basic-pitch>=0.3.3
matchering>=2.0.6
fastapi>=0.111.0
uvicorn>=0.30.0
celery>=5.4.0
redis>=5.0.4
httpx>=0.27.0
PySide6>=6.7.0
`;
    }

    return `# Strangelet Lab Hardware & Plugin Manager (6GB VRAM Singleton)
import gc
import importlib
import pathlib
from typing import Any, Dict, Optional
import torch


class ModelManager:
    _instance: Optional["ModelManager"] = None

    def __new__(cls) -> "ModelManager":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._loaded_models: Dict[str, Any] = {}
            cls._instance._vram_limit_gb = 6.0
        return cls._instance

    @property
    def device(self) -> str:
        if torch.cuda.is_available():
            return "cuda"
        return "cpu"

    def load_model(self, plugin_name: str, plugins_dir: str = "plugins") -> Any:
        if plugin_name in self._loaded_models:
            return self._loaded_models[plugin_name]
        self.unload_all()
        plugin_path = pathlib.Path(plugins_dir) / f"{plugin_name}.py"
        if not plugin_path.exists():
            raise FileNotFoundError(f"Plugin module not found: {plugin_path}")
        module = importlib.import_module(f"{plugins_dir}.{plugin_name}")
        model = module.initialize(device=self.device)
        self._loaded_models[plugin_name] = model
        return model

    def unload_model(self, plugin_name: str) -> None:
        if plugin_name in self._loaded_models:
            del self._loaded_models[plugin_name]
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()

    def unload_all(self) -> None:
        self._loaded_models.clear()
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
`;
  } catch (error) {
    console.warn('Local AI codegen bypassed:', error);
    return `# Offline fallback active for ${filename}\n# Connect Kobold.cpp, Ollama, or LM Studio in AI Hub Settings for live generation.`;
  }
};

export const analyzeMix = async (description: string): Promise<string> => {
  try {
    const promptContents = description.includes('[ACTIVE STUDIO SESSION SNAPSHOT]')
      ? description
      : `Analyze this mixing scenario and provide spectral rebuilding advice using 'Strangelet Lab's Mastering Engineer' module philosophy (AudioSR/Matchering reference): ${description}`;
    const res = await generateWithKoboldDetailed(promptContents, {
      maxTokens: 320,
      temperature: 0.65,
      userQuery: description
    });
    return res.text || 'Analysis complete via Strangelet Offline Dojo.';
  } catch {
    return 'Analysis complete via Strangelet Offline Dojo.';
  }
};

/**
 * Collide musical particles (styles, genres, eras, instruments, production nuances)
 * into a precision-engineered Suno/Udio prompt with structure blueprint.
 */
export const collideSonicParticlesGemini = async (
  chips: ColliderChip[],
  targetFormat: 'acestep' | 'yue2' | 'suno' | 'udio' | 'universal' = 'suno'
): Promise<PromptOutputResult> => {
  const chipLabels = chips.map(c => `${c.label} (${c.category}, weight: ${Math.round((c.energyWeight || 0.75) * 100)}%)`).join(', ');

  const fallbackResult: PromptOutputResult = generateFallbackSonicPrompt(chips, targetFormat);

  const formatLabel =
    targetFormat === 'acestep'
      ? 'Ace-Step 1.5 audio diffusion'
      : targetFormat === 'yue2'
        ? 'YuE 2.0 full-song synthesis'
        : targetFormat === 'udio'
          ? 'Udio style prompt'
          : targetFormat === 'suno'
            ? 'Suno style & prompt tags'
            : 'Universal AI music generators (Ace-Step, YuE 2, Suno, Udio)';

  try {
    const soulBlock = buildBuddySoulPromptBlock();
    const dojoKnowledge = buildSoftwareDojoKnowledgeBlock();
    const topParticleNames = chips.slice(0, 3).map(c => c.label).join(' + ');
    awardBuddyXp(
      20,
      'interaction',
      `Collided [${topParticleNames || 'sonic particles'}] for ${formatLabel}`
    );

    const prompt = `
      You are Ghost in the Machine, the smart, personable Mad Scientist running Strangelet Lab's "Large Sonic Collider" (LSC).
      ${soulBlock}
      ${dojoKnowledge}

      We have injected the following sonic particle chips into the collision chamber:
      [${chipLabels}]

      Target Engine Format: ${formatLabel}.

      Using your Software Dojo training on 5-layer prompt synthesis (Genre Fusion, Instruments & Synthesis, Tempo/BPM & Rhythm, Vocal Character & Delivery, Production Aesthetics & Era Tone), synthesize the collision into a JSON object with this EXACT structure:
      {
        "title": "Evocative Short Track Title",
        "promptText": "Rich, highly effective prompt string ready to paste directly into ${formatLabel}",
        "styleTags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"],
        "tempoBpm": 115,
        "vibeDescription": "1-2 sentence visceral description of the collided aesthetic",
        "structureBlueprint": [
          {"section": "[Intro]", "description": "Musical arrangement details"},
          {"section": "[Verse 1]", "description": "Musical arrangement details"},
          {"section": "[Chorus]", "description": "Musical arrangement details"},
          {"section": "[Bridge / Drop]", "description": "Musical arrangement details"},
          {"section": "[Outro]", "description": "Musical arrangement details"}
        ]
      }
      Return ONLY raw JSON, with no outer markdown blocks if possible.
    `;

    const res = await generateWithKoboldDetailed(prompt, {
      maxTokens: 600,
      temperature: 0.7
    });

    if (res.engineSource === 'offline_dojo') {
      return fallbackResult;
    }

    const cleaned = res.text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
    return {
      title: parsed.title || fallbackResult.title,
      promptText: parsed.promptText || fallbackResult.promptText,
      styleTags: Array.isArray(parsed.styleTags) ? parsed.styleTags : fallbackResult.styleTags,
      tempoBpm: parsed.tempoBpm || fallbackResult.tempoBpm,
      vibeDescription: parsed.vibeDescription || fallbackResult.vibeDescription,
      structureBlueprint: Array.isArray(parsed.structureBlueprint) ? parsed.structureBlueprint : fallbackResult.structureBlueprint,
      generatedAt: Date.now()
    };
  } catch (err) {
    console.warn('Local AI collider parse bypassed, using algorithmic sonic collider:', err);
    return fallbackResult;
  }
};

function generateFallbackSonicPrompt(chips: ColliderChip[], format: string): PromptOutputResult {
  const genres = chips.filter(c => c.category === 'genre').map(c => c.label);
  const eras = chips.filter(c => c.category === 'era').map(c => c.label);
  const rhythms = chips.filter(c => c.category === 'rhythm').map(c => c.label);
  const instruments = chips.filter(c => c.category === 'instrument').map(c => c.label);
  const productions = chips.filter(c => c.category === 'production').map(c => c.label);
  const nuances = chips.filter(c => c.category === 'nuance').map(c => c.label);

  const orderedLabels = [...chips]
    .sort((a, b) => (b.energyWeight || 0.8) - (a.energyWeight || 0.8))
    .map(c => c.label);

  const styleTags = Array.from(new Set([
    ...orderedLabels.slice(0, 8),
    ...genres.slice(0, 2),
    ...eras.slice(0, 1),
    ...rhythms.slice(0, 1),
    ...instruments.slice(0, 2),
    ...productions.slice(0, 2),
    ...nuances.slice(0, 1)
  ])).slice(0, 8);

  const primaryStyle = orderedLabels[0] || genres[0] || 'Indie Rock';
  const secondaryStyle = orderedLabels[1] || genres[1] || productions[0] || 'Analog Tape';
  const remainingStyles = orderedLabels.slice(2);
  const leadInst = instruments[0] || orderedLabels[2] || 'Analog Synth Lead';
  const prodFlair = productions[0] || 'warm analog tape saturation';

  const titleAdjectives = ['Quantum', 'Solar', 'Velvet', 'Midnight', 'Strangelet', 'Resonant', 'Subatomic', 'Molten'];
  const titleNouns = ['Collision', 'Horizon', 'Reactor', 'Odyssey', 'Equation', 'Refraction', 'Transduction', 'Overdrive'];
  const randomTitle = `${titleAdjectives[Math.floor(Math.random() * titleAdjectives.length)]} ${titleNouns[Math.floor(Math.random() * titleNouns.length)]}`;

  const blendList = remainingStyles.length > 0 ? `, fused with ${remainingStyles.join(', ')}` : '';
  const targetHint =
    format === 'acestep'
      ? 'Punchy stereo master, tight loop-ready groove, analog saturation, wide headroom.'
      : format === 'yue2'
        ? 'Cohesive full-song arrangement with dynamic transitions and expressive vocal space.'
        : 'Dynamic arrangement with rich melodic transitions and detailed stereo depth.';

  const promptText = `${primaryStyle} collided with ${secondaryStyle}${blendList}. Featuring ${leadInst}, ${rhythms[0] || 'driving groove'}, ${prodFlair}, ${nuances[0] || 'raw visceral intensity'}. ${targetHint}`;

  return {
    title: randomTitle,
    promptText: promptText,
    styleTags: styleTags.length > 0 ? styleTags : ['indie rock', 'samba', 'lo-fi', 'theremin', 'tape flutter'],
    tempoBpm: 116,
    vibeDescription: `A high-energy collision merging ${primaryStyle} character with ${secondaryStyle}${remainingStyles.length > 0 ? ` and ${remainingStyles[0]}` : ''}, sculpted for ${format.toUpperCase()}.`,
    structureBlueprint: [
      { section: '[Intro]', description: `Atmosphere built around ${primaryStyle} motif with subtle ${prodFlair}` },
      { section: '[Verse 1]', description: `Tight rhythm pocket locks in with ${secondaryStyle} texture and focused instrumentation` },
      { section: '[Chorus]', description: `Full-intensity collision combining ${orderedLabels.slice(0, 3).join(' + ')}, wide stereo projection` },
      { section: '[Bridge / Drop]', description: `Filter sweep breakdown spotlighting ${leadInst} before slamming back into full energy` },
      { section: '[Outro]', description: `Extended fade with resonant harmonic tails and tape saturation decay` }
    ],
    generatedAt: Date.now()
  };
}

/**
 * Lyric Lab Generator: Smashes two lyrical themes or cut-up techniques into rhyming verses and choruses
 */
export const generateLyricLabGemini = async (
  themeA: string,
  themeB: string,
  structureType: string = 'verse-chorus-bridge',
  rhymeScheme: string = 'AABB'
): Promise<LyricLabOutput> => {
  const fallback = generateFallbackLyrics(themeA, themeB);
  try {
    const soulBlock = buildBuddySoulPromptBlock();
    const dojoKnowledge = buildSoftwareDojoKnowledgeBlock();
    const prompt = `
      You are the Lyric Lab lyricist at Strangelet Lab.
      ${soulBlock}
      ${dojoKnowledge}

      Smash these two contrasting concepts together:
      Concept A: "${themeA}"
      Concept B: "${themeB}"
      Structure: "${structureType}"
      Rhyme Scheme / Cadence: "${rhymeScheme}"

      Format for AI Music Generators (like Suno, Udio, or YuE 2.0), incorporating structural bracket tags ([Intro], [Verse 1], [Pre-Chorus], [Chorus], [Bridge], [Outro]) and performance/vocal cues ([Whispered], [Ethereal Harmonies], [Spoken Word], etc.).
      Return a JSON object:
      {
        "title": "Evocative Song Title",
        "concept": "1-sentence summary of the collision",
        "structure": "${structureType}",
        "promptTags": ["trip hop", "haunting vocal", "88 bpm"],
        "fullFormattedText": "[Verse 1]\\nLine 1...\\n\\n[Chorus]...\\n",
        "stanzas": [
          {"section": "[Verse 1]", "lines": ["Line 1", "Line 2", "Line 3", "Line 4"]},
          {"section": "[Chorus]", "lines": ["Line 1", "Line 2", "Line 3", "Line 4"]}
        ]
      }
      Return ONLY valid JSON.
    `;

    const res = await generateWithKoboldDetailed(prompt, {
      maxTokens: 700,
      temperature: 0.78
    });

    if (res.engineSource === 'offline_dojo') {
      return fallback;
    }

    const cleaned = res.text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
    return {
      title: parsed.title || fallback.title,
      concept: parsed.concept || fallback.concept,
      structure: parsed.structure || structureType,
      promptTags: Array.isArray(parsed.promptTags) ? parsed.promptTags : fallback.promptTags,
      fullFormattedText: parsed.fullFormattedText || fallback.fullFormattedText,
      stanzas: Array.isArray(parsed.stanzas) ? parsed.stanzas : fallback.stanzas,
      generatedAt: Date.now()
    };
  } catch (err) {
    console.warn('Lyric Lab local inference bypassed, using algorithmic fallback:', err);
    return fallback;
  }
};

function generateFallbackLyrics(themeA: string, themeB: string): LyricLabOutput {
  const fullText = `[Verse 1]
We traced the orbits where the night began to bend
A million light-years that we swore would never end
The cloud chamber whispers what the radar never showed
Two silver shadows on a desert access road.

[Chorus]
Hold to the frequency, stay in the beam
Nothing is lost inside the particle stream
Spin state is turning, the cathode turns red
We are the voltage where angels won't tread.

[Verse 2]
Tape loops are crumbling on the dashboard display
A pirate signal washing half the world away
You said gravity is just a memory of weight
And time is a compass that was never pointed straight.

[Chorus]
Hold to the frequency, stay in the beam
Nothing is lost inside the particle stream
Spin state is turning, the cathode turns red
We are the voltage where angels won't tread.

[Bridge - Quantum Cut-Up]
Signal split / mirror flash / the horizon folds
We bought the blueprint that the silence sold.

[Outro]
Resonance zero...
Falling through the aperture...
Fade into light.`;

  return {
    title: 'Aperture of the Night',
    concept: `Collision of ${themeA || 'Quantum Physics'} with ${themeB || 'Melancholic Road Trip'}.`,
    structure: 'Verse - Chorus - Verse - Chorus - Bridge - Outro',
    promptTags: ['indie rock', 'atmospheric', 'haunting vocals', 'analog synths', '104 bpm'],
    fullFormattedText: fullText,
    stanzas: [
      {
        section: '[Verse 1]',
        lines: [
          'We traced the orbits where the night began to bend',
          'A million light-years that we swore would never end',
          'The cloud chamber whispers what the radar never showed',
          'Two silver shadows on a desert access road.'
        ]
      },
      {
        section: '[Chorus]',
        lines: [
          'Hold to the frequency, stay in the beam',
          'Nothing is lost inside the particle stream',
          'Spin state is turning, the cathode turns red',
          "We are the voltage where angels won't tread."
        ]
      }
    ],
    generatedAt: Date.now()
  };
}

/**
 * Quantum Deconstructor: Reverse engineer a reference song, then re-imagine it
 * into an original prompt & lyric tailored to the user's custom topic.
 */
export const reverseEngineerAndReimagineGemini = async (
  referenceSong: string,
  userTargetTopic: string
): Promise<SongDeconstruction> => {
  const fallback = generateFallbackDeconstruction(referenceSong, userTargetTopic);

  try {
    const dojoKnowledge = buildSoftwareDojoKnowledgeBlock();
    const prompt = `
      You are the Master Audio Deconstructor at Strangelet Lab.
      ${dojoKnowledge}
      A user wants to reverse engineer the musical and production DNA of this reference:
      REFERENCE: "${referenceSong}"
      
      And then RE-IMAGINE it into a completely original song about this new topic:
      USER'S NEW TOPIC: "${userTargetTopic}"

      Reverse engineer:
      1. Genre, tempo, harmonic mood, key instruments, production techniques, lyrical cadence.
      2. Synthesize an original prompt string for Suno/Udio capturing that same production brilliance.
      3. Write 2 sample stanzas (Verse 1 + Chorus) applying that cadence to the user's new topic.

      Return JSON:
      {
        "referenceSong": "${referenceSong}",
        "targetTopic": "${userTargetTopic}",
        "analyzedDNA": {
          "genre": "...",
          "tempo": "...",
          "harmonicAtmosphere": "...",
          "instrumentation": ["...", "..."],
          "productionTechniques": ["...", "..."],
          "lyricalCadence": "..."
        },
        "reimaginedPrompt": "...",
        "reimaginedLyrics": "[Verse 1]\\n...\\n\\n[Chorus]\\n...",
        "styleTags": ["tag1", "tag2", "tag3"]
      }
      Return ONLY valid JSON.
    `;

    const res = await generateWithKoboldDetailed(prompt, {
      maxTokens: 700,
      temperature: 0.72
    });

    if (res.engineSource === 'offline_dojo') {
      return fallback;
    }

    const cleaned = res.text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);

    return {
      referenceSong: referenceSong,
      targetTopic: userTargetTopic,
      analyzedDNA: parsed.analyzedDNA || fallback.analyzedDNA,
      reimaginedPrompt: parsed.reimaginedPrompt || fallback.reimaginedPrompt,
      reimaginedLyrics: parsed.reimaginedLyrics || fallback.reimaginedLyrics,
      styleTags: Array.isArray(parsed.styleTags) ? parsed.styleTags : fallback.styleTags,
      generatedAt: Date.now()
    };
  } catch (err) {
    console.warn('Deconstructor local inference bypassed, using algorithmic fallback:', err);
    return fallback;
  }
};

function generateFallbackDeconstruction(reference: string, topic: string): SongDeconstruction {
  return {
    referenceSong: reference,
    targetTopic: topic,
    analyzedDNA: {
      genre: 'Art Rock / Poly-Arpeggiated Indie & Ambient Neo-Soul',
      tempo: '138 BPM driving syncopated pocket',
      harmonicAtmosphere: 'Suspended minor-ninth chords, cascading interlocking guitar arpeggios, buoyant modal lift',
      instrumentation: [
        'Interlocking clean telecasters cross-panned in stereo',
        'Warm P-Bass walking melodic counterpoint',
        'Live brushed drum kit with unquantized swing',
        'Lush analog synthesizer swell'
      ],
      productionTechniques: [
        'Zero quantization on live percussion for natural human pocket',
        'Tight wooden room acoustics without artificial digital gloss',
        'Tape console pre-amp saturation on low-end'
      ],
      lyricalCadence: 'Hypnotic, flowing, cyclical phrasing with repetition that builds into emotional release'
    },
    reimaginedPrompt: `Driving art rock with interlocking polyrhythmic clean telecaster arpeggios, melodic walking bassline, organic brush drums, and intimate vocal harmonies. Themed around ${topic || 'subterranean exploration'}. 138 BPM, raw room acoustics, warm tape saturation, evocative crescendo.`,
    reimaginedLyrics: `[Verse 1]
Down through the strata where the sunlight goes blind
Leaving the blueprints of the city behind
Pipes in the limestone and cable in coils
We carry the spark through the subterranean oils.

[Chorus]
Turn up the beacon, let the current run free
We are the divers in the dark of the sea
Everything heavy begins to float
As the water rises up to the throat.`,
    styleTags: ['art rock', 'interlocking guitars', 'dynamic crescendo', 'organic drums', 'warm analog tape'],
    generatedAt: Date.now()
  };
}

