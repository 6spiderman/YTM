# Electron 30 to 44 and electron-builder 24 to 26: review notes

Reviewed 2026-10-05 against https://www.electronjs.org/docs/latest/breaking-changes (entries 31.0 to 44.0) and the code in `src/`.

## Code impact

| Area in YTM | Entry reviewed | Result |
|---|---|---|
| `WebContentsView`, `contentView.addChildView`, `executeJavaScript` | none found for 31 to 44 | No change needed |
| `Tray`, `Notification` with `toastXml`, `setThumbarButtons`, `skipTaskbar`, `setIgnoreMouseEvents`, `app.setLoginItemSettings`, `requestSingleInstanceLock` | none found for Windows in 31 to 44 | No change needed. Behaviour on Windows still has to be confirmed manually (gate W-A) |
| `ytm://` second-instance handling | 33.0 custom protocol URL change affects only `protocol.registerFileProtocol` and `baseURLForDataURL` | Not used by YTM |
| Renderer sandbox | `sandbox: false` is set explicitly on local windows; the YouTube view uses defaults | Unchanged |
| Install | 42.0: the `electron` package no longer downloads its binary in `postinstall` | Binary is fetched on first `npx electron` run; electron-builder downloads its own copy for packaging. CI is unaffected |
| Linux (Phase 3/4) | 38.0 default ozone platform is `auto` (native Wayland under Wayland sessions); 43.0 rounded corners for frameless windows on Linux | Launch with `--ozone-platform=x11`; see spikes |

## Compile and test results after the upgrade

- `npx tsc --noEmit`: exit 0 with no source changes.
- `npx jest`: 37 of 37 pass, including the Windows characterization tests.
- `npx eslint "src/**/*.ts"`: 0 errors, same single warning as baseline.

## Packaging check (Linux host, Windows target)

`npx electron-builder --win --dir` with the **unchanged** `electron-builder.yml` (local-only flags `-c.win.signAndEditExecutable=false` and an output directory outside the repo) packages successfully with Electron 44.4.3. `scripts/check-windows-inputs.js` compares the resulting `app.asar` with `windows-asar-listing.txt` (captured from the baseline installer build): identical non-node_modules paths and identical module versions. Differences ignored on purpose: install layout of `node_modules` (dedup changed where `ajv` and `find-up` sit, same versions) and three stale `dist/renderer/*.js.map` files that were in the baseline installer only because an old `dist/` was not cleaned.

electron-builder 26 prints an `updating asar integrity executable resource` step that did not exist in 24; it needs the real Windows build to confirm.

## Not verifiable on this machine (needs gate W-A)

NSIS installer build and upgrade-in-place from 1.0.0, installed file list, shortcuts, thumbar and taskbar behaviour, toast notifications with action buttons, tray, login item, global shortcuts, `%APPDATA%\ytm` session preservation.
