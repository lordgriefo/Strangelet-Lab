import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  RotateCcw, 
  Copy, 
  Check, 
  Sparkles, 
  Layers, 
  Sliders, 
  Archive, 
  Plus, 
  X, 
  Radio, 
  Zap, 
  ChevronLeft, 
  ChevronRight,
  Disc,
  Clock,
  Compass,
  Music2,
  Wand2,
  SlidersHorizontal,
  Database,
  Search,
  Info,
  Save,
  ArrowRight
} from 'lucide-react';
import { ColliderChip, PromptOutputResult, ArchiveItem } from '../../types';
import { SONIC_COLLIDER_CHIPS } from '../../lib/sonicColliderData';
import { 
  sonicSectorDB, 
  tagDescriptions, 
  getCategoryGroup, 
  getCategoryColor, 
  sanitizeId 
} from '../../lib/sonicSectorStaticData';
import { ColliderChamberCanvas } from './ColliderChamberCanvas';
import { playColliderInjectionSound, playLaserBeamSound } from '../../lib/laserSound';
import { collideSonicParticlesGemini } from '../../services/geminiService';
import { SonicPreset, CURATED_SONIC_PRESETS, convertPresetToChamberChips } from '../../services/sonicData';
import type { MatrixBeamRequest } from './LargeSonicCollider';
import { getStoredKoboldSettings } from '../../services/koboldCppService';
import { getGhostShortModelBadge } from '../../services/hardwareResourceManager';

interface SonicSectorProps {
  onSaveToArchive: (item: ArchiveItem) => void;
  onOpenArchive: () => void;
  beamRequest?: MatrixBeamRequest | null;
  onClearActivePreset?: () => void;
  collisionEnergy?: number;
  onSaveCollisionClick?: (chips: ColliderChip[], result: PromptOutputResult | null) => void;
  onOpenSavedCollisions?: () => void;
  externalChips?: ColliderChip[] | null;
  onSendPromptToAceStep?: (promptText: string, bpm?: number) => void;
  onSendPromptToYue2?: (promptText: string, bpm?: number) => void;
  onOpenKoboldSettings?: () => void;
}

