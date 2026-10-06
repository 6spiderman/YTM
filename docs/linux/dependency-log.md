# Dependency log (1.2.0)

Rule: stable versions published at least 14 days before the selection date (see the Kubuntu plan, section 4.5).

| Date | Item | Version / ref | Published | Source | Note |
|---|---|---|---|---|---|
| 2026-10-06 | GitHub Action `actions/download-artifact` | v8.0.1 = `3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c` | 2026-03-11 | api.github.com releases + git/ref/tags | New pin for the container job. Cutoff 2026-09-22 |
| 2026-10-06 | electron-builder AppImage toolset | `1.0.3` (runtime 20251108) | 2025-11 | app-builder-lib configuration.d.ts; downloaded from electron-userland/electron-builder-binaries | Documented as Beta by electron-builder; verified in spike S15 |
| 2026-10-06 | Electron | 44.4.3 → **44.4.4** (exact pin) | 2026-09-22 | registry.npmjs.org (`npm view electron time`); installed with `--before=2026-09-22T23:59:59Z`; `scripts/verify-dep-freshness.js --baseline master --cutoff 2026-09-22`: 1 changed package, 0 failing | Highest 44.x on or before the cutoff. 44.4.5 (09-23), 44.5.0 (09-29) and 44.5.1 (09-30) were too new on this date |

Only `electron` changed for 1.2.0; every other lockfile entry is identical to master.
