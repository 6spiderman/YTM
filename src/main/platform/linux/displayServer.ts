// Linux-only helpers. No import-time side effects; nothing here runs unless called from a
// `process.platform === 'linux'` branch in shared code.
import { app } from 'electron';

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
