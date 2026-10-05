import { app, Notification } from 'electron';
import { NotificationManager } from '../src/main/notificationManager';
import { makeFakeSettings, setPlatform } from './helpers/fakeElectron';

const mockShow = jest.fn();
const mockDispose = jest.fn();
const mockCtorOnAction = jest.fn();
jest.mock('../src/main/platform/linux/notifications', () => ({
  LinuxNotifier: jest.fn().mockImplementation((onAction: (a: string) => void) => {
    mockCtorOnAction.mockImplementation(onAction);
    return { show: mockShow, dispose: mockDispose };
  }),
}));

describe('NotificationManager on linux', () => {
  let restorePlatform: () => void;
  beforeEach(() => {
    restorePlatform = setPlatform('linux');
    (Notification as unknown as jest.Mock).mockClear();
    mockShow.mockClear();
    mockDispose.mockClear();
  });
  afterEach(() => {
    restorePlatform();
    (app as { isPackaged: boolean }).isPackaged = false;
  });

  const settings = makeFakeSettings({
    notifications: { enabled: true, titleTemplate: '{artist}', bodyTemplate: '{title}', showAlbumArt: false, playSound: true },
  });

  it('shows through the D-Bus notifier, never the Windows toast, even when packaged', () => {
    (app as { isPackaged: boolean }).isPackaged = true;
    new NotificationManager(settings as never).preview();
    expect(mockShow).toHaveBeenCalledWith(
      { title: 'Test Artist', body: 'Test Song', iconPath: undefined, sound: true },
      expect.any(Function)
    );
    expect(Notification).not.toHaveBeenCalled();
  });

  it('routes button presses to the action callback', () => {
    const onAction = jest.fn();
    new NotificationManager(settings as never, onAction).preview();
    mockCtorOnAction('playPause');
    expect(onAction).toHaveBeenCalledWith('playPause');
  });

  it('falls back to a plain Electron notification when the notifier reports unavailable', () => {
    new NotificationManager(settings as never).preview();
    const fallback = mockShow.mock.calls[0][1];
    fallback();
    expect(Notification).toHaveBeenCalledWith({ title: 'Test Artist', body: 'Test Song', icon: undefined, silent: false });
  });

  it('dispose releases the notifier', () => {
    const nm = new NotificationManager(settings as never);
    nm.preview();
    nm.dispose();
    expect(mockDispose).toHaveBeenCalled();
  });
});
