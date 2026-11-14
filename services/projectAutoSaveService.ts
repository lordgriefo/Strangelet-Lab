// Strangelet Lab - Configurable Background Project Auto-Save Engine
// Stores active arrangement, tracks, tempo, session configuration, and clip positions into localStorage
// Prevents work loss during long mixing and sound design sessions

import { Track, ProjectSession } from '../types';

export const AUTOSAVE_STORAGE_KEY = 'strangelet_project_autosave_v1';
export const AUTOSAVE_SETTINGS_KEY = 'strangelet_autosave_preferences_v1';
export const DEFAULT_AUTOSAVE_INTERVAL_SEC = 60;
export const MIN_AUTOSAVE_INTERVAL_SEC = 10;
export const MAX_AUTOSAVE_INTERVAL_SEC = 1800; // 30 minutes
export const AUTOSAVE_INTERVAL_PRESETS = [15, 30, 60, 120, 300, 600] as const;

export function formatAutoSaveInterval(seconds: number): string {
  const safe = Math.max(MIN_AUTOSAVE_INTERVAL_SEC, Math.round(seconds));
  if (safe < 60) return `${safe}s`;
  const mins = Math.floor(safe / 60);
  const rem = safe % 60;
  return rem === 0 ? `${mins}m` : `${mins}m ${rem}s`;
}

export interface AutoSaveSettings {
  enabled: boolean;
  intervalSeconds: number;
}

export interface AutoSavePayload {
  version: number;
  timestamp: number;
  formattedDate: string;
  session: ProjectSession;
  tracks: Track[];
  tempo: number;
  trackCount: number;
  totalClipCount: number;
  source?: 'auto' | 'manual';
}

export interface AutoSaveMetadata {
  timestamp: number;
  formattedDate: string;
  relativeTime: string;
  sessionName: string;
  templateName?: string;
  bpm: number;
  trackCount: number;
  clipCount: number;
}

type AutoSaveListener = (payload: AutoSavePayload) => void;
type AutoSaveSettingsListener = (settings: AutoSaveSettings) => void;

class ProjectAutoSaveService {
  private lastSavedTime: number | null = null;
  private listeners: Set<AutoSaveListener> = new Set();
  private settingsListeners: Set<AutoSaveSettingsListener> = new Set();
  private isAutoSaveEnabled: boolean = true;
  private intervalSeconds: number = DEFAULT_AUTOSAVE_INTERVAL_SEC;

  constructor() {
    this.initSettings();
    const existing = this.load();
    if (existing) {
      this.lastSavedTime = existing.timestamp;
    }
  }

  private clampInterval(seconds: number): number {
    if (!Number.isFinite(seconds)) return DEFAULT_AUTOSAVE_INTERVAL_SEC;
    return Math.min(MAX_AUTOSAVE_INTERVAL_SEC, Math.max(MIN_AUTOSAVE_INTERVAL_SEC, Math.round(seconds)));
  }

