import React, { useState, useEffect } from 'react';
import {
  PerformanceMacro,
  MacroEvent,
  macroEngineService
} from '../services/macroEngineService';
import {
  MidiControlMapping,
  MidiLearningTarget,
  midiLearnService
} from '../services/midiLearnService';
import { playLaserBeamSound } from '../lib/laserSound';
import {
  Zap,
  CircleDot,
  Square,
  Play,
  Repeat,
  Trash2,
  X,
  Radio,
  Workflow,
  ChevronDown,
  ChevronRight,
  RotateCcw
} from 'lucide-react';

interface MacroEnginePanelProps {
  isRecordingMacro: boolean;
  recordedEvents: MacroEvent[];
  recordingElapsedMs: number;
  activeMacroId: string | null;
  macroPlaybackProgress: number;
  isMidiLearnMode: boolean;
  midiMappings: MidiControlMapping[];
  learningTarget: MidiLearningTarget | null;
  onStartRecord: (name: string) => void;
  onStopRecord: () => void;
  onTriggerMacro: (macro: PerformanceMacro) => void;
  onStopMacroPlayback: () => void;
  onBakeMacroToTimeline: (macro: PerformanceMacro) => void;
  onStartMidiLearn: (target: MidiLearningTarget) => void;
  onOpenVirtualDesk?: () => void;
  onClose: () => void;
  containerClassName?: string;
}

const formatDurationMs = (ms: number): string => {
  const sec = ms / 1000;
  return `${sec.toFixed(1)}s`;
};

const formatEventValue = (ev: MacroEvent): string => {
  if (ev.kind === 'pan') {
    if (Math.abs(ev.value) < 0.03) return 'Center';
    return ev.value < 0
      ? `${Math.round(Math.abs(ev.value) * 100)}L`
      : `${Math.round(ev.value * 100)}R`;
  }
  if (ev.kind === 'volume' || ev.kind === 'master_gain') {
    return `${Math.round(ev.value * 100)}%`;
  }
  if (ev.kind === 'vst_bypass' || ev.kind === 'track_bypass' || ev.kind === 'mute') {
    return ev.value >= 0.5 ? 'On' : 'Off';
  }
  const unit = ev.unit ? ` ${ev.unit}` : '';
  return `${ev.value >= 100 ? Math.round(ev.value) : ev.value.toFixed(1)}${unit}`;
};

