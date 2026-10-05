import { EventEmitter } from 'events';
import {
  buildNotifyArgs, escapeMarkup, LinuxNotifier, MONITOR_ARGS, parseActionLine, parseNotifyReply,
} from '../../src/main/platform/linux/notifications';

const req = { title: '-Daft Punk', body: 'Get Lucky & <Friends>', iconPath: '/tmp/art.jpg', sound: false };

describe('buildNotifyArgs', () => {
  const args = buildNotifyArgs(req, 0);

  it('calls org.freedesktop.Notifications.Notify with the expected signature', () => {
    expect(args.slice(0, 4)).toEqual(['--user', '--json=short', 'call', '--']);
    expect(args.slice(4, 9)).toEqual([
      'org.freedesktop.Notifications', '/org/freedesktop/Notifications',
      'org.freedesktop.Notifications', 'Notify', 'susssasa{sv}i',
    ]);
  });
  it('puts everything user-controlled after the -- separator so a leading dash is not an option', () => {
    expect(args.indexOf('--')).toBeLessThan(args.indexOf('-Daft Punk'));
    expect(args.filter((a) => a === '--')).toHaveLength(1);
  });
  it('passes app name, replaces id, icon, title and escaped body', () => {
    expect(args.slice(9, 14)).toEqual(['YTM', '0', '/tmp/art.jpg', '-Daft Punk', 'Get Lucky &amp; &lt;Friends&gt;']);
  });
  it('offers exactly Previous, Play / Pause and Next', () => {
    expect(args.slice(14, 21)).toEqual([
      '6', 'previousTrack', 'Previous', 'playPause', 'Play / Pause', 'nextTrack', 'Next',
    ]);
  });
  it('adds desktop-entry and suppress-sound hints when sound is off', () => {
    expect(args.slice(21)).toEqual(['2', 'desktop-entry', 's', 'ytm', 'suppress-sound', 'b', 'true', '-1']);
  });
  it('omits suppress-sound when sound is on and passes the replaces id through', () => {
    const a = buildNotifyArgs({ ...req, sound: true, iconPath: undefined }, 42);
    expect(a[10]).toBe('42');
    expect(a[11]).toBe('');
    expect(a.slice(21)).toEqual(['1', 'desktop-entry', 's', 'ytm', '-1']);
  });
});

describe('escapeMarkup', () => {
  it('escapes ampersand first so entities are not double-escaped', () => {
    expect(escapeMarkup('AC&DC <b>')).toBe('AC&amp;DC &lt;b&gt;');
  });
});

describe('parseNotifyReply', () => {
  it('reads the id from busctl JSON output', () => {
    expect(parseNotifyReply('{"type":"u","data":[86]}')).toBe(86);
  });
  it.each(['', 'nope', '{"data":[]}', '{"data":["x"]}'])('rejects %p', (s) => {
    expect(parseNotifyReply(s)).toBeNull();
  });
});

describe('parseActionLine', () => {
  const line = (data: unknown[], member = 'ActionInvoked') => JSON.stringify({ member, payload: { type: 'us', data } });
  const owned = new Set([85]);

  it('returns allowed actions for notifications we created', () => {
    expect(parseActionLine(line([85, 'playPause']), owned)).toBe('playPause');
    expect(parseActionLine(line([85, 'nextTrack']), owned)).toBe('nextTrack');
  });
  it('ignores notifications we did not create', () => {
    expect(parseActionLine(line([99, 'playPause']), owned)).toBeNull();
  });
  it('ignores actions outside the allowlist, wrong signals and garbage', () => {
    expect(parseActionLine(line([85, 'volumeUp']), owned)).toBeNull();
    expect(parseActionLine(line([85, 'playPause'], 'NotificationClosed'), owned)).toBeNull();
    expect(parseActionLine('not json', owned)).toBeNull();
    expect(parseActionLine(line(['85', 'playPause']), owned)).toBeNull();
  });
});

describe('LinuxNotifier', () => {
  function setup(execResult: (args: string[]) => { err: Error | null; stdout: string }) {
    const monitor = Object.assign(new EventEmitter(), { stdout: new EventEmitter(), kill: jest.fn() });
    const spawnProc = jest.fn(() => monitor);
    const exec = jest.fn((_file: string, args: string[], cb: (e: Error | null, out: string) => void) => {
      const r = execResult(args);
      cb(r.err, r.stdout);
    });
    const onAction = jest.fn();
    const notifier = new LinuxNotifier(onAction, exec as never, spawnProc as never);
    return { monitor, spawnProc, exec, onAction, notifier };
  }
  const okReply = (id: number) => ({ err: null, stdout: JSON.stringify({ type: 'u', data: [id] }) });
  const emit = (monitor: EventEmitter & { stdout: EventEmitter }, data: unknown[]) =>
    monitor.stdout.emit('data', Buffer.from(JSON.stringify({ member: 'ActionInvoked', payload: { data } }) + '\n'));

  it('starts one monitor, sends the notification and routes button presses to onAction', () => {
    const { notifier, spawnProc, exec, monitor, onAction } = setup(() => okReply(7));
    notifier.show(req, jest.fn());
    notifier.show(req, jest.fn());
    expect(spawnProc).toHaveBeenCalledTimes(1);
    expect(spawnProc).toHaveBeenCalledWith('busctl', MONITOR_ARGS);
    expect(exec.mock.calls[0][0]).toBe('busctl');
    emit(monitor, [7, 'previousTrack']);
    expect(onAction).toHaveBeenCalledWith('previousTrack');
  });
  it('replaces the previous notification by passing its id', () => {
    const { notifier, exec } = setup(() => okReply(7));
    notifier.show(req, jest.fn());
    notifier.show(req, jest.fn());
    expect(exec.mock.calls[0][1][10]).toBe('0');
    expect(exec.mock.calls[1][1][10]).toBe('7');
  });
  it('ignores signals for foreign notification ids and handles chunked lines', () => {
    const { notifier, monitor, onAction } = setup(() => okReply(7));
    notifier.show(req, jest.fn());
    emit(monitor, [8, 'playPause']);
    const full = JSON.stringify({ member: 'ActionInvoked', payload: { data: [7, 'nextTrack'] } }) + '\n';
    monitor.stdout.emit('data', Buffer.from(full.slice(0, 20)));
    monitor.stdout.emit('data', Buffer.from(full.slice(20)));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith('nextTrack');
  });
  it('falls back when the D-Bus call fails', () => {
    const { notifier } = setup(() => ({ err: new Error('spawn busctl ENOENT'), stdout: '' }));
    const fallback = jest.fn();
    notifier.show(req, fallback);
    expect(fallback).toHaveBeenCalledTimes(1);
  });
  it('falls back when the reply has no notification id', () => {
    const { notifier } = setup(() => ({ err: null, stdout: 'garbage' }));
    const fallback = jest.fn();
    notifier.show(req, fallback);
    expect(fallback).toHaveBeenCalledTimes(1);
  });
  it('restarts the monitor after it exits', () => {
    const { notifier, spawnProc, monitor } = setup(() => okReply(7));
    notifier.show(req, jest.fn());
    monitor.emit('exit');
    notifier.show(req, jest.fn());
    expect(spawnProc).toHaveBeenCalledTimes(2);
  });
  it('dispose kills the monitor and stops showing notifications', () => {
    const { notifier, monitor, exec } = setup(() => okReply(7));
    notifier.show(req, jest.fn());
    notifier.dispose();
    expect(monitor.kill).toHaveBeenCalled();
    notifier.show(req, jest.fn());
    expect(exec).toHaveBeenCalledTimes(1);
  });
});
