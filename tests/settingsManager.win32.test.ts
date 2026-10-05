// Characterization test: saving settings updates the Windows login item.
import { app } from 'electron';
import { SettingsManager } from '../src/main/settingsManager';
import { setPlatform } from './helpers/fakeElectron';

const mockStore: Record<string, unknown> = {};
jest.mock('electron-store', () =>
  jest.fn().mockImplementation(() => ({
    get: jest.fn((key: string, defaultValue?: unknown) => mockStore[key] ?? defaultValue),
    set: jest.fn((key: string, value: unknown) => { mockStore[key] = value; }),
  }))
);

describe('SettingsManager on win32 (characterization)', () => {
  let restorePlatform: () => void;
  beforeEach(() => {
    restorePlatform = setPlatform('win32');
    Object.keys(mockStore).forEach((k) => delete mockStore[k]);
    (app.setLoginItemSettings as jest.Mock).mockClear();
  });
  afterEach(() => restorePlatform());

  it.each([true, false])('save() sets openAtLogin to %s from startWithWindows', (value) => {
    const sm = new SettingsManager();
    sm.save({ ...sm.get(), startWithWindows: value });
    expect(app.setLoginItemSettings).toHaveBeenCalledTimes(1);
    expect(app.setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: value });
  });

  it('persists the existing settings keys under their current names', () => {
    const sm = new SettingsManager();
    sm.save(sm.get());
    expect(Object.keys(mockStore).sort()).toEqual([
      'miniPlayerAlwaysOnTop', 'miniPlayerBounds', 'minimiseToTray', 'notifications',
      'shortcuts', 'startMinimised', 'startWithWindows', 'volumeStep', 'windowBounds',
    ]);
  });
});
