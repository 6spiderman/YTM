import { PlayerState, Settings } from '../types';

declare global {
  interface Window {
    api: {
      onStateChanged: (callback: (state: PlayerState) => void) => void;
      offStateChanged: () => void;
      sendAction: (action: string) => void;
      toggleMiniPlayer: () => void;
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      openSettings: () => void;
    };
    miniApi: {
      onStateChanged: (callback: (state: PlayerState) => void) => void;
      offStateChanged: () => void;
      sendAction: (action: string) => void;
      setVolume: (value: number) => void;
      seek: (position: number) => void;
      onProgressUpdated: (callback: (currentTime: number, duration: number) => void) => void;
      expandPlayer: () => void;
    };
    settingsApi: {
      getSettings: () => Promise<Settings>;
      saveSettings: (settings: Settings) => Promise<void>;
      getDefaults: () => Promise<Settings>;
      checkConflict: (shortcut: string, excludeAction: string) => Promise<string | null>;
      previewNotification: () => void;
      closeSettings: () => void;
    };
  }
}

export {};
