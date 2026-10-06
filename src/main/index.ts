import { app, ipcMain } from 'electron';
import { execSync } from 'child_process';
import { PlayerState } from '../types';
import { SettingsManager } from './settingsManager';
import { WindowManager } from './windowManager';
import { TrayManager } from './trayManager';
import { ShortcutManager } from './shortcutManager';
import { NotificationManager } from './notificationManager';
import { PlayerBridge } from './playerBridge';
import { installTerminationHandlers, refuseUnsandboxedStart } from './platform/linux/lifecycle';
import { relaunchInX11IfNeeded } from './platform/linux/displayServer';

// Linux: a flag-less start inside a Wayland session restarts itself in X11 mode (displayServer.ts),
// and a start that an AppImage launcher downgraded to --no-sandbox is refused (lifecycle.ts).
// Both must happen before the single-instance lock so a new instance can take it.
const relaunching = process.platform === 'linux' && (relaunchInX11IfNeeded() || refuseUnsandboxedStart());
const gotLock = !relaunching && app.requestSingleInstanceLock();

if (!gotLock) {
  if (!relaunching) app.quit();
} else {
  let windowManager: WindowManager;
  let trayManager: TrayManager;
  let shortcutManager: ShortcutManager;
  let notificationManager: NotificationManager;
  let playerBridge: PlayerBridge;
  let settingsManager: SettingsManager;

  app.on('second-instance', (_event, argv) => {
    const protocolUrl = argv.find((arg: string) => arg.startsWith('ytm://action/'));
    if (protocolUrl) {
      const action = protocolUrl.replace('ytm://action/', '');
      playerBridge?.execute(action);
    } else {
      windowManager?.focusActiveWindow();
    }
  });

  app.whenReady().then(() => {
    app.setAppUserModelId('YTM');
    if (app.isPackaged && process.platform === 'win32') {
      app.setAsDefaultProtocolClient('ytm');
    }

    // Register AUMID in HKCU so Windows WinRT toast banners appear for toastXml notifications.
    // ToastNotificationManagerCompat (used by plain Notification) works without this;
    // ToastNotificationManager.CreateToastNotifier(aumid) (used by toastXml) requires it.
    if (process.platform === 'win32') {
      try {
        execSync(
          `powershell -NoProfile -NonInteractive -Command "New-Item -Path 'HKCU:\\Software\\Classes\\AppUserModelId\\YTM' -Force | Out-Null; Set-ItemProperty -Path 'HKCU:\\Software\\Classes\\AppUserModelId\\YTM' -Name 'DisplayName' -Value 'YTM' -Type String"`,
          { stdio: 'ignore', windowsHide: true }
        );
      } catch (_e) {
        // Non-critical - toastXml notifications will still be delivered to Action Center
      }
    }
    settingsManager = new SettingsManager();
    const settings = settingsManager.get();

    playerBridge = new PlayerBridge();
    windowManager = new WindowManager(settingsManager, playerBridge);
    trayManager = new TrayManager(settingsManager, windowManager, playerBridge);
    shortcutManager = new ShortcutManager(settingsManager, windowManager, playerBridge);
    notificationManager = new NotificationManager(settingsManager, (action) => playerBridge.execute(action));

    playerBridge.on('state-changed', (state: PlayerState) => {
      notificationManager.onStateChanged(state);
      trayManager.onStateChanged(state);
    });

    trayManager.show();
    windowManager.createMainWindow();

    if (settings.startMinimised) {
      windowManager.hideMainWindow();
    }

    shortcutManager.registerAll();

    // IPC: settings
    ipcMain.handle('settings:get', () => settingsManager.get());
    ipcMain.handle('settings:get-defaults', () => settingsManager.getDefaults());
    ipcMain.handle('settings:save', (_event, newSettings) => {
      settingsManager.save(newSettings);
      shortcutManager.reloadAll();
      windowManager.applySettings(newSettings);
    });

    // IPC: shortcuts conflict check
    ipcMain.handle('shortcuts:check-conflict', (_event, { shortcut, excludeAction }) => {
      return shortcutManager.findConflict(shortcut, excludeAction);
    });

    // IPC: notification preview
    ipcMain.on('notifications:preview', () => notificationManager.preview());

    // IPC: window control from renderer title bar
    ipcMain.on('window:minimize', () => windowManager.minimizeMainWindow());
    ipcMain.on('window:maximize', () => windowManager.toggleMaximize());
    ipcMain.on('window:close', () => windowManager.closeOrHideMainWindow());
    ipcMain.on('window:toggle-mini', () => windowManager.toggleMiniPlayer());
    ipcMain.on('window:show-full', () => windowManager.showFullPlayer());
    ipcMain.on('window:open-settings', () => windowManager.openSettings());
    ipcMain.on('window:close-settings', () => windowManager.closeSettings());
    ipcMain.on('window:reload-ytm', () => windowManager.reloadYtmView());
    ipcMain.on('window:viewport', (event, { width, height }) => windowManager.reportViewport(event.sender, width, height));

    // IPC: player actions from renderers
    ipcMain.on('player:action', (_event, { action }) => playerBridge.execute(action));
    ipcMain.on('player:set-volume', (_event, { value }) => playerBridge.setVolume(value));
    ipcMain.on('player:seek', (_event, { position }) => playerBridge.seek(position));
  });

  if (process.platform === 'linux') {
    installTerminationHandlers(() => {
      windowManager?.setQuitting(true);
      app.quit();
    });
  }

  app.on('before-quit', () => {
    if (process.platform === 'linux') windowManager?.setQuitting(true);
    notificationManager?.dispose();
    shortcutManager?.unregisterAll();
    playerBridge?.destroy();
  });

  app.on('window-all-closed', () => {
    // Do nothing - tray keeps app alive
  });
}
