import { app, dialog } from 'electron';

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

export const NO_SANDBOX_MESSAGE =
  'YTM was started with --no-sandbox, so YouTube Music would run without the Chromium sandbox. ' +
  'This happens when the AppImage launcher cannot use unprivileged user namespaces (for example on ' +
  'Ubuntu 24.04 and newer, where kernel.apparmor_restrict_unprivileged_userns=1). Install the .deb ' +
  'package instead, which ships an AppArmor profile, or set ' + ALLOW_NO_SANDBOX_ENV + '=1 to run anyway.';

/** True when the process was started with --no-sandbox and the override variable is unset. */
export function startedWithoutSandbox(argv: ReadonlyArray<string>, env: NodeJS.ProcessEnv): boolean {
  return argv.includes('--no-sandbox') && !env[ALLOW_NO_SANDBOX_ENV];
}

/**
 * The project never ships --no-sandbox, but electron-builder's AppImage launcher appends it when
 * user namespaces are unavailable. Refuse to continue in that case: show why and exit with 1.
 * Returns true when the app is exiting.
 */
export function refuseUnsandboxedStart(
  argv: ReadonlyArray<string> = process.argv,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (!startedWithoutSandbox(argv, env)) return false;
  console.error('[sandbox] ' + NO_SANDBOX_MESSAGE);
  try {
    dialog.showErrorBox('YTM cannot start without the sandbox', NO_SANDBOX_MESSAGE);
  } catch {
    // headless or no display: the console message is enough
  }
  app.exit(1);
  return true;
}
