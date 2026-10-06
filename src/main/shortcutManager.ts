import { globalShortcut } from 'electron';
import { SettingsManager } from './settingsManager';
import { WindowManager } from './windowManager';
import { PlayerBridge } from './playerBridge';
import { ShortcutAction, ShortcutMap, ShortcutFailure } from '../types';
import { isValidAccelerator } from '../shared/accelerator';

/** A modifier plus exactly one key token Electron understands (see src/shared/accelerator.ts). */
export function validateShortcut(shortcut: string): boolean {
  return isValidAccelerator(shortcut);
}

export function detectConflict(
  shortcut: string,
  excludeAction: string,
  shortcuts: ShortcutMap
): string | null {
  for (const [action, registered] of Object.entries(shortcuts)) {
    if (action === excludeAction) continue;
    if (registered === shortcut) return action;
  }
  return null;
}

export class ShortcutManager {
  private failures: ShortcutFailure[] = [];

  constructor(
    private settings: SettingsManager,
    private windowManager: WindowManager,
    private playerBridge: PlayerBridge
  ) {}

  /** Shortcuts that could not be registered in the last registerAll()/reloadAll(). */
  get lastFailures(): ShortcutFailure[] {
    return [...this.failures];
  }

  /**
   * Registers every configured shortcut. Never throws: an invalid, taken or rejected accelerator is
   * reported in the returned list (and in lastFailures) and the remaining shortcuts still register.
   */
  registerAll(): ShortcutFailure[] {
    const { shortcuts, volumeStep } = this.settings.get();
    this.playerBridge.setVolumeStep(volumeStep);
    this.failures = [];

    const handlers: Record<ShortcutAction, () => void> = {
      playPause: () => this.playerBridge.execute('playPause'),
      nextTrack: () => this.playerBridge.execute('nextTrack'),
      previousTrack: () => this.playerBridge.execute('previousTrack'),
      volumeUp: () => this.playerBridge.execute('volumeUp'),
      volumeDown: () => this.playerBridge.execute('volumeDown'),
      likeTrack: () => this.playerBridge.execute('likeTrack'),
      dislikeTrack: () => this.playerBridge.execute('dislikeTrack'),
      showHideWindow: () => this.windowManager.focusActiveWindow(),
      toggleMiniPlayer: () => this.windowManager.toggleMiniPlayer(),
    };

    for (const [action, accelerator] of Object.entries(shortcuts) as [ShortcutAction, string][]) {
      if (!accelerator) continue;
      if (!validateShortcut(accelerator)) {
        this.fail(action, accelerator, 'invalid');
        continue;
      }
      try {
        if (globalShortcut.isRegistered(accelerator)) {
          this.fail(action, accelerator, 'taken');
          continue;
        }
        if (!globalShortcut.register(accelerator, handlers[action])) {
          this.fail(action, accelerator, 'failed');
        }
      } catch (err) {
        // Electron throws on accelerators it cannot parse; keep going with the other shortcuts.
        this.fail(action, accelerator, 'invalid', err);
      }
    }
    return this.lastFailures;
  }

  private fail(action: ShortcutAction, accelerator: string, reason: ShortcutFailure['reason'], err?: unknown): void {
    this.failures.push({ action, accelerator, reason });
    console.warn(`[ShortcutManager] ${reason}: ${accelerator} (${action})`, err instanceof Error ? err.message : '');
  }

  reloadAll(): ShortcutFailure[] {
    this.unregisterAll();
    return this.registerAll();
  }

  unregisterAll(): void {
    globalShortcut.unregisterAll();
  }

  findConflict(shortcut: string, excludeAction: string): string | null {
    const { shortcuts } = this.settings.get();
    return detectConflict(shortcut, excludeAction, shortcuts);
  }
}
