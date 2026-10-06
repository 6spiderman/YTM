// XDG autostart (https://specifications.freedesktop.org/autostart-spec/) replacement for
// app.setLoginItemSettings, which only exists on macOS and Windows.
import { app } from 'electron';
import fs from 'fs';
import os from 'os';
import path from 'path';

const ENTRY_NAME = 'ytm.desktop';
export const AUTOSTART_ARGS = ['--ozone-platform=x11'];

export function autostartPath(env: NodeJS.ProcessEnv = process.env, home: string = os.homedir()): string {
  const configHome = env.XDG_CONFIG_HOME && path.isAbsolute(env.XDG_CONFIG_HOME)
    ? env.XDG_CONFIG_HOME
    : path.join(home, '.config');
  return path.join(configHome, 'autostart', ENTRY_NAME);
}

/**
 * The file to start for a new instance: the AppImage itself when running from one (the binary at
 * `process.execPath` lives in a temporary mount), otherwise the real executable.
 */
export function launcherPath(env: NodeJS.ProcessEnv = process.env, execPath: string = process.execPath): string {
  const appImage = env.APPIMAGE;
  return appImage && path.isAbsolute(appImage) ? appImage : execPath;
}

/**
 * Quoting for a Desktop Entry `Exec` argument: wrap in double quotes when it contains reserved
 * characters, backslash-escape `"`, `` ` ``, `$` and `\`, then double every backslash again for the
 * string-value escape rule, and write literal `%` as `%%` so it is not read as a field code.
 */
export function quoteExecArg(arg: string): string {
  const escapedPercent = arg.replace(/%/g, '%%');
  if (!/[\s"'\\><~|&;$*?#()`]/.test(arg)) return escapedPercent;
  const quoted = escapedPercent.replace(/(["`$\\])/g, '\\$1').replace(/\\/g, '\\\\');
  return `"${quoted}"`;
}

export function buildAutostartEntry(execPath: string, args: string[] = AUTOSTART_ARGS): string {
  const exec = [execPath, ...args].map(quoteExecArg).join(' ');
  return [
    '[Desktop Entry]',
    'Type=Application',
    'Name=YTM',
    'Comment=YouTube Music desktop app',
    `Exec=${exec}`,
    // A stale entry left behind after the package is removed is ignored because TryExec fails.
    `TryExec=${execPath.replace(/[\r\n]/g, '')}`,
    'Icon=ytm',
    'Terminal=false',
    'StartupWMClass=ytm',
    'X-GNOME-Autostart-enabled=true',
    '',
  ].join('\n');
}

/** Creates or removes the autostart entry. Packaged builds only: in dev the exec path is electron. */
export function applyAutostart(enabled: boolean, file: string = autostartPath()): void {
  if (!app.isPackaged) return;
  try {
    if (enabled) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, buildAutostartEntry(launcherPath()), { mode: 0o644 });
    } else {
      fs.rmSync(file, { force: true });
    }
  } catch (err) {
    console.warn('[autostart] could not update', file, err);
  }
}
