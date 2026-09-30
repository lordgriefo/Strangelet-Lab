import React, { useState } from 'react';
import { 
  X, 
  Search, 
  RotateCcw, 
  Trash2, 
  Copy, 
  Check, 
  Star, 
  Zap, 
  Feather, 
  Download, 
  Sparkles, 
  Activity, 
  Filter, 
  Clock, 
  SlidersHorizontal,
  ChevronRight,
  Archive
} from 'lucide-react';
import { SavedCollision } from '../../types';
import { calculatePhysicsConstants } from '../../lib/collisionPhysics';
import { playLaserBeamSound } from '../../lib/laserSound';

interface SavedCollisionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedCollisions: SavedCollision[];
  onRestoreCollision: (collision: SavedCollision) => void;
  onDeleteCollision: (id: string) => void;
  onToggleStarCollision: (id: string) => void;
}

export const SavedCollisionsModal: React.FC<SavedCollisionsModalProps> = ({
  isOpen,
  onClose,
  savedCollisions,
  onRestoreCollision,
  onDeleteCollision,
  onToggleStarCollision
}) => {
  if (!isOpen) return null;

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'all' | 'sonic' | 'lyrics' | 'starred'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'energy_high' | 'energy_low'>('newest');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter collisions
  const filtered = savedCollisions.filter(c => {
    if (filterMode === 'starred' && !c.starred) return false;
    if (filterMode === 'sonic' && c.mode !== 'sonic') return false;
    if (filterMode === 'lyrics' && c.mode !== 'lyrics') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchCat = c.category?.toLowerCase().includes(q);
      const matchTags = c.tags?.some(t => t.toLowerCase().includes(q));
      const matchNotes = c.notes?.toLowerCase().includes(q);
      const matchChips = c.chips?.some(chip => chip.label.toLowerCase().includes(q));
      return matchName || matchCat || matchTags || matchNotes || matchChips;
    }
    return true;
  });

  // Sort collisions
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'energy_high') return b.collisionEnergy - a.collisionEnergy;
    if (sortBy === 'energy_low') return a.collisionEnergy - b.collisionEnergy;
    return b.timestamp - a.timestamp;
  });

  const handleCopySpec = (collision: SavedCollision) => {
    const text = `=== COLLISION SNAPSHOT: ${collision.name} ===
Mode: ${collision.mode === 'sonic' ? 'Sonic Sector' : 'Lyric Lab'}
Collision Energy: ${collision.collisionEnergy.toFixed(1)} TeV
Mass Constant: ×${collision.massConstant.toFixed(2)} m₀
Velocity Constant: ×${collision.velocityConstant.toFixed(2)} c
Gravity Constant: ×${collision.gravityConstant.toFixed(2)} G₀
Category: ${collision.category}
${collision.chips?.length ? `Chamber Particles: ${collision.chips.map(c => c.label).join(', ')}` : ''}
${collision.promptResult?.promptText ? `\nPrompt Result:\n${collision.promptResult.promptText}` : ''}
${collision.notes ? `\nNotes: ${collision.notes}` : ''}
`;
    navigator.clipboard.writeText(text);
    setCopiedId(collision.id);
    playLaserBeamSound('laser_select');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(savedCollisions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `strangelet_saved_collisions_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-4xl h-[88vh] rounded-2xl bg-[#0B0E18] border border-[#232942] shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#1E243A] bg-[#0E1220] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 via-purple-500/20 to-amber-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-wider uppercase text-white">
                  SAVED COLLIDER COLLISIONS
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-600/40 text-cyan-300">
                  {savedCollisions.length} SNAPSHOTS
                </span>
              </div>
              <p className="text-xs text-[#888EA8]">
                Restore exact particle mass, velocity, gravity constants, and chamber superposition states.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJson}
              className="px-3 py-1.5 rounded-lg bg-[#141829] hover:bg-[#1E233B] border border-[#242C48] text-xs font-mono text-[#8E94B8] hover:text-white flex items-center gap-1.5 transition-colors"
              title="Export all saved collisions as JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export JSON</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#7E85A8] hover:text-white hover:bg-[#1E233B] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 border-b border-[#1C2136] bg-[#0C101C] flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#5F678B]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, tag, category, or particle..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#121626] border border-[#242A44] text-xs font-mono text-white focus:outline-none focus:border-cyan-400 placeholder:text-[#4F5575]"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Filters */}
            <div className="flex items-center p-0.5 rounded-lg bg-[#121626] border border-[#242A44] text-xs font-mono">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filterMode === 'all' ? 'bg-[#222842] text-white font-bold' : 'text-[#7B82A6] hover:text-white'
                }`}
              >
                All ({savedCollisions.length})
              </button>
              <button
                onClick={() => setFilterMode('sonic')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors ${
                  filterMode === 'sonic' ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-500/40' : 'text-[#7B82A6] hover:text-white'
                }`}
              >
                <Zap className="w-3 h-3 text-cyan-400" />
                <span>Sonic</span>
              </button>
              <button
                onClick={() => setFilterMode('lyrics')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors ${
                  filterMode === 'lyrics' ? 'bg-purple-950 text-purple-300 font-bold border border-purple-500/40' : 'text-[#7B82A6] hover:text-white'
                }`}
              >
                <Feather className="w-3 h-3 text-purple-400" />
                <span>Lyrics</span>
              </button>
              <button
                onClick={() => setFilterMode('starred')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors ${
                  filterMode === 'starred' ? 'bg-amber-950 text-amber-300 font-bold border border-amber-500/40' : 'text-[#7B82A6] hover:text-white'
                }`}
              >
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>Starred</span>
              </button>
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg bg-[#121626] border border-[#242A44] text-xs font-mono text-white focus:outline-none cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="energy_high">Highest Energy (TeV)</option>
              <option value="energy_low">Lowest Energy (TeV)</option>
            </select>
          </div>
        </div>

        {/* Collisions Grid / List View */}
        <div className="flex-1 p-6 overflow-y-auto min-h-0 space-y-3">
          {sorted.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-xs font-mono text-[#6A7196] space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#141829] border border-[#242A44] flex items-center justify-center text-[#4F5575]">
                <Activity className="w-6 h-6 animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-white">No saved collisions found</p>
              <p className="max-w-sm text-[#7D84A6]">
                Adjust the Collision Energy slider in the Large Sonic Collider, set your particles or lyric themes, and click "Save Collision" to store snapshots here.
              </p>
            </div>
          ) : (
            sorted.map(collision => {
              const physics = calculatePhysicsConstants(collision.collisionEnergy);
              const isSonic = collision.mode === 'sonic';

              return (
                <div
                  key={collision.id}
                  className={`p-4 rounded-xl border transition-all duration-200 group relative ${
                    isSonic 
                      ? 'bg-[#0E1322] hover:bg-[#12182B] border-cyan-900/40 hover:border-cyan-500/50 shadow-[0_2px_15px_rgba(0,0,0,0.3)]'
                      : 'bg-[#150F22] hover:bg-[#1A132B] border-purple-900/40 hover:border-purple-500/50 shadow-[0_2px_15px_rgba(0,0,0,0.3)]'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    {/* Left: Info & Badges */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Mode badge */}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase flex items-center gap-1 border ${
                          isSonic 
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-500/40' 
                            : 'bg-purple-950 text-purple-300 border-purple-500/40'
                        }`}>
                          {isSonic ? <Zap className="w-3 h-3" /> : <Feather className="w-3 h-3" />}
                          {isSonic ? 'Sonic Sector' : 'Lyric Lab'}
                        </span>

                        {/* Energy Badge */}
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-950/80 border border-amber-500/40 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.25)] flex items-center gap-1">
                          ⚡ {collision.collisionEnergy.toFixed(1)} TeV
                        </span>

                        {/* Title */}
                        <h3 className="text-sm font-bold text-white group-hover:text-cyan-200 transition-colors">
                          {collision.name}
                        </h3>

                        {/* Star Button */}
                        <button
                          onClick={() => onToggleStarCollision(collision.id)}
                          className={`p-1 rounded hover:bg-white/10 transition-colors ${
                            collision.starred ? 'text-amber-400 fill-amber-400' : 'text-[#50577A]'
                          }`}
                          title={collision.starred ? 'Remove star' : 'Star this collision'}
                        >
                          <Star className={`w-3.5 h-3.5 ${collision.starred ? 'fill-amber-400' : ''}`} />
                        </button>
                      </div>

                      {/* Physics Constants Ribbon */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                        <span className="px-2 py-0.5 rounded bg-[#090C16] border border-[#1E2338] text-[#8E95B8]">
                          MASS CONSTANT: <strong className="text-amber-300">×{collision.massConstant?.toFixed(2) || physics.massConstant.toFixed(2)} m₀</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#090C16] border border-[#1E2338] text-[#8E95B8]">
                          VELOCITY: <strong className="text-cyan-300">×{collision.velocityConstant?.toFixed(2) || physics.velocityConstant.toFixed(2)} c</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#090C16] border border-[#1E2338] text-[#8E95B8]">
                          GRAVITY WELL: <strong className="text-purple-300">×{collision.gravityConstant?.toFixed(2) || physics.gravityConstant.toFixed(2)} G₀</strong>
                        </span>
                        <span className="text-[10px] text-[#555C7E] flex items-center gap-1 ml-auto">
                          <Clock className="w-3 h-3" />
                          {new Date(collision.timestamp).toLocaleDateString()} {new Date(collision.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Chips / Themes Pills */}
                      {isSonic && collision.chips && collision.chips.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] font-mono text-[#6A7196]">Particles:</span>
                          {collision.chips.map(chip => (
                            <span
                              key={chip.id}
                              className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#141829] border border-[#242A44] text-[#C4C9E4]"
                              style={{ borderLeftColor: chip.color, borderLeftWidth: '3px' }}
                            >
                              {chip.label}
                            </span>
                          ))}
                        </div>
                      )}

                      {!isSonic && (collision.themeA || collision.themeB) && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] font-mono text-[#C4C9E4]">
                          {collision.themeA && (
                            <span className="px-2 py-0.5 rounded bg-purple-950/60 border border-purple-700/40 text-purple-300">
                              A: {collision.themeA}
                            </span>
                          )}
                          {collision.themeB && (
                            <span className="px-2 py-0.5 rounded bg-pink-950/60 border border-pink-700/40 text-pink-300">
                              B: {collision.themeB}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Notes excerpt */}
                      {collision.notes && (
                        <p className="text-[11px] font-mono text-[#7D84A6] italic line-clamp-1 pt-0.5">
                          "{collision.notes}"
                        </p>
                      )}
                    </div>

                    {/* Right: Quick Action Buttons */}
                    <div className="flex md:flex-col items-center justify-end gap-2 flex-shrink-0 pt-2 md:pt-0">
                      {/* Restore Button */}
                      <button
                        onClick={() => {
                          onRestoreCollision(collision);
                          onClose();
                        }}
                        className={`w-full px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 text-white ${
                          isSonic
                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                            : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                        }`}
                        title="Restore this collision into the particle accelerator"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore Collision</span>
                      </button>

                      <div className="flex items-center gap-1.5 w-full">
                        {/* Copy Spec Button */}
                        <button
                          onClick={() => handleCopySpec(collision)}
                          className="flex-1 px-2.5 py-1 rounded-lg bg-[#141829] hover:bg-[#1E243E] border border-[#242A44] text-[11px] font-mono text-[#8E95B8] hover:text-white flex items-center justify-center gap-1 transition-colors"
                          title="Copy collision specifications"
                        >
                          {copiedId === collision.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedId === collision.id ? 'Copied' : 'Copy'}</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => onDeleteCollision(collision.id)}
                          className="p-1.5 rounded-lg bg-[#141829] hover:bg-red-950/60 border border-[#242A44] hover:border-red-500/40 text-[#7D84A6] hover:text-red-400 transition-colors"
                          title="Delete saved collision"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#1C2136] bg-[#0E1220] flex items-center justify-between text-[11px] font-mono text-[#6A7196]">
          <span>
            Tip: Restoring a collision instantly updates the <strong>Collision Energy</strong> slider and live D3 physics.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#141829] hover:bg-[#1E233B] text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
