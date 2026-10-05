// Characterization tests: pin the Windows notification paths.
import { app, Notification } from 'electron';
import { NotificationManager } from '../src/main/notificationManager';
import { makeFakeSettings, setPlatform } from './helpers/fakeElectron';

describe('NotificationManager on win32 (characterization)', () => {
  let restorePlatform: () => void;

  beforeEach(() => {
    restorePlatform = setPlatform('win32');
    (Notification as unknown as jest.Mock).mockClear();
  });

  afterEach(() => {
    restorePlatform();
    (app as { isPackaged: boolean }).isPackaged = false;
  });

  const settings = (overrides = {}) =>
    makeFakeSettings({
      notifications: { enabled: true, titleTemplate: '{artist}', bodyTemplate: '{title}', showAlbumArt: false, playSound: false },
      ...overrides,
    });

  it('packaged: shows a toastXml notification with the three ytm:// action buttons', () => {
    (app as { isPackaged: boolean }).isPackaged = true;
    new NotificationManager(settings() as never).preview();

    expect(Notification).toHaveBeenCalledTimes(1);
    const options = (Notification as unknown as jest.Mock).mock.calls[0][0];
    expect(Object.keys(options)).toEqual(['toastXml']);
    const xml: string = options.toastXml;
    expect(xml).toContain('<text>Test Artist</text><text>Test Song</text>');
    expect(xml).toContain('arguments="ytm://action/previousTrack" activationType="protocol"');
    expect(xml).toContain('arguments="ytm://action/playPause" activationType="protocol"');
    expect(xml).toContain('arguments="ytm://action/nextTrack" activationType="protocol"');
    expect(xml).toContain('<audio silent="true"/>');
    // iconBase is `<appPath>.unpacked` with backslashes normalised; the mocked appPath is '/app'.
    expect(xml).toContain('imageUri="file:////app.unpacked/assets/icons/thumbar-prev.png"');
  });

  it('packaged: omits the silent flag when sound is enabled', () => {
    (app as { isPackaged: boolean }).isPackaged = true;
    new NotificationManager(
      settings({ notifications: { enabled: true, titleTemplate: '{artist}', bodyTemplate: '{title}', showAlbumArt: false, playSound: true } }) as never,
    ).preview();
    const xml: string = (Notification as unknown as jest.Mock).mock.calls[0][0].toastXml;
    expect(xml).not.toContain('<audio silent="true"/>');
  });

  it('unpackaged: shows a plain notification', () => {
    new NotificationManager(settings() as never).preview();
    expect(Notification).toHaveBeenCalledWith({
      title: 'Test Artist',
      body: 'Test Song',
      icon: undefined,
      silent: true,
    });
  });
});
