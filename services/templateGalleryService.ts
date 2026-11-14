import { useState, useEffect, useCallback } from 'react';
import {
  Track,
  TrackSend,
  TrackAutomation,
  MidiTrackConfig,
  RoutingBus,
  ProjectTemplate,
  View
} from '../types';
import { ROUTING_TEMPLATES } from '../routingTemplates';
import { vstWrapperService, VstFormat } from './vstWrapperService';

export type TemplateCategory =
  | 'RECORDING'
  | 'MASTERING'
  | 'ELECTRONIC'
  | 'BROADCAST'
  | 'CUSTOM';

export type TemplateFilterCategory = 'ALL' | 'CUSTOM' | 'RECORDING' | 'ELECTRONIC' | 'MASTERING' | 'BROADCAST';

export interface TemplateVstNodeSnapshot {
  pluginId: string;
  name: string;
  format: VstFormat;
  bypassed: boolean;
  paramValues: Record<string, number>;
  selectedPresetId?: string;
}

export interface TemplateTrackConfig {
  name: string;
  type: 'audio' | 'midi';
  volume: number;
  pan: number;
  muted: boolean;
  soloed: boolean;
  color: string;
  phaseInverted: boolean;
  isMono: boolean;
  vstBypassed: boolean;
  bus?: string;
  inputSource?: string;
  instrument?: string;
  vsts: string[];
  vstChainInstances: TemplateVstNodeSnapshot[];
  sends: TrackSend[];
  automation?: TrackAutomation;
  midiConfig?: MidiTrackConfig;
  humanizeEnabled?: boolean;
  humanizeAmount?: number;
}

export interface TemplateProjectMetadata {
  bpmCategory: string;
  instrumentCount: number;
  audioTrackCount: number;
  midiTrackCount: number;
  genre: string;
}

export interface ReusableProjectTemplate {
  schemaVersion: 'strangelet-template/v1';
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  tags: string[];
  tempo: number;
  sampleRate: number;
  bitDepth: number;
  timeSignature?: string;
  recommendedView?: View;
  buses: RoutingBus[];
  tracks: TemplateTrackConfig[];
  metadata?: TemplateProjectMetadata;
  layoutPreviewDataUrl?: string;
  isBuiltIn?: boolean;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'strangelet_template_gallery_custom_v1';

function cloneAutomation(auto?: TrackAutomation): TrackAutomation | undefined {
  if (!auto) return undefined;
  return JSON.parse(JSON.stringify(auto));
}

function deriveBusesFromTracks(tracks: TemplateTrackConfig[], existingBuses: RoutingBus[] = []): RoutingBus[] {
  const byName = new Map<string, RoutingBus>();
  existingBuses.forEach(bus => {
    byName.set(bus.name, { ...bus });
  });

  const palette = ['#FF8C00', '#38BDF8', '#10B981', '#A855F7', '#F59E0B', '#EC4899'];
  let colorIdx = 0;

  tracks.forEach(t => {
    if (t.bus && !byName.has(t.bus)) {
      byName.set(t.bus, {
        id: `bus-${t.bus.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: t.bus,
        color: t.color || palette[colorIdx++ % palette.length],
        destination: 'Stereo Master Out'
      });
    }
    (t.sends || []).forEach(send => {
      if (send.target && !byName.has(send.target)) {
        byName.set(send.target, {
          id: `aux-${send.target.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          name: send.target,
          color: palette[colorIdx++ % palette.length],
          destination: 'Stereo Master Out'
        });
      }
    });
  });

  return Array.from(byName.values());
}

export function classifyBpmCategory(tempo: number): string {
  const bpm = Number.isFinite(tempo) ? tempo : 120;
  if (bpm < 85) return 'Downtempo (<85 BPM)';
  if (bpm < 115) return 'Mid-Tempo (85-114 BPM)';
  if (bpm < 135) return 'Uptempo / Groove (115-134 BPM)';
  return 'High-Energy / Fast (135+ BPM)';
}

export interface TemplateLayoutTrackInput {
  name: string;
  type: 'audio' | 'midi';
  color?: string;
  volume?: number;
  pan?: number;
  vsts?: string[];
  bus?: string;
  sends?: TrackSend[];
  muted?: boolean;
  instrument?: string;
}

