// Strangelet Lab - 60-Second Background Project Auto-Save Engine
// Stores active arrangement, tracks, tempo, session configuration, and clip positions into localStorage
// Prevents work loss during long mixing and sound design sessions

import { Track, ProjectSession } from '../types';

export const AUTOSAVE_STORAGE_KEY = 'strangelet_project_autosave_v1';
export const AUTOSAVE_SETTINGS_KEY = 'strangelet_autosave_preferences_v1';
export const DEFAULT_AUTOSAVE_INTERVAL_SEC = 60;

export interface AutoSavePayload {
  version: number;
  timestamp: number;
  formattedDate: string;
  session: ProjectSession;
  tracks: Track[];
  tempo: number;
  trackCount: number;
  totalClipCount: number;
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

class ProjectAutoSaveService {
  private lastSavedTime: number | null = null;
  private listeners: Set<AutoSaveListener> = new Set();
  private isAutoSaveEnabled: boolean = true;
  private intervalSeconds: number = DEFAULT_AUTOSAVE_INTERVAL_SEC;

  constructor() {
    this.initSettings();
    const existing = this.load();
    if (existing) {
      this.lastSavedTime = existing.timestamp;
    }
  }

  private initSettings() {
    try {
      const raw = localStorage.getItem(AUTOSAVE_SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.enabled === 'boolean') this.isAutoSaveEnabled = parsed.enabled;
        if (typeof parsed.intervalSeconds === 'number') this.intervalSeconds = parsed.intervalSeconds;
      }
    } catch (e) {
      console.warn('Failed to parse autosave preferences:', e);
    }
  }

  public subscribe(listener: AutoSaveListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public isEnabled(): boolean {
    return this.isAutoSaveEnabled;
  }

  public setEnabled(enabled: boolean): void {
    this.isAutoSaveEnabled = enabled;
    try {
      localStorage.setItem(
        AUTOSAVE_SETTINGS_KEY,
        JSON.stringify({ enabled: this.isAutoSaveEnabled, intervalSeconds: this.intervalSeconds })
      );
    } catch (e) {
      console.warn('Failed to save autosave preferences:', e);
    }
  }

  public getLastSavedTimestamp(): number | null {
    return this.lastSavedTime;
  }

  /**
   * Serializes current state to localStorage
   */
  public save(session: ProjectSession, tracks: Track[], tempo: number): boolean {
    if (!this.isAutoSaveEnabled) return false;

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
        totalClipCount
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
