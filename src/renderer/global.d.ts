import { AppEnvironment, PlayerState, Settings, UpdateState } from '../types';

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
      reportViewport: (width: number, height: number) => void;
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
      getEnvironment: () => Promise<AppEnvironment>;
      checkForUpdates: () => Promise<UpdateState>;
      downloadUpdate: () => Promise<void>;
      installUpdate: () => Promise<void>;
      dismissUpdate: (version: string) => Promise<void>;
      openReleasePage: () => void;
      onUpdateState: (callback: (state: UpdateState) => void) => void;
    };
  }
}

export {};
