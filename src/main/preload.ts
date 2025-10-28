import { contextBridge, ipcRenderer, nativeTheme } from 'electron';

contextBridge.exposeInMainWorld('modgen', {
  version: () => process.versions.electron,
  platform: () => process.platform,
  theme: () => nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
  send: (channel: string, payload?: unknown) => ipcRenderer.send(channel, payload)
});
