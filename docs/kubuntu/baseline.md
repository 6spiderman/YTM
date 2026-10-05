# Baseline (Phase 0.6)

Recorded 2026-10-05 in a fresh ext4 clone (`~/src/YTM`) of commit `94fb935` (tag `win-baseline-1.0.0`), plus `93d596e` (tracks `tests/`). Toolchain: Node 22.22.1, npm 9.2.0 (Ubuntu archive). Lockfile untouched; installed with `npm ci`.

| Check | Command | Result |
|---|---|---|
| Install | `npm ci` | 646 packages added, no errors |
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Tests | `npx jest` | 3 suites, 16 tests, all pass |
| Lint | `npx eslint "src/**/*.ts"` | 0 errors, 1 warning (`src/renderer/settings/settings.ts:32` `no-explicit-any`) |

Lint note: the unquoted glob in the existing `npm run lint` script is expanded by `sh` on Linux, so it skips `src/types.ts` and `src/renderer/*/*.ts`. The quoted form above lints all files. The existing script string is left unchanged; Linux and CI use the quoted form.

## `npm audit` at baseline (GitHub Advisory Database via npm, 2026-10-05)

57 packages flagged: 1 critical, 54 high, 1 moderate, 1 low. Raw JSON is not committed; rerun `npm audit --json`.

**Shipped (production) tree, `npm audit --omit=dev`:** 1 high, `fast-uri` 3.1.2 (via `electron-store` > `conf` > `ajv@8`; 8 advisories, e.g. GHSA-v2hh-gcrm-f6hx host confusion in URI parsing). `ajv` is used by `conf` for schema validation of local settings only; reachability from attacker-controlled input is not established. `npm audit fix` offers a non-major fix. Decision pending (Phase 2.4).

**Electron runtime (shipped binary):** `electron` 30.5.1 flagged high (GHSA-vmqv-hx8q-j7mg, GHSA-5rqw-r77c-jp79, among others) and is end of life since 2024-10-14. This is the reason for the Electron upgrade.

**Build-time only (not shipped):** `tar` (critical, GHSA-34x7-hfp2-rc4v, GHSA-8qq5-rm4j-mr97) and `app-builder-lib`, `builder-util-runtime`, `@xmldom/xmldom`, `extract-zip`, `http-cache-semantics`, `form-data`, `tmp`, `js-yaml`, `shell-quote` via `electron-builder` 24.13.3; `braces`, `brace-expansion`, `browserslist` via jest and lint tooling. Fix suggestions from npm are major bumps (electron-builder 26.x, jest 30, typescript-eslint 8) and are not adopted automatically.

No package is claimed to be vulnerability-free. The 14-day freshness rule applies to every selected version, including npm's suggested fix versions.
