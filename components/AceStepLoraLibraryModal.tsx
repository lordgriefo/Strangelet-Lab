import React, { useState, useEffect } from 'react';
import { 
  X, 
  Layers, 
  Sparkles, 
  Sliders, 
  Check, 
  Plus, 
  Share2, 
  Trash2, 
  Search, 
  FileAudio, 
  Activity, 
  HardDrive,
  Cpu,
  Flame,
  Info
} from 'lucide-react';
import { AceStepLora } from '../types';
import { 
  getStoredAceStepLoras, 
  saveStoredAceStepLoras, 
  toggleLoraActive, 
  updateLoraWeight, 
  addCustomLora,
  injectActiveLorasIntoPrompt
} from '../services/aceStepLoraLibrary';
import { playLaserBeamSound, playColliderInjectionSound } from '../lib/laserSound';

interface AceStepLoraLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrompt?: string;
  onApplyPromptWithLoras?: (updatedPrompt: string) => void;
}

export const AceStepLoraLibraryModal: React.FC<AceStepLoraLibraryModalProps> = ({
  isOpen,
  onClose,
  currentPrompt = '',
  onApplyPromptWithLoras
}) => {
  const [loras, setLoras] = useState<AceStepLora[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showUploadForm, setShowUploadForm] = useState<boolean>(false);

  // New LoRA Form
  const [newName, setNewName] = useState('');
  const [newTrigger, setNewTrigger] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newGenre, setNewGenre] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSonic, setNewSonic] = useState('');
  const [newWeight, setNewWeight] = useState(0.85);

  useEffect(() => {
    if (isOpen) {
      setLoras(getStoredAceStepLoras());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeLoras = loras.filter(l => l.active);
  const activePromptData = injectActiveLorasIntoPrompt(currentPrompt);

  const handleToggle = (id: string) => {
    playLaserBeamSound('laser_select');
    const updated = toggleLoraActive(id);
    setLoras(updated);
  };

  const handleWeightChange = (id: string, weight: number) => {
    const updated = updateLoraWeight(id, weight);
    setLoras(updated);
  };

  const handleCreateCustomLora = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newTrigger.trim()) return;

    addCustomLora({
      name: newName.trim(),
      triggerWord: newTrigger.trim().toLowerCase().replace(/[^a-z0-9_-]/g, ''),
      author: newAuthor.trim() || 'Local Producer',
      genre: newGenre.trim() || 'Custom',
      description: newDesc.trim() || 'User uploaded diffusion sonic adapter',
      recommendedWeight: newWeight,
      active: true,
      currentWeight: newWeight,
      fileSizeMb: 110.0,
      tags: [newGenre.trim() || 'Custom', 'LoRA', 'Community'],
      sonicCharacter: newSonic.trim() || 'Custom sonic texture and timbre profile'
    });

    setLoras(getStoredAceStepLoras());
    setShowUploadForm(false);
    playColliderInjectionSound();

    // Reset Form
    setNewName('');
    setNewTrigger('');
    setNewAuthor('');
    setNewGenre('');
    setNewDesc('');
    setNewSonic('');
  };

  const handleApplyToPrompt = () => {
    playColliderInjectionSound();
    if (onApplyPromptWithLoras) {
      onApplyPromptWithLoras(activePromptData.prompt);
    }
    onClose();
  };

  const filtered = loras.filter(l => 
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.genre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.triggerWord.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 font-mono">
      <div className="bg-[#0A0D17] border border-[#2B1B38] w-full max-w-5xl h-[88vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden shadow-pink-950/40">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#241733] bg-gradient-to-r from-[#1B0F2B] to-[#0D0B18]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-600 via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/25">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Ace-Step 1.5 — LoRA Lending Library
                </h2>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-pink-950 text-pink-300 border border-pink-800">
                  DIFFUSION ADAPTERS
                </span>
              </div>
              <p className="text-xs text-[#8E7E9E]">
                Borrow and stack boutique neural diffusion LoRAs to radically morph genre, tape texture, and aliasing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUploadForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-pink-950/40"
            >
              <Share2 size={13} />
              <span>Lend / Share My LoRA</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#7E8B9B] hover:text-white hover:bg-[#1A233A] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Active LoRA Stacking Status Bar */}
        <div className="px-6 py-3 border-b border-[#211730] bg-[#0E0B1A] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-pink-300 uppercase tracking-wider">
              Active LoRA Stack ({activeLoras.length} / 3 Max):
            </span>
            {activeLoras.length === 0 ? (
              <span className="text-[11px] text-[#716982] italic">
                None active (Default Ace-Step 1.5 latent model)
              </span>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                {activeLoras.map(al => (
                  <span key={al.id} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-950/80 text-pink-300 border border-pink-800 text-[10px] font-bold">
                    <span>{al.name}</span>
                    <span className="text-[#A792BC]">({al.currentWeight.toFixed(2)}x)</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeLoras.length > 0 && onApplyPromptWithLoras && (
              <button
                onClick={handleApplyToPrompt}
                className="px-3 py-1 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-bold transition-all flex items-center gap-1 shadow-md shadow-pink-900/40 active:scale-95"
              >
                <Check size={13} />
                <span>Inject Triggers into Ace-Step Prompt</span>
              </button>
            )}

            <div className="relative w-52">
              <Search size={13} className="absolute left-2.5 top-2.5 text-[#6B5E7D]" />
              <input
                type="text"
                placeholder="Search LoRAs..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#161026] border border-[#2B1F40] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#6B5E7D] focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>
        </div>

        {/* LoRA Cards Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#090712]">
          {filtered.map(lora => (
            <div
              key={lora.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 shadow-md ${
                lora.active
                  ? 'bg-[#180E28] border-pink-500/60 shadow-pink-950/30'
                  : 'bg-[#100B1E] border-[#251A38] hover:border-[#3D2C59]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-pink-950/80 text-pink-300 border border-pink-800">
                        {lora.genre}
                      </span>
                      <span className="text-[10px] font-mono text-[#8C7A9E]">
                        &lt;lora:{lora.triggerWord}&gt;
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white">
                      {lora.name}
                    </h3>
                  </div>

                  {/* Toggle Active Borrow Button */}
                  <button
                    onClick={() => handleToggle(lora.id)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                      lora.active
                        ? 'bg-pink-600 border-pink-400 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]'
                        : 'bg-[#18102B] border-[#2C1F45] text-[#8F7EAA] hover:text-white hover:border-pink-400'
                    }`}
                  >
                    <Check size={13} className={lora.active ? 'opacity-100' : 'opacity-30'} />
                    <span>{lora.active ? 'Borrowing (Active)' : 'Borrow LoRA'}</span>
                  </button>
                </div>

                <p className="text-xs text-[#9E8FAF] leading-relaxed mb-3">
                  {lora.description}
                </p>

                {/* Sonic Character Callout */}
                <div className="p-2.5 rounded-xl bg-[#140C24] border border-[#281A42] text-[11px] text-pink-200/90 mb-3 flex items-start gap-2">
                  <Flame size={14} className="text-pink-400 flex-shrink-0 mt-0.5" />
                  <span><strong>Sonic Timbre:</strong> {lora.sonicCharacter}</span>
                </div>

                {/* Weight Slider (Active or preview) */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#89799E] font-bold">
                      Diffusion Guidance Weight:
                    </span>
                    <span className="font-mono text-pink-300 font-bold">
                      {lora.currentWeight.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.5"
                    step="0.05"
                    value={lora.currentWeight}
                    onChange={e => handleWeightChange(lora.id, parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-[#23173B] rounded-lg appearance-none cursor-pointer accent-pink-500"
                  />
                  <div className="flex justify-between text-[9px] text-[#695D7D]">
                    <span>0.10x (Subtle tint)</span>
                    <span>Rec: {lora.recommendedWeight.toFixed(2)}x</span>
                    <span>1.50x (Heavy mutation)</span>
                  </div>
                </div>
              </div>

              {/* Footer Meta */}
              <div className="pt-3 border-t border-[#23173B] flex items-center justify-between text-[10px] text-[#7E6F92]">
                <div className="flex items-center gap-2">
                  <span>Author: {lora.author}</span>
                  <span>•</span>
                  <span>{lora.fileSizeMb} MB</span>
                </div>
                <div className="flex items-center gap-1">
                  {lora.tags.slice(0, 3).map((t, idx) => (
                    <span key={idx} className="px-1.5 py-0.5 rounded bg-[#180E2B] text-[#9A89AF]">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Upload Custom LoRA Drawer */}
        {showUploadForm && (
          <div className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#120B22] border border-[#301F48] w-full max-w-xl rounded-2xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#2A1B3F] pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Share2 size={16} className="text-pink-400" />
                  <span>Lend / Share My Custom LoRA Adapter</span>
                </h3>
                <button
                  onClick={() => setShowUploadForm(false)}
                  className="p-1 text-[#78698C] hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateCustomLora} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-[#A898BC] mb-1">
                    LoRA Model Name:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shoegaze Heavy Wall-of-Fuzz"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="w-full bg-[#1A102E] border border-[#301F48] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#A898BC] mb-1">
                      Trigger Keyword:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="shoegaze-fuzz-wall"
                      value={newTrigger}
                      onChange={e => setNewTrigger(e.target.value)}
                      className="w-full bg-[#1A102E] border border-[#301F48] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#A898BC] mb-1">
                      Genre / Category:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Shoegaze / Alt-Rock"
                      value={newGenre}
                      onChange={e => setNewGenre(e.target.value)}
                      className="w-full bg-[#1A102E] border border-[#301F48] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#A898BC] mb-1">
                    Author / Creator Name:
                  </label>
                  <input
                    type="text"
                    placeholder="Your Handle"
                    value={newAuthor}
                    onChange={e => setNewAuthor(e.target.value)}
                    className="w-full bg-[#1A102E] border border-[#301F48] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#A898BC] mb-1">
                    Sonic Timbre & Audio Characteristics:
                  </label>
                  <input
                    type="text"
                    placeholder="Massive blown-out fuzz, reverse reverb wash, dense mid-range sustain..."
                    value={newSonic}
                    onChange={e => setNewSonic(e.target.value)}
                    className="w-full bg-[#1A102E] border border-[#301F48] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#A898BC] mb-1">
                    Model Description:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Trained on 4-track cassette recordings of vintage Big Muff pedals and Jazzmaster feedback..."
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    className="w-full bg-[#1A102E] border border-[#301F48] rounded-lg p-2.5 text-white focus:outline-none focus:border-pink-400"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowUploadForm(false)}
                    className="px-3 py-1.5 rounded-lg text-[#8A799E] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-bold transition-all shadow-md shadow-pink-900/40"
                  >
                    Publish to Lending Library
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
