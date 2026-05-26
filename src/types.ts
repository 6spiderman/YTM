export interface PlayerState {
  currentTrack: string;
  currentArtist: string;
  albumArtUrl: string;
  isPlaying: boolean;
  likeStatus: 'like' | 'dislike' | 'none';
  volume: number;
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
}
