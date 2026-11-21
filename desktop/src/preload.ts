import { contextBridge, ipcRenderer } from 'electron';

export interface DesktopBridge {
  isElectron: boolean;
  getDesktopInfo: () => Promise<{
    isElectron: boolean;
    electronVersion: string;
    chromeVersion: string;
    nodeVersion: string;
    platform: string;
    arch: string;
  }>;
  openExternal: (url: string) => Promise<boolean>;
  selectDirectory: () => Promise<string | null>;
  onOAuthCallback: (callback: (url: string) => void) => () => void;
}

const desktopBridge: DesktopBridge = {
  isElectron: true,
  getDesktopInfo: () => ipcRenderer.invoke('desktop:get-info'),
  openExternal: (url: string) => ipcRenderer.invoke('desktop:open-external', url),
  selectDirectory: () => ipcRenderer.invoke('desktop:select-directory'),
  onOAuthCallback: (callback: (url: string) => void) => {
    const subscription = (_event: any, url: string) => callback(url);
    ipcRenderer.on('oauth-callback', subscription);
    return () => {
      ipcRenderer.removeListener('oauth-callback', subscription);
    };
  }
};

contextBridge.exposeInMainWorld('desktopBridge', desktopBridge);
