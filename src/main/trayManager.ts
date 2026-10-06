import { Tray, Menu, nativeImage, app } from 'electron';
import path from 'path';
import { SettingsManager } from './settingsManager';
import { WindowManager } from './windowManager';
import { PlayerBridge } from './playerBridge';
import { PlayerState, UpdateState } from '../types';
import { UpdateManager } from './updateManager';
import { createLinuxTrayIcon } from './platform/linux/windowAssets';

export class TrayManager {
  private tray: Tray | null = null;
  private nowPlaying = 'Not playing';

  private lastMenuPercent = -1;

  constructor(
    private settings: SettingsManager,
    private windowManager: WindowManager,
    private playerBridge: PlayerBridge,
    private updateManager?: UpdateManager
  ) {
    // Rebuild the menu when the update state changes; while downloading only every 10 %.
    updateManager?.on('state-changed', (state: UpdateState) => {
      if (state.kind === 'downloading') {
        const step = Math.floor(state.percent / 10);
        if (step === this.lastMenuPercent) return;
        this.lastMenuPercent = step;
      } else {
        this.lastMenuPercent = -1;
      }
      this.buildMenu();
    });
  }

  show(): void {
    if (this.tray) return;
    const iconPath = path.join(app.getAppPath(), 'assets', 'icons', 'tray-icon.ico');
    const icon = nativeImage.createFromPath(iconPath);
    this.tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
    if (process.platform === 'linux') this.tray.setImage(createLinuxTrayIcon());
    this.tray.setToolTip('YTM');
    this.buildMenu();

    this.tray.on('click', () => {
      this.windowManager.focusActiveWindow();
    });
  }

  onStateChanged(state: PlayerState): void {
    const label = state.currentTrack
      ? `${state.currentArtist} - ${state.currentTrack}`
      : 'Not playing';
    this.tray?.setToolTip(`YTM - ${state.currentTrack || 'Not playing'}`);
    if (label === this.nowPlaying) return;
    this.nowPlaying = label;
    this.buildMenu();
  }

  private buildMenu(): void {
    if (!this.tray) return;

    const menu = Menu.buildFromTemplate([
      { label: this.nowPlaying, enabled: false },
      { type: 'separator' },
      { label: 'Play / Pause', click: () => this.playerBridge.execute('playPause') },
      { label: 'Previous Track', click: () => this.playerBridge.execute('previousTrack') },
      { label: 'Next Track', click: () => this.playerBridge.execute('nextTrack') },
      { type: 'separator' },
      { label: 'Like', click: () => this.playerBridge.execute('likeTrack') },
      { label: 'Dislike', click: () => this.playerBridge.execute('dislikeTrack') },
      { type: 'separator' },
      { label: 'Full Player', click: () => this.windowManager.showFullPlayer() },
      { label: 'Mini Player', click: () => this.windowManager.showMiniPlayer() },
      { type: 'separator' },
      ...this.updateItems(),
      { label: 'Settings', click: () => this.windowManager.openSettings() },
      { label: 'Quit', click: () => { this.windowManager.setQuitting(true); app.quit(); } },
    ]);

    this.tray.setContextMenu(menu);
  }

  /** The update entry for the current state; none in development builds. */
  private updateItems(): Electron.MenuItemConstructorOptions[] {
    const um = this.updateManager;
    if (!um) return [];
    const state = um.getState();
    switch (state.kind) {
      case 'unsupported':
        return [];
      case 'checking':
        return [{ label: 'Checking for updates…', enabled: false }];
      case 'available':
        return [{ label: `Update to ${state.version} available – install…`, click: () => void um.download() }];
      case 'downloading':
        return [{ label: `Downloading update… ${state.percent}%`, enabled: false }];
      case 'downloaded':
        return [{ label: `Restart to update to ${state.version}`, click: () => um.installAndRestart() }];
      default:
        return [{ label: 'Check for updates…', click: () => { void um.check(true); this.windowManager.openSettings(); } }];
    }
  }
}
