import { globalShortcut } from 'electron';
import { SettingsManager } from './settingsManager';
import { WindowManager } from './windowManager';
import { PlayerBridge } from './playerBridge';
import { ShortcutAction, ShortcutMap } from '../types';

const MODIFIERS = ['Ctrl', 'Alt', 'Shift', 'Meta', 'CmdOrCtrl', 'Command', 'Control'];

export function validateShortcut(shortcut: string): boolean {
  if (!shortcut) return false;
  const parts = shortcut.split('+');
  if (parts.length < 2) return false;
  return parts.some(p => MODIFIERS.includes(p));
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
  constructor(
    private settings: SettingsManager,
    private windowManager: WindowManager,
    private playerBridge: PlayerBridge
  ) {}

  registerAll(): void {
    const { shortcuts, volumeStep } = this.settings.get();
    this.playerBridge.setVolumeStep(volumeStep);

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
      if (!validateShortcut(accelerator)) continue;
      if (globalShortcut.isRegistered(accelerator)) {
        console.warn(`[ShortcutManager] Conflict: ${accelerator} already registered by another app`);
        continue;
      }
      const registered = globalShortcut.register(accelerator, handlers[action]);
      if (!registered) {
        console.warn(`[ShortcutManager] Failed to register: ${accelerator}`);
      }
    }
  }

  reloadAll(): void {
    this.unregisterAll();
    this.registerAll();
  }

  unregisterAll(): void {
    globalShortcut.unregisterAll();
  }

  findConflict(shortcut: string, excludeAction: string): string | null {
    const { shortcuts } = this.settings.get();
    return detectConflict(shortcut, excludeAction, shortcuts);
  }
}
