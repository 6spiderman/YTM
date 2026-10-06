import Store from 'electron-store';
import { app } from 'electron';
import { Settings } from '../types';
import { applyAutostart } from './platform/linux/autostart';
import { normalizeAccelerator } from '../shared/accelerator';
import { ShortcutMap, UpdateSettings } from '../types';

const DEFAULT_SETTINGS: Settings = {
  windowBounds: { x: undefined, y: undefined, width: 1200, height: 800 },
  miniPlayerBounds: { x: 100, y: 100 },
  miniPlayerAlwaysOnTop: true,
  startMinimised: false,
  startWithWindows: false,
  minimiseToTray: true,
  shortcuts: {
    playPause: '',
    nextTrack: '',
    previousTrack: '',
    volumeUp: '',
    volumeDown: '',
    likeTrack: '',
    dislikeTrack: '',
    showHideWindow: '',
    toggleMiniPlayer: '',
  },
  volumeStep: 5,
  notifications: {
    enabled: true,
    titleTemplate: '{artist}',
    bodyTemplate: '{title}',
    showAlbumArt: true,
    playSound: false,
  },
  taskbarProgress: true,
  nativeWayland: false,
  updates: {
    checkAutomatically: true,
    dismissedVersion: '',
    lastCheck: 0,
  },
};

/** Repairs values saved by older versions (e.g. `Ctrl+Alt+ArrowRight` → `Ctrl+Alt+Right`); unrepairable ones are cleared. */
export function normalizeShortcuts(shortcuts: ShortcutMap): ShortcutMap {
  const out = { ...shortcuts };
  for (const action of Object.keys(out) as (keyof ShortcutMap)[]) {
    out[action] = normalizeAccelerator(out[action] ?? '');
  }
  return out;
}

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
      shortcuts: normalizeShortcuts(this.store.get('shortcuts', DEFAULT_SETTINGS.shortcuts)),
      volumeStep: this.store.get('volumeStep', DEFAULT_SETTINGS.volumeStep),
      notifications: this.store.get('notifications', DEFAULT_SETTINGS.notifications),
      taskbarProgress: this.store.get('taskbarProgress', DEFAULT_SETTINGS.taskbarProgress),
      nativeWayland: this.store.get('nativeWayland', DEFAULT_SETTINGS.nativeWayland),
      updates: { ...DEFAULT_SETTINGS.updates, ...this.store.get('updates', DEFAULT_SETTINGS.updates) },
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
    this.store.set('taskbarProgress', settings.taskbarProgress);
    this.store.set('nativeWayland', settings.nativeWayland);
    this.store.set('updates', settings.updates);

    app.setLoginItemSettings({ openAtLogin: settings.startWithWindows });
    if (process.platform === 'linux') applyAutostart(settings.startWithWindows);
  }

  getDefaults(): Settings {
    return { ...DEFAULT_SETTINGS };
  }

  /** Main-process bookkeeping for the updater; does not touch anything else. */
  setUpdateState(patch: Partial<UpdateSettings>): void {
    const current = this.get();
    this.store.set('updates', { ...current.updates, ...patch });
  }
}
