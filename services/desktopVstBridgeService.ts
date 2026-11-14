/**
 * Desktop Native VST Bridge Service
 * 
 * Provides unified cross-platform communication between Strangelet Lab UI
 * and native desktop VST3/AU hosts implemented in Tauri (Rust + C++ JUCE FFI)
 * or Electron (Node.js native C++ addons).
 * 
 * In standard web browsers, provides a high-fidelity simulation and diagnostic suite
 * to verify IPC pipelines, mock system directories, and prepare projects for desktop export.
 */

export type DesktopRuntimeEnvironment = 'web_browser' | 'tauri_native' | 'electron_native';

export interface NativePluginInfo {
  id: string;
  name: string;
  vendor: string;
  version: string;
  format: 'VST3' | 'AU' | 'CLAP';
  path: string;
  category: 'EQ' | 'Dynamics' | 'Synth' | 'Reverb' | 'Delay' | 'Mastering' | 'Distortion';
  hasNativeGui: boolean;
  parameterCount: number;
  latencySamples: number;
}

export interface NativePluginInstance {
  instanceId: string;
  pluginId: string;
  pluginPath: string;
  trackId: string;
  isWindowOpen: boolean;
  bypassed: boolean;
  sampleRate: number;
  parameters: {
    index: number;
    name: string;
    value: number; // 0.0 - 1.0 normalized
    displayValue: string;
    unit: string;
  }[];
}

class DesktopVstBridgeService {
  private runtime: DesktopRuntimeEnvironment;
  private mockDiscoveredPlugins: NativePluginInfo[] = [
    {
      id: 'fabfilter-pro-q3-native',
      name: 'FabFilter Pro-Q 3',
      vendor: 'FabFilter',
      version: '3.2.4',
      format: 'VST3',
      path: 'C:\\Program Files\\Common Files\\VST3\\FabFilter Pro-Q 3.vst3',
      category: 'EQ',
      hasNativeGui: true,
      parameterCount: 192,
      latencySamples: 0
    },
    {
      id: 'serum-synth-native',
      name: 'Serum WaveTable Synthesizer',
      vendor: 'Xfer Records',
      version: '1.36.8',
      format: 'VST3',
      path: 'C:\\Program Files\\Common Files\\VST3\\Serum.vst3',
      category: 'Synth',
      hasNativeGui: true,
      parameterCount: 284,
      latencySamples: 0
    },
    {
      id: 'valhalla-vintage-verb-native',
      name: 'ValhallaVintageVerb',
      vendor: 'Valhalla DSP',
      version: '3.0.0',
      format: 'VST3',
      path: '/Library/Audio/Plug-Ins/VST3/ValhallaVintageVerb.vst3',
      category: 'Reverb',
      hasNativeGui: true,
      parameterCount: 48,
      latencySamples: 32
    },
    {
      id: 'ozone-11-maximizer-native',
      name: 'iZotope Ozone 11 Maximizer',
      vendor: 'iZotope',
      version: '11.1.0',
      format: 'VST3',
      path: 'C:\\Program Files\\Common Files\\VST3\\iZotope Ozone 11 Maximizer.vst3',
      category: 'Mastering',
      hasNativeGui: true,
      parameterCount: 64,
      latencySamples: 1024
    },
    {
      id: 'soundtoys-decapitator-native',
      name: 'Soundtoys Decapitator',
      vendor: 'Soundtoys',
      version: '5.4.1',
      format: 'VST3',
      path: '/Library/Audio/Plug-Ins/VST3/Decapitator.vst3',
      category: 'Distortion',
      hasNativeGui: true,
      parameterCount: 14,
      latencySamples: 0
    }
  ];

  private activeInstances: Map<string, NativePluginInstance> = new Map();

  constructor() {
    this.runtime = this.detectRuntime();
  }

  public detectRuntime(): DesktopRuntimeEnvironment {
    if (typeof window !== 'undefined') {
      if ((window as any).__TAURI__) {
        return 'tauri_native';
      }
      if ((window as any).electronAPI) {
        return 'electron_native';
      }
    }
    return 'web_browser';
  }

  public getRuntime(): DesktopRuntimeEnvironment {
    return this.runtime;
  }

  public isNativeDesktop(): boolean {
    return this.runtime === 'tauri_native' || this.runtime === 'electron_native';
  }

  /**
   * Standard system paths searched for VST3/AU bundles on desktop
   */
  public getDefaultPluginScanPaths(): { os: string; paths: string[] }[] {
    return [
      {
        os: 'Windows 10 / 11 (x64)',
        paths: [
          'C:\\Program Files\\Common Files\\VST3',
          'C:\\Program Files\\VstPlugins',
          'C:\\Program Files\\Steinberg\\VstPlugins'
        ]
      },
      {
        os: 'macOS (Universal / Apple Silicon)',
        paths: [
          '/Library/Audio/Plug-Ins/VST3',
          '/Library/Audio/Plug-Ins/Components (Audio Units)',
          '~/Library/Audio/Plug-Ins/VST3'
        ]
      },
      {
        os: 'Linux (PipeWire / ALSA)',
        paths: [
          '/usr/lib/vst3',
          '/usr/local/lib/vst3',
          '~/.vst3'
        ]
      }
    ];
  }

