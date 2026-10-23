// Strangelet Lab - Project History & Undo/Redo Engine
// Tracks critical track, clip, fader, tempo, and arrangement operations
// Provides deep snapshot stacks, keyboard shortcuts (Ctrl+Z / Ctrl+Y), and audible feedback

import { Track } from '../types';
import { playLaserBeamSound } from '../lib/laserSound';

export interface ProjectSnapshot {
  id: string;
  action: string;
  tracks: Track[];
  tempo: number;
  timestamp: number;
}

type HistoryChangeListener = () => void;

class ProjectHistoryService {
  private undoStack: ProjectSnapshot[] = [];
  private redoStack: ProjectSnapshot[] = [];
  private readonly MAX_HISTORY = 60;
  private listeners: Set<HistoryChangeListener> = new Set();
  private lastActionToast: { action: string; type: 'undo' | 'redo' | 'record'; timestamp: number } | null = null;
  private toastListeners: Set<(toast: { action: string; type: 'undo' | 'redo' | 'record' }) => void> = new Set();

  private cloneState<T>(data: T): T {
    try {
      if (typeof structuredClone === 'function') {
        return structuredClone(data);
      }
      return JSON.parse(JSON.stringify(data));
    } catch {
      return JSON.parse(JSON.stringify(data));
    }
  }

  /**
   * Subscribe to history changes (undo/redo availability or stack updates)
   */
  public subscribe(listener: HistoryChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Subscribe to toast announcements for HUD feedback
   */
  public subscribeToast(callback: (toast: { action: string; type: 'undo' | 'redo' | 'record' }) => void): () => void {
    this.toastListeners.add(callback);
    return () => {
      this.toastListeners.delete(callback);
    };
  }

  private notify() {
    this.listeners.forEach(cb => {
      try {
        cb();
      } catch (err) {
        console.warn('History listener error:', err);
      }
    });
  }

  private notifyToast(toast: { action: string; type: 'undo' | 'redo' | 'record' }) {
    this.lastActionToast = { ...toast, timestamp: Date.now() };
    this.toastListeners.forEach(cb => {
      try {
        cb(toast);
      } catch (err) {
        console.warn('Toast listener error:', err);
      }
    });
  }

  /**
   * Records a snapshot before or after a critical modification
   */
  public pushSnapshot(action: string, previousTracks: Track[], previousTempo: number) {
    if (!previousTracks || previousTracks.length === 0) return;

    // Avoid recording duplicate identical states back-to-back if action and content are the same
    const last = this.undoStack[this.undoStack.length - 1];
    if (last && last.action === action && Date.now() - last.timestamp < 350) {
      // Rapid throttling for slider drags
      return;
    }

    const snapshot: ProjectSnapshot = {
      id: `snap-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      action,
      tracks: this.cloneState(previousTracks),
      tempo: previousTempo,
      timestamp: Date.now()
    };

    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.MAX_HISTORY) {
      this.undoStack.shift();
    }

    // Any new manual mutation clears the redo branch
    this.redoStack = [];
    this.notify();
  }

  /**
   * Executes Undo operation: pops last snapshot from undoStack and puts current state into redoStack
   */
  public undo(currentTracks: Track[], currentTempo: number): { tracks: Track[]; tempo: number; action: string } | null {
    if (this.undoStack.length === 0) return null;

    const previousSnapshot = this.undoStack.pop()!;

    // Save current state into redoStack
    const redoSnapshot: ProjectSnapshot = {
      id: `redo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      action: previousSnapshot.action,
      tracks: this.cloneState(currentTracks),
      tempo: currentTempo,
      timestamp: Date.now()
    };
    this.redoStack.push(redoSnapshot);
    if (this.redoStack.length > this.MAX_HISTORY) {
      this.redoStack.shift();
    }

    playLaserBeamSound('laser_select');
    this.notifyToast({ action: previousSnapshot.action, type: 'undo' });
    this.notify();

    return {
      tracks: this.cloneState(previousSnapshot.tracks),
      tempo: previousSnapshot.tempo,
      action: previousSnapshot.action
    };
  }

  /**
   * Executes Redo operation: pops snapshot from redoStack and puts current state into undoStack
   */
  public redo(currentTracks: Track[], currentTempo: number): { tracks: Track[]; tempo: number; action: string } | null {
    if (this.redoStack.length === 0) return null;

    const nextSnapshot = this.redoStack.pop()!;

    const undoSnapshot: ProjectSnapshot = {
      id: `undo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      action: nextSnapshot.action,
      tracks: this.cloneState(currentTracks),
      tempo: currentTempo,
      timestamp: Date.now()
    };
    this.undoStack.push(undoSnapshot);

    playLaserBeamSound('laser_curve');
    this.notifyToast({ action: nextSnapshot.action, type: 'redo' });
    this.notify();

    return {
      tracks: this.cloneState(nextSnapshot.tracks),
      tempo: nextSnapshot.tempo,
      action: nextSnapshot.action
    };
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public getUndoAction(): string | null {
    if (this.undoStack.length === 0) return null;
    return this.undoStack[this.undoStack.length - 1].action;
  }

  public getRedoAction(): string | null {
    if (this.redoStack.length === 0) return null;
    return this.redoStack[this.redoStack.length - 1].action;
  }

  public getHistoryCount(): { undoCount: number; redoCount: number } {
    return {
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length
    };
  }

  public clearHistory(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }

  public getLastToast() {
    return this.lastActionToast;
  }
}

export const projectHistory = new ProjectHistoryService();
