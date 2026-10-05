import { app } from 'electron';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { applyAutostart, autostartPath, buildAutostartEntry, quoteExecArg } from '../../src/main/platform/linux/autostart';

describe('autostartPath', () => {
  it('uses ~/.config/autostart by default', () => {
    expect(autostartPath({}, '/home/u')).toBe(path.join('/home/u', '.config', 'autostart', 'ytm.desktop'));
  });
  it('honours an absolute XDG_CONFIG_HOME', () => {
    expect(autostartPath({ XDG_CONFIG_HOME: '/custom/cfg' }, '/home/u')).toBe(path.join('/custom/cfg', 'autostart', 'ytm.desktop'));
  });
  it('ignores a relative XDG_CONFIG_HOME as the spec requires', () => {
    expect(autostartPath({ XDG_CONFIG_HOME: 'rel' }, '/home/u')).toBe(path.join('/home/u', '.config', 'autostart', 'ytm.desktop'));
  });
});

describe('quoteExecArg', () => {
  it.each([
    ['/opt/YTM/ytm', '/opt/YTM/ytm'],
    ['--ozone-platform=x11', '--ozone-platform=x11'],
    ['/opt/My App/ytm', '"/opt/My App/ytm"'],
    ['/opt/ü ✓/ytm', '"/opt/ü ✓/ytm"'],
    ['a"b c', '"a\\\\"b c"'],
    ['a$b', '"a\\\\$b"'],
    ['back\\slash', '"back\\\\\\\\slash"'],
    ['100%', '100%%'],
  ])('%s', (input, expected) => {
    expect(quoteExecArg(input)).toBe(expected);
  });
});

describe('buildAutostartEntry', () => {
  const entry = buildAutostartEntry('/opt/YTM/ytm');
  it('is a valid Desktop Entry that starts the packaged binary in X11 mode', () => {
    expect(entry.startsWith('[Desktop Entry]\n')).toBe(true);
    expect(entry).toContain('Exec=/opt/YTM/ytm --ozone-platform=x11\n');
    expect(entry).toContain('TryExec=/opt/YTM/ytm\n');
    expect(entry).toContain('Type=Application\n');
    expect(entry.endsWith('\n')).toBe(true);
  });
  it('quotes an exec path containing spaces and strips newlines from TryExec', () => {
    const e = buildAutostartEntry('/opt/Y T\nM/ytm');
    expect(e).toContain('Exec="/opt/Y T\nM/ytm" --ozone-platform=x11');
    expect(e).toContain('TryExec=/opt/Y TM/ytm\n');
  });
});

describe('applyAutostart', () => {
  let dir: string;
  let file: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ytm-autostart-'));
    file = path.join(dir, 'autostart', 'ytm.desktop');
    (app as { isPackaged: boolean }).isPackaged = true;
  });
  afterEach(() => {
    (app as { isPackaged: boolean }).isPackaged = false;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('creates the entry (and its directory) when enabled', () => {
    applyAutostart(true, file);
    expect(fs.readFileSync(file, 'utf8')).toContain(`Exec=${process.execPath}`);
    // POSIX permission bits are not meaningful on Windows file systems.
    if (process.platform !== 'win32') expect(fs.statSync(file).mode & 0o777).toBe(0o644);
  });
  it('removes the entry when disabled, and tolerates it already being gone', () => {
    applyAutostart(true, file);
    applyAutostart(false, file);
    expect(fs.existsSync(file)).toBe(false);
    expect(() => applyAutostart(false, file)).not.toThrow();
  });
  it('does nothing when not packaged', () => {
    (app as { isPackaged: boolean }).isPackaged = false;
    applyAutostart(true, file);
    expect(fs.existsSync(file)).toBe(false);
  });
  it('warns instead of throwing when the directory is not writable', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    fs.writeFileSync(path.join(dir, 'autostart'), 'a file where the directory should be');
    expect(() => applyAutostart(true, file)).not.toThrow();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
