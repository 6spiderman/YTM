// Characterization tests: main entry point on Windows (AUMID, protocol handler, registry write,
// ytm://action routing). index.ts runs on import, so the module is loaded once in beforeAll.
import { app, BrowserWindow, WebContentsView } from 'electron';
import { execSync } from 'child_process';
import { PlayerBridge } from '../src/main/playerBridge';
import { makeFakeWebContents, makeFakeWindow, setPlatform } from './helpers/fakeElectron';

jest.mock('child_process', () => ({ execSync: jest.fn() }));
jest.mock('electron-store', () =>
  jest.fn().mockImplementation(() => ({
    get: jest.fn((_key: string, defaultValue?: unknown) => defaultValue),
    set: jest.fn(),
  }))
);

describe('main entry on win32 (characterization)', () => {
  let restorePlatform: () => void;
  const executeSpy = jest.spyOn(PlayerBridge.prototype, 'execute').mockResolvedValue();

  beforeAll(async () => {
    restorePlatform = setPlatform('win32');
    (app as { isPackaged: boolean }).isPackaged = true;
    (BrowserWindow as unknown as jest.Mock).mockImplementation((o: Record<string, unknown>) => makeFakeWindow(o));
    (WebContentsView as unknown as jest.Mock).mockImplementation(() => ({ setBounds: jest.fn(), webContents: makeFakeWebContents() }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../src/main/index');
    await new Promise((resolve) => setImmediate(resolve));
  });

  afterAll(() => restorePlatform());

  it('sets the AppUserModelID and registers the ytm:// protocol when packaged', () => {
    expect(app.setAppUserModelId).toHaveBeenCalledWith('YTM');
    expect(app.setAsDefaultProtocolClient).toHaveBeenCalledWith('ytm');
  });

  it('registers the AUMID display name in HKCU through PowerShell', () => {
    expect(execSync).toHaveBeenCalledTimes(1);
    const [command, options] = (execSync as jest.Mock).mock.calls[0];
    expect(command).toContain('powershell');
    expect(command).toContain('HKCU:\\Software\\Classes\\AppUserModelId\\YTM');
    expect(options).toMatchObject({ stdio: 'ignore', windowsHide: true });
  });

  it('routes a ytm://action/ argument from a second instance to the player bridge', () => {
    const call = (app.on as jest.Mock).mock.calls.find((c) => c[0] === 'second-instance')!;
    call[1]({}, ['YTM.exe', 'ytm://action/playPause']);
    expect(executeSpy).toHaveBeenCalledWith('playPause');
  });
});
