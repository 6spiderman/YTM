import { app, nativeImage, BrowserWindow, NativeImage } from 'electron';
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
