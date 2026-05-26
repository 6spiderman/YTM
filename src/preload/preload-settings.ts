import { contextBridge, ipcRenderer } from 'electron';
import { Settings } from '../types';

contextBridge.exposeInMainWorld('settingsApi', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: Settings) => ipcRenderer.invoke('settings:save', settings),
  getDefaults: () => ipcRenderer.invoke('settings:get-defaults'),
  checkConflict: (shortcut: string, excludeAction: string) =>
    ipcRenderer.invoke('shortcuts:check-conflict', { shortcut, excludeAction }),
  previewNotification: () => ipcRenderer.send('notifications:preview'),
  closeSettings: () => ipcRenderer.send('window:close-settings'),
});
