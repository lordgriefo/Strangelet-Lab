import React, { useEffect, useState, useRef } from 'react';
import { Sliders, Radio, X, Trash2, CheckCircle2, Cpu, Zap } from 'lucide-react';
import {
  midiLearnService,
  MidiControlMapping,
  MidiLearningTarget,
  MidiDeviceStatus,
  MidiControlTargetType
} from '../services/midiLearnService';

interface HighlightBox {
  top: number;
  left: number;
  width: number;
  height: number;
  label: string;
  targetType: MidiControlTargetType;
  existingCc?: number;
}

function escapeCssIdent(str: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(str);
  }
  return str.replace(/([ #;?%&,.+*~':"!^$[\]()=>|/@])/g, '\\$1');
}

function buildDomSelector(el: HTMLElement): string {
  const explicitId = el.getAttribute('data-midi-id') || el.getAttribute('data-midi-learned-id');
  if (explicitId) {
    return `[data-midi-id="${escapeCssIdent(explicitId)}"], [data-midi-learned-id="${escapeCssIdent(explicitId)}"]`;
  }
  if (el.id) {
    return `#${escapeCssIdent(el.id)}`;
  }

  const parts: string[] = [];
  let current: HTMLElement | null = el;
  while (current && current !== document.body && parts.length < 5) {
    const parentEl: HTMLElement | null = current.parentElement;
    if (!parentEl) break;
    const tag = current.tagName.toLowerCase();
    const siblings = Array.from(parentEl.children).filter(c => c.tagName === current!.tagName);
    const idx = siblings.indexOf(current) + 1;
    parts.unshift(`${tag}:nth-of-type(${Math.max(1, idx)})`);
    current = parentEl;
  }
  return parts.join(' > ');
}

function extractControlInfo(el: HTMLElement): {
  id: string;
  label: string;
  targetType: MidiControlTargetType;
  trackId?: string;
  trackName?: string;
  minValue?: number;
  maxValue?: number;
  domSelector: string;
} {
  const explicitId = el.getAttribute('data-midi-id') || el.getAttribute('data-midi-learned-id');
  const explicitLabel = el.getAttribute('data-midi-label');
  const explicitType = el.getAttribute('data-midi-type') as MidiControlTargetType | null;
  const trackEl = el.closest('[data-track-id]') as HTMLElement | null;
  const trackId = el.getAttribute('data-midi-track-id') || trackEl?.getAttribute('data-track-id') || undefined;
  const trackName = el.getAttribute('data-midi-track-name') || undefined;

  let targetType: MidiControlTargetType = explicitType || 'button';
  let minValue: number | undefined;
  let maxValue: number | undefined;

  if (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'range') {
    if (!explicitType) targetType = 'fader';
    const inputEl = el as HTMLInputElement;
    minValue = inputEl.min !== '' ? parseFloat(inputEl.min) : 0;
    maxValue = inputEl.max !== '' ? parseFloat(inputEl.max) : 1;
  } else if (el.getAttribute('data-midi-control') === 'knob') {
    if (!explicitType) targetType = 'knob';
    const dMin = el.getAttribute('data-midi-min');
    const dMax = el.getAttribute('data-midi-max');
    if (dMin !== null) minValue = parseFloat(dMin);
    if (dMax !== null) maxValue = parseFloat(dMax);
  } else if (el.getAttribute('role') === 'slider') {
    if (!explicitType) targetType = 'fader';
    const aMin = el.getAttribute('aria-valuemin');
    const aMax = el.getAttribute('aria-valuemax');
    minValue = aMin !== null ? parseFloat(aMin) : 0;
    maxValue = aMax !== null ? parseFloat(aMax) : 1;
  }

  const rawText = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
  const label =
    explicitLabel ||
    el.getAttribute('aria-label') ||
    el.getAttribute('title')?.split('.')[0]?.slice(0, 48) ||
    (rawText ? rawText.slice(0, 36) : '') ||
    (targetType === 'fader' ? 'UI Fader' : targetType === 'knob' ? 'UI Knob' : 'UI Button');

  let id = explicitId || '';
  if (!id) {
    const slug = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32);
    const selectorSeed = buildDomSelector(el);
    let hash = 0;
    for (let i = 0; i < selectorSeed.length; i++) {
      hash = (hash * 31 + selectorSeed.charCodeAt(i)) | 0;
    }
    id = `ui-${trackId ? `${trackId}-` : ''}${slug || targetType}-${Math.abs(hash).toString(36)}`;
    el.setAttribute('data-midi-learned-id', id);
  }

  return {
    id,
    label,
    targetType,
    trackId,
    trackName,
    minValue,
    maxValue,
    domSelector: buildDomSelector(el)
  };
}

function findMappableControl(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  if (target.closest('[data-midi-learn-ignore="true"]')) return null;

  const matched = target.closest(
    '[data-midi-id], [data-midi-control], input[type="range"], [role="slider"], button'
  ) as HTMLElement | null;

  if (!matched) return null;
  if (matched.closest('[data-midi-learn-ignore="true"]')) return null;
  if ((matched as HTMLButtonElement).disabled) return null;
  return matched;
}

function setNativeRangeValue(input: HTMLInputElement, nextVal: number) {
  const min = input.min !== '' ? parseFloat(input.min) : 0;
  const max = input.max !== '' ? parseFloat(input.max) : 1;
  const clamped = Math.max(min, Math.min(max, nextVal));

  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (setter) {
    setter.call(input, String(clamped));
  } else {
    input.value = String(clamped);
  }
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

export const GlobalMidiLearnHud: React.FC = () => {
  const [isLearnModeActive, setIsLearnModeActive] = useState<boolean>(() => midiLearnService.getLearnModeActive());
  const [learningTarget, setLearningTarget] = useState<MidiLearningTarget | null>(() => midiLearnService.getLearningTarget());
  const [mappings, setMappings] = useState<MidiControlMapping[]>(() => midiLearnService.getAllMappings());
  const [midiStatus, setMidiStatus] = useState<MidiDeviceStatus>(() => midiLearnService.getStatus());
  const [hoverBox, setHoverBox] = useState<HighlightBox | null>(null);

  // Test CC simulator inside HUD for users testing without hardware connected
  const [simCcNumber, setSimCcNumber] = useState<number>(14);
  const [simCcValue, setSimCcValue] = useState<number>(64);

  const mappingsRef = useRef<MidiControlMapping[]>(mappings);
  mappingsRef.current = mappings;

  useEffect(() => {
    const unsubLearn = midiLearnService.subscribeLearnMode((active, target) => {
      setIsLearnModeActive(active);
      setLearningTarget(target);
      if (!active) setHoverBox(null);
    });
    const unsubMap = midiLearnService.subscribeChange(setMappings);
    const unsubStatus = midiLearnService.subscribeStatus(setMidiStatus);

    return () => {
      unsubLearn();
      unsubMap();
      unsubStatus();
    };
  }, []);

  // Global DOM fallback execution for any mapped sliders/buttons without custom registered callbacks
  useEffect(() => {
    const unsubControl = midiLearnService.onControlValueChange((mapping, normalizedValue) => {
      // Skip controls handled by Mixer track vol/pan or explicit registerControl callbacks
      if (mapping.targetType === 'volume' || mapping.targetType === 'pan') return;
      if (midiLearnService.hasRegisteredControl(mapping.id)) return;

      const selector =
        `[data-midi-id="${escapeCssIdent(mapping.id)}"], [data-midi-learned-id="${escapeCssIdent(mapping.id)}"]`;
      let targetEl = document.querySelector(selector) as HTMLElement | null;
      if (!targetEl && mapping.domSelector) {
        try {
          targetEl = document.querySelector(mapping.domSelector) as HTMLElement | null;
        } catch {
          targetEl = null;
        }
      }
      if (!targetEl) return;

      if (mapping.targetType === 'button' || mapping.targetType === 'toggle') {
        targetEl.click();
      } else if (targetEl.tagName === 'INPUT' && (targetEl as HTMLInputElement).type === 'range') {
        setNativeRangeValue(targetEl as HTMLInputElement, normalizedValue);
      }
    });

    return () => unsubControl();
  }, []);

  // Capture-phase click & hover interceptor when Global MIDI Learn Mode is active
  useEffect(() => {
    if (!isLearnModeActive) return;

    const handlePointerOrMouseDown = (e: Event) => {
      const control = findMappableControl(e.target);
      if (!control) return;
      e.preventDefault();
      e.stopPropagation();
    };

    const handleClickCapture = (e: MouseEvent) => {
      const control = findMappableControl(e.target);
      if (!control) return;

      e.preventDefault();
      e.stopPropagation();

      const info = extractControlInfo(control);
      midiLearnService.startLearning({
        id: info.id,
        targetType: info.targetType,
        controlLabel: info.label,
        trackId: info.trackId,
        trackName: info.trackName,
        minValue: info.minValue,
        maxValue: info.maxValue,
        domSelector: info.domSelector
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      const control = findMappableControl(e.target);
      if (!control) {
        setHoverBox(null);
        return;
      }
      const rect = control.getBoundingClientRect();
      const info = extractControlInfo(control);
      const existing = mappingsRef.current.find(m => m.id === info.id);
      setHoverBox({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        label: info.label,
        targetType: info.targetType,
        existingCc: existing?.ccNumber
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (midiLearnService.getLearningTarget()) {
          midiLearnService.cancelLearning();
        } else {
          midiLearnService.setLearnModeActive(false);
        }
      }
    };

    window.addEventListener('pointerdown', handlePointerOrMouseDown, true);
    window.addEventListener('mousedown', handlePointerOrMouseDown, true);
    window.addEventListener('click', handleClickCapture, true);
    window.addEventListener('mousemove', handleMouseMove, true);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('pointerdown', handlePointerOrMouseDown, true);
      window.removeEventListener('mousedown', handlePointerOrMouseDown, true);
      window.removeEventListener('click', handleClickCapture, true);
      window.removeEventListener('mousemove', handleMouseMove, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isLearnModeActive]);

  if (!isLearnModeActive) return null;

  return (
    <>
      {/* Hover Reticle Highlight Overlay */}
      {hoverBox && (
        <div
          className="fixed z-[9997] pointer-events-none rounded-md border-2 border-amber-400 bg-amber-400/15 shadow-[0_0_18px_rgba(245,158,11,0.65)] transition-all duration-75"
          style={{
            top: Math.max(0, hoverBox.top - 3),
            left: Math.max(0, hoverBox.left - 3),
            width: hoverBox.width + 6,
            height: hoverBox.height + 6
          }}
        >
          <div
            className="absolute -top-6 left-0 px-2 py-0.5 rounded bg-amber-400 text-black font-mono text-[10px] font-black whitespace-nowrap shadow-lg"
          >
            {hoverBox.existingCc !== undefined
              ? `RE-MAP: ${hoverBox.label} (CC ${hoverBox.existingCc})`
              : `CLICK TO MIDI LEARN: ${hoverBox.label} [${hoverBox.targetType.toUpperCase()}]`}
          </div>
        </div>
      )}

      {/* Floating MIDI Learn Studio HUD */}
      <div
        data-midi-learn-ignore="true"
        className="fixed bottom-4 right-4 z-[9998] w-96 max-w-[94vw] rounded-2xl border-2 border-amber-400/80 bg-[#0B0E17]/95 backdrop-blur-md shadow-[0_0_50px_rgba(245,158,11,0.35)] font-mono text-xs overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-amber-500/25 via-[#181308] to-amber-500/15 border-b border-amber-500/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders size={15} className="text-amber-400 animate-pulse" />
            <span className="font-black text-amber-300 tracking-wider text-[11px]">
              GLOBAL MIDI LEARN MODE
            </span>
          </div>
          <button
            type="button"
            onClick={() => midiLearnService.setLearnModeActive(false)}
            className="px-2 py-0.5 rounded bg-amber-400 text-black font-black text-[10px] hover:bg-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            <X size={12} />
            <span>EXIT [ESC]</span>
          </button>
        </div>

        <div className="p-3.5 space-y-3">
          {/* Active Learning Status Banner */}
          {learningTarget ? (
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-400 animate-pulse space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-amber-300 flex items-center gap-1.5">
                  <Radio size={12} className="text-amber-400" />
                  <span>LISTENING FOR HARDWARE MIDI CC...</span>
                </span>
                <button
                  type="button"
                  onClick={() => midiLearnService.cancelLearning()}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-black/50 text-amber-200 hover:text-white border border-amber-500/40 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
              <div className="text-xs font-bold text-white truncate">
                Target: {learningTarget.controlLabel || learningTarget.trackName || learningTarget.id}
              </div>
              <div className="text-[10px] text-amber-200/80">
                Twist any hardware knob, move a fader, or press a controller pad/button now.
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-[#101626] border border-[#243150] text-[11px] text-[#B8C4E0] flex items-center gap-2">
              <CheckCircle2 size={15} className="text-amber-400 shrink-0" />
              <span>
                Click <strong>any fader, rotary knob, or button</strong> anywhere in the UI to bind a MIDI CC control.
              </span>
            </div>
          )}

          {/* Connected MIDI Inputs & Last CC Telemetry */}
          <div className="flex items-center justify-between text-[10px] px-2 py-1.5 rounded-lg bg-[#070A12] border border-[#1B243B]">
            <div className="flex items-center gap-1.5 truncate pr-2">
              <Cpu size={12} className={midiStatus.isConnected ? 'text-emerald-400' : 'text-[#64748B]'} />
              <span className={midiStatus.isConnected ? 'text-emerald-300 font-bold truncate' : 'text-[#7A88A8]'}>
                {midiStatus.isConnected
                  ? `${midiStatus.devices.length} MIDI Device(s): ${midiStatus.devices[0]?.name}`
                  : midiStatus.isSupported
                    ? 'Web MIDI Ready (No physical controller detected)'
                    : 'Web MIDI unsupported (Use Quick CC Test below)'}
              </span>
            </div>
            {midiStatus.lastReceivedEvent && (
              <span className="text-cyan-300 font-bold shrink-0">
                CC {midiStatus.lastReceivedEvent.ccNumber} = {midiStatus.lastReceivedEvent.value}
              </span>
            )}
          </div>

          {/* Quick Hardware CC Simulator Bar (Great for mapping/testing without hardware) */}
          <div className="p-2.5 rounded-xl bg-[#080C16] border border-cyan-500/30 space-y-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-cyan-300 flex items-center gap-1">
                <Zap size={11} />
                <span>QUICK CC BIND / TESTER</span>
              </span>
              <span className="text-[#7A88A8]">Ch 1 • CC {simCcNumber}</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-[#94A3B8] shrink-0">CC#</label>
              <input
                type="number"
                min={0}
                max={127}
                value={simCcNumber}
                onChange={(e) => setSimCcNumber(Math.max(0, Math.min(127, Number(e.target.value) || 0)))}
                className="w-14 bg-[#111829] border border-[#283657] rounded px-1.5 py-0.5 text-[11px] text-white font-bold text-center"
              />
              <input
                type="range"
                min={0}
                max={127}
                value={simCcValue}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSimCcValue(val);
                  midiLearnService.simulateMidiMessage(1, simCcNumber, val);
                }}
                className="flex-1 accent-cyan-400 cursor-pointer"
                title="Drag to emit live MIDI CC value (0-127)"
              />
              <button
                type="button"
                onClick={() => {
                  midiLearnService.simulateMidiMessage(1, simCcNumber, 0);
                  midiLearnService.simulateMidiMessage(1, simCcNumber, 127);
                  setSimCcValue(127);
                }}
                className="px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-400 hover:text-black text-cyan-300 border border-cyan-400/50 text-[10px] font-bold cursor-pointer shrink-0"
                title="Send CC 127 pulse to map or trigger button"
              >
                Send CC
              </button>
            </div>
          </div>

          {/* Active Mappings List */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#8C9BBF] font-bold uppercase">
                Active MIDI Mappings ({mappings.length})
              </span>
              {mappings.length > 0 && (
                <button
                  type="button"
                  onClick={() => midiLearnService.clearAllMappings()}
                  className="text-red-400 hover:text-red-300 flex items-center gap-1 text-[10px] cursor-pointer"
                >
                  <Trash2 size={10} />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            {mappings.length === 0 ? (
              <div className="text-[10px] text-[#64748B] italic text-center py-2 border border-dashed border-[#1E273E] rounded-lg">
                No controls mapped yet. Click any UI control above.
              </div>
            ) : (
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {mappings.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#0D1322] border border-[#1E2A45] text-[10px]"
                  >
                    <div className="truncate pr-2">
                      <span className="text-white font-bold truncate block">
                        {m.controlLabel || (m.trackName ? `${m.trackName} (${m.targetType})` : m.id)}
                      </span>
                      <span className="text-amber-300/90 text-[9px]">
                        CC {m.ccNumber} • Ch {m.channel === -1 ? 'All' : m.channel} • {m.targetType.toUpperCase()}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => midiLearnService.removeMapping(m.id)}
                      className="p-1 text-[#64748B] hover:text-red-400 transition-colors cursor-pointer shrink-0"
                      title="Remove mapping"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default GlobalMidiLearnHud;
