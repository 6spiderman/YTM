import { BrowserWindow, WebContentsView, app, nativeImage } from 'electron';
import path from 'path';
import { SettingsManager } from './settingsManager';
import { PlayerBridge } from './playerBridge';
import { Settings } from '../types';

const TITLE_BAR_HEIGHT = 36;

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private miniWindow: BrowserWindow | null = null;
  private proxyWindow: BrowserWindow | null = null;
  private settingsWindow: BrowserWindow | null = null;
  private ytmView: WebContentsView | null = null;
  private isMiniMode = false;
  private lastActiveBlurTime = 0;
  private suppressProxyActivation = false;

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

    // Track the last time the real player window lost focus. The proxy focus
    // handler uses this timestamp to distinguish "YTM was just the foreground
    // window when the taskbar icon was clicked" (< 150ms) from "YTM was behind
    // other windows and the user clicked the taskbar to bring it forward".
    this.mainWindow.on('blur', () => { this.lastActiveBlurTime = Date.now(); });

    // Suppress proxy activation that is triggered by Windows handing focus to
    // the proxy when the real window minimizes or hides. Without this, the
    // proxy focus handler would immediately restore the window.
    this.mainWindow.on('minimize', () => {
      this.suppressProxyActivation = true;
      setTimeout(() => { this.suppressProxyActivation = false; }, 500);
    });
    this.mainWindow.on('hide', () => {
      this.suppressProxyActivation = true;
      setTimeout(() => { this.suppressProxyActivation = false; }, 500);
    });

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
      this.updateThumbarButtons(state.isPlaying);
    });

    // Forward progress ticks to mini-player only (avoids per-second tray rebuilds)
    this.playerBridge.on('progress-updated', (currentTime: number, duration: number) => {
      this.miniWindow?.webContents.send('player:progress-updated', currentTime, duration);
    });

    this.createProxyWindow();
  }

  private createProxyWindow(): void {
    // Small dark window at (0,0) - owns the taskbar button and thumbar buttons.
    // Position (0,0) is confirmed to receive WM_ACTIVATE when the taskbar icon is
    // clicked. Sized at 300×48 so DWM renders the thumbnail preview at a height
    // proportional to the thumbar button strip (~48px each), avoiding the large
    // empty box that a 1×1 window produces due to DWM's minimum thumbnail height.
    this.proxyWindow = new BrowserWindow({
      x: 0,
      y: 0,
      width: 300,
      height: 48,
      frame: false,
      show: true,
      skipTaskbar: false,
      backgroundColor: '#1a1a2e',
      resizable: false,
      maximizable: false,
      hasShadow: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    this.proxyWindow.loadURL('about:blank');

    // WS_EX_TRANSPARENT: proxy passes all mouse events through to whatever is
    // beneath it. This prevents the 300x48 window at (0,0) from intercepting
    // title-bar clicks when the main window is maximized. Does NOT affect
    // WM_ACTIVATE, so taskbar clicks still reach the focus handler.
    this.proxyWindow.setIgnoreMouseEvents(true, { forward: true });

    this.proxyWindow.webContents.on('did-finish-load', () => {
      const lastState = this.playerBridge.getLastState();
      this.updateThumbarButtons(lastState?.isPlaying ?? false);
    });

    // Taskbar icon click: Windows activates this proxy window. We blur it immediately
    // and toggle the real player window (minimize if it was just foreground, restore/focus otherwise).
    // suppressProxyActivation guards against Windows handing focus here as a side-effect
    // of the real window minimizing or hiding (which would cause an immediate restore loop).
    this.proxyWindow.on('focus', () => {
      this.proxyWindow?.blur();
      if (this.suppressProxyActivation) return;

      const realWin = this.isMiniMode ? this.miniWindow : this.mainWindow;
      if (!realWin) return;

      // If the real window blurred less than 150ms ago it was the foreground
      // window at the moment the taskbar button was clicked - minimize it.
      const wasJustForeground = (Date.now() - this.lastActiveBlurTime) < 150;

      if (wasJustForeground && realWin.isVisible() && !realWin.isMinimized()) {
        realWin.minimize();
      } else if (realWin.isMinimized()) {
        realWin.restore();
        realWin.focus();
      } else {
        realWin.show();
        realWin.focus();
      }
    });

    // When the proxy is already the foreground window (which happens when
    // proxy.blur() finds no other window to give focus to after the real
    // window minimized), clicking the taskbar button sends SC_MINIMIZE to
    // the proxy instead of WM_ACTIVATE. We restore the proxy immediately
    // and bring the real window back.
    this.proxyWindow.on('minimize', () => {
      this.proxyWindow?.restore();
      const realWin = this.isMiniMode ? this.miniWindow : this.mainWindow;
      if (!realWin) return;
      if (realWin.isMinimized()) {
        realWin.restore();
        realWin.focus();
      } else if (!realWin.isVisible()) {
        realWin.show();
        realWin.focus();
      } else {
        realWin.focus();
      }
    });

    this.proxyWindow.on('close', (e) => {
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

    this.miniWindow.on('blur', () => { this.lastActiveBlurTime = Date.now(); });
    this.miniWindow.on('hide', () => {
      this.suppressProxyActivation = true;
      setTimeout(() => { this.suppressProxyActivation = false; }, 500);
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

  private updateThumbarButtons(isPlaying: boolean): void {
    if (!this.proxyWindow) return;

    const icon = (name: string) =>
      nativeImage.createFromPath(
        path.join(app.getAppPath(), 'assets', 'icons', `${name}.png`)
      );

    this.proxyWindow.setThumbarButtons([
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
