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
  private ytmView: WebContentsView | null = null;
  private isMiniMode = false;
  // Tracks when the active player window last lost focus; used by the thumbnail
  // taskbar-click handler to distinguish "was foreground, hide it" from "was behind
  // other windows, bring it to front".
  private activeWindowBlurredAt = 0;

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
      skipTaskbar: true,
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

    // Track when main window loses focus so the taskbar click handler knows whether
    // the window was in the foreground when the user clicked the taskbar icon.
    this.mainWindow.on('blur', () => { this.activeWindowBlurredAt = Date.now(); });

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

    // Forward player state to all renderers; update thumbar on the thumbnail (taskbar rep)
    this.playerBridge.on('state-changed', (state) => {
      this.broadcastState(state);
      this.updateThumbarButtons(state.isPlaying, this.thumbnailWindow);
    });

    // Forward progress ticks to mini-player only (avoids per-second tray rebuilds)
    this.playerBridge.on('progress-updated', (currentTime: number, duration: number) => {
      this.miniWindow?.webContents.send('player:progress-updated', currentTime, duration);
    });

    // Keep thumbnail window for DWM live preview content (off-screen, skipTaskbar)
    this.createThumbnailWindow();
  }

  private createThumbnailWindow(): void {
    // Off-screen window that owns the taskbar presence and provides DWM live preview
    // content (album art + track info). Bottom 1px sits on-screen so DWM composites it;
    // the remaining 89px are hidden above the top edge.
    //
    // NOTE: do NOT call setIgnoreMouseEvents() here. Adding WS_EX_TRANSPARENT|WS_EX_LAYERED
    // prevents Windows from sending WM_ACTIVATE when the user clicks the taskbar button,
    // so the 'focus' event never fires and taskbar clicks do nothing.
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
      skipTaskbar: false,
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

    // Seed with last known state and set thumbar buttons once content loads
    this.thumbnailWindow.webContents.on('did-finish-load', () => {
      const lastState = this.playerBridge.getLastState();
      if (lastState) {
        this.thumbnailWindow?.webContents.send('player:state-changed', lastState);
        this.updateThumbarButtons(lastState.isPlaying, this.thumbnailWindow);
      }
    });

    // Taskbar button click: if the active player window was the foreground window when
    // the user clicked (blur happened < 300 ms ago), hide it (toggle off). Otherwise
    // bring it to front - this handles the "window is visible but behind other apps" case.
    this.thumbnailWindow.on('focus', () => {
      this.thumbnailWindow?.blur();
      const wasJustForeground = (Date.now() - this.activeWindowBlurredAt) < 300;

      if (this.isMiniMode && this.miniWindow) {
        if (wasJustForeground && this.miniWindow.isVisible() && !this.miniWindow.isMinimized()) {
          this.miniWindow.hide();
        } else {
          if (this.miniWindow.isMinimized()) this.miniWindow.restore();
          this.miniWindow.show();
          this.miniWindow.focus();
        }
      } else if (this.mainWindow) {
        if (wasJustForeground && this.mainWindow.isVisible() && !this.mainWindow.isMinimized()) {
          this.mainWindow.hide();
        } else {
          if (this.mainWindow.isMinimized()) this.mainWindow.restore();
          this.mainWindow.show();
          this.mainWindow.focus();
        }
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
    this.mainWindow?.hide();
    this.miniWindow?.show();
  }

  showFullPlayer(): void {
    this.isMiniMode = false;
    this.miniWindow?.hide();
    this.mainWindow?.show();
    this.mainWindow?.focus();
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

    this.miniWindow.on('blur', () => { this.activeWindowBlurredAt = Date.now(); });

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
