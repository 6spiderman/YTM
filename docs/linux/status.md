# Status: Linux support for all mainstream distros, updated 2026-10-06 (1.3.0 published)

## 1.3.0: update notification + auto-update, taskbar progress, arrow-key shortcut fix, opt-in native Wayland

Plan: `~/.claude/plans/can-we-make-the-delegated-wombat.md` (approved 2026-10-06). Branch `feat/1.3.0`.

Owner decisions: the repository becomes public (needed by the unauthenticated GitHub update feed); updates ask before downloading and install on restart; native Wayland is an opt-in setting, XWayland stays the default.

| Phase | State |
|---|---|
| 0 Dependency | Done: `electron-updater` 6.8.9 (pure JS) under the freshness rule; `js-yaml` moved to 4.3.2 to clear a High advisory (`dependency-log.md`) |
| 1 Shortcut fix | Done: `src/shared/accelerator.ts` (shared by main and renderer), capture refuses unsupported keys, stored values are repaired on read, registration never throws and reports failures |
| 2 Settings | Done: `taskbarProgress`, `nativeWayland`, `updates`; Updates section, banner, environment IPC |
| 3 Updates | Done: `src/main/updateManager.ts`, tray entries, one notification per version; feed configured in code (`electron-builder.yml` stays frozen); developer feed `YTM_UPDATE_FEED` |
| 4 Taskbar progress | Done: proxy window on Windows (paused mode), player window on Linux via LauncherEntry |
| 5 Native Wayland | Done: setting + relaunch from the x11 launcher, portal denials recorded, always-on-top disabled there |
| 6 CI / snapshot / docs | CI uploads `latest*.yml` and blockmaps; Windows asar snapshot refreshed (S24: +21 expected lines, nothing removed). Docs updated |
| 7 Release | **Published 2026-10-06** as https://github.com/6spiderman/YTM/releases/tag/v1.3.0 (PR #3 merged as 4348aa8) with `YTM-Setup-1.3.0.exe` + `.blockmap`, `latest.yml`, the four Linux packages, `latest-linux.yml` and `SHA512SUMS` from CI run 37496949709; every size and sha512 in the metadata was verified before upload. **USER:** Windows checks on 1.3.0, GNOME tester, Plasma keypress for native Wayland |

Spikes S20–S24: see `spikes.md`. Unit tests: 203 (`npx jest`).

Known cosmetic issue for 1.3.1: right after a manual check the Settings status line still shows the previous "Last check" time (the page re-reads `updates.lastCheck` only when settings are reloaded); the check itself and its result are correct.

### Release procedure for 1.3.0 and later (updater-aware)

1. After the merge: tag `v1.3.0`; take `windows-installer` and `linux-packages` from the green CI run.
2. Upload with the names the updater expects: `YTM-Setup-1.3.0.exe` (rename from `YTM Setup 1.3.0.exe`; it must equal `url:` in `latest.yml`; the sha512 is unchanged by renaming), `YTM-Setup-1.3.0.exe.blockmap`, `latest.yml`, `ytm_1.3.0_amd64.deb`, `ytm-1.3.0.x86_64.rpm`, `ytm-1.3.0-1-x86_64.pkg.tar.zst`, `YTM-1.3.0-x86_64.AppImage`, `YTM-1.3.0-x86_64.AppImage.blockmap`, `latest-linux.yml`, `SHA512SUMS`.
3. Before publishing: every `url:` in `latest.yml` and `latest-linux.yml` must match an uploaded asset name exactly.
4. Publish (not draft, not prerelease) with an explicit `tag_name`; drafts are invisible to the updater.
5. Afterwards "Check for updates" in the published build must say "up to date".

### Open USER items for 1.3.0

1. Done: the repository is public.
2. Windows gate W-A on a fresh 1.3.0 install: taskbar progress (and paused mode), arrow-key shortcut capture, Settings → Updates. Gate W-B: 1.2.1 → 1.3.0 through the published release (notification, tray entry, download, UAC prompt, relaunch).
3. A GNOME tester for the Wayland shortcut consent dialog; one keypress on Plasma for S23.
4. Done: merged and published. From now on the in-app updater announces each new release; the first real self-update happens with 1.3.1 or later.


## 1.2.1: fixes from the first round of Linux testing

| Report | Cause | Fix | Verified |
|---|---|---|---|
| Maximised window: player controls cut off "under the taskbar" (all desktops and packages) | `BrowserWindow.getContentSize()` on Linux includes the invisible frame insets of a frameless window while it is maximised (32x42 px here), so the YouTube view was laid out larger than the window; after restoring it was too small | The title-bar page reports `innerWidth`/`innerHeight` on resize; the Linux layout uses that (`WindowManager.reportViewport`) | On the panel monitor: window 1920x1026, view 1920x990 (was 1952x1032); restored 1200x764 (was 1168x722) |
| Settings button "does nothing" on Kubuntu | The settings window had no position, so KWin centred it on the primary monitor while YTM was on the other screen | Linux: centre the settings window on the main window, clamped to its display's work area; cursor display when the main window is hidden (`centeredOnWindow`) | Settings window opened at the main window's centre on the second monitor |
| Save button always green; no feedback | No change tracking | Save is disabled/grey until the form differs from the loaded or last-saved settings; saving keeps the window open and re-reads stored settings first; Cancel is now Close | Grey → green on change → grey on revert → grey after save, window open, value stored |

