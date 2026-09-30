import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Feather, 
  Binary, 
  Archive, 
  Compass, 
  Sparkles, 
  Orbit, 
  Atom,
  HelpCircle,
  ExternalLink,
  SlidersHorizontal,
  Wand2,
  Check,
  Layers,
  X,
  ChevronRight,
  Disc,
  Play,
  Activity,
  Save,
  Sliders
} from 'lucide-react';

import { SonicSector } from './SonicSector';
import { LyricLab } from './LyricLab';
import { SongDeconstructor } from './SongDeconstructor';
import { StrangeArchive } from './StrangeArchive';
import { SunoMasteringStudio } from '../SunoMasteringStudio';
import { ArchiveItem, ColliderChip, SavedCollision, PromptOutputResult, LyricLabOutput } from '../../types';
import { INITIAL_ARCHIVE_ITEMS } from '../../lib/sonicColliderData';
import { playLaserBeamSound, playColliderInjectionSound } from '../../lib/laserSound';
import { SonicColliderD3Visualizer } from './SonicColliderD3Visualizer';
import { SaveCollisionModal } from './SaveCollisionModal';
import { SavedCollisionsModal } from './SavedCollisionsModal';
import { 
  calculatePhysicsConstants, 
  DEFAULT_SAVED_COLLISIONS 
} from '../../lib/collisionPhysics';
import { 
  SonicMode, 
  SonicPreset, 
  getPresetCategories, 
  getPresetsForCategory, 
  getRandomPreset,
  CURATED_SONIC_PRESETS,
  CURATED_LYRIC_PRESETS
} from '../../services/sonicData';

export type ColliderTab = 'sonic' | 'lyrics' | 'deconstruct' | 'archive' | 'mastering';

const STORAGE_KEY = 'strangelet_lab_archive';
const SAVED_COLLISIONS_STORAGE_KEY = 'strangelet_lab_saved_collisions';

export interface LargeSonicColliderProps {
  onOpenAiMixStep?: () => void;
  onOpenKoboldSettings?: () => void;
}

