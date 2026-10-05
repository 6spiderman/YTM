import { nativeImage, Tray } from 'electron';
import { TrayManager } from '../src/main/trayManager';
import { makeFakeSettings, setPlatform } from './helpers/fakeElectron';

describe('TrayManager on linux', () => {
  let restorePlatform: () => void;
  beforeEach(() => {
    restorePlatform = setPlatform('linux');
    (Tray as unknown as jest.Mock).mockClear();
  });
  afterEach(() => restorePlatform());

  it('replaces the unusable .ico with the PNG icon scaled to 32x32', () => {
    const resize = jest.fn(() => ({ resized: true }));
    (nativeImage.createFromPath as jest.Mock).mockImplementation((p: string) => ({
      isEmpty: () => p.endsWith('.ico'),
      resize,
    }));
    new TrayManager(makeFakeSettings() as never, {} as never, { execute: jest.fn() } as never).show();

    const tray = (Tray as unknown as jest.Mock).mock.results[0].value;
    expect(nativeImage.createFromPath).toHaveBeenCalledWith('/app/assets/icons/icon.png');
    expect(resize).toHaveBeenCalledWith({ width: 32, height: 32, quality: 'best' });
    expect(tray.setImage).toHaveBeenCalledWith({ resized: true });
  });
});
