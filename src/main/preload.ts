import { contextBridge, ipcRenderer } from 'electron';

// Expose a minimal API to the renderer via contextBridge
contextBridge.exposeInMainWorld('schmidiAPI', {
  platform: process.platform,
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('get-app-version'),
});
