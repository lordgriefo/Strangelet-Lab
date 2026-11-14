import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Track,
  ProjectSession
} from '../types';
import {
  templateGalleryService,
  useTemplateGallery,
  ReusableProjectTemplate,
  TemplateCategory,
  TemplateFilterCategory,
  TemplateProjectMetadata,
  TemplateLayoutTrackInput,
  deriveTemplateMetadata,
  renderTrackLayoutGridToCanvas,
  captureTrackLayoutCanvasDataUrl
} from '../services/templateGalleryService';
import { vstWrapperService } from '../services/vstWrapperService';
import { projectHistory } from '../services/projectHistoryService';
import { playLaserBeamSound } from '../lib/laserSound';
import { volumeToDb, panToString } from '../lib/audioUtils';
import {
  FolderKanban,
  Save,
  Upload,
  Download,
  Copy,
  Check,
  Search,
  Trash2,
  Plus,
  Layers,
  Cpu,
  Workflow,
  Maximize2,
  X,
  ArrowRight,
  FileJson,
  CopyPlus,
  LayoutGrid
} from 'lucide-react';

interface TemplateGalleryProps {
  variant?: 'panel' | 'view';
  tracks: Track[];
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
  tempo: number;
  setTempo: (tempo: number) => void;
  activeSession?: ProjectSession;
  onUpdateSession?: (session: ProjectSession) => void;
  onNavigateToMixer?: () => void;
  onExpandToView?: () => void;
  onClose?: () => void;
  containerClassName?: string;
}

const FILTER_TABS: { id: TemplateFilterCategory; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'CUSTOM', label: 'My Saved' },
  { id: 'RECORDING', label: 'Recording' },
  { id: 'ELECTRONIC', label: 'Electronic' },
  { id: 'MASTERING', label: 'Mastering' },
  { id: 'BROADCAST', label: 'Broadcast' }
];

const SAVE_CATEGORIES: { id: TemplateCategory; label: string }[] = [
  { id: 'CUSTOM', label: 'Custom Setup' },
  { id: 'RECORDING', label: 'Recording' },
  { id: 'ELECTRONIC', label: 'Electronic' },
  { id: 'MASTERING', label: 'Mastering' },
  { id: 'BROADCAST', label: 'Broadcast' }
];

