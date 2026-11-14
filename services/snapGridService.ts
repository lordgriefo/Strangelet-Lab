import { useState, useEffect, useCallback } from 'react';

export type SnapDivision =
  | '1/1'
  | '1/2'
  | '1/4'
  | '1/8'
  | '1/16'
  | '1/32'
  | 'triplet'
  | '1/8T'
  | '1/16T';

export interface SnapGridState {
  enabled: boolean;
  division: SnapDivision;
  showGridLines: boolean;
}

const STORAGE_KEY = 'strangelet_snap_grid_state';

const VALID_DIVISIONS: SnapDivision[] = [
  '1/1',
  '1/2',
  '1/4',
  '1/8',
  '1/16',
  '1/32',
  'triplet',
  '1/8T',
  '1/16T'
];

const DEFAULT_STATE: SnapGridState = {
  enabled: true,
  division: '1/16',
  showGridLines: true
};

function normalizeDivision(val: string | undefined | null): SnapDivision {
  if (!val) return '1/16';
  if (val === '1/12 T' || val === '1/12' || val === '1/8 T') return 'triplet';
  if ((VALID_DIVISIONS as string[]).includes(val)) {
    return val as SnapDivision;
  }
  return '1/16';
}

function loadInitialState(): SnapGridState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_STATE.enabled,
      division: normalizeDivision(parsed.division),
      showGridLines:
        typeof parsed.showGridLines === 'boolean'
          ? parsed.showGridLines
          : DEFAULT_STATE.showGridLines
    };
  } catch {
    return DEFAULT_STATE;
  }
}

class SnapGridService {
  private state: SnapGridState = loadInitialState();
  private listeners = new Set<(state: SnapGridState) => void>();

  private persistAndNotify() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // ignore storage quota / privacy mode errors
    }
    const snapshot = { ...this.state };
    this.listeners.forEach(listener => listener(snapshot));
  }

  public getState(): SnapGridState {
    return { ...this.state };
  }

  public getEffectiveSnapValue(): string {
    return this.state.enabled ? this.state.division : 'off';
  }

  public subscribe(listener: (state: SnapGridState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public setEnabled(enabled: boolean): void {
    if (this.state.enabled === enabled) return;
    this.state = { ...this.state, enabled };
    this.persistAndNotify();
  }

  public toggleEnabled(): boolean {
    const next = !this.state.enabled;
    this.state = { ...this.state, enabled: next };
    this.persistAndNotify();
    return next;
  }

  public setDivision(divisionOrOff: string): void {
    if (divisionOrOff === 'off' || divisionOrOff === 'freeform') {
      // Preserve last chosen division while turning snap off
      this.setEnabled(false);
      return;
    }
    const normalized = normalizeDivision(divisionOrOff);
    this.state = {
      ...this.state,
      enabled: true,
      division: normalized
    };
    this.persistAndNotify();
  }

  public setShowGridLines(showGridLines: boolean): void {
    if (this.state.showGridLines === showGridLines) return;
    this.state = { ...this.state, showGridLines };
    this.persistAndNotify();
  }

  public toggleShowGridLines(): boolean {
    const next = !this.state.showGridLines;
    this.state = { ...this.state, showGridLines: next };
    this.persistAndNotify();
    return next;
  }
}

export const snapGridService = new SnapGridService();

export function formatSnapDivisionLabel(division: string): string {
  if (division === 'triplet' || division === '1/8T') return '1/12 T';
  if (division === '1/16T') return '1/16 T';
  return division;
}

export function useSnapGrid() {
  const [snapState, setSnapState] = useState<SnapGridState>(() => snapGridService.getState());

  useEffect(() => {
    setSnapState(snapGridService.getState());
    return snapGridService.subscribe(setSnapState);
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    snapGridService.setEnabled(enabled);
  }, []);

  const toggleEnabled = useCallback(() => {
    return snapGridService.toggleEnabled();
  }, []);

  const setDivision = useCallback((division: string) => {
    snapGridService.setDivision(division);
  }, []);

  const setShowGridLines = useCallback((show: boolean) => {
    snapGridService.setShowGridLines(show);
  }, []);

  const toggleShowGridLines = useCallback(() => {
    return snapGridService.toggleShowGridLines();
  }, []);

  return {
    enabled: snapState.enabled,
    division: snapState.division,
    showGridLines: snapState.showGridLines,
    effectiveSnapValue: snapState.enabled ? snapState.division : 'off',
    setEnabled,
    toggleEnabled,
    setDivision,
    setShowGridLines,
    toggleShowGridLines
  };
}
