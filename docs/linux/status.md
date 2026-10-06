# Status: Linux support for all mainstream distros (1.2.0), updated 2026-10-06

Plan: `~/.claude/plans/can-we-make-the-delegated-wombat.md` (approved 2026-10-06). Branch `feat/linux-distros` in `~/src/YTM`. The 1.1.0 Kubuntu work and its open items are in `docs/kubuntu/status.md`.

Legend: **Done** = implemented and verified by a command on the Kubuntu machine. **CI** = verified by the first CI run of the branch. **USER** = needs a person (sudo, Windows, GitHub, keyboard). **TESTERS** = other people on other distros, reporting through the Linux test report issue form.

## Decisions

- Formats: deb, rpm, pacman, AppImage; x64 only; no Flatpak/snap (possible follow-up).
- Release 1.2.0 replaces the unpublished v1.1.0 draft.
- **Sandbox:** electron-builder's AppImage launcher appends `--no-sandbox` when unprivileged user namespaces are unavailable (Ubuntu 24.04+ with `kernel.apparmor_restrict_unprivileged_userns=1`), and electron-builder 26.16.1 has no hook to replace that launcher. Because the project never runs unsandboxed, the app refuses such a start with an explanatory dialog and exit code 1 (`refuseUnsandboxedStart` in `lifecycle.ts`); `YTM_ALLOW_NO_SANDBOX=1` overrides it. **Owner decision pending:** keep the refusal (default) or let the AppImage run unsandboxed there like most Electron AppImages do. Either way the `.deb` is the documented route on Ubuntu.
- Display mode: `.desktop` and autostart entries keep `--ozone-platform=x11`; a start without the flag inside a Wayland session that has XWayland relaunches itself in X11 mode (spike S14), so AppImage-from-terminal behaves the same.

## Phases

| Phase | State |
|---|---|
| 0 Spikes | S14, S15, S18 done (`spikes.md`). S16 **USER** (`sudo apt install rpm libarchive-tools`). S17, S19 **CI** |
| 1 Code | Done: gdbus fallback with capability gate, X11 relaunch, AppImage-aware autostart, no-sandbox refusal. 144 unit tests pass locally (`npx jest`), typecheck and lint clean, `check-windows-inputs.js` green |
| 2 Packaging | Done: `electron-builder.linux.yml` builds deb/rpm/pacman/AppImage. deb and AppImage built and checked here; rpm and pacman need S16 |
| 3 Checks | Done: `check-deb.sh`, `check-rpm.sh`, `check-pacman.sh`, `check-appimage.sh`, `smoke-linux.sh` (AppImage-capable), `scripts/ci/container-test.sh` |
| 4 CI | Written; **CI** on first push |
| 5 Docs | README, tester checklist, issue form, this file |
| 6 Version | 1.2.0 set. **USER:** Electron reselection on/after 2026-10-14 |
| 7 Release | **USER** |

## Per-distro matrix

| Distro / format | Install | Smoke (headless) | Desktop checks (tray, notifications, media keys, autostart) |
|---|---|---|---|
| Kubuntu 26.04 deb | **USER** (sudo) | Done on `linux-unpacked`; CI on the runner | **USER** |
| Kubuntu 26.04 AppImage | Done (runs, static runtime) | Done | **USER**: flag-less start from a terminal, autostart entry points at the AppImage, `--no-sandbox` refusal dialog |
| Ubuntu 24.04 (CI runner) deb | CI | CI, userns restricted and unrestricted | n/a |
| Debian 12 / 13 deb | CI container | CI container | TESTERS |
| Fedora rpm | CI container | CI container | TESTERS |
| openSUSE Tumbleweed rpm | CI container (non-blocking) | CI container (non-blocking) | TESTERS |
| Arch pacman | CI container | CI container | TESTERS |
| Other distros, AppImage | TESTERS | | TESTERS |

## Open USER items

1. `sudo apt install rpm libarchive-tools`, then `npm run build:linux` and the four check scripts (S16, S19 locally).
2. Install the 1.2.0 deb over 1.1.0 and run `docs/linux/tester-checklist.md` yourself; also start the AppImage from a terminal without flags.
3. Decide on the sandbox refusal (see Decisions).
4. Push `feat/linux-distros`, read the CI matrix (S17 decides the container flags).
5. Grant repository access to testers (or make the repo public) and send them the checklist link.
6. Electron reselection on/after 2026-10-14, rebuild, Windows gates W-A/W-B, publish 1.2.0, delete the v1.1.0 draft.
