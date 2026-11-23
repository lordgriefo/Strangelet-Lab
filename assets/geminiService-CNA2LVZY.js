import{aV as m,aW as S,aX as y,a0 as $}from"./index-CUOsJISj.js";const x=async(e,n)=>{try{const r=`
      You are an expert Python engineer specializing in Audio Processing and AI pipelines.
      The user is building "Strangelet Lab", an AI music workstation.
      
      Context: ${n}
      
      Task: Generate the complete source code for the file: '${e}'.
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
    `,o=await m(r,{maxTokens:1200,temperature:.35});return o.engineSource!=="offline_dojo"&&o.text.trim()?o.text.replace(/^```(?:python|text|txt)?\s*/i,"").replace(/```\s*$/i,"").trim():e==="requirements.txt"?`# Strangelet Lab Modular DSP & AI Runtime Dependencies
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
`:`# Strangelet Lab Hardware & Plugin Manager (6GB VRAM Singleton)
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
`}catch(r){return console.warn("Local AI codegen bypassed:",r),`# Offline fallback active for ${e}
# Connect Kobold.cpp, Ollama, or LM Studio in AI Hub Settings for live generation.`}},N=async(e,n="suno")=>{const r=e.map(a=>`${a.label} (${a.category}, weight: ${Math.round((a.energyWeight||.75)*100)}%)`).join(", "),o=L(e,n),s=n==="acestep"?"Ace-Step 1.5 audio diffusion":n==="yue2"?"YuE 2.0 full-song synthesis":n==="udio"?"Udio style prompt":n==="suno"?"Suno style & prompt tags":"Universal AI music generators (Ace-Step, YuE 2, Suno, Udio)";try{const a=S(),d=y(),u=e.slice(0,3).map(h=>h.label).join(" + ");$(20,"interaction",`Collided [${u||"sonic particles"}] for ${s}`);const i=`
      You are Ghost in the Machine, the smart, personable Mad Scientist running Strangelet Lab's "Large Sonic Collider" (LSC).
      ${a}
      ${d}

      We have injected the following sonic particle chips into the collision chamber:
      [${r}]

      Target Engine Format: ${s}.

      Using your Software Dojo training on 5-layer prompt synthesis (Genre Fusion, Instruments & Synthesis, Tempo/BPM & Rhythm, Vocal Character & Delivery, Production Aesthetics & Era Tone), synthesize the collision into a JSON object with this EXACT structure:
      {
        "title": "Evocative Short Track Title",
        "promptText": "Rich, highly effective prompt string ready to paste directly into ${s}",
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
    `,g=await m(i,{maxTokens:600,temperature:.7});if(g.engineSource==="offline_dojo")return o;const p=g.text.replace(/```json/g,"").replace(/```/g,"").trim(),l=p.match(/\{[\s\S]*\}/),c=JSON.parse(l?l[0]:p);return{title:c.title||o.title,promptText:c.promptText||o.promptText,styleTags:Array.isArray(c.styleTags)?c.styleTags:o.styleTags,tempoBpm:c.tempoBpm||o.tempoBpm,vibeDescription:c.vibeDescription||o.vibeDescription,structureBlueprint:Array.isArray(c.structureBlueprint)?c.structureBlueprint:o.structureBlueprint,generatedAt:Date.now()}}catch(a){return console.warn("Local AI collider parse bypassed, using algorithmic sonic collider:",a),o}};function L(e,n){const r=e.filter(t=>t.category==="genre").map(t=>t.label),o=e.filter(t=>t.category==="era").map(t=>t.label),s=e.filter(t=>t.category==="rhythm").map(t=>t.label),a=e.filter(t=>t.category==="instrument").map(t=>t.label),d=e.filter(t=>t.category==="production").map(t=>t.label),u=e.filter(t=>t.category==="nuance").map(t=>t.label),i=[...e].sort((t,k)=>(k.energyWeight||.8)-(t.energyWeight||.8)).map(t=>t.label),g=Array.from(new Set([...i.slice(0,8),...r.slice(0,2),...o.slice(0,1),...s.slice(0,1),...a.slice(0,2),...d.slice(0,2),...u.slice(0,1)])).slice(0,8),p=i[0]||r[0]||"Indie Rock",l=i[1]||r[1]||d[0]||"Analog Tape",c=i.slice(2),h=a[0]||i[2]||"Analog Synth Lead",f=d[0]||"warm analog tape saturation",b=["Quantum","Solar","Velvet","Midnight","Strangelet","Resonant","Subatomic","Molten"],w=["Collision","Horizon","Reactor","Odyssey","Equation","Refraction","Transduction","Overdrive"],A=`${b[Math.floor(Math.random()*b.length)]} ${w[Math.floor(Math.random()*w.length)]}`,v=c.length>0?`, fused with ${c.join(", ")}`:"",_=n==="acestep"?"Punchy stereo master, tight loop-ready groove, analog saturation, wide headroom.":n==="yue2"?"Cohesive full-song arrangement with dynamic transitions and expressive vocal space.":"Dynamic arrangement with rich melodic transitions and detailed stereo depth.",T=`${p} collided with ${l}${v}. Featuring ${h}, ${s[0]||"driving groove"}, ${f}, ${u[0]||"raw visceral intensity"}. ${_}`;return{title:A,promptText:T,styleTags:g.length>0?g:["indie rock","samba","lo-fi","theremin","tape flutter"],tempoBpm:116,vibeDescription:`A high-energy collision merging ${p} character with ${l}${c.length>0?` and ${c[0]}`:""}, sculpted for ${n.toUpperCase()}.`,structureBlueprint:[{section:"[Intro]",description:`Atmosphere built around ${p} motif with subtle ${f}`},{section:"[Verse 1]",description:`Tight rhythm pocket locks in with ${l} texture and focused instrumentation`},{section:"[Chorus]",description:`Full-intensity collision combining ${i.slice(0,3).join(" + ")}, wide stereo projection`},{section:"[Bridge / Drop]",description:`Filter sweep breakdown spotlighting ${h} before slamming back into full energy`},{section:"[Outro]",description:"Extended fade with resonant harmonic tails and tape saturation decay"}],generatedAt:Date.now()}}const P=async(e,n,r="verse-chorus-bridge",o="AABB")=>{const s=M(e,n);try{const a=S(),d=y(),u=`
      You are the Lyric Lab lyricist at Strangelet Lab.
      ${a}
      ${d}

      Smash these two contrasting concepts together:
      Concept A: "${e}"
      Concept B: "${n}"
      Structure: "${r}"
      Rhyme Scheme / Cadence: "${o}"

      Format for AI Music Generators (like Suno, Udio, or YuE 2.0), incorporating structural bracket tags ([Intro], [Verse 1], [Pre-Chorus], [Chorus], [Bridge], [Outro]) and performance/vocal cues ([Whispered], [Ethereal Harmonies], [Spoken Word], etc.).
      Return a JSON object:
      {
        "title": "Evocative Song Title",
        "concept": "1-sentence summary of the collision",
        "structure": "${r}",
        "promptTags": ["trip hop", "haunting vocal", "88 bpm"],
        "fullFormattedText": "[Verse 1]\\nLine 1...\\n\\n[Chorus]...\\n",
        "stanzas": [
          {"section": "[Verse 1]", "lines": ["Line 1", "Line 2", "Line 3", "Line 4"]},
          {"section": "[Chorus]", "lines": ["Line 1", "Line 2", "Line 3", "Line 4"]}
        ]
      }
      Return ONLY valid JSON.
    `,i=await m(u,{maxTokens:700,temperature:.78});if(i.engineSource==="offline_dojo")return s;const g=i.text.replace(/```json/g,"").replace(/```/g,"").trim(),p=g.match(/\{[\s\S]*\}/),l=JSON.parse(p?p[0]:g);return{title:l.title||s.title,concept:l.concept||s.concept,structure:l.structure||r,promptTags:Array.isArray(l.promptTags)?l.promptTags:s.promptTags,fullFormattedText:l.fullFormattedText||s.fullFormattedText,stanzas:Array.isArray(l.stanzas)?l.stanzas:s.stanzas,generatedAt:Date.now()}}catch(a){return console.warn("Lyric Lab local inference bypassed, using algorithmic fallback:",a),s}};function M(e,n){return{title:"Aperture of the Night",concept:`Collision of ${e||"Quantum Physics"} with ${n||"Melancholic Road Trip"}.`,structure:"Verse - Chorus - Verse - Chorus - Bridge - Outro",promptTags:["indie rock","atmospheric","haunting vocals","analog synths","104 bpm"],fullFormattedText:`[Verse 1]
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
Fade into light.`,stanzas:[{section:"[Verse 1]",lines:["We traced the orbits where the night began to bend","A million light-years that we swore would never end","The cloud chamber whispers what the radar never showed","Two silver shadows on a desert access road."]},{section:"[Chorus]",lines:["Hold to the frequency, stay in the beam","Nothing is lost inside the particle stream","Spin state is turning, the cathode turns red","We are the voltage where angels won't tread."]}],generatedAt:Date.now()}}const I=async(e,n)=>{const r=D(e,n);try{const s=`
      You are the Master Audio Deconstructor at Strangelet Lab.
      ${y()}
      A user wants to reverse engineer the musical and production DNA of this reference:
      REFERENCE: "${e}"
      
      And then RE-IMAGINE it into a completely original song about this new topic:
      USER'S NEW TOPIC: "${n}"

      Reverse engineer:
      1. Genre, tempo, harmonic mood, key instruments, production techniques, lyrical cadence.
      2. Synthesize an original prompt string for Suno/Udio capturing that same production brilliance.
      3. Write 2 sample stanzas (Verse 1 + Chorus) applying that cadence to the user's new topic.

      Return JSON:
      {
        "referenceSong": "${e}",
        "targetTopic": "${n}",
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
    `,a=await m(s,{maxTokens:700,temperature:.72});if(a.engineSource==="offline_dojo")return r;const d=a.text.replace(/```json/g,"").replace(/```/g,"").trim(),u=d.match(/\{[\s\S]*\}/),i=JSON.parse(u?u[0]:d);return{referenceSong:e,targetTopic:n,analyzedDNA:i.analyzedDNA||r.analyzedDNA,reimaginedPrompt:i.reimaginedPrompt||r.reimaginedPrompt,reimaginedLyrics:i.reimaginedLyrics||r.reimaginedLyrics,styleTags:Array.isArray(i.styleTags)?i.styleTags:r.styleTags,generatedAt:Date.now()}}catch(o){return console.warn("Deconstructor local inference bypassed, using algorithmic fallback:",o),r}};function D(e,n){return{referenceSong:e,targetTopic:n,analyzedDNA:{genre:"Art Rock / Poly-Arpeggiated Indie & Ambient Neo-Soul",tempo:"138 BPM driving syncopated pocket",harmonicAtmosphere:"Suspended minor-ninth chords, cascading interlocking guitar arpeggios, buoyant modal lift",instrumentation:["Interlocking clean telecasters cross-panned in stereo","Warm P-Bass walking melodic counterpoint","Live brushed drum kit with unquantized swing","Lush analog synthesizer swell"],productionTechniques:["Zero quantization on live percussion for natural human pocket","Tight wooden room acoustics without artificial digital gloss","Tape console pre-amp saturation on low-end"],lyricalCadence:"Hypnotic, flowing, cyclical phrasing with repetition that builds into emotional release"},reimaginedPrompt:`Driving art rock with interlocking polyrhythmic clean telecaster arpeggios, melodic walking bassline, organic brush drums, and intimate vocal harmonies. Themed around ${n||"subterranean exploration"}. 138 BPM, raw room acoustics, warm tape saturation, evocative crescendo.`,reimaginedLyrics:`[Verse 1]
Down through the strata where the sunlight goes blind
Leaving the blueprints of the city behind
Pipes in the limestone and cable in coils
We carry the spark through the subterranean oils.

[Chorus]
Turn up the beacon, let the current run free
We are the divers in the dark of the sea
Everything heavy begins to float
As the water rises up to the throat.`,styleTags:["art rock","interlocking guitars","dynamic crescendo","organic drums","warm analog tape"],generatedAt:Date.now()}}export{P as a,N as c,x as g,I as r};