  private initSettings() {
    try {
      const raw = localStorage.getItem(AUTOSAVE_SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.enabled === 'boolean') this.isAutoSaveEnabled = parsed.enabled;
        if (typeof parsed.intervalSeconds === 'number') {
          this.intervalSeconds = this.clampInterval(parsed.intervalSeconds);
        }
      }
    } catch (e) {
      console.warn('Failed to parse autosave preferences:', e);
    }
  }

  private persistAndNotifySettings() {
    const snapshot = this.getSettings();
    try {
      localStorage.setItem(AUTOSAVE_SETTINGS_KEY, JSON.stringify(snapshot));
    } catch (e) {
      console.warn('Failed to save autosave preferences:', e);
    }
    this.settingsListeners.forEach(cb => {
      try {
        cb(snapshot);
      } catch (err) {
        console.warn('Autosave settings listener error:', err);
      }
    });
  }

  public subscribe(listener: AutoSaveListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public subscribeSettings(listener: AutoSaveSettingsListener): () => void {
    this.settingsListeners.add(listener);
    return () => {
      this.settingsListeners.delete(listener);
    };
  }

  public getSettings(): AutoSaveSettings {
    return {
      enabled: this.isAutoSaveEnabled,
      intervalSeconds: this.intervalSeconds
    };
  }

  public isEnabled(): boolean {
    return this.isAutoSaveEnabled;
  }

  public setEnabled(enabled: boolean): void {
    this.isAutoSaveEnabled = enabled;
    this.persistAndNotifySettings();
  }

  public getIntervalSeconds(): number {
    return this.intervalSeconds;
  }

  public setIntervalSeconds(seconds: number): void {
    this.intervalSeconds = this.clampInterval(seconds);
    this.persistAndNotifySettings();
  }

  public getLastSavedTimestamp(): number | null {
    return this.lastSavedTime;
  }

  /**
   * Serializes current state to localStorage
   */
  public save(
    session: ProjectSession,
    tracks: Track[],
    tempo: number,
    options?: { force?: boolean; source?: 'auto' | 'manual' }
  ): boolean {
    const force = options?.force ?? false;
    if (!force && !this.isAutoSaveEnabled) return false;

    try {
      const totalClipCount = tracks.reduce((acc, t) => acc + (t.clips?.length || 0), 0);
      const now = Date.now();
      const dateStr = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const payload: AutoSavePayload = {
        version: 1,
        timestamp: now,
        formattedDate: dateStr,
        session: {
          ...session,
          bpm: tempo
        },
        tracks,
        tempo,
        trackCount: tracks.length,
        totalClipCount,
        source: options?.source ?? (force ? 'manual' : 'auto')
      };

      localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(payload));
      this.lastSavedTime = now;

      // Notify listeners
      this.listeners.forEach(cb => {
        try {
          cb(payload);
        } catch (err) {
          console.warn('Autosave listener error:', err);
        }
      });

      return true;
    } catch (err) {
      console.error('Failed to auto-save project to localStorage:', err);
      return false;
    }
  }

  /**
   * Retrieves auto-saved project from localStorage
   */
  public load(): AutoSavePayload | null {
    try {
      const raw = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AutoSavePayload;
      if (!parsed || !Array.isArray(parsed.tracks) || !parsed.session) {
        return null;
      }
      return parsed;
    } catch (err) {
      console.warn('Failed to read auto-save payload:', err);
      return null;
    }
  }

  /**
   * Checks if an auto-save file is present
   */
  public hasAutoSave(): boolean {
    return Boolean(localStorage.getItem(AUTOSAVE_STORAGE_KEY));
  }

  /**
   * Gets quick metadata about the stored auto-save
   */
  public getMetadata(): AutoSaveMetadata | null {
    const data = this.load();
    if (!data) return null;

    const diffMs = Date.now() - data.timestamp;
    let relative = 'Just now';
    if (diffMs > 60000) {
      const mins = Math.floor(diffMs / 60000);
      relative = mins === 1 ? '1 minute ago' : `${mins} minutes ago`;
    } else if (diffMs > 10000) {
      relative = `${Math.floor(diffMs / 1000)} seconds ago`;
    }

    return {
      timestamp: data.timestamp,
      formattedDate: data.formattedDate || new Date(data.timestamp).toLocaleTimeString(),
      relativeTime: relative,
      sessionName: data.session?.name || 'Untitled Project',
      templateName: data.session?.templateName,
      bpm: data.tempo || data.session?.bpm || 120,
      trackCount: data.trackCount || data.tracks?.length || 0,
      clipCount: data.totalClipCount || 0
    };
  }

  /**
   * Clears auto-saved session
   */
  public clear(): void {
    try {
      localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
      this.lastSavedTime = null;
    } catch (e) {
      console.warn('Failed to clear auto-save:', e);
    }
  }
}

export const projectAutoSave = new ProjectAutoSaveService();
