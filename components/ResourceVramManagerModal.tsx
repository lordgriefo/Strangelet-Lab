import React, { useState } from 'react';
import { 
  X, 
  Cpu, 
  Zap, 
  HardDrive, 
  Layers, 
  Power, 
  Trash2, 
  Check, 
  ShieldCheck, 
  ArrowRight, 
  Activity, 
  Sliders, 
  Sparkles,
  Download,
  Info,
  BookOpen
} from 'lucide-react';
import { 
  HARDWARE_TIERS, 
  HardwareTierId, 
  ResourceManagerState, 
  getStoredResourceState, 
  saveStoredResourceState,
  calculateCurrentVramMetrics,
  purgeStandbyVram,
  setComponentPowerState,
  setHardwareTier,
  ComponentPowerState
} from '../services/hardwareResourceManager';
import { getStoredBuddySoul, exportBuddySoulJson } from '../services/buddyEvolutionCore';
import { playColliderInjectionSound, playLaserBeamSound } from '../lib/laserSound';

interface ResourceVramManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSoftwareDojo?: () => void;
  onOpenAiHub?: () => void;
}

export const ResourceVramManagerModal: React.FC<ResourceVramManagerModalProps> = ({
  isOpen,
  onClose,
  onOpenSoftwareDojo,
  onOpenAiHub
}) => {
  if (!isOpen) return null;

  const [state, setState] = useState<ResourceManagerState>(getStoredResourceState);
  const [purgedNotice, setPurgedNotice] = useState<boolean>(false);
  const buddySoul = getStoredBuddySoul();

  const metrics = calculateCurrentVramMetrics(state);
  const currentTier = HARDWARE_TIERS[state.activeTier];

  const handleSelectTier = (tierId: HardwareTierId) => {
    playLaserBeamSound('laser_select');
    const updated = setHardwareTier(tierId);
    setState(updated);
  };

  const handleToggleComponentState = (componentId: string, newState: ComponentPowerState) => {
    playLaserBeamSound('laser_curve');
    const updated = setComponentPowerState(componentId, newState);
    setState(updated);
  };

  const handlePurgeVram = () => {
    playColliderInjectionSound();
    const updated = purgeStandbyVram();
    setState(updated);
    setPurgedNotice(true);
    setTimeout(() => setPurgedNotice(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[9996] flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in font-mono select-none">
      <div 
        className="w-full max-w-4xl rounded-2xl bg-[#090C16] border border-[#232A44] shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1E253D] bg-gradient-to-r from-[#0F1426] via-[#12182D] to-[#0A0D1A] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 via-cyan-500/20 to-emerald-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-wider uppercase text-white">
                  MODULAR HARDWARE &amp; VRAM MANAGER
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300 font-bold">
                  {currentTier.name}
                </span>
              </div>
              <p className="text-xs text-[#8288AA]">
                Switch models &amp; toggle heavy audio engines ON/OFF to free memory. Evolving Buddy Soul persists across all hardware upgrades!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePurgeVram}
              className="px-3 py-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/60 border border-red-500/40 text-red-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(239,68,68,0.2)] active:scale-95"
              title="Purge standby models and empty GPU cache immediately"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{purgedNotice ? 'VRAM Purged!' : 'Purge Free VRAM'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#7E85A8] hover:text-white hover:bg-[#1E233B] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">

          {/* VRAM Live Usage Gauge Bar */}
          <div className="p-4 rounded-xl bg-[#0F1322] border border-[#232B45] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#FFD700]" />
                <span className="font-bold text-white uppercase tracking-wider">
                  VRAM ALLOCATION METRICS
                </span>
                <span className="text-[10px] text-[#8E95B8]">
                  ({currentTier.targetHardware})
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-amber-400">
                  {metrics.vramUsedGb.toFixed(2)} GB Used
                </span>
                <span className="text-[#555]">/</span>
                <span className="text-xs text-[#8E95B8]">
                  {metrics.vramTotalGb.toFixed(1)} GB Total
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold">
                  {metrics.vramFreeGb.toFixed(2)} GB Free Headroom
                </span>
              </div>
            </div>

            {/* Segmented Meter Bar */}
            <div className="w-full h-3 bg-[#161B2E] rounded-full overflow-hidden flex border border-[#2B3555] p-0.5">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  metrics.isCritical ? 'bg-red-500 shadow-[0_0_12px_#EF4444]' :
                  metrics.isWarning ? 'bg-amber-400 shadow-[0_0_12px_#F59E0B]' :
                  'bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                }`}
                style={{ width: `${metrics.usagePercent}%` }}
              />
            </div>

            {/* Micro Breakdown Tags */}
            <div className="flex flex-wrap gap-2 pt-1 text-[10px]">
              {metrics.breakdown.map(item => (
                <div 
                  key={item.id}
                  className={`px-2 py-1 rounded flex items-center gap-1.5 border ${
                    item.state === 'active' 
                      ? 'bg-[#182038] border-cyan-500/40 text-cyan-300'
                      : item.state === 'standby'
                      ? 'bg-[#141829] border-[#2A3452] text-[#8E95B8]'
                      : 'bg-[#0E111C] border-[#1C2235] text-[#555]'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    item.state === 'active' ? 'bg-emerald-400' :
                    item.state === 'standby' ? 'bg-amber-400' : 'bg-gray-600'
                  }`} />
                  <span className="font-medium">{item.name}:</span>
                  <span className="font-bold">{item.usedGb.toFixed(2)} GB</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hardware Tier Scalability Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-[#CAD2EA] uppercase tracking-wider flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                Select Hardware VRAM Profile
              </label>
              <span className="text-[10px] text-[#7E85A8]">
                Currently tailored to your 6GB setup; ready for instant 16GB upgrade!
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(Object.keys(HARDWARE_TIERS) as HardwareTierId[]).map(tierKey => {
                const tier = HARDWARE_TIERS[tierKey];
                const isSelected = state.activeTier === tierKey;

                return (
                  <div
                    key={tier.id}
                    onClick={() => handleSelectTier(tier.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#131B32] border-amber-500/80 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                        : 'bg-[#0C0F1D] border-[#1E253D] hover:border-[#2F3B60] opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-white tracking-wide">
                          {tier.totalVramGb} GB VRAM
                        </span>
                        {isSelected && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-semibold text-[#CAD2EA] mb-1">
                        {tier.name.split('(')[1]?.replace(')', '') || tier.name}
                      </div>
                      <p className="text-[10px] text-[#7E85A8] leading-relaxed mb-2">
                        {tier.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#1C2338] text-[9px] space-y-1">
                      <div className="text-[#8E95B8]">
                        Rec: <span className="text-white font-bold">{tier.recommendedLlmQuant}</span>
                      </div>
                      <div className="text-[#8E95B8]">
                        Stems: <span className="text-cyan-300">{tier.defaultStemEngine === 'mobile_onnx' ? 'Fast ONNX' : 'HTDemucs FP16'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modular Component Power Switches */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-[#CAD2EA] uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                Modular Component Power Matrix (Toggle ON/OFF to free resources)
              </label>
              <span className="text-[10px] text-[#7E85A8]">
                Changes take effect instantly without restarting session
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.values(state.components).map(comp => (
                <div 
                  key={comp.id}
                  className="p-3.5 rounded-xl bg-[#0D101E] border border-[#1F2740] flex flex-col justify-between hover:border-[#2C385C] transition-all"
                >
                  <div className="mb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{comp.name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#182035] text-cyan-300 border border-[#2A375B]">
                          {comp.category}
                        </span>
                      </div>
                      <span className="text-[10px] text-amber-300 font-bold">
                        ~{comp.vramActiveGb} GB
                      </span>
                    </div>
                    <p className="text-[10px] text-[#7E85A8] mt-1">
                      {comp.description}
                    </p>
                    <div className="text-[9px] text-[#5A6384] mt-0.5 italic">
                      {comp.notes}
                    </div>
                  </div>

                  {/* Tri-State Control Buttons */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-[#1A2136]">
                    <button
                      type="button"
                      onClick={() => handleToggleComponentState(comp.id, 'active')}
                      className={`flex-1 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                        comp.powerState === 'active'
                          ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                          : 'bg-[#151B2E] text-[#7E85A8] hover:text-white'
                      }`}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleComponentState(comp.id, 'standby')}
                      className={`flex-1 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                        comp.powerState === 'standby'
                          ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                          : 'bg-[#151B2E] text-[#7E85A8] hover:text-white'
                      }`}
                      title="Load on demand only during execution"
                    >
                      Standby
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleComponentState(comp.id, 'unloaded')}
                      className={`flex-1 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                        comp.powerState === 'unloaded'
                          ? 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                          : 'bg-[#151B2E] text-[#7E85A8] hover:text-white'
                      }`}
                      title="Unload completely from VRAM to maximize memory for other tasks"
                    >
                      Unloaded
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Helper Buddy Soul Preservation Across Model Swaps Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#17152A] via-[#1A1A36] to-[#121A30] border border-purple-500/40 space-y-2 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-300 animate-pulse" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  HELPER BUDDY SOUL PRESERVATION &amp; EVOLUTION CORE
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 border border-purple-500/50 text-purple-200 font-bold">
                  Level {buddySoul.level}: {buddySoul.levelTitle}
                </span>
              </div>

              <button
                type="button"
                onClick={exportBuddySoulJson}
                className="px-2.5 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-[10px] font-bold flex items-center gap-1.5 transition-colors"
                title="Download the Helper Buddy's persistent memories, XP, and personality state"
              >
                <Download className="w-3 h-3" />
                <span>Export Buddy Soul (.json)</span>
              </button>
            </div>

            <p className="text-[11px] text-[#A5B4FC] leading-relaxed">
              When you swap models in Kobold.cpp, Ollama, or LM Studio (e.g. from an ultralight 3B GGUF on your 6GB laptop to a 14B Qwen on your upcoming 16GB rig), <strong>the Strangelet Guru never forgets you.</strong> His eccentric personality, Faust DSP expertise, 12 legendary studio tales, and evolving session memories are injected continuously regardless of the raw model engine underneath!
            </p>

            <div className="flex items-center gap-3 pt-1 text-[10px] text-[#8E95B8]">
              <span>Lab XP: <strong className="text-purple-300">{buddySoul.experienceXp}</strong></span>
              <span>•</span>
              <span>Mix Steps Advised: <strong className="text-white">{buddySoul.mixStepsAdvised}</strong></span>
              <span>•</span>
              <span>Faust Scripts Compiled: <strong className="text-white">{buddySoul.faustToysCompiled}</strong></span>
              <span>•</span>
              <span>Studio Tales Unlocked: <strong className="text-white">{buddySoul.studioTalesShared}</strong></span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#1E253D] bg-[#0A0D18] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#8E95B8]">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>6GB Rig Mode: Stems &amp; Ace-Step set to auto-scavenge when inactive.</span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenSoftwareDojo && (
              <button
                type="button"
                onClick={() => { onClose(); onOpenSoftwareDojo(); }}
                className="px-3 py-1.5 rounded-lg bg-[#141A2E] hover:bg-[#1E2745] text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Open Software Dojo</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-[#FFD700] hover:bg-[#FFE55C] text-black font-bold text-xs transition-colors"
            >
              Done &amp; Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
