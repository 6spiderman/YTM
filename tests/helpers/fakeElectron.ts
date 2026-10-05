// Shared fakes for tests that exercise WindowManager and friends against a mocked `electron`.

type Handler = (...args: unknown[]) => void;

export interface FakeWebContents {
  handlers: Record<string, Handler[]>;
  on: jest.Mock;
  send: jest.Mock;
  loadURL: jest.Mock;
  openDevTools: jest.Mock;
  reload: jest.Mock;
  isDestroyed: jest.Mock;
  executeJavaScript: jest.Mock;
}

export interface FakeWindow {
  handlers: Record<string, Handler[]>;
  options: Record<string, unknown>;
  webContents: FakeWebContents;
  contentView: { addChildView: jest.Mock };
  [method: string]: unknown;
}

function makeHandlerBag() {
  const handlers: Record<string, Handler[]> = {};
  const register = jest.fn((event: string, cb: Handler) => {
    (handlers[event] ||= []).push(cb);
  });
  return { handlers, register };
}

export function makeFakeWebContents(): FakeWebContents {
  const { handlers, register } = makeHandlerBag();
  return {
    handlers,
    on: register,
    send: jest.fn(),
    loadURL: jest.fn(),
    openDevTools: jest.fn(),
    reload: jest.fn(),
    isDestroyed: jest.fn(() => false),
    executeJavaScript: jest.fn(),
  };
}

export function makeFakeWindow(options: Record<string, unknown> = {}): FakeWindow {
  const { handlers, register } = makeHandlerBag();
  const win: FakeWindow = {
    handlers,
    options,
    on: register,
    once: register,
    webContents: makeFakeWebContents(),
    contentView: { addChildView: jest.fn() },
    loadFile: jest.fn(),
    loadURL: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    focus: jest.fn(),
    blur: jest.fn(),
    minimize: jest.fn(),
    restore: jest.fn(),
    close: jest.fn(),
    maximize: jest.fn(),
    unmaximize: jest.fn(),
    isVisible: jest.fn(() => true),
    isMinimized: jest.fn(() => false),
    isMaximized: jest.fn(() => false),
    getBounds: jest.fn(() => ({ x: 10, y: 20, width: 1000, height: 700 })),
    getContentSize: jest.fn(() => [1000, 700]),
    setAlwaysOnTop: jest.fn(),
    setThumbarButtons: jest.fn(),
    setIgnoreMouseEvents: jest.fn(),
    setIcon: jest.fn(),
  };
  return win;
}

/** Fire every handler registered on a fake window/webContents for `event`. */
export function fire(target: { handlers: Record<string, Handler[]> }, event: string, ...args: unknown[]): void {
  for (const cb of target.handlers[event] ?? []) cb(...args);
}

export function setPlatform(value: NodeJS.Platform): () => void {
  const original = Object.getOwnPropertyDescriptor(process, 'platform')!;
  Object.defineProperty(process, 'platform', { value });
  return () => Object.defineProperty(process, 'platform', original);
}

export function makeFakeSettings(overrides: Record<string, unknown> = {}) {
  const data = {
    windowBounds: { x: undefined, y: undefined, width: 1200, height: 800 },
    miniPlayerBounds: { x: 100, y: 100 },
    miniPlayerAlwaysOnTop: true,
    startMinimised: false,
    startWithWindows: false,
    minimiseToTray: true,
    shortcuts: {},
    volumeStep: 5,
    notifications: { enabled: true, titleTemplate: '{artist}', bodyTemplate: '{title}', showAlbumArt: true, playSound: false },
    ...overrides,
  };
  return { get: jest.fn(() => data), save: jest.fn(), getDefaults: jest.fn(() => data) };
}
