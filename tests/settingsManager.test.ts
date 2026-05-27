import { SettingsManager } from '../src/main/settingsManager';

const mockStore: Record<string, unknown> = {};
jest.mock('electron-store', () =>
  jest.fn().mockImplementation(() => ({
    get: jest.fn((key: string, defaultValue?: unknown) => mockStore[key] ?? defaultValue),
    set: jest.fn((key: string, value: unknown) => { mockStore[key] = value; }),
    store: mockStore,
  }))
);

describe('SettingsManager', () => {
  let sm: SettingsManager;

  beforeEach(() => {
    Object.keys(mockStore).forEach(k => delete mockStore[k]);
    sm = new SettingsManager();
  });

  it('returns empty default shortcuts when nothing saved', () => {
    const s = sm.get();
    expect(s.shortcuts.playPause).toBe('');
    expect(s.shortcuts.nextTrack).toBe('');
    expect(Object.values(s.shortcuts).every(v => v === '')).toBe(true);
  });

  it('returns default notification settings', () => {
    const s = sm.get();
    expect(s.notifications.enabled).toBe(true);
    expect(s.notifications.titleTemplate).toBe('{artist}');
    expect(s.notifications.bodyTemplate).toBe('{title}');
  });

  it('saves and retrieves windowBounds', () => {
    sm.save({ ...sm.get(), windowBounds: { x: 100, y: 200, width: 1200, height: 800 } });
    const s = sm.get();
    expect(s.windowBounds.x).toBe(100);
    expect(s.windowBounds.y).toBe(200);
  });

  it('save merges partial updates', () => {
    sm.save({ ...sm.get(), volumeStep: 10 });
    expect(sm.get().volumeStep).toBe(10);
    expect(sm.get().notifications.enabled).toBe(true);
  });
});