PR #2 merged (93bf3d8), tagged `v1.2.1` and **published 2026-10-06** at https://github.com/6spiderman/YTM/releases/tag/v1.2.1 with the five CI-built packages (run 37476951862) and `SHA512SUMS`. 152 unit tests, typecheck, lint and the Windows-input guard pass.


Plan: `~/.claude/plans/can-we-make-the-delegated-wombat.md` (approved 2026-10-06). Branch `feat/linux-distros` in `~/src/YTM`. The 1.1.0 Kubuntu work and its open items are in `docs/kubuntu/status.md`.

Legend: **Done** = implemented and verified by a command on the Kubuntu machine. **CI** = verified by the first CI run of the branch. **USER** = needs a person (sudo, Windows, GitHub, keyboard). **TESTERS** = other people on other distros, reporting through the Linux test report issue form.

## Decisions

- Formats: deb, rpm, pacman, AppImage; x64 only; no Flatpak/snap (possible follow-up).
- Release 1.2.0 replaces the unpublished v1.1.0 draft.
- **Sandbox:** electron-builder's AppImage launcher appends `--no-sandbox` when unprivileged user namespaces are unavailable (Ubuntu 24.04+ with `kernel.apparmor_restrict_unprivileged_userns=1`), and electron-builder 26.16.1 has no hook to replace that launcher. Because the project never runs unsandboxed, the app refuses such a start with an explanatory window and exit code 1 (`refuseUnsandboxedStart` in `lifecycle.ts`); `YTM_ALLOW_NO_SANDBOX=1` overrides it. **Owner decision 2026-10-06:** keep the refusal. The `.deb` is the documented route on Ubuntu.
- Display mode: `.desktop` and autostart entries keep `--ozone-platform=x11`; a start without the flag inside a Wayland session that has XWayland relaunches itself in X11 mode (spike S14), so AppImage-from-terminal behaves the same.

## Phases

| Phase | State |
|---|---|
| 0 Spikes | All done (`spikes.md`); S16, S17 and S19 answered by CI run 37448787332 |
| 1 Code | Done: gdbus fallback with capability gate, X11 relaunch, AppImage-aware autostart, no-sandbox refusal. 144 unit tests pass locally (`npx jest`), typecheck and lint clean, `check-windows-inputs.js` green |
| 2 Packaging | Done: `electron-builder.linux.yml` builds deb/rpm/pacman/AppImage. deb and AppImage built and checked here; all four built and checked in CI |
| 3 Checks | Done: `check-deb.sh`, `check-rpm.sh`, `check-pacman.sh`, `check-appimage.sh`, `smoke-linux.sh` (AppImage-capable), `scripts/ci/container-test.sh` |
| 4 CI | Green on 453842c: windows, ubuntu (4 packages, static checks, deb smoke with userns restricted and unrestricted, AppImage smoke), audit, and the five container rows |
| 5 Docs | README, tester checklist, issue form, this file |
| 6 Version | 1.2.0; Electron 44.4.4 selected 2026-10-06 under the freshness rule (`dependency-log.md`) |
| 7 Release | PR #1 merged to master (a6f8ace) and tagged `v1.2.0` on 2026-10-06. **Published 2026-10-06** as https://github.com/6spiderman/YTM/releases/tag/v1.2.0 after external testers passed, with the four Linux packages and `YTM Setup 1.2.0.exe` from CI run 37448787332 plus `SHA512SUMS` |

## Per-distro matrix

| Distro / format | Install | Smoke (headless) | Desktop checks (tray, notifications, media keys, autostart) |
|---|---|---|---|
| Kubuntu 26.04 deb | **USER** (sudo) | Done on `linux-unpacked`; CI on the runner | **USER** |
| Kubuntu 26.04 AppImage | Done (runs, static runtime) | Done | Done by script: flag-less start relaunches in X11 mode, `--no-sandbox` start shows the refusal window and waits. **USER**: autostart entry points at the AppImage (needs a login), visual check of the window |
| Ubuntu 24.04 (CI runner) deb | Done (CI) | Done (CI), userns restricted and unrestricted | n/a |
| Debian 12 / 13 deb | Done (CI container) | Done (CI container, sandboxed renderer as an unprivileged user) | TESTERS |
| Fedora rpm | Done (CI container) | Done (CI container) | TESTERS |
| openSUSE Tumbleweed rpm | Done (CI container) | Done (CI container) | TESTERS |
| Arch pacman | Done (CI container) | Done (CI container) | TESTERS |
| Other distros, AppImage | TESTERS | | TESTERS |

## Open USER items

1. Optional: `sudo apt install rpm libarchive-tools` to build and check the rpm and pacman packages locally (CI already does).
2. Install the 1.2.0 deb over 1.1.0 and run `docs/linux/tester-checklist.md` yourself; also start the AppImage from a terminal without flags.
3. Grant repository access to testers (or make the repo public) and send them the checklist link.
4. Done: Windows and Linux testing by other developers passed; 1.2.0 published.
