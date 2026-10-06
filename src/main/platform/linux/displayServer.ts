// Linux-only helpers. No import-time side effects; nothing here runs unless called from a
// `process.platform === 'linux'` branch in shared code.
import { app } from 'electron';
import { spawn } from 'child_process';
import { launcherPath } from './autostart';

/**
 * True when Chromium will run as a native Wayland client. Electron 38+ defaults
 * `--ozone-platform` to `auto`, which picks Wayland inside a Wayland session; the packaged
 * launcher passes `--ozone-platform=x11` so the app normally runs through XWayland.
 */
export function detectNativeWayland(ozoneSwitch: string, env: NodeJS.ProcessEnv): boolean {
  if (ozoneSwitch === 'x11') return false;
  if (ozoneSwitch === 'wayland') return true;
  return env.XDG_SESSION_TYPE === 'wayland' || !!env.WAYLAND_DISPLAY;
}

export function isNativeWayland(): boolean {
  return detectNativeWayland(app.commandLine.getSwitchValue('ozone-platform'), process.env);
}

/**
 * On native Wayland `BrowserWindow.getBounds()` reports x/y as 0, so saving them would corrupt the
 * stored position. Returns the fields to overlay on fresh bounds so the previous position is kept.
 */
export function waylandPositionOverride(
  previous: { x?: number; y?: number },
  nativeWayland: boolean = isNativeWayland()
): { x?: number; y?: number } {
  return nativeWayland ? { x: previous.x, y: previous.y } : {};
}

export const X11_SWITCH = '--ozone-platform=x11';

/**
 * Whether the user or launcher chose a platform. Chromium itself writes the resolved
 * `--ozone-platform=wayland` into `app.commandLine` when it auto-selects, so the raw argv is the
 * only reliable signal.
 */
export function hasExplicitOzoneSwitch(argv: ReadonlyArray<string>): boolean {
  return argv.some((a) => a.startsWith('--ozone-platform'));
}

/**
 * A launch without a platform flag inside a Wayland session that also offers XWayland (`DISPLAY`)
 * should restart in X11 mode, which keeps always-on-top, window positions and X11 key grabs
 * working. Setting the switch from the main script is too late (spike S14), hence the relaunch.
 */
export function shouldRelaunchInX11(argv: ReadonlyArray<string>, env: NodeJS.ProcessEnv): boolean {
  if (hasExplicitOzoneSwitch(argv)) return false;
  if (!env.DISPLAY) return false;
  return env.XDG_SESSION_TYPE === 'wayland' || !!env.WAYLAND_DISPLAY;
}

export type LaunchFn = (file: string, args: string[]) => void;

const defaultLaunch: LaunchFn = (file, args) => {
  spawn(file, args, { detached: true, stdio: 'inherit' }).unref();
};

/**
 * Starts a second instance with `--ozone-platform=x11` and exits this one. Must run before the
 * single-instance lock is requested. Under an AppImage the new instance is the AppImage file
 * itself (`$APPIMAGE`), because `process.execPath` points into the temporary mount.
 * Returns true when the app is exiting.
 */
export function relaunchInX11IfNeeded(
  argv: ReadonlyArray<string> = process.argv,
  env: NodeJS.ProcessEnv = process.env,
  launch: LaunchFn = defaultLaunch
): boolean {
  if (!shouldRelaunchInX11(argv, env)) return false;
  const file = launcherPath(env, argv[0]);
  const args = [...argv.slice(1), X11_SWITCH];
  console.log(`[display] Wayland session with XWayland available: relaunching ${file} in X11 mode`);
  try {
    launch(file, args);
  } catch (err) {
    console.warn('[display] relaunch failed, continuing on native Wayland', err);
    return false;
  }
  app.exit(0);
  return true;
}
