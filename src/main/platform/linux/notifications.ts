// Desktop notifications with Previous / Play-Pause / Next buttons on Linux.
//
// Electron's Notification has no `actions` on Linux, and `notify-send` 0.8.8 drops them on Plasma
// ("Actions are not supported by this notifications server"), so this talks to
// org.freedesktop.Notifications directly through `busctl` (part of systemd, always present on
// Kubuntu): one `Notify` call per notification, and one long-lived `busctl monitor` that listens
// for ActionInvoked. Child processes are started without a shell, and every positional argument is
// preceded by `--` so a track title such as "-Foo" cannot be parsed as an option.
import { ChildProcess, execFile, spawn } from 'child_process';

export const NOTIFY_ACTIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'previousTrack', label: 'Previous' },
  { id: 'playPause', label: 'Play / Pause' },
  { id: 'nextTrack', label: 'Next' },
];

const ALLOWED_ACTIONS = new Set(NOTIFY_ACTIONS.map((a) => a.id));
const NOTIFICATIONS = 'org.freedesktop.Notifications';
const OBJECT_PATH = '/org/freedesktop/Notifications';
const MAX_TRACKED_IDS = 16;

export interface NotifyRequest {
  title: string;
  body: string;
  iconPath?: string;
  sound: boolean;
}

/** The notification body supports a small markup subset (Plasma advertises `body-markup`). */
export function escapeMarkup(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildNotifyArgs(req: NotifyRequest, replacesId: number): string[] {
  const hints: string[] = ['desktop-entry', 's', 'ytm'];
  if (!req.sound) hints.push('suppress-sound', 'b', 'true');
  const actionArgs = NOTIFY_ACTIONS.flatMap((a) => [a.id, a.label]);
  return [
    '--user',
    '--json=short',
    'call',
    '--',
    NOTIFICATIONS,
    OBJECT_PATH,
    NOTIFICATIONS,
    'Notify',
    'susssasa{sv}i',
    'YTM',
    String(replacesId),
    req.iconPath ?? '',
    req.title,
    escapeMarkup(req.body),
    String(actionArgs.length),
    ...actionArgs,
    String(hints.length / 3),
    ...hints,
    '-1',
  ];
}

export const MONITOR_ARGS = [
  '--user',
  '--json=short',
  'monitor',
  `--match=type='signal',interface='${NOTIFICATIONS}',member='ActionInvoked'`,
];

/** Returns the action id for an ActionInvoked JSON line that refers to one of our notifications. */
export function parseActionLine(line: string, ownedIds: ReadonlySet<number>): string | null {
  let message: { member?: string; payload?: { data?: unknown[] } };
  try {
    message = JSON.parse(line);
  } catch {
    return null;
  }
  if (message.member !== 'ActionInvoked') return null;
  const [id, action] = message.payload?.data ?? [];
  if (typeof id !== 'number' || typeof action !== 'string') return null;
  if (!ownedIds.has(id) || !ALLOWED_ACTIONS.has(action)) return null;
  return action;
}

export function parseNotifyReply(stdout: string): number | null {
  try {
    const id = JSON.parse(stdout).data?.[0];
    return typeof id === 'number' ? id : null;
  } catch {
    return null;
  }
}

type ExecFileFn = (
  file: string,
  args: string[],
  cb: (err: Error | null, stdout: string) => void
) => unknown;
type SpawnFn = (file: string, args: string[]) => Pick<ChildProcess, 'stdout' | 'on' | 'kill'>;

export class LinuxNotifier {
  private lastId = 0;
  private ownedIds = new Set<number>();
  private monitor: Pick<ChildProcess, 'stdout' | 'on' | 'kill'> | null = null;
  private disposed = false;

  constructor(
    private onAction: (action: string) => void,
    private exec: ExecFileFn = (file, args, cb) => execFile(file, args, { timeout: 5000 }, cb as never),
    private spawnProc: SpawnFn = (file, args) => spawn(file, args, { stdio: ['ignore', 'pipe', 'ignore'] })
  ) {}

  /** Shows a notification. `onUnavailable` runs if the D-Bus call fails (e.g. busctl missing). */
  show(req: NotifyRequest, onUnavailable: () => void): void {
    if (this.disposed) return;
    this.ensureMonitor();
    this.exec('busctl', buildNotifyArgs(req, this.lastId), (err, stdout) => {
      const id = err ? null : parseNotifyReply(stdout);
      if (id === null) {
        onUnavailable();
        return;
      }
      this.lastId = id;
      this.ownedIds.add(id);
      if (this.ownedIds.size > MAX_TRACKED_IDS) {
        this.ownedIds.delete(this.ownedIds.values().next().value as number);
      }
    });
  }

  private ensureMonitor(): void {
    if (this.monitor) return;
    try {
      const child = this.spawnProc('busctl', MONITOR_ARGS);
      this.monitor = child;
      let buffer = '';
      child.stdout?.on('data', (chunk: Buffer | string) => {
        buffer += chunk.toString();
        let newline: number;
        while ((newline = buffer.indexOf('\n')) !== -1) {
          const action = parseActionLine(buffer.slice(0, newline), this.ownedIds);
          buffer = buffer.slice(newline + 1);
          if (action) this.onAction(action);
        }
      });
      const drop = () => { if (this.monitor === child) this.monitor = null; };
      child.on('error', drop);
      child.on('exit', drop);
    } catch {
      this.monitor = null;
    }
  }

  dispose(): void {
    this.disposed = true;
    this.monitor?.kill();
    this.monitor = null;
  }
}
