import { app, BrowserWindow } from 'electron';

/**
 * Without this a SIGTERM/SIGINT/SIGHUP (logout, `kill`, terminal close) leaves the app running:
 * the main window's `close` handler vetoes the close while `minimiseToTray` is on and `quitting`
 * is false, so Electron never exits.
 */
export function installTerminationHandlers(
  quit: () => void,
  proc: Pick<NodeJS.Process, 'on'> = process
): void {
  for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP'] as const) {
    proc.on(signal, quit);
  }
}

export const ALLOW_NO_SANDBOX_ENV = 'YTM_ALLOW_NO_SANDBOX';

export const NO_SANDBOX_TITLE = 'YTM cannot start without the sandbox';

export const NO_SANDBOX_MESSAGE =
  'YTM was started with --no-sandbox, so YouTube Music would run without the Chromium sandbox. ' +
  'This happens when the AppImage launcher cannot use unprivileged user namespaces (for example on ' +
  'Ubuntu 24.04 and newer, where kernel.apparmor_restrict_unprivileged_userns=1). Install the .deb ' +
  'package instead, which ships an AppArmor profile, or set ' + ALLOW_NO_SANDBOX_ENV + '=1 to run anyway.';

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function noSandboxPage(): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(NO_SANDBOX_TITLE)}</title>
<style>body{font:14px/1.5 system-ui,sans-serif;margin:0;padding:24px 28px;background:#1f1f1f;color:#eee}
h1{font-size:17px;margin:0 0 12px}p{margin:0 0 16px}
button{font:inherit;padding:6px 18px;border-radius:4px;border:1px solid #666;background:#2d2d2d;color:#eee;cursor:pointer}</style></head>
<body><h1>${escapeHtml(NO_SANDBOX_TITLE)}</h1><p>${escapeHtml(NO_SANDBOX_MESSAGE)}</p>
<button onclick="window.close()">Close</button></body></html>`;
}

/** True when the process was started with --no-sandbox and the override variable is unset. */
export function startedWithoutSandbox(argv: ReadonlyArray<string>, env: NodeJS.ProcessEnv): boolean {
  return argv.includes('--no-sandbox') && !env[ALLOW_NO_SANDBOX_ENV];
}

/**
 * The project never ships --no-sandbox, but electron-builder's AppImage launcher appends it when
 * user namespaces are unavailable. Refuse to continue in that case: explain on stderr at once,
 * show a dialog once the app is ready (before that GTK dialogs are a silent no-op on Linux) and exit
 * with 1 after it is dismissed.
 * Returns true when the app is going to exit; the caller must not quit or open windows.
 */
export function refuseUnsandboxedStart(
  argv: ReadonlyArray<string> = process.argv,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (!startedWithoutSandbox(argv, env)) return false;
  console.error('[sandbox] ' + NO_SANDBOX_MESSAGE);
  // GTK dialogs (showErrorBox / showMessageBox) are dismissed immediately in the packaged app on
  // Linux, so the message is shown in an ordinary window; closing it exits the process.
  app.whenReady().then(() => {
    try {
      const win = new BrowserWindow({
        width: 620,
        height: 300,
        title: NO_SANDBOX_TITLE,
        resizable: false,
        autoHideMenuBar: true,
        webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
      });
      win.on('closed', () => app.exit(1));
      win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(noSandboxPage()));
    } catch {
      app.exit(1); // headless or no display: the console message is enough
    }
  });
  return true;
}
