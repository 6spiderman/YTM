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
  expandPlayer: () => {
    ipcRenderer.send('window:show-full');
  },
});
