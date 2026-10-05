// Main entry on Linux: no Windows protocol registration or PowerShell, signals quit cleanly.
import { app, BrowserWindow, WebContentsView } from 'electron';
import { execSync } from 'child_process';
import { makeFakeWebContents, makeFakeWindow, setPlatform } from './helpers/fakeElectron';

jest.mock('child_process', () => ({ execSync: jest.fn() }));
jest.mock('electron-store', () =>
  jest.fn().mockImplementation(() => ({ get: jest.fn((_k: string, d?: unknown) => d), set: jest.fn() }))
);

describe('main entry on linux', () => {
  let restorePlatform: () => void;
  const onSpy = jest.spyOn(process, 'on');

  beforeAll(async () => {
    restorePlatform = setPlatform('linux');
    (app as { isPackaged: boolean }).isPackaged = true;
    (BrowserWindow as unknown as jest.Mock).mockImplementation((o: Record<string, unknown>) => makeFakeWindow(o));
    (WebContentsView as unknown as jest.Mock).mockImplementation(() => ({ setBounds: jest.fn(), webContents: makeFakeWebContents() }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../src/main/index');
    await new Promise((resolve) => setImmediate(resolve));
  });

  afterAll(() => {
    restorePlatform();
    onSpy.mockRestore();
  });

  it('does not register the ytm:// protocol client or run PowerShell', () => {
    expect(app.setAsDefaultProtocolClient).not.toHaveBeenCalled();
    expect(execSync).not.toHaveBeenCalled();
  });

  it('quits through app.quit on SIGTERM, SIGINT and SIGHUP', () => {
    const handlers = onSpy.mock.calls.filter((c) => ['SIGTERM', 'SIGINT', 'SIGHUP'].includes(c[0] as string));
    expect(handlers).toHaveLength(3);
    (app.quit as jest.Mock).mockClear();
    (handlers[0][1] as () => void)();
    expect(app.quit).toHaveBeenCalledTimes(1);
  });

  it('marks the app as quitting on before-quit so the close handler stops vetoing', () => {
    const beforeQuit = (app.on as jest.Mock).mock.calls.find((c) => c[0] === 'before-quit')![1] as () => void;
    expect(() => beforeQuit()).not.toThrow();
  });
});
