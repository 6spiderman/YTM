// With the platform forced to win32, none of the Linux-only modules may be used.
import { app, BrowserWindow, WebContentsView, Tray } from 'electron';
import { EventEmitter } from 'events';
import { NotificationManager } from '../src/main/notificationManager';
import { SettingsManager } from '../src/main/settingsManager';
import { TrayManager } from '../src/main/trayManager';
import { WindowManager } from '../src/main/windowManager';
import { applyAutostart } from '../src/main/platform/linux/autostart';
import { waylandPositionOverride } from '../src/main/platform/linux/displayServer';
import { LinuxNotifier } from '../src/main/platform/linux/notifications';
import { applyLinuxWindowIcon, createLinuxTrayIcon } from '../src/main/platform/linux/windowAssets';
import { fire, makeFakeSettings, makeFakeWebContents, makeFakeWindow, setPlatform } from './helpers/fakeElectron';

jest.mock('electron-store', () =>
  jest.fn().mockImplementation(() => ({ get: jest.fn((_k: string, d?: unknown) => d), set: jest.fn() }))
);
jest.mock('../src/main/platform/linux/autostart', () => ({ applyAutostart: jest.fn() }));
jest.mock('../src/main/platform/linux/displayServer', () => ({ waylandPositionOverride: jest.fn(() => ({})), isNativeWayland: jest.fn() }));
jest.mock('../src/main/platform/linux/notifications', () => ({ LinuxNotifier: jest.fn() }));
jest.mock('../src/main/platform/linux/windowAssets', () => ({ applyLinuxWindowIcon: jest.fn(), createLinuxTrayIcon: jest.fn() }));

describe('win32 never touches Linux-only code', () => {
  let restorePlatform: () => void;
  beforeEach(() => { restorePlatform = setPlatform('win32'); });
  afterEach(() => {
    restorePlatform();
    (app as { isPackaged: boolean }).isPackaged = false;
  });

  it('settings, tray, notifications and windows run without calling any Linux module', () => {
    (app as { isPackaged: boolean }).isPackaged = true;
    (BrowserWindow as unknown as jest.Mock).mockReset().mockImplementation((o: Record<string, unknown>) => makeFakeWindow(o));
    (WebContentsView as unknown as jest.Mock).mockReset().mockImplementation(() => ({ setBounds: jest.fn(), webContents: makeFakeWebContents() }));
    (Tray as unknown as jest.Mock).mockClear();

    const sm = new SettingsManager();
    sm.save(sm.get());

    new TrayManager(makeFakeSettings() as never, {} as never, { execute: jest.fn() } as never).show();

    const nm = new NotificationManager(makeFakeSettings() as never, jest.fn());
    nm.preview();
    nm.dispose();

    const bridge = Object.assign(new EventEmitter(), { execute: jest.fn(), getLastState: jest.fn(() => null), attachWebContents: jest.fn() });
    const wm = new WindowManager(makeFakeSettings() as never, bridge as never);
    wm.createMainWindow();
    wm.showMiniPlayer();
    wm.openSettings();
    const main = (BrowserWindow as unknown as jest.Mock).mock.results[0].value;
    fire(main, 'close', { preventDefault: jest.fn() });
    wm.setQuitting(true);
    fire(main, 'close', { preventDefault: jest.fn() });

    expect(applyAutostart).not.toHaveBeenCalled();
    expect(waylandPositionOverride).not.toHaveBeenCalled();
    expect(LinuxNotifier).not.toHaveBeenCalled();
    expect(applyLinuxWindowIcon).not.toHaveBeenCalled();
    expect(createLinuxTrayIcon).not.toHaveBeenCalled();
  });
});
