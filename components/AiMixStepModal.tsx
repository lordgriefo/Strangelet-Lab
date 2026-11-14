import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Zap, 
  Sliders, 
  Layers, 
  Activity, 
  Check, 
  RotateCcw, 
  Flame, 
  Cpu, 
  Volume2, 
  Music,
  ArrowRight,
  ShieldCheck,
  Split
} from 'lucide-react';
import { Track, AiMixStep, AiMixStepType } from '../types';
import { runAiMixStep, getStoredKoboldSettings } from '../services/koboldCppService';
import { playColliderInjectionSound, playLaserBeamSound } from '../lib/laserSound';

interface AiMixStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: Track[];
  onApplyStepToTrack: (step: AiMixStep) => void;
  appliedSteps: AiMixStep[];
  onRevertStep?: (stepId: string) => void;
}

const STEP_TYPES: { type: AiMixStepType; label: string; desc: string; icon: any; color: string }[] = [
  {
    type: 'spectral_desheen',
    label: 'Spectral AI De-Sheen',
    desc: 'Notches digital harshness and brittle highs (7.5kHz - 11kHz) from AI generations',
    icon: Sparkles,
    color: '#00F0FF'
  },
  {
    type: 'harmonic_tape_saturation',
    label: 'Tape Saturation & Wow',
    desc: 'Warms transients with 2nd/3rd order analog tape bias and flutter',
    icon: Flame,
    color: '#F59E0B'
  },
  {
    type: 'dynamic_bus_balance',
    label: 'Sub-Mono & Bus Headroom',
    desc: 'Monofies bass below 100Hz and calculates headroom balance',
    icon: Volume2,
    color: '#10B981'
  },
  {
    type: 'particle_superposition',
    label: 'Large Collider Particle Infusion',
    desc: 'Injects micro-phase modulation and strangelet stereo air from the accelerator',
    icon: Zap,
    color: '#EC4899'
  },
  {
    type: 'lyrical_cadence',
    label: 'Vocal Presence & Cadence Fit',
    desc: 'Carves competing instrument mids to let vocals and spoken word cut through',
    icon: Music,
    color: '#A855F7'
  },
  {
    type: 'transient_reconstruction',
    label: 'Transient Punch & Snappiness',
    desc: 'Sharpens leading kick/snare attack envelopes for tight DAW timing',
    icon: Activity,
    color: '#38BDF8'
  }
];