  /**
   * Scans system directories for native plugins.
   * On desktop: calls IPC invoke.
   * In web browser: returns simulated discovered plugins.
   */
  public async scanSystemPlugins(): Promise<NativePluginInfo[]> {
    if (this.runtime === 'tauri_native') {
      try {
        const tauri = (window as any).__TAURI__;
        return await tauri.invoke('vst_scan_system_plugins');
      } catch (err) {
        console.warn('Tauri VST scan error, falling back to simulated list:', err);
      }
    } else if (this.runtime === 'electron_native') {
      try {
        const electron = (window as any).electronAPI;
        return await electron.scanPlugins();
      } catch (err) {
        console.warn('Electron VST scan error, falling back to simulated list:', err);
      }
    }

    // In web browser: Simulate 600ms disk directory walk
    await new Promise(r => setTimeout(r, 650));
    return [...this.mockDiscoveredPlugins];
  }

  /**
   * Instantiates a native C++ plugin host wrapper for a given track.
   */
  public async instantiateNativePlugin(plugin: NativePluginInfo, trackId: string): Promise<NativePluginInstance> {
    const instanceId = `native-inst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    
    if (this.runtime === 'tauri_native') {
      try {
        const tauri = (window as any).__TAURI__;
        return await tauri.invoke('vst_instantiate', { pluginPath: plugin.path, trackId, instanceId });
      } catch (err) {
        console.warn('Tauri instantiate error:', err);
      }
    } else if (this.runtime === 'electron_native') {
      try {
        const electron = (window as any).electronAPI;
        return await electron.instantiatePlugin(plugin.path, trackId, instanceId);
      } catch (err) {
        console.warn('Electron instantiate error:', err);
      }
    }

    // Web simulation
    const mockInst: NativePluginInstance = {
      instanceId,
      pluginId: plugin.id,
      pluginPath: plugin.path,
      trackId,
      isWindowOpen: false,
      bypassed: false,
      sampleRate: 48000,
      parameters: [
        { index: 0, name: 'Gain / Trim', value: 0.5, displayValue: '0.0 dB', unit: 'dB' },
        { index: 1, name: 'Filter Cutoff', value: 0.72, displayValue: '4500 Hz', unit: 'Hz' },
        { index: 2, name: 'Filter Q', value: 0.35, displayValue: '1.2 Q', unit: 'Q' },
        { index: 3, name: 'Pan', value: 0.5, displayValue: 'C', unit: '' },
        { index: 4, name: 'Mix Dry/Wet', value: 1.0, displayValue: '100 %', unit: '%' }
      ]
    };

    this.activeInstances.set(instanceId, mockInst);
    return mockInst;
  }

  /**
   * Spawns or toggles the native OS plugin editor window (Cocoa / Win32 child window).
   */
  public async toggleNativeEditorWindow(instanceId: string): Promise<boolean> {
    const inst = this.activeInstances.get(instanceId);
    if (!inst) return false;

    if (this.runtime === 'tauri_native') {
      try {
        const tauri = (window as any).__TAURI__;
        const res = await tauri.invoke('vst_toggle_editor_window', { instanceId });
        inst.isWindowOpen = res.isOpen;
        return res.isOpen;
      } catch (err) {
        console.warn('Tauri editor window error:', err);
      }
    } else if (this.runtime === 'electron_native') {
      try {
        const electron = (window as any).electronAPI;
        const res = await electron.toggleEditor(instanceId);
        inst.isWindowOpen = res.isOpen;
        return res.isOpen;
      } catch (err) {
        console.warn('Electron editor window error:', err);
      }
    }

    // Simulated window toggle
    inst.isWindowOpen = !inst.isWindowOpen;
    return inst.isWindowOpen;
  }

  /**
   * Sets a normalized parameter (0.0 to 1.0) on the native instance
   */
  public setNativeParameter(instanceId: string, paramIndex: number, value: number): void {
    const inst = this.activeInstances.get(instanceId);
    if (inst && inst.parameters[paramIndex]) {
      inst.parameters[paramIndex].value = Math.max(0, Math.min(1, value));
    }

    if (this.runtime === 'tauri_native') {
      (window as any).__TAURI__?.invoke('vst_set_param', { instanceId, paramIndex, value });
    } else if (this.runtime === 'electron_native') {
      (window as any).electronAPI?.setParam(instanceId, paramIndex, value);
    }
  }

  /**
   * Returns complete Tauri / Electron build files and commands
   */
  public getBuildInstructions(): {
    tauriCommands: string[];
    electronCommands: string[];
    architectureExplanation: string;
  } {
    return {
      tauriCommands: [
        '# Install Tauri CLI & Rust toolchain',
        'cargo install tauri-cli',
        '',
        '# Run desktop app locally in debug mode',
        'npm run tauri dev',
        '',
        '# Compile release desktop bundle (.exe on Windows, .dmg on macOS, .AppImage on Linux)',
        'npm run tauri build'
      ],
      electronCommands: [
        '# Run Electron host locally with hot reloading',
        'npm run electron:dev',
        '',
        '# Package native desktop installer with C++ JUCE node addons',
        'npm run electron:build'
      ],
      architectureExplanation: 
        'Strangelet Lab uses a dual runtime architecture. In web browsers, it operates with zero install via Web Audio and Faust WebAssembly DSP. On desktop (via Tauri or Electron), it connects to native C++ shared libraries (.vst3 / .component) using JUCE AudioPluginHost bindings, spawning hardware-accelerated OS windows with sample-accurate parameter automation.'
    };
  }
}

export const desktopVstBridgeService = new DesktopVstBridgeService();
