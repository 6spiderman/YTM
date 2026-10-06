# Status: Linux support for all mainstream distros (1.2.0), updated 2026-10-06 (CI green)

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
| 7 Release | **USER** |

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
4. Windows gates W-A/W-B with the CI-built `YTM Setup 1.2.0.exe` (artifact `windows-installer` of the green run), attach it to the draft release, publish.
