# Status: Linux support for all mainstream distros, updated 2026-10-06 (1.2.1 published)

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
