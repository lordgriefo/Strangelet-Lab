import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

const getAI = () => {
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }
  return ai;
};

export const generateSystemCode = async (filename: string, context: string): Promise<string> => {
  const client = getAI();
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
      - Pipeline Logic:
        1. Stem Separation (Roformer/Demucs).
        2. Audio-to-MIDI conversion for drums.
        3. MIDI rendering via SFZ/VSTi.
        4. SFZ Instrument Generation (from audio samples).
        5. Mixing.
        6. Mastering (Matchering 2.0).
        7. Modular AI Integration: Use a standardized plugin interface to load/unload models (like Ace-Step 1.5) for track generation, key/flow maintenance, and style transfer.
      - The system should be configurable to use different AI endpoints like a local LM Studio server or a cloud service like OpenRouter.
      
      Return ONLY the raw code/text content, no markdown formatting blocks if possible, or minimally wrapped.
    `;

    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || '# Error generating code.';
  } catch (error) {
    console.error("Gemini Error:", error);
    return `# Error: Unable to generate code. Ensure API Key is valid.\n# ${error}`;
  }
};

export const analyzeMix = async (description: string): Promise<string> => {
    const client = getAI();
    try {
        const response = await client.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Analyze this mixing scenario and provide spectral rebuilding advice using 'Strangelet Lab's Mastering Engineer' module philosophy (AudioSR/Matchering reference): ${description}`,
        });
        return response.text || "Analysis failed.";
    } catch (e) {
        return "Could not connect to AI Neural Net.";
    }
};

import { ColliderChip, PromptOutputResult, LyricLabOutput, SongDeconstruction } from '../types';

/**
 * Collide musical particles (styles, genres, eras, instruments, production nuances)
 * into a precision-engineered Suno/Udio prompt with structure blueprint.
 */
export const collideSonicParticlesGemini = async (
  chips: ColliderChip[],
  targetFormat: 'suno' | 'udio' | 'universal' = 'suno'
): Promise<PromptOutputResult> => {
  const chipLabels = chips.map(c => `${c.label} (${c.category}, weight: ${Math.round((c.energyWeight || 0.75) * 100)}%)`).join(', ');

  const fallbackResult: PromptOutputResult = generateFallbackSonicPrompt(chips, targetFormat);

  try {
    const client = getAI();
    const prompt = `
      You are the AI Quantum Music Engineer at Strangelet Lab's "Large Sonic Collider" (LSC).
      We have injected the following sonic particle chips into the collision chamber:
      [${chipLabels}]

      Target Engine Format: ${targetFormat.toUpperCase()} (e.g. optimized for Suno v3.5/v4 or Udio style tags).

      Synthesize the collision into a JSON object with this EXACT structure:
      {
        "title": "Evocative Short Track Title",
        "promptText": "Rich, highly effective prompt string ready to paste into ${targetFormat} prompt box",
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

    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    const raw = response.text || '';
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
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
    console.warn('Gemini Collider API call bypassed or failed, using algorithmic sonic collider:', err);
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

  const styleTags = [
    ...genres.slice(0, 2),
    ...eras.slice(0, 1),
    ...rhythms.slice(0, 1),
    ...instruments.slice(0, 2),
    ...productions.slice(0, 2),
    ...nuances.slice(0, 1)
  ];

  const primaryGenre = genres[0] || 'Indie Rock';
  const secondaryGenre = genres[1] || 'Samba';
  const primaryEra = eras[0] || '90s Lo-Fi';
  const leadInst = instruments[0] || 'Theremin Lead';
  const prodFlair = productions[0] || 'Analog Tape Flutter';

  const titleAdjectives = ['Quantum', 'Solar', 'Velvet', 'Midnight', 'Strangelet', 'Resonant', 'Subatomic', 'Bossa'];
  const titleNouns = ['Collision', 'Horizon', 'Basement', 'Odyssey', 'Equation', 'Refraction', 'Transduction', 'Reverie'];
  const randomTitle = `${titleAdjectives[Math.floor(Math.random() * titleAdjectives.length)]} ${titleNouns[Math.floor(Math.random() * titleNouns.length)]}`;

  const promptText = `${primaryGenre} collided with ${secondaryGenre}, filtered through ${primaryEra} aesthetic. Featuring prominent ${leadInst}, driving ${rhythms[0] || 'syncopated groove'}, ${prodFlair}, warm harmonic saturation, ${nuances[0] || 'mysterious dreamscape aura'}. Dynamic arrangement with rich melodic transitions.`;

  return {
    title: randomTitle,
    promptText: promptText,
    styleTags: styleTags.length > 0 ? styleTags : ['indie rock', 'samba', 'lo-fi', 'theremin', 'tape flutter'],
    tempoBpm: 116,
    vibeDescription: `A high-energy collision merging ${primaryGenre} urgency with ${secondaryGenre} swing, drenched in ${primaryEra} analog grit.`,
    structureBlueprint: [
      { section: '[Intro]', description: `Subtle atmospheric drone with isolated ${leadInst} motifs and tape crackle` },
      { section: '[Verse 1]', description: `Tight rhythm section enters with ${rhythms[0] || 'steady syncopated'} groove and dry rhythmic chords` },
      { section: '[Chorus]', description: `Full dynamic burst, layered vocal melodies, soaring lead lines, wide stereo image` },
      { section: '[Bridge / Drop]', description: `Sudden low-pass filter sweep and polyrhythmic breakdown, stripping back to bass and percussion` },
      { section: '[Outro]', description: `Extended rhythmic vamp fading into acoustic room reflections and tape hiss` }
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
    const client = getAI();
    const prompt = `
      You are the Lyric Lab lyricist at Strangelet Lab.
      Smash these two contrasting concepts together:
      Concept A: "${themeA}"
      Concept B: "${themeB}"
      Structure: "${structureType}"
      Rhyme Scheme / Cadence: "${rhymeScheme}"

      Format for AI Music Generators (like Suno or Udio), with tags like [Verse 1], [Chorus], [Bridge], [Outro].
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

    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    const raw = response.text || '';
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
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
    console.warn('Lyric Lab API bypassed, using algorithmic fallback:', err);
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
    const client = getAI();
    const prompt = `
      You are the Master Audio Deconstructor at Strangelet Lab.
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

    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    const raw = response.text || '';
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

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
    console.warn('Deconstructor API bypassed, using algorithmic fallback:', err);
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

