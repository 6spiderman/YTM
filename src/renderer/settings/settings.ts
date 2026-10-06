import { AppEnvironment, Settings, ShortcutAction, ShortcutFailure, ShortcutMap, UpdateState } from '../../types';
import { keyEventToAccelerator } from '../../shared/accelerator';

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
// JSON of the form as last loaded or saved; Save is only enabled while the form differs from it.
let savedSnapshot = '';
let environment: AppEnvironment | null = null;
let shortcutFailures: ShortcutFailure[] = [];

async function init() {
  try {
    currentSettings = await window.settingsApi.getSettings();
    pendingShortcuts = { ...currentSettings.shortcuts };
    environment = await window.settingsApi.getEnvironment();
    shortcutFailures = environment.shortcutFailures;
    populateForm();
    applyEnvironment(environment);
    buildShortcutsTable();
    markSaved();
    renderUpdateState(environment.updateState);
    window.settingsApi.onUpdateState(renderUpdateState);
  } catch (err) {
    const container = document.getElementById('shortcuts-container');
    if (container) {
      container.innerHTML = `<p style="color:#da3633;padding:8px 0;font-size:12px;">
        Settings failed to load: ${err}<br>
        settingsApi available: ${typeof (window as any).settingsApi}
      </p>`;
    }
  }
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
  (document.getElementById('taskbarProgress') as HTMLInputElement).checked = currentSettings.taskbarProgress;
  (document.getElementById('nativeWayland') as HTMLInputElement).checked = currentSettings.nativeWayland;
  (document.getElementById('checkAutomatically') as HTMLInputElement).checked = currentSettings.updates.checkAutomatically;
}

/** Platform-dependent parts of the page: Linux-only rows, Wayland limitations, version label. */
function applyEnvironment(env: AppEnvironment) {
  document.getElementById('updateVersion')!.textContent = env.version;
  if (env.platform === 'linux') {
    document.getElementById('nativeWaylandRow')!.classList.remove('hidden');
    document.getElementById('nativeWaylandHint')!.classList.remove('hidden');
  }
  if (env.nativeWayland) {
    const onTop = document.getElementById('miniPlayerAlwaysOnTop') as HTMLInputElement;
    onTop.disabled = true;
    document.getElementById('alwaysOnTopHint')!.classList.remove('hidden');
  }
}

