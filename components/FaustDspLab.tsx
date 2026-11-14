import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Play, 
  Pause, 
  RotateCw, 
  Sparkles, 
  Download, 
  Plus, 
  Check, 
  X, 
  Volume2, 
  Sliders, 
  Cpu, 
  Radio, 
  Zap, 
  Flame, 
  Music, 
  Layers, 
  Bot, 
  ExternalLink,
  Code2,
  Mic,
  Activity,
  Disc,
  ChefHat,
  Wand2,
  Eye,
  Tag
} from 'lucide-react';
import { FaustDspToy, FaustDspParam, FaustIdeaTag, Track } from '../types';
import { 
  FAUST_DSP_PRESET_TOYS, 
  FAUST_IDEA_TAGS,
  compileFaustToyFromCode, 
  FaustDspLiveNode 
} from '../services/faustDspService';
import { consultGhost, getStoredKoboldSettings } from '../services/koboldCppService';
import { playLaserBeamSound, playColliderInjectionSound, getAudioContext } from '../lib/laserSound';

interface PromptRecipe {
  label: string;
  prompt: string;
  category: 'effect' | 'instrument' | 'toy';
  tag: FaustIdeaTag;
}

const PROMPT_TO_TOY_RECIPES: PromptRecipe[] = [
  {
    label: 'Underwater Muffled Reverb',
    prompt: 'Underwater Muffled Reverb with submerged resonant lowpass swirl and cavern feedback tail',
    category: 'effect',
    tag: 'Space & Dimension'
  },
  {
    label: 'Broken AM Radio',
    prompt: 'Broken AM Radio bandpass speaker crunch with static noise hiss and intermittent signal dropout',
    category: 'effect',
    tag: 'Grit & Crunch'
  },
  {
    label: 'Laser Gun Zap',
    prompt: 'Laser Gun Zap sci-fi plasma synth trigger with steep downward frequency sweep and overdrive',
    category: 'instrument',
    tag: 'Sci-Fi Glitch'
  },
  {
    label: 'Dub Siren',
    prompt: 'Dub Siren LFO pitch-wailing sound system oscillator with analog tape delay echo',
    category: 'instrument',
    tag: 'Sci-Fi Glitch'
  },
  {
    label: 'VHS Tape Wobble',
    prompt: 'VHS Tape Wobble modulated stereo delay drift with oxide high-cut warmth',
    category: 'effect',
    tag: 'Time & Warble'
  }
];

interface FaustDspLabProps {
  isOpen?: boolean;
  onClose?: () => void;
  tracks?: Track[];
  onApplyVstToTrack?: (trackId: string, vstName: string) => void;
  initialToyId?: string;
}