export function deriveTemplateMetadata(
  tracks: ReadonlyArray<Pick<TemplateLayoutTrackInput, 'name' | 'type' | 'instrument' | 'vsts' | 'bus'>>,
  tempo: number,
  category: TemplateCategory
): TemplateProjectMetadata {
  const bpm = Number.isFinite(tempo) ? tempo : 120;
  const bpmCategory = classifyBpmCategory(bpm);
  const midiTrackCount = tracks.filter(t => t.type === 'midi').length;
  const audioTrackCount = tracks.length - midiTrackCount;
  const instrumentCount = tracks.filter(
    t => t.type === 'midi' || Boolean(t.instrument && t.instrument.trim())
  ).length;

  const textCorpus = tracks
    .map(t => `${t.name} ${t.instrument || ''} ${(t.vsts || []).join(' ')} ${t.bus || ''}`)
    .join(' ')
    .toLowerCase();

  let genre = 'Hybrid Studio Mix';
  if (
    category === 'BROADCAST' ||
    /\b(podcast|voiceover|mic|dialogue|dialog|interview|broadcast|host|guest)\b/.test(textCorpus)
  ) {
    genre = 'Podcast / Broadcast';
  } else if (
    category === 'MASTERING' ||
    /\b(master|stem|reference|limiter|loudness|gold path|matchering)\b/.test(textCorpus)
  ) {
    genre = 'Mastering / Finalize';
  } else if (/\b(808|trap|drill|sub bass|hi-?hat)\b/.test(textCorpus)) {
    genre = 'Trap / Bass Electronic';
  } else if (bpm >= 155 && midiTrackCount > 0) {
    genre = 'Drum & Bass / Breakbeat';
  } else if (
    category === 'ELECTRONIC' ||
    /\b(synth|arp|pad|serum|poly|saw|lead|acid|fm|modular|techno)\b/.test(textCorpus)
  ) {
    genre = bpm >= 118 && bpm <= 135 ? 'House / Techno' : 'Synthwave / Electronic';
  } else if (/\b(guitar|acoustic|snare|kick|overhead|room|band|live)\b/.test(textCorpus)) {
    genre = 'Indie / Live Band';
  } else if (/\b(vocal|vox|harmony|choir|piano|strings)\b/.test(textCorpus)) {
    genre = 'Pop / Vocal Production';
  } else if (midiTrackCount > audioTrackCount) {
    genre = 'Electronic / MIDI Production';
  } else if (category === 'RECORDING') {
    genre = 'Multitrack Tracking';
  }

  return {
    bpmCategory,
    instrumentCount,
    audioTrackCount,
    midiTrackCount,
    genre
  };
}

export function buildMetadataTags(
  metadata: TemplateProjectMetadata,
  existingTags: string[] = []
): string[] {
  const autoTags = [
    `BPM: ${metadata.bpmCategory}`,
    `Instruments: ${metadata.instrumentCount}`,
    `Genre: ${metadata.genre}`
  ];
  const seen = new Set<string>();
  const merged: string[] = [];
  [...autoTags, ...existingTags].forEach(raw => {
    const clean = raw.trim();
    if (!clean) return;
    const key = clean.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(clean);
    }
  });
  return merged;
}

