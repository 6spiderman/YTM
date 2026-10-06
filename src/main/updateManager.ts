// Update checks and consent-based installs on top of electron-updater.
//
// The feed is configured here rather than in electron-builder.yml (that file is frozen for the
// Windows build): the GitHub provider reads the public releases of 6spiderman/YTM. Nothing is
// downloaded without the user asking for it (autoDownload = false), and nothing is installed on
// quit by itself (autoInstallOnAppQuit = false): the user presses "Install now", then "Restart now".
// electron-updater handles NSIS (Windows), AppImage and the deb/rpm/pacman packages (those run the
// package manager through pkexec/sudo, so a password prompt is expected).
import { EventEmitter } from 'events';
import { app, shell } from 'electron';
import type { AppUpdater, UpdateInfo } from 'electron-updater';
import { SettingsManager } from './settingsManager';
import { UpdateState } from '../types';

export const RELEASES_URL = 'https://github.com/6spiderman/YTM/releases';
export const GITHUB_FEED = { provider: 'github', owner: '6spiderman', repo: 'YTM' } as const;
/** Developer override: a generic feed (directory with latest*.yml) for end-to-end tests. */
export const FEED_ENV = 'YTM_UPDATE_FEED';
export const FIRST_CHECK_DELAY_MS = 30_000;
export const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

type UpdaterLike = Pick<AppUpdater, 'setFeedURL' | 'checkForUpdates' | 'downloadUpdate' | 'quitAndInstall' | 'on'> & {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  allowPrerelease: boolean;
  logger: AppUpdater['logger'];
};

export interface UpdateManagerOptions {
  updater?: UpdaterLike;
  env?: NodeJS.ProcessEnv;
  isPackaged?: boolean;
  /** Called right before quitAndInstall, e.g. to lift the tray close-veto. */
  onBeforeInstall?: () => void;
  openExternal?: (url: string) => Promise<void>;
}

function loadUpdater(): UpdaterLike {
  // Required lazily so unit tests can inject a fake without loading electron-updater.
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  return (require('electron-updater') as typeof import('electron-updater')).autoUpdater;
}

export class UpdateManager extends EventEmitter {
  private state: UpdateState;
  private readonly updater: UpdaterLike | null;
  private readonly onBeforeInstall: () => void;
  private readonly openExternal: (url: string) => Promise<void>;
  private manualCheck = false;
  private checking: Promise<UpdateState> | null = null;
  private notifiedVersion = '';
  private firstTimer: NodeJS.Timeout | null = null;
  private intervalTimer: NodeJS.Timeout | null = null;

  constructor(private settings: SettingsManager, options: UpdateManagerOptions = {}) {
    super();
    const packaged = options.isPackaged ?? app.isPackaged;
    this.onBeforeInstall = options.onBeforeInstall ?? (() => undefined);
    this.openExternal = options.openExternal ?? ((url) => shell.openExternal(url));
    if (!packaged) {
      this.state = { kind: 'unsupported' };
      this.updater = null;
      return;
    }
    this.state = { kind: 'idle' };
    this.updater = options.updater ?? loadUpdater();
    this.configure(options.env ?? process.env);
  }

  private configure(env: NodeJS.ProcessEnv): void {
    const u = this.updater!;
    u.autoDownload = false;
    u.autoInstallOnAppQuit = false;
    u.allowPrerelease = false;
    u.logger = console;
    const feed = env[FEED_ENV];
    u.setFeedURL(feed ? { provider: 'generic', url: feed } : GITHUB_FEED);
    u.on('checking-for-update', () => this.setState({ kind: 'checking' }));
    u.on('update-available', (info: UpdateInfo) => {
      const dismissed = this.settings.get().updates.dismissedVersion;
      if (!this.manualCheck && dismissed && dismissed === info.version) {
        console.log(`[updates] ${info.version} is available but was dismissed`);
        this.setState({ kind: 'idle' });
        return;
      }
      this.setState({ kind: 'available', version: info.version, notes: releaseNotesText(info) });
    });
    u.on('update-not-available', () => this.setState({ kind: 'up-to-date' }));
    u.on('download-progress', (p: { percent: number }) => {
      const version = this.currentVersion();
      this.setState({ kind: 'downloading', version, percent: Math.round(p.percent) });
    });
    u.on('update-downloaded', (info: UpdateInfo) => this.setState({ kind: 'downloaded', version: info.version }));
    u.on('error', (err: Error) => this.setState({ kind: 'error', message: describeError(err) }));
  }

