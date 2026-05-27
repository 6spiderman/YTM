import { Tray, Menu, nativeImage, app } from 'electron';
import path from 'path';
import { SettingsManager } from './settingsManager';
import { WindowManager } from './windowManager';
import { PlayerBridge } from './playerBridge';
import { PlayerState } from '../types';

export class TrayManager {
  private tray: Tray | null = null;
  private nowPlaying = 'Not playing';

  constructor(
    private settings: SettingsManager,
    private windowManager: WindowManager,
    private playerBridge: PlayerBridge
  ) {}

  show(): void {
    if (this.tray) return;
    const iconPath = path.join(app.getAppPath(), 'assets', 'icons', 'tray-icon.ico');
    const icon = nativeImage.createFromPath(iconPath);
    this.tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
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
    this.nowPlaying = label;
    this.tray?.setToolTip(`YTM - ${state.currentTrack || 'Not playing'}`);
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
      { label: 'Settings', click: () => this.windowManager.openSettings() },
      { label: 'Quit', click: () => { this.windowManager.setQuitting(true); app.quit(); } },
    ]);

    this.tray.setContextMenu(menu);
  }
}
