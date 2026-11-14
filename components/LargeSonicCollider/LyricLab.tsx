import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Sparkles, 
  Copy, 
  Check, 
  Archive, 
  Zap, 
  RotateCcw, 
  Layers, 
  Sliders, 
  BookOpen, 
  Feather,
  Wand2,
  Tag,
  Search,
  Plus,
  Compass,
  Headphones,
  Music,
  Mic,
  Disc,
  Info,
  Flame,
  Volume2,
  X,
  Save
} from 'lucide-react';
import { LyricLabOutput, ArchiveItem, SunoMetaTag, SunoStyleItem } from '../../types';
import { generateLyricLabGemini } from '../../services/geminiService';
import { getStoredKoboldSettings } from '../../services/koboldCppService';
import { getGhostShortModelBadge } from '../../services/hardwareResourceManager';
import { playColliderInjectionSound, playLaserBeamSound } from '../../lib/laserSound';
import { SUNO_META_TAGS_CATALOG, SUNO_STYLE_CATALOG } from '../../lib/sonicColliderData';
import { lyricLabDB, tagDescriptions } from '../../lib/sonicSectorStaticData';
import { SonicPreset } from '../../services/sonicData';

interface LyricLabProps {
  onSaveToArchive: (item: ArchiveItem) => void;
  onOpenArchive: () => void;
  activePreset?: SonicPreset | null;
  onClearActivePreset?: () => void;
  collisionEnergy?: number;
  onSaveCollisionClick?: (themeA: string, themeB: string, result: LyricLabOutput | null) => void;
  onOpenSavedCollisions?: () => void;
  externalThemeA?: string;
  externalThemeB?: string;
}



const THEME_PRESETS_A = [
  { label: 'Quantum Field Theory & Entanglement', desc: 'Wavefunctions, spooky action, leptons, zero-kelvin physics' },
  { label: 'Twin Peaks / Lynchian Dream Noir', desc: 'Red curtains, backward speech, diner jukeboxes, mysterious woods' },
  { label: 'Ancient Hermetic Alchemy', desc: 'Emerald tablet, mercury transmuted to gold, sacred geometry' },
  { label: 'Subterranean Cyberpunk Subways', desc: 'Fiber optic cables in dark water, glowing neon ads, abandoned terminals' },
  { label: 'Solar Flares & Cosmic Solitude', desc: 'Radio transmissions fading in deep space, lonely satellite telemetry' }
];

const THEME_PRESETS_B = [
  { label: 'Rain-soaked 3 AM Heartbreak', desc: 'Unsent letters, headlights in puddles, cold diner coffee' },
  { label: '90s Cassette Pirate Radio', desc: 'Static hiss, illegal midnight broadcasts, stolen frequencies' },
  { label: 'Desert Ghost Towns & Stargazing', desc: 'Rusting barbed wire, night wind through yucca trees, coyote cries' },
  { label: 'Neo-Tokyo Rooftop Romance', desc: 'Electric umbrellas, holographic cherry blossoms, high-speed train hum' },
  { label: 'Industrial Machine Rhythm', desc: 'Hydraulic presses, iron foundries, rhythmic clockwork pulse' }
];

const STYLE_PRESET_COMBOS = [
  {
    name: '80s Darkwave & Analog Synth',
    chips: ['darkwave', 'analog synthesizers, juno chorus', 'punchy rickenbacker bass', 'ethereal female vocals', '120 bpm, four-on-the-floor driving beat', 'warm analog tape saturation']
  },
  {
    name: 'Lo-Fi Shoegaze Dream Fuzz',
    chips: ['shoegaze, fuzz guitar wall', 'vintage mellotron tape strings', 'intimate whispered vocals', 'wide stereo mix, immersive depth', 'lo-fi cassette texture, gentle hiss', 'nocturnal, melancholic, 3am mood']
  },
  {
    name: 'Liquid Drum & Bass Soul',
    chips: ['liquid drum and bass, 174 bpm', 'fender rhodes electric piano', 'heavy 808 sub-bass', 'soulful belted vocals', 'lush cavernous hall reverb', 'euphoric, uplifting, triumphant']
  },
  {
    name: 'Midwest Emo & Math Rock',
    chips: ['midwest emo, clean guitar tapping', 'math rock, odd time signatures', 'punchy acoustic drum kit', 'raspy male vocals', 'raw aggressive intensity, rebellious', 'dry up-front mix, zero reverb']
  },
  {
    name: 'Desert Blues & Shamanic Trance',
    chips: ['desert blues, hypnotic guitar groove', 'fingerpicked steel string acoustic guitar', 'spoken-word deadpan vocals', 'hypnotic, repetitive trance groove', 'vintage vinyl surface crackle']
  }
];

