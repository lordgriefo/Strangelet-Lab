import React, { useState } from 'react';
import { 
  Archive, 
  Search, 
  Star, 
  Trash2, 
  Copy, 
  Check, 
  Download, 
  Upload, 
  RotateCcw, 
  Filter, 
  Tag, 
  Clock, 
  ExternalLink,
  Sparkles,
  Zap,
  FileText,
  Binary,
  Layers
} from 'lucide-react';
import { ArchiveItem, ColliderChip } from '../../types';
import { playLaserBeamSound } from '../../lib/laserSound';

interface StrangeArchiveProps {
  items: ArchiveItem[];
  onDeleteItem: (id: string) => void;
  onToggleStar: (id: string) => void;
  onRestoreToChamber: (chips: ColliderChip[]) => void;
  onSelectTab: (tabId: 'sonic' | 'lyrics' | 'deconstruct' | 'archive') => void;
  onImportItems: (items: ArchiveItem[]) => void;
}

export const StrangeArchive: React.FC<StrangeArchiveProps> = ({
  items,
  onDeleteItem,
  onToggleStar,
  onRestoreToChamber,
  onSelectTab,
  onImportItems
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<ArchiveItem | null>(items[0] || null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredItems = items.filter(item => {
    if (filterType === 'starred' && !item.starred) return false;
    if (filterType !== 'all' && filterType !== 'starred' && item.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return item.title.toLowerCase().includes(q) ||
             item.summary.toLowerCase().includes(q) ||
             item.tags.some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportArchiveJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(items, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `strangelet_lab_archive_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleRestore = (item: ArchiveItem) => {
    if (item.chips && item.chips.length > 0) {
      onRestoreToChamber(item.chips);
      onSelectTab('sonic');
      playLaserBeamSound('laser_audio');
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#141622] border border-[#23263B]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-wide text-white uppercase">Strange Lab Vault // Persistent Archive</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/50">
                {items.length} SAVED SESSIONS
              </span>
            </div>
            <p className="text-xs text-[#8E92B0]">Every prompt, lyric collision, song DNA deconstruction, and instrument state archived for instant recall.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportArchiveJson}
            className="px-3 py-1.5 rounded-lg bg-[#1A1D2D] hover:bg-[#23273D] text-[#8E92B0] hover:text-white border border-[#282D44] text-xs font-mono flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Vault JSON</span>
          </button>
        </div>
      </div>

      {/* Main Dual Pane Archive Explorer */}
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
        {/* Left List Pane (5 cols equivalent) */}
        <div className="w-full md:w-80 lg:w-96 flex flex-col bg-[#141724] border border-[#242840] rounded-xl overflow-hidden flex-shrink-0">
          {/* Search & Type Filters */}
          <div className="p-3 border-b border-[#202438] space-y-2 bg-[#10121C]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#636A8C]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search archive..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#171A29] border border-[#282D46] rounded-lg text-xs text-white placeholder-[#5A607C] focus:outline-none focus:border-amber-500/60"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'starred', label: '★ Starred' },
                { id: 'sonic_sector', label: 'Sonic Sector' },
                { id: 'lyric_lab', label: 'Lyric Lab' },
                { id: 'deconstructor', label: 'Song Decon' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${
                    filterType === f.id
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-[#181C2C] text-[#717798] hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {filteredItems.map(item => {
              const isSelected = selectedItem?.id === item.id;
              const dateStr = new Date(item.timestamp).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer select-none relative group ${
                    isSelected
                      ? 'bg-[#1C2033] border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                      : 'bg-[#10121C] hover:bg-[#161928] border-[#22273E]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        {item.type === 'sonic_sector' && <Zap className="w-3 h-3 text-cyan-400 flex-shrink-0" />}
                        {item.type === 'lyric_lab' && <FileText className="w-3 h-3 text-purple-400 flex-shrink-0" />}
                        {item.type === 'deconstructor' && <Binary className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                        <h4 className="text-xs font-semibold text-white truncate">{item.title}</h4>
                      </div>
                      <p className="text-[11px] text-[#7A81A4] line-clamp-2 leading-relaxed">
                        {item.summary}
                      </p>
                    </div>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onToggleStar(item.id);
                      }}
                      className="p-1 text-[#656C8E] hover:text-amber-400 transition-colors"
                      title="Star favorite"
                    >
                      <Star className={`w-3.5 h-3.5 ${item.starred ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1C2033] text-[10px] font-mono text-[#5A6082]">
                    <span>{dateStr}</span>
                    <span className="uppercase text-amber-400/80">{item.type.replace('_', ' ')}</span>
                  </div>
                </div>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="text-center py-12 text-xs text-[#5D6488]">
                No archived items found matching query.
              </div>
            )}
          </div>
        </div>

        {/* Right Detail Pane */}
        <div className="flex-1 flex flex-col p-4 bg-[#141724] border border-[#242840] rounded-xl overflow-y-auto min-w-0">
          {selectedItem ? (
            <div className="space-y-4">
              {/* Detail Top Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#22273F] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1C2033] text-amber-300 border border-amber-500/30 uppercase">
                      {selectedItem.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-[#7B82A6] font-mono">
                      {new Date(selectedItem.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">{selectedItem.title}</h3>
                </div>

                <div className="flex items-center gap-2">
                  {selectedItem.chips && selectedItem.chips.length > 0 && (
                    <button
                      onClick={() => handleRestore(selectedItem)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-medium flex items-center gap-1.5 transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>RESTORE TO CHAMBER</span>
                    </button>
                  )}

                  <button
                    onClick={() => onDeleteItem(selectedItem.id)}
                    className="p-1.5 rounded-lg bg-[#1D2136] hover:bg-red-950/40 text-[#717798] hover:text-red-400 border border-[#2B314E] transition-colors"
                    title="Delete item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {selectedItem.tags.map(t => (
                  <span key={t} className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#1A1E30] text-amber-300 border border-amber-500/30">
                    #{t}
                  </span>
                ))}
              </div>

              {/* Specific Content by Type */}
              {selectedItem.promptResult && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono text-cyan-400 uppercase flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      <span>Suno/Udio Prompt String</span>
                    </label>
                    <button
                      onClick={() => handleCopy(selectedItem.id, selectedItem.promptResult!.promptText)}
                      className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      {copiedId === selectedItem.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === selectedItem.id ? 'COPIED!' : 'COPY'}</span>
                    </button>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#0B0D15] border border-[#20253B] font-mono text-xs text-cyan-100 leading-relaxed select-all">
                    {selectedItem.promptResult.promptText}
                  </div>

                  {selectedItem.promptResult.structureBlueprint && (
                    <div className="space-y-2 pt-2">
                      <label className="text-[11px] font-mono text-[#8E92B0] uppercase">Arrangement Blueprint</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedItem.promptResult.structureBlueprint.map((sec, i) => (
                          <div key={i} className="p-2.5 rounded bg-[#0F121E] border border-[#202438] text-xs">
                            <span className="text-amber-400 font-mono font-bold block mb-0.5">{sec.section}</span>
                            <span className="text-[#8E92B0] leading-snug">{sec.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedItem.lyricResult && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono text-purple-400 uppercase flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Lyrics Output</span>
                    </label>
                    <button
                      onClick={() => handleCopy(selectedItem.id, selectedItem.lyricResult!.fullFormattedText)}
                      className="text-xs font-mono text-purple-400 hover:text-purple-300 flex items-center gap-1"
                    >
                      {copiedId === selectedItem.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === selectedItem.id ? 'COPIED!' : 'COPY'}</span>
                    </button>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0B0D15] border border-[#20253B] font-mono text-xs text-purple-100 leading-relaxed whitespace-pre-wrap select-all">
                    {selectedItem.lyricResult.fullFormattedText}
                  </div>
                </div>
              )}

              {selectedItem.deconstructResult && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-[#0F121E] border border-[#202438]">
                    <span className="text-[10px] font-mono text-[#7B82A6] block">REFERENCE SONG</span>
                    <span className="text-sm font-semibold text-white">{selectedItem.deconstructResult.referenceSong}</span>
                    <span className="text-[10px] font-mono text-amber-400 block mt-2">RE-IMAGINED TOPIC</span>
                    <span className="text-xs text-white">{selectedItem.deconstructResult.targetTopic}</span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-mono text-amber-400 uppercase">Re-Imagined Prompt</span>
                    <div className="p-3 rounded-lg bg-[#0B0D15] border border-[#20253B] font-mono text-xs text-amber-100 leading-relaxed select-all">
                      {selectedItem.deconstructResult.reimaginedPrompt}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-mono text-purple-400 uppercase">Sample Stanzas</span>
                    <div className="p-3 rounded-lg bg-[#0B0D15] border border-[#20253B] font-mono text-xs text-purple-100 leading-relaxed whitespace-pre-wrap select-all">
                      {selectedItem.deconstructResult.reimaginedLyrics}
                    </div>
                  </div>
                </div>
              )}

              {/* Injected Chips List if available */}
              {selectedItem.chips && selectedItem.chips.length > 0 && (
                <div className="pt-3 border-t border-[#202438]">
                  <span className="text-xs font-mono text-[#8E92B0] uppercase block mb-2">
                    Injected Particle Atoms ({selectedItem.chips.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedItem.chips.map(chip => (
                      <span
                        key={chip.id}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5"
                        style={{
                          backgroundColor: `${chip.color}15`,
                          borderColor: `${chip.color}40`,
                          color: chip.color
                        }}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: chip.color }} />
                        <span>{chip.label}</span>
                        {chip.energyWeight && (
                          <span className="text-[10px] opacity-75 font-mono">({Math.round(chip.energyWeight * 100)}%)</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-xs text-[#5D6488]">
              Select an archived item to inspect its prompts, blueprint, and lyrics.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StrangeArchive;