export function renderTrackLayoutGridToCanvas(
  canvas: HTMLCanvasElement,
  params: {
    tracks: ReadonlyArray<TemplateLayoutTrackInput>;
    tempo: number;
    metadata?: TemplateProjectMetadata;
  }
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  // Background
  ctx.fillStyle = '#05070E';
  ctx.fillRect(0, 0, width, height);

  // Subtle grid background
  const headerH = 20;
  const maxVisibleRows = Math.min(8, Math.max(1, params.tracks.length));
  const footerH = params.tracks.length > maxVisibleRows ? 14 : 4;
  const gridAreaH = Math.max(24, height - headerH - footerH);
  const rowH = gridAreaH / maxVisibleRows;

  // Header strip
  ctx.fillStyle = '#0B101D';
  ctx.fillRect(0, 0, width, headerH);
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, headerH - 0.5);
  ctx.lineTo(width, headerH - 0.5);
  ctx.stroke();

  const meta =
    params.metadata ||
    deriveTemplateMetadata(params.tracks, params.tempo, 'CUSTOM');

  ctx.font = 'bold 9px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = '#FFD700';
  ctx.fillText(`${params.tracks.length} TRK · ${meta.instrumentCount} INST`, 8, 13);

  ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = '#38BDF8';
  const rightLabel = `${Math.round(params.tempo)} BPM`;
  const rightW = ctx.measureText(rightLabel).width;
  ctx.fillText(rightLabel, width - rightW - 8, 13);

  // Vertical arrangement grid lines (4 bar columns + VST + Bus columns)
  const labelColW = Math.round(width * 0.34);
  const chainColW = Math.round(width * 0.24);
  const barAreaX = labelColW;
  const barAreaW = width - labelColW - chainColW;

  ctx.strokeStyle = 'rgba(30, 41, 59, 0.7)';
  for (let c = 0; c <= 4; c++) {
    const gx = Math.round(barAreaX + (barAreaW * c) / 4) + 0.5;
    ctx.beginPath();
    ctx.moveTo(gx, headerH);
    ctx.lineTo(gx, height - footerH);
    ctx.stroke();
  }

  if (params.tracks.length === 0) {
    ctx.fillStyle = '#64748B';
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText('No tracks in active session', 12, headerH + 22);
    return;
  }

  // Track rows
  params.tracks.slice(0, maxVisibleRows).forEach((trk, idx) => {
    const y = headerH + idx * rowH;
    const midY = y + rowH / 2;

    if (idx % 2 === 1) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.fillRect(0, y, width, rowH);
    }

    ctx.strokeStyle = 'rgba(30, 41, 59, 0.55)';
    ctx.beginPath();
    ctx.moveTo(0, y + rowH - 0.5);
    ctx.lineTo(width, y + rowH - 0.5);
    ctx.stroke();

    const accent = trk.color || (trk.type === 'midi' ? '#A855F7' : '#00F0FF');

    // Track color rail
    ctx.fillStyle = accent;
    ctx.fillRect(2, y + 2, 3, Math.max(3, rowH - 4));

    // Type badge (A / M)
    ctx.fillStyle = trk.type === 'midi' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(0, 240, 255, 0.2)';
    ctx.fillRect(8, midY - 5, 11, 10);
    ctx.fillStyle = trk.type === 'midi' ? '#D8B4FE' : '#67E8F9';
    ctx.font = 'bold 8px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(trk.type === 'midi' ? 'M' : 'A', 11, midY + 3);

    // Track Name (truncated)
    ctx.fillStyle = trk.muted ? '#64748B' : '#E2E8F0';
    ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
    const maxChars = 11;
    const shortName = trk.name.length > maxChars ? `${trk.name.slice(0, maxChars - 1)}…` : trk.name;
    ctx.fillText(shortName, 23, midY + 3);

    // Mini timeline / level grid cells
    const segGap = 3;
    const segW = (barAreaW - segGap * 5) / 4;
    const cellH = Math.max(4, Math.min(9, rowH - 5));
    const fillRatio = Math.max(0.2, Math.min(1, trk.volume ?? 0.8));
    for (let cell = 0; cell < 4; cell++) {
      const cx = barAreaX + segGap + cell * (segW + segGap);
      const cy = midY - cellH / 2;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(cx, cy, segW, cellH);

      const active = cell < Math.ceil(fillRatio * 4);
      if (active) {
        ctx.fillStyle = trk.muted ? 'rgba(100, 116, 139, 0.45)' : accent;
        ctx.globalAlpha = trk.type === 'midi' ? 0.72 : 0.62;
        ctx.fillRect(cx + 1, cy + 1, Math.max(2, segW - 2), Math.max(2, cellH - 2));
        ctx.globalAlpha = 1;
      }
    }

    // VST Chain pills on right column
    const vstCount = trk.vsts?.length || 0;
    const chainX = width - chainColW + 4;
    for (let v = 0; v < Math.min(3, vstCount); v++) {
      ctx.fillStyle = '#FF8C00';
      ctx.fillRect(chainX + v * 8, midY - 3, 6, 6);
    }
    if (vstCount === 0) {
      ctx.fillStyle = '#334155';
      ctx.fillRect(chainX, midY - 1, 14, 2);
    }
    // Bus indicator dot
    if (trk.bus && trk.bus !== 'Stereo Master') {
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(width - 9, midY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  if (params.tracks.length > maxVisibleRows) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = '8px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(
      `+${params.tracks.length - maxVisibleRows} additional tracks in template`,
      8,
      height - 4
    );
  }
}