const TemplateGridCanvasPreview: React.FC<{
  tracks: ReadonlyArray<TemplateLayoutTrackInput>;
  tempo: number;
  metadata?: TemplateProjectMetadata;
  width?: number;
  height?: number;
  className?: string;
}> = ({ tracks, tempo, metadata, width = 320, height = 120, className = 'w-full h-auto block' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderTrackLayoutGridToCanvas(canvas, { tracks, tempo, metadata });
  }, [tracks, tempo, metadata]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      aria-label="Template track layout grid preview"
    />
  );
};

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  variant = 'panel',
  tracks,
  setTracks,
  tempo,
  setTempo,
  activeSession,
  onUpdateSession,
  onNavigateToMixer,
  onExpandToView,
  onClose,
  containerClassName = 'h-full'
}) => {
  const { templates, customCount } = useTemplateGallery();
  const [filterCategory, setFilterCategory] = useState<TemplateFilterCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(() => templates[0]?.id || '');
  const [inspectorTab, setInspectorTab] = useState<'routing' | 'json'>('routing');

  // Save current workspace drawer
  const [isSaveDrawerOpen, setIsSaveDrawerOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveCategory, setSaveCategory] = useState<TemplateCategory>('CUSTOM');
  const [saveDescription, setSaveDescription] = useState('');
  const [saveTagsInput, setSaveTagsInput] = useState('');
  const [includeAutomation, setIncludeAutomation] = useState(true);
  const savePreviewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Import JSON drawer
  const [isImportDrawerOpen, setIsImportDrawerOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Feedback state
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage(prev => (prev === msg ? null : prev));
    }, 3000);
  };

  // Current live session summary for the Save Capture drawer
  const currentSessionSummary = useMemo(() => {
    let vstCount = 0;
    const busSet = new Set<string>();
    tracks.forEach(t => {
      const liveVsts = vstWrapperService.getInstancesForTrack(t.id);
      const uniqueVsts = new Set([...(t.vsts || []), ...liveVsts.map(i => i.name)]);
      vstCount += uniqueVsts.size;
      if (t.bus) busSet.add(t.bus);
      (t.sends || []).forEach(s => {
        if (s.target) busSet.add(s.target);
      });
    });
    return {
      trackCount: tracks.length,
      vstCount,
      busCount: busSet.size
    };
  }, [tracks]);

  const saveLiveMetadata = useMemo(
    () => deriveTemplateMetadata(tracks, tempo, saveCategory),
    [tracks, tempo, saveCategory]
  );

  useEffect(() => {
    if (!isSaveDrawerOpen || !savePreviewCanvasRef.current) return;
    renderTrackLayoutGridToCanvas(savePreviewCanvasRef.current, {
      tracks,
      tempo,
      metadata: saveLiveMetadata
    });
  }, [isSaveDrawerOpen, tracks, tempo, saveLiveMetadata]);

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return templates.filter(tmpl => {
      if (filterCategory === 'CUSTOM' && tmpl.isBuiltIn) return false;
      if (
        filterCategory !== 'ALL' &&
        filterCategory !== 'CUSTOM' &&
        tmpl.category !== filterCategory
      ) {
        return false;
      }
      if (!q) return true;

      const meta = tmpl.metadata || deriveTemplateMetadata(tmpl.tracks, tmpl.tempo, tmpl.category);
      const haystack = [
        tmpl.name,
        tmpl.description,
        tmpl.category,
        meta.genre,
        meta.bpmCategory,
        `${meta.instrumentCount} instruments`,
        ...(tmpl.tags || []),
        ...tmpl.buses.map(b => b.name),
        ...tmpl.tracks.flatMap(t => [t.name, t.bus || '', t.instrument || '', ...(t.vsts || [])])
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [templates, filterCategory, searchQuery]);

  const selectedTemplate = useMemo(() => {
    return (
      filteredTemplates.find(t => t.id === selectedId) ||
      templates.find(t => t.id === selectedId) ||
      filteredTemplates[0] ||
      templates[0] ||
      null
    );
  }, [filteredTemplates, templates, selectedId]);

  const selectedTemplateMeta = useMemo(() => {
    if (!selectedTemplate) return null;
    return (
      selectedTemplate.metadata ||
      deriveTemplateMetadata(selectedTemplate.tracks, selectedTemplate.tempo, selectedTemplate.category)
    );
  }, [selectedTemplate]);

  const selectedTemplateJson = useMemo(() => {
    if (!selectedTemplate) return '';
    return templateGalleryService.exportTemplateJson(selectedTemplate);
  }, [selectedTemplate]);

  const handleOpenSaveDrawer = () => {
    setIsImportDrawerOpen(false);
    setIsSaveDrawerOpen(prev => {
      const next = !prev;
      if (next && !saveName.trim()) {
        const baseName = activeSession?.name?.replace(/\.slp$/i, '') || 'Studio Routing';
        setSaveName(`${baseName} Template`);
      }
      return next;
    });
  };

  const handleSaveCurrentSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (tracks.length === 0) {
      showStatus('Add at least one track before saving a template.');
      return;
    }

    const parsedTags = saveTagsInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    let capturedPreviewDataUrl: string | undefined;
    try {
      if (savePreviewCanvasRef.current) {
        renderTrackLayoutGridToCanvas(savePreviewCanvasRef.current, {
          tracks,
          tempo,
          metadata: saveLiveMetadata
        });
        capturedPreviewDataUrl = savePreviewCanvasRef.current.toDataURL('image/png');
      }
    } catch {
      capturedPreviewDataUrl = undefined;
    }
    if (!capturedPreviewDataUrl) {
      capturedPreviewDataUrl = captureTrackLayoutCanvasDataUrl({
        tracks,
        tempo,
        metadata: saveLiveMetadata
      });
    }

    const created = templateGalleryService.captureFromSession({
      name: saveName,
      category: saveCategory,
      description: saveDescription,
      tags: parsedTags,
      tracks,
      tempo,
      sampleRate: activeSession?.sampleRate || 48000,
      bitDepth: activeSession?.bitDepth || 24,
      includeAutomation,
      layoutPreviewDataUrl: capturedPreviewDataUrl
    });

    playLaserBeamSound('laser_curve');
    setSelectedId(created.id);
    setFilterCategory('ALL');
    setIsSaveDrawerOpen(false);
    setSaveName('');
    setSaveDescription('');
    setSaveTagsInput('');
    showStatus(
      `Saved "${created.name}" (${created.metadata?.genre || saveLiveMetadata.genre} · ${created.tracks.length} tracks)`
    );
  };

  const handleLoadTemplate = (template: ReusableProjectTemplate, mode: 'replace' | 'append') => {
    const label = mode === 'replace' ? `Load Template [${template.name}]` : `Append Template [${template.name}]`;
    projectHistory.pushSnapshot(label, tracks, tempo);

    const result = templateGalleryService.materializeTemplateTracks(template, {
      mode,
      existingTracks: tracks
    });

    setTracks(result.tracks);
    if (mode === 'replace') {
      setTempo(result.tempo);
      if (onUpdateSession) {
        onUpdateSession({
          name: `${template.name.replace(/\s+/g, '_')}.slp`,
          templateId: template.id,
          templateName: template.name,
          bpm: result.tempo,
          sampleRate: result.sampleRate,
          bitDepth: result.bitDepth
        });
      }
    }

    playLaserBeamSound('laser_curve');
    const vstNote = result.restoredVstCount > 0 ? ` · ${result.restoredVstCount} VSTs wired` : '';
    showStatus(
      mode === 'replace'
        ? `Loaded "${template.name}" (${template.tracks.length} tracks${vstNote})`
        : `Appended ${template.tracks.length} tracks from "${template.name}"${vstNote}`
    );

    if (variant === 'view' && onNavigateToMixer) {
      onNavigateToMixer();
    }
  };

  const triggerJsonDownload = (template: ReusableProjectTemplate, customFilenameBase?: string) => {
    const json = templateGalleryService.exportTemplateJson(template);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const slug = (customFilenameBase || template.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const filename = `${slug || 'strangelet-template'}.strangelet-template.json`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    playLaserBeamSound('laser_select');
    showStatus(`Exported ${filename} (${template.tracks.length} tracks)`);
  };

  const handleExportCurrentTemplate = () => {
    if (tracks.length === 0) {
      showStatus('Add at least one track before exporting a template.');
      return;
    }

    const baseName =
      activeSession?.name?.replace(/\.slp$/i, '').replace(/[_-]+/g, ' ').trim() ||
      'Strangelet Project Setup';

    const liveSnapshot = templateGalleryService.buildLiveTemplateSnapshot({
      name: `${baseName} Template`,
      category: 'CUSTOM',
      description: `Exported live configuration: ${tracks.length} tracks, VST insert chains, and bus sends.`,
      tracks,
      tempo,
      sampleRate: activeSession?.sampleRate || 48000,
      bitDepth: activeSession?.bitDepth || 24,
      includeAutomation: true
    });

    triggerJsonDownload(liveSnapshot, baseName);
  };

  const handleDownloadJson = (template: ReusableProjectTemplate) => {
    triggerJsonDownload(template);
  };

  const handleCopyJson = async (template: ReusableProjectTemplate) => {
    const json = templateGalleryService.exportTemplateJson(template);
    try {
      await navigator.clipboard.writeText(json);
      setCopiedId(template.id);
      playLaserBeamSound('laser_select');
      showStatus(`Copied JSON for "${template.name}"`);
      setTimeout(() => setCopiedId(prev => (prev === template.id ? null : prev)), 2000);
    } catch {
      showStatus('Clipboard permission unavailable — use Download JSON instead.');
    }
  };

  const applyImportedTemplate = (
    jsonText: string,
    loadIntoProject: boolean,
    sourceFileName?: string
  ) => {
    const imported = templateGalleryService.importTemplateFromJson(jsonText);
    setSelectedId(imported.id);
    setFilterCategory('ALL');
    setIsImportDrawerOpen(false);
    setImportJsonText('');

    if (loadIntoProject) {
      handleLoadTemplate(imported, 'replace');
      if (sourceFileName) {
        showStatus(`Imported "${imported.name}" from ${sourceFileName} and loaded into project`);
      }
    } else {
      playLaserBeamSound('laser_curve');
      showStatus(
        sourceFileName
          ? `Imported "${imported.name}" from ${sourceFileName} to gallery`
          : `Imported "${imported.name}" (${imported.tracks.length} tracks)`
      );
    }
  };

  const handleImportJsonSubmit = (e: React.FormEvent, loadIntoProject: boolean = true) => {
    e.preventDefault();
    setImportError(null);
    if (!importJsonText.trim()) {
      setImportError('Paste JSON template data or select a .json file.');
      return;
    }

    try {
      applyImportedTemplate(importJsonText, loadIntoProject);
    } catch (err: any) {
      setImportError(err?.message || 'Unable to parse template JSON.');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    try {
      const text = await file.text();
      applyImportedTemplate(text, true, file.name);
    } catch (err: any) {
      setIsImportDrawerOpen(true);
      setImportError(err?.message || `Failed to import ${file.name}`);
    } finally {
      e.target.value = '';
    }
  };

  const handleDuplicate = (template: ReusableProjectTemplate) => {
    const copy = templateGalleryService.duplicateTemplate(template);
    setSelectedId(copy.id);
    setFilterCategory('ALL');
    playLaserBeamSound('laser_select');
    showStatus(`Duplicated as "${copy.name}"`);
  };

  const handleDelete = (template: ReusableProjectTemplate) => {
    if (template.isBuiltIn) return;
    templateGalleryService.deleteCustomTemplate(template.id);
    playLaserBeamSound('laser_erase');
    showStatus(`Deleted "${template.name}"`);
  };

  const countVsts = (tmpl: ReusableProjectTemplate) =>
    tmpl.tracks.reduce(
      (sum, t) => sum + Math.max(t.vsts?.length || 0, t.vstChainInstances?.length || 0),
      0
    );

  const isView = variant === 'view';

  return (
    <div
      className={
        isView
          ? 'h-full flex flex-col bg-[#05070E] text-slate-100 p-4 md:p-6 overflow-hidden'
          : `w-full lg:w-[420px] shrink-0 bg-[#070A12] border border-[#1E293B] rounded-xl flex flex-col overflow-hidden ${containerClassName}`
      }
      aria-label="Template Gallery"
    >
      {/* Hidden JSON File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleImportFile}
      />

      {/* Header */}
      <div
        className={
          isView
            ? 'flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1E293B] shrink-0'
            : 'px-4 py-2.5 border-b border-[#1E293B] bg-[#0B0F1A] flex items-center justify-between gap-2 shrink-0'
        }
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <FolderKanban size={isView ? 20 : 16} className="text-[#FF8C00] shrink-0" />
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h2 className={`${isView ? 'text-xl font-bold' : 'text-sm font-semibold'} text-white tracking-tight truncate`}>
                Template Gallery
              </h2>
              <span className="text-xs font-mono tabular-nums text-[#94A3B8] whitespace-nowrap">
                {templates.length} templates · {customCount} custom
              </span>
            </div>
            {isView && (
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Save, inspect, import, and load track configurations, VST insert chains, and bus routing setups as reusable JSON templates.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleOpenSaveDrawer}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              isSaveDrawerOpen
                ? 'bg-[#FF8C00] text-black'
                : 'bg-[#FF8C00]/15 text-[#FFD700] border border-[#FF8C00]/50 hover:bg-[#FF8C00] hover:text-black'
            }`}
            title="Save your current tracks, VST chains, and routing to the gallery"
          >
            <Save size={13} />
            <span>{isView ? 'Save Current Setup' : 'Save Setup'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCurrentTemplate}
            disabled={tracks.length === 0}
            className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border whitespace-nowrap shrink-0 bg-[#0D1322] text-[#00F0FF] border-[#1E293B] hover:border-[#00F0FF]/70 hover:bg-[#111C33] disabled:opacity-40 disabled:cursor-not-allowed"
            title="Serialize current project tracks, VST chains, and routing to a downloadable .json file"
          >
            <Download size={13} />
            <span>Export Template</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border whitespace-nowrap shrink-0 bg-[#0D1322] text-slate-200 border-[#1E293B] hover:border-[#38BDF8] hover:text-white"
            title="Import an external .json template file and load it into the project"
          >
            <Upload size={13} />
            <span>Import</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsSaveDrawerOpen(false);
              setIsImportDrawerOpen(prev => !prev);
            }}
            className={`p-1.5 rounded-lg text-xs font-medium flex items-center transition-colors cursor-pointer border shrink-0 ${
              isImportDrawerOpen
                ? 'bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]'
                : 'bg-[#0D1322] text-[#94A3B8] border-[#1E293B] hover:border-[#38BDF8] hover:text-white'
            }`}
            title="Paste raw JSON template data"
          >
            <FileJson size={14} />
          </button>

          {!isView && onExpandToView && (
            <button
              type="button"
              onClick={onExpandToView}
              className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#161E31] border border-transparent hover:border-[#1E293B] transition-colors cursor-pointer"
              title="Open Full Template Gallery View"
            >
              <Maximize2 size={14} />
            </button>
          )}

          {isView && onNavigateToMixer && (
            <button
              type="button"
              onClick={onNavigateToMixer}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#111827] hover:bg-[#1E293B] text-slate-200 border border-[#1E293B] flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Back to Mixer</span>
              <ArrowRight size={13} />
            </button>
          )}

          {!isView && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#161E31] transition-colors cursor-pointer"
              title="Close Template Gallery Panel"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Inline Status Notice */}
      {statusMessage && (
        <div className="px-4 py-2 bg-emerald-950/60 border-b border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Check size={14} className="text-emerald-400 shrink-0" />
            <span className="truncate">{statusMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-emerald-300/70 hover:text-white text-xs cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Expandable Save Current Session Capture Form */}
      {isSaveDrawerOpen && (
        <form
          onSubmit={handleSaveCurrentSetup}
          className="px-4 py-3 bg-[#090D18] border-b border-[#1E293B] space-y-2.5 shrink-0"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-white">
              Capture Active Session Setup
            </span>
            <span className="text-[11px] font-mono tabular-nums text-[#94A3B8]">
              {currentSessionSummary.trackCount} tracks · {currentSessionSummary.vstCount} VSTs · {currentSessionSummary.busCount} buses · {tempo} BPM
            </span>
          </div>

          <div className={`grid gap-2 ${isView ? 'grid-cols-1 md:grid-cols-4' : 'grid-cols-1'}`}>
            <input
              type="text"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              placeholder="Template name (e.g. Synthwave Vocal + Bus)"
              className={`px-3 py-1.5 bg-[#04060C] border border-[#1E293B] rounded-lg text-xs text-white focus:outline-none focus:border-[#FF8C00] ${
                isView ? 'md:col-span-2' : ''
              }`}
              required
            />
            <select
              value={saveCategory}
              onChange={e => setSaveCategory(e.target.value as TemplateCategory)}
              className="px-2.5 py-1.5 bg-[#04060C] border border-[#1E293B] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-[#FF8C00]"
            >
              {SAVE_CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={saveTagsInput}
              onChange={e => setSaveTagsInput(e.target.value)}
              placeholder="Tags (comma-separated)"
              className="px-3 py-1.5 bg-[#04060C] border border-[#1E293B] rounded-lg text-xs text-white focus:outline-none focus:border-[#FF8C00]"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-3 items-stretch pt-0.5">
            <div className="w-full md:w-[270px] shrink-0 rounded-lg border border-[#1E293B] bg-[#04060C] overflow-hidden">
              <div className="px-2.5 py-1 border-b border-[#1E293B] bg-[#0B101D] flex items-center justify-between text-[10px] font-mono text-[#94A3B8]">
                <span className="flex items-center gap-1 text-slate-200 font-semibold">
                  <LayoutGrid size={11} className="text-[#00F0FF]" />
                  <span>Canvas Grid Capture</span>
                </span>
                <span>Live</span>
              </div>
              <canvas
                ref={savePreviewCanvasRef}
                width={300}
                height={116}
                className="w-full h-auto block"
                aria-label="Live track structure canvas preview"
              />
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 rounded-lg bg-[#04060C] border border-[#1E293B]">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#64748B]">
                    BPM Category
                  </div>
                  <div className="text-xs font-medium text-cyan-300 truncate mt-0.5">
                    {saveLiveMetadata.bpmCategory}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#64748B]">
                    Instrument Count
                  </div>
                  <div className="text-xs font-mono tabular-nums text-amber-300 truncate mt-0.5">
                    {saveLiveMetadata.instrumentCount} ({saveLiveMetadata.midiTrackCount} MIDI / {saveLiveMetadata.audioTrackCount} Audio)
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#64748B]">
                    Auto Genre
                  </div>
                  <div className="text-xs font-medium text-emerald-300 truncate mt-0.5">
                    {saveLiveMetadata.genre}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <input
                  type="text"
                  value={saveDescription}
                  onChange={e => setSaveDescription(e.target.value)}
                  placeholder="Notes on routing, sends, or VST chain..."
                  className="flex-1 min-w-[200px] px-3 py-1.5 bg-[#04060C] border border-[#1E293B] rounded-lg text-xs text-white focus:outline-none focus:border-[#FF8C00]"
                />
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={includeAutomation}
                    onChange={e => setIncludeAutomation(e.target.checked)}
                    className="accent-[#FF8C00]"
                  />
                  <span>Include automation</span>
                </label>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsSaveDrawerOpen(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white border border-[#1E293B] cursor-pointer whitespace-nowrap"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#FF8C00] hover:bg-[#FFA229] text-black cursor-pointer whitespace-nowrap"
                  >
                    Save Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Expandable Import JSON Drawer */}
      {isImportDrawerOpen && (
        <form
          onSubmit={e => handleImportJsonSubmit(e, true)}
          className="px-4 py-3 bg-[#090D18] border-b border-[#1E293B] space-y-2.5 shrink-0"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-semibold text-white">
              Import External JSON Project Template
            </span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#0E1628] hover:bg-[#17233E] text-[#00F0FF] border border-[#1E293B] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <FileJson size={13} />
              <span>Choose .json File</span>
            </button>
          </div>

          <textarea
            value={importJsonText}
            onChange={e => setImportJsonText(e.target.value)}
            rows={4}
            placeholder='Paste exported JSON template payload here ({"schemaVersion": "strangelet-template/v1", "tracks": [...]})'
            className="w-full px-3 py-2 bg-[#04060C] border border-[#1E293B] rounded-lg text-[11px] font-mono text-slate-200 focus:outline-none focus:border-[#00F0FF] resize-y"
          />

          {importError && (
            <p className="text-xs text-red-400">{importError}</p>
          )}

          <div className="flex items-center justify-end gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setIsImportDrawerOpen(false);
                setImportError(null);
              }}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white border border-[#1E293B] cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={e => handleImportJsonSubmit(e, false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0D1322] hover:bg-[#162038] text-slate-200 border border-[#1E293B] cursor-pointer whitespace-nowrap"
            >
              Save to Gallery Only
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#00F0FF] hover:bg-[#33F3FF] text-black cursor-pointer whitespace-nowrap"
            >
              Import & Load into Project
            </button>
          </div>
        </form>
      )}

      {/* Search & Category Filter Bar */}
      <div
        className={`border-b border-[#1E293B] bg-[#070A12] shrink-0 flex flex-wrap items-center justify-between gap-2.5 ${
          isView ? 'py-3' : 'px-4 py-2.5'
        }`}
      >
        <div className="flex items-center gap-1 p-1 bg-[#04060C] border border-[#1E293B] rounded-lg overflow-x-auto">
          {FILTER_TABS.map(tab => {
            const active = filterCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterCategory(tab.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#1E293B] text-white'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className={`relative ${isView ? 'w-full sm:w-72' : 'w-full'}`}>
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search templates, VSTs, or buses..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#04060C] border border-[#1E293B] rounded-lg text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#00F0FF]"
          />
        </div>
      </div>

      {/* Main Content Split: Gallery List + Inspector */}
      <div
        className={`flex-1 min-h-0 flex ${
          isView ? 'flex-col lg:flex-row gap-4 pt-4' : 'flex-col overflow-hidden'
        }`}
      >
        {/* Template Cards List / Grid */}
        <div
          className={`${
            isView
              ? 'flex-1 min-h-0 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-2 gap-3 content-start'
              : 'max-h-[42%] overflow-y-auto px-3 py-2.5 space-y-2 border-b border-[#1E293B]'
          }`}
        >
          {filteredTemplates.length === 0 ? (
            <div className="col-span-full py-10 px-4 text-center border border-dashed border-[#1E293B] rounded-xl bg-[#070A12]">
              <p className="text-sm font-medium text-slate-200">
                {filterCategory === 'CUSTOM' && customCount === 0
                  ? 'No custom templates saved yet'
                  : 'No templates match your filter'}
              </p>
              <p className="text-xs text-[#94A3B8] mt-1 max-w-md mx-auto">
                {filterCategory === 'CUSTOM' && customCount === 0
                  ? 'Capture your active track layout, VST parameter chains, and bus sends as a reusable JSON template.'
                  : 'Try clearing your search filter or import a saved JSON template.'}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenSaveDrawer}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FF8C00] text-black hover:bg-[#FFA229] cursor-pointer whitespace-nowrap"
                >
                  Save Current Setup
                </button>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterCategory('ALL');
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-300 border border-[#1E293B] hover:text-white cursor-pointer whitespace-nowrap"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            filteredTemplates.map(tmpl => {
              const isSelected = selectedTemplate?.id === tmpl.id;
              const vstTotal = countVsts(tmpl);
              const meta = tmpl.metadata || deriveTemplateMetadata(tmpl.tracks, tmpl.tempo, tmpl.category);
              return (
                <div
                  key={tmpl.id}
                  onClick={() => setSelectedId(tmpl.id)}
                  className={`rounded-xl border p-3.5 transition-colors cursor-pointer flex flex-col justify-between gap-2.5 ${
                    isSelected
                      ? 'bg-[#0E1526] border-[#FF8C00]/80'
                      : 'bg-[#090D16] border-[#1E293B] hover:border-[#334155]'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-white leading-snug truncate">
                        {tmpl.name}
                      </h3>
                      <span className="text-[11px] font-mono text-[#94A3B8] whitespace-nowrap shrink-0">
                        {tmpl.isBuiltIn ? 'Built-in' : 'Saved'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums text-[#94A3B8] mt-1 flex-wrap">
                      <span>{tmpl.tracks.length} tracks</span>
                      <span aria-hidden="true">·</span>
                      <span>{vstTotal} VSTs</span>
                      <span aria-hidden="true">·</span>
                      <span>{tmpl.buses.length} buses</span>
                      <span aria-hidden="true">·</span>
                      <span>{tmpl.tempo} BPM</span>
                    </div>

                    <div className="text-[11px] font-mono text-cyan-300/90 mt-1 truncate">
                      {meta.genre} · {meta.bpmCategory} · {meta.instrumentCount} inst
                    </div>

                    {(isView || tmpl.layoutPreviewDataUrl) && (
                      <div className="mt-2.5 rounded-lg border border-[#1E293B] bg-[#04060C] overflow-hidden">
                        {tmpl.layoutPreviewDataUrl ? (
                          <img
                            src={tmpl.layoutPreviewDataUrl}
                            alt={`${tmpl.name} track structure preview`}
                            className="w-full h-auto block"
                          />
                        ) : (
                          <TemplateGridCanvasPreview
                            tracks={tmpl.tracks}
                            tempo={tmpl.tempo}
                            metadata={meta}
                            width={300}
                            height={108}
                          />
                        )}
                      </div>
                    )}

                    <p className="text-xs text-[#94A3B8] mt-2 line-clamp-2 leading-relaxed">
                      {tmpl.description}
                    </p>
                  </div>

                  {isView && (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#1E293B]/60">
                      <span className="text-[11px] font-mono text-[#64748B] truncate">
                        {tmpl.category} · {(tmpl.sampleRate / 1000).toFixed(1)} kHz
                      </span>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleLoadTemplate(tmpl, 'replace');
                        }}
                        className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#FF8C00]/15 text-[#FFD700] hover:bg-[#FF8C00] hover:text-black border border-[#FF8C00]/40 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Load Template
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Selected Template Detail Inspector & Actions */}
        {selectedTemplate && (
          <div
            className={
              isView
                ? 'w-full lg:w-[440px] shrink-0 bg-[#090D16] border border-[#1E293B] rounded-xl flex flex-col overflow-hidden'
                : 'flex-1 min-h-0 flex flex-col overflow-hidden bg-[#060810]'
            }
          >
            {/* Inspector Header */}
            <div className="px-4 py-3 border-b border-[#1E293B] bg-[#0B0F1A] shrink-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">
                    {selectedTemplate.name}
                  </h3>
                  <div className="text-[11px] font-mono tabular-nums text-[#94A3B8] mt-0.5">
                    {selectedTemplate.tracks.length} tracks · {countVsts(selectedTemplate)} VST plugins · {selectedTemplate.buses.length} buses · {selectedTemplate.tempo} BPM
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDuplicate(selectedTemplate)}
                    className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#161E31] transition-colors cursor-pointer"
                    title="Duplicate Template"
                  >
                    <CopyPlus size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadJson(selectedTemplate)}
                    className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#00F0FF] hover:bg-[#161E31] transition-colors cursor-pointer"
                    title="Export Template as .json File"
                  >
                    <Download size={14} />
                  </button>
                  {!selectedTemplate.isBuiltIn && (
                    <button
                      type="button"
                      onClick={() => handleDelete(selectedTemplate)}
                      className="p-1.5 rounded-lg text-[#94A3B8] hover:text-red-400 hover:bg-[#161E31] transition-colors cursor-pointer"
                      title="Delete Custom Template"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Inspector Sub-Tabs */}
              <div className="flex items-center justify-between gap-2 mt-2.5">
                <div className="flex items-center gap-1 p-0.5 bg-[#05070D] border border-[#1E293B] rounded-lg">
                  <button
                    type="button"
                    onClick={() => setInspectorTab('routing')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      inspectorTab === 'routing'
                        ? 'bg-[#1E293B] text-white'
                        : 'text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    Tracks, VSTs & Routing
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectorTab('json')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      inspectorTab === 'json'
                        ? 'bg-[#1E293B] text-white'
                        : 'text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    JSON Schema
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyJson(selectedTemplate)}
                  className="px-2 py-1 rounded-md text-[11px] text-slate-300 hover:text-white border border-[#1E293B] hover:border-[#334155] flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                >
                  {copiedId === selectedTemplate.id ? (
                    <>
                      <Check size={12} className="text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Inspector Scroll Area */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
              {inspectorTab === 'routing' ? (
                <>
                  {/* Visual Layout Preview & Auto-Tagged Metadata */}
                  <div className="pb-2.5 border-b border-[#1E293B]/70 space-y-2">
                    <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5">
                        <LayoutGrid size={13} className="text-[#00F0FF]" />
                        <span>Track Structure Preview</span>
                      </span>
                      <span className="text-[10px] font-mono text-[#64748B]">
                        {selectedTemplate.layoutPreviewDataUrl ? 'Saved Canvas Capture' : 'Live Layout Grid'}
                      </span>
                    </div>

                    <div className="rounded-lg border border-[#1E293B] bg-[#04060C] overflow-hidden">
                      {selectedTemplate.layoutPreviewDataUrl ? (
                        <img
                          src={selectedTemplate.layoutPreviewDataUrl}
                          alt={`${selectedTemplate.name} visual track structure`}
                          className="w-full h-auto block"
                        />
                      ) : (
                        <TemplateGridCanvasPreview
                          tracks={selectedTemplate.tracks}
                          tempo={selectedTemplate.tempo}
                          metadata={selectedTemplateMeta || undefined}
                          width={340}
                          height={128}
                        />
                      )}
                    </div>

                    {selectedTemplateMeta && (
                      <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-[#05070D] border border-[#1E293B]">
                        <div className="min-w-0">
                          <div className="text-[10px] font-mono uppercase text-[#64748B]">
                            BPM Category
                          </div>
                          <div className="text-[11px] text-cyan-300 truncate mt-0.5">
                            {selectedTemplateMeta.bpmCategory}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-mono uppercase text-[#64748B]">
                            Instruments
                          </div>
                          <div className="text-[11px] font-mono tabular-nums text-amber-300 truncate mt-0.5">
                            {selectedTemplateMeta.instrumentCount} ({selectedTemplateMeta.midiTrackCount}M / {selectedTemplateMeta.audioTrackCount}A)
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-mono uppercase text-[#64748B]">
                            Genre
                          </div>
                          <div className="text-[11px] text-emerald-300 truncate mt-0.5">
                            {selectedTemplateMeta.genre}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Buses Summary */}
                  {selectedTemplate.buses.length > 0 && (
                    <div className="pb-2.5 border-b border-[#1E293B]/70">
                      <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                        <Workflow size={13} className="text-[#00F0FF]" />
                        <span>Routing Buses & Aux Returns</span>
                      </div>
                      <div className="space-y-1">
                        {selectedTemplate.buses.map(bus => (
                          <div
                            key={bus.id}
                            className="flex items-center justify-between text-xs py-1 text-slate-300"
                          >
                            <span className="truncate font-medium">{bus.name}</span>
                            <span className="text-[11px] font-mono text-[#64748B] shrink-0">
                              -&gt; {bus.destination}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Per-Track Config, VST Chain & Sends */}
                  <div>
                    <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
                      <Layers size={13} className="text-[#FF8C00]" />
                      <span>Track Configuration & VST Chains</span>
                    </div>

                    <div className="divide-y divide-[#1E293B]/70 border border-[#1E293B] rounded-lg bg-[#05070D]">
                      {selectedTemplate.tracks.map((t, idx) => (
                        <div key={`${t.name}-${idx}`} className="p-2.5 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-white truncate">
                              {idx + 1}. {t.name}
                            </span>
                            <span className="text-[11px] font-mono tabular-nums text-[#94A3B8] shrink-0">
                              {t.type.toUpperCase()} · {volumeToDb(t.volume)} · {panToString(t.pan)}
                            </span>
                          </div>

                          <div className="text-[11px] text-[#94A3B8] font-mono truncate">
                            In: {t.inputSource || 'Default'} · Out: {t.bus || 'Stereo Master'}
                            {t.instrument ? ` · Inst: ${t.instrument}` : ''}
                          </div>

                          {t.vsts.length > 0 && (
                            <div className="text-[11px] text-amber-300/90 flex items-start gap-1.5 pt-0.5">
                              <Cpu size={12} className="shrink-0 mt-0.5 text-[#FF8C00]" />
                              <span className="leading-snug">{t.vsts.join(' -> ')}</span>
                            </div>
                          )}

                          {t.sends.length > 0 && (
                            <div className="text-[11px] font-mono text-cyan-300/90 tabular-nums">
                              Sends: {t.sends.map(s => `${s.target} (${s.levelDb} dB)`).join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <pre className="p-3 rounded-lg bg-[#04060C] border border-[#1E293B] text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
                  {selectedTemplateJson}
                </pre>
              )}
            </div>

            {/* Inspector Footer Actions */}
            <div className="px-4 py-3 border-t border-[#1E293B] bg-[#0B0F1A] flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleLoadTemplate(selectedTemplate, 'replace')}
                className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold bg-[#FF8C00] hover:bg-[#FFA229] text-black transition-colors cursor-pointer whitespace-nowrap"
              >
                Load Template
              </button>
              <button
                type="button"
                onClick={() => handleLoadTemplate(selectedTemplate, 'append')}
                className="py-2 px-3 rounded-lg text-xs font-medium bg-[#0E1526] hover:bg-[#17223B] text-slate-200 border border-[#1E293B] flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title="Append template tracks, VST chains, and routing to current session without replacing existing tracks"
              >
                <Plus size={13} />
                <span>Append</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadJson(selectedTemplate)}
                className="py-2 px-3 rounded-lg text-xs font-medium bg-[#0E1526] hover:bg-[#17223B] text-[#00F0FF] border border-[#1E293B] flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title="Download reusable .json template file"
              >
                <Download size={13} />
                <span>JSON</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateGallery;
