# Linux spikes (Phase 3)

Host: Kubuntu 26.04.1, Plasma 6.6.6, Wayland session with XWayland, Electron 44.4.3, `kernel.apparmor_restrict_unprivileged_userns=0`. Run 2026-10-05 from the ext4 clone, dev mode (`electron .`), with a throwaway `--user-data-dir`. "USER" means it needs a person at the keyboard.

| ID | Result | Evidence / note |
|---|---|---|
| S1 launch with `--ozone-platform=x11`, sandbox on | **Pass** | Window `YTM` 1232x842 appears as an X11 client (xwininfo). Browser process has no `--no-sandbox`. Two YouTube Music renderers show `Seccomp: 2`, `NoNewPrivs: 1`. The main window renderer runs with `--no-sandbox` because `sandbox: false` is set on the local windows in the existing code (windowManager.ts:42); this is existing design, so the smoke test must check the browser process and the YouTube renderer, not "no process anywhere" |
| S2 `appendSwitch('ozone-platform','x11')` in main script | Not tested | Plan keeps passing the flag via `.desktop` Exec and autostart instead (an in-script switch is too late for Electron 38+ platform selection) |
| S3 Google sign-in and persistence | **USER** | Page loads (music.youtube.com console output seen). Sign-in not attempted |
| S4 MPRIS | **Pass (built-in)** | With an audible `<video>` playing in an Electron window, Chromium registers `org.mpris.MediaPlayer2.chromium.instance<pid>`: `Identity` = app name, `PlaybackStatus` "Playing", `CanGoNext`/`CanGoPrevious`/`CanPause` true, Metadata with artist, title and art URL. A **muted** element does not register (test artefact only). `DesktopEntry` is unset in dev; recheck in the installed package. Whether the Plasma media widget and media keys act on it: **USER** |
| S5 global shortcuts | Partial | `register()` returned true under both `x11` and `wayland` for `Ctrl+Alt+Right`, `Ctrl+Alt+Space`, `Ctrl+Alt+Up`, `Shift+F`, `Ctrl+Alt+M`. On native Wayland `true` only means the portal request was submitted. Whether the key press actually fires: **USER** |
| S6 tray | Partial | `org.freedesktop.StatusNotifierItem-<pid>-1` registered. Before the fix the icon was blank (`.ico` on Linux). After: the item exposes a 64x64 `IconPixmap`. Appearance, left-click and menu: **USER** (visual) |
| S7 notification buttons | **Pass for transport, USER for visuals** | `notify-send` 0.8.8 **cannot** be used: it prints "Actions are not supported by this notifications server" on Plasma 6.6 even though `GetCapabilities` lists `actions`. A raw `org.freedesktop.Notifications.Notify` call through `busctl` with three actions succeeded (ids returned, replace id reused). `busctl monitor --json=short` delivers `ActionInvoked` as one JSON line with payload `[id, "actionKey"]`. A leading `-` in the title is parsed as an option unless `--` precedes the positional arguments. Implemented in `src/main/platform/linux/notifications.ts`. Whether the three buttons are drawn and clickable: **USER** |
| S8 frameless window behaviour | **USER** | Drag, resize, maximise, corner style |
| S9 mini player always-on-top and position | **USER** | Expected to work under X11 mode |
| S10 `safeStorage` backend | **Pass** | `isEncryptionAvailable: true`, `getSelectedStorageBackend(): "kwallet6"` |
| S11 invalid accelerator | **Confirmed defect** | `globalShortcut.register('Ctrl+Alt+ArrowRight')` **throws** `Error processing argument at index 0, conversion failure from Ctrl+Alt+ArrowRight`. The settings screen captures arrow keys as `ArrowRight` (`src/renderer/settings/settings.ts:127-131`). `registerAll()` has no try/catch and runs before the IPC handlers are registered (`src/main/index.ts:73` then `76+`), so a saved arrow shortcut would break startup. Platform-neutral (also affects Windows); not changed here (open item O4) |
| S12 clean exit on SIGTERM | **Defect confirmed, then fixed** | Before: the app was still running 6 s after SIGTERM. After the lifecycle fix: `scripts/smoke-linux.sh` reports the whole process tree gone after SIGTERM |
| S13 glyph rendering | **USER** | Title-bar and mini-player symbols |

## Observed in the first launch (before any Linux code)

- The Windows taskbar proxy window is created on Linux (`windowManager.ts:120`): an extra X11 window `ytm` 320x68 at -10,-10, as predicted.
- Chromium log: `Failed to register with org.freedesktop.host.portal.Registry` (portal identity), harmless in X11 mode.
- `Electron Security Warning (Insecure Content-Security-Policy)` appears for one renderer in dev mode (existing).

## After Phase 4/5 (packaged build run from `linux-unpacked`, X11 mode)

- Exactly one YTM window (`YTM`, WM_CLASS `ytm`); the extra 10x10 `ytm` window is Electron's hidden helper and exists on every platform. The proxy window is gone.
- Tray item registered with an icon. SIGTERM exits cleanly.
- `scripts/smoke-linux.sh` passes: process alive, window present, browser process without `--no-sandbox`, one sandboxed renderer with seccomp, no sandbox errors, clean SIGTERM exit. Run here with `kernel.apparmor_restrict_unprivileged_userns=0`; the stock value (1) is covered by the CI job after installing the `.deb`, which ships the AppArmor profile.