export function captureTrackLayoutCanvasDataUrl(params: {
  tracks: ReadonlyArray<TemplateLayoutTrackInput>;
  tempo: number;
  metadata?: TemplateProjectMetadata;
  width?: number;
  height?: number;
}): string | undefined {
  if (typeof document === 'undefined') return undefined;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = params.width || 300;
    canvas.height = params.height || 124;
    renderTrackLayoutGridToCanvas(canvas, {
      tracks: params.tracks,
      tempo: params.tempo,
      metadata: params.metadata
    });
    return canvas.toDataURL('image/png');
  } catch {
    return undefined;
  }
}

function convertBuiltInTemplate(pt: ProjectTemplate): ReusableProjectTemplate {
  const tracks: TemplateTrackConfig[] = pt.tracks.map(t => ({
    name: t.name,
    type: t.type,
    volume: t.volume,
    pan: t.pan,
    muted: Boolean(t.muted),
    soloed: Boolean(t.soloed),
    color: t.color,
    phaseInverted: Boolean(t.phaseInverted),
    isMono: Boolean(t.isMono),
    vstBypassed: Boolean(t.vstBypassed),
    bus: t.bus || 'Stereo Master',
    inputSource: t.inputSource || (t.type === 'midi' ? 'MIDI Controller' : 'Line In 1-2'),
    instrument: t.instrument,
    vsts: Array.isArray(t.vsts) ? [...t.vsts] : [],
    vstChainInstances: [],
    sends: Array.isArray(t.sends) ? t.sends.map(s => ({ ...s })) : [],
    midiConfig: t.midiConfig ? { ...t.midiConfig } : undefined,
    humanizeEnabled: t.humanizeEnabled,
    humanizeAmount: t.humanizeAmount
  }));

  const metadata = deriveTemplateMetadata(tracks, pt.defaultTempo, pt.category);

  return {
    schemaVersion: 'strangelet-template/v1',
    id: `builtin-${pt.id}`,
    name: pt.name,
    category: pt.category,
    description: pt.description || pt.tagline,
    tags: buildMetadataTags(metadata, [
      pt.category.toLowerCase(),
      `${pt.defaultTempo}bpm`,
      ...pt.buses.map(b => b.name.split(':')[0])
    ]),
    tempo: pt.defaultTempo,
    sampleRate: pt.sampleRate,
    bitDepth: pt.bitDepth,
    timeSignature: '4/4',
    recommendedView: pt.recommendedView,
    buses: pt.buses.map(b => ({ ...b })),
    tracks,
    metadata,
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  };
}

const BUILTIN_GALLERY_TEMPLATES: ReusableProjectTemplate[] = ROUTING_TEMPLATES.map(convertBuiltInTemplate);

function loadCustomTemplates(): ReusableProjectTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(item => item && typeof item.name === 'string' && Array.isArray(item.tracks))
      .map((item: ReusableProjectTemplate) => {
        const category = item.category || 'CUSTOM';
        const tempo = typeof item.tempo === 'number' ? item.tempo : 120;
        const metadata = item.metadata || deriveTemplateMetadata(item.tracks, tempo, category);
        return {
          ...item,
          metadata,
          tags: buildMetadataTags(metadata, Array.isArray(item.tags) ? item.tags : [])
        };
      });
  } catch {
    return [];
  }
}

class TemplateGalleryService {
  private customTemplates: ReusableProjectTemplate[] = loadCustomTemplates();
  private listeners = new Set<() => void>();

