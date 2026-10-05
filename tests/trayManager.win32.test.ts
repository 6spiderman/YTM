// Characterization test: the tray uses the .ico asset on Windows.
import { nativeImage, Tray } from 'electron';
import path from 'path';
import { TrayManager } from '../src/main/trayManager';
import { makeFakeSettings, setPlatform } from './helpers/fakeElectron';

describe('TrayManager on win32 (characterization)', () => {
  let restorePlatform: () => void;
  beforeEach(() => {
    restorePlatform = setPlatform('win32');
    (nativeImage.createFromPath as jest.Mock).mockClear();
    (Tray as unknown as jest.Mock).mockClear();
  });
  afterEach(() => restorePlatform());

  it('loads assets/icons/tray-icon.ico and creates the tray', () => {
    const tm = new TrayManager(makeFakeSettings() as never, {} as never, { execute: jest.fn() } as never);
    tm.show();
    expect(nativeImage.createFromPath).toHaveBeenCalledWith(path.join('/app', 'assets', 'icons', 'tray-icon.ico'));
    expect(Tray).toHaveBeenCalledTimes(1);
  });
});
