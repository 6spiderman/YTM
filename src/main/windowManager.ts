import { BrowserWindow, WebContentsView, app, nativeImage, screen } from 'electron';
import path from 'path';
import { SettingsManager } from './settingsManager';
import { PlayerBridge } from './playerBridge';
import { Settings } from '../types';

const TITLE_BAR_HEIGHT = 36;

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private miniWindow: BrowserWindow | null = null;
  private thumbnailWindow: BrowserWindow | null = null;
  private settingsWindow: BrowserWindow | null = null;
  private taskbarWindow(): BrowserWindow | null {
    return this.isMiniMode ? this.miniWindow : this.mainWindow;
  }
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
      skipTaskbar: false,
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

    // Show main window once content is ready (no flash)
    this.mainWindow.once('ready-to-show', () => {
      const { startMinimised } = this.settings.get();
      if (!startMinimised) {
        this.mainWindow?.show();
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

    // Forward player state to all renderers; update thumbar on the active taskbar window
    this.playerBridge.on('state-changed', (state) => {
      this.broadcastState(state);
      this.updateThumbarButtons(state.isPlaying, this.taskbarWindow());
    });

    // Forward progress ticks to mini-player only (avoids per-second tray rebuilds)
    this.playerBridge.on('progress-updated', (currentTime: number, duration: number) => {
      this.miniWindow?.webContents.send('player:progress-updated', currentTime, duration);
    });

    // Keep thumbnail window for DWM live preview content (off-screen, skipTaskbar)
    this.createThumbnailWindow();
  }

  private createThumbnailWindow(): void {
    // Off-screen window whose rendered content DWM uses for the taskbar live preview.
    // Bottom 1px is on-screen so DWM composites it; the rest is hidden above the top edge.
    const { bounds } = screen.getPrimaryDisplay();
    const W = 300;
    const H = 90;
    this.thumbnailWindow = new BrowserWindow({
      x: bounds.x,
      y: bounds.y - (H - 1),
      width: W,
      height: H,
      frame: false,
      show: true,
      skipTaskbar: true,
      resizable: false,
      minimizable: false,
      maximizable: false,
      backgroundColor: '#1a1a2e',
      webPreferences: {
        preload: path.join(__dirname, '../preload/preload-mini.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    this.thumbnailWindow.loadFile(
      path.join(__dirname, '../renderer/thumbnail/thumbnail.html')
    );

    // The 1px strip at the top of the screen should not intercept user clicks
    this.thumbnailWindow.setIgnoreMouseEvents(true);

    // Seed with last known state if available
    this.thumbnailWindow.webContents.on('did-finish-load', () => {
      const lastState = this.playerBridge.getLastState();
      if (lastState) {
        this.thumbnailWindow?.webContents.send('player:state-changed', lastState);
      }
    });

    // Prevent user from closing the thumbnail window while the app is running
    this.thumbnailWindow.on('close', (e) => {
      if (!this.quitting) e.preventDefault();
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
    this.thumbnailWindow?.webContents.send('player:state-changed', state); // DWM preview content
  }

  focusActiveWindow(): void {
    if (this.isMiniMode) {
      this.miniWindow?.show();
      this.miniWindow?.focus();
    } else {
      if (this.mainWindow?.isMinimized()) this.mainWindow.restore();
      this.mainWindow?.show();
      this.mainWindow?.focus();
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
    this.mainWindow?.setSkipTaskbar(true);
    this.mainWindow?.hide();
    this.miniWindow?.setSkipTaskbar(false);
    this.miniWindow?.show();
    const lastState = this.playerBridge.getLastState();
    this.updateThumbarButtons(lastState?.isPlaying ?? false, this.miniWindow);
  }

  showFullPlayer(): void {
    this.isMiniMode = false;
    this.miniWindow?.setSkipTaskbar(true);
    this.miniWindow?.hide();
    this.mainWindow?.setSkipTaskbar(false);
    this.mainWindow?.show();
    this.mainWindow?.focus();
    const lastState = this.playerBridge.getLastState();
    this.updateThumbarButtons(lastState?.isPlaying ?? false, this.mainWindow);
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
      skipTaskbar: true,
      backgroundColor: '#1a1a2e',
      webPreferences: {
        preload: path.join(__dirname, '../preload/preload-mini.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    this.miniWindow.loadFile(path.join(__dirname, '../renderer/mini-player/mini.html'));

    // Send current state immediately so mini-player shows up-to-date info on open
    this.miniWindow.webContents.on('did-finish-load', () => {
      const lastState = this.playerBridge.getLastState();
      if (lastState) {
        this.miniWindow?.webContents.send('player:state-changed', lastState);
      }
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

    if (!app.isPackaged) {
      this.settingsWindow.webContents.openDevTools({ mode: 'detach' });
    }

    this.settingsWindow.on('closed', () => {
      this.settingsWindow = null;
    });
  }

  closeSettings(): void {
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

  reloadYtmView(): void {
    this.ytmView?.webContents.reload();
  }

  getYtmWebContents() {
    return this.ytmView?.webContents ?? null;
  }
}
