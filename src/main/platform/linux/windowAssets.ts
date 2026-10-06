import { app, nativeImage, screen, BrowserWindow, NativeImage, Rectangle } from 'electron';
import path from 'path';

// Linux has no .ico support in nativeImage, so the PNG already shipped for the Windows installer is
// reused (no new files under assets/, which would land in the Windows package).
const ICON_PNG = ['assets', 'icons', 'icon.png'];

export function linuxIconPath(appPath: string = app.getAppPath()): string {
  return path.join(appPath, ...ICON_PNG);
}

/** Tray icons: Plasma/SNI renders small icons, so scale the 433px PNG down. */
export function createLinuxTrayIcon(appPath: string = app.getAppPath()): NativeImage {
  const image = nativeImage.createFromPath(linuxIconPath(appPath));
  return image.isEmpty() ? image : image.resize({ width: 32, height: 32, quality: 'best' });
}

export function applyLinuxWindowIcon(win: BrowserWindow, appPath: string = app.getAppPath()): void {
  win.setIcon(linuxIconPath(appPath));
}

/** Keeps a `width`x`height` rectangle at (x, y) inside `area`, moving it as little as possible. */
export function clampInto(area: Rectangle, x: number, y: number, width: number, height: number): { x: number; y: number } {
  return {
    x: Math.max(area.x, Math.min(x, area.x + area.width - width)),
    y: Math.max(area.y, Math.min(y, area.y + area.height - height)),
  };
}

/** Top-left corner that centres a `width`x`height` rectangle on `target`. */
export function centerOn(target: Rectangle, width: number, height: number): { x: number; y: number } {
  return { x: target.x + Math.round((target.width - width) / 2), y: target.y + Math.round((target.height - height) / 2) };
}

/**
 * Position for a `width`x`height` dialog centred on `win` when it is visible (kept inside that
 * display's work area), otherwise centred in the work area of the display under the cursor.
 * Returns {} when nothing can be determined, so the window manager places the window.
 */
export function centeredOnWindow(win: BrowserWindow | null, width: number, height: number): { x?: number; y?: number } {
  try {
    if (win && !win.isDestroyed() && win.isVisible() && !win.isMinimized()) {
      const bounds = win.getBounds();
      const { x, y } = centerOn(bounds, width, height);
      return clampInto(screen.getDisplayMatching(bounds).workArea, x, y, width, height);
    }
    const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
    const { x, y } = centerOn(area, width, height);
    return clampInto(area, x, y, width, height);
  } catch {
    return {};
  }
}
