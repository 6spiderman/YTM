import { app, ipcMain } from 'electron';
import { PlayerState } from '../types';
import { SettingsManager } from './settingsManager';
import { WindowManager } from './windowManager';
import { TrayManager } from './trayManager';
import { ShortcutManager } from './shortcutManager';
import { NotificationManager } from './notificationManager';
import { PlayerBridge } from './playerBridge';

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  let windowManager: WindowManager;
  let trayManager: TrayManager;
  let shortcutManager: ShortcutManager;
  let notificationManager: NotificationManager;
  let playerBridge: PlayerBridge;
  let settingsManager: SettingsManager;

  app.on('second-instance', () => {
    windowManager?.focusActiveWindow();
  });

  app.whenReady().then(() => {
    app.setAppUserModelId('com.go2cloud.ytm');
    settingsManager = new SettingsManager();
    const settings = settingsManager.get();

    playerBridge = new PlayerBridge();
    windowManager = new WindowManager(settingsManager, playerBridge);
    trayManager = new TrayManager(settingsManager, windowManager, playerBridge);
    shortcutManager = new ShortcutManager(settingsManager, windowManager, playerBridge);
    notificationManager = new NotificationManager(settingsManager);

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

    // IPC: player actions from renderers
    ipcMain.on('player:action', (_event, { action }) => playerBridge.execute(action));
  });

  app.on('before-quit', () => {
    shortcutManager?.unregisterAll();
    playerBridge?.destroy();
  });

  app.on('window-all-closed', () => {
    // Do nothing - tray keeps app alive
  });
}
