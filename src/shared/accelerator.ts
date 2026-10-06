// Electron accelerator handling shared by the main process (validation, migration) and the settings
// renderer (key capture). Pure functions, no Electron import.
// Accelerator reference: https://www.electronjs.org/docs/latest/api/accelerator

export const MODIFIERS: ReadonlyArray<string> = ['Ctrl', 'Alt', 'Shift', 'Meta', 'CmdOrCtrl', 'Command', 'Control', 'Super'];

const LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
const DIGITS = Array.from({ length: 10 }, (_, i) => String(i));
const FUNCTION_KEYS = Array.from({ length: 24 }, (_, i) => `F${i + 1}`);
const NAMED_KEYS = [
  'Space', 'Tab', 'Backspace', 'Delete', 'Insert', 'Return', 'Up', 'Down', 'Left', 'Right', 'Home', 'End',
  'PageUp', 'PageDown', 'Esc', 'VolumeUp', 'VolumeDown', 'VolumeMute', 'MediaNextTrack', 'MediaPreviousTrack',
  'MediaStop', 'MediaPlayPause', 'PrintScreen', 'Plus',
  'num0', 'num1', 'num2', 'num3', 'num4', 'num5', 'num6', 'num7', 'num8', 'num9',
  'numdec', 'numadd', 'numsub', 'nummult', 'numdiv',
];
const PUNCTUATION = ['`', '-', '=', '[', ']', '\\', ';', "'", ',', '.', '/'];

/** Every key token Electron accepts after the modifiers. */
export const KEY_TOKENS: ReadonlySet<string> = new Set([...LETTERS, ...DIGITS, ...FUNCTION_KEYS, ...NAMED_KEYS, ...PUNCTUATION]);

/** KeyboardEvent.key names (and a few older spellings) mapped to Electron tokens. */
export const LEGACY_KEY_MAP: Readonly<Record<string, string>> = {
  ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
  Escape: 'Esc', Enter: 'Return', ' ': 'Space', '+': 'Plus',
  AudioVolumeUp: 'VolumeUp', AudioVolumeDown: 'VolumeDown', AudioVolumeMute: 'VolumeMute',
  MediaTrackNext: 'MediaNextTrack', MediaTrackPrevious: 'MediaPreviousTrack',
  // Older Electron spellings that may be stored in config files.
  Escape_: 'Esc', Enter_: 'Return', VolumeMute_: 'VolumeMute',
};

/** KeyboardEvent.code names for the numeric keypad, which `key` does not distinguish. */
const NUMPAD_CODE_MAP: Readonly<Record<string, string>> = {
  Numpad0: 'num0', Numpad1: 'num1', Numpad2: 'num2', Numpad3: 'num3', Numpad4: 'num4',
  Numpad5: 'num5', Numpad6: 'num6', Numpad7: 'num7', Numpad8: 'num8', Numpad9: 'num9',
  NumpadDecimal: 'numdec', NumpadAdd: 'numadd', NumpadSubtract: 'numsub', NumpadMultiply: 'nummult', NumpadDivide: 'numdiv',
};

const MODIFIER_KEY_NAMES = new Set(['Control', 'Alt', 'Shift', 'Meta', 'AltGraph', 'OS', 'Super', 'Hyper']);

export interface KeyEventLike {
  key: string;
  code?: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}

/** Maps a single KeyboardEvent key (plus code) to an Electron key token, or null when unsupported. */
export function keyToToken(key: string, code?: string): string | null {
  if (code && NUMPAD_CODE_MAP[code]) return NUMPAD_CODE_MAP[code];
  if (key in LEGACY_KEY_MAP) return LEGACY_KEY_MAP[key];
  const token = key.length === 1 ? key.toUpperCase() : key;
  return KEY_TOKENS.has(token) ? token : null;
}

/**
 * Builds an accelerator from a key event: modifiers in the order Ctrl, Alt, Shift, Meta, then the key.
 * Returns null for a bare modifier press, a key without modifier, or an unsupported key.
 */
export function keyEventToAccelerator(e: KeyEventLike): string | null {
  if (MODIFIER_KEY_NAMES.has(e.key)) return null;
  const parts: string[] = [];
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  if (e.metaKey) parts.push('Meta');
  if (parts.length === 0) return null;
  const token = keyToToken(e.key, e.code);
  if (!token) return null;
  return [...parts, token].join('+');
}

/** Splits on '+' while keeping a literal '+' key (written as a trailing '++' or 'Plus'). */
function splitAccelerator(accelerator: string): string[] {
  const parts = accelerator.split('+');
  const out: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === '' && i > 0 && i === parts.length - 1) out.push('Plus');
    else if (parts[i] === '' && i < parts.length - 1 && parts[i + 1] === '') { out.push('Plus'); i++; }
    else if (parts[i] !== '') out.push(parts[i]);
  }
  return out;
}

/** True when the accelerator has at least one modifier and exactly one known key token. */
export function isValidAccelerator(accelerator: string): boolean {
  if (!accelerator) return false;
  const parts = splitAccelerator(accelerator);
  const modifiers = parts.filter((p) => MODIFIERS.includes(p));
  const keys = parts.filter((p) => !MODIFIERS.includes(p));
  return modifiers.length >= 1 && keys.length === 1 && KEY_TOKENS.has(keys[0]);
}

/**
 * Normalises a stored accelerator: legacy KeyboardEvent names become Electron tokens
 * (`Ctrl+Alt+ArrowRight` → `Ctrl+Alt+Right`). Returns '' when the result is still invalid, so a
 * broken value is cleared instead of crashing registration.
 */
export function normalizeAccelerator(accelerator: string): string {
  if (!accelerator) return '';
  const parts = splitAccelerator(accelerator).map((p) => (MODIFIERS.includes(p) ? p : keyToToken(p) ?? p));
  const normalized = parts.join('+');
  return isValidAccelerator(normalized) ? normalized : '';
}
