import { validateShortcut, detectConflict } from '../src/main/shortcutManager';
import { ShortcutMap } from '../src/types';

const BASE_SHORTCUTS: ShortcutMap = {
  playPause: 'Ctrl+Alt+Space',
  nextTrack: 'Ctrl+Alt+Right',
  previousTrack: 'Ctrl+Alt+Left',
  volumeUp: 'Ctrl+Alt+Up',
  volumeDown: 'Ctrl+Alt+Down',
  likeTrack: 'Ctrl+Alt+L',
  dislikeTrack: 'Ctrl+Alt+D',
  showHideWindow: 'Ctrl+Alt+M',
  toggleMiniPlayer: 'Ctrl+Alt+P',
};

describe('validateShortcut', () => {
  it('returns true for valid shortcut with modifier', () => {
    expect(validateShortcut('Ctrl+Alt+Space')).toBe(true);
  });

  it('returns false for single key without modifier', () => {
    expect(validateShortcut('Space')).toBe(false);
    expect(validateShortcut('F5')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(validateShortcut('')).toBe(false);
  });

  it('returns true for Shift+letter combo', () => {
    expect(validateShortcut('Shift+F')).toBe(true);
  });
});

describe('detectConflict', () => {
  it('returns null when no conflict', () => {
    expect(detectConflict('Ctrl+Alt+Z', 'playPause', BASE_SHORTCUTS)).toBeNull();
  });

  it('returns the conflicting action name when shortcut is already used', () => {
    const conflict = detectConflict('Ctrl+Alt+Right', 'playPause', BASE_SHORTCUTS);
    expect(conflict).toBe('nextTrack');
  });

  it('returns null when the shortcut matches its own action (no self-conflict)', () => {
    const conflict = detectConflict('Ctrl+Alt+Space', 'playPause', BASE_SHORTCUTS);
    expect(conflict).toBeNull();
  });
});
