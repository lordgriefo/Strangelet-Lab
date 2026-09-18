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
  ExternalLink
} from 'lucide-react';
import { SonicSector } from './SonicSector';
import { LyricLab } from './LyricLab';
import { SongDeconstructor } from './SongDeconstructor';
import { StrangeArchive } from './StrangeArchive';
import { SunoMasteringStudio } from '../SunoMasteringStudio';
import { ArchiveItem, ColliderChip } from '../../types';
import { INITIAL_ARCHIVE_ITEMS } from '../../lib/sonicColliderData';
import { playLaserBeamSound } from '../../lib/laserSound';

export type ColliderTab = 'sonic' | 'lyrics' | 'deconstruct' | 'archive' | 'mastering';

const STORAGE_KEY = 'strangelet_lab_archive';

export const LargeSonicCollider: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ColliderTab>('sonic');
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
    // Restores chips into chamber
    setActiveTab('sonic');
  };

  const switchTab = (tab: ColliderTab) => {
    setActiveTab(tab);
    playLaserBeamSound('laser_select');
  };

  return (
    <div className="flex flex-col h-full bg-[#0E1017] text-white overflow-hidden select-none">
      {/* LSC Sub-Navigation Bar: 4 Core Sectors */}
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

        {/* The 4 Sector Tabs */}
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

      {/* Active Tab Viewport */}
      <div className="flex-1 p-4 lg:p-6 overflow-hidden min-h-0">
        {activeTab === 'sonic' && (
          <SonicSector
            onSaveToArchive={handleSaveToArchive}
            onOpenArchive={() => switchTab('archive')}
          />
        )}

        {activeTab === 'lyrics' && (
          <LyricLab
            onSaveToArchive={handleSaveToArchive}
            onOpenArchive={() => switchTab('archive')}
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
    </div>
  );
};

export default LargeSonicCollider;
