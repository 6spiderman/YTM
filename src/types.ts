export interface PlayerState {
  currentTrack: string;
  currentArtist: string;
  albumArtUrl: string;
  isPlaying: boolean;
  likeStatus: 'like' | 'dislike' | 'none';
  volume: number;
  currentTime: number;
  duration: number;
  repeatMode: 'none' | 'all' | 'one';
  isShuffled: boolean;
}

export type ShortcutAction =
  | 'playPause'
  | 'nextTrack'
  | 'previousTrack'
  | 'volumeUp'
  | 'volumeDown'
  | 'likeTrack'
  | 'dislikeTrack'
  | 'showHideWindow'
  | 'toggleMiniPlayer';

export interface ShortcutMap {
  playPause: string;
  nextTrack: string;
  previousTrack: string;
  volumeUp: string;
  volumeDown: string;
  likeTrack: string;
  dislikeTrack: string;
  showHideWindow: string;
  toggleMiniPlayer: string;
}

export interface WindowBounds {
  x: number | undefined;
  y: number | undefined;
  width: number;
  height: number;
}

export interface Settings {
  windowBounds: WindowBounds;
  miniPlayerBounds: { x: number; y: number };
  miniPlayerAlwaysOnTop: boolean;
  startMinimised: boolean;
  startWithWindows: boolean;
  minimiseToTray: boolean;
  shortcuts: ShortcutMap;
  volumeStep: number;
  notifications: {
    enabled: boolean;
    titleTemplate: string;
    bodyTemplate: string;
    showAlbumArt: boolean;
    playSound: boolean;
  };
  /** Show the track position on the taskbar button / dock entry. */
  taskbarProgress: boolean;
  /** Linux only: run as a native Wayland client instead of through XWayland (experimental). */
  nativeWayland: boolean;
  updates: UpdateSettings;
}

export interface UpdateSettings {
  checkAutomatically: boolean;
  /** Version the user chose "Later" for; not announced again until a newer one appears. */
  dismissedVersion: string;
  /** Epoch ms of the last completed check, 0 = never. */
  lastCheck: number;
}

export type UpdateState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'up-to-date' }
  /** Not packaged (development run): checks are skipped. */
  | { kind: 'unsupported' }
  | { kind: 'available'; version: string; notes?: string }
  | { kind: 'downloading'; version: string; percent: number }
  | { kind: 'downloaded'; version: string }
  | { kind: 'error'; message: string };

/** What the settings window needs to know about the process it runs in. */
export interface AppEnvironment {
  platform: NodeJS.Platform;
  nativeWayland: boolean;
  version: string;
  updateState: UpdateState;
  shortcutFailures: ShortcutFailure[];
}


export interface ShortcutFailure {
  action: ShortcutAction;
  accelerator: string;
  /** invalid = not an accelerator Electron accepts; taken = another app owns it; failed = register() returned false; denied = the Wayland portal refused it */
  reason: 'invalid' | 'taken' | 'failed' | 'denied';
}
