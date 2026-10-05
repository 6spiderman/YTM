export const app = {
  getPath: jest.fn((name: string) => {
    if (name === 'userData') return '/tmp/test-ytm';
    return '/tmp';
  }),
  getAppPath: jest.fn(() => '/app'),
  isPackaged: false,
  on: jest.fn(),
  quit: jest.fn(),
  requestSingleInstanceLock: jest.fn(() => true),
  whenReady: jest.fn(() => Promise.resolve()),
  setAppUserModelId: jest.fn(),
  setAsDefaultProtocolClient: jest.fn(),
  setLoginItemSettings: jest.fn(),
  getLoginItemSettings: jest.fn(() => ({ openAtLogin: false })),
};

export const ipcMain = {
  on: jest.fn(),
  handle: jest.fn(),
  emit: jest.fn(),
};

export const globalShortcut = {
  register: jest.fn(() => true),
  unregister: jest.fn(),
  unregisterAll: jest.fn(),
  isRegistered: jest.fn(() => false),
};

export const Notification = jest.fn().mockImplementation(() => ({
  show: jest.fn(),
  on: jest.fn(),
}));

export const Tray = jest.fn().mockImplementation(() => ({
  setToolTip: jest.fn(),
  setContextMenu: jest.fn(),
  on: jest.fn(),
}));

export const Menu = {
  buildFromTemplate: jest.fn(() => ({})),
};

export const nativeImage = {
  createFromPath: jest.fn(() => ({ isEmpty: () => false })),
  createEmpty: jest.fn(() => ({})),
};

export const net = {
  request: jest.fn(),
};

export const BrowserWindow = jest.fn();
export const WebContentsView = jest.fn();
export const screen = {
  getPrimaryDisplay: jest.fn(() => ({ workAreaSize: { width: 1920, height: 1080 } })),
};
