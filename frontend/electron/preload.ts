import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),
  saveConfig: (config: any) => ipcRenderer.invoke('save-config', config),
  fetchModels: (baseUrl: string) => ipcRenderer.invoke('fetch-models', baseUrl),
});
