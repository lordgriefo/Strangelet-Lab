import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Track, Clip, PluginAutomationLaneConfig } from '../types';
import { snapToGrid, carveEraseRegionFromClips, volumeToDb, panToString, getDefaultAutomation, evaluateAutomationAt, formatAutomationValue } from '../lib/audioUtils';
import AutomationLane from './AutomationLane';
import { ActiveTool } from './Toolbar';
import { playLaserBeamSound } from '../lib/laserSound';
import { midiToNoteName } from '../services/basicPitchService';
import { 
  Volume2, Compass, Waves, Music, ChevronDown, ChevronRight, 
  Pencil, Sliders, Scissors, Zap, Trash2, CircleDot, Flame, Sparkles,
  GripVertical, ChevronLeft, Copy, Cpu, Palette, RotateCcw, X, Layers, Check,
  Pin, ArrowLeftRight
} from 'lucide-react';
import { projectHistory } from '../services/projectHistoryService';
import { audioService } from '../services/audioService';
import { timeStretchBufferPreservePitch } from '../lib/audioDspEditor';
import { ActivePaintingState, ActiveDragSnapState, getSnapStepSize, getLaserPointerCursor } from './SequencerGridOverlay';

const CLIP_SECTION_COLOR_PRESETS: { label: string; color: string }[] = [
  { label: 'Verse', color: '#00F0FF' },
  { label: 'Pre-Chorus', color: '#38BDF8' },
  { label: 'Chorus', color: '#FF8C00' },
  { label: 'Drop / Hook', color: '#EC4899' },
  { label: 'Bridge', color: '#A855F7' },
  { label: 'Intro / Out', color: '#10B981' },
  { label: 'Solo / Lead', color: '#FFD700' },
  { label: 'FX / Riser', color: '#EF4444' }
];

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  return `rgba(0, 240, 255, ${alpha})`;
}

function normalizeHexForColorInput(hex: string): string {
  const clean = (hex || '').replace('#', '').trim();
  if (/^[0-9a-fA-F]{6}$/.test(clean)) return `#${clean.toLowerCase()}`;
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    return `#${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`.toLowerCase();
  }
  return '#00f0ff';
}

interface TimelineLaneProps {
  track: Track;
  trackIndex: number;
  playheadPosition: number;
  activeTool: ActiveTool;
  updateTrack: (id: string, updates: Partial<Track>) => void;
  timeSignature?: string;
  snapValue: string;
  onEdit: (clip: Clip) => void;
  isRecording?: boolean;
  allTracks?: Track[];
  tempo?: number;
  onPaintChange?: (state: ActivePaintingState | null) => void;
  onDragSnapChange?: (state: ActiveDragSnapState | null) => void;
  isSelected?: boolean;
  onSelectTrack?: (id: string) => void;
  isAutoArmMode?: boolean;
  selectedClipIds?: string[];
  onToggleSelectClip?: (clipId: string, multi: boolean) => void;
  beamModeEnabled?: boolean;
}