export const AiMixStepModal: React.FC<AiMixStepModalProps> = ({
  isOpen,
  onClose,
  tracks,
  onApplyStepToTrack,
  appliedSteps,
  onRevertStep
}) => {
  const koboldSettings = getStoredKoboldSettings();
  const [selectedTrackId, setSelectedTrackId] = useState<string>(tracks[0]?.id || 'master');
  const [selectedStepType, setSelectedStepType] = useState<AiMixStepType>('spectral_desheen');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [generatedStep, setGeneratedStep] = useState<AiMixStep | null>(null);
  const [stepAppliedSuccess, setStepAppliedSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const selectedTrack = tracks.find(t => t.id === selectedTrackId);
  const targetName = selectedTrackId === 'master' ? 'Stereo Master Bus' : (selectedTrack?.name || 'Selected Track');

  const handleExecuteStep = async () => {
    setIsProcessing(true);
    playLaserBeamSound('laser_select');

    try {
      const step = await runAiMixStep(targetName, selectedStepType, {
        currentVolumeDb: selectedTrack ? Math.round((selectedTrack.volume - 1) * 12) : 0,
        currentPan: selectedTrack?.pan || 0,
        bpm: 120
      });
      step.targetTrackId = selectedTrackId;
      setGeneratedStep(step);
      playColliderInjectionSound();
    } catch (err) {
      console.error('Failed to execute AI mix step:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyToMix = () => {
    if (!generatedStep) return;
    onApplyStepToTrack(generatedStep);
    setStepAppliedSuccess(true);
    playColliderInjectionSound();
    setTimeout(() => {
      setStepAppliedSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-3xl rounded-2xl bg-[#090C16] border border-[#232A44] shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1E253D] bg-gradient-to-r from-[#0F1426] via-[#12182D] to-[#0A0D1A] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 via-purple-500/20 to-emerald-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-wider uppercase text-white font-mono">
                  INCORPORATE AI MIX STEP // [KOBOLDCPP PIPELINE]
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-600/40 text-emerald-300">
                  GHOST ENGINE
                </span>
              </div>
              <p className="text-xs text-[#8288AA]">
                Low-resource neural mix processing: harmonic de-sheen, tape bias, sub-mono, and dynamic air.
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto min-h-0 space-y-5 text-xs font-mono">
          {/* Target Track & Engine Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Target Track */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#A2A9D0] uppercase tracking-wider">
                Target Track / Bus
              </label>
              <select
                value={selectedTrackId}
                onChange={e => setSelectedTrackId(e.target.value)}
                className="w-full px-3 py-2 bg-[#121626] border border-[#262C46] rounded-xl text-white text-xs font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value="master">Stereo Master Bus (Global Glue)</option>
                {tracks.map(t => (
                  <option key={t.id} value={t.id}>
                    Track: {t.name} ({t.type.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {/* AI Engine Status */}
            <div className="p-2.5 rounded-xl bg-[#0D1120] border border-[#20273F] flex items-center justify-between">
              <div>
                <div className="text-[10px] text-[#6A7194] uppercase">Inference Engine</div>
                <div className="text-white font-bold text-xs flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{(koboldSettings.engine || 'koboldcpp').toUpperCase()} // GHOST DSP</span>
                </div>
              </div>
              <span className="text-[10px] px-2 py-1 rounded bg-[#161B2E] border border-[#262E4C] text-cyan-300">
                Low VRAM Mode
              </span>
            </div>
          </div>

          {/* Step Type Selection Grid */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-[#A2A9D0] uppercase tracking-wider flex items-center justify-between">
              <span>Select AI Mix Step Action</span>
              <span className="text-[#646B8E] text-[10px]">6 Neural Processors Available</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {STEP_TYPES.map(st => {
                const Icon = st.icon;
                const isSelected = selectedStepType === st.type;
                return (
                  <button
                    key={st.type}
                    onClick={() => {
                      setSelectedStepType(st.type);
                      playLaserBeamSound('laser_select');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-[#151C30] border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.25)] text-white'
                        : 'bg-[#0E1220] hover:bg-[#12172A] border-[#222944] text-[#8E95B8] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4" style={{ color: st.color }} />
                      <span className="font-bold text-xs text-white">{st.label}</span>
                    </div>
                    <p className="text-[10px] leading-relaxed text-[#757C9E]">
                      {st.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trigger Step Button */}
          <div className="pt-1">
            <button
              onClick={handleExecuteStep}
              disabled={isProcessing}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 text-white ${
                isProcessing
                  ? 'bg-gradient-to-r from-cyan-600 via-purple-600 to-emerald-600 animate-pulse'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
              }`}
            >
              <Zap className={`w-4 h-4 ${isProcessing ? 'animate-bounce' : ''}`} />
              <span>
                {isProcessing 
                  ? 'CALCULATING SURGICAL DSP VIA KOBOLDCPP...' 
                  : `GENERATE AI STEP FOR ${targetName.toUpperCase()}`}
              </span>
            </button>
          </div>

          {/* Generated Result Card */}
          {generatedStep && (
            <div className="p-4 rounded-xl bg-gradient-to-b from-[#12182A] to-[#0D1120] border border-cyan-500/50 shadow-xl space-y-3 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[#202844] pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase">{generatedStep.name}</h4>
                    <span className="text-[10px] text-[#6A7296]">Target: {generatedStep.targetTrackName}</span>
                  </div>
                </div>

                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 font-bold">
                  READY TO APPLY
                </span>
              </div>

              {/* Parameters Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                {generatedStep.parameters.antiSheenCutDb !== undefined && generatedStep.parameters.antiSheenCutDb !== 0 && (
                  <div className="p-2 rounded-lg bg-[#0A0D18] border border-[#1E253E]">
                    <div className="text-[#646C8E] text-[10px]">ANTI-SHEEN CUT</div>
                    <div className="text-cyan-300 font-bold mt-0.5">{generatedStep.parameters.antiSheenCutDb} dB @ 8.5k</div>
                  </div>
                )}

                {generatedStep.parameters.tapeWarmthPercent !== undefined && generatedStep.parameters.tapeWarmthPercent !== 0 && (
                  <div className="p-2 rounded-lg bg-[#0A0D18] border border-[#1E253E]">
                    <div className="text-[#646C8E] text-[10px]">TAPE SATURATION</div>
                    <div className="text-amber-300 font-bold mt-0.5">+{generatedStep.parameters.tapeWarmthPercent}% Bias</div>
                  </div>
                )}

                {generatedStep.parameters.subMonoCutHz !== undefined && (
                  <div className="p-2 rounded-lg bg-[#0A0D18] border border-[#1E253E]">
                    <div className="text-[#646C8E] text-[10px]">SUB-MONO FLOOR</div>
                    <div className="text-emerald-300 font-bold mt-0.5">{generatedStep.parameters.subMonoCutHz} Hz</div>
                  </div>
                )}

                {generatedStep.parameters.stereoAirDb !== undefined && generatedStep.parameters.stereoAirDb !== 0 && (
                  <div className="p-2 rounded-lg bg-[#0A0D18] border border-[#1E253E]">
                    <div className="text-[#646C8E] text-[10px]">STEREO AIR</div>
                    <div className="text-purple-300 font-bold mt-0.5">+{generatedStep.parameters.stereoAirDb} dB</div>
                  </div>
                )}
              </div>

              {/* Explanation Quote */}
              <p className="text-[11px] text-[#A2A9D0] italic border-l-2 border-cyan-400 pl-3 py-0.5">
                "{generatedStep.explanation}"
              </p>

              {/* Apply Action Button */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={handleApplyToMix}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all text-white ${
                    stepAppliedSuccess
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>{stepAppliedSuccess ? 'APPLIED TO MIX!' : 'APPLY STEP TO MIX'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Applied Mix Steps Pipeline History */}
          {appliedSteps.length > 0 && (
            <div className="pt-3 border-t border-[#1C2237] space-y-2">
              <div className="flex items-center justify-between text-[11px] text-[#6E7599]">
                <span className="font-bold text-[#A2A9D0] uppercase">Active AI Mix Steps Pipeline ({appliedSteps.length})</span>
                <span>Applied sequentially to master audio chain</span>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {appliedSteps.map((step, idx) => (
                  <div
                    key={step.id}
                    className="p-2.5 rounded-lg bg-[#0E121E] border border-[#20273E] flex items-center justify-between text-[11px]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 flex items-center justify-center font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="text-white font-semibold">{step.name}</span>
                      <span className="text-[#646C8E]">({step.targetTrackName || 'Master'})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-emerald-400">Active</span>
                      {onRevertStep && (
                        <button
                          onClick={() => onRevertStep(step.id)}
                          className="text-[#6E7599] hover:text-red-400 transition-colors p-1"
                          title="Revert this AI mix step"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
