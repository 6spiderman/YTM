// Desktop notifications with Previous / Play-Pause / Next buttons on Linux.
//
// Electron's Notification has no `actions` on Linux, and `notify-send` 0.8.8 drops them on Plasma
// ("Actions are not supported by this notifications server"), so this talks to
// org.freedesktop.Notifications directly through a D-Bus command-line tool: `busctl` (systemd)
// when present, otherwise `gdbus` (GLib, shipped wherever GTK is). One `Notify` call per
// notification, and one long-lived monitor process that listens for ActionInvoked. The server's
// capabilities are read once: without `actions` the plain Electron notification is used, and the
// body is only markup-escaped when the server advertises `body-markup`.
// Child processes are started without a shell, and every positional argument is preceded by `--`
// so a track title such as "-Foo" cannot be parsed as an option.
import { ChildProcess, execFile, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export const NOTIFY_ACTIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'previousTrack', label: 'Previous' },
  { id: 'playPause', label: 'Play / Pause' },
  { id: 'nextTrack', label: 'Next' },
];

const ALLOWED_ACTIONS = new Set(NOTIFY_ACTIONS.map((a) => a.id));
const NOTIFICATIONS = 'org.freedesktop.Notifications';
const OBJECT_PATH = '/org/freedesktop/Notifications';
const MAX_TRACKED_IDS = 16;

export type DbusTool = 'busctl' | 'gdbus';

export interface NotifyRequest {
  title: string;
  body: string;
  iconPath?: string;
  sound: boolean;
}

export interface ServerCapabilities {
  actions: boolean;
  bodyMarkup: boolean;
}

/** Assumed when the capabilities query fails; matches the behaviour verified on Plasma. */
export const DEFAULT_CAPABILITIES: ServerCapabilities = { actions: true, bodyMarkup: true };

/** Picks the first available D-Bus tool on PATH: busctl (systemd) first, then gdbus (GLib). */
export function findDbusTool(
  pathEnv: string | undefined = process.env.PATH,
  exists: (file: string) => boolean = fs.existsSync
): DbusTool | null {
  const dirs = (pathEnv ?? '').split(path.delimiter).filter(Boolean);
  for (const tool of ['busctl', 'gdbus'] as const) {
    if (dirs.some((dir) => exists(path.join(dir, tool)))) return tool;
  }
  return null;
}

/** The notification body supports a small markup subset when the server advertises `body-markup`. */
export function escapeMarkup(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** GVariant text-format string literal, as parsed by `gdbus call`. */
export function quoteGVariantString(text: string): string {
  const escaped = text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
  return `'${escaped}'`;
}

// ---- busctl -------------------------------------------------------------------------------------

export function buildNotifyArgs(req: NotifyRequest, replacesId: number, markup = true): string[] {
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
    markup ? escapeMarkup(req.body) : req.body,
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

export const CAPABILITIES_ARGS = ['--user', '--json=short', 'call', '--', NOTIFICATIONS, OBJECT_PATH, NOTIFICATIONS, 'GetCapabilities'];

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

// ---- gdbus --------------------------------------------------------------------------------------

const GDBUS_TARGET = ['--session', '--dest', NOTIFICATIONS, '--object-path', OBJECT_PATH];

export function buildGdbusNotifyArgs(req: NotifyRequest, replacesId: number, markup = true): string[] {
  const hints = [`'desktop-entry': <'ytm'>`];
  if (!req.sound) hints.push(`'suppress-sound': <true>`);
  const actions = NOTIFY_ACTIONS.flatMap((a) => [a.id, a.label]).map(quoteGVariantString);
  return [
    'call',
    ...GDBUS_TARGET,
    '--method',
    `${NOTIFICATIONS}.Notify`,
    '--',
    quoteGVariantString('YTM'),
    String(replacesId),
    quoteGVariantString(req.iconPath ?? ''),
    quoteGVariantString(req.title),
    quoteGVariantString(markup ? escapeMarkup(req.body) : req.body),
    `[${actions.join(', ')}]`,
    `{${hints.join(', ')}}`,
    '-1',
  ];
}

export const GDBUS_MONITOR_ARGS = ['monitor', ...GDBUS_TARGET];

export const GDBUS_CAPABILITIES_ARGS = ['call', ...GDBUS_TARGET, '--method', `${NOTIFICATIONS}.GetCapabilities`];

/** `gdbus call` prints the reply tuple as GVariant text, e.g. `(uint32 86,)`. */
export function parseGdbusNotifyReply(stdout: string): number | null {
  const m = /^\(uint32 (\d+),\)\s*$/.exec(stdout.trim());
  return m ? Number(m[1]) : null;
}

/** `gdbus monitor` prints `<path>: org.freedesktop.Notifications.ActionInvoked (uint32 86, 'playPause')`. */
export function parseGdbusActionLine(line: string, ownedIds: ReadonlySet<number>): string | null {
  const m = /\.ActionInvoked \(uint32 (\d+), '((?:[^'\\]|\\.)*)'\)\s*$/.exec(line);
  if (!m) return null;
  const id = Number(m[1]);
  const action = m[2];
  if (!ownedIds.has(id) || !ALLOWED_ACTIONS.has(action)) return null;
  return action;
}

