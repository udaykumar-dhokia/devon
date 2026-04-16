export interface ElectronAPI {
  getConfig: () => Promise<any>;
  getBackendUrl: () => Promise<string>;
  saveConfig: (config: any) => Promise<{ success: boolean; error?: string }>;
  fetchModels: (baseUrl: string) => Promise<{ success: boolean; models?: any[]; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