export const FaustDspLab: React.FC<FaustDspLabProps> = ({
  isOpen = true,
  onClose,
  tracks = [],
  onApplyVstToTrack,
  initialToyId = 'faust-tape-echo'
}) => {
  const [selectedToy, setSelectedToy] = useState<FaustDspToy>(() => {
    const found = FAUST_DSP_PRESET_TOYS.find(t => t.id === initialToyId);
    return found ? { ...found } : { ...FAUST_DSP_PRESET_TOYS[0] };
  });

  const [code, setCode] = useState<string>(selectedToy.code);
  const [params, setParams] = useState<FaustDspParam[]>(selectedToy.params);
  const [targetTrackId, setTargetTrackId] = useState<string>(tracks[0]?.id || '');
  const [isPlayingTest, setIsPlayingTest] = useState<boolean>(false);
  const [testSource, setTestSource] = useState<'guitar' | 'drums' | 'synth' | 'trigger'>('guitar');
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [workbenchTab, setWorkbenchTab] = useState<'editor' | 'idea_board'>('editor');
  const [selectedIdeaTag, setSelectedIdeaTag] = useState<'ALL' | FaustIdeaTag>('ALL');
  const [notification, setNotification] = useState<string | null>(null);

  const liveNodeRef = useRef<FaustDspLiveNode | null>(null);
  const testOscRef = useRef<{ osc: OscillatorNode; gain: GainNode } | null>(null);
  const testIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3200);
  };

  // Rebuild DSP node when selectedToy changes
  useEffect(() => {
    if (liveNodeRef.current) {
      liveNodeRef.current.dispose();
    }
    liveNodeRef.current = new FaustDspLiveNode(selectedToy);

    return () => {
      if (liveNodeRef.current) {
        liveNodeRef.current.dispose();
        liveNodeRef.current = null;
      }
      stopTestSignal();
    };
  }, [selectedToy.id]);

  const handleSelectPresetToy = (toy: FaustDspToy) => {
    setSelectedToy({ ...toy });
    setCode(toy.code);
    setParams(toy.params.map(p => ({ ...p })));
    playLaserBeamSound('laser_select');
  };

  const handleParamChange = (paramId: string, val: number) => {
    setParams(prev => prev.map(p => p.id === paramId ? { ...p, value: val } : p));
    if (liveNodeRef.current) {
      liveNodeRef.current.updateParam(paramId, val);
    }
  };

  const handleCompileCode = () => {
    setIsCompiling(true);
    playColliderInjectionSound();

    try {
      const compiled = compileFaustToyFromCode(code, selectedToy.name, selectedToy.category);
      setSelectedToy(compiled);
      setParams(compiled.params);

      if (liveNodeRef.current) {
        liveNodeRef.current.dispose();
      }
      liveNodeRef.current = new FaustDspLiveNode(compiled);

      showToast(`Faust code compiled successfully! ${compiled.params.length} parameters mapped.`);
      playLaserBeamSound('laser_curve');
    } catch (err: any) {
      showToast(`Compilation error: ${err.message || 'Syntax error'}`);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleTriggerPluckOrNote = () => {
    if (liveNodeRef.current) {
      liveNodeRef.current.triggerInstrument();
      playLaserBeamSound('laser_select');
    }
  };

  // Live Test Audio Signal Generator (Guitar riff, Drum beat, or Synth arpeggio)
  const toggleTestSignal = () => {
    const ctx = getAudioContext();
    if (!liveNodeRef.current) return;

    if (isPlayingTest) {
      stopTestSignal();
      setIsPlayingTest(false);
    } else {
      ctx.resume();
      startTestSignal(testSource);
      setIsPlayingTest(true);
      playLaserBeamSound('laser_audio');
    }
  };

  const startTestSignal = (type: 'guitar' | 'drums' | 'synth' | 'trigger') => {
    const ctx = getAudioContext();
    stopTestSignal();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'guitar') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(146.83, ctx.currentTime); // D3
      gain.gain.setValueAtTime(0.3, ctx.currentTime);

      // Create a repeating guitar-like rhythm
      const interval = 0.35;
      const notes = [146.83, 164.81, 196.00, 220.00, 196.00];
      let noteIdx = 0;
      testIntervalRef.current = setInterval(() => {
        if (!testOscRef.current) {
          if (testIntervalRef.current) clearInterval(testIntervalRef.current);
          return;
        }
        osc.frequency.setValueAtTime(notes[noteIdx % notes.length], ctx.currentTime);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.3);
        noteIdx++;
      }, interval * 1000);
    } else if (type === 'drums') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(65, ctx.currentTime);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
    } else {
      osc.type = 'square';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
    }

    if (liveNodeRef.current) {
      osc.connect(gain);
      gain.connect(liveNodeRef.current.input);
      liveNodeRef.current.output.connect(ctx.destination);
    }

    osc.start();
    testOscRef.current = { osc, gain };
  };

  const stopTestSignal = () => {
    if (testIntervalRef.current) {
      clearInterval(testIntervalRef.current);
      testIntervalRef.current = null;
    }
    if (testOscRef.current) {
      try {
        testOscRef.current.osc.stop();
        testOscRef.current.osc.disconnect();
        testOscRef.current.gain.disconnect();
      } catch (e) {
        // Ignored
      }
      testOscRef.current = null;
    }
  };

  // AI Helper: Generate Faust Code from Natural Language or One-Click Recipe
  const handleAskAiForFaustCode = async (
    overridePrompt?: string,
    overrideName?: string,
    overrideCategory: 'effect' | 'instrument' | 'toy' = 'effect'
  ) => {
    const activePrompt = (overridePrompt ?? aiPrompt).trim();
    if (!activePrompt || isAiGenerating) return;
    if (overridePrompt !== undefined) {
      setAiPrompt(overridePrompt);
    }

    setIsAiGenerating(true);
    playLaserBeamSound('laser_select');

    const settings = getStoredKoboldSettings();
    const persona = settings.defaultPersona || 'ghost';

    const prompt = `
[TASK: WRITE REAL-TIME FAUST DSP CODE (.dsp)]
You are GHOST (The Ghost in the Machine), an expert Faust DSP architect. Brew a standalone Faust audio effect or instrument toy.
User specification: "${activePrompt}"
Requirements:
1. Start with import("stdfaust.lib");
2. Declare interactive UI controls using hslider or vslider or button with [unit:xyz] tags.
3. Write clean, mathematical DSP signal flow.
4. Output ONLY the Faust code inside a \`\`\`faust ... \`\`\` codeblock.
`;

    try {
      const reply = await consultGhost(prompt, [], {}, persona);
      const codeMatch = reply.text.match(/```(?:faust)?([\s\S]*?)```/);
      const generatedCode = codeMatch ? codeMatch[1].trim() : reply.text.trim();

      const toyTitle = overrideName || `GHOST: ${activePrompt.slice(0, 26)}`;
      setCode(generatedCode);
      const compiled = compileFaustToyFromCode(generatedCode, toyTitle, overrideCategory);
      setSelectedToy(compiled);
      setParams(compiled.params);

      if (liveNodeRef.current) {
        liveNodeRef.current.dispose();
        liveNodeRef.current = new FaustDspLiveNode(compiled);
      }

      setWorkbenchTab('editor');
      setShowAiModal(false);
      playColliderInjectionSound();
      showToast(`GHOST assembled & compiled "${toyTitle}" (${compiled.params.length} live params)!`);
    } catch (err) {
      showToast('Failed to generate Faust code with GHOST.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSelectRecipeChip = (recipe: PromptRecipe) => {
    setAiPrompt(recipe.prompt);
    void handleAskAiForFaustCode(recipe.prompt, recipe.label, recipe.category);
  };

  const handleInspectAndTweakToy = (toy: FaustDspToy) => {
    handleSelectPresetToy(toy);
    setWorkbenchTab('editor');
    showToast(`Loaded "${toy.name}" into DSP Workbench for inspection & live tweaking.`);
  };

  // Deploy to Channel Strip as VST
  const handleDeployToChannel = () => {
    if (!targetTrackId || !onApplyVstToTrack) return;
    const vstName = `Faust: ${selectedToy.name}`;
    onApplyVstToTrack(targetTrackId, vstName);
    playColliderInjectionSound();
    showToast(`Deployed ${selectedToy.name} into Channel Strip!`);
  };

  // Download Faust .dsp code
  const handleDownloadDsp = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedToy.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.dsp`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exported ${a.download}`);
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#07090F] text-[#E0E6F8] font-mono select-none overflow-y-auto">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-cyan-950/90 border border-cyan-400 text-cyan-200 text-xs shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center gap-2 animate-fade-in backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-cyan-300 animate-spin" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="px-6 py-4 border-b border-[#182035] bg-gradient-to-r from-[#0C101E] via-[#0F1528] to-[#0A0D18] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 via-purple-500/20 to-amber-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-wider text-white uppercase">
                FAUST DSP TOY LAB // VST & INSTRUMENT BUILDER
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-bold">
                FUNCTIONAL AUDIO STREAM
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-purple-300 font-bold">
                REAL-TIME WEBAUDIO
              </span>
            </div>
            <p className="text-xs text-[#7F87A7] mt-0.5">
              Code boutique guitar pedals, tape delays, and physical modeling instruments in Faust with live sliders.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAiModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-600/30 to-purple-600/30 hover:from-amber-600/50 hover:to-purple-600/50 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(245,158,11,0.25)]"
          >
            <Bot className="w-4 h-4 text-amber-300" />
            <span>Ask GHOST to Brew Faust Toy</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#7F87A7] hover:text-white hover:bg-[#182035] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Preset Faust Toys Carousel (12 Boutique Models) */}
      <div className="px-6 py-2.5 border-b border-[#141B2D] bg-[#0A0D18] flex items-center gap-2 overflow-x-auto text-xs flex-shrink-0">
        <span className="text-[10px] font-bold text-[#636C8F] uppercase tracking-wider shrink-0 mr-1">
          Boutique Presets ({FAUST_DSP_PRESET_TOYS.length}):
        </span>
        {FAUST_DSP_PRESET_TOYS.map(toy => {
          const isSelected = selectedToy.id === toy.id;
          return (
            <button
              key={toy.id}
              onClick={() => handleSelectPresetToy(toy)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                isSelected
                  ? 'bg-[#151C30] border-white/40 text-white shadow-md'
                  : 'bg-[#0E1322] border-[#1E2742] text-[#7F87A8] hover:text-white hover:bg-[#131A2E]'
              }`}
              style={isSelected ? { borderColor: toy.color, boxShadow: `0 0 12px ${toy.color}33` } : {}}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: toy.color }} />
              <span>{toy.name}</span>
            </button>
          );
        })}
      </div>

      {/* Prompt-to-Toy One-Click Recipes Strip */}
      <div className="px-6 py-2.5 border-b border-[#161E34] bg-[#080B14] flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 flex-shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 lg:pb-0">
          <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
            <Wand2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Prompt-to-Toy Recipes:</span>
          </span>
          {PROMPT_TO_TOY_RECIPES.map(recipe => (
            <button
              key={recipe.label}
              onClick={() => handleSelectRecipeChip(recipe)}
              disabled={isAiGenerating}
              className="px-2.5 py-1 rounded-lg bg-[#12172A] hover:bg-amber-950/50 border border-[#242E4F] hover:border-amber-400/60 text-[11px] font-bold text-[#CBD5F5] hover:text-amber-200 transition-all shrink-0 flex items-center gap-1.5 disabled:opacity-50"
              title={`1-Click: Fill prompt & let GHOST compile ${recipe.label}`}
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{recipe.label}</span>
            </button>
          ))}
        </div>

        {/* Live AI Prompt Box */}
        <form
          onSubmit={e => {
            e.preventDefault();
            void handleAskAiForFaustCode();
          }}
          className="flex items-center gap-2 lg:w-[420px] shrink-0"
        >
          <input
            type="text"
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            placeholder="Describe a custom Faust DSP toy or click a recipe..."
            className="flex-1 px-3 py-1.5 rounded-lg bg-[#0E1324] border border-[#232D4D] text-white text-[11px] focus:outline-none focus:border-amber-400 placeholder:text-[#5B6487]"
          />
          <button
            type="submit"
            disabled={isAiGenerating || !aiPrompt.trim()}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-purple-600 hover:from-amber-500 hover:to-purple-500 text-white font-bold text-[11px] flex items-center gap-1.5 disabled:opacity-40 shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
          >
            {isAiGenerating ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
            <span>{isAiGenerating ? 'Brewing...' : 'Brew Toy'}</span>
          </button>
        </form>
      </div>

      {/* Main Workspace Split View */}
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Left Column: Code Editor OR Idea Board / DSP Kitchen (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-4 min-h-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* View Toggle Next to Code Editor */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0B0F1D] border border-[#1E2745]">
              <button
                onClick={() => {
                  setWorkbenchTab('editor');
                  playLaserBeamSound('laser_select');
                }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                  workbenchTab === 'editor'
                    ? 'bg-cyan-950/90 border border-cyan-400/60 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                    : 'text-[#848EB2] hover:text-white'
                }`}
              >
                <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Faust Code Editor</span>
              </button>
              <button
                onClick={() => {
                  setWorkbenchTab('idea_board');
                  playLaserBeamSound('laser_select');
                }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                  workbenchTab === 'idea_board'
                    ? 'bg-purple-950/90 border border-purple-400/60 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.25)]'
                    : 'text-[#848EB2] hover:text-white'
                }`}
              >
                <ChefHat className="w-3.5 h-3.5 text-purple-400" />
                <span>Idea Board / Cookbook</span>
              </button>
            </div>

            {workbenchTab === 'editor' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadDsp}
                  className="px-2.5 py-1 rounded-lg bg-[#12182B] hover:bg-[#1A223B] border border-[#212A45] text-[10px] text-[#8E95B8] hover:text-white flex items-center gap-1 transition-colors"
                  title="Download standard Faust .dsp code file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export .dsp</span>
                </button>

                <button
                  onClick={handleCompileCode}
                  disabled={isCompiling}
                  className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isCompiling ? 'animate-spin' : ''}`} />
                  <span>Compile & Run DSP</span>
                </button>
              </div>
            ) : (
              <span className="text-[10px] text-[#8E98BC] font-bold uppercase tracking-wider">
                DSP Kitchen • {FAUST_DSP_PRESET_TOYS.length} Boutique Recipes
              </span>
            )}
          </div>

          {workbenchTab === 'editor' ? (
            <>
              <div className="flex-1 relative rounded-2xl overflow-hidden border border-[#1E2642] bg-[#05070E] shadow-inner flex flex-col min-h-[350px]">
                <textarea
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  spellCheck={false}
                  className="w-full flex-1 p-4 bg-transparent text-[#67E8F9] font-mono text-xs leading-relaxed focus:outline-none resize-none selection:bg-cyan-900 selection:text-white"
                />
              </div>

              {/* Quick Syntax Tip */}
              <div className="p-3 rounded-xl bg-[#090C16] border border-[#1A223B] text-[10px] text-[#71789B] flex items-center justify-between">
                <span>
                  💡 Declaring sliders like <code className="text-cyan-300">hslider("Cutoff[unit:Hz]", 1000, 20, 20000, 1)</code> automatically generates live GUI knobs!
                </span>
                <span className="text-cyan-400 font-bold ml-2">Faust v2.70</span>
              </div>
            </>
          ) : (
            /* VISUAL IDEA BOARD / DSP KITCHEN */
            <div className="flex-1 flex flex-col space-y-3 min-h-[380px] overflow-hidden">
              {/* Tag Filter Row */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setSelectedIdeaTag('ALL')}
                  className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all ${
                    selectedIdeaTag === 'ALL'
                      ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200'
                      : 'bg-[#0D1222] border-[#1F2947] text-[#8892B5] hover:text-white'
                  }`}
                >
                  All ({FAUST_DSP_PRESET_TOYS.length})
                </button>
                {FAUST_IDEA_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedIdeaTag(tag)}
                    className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all flex items-center gap-1 ${
                      selectedIdeaTag === tag
                        ? 'bg-purple-950/80 border-purple-400 text-purple-200'
                        : 'bg-[#0D1222] border-[#1F2947] text-[#8892B5] hover:text-white'
                    }`}
                  >
                    <Tag className="w-2.5 h-2.5" />
                    <span>[{tag}]</span>
                  </button>
                ))}
              </div>

              {/* Idea Board Cards Organized by Tag */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                {FAUST_IDEA_TAGS.filter(tag => selectedIdeaTag === 'ALL' || selectedIdeaTag === tag).map(tag => {
                  const groupToys = FAUST_DSP_PRESET_TOYS.filter(t => t.ideaTag === tag);
                  if (groupToys.length === 0) return null;

                  return (
                    <div key={tag} className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-bold text-[#A5B4FC] uppercase tracking-wider">
                          [{tag}]
                        </span>
                        <span className="text-[10px] text-[#646E91]">
                          {groupToys.length} {groupToys.length === 1 ? 'model' : 'models'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {groupToys.map(toy => {
                          const isActive = selectedToy.id === toy.id;
                          return (
                            <div
                              key={toy.id}
                              className={`p-3.5 rounded-xl border bg-[#0A0E1B] transition-all flex flex-col justify-between space-y-3 ${
                                isActive
                                  ? 'border-cyan-400/70 shadow-[0_0_16px_rgba(6,182,212,0.18)]'
                                  : 'border-[#1E2744] hover:border-[#344270]'
                              }`}
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="text-xs font-bold text-white leading-snug">
                                    {toy.name}
                                  </h4>
                                  <span
                                    className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0"
                                    style={{ backgroundColor: `${toy.color || '#00F0FF'}22`, color: toy.color || '#00F0FF' }}
                                  >
                                    {toy.category}
                                  </span>
                                </div>

                                <div className="text-[10px] font-bold text-amber-300">
                                  Archetype: {toy.archetype || toy.category}
                                </div>

                                <p className="text-[11px] text-[#98A2C6] leading-relaxed">
                                  {toy.howItWorks || toy.description}
                                </p>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                <span className="text-[9px] text-[#6B7499] uppercase">
                                  {toy.params.length} Controls
                                </span>
                                <button
                                  onClick={() => handleInspectAndTweakToy(toy)}
                                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600/80 to-blue-600/80 hover:from-cyan-500 hover:to-blue-500 text-white text-[10px] font-bold flex items-center gap-1.5 transition-all"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Inspect & Tweak</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live GUI Parameter Rack, Testing Deck & Channel Strip Deployment (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Live Parameter Rack */}
          <div className="p-5 rounded-2xl bg-[#0B0F1C] border border-[#1E2642] flex flex-col flex-1 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                  <span>{selectedToy.name}</span>
                </h3>
                <p className="text-[10px] text-[#7A83A8] mt-0.5">{selectedToy.description}</p>
              </div>

              <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: `${selectedToy.color}22`, color: selectedToy.color }}>
                {selectedToy.category}
              </span>
            </div>

            {/* Live Sliders List */}
            <div className="space-y-3.5 flex-1 overflow-y-auto pr-1">
              {params.map(p => (
                <div key={p.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#A2A9D0] font-bold">{p.name}</span>
                    <span className="text-cyan-300 font-mono font-bold">
                      {p.value} {p.unit || ''}
                    </span>
                  </div>

                  {p.type === 'slider' ? (
                    <input
                      type="range"
                      min={p.min}
                      max={p.max}
                      step={p.step}
                      value={p.value}
                      onChange={e => handleParamChange(p.id, parseFloat(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  ) : (
                    <button
                      onClick={handleTriggerPluckOrNote}
                      className="w-full py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition-all active:scale-95 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                    >
                      Trigger Note / Pluck
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Live Audio Audition Deck */}
            <div className="pt-3 border-t border-[#1C233B] space-y-2">
              <span className="text-[10px] font-bold text-[#8B94B8] uppercase tracking-wider block">
                Audition Test Signal
              </span>

              <div className="flex items-center gap-2">
                <div className="grid grid-cols-3 gap-1 flex-1">
                  {[
                    { id: 'guitar', label: '🎸 Guitar Riff' },
                    { id: 'drums', label: '🥁 Drum Break' },
                    { id: 'synth', label: '🎹 Synth Arp' }
                  ].map(s => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setTestSource(s.id as any);
                        if (isPlayingTest) {
                          startTestSignal(s.id as any);
                        }
                      }}
                      className={`py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                        testSource === s.id
                          ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300'
                          : 'bg-[#12182B] border-[#222B49] text-[#7A83A8] hover:text-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={toggleTestSignal}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    isPlayingTest
                      ? 'bg-red-950/80 border border-red-500 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                      : 'bg-emerald-950/80 border border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  }`}
                >
                  {isPlayingTest ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlayingTest ? 'Stop' : 'Audition'}</span>
                </button>
              </div>
            </div>

            {/* Deploy to Channel Strip */}
            <div className="pt-3 border-t border-[#1C233B] space-y-2">
              <span className="text-[10px] font-bold text-[#8B94B8] uppercase tracking-wider block">
                Deploy to Mixer Console
              </span>

              <div className="flex gap-2">
                <select
                  value={targetTrackId}
                  onChange={e => setTargetTrackId(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-[#0D1222] border border-[#212B47] text-white text-xs focus:outline-none"
                >
                  {tracks.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.type})
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleDeployToChannel}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Insert VST</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Faust Toy Code Generator Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-[#0A0D1A] border border-[#222B45] shadow-[0_0_50px_rgba(0,0,0,0.9)] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  GHOST // Faust DSP Toy Architect
                </h3>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="text-[#7F87A8] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#828BAE] leading-relaxed">
              Describe the audio effect, distortion pedal, filter, or physical instrument toy you want. GHOST (The Ghost in the Machine) will brew pristine Faust DSP code with mapped sliders.
            </p>

            {/* Quick Recipe Chips inside Modal */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                1-Click Prompt-to-Toy Recipes:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PROMPT_TO_TOY_RECIPES.map(recipe => (
                  <button
                    key={recipe.label}
                    type="button"
                    onClick={() => handleSelectRecipeChip(recipe)}
                    disabled={isAiGenerating}
                    className="px-2.5 py-1 rounded-lg bg-[#141A30] hover:bg-amber-950/60 border border-[#263156] hover:border-amber-400/60 text-[10px] font-bold text-[#CBD5F5] hover:text-amber-200 transition-all disabled:opacity-50"
                  >
                    {recipe.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder="e.g. A warm analog bucket-brigade flanger with triangle LFO and high-pass feedback..."
              rows={3}
              className="w-full p-3 rounded-xl bg-[#11172A] border border-[#222B45] text-white text-xs focus:outline-none focus:border-cyan-400 resize-none"
            />

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowAiModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-[#828BAE] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleAskAiForFaustCode()}
                disabled={isAiGenerating || !aiPrompt.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-purple-600 hover:from-amber-500 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.3)] disabled:opacity-50"
              >
                {isAiGenerating ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{isAiGenerating ? 'Synthesizing Faust Code...' : 'Generate Faust Toy'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FaustDspLab;
