// Characterization tests: pin the current Windows behaviour of WindowManager so the Kubuntu
// work cannot silently change it. These must pass unchanged on the baseline commit.
import { BrowserWindow, WebContentsView } from 'electron';
import { EventEmitter } from 'events';
import { WindowManager } from '../src/main/windowManager';
import { FakeWindow, fire, makeFakeSettings, makeFakeWebContents, makeFakeWindow, setPlatform } from './helpers/fakeElectron';

describe('WindowManager on win32 (characterization)', () => {
  let restorePlatform: () => void;
  let wins: FakeWindow[];
  let bridge: EventEmitter & { execute: jest.Mock; getLastState: jest.Mock; attachWebContents: jest.Mock };
  let wm: WindowManager;

  beforeEach(() => {
    jest.useFakeTimers();
    restorePlatform = setPlatform('win32');
    wins = [];
    (BrowserWindow as unknown as jest.Mock).mockReset().mockImplementation((options: Record<string, unknown>) => {
      const w = makeFakeWindow(options);
      wins.push(w);
      return w;
    });
    (WebContentsView as unknown as jest.Mock).mockReset().mockImplementation(() => ({
      setBounds: jest.fn(),
      webContents: makeFakeWebContents(),
    }));
    bridge = Object.assign(new EventEmitter(), {
      execute: jest.fn(),
      getLastState: jest.fn(() => null),
      attachWebContents: jest.fn(),
    });
    wm = new WindowManager(makeFakeSettings() as never, bridge as never);
    wm.createMainWindow();
  });

  afterEach(() => {
    jest.useRealTimers();
    restorePlatform();
  });

  const lastThumbarButtons = () => {
    const calls = (proxy().setThumbarButtons as jest.Mock).mock.calls;
    return calls[calls.length - 1][0];
  };
  const main = () => wins[0];
  const proxy = () => wins[1];

  it('creates the main window then the taskbar proxy window', () => {
    expect(wins).toHaveLength(2);
    expect(main().options).toMatchObject({ frame: false, skipTaskbar: true, minWidth: 800, minHeight: 600 });
    expect(proxy().options).toMatchObject({
      x: 0, y: 0, width: 300, height: 48, frame: false, show: true, skipTaskbar: false, resizable: false,
    });
    expect(proxy().setIgnoreMouseEvents).toHaveBeenCalledWith(true, { forward: true });
  });

  it('sets Previous / Play / Next thumbar buttons when the proxy finishes loading', () => {
    fire(proxy().webContents, 'did-finish-load');
    const buttons = lastThumbarButtons();
    expect(buttons.map((b: { tooltip: string }) => b.tooltip)).toEqual(['Previous Track', 'Play', 'Next Track']);
  });

  it('switches the middle thumbar button to Pause when the player state is playing', () => {
    bridge.emit('state-changed', { isPlaying: true });
    const buttons = lastThumbarButtons();
    expect(buttons[1].tooltip).toBe('Pause');
  });

  it('routes thumbar button clicks to the player bridge', () => {
    fire(proxy().webContents, 'did-finish-load');
    const buttons = lastThumbarButtons();
    buttons[0].click();
    buttons[1].click();
    buttons[2].click();
    expect(bridge.execute.mock.calls.map((c) => c[0])).toEqual(['previousTrack', 'playPause', 'nextTrack']);
  });

  it('minimises the player when the proxy is activated right after the player blurred', () => {
    fire(main(), 'blur');
    fire(proxy(), 'focus');
    expect(proxy().blur).toHaveBeenCalled();
    expect(main().minimize).toHaveBeenCalled();
  });

  it('restores a minimised player when the proxy is activated', () => {
    (main().isMinimized as jest.Mock).mockReturnValue(true);
    fire(proxy(), 'focus');
    expect(main().restore).toHaveBeenCalled();
    expect(main().focus).toHaveBeenCalled();
  });

  it('ignores proxy activation caused by the player minimising', () => {
    fire(main(), 'minimize');
    fire(proxy(), 'focus');
    expect(main().minimize).not.toHaveBeenCalled();
    expect(main().restore).not.toHaveBeenCalled();
    expect(main().show).not.toHaveBeenCalled();
  });

  it('restores the proxy and brings the player back when the proxy itself is minimised', () => {
    (main().isMinimized as jest.Mock).mockReturnValue(true);
    fire(proxy(), 'minimize');
    expect(proxy().restore).toHaveBeenCalled();
    expect(main().restore).toHaveBeenCalled();
  });

  it('prevents the proxy from closing unless quitting', () => {
    const e1 = { preventDefault: jest.fn() };
    fire(proxy(), 'close', e1);
    expect(e1.preventDefault).toHaveBeenCalled();
    wm.setQuitting(true);
    const e2 = { preventDefault: jest.fn() };
    fire(proxy(), 'close', e2);
    expect(e2.preventDefault).not.toHaveBeenCalled();
  });

  it('hides the main window instead of closing when minimiseToTray is on', () => {
    const e = { preventDefault: jest.fn() };
    fire(main(), 'close', e);
    expect(e.preventDefault).toHaveBeenCalled();
    expect(main().hide).toHaveBeenCalled();
  });

  it('creates the mini player as a taskbar-hidden always-on-top 360x130 window', () => {
    wm.showMiniPlayer();
    const mini = wins[2];
    expect(mini.options).toMatchObject({ width: 360, height: 130, alwaysOnTop: true, skipTaskbar: true, frame: false, x: 100, y: 100 });
    expect(main().hide).toHaveBeenCalled();
    expect(mini.show).toHaveBeenCalled();
  });
});