export const LargeSonicCollider: React.FC<LargeSonicColliderProps> = ({
  onOpenAiMixStep,
  onOpenKoboldSettings
}) => {
  const [activeTab, setActiveTab] = useState<ColliderTab>('sonic');
  
  // Preset Matrix State (services/sonicData.ts)
  const [presetMode, setPresetMode] = useState<SonicMode>('sonic');
  const [selectedCategory, setSelectedCategory] = useState<string>('Suno Genre Templates');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('sonic-cyber-darkwave');
  const [activeLoadedPreset, setActiveLoadedPreset] = useState<SonicPreset | null>(CURATED_SONIC_PRESETS[0]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showVisualizer, setShowVisualizer] = useState<boolean>(true);

  // Physics-based Collision Energy State (0.5 to 14.0 TeV)
  const [collisionEnergy, setCollisionEnergy] = useState<number>(8.4);

  // Saved Collisions State & Modals
  const [showSaveCollisionModal, setShowSaveCollisionModal] = useState<boolean>(false);
  const [showSavedCollisionsModal, setShowSavedCollisionsModal] = useState<boolean>(false);
  const [saveModalData, setSaveModalData] = useState<{
    chips?: ColliderChip[];
    themeA?: string;
    themeB?: string;
    promptResult?: PromptOutputResult | null;
    lyricResult?: LyricLabOutput | null;
  }>({});

  // Restored states to propagate into sectors
  const [restoredChamberChips, setRestoredChamberChips] = useState<ColliderChip[] | null>(null);
  const [restoredThemeA, setRestoredThemeA] = useState<string | null>(null);
  const [restoredThemeB, setRestoredThemeB] = useState<string | null>(null);

  // Saved Collisions collection
  const [savedCollisions, setSavedCollisions] = useState<SavedCollision[]>(() => {
    try {
      const saved = localStorage.getItem(SAVED_COLLISIONS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Failed to load saved collisions from localStorage:', err);
    }
    return DEFAULT_SAVED_COLLISIONS;
  });

  // Persist saved collisions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SAVED_COLLISIONS_STORAGE_KEY, JSON.stringify(savedCollisions));
    } catch (err) {
      console.warn('Failed to persist saved collisions to localStorage:', err);
    }
  }, [savedCollisions]);

  const [archiveItems, setArchiveItems] = useState<ArchiveItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Failed to load archive from localStorage:', err);
    }
    return INITIAL_ARCHIVE_ITEMS;
  });

  // Save archive items to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(archiveItems));
    } catch (err) {
      console.warn('Failed to persist archive to localStorage:', err);
    }
  }, [archiveItems]);

  // Compute live physics constants
  const physics = calculatePhysicsConstants(collisionEnergy);

  // Handle Preset Mode switching (Sonic Sector vs Lyric Lab)
  const handleToggleMode = (mode: SonicMode) => {
    setPresetMode(mode);
    const categories = getPresetCategories(mode);
    const defaultCat = categories[0] || '';
    setSelectedCategory(defaultCat);
    
    const presets = getPresetsForCategory(mode, defaultCat);
    if (presets.length > 0) {
      setSelectedPresetId(presets[0].id);
    }

    // Automatically navigate to that sector
    switchTab(mode);
    playLaserBeamSound('laser_select');
  };

  // Handle Category selection change
  const handleCategoryChange = (newCat: string) => {
    setSelectedCategory(newCat);
    const presets = getPresetsForCategory(presetMode, newCat);
    if (presets.length > 0) {
      setSelectedPresetId(presets[0].id);
    }
    playLaserBeamSound('laser_select');
  };

  // Apply chosen preset to active sector
  const handleApplyPreset = () => {
    const presets = getPresetsForCategory(presetMode, selectedCategory);
    const preset = presets.find(p => p.id === selectedPresetId) || presets[0];
    if (!preset) return;

    setActiveLoadedPreset(preset);
    switchTab(preset.mode);
    playColliderInjectionSound();

    const destName = preset.mode === 'sonic' ? 'Sonic Sector Particle Chamber' : 'Lyric Lab Concept Vectors';
    setToastMessage(`⚡ Loaded "${preset.name}" into ${destName}!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Pick random preset
  const handleRandomPreset = () => {
    const randomPreset = getRandomPreset(presetMode, selectedCategory);
    setSelectedCategory(randomPreset.category);
    setSelectedPresetId(randomPreset.id);
    setActiveLoadedPreset(randomPreset);
    switchTab(randomPreset.mode);
    playLaserBeamSound('laser_midi');

    const destName = randomPreset.mode === 'sonic' ? 'Sonic Sector Particle Chamber' : 'Lyric Lab Concept Vectors';
    setToastMessage(`✨ Randomized: "${randomPreset.name}" loaded into ${destName}!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveToArchive = (newItem: ArchiveItem) => {
    setArchiveItems(prev => [newItem, ...prev.filter(i => i.id !== newItem.id)]);
  };

  const handleDeleteArchiveItem = (id: string) => {
    setArchiveItems(prev => prev.filter(i => i.id !== id));
    playLaserBeamSound('laser_erase');
  };

  const handleToggleStar = (id: string) => {
    setArchiveItems(prev => prev.map(item => item.id === id ? { ...item, starred: !item.starred } : item));
    playLaserBeamSound('laser_select');
  };

  const handleImportItems = (newItems: ArchiveItem[]) => {
    setArchiveItems(prev => [...newItems, ...prev]);
  };

  const handleRestoreToChamber = (chips: ColliderChip[]) => {
    setRestoredChamberChips([...chips]);
    setActiveTab('sonic');
    setPresetMode('sonic');
  };

  const switchTab = (tab: ColliderTab) => {
    setActiveTab(tab);
    playLaserBeamSound('laser_select');
  };

  // Save Collision Snapshot
  const handleSaveCollision = (newCollision: SavedCollision) => {
    setSavedCollisions(prev => [newCollision, ...prev.filter(c => c.id !== newCollision.id)]);

    // Mirror to Strange Archive as well
    const archiveEquivalent: ArchiveItem = {
      id: newCollision.id,
      title: newCollision.name,
      type: newCollision.mode === 'sonic' ? 'sonic_sector' : 'lyric_lab',
      timestamp: newCollision.timestamp,
      summary: newCollision.notes || `Hadron Collision at ${newCollision.collisionEnergy.toFixed(1)} TeV (${newCollision.category})`,
      tags: newCollision.tags || [newCollision.category, `${newCollision.collisionEnergy.toFixed(1)}tev`],
      chips: newCollision.chips,
      promptResult: newCollision.promptResult,
      lyricResult: newCollision.lyricResult,
      starred: newCollision.starred,
      collisionEnergy: newCollision.collisionEnergy,
      massConstant: newCollision.massConstant,
      velocityConstant: newCollision.velocityConstant,
      gravityConstant: newCollision.gravityConstant
    };
    handleSaveToArchive(archiveEquivalent);

    setToastMessage(`⚡ Collision "${newCollision.name}" saved to Collider Vault at ${newCollision.collisionEnergy.toFixed(1)} TeV!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Restore Collision Snapshot
  const handleRestoreCollision = (collision: SavedCollision) => {
    // Restore Energy & physics
    setCollisionEnergy(collision.collisionEnergy);

    // Restore Mode
    setPresetMode(collision.mode);
    switchTab(collision.mode);

    // Restore Category & Preset if available
    setSelectedCategory(collision.category);
    if (collision.presetId) {
      setSelectedPresetId(collision.presetId);
    }

    // Restore Particles or Themes
    if (collision.mode === 'sonic' && collision.chips && collision.chips.length > 0) {
      setRestoredChamberChips([...collision.chips]);
    } else if (collision.mode === 'lyrics') {
      if (collision.themeA) setRestoredThemeA(collision.themeA);
      if (collision.themeB) setRestoredThemeB(collision.themeB);
    }

    playColliderInjectionSound();
    setToastMessage(`⚡ Restored Collision "${collision.name}" [${collision.collisionEnergy.toFixed(1)} TeV] into Chamber!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleDeleteSavedCollision = (id: string) => {
    setSavedCollisions(prev => prev.filter(c => c.id !== id));
    playLaserBeamSound('laser_erase');
  };

  const handleToggleStarCollision = (id: string) => {
    setSavedCollisions(prev => prev.map(c => c.id === id ? { ...c, starred: !c.starred } : c));
    playLaserBeamSound('laser_select');
  };

  // Open Save Modal with current context or explicit parameters
  const handleOpenSaveCollisionModal = (
    chips?: ColliderChip[], 
    promptRes?: PromptOutputResult | null, 
    themeA?: string, 
    themeB?: string, 
    lyricRes?: LyricLabOutput | null
  ) => {
    setSaveModalData({
      chips: chips || (restoredChamberChips || undefined),
      promptResult: promptRes,
      themeA,
      themeB,
      lyricResult: lyricRes
    });
    setShowSaveCollisionModal(true);
    playLaserBeamSound('laser_select');
  };

  // Categories and Presets computed for currently selected preset mode
  const categoriesForMode = getPresetCategories(presetMode);
  const presetsForCategory = getPresetsForCategory(presetMode, selectedCategory);

  return (
    <div className="flex flex-col h-full bg-[#0E1017] text-white overflow-hidden select-none">
      {/* LSC Sub-Navigation Bar: Core Sectors */}
      <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-[#202438] bg-[#121420]">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 via-purple-500/20 to-amber-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <Orbit className="w-5 h-5 animate-[spin_12s_linear_infinite]" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#121420]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-wider text-white uppercase">
                LARGE SONIC COLLIDER <span className="text-cyan-400 font-mono text-xs">// [LSC-27KM]</span>
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                PROMPT PHYSICS & SACRED GEOMETRY
              </span>
            </div>
            <p className="text-xs text-[#8E92B0]">
              Modular quantum sound accelerator, cut-up lyric laboratory, song reverse engineer, and Strangelet archive vault.
            </p>
          </div>
        </div>

        {/* The Sector Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#090B12] border border-[#23273D]">
          <button
            onClick={() => switchTab('sonic')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'sonic'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'text-[#7B82A6] hover:text-white hover:bg-[#161928]'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-cyan-300" />
            <span>1. Sonic Sector</span>
          </button>

          <button
            onClick={() => switchTab('lyrics')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'lyrics'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                : 'text-[#7B82A6] hover:text-white hover:bg-[#161928]'
            }`}
          >
            <Feather className="w-3.5 h-3.5 text-purple-300" />
            <span>2. Lyric Lab</span>
          </button>

          <button
            onClick={() => switchTab('deconstruct')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'deconstruct'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'text-[#7B82A6] hover:text-white hover:bg-[#161928]'
            }`}
          >
            <Binary className="w-3.5 h-3.5 text-amber-300" />
            <span>3. Song Deconstructor</span>
          </button>

          <button
            onClick={() => switchTab('archive')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'archive'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'text-[#7B82A6] hover:text-white hover:bg-[#161928]'
            }`}
          >
            <Archive className="w-3.5 h-3.5 text-emerald-300" />
            <span>4. Strange Archive</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/40 text-emerald-300 border border-emerald-500/30">
              {archiveItems.length}
            </span>
          </button>

          <button
            onClick={() => switchTab('mastering')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'mastering'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                : 'text-[#7B82A6] hover:text-white hover:bg-[#161928]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-300" />
            <span>5. Anti-Sheen Mastering</span>
          </button>
        </div>
      </div>

      {/* Preset Selector Matrix & Collision Energy Control Bar */}
      <div className="flex-shrink-0 bg-[#0A0C14] border-b border-[#1C2033] px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-inner">
        {/* Mode Toggle & Category/Preset */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-mono text-[#8288A8]">
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold tracking-wider uppercase text-white hidden sm:inline">MATRIX</span>
          </div>

          <div className="flex items-center p-0.5 rounded-lg bg-[#141724] border border-[#242940]">
            <button
              onClick={() => handleToggleMode('sonic')}
              className={`px-3 py-1 rounded-md text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
                presetMode === 'sonic'
                  ? 'bg-cyan-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)] font-bold'
                  : 'text-[#7A809E] hover:text-white'
              }`}
              title="Switch to Sonic Sector presets"
            >
              <Zap className="w-3 h-3 text-cyan-300" />
              <span>Sonic</span>
            </button>

            <button
              onClick={() => handleToggleMode('lyrics')}
              className={`px-3 py-1 rounded-md text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
                presetMode === 'lyrics'
                  ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)] font-bold'
                  : 'text-[#7A809E] hover:text-white'
              }`}
              title="Switch to Lyric Lab presets"
            >
              <Feather className="w-3 h-3 text-purple-300" />
              <span>Lyrics</span>
            </button>
          </div>

          {/* Category Dropdown */}
          <div className="min-w-[150px]">
            <select
              value={selectedCategory}
              onChange={e => handleCategoryChange(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#121522] border border-[#262B44] rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500/60 cursor-pointer truncate"
              title="Preset Category from sonicData.ts"
            >
              {categoriesForMode.map(cat => (
                <option key={cat} value={cat} className="bg-[#121420] text-white">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Preset / Module Dropdown */}
          <div className="min-w-[170px]">
            <select
              value={selectedPresetId}
              onChange={e => setSelectedPresetId(e.target.value)}
              className={`w-full px-2.5 py-1.5 bg-[#121522] border border-[#262B44] rounded-lg text-xs font-mono focus:outline-none cursor-pointer truncate ${
                presetMode === 'sonic' ? 'text-cyan-200 focus:border-cyan-500/60' : 'text-purple-200 focus:border-purple-500/60'
              }`}
              title="Select specific preset or configuration"
            >
              {presetsForCategory.map(preset => (
                <option key={preset.id} value={preset.id} className="bg-[#121420] text-white">
                  {preset.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Physics-Based Collision Energy Slider with Constant Indicators */}
        <div className="flex items-center gap-3 p-1.5 rounded-xl bg-[#0E121E] border border-[#222942] flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>Collision Energy:</span>
            </span>

            <input
              type="range"
              min="0.5"
              max="14.0"
              step="0.1"
              value={collisionEnergy}
              onChange={e => setCollisionEnergy(parseFloat(e.target.value))}
              className={`w-24 md:w-32 h-1.5 rounded cursor-pointer ${
                presetMode === 'sonic' ? 'accent-cyan-400 bg-[#162740]' : 'accent-purple-400 bg-[#301640]'
              }`}
              title={`Hadron Collision Energy: ${collisionEnergy.toFixed(1)} TeV`}
            />

            <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${
              presetMode === 'sonic' 
                ? 'bg-cyan-950 text-cyan-300 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.25)]' 
                : 'bg-purple-950 text-purple-300 border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.25)]'
            }`}>
              ⚡ {collisionEnergy.toFixed(1)} TeV
            </span>
          </div>

          {/* Quick Energy Step Pills */}
          <div className="hidden xl:flex items-center gap-1 text-[10px] font-mono">
            {[3.5, 7.0, 10.5, 14.0].map(val => (
              <button
                key={val}
                onClick={() => setCollisionEnergy(val)}
                className={`px-1.5 py-0.5 rounded border transition-colors ${
                  Math.abs(collisionEnergy - val) < 0.2
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                    : 'bg-[#151928] text-[#71789A] border-[#22273F] hover:text-white'
                }`}
                title={`Set collision beam energy to ${val} TeV`}
              >
                {val === 14.0 ? '14T MAX' : `${val}T`}
              </button>
            ))}
          </div>

          {/* Micro Physics Constants Badges */}
          <div className="hidden lg:flex items-center gap-1.5 text-[10px] font-mono text-[#7D84A6] pl-2 border-l border-[#1F253C]">
            <span>M: <strong className="text-amber-400">×{physics.massConstant}m₀</strong></span>
            <span>V: <strong className="text-cyan-400">×{physics.velocityConstant}c</strong></span>
            <span>G: <strong className="text-purple-400">×{physics.gravityConstant}G₀</strong></span>
          </div>
        </div>

        {/* Right: Collision Saving, Saved Library, and Reactor Visualizer Toggles */}
        <div className="flex items-center gap-2">
          {/* Save Collision Button */}
          <button
            onClick={() => handleOpenSaveCollisionModal()}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 text-white ${
              presetMode === 'sonic'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
            }`}
            title="Save current collision parameters, energy, and chamber particles into your collider library"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Collision</span>
          </button>

          {/* Saved Collisions Library */}
          <button
            onClick={() => setShowSavedCollisionsModal(true)}
            className="px-3 py-1.5 rounded-lg bg-[#141829] hover:bg-[#1E2338] text-amber-300 hover:text-white border border-[#282F4E] text-xs font-mono flex items-center gap-1.5 transition-colors shadow-sm"
            title="View, search, and restore saved collisions"
          >
            <Archive className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Saved</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/50 text-[10px] text-amber-300 border border-amber-500/30">
              {savedCollisions.length}
            </span>
          </button>

          {/* Incorporate AI Mix Step Trigger */}
          {onOpenAiMixStep && (
            <button
              onClick={onOpenAiMixStep}
              className="px-3 py-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Incorporate an AI Step into the Mix via KoboldCpp / Quinn 3.7"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xl:inline">AI Mix Step</span>
            </button>
          )}

          <button
            onClick={handleRandomPreset}
            className="px-2.5 py-1.5 rounded-lg bg-[#141826] hover:bg-[#1E2338] text-purple-300 hover:text-white border border-[#262B44] text-xs font-mono flex items-center gap-1.5 transition-colors"
            title="Pick a random preset from this category"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Random</span>
          </button>

          <button
            onClick={() => setShowVisualizer(prev => !prev)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-all ${
              showVisualizer
                ? presetMode === 'sonic'
                  ? 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.25)]'
                  : 'bg-purple-950/70 border-purple-500/50 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.25)]'
                : 'bg-[#141826] hover:bg-[#1E2338] text-[#8E92B0] hover:text-white border-[#262B44]'
            }`}
            title="Toggle Dynamic D3.js Reactor Visualization Panel"
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reactor Visualizer</span>
          </button>

          <button
            onClick={handleApplyPreset}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
              presetMode === 'sonic'
                ? 'bg-[#152338] hover:bg-[#1D3250] text-cyan-300 border border-cyan-500/50'
                : 'bg-[#281538] hover:bg-[#391D50] text-purple-300 border border-purple-500/50'
            }`}
            title="Load this preset into the active collider sector"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Load Preset</span>
          </button>
        </div>
      </div>

      {/* Dynamic D3.js Visualization Panel: Particle Physics (Sonic) vs Geometric Flow (Lyrics) */}
      {showVisualizer && (
        <SonicColliderD3Visualizer
          mode={presetMode}
          category={selectedCategory}
          preset={activeLoadedPreset}
          collisionEnergy={collisionEnergy}
          onChangeCollisionEnergy={setCollisionEnergy}
          onOpenSaveCollision={() => handleOpenSaveCollisionModal()}
          savedCollisionsCount={savedCollisions.length}
          onOpenSavedCollisions={() => setShowSavedCollisionsModal(true)}
        />
      )}

      {/* Toast Notification Ribbon */}
      {toastMessage && (
        <div className="bg-gradient-to-r from-cyan-950/80 via-purple-950/80 to-slate-900 px-6 py-1.5 border-b border-cyan-500/30 text-xs font-mono text-cyan-200 flex items-center justify-between animate-fade-in shadow-md">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-cyan-400 hover:text-white">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Active Tab Viewport */}
      <div className="flex-1 p-4 lg:p-6 overflow-hidden min-h-0">
        {activeTab === 'sonic' && (
          <SonicSector
            onSaveToArchive={handleSaveToArchive}
            onOpenArchive={() => switchTab('archive')}
            activePreset={activeLoadedPreset?.mode === 'sonic' ? activeLoadedPreset : null}
            onClearActivePreset={() => setActiveLoadedPreset(null)}
            collisionEnergy={collisionEnergy}
            externalChips={restoredChamberChips}
            onSaveCollisionClick={(chips, res) => handleOpenSaveCollisionModal(chips, res)}
            onOpenSavedCollisions={() => setShowSavedCollisionsModal(true)}
          />
        )}

        {activeTab === 'lyrics' && (
          <LyricLab
            onSaveToArchive={handleSaveToArchive}
            onOpenArchive={() => switchTab('archive')}
            activePreset={activeLoadedPreset?.mode === 'lyrics' ? activeLoadedPreset : null}
            onClearActivePreset={() => setActiveLoadedPreset(null)}
            collisionEnergy={collisionEnergy}
            externalThemeA={restoredThemeA || undefined}
            externalThemeB={restoredThemeB || undefined}
            onSaveCollisionClick={(tA, tB, res) => handleOpenSaveCollisionModal(undefined, undefined, tA, tB, res)}
            onOpenSavedCollisions={() => setShowSavedCollisionsModal(true)}
          />
        )}

        {activeTab === 'deconstruct' && (
          <SongDeconstructor
            onSaveToArchive={handleSaveToArchive}
            onOpenArchive={() => switchTab('archive')}
            onLoadIntoChamber={() => switchTab('sonic')}
          />
        )}

        {activeTab === 'archive' && (
          <StrangeArchive
            items={archiveItems}
            onDeleteItem={handleDeleteArchiveItem}
            onToggleStar={handleToggleStar}
            onRestoreToChamber={handleRestoreToChamber}
            onSelectTab={switchTab}
            onImportItems={handleImportItems}
          />
        )}

        {activeTab === 'mastering' && (
          <SunoMasteringStudio />
        )}
      </div>

      {/* Save Collision Modal */}
      <SaveCollisionModal
        isOpen={showSaveCollisionModal}
        onClose={() => setShowSaveCollisionModal(false)}
        onSave={handleSaveCollision}
        mode={presetMode}
        collisionEnergy={collisionEnergy}
        category={selectedCategory}
        presetId={selectedPresetId}
        presetName={activeLoadedPreset?.name}
        chips={saveModalData.chips}
        themeA={saveModalData.themeA}
        themeB={saveModalData.themeB}
        promptResult={saveModalData.promptResult}
        lyricResult={saveModalData.lyricResult}
      />

      {/* Saved Collisions Library Modal */}
      <SavedCollisionsModal
        isOpen={showSavedCollisionsModal}
        onClose={() => setShowSavedCollisionsModal(false)}
        savedCollisions={savedCollisions}
        onRestoreCollision={handleRestoreCollision}
        onDeleteCollision={handleDeleteSavedCollision}
        onToggleStarCollision={handleToggleStarCollision}
      />
    </div>
  );
};

export default LargeSonicCollider;
