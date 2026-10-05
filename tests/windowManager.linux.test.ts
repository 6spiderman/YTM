import { app, BrowserWindow, WebContentsView } from 'electron';
import { EventEmitter } from 'events';
import { WindowManager } from '../src/main/windowManager';
import { FakeWindow, fire, makeFakeSettings, makeFakeWebContents, makeFakeWindow, setPlatform } from './helpers/fakeElectron';

describe('WindowManager on linux', () => {
  let restorePlatform: () => void;
  let wins: FakeWindow[];
  let settings: ReturnType<typeof makeFakeSettings>;
  let wm: WindowManager;

  beforeEach(() => {
    restorePlatform = setPlatform('linux');
    (app.commandLine.getSwitchValue as jest.Mock).mockReturnValue('x11');
    wins = [];
    (BrowserWindow as unknown as jest.Mock).mockReset().mockImplementation((options: Record<string, unknown>) => {
      const w = makeFakeWindow(options);
      wins.push(w);
      return w;
    });
    (WebContentsView as unknown as jest.Mock).mockReset().mockImplementation(() => ({
      setBounds: jest.fn(), webContents: makeFakeWebContents(),
    }));
    const bridge = Object.assign(new EventEmitter(), { execute: jest.fn(), getLastState: jest.fn(() => null), attachWebContents: jest.fn() });
    settings = makeFakeSettings({ windowBounds: { x: 300, y: 200, width: 1200, height: 800 }, minimiseToTray: false });
    wm = new WindowManager(settings as never, bridge as never);
    wm.createMainWindow();
  });

  afterEach(() => {
    restorePlatform();
    (app.commandLine.getSwitchValue as jest.Mock).mockReturnValue('');
  });

  it('does not create the Windows taskbar proxy window', () => {
    expect(wins).toHaveLength(1);
    expect(wins[0].options).toMatchObject({ skipTaskbar: true, frame: false });
  });

  it('sets the PNG window icon on every window it creates', () => {
    wm.showMiniPlayer();
    wm.openSettings();
    expect(wins).toHaveLength(3);
    for (const w of wins) expect(w.setIcon).toHaveBeenCalledWith('/app/assets/icons/icon.png');
  });

  it('saves the real window position under X11/XWayland', () => {
    fire(wins[0], 'close', { preventDefault: jest.fn() });
    expect(settings.save).toHaveBeenCalledWith(expect.objectContaining({
      windowBounds: { x: 10, y: 20, width: 1000, height: 700 },
    }));
  });

  it('keeps the previously saved position on native Wayland, where getBounds reports 0,0', () => {
    (app.commandLine.getSwitchValue as jest.Mock).mockReturnValue('wayland');
    (wins[0].getBounds as jest.Mock).mockReturnValue({ x: 0, y: 0, width: 1100, height: 750 });
    fire(wins[0], 'close', { preventDefault: jest.fn() });
    expect(settings.save).toHaveBeenCalledWith(expect.objectContaining({
      windowBounds: { x: 300, y: 200, width: 1100, height: 750 },
    }));
  });

  it('keeps the mini player position on native Wayland', () => {
    (app.commandLine.getSwitchValue as jest.Mock).mockReturnValue('wayland');
    wm.showMiniPlayer();
    (wins[1].getBounds as jest.Mock).mockReturnValue({ x: 0, y: 0, width: 360, height: 130 });
    fire(wins[1], 'close');
    expect(settings.save).toHaveBeenCalledWith(expect.objectContaining({ miniPlayerBounds: { x: 100, y: 100 } }));
  });
});
