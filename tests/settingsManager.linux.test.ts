import { app } from 'electron';
import { SettingsManager } from '../src/main/settingsManager';
import { applyAutostart } from '../src/main/platform/linux/autostart';
import { setPlatform } from './helpers/fakeElectron';

const mockStore: Record<string, unknown> = {};
jest.mock('electron-store', () =>
  jest.fn().mockImplementation(() => ({
    get: jest.fn((key: string, defaultValue?: unknown) => mockStore[key] ?? defaultValue),
    set: jest.fn((key: string, value: unknown) => { mockStore[key] = value; }),
  }))
);
jest.mock('../src/main/platform/linux/autostart', () => ({ applyAutostart: jest.fn() }));

describe('SettingsManager on linux', () => {
  let restorePlatform: () => void;
  beforeEach(() => {
    restorePlatform = setPlatform('linux');
    Object.keys(mockStore).forEach((k) => delete mockStore[k]);
    (applyAutostart as jest.Mock).mockClear();
  });
  afterEach(() => restorePlatform());

  it.each([true, false])('save() applies XDG autostart with startWithWindows=%s', (value) => {
    const sm = new SettingsManager();
    sm.save({ ...sm.get(), startWithWindows: value });
    expect(applyAutostart).toHaveBeenCalledWith(value);
  });

  it('keeps the setting key and still persists it', () => {
    const sm = new SettingsManager();
    sm.save({ ...sm.get(), startWithWindows: true });
    expect(mockStore.startWithWindows).toBe(true);
    expect(app.setLoginItemSettings).toHaveBeenCalled();
  });
});