// ---- tool-neutral helpers ----------------------------------------------------------------------

/** Parses a GetCapabilities reply from either tool; null when the output is not a capability list. */
export function parseCapabilities(tool: DbusTool, stdout: string): ServerCapabilities | null {
  let names: string[] | null = null;
  if (tool === 'busctl') {
    try {
      const data = JSON.parse(stdout).data?.[0];
      if (Array.isArray(data) && data.every((x) => typeof x === 'string')) names = data;
    } catch {
      names = null;
    }
  } else {
    const m = /^\(\[(.*)\],\)\s*$/s.exec(stdout.trim());
    if (m) names = [...m[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((x) => x[1]);
  }
  if (!names) return null;
  return { actions: names.includes('actions'), bodyMarkup: names.includes('body-markup') };
}

export function notifyArgsFor(tool: DbusTool, req: NotifyRequest, replacesId: number, markup: boolean): string[] {
  return tool === 'busctl' ? buildNotifyArgs(req, replacesId, markup) : buildGdbusNotifyArgs(req, replacesId, markup);
}

export function monitorArgsFor(tool: DbusTool): string[] {
  return tool === 'busctl' ? MONITOR_ARGS : GDBUS_MONITOR_ARGS;
}

export function capabilitiesArgsFor(tool: DbusTool): string[] {
  return tool === 'busctl' ? CAPABILITIES_ARGS : GDBUS_CAPABILITIES_ARGS;
}

export function parseNotifyReplyFor(tool: DbusTool, stdout: string): number | null {
  return tool === 'busctl' ? parseNotifyReply(stdout) : parseGdbusNotifyReply(stdout);
}

export function parseActionLineFor(tool: DbusTool, line: string, ownedIds: ReadonlySet<number>): string | null {
  return tool === 'busctl' ? parseActionLine(line, ownedIds) : parseGdbusActionLine(line, ownedIds);
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
  private capabilities: ServerCapabilities | null = null;
  private capabilityWaiters: Array<(caps: ServerCapabilities) => void> | null = null;

  /**
   * `tool` is detected from PATH when omitted. Pass `null` to force the plain-notification fallback.
   */
  constructor(
    private onAction: (action: string) => void,
    private exec: ExecFileFn = (file, args, cb) => execFile(file, args, { timeout: 5000 }, cb as never),
    private spawnProc: SpawnFn = (file, args) => spawn(file, args, { stdio: ['ignore', 'pipe', 'ignore'] }),
    private tool: DbusTool | null | undefined = undefined
  ) {}

  /** Shows a notification. `onUnavailable` runs if buttons cannot be offered (no tool, no `actions`, call failed). */
  show(req: NotifyRequest, onUnavailable: () => void): void {
    if (this.disposed) return;
    if (this.tool === undefined) this.tool = findDbusTool();
    const tool = this.tool;
    if (!tool) {
      onUnavailable();
      return;
    }
    this.withCapabilities(tool, (caps) => {
      if (this.disposed) return;
      if (!caps.actions) {
        onUnavailable();
        return;
      }
      this.ensureMonitor(tool);
      this.exec(tool, notifyArgsFor(tool, req, this.lastId, caps.bodyMarkup), (err, stdout) => {
        const id = err ? null : parseNotifyReplyFor(tool, stdout);
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
    });
  }

  /** Queries GetCapabilities once per process; concurrent callers wait for the same reply. */
  private withCapabilities(tool: DbusTool, cb: (caps: ServerCapabilities) => void): void {
    if (this.capabilities) {
      cb(this.capabilities);
      return;
    }
    if (this.capabilityWaiters) {
      this.capabilityWaiters.push(cb);
      return;
    }
    this.capabilityWaiters = [cb];
    this.exec(tool, capabilitiesArgsFor(tool), (err, stdout) => {
      this.capabilities = (err ? null : parseCapabilities(tool, stdout)) ?? DEFAULT_CAPABILITIES;
      const waiters = this.capabilityWaiters ?? [];
      this.capabilityWaiters = null;
      for (const waiter of waiters) waiter(this.capabilities);
    });
  }

  private ensureMonitor(tool: DbusTool): void {
    if (this.monitor) return;
    try {
      const child = this.spawnProc(tool, monitorArgsFor(tool));
      this.monitor = child;
      let buffer = '';
      child.stdout?.on('data', (chunk: Buffer | string) => {
        buffer += chunk.toString();
        let newline: number;
        while ((newline = buffer.indexOf('\n')) !== -1) {
          const action = parseActionLineFor(tool, buffer.slice(0, newline), this.ownedIds);
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
