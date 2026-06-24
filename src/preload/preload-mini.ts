import { contextBridge, ipcRenderer } from 'electron';
import { PlayerState } from '../types';

contextBridge.exposeInMainWorld('miniApi', {
  onStateChanged: (callback: (state: PlayerState) => void) => {
    ipcRenderer.on('player:state-changed', (_event, state: PlayerState) => callback(state));
  },
  offStateChanged: () => {
    ipcRenderer.removeAllListeners('player:state-changed');
  },
  sendAction: (action: string) => {
    ipcRenderer.send('player:action', { action });
  },
  setVolume: (value: number) => {
    ipcRenderer.send('player:set-volume', { value });
  },
  seek: (position: number) => {
    ipcRenderer.send('player:seek', { position });
  },
  onProgressUpdated: (callback: (currentTime: number, duration: number) => void) => {
    ipcRenderer.on('player:progress-updated', (_event, currentTime: number, duration: number) => callback(currentTime, duration));
  },
  expandPlayer: () => {
    ipcRenderer.send('window:show-full');
  },
});
