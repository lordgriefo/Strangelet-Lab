import React, { useState } from 'react';
import { 
  X, 
  Workflow, 
  Sparkles, 
  Play, 
  Check, 
  ArrowRight, 
  Layers, 
  FolderPlus, 
  Bot, 
  Zap, 
  Sliders, 
  Radio, 
  Split, 
  Music, 
  Clock, 
  ChevronRight, 
  Disc, 
  Activity,
  Award
} from 'lucide-react';
import { GuidedWorkflow, ProjectTemplateConfig, Track } from '../types';
import { GUIDED_WORKFLOWS, PRESET_PROJECT_TEMPLATES } from '../services/workflowTemplates';
import { playLaserBeamSound, playColliderInjectionSound } from '../lib/laserSound';

interface WorkflowStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadTemplate: (template: ProjectTemplateConfig) => void;
  onLaunchWorkflowStep: (stepNumber: number, target: string, workflowId: string) => void;
  onOpenGhostTerminal?: () => void;
}

export const WorkflowStudioModal: React.FC<WorkflowStudioModalProps> = ({
  isOpen,
  onClose,
  onLoadTemplate,
  onLaunchWorkflowStep,
  onOpenGhostTerminal
}) => {
  const [activeTab, setActiveTab] = useState<'workflows' | 'templates'>('workflows');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>(GUIDED_WORKFLOWS[0].id);
  const [completedSteps, setCompletedSteps] = useState<Record<string, number[]>>({});

  if (!isOpen) return null;

  const currentWorkflow = GUIDED_WORKFLOWS.find(w => w.id === selectedWorkflowId) || GUIDED_WORKFLOWS[0];
  const activeCompleted = completedSteps[selectedWorkflowId] || [];

  const toggleStepCompleted = (stepNum: number) => {
    playColliderInjectionSound();
    setCompletedSteps(prev => {
      const list = prev[selectedWorkflowId] || [];
      const updated = list.includes(stepNum) 
        ? list.filter(s => s !== stepNum) 
        : [...list, stepNum];
      return { ...prev, [selectedWorkflowId]: updated };
    });
  };

  const handleStepAction = (stepNum: number, target: string) => {
    playLaserBeamSound('laser_curve');
    // Mark as completed automatically
    if (!activeCompleted.includes(stepNum)) {
      setCompletedSteps(prev => ({
        ...prev,
        [selectedWorkflowId]: [...(prev[selectedWorkflowId] || []), stepNum]
      }));
    }
    onLaunchWorkflowStep(stepNum, target, selectedWorkflowId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 font-mono">
      <div className="bg-[#0B0E17] border border-[#232B42] w-full max-w-5xl h-[88vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden shadow-purple-950/40">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A2234] bg-gradient-to-r from-[#120F24] via-[#0E1322] to-[#0A0D1A]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
              <Workflow size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Strangelet Lab — Guided Workflows & Templates
                </h2>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-950/70 text-amber-300 border border-amber-700/60">
                  GHOST MAD SCIENTIST ASSISTED
                </span>
              </div>
              <p className="text-xs text-[#7E8B9B]">
                Interactive step-by-step master pipelines & 1-click project templates for hybrid production
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher */}
            <div className="flex items-center bg-[#070A14] p-1 rounded-lg border border-[#1A2234]">
              <button
                onClick={() => {
                  setActiveTab('workflows');
                  playLaserBeamSound('laser_select');
                }}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                  activeTab === 'workflows'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-[#7E8B9B] hover:text-white'
                }`}
              >
                Guided Workflows
              </button>
              <button
                onClick={() => {
                  setActiveTab('templates');
                  playLaserBeamSound('laser_select');
                }}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                  activeTab === 'templates'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-[#7E8B9B] hover:text-white'
                }`}
              >
                Project Templates
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#7E8B9B] hover:text-white hover:bg-[#1A233A] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'workflows' ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Workflow List Sidebar */}
            <div className="w-80 bg-[#080B14] border-r border-[#1A2234] flex flex-col p-3 space-y-2 overflow-y-auto">
              <span className="text-[10px] uppercase font-bold text-[#65718E] px-2 tracking-wider">
                Production Pipelines
              </span>

              {GUIDED_WORKFLOWS.map((wf) => {
                const isSelected = wf.id === selectedWorkflowId;
                const completed = completedSteps[wf.id] || [];
                const progressPct = Math.round((completed.length / wf.steps.length) * 100);

                return (
                  <button
                    key={wf.id}
                    onClick={() => {
                      setSelectedWorkflowId(wf.id);
                      playLaserBeamSound('laser_select');
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-[#15122B] border-purple-500/60 shadow-lg shadow-purple-950/30'
                        : 'bg-[#0E1220]/60 border-[#1B2238] hover:border-[#2D395C] hover:bg-[#121626]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        wf.difficulty === 'Beginner'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : wf.difficulty === 'Intermediate'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : 'bg-purple-950 text-purple-400 border border-purple-800'
                      }`}>
                        {wf.difficulty}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] text-[#7E8B9B]">
                        <Clock size={11} />
                        <span>~{wf.estimatedMinutes}m</span>
                      </div>
                    </div>

                    <h3 className="text-xs font-bold text-white mb-1 line-clamp-2">
                      {wf.name}
                    </h3>
                    <p className="text-[11px] text-[#8793AA] line-clamp-2 mb-2">
                      {wf.tagline}
                    </p>

                    {/* Progress Bar */}
                    <div className="w-full bg-[#181F33] h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-cyan-400 h-full transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-1 text-[9px] text-[#697592]">
                      <span>{completed.length} of {wf.steps.length} steps completed</span>
                      <span>{progressPct}%</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Workflow Detail & Step Timeline */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#090C16]">
              {/* Header Box */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-[#17112E] to-[#0E1325] border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                      Interactive Guided Workflow
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-900/50 text-purple-200">
                      {currentWorkflow.startingBpm} BPM Base
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentWorkflow.tags.map((tag, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-[#10162B] text-[#8694B2] border border-[#212C4B]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <h2 className="text-lg font-bold text-white">
                  {currentWorkflow.name}
                </h2>
                <p className="text-xs text-[#9FAAC2] leading-relaxed">
                  {currentWorkflow.description}
                </p>
              </div>

              {/* Step Progression Timeline */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Layers size={14} className="text-purple-400" />
                    <span>Workflow Steps ({currentWorkflow.steps.length})</span>
                  </span>
                  <span className="text-[11px] text-[#7E8B9B]">
                    Click "Launch Step in DAW" to jump directly to the relevant tool!
                  </span>
                </div>

                <div className="space-y-4">
                  {currentWorkflow.steps.map((step) => {
                    const isDone = activeCompleted.includes(step.stepNumber);

                    return (
                      <div
                        key={step.stepNumber}
                        className={`p-4 rounded-xl border transition-all ${
                          isDone
                            ? 'bg-[#0E1524]/80 border-emerald-500/40 shadow-sm'
                            : 'bg-[#111526]/80 border-[#1F273F]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            {/* Step Checkbox Circle */}
                            <button
                              onClick={() => toggleStepCompleted(step.stepNumber)}
                              className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 transition-all ${
                                isDone
                                  ? 'bg-emerald-500 border-emerald-400 text-black'
                                  : 'bg-[#181F33] border-[#2A3554] text-[#717E9C] hover:border-purple-400'
                              }`}
                              title={isDone ? 'Mark step incomplete' : 'Mark step completed'}
                            >
                              {isDone ? <Check size={16} strokeWidth={3} /> : <span className="text-xs font-bold">{step.stepNumber}</span>}
                            </button>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className={`text-xs font-bold ${isDone ? 'text-emerald-300 line-through' : 'text-white'}`}>
                                  Step {step.stepNumber}: {step.title}
                                </h4>
                                {step.recommendedPreset && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                                    Preset: {step.recommendedPreset}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#8E9AB4] leading-relaxed">
                                {step.description}
                              </p>
                            </div>
                          </div>

                          {/* Launch Step Button */}
                          <button
                            onClick={() => handleStepAction(step.stepNumber, step.componentTarget)}
                            className="flex-shrink-0 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-900/30 transition-all active:scale-95"
                          >
                            <span>{step.actionButtonLabel}</span>
                            <ArrowRight size={13} />
                          </button>
                        </div>

                        {/* Ghost Mad Scientist Advice Callout */}
                        <div className="mt-3 pt-3 border-t border-[#1C253E] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px]">
                          <div className="flex-1 p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/25 text-amber-200 leading-relaxed">
                            {step.ghostTip}
                          </div>
                          {onOpenGhostTerminal && (
                            <button
                              type="button"
                              onClick={() => {
                                onOpenGhostTerminal();
                                onClose();
                              }}
                              className="flex-shrink-0 px-3 py-2 rounded-lg bg-[#14182B] hover:bg-[#1E2540] border border-amber-500/40 text-amber-300 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Bot size={13} />
                              <span>Ask Ghost</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Project Templates Tab */
          <div className="flex-1 p-6 overflow-y-auto bg-[#090C16] space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">
                  1-Click Production Project Templates
                </h3>
                <p className="text-xs text-[#7E8B9B]">
                  Instantly load fully configured multi-track projects into the DAW with pre-routed stems, groove humanizers, instruments, and BPM settings!
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PRESET_PROJECT_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="p-5 rounded-2xl bg-[#0E1324] border border-[#212B45] hover:border-purple-500/50 transition-all space-y-4 shadow-lg group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: tmpl.color }}
                        />
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161D32] text-purple-300 border border-[#2B3654]">
                          {tmpl.genre} • {tmpl.bpm} BPM
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                        {tmpl.name}
                      </h4>
                    </div>

                    <button
                      onClick={() => {
                        playColliderInjectionSound();
                        onLoadTemplate(tmpl);
                        onClose();
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-900/30 transition-all active:scale-95"
                    >
                      <Play size={13} fill="white" />
                      <span>Load into DAW</span>
                    </button>
                  </div>

                  <p className="text-xs text-[#8E9AB4] leading-relaxed">
                    {tmpl.description}
                  </p>

                  {/* Pre-configured Tracks Breakdown */}
                  <div className="space-y-1.5 pt-2 border-t border-[#1B2338]">
                    <span className="text-[10px] font-bold text-[#64718F] uppercase tracking-wider">
                      Included Tracks & Routing ({tmpl.tracks.length}):
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {tmpl.tracks.map((trk, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[10px] text-[#A2ACC5] bg-[#12182B] px-2 py-1 rounded border border-[#1F2942]">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: trk.color }} />
                          <span className="truncate font-semibold">{trk.name}</span>
                          {trk.humanizeEnabled && (
                            <span className="text-[8px] px-1 rounded bg-amber-950 text-amber-300 ml-auto">
                              Humanize
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
