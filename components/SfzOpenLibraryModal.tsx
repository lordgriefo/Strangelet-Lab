import React, { useState, useEffect } from 'react';
import { 
  X, 
  Layers, 
  Volume2, 
  Download, 
  Plus, 
  Share2, 
  Check, 
  Music, 
  Sparkles, 
  Trash2, 
  Play, 
  Search, 
  Filter,
  FileCode,
  HardDrive,
  User,
  Radio,
  ExternalLink
} from 'lucide-react';
import { SfzLibraryInstrument } from '../types';
import { 
  getStoredSfzLibrary, 
  saveStoredSfzLibrary, 
  addCustomSfzInstrument, 
  deleteSfzInstrument, 
  playSfzInstrumentAudition, 
  downloadSfzFile 
} from '../services/sfzOpenLibrary';
import { playLaserBeamSound, playColliderInjectionSound } from '../lib/laserSound';

interface SfzOpenLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadInstrumentToTrack?: (instrument: SfzLibraryInstrument) => void;
  onOpenSfzBuilder?: () => void;
}

export const SfzOpenLibraryModal: React.FC<SfzOpenLibraryModalProps> = ({
  isOpen,
  onClose,
  onLoadInstrumentToTrack,
  onOpenSfzBuilder
}) => {
  const [instruments, setInstruments] = useState<SfzLibraryInstrument[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [auditioningId, setAuditioningId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  // New instrument form state
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<SfzLibraryInstrument['category']>('keys');
  const [newAuthor, setNewAuthor] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newSfzText, setNewSfzText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setInstruments(getStoredSfzLibrary());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All Instruments' },
    { id: 'keys', label: 'Keys & Pianos' },
    { id: 'synths', label: 'Analog Synths' },
    { id: 'strings', label: 'Orchestral Strings' },
    { id: 'bass', label: 'Bass & Sub' },
    { id: 'guitars', label: 'Guitars' },
    { id: 'drums', label: 'Drums & Percussion' },
    { id: 'experimental', label: 'Glitch & Cut-Up' }
  ];

  const filtered = instruments.filter(inst => {
    const matchesCat = selectedCategory === 'all' || inst.category === selectedCategory;
    const matchesSearch = inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const handleAudition = (inst: SfzLibraryInstrument) => {
    playLaserBeamSound('laser_select');
    setAuditioningId(inst.id);
    playSfzInstrumentAudition(inst.previewSynthType);
    setTimeout(() => {
      setAuditioningId(null);
    }, 1500);
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newSfzText.trim()) return;

    const created = addCustomSfzInstrument({
      name: newName.trim(),
      category: newCategory,
      author: newAuthor.trim() || 'Local Producer',
      description: newDesc.trim() || 'Custom community multisample instrument map',
      sampleCount: 16,
      velocityLayers: 4,
      fileSizeMb: 42.0,
      tags: newTags.split(',').map(t => t.trim()).filter(Boolean),
      previewSynthType: newCategory === 'bass' ? 'bass' : (newCategory === 'synths' ? 'pad' : 'keys'),
      sfzDefinition: newSfzText.trim()
    });

    setInstruments(getStoredSfzLibrary());
    setShowShareModal(false);
    playColliderInjectionSound();
    // Reset form
    setNewName('');
    setNewAuthor('');
    setNewDesc('');
    setNewTags('');
    setNewSfzText('');
  };

  const handleDelete = (id: string) => {
    deleteSfzInstrument(id);
    setInstruments(getStoredSfzLibrary());
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 font-mono">
      <div className="bg-[#0A0D17] border border-[#212B45] w-full max-w-5xl h-[88vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden shadow-cyan-950/40">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A2238] bg-gradient-to-r from-[#0E1528] to-[#0A0D17]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25">
              <Music size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  SFZ Open Library & Community Sample Exchange
                </h2>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  OPEN FORMAT
                </span>
              </div>
              <p className="text-xs text-[#7E8B9B]">
                Open-source sample maps, multi-velocity instruments, and community sample sharing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://sfzinstruments.github.io/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold transition-all shadow-md shadow-emerald-950/40"
              title="Explore 200+ free open-source SFZ instruments at sfzinstruments.github.io"
            >
              <ExternalLink size={13} />
              <span className="hidden sm:inline">sfzinstruments.github.io</span>
              <span className="sm:hidden">SFZ Hub</span>
            </a>

            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-950/40"
            >
              <Share2 size={13} />
              <span>Share My Sample / SFZ</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#7E8B9B] hover:text-white hover:bg-[#1A233A] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search & Categories Bar */}
        <div className="px-6 py-3 border-b border-[#1A2238] bg-[#080B14] flex flex-wrap items-center justify-between gap-3">
          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex-shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 shadow-sm'
                    : 'text-[#7A86A1] hover:text-white hover:bg-[#121729]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-64">
            <Search size={14} className="absolute left-2.5 top-2.5 text-[#5A6680]" />
            <input
              type="text"
              placeholder="Search library..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#12172A] border border-[#212A45] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#5A6680] focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Instruments Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#090C16]">
          {filtered.map(inst => (
            <div
              key={inst.id}
              className="p-5 rounded-2xl bg-[#0E1324] border border-[#1F273E] hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-4 group shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                        {inst.category}
                      </span>
                      {inst.isCommunityShared && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800">
                          Community Upload
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {inst.name}
                    </h3>
                  </div>

                  {/* Audition Button */}
                  <button
                    onClick={() => handleAudition(inst)}
                    className={`p-2 rounded-xl border flex items-center justify-center transition-all ${
                      auditioningId === inst.id
                        ? 'bg-cyan-500 text-black border-cyan-400 animate-pulse shadow-[0_0_15px_rgba(6,182,212,0.6)]'
                        : 'bg-[#151C30] text-cyan-300 border-[#2A3657] hover:border-cyan-400 hover:bg-[#1E2744]'
                    }`}
                    title="Audition Instrument Audio Preview"
                  >
                    <Volume2 size={16} />
                  </button>
                </div>

                <p className="text-xs text-[#8B98B2] leading-relaxed mb-3">
                  {inst.description}
                </p>

                {/* Specs Pill Bar */}
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#7885A0]">
                  <span className="flex items-center gap-1 bg-[#12182B] px-2 py-0.5 rounded border border-[#1F2942]">
                    <Layers size={11} />
                    <span>{inst.velocityLayers} Velocity Layers</span>
                  </span>
                  <span className="flex items-center gap-1 bg-[#12182B] px-2 py-0.5 rounded border border-[#1F2942]">
                    <HardDrive size={11} />
                    <span>{inst.fileSizeMb} MB</span>
                  </span>
                  <span className="flex items-center gap-1 bg-[#12182B] px-2 py-0.5 rounded border border-[#1F2942]">
                    <User size={11} />
                    <span>{inst.author}</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#1B2338] flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {inst.tags.slice(0, 3).map((t, idx) => (
                    <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded bg-[#101526] text-[#717E9C]">
                      #{t}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadSfzFile(inst)}
                    className="p-1.5 rounded-lg text-[#7E8B9B] hover:text-white hover:bg-[#1A243B] transition-colors"
                    title="Download .sfz format definition"
                  >
                    <Download size={14} />
                  </button>

                  {inst.isCommunityShared && (
                    <button
                      onClick={() => handleDelete(inst.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-colors"
                      title="Delete custom shared instrument"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}

                  {onLoadInstrumentToTrack && (
                    <button
                      onClick={() => {
                        playColliderInjectionSound();
                        onLoadInstrumentToTrack(inst);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                    >
                      <Check size={13} />
                      <span>Load to Track</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Share Custom SFZ Modal Drawer */}
        {showShareModal && (
          <div className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#0E1324] border border-[#263252] w-full max-w-xl rounded-2xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#212A45] pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Share2 size={16} className="text-cyan-400" />
                  <span>Share / Publish Custom SFZ Instrument</span>
                </h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="p-1 text-[#7885A0] hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateCustom} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-[#A2ACC5] mb-1">
                    Instrument Name:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vintage 1968 Farfisa Compact Organ"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="w-full bg-[#151C30] border border-[#283556] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#A2ACC5] mb-1">
                      Category:
                    </label>
                    <select
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value as any)}
                      className="w-full bg-[#151C30] border border-[#283556] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option value="keys">Keys & Pianos</option>
                      <option value="synths">Analog Synths</option>
                      <option value="strings">Orchestral Strings</option>
                      <option value="bass">Bass & Sub</option>
                      <option value="guitars">Guitars</option>
                      <option value="drums">Drums & Percussion</option>
                      <option value="experimental">Glitch & Cut-Up</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#A2ACC5] mb-1">
                      Author / Creator:
                    </label>
                    <input
                      type="text"
                      placeholder="Your Producer Name"
                      value={newAuthor}
                      onChange={e => setNewAuthor(e.target.value)}
                      className="w-full bg-[#151C30] border border-[#283556] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#A2ACC5] mb-1">
                    Description & Sample Details:
                  </label>
                  <input
                    type="text"
                    placeholder="Microphone chain, vintage gear provenance, velocity range..."
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    className="w-full bg-[#151C30] border border-[#283556] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#A2ACC5] mb-1">
                    Tags (comma separated):
                  </label>
                  <input
                    type="text"
                    placeholder="organ, vintage, 60s, tape, combo"
                    value={newTags}
                    onChange={e => setNewTags(e.target.value)}
                    className="w-full bg-[#151C30] border border-[#283556] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#A2ACC5] mb-1">
                    SFZ Definition File Text:
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="<global>&#10;polyphony=32&#10;<group>&#10;<region> sample=sample.wav lokey=36 hikey=48 pitch_keycenter=36"
                    value={newSfzText}
                    onChange={e => setNewSfzText(e.target.value)}
                    className="w-full bg-[#151C30] border border-[#283556] rounded-lg p-2.5 font-mono text-[11px] text-cyan-200 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowShareModal(false)}
                    className="px-3 py-1.5 rounded-lg text-[#8895B2] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-md shadow-cyan-900/40"
                  >
                    Publish to SFZ Open Library
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
