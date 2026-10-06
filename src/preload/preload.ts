import { contextBridge, ipcRenderer } from 'electron';
import { PlayerState } from '../types';

contextBridge.exposeInMainWorld('api', {
  onStateChanged: (callback: (state: PlayerState) => void) => {
    ipcRenderer.on('player:state-changed', (_event, state: PlayerState) => callback(state));
  },
  offStateChanged: () => {
    ipcRenderer.removeAllListeners('player:state-changed');
  },
  sendAction: (action: string) => {
    ipcRenderer.send('player:action', { action });
  },
  toggleMiniPlayer: () => {
    ipcRenderer.send('window:toggle-mini');
  },
  minimizeWindow: () => {
    ipcRenderer.send('window:minimize');
  },
  maximizeWindow: () => {
    ipcRenderer.send('window:maximize');
  },
  closeWindow: () => {
    ipcRenderer.send('window:close');
  },
  openSettings: () => {
    ipcRenderer.send('window:open-settings');
  },
  reloadPage: () => {
    ipcRenderer.send('window:reload-ytm');
  },
  // The title-bar page is the only reliable source of the window's real content size on Linux
  // (BrowserWindow.getContentSize is off by the frame insets while a frameless window is maximised).
  reportViewport: (width: number, height: number) => {
    ipcRenderer.send('window:viewport', { width, height });
  },
});
