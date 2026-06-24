import { BrowserWindow, WebContentsView, app, nativeImage } from 'electron';
import path from 'path';
import { SettingsManager } from './settingsManager';
import { PlayerBridge } from './playerBridge';
import { Settings } from '../types';

const TITLE_BAR_HEIGHT = 36;

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private miniWindow: BrowserWindow | null = null;
  private settingsWindow: BrowserWindow | null = null;
  private ytmView: WebContentsView | null = null;
  private isMiniMode = false;

  constructor(
    private settings: SettingsManager,
    private playerBridge: PlayerBridge
  ) {}

  createMainWindow(): void {
    const { windowBounds } = this.settings.get();

    this.mainWindow = new BrowserWindow({
      x: windowBounds.x,
      y: windowBounds.y,
      width: windowBounds.width,
      height: windowBounds.height,
      minWidth: 800,
      minHeight: 600,
      frame: false,
      show: false,
      backgroundColor: '#0d1117',
      webPreferences: {
        preload: path.join(__dirname, '../preload/preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    this.mainWindow.loadFile(path.join(__dirname, '../renderer/main-window/index.html'));

    // Create YTM WebContentsView
    this.ytmView = new WebContentsView({
      webPreferences: {
        partition: 'persist:ytm',
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    this.mainWindow.contentView.addChildView(this.ytmView);
    this.positionYtmView();
    this.ytmView.webContents.loadURL('https://music.youtube.com');

    // Show window and apply thumbar only after Windows has fully registered it
    this.mainWindow.once('ready-to-show', () => {
      const { startMinimised } = this.settings.get();
      if (!startMinimised) {
        this.mainWindow?.show();
        this.updateThumbarButtons(false, this.mainWindow);
      }
    });

    // Wire player bridge to the ytmView webContents
    this.ytmView.webContents.on('did-finish-load', () => {
      this.playerBridge.attachWebContents(this.ytmView!.webContents);
    });
    this.ytmView.webContents.on('did-navigate', () => {
      this.playerBridge.attachWebContents(this.ytmView!.webContents);
    });

    // Reposition ytmView on resize
    this.mainWindow.on('resize', () => this.positionYtmView());

    // Persist window bounds on close
    this.mainWindow.on('close', (e) => {
      const { minimiseToTray } = this.settings.get();
      if (minimiseToTray && !this.isQuitting()) {
        e.preventDefault();
        this.mainWindow?.hide();
        return;
      }
      this.saveMainWindowBounds();
    });

    // Forward player state to renderers and update thumbar
    this.playerBridge.on('state-changed', (state) => {
      this.broadcastState(state);
      this.updateThumbarButtons(state.isPlaying, this.mainWindow);
      this.updateThumbarButtons(state.isPlaying, this.miniWindow);
    });

    // Forward progress ticks to mini-player only (avoids per-second tray rebuilds)
    this.playerBridge.on('progress-updated', (currentTime: number, duration: number) => {
      this.miniWindow?.webContents.send('player:progress-updated', currentTime, duration);
    });

  }

  private positionYtmView(): void {
    if (!this.mainWindow || !this.ytmView) return;
    const [width, height] = this.mainWindow.getContentSize();
    this.ytmView.setBounds({
      x: 0,
      y: TITLE_BAR_HEIGHT,
      width,
      height: height - TITLE_BAR_HEIGHT,
    });
  }

  private quitting = false;

  setQuitting(value: boolean): void {
    this.quitting = value;
  }

  private isQuitting(): boolean {
    return this.quitting;
  }

  broadcastState(state: unknown): void {
    this.mainWindow?.webContents.send('player:state-changed', state);
    this.miniWindow?.webContents.send('player:state-changed', state);
  }

  focusActiveWindow(): void {
    if (this.isMiniMode) {
      this.miniWindow?.focus();
    } else {
      if (this.mainWindow?.isMinimized()) this.mainWindow.restore();
      this.mainWindow?.show();
      this.mainWindow?.focus();
      this.updateThumbarButtons(this.playerBridge.getLastState()?.isPlaying ?? false, this.mainWindow);
    }
  }

  hideMainWindow(): void {
    this.mainWindow?.hide();
  }

  minimizeMainWindow(): void {
    this.mainWindow?.minimize();
  }

  toggleMaximize(): void {
    if (!this.mainWindow) return;
    if (this.mainWindow.isMaximized()) {
      this.mainWindow.unmaximize();
    } else {
      this.mainWindow.maximize();
    }
  }

  closeOrHideMainWindow(): void {
    const { minimiseToTray } = this.settings.get();
    if (minimiseToTray) {
      this.mainWindow?.hide();
    } else {
      this.quitting = true;
      app.quit();
    }
  }

  toggleMiniPlayer(): void {
    if (this.isMiniMode) {
      this.showFullPlayer();
    } else {
      this.showMiniPlayer();
    }
  }

  showMiniPlayer(): void {
    if (!this.miniWindow) {
      this.createMiniWindow();
    }
    this.isMiniMode = true;
    this.mainWindow?.hide();
    this.miniWindow?.show();
    this.updateThumbarButtons(this.playerBridge.getLastState()?.isPlaying ?? false, this.miniWindow);
  }

  showFullPlayer(): void {
    this.isMiniMode = false;
    this.miniWindow?.hide();
    this.mainWindow?.show();
    this.mainWindow?.focus();
    this.updateThumbarButtons(this.playerBridge.getLastState()?.isPlaying ?? false, this.mainWindow);
  }

  private createMiniWindow(): void {
    const { miniPlayerBounds, miniPlayerAlwaysOnTop } = this.settings.get();

    this.miniWindow = new BrowserWindow({
      x: miniPlayerBounds.x,
      y: miniPlayerBounds.y,
      width: 360,
      height: 130,
      resizable: false,
      frame: false,
      alwaysOnTop: miniPlayerAlwaysOnTop,
      skipTaskbar: false,
      backgroundColor: '#1a1a2e',
      webPreferences: {
        preload: path.join(__dirname, '../preload/preload-mini.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    this.miniWindow.loadFile(path.join(__dirname, '../renderer/mini-player/mini.html'));

    // Send current state immediately so the mini-player shows up-to-date info
    this.miniWindow.webContents.on('did-finish-load', () => {
      const lastState = this.playerBridge.getLastState();
      if (lastState) {
        this.miniWindow?.webContents.send('player:state-changed', lastState);
      }
      this.updateThumbarButtons(this.playerBridge.getLastState()?.isPlaying ?? false, this.miniWindow);
    });

    this.miniWindow.on('close', () => {
      const bounds = this.miniWindow!.getBounds();
      const s = this.settings.get();
      this.settings.save({ ...s, miniPlayerBounds: { x: bounds.x, y: bounds.y } });
      this.miniWindow = null;
    });
  }

  openSettings(): void {
    if (this.settingsWindow) {
      this.settingsWindow.focus();
      return;
    }

    this.settingsWindow = new BrowserWindow({
      width: 600,
      height: 700,
      resizable: false,
      title: 'YTM Settings',
      backgroundColor: '#0d1117',
      webPreferences: {
        preload: path.join(__dirname, '../preload/preload-settings.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    this.settingsWindow.loadFile(path.join(__dirname, '../renderer/settings/settings.html'));

    // Open DevTools automatically so errors are visible during development
    if (!app.isPackaged) {
      this.settingsWindow.webContents.openDevTools({ mode: 'detach' });
    }

    this.settingsWindow.on('closed', () => {
      this.settingsWindow = null;
    });
  }

  closeSettings(): void {
    // The 'closed' event handler on the window sets settingsWindow = null.
    // Just trigger the close - don't null here to avoid a double-null race.
    this.settingsWindow?.close();
  }

  applySettings(newSettings: Settings): void {
    if (this.miniWindow) {
      this.miniWindow.setAlwaysOnTop(newSettings.miniPlayerAlwaysOnTop);
    }
  }

  private saveMainWindowBounds(): void {
    if (!this.mainWindow) return;
    const bounds = this.mainWindow.getBounds();
    const s = this.settings.get();
    this.settings.save({
      ...s,
      windowBounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
    });
  }

  private updateThumbarButtons(isPlaying: boolean, win: BrowserWindow | null | undefined): void {
    if (!win) return;

    const icon = (name: string) =>
      nativeImage.createFromPath(
        path.join(app.getAppPath(), 'assets', 'icons', `${name}.png`)
      );

    win.setThumbarButtons([
      {
        tooltip: 'Previous Track',
        icon: icon('thumbar-prev'),
        click: () => { this.playerBridge.execute('previousTrack'); },
      },
      {
        tooltip: isPlaying ? 'Pause' : 'Play',
        icon: icon(isPlaying ? 'thumbar-pause' : 'thumbar-play'),
        click: () => { this.playerBridge.execute('playPause'); },
      },
      {
        tooltip: 'Next Track',
        icon: icon('thumbar-next'),
        click: () => { this.playerBridge.execute('nextTrack'); },
      },
    ]);
  }

  getYtmWebContents() {
    return this.ytmView?.webContents ?? null;
  }
}