  private currentVersion(): string {
    return 'version' in this.state ? this.state.version : '';
  }

  private setState(state: UpdateState): void {
    this.state = state;
    if (state.kind === 'up-to-date' || state.kind === 'available' || state.kind === 'error') {
      try {
        this.settings.setUpdateState({ lastCheck: Date.now() });
      } catch (err) {
        console.warn('[updates] could not store the check time', err);
      }
    }
    this.emit('state-changed', state);
    if (state.kind === 'available' && state.version !== this.notifiedVersion) {
      this.notifiedVersion = state.version;
      this.emit('update-available', state.version);
    }
  }

  getState(): UpdateState {
    return this.state;
  }

  /** Runs a check; concurrent callers share the same result. `manual` ignores a dismissed version. */
  check(manual = false): Promise<UpdateState> {
    if (!this.updater) return Promise.resolve(this.state);
    if (this.checking) return this.checking;
    this.manualCheck = manual;
    this.checking = this.updater
      .checkForUpdates()
      .then(() => this.state)
      .catch((err: Error) => {
        this.setState({ kind: 'error', message: describeError(err) });
        return this.state;
      })
      .finally(() => {
        this.checking = null;
      });
    return this.checking;
  }

  async download(): Promise<void> {
    if (!this.updater || this.state.kind !== 'available') return;
    const version = this.state.version;
    this.setState({ kind: 'downloading', version, percent: 0 });
    try {
      await this.updater.downloadUpdate();
    } catch (err) {
      this.setState({ kind: 'error', message: describeError(err) });
    }
  }

  installAndRestart(): void {
    if (!this.updater || this.state.kind !== 'downloaded') return;
    this.onBeforeInstall();
    this.updater.quitAndInstall(false, true);
  }

  /** "Later": do not announce this version again automatically. */
  dismiss(version: string): void {
    this.settings.setUpdateState({ dismissedVersion: version });
    if (this.state.kind === 'available' && this.state.version === version) this.setState({ kind: 'idle' });
  }

  openReleasePage(): void {
    this.openExternal(RELEASES_URL).catch((err) => console.warn('[updates] could not open the release page', err));
  }

  /** Schedules the automatic checks when the setting allows it; safe to call again after a settings change. */
  start(): void {
    this.stop();
    if (!this.updater || !this.settings.get().updates.checkAutomatically) return;
    this.firstTimer = setTimeout(() => void this.check(false), FIRST_CHECK_DELAY_MS);
    this.intervalTimer = setInterval(() => void this.check(false), CHECK_INTERVAL_MS);
    this.firstTimer.unref?.();
    this.intervalTimer.unref?.();
  }

  stop(): void {
    if (this.firstTimer) clearTimeout(this.firstTimer);
    if (this.intervalTimer) clearInterval(this.intervalTimer);
    this.firstTimer = null;
    this.intervalTimer = null;
  }

  dispose(): void {
    this.stop();
    this.removeAllListeners();
  }
}

/** One short, user-readable line; electron-updater errors carry headers and stack traces. */
export function describeError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/Cannot find latest.*\.yml/i.test(raw)) return 'The latest release has no update information yet.';
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|net::ERR_/i.test(raw)) return 'Could not reach the update server. Check your connection.';
  const firstLine = raw.split('\n')[0].trim();
  return firstLine.length > 160 ? `${firstLine.slice(0, 157)}…` : firstLine;
}

function releaseNotesText(info: UpdateInfo): string | undefined {
  const notes = info.releaseNotes;
  if (!notes) return undefined;
  if (typeof notes === 'string') return notes;
  return notes.map((n) => (typeof n === 'string' ? n : n.note ?? '')).join('\n');
}