  private persistAndNotify() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.customTemplates));
    } catch {
      // ignore storage errors
    }
    this.listeners.forEach(cb => cb());
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getAllTemplates(): ReusableProjectTemplate[] {
    return [...this.customTemplates, ...BUILTIN_GALLERY_TEMPLATES];
  }

  public getCustomTemplates(): ReusableProjectTemplate[] {
    return [...this.customTemplates];
  }

  public buildLiveTemplateSnapshot(params: {
    name?: string;
    category?: TemplateCategory;
    description?: string;
    tags?: string[];
    tracks: Track[];
    tempo: number;
    sampleRate?: number;
    bitDepth?: number;
    timeSignature?: string;
    includeAutomation?: boolean;
    layoutPreviewDataUrl?: string;
  }): ReusableProjectTemplate {
    const now = new Date().toISOString();
    const capturedTracks: TemplateTrackConfig[] = params.tracks.map(track => {
      const liveInstances = vstWrapperService.getInstancesForTrack(track.id);
      const vstChainInstances: TemplateVstNodeSnapshot[] = liveInstances.map(inst => ({
        pluginId: inst.pluginId,
        name: inst.name,
        format: inst.format,
        bypassed: Boolean(inst.bypassed),
        paramValues: { ...inst.paramValues },
        selectedPresetId: inst.selectedPresetId
      }));

      const combinedVsts = Array.from(
        new Set([
          ...(Array.isArray(track.vsts) ? track.vsts : []),
          ...liveInstances.map(inst => inst.name)
        ])
      );

      return {
        name: track.name,
        type: track.type,
        volume: Number(track.volume.toFixed(3)),
        pan: Number(track.pan.toFixed(3)),
        muted: Boolean(track.muted),
        soloed: Boolean(track.soloed),
        color: track.color,
        phaseInverted: Boolean(track.phaseInverted),
        isMono: Boolean(track.isMono),
        vstBypassed: Boolean(track.vstBypassed),
        bus: track.bus || 'Stereo Master',
        inputSource: track.inputSource || (track.type === 'midi' ? 'MIDI Controller' : 'Line In 1-2'),
        instrument: track.instrument,
        vsts: combinedVsts,
        vstChainInstances,
        sends: Array.isArray(track.sends) ? track.sends.map(s => ({ ...s })) : [],
        automation: params.includeAutomation !== false ? cloneAutomation(track.automation) : undefined,
        midiConfig: track.midiConfig ? { ...track.midiConfig } : undefined,
        humanizeEnabled: track.humanizeEnabled,
        humanizeAmount: track.humanizeAmount
      };
    });

    const buses = deriveBusesFromTracks(capturedTracks);
    const category = params.category || 'CUSTOM';
    const trimmedName =
      (params.name || '').trim() || `Studio Setup ${this.customTemplates.length + 1}`;
    const id = `custom-tmpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const metadata = deriveTemplateMetadata(capturedTracks, params.tempo, category);
    const mergedTags = buildMetadataTags(
      metadata,
      params.tags && params.tags.length > 0
        ? params.tags
        : [category.toLowerCase(), `${params.tempo}bpm`]
    );
    const layoutPreviewDataUrl =
      params.layoutPreviewDataUrl ||
      captureTrackLayoutCanvasDataUrl({
        tracks: capturedTracks,
        tempo: params.tempo,
        metadata
      });

    return {
      schemaVersion: 'strangelet-template/v1',
      id,
      name: trimmedName,
      category,
      description:
        (params.description || '').trim() ||
        `${capturedTracks.length} tracks (${metadata.genre}) with saved VST chains, bus routing, and channel strip levels.`,
      tags: mergedTags,
      tempo: params.tempo,
      sampleRate: params.sampleRate || 48000,
      bitDepth: params.bitDepth || 24,
      timeSignature: params.timeSignature || '4/4',
      buses,
      tracks: capturedTracks,
      metadata,
      layoutPreviewDataUrl,
      isBuiltIn: false,
      createdAt: now,
      updatedAt: now
    };
  }

  public captureFromSession(params: {
    name: string;
    category: TemplateCategory;
    description: string;
    tags?: string[];
    tracks: Track[];
    tempo: number;
    sampleRate?: number;
    bitDepth?: number;
    timeSignature?: string;
    includeAutomation?: boolean;
    layoutPreviewDataUrl?: string;
  }): ReusableProjectTemplate {
    const template = this.buildLiveTemplateSnapshot(params);
    this.customTemplates = [template, ...this.customTemplates];
    this.persistAndNotify();
    return template;
  }

  public materializeTemplateTracks(
    template: ReusableProjectTemplate,
    options: {
      mode: 'replace' | 'append';
      existingTracks?: Track[];
    }
  ): {
    tracks: Track[];
    tempo: number;
    sampleRate: number;
    bitDepth: number;
    restoredVstCount: number;
  } {
    const timestamp = Date.now();
    let restoredVstCount = 0;

    if (options.mode === 'replace' && options.existingTracks) {
      // Remove existing VST wrapper instances on tracks being replaced
      options.existingTracks.forEach(oldTrack => {
        const oldInstances = vstWrapperService.getInstancesForTrack(oldTrack.id);
        oldInstances.forEach(inst => vstWrapperService.removeInstance(inst.instanceId));
      });
    }

    const allManifests = vstWrapperService.getAllManifests();

    const newTracks: Track[] = template.tracks.map((t, idx) => {
      const trackId = `tmpl-${timestamp}-${idx + 1}-${Math.random().toString(36).slice(2, 6)}`;
      const vstChain = Array.isArray(t.vstChainInstances) ? t.vstChainInstances : [];

      if (vstChain.length > 0) {
        vstChain.forEach(snap => {
          const manifestExists = allManifests.some(m => m.id === snap.pluginId);
          if (!manifestExists) return;
          const instance = vstWrapperService.instantiatePlugin(snap.pluginId, trackId);
          Object.entries(snap.paramValues || {}).forEach(([paramId, val]) => {
            if (typeof val === 'number' && !Number.isNaN(val)) {
              vstWrapperService.updateParameter(instance.instanceId, paramId, val);
            }
          });
          if (snap.bypassed) {
            vstWrapperService.setBypass(instance.instanceId, true);
          }
          restoredVstCount++;
        });
      } else if (Array.isArray(t.vsts) && t.vsts.length > 0) {
        // Best-effort match against installed VST wrapper manifests by name
        t.vsts.forEach(vstLabel => {
          const lower = vstLabel.toLowerCase();
          const matched = allManifests.find(
            m => m.name.toLowerCase() === lower || m.id.toLowerCase() === lower
          );
          if (matched) {
            vstWrapperService.instantiatePlugin(matched.id, trackId);
            restoredVstCount++;
          }
        });
      }

      return {
        id: trackId,
        name: t.name,
        type: t.type,
        volume: typeof t.volume === 'number' ? t.volume : 0.8,
        pan: typeof t.pan === 'number' ? t.pan : 0,
        muted: Boolean(t.muted),
        soloed: Boolean(t.soloed),
        color: t.color || '#FF8C00',
        phaseInverted: Boolean(t.phaseInverted),
        isMono: Boolean(t.isMono),
        vstBypassed: Boolean(t.vstBypassed),
        bus: t.bus || 'Stereo Master',
        inputSource: t.inputSource || (t.type === 'midi' ? 'MIDI Controller' : 'Line In 1-2'),
        instrument: t.instrument,
        vsts: Array.isArray(t.vsts) ? [...t.vsts] : [],
        sends: Array.isArray(t.sends) ? t.sends.map(s => ({ ...s })) : [],
        automation: cloneAutomation(t.automation),
        midiConfig: t.midiConfig ? { ...t.midiConfig } : undefined,
        humanizeEnabled: t.humanizeEnabled,
        humanizeAmount: t.humanizeAmount,
        clips: []
      };
    });

    const finalTracks =
      options.mode === 'append' && options.existingTracks
        ? [...options.existingTracks, ...newTracks]
        : newTracks;

    return {
      tracks: finalTracks,
      tempo: template.tempo || 120,
      sampleRate: template.sampleRate || 48000,
      bitDepth: template.bitDepth || 24,
      restoredVstCount
    };
  }

  public exportTemplateJson(template: ReusableProjectTemplate): string {
    const cleanPayload: ReusableProjectTemplate = {
      schemaVersion: 'strangelet-template/v1',
      id: template.id,
      name: template.name,
      category: template.category,
      description: template.description,
      tags: template.tags || [],
      tempo: template.tempo,
      sampleRate: template.sampleRate,
      bitDepth: template.bitDepth,
      timeSignature: template.timeSignature || '4/4',
      buses: template.buses || [],
      tracks: template.tracks,
      metadata:
        template.metadata ||
        deriveTemplateMetadata(template.tracks, template.tempo, template.category),
      layoutPreviewDataUrl: template.layoutPreviewDataUrl,
      createdAt: template.createdAt,
      updatedAt: new Date().toISOString()
    };
    return JSON.stringify(cleanPayload, null, 2);
  }

  public importTemplateFromJson(jsonText: string): ReusableProjectTemplate {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      throw new Error('Invalid JSON syntax. Please check the template file formatting.');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Template JSON must be an object or array of tracks.');
    }
    if (Array.isArray(parsed)) {
      parsed = { tracks: parsed };
    }
    if (!Array.isArray(parsed.tracks) || parsed.tracks.length === 0) {
      throw new Error('Template JSON must contain a non-empty "tracks" array.');
    }

    const validCategories: TemplateCategory[] = [
      'RECORDING',
      'MASTERING',
      'ELECTRONIC',
      'BROADCAST',
      'CUSTOM'
    ];
    const category: TemplateCategory = validCategories.includes(parsed.category)
      ? parsed.category
      : 'CUSTOM';

    const normalizedTracks: TemplateTrackConfig[] = parsed.tracks.map((raw: any, idx: number) => ({
      name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : `Track ${idx + 1}`,
      type: raw.type === 'midi' ? 'midi' : 'audio',
      volume: typeof raw.volume === 'number' ? Math.max(0, Math.min(1, raw.volume)) : 0.8,
      pan: typeof raw.pan === 'number' ? Math.max(-1, Math.min(1, raw.pan)) : 0,
      muted: Boolean(raw.muted),
      soloed: Boolean(raw.soloed),
      color: typeof raw.color === 'string' ? raw.color : '#FF8C00',
      phaseInverted: Boolean(raw.phaseInverted),
      isMono: Boolean(raw.isMono),
      vstBypassed: Boolean(raw.vstBypassed),
      bus: typeof raw.bus === 'string' ? raw.bus : 'Stereo Master',
      inputSource:
        typeof raw.inputSource === 'string'
          ? raw.inputSource
          : raw.type === 'midi'
            ? 'MIDI Controller'
            : 'Line In 1-2',
      instrument: typeof raw.instrument === 'string' ? raw.instrument : undefined,
      vsts: Array.isArray(raw.vsts) ? raw.vsts.filter((v: any) => typeof v === 'string') : [],
      vstChainInstances: Array.isArray(raw.vstChainInstances)
        ? raw.vstChainInstances.filter(
            (inst: any) => inst && typeof inst.pluginId === 'string' && typeof inst.name === 'string'
          )
        : [],
      sends: Array.isArray(raw.sends)
        ? raw.sends.filter((s: any) => s && typeof s.target === 'string' && typeof s.levelDb === 'number')
        : [],
      automation: raw.automation && typeof raw.automation === 'object' ? raw.automation : undefined,
      midiConfig: raw.midiConfig && typeof raw.midiConfig === 'object' ? raw.midiConfig : undefined,
      humanizeEnabled: typeof raw.humanizeEnabled === 'boolean' ? raw.humanizeEnabled : undefined,
      humanizeAmount: typeof raw.humanizeAmount === 'number' ? raw.humanizeAmount : undefined
    }));

    const buses = deriveBusesFromTracks(
      normalizedTracks,
      Array.isArray(parsed.buses) ? parsed.buses : []
    );

    const now = new Date().toISOString();
    const tempo =
      typeof parsed.tempo === 'number' && parsed.tempo >= 40 && parsed.tempo <= 260
        ? parsed.tempo
        : 120;
    const derivedMetadata = deriveTemplateMetadata(normalizedTracks, tempo, category);
    const rawMeta = parsed.metadata && typeof parsed.metadata === 'object' ? parsed.metadata : {};
    const metadata: TemplateProjectMetadata = {
      bpmCategory:
        typeof rawMeta.bpmCategory === 'string' && rawMeta.bpmCategory.trim()
          ? rawMeta.bpmCategory
          : derivedMetadata.bpmCategory,
      instrumentCount:
        typeof rawMeta.instrumentCount === 'number'
          ? rawMeta.instrumentCount
          : derivedMetadata.instrumentCount,
      audioTrackCount:
        typeof rawMeta.audioTrackCount === 'number'
          ? rawMeta.audioTrackCount
          : derivedMetadata.audioTrackCount,
      midiTrackCount:
        typeof rawMeta.midiTrackCount === 'number'
          ? rawMeta.midiTrackCount
          : derivedMetadata.midiTrackCount,
      genre:
        typeof rawMeta.genre === 'string' && rawMeta.genre.trim()
          ? rawMeta.genre
          : derivedMetadata.genre
    };
    const mergedTags = buildMetadataTags(
      metadata,
      Array.isArray(parsed.tags)
        ? parsed.tags.filter((t: any) => typeof t === 'string')
        : ['imported']
    );
    const layoutPreviewDataUrl =
      typeof parsed.layoutPreviewDataUrl === 'string' &&
      parsed.layoutPreviewDataUrl.startsWith('data:image/')
        ? parsed.layoutPreviewDataUrl
        : captureTrackLayoutCanvasDataUrl({
            tracks: normalizedTracks,
            tempo,
            metadata
          });

    const imported: ReusableProjectTemplate = {
      schemaVersion: 'strangelet-template/v1',
      id: `imported-tmpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name:
        typeof parsed.name === 'string' && parsed.name.trim()
          ? parsed.name.trim()
          : `Imported Template ${this.customTemplates.length + 1}`,
      category,
      description:
        typeof parsed.description === 'string' && parsed.description.trim()
          ? parsed.description.trim()
          : `Imported ${normalizedTracks.length}-track routing & VST chain template.`,
      tags: mergedTags,
      tempo,
      sampleRate: typeof parsed.sampleRate === 'number' ? parsed.sampleRate : 48000,
      bitDepth: typeof parsed.bitDepth === 'number' ? parsed.bitDepth : 24,
      timeSignature: typeof parsed.timeSignature === 'string' ? parsed.timeSignature : '4/4',
      buses,
      tracks: normalizedTracks,
      metadata,
      layoutPreviewDataUrl,
      isBuiltIn: false,
      createdAt: parsed.createdAt || now,
      updatedAt: now
    };

    this.customTemplates = [imported, ...this.customTemplates];
    this.persistAndNotify();
    return imported;
  }

  public duplicateTemplate(template: ReusableProjectTemplate): ReusableProjectTemplate {
    const now = new Date().toISOString();
    const copy: ReusableProjectTemplate = {
      ...JSON.parse(JSON.stringify(template)),
      id: `custom-tmpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${template.name} (Copy)`,
      category: template.isBuiltIn ? 'CUSTOM' : template.category,
      isBuiltIn: false,
      createdAt: now,
      updatedAt: now
    };
    this.customTemplates = [copy, ...this.customTemplates];
    this.persistAndNotify();
    return copy;
  }

  public deleteCustomTemplate(id: string): void {
    const next = this.customTemplates.filter(t => t.id !== id);
    if (next.length === this.customTemplates.length) return;
    this.customTemplates = next;
    this.persistAndNotify();
  }
}

export const templateGalleryService = new TemplateGalleryService();

export function useTemplateGallery() {
  const [templates, setTemplates] = useState<ReusableProjectTemplate[]>(() =>
    templateGalleryService.getAllTemplates()
  );

  useEffect(() => {
    setTemplates(templateGalleryService.getAllTemplates());
    return templateGalleryService.subscribe(() => {
      setTemplates(templateGalleryService.getAllTemplates());
    });
  }, []);

  const refresh = useCallback(() => {
    setTemplates(templateGalleryService.getAllTemplates());
  }, []);

  return {
    templates,
    customCount: templates.filter(t => !t.isBuiltIn).length,
    builtInCount: templates.filter(t => t.isBuiltIn).length,
    refresh
  };
}
