import { Settings, ShortcutAction, ShortcutMap } from '../../types';

const SHORTCUT_LABELS: Record<ShortcutAction, string> = {
  playPause: 'Play / Pause',
  nextTrack: 'Next Track',
  previousTrack: 'Previous Track',
  volumeUp: 'Volume Up',
  volumeDown: 'Volume Down',
  likeTrack: 'Like Track',
  dislikeTrack: 'Dislike Track',
  showHideWindow: 'Show / Hide Window',
  toggleMiniPlayer: 'Toggle Mini Player',
};

const SHORTCUT_ACTIONS = Object.keys(SHORTCUT_LABELS) as ShortcutAction[];

let currentSettings: Settings;
let capturingAction: ShortcutAction | null = null;
let pendingShortcuts: ShortcutMap;

async function init() {
  currentSettings = await window.settingsApi.getSettings();
  pendingShortcuts = { ...currentSettings.shortcuts };
  populateForm();
  buildShortcutsTable();
}

function populateForm() {
  (document.getElementById('startWithWindows') as HTMLInputElement).checked = currentSettings.startWithWindows;
  (document.getElementById('startMinimised') as HTMLInputElement).checked = currentSettings.startMinimised;
  (document.getElementById('minimiseToTray') as HTMLInputElement).checked = currentSettings.minimiseToTray;
  (document.getElementById('miniPlayerAlwaysOnTop') as HTMLInputElement).checked = currentSettings.miniPlayerAlwaysOnTop;
  (document.getElementById('volumeStep') as HTMLInputElement).value = String(currentSettings.volumeStep);
  (document.getElementById('notificationsEnabled') as HTMLInputElement).checked = currentSettings.notifications.enabled;
  (document.getElementById('notifTitle') as HTMLInputElement).value = currentSettings.notifications.titleTemplate;
  (document.getElementById('notifBody') as HTMLInputElement).value = currentSettings.notifications.bodyTemplate;
  (document.getElementById('showAlbumArt') as HTMLInputElement).checked = currentSettings.notifications.showAlbumArt;
  (document.getElementById('playSound') as HTMLInputElement).checked = currentSettings.notifications.playSound;
}

function buildShortcutsTable() {
  const container = document.getElementById('shortcuts-container')!;
  container.innerHTML = '';

  for (const action of SHORTCUT_ACTIONS) {
    const row = document.createElement('div');
    row.className = 'shortcut-row';
    row.id = `row-${action}`;

    const nameEl = document.createElement('span');
    nameEl.className = 'action-name';
    nameEl.textContent = SHORTCUT_LABELS[action];

    const display = document.createElement('span');
    display.className = 'shortcut-display';
    display.id = `display-${action}`;
    display.textContent = pendingShortcuts[action] || '(not set)';
    if (!pendingShortcuts[action]) display.classList.add('unset');

    const changeBtn = document.createElement('button');
    changeBtn.className = 'change-btn';
    changeBtn.textContent = pendingShortcuts[action] ? 'Change' : 'Set';
    changeBtn.addEventListener('click', () => startCapture(action, display, changeBtn));

    const clearBtn = document.createElement('button');
    clearBtn.className = 'change-btn clear-btn';
    clearBtn.textContent = '✕';
    clearBtn.title = 'Clear shortcut';
    clearBtn.style.display = pendingShortcuts[action] ? 'flex' : 'none';
    clearBtn.addEventListener('click', () => {
      pendingShortcuts[action] = '';
      buildShortcutsTable();
    });

    row.appendChild(nameEl);
    row.appendChild(display);
    row.appendChild(changeBtn);
    row.appendChild(clearBtn);
    container.appendChild(row);
  }
}

function startCapture(action: ShortcutAction, display: HTMLElement, btn: HTMLButtonElement) {
  if (capturingAction) stopCapture();

  capturingAction = action;
  display.textContent = 'Press shortcut...';
  display.classList.add('capturing');
  btn.textContent = 'Cancel';
  btn.onclick = () => stopCapture();

  document.addEventListener('keydown', handleCapture, { once: false });
}

function stopCapture() {
  if (!capturingAction) return;
  const display = document.getElementById(`display-${capturingAction}`)!;
  const btn = document.querySelector(`#row-${capturingAction} .change-btn`) as HTMLButtonElement;
  display.textContent = pendingShortcuts[capturingAction];
  display.classList.remove('capturing');
  btn.textContent = 'Change';
  btn.onclick = () => startCapture(capturingAction!, display, btn);
  document.removeEventListener('keydown', handleCapture);
  capturingAction = null;
}

async function handleCapture(e: KeyboardEvent) {
  e.preventDefault();
  if (!capturingAction) return;

  const parts: string[] = [];
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  if (e.metaKey) parts.push('Meta');

  const key = e.key;
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) return;

  const keyName = key === ' ' ? 'Space' : key.length === 1 ? key.toUpperCase() : key;
  parts.push(keyName);

  if (parts.length < 2) return; // Require at least one modifier

  const shortcut = parts.join('+');
  const action = capturingAction;
  const display = document.getElementById(`display-${action}`)!;

  const conflict = await window.settingsApi.checkConflict(shortcut, action);
  display.classList.remove('capturing', 'conflict');

  if (conflict) {
    display.textContent = `Conflict: ${conflict}`;
    display.classList.add('conflict');
    setTimeout(() => {
      display.textContent = pendingShortcuts[action];
      display.classList.remove('conflict');
      stopCapture();
    }, 2000);
    return;
  }

  pendingShortcuts[action] = shortcut;
  document.removeEventListener('keydown', handleCapture);
  capturingAction = null;
  buildShortcutsTable();
}

async function save() {
  const newSettings: Settings = {
    ...currentSettings,
    startWithWindows: (document.getElementById('startWithWindows') as HTMLInputElement).checked,
    startMinimised: (document.getElementById('startMinimised') as HTMLInputElement).checked,
    minimiseToTray: (document.getElementById('minimiseToTray') as HTMLInputElement).checked,
    miniPlayerAlwaysOnTop: (document.getElementById('miniPlayerAlwaysOnTop') as HTMLInputElement).checked,
    volumeStep: Number((document.getElementById('volumeStep') as HTMLInputElement).value),
    shortcuts: { ...pendingShortcuts },
    notifications: {
      enabled: (document.getElementById('notificationsEnabled') as HTMLInputElement).checked,
      titleTemplate: (document.getElementById('notifTitle') as HTMLInputElement).value,
      bodyTemplate: (document.getElementById('notifBody') as HTMLInputElement).value,
      showAlbumArt: (document.getElementById('showAlbumArt') as HTMLInputElement).checked,
      playSound: (document.getElementById('playSound') as HTMLInputElement).checked,
    },
  };

  await window.settingsApi.saveSettings(newSettings);
  window.settingsApi.closeSettings();
}

async function resetToDefaults() {
  const defaults = await window.settingsApi.getDefaults();
  currentSettings = defaults;
  pendingShortcuts = { ...defaults.shortcuts };
  populateForm();
  buildShortcutsTable();
}

document.getElementById('saveBtn')?.addEventListener('click', save);
document.getElementById('cancelBtn')?.addEventListener('click', () => window.settingsApi.closeSettings());
document.getElementById('resetBtn')?.addEventListener('click', resetToDefaults);
document.getElementById('previewNotif')?.addEventListener('click', () => window.settingsApi.previewNotification());

init();
