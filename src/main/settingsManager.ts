import Store from 'electron-store';
import { app } from 'electron';
import { Settings } from '../types';

const DEFAULT_SETTINGS: Settings = {
  windowBounds: { x: undefined, y: undefined, width: 1200, height: 800 },
  miniPlayerBounds: { x: 100, y: 100 },
  miniPlayerAlwaysOnTop: true,
  startMinimised: false,
  startWithWindows: false,
  minimiseToTray: true,
  shortcuts: {
    playPause: 'Ctrl+Alt+Space',
    nextTrack: 'Ctrl+Alt+Right',
    previousTrack: 'Ctrl+Alt+Left',
    volumeUp: 'Ctrl+Alt+Up',
    volumeDown: 'Ctrl+Alt+Down',
    likeTrack: 'Ctrl+Alt+L',
    dislikeTrack: 'Ctrl+Alt+D',
    showHideWindow: 'Ctrl+Alt+M',
    toggleMiniPlayer: 'Ctrl+Alt+P',
  },
  volumeStep: 5,
  notifications: {
    enabled: true,
    titleTemplate: '{artist}',
    bodyTemplate: '{title}',
    showAlbumArt: true,
    playSound: false,
  },
};

export class SettingsManager {
  private store: Store<Settings>;

  constructor() {
    this.store = new Store<Settings>({
      name: 'config',
      defaults: DEFAULT_SETTINGS,
    });
  }

  get(): Settings {
    return {
      windowBounds: this.store.get('windowBounds', DEFAULT_SETTINGS.windowBounds),
      miniPlayerBounds: this.store.get('miniPlayerBounds', DEFAULT_SETTINGS.miniPlayerBounds),
      miniPlayerAlwaysOnTop: this.store.get('miniPlayerAlwaysOnTop', DEFAULT_SETTINGS.miniPlayerAlwaysOnTop),
      startMinimised: this.store.get('startMinimised', DEFAULT_SETTINGS.startMinimised),
      startWithWindows: this.store.get('startWithWindows', DEFAULT_SETTINGS.startWithWindows),
      minimiseToTray: this.store.get('minimiseToTray', DEFAULT_SETTINGS.minimiseToTray),
      shortcuts: this.store.get('shortcuts', DEFAULT_SETTINGS.shortcuts),
      volumeStep: this.store.get('volumeStep', DEFAULT_SETTINGS.volumeStep),
      notifications: this.store.get('notifications', DEFAULT_SETTINGS.notifications),
    };
  }

  save(settings: Settings): void {
    this.store.set('windowBounds', settings.windowBounds);
    this.store.set('miniPlayerBounds', settings.miniPlayerBounds);
    this.store.set('miniPlayerAlwaysOnTop', settings.miniPlayerAlwaysOnTop);
    this.store.set('startMinimised', settings.startMinimised);
    this.store.set('startWithWindows', settings.startWithWindows);
    this.store.set('minimiseToTray', settings.minimiseToTray);
    this.store.set('shortcuts', settings.shortcuts);
    this.store.set('volumeStep', settings.volumeStep);
    this.store.set('notifications', settings.notifications);

    app.setLoginItemSettings({ openAtLogin: settings.startWithWindows });
  }

  getDefaults(): Settings {
    return { ...DEFAULT_SETTINGS };
  }
}
