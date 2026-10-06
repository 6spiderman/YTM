# Status against the migration plan (updated 2026-10-05)

> Superseded for 1.2.0 by `docs/linux/status.md` (multi-distro support). Kept as the record of the Kubuntu port.

**Tests are not tracked in git** (owner's decision; the original `.gitignore` excluded `tests/`). The 103 tests live only in the local `tests/` folder of the working copies, so the GitHub CI skips the `jest` step (typecheck, lint, packaging, deb checks, smoke test and audit still run). The earlier commits that did contain `tests/` remain in git history.

**Merged to `master` on 2026-10-05 (e83f1e6) at the owner's explicit request, before the Windows gates W-A and W-B were run.** CI on `feat/kubuntu` (commit 4a2251f, identical tree) is green: Windows job (typecheck, lint, 103 tests, real NSIS installer build with Electron 44.4.3, build-input guard), Ubuntu job (`.deb` build, static checks, install, smoke test with `apparmor_restrict_unprivileged_userns` at 1 and at 0) and the audit job. No release or `v1.1.0` tag exists; the Windows download remains 1.0.0 until W-A/W-B pass. To undo: revert the two merge commits or reset to tag `win-baseline-1.0.0`.

Legend: **Done** = implemented and verified by an automated check or command on the Kubuntu machine. **USER** = needs a person (Windows machine, sign-in, hearing/seeing, sudo, GitHub).

## Phases

| Phase | State |
|---|---|
| 0 Baseline | Done. `win-baseline-1.0.0` = `94fb935`; ext4 clone; baseline recorded. **USER, still open:** copy of `YTM Setup 1.0.0.exe` + sha512, backup of `%APPDATA%\ytm`, `node -v`/`npm -v` on Windows, W1-W16 run against 1.0.0 |
| 1 Safety net | Done locally: CI workflow, Windows-inputs guard (script + asar snapshot), 21 Windows characterization tests. CI has run and is green (it needed five small fixes for the Windows runner and Electron 26 builder, all committed) |
| 2 Toolchain upgrade | Done on the branch: electron 44.4.3, electron-builder 26.16.1, @types/node 24.13.6; typecheck/tests/lint green; Windows target packages with the unchanged `electron-builder.yml` and a matching asar. `fast-uri` 3.1.8 applied and `postject` removed through an override, both approved 2026-10-05. **USER:** gate W-A on Windows |
| 3 Spikes | Done where automatable (S1, S4, S5 partial, S6 partial, S7 transport, S10, S11, S12). **USER:** S3 sign-in, S5 key press, S6/S7/S8/S9/S13 visual checks |
| 4 Implementation | Done: Linux modules, guarded wiring, 103 tests (18 suites) |
| 5 Packaging | Done: `.deb` builds, static checks pass, apt resolves dependencies, smoke test passes on `linux-unpacked`. **USER:** `sudo apt install` of the deb on this machine and on a clean VM |
| 6 Full test pass | Partly: automated tests and audit run 2 done. Matrix rows below need you. W-B pending |
| 7 Documentation | README and docs/kubuntu updated |
| 8 Release | Draft release `v1.1.0` created 2026-10-05 with both installers (private until you press Publish). Still needed before publishing: W-A/W-B on Windows, Electron reselection on or after 2026-10-14 (then rebuild both installers and re-upload), and repo access for whoever you share with (the repo is private) |

## Kubuntu matrix (plan 4.3)

| Area | Status |
|---|---|
| Install via apt, menu entry, icon, `/usr/bin/ytm` | apt dry run resolves. **USER:** real install (sudo) |
| Sandbox | Browser process no `--no-sandbox`; YouTube renderer seccomp 2 (smoke test). AppArmor profile parses. Restriction=1 case: CI after install; **USER** on a clean VM |
| Upgrade / removal | **USER** (needs install) |
| First run, KWallet, sign-in | `safeStorage` backend = `kwallet6` verified. **USER:** sign-in |
| Core playback and session persistence | **USER** |
| Windowing, taskbar entry, icon | One window, no proxy (verified). Visual and click-toggle: **USER** |
| Mini player always-on-top, positions, two monitors | **USER** |
| Tray | Registered with icon (verified). Visual, left-click, menu: **USER** |
| Notifications and buttons | D-Bus path implemented and unit-tested. **USER:** see them, click the buttons |
| Media keys and media widget | MPRIS service verified. **USER:** keys and widget |
| Global shortcuts | Register OK in x11 and wayland mode. **USER:** press them while another app has focus |
| `ytm ytm://action/playPause` fallback | Code path unit-tested for Windows argv; **USER** on Linux |
| Autostart | Unit-tested file writing/removal. **USER:** log out and in |
| Quit paths | SIGTERM verified. **USER:** logout/shutdown |
| Locale, scaling, display variants | **USER** |
| Native Wayland (experimental) | **USER** |
| Fresh-clone build | Passed from a clone with no git remote and no stale dist: `npm ci`, `npm run build:linux`, `check-deb.sh`. The first attempt failed on a missing homepage and was fixed |
