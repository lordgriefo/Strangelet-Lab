import React, { useState } from 'react';
import { 
  Zap, 
  Feather, 
  X, 
  Save, 
  Sparkles, 
  Gauge, 
  Activity, 
  Tag, 
  Layers, 
  FileText,
  Check
} from 'lucide-react';
import { SavedCollision, ColliderChip, PromptOutputResult, LyricLabOutput } from '../../types';
import { calculatePhysicsConstants } from '../../lib/collisionPhysics';
import { playLaserBeamSound, playColliderInjectionSound } from '../../lib/laserSound';

interface SaveCollisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (collision: SavedCollision) => void;
  mode: 'sonic' | 'lyrics';
  collisionEnergy: number;
  category: string;
  presetId?: string;
  presetName?: string;
  chips?: ColliderChip[];
  themeA?: string;
  themeB?: string;
  promptResult?: PromptOutputResult | null;
  lyricResult?: LyricLabOutput | null;
}

export const SaveCollisionModal: React.FC<SaveCollisionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  mode,
  collisionEnergy,
  category,
  presetId,
  presetName,
  chips = [],
  themeA,
  themeB,
  promptResult,
  lyricResult
}) => {
  if (!isOpen) return null;

  const physics = calculatePhysicsConstants(collisionEnergy);

  // Auto-generate title
  const defaultTitle = presetName 
    ? `${presetName} Collision [${collisionEnergy.toFixed(1)} TeV]`
    : mode === 'sonic'
      ? `${category} Particle Collision [${collisionEnergy.toFixed(1)} TeV]`
      : `${themeA ? themeA.slice(0, 24) + '...' : category} [${collisionEnergy.toFixed(1)} TeV]`;

  const [name, setName] = useState<string>(defaultTitle);
  const [notes, setNotes] = useState<string>('');
  const [tagsInput, setTagsInput] = useState<string>(
    [
      mode === 'sonic' ? 'sonic-sector' : 'lyric-lab',
      `${collisionEnergy.toFixed(1)}tev`,
      category.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    ].join(', ')
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedTags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const newCollision: SavedCollision = {
      id: `collision-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      timestamp: Date.now(),
      mode,
      collisionEnergy,
      massConstant: physics.massConstant,
      velocityConstant: physics.velocityConstant,
      gravityConstant: physics.gravityConstant,
      category,
      presetId,
      presetName,
      chips: mode === 'sonic' ? chips : undefined,
      themeA: mode === 'lyrics' ? themeA : undefined,
      themeB: mode === 'lyrics' ? themeB : undefined,
      promptResult: promptResult || undefined,
      lyricResult: lyricResult || undefined,
      tags: parsedTags,
      notes: notes.trim() || undefined,
      starred: true
    };

    onSave(newCollision);
    playColliderInjectionSound();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-xl rounded-2xl bg-[#0D101C] border border-[#2A3152] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          mode === 'sonic'
            ? 'border-cyan-900/50 bg-gradient-to-r from-cyan-950/60 via-[#101424] to-[#0D101C]'
            : 'border-purple-900/50 bg-gradient-to-r from-purple-950/60 via-[#101424] to-[#0D101C]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-md ${
              mode === 'sonic'
                ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'bg-purple-500/20 border-purple-400/40 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
            }`}>
              <Save className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-wider uppercase text-white">
                  SAVE COLLISION SNAPSHOT
                </h2>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
                  mode === 'sonic'
                    ? 'bg-cyan-950/70 border-cyan-600/40 text-cyan-300'
                    : 'bg-purple-950/70 border-purple-600/40 text-purple-300'
                }`}>
                  {mode === 'sonic' ? 'Sonic Sector' : 'Lyric Lab'}
                </span>
              </div>
              <p className="text-xs text-[#8E94B8]">
                Freeze particle mass, velocity, gravity, and chamber configuration for instant recall.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7E85A8] hover:text-white hover:bg-[#1E233B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs font-mono">
          {/* Physics Telemetry Snapshot Card */}
          <div className="p-3.5 rounded-xl bg-[#121626] border border-[#242A46] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider text-[#A2A9D0] uppercase flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                Active Quantum Physics Matrix
              </span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                mode === 'sonic'
                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                  : 'bg-purple-950/80 text-purple-300 border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
              }`}>
                ⚡ {collisionEnergy.toFixed(1)} TeV Energy
              </span>
            </div>

            {/* Constants Grid */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
              <div className="p-2 rounded-lg bg-[#0A0D18] border border-[#1E243A]">
                <div className="text-[#6C7399] text-[10px]">MASS CONSTANT</div>
                <div className="text-amber-300 font-bold text-xs mt-0.5">
                  ×{physics.massConstant.toFixed(2)} m₀
                </div>
                <div className="text-[9px] text-[#555C7E]">Particle inertia & size</div>
              </div>

              <div className="p-2 rounded-lg bg-[#0A0D18] border border-[#1E243A]">
                <div className="text-[#6C7399] text-[10px]">VELOCITY CONSTANT</div>
                <div className="text-cyan-300 font-bold text-xs mt-0.5">
                  ×{physics.velocityConstant.toFixed(2)} c
                </div>
                <div className="text-[9px] text-[#555C7E]">Orbital synchrotron speed</div>
              </div>

              <div className="p-2 rounded-lg bg-[#0A0D18] border border-[#1E243A]">
                <div className="text-[#6C7399] text-[10px]">GRAVITY CONSTANT</div>
                <div className="text-purple-300 font-bold text-xs mt-0.5">
                  ×{physics.gravityConstant.toFixed(2)} G₀
                </div>
                <div className="text-[9px] text-[#555C7E]">Core curvature pull</div>
              </div>
            </div>

            {/* Chamber Contents Preview */}
            <div className="pt-1 text-[11px] text-[#868EA8] flex items-center justify-between border-t border-[#1C2237]">
              <span>Category: <strong className="text-white">{category}</strong></span>
              <span>
                {mode === 'sonic' 
                  ? `${chips.length} Chips in Chamber` 
                  : 'Harmonic Concept Vectors'}
              </span>
            </div>
          </div>

          {/* Collision Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#A2A9D0] uppercase tracking-wider">
              Collision Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Darkwave Post-Punk Singularity [11.8 TeV]"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#141829] border border-[#282F4E] text-white text-xs font-mono focus:outline-none focus:border-cyan-400 transition-colors shadow-inner"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#A2A9D0] uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-amber-400" />
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="e.g. darkwave, heavy-sub, 11.4tev"
              className="w-full px-3.5 py-2 rounded-xl bg-[#141829] border border-[#282F4E] text-white text-xs font-mono focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          {/* Notes / Log */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#A2A9D0] uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3 h-3 text-cyan-400" />
              Collision Notes / Lab Log (optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Describe the sonic nuance, vibe, or intended Suno/Udio generation aesthetic..."
              className="w-full px-3.5 py-2 rounded-xl bg-[#141829] border border-[#282F4E] text-white text-xs font-mono focus:outline-none focus:border-cyan-400 transition-colors resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-[#20263D] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono text-[#8E94B8] hover:text-white hover:bg-[#181C30] border border-transparent transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              className={`px-5 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all text-white ${
                mode === 'sonic'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-[0_0_20px_rgba(168,85,247,0.4)]'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>Confirm & Save Collision</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