const TimelineLane: React.FC<TimelineLaneProps> = ({ 
  track, 
  trackIndex, 
  playheadPosition, 
  activeTool, 
  updateTrack, 
  timeSignature = '4/4', 
  snapValue, 
  onEdit,
  isRecording = false,
  allTracks,
  tempo = 120,
  onPaintChange,
  onDragSnapChange,
  isSelected = false,
  onSelectTrack,
  isAutoArmMode = false,
  selectedClipIds = [],
  onToggleSelectClip,
  beamModeEnabled = true
}) => {
  const { id, name, muted, soloed, phaseInverted, color, volume, pan, clips, type, isArmedForRecord } = track;
  
  // Ensure track automation object exists
  const automation = track.automation || getDefaultAutomation(volume, pan);
  const pluginParamsList: PluginAutomationLaneConfig[] = Object.values(automation.params || {});
  const visiblePluginParams = pluginParamsList.filter(p => p.visible);
  const hasVisiblePluginParam = visiblePluginParams.length > 0;
  const isExpanded = automation.isExpanded ?? (automation.volume.visible || automation.pan.visible || hasVisiblePluginParam);

  // Active parameter for direct track display or expanded lane
  const activeParam = automation.activeParameter || (visiblePluginParams[0]?.id || (automation.volume.visible ? 'volume' : 'pan'));

  // Time grid math
  const beatsPerBar = parseInt(timeSignature.split('/')[0]) || 4;
  const totalBars = 16;
  const totalBeats = totalBars * beatsPerBar;
  const gridLines = Array.from({ length: totalBeats * 4 + 1 }, (_, i) => i);

  // Toggle Record Arm
  const handleToggleArmRecord = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateTrack(id, { isArmedForRecord: !isArmedForRecord });
  };

  // Toggle volume envelope
  const handleToggleVolumeEnv = (e: React.MouseEvent) => {
    e.stopPropagation();
    const current = automation.volume;
    const newVisible = !current.visible;
    const updatedAutomation = {
      ...automation,
      volume: {
        ...current,
        visible: newVisible,
        enabled: newVisible ? true : current.enabled
      },
      activeParameter: 'volume',
      isExpanded: newVisible || automation.pan.visible || hasVisiblePluginParam
    };
    updateTrack(id, { automation: updatedAutomation });
  };

  // Toggle pan envelope
  const handleTogglePanEnv = (e: React.MouseEvent) => {
    e.stopPropagation();
    const current = automation.pan;
    const newVisible = !current.visible;
    const updatedAutomation = {
      ...automation,
      pan: {
        ...current,
        visible: newVisible,
        enabled: newVisible ? true : current.enabled
      },
      activeParameter: 'pan',
      isExpanded: newVisible || automation.volume.visible || hasVisiblePluginParam
    };
    updateTrack(id, { automation: updatedAutomation });
  };

  // Toggle/focus FX plugin automation lanes
  const handleTogglePluginEnvs = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pluginParamsList.length === 0) return;
    const anyVis = visiblePluginParams.length > 0;
    const nextParams: Record<string, PluginAutomationLaneConfig> = {};
    pluginParamsList.forEach(p => {
      nextParams[p.id] = { ...p, visible: !anyVis, enabled: !anyVis ? true : p.enabled };
    });
    updateTrack(id, {
      automation: {
        ...automation,
        params: nextParams,
        activeParameter: !anyVis ? pluginParamsList[0].id : automation.activeParameter,
        isExpanded: !anyVis || automation.volume.visible || automation.pan.visible
      }
    });
  };

  // Toggle expanded sub-lane
  const handleToggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateTrack(id, {
      automation: {
        ...automation,
        isExpanded: !isExpanded
      }
    });
  };

  const laneAreaRef = useRef<HTMLDivElement>(null);
  const latestClipsRef = useRef<Clip[]>(clips);
  latestClipsRef.current = clips;
  const pointerEraseHandledRef = useRef<boolean>(false);
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
  const [resizingClipId, setResizingClipId] = useState<string | null>(null);
  const [dragPreviewStartBar, setDragPreviewStartBar] = useState<number | null>(null);
  const [laserStrike, setLaserStrike] = useState<{ bar: number; color: string; key: number } | null>(null);
  const laserStrikeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (laserStrikeTimeoutRef.current !== null) {
        window.clearTimeout(laserStrikeTimeoutRef.current);
      }
    };
  }, []);

  const triggerLaserStrike = (bar: number, strikeColor: string) => {
    setLaserStrike({ bar, color: strikeColor, key: Date.now() });
    if (laserStrikeTimeoutRef.current !== null) {
      window.clearTimeout(laserStrikeTimeoutRef.current);
    }
    laserStrikeTimeoutRef.current = window.setTimeout(() => {
      setLaserStrike(null);
      laserStrikeTimeoutRef.current = null;
    }, 260);
  };
  const [clipColorPicker, setClipColorPicker] = useState<{
    clipId: string;
    x: number;
    y: number;
  } | null>(null);
  const colorPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!clipColorPicker) return;
    const handleOutsideMouseDown = (ev: MouseEvent) => {
      if (colorPopoverRef.current && !colorPopoverRef.current.contains(ev.target as Node)) {
        setClipColorPicker(null);
      }
    };
    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setClipColorPicker(null);
      }
    };
    window.addEventListener('mousedown', handleOutsideMouseDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleOutsideMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [clipColorPicker]);

  const openClipColorPicker = (e: React.MouseEvent, clipId: string, usePointerPos = false) => {
    e.stopPropagation();
    const popoverW = 264;
    const popoverH = 295;
    let rawX = e.clientX;
    let rawY = e.clientY + 6;
    if (!usePointerPos && e.currentTarget instanceof HTMLElement) {
      const rect = e.currentTarget.getBoundingClientRect();
      rawX = rect.left;
      rawY = rect.bottom + 6;
    }
    const maxX = typeof window !== 'undefined' ? window.innerWidth - popoverW - 12 : rawX;
    const maxY = typeof window !== 'undefined' ? window.innerHeight - popoverH - 12 : rawY;
    setClipColorPicker({
      clipId,
      x: Math.max(12, Math.min(rawX, maxX)),
      y: Math.max(12, Math.min(rawY, maxY))
    });
  };

  const applyColorToClip = (
    clipId: string,
    nextColor: string | undefined,
    scope: 'single' | 'selected' | 'same-name' = 'single'
  ) => {
    const targetClip = clips.find(c => c.id === clipId);
    if (!targetClip) return;

    const trackList = allTracks && allTracks.length > 0 ? allTracks : [track];
    const labelSuffix = nextColor ? nextColor.toUpperCase() : 'Track Default';

    if (scope === 'selected') {
      const targetIds = new Set(selectedClipIds.includes(clipId) ? selectedClipIds : [clipId]);
      projectHistory.pushSnapshot(
        `Color ${targetIds.size} Selected Clip(s) [${labelSuffix}]`,
        trackList,
        tempo
      );
      trackList.forEach(t => {
        if (t.clips.some(c => targetIds.has(c.id))) {
          updateTrack(t.id, {
            clips: t.clips.map(c => (targetIds.has(c.id) ? { ...c, color: nextColor } : c))
          });
        }
      });
    } else if (scope === 'same-name') {
      projectHistory.pushSnapshot(
        `Color Matching Clips "${targetClip.name}" [${labelSuffix}]`,
        trackList,
        tempo
      );
      trackList.forEach(t => {
        if (t.clips.some(c => c.name === targetClip.name)) {
          updateTrack(t.id, {
            clips: t.clips.map(c => (c.name === targetClip.name ? { ...c, color: nextColor } : c))
          });
        }
      });
    } else {
      projectHistory.pushSnapshot(
        `Color Clip [${targetClip.name}] (${labelSuffix})`,
        trackList,
        tempo
      );
      updateTrack(id, {
        clips: clips.map(c => (c.id === clipId ? { ...c, color: nextColor } : c))
      });
    }

    playLaserBeamSound('laser_select');
  };

  const isPaintBeamMode =
    beamModeEnabled &&
    (activeTool === 'laser_audio' || activeTool === 'laser_midi' || activeTool === 'beam');

  // Loop Paint & Beam Engine State
  const [paintState, setPaintState] = useState<{
    isActive: boolean;
    anchorBar: number;
    currentBar: number;
    startBar: number;
    endBar: number;
    durationBars: number;
    hasDragged: boolean;
    mode?: 'paint' | 'erase';
  } | null>(null);

  // Handle Loop Painting, ACID-Style Right-Click Incremental Erasing, and Laser Beaming on the Track Lane
  const handleLaneMouseDown = (e: React.MouseEvent) => {
    const isAudioLaser = activeTool === 'laser_audio' || activeTool === 'beam';
    const isMidiLaser = activeTool === 'laser_midi';
    const isPaintLaser = isAudioLaser || isMidiLaser;
    const isEraseTool = activeTool === 'laser_erase' || activeTool === 'erase';
    const isCurveLaser = activeTool === 'laser_curve' || activeTool === 'draw';

    // ACID Pro Beam Mode (when enabled): Right-Click (e.button === 2) incrementally erases without leaving paint mode
    const isRightClickBeamErase = isPaintBeamMode && e.button === 2 && !e.ctrlKey;
    if (!isRightClickBeamErase && e.button !== 0) return;

    const isEraseAction = isEraseTool || isRightClickBeamErase;
    if (!isPaintLaser && !isEraseAction && !isCurveLaser) return;

    if (isRightClickBeamErase) {
      e.preventDefault();
    }

    if (!laneAreaRef.current) return;
    const rect = laneAreaRef.current.getBoundingClientRect();
    const startClientX = e.clientX;
    const rawX = e.clientX - rect.left;
    const rawBar = Math.max(0, Math.min(16, (rawX / rect.width) * 16));
    const initMicroBypass = e.altKey;
    const initIsOff = initMicroBypass || snapValue === 'off' || snapValue === 'freeform';
    const snappedBar = initIsOff
      ? Number(rawBar.toFixed(3))
      : Number(snapToGrid(rawBar, snapValue).toFixed(4));
    const startAnchor = Math.max(0, Math.min(15.9375, snappedBar));

    // Baseline clips snapshot for live reversible incremental drag-erasing & clean single undo history
    const baselineClips = clips;
    const baselineAllTracks = allTracks || [track];
    const clipsFingerprint = (list: Clip[]) =>
      list.map(c => `${c.id}:${c.startBar}:${c.durationBars}`).join('|');
    const baselineFingerprint = clipsFingerprint(baselineClips);

    const beamStrikeColor = isEraseAction
      ? '#EF4444'
      : isMidiLaser
        ? '#10B981'
        : isCurveLaser
          ? '#FFD700'
          : '#00F0FF';
    triggerLaserStrike(startAnchor, beamStrikeColor);

    let hasMoved = false;
    pointerEraseHandledRef.current = false;
    const activeActionMode: 'paint' | 'erase' = isEraseAction ? 'erase' : 'paint';

    setPaintState({
      isActive: true,
      anchorBar: startAnchor,
      currentBar: startAnchor,
      startBar: startAnchor,
      endBar: startAnchor,
      durationBars: 0,
      hasDragged: false,
      mode: activeActionMode
    });

    if ((isPaintLaser || isEraseAction) && onPaintChange) {
      onPaintChange({
        isActive: true,
        trackId: id,
        startBar: startAnchor,
        endBar: startAnchor,
        currentBar: startAnchor,
        durationBars: 0,
        isMicroBypass: initMicroBypass,
        mode: activeActionMode
      });
    }

    const handleMouseMove = (ev: MouseEvent) => {
      if (!laneAreaRef.current) return;
      const currentRect = laneAreaRef.current.getBoundingClientRect();
      const currX = ev.clientX - currentRect.left;
      const currRawBar = Math.max(0, Math.min(16, (currX / currentRect.width) * 16));
      const isMicroBypass = ev.altKey;
      const isOff = isMicroBypass || snapValue === 'off' || snapValue === 'freeform';
      const currSnappedBar = isOff
        ? Number(currRawBar.toFixed(3))
        : Number(snapToGrid(currRawBar, snapValue).toFixed(4));

      if (Math.abs(ev.clientX - startClientX) >= 3 || Math.abs(currSnappedBar - startAnchor) >= 0.01) {
        hasMoved = true;
      }

      const effAnchor = isEraseAction && isMicroBypass ? Number(rawBar.toFixed(3)) : startAnchor;
      const minB = Math.max(0, Math.min(effAnchor, currSnappedBar));
      const maxB = Math.min(16, Math.max(effAnchor, currSnappedBar));
      const dur = Number((maxB - minB).toFixed(4));

      setPaintState({
        isActive: true,
        anchorBar: effAnchor,
        currentBar: currSnappedBar,
        startBar: minB,
        endBar: maxB,
        durationBars: dur,
        hasDragged: hasMoved,
        mode: activeActionMode
      });

      if ((isPaintLaser || isEraseAction) && onPaintChange) {
        onPaintChange({
          isActive: true,
          trackId: id,
          startBar: minB,
          endBar: maxB,
          currentBar: currSnappedBar,
          durationBars: dur,
          isMicroBypass,
          mode: activeActionMode
        });
      }

      // Incremental snapped erase preview (computes against baselineClips so pulling back restores)
      if (isEraseAction && hasMoved) {
        if (dur > 0.005) {
          const nextClips = carveEraseRegionFromClips(baselineClips, minB, maxB);
          if (clipsFingerprint(nextClips) !== clipsFingerprint(latestClipsRef.current)) {
            latestClipsRef.current = nextClips;
            updateTrack(id, { clips: nextClips });
          }
        } else if (clipsFingerprint(latestClipsRef.current) !== baselineFingerprint) {
          latestClipsRef.current = baselineClips;
          updateTrack(id, { clips: baselineClips });
        }
      }
    };

    const handleMouseUp = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (onPaintChange) onPaintChange(null);

      if (isCurveLaser && !isRightClickBeamErase) {
        playLaserBeamSound('laser_curve');
        if (!automation.volume.visible && !automation.pan.visible && !hasVisiblePluginParam) {
          projectHistory.pushSnapshot(`Enable Volume Automation [${name}]`, baselineAllTracks, tempo);
          updateTrack(id, {
            automation: {
              ...automation,
              volume: { ...automation.volume, visible: true }
            }
          });
        }
        setPaintState(null);
        return;
      }

      if (isEraseAction) {
        const endMicro = ev.altKey;
        const endIsOff = endMicro || snapValue === 'off' || snapValue === 'freeform';

        if (hasMoved) {
          let finalStart = startAnchor;
          let finalEnd = startAnchor;
          if (laneAreaRef.current) {
            const endRect = laneAreaRef.current.getBoundingClientRect();
            const endX = ev.clientX - endRect.left;
            const endRawBar = Math.max(0, Math.min(16, (endX / endRect.width) * 16));
            const endSnapped = endIsOff
              ? Number(endRawBar.toFixed(3))
              : Number(snapToGrid(endRawBar, snapValue).toFixed(4));
            const effAnchor = endMicro ? Number(rawBar.toFixed(3)) : startAnchor;
            finalStart = Math.max(0, Math.min(effAnchor, endSnapped));
            finalEnd = Math.min(16, Math.max(effAnchor, endSnapped));
          }
          const finalClips = finalEnd - finalStart > 0.005
            ? carveEraseRegionFromClips(baselineClips, finalStart, finalEnd)
            : baselineClips;
          if (clipsFingerprint(finalClips) !== baselineFingerprint) {
            pointerEraseHandledRef.current = true;
            projectHistory.pushSnapshot(
              `Erase Slice (${(finalEnd - finalStart).toFixed(2)}b) [${name}]`,
              baselineAllTracks,
              tempo
            );
            playLaserBeamSound('laser_erase');
            latestClipsRef.current = finalClips;
            updateTrack(id, { clips: finalClips });
          }
        } else if (ev.shiftKey) {
          // Shift+Click / Shift+Right-Click: delete whole clip under pointer
          const clickedClip =
            baselineClips.find(c => rawBar >= c.startBar && rawBar <= c.startBar + c.durationBars) ||
            baselineClips.find(c => startAnchor >= c.startBar && startAnchor <= c.startBar + c.durationBars);
          if (clickedClip) {
            pointerEraseHandledRef.current = true;
            projectHistory.pushSnapshot(`Delete Clip [${clickedClip.name}]`, baselineAllTracks, tempo);
            playLaserBeamSound('laser_erase');
            const nextClips = baselineClips.filter(c => c.id !== clickedClip.id);
            latestClipsRef.current = nextClips;
            updateTrack(id, { clips: nextClips });
          }
        } else {
          // Single-click incremental erase: carves 1 snapped grid step out of any overlapping clip
          const effStep = endIsOff
            ? (endMicro ? 0.0625 : 0.25)
            : Math.max(0.03125, getSnapStepSize(snapValue));
          const cellStart = Math.max(
            0,
            Math.min(16 - effStep, Number((Math.floor((rawBar + 1e-6) / effStep) * effStep).toFixed(4)))
          );
          const cellEnd = Math.min(16, Number((cellStart + effStep).toFixed(4)));
          const nextClips = carveEraseRegionFromClips(baselineClips, cellStart, cellEnd);
          if (clipsFingerprint(nextClips) !== baselineFingerprint) {
            pointerEraseHandledRef.current = true;
            projectHistory.pushSnapshot(
              `Erase ${effStep}b Step [${name}]`,
              baselineAllTracks,
              tempo
            );
            playLaserBeamSound('laser_erase');
            latestClipsRef.current = nextClips;
            updateTrack(id, { clips: nextClips });
          }
        }
        setPaintState(null);
        return;
      }

      // Audio or MIDI Loop Paint commit (Left-click)
      if (!isEraseAction && isPaintLaser) {
        const endMicro = ev.altKey;
        const endIsOff = endMicro || snapValue === 'off' || snapValue === 'freeform';
        const minPaintStep = endIsOff
          ? 0.03125
          : Math.min(0.25, Math.max(0.03125, getSnapStepSize(snapValue)));
        let finalStart = startAnchor;
        let finalDuration = 2; // Default single-click unit

        if (laneAreaRef.current) {
          const endRect = laneAreaRef.current.getBoundingClientRect();
          const endX = ev.clientX - endRect.left;
          const endRawBar = Math.max(0, Math.min(16, (endX / endRect.width) * 16));
          const endSnappedBar = endIsOff
            ? Number(endRawBar.toFixed(3))
            : Number(snapToGrid(endRawBar, snapValue).toFixed(4));
          
          if (hasMoved) {
            finalStart = Math.max(0, Math.min(startAnchor, endSnappedBar));
            const finalEnd = Math.min(16, Math.max(startAnchor, endSnappedBar));
            finalDuration = Math.max(minPaintStep, Number((finalEnd - finalStart).toFixed(4)));
          } else {
            finalStart = Math.max(0, Math.min(14, startAnchor));
            finalDuration = Math.min(2, Math.max(0.5, 16 - finalStart));
          }
        }

        // Find nearest existing clip on track to clone its loop profile if available
        const sourceClip = clips.length > 0 ? clips[clips.length - 1] : null;

        // Generate MIDI notes if MIDI laser
        let motifNotes: any = undefined;
        if (isMidiLaser || type === 'midi') {
          const isHumanize = track.midiConfig?.humanizeEnabled ?? track.humanizeEnabled ?? true;
          const jitterAmt = track.midiConfig?.humanizeAmount ?? track.humanizeAmount ?? 0.18;
          const baseVel = 95;
          const maxDelta = Math.round(jitterAmt * 80);
          // Repeating loop motif: 4 steps per bar
          const totalSteps = Math.max(2, Math.round(finalDuration * 2));
          const basePitches = [60, 63, 67, 70, 65, 68, 72, 60]; // C minor / pentatonic groove
          
          motifNotes = Array.from({ length: totalSteps }).map((_, stepIdx) => {
            const p = basePitches[stepIdx % basePitches.length];
            const velOffset = isHumanize ? Math.round((Math.random() * 2 - 1) * maxDelta) : 0;
            return {
              id: `mn-${Date.now()}-${stepIdx}`,
              pitch: p,
              noteName: midiToNoteName(p),
              startBar: stepIdx * 0.5,
              startTimeSeconds: stepIdx * 0.5 * 2,
              durationBars: 0.45,
              durationSeconds: 0.9,
              velocity: Math.max(20, Math.min(127, baseVel + velOffset)),
              confidence: 1.0
            };
          });
        }

        const loopName = sourceClip 
          ? `${sourceClip.name}`
          : isMidiLaser || type === 'midi'
            ? `${name} Synth Groove`
            : `${name} Audio Loop`;

        const newClip: Clip = {
          id: `clip-paint-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          name: loopName,
          startBar: Number(finalStart.toFixed(4)),
          durationBars: Number(finalDuration.toFixed(4)),
          isMidi: isMidiLaser || type === 'midi',
          midiNotes: (isMidiLaser || type === 'midi') ? (sourceClip?.midiNotes || motifNotes) : undefined,
          waveformSnippet: sourceClip?.waveformSnippet || Array.from({ length: 32 }, (_, i) => 0.3 + 0.6 * Math.abs(Math.sin(i * 0.6))),
          audioUrl: sourceClip?.audioUrl,
          instrument: track.instrument || 'SFZ Grand Piano'
        };

        projectHistory.pushSnapshot(`Paint Loop (${finalDuration.toFixed(2)} Bars) on [${name}]`, allTracks || [track], tempo);
        playLaserBeamSound(isMidiLaser || type === 'midi' ? 'laser_midi' : 'laser_audio');

        // Add clip to track
        updateTrack(id, { clips: [...clips, newClip] });
      }

      setPaintState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Direct Clip Edge Pull-Back / Trim, Extend & Non-Destructive Time Stretch Handler
  const handleClipEdgeMouseDown = (e: React.MouseEvent, clip: Clip, edge: 'start' | 'end') => {
    const isEraseTool = activeTool === 'laser_erase' || activeTool === 'erase';
    if (isEraseTool || e.button !== 0) return;

    e.stopPropagation();
    const startX = e.clientX;
    const initialStart = clip.startBar;
    const initialEnd = clip.startBar + clip.durationBars;
    const isMidiClip = Boolean(clip.isMidi || type === 'midi');
    const origDurationBars = clip.originalDurationBars ?? clip.durationBars;
    let lastDurationBars = clip.durationBars;
    let lastWasStretch = false;
    let hasMoved = false;
    let hasRecordedSnapshot = false;

    const handleMouseMove = (ev: MouseEvent) => {
      if (!laneAreaRef.current) return;
      const rect = laneAreaRef.current.getBoundingClientRect();
      const deltaX = ev.clientX - startX;
      const isTimeStretchDrag =
        edge === 'end' && !isMidiClip && (Boolean(clip.timeStretchEnabled) || ev.ctrlKey || ev.metaKey || e.ctrlKey || e.metaKey);

      if (Math.abs(deltaX) >= 2) {
        hasMoved = true;
        if (!hasRecordedSnapshot) {
          projectHistory.pushSnapshot(
            isTimeStretchDrag
              ? `Time Stretch Clip [${clip.name}]`
              : `${edge === 'end' ? 'Trim End' : 'Trim Start'} Clip [${clip.name}]`,
            allTracks || [track],
            tempo
          );
          hasRecordedSnapshot = true;
        }
      }
      if (!hasMoved) return;

      const isMicroBypass = ev.altKey;
      const isOff = isMicroBypass || snapValue === 'off' || snapValue === 'freeform';
      const stepSize = getSnapStepSize(snapValue);
      const minDuration = isOff ? 0.03125 : Math.min(0.25, Math.max(0.03125, stepSize));
      const deltaBars = (deltaX / rect.width) * 16;

      setResizingClipId(clip.id);

      if (edge === 'end') {
        const rawEnd = Math.max(initialStart + minDuration, Math.min(16, initialEnd + deltaBars));
        const snappedEnd = isOff
          ? Number(rawEnd.toFixed(3))
          : Number(snapToGrid(rawEnd, snapValue).toFixed(4));
        const finalEnd = Math.max(initialStart + minDuration, Math.min(16, snappedEnd));
        const finalDuration = Number((finalEnd - initialStart).toFixed(4));
        lastDurationBars = finalDuration;
        lastWasStretch = isTimeStretchDrag;

        if (isTimeStretchDrag) {
          const ratio = Number(Math.max(0.25, Math.min(4.0, origDurationBars / Math.max(0.03125, finalDuration))).toFixed(4));
          const preservePitch = clip.preservePitch ?? true;

          if (onDragSnapChange) {
            onDragSnapChange({
              trackId: id,
              clipName: clip.name,
              startBar: initialStart,
              endBar: finalEnd,
              isSnapped: !isOff,
              mode: 'time-stretch',
              stretchRatio: ratio,
              preservePitch,
              isMicroBypass
            });
          }

          updateTrack(id, {
            clips: clips.map(c =>
              c.id === clip.id
                ? {
                    ...c,
                    durationBars: finalDuration,
                    originalDurationBars: origDurationBars,
                    timeStretchRatio: ratio,
                    preservePitch
                  }
                : c
            )
          });
        } else {
          if (onDragSnapChange) {
            onDragSnapChange({
              trackId: id,
              clipName: clip.name,
              startBar: initialStart,
              endBar: finalEnd,
              isSnapped: !isOff,
              mode: 'trim-end',
              isMicroBypass
            });
          }

          updateTrack(id, {
            clips: clips.map(c => (c.id === clip.id ? { ...c, durationBars: finalDuration } : c))
          });
        }
      } else {
        const rawStart = Math.max(0, Math.min(initialEnd - minDuration, initialStart + deltaBars));
        const snappedStart = isOff
          ? Number(rawStart.toFixed(3))
          : Number(snapToGrid(rawStart, snapValue).toFixed(4));
        const finalStart = Math.max(0, Math.min(initialEnd - minDuration, snappedStart));
        const finalDuration = Number((initialEnd - finalStart).toFixed(4));

        if (onDragSnapChange) {
          onDragSnapChange({
            trackId: id,
            clipName: clip.name,
            startBar: finalStart,
            endBar: initialEnd,
            isSnapped: !isOff,
            mode: 'trim-start',
            isMicroBypass
          });
        }

        updateTrack(id, {
          clips: clips.map(c =>
            c.id === clip.id
              ? { ...c, startBar: finalStart, durationBars: finalDuration }
              : c
          )
        });
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setResizingClipId(null);
      if (onDragSnapChange) {
        onDragSnapChange(null);
      }
      if (hasMoved && lastWasStretch) {
        const origBuf = audioService.getOriginalTrackAudioBuffer(id);
        const ctx = audioService.ensureContext();
        if (origBuf && ctx) {
          const stretchFactor = lastDurationBars / Math.max(0.03125, origDurationBars);
          const stretchedBuf = timeStretchBufferPreservePitch(
            ctx,
            origBuf,
            stretchFactor,
            clip.preservePitch ?? true
          );
          audioService.setTrackAudioBuffer(id, stretchedBuf, true);
        }
      }
      if (hasMoved) {
        playLaserBeamSound('laser_select');
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleClipMouseDown = (e: React.MouseEvent, clip: Clip) => {
    const isEraseTool = activeTool === 'laser_erase' || activeTool === 'erase';
    if (isEraseTool || e.button !== 0) {
      return;
    }

    const isSelectAction = e.shiftKey || e.metaKey || e.ctrlKey || activeTool === 'laser_select' || activeTool === 'select';
    e.stopPropagation();
    const startX = e.clientX;
    const initialStartBar = clip.startBar;
    let hasMoved = false;
    let hasRecordedSnapshot = false;

    const handleMouseMove = (ev: MouseEvent) => {
      if (!laneAreaRef.current) return;
      const rect = laneAreaRef.current.getBoundingClientRect();
      const deltaX = ev.clientX - startX;
      
      if (Math.abs(deltaX) > 2) {
        hasMoved = true;
        if (!hasRecordedSnapshot) {
          projectHistory.pushSnapshot(`Move Clip [${clip.name}]`, allTracks || [track], tempo);
          hasRecordedSnapshot = true;
        }
      }
      if (!hasMoved) return;

      const deltaBars = (deltaX / rect.width) * 16;
      const rawBar = initialStartBar + deltaBars;
      const maxBar = Math.max(0, 16 - clip.durationBars);
      const clampedRaw = Math.max(0, Math.min(maxBar, rawBar));

      const isMicroBypass = ev.altKey;
      const isOff = isMicroBypass || snapValue === 'off' || snapValue === 'freeform';
      const finalBar = isOff
        ? Number(clampedRaw.toFixed(3))
        : Math.max(0, Math.min(maxBar, Number(snapToGrid(clampedRaw, snapValue).toFixed(4))));

      setDraggingClipId(clip.id);
      setDragPreviewStartBar(finalBar);
      if (onDragSnapChange) {
        onDragSnapChange({
          trackId: id,
          clipName: clip.name,
          startBar: finalBar,
          endBar: finalBar + clip.durationBars,
          isSnapped: !isOff,
          mode: 'move',
          isMicroBypass
        });
      }

      const updatedClips = clips.map(c => c.id === clip.id ? { ...c, startBar: finalBar } : c);
      updateTrack(id, { clips: updatedClips });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setDraggingClipId(null);
      setDragPreviewStartBar(null);
      if (onDragSnapChange) {
        onDragSnapChange(null);
      }
      if (!hasMoved) {
        if (isSelectAction && onToggleSelectClip) {
          onToggleSelectClip(clip.id, true);
          playLaserBeamSound('laser_select');
        } else {
          onEdit(clip);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleNudgeClip = (e: React.MouseEvent, clipId: string, direction: -1 | 1) => {
    e.stopPropagation();
    let step = 0.25;
    if (snapValue === '1/1') step = 1.0;
    else if (snapValue === '1/2') step = 0.5;
    else if (snapValue === '1/4') step = 0.25;
    else if (snapValue === '1/8') step = 0.125;
    else if (snapValue === '1/16') step = 0.0625;
    else if (snapValue === '1/32') step = 0.03125;
    else if (snapValue === '1/8T' || snapValue === 'triplet' || snapValue === '1/12' || snapValue === '1/8 T') step = 1 / 12;
    else if (snapValue === '1/16T' || snapValue === '1/24') step = 1 / 24;
    else if (snapValue === 'off' || snapValue === 'freeform') step = 0.0625;

    const targetClip = clips.find(c => c.id === clipId);
    if (!targetClip) return;
    const maxBar = Math.max(0, 16 - targetClip.durationBars);
    const newBar = Math.max(0, Math.min(maxBar, Number((targetClip.startBar + direction * step).toFixed(4))));
    
    projectHistory.pushSnapshot(`Nudge Clip [${targetClip.name}] ${direction > 0 ? '▶' : '◀'}`, allTracks || [track], tempo);
    const updatedClips = clips.map(c => c.id === clipId ? { ...c, startBar: newBar } : c);
    updateTrack(id, { clips: updatedClips });
  };

  const handleDuplicateClip = (e: React.MouseEvent, clip: Clip) => {
    e.stopPropagation();
    const maxBar = Math.max(0, 16 - clip.durationBars);
    const targetStart = Math.min(maxBar, clip.startBar + clip.durationBars);
    const isOff = snapValue === 'off' || snapValue === 'freeform';
    const snappedStart = isOff ? targetStart : snapToGrid(targetStart, snapValue);

    const duplicated: Clip = {
      ...clip,
      id: `clip-dup-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: `${clip.name} (Copy)`,
      startBar: Math.min(maxBar, Number(snappedStart.toFixed(4)))
    };

    projectHistory.pushSnapshot(`Duplicate Clip [${clip.name}]`, allTracks || [track], tempo);
    playLaserBeamSound('laser_curve');
    updateTrack(id, { clips: [...clips, duplicated] });
  };

  const handleSplitClip = (e: React.MouseEvent, clip: Clip) => {
    e.stopPropagation();
    if (clip.durationBars <= 0.25) return;

    // Check if playhead intersects clip, otherwise split in half
    const playheadBar = playheadPosition * 16;
    let splitPointBars = clip.durationBars / 2;
    if (playheadBar > clip.startBar && playheadBar < clip.startBar + clip.durationBars) {
      splitPointBars = Number((playheadBar - clip.startBar).toFixed(4));
    }
    splitPointBars = Math.max(0.125, Math.min(clip.durationBars - 0.125, splitPointBars));

    const firstHalf: Clip = {
      ...clip,
      id: `clip-split-a-${Date.now()}`,
      name: `${clip.name} Pt.1`,
      durationBars: splitPointBars
    };

    const secondHalf: Clip = {
      ...clip,
      id: `clip-split-b-${Date.now()}`,
      name: `${clip.name} Pt.2`,
      startBar: Number((clip.startBar + splitPointBars).toFixed(4)),
      durationBars: Number((clip.durationBars - splitPointBars).toFixed(4))
    };

    projectHistory.pushSnapshot(`Split Clip [${clip.name}]`, allTracks || [track], tempo);
    playLaserBeamSound('laser_select');
    updateTrack(id, { clips: clips.map(c => c.id === clip.id ? firstHalf : c).concat(secondHalf) });
  };

  const removeClip = (clipId: string) => {
    const target = clips.find(c => c.id === clipId);
    projectHistory.pushSnapshot(`Delete Clip [${target?.name || clipId}]`, allTracks || [track], tempo);
    playLaserBeamSound('laser_erase');
    updateTrack(id, { clips: clips.filter(c => c.id !== clipId) });
  };

  // Check if automation overlay should be rendered on top of clips
  const showDirectOverlay = (automation.volume.visible || automation.pan.visible || hasVisiblePluginParam) && !isExpanded;
  const activeOverlayPluginLane = activeParam !== 'volume' && activeParam !== 'pan'
    ? automation.params?.[activeParam] || visiblePluginParams[0]
    : visiblePluginParams[0];

  return (
    <div className="border-b border-[#1A2234] bg-[#07090E] flex flex-col transition-colors" data-track-id={id}>
      {/* Primary Track Row */}
      <div className="h-16 flex items-stretch relative">
        {/* Track Header */}
        <div 
          onClick={() => onSelectTrack?.(id)}
          className={`w-64 border-r p-2 flex flex-col justify-between shrink-0 select-none z-10 transition-all cursor-pointer ${
            isSelected 
              ? isArmedForRecord
                ? 'bg-[#180E14] border-r-2 border-r-red-500 ring-1 ring-inset ring-red-500/60 shadow-[inset_0_0_12px_rgba(239,68,68,0.2)]'
                : 'bg-[#0E1524] border-r-2 border-r-[#00F0FF] ring-1 ring-inset ring-[#00F0FF]/40 shadow-[inset_0_0_12px_rgba(0,240,255,0.15)]'
              : 'border-[#1E293B] bg-[#0A0D15] hover:bg-[#0E121E]'
          }`}
        >
          {/* Top Row: Track Number, Name, Type icon, M/S/Phase */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              {/* Color tag & Track index */}
              <div 
                className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono font-bold text-black shrink-0 shadow-sm"
                style={{ backgroundColor: color }}
              >
                {String(trackIndex + 1).padStart(2, '0')}
              </div>
              <div className="truncate flex items-center gap-1 min-w-0">
                {type === 'midi' ? (
                  <Music size={11} className="text-[#A855F7] shrink-0" />
                ) : (
                  <Waves size={11} className="text-[#38BDF8] shrink-0" />
                )}
                <span className="text-xs font-semibold text-[#E2E8F0] truncate" title={name}>
                  {name}
                </span>
              </div>
            </div>

            {/* Record Arm, Mute, Solo, Phase Buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleToggleArmRecord}
                className={`px-1.5 h-5 rounded text-[8px] font-mono font-bold transition-all flex items-center gap-0.5 ${
                  isArmedForRecord 
                    ? 'bg-[#EF4444] text-white border border-[#EF4444] shadow-[0_0_8px_#EF4444] animate-pulse' 
                    : 'bg-[#181116] text-[#78350F] border border-[#3E1B1B] hover:text-[#EF4444] hover:border-[#EF4444]/40'
                }`}
                title={
                  isArmedForRecord 
                    ? isAutoArmMode && isSelected 
                      ? "Track Auto-Armed on Selection (Ready for Live Record)" 
                      : "Track Armed for Live Recording" 
                    : "Arm Track for Recording"
                }
              >
                <CircleDot size={8} className={isArmedForRecord ? 'animate-ping' : ''} />
                <span>{isArmedForRecord && isAutoArmMode && isSelected ? 'AUTO' : 'REC'}</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); updateTrack(id, { muted: !muted }); }}
                className={`w-5 h-5 rounded text-[9px] font-mono font-bold transition-all ${
                  muted 
                    ? 'bg-[#EF4444] text-white border border-[#EF4444] shadow-[0_0_6px_rgba(239,68,68,0.5)]' 
                    : 'bg-[#121622] text-[#64748B] border border-[#1E293B] hover:text-[#94A3B8]'
                }`}
                title="Mute Track"
              >
                M
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); updateTrack(id, { soloed: !soloed }); }}
                className={`w-5 h-5 rounded text-[9px] font-mono font-bold transition-all ${
                  soloed 
                    ? 'bg-[#F59E0B] text-black border border-[#F59E0B] shadow-[0_0_6px_rgba(245,158,11,0.5)]' 
                    : 'bg-[#121622] text-[#64748B] border border-[#1E293B] hover:text-[#94A3B8]'
                }`}
                title="Solo Track"
              >
                S
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); updateTrack(id, { phaseInverted: !phaseInverted }); }}
                className={`w-5 h-5 rounded text-[9px] font-mono font-bold transition-all ${
                  phaseInverted 
                    ? 'bg-[#A855F7] text-white border border-[#A855F7]' 
                    : 'bg-[#121622] text-[#64748B] border border-[#1E293B] hover:text-[#94A3B8]'
                }`}
                title="Invert Phase (Ø)"
              >
                Ø
              </button>
            </div>
          </div>

          {/* Bottom Row: Envelope Toggles (Vol / Pan) & Expand Drawer */}
          <div className="flex items-center justify-between gap-1 mt-1 pt-1 border-t border-[#131B2A]">
            <div className="flex items-center gap-1">
              {/* Volume Envelope Toggle */}
              <button
                onClick={handleToggleVolumeEnv}
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold flex items-center gap-1 transition-all ${
                  automation.volume.visible 
                    ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF] shadow-[0_0_6px_rgba(0,240,255,0.4)]' 
                    : 'bg-[#121622] text-[#64748B] border border-[#1E293B] hover:text-[#00F0FF]'
                }`}
                title="Toggle Volume Automation Envelope"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${automation.volume.visible ? 'bg-[#00F0FF]' : 'bg-[#475569]'}`} />
                <span>VOL</span>
              </button>

              {/* Pan Envelope Toggle */}
              <button
                onClick={handleTogglePanEnv}
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold flex items-center gap-1 transition-all ${
                  automation.pan.visible 
                    ? 'bg-[#FF8C00]/20 text-[#FF8C00] border border-[#FF8C00] shadow-[0_0_6px_rgba(255,140,0,0.4)]' 
                    : 'bg-[#121622] text-[#64748B] border border-[#1E293B] hover:text-[#FF8C00]'
                }`}
                title="Toggle Pan Automation Envelope"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${automation.pan.visible ? 'bg-[#FF8C00]' : 'bg-[#475569]'}`} />
                <span>PAN</span>
              </button>

              {/* Plugin FX Parameter Envelopes Toggle */}
              {pluginParamsList.length > 0 && (
                <button
                  onClick={handleTogglePluginEnvs}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold flex items-center gap-1 transition-all ${
                    hasVisiblePluginParam
                      ? 'bg-[#EC4899]/20 text-[#EC4899] border border-[#EC4899] shadow-[0_0_6px_rgba(236,72,153,0.4)]'
                      : 'bg-[#121622] text-[#8C9BBF] border border-[#1E293B] hover:text-[#EC4899]'
                  }`}
                  title={`Toggle ${pluginParamsList.length} Faust/VST Parameter Automation Lane(s)`}
                >
                  <Cpu size={9} />
                  <span>FX {pluginParamsList.length}</span>
                </button>
              )}

              {/* MIDI Humanize Quick Toggle */}
              {type === 'midi' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const cur = track.midiConfig?.humanizeEnabled ?? track.humanizeEnabled ?? true;
                    updateTrack(id, {
                      humanizeEnabled: !cur,
                      midiConfig: {
                        ...track.midiConfig,
                        humanizeEnabled: !cur,
                        humanizeAmount: track.midiConfig?.humanizeAmount ?? track.humanizeAmount ?? 0.18
                      }
                    });
                    playLaserBeamSound('laser_select');
                  }}
                  className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold flex items-center gap-0.5 transition-all ${
                    (track.midiConfig?.humanizeEnabled ?? track.humanizeEnabled ?? true)
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 shadow-[0_0_6px_rgba(16,185,129,0.3)]'
                      : 'bg-[#121622] text-[#64748B] border border-[#1E293B]'
                  }`}
                  title="MIDI Humanize: Applies subtle randomized velocity offsets to synthetic notes"
                >
                  <Sparkles size={8} className="text-emerald-400" />
                  <span>HUMAN</span>
                </button>
              )}

              {/* Volume & Pan values preview */}
              <span className="text-[9px] font-mono text-[#64748B] ml-1">
                {volumeToDb(volume)}
              </span>

              {/* Auto-Arm Active Indicator Badge */}
              {isSelected && isAutoArmMode && isArmedForRecord && (
                <span className="px-1 py-0.2 rounded bg-red-950/80 text-red-300 border border-red-700/60 text-[8px] font-mono font-bold animate-pulse flex items-center gap-0.5 ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  AUTO-ARMED
                </span>
              )}
            </div>

            {/* Expand / Collapse Sub-Lane Button */}
            <button
              onClick={handleToggleExpanded}
              className={`p-1 rounded text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors flex items-center gap-0.5 text-[9px] font-mono`}
              title={isExpanded ? 'Collapse Automation Lanes' : 'Expand Automation Lanes'}
            >
              <span>ENV</span>
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          </div>
        </div>

        {/* Clip and Track Sequencer Area */}
        <div 
          ref={laneAreaRef}
          data-beam-paint-lane={isPaintBeamMode ? 'true' : undefined}
          className="flex-1 h-full relative overflow-hidden group select-none"
          style={{ cursor: getLaserPointerCursor(activeTool) }}
          onMouseDown={handleLaneMouseDown}
          onContextMenu={(e) => {
            if (isPaintBeamMode && !e.ctrlKey) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          {/* Subtle horizontal track background & beat grid */}
          {gridLines.map(line => (
            <div 
              key={line} 
              className={`absolute top-0 bottom-0 w-px ${
                line % 16 === 0 
                  ? 'bg-[#334155]/60' 
                  : line % 4 === 0 
                    ? 'bg-[#1E293B]/40' 
                    : 'bg-[#0F172A]/25'
              }`} 
              style={{ left: `${(line / (totalBeats * 4)) * 100}%` }} 
            />
          ))}

          {/* Clips Rendered Across Timeline */}
          {clips.map(clip => {
            const isEraseTool = activeTool === 'laser_erase' || activeTool === 'erase';
            const isMidiClip = clip.isMidi || type === 'midi';
            const isCurrentlyDragging = draggingClipId === clip.id;
            const isCurrentlyResizing = resizingClipId === clip.id;
            const isClipSelected = selectedClipIds.includes(clip.id);
            const hasCustomColor = Boolean(clip.color);
            const effectiveClipColor = clip.color || (isMidiClip ? '#10B981' : (color || '#00F0FF'));
            const matchedSectionPreset = clip.color
              ? CLIP_SECTION_COLOR_PRESETS.find(
                  p => p.color.toLowerCase() === clip.color?.toLowerCase()
                )
              : undefined;

            return (
              <div 
                key={clip.id}
                data-clip-id={clip.id}
                data-track-id={id}
                className={`absolute top-1.5 bottom-1.5 rounded flex flex-col justify-between p-1 overflow-hidden shadow-md group/clip select-none ${
                  isCurrentlyDragging || isCurrentlyResizing ? 'transition-none' : 'transition-colors'
                } ${
                  isEraseTool
                    ? isMidiClip
                      ? 'bg-[#061510] border border-[#10B981]/45 hover:border-[#EF4444] hover:shadow-[0_0_10px_rgba(239,68,68,0.55)]'
                      : 'bg-[#0B1322] border border-[#26619C]/80 hover:border-[#EF4444] hover:shadow-[0_0_10px_rgba(239,68,68,0.55)]'
                    : isCurrentlyDragging
                      ? 'cursor-grabbing ring-2 ring-[#FF8C00] shadow-[0_0_15px_rgba(255,140,0,0.6)] z-30'
                      : isCurrentlyResizing
                        ? 'cursor-ew-resize ring-2 ring-[#00F0FF] shadow-[0_0_16px_rgba(0,240,255,0.55)] z-30'
                        : isClipSelected
                          ? isMidiClip
                            ? 'cursor-grab active:cursor-grabbing bg-[#0A221A] border border-[#FFD700] ring-1 ring-[#FFD700]/70 z-20'
                            : 'cursor-grab active:cursor-grabbing bg-[#101C33] border border-[#FFD700] ring-1 ring-[#FFD700]/70 z-20'
                          : isMidiClip 
                            ? 'cursor-grab active:cursor-grabbing bg-[#061510] border border-[#10B981]/50 hover:border-[#10B981]' 
                            : 'cursor-grab active:cursor-grabbing bg-[#0B1322] border border-[#26619C] hover:border-[#00F0FF]'
                }`}
                style={{ 
                  left: `${(clip.startBar / 16) * 100}%`, 
                  width: `${(clip.durationBars / 16) * 100}%`,
                  borderLeftWidth: '3px',
                  borderLeftColor: isClipSelected ? '#FFD700' : effectiveClipColor,
                  ...(hasCustomColor
                    ? {
                        backgroundColor: hexToRgba(clip.color!, isClipSelected ? 0.26 : 0.16),
                        borderColor: isClipSelected ? '#FFD700' : hexToRgba(clip.color!, 0.72),
                        boxShadow: isClipSelected
                          ? '0 0 10px rgba(255,215,0,0.35)'
                          : `inset 0 1px 0 ${hexToRgba(clip.color!, 0.3)}`
                      }
                    : {})
                }}
                onMouseDown={(e) => handleClipMouseDown(e, clip)}
                onContextMenu={(e) => {
                  if (isPaintBeamMode && !e.ctrlKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                  // Beam Mode OFF (or Ctrl+Right-Click): allow event to bubble cleanly to StudioContextMenu
                }}
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (isEraseTool) {
                    if (pointerEraseHandledRef.current) {
                      pointerEraseHandledRef.current = false;
                      return;
                    }
                    removeClip(clip.id);
                  }
                }}
                title={
                  isEraseTool
                    ? `${clip.name} — Click to erase snapped step · Drag to carve slice · Shift+Click to delete whole clip`
                    : isPaintBeamMode
                      ? `${clip.name} — Left-drag: move/edge-trim · Right-click/drag: snap erase · Ctrl+Right-click: Studio Menu · Palette dot: color`
                      : `${clip.name}${matchedSectionPreset ? ` [${matchedSectionPreset.label}]` : ''} (Start: Bar ${clip.startBar.toFixed(2)} • Right-click: Studio Menu • Palette dot: clip color • Click to edit)`
                }
              >
                {/* Clip Title Bar */}
                <div className="flex items-center justify-between text-[9px] font-mono text-[#94A3B8] truncate gap-1">
                  <div className="flex items-center gap-1 truncate">
                    {isMidiClip && onToggleSelectClip && (
                      <button
                        type="button"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSelectClip(clip.id, true);
                          playLaserBeamSound('laser_select');
                        }}
                        className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center shrink-0 text-[8px] font-bold transition-colors cursor-pointer ${
                          isClipSelected
                            ? 'bg-[#FFD700] border-[#FFD700] text-black'
                            : 'bg-black/50 border-[#10B981]/50 text-transparent hover:border-[#FFD700]'
                        }`}
                        title={isClipSelected ? 'Selected for MIDI Quantize (Click to deselect)' : 'Select MIDI clip for Quantize'}
                      >
                        ✓
                      </button>
                    )}
                    {!isEraseTool && (
                      <GripVertical size={9} className="opacity-40 hover:opacity-100 shrink-0 text-[#94A3B8]" />
                    )}
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => openClipColorPicker(e, clip.id)}
                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/50 hover:scale-125 transition-transform cursor-pointer"
                      style={{
                        backgroundColor: effectiveClipColor,
                        boxShadow: hasCustomColor ? `0 0 6px ${effectiveClipColor}` : undefined
                      }}
                      title={
                        matchedSectionPreset
                          ? `Section Color: ${matchedSectionPreset.label} (Click to change)`
                          : 'Pick Clip Section Color'
                      }
                      aria-label={`Change color for clip ${clip.name}`}
                    />
                    {isMidiClip ? (
                      <Music size={10} className="shrink-0" style={{ color: effectiveClipColor }} />
                    ) : (
                      <Waves size={10} className="shrink-0" style={{ color: effectiveClipColor }} />
                    )}
                    <span className="truncate font-semibold text-white/95">{clip.name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Quick Color, Nudge, Duplicate, Split & Delete Buttons on hover */}
                    <div className="hidden group-hover/clip:flex items-center bg-black/85 rounded px-1 py-0.5 border border-[#334155]/80 text-[8px] gap-1 z-20">
                      <button
                        type="button"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => openClipColorPicker(e, clip.id)}
                        className="hover:text-[#00F0FF] px-0.5 flex items-center cursor-pointer"
                        style={{ color: clip.color || '#CBD5E1' }}
                        title="Clip Color Picker (Group Verse / Chorus / Bridge)"
                      >
                        <Palette size={9} />
                      </button>
                      <button 
                        onClick={(e) => handleNudgeClip(e, clip.id, -1)}
                        className="hover:text-amber-400 px-0.5" 
                        title={`Nudge back by ${snapValue} grid`}
                      >
                        ◀
                      </button>
                      <button 
                        onClick={(e) => handleNudgeClip(e, clip.id, 1)}
                        className="hover:text-amber-400 px-0.5"
                        title={`Nudge forward by ${snapValue} grid`}
                      >
                        ▶
                      </button>
                      <button
                        onClick={(e) => handleDuplicateClip(e, clip)}
                        className="hover:text-cyan-400 px-0.5 flex items-center"
                        title="Duplicate Clip (Undoable with Ctrl+Z)"
                      >
                        <Copy size={9} />
                      </button>
                      <button
                        onClick={(e) => handleSplitClip(e, clip)}
                        className="hover:text-yellow-400 px-0.5 flex items-center"
                        title="Split Clip at playhead or midpoint (Undoable with Ctrl+Z)"
                      >
                        <Scissors size={9} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeClip(clip.id); }}
                        className="hover:text-red-400 px-0.5 flex items-center"
                        title="Delete Clip (Undoable with Ctrl+Z)"
                      >
                        <Trash2 size={9} />
                      </button>
                    </div>

                    {(clip.timeStretchEnabled || (clip.timeStretchRatio !== undefined && Math.abs(clip.timeStretchRatio - 1) > 0.005)) && (
                      <span
                        className="inline-flex items-center gap-0.5 text-[8px] font-mono font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-1 rounded"
                        title={`Non-Destructive Time Stretch (${(clip.timeStretchRatio ?? 1).toFixed(2)}x${clip.preservePitch !== false ? ', Pitch Locked' : ''}) — drag right edge to adjust`}
                      >
                        <ArrowLeftRight size={8} />
                        {(clip.timeStretchRatio ?? 1).toFixed(2)}x
                      </span>
                    )}
                    {clip.chronoPins && clip.chronoPins.length > 0 && (
                      <span
                        className="inline-flex items-center gap-0.5 text-[8px] font-mono font-bold text-[#FFD700] bg-[#FFD700]/10 border border-[#FFD700]/40 px-1 rounded"
                        title={`${clip.chronoPins.length} ChronoPins attached to measures`}
                      >
                        <Pin size={8} />
                        {clip.chronoPins.length}
                      </span>
                    )}
                    <span className="text-[8px] font-mono font-bold text-amber-300/90 bg-amber-950/70 border border-amber-500/30 px-1 rounded">
                      {clip.startBar.toFixed(2)}b
                    </span>
                    <span className="text-[8px] opacity-60">{clip.durationBars}b</span>
                  </div>
                </div>

                {/* Drag Snap Indicator Overlay */}
                {isCurrentlyDragging && (
                  <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-10 ${
                    snapValue === 'off' || snapValue === 'freeform' ? 'bg-sky-500/15' : 'bg-[#FF8C00]/20'
                  }`}>
                    <span className={`px-1.5 py-0.5 rounded bg-black/90 border text-[9px] font-mono font-bold shadow-lg ${
                      snapValue === 'off' || snapValue === 'freeform'
                        ? 'border-sky-400 text-sky-300'
                        : 'border-[#FF8C00] text-[#FF8C00]'
                    }`}>
                      {snapValue === 'off' || snapValue === 'freeform'
                        ? `FREEFORM: BAR ${clip.startBar.toFixed(2)}`
                        : `SNAP ${snapValue}: BAR ${clip.startBar.toFixed(2)}`}
                    </span>
                  </div>
                )}

                {/* Waveform / MIDI Note Matrix Representation */}
                {isMidiClip ? (
                  <div className="flex flex-col justify-around h-6 w-full opacity-80 overflow-hidden py-0.5 relative">
                    {clip.midiNotes && clip.midiNotes.length > 0 ? (
                      <div className="relative w-full h-full">
                        {clip.midiNotes.slice(0, 24).map(mn => {
                          const relLeft = (mn.startBar / clip.durationBars) * 100;
                          const relWidth = Math.max(3, (mn.durationBars / clip.durationBars) * 100);
                          const pitchY = ((84 - Math.max(36, Math.min(84, mn.pitch))) / 48) * 100;
                          const velAlpha = 0.5 + (mn.velocity / 127) * 0.5;
                          return (
                            <div
                              key={mn.id}
                              className="absolute rounded-xs"
                              style={{
                                left: `${relLeft}%`,
                                width: `${relWidth}%`,
                                top: `${pitchY}%`,
                                height: '2px',
                                opacity: velAlpha,
                                backgroundColor: clip.color || '#10B981'
                              }}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <>
                        {/* Simulated MIDI Piano Roll Steps */}
                        <div className="flex gap-1 h-1.5">
                          <div
                            className="w-3 rounded-xs"
                            style={{ backgroundColor: clip.color || '#10B981', boxShadow: `0 0 4px ${clip.color || '#10B981'}` }}
                          />
                          <div className="w-5 rounded-xs ml-2" style={{ backgroundColor: clip.color || '#10B981' }} />
                          <div className="w-2 rounded-xs ml-1" style={{ backgroundColor: clip.color || '#10B981' }} />
                        </div>
                        <div className="flex gap-1 h-1.5">
                          <div className="w-4 rounded-xs ml-4 opacity-85" style={{ backgroundColor: clip.color || '#34D399' }} />
                          <div className="w-3 rounded-xs ml-2 opacity-85" style={{ backgroundColor: clip.color || '#34D399' }} />
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-0.5 h-6 w-full opacity-70 overflow-hidden">
                    {Array.from({ length: 28 }).map((_, wIdx) => {
                      const barH = 20 + Math.sin((wIdx + clip.startBar * 2) * 0.8) * 14;
                      return (
                        <div 
                          key={wIdx} 
                          className="flex-1 rounded-full" 
                          style={{ 
                            height: `${Math.max(4, barH)}px`,
                            backgroundColor: clip.color || color || '#00F0FF',
                            opacity: 0.85
                          }} 
                        />
                      );
                    })}
                  </div>
                )}

                {/* Subtle Hover-Only Red Trim Ring when Red Eraser is active (keeps waveform & grid readable) */}
                {isEraseTool && (
                  <div className="absolute inset-0 border border-[#EF4444]/0 group-hover/clip:border-[#EF4444]/75 bg-[#EF4444]/0 group-hover/clip:bg-[#EF4444]/10 transition-colors pointer-events-none" />
                )}

                {/* ChronoPin Anchor Ticks on Clip */}
                {!isMidiClip && clip.chronoPins && clip.chronoPins.length > 0 && (() => {
                  const clipDurSec = Math.max(0.2, (clip.durationBars * 4 * 60) / (tempo || 120));
                  return (
                    <div className="absolute inset-0 pointer-events-none z-10">
                      {clip.chronoPins.slice(0, 24).map(pin => {
                        const pct = Math.max(0, Math.min(100, (pin.timeSeconds / clipDurSec) * 100));
                        return (
                          <div
                            key={pin.id}
                            className="absolute top-0 bottom-0 w-px"
                            style={{
                              left: `${pct}%`,
                              backgroundColor: pin.isDownbeat ? 'rgba(255, 215, 0, 0.7)' : 'rgba(0, 240, 255, 0.45)'
                            }}
                          >
                            <div
                              className="w-1.5 h-1.5 -ml-[2px] rounded-full"
                              style={{ backgroundColor: pin.isDownbeat ? '#FFD700' : '#00F0FF' }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Loop Iteration Notches on Looped Clips */}
                {clip.durationBars > 2 && (
                  <div className="absolute top-0 left-0 right-0 h-full pointer-events-none">
                    {Array.from({ length: Math.floor(clip.durationBars / 2) }).map((_, idx) => {
                      if (idx === 0) return null;
                      const notchPct = ((idx * 2) / clip.durationBars) * 100;
                      return (
                        <div
                          key={idx}
                          className="absolute top-0 bottom-0 flex flex-col items-center -translate-x-1/2 z-10"
                          style={{ left: `${notchPct}%` }}
                        >
                          <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] border-t-amber-400" />
                          <div className="w-px h-full border-r border-dashed border-white/20" />
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Left & Right Edge Trim / Pull-Back / Time-Stretch Handles */}
                {!isEraseTool && (
                  <>
                    <div
                      onMouseDown={(e) => handleClipEdgeMouseDown(e, clip, 'start')}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize z-20 flex items-center justify-start group/edge-start"
                      style={{ maxWidth: '20%' }}
                      title="Drag left edge to trim or extend clip start (Alt = micro-precision)"
                    >
                      <div
                        className="w-[3px] h-5 ml-0.5 rounded-full opacity-0 group-hover/clip:opacity-65 group-hover/edge-start:!opacity-100 transition-opacity"
                        style={{
                          backgroundColor: effectiveClipColor,
                          boxShadow: `0 0 6px ${effectiveClipColor}`
                        }}
                      />
                    </div>
                    <div
                      onMouseDown={(e) => handleClipEdgeMouseDown(e, clip, 'end')}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize z-20 flex items-center justify-end group/edge-end"
                      style={{ maxWidth: '24%' }}
                      title={
                        !isMidiClip && clip.timeStretchEnabled
                          ? 'Time Stretch Active (Pitch Locked): Drag right edge to stretch/compress speed · Alt = micro-precision'
                          : isMidiClip
                            ? 'Drag right edge left to pull back / trim or right to extend loop (Alt = micro-precision)'
                            : 'Drag right edge to trim/extend · Hold Ctrl+Drag (or enable Time Stretch in Audio Editor) to stretch speed preserving pitch'
                      }
                    >
                      <div
                        className={`w-[3px] h-6 mr-0.5 rounded-full transition-opacity ${
                          !isMidiClip && clip.timeStretchEnabled
                            ? 'opacity-90'
                            : 'opacity-0 group-hover/clip:opacity-75 group-hover/edge-end:!opacity-100'
                        }`}
                        style={{
                          backgroundColor: !isMidiClip && clip.timeStretchEnabled ? '#10B981' : effectiveClipColor,
                          boxShadow: `0 0 8px ${!isMidiClip && clip.timeStretchEnabled ? '#10B981' : effectiveClipColor}`
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* Featherweight Click Laser Beam Strike Pulse onto Grid */}
          {laserStrike && (
            <div
              key={laserStrike.key}
              className="absolute top-0 bottom-0 pointer-events-none z-30 -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${(laserStrike.bar / 16) * 100}%` }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full animate-ping"
                style={{
                  backgroundColor: laserStrike.color,
                  boxShadow: `0 0 12px ${laserStrike.color}`
                }}
              />
              <div
                className="w-0.5 flex-1 opacity-90"
                style={{
                  backgroundColor: '#FFFFFF',
                  boxShadow: `0 0 10px ${laserStrike.color}, 0 0 4px #FFFFFF`
                }}
              />
            </div>
          )}

          {/* Active Laser Emitter Beam while Mouse Pressed on Lane */}
          {paintState && paintState.isActive && (() => {
            const activeEmitterColor =
              paintState.mode === 'erase' || activeTool === 'laser_erase' || activeTool === 'erase'
                ? '#EF4444'
                : activeTool === 'laser_midi'
                  ? '#10B981'
                  : activeTool === 'laser_curve' || activeTool === 'draw'
                    ? '#FFD700'
                    : '#00F0FF';
            return (
              <div
                className="absolute top-0 bottom-0 pointer-events-none z-30 -translate-x-1/2 flex flex-col items-center"
                style={{ left: `${(paintState.currentBar / 16) * 100}%` }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: '#FFFFFF',
                    boxShadow: `0 0 10px ${activeEmitterColor}`
                  }}
                />
                <div
                  className="w-[2px] flex-1"
                  style={{
                    backgroundColor: activeEmitterColor,
                    boxShadow: `0 0 8px ${activeEmitterColor}`
                  }}
                />
              </div>
            );
          })()}

          {/* Active Loop Paint or Incremental Right-Click / Red-Laser Erase Beam Ribbon */}
          {paintState && paintState.isActive && paintState.durationBars > 0 && (() => {
            const isEraseSweep = paintState.mode === 'erase' || activeTool === 'laser_erase' || activeTool === 'erase';
            const ribbonBg = isEraseSweep
              ? 'rgba(239, 68, 68, 0.22)'
              : activeTool === 'laser_midi'
                ? 'rgba(16, 185, 129, 0.25)'
                : 'rgba(0, 240, 255, 0.25)';
            const ribbonBorder = isEraseSweep
              ? '#EF4444'
              : activeTool === 'laser_midi'
                ? '#10B981'
                : '#00F0FF';
            const ribbonGlow = isEraseSweep
              ? '0 0 16px rgba(239,68,68,0.55)'
              : activeTool === 'laser_midi'
                ? '0 0 18px rgba(16,185,129,0.6)'
                : '0 0 18px rgba(0,240,255,0.6)';

            return (
              <div
                className="absolute top-1 bottom-1 rounded z-30 pointer-events-none flex flex-col justify-between overflow-hidden shadow-2xl"
                style={{
                  left: `${(paintState.startBar / 16) * 100}%`,
                  width: `${(paintState.durationBars / 16) * 100}%`,
                  backgroundColor: ribbonBg,
                  borderWidth: '2px',
                  borderStyle: isEraseSweep ? 'dashed' : 'solid',
                  borderColor: ribbonBorder,
                  boxShadow: ribbonGlow
                }}
              >
                {/* Floating HUD Badge */}
                <div className="flex items-center justify-between px-2 py-0.5 text-[9px] font-mono font-bold text-white bg-black/80 border-b border-white/20">
                  <span className="flex items-center gap-1.5">
                    {isEraseSweep ? (
                      <Flame size={10} className="text-[#EF4444]" />
                    ) : (
                      <Zap size={10} className="text-[#FFD700] animate-pulse" />
                    )}
                    <span>
                      {isEraseSweep
                        ? `ERASING SLICE: ${paintState.durationBars.toFixed(2)} BARS`
                        : `PAINTING ${activeTool === 'laser_midi' ? 'MIDI' : 'AUDIO'}: ${paintState.durationBars.toFixed(2)} BARS`}
                    </span>
                  </span>
                  <span style={{ color: ribbonBorder }}>
                    {isEraseSweep
                      ? `SNAP ${snapValue}`
                      : `${Math.max(1, Math.round(paintState.durationBars / 2))} LOOPS • SNAP ${snapValue}`}
                  </span>
                </div>

                {/* Repeating Waveform / Erase Beam Preview inside Ribbon */}
                {!isEraseSweep && (
                  <div className="flex items-center gap-1 px-1 opacity-80 h-6">
                    {Array.from({ length: Math.max(8, Math.round(paintState.durationBars * 10)) }).map((_, bIdx) => (
                      <div
                        key={bIdx}
                        className="flex-1 rounded-full animate-pulse"
                        style={{
                          height: `${8 + Math.sin(bIdx * 0.8) * 12}px`,
                          backgroundColor: activeTool === 'laser_midi' ? '#10B981' : '#00F0FF'
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Loop Boundary Notches across the painted span */}
                {!isEraseSweep && paintState.durationBars > 2 && (
                  <div className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none flex">
                    {Array.from({ length: Math.floor(paintState.durationBars / 2) }).map((_, idx) => {
                      if (idx === 0) return null;
                      const pct = ((idx * 2) / paintState.durationBars) * 100;
                      return (
                        <div
                          key={idx}
                          className="absolute top-0 bottom-0 flex flex-col items-center -translate-x-1/2 z-20"
                          style={{ left: `${pct}%` }}
                        >
                          <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-amber-400" />
                          <div className="w-px h-full border-r border-dashed border-amber-400/50" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Live Recording Take Visualization Bar when Armed & Recording */}
          {isRecording && isArmedForRecord && (
            <div 
              className="absolute top-1 bottom-1 rounded bg-[#EF4444]/25 border-2 border-[#EF4444] shadow-[0_0_15px_rgba(239,68,68,0.6)] flex items-center px-2 z-20 pointer-events-none animate-pulse"
              style={{
                left: `${playheadPosition * 100}%`,
                width: '12%'
              }}
            >
              <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-[#EF4444]">
                <CircleDot size={10} className="animate-ping" />
                <span>REC TAKE IN PROGRESS...</span>
              </div>
            </div>
          )}

          {/* Direct Automation Overlay on Top of Track (when not expanded or active) */}
          {showDirectOverlay && (
            <div className="absolute inset-0 pointer-events-auto">
              {activeOverlayPluginLane && activeOverlayPluginLane.visible && (activeParam === activeOverlayPluginLane.id || (!automation.volume.visible && !automation.pan.visible)) ? (
                <AutomationLane
                  track={track}
                  param={activeOverlayPluginLane.id}
                  pluginLane={activeOverlayPluginLane}
                  playheadPosition={playheadPosition}
                  activeTool={activeTool}
                  snapValue={snapValue}
                  updateTrack={updateTrack}
                  height={64}
                  isOverlay={true}
                />
              ) : automation.volume.visible && (activeParam === 'volume' || !automation.pan.visible) ? (
                <AutomationLane
                  track={track}
                  param="volume"
                  playheadPosition={playheadPosition}
                  activeTool={activeTool}
                  snapValue={snapValue}
                  updateTrack={updateTrack}
                  height={64}
                  isOverlay={true}
                />
              ) : automation.pan.visible ? (
                <AutomationLane
                  track={track}
                  param="pan"
                  playheadPosition={playheadPosition}
                  activeTool={activeTool}
                  snapValue={snapValue}
                  updateTrack={updateTrack}
                  height={64}
                  isOverlay={true}
                />
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Expanded Dedicated Automation Sub-Lanes */}
      {isExpanded && (
        <div className="flex flex-col bg-[#05070B] border-t border-[#131B2A]">
          {/* Volume Automation Sub-Lane */}
          {automation.volume.visible && (
            <div className="flex items-stretch border-b border-[#0F172A] relative">
              <div className="w-64 border-r border-[#1E293B] bg-[#070A12] p-2 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00F0FF] shadow-[0_0_6px_#00F0FF]" />
                  <span className="text-[11px] font-mono font-bold text-[#00F0FF]">VOLUME ENVELOPE</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      updateTrack(id, {
                        automation: {
                          ...automation,
                          volume: { ...automation.volume, visible: false }
                        }
                      });
                    }}
                    className="text-[9px] font-mono text-[#64748B] hover:text-red-400 px-1"
                    title="Hide volume envelope"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="flex-1 relative">
                <AutomationLane
                  track={track}
                  param="volume"
                  playheadPosition={playheadPosition}
                  activeTool={activeTool}
                  snapValue={snapValue}
                  updateTrack={updateTrack}
                  height={80}
                  isOverlay={false}
                />
              </div>
            </div>
          )}

          {/* Pan Automation Sub-Lane */}
          {automation.pan.visible && (
            <div className="flex items-stretch border-b border-[#0F172A] relative">
              <div className="w-64 border-r border-[#1E293B] bg-[#070A12] p-2 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FF8C00] shadow-[0_0_6px_#FF8C00]" />
                  <span className="text-[11px] font-mono font-bold text-[#FF8C00]">PAN ENVELOPE</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      updateTrack(id, {
                        automation: {
                          ...automation,
                          pan: { ...automation.pan, visible: false }
                        }
                      });
                    }}
                    className="text-[9px] font-mono text-[#64748B] hover:text-red-400 px-1"
                    title="Hide pan envelope"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="flex-1 relative">
                <AutomationLane
                  track={track}
                  param="pan"
                  playheadPosition={playheadPosition}
                  activeTool={activeTool}
                  snapValue={snapValue}
                  updateTrack={updateTrack}
                  height={80}
                  isOverlay={false}
                />
              </div>
            </div>
          )}

          {/* Faust / VST Parameter Automation Sub-Lanes */}
          {visiblePluginParams.map(pLane => {
            const laneColor = pLane.color || '#EC4899';
            const liveVal = evaluateAutomationAt(pLane.points, playheadPosition, pLane.defaultValue);
            const isFocused = activeParam === pLane.id;
            return (
              <div
                key={pLane.id}
                className={`flex items-stretch border-b border-[#0F172A] relative ${
                  isFocused ? 'bg-[#0B0F1A]' : ''
                }`}
              >
                <div className="w-64 border-r border-[#1E293B] bg-[#070A12] px-2 py-1.5 flex items-center justify-between gap-1 shrink-0">
                  <div className="min-w-0 flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: laneColor, boxShadow: `0 0 6px ${laneColor}` }}
                    />
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono font-bold truncate" style={{ color: laneColor }} title={pLane.paramName}>
                        {pLane.paramName}
                      </div>
                      <div className="text-[8px] font-mono text-[#7C8AA8] truncate" title={pLane.pluginName}>
                        {pLane.pluginName} • {formatAutomationValue(liveVal, pLane.unit, pLane.min, pLane.max)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        updateTrack(id, {
                          automation: {
                            ...automation,
                            params: {
                              ...(automation.params || {}),
                              [pLane.id]: { ...pLane, enabled: !pLane.enabled }
                            }
                          }
                        });
                      }}
                      className={`px-1 py-0.5 rounded text-[8px] font-mono font-bold border transition-colors ${
                        pLane.enabled
                          ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300'
                          : 'bg-[#121622] border-[#1E293B] text-[#64748B]'
                      }`}
                      title={pLane.enabled ? 'Automation Enabled (Click to Bypass)' : 'Automation Bypassed (Click to Enable)'}
                    >
                      {pLane.enabled ? 'ON' : 'BYP'}
                    </button>
                    <button
                      onClick={() => {
                        updateTrack(id, {
                          automation: {
                            ...automation,
                            params: {
                              ...(automation.params || {}),
                              [pLane.id]: { ...pLane, visible: false }
                            }
                          }
                        });
                      }}
                      className="text-[9px] font-mono text-[#64748B] hover:text-red-400 px-1"
                      title="Hide parameter automation lane"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="flex-1 relative">
                  <AutomationLane
                    track={track}
                    param={pLane.id}
                    pluginLane={pLane}
                    playheadPosition={playheadPosition}
                    activeTool={activeTool}
                    snapValue={snapValue}
                    updateTrack={updateTrack}
                    height={80}
                    isOverlay={false}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Individual Clip Color Picker Portal Popover */}
      {clipColorPicker && (() => {
        const activeClip = clips.find(c => c.id === clipColorPicker.clipId);
        if (!activeClip || typeof document === 'undefined') return null;

        const trackList = allTracks && allTracks.length > 0 ? allTracks : [track];
        const sameNameCount = trackList.reduce(
          (sum, t) => sum + t.clips.filter(c => c.name === activeClip.name).length,
          0
        );
        const currentEffective =
          activeClip.color || (activeClip.isMidi || type === 'midi' ? '#10B981' : color || '#00F0FF');
        const showMultiSelected =
          selectedClipIds.length > 1 && selectedClipIds.includes(activeClip.id);

        return createPortal(
          <div
            ref={colorPopoverRef}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[130] w-[264px] bg-[#090D18] border border-[#1E293B] rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.85)] p-3 text-slate-100 select-none"
            style={{
              left: `${clipColorPicker.x}px`,
              top: `${clipColorPicker.y}px`
            }}
            role="dialog"
            aria-label={`Clip color picker for ${activeClip.name}`}
          >
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#1E293B]">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-full shrink-0 border border-white/50"
                  style={{ backgroundColor: currentEffective }}
                />
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-white leading-none">
                    Clip Section Color
                  </div>
                  <div className="text-[10px] font-mono text-[#94A3B8] truncate mt-0.5">
                    {activeClip.name}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setClipColorPicker(null)}
                className="p-1 rounded text-[#64748B] hover:text-white hover:bg-[#161E31] cursor-pointer"
                aria-label="Close clip color picker"
              >
                <X size={13} />
              </button>
            </div>

            {/* Section Preset Swatches */}
            <div className="mt-2.5 grid grid-cols-2 gap-1.5">
              {CLIP_SECTION_COLOR_PRESETS.map(preset => {
                const isActive =
                  activeClip.color?.toLowerCase() === preset.color.toLowerCase();
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyColorToClip(activeClip.id, preset.color, 'single')}
                    className={`flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg border text-left text-[11px] transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#131C31] border-white/60 text-white font-semibold'
                        : 'bg-[#05070D] border-[#1E293B] text-slate-300 hover:border-[#334155] hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-3 h-3 rounded-sm shrink-0 border border-white/25"
                        style={{ backgroundColor: preset.color }}
                      />
                      <span className="truncate">{preset.label}</span>
                    </span>
                    {isActive && <Check size={11} className="text-[#FFD700] shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Custom Hex Color Picker */}
            <div className="mt-2.5 flex items-center justify-between gap-2 p-2 rounded-lg bg-[#05070D] border border-[#1E293B]">
              <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                <input
                  type="color"
                  value={normalizeHexForColorInput(currentEffective)}
                  onChange={(e) => applyColorToClip(activeClip.id, e.target.value, 'single')}
                  className="w-6 h-6 rounded bg-transparent border-0 cursor-pointer p-0"
                  aria-label="Pick custom clip hex color"
                />
                <span>Custom Color</span>
              </label>
              <span className="text-[10px] font-mono text-[#94A3B8] uppercase">
                {currentEffective}
              </span>
            </div>

            {/* Grouping & Reset Actions */}
            <div className="mt-2.5 pt-2 border-t border-[#1E293B] flex flex-wrap items-center justify-between gap-1.5">
              {showMultiSelected && (
                <button
                  type="button"
                  onClick={() =>
                    applyColorToClip(activeClip.id, activeClip.color || currentEffective, 'selected')
                  }
                  className="w-full py-1 px-2 rounded-md text-[10px] font-mono font-semibold bg-[#FF8C00]/15 text-[#FFD700] border border-[#FF8C00]/40 hover:bg-[#FF8C00] hover:text-black flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Layers size={11} />
                  <span>Apply to {selectedClipIds.length} Selected Clips</span>
                </button>
              )}

              {sameNameCount > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    applyColorToClip(activeClip.id, activeClip.color || currentEffective, 'same-name')
                  }
                  className="flex-1 py-1 px-2 rounded-md text-[10px] font-mono bg-[#0D1322] hover:bg-[#17223B] text-[#00F0FF] border border-[#1E293B] truncate cursor-pointer"
                  title={`Apply this color to all ${sameNameCount} clips named "${activeClip.name}"`}
                >
                  Match All "{activeClip.name}" ({sameNameCount})
                </button>
              )}

              <button
                type="button"
                disabled={!activeClip.color}
                onClick={() => applyColorToClip(activeClip.id, undefined, 'single')}
                className="py-1 px-2 rounded-md text-[10px] font-mono text-[#94A3B8] hover:text-white bg-[#0D1322] border border-[#1E293B] hover:border-[#334155] flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ml-auto"
                title="Reset clip back to track-level default color"
              >
                <RotateCcw size={10} />
                <span>Track Color</span>
              </button>
            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );
};

export default TimelineLane;