export const MacroEnginePanel: React.FC<MacroEnginePanelProps> = ({
  isRecordingMacro,
  recordedEvents,
  recordingElapsedMs,
  activeMacroId,
  macroPlaybackProgress,
  isMidiLearnMode,
  midiMappings,
  learningTarget,
  onStartRecord,
  onStopRecord,
  onTriggerMacro,
  onStopMacroPlayback,
  onBakeMacroToTimeline,
  onStartMidiLearn,
  onOpenVirtualDesk,
  onClose,
  containerClassName = 'h-96'
}) => {
  const [macros, setMacros] = useState<PerformanceMacro[]>(() => macroEngineService.getMacros());
  const [macroNameInput, setMacroNameInput] = useState('');
  const [expandedMacroId, setExpandedMacroId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = macroEngineService.subscribe(() => {
      setMacros(macroEngineService.getMacros());
    });
    return () => unsub();
  }, []);

  const handleToggleRecord = () => {
    if (isRecordingMacro) {
      onStopRecord();
      setMacroNameInput('');
    } else {
      const nextName = macroNameInput.trim() || `Performance Macro ${macros.length + 1}`;
      onStartRecord(nextName);
    }
  };

  return (
    <aside
      className={`w-full lg:w-[370px] shrink-0 bg-[#070A12] border border-[#1E293B] rounded-xl flex flex-col overflow-hidden ${containerClassName}`}
      aria-label="Macro Engine Side Panel"
    >
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-[#1E293B] bg-[#0B0F1A] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Zap size={15} className="text-[#FF8C00] shrink-0" />
          <h3 className="text-sm font-semibold text-white tracking-tight truncate">
            Macro Engine
          </h3>
          <span className="text-[11px] font-mono tabular-nums text-[#94A3B8]">
            · {macros.length} saved
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenVirtualDesk && (
            <button
              onClick={onOpenVirtualDesk}
              className="px-2 py-1 rounded text-[11px] font-medium text-cyan-300 hover:bg-[#131C31] border border-[#1E293B] transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer"
              title="Open Virtual MIDI Controller Desk to test triggering macros with CC buttons"
            >
              <Radio size={12} />
              <span>MIDI Desk</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-[#94A3B8] hover:text-white rounded hover:bg-[#1E293B]/60 transition-colors cursor-pointer"
            title="Close Macro Engine Panel"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Recorder Bar */}
      <div className="p-3 border-b border-[#1E293B] bg-[#090D18] shrink-0 space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={macroNameInput}
            onChange={(e) => setMacroNameInput(e.target.value)}
            disabled={isRecordingMacro}
            placeholder={isRecordingMacro ? 'Recording live moves...' : 'Macro name (e.g. Filter Drop)'}
            className="flex-1 min-w-0 bg-[#04060C] border border-[#1E293B] focus:border-[#FF8C00] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-[#64748B] outline-none disabled:opacity-60"
          />
          <button
            onClick={handleToggleRecord}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              isRecordingMacro
                ? 'bg-[#DC2626] text-white hover:bg-[#B91C1C]'
                : 'bg-[#FF8C00] text-black hover:bg-[#FFA726]'
            }`}
            title={
              isRecordingMacro
                ? 'Stop recording and save this Performance Macro'
                : 'Record VST tweaks, fader moves, and pan sweeps into a reusable Performance Macro'
            }
          >
            {isRecordingMacro ? <Square size={12} /> : <CircleDot size={12} />}
            <span>{isRecordingMacro ? 'Stop & Save' : 'Record'}</span>
          </button>
        </div>

        {isRecordingMacro ? (
          <div className="bg-[#04060C] border border-[#DC2626]/50 rounded-lg p-2 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
              <span className="text-[#F87171] font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
                Capturing VST, Volume & Pan
              </span>
              <span className="text-white">
                {formatDurationMs(recordingElapsedMs)} · {recordedEvents.length} events
              </span>
            </div>
            {recordedEvents.length === 0 ? (
              <p className="text-[11px] text-[#94A3B8]">
                Move any channel fader, pan knob, bypass switch, or VST Rack parameter now.
              </p>
            ) : (
              <div className="max-h-20 overflow-y-auto space-y-0.5 text-[11px] font-mono tabular-nums text-[#CBD5E1]">
                {recordedEvents.slice(-4).reverse().map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between gap-2">
                    <span className="truncate text-[#94A3B8]">
                      {ev.trackName ? `${ev.trackName} · ` : ''}
                      <span className="text-white">{ev.label}</span>
                    </span>
                    <span className="text-[#FF8C00] shrink-0">
                      {formatEventValue(ev)} @ {formatDurationMs(ev.timestampMs)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-[#94A3B8] leading-snug">
            Capture channel faders, pan knobs, and VST parameters, then map any macro to a hardware MIDI button.
          </p>
        )}
      </div>

      {/* Saved Performance Macros List */}
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-[#1E293B]">
        {macros.length === 0 ? (
          <div className="p-6 text-center space-y-3">
            <p className="text-xs text-[#94A3B8]">
              No Performance Macros saved yet. Record live fader, pan, or VST tweaks above to create one.
            </p>
            <button
              onClick={() => {
                macroEngineService.restoreStarters();
                playLaserBeamSound('laser_select');
              }}
              className="px-3 py-1.5 rounded-lg border border-[#1E293B] bg-[#0B0F1A] text-xs font-medium text-white hover:border-[#FF8C00] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>Load Starter Macros</span>
            </button>
          </div>
        ) : (
          macros.map((macro) => {
            const midiId = macroEngineService.getMidiControlId(macro.id);
            const mapping = midiMappings.find((m) => m.id === midiId);
            const isLearningThis = learningTarget?.id === midiId;
            const isPlayingThis = activeMacroId === macro.id;
            const isExpanded = expandedMacroId === macro.id;

            const kindsPresent = Array.from(new Set(macro.events.map((e) => e.kind)));
            const summaryLabel = kindsPresent
              .map((k) =>
                k === 'vst_param'
                  ? 'VST'
                  : k === 'volume'
                  ? 'Vol'
                  : k === 'pan'
                  ? 'Pan'
                  : k === 'master_gain'
                  ? 'Master'
                  : 'FX'
              )
              .join(' / ');

            return (
              <div key={macro.id} className="p-3 hover:bg-[#0B0F1A]/70 transition-colors">
                {/* Row 1: Title + Play/Stop */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setExpandedMacroId(isExpanded ? null : macro.id)}
                        className="text-[#94A3B8] hover:text-white cursor-pointer shrink-0"
                        title={isExpanded ? 'Hide recorded steps' : 'Inspect recorded steps'}
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                      <span className="text-xs font-semibold text-white truncate">
                        {macro.name}
                      </span>
                    </div>
                    <div className="mt-0.5 pl-5 flex items-center gap-1.5 text-[11px] font-mono tabular-nums text-[#94A3B8]">
                      <span>{macro.events.length} steps</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatDurationMs(macro.durationMs / macro.speed)}</span>
                      {summaryLabel && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#CBD5E1]">{summaryLabel}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    data-midi-id={midiId}
                    data-midi-label={`Macro: ${macro.name}`}
                    data-midi-type="button"
                    onClick={() => {
                      if (isMidiLearnMode) {
                        onStartMidiLearn({
                          id: midiId,
                          controlLabel: `Macro: ${macro.name}`,
                          targetType: 'button'
                        });
                        return;
                      }
                      if (isPlayingThis) onStopMacroPlayback();
                      else onTriggerMacro(macro);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                      isMidiLearnMode
                        ? 'bg-amber-400 text-black'
                        : isPlayingThis
                        ? 'bg-[#EF4444] text-white hover:bg-[#DC2626]'
                        : 'bg-[#131C31] text-white border border-[#2A3958] hover:border-[#FF8C00] hover:text-[#FF8C00]'
                    }`}
                    title={
                      isMidiLearnMode
                        ? 'Click to arm MIDI Learn for this macro trigger'
                        : isPlayingThis
                        ? 'Stop macro playback'
                        : 'Trigger Performance Macro now'
                    }
                  >
                    {isPlayingThis ? <Square size={11} /> : <Play size={11} />}
                    <span>{isPlayingThis ? 'Stop' : 'Trigger'}</span>
                  </button>
                </div>

                {/* Progress bar when active */}
                {isPlayingThis && (
                  <div className="mt-2 ml-5 h-1 bg-[#1E293B] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#FF8C00] transition-all duration-75"
                      style={{ width: `${Math.round(macroPlaybackProgress * 100)}%` }}
                    />
                  </div>
                )}

                {/* Row 2: Speed, Loop, Bake to Timeline, MIDI Mapping, Delete */}
                <div className="mt-2.5 pl-5 flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    {/* Speed Cycle */}
                    <button
                      onClick={() => {
                        const order: (0.5 | 1 | 2)[] = [0.5, 1, 2];
                        const nextSpeed = order[(order.indexOf(macro.speed) + 1) % order.length];
                        macroEngineService.updateMacro(macro.id, { speed: nextSpeed });
                        playLaserBeamSound('laser_select');
                      }}
                      className="px-2 py-0.5 rounded border border-[#1E293B] bg-[#04060C] text-[11px] font-mono tabular-nums text-[#CBD5E1] hover:text-white hover:border-[#475569] cursor-pointer"
                      title="Cycle macro playback speed (0.5x / 1x / 2x)"
                    >
                      {macro.speed}x
                    </button>

                    {/* Loop Toggle */}
                    <button
                      onClick={() => {
                        macroEngineService.updateMacro(macro.id, { loop: !macro.loop });
                        playLaserBeamSound('laser_select');
                      }}
                      className={`px-2 py-0.5 rounded border text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                        macro.loop
                          ? 'border-[#00F0FF]/60 bg-[#00F0FF]/10 text-[#00F0FF]'
                          : 'border-[#1E293B] bg-[#04060C] text-[#94A3B8] hover:text-white'
                      }`}
                      title="Toggle macro loop playback"
                    >
                      <Repeat size={11} />
                      <span>Loop</span>
                    </button>

                    {/* Bake to Timeline Automation */}
                    <button
                      onClick={() => onBakeMacroToTimeline(macro)}
                      className="px-2 py-0.5 rounded border border-[#1E293B] bg-[#04060C] text-[11px] font-medium text-[#CBD5E1] hover:text-[#FF8C00] hover:border-[#FF8C00]/60 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Write this macro's movements into timeline automation lanes at the current playhead"
                    >
                      <Workflow size={11} />
                      <span>Bake</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* MIDI Trigger Learn / Status */}
                    {mapping ? (
                      <div className="flex items-center border border-amber-500/50 bg-amber-950/30 rounded overflow-hidden">
                        <button
                          onClick={() =>
                            onStartMidiLearn({
                              id: midiId,
                              controlLabel: `Macro: ${macro.name}`,
                              targetType: 'button'
                            })
                          }
                          className="px-2 py-0.5 text-[11px] font-mono tabular-nums text-amber-300 hover:bg-amber-900/40 cursor-pointer whitespace-nowrap"
                          title={`Mapped to Channel ${mapping.channel}, CC ${mapping.ccNumber} (${mapping.controllerName || 'MIDI'}). Click to re-learn.`}
                        >
                          {isLearningThis
                            ? 'Touch CC...'
                            : `CH${mapping.channel} · CC${mapping.ccNumber}`}
                        </button>
                        <button
                          onClick={() => midiLearnService.removeMapping(midiId)}
                          className="px-1 py-0.5 text-amber-400/70 hover:text-white hover:bg-amber-900/50 cursor-pointer"
                          title="Clear MIDI button mapping"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          onStartMidiLearn({
                            id: midiId,
                            controlLabel: `Macro: ${macro.name}`,
                            targetType: 'button'
                          })
                        }
                        className={`px-2 py-0.5 rounded border text-[11px] font-medium cursor-pointer transition-colors whitespace-nowrap ${
                          isLearningThis
                            ? 'border-amber-400 bg-amber-400 text-black font-semibold'
                            : 'border-[#1E293B] bg-[#04060C] text-[#94A3B8] hover:text-amber-300 hover:border-amber-500/50'
                        }`}
                        title="Map this Performance Macro to a hardware MIDI controller button or pad"
                      >
                        {isLearningThis ? 'Touch MIDI CC...' : 'Learn MIDI'}
                      </button>
                    )}

                    <button
                      onClick={() => {
                        macroEngineService.deleteMacro(macro.id);
                        midiLearnService.removeMapping(midiId);
                        playLaserBeamSound('laser_erase');
                      }}
                      className="p-1 rounded text-[#64748B] hover:text-[#F87171] hover:bg-[#1E293B]/50 cursor-pointer transition-colors"
                      title="Delete Macro"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Expandable Event Timeline Inspector */}
                {isExpanded && (
                  <div className="mt-2.5 ml-5 pt-2 border-t border-[#1E293B]/70 space-y-1 max-h-36 overflow-y-auto">
                    {macro.events.map((ev) => (
                      <div
                        key={ev.id}
                        className="flex items-center justify-between text-[11px] font-mono tabular-nums text-[#94A3B8]"
                      >
                        <span className="truncate">
                          {ev.trackName ? `${ev.trackName} · ` : ''}
                          <span className="text-[#E2E8F0]">{ev.label}</span>
                        </span>
                        <span className="shrink-0 text-[#CBD5E1]">
                          {formatEventValue(ev)} · {formatDurationMs(ev.timestampMs)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
