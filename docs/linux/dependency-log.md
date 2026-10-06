# Dependency log (1.2.x – 1.3.0)

Rule: stable versions published at least 14 days before the selection date (see the Kubuntu plan, section 4.5).

| Date | Item | Version / ref | Published | Source | Note |
|---|---|---|---|---|---|
| 2026-10-06 | GitHub Action `actions/download-artifact` | v8.0.1 = `3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c` | 2026-03-11 | api.github.com releases + git/ref/tags | New pin for the container job. Cutoff 2026-09-22 |
| 2026-10-06 | electron-builder AppImage toolset | `1.0.3` (runtime 20251108) | 2025-11 | app-builder-lib configuration.d.ts; downloaded from electron-userland/electron-builder-binaries | Documented as Beta by electron-builder; verified in spike S15 |
| 2026-10-06 | Electron | 44.4.3 → **44.4.4** (exact pin) | 2026-09-22 | registry.npmjs.org (`npm view electron time`); installed with `--before=2026-09-22T23:59:59Z`; `scripts/verify-dep-freshness.js --baseline master --cutoff 2026-09-22`: 1 changed package, 0 failing | Highest 44.x on or before the cutoff. 44.4.5 (09-23), 44.5.0 (09-29) and 44.5.1 (09-30) were too new on this date |

Only `electron` changed for 1.2.0.

## 1.3.0

| Date | Item | Version | Published | Source | Note |
|---|---|---|---|---|---|
| 2026-10-06 | `electron-updater` (new runtime dependency) | 6.8.9 (exact pin) | 2026-06-05 | registry.npmjs.org; installed with `--before=2026-09-22T23:59:59Z` | Newest 6.x on or before the cutoff (6.8.10 is 2026-09-26). Pure JS. Brings fs-extra 10.1.0, js-yaml, lazy-val, lodash.escaperegexp 4.1.2, lodash.isequal 4.5.0, semver 7.7.4, tiny-typed-emitter 2.1.0, builder-util-runtime 9.7.0 (already present) |
| 2026-10-06 | `js-yaml` (transitive, shipped) | 4.1.1 → 4.3.2; dev copy 3.14.2 → 3.15.2 | 2026-08-26 | `npm update js-yaml --before=…`; `npm audit --omit=dev` | npm first resolved 4.1.1, which carries GHSA-h67p-54hq-rp68, GHSA-52cp-r559-cp3m, GHSA-5p4m-2wfm-xmqj and GHSA-2883-xcg3-v3hh (CPU-exhaustion on crafted YAML; one High). 4.3.2 fixes all four and is inside the cutoff. electron-updater parses only our own `latest*.yml` over HTTPS, but shipped code must have no High advisory, so the fix is applied rather than accepted |

`scripts/verify-dep-freshness.js --baseline master --cutoff 2026-09-22`: 8 added or changed versions, 0 failing (2026-10-06). `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities.