export const SonicSector: React.FC<SonicSectorProps> = ({ 
  onSaveToArchive, 
  onOpenArchive,
  beamRequest,
  onClearActivePreset,
  collisionEnergy = 8.4,
  onSaveCollisionClick,
  onOpenSavedCollisions,
  externalChips,
  onSendPromptToAceStep,
  onSendPromptToYue2,
  onOpenKoboldSettings
}) => {
  // Triple Mutually-Exclusive Sidebars: 'beam_a' | 'beam_b' | 'db_yard' | null (only one open at a time!)
  const [activeSidebar, setActiveSidebar] = useState<'beam_a' | 'beam_b' | 'db_yard' | null>('beam_a');
  const [ghostBadge, setGhostBadge] = useState<string>(() => getGhostShortModelBadge(getStoredKoboldSettings().modelName));

  useEffect(() => {
    const syncGhost = () => setGhostBadge(getGhostShortModelBadge(getStoredKoboldSettings().modelName));
    window.addEventListener('strangelet-ai-settings-changed', syncGhost);
    window.addEventListener('strangelet-resource-updated', syncGhost);
    return () => {
      window.removeEventListener('strangelet-ai-settings-changed', syncGhost);
      window.removeEventListener('strangelet-resource-updated', syncGhost);
    };
  }, []);


  // Database Yard Category Selection
  const [selectedDbCategory, setSelectedDbCategory] = useState<string>('Suno Instrument Stacks');
  const [dbSearchQuery, setDbSearchQuery] = useState<string>('');
  const [copiedItem, setCopiedItem] = useState<string | null>(null);


  // Loaded particle chips inside the Collision Chamber
  const [chamberChips, setChamberChips] = useState<ColliderChip[]>([
    SONIC_COLLIDER_CHIPS.find(c => c.id === 'genre-samba')!,
    SONIC_COLLIDER_CHIPS.find(c => c.id === 'genre-indie-rock')!,
    SONIC_COLLIDER_CHIPS.find(c => c.id === 'era-90s-lofi')!,
    SONIC_COLLIDER_CHIPS.find(c => c.id === 'inst-theremin')!,
    SONIC_COLLIDER_CHIPS.find(c => c.id === 'prod-tape-flutter-wow')!
  ].filter(Boolean));

  const resultRef = useRef<HTMLDivElement | null>(null);

  // Sync external chips restored from saved collisions
  useEffect(() => {
    if (externalChips && externalChips.length > 0) {
      setChamberChips(externalChips);
      playColliderInjectionSound();
    }
  }, [externalChips]);

  // Handle explicit Matrix Beam requests from top bar (+ Beam into Collider / Replace)
  useEffect(() => {
    if (!beamRequest || beamRequest.preset.mode !== 'sonic') return;
    const { preset, action } = beamRequest;

    if (preset.category && sonicSectorDB[preset.category]) {
      setSelectedDbCategory(preset.category);
    }

    const isCuratedPreset = CURATED_SONIC_PRESETS.some(c => c.id === preset.id);
    let incomingChips: ColliderChip[];

    if (isCuratedPreset) {
      incomingChips = convertPresetToChamberChips(preset);
    } else {
      const cleanLabel = preset.name
        .replace(/^\[(Stack|Template|Pack|FX|Vocal|SFX|Event|Texture|Effect|Warning|System):?\s*/i, '')
        .replace(/\]$/, '');
      const isBeamA = getCategoryGroup(preset.category) === 'beam_a';
      incomingChips = [
        {
          id: `matrix-${sanitizeId(preset.category)}-${sanitizeId(preset.name)}`,
          label: cleanLabel,
          category: isBeamA ? 'genre' : 'production',
          sidebarGroup: isBeamA ? 'beam_a' : 'beam_b',
          color: getCategoryColor(preset.category),
          description: preset.description,
          energyWeight: 0.85,
          tags: [preset.category.toLowerCase().replace(/[^a-z0-9]+/g, '-'), 'matrix-beam']
        }
      ];
    }

    if (action === 'replace') {
      setChamberChips(incomingChips);
    } else {
      setChamberChips(prev => {
        const next = [...prev];
        incomingChips.forEach(chip => {
          const normLabel = chip.label.toLowerCase().trim();
          const alreadyExists = next.some(
            existing => existing.id === chip.id || existing.label.toLowerCase().trim() === normLabel
          );
          if (!alreadyExists) {
            next.push(chip);
          }
        });
        return next;
      });
    }
  }, [beamRequest]);

  // Particle beam states for light show
  const [isAccelerating, setIsAccelerating] = useState<boolean>(false);
  const [isColliding, setIsColliding] = useState<boolean>(false);
  const [promptFormat, setPromptFormat] = useState<'acestep' | 'yue2' | 'suno' | 'udio' | 'universal'>('acestep');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Synthesized Prompt Output Result
  const [lastResult, setLastResult] = useState<PromptOutputResult | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Search filter for active sidebar
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Toggle sidebars mutually exclusively
  const toggleSidebar = (target: 'beam_a' | 'beam_b' | 'db_yard') => {
    setActiveSidebar(prev => (prev === target ? null : target));
    playLaserBeamSound('laser_select');
  };

  // Inject an item from the extensive Sonic Sector Database Yard into the chamber
  const injectDbItemToChamber = (categoryName: string, itemText: string) => {
    const chipId = `db-${sanitizeId(categoryName)}-${sanitizeId(itemText)}`;
    if (chamberChips.some(c => c.id === chipId)) return;
    const isBeamA = getCategoryGroup(categoryName) === 'beam_a';
    const chip: ColliderChip = {
      id: chipId,
      label: itemText.replace(/^\[(Stack|Template|Pack|FX|Vocal|SFX|Event|Texture|Effect|Warning|System):?\s*/i, '').replace(/\]$/, ''),
      category: isBeamA ? 'genre' : 'production',
      sidebarGroup: isBeamA ? 'beam_a' : 'beam_b',
      color: getCategoryColor(categoryName),
      description: tagDescriptions[itemText] || `${categoryName}: ${itemText}`,
      energyWeight: 0.8,
      tags: [categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), 'database-yard']
    };
    addChipToChamber(chip);
  };

  const copyDbItemText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(text);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  // Add chip to chamber (via click or drag)
  const addChipToChamber = (chip: ColliderChip) => {
    if (chamberChips.some(c => c.id === chip.id)) return;
    setChamberChips(prev => [...prev, { ...chip, energyWeight: 0.8 }]);
    playLaserBeamSound('laser_midi');
  };

  // Remove chip from chamber
  const removeChip = (id: string) => {
    setChamberChips(prev => prev.filter(c => c.id !== id));
    playLaserBeamSound('laser_erase');
  };

  // Update chip energy weight (0.1 to 1.0)
  const updateEnergy = (id: string, weight: number) => {
    setChamberChips(prev => prev.map(c => c.id === id ? { ...c, energyWeight: weight } : c));
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, chip: ColliderChip) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(chip));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const data = e.dataTransfer.getData('text/plain');
      if (data) {
        const chip: ColliderChip = JSON.parse(data);
        addChipToChamber(chip);
      }
    } catch (err) {
      console.warn('Failed to parse dropped chip:', err);
    }
  };

  // INJECT BEAM: Start particle light show, sound synthesis, and AI prompt generation
  const handleInjectBeam = async () => {
    if (chamberChips.length === 0 || isAccelerating || isGenerating) return;

    setIsAccelerating(true);
    setIsGenerating(true);
    setSavedSuccess(false);

    // Play retro-futuristic particle accelerator sound ramp and sync collision flash
    playColliderInjectionSound(() => {
      setIsColliding(true);
      setTimeout(() => setIsColliding(false), 500);
    });

    try {
      const result = await collideSonicParticlesGemini(chamberChips, promptFormat);
      setLastResult(result);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 150);
    } catch (err) {
      console.error('Collision error:', err);
    } finally {
      setTimeout(() => {
        setIsAccelerating(false);
        setIsGenerating(false);
      }, 1300);
    }
  };

  // Quick Randomize Superposition
  const randomizeSuperposition = () => {
    const beamA = SONIC_COLLIDER_CHIPS.filter(c => c.sidebarGroup === 'beam_a');
    const beamB = SONIC_COLLIDER_CHIPS.filter(c => c.sidebarGroup === 'beam_b');

    const randomA = [...beamA].sort(() => Math.random() - 0.5).slice(0, 2);
    const randomB = [...beamB].sort(() => Math.random() - 0.5).slice(0, 3);

    setChamberChips([...randomA, ...randomB]);
    playLaserBeamSound('laser_curve');
  };

  // Copy prompt text
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  // Save collided result to Strange Vault Archive
  const handleSaveToArchive = () => {
    if (!lastResult) return;
    const newItem: ArchiveItem = {
      id: `arch-${Date.now()}`,
      title: lastResult.title,
      type: 'sonic_sector',
      timestamp: Date.now(),
      summary: lastResult.promptText.slice(0, 120) + '...',
      tags: lastResult.styleTags,
      chips: chamberChips,
      promptResult: lastResult,
      starred: true
    };
    onSaveToArchive(newItem);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Filtered chips for active sidebar
  const currentSidebarChips = SONIC_COLLIDER_CHIPS.filter(c => {
    if (!activeSidebar) return false;
    if (c.sidebarGroup !== activeSidebar) return false;
    if (filterCategory !== 'all' && c.category !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return c.label.toLowerCase().includes(q) || 
             c.description.toLowerCase().includes(q) ||
             (c.tags && c.tags.some(t => t.toLowerCase().includes(q)));
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full gap-2.5">
      {/* Compact Top Controls Bar: Inline Steps + Ghost Engine Badge + Sidebar Drawers */}
      <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-[#141622] border border-[#23263B]">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-[11px] text-[#A4ACC8]">
            <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span>
              <strong className="text-white">1.</strong> Matrix Pick + <strong className="text-cyan-300">+ Beam</strong>
              <span className="mx-1.5 text-[#495175]">→</span>
              <strong className="text-white">2.</strong> Mix <strong className="text-amber-300">%</strong>
              <span className="mx-1.5 text-[#495175]">→</span>
              <strong className="text-white">3.</strong> <strong className="text-cyan-300">Collide</strong> → Ace-Step / YuE 2 / Suno
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenKoboldSettings}
            className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border border-amber-500/40 flex items-center gap-1 transition-colors"
            title="Prompts are synthesized by Ghost in the Machine — the lab's Mad Scientist (auto-scaled to your VRAM: 3B–4B compact up to 14B Pro). Click to configure AI Hub."
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>GHOST PROMPT AI: {ghostBadge}</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Sidebar A Toggle Button */}
          <button
            onClick={() => toggleSidebar('beam_a')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 border transition-all ${
              activeSidebar === 'beam_a'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                : 'bg-[#1A1D2D] text-[#8E92B0] border-[#2A2E45] hover:text-white'
            }`}
          >
            <Compass className="w-3 h-3 text-amber-400" />
            <span>Beam A: Genres</span>
            {activeSidebar === 'beam_a' ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>

          {/* Sidebar B Toggle Button */}
          <button
            onClick={() => toggleSidebar('beam_b')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 border transition-all ${
              activeSidebar === 'beam_b'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                : 'bg-[#1A1D2D] text-[#8E92B0] border-[#2A2E45] hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3 text-cyan-400" />
            <span>Beam B: Gear</span>
            {activeSidebar === 'beam_b' ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>

          {/* Database Yard Toggle Button */}
          <button
            onClick={() => toggleSidebar('db_yard')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 border transition-all ${
              activeSidebar === 'db_yard'
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                : 'bg-[#1A1D2D] text-[#8E92B0] border-[#2A2E45] hover:text-white'
            }`}
          >
            <Database className="w-3 h-3 text-purple-400" />
            <span>Sonic Yard DB</span>
            {activeSidebar === 'db_yard' ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>

          {/* Randomize Preset */}
          <button
            onClick={randomizeSuperposition}
            title="Randomize Quantum Superposition"
            className="px-2 py-1 rounded-lg bg-[#1A1D2D] text-[#8E92B0] hover:text-amber-300 border border-[#2A2E45] text-[11px] font-medium flex items-center gap-1 transition-colors"
          >
            <Wand2 className="w-3 h-3" />
            <span className="hidden lg:inline">Superposition</span>
          </button>
        </div>
      </div>

      {/* Main Collision Center Layout with Dynamic Single-Sidebar Drawer */}
      <div className="flex-1 flex gap-3 min-h-0 relative overflow-hidden">
        {/* ACTIVE SIDEBAR DRAWER (Mutually exclusive: Only one open at a time!) */}
        {activeSidebar && (
          <aside className="w-80 flex-shrink-0 flex flex-col bg-[#12141F] border border-[#23273D] rounded-xl overflow-hidden shadow-2xl transition-all duration-300 z-10">
            {/* Sidebar Header */}
            <div className="p-3.5 border-b border-[#202438] flex items-center justify-between bg-[#161928]">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${activeSidebar === 'beam_a' ? 'bg-amber-400' : activeSidebar === 'beam_b' ? 'bg-cyan-400' : 'bg-purple-400'}`} />
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                  {activeSidebar === 'beam_a' 
                    ? 'Beam A // Genres, Eras & Rhythms' 
                    : activeSidebar === 'beam_b' 
                    ? 'Beam B // Instruments, Production & Nuance' 
                    : 'Sonic Yard // Full Static Database'}
                </h3>
              </div>
              <button 
                onClick={() => setActiveSidebar(null)} 
                className="p-1 rounded hover:bg-[#202438] text-[#8E92B0] hover:text-white transition-colors"
                title="Close Sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* CONDITIONAL CONTENT: BEAM A / B OR DB YARD */}
            {activeSidebar === 'db_yard' ? (
              <div className="flex-1 flex flex-col min-h-0 bg-[#0F111A]">
                {/* Search Bar */}
                <div className="p-3 border-b border-[#1E2235] space-y-2 bg-[#121420]">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#5A607C]" />
                    <input
                      type="text"
                      value={dbSearchQuery}
                      onChange={e => setDbSearchQuery(e.target.value)}
                      placeholder="Search 300+ modules, synths, fx..."
                      className="w-full pl-8 pr-2.5 py-1.5 bg-[#171A29] border border-[#282D46] rounded-lg text-xs text-white placeholder-[#5A607C] focus:outline-none focus:border-purple-500/60"
                    />
                  </div>

                  {/* Category Dropdown/Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[#717796] uppercase">Module:</span>
                    <select
                      value={selectedDbCategory}
                      onChange={e => setSelectedDbCategory(e.target.value)}
                      className="flex-1 px-2 py-1 bg-[#171A29] border border-[#282D46] rounded text-[11px] text-purple-300 font-medium focus:outline-none cursor-pointer"
                    >
                      {Object.keys(sonicSectorDB).map(catName => (
                        <option key={catName} value={catName} className="bg-[#121420] text-white">
                          {catName} ({sonicSectorDB[catName]?.length || 0})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-[#717796] pb-1 border-b border-[#1E2235]">
                    <span className="font-semibold text-purple-300">{selectedDbCategory}</span>
                    <span>Click item to inject into collider</span>
                  </div>

                  {(() => {
                    const allItems = dbSearchQuery.trim()
                      ? Object.entries(sonicSectorDB).flatMap(([cat, items]) => 
                          items
                            .filter(it => it.toLowerCase().includes(dbSearchQuery.toLowerCase()))
                            .map(it => ({ category: cat, text: it }))
                        )
                      : (sonicSectorDB[selectedDbCategory] || []).map(it => ({ category: selectedDbCategory, text: it }));

                    if (allItems.length === 0) {
                      return (
                        <div className="text-center py-8 text-xs text-[#5D6488]">
                          No database items found matching "{dbSearchQuery}".
                        </div>
                      );
                    }

                    return allItems.map(({ category, text }, idx) => {
                      const description = tagDescriptions[text];
                      const isLoaded = chamberChips.some(c => c.label === text || c.id.includes(sanitizeId(text)));
                      const chipColor = getCategoryColor(category);

                      return (
                        <div
                          key={`${category}-${text}-${idx}`}
                          onClick={() => injectDbItemToChamber(category, text)}
                          className={`group relative p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                            isLoaded
                              ? 'bg-purple-950/20 border-purple-500/40 text-purple-200'
                              : 'bg-[#151826] hover:bg-[#1C2033] border-[#252A42] hover:border-purple-500/40 text-white'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span 
                                className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
                                style={{ backgroundColor: chipColor }}
                              />
                              <span className="text-xs font-medium leading-snug break-words">
                                {text}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 flex-shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyDbItemText(text);
                                }}
                                title="Copy Tag"
                                className="p-1 rounded bg-[#1C2033] hover:bg-purple-500/20 text-[#8E92B0] hover:text-purple-300 transition-colors"
                              >
                                {copiedItem === text ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  injectDbItemToChamber(category, text);
                                }}
                                title="Inject into Collision Chamber"
                                className="p-1 rounded bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {description && (
                            <p className="text-[11px] text-[#8E94B4] mt-1.5 leading-relaxed bg-[#10121C] p-1.5 rounded border border-[#1E2235]">
                              {description}
                            </p>
                          )}

                          <div className="flex items-center justify-between mt-1 text-[9px] font-mono text-[#5D6488]">
                            <span>{category}</span>
                            <span className="uppercase text-purple-400/70">
                              {getCategoryGroup(category) === 'beam_a' ? 'Beam A' : 'Beam B'}
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            ) : (
              <>
                {/* Filter and Search Bar for Beam A & Beam B */}
                <div className="p-3 border-b border-[#1E2235] space-y-2 bg-[#10121C]">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Filter particles (e.g., Samba, Tape)..."
                    className="w-full px-2.5 py-1.5 bg-[#171A29] border border-[#282D46] rounded-lg text-xs text-white placeholder-[#5A607C] focus:outline-none focus:border-cyan-500/60"
                  />
                  <div className="flex flex-wrap gap-1">
                    {activeSidebar === 'beam_a' ? (
                      ['all', 'genre', 'era', 'rhythm'].map(cat => (
                        <button
                          key={cat}
                          onClick={() => setFilterCategory(cat)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono capitalize transition-colors ${
                            filterCategory === cat
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-[#1A1D2E] text-[#717796] hover:text-white'
                          }`}
                        >
                          {cat}
                        </button>
                      ))
                    ) : (
                      ['all', 'instrument', 'production', 'nuance'].map(cat => (
                        <button
                          key={cat}
                          onClick={() => setFilterCategory(cat)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono capitalize transition-colors ${
                            filterCategory === cat
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'bg-[#1A1D2E] text-[#717796] hover:text-white'
                          }`}
                        >
                          {cat}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Draggable Particle Chips List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  <p className="text-[11px] text-[#6A7090] italic mb-1">
                    Drag a chip into the collider chamber or click (+) to inject:
                  </p>
                  {currentSidebarChips.map(chip => {
                    const isLoaded = chamberChips.some(c => c.id === chip.id);
                    return (
                      <div
                        key={chip.id}
                        draggable
                        onDragStart={e => handleDragStart(e, chip)}
                        onClick={() => addChipToChamber(chip)}
                        className={`group relative p-2.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing select-none ${
                          isLoaded
                            ? 'bg-[#191D2E]/50 border-emerald-500/30 text-emerald-300'
                            : 'bg-[#151826] hover:bg-[#1C2033] border-[#252A42] hover:border-[#3D456B] text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span 
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: chip.color }}
                            />
                            <span className="text-xs font-semibold truncate">{chip.label}</span>
                          </div>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#1D2136] text-[#8E92B0] border border-[#2D3352] uppercase flex-shrink-0">
                            {chip.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#7E84A3] mt-1 leading-snug line-clamp-2">
                          {chip.description}
                        </p>
                        {chip.tags && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {chip.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="text-[9px] text-[#5D6488] font-mono">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Add hover indicator */}
                        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="p-1 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/40">
                            <Plus className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {currentSidebarChips.length === 0 && (
                    <div className="text-center py-8 text-xs text-[#5D6488]">
                      No sonic chips matching query.
                    </div>
                  )}
                </div>
              </>
            )}

          </aside>
        )}

        {/* CENTRAL COLLISION CHAMBER & OUTPUT HUB */}
        <main className="flex-1 flex flex-col gap-3 min-w-0 overflow-y-auto pr-0.5">
          {/* Upper Section: Full-Height LHC Particle Collider Lightshow & Injection Synthesizer */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-shrink-0">
            {/* Visual Canvas Area (7 cols on lg) - full circular lightshow above the fold */}
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="lg:col-span-7 h-[330px] xl:h-[380px] relative rounded-xl border border-[#242840] overflow-hidden"
            >
              <ColliderChamberCanvas 
                isAccelerating={isAccelerating} 
                isColliding={isColliding} 
                chipsCount={chamberChips.length}
                collisionEnergy={collisionEnergy}
              />

              {/* Drag Prompt Hint Overlay */}
              {chamberChips.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/60 pointer-events-none">
                  <AtomIcon className="w-12 h-12 text-cyan-400 mb-2 animate-pulse" />
                  <p className="text-sm font-semibold text-white">Chamber Empty // Beam Sonic Ingredients</p>
                  <p className="text-xs text-[#8E92B0] max-w-sm mt-1">
                    Pick a Category + Style in the top Matrix bar and click <strong>+ Beam into Collider</strong>, or open Beam A / B / Sonic Yard DB on the left to add genres, instruments, and gear.
                  </p>
                </div>
              )}
            </div>

            {/* Injection Control Panel (5 cols on lg) - Locked to canvas height so lightshow stays unclipped */}
            <div className="lg:col-span-5 lg:h-[330px] xl:h-[380px] flex flex-col min-h-0 p-3.5 rounded-xl bg-[#141724] border border-[#242840]">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-mono tracking-wider text-white uppercase">Collision Synthesizer</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                    LHC SYNCHRONIZED
                  </span>
                </div>

                {/* Target AI Engine Selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-[#8E92B0] flex items-center justify-between">
                    <span>TARGET AI MUSIC GENERATOR</span>
                    <span className="text-cyan-400">
                      {promptFormat === 'acestep' ? 'ACE-STEP 1.5' : promptFormat === 'yue2' ? 'YUE 2' : promptFormat.toUpperCase()}
                    </span>
                  </label>
                  <div className="grid grid-cols-5 gap-1">
                    {([
                      { id: 'acestep', label: 'Ace-Step' },
                      { id: 'yue2', label: 'YuE 2' },
                      { id: 'suno', label: 'Suno' },
                      { id: 'udio', label: 'Udio' },
                      { id: 'universal', label: 'Universal' }
                    ] as const).map(fmt => (
                      <button
                        key={fmt.id}
                        onClick={() => setPromptFormat(fmt.id)}
                        className={`py-1 px-1.5 rounded-lg text-[11px] font-mono font-medium border transition-all truncate ${
                          promptFormat === fmt.id
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                            : 'bg-[#181C2C] text-[#6A7090] border-[#282D46] hover:text-white'
                        }`}
                        title={`Format collision prompt for ${fmt.label}`}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Scrollable Loaded Collision Queue (Shows every Matrix/Sidebar particle ready to collide) */}
              <div className="flex-1 min-h-0 flex flex-col my-2 p-2 rounded-lg bg-[#0E101A] border border-[#1F2338]">
                <div className="flex-shrink-0 flex items-center justify-between text-[10px] font-mono pb-1.5 mb-1.5 border-b border-[#1A1F33]">
                  <span className="text-[#8E95B8] uppercase tracking-wider">
                    Ready to Collide <strong className="text-white">({chamberChips.length})</strong>
                  </span>
                  <span className="text-amber-300 font-semibold truncate max-w-[155px]" title="Active Ghost in the Machine local model profile">
                    Ghost: {ghostBadge}
                  </span>
                </div>

                {chamberChips.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-center px-2 text-[11px] text-[#64748b] border border-dashed border-[#1E243B] rounded">
                    Chamber empty — pick a Category &amp; Style above and click <strong className="text-cyan-300 mx-1">+ Beam</strong>.
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-1">
                    {chamberChips.map(chip => {
                      const weightPct = Math.round((chip.energyWeight || 0.8) * 100);
                      return (
                        <div
                          key={chip.id}
                          className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-[#151827] border border-[#242942] hover:border-cyan-500/40 transition-colors group"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0 shadow-[0_0_6px_currentColor]"
                              style={{ backgroundColor: chip.color, color: chip.color }}
                            />
                            <span className="text-[11px] font-medium text-white truncate" title={chip.label}>
                              {chip.label}
                            </span>
                            <span className="text-[9px] font-mono uppercase px-1 py-0.2 rounded bg-[#1E2338] text-[#7D85A8] flex-shrink-0">
                              {chip.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-[10px] font-mono text-amber-300 font-semibold">
                              {weightPct}%
                            </span>
                            <button
                              type="button"
                              onClick={() => removeChip(chip.id)}
                              className="text-[#646A8C] hover:text-red-400 p-0.5 rounded transition-colors"
                              title={`Remove ${chip.label} from collider`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex-shrink-0 space-y-1.5 pt-2 border-t border-[#1F2338]">
                <button
                  onClick={handleInjectBeam}
                  disabled={chamberChips.length === 0 || isAccelerating || isGenerating}
                  className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2.5 transition-all shadow-lg ${
                    chamberChips.length === 0
                      ? 'bg-[#1E2235] text-[#555B7A] cursor-not-allowed'
                      : isAccelerating || isGenerating
                      ? 'bg-gradient-to-r from-cyan-600 via-purple-600 to-amber-600 text-white animate-pulse shadow-[0_0_24px_rgba(6,182,212,0.4)]'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:scale-[1.01] active:scale-[0.99]'
                  }`}
                >
                  <Zap className={`w-4 h-4 ${isAccelerating ? 'animate-bounce' : ''}`} />
                  <span>
                    {isAccelerating
                      ? 'ACCELERATING HADRON BEAM...'
                      : isGenerating
                      ? 'SYNTHESIZING PROMPT...'
                      : `COLLIDE ${chamberChips.length} PARTICLE${chamberChips.length === 1 ? '' : 'S'} // CREATE PROMPT`}
                  </span>
                </button>

                <div className="flex items-center justify-between text-[11px] text-[#6A7090] gap-2 flex-wrap">
                  <button
                    onClick={() => setChamberChips([])}
                    disabled={chamberChips.length === 0}
                    className="hover:text-red-400 transition-colors flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear Chamber</span>
                  </button>

                  {onSaveCollisionClick && (
                    <button
                      onClick={() => onSaveCollisionClick(chamberChips, lastResult)}
                      disabled={chamberChips.length === 0}
                      className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 font-mono font-bold"
                      title="Save current chamber particles, energy, and synthesis"
                    >
                      <Save className="w-3 h-3" />
                      <span>Save Collision</span>
                    </button>
                  )}

                  <button
                    onClick={onOpenArchive}
                    className="hover:text-cyan-400 transition-colors flex items-center gap-1 font-mono"
                  >
                    <Archive className="w-3 h-3" />
                    <span>Archive Vault</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Section: Active Particles in Chamber with Energy Weight Controls */}
          <div className="p-4 rounded-xl bg-[#141724] border border-[#242840]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-mono text-white tracking-wider uppercase">Active Particle Weights & Nuance Ratios</h3>
              </div>
              <span className="text-[11px] text-[#7B82A6]">
                Adjust energy sliders to dial in the nuance ratios of each style
              </span>
            </div>

            {chamberChips.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#5D6488] border border-dashed border-[#242840] rounded-lg">
                Chamber is empty. Select Beam A or Beam B sidebars to inject styles into the collision.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {chamberChips.map(chip => {
                  const weightPct = Math.round((chip.energyWeight || 0.8) * 100);
                  return (
                    <div 
                      key={chip.id}
                      className="p-3 rounded-lg bg-[#0F111B] border border-[#202438] flex flex-col justify-between gap-2 relative group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span 
                            className="w-3 h-3 rounded-full flex-shrink-0 shadow-[0_0_8px_currentColor]"
                            style={{ backgroundColor: chip.color, color: chip.color }}
                          />
                          <span className="text-xs font-semibold text-white truncate">{chip.label}</span>
                        </div>
                        <button
                          onClick={() => removeChip(chip.id)}
                          className="text-[#646A8C] hover:text-red-400 p-0.5 rounded transition-colors"
                          title="Remove particle"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Weight Ratio Slider */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-[#6A7090]">ENERGY RATIO</span>
                          <span className="text-amber-400">{weightPct}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.05"
                          value={chip.energyWeight || 0.8}
                          onChange={e => updateEnergy(chip.id, parseFloat(e.target.value))}
                          className="w-full h-1 bg-[#1E2338] rounded-lg appearance-none cursor-pointer accent-amber-400"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lower Section: Synthesized AI Music Generator Prompt Console Output */}
          {lastResult && (
            <div ref={resultRef} className="p-4 rounded-xl bg-gradient-to-b from-[#151928] to-[#10131F] border border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.15)] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#232942] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-wide">{lastResult.title}</h3>
                    <p className="text-xs text-[#8E92B0] font-mono">
                      Synthesized for {promptFormat === 'acestep' ? 'ACE-STEP 1.5' : promptFormat === 'yue2' ? 'YUE 2' : promptFormat.toUpperCase()} // ~{lastResult.tempoBpm || 116} BPM
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(lastResult.promptText)}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-medium flex items-center gap-1.5 transition-all"
                  >
                    {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPrompt ? 'COPIED!' : 'COPY PROMPT'}</span>
                  </button>

                  {onSendPromptToAceStep && (
                    <button
                      onClick={() => onSendPromptToAceStep(lastResult.promptText, lastResult.tempoBpm)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
                      title="Open Ace-Step 1.5 Loop Designer pre-filled with this collided prompt"
                    >
                      <span>Send to Ace-Step 1.5</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {onSendPromptToYue2 && (
                    <button
                      onClick={() => onSendPromptToYue2(lastResult.promptText, lastResult.tempoBpm)}
                      className="px-3 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
                      title="Open YuE 2 AI Song Foundation Generator pre-filled with this collided prompt"
                    >
                      <span>Send to YuE 2</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {onSaveCollisionClick && (
                    <button
                      onClick={() => onSaveCollisionClick(chamberChips, lastResult)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-400/50 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                      title="Save this completed collision with its prompt output"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>SAVE COLLISION</span>
                    </button>
                  )}

                  <button
                    onClick={handleSaveToArchive}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
                      savedSuccess
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>{savedSuccess ? 'ARCHIVED!' : 'ARCHIVE TO VAULT'}</span>
                  </button>
                </div>
              </div>

              {/* Master Prompt String */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-[#8E92B0] tracking-wider uppercase flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-cyan-400" />
                  <span>Generated Prompt (Copy or Send to Ace-Step 1.5 / YuE 2 / Suno / Udio)</span>
                </label>
                <div className="p-3 rounded-lg bg-[#0A0C14] border border-[#242A42] text-xs font-mono text-cyan-100 leading-relaxed select-all">
                  {lastResult.promptText}
                </div>
              </div>

              {/* Style Tags */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-[#8E92B0] tracking-wider uppercase">Style & Nuance Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {lastResult.styleTags.map((tag, i) => (
                    <span 
                      key={i} 
                      className="px-2.5 py-0.5 rounded-full bg-[#181D2E] text-cyan-300 border border-cyan-500/30 text-xs font-mono"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Vibe Description */}
              <p className="text-xs text-[#9DA3C5] italic border-l-2 border-amber-500/60 pl-3 py-1">
                "{lastResult.vibeDescription}"
              </p>

              {/* Arrangement Structure Blueprint */}
              {lastResult.structureBlueprint && lastResult.structureBlueprint.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#20253B]">
                  <label className="text-[11px] font-mono text-[#8E92B0] tracking-wider uppercase flex items-center gap-1.5">
                    <Music2 className="w-3 h-3 text-purple-400" />
                    <span>Arrangement & Pacing Blueprint</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                    {lastResult.structureBlueprint.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-[#0D0F18] border border-[#1E2338]">
                        <span className="text-[10px] font-mono font-bold text-amber-400 block mb-1">
                          {item.section}
                        </span>
                        <p className="text-[11px] text-[#7B82A6] leading-snug">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

// Fallback Icon for Chamber
const AtomIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="2" />
    <path d="M12 2a10 10 0 0 0-10 10 10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2z" opacity="0.3" />
    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(45 12 12)" />
    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-45 12 12)" />
  </svg>
);

export default SonicSector;
