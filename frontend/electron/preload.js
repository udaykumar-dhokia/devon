"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    getConfig: () => electron_1.ipcRenderer.invoke('get-config'),
    getBackendUrl: () => electron_1.ipcRenderer.invoke('get-backend-url'),
    saveConfig: (config) => electron_1.ipcRenderer.invoke('save-config', config),
    fetchModels: (baseUrl) => electron_1.ipcRenderer.invoke('fetch-models', baseUrl),
});
