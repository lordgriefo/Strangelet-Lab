// Electron Preload Script for Strangelet Lab VST Bridge
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  scanPlugins: () => ipcRenderer.invoke('vst:scan-plugins'),
  toggleEditor: (instanceId) => ipcRenderer.invoke('vst:toggle-editor', instanceId),
  instantiatePlugin: (pluginPath, trackId, instanceId) => ipcRenderer.invoke('vst:instantiate', { pluginPath, trackId, instanceId }),
  setParam: (instanceId, paramIndex, value) => ipcRenderer.send('vst:set-param', { instanceId, paramIndex, value })
});