export const LyricLab: React.FC<LyricLabProps> = ({ 
  onSaveToArchive, 
  onOpenArchive,
  activePreset,
  onClearActivePreset,
  collisionEnergy = 8.4,
  onSaveCollisionClick,
  onOpenSavedCollisions,
  externalThemeA,
  externalThemeB
}) => {
  // Navigation tabs inside Lyric Lab
  const [activeTab, setActiveTab] = useState<'editor' | 'style_builder' | 'tags_palette' | 'influences_db'>('editor');

  // Influences & Visuals Archive state
  const [influenceCategory, setInfluenceCategory] = useState<string>('Songwriting: The Masters');
  const [influenceSearch, setInfluenceSearch] = useState<string>('');
  const [influenceGroup, setInfluenceGroup] = useState<string>('all');
  const [influenceNotification, setInfluenceNotification] = useState<string | null>(null);

  // Lyrical Collision state
  const [themeA, setThemeA] = useState<string>('Quantum Field Theory & Entanglement');
  const [themeB, setThemeB] = useState<string>('Rain-soaked 3 AM Heartbreak');
  const [structureType, setStructureType] = useState<string>('Verse - Chorus - Verse - Chorus - Bridge - Outro');
  const [rhymeScheme, setRhymeScheme] = useState<string>('AABB Melodic Rhyme');
  const [cutUpRatio, setCutUpRatio] = useState<number>(0.3); // 0% = classic rhyme, 100% = Burroughs cut-up

  // Sync external preset when selected from LargeSonicCollider preset selector
  useEffect(() => {
    if (activePreset && activePreset.mode === 'lyrics') {
      if (activePreset.beamA) setThemeA(activePreset.beamA);
      if (activePreset.beamB) setThemeB(activePreset.beamB);
      if (activePreset.promptSnippet) {
        setCustomStylePrompt(activePreset.promptSnippet);
        setSelectedStyleChips(activePreset.promptSnippet.split(',').map(s => s.trim()).filter(Boolean));
      }
      if (activePreset.structure) setStructureType(activePreset.structure);
      if (activePreset.rhymeScheme) setRhymeScheme(activePreset.rhymeScheme);
      if (activePreset.category && lyricLabDB[activePreset.category]) {
        setInfluenceCategory(activePreset.category);
      }
      playLaserBeamSound('laser_midi');
    }
  }, [activePreset]);

  // Sync external restored themes from saved collisions
  useEffect(() => {
    if (externalThemeA) setThemeA(externalThemeA);
    if (externalThemeB) setThemeB(externalThemeB);
  }, [externalThemeA, externalThemeB]);

  const [ghostBadge, setGhostBadge] = useState<string>(() => getGhostShortModelBadge(getStoredKoboldSettings().modelName));

  useEffect(() => {
    const syncBadge = () => setGhostBadge(getGhostShortModelBadge(getStoredKoboldSettings().modelName));
    window.addEventListener('storage', syncBadge);
    window.addEventListener('strangelet:kobold_updated', syncBadge);
    return () => {
      window.removeEventListener('storage', syncBadge);
      window.removeEventListener('strangelet:kobold_updated', syncBadge);
    };
  }, []);

  const [isInjecting, setIsInjecting] = useState<boolean>(false);
  const [output, setOutput] = useState<LyricLabOutput | null>(null);
  
  // Editable lyrics text buffer
  const [editableLyrics, setEditableLyrics] = useState<string>(
`[Atmospheric Intro]
(Pulsing analog synth, distant tape hiss)

[Verse 1]
We measured the angle of your departure in radians
Cold cloud chamber traces on the bedroom floor
The detector flashed once: parity violation
Now I hear your voice through the radio core.

[Pre-Chorus]
[Whisper]
Wavefunctions collapse when you look away...

[Chorus]
[Belting]
Spin state down, spin state up
Pour the strangelet in my silver cup
Light-years fold where the leptons bleed
Spooky action is all we need!

[Guitar Solo]

[Verse 2]
Feynman diagrams carved into the radiator
Steam rising up like subatomic ghosts
You were the positron, I was the annihilator
Burning through what we loved the most.

[Bridge]
[Emotional Belting]
Collided frequency / shattered prism / the tape loops reverse
Gravity bends the vowel / electrons don't rehearse.

[Drop]
[Outro]
[Fade Out]
Superposition fading out...
Spin state down.`);

  const [copiedLyrics, setCopiedLyrics] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);

  // Textarea reference for inserting tags at cursor position
  const lyricsTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Tag Inserter Search & Category filter
  const [tagSearch, setTagSearch] = useState<string>('');
  const [tagCategory, setTagCategory] = useState<string>('all');
  const [lastInsertedTag, setLastInsertedTag] = useState<string | null>(null);

  // Suno Style Prompt Builder state
  const [selectedStyleChips, setSelectedStyleChips] = useState<string[]>([
    'darkwave',
    'analog synthesizers, juno chorus',
    'driving rickenbacker bass',
    'ethereal female vocals',
    '120 bpm, four-on-the-floor driving beat',
    'warm analog tape saturation'
  ]);
  const [customStylePrompt, setCustomStylePrompt] = useState<string>(
    'darkwave, analog synthesizers, juno chorus, driving rickenbacker bass, ethereal female vocals, 120 bpm, four-on-the-floor driving beat, warm analog tape saturation'
  );
  const [styleCategory, setStyleCategory] = useState<string>('all');
  const [styleSearch, setStyleSearch] = useState<string>('');
  const [copiedStyle, setCopiedStyle] = useState<boolean>(false);

  // Inject Lyric Beam via Gemini
  const handleInjectLyricBeam = async () => {
    setIsInjecting(true);
    setSaved(false);

    // Play beam injection sound
    playColliderInjectionSound();

    try {
      const res = await generateLyricLabGemini(
        themeA, 
        themeB, 
        structureType, 
        `${rhymeScheme} (Burroughs Cut-up influence: ${Math.round(cutUpRatio * 100)}%)`
      );
      setOutput(res);
      setEditableLyrics(res.fullFormattedText);
    } catch (err) {
      console.error('Lyric Lab error:', err);
    } finally {
      setTimeout(() => {
        setIsInjecting(false);
      }, 1300);
    }
  };

  // Insert tag into editable lyrics at cursor position
  const insertTagAtCursor = (tagStr: string) => {
    const textarea = lyricsTextareaRef.current;
    playLaserBeamSound('laser_midi');
    setLastInsertedTag(tagStr);
    setTimeout(() => setLastInsertedTag(null), 1800);

    if (!textarea) {
      // Append if no ref
      setEditableLyrics(prev => prev + '\n\n' + tagStr);
      return;
    }

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const before = editableLyrics.substring(0, start);
    const after = editableLyrics.substring(end);

    // Ensure tidy line breaks
    const prefix = before.endsWith('\n') || before.length === 0 ? '' : '\n';
    const suffix = after.startsWith('\n') || after.length === 0 ? '\n' : '\n';

    const nextText = `${before}${prefix}${tagStr}${suffix}${after}`;
    setEditableLyrics(nextText);

    // Re-focus and position cursor right after tag
    setTimeout(() => {
      textarea.focus();
      const newPos = start + prefix.length + tagStr.length + suffix.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 50);
  };

  // Copy Lyrics
  const handleCopyLyrics = () => {
    navigator.clipboard.writeText(editableLyrics);
    setCopiedLyrics(true);
    playLaserBeamSound('laser_select');
    setTimeout(() => setCopiedLyrics(false), 2000);
  };

  // Copy Style Prompt
  const handleCopyStyle = () => {
    navigator.clipboard.writeText(customStylePrompt);
    setCopiedStyle(true);
    playLaserBeamSound('laser_select');
    setTimeout(() => setCopiedStyle(false), 2000);
  };

  // Inject Style Prompt into Lyrics as a header or mid-song shift
  const handleInjectStyleIntoLyrics = () => {
    const styleSnippet = `[Style: ${customStylePrompt}]`;
    insertTagAtCursor(styleSnippet);
  };

  // Save to Archive
  const handleArchive = () => {
    const title = output?.title || `Lyrical Collision: ${themeA.slice(0, 20)} x ${themeB.slice(0, 20)}`;
    const item: ArchiveItem = {
      id: `lyric-${Date.now()}`,
      title,
      type: 'lyric_lab',
      timestamp: Date.now(),
      summary: `Collision: "${themeA}" x "${themeB}". Style: ${customStylePrompt.slice(0, 60)}...`,
      tags: output?.promptTags || ['lyrics', 'suno-prompts', 'strangelet-lab'],
      lyricResult: {
        title,
        concept: `${themeA} x ${themeB}`,
        structure: structureType,
        stanzas: [],
        promptTags: selectedStyleChips,
        fullFormattedText: editableLyrics,
        generatedAt: Date.now()
      },
      starred: true
    };
    onSaveToArchive(item);
    setSaved(true);
    playLaserBeamSound('laser_audio');
    setTimeout(() => setSaved(false), 2500);
  };

  // Randomize Themes
  const randomizeThemes = () => {
    const a = THEME_PRESETS_A[Math.floor(Math.random() * THEME_PRESETS_A.length)].label;
    const b = THEME_PRESETS_B[Math.floor(Math.random() * THEME_PRESETS_B.length)].label;
    setThemeA(a);
    setThemeB(b);
    playLaserBeamSound('laser_midi');
  };

  // Toggle Style Chip
  const toggleStyleChip = (snippet: string) => {
    let updated: string[];
    if (selectedStyleChips.includes(snippet)) {
      updated = selectedStyleChips.filter(c => c !== snippet);
    } else {
      updated = [...selectedStyleChips, snippet];
    }
    setSelectedStyleChips(updated);
    setCustomStylePrompt(updated.join(', '));
    playLaserBeamSound('laser_select');
  };

  // Apply Preset Combo
  const applyPresetCombo = (combo: typeof STYLE_PRESET_COMBOS[0]) => {
    setSelectedStyleChips(combo.chips);
    setCustomStylePrompt(combo.chips.join(', '));
    playLaserBeamSound('laser_midi');
  };

  // Filtered Suno Meta Tags
  const filteredTags = SUNO_META_TAGS_CATALOG.filter(t => {
    const matchesCategory = tagCategory === 'all' || t.category === tagCategory;
    const matchesQuery = !tagSearch.trim() || 
      t.label.toLowerCase().includes(tagSearch.toLowerCase()) || 
      t.tag.toLowerCase().includes(tagSearch.toLowerCase()) ||
      t.description.toLowerCase().includes(tagSearch.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  // Filtered Style Items
  const filteredStyles = SUNO_STYLE_CATALOG.filter(s => {
    const matchesCategory = styleCategory === 'all' || s.category === styleCategory;
    const matchesQuery = !styleSearch.trim() ||
      s.label.toLowerCase().includes(styleSearch.toLowerCase()) ||
      s.promptSnippet.toLowerCase().includes(styleSearch.toLowerCase()) ||
      s.description.toLowerCase().includes(styleSearch.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  // Style Prompt character count status
  const charCount = customStylePrompt.length;
  const isOverCharLimit = charCount > 200;
  const isNearLimit = charCount > 160 && !isOverCharLimit;

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto pr-1">
      {/* Top Banner & Workspace Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#141624] border border-[#23263E]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Feather className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-wider text-white uppercase">Lyric Lab // Suno Prompt & Songwriting Station</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60 font-semibold">
                BURROUGHS ENGINE & TAG INSERTER
              </span>
            </div>
            <p className="text-xs text-[#8E92B0]">
              Smash opposing thematic vectors, inject guitar solos & vocal directives, and build character-counted Suno style prompts.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#0E101A] border border-[#22273D]">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'editor'
                ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.35)]'
                : 'text-[#8E92B0] hover:text-white hover:bg-[#1A1E2F]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Lyrics & Solos Editor</span>
          </button>

          <button
            onClick={() => setActiveTab('style_builder')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'style_builder'
                ? 'bg-cyan-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.35)]'
                : 'text-[#8E92B0] hover:text-white hover:bg-[#1A1E2F]'
            }`}
          >
            <Disc className="w-3.5 h-3.5" />
            <span>Suno Style Builder ({charCount}/200)</span>
          </button>

          <button
            onClick={() => setActiveTab('tags_palette')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'tags_palette'
                ? 'bg-amber-600 text-white shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                : 'text-[#8E92B0] hover:text-white hover:bg-[#1A1E2F]'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Tags & Solos</span>
          </button>

          <button
            onClick={() => setActiveTab('influences_db')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'influences_db'
                ? 'bg-rose-600 text-white shadow-[0_0_12px_rgba(225,29,72,0.35)]'
                : 'text-[#8E92B0] hover:text-white hover:bg-[#1A1E2F]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Influences & Visuals DB</span>
          </button>
        </div>
      </div>


      {/* Quick Suno Style Prompt Sticky Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[#121422] border border-[#232740]">
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <span className="text-[11px] font-mono text-cyan-400 uppercase font-bold flex items-center gap-1">
            <Disc className="w-3.5 h-3.5" />
            <span>Suno Style:</span>
          </span>
          <div className="flex-1 text-xs font-mono text-cyan-100 bg-[#0B0D15] px-3 py-1.5 rounded border border-[#20253D] truncate" title={customStylePrompt}>
            {customStylePrompt || 'No styles selected yet. Click style chips to build.'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Char Counter */}
          <span className={`text-xs font-mono font-bold px-2 py-1 rounded border ${
            isOverCharLimit 
              ? 'bg-red-950/80 text-red-400 border-red-500/50' 
              : isNearLimit 
              ? 'bg-amber-950/80 text-amber-300 border-amber-500/50' 
              : 'bg-cyan-950/60 text-cyan-300 border-cyan-800/40'
          }`}>
            {charCount} / 200 chars
          </span>

          <button
            onClick={handleCopyStyle}
            className="px-3 py-1.5 rounded-lg bg-[#191D2F] hover:bg-[#232840] text-cyan-300 border border-cyan-500/30 text-xs font-mono flex items-center gap-1.5 transition-all"
            title="Copy style prompt for Suno style box"
          >
            {copiedStyle ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedStyle ? 'COPIED!' : 'COPY STYLE'}</span>
          </button>

          <button
            onClick={handleInjectStyleIntoLyrics}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-mono flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(6,182,212,0.25)]"
            title="Inject [Style: ...] directly into your lyrics text"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>INJECT IN LYRICS</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: LYRICS & SOLOS EDITOR (MAIN COLLIDER WORKSPACE) */}
      {/* ========================================================= */}
      {activeTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Collision Chamber & Parameters (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Concept Beam A */}
            <div className="p-4 rounded-xl bg-[#141724] border border-[#242840] space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-cyan-400 flex items-center gap-1.5 uppercase">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Concept Beam A (Subject Vector)</span>
                </label>
                <button
                  onClick={randomizeThemes}
                  className="text-[10px] font-mono text-purple-300 hover:text-white flex items-center gap-1"
                >
                  <Wand2 className="w-3 h-3" />
                  <span>Randomize</span>
                </button>
              </div>
              <textarea
                rows={2}
                value={themeA}
                onChange={e => setThemeA(e.target.value)}
                placeholder="e.g. Subatomic particle decay and sacred geometry..."
                className="w-full p-2.5 bg-[#0D0F18] border border-[#252A42] rounded-lg text-xs text-white placeholder-[#535A7C] focus:outline-none focus:border-cyan-500/60 resize-none font-sans"
              />
              <div className="flex flex-wrap gap-1">
                {THEME_PRESETS_A.map(p => (
                  <button
                    key={p.label}
                    onClick={() => setThemeA(p.label)}
                    className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                      themeA === p.label
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-[#181C2C] text-[#787F9E] hover:text-white'
                    }`}
                  >
                    {p.label.split(' ')[0]}...
                  </button>
                ))}
              </div>
            </div>

            {/* Concept Beam B */}
            <div className="p-4 rounded-xl bg-[#141724] border border-[#242840] space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-purple-400 flex items-center gap-1.5 uppercase">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Concept Beam B (Collision Catalyst)</span>
                </label>
                <span className="text-[10px] font-mono text-[#6B7294]">COUNTER-VECTOR</span>
              </div>
              <textarea
                rows={2}
                value={themeB}
                onChange={e => setThemeB(e.target.value)}
                placeholder="e.g. Late night diner heartbreak, cold coffee, neon signs..."
                className="w-full p-2.5 bg-[#0D0F18] border border-[#252A42] rounded-lg text-xs text-white placeholder-[#535A7C] focus:outline-none focus:border-purple-500/60 resize-none font-sans"
              />
              <div className="flex flex-wrap gap-1">
                {THEME_PRESETS_B.map(p => (
                  <button
                    key={p.label}
                    onClick={() => setThemeB(p.label)}
                    className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                      themeB === p.label
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'bg-[#181C2C] text-[#787F9E] hover:text-white'
                    }`}
                  >
                    {p.label.split(' ')[0]}...
                  </button>
                ))}
              </div>
            </div>

            {/* Structure & Burroughs Cut-Up Parameters */}
            <div className="p-4 rounded-xl bg-[#141724] border border-[#242840] space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-[#8E92B0] uppercase flex items-center justify-between">
                  <span>Rhyme Scheme & Cut-up Flow</span>
                  <span className="text-amber-400">{rhymeScheme.split(' ')[0]}</span>
                </label>
                <select
                  value={rhymeScheme}
                  onChange={e => setRhymeScheme(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#0D0F18] border border-[#252A42] rounded-lg text-xs text-white focus:outline-none focus:border-purple-500/60"
                >
                  <option value="AABB Melodic Rhyme">AABB Melodic Rhyme (Punchy hook)</option>
                  <option value="ABAB Alternating Cadence">ABAB Alternating Cadence (Classic indie/folk)</option>
                  <option value="AABB + Odd Fibonacci Syllabics">AABB + Odd Fibonacci Syllabics (Prog Rock)</option>
                  <option value="Burroughs Cut-Up Surrealism">Burroughs Cut-Up Surrealism (Fractured)</option>
                  <option value="Ghazal Refrain Repetition">Ghazal Refrain Repetition (Haunting chant)</option>
                </select>
              </div>

              {/* Cut-up Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[#8E92B0]">BURROUGHS CUT-UP RATIO</span>
                  <span className="text-purple-400 font-bold">{Math.round(cutUpRatio * 100)}% Fractured</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.1"
                  value={cutUpRatio}
                  onChange={e => setCutUpRatio(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#1E2338] rounded-lg appearance-none cursor-pointer accent-purple-400"
                />
              </div>

              {/* Injection Button */}
              <button
                onClick={handleInjectLyricBeam}
                disabled={isInjecting || !themeA.trim() || !themeB.trim()}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2.5 transition-all ${
                  isInjecting
                    ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 text-white animate-pulse shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:scale-[1.01] active:scale-[0.99]'
                }`}
              >
                <Zap className={`w-4 h-4 ${isInjecting ? 'animate-bounce' : ''}`} />
                <span>{isInjecting ? 'COLLIDING POETIC PARTICLES...' : 'INJECT LYRIC BEAM // COLLIDE POETRY'}</span>
              </button>

              <div className="flex items-center justify-between text-[10px] text-[#7E84A3] px-1 font-mono pt-0.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                  <span>POETRY ENGINE:</span>
                  <span className="text-purple-300 font-bold">{ghostBadge}</span>
                </span>
                <span className="text-[#555B7A]">DOJO TRAINED // METATAGS & CADENCE</span>
              </div>
            </div>
          </div>

          {/* Right: Interactive Lyrics Workstation with Live Tag Palette (7 cols) */}
          <div className="lg:col-span-7 flex flex-col p-4 rounded-xl bg-[#141724] border border-[#242840] gap-3">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#22273F] pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  {output?.title || 'Quantum Lyrical Workspace'}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1A1D30] text-purple-300 border border-purple-500/30">
                  SUNO / UDIO READY
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyLyrics}
                  className="px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono font-medium flex items-center gap-1.5 transition-all"
                  title="Copy full lyrics with bracket tags"
                >
                  {copiedLyrics ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLyrics ? 'COPIED!' : 'COPY LYRICS'}</span>
                </button>

                {onSaveCollisionClick && (
                  <button
                    onClick={() => onSaveCollisionClick(themeA, themeB, output)}
                    className="px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-400/50 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(168,85,247,0.25)]"
                    title="Save this lyrical collision snapshot"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>SAVE COLLISION</span>
                  </button>
                )}

                <button
                  onClick={handleArchive}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
                    saved
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>{saved ? 'ARCHIVED!' : 'ARCHIVE'}</span>
                </button>
              </div>
            </div>

            {/* Quick Click-to-Insert Tag Toolbar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#8E92B0] flex items-center gap-1">
                  <Tag className="w-3 h-3 text-amber-400" />
                  <span>CLICK-TO-INSERT TAGS AT CURSOR:</span>
                </span>
                {lastInsertedTag && (
                  <span className="text-emerald-400 font-bold animate-pulse">
                    Inserted {lastInsertedTag}!
                  </span>
                )}
              </div>

              {/* Tag Quick Chips */}
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-2 rounded-lg bg-[#0C0E16] border border-[#21263E]">
                {[
                  { tag: '[Intro]', label: 'Intro', color: 'text-cyan-300 bg-cyan-950/50 border-cyan-700/40' },
                  { tag: '[Verse 1]', label: 'Verse 1', color: 'text-blue-300 bg-blue-950/50 border-blue-700/40' },
                  { tag: '[Chorus]', label: 'Chorus', color: 'text-pink-300 bg-pink-950/50 border-pink-700/40' },
                  { tag: '[Guitar Solo]', label: 'Guitar Solo', color: 'text-amber-300 bg-amber-950/50 border-amber-700/40' },
                  { tag: '[Melodic Guitar Solo]', label: 'Melodic Solo', color: 'text-amber-300 bg-amber-950/50 border-amber-700/40' },
                  { tag: '[Bass Solo]', label: 'Bass Solo', color: 'text-purple-300 bg-purple-950/50 border-purple-700/40' },
                  { tag: '[Drum Solo]', label: 'Drum Solo', color: 'text-emerald-300 bg-emerald-950/50 border-emerald-700/40' },
                  { tag: '[Synth Solo]', label: 'Synth Solo', color: 'text-cyan-300 bg-cyan-950/50 border-cyan-700/40' },
                  { tag: '[Whisper]', label: 'Whisper', color: 'text-cyan-300 bg-cyan-950/50 border-cyan-700/40' },
                  { tag: '[Belting]', label: 'Belting', color: 'text-red-300 bg-red-950/50 border-red-700/40' },
                  { tag: '[Emotional Belting]', label: 'Emotional Belting', color: 'text-rose-300 bg-rose-950/50 border-rose-700/40' },
                  { tag: '[Harmonies]', label: 'Harmonies', color: 'text-purple-300 bg-purple-950/50 border-purple-700/40' },
                  { tag: '[Bridge]', label: 'Bridge', color: 'text-amber-300 bg-amber-950/50 border-amber-700/40' },
                  { tag: '[Drop]', label: 'Drop', color: 'text-red-400 bg-red-950/60 border-red-600/50 font-bold' },
                  { tag: '[Silence]', label: 'Silence', color: 'text-slate-300 bg-slate-800/50 border-slate-600/40' },
                  { tag: '[Outro]', label: 'Outro', color: 'text-slate-400 bg-slate-900/60 border-slate-700/40' }
                ].map(item => (
                  <button
                    key={item.tag}
                    onClick={() => insertTagAtCursor(item.tag)}
                    className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-all hover:scale-105 active:scale-95 ${item.color}`}
                    title={`Click to insert ${item.tag} into lyrics`}
                  >
                    + {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Editable Lyrics Textarea */}
            <div className="flex-1 flex flex-col min-h-[420px] rounded-xl overflow-hidden border border-[#23273F] bg-[#0A0C14]">
              <textarea
                ref={lyricsTextareaRef}
                value={editableLyrics}
                onChange={e => setEditableLyrics(e.target.value)}
                placeholder="Write, paste, or generate your lyrics here... click tags above to insert solos and structure brackets."
                className="w-full flex-1 p-4 bg-transparent text-purple-100 font-mono text-xs leading-relaxed focus:outline-none resize-none select-text"
                spellCheck={false}
              />
              
              {/* Footer text info */}
              <div className="px-4 py-2 bg-[#0E101A] border-t border-[#1C2033] flex items-center justify-between text-[11px] font-mono text-[#6E7495]">
                <div className="flex items-center gap-3">
                  <span>Lines: {editableLyrics.split('\n').length}</span>
                  <span>Characters: {editableLyrics.length}</span>
                  <span>Words: {editableLyrics.trim().split(/\s+/).filter(Boolean).length}</span>
                </div>
                <div className="text-purple-400">
                  Tip: Use [Guitar Solo] or [Drop] on their own line
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: SUNO STYLE PROMPT BUILDER */}
      {/* ========================================================= */}
      {activeTab === 'style_builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Prompt Box & Presets (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="p-4 rounded-xl bg-[#141724] border border-[#242840] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-cyan-400 uppercase font-bold flex items-center gap-1.5">
                  <Disc className="w-3.5 h-3.5" />
                  <span>Suno Style Prompt (120-200 Char Limit)</span>
                </span>
                <span className={`text-xs font-mono font-bold ${isOverCharLimit ? 'text-red-400' : 'text-cyan-300'}`}>
                  {charCount} / 200
                </span>
              </div>

              {/* Editable Prompt String */}
              <textarea
                rows={4}
                value={customStylePrompt}
                onChange={e => {
                  setCustomStylePrompt(e.target.value);
                  setSelectedStyleChips(e.target.value.split(',').map(s => s.trim()).filter(Boolean));
                }}
                className="w-full p-3 bg-[#0C0E16] border border-[#252A42] rounded-lg text-xs font-mono text-white placeholder-[#535A7C] focus:outline-none focus:border-cyan-500/60 resize-none leading-relaxed"
                placeholder="darkwave, analog synthesizers, 120 bpm..."
              />

              {/* Progress bar for 200 chars */}
              <div className="w-full bg-[#181C2B] h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${
                    isOverCharLimit 
                      ? 'bg-red-500' 
                      : isNearLimit 
                      ? 'bg-amber-400' 
                      : 'bg-gradient-to-r from-cyan-400 to-purple-500'
                  }`}
                  style={{ width: `${Math.min(100, (charCount / 200) * 100)}%` }}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleCopyStyle}
                  className="flex-1 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
                >
                  {copiedStyle ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedStyle ? 'COPIED FOR SUNO!' : 'COPY FOR SUNO BOX'}</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedStyleChips([]);
                    setCustomStylePrompt('');
                  }}
                  className="px-3 py-2 rounded-lg bg-[#191D2F] hover:bg-[#252A42] text-[#8E92B0] hover:text-white border border-[#2A2E44] text-xs font-mono transition-colors"
                >
                  CLEAR
                </button>
              </div>
            </div>

            {/* Tested Preset Style Recipes */}
            <div className="p-4 rounded-xl bg-[#141724] border border-[#242840] space-y-2.5">
              <span className="text-xs font-mono text-purple-300 uppercase font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tested Suno Formula Recipes</span>
              </span>

              <div className="space-y-2">
                {STYLE_PRESET_COMBOS.map(preset => (
                  <button
                    key={preset.name}
                    onClick={() => applyPresetCombo(preset)}
                    className="w-full text-left p-2.5 rounded-lg bg-[#0E101A] hover:bg-[#181C2C] border border-[#21263E] transition-all hover:border-purple-500/40"
                  >
                    <div className="text-xs font-bold text-white">{preset.name}</div>
                    <div className="text-[11px] font-mono text-purple-300/80 truncate mt-0.5">
                      {preset.chips.join(', ')}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Interactive Style Chips Library (7 cols) */}
          <div className="lg:col-span-7 flex flex-col p-4 rounded-xl bg-[#141724] border border-[#242840] gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#21263E] pb-3">
              <span className="text-xs font-mono text-white uppercase font-bold">
                Style Tags Catalog (Click to Toggle)
              </span>

              {/* Category selector */}
              <div className="flex flex-wrap gap-1">
                {(['all', 'genre', 'vocal', 'instrument', 'production', 'tempo', 'mood'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setStyleCategory(cat)}
                    className={`text-[10px] font-mono px-2 py-1 rounded uppercase transition-colors ${
                      styleCategory === cat
                        ? 'bg-cyan-600 text-white font-bold'
                        : 'bg-[#181C2B] text-[#7A809E] hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#6E7596] absolute left-3 top-2.5" />
              <input
                type="text"
                value={styleSearch}
                onChange={e => setStyleSearch(e.target.value)}
                placeholder="Search styles, instruments, vocal styles..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#0C0E16] border border-[#242940] rounded-lg text-xs text-white placeholder-[#555C7E] focus:outline-none focus:border-cyan-500/60 font-mono"
              />
            </div>

            {/* Style Chips Grid */}
            <div className="flex-1 max-h-[460px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 p-1">
              {filteredStyles.map(item => {
                const isSelected = selectedStyleChips.includes(item.promptSnippet);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleStyleChip(item.promptSnippet)}
                    className={`text-left p-2.5 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-500/60 text-white shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                        : 'bg-[#0E101A] border-[#22273D] text-[#8E94B4] hover:text-white hover:bg-[#181C2C]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">{item.label}</span>
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#1A1E2F] text-cyan-400">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6E7596] mt-1 line-clamp-1">{item.description}</p>
                    <div className="text-[10px] font-mono text-cyan-300/80 mt-1 truncate">
                      "{item.promptSnippet}"
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: SUNO META-TAGS & SOLOS ENCYCLOPEDIA */}
      {/* ========================================================= */}
      {activeTab === 'tags_palette' && (
        <div className="p-4 rounded-xl bg-[#141724] border border-[#242840] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#21263E] pb-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                Suno & Udio Meta-Tags & Solos Master Encyclopedia
              </h3>
              <p className="text-xs text-[#8E92B0]">
                Click any tag to insert it directly into your active lyrics draft, or copy it for your notes.
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'structure', 'solos', 'vocals', 'dynamics', 'in_lyric_styles'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setTagCategory(cat)}
                  className={`text-[11px] font-mono px-3 py-1.5 rounded-lg uppercase transition-colors ${
                    tagCategory === cat
                      ? 'bg-amber-600 text-white font-bold'
                      : 'bg-[#181C2C] text-[#7A809E] hover:text-white'
                  }`}
                >
                  {cat.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative max-w-md">
            <Search className="w-3.5 h-3.5 text-[#6E7596] absolute left-3 top-2.5" />
            <input
              type="text"
              value={tagSearch}
              onChange={e => setTagSearch(e.target.value)}
              placeholder="Search by tag name or description (e.g. guitar, scream, drop)..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#0C0E16] border border-[#242940] rounded-lg text-xs text-white placeholder-[#555C7E] focus:outline-none focus:border-amber-500/60 font-mono"
            />
          </div>

          {/* Tag Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTags.map(tagItem => (
              <div
                key={tagItem.id}
                className="p-3 rounded-lg bg-[#0E101A] border border-[#21263E] hover:border-amber-500/40 transition-all flex flex-col justify-between gap-2 group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-600/30">
                      {tagItem.tag}
                    </span>
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#181B2B] text-[#8E92B0]">
                      {tagItem.category}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-white mt-1.5">{tagItem.label}</h4>
                  <p className="text-[11px] text-[#787F9E] mt-0.5 leading-relaxed">{tagItem.description}</p>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-[#181C2C]">
                  <button
                    onClick={() => {
                      insertTagAtCursor(tagItem.tag);
                      setActiveTab('editor');
                    }}
                    className="flex-1 py-1 px-2 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-mono flex items-center justify-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Insert in Lyrics</span>
                  </button>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(tagItem.tag);
                      playLaserBeamSound('laser_select');
                    }}
                    className="p-1 px-2 rounded bg-[#181B2B] hover:bg-[#22273D] text-[#8E92B0] hover:text-white border border-[#252A42] text-[11px] font-mono transition-colors"
                    title="Copy tag"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: INFLUENCES & VISUALS ARCHIVE (ORIGINAL BUILD DB) */}
      {/* ========================================================= */}
      {activeTab === 'influences_db' && (
        <div className="flex flex-col gap-4">
          {/* Action Notification Toast */}
          {influenceNotification && (
            <div className="p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-mono flex items-center justify-between shadow-[0_0_15px_rgba(244,63,94,0.3)]">
              <span>{influenceNotification}</span>
              <button 
                onClick={() => setInfluenceNotification(null)}
                className="text-rose-300 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Header Controls & Filter Pills */}
          <div className="p-4 rounded-xl bg-[#141724] border border-[#242840] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-rose-400" />
                  <span>Lyric Lab // Influences, Visuals & Concepts Yard</span>
                </h3>
                <p className="text-xs text-[#8E92B0] mt-0.5">
                  Over 500+ legendary songwriters, strange authors, cinematic auteurs, bizarre esoterica, and hip-hop flows.
                </p>
              </div>

              {/* Group filter pills */}
              <div className="flex flex-wrap gap-1">
                {[
                  { id: 'all', label: 'All Categories' },
                  { id: 'songwriters', label: 'Songwriters' },
                  { id: 'strange_writers', label: 'Strange Writers' },
                  { id: 'visuals', label: 'Visuals & Cinema' },
                  { id: 'bizarre', label: 'Bizarre & Fortean' },
                  { id: 'flows', label: 'Hip-Hop Flows' },
                  { id: 'concepts', label: 'Concepts & Constraints' }
                ].map(grp => (
                  <button
                    key={grp.id}
                    onClick={() => {
                      setInfluenceGroup(grp.id);
                      // Select first matching category
                      const matchingCat = Object.keys(lyricLabDB).find(c => {
                        const low = c.toLowerCase();
                        if (grp.id === 'all') return true;
                        if (grp.id === 'songwriters') return low.includes('songwriting') || low.includes('storyteller') || low.includes('architect') || low.includes('singer-songwriter');
                        if (grp.id === 'strange_writers') return low.includes('lit:');
                        if (grp.id === 'visuals') return low.includes('vis:');
                        if (grp.id === 'bizarre') return low.includes('bizarre') || low.includes('esoterica');
                        if (grp.id === 'flows') return low.includes('flow');
                        if (grp.id === 'concepts') return low.includes('concept') || low.includes('constraint') || low.includes('perspective') || low.includes('subject') || low.includes('imagery') || low.includes('device');
                        return false;
                      });
                      if (matchingCat) setInfluenceCategory(matchingCat);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                      influenceGroup === grp.id
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                        : 'bg-[#181C2C] text-[#7A809E] hover:text-white'
                    }`}
                  >
                    {grp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category selector & search bar */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="flex-1 min-w-[240px]">
                <select
                  value={influenceCategory}
                  onChange={e => setInfluenceCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0C0E16] border border-[#242940] rounded-lg text-xs text-rose-200 font-mono focus:outline-none cursor-pointer"
                >
                  {Object.keys(lyricLabDB)
                    .filter(c => {
                      const low = c.toLowerCase();
                      if (influenceGroup === 'all') return true;
                      if (influenceGroup === 'songwriters') return low.includes('songwriting') || low.includes('storyteller') || low.includes('architect') || low.includes('singer-songwriter');
                      if (influenceGroup === 'strange_writers') return low.includes('lit:');
                      if (influenceGroup === 'visuals') return low.includes('vis:');
                      if (influenceGroup === 'bizarre') return low.includes('bizarre') || low.includes('esoterica');
                      if (influenceGroup === 'flows') return low.includes('flow');
                      if (influenceGroup === 'concepts') return low.includes('concept') || low.includes('constraint') || low.includes('perspective') || low.includes('subject') || low.includes('imagery') || low.includes('device');
                      return false;
                    })
                    .map(cat => (
                      <option key={cat} value={cat} className="bg-[#121422] text-white">
                        {cat} ({lyricLabDB[cat]?.length || 0} entries)
                      </option>
                    ))}
                </select>
              </div>

              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-3.5 h-3.5 text-[#6E7596] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={influenceSearch}
                  onChange={e => setInfluenceSearch(e.target.value)}
                  placeholder="Search across all authors, movies, flows..."
                  className="w-full pl-8 pr-3 py-2 bg-[#0C0E16] border border-[#242940] rounded-lg text-xs text-white placeholder-[#555C7E] focus:outline-none focus:border-rose-500/60 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(() => {
              const itemsToRender = influenceSearch.trim()
                ? Object.entries(lyricLabDB).flatMap(([cat, list]) => 
                    list
                      .filter(item => item.toLowerCase().includes(influenceSearch.toLowerCase()))
                      .map(item => ({ category: cat, name: item }))
                  )
                : (lyricLabDB[influenceCategory] || []).map(item => ({ category: influenceCategory, name: item }));

              if (itemsToRender.length === 0) {
                return (
                  <div className="col-span-full text-center py-12 text-xs text-[#6B7294] font-mono">
                    No influences found matching "{influenceSearch}".
                  </div>
                );
              }

              return itemsToRender.map(({ category, name }, idx) => {
                const desc = tagDescriptions[name] || tagDescriptions[category];
                return (
                  <div
                    key={`${category}-${name}-${idx}`}
                    className="p-3.5 rounded-xl bg-[#0E101A] border border-[#21263E] hover:border-rose-500/40 transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/40 truncate">
                          {category}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(name);
                            playLaserBeamSound('laser_select');
                            setInfluenceNotification(`Copied "${name}" to clipboard`);
                            setTimeout(() => setInfluenceNotification(null), 2200);
                          }}
                          title="Copy"
                          className="p-1 rounded bg-[#181B2B] hover:bg-[#22273D] text-[#8E92B0] hover:text-white border border-[#252A42] text-xs transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>

                      <h4 className="text-sm font-bold text-white mt-2 leading-snug">{name}</h4>

                      {desc && (
                        <p className="text-[11px] text-[#848BA8] mt-1.5 leading-relaxed bg-[#090B12] p-2 rounded-lg border border-[#1A1E2F]">
                          {desc}
                        </p>
                      )}
                    </div>

                    {/* Quick injection buttons */}
                    <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-[#181C2C]">
                      <button
                        onClick={() => {
                          setThemeA(name);
                          playLaserBeamSound('laser_midi');
                          setInfluenceNotification(`Set Vector A to "${name}"`);
                          setTimeout(() => setInfluenceNotification(null), 2200);
                        }}
                        className="py-1 px-2 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono text-center transition-colors"
                        title="Inject into Theme Vector A"
                      >
                        Set Vector A
                      </button>

                      <button
                        onClick={() => {
                          setThemeB(name);
                          playLaserBeamSound('laser_midi');
                          setInfluenceNotification(`Set Vector B to "${name}"`);
                          setTimeout(() => setInfluenceNotification(null), 2200);
                        }}
                        className="py-1 px-2 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono text-center transition-colors"
                        title="Inject into Theme Vector B"
                      >
                        Set Vector B
                      </button>

                      <button
                        onClick={() => {
                          insertTagAtCursor(`[Directive: In the lyrical style of ${name}]`);
                          setInfluenceNotification(`Inserted directive for "${name}" into lyrics!`);
                          setTimeout(() => setInfluenceNotification(null), 2200);
                        }}
                        className="py-1 px-2 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-mono text-center transition-colors"
                        title="Insert into lyrics text"
                      >
                        + Lyric Directive
                      </button>

                      <button
                        onClick={() => {
                          const cleanSnippet = name.toLowerCase();
                          if (!selectedStyleChips.includes(cleanSnippet)) {
                            const updated = [...selectedStyleChips, cleanSnippet];
                            setSelectedStyleChips(updated);
                            setCustomStylePrompt(updated.join(', '));
                            playLaserBeamSound('laser_select');
                            setInfluenceNotification(`Added "${name}" to Suno Style Prompt!`);
                            setTimeout(() => setInfluenceNotification(null), 2200);
                          }
                        }}
                        className="py-1 px-2 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono text-center transition-colors"
                        title="Add to Suno Style Prompt"
                      >
                        + Style Chip
                      </button>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>

  );
};

export default LyricLab;
