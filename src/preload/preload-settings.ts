import { contextBridge, ipcRenderer } from 'electron';
import { Settings, UpdateState } from '../types';

contextBridge.exposeInMainWorld('settingsApi', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: Settings) => ipcRenderer.invoke('settings:save', settings),
  getDefaults: () => ipcRenderer.invoke('settings:get-defaults'),
  checkConflict: (shortcut: string, excludeAction: string) =>
    ipcRenderer.invoke('shortcuts:check-conflict', { shortcut, excludeAction }),
  previewNotification: () => ipcRenderer.send('notifications:preview'),
  closeSettings: () => ipcRenderer.send('window:close-settings'),
  getEnvironment: () => ipcRenderer.invoke('settings:get-environment'),
  checkForUpdates: () => ipcRenderer.invoke('updates:check'),
  downloadUpdate: () => ipcRenderer.invoke('updates:download'),
  installUpdate: () => ipcRenderer.invoke('updates:install'),
  dismissUpdate: (version: string) => ipcRenderer.invoke('updates:dismiss', { version }),
  openReleasePage: () => ipcRenderer.send('updates:open-release-page'),
  onUpdateState: (callback: (state: UpdateState) => void) => {
    ipcRenderer.on('updates:state-changed', (_event, state: UpdateState) => callback(state));
  },
});