function formatLastCheck(ts: number): string {
  if (!ts) return 'never';
  const d = new Date(ts);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function renderUpdateState(state: UpdateState) {
  const status = document.getElementById('updateStatus')!;
  const install = document.getElementById('installUpdateBtn') as HTMLButtonElement;
  const check = document.getElementById('checkUpdatesBtn') as HTMLButtonElement;
  const banner = document.getElementById('updateBanner')!;
  const bannerText = document.getElementById('updateBannerText')!;
  const bannerAction = document.getElementById('updateBannerAction') as HTMLButtonElement;
  status.className = 'status-line';
  install.classList.add('hidden');
  banner.classList.remove('visible');
  check.disabled = false;
  const last = `Last check: ${formatLastCheck(currentSettings?.updates.lastCheck ?? 0)}`;
  switch (state.kind) {
    case 'unsupported':
      status.textContent = 'Update checks are only available in the installed app.';
      check.disabled = true;
      break;
    case 'checking':
      status.textContent = 'Checking for updates…';
      check.disabled = true;
      break;
    case 'up-to-date':
      status.textContent = `You are up to date. ${last}`;
      status.classList.add('good');
      break;
    case 'available':
      status.textContent = `Version ${state.version} is available.`;
      status.classList.add('good');
      install.textContent = 'Install now';
      install.classList.remove('hidden');
      bannerText.textContent = `YTM ${state.version} is available.`;
      bannerAction.textContent = 'Install now';
      banner.classList.add('visible');
      break;
    case 'downloading':
      status.textContent = `Downloading ${state.version}… ${state.percent}%`;
      check.disabled = true;
      bannerText.textContent = `Downloading YTM ${state.version}… ${state.percent}%`;
      bannerAction.textContent = 'Install now';
      bannerAction.disabled = true;
      banner.classList.add('visible');
      break;
    case 'downloaded':
      status.textContent = `Version ${state.version} is downloaded. Restart to finish the update.`;
      status.classList.add('good');
      install.textContent = 'Restart now';
      install.classList.remove('hidden');
      bannerText.textContent = `YTM ${state.version} is ready. Restart to update.`;
      bannerAction.textContent = 'Restart now';
      bannerAction.disabled = false;
      banner.classList.add('visible');
      break;
    case 'error':
      status.textContent = `Update check failed: ${state.message}`;
      status.classList.add('error');
      break;
    default:
      status.textContent = `Not checked yet. ${last}`;
  }
  if (state.kind !== 'downloading') bannerAction.disabled = false;
}

async function onUpdateAction() {
  const env = await window.settingsApi.getEnvironment();
  if (env.updateState.kind === 'available') await window.settingsApi.downloadUpdate();
  else if (env.updateState.kind === 'downloaded') await window.settingsApi.installUpdate();
}

async function onUpdateLater() {
  const env = await window.settingsApi.getEnvironment();
  const v = 'version' in env.updateState ? env.updateState.version : '';
  if (v) await window.settingsApi.dismissUpdate(v);
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
    const failure = shortcutFailures.find((f) => f.action === action && f.accelerator === pendingShortcuts[action]);
    if (failure) {
      display.classList.add('conflict');
      display.title = failure.reason === 'taken' ? 'Not registered: another app uses this shortcut'
        : failure.reason === 'denied' ? 'Not granted by the desktop (Wayland shortcuts portal)'
        : 'Not registered: Electron rejected this shortcut';
    }

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
      updateSaveState();
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

  const action = capturingAction;
  const display = document.getElementById(`display-${action}`)!;
  // Bare modifier presses are ignored while the user builds the combination.
  if (['Control', 'Alt', 'Shift', 'Meta', 'AltGraph', 'OS'].includes(e.key)) return;

  // Keys Electron cannot register (dead keys, letters outside A–Z, keys without a modifier) are refused
  // here, so an unusable accelerator never reaches the main process.
  const shortcut = keyEventToAccelerator(e);
  if (!shortcut) {
    const hasModifier = e.ctrlKey || e.altKey || e.shiftKey || e.metaKey;
    display.textContent = hasModifier ? 'Unsupported key' : 'Add a modifier (Ctrl, Alt, Shift)';
    display.classList.add('conflict');
    setTimeout(() => {
      if (capturingAction === action) { display.textContent = 'Press shortcut...'; display.classList.remove('conflict'); }
    }, 1500);
    return;
  }

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
  updateSaveState();
}

/** The user-editable part of the settings, read from the form. */
function collectForm(): Omit<Settings, 'windowBounds' | 'miniPlayerBounds'> {
  // Window positions are owned by the main process; they must not travel with the form.
  const rest: Partial<Settings> = { ...currentSettings };
  delete rest.windowBounds;
  delete rest.miniPlayerBounds;
  return {
    ...(rest as Omit<Settings, 'windowBounds' | 'miniPlayerBounds'>),
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
    taskbarProgress: (document.getElementById('taskbarProgress') as HTMLInputElement).checked,
    nativeWayland: (document.getElementById('nativeWayland') as HTMLInputElement).checked,
    updates: {
      ...currentSettings.updates, // lastCheck / dismissedVersion belong to the main process
      checkAutomatically: (document.getElementById('checkAutomatically') as HTMLInputElement).checked,
    },
  };
}

function isDirty(): boolean {
  return JSON.stringify(collectForm()) !== savedSnapshot;
}

/** Save is grey (disabled) while nothing changed and green once the form differs from what is saved. */
function updateSaveState() {
  const btn = document.getElementById('saveBtn') as HTMLButtonElement | null;
  if (btn) btn.disabled = !isDirty();
}

function markSaved() {
  savedSnapshot = JSON.stringify(collectForm());
  updateSaveState();
}

async function save() {
  if (!isDirty()) return;
  // Re-read the stored settings so window positions saved meanwhile are not overwritten.
  const latest = await window.settingsApi.getSettings();
  const newSettings: Settings = { ...latest, ...collectForm() };
  await window.settingsApi.saveSettings(newSettings);
  currentSettings = newSettings;
  markSaved();
}

async function resetToDefaults() {
  const defaults = await window.settingsApi.getDefaults();
  currentSettings = { ...currentSettings, ...defaults, windowBounds: currentSettings.windowBounds, miniPlayerBounds: currentSettings.miniPlayerBounds };
  pendingShortcuts = { ...defaults.shortcuts };
  populateForm();
  buildShortcutsTable();
  updateSaveState();
}

// "Start with Windows" does not apply on Linux, where the same setting controls XDG autostart.
if (/linux/i.test(navigator.platform)) {
  const startLabel = document.querySelector('label[for="startWithWindows"]');
  if (startLabel) startLabel.textContent = 'Start at login';
}

document.getElementById('saveBtn')?.addEventListener('click', save);
document.getElementById('checkUpdatesBtn')?.addEventListener('click', () => { void window.settingsApi.checkForUpdates(); });
document.getElementById('installUpdateBtn')?.addEventListener('click', () => { void onUpdateAction(); });
document.getElementById('updateBannerAction')?.addEventListener('click', () => { void onUpdateAction(); });
document.getElementById('updateBannerLater')?.addEventListener('click', () => { void onUpdateLater(); });
document.getElementById('releasePageBtn')?.addEventListener('click', () => window.settingsApi.openReleasePage());
document.addEventListener('input', updateSaveState);
document.addEventListener('change', updateSaveState);
document.getElementById('cancelBtn')?.addEventListener('click', () => window.settingsApi.closeSettings());
document.getElementById('resetBtn')?.addEventListener('click', resetToDefaults);
document.getElementById('previewNotif')?.addEventListener('click', () => window.settingsApi.previewNotification());

init();
